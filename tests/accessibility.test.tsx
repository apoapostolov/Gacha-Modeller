// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import axe from 'axe-core';
import { AnalysisResults } from '../src/ui/AnalysisResults.tsx';
import { AnalysisSettings } from '../src/ui/AnalysisSettings.tsx';
import { createProject } from '../src/project/project.ts';
import { compareProject } from '../src/jobs/compare.ts';
import { hardPityBaseline } from '../src/presets/index.ts';

beforeAll(() => { vi.stubGlobal('crypto', webcrypto); document.documentElement.lang = 'en'; document.title = 'Gacha Modeller'; });
async function check(markup: string) {
  document.body.innerHTML = `<main><h1>Gacha Modeller</h1>${markup}</main>`;
  document.querySelectorAll('details').forEach((element) => { element.open = true; });
  const results = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join('; ')}`)).toEqual([]);
}
describe('analysis interface semantics', () => {
  it('labels cohort progress and experiment controls without requiring hover', async () => {
    const project = await createProject(hardPityBaseline);
    const settings = { ...project.settings, analysis: { cohorts: [{ id: 'returning', name: 'Returning players', weight: 3, initialState: {} }] } };
    await check(renderToStaticMarkup(<AnalysisSettings value={settings} models={[project.baseline.model, project.candidate.model]} onChange={() => {}} />));
    await check(renderToStaticMarkup(<AnalysisSettings value={{ ...project.settings, analysis: { experiment: { axes: [{ parameter: 'price', values: [1, 2] }], trials: 100, validationSeed: 43, objectives: ['cost', 'attainment'], minAttainment: .9, maxCost: 100 } } }} models={[project.baseline.model, project.candidate.model]} onChange={() => {}} />));
  });
  it('exposes interval, exact, tradeoff and surface values as named tables and text', async () => {
    const project = await createProject(hardPityBaseline);
    const report = await compareProject(project, { ...project.settings, trials: 30, seed: 42, maxPulls: 100, analysis: { experiment: { axes: [{ parameter: 'price', values: [1, 2] }, { parameter: `pity:${hardPityBaseline.pity[0]!.rarity}`, values: [50, 80] }], trials: 30, validationSeed: 43, objectives: ['cost', 'attainment'], minAttainment: .9, maxCost: 100 } } });
    await check(renderToStaticMarkup(<AnalysisResults report={report} />));
  });
});
