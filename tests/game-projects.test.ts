import { describe, expect, it } from 'vitest';
import { FileLibrary } from '../server/library.ts';
import { createState, mulberry32, pullPack } from '../src/engine/index.ts';
import path from 'node:path';
describe('directory game examples', () => {
  it('validates all shipped project files and section metadata', async () => { const catalog = await new FileLibrary(path.resolve('projects')).scan(); expect(catalog.diagnostics).toEqual([]); expect(catalog.sections.map(s=>s.id)).toEqual(expect.arrayContaining(['characters','cosmetics','llamas','digital-packs','company','specialist','integrations','workspace'])); expect(catalog.entries.length).toBeGreaterThanOrEqual(17); });
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
