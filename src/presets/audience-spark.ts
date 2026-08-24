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
  blurb: 'Streamer overlay. Viewers add 0.25 spark progress per pull, so 180 becomes ~144.',
  source: 'original',
  notes: [
    'Same 50/50 banner as Genshin-like, spark still 180.',
    'Each pull fills 1.25 spark ticks. The shop buy lands near 144 pulls if the featured never dropped.',
    'Marketing: the chat is on the bar. Watching is a contribution. Pulling is a public event.',
    'This subsidises the tail without changing the base rate, which reads as generous and still sells pulls.',
  ],
  mechanics: { audienceSparkPerPull: 0.25 },
};
