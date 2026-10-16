import type { Banner } from '../engine/index.ts';
import { useEffect, useRef } from 'react';
import { AnalysisSettings } from './AnalysisSettings.tsx';
import { JourneySettings } from './JourneySettings.tsx';
import { EconomySettings } from './EconomySettings.tsx';
import type { RunSettings as Settings } from '../project/project.ts';
import { Drawer } from './Drawer.tsx';
import { Help } from './Help.tsx';
export function RunSettings({ value, onChange, onClose, onRun, packAvailable, busy, error, models, comparing = true }: { value: Settings; onChange: (next: Settings) => void; onClose: () => void; onRun: () => void; packAvailable: boolean; models: Banner[]; busy: boolean; error: string | null; comparing?: boolean }) {
  const errorSummary = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorSummary.current?.focus(); }, [error]);
  const number = (label: string, key: 'trials' | 'seed' | 'maxPulls', min: number, max: number, hint: string, short: string) => <div className="field"><div className="field-heading"><label htmlFor={`setting-${key}`}>{label}</label><Help label={label}>{hint}</Help></div><input id={`setting-${key}`} type="number" min={min} max={max} aria-describedby={`hint-${key}`} step={1} value={Number.isNaN(value[key]) ? '' : value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.valueAsNumber })} /><p id={`hint-${key}`} className="field-hint">{short}</p></div>;
  const goalHint: Record<Settings['goal']['type'], string> = {
    'first-featured': 'A player succeeds after receiving at least one featured reward.',
    copies: 'A player succeeds after receiving the selected number of featured copies. Copies may be the same reward.',
    'unique-featured': 'A player succeeds after receiving the selected number of different featured rewards.',
    targets: 'A player succeeds after collecting every named reward in the requested quantity.',
    collection: 'A player succeeds after collecting every reward in the model.',
    budget: 'Compare how many rewards players receive within the same fixed number of draws.',
  };
  return <Drawer title="Simulation settings" onClose={onClose} footer={<><span className="run-note">Shared simulation settings</span><button className="primary" disabled={busy} onClick={onRun}>{comparing ? 'Compare rule sets' : 'Simulate current rules'}</button></>}>
    <p className="run-note">Choose what players are chasing and how many players to simulate. Comparisons use these same settings for both rule sets.</p>
    {error && <p role="alert" tabIndex={-1} ref={errorSummary} className="run-error">{error}</p>}
    {value.initialState && <p className="run-note">This imported run starts with existing player progress. <Help label="Imported starting state">{JSON.stringify(value.initialState)}</Help><button className="text-button" onClick={() => onChange({ ...value, initialState: undefined })}>Clear starting progress</button></p>}
    <div className="settings-fields" data-ui-stack>
      {number('How many players?', 'trials', 1, 50000, 'The app repeats each model for this many simulated players. More players make the estimate steadier, but take longer. Maximum: 50,000.', 'Each simulated player follows the same starting rules and stops when the goal or draw limit is reached.')}
      {number('Repeatable random seed', 'seed', 0, 4294967295, 'The seed sets the random sequence. With the same models, settings and engine version, it reproduces the same run. Change it to see how results vary between runs.', 'Keep the same seed to repeat a run; change it to sample a different set of outcomes.')}
      {number('Maximum draws per player', 'maxPulls', 1, 100000, 'Players who have not reached the goal by this limit stop here and remain included in the results. A pack counts as one action but uses every reward slot in the pack.', 'This is the longest a simulated player can keep drawing.')}
      <div className="field"><label htmlFor="setting-goal">What counts as reaching the goal?</label><select id="setting-goal" value={value.goal.type} onChange={(e) => {
        const type = e.target.value as Settings['goal']['type'];
        onChange({ ...value, goal: type === 'budget' ? { type, pulls: 90 } : type === 'copies' || type === 'unique-featured' ? { type, count: 1 } : type === 'targets' ? { type, targets: models[1]?.items[0] ? [{ itemId: models[1].items[0].id, count: 1 }] : [] } : { type } });
      }}><option value="first-featured">First featured reward</option><option value="copies">Featured reward copies</option><option value="unique-featured">Different featured rewards</option><option value="targets">Named rewards and quantities</option><option value="collection">Complete catalogue</option><option value="budget">Fixed draw budget</option></select><p className="field-hint">{goalHint[value.goal.type]}</p></div>
      {(value.goal.type === 'copies' || value.goal.type === 'unique-featured') && <div className="field"><label htmlFor="setting-count">Target count</label><input id="setting-count" type="number" min={1} step={1} value={Number.isNaN(value.goal.count) ? '' : value.goal.count} onChange={(e) => onChange({ ...value, goal: { type: value.goal.type as 'copies' | 'unique-featured', count: e.target.valueAsNumber } })} /></div>}
      {value.goal.type === 'budget' && <div className="field"><label htmlFor="setting-budget">Pull budget</label><input id="setting-budget" type="number" min={0} step={1} value={Number.isNaN(value.goal.pulls) ? '' : value.goal.pulls} onChange={(e) => onChange({ ...value, goal: { type: 'budget', pulls: e.target.valueAsNumber } })} /></div>}
      <div className="field"><div className="field-heading"><label htmlFor="setting-action">How rewards are drawn</label><Help label="Draw action">Both models need a pack rule to compare packs. Pack sizes may differ. The chart counts the individual reward slots players receive.</Help></div><select id="setting-action" value={value.actionMode} onChange={(e) => onChange({ ...value, actionMode: e.target.value as Settings['actionMode'] })}><option value="single">One reward at a time</option><option value="pack" disabled={!packAvailable}>One complete pack</option></select><p className="field-hint">A pack is one purchase, but every reward slot and the full pack cost count.</p></div>
      <div className="field"><div className="field-heading"><label htmlFor="setting-spark">Use a ready point exchange</label><Help label="Point exchange">The model can exchange saved points between complete draw actions when a featured goal still needs a reward. It does not auto-exchange for budget or collection goals.</Help></div><select id="setting-spark" value={value.sparkPolicy} onChange={(e) => onChange({ ...value, sparkPolicy: e.target.value as Settings['sparkPolicy'] })}><option value="if-needed">Yes, if needed for the goal</option><option value="never">No</option></select><p className="field-hint">A point exchange trades saved points for a reward. This setting controls whether the simulated player uses it.</p></div>
    </div>
    <JourneySettings value={value} onChange={onChange} models={models} />
    <AnalysisSettings value={value} onChange={onChange} models={models} />
    <EconomySettings value={value} onChange={onChange} models={models} />
  </Drawer>;
}
