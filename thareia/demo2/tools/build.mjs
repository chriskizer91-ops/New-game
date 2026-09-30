// Builds Thareia demo 2: the finished Aethermoor game (commit GAME_COMMIT) with the 16 x 24 party walking the player's
// town-square painting, and its real battles fought in front of the player's forest-ruins painting, to the player's song.
//
//   node tools/build.mjs      ->  dist/thareia-demo-2.html (full document) and dist/thareia-demo-2.page.html (for a claude.ai page)
//
// Steps: copy the game into .game/ (git archive), add the map (src/town-square.js) and the encounter, patch in the
// painted battle backdrop, the song and a save slot of its own, boot straight into the square, import the painting with
// the game's own tools/paint-import.mjs (keeping only this map's painting), build with the game's tools/build.mjs, then
// put the song into the page. Needs git, npm (esbuild) and the machine's Playwright Chromium.
import { execSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_COMMIT = '49195c1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = execSync('git rev-parse --show-toplevel', { cwd: root }).toString().trim();
const art = path.join(repo, 'thareia/art-in/scenes');
const work = path.join(root, '.game'), game = path.join(work, 'game');
const pw = (await import('/opt/node22/lib/node_modules/playwright/index.js')).default;
const sh = (cmd, cwd = game) => execSync(cmd, { cwd, stdio: 'inherit', shell: '/bin/bash', env: { ...process.env, NODE_PATH: '/opt/node22/lib/node_modules' } });

async function patch(file, reps) {
  const f = path.join(game, file);
  let s = await readFile(f, 'utf8');
  for (const [a, b] of reps) { if (!s.includes(a)) throw new Error(`patch target missing in ${file}: ${a.slice(0, 80)}`); s = s.replace(a, b); }
  await writeFile(f, s);
}

// 1. a fresh copy of the game
await rm(work, { recursive: true, force: true }); await mkdir(work, { recursive: true });
execSync(`git archive ${GAME_COMMIT} game | tar -x -C "${work}"`, { cwd: repo, shell: '/bin/bash' });
if (!existsSync(path.join(root, 'node_modules/esbuild'))) sh('npm install --silent --no-audit --no-fund', root);
await rm(path.join(game, 'node_modules'), { recursive: true, force: true });
execSync(`ln -s "${path.join(root, 'node_modules')}" "${path.join(game, 'node_modules')}"`);

// 2. the map
await copyFile(path.join(root, 'src/town-square.js'), path.join(game, 'src/data/maps/town-square.js'));
await patch('src/data/maps/index.js', [
  ["import keep from './keep.js';", "import keep from './keep.js';\nimport townSquare from './town-square.js';"],
  ['const LIST = [keep,', 'const LIST = [townSquare, keep,'],
]);

// 3. Rhune's fight on the square, in front of the painted ruins
await patch('src/data/encounters.js', [
  ["export const BACKDROPS = Object.freeze(['hearth-road',", "export const BACKDROPS = Object.freeze(['forest-ruins', 'hearth-road',"],
  ["  'rp-brigands': {", `  'ts-rhune': {
    id: 'ts-rhune', type: 'fight', name: 'Rhune\\'s Toll', place: 'The Town Square', backdrop: 'forest-ruins', region: 'ironspire',
    spawns: [IRON('brigand', 4, { variant: 'warden', relic: 'windstep-boots', name: 'Rhune the Pass-Warden', omens: ['swift'], wakeOmenCap: 0 }), IRON_R('brigand', 12), IRON_R('brigand', 12)],
    text: 'Rhune the Pass-Warden has set up a toll in the middle of the square. His boots have never once touched the cobbles.',
  },
  'rp-brigands': {`],
]);

// 4. the painted battle backdrop: stored small (it is drawn into the battle's pixel canvas, which pixelates it anyway)
const browser = await pw.chromium.launch();
const page = await browser.newPage();
const encode = (b64, w, h, q, fmt = 'image/webp') => page.evaluate(async ({ b64, w, h, q, fmt }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const W = w || img.width, H = h || Math.round(W * img.height / img.width);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, W, H);
  return c.toDataURL(fmt, q);
}, { b64, w, h, q, fmt });
const ruins = await encode((await readFile(path.join(art, 'battle-forest-ruins.png'))).toString('base64'), 480, 0, .7);
await writeFile(path.join(game, 'src/art/painted-backdrops.js'),
  `// Painted battle backdrops (Thareia demo 2): key -> WebP data URL, drawn by art/scenes.js paintedBackdrop.\nexport const PAINTED_BACKDROPS = Object.freeze({ 'forest-ruins': '${ruins}' });\n`);
await patch('src/art/scenes.js', [
  ["export const BACKDROPS = Object.freeze({", "export const BACKDROPS = Object.freeze({\n  'forest-ruins': { name: 'The Old Ruins', horizon: .5, floor: [.56, 1], fx: 'leaf', painted: true },"],
  ["export function renderBackdrop(key, o = {}) {", `// Thareia demo 2: a painted backdrop fills the whole battle screen as the screen's own background (ui/screens/battle.js
// adds .bt-painted), so the stage draws only the key's ambient drift, on a clear canvas.
function paintedBackdrop(key, o) {
  const w = o.w || 160, h = o.h || 96, img = new ImageData(w, h), d = img.data;
  if (o.reduced) return img;
  try {
    for (const p of ambient(key, o.t || 0, { w, h, dark: o.dark })) {
      const x = Math.round(p.x), y = Math.round(p.y); if (p.a <= .05 || x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = (y * w + x) * 4; d[i] = p.c[0]; d[i + 1] = p.c[1]; d[i + 2] = p.c[2]; d[i + 3] = Math.round(Math.min(1, p.a) * 255);
    }
  } catch { /* no drift */ }
  return img;
}
export function renderBackdrop(key, o = {}) {
  if (BACKDROPS[key]?.painted) return paintedBackdrop(key, o);`],
]);
await patch('src/ui/screens/battle.js', [
  ["import { BACKDROPS, renderBackdrop } from '../../art/scenes.js';", "import { BACKDROPS, renderBackdrop } from '../../art/scenes.js';\nimport { PAINTED_BACKDROPS } from '../../art/painted-backdrops.js';"],
  ["  if (reduced) shell.classList.add('reduced');", "  if (reduced) shell.classList.add('reduced');\n  if (BACKDROPS[backdrop]?.painted && PAINTED_BACKDROPS[backdrop]) { shell.classList.add('bt-painted'); shell.style.setProperty('--bt-paint', `url(${PAINTED_BACKDROPS[backdrop]})`); }"],
]);
{
  const f = path.join(game, 'src/ui/battle.css');
  await writeFile(f, (await readFile(f, 'utf8')) + `
/* Thareia demo 2: a painted backdrop fills the whole battle screen, pixelated like the sprites; the bands over it are see-through */
.bt.bt-painted { background: #0b0908 var(--bt-paint) 72% bottom / cover no-repeat; image-rendering: pixelated; }
.bt.bt-painted .bt-stage { background: transparent; box-shadow: none; }
.bt.bt-painted .bt-top { background: linear-gradient(180deg, rgba(12, 9, 8, .72), rgba(12, 9, 8, .35)); box-shadow: none; }
.bt.bt-painted .bt-ribbon { background: rgba(12, 9, 8, .38); }
.bt.bt-painted .bt-party { background: linear-gradient(180deg, rgba(12, 9, 8, 0), rgba(12, 9, 8, .35)); box-shadow: none; }
.bt.bt-painted .bt-dock { background: rgba(12, 9, 8, .62); }
`);
}

// 5. the player's song for battles and boss fights (window.__THAREIA_SONGS, put into the page in step 9)
await patch('src/core/audio.js', [
  ['  function sync() {\n    if (!unlocked) return;\n    const want = musicOn ? wanted : null;', `  // Thareia demo 2: tracks with a recorded song play it (an <audio> element) in place of the synth
  const SONGS = (typeof globalThis !== 'undefined' && globalThis.__THAREIA_SONGS) || {};
  let songEl = null, songName = null;
  const songAudio = () => { if (!songEl && typeof Audio !== 'undefined') { songEl = new Audio(); songEl.loop = true; songEl.preload = 'auto'; } return songEl; };
  function songSync(want) {
    const src = want ? SONGS[want] : null;
    if (!src) { if (songEl && !songEl.paused) songEl.pause(); songName = null; return false; }
    const a = songAudio(); if (!a) return false;
    if (songName !== want) { if (a.src !== src) a.src = src; if (!songName || SONGS[songName] !== src) a.currentTime = 0; songName = want; }
    if (a.paused) a.play().catch(() => {});
    return true;
  }
  function sync() {
    if (!unlocked) return;
    const want = musicOn ? wanted : null;
    if (songSync(want)) { if (playing) stopTrack(playing); return; }`],
  ['      if (document.hidden) AC.suspend().catch(() => {});', "      if (songEl) { if (document.hidden) songEl.pause(); else if (songName) songEl.play().catch(() => {}); }\n      if (document.hidden) AC.suspend().catch(() => {});"],
  ['      unlocked = true;', `      unlocked = true;
      // prime the song inside the tap that unlocked sound, so a battle that starts later may play it (iOS)
      const a = songAudio(), first = SONGS.battle;
      if (a && first && !songName) { a.src = first; a.muted = true; a.play().then(() => { if (!songName) a.pause(); a.muted = false; }).catch(() => { a.muted = false; }); }`],
]);

// 6. a save slot of its own
await patch('src/core/save.js', [
  ["const KEY_LIVE = 'aethermoor.save.m7';", "const KEY_LIVE = 'thareia.demo2.save';"],
  ["const KEY_BAK = 'aethermoor.save.m7.bak';", "const KEY_BAK = 'thareia.demo2.save.bak';"],
]);

// 7. boot straight into the square with a level 12 party (a saved demo game continues where it was)
await patch('src/main.js', [
  ["import { startBattle } from './rules/gauntlet.js';", `import { startBattle, newGame } from './rules/gauntlet.js';
import { grantXp, xpForLevel } from './rules/progression.js';
import { deriveHero } from './rules/stats.js';
import { createRng } from './core/rng.js';`],
  ["app.go('title');", `const DEMO_LEVEL = 12;
function demoGame() {
  let g = newGame({ name: 'Wren', starter: 'hearthbrand', seed: 7 });
  const rng = createRng('thareia-demo-2');
  for (const id of g.party.active) {
    let h = g.party.roster[id];
    const need = xpForLevel(DEMO_LEVEL) - (h.xp || 0);
    if (need > 0) h = grantXp(h, need, rng).hero;
    const d = deriveHero(h, g.inventory);
    g.party.roster[id] = { ...h, hp: d.maxHp, mp: d.maxMp };
  }
  g.progress.pos = { map: 'town-square', x: 24, y: 22, face: 'n' };
  return g;
}
if (!app.game || app.game.progress?.pos?.map !== 'town-square') app.setGame(demoGame());
app.go('world', { arrive: 'continue' });`],
]);

// 8. the town-square painting, imported by the game's own tool; only this map keeps a painting
const square = await encode((await readFile(path.join(art, 'town-square.png'))).toString('base64'), 1440, 1088, 1, 'image/png');
await mkdir(path.join(work, 'art'), { recursive: true });
await writeFile(path.join(work, 'art/town-square.png'), Buffer.from(square.split(',')[1], 'base64'));
await browser.close();
sh(`node tools/paint-import.mjs --map=town-square --src=../art/town-square.png --quality=0.85 --sharpen=0.2`);
await writeFile(path.join(game, 'src/ui/assets/paint/index.js'),
  "// Thareia demo 2: only the town square is painted.\nimport townSquare from './town-square.js';\nexport const PAINTINGS = Object.freeze({ 'town-square': townSquare });\n");

// 9. build with the game's own build, then put the song into both pages
const out = path.join(work, 'dist');
sh(`node tools/build.mjs --out "${out}"`);
const song = 'data:audio/mp4;base64,' + (await readFile(path.join(root, 'assets/herbal-decay-battle.m4a'))).toString('base64');
const songTag = `<script>(function(s){window.__THAREIA_SONGS={battle:s,boss:s};})(${JSON.stringify(song)});</script>`;
await mkdir(path.join(root, 'dist'), { recursive: true });
for (const [src, dst] of [['aethermoor.html', 'thareia-demo-2.html'], ['aethermoor.artifact.html', 'thareia-demo-2.page.html']]) {
  let html = await readFile(path.join(out, src), 'utf8');
  const i = html.indexOf('<script'); if (i < 0) throw new Error(`no script in ${src}`);
  html = html.slice(0, i) + songTag + html.slice(i);
  html = html.replace(/<title>[^<]*<\/title>/, '<title>Thareia Demo Two</title>');
  await writeFile(path.join(root, 'dist', dst), html);
  console.log(dst, (html.length / 1048576).toFixed(2), 'MB');
}
