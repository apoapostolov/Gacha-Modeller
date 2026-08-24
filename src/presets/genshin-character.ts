import type { Banner } from '../engine/types.ts';
import { five, four, item, three } from './helpers.ts';

/** Genshin-like character event wish. Community-consensus rates, not a live dump. */
export const genshinCharacter: Banner = {
  id: 'genshin-character',
  name: 'Genshin-like Character',
  family: 'studied',
  blurb: '0.6% 5-star, soft pity from 74, hard 90, 50/50 with capturing, spark at 180.',
  source:
    'Community-consensus model of published Character Event Wish rates (0.6% / 90). Soft-pity ramp is the widely used +6% from pull 74. Not an official table.',
  notes: [
    '5-star base 0.6%. Soft pity starts at 74 with +6% per pull. Hard pity at 90.',
    'A 5-star is 50/50 featured vs standard. Losing arms a guarantee on the next 5-star.',
    '4-star 5.1%, hard pity 10. A 5-star also resets 4-star pity.',
    'Spark (Radiant Primo / similar) modelled as a 180-pull shop buy of the featured.',
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
