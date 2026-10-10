import { describe, expect, it } from 'vitest';
import { runTrialBatch, reportFromSamples, populationCurve } from '../src/engine/batch.ts';
import { createTrialRng, eventRng } from '../src/engine/rng.ts';
import { hardPityBaseline, poolShare, collectionHeat } from '../src/presets/index.ts';
import { ComparisonRunner } from '../src/jobs/runner.ts';
import { createProject, importProject, saveCandidate, withSettings } from '../src/project/project.ts';
import { compareProject } from '../src/jobs/compare.ts';

const goal = { type: 'first-featured' } as const;
const options = { maxPulls: 200, actionMode: 'single' as const };
describe('schedule-independent comparisons', () => {
  it('produces identical trials regardless of batch size or scheduling order', () => {
    const all = runTrialBatch(hardPityBaseline, goal, 100, 42, 'never', options, 0);
    const last = runTrialBatch(hardPityBaseline, goal, 40, 42, 'never', options, 60);
    const first = runTrialBatch(hardPityBaseline, goal, 60, 42, 'never', options, 0);
    expect([...first, ...last]).toEqual(all);
  });
  it('keeps one random event independent of consumption in another stream', () => {
    const a = createTrialRng(7, 0); const b = createTrialRng(7, 0);
    const discarded = eventRng(a, 'pull:0:featured'); discarded(); discarded();
    expect(eventRng(a, 'pull:0:item')()).toBe(eventRng(b, 'pull:0:item')());
    expect(eventRng(a, 'pull:1:item')()).not.toBe(eventRng(a, 'pull:0:item')());
  });
  it('uses common streams for unchanged mechanics even when candidate metadata changes', () => {
    const candidate = { ...hardPityBaseline, id: 'candidate', name: 'Candidate' };
    expect(runTrialBatch(candidate, goal, 50, 1, 'never', options, 0)).toEqual(runTrialBatch(hardPityBaseline, goal, 50, 1, 'never', options, 0));
  });
  it('compares the 100-to-80 cap fixture and exports its acquisition counts', () => {
    const candidate = { ...hardPityBaseline, pity: [{ ...hardPityBaseline.pity[0]!, hardAt: 80 }] };
    const baselineRows = runTrialBatch(hardPityBaseline, goal, 1000, 77, 'never', options, 0);
    const candidateRows = runTrialBatch(candidate, goal, 1000, 77, 'never', options, 0);
    const a = reportFromSamples(hardPityBaseline, goal, 77, 'never', options, baselineRows);
    const b = reportFromSamples(candidate, goal, 77, 'never', options, candidateRows);
    expect(b.pulls.mean).toBeLessThan(a.pulls.mean);
    expect(b.pulls.max).toBeLessThanOrEqual(80);
    expect(a.manifest.rngPolicy).toBe('event-streams-v1');
    expect(a.acquisitionCdf.at(-1)?.attained).toBe(1000);
  });
  it('keeps unfinished trials in CDF and survival denominators', () => {
    const rows = runTrialBatch(hardPityBaseline, goal, 100, 3, 'never', { ...options, maxPulls: 1 }, 0);
    const report = reportFromSamples(hardPityBaseline, goal, 3, 'never', { ...options, maxPulls: 1 }, rows);
    const curve = populationCurve(report, [0, 1, 100]);
    expect(curve.at(-1)!.cdf).toBe(report.attainmentRate);
    expect(curve.at(-1)!.survival).toBe(1 - report.attainmentRate);
  });
  it.each(['single', 'pack'] as const)('replays an exported %s comparison with identical distributions', async (actionMode) => {
    const model = actionMode === 'pack' ? { ...hardPityBaseline, multiPull: { size: 10, guaranteeRarity: 'junk' } } : hardPityBaseline;
    const project = await createProject(model);
    const draft = structuredClone(project.candidate.model); draft.pity[0]!.hardAt = 80;
    const next = withSettings(await saveCandidate(project, draft), { ...project.settings, trials: 50, seed: 42, maxPulls: 200, actionMode });
    const original = await compareProject(next, next.settings);
    const restored = await importProject(JSON.parse(JSON.stringify(original)));
    const replayed = await compareProject(restored, restored.settings);
    expect(replayed.baseline).toEqual(original.baseline);
    expect(replayed.candidate).toEqual(original.candidate);
    expect(restored.baseline.model.pity[0]!.hardAt).toBe(100);
    expect(restored.candidate.model.pity[0]!.hardAt).toBe(80);
  });
  it('retains guild and collection lessons with explicit separate scenarios', async () => {
    const guild = await createProject(poolShare);
    const grouped = await compareProject(guild, { ...guild.settings, trials: 10, seed: 42 });
    expect(grouped.learning?.poolShare).toMatchObject({ players: poolShare.mechanics!.poolSharePlayers, budgetPerPlayer: 90, trials: 10, seed: 42 });
    const album = await createProject(collectionHeat);
    const heated = await compareProject(album, { ...album.settings, goal: { type: 'collection' }, trials: 10, seed: 42 });
    expect(heated.learning?.coldCollection?.manifest.model.mechanics?.collectionHeat).toBe(0);
    expect(heated.learning?.coldCollection?.trials).toBe(10);
    expect(heated.learning?.coldCollection?.manifest.rngPolicy).toBe('event-streams-v1');
  });
});

describe('worker lifecycle', () => {
  it('terminates replaced/cancelled jobs and ignores their late responses', async () => {
    const workers: { onmessage: ((event: { data: unknown }) => void) | null; onerror: unknown; postMessage: (job: { jobId: number }) => void; terminate: () => void; stopped: boolean; jobId: number }[] = [];
    const factory = () => {
      const worker = { onmessage: null, onerror: null, jobId: 0, postMessage(job: { jobId: number }) { this.jobId = job.jobId; }, stopped: false, terminate() { this.stopped = true; } };
      workers.push(worker); return worker as unknown as Worker;
    };
    const runner = new ComparisonRunner(factory);
    const project = await createProject(hardPityBaseline);
    const received: unknown[] = [];
    runner.start(project, project.settings, (event) => received.push(event));
    const oldHandler = workers[0]!.onmessage!;
    runner.start(project, project.settings, (event) => received.push(event));
    const count = received.length;
    oldHandler({ data: { type: 'progress', jobId: workers[0]!.jobId, completed: 99, total: 100 } });
    expect(received).toHaveLength(count);
    expect(workers[0]!.stopped).toBe(true);
    const currentHandler = workers[1]!.onmessage!;
    currentHandler({ data: { type: 'progress', jobId: workers[1]!.jobId, completed: 20, total: 100 } });
    expect(received).toHaveLength(count + 1);
    runner.cancel();
    expect(workers[1]!.stopped).toBe(true);
    currentHandler({ data: { type: 'progress', jobId: workers[1]!.jobId, completed: 90, total: 100 } });
    expect(received).toHaveLength(count + 1);
  });
});
