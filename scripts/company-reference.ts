import { readFile } from 'node:fs/promises';
import { importProject, contentHash } from '../src/project/project.ts';
import { analyzeEvidence } from '../src/company/analyze.ts';
const project = await importProject(JSON.parse(await readFile(new URL('../projects/company/synthetic-company-pilot.json', import.meta.url), 'utf8')));
const expected = JSON.parse(await readFile(new URL('../docs/company-reference.json', import.meta.url), 'utf8'));
const report = analyzeEvidence(project.company!);
if (expected.evidenceHash !== await contentHash(project.company!) || JSON.stringify(report) !== JSON.stringify(expected.report)) throw new Error('Company evidence reference differs from the exported browser report.');
console.log(JSON.stringify({ replay: 'exact', groups: report.experiment.baselineUnits + report.experiment.candidateUnits, rows: report.quality.acceptedRows, readiness: report.readiness, contributionDifferenceMinor: report.experiment.differenceMinor, interval: report.experiment.ci!.cash }, null, 2));
