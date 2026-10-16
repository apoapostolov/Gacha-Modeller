// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import axe from 'axe-core';
import { AnalysisResults } from '../src/ui/AnalysisResults.tsx';
import { SingleModelResults } from '../src/ui/SingleModelResults.tsx';
import { AnalysisSettings } from '../src/ui/AnalysisSettings.tsx';
import { createProject } from '../src/project/project.ts';
import { compareProject } from '../src/jobs/compare.ts';
import { hardPityBaseline } from '../src/presets/index.ts';
import { EconomySettings } from '../src/ui/EconomySettings.tsx';
import { EconomyResults } from '../src/ui/EconomyResults.tsx';
import { defaultEconomy } from '../src/economy/config.ts';
import { CompanyWorkbench, CompanyEditor } from '../src/ui/CompanyWorkbench.tsx';
import { ProjectLibrary } from '../src/ui/ProjectLibrary.tsx';
import { ProjectOverview } from '../src/ui/ProjectOverview.tsx';
import { CandidatePicker } from '../src/ui/CandidatePicker.tsx';
import { ResultsPreview } from '../src/ui/ResultsPreview.tsx';
import { ModelDetails } from '../src/ui/ModelDetails.tsx';
import { ModelEditor } from '../src/ui/ModelEditor.tsx';
import { RunSettings } from '../src/ui/RunSettings.tsx';
import { defaultEvidence } from '../src/company/synthetic.ts';
import { SpecialistEditor, SpecialistResults } from '../src/ui/SpecialistWorkbench.tsx';
import { IntegrationWorkbench } from '../src/ui/IntegrationWorkbench.tsx';
import { defaultSpecialist } from '../src/specialist/defaults.ts';
import { specialistExport } from '../src/specialist/report.ts';

beforeAll(() => { vi.stubGlobal('crypto', webcrypto); document.documentElement.lang = 'en'; document.title = 'Gacha Modeller'; });
async function check(markup: string) {
  document.body.innerHTML = `<main><h1>Gacha Modeller</h1>${markup}</main>`;
  document.querySelectorAll('details').forEach((element) => { element.open = true; });
  document.querySelectorAll('dialog').forEach((element) => { element.open = true; });
  const results = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join('; ')}`)).toEqual([]);
}
describe('analysis interface semantics', () => {
  it('shows full game context, linked sources and accessible unrun results', async () => {
    const base = await createProject(hardPityBaseline);
    const project = { ...base, overview: { context: 'Game context', summary: 'First sentence. This second sentence should stay visible.', distinctive: 'Distinctive rules.', strength: 'Player appeal.', analysis: 'Questions.', popularity: 'Dated reception.', business: 'Commercial context.', sources: [{ title: 'Source notes', url: 'https://example.com' }] } };
    await check(renderToStaticMarkup(<ProjectOverview project={project} />));
    expect(document.querySelector('.overview-intro')?.textContent).toContain('This second sentence should stay visible.');
    expect(document.querySelector('.overview-grid')?.textContent).toContain('Dated reception.');
    expect(document.querySelector('.overview-scope a')?.getAttribute('href')).toBe('https://example.com');
    await check(renderToStaticMarkup(<ResultsPreview model={base.baseline.model} settings={base.settings} comparing={false} busy={false} />));
    expect(document.querySelectorAll('thead th')).toHaveLength(2);
    await check(renderToStaticMarkup(<ResultsPreview model={base.baseline.model} settings={base.settings} comparing busy={false} />));
    expect(document.querySelectorAll('thead th')).toHaveLength(4);
  });
  it('labels project overviews, optional candidate selection and model disclosures', async () => {
    const project = await createProject(hardPityBaseline);
    await check(renderToStaticMarkup(<ProjectOverview project={project} />));
    await check(renderToStaticMarkup(<CandidatePicker project={project} loaded={null} disabled={false} onLoad={() => {}} onUnload={() => {}} />));
    await check(renderToStaticMarkup(<CandidatePicker project={project} loaded={project.candidate} disabled={false} onLoad={() => {}} onUnload={() => {}} />));
    await check(renderToStaticMarkup(<ModelDetails model={project.baseline.model} role="Baseline" hash={project.baseline.hash} seed={42} actionMode="single" />));
  });
  it('keeps candidate and run-settings disclosure summaries separate from help buttons', async () => {
    const project = await createProject(hardPityBaseline);
    await check(renderToStaticMarkup(<ModelEditor draft={structuredClone(project.candidate.model)} onChange={() => {}} onClose={() => {}} onSave={() => {}} busy={false} error={null} />));
    expect(document.body.textContent).toContain('0.01 means 1%');
    expect(document.body.textContent).toContain('Guarantees after missed draws');
    await check(renderToStaticMarkup(<RunSettings value={project.settings} onChange={() => {}} onClose={() => {}} onRun={() => {}} packAvailable={false} models={[project.baseline.model, project.candidate.model]} busy={false} error={null} />));
    expect(document.body.textContent).toContain('How many players?');
    expect(document.body.textContent).toContain('A player succeeds after receiving at least one featured reward.');
  });
  it('labels specialist cash, supply, payout, review and catalogue controls',async()=>{
    for(const kind of ['collectible','payout'] as const){const p=defaultSpecialist(kind);p.run.trials=10;
      await check(renderToStaticMarkup(<SpecialistEditor initial={p} onSave={async()=>{}} onClose={()=>{}}/>));
      await check(renderToStaticMarkup(<SpecialistResults report={await specialistExport(p)}/>));}
    await check(renderToStaticMarkup(<IntegrationWorkbench project={await createProject(hardPityBaseline)} onSave={async()=>{}}/>));
  });
  it('exposes company calibration, quality and decision content and dynamic section labels', async () => {
    const project = { ...await createProject(hardPityBaseline), version: 5 as const, company: defaultEvidence() };
    await check(renderToStaticMarkup(<CompanyWorkbench project={project} onSave={async () => {}} onCalibrate={() => {}} />));
    await check(renderToStaticMarkup(<ProjectLibrary catalog={{ sections: [{ format: 'reward-model-section', version: 1, id: 'company', title: 'Company', description: 'Editable company assumptions', order: 0 }], entries: [{ project, section: 'company', path: 'company/pilot.json', revision: 'hash' }], diagnostics: [] }} selected={project.id} disabled={false} ready onSelect={() => {}} onRefresh={() => {}} legacyCount={0} onMigrate={() => {}} />));
  });
  it('labels company ownership, assumptions, CSV mapping and decision criteria controls', async () => {
    await check(renderToStaticMarkup(<CompanyEditor initial={defaultEvidence()} onSave={async () => {}} onClose={() => {}} />));
  });
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
    expect(document.body.textContent).toContain('Compare players with progress already earned');
    await check(renderToStaticMarkup(<AnalysisSettings value={{ ...project.settings, analysis: { experiment: { axes: [{ parameter: 'price', values: [1, 2] }], trials: 100, validationSeed: 43, objectives: ['cost', 'attainment'], minAttainment: .9, maxCost: 100 } } }} models={[project.baseline.model, project.candidate.model]} onChange={() => {}} />));
    expect(document.body.textContent).toContain('Test changes to candidate settings');
    expect(document.body.textContent).toContain('0.02 means 2%');
  });
  it('exposes interval, exact, tradeoff and surface values as named tables and text', async () => {
    const project = await createProject(hardPityBaseline);
    const report = await compareProject(project, { ...project.settings, trials: 30, seed: 42, maxPulls: 100, analysis: { experiment: { axes: [{ parameter: 'price', values: [1, 2] }, { parameter: `pity:${hardPityBaseline.pity[0]!.rarity}`, values: [50, 80] }], trials: 30, validationSeed: 43, objectives: ['cost', 'attainment'], minAttainment: .9, maxCost: 100 } } });
    await check(renderToStaticMarkup(<AnalysisResults report={report} />));
  });
  it('shows a selected model’s results without candidate comparison columns', async () => {
    const project = await createProject(hardPityBaseline);
    const report = await compareProject(project, { ...project.settings, trials: 30, seed: 42, maxPulls: 100 });
    await check(renderToStaticMarkup(<SingleModelResults report={report} />));
    expect(document.body.textContent).toContain('Player outcomes');
    expect(document.body.textContent).toContain('Chance of reaching the goal by each draw');
    expect(document.body.textContent).not.toContain('Candidate');
    expect(document.body.textContent).not.toContain('Difference');
  });
});
