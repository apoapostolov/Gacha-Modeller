import { createTrialExecutor, goalMet } from './simulate.ts';
import { effectiveRate, pityFor, pull, sparkIfReady, exchangePool } from './pull.ts';
import { stateFromInitial } from './initial.ts';
import type { Rng } from './rng.ts';
import type { Banner, Goal, PullState, SparkPolicy, TrialOptions } from './types.ts';

export interface ExactReport {
  status: 'exact'; solver: 'hazard' | 'small-state'; horizon: number;
  attainment: number; meanPurchasedPulls: number; meanCost: number;
  cdf: { pulls: number; probability: number }[];
  quantiles: { p50: number | null; p90: number | null; p95: number | null };
  peakStates: number; transitions: number; massError: number;
}
export interface ExactFallback { status: 'simulation'; reason: string }
export const EXACT_LIMITS = { horizon: 2000, states: 2000, transitions: 200000 };
function intervals(points: number[]): { value: number; weight: number }[] {
  const cuts = [...new Set([0, ...points.map((x) => Math.min(1, Math.max(0, x))), 1])].sort((a, b) => a - b);
  return cuts.slice(1).map((end, i) => ({ value: (end + cuts[i]!) / 2, weight: end - cuts[i]! }));
}
function key(model: Banner, state: PullState): string {
  // Only keep variables affecting future first-featured draws. Inventories, filler counters
  // and ownership have no effect in this explicitly restricted, unheated, uncapped domain.
  return JSON.stringify([model.pity.map((p) => state.counters[p.rarity]), state.featuredArmed,
    model.charge || model.featured?.hardAt ? state.sinceFeatured : 0,
    model.targetRule ? state.targetProgress : 0, state.onceGuaranteeUsed,
    model.spark ? state.sparkProgress : 0]);
}
/** Propagate probability through the actual pull/exchange transitions, without random sampling. */
export function solveExact(model: Banner, goal: Goal, policy: SparkPolicy, options: TrialOptions, limits = EXACT_LIMITS): ExactReport | ExactFallback {
  createTrialExecutor(model, goal, policy, options); // identical boundary validation to simulation
  const fallback = (reason: string): ExactFallback => ({ status: 'simulation', reason });
  for (const field of ['horizon', 'states', 'transitions'] as const) {
    if (!Number.isSafeInteger(limits[field]) || limits[field] < 1 || limits[field] > EXACT_LIMITS[field]) throw new Error(`exact.${field}: Use a positive limit up to ${EXACT_LIMITS[field]}.`);
  }
  const horizon = options.maxPulls ?? 100000;
  if (goal.type !== 'first-featured') return fallback('Exact analysis currently supports the first featured reward. Your selected goal uses simulation.');
  if (options.actionMode === 'pack' || options.transitions?.length || model.duplicates || model.mechanics?.collectionHeat) return fallback('Packs, scheduled changes, duplicate transformations and collection heat use simulation.');
  if (horizon > limits.horizon) return fallback(`Exact analysis is limited to ${limits.horizon.toLocaleString()} purchased pulls. Shorten the horizon to use it.`);
  if (model.rarities.length > 8 || model.items.length > 24) return fallback('Large catalogues use simulation. Exact analysis supports at most eight rarity tiers and 24 catalogue items.');
  // Each weighted bucket must have a single selectable item. This avoids inventing an
  // inventory aggregation for selected/missing-first shops or ownership-dependent draws.
  for (const tier of model.rarities) for (const featured of [true, false]) {
    if (model.items.filter((item) => item.rarity === tier.id && Boolean(item.featured) === featured && item.weight > 0).length > 1) return fallback('This item pool needs a larger state solver. Exact analysis supports one selectable item per rarity/featured bucket.');
  }
  for (const tier of model.rarities) {
    const selectable = model.items.filter((item) => item.rarity === tier.id && item.weight > 0);
    if (model.featured?.rarity !== tier.id && selectable.length > 1) return fallback('Mixed item pools without a featured split use simulation.');
  }
  if (!model.items.some((item) => item.featured && item.weight > 0)) return fallback('No drawable featured reward is declared. Use the goal diagnosis and simulation result.');
  if (policy === 'if-needed' && model.spark && exchangePool(model).some((item) => !item.featured || (model.featured && item.rarity !== model.featured.rarity))) return fallback('A shop with non-featured rewards uses simulation.');
  let live = new Map<string, { state: PullState; probability: number }>();
  const initial = stateFromInitial(model, options.targetId, options.initialState);
  live.set(key(model, initial), { state: initial, probability: 1 });
  let attained = 0, mean = 0, peakStates = 1, operations = 0;
  const cdf: ExactReport['cdf'] = [];
  const featuredIntervals = intervals([model.featured?.chance ?? 0, model.charge?.midFeaturedChance ?? 0]);
  for (let position = 0; position <= horizon; position++) {
    for (const [id, row] of live) {
      if (!goalMet(model, row.state, goal) && policy === 'if-needed' && model.spark) sparkIfReady(model, row.state, options.exchangeItemId);
      if (goalMet(model, row.state, goal)) { attained += row.probability; live.delete(id); }
    }
    cdf.push({ pulls: position, probability: Math.min(1, Math.max(0, attained)) });
    if (position === horizon) break;
    const survival = [...live.values()].reduce((sum, row) => sum + row.probability, 0);
    mean += survival;
    if (live.size === 0) { cdf.push({ pulls: horizon, probability: Math.min(1, attained) }); break; }
    const next = new Map<string, { state: PullState; probability: number }>();
    for (const row of live.values()) {
      let cumulative = 0;
      const rarityIntervals = intervals(model.rarities.slice(0, -1).map((tier) => cumulative += effectiveRate(tier.baseRate, row.state.counters[tier.id]! + 1, pityFor(model, tier.id))));
      for (const rarity of rarityIntervals) for (const featured of featuredIntervals) {
        if (++operations > limits.transitions) return fallback(`Exact analysis reached its ${limits.transitions.toLocaleString()}-transition limit. The complete simulation result is retained.`);
        const state = structuredClone(row.state);
        const rng = Object.assign(() => 0, { at: (event: string): Rng => () => event.endsWith(':rarity') ? rarity.value : event.endsWith(':featured') ? featured.value : 0 });
        pull(model, state, rng);
        const probability = row.probability * rarity.weight * featured.weight;
        if (goalMet(model, state, goal)) { attained += probability; continue; }
        const id = key(model, state), existing = next.get(id);
        if (existing) existing.probability += probability;
        else next.set(id, { state, probability });
        if (next.size > limits.states) return fallback(`Exact analysis reached its ${limits.states.toLocaleString()}-state limit. The complete simulation result is retained.`);
      }
    }
    live = next; peakStates = Math.max(peakStates, live.size);
  }
  const remainder = [...live.values()].reduce((sum, row) => sum + row.probability, 0);
  const q = (value: number) => cdf.find((point) => point.probability >= value)?.pulls ?? null;
  return { status: 'exact', solver: model.featured?.capturing || model.charge || model.featured?.hardAt || model.targetRule || (model.pity.length && (model.featured?.chance ?? 1) < 1) ? 'small-state' : 'hazard', horizon,
    attainment: cdf.at(-1)!.probability, meanPurchasedPulls: mean, meanCost: mean * model.pullCost.amount,
    cdf, quantiles: { p50: q(.5), p90: q(.9), p95: q(.95) }, peakStates, transitions: operations, massError: Math.abs(1 - attained - remainder) };
}
