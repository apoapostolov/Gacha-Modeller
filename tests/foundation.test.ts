import { describe, expect, it } from 'vitest';
import { createState, mulberry32, pullPack, runMonteCarlo, runTrial, simulatePoolShare, sparkIfReady, type Banner } from '../src/engine/index.ts';
import { hardPityBaseline } from '../src/presets/index.ts';

const dry: Banner = {
  ...hardPityBaseline,
  id: 'dry',
  rarities: hardPityBaseline.rarities.map((r) => ({ ...r, baseRate: 0 })),
  pity: [],
  featured: { ...hardPityBaseline.featured!, chance: 1, capturing: false },
};

describe('trial evidence', () => {
  it('reports impossible targets without consuming a trial horizon', () => {
    const row = runTrial(dry, { type: 'first-featured' }, mulberry32(1), 'never');
    expect(row).toMatchObject({ goalAchieved: false, termination: 'impossible', pulls: 0, attainmentPulls: null });
  });
  it('distinguishes horizon attempts from completed acquisitions', () => {
    const row = runTrial(hardPityBaseline, { type: 'first-featured' }, () => 0.999, 'never', { maxPulls: 9 });
    expect(row).toMatchObject({ goalAchieved: false, termination: 'horizon', pulls: 9, attainmentPulls: null });
  });
  it('can exchange at the exact final pull of a horizon', () => {
    const row = runTrial({ ...dry, spark: { cost: 10 } }, { type: 'first-featured' }, mulberry32(2), 'if-needed', { maxPulls: 10 });
    expect(row).toMatchObject({ goalAchieved: true, termination: 'goal', pulls: 10, attainmentPulls: 10, sparked: true });
  });
  it('leaves population quantiles unavailable when the required fraction does not finish', () => {
    const report = runMonteCarlo(hardPityBaseline, { type: 'first-featured' }, 100, 7, 'never', { maxPulls: 1 });
    expect(report.attainmentRate).toBeLessThan(0.5);
    expect(report.acquisitionQuantiles.p50).toBeNull();
    expect(report.completedPulls?.n ?? 0).toBeLessThan(report.trials);
    expect(report.pulls.n).toBe(100);
    expect(report.terminations.horizon).toBe(100 - (report.completedPulls?.n ?? 0));
  });
  it('validates model and run settings at public simulation boundaries', () => {
    expect(() => runMonteCarlo(hardPityBaseline, { type: 'first-featured' }, 0, 1)).toThrow(/trials/);
    expect(() => runTrial({ ...dry, pullCost: { amount: -1, currency: 'x' } }, { type: 'budget', pulls: 1 }, mulberry32(1))).toThrow(/pullCost/);
  });
  it.each([-1, 4294967296, 1.5, NaN])('rejects invalid seed %s rather than silently coercing it', (seed) => {
    expect(() => runMonteCarlo(hardPityBaseline, { type: 'budget', pulls: 1 }, 1, seed)).toThrow(/seed/);
  });
  it.each([0, -1, 100001, 1.5, NaN])('rejects invalid horizon %s', (maxPulls) => {
    expect(() => runTrial(dry, { type: 'budget', pulls: 1 }, mulberry32(1), 'never', { maxPulls })).toThrow(/maxPulls/);
  });
  it('rejects pack mode without a declared pack and validates social run bounds', () => {
    expect(() => runTrial({ ...dry, multiPull: undefined }, { type: 'budget', pulls: 1 }, mulberry32(1), 'never', { actionMode: 'pack' })).toThrow(/pack rule/);
    expect(() => simulatePoolShare(dry, 0, 90, 1, 1)).toThrow(/players/);
    expect(() => simulatePoolShare(dry, 4, 100000, 1, 1)).toThrow(/budgetPerPlayer/);
  });
  it('replays an identical self-contained result bundle', () => {
    const report = runMonteCarlo(hardPityBaseline, { type: 'first-featured' }, 50, 11, 'never', { maxPulls: 30 });
    expect(report).toEqual(runMonteCarlo(report.manifest.model, report.goal, report.trials, report.seed, report.sparkPolicy, report.manifest.options));
    expect(report.manifest.model).not.toBe(hardPityBaseline);
  });
  it('rejects unique targets above the pool size', () => {
    expect(runTrial(hardPityBaseline, { type: 'unique-featured', count: 2 }, mulberry32(1)).termination).toBe('impossible');
  });
  it('reports no conditional summary when nobody finishes', () => {
    const report = runMonteCarlo(dry, { type: 'first-featured' }, 5, 3, 'never');
    expect(report.completedPulls).toBeNull();
    expect(report.acquisitionQuantiles).toEqual({ p50: null, p90: null, p95: null });
    expect(report.terminations.impossible).toBe(5);
  });
});

describe('exchange effects', () => {
  it('never grants a free exchange from an empty bar, even for a small fractional price', () => {
    const model = { ...dry, spark: { cost: 1e-10 } };
    expect(sparkIfReady(model, createState(model))).toBeNull();
  });
  it('preserves draw counters, capture and charge by default', () => {
    const model = { ...dry, spark: { cost: 10 } };
    const state = createState(model);
    state.counters[model.rarities[0]!.id] = 7;
    state.featuredArmed = true;
    state.sinceFeatured = 8;
    state.sparkProgress = 10;
    const hit = sparkIfReady(model, state);
    expect(hit?.sparked).toBe(true);
    expect(hit?.pityKind).toBe('none');
    expect(state.counters[model.rarities[0]!.id]).toBe(7);
    expect(state.featuredArmed).toBe(true);
    expect(state.sinceFeatured).toBe(8);
    expect(state.totalPulls).toBe(0);
    expect(state.sparkProgress).toBe(0);
  });
  it('applies only declared exchange resets', () => {
    const model: Banner = { ...dry, spark: { cost: 10, reset: { rarityCounters: [dry.rarities[0]!.id], featuredArmed: true, sinceFeatured: true } } };
    const state = createState(model);
    state.counters[model.rarities[0]!.id] = 7;
    state.counters[model.rarities[1]!.id] = 6;
    state.featuredArmed = true;
    state.sinceFeatured = 8;
    state.sparkProgress = 10;
    sparkIfReady(model, state);
    expect(state.counters[model.rarities[0]!.id]).toBe(0);
    expect(state.counters[model.rarities[1]!.id]).toBe(6);
    expect(state.featuredArmed).toBe(false);
    expect(state.sinceFeatured).toBe(0);
  });
});

describe('atomic packs', () => {
  const pack: Banner = { ...dry, multiPull: { size: 10, guaranteeRarity: dry.rarities[0]!.id } };
  it('replaces the final low-tier slot and charges exactly one whole pack', () => {
    const state = createState(pack);
    const hits = pullPack(pack, state, mulberry32(1));
    expect(hits).toHaveLength(10);
    expect(hits.slice(0, 9).every((r) => r.rarity === dry.rarities[1]!.id)).toBe(true);
    expect(hits[9]).toMatchObject({ rarity: dry.rarities[0]!.id, packGuaranteed: true, pityKind: 'none' });
    expect(state.totalPulls).toBe(10);
  });
  it('keeps buying the full pack after an early goal, while recording its first attainment', () => {
    const always: Banner = { ...pack, pity: [{ rarity: dry.rarities[0]!.id, hardAt: 1 }] };
    const row = runTrial(always, { type: 'first-featured' }, mulberry32(2), 'never', { actionMode: 'pack' });
    expect(row.pulls).toBe(10);
    expect(row.cost).toBe(10 * pack.pullCost.amount);
    expect(row.attainmentPulls).toBe(1);
  });
  it('does not buy a partial pack at a horizon or fixed budget', () => {
    const row = runTrial(pack, { type: 'first-featured' }, mulberry32(2), 'never', { actionMode: 'pack', maxPulls: 9 });
    expect(row).toMatchObject({ termination: 'horizon', pulls: 0, goalAchieved: false });
    const budget = runTrial(pack, { type: 'budget', pulls: 15 }, mulberry32(2), 'never', { actionMode: 'pack' });
    expect(budget).toMatchObject({ termination: 'budget', pulls: 10, goalAchieved: false });
  });
  it('does not replace an already sufficient natural or hard-pity result', () => {
    const always = { ...pack, pity: [{ rarity: dry.rarities[0]!.id, hardAt: 1 }] };
    const hits = pullPack(always, createState(always), mulberry32(4));
    expect(hits.some((r) => r.packGuaranteed)).toBe(false);
    expect(hits.every((r) => r.pityKind === 'hard')).toBe(true);
  });
  it('accepts a natural tier above the minimum without downgrading it', () => {
    const higher: Banner = {
      ...pack,
      rarities: [pack.rarities[0]!, { id: 'middle', name: 'Middle', baseRate: 0, color: '#888' }, pack.rarities[1]!],
      items: [...pack.items, { id: 'mid', name: 'Mid', rarity: 'middle', weight: 1 }],
      pity: [{ rarity: pack.rarities[0]!.id, hardAt: 1 }],
      multiPull: { size: 10, guaranteeRarity: 'middle' },
    };
    expect(pullPack(higher, createState(higher), mulberry32(5)).every((r) => r.rarity === pack.rarities[0]!.id && !r.packGuaranteed)).toBe(true);
  });
});
