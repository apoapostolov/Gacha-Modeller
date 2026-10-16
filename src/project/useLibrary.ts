import { useEffect, useRef, useState } from 'react';
import { loadLibrary, type Project } from './project.ts';
import type { Catalog, ProjectFile } from '../library/types.ts';
function migrationIds(): string[] { try { const value: unknown = JSON.parse(window.localStorage.getItem('gacha-modeller.migrated-projects.v1') ?? '[]'); return Array.isArray(value) && value.every((row) => typeof row === 'string') ? value : []; } catch { return []; } }
function defaultProjectId(entries: ProjectFile[]): string | null {
  return entries.find((entry) => !entry.project.company && entry.section !== 'company')?.project.id ?? entries[0]?.project.id ?? null;
}
async function request<T>(body?: unknown): Promise<T> {
  const response = await fetch('/api/library', body ? { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Project-Library': 'local-v1' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Project service unavailable. Start this workspace with npm run dev or npm start.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Project service unavailable.');
  return result;
}
export function useLibrary() {
  const [catalog, setCatalog] = useState<Catalog>({ sections: [], entries: [], diagnostics: [] });
  const files = useRef<ProjectFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState('Loading project files…');
  const [legacy, setLegacy] = useState<Project[]>([]);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  async function refresh() {
    if (pending.current) throw new Error('Wait for the current file save before refreshing.');
    const loaded = await request<Catalog>();
    files.current = loaded.entries; setCatalog(loaded);
    setSelectedId((id) => loaded.entries.some((row) => row.project.id === id) ? id : defaultProjectId(loaded.entries));
    setSaveState('Project files loaded'); setStorageError(null); setGeneration((value) => value + 1);
  }
  useEffect(() => {
    let live = true;
    void request<Catalog>().then((loaded) => {
      if (!live) return;
      files.current = loaded.entries; setCatalog(loaded);
      let selected: string | null = null; try { selected = window.localStorage.getItem('gacha-modeller.selected-file.v1'); } catch { /* Selection preference is optional. */ }
      setSelectedId(loaded.entries.some((entry) => entry.project.id === selected) ? selected : defaultProjectId(loaded.entries)); setSaveState('Project files loaded');
    }).catch((failure) => { if (live) { setStorageError((failure as Error).message); setSaveState('Project service unavailable'); } }).finally(() => { if (live) setReady(true); });
    void loadLibrary(window.localStorage).then((saved) => { const migrated = migrationIds(); if (live) setLegacy(saved.projects.filter((project) => !migrated.includes(project.id))); }).catch((failure) => { if (live) setStorageError(`Previous browser-library recovery: ${(failure as Error).message} Existing bytes were preserved; directory projects remain available.`); });
    return () => { live = false; };
  }, []);
  useEffect(() => { if (selectedId) try { window.localStorage.setItem('gacha-modeller.selected-file.v1', selectedId); } catch { /* Project durability does not depend on browser preferences. */ } }, [selectedId]);
  function save(project: Project, section: string, isNew: boolean) {
    pending.current++; setSaveState('Saving project file…');
    const task = queue.current.catch(() => {}).then(async () => {
      const old = files.current.find((row) => row.project.id === project.id);
      if (!isNew && !old) throw new Error('Project file is unavailable. Export unsaved work before refreshing.');
      const entry = await request<ProjectFile>({ project, section, expectedRevision: isNew ? null : old!.revision });
      files.current = [...files.current.filter((row) => row.project.id !== project.id), entry];
      setCatalog((current) => ({ ...current, entries: current.entries.map((row) => row.project.id === project.id ? { ...entry, project: row.project } : row) }));
      return entry;
    });
    queue.current = task;
    void task.then(() => { if (pending.current === 1) { setSaveState('Saved to project file'); setStorageError(null); } }).catch((failure) => { setSaveState('Unsaved changes'); setStorageError(`${(failure as Error).message} Unsaved work remains available for export.`); }).finally(() => { pending.current--; });
    return task;
  }
  const projects = catalog.entries.map((entry) => entry.project);
  async function add(incoming: Project, section = 'workspace') {
    const next = projects.some((p) => p.id === incoming.id) ? { ...incoming, id: crypto.randomUUID(), name: `${incoming.name} imported` } : incoming;
    const entry = await save(next, section, true);
    setCatalog((current) => ({ ...current, entries: [...current.entries, entry] })); setSelectedId(next.id);
    return next;
  }
  function replace(next: Project) {
    const entry = catalog.entries.find((row) => row.project.id === next.id);
    if (!entry) return Promise.reject(new Error('Project is unavailable.'));
    setCatalog((current) => ({ ...current, entries: current.entries.map((row) => row.project.id === next.id ? { ...row, project: next } : row) }));
    return save(next, entry.section, false);
  }
  async function migrate() {
    const migrated = migrationIds();
    for (const project of legacy) {
      const existing = files.current.find((row) => row.project.id === project.id);
      if (!existing || JSON.stringify(existing.project) !== JSON.stringify(project)) await add(project);
      migrated.push(project.id); window.localStorage.setItem('gacha-modeller.migrated-projects.v1', JSON.stringify(migrated));
      setLegacy((current) => current.filter((row) => row.id !== project.id));
    }
  }
  return { ...catalog, generation, projects, project: projects.find((p) => p.id === selectedId) ?? null, ready, saveState, storageError, legacyCount: legacy.length, migrate, refresh, dismissStorageError: () => setStorageError(null), select: setSelectedId, add, replace };
}
