import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const publicRoot = path.join(projectRoot, 'public');
export const localGamesRoot = path.join(projectRoot, 'local-games');
export const docsRoot = path.join(projectRoot, 'docs');
// Keep the production data location stable; tests can supply an isolated directory.
export const dataRoot = pathToFileURL(path.resolve(process.env.ARCADE_DATA_DIR || path.join(projectRoot, '.hosting')) + path.sep);
