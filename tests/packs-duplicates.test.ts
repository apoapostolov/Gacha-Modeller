import { describe, expect, it } from 'vitest';
import { createState, pull, pullPack, runTrial, mulberry32, validateBanner, craftIfReady, sparkIfReady, type Banner } from '../src/engine/index.ts';

function cards(): Banner {
  return { id: 'cards', name: 'Card fixture', family: 'original', source: 'original', blurb: '', notes: [], pullCost: { amount: 1, currency: 'ticket' },
    rarities: [{ id: 'card', name: 'Card', baseRate: 0, color: '#fff' }], pity: [],
    items: ['a','b','c','d'].map((id) => ({ id, name: id, rarity: 'card', weight: 1 })) };
}
describe('declared pack layouts and correlations', () => {
  it('grants fixed-slot quantities while purchasing every slot and recording early attainment', () => {
    const model = cards(); model.multiPull = { size: 3, slots: [{ itemId: 'a', quantity: 2 }, { itemId: 'b', quantity: 1 }, { itemId: 'c', quantity: 1 }] };
    const result = runTrial(model, { type: 'targets', targets: [{ itemId: 'a', count: 2 }] }, mulberry32(42), 'never', { actionMode: 'pack', maxPulls: 3 });
    expect(result).toMatchObject({ goalAchieved: true, attainmentPulls: 1, pulls: 3, cost: 3, inventory: { a: 2, b: 1, c: 1 } });
  });
  it('samples weighted cards without replacement within each purchased pack', () => {
    const model = cards(); model.multiPull = { size: 4, sampling: 'without-replacement' };
    const state = createState(model);
    expect(new Set(pullPack(model, state, mulberry32(4)).map((outcome) => outcome.item.id)).size).toBe(4);
    expect(new Set(pullPack(model, state, mulberry32(5)).map((outcome) => outcome.item.id)).size).toBe(4);
    expect(Object.values(state.inventory)).toEqual([2,2,2,2]);
  });
  it('executes shared-item packs as one selection and repeated paid grants', () => {
    const model = cards(); model.multiPull = { size: 3, correlation: 'shared-item' };
    const state = createState(model); const outcomes = pullPack(model, state, mulberry32(1));
    expect(new Set(outcomes.map((outcome) => outcome.item.id)).size).toBe(1);
    expect(state.inventory[outcomes[0]!.item.id]).toBe(3);
    expect(state.totalPulls).toBe(3);
  });
  it('rejects ambiguous protected no-replacement pools and incompatible correlations', () => {
    const model = cards(); model.multiPull = { size: 5, sampling: 'without-replacement' };
    expect(validateBanner(model).valid).toBe(false);
    model.multiPull.size = 3; model.multiPull.correlation = 'shared-item';
    expect(validateBanner(model).valid).toBe(false);
    model.multiPull.correlation = 'independent'; model.featured = { rarity: 'card', chance: 1, capturing: false }; model.items[0]!.featured = true;
    expect(validateBanner(model).errors.some((issue) => issue.path === 'multiPull.sampling')).toBe(true);
  });
});

describe('duplicate and crafting conservation', () => {
  it('protects eligible items until the bucket is full, then salvages overflow', () => {
    const model = cards(); model.items = model.items.slice(0, 2);
    model.duplicates = { cap: 1, protection: 'same-rarity', overflow: 'salvage', salvagePerCopy: 3 };
    const state = createState(model);
    expect(pull(model, state, () => 0).item.id).toBe('a');
    expect(pull(model, state, () => 0)).toMatchObject({ item: { id: 'b' }, redirectedFrom: 'a' });
    expect(pull(model, state, () => 0)).toMatchObject({ accepted: 0, salvage: 3 });
    expect(state.inventory).toEqual({ a: 1, b: 1 }); expect(state.salvage).toBe(3);
  });
  it('conserves quantity overflow and recipe spending without resetting protection', () => {
    const model = cards(); model.duplicates = { cap: 1, protection: 'none', overflow: 'salvage', salvagePerCopy: 3, craftCost: 6, craftableItems: ['c'] };
    model.multiPull = { size: 1, slots: [{ itemId: 'a', quantity: 3 }] };
    const state = createState(model); state.featuredArmed = true;
    expect(pullPack(model, state, mulberry32(1))[0]).toMatchObject({ quantity: 3, accepted: 1, salvage: 6 });
    state.counters.card = 12;
    expect(craftIfReady(model, state, 'c')?.item.id).toBe('c');
    expect(state).toMatchObject({ salvage: 0, salvageEarned: 6, salvageSpent: 6, crafted: 1, featuredArmed: true, counters: { card: 12 } });
    expect(craftIfReady(model, state, 'c')).toBeNull();
  });
  it('reaches a zero-weight recipe target and settles crafting at the final horizon', () => {
    const model = cards(); model.items.forEach((item) => { item.weight = item.id === 'a' ? 1 : 0; });
    model.duplicates = { cap: 1, protection: 'none', overflow: 'salvage', salvagePerCopy: 2, craftCost: 4, craftableItems: ['c'] };
    const result = runTrial(model, { type: 'targets', targets: [{ itemId: 'c', count: 1 }] }, mulberry32(3), 'never', { maxPulls: 3, craftPolicy: 'missing-targets' });
    expect(result).toMatchObject({ goalAchieved: true, pulls: 3, inventory: { a: 1, c: 1 }, salvageEarned: 4, salvageSpent: 4, crafted: 1 });
  });
  it('reports a target above its copy cap as impossible before buying', () => {
    const model = cards(); model.duplicates = { cap: 1, protection: 'none', overflow: 'discard', salvagePerCopy: 0 };
    expect(runTrial(model, { type: 'targets', targets: [{ itemId: 'a', count: 2 }] }, mulberry32(42), 'never')).toMatchObject({ termination: 'impossible', pulls: 0 });
  });
  it('exchanges into remaining capacity when the first shop item is capped', () => {
    const model = cards(); model.spark = { cost: 1, items: ['a', 'b'] };
    model.duplicates = { cap: 2, protection: 'none', overflow: 'discard', salvagePerCopy: 0 };
    const state = createState(model); state.inventory.a = 2; state.inventory.b = 1; state.owned = new Set(['a', 'b']); state.sparkProgress = 1;
    expect(sparkIfReady(model, state)?.item.id).toBe('b');
    expect(state.inventory.b).toBe(2);
  });

});
