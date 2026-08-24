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
  blurb: 'Genshin-like rates, but 4 players share one 5-star pity bar.',
  source: 'original',
  notes: [
    'Marketing pitch: "Pull together. Pity is shared." F2P rides a whale bar.',
    'The group 5-star rate at a fixed total pull count beats N solo players because leftover pity is not wasted N times.',
    'Fairness is the cost. One copy still goes to whoever rolled the hit unless you add a claim rule.',
    'Run the social comparison: 4 players × 90 pulls, shared vs solo.',
  ],
  mechanics: { poolSharePlayers: 4 },
};
