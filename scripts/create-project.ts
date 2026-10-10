import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { importProject } from '../src/project/project.ts';
import { readSection } from '../src/library/types.ts';
import { FileLibrary } from '../server/library.ts';
const args = process.argv.slice(2), flag = (key: string) => args[args.indexOf(key) + 1];
const store = new FileLibrary(path.resolve('projects'));
if (args.includes('--validate')) {
  const catalog = await store.scan();
  console.log(JSON.stringify({ sections: catalog.sections.length, projects: catalog.entries.length, diagnostics: catalog.diagnostics }, null, 2));
  if (catalog.diagnostics.length) process.exitCode = 1;
} else {
  const section = args.includes('--section') ? flag('--section') : 'workspace';
  const input = args.includes('--input') ? flag('--input') : undefined;
  if (!input || !section || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(section)) throw new Error('Usage: npm run project:create -- --input model-or-project.json --section workspace [--name "Project name"]');
  const catalog = await store.scan();
  if (!catalog.sections.some((row) => row.id === section)) {
    const title = args.includes('--section-title') ? flag('--section-title') : undefined;
    const description = args.includes('--section-description') ? flag('--section-description') : undefined;
    if (!title || !description) throw new Error('A new section requires --section-title and --section-description.');
    const metadata = readSection({ format: 'reward-model-section', version: 1, id: section, title, description, order: 50 }, section);
    try { if ((await lstat(path.join(store.root, section))).isSymbolicLink()) throw new Error('Section folder must not be a symbolic link.'); } catch (failure) { if ((failure as NodeJS.ErrnoException).code !== 'ENOENT') throw failure; }
    await mkdir(path.join(store.root, section), { recursive: true });
    await writeFile(path.join(store.root, section, 'section.json'), JSON.stringify(metadata, null, 2) + '\n', { flag: 'wx' });
  }
  const project = structuredClone(await importProject(JSON.parse(await readFile(path.resolve(input), 'utf8'))));
  project.id = crypto.randomUUID();
  if (args.includes('--name')) { const name = flag('--name'); if (!name?.trim()) throw new Error('Provide a project name.'); project.name = name; }
  const saved = await store.save(project, section, null);
  console.log(JSON.stringify({ file: `projects/${saved.path}`, id: saved.project.id, baselineHash: saved.project.baseline.hash }, null, 2));
}
