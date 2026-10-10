import { createTrialRng } from './rng.ts';
import { runTrial } from './simulate.ts';
import type { Banner, Goal, JourneyEvent, JourneyTrace, Representative, SparkPolicy, TrialOptions, TrialSample } from './types.ts';

export function traceTrial(model: Banner, goal: Goal, seed: number, trialIndex: number, sparkPolicy: SparkPolicy, options: TrialOptions, limit = 200): JourneyTrace {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 2000) throw new Error('trace.limit: Use 1 to 2000 events.');
  const events: JourneyEvent[] = []; let totalEvents = 0;
  const result = runTrial(model, goal, createTrialRng(seed, trialIndex), sparkPolicy, options, (event) => { totalEvents++; if (events.length < limit) events.push(event); });
  return { engineVersion: options.initialState ? 'analysis-4' : 'mechanics-3', randomPolicy: 'event-streams-v1', seed, trialIndex, model: structuredClone(model), goal: structuredClone(goal), sparkPolicy, options: structuredClone(options), result, events, totalEvents, truncated: totalEvents > limit };
}

/** Completed-subgroup percentiles plus the first incomplete population member. */
export function representativeJourneys(model: Banner, goal: Goal, seed: number, sparkPolicy: SparkPolicy, options: TrialOptions, rows: readonly TrialSample[]): Record<Representative, JourneyTrace | null> {
  const completed = rows.filter((row) => row.goalAchieved).sort((a, b) => a.attainmentPulls! - b.attainmentPulls! || a.trialIndex! - b.trialIndex!);
  const representative = (q: number) => completed[Math.max(0, Math.ceil(completed.length * q) - 1)];
  const chosen = { lucky: representative(.05), median: representative(.5), unlucky: representative(.95), incomplete: rows.find((row) => !row.goalAchieved) };
  return Object.fromEntries(Object.entries(chosen).map(([label, row]) => [label, row ? traceTrial(model, goal, seed, row.trialIndex!, sparkPolicy, options) : null])) as Record<Representative, JourneyTrace | null>;
}
