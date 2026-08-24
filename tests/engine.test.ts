import { describe, expect, it } from 'vitest';
import {
  createState,
  defaultGoal,
  featuredCount,
  mulberry32,
  pull,
  runMonteCarlo,
  runTrial,
  simulatePoolShare,
  runMonteCarloTwoPickup,
  type Banner,
} from '../src/engine/index.ts';
import {
  collectionHeat,
  crateLootbox,
  fateGrandOrder,
  genshinCharacter,
  hardPityBaseline,
  poolShare,
  audienceSpark,
  blueArchiveCharge,
  blueArchiveSpark,
} from '../src/presets/index.ts';
import { item } from '../src/presets/helpers.ts';

function banner(partial: Partial<Banner> & Pick<Banner, 'id' | 'rarities' | 'items'>): Banner {
  return {
    name: partial.id,
    family: 'studied',
    blurb: '',
    source: 'test',
    notes: [],
    pullCost: { amount: 1, currency: 't' },
    pity: [],
    ...partial,
  };
}

describe('rng', () => {
  it('replays the same stream from a seed', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
});

describe('hard pity', () => {
  it('forces the chase rarity on pull N when the base rate is 0', () => {
    const model = banner({
      id: 'pity-5',
      rarities: [
        { id: 'chase', name: 'Chase', baseRate: 0, color: '#000' },
        { id: 'junk', name: 'Junk', baseRate: 0, color: '#000' },
      ],
      pity: [{ rarity: 'chase', hardAt: 5 }],
      featured: { rarity: 'chase', chance: 1, capturing: false },
      items: [item('c', 'C', 'chase', 1, true), item('j', 'J', 'junk', 1)],
    });
    const rng = mulberry32(1);
    const state = createState(model);
    const rarities = [1, 2, 3, 4, 5].map(() => pull(model, state, rng).rarity);
    expect(rarities.slice(0, 4).every((id) => id === 'junk')).toBe(true);
    expect(rarities[4]).toBe('chase');
  });
});

describe('capturing featured', () => {
  it('arms after a lost featured roll and pays on the next hit', () => {
    const model = banner({
      id: 'cap',
      rarities: [
        { id: 'five', name: '5', baseRate: 1, color: '#000' },
        { id: 'three', name: '3', baseRate: 0, color: '#000' },
      ],
      featured: { rarity: 'five', chance: 0, capturing: true },
      items: [item('feat', 'F', 'five', 1, true), item('std', 'S', 'five', 1)],
    });
    const rng = mulberry32(3);
    const state = createState(model);
    const first = pull(model, state, rng);
    const second = pull(model, state, rng);
    expect(first.item.id).toBe('std');
    expect(first.featuredRoll).toBe('lost');
    expect(second.item.id).toBe('feat');
    expect(second.featuredRoll).toBe('guaranteed');
  });
});

describe('spark', () => {
  it('buys the featured at spark cost when the rate is 0', () => {
    const model = banner({
      id: 'spark-10',
      rarities: [
        { id: 'five', name: '5', baseRate: 0, color: '#000' },
        { id: 'three', name: '3', baseRate: 0, color: '#000' },
      ],
      spark: { cost: 10 },
      featured: { rarity: 'five', chance: 1, capturing: false },
      items: [item('feat', 'F', 'five', 1, true), item('junk', 'J', 'three', 1)],
    });
    const result = runTrial(model, { type: 'first-featured' }, mulberry32(9), 'if-needed');
    expect(result.sparked).toBe(true);
    expect(result.pulls).toBe(10);
    expect(result.featuredCount).toBe(1);
  });

  it('never sparks when policy is never', () => {
    const model = banner({
      id: 'spark-never',
      rarities: [
        { id: 'five', name: '5', baseRate: 0, color: '#000' },
        { id: 'three', name: '3', baseRate: 0, color: '#000' },
      ],
      pity: [{ rarity: 'five', hardAt: 20 }],
      spark: { cost: 10 },
      featured: { rarity: 'five', chance: 1, capturing: false },
      items: [item('feat', 'F', 'five', 1, true), item('junk', 'J', 'three', 1)],
    });
    const result = runTrial(model, { type: 'first-featured' }, mulberry32(2), 'never');
    expect(result.sparked).toBe(false);
    expect(result.pulls).toBe(20);
  });
});

describe('studied presets', () => {
  it('Genshin-like 5-star mean sits in the community 55-70 window', () => {
    const untilFive: Banner = {
      ...genshinCharacter,
      id: 'gi-five',
      featured: { rarity: 'five', chance: 1, capturing: false },
      spark: undefined,
    };
    const report = runMonteCarlo(untilFive, { type: 'first-featured' }, 4000, 42, 'never');
    expect(report.pulls.mean).toBeGreaterThan(55);
    expect(report.pulls.mean).toBeLessThan(70);
    expect(report.pulls.max).toBeLessThanOrEqual(90);
  });

  it('Genshin-like featured with 50/50 lands near 1.5x a raw 5-star', () => {
    const report = runMonteCarlo(genshinCharacter, { type: 'first-featured' }, 3000, 7, 'never');
    expect(report.pulls.mean).toBeGreaterThan(80);
    expect(report.pulls.mean).toBeLessThan(110);
  });

  it('FGO-like featured never exceeds 330 summons', () => {
    const report = runMonteCarlo(fateGrandOrder, { type: 'first-featured' }, 1500, 11, 'never');
    expect(report.pulls.max).toBeLessThanOrEqual(330);
    expect(report.pulls.mean).toBeGreaterThan(80);
    expect(report.pulls.mean).toBeLessThan(180);
  });

  it('independent crate mean is near 1/p with a long tail', () => {
    const report = runMonteCarlo(crateLootbox, { type: 'first-featured' }, 2500, 5, 'never');
    expect(report.pulls.mean).toBeGreaterThan(130);
    expect(report.pulls.mean).toBeLessThan(190);
    expect(report.pulls.p95).toBeGreaterThan(report.pulls.mean * 1.5);
  });

  it('1% + pity 100 has a mean below the no-pity 100', () => {
    const report = runMonteCarlo(hardPityBaseline, { type: 'first-featured' }, 4000, 21, 'never');
    expect(report.pulls.mean).toBeGreaterThan(50);
    expect(report.pulls.mean).toBeLessThan(95);
    expect(report.pulls.max).toBeLessThanOrEqual(100);
  });
});

describe('original mechanics', () => {
  it('collection heat finishes an album faster than the same pool without heat', () => {
    const cold: Banner = { ...collectionHeat, id: 'cold', mechanics: { collectionHeat: 0 } };
    const hot = runMonteCarlo(collectionHeat, { type: 'collection' }, 800, 99, 'never');
    const plain = runMonteCarlo(cold, { type: 'collection' }, 800, 99, 'never');
    expect(hot.pulls.mean).toBeLessThan(plain.pulls.mean);
  });

  it('pool share produces more featured hits than fragmented solo cycles', () => {
    const report = simulatePoolShare(poolShare, 4, 90, 600, 13);
    expect(report.sharedFeatured.mean).toBeGreaterThan(report.soloFeatured.mean);
    expect(report.leftoverPityWasteSolo.mean).toBeGreaterThan(0);
  });

  it('audience spark buys the featured near 144 pulls when the rate is 0', () => {
    const dry: Banner = {
      ...audienceSpark,
      id: 'aud-dry',
      rarities: audienceSpark.rarities.map((rarity) =>
        rarity.id === 'five' ? { ...rarity, baseRate: 0 } : rarity,
      ),
      pity: [],
    };
    const result = runTrial(dry, { type: 'first-featured' }, mulberry32(1), 'if-needed');
    expect(result.sparked).toBe(true);
    expect(result.pulls).toBe(144);
  });
});

describe('default goal', () => {
  it('picks collection for heat albums and first-featured otherwise', () => {
    expect(defaultGoal(collectionHeat).type).toBe('collection');
    expect(defaultGoal(genshinCharacter).type).toBe('first-featured');
  });
});

describe('inventory', () => {
  it('counts featured copies from inventory', () => {
    const rng = mulberry32(4);
    const state = createState(hardPityBaseline);
    for (let i = 0; i < 100; i++) pull(hardPityBaseline, state, rng);
    expect(featuredCount(hardPityBaseline, state)).toBeGreaterThanOrEqual(1);
  });
});

describe('recruitment charge', () => {
  const dryCharge = banner({
    id: 'charge-dry',
    rarities: [
      { id: 'three', name: '3', baseRate: 0, color: '#000' },
      { id: 'one', name: '1', baseRate: 0, color: '#000' },
    ],
    featured: { rarity: 'three', chance: 0, capturing: false },
    charge: { midAt: 100, midFeaturedChance: 0, hardAt: 200 },
    items: [item('pu', 'PU', 'three', 1, true), item('off', 'Off', 'three', 1), item('j', 'J', 'one', 1)],
  });

  it('forces a 3-star at 100 that can miss the pickup, then forces pickup at 200', () => {
    const rng = mulberry32(1);
    const state = createState(dryCharge);
    const tape = [];
    for (let i = 0; i < 200; i++) tape.push(pull(dryCharge, state, rng));
    expect(tape[99]?.rarity).toBe('three');
    expect(tape[99]?.item.id).toBe('off');
    expect(tape[99]?.featuredRoll).toBe('lost');
    expect(tape[199]?.item.id).toBe('pu');
    expect(tape.slice(0, 99).every((row) => row.item.id === 'j')).toBe(true);
  });

  it('gives the pickup at 100 when the mid coin is 100%', () => {
    const hot = banner({
      ...dryCharge,
      id: 'charge-hot',
      charge: { midAt: 100, midFeaturedChance: 1, hardAt: 200 },
    });
    const result = runTrial(hot, { type: 'first-featured' }, mulberry32(3), 'never');
    expect(result.pulls).toBe(100);
    expect(result.featuredCount).toBe(1);
  });

  it('does not reset charge on an off-banner 3-star', () => {
    const alwaysThree = banner({
      id: 'charge-off',
      rarities: [
        { id: 'three', name: '3', baseRate: 1, color: '#000' },
        { id: 'one', name: '1', baseRate: 0, color: '#000' },
      ],
      featured: { rarity: 'three', chance: 0, capturing: false },
      charge: { midAt: 100, midFeaturedChance: 0, hardAt: 200 },
      items: [item('pu', 'PU', 'three', 1, true), item('off', 'Off', 'three', 1)],
    });
    const rng = mulberry32(8);
    const state = createState(alwaysThree);
    pull(alwaysThree, state, rng);
    expect(state.owned.has('off')).toBe(true);
    expect(state.sinceFeatured).toBe(1);
  });

  it('resets charge when the pickup lands', () => {
    const alwaysPu = banner({
      id: 'charge-hit',
      rarities: [
        { id: 'three', name: '3', baseRate: 1, color: '#000' },
        { id: 'one', name: '1', baseRate: 0, color: '#000' },
      ],
      featured: { rarity: 'three', chance: 1, capturing: false },
      charge: { midAt: 100, midFeaturedChance: 0.5, hardAt: 200 },
      items: [item('pu', 'PU', 'three', 1, true), item('off', 'Off', 'three', 1)],
    });
    const rng = mulberry32(2);
    const state = createState(alwaysPu);
    pull(alwaysPu, state, rng);
    expect(state.owned.has('pu')).toBe(true);
    expect(state.sinceFeatured).toBe(0);
  });
});

describe('Blue Archive-like presets', () => {
  it('spark first-pickup mean sits under 200 and below a raw 1/0.007 geometric', () => {
    const report = runMonteCarlo(blueArchiveSpark, { type: 'first-featured' }, 2500, 17, 'if-needed');
    expect(report.pulls.mean).toBeGreaterThan(80);
    expect(report.pulls.mean).toBeLessThan(160);
    expect(report.pulls.max).toBeLessThanOrEqual(200);
  });

  it('charge first-pickup never exceeds 200', () => {
    const report = runMonteCarlo(blueArchiveCharge, { type: 'first-featured' }, 2500, 19, 'never');
    expect(report.pulls.max).toBeLessThanOrEqual(200);
    expect(report.pulls.mean).toBeGreaterThan(70);
    expect(report.pulls.mean).toBeLessThan(150);
  });

  it('an early first pickup still caps spark-both at 200; charge can walk a second 200', () => {
    const spark = runMonteCarloTwoPickup(blueArchiveSpark, 1500, 23, 'if-needed');
    const charge = runMonteCarloTwoPickup(blueArchiveCharge, 1500, 23, 'never');
    expect(spark.earlyBoth.n).toBeGreaterThan(50);
    expect(charge.earlyBoth.n).toBeGreaterThan(50);
    expect(spark.earlyBoth.max).toBeLessThanOrEqual(200);
    expect(charge.earlyBoth.max).toBeGreaterThan(200);
    expect(charge.earlyBoth.p90).toBeGreaterThan(spark.earlyBoth.p90);
  });
});
