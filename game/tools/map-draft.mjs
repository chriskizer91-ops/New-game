// Map drafting aid (M3 spec §6.1 WP3): look at a map as ASCII or as a PNG, with its entities, exits,
// anchors and roam rects drawn over the tiles, plus a design lint.
//
//   node tools/map-draft.mjs hearth-road                 # ASCII, one map (several ids work too)
//   node tools/map-draft.mjs --all                       # ASCII, every map
//   node tools/map-draft.mjs keep --png                  # PNG preview -> /tmp/aeth-map-draft/keep.png
//   node tools/map-draft.mjs --all --png --out=/tmp/x    # every map, into another folder
//   node tools/map-draft.mjs thornway --png --phone=14,26   # also a phone-camera crop around (14,26)
//   node tools/map-draft.mjs --lint                      # the design lint only, every map
//   node tools/map-draft.mjs mossfall --png --art        # paint with the real tileset (src/art/tiles.js)
//
// PNG options: --scale=16 (px per tile; with --art it is a zoom factor, default 2), --labels (label every
// entity, not just the big ones), --art (the biome's real tiles, canopies and roofs from WP5's
// tileAtlas, bundled on the fly with esbuild; entities stay as small markers),
// --reach=all|start (shade walkable tiles a flood fill from START_AT cannot reach: 'all' uses every
// key and the end-game story state, 'start' a level-1 party with only its starter relic).
// The PNG is drawn in headless Chromium (Playwright is global: export NODE_PATH=$(npm root -g)).
// Nothing is written inside the repo unless --out points there.
//
// ASCII overlay: P/B/L pack/block/lair, H hearthfire, N npc, G gate, K lock, C chest, S sign,
// O other entity, X exit, Z sealed exit, @ anchor.
// PNG glyphs: red P/B/L encounters, orange flame hearthfire (grey-blue when cold) with a ring on its
// stand, purple NPC initials, yellow gates (green hatch = crownwall), magenta dashed locks with the
// lock's short name, gold chests (dashed = hidden), blue exits (grey = sealed), white anchors
// (yellow = v1:), orange dashed roam rects, orange dots on 1-wide corridors, red hatch = unreachable.
//
// Lint: entities, anchors and exits under a tree canopy (the tile just above a 'T'), 1-wide
// corridors (roamers never enter them), pack homes outside the roam rects, walkable tiles no key
// can reach. M4: the fill walks through a gated exit (the Keep's south-east gate) once its gate holds, the
// four Sunscorch locks have short names, and the Sunscorch biomes draw as sand, ash or stone. M5: the 'all'
// state holds every Brand and the Ironspire's story flags (the second council, the Highfold, the third duel's
// yield), the four Ironspire locks have short names, and the Ironspire biomes draw as snow, rock or ice.
// Owner: WP3; M4 P2; M5 P2.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { MAPS, MAP_IDS } from '../src/data/maps/index.js';
import { LEGEND } from '../src/data/tiles.js';

const argv = process.argv.slice(2);
const flag = (k, d = null) => { const a = argv.find(x => x === `--${k}` || x.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.split('=')[1] : true) : d; };
const ids = argv.filter(a => !a.startsWith('--'));
const list = flag('all') || !ids.length ? MAP_IDS : ids;
for (const id of list) if (!MAPS[id]) { console.error(`No map "${id}". Maps: ${MAP_IDS.join(', ')}`); process.exit(1); }

const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
const cells = e => { const [x0, y0, x1, y1] = areaOf(e), out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]); return out; };
const solidAt = (m, x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h || (LEGEND[m.rows[y][x]] || LEGEND.x).solid;

// ---- ASCII --------------------------------------------------------------------------------------------

const MARK = { npc: 'N', gate: 'G', lock: 'K', chest: 'C', sign: 'S', hearthfire: 'H' };
const markOf = e => (e.kind === 'encounter' ? { pack: 'P', block: 'B', lair: 'L' }[e.mode] || 'E' : MARK[e.kind] || 'O');

function ascii(m) {
  const g = m.rows.map(r => [...r]);
  const put = (x, y, ch) => { if (g[y] && g[y][x] !== undefined) g[y][x] = ch; };
  for (const e of m.entities) if (e.kind !== 'trigger' && e.kind !== 'light') for (const [x, y] of cells(e)) put(x, y, markOf(e));
  for (const x of m.exits) for (const [cx, cy] of cells(x)) put(cx, cy, x.sealed ? 'Z' : 'X');
  for (const [, [x, y]] of Object.entries(m.anchors)) put(x, y, '@');
  console.log(`\n${m.id}: ${m.name} (${m.w}x${m.h}, ${m.biome}, zone ${m.zone || '-'})`);
  const tens = Array.from({ length: m.w }, (_, x) => (x % 10 === 0 ? String(x / 10 % 10) : ' ')).join('');
  const ones = Array.from({ length: m.w }, (_, x) => String(x % 10)).join('');
  console.log(`     ${tens}\n     ${ones}`);
  g.forEach((r, y) => console.log(`${String(y).padStart(4)} ${r.join('')}`));
  for (const e of m.entities) console.log(`  ${markOf(e)} ${e.id}${e.at ? ` (${e.at})` : ''}${e.area ? ` [${e.area}]` : ''}`);
  for (const [name, a] of Object.entries(m.anchors)) console.log(`  @ ${name} (${a})`);
}

// ---- lint and reachability ------------------------------------------------------------------------

// A walkable tile whose only walkable neighbours are two opposite ones (spec §4.5 "Roamable").
function corridors(m) {
  const out = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (solidAt(m, x, y)) continue;
    const n = !solidAt(m, x, y - 1), s = !solidAt(m, x, y + 1), e = !solidAt(m, x + 1, y), w = !solidAt(m, x - 1, y);
    if ((n && s && !e && !w) || (e && w && !n && !s)) out.push([x, y]);
  }
  return out;
}

// A synthetic game for the flood fill: 'all' = every key, both Brands, everything beaten;
// 'start' = the new-game party at level 1 with only its starter relic.
async function reachGame(mode) {
  const { newGame } = await import('../src/rules/gauntlet.js');
  const { levelUp } = await import('../src/rules/progression.js');
  const { createRng } = await import('../src/core/rng.js');
  const { RELICS } = await import('../src/data/relics.js');
  const { ENCOUNTERS } = await import('../src/data/encounters.js');
  const g = structuredClone(newGame({ name: 'Draft', starter: 'hearthbrand', seed: 1 }));
  if (mode !== 'all') return g;
  const rng = createRng('map-draft');
  for (const id of g.party.active) { let h = g.party.roster[id]; while (h.level < 20) h = levelUp(h, rng).hero; g.party.roster[id] = h; }
  for (const r of Object.keys(RELICS)) if (!g.inventory.some(i => i.base === r)) g.inventory.push({ uid: `draft-${r}`, base: r, kind: RELICS[r].kind });
  // M4.5: the Glass Flats open with the Brand of Glass; M5: Stormwatch's north gate with the Brand of Iron
  g.progress.brands = ['brand-of-briars', 'brand-of-the-heartroot', 'brand-of-glass', 'brand-of-ash', 'brand-of-iron', 'brand-of-frost'];
  const f = g.progress.flags;
  for (const [id, e] of Object.entries(ENCOUNTERS)) if (e.type === 'fight') { f.beaten[id] = 1; f.cleared[id] = true; if (e.once) f.done[id] = true; if (e.opens) f.unlocked[e.opens] = true; }
  Object.assign(f.story, { 'tamsin-yielded': true, 'tamsin-yielded-2': true, 'act1-complete': true, 'intro-done': true });
  // M5: the second council opens the Keep's east postern, the monks the Highfold, a yield the Deeps stair
  Object.assign(f.story, { 'sunscorch-complete': true, 'council-2-done': true, 'highfold-open': true, 'tamsin-yielded-3': true });
  for (const m of Object.values(MAPS)) for (const e of m.entities) if (e.kind === 'lock' || e.kind === 'gate') f.unlocked[e.id] = true;
  return g;
}

// Flood fill from START_AT across every map through the engine's canWalk; exits are portals.
async function reachable(game) {
  const { canWalk } = await import('../src/rules/world.js');
  const { check } = await import('../src/rules/cond.js');
  const { START_AT } = await import('../src/data/world.js');
  const { anchor } = await import('../src/data/maps/index.js');
  const DIRS = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
  const seen = new Set(), q = [[START_AT.map, START_AT.x, START_AT.y]];
  seen.add(`${START_AT.map}:${START_AT.x},${START_AT.y}`);
  while (q.length) {
    const [mid, x, y] = q.pop();
    const m = MAPS[mid];
    for (const [d, [dx, dy]] of Object.entries(DIRS)) {
      const nx = x + dx, ny = y + dy;
      if (!canWalk(game, mid, nx, ny, { dir: d })) continue;
      const ex = m.exits.find(e => cells(e).some(([cx, cy]) => cx === nx && cy === ny));
      let to = [mid, nx, ny];
      // M4: a gated exit (the Keep's south-east gate) is a way through once its gate holds
      if (ex) { if (ex.sealed && !(ex.to && ex.gate && check(game, ex.gate))) continue; const a = anchor(ex.to, ex.anchor); if (!a) continue; to = [a.map, a.x, a.y]; }
      const k = `${to[0]}:${to[1]},${to[2]}`;
      if (!seen.has(k)) { seen.add(k); q.push(to); }
    }
  }
  return seen;
}

async function lint(m, reached) {
  const { present } = await import('../src/rules/world.js');
  const out = [];
  const underCanopy = (x, y) => y + 1 < m.h && m.rows[y + 1][x] === 'T';
  for (const e of m.entities) {
    if (e.kind === 'trigger' || e.kind === 'light') continue;
    const hit = cells(e).filter(([x, y]) => underCanopy(x, y));
    if (hit.length) out.push(`${e.id} is under a tree canopy at ${hit.map(c => `(${c})`).join(' ')}`);
    if (e.kind === 'hearthfire' && underCanopy(e.stand[0], e.stand[1])) out.push(`${e.id} stand is under a canopy`);
  }
  for (const [name, [x, y]] of Object.entries(m.anchors)) if (underCanopy(x, y)) out.push(`anchor ${name} is under a canopy`);
  // a roof is drawn over the sprites, so a person or foe standing just below one loses the top of its head
  for (const e of m.entities) if ((e.kind === 'npc' || (e.kind === 'encounter' && e.mode !== 'pack')) && e.at[1] > 0 && m.rows[e.at[1] - 1][e.at[0]] === 'H') out.push(`${e.id} stands just below a roof (its head is drawn under it)`);
  for (const x of m.exits) if (cells(x).some(([cx, cy]) => underCanopy(cx, cy))) out.push(`exit ${x.id} is under a canopy`);
  const cor = corridors(m);
  if (cor.length) out.push(`${cor.length} one-wide corridor tile(s): ${cor.slice(0, 12).map(c => `(${c})`).join(' ')}${cor.length > 12 ? ' ...' : ''}`);
  for (const e of m.entities) {
    if (e.kind !== 'encounter' || e.mode !== 'pack') continue;
    const [x, y] = e.at;
    if (solidAt(m, x, y)) out.push(`pack ${e.id} home (${x},${y}) is solid`);
    if (!(m.roam?.rects || []).some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)) out.push(`pack ${e.id} home is outside the roam rects`);
  }
  if (reached) {
    const game = await reachGame('all');
    const solidEnt = present(game, m.id).filter(e => e.solid);
    const dead = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (solidAt(m, x, y) || solidEnt.some(e => cells(e).some(([cx, cy]) => cx === x && cy === y))) continue;
      if (m.exits.some(e => cells(e).some(([cx, cy]) => cx === x && cy === y))) continue;
      if (!reached.has(`${m.id}:${x},${y}`)) dead.push([x, y]);
    }
    if (dead.length) out.push(`${dead.length} walkable tile(s) no key reaches: ${dead.slice(0, 12).map(c => `(${c})`).join(' ')}${dead.length > 12 ? ' ...' : ''}`);
  }
  return out;
}

// ---- PNG (drawn in Chromium) ----------------------------------------------------------------------

// Runs in the page: paints one map onto a canvas and returns a PNG data URL.
function paint(d) {
  const S = d.scale, W = d.m.w, Hh = d.m.h, LEG = d.legendW, PAD = 18;
  const cv = document.createElement('canvas');
  cv.width = W * S + PAD + LEG; cv.height = Math.max(Hh * S + PAD + 40, 60 + d.lines.length * 13);
  const g = cv.getContext('2d');
  g.fillStyle = '#15130f'; g.fillRect(0, 0, cv.width, cv.height);
  const X = x => PAD + x * S, Y = y => PAD + y * S;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const fill = (c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(X(x), Y(y), w * S, h * S); };
  const dot = (c, px, py, r) => { g.fillStyle = c; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); };
  // M4: the Sunscorch biomes read as sand, ash or stone instead of grass (the draft only; --art paints the real tiles)
  const SUN = { desert: '#d6bb83', 'desert-town': '#d9c08c', canyon: '#c9a46e', 'mine-camp': '#bfa27a', dunes: '#dcc18a', oasis: '#cdb887', ash: '#8a8580', mine: '#4a4038', crystal: '#3b4a57', vault: '#46403c',
    // M5: the Ironspire (snow and scree outside, worked stone and ice below)
    mountain: '#a7aea9', monastery: '#c3c6c2', scree: '#9d9a93', 'dwarf-hall': '#6c6660', forge: '#4a3c36', outpost: '#b9bcb6', tundra: '#dfe6ea', 'frozen-lake': '#d6e2e8', 'ice-cave': '#3f5a6e' }[d.biome];
  const GRASS = SUN || '#5b8c3a';
  const ICY = ['mountain', 'monastery', 'scree', 'outpost', 'tundra', 'frozen-lake'].includes(d.biome); // M5: 'm' is a snowdrift there
  const ground = { '.': GRASS, ',': GRASS, '"': SUN ? '#b9a35e' : '#4d7d31', '=': SUN ? '#a88a58' : '#c9a96c', ':': '#9c968b', _: '#8c6b49', m: ICY ? '#f6f9fb' : SUN ? '#e4cc98' : '#6d5333', f: '#2f4a3d', r: '#5e4731', k: '#2c2931',
    T: GRASS, t: GRASS, Y: '#5b3f25', R: '#3d2b1d', o: GRASS, '#': '#6b6771', H: '#9b4531', '|': GRASS, '*': '#6b6771', '~': '#2f69a9', w: '#5b99c9',
    b: '#a27d51', '^': '#7b6551', v: GRASS, '+': '#5b3b1f', s: '#9b9b9b', i: '#1d1519', x: '#000000' };
  // pass 1: ground
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const ch = d.m.rows[y][x], px = X(x), py = Y(y);
    fill(ground[ch] || '#ff00ff', x, y);
    switch (ch) {
      case '.': for (let i = 0; i < 3; i++) dot(SUN ? 'rgba(0,0,0,0.12)' : '#6b9c47', px + rnd() * S, py + rnd() * S, S * 0.06); break;
      case ',': for (let i = 0; i < 4; i++) dot(['#f1dc54', '#ee86b4', '#fafafa'][i % 3], px + 2 + rnd() * (S - 4), py + 2 + rnd() * (S - 4), S * 0.09); break;
      case '"': g.strokeStyle = '#7bb04a'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { const bx = px + 2 + rnd() * (S - 4); g.beginPath(); g.moveTo(bx, py + S - 1); g.lineTo(bx + 1, py + S * 0.3); g.stroke(); } break;
      case '=': g.fillStyle = '#b89456'; g.fillRect(px, py + S * 0.8, S, S * 0.2); dot('#d9bd84', px + rnd() * S, py + rnd() * S, S * 0.07); break;
      case ':': g.strokeStyle = '#7e786d'; g.strokeRect(px + 0.5, py + 0.5, S - 1, S - 1); break;
      case '_': g.fillStyle = '#76583a'; g.fillRect(px, py + S / 2, S, 1); g.fillRect(px, py + S - 1, S, 1); break;
      case 'm': if (SUN) { g.strokeStyle = 'rgba(120,90,40,0.5)'; g.beginPath(); g.moveTo(px + 1, py + S * 0.6); g.quadraticCurveTo(px + S / 2, py + S * 0.3, px + S - 1, py + S * 0.6); g.stroke(); } else dot('#5b4427', px + rnd() * S, py + rnd() * S, S * 0.18); break;
      case 'f': dot('#8af7da', px + S * 0.3, py + S * 0.6, S * 0.12); dot('#8af7da', px + S * 0.7, py + S * 0.35, S * 0.09); break;
      case 'r': g.strokeStyle = '#43301f'; g.beginPath(); g.moveTo(px, py + S * 0.3); g.lineTo(px + S, py + S * 0.6); g.stroke(); break;
      case 't': dot('#2f6d25', px + S / 2, py + S * 0.55, S * 0.46); dot('#4f9a38', px + S * 0.4, py + S * 0.42, S * 0.2); break;
      case 'Y': g.fillStyle = '#7a5733'; g.fillRect(px + S * 0.2, py, S * 0.25, S); g.fillRect(px + S * 0.6, py, S * 0.15, S); break;
      case 'R': g.fillStyle = '#2a1d13'; g.fillRect(px, py + S * 0.3, S, 2); g.fillRect(px + S * 0.5, py, 2, S); break;
      case 'o': dot('#77777d', px + S / 2, py + S * 0.55, S * 0.45); dot('#a4a4aa', px + S * 0.4, py + S * 0.4, S * 0.18); break;
      case '#': g.fillStyle = '#58545e'; g.fillRect(px, py + S / 2, S, 1); g.fillRect(px + S / 2, py, 1, S / 2); break;
      case 'H': g.fillStyle = '#7d3524'; for (let i = 1; i < 4; i++) g.fillRect(px, py + i * S / 4, S, 1); break;
      case '|': g.fillStyle = '#7a5530'; for (let i = 0; i < 3; i++) g.fillRect(px + 1 + i * S / 3, py, S / 3 - 2, S); g.fillStyle = '#a07845'; for (let i = 0; i < 3; i++) g.fillRect(px + 1 + i * S / 3, py, S / 3 - 2, 2); break;
      case '*': g.fillStyle = '#58545e'; g.fillRect(px, py + S / 2, S, 1); dot('#ffb13c', px + S / 2, py + S * 0.35, S * 0.18); dot('#fff0a0', px + S / 2, py + S * 0.38, S * 0.08); break;
      case '~': g.strokeStyle = '#5d92cb'; g.beginPath(); g.moveTo(px + 2, py + S * 0.4); g.lineTo(px + S * 0.4, py + S * 0.3); g.lineTo(px + S * 0.7, py + S * 0.4); g.stroke(); break;
      case 'w': g.fillStyle = '#8fc4e4'; g.fillRect(px, py + S * 0.3, S, 1); g.fillRect(px, py + S * 0.7, S, 1); break;
      case 'b': g.fillStyle = '#7d5c39'; for (let i = 1; i < 4; i++) g.fillRect(px + i * S / 4, py, 1, S); break;
      case '^': g.fillStyle = '#5d4b3b'; for (let i = 0; i < 3; i++) g.fillRect(px, py + S * 0.25 + i * S / 4, S, 1); break;
      case 'v': g.fillStyle = '#8b7151'; g.fillRect(px, py + S * 0.35, S, S * 0.4); g.strokeStyle = '#e8d8b0'; g.beginPath(); g.moveTo(px + S * 0.3, py + S * 0.45); g.lineTo(px + S * 0.5, py + S * 0.65); g.lineTo(px + S * 0.7, py + S * 0.45); g.stroke(); break;
      case '+': g.fillStyle = '#2e1d0e'; g.fillRect(px + S * 0.2, py + S * 0.1, S * 0.6, S * 0.9); dot('#e0b050', px + S * 0.65, py + S * 0.55, S * 0.06); break;
      case 's': g.fillStyle = '#6f6f6f'; for (let i = 1; i < 4; i++) g.fillRect(px, py + i * S / 4, S, 2); break;
      case 'i': dot('#5b2a6b', px + rnd() * S, py + rnd() * S, S * 0.2); break;
      default: break;
    }
  }
  // pass 2: tree trunks and canopies (a canopy covers the row above)
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (d.m.rows[y][x] === 'T') {
    const px = X(x), py = Y(y);
    g.fillStyle = '#4a311c'; g.fillRect(px + S * 0.42, py + S * 0.45, S * 0.16, S * 0.5);
    dot('rgba(24,58,24,0.96)', px + S / 2, py - S * 0.05, S * 0.62);
    dot('rgba(52,104,40,0.9)', px + S * 0.4, py - S * 0.2, S * 0.3);
  }
  g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
  for (let x = 0; x <= W; x += 5) { g.beginPath(); g.moveTo(X(x) + 0.5, Y(0)); g.lineTo(X(x) + 0.5, Y(Hh)); g.stroke(); }
  for (let y = 0; y <= Hh; y += 5) { g.beginPath(); g.moveTo(X(0), Y(y) + 0.5); g.lineTo(X(W), Y(y) + 0.5); g.stroke(); }
  // overlays
  g.font = `bold ${Math.max(8, Math.round(S * 0.55))}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const label = (txt, px, py, c = '#fff') => { g.font = `${Math.max(8, Math.round(S * 0.5))}px monospace`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(txt, px, py); g.fillStyle = c; g.fillText(txt, px, py); };
  const glyph = (txt, x, y, bg, fg = '#fff', round = false) => {
    const px = X(x), py = Y(y);
    g.fillStyle = bg;
    if (round) { g.beginPath(); g.arc(px + S / 2, py + S / 2, S * 0.42, 0, Math.PI * 2); g.fill(); } else g.fillRect(px + 1, py + 1, S - 2, S - 2);
    g.font = `bold ${Math.max(7, Math.round(S * (txt.length > 1 ? 0.42 : 0.6)))}px monospace`; g.fillStyle = fg; g.fillText(txt, px + S / 2, py + S / 2 + 1);
  };
  const box = (e, stroke, dash = [], w = 2) => { const [x0, y0, x1, y1] = e.area || [e.at[0], e.at[1], e.at[0], e.at[1]]; g.setLineDash(dash); g.lineWidth = w; g.strokeStyle = stroke; g.strokeRect(X(x0) + 1, Y(y0) + 1, (x1 - x0 + 1) * S - 2, (y1 - y0 + 1) * S - 2); g.setLineDash([]); };
  for (const [x0, y0, x1, y1] of d.m.roam?.rects || []) { g.setLineDash([6, 4]); g.lineWidth = 2; g.strokeStyle = 'rgba(255,150,40,0.75)'; g.strokeRect(X(x0) + 2, Y(y0) + 2, (x1 - x0 + 1) * S - 4, (y1 - y0 + 1) * S - 4); g.setLineDash([]); }
  for (const [x, y] of d.dead) { g.fillStyle = 'rgba(255,0,0,0.35)'; g.fillRect(X(x), Y(y), S, S); g.strokeStyle = 'rgba(255,60,60,0.9)'; g.beginPath(); g.moveTo(X(x), Y(y)); g.lineTo(X(x) + S, Y(y) + S); g.stroke(); }
  for (const [x, y] of d.corr) dot('rgba(255,140,0,0.95)', X(x) + S / 2, Y(y) + S / 2, S * 0.12);
  const LOCK = { thornwall: 'Th', bramble: 'Br', stream: 'St', boulder: 'Bo', 'cold-hearth': 'Co', 'tally-seal': 'Ta', 'barred-gate': 'Ba', darkness: 'Dk', 'rot-knot': 'Rk', 'rope-ledge': 'Ro', ichor: 'Ic',
    'dune-glass': 'Dg', mirage: 'Mi', quicksand: 'Qs', 'vault-seal': 'Vs', chasm: 'Ch', ice: 'Iw', 'rune-seal': 'Rs', drift: 'Dr' };
  const big = [];
  for (const e of d.m.entities) {
    const [x0, y0] = e.area ? e.area : e.at;
    switch (e.kind) {
      case 'encounter': {
        const c = { pack: '#d23c3c', block: '#b01e1e', lair: '#7a0c0c' }[e.mode];
        if (e.area) { g.fillStyle = 'rgba(160,20,20,0.45)'; const [ax0, ay0, ax1, ay1] = e.area; g.fillRect(X(ax0), Y(ay0), (ax1 - ax0 + 1) * S, (ay1 - ay0 + 1) * S); }
        glyph({ pack: 'P', block: 'B', lair: 'L' }[e.mode], e.at[0], e.at[1], c, '#fff', e.mode === 'pack');
        big.push([e.id, e.at[0], e.at[1], '#ff9d9d']);
        break;
      }
      case 'hearthfire':
        glyph('H', e.at[0], e.at[1], e.cold ? '#5a7090' : '#ff8a1c', '#fff', true);
        g.lineWidth = 2; g.strokeStyle = e.cold ? '#8fb0d0' : '#ffb060'; g.beginPath(); g.arc(X(e.stand[0]) + S / 2, Y(e.stand[1]) + S / 2, S * 0.3, 0, Math.PI * 2); g.stroke();
        big.push([e.id, e.at[0], e.at[1], '#ffc080']);
        break;
      case 'npc': glyph(e.npc.slice(0, 2), e.at[0], e.at[1], '#7040b0', '#fff', true); big.push([e.npc, e.at[0], e.at[1], '#d8b8ff']); break;
      case 'gate':
        if (e.look === 'crownwall') { box(e, '#6dff5a', [], 3); const [ax0, ay0, ax1, ay1] = e.area || [...e.at, ...e.at]; for (let y = ay0; y <= ay1; y++) for (let x = ax0; x <= ax1; x++) { g.fillStyle = 'rgba(40,160,40,0.7)'; g.fillRect(X(x) + 2, Y(y) + 2, S - 4, S - 4); dot('#ff5aa0', X(x) + S / 2, Y(y) + S / 2, S * 0.13); } }
        else { box(e, e.look === 'chain' ? '#ffd24a' : e.look === 'door' ? '#c88a40' : '#ffe680', e.look === 'chain' ? [4, 3] : [], 3); }
        big.push([e.id, x0, y0, '#fff2a0']);
        break;
      case 'lock': box(e, '#ff4ae0', [4, 3], 3); { const [ax0, ay0] = e.area || e.at; glyph(LOCK[e.lock] || '?', ax0, ay0, 'rgba(120,0,110,0.8)', '#ffd0fa'); } if (d.labels) big.push([e.id, x0, y0, '#ffb0f0']); break;
      case 'chest': glyph(e.lock ? LOCK[e.lock] : 'C', e.at[0], e.at[1], '#d8a520', '#3a2400'); if (e.hidden) box(e, '#fff', [3, 3], 2); if (d.labels) big.push([e.id, e.at[0], e.at[1], '#ffe08a']); break;
      case 'sign': glyph('S', e.at[0], e.at[1], '#d8c8a0', '#3a2a10'); break;
      case 'board': glyph('Bd', e.at[0], e.at[1], '#a07040', '#fff'); break;
      case 'table': glyph('Tb', e.at[0], e.at[1], '#a07040', '#fff'); break;
      case 'pedestal': glyph('p', e.at[0], e.at[1], '#dcdce8', '#404060'); break;
      case 'lookout': glyph('Lk', e.at[0], e.at[1], '#50a0a0', '#fff'); break;
      case 'bellframe': glyph('Bf', e.at[0], e.at[1], '#50a0a0', '#fff'); break;
      case 'prop': glyph('pr', e.at[0], e.at[1], 'rgba(200,200,200,0.6)', '#222', true); break;
      case 'trigger': box(e, 'rgba(90,230,255,0.8)', [2, 3], 1); break;
      case 'light': g.strokeStyle = 'rgba(255,240,120,0.8)'; g.lineWidth = 1; g.beginPath(); g.arc(X(e.at[0]) + S / 2, Y(e.at[1]) + S / 2, e.radius * S, 0, Math.PI * 2); g.stroke(); break;
      default: glyph('?', e.at[0], e.at[1], '#888');
    }
  }
  for (const x of d.m.exits) {
    box(x, x.sealed ? '#9a9a9a' : '#4ab0ff', [], 3);
    const [ax0, ay0, ax1, ay1] = x.area;
    for (let y = ay0; y <= ay1; y++) for (let xx = ax0; xx <= ax1; xx++) { g.fillStyle = x.sealed ? 'rgba(90,90,90,0.55)' : 'rgba(40,140,255,0.45)'; g.fillRect(X(xx) + 3, Y(y) + 3, S - 6, S - 6); }
    big.push([x.sealed ? `${x.id} (sealed)` : `${x.id} > ${x.to}`, ax0, ay0, x.sealed ? '#cccccc' : '#9fd6ff']);
  }
  for (const [name, [x, y, f]] of Object.entries(d.m.anchors)) {
    const px = X(x) + S / 2, py = Y(y) + S / 2, v1 = name.startsWith('v1:');
    g.lineWidth = 2; g.strokeStyle = v1 ? '#ffe040' : '#ffffff'; g.beginPath(); g.arc(px, py, S * 0.22, 0, Math.PI * 2); g.stroke();
    const [dx, dy] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[f];
    g.beginPath(); g.moveTo(px + dx * S * 0.22, py + dy * S * 0.22); g.lineTo(px + dx * S * 0.45, py + dy * S * 0.45); g.stroke();
  }
  for (const [x, y] of d.warn) { g.lineWidth = 2; g.strokeStyle = '#ff2020'; g.strokeRect(X(x) + 0.5, Y(y) + 0.5, S - 1, S - 1); }
  for (const [txt, x, y, c] of big) label(txt, X(x) + S / 2, Y(y) - S * 0.35, c);
  // rulers
  g.font = '9px monospace'; g.fillStyle = '#b8a888';
  for (let x = 0; x < W; x += 5) { g.textAlign = 'left'; g.fillText(String(x), X(x) + 1, 8); }
  for (let y = 0; y < Hh; y += 5) { g.textAlign = 'right'; g.fillText(String(y), PAD - 2, Y(y) + 6); }
  // legend
  g.textAlign = 'left'; g.font = '11px monospace';
  const lx = X(W) + 10;
  d.lines.forEach((t, i) => { g.fillStyle = t.startsWith('!') ? '#ff8080' : i === 0 ? '#ffe7a8' : '#cbbd9d'; g.fillText(t, lx, 16 + i * 13); });
  return cv.toDataURL('image/png');
}

// Runs in the page (after the tileAtlas bundle is loaded): the map in the biome's real tiles, with small
// markers for entities, exits and anchors, the overhead pass (canopies, roofs, grass tops) on top.
function paintArt(d) {
  const A = window.__tileAtlas(d.m.biome), T = 16, Z = d.zoom, PAD = 18, LEG = d.legendW;
  const src = document.createElement('canvas'); src.width = A.img.width; src.height = A.img.height; src.getContext('2d').putImageData(A.img, 0, 0);
  const base = document.createElement('canvas'); base.width = d.m.w * T; base.height = d.m.h * T;
  const b = base.getContext('2d');
  b.fillStyle = '#000'; b.fillRect(0, 0, base.width, base.height);
  const blit = (ops, x, y) => { for (const [sx, sy, w, h, dx, dy] of ops) b.drawImage(src, sx, sy, w, h, x * T + dx, y * T + dy, w, h); };
  const cells = [];
  for (let y = 0; y < d.m.h; y++) for (let x = 0; x < d.m.w; x++) { const c = A.cell(d.m.rows, x, y, 0); cells.push([x, y, c]); blit(c.ground, x, y); }
  // entity markers under the overhead pass, like sprites
  const mark = (x, y, c, r = 5) => { b.fillStyle = c; b.beginPath(); b.arc(x * T + 8, y * T + 9, r, 0, Math.PI * 2); b.fill(); b.strokeStyle = 'rgba(0,0,0,0.7)'; b.lineWidth = 1; b.stroke(); };
  const COL = { encounter: '#e03030', hearthfire: '#ff9020', npc: '#a060ff', gate: '#ffe060', lock: '#ff40e0', chest: '#e8b020', sign: '#e8dcc0', pedestal: '#e0e0f0', board: '#c08040', table: '#c08040', lookout: '#50c0c0', bellframe: '#50c0c0', prop: '#cccccc' };
  for (const e of d.m.entities) {
    if (e.kind === 'trigger' || e.kind === 'light') continue;
    const [x0, y0, x1, y1] = e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
    if (e.area && (e.kind === 'gate' || e.kind === 'lock' || e.kind === 'encounter')) { b.strokeStyle = COL[e.kind]; b.lineWidth = 2; b.setLineDash(e.kind === 'lock' ? [3, 2] : []); b.strokeRect(x0 * T + 1, y0 * T + 1, (x1 - x0 + 1) * T - 2, (y1 - y0 + 1) * T - 2); b.setLineDash([]); }
    const [ax, ay] = e.at || [x0, y0];
    mark(ax, ay, COL[e.kind] || '#888', e.kind === 'encounter' && e.mode !== 'pack' ? 6 : 4);
  }
  for (const x of d.m.exits) { const [x0, y0, x1, y1] = x.area; b.strokeStyle = x.sealed ? '#bbbbbb' : '#40b0ff'; b.lineWidth = 2; b.strokeRect(x0 * T + 1, y0 * T + 1, (x1 - x0 + 1) * T - 2, (y1 - y0 + 1) * T - 2); }
  for (const [x, y, c] of cells) blit(c.over, x, y);
  const cv = document.createElement('canvas');
  cv.width = d.m.w * T * Z + PAD + LEG; cv.height = Math.max(d.m.h * T * Z + PAD + 30, 60 + d.lines.length * 13);
  const g = cv.getContext('2d');
  g.fillStyle = '#15130f'; g.fillRect(0, 0, cv.width, cv.height);
  g.imageSmoothingEnabled = false;
  g.drawImage(base, PAD, PAD, base.width * Z, base.height * Z);
  g.font = '9px monospace'; g.fillStyle = '#b8a888';
  for (let x = 0; x < d.m.w; x += 5) { g.textAlign = 'left'; g.fillText(String(x), PAD + x * T * Z + 1, 10); }
  for (let y = 0; y < d.m.h; y += 5) { g.textAlign = 'right'; g.fillText(String(y), PAD - 2, PAD + y * T * Z + 8); }
  g.textAlign = 'left'; g.font = '11px monospace';
  d.lines.forEach((t, i) => { g.fillStyle = t.startsWith('!') ? '#ff8080' : i === 0 ? '#ffe7a8' : '#cbbd9d'; g.fillText(t, PAD + d.m.w * T * Z + 10, 16 + i * 13); });
  return cv.toDataURL('image/png');
}

// Runs in the page: a phone-camera crop (about 11 tiles across) of an already painted map.
async function crop(d) {
  const img = new Image(); img.src = d.src; await img.decode();
  const cv = document.createElement('canvas');
  const tw = 11, th = 15, S = d.scale, k = d.k || 3;
  cv.width = tw * S * k; cv.height = th * S * k;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const x0 = Math.max(0, Math.min(d.w - tw, d.cx - Math.floor(tw / 2))), y0 = Math.max(0, Math.min(d.h - th, d.cy - Math.floor(th / 2)));
  g.drawImage(img, 18 + x0 * S, 18 + y0 * S, tw * S, th * S, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/png');
}

function launch() {
  const require = createRequire(import.meta.url);
  let pw;
  try { pw = require('playwright'); } catch { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
  const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
  return pw.chromium.launch(exe ? { executablePath: exe } : {});
}

// ---- main -----------------------------------------------------------------------------------------

const wantPng = !!flag('png'), wantLint = !!flag('lint');
const reachMode = flag('reach') === true ? 'all' : flag('reach');
let reached = null;
if (wantPng || wantLint) reached = await reachable(await reachGame(reachMode === 'start' ? 'start' : 'all'));

if (!wantPng && !wantLint) for (const id of list) ascii(MAPS[id]);

if (wantLint && !wantPng) {
  for (const id of list) { const w = await lint(MAPS[id], reached); console.log(`${id}: ${w.length ? '' : 'clean'}`); for (const x of w) console.log(`  - ${x}`); }
}

if (wantPng) {
  const outDir = path.resolve(flag('out', '/tmp/aeth-map-draft'));
  mkdirSync(outDir, { recursive: true });
  const art = !!flag('art');
  const scale = Number(flag('scale', art ? 2 : 16));
  const browser = await launch();
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  if (art) {
    const { build } = await import('esbuild');
    const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
    const out = await build({ stdin: { contents: "import { tileAtlas } from './src/art/tiles.js'; window.__tileAtlas = tileAtlas;", resolveDir: root, sourcefile: 'map-draft-art.js' }, bundle: true, format: 'iife', write: false, logLevel: 'silent' });
    await page.addScriptTag({ content: out.outputFiles[0].text });
  }
  for (const id of list) {
    const m = MAPS[id];
    const warnings = await lint(m, reachMode ? reached : null);
    const deadTiles = [];
    if (reachMode) {
      const { present } = await import('../src/rules/world.js');
      const game = await reachGame(reachMode === 'start' ? 'start' : 'all');
      const solidEnt = present(game, id).filter(e => e.solid);
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        if (solidAt(m, x, y) || solidEnt.some(e => cells(e).some(([cx, cy]) => cx === x && cy === y))) continue;
        if (m.exits.some(e => cells(e).some(([cx, cy]) => cx === x && cy === y))) continue;
        if (!reached.has(`${id}:${x},${y}`)) deadTiles.push([x, y]);
      }
    }
    const warn = [];
    for (const e of m.entities) if (e.kind !== 'trigger' && e.kind !== 'light') for (const [x, y] of cells(e)) if (y + 1 < m.h && m.rows[y + 1][x] === 'T') warn.push([x, y]);
    const lines = [`${m.id}: ${m.name}  ${m.w}x${m.h}  ${m.biome} / zone ${m.zone || '-'} / Lv ${m.level}`, ''];
    for (const e of m.entities) lines.push(`${e.kind.padEnd(10)} ${e.id}${e.at ? ` (${e.at})` : ''}${e.area ? ` [${e.area}]` : ''}${e.lock ? ` ${e.lock}` : ''}${e.mode ? ` ${e.mode}` : ''}`);
    lines.push('');
    for (const x of m.exits) lines.push(`exit       ${x.id} [${x.area}] ${x.sealed ? `sealed ${x.sealed.region}` : `> ${x.to}:${x.anchor}`}`);
    for (const [n, a] of Object.entries(m.anchors)) lines.push(`anchor     ${n} (${a})`);
    if (m.roam) lines.push(`roam       max ${m.roam.max}: ${m.roam.rects.map(r => `[${r}]`).join(' ')}`);
    lines.push('');
    for (const w of warnings) lines.push(`! ${w}`);
    const md = { id: m.id, biome: m.biome, w: m.w, h: m.h, rows: m.rows, entities: m.entities, exits: m.exits, anchors: m.anchors, roam: m.roam };
    const src = art
      ? await page.evaluate(paintArt, { m: md, zoom: scale, legendW: 470, lines })
      : await page.evaluate(paint, { m: md, biome: m.biome, scale, labels: !!flag('labels'), legendW: 470, dead: deadTiles, corr: corridors(m), warn, lines });
    const file = path.join(outDir, `${id}${art ? '-art' : ''}.png`);
    writeFileSync(file, Buffer.from(src.split(',')[1], 'base64'));
    console.log(`wrote ${file}${warnings.length ? `  (${warnings.length} lint note${warnings.length > 1 ? 's' : ''})` : ''}`);
    for (const w of warnings) console.log(`  - ${w}`);
    const phone = flag('phone');
    if (phone && phone !== true) {
      const [cx, cy] = String(phone).split(',').map(Number);
      const c = await page.evaluate(crop, { src, scale: art ? 16 * scale : scale, w: m.w, h: m.h, cx, cy, k: art ? Math.max(1, Math.round(3 / scale)) : 3 });
      const pf = path.join(outDir, `${id}${art ? '-art' : ''}-phone-${cx}-${cy}.png`);
      writeFileSync(pf, Buffer.from(c.split(',')[1], 'base64'));
      console.log(`wrote ${pf}`);
    }
  }
  await browser.close();
}
