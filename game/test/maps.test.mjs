// Map data tests (M3 spec §2, §4.2, §6.1 WP3) over all 14 maps. Owner: WP3.
// Shape, bounds, exits, anchors, placements and locks, then the flood fills: every CRITICAL_PATH
// target is reachable with only the guaranteed keys (per starter), every chest with all keys, every
// hard lock and story gate really is the only way through to what it guards. The flood fills run
// through the engine (rules/world.js canWalk / present / lockStatus / interact) on synthetic games.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, MAP_IDS, ENTITY_OF, anchor, v1Anchor } from '../src/data/maps/index.js';
import { LEGEND } from '../src/data/tiles.js';
import { LOCKS } from '../src/data/locks.js';
import { RELICS } from '../src/data/relics.js';
import { DOMAINS } from '../src/data/domains.js';
import { STARTERS } from '../src/data/heroes.js';
import { ENCOUNTERS, GAUNTLET, PATROLS } from '../src/data/encounters.js';
import { HEARTHS, START_AT, CRITICAL_PATH, LEADS, ZONES, REGIONS, LORE } from '../src/data/world.js';
import { newGame } from '../src/rules/gauntlet.js';
import { levelUp } from '../src/rules/progression.js';
import { createRng } from '../src/core/rng.js';
import { canWalk, present, lockStatus, interact, roamMask } from '../src/rules/world.js';
import { check } from '../src/rules/cond.js';

const inside = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
const solidTile = (m, x, y) => LEGEND[m.rows[y][x]].solid;
const covers = (e, x, y) => { const [x0, y0, x1, y1] = areaOf(e); return x >= x0 && x <= x1 && y >= y0 && y <= y1; };
const cellsOf = e => { const [x0, y0, x1, y1] = areaOf(e), out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]); return out; };
const DIRS = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const entities = () => Object.values(MAPS).flatMap(m => m.entities.map(e => ({ map: m.id, e })));

test('25 maps (14 in the Wilds, 10 in the Sunscorch, and the reliquary\'s Gallery); every row is w characters from the legend; entities and exits are in bounds', () => {
  assert.equal(MAP_IDS.length, 25);
  assert.ok(MAPS['keep-gallery'], 'the Sunscorch Gallery');
  assert.equal(MAP_IDS.filter(id => MAPS[id].region === 'sunscorch').length, 10);
  for (const m of Object.values(MAPS)) {
    assert.equal(m.rows.length, m.h, `${m.id} height`);
    m.rows.forEach((r, y) => {
      assert.equal(r.length, m.w, `${m.id} row ${y} width`);
      for (const ch of r) assert.ok(LEGEND[ch], `${m.id} row ${y}: '${ch}' is not in the legend`);
    });
    for (const e of [...m.entities, ...m.exits]) {
      const [x0, y0, x1, y1] = areaOf(e);
      assert.ok(inside(m, x0, y0) && inside(m, x1, y1) && x0 <= x1 && y0 <= y1, `${m.id}/${e.id} in bounds`);
    }
    assert.ok(Object.isFrozen(m) && Object.isFrozen(m.rows), `${m.id} is frozen`);
  }
});

test('exits pair up both ways and land on walkable anchors; 5 sealed exits', () => {
  let sealed = 0;
  for (const m of Object.values(MAPS)) {
    for (const x of m.exits) {
      for (let yy = x.area[1]; yy <= x.area[3]; yy++) for (let xx = x.area[0]; xx <= x.area[2]; xx++) assert.ok(!solidTile(m, xx, yy), `${m.id}/${x.id} exit tile walkable`);
      if (x.sealed) { sealed++; assert.ok(REGIONS[x.sealed.region] && x.sealed.text, x.id); continue; }
      const a = anchor(x.to, x.anchor);
      assert.ok(a, `${m.id}/${x.id} -> ${x.to}:${x.anchor}`);
      assert.ok(!solidTile(MAPS[x.to], a.x, a.y), `${x.to}:${x.anchor} walkable`);
      assert.ok(MAPS[x.to].exits.some(b => b.to === m.id), `${x.to} has a way back to ${m.id}`);
    }
    for (const [name, [ax, ay, face]] of Object.entries(m.anchors)) {
      assert.ok(inside(m, ax, ay) && !solidTile(m, ax, ay), `${m.id}:${name} walkable`);
      assert.ok(['n', 'e', 's', 'w'].includes(face), `${m.id}:${name} face`);
      const on = m.entities.find(e => e.kind !== 'trigger' && e.kind !== 'light' && !(e.kind === 'encounter' && e.mode === 'pack') && (([x0, y0, x1, y1]) => ax >= x0 && ax <= x1 && ay >= y0 && ay <= y1)(areaOf(e)));
      assert.ok(!on, `${m.id}:${name} is not under ${on?.id}`);
    }
  }
  assert.equal(sealed, 5);
});

test('every exit pairs with an exit on the far map whose anchor is where the first one leads back', () => {
  // A exit to B lands on anchor `from-A`-style names; B must have an exit back to A, and that exit's
  // anchor must exist on A. Both directions are checked for every pair of linked maps.
  for (const m of Object.values(MAPS)) {
    for (const x of m.exits.filter(e => !e.sealed)) {
      const back = MAPS[x.to].exits.filter(b => b.to === m.id);
      assert.ok(back.length, `${x.to} leads back to ${m.id}`);
      for (const b of back) assert.ok(anchor(m.id, b.anchor), `${x.to}/${b.id} lands on ${m.id}:${b.anchor}`);
    }
  }
});

test('entities stand on walkable ground; every lock and gate tile is walkable once it opens', () => {
  const bad = [];
  for (const m of Object.values(MAPS)) {
    for (const e of m.entities) {
      if (e.kind === 'trigger' || e.kind === 'light') continue;
      const [x, y] = e.at || areaOf(e);
      if (solidTile(m, x, y)) bad.push(`${m.id}/${e.id} stands on '${m.rows[y][x]}' at (${x},${y})`);
      if (e.kind === 'lock' || e.kind === 'gate') for (const [cx, cy] of cellsOf(e)) if (solidTile(m, cx, cy)) bad.push(`${m.id}/${e.id} covers solid '${m.rows[cy][cx]}' at (${cx},${cy}), so it can never open`);
    }
  }
  assert.deepEqual(bad, []);
});

test('no solid entity stands on an exit tile (move() would take the exit, canWalk would not)', () => {
  for (const m of Object.values(MAPS)) {
    for (const x of m.exits) {
      for (const [cx, cy] of cellsOf(x)) {
        const on = m.entities.find(e => !['trigger', 'light', 'gate'].includes(e.kind) && !(e.kind === 'encounter' && e.mode === 'pack') && covers(e, cx, cy));
        assert.ok(!on, `${m.id}/${x.id} (${cx},${cy}) is covered by ${on?.id}`);
      }
    }
  }
});

test('every v1: anchor exists for the 14 Gauntlet nodes; START_AT and every Hearthfire stand are walkable', () => {
  for (const id of GAUNTLET) {
    const a = v1Anchor(id);
    assert.ok(a, `v1:${id}`);
    assert.ok(!solidTile(MAPS[a.map], a.x, a.y), `v1:${id} walkable`);
  }
  assert.ok(!solidTile(MAPS[START_AT.map], START_AT.x, START_AT.y));
  for (const [id, h] of Object.entries(HEARTHS)) {
    assert.ok(!solidTile(MAPS[h.map], h.x, h.y), `${id} stand`);
    const e = ENTITY_OF[id];
    assert.equal(e.map, h.map, `${id} sits on ${h.map}`);
    assert.deepEqual(e.entity.stand.slice(0, 2), [h.x, h.y], `${id} stand matches HEARTHS`);
  }
});

test('every ENCOUNTERS fight and Hearthfire is placed exactly once', () => {
  const count = {};
  for (const m of Object.values(MAPS)) for (const e of m.entities) if (e.kind === 'encounter' || e.kind === 'hearthfire') {
    count[e.id] = (count[e.id] || 0) + 1;
    if (e.kind === 'encounter') assert.equal(e.enc, e.id, `${m.id}/${e.id} id equals enc`);
  }
  for (const id of Object.keys(ENCOUNTERS)) assert.equal(count[id], 1, `${id} placed once`);
  for (const id of Object.keys(count)) assert.ok(ENCOUNTERS[id], `${id} is an encounter`);
});

test('locks: every lock type has a power key and a Domain key; every placed lock names a type', () => {
  const powers = new Set(Object.values(RELICS).map(r => r.mapPower?.id).filter(Boolean));
  for (const L of Object.values(LOCKS)) {
    assert.ok(L.powers.length >= 1 && L.powers.every(p => powers.has(p)), `${L.id} power keys`);
    assert.ok(DOMAINS[L.domain.id] && L.domain.level > 0, `${L.id} Domain key`);
  }
  const ids = new Set();
  for (const m of Object.values(MAPS)) for (const e of m.entities) {
    if (e.kind === 'lock') assert.ok(LOCKS[e.lock], `${m.id}/${e.id}`);
    if (e.kind === 'chest' && e.lock) assert.ok(LOCKS[e.lock], `${m.id}/${e.id}`);
    if (['lock', 'gate', 'chest', 'trigger'].includes(e.kind)) { assert.ok(!ids.has(e.id), `${e.id} unique`); ids.add(e.id); }
  }
});

test('world tables: the critical path, leads and zones name real things', () => {
  for (const id of CRITICAL_PATH) assert.ok(ENCOUNTERS[id], id);
  for (const list of Object.values(LEADS)) for (const id of list) assert.ok(ENCOUNTERS[id], id);
  for (const z of Object.values(ZONES)) assert.ok(PATROLS[z.sets], z.id);
  for (const m of Object.values(MAPS)) if (m.zone) assert.ok(ZONES[m.zone], `${m.id} zone`);
});

test('world tables agree with the maps: the 17 Hearthfires, the 17 places, the regions and their sealed entries', () => {
  const inView = ([x, y]) => x >= 0 && x <= 1200 && y >= 0 && y <= 800;
  const fires = Object.keys(ENCOUNTERS).filter(id => ENCOUNTERS[id].type === 'hearthfire');
  assert.deepEqual(Object.keys(HEARTHS).sort(), fires.sort(), 'HEARTHS covers every Hearthfire');
  assert.equal(fires.length, 17);
  assert.equal(fires.filter(id => ENCOUNTERS[id].region === 'sunscorch').length, 7, 'seven in the Sunscorch (M4 spec §2.5)');
  for (const [id, h] of Object.entries(HEARTHS)) {
    const e = ENTITY_OF[id].entity;
    assert.equal(h.name, ENCOUNTERS[id].name, `${id} name`);
    assert.equal(h.cold, !!e.cold, `${id} cold`);
    assert.equal(h.face, e.stand[2], `${id} face`);
    assert.ok(inView(h.lore), `${id} lore point`);
  }
  assert.equal(Object.keys(LORE).length, 17);
  for (const [id, p] of Object.entries(LORE)) {
    assert.ok(p.name && p.kind && inView(p.at), `LORE.${id}`);
    assert.ok(p.map === null || MAPS[p.map], `LORE.${id}.map`);
    assert.ok(p.region === null || REGIONS[p.region], `LORE.${id}.region`);
  }
  const sealed = Object.values(MAPS).flatMap(m => m.exits.filter(x => x.sealed));
  for (const r of Object.values(REGIONS)) {
    assert.ok(inView(r.lore), `${r.id} lore`);
    for (const id of r.entries || []) assert.equal(sealed.find(x => x.id === id)?.sealed.region, r.id, `${id} is a sealed entry to ${r.id}`);
  }
  for (const x of sealed) assert.ok(REGIONS[x.sealed.region].entries.includes(x.id), `${x.id} is listed in REGIONS.${x.sealed.region}.entries`);
  for (const m of Object.values(MAPS)) for (const [lx, ly, tx, ty] of m.lore) assert.ok(inView([lx, ly]) && inside(m, tx, ty), `${m.id} lore`);
});

test('the reliquary: a pedestal per relic in codex order, Page I on rows 10 and 12 of the Great Hall, Page II on rows 2 and 5 of the Gallery', () => {
  const byCodex = Object.values(RELICS).sort((a, b) => a.codex - b.codex).map(r => r.id);
  const room = (mapId, ys, from, to) => {
    const peds = MAPS[mapId].entities.filter(e => e.kind === 'pedestal');
    const want = byCodex.filter(id => RELICS[id].codex >= from && RELICS[id].codex <= to);
    assert.equal(peds.length, want.length, `${mapId} pedestals`);
    assert.deepEqual(new Set(peds.map(p => p.relic)), new Set(want));
    for (const p of peds) assert.equal(p.id, `pedestal-${p.relic}`);
    const order = ys.flatMap(y => peds.filter(p => p.at[1] === y).sort((a, b) => a.at[0] - b.at[0]).map(p => p.relic));
    assert.deepEqual(order, want, `${mapId}: row by row, west to east, in codex order`);
  };
  room('keep-hall', [10, 12], 1, 24);
  room('keep-gallery', [2, 5], 25, 38);
  assert.equal(byCodex.length, 38);
});

test('pack homes are walkable, roamable, off the exits and inside a roam rect', () => {
  for (const { map, e } of entities()) {
    if (e.kind !== 'encounter' || e.mode !== 'pack') continue;
    const m = MAPS[map], [x, y] = e.at;
    assert.ok(!solidTile(m, x, y), `${map}/${e.id} home is walkable`);
    assert.equal(roamMask(m)[y * m.w + x], 1, `${map}/${e.id} home is roamable (not a door, stair, entity tile or 1-wide corridor)`);
    assert.ok(!m.exits.some(x2 => covers(x2, x, y)), `${map}/${e.id} home is not an exit`);
    assert.ok((m.roam?.rects || []).some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1), `${map}/${e.id} home is inside a roam rect`);
  }
  for (const m of Object.values(MAPS)) {
    if (!m.roam) continue;
    const mask = roamMask(m);
    for (const r of m.roam.rects) {
      const [x0, y0, x1, y1] = r;
      assert.ok(inside(m, x0, y0) && inside(m, x1, y1), `${m.id} roam rect [${r}] in bounds`);
      let open = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) open += mask[y * m.w + x];
      assert.ok(open >= 24, `${m.id} roam rect [${r}] is roomy (${open} roamable tiles)`);
    }
  }
});

test('rest works from every Hearthfire stand: facing the fire from its stand reaches it', () => {
  const game = newGame({ name: 'Map', starter: 'hearthbrand', seed: 3 });
  const bad = [];
  for (const { map, e } of entities()) {
    if (e.kind !== 'hearthfire') continue;
    const [sx, sy, face] = e.stand;
    const walk = { map, visit: 1, x: sx, y: sy, face, tick: 0, rng: 1, grace: 0, gone: {}, roamers: [] };
    if (!canWalk(game, map, sx, sy)) { bad.push(`${map}/${e.id}: stand (${sx},${sy}) is not walkable`); continue; }
    const ev = interact(game, walk).events[0];
    if (!(ev && (ev.t === 'hearthfire' || ev.t === 'lock') && ev.id === e.id)) bad.push(`${map}/${e.id}: facing ${face} from (${sx},${sy}) reaches ${ev ? JSON.stringify(ev) : 'nothing'} (fire at ${e.at})`);
  }
  assert.deepEqual(bad, []);
});

// ---- flood fills -----------------------------------------------------------------------------------

const LV = createRng('maps-test');
// Every active hero at the given level (a number, or { warden, others }), Domains by the real level-up.
function setLevels(g, lv) {
  for (const id of g.party.active) {
    const want = typeof lv === 'number' ? lv : (id === 'warden' ? lv.warden : lv.others);
    let h = g.party.roster[id];
    while (h.level < want) h = levelUp(h, LV).hero;
    g.party.roster[id] = h;
  }
}

// The flow's bookkeeping for a win (spec §4.6), a Tamsin yield, a rest, and the Brand's re-arm.
function beat(g, id) {
  const e = ENCOUNTERS[id], f = g.progress.flags;
  if (e.type === 'hearthfire') { f.kindled[id] = true; return; }
  if (e.duel) { f.story[e.yields || 'tamsin-yielded'] = true; return; } // a yield: she stays, the door opens
  f.cleared[id] = true; f.beaten[id] = (f.beaten[id] || 0) + 1;
  if (e.once) f.done[id] = true;
  if (e.opens) f.unlocked[e.opens] = true;
  if (e.brand && !g.progress.brands.includes(e.brand)) {
    g.progress.brands.push(e.brand);
    g.progress.waking += 1;
    for (const [k, x] of Object.entries(ENCOUNTERS)) if ((x.region || 'verdant') === 'verdant' && !x.once) delete f.cleared[k];
  }
}

// Open every lock whose key the party holds (you open it when you get there).
function openHeldLocks(g, except = null) {
  for (const { e } of entities()) if (e.kind === 'lock' && e.id !== except && lockStatus(g, e.lock).open) g.progress.flags.unlocked[e.id] = true;
  return g;
}

// Flood fill from START_AT over every map through canWalk; exits are portals, sealed exits dead ends.
// An exit's `unlock` (the rope kicked down behind you) applies once the fill has used it.
function flood(game, { noUnlock = null } = {}) {
  let g = game;
  for (;;) {
    const seen = new Set([`${START_AT.map}:${START_AT.x},${START_AT.y}`]);
    const q = [[START_AT.map, START_AT.x, START_AT.y]];
    const used = new Set(), unlocks = [];
    while (q.length) {
      const [mid, x, y] = q.pop();
      const m = MAPS[mid];
      for (const [d, [dx, dy]] of Object.entries(DIRS)) {
        const nx = x + dx, ny = y + dy;
        if (!canWalk(g, mid, nx, ny, { dir: d })) continue;
        const ex = m.exits.find(e => covers(e, nx, ny));
        let to = [mid, nx, ny];
        if (ex) {
          // M4: a gated exit is a way through once its gate holds (rules/world.js move)
          if (ex.sealed && !(ex.to && ex.gate && check(g, ex.gate))) continue;
          used.add(ex.id);
          if (ex.unlock && ex.unlock !== noUnlock && !g.progress.flags.unlocked[ex.unlock]) unlocks.push(ex.unlock);
          const a = anchor(ex.to, ex.anchor);
          to = [a.map, a.x, a.y];
        }
        const k = `${to[0]}:${to[1]},${to[2]}`;
        if (!seen.has(k)) { seen.add(k); q.push(to); }
      }
    }
    if (!unlocks.length) return { game: g, seen, used, has: (map, x, y) => seen.has(`${map}:${x},${y}`) };
    g = structuredClone(g);
    for (const u of unlocks) g.progress.flags.unlocked[u] = true;
  }
}

// Is an entity reached? Blocks, lairs and other solid things: from a walkable neighbour of their area.
// Packs: at their home. Hearthfires: at their stand.
// A block or lair also counts as reached at a closed gate it guards (the gate event offers its fight,
// spec §4.5: Skarn stands behind his chain).
const touches = (r, map, e) => cellsOf(e).some(([x, y]) => r.has(map, x, y) || Object.values(DIRS).some(([dx, dy]) => r.has(map, x + dx, y + dy)));
function reaches(r, map, e) {
  if (e.kind === 'hearthfire') return r.has(map, e.stand[0], e.stand[1]);
  if (e.kind === 'encounter' && e.mode === 'pack') return r.has(map, e.at[0], e.at[1]);
  if (touches(r, map, e)) return true;
  return e.kind === 'encounter' && MAPS[map].entities.some(g => g.kind === 'gate' && g.guard === e.enc && touches(r, map, g));
}

const CP = CRITICAL_PATH;
const at = id => CP.indexOf(id);
// Worst-case levels (spec §6.1): L1 at the start, L4 at Thornhollow, Warden L5 at the thornwall,
// L7 at the den, L8 after the Brand.
function levelsFor(i) {
  if (i > at('briarmaw-den')) return 8;
  if (i === at('briarmaw-den')) return 7;
  if (i > at('snag-wallow')) return { warden: 5, others: 4 };
  if (i > at('thornhollow')) return 4;
  return 1;
}

function stageGame(starter, i) {
  const g = structuredClone(newGame({ name: 'Map', starter, seed: 11 }));
  setLevels(g, levelsFor(i));
  for (let j = 0; j < i; j++) beat(g, CP[j]);
  return openHeldLocks(g);
}

for (const starter of Object.keys(STARTERS)) {
  test(`reachability (${starter}): every CRITICAL_PATH target, with only the starter relic and the worst-case levels`, () => {
    for (let i = 0; i < CP.length; i++) {
      const g = stageGame(starter, i);
      const hit = ENTITY_OF[CP[i]];
      assert.ok(hit, `${CP[i]} is placed`);
      const live = present(g, hit.map).find(e => e.id === hit.entity.id);
      assert.ok(live, `${CP[i]} is present when it is next (stage ${i})`);
      const r = flood(g);
      assert.ok(reaches(r, hit.map, hit.entity), `${CP[i]} (${hit.map}) is reachable at stage ${i} (levels ${JSON.stringify(levelsFor(i))})`);
    }
  });
}

// Everything held: level 20, every relic, every fight won. `brand` adds both Brands and the yield.
function allKeys({ brand }) {
  const g = structuredClone(newGame({ name: 'Map', starter: 'hearthbrand', seed: 11 }));
  setLevels(g, 20);
  for (const id of Object.keys(RELICS)) if (!g.inventory.some(i => i.base === id)) g.inventory.push({ uid: `map-${id}`, base: id, kind: RELICS[id].kind, slot: RELICS[id].slot });
  const f = g.progress.flags;
  for (const [id, e] of Object.entries(ENCOUNTERS)) {
    if (e.type === 'hearthfire') { f.kindled[id] = true; continue; }
    if (e.duel) continue;
    f.cleared[id] = true; f.beaten[id] = 1; if (e.once) f.done[id] = true; if (e.opens) f.unlocked[e.opens] = true;
  }
  Object.assign(f.story, { 'rangers-home': true, 'bell-rung': true, 'intro-done': true });
  if (brand) {
    g.progress.brands = ['brand-of-briars', 'brand-of-the-heartroot'];
    g.progress.waking = 2;
    f.story[ENCOUNTERS['tamsin-duel'].yields || 'tamsin-yielded'] = true;
    f.story['act1-complete'] = true;
  }
  return g;
}

test('every chest is reachable with all keys', () => {
  const r = flood(openHeldLocks(allKeys({ brand: true })));
  for (const { map, e } of entities()) {
    if (e.kind !== 'chest') continue;
    assert.ok(reaches(r, map, e), `${map}/${e.id} can be reached`);
    if (e.lock) assert.ok(lockStatus(r.game, e.lock).open, `${e.id}'s own ${e.lock} opens with all keys`);
  }
});

// What a flood fill touches: every entity it reaches, every exit it uses, every map it enters.
function things(r) {
  const out = new Set(r.used);
  for (const m of MAP_IDS) if ([...r.seen].some(k => k.startsWith(`${m}:`))) out.add(`map:${m}`);
  for (const { map, e } of entities()) if (e.kind !== 'trigger' && e.kind !== 'light' && reaches(r, map, e)) out.add(e.id);
  return out;
}

test('every hard lock is the only way through to something (a chest, an encounter, an exit or a map)', () => {
  const pre = openHeldLocks(allKeys({ brand: false })), post = openHeldLocks(allKeys({ brand: true }));
  const preSeen = flood(pre), postSeen = flood(post);
  const bad = [];
  for (const { map, e } of entities()) {
    if (e.kind !== 'lock' || LOCKS[e.lock].soft) continue;
    // the earliest story state in which the lock's map can be reached
    const base = [...preSeen.seen].some(k => k.startsWith(`${map}:`)) ? pre : [...postSeen.seen].some(k => k.startsWith(`${map}:`)) ? post : null;
    if (!base) { bad.push(`${map}/${e.id}: its map is never reachable`); continue; }
    const shut = structuredClone(base);
    delete shut.progress.flags.unlocked[e.id];
    // an exit that opens this very lock from the far side (the rope kicked down) is its design, not a way round
    const open = things(flood(base, { noUnlock: e.id })), closed = things(flood(shut, { noUnlock: e.id }));
    const cut = [...open].filter(t => !closed.has(t) && t !== e.id);
    if (!cut.length) bad.push(`${map}/${e.id} (${e.lock}) guards nothing: there is a way round it`);
  }
  assert.deepEqual(bad, []);
});

test('story gates: the north gate, the toll chain, the crownwalls and the Eldest Tree door hold', () => {
  const open = allKeys({ brand: true });
  const mapsOf = r => new Set([...r.seen].map(k => k.split(':')[0]));
  // Before the vault fight the Keep's north gate keeps you on the island.
  {
    const g = openHeldLocks(structuredClone(open));
    for (const k of Object.keys(g.progress.flags.done)) delete g.progress.flags.done[k];
    for (const k of Object.keys(g.progress.flags.cleared)) delete g.progress.flags.cleared[k];
    for (const k of Object.keys(g.progress.flags.beaten)) delete g.progress.flags.beaten[k];
    delete g.progress.flags.story['act1-complete']; // before the vault fight there is no Act I to have finished
    assert.deepEqual([...mapsOf(flood(g))].sort(), ['keep', 'keep-gallery', 'keep-hall'], 'keep-n-gate holds until keep-vault is done');
  }
  // Until Skarn is beaten, his chain closes the road: Thornhollow and the Smugglers' Hollow are out of reach.
  {
    const g = structuredClone(open);
    delete g.progress.flags.unlocked['bramble-toll-chain'];
    const r = flood(openHeldLocks(g));
    assert.ok(!mapsOf(r).has('thornhollow'), 'bramble-toll-chain holds');
    assert.ok(!reaches(r, 'hearth-road', MAPS['hearth-road'].entities.find(e => e.id === 'hr-smugglers')), 'the Smugglers\' Hollow is past the toll');
    assert.ok(reaches(r, 'hearth-road', MAPS['hearth-road'].entities.find(e => e.id === 'bramble-toll-chain')), 'the chain itself is reachable from the south');
  }
  // Before the Brand the crownwalls seal every lead map.
  {
    const r = flood(openHeldLocks(allKeys({ brand: false })));
    const seen = mapsOf(r);
    for (const id of ['mossfall', 'mosswatch-1', 'mosswatch-2', 'hindwood', 'fawnrest', 'eldergrove', 'heartroot-1', 'heartroot-2']) assert.ok(!seen.has(id), `${id} is sealed until the Brand`);
    for (const id of ['keep', 'keep-hall', 'hearth-road', 'thornhollow', 'thornway', 'briarmaw-den']) assert.ok(seen.has(id), `${id} is open before the Brand`);
  }
  // After the Brand, before the duel or a yield, the Eldest Tree door keeps the Heartroot shut.
  {
    const g = structuredClone(open);
    delete g.progress.flags.story[ENCOUNTERS['tamsin-duel'].yields || 'tamsin-yielded'];
    const seen = mapsOf(flood(openHeldLocks(g)));
    assert.ok(seen.has('eldergrove') && !seen.has('heartroot-1') && !seen.has('heartroot-2'), 'eldest-door holds until the duel or a yield');
  }
});
