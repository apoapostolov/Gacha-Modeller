import type { Banner } from '../engine/types.ts';
import { item } from './helpers.ts';

/** FGO-like: 1% SSR, no 50/50 capturing, 330-pull featured pity. */
export const fateGrandOrder: Banner = {
  id: 'fate-grand-order',
  name: 'FGO-like Story Banner',
  family: 'studied',
  blurb: '1% SSR, 0.8% on the rate-up, no catch-up coin, pity at 330.',
  source:
    'Fate/Grand Order published 1% SSR / 3% SR, plus the 2022 330-summon pity for the rate-up SSR. Single-rate-up modelled as 80% of SSR hits.',
  notes: [
    'SSR is 1%. One rate-up takes 80% of those hits (0.8% featured, 0.2% someone else).',
    'No 50/50 catch-up. An off-banner SSR does not promise you the next one.',
    'At 330 summons the rate-up SSR is forced. That is a banner pity, not a rarity ramp.',
    'An 11-pull is a shop bundle. The engine still rolls one summon at a time.',
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
