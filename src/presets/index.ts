import type { Banner } from '../engine/types.ts';
import { audienceSpark } from './audience-spark.ts';
import { blueArchiveCharge, blueArchiveSpark } from './blue-archive.ts';
import { collectionHeat } from './collection-heat.ts';
import { crateLootbox } from './crate-lootbox.ts';
import { fateGrandOrder } from './fate-grand-order.ts';
import { genshinCharacter } from './genshin-character.ts';
import { hardPityBaseline } from './hard-pity-baseline.ts';
import { poolShare } from './pool-share.ts';

export const PRESETS: Banner[] = [
  genshinCharacter,
  fateGrandOrder,
  blueArchiveSpark,
  blueArchiveCharge,
  crateLootbox,
  hardPityBaseline,
  poolShare,
  collectionHeat,
  audienceSpark,
];

export function presetById(id: string): Banner {
  const found = PRESETS.find((banner) => banner.id === id);
  if (!found) throw new Error(`unknown banner ${id}`);
  return found;
}

export {
  audienceSpark,
  blueArchiveCharge,
  blueArchiveSpark,
  collectionHeat,
  crateLootbox,
  fateGrandOrder,
  genshinCharacter,
  hardPityBaseline,
  poolShare,
};
