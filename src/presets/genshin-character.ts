import type { Banner } from '../engine/types.ts';
import { five, four, item, three } from './helpers.ts';

/** Genshin-like character event wish. Community-consensus rates, not a live dump. */
export const genshinCharacter: Banner = {
  id: 'genshin-character',
  name: 'Genshin-like Character',
  family: 'studied',
  blurb: '0.6% 5-star, soft from 74, hard 90, 50/50 with a catch-up, spark at 180.',
  source:
    'Community-consensus model of published Character Event Wish rates (0.6% / 90). Soft-pity ramp is the widely used +6% from pull 74. Not an official table.',
  notes: [
    '5-star base is 0.6%. From pull 74 the rate climbs +6% each time. At 90 you get one.',
    'A 5-star is a coin flip: featured or standard. Lose, and the next 5-star is featured.',
    '4-star is 5.1% with hard pity 10. A 5-star also resets that 4-star bar.',
    'Spark is a 180-pull shop buy of the featured (Radiant Primo and cousins).',
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
