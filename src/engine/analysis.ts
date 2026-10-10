import { validateInitial } from './initial.ts';
import { assertValidBanner } from './validation.ts';
import type { Banner, InitialState, TrialOptions } from './types.ts';

export interface Cohort { id: string; name: string; weight: number; initialState: InitialState }
export interface Axis { parameter: string; values: number[] }
export type Objective = 'cost' | 'attainment' | 'pulls';
export interface Experiment {
  axes: Axis[]; trials: number; validationSeed: number; objectives: Objective[];
  minAttainment: number; maxCost: number;
}
export interface AnalysisSettings { cohorts?: Cohort[]; experiment?: Experiment }
export interface Parameter { id: string; label: string; current: number; min: number; max: number; integer: boolean }
export function parameters(model: Banner): Parameter[] {
  return [
    { id: 'price', label: 'Currency per pull', current: model.pullCost.amount, min: 0, max: 100000, integer: false },
    ...model.rarities.slice(0, -1).map((r) => ({ id: `rate:${r.id}`, label: `${r.name} base chance (0–1)`, current: r.baseRate, min: 0, max: 1, integer: false })),
    ...model.pity.map((r) => ({ id: `pity:${r.rarity}`, label: `${model.rarities.find((tier) => tier.id === r.rarity)?.name} hard pity`, current: r.hardAt, min: 1, max: 100000, integer: true })),
    ...(model.featured ? [{ id: 'featured', label: 'Featured chance (0–1)', current: model.featured.chance, min: 0, max: 1, integer: false }] : []),
    ...(model.spark ? [{ id: 'exchange', label: 'Exchange points needed', current: model.spark.cost, min: 1, max: 100000, integer: true }] : []),
    ...(model.targetRule ? [{ id: 'target', label: 'Selected target cap', current: model.targetRule.hardAt, min: 1, max: 100000, integer: true }] : []),
  ];
}
function object(value: unknown, fields: string[], path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: Provide an object.`);
  for (const key of Object.keys(value)) if (!fields.includes(key)) throw new Error(`${path}.${key}: Unsupported field.`);
}
export function validateAnalysis(value: unknown, options: TrialOptions & { trials: number; seed: number }, model?: Banner): asserts value is AnalysisSettings {
  object(value, ['cohorts', 'experiment'], 'analysis');
  if (value.cohorts !== undefined) {
    if (!Array.isArray(value.cohorts) || value.cohorts.length < 1 || value.cohorts.length > 4) throw new Error('analysis.cohorts: Add 1 to 4 player groups.');
    const ids = new Set<string>(), seeds = new Set<number>();
    for (const group of value.cohorts) {
      object(group, ['id', 'name', 'weight', 'initialState'], 'analysis.cohort');
      if (typeof group.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(group.id) || ids.has(group.id)) throw new Error('analysis.cohort.id: Use unique short letter/number IDs.');
      if (typeof group.name !== 'string' || !group.name.trim() || group.name.length > 120) throw new Error('analysis.cohort.name: Give each group a name up to 120 characters.');
      if (typeof group.weight !== 'number' || !Number.isFinite(group.weight) || group.weight <= 0 || group.weight > 100000) throw new Error('analysis.cohort.weight: Use a positive population share up to 100,000.');
      validateInitial(group.initialState, model);
      const seed = cohortSeed(options.seed, group.id);
      if (seeds.has(seed)) throw new Error('analysis.cohort.id: These IDs collide in the seed namespace. Rename one group.');
      ids.add(group.id); seeds.add(seed);
    }
  }
  if (value.experiment !== undefined) {
    const experiment = value.experiment;
    object(experiment, ['axes', 'trials', 'validationSeed', 'objectives', 'minAttainment', 'maxCost'], 'analysis.experiment');
    if (!Array.isArray(experiment.axes) || experiment.axes.length < 1 || experiment.axes.length > 2) throw new Error('analysis.experiment.axes: Choose one or two parameters.');
    const ids = new Set<string>();
    for (const axis of experiment.axes) {
      object(axis, ['parameter', 'values'], 'analysis.axis');
      if (typeof axis.parameter !== 'string' || !/^(price|featured|exchange|target|rate:[^:]+|pity:[^:]+)$/.test(axis.parameter) || ids.has(axis.parameter)) throw new Error('analysis.axis.parameter: Choose distinct supported parameters.');
      if (!Array.isArray(axis.values) || axis.values.length < 2 || axis.values.length > 7 || new Set(axis.values).size !== axis.values.length || axis.values.some((x) => typeof x !== 'number' || !Number.isFinite(x))) throw new Error('analysis.axis.values: Enter 2 to 7 distinct finite numbers.');
      const parameter = model ? parameters(model).find((p) => p.id === axis.parameter) : undefined;
      if (model && !parameter) throw new Error(`analysis.axis.parameter: ${axis.parameter} is missing from the candidate.`);
      if (parameter && axis.values.some((x) => x < parameter.min || x > parameter.max || (parameter.integer && !Number.isSafeInteger(x)))) throw new Error(`analysis.axis.values: ${parameter.label} needs ${parameter.integer ? 'whole ' : ''}values from ${parameter.min} to ${parameter.max}.`);
      ids.add(axis.parameter);
    }
    if (!Number.isSafeInteger(experiment.trials) || (experiment.trials as number) < 30 || (experiment.trials as number) > 2000) throw new Error('analysis.experiment.trials: Use 30 to 2,000 players per setting and seed.');
    if (!Number.isSafeInteger(experiment.validationSeed) || (experiment.validationSeed as number) < 0 || (experiment.validationSeed as number) > 0xffffffff || experiment.validationSeed === options.seed) throw new Error('analysis.experiment.validationSeed: Use a different unsigned whole 32-bit seed for validation.');
    if (!Array.isArray(experiment.objectives) || experiment.objectives.length < 2 || experiment.objectives.length > 3 || new Set(experiment.objectives).size !== experiment.objectives.length || experiment.objectives.some((x) => !['cost', 'attainment', 'pulls'].includes(x))) throw new Error('analysis.experiment.objectives: Select two or three distinct objectives.');
    if (typeof experiment.minAttainment !== 'number' || !Number.isFinite(experiment.minAttainment) || experiment.minAttainment < 0 || experiment.minAttainment > 1) throw new Error('analysis.experiment.minAttainment: Use a completion share from 0 to 1.');
    if (typeof experiment.maxCost !== 'number' || !Number.isFinite(experiment.maxCost) || experiment.maxCost < 0 || experiment.maxCost > 1e10) throw new Error('analysis.experiment.maxCost: Use a currency limit from 0 to 10 billion.');
    if (model) for (const point of grid(experiment as unknown as Experiment)) applyPoint(model, point);
  }
  const settings = value as AnalysisSettings;
  if (options.initialState && settings.cohorts?.length) throw new Error('analysis.cohorts: Use either a single starting state or player groups.');
  if (settings.experiment && settings.cohorts?.length) throw new Error('analysis: Run player groups and parameter experiments separately so the population being compared stays clear.');
  const draws = analysisBudget(settings, options);
  if (draws > 10000000) throw new Error(`analysis: Additional analysis would need up to ${draws.toLocaleString()} draws. Reduce trials, horizon or grid size to stay within 10 million.`);
}
export function cohortSeed(seed: number, id: string): number {
  let hash = 2166136261;
  for (const c of `cohort-v1:${seed}:${id}`) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return hash >>> 0;
}
export function grid(experiment: Experiment): Record<string, number>[] {
  let points: Record<string, number>[] = [{}];
  for (const axis of experiment.axes) points = points.flatMap((point) => axis.values.map((value) => ({ ...point, [axis.parameter]: value })));
  return points;
}
export function analysisBudget(analysis: AnalysisSettings, options: TrialOptions & { trials: number }): number {
  return (options.maxPulls ?? 100000) * ((analysis.cohorts?.length ?? 0) * options.trials * 2 + (analysis.experiment ? (grid(analysis.experiment).length + 1) * analysis.experiment.trials * 2 : 0));
}
export function applyPoint(model: Banner, point: Record<string, number>): Banner {
  const result = structuredClone(model);
  for (const [parameter, value] of Object.entries(point)) {
    const spec = parameters(model).find((p) => p.id === parameter);
    if (!spec || !Number.isFinite(value) || value < spec.min || value > spec.max || (spec.integer && !Number.isSafeInteger(value))) throw new Error(`experiment.${parameter}: Value is outside the supported range.`);
    if (parameter === 'price') result.pullCost.amount = value;
    else if (parameter === 'featured') result.featured!.chance = value;
    else if (parameter === 'exchange') result.spark!.cost = value;
    else if (parameter === 'target') result.targetRule!.hardAt = value;
    else if (parameter.startsWith('rate:')) result.rarities.find((r) => r.id === parameter.slice(5))!.baseRate = value;
    else result.pity.find((p) => p.rarity === parameter.slice(5))!.hardAt = value;
  }
  assertValidBanner(result);
  return result;
}
export interface Measures { attainment: number; cost: number; pulls: number }
export function paretoFrontier(points: readonly Measures[], objectives: Objective[], minAttainment: number, maxCost: number): number[] {
  if (objectives.length < 2 || objectives.length > 3 || new Set(objectives).size !== objectives.length || objectives.some((key) => !['cost', 'attainment', 'pulls'].includes(key))) throw new Error('pareto.objectives: Choose two or three distinct supported objectives.');
  if (!Number.isFinite(minAttainment) || minAttainment < 0 || minAttainment > 1 || !Number.isFinite(maxCost) || maxCost < 0) throw new Error('pareto.constraints: Use a completion share from 0 to 1 and a finite nonnegative currency limit.');
  if (points.length > 49 || points.some((point) => !Number.isFinite(point.cost) || point.cost < 0 || !Number.isFinite(point.pulls) || point.pulls < 0 || !Number.isFinite(point.attainment) || point.attainment < 0 || point.attainment > 1)) throw new Error('pareto.points: Provide at most 49 finite, nonnegative grid outcomes.');
  const feasible = points.map((point, index) => ({ point, index })).filter(({ point }) => point.attainment >= minAttainment && point.cost <= maxCost);
  const better = (a: Measures, b: Measures, strict: boolean) => objectives[strict ? 'some' : 'every']((key) => key === 'attainment' ? (strict ? a[key] > b[key] : a[key] >= b[key]) : (strict ? a[key] < b[key] : a[key] <= b[key]));
  return feasible.filter(({ point, index }) => !feasible.some((other) => other.index !== index && better(other.point, point, false) && better(other.point, point, true))).map(({ index }) => index);
}
