// Bundles src/main.js (plus any CSS it imports) and inlines both into src/index.html.
// Outputs a full document for local play and a fragment for publishing as a claude.ai page.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');

const result = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  outdir: out,
  write: false,
  minify: false,
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

const tpl = await readFile(path.join(root, 'src/index.html'), 'utf8');
const [head, body] = tpl.split('<!--BODY-->');
if (body === undefined) throw new Error('src/index.html needs a <!--BODY--> marker');
const fill = s => s.replace('/*STYLE*/', () => css).replace('/*SCRIPT*/', () => js);

const fragment = fill(head + body);
const full = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  + fill(head) + '</head>\n<body>\n' + fill(body) + '</body>\n</html>\n';

await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'aethermoor.html'), full);
await writeFile(path.join(out, 'aethermoor.artifact.html'), fragment);
const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`built dist/aethermoor.html (${kb(full.length)}), dist/aethermoor.artifact.html (${kb(fragment.length)})`);
