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
  blurb: '16 equal stickers. Unowned pieces gain +40% weight. Completing the set is the product.',
  source: 'original',
  notes: [
    'Every pull is one sticker. No rarity ladder. The set is the prize.',
    'Unowned items take weight × 1.4. Duplicates get relatively colder as the album fills.',
    'This is a completionist FOMO lever that still looks "fair" in the store copy: you are more likely to get what you lack.',
    'Goal is album complete. Compare against the same pool with heat 0 to see the duplicate tax you removed.',
  ],
  pullCost: { amount: 1, currency: 'pack' },
  rarities: [{ id: 'sticker', name: 'Sticker', baseRate: 1, color: '#d4b483' }],
  pity: [],
  items: stickers,
  mechanics: { collectionHeat: 0.4 },
};
