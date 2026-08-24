import { mulberry32 } from './rng.ts';
import {
  createState,
  featuredCount,
  pull,
  sparkIfReady,
  uniqueCount,
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
      (goal.type === 'first-featured' || goal.type === 'copies')
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
