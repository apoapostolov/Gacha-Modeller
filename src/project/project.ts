import { assertValidBanner, defaultGoal, validateRun, type Banner, type Goal, type SparkPolicy } from '../engine/index.ts';

export interface RunSettings { goal: Goal; trials: number; seed: number; sparkPolicy: SparkPolicy; maxPulls: number; actionMode: 'single' | 'pack' }
export interface ModelSnapshot { schemaVersion: 1; id: string; hash: string; createdAt: string; model: Banner }
export interface Project { format: 'gacha-modeller-project'; version: 1; id: string; name: string; baseline: ModelSnapshot; candidate: ModelSnapshot; history: ModelSnapshot[]; settings: RunSettings }
export interface Change { path: string; before: unknown; after: unknown }
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
const PRIMARY = 'gacha-modeller.library.v1';
const BACKUP = `${PRIMARY}.backup`;
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
function keys(value: unknown, allowed: string[], path: string): asserts value is Record<string, unknown> {
  if (!record(value)) throw new Error(`${path}: Expected an object.`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${path}.${key}: Unsupported field.`);
}
function nonempty(value: unknown, path: string): asserts value is string { if (typeof value !== 'string' || !value.trim()) throw new Error(`${path}: Provide text.`); }
export function assertSupportedModel(value: unknown): asserts value is Banner {
  keys(value, ['id','name','family','blurb','source','notes','pullCost','rarities','pity','featured','spark','charge','multiPull','items','mechanics'], 'model');
  const children: [string, string[]][] = [
    ['pullCost',['amount','currency']], ['featured',['rarity','chance','capturing','hardAt']], ['spark',['cost','reset']],
    ['charge',['midAt','midFeaturedChance','hardAt']], ['multiPull',['size','guaranteeRarity']],
    ['mechanics',['collectionHeat','poolSharePlayers','audienceSparkPerPull']],
  ];
  for (const [key, allowed] of children) if (value[key] !== undefined) keys(value[key], allowed, `model.${key}`);
  if (record(value.spark) && value.spark.reset !== undefined) keys(value.spark.reset, ['rarityCounters','featuredArmed','sinceFeatured'], 'model.spark.reset');
  const arrays: [string, string[]][] = [
    ['rarities',['id','name','baseRate','color']], ['pity',['rarity','hardAt','softStart','softStep','resetAlso']],
    ['items',['id','name','rarity','featured','weight']],
  ];
  for (const [key, allowed] of arrays) if (Array.isArray(value[key])) value[key].forEach((row, i) => keys(row, allowed, `model.${key}[${i}]`));
  assertValidBanner(value);
}
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (record(value)) return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Cannot hash a non-finite number.');
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error('Cannot hash an unsupported value.');
  return encoded;
}
export async function contentHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}
async function snapshot(model: unknown): Promise<ModelSnapshot> {
  assertSupportedModel(model);
  const copy = structuredClone(model);
  return freeze({ schemaVersion: 1, id: crypto.randomUUID(), hash: await contentHash(copy), createdAt: new Date().toISOString(), model: copy });
}
export function validateSettings(value: unknown): asserts value is RunSettings {
  keys(value, ['goal','trials','seed','sparkPolicy','maxPulls','actionMode'], 'settings');
  keys(value.goal, ['type','count','pulls'], 'settings.goal');
  validateRun(value.goal as Goal, value.sparkPolicy as SparkPolicy, { maxPulls: value.maxPulls as number, actionMode: value.actionMode as 'single' | 'pack' }, value.trials as number, value.seed as number);
  for (const field of ['trials','seed','sparkPolicy','maxPulls','actionMode']) if (value[field] === undefined) throw new Error(`settings.${field}: Required field.`);
  const goal = value.goal;
  if (['first-featured','collection'].includes(String(goal.type)) && (goal.count !== undefined || goal.pulls !== undefined)) throw new Error('settings.goal: This goal has no count or pull budget.');
  if (goal.type === 'budget' && goal.count !== undefined) throw new Error('settings.goal.count: Unsupported for a budget goal.');
  if (['copies','unique-featured'].includes(String(goal.type)) && goal.pulls !== undefined) throw new Error('settings.goal.pulls: Unsupported for a copy goal.');
}
export async function createProject(model: Banner): Promise<Project> {
  const baseline = await snapshot(model);
  const candidateModel: Banner = { ...structuredClone(model), id: `${model.id}-candidate`, name: `${model.name} candidate`, family: 'original', source: 'original' };
  const candidate = await snapshot(candidateModel);
  return freeze({ format: 'gacha-modeller-project', version: 1, id: crypto.randomUUID(), name: model.name, baseline, candidate, history: [],
    settings: { goal: defaultGoal(model), trials: 8000, seed: 20260823, sparkPolicy: 'if-needed', maxPulls: 1000, actionMode: 'single' } });
}
export async function saveCandidate(project: Project, model: unknown): Promise<Project> {
  const next = await snapshot(model);
  if (next.hash === project.candidate.hash) return project;
  return freeze({ ...project, candidate: next, history: [...project.history, project.candidate] });
}
export function withSettings(project: Project, settings: RunSettings): Project {
  validateSettings(settings);
  if (settings.actionMode === 'pack' && (!project.baseline.model.multiPull || !project.candidate.model.multiPull)) throw new Error('settings.actionMode: Both models need a pack rule for a pack comparison.');
  return freeze({ ...project, settings: structuredClone(settings) });
}
async function readSnapshot(value: unknown, path: string): Promise<ModelSnapshot> {
  keys(value, ['schemaVersion','id','hash','createdAt','model'], path);
  if (value.schemaVersion !== 1) throw new Error(`${path}.schemaVersion: Unsupported version.`);
  nonempty(value.id, `${path}.id`); nonempty(value.createdAt, `${path}.createdAt`);
  if (!Number.isFinite(Date.parse(value.createdAt))) throw new Error(`${path}.createdAt: Invalid date.`);
  assertSupportedModel(value.model);
  if (value.hash !== await contentHash(value.model)) throw new Error(`${path}.hash: Snapshot content does not match its SHA-256 hash.`);
  return freeze(structuredClone(value) as unknown as ModelSnapshot);
}
export async function importProject(value: unknown): Promise<Project> {
  if (record(value) && value.format === 'gacha-modeller-comparison') {
    keys(value, ['format','version','project','settings','baseline','candidate','diff','assumptions','completedAt','engineVersion','randomPolicy','learning'], 'comparison');
    if (value.version !== 1) throw new Error('comparison.version: Unsupported version.');
    if (value.engineVersion !== 'workbench-2' || value.randomPolicy !== 'event-streams-v1') throw new Error('comparison: Unsupported engine or random policy for replay.');
    validateSettings(value.settings);
    return withSettings(await importProject(value.project), value.settings);
  }
  if (record(value) && value.format === 'gacha-modeller-result') {
    if (value.version !== 1 || !record(value.report) || !record(value.report.manifest)) throw new Error('result.version: Unsupported result bundle.');
    if (!record(value.report.manifest.options)) throw new Error('result.report.manifest.options: Missing run settings.');
    const report = value.report;
    const settings = { goal: report.goal, trials: report.trials, seed: report.seed, sparkPolicy: report.sparkPolicy, ...(report.manifest as Record<string, unknown>).options as Record<string, unknown> };
    validateSettings(settings);
    return withSettings(await importProject(value.report.manifest.model), settings);
  }
  if (record(value) && value.format === 'gacha-modeller-model') {
    keys(value, ['format','version','model'], 'modelFile');
    if (value.version !== 1) throw new Error('modelFile.version: Unsupported version.');
    return importProject(value.model);
  }
  if (!record(value) || value.format !== 'gacha-modeller-project') { assertSupportedModel(value); return createProject(value); }
  keys(value, ['format','version','id','name','baseline','candidate','history','settings'], 'project');
  if (value.version !== 1) throw new Error('project.version: Unsupported project version.');
  nonempty(value.id, 'project.id'); nonempty(value.name, 'project.name');
  if (!Array.isArray(value.history)) throw new Error('project.history: Provide an array of snapshots.');
  const baseline = await readSnapshot(value.baseline, 'project.baseline');
  const candidate = await readSnapshot(value.candidate, 'project.candidate');
  const history: ModelSnapshot[] = [];
  for (let i = 0; i < value.history.length; i++) history.push(await readSnapshot(value.history[i], `project.history[${i}]`));
  validateSettings(value.settings);
  const project = freeze({ ...structuredClone(value), baseline, candidate, history } as unknown as Project);
  return withSettings(project, project.settings);
}
export function semanticDiff(before: unknown, after: unknown, path = ''): Change[] {
  if (canonicalJson(before) === canonicalJson(after)) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    const idKey = [...before, ...after].every((row) => record(row) && typeof row.id === 'string') ? 'id'
      : [...before, ...after].every((row) => record(row) && typeof row.rarity === 'string') ? 'rarity' : null;
    if (idKey) {
      const b = new Map(before.map((row) => [row[idKey], row])); const a = new Map(after.map((row) => [row[idKey], row]));
      const changes = [...new Set([...b.keys(), ...a.keys()])].flatMap((id) => {
        const nextPath = `${path}[${id}]`;
        return b.has(id) && a.has(id) ? semanticDiff(b.get(id), a.get(id), nextPath) : [{ path: nextPath, before: b.get(id) ?? null, after: a.get(id) ?? null }];
      });
      if (JSON.stringify([...b.keys()]) !== JSON.stringify([...a.keys()])) changes.unshift({ path: `${path}.order`, before: [...b.keys()], after: [...a.keys()] });
      return changes;
    }
    return [{ path, before, after }];
  }
  if (record(before) && record(after)) return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap((key) => {
    const nextPath = path ? `${path}.${key}` : key;
    if (before[key] === undefined || after[key] === undefined) return before[key] === after[key] ? [] : [{ path: nextPath, before: before[key] ?? null, after: after[key] ?? null }];
    return semanticDiff(before[key], after[key], nextPath);
  });
  return [{ path, before, after }];
}
interface Library { format: 'gacha-modeller-library'; version: 1; projects: Project[]; selectedId: string }
async function readLibrary(raw: string): Promise<Library> {
  const value: unknown = JSON.parse(raw);
  keys(value, ['format','version','projects','selectedId'], 'library');
  if (value.format !== 'gacha-modeller-library' || value.version !== 1 || !Array.isArray(value.projects)) throw new Error('library: Unsupported format or version.');
  const projects: Project[] = [];
  for (const project of value.projects) projects.push(await importProject(project));
  if (new Set(projects.map((p) => p.id)).size !== projects.length || !projects.some((p) => p.id === value.selectedId)) throw new Error('library.selectedId: Missing or duplicate project.');
  return { format: 'gacha-modeller-library', version: 1, projects, selectedId: value.selectedId as string };
}
export async function saveLibrary(storage: StoragePort, projects: Project[], selectedId: string): Promise<void> {
  const encoded = JSON.stringify({ format: 'gacha-modeller-library', version: 1, projects, selectedId });
  await readLibrary(encoded);
  const old = storage.getItem(PRIMARY);
  if (old) {
    let valid = false; try { await readLibrary(old); valid = true; } catch { /* Preserve an existing valid backup when the primary is corrupt. */ }
    if (valid) storage.setItem(BACKUP, old);
  }
  storage.setItem(PRIMARY, encoded);
}
export async function loadLibrary(storage: StoragePort): Promise<{ projects: Project[]; selectedId: string | null; recovered: boolean }> {
  const primary = storage.getItem(PRIMARY); const backup = storage.getItem(BACKUP);
  if (!primary && !backup) return { projects: [], selectedId: null, recovered: false };
  try { if (primary) return { ...await readLibrary(primary), recovered: false }; } catch { /* Attempt the previous committed library. */ }
  try { if (backup) return { ...await readLibrary(backup), recovered: true }; } catch { /* Keep corrupt bytes untouched for manual recovery. */ }
  throw new Error('Local projects could not be read. Exported backups can be imported; existing stored data was kept.');
}
