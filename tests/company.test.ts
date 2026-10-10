import { describe, expect, it } from 'vitest';
import { defaultEvidence, generateExtract } from '../src/company/synthetic.ts';
import { analyzeEvidence, srm } from '../src/company/analyze.ts';
import { mapExtract, parseCsv } from '../src/company/extract.ts';
import { assertEvidence, FIELDS, type ExtractRow } from '../src/company/types.ts';
import { createProject, importProject } from '../src/project/project.ts';
import { hardPityBaseline } from '../src/presets/index.ts';
import { decisionRecord } from '../src/company/decision.ts';
function fixture(change: (rows: ExtractRow[]) => void) { const evidence = defaultEvidence(); const rows = mapExtract(evidence).rows; change(rows); evidence.csv = [FIELDS.join(','), ...rows.map((row) => FIELDS.map((field) => row[field]).join(','))].join('\n'); return evidence; }
describe('company evidence contract', () => {
  it('replays seeded synthetic extracts and uncertainty with complete mature panel denominators', () => {
    const evidence = defaultEvidence(), report = analyzeEvidence(evidence);
    expect(generateExtract(evidence)).toBe(evidence.csv); expect(report.blockers).toEqual([]);
    expect(report.quality.acceptedRows).toBe(300); expect(report.experiment.baselineUnits).toBe(50); expect(report.experiment.candidateUnits).toBe(50);
    expect(report).toEqual(analyzeEvidence(evidence)); expect(report.warnings.join(' ')).toContain('Synthetic');
  });
  it('supports quoted values, BOM headers and explicit mapping', () => {
    expect(parseCsv('\uFEFFa,b\r\n"x,y","two\nlines"\r\n"a""b",z')).toEqual([['a','b'],['x,y','two\nlines'],['a"b','z']]);
    const evidence = defaultEvidence(); evidence.mapping.netMinor = 'contribution'; evidence.csv = evidence.csv.replace('netMinor','contribution');
    expect(mapExtract(evidence).rows).toHaveLength(300); expect(() => parseCsv('a,b\n"unclosed')).toThrow('Unclosed');
  });
  it('removes identical events and blocks conflicting event IDs and duplicate unit aggregates', () => {
    const evidence = defaultEvidence(); evidence.csv += '\n' + evidence.csv.split('\n')[1];
    expect(analyzeEvidence(evidence).quality.duplicates).toBe(1);
    const conflict = fixture((rows) => { rows[1]!.eventId = rows[0]!.eventId; }); expect(analyzeEvidence(conflict).blockers.join(' ')).toContain('Conflicting duplicate');
    const repeated = fixture((rows) => { rows.push({ ...rows[0]!, eventId: 'extra' }); }); expect(analyzeEvidence(repeated).blockers.join(' ')).toContain('Multiple aggregates');
  });
  it('separates conservation, late arrival, cutoff, maturity and period failures', () => {
    expect(analyzeEvidence(fixture((rows) => { rows[0]!.closingMinor++; })).quality.unreconciled).toBe(1);
    expect(analyzeEvidence(fixture((rows) => { rows[0]!.closingItems++; })).quality.unreconciled).toBe(1);
    expect(analyzeEvidence(fixture((rows) => { rows[0]!.receivedDay += 5; })).quality.late).toBe(1);
    expect(analyzeEvidence(fixture((rows) => { rows[2]!.receivedDay = 100; })).quality.unavailable).toBe(1);
    expect(analyzeEvidence(fixture((rows) => { rows[2]!.eligibleDays--; rows[2]!.activeDays = 0; rows[2]!.purchaseDays = 0; })).quality.immature).toBe(1);
    expect(analyzeEvidence(fixture((rows) => { rows[0]!.endDay = 31; rows[0]!.receivedDay = 32; })).blockers.join(' ')).toContain('temporal boundary');
  });
  it('blocks missing assignment, exposure and changing cohort identity', () => {
    expect(analyzeEvidence(fixture((rows) => { rows[2]!.assigned = false; })).blockers.join(' ')).toContain('lack an assignment');
    expect(analyzeEvidence(fixture((rows) => { rows[2]!.exposed = false; })).quality.missingExposure).toBe(1);
    expect(analyzeEvidence(fixture((rows) => { rows[1]!.cohort = 'different'; })).blockers.join(' ')).toContain('Cohort identity');
  });
  it('computes known exact two-sided allocation probabilities and blocks SRM', () => {
    expect(srm(0, 10, .5)).toBeCloseTo(.001953125, 12); expect(srm(5, 10, .5)).toBeCloseTo(1, 12); expect(srm(0, 0, .5)).toBeNull();
    const evidence = fixture((rows) => { for (const row of rows) if (row.period === 'experiment') row.arm = 'baseline'; });
    expect(analyzeEvidence(evidence).readiness).toBe('blocked'); expect(analyzeEvidence(evidence).blockers.join(' ')).toContain('ratio mismatch');
  });
  it('estimates baseline behaviour from training only and checks future errors', () => {
    const evidence = fixture((rows) => { for (const row of rows) { row.activeDays = row.period === 'training' ? 7 : 14; row.purchaseDays = row.period === 'training' ? 2 : 4; } });
    const row = analyzeEvidence(evidence).calibrations[0]!; expect(row.attendance).toBe(.5); expect(row.holdoutAttendance).toBe(1); expect(row.attendanceError).toBe(.5); expect(row.purchaseError).toBeCloseTo(2 / 14);
  });
  it('reports group tail sensitivity without silently replacing the primary estimate', () => {
    const evidence = fixture((rows) => { const exp = rows.filter((r) => r.period === 'experiment'); for (const row of exp) row.netMinor = 100; exp[99]!.netMinor = 1000000; });
    const report = analyzeEvidence(evidence); expect(report.experiment.topShare!).toBeGreaterThan(.9); expect(report.experiment.differenceMinor).toBeGreaterThan(10000); expect(report.experiment.winsorDifference).toBe(0); expect(report.meetsCriteria).toBe(false);
  });
  it('checks A/A null diagnostics and declared preregistration', () => {
    const evidence = fixture((rows) => { for (const row of rows) if (row.period === 'experiment') row.netMinor = row.arm === 'candidate' ? 2000 : 1000; }); evidence.experiment.kind = 'A/A';
    expect(analyzeEvidence(evidence).blockers.join(' ')).toContain('A/A'); evidence.experiment.preregisteredDay = 61;
    expect(analyzeEvidence(evidence).blockers.join(' ')).toContain('registered before');
  });
  it('retains a null A/A diagnostic and blocks adoption on insufficient independent groups', () => {
    const evidence = fixture((rows) => { for (const row of rows) { row.netMinor = 1000; row.activeDays = 7; row.purchaseDays = 1; } }); evidence.experiment.kind = 'A/A';
    const report = analyzeEvidence(evidence); expect(report.readiness).toBe('A/A diagnostics reviewed'); expect(report.experiment.ci!.cash).toEqual([0,0]);
    evidence.experiment.minimumUnitsPerArm = 100; expect(analyzeEvidence(evidence).readiness).toBe('blocked');
  });
  it('binds exported evidence to immutable models and downgrades synthetic adoption requests', async () => {
    const project = { ...await createProject(hardPityBaseline), version: 5 as const, company: defaultEvidence() }; project.company.decision.status = 'proposed-adoption';
    const imported = await importProject(project), record = await decisionRecord(imported);
    expect(record.baselineHash).toBe(project.baseline.hash); expect(record.evidenceHash).toHaveLength(64); expect(record.decision.status).toBe('hold'); expect(record.decision.adoptionReady).toBe(false);
    await expect(importProject({ ...project, version: 4 })).rejects.toThrow('version 5');
  });
  it('does not infer company approval or accept invalid numeric contracts', () => {
    const evidence = defaultEvidence(); evidence.provenance = 'company-extract'; evidence.contract.approval = 'pending';
    expect(analyzeEvidence(evidence).blockers.join(' ')).toContain('approved contract'); evidence.synthetic.units = NaN;
    expect(() => assertEvidence(evidence)).toThrow('Synthetic assumptions');
  });
});
