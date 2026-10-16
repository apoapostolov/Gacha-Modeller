import type { Banner, SimReport } from '../engine/types.ts';
import type { RunSettings } from '../project/project.ts';
import { fmt, money } from './format.ts';

/** Keep the results structure visible without inventing unrun simulation values. */
export function ResultsPreview({ model, settings, baseline, comparing, busy }: { model: Banner; settings: RunSettings; baseline?: SimReport; comparing: boolean; busy: boolean }) {
  const pending = 'Not run yet';
  const rows = [
    ['Players who got their goal', baseline ? `${fmt(baseline.attainmentRate * 100, 1)}%` : pending],
    ['Average reward draws', baseline ? fmt(baseline.pulls.mean) : pending],
    ['Average currency used', baseline ? money(baseline.cost.mean, model.pullCost.currency) : pending],
    ['Draws for half the players to succeed', baseline ? baseline.acquisitionQuantiles.p50 === null ? 'Not reached' : fmt(baseline.acquisitionQuantiles.p50) : pending],
    ['Draws for 90% of players to succeed', baseline ? baseline.acquisitionQuantiles.p90 === null ? 'Not reached' : fmt(baseline.acquisitionQuantiles.p90) : pending],
    ['Average featured rewards', baseline ? fmt(baseline.featuredCount.mean, 2) : pending],
    ['Average different rewards collected', baseline ? fmt(baseline.uniqueCount.mean, 2) : pending],
  ];
  return <section className="panel results-preview" data-comparing={comparing} aria-label="Player results">
    <h2>{comparing ? 'Player results: current vs proposed' : 'Player results'}</h2>
    <p className="run-note">{busy ? 'Simulation running. The table will update when it finishes.' : comparing ? 'Compare rule sets to see what changes for players. The current results, when available, stay here while you prepare your proposal.' : 'Simulate current rules to see what players get and how long they wait. Load a proposal when you want to compare a change.'}</p>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Player outcomes table"><table className="comparison-table"><caption>{baseline ? 'Current results from the last completed simulation' : `Planned simulation: ${settings.trials.toLocaleString()} players, up to ${settings.maxPulls.toLocaleString()} draws each`}</caption>
      <thead><tr><th scope="col">What players experience</th><th scope="col">Current model</th>{comparing && <><th scope="col">Proposed model</th><th scope="col">Change</th></>}</tr></thead>
      <tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td>{comparing && <><td>{pending}</td><td>{pending}</td></>}</tr>)}</tbody>
    </table></div>
  </section>;
}
