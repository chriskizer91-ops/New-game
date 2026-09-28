// Map drafting aid (M3 spec §6.1 WP3, optional): prints a map's rows with its entities, exits and
// anchors overlaid, so a draft can be checked against §2.3 at a glance.
//
//   node tools/map-draft.mjs hearth-road      # one map
//   node tools/map-draft.mjs --all            # every map
//
// Overlay letters: E encounter (P pack, B block, L lair), H hearthfire, N npc, G gate, K lock,
// C chest, S sign, O other entity, X exit, Z sealed exit, @ anchor (v1: anchors too).
// Owner: WP3.
import { MAPS, MAP_IDS } from '../src/data/maps/index.js';

const MARK = { npc: 'N', gate: 'G', lock: 'K', chest: 'C', sign: 'S', hearthfire: 'H' };
const markOf = e => (e.kind === 'encounter' ? { pack: 'P', block: 'B', lair: 'L' }[e.mode] || 'E' : MARK[e.kind] || 'O');

function draw(id) {
  const m = MAPS[id];
  if (!m) { console.error(`No map "${id}". Maps: ${MAP_IDS.join(', ')}`); process.exitCode = 1; return; }
  const g = m.rows.map(r => [...r]);
  const put = (x, y, ch) => { if (g[y] && g[y][x] !== undefined) g[y][x] = ch; };
  for (const e of m.entities) {
    if (e.kind === 'trigger' || e.kind === 'light') continue;
    const [x0, y0, x1, y1] = e.area || [...e.at, ...e.at];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, markOf(e));
  }
  for (const x of m.exits) for (let y = x.area[1]; y <= x.area[3]; y++) for (let xx = x.area[0]; xx <= x.area[2]; xx++) put(xx, y, x.sealed ? 'Z' : 'X');
  for (const [, [x, y]] of Object.entries(m.anchors)) put(x, y, '@');
  console.log(`\n${m.id}: ${m.name} (${m.w}x${m.h}, ${m.biome}, zone ${m.zone || '-'})`);
  const tens = Array.from({ length: m.w }, (_, x) => (x % 10 === 0 ? String(x / 10 % 10) : ' ')).join('');
  const ones = Array.from({ length: m.w }, (_, x) => String(x % 10)).join('');
  console.log(`     ${tens}\n     ${ones}`);
  g.forEach((r, y) => console.log(`${String(y).padStart(4)} ${r.join('')}`));
  for (const e of m.entities) console.log(`  ${markOf(e)} ${e.id}${e.at ? ` (${e.at})` : ''}${e.area ? ` [${e.area}]` : ''}`);
  for (const [name, a] of Object.entries(m.anchors)) console.log(`  @ ${name} (${a})`);
}

const args = process.argv.slice(2);
for (const id of args.includes('--all') || !args.length ? MAP_IDS : args) draw(id);
