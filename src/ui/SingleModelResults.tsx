import { useState } from 'react';
import type { ComparisonReport } from '../jobs/compare.ts';
import { parameters } from '../engine/analysis.ts';
import { goalLabel } from './format.ts';
import { Histogram } from './Histogram.tsx';
import { Help } from './Help.tsx';
import { LearningWorkbench } from './LearningWorkbench.tsx';
import { ProbabilityPlot } from './ProbabilityPlot.tsx';

const number = (value: number, digits = 2) => value.toLocaleString(undefined, { maximumFractionDigits: digits });
const percent = (value: number) => `${number(value * 100, 1)}%`;
const money = (value: number, currency: string) => `${number(value)} ${currency}`;

export function SingleModelResults({ report }: { report: ComparisonReport }) {
  const [histogram, setHistogram] = useState(false);
  const result = report.baseline;
  const model = result.manifest.model;
  const exact = report.exact.baseline;
  const max = report.settings.maxPulls;
  const x = (pull: number) => 48 + pull / max * 584;
  const y = (share: number) => 214 - share * 184;
  let curve = `M48 ${y(0)}`;
  for (const point of result.acquisitionCdf) {
    if (point.pulls > max) break;
    curve += ` H${x(point.pulls)} V${y(point.attained / result.trials)}`;
  }
  curve += ` H${x(max)}`;
  const rows: [string, string][] = [
    ['Players who reached the goal', percent(result.attainmentRate)],
    ['Average reward draws per player', number(result.pulls.mean)],
    [`Average ${model.pullCost.currency} used per player`, money(result.cost.mean, model.pullCost.currency)],
    ['Average featured rewards received', number(result.featuredCount.mean)],
    ['Average different rewards collected', number(result.uniqueCount.mean)],
    ['Players who used a point exchange', percent(result.sparkRate)],
  ];
  if (result.duplicateSummary) {
    rows.push(['Average extra copies received', number(result.duplicateSummary.attempted.mean)]);
    rows.push(['Average shards earned', number(result.duplicateSummary.salvageEarned.mean)]);
    rows.push(['Average rewards crafted', number(result.duplicateSummary.crafted.mean)]);
  }
  const economy = report.economy;
  const modelSettingName = (id: string) => parameters(model).find((parameter) => parameter.id === id)?.label ?? id;
  return <section className="panel comparison-results single-model-results" aria-label="Baseline model analysis">
    <div className="section-heading"><h2>Player results · {goalLabel(report.settings.goal)}</h2><span className="evidence-label">One model · simulated players</span></div>
    <p className="run-note">{result.trials.toLocaleString()} simulated players · random seed {report.settings.seed} · {report.settings.actionMode === 'pack' ? 'complete packs' : 'one reward at a time'}. These results describe the selected model on its own.</p>
    <h3>Player outcomes</h3>
    <p>Each row summarizes all simulated players, including players who did not reach the goal. The draw and currency averages include those unfinished players.</p>
    <div className="table-scroll"><table className="comparison-table"><caption>Results for {model.name}, using {report.settings.trials.toLocaleString()} simulated players</caption><thead><tr><th scope="col">Player experience</th><th scope="col">Current rules</th></tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table></div>
    <p className="run-note">Goal completion by draw number means the share of all players who had reached the goal by that point. For packs, one purchase can contain several reward draws.</p>
    <figure className="comparison-chart single-model-chart">
      <h3>Chance of reaching the goal by each draw</h3>
      <p className="run-note">The curve rises as more simulated players reach the goal. Players who do not reach it remain in the total.</p>
      <ProbabilityPlot max={max}><svg viewBox="48 30 584 184" preserveAspectRatio="none" role="img" aria-label={`Goal completion for ${model.name} across ${result.trials} simulated players, from zero to ${max} reward draws`}>
        {[0, .25, .5, .75, 1].map((fraction) => <line key={fraction} x1={48} x2={632} y1={y(fraction)} y2={y(fraction)} className="chart-grid" />)}
        <path d={curve} className="curve-baseline" />
      </svg></ProbabilityPlot>
      <figcaption><span className="legend-baseline">{model.name}</span><span>Reward draws</span><Help label="How to read this curve">At each draw number, the curve shows the share of all simulated players who have reached the goal. A flat part means no additional players completed it within that range. Packs may include multiple reward draws per purchase.</Help></figcaption>
    </figure>
    <h3>Completion timing</h3>
    <p>{result.acquisitionQuantiles.p50 === null ? 'Fewer than half of the simulated players reached the goal, so there is no median completion draw.' : `Half of simulated players reached the goal by about ${number(result.acquisitionQuantiles.p50)} reward draws.`} {result.acquisitionQuantiles.p90 === null ? 'Fewer than 90% reached the goal within the draw limit.' : `90% had reached it by about ${number(result.acquisitionQuantiles.p90)} reward draws.`}</p>
    <details className="comparison-details"><summary>Players who stopped before reaching the goal</summary><p>These counts explain why a player stopped. All players remain included in the outcome averages above.</p><ul><li>Reached the goal: {result.terminations.goal.toLocaleString()}</li><li>Reached the draw limit: {result.terminations.horizon.toLocaleString()}</li><li>Reached the fixed draw budget: {result.terminations.budget.toLocaleString()}</li><li>Goal was impossible under the rules: {result.terminations.impossible.toLocaleString()}</li></ul></details>
    <details className="comparison-details"><summary>Draw-count distribution</summary><p>Each bar counts players in a range of reward draws. The histogram shows the spread of individual results, while the table above shows averages.</p><button className="text-button" aria-expanded={histogram} onClick={() => setHistogram(!histogram)}>{histogram ? 'Hide' : 'Show'} player draw counts</button>{histogram && <Histogram data={result.histogram} unit="draws" />}</details>
    <section className="analysis-results"><h3>Calculated completion chance, when supported</h3>{exact.status === 'exact' ? <><p>The model's rules allow an exact calculation, which combines the chance of every supported outcome path and does not depend on a random sample.</p><div className="table-scroll"><table className="comparison-table"><caption>Exact results for {model.name}</caption><tbody><tr><th scope="row">Chance of reaching the goal</th><td>{percent(exact.attainment)}</td></tr><tr><th scope="row">Average reward draws, including unfinished players</th><td>{number(exact.meanPurchasedPulls)}</td></tr><tr><th scope="row">Average currency used</th><td>{money(exact.meanCost, model.pullCost.currency)}</td></tr><tr><th scope="row">Median completion</th><td>{exact.quantiles.p50 === null ? 'Not reached within the draw limit' : `${number(exact.quantiles.p50)} draws`}</td></tr><tr><th scope="row">90% completion point</th><td>{exact.quantiles.p90 === null ? 'Not reached within the draw limit' : `${number(exact.quantiles.p90)} draws`}</td></tr></tbody></table></div></> : <p>{exact.reason}</p>}</section>
    {report.cohorts && <section className="analysis-results"><h3>Results by starting player group</h3><p>Each group begins with the progress entered in run settings. The combined result uses each group's declared share of the player population.</p><div className="table-scroll"><table className="comparison-table"><thead><tr><th scope="col">Starting group</th><th scope="col">Share of players</th><th scope="col">Reached the goal</th><th scope="col">Average draws</th><th scope="col">Average currency</th></tr></thead><tbody>{report.cohorts.groups.map((group) => <tr key={group.cohort.id}><th scope="row">{group.cohort.name}</th><td>{percent(group.share)}</td><td>{percent(group.baseline.attainmentRate)}</td><td>{number(group.baseline.pulls.mean)}</td><td>{money(group.baseline.cost.mean, model.pullCost.currency)}</td></tr>)}<tr><th scope="row">Combined player mix</th><td>100%</td><td>{percent(report.cohorts.weighted.baseline.attainment)}</td><td>{number(report.cohorts.weighted.baseline.pulls)}</td><td>{money(report.cohorts.weighted.baseline.cost, model.pullCost.currency)}</td></tr></tbody></table></div></section>}
    {report.experiment && <section className="analysis-results"><h3>Results for tested setting values</h3><p>The unchanged model is the reference. Each row shows a tested variation of the selected model settings. The second random sample checks the same values; a balanced result is only a useful option among the values tested.</p><div className="table-scroll"><table className="comparison-table"><thead><tr>{report.experiment.config.axes.map((axis) => <th scope="col" key={axis.parameter}>{modelSettingName(axis.parameter)}</th>)}<th scope="col">Reached the goal</th><th scope="col">Average currency used</th><th scope="col">Average draws</th><th scope="col">Meets entered limits</th><th scope="col">Balanced among tested values</th></tr></thead><tbody><tr>{report.experiment.config.axes.map((axis) => <td key={axis.parameter}>Current value</td>)}<td>{percent(report.experiment.reference.validation.attainment)}</td><td>{money(report.experiment.reference.validation.cost, report.experiment.currency)}</td><td>{number(report.experiment.reference.validation.pulls)}</td><td>Reference</td><td>—</td></tr>{report.experiment.cells.map((cell, index) => <tr key={index}>{report.experiment!.config.axes.map((axis) => <td key={axis.parameter}>{cell.point[axis.parameter]}</td>)}<td>{percent(cell.validation.attainment)}</td><td>{money(cell.validation.cost, report.experiment!.currency)}</td><td>{number(cell.validation.pulls)}</td><td>{cell.feasible ? 'Yes' : 'No'}</td><td>{cell.frontier ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div></section>}
    {economy && <section className="analysis-results"><h3>Configured calendar and economy scenarios</h3><p className="evidence-note">Synthetic assumptions · not measured player behavior or company profit</p><p>These scenarios apply the configured attendance, purchasing and cost assumptions to the selected model. They help explore possible outcomes; they are not observed engagement or forecasts.</p><div className="table-scroll"><table className="comparison-table"><thead><tr><th scope="col">Scenario</th><th scope="col">Players reaching the goal</th><th scope="col">Average active days</th><th scope="col">Players making a payment</th><th scope="col">Cash contribution per player</th></tr></thead><tbody>{economy.scenarios.map((scenario) => { const result = scenario.windows.find((window) => window.day === economy.config.days)?.baseline; return <tr key={scenario.id}><th scope="row">{scenario.name}</th>{result ? <><td>{percent(result.completion)}</td><td>{number(result.activeDays)}</td><td>{percent(result.payerShare)}</td><td>{money(result.contributionMinor, economy.config.cashCurrency)}</td></> : <td colSpan={4}>Unavailable for this scenario duration.</td>}</tr>; })}</tbody></table></div><details className="comparison-details"><summary>Scenario assumptions</summary><ul>{economy.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul></details></section>}
    <LearningWorkbench report={report} singleModel />
  </section>;
}
