import { solveExact } from '../engine/exact.ts';
import { comparisonUncertainty } from '../engine/uncertainty.ts';
import { compareCohorts, runExperiment, trialOptions, type CohortReport, type ExperimentReport } from './analysis.ts';
import { grid } from '../engine/analysis.ts';
import { compareEconomy, type EconomyReport } from './economy.ts';
import { runTrialBatch, reportFromSamples } from '../engine/batch.ts';
import type { SimReport, TrialSample, JourneyTrace, Representative, TrialOptions } from '../engine/types.ts';
import { simulatePoolShare, runMonteCarloTwoPickup, representativeJourneys, type PoolShareReport } from '../engine/index.ts';
import { PRESETS } from '../presets/index.ts';
import { importProject, semanticDiff, withSettings, type Change, type Project, type RunSettings } from '../project/project.ts';

export interface ComparisonReport {
  format: 'gacha-modeller-comparison'; version: 3 | 4; engineVersion: 'analysis-4' | 'economy-5'; randomPolicy: 'event-streams-v1';
  project: Project; settings: RunSettings; baseline: SimReport; candidate: SimReport; diff: Change[]; assumptions: string[]; completedAt: string;
  uncertainty: ReturnType<typeof comparisonUncertainty>;
  exact: { baseline: ReturnType<typeof solveExact>; candidate: ReturnType<typeof solveExact> };
  cohorts?: CohortReport; experiment?: ExperimentReport;
  economy?: EconomyReport;
  learning?: LearningScenarios;
  journeys: { baseline: Record<Representative, JourneyTrace | null>; candidate: Record<Representative, JourneyTrace | null> };
}
export interface LearningScenarios {
  poolShare?: PoolShareReport;
  coldCollection?: SimReport;
  dualPickup?: { trials: number; seed: number; spark: ReturnType<typeof runMonteCarloTwoPickup>; charge: ReturnType<typeof runMonteCarloTwoPickup> };
}
async function learningScenarios(project: Project, settings: RunSettings): Promise<LearningScenarios> {
  const model = project.baseline.model;
  const learning: LearningScenarios = {};
  if (model.mechanics?.poolSharePlayers && !model.targetRule && settings.actionMode === 'single' && settings.maxPulls >= 90) {
    const players = model.mechanics.poolSharePlayers;
    // Bound this supplementary lesson to 250,000 draws, even for a large guild.
    const trials = Math.min(settings.trials, 2500, Math.max(1, Math.floor(250000 / (players * 90 * 2))));
    learning.poolShare = simulatePoolShare(model, players, 90, trials, settings.seed);
  }
  if (model.mechanics?.collectionHeat && settings.goal.type === 'collection') {
    const cold = { ...model, mechanics: { ...model.mechanics, collectionHeat: 0 } };
    const options = trialOptions(settings);
    const rows: TrialSample[] = [];
    for (let start = 0; start < settings.trials; start += 100) {
      rows.push(...runTrialBatch(cold, settings.goal, Math.min(100, settings.trials - start), settings.seed, settings.sparkPolicy, options, start));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    learning.coldCollection = reportFromSamples(cold, settings.goal, settings.seed, settings.sparkPolicy, options, rows);
  }
  if ((model.charge || model.id.startsWith('blue-archive')) && settings.actionMode === 'single' && settings.maxPulls >= 400) {
    const trials = Math.min(settings.trials, 2500);
    learning.dualPickup = { trials, seed: settings.seed,
      spark: runMonteCarloTwoPickup(PRESETS.find((p) => p.id === 'blue-archive-spark')!, trials, settings.seed, 'if-needed'),
      charge: runMonteCarloTwoPickup(PRESETS.find((p) => p.id === 'blue-archive-charge')!, trials, settings.seed, 'never') };
  }
  return learning;
}
export async function compareProject(projectInput: Project, settings: RunSettings, progress: (completed: number, total: number) => void = () => {}): Promise<ComparisonReport> {
  const project = withSettings(await importProject(projectInput), settings);
  const options = trialOptions(settings);
  const rows: [TrialSample[], TrialSample[]] = [[], []];
  const models = [project.baseline.model, project.candidate.model];
  const total = settings.trials * 2 + (settings.analysis?.cohorts?.length ?? 0) * settings.trials * 2 + (settings.analysis?.experiment ? (grid(settings.analysis.experiment).length + 1) * settings.analysis.experiment.trials * 2 : 0) + (settings.economy ? settings.economy.trials * settings.economy.policies.length * 4 : 0);
  let completed = 0;
  const advance = (count: number) => { completed += count; progress(completed, total); };
  for (let side = 0; side < 2; side++) {
    for (let start = 0; start < settings.trials; start += 100) {
      const count = Math.min(100, settings.trials - start);
      rows[side]!.push(...runTrialBatch(models[side]!, settings.goal, count, settings.seed, settings.sparkPolicy, options, start));
      advance(count);
      // Keep progress messages timely and allow the worker event loop to service diagnostics.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  const exact = { baseline: solveExact(models[0]!, settings.goal, settings.sparkPolicy, options), candidate: solveExact(models[1]!, settings.goal, settings.sparkPolicy, options) };
  const cohorts = settings.analysis?.cohorts ? await compareCohorts(models, settings, settings.analysis.cohorts, advance) : undefined;
  const experiment = settings.analysis?.experiment ? await runExperiment(models, settings, settings.analysis.experiment, advance) : undefined;
  const economy = settings.economy ? await compareEconomy(models, settings, settings.economy, advance) : undefined;
  const learning = await learningScenarios(project, settings);
  const journeys = {
    baseline: representativeJourneys(models[0]!, settings.goal, settings.seed, settings.sparkPolicy, options, rows[0]),
    candidate: representativeJourneys(models[1]!, settings.goal, settings.seed, settings.sparkPolicy, options, rows[1]),
  };
  return {
    format: 'gacha-modeller-comparison', version: economy ? 4 : 3, engineVersion: economy ? 'economy-5' : 'analysis-4', randomPolicy: 'event-streams-v1', project,
    settings: structuredClone(settings),
    baseline: reportFromSamples(models[0]!, settings.goal, settings.seed, settings.sparkPolicy, options, rows[0]),
    candidate: reportFromSamples(models[1]!, settings.goal, settings.seed, settings.sparkPolicy, options, rows[1]),
    diff: semanticDiff(models[0], models[1]), completedAt: new Date().toISOString(),
    learning,
    journeys, exact, cohorts, experiment, economy, uncertainty: comparisonUncertainty(rows[0], rows[1]),
    assumptions: ['Scheduled transitions apply identically to both sides, at complete purchase boundaries. A switched destination is an embedded immutable model.', 'Salvage and crafting are resource flows. Representative journeys are conditional examples, stored to 200 events with a full final result.', settings.initialState ? 'Each trial starts with the declared existing progress. Purchases and earned/spent resources count from this run only.' : 'Main comparison starts from fresh player state; optional groups are reported separately with explicit shares.', 'Same goal, seed, horizon, spark policy and action mode on both models.', 'Common random streams indexed by trial, purchased pull and event; model metadata does not change random streams.', 'Whole packs are purchased; first attainment may occur before their final slot.', 'Currency consumed is a resource measure, not revenue, profit, engagement or retention.', '95% simulation intervals describe sampling noise under these fixed rules. Wilson/Bonferroni score bounds are approximate; mean-difference intervals use large-sample normal estimates and are omitted for fewer than 30 or constant paired observations. Independent references ignore pairing and are diagnostic only. They do not quantify real-world behavioural uncertainty.'],
  };
}
