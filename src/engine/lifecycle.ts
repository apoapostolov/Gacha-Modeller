import type { Banner, PersistenceRule, ProtectionField, PullState, ScopedValue, Transition } from './types.ts';
import { assertValidBanner } from './validation.ts';

export const PROTECTION_FIELDS: ProtectionField[] = ['rarityCounters', 'featuredArmed', 'sinceFeatured', 'sparkProgress', 'targetProgress', 'onceGuaranteeUsed'];
export function persistenceRule(model: Banner, field: ProtectionField): PersistenceRule {
  return model.persistence?.[field] ?? { scope: 'banner', bannerSwitch: 'retain', season: field === 'onceGuaranteeUsed' ? 'retain' : 'reset', targetSwitch: field === 'targetProgress' ? 'reset' : 'retain' };
}
function key(model: Banner, field: ProtectionField): string {
  const scope = persistenceRule(model, field).scope;
  return `${field}:${scope}:${scope === 'account' ? '*' : scope === 'family' ? model.persistence!.familyId! : model.id}`;
}
function value(state: PullState, field: ProtectionField): ScopedValue['value'] { return field === 'rarityCounters' ? state.counters : state[field]; }
function empty(field: ProtectionField): ScopedValue['value'] { return field === 'rarityCounters' ? {} : field === 'featuredArmed' || field === 'onceGuaranteeUsed' ? false : 0; }

/** Inventory and purchased pulls persist. Protection follows the destination's declared matrix. */
export function transitionState(from: Banner, to: Banner, state: PullState, event: Transition): PullState {
  assertValidBanner(from); assertValidBanner(to);
  if (state.context.bannerId !== from.id) throw new Error('transition: Source model does not match player context.');
  if (!['banner-switch','season','target-switch'].includes(event.type)) throw new Error('transition.type: Unsupported transition.');
  if (event.type === 'season' && (!event.seasonId?.trim() || event.seasonId === state.context.seasonId)) throw new Error('transition.seasonId: Choose a different named season.');
  if (event.type === 'target-switch' && !to.items.some((item) => item.id === event.targetId && item.featured && item.weight > 0 && (!to.featured || to.featured.rarity === item.rarity))) throw new Error('transition.targetId: Choose an eligible featured item.');
  const next = structuredClone(state);
  next.inventory = Object.assign(Object.create(null), next.inventory);
  for (const field of PROTECTION_FIELDS) next.scoped[key(from, field)] = { value: structuredClone(value(state, field)), seasonId: state.context.seasonId, targetId: state.targetId };
  const seasonId = event.type === 'season' ? event.seasonId! : state.context.seasonId;
  const targetId = event.type === 'target-switch' ? event.targetId : event.type === 'banner-switch' && !to.items.some((i) => i.id === state.targetId && i.featured && i.weight > 0 && (!to.featured || to.featured.rarity === i.rarity)) ? undefined : state.targetId;
  next.context = { bannerId: to.id, familyId: to.persistence?.familyId ?? to.id, seasonId, targetId };
  next.targetId = targetId;
  for (const field of PROTECTION_FIELDS) {
    const rule = persistenceRule(to, field);
    const saved = next.scoped[key(to, field)];
    const reset = rule[event.type === 'season' ? 'season' : event.type === 'target-switch' ? 'targetSwitch' : 'bannerSwitch'] === 'reset'
      || (saved && rule.season === 'reset' && saved.seasonId !== seasonId)
      || (saved && rule.targetSwitch === 'reset' && saved.targetId !== targetId);
    const restored = !reset && saved ? structuredClone(saved.value) : empty(field);
    if (field === 'rarityCounters') next.counters = Object.fromEntries(to.rarities.map((r) => [r.id, Object.hasOwn(restored as object, r.id) ? (restored as Record<string, number>)[r.id] : 0]));
    else if (field === 'featuredArmed' || field === 'onceGuaranteeUsed') next[field] = restored as boolean;
    else next[field] = restored as number;
    next.scoped[key(to, field)] = { value: structuredClone(value(next, field)), seasonId, targetId };
  }
  return next;
}
