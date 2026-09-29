// Map data tests (M3 spec §2, §4.2, §6.1 WP3; M4 spec §2, §8) over all 25 maps. Owner: WP3; M4 P2.
// Shape, bounds, exits, anchors, placements and locks, then the flood fills: every CRITICAL_PATH
// target is reachable with only the guaranteed keys (per starter), every chest with all keys, every
// hard lock and story gate really is the only way through to what it guards. The flood fills run
// through the engine (rules/world.js canWalk / present / lockStatus / interact) on synthetic games.
// M4: the Sunscorch opens through the Keep's south-east gate after Act I and not before, every SUN_PATH
// target is reachable from an Act-I-complete party with only its starter relic, no hard lock but the
// Vault door stands on that path, the re-armed fights never shut the way home, and the maps hold what
// spec §2.3 puts on them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, MAP_IDS, ENTITY_OF, anchor, v1Anchor } from '../src/data/maps/index.js';
import { LEGEND } from '../src/data/tiles.js';
import { LOCKS } from '../src/data/locks.js';
import { RELICS } from '../src/data/relics.js';
import { DOMAINS } from '../src/data/domains.js';
import { STARTERS } from '../src/data/heroes.js';
import { ENCOUNTERS, GAUNTLET, PATROLS, BRANDS } from '../src/data/encounters.js';
import { HEARTHS, START_AT, CRITICAL_PATH, LEADS, ZONES, REGIONS, LORE, SUN_PATH, SUN_LEADS } from '../src/data/world.js';
import { GEMS, MATERIALS } from '../src/data/gems.js';
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

test('37 maps (14 in the Wilds, 10 in the Sunscorch, 11 in the Ironspire, and the reliquary\'s two Galleries); every row is w characters from the legend; entities and exits are in bounds', () => {
  assert.equal(MAP_IDS.length, 37);
  assert.ok(MAPS['keep-gallery'], 'the Sunscorch Gallery');
  assert.ok(MAPS['keep-gallery-2'], 'the Ironspire Gallery');
  assert.equal(MAP_IDS.filter(id => MAPS[id].region === 'sunscorch').length, 10);
  assert.equal(MAP_IDS.filter(id => MAPS[id].region === 'ironspire').length, 11);
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

test('exits pair up both ways and land on walkable anchors; 2 sealed exits and 6 gated ones', () => {
  let sealed = 0;
  const gated = [];
  for (const m of Object.values(MAPS)) {
    for (const x of m.exits) {
      for (let yy = x.area[1]; yy <= x.area[3]; yy++) for (let xx = x.area[0]; xx <= x.area[2]; xx++) assert.ok(!solidTile(m, xx, yy), `${m.id}/${x.id} exit tile walkable`);
      if (x.sealed) assert.ok(REGIONS[x.sealed.region] && x.sealed.text, x.id);
      if (x.sealed && !x.to) { sealed++; continue; }
      // a gated exit (M4: the Keep's south-east gate; M4.5: Sandspire's east gate; M5: the Keep's east postern,
      // Fawnrest's scree path, Peak's Veil's Highfold gate and Stormwatch's north gate) is a real way through
      // once its gate holds, so it pairs up like any other
      if (x.sealed) { assert.ok(x.gate, `${m.id}/${x.id} leads somewhere, so it has a gate`); gated.push(x.id); }
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
  assert.equal(sealed, 2, 'the two ways into the Gloomfen');
  assert.deepEqual(gated.sort(), ['fr-highfold', 'keep-e', 'keep-se', 'pv-w', 'ss-e', 'sw-n']);
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

test('world tables agree with the maps: the 24 Hearthfires, the 17 places, the regions and their sealed entries', () => {
  const inView = ([x, y]) => x >= 0 && x <= 1200 && y >= 0 && y <= 800;
  const fires = Object.keys(ENCOUNTERS).filter(id => ENCOUNTERS[id].type === 'hearthfire');
  assert.deepEqual(Object.keys(HEARTHS).sort(), fires.sort(), 'HEARTHS covers every Hearthfire');
  assert.equal(fires.length, 24);
  assert.equal(fires.filter(id => ENCOUNTERS[id].region === 'sunscorch').length, 7, 'seven in the Sunscorch (M4 spec §2.5)');
  assert.equal(fires.filter(id => ENCOUNTERS[id].region === 'ironspire').length, 7, 'seven in the Ironspire (M5 spec §2.5)');
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
  const sealed = Object.values(MAPS).flatMap(m => m.exits.filter(x => x.sealed).map(x => ({ ...x, from: m.region })));
  for (const r of Object.values(REGIONS)) {
    assert.ok(inView(r.lore), `${r.id} lore`);
    for (const id of r.entries || []) assert.equal(sealed.find(x => x.id === id)?.sealed.region, r.id, `${id} is a sealed entry to ${r.id}`);
  }
  // every sealed way into a region is one of its entries; a gate inside a region (M4.5: Sandspire's east
  // gate, shut until the Brand of Glass) is not a way into it
  for (const x of sealed) {
    if (x.from === x.sealed.region) { assert.ok(x.gate && x.to && MAPS[x.to].region === x.from, `${x.id} is a gate inside ${x.from}`); continue; }
    assert.ok(REGIONS[x.sealed.region].entries.includes(x.id), `${x.id} is listed in REGIONS.${x.sealed.region}.entries`);
  }
  for (const m of Object.values(MAPS)) for (const [lx, ly, tx, ty] of m.lore) assert.ok(inView([lx, ly]) && inside(m, tx, ty), `${m.id} lore`);
});

test('the reliquary: a pedestal per relic in codex order, Page I on rows 10 and 12 of the Great Hall, Pages II and III on rows 2 and 5 of their Galleries', () => {
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
  room('keep-gallery-2', [2, 5], 39, 52);
  assert.equal(byCodex.length, 52);
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
    // as gauntlet.earnBrand: the Waking rises and every non-`once` fight of the Brand's region re-arms
    g.progress.brands.push(e.brand);
    g.progress.waking += 1;
    const region = BRANDS[e.brand].region;
    for (const [k, x] of Object.entries(ENCOUNTERS)) if ((x.region || 'verdant') === region && !x.once) delete f.cleared[k];
    if (REGIONS.verdant.brands.every(b => g.progress.brands.includes(b))) f.story['act1-complete'] = true;
    if (REGIONS.sunscorch.brands.every(b => g.progress.brands.includes(b))) f.story['sunscorch-complete'] = true;
  }
}

// Open every lock whose key the party holds (you open it when you get there).
function openHeldLocks(g, except = null) {
  for (const { e } of entities()) if (e.kind === 'lock' && e.id !== except && lockStatus(g, e.lock).open) g.progress.flags.unlocked[e.id] = true;
  return g;
}

// Flood fill from START_AT (or `from`: [map, x, y]) over every map through canWalk; exits are portals,
// sealed exits dead ends. An exit's `unlock` (the rope kicked down behind you) applies once the fill
// has used it.
function flood(game, { noUnlock = null, from = [START_AT.map, START_AT.x, START_AT.y] } = {}) {
  let g = game;
  for (;;) {
    const seen = new Set([`${from[0]}:${from[1]},${from[2]}`]);
    const q = [[...from]];
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

// Everything held: level 20, every relic, every fight won. `brand` adds every Brand so far (the Verdant
// pair, then, M4.5, the Sunscorch pair, which opens Sandspire's east gate; M5, the Ironspire pair and the
// flags of the Ironspire's gates) and every duel's yield.
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
    g.progress.brands = ['brand-of-briars', 'brand-of-the-heartroot', 'brand-of-glass', 'brand-of-ash', 'brand-of-iron', 'brand-of-frost'];
    g.progress.waking = 6;
    for (const e of Object.values(ENCOUNTERS)) if (e.duel) f.story[e.yields || 'tamsin-yielded'] = true;
    f.story['act1-complete'] = true;
    // M5: the second council opens the Keep's east postern; the monks open the Highfold
    Object.assign(f.story, { 'sunscorch-complete': true, 'council-2-done': true, 'highfold-open': true });
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

// the story flags of Act I's end and after (M5: the second council opens the Keep's east postern, and the
// monks the Highfold path down to Fawnrest)
const LATER = ['act1-complete', 'sunscorch-complete', 'council-2-done', 'highfold-open'];

test('story gates: the north gate, the toll chain, the crownwalls and the Eldest Tree door hold', () => {
  const open = allKeys({ brand: true });
  const mapsOf = r => new Set([...r.seen].map(k => k.split(':')[0]));
  // Before the vault fight the Keep's north gate keeps you on the island.
  {
    const g = openHeldLocks(structuredClone(open));
    for (const k of Object.keys(g.progress.flags.done)) delete g.progress.flags.done[k];
    for (const k of Object.keys(g.progress.flags.cleared)) delete g.progress.flags.cleared[k];
    for (const k of Object.keys(g.progress.flags.beaten)) delete g.progress.flags.beaten[k];
    // before the vault fight there is no Act I to have finished, and so no council after it (M5: the second
    // council opens the Keep's east postern)
    for (const k of LATER) delete g.progress.flags.story[k];
    assert.deepEqual([...mapsOf(flood(g))].sort(), ['keep', 'keep-gallery', 'keep-gallery-2', 'keep-hall'], 'keep-n-gate holds until keep-vault is done');
  }
  // Until Skarn is beaten, his chain closes the road: Thornhollow and the Smugglers' Hollow are out of reach.
  // (Skarn is on the road to Act I, so nothing after it has happened either: M5's Highfold path is a back
  // way into the Wilds from the Ironspire, which opens only after the second council.)
  {
    const g = structuredClone(open);
    delete g.progress.flags.unlocked['bramble-toll-chain'];
    for (const k of LATER) delete g.progress.flags.story[k];
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

// ---- M4: the Sunscorch Wastes (spec §2, §8) ------------------------------------------------------------

const SP = SUN_PATH;
const SUN = MAP_IDS.filter(id => MAPS[id].region === 'sunscorch');
const mapsOf = r => new Set([...r.seen].map(k => k.split(':')[0]));
const nextTo = (g, map, e) => cellsOf(e).flatMap(([x, y]) => Object.values(DIRS).map(([dx, dy]) => [x + dx, y + dy])).find(([x, y]) => canWalk(g, map, x, y));

// An Act-I-complete party (spec §2.2, §8): the whole M3 critical path behind it (both Verdant Brands, the
// Waking at 2, act1-complete), at level 8, the worst case the M3 tests allow once the Brand is won
// (nothing says it has levelled since), with only its starter relic. Then the first i SUN_PATH targets
// are beaten (a Sunscorch Brand re-arms the region, as the rules do); `keys` opens every lock whose key
// the party holds.
function sunStage(starter, i, { keys = true } = {}) {
  const g = structuredClone(newGame({ name: 'Map', starter, seed: 11 }));
  setLevels(g, 8);
  for (const id of CP) beat(g, id);
  for (let j = 0; j < i; j++) beat(g, SP[j]);
  return keys ? openHeldLocks(g) : g;
}

test('the Sunscorch opens through the Keep\'s south-east gate once Act I is done, and not before', () => {
  const se = MAPS.keep.exits.find(x => x.id === 'keep-se');
  assert.deepEqual(se.gate, { flag: 'act1-complete' });
  assert.equal(se.to, 'sun-road');
  assert.equal(se.sealed.region, 'sunscorch');
  assert.equal(SUN.length, 10);
  const open = openHeldLocks(allKeys({ brand: true }));
  const r = flood(open);
  assert.ok(r.used.has('keep-se'), 'the fill goes through keep-se');
  for (const id of SUN) assert.ok(mapsOf(r).has(id), `${id} is reachable once Act I is done`);
  const shut = structuredClone(open);
  delete shut.progress.flags.story['act1-complete'];
  const seen = mapsOf(flood(shut));
  for (const id of SUN) assert.ok(!seen.has(id), `${id} stays sealed before Act I, even with every key`);
  // keep-se is the only way in: every Sunscorch exit stays in the Sunscorch, but the road home to it
  for (const id of SUN) {
    for (const x of MAPS[id].exits) {
      // M4.5: Sandspire's east gate is sealed until the Brand of Glass, then a way through like the rest
      assert.ok(x.to && (!x.sealed || (x.gate && MAPS[x.to].region === 'sunscorch')), `${id}/${x.id} is a way through`);
      if (MAPS[x.to].region !== 'sunscorch') assert.ok(x.to === 'keep' && id === 'sun-road' && anchor('keep', x.anchor), `${id}/${x.id} leaves the Sunscorch only for the Keep's south-east gate`);
    }
  }
  const home = anchor('keep', 'from-sun-road');
  assert.ok(cellsOf({ area: se.area }).some(([x, y]) => Math.abs(x - home.x) + Math.abs(y - home.y) === 1), 'the road home lands beside keep-se');
});

for (const starter of Object.keys(STARTERS)) {
  test(`reachability (${starter}): every SUN_PATH target from an Act-I-complete party, with only the starter relic at the worst-case level`, () => {
    for (let i = 0; i < SP.length; i++) {
      const g = sunStage(starter, i);
      const hit = ENTITY_OF[SP[i]];
      assert.ok(hit, `${SP[i]} is placed`);
      assert.equal(MAPS[hit.map].region, 'sunscorch', `${SP[i]} is in the Sunscorch`);
      const live = present(g, hit.map).find(e => e.id === hit.entity.id);
      assert.ok(live, `${SP[i]} is present when it is next (stage ${i})`);
      assert.ok(reaches(flood(g), hit.map, hit.entity), `${SP[i]} (${hit.map}) is reachable at stage ${i} (level 8)`);
    }
  });
}

test('no hard lock stands on the Sunscorch path but the Vault door, and the Ash-Captain\'s Scorchgate Key opens it (spec §2.2)', () => {
  const key = SP.indexOf('sg-captain');
  for (let i = 0; i < SP.length; i++) {
    const g = sunStage('cairnmaul', i, { keys: false });            // every hard lock shut
    if (i > key) g.progress.flags.unlocked['sg-vault-door'] = true; // opened with the key the path just won
    const hit = ENTITY_OF[SP[i]];
    assert.ok(reaches(flood(g), hit.map, hit.entity), `${SP[i]} needs no key but the path's own (stage ${i})`);
  }
  // the roads east to Miragewell and south to Scorchgate are open without a key (spec §2.3)
  const r = flood(sunStage('cairnmaul', SP.length, { keys: false }));
  for (const id of ['well-fire', 'last-watchfire']) assert.ok(reaches(r, HEARTHS[id].map, ENTITY_OF[id].entity), `${id} is on an open road`);
  // the key: a new party (Knowledge 1) holding only the Scorchgate Key opens the seal, and the Ash-Captain holds it
  const g = structuredClone(newGame({ name: 'Map', starter: 'cairnmaul', seed: 11 }));
  g.inventory.push({ uid: 'map-key', base: 'scorchgate-key', kind: RELICS['scorchgate-key'].kind, slot: RELICS['scorchgate-key'].slot });
  const st = lockStatus(g, 'vault-seal');
  assert.ok(st.open && st.by === 'scorchgate-key', 'the Scorchgate Key opens the vault seal');
  const holds = s => s.relic === 'scorchgate-key' || s.wears === 'scorchgate-key' || (s.held || []).some(h => h.relic === 'scorchgate-key');
  assert.ok(ENCOUNTERS['sg-captain'].spawns.some(holds), 'sg-captain holds the Scorchgate Key');
});

test('after each Sunscorch Brand, the re-armed fights never shut the way home from the Brand\'s lair', () => {
  for (const id of ['kharzul-heart', 'ashen-warden']) {
    const g = sunStage('hearthbrand', SP.indexOf(id) + 1);          // the Brand is won: the region re-arms
    assert.ok(present(g, 'sun-road').some(e => e.id === 'sr-toll'), `after ${id} Rasa is back at her toll`);
    const hit = ENTITY_OF[id];
    const from = nextTo(g, hit.map, hit.entity);
    assert.ok(from, `${id} can be stood beside`);
    const r = flood(g, { from: [hit.map, ...from] });
    // every fire the party has kindled on the way stays reachable (M4.5: the road still ahead is held by
    // its own gates, so a fire past them is not "home" yet)
    const kindled = ['hearthstone-keep', ...Object.keys(HEARTHS).filter(h => MAPS[HEARTHS[h].map].region === 'sunscorch' && g.progress.flags.kindled[h])];
    assert.ok(kindled.length >= (id === 'kharzul-heart' ? 6 : 7), `after ${id}: ${kindled.join(', ')}`);
    for (const fire of kindled) {
      assert.ok(reaches(r, HEARTHS[fire].map, ENTITY_OF[fire].entity), `after ${id}, ${fire} is still reachable from the lair`);
    }
    // and the re-armed road guards stand beside open gates
    for (const e of present(g, 'sun-road')) if (e.kind === 'gate' && e.guard) assert.equal(e.state, 'open', `after ${id}, ${e.id} stays open`);
  }
});

test('world tables: SUN_PATH is spec §2.2\'s route and SUN_LEADS its leads, each placed once in the Sunscorch and reachable', () => {
  assert.deepEqual([...SP], ['waystone', 'sr-toll', 'spire-hearth', 'dt-scorpions', 'dust-cairn', 'pithead', 'ds-crew', 'shaft-lamp',
    'kharzul-heart', 'gf-raiders', 'last-watchfire', 'sg-captain', 'tamsin-scorchgate', 'vault-guard', 'ashen-warden']);
  assert.deepEqual(JSON.parse(JSON.stringify(SUN_LEADS)), { caravan: ['gf-caravan'], wyrm: ['wyrm-lair'], gnash: ['gnash-camp'], well: ['wisp-queen'], aqueduct: ['dt-aqueduct'] });
  const r = flood(openHeldLocks(allKeys({ brand: true })));
  for (const id of [...SP, ...Object.values(SUN_LEADS).flat()]) {
    assert.ok(ENCOUNTERS[id] && ENCOUNTERS[id].region === 'sunscorch', `${id} is a Sunscorch encounter`);
    assert.equal(MAPS[ENTITY_OF[id].map].region, 'sunscorch', `${id} is placed in the Sunscorch`);
    if (Object.values(SUN_LEADS).flat().includes(id)) assert.ok(reaches(r, ENTITY_OF[id].map, ENTITY_OF[id].entity), `the lead ${id} is reachable with every key`);
  }
  for (const id of Object.keys(ENCOUNTERS).filter(k => ENCOUNTERS[k].region === 'sunscorch')) assert.equal(MAPS[ENTITY_OF[id].map].region, 'sunscorch', `${id} sits on a Sunscorch map`);
});

// What spec §2.3 (with §2.5, §3.1, §3.3) puts on each map: its biome, its Hearthfires (true = cold), its
// fights and their modes, at least this many locks of each type, and its people. M4.5: the route's packs
// (the Dust Trail's scorpions, the Glass Flats' raiders) are road guards now, standing blocks.
const SUN_SPEC = {
  'sun-road': { biome: 'desert', fires: { waystone: false }, fights: { 'sr-skinks': 'pack', 'sr-toll': 'block' }, locks: { 'dune-glass': 1 }, npcs: [] },
  sandspire: { biome: 'desert-town', fires: { 'spire-hearth': false }, fights: {}, locks: { 'barred-gate': 1 }, npcs: ['zara', 'qasim', 'idris', 'spire-guard', 'water-seller'] },
  'dust-trail': { biome: 'canyon', fires: { 'dust-cairn': true }, fights: { 'dt-skinks': 'pack', 'dt-scorpions': 'block', 'dt-aqueduct': 'block', 'wyrm-lair': 'lair' }, locks: { quicksand: 1, boulder: 1 }, npcs: [] },
  dusthaven: { biome: 'mine-camp', fires: { pithead: false }, fights: {}, locks: {}, npcs: ['luma', 'ode', 'miner'] },
  'deep-shaft-1': { biome: 'mine', fires: { 'shaft-lamp': true }, fights: { 'ds-crew': 'block', 'ds-scorpions': 'pack' }, locks: { 'dune-glass': 1 }, npcs: [] },
  'deep-shaft-2': { biome: 'crystal', fires: {}, fights: { 'kharzul-heart': 'lair' }, locks: {}, npcs: [] },
  'glass-flats': { biome: 'dunes', fires: {}, fights: { 'gf-raiders': 'block', 'gf-wisps': 'pack', 'gf-caravan': 'block', 'gnash-camp': 'lair' }, locks: { 'dune-glass': 2, mirage: 1, quicksand: 1 }, npcs: [] },
  miragewell: { biome: 'oasis', fires: { 'well-fire': false }, fights: { 'wisp-queen': 'lair' }, locks: { mirage: 1 }, npcs: ['sabah', 'pilgrim-mw'] },
  scorchgate: { biome: 'ash', fires: { 'last-watchfire': true }, fights: { 'sg-wights': 'pack', 'sg-captain': 'block', 'tamsin-scorchgate': 'block' }, locks: { 'vault-seal': 1 }, npcs: ['cinder'] },
  'scorchgate-vaults': { biome: 'vault', fires: {}, fights: { 'vault-guard': 'block', 'ashen-warden': 'lair' }, locks: {}, npcs: [] },
};

test('the Sunscorch maps hold what spec §2.3 puts on them', () => {
  assert.deepEqual(Object.keys(SUN_SPEC).sort(), [...SUN].sort());
  for (const [id, want] of Object.entries(SUN_SPEC)) {
    const m = MAPS[id], of = k => m.entities.filter(e => e.kind === k);
    assert.equal(m.biome, want.biome, `${id} biome`);
    assert.ok(m.lore.length >= 1, `${id} has lore for the Atlas`);
    assert.deepEqual(Object.fromEntries(of('hearthfire').map(e => [e.id, !!e.cold])), want.fires, `${id} Hearthfires`);
    assert.deepEqual(Object.fromEntries(of('encounter').map(e => [e.id, e.mode])), want.fights, `${id} fights`);
    for (const [type, n] of Object.entries(want.locks)) assert.ok(of('lock').filter(e => e.lock === type).length >= n, `${id}: ${n} ${type}`);
    for (const npc of want.npcs) assert.ok(of('npc').some(e => e.npc === npc), `${id}: ${npc}`);
  }
  const on = (map, id) => MAPS[map].entities.find(e => e.id === id);
  assert.equal(on('sandspire', 'ss-cistern')?.lock, 'barred-gate', 'the cistern is a barred gate');
  assert.equal(on('sandspire', 'ss-board')?.opens, 'bounties', 'the Sandspire bounty board');
  assert.equal(on('sandspire', 'ss-lookout')?.kind, 'lookout', 'the lookout on the mesa edge');
  assert.equal(on('sandspire', 'crate-cradle')?.kind, 'sign', 'the empty crate cradle');
  assert.equal(on('sun-road', 'sr-glass-cache')?.kind, 'chest', 'the dune-glass hollow\'s cache');
  assert.ok(on('sun-road', 'sr-toll').area[2] - on('sun-road', 'sr-toll').area[0] === 1, 'Rasa\'s toll is two tiles wide');
  // the Vault door is the way down: the exit lies straight through it
  const door = on('scorchgate', 'sg-vault-door'), down = MAPS.scorchgate.exits.find(x => x.to === 'scorchgate-vaults');
  assert.equal(door.lock, 'vault-seal');
  assert.ok(cellsOf(down).every(([x, y]) => cellsOf(door).some(([dx, dy]) => dx === x && dy === y - 1)), 'the stair down is behind the Vault door');
  // Kharzul's champion lair is 3 by 2; every big lair carries its sprite foot inside its footprint
  const [kx0, ky0, kx1, ky1] = on('deep-shaft-2', 'kharzul-heart').area;
  assert.deepEqual([kx1 - kx0 + 1, ky1 - ky0 + 1], [3, 2], 'Kharzul\'s footprint');
  for (const id of SUN) for (const e of MAPS[id].entities) if (e.kind === 'encounter' && e.area) assert.ok(covers(e, e.at[0], e.at[1]), `${id}/${e.id} stands in its footprint`);
  // the dark places (M3's soft darkness): the Deep Shaft and the Vaults
  assert.deepEqual(SUN.filter(id => MAPS[id].dark).sort(), ['deep-shaft-1', 'scorchgate-vaults']);
  assert.equal(MAPS['glass-flats'].entities.filter(e => e.kind === 'hearthfire').length, 0, 'no Hearthfire on the Glass Flats');
});

test('Sunscorch chests: a little silver, gems and materials by real ids, embers well hidden, Ash Garnets only in Scorchgate', () => {
  const chests = SUN.flatMap(id => MAPS[id].entities.filter(e => e.kind === 'chest').map(e => ({ map: id, e })));
  assert.ok(chests.length >= 10, `${chests.length} chests`);
  for (const { map, e } of chests) {
    for (const [k, n] of Object.entries(e.loot.materials || {})) assert.ok(MATERIALS[k] && n >= 1 && n <= 2, `${map}/${e.id}: ${k} x${n}`);
    for (const [k, n] of Object.entries(e.loot.gems || {})) assert.ok(GEMS[k] && n >= 1 && n <= 2, `${map}/${e.id}: ${k} x${n}`);
    if (e.loot.gems?.['ash-garnet']) assert.ok(['scorchgate', 'scorchgate-vaults'].includes(map), `${e.id}: the Ash Garnet only drops in Scorchgate`);
    if (e.loot.materials?.embers) assert.ok(e.hidden || e.lock, `${e.id}: embers are well hidden`);
  }
  assert.ok(chests.filter(({ e }) => e.loot.materials?.silver).length * 2 >= chests.length, 'most hold a little silver');
  assert.ok(chests.filter(({ e }) => e.loot.materials?.embers).length >= 1, 'somewhere, an ember');
});
