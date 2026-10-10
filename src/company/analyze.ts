import { mulberry32 } from '../engine/rng.ts';
import { assertEvidence, type CompanyEvidence, type ExtractRow } from './types.ts';
import { mapExtract } from './extract.ts';
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const quantile = (values: number[], p: number) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!; };
// Two-sided exact binomial test: probability ordering, evaluated in log space.
export function srm(candidate: number, total: number, share: number): number | null {
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(candidate) || total < 1 || total > 10000 || candidate < 0 || candidate > total || !Number.isFinite(share) || share <= 0 || share >= 1) return null;
  let logCombination = 0; const logs: number[] = [];
  for (let k = 0; k <= total; k++) { if (k) logCombination += Math.log(total - k + 1) - Math.log(k); logs.push(logCombination + k * Math.log(share) + (total - k) * Math.log1p(-share)); }
  const observed = logs[candidate]!;
  return Math.min(1, logs.filter((value) => value <= observed + 1e-10).reduce((sum, value) => sum + Math.exp(value), 0));
}
function bootstrap(baseline: ExtractRow[], candidate: ExtractRow[], seed: number) {
  if (baseline.length < 2 || candidate.length < 2) return null;
  const rng = mulberry32(seed); const cash: number[] = [], attendance: number[] = [];
  for (let draw = 0; draw < 1000; draw++) {
    const sample = (rows: ExtractRow[]) => { let net = 0, active = 0, eligible = 0; for (let i = 0; i < rows.length; i++) { const row = rows[Math.floor(rng() * rows.length)]!; net += row.netMinor; active += row.activeDays; eligible += row.eligibleDays; } return { net: net / rows.length, attendance: active / eligible }; };
    const b = sample(baseline), a = sample(candidate); cash.push(a.net - b.net); attendance.push(a.attendance - b.attendance);
  }
  return { cash: [quantile(cash, .025), quantile(cash, .975)] as [number, number], attendance: [quantile(attendance, .025), quantile(attendance, .975)] as [number, number], replicates: 1000, seed };
}
export function analyzeEvidence(evidence: CompanyEvidence) {
  assertEvidence(evidence);
  const mapped = mapExtract(evidence); const c = evidence.contract, e = evidence.experiment;
  const blockers = [...mapped.diagnostics], warnings: string[] = [];
  let late = 0, unavailable = 0, unreconciled = 0, immature = 0;
  const rows: ExtractRow[] = [];
  const unique = new Set<string>(); const assignment = new Map<string, string>(); const cohorts = new Map<string, string>();
  for (const row of mapped.rows) {
    if (row.receivedDay > c.asOfDay) { unavailable++; continue; }
    if (cohorts.has(row.unitId) && cohorts.get(row.unitId) !== row.cohort) blockers.push(`${row.unitId}: Cohort identity differs across periods.`);
    cohorts.set(row.unitId, row.cohort);
    const key = `${row.period}:${row.unitId}`;
    if (unique.has(key)) { blockers.push(`${key}: Multiple aggregates for one assignment unit; consolidate before analysis.`); continue; } unique.add(key);
    if (row.receivedDay - row.endDay > c.allowedLatenessDays) late++;
    if (row.openingMinor + row.creditsMinor - row.debitsMinor !== row.closingMinor || row.openingItems + row.awardedItems !== row.closingItems) unreconciled++;
    if ((row.period === 'training' && row.endDay > c.trainingEndDay) || (row.period === 'holdout' && (row.startDay < c.holdoutStartDay || row.endDay >= c.experimentStartDay)) || (row.period === 'experiment' && row.startDay < c.experimentStartDay)) blockers.push(`${row.eventId}: Period crosses a declared temporal boundary.`);
    if (row.period !== 'experiment' && row.arm !== 'baseline') blockers.push(`${row.eventId}: Calibration must use baseline observations.`);
    if (row.period === 'experiment') {
      const previous = assignment.get(row.unitId); if (previous && previous !== row.arm) blockers.push(`${row.unitId}: Assignment switched arms.`); assignment.set(row.unitId, row.arm);
      if (!row.assigned && row.exposed) blockers.push(`${row.eventId}: Exposure without assignment.`);
      if (row.endDay !== row.startDay + c.horizonDays - 1 || row.eligibleDays !== c.horizonDays || c.asOfDay < row.endDay + c.allowedLatenessDays) immature++;
    }
    rows.push(row);
  }
  if (late) blockers.push(`${late} aggregates arrived outside the allowed lateness window.`);
  if (unavailable) blockers.push(`${unavailable} aggregates are unavailable at the declared extract cutoff.`);
  if (unreconciled) blockers.push(`${unreconciled} wallet or inventory aggregates do not reconcile.`);
  if (immature) blockers.push(`${immature} experiment aggregates lack the full mature horizon.`);
  if (!c.owner.trim() || !c.decision.trim() || !c.metricDefinition.trim() || !c.authority.trim() || !c.assignmentUnit.trim()) blockers.push('Decision ownership and metric authority are incomplete.');
  if (e.preregisteredDay >= c.experimentStartDay) blockers.push('Decision criteria were not registered before the experiment.');
  if (evidence.provenance === 'company-extract' && c.approval !== 'approved') blockers.push('Company data and contribution definitions require an approved contract.');
  if (evidence.provenance === 'synthetic') warnings.push('Synthetic evidence tests the workflow. It cannot authorize a company adoption decision.');
  const calibrations = [...new Set(rows.map((row) => row.cohort))].sort().map((cohort) => {
    const training = rows.filter((row) => row.cohort === cohort && row.period === 'training'), holdout = rows.filter((row) => row.cohort === cohort && row.period === 'holdout');
    const rate = (data: ExtractRow[], field: 'activeDays' | 'purchaseDays') => data.length ? data.reduce((sum, row) => sum + row[field], 0) / data.reduce((sum, row) => sum + row.eligibleDays, 0) : null;
    if (!training.length || !holdout.length) blockers.push(`${cohort}: Training or future holdout is missing.`);
    const attendance = rate(training, 'activeDays'), purchase = rate(training, 'purchaseDays'), holdoutAttendance = rate(holdout, 'activeDays'), holdoutPurchase = rate(holdout, 'purchaseDays');
    return { cohort, trainingUnits: training.length, holdoutUnits: holdout.length, attendance, purchase, holdoutAttendance, holdoutPurchase, attendanceError: attendance === null || holdoutAttendance === null ? null : holdoutAttendance - attendance, purchaseError: purchase === null || holdoutPurchase === null ? null : holdoutPurchase - purchase };
  });
  const experiment = rows.filter((row) => row.period === 'experiment' && row.assigned);
  const population = new Set(rows.filter((row) => row.period === 'holdout').map((row) => row.unitId));
  const assignedUnits = new Set(experiment.map((row) => row.unitId));
  const missingAssignments = [...population].filter((id) => !assignedUnits.has(id)).length;
  if (missingAssignments) blockers.push(`${missingAssignments} holdout panel groups lack an assignment record.`);
  const baseline = experiment.filter((row) => row.arm === 'baseline'), candidate = experiment.filter((row) => row.arm === 'candidate');
  const missingExposure = experiment.filter((row) => !row.exposed).length;
  if (missingExposure) blockers.push(`${missingExposure} assigned groups have no recorded exposure. Investigate coverage before inference.`);
  const srmP = srm(candidate.length, experiment.length, e.candidateShare);
  if (srmP === null || srmP < .001) blockers.push('Assignment sample ratio mismatch or missing assignment population.');
  if (baseline.length < e.minimumUnitsPerArm || candidate.length < e.minimumUnitsPerArm) blockers.push('An arm has fewer units than the preregistered minimum.');
  const ci = bootstrap(baseline, candidate, evidence.synthetic.seed);
  const net = (data: ExtractRow[]) => data.length ? mean(data.map((row) => row.netMinor)) : null;
  const activity = (data: ExtractRow[]) => data.length ? data.reduce((sum, row) => sum + row.activeDays, 0) / data.reduce((sum, row) => sum + row.eligibleDays, 0) : null;
  const b = net(baseline), a = net(candidate), ba = activity(baseline), aa = activity(candidate);
  const pooled = experiment.map((row) => row.netMinor); const cap = pooled.length ? quantile(pooled, .95) : null;
  const winsorDifference = cap === null || !baseline.length || !candidate.length ? null : mean(candidate.map((row) => Math.min(row.netMinor, cap))) - mean(baseline.map((row) => Math.min(row.netMinor, cap)));
  const positive = pooled.map((value) => Math.max(0, value)).sort((x, y) => y - x); const totalPositive = positive.reduce((sum, value) => sum + value, 0);
  const topShare = totalPositive ? positive.slice(0, Math.max(1, Math.ceil(positive.length * .05))).reduce((sum, value) => sum + value, 0) / totalPositive : null;
  if (topShare !== null && topShare > .25) warnings.push('The highest-contribution 5% account for more than 25% of positive contribution. Review tail sensitivity and collect more independent groups.');
  if (e.kind === 'A/A' && ci && (ci.cash[0] > 0 || ci.cash[1] < 0 || ci.attendance[0] > 0 || ci.attendance[1] < 0)) blockers.push('A/A diagnostic interval excludes zero. Investigate before using the assignment pipeline.');
  if (!rows.length) blockers.push('No eligible extract rows.');
  const meetsCriteria = !!ci && ci.cash[0] > e.minimumUpliftMinor && ci.attendance[0] >= -e.maximumAttendanceDrop && winsorDifference !== null && winsorDifference >= e.minimumUpliftMinor;
  const readiness = blockers.length ? 'blocked' : e.kind === 'A/A' ? 'A/A diagnostics reviewed' : meetsCriteria ? 'criteria met' : 'inconclusive';
  // Normal approximation for a fixed 95% two-sided test and 80% power. Assumed SD is a planning input.
  const plannedTotal = Math.ceil((1.96 + .8416) ** 2 * e.planningSdMinor ** 2 / (e.minimumUpliftMinor ** 2 * e.candidateShare * (1 - e.candidateShare)));
  return { engineVersion: 'company-evidence-6' as const, evidence: evidence.provenance, quality: { inputRows: mapped.inputRows, acceptedRows: rows.length, duplicates: mapped.duplicates, late, unavailable, unreconciled, immature, missingExposure }, blockers, warnings, calibrations, experiment: { kind: e.kind, baselineUnits: baseline.length, candidateUnits: candidate.length, srmP, baselineMeanMinor: b, candidateMeanMinor: a, differenceMinor: b === null || a === null ? null : a - b, attendanceDifference: ba === null || aa === null ? null : aa - ba, ci, winsorDifference, topShare, plannedTotal }, readiness, meetsCriteria: !blockers.length && meetsCriteria };
}
export type EvidenceReport = ReturnType<typeof analyzeEvidence>;
