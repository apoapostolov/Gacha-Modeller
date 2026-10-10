import { createState } from './pull.ts';
import type { Banner, InitialState, PullState } from './types.ts';

const fields = ['counters', 'featuredArmed', 'sinceFeatured', 'sparkProgress', 'targetProgress', 'onceGuaranteeUsed', 'inventory', 'salvage'];
export function validateInitial(initial: unknown, model?: Banner): asserts initial is InitialState {
  if (!initial || typeof initial !== 'object' || Array.isArray(initial)) throw new Error('initialState: Provide a progress object.');
  const values = initial as Record<string, unknown>;
  for (const [field, value] of Object.entries(values)) {
    if (!fields.includes(field)) throw new Error(`initialState.${field}: Unsupported progress field.`);
    if (field === 'featuredArmed' || field === 'onceGuaranteeUsed') {
      if (typeof value !== 'boolean') throw new Error(`initialState.${field}: Use true or false.`);
    } else if (field === 'counters' || field === 'inventory') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`initialState.${field}: Provide item or rarity counts.`);
      for (const [id, count] of Object.entries(value)) {
        if (!Number.isSafeInteger(count) || (count as number) < 0 || (count as number) > 100000) throw new Error(`initialState.${field}.${id}: Use a whole count from 0 to 100,000.`);
        if (model && !(field === 'counters' ? model.rarities : model.items).some((entry) => entry.id === id)) throw new Error(`initialState.${field}.${id}: This ID is missing from ${model.name}.`);
        if (field === 'inventory' && model?.duplicates && (count as number) > model.duplicates.cap) throw new Error(`initialState.inventory.${id}: Starting copies exceed the duplicate cap.`);
      }
    } else if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100000 || (field !== 'sparkProgress' && !Number.isSafeInteger(value))) {
      throw new Error(`initialState.${field}: Use ${field === 'sparkProgress' ? 'a number' : 'a whole count'} from 0 to 100,000.`);
    }
  }
}
/** Historical progress is carried in; purchase and earned/spent ledgers start at zero. */
export function stateFromInitial(model: Banner, targetId?: string, initial?: InitialState): PullState {
  const state = createState(model, targetId);
  if (!initial) return state;
  Object.assign(state.counters, initial.counters);
  for (const field of ['featuredArmed', 'sinceFeatured', 'sparkProgress', 'targetProgress', 'onceGuaranteeUsed', 'salvage'] as const) {
    if (initial[field] !== undefined) (state as unknown as Record<string, unknown>)[field] = initial[field];
  }
  Object.assign(state.inventory, initial.inventory);
  state.owned = new Set(Object.keys(state.inventory).filter((id) => state.inventory[id]! > 0));
  return state;
}
