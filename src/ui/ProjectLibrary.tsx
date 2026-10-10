import { useEffect, useId, useRef, useState } from 'react';
import type { Catalog, ProjectFile } from '../library/types.ts';
import { Help } from './Help.tsx';

export const isCompanyEntry = (entry: ProjectFile) => !!entry.project.company || entry.section === 'company';

export function ProjectLibrary({ catalog, selected, disabled, onSelect, onRefresh, legacyCount, onMigrate }: { catalog: Catalog; selected?: string; disabled: boolean; onSelect: (id: string) => void; onRefresh: () => void; legacyCount: number; onMigrate: () => void }) {
  const active = catalog.entries.find((entry) => entry.project.id === selected);
  const [mode, setMode] = useState<'projects' | 'companies'>(active && isCompanyEntry(active) ? 'companies' : 'projects');
  const [queries, setQueries] = useState({ projects: '', companies: '' });
  const query = queries[mode];
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  useEffect(() => {
    if (active) setMode(isCompanyEntry(active) ? 'companies' : 'projects');
  }, [selected, active?.section]);
  const entries = catalog.entries.filter((entry) => isCompanyEntry(entry) === (mode === 'companies'));
  const term = query.trim().toLowerCase();
  const matches = entries.filter((entry) => {
    const section = catalog.sections.find((row) => row.id === entry.section);
    return `${entry.project.name} ${entry.project.overview?.context ?? ''} ${entry.section} ${section?.title ?? ''}`.toLowerCase().includes(term);
  });
  const sections = catalog.sections.filter((section) => matches.some((entry) => entry.section === section.id));
  return <>
    <div className="library-tabs segmented" role="tablist" aria-label="Library type">
      {(['projects', 'companies'] as const).map((value, index) => <button key={value} ref={(node) => { tabs.current[index] = node; }} id={`${id}-${value}`} role="tab" aria-selected={mode === value} aria-controls={`${id}-items`} tabIndex={mode === value ? 0 : -1} onClick={() => setMode(value)} onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
        setMode(next === 0 ? 'projects' : 'companies'); tabs.current[next]?.focus();
      }}>{value === 'projects' ? 'Projects' : 'Companies'}</button>)}
    </div>
    <div className="library-search-row">
      <label className="field project-search"><span className="sr-only">Search {mode}</span><input type="search" value={query} onChange={(event) => setQueries({ ...queries, [mode]: event.target.value })} placeholder={`Search ${mode}`} /></label>
      <button className="glyph-button" aria-label="Refresh library" title="Refresh library" disabled={disabled} onClick={onRefresh}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 2M4 17l2 2a8 8 0 0 0 13-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    </div>
    <div role="tabpanel" id={`${id}-items`} aria-labelledby={`${id}-${mode}`} className="library-items">
      {term && <p role="status" className="search-count">{matches.length} matching {matches.length === 1 ? mode === 'projects' ? 'project' : 'company' : mode}</p>}
      {!matches.length && <p className="run-note">{term ? 'No matches. Try another name or clear the search.' : `No ${mode} available.`}</p>}
      {sections.map((section) => <details className="catalog-group" key={`${mode}-${section.id}-${!!term}`} open={active?.section === section.id || !!term}>
        <summary className="catalog-heading"><h3>{section.title}</h3><span>{matches.filter((entry) => entry.section === section.id).length}</span></summary>
        {matches.filter((entry) => entry.section === section.id).map(({ project }) => <button key={project.id} className={project.id === selected ? 'pick active' : 'pick'} aria-pressed={project.id === selected} disabled={disabled} onClick={() => onSelect(project.id)}>{project.name}</button>)}
      </details>)}
    </div>
    <div className="library-footer"><span>Local files <Help label="Library files">Sections come from projects/&lt;section&gt;/section.json. Search expands folders with matching names or game contexts. Refresh reads external file changes and clears the current comparison selection.{active && <p>Selected file: <code>projects/{active.path}</code></p>}<p>Edits save to the selected file. A conflicting save preserves unsaved work for export.</p></Help></span>
      {legacyCount > 0 && <details><summary>Browser imports ({legacyCount})</summary><p className="run-note">Copy previous projects into Workspace; browser originals are preserved.</p><button className="text-button" disabled={disabled} onClick={onMigrate}>Import browser projects</button></details>}
      {catalog.diagnostics.length > 0 && <details open><summary>File issues ({catalog.diagnostics.length})</summary><ul>{catalog.diagnostics.map((message) => <li key={message}>{message}</li>)}</ul></details>}
    </div>
  </>;
}
