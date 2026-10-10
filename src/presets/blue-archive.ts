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
  blurb: 'A 0.7% pickup rate, 3% chance of a 3-star, and a 200-point spark. A natural pickup does not reset the meter.',
  source:
    "Based on Blue Archive's published rates (3% for a 3-star, 0.7% pickup, 120 pyroxene) and its pre-5.5 Recruitment Points spark at 200. Dual banners shared points. At a banner's end, points converted to keystones and did not carry over.",
  notes: [
    'Pickup is 0.7% on its own, not half of all 3-stars. Given a 3-star, the pickup is about 23.3%.',
    'Each pull adds one Recruitment Point. At 200 points, you can trade them for the pickup. A natural pickup does not reset the meter.',
    'On a dual banner, getting pickup A early still leaves enough points to spark B at 200. JP 5.5 replaced that system.',
    'The spark is a shop purchase. Global still used this system when JP introduced Recruitment Charge; JP used it until 29 July 2026.',
  ],
  spark: { cost: 200 },
};

/** JP 5.5 Recruitment Charge: 100 mid 50/50, 200 hard, reset on this banner's pickup. */
export const blueArchiveCharge: Banner = {
  ...shared,
  id: 'blue-archive-charge',
  name: 'Blue Archive-like Charge',
  blurb: 'Both banners have a 0.7% pickup rate. At 100 points, you get a 3-star with a 50% pickup chance; at 200, the pickup is guaranteed. A pickup resets the meter, and same-type banners share points.',
  source:
    "Based on Blue Archive JP 5.5 Recruitment Charge (29 July 2026) and the Wiki/Yostar/Inven write-up: at 100 charge, a 3-star is guaranteed with a 50% pickup chance; at 200, the pickup is guaranteed. A pickup on this banner resets charge. Regular and limited banners use separate pools, and banners of the same type share charge. This model does not copy a live drop table.",
  notes: [
    "Every pull adds charge. An off-banner 3-star does not reset it. Any pickup on this banner does, including a natural 0.7% hit.",
    'When charge reaches 100, the roll is a 3-star with a 50% chance of the pickup. If you miss, the next 3-star is not guaranteed to be the pickup.',
    'At 200 charge, the pickup is guaranteed and the meter resets to 0.',
    'Regular and limited banners have separate meters. Banners of the same type share one, so getting A resets the progress you had toward B.',
    "The 5.5 livestream announced the change a few days before it launched in JP. Producer Kim Yong-ha apologised, and recent Steam reviews fell to 'Overwhelmingly Negative.' Those write-ups did not announce a Global release date.",
  ],
  charge: { midAt: 100, midFeaturedChance: 0.5, hardAt: 200 },
};
