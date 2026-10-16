import type { Banner, InitialState } from '../engine/types.ts';
import { analysisBudget, parameters, type Cohort, type Experiment, type Objective } from '../engine/analysis.ts';
import type { RunSettings } from '../project/project.ts';
import { Help } from './Help.tsx';

function nearby(spec: ReturnType<typeof parameters>[number]) {
  const value = spec.integer ? Math.max(spec.min, spec.current - 1) : Number((spec.current * .9).toPrecision(12));
  return value === spec.current ? Math.min(spec.max, spec.current + 1) : value;
}
export function AnalysisSettings({ value, models, onChange }: { value: RunSettings; models: Banner[]; onChange: (settings: RunSettings) => void }) {
  const analysis = value.analysis ?? {}, candidate = models[1]!, specs = parameters(candidate);
  const update = (next: typeof analysis) => onChange({ ...value, analysis: Object.keys(next).length ? next : undefined });
  const groups = analysis.cohorts ?? [];
  const group = (index: number, change: Partial<Cohort>) => update({ ...analysis, cohorts: groups.map((row, i) => i === index ? { ...row, ...change } : row) });
  const initial = (index: number, change: Partial<InitialState>) => group(index, { initialState: { ...groups[index]!.initialState, ...change } });
  const numeric = (label: string, number: number, change: (n: number) => void, max = 100000, step: number | string = 1) => <label className="field">{label}<input type="number" min={0} max={max} step={step} value={Number.isNaN(number) ? '' : number} onChange={(e) => change(e.target.valueAsNumber)} /></label>;
  const experiment = analysis.experiment;
  const changeExperiment = (patch: Partial<Experiment>) => update({ ...analysis, experiment: { ...experiment!, ...patch } });
  return <div className="analysis-settings">
    <details className="editor-section"><summary>Compare players with progress already earned</summary>
      <p className="run-note">Add groups of players who have already drawn, earned exchange points, or collected rewards. The results show each group and a combined estimate based on its share of your player population. <Help label="Starting player progress">Up to four groups, with the same initial progress on both models. Each group gets the full declared player count. Shares are normalized for the combined estimate. Historical purchases and earned resources do not count toward spending in this run.</Help></p>
      {experiment && <p className="run-note">Turn off the parameter experiment before adding player groups.</p>}
      {groups.map((row, index) => <fieldset className="analysis-group" key={row.id}><legend>{row.name || `Group ${index + 1}`}</legend>
        <div className="settings-fields"><label className="field">Group {index + 1} name<input value={row.name} maxLength={120} onChange={(e) => group(index, { name: e.target.value })} /></label>{numeric(`Group ${index + 1} share of players`, row.weight, (weight) => group(index, { weight }), 100000, 'any')}</div>
        <p className="field-hint">Shares are relative weights. For example, 3 for this group and 1 for another means 75% of players are in this group.</p>
        <details><summary>Enter what {row.name || `group ${index + 1}`} has already earned</summary><p className="field-hint">Set the progress and rewards players have before this comparison begins. Leave values at zero for a fresh start.</p><div className="settings-fields">
          {candidate.rarities.filter((tier) => candidate.pity.some((p) => p.rarity === tier.id)).map((tier) => <div key={tier.id}>{numeric(`${row.name} · ${tier.name} pity`, row.initialState.counters?.[tier.id] ?? 0, (n) => initial(index, { counters: { ...row.initialState.counters, [tier.id]: n } }))}</div>)}
          {numeric(`${row.name} · pulls since featured`, row.initialState.sinceFeatured ?? 0, (sinceFeatured) => initial(index, { sinceFeatured }))}
          {numeric(`${row.name} · exchange points`, row.initialState.sparkProgress ?? 0, (sparkProgress) => initial(index, { sparkProgress }), 100000, 'any')}
          {numeric(`${row.name} · selected target progress`, row.initialState.targetProgress ?? 0, (targetProgress) => initial(index, { targetProgress }))}
          {numeric(`${row.name} · available shards`, row.initialState.salvage ?? 0, (salvage) => initial(index, { salvage }))}
        </div><label className="check-field"><input type="checkbox" checked={row.initialState.featuredArmed ?? false} onChange={(e) => initial(index, { featuredArmed: e.target.checked })} />{row.name} · featured capture already armed</label><label className="check-field"><input type="checkbox" checked={row.initialState.onceGuaranteeUsed ?? false} onChange={(e) => initial(index, { onceGuaranteeUsed: e.target.checked })} />{row.name} · one-time guarantee already used</label>
        <p className="field-hint">Starting copies can satisfy a goal before any purchase. Only IDs present in both models are accepted.</p><div className="settings-fields">{candidate.items.map((item) => <div key={item.id}>{numeric(`${row.name} · ${item.name} starting copies`, row.initialState.inventory?.[item.id] ?? 0, (n) => initial(index, { inventory: { ...row.initialState.inventory, [item.id]: n } }))}</div>)}</div></details>
        <button className="text-button" onClick={() => { const remaining = groups.filter((_, i) => i !== index); update({ ...analysis, cohorts: remaining.length ? remaining : undefined }); }}>Remove {row.name || 'group'}</button>
      </fieldset>)}
      <button className="secondary" disabled={groups.length >= 4 || !!experiment} onClick={() => { let suffix = 1; while (groups.some((g) => g.id === `group-${suffix}`)) suffix++; update({ ...analysis, cohorts: [...groups, { id: `group-${suffix}`, name: `Group ${suffix}`, weight: 1, initialState: {} }] }); }}>Add player group</button>
    </details>
    <details className="editor-section"><summary>Test changes to candidate settings</summary>
      <p className="run-note">Try a small set of values for one or two candidate settings, such as the price or reward chance. The comparison shows which tested values balance completion and spending. A second run with a different random sequence checks the results. <Help label="How setting experiments work">One or two settings, with two to seven values each, up to 49 combinations. The first random seed selects tradeoffs; the second checks those same combinations without selecting a new winner. This is a limited search of the values you enter, not a search of every possible design or a profit forecast.</Help></p>
      <label className="check-field"><input type="checkbox" disabled={groups.length > 0} checked={!!experiment} onChange={(e) => update({ ...analysis, experiment: e.target.checked ? { axes: [{ parameter: 'price', values: [candidate.pullCost.amount, candidate.pullCost.amount ? candidate.pullCost.amount * 1.1 : 1] }], trials: 200, validationSeed: (value.seed + 1) >>> 0, objectives: ['cost', 'attainment'], minAttainment: .9, maxCost: 100000 } : undefined })} />Compare selected candidate settings</label>
      {groups.length > 0 && <p className="field-hint">Remove player groups to explore one clearly defined population.</p>}
      {experiment && <>
        {experiment.axes.map((axis, index) => <fieldset className="analysis-group" key={index}><legend>Candidate setting {index + 1}</legend><label className="field">Choose a setting to change<select value={axis.parameter} onChange={(e) => { const spec = specs.find((p) => p.id === e.target.value)!; changeExperiment({ axes: experiment.axes.map((a, i) => i === index ? { parameter: spec.id, values: [spec.current, nearby(spec)] } : a) }); }}>{specs.map((spec) => <option key={spec.id} value={spec.id} disabled={experiment.axes.some((a, i) => i !== index && a.parameter === spec.id)}>{spec.label}</option>)}</select></label>
          <label className="field">Values to compare<input key={axis.parameter} defaultValue={axis.values.join(', ')} aria-describedby={`axis-hint-${index}`} onChange={(e) => changeExperiment({ axes: experiment.axes.map((a, i) => i === index ? { ...a, values: e.target.value.split(',').map((part) => part.trim() ? Number(part) : NaN) } : a) })} /></label><p id={`axis-hint-${index}`} className="field-hint">Enter 2 to 7 values separated by commas, such as {axis.parameter === 'featured' || axis.parameter.startsWith('rate:') ? '0.01, 0.02, 0.03' : axis.parameter === 'price' ? '0.8, 1, 1.2' : '60, 80, 100'}. For a chance, enter a decimal from 0 to 1: 0.02 means 2%.</p>
          {experiment.axes.length > 1 && <button className="text-button" onClick={() => changeExperiment({ axes: experiment.axes.filter((_, i) => i !== index) })}>Remove parameter {index + 1}</button>}
        </fieldset>)}
        {experiment.axes.length === 1 && specs.length > 1 && <button className="secondary" onClick={() => { const spec = specs.find((p) => p.id !== experiment.axes[0]!.parameter)!; changeExperiment({ axes: [...experiment.axes, { parameter: spec.id, values: [spec.current, nearby(spec)] }] }); }}>Add second parameter</button>}
        <div className="settings-fields">{numeric('Players simulated for each value', experiment.trials, (trials) => changeExperiment({ trials }), 2000)}{numeric('Second run seed', experiment.validationSeed, (validationSeed) => changeExperiment({ validationSeed }), 4294967295)}</div>
        <p className="field-hint">The second seed must differ from the main run. This checks whether the same settings look similar with a different random sample.</p>
        <fieldset className="analysis-group"><legend>What should the comparison balance?</legend><p className="field-hint">Choose at least two measures. A selected setting is a tradeoff when no other tested setting improves every chosen measure.</p>{([['cost', 'Use less in-game currency'], ['attainment', 'Help more players reach the goal'], ['pulls', 'Require fewer reward draws']] as [Objective, string][]).map(([key, label]) => <label className="check-field" key={key}><input type="checkbox" checked={experiment.objectives.includes(key)} onChange={(e) => changeExperiment({ objectives: e.target.checked ? [...experiment.objectives, key] : experiment.objectives.filter((o) => o !== key) })} />{label}</label>)}</fieldset>
        <div className="settings-fields">{numeric('Minimum share of players reaching the goal (%)', experiment.minAttainment * 100, (minAttainment) => changeExperiment({ minAttainment: minAttainment / 100 }), 100, 'any')}{numeric(`Maximum average in-game currency used (${candidate.pullCost.currency})`, experiment.maxCost, (maxCost) => changeExperiment({ maxCost }), 1e10, 'any')}</div>
        <p className="field-hint">Limits apply to simulated averages. Check the validation interval before treating a setting as acceptable.</p>
      </>}
    </details>
    {(groups.length > 0 || experiment) && <p className="run-note">Additional analysis: up to {analysisBudget(analysis, value).toLocaleString()} draws. Limit: 10 million. Reduce the horizon, trials or settings if needed.</p>}
  </div>;
}
