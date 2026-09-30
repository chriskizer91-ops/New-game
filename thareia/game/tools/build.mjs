// Bundles src/main.js (plus any CSS it imports) and inlines both into src/index.html.
// Outputs a full document for local play, a fragment for publishing as a claude.ai page, and this
// milestone's download (DELIVERY, the same full document). Every earlier milestone's file in dist/
// (aethermoor-m2.html, aethermoor-m3.html) is the frozen build the player got, and is never written
// here: each milestone is a new file, never an overwrite.
//
//   node tools/build.mjs                 # into dist/
//   node tools/build.mjs --out /tmp/x    # into a private folder (parallel builders; A5)
//   node tools/build.mjs --minify        # full minification (identifiers renamed): the delivery when that is
//                                        # what fits (M6's was; gate the minified file itself before sending it)
//
// The bundle is an IIFE, whitespace-minified (esbuild minifyWhitespace: identifiers and structure
// are kept), so the delivered file's format never changes between builds.
// Size rule (M5 spec A6, raised from M4's A3 for a third region): the game (the full document without
// the player's paintings) warns above 2.5 MB and fails above 3.2 MB; the paintings (src/ui/assets/paint/
// and cuts/, M5 spec A10) fail above 32 MB of their own (M6 spec A6: the player chose full detail for
// every painted map over a smaller file; 24 MB for batch 2, 32 MB once batch 3 painted the Gloomfen). A
// claude.ai page holds 16 MB, so above that the fragment is only a note: a page for the phone gets its own
// lighter copy of the paintings.
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
const DELIVERY = 'thareia-t1.html';
const FROZEN = [];
if (FROZEN.includes(DELIVERY)) throw new Error(`${DELIVERY} is an earlier milestone's frozen file`);

const tpl = await readFile(path.join(root, 'src/index.html'), 'utf8');
const [head, body] = tpl.split('<!--BODY-->');
if (body === undefined) throw new Error('src/index.html needs a <!--BODY--> marker');

// Thareia (T1): only the paintings of the maps Thareia's players can reach go into the file (the old game's other
// paintings stay in src/ for the chapters that will use them). ui/world/view.js draws any other map from its tiles.
const TH_PAINTINGS = ['bogmire-docks', 'bogmire', 'thornhollow'];
const PAINT_INDEX = path.join(root, 'src/ui/assets/paint/index.js');
const onlyThareia = {
  name: 'thareia-paintings',
  setup(b) {
    b.onLoad({ filter: /[\\/]ui[\\/]assets[\\/]paint[\\/]index\.js$/ }, () => ({
      loader: 'js', resolveDir: path.dirname(PAINT_INDEX),
      contents: TH_PAINTINGS.map((id, i) => `import p${i} from './${id}.js';`).join('\n')
        + `\nexport const PAINTINGS = Object.freeze({ ${TH_PAINTINGS.map((id, i) => `'${id}': p${i}`).join(', ')} });\n`,
    }));
  },
};

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
    metafile: true,
    plugins: [onlyThareia],
  });
  // what the player's paintings add to the output
  let painted = 0;
  for (const o of Object.values(result.metafile.outputs)) {
    for (const [file, v] of Object.entries(o.inputs)) if (/src\/(ui\/assets\/(paint|cuts|sky)\/|art\/painted-backdrops)/.test(file.split(path.sep).join('/'))) painted += v.bytesInOutput;
  }
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
  return { full, fragment, bytes: Buffer.byteLength(full), painted };
}

const WARN = 2.5 * 1024 * 1024, FAIL = 3.2 * 1024 * 1024, PAINT_FAIL = 32 * 1024 * 1024, PAGE = 16 * 1024 * 1024;
const kb = n => (n / 1024).toFixed(0) + ' KB';
const fullMinify = argv.includes('--minify');
const { full, fragment, bytes, painted } = await bundle(fullMinify);
const game = bytes - painted;
if (game > FAIL) {
  console.error(`build FAILED: the game is ${kb(game)} (${kb(bytes)} with the paintings), over the 3.2 MB limit (M5 spec A6)`);
  process.exit(1);
}
if (painted > PAINT_FAIL) {
  console.error(`build FAILED: the paintings are ${kb(painted)}, over their 32 MB limit (M6 spec A6)`);
  process.exit(1);
}
await mkdir(out, { recursive: true });
const rel = f => path.relative(process.cwd(), path.join(out, f)) || f;
await writeFile(path.join(out, 'thareia.html'), full);
await writeFile(path.join(out, 'thareia.artifact.html'), fragment);
await writeFile(path.join(out, DELIVERY), full);
console.log(`built ${rel('thareia.html')} (${kb(bytes)}: the game ${kb(game)}, the paintings ${kb(painted)}${fullMinify ? ', fully minified' : ''}), ${rel('thareia.artifact.html')} (${kb(Buffer.byteLength(fragment))}), ${rel(DELIVERY)}`);
if (game > WARN) console.warn(`build WARNING: the game is ${kb(game)}, over 2.5 MB (M5 spec A6 warns here; fails above 3.2 MB)`);
if (Buffer.byteLength(fragment) > PAGE) console.log(`note: the page fragment is over the 16 MB a claude.ai page holds; a page for the phone needs lighter paintings (M6 spec A6)`);
