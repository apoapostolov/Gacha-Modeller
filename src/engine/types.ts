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
}

export interface SparkRule {
  cost: number;
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
}

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
}

export interface PullOutcome {
  item: PoolItem;
  rarity: string;
  pityKind: PityKind;
  featuredRoll?: FeaturedRoll;
  sparked?: boolean;
}

export type Goal =
  | { type: 'first-featured' }
  | { type: 'copies'; count: number }
  | { type: 'unique-featured'; count: number }
  | { type: 'budget'; pulls: number }
  | { type: 'collection' };

export interface TrialResult {
  pulls: number;
  cost: number;
  featuredCount: number;
  uniqueCount: number;
  sparked: boolean;
  inventory: Record<string, number>;
  /** Pulls when the first pickup landed, if this trial chased two banners. */
  firstPulls?: number;
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
}
