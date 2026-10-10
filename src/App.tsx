import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { type Banner } from './engine/index.ts';
import { importProject, saveCandidate, semanticDiff, withSettings, type ModelSnapshot, type RunSettings as Settings } from './project/project.ts';
import { useLibrary } from './project/useLibrary.ts';
import { ComparisonRunner } from './jobs/runner.ts';
import type { ComparisonReport } from './jobs/compare.ts';
import { Help } from './ui/Help.tsx';
import { ModelDetails } from './ui/ModelDetails.tsx';
import { ModelEditor } from './ui/ModelEditor.tsx';
import { RunSettings } from './ui/RunSettings.tsx';
import { ComparisonResults } from './ui/ComparisonResults.tsx';
import { ProjectLibrary } from './ui/ProjectLibrary.tsx';
import { ProjectOverview } from './ui/ProjectOverview.tsx';
import { CandidatePicker } from './ui/CandidatePicker.tsx';
import { CompanyWorkbench } from './ui/CompanyWorkbench.tsx';
import { downloadJson } from './ui/download.ts';
import './workbench.css';
const SpecialistWorkbench = lazy(() => import('./ui/SpecialistWorkbench.tsx').then(module => ({ default: module.SpecialistWorkbench })));
const IntegrationWorkbench = lazy(() => import('./ui/IntegrationWorkbench.tsx').then(module => ({ default: module.IntegrationWorkbench })));

export function App() {
  const library = useLibrary();
  const project = library.project;
  const runner = useRef<ComparisonRunner | null>(null);
  if (!runner.current) runner.current = new ComparisonRunner(() => new Worker(new URL('./jobs/comparison.worker.ts', import.meta.url), { type: 'module' }));
  const upload = useRef<HTMLInputElement>(null);
  const projectHeading = useRef<HTMLHeadingElement>(null);
  const candidateRegion = useRef<HTMLDivElement>(null);
  const [selectionFocus, setSelectionFocus] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [candidate, setCandidate] = useState<ModelSnapshot | null>(null);
  const [draft, setDraft] = useState<Banner | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [workspaceModule, setWorkspaceModule] = useState<'model' | 'company' | 'specialist' | 'integration'>('model');
  const [operation, setOperation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => () => runner.current?.cancel(), []);
  useEffect(() => {
    runner.current?.cancel(); setBusy(false); setProgress(0); setReport(null); setError(null); setNotice(null);
    setSettings(project ? structuredClone(project.settings) : null);
    setCandidate(null); setDraft(null); setSettingsOpen(false); setEditorOpen(false);
    setWorkspaceModule(project?.specialist ? 'specialist' : project?.company ? 'company' : project?.integration ? 'integration' : 'model');
    // File saves keep the loaded comparison; selection and refresh start with the baseline.
  }, [project?.id, library.generation]);
  useEffect(() => { if (notice) candidateRegion.current?.focus({ preventScroll: true }); }, [candidate?.id]);
  useEffect(() => { if (selectionFocus) projectHeading.current?.focus(); }, [selectionFocus]);

  function loadCandidate(snapshot: ModelSnapshot | null) {
    runner.current?.cancel(); setBusy(false); setProgress(0); setReport(null); setError(null);
    setCandidate(snapshot); setDraft(snapshot ? structuredClone(snapshot.model) : null);
    setEditorOpen(false); setSettingsOpen(false);
    setNotice(snapshot ? 'Candidate loaded. Comparison runs on request.' : 'Baseline view. Candidate unloaded.');
  }
  function run(): boolean {
    if (!project || !settings || !candidate) return false;
    try {
      const snapshot = withSettings({ ...project, candidate }, settings);
      // Settings save against the current file, never against a selected historical revision.
      const saved = withSettings(project, settings);
      runner.current?.start(snapshot, snapshot.settings, (event) => {
        if (event.type === 'progress') setProgress(event.completed / event.total);
        else if (event.type === 'result') { setReport(event.report); setBusy(false); setProgress(1); setNotice('Comparison complete.'); }
        else { setError(event.message); setBusy(false); }
      });
      if (JSON.stringify(saved.settings) !== JSON.stringify(project.settings)) void library.replace(saved).catch(() => {});
      setError(null); setNotice(null); setProgress(0); setBusy(true);
      return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not start comparison.'); setBusy(false); return false; }
  }
  function cancel() { runner.current?.cancel(); setBusy(false); setNotice('Comparison cancelled. The last completed result is kept.'); }
  async function libraryOperation(action: () => Promise<unknown>) {
    setOperation(true); setError(null);
    try { await action(); } catch (failure) { setError((failure as Error).message); } finally { setOperation(false); }
  }
  async function commit() {
    if (!project || !draft) return;
    const current = project; const model = structuredClone(draft);
    setOperation(true); setError(null);
    try {
      const next = await saveCandidate(current, model);
      runner.current?.cancel(); setBusy(false); await library.replace(next);
      setCandidate(next.candidate); setDraft(structuredClone(next.candidate.model));
      setEditorOpen(false); setNotice('Candidate revision saved. Run comparison to include it.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save candidate.'); }
    finally { setOperation(false); }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    setOperation(true); setError(null);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Import: Choose a JSON project of 5 MB or less.');
      await library.add(await importProject(JSON.parse(await file.text())));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not import project.'); }
    finally { setOperation(false); if (upload.current) upload.current.value = ''; }
  }
  const visibleReport = report?.project.id === project?.id && report?.project.candidate.hash === candidate?.hash && report?.project.baseline.hash === project?.baseline.hash ? report : null;
  const changed = !!(visibleReport && settings && JSON.stringify(visibleReport.settings) !== JSON.stringify(settings));
  const draftChanged = !!(candidate && draft && JSON.stringify(candidate.model) !== JSON.stringify(draft));
  const packAvailable = !!(project?.baseline.model.multiPull && candidate?.model.multiPull);
  const changes = project && candidate ? semanticDiff(project.baseline.model, candidate.model) : [];
  return <div className="shell">
    <a href="#project-workspace" className="skip-link">Skip to project</a>
    <header className="top"><div><h1>Gacha Modeller</h1><p className="lede">Probability models</p></div></header>
    <button className="secondary library-toggle" aria-expanded={libraryOpen} aria-controls="model-library" onClick={() => setLibraryOpen(!libraryOpen)}>Library</button>
    <main className="workspace" id="workspace">
      <aside id="model-library" className={`panel catalog ${libraryOpen ? 'is-open' : ''}`} aria-label="Project and company library">
        <ProjectLibrary catalog={library} selected={project?.id} disabled={operation} onSelect={(id) => { library.select(id); setLibraryOpen(false); setSelectionFocus(value => value + 1); }} onRefresh={() => void libraryOperation(library.refresh)} legacyCount={library.legacyCount} onMigrate={() => void libraryOperation(library.migrate)} />
      </aside>
      <div className="workspace-content" id="project-workspace" tabIndex={-1}>
        <header className="project-toolbar">
          <div className="project-title"><span className="eyebrow">Project</span><h2 ref={projectHeading} tabIndex={-1}>{project?.name ?? (library.ready ? 'No project selected' : 'Opening projects…')}</h2></div>
          <div className="project-controls">
            <span className="save-status" data-saved={['Saved to project file','Project files loaded'].includes(library.saveState)} role="status">{library.saveState}</span>
            <details className="project-file-actions"><summary>Files</summary><div className="project-actions"><button className="text-button" disabled={operation} onClick={() => upload.current?.click()}>Import project</button><button className="text-button" disabled={!project || operation} onClick={() => project && downloadJson(project, `${project.baseline.model.id}-project.json`)}>Export project</button>{visibleReport && <button className="text-button" onClick={() => downloadJson(visibleReport, `${visibleReport.project.baseline.model.id}-${visibleReport.settings.seed}-comparison.json`)}>Export comparison</button>}</div></details>
            {((workspaceModule === 'model' && candidate) || busy) && <div className="header-actions"><button className="secondary" disabled={!candidate || operation} onClick={() => setSettingsOpen(true)}>Run settings</button>{busy ? <button className="primary" onClick={cancel}>Cancel run</button> : <button className="primary" disabled={operation} onClick={() => run()}>Run comparison</button>}</div>}
          </div>
          <input className="sr-only" ref={upload} tabIndex={-1} aria-label="Import project JSON" type="file" accept=".json,application/json" onChange={(e) => void importFile(e.target.files?.[0])} />
        </header>
        {library.storageError && <p className="run-error" role="alert">{library.storageError} <button className="text-button" onClick={library.dismissStorageError}>Dismiss</button></p>}
        {error && !settingsOpen && !editorOpen && <p className="run-error" role="alert">{error}</p>}
        {notice && workspaceModule === 'model' && <p className="status-line" role="status">{notice}</p>}
        {changed && workspaceModule === 'model' && <p className="status-line">Settings changed. Results show the last completed comparison.</p>}
        {busy && <div className="job-progress" role="status"><progress max={1} value={progress} aria-label="Comparison progress" /><span>{Math.round(progress * 100)}% · comparing models{settings?.economy ? ' and economy scenarios' : settings?.analysis ? ' and analysis' : ''}</span></div>}
        {project && settings && <>
          <div className="workspace-modules" role="group" aria-label="Workspace module"><button className="secondary" aria-pressed={workspaceModule === 'model'} onClick={() => setWorkspaceModule('model')}>Models</button><button className="secondary" aria-pressed={workspaceModule === 'company'} onClick={() => setWorkspaceModule('company')}>Company evidence</button><button className="secondary" aria-pressed={workspaceModule === 'specialist'} onClick={() => setWorkspaceModule('specialist')}>Specialist scenarios</button><button className="secondary" aria-pressed={workspaceModule === 'integration'} onClick={() => setWorkspaceModule('integration')}>Catalogue integration</button></div>
          <ProjectOverview project={project} />
          <Suspense fallback={<p role="status">Opening workspace module…</p>}>
            {workspaceModule === 'integration' ? <IntegrationWorkbench key={`${project.id}-${library.generation}`} project={project} onSave={library.replace}/> : workspaceModule === 'specialist' ? <SpecialistWorkbench key={`${project.id}-${library.generation}`} project={project} onSave={library.replace}/> : workspaceModule === 'company' ? <CompanyWorkbench key={`${project.id}-${library.generation}`} project={project} onSave={library.replace} onCalibrate={(next) => { setSettings(next); void library.replace(withSettings(project, next)).catch(() => {}); setNotice('Training estimates saved to the selected policy.'); }} /> : <>
              <div className="model-pair">
                <ModelDetails model={project.baseline.model} role="Baseline" hash={project.baseline.hash} seed={settings.seed} targetId={settings.targetId} actionMode={settings.actionMode} />
                <div className="candidate-column" role="region" aria-label={candidate ? 'Loaded candidate' : 'Candidate selection'} tabIndex={-1} ref={candidateRegion}>
                  {candidate ? <><ModelDetails model={candidate.model} role="Candidate" hash={candidate.hash} seed={settings.seed} targetId={settings.targetId} actionMode={settings.actionMode} onEdit={() => setEditorOpen(true)} /><details className="panel candidate-selection"><summary>{candidate.id === project.candidate.id ? 'Current candidate' : 'Historical candidate'} · {project.history.length + 1} available</summary><CandidatePicker project={project} loaded={candidate} disabled={operation} onLoad={loadCandidate} onUnload={() => loadCandidate(null)} /></details></> : <section className="panel candidate-empty"><h3>Candidate</h3><p>Optional comparison model. Load a saved revision to inspect or modify it.</p><CandidatePicker project={project} loaded={null} disabled={operation} onLoad={loadCandidate} onUnload={() => loadCandidate(null)} /></section>}
                </div>
              </div>
              {draftChanged && <p className="status-line">Unsaved candidate edits. <button className="text-button" onClick={() => setEditorOpen(true)}>Continue editing</button></p>}
              {candidate && <>
                {visibleReport ? <ComparisonResults key={visibleReport.completedAt} report={visibleReport} /> : <section className="panel empty-results"><h2>Comparison results</h2><p>{busy ? 'Simulation in progress. Results will appear here.' : 'Run comparison for reward probabilities, waiting times and configured economic outcomes.'}</p></section>}
                <details className="panel live-diff"><summary>Model changes ({changes.length})</summary><ul>{changes.map((change, i) => <li key={i}><code>{change.path}</code>: {JSON.stringify(change.before)} → {JSON.stringify(change.after)}</li>)}</ul></details>
              </>}
            </>}
          </Suspense>
        </>}
      </div>
    </main>
    {settingsOpen && settings && project && candidate && <RunSettings value={settings} onChange={(next) => { setSettings(next); setError(null); }} onClose={() => setSettingsOpen(false)} packAvailable={packAvailable} models={[project.baseline.model, candidate.model]} busy={busy} error={error} onRun={() => { if (run()) setSettingsOpen(false); }} />}
    {editorOpen && draft && <ModelEditor draft={draft} onChange={setDraft} onClose={() => setEditorOpen(false)} onSave={() => void commit()} busy={operation} error={error} />}
    <p className="foot">Local reward modelling workspace <Help label="Scope of the lab">Examples contain synthetic reward pools and economic assumptions. Simulation describes the configured model. Company evidence diagnostics and decision records distinguish synthetic tests from observed results.</Help></p>
  </div>;
}
