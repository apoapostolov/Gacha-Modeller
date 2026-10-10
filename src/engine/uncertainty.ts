import type { TrialSample } from './types.ts';
export interface Interval { estimate: number; low: number; high: number; standardError?: number; method: string }
const Z = 1.959963984540054;
/** Wilson score, including informative nonzero width at zero and all successes. */
export function wilson(successes: number, trials: number, z = Z): Interval {
  if (!Number.isSafeInteger(trials) || trials < 1 || !Number.isSafeInteger(successes) || successes < 0 || successes > trials) throw new Error('interval: Successes must be whole counts within a positive sample size.');
  const estimate = successes / trials, denom = 1 + z * z / trials;
  const center = (estimate + z * z / (2 * trials)) / denom;
  const half = z * Math.sqrt(estimate * (1 - estimate) / trials + z * z / (4 * trials * trials)) / denom;
  return { estimate, low: Math.max(0, center - half), high: Math.min(1, center + half), method: 'Wilson score' };
}
export function meanError(values: readonly number[]): { mean: number; variance: number; se: number | null } {
  if (!values.length || values.some((x) => !Number.isFinite(x))) throw new Error('interval: Provide finite observations.');
  const mean = values.reduce((sum, x) => sum + x, 0) / values.length;
  const variance = values.length > 1 ? values.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (values.length - 1) : 0;
  return { mean, variance, se: values.length > 1 ? Math.sqrt(variance / values.length) : null };
}
/** Large-sample mean intervals only. Small or constant samples retain estimates but no interval. */
export function meanDifference(a: readonly number[], b: readonly number[], paired: boolean): Interval | null {
  if (paired && a.length !== b.length) throw new Error('interval: Paired samples need matching lengths.');
  const first = meanError(a), second = meanError(b);
  const se = paired ? meanError(b.map((x, i) => x - a[i]!)).se : Math.sqrt(first.variance / a.length + second.variance / b.length);
  if (Math.min(a.length, b.length) < 30 || se === null || se === 0) return null;
  const estimate = second.mean - first.mean;
  return { estimate, low: estimate - Z * se, high: estimate + Z * se, standardError: se, method: paired ? 'Paired large-sample normal' : 'Independent large-sample normal reference' };
}
export function attainmentDifference(a: readonly TrialSample[], b: readonly TrialSample[], paired: boolean, zJoint = 2.241402727604947): Interval {
  // Default: 97.5% marginal score intervals, Bonferroni joint 95%.
  if (paired && (a.length !== b.length || a.some((row, i) => row.trialIndex !== b[i]!.trialIndex))) throw new Error('interval: Pair trials by matching index.');
  const first = wilson(paired ? a.filter((row, i) => row.goalAchieved && !b[i]!.goalAchieved).length : a.filter((row) => row.goalAchieved).length, a.length, zJoint);
  const second = wilson(paired ? b.filter((row, i) => row.goalAchieved && !a[i]!.goalAchieved).length : b.filter((row) => row.goalAchieved).length, b.length, zJoint);
  return { estimate: second.estimate - first.estimate, low: Math.max(-1, second.low - first.high), high: Math.min(1, second.high - first.low), method: paired ? 'Paired discordances, Bonferroni Wilson' : 'Independent Bonferroni Wilson reference' };
}
export function comparisonUncertainty(a: readonly TrialSample[], b: readonly TrialSample[]) {
  if (a.length !== b.length || a.some((row, i) => row.trialIndex !== b[i]!.trialIndex)) throw new Error('interval: Paired trial indices must match.');
  return {
    level: .95,
    attainment: { baseline: wilson(a.filter((x) => x.goalAchieved).length, a.length), candidate: wilson(b.filter((x) => x.goalAchieved).length, b.length), paired: attainmentDifference(a, b, true), independentReference: attainmentDifference(a, b, false) },
    pulls: { paired: meanDifference(a.map((x) => x.pulls), b.map((x) => x.pulls), true), independentReference: meanDifference(a.map((x) => x.pulls), b.map((x) => x.pulls), false), baselineSE: meanError(a.map((x) => x.pulls)).se, candidateSE: meanError(b.map((x) => x.pulls)).se },
    cost: { paired: meanDifference(a.map((x) => x.cost), b.map((x) => x.cost), true), independentReference: meanDifference(a.map((x) => x.cost), b.map((x) => x.cost), false), baselineSE: meanError(a.map((x) => x.cost)).se, candidateSE: meanError(b.map((x) => x.cost)).se },
  };
}
