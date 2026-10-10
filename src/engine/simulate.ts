import { mulberry32 } from './rng.ts';
import {
  createState,
  featuredCount,
  pull,
  sparkIfReady,
  uniqueCount,
  uniqueFeaturedCount,
  featuredPool,
  executePack,
} from './pull.ts';
import { assertValidBanner, validateRun, MAX_PULLS } from './validation.ts';
import { histogram, summarize } from './stats.ts';
import type {
  Banner,
  Goal,
  PullState,
  SimReport,
  SparkPolicy,
  TrialResult,
  TrialOptions,
  TrialTermination,
  TrialSample,
} from './types.ts';

const HARD_CAP = MAX_PULLS;

function goalMet(banner: Banner, state: PullState, goal: Goal): boolean {
  switch (goal.type) {
    case 'first-featured':
      return featuredCount(banner, state) >= 1;
    case 'copies':
      return featuredCount(banner, state) >= goal.count;
    case 'unique-featured':
      return uniqueFeaturedCount(banner, state) >= goal.count;
    case 'budget':
      return state.totalPulls >= goal.pulls;
    case 'collection':
      return uniqueCount(state) >= banner.items.length;
  }
}

/** Conservative impossibility checks. Interacting counters can still make other goals unreachable. */
function definitelyImpossible(banner: Banner, goal: Goal, sparkPolicy: SparkPolicy, options: TrialOptions): boolean {
  if (goal.type === 'budget') return false;
  const rankedMass = banner.rarities.slice(0, -1).reduce((sum, r) => sum + r.baseRate, 0);
  const chase = banner.featured?.rarity;
  const forcedFeatured = Boolean(banner.featured?.hardAt || banner.charge || (banner.spark && sparkPolicy === 'if-needed' && goal.type !== 'collection'));
  const reachable = banner.items.filter((item) => {
    if (item.weight <= 0) return false;
    const rank = banner.rarities.findIndex((r) => r.id === item.rarity);
    const rarity = banner.rarities[rank]!;
    const byDraw = rank === banner.rarities.length - 1 ? rankedMass < 1 : rarity.baseRate > 0 || banner.pity.some((p) => p.rarity === item.rarity);
    const byPack = options.actionMode === 'pack' && banner.multiPull?.guaranteeRarity === item.rarity;
    const byCharge = banner.charge && item.rarity === chase;
    if (item.featured && (!chase || item.rarity === chase) && forcedFeatured) return true;
    if (!byDraw && !byPack && !byCharge) return false;
    if (item.rarity !== chase) return true;
    if (item.featured) return banner.featured!.chance > 0 || banner.featured!.capturing;
    return banner.featured!.chance < 1 || Boolean(banner.charge && banner.charge.midFeaturedChance < 1);
  });
  if (goal.type === 'collection') return reachable.length < banner.items.length;
  const targets = new Set(featuredPool(banner).map((item) => item.id));
  const count = reachable.filter((item) => targets.has(item.id)).length;
  return goal.type === 'unique-featured' ? count < goal.count : count === 0;
}

function runValidatedTrial(
  banner: Banner,
  goal: Goal,
  rng: () => number,
  sparkPolicy: SparkPolicy,
  options: TrialOptions,
  impossible: boolean,
): TrialResult {
  const state = createState(banner);
  let sparked = false;
  let attainmentPulls: number | null = goalMet(banner, state, goal) ? 0 : null;
  let termination: TrialTermination = impossible ? 'impossible' : 'horizon';
  const horizon = options.maxPulls ?? HARD_CAP;
  const actionSize = options.actionMode === 'pack' ? banner.multiPull!.size : 1;
  const observe = () => {
    if (attainmentPulls === null && goalMet(banner, state, goal)) attainmentPulls = state.totalPulls;
  };
  while (!impossible && attainmentPulls === null) {
    // Settle ready exchanges before testing limits, including on the final purchased pull.
    if (sparkPolicy === 'if-needed' && banner.spark && goal.type !== 'budget' && goal.type !== 'collection') {
      while (sparkIfReady(banner, state)) {
        sparked = true;
        observe();
        if (attainmentPulls !== null) break;
      }
    }
    if (attainmentPulls !== null) break;
    if (goal.type === 'budget' && state.totalPulls + actionSize > goal.pulls && goal.pulls <= horizon) { termination = 'budget'; break; }
    if (state.totalPulls + actionSize > horizon) break;
    if (options.actionMode === 'pack') executePack(banner, state, rng, observe);
    else { pull(banner, state, rng); observe(); }
  }
  const goalAchieved = attainmentPulls !== null;
  return {
    goalAchieved,
    termination: goalAchieved ? 'goal' : termination,
    attainmentPulls,
    pulls: state.totalPulls,
    cost: state.totalPulls * banner.pullCost.amount,
    featuredCount: featuredCount(banner, state),
    uniqueCount: uniqueCount(state),
    sparked,
    inventory: { ...state.inventory },
  };
}

function validateScenario(banner: Banner, goal: Goal, sparkPolicy: SparkPolicy, options: TrialOptions, trials = 1, seed = 0) {
  assertValidBanner(banner);
  validateRun(goal, sparkPolicy, options, trials, seed);
  if (options.actionMode === 'pack' && !banner.multiPull) throw new Error('actionMode: This model has no pack rule.');
}

export function runTrial(banner: Banner, goal: Goal, rng: () => number, sparkPolicy: SparkPolicy = 'if-needed', options: TrialOptions = {}): TrialResult {
  return createTrialExecutor(banner, goal, sparkPolicy, options)(rng);
}

/** Validate once at a job boundary, then execute a frozen model in the hot loop. */
export function createTrialExecutor(banner: Banner, goal: Goal, sparkPolicy: SparkPolicy, options: TrialOptions) {
  validateScenario(banner, goal, sparkPolicy, options);
  const impossible = definitelyImpossible(banner, goal, sparkPolicy, options);
  return (rng: () => number) => runValidatedTrial(banner, goal, rng, sparkPolicy, options, impossible);
}

export function runMonteCarlo(
  banner: Banner,
  goal: Goal,
  trials: number,
  seed: number,
  sparkPolicy: SparkPolicy = 'if-needed',
  options: TrialOptions = {},
): SimReport {
  validateScenario(banner, goal, sparkPolicy, options, trials, seed);
  const rng = mulberry32(seed);
  const impossible = definitelyImpossible(banner, goal, sparkPolicy, options);
  const results: TrialResult[] = [];
  for (let i = 0; i < trials; i++) {
    results.push(runValidatedTrial(banner, goal, rng, sparkPolicy, options, impossible));
  }
  return summarizeTrials(banner, goal, seed, sparkPolicy, options, results, 'legacy-sequential');
}

export function summarizeTrials(banner: Banner, goal: Goal, seed: number, sparkPolicy: SparkPolicy, options: TrialOptions, results: readonly TrialSample[], rngPolicy: 'legacy-sequential' | 'event-streams-v1'): SimReport {
  const trials = results.length;
  validateScenario(banner, goal, sparkPolicy, options, trials, seed);
  const pulls = results.map((row) => row.pulls);
  const attained = results.filter((row) => row.goalAchieved).map((row) => row.attainmentPulls!).sort((a, b) => a - b);
  const populationQuantile = (q: number) => attained[Math.ceil(trials * q) - 1] ?? null;
  const terminations: Record<TrialTermination, number> = { goal: 0, horizon: 0, budget: 0, impossible: 0 };
  for (const row of results) terminations[row.termination]++;
  const acquisitionCdf: SimReport['acquisitionCdf'] = [];
  for (let i = 0; i < attained.length; i++) {
    const last = acquisitionCdf.at(-1);
    if (last && last.pulls === attained[i]) last.attained = i + 1;
    else acquisitionCdf.push({ pulls: attained[i]!, attained: i + 1 });
  }
  return {
    evidence: 'monte-carlo',
    attainmentRate: attained.length / trials,
    terminations,
    completedPulls: attained.length ? summarize(attained) : null,
    acquisitionQuantiles: { p50: populationQuantile(0.5), p90: populationQuantile(0.9), p95: populationQuantile(0.95) },
    manifest: {
      engineVersion: rngPolicy === 'legacy-sequential' ? 'foundation-1' : 'workbench-2', rngPolicy, rarityPolicy: 'priority', model: structuredClone(banner),
      options: { maxPulls: options.maxPulls ?? HARD_CAP, actionMode: options.actionMode ?? 'single' },
    },
    bannerId: banner.id,
    goal: { ...goal },
    sparkPolicy,
    trials,
    seed,
    pulls: summarize(pulls),
    cost: summarize(results.map((row) => row.cost)),
    featuredCount: summarize(results.map((row) => row.featuredCount)),
    uniqueCount: summarize(results.map((row) => row.uniqueCount)),
    sparkRate: results.filter((row) => row.sparked).length / Math.max(trials, 1),
    histogram: histogram(pulls),
    acquisitionCdf,
  };
}

export function defaultGoal(banner: Banner): Goal {
  if (banner.mechanics?.collectionHeat && banner.items.every((item) => !item.featured)) {
    return { type: 'collection' };
  }
  if (banner.items.some((item) => item.featured)) return { type: 'first-featured' };
  return { type: 'budget', pulls: 90 };
}

function withPickup(banner: Banner, id: string, name: string): Banner {
  return {
    ...banner,
    items: banner.items.map((item) => (item.featured && (!banner.featured || item.rarity === banner.featured.rarity) ? { ...item, id: `${id}-${item.id}`, name } : item)),
  };
}

/** Sequential two-banner chase: pickup A, then pickup B, sharing spark/charge state. */
export function runTwoPickupTrial(
  banner: Banner,
  rng: () => number,
  sparkPolicy: SparkPolicy = 'if-needed',
): TrialResult {
  validateScenario(banner, { type: 'first-featured' }, sparkPolicy, {});
  if (featuredPool(banner).length !== 1) throw new Error('Two-pickup comparison requires exactly one chase item.');
  const a = withPickup(banner, 'pu-a', 'Pickup A');
  const b = withPickup(banner, 'pu-b', 'Pickup B');
  const state = createState(a);
  let sparked = false;
  let firstPulls: number | undefined;

  const play = (current: Banner, done: () => boolean) => {
    while (!done()) {
      if (sparkPolicy === 'if-needed' && current.spark) {
        const sparkHit = sparkIfReady(current, state);
        if (sparkHit) {
          sparked = true;
          if (done()) return;
        }
      }
      if (done()) return;
      if (state.totalPulls >= HARD_CAP) return;
      pull(current, state, rng);
    }
  };

  const pickupA = featuredPool(a)[0]!.id;
  const pickupB = featuredPool(b)[0]!.id;
  const impossible = definitelyImpossible(banner, { type: 'first-featured' }, sparkPolicy, {});
  if (!impossible) play(a, () => (state.inventory[pickupA] ?? 0) >= 1);
  if (state.inventory[pickupA]) {
    firstPulls = state.totalPulls;
    play(b, () => (state.inventory[pickupB] ?? 0) >= 1);
  }
  const goalAchieved = Boolean(state.inventory[pickupB]);

  return {
    goalAchieved,
    termination: goalAchieved ? 'goal' : impossible ? 'impossible' : 'horizon',
    attainmentPulls: goalAchieved ? state.totalPulls : null,
    pulls: state.totalPulls,
    cost: state.totalPulls * banner.pullCost.amount,
    featuredCount: (state.inventory[pickupA] ?? 0) + (state.inventory[pickupB] ?? 0),
    uniqueCount: uniqueCount(state),
    sparked,
    inventory: { ...state.inventory },
    firstPulls,
  };
}

export function runMonteCarloTwoPickup(
  banner: Banner,
  trials: number,
  seed: number,
  sparkPolicy: SparkPolicy = 'if-needed',
): {
  first: ReturnType<typeof summarize>;
  both: ReturnType<typeof summarize>;
  earlyBoth: ReturnType<typeof summarize>;
  sparkRate: number;
  attainmentRate: number;
  firstAttainmentRate: number;
} {
  validateScenario(banner, { type: 'first-featured' }, sparkPolicy, {}, trials, seed);
  const rng = mulberry32(seed);
  const results: TrialResult[] = [];
  for (let i = 0; i < trials; i++) {
    results.push(runTwoPickupTrial(banner, rng, sparkPolicy));
  }
  const early = results.filter((row) => row.goalAchieved && row.firstPulls !== undefined && row.firstPulls <= 80);
  return {
    first: summarize(results.filter((row) => row.firstPulls !== undefined).map((row) => row.firstPulls!)),
    both: summarize(results.filter((row) => row.goalAchieved).map((row) => row.pulls)),
    earlyBoth: summarize(early.map((row) => row.pulls)),
    sparkRate: results.filter((row) => row.sparked).length / Math.max(trials, 1),
    attainmentRate: results.filter((row) => row.goalAchieved).length / trials,
    firstAttainmentRate: results.filter((row) => row.firstPulls !== undefined).length / trials,
  };
}
