export type Family = 'studied' | 'original';

export type PityKind = 'none' | 'soft' | 'hard';

export type FeaturedRoll = 'won' | 'lost' | 'guaranteed';

export type SparkPolicy = 'never' | 'if-needed';

export interface Cost {
  amount: number;
  currency: string;
}

export interface Rarity {
  id: string;
  name: string;
  /**
   * Base probability before pity. Ranked rarities come first.
   * The last rarity is the filler; its rate is whatever remains.
   */
  baseRate: number;
  color: string;
}

export interface PityRule {
  rarity: string;
  hardAt: number;
  /** Inclusive pull count in this cycle where the rate starts climbing. */
  softStart?: number;
  /** Added probability per pull at and after softStart. */
  softStep?: number;
  /** Other rarity counters to zero when this rarity hits. */
  resetAlso?: string[];
}

export interface FeaturedRule {
  rarity: string;
  /** Chance a hit of this rarity is featured, before capturing. */
  chance: number;
  /** A lost featured roll arms a guarantee on the next hit of this rarity. */
  capturing: boolean;
  /** Banner-level guarantee of the featured item after this many pulls. */
  hardAt?: number;
  once?: boolean;
}

export interface SparkRule {
  cost: number;
  choice?: 'missing-first' | 'selected' | 'target';
  items?: string[];
  /** Exchanges preserve draw protection unless reset effects are explicitly declared. */
  reset?: {
    rarityCounters?: string[];
    featuredArmed?: boolean;
    sinceFeatured?: boolean;
    targetProgress?: boolean;
  };
}

/**
 * Recruitment-charge style checkpoints (Blue Archive JP 5.5).
 * `sinceFeatured` is the charge. Mid fires once at exactly midAt.
 * Off-banner 3-stars do not reset charge. This banner's pickup does.
 */
export interface ChargeRule {
  midAt: number;
  /** Chance the mid checkpoint is this banner's pickup. Rest is off-banner of that rarity. */
  midFeaturedChance: number;
  hardAt: number;
}

export interface MultiPullRule {
  size: number;
  guaranteeRarity?: string;
  slots?: PackSlot[];
  sampling?: 'replacement' | 'without-replacement';
  correlation?: 'independent' | 'shared-item';
}

export interface PackSlot { rarity?: string; itemId?: string; quantity: number }
export type ProtectionField = 'rarityCounters' | 'featuredArmed' | 'sinceFeatured' | 'sparkProgress' | 'targetProgress' | 'onceGuaranteeUsed';
export interface PersistenceRule { scope: 'banner' | 'family' | 'account'; bannerSwitch: 'retain' | 'reset'; season: 'retain' | 'reset'; targetSwitch: 'retain' | 'reset' }
export type PersistenceMatrix = { familyId?: string } & Partial<Record<ProtectionField, PersistenceRule>>;
export interface DuplicateRule { cap: number; protection: 'none' | 'same-rarity'; overflow: 'discard' | 'salvage'; salvagePerCopy: number; craftCost?: number; craftableItems?: string[] }
export type MechanismKey = 'rates' | 'pity' | 'featured' | 'exchange' | 'packs' | 'persistence' | 'duplicates';
export interface RuleSource { kind: 'cited-shape' | 'synthetic'; source: string; asOf?: string; region?: string }
export interface Transition { type: 'banner-switch' | 'season' | 'target-switch'; seasonId?: string; targetId?: string }
export interface ScheduledTransition extends Transition { atPull: number; model?: Banner }
export interface StateContext { bannerId: string; familyId: string; seasonId: string; targetId?: string }
export interface ScopedValue { value: number | boolean | Record<string, number>; seasonId: string; targetId?: string }

export interface PoolItem {
  id: string;
  name: string;
  rarity: string;
  featured?: boolean;
  weight: number;
}

export interface MechanicFlags {
  /** Extra weight multiplier for unowned items in the same rarity. */
  collectionHeat?: number;
  /** Shared pity across this many players (original social pool). */
  poolSharePlayers?: number;
  /** Extra spark-bar progress granted per pull by an audience. */
  audienceSparkPerPull?: number;
}

export interface Banner {
  id: string;
  name: string;
  family: Family;
  blurb: string;
  /** Citation for studied models, or `original`. */
  source: string;
  notes: string[];
  pullCost: Cost;
  rarities: Rarity[];
  pity: PityRule[];
  featured?: FeaturedRule;
  spark?: SparkRule;
  charge?: ChargeRule;
  multiPull?: MultiPullRule;
  items: PoolItem[];
  mechanics?: MechanicFlags;
  persistence?: PersistenceMatrix;
  targetRule?: { hardAt: number; once: boolean };
  duplicates?: DuplicateRule;
  provenance?: Partial<Record<MechanismKey, RuleSource>>;
}

export interface PullState {
  counters: Record<string, number>;
  featuredArmed: boolean;
  totalPulls: number;
  inventory: Record<string, number>;
  owned: Set<string>;
  sparkProgress: number;
  /** Pulls since the last featured item. Used by featured.hardAt. */
  sinceFeatured: number;
  targetId?: string;
  targetProgress: number;
  onceGuaranteeUsed: boolean;
  context: StateContext;
  scoped: Record<string, ScopedValue>;
  salvage: number;
  salvageEarned: number;
  salvageSpent: number;
  duplicateCount: number;
  crafted: number;
}

export interface PullOutcome {
  item: PoolItem;
  rarity: string;
  pityKind: PityKind;
  featuredRoll?: FeaturedRoll;
  sparked?: boolean;
  packGuaranteed?: boolean;
  quantity?: number;
  accepted?: number;
  salvage?: number;
  crafted?: boolean;
  redirectedFrom?: string;
  onceGuaranteed?: boolean;
}

export type Goal =
  | { type: 'first-featured' }
  | { type: 'copies'; count: number }
  | { type: 'unique-featured'; count: number }
  | { type: 'budget'; pulls: number }
  | { type: 'collection' }
  | { type: 'targets'; targets: { itemId: string; count: number }[] };

export interface TrialResult {
  goalAchieved: boolean;
  termination: TrialTermination;
  /** First goal attainment within an action; purchased pulls may be greater. */
  attainmentPulls: number | null;
  pulls: number;
  cost: number;
  featuredCount: number;
  uniqueCount: number;
  sparked: boolean;
  inventory: Record<string, number>;
  /** Pulls when the first pickup landed, if this trial chased two banners. */
  firstPulls?: number;
  duplicateCount?: number;
  salvageEarned?: number;
  salvageSpent?: number;
  salvageRemaining?: number;
  crafted?: number;
}

export type TrialTermination = 'goal' | 'horizon' | 'budget' | 'impossible';

export interface TrialOptions {
  maxPulls?: number;
  actionMode?: 'single' | 'pack';
  targetId?: string;
  exchangeItemId?: string;
  craftPolicy?: 'never' | 'missing-targets';
  transitions?: ScheduledTransition[];
}

export interface Summary {
  n: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  p05: number;
  p25: number;
  p75: number;
  p90: number;
  p95: number;
}

export interface Histogram {
  start: number;
  width: number;
  counts: number[];
}

export interface SimReport {
  evidence: 'monte-carlo';
  attainmentRate: number;
  terminations: Record<TrialTermination, number>;
  /** Summaries conditional on finishing; never substitute these for the population. */
  completedPulls: Summary | null;
  acquisitionQuantiles: { p50: number | null; p90: number | null; p95: number | null };
  manifest: {
    engineVersion: 'foundation-1' | 'workbench-2' | 'mechanics-3';
    rngPolicy: 'legacy-sequential' | 'event-streams-v1';
    rarityPolicy: 'priority';
    model: Banner;
    options: TrialOptions & Required<Pick<TrialOptions, 'maxPulls' | 'actionMode'>>;
  };
  bannerId: string;
  goal: Goal;
  sparkPolicy: SparkPolicy;
  trials: number;
  seed: number;
  pulls: Summary;
  cost: Summary;
  featuredCount: Summary;
  uniqueCount: Summary;
  sparkRate: number;
  histogram: Histogram;
  /** Cumulative attained counts, always divided by all trials in population plots. */
  acquisitionCdf: { pulls: number; attained: number }[];
  duplicateSummary?: { attempted: Summary; salvageEarned: Summary; salvageSpent: Summary; salvageRemaining: Summary; crafted: Summary };
}

export type TrialSample = Omit<TrialResult, 'inventory' | 'firstPulls'> & { trialIndex?: number };

export interface TraceState {
  pulls: number; rarityCounters: Record<string, number>; captureArmed: boolean; sinceFeatured: number; sparkProgress: number;
  targetId?: string; targetProgress: number; onceUsed: boolean; salvage: number; owned: number; selectedCopies: number;
}
export interface JourneyEvent {
  kind: 'purchase' | 'draw' | 'exchange' | 'craft' | 'transition'; modelId: string;
  before: TraceState; after: TraceState; outcome?: PullOutcome; transition?: Transition; purchaseCost?: number;
}
export interface JourneyTrace {
  engineVersion: 'mechanics-3'; randomPolicy: 'event-streams-v1'; seed: number; trialIndex: number;
  model: Banner; goal: Goal; sparkPolicy: SparkPolicy; options: TrialOptions; result: TrialResult;
  events: JourneyEvent[]; totalEvents: number; truncated: boolean;
}
export type Representative = 'lucky' | 'median' | 'unlucky' | 'incomplete';
