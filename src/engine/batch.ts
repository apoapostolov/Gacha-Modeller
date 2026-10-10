import { createTrialRng } from './rng.ts';
import { createTrialExecutor, summarizeTrials } from './simulate.ts';
import { validateRun, MAX_TRIALS } from './validation.ts';
import type { Banner, Goal, SparkPolicy, TrialOptions, TrialSample, SimReport } from './types.ts';

export function runTrialBatch(banner: Banner, goal: Goal, trials: number, seed: number, sparkPolicy: SparkPolicy, options: TrialOptions, startIndex = 0): TrialSample[] {
  validateRun(goal, sparkPolicy, options, trials, seed);
  if (!Number.isSafeInteger(startIndex) || startIndex < 0 || startIndex + trials > MAX_TRIALS) throw new Error('startIndex: Batch exceeds the supported trial range.');
  const execute = createTrialExecutor(banner, goal, sparkPolicy, options);
  const samples: TrialSample[] = [];
  for (let i = startIndex; i < startIndex + trials; i++) {
    const { inventory: _inventory, firstPulls: _first, ...sample } = execute(createTrialRng(seed, i));
    samples.push(sample);
  }
  return samples;
}
export function reportFromSamples(banner: Banner, goal: Goal, seed: number, sparkPolicy: SparkPolicy, options: TrialOptions, samples: readonly TrialSample[]): SimReport {
  return summarizeTrials(banner, goal, seed, sparkPolicy, options, samples, 'event-streams-v1');
}
export function populationCurve(report: SimReport, positions: readonly number[]): { pulls: number; cdf: number; survival: number }[] {
  return positions.map((pulls) => {
    let count = 0;
    for (const point of report.acquisitionCdf) { if (point.pulls > pulls) break; count = point.attained; }
    const cdf = count / report.trials;
    return { pulls, cdf, survival: 1 - cdf };
  });
}
