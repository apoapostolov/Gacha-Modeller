import { useId, useState } from 'react';
import type { SimReport } from '../engine/types.ts';
import type { CohortReport } from '../jobs/analysis.ts';
import { Help } from './Help.tsx';

export function ComparisonChart({ baseline, candidate, cohorts }: { baseline: SimReport; candidate: SimReport; cohorts?: CohortReport }) {
  const [view, setView] = useState<'cdf' | 'survival'>('cdf');
  const [full, setFull] = useState(false);
  const [population, setPopulation] = useState<'main' | 'groups'>('main');
  const grouped = population === 'groups' && !!cohorts;
  const id = useId();
  const max = full ? baseline.manifest.options.maxPulls : grouped ? Math.max(1, ...cohorts!.groups.flatMap((group) => [group.baseline.pulls.max, group.candidate.pulls.max])) : Math.max(1, baseline.pulls.max, candidate.pulls.max);
  const x = (value: number) => 48 + value / max * 584;
  const y = (value: number) => 214 - value * 184;
  const path = (report: SimReport, side: 'baseline' | 'candidate') => {
    let d = `M48 ${y(view === 'cdf' ? 0 : 1)}`;
    if (grouped) {
      for (const point of cohorts!.weighted.curves) {
        if (point.pulls > max) break;
        d += ` H${x(point.pulls)} V${y(view === 'cdf' ? point[side] : 1 - point[side])}`;
      }
      return `${d} H${x(max)}`;
    }
    for (const point of report.acquisitionCdf) {
      if (point.pulls > max) break;
      const fraction = point.attained / report.trials;
      d += ` H${x(point.pulls)} V${y(view === 'cdf' ? fraction : 1 - fraction)}`;
    }
    return `${d} H${x(max)}`;
  };
  return <figure className="comparison-chart">
    <h3>{view === 'cdf' ? 'Chance of reaching the goal' : 'Still waiting for the goal'}</h3>
    {cohorts && <div className="segmented" aria-label="Chart population"><button aria-pressed={!grouped} onClick={() => setPopulation('main')}>Main comparison</button><button aria-pressed={grouped} onClick={() => setPopulation('groups')}>Weighted player mix</button></div>}
    {grouped && <p className="run-note">Each starting group's curve contributes its declared population share. The main result table still describes the main comparison.</p>}
    <p className="run-note">{view === 'cdf' ? 'Read the share of all players who have reached their goal by each pull position.' : 'Read the share of all players who still need their goal after each pull position.'} <Help label="Population curves">These step curves divide attained goals by every trial, including unfinished and impossible goals. Survival is one minus attainment. Both models use the same pull axis and 0–100% scale. The observed range ends at the largest purchased-pull count; full horizon shows the configured limit.</Help></p>
    <div className="chart-tools"><div className="segmented" aria-label="Chart view"><button aria-pressed={view === 'cdf'} onClick={() => setView('cdf')}>Attainment</button><button aria-pressed={view === 'survival'} onClick={() => setView('survival')}>Still waiting</button></div><label className="check-label"><input type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} />Full horizon</label></div>
    <svg viewBox="0 0 656 252" role="img" aria-labelledby={id}>
      <title id={id}>{view === 'cdf' ? 'Cumulative goal attainment' : 'Goal survival'} for baseline and candidate, {grouped ? `weighted across ${cohorts!.groups.length} starting groups, ${baseline.trials.toLocaleString()} trials per model/group` : `across all ${baseline.trials.toLocaleString()} trials each`}. Common range: 0 to {max} pulls.</title>
      {[0, .25, .5, .75, 1].map((fraction) => <g key={fraction}><line x1={48} x2={632} y1={y(fraction)} y2={y(fraction)} className="chart-grid" /><text x={38} y={y(fraction) + 4} textAnchor="end">{fraction * 100}%</text></g>)}
      {[0, .25, .5, .75, 1].map((fraction) => <text key={fraction} x={x(max * fraction)} y={236} textAnchor="middle">{Math.round(max * fraction)}</text>)}
      <path d={path(baseline, 'baseline')} className="curve-baseline" /><path d={path(candidate, 'candidate')} className="curve-candidate" />
    </svg>
    <figcaption><span className="legend-baseline">Baseline</span><span className="legend-candidate">Candidate</span><span>Purchased pull position</span></figcaption>
  </figure>;
}
