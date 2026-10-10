import type { Banner, Goal, SparkPolicy, TrialOptions } from './types.ts';

export const MAX_PULLS = 100_000;
export const MAX_TRIALS = 50_000;
export const MAX_PACK_SIZE = 1_000;

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ModelValidation {
  valid: boolean;
  rarityPolicy: 'priority';
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const integer = (value: unknown, min = 1, max = Number.MAX_SAFE_INTEGER): value is number =>
  finite(value) && Number.isSafeInteger(value) && value >= min && value <= max;

/** Validate untrusted model data before executing any simulation. Does not mutate inputs. */
export function validateBanner(input: unknown): ModelValidation {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const fail = (path: string, message: string, code = 'invalid-field') =>
    errors.push({ path, message, code });
  const probability = (value: unknown, path: string) => {
    if (!finite(value) || value < 0 || value > 1) fail(path, 'Use a finite probability between 0 and 1.');
  };
  const positiveInteger = (value: unknown, path: string, max = MAX_PULLS) => {
    if (!integer(value, 1, max)) fail(path, `Use a whole number from 1 to ${max}.`);
  };
  const result = (): ModelValidation => ({ valid: errors.length === 0, rarityPolicy: 'priority', errors, warnings });
  if (!object(input)) {
    fail('model', 'Provide a model object.');
    return result();
  }
  for (const key of ['id', 'name', 'source']) if (!text(input[key])) fail(key, 'Provide a non-empty string.');
  if (!['studied', 'original'].includes(String(input.family))) fail('family', 'Choose studied or original.');
  if (typeof input.blurb !== 'string') fail('blurb', 'Provide a text description.');
  if (!Array.isArray(input.notes) || !input.notes.every((n) => typeof n === 'string')) {
    fail('notes', 'Provide an array of text notes.');
  }
  if (!object(input.pullCost)) fail('pullCost', 'Provide an amount and currency.');
  else {
    if (!finite(input.pullCost.amount) || input.pullCost.amount < 0 || !finite(input.pullCost.amount * MAX_PULLS)) fail('pullCost.amount', 'Use a finite non-negative cost that remains finite over the maximum horizon.');
    if (!text(input.pullCost.currency)) fail('pullCost.currency', 'Provide a currency or resource unit.');
  }

  const rarities = Array.isArray(input.rarities) ? input.rarities : [];
  const items = Array.isArray(input.items) ? input.items : [];
  const pity = Array.isArray(input.pity) ? input.pity : [];
  if (rarities.length === 0) fail('rarities', 'Provide at least one rarity.');
  if (items.length === 0) fail('items', 'Provide at least one item.');
  if (!Array.isArray(input.pity)) fail('pity', 'Provide an array of pity rules, even when empty.');
  const ids = new Set<string>();
  rarities.forEach((r, i) => {
    const path = `rarities[${i}]`;
    if (!object(r)) { fail(path, 'Provide a rarity object.'); return; }
    if (!text(r.id) || ids.has(r.id)) fail(`${path}.id`, 'Use a unique, non-empty rarity ID.');
    if (text(r.id)) ids.add(r.id);
    if (!text(r.name)) fail(`${path}.name`, 'Provide a rarity name.');
    if (!text(r.color)) fail(`${path}.color`, 'Provide a display colour.');
    probability(r.baseRate, `${path}.baseRate`);
  });
  const reference = (value: unknown, path: string) => {
    if (typeof value !== 'string' || !ids.has(value)) fail(path, 'Reference an existing rarity ID.');
  };
  const itemIds = new Set<string>();
  items.forEach((item, i) => {
    const path = `items[${i}]`;
    if (!object(item)) { fail(path, 'Provide an item object.'); return; }
    if (!text(item.id) || itemIds.has(item.id)) fail(`${path}.id`, 'Use a unique, non-empty item ID.');
    if (text(item.id)) itemIds.add(item.id);
    if (!text(item.name)) fail(`${path}.name`, 'Provide an item name.');
    reference(item.rarity, `${path}.rarity`);
    if (!finite(item.weight) || item.weight < 0) fail(`${path}.weight`, 'Use a finite non-negative weight.');
    if (item.featured !== undefined && typeof item.featured !== 'boolean') fail(`${path}.featured`, 'Use true or false.');
  });
  const pityIds = new Set<unknown>();
  pity.forEach((rule, i) => {
    const path = `pity[${i}]`;
    if (!object(rule)) { fail(path, 'Provide a pity rule object.'); return; }
    reference(rule.rarity, `${path}.rarity`);
    if (pityIds.has(rule.rarity)) fail(`${path}.rarity`, 'Use one pity rule per rarity.');
    pityIds.add(rule.rarity);
    if (object(rarities[rarities.length - 1]) && rule.rarity === rarities[rarities.length - 1].id) {
      fail(`${path}.rarity`, 'The final filler rarity cannot have a pity rule.');
    }
    positiveInteger(rule.hardAt, `${path}.hardAt`);
    if (rule.softStart !== undefined || rule.softStep !== undefined) {
      positiveInteger(rule.softStart, `${path}.softStart`);
      probability(rule.softStep, `${path}.softStep`);
      if (finite(rule.softStart) && finite(rule.hardAt) && rule.softStart > rule.hardAt) {
        fail(`${path}.softStart`, 'Soft pity must start no later than hard pity.');
      }
    }
    if (rule.resetAlso !== undefined) {
      if (!Array.isArray(rule.resetAlso)) fail(`${path}.resetAlso`, 'Provide an array of rarity IDs.');
      else rule.resetAlso.forEach((id, j) => reference(id, `${path}.resetAlso[${j}]`));
    }
  });
  if (input.featured !== undefined) {
    if (!object(input.featured)) fail('featured', 'Provide a featured rule object.');
    else {
      reference(input.featured.rarity, 'featured.rarity');
      probability(input.featured.chance, 'featured.chance');
      if (typeof input.featured.capturing !== 'boolean') fail('featured.capturing', 'Use true or false.');
      if (input.featured.hardAt !== undefined) positiveInteger(input.featured.hardAt, 'featured.hardAt');
    }
  }
  if (input.spark !== undefined) {
    if (!object(input.spark)) fail('spark', 'Provide a spark rule object.');
    else {
      if (!finite(input.spark.cost) || input.spark.cost <= 0) fail('spark.cost', 'Use a finite cost greater than zero.');
      if (input.spark.reset !== undefined) {
        if (!object(input.spark.reset)) fail('spark.reset', 'Provide explicit exchange reset effects.');
        else {
          const reset = input.spark.reset;
          if (reset.rarityCounters !== undefined) {
            if (!Array.isArray(reset.rarityCounters)) fail('spark.reset.rarityCounters', 'Provide rarity IDs.');
            else reset.rarityCounters.forEach((id, i) => reference(id, `spark.reset.rarityCounters[${i}]`));
          }
          for (const key of ['featuredArmed', 'sinceFeatured']) {
            if (reset[key] !== undefined && typeof reset[key] !== 'boolean') fail(`spark.reset.${key}`, 'Use true or false.');
          }
        }
      }
    }
  }
  if (input.charge !== undefined) {
    if (!object(input.charge)) fail('charge', 'Provide a charge rule object.');
    else {
      positiveInteger(input.charge.midAt, 'charge.midAt');
      positiveInteger(input.charge.hardAt, 'charge.hardAt');
      probability(input.charge.midFeaturedChance, 'charge.midFeaturedChance');
      if (finite(input.charge.midAt) && finite(input.charge.hardAt) && input.charge.midAt >= input.charge.hardAt) {
        fail('charge.midAt', 'The midpoint must precede the hard checkpoint.');
      }
      if (!object(input.featured)) fail('charge', 'Charge requires a featured rule.');
      if (object(input.featured) && input.featured.hardAt !== undefined) {
        fail('charge', 'Choose charge or featured hard pity; overlapping checkpoints need an explicit rule.');
      }
    }
  }
  if (input.multiPull !== undefined) {
    if (!object(input.multiPull)) fail('multiPull', 'Provide a pack rule object.');
    else {
      positiveInteger(input.multiPull.size, 'multiPull.size', MAX_PACK_SIZE);
      if (input.multiPull.guaranteeRarity !== undefined) reference(input.multiPull.guaranteeRarity, 'multiPull.guaranteeRarity');
    }
  }
  if (input.mechanics !== undefined) {
    if (!object(input.mechanics)) fail('mechanics', 'Provide a mechanics object.');
    else {
      for (const key of ['collectionHeat', 'audienceSparkPerPull']) {
        const value = input.mechanics[key];
        if (value !== undefined && (!finite(value) || value < 0 || value > 1_000)) {
          fail(`mechanics.${key}`, 'Use a finite value between 0 and 1000.');
        }
      }
      if (input.mechanics.poolSharePlayers !== undefined) positiveInteger(input.mechanics.poolSharePlayers, 'mechanics.poolSharePlayers', 1_000);
      for (const key of Object.keys(input.mechanics)) {
        if (!['collectionHeat', 'audienceSparkPerPull', 'poolSharePlayers'].includes(key)) fail(`mechanics.${key}`, 'This mechanic is not supported.');
      }
    }
  }
  // Shape errors must be resolved before inspecting dependent selection rules.
  if (errors.length > 0) return result();
  const banner = input as unknown as Banner;
  const ranked = banner.rarities.slice(0, -1);
  const mass = ranked.reduce((sum, r) => sum + r.baseRate, 0);
  if (mass > 1 + 1e-12) fail('rarities', 'Ranked base probabilities sum to more than one.', 'probability-mass');
  const maxSoftMass = ranked.reduce((sum, r) => {
    const rule = banner.pity.find((p) => p.rarity === r.id);
    const extra = rule?.softStart && rule.softStep !== undefined
      ? Math.max(0, rule.hardAt - rule.softStart) * rule.softStep : 0;
    return sum + Math.min(1, r.baseRate + extra);
  }, 0);
  if (maxSoftMass > 1 + 1e-12) warnings.push({ path: 'rarities', code: 'soft-rate-overlap',
    message: 'Soft rates can overlap. Higher rarities consume probability first; lower rates use only the remaining interval. This is a conservative diagnostic, not an exhaustive reachability proof.' });
  const positivePool = (pool: Banner['items'], path: string) => {
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    if (!finite(total) || total <= 0) fail(path, 'The selectable pool needs a finite, positive total weight.', 'empty-pool');
    const heat = banner.mechanics?.collectionHeat ?? 0;
    if (!finite(total * (1 + heat))) fail(path, 'Weights overflow when collection heat is applied.');
  };
  banner.rarities.forEach((r, i) => {
    const selectable = i === banner.rarities.length - 1 ? mass < 1 : r.baseRate > 0 || banner.pity.some((p) => p.rarity === r.id);
    const featuredForced = banner.featured?.rarity === r.id && Boolean(banner.featured.hardAt || banner.charge);
    const packForced = banner.multiPull?.guaranteeRarity === r.id;
    if (selectable || featuredForced || packForced) positivePool(banner.items.filter((item) => item.rarity === r.id), `rarities[${i}].items`);
  });
  const target = banner.items.filter((item) => item.featured && (!banner.featured || item.rarity === banner.featured.rarity));
  if (banner.featured || banner.spark || banner.charge) positivePool(target, 'featured.items');
  if (banner.featured) {
    const chance = banner.featured.chance;
    const standard = banner.items.filter((item) => item.rarity === banner.featured!.rarity && !item.featured);
    if (chance < 1 || (banner.charge && banner.charge.midFeaturedChance < 1)) positivePool(standard, 'featured.standardItems');
  }
  return result();
}

export class ModelValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'));
    this.name = 'ModelValidationError';
  }
}

export function assertValidBanner(input: unknown): asserts input is Banner {
  const result = validateBanner(input);
  if (!result.valid) throw new ModelValidationError(result.errors);
}

export function validateRun(goal: Goal, sparkPolicy: SparkPolicy, options: TrialOptions = {}, trials = 1, seed = 0): void {
  const issues: ValidationIssue[] = [];
  const fail = (path: string, message: string) => issues.push({ path, code: 'invalid-run', message });
  if (!integer(trials, 1, MAX_TRIALS)) fail('trials', `Use 1 to ${MAX_TRIALS} whole trials.`);
  if (!integer(seed, 0, 0xffffffff)) fail('seed', 'Use an unsigned 32-bit whole seed.');
  if (!['never', 'if-needed'].includes(sparkPolicy)) fail('sparkPolicy', 'Choose never or if-needed.');
  if (!object(goal)) fail('goal', 'Provide a supported goal.');
  else switch (goal.type) {
    case 'first-featured': case 'collection': break;
    case 'copies': case 'unique-featured':
      if (!integer(goal.count)) fail('goal.count', 'Use a positive whole count.');
      break;
    case 'budget':
      if (!integer(goal.pulls, 0)) fail('goal.pulls', 'Use a non-negative whole pull budget.');
      break;
    default: fail('goal.type', 'Choose a supported goal type.');
  }
  if (!object(options)) fail('options', 'Provide run options.');
  else {
    if (options.maxPulls !== undefined && !integer(options.maxPulls, 1, MAX_PULLS)) fail('maxPulls', `Use 1 to ${MAX_PULLS} whole pulls.`);
    if (options.actionMode !== undefined && (typeof options.actionMode !== 'string' || !['single', 'pack'].includes(options.actionMode))) fail('actionMode', 'Choose single or pack.');
  }
  if (issues.length) throw new ModelValidationError(issues);
}
