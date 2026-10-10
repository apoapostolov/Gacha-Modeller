import { mulberry32 } from './rng.ts';
import { createState, featuredCount, pull } from './pull.ts';
import { summarize } from './stats.ts';
import type { Banner, Summary } from './types.ts';
import { assertValidBanner, validateRun, MAX_PULLS, ModelValidationError } from './validation.ts';

export interface PoolShareReport {
  players: number;
  budgetPerPlayer: number;
  trials: number;
  seed: number;
  sharedFeatured: Summary;
  soloFeatured: Summary;
  leftoverPityWasteSolo: Summary;
}

/**
 * Shared pity vs N solo cycles at the same total pull count.
 * Fragmented solo cycles waste leftover pity; one shared sequence does not.
 */
export function simulatePoolShare(
  banner: Banner,
  players: number,
  budgetPerPlayer: number,
  trials: number,
  seed: number,
): PoolShareReport {
  assertValidBanner(banner);
  validateRun({ type: 'budget', pulls: budgetPerPlayer }, 'never', {}, trials, seed);
  if (!Number.isSafeInteger(players) || players < 1 || players > 1000) {
    throw new ModelValidationError([{ path: 'players', code: 'invalid-run', message: 'Use 1 to 1000 whole players.' }]);
  }
  if (players * budgetPerPlayer > MAX_PULLS) {
    throw new ModelValidationError([{ path: 'budgetPerPlayer', code: 'invalid-run', message: `Keep the combined group budget at or below ${MAX_PULLS} pulls.` }]);
  }
  const rng = mulberry32(seed);
  const totalPulls = players * budgetPerPlayer;
  const sharedHits: number[] = [];
  const soloHits: number[] = [];
  const waste: number[] = [];

  for (let t = 0; t < trials; t++) {
    const shared = createState(banner);
    for (let i = 0; i < totalPulls; i++) pull(banner, shared, rng);
    sharedHits.push(featuredCount(banner, shared));

    let soloFeatured = 0;
    let leftover = 0;
    const featuredRarity = banner.featured?.rarity;
    for (let p = 0; p < players; p++) {
      const solo = createState(banner);
      for (let i = 0; i < budgetPerPlayer; i++) pull(banner, solo, rng);
      soloFeatured += featuredCount(banner, solo);
      if (featuredRarity) leftover += solo.counters[featuredRarity] ?? 0;
    }
    soloHits.push(soloFeatured);
    waste.push(leftover);
  }

  return {
    players,
    budgetPerPlayer,
    trials,
    seed,
    sharedFeatured: summarize(sharedHits),
    soloFeatured: summarize(soloHits),
    leftoverPityWasteSolo: summarize(waste),
  };
}
