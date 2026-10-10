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
import { EconomySettings } from '../src/ui/EconomySettings.tsx';
import { EconomyResults } from '../src/ui/EconomyResults.tsx';
import { defaultEconomy } from '../src/economy/config.ts';

beforeAll(() => { vi.stubGlobal('crypto', webcrypto); document.documentElement.lang = 'en'; document.title = 'Gacha Modeller'; });
async function check(markup: string) {
  document.body.innerHTML = `<main><h1>Gacha Modeller</h1>${markup}</main>`;
  document.querySelectorAll('details').forEach((element) => { element.open = true; });
  const results = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join('; ')}`)).toEqual([]);
}
describe('analysis interface semantics', () => {
  it('labels economy, financial, calendar, utility and policy controls', async()=>{
    const project=await createProject(hardPityBaseline),economy=defaultEconomy([hardPityBaseline,hardPityBaseline]);
    economy.calendar=[{id:'grant',day:2,type:'grant',origin:'earned',amount:1000},{id:'season',day:30,type:'season',seasonId:'second'},{id:'banner',day:31,type:'banner-switch',model:hardPityBaseline},{id:'target',day:32,type:'target-switch',targetId:hardPityBaseline.items[0]!.id},{id:'expiry',day:40,type:'expire-promotional'}];
    await check(renderToStaticMarkup(<EconomySettings value={{...project.settings,economy}} models={[hardPityBaseline,hardPityBaseline]} onChange={()=>{}}/>));
  });
  it('exposes calendar comparisons and ledger effects in named, keyboard-scrollable tables',async()=>{
    const project=await createProject(hardPityBaseline),economy=defaultEconomy([hardPityBaseline,hardPityBaseline]);economy.days=2;economy.trials=1;economy.availableThroughDay=2;economy.policies=economy.policies.slice(0,1).map(p=>({...p,savingUntilDay:1}));economy.offers[0]!.endDay=2;
    const report=await compareProject(project,{...project.settings,trials:30,maxPulls:100,economy});
    await check(renderToStaticMarkup(<EconomyResults report={report}/>));
    expect(document.body.textContent).toContain('percentage points (pp)');expect(document.body.textContent).toContain('company finance approval pending');
  });
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
