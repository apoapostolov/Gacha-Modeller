import { useEffect, useRef, useState } from 'react';
import { PRESETS } from './presets/index.ts';
import { type Banner } from './engine/index.ts';
import { createProject, importProject, saveCandidate, semanticDiff, withSettings, type RunSettings as Settings } from './project/project.ts';
import { useLibrary } from './project/useLibrary.ts';
import { ComparisonRunner } from './jobs/runner.ts';
import type { ComparisonReport } from './jobs/compare.ts';
import { Help } from './ui/Help.tsx';
import { ModelDetails } from './ui/ModelDetails.tsx';
import { ModelEditor } from './ui/ModelEditor.tsx';
import { RunSettings } from './ui/RunSettings.tsx';
import { ComparisonResults } from './ui/ComparisonResults.tsx';
import './workbench.css';

function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function App() {
  const library = useLibrary();
  const project = library.project;
  const runner = useRef<ComparisonRunner | null>(null);
  if (!runner.current) runner.current = new ComparisonRunner(() => new Worker(new URL('./jobs/comparison.worker.ts', import.meta.url), { type: 'module' }));
  const upload = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Banner | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [operation, setOperation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const presetSequence = useRef(0);

  useEffect(() => () => runner.current?.cancel(), []);
  useEffect(() => {
    if (!project) return;
    runner.current?.cancel(); setBusy(false); setProgress(0); setError(null); setNotice(null);
    setSettings(structuredClone(project.settings)); setDraft(structuredClone(project.candidate.model));
    setSettingsOpen(false); setEditorOpen(false);
    run(project, project.settings);
    // Run only on project selection; a saved candidate waits for an explicit comparison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  function run(current = project, configuration = settings): boolean {
    if (!current || !configuration) return false;
    try {
      const snapshot = withSettings(current, configuration);
      runner.current?.start(snapshot, snapshot.settings, (event) => {
        if (event.type === 'progress') setProgress(event.completed / event.total);
        else if (event.type === 'result') { setReport(event.report); setBusy(false); setProgress(1); setNotice('Comparison complete'); }
        else { setError(event.message); setBusy(false); }
      });
      library.replace(snapshot); setError(null); setNotice(null); setProgress(0); setBusy(true);
      return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not start comparison.'); setBusy(false); return false; }
  }
  function cancel() { runner.current?.cancel(); setBusy(false); setNotice('Comparison cancelled. The last completed result is kept.'); }
  async function choosePreset(model: Banner) {
    const sequence = ++presetSequence.current;
    setOperation(true); setError(null);
    try {
      const next = await createProject(model);
      if (sequence !== presetSequence.current) return;
      const saved = library.projects.find((p) => p.baseline.hash === next.baseline.hash);
      if (saved) library.select(saved.id); else library.add(next);
      setLibraryOpen(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not open model.'); }
    finally { if (sequence === presetSequence.current) setOperation(false); }
  }
  async function commit() {
    if (!project || !draft) return;
    const current = project; const model = structuredClone(draft);
    setOperation(true); setError(null);
    try {
      const next = await saveCandidate(current, model);
      runner.current?.cancel(); setBusy(false); library.replace(next); setDraft(structuredClone(next.candidate.model));
      setEditorOpen(false); setNotice('Candidate revision saved. Run comparison to include it.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save candidate.'); }
    finally { setOperation(false); }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    setOperation(true); setError(null);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Import: Choose a JSON project of 5 MB or less.');
      const incoming = await importProject(JSON.parse(await file.text()));
      library.add(incoming);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not import project.'); }
    finally { setOperation(false); if (upload.current) upload.current.value = ''; }
  }
  const visibleReport = report?.project.id === project?.id ? report : null;
  const changed = !!(visibleReport && project && settings && (visibleReport.project.candidate.hash !== project.candidate.hash || visibleReport.project.baseline.hash !== project.baseline.hash || JSON.stringify(visibleReport.settings) !== JSON.stringify(settings)));
  const draftChanged = !!(project && draft && JSON.stringify(project.candidate.model) !== JSON.stringify(draft));
  const packAvailable = !!(project?.baseline.model.multiPull && project?.candidate.model.multiPull);
  return <div className="shell">
    <a href="#workspace" className="skip-link">Skip to workspace</a>
    <header className="top"><div><h1>Gacha Modeller</h1><p className="lede">Learn a model. Change the rules. Compare the outcome.</p></div><div className="header-actions"><button className="secondary" disabled={!project} onClick={() => setSettingsOpen(true)}>Run settings</button>{busy ? <button className="primary" onClick={cancel}>Cancel run</button> : <button className="primary" disabled={!project || operation} onClick={() => run()}>Run comparison</button>}</div></header>
    <div className="project-toolbar"><div><span className="eyebrow">Local project</span><h2>{project?.name ?? 'Opening your workspace…'}</h2></div><div className="project-actions"><span className="save-status" data-saved={library.saveState === 'Saved locally'} role="status">{library.saveState}</span><button className="text-button" disabled={operation} onClick={() => upload.current?.click()}>Import project</button><button className="text-button" disabled={!project || operation} onClick={() => project && downloadJson(project, `${project.baseline.model.id}-project.json`)}>Export project</button><button className="text-button" disabled={!visibleReport} onClick={() => visibleReport && downloadJson(visibleReport, `${visibleReport.project.baseline.model.id}-${visibleReport.settings.seed}-comparison.json`)}>Export comparison</button></div><input className="sr-only" ref={upload} tabIndex={-1} aria-label="Import project JSON" type="file" accept=".json,application/json" onChange={(e) => void importFile(e.target.files?.[0])} /></div>
    {library.storageError && <p className="run-error" role="alert">{library.storageError} <button className="text-button" onClick={library.dismissStorageError}>Dismiss</button></p>}
    {error && !settingsOpen && !editorOpen && <p className="run-error" role="alert">{error}</p>}
    {notice && <p className="status-line" role="status">{notice}</p>}
    {changed && <p className="status-line">Model or settings changed. Results below show the last completed comparison.</p>}
    {busy && <div className="job-progress" role="status"><progress max={1} value={progress} aria-label="Comparison progress" /><span>{Math.round(progress * 100)}% · comparing both models</span></div>}
    <button className="secondary library-toggle" aria-expanded={libraryOpen} aria-controls="model-library" onClick={() => setLibraryOpen(!libraryOpen)}>Models & projects</button>
    <main className="workspace" id="workspace" tabIndex={-1}>
      <aside id="model-library" className={`panel catalog ${libraryOpen ? 'is-open' : ''}`} aria-label="Model library">
        {library.projects.length > 0 && <section className="catalog-group"><h2>Your projects</h2>{library.projects.map((entry) => <button key={entry.id} className={entry.id === project?.id ? 'pick active' : 'pick'} aria-pressed={entry.id === project?.id} disabled={operation} onClick={() => { library.select(entry.id); setLibraryOpen(false); }}>{entry.name}<small>{entry.history.length + 1} candidate revision{entry.history.length ? 's' : ''}</small></button>)}</section>}
        {(['studied','original'] as const).map((family) => <section className="catalog-group" key={family}><h2>{family === 'studied' ? 'Studied models' : 'Original models'}</h2>{PRESETS.filter((p) => p.family === family).map((entry) => <button key={entry.id} className="pick" disabled={operation} onClick={() => void choosePreset(entry)}>{entry.name}<small>{entry.pity.length ? 'Pity protection' : 'Independent draws'}{entry.spark ? ' · exchange' : ''}</small></button>)}</section>)}
        <p className="run-note">Stored on this browser <Help label="Local project storage">Committed snapshots and settings are saved locally, with a previous-save backup. Unsaved editor fields stay in memory. Export project for a portable backup. Nothing is uploaded.</Help></p>
      </aside>
      <div className="workspace-content">
        {project && settings && <><div className="model-pair"><ModelDetails model={project.baseline.model} role="Baseline" hash={project.baseline.hash} seed={project.settings.seed} actionMode={project.settings.actionMode} /><ModelDetails model={project.candidate.model} role="Candidate" hash={project.candidate.hash} seed={project.settings.seed} actionMode={project.settings.actionMode} onEdit={() => setEditorOpen(true)} /></div>
          {draftChanged && <p className="status-line">You have unsaved candidate edits. <button className="text-button" onClick={() => setEditorOpen(true)}>Continue editing</button></p>}
          {project.history.length > 0 && <details className="panel revision-history"><summary>Candidate history ({project.history.length} previous)</summary>{project.history.map((revision, i) => <div className="history-row" key={revision.id}><span>Revision {i + 1} · {new Date(revision.createdAt).toLocaleString()} · {revision.hash.slice(0, 8)}</span><button className="text-button" onClick={() => { setDraft(structuredClone(revision.model)); setEditorOpen(true); }}>Load into editor</button></div>)}</details>}
          {visibleReport ? <ComparisonResults key={visibleReport.completedAt} report={visibleReport} /> : <section className="panel empty-results"><h2>Compare your next idea</h2><p>{busy ? 'Your models are running in the background. You can keep exploring or cancel this job.' : 'Edit the candidate, then run a comparison against the locked baseline.'}</p></section>}
          <details className="panel live-diff"><summary>Current model changes ({semanticDiff(project.baseline.model, project.candidate.model).length})</summary><ul>{semanticDiff(project.baseline.model, project.candidate.model).map((change, i) => <li key={i}><code>{change.path}</code>: {JSON.stringify(change.before)} → {JSON.stringify(change.after)}</li>)}</ul></details>
        </>}
      </div>
    </main>
    {settingsOpen && settings && <RunSettings value={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} packAvailable={packAvailable} busy={busy} error={error} onRun={() => { if (run()) setSettingsOpen(false); }} />}
    {editorOpen && draft && <ModelEditor draft={draft} onChange={setDraft} onClose={() => setEditorOpen(false)} onSave={() => void commit()} busy={operation} error={error} />}
    <p className="foot">Local modelling lab · studied presets are like-models <Help label="Scope of the lab">Models describe cited probability shapes, not licensed live tables. Monte Carlo resource use does not establish revenue, engagement or retention uplift. Company evidence and economy models are later milestones.</Help></p>
  </div>;
}
