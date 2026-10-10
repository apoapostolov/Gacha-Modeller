import type { RunSettings as Settings } from '../project/project.ts';
import { Drawer } from './Drawer.tsx';
import { Help } from './Help.tsx';
export function RunSettings({ value, onChange, onClose, onRun, packAvailable, busy, error }: { value: Settings; onChange: (next: Settings) => void; onClose: () => void; onRun: () => void; packAvailable: boolean; busy: boolean; error: string | null }) {
  const number = (label: string, key: 'trials' | 'seed' | 'maxPulls', min: number, max: number, hint: string) => <div className="field"><div className="field-heading"><label htmlFor={`setting-${key}`}>{label}</label><Help label={label}>{hint}</Help></div><input id={`setting-${key}`} type="number" min={min} max={max} step={1} value={Number.isNaN(value[key]) ? '' : value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.valueAsNumber })} /></div>;
  return <Drawer title="Run settings" onClose={onClose} footer={<><span className="run-note">Applies to both models</span><button className="primary" disabled={busy} onClick={onRun}>Run comparison</button></>}>
    <p className="run-note">Changes take effect on the next run.</p>
    {error && <p role="alert" className="run-error">{error}</p>}
    <div className="settings-fields">
      {number('Trials', 'trials', 1, 50000, 'Trials per model. More trials reduce sampling noise and take longer. Maximum: 50,000.')}
      {number('Seed', 'seed', 0, 4294967295, 'Unsigned 32-bit seed. The same immutable models, settings and engine version replay the same results. Streams are indexed by trial and event, independently of worker batching.')}
      {number('Pull horizon', 'maxPulls', 1, 100000, 'Maximum purchased pulls per trial. Unfinished goals remain in the population denominator. A pack is purchased only when all its slots fit.')}
      <div className="field"><label htmlFor="setting-goal">Goal</label><select id="setting-goal" value={value.goal.type} onChange={(e) => {
        const type = e.target.value as Settings['goal']['type'];
        onChange({ ...value, goal: type === 'budget' ? { type, pulls: 90 } : type === 'copies' || type === 'unique-featured' ? { type, count: 1 } : { type } });
      }}><option value="first-featured">First featured item</option><option value="copies">Featured copies</option><option value="unique-featured">Distinct featured items</option><option value="collection">Complete collection</option><option value="budget">Fixed pull budget</option></select></div>
      {(value.goal.type === 'copies' || value.goal.type === 'unique-featured') && <div className="field"><label htmlFor="setting-count">Target count</label><input id="setting-count" type="number" min={1} step={1} value={Number.isNaN(value.goal.count) ? '' : value.goal.count} onChange={(e) => onChange({ ...value, goal: { type: value.goal.type as 'copies' | 'unique-featured', count: e.target.valueAsNumber } })} /></div>}
      {value.goal.type === 'budget' && <div className="field"><label htmlFor="setting-budget">Pull budget</label><input id="setting-budget" type="number" min={0} step={1} value={Number.isNaN(value.goal.pulls) ? '' : value.goal.pulls} onChange={(e) => onChange({ ...value, goal: { type: 'budget', pulls: e.target.valueAsNumber } })} /></div>}
      <div className="field"><div className="field-heading"><label htmlFor="setting-action">Action</label><Help label="Purchase action">A pack consumes its full declared size and cost. Both models must declare a pack rule. Their sizes can differ; the plot counts individual purchased slots.</Help></div><select id="setting-action" value={value.actionMode} onChange={(e) => onChange({ ...value, actionMode: e.target.value as Settings['actionMode'] })}><option value="single">Single pull</option><option value="pack" disabled={!packAvailable}>Whole pack</option></select></div>
      <div className="field"><div className="field-heading"><label htmlFor="setting-spark">Exchange policy</label><Help label="Exchange policy">Use a ready exchange between complete actions when a featured goal still needs a reward. Budget and collection goals do not auto-exchange.</Help></div><select id="setting-spark" value={value.sparkPolicy} onChange={(e) => onChange({ ...value, sparkPolicy: e.target.value as Settings['sparkPolicy'] })}><option value="if-needed">Use if needed</option><option value="never">Leave closed</option></select></div>
    </div>
  </Drawer>;
}
