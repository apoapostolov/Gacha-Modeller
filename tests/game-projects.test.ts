import { describe, expect, it } from 'vitest';
import { FileLibrary } from '../server/library.ts';
import { createState, mulberry32, pullPack } from '../src/engine/index.ts';
import path from 'node:path';
import { defaultEvidence } from '../src/company/synthetic.ts';
describe('directory game examples', () => {
  it('validates all shipped project files and section metadata', async () => { const catalog = await new FileLibrary(path.resolve('projects')).scan(); expect(catalog.diagnostics).toEqual([]); expect(catalog.sections.map(s=>s.id)).toEqual(expect.arrayContaining(['characters','cosmetics','llamas','digital-packs','company','specialist','integrations','workspace'])); expect(catalog.entries.length).toBeGreaterThanOrEqual(17); });
  it('uses specific names and plain-language notes in the synthetic studio study', async () => {
    const catalog = await new FileLibrary(path.resolve('projects')).scan();
    const project = catalog.entries.find((entry) => entry.project.id === 'synthetic-company-pilot')!.project;
    expect(project.name).toBe('Example Studio · Reward Economy Study');
    expect(project.baseline.model.name).toBe('100-draw guarantee · reference');
    expect(project.candidate.model.name).toBe('80-draw guarantee · proposal');
    expect(project.history[0]!.model.name).toBe('100-draw guarantee · earlier revision');
    expect([...project.baseline.model.notes, ...project.candidate.model.notes].join(' ')).not.toContain('Acceptance fixture');
    expect(defaultEvidence().contract.owner).toBe('Example Studio · Product Analytics');
  });
  it('presents the collectible card pack as an example with clear assumptions', async () => {
    const catalog = await new FileLibrary(path.resolve('projects')).scan();
    const project = catalog.entries.find((entry) => entry.project.id === 'collectible-card-pack')!.project;
    expect(project.name).toBe('Example collectible card pack');
    expect(project.baseline.model.name).toBe('Example pack · reference rules');
    expect(project.candidate.model.name).toBe('Example pack · starting version');
    expect([...project.baseline.model.notes, ...project.candidate.model.notes].join(' ')).toContain('fictional cards and assumed drop rates');
  });
  it('keeps the legendary-box guarantee per complete action and protects available cosmetics', async () => {
    const catalog = await new FileLibrary(path.resolve('projects')).scan(), project = catalog.entries.find((e) => e.project.id === 'overwatch-legendary-like')!.project, model = project.baseline.model;
    const state = createState(model), rng = mulberry32(42), legends = new Set<string>();
    for (let i = 0; i < 8; i++) { const box = pullPack(model, state, rng); expect(box).toHaveLength(4); expect(box[0]!.rarity).toBe('legendary'); legends.add(box[0]!.item.id); }
    expect(legends.size).toBe(8); expect(model.notes.join(' ')).toContain('regular-box counters are not implemented');
  });
  it('treats a revealed llama as deterministic contents and uses earned tickets', async () => {
    const catalog = await new FileLibrary(path.resolve('projects')).scan(), model = catalog.entries.find((e) => e.project.id === 'fortnite-xray-like')!.project.baseline.model;
    const box = pullPack(model, createState(model), mulberry32(42));
    expect(box.map((r) => [r.item.id,r.quantity])).toEqual([['schematic',1],['hero',1],['materials',20]]); expect(model.pullCost.currency).toContain('earned');
  });
});
