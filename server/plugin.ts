import path from 'node:path';
import type { Plugin } from 'vite';
import { FileLibrary, libraryMiddleware } from './library.ts';
export function projectLibrary(): Plugin {
  const mount = (server: { middlewares: { use: (handler: ReturnType<typeof libraryMiddleware>) => void } }) => { server.middlewares.use(libraryMiddleware(new FileLibrary(path.resolve('projects')))); };
  return { name: 'directory-project-library', configureServer: mount, configurePreviewServer: mount };
}
