import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FileLibrary, libraryMiddleware } from '../server/library.ts';
const library = libraryMiddleware(new FileLibrary(path.resolve('projects')));
const root = path.resolve('dist');
createServer((req, res) => void library(req, res, () => void (async () => {
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (path.relative(root, file).startsWith('..')) { res.writeHead(403).end(); return; }
    const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
    res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end('File unavailable. Run npm run build before npm start.'); }
})())).listen(3018, '127.0.0.1', () => process.stdout.write('Reward modelling workspace: http://localhost:3018\n'));
