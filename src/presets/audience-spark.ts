import type { Banner } from '../engine/types.ts';
import { genshinCharacter } from './genshin-character.ts';

/**
 * Original marketing mechanic: viewers fund the spark bar.
 * Each pull also grants 0.25 extra spark progress from the audience.
 */
export const audienceSpark: Banner = {
  ...genshinCharacter,
  id: 'audience-spark',
  name: 'Audience Spark',
  family: 'original',
  blurb: 'A stream overlay adds 0.25 spark per pull from the audience, bringing the 180-point guarantee to about 144 pulls.',
  source: 'original',
  notes: [
    'Uses the same 50/50 and 180-pull spark as the Genshin-like model.',
    'Each pull adds 1.25 points to the spark meter. If you miss the featured item each time, the 180-point spark arrives at about pull 144.',
    'The audience adds progress to the spark meter while viewers pull.',
    'This lowers the cost of a long dry streak without changing the base drop rate.',
  ],
  mechanics: { audienceSparkPerPull: 0.25 },
};
