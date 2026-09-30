// Builds dist/sound-board.html: page.html with sounds.js inlined (its `export`s dropped). Run: node tools/build.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sounds = (await readFile(path.join(root, 'sounds.js'), 'utf8')).replace(/^export /gm, '');
const page = (await readFile(path.join(root, 'page.html'), 'utf8')).replace('/*SOUNDS*/', () => sounds.replace(/<\/script/g, '<\\/script'));
await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist/sound-board.html'), page);
console.log('dist/sound-board.html', (page.length / 1024).toFixed(1), 'KB');
