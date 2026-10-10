import type { Project } from '../project/project.ts';

export interface Section { format: 'reward-model-section'; version: 1; id: string; title: string; description: string; order: number }
export interface ProjectFile { section: string; path: string; revision: string; project: Project }
export interface Catalog { sections: Section[]; entries: ProjectFile[]; diagnostics: string[] }
export function readSection(value: unknown, directory: string): Section {
  const row = value as Section;
  if (!row || row.format !== 'reward-model-section' || row.version !== 1 || row.id !== directory || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(row.id) || typeof row.title !== 'string' || !row.title.trim() || typeof row.description !== 'string' || !Number.isFinite(row.order)) throw new Error('section.json: Expected version 1 metadata with an id matching the folder.');
  return { format: row.format, version: 1, id: row.id, title: row.title, description: row.description, order: row.order };
}
