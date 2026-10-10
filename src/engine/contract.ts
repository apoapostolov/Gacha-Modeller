import type { Banner, Goal, TrialOptions } from './types.ts';

export function modelSchemaVersion(model: Banner): 1 | 2 {
  return model.persistence || model.targetRule || model.duplicates || model.provenance || model.featured?.once !== undefined || model.spark?.choice || model.spark?.items || model.spark?.reset?.targetProgress !== undefined || model.multiPull?.slots || model.multiPull?.sampling || model.multiPull?.correlation ? 2 : 1;
}
export function advancedRun(goal: Goal, options: TrialOptions): boolean {
  return goal.type === 'targets' || options.targetId !== undefined || options.exchangeItemId !== undefined || options.craftPolicy !== undefined || options.transitions !== undefined;
}
