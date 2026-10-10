// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { App } from '../src/App.tsx';
import { createProject, importProject, saveCandidate, type Project, type RunSettings } from '../src/project/project.ts';
import { hardPityBaseline } from '../src/presets/index.ts';
import { ProjectLibrary } from '../src/ui/ProjectLibrary.tsx';
import { defaultEvidence } from '../src/company/synthetic.ts';
import { CompanyWorkbench } from '../src/ui/CompanyWorkbench.tsx';
import { SpecialistWorkbench } from '../src/ui/SpecialistWorkbench.tsx';
import { IntegrationWorkbench } from '../src/ui/IntegrationWorkbench.tsx';
import { Help } from '../src/ui/Help.tsx';

const fixture = vi.hoisted(() => ({ library: {} as Record<string, unknown> }));
vi.mock('../src/project/useLibrary.ts', () => ({ useLibrary: () => fixture.library }));
const jobs: { project: Project; settings: RunSettings; worker: FakeWorker }[] = [];
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror = null;
  terminate = vi.fn();
  postMessage(job: { project: Project; settings: RunSettings }) { jobs.push({ ...job, worker: this }); }
}
let root: Root;
let container: HTMLDivElement;
let project: Project;
const replace = vi.fn(async (_project: Project) => {});
const button = (name: string) => [...container.querySelectorAll('button')].find(node => node.textContent === name)!;
async function click(name: string) { await act(async () => { button(name).click(); }); }
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto); vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); jobs.length = 0; replace.mockClear();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  project = await createProject(hardPityBaseline);
  const model = structuredClone(project.candidate.model); model.pity[0]!.hardAt = 80;
  project = await saveCandidate(project, model);
  fixture.library = { project, generation: 0, ready: true, saveState: 'Project files loaded', storageError: null, sections: [], entries: [], diagnostics: [], legacyCount: 0, replace, select: vi.fn(), refresh: vi.fn(), migrate: vi.fn() };
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe('optional candidate workspace', () => {
  it('opens and refreshes with only the baseline; loading never starts a comparison', async () => {
    await act(async () => root.render(<App />));
    expect(container.querySelector('.model-details .role-label')?.textContent).toBe('Baseline');
    expect(container.querySelector('.role-label.candidate')).toBeNull();
    expect(jobs).toHaveLength(0); expect(button('Run comparison')).toBeUndefined();
    await click('Load candidate');
    expect(container.querySelector('.role-label.candidate')).not.toBeNull(); expect(jobs).toHaveLength(0);
    await click('Run comparison'); expect(jobs).toHaveLength(1);
    fixture.library = { ...fixture.library, generation: 1 };
    await act(async () => root.render(<App />));
    expect(container.querySelector('.role-label.candidate')).toBeNull();
    expect(jobs[0]!.worker.terminate).toHaveBeenCalled();
  });
  it('compares a historical candidate without promoting it in the saved file', async () => {
    await act(async () => root.render(<App />));
    const picker = container.querySelector<HTMLSelectElement>('.candidate-picker select')!;
    await act(async () => { picker.value = project.history[0]!.id; picker.dispatchEvent(new Event('change', { bubbles: true })); });
    await click('Load candidate'); await click('Run comparison');
    expect(jobs[0]!.project.candidate.hash).toBe(project.history[0]!.hash);
    expect(jobs[0]!.project.baseline.hash).toBe(project.baseline.hash);
    expect(replace).not.toHaveBeenCalled();
    await click('Cancel run'); await click('Run settings');
    const trials = container.querySelector<HTMLInputElement>('#setting-trials')!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(trials, '25'); trials.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => { container.querySelector<HTMLButtonElement>('dialog .primary')!.click(); });
    expect(jobs[1]!.settings.trials).toBe(25);
    expect(jobs[1]!.project.candidate.hash).toBe(project.history[0]!.hash);
    expect(replace).toHaveBeenCalledOnce();
    expect(replace.mock.calls[0]![0].candidate.hash).toBe(project.candidate.hash);
    expect(replace.mock.calls[0]![0].history).toEqual(project.history);
  });
  it('unloads the candidate and cancels its running job', async () => {
    await act(async () => root.render(<App />)); await click('Load candidate'); await click('Run comparison'); await click('Unload candidate');
    expect(jobs[0]!.worker.terminate).toHaveBeenCalled();
    expect(container.querySelector('.role-label.candidate')).toBeNull(); expect(button('Run comparison')).toBeUndefined();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Candidate selection');
  });
});

it('separates companies and projects, supports arrow-key tabs and expands search matches', async () => {
  const company = { ...project, id: 'company-pilot', name: 'Company pilot', company: defaultEvidence() };
  const catalog = { sections: [{ format: 'reward-model-section' as const, version: 1 as const, id: 'examples', title: 'Model examples', description: 'Long folder explanation', order: 0 }], entries: [{ project, section: 'examples', path: 'examples/model.json', revision: 'one' }, { project: company, section: 'examples', path: 'examples/company.json', revision: 'two' }], diagnostics: [] };
  await act(async () => root.render(<ProjectLibrary catalog={catalog} disabled={false} onSelect={() => {}} onRefresh={() => {}} onMigrate={() => {}} legacyCount={0} />));
  expect(container.textContent).not.toContain('Company pilot'); expect(container.textContent).not.toContain('Long folder explanation');
  const tab = container.querySelector<HTMLButtonElement>('[role=tab]')!;
  await act(async () => { tab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
  expect(container.querySelector('[aria-selected=true]')?.textContent).toBe('Companies');
  expect(container.textContent).toContain('Company pilot'); expect(container.textContent).not.toContain(project.name);
  await click('Projects');
  const search = container.querySelector<HTMLInputElement>('input[type=search]')!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, 'hard pity'); search.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(container.querySelector('details')?.open).toBe(true);
  expect(container.querySelector('[role=status]')?.textContent).toContain('1 matching project');
});

it('retains the overview and current file version when company, specialist and catalogue modules save', async () => {
  const overview = { context: 'Synthetic test', summary: 'A reward example.', distinctive: 'A fixed cap.', strength: 'Reward access.', analysis: 'Waiting times.' };
  const described: Project = { ...project, version: 7, overview };
  const saved: Project[] = [];
  const onSave = async (next: Project) => { saved.push(await importProject(next)); };
  await act(async () => root.render(<CompanyWorkbench project={described} onSave={onSave} onCalibrate={() => {}} />));
  await click('Company settings'); await click('Save company settings');
  await act(async () => root.render(<SpecialistWorkbench project={described} onSave={onSave} />));
  await click('Add collectible profile');
  await act(async () => root.render(<IntegrationWorkbench project={described} onSave={onSave} />));
  await click('Save binding');
  await act(async () => { await vi.waitFor(() => expect(saved).toHaveLength(3)); });
  for (const next of saved) { expect(next.version).toBe(7); expect(next.overview).toEqual(overview); expect(next.baseline.hash).toBe(project.baseline.hash); }
});

it('opens closed help with ArrowDown and returns focus with Escape', async () => {
  await act(async () => root.render(<Help label="Model context"><p>Additional explanation.</p></Help>));
  const trigger = container.querySelector<HTMLButtonElement>('.help-trigger')!;
  expect(document.querySelector('.help-panel')).toBeNull();
  await act(async () => { trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); });
  expect(document.activeElement?.className).toBe('help-panel');
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  expect(document.querySelector('.help-panel')).toBeNull(); expect(document.activeElement).toBe(trigger);
  await act(async () => { trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); });
  expect(document.activeElement?.className).toBe('help-panel');
});
