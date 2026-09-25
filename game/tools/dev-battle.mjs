// Builds the battle dev harness: bundles tools/dev-battle-entry.js (app shell + battle screen)
// into one self-contained page, tools/shots/dev-battle.html. Open it with a hash, for example
//   tools/shots/dev-battle.html#node=oldsnag&level=5&speed=2
// (see the entry file for every option). `node tools/dev-battle.mjs` builds; the e2e test
// (tools/e2e-battle.mjs) calls buildDevBattle() itself.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEV_PAGE = path.join(root, 'tools/shots/dev-battle.html');

export async function buildDevBattle() {
  const res = await build({
    entryPoints: [path.join(root, 'tools/dev-battle-entry.js')],
    bundle: true, format: 'iife', target: 'es2020', write: false, minify: false, legalComments: 'none',
    outdir: path.join(root, 'tools/shots/.dev-battle'),
  });
  let js = '', css = '';
  for (const f of res.outputFiles) {
    if (f.path.endsWith('.js')) js += f.text;
    else if (f.path.endsWith('.css')) css += f.text;
  }
  js = js.replace(/<\/script/gi, '<\\/script');
  const tpl = await readFile(path.join(root, 'src/index.html'), 'utf8');
  const [head, body] = tpl.split('<!--BODY-->');
  const fill = s => s.replace('/*STYLE*/', () => css).replace('/*SCRIPT*/', () => js);
  const html = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    + fill(head).replace('<title>Aethermoor: Hearth &amp; Heirloom</title>', '<title>Battle harness</title>') + '</head>\n<body>\n' + fill(body) + '</body>\n</html>\n';
  await mkdir(path.dirname(DEV_PAGE), { recursive: true });
  await writeFile(DEV_PAGE, html);
  return DEV_PAGE;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = await buildDevBattle();
  console.log(`wrote ${path.relative(root, file)} (${((await readFile(file)).length / 1024).toFixed(0)} KB)`);
  console.log('open it with a hash, e.g. #node=oldsnag&level=5&speed=2 (see tools/dev-battle-entry.js)');
}
