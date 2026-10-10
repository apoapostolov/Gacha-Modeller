import type { Banner } from '../engine/types.ts';
import { item } from './helpers.ts';

const stickers = Array.from({ length: 16 }, (_, i) =>
  item(`sticker-${i + 1}`, `Sticker ${i + 1}`, 'sticker', 1),
);

/** Original completionist marketing: missing set pieces get hotter. */
export const collectionHeat: Banner = {
  id: 'collection-heat',
  name: 'Collection Heat',
  family: 'original',
  blurb: 'The set has 16 stickers. Missing stickers get 40% more weight.',
  source: 'original',
  notes: [
    "Each pull gives you one sticker. There is no rarity ladder; the goal is to fill the album.",
    'Unowned stickers get 1.4 times their base weight, so the more of the set you own, the less often you draw duplicates.',
    'This can be presented as fair because you are more likely to get a sticker you are missing. It still encourages players to complete the set.',
    'The goal is a full album. The simulator also runs the pool with heat turned off, so you can compare duplicate rates.',
  ],
  pullCost: { amount: 1, currency: 'pack' },
  rarities: [{ id: 'sticker', name: 'Sticker', baseRate: 1, color: '#d4b483' }],
  pity: [],
  items: stickers,
  mechanics: { collectionHeat: 0.4 },
};
