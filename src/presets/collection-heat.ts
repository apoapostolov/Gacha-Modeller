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
  blurb: '16 equal stickers. Ones you lack get +40% weight. The set is the prize.',
  source: 'original',
  notes: [
    'Every pull is one sticker. No rarity ladder. Filling the album is the whole product.',
    'Unowned stickers take weight × 1.4. Dupes get colder as the page fills in.',
    'Store copy can call it fair: you are more likely to get what you still lack. It is still a completionist hook.',
    'Goal is the full album. The lab also runs heat 0 so you can see the duplicate tax you took off.',
  ],
  pullCost: { amount: 1, currency: 'pack' },
  rarities: [{ id: 'sticker', name: 'Sticker', baseRate: 1, color: '#d4b483' }],
  pity: [],
  items: stickers,
  mechanics: { collectionHeat: 0.4 },
};
