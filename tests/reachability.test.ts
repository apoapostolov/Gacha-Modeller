import { describe, expect, it } from 'vitest';
import { diagnoseGoal } from '../src/engine/reachability.ts';
import { hardPityBaseline } from '../src/presets/index.ts';

describe('conservative acquisition diagnostics', () => {
  it('proves that a fixed layout cannot grant an omitted positive-weight target', () => {
    const model = structuredClone(hardPityBaseline); model.multiPull = { size: 2, slots: [{ itemId: 'junk', quantity: 1 }, { itemId: 'junk', quantity: 1 }] };
    const diagnosis = diagnoseGoal(model, { type: 'targets', targets: [{ itemId: 'chase', count: 1 }] }, 'never', { actionMode: 'pack' });
    expect(diagnosis.definitelyImpossible).toBe(true);
    expect(diagnosis.reasons.join(' ')).toContain('chase');
  });
  it('bounds a zero-rate one-time guarantee to one retained copy', () => {
    const model = structuredClone(hardPityBaseline); model.pity = []; model.rarities[0]!.baseRate = 0;
    model.featured = { rarity: 'chase', chance: 1, capturing: false, hardAt: 3, once: true };
    expect(diagnoseGoal(model, { type: 'copies', count: 2 }, 'never', {}).definitelyImpossible).toBe(true);
    expect(diagnoseGoal(model, { type: 'copies', count: 1 }, 'never', {}).definitelyImpossible).toBe(false);
  });
  it('respects a selected shop reward rather than claiming access to every reward', () => {
    const model = structuredClone(hardPityBaseline); model.pity = []; model.rarities[0]!.baseRate = 0;
    model.items.push({ id: 'b', name: 'Second reward', rarity: 'chase', featured: true, weight: 1 }); model.spark = { cost: 3, choice: 'selected' };
    expect(diagnoseGoal(model, { type: 'targets', targets: [{ itemId: 'b', count: 1 }] }, 'if-needed', { exchangeItemId: 'chase' }).definitelyImpossible).toBe(true);
  });
  it('allows repeated unselected hard guarantees to visit more than one featured item', () => {
    const model = structuredClone(hardPityBaseline); model.pity = []; model.rarities[0]!.baseRate = 0;
    model.featured!.hardAt = 3; model.items.push({ id: 'b', name: 'b', rarity: 'chase', featured: true, weight: 1 });
    expect(diagnoseGoal(model, { type: 'unique-featured', count: 2 }, 'never', {}).definitelyImpossible).toBe(false);
  });

  it('allows a one-time forced reward to grant an ordinary slot quantity', () => {
    const model = structuredClone(hardPityBaseline); model.pity = []; model.rarities[0]!.baseRate = 0;
    model.featured = { rarity: 'chase', chance: 1, capturing: false, hardAt: 3, once: true };
    model.multiPull = { size: 1, slots: [{ quantity: 3 }] };
    expect(diagnoseGoal(model, { type: 'copies', count: 2 }, 'never', { actionMode: 'pack' }).definitelyImpossible).toBe(false);
  });

});
