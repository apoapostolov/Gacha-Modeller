import type { Banner, PoolItem, Rarity } from '../engine/types.ts';
import { item } from './helpers.ts';

/** Published pickup rates. 3-star 3%, this banner's pickup 0.7%. */
export const BA_THREE_RATE = 0.03;
export const BA_PICKUP_RATE = 0.007;
export const BA_TWO_RATE = 0.185;

const three: Rarity = { id: 'three', name: '3-star', baseRate: BA_THREE_RATE, color: '#d4b483' };
const two: Rarity = { id: 'two', name: '2-star', baseRate: BA_TWO_RATE, color: '#7ea36a' };
const one: Rarity = { id: 'one', name: '1-star', baseRate: 0, color: '#6b6458' };

const items: PoolItem[] = [
  item('pickup', 'Pickup 3-star', 'three', 1, true),
  item('off-three', 'Off-banner 3-star', 'three', 1),
  item('two-star', '2-star', 'two', 1),
  item('one-star', '1-star', 'one', 1),
];

const shared = {
  family: 'studied' as const,
  pullCost: { amount: 120, currency: 'pyroxene-like' },
  rarities: [three, two, one],
  pity: [],
  featured: {
    rarity: 'three',
    chance: BA_PICKUP_RATE / BA_THREE_RATE,
    capturing: false,
  },
  multiPull: { size: 10, guaranteeRarity: 'two' },
  items,
};

/** Global / pre-5.5 JP: 200-point spark, does not reset on a natural pickup. */
export const blueArchiveSpark: Banner = {
  ...shared,
  id: 'blue-archive-spark',
  name: 'Blue Archive-like Spark',
  blurb: '0.7% pickup, 3% 3-star, spark at 200. A natural hit does not spend the bar.',
  source:
    'Blue Archive published rates (3% 3-star, 0.7% pickup, 120 pyroxene) plus the pre-5.5 Recruitment Points spark at 200. Dual banners shared the point pool. Points converted to keystones when a banner ended; they did not carry.',
  notes: [
    'Pickup is 0.7% on its own, not half of all 3-stars. Given a 3-star, the pickup is about 23.3%.',
    'Every pull adds one Recruitment Point. 200 points buy the current pickup. A natural hit does not reset that.',
    'On a dual pickup, an early A still lets you spark B at 200. That is the plan JP 5.5 took away.',
    'Spark is a shop spend. Global still worked this way when JP shipped charge, and JP did too before 29 Jul 2026.',
  ],
  spark: { cost: 200 },
};

/** JP 5.5 Recruitment Charge: 100 mid 50/50, 200 hard, reset on this banner's pickup. */
export const blueArchiveCharge: Banner = {
  ...shared,
  id: 'blue-archive-charge',
  name: 'Blue Archive-like Charge',
  blurb: 'Same 0.7%. At 100 you get a 3-star, 50% pickup. At 200, pickup. A hit resets. Same-type banners share the bar.',
  source:
    "Blue Archive JP 5.5 Recruitment Charge (29 Jul 2026). Wiki + Yostar/Inven writeup: 100 charge guarantees a 3-star at 50% pickup, 200 guarantees pickup, reset on this banner's pickup, two pools (regular vs limited), charge carries across same-type banners. Not a live drop-table dump.",
  notes: [
    "Charge ticks on every pull. Off-banner 3-stars do not reset it. This banner's pickup does, even a natural 0.7%.",
    'At exactly 100, this pull is a 3-star with a 50% pickup. That coin is a checkpoint, not a catch-up: a miss does not arm the next 3-star.',
    'At 200 the pickup is forced, then charge is 0.',
    'Regular and limited banners use separate bars. Dual pickups of the same type share a bar, so getting A zeros the bar you wanted for B.',
    'The 5.5 livestream announced this days before JP shipped it. Producer Kim Yong-ha apologised. Steam recent reviews went Overwhelmingly Negative. Global timing was unannounced in those writeups.',
  ],
  charge: { midAt: 100, midFeaturedChance: 0.5, hardAt: 200 },
};
