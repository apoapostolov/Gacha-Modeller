import { exchangePool, featuredPool } from './pull.ts';
import type { Banner, Goal, SparkPolicy, TrialOptions } from './types.ts';

export interface GoalDiagnosis { definitelyImpossible: boolean; reasons: string[]; unresolved: string[] }

/** Proves only missing acquisition channels and finite inventory bounds, never eventual completion. */
export function diagnoseGoal(model: Banner, goal: Goal, policy: SparkPolicy, options: TrialOptions): GoalDiagnosis {
  const reasons: string[] = [];
  const unresolved: string[] = [];
  if (goal.type === 'budget') return { definitelyImpossible: false, reasons, unresolved };
  if (options.transitions?.length) return { definitelyImpossible: false, reasons, unresolved: ['Scheduled transitions need simulation; this check does not prove reachability across models or reset epochs.'] };
  const pack = options.actionMode === 'pack' ? model.multiPull : undefined;
  const ordinary = !pack?.slots || pack.slots.some((slot) => !slot.itemId && !slot.rarity);
  const forcedQuantity = Math.max(1, ...pack?.slots?.filter((slot) => !slot.itemId && !slot.rarity).map((slot) => slot.quantity) ?? []);
  const mass = model.rarities.slice(0, -1).reduce((sum, rarity) => sum + rarity.baseRate, 0);
  const chase = model.featured?.rarity;
  const selected = options.targetId ?? featuredPool(model).find((item) => item.weight > 0)?.id;
  const shop = policy === 'if-needed' && goal.type !== 'collection' ? exchangePool(model).filter((item) => model.spark?.choice === 'selected' ? item.id === options.exchangeItemId : model.spark?.choice === 'target' ? item.id === options.targetId : true) : [];
  const bounds = new Map<string, number>();
  for (const item of model.items) {
    let maximum = 0;
    const rank = model.rarities.findIndex((rarity) => rarity.id === item.rarity);
    const rarity = model.rarities[rank]!;
    const naturalTier = rank === model.rarities.length - 1 ? mass < 1 : rarity.baseRate > 0 || model.pity.some((rule) => rule.rarity === item.rarity);
    const slotTier = pack?.slots?.some((slot) => slot.rarity === item.rarity);
    const tier = ordinary && (naturalTier || Boolean(model.charge && item.rarity === chase)) || slotTier || ordinary && pack?.guaranteeRarity === item.rarity;
    const subgroup = item.rarity !== chase || (item.featured ? model.featured!.chance > 0 || model.featured!.capturing : model.featured!.chance < 1 || Boolean(model.charge && model.charge.midFeaturedChance < 1));
    if (item.weight > 0 && tier && subgroup || pack?.slots?.some((slot) => slot.itemId === item.id)) maximum = Infinity;
    // Forced selected rewards bypass rates, but a consumed one-time guarantee cannot repeat.
    if (ordinary && (item.id === selected || !options.targetId && !model.targetRule) && item.weight > 0 && item.featured) {
      if (model.featured?.hardAt) maximum = Math.max(maximum, model.featured.once ? forcedQuantity : Infinity);
      if (model.targetRule) maximum = Math.max(maximum, model.targetRule.once ? forcedQuantity : Infinity);
      if (model.charge) maximum = Infinity;
    }
    if (shop.some((reward) => reward.id === item.id)) maximum = Infinity;
    const duplicates = model.duplicates;
    const recipe = duplicates?.craftableItems?.includes(item.id) ?? item.weight > 0;
    if (options.craftPolicy === 'missing-targets' && duplicates?.craftCost && duplicates.overflow === 'salvage' && duplicates.salvagePerCopy > 0 && recipe) maximum = Infinity;
    if (duplicates) maximum = Math.min(maximum, duplicates.cap);
    bounds.set(item.id, maximum);
  }
  if (goal.type === 'targets' || goal.type === 'collection') {
    const targets = goal.type === 'targets' ? goal.targets : model.items.map((item) => ({ itemId: item.id, count: 1 }));
    for (const target of targets) if ((bounds.get(target.itemId) ?? 0) < target.count) reasons.push(`${target.itemId}: declared acquisition channels can retain at most ${bounds.get(target.itemId) ?? 0} copies; the goal needs ${target.count}.`);
  } else {
    const pool = featuredPool(model);
    const maximum = goal.type === 'unique-featured' ? pool.filter((item) => (bounds.get(item.id) ?? 0) > 0).length : pool.reduce((sum, item) => sum + (bounds.get(item.id) ?? 0), 0);
    const wanted = goal.type === 'first-featured' ? 1 : goal.count;
    if (maximum < wanted) reasons.push(`Featured rewards: declared acquisition channels can retain at most ${maximum}; the goal needs ${wanted}.`);
  }
  if (!reasons.length) unresolved.push('An acquisition channel exists. Counter interactions and the chosen horizon can still prevent completion.');
  return { definitelyImpossible: reasons.length > 0, reasons, unresolved };
}
