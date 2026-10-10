import type { Banner } from '../engine/types.ts';
import { item } from './helpers.ts';

export const hardPityBaseline: Banner = {
  id: 'hard-pity-baseline',
  name: '1% + Hard Pity 100',
  family: 'studied',
  blurb: 'A 1% chase rate with hard pity at 100. No rate ramp or 50/50.',
  source: 'A textbook 1% geometric drop rate with a hard cap. Useful as a baseline for comparing rate ramps and featured guarantees.',
  notes: [
    'Without pity, a 1% drop takes 100 pulls on average. Guaranteeing it by pull 100 cuts the long tail and brings the average below 100.',
    'There is no 50/50: every chase-rarity hit is the featured prize.',
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
