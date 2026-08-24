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
  blurb: 'Genshin-like rates, but four of you share one 5-star bar.',
  source: 'original',
  notes: [
    'The pitch is "pull together, pity is shared." A free player can ride a whale bar.',
    'At the same total pulls, the group gets more 5-stars than four solos, because leftover pity is not thrown away four times.',
    'Fairness still costs you. The copy goes to whoever rolled it unless you add a claim rule.',
    'The comparison uses 4 players × 90 pulls, shared vs solo.',
  ],
  mechanics: { poolSharePlayers: 4 },
};
