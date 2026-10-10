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
      if (input.featured.once !== undefined && (typeof input.featured.once !== 'boolean' || input.featured.hardAt === undefined)) fail('featured.once', 'A one-time guarantee requires a hard cap and a boolean flag.');
    }
  }
  if (input.spark !== undefined) {
    if (!object(input.spark)) fail('spark', 'Provide a spark rule object.');
    else {
      if (!finite(input.spark.cost) || input.spark.cost <= 0) fail('spark.cost', 'Use a finite cost greater than zero.');
      if (input.spark.choice !== undefined && !['missing-first','selected','target'].includes(String(input.spark.choice))) fail('spark.choice', 'Choose missing-first, selected or target.');
      if (input.spark.items !== undefined && (!Array.isArray(input.spark.items) || input.spark.items.length === 0 || new Set(input.spark.items).size !== input.spark.items.length || !input.spark.items.every((id) => itemIds.has(String(id))))) fail('spark.items', 'Provide unique existing reward IDs.');
      if (input.spark.reset !== undefined) {
        if (!object(input.spark.reset)) fail('spark.reset', 'Provide explicit exchange reset effects.');
        else {
          const reset = input.spark.reset;
          if (reset.rarityCounters !== undefined) {
            if (!Array.isArray(reset.rarityCounters)) fail('spark.reset.rarityCounters', 'Provide rarity IDs.');
            else reset.rarityCounters.forEach((id, i) => reference(id, `spark.reset.rarityCounters[${i}]`));
          }
          for (const key of ['featuredArmed', 'sinceFeatured', 'targetProgress']) {
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
      if (input.multiPull.sampling !== undefined && !['replacement','without-replacement'].includes(String(input.multiPull.sampling))) fail('multiPull.sampling', 'Choose replacement or without-replacement.');
      if (input.multiPull.correlation !== undefined && !['independent','shared-item'].includes(String(input.multiPull.correlation))) fail('multiPull.correlation', 'Choose independent or shared-item.');
      if (input.multiPull.slots !== undefined) {
        if (!Array.isArray(input.multiPull.slots) || input.multiPull.slots.length !== input.multiPull.size) fail('multiPull.slots', 'Provide exactly one layout row per paid slot.');
        else input.multiPull.slots.forEach((slot, i) => {
          const path = `multiPull.slots[${i}]`;
          if (!object(slot)) { fail(path, 'Provide a slot rule.'); return; }
          positiveInteger(slot.quantity, `${path}.quantity`, 1000);
          if (slot.rarity !== undefined) reference(slot.rarity, `${path}.rarity`);
          if (slot.itemId !== undefined && !itemIds.has(String(slot.itemId))) fail(`${path}.itemId`, 'Choose an existing fixed reward.');
          if (slot.itemId !== undefined && slot.rarity !== undefined) fail(path, 'Choose a fixed item or a fixed rarity.');
        });
      }
      const weighted = input.multiPull.sampling === 'without-replacement' || input.multiPull.correlation === 'shared-item';
      if (weighted && (rarities.length !== 1 || pity.length || input.featured || input.charge || input.targetRule || input.multiPull.slots || input.multiPull.guaranteeRarity)) fail('multiPull.sampling', 'Weighted correlated packs require one tier, no protection, no layout and no minimum-tier guarantee.');
      if (input.multiPull.sampling === 'without-replacement' && input.multiPull.correlation === 'shared-item') fail('multiPull.correlation', 'Shared-item and no-replacement sampling cannot be combined.');
      if (input.multiPull.sampling === 'without-replacement' && finite(input.multiPull.size) && input.multiPull.size > items.filter((item) => object(item) && finite(item.weight) && item.weight > 0).length) fail('multiPull.size', 'A no-replacement pack needs enough positive-weight item IDs.');
      if (weighted && object(input.duplicates) && input.duplicates.protection === 'same-rarity') fail('duplicates.protection', 'Weighted correlated packs need no duplicate redirection.');
    }
  }
  if (input.duplicates !== undefined) {
    if (!object(input.duplicates)) fail('duplicates', 'Provide a duplicate rule.');
    else {
      positiveInteger(input.duplicates.cap, 'duplicates.cap');
      if (!['none','same-rarity'].includes(String(input.duplicates.protection))) fail('duplicates.protection', 'Choose none or same-rarity.');
      if (!['discard','salvage'].includes(String(input.duplicates.overflow))) fail('duplicates.overflow', 'Choose discard or salvage.');
      if (!integer(input.duplicates.salvagePerCopy, 0, 1_000_000)) fail('duplicates.salvagePerCopy', 'Use 0 to 1,000,000 whole shards per overflow copy.');
      if (input.duplicates.craftCost !== undefined) positiveInteger(input.duplicates.craftCost, 'duplicates.craftCost', 1_000_000_000);
      if (input.duplicates.craftableItems !== undefined && (!Array.isArray(input.duplicates.craftableItems) || input.duplicates.craftableItems.length === 0 || new Set(input.duplicates.craftableItems).size !== input.duplicates.craftableItems.length || !input.duplicates.craftableItems.every((id) => itemIds.has(String(id))))) fail('duplicates.craftableItems', 'Choose unique existing recipe rewards.');
      if (input.duplicates.craftCost !== undefined && (input.duplicates.overflow !== 'salvage' || input.duplicates.salvagePerCopy === 0)) fail('duplicates.craftCost', 'Crafting needs a positive salvage source.');
    }
  }
  if (input.provenance !== undefined) {
    if (!object(input.provenance)) fail('provenance', 'Provide rule source records.');
    else for (const [key, source] of Object.entries(input.provenance)) {
      if (!['rates','pity','featured','exchange','packs','persistence','duplicates'].includes(key) || !object(source)) { fail(`provenance.${key}`, 'Choose a supported mechanism source.'); continue; }
      if (!['cited-shape','synthetic'].includes(String(source.kind)) || !text(source.source)) fail(`provenance.${key}`, 'Provide source text and a cited-shape or synthetic classification.');
      if (source.asOf !== undefined && (typeof source.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(source.asOf) || !Number.isFinite(Date.parse(source.asOf)) || new Date(source.asOf).toISOString().slice(0,10) !== source.asOf)) fail(`provenance.${key}.asOf`, 'Use a valid YYYY-MM-DD date.');
      if (source.region !== undefined && !text(source.region)) fail(`provenance.${key}.region`, 'Provide a region label.');
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
  if (input.targetRule !== undefined) {
    if (!object(input.targetRule)) fail('targetRule', 'Provide a selected-target guarantee.');
    else {
      positiveInteger(input.targetRule.hardAt, 'targetRule.hardAt');
      if (typeof input.targetRule.once !== 'boolean') fail('targetRule.once', 'Use true or false.');
      if (!object(input.featured) || input.charge || input.featured.hardAt !== undefined) fail('targetRule', 'Selected-target protection requires featured rules and cannot overlap charge or featured hard caps.');
    }
  }
  if (input.persistence !== undefined) {
    if (!object(input.persistence)) fail('persistence', 'Provide a persistence matrix.');
    else {
      const fields = ['rarityCounters','featuredArmed','sinceFeatured','sparkProgress','targetProgress','onceGuaranteeUsed'];
      for (const [field, rule] of Object.entries(input.persistence)) {
        if (field === 'familyId') { if (!text(rule)) fail('persistence.familyId', 'Provide a named family.'); continue; }
        if (!fields.includes(field) || !object(rule)) { fail(`persistence.${field}`, 'Provide a supported protection rule.'); continue; }
        if (!['banner','family','account'].includes(String(rule.scope))) fail(`persistence.${field}.scope`, 'Choose banner, family or account.');
        if (rule.scope === 'family' && !text(input.persistence.familyId)) fail('persistence.familyId', 'Family scope requires a named family.');
        for (const event of ['bannerSwitch','season','targetSwitch']) if (!['retain','reset'].includes(String(rule[event]))) fail(`persistence.${field}.${event}`, 'Choose retain or reset.');
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
    const packForced = banner.multiPull?.guaranteeRarity === r.id || banner.multiPull?.slots?.some((slot) => slot.rarity === r.id);
    if (selectable || featuredForced || packForced) positivePool(banner.items.filter((item) => item.rarity === r.id), `rarities[${i}].items`);
  });
  const target = banner.items.filter((item) => item.featured && (!banner.featured || item.rarity === banner.featured.rarity));
  if (banner.featured || banner.charge || (banner.spark && !banner.spark.items)) positivePool(target, 'featured.items');
  if (banner.featured) {
    const chance = banner.featured.chance;
    const standard = banner.items.filter((item) => item.rarity === banner.featured!.rarity && !item.featured);
    if (chance < 1 || (banner.charge && banner.charge.midFeaturedChance < 1)) positivePool(standard, 'featured.standardItems');
  }
  if (banner.multiPull?.guaranteeRarity && banner.multiPull.slots) {
    const minimum = banner.rarities.findIndex((rarity) => rarity.id === banner.multiPull!.guaranteeRarity);
    const rank = (slot: NonNullable<Banner['multiPull']>['slots'] extends (infer T)[] | undefined ? T : never) => {
      const id = slot.itemId ? banner.items.find((item) => item.id === slot.itemId)!.rarity : slot.rarity;
      return id ? banner.rarities.findIndex((rarity) => rarity.id === id) : Infinity;
    };
    const last = banner.multiPull.slots.at(-1)!;
    if (!banner.multiPull.slots.some((slot) => rank(slot) <= minimum) && (last.rarity || last.itemId)) fail('multiPull.slots', 'The fixed layout cannot satisfy the declared minimum-tier guarantee.');
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
    case 'targets':
      if (!Array.isArray(goal.targets) || goal.targets.length < 1 || goal.targets.length > 50 || new Set(goal.targets.map((t) => t?.itemId)).size !== goal.targets.length || !goal.targets.every((t) => object(t) && text(t.itemId) && integer(t.count))) fail('goal.targets', 'Choose 1 to 50 unique item IDs with positive whole counts.');
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
    for (const field of ['targetId','exchangeItemId']) if (options[field as keyof TrialOptions] !== undefined && !text(options[field as keyof TrialOptions])) fail(field, 'Choose an item ID.');
    if (options.craftPolicy !== undefined && !['never','missing-targets'].includes(String(options.craftPolicy))) fail('craftPolicy', 'Choose never or missing-targets.');
    if (options.transitions !== undefined) {
      if (!Array.isArray(options.transitions) || options.transitions.length > 50) fail('transitions', 'Provide at most 50 scheduled transitions.');
      else options.transitions.forEach((event, i) => {
        if (!object(event) || !integer(event.atPull, 0, MAX_PULLS)) { fail(`transitions[${i}]`, 'Provide a purchased-pull boundary.'); return; }
        if (!['banner-switch','season','target-switch'].includes(String(event.type))) fail(`transitions[${i}].type`, 'Choose a supported transition.');
        if (event.type === 'season' && !text(event.seasonId)) fail(`transitions[${i}].seasonId`, 'Provide the next season ID.');
        if (event.type === 'target-switch' && !text(event.targetId)) fail(`transitions[${i}].targetId`, 'Choose the next target ID.');
        if (event.type === 'banner-switch' && !object(event.model)) fail(`transitions[${i}].model`, 'Provide the next model.');
      });
    }
  }
  if (issues.length) throw new ModelValidationError(issues);
}
