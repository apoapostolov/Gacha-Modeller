import type { Banner } from '../engine/types.ts';
import { genshinCharacter } from './genshin-character.ts';

/**
 * Original social mechanic: a guild shares one 5-star pity sequence.
 * Same total pulls produce more 5-stars than N fragmented solo cycles
 * because leftover pity is not thrown away at session end.
 */
export const poolShare: Banner = {
  ...genshinCharacter,
  id: 'pool-share',
  name: 'Pool Share (guild pity)',
  family: 'original',
  blurb: 'The Genshin-like rates, with one shared 5-star pity counter for four players.',
  source: 'original',
  notes: [
    'Players share one pity counter, so players who do not spend can benefit from progress made by those who do.',
    'At the same total pull count, four players sharing pity get more 5-stars on average than four players with separate counters. Shared pity preserves progress that would otherwise be lost between sessions.',
    'By default, the player who rolls an item keeps it. The group needs a separate rule if someone else should be able to claim it.',
    'The comparison uses four players with 90 pulls each, once with shared pity and once with separate counters.',
  ],
  mechanics: { poolSharePlayers: 4 },
};
