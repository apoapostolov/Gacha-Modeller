import type { PoolItem, Rarity } from '../engine/types.ts';

export const five: Rarity = { id: 'five', name: '5-star', baseRate: 0.006, color: '#d4b483' };
export const four: Rarity = { id: 'four', name: '4-star', baseRate: 0.051, color: '#7ea36a' };
export const three: Rarity = { id: 'three', name: '3-star', baseRate: 0, color: '#6b6458' };

export function item(
  id: string,
  name: string,
  rarity: string,
  weight: number,
  featured = false,
): PoolItem {
  return { id, name, rarity, weight, featured };
}
