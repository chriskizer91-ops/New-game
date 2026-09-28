// Bundles src/main.js (plus any CSS it imports) and inlines both into src/index.html.
// Outputs a full document for local play, a fragment for publishing as a claude.ai page, and this
// milestone's download (DELIVERY, the same full document). Every earlier milestone's file in dist/
// (aethermoor-m2.html, aethermoor-m3.html) is the frozen build the player got, and is never written
// here: each milestone is a new file, never an overwrite.
//
//   node tools/build.mjs                 # into dist/
//   node tools/build.mjs --out /tmp/x    # into a private folder (parallel builders; A5)
//   node tools/build.mjs --minify        # full minification, for size experiments only
//
// The bundle is an IIFE, whitespace-minified (esbuild minifyWhitespace: identifiers and structure
// are kept), so the delivered file's format never changes between builds.
// Size rule (M3 spec A8), on the full document: warn above 1.3 MB, fail above 1.6 MB.
// Owner: WP8.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const outArg = argv.find(a => a.startsWith('--out='))?.slice(6) ?? (argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : null);
const out = outArg ? path.resolve(outArg) : path.join(root, 'dist');
const DELIVERY = 'aethermoor-m4.html';
const FROZEN = ['aethermoor-m2.html', 'aethermoor-m3.html'];
if (FROZEN.includes(DELIVERY)) throw new Error(`${DELIVERY} is an earlier milestone's frozen file`);

const tpl = await readFile(path.join(root, 'src/index.html'), 'utf8');
const [head, body] = tpl.split('<!--BODY-->');
if (body === undefined) throw new Error('src/index.html needs a <!--BODY--> marker');

async function bundle(minifyAll) {
  const result = await build({
    entryPoints: [path.join(root, 'src/main.js')],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    outdir: out,
    write: false,
    minify: minifyAll,
    minifyWhitespace: true,
    legalComments: 'none',
    loader: { '.png': 'dataurl', '.webp': 'dataurl' },
  });
  let js = '', css = '';
  for (const f of result.outputFiles) {
    if (f.path.endsWith('.js')) js += f.text;
    else if (f.path.endsWith('.css')) css += f.text;
  }
  // keep "</script>" inside strings from ending the inline script
  js = js.replace(/<\/script/gi, '<\\/script');
  const fill = s => s.replace('/*STYLE*/', () => css).replace('/*SCRIPT*/', () => js);
  const fragment = fill(head + body);
  const full = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    + fill(head) + '</head>\n<body>\n' + fill(body) + '</body>\n</html>\n';
  return { full, fragment, bytes: Buffer.byteLength(full) };
}

const WARN = 1.3 * 1024 * 1024, FAIL = 1.6 * 1024 * 1024;
const kb = n => (n / 1024).toFixed(0) + ' KB';
const fullMinify = argv.includes('--minify');
const { full, fragment, bytes } = await bundle(fullMinify);
if (bytes > FAIL) {
  console.error(`build FAILED: ${kb(bytes)} is over the 1.6 MB limit (M3 spec A8)`);
  process.exit(1);
}
await mkdir(out, { recursive: true });
const rel = f => path.relative(process.cwd(), path.join(out, f)) || f;
await writeFile(path.join(out, 'aethermoor.html'), full);
await writeFile(path.join(out, 'aethermoor.artifact.html'), fragment);
await writeFile(path.join(out, DELIVERY), full);
console.log(`built ${rel('aethermoor.html')} (${kb(bytes)}${fullMinify ? ', fully minified' : ''}), ${rel('aethermoor.artifact.html')} (${kb(Buffer.byteLength(fragment))}), ${rel(DELIVERY)}`);
if (bytes > WARN) console.warn(`build WARNING: ${kb(bytes)} is over 1.3 MB (M3 spec A8 warns here; fails above 1.6 MB)`);
