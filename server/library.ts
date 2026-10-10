import { createHash } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { importProject } from '../src/project/project.ts';
import { readSection, type Catalog, type ProjectFile } from '../src/library/types.ts';

const LIMIT = 5 * 1024 * 1024;
const hash = (raw: string) => createHash('sha256').update(raw).digest('hex');
export class FileLibrary {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(readonly root: string) {}
  private async safe(file: string, missing = false) {
    const relative = path.relative(path.resolve(this.root), path.resolve(file));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Path must remain inside the project directory.');
    let current = path.resolve(this.root);
    if ((await lstat(current)).isSymbolicLink()) throw new Error('Project root must not be a symbolic link.');
    for (const piece of relative.split(path.sep)) {
      current = path.join(current, piece);
      try { if ((await lstat(current)).isSymbolicLink()) throw new Error('Symbolic links are not supported in the project directory.'); }
      catch (failure) { if (!missing || (failure as NodeJS.ErrnoException).code !== 'ENOENT') throw failure; }
    }
  }
  async scan(): Promise<Catalog> {
    await mkdir(this.root, { recursive: true });
    const catalog: Catalog = { sections: [], entries: [], diagnostics: [] };
    const folders = await readdir(this.root, { withFileTypes: true });
    if ((await lstat(this.root)).isSymbolicLink()) throw new Error('Project root must not be a symbolic link.');
    for (const folder of folders.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!folder.isDirectory() || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(folder.name)) continue;
      const directory = path.join(this.root, folder.name);
      try {
        await this.safe(path.join(directory, 'section.json'));
        const section = readSection(JSON.parse(await readFile(path.join(directory, 'section.json'), 'utf8')), folder.name);
        catalog.sections.push(section);
        for (const file of (await readdir(directory)).sort()) {
          if (!file.endsWith('.json') || file === 'section.json') continue;
          const filename = path.join(directory, file);
          try {
            await this.safe(filename);
            if ((await lstat(filename)).size > LIMIT) throw new Error('Project exceeds 5 MB.');
            const raw = await readFile(filename, 'utf8');
            const value = JSON.parse(raw);
            if (value.format !== 'gacha-modeller-project') throw new Error('Expected a complete project file.');
            const project = await importProject(value);
            if (catalog.entries.some((entry) => entry.project.id === project.id)) throw new Error(`Duplicate project id ${project.id}.`);
            catalog.entries.push({ section: section.id, path: `${section.id}/${file}`, revision: hash(raw), project });
          } catch (failure) { catalog.diagnostics.push(`${folder.name}/${file}: ${(failure as Error).message}`); }
        }
      } catch (failure) { catalog.diagnostics.push(`${folder.name}: ${(failure as Error).message}`); }
    }
    catalog.sections.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    catalog.entries.sort((a, b) => catalog.sections.findIndex((row) => row.id === a.section) - catalog.sections.findIndex((row) => row.id === b.section) || a.project.name.localeCompare(b.project.name));
    return catalog;
  }
  save(value: unknown, section: string, expectedRevision: string | null): Promise<ProjectFile> {
    const operation = this.queue.catch(() => {}).then(async () => {
      const project = await importProject(value);
      const catalog = await this.scan();
      if (!catalog.sections.some((row) => row.id === section)) throw new Error('Choose an existing section folder.');
      if (catalog.diagnostics.some((row) => row.includes('Duplicate project id'))) throw new Error('Resolve duplicate project ids before saving.');
      const existing = catalog.entries.find((row) => row.project.id === project.id);
      if (existing && (existing.section !== section || existing.revision !== expectedRevision)) throw new Error('File changed outside this session. Export unsaved work, then refresh the library.');
      if (!existing && expectedRevision !== null) throw new Error('Project file was removed or became invalid. Export unsaved work before refreshing.');
      const relative = existing?.path ?? `${section}/${hash(project.id).slice(0, 24)}.json`;
      const file = path.join(this.root, relative);
      await this.safe(file, true);
      const raw = `${JSON.stringify(project, null, 2)}\n`;
      if (Buffer.byteLength(raw) > LIMIT) throw new Error('Project exceeds 5 MB.');
      if (!existing) { await writeFile(file, raw, { flag: 'wx' }); }
      else {
        const previous = await readFile(file, 'utf8');
        if (hash(previous) !== expectedRevision) throw new Error('File changed during save. Export unsaved work before refreshing.');
        const temporary = `${file}.${crypto.randomUUID()}.tmp`;
        try {
          await writeFile(temporary, raw, { flag: 'wx' });
          await this.safe(`${file}.backup`, true);
          await writeFile(`${file}.backup`, previous);
          if (hash(await readFile(file, 'utf8')) !== expectedRevision) throw new Error('File changed during save. Export unsaved work before refreshing.');
          await rename(temporary, file);
        } finally { await unlink(temporary).catch(() => {}); }
      }
      return { project, section, path: relative, revision: hash(raw) };
    });
    this.queue = operation;
    return operation;
  }
}
export function libraryMiddleware(store: FileLibrary) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url !== '/api/library') return next();
    const host = req.headers.host ?? '';
    if (!/^(localhost|127\.0\.0\.1):\d+$/.test(host) || (req.headers.origin && req.headers.origin !== `http://${host}`)) { res.writeHead(403).end('Local origin required.'); return; }
    res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method === 'GET') { res.end(JSON.stringify(await store.scan())); return; }
      if (req.method !== 'PUT' || req.headers['x-project-library'] !== 'local-v1' || !req.headers['content-type']?.startsWith('application/json')) { res.writeHead(405).end(JSON.stringify({ error: 'Unsupported library request.' })); return; }
      const chunks: Buffer[] = []; let bytes = 0;
      for await (const chunk of req) { bytes += chunk.length; if (bytes > LIMIT) throw new Error('Project exceeds 5 MB.'); chunks.push(Buffer.from(chunk)); }
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (typeof input.section !== 'string' || !(input.expectedRevision === null || typeof input.expectedRevision === 'string')) throw new Error('Invalid save request.');
      res.end(JSON.stringify(await store.save(input.project, input.section, input.expectedRevision)));
    } catch (failure) { res.writeHead(409).end(JSON.stringify({ error: (failure as Error).message })); }
  };
}
