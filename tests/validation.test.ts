import { describe, expect, it } from 'vitest';
import { validateBanner, assertValidBanner } from '../src/engine/validation.ts';
import { PRESETS } from '../src/presets/index.ts';
import { hardPityBaseline, genshinCharacter } from '../src/presets/index.ts';

describe('model validation', () => {
  it('accepts all existing presets without changing them', () => {
    for (const model of PRESETS) expect(validateBanner(model).errors).toEqual([]);
  });

  it.each([null, {}, { rarities: 'bad', items: [null], pity: 1 }])(
    'returns diagnostics for malformed imported data: %j',
    (input) => expect(validateBanner(input).valid).toBe(false),
  );

  it.each([-0.1, 1.1, NaN, Infinity])('rejects invalid probability %s', (rate) => {
    const model = { ...hardPityBaseline, rarities: hardPityBaseline.rarities.map((r, i) =>
      i === 0 ? { ...r, baseRate: rate } : r) };
    expect(validateBanner(model).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'rarities[0].baseRate' }),
    ]));
  });

  it('rejects duplicate item IDs, negative weights and unknown rarity references', () => {
    const model = { ...hardPityBaseline, items: [
      ...hardPityBaseline.items,
      { ...hardPityBaseline.items[0]!, rarity: 'missing', weight: -1 },
    ] };
    const paths = validateBanner(model).errors.map((issue) => issue.path);
    expect(paths).toEqual(expect.arrayContaining(['items[2].id', 'items[2].weight', 'items[2].rarity']));
  });

  it('rejects missing reachable pools and zero total selection weights', () => {
    expect(validateBanner({ ...hardPityBaseline, items: [] }).valid).toBe(false);
    expect(validateBanner({ ...hardPityBaseline,
      items: hardPityBaseline.items.map((i) => ({ ...i, weight: 0 })) }).valid).toBe(false);
  });

  it('rejects invalid pity, reset references and pack guarantees', () => {
    const model = { ...hardPityBaseline,
      pity: [{ rarity: 'five', hardAt: 0, resetAlso: ['missing'] }],
      multiPull: { size: 0, guaranteeRarity: 'missing' },
    };
    const paths = validateBanner(model).errors.map((issue) => issue.path);
    expect(paths).toEqual(expect.arrayContaining([
      'pity[0].hardAt', 'pity[0].resetAlso[0]', 'multiPull.size', 'multiPull.guaranteeRarity',
    ]));
  });

  it('rejects ranked base probability mass above one', () => {
    const model = { ...genshinCharacter, rarities: genshinCharacter.rarities.map((r, i) =>
      i < 2 ? { ...r, baseRate: 0.6 } : r) };
    expect(validateBanner(model).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'rarities', code: 'probability-mass' }),
    ]));
  });

  it('reports legacy priority selection and warns about soft rate overlap', () => {
    const result = validateBanner(genshinCharacter);
    expect(result.rarityPolicy).toBe('priority');
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'soft-rate-overlap' }),
    ]));
  });

  it('throws field-specific errors at the engine boundary', () => {
    expect(() => assertValidBanner({ ...hardPityBaseline, pullCost: { amount: -1, currency: '' } }))
      .toThrow(/pullCost.amount/);
  });
});
