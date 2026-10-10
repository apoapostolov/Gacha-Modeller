import type { Banner } from '../engine/types.ts';
import { five, four, item, three } from './helpers.ts';

/** Genshin-like character event wish. Community-consensus rates, not a live dump. */
export const genshinCharacter: Banner = {
  id: 'genshin-character',
  name: 'Genshin-like Character',
  family: 'studied',
  blurb: 'A 0.6% 5-star rate with soft pity from pull 74. A 5-star is guaranteed by pull 90; if you miss, the next 5-star is guaranteed featured. Spark costs 180 pulls.',
  source:
    'A community-consensus model based on published Character Event Wish rates (0.6% base, hard pity at 90). Soft pity uses the commonly cited 6-percentage-point increase from pull 74. This is not an official table.',
  notes: [
    'The 5-star base rate is 0.6%. From pull 74, it rises by 6 percentage points per pull; a 5-star is guaranteed by pull 90.',
    'Each 5-star has a 50% chance to be featured. If you miss, your next 5-star is guaranteed featured.',
    'The 4-star base rate is 5.1%, with a guarantee every 10 pulls. Any 5-star resets that counter too.',
    'At 180 pulls, you can buy the featured item from the spark shop (Radiant Primo and similar items).',
  ],
  pullCost: { amount: 160, currency: 'primogem-like' },
  rarities: [five, four, three],
  pity: [
    { rarity: 'five', hardAt: 90, softStart: 74, softStep: 0.06, resetAlso: ['four'] },
    { rarity: 'four', hardAt: 10 },
  ],
  featured: { rarity: 'five', chance: 0.5, capturing: true },
  spark: { cost: 180 },
  multiPull: { size: 10, guaranteeRarity: 'four' },
  items: [
    item('featured-five', 'Featured 5-star', 'five', 1, true),
    item('std-a', 'Standard 5-star A', 'five', 1),
    item('std-b', 'Standard 5-star B', 'five', 1),
    item('std-c', 'Standard 5-star C', 'five', 1),
    item('rate-four', 'Rate-up 4-star', 'four', 1, true),
    item('four-a', '4-star A', 'four', 1),
    item('four-b', '4-star B', 'four', 1),
    item('three-a', '3-star junk', 'three', 1),
  ],
};
