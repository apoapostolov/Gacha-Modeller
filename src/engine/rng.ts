/** Uniform [0, 1) RNG. */
export type Rng = () => number;

interface AddressedRng extends Function { (): number; at?: (event: string) => Rng }
/** Named streams preserve event alignment when a mechanic consumes extra random values. */
export function eventRng(rng: Rng, event: string): Rng { return (rng as AddressedRng).at?.(event) ?? rng; }
export function createTrialRng(seed: number, trialIndex: number): Rng {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff || !Number.isSafeInteger(trialIndex) || trialIndex < 0 || trialIndex > 0xffffffff) throw new Error('seed/trialIndex: Use unsigned whole 32-bit values.');
  const derive = (event: string) => {
    let hash = 2166136261;
    for (const character of `event-streams-v1:${seed}:${trialIndex}:${event}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    hash ^= hash >>> 16; hash = Math.imul(hash, 0x85ebca6b); hash ^= hash >>> 13; hash = Math.imul(hash, 0xc2b2ae35); hash ^= hash >>> 16;
    return hash >>> 0;
  };
  const rng: AddressedRng = mulberry32(derive('fallback'));
  rng.at = (event) => mulberry32(derive(event));
  return rng;
}

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
