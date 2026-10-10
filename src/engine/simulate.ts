import { diagnoseGoal } from './reachability.ts';
import { stateFromInitial, validateInitial } from './initial.ts';
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
  exchangePool,
} from './pull.ts';
import { transitionState } from './lifecycle.ts';
import { craftIfReady } from './rewards.ts';
import { modelSchemaVersion, advancedRun } from './contract.ts';
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
  JourneyEvent,
  TraceState,
} from './types.ts';

const HARD_CAP = MAX_PULLS;

export function goalMet(banner: Banner, state: PullState, goal: Goal): boolean {
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
      return banner.items.every((item) => state.owned.has(item.id));
    case 'targets':
      return goal.targets.every((target) => (state.inventory[target.itemId] ?? 0) >= target.count);
  }
}

function definitelyImpossible(banner: Banner, goal: Goal, sparkPolicy: SparkPolicy, options: TrialOptions): boolean {
  if (options.initialState && (options.initialState.featuredArmed || (options.initialState.salvage ?? 0) > 0 || Object.values(options.initialState.inventory ?? {}).some((count) => count > 0))) return false;
  return diagnoseGoal(banner, goal, sparkPolicy, options).definitelyImpossible;
}

function runValidatedTrial(
  banner: Banner,
  goal: Goal,
  rng: () => number,
  sparkPolicy: SparkPolicy,
  options: TrialOptions,
  impossible: boolean,
  observer?: (event: JourneyEvent) => void,
): TrialResult {
  let active = banner;
  let state = stateFromInitial(banner, options.targetId, options.initialState);
  let cost = 0;
  const transitions = [...options.transitions ?? []].sort((a, b) => a.atPull - b.atPull);
  let transitionIndex = 0;
  let sparked = false;
  let attainmentPulls: number | null = goalMet(banner, state, goal) ? 0 : null;
  let termination: TrialTermination = impossible ? 'impossible' : 'horizon';
  const horizon = options.maxPulls ?? HARD_CAP;
  const observe = () => {
    if (attainmentPulls === null && goalMet(active, state, goal)) attainmentPulls = state.totalPulls;
  };
  const view = (): TraceState => ({ pulls: state.totalPulls, rarityCounters: { ...state.counters }, captureArmed: state.featuredArmed, sinceFeatured: state.sinceFeatured, sparkProgress: state.sparkProgress, targetId: state.targetId, targetProgress: state.targetProgress, onceUsed: state.onceGuaranteeUsed, salvage: state.salvage, owned: state.owned.size, selectedCopies: state.targetId ? state.inventory[state.targetId] ?? 0 : 0 });
  const emit = (kind: JourneyEvent['kind'], before: TraceState | undefined, detail: Partial<Pick<JourneyEvent, 'outcome' | 'transition' | 'purchaseCost'>> = {}) => { if (observer) observer({ kind, modelId: active.id, before: before!, after: view(), ...detail }); };
  while (!impossible && attainmentPulls === null) {
    while (transitionIndex < transitions.length && transitions[transitionIndex]!.atPull <= state.totalPulls) {
      const event = transitions[transitionIndex++]!;
      const next = event.type === 'banner-switch' ? event.model! : active;
      const before = observer ? view() : undefined;
      state = transitionState(active, next, state, event); active = next; observe();
      emit('transition', before, { transition: { type: event.type, seasonId: event.seasonId, targetId: event.targetId } });
    }
    if (attainmentPulls !== null) break;
    if (options.craftPolicy === 'missing-targets' && active.duplicates?.craftCost && goal.type !== 'budget') {
      const wanted = goal.type === 'targets' ? goal.targets : goal.type === 'collection' ? active.items.map((item) => ({ itemId: item.id, count: 1 })) : featuredPool(active).map((item) => ({ itemId: item.id, count: goal.type === 'copies' ? goal.count : 1 }));
      for (const target of wanted) {
        const recipe = active.duplicates.craftableItems?.includes(target.itemId) ?? active.items.some((item) => item.id === target.itemId && item.weight > 0);
        if (!recipe) continue;
        while ((state.inventory[target.itemId] ?? 0) < target.count) {
          const before = observer ? view() : undefined;
          const outcome = craftIfReady(active, state, target.itemId); if (!outcome) break;
          observe(); emit('craft', before, { outcome }); if (attainmentPulls !== null) break;
        }
        if (attainmentPulls !== null) break;
      }
    }
    if (attainmentPulls !== null) break;
    const actionSize = options.actionMode === 'pack' ? active.multiPull!.size : 1;
    // Settle ready exchanges before testing limits, including on the final purchased pull.
    if (sparkPolicy === 'if-needed' && active.spark && goal.type !== 'budget' && goal.type !== 'collection') {
      while (true) {
        const before = observer ? view() : undefined;
        const outcome = sparkIfReady(active, state, options.exchangeItemId); if (!outcome) break;
        sparked = true;
        observe();
        emit('exchange', before, { outcome });
        if (attainmentPulls !== null) break;
      }
    }
    if (attainmentPulls !== null) break;
    if (goal.type === 'budget' && state.totalPulls + actionSize > goal.pulls && goal.pulls <= horizon) { termination = 'budget'; break; }
    if (state.totalPulls + actionSize > horizon) break;
    if (active.targetRule && !state.targetId) throw new Error('targetId: Select a featured target after this transition.');
    const purchaseCost = actionSize * active.pullCost.amount;
    cost += purchaseCost;
    emit('purchase', observer ? view() : undefined, { purchaseCost });
    let before = observer ? view() : undefined;
    if (options.actionMode === 'pack') executePack(active, state, rng, (outcome) => { observe(); emit('draw', before, { outcome }); if (observer) before = view(); });
    else { const outcome = pull(active, state, rng); observe(); emit('draw', before, { outcome }); }
  }
  const goalAchieved = attainmentPulls !== null;
  return {
    goalAchieved,
    termination: goalAchieved ? 'goal' : termination,
    attainmentPulls,
    pulls: state.totalPulls,
    cost,
    featuredCount: featuredCount(active, state),
    uniqueCount: uniqueCount(state),
    sparked,
    inventory: { ...state.inventory },
    ...(banner.duplicates || options.transitions?.some((event) => event.model?.duplicates) ? { duplicateCount: state.duplicateCount, salvageEarned: state.salvageEarned, salvageSpent: state.salvageSpent, salvageRemaining: state.salvage, crafted: state.crafted } : {}),
  };
}

function validateScenario(banner: Banner, goal: Goal, sparkPolicy: SparkPolicy, options: TrialOptions, trials = 1, seed = 0) {
  if (options.initialState) validateInitial(options.initialState, banner);
  assertValidBanner(banner);
  validateRun(goal, sparkPolicy, options, trials, seed);
  if (options.actionMode === 'pack' && !banner.multiPull) throw new Error('actionMode: This model has no pack rule.');
  if (options.targetId !== undefined && !featuredPool(banner).some((item) => item.id === options.targetId && item.weight > 0)) throw new Error('targetId: Choose an existing positive-weight featured item.');
  if (banner.targetRule && !options.targetId) throw new Error('targetId: This model needs a selected featured target.');
  if (banner.spark?.choice === 'selected' && sparkPolicy === 'if-needed' && !exchangePool(banner).some((item) => item.id === options.exchangeItemId)) throw new Error('exchangeItemId: Choose an eligible shop reward.');
  if (banner.spark?.choice === 'target' && sparkPolicy === 'if-needed' && !exchangePool(banner).some((item) => item.id === options.targetId)) throw new Error('targetId: Choose an eligible shop target.');
  let current = banner;
  for (const event of [...options.transitions ?? []].sort((a, b) => a.atPull - b.atPull)) {
    if (event.type === 'banner-switch') {
      assertValidBanner(event.model);
      if (event.model!.pullCost.currency !== banner.pullCost.currency) throw new Error('transitions.model.pullCost.currency: A journey needs one currency unit.');
      if (options.actionMode === 'pack' && !event.model!.multiPull) throw new Error('transitions.model.multiPull: Every switched model needs a pack rule.');
      current = event.model!;
      if (current.spark?.choice === 'selected' && sparkPolicy === 'if-needed' && !exchangePool(current).some((item) => item.id === options.exchangeItemId)) throw new Error('transitions.exchangeItemId: Choose a shop reward eligible on every destination.');
    }
    if (event.type === 'target-switch' && !featuredPool(current).some((item) => item.id === event.targetId && item.weight > 0)) throw new Error('transitions.targetId: Choose an eligible featured item on the active model.');
  }
}

export function runTrial(banner: Banner, goal: Goal, rng: () => number, sparkPolicy: SparkPolicy = 'if-needed', options: TrialOptions = {}, observer?: (event: JourneyEvent) => void): TrialResult {
  return createTrialExecutor(banner, goal, sparkPolicy, options)(rng, observer);
}

/** Validate once at a job boundary, then execute a frozen model in the hot loop. */
export function createTrialExecutor(banner: Banner, goal: Goal, sparkPolicy: SparkPolicy, options: TrialOptions) {
  validateScenario(banner, goal, sparkPolicy, options);
  const impossible = definitelyImpossible(banner, goal, sparkPolicy, options);
  return (rng: () => number, observer?: (event: JourneyEvent) => void) => runValidatedTrial(banner, goal, rng, sparkPolicy, options, impossible, observer);
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
      engineVersion: options.initialState ? 'analysis-4' : modelSchemaVersion(banner) === 2 || advancedRun(goal, options) ? 'mechanics-3' : rngPolicy === 'legacy-sequential' ? 'foundation-1' : 'workbench-2', rngPolicy, rarityPolicy: 'priority', model: structuredClone(banner),
      options: { ...structuredClone(options), maxPulls: options.maxPulls ?? HARD_CAP, actionMode: options.actionMode ?? 'single' },
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
    ...(results.some((row) => row.duplicateCount !== undefined) ? { duplicateSummary: {
      attempted: summarize(results.map((row) => row.duplicateCount ?? 0)), salvageEarned: summarize(results.map((row) => row.salvageEarned ?? 0)),
      salvageSpent: summarize(results.map((row) => row.salvageSpent ?? 0)), salvageRemaining: summarize(results.map((row) => row.salvageRemaining ?? 0)), crafted: summarize(results.map((row) => row.crafted ?? 0)),
    } } : {}),
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
