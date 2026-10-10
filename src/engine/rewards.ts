import { eventRng, weightedPick, type Rng } from './rng.ts';
import type { Banner, PoolItem, PullOutcome, PullState } from './types.ts';

/** Copy grants and overflow conserve inventory and shards; shops/crafts keep draw protection. */
export function grantReward(banner: Banner, state: PullState, selected: PoolItem, quantity = 1, resetDrawProtection = true, rng?: Rng): Pick<PullOutcome, 'item' | 'quantity' | 'accepted' | 'salvage' | 'redirectedFrom'> {
  let item = selected;
  const rule = banner.duplicates;
  if (rule?.protection === 'same-rarity' && resetDrawProtection && (state.inventory[item.id] ?? 0) >= rule.cap) {
    const alternatives = banner.items.filter((i) => i.rarity === item.rarity && !!i.featured === !!item.featured && i.weight > 0 && (state.inventory[i.id] ?? 0) < rule.cap);
    if (alternatives.length) item = weightedPick(alternatives, alternatives.map((i) => i.weight), eventRng(rng!, `pull:${state.totalPulls}:duplicate`));
  }
  const before = state.inventory[item.id] ?? 0;
  const accepted = rule ? Math.min(quantity, Math.max(0, rule.cap - before)) : quantity;
  const salvage = rule?.overflow === 'salvage' ? (quantity - accepted) * rule.salvagePerCopy : 0;
  state.duplicateCount += before > 0 ? quantity : Math.max(0, quantity - 1);
  if (accepted > 0) { state.inventory[item.id] = before + accepted; state.owned.add(item.id); }
  state.salvage += salvage; state.salvageEarned += salvage;
  const chase = banner.featured?.rarity;
  if (resetDrawProtection && item.featured && (!chase || item.rarity === chase)) state.sinceFeatured = 0;
  if (resetDrawProtection && item.id === state.targetId) state.targetProgress = 0;
  return { item, quantity, accepted, salvage, ...(item.id !== selected.id ? { redirectedFrom: selected.id } : {}) };
}

export function craftIfReady(banner: Banner, state: PullState, itemId: string): PullOutcome | null {
  const rule = banner.duplicates;
  if (!rule?.craftCost) return null;
  const item = banner.items.find((i) => i.id === itemId && (rule.craftableItems ? rule.craftableItems.includes(i.id) : i.weight > 0));
  if (!item) throw new Error('craftItemId: Choose a declared recipe reward.');
  if (state.salvage < rule.craftCost || (state.inventory[item.id] ?? 0) >= rule.cap) return null;
  const reward = grantReward(banner, state, item, 1, false);
  state.salvage -= rule.craftCost; state.salvageSpent += rule.craftCost; state.crafted++;
  return { ...reward, rarity: item.rarity, pityKind: 'none', crafted: true };
}
