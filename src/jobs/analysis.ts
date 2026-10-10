import { runTrialBatch, reportFromSamples } from '../engine/batch.ts';
import { applyPoint, grid, cohortSeed, paretoFrontier, type Cohort, type Experiment, type Measures } from '../engine/analysis.ts';
import { comparisonUncertainty, attainmentDifference } from '../engine/uncertainty.ts';
import type { RunSettings } from '../project/project.ts';
import type { Banner, SimReport, TrialOptions, TrialSample } from '../engine/types.ts';

export function trialOptions(settings: RunSettings): TrialOptions {
  const { goal: _goal, trials: _trials, seed: _seed, sparkPolicy: _policy, analysis: _analysis, ...options } = settings;
  return options;
}
async function sample(model: Banner, settings: RunSettings, count: number, seed: number, progress: (n: number) => void, initialState = settings.initialState): Promise<TrialSample[]> {
  const options = { ...trialOptions(settings), ...(initialState ? { initialState } : {}) };
  const rows: TrialSample[] = [];
  for (let start = 0; start < count; start += 100) {
    const n = Math.min(100, count - start);
    rows.push(...runTrialBatch(model, settings.goal, n, seed, settings.sparkPolicy, options, start));
    progress(n); await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return rows;
}
function measures(rows: readonly TrialSample[]): Measures {
  return { attainment: rows.filter((row) => row.goalAchieved).length / rows.length, cost: rows.reduce((sum, row) => sum + row.cost, 0) / rows.length, pulls: rows.reduce((sum, row) => sum + row.pulls, 0) / rows.length };
}
export interface CohortReport {
  groups: { cohort: Cohort; share: number; seed: number; baseline: SimReport; candidate: SimReport; uncertainty: ReturnType<typeof comparisonUncertainty> }[];
  weighted: { baseline: Measures; candidate: Measures; attainmentDifference: { low: number; high: number }; curves: { pulls: number; baseline: number; candidate: number }[] };
}
export async function compareCohorts(models: Banner[], settings: RunSettings, groups: Cohort[], progress: (n: number) => void): Promise<CohortReport> {
  const sorted = [...groups].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const weight = sorted.reduce((sum, group) => sum + group.weight, 0);
  const reports: CohortReport['groups'] = [];
  const weighted: CohortReport['weighted'] = { baseline: { attainment: 0, cost: 0, pulls: 0 }, candidate: { attainment: 0, cost: 0, pulls: 0 }, attainmentDifference: { low: 0, high: 0 }, curves: [] };
  for (const cohort of sorted) {
    const seed = cohortSeed(settings.seed, cohort.id), share = cohort.weight / weight;
    const first = await sample(models[0]!, settings, settings.trials, seed, progress, cohort.initialState);
    const next = await sample(models[1]!, settings, settings.trials, seed, progress, cohort.initialState);
    const uncertainty = comparisonUncertainty(first, next);
    const z = [2.241402727604947, 2.497705474412374, 2.638257273476752, 2.734368786533176][sorted.length - 1]!;
    const interval = attainmentDifference(first, next, true, z);
    weighted.attainmentDifference.low += share * interval.low;
    weighted.attainmentDifference.high += share * interval.high;
    reports.push({ cohort: structuredClone(cohort), share, seed,
      baseline: reportFromSamples(models[0]!, settings.goal, seed, settings.sparkPolicy, { ...trialOptions(settings), initialState: cohort.initialState }, first),
      candidate: reportFromSamples(models[1]!, settings.goal, seed, settings.sparkPolicy, { ...trialOptions(settings), initialState: cohort.initialState }, next), uncertainty });
    for (const side of ['baseline', 'candidate'] as const) {
      const values = measures(side === 'baseline' ? first : next);
      for (const key of ['attainment', 'cost', 'pulls'] as const) weighted[side][key] += share * values[key];
    }
  }
  const positions = [...new Set(reports.flatMap((group) => [0, settings.maxPulls, ...group.baseline.acquisitionCdf.map((p) => p.pulls), ...group.candidate.acquisitionCdf.map((p) => p.pulls)]))].sort((a, b) => a - b);
  const indices = reports.map(() => ({ baseline: 0, candidate: 0, a: 0, b: 0 }));
  for (const pulls of positions) {
    let baseline = 0, candidate = 0;
    reports.forEach((group, i) => {
      const index = indices[i]!;
      for (const side of ['baseline', 'candidate'] as const) {
        const curve = group[side].acquisitionCdf;
        while (index[side] < curve.length && curve[index[side]]!.pulls <= pulls) { index[side === 'baseline' ? 'a' : 'b'] = curve[index[side]]!.attained / settings.trials; index[side]++; }
      }
      baseline += group.share * index.a; candidate += group.share * index.b;
    });
    weighted.curves.push({ pulls, baseline, candidate });
  }
  return { groups: reports, weighted };
}
export interface ExperimentReport {
  config: Experiment; exploratorySeed: number; cells: { point: Record<string, number>; exploratory: Measures; validation: Measures; uncertainty: ReturnType<typeof comparisonUncertainty>; feasible: boolean; frontier: boolean }[];
  reference: { exploratory: Measures; validation: Measures }; currency: string;
}
export async function runExperiment(models: Banner[], settings: RunSettings, experiment: Experiment, progress: (n: number) => void): Promise<ExperimentReport> {
  const exploration = await sample(models[0]!, settings, experiment.trials, settings.seed, progress);
  const validation = await sample(models[0]!, settings, experiment.trials, experiment.validationSeed, progress);
  const cells: ExperimentReport['cells'] = [];
  for (const point of grid(experiment)) {
    const model = applyPoint(models[1]!, point);
    const first = await sample(model, settings, experiment.trials, settings.seed, progress);
    const next = await sample(model, settings, experiment.trials, experiment.validationSeed, progress);
    const values = measures(next);
    cells.push({ point, exploratory: measures(first), validation: values, uncertainty: comparisonUncertainty(validation, next), feasible: values.attainment >= experiment.minAttainment && values.cost <= experiment.maxCost, frontier: false });
  }
  const frontier = new Set(paretoFrontier(cells.map((cell) => cell.exploratory), experiment.objectives, experiment.minAttainment, experiment.maxCost));
  cells.forEach((cell, index) => { cell.frontier = frontier.has(index); });
  return { config: structuredClone(experiment), exploratorySeed: settings.seed, cells, reference: { exploratory: measures(exploration), validation: measures(validation) }, currency: models[0]!.pullCost.currency };
}
