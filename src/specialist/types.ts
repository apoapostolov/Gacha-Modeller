export interface ReviewRecord {
  jurisdiction: string; owner: string; changeId: string; classification: 'major' | 'minor'; rationale: string;
  records: { role: 'operations' | 'legal' | 'test-house'; reviewer: string; status: 'pending' | 'reviewed'; reference: string; scopeHash: string }[];
}
export interface CollectibleConfig {
  currency: string; primaryFeeRate: number; resaleFeeRate: number; listingRate: number; fillRate: number; resaleCapacity: number;
  redemptionRate: number; fixedCostMinor: number; reserveMinor: number;
  market: { low: number; base: number; high: number };
  items: { id: string; name: string; cap: number; openingIssued: number; openingRedeemed: number; requestedIssue: number; issuePriceMinor: number; issueCostMinor: number; marketValueMinor: number; redemptionMinor: number }[];
}
export interface PayoutConfig {
  currency: string; stakeMinor: number; feeRate: number; operatingCostMinor: number; treasuryMinor: number;
  playerWalletMinor: number; netLossLimitMinor: number;
  outcomes: { id: string; name: string; weight: number; payoutMinor: number }[];
}
interface Common { format: 'specialist-profile'; version: 1; provenance: 'synthetic'; run: { seed: number; trials: number; rounds: number; sessionsPerTrial?: number }; review: ReviewRecord }
export type SpecialistProfile = Common & ({ kind: 'collectible'; baseline: CollectibleConfig; candidate: CollectibleConfig } | { kind: 'payout'; baseline: PayoutConfig; candidate: PayoutConfig });

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function fields(v: unknown, allowed: string[], path: string): asserts v is Record<string, unknown> {
  if (!obj(v)) throw new Error(`${path}: Expected an object.`);
  for (const key of Object.keys(v)) if (!allowed.includes(key)) throw new Error(`${path}.${key}: Unsupported field.`);
}
function text(v: unknown, path: string, required = true) { if (typeof v !== 'string' || v.length > 2000 || (required && !v.trim())) throw new Error(`${path}: Provide text of at most 2,000 characters.`); }
function whole(v: unknown, path: string, min = 0, max = 1000000000) { if (!Number.isSafeInteger(v) || (v as number) < min || (v as number) > max) throw new Error(`${path}: Use a whole number from ${min} to ${max}.`); }
function rate(v: unknown, path: string, max = 1) { if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max) throw new Error(`${path}: Use a number from 0 to ${max}.`); }
function money(v: Record<string, unknown>, path: string) { if (!['USD','EUR','GBP'].includes(String(v.currency))) throw new Error(`${path}.currency: Use USD, EUR or GBP (two-decimal minor units).`); }
export function assertSpecialistRun(v: unknown): asserts v is SpecialistProfile['run'] {
  fields(v, ['seed','trials','rounds','sessionsPerTrial'], 'specialist.run'); whole(v.seed, 'seed', 0, 0xffffffff); whole(v.trials, 'trials', 10, 5000); whole(v.rounds, 'rounds', 1, 1000);
  if (v.sessionsPerTrial !== undefined) whole(v.sessionsPerTrial, 'sessionsPerTrial', 1, 1000);
  if (Number(v.trials) * Number(v.rounds) * Number(v.sessionsPerTrial ?? 1) > 1000000) throw new Error('Specialist run: Limit trials × sessions × rounds to 1,000,000 per model.');
}
export function assertCollectible(v: unknown, path = 'collectible'): asserts v is CollectibleConfig {
  fields(v, ['currency','primaryFeeRate','resaleFeeRate','listingRate','fillRate','resaleCapacity','redemptionRate','fixedCostMinor','reserveMinor','market','items'], path); money(v, path);
  for (const key of ['primaryFeeRate','resaleFeeRate','listingRate','fillRate','redemptionRate']) rate(v[key], `${path}.${key}`);
  for (const key of ['resaleCapacity','fixedCostMinor','reserveMinor']) whole(v[key], `${path}.${key}`);
  fields(v.market, ['low','base','high'], `${path}.market`);
  for (const key of ['low','base','high']) rate(v.market[key], `${path}.market.${key}`, 10);
  if (Number(v.market.low) > Number(v.market.base) || Number(v.market.base) > Number(v.market.high)) throw new Error(`${path}.market: Order low ≤ base ≤ high.`);
  if (!Array.isArray(v.items) || v.items.length < 1 || v.items.length > 50) throw new Error(`${path}.items: Provide 1–50 supply rows.`);
  const ids = new Set<string>();
  for (const [i, row] of v.items.entries()) {
    const p = `${path}.items[${i}]`; fields(row, ['id','name','cap','openingIssued','openingRedeemed','requestedIssue','issuePriceMinor','issueCostMinor','marketValueMinor','redemptionMinor'], p);
    text(row.id, `${p}.id`); text(row.name, `${p}.name`);
    if (ids.has(String(row.id))) throw new Error(`${p}.id: Duplicate supply identifier.`); ids.add(String(row.id));
    for (const key of ['cap','openingIssued','openingRedeemed','requestedIssue']) whole(row[key], `${p}.${key}`, 0, 1000000);
    for (const key of ['issuePriceMinor','issueCostMinor','marketValueMinor','redemptionMinor']) whole(row[key], `${p}.${key}`, 0, 1000000);
    if (Number(row.openingRedeemed) > Number(row.openingIssued) || Number(row.openingIssued) > Number(row.cap)) throw new Error(`${p}: Opening redeemed ≤ issued ≤ lifetime cap is required.`);
  }
}
export function assertPayout(v: unknown, path = 'payout'): asserts v is PayoutConfig {
  fields(v, ['currency','stakeMinor','feeRate','operatingCostMinor','treasuryMinor','playerWalletMinor','netLossLimitMinor','outcomes'], path); money(v, path);
  whole(v.stakeMinor, `${path}.stakeMinor`, 1, 1000000); rate(v.feeRate, `${path}.feeRate`);
  for (const key of ['operatingCostMinor','treasuryMinor','playerWalletMinor','netLossLimitMinor']) whole(v[key], `${path}.${key}`, 0, 1000000000);
  if (!Array.isArray(v.outcomes) || v.outcomes.length < 1 || v.outcomes.length > 50) throw new Error(`${path}.outcomes: Provide 1–50 payout rows.`);
  const ids = new Set<string>();
  for (const [i, row] of v.outcomes.entries()) {
    const p = `${path}.outcomes[${i}]`; fields(row, ['id','name','weight','payoutMinor'], p); text(row.id, `${p}.id`); text(row.name, `${p}.name`);
    if (ids.has(String(row.id))) throw new Error(`${p}.id: Duplicate payout identifier.`); ids.add(String(row.id));
    whole(row.weight, `${p}.weight`, 1, 1000000); whole(row.payoutMinor, `${p}.payoutMinor`, 0, 1000000);
  }
}
export function assertSpecialist(v: unknown): asserts v is SpecialistProfile {
  fields(v, ['format','version','provenance','kind','baseline','candidate','run','review'], 'specialist');
  if (v.format !== 'specialist-profile' || v.version !== 1 || v.provenance !== 'synthetic' || !['collectible','payout'].includes(String(v.kind))) throw new Error('Specialist: Unsupported profile or provenance.');
  if (v.kind === 'collectible') { assertCollectible(v.baseline, 'baseline'); assertCollectible(v.candidate, 'candidate'); }
  else { assertPayout(v.baseline, 'baseline'); assertPayout(v.candidate, 'candidate'); }
  if (v.baseline.currency !== v.candidate.currency) throw new Error('Specialist: Baseline and candidate must use the same currency.');
  assertSpecialistRun(v.run);
  fields(v.review, ['jurisdiction','owner','changeId','classification','rationale','records'], 'review');
  for (const key of ['jurisdiction','owner','changeId','rationale']) text(v.review[key], `review.${key}`, false);
  if (!['major','minor'].includes(String(v.review.classification))) throw new Error('Review: Declare a change classification.');
  if (!Array.isArray(v.review.records) || v.review.records.length !== 3) throw new Error('Review: Include operations, legal and test-house records.');
  const roles = new Set<string>();
  for (const row of v.review.records) {
    fields(row, ['role','reviewer','status','reference','scopeHash'], 'review.record');
    if (!['operations','legal','test-house'].includes(String(row.role)) || roles.has(String(row.role)) || !['pending','reviewed'].includes(String(row.status))) throw new Error('Review: Invalid role or status.'); roles.add(String(row.role));
    for (const key of ['reviewer','reference','scopeHash']) text(row[key], `review.${key}`, false);
    if (row.scopeHash && !/^[a-f0-9]{64}$/.test(String(row.scopeHash))) throw new Error('Review: Scope must be a SHA-256 hash.');
  }
}
