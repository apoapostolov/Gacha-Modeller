import type { Banner } from '../engine/types.ts';
import { item } from './helpers.ts';

/** FGO-like: 1% SSR, no 50/50 capturing, 330-pull featured pity. */
export const fateGrandOrder: Banner = {
  id: 'fate-grand-order',
  name: 'FGO-like Story Banner',
  family: 'studied',
  blurb: 'A 1% SSR rate, with a 0.8% rate-up and a guarantee at 330 summons. An off-banner SSR does not guarantee the next one.',
  source:
    "Based on Fate/Grand Order's published rates (1% SSR, 3% SR) and the 330-summon rate-up pity added in 2022. This model gives a single rate-up 80% of SSR hits.",
  notes: [
    'SSR drops at 1%. A single rate-up gets 80% of those drops: 0.8% featured and 0.2% off-banner.',
    'An off-banner SSR does not guarantee that the next SSR will be the rate-up.',
    'At 330 summons, the rate-up SSR is guaranteed. The SSR rate does not ramp before then.',
    'The 11-pull is a shop bundle; the simulator still resolves it as 11 individual summons.',
  ],
  pullCost: { amount: 3, currency: 'saint-quartz-like' },
  rarities: [
    { id: 'ssr', name: 'SSR', baseRate: 0.01, color: '#d4b483' },
    { id: 'sr', name: 'SR', baseRate: 0.03, color: '#7ea36a' },
    { id: 'r', name: 'R', baseRate: 0, color: '#6b6458' },
  ],
  pity: [],
  featured: { rarity: 'ssr', chance: 0.8, capturing: false, hardAt: 330 },
  spark: { cost: 330 },
  multiPull: { size: 11 },
  items: [
    item('rate-ssr', 'Rate-up SSR', 'ssr', 1, true),
    item('off-ssr', 'Off-banner SSR', 'ssr', 1),
    item('sr-a', 'SR A', 'sr', 1),
    item('r-a', 'R junk', 'r', 1),
  ],
};
