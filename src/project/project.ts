import { assertValidBanner, featuredPool, exchangePool, defaultGoal, validateRun, modelSchemaVersion, advancedRun, type Banner, type Goal, type SparkPolicy, type TrialOptions } from '../engine/index.ts';

import { validateInitial } from '../engine/initial.ts';
import { validateAnalysis, type AnalysisSettings } from '../engine/analysis.ts';
import { validateEconomy } from '../economy/config.ts';
import type { EconomyConfig } from '../economy/types.ts';
import { assertEvidence, type CompanyEvidence } from '../company/types.ts';
import { assertSpecialist, type SpecialistProfile } from '../specialist/types.ts';
import { assertBinding, type CatalogBinding } from '../integrations/catalog.ts';
export interface RunSettings extends TrialOptions { economy?: EconomyConfig; analysis?: AnalysisSettings; goal: Goal; trials: number; seed: number; sparkPolicy: SparkPolicy; maxPulls: number; actionMode: 'single' | 'pack' }
export interface ModelSnapshot { schemaVersion: 1 | 2; id: string; hash: string; createdAt: string; model: Banner }
export interface OverviewSource { title: string; url: string }
export interface ProjectOverview { context: string; summary: string; distinctive: string; strength: string; analysis: string; popularity?: string; business?: string; sources?: OverviewSource[] }
export interface Project { format: 'gacha-modeller-project'; version: 1 | 2 | 3 | 4 | 5 | 6 | 7; id: string; name: string; baseline: ModelSnapshot; candidate: ModelSnapshot; history: ModelSnapshot[]; settings: RunSettings; company?: CompanyEvidence; specialist?: SpecialistProfile; integration?: CatalogBinding; overview?: ProjectOverview }
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
  keys(value, ['id','name','family','blurb','source','notes','pullCost','rarities','pity','featured','spark','charge','multiPull','items','mechanics','persistence','targetRule','duplicates','provenance'], 'model');
  const children: [string, string[]][] = [
    ['pullCost',['amount','currency']], ['featured',['rarity','chance','capturing','hardAt','once']], ['spark',['cost','reset','choice','items']],
    ['charge',['midAt','midFeaturedChance','hardAt']], ['multiPull',['size','guaranteeRarity','slots','sampling','correlation']],
    ['mechanics',['collectionHeat','poolSharePlayers','audienceSparkPerPull']],
    ['targetRule',['hardAt','once']], ['duplicates',['cap','protection','overflow','salvagePerCopy','craftCost','craftableItems']],
    ['persistence',['familyId','rarityCounters','featuredArmed','sinceFeatured','sparkProgress','targetProgress','onceGuaranteeUsed']],
    ['provenance',['rates','pity','featured','exchange','packs','persistence','duplicates']],
  ];
  for (const [key, allowed] of children) if (value[key] !== undefined) keys(value[key], allowed, `model.${key}`);
  if (record(value.spark) && value.spark.reset !== undefined) keys(value.spark.reset, ['rarityCounters','featuredArmed','sinceFeatured','targetProgress'], 'model.spark.reset');
  if (record(value.multiPull) && Array.isArray(value.multiPull.slots)) value.multiPull.slots.forEach((row, i) => keys(row, ['rarity','itemId','quantity'], `model.multiPull.slots[${i}]`));
  if (record(value.persistence)) for (const [field, rule] of Object.entries(value.persistence)) if (field !== 'familyId') keys(rule, ['scope','bannerSwitch','season','targetSwitch'], `model.persistence.${field}`);
  if (record(value.provenance)) for (const [field, source] of Object.entries(value.provenance)) keys(source, ['kind','source','asOf','region'], `model.provenance.${field}`);
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
  return freeze({ schemaVersion: modelSchemaVersion(copy), id: crypto.randomUUID(), hash: await contentHash(copy), createdAt: new Date().toISOString(), model: copy });
}
export function validateSettings(value: unknown): asserts value is RunSettings {
  keys(value, ['goal','trials','seed','sparkPolicy','maxPulls','actionMode','targetId','exchangeItemId','craftPolicy','transitions','initialState','analysis','economy'], 'settings');
  if (value.economy !== undefined) validateEconomy(value.economy, value as unknown as RunSettings);
  if (value.initialState !== undefined) validateInitial(value.initialState);
  if (value.analysis !== undefined) validateAnalysis(value.analysis, value as unknown as RunSettings);
  keys(value.goal, ['type','count','pulls','targets'], 'settings.goal');
  if (Array.isArray(value.goal.targets)) value.goal.targets.forEach((target, i) => keys(target, ['itemId','count'], `settings.goal.targets[${i}]`));
  validateRun(value.goal as Goal, value.sparkPolicy as SparkPolicy, value as TrialOptions, value.trials as number, value.seed as number);
  if (Array.isArray(value.transitions)) value.transitions.forEach((event, i) => {
    keys(event, ['atPull','type', ...(event?.type === 'banner-switch' ? ['model'] : event?.type === 'season' ? ['seasonId'] : ['targetId'])], `settings.transitions[${i}]`);
    if (event.type === 'banner-switch') assertSupportedModel(event.model);
  });
  for (const field of ['trials','seed','sparkPolicy','maxPulls','actionMode']) if (value[field] === undefined) throw new Error(`settings.${field}: Required field.`);
  const goal = value.goal;
  if (['first-featured','collection'].includes(String(goal.type)) && (goal.count !== undefined || goal.pulls !== undefined)) throw new Error('settings.goal: This goal has no count or pull budget.');
  if (goal.type === 'budget' && goal.count !== undefined) throw new Error('settings.goal.count: Unsupported for a budget goal.');
  if (['copies','unique-featured'].includes(String(goal.type)) && goal.pulls !== undefined) throw new Error('settings.goal.pulls: Unsupported for a copy goal.');
  if (goal.type !== 'targets' && goal.targets !== undefined) throw new Error('settings.goal.targets: Unsupported for this goal.');
  if (goal.type === 'targets' && (goal.count !== undefined || goal.pulls !== undefined)) throw new Error('settings.goal: Named targets have individual copy counts.');
}
export async function createProject(model: Banner): Promise<Project> {
  const baseline = await snapshot(model);
  const candidateModel: Banner = { ...structuredClone(model), id: `${model.id}-candidate`, name: `${model.name} candidate`, family: 'original', source: 'original' };
  const candidate = await snapshot(candidateModel);
  const choices = { ...(model.targetRule || model.spark?.choice === 'target' ? { targetId: featuredPool(model).find((item) => item.weight > 0)?.id } : {}), ...(model.spark?.choice === 'selected' ? { exchangeItemId: exchangePool(model)[0]?.id } : {}) };
  return freeze({ format: 'gacha-modeller-project', version: Math.max(baseline.schemaVersion, candidate.schemaVersion) as 1 | 2, id: crypto.randomUUID(), name: model.name, baseline, candidate, history: [],
    settings: { goal: defaultGoal(model), trials: 8000, seed: 20260823, sparkPolicy: 'if-needed', maxPulls: 1000, actionMode: 'single', ...choices } });
}
export async function saveCandidate(project: Project, model: unknown): Promise<Project> {
  const next = await snapshot(model);
  if (next.hash === project.candidate.hash) return project;
  return freeze({ ...project, version: Math.max(project.version, next.schemaVersion) as Project['version'], candidate: next, history: [...project.history, project.candidate] });
}
export function withSettings(project: Project, settings: RunSettings): Project {
  validateSettings(settings);
  if (settings.actionMode === 'pack' && (!project.baseline.model.multiPull || !project.candidate.model.multiPull)) throw new Error('settings.actionMode: Both models need a pack rule for a pack comparison.');
  if (settings.analysis) {
    validateAnalysis(settings.analysis, settings, project.candidate.model);
    for (const group of settings.analysis.cohorts ?? []) validateInitial(group.initialState, project.baseline.model);
    if (settings.analysis.experiment && project.baseline.model.pullCost.currency !== project.candidate.model.pullCost.currency) throw new Error('analysis.experiment: Both models need the same currency unit.');
  }
  for (const model of [project.baseline.model, project.candidate.model]) if (settings.initialState) validateInitial(settings.initialState, model);
  if (settings.economy) {
    for (const event of settings.economy.calendar) if (event.type === 'banner-switch') assertSupportedModel(event.model);
    validateEconomy(settings.economy, settings, [project.baseline.model, project.candidate.model]);
  }
  return freeze({ ...project, version: Math.max(project.version, settings.economy ? 4 : settings.analysis || settings.initialState ? 3 : advancedRun(settings.goal, settings) ? 2 : 1) as Project['version'], settings: structuredClone(settings) });
}
async function readSnapshot(value: unknown, path: string): Promise<ModelSnapshot> {
  keys(value, ['schemaVersion','id','hash','createdAt','model'], path);
  if (value.schemaVersion !== 1 && value.schemaVersion !== 2) throw new Error(`${path}.schemaVersion: Unsupported version.`);
  nonempty(value.id, `${path}.id`); nonempty(value.createdAt, `${path}.createdAt`);
  if (!Number.isFinite(Date.parse(value.createdAt))) throw new Error(`${path}.createdAt: Invalid date.`);
  assertSupportedModel(value.model);
  if (value.schemaVersion < modelSchemaVersion(value.model)) throw new Error(`${path}.schemaVersion: These mechanics need version 2.`);
  if (value.hash !== await contentHash(value.model)) throw new Error(`${path}.hash: Snapshot content does not match its SHA-256 hash.`);
  return freeze(structuredClone(value) as unknown as ModelSnapshot);
}
export async function importProject(value: unknown): Promise<Project> {
  if (record(value) && value.format === 'gacha-modeller-comparison') {
    keys(value, ['format','version','project','settings','baseline','candidate','diff','assumptions','completedAt','engineVersion','randomPolicy','learning','journeys','uncertainty','exact','cohorts','experiment','economy'], 'comparison');
    if (value.version !== 1 && value.version !== 2 && value.version !== 3 && value.version !== 4) throw new Error('comparison.version: Unsupported version.');
    if (value.engineVersion !== (value.version === 1 ? 'workbench-2' : value.version === 2 ? 'mechanics-3' : value.version === 3 ? 'analysis-4' : 'economy-5') || value.randomPolicy !== 'event-streams-v1') throw new Error('comparison: Unsupported engine or random policy for replay.');
    validateSettings(value.settings);
    if (value.version < 4 && value.settings.economy) throw new Error('comparison.version: Economy settings require version 4.');
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
    if (value.version !== 1 && value.version !== 2) throw new Error('modelFile.version: Unsupported version.');
    assertSupportedModel(value.model);
    if (value.version < modelSchemaVersion(value.model)) throw new Error('modelFile.version: These mechanics need version 2.');
    return importProject(value.model);
  }
  if (!record(value) || value.format !== 'gacha-modeller-project') { assertSupportedModel(value); return createProject(value); }
  keys(value, ['format','version','id','name','baseline','candidate','history','settings','company','specialist','integration','overview'], 'project');
  if (![1,2,3,4,5,6,7].includes(Number(value.version)) || typeof value.version !== 'number') throw new Error('project.version: Unsupported project version.');
  if (value.overview !== undefined) {
    if (value.version < 7) throw new Error('project.version: Project overviews need version 7.');
    keys(value.overview, ['context','summary','distinctive','strength','analysis','popularity','business','sources'], 'project.overview');
    for (const field of ['context','summary','distinctive','strength','analysis']) {
      nonempty(value.overview[field], `project.overview.${field}`);
      if (value.overview[field].length > 1200) throw new Error(`project.overview.${field}: Keep the explanation within 1,200 characters.`);
    }
    for (const field of ['popularity','business']) if (value.overview[field] !== undefined) {
      nonempty(value.overview[field], `project.overview.${field}`);
      if (value.overview[field].length > 1200) throw new Error(`project.overview.${field}: Keep the explanation within 1,200 characters.`);
    }
    if (value.overview.sources !== undefined) {
      if (!Array.isArray(value.overview.sources) || value.overview.sources.length > 12) throw new Error('project.overview.sources: Provide up to 12 sources.');
      for (const source of value.overview.sources) {
        keys(source, ['title','url'], 'project.overview.sources');
        nonempty(source.title, 'project.overview.sources.title');
        nonempty(source.url, 'project.overview.sources.url');
        if (source.title.length > 240 || source.url.length > 2000) throw new Error('project.overview.sources: Source text is too long.');
        let url: URL; try { url = new URL(source.url); } catch { throw new Error('project.overview.sources.url: Provide an HTTPS link.'); }
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error('project.overview.sources.url: Provide an HTTPS link without credentials.');
      }
    }
  }
  if (value.specialist !== undefined) assertSpecialist(value.specialist);
  if (value.integration !== undefined) assertBinding(value.integration);
  if (value.version < 6 && (value.specialist !== undefined || value.integration !== undefined)) throw new Error('project.version: Specialist profiles and catalogue bindings need version 6.');
  if (value.company !== undefined) { assertEvidence(value.company); if (value.version < 5) throw new Error('project.version: Company evidence needs version 5.'); }
  nonempty(value.id, 'project.id'); nonempty(value.name, 'project.name');
  if (!Array.isArray(value.history)) throw new Error('project.history: Provide an array of snapshots.');
  const baseline = await readSnapshot(value.baseline, 'project.baseline');
  const candidate = await readSnapshot(value.candidate, 'project.candidate');
  if (value.integration && value.integration.mappings.some(row => !candidate.model.items.some(item => item.id === row.modelItemId))) throw new Error('project.integration: A mapped candidate item is unavailable.');
  const history: ModelSnapshot[] = [];
  for (let i = 0; i < value.history.length; i++) history.push(await readSnapshot(value.history[i], `project.history[${i}]`));
  validateSettings(value.settings);
  if (value.version === 1 && (baseline.schemaVersion === 2 || candidate.schemaVersion === 2 || history.some((row) => row.schemaVersion === 2) || advancedRun(value.settings.goal, value.settings))) throw new Error('project.version: These mechanics or settings need version 2.');
  if (value.version < 3 && (value.settings.analysis || value.settings.initialState)) throw new Error('project.version: Starting progress and analysis settings need version 3.');
  if (value.version < 4 && value.settings.economy) throw new Error('project.version: Economy settings require version 4.');
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
