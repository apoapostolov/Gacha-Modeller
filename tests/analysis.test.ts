import { describe, expect, it } from 'vitest';
import { hardPityBaseline } from '../src/presets/index.ts';
import { solveExact } from '../src/engine/exact.ts';
import { runTrialBatch } from '../src/engine/batch.ts';
import { wilson, comparisonUncertainty, attainmentDifference } from '../src/engine/uncertainty.ts';
import { validateAnalysis, applyPoint, paretoFrontier } from '../src/engine/analysis.ts';
import { createProject, importProject, withSettings } from '../src/project/project.ts';
import { compareProject } from '../src/jobs/compare.ts';
import type { Banner } from '../src/engine/types.ts';

const goal = { type: 'first-featured' } as const;
const options = { maxPulls: 200, actionMode: 'single' as const };
function exact(model: Banner, maxPulls = 200, initialState = {}) {
  const result = solveExact(model, goal, 'never', { ...options, maxPulls, initialState });
  expect(result.status).toBe('exact');
  if (result.status !== 'exact') throw new Error(result.reason);
  return result;
}
describe('exact acquisition mathematics', () => {
  it('matches a capped geometric mean, CDF and cap quantiles', () => {
    const result = exact(hardPityBaseline);
    expect(result.meanPurchasedPulls).toBeCloseTo((1 - .99 ** 100) / .01, 10);
    expect(result.cdf.find((p) => p.pulls === 20)?.probability).toBeCloseTo(1 - .99 ** 20, 12);
    expect(result.attainment).toBeCloseTo(1, 12);
    expect(result.quantiles.p90).toBe(100);
    expect(result.massError).toBeLessThan(1e-12);
  });
  it('handles independent tails without treating a horizon as a cap', () => {
    const model = { ...hardPityBaseline, pity: [] };
    const result = exact(model, 50);
    expect(result.attainment).toBeCloseTo(1 - .99 ** 50, 12);
    expect(result.meanPurchasedPulls).toBeCloseTo((1 - .99 ** 50) / .01, 10);
    expect(result.quantiles.p50).toBeNull();
  });
  it('integrates soft pity and carried progress', () => {
    const model = { ...hardPityBaseline, pity: [{ rarity: 'rare', hardAt: 6, softStart: 3, softStep: .1 }] };
    // Use the fixture's actual rarity ID instead of assuming one.
    model.pity[0]!.rarity = model.rarities[0]!.id;
    const result = exact(model, 5, { counters: { [model.rarities[0]!.id]: 2 } });
    const survival = (1 - .11) * (1 - .21) * (1 - .31);
    expect(result.cdf.find((p) => p.pulls === 3)?.probability).toBeCloseTo(1 - survival, 12);
    expect(result.attainment).toBeCloseTo(1, 12);
    expect(result.quantiles.p90).toBeLessThanOrEqual(4);
  });
  it('matches an analytically enumerable capture and checkpoint fixture', () => {
    const tier = hardPityBaseline.rarities[0]!.id;
    const model: Banner = { ...structuredClone(hardPityBaseline), pity: [], featured: { rarity: tier, chance: .5, capturing: true },
      items: [...hardPityBaseline.items, { id: 'off', name: 'Off target', rarity: tier, weight: 1 }] };
    model.rarities[0]!.baseRate = .2;
    expect(exact(model, 2).attainment).toBeCloseTo(.2, 12); // .1 first + .8*.1 + .1*.2
    expect(exact(model, 1, { featuredArmed: true }).attainment).toBeCloseTo(.2, 12);
    model.charge = { midAt: 2, midFeaturedChance: .7, hardAt: 4 };
    expect(exact(model, 2).attainment).toBeCloseTo(.1 + .9 * .7, 12);
    expect(exact(model, 4).attainment).toBeCloseTo(1, 12);
  });
  it('settles exchange on the final pull and at zero purchased pulls', () => {
    const model = { ...hardPityBaseline, spark: { cost: 3 } };
    const result = solveExact(model, goal, 'if-needed', { maxPulls: 3 });
    expect(result.status).toBe('exact');
    if (result.status === 'exact') expect(result.attainment).toBeCloseTo(1, 12);
    expect(solveExact(model, goal, 'if-needed', { maxPulls: 3, initialState: { sparkProgress: 3 } })).toMatchObject({ status: 'exact', meanPurchasedPulls: 0, attainment: 1 });
  });
  it('reports bounded fallback without partial probabilities', () => {
    expect(solveExact(hardPityBaseline, goal, 'never', { maxPulls: 2001 }).status).toBe('simulation');
    expect(solveExact(hardPityBaseline, { type: 'collection' }, 'never', options).status).toBe('simulation');
    expect(solveExact(hardPityBaseline, goal, 'never', options, { horizon: 200, states: 1, transitions: 1 })).toHaveProperty('reason');
  });
  it('does not collapse a weighted mixed bucket into a deterministic item', () => {
    const model = { ...hardPityBaseline, featured: undefined, items: [...hardPityBaseline.items, { id: 'off', name: 'Off target', rarity: hardPityBaseline.rarities[0]!.id, weight: 1 }] };
    expect(solveExact(model, goal, 'never', options)).toMatchObject({ status: 'simulation' });
  });
  it('bounds branching capture state and validates one-time protection already consumed', () => {
    const model: Banner = { ...structuredClone(hardPityBaseline), featured: { rarity: hardPityBaseline.rarities[0]!.id, chance: .5, capturing: true }, items: [...hardPityBaseline.items, { id: 'off', name: 'Off target', rarity: hardPityBaseline.rarities[0]!.id, weight: 1 }] };
    const bounded = solveExact(model, goal, 'never', options, { horizon: 200, states: 1, transitions: 100 });
    expect(bounded).toMatchObject({ status: 'simulation' });
    if (bounded.status === 'simulation') expect(bounded.reason).toContain('state limit');
    model.pity = []; model.featured!.capturing = false; model.featured!.hardAt = 2; model.featured!.once = true;
    expect(exact(model, 2).attainment).toBeCloseTo(1, 12);
    expect(exact(model, 2, { onceGuaranteeUsed: true }).attainment).toBeCloseTo(1 - .995 ** 2, 12);
  });
});
describe('sampling evidence and starting state', () => {
  it('keeps Wilson bounds informative at zero/all outcomes', () => {
    expect(wilson(0, 100).high).toBeCloseTo(.0369934982, 8);
    expect(wilson(100, 100).low).toBeCloseTo(.9630065018, 8);
    expect(wilson(50, 100).low).toBeCloseTo(.40383153, 7);
    expect(() => wilson(101, 100)).toThrow();
  });
  it('pairs by index, estimates sampling error, and omits unsupported mean intervals', () => {
    const a = runTrialBatch(hardPityBaseline, goal, 100, 42, 'never', options);
    const evidence = comparisonUncertainty(a, a);
    expect(evidence.attainment.paired.estimate).toBe(0);
    expect(evidence.attainment.paired.low).toBeLessThan(0);
    expect(evidence.pulls.paired).toBeNull();
    expect(evidence.pulls.baselineSE).toBeGreaterThan(0);
    expect(() => attainmentDifference(a, [...a].reverse(), true)).toThrow('index');
  });
  it('starts with inventory/progress and counts only new purchases/resources', () => {
    const tier = hardPityBaseline.rarities[0]!.id;
    const row = runTrialBatch(hardPityBaseline, goal, 1, 42, 'never', { maxPulls: 1, initialState: { counters: { [tier]: 99 } } })[0]!;
    expect(row).toMatchObject({ pulls: 1, cost: hardPityBaseline.pullCost.amount, goalAchieved: true });
    const target = hardPityBaseline.items.find((item) => item.featured)!.id;
    expect(runTrialBatch(hardPityBaseline, goal, 1, 42, 'never', { maxPulls: 1, initialState: { inventory: { [target]: 1 } } })[0]).toMatchObject({ pulls: 0, cost: 0, goalAchieved: true });
    expect(() => runTrialBatch(hardPityBaseline, goal, 1, 42, 'never', { initialState: { inventory: { unknown: 1 } } })).toThrow('missing');
  });
});
describe('bounded exploration and stable populations', () => {
  it('rejects duplicate axes, invalid cells, same holdout seed and excessive work', () => {
    const config = { experiment: { axes: [{ parameter: 'price', values: [1, 2] }], trials: 50, validationSeed: 43, objectives: ['cost', 'attainment'], minAttainment: .5, maxCost: 1000 } };
    expect(() => validateAnalysis(config, { ...options, trials: 50, seed: 42 }, hardPityBaseline)).not.toThrow();
    expect(() => validateAnalysis({ experiment: { ...config.experiment, validationSeed: 42 } }, { ...options, trials: 50, seed: 42 })).toThrow('different');
    expect(() => validateAnalysis(config, { maxPulls: 100000, trials: 50, seed: 42 })).toThrow('10 million');
    expect(() => applyPoint(hardPityBaseline, { price: -1 })).toThrow();
    expect(hardPityBaseline.pullCost.amount).toBe(1);
  });
  it('filters constraints before Pareto dominance and preserves tradeoffs', () => {
    const points = [{ cost: 5, attainment: .9, pulls: 5 }, { cost: 4, attainment: .9, pulls: 6 }, { cost: 6, attainment: 1, pulls: 7 }, { cost: 1, attainment: .3, pulls: 1 }];
    expect(paretoFrontier(points, ['cost', 'attainment'], .8, 10)).toEqual([1, 2]);
    expect(() => paretoFrontier(points, ['cost'], .8, 10)).toThrow('objectives');
    expect(() => paretoFrontier(points, ['cost', 'attainment'], NaN, 10)).toThrow('constraints');
  });
  it('retains impossible-goal diagnosis for an empty carried state', () => {
    const model = { ...hardPityBaseline, items: hardPityBaseline.items.map((item) => ({ ...item, featured: false })), featured: undefined };
    expect(runTrialBatch(model, goal, 1, 42, 'never', { maxPulls: 20, initialState: {} })[0]).toMatchObject({ termination: 'impossible', pulls: 0 });
  });
  it('weights cohorts exactly and is independent of input order, with portable version-3 replay', async () => {
    const project = await createProject(hardPityBaseline);
    const tier = hardPityBaseline.rarities[0]!.id;
    const cohorts = [{ id: 'fresh', name: 'Fresh', weight: 1, initialState: {} }, { id: 'ready', name: 'Ready', weight: 3, initialState: { counters: { [tier]: 99 } } }];
    const settings = { ...project.settings, trials: 30, seed: 42, maxPulls: 1, analysis: { cohorts } };
    const original = await compareProject(project, settings);
    const reverse = await compareProject(project, { ...settings, analysis: { cohorts: [...cohorts].reverse() } });
    expect(original.cohorts).toEqual(reverse.cohorts);
    expect(original.cohorts!.weighted.baseline.attainment).toBeCloseTo(.75 + .25 * original.cohorts!.groups[0]!.baseline.attainmentRate, 12);
    expect(original.cohorts!.weighted.curves.at(-1)!.baseline).toBe(original.cohorts!.weighted.baseline.attainment);
    expect(original.project.version).toBe(3);
    const restored = await importProject(JSON.parse(JSON.stringify(original)));
    expect(restored.settings).toEqual(settings);
    await expect(importProject({ ...original.project, version: 2 })).rejects.toThrow('version 3');
  });
  it('runs a two-axis grid with distinct validation streams and a frozen baseline', async () => {
    const project = await createProject(hardPityBaseline);
    const axis = `pity:${hardPityBaseline.pity[0]!.rarity}`;
    const settings = { ...project.settings, trials: 30, seed: 42, maxPulls: 100, analysis: { experiment: { axes: [{ parameter: 'price', values: [1, 2] }, { parameter: axis, values: [50, 80] }], trials: 30, validationSeed: 43, objectives: ['cost', 'attainment'] as ('cost' | 'attainment')[], minAttainment: 1, maxCost: 1000 } } };
    const result = await compareProject(withSettings(project, settings), settings);
    expect(result.experiment!.cells).toHaveLength(4);
    expect(result.experiment!.cells.some((cell) => cell.frontier)).toBe(true);
    expect(result.experiment!.cells[0]!.validation.attainment).toBe(1);
    expect(result.project.baseline.model.pity[0]!.hardAt).toBe(100);
    const restored = await importProject(JSON.parse(JSON.stringify(result)));
    expect((await compareProject(restored, restored.settings)).experiment).toEqual(result.experiment);
  });
});
