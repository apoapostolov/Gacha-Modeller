import { describe, expect, it } from 'vitest';
import { canonicalJson, contentHash, createProject, importProject, saveCandidate, semanticDiff, saveLibrary, loadLibrary } from '../src/project/project.ts';
import { hardPityBaseline } from '../src/presets/index.ts';
import { runMonteCarlo } from '../src/engine/index.ts';

describe('versioned company projects', () => {
  it('forks a frozen baseline and keeps old candidate revisions intact', async () => {
    const project = await createProject(hardPityBaseline);
    const draft = structuredClone(project.candidate.model);
    draft.pity[0]!.hardAt = 80;
    const next = await saveCandidate(project, draft);
    expect(project.baseline.model.pity[0]!.hardAt).toBe(100);
    expect(next.baseline).toEqual(project.baseline);
    expect(next.history[0]).toEqual(project.candidate);
    expect(next.candidate.hash).not.toBe(project.candidate.hash);
    expect(() => { project.baseline.model.pity[0]!.hardAt = 5; }).toThrow();
  });
  it('canonicalizes object keys without changing array priority', async () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
    expect(await contentHash({ b: 2, a: 1 })).toBe(await contentHash({ a: 1, b: 2 }));
    expect(await contentHash([1, 2])).not.toBe(await contentHash([2, 1]));
  });
  it('versions new mechanic models and refuses those fields in a v1 envelope', async () => {
    const model = { ...hardPityBaseline, duplicates: { cap: 1, protection: 'none' as const, overflow: 'discard' as const, salvagePerCopy: 0 } };
    const project = await createProject(model);
    expect(project.version).toBe(2);
    expect(project.baseline.schemaVersion).toBe(2);
    expect(await importProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
    await expect(importProject({ format: 'gacha-modeller-model', version: 1, model })).rejects.toThrow(/version/);
    expect((await importProject({ format: 'gacha-modeller-model', version: 2, model })).baseline.hash).toBe(project.baseline.hash);
  });
  it('imports raw legacy banners and round-trips an exported project', async () => {
    const legacy = await importProject(hardPityBaseline);
    const restored = await importProject(JSON.parse(JSON.stringify(legacy)));
    expect(restored).toEqual(legacy);
    expect(restored.baseline.schemaVersion).toBe(1);
  });
  it('imports the actual settings from an M1 result bundle', async () => {
    const report = runMonteCarlo(hardPityBaseline, { type: 'copies', count: 2 }, 12, 42, 'never', { maxPulls: 150, actionMode: 'single' });
    const restored = await importProject({ format: 'gacha-modeller-result', version: 1, report });
    expect(restored.settings).toEqual({ goal: { type: 'copies', count: 2 }, trials: 12, seed: 42, sparkPolicy: 'never', maxPulls: 150, actionMode: 'single' });
  });
  it('rejects unsupported fields, future versions and tampered snapshots', async () => {
    await expect(importProject({ ...hardPityBaseline, hiddenOdds: 0.5 })).rejects.toThrow(/hiddenOdds/);
    await expect(importProject({ ...hardPityBaseline, pity: [{ ...hardPityBaseline.pity[0], strangeReset: true }] })).rejects.toThrow(/strangeReset/);
    const project = JSON.parse(JSON.stringify(await createProject(hardPityBaseline)));
    await expect(importProject({ ...project, version: 99 })).rejects.toThrow(/version/);
    project.baseline.model.pity[0].hardAt = 80;
    await expect(importProject(project)).rejects.toThrow(/hash/);
  });
  it('describes mechanic changes by stable rarity IDs', () => {
    const next = structuredClone(hardPityBaseline);
    next.pity[0]!.hardAt = 80;
    expect(semanticDiff(hardPityBaseline, next)).toContainEqual({ path: 'pity[chase].hardAt', before: 100, after: 80 });
  });
});

it('opens selected-target models with a usable default player choice', async () => {
  const model = structuredClone(hardPityBaseline); model.targetRule = { hardAt: 10, once: true };
  const project = await createProject(model);
  expect(project.settings.targetId).toBe('chase');
});

describe('local persistence recovery', () => {
  const storage = () => {
    const values = new Map<string, string>();
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  };
  it('keeps a previous backup and recovers it when the primary save is corrupt', async () => {
    const disk = storage();
    const project = await createProject(hardPityBaseline);
    await saveLibrary(disk, [project], project.id);
    const draft = structuredClone(project.candidate.model);
    draft.pity[0]!.hardAt = 80;
    const next = await saveCandidate(project, draft);
    await saveLibrary(disk, [next], next.id);
    disk.setItem('gacha-modeller.library.v1', '{broken');
    const recovered = await loadLibrary(disk);
    expect(recovered.recovered).toBe(true);
    expect(recovered.projects[0]!.candidate.hash).toBe(project.candidate.hash);
  });
  it('surfaces storage failures without claiming a saved project', async () => {
    const project = await createProject(hardPityBaseline);
    await expect(saveLibrary({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, [project], project.id)).rejects.toThrow(/quota/);
  });
});
