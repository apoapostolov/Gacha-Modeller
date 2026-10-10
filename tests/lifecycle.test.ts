import { describe, expect, it } from 'vitest';
import { createState, pull, sparkIfReady, runTrial, mulberry32, type Banner } from '../src/engine/index.ts';
import { transitionState } from '../src/engine/lifecycle.ts';
import { hardPityBaseline } from '../src/presets/index.ts';

const base = (): Banner => structuredClone(hardPityBaseline);
describe('protection scopes and transition matrices', () => {
  it('stores banner-local pity and restores it on return without leaking to another banner', () => {
    const a = base(); const b = { ...base(), id: 'other' };
    const state = createState(a); state.counters.chase = 40;
    const next = transitionState(a, b, state, { type: 'banner-switch' });
    expect(next.counters.chase).toBe(0);
    const restored = transitionState(b, a, next, { type: 'banner-switch' });
    expect(restored.counters.chase).toBe(40);
    expect(state.counters.chase).toBe(40);
  });
  it('shares named-family pity, but resets capture at the declared season boundary', () => {
    const a = base();
    a.persistence = { familyId: 'character', rarityCounters: { scope: 'family', bannerSwitch: 'retain', season: 'retain', targetSwitch: 'retain' } };
    const b = { ...structuredClone(a), id: 'other' };
    const state = createState(a); state.counters.chase = 70; state.featuredArmed = true;
    const switched = transitionState(a, b, state, { type: 'banner-switch' });
    expect(switched.counters.chase).toBe(70);
    const seasonal = transitionState(b, b, switched, { type: 'season', seasonId: 'season-2' });
    expect(seasonal.counters.chase).toBe(70);
    expect(seasonal.featuredArmed).toBe(false);
  });

  it('clears a selected target that is no longer eligible after switching banners', () => {
    const a = base(); const b = { ...base(), id: 'other' };
    b.items[0]!.weight = 0; b.items.push({ id: 'new', name: 'New chase', rarity: 'chase', featured: true, weight: 1 });
    const switched = transitionState(a, b, createState(a, 'chase'), { type: 'banner-switch' });
    expect(switched.targetId).toBeUndefined();
  });
  it('does not restore stale seasonal progress from a dormant banner', () => {
    const a = base(); const b = { ...base(), id: 'other' };
    const state = createState(a); state.counters.chase = 40;
    const next = transitionState(a, b, state, { type: 'banner-switch' });
    const seasonal = transitionState(b, b, next, { type: 'season', seasonId: 'next' });
    expect(transitionState(b, a, seasonal, { type: 'banner-switch' }).counters.chase).toBe(0);
  });
});

describe('selected targets and one-time guarantees', () => {
  it('grants the selected target at its checkpoint, once, without exchange rearming', () => {
    const model = base(); model.rarities[0]!.baseRate = 0; model.pity = [];
    model.targetRule = { hardAt: 3, once: true };
    model.items.push({ id: 'other', name: 'Other chase', rarity: 'chase', weight: 1, featured: true });
    model.spark = { cost: 1, choice: 'selected' };
    const state = createState(model, 'other');
    pull(model, state, () => .9); pull(model, state, () => .9);
    expect(pull(model, state, () => .9).item.id).toBe('other');
    expect(state.onceGuaranteeUsed).toBe(true);
    sparkIfReady(model, state, 'chase');
    expect(state.onceGuaranteeUsed).toBe(true);
    for (let i = 0; i < 6; i++) expect(pull(model, state, () => .9).item.id).toBe('junk');
  });
  it('pursues named copies rather than any featured reward', () => {
    const model = base(); model.targetRule = { hardAt: 2, once: false };
    model.items.push({ id: 'other', name: 'Other chase', rarity: 'chase', weight: 1, featured: true });
    const result = runTrial(model, { type: 'targets', targets: [{ itemId: 'other', count: 2 }] }, mulberry32(42), 'never', { targetId: 'other', maxPulls: 20 });
    expect(result.goalAchieved).toBe(true);
    expect(result.inventory.other).toBe(2);
    expect(result.pulls).toBeLessThanOrEqual(4);
  });
  it('applies scheduled target/season changes between complete actions and accumulates active prices', () => {
    const model = base(); model.multiPull = { size: 10 };
    const next = { ...base(), id: 'new-banner', pullCost: { amount: 2, currency: 'ticket' }, multiPull: { size: 10 } };
    const result = runTrial(model, { type: 'budget', pulls: 20 }, mulberry32(42), 'never', { maxPulls: 20, actionMode: 'pack', transitions: [{ atPull: 5, type: 'banner-switch', model: next }] });
    expect(result.pulls).toBe(20);
    expect(result.cost).toBe(30);
  });
  it('validates selected shops on embedded destinations before purchasing', () => {
    const model = base(); const next = { ...base(), id: 'shop', spark: { cost: 1, choice: 'selected' as const } };
    expect(() => runTrial(model, { type: 'budget', pulls: 10 }, mulberry32(1), 'if-needed', { transitions: [{ atPull: 2, type: 'banner-switch', model: next }] })).toThrow(/exchangeItemId/);
  });

});
