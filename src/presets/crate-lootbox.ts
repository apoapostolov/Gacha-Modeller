import type { Banner } from '../engine/types.ts';
import { item } from './helpers.ts';

/** Independent crate. No pity. Classic lootbox. */
export const crateLootbox: Banner = {
  id: 'crate-lootbox',
  name: 'Independent Crate',
  family: 'studied',
  blurb: 'No pity. Covert ~0.64%. The tail has no cap, so whales and unlucky players never meet.',
  source:
    'Independent rarity roll in the shape of CS-style weapon crates (coverts around 0.64%). No official table is copied; this is the no-pity control.',
  notes: [
    'Each crate is independent. There is no soft pity, hard pity, or spark.',
    'Expected crates to a covert is 1 / 0.0064 ≈ 156. The 95th percentile sits much higher.',
    'Use this as the gambling baseline when you add pity or social caps.',
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
