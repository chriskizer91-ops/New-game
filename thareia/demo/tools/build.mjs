// Builds dist/thareia-walk-test.html: one self-contained file (no doctype; it also publishes as a claude.ai page).
//   npm install && node tools/build.mjs
// The hero and gear art comes from the finished Aethermoor game (branch claude/cool-ptolemy-uc93gg, pinned to
// GAME_COMMIT), copied into .game/ and patched so the hero renderer can draw at 2x and 3x (PATCHES below).
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_COMMIT = '49195c1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), game = path.join(root, '.game');
const repo = execSync('git rev-parse --show-toplevel', { cwd: root }).toString().trim();

const PATCHES = {
  'game/src/art/heroes.js': [
    ['  const fr = opt.frame || FRAME_PROTO, W = fr.w, Hh = fr.h, OX = fr.ox, OY = fr.oy;',
      '  const S = opt.scale || 1;\n  const fr = opt.frame || FRAME_PROTO, W = fr.w * S, Hh = fr.h * S, OX = fr.ox, OY = fr.oy;'],
    ['X = P.lie ? Xf(OX + 41, OY + 22.5, 0, 1, 1) : Xf(OX, OY, 1, 0, 1);',
      'X = P.lie ? Xf((OX + 41) * S, (OY + 22.5) * S, 0, 1, S) : Xf(OX * S, OY * S, 1, 0, S);'],
    ['const R = RECIPE[w.r] || RECIPE.sword, k = w.k || .36;', 'const R = RECIPE[w.r] || RECIPE.sword, k = (w.k || .36) * S;'],
  ],
  'game/src/art/hero-looks.js': [
    ['const P = posePreset(pose, t, cls, b);', 'const P = o.P || posePreset(pose, t, cls, b);'],
    ["glowMat, o.flip ? 'm' : ''].join('|');", "glowMat, o.flip ? 'm' : '', o.scale || 1, o.P ? JSON.stringify(o.P) : ''].join('|');"],
    ['const r = heroForge(H, { gear: L, pose: P, frame: FRAME_BATTLE, aspectGlow: glowMat });',
      'const r = heroForge(H, { gear: L, pose: P, frame: FRAME_BATTLE, aspectGlow: glowMat, scale: o.scale || 1 });'],
    ['const W = FRAME_BATTLE.w, mx', 'const W = FRAME_BATTLE.w * (o.scale || 1), mx'],
    ['if (base.face) paintFace(', 'if (base.face && !o.noFace && !(o.scale > 1)) paintFace('],
  ],
};

if (!existsSync(path.join(game, '.commit')) || (await readFile(path.join(game, '.commit'), 'utf8')) !== GAME_COMMIT) {
  await rm(game, { recursive: true, force: true }); await mkdir(game, { recursive: true });
  execSync(`git archive ${GAME_COMMIT} game/src | tar -x -C "${game}"`, { cwd: repo, shell: '/bin/bash' });
  for (const [f, reps] of Object.entries(PATCHES)) {
    let s = await readFile(path.join(game, f), 'utf8');
    for (const [a, b] of reps) { if (!s.includes(a)) throw new Error(`patch target missing in ${f}: ${a}`); s = s.replace(a, b); }
    await writeFile(path.join(game, f), s);
  }
  await writeFile(path.join(game, '.commit'), GAME_COMMIT);
}

const js = await build({
  entryPoints: [path.join(root, 'src/main.js')], bundle: true, format: 'iife', write: false, minify: true, target: 'es2020',
  alias: { '@game': path.join(game, 'game/src') }, legalComments: 'none',
});
const b64 = async (f, mime) => `data:${mime};base64,` + (await readFile(path.join(root, 'assets', f))).toString('base64');
const assets = { map: await b64('gloomfen.webp', 'image/webp'), ship: await b64('skiff-top.webp', 'image/webp'), music: await b64('herbal-decay-battle.m4a', 'audio/mp4') };
const tpl = await readFile(path.join(root, 'src/page.html'), 'utf8');
const html = tpl.replace('/*ASSETS*/', () => 'window.__ASSETS=' + JSON.stringify(assets) + ';').replace('/*APP*/', () => js.outputFiles[0].text.replace(/<\/script/g, '<\\/script'));
await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist/thareia-walk-test.html'), html);
console.log('dist/thareia-walk-test.html', (html.length / 1048576).toFixed(2), 'MB (code', (js.outputFiles[0].text.length / 1024).toFixed(0), 'KB)');
