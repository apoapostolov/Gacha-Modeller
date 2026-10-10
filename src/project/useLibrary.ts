import { useEffect, useRef, useState } from 'react';
import { PRESETS } from '../presets/index.ts';
import { createProject, loadLibrary, saveLibrary, type Project } from './project.ts';

export function useLibrary() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState('Loading local projects…');
  const queue = useRef<Promise<void>>(Promise.resolve());
  const revision = useRef(0);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const library = await loadLibrary(window.localStorage);
        const restored = library.projects.length ? library.projects : [await createProject(PRESETS[0]!)];
        if (!live) return;
        setProjects(restored); setSelectedId(library.selectedId ?? restored[0]!.id);
        if (library.recovered) setStorageError('Recovered the previous local backup. Your latest candidate may be in revision history.');
      } catch (failure) {
        const initial = await createProject(PRESETS[0]!);
        if (!live) return;
        setProjects([initial]); setSelectedId(initial.id); setReadOnly(true);
        setStorageError(`${failure instanceof Error ? failure.message : 'Local storage is unavailable.'} This temporary project is kept in memory; export a backup.`);
      } finally { if (live) setReady(true); }
    })();
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!ready || !selectedId || readOnly) return;
    let live = true;
    const current = ++revision.current;
    setSaveState('Saving locally…');
    queue.current = queue.current.catch(() => {}).then(() => saveLibrary(window.localStorage, projects, selectedId)).then(() => {
      if (live && current === revision.current) setSaveState('Saved locally');
    }).catch((failure) => {
      if (live && current === revision.current) { setSaveState('Not saved locally'); setStorageError(`Local save failed: ${failure instanceof Error ? failure.message : 'storage unavailable'}. Export a project backup to keep this work.`); }
    });
    return () => { live = false; };
  }, [projects, selectedId, ready, readOnly]);
  const project = projects.find((p) => p.id === selectedId) ?? null;
  const add = (incoming: Project) => {
    const next = projects.some((p) => p.id === incoming.id) ? { ...incoming, id: crypto.randomUUID(), name: `${incoming.name} imported` } : incoming;
    setProjects((current) => [...current, next]); setSelectedId(next.id);
    return next;
  };
  const replace = (next: Project) => setProjects((current) => current.map((p) => p.id === next.id ? next : p));
  return { projects, project, ready, saveState: readOnly ? 'Memory only' : saveState, storageError, dismissStorageError: () => setStorageError(null), select: setSelectedId, add, replace };
}
