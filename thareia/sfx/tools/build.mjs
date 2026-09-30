// Builds dist/sound-board.html: page.html with sounds.js and music.js bundled in (esbuild from ../demo2/node_modules).
// Run: node tools/build.mjs
import { build } from '../../demo2/node_modules/esbuild/lib/main.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const js = (await build({ entryPoints: [path.join(root, 'entry.js')], bundle: true, format: 'iife', write: false, minify: true, target: 'es2020' })).outputFiles[0].text;
const page = (await readFile(path.join(root, 'page.html'), 'utf8')).replace('/*BUNDLE*/', () => js.replace(/<\/script/g, '<\\/script'));
await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist/sound-board.html'), page);
console.log('dist/sound-board.html', (page.length / 1024).toFixed(1), 'KB (sounds and music:', (js.length / 1024).toFixed(1), 'KB)');
