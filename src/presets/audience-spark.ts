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
  blurb: 'Streamer overlay. Chat adds 0.25 spark per pull, so 180 lands near 144.',
  source: 'original',
  notes: [
    'Same 50/50 banner as Genshin-like. Spark cost is still 180.',
    'Each pull fills 1.25 spark ticks. If the featured never drops, the shop buy is around 144.',
    'Chat sits on the bar. Watching counts. Pulling is a public event.',
    'You cheapen the tail without touching the base rate. It reads generous and still sells pulls.',
  ],
  mechanics: { audienceSparkPerPull: 0.25 },
};
