/** Uniform [0, 1) RNG. */
export type Rng = () => number;

/** Mulberry32. Same seed, same stream. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function weightedPick<T>(
  items: readonly T[],
  weights: readonly number[],
  rng: Rng,
): T {
  if (items.length === 0) {
    throw new Error('weightedPick: empty pool');
  }
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) return items[Math.floor(rng() * items.length)]!;
  let u = rng() * total;
  for (let i = 0; i < items.length; i++) {
    u -= weights[i]!;
    if (u < 0) return items[i]!;
  }
  return items[items.length - 1]!;
}
