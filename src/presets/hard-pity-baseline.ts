import type { Banner } from '../engine/types.ts';
import { item } from './helpers.ts';

export const hardPityBaseline: Banner = {
  id: 'hard-pity-baseline',
  name: '1% + Hard Pity 100',
  family: 'studied',
  blurb: 'Teaching control. 1% chase, hard pity at 100, no ramp, no coin flip.',
  source: 'Textbook geometric-plus-cap. Useful when comparing ramps and capturing.',
  notes: [
    'With no pity, average pulls to the chase is 100. Hard pity at 100 cuts the tail, so the average drops below 100.',
    'No 50/50. Every chase-rarity hit is the thing you wanted.',
  ],
  pullCost: { amount: 1, currency: 'ticket' },
  rarities: [
    { id: 'chase', name: 'Chase', baseRate: 0.01, color: '#d4b483' },
    { id: 'junk', name: 'Junk', baseRate: 0, color: '#6b6458' },
  ],
  pity: [{ rarity: 'chase', hardAt: 100 }],
  featured: { rarity: 'chase', chance: 1, capturing: false },
  items: [
    item('chase', 'Chase prize', 'chase', 1, true),
    item('junk', 'Junk', 'junk', 1),
  ],
};
