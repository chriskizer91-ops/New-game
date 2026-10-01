// Thareia (T2): package G, the art imports and the three new painted maps (design/09-t2-spec.md 2.10, 2.11 and 8).
// th-landing, th-fawnrest-node and th-fjords-cove are traced tile by tile from the player's paintings 5, 6 and 7: their
// rows name only legend tiles, their anchors stand on walkable ground, every id the spec fixes is on them, the story
// targets are reached from the arrival anchor (through the engine, rules/world.js canWalk) once the story opens their
// gates and not before, and each painting was fitted to the rows as they are now. The battle backdrops and the cut-scene
// stills the chapter plays are in the game, and the new looks (the node, the open slab, the deer, the nine hearths) draw.
// Owner: G.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { MAPS, anchor } from '../src/data/maps/index.js';
import { LEGEND, tileOf } from '../src/data/tiles.js';
import { PAINTINGS } from '../src/ui/assets/paint/index.js';
import { CUTS } from '../src/ui/assets/cuts/index.js';
import { PAINTED_BACKDROPS } from '../src/art/painted-backdrops.js';
import { BACKDROPS } from '../src/data/encounters.js';
import { C1_DIALOGUE } from '../src/data/thareia/c1-dialogue.js';
import { newGame } from '../src/rules/gauntlet.js';
import { canWalk } from '../src/rules/world.js';

globalThis.ImageData ??= class ImageData {
  constructor(d, w, h) { if (typeof d === 'number') { h = w; w = d; d = new Uint8ClampedArray(w * h * 4); } this.data = d; this.width = w; this.height = h; }
};
const { OBJECT_KINDS, OBJECT_STATES, HEARTH_LOOKS, objectSprite } = await import('../src/art/map-sprites.js');

const TRACED = ['th-landing', 'th-fawnrest-node', 'th-fjords-cove'];
const DIRS = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const STEPS = Object.entries(DIRS);
const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
const cellsOf = e => { const [x0, y0, x1, y1] = areaOf(e), out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]); return out; };
const inside = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
const walkable = (m, x, y) => inside(m, x, y) && !tileOf(m.rows[y][x]).solid;
const find = (mapId, id) => MAPS[mapId].entities.find(e => e.id === id) || MAPS[mapId].exits.find(e => e.id === id);

// the ids spec 2.10 and 2.11 fix: [map, id, kind, fields that must match]
const FIXED = [
  ['th-landing', 'th-landing', 'trigger', { on: 'enter', if: { not: { flag: 'th-landed' } }, dialogue: 'th-landing', area: [0, 0, 47, 31] }],
  ['th-landing', 'c1-crate-thieves', 'trigger', { on: 'step', if: { all: [{ flag: 'c1-start' }, { not: { beaten: 'c1-landing' } }] }, dialogue: 'c1-crate-thieves' }],
  ['th-landing', 'th-landing-crate', 'sign', { text: 'FERNSHAW, THORNHOLLOW. One seam split. It still hums, faintly.' }],
  ['th-landing', 'th-skyhire', 'npc', { npc: 'th-hire-landing' }],
  ['th-landing', 'th-skyhire-post', 'sign', { text: 'DUSTWIND SKIFF HIRE. Licensed docks only. No night flying.' }],
  ['th-landing', 'tl-n', 'exit', { to: 'th-thornhollow', anchor: 'from-landing' }],
  ['th-landing', 'tl-s', 'exit', { sealed: { region: 'verdant', text: 'The Hearth Road, to the Keep. Not yet: the Wilds first.' } }],
  ['th-fawnrest-node', 'c1-fn-hot', 'trigger', { dialogue: 'c1-fn-hot' }],
  ['th-fawnrest-node', 'th-fn-stair-gate', 'gate', { look: 'rot-knot', open: { beaten: 'c1-node-stair' } }],
  ['th-fawnrest-node', 'c1-node-stair', 'encounter', { enc: 'c1-node-stair', mode: 'block' }],
  ['th-fawnrest-node', 'c1-fn-hall', 'trigger', { dialogue: 'c1-fn-hall' }],
  ['th-fawnrest-node', 'th-fn-root-gate', 'gate', { look: 'rot-knot', open: { beaten: 'c1-node-roots' } }],
  ['th-fawnrest-node', 'c1-node-roots', 'encounter', { enc: 'c1-node-roots', mode: 'block' }],
  ['th-fawnrest-node', 'th-fn-node', 'prop', { prop: 'node', solid: true }],
  ['th-fawnrest-node', 'c1-guardian', 'encounter', { enc: 'c1-guardian', mode: 'lair', talk: 'c1-guardian-wakes' }],
  ['th-fawnrest-node', 'th-fn-sign', 'sign', {}],
  ['th-fawnrest-node', 'fn-up', 'exit', { to: 'th-fawnrest', anchor: 'from-node' }],
  ['th-fjords-cove', 'c1-cove-arrive', 'trigger', { on: 'enter', once: true, dialogue: 'c1-cove-arrive' }],
  ['th-fjords-cove', 'c1-fjord-crew', 'encounter', { enc: 'c1-fjord-crew', mode: 'block' }],
  ['th-fjords-cove', 'c1-fjord-inlet', 'encounter', { enc: 'c1-fjord-inlet', mode: 'lair' }],
  ['th-fjords-cove', 'c1-fjord-cove', 'encounter', { enc: 'c1-fjord-cove', mode: 'lair', talk: 'c1-cove-skeet' }],
  ['th-fjords-cove', 'th-cove-receipts', 'chest', { if: { beaten: 'c1-fjord-cove' } }],
  ['th-fjords-cove', 'th-cove-crates', 'chest', {}],
  ['th-fjords-cove', 'cove-boat', 'exit', { to: 'th-mosswatch-1', anchor: 'from-cove' }],
];
const ANCHORS = { 'th-landing': ['from-skiff', 'from-town'], 'th-fawnrest-node': ['from-fawnrest'], 'th-fjords-cove': ['from-boat'] };

test('the three traced maps: legend tiles only, 48 x 32 as their paintings, walkable anchors, entities in bounds', () => {
  for (const id of TRACED) {
    const m = MAPS[id];
    assert.ok(m, id);
    assert.deepEqual([m.w, m.h], [48, 32], `${id}: 1536 x 1024 at 32 px a tile`);
    assert.equal(m.rows.length, m.h, id);
    for (const [y, row] of m.rows.entries()) {
      assert.equal(row.length, m.w, `${id} row ${y}`);
      for (const ch of row) assert.ok(LEGEND[ch], `${id} row ${y}: '${ch}' is not a legend tile`);
    }
    assert.equal(m.overTiles, false, `${id} is traced from its painting`);
    assert.equal(m.region, 'verdant', id);
    for (const name of ANCHORS[id]) {
      const a = m.anchors[name];
      assert.ok(a && walkable(m, a[0], a[1]) && DIRS[a[2]], `${id}:${name} stands on walkable ground`);
    }
    for (const [name, [x, y]] of Object.entries(m.anchors)) assert.ok(walkable(m, x, y), `${id}:${name}`);
    const ids = new Set();
    for (const e of m.entities) {
      assert.ok(!ids.has(e.id), `${id}/${e.id} is one entity`); ids.add(e.id);
      for (const [x, y] of cellsOf(e)) assert.ok(inside(m, x, y), `${id}/${e.id} in bounds`);
      if (['npc', 'chest', 'encounter'].includes(e.kind)) assert.ok(walkable(m, ...e.at), `${id}/${e.id} stands on walkable ground`);
      if (e.kind === 'encounter') for (const [x, y] of cellsOf(e)) assert.ok(walkable(m, x, y), `${id}/${e.id} covers walkable ground`);
      if (e.kind === 'sign') assert.ok(STEPS.some(([, [dx, dy]]) => walkable(m, e.at[0] + dx, e.at[1] + dy)), `${id}/${e.id} is read from beside it`);
      if (e.kind === 'gate') assert.ok(cellsOf(e).every(([x, y]) => walkable(m, x, y)), `${id}/${e.id} lies across walkable ground`);
      if (e.kind === 'trigger') assert.ok(cellsOf(e).some(([x, y]) => walkable(m, x, y)), `${id}/${e.id} covers walkable ground`);
      if (e.kind === 'gate') assert.ok(e.open && e.text, `${id}/${e.id} opens on the story and says what it is`);
      if (e.kind === 'chest') assert.ok(e.loot, `${id}/${e.id} holds loot`);
    }
    for (const ex of m.exits) {
      for (const [x, y] of cellsOf(ex)) assert.ok(walkable(m, x, y), `${id}/${ex.id} walkable`);
      if (ex.to) assert.ok(anchor(ex.to, ex.anchor), `${id}/${ex.id}: ${ex.to}:${ex.anchor}`);
      else assert.ok(ex.sealed?.text, `${id}/${ex.id} says why it is shut`);
    }
  }
});

test('every id spec 2.10 and 2.11 fixes is on its map, as the spec says', () => {
  const pick = (e, want) => Object.fromEntries(Object.keys(want).map(k => [k, e[k]]));
  for (const [mapId, id, kind, want] of FIXED) {
    const e = find(mapId, id);
    assert.ok(e, `${mapId}/${id} is placed`);
    if (kind === 'exit') assert.ok(MAPS[mapId].exits.includes(e), `${mapId}/${id} is an exit`);
    else assert.equal(e.kind, kind, `${mapId}/${id} is a ${kind}`);
    assert.deepEqual(pick(e, want), want, `${mapId}/${id}`);
  }
  // the receipts: gold and the story key the S1 quest waits on; the crates: gold and a tonic
  const receipts = find('th-fjords-cove', 'th-cove-receipts'), crates = find('th-fjords-cove', 'th-cove-crates');
  assert.equal(receipts.loot.story, 's1-lens-receipt');
  assert.ok(receipts.loot.gold > 0 && crates.loot.gold > 0 && crates.loot.bag?.['hearth-tonic'] >= 1);
  // the landing: its zone, one patrol on the field, the backdrop and music of 2.11; the node and the cove are dark
  const L = MAPS['th-landing'];
  assert.deepEqual([L.zone, L.level, L.backdrop, L.music, L.roam?.max], ['th-landing', 2, 'verdant-wood', 'town', 1]);
  const N = MAPS['th-fawnrest-node'], C = MAPS['th-fjords-cove'];
  assert.deepEqual([N.level, N.backdrop, N.music, N.dark, N.travel, N.roam], [9, 'fawnrest-node', 'dungeon', true, false, null]);
  assert.deepEqual([C.level, C.backdrop, C.music, C.dark, C.roam], [7, 'mosswatch', 'dungeon', true, null]);
  // the node stands on its dais (a solid tile) with the guardian in front of it, between it and the root gate
  const node = find('th-fawnrest-node', 'th-fn-node'), hart = find('th-fawnrest-node', 'c1-guardian'), gate = find('th-fawnrest-node', 'th-fn-root-gate');
  assert.ok(tileOf(N.rows[node.at[1]][node.at[0]]).solid, 'the node stands on solid ground (its crystal)');
  assert.ok(areaOf(hart)[1] > node.at[1] && areaOf(hart)[3] < areaOf(gate)[1], 'the hart lies between the node and the root gate');
  // a story trigger that starts a fight is guarded by that fight, never by `once` (a reload mid-scene keeps it)
  assert.deepEqual(find('th-fawnrest-node', 'c1-fn-hall').if, { not: { beaten: 'c1-node-hall' } });
  assert.ok(!find('th-fawnrest-node', 'c1-fn-hall').once);
});

test('player-facing text on the three maps: short lines, no old-game faction words', () => {
  const BANNED = /Dustveil|Cistern|Unwaning|Tallym|tally|Brand|Sleeper|Hollow Council|Rotwarden|First Seed|Briarmaw|Thornwatch/i;
  for (const id of TRACED) {
    const m = MAPS[id];
    const texts = [m.name, ...m.entities.flatMap(e => [e.text, e.name, e.note]), ...m.exits.flatMap(ex => [ex.sealed?.text, ex.sealed?.hint])].filter(Boolean);
    for (const t of texts) { assert.ok(t.length <= 140, `${id}: "${t}"`); assert.ok(!BANNED.test(t), `${id}: "${t}"`); }
  }
});

test('lock, gate, chest and trigger ids on the three maps are unique across every map', () => {
  const KEYED = ['lock', 'gate', 'chest', 'trigger'];
  for (const id of TRACED) for (const e of MAPS[id].entities) {
    if (!KEYED.includes(e.kind)) continue;
    const on = Object.values(MAPS).filter(m => m.entities.some(o => o.id === e.id && KEYED.includes(o.kind))).map(m => m.id);
    assert.deepEqual(on, [id], `${e.id} is on ${on.join(' and ')}`);
  }
});

// ---- reachability through the engine ------------------------------------------------------------------
function gameWith({ flags = [], won = [] } = {}) {
  const g = newGame({ seed: 7 });
  const f = g.progress.flags;
  f.story = { ...(f.story || {}), ...Object.fromEntries(flags.map(k => [k, true])) };
  f.done = { ...(f.done || {}), ...Object.fromEntries(won.map(k => [k, true])) };
  f.beaten = { ...(f.beaten || {}), ...Object.fromEntries(won.map(k => [k, 1])) };
  return g;
}
function reach(game, mapId, from) {
  const [x0, y0] = MAPS[mapId].anchors[from];
  const seen = new Set([`${x0},${y0}`]), q = [[x0, y0]];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dir, [dx, dy]] of STEPS) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!seen.has(k) && canWalk(game, mapId, nx, ny, { dir })) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return seen;
}
// a solid thing is reached from a tile beside it; a trigger or an exit by standing in it
const reached = (seen, mapId, id) => {
  const e = find(mapId, id), cells = cellsOf(e);
  if (e.kind === 'trigger' || MAPS[mapId].exits.includes(e)) return cells.some(([x, y]) => seen.has(`${x},${y}`));
  return cells.some(([x, y]) => STEPS.some(([, [dx, dy]]) => seen.has(`${x + dx},${y + dy}`)));
};
const reaches = (game, mapId, from, ids) => { const s = reach(game, mapId, from); for (const id of ids) assert.ok(reached(s, mapId, id), `${mapId}: ${from} reaches ${id}`); };
const blocks = (game, mapId, from, ids) => { const s = reach(game, mapId, from); for (const id of ids) assert.ok(!reached(s, mapId, id), `${mapId}: ${from} does not reach ${id} yet`); };

test('the landing: from the skiff and from the gate, the crate, the thieves\' platform, Hob\'s post and both roads', () => {
  const all = ['c1-crate-thieves', 'th-landing-crate', 'th-skyhire', 'th-skyhire-post', 'tl-n', 'tl-s'];
  reaches(gameWith(), 'th-landing', 'from-skiff', all);
  reaches(gameWith({ flags: ['th-landed', 'c1-start'] }), 'th-landing', 'from-town', all);
  const s = reach(gameWith(), 'th-landing', 'from-town'), [sx, sy] = MAPS['th-landing'].anchors['from-skiff'];
  assert.ok(s.has(`${sx},${sy}`), 'the road from the gate runs unbroken to the skiff\'s platform');
  // the anchor the skiff sets down on is inside the thieves' trigger's platform, so the first step there starts it
  const t = find('th-landing', 'c1-crate-thieves'), [x0, y0, x1, y1] = t.area;
  assert.ok(sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1, 'from-skiff is on the platform');
});

test('the node: the stair gate, then the hall, then the root gate; with both fights won the guardian is reached', () => {
  const M = 'th-fawnrest-node';
  reaches(gameWith(), M, 'from-fawnrest', ['fn-up', 'c1-fn-hot', 'th-fn-stair-gate', 'c1-node-stair']);
  blocks(gameWith(), M, 'from-fawnrest', ['c1-fn-hall', 'c1-node-roots', 'c1-guardian']);
  reaches(gameWith({ won: ['c1-node-stair'] }), M, 'from-fawnrest', ['c1-fn-hall', 'th-fn-sign', 'th-fn-root-gate', 'c1-node-roots']);
  blocks(gameWith({ won: ['c1-node-stair'] }), M, 'from-fawnrest', ['c1-guardian']);
  reaches(gameWith({ won: ['c1-node-stair', 'c1-node-hall', 'c1-node-roots'] }), M, 'from-fawnrest', ['c1-guardian', 'fn-up']);
});

test('the cove: from Wenna\'s boat, the inlet, Skeet\'s landing and the cave; the crew holds the path to the crates', () => {
  const M = 'th-fjords-cove';
  reaches(gameWith(), M, 'from-boat', ['c1-cove-arrive', 'cove-boat', 'c1-fjord-inlet', 'c1-fjord-cove', 'c1-fjord-crew']);
  blocks(gameWith(), M, 'from-boat', ['th-cove-crates']);
  reaches(gameWith({ won: ['c1-fjord-crew'] }), M, 'from-boat', ['th-cove-crates']);
  reaches(gameWith({ won: ['c1-fjord-cove'] }), M, 'from-boat', ['th-cove-receipts']);
});

// ---- the imports ---------------------------------------------------------------------------------------
test('each traced map has its painting, fitted to its rows as they are now', () => {
  const rowsSha = map => createHash('sha256').update(map.rows.join('\n')).digest('hex').slice(0, 12); // as tools/paint-import.mjs
  for (const id of TRACED) {
    const p = PAINTINGS[id];
    assert.ok(p, `${id} is painted`);
    assert.deepEqual([p.w, p.h], [MAPS[id].w * 32, MAPS[id].h * 32], id);
    assert.equal(p.rowsSha, rowsSha(MAPS[id]), `${id}: rows changed after the painting was fitted (check the grid, then --stamp=${id})`);
  }
});

test('the cut-scenes of spec 3.2 are stills in the game, and so is every cut Chapter 1\'s dialogue plays', () => {
  for (const id of ['shard-glows', 'grove-pulse', 'node-overheats', 'guardian-wakes', 'node-cools']) assert.ok(CUTS[id], `cut ${id}`);
  const cuts = new Set();
  const walk = v => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { if (typeof v.cut === 'string') cuts.add(v.cut); Object.values(v).forEach(walk); } };
  walk(C1_DIALOGUE);
  for (const id of cuts) assert.ok(CUTS[id], `C1 dialogue plays cut ${id}`);
  // the pulse is the shard's still at night: its own picture, not a copy
  assert.notEqual(CUTS['grove-pulse'].src, CUTS['shard-glows'].src);
});

test('Chapter 1\'s painted battle backdrops (spec 5.4 and 8)', () => {
  for (const k of ['verdant-wood', 'eldergrove', 'fawnrest-node', 'mosswatch', 'fawnrest']) {
    assert.ok(BACKDROPS.includes(k), `${k} is a backdrop`);
    const b = PAINTED_BACKDROPS[k];
    assert.ok(b && /^data:image\/webp;base64,/.test(b.src) && b.w === 960 && b.h >= 700, `${k} is painted`);
  }
});

// ---- the new looks ---------------------------------------------------------------------------------------
const lit = img => { let n = 0; for (let i = 3; i < img.data.length; i += 4) n += img.data[i] ? 1 : 0; return n; };
test('the node draws white-hot and then gold (and as a glow over its painting); the open slab and the deer draw', () => {
  assert.ok(OBJECT_KINDS.includes('node') && OBJECT_KINDS.includes('open-slab') && OBJECT_KINDS.includes('deer'));
  assert.deepEqual(OBJECT_STATES.node, ['white', 'gold']);
  for (const look of [null, 'glow']) {
    const w = objectSprite('node', 'white', { look }), g = objectSprite('node', 'gold', { look });
    assert.ok(lit(w) > 200 && lit(g) > 200, `node ${look} draws`);
    assert.notDeepEqual(w.data, g.data, `node ${look}: white-hot and gold differ`);
    assert.equal(w.frames, 2, 'the node pulses');
    assert.notDeepEqual(objectSprite('node', 'white', { look, frame: 1 }).data, w.data, `node ${look}: its second frame moves`);
    assert.ok(w.anchors.foot.every(Number.isFinite));
  }
  assert.ok(lit(objectSprite('open-slab', 'closed')) > 40, 'the open slab draws');
  assert.ok(lit(objectSprite('deer', 'graze')) > 12, 'the deer draws');
  // every map's props name a drawn kind; the S9 deer are signs drawn as the deer
  for (const m of Object.values(MAPS)) for (const e of m.entities) {
    if (e.kind === 'prop' && e.prop) assert.ok(OBJECT_KINDS.includes(e.prop), `${m.id}/${e.id}: prop ${e.prop} is drawn`);
  }
});

test('the nine Chapter 1 hearthfires have looks, lit (flickering) and cold', () => {
  const C1 = ['th-tw-hearth', 'th-eg-hearth', 'th-hr-coal', 'th-mf-cairn', 'th-mw-hearth', 'th-mw-fire', 'th-hw-cairn', 'th-fr-camp', 'th-fr-stone'];
  for (const id of C1) {
    assert.ok(HEARTH_LOOKS[id], `${id} has a look`);
    const on = objectSprite('hearth', 'lit', { id }), off = objectSprite('hearth', 'cold', { id });
    assert.equal(on.frames, 2, `${id} lit flickers`);
    assert.notDeepEqual(on.data, off.data, `${id}: lit and cold differ`);
  }
  // and every hearthfire on a Thareia map has one
  for (const m of Object.values(MAPS)) if (m.id.startsWith('th-') || m.id === 'bogmire-docks') for (const e of m.entities) {
    if (e.kind === 'hearthfire') assert.ok(HEARTH_LOOKS[e.id], `${m.id}/${e.id} has a look`);
  }
});
