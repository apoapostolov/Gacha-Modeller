import { LearningWorkbench } from './LearningWorkbench.tsx';
import { EconomyResults } from './EconomyResults.tsx';
import { AnalysisResults } from './AnalysisResults.tsx';
import { useState } from 'react';
import type { ComparisonReport } from '../jobs/compare.ts';
import { fmt, goalLabel, money } from './format.ts';
import { ComparisonChart } from './ComparisonChart.tsx';
import { Help } from './Help.tsx';
import { Histogram } from './Histogram.tsx';
export function ComparisonResults({ report }: { report: ComparisonReport }) {
  const [histogram, setHistogram] = useState(false);
  const { baseline: a, candidate: b } = report;
  const sameCurrency = a.manifest.model.pullCost.currency === b.manifest.model.pullCost.currency;
  const q = (value: number | null) => value === null ? 'Not reached' : fmt(value);
  const delta = (value: number, digits = 1) => `${value > 0 ? '+' : ''}${fmt(value, digits)}`;
  const rows = [
    ['Players who got their goal', `${fmt(a.attainmentRate * 100, 1)}%`, `${fmt(b.attainmentRate * 100, 1)}%`, `${delta((b.attainmentRate - a.attainmentRate) * 100)} pp`],
    ['Average reward draws', fmt(a.pulls.mean), fmt(b.pulls.mean), delta(b.pulls.mean - a.pulls.mean)],
    ['Average currency used', money(a.cost.mean, a.manifest.model.pullCost.currency), money(b.cost.mean, b.manifest.model.pullCost.currency), sameCurrency ? delta(b.cost.mean - a.cost.mean) : 'Different units'],
    ['Draws for half the players', q(a.acquisitionQuantiles.p50), q(b.acquisitionQuantiles.p50), a.acquisitionQuantiles.p50 !== null && b.acquisitionQuantiles.p50 !== null ? delta(b.acquisitionQuantiles.p50 - a.acquisitionQuantiles.p50) : 'Unavailable'],
    ['Draws for 90% of players', q(a.acquisitionQuantiles.p90), q(b.acquisitionQuantiles.p90), a.acquisitionQuantiles.p90 !== null && b.acquisitionQuantiles.p90 !== null ? delta(b.acquisitionQuantiles.p90 - a.acquisitionQuantiles.p90) : 'Unavailable'],
    ['Average featured rewards', fmt(a.featuredCount.mean, 2), fmt(b.featuredCount.mean, 2), delta(b.featuredCount.mean - a.featuredCount.mean, 2)],
    ['Average different rewards', fmt(a.uniqueCount.mean, 2), fmt(b.uniqueCount.mean, 2), delta(b.uniqueCount.mean - a.uniqueCount.mean, 2)],
    ['Players who used the exchange', `${fmt(a.sparkRate * 100, 1)}%`, `${fmt(b.sparkRate * 100, 1)}%`, `${delta((b.sparkRate - a.sparkRate) * 100)} pp`],
  ];
  if (a.duplicateSummary || b.duplicateSummary) {
    for (const [key, label] of [['attempted', 'Repeat copies received'], ['salvageEarned', 'Shards earned'], ['salvageSpent', 'Shards spent'], ['salvageRemaining', 'Shards remaining'], ['crafted', 'Rewards crafted']] as const) {
      const first = a.duplicateSummary?.[key].mean ?? 0; const next = b.duplicateSummary?.[key].mean ?? 0;
      rows.push([label, fmt(first, 2), fmt(next, 2), delta(next - first, 2)]);
    }
  }
  return <section className="panel comparison-results" aria-label="Comparison results">
    <div className="section-heading"><h2>Player results · {goalLabel(report.settings.goal)}</h2><span className="evidence-label">Simulated players <Help label="How this comparison was run"><p>The model runs repeated simulated players using the same run settings for baseline and candidate. This reduces noise when comparing them.</p>{report.assumptions.map((assumption, i) => <p key={i}>{assumption}</p>)}</Help></span></div>
    <p className="run-note">{report.settings.trials.toLocaleString()} trials per model · seed {report.settings.seed} · {report.settings.actionMode === 'pack' ? 'whole packs' : 'single pulls'}</p>
    <section className="result-interpretation" aria-labelledby="result-interpretation-title">
      <h3 id="result-interpretation-title">What changed for players?</h3>
      <p>The share of players who reached the goal changed by {delta((b.attainmentRate - a.attainmentRate) * 100)} percentage points, from {fmt(a.attainmentRate * 100, 1)}% to {fmt(b.attainmentRate * 100, 1)}%. A percentage-point change is the direct difference between two percentages. Average reward slots per player changed by {delta(b.pulls.mean - a.pulls.mean)}.</p>
      <p className="field-hint">These results show what the configured rules produce in the simulation. They do not measure player enjoyment, return visits or company profit. Those require player research and company data.</p>
    </section>
    <p className="run-note">All simulated players are included, even when they do not reach the goal. Fewer draws can mean lower resource use, but it can also mean more players stopped early. A reward slot is one reward; a pack can contain several slots. “Change” means proposed rules minus current rules.</p><div className="table-scroll"><table className="comparison-table"><caption>Current and proposed rules use the same players and simulation settings. Change is proposed minus current.</caption><thead><tr><th scope="col">Player experience <Help label="How to read the measures"><p>Every simulated player contributes to averages, including players who do not reach the goal. The change is proposed minus current.</p><p>Lower in-game currency use alone does not show company profitability.</p><p>Ranges describe random variation in this simulation. They do not measure uncertainty about real player behaviour.</p></Help></th><th scope="col">Current rules</th><th scope="col">Proposed rules</th><th scope="col">Change</th></tr></thead><tbody>{rows.map(([label, first, next, difference]) => <tr key={label}><th scope="row">{label}</th><td>{first}</td><td>{next}</td><td>{difference}</td></tr>)}</tbody></table></div>
    <p className="run-note">Average currency used is in-game spending, not company revenue or profit. Company contribution needs cash and cost assumptions; engagement and return visits need observed player data. <Help label="What this comparison can tell you">This comparison tests reward rules, goal completion and in-game currency use. It cannot estimate enjoyment, revenue, margin, engagement or retention without an economy model and suitable player evidence.</Help></p>
    <ComparisonChart baseline={a} candidate={b} cohorts={report.cohorts} />
    <AnalysisResults report={report} />
    <EconomyResults report={report} />
    <LearningWorkbench report={report} />
    {report.learning && Object.keys(report.learning).length > 0 && <details className="comparison-details"><summary>Mechanics reference scenarios</summary>
      <p className="run-note">Supplementary model scenarios <Help label="Learning scenario scope">These lessons use the baseline, separate from the baseline/candidate comparison. Guild and two-pickup lessons retain the legacy sequential RNG and their own stated trial counts. They teach mechanics; they do not measure a candidate improvement.</Help></p>
      {report.learning.poolShare && <div><h3>Shared guild pity</h3><p>{report.learning.poolShare.players} players · 90 pulls each · {report.learning.poolShare.trials.toLocaleString()} groups · seed {report.learning.poolShare.seed}</p><p>Mean featured items: {fmt(report.learning.poolShare.sharedFeatured.mean, 2)} shared, {fmt(report.learning.poolShare.soloFeatured.mean, 2)} solo. <Help label="Guild lesson">The same group budget is split into independent solo histories or one shared history. Exchange is not used. Player count is a lesson parameter; individual comparison curves use one player's state.</Help></p></div>}
      {report.learning.coldCollection && <div><h3>Collection heat on and off</h3><p>Completion: {fmt(a.attainmentRate * 100, 1)}% with heat, {fmt(report.learning.coldCollection.attainmentRate * 100, 1)}% without.</p><p>Mean attempted pulls: {fmt(a.pulls.mean)} with heat, {fmt(report.learning.coldCollection.pulls.mean)} without. <Help label="Collection heat lesson">The cold counterfactual changes only baseline collectionHeat to zero. All run controls and event streams match the baseline. Attempt means include unfinished trials; a lower attempt count alone does not establish faster completion.</Help></p></div>}
      {report.learning.dualPickup && <div><h3>Two-pickup pursuit</h3><p>{report.learning.dualPickup.trials.toLocaleString()} trials · seed {report.learning.dualPickup.seed} · studied Spark and Charge presets</p><p>Both pickups acquired: {fmt(report.learning.dualPickup.spark.attainmentRate * 100, 1)}% Spark, {fmt(report.learning.dualPickup.charge.attainmentRate * 100, 1)}% Charge.</p><p>Early-first subgroup p90: {fmt(report.learning.dualPickup.spark.earlyBoth.p90)} Spark, {fmt(report.learning.dualPickup.charge.earlyBoth.p90)} Charge. <Help label="Two-pickup lesson">The studied preset pair pursues pickup A, then B. Spark preserves points across the switch; Charge restarts its checkpoint progress after a pickup. The early-first subgroup conditions on obtaining A by pull 80 and completing B. The legacy lesson has a fixed 10,000-pull horizon, uses exchange if needed for Spark and never for Charge, and does not use edited candidate models. Empty subgroup summaries are zero.</Help></p></div>}
    </details>}
    <details className="comparison-details"><summary>Completion evidence</summary><div className="completion-evidence">{([['Baseline', a], ['Candidate', b]] as const).map(([label, result]) => <div key={label}><h3>{label}</h3><p>{result.terminations.horizon.toLocaleString()} horizon-limited · {result.terminations.budget.toLocaleString()} budget-limited · {result.terminations.impossible.toLocaleString()} impossible</p><p>{result.completedPulls ? `${result.completedPulls.n.toLocaleString()} completed goals; conditional mean ${fmt(result.completedPulls.mean)} pulls.` : 'No completed goals.'} <Help label={`${label} conditional completion`}>Completed-goal statistics exclude failures and must not be substituted for whole-population outcomes. Within a pack, first attainment and total reward slots can differ.</Help></p></div>)}</div></details>
    <details className="comparison-details"><summary>Model changes ({report.diff.length})</summary><div className="table-scroll"><table className="diff-table"><thead><tr><th>Field</th><th>Baseline</th><th>Candidate</th></tr></thead><tbody>{report.diff.map((change, i) => <tr key={i}><th><code>{change.path}</code></th><td>{JSON.stringify(change.before)}</td><td>{JSON.stringify(change.after)}</td></tr>)}</tbody></table></div>{report.diff.length === 0 && <p>No changes.</p>}</details>
    <button className="text-button" aria-expanded={histogram} onClick={() => setHistogram(!histogram)}>{histogram ? 'Hide' : 'Show'} reward-slot histograms</button>
    {histogram && <div className="model-pair"><div><h3>Baseline purchases</h3><Histogram data={a.histogram} unit="pulls" /></div><div><h3>Candidate purchases</h3><Histogram data={b.histogram} unit="pulls" /></div></div>}
  </section>;
}
