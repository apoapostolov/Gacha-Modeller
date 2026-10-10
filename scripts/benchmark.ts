import os from 'node:os';
import { writeFile, readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { runTrialBatch } from '../src/engine/batch.ts';
import { solveExact } from '../src/engine/exact.ts';
import { traceTrial } from '../src/engine/journeys.ts';
import type { Banner } from '../src/engine/types.ts';

const model: Banner = JSON.parse(await readFile(new URL('../docs/fixtures/company-banner.json', import.meta.url), 'utf8')).model;
const goal = { type: 'first-featured' } as const, seed = 42, options = { maxPulls: 200, actionMode: 'single' as const };
const capture: Banner = { ...structuredClone(model), id: 'capture-benchmark', featured: { rarity: model.rarities[0]!.id, chance: .5, capturing: true }, items: [...model.items, { id: 'off', name: 'Off target', rarity: model.rarities[0]!.id, weight: 1 }] };
runTrialBatch(model, goal, 100, seed, 'never', options);
const results = [];
for (const [banner, trials] of [[model, 1000], [model, 5000], [capture, 1000]] as const) {
  const repeats = [];
  for (let repeat = 0; repeat < 3; repeat++) {
    const before = process.memoryUsage(); let peakHeap = before.heapUsed, peakRss = before.rss, draws = 0;
    const start = performance.now();
    for (let offset = 0; offset < trials; offset += 100) {
      const rows = runTrialBatch(banner, goal, Math.min(100, trials - offset), seed, 'never', options, offset);
      draws += rows.reduce((sum, row) => sum + row.pulls, 0);
      const memory = process.memoryUsage(); peakHeap = Math.max(peakHeap, memory.heapUsed); peakRss = Math.max(peakRss, memory.rss);
    }
    repeats.push({ milliseconds: performance.now() - start, draws, sampledPeakHeapBytes: peakHeap, sampledPeakRssBytes: peakRss });
  }
  results.push({ name: banner === capture ? 'capped chase with capture' : 'single capped chase', trials, repeats });
}
const startExact = performance.now(), exact = solveExact(model, goal, 'never', options);
const exactMilliseconds = performance.now() - startExact;
const captureStart = performance.now(), captureExact = solveExact(capture, goal, 'never', options), captureMilliseconds = performance.now() - captureStart;
let totalEvents = 0, storedEvents = 0, exportedBytes = 0;
const startTrace = performance.now();
for (let i = 0; i < 100; i++) {
  const trace = traceTrial(model, goal, seed, i, 'never', options, 200);
  totalEvents += trace.totalEvents; storedEvents += trace.events.length; exportedBytes += Buffer.byteLength(JSON.stringify(trace));
}
const report = {
  measuredAt: new Date().toISOString(), reference: { cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, ramBytes: os.totalmem(), platform: os.platform(), release: os.release(), node: process.version },
  engine: 'analysis-4', randomPolicy: 'event-streams-v1', seed, horizon: options.maxPulls,
  measurement: 'Pure Node engine, one process, batches of 100, 100-trial warmup. Three measured repeats. Memory is sampled after batches, not an OS high-water mark; GC is uncontrolled. No UI/worker transfer time included.',
  simulations: results,
  exact: { milliseconds: exactMilliseconds, result: exact.status === 'exact' ? { peakStates: exact.peakStates, transitions: exact.transitions, massError: exact.massError, meanPurchasedPulls: exact.meanPurchasedPulls } : exact },
  captureExact: { milliseconds: captureMilliseconds, result: captureExact.status === 'exact' ? { peakStates: captureExact.peakStates, transitions: captureExact.transitions, massError: captureExact.massError, meanPurchasedPulls: captureExact.meanPurchasedPulls } : captureExact },
  traces: { trials: 100, milliseconds: performance.now() - startTrace, totalEvents, storedEvents, exportedBytes, limitPerTrace: 200 },
};
await writeFile(new URL('../docs/benchmark-reference.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
