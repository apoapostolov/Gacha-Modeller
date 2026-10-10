import { useEffect, useId, useState } from 'react';
import type { ModelSnapshot, Project } from '../project/project.ts';

export function CandidatePicker({ project, loaded, disabled, onLoad, onUnload }: { project: Project; loaded: ModelSnapshot | null; disabled: boolean; onLoad: (snapshot: ModelSnapshot) => void; onUnload: () => void }) {
  const [selected, setSelected] = useState(loaded?.id ?? project.candidate.id);
  const id = useId();
  useEffect(() => { setSelected(loaded?.id ?? project.candidate.id); }, [loaded?.id, project.candidate.id]);
  const revisions = [project.candidate, ...project.history.slice().reverse()];
  return <div className="candidate-picker">
    <label className="field" htmlFor={id}>Candidate revision<select id={id} value={selected} onChange={(event) => setSelected(event.target.value)}>
      {revisions.map((revision) => <option key={revision.id} value={revision.id}>{revision.id === project.candidate.id ? 'Current' : `Saved ${new Date(revision.createdAt).toLocaleDateString()}`} · {revision.model.name} · {revision.hash.slice(0, 8)}</option>)}
    </select></label>
    <div className="inline-actions"><button className={loaded ? 'secondary' : 'primary'} disabled={disabled || loaded?.id === selected} onClick={() => { const snapshot = revisions.find((revision) => revision.id === selected); if (snapshot) onLoad(snapshot); }}>Load candidate</button>{loaded && <button className="text-button" disabled={disabled} onClick={onUnload}>Unload candidate</button>}</div>
  </div>;
}
