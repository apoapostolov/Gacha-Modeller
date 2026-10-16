import { useState } from 'react';
import { diagnoseGoal, mechanismAtlas, type JourneyTrace, type Representative, type TraceState } from '../engine/index.ts';
import type { ComparisonReport } from '../jobs/compare.ts';
import { Help } from './Help.tsx';

function exportTrace(trace: JourneyTrace) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'gacha-modeller-journey', version: 1, trace }, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${trace.model.id}-trial-${trace.trialIndex}-journey.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function stateRows(state: TraceState): [string, string][] {
  return [['Reward slots', String(state.pulls)], ...Object.entries(state.rarityCounters).map(([key, value]): [string, string] => [`${key} pity counter`, String(value)]), ['Next featured reward guaranteed', state.captureArmed ? 'Yes' : 'No'], ['Draws since a featured reward', String(state.sinceFeatured)], ['Saved exchange points', String(state.sparkProgress)], ['Selected target', state.targetId ?? 'None'], ['Target progress', String(state.targetProgress)], ['One-time guarantee used', state.onceUsed ? 'Yes' : 'No'], ['Available shards', String(state.salvage)], ['Different rewards owned', String(state.owned)], ['Selected copies', String(state.selectedCopies)]];
}
export function LearningWorkbench({ report, singleModel = false }: { report: ComparisonReport; singleModel?: boolean }) {
  const [side, setSide] = useState<'baseline' | 'candidate'>(singleModel ? 'baseline' : 'candidate');
  const [representative, setRepresentative] = useState<Representative>('median');
  const [step, setStep] = useState(0);
  const model = report[side].manifest.model;
  const trace = report.journeys[side][representative];
  const event = trace?.events[Math.min(step, trace.events.length - 1)];
  const diagnosis = diagnoseGoal(model, report.settings.goal, report.settings.sparkPolicy, report[side].manifest.options);
  const before = event ? stateRows(event.before) : [];
  const after = event ? new Map(stateRows(event.after)) : new Map<string, string>();
  const introductions = {
    rates: 'Slot rules can fix a reward; other draws choose a rarity, then an item.',
    pity: 'Misses can build protection; a hit resets its counter.',
    featured: 'Featured rules decide when a chase-tier hit gives a featured reward.',
    exchange: 'Saved points can buy a reward between purchases.',
    packs: 'Pack rules control how several reward slots are drawn together.',
    persistence: 'These rules decide which progress survives a banner, season or target change.',
    duplicates: 'These rules decide what happens when another copy lands.',
  };
  const inactive: Record<string, string> = {
    pity: 'Draws have no rarity pity protection.', featured: 'No featured or selected-target protection is declared.',
    exchange: 'This model has no point-exchange shop.', packs: 'Players buy individual pulls in this model.',
    persistence: 'Default rules keep separate progress for each banner.', duplicates: 'Players keep every copy; no overflow conversion applies.',
  };
  return <div className="learning-workbench">
    <div className="section-heading"><h3>Reward rules</h3>{!singleModel && <label className="compact-field">Model<select aria-label="Mechanics model" value={side} onChange={(e) => { setSide(e.target.value as typeof side); setStep(0); }}><option value="baseline">Baseline</option><option value="candidate">Candidate</option></select></label>}</div>
    {diagnosis.definitelyImpossible && !report.settings.initialState && <div className="validation-list"><strong>Goal cannot be reached under these rules</strong><ul>{diagnosis.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>}
    <p className="run-note">Reward selection, acquisition protection and progress rules for the selected model. <Help label="Mechanism atlas">Cards describe the immutable model used in this result. Source classes are author declarations, not independent verification. {diagnosis.unresolved.join(' ')}</Help></p>
    <div className="mechanism-atlas">{mechanismAtlas(model).map((card) => <article key={card.key} className="mechanism-card"><div className="section-heading"><h4>{card.title}</h4><span className="run-note">{card.active ? 'Active' : 'Inactive'}</span></div><p>{card.active ? introductions[card.key] : inactive[card.key]} <Help label={card.title}>{card.explanation}</Help></p><p className="run-note">{card.summary}</p><span className="source-class">{card.source.kind === 'cited-shape' ? 'Source describes a studied rule shape.' : 'Source is an authored assumption.'} <Help label={`${card.title} source`}><p>{card.source.source}</p>{card.source.asOf && <p>As of {card.source.asOf}</p>}{card.source.region && <p>Region: {card.source.region}</p>}</Help></span></article>)}</div>
    <div className="section-heading journey-heading"><h3>Player journey</h3><Help label="Representative player journeys">Lucky, median and unlucky select actual trials near the 5th, 50th and 95th attainment percentiles of completed trials only. They are conditional illustrations, not population percentiles or behavioural predictions. Incomplete selects the first unfinished trial. The exact trial index and seed replay its events. The first 200 events are stored; the full simulation still determines the final result.</Help></div>
    <p className="run-note">Each event records the reward rule and resulting player state. Lucky, median and unlucky examples are selected from completed trials.</p><div className="journey-choices" role="group" aria-label="Representative journey">{(['lucky', 'median', 'unlucky', 'incomplete'] as Representative[]).map((choice) => <button className="secondary" key={choice} aria-pressed={representative === choice} disabled={!report.journeys[side][choice]} onClick={() => { setRepresentative(choice); setStep(0); }}>{choice === 'incomplete' ? 'Incomplete' : `${choice[0]!.toUpperCase()}${choice.slice(1)} completed`}</button>)}</div>
    {!trace ? <p className="empty-journey">No {representative} trial in this population. Other representative journeys may be available.</p> : <div className="journey-viewer"><div className="section-heading"><p className="run-note">Trial index {trace.trialIndex} · seed {trace.seed} · {trace.result.goalAchieved ? `attained at ${trace.result.attainmentPulls} pulls` : `ended ${trace.result.termination}`} · {trace.result.pulls} reward slots</p><button className="text-button" onClick={() => exportTrace(trace)}>Export journey</button></div>
      {trace.truncated && <p className="warning-text">Showing {trace.events.length} of {trace.totalEvents} events. Final result includes the entire journey.</p>}
      {!event ? <p>No purchases: the goal was already met or proven impossible.</p> : <><div className="journey-controls"><button className="secondary" disabled={step <= 0} onClick={() => setStep(step - 1)} aria-label="Previous journey event">Previous</button><label className="journey-slider">Event {step + 1} of {trace.events.length}<input aria-label="Journey event" type="range" min={0} max={trace.events.length - 1} value={step} onChange={(e) => setStep(e.target.valueAsNumber)} /></label><button className="secondary" disabled={step >= trace.events.length - 1} onClick={() => setStep(step + 1)} aria-label="Next journey event">Next</button></div>
        <div className="journey-event" aria-live="polite"><span className="eyebrow">{event.kind} · {event.modelId}</span><h4>{event.outcome?.item.name ?? (event.transition ? event.transition.type.replaceAll('-', ' ') : `Purchase: ${event.purchaseCost} ${model.pullCost.currency}`)}</h4>{event.outcome && <p>{event.outcome.quantity ?? 1} granted · {event.outcome.accepted ?? 1} retained · {event.outcome.salvage ?? 0} shards{event.outcome.onceGuaranteed ? ' · one-time guarantee' : ''}{event.outcome.redirectedFrom ? ` · protected from ${event.outcome.redirectedFrom}` : ''}</p>}{event.transition && <p>{event.transition.targetId ?? event.transition.seasonId ?? 'Destination protection rules applied'}</p>}</div>
        <div className="table-scroll"><table className="comparison-table journey-state"><caption>Player state before and after the selected event</caption><thead><tr><th>Player state</th><th>Before</th><th>After</th></tr></thead><tbody>{before.map(([label, value]) => <tr key={label} data-changed={value !== after.get(label)}><th scope="row">{label}</th><td>{value}</td><td>{after.get(label)}{value !== after.get(label) && <span className="state-change"> · changed</span>}</td></tr>)}</tbody></table></div></>}
    </div>}
  </div>;
}
