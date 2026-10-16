import { mulberry32 } from '../engine/rng.ts';
import { FIELDS, type CompanyEvidence, type ExtractRow } from './types.ts';
export function defaultEvidence(): CompanyEvidence {
  const value: CompanyEvidence = {
    format: 'company-evidence', version: 1, provenance: 'synthetic',
    contract: { owner: 'Example Studio · Product Analytics', decision: 'Compare the reference rules with the proposed rules over a 14-day horizon.', authority: 'Synthetic example data; no company approval', approval: 'synthetic', currency: 'USD', metricDefinition: 'Net cash contribution in minor currency units per assigned independent group over the full horizon; attendance uses eligible group-days.', assignmentUnit: 'Independent household group; one aggregate row per group and period', asOfDay: 90, trainingEndDay: 30, holdoutStartDay: 31, experimentStartDay: 61, horizonDays: 14, allowedLatenessDays: 2 },
    experiment: { kind: 'A/B', candidateShare: .5, minimumUnitsPerArm: 30, minimumUpliftMinor: 50, maximumAttendanceDrop: .03, preregisteredDay: 60, planningSdMinor: 300 },
    synthetic: { seed: 42, units: 100, attendance: .7, purchase: .1, contributionMinor: 1500, candidateUpliftMinor: 80, candidateAttendanceDelta: .01, missingExposure: 0, outlierMultiplier: 8 },
    mapping: Object.fromEntries(FIELDS.map((field) => [field, field])) as CompanyEvidence['mapping'], csv: '',
    decision: { status: 'draft', alternatives: 'Keep the current reward rules; change the guarantee timing; adjust the free-reward schedule.', constraints: 'Preserve attendance, budget controls and disclosed reward rules.', unresolved: 'Synthetic data cannot show whether players feel more engaged, stay longer or spend more.', nextExperiment: 'After company approval, run an A/A check followed by a fixed-duration A/B test and independent review.', rationale: 'Check data quality, estimate precision and high-spending outliers before proposing a live test.' },
  };
  value.csv = generateExtract(value); return value;
}
export function generateExtract(evidence: CompanyEvidence): string {
  const s = evidence.synthetic, c = evidence.contract, rng = mulberry32(s.seed);
  const rows: ExtractRow[] = [];
  for (let i = 0; i < s.units; i++) for (const period of ['training','holdout','experiment'] as const) {
    const arm = period === 'experiment' && i / s.units >= 1 - evidence.experiment.candidateShare ? 'candidate' : 'baseline';
    const candidate = arm === 'candidate' && evidence.experiment.kind === 'A/B';
    const startDay = period === 'training' ? Math.max(0, c.trainingEndDay - c.horizonDays + 1) : period === 'holdout' ? c.holdoutStartDay : c.experimentStartDay;
    const attendance = Math.min(1, Math.max(0, s.attendance + (candidate ? s.candidateAttendanceDelta : 0)));
    let activeDays = 0, purchaseDays = 0;
    for (let day = 0; day < c.horizonDays; day++) if (rng() < attendance) { activeDays++; if (rng() < s.purchase) purchaseDays++; }
    const netMinor = Math.round((s.contributionMinor + (candidate ? s.candidateUpliftMinor : 0)) * (.8 + rng() * .4) * (i % 50 === 0 ? s.outlierMultiplier : 1));
    rows.push({ eventId: `${period}-${i}`, unitId: `group-${i}`, cohort: i % 2 ? 'returning' : 'new', period, arm, assigned: true, exposed: period !== 'experiment' || rng() >= s.missingExposure, startDay, endDay: startDay + c.horizonDays - 1, receivedDay: startDay + c.horizonDays, eligibleDays: c.horizonDays, activeDays, purchaseDays, netMinor, openingMinor: 10000, creditsMinor: purchaseDays * 100, debitsMinor: activeDays * 50, closingMinor: 10000 + purchaseDays * 100 - activeDays * 50, openingItems: 0, awardedItems: activeDays, closingItems: activeDays });
  }
  return [FIELDS.join(','), ...rows.map((row) => FIELDS.map((field) => row[field]).join(','))].join('\n');
}
