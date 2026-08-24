import { mulberry32 } from './rng.ts';
import {
  createState,
  featuredCount,
  pull,
  sparkIfReady,
  uniqueCount,
  uniqueFeaturedCount,
} from './pull.ts';
import { histogram, summarize } from './stats.ts';
import type {
  Banner,
  Goal,
  PullState,
  SimReport,
  SparkPolicy,
  TrialResult,
} from './types.ts';

const HARD_CAP = 100_000;

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

export function runTrial(
  banner: Banner,
  goal: Goal,
  rng: () => number,
  sparkPolicy: SparkPolicy = 'if-needed',
): TrialResult {
  const state = createState(banner);
  let sparked = false;

  while (state.totalPulls < HARD_CAP) {
    if (goal.type !== 'budget' && goalMet(banner, state, goal)) break;

    if (
      sparkPolicy === 'if-needed' &&
      banner.spark &&
      (goal.type === 'first-featured' || goal.type === 'copies' || goal.type === 'unique-featured')
    ) {
      const sparkHit = sparkIfReady(banner, state);
      if (sparkHit) {
        sparked = true;
        if (goalMet(banner, state, goal)) break;
      }
    }

    if (goal.type === 'budget' && state.totalPulls >= goal.pulls) break;

    pull(banner, state, rng);

    if (goal.type !== 'budget' && goalMet(banner, state, goal)) break;
  }

  return {
    pulls: state.totalPulls,
    cost: state.totalPulls * banner.pullCost.amount,
    featuredCount: featuredCount(banner, state),
    uniqueCount: uniqueCount(state),
    sparked,
    inventory: { ...state.inventory },
  };
}

export function runMonteCarlo(
  banner: Banner,
  goal: Goal,
  trials: number,
  seed: number,
  sparkPolicy: SparkPolicy = 'if-needed',
): SimReport {
  const rng = mulberry32(seed);
  const results: TrialResult[] = [];
  for (let i = 0; i < trials; i++) {
    results.push(runTrial(banner, goal, rng, sparkPolicy));
  }
  const pulls = results.map((row) => row.pulls);
  return {
    bannerId: banner.id,
    goal,
    sparkPolicy,
    trials,
    seed,
    pulls: summarize(pulls),
    cost: summarize(results.map((row) => row.cost)),
    featuredCount: summarize(results.map((row) => row.featuredCount)),
    uniqueCount: summarize(results.map((row) => row.uniqueCount)),
    sparkRate: results.filter((row) => row.sparked).length / Math.max(trials, 1),
    histogram: histogram(pulls),
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
    items: banner.items.map((item) => (item.featured ? { ...item, id, name } : item)),
  };
}

/** Sequential two-banner chase: pickup A, then pickup B, sharing spark/charge state. */
export function runTwoPickupTrial(
  banner: Banner,
  rng: () => number,
  sparkPolicy: SparkPolicy = 'if-needed',
): TrialResult {
  const a = withPickup(banner, 'pu-a', 'Pickup A');
  const b = withPickup(banner, 'pu-b', 'Pickup B');
  const state = createState(a);
  let sparked = false;
  let firstPulls: number | undefined;

  const play = (current: Banner, done: () => boolean) => {
    while (!done() && state.totalPulls < HARD_CAP) {
      if (sparkPolicy === 'if-needed' && current.spark) {
        const sparkHit = sparkIfReady(current, state);
        if (sparkHit) {
          sparked = true;
          if (done()) return;
        }
      }
      if (done()) return;
      pull(current, state, rng);
    }
  };

  play(a, () => (state.inventory['pu-a'] ?? 0) >= 1);
  firstPulls = state.totalPulls;
  play(b, () => (state.inventory['pu-b'] ?? 0) >= 1);

  return {
    pulls: state.totalPulls,
    cost: state.totalPulls * banner.pullCost.amount,
    featuredCount: (state.inventory['pu-a'] ?? 0) + (state.inventory['pu-b'] ?? 0),
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
} {
  const rng = mulberry32(seed);
  const results: TrialResult[] = [];
  for (let i = 0; i < trials; i++) {
    results.push(runTwoPickupTrial(banner, rng, sparkPolicy));
  }
  const early = results.filter((row) => (row.firstPulls ?? row.pulls) <= 80);
  return {
    first: summarize(results.map((row) => row.firstPulls ?? row.pulls)),
    both: summarize(results.map((row) => row.pulls)),
    earlyBoth: summarize(early.map((row) => row.pulls)),
    sparkRate: results.filter((row) => row.sparked).length / Math.max(trials, 1),
  };
}
