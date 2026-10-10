import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer, type Server } from 'node:http';
import { FileLibrary, libraryMiddleware } from '../server/library.ts';
import { createProject } from '../src/project/project.ts';
import { hardPityBaseline } from '../src/presets/index.ts';
let root: string, store: FileLibrary;
const section = (id: string, order = 0) => ({ format: 'reward-model-section', version: 1, id, title: `Section ${id}`, description: 'Runtime metadata', order });
async function addSection(id: string, order = 0) { await mkdir(path.join(root, id)); await writeFile(path.join(root, id, 'section.json'), JSON.stringify(section(id, order))); }
beforeEach(async () => { root = await mkdtemp(path.join(os.tmpdir(), 'reward-library-')); store = new FileLibrary(root); await addSection('workspace'); });
afterEach(async () => { const resolved = path.resolve(root); if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith('reward-library-')) throw new Error('Unsafe fixture cleanup.'); await rm(resolved, { recursive: true, force: true }); });
describe('runtime directory library', () => {
  it('discovers sections and newly added project files without a build', async () => {
    await addSection('cards', -1); const project = await createProject(hardPityBaseline); await writeFile(path.join(root, 'cards', 'project.json'), JSON.stringify(project));
    const catalog = await store.scan(); expect(catalog.sections.map((s) => s.id)).toEqual(['cards','workspace']); expect(catalog.entries[0]!.project.baseline.hash).toBe(project.baseline.hash); expect(catalog.diagnostics).toEqual([]);
  });
  it('saves revisions atomically with a previous-save backup and rejects stale writes', async () => {
    const first = await store.save(await createProject(hardPityBaseline), 'workspace', null);
    const second = await store.save({ ...first.project, name: 'Updated' }, 'workspace', first.revision);
    expect(JSON.parse(await readFile(path.join(root, `${first.path}.backup`), 'utf8')).name).toBe(first.project.name);
    expect((await store.scan()).entries[0]!.project.name).toBe('Updated'); expect(second.revision).not.toBe(first.revision);
    await expect(store.save(first.project, 'workspace', first.revision)).rejects.toThrow('changed outside');
  });
  it('rejects external edits, removed projects, traversal and duplicate identities', async () => {
    const first = await store.save(await createProject(hardPityBaseline), 'workspace', null);
    await writeFile(path.join(root, first.path), JSON.stringify({ ...first.project, name: 'External' }));
    await expect(store.save(first.project, 'workspace', first.revision)).rejects.toThrow('changed outside');
    await expect(store.save(first.project, '../outside', null)).rejects.toThrow('existing section');
    await writeFile(path.join(root, 'workspace', 'copy.json'), JSON.stringify(first.project));
    expect((await store.scan()).diagnostics.join(' ')).toContain('Duplicate project id');
    await expect(store.save(first.project, 'workspace', first.revision)).rejects.toThrow('duplicate project');
  });
  it('keeps malformed files and hash mismatches visible without discarding valid projects', async () => {
    const first = await store.save(await createProject(hardPityBaseline), 'workspace', null);
    await writeFile(path.join(root, 'workspace', 'invalid.json'), '{');
    const corrupt = structuredClone(first.project); corrupt.id = 'corrupt'; corrupt.baseline.model.name = 'Changed without hash';
    await writeFile(path.join(root, 'workspace', 'corrupt.json'), JSON.stringify(corrupt));
    const catalog = await store.scan(); expect(catalog.entries).toHaveLength(1); expect(catalog.diagnostics).toHaveLength(2);
    expect(catalog.diagnostics.join(' ')).toContain('SHA-256');
  });
  it('rejects symbolic directory escapes', async () => {
    const outside = await mkdtemp(path.join(os.tmpdir(), 'reward-library-outside-'));
    try { await writeFile(path.join(outside, 'section.json'), JSON.stringify(section('escape'))); await symlink(outside, path.join(root, 'escape'), 'junction'); expect((await store.scan()).sections.some((s) => s.id === 'escape')).toBe(false); }
    finally { if (!path.resolve(outside).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unsafe cleanup.'); await rm(outside, { recursive: true, force: true }); }
  });
  it('serves local JSON, preserves Unicode and rejects cross-origin mutation', async () => {
    const handler = libraryMiddleware(store); const server: Server = createServer((req, res) => void handler(req, res, () => res.writeHead(404).end()));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)); const port = (server.address() as { port: number }).port, url = `http://127.0.0.1:${port}/api/library`;
    try {
      expect((await (await fetch(url)).json()).sections).toHaveLength(1);
      const project = { ...await createProject(hardPityBaseline), name: 'Карти та коробки' };
      const body = JSON.stringify({ project, section: 'workspace', expectedRevision: null });
      expect((await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Project-Library': 'local-v1', Origin: 'https://untrusted.example' }, body })).status).toBe(403);
      expect((await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })).status).toBe(405);
      expect((await (await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Project-Library': 'local-v1' }, body })).json()).project.name).toBe(project.name);
    } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
  });
});
