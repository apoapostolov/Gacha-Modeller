import type { Banner } from '../engine/index.ts';
import { useEffect, useRef } from 'react';
import { AnalysisSettings } from './AnalysisSettings.tsx';
import { JourneySettings } from './JourneySettings.tsx';
import { EconomySettings } from './EconomySettings.tsx';
import type { RunSettings as Settings } from '../project/project.ts';
import { Drawer } from './Drawer.tsx';
import { Help } from './Help.tsx';
export function RunSettings({ value, onChange, onClose, onRun, packAvailable, busy, error, models }: { value: Settings; onChange: (next: Settings) => void; onClose: () => void; onRun: () => void; packAvailable: boolean; models: Banner[]; busy: boolean; error: string | null }) {
  const errorSummary = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorSummary.current?.focus(); }, [error]);
  const number = (label: string, key: 'trials' | 'seed' | 'maxPulls', min: number, max: number, hint: string, short: string) => <div className="field"><div className="field-heading"><label htmlFor={`setting-${key}`}>{label}</label><Help label={label}>{hint}</Help></div><input id={`setting-${key}`} type="number" min={min} max={max} aria-describedby={`hint-${key}`} step={1} value={Number.isNaN(value[key]) ? '' : value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.valueAsNumber })} /><p id={`hint-${key}`} className="field-hint">{short}</p></div>;
  return <Drawer title="Run settings" onClose={onClose} footer={<><span className="run-note">Applies to both models</span><button className="primary" disabled={busy} onClick={onRun}>Run comparison</button></>}>
    <p className="run-note">The acquisition goal, sample size and stopping limit apply to both models.</p>
    {error && <p role="alert" tabIndex={-1} ref={errorSummary} className="run-error">{error}</p>}
    {value.initialState && <p className="run-note">This imported run starts with existing player progress. <Help label="Imported starting state">{JSON.stringify(value.initialState)}</Help><button className="text-button" onClick={() => onChange({ ...value, initialState: undefined })}>Clear starting progress</button></p>}
    <div className="settings-fields">
      {number('Trials', 'trials', 1, 50000, 'Trials per model. More trials reduce sampling noise and take longer. Maximum: 50,000.', 'More simulated players give steadier estimates.')}
      {number('Seed', 'seed', 0, 4294967295, 'Unsigned 32-bit seed. The same immutable models, settings and engine version replay the same results. Streams are indexed by trial and event, independently of worker batching.', 'A fixed seed reproduces the sample; another seed produces an independent sample.')}
      {number('Pull horizon', 'maxPulls', 1, 100000, 'Maximum purchased pulls per trial. Unfinished goals remain in the population denominator. A pack is purchased only when all its slots fit.', 'Players stop here if they have not reached their goal.')}
      <div className="field"><label htmlFor="setting-goal">Goal</label><select id="setting-goal" value={value.goal.type} onChange={(e) => {
        const type = e.target.value as Settings['goal']['type'];
        onChange({ ...value, goal: type === 'budget' ? { type, pulls: 90 } : type === 'copies' || type === 'unique-featured' ? { type, count: 1 } : type === 'targets' ? { type, targets: models[1]?.items[0] ? [{ itemId: models[1].items[0].id, count: 1 }] : [] } : { type } });
      }}><option value="first-featured">First featured item</option><option value="copies">Featured copies</option><option value="unique-featured">Distinct featured items</option><option value="targets">Named items & copies</option><option value="collection">Complete collection</option><option value="budget">Fixed pull budget</option></select></div>
      {(value.goal.type === 'copies' || value.goal.type === 'unique-featured') && <div className="field"><label htmlFor="setting-count">Target count</label><input id="setting-count" type="number" min={1} step={1} value={Number.isNaN(value.goal.count) ? '' : value.goal.count} onChange={(e) => onChange({ ...value, goal: { type: value.goal.type as 'copies' | 'unique-featured', count: e.target.valueAsNumber } })} /></div>}
      {value.goal.type === 'budget' && <div className="field"><label htmlFor="setting-budget">Pull budget</label><input id="setting-budget" type="number" min={0} step={1} value={Number.isNaN(value.goal.pulls) ? '' : value.goal.pulls} onChange={(e) => onChange({ ...value, goal: { type: 'budget', pulls: e.target.valueAsNumber } })} /></div>}
      <div className="field"><div className="field-heading"><label htmlFor="setting-action">Action</label><Help label="Purchase action">A pack consumes its full declared size and cost. Both models must declare a pack rule. Their sizes can differ; the plot counts individual purchased slots.</Help></div><select id="setting-action" value={value.actionMode} onChange={(e) => onChange({ ...value, actionMode: e.target.value as Settings['actionMode'] })}><option value="single">Single pull</option><option value="pack" disabled={!packAvailable}>Whole pack</option></select><p className="field-hint">A draw action consumes one pull or every slot in a complete pack.</p></div>
      <div className="field"><div className="field-heading"><label htmlFor="setting-spark">Exchange policy</label><Help label="Exchange policy">Use a ready exchange between complete actions when a featured goal still needs a reward. Budget and collection goals do not auto-exchange.</Help></div><select id="setting-spark" value={value.sparkPolicy} onChange={(e) => onChange({ ...value, sparkPolicy: e.target.value as Settings['sparkPolicy'] })}><option value="if-needed">Use if needed</option><option value="never">Disabled</option></select><p className="field-hint">A ready point exchange can fill a missing featured reward between draw actions.</p></div>
    </div>
    <JourneySettings value={value} onChange={onChange} models={models} />
    <AnalysisSettings value={value} onChange={onChange} models={models} />
    <EconomySettings value={value} onChange={onChange} models={models} />
  </Drawer>;
}
