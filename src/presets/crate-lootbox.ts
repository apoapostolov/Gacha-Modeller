import type { Banner } from '../engine/types.ts';
import { item } from './helpers.ts';

/** Independent crate. No pity. Classic lootbox. */
export const crateLootbox: Banner = {
  id: 'crate-lootbox',
  name: 'Independent Crate',
  family: 'studied',
  blurb: 'No pity. Covert drops about 0.64% of the time.',
  source:
    'Based on independent rarity rolls in CS-style weapon crates, where Covert drops are around 0.64%. No live table is copied; this is the no-pity baseline.',
  notes: [
    'Each crate is an independent roll, with no soft pity, hard pity, or spark.',
    'At a 0.64% rate, it takes about 156 crates on average to get a Covert. The 95th percentile is much higher.',
    'Use this as a tougher baseline when you test pity or social caps.',
  ],
  pullCost: { amount: 2.5, currency: 'usd-like' },
  rarities: [
    { id: 'covert', name: 'Covert', baseRate: 0.0064, color: '#e05d38' },
    { id: 'classified', name: 'Classified', baseRate: 0.032, color: '#d4b483' },
    { id: 'restricted', name: 'Restricted', baseRate: 0.16, color: '#7ea36a' },
    { id: 'milspec', name: 'Mil-spec', baseRate: 0, color: '#6b6458' },
  ],
  pity: [],
  featured: { rarity: 'covert', chance: 1, capturing: false },
  items: [
    item('covert-a', 'Covert skin', 'covert', 1, true),
    item('class-a', 'Classified skin', 'classified', 1),
    item('rest-a', 'Restricted skin', 'restricted', 1),
    item('mil-a', 'Mil-spec skin', 'milspec', 1),
  ],
};
