import type { Histogram, Summary } from './types.ts';

export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * q;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo]!;
  const w = index - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

export function summarize(values: readonly number[]): Summary {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = n === 0 ? 0 : sorted.reduce((sum, value) => sum + value, 0) / n;
  return {
    n,
    mean,
    median: quantile(sorted, 0.5),
    min: n === 0 ? 0 : sorted[0]!,
    max: n === 0 ? 0 : sorted[n - 1]!,
    p05: quantile(sorted, 0.05),
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
    p90: quantile(sorted, 0.9),
    p95: quantile(sorted, 0.95),
  };
}

export function histogram(values: readonly number[], buckets = 24): Histogram {
  if (values.length === 0) return { start: 0, width: 1, counts: Array(buckets).fill(0) };
  const max = Math.max(...values);
  const min = Math.min(...values);
  const start = Math.min(min, 0);
  const span = Math.max(max - start, 1);
  const width = span / buckets;
  const counts = Array(buckets).fill(0) as number[];
  for (const value of values) {
    let i = Math.floor((value - start) / width);
    if (i >= buckets) i = buckets - 1;
    if (i < 0) i = 0;
    counts[i]! += 1;
  }
  return { start, width, counts };
}
