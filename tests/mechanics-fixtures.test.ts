import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { importProject, withSettings } from '../src/project/project.ts';
import { compareProject } from '../src/jobs/compare.ts';
import { traceTrial } from '../src/engine/journeys.ts';

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../docs/fixtures/${name}.json`, import.meta.url), 'utf8'));
describe('mechanics-3 portable fixtures', () => {
  it('reconciles pack quantities, recipe spending and a comparison round-trip', async () => {
    const project = await importProject(fixture('company-slots'));
    const settings = { ...project.settings, trials: 10, goal: { type: 'targets' as const, targets: [{ itemId: 'rare', count: 1 }] }, actionMode: 'pack' as const, craftPolicy: 'missing-targets' as const, maxPulls: 3 };
    const report = await compareProject(withSettings(project, settings), settings);
    expect(report).toMatchObject({ version: 3, engineVersion: 'analysis-4' });
    expect(report.baseline.attainmentRate).toBe(1);
    expect(report.baseline.duplicateSummary).toMatchObject({ salvageEarned: { mean: 6 }, salvageSpent: { mean: 6 }, salvageRemaining: { mean: 0 }, crafted: { mean: 1 } });
    const imported = await importProject(JSON.parse(JSON.stringify(report)));
    const replay = await compareProject(imported, imported.settings);
    expect(replay.baseline).toEqual(report.baseline);
    expect(replay.journeys.baseline).toEqual(report.journeys.baseline);
  });
  it('keeps an incomplete stateful journey and its exact transitions replayable', async () => {
    const project = await importProject(fixture('company-stateful'));
    const goal = { type: 'targets' as const, targets: [{ itemId: 'alpha', count: 2 }, { itemId: 'beta', count: 1 }] };
    const options = { maxPulls: 10, targetId: 'alpha', exchangeItemId: 'beta', transitions: [{ atPull: 4, type: 'season' as const, seasonId: 'season-2' }] };
    const trace = traceTrial(project.baseline.model, goal, 20260823, 0, 'if-needed', options);
    expect(trace.result.termination).toBe('horizon');
    expect(trace.events.find((event) => event.kind === 'transition')).toMatchObject({ before: { targetProgress: 4, sparkProgress: 4 }, after: { targetProgress: 0, sparkProgress: 0, owned: 1 } });
    expect(traceTrial(trace.model, trace.goal, trace.seed, trace.trialIndex, trace.sparkPolicy, trace.options)).toEqual(trace);
  });
  it('distinguishes distinct-ID packs from perfectly shared-item packs', async () => {
    const project = await importProject(fixture('company-distinct-pack'));
    const goal = { type: 'budget' as const, pulls: 4 }; const options = { actionMode: 'pack' as const, maxPulls: 4 };
    const distinct = traceTrial(project.baseline.model, goal, 42, 0, 'never', options);
    const shared = structuredClone(project.baseline.model); shared.multiPull = { size: 4, correlation: 'shared-item' };
    expect(distinct.result.uniqueCount).toBe(4);
    expect(traceTrial(shared, goal, 42, 0, 'never', options).result.uniqueCount).toBe(1);
  });
  it('rejects an undeclared correlated rule instead of dropping it on import', async () => {
    const incoming = fixture('company-distinct-pack'); incoming.model.multiPull.pairCorrelation = .5;
    await expect(importProject(incoming)).rejects.toThrow(/pairCorrelation/);
  });
});
