import { weightedPick, type Rng } from './rng.ts';
import type {
  Banner,
  FeaturedRoll,
  PityKind,
  PityRule,
  PoolItem,
  PullOutcome,
  PullState,
  Rarity,
} from './types.ts';

export function createState(banner: Banner): PullState {
  const counters: Record<string, number> = {};
  for (const rarity of banner.rarities) counters[rarity.id] = 0;
  return {
    counters,
    featuredArmed: false,
    totalPulls: 0,
    inventory: {},
    owned: new Set(),
    sparkProgress: 0,
    sinceFeatured: 0,
  };
}

export function pityFor(banner: Banner, rarityId: string): PityRule | undefined {
  return banner.pity.find((rule) => rule.rarity === rarityId);
}

export function effectiveRate(
  base: number,
  countAfter: number,
  pity: PityRule | undefined,
): number {
  if (!pity?.softStart || pity.softStep == null) return base;
  if (countAfter < pity.softStart) return base;
  return Math.min(1, base + (countAfter - pity.softStart + 1) * pity.softStep);
}

function rankedRarities(banner: Banner): { ranked: Rarity[]; filler: Rarity } {
  if (banner.rarities.length === 0) {
    throw new Error(`banner ${banner.id} has no rarities`);
  }
  return {
    ranked: banner.rarities.slice(0, -1),
    filler: banner.rarities[banner.rarities.length - 1]!,
  };
}

function pickRarity(
  banner: Banner,
  state: PullState,
  rng: Rng,
): { rarity: Rarity; pityKind: PityKind } {
  const { ranked, filler } = rankedRarities(banner);

  for (const rarity of ranked) {
    const pity = pityFor(banner, rarity.id);
    const after = (state.counters[rarity.id] ?? 0) + 1;
    if (pity && after >= pity.hardAt) {
      return { rarity, pityKind: 'hard' };
    }
  }

  const u = rng();
  let acc = 0;
  for (const rarity of ranked) {
    const pity = pityFor(banner, rarity.id);
    const after = (state.counters[rarity.id] ?? 0) + 1;
    acc += effectiveRate(rarity.baseRate, after, pity);
    if (u < acc) {
      const inSoft = Boolean(pity?.softStart && after >= pity.softStart);
      return { rarity, pityKind: inSoft ? 'soft' : 'none' };
    }
  }
  return { rarity: filler, pityKind: 'none' };
}

function applyCounters(banner: Banner, state: PullState, hitId: string): void {
  for (const rarity of banner.rarities) {
    if (rarity.id === hitId) state.counters[rarity.id] = 0;
    else state.counters[rarity.id] = (state.counters[rarity.id] ?? 0) + 1;
  }
  const pity = pityFor(banner, hitId);
  if (pity?.resetAlso) {
    for (const id of pity.resetAlso) state.counters[id] = 0;
  }
}

function featuredItems(banner: Banner, rarityId: string): PoolItem[] {
  return banner.items.filter((item) => item.rarity === rarityId && item.featured);
}

function standardItems(banner: Banner, rarityId: string): PoolItem[] {
  return banner.items.filter((item) => item.rarity === rarityId && !item.featured);
}

function itemsOf(banner: Banner, rarityId: string): PoolItem[] {
  return banner.items.filter((item) => item.rarity === rarityId);
}

function pickFrom(
  banner: Banner,
  state: PullState,
  pool: PoolItem[],
  rng: Rng,
): PoolItem {
  const heat = banner.mechanics?.collectionHeat ?? 0;
  const weights = pool.map((item) => {
    let weight = item.weight;
    if (heat > 0 && !state.owned.has(item.id)) weight *= 1 + heat;
    return weight;
  });
  return weightedPick(pool, weights, rng);
}

function resolveFeatured(
  banner: Banner,
  state: PullState,
  rarityId: string,
  rng: Rng,
  opts?: { chance?: number; capturing?: boolean },
): { pool: PoolItem[]; featuredRoll?: FeaturedRoll } {
  const rule = banner.featured;
  if (!rule || rule.rarity !== rarityId) {
    return { pool: itemsOf(banner, rarityId) };
  }
  const featured = featuredItems(banner, rarityId);
  const standard = standardItems(banner, rarityId);
  if (featured.length === 0) return { pool: itemsOf(banner, rarityId) };

  const chance = opts?.chance ?? rule.chance;
  const capturing = opts?.capturing ?? rule.capturing;

  let featuredRoll: FeaturedRoll;
  let useFeatured: boolean;
  if (state.featuredArmed && opts?.chance == null) {
    featuredRoll = 'guaranteed';
    useFeatured = true;
    state.featuredArmed = false;
  } else if (rng() < chance) {
    featuredRoll = 'won';
    useFeatured = true;
  } else {
    featuredRoll = 'lost';
    useFeatured = false;
    if (capturing) state.featuredArmed = true;
  }

  if (useFeatured) return { pool: featured, featuredRoll };
  if (standard.length > 0) return { pool: standard, featuredRoll };
  return { pool: featured, featuredRoll };
}

function grant(banner: Banner, state: PullState, item: PoolItem): void {
  state.inventory[item.id] = (state.inventory[item.id] ?? 0) + 1;
  state.owned.add(item.id);
  const chase = banner.featured?.rarity;
  if (item.featured && (!chase || item.rarity === chase)) state.sinceFeatured = 0;
}

export function featuredPool(banner: Banner): PoolItem[] {
  const chase = banner.featured?.rarity;
  return banner.items.filter(
    (entry) => entry.featured && (!chase || entry.rarity === chase),
  );
}

function nextFeaturedItem(banner: Banner, state: PullState): PoolItem {
  const pool = featuredPool(banner);
  if (pool.length === 0) throw new Error(`banner ${banner.id} has no featured item`);
  const missing = pool.find((entry) => !state.owned.has(entry.id));
  return missing ?? pool[0]!;
}

function finishPull(banner: Banner, state: PullState): void {
  state.totalPulls += 1;
  state.sparkProgress += 1 + (banner.mechanics?.audienceSparkPerPull ?? 0);
}

function rollItem(
  banner: Banner,
  state: PullState,
  rng: Rng,
  rarity: Rarity,
  pityKind: PityKind,
  featuredOpts?: { chance?: number; capturing?: boolean },
): PullOutcome {
  const { pool, featuredRoll } = resolveFeatured(banner, state, rarity.id, rng, featuredOpts);
  if (pool.length === 0) {
    throw new Error(`banner ${banner.id} has no items for rarity ${rarity.id}`);
  }
  const item = pickFrom(banner, state, pool, rng);
  applyCounters(banner, state, rarity.id);
  grant(banner, state, item);
  finishPull(banner, state);
  return { item, rarity: rarity.id, pityKind, featuredRoll };
}

/** Force a featured item. Used by spark, featured hard pity, and charge hard. */
export function grantFeatured(banner: Banner, state: PullState): PullOutcome {
  const item = nextFeaturedItem(banner, state);
  applyCounters(banner, state, item.rarity);
  state.featuredArmed = false;
  grant(banner, state, item);
  return {
    item,
    rarity: item.rarity,
    pityKind: 'hard',
    featuredRoll: 'guaranteed',
  };
}

function rarityById(banner: Banner, id: string): Rarity {
  const rarity = banner.rarities.find((entry) => entry.id === id);
  if (!rarity) throw new Error(`banner ${banner.id} missing rarity ${id}`);
  return rarity;
}

export function pull(banner: Banner, state: PullState, rng: Rng): PullOutcome {
  state.sinceFeatured += 1;
  const charge = banner.charge;
  if (charge && state.sinceFeatured >= charge.hardAt) {
    const outcome = grantFeatured(banner, state);
    finishPull(banner, state);
    return outcome;
  }
  if (charge && state.sinceFeatured === charge.midAt && banner.featured) {
    return rollItem(
      banner,
      state,
      rng,
      rarityById(banner, banner.featured.rarity),
      'soft',
      { chance: charge.midFeaturedChance, capturing: false },
    );
  }

  const featuredRule = banner.featured;
  if (featuredRule?.hardAt && state.sinceFeatured >= featuredRule.hardAt) {
    const outcome = grantFeatured(banner, state);
    finishPull(banner, state);
    return outcome;
  }

  const { rarity, pityKind } = pickRarity(banner, state, rng);
  return rollItem(banner, state, rng, rarity, pityKind);
}

export function sparkIfReady(banner: Banner, state: PullState): PullOutcome | null {
  const spark = banner.spark;
  if (!spark) return null;
  if (state.sparkProgress + 1e-9 < spark.cost) return null;
  const outcome = grantFeatured(banner, state);
  outcome.sparked = true;
  state.sparkProgress -= spark.cost;
  return outcome;
}

export function featuredCount(banner: Banner, state: PullState): number {
  const chase = banner.featured?.rarity;
  let total = 0;
  for (const item of banner.items) {
    if (!item.featured) continue;
    if (chase && item.rarity !== chase) continue;
    total += state.inventory[item.id] ?? 0;
  }
  return total;
}

export function uniqueCount(state: PullState): number {
  return state.owned.size;
}

export function uniqueFeaturedCount(banner: Banner, state: PullState): number {
  return featuredPool(banner).filter((item) => (state.inventory[item.id] ?? 0) > 0).length;
}
