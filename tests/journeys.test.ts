import { describe, expect, it } from 'vitest';
import { traceTrial, representativeJourneys } from '../src/engine/journeys.ts';
import { runTrialBatch } from '../src/engine/batch.ts';
import { hardPityBaseline } from '../src/presets/index.ts';

describe('addressed journey traces', () => {
  it('replays the actual population trial rather than an unrelated illustration', () => {
    const goal = { type: 'first-featured' } as const; const options = { maxPulls: 100 };
    const rows = runTrialBatch(hardPityBaseline, goal, 10, 42, 'never', options);
    const journeys = representativeJourneys(hardPityBaseline, goal, 42, 'never', options, rows);
    expect(journeys.median?.result.pulls).toBe(rows[journeys.median!.trialIndex]!.pulls);
    expect(journeys.incomplete).toBeNull();
    expect(journeys.median?.events.at(-1)?.after.pulls).toBe(journeys.median?.result.pulls);
  });
  it('records before/after protection and does not stop execution at a trace limit', () => {
    const trace = traceTrial(hardPityBaseline, { type: 'budget', pulls: 10 }, 42, 0, 'never', { maxPulls: 10 }, 3);
    expect(trace.result.pulls).toBe(10); expect(trace.truncated).toBe(true); expect(trace.events).toHaveLength(3);
    expect(trace.totalEvents).toBe(20);
    expect(trace.events[1]).toMatchObject({ kind: 'draw', before: { pulls: 0 }, after: { pulls: 1 } });
  });
  it('exports an incomplete journey without treating it as unlucky completed acquisition', () => {
    const goal = { type: 'first-featured' } as const; const options = { maxPulls: 1 };
    const rows = runTrialBatch(hardPityBaseline, goal, 10, 42, 'never', options);
    const journeys = representativeJourneys(hardPityBaseline, goal, 42, 'never', options, rows);
    expect(journeys.incomplete?.result.termination).toBe('horizon');
    expect(journeys.incomplete?.result.goalAchieved).toBe(false);
  });
});
