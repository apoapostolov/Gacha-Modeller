import { eventRng, weightedPick, type Rng } from './rng.ts';
import { assertValidBanner } from './validation.ts';
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
  const counters: Record<string, number> = Object.create(null);
  for (const rarity of banner.rarities) counters[rarity.id] = 0;
  return {
    counters,
    featuredArmed: false,
    totalPulls: 0,
    inventory: Object.create(null),
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

function grant(banner: Banner, state: PullState, item: PoolItem, resetCharge = true): void {
  state.inventory[item.id] = (state.inventory[item.id] ?? 0) + 1;
  state.owned.add(item.id);
  const chase = banner.featured?.rarity;
  if (resetCharge && item.featured && (!chase || item.rarity === chase)) state.sinceFeatured = 0;
}

export function featuredPool(banner: Banner): PoolItem[] {
  const chase = banner.featured?.rarity;
  return banner.items.filter(
    (entry) => entry.featured && (!chase || entry.rarity === chase),
  );
}

function nextFeaturedItem(banner: Banner, state: PullState): PoolItem {
  const pool = featuredPool(banner).filter((item) => item.weight > 0);
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
  const { pool, featuredRoll } = resolveFeatured(banner, state, rarity.id, eventRng(rng, `pull:${state.totalPulls}:featured`), featuredOpts);
  if (pool.length === 0) {
    throw new Error(`banner ${banner.id} has no items for rarity ${rarity.id}`);
  }
  const item = pickFrom(banner, state, pool, eventRng(rng, `pull:${state.totalPulls}:item`));
  applyCounters(banner, state, rarity.id);
  grant(banner, state, item);
  finishPull(banner, state);
  return { item, rarity: rarity.id, pityKind, featuredRoll };
}

/** Force a featured draw, applying draw resets. Exchanges use a separate transition. */
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

function draw(banner: Banner, state: PullState, rng: Rng, minimum?: string): PullOutcome {
  state.sinceFeatured += 1;
  const minimumRank = minimum ? banner.rarities.findIndex((r) => r.id === minimum) : -1;
  const meetsMinimum = (id: string) => minimumRank < 0 || banner.rarities.findIndex((r) => r.id === id) <= minimumRank;
  const finishSelection = (rarity: Rarity, pityKind: PityKind, opts?: { chance?: number; capturing?: boolean }) => {
    if (!meetsMinimum(rarity.id)) {
      return { ...rollItem(banner, state, rng, rarityById(banner, minimum!), 'none'), packGuaranteed: true };
    }
    return rollItem(banner, state, rng, rarity, pityKind, opts);
  };
  const charge = banner.charge;
  if ((charge && state.sinceFeatured >= charge.hardAt) || (banner.featured?.hardAt && state.sinceFeatured >= banner.featured.hardAt)) {
    if (!meetsMinimum(banner.featured!.rarity)) return finishSelection(rarityById(banner, banner.featured!.rarity), 'hard');
    const outcome = grantFeatured(banner, state);
    finishPull(banner, state);
    return outcome;
  }
  if (charge && state.sinceFeatured === charge.midAt && banner.featured) {
    return finishSelection(
      rarityById(banner, banner.featured.rarity),
      'soft',
      { chance: charge.midFeaturedChance, capturing: false },
    );
  }

  const { rarity, pityKind } = pickRarity(banner, state, eventRng(rng, `pull:${state.totalPulls}:rarity`));
  return finishSelection(rarity, pityKind);
}

export function pull(banner: Banner, state: PullState, rng: Rng): PullOutcome {
  return draw(banner, state, rng);
}

/** Internal hot path; callers validate the model and pack mode before executing. */
export function executePack(banner: Banner, state: PullState, rng: Rng, observe?: () => void): PullOutcome[] {
  const rule = banner.multiPull!;
  const minimumRank = rule.guaranteeRarity ? banner.rarities.findIndex((r) => r.id === rule.guaranteeRarity) : -1;
  let qualified = false;
  const outcomes: PullOutcome[] = [];
  for (let slot = 0; slot < rule.size; slot++) {
    const minimum = slot === rule.size - 1 && !qualified ? rule.guaranteeRarity : undefined;
    const outcome = draw(banner, state, rng, minimum);
    outcomes.push(outcome);
    if (banner.rarities.findIndex((r) => r.id === outcome.rarity) <= minimumRank) qualified = true;
    observe?.();
  }
  return outcomes;
}

/** One purchased pack; the whole declared size is executed even after an early reward. */
export function pullPack(banner: Banner, state: PullState, rng: Rng): PullOutcome[] {
  assertValidBanner(banner);
  if (!banner.multiPull) throw new Error('actionMode: This model has no pack rule.');
  return executePack(banner, state, rng);
}

export function sparkIfReady(banner: Banner, state: PullState): PullOutcome | null {
  const spark = banner.spark;
  if (!spark) return null;
  const tolerance = Number.EPSILON * Math.max(state.sparkProgress, spark.cost) * 8;
  if (state.sparkProgress <= 0 || state.sparkProgress + tolerance < spark.cost) return null;
  const remaining = Math.max(0, state.sparkProgress - spark.cost);
  if (remaining === state.sparkProgress) throw new Error('spark.cost: Exchange cost is too small for the bar magnitude.');
  const item = nextFeaturedItem(banner, state);
  grant(banner, state, item, false);
  for (const id of spark.reset?.rarityCounters ?? []) state.counters[id] = 0;
  if (spark.reset?.featuredArmed) state.featuredArmed = false;
  if (spark.reset?.sinceFeatured) state.sinceFeatured = 0;
  const outcome: PullOutcome = { item, rarity: item.rarity, pityKind: 'none', featuredRoll: 'guaranteed', sparked: true };
  state.sparkProgress = remaining;
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
