// Map data tests (M3 spec §2, §4.2, §6.1 WP3; M4 spec §2, §8; M5 spec §2, §8; M6 spec §2, §8; M7 spec §2, §8) over all 60
// maps. Owner: WP3; M4 P2; M5 P2; M6 P2; M7 P2.
// Shape, bounds, exits, anchors, placements and locks, then the flood fills: every CRITICAL_PATH
// target is reachable with only the guaranteed keys (per starter), every chest with all keys, every
// hard lock and story gate really is the only way through to what it guards. The flood fills run
// through the engine (rules/world.js canWalk / present / lockStatus / interact) on synthetic games.
// M4: the Sunscorch opens through the Keep's south-east gate after Act I and not before, every SUN_PATH
// target is reachable from an Act-I-complete party with only its starter relic, no hard lock but the
// Vault door stands on that path, the re-armed fights never shut the way home, and the maps hold what
// spec §2.3 puts on them.
// M5: the same for the Ironspire: it opens through the Keep's east postern once the second council is
// sat, every IRON_PATH target is reachable from a Sunscorch-complete party (with Thane Brundar's Rune-Key
// once he gives it), no hard lock but the Deeps' rune-seal stands on that path, the re-armed fights never
// shut the way home, the leads are reachable, the maps hold what spec §2.3 puts on them, and the chests
// pay as the region should.
// M6: the same for the Gloomfen: it opens down Mossfall's fen stair once the third council is sat, every GLOOM_PATH
// target is reachable from an Ironspire-complete party with only its starter relic (Hodge's toll paid at his bar), no
// hard lock stands on that path, the long boardwalk's east end waits on the Brand of Lanterns and the causeway home
// on the Brand of the Deep, the re-armed fights never shut the way home, the leads are reachable, every entity is
// reachable with every key, the maps hold what spec §2.3 puts on them, the roads are spec §2.2's gate by gate, and
// the chests pay in bog amber.
// M7: the same for the Hearth Below: it opens down the vault stair in the Great Hall once the fifth council is sat, the
// stair back is shut from the first Council fight until the last, every ACT3_PATH target is reachable from a
// Gloomfen-complete party with only its starter relic, no lock stands below, every entity is reachable with every key,
// the maps hold what spec §2.3 puts on them, the roads are spec §2.2's gate by gate, the layouts are batch 4's words
// place by place (the nave and its chairs, the landings and the narrows, the floors round the Sleeper that never meet,
// the moat and the bridge, the heart only past the Unsmith), the large props are drawn once and stand in solid ground,
// every edge is closed but for the exits, and the Ash Stair's patrols keep to its landings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, MAP_IDS, ENTITY_OF, anchor, v1Anchor } from '../src/data/maps/index.js';
import { LEGEND } from '../src/data/tiles.js';
import { LOCKS } from '../src/data/locks.js';
import { RELICS } from '../src/data/relics.js';
import { DOMAINS } from '../src/data/domains.js';
import { STARTERS } from '../src/data/heroes.js';
import { ENCOUNTERS, GAUNTLET, PATROLS, BRANDS } from '../src/data/encounters.js';
import { HEARTHS, START_AT, CRITICAL_PATH, LEADS, ZONES, REGIONS, LORE, SUN_PATH, SUN_LEADS, IRON_PATH, IRON_LEADS, GLOOM_PATH, GLOOM_LEADS, ACT3_PATH, ACT3_LEADS } from '../src/data/world.js';
import { DIALOGUE } from '../src/data/dialogue.js';
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

test('60 maps (14 in the Wilds, 10 in the Sunscorch, 17 in the Ironspire with the East Road, 12 in the Gloomfen, 4 in the Hearth Below, and the reliquary\'s three Galleries); every row is w characters from the legend; entities and exits are in bounds', () => {
  assert.equal(MAP_IDS.length, 60);
  assert.ok(MAPS['keep-gallery'], 'the Sunscorch Gallery');
  assert.ok(MAPS['keep-gallery-2'], 'the Ironspire Gallery');
  assert.ok(MAPS['keep-gallery-3'], 'the Gloomfen Gallery');
  assert.equal(MAP_IDS.filter(id => MAPS[id].region === 'sunscorch').length, 10);
  assert.equal(MAP_IDS.filter(id => MAPS[id].region === 'ironspire').length, 17);
  assert.equal(MAP_IDS.filter(id => MAPS[id].region === 'gloomfen').length, 12);
  assert.equal(MAP_IDS.filter(id => MAPS[id].region === 'below').length, 4);
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
  // M6: the two ways into the Gloomfen lead somewhere now (the fen stair, the causeway), so no exit is sealed for good.
  // M7: the vault stair down to the Hearth Below and the Hollow Hall's stair back are gated
  assert.equal(sealed, 0, 'no exit is sealed for good');
  assert.deepEqual(gated.sort(), ['bm-causeway', 'fr-highfold', 'hall-down', 'hh-up', 'keep-e', 'keep-se', 'keep-sw', 'lb-e', 'mf-fen-stair', 'pv-w', 'ss-e', 'sw-n']);
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
  // M7 (spec A5): a prop is solid only when it says so (rules/world.js), so the vault stair, a prop that is not solid,
  // lies on the Great Hall's hall-down
  for (const m of Object.values(MAPS)) {
    for (const x of m.exits) {
      for (const [cx, cy] of cellsOf(x)) {
        const on = m.entities.find(e => !['trigger', 'light', 'gate'].includes(e.kind) && !(e.kind === 'encounter' && e.mode === 'pack') && !(e.kind === 'prop' && !e.solid) && covers(e, cx, cy));
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

test('world tables agree with the maps: the 35 Hearthfires, the 17 places, the regions and their sealed entries', () => {
  const inView = ([x, y]) => x >= 0 && x <= 1200 && y >= 0 && y <= 800;
  const fires = Object.keys(ENCOUNTERS).filter(id => ENCOUNTERS[id].type === 'hearthfire');
  assert.deepEqual(Object.keys(HEARTHS).sort(), fires.sort(), 'HEARTHS covers every Hearthfire');
  assert.equal(fires.length, 35);
  assert.equal(fires.filter(id => ENCOUNTERS[id].region === 'sunscorch').length, 7, 'seven in the Sunscorch (M4 spec §2.5)');
  assert.equal(fires.filter(id => ENCOUNTERS[id].region === 'ironspire').length, 8, 'eight in the Ironspire (M5 spec §2.5: seven, and the East Road\'s Last Camp)');
  assert.equal(fires.filter(id => ENCOUNTERS[id].region === 'gloomfen').length, 8, 'eight in the Gloomfen (M6 spec §2.5)');
  assert.equal(fires.filter(id => ENCOUNTERS[id].region === 'below').length, 2, 'two in the Hearth Below (M7 spec §2.5)');
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
  const sealed = Object.values(MAPS).flatMap(m => m.exits.filter(x => x.sealed).map(x => ({ ...x, from: m.region, map: m.id })));
  for (const r of Object.values(REGIONS)) {
    assert.ok(inView(r.lore), `${r.id} lore`);
    for (const id of r.entries || []) assert.equal(sealed.find(x => x.id === id)?.sealed.region, r.id, `${id} is a sealed entry to ${r.id}`);
  }
  // every sealed way into a region is one of its entries; a gate inside a region (M4.5: Sandspire's east
  // gate, shut until the Brand of Glass) is not a way into it, and nor (M7) is the stair back out of one: the Hollow
  // Hall's hh-up, shut while the Council sits, climbs to the Great Hall, whose hall-down is the region's entry
  for (const x of sealed) {
    if (x.from === x.sealed.region) {
      const wayBack = !!x.to && MAPS[x.to].exits.some(y => (REGIONS[x.from].entries || []).includes(y.id) && y.to === x.map);
      assert.ok(x.gate && x.to && (MAPS[x.to].region === x.from || wayBack), `${x.id} is a gate inside ${x.from}, or its way back out`);
      continue;
    }
    assert.ok(REGIONS[x.sealed.region].entries.includes(x.id), `${x.id} is listed in REGIONS.${x.sealed.region}.entries`);
  }
  for (const m of Object.values(MAPS)) for (const [lx, ly, tx, ty] of m.lore) assert.ok(inView([lx, ly]) && inside(m, tx, ty), `${m.id} lore`);
});

test('the reliquary: a pedestal per relic in codex order, Page I on rows 10 and 12 of the Great Hall, Pages II and III on rows 2 and 5 of their Galleries, Page IV on rows 4 and 7 of the Gloomfen Gallery', () => {
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
  room('keep-gallery-3', [4, 7], 53, 66);
  // M7: Page V's nine (No. 000 and Nos. 67-74) have no pedestal; the spec gives the Hearth Below no gallery
  assert.equal(byCodex.length, 75);
  const placed = new Set(Object.values(MAPS).flatMap(m => m.entities.filter(e => e.kind === 'pedestal').map(e => e.relic)));
  assert.deepEqual(byCodex.filter(id => !placed.has(id)), ['fenwicks-poker', 'hollow-wreath', 'hollow-chalice', 'hollow-gauntlet', 'hollow-chain',
    'tamsins-bargain', 'unmaking-hammer', 'ironvein-apron', 'worldforge-heart']);
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
    if (REGIONS.ironspire.brands.every(b => g.progress.brands.includes(b))) f.story['ironspire-complete'] = true;
    if (REGIONS.gloomfen.brands.every(b => g.progress.brands.includes(b))) f.story['gloomfen-complete'] = true;
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
// flags of the Ironspire's gates; M6, the third council, which opens the fen stair, and the Gloomfen pair, which
// opens the causeway home; M7, the fourth council and the fifth, which opens the vault stair) and every duel's yield.
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
    // M6: the third council opens the fen stair below Mossfall; the Brand of the Deep, the causeway home
    g.progress.brands.push('brand-of-lanterns', 'brand-of-the-deep');
    g.progress.waking = 8;
    Object.assign(f.story, { 'ironspire-complete': true, 'council-3-done': true });
    // M7: the fourth council ends Act II, and the fifth opens the vault stair down to the Hearth Below
    Object.assign(f.story, { 'gloomfen-complete': true, 'council-4-done': true, 'council-5-done': true });
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
// monks the Highfold path down to Fawnrest; M6: the third council opens the fen stair; M7: the fifth, the vault stair)
const LATER = ['act1-complete', 'sunscorch-complete', 'council-2-done', 'highfold-open', 'ironspire-complete', 'council-3-done',
  'gloomfen-complete', 'council-4-done', 'council-5-done'];
// M6: the Brand of the Deep opens the Keep's south-west gate onto the causeway, and the Gloomfen is a back way into
// the Wilds (the Murkway climbs the fen stair to Mossfall): before the Act's end neither Gloomfen Brand is held
const beforeGloomfen = g => { g.progress.brands = g.progress.brands.filter(b => BRANDS[b].region !== 'gloomfen'); };

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
    beforeGloomfen(g);
    assert.deepEqual([...mapsOf(flood(g))].sort(), ['keep', 'keep-gallery', 'keep-gallery-2', 'keep-gallery-3', 'keep-hall'], 'keep-n-gate holds until keep-vault is done');
  }
  // Until Skarn is beaten, his chain closes the road: Thornhollow and the Smugglers' Hollow are out of reach.
  // (Skarn is on the road to Act I, so nothing after it has happened either: M5's Highfold path is a back
  // way into the Wilds from the Ironspire, which opens only after the second council.)
  {
    const g = structuredClone(open);
    delete g.progress.flags.unlocked['bramble-toll-chain'];
    for (const k of LATER) delete g.progress.flags.story[k];
    beforeGloomfen(g);
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
    // every Sunscorch fire and the Keep's stays reachable from the lair, but for a fire behind a road gate
    // whose fight is still ahead (M4.5: after Kharzul, the Last Watchfire lies past the raiders' chain)
    const ahead = { 'kharzul-heart': ['last-watchfire'], 'ashen-warden': [] }[id];
    const fires = ['hearthstone-keep', ...Object.keys(HEARTHS).filter(h => MAPS[HEARTHS[h].map].region === 'sunscorch')];
    assert.equal(fires.length, 8);
    for (const fire of fires) {
      assert.equal(reaches(r, HEARTHS[fire].map, ENTITY_OF[fire].entity), !ahead.includes(fire), `after ${id}, ${fire} is ${ahead.includes(fire) ? 'still behind the road ahead' : 'reachable from the lair'}`);
    }
    // and every re-armed road guard stands beside its open gate
    let checked = 0;
    for (const m of SUN) {
      for (const e of present(g, m)) {
        if (e.kind !== 'gate' || !e.guard || !g.progress.flags.beaten[e.guard]) continue;
        assert.equal(e.state, 'open', `after ${id}, ${m}/${e.id} stays open`);
        checked++;
      }
    }
    assert.ok(checked >= (id === 'kharzul-heart' ? 3 : 6), `after ${id}: ${checked} beaten road gates checked`);
  }
});

test('one order (M4.5 A3): the Glass Flats open with the Brand of Glass, even to a party holding every relic', () => {
  const stage = i => {
    const g = sunStage('hearthbrand', i, { keys: false });
    setLevels(g, 20);
    for (const id of Object.keys(RELICS)) if (!g.inventory.some(it => it.base === id)) g.inventory.push({ uid: `a3-${id}`, base: id, kind: RELICS[id].kind, slot: RELICS[id].slot });
    return mapsOf(flood(openHeldLocks(g)));
  };
  const before = stage(SP.indexOf('kharzul-heart'));
  assert.ok(before.has('sandspire') && before.has('deep-shaft-2'), 'the west side is open before the Brand of Glass');
  for (const m of ['glass-flats', 'miragewell', 'scorchgate', 'scorchgate-vaults']) assert.ok(!before.has(m), `${m} is shut until the Brand of Glass`);
  const after = stage(SP.indexOf('kharzul-heart') + 1);
  for (const m of ['glass-flats', 'miragewell']) assert.ok(after.has(m), `${m} opens with the Brand of Glass`);
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

// ---- M5: the Ironspire Peaks (spec §2, §8) -----------------------------------------------------------------

const IP = IRON_PATH;
const IRON = MAP_IDS.filter(id => MAPS[id].region === 'ironspire');
const EAST_ROAD = ['old-bridge', 'drystone-lea', 'plankford', 'shrinewood', 'silverfall', 'last-camp'];
const relicItem = id => ({ uid: `map-${id}`, base: id, kind: RELICS[id].kind, slot: RELICS[id].slot });
// Thane Brundar gives his Rune-Key once Tamsin's duel is done or yielded (spec §2.2; the main quest's step)
const giveRuneKey = g => {
  Object.assign(g.progress.flags.story, { 'met-brundar': true, 'rune-given': true });
  if (!g.inventory.some(i => i.base === 'thanes-rune')) g.inventory.push(relicItem('thanes-rune'));
};

// A Sunscorch-complete party (spec §2.2, §8): the M3 and M4 critical paths behind it (all four earlier Brands,
// the Waking at 4, act1-complete and sunscorch-complete), the second council sat, at level 8 (the worst case
// the earlier tests allow; nothing says it has levelled since), with only its starter relic. Then the first i
// IRON_PATH targets are beaten (an Ironspire Brand re-arms the region, as the rules do): Mother Wynn opens the
// Highfold when the party reaches Peak's Veil, and Thane Brundar gives the Rune-Key once Tamsin's duel is
// settled. `keys` opens every lock whose key the party holds.
function ironStage(starter, i, { keys = true } = {}) {
  const g = structuredClone(newGame({ name: 'Map', starter, seed: 11 }));
  setLevels(g, 8);
  for (const id of [...CP, ...SP]) beat(g, id);
  g.progress.flags.story['council-2-done'] = true;
  for (let j = 0; j < i; j++) beat(g, IP[j]);
  if (i > IP.indexOf('veil-hearth')) Object.assign(g.progress.flags.story, { 'met-wynn': true, 'highfold-open': true });
  if (i > IP.indexOf('tamsin-ironhold')) giveRuneKey(g);
  return keys ? openHeldLocks(g) : g;
}

test('the Ironspire opens through the Keep\'s east postern once the second council is sat, and not before', () => {
  const east = MAPS.keep.exits.find(x => x.id === 'keep-e');
  assert.deepEqual(east.gate, { flag: 'council-2-done' });
  assert.equal(east.to, 'old-bridge', 'the postern opens on the East Road');
  assert.equal(east.sealed.region, 'ironspire');
  assert.equal(IRON.length, 17);
  // the East Road: six painted maps, one after another, from the Old Bridge to the Rockslide Pass
  for (let i = 0; i < EAST_ROAD.length; i++) {
    const next = EAST_ROAD[i + 1] || 'rockslide-pass';
    assert.ok(MAPS[EAST_ROAD[i]].exits.some(x => x.to === next), `${EAST_ROAD[i]} leads on to ${next}`);
    assert.ok(MAPS[next].exits.some(x => x.to === EAST_ROAD[i]), `${next} leads back to ${EAST_ROAD[i]}`);
  }
  const open = openHeldLocks(allKeys({ brand: true }));
  // before anyone has met Mother Wynn the Highfold is barred at both ends, so the postern is the way in
  const first = structuredClone(open);
  delete first.progress.flags.story['highfold-open'];
  const r1 = flood(first);
  assert.ok(r1.used.has('keep-e'), 'the fill goes through keep-e');
  for (const id of IRON) assert.equal(mapsOf(r1).has(id), id !== 'highfold', `${id}: ${id === 'highfold' ? 'waits on the monks' : 'reachable once the council is sat'}`);
  // once the monks have unbarred it, the Highfold joins Peak's Veil to Fawnrest: a second way home (spec A5)
  const r2 = flood(open);
  for (const id of IRON) assert.ok(mapsOf(r2).has(id), `${id} is reachable once the Highfold is open`);
  assert.ok(r2.used.has('pv-w') && r2.used.has('fr-highfold'), 'both ends of the Highfold open with highfold-open');
  assert.deepEqual(MAPS['peaks-veil'].exits.find(x => x.id === 'pv-w').gate, { flag: 'highfold-open' });
  assert.deepEqual(MAPS.fawnrest.exits.find(x => x.id === 'fr-highfold').gate, { flag: 'highfold-open' });
  // before the council nothing in the Ironspire can be reached, even with every key (and highfold-open is only
  // ever set in Peak's Veil)
  const shut = structuredClone(first);
  delete shut.progress.flags.story['council-2-done'];
  const seen = mapsOf(flood(shut));
  for (const id of IRON) assert.ok(!seen.has(id), `${id} stays sealed before the second council, even with every key`);
  // the postern and the Highfold are the only ways between the Ironspire and the rest of the world
  for (const id of IRON) {
    for (const x of MAPS[id].exits) {
      assert.ok(x.to && (!x.sealed || x.gate), `${id}/${x.id} is a way through`);
      if (MAPS[x.to].region !== 'ironspire') assert.ok((id === 'old-bridge' && x.to === 'keep') || (id === 'highfold' && x.to === 'fawnrest'), `${id}/${x.id} leaves the Ironspire only for the Keep or Fawnrest`);
    }
  }
  const home = anchor('keep', 'from-east-road');
  assert.ok(cellsOf({ area: east.area }).some(([x, y]) => Math.abs(x - home.x) + Math.abs(y - home.y) === 1), 'the road home lands beside keep-e');
});

for (const starter of Object.keys(STARTERS)) {
  test(`reachability (${starter}): every IRON_PATH target from a Sunscorch-complete party, with only the starter relic at the worst-case level and the Rune-Key once it is given`, () => {
    for (let i = 0; i < IP.length; i++) {
      const g = ironStage(starter, i);
      const hit = ENTITY_OF[IP[i]];
      assert.ok(hit, `${IP[i]} is placed`);
      assert.equal(MAPS[hit.map].region, 'ironspire', `${IP[i]} is in the Ironspire`);
      const live = present(g, hit.map).find(e => e.id === hit.entity.id);
      assert.ok(live, `${IP[i]} is present when it is next (stage ${i})`);
      assert.ok(reaches(flood(g), hit.map, hit.entity), `${IP[i]} (${hit.map}) is reachable at stage ${i} (level 8)`);
    }
  });
}

test('no hard lock stands on the Ironspire path but the Deeps\' rune-seal, and the Thane\'s Rune-Key opens it (spec §2.2)', () => {
  const given = IP.indexOf('tamsin-ironhold');
  for (let i = 0; i < IP.length; i++) {
    const g = ironStage('cairnmaul', i, { keys: false });              // every hard lock shut
    if (i > given) g.progress.flags.unlocked['ih-rune-door'] = true;    // opened with the key the path just gave
    const hit = ENTITY_OF[IP[i]];
    assert.ok(reaches(flood(g), hit.map, hit.entity), `${IP[i]} needs no key but the path's own (stage ${i})`);
  }
  // until it is opened the rune-seal keeps the Deeps (and Harrow's Forge under them) shut
  const sealed = mapsOf(flood(ironStage('cairnmaul', given + 1, { keys: false })));
  assert.ok(sealed.has('ironhold') && !sealed.has('ironhold-deeps') && !sealed.has('harrows-forge'), 'the Deeps wait on the rune-seal');
  const door = MAPS.ironhold.entities.find(e => e.id === 'ih-rune-door'), down = MAPS.ironhold.exits.find(x => x.to === 'ironhold-deeps');
  assert.equal(door.lock, 'rune-seal');
  assert.ok(cellsOf(down).every(([x, y]) => cellsOf(door).some(([dx, dy]) => dx === x && dy > y)), 'the stair down lies behind the rune-sealed door');
  // the key: a new party (Knowledge 1) holding only the Thane's Rune-Key opens the seal, and a scene gives it
  const g = structuredClone(newGame({ name: 'Map', starter: 'cairnmaul', seed: 11 }));
  g.inventory.push(relicItem('thanes-rune'));
  const st = lockStatus(g, 'rune-seal');
  assert.ok(st.open && st.by === 'thanes-rune', 'the Rune-Key opens the rune-seal');
  assert.ok(Object.values(DIALOGUE).some(d => (d.do || []).some(e => e.give === 'thanes-rune') && (d.do || []).some(e => e.set === 'rune-given')), 'a scene gives the Rune-Key and sets rune-given');
  // one order (spec A4): Stormwatch's north gate onto the Frost Road opens with the Brand of Iron
  const north = MAPS.stormwatch.exits.find(x => x.id === 'sw-n');
  assert.deepEqual(north.gate, { brand: 'brand-of-iron' });
  assert.ok(north.sealed.hint, 'the north gate says what opens it');
  const before = ironStage('cairnmaul', IP.indexOf('mother-anvil'));
  assert.ok(!mapsOf(flood(before)).has('frost-road'), 'the Frost Road waits on the Brand of Iron');
});

test('after each Ironspire Brand, the re-armed fights never shut the way home from the Brand\'s lair', () => {
  for (const id of ['mother-anvil', 'rime-abbot']) {
    const g = ironStage('hearthbrand', IP.indexOf(id) + 1);            // the Brand is won: the region re-arms
    assert.ok(present(g, 'rockslide-pass').some(e => e.id === 'rp-brigands'), `after ${id} Rhune is back at his toll`);
    const hit = ENTITY_OF[id];
    const from = nextTo(g, hit.map, hit.entity);
    assert.ok(from, `${id} can be stood beside`);
    const r = flood(g, { from: [hit.map, ...from] });
    // the lairs are underground (no Hearthfire travel): every fire kindled on the way, and the Keep's own,
    // stays reachable on foot
    const kindled = ['hearthstone-keep', ...Object.keys(HEARTHS).filter(h => MAPS[HEARTHS[h].map].region === 'ironspire' && g.progress.flags.kindled[h])];
    assert.ok(kindled.length >= (id === 'mother-anvil' ? 6 : 8), `after ${id}: ${kindled.join(', ')}`);
    for (const fire of kindled) assert.ok(reaches(r, HEARTHS[fire].map, ENTITY_OF[fire].entity), `after ${id}, ${fire} is still reachable from the lair`);
    // and every re-armed road guard of the path behind stands beside its open gate
    const behind = IP.slice(0, IP.indexOf(id));
    for (const m of IRON) for (const e of present(g, m)) if (e.kind === 'gate' && e.guard && behind.includes(e.guard)) assert.equal(e.state, 'open', `after ${id}, ${m}/${e.id} stays open`);
  }
});

test('world tables: IRON_PATH is spec §2.2\'s route and IRON_LEADS its leads, each placed once in the Ironspire and reachable', () => {
  assert.deepEqual([...IP], ['er-wolves', 'er-toll', 'camp-fire', 'er-camp', 'pass-shrine', 'rp-brigands', 'rp-rocklings', 'veil-hearth', 'is-sentinels', 'stair-cairn', 'thanes-hearth',
    'tamsin-ironhold', 'id-forgeborn', 'deeps-forge', 'id-bellows', 'mother-anvil', 'stormwatch-fire',
    'fr-cutters', 'frost-cairn', 'fm-wraiths', 'fb-choir', 'rime-abbot']);
  assert.deepEqual(JSON.parse(JSON.stringify(IRON_LEADS)), { roc: ['hf-trolls', 'roc-eyrie'], horn: ['troll-cave'], smith: ['id-smith'], shrine: ['fm-shrine'] });
  const leads = Object.values(IRON_LEADS).flat();
  const placedIn = id => MAPS[ENTITY_OF[id]?.map]?.region;              // undefined when no map places it
  for (const id of [...IP, ...leads]) {
    assert.ok(ENCOUNTERS[id] && ENCOUNTERS[id].region === 'ironspire', `${id} is an Ironspire encounter`);
    assert.equal(placedIn(id), 'ironspire', `${id} is placed in the Ironspire`);
  }
  for (const id of Object.keys(ENCOUNTERS).filter(k => ENCOUNTERS[k].region === 'ironspire')) assert.equal(placedIn(id), 'ironspire', `${id} sits on an Ironspire map`);
  const all = flood(openHeldLocks(allKeys({ brand: true })));
  for (const id of leads) assert.ok(reaches(all, ENTITY_OF[id].map, ENTITY_OF[id].entity), `the lead ${id} is reachable with every key`);
  // at the path's end a party that kept Rhune's Windstep Boots (and the Rune-Key) can reach every lead
  const g = ironStage('stillwater-lance', IP.length, { keys: false });
  g.inventory.push(relicItem('windstep-boots'));
  const r = flood(openHeldLocks(g));
  for (const id of leads) assert.ok(reaches(r, ENTITY_OF[id].map, ENTITY_OF[id].entity), `the lead ${id} is reachable with the path's own relics`);
});

// What spec §2.3 (with §2.5, §2.7, §3.1, §3.3) puts on each map: its biome, its Hearthfires (true = cold), its
// fights and their modes, at least this many locks of each type, and its people. Road-first (A3): every route
// and lead fight stands still (a block or a lair); only the zone packs roam.
const IRON_SPEC = {
  // the East Road (the player's six wilderness paintings): green lowland roads, so the Hearth Road's backdrop
  'old-bridge': { biome: 'wilds', backdrop: 'hearth-road', fires: {}, fights: {}, locks: {}, npcs: [] },
  'drystone-lea': { biome: 'wilds', backdrop: 'hearth-road', fires: {}, fights: { 'er-wolves': 'block' }, locks: {}, npcs: [] },
  plankford: { biome: 'wilds', backdrop: 'hearth-road', fires: {}, fights: { 'er-toll': 'block' }, locks: {}, npcs: [] },
  shrinewood: { biome: 'wilds', backdrop: 'hearth-road', fires: {}, fights: {}, locks: {}, npcs: [] },
  silverfall: { biome: 'wilds', backdrop: 'hearth-road', fires: {}, fights: {}, locks: {}, npcs: [] },
  'last-camp': { biome: 'wilds', backdrop: 'hearth-road', fires: { 'camp-fire': false }, fights: { 'er-camp': 'block' }, locks: {}, npcs: [] },
  'rockslide-pass': { biome: 'mountain', fires: { 'pass-shrine': false }, fights: { 'rp-brigands': 'block', 'rp-rocklings': 'block', 'rp-wolves': 'pack' }, locks: { chasm: 1 }, npcs: [] },
  'peaks-veil': { biome: 'monastery', fires: { 'veil-hearth': false }, fights: {}, locks: {}, npcs: ['wynn', 'kesh', 'novice'] },
  highfold: { biome: 'scree', fires: {}, fights: { 'hf-trolls': 'block', 'roc-eyrie': 'lair' }, locks: { chasm: 1, drift: 1 }, npcs: [] },
  'iron-stair': { biome: 'mountain', fires: { 'stair-cairn': true }, fights: { 'is-sentinels': 'block', 'is-trolls': 'pack', 'troll-cave': 'lair' }, locks: { ice: 1 }, npcs: [] },
  ironhold: { biome: 'dwarf-hall', fires: { 'thanes-hearth': false }, fights: { 'tamsin-ironhold': 'block' }, locks: { 'rune-seal': 1 }, npcs: ['brundar', 'durra', 'ih-guard'] },
  'ironhold-deeps': { biome: 'forge', fires: { 'deeps-forge': true }, fights: { 'id-forgeborn': 'block', 'id-bellows': 'block', 'id-smith': 'block' }, locks: { 'rune-seal': 1 }, npcs: [] },
  'harrows-forge': { biome: 'forge', fires: {}, fights: { 'mother-anvil': 'lair' }, locks: {}, npcs: [] },
  stormwatch: { biome: 'outpost', fires: { 'stormwatch-fire': false }, fights: {}, locks: {}, npcs: ['quill', 'rook', 'ysolde'] },
  'frost-road': { biome: 'tundra', fires: { 'frost-cairn': true }, fights: { 'fr-cutters': 'block', 'fr-wolves': 'pack' }, locks: { drift: 1, ice: 1 }, npcs: [] },
  frostmere: { biome: 'frozen-lake', fires: {}, fights: { 'fm-wraiths': 'block', 'fm-shrine': 'lair' }, locks: { chasm: 1 }, npcs: [] },
  'frostmere-below': { biome: 'ice-cave', fires: {}, fights: { 'fb-choir': 'block', 'rime-abbot': 'lair' }, locks: {}, npcs: [] },
};

test('the Ironspire maps hold what spec §2.3 puts on them', () => {
  assert.deepEqual(Object.keys(IRON_SPEC).sort(), [...IRON].sort());
  for (const [id, want] of Object.entries(IRON_SPEC)) {
    const m = MAPS[id], of = k => m.entities.filter(e => e.kind === k);
    assert.equal(m.biome, want.biome, `${id} biome`);
    assert.ok(m.lore.length >= 1, `${id} has lore for the Atlas`);
    assert.ok(m.roads?.length, `${id} declares its roads (spec A3)`);
    assert.equal(m.backdrop, want.backdrop || id, `${id} fights on ${want.backdrop ? `the ${want.backdrop} backdrop` : 'its own backdrop'} (spec §6.2)`);
    assert.deepEqual(Object.fromEntries(of('hearthfire').map(e => [e.id, !!e.cold])), want.fires, `${id} Hearthfires`);
    assert.deepEqual(Object.fromEntries(of('encounter').map(e => [e.id, e.mode])), want.fights, `${id} fights`);
    for (const [type, n] of Object.entries(want.locks)) assert.ok(of('lock').filter(e => e.lock === type).length >= n, `${id}: ${n} ${type}`);
    for (const npc of want.npcs) assert.ok(of('npc').some(e => e.npc === npc), `${id}: ${npc}`);
  }
  const on = (map, id) => MAPS[map].entities.find(e => e.id === id);
  // the mountain maps play the peaks track; the towns and dungeons keep theirs
  assert.deepEqual(IRON.filter(id => MAPS[id].music === 'peaks').sort(), ['frost-road', 'frostmere', 'highfold', 'iron-stair', 'rockslide-pass']);
  assert.deepEqual(IRON.filter(id => MAPS[id].music === 'road').sort(), [...EAST_ROAD].sort(), 'the East Road plays the road');
  // the East Road is painted: every map of it has its painting, and a painted stone or pool draws no sprite
  for (const id of EAST_ROAD) {
    assert.equal(MAPS[id].overTiles, false, `${id} is traced from its painting`);
    for (const e of MAPS[id].entities) if (e.look === 'painted') assert.ok(e.kind === 'sign' && e.name && e.text, `${id}/${e.id}: a painted thing to look at has a name and words`);
  }
  // the dark places (M3's soft darkness): the Deeps and Beneath Frostmere; underground, no Hearthfire travel
  assert.deepEqual(IRON.filter(id => MAPS[id].dark).sort(), ['frostmere-below', 'ironhold-deeps']);
  assert.deepEqual(IRON.filter(id => !MAPS[id].travel).sort(), ['frostmere-below', 'harrows-forge', 'ironhold-deeps']);
  // the zones (spec §2.6)
  assert.deepEqual(IRON.filter(id => MAPS[id].zone).map(id => [id, MAPS[id].zone]).sort(), [['frost-road', 'frost-road'], ['frostmere', 'frostmere'], ['highfold', 'highfold'], ['iron-stair', 'iron-stair'], ['ironhold-deeps', 'deeps'], ['rockslide-pass', 'rockslide-pass']]);
  // Peak's Veil: the bell rope (the quest) in the tower, the lookout; the boards of Ironhold and Stormwatch
  assert.equal(on('peaks-veil', 'pv-bell-rope')?.kind, 'bellframe', 'the bell rope');
  assert.equal(on('peaks-veil', 'pv-lookout')?.kind, 'lookout', 'the lookout');
  assert.equal(on('ironhold', 'ih-board')?.opens, 'bounties', 'the Ironhold board');
  assert.equal(on('stormwatch', 'sw-board')?.opens, 'bounties', 'the Stormwatch board');
  assert.equal(on('harrows-forge', 'fg-mark')?.kind, 'sign', 'Harrow\'s broken-ring mark');
  // Tamsin at Ironhold holds the Deeps stair: a win or a yield opens it, and she talks first
  const stair = on('ironhold', 'ih-deeps-gate');
  assert.deepEqual(stair.open, { any: [{ done: 'tamsin-ironhold' }, { flag: 'tamsin-yielded-3' }] });
  assert.equal(stair.guard, 'tamsin-ironhold');
  assert.equal(on('ironhold', 'tamsin-ironhold').talk, 'tamsin-ironhold');
  // the journeyman's side works are behind a rune-seal; the drowned shrine is over the broken floes; Old Horn
  // behind the ice; the Roc on its crag across a crevasse (the lock test: each is the only way in)
  assert.equal(on('ironhold-deeps', 'id-works-seal')?.lock, 'rune-seal');
  assert.equal(on('frostmere', 'fm-floes')?.lock, 'chasm');
  assert.equal(on('iron-stair', 'is-ice-wall')?.lock, 'ice');
  assert.equal(on('highfold', 'hf-crevasse')?.lock, 'chasm');
  // Hush is a shape under the ice floor of Beneath Frostmere (a prop the scene uses); the monks' prayer-flags
  // stand on the lake
  const hush = on('frostmere-below', 'hush');
  assert.ok(hush && hush.kind === 'prop' && hush.prop === 'hush' && !hush.solid, 'Hush, under the floor');
  assert.ok(MAPS.frostmere.entities.filter(e => e.kind === 'prop' && e.prop === 'prayer-flags').length >= 3, 'the prayer-flags');
  // the Champions' lairs are 3 by 2, and every big lair carries its sprite foot inside its footprint
  for (const [map, id] of [['harrows-forge', 'mother-anvil'], ['frostmere-below', 'rime-abbot']]) {
    const [x0, y0, x1, y1] = on(map, id).area;
    assert.deepEqual([x1 - x0 + 1, y1 - y0 + 1], [3, 2], `${id}'s footprint`);
  }
  for (const id of IRON) for (const e of MAPS[id].entities) if (e.kind === 'encounter' && e.area) assert.ok(covers(e, e.at[0], e.at[1]), `${id}/${e.id} stands in its footprint`);
  // the Highfold runs from Peak's Veil (east) down to Fawnrest (south)
  assert.deepEqual(MAPS.highfold.exits.map(x => x.to).sort(), ['fawnrest', 'peaks-veil']);
  // Ironhold's east exit leads to Stormwatch
  assert.equal(MAPS.ironhold.exits.find(x => x.id === 'ih-e')?.to, 'stormwatch');
});

test('Ironspire chests: a little silver, embers and scrap, gems by real ids, frost opals only in the Frostmere maps, embers behind a key, no relic', () => {
  const chests = IRON.flatMap(id => MAPS[id].entities.filter(e => e.kind === 'chest').map(e => ({ map: id, e })));
  assert.ok(chests.length >= 10, `${chests.length} chests`);
  // with every key but the hard locks on the chest's own map shut: what is reached then is not hidden by a lock
  const open = openHeldLocks(allKeys({ brand: true }));
  const behindKey = (map, e) => {
    const g = structuredClone(open);
    for (const x of MAPS[map].entities) if (x.kind === 'lock' && !LOCKS[x.lock].soft) delete g.progress.flags.unlocked[x.id];
    return !reaches(flood(g), map, e);
  };
  for (const { map, e } of chests) {
    for (const [k, n] of Object.entries(e.loot.materials || {})) assert.ok(MATERIALS[k] && n >= 1 && n <= 2, `${map}/${e.id}: ${k} x${n}`);
    for (const [k, n] of Object.entries(e.loot.gems || {})) assert.ok(GEMS[k] && n >= 1 && n <= 2, `${map}/${e.id}: ${k} x${n}`);
    if (e.loot.gems?.['frost-opal']) assert.ok(['frostmere', 'frostmere-below'].includes(map), `${e.id}: frost opals only in the Frostmere maps`);
    assert.ok(!e.loot.gems?.['ash-garnet'], `${e.id}: the Ash Garnet only drops in Scorchgate`);
    if (e.loot.materials?.embers) assert.ok(e.hidden || e.lock || behindKey(map, e), `${e.id}: embers are well hidden (hidden, or behind a key)`);
    assert.ok(!e.loot.relic && (e.loot.items || []).every(it => !it.base || !RELICS[it.base]), `${e.id}: no chest duplicates a relic`);
  }
  assert.ok(chests.filter(({ e }) => e.loot.materials?.silver).length * 2 >= chests.length, 'most hold a little silver');
  assert.ok(chests.some(({ e }) => e.loot.materials?.embers) && chests.some(({ e }) => e.loot.materials?.scrap), 'somewhere, an ember and some scrap');
  assert.ok(chests.some(({ e }) => e.loot.gems?.['frost-opal']), 'Frostmere pays in frost opals');
});

// ---- M6: the Gloomfen Marsh (spec §2, §8) --------------------------------------------------------------------

const GP = GLOOM_PATH;
const GLOOM = MAP_IDS.filter(id => MAPS[id].region === 'gloomfen');
const GLOOM_BRANDS = ['brand-of-lanterns', 'brand-of-the-deep'];

// An Ironspire-complete party (spec §2.2, §8): the M3, M4 and M5 critical paths behind it (all six earlier Brands, the
// Waking at 6, every earlier Act's flags and duels), the third council sat, at level 8 (the worst case the earlier
// tests allow; nothing says it has levelled since), with only its starter relic. Then the first i GLOOM_PATH targets
// are beaten (a Gloomfen Brand re-arms the region, as the rules do); once the party has reached the Toll-Lamp it pays
// Hodge's toll at his bar (the walk pays the day's price). `keys` opens every lock whose key the party holds.
function gloomStage(starter, i, { keys = true } = {}) {
  const g = structuredClone(newGame({ name: 'Map', starter, seed: 11 }));
  setLevels(g, 8);
  for (const id of [...CP, ...SP, ...IP]) beat(g, id);
  Object.assign(g.progress.flags.story, { 'council-2-done': true, 'met-wynn': true, 'highfold-open': true, 'council-3-done': true });
  giveRuneKey(g);
  for (let j = 0; j < i; j++) beat(g, GP[j]);
  if (i > GP.indexOf('toll-lamp')) g.progress.flags.story['toll-paid'] = true;
  return keys ? openHeldLocks(g) : g;
}

test('the Gloomfen opens down Mossfall\'s fen stair once the third council is sat, and the causeway home with the Brand of the Deep', () => {
  const stair = MAPS.mossfall.exits.find(x => x.id === 'mf-fen-stair');
  assert.deepEqual(stair.gate, { flag: 'council-3-done' });
  assert.equal(stair.to, 'murkway');
  assert.equal(stair.sealed.region, 'gloomfen');
  assert.ok(stair.sealed.hint, 'the fen stair says what opens it');
  const sw = MAPS.keep.exits.find(x => x.id === 'keep-sw');
  assert.deepEqual(sw.gate, { brand: 'brand-of-the-deep' });
  assert.equal(sw.to, 'causeway');
  assert.equal(GLOOM.length, 12);
  // every key, both Gloomfen Brands: all twelve maps, in through the fen stair and home across the causeway
  const all = openHeldLocks(allKeys({ brand: true }));
  const r = flood(all);
  assert.ok(r.used.has('mf-fen-stair') && r.used.has('keep-sw') && r.used.has('bm-causeway'), 'the fill goes down the fen stair and across the causeway');
  for (const id of GLOOM) assert.ok(mapsOf(r).has(id), `${id} is reachable once both Gloomfen Brands are held`);
  // one order (spec A4, A5): before either Brand the Misthollow side of the long boardwalk and the causeway are shut;
  // the Brand of Lanterns opens the boardwalk's east end, and only the Brand of the Deep the causeway
  const withBrands = brands => {
    const g = structuredClone(all);
    g.progress.brands = g.progress.brands.filter(b => !GLOOM_BRANDS.includes(b)).concat(brands);
    return mapsOf(flood(g));
  };
  const before = withBrands([]);
  for (const id of ['murkway', 'willowmurk', 'rotbridge', 'bogmire', 'lanternfen', 'mothers-hollow', 'long-boardwalk']) assert.ok(before.has(id), `${id} is open before either Gloomfen Brand`);
  for (const id of ['misthollow', 'drowned-belfry', 'blackwater-reach', 'tidal-flats', 'causeway']) assert.ok(!before.has(id), `${id} is shut before the Brand of Lanterns, even with every key`);
  const lanterns = withBrands(['brand-of-lanterns']);
  for (const id of ['misthollow', 'drowned-belfry', 'blackwater-reach', 'tidal-flats']) assert.ok(lanterns.has(id), `${id} opens with the Brand of Lanterns`);
  assert.ok(!lanterns.has('causeway'), 'the causeway stays under the Blackwater until the Brand of the Deep');
  // before the third council nothing in the Gloomfen can be reached, even with every key
  const shut = structuredClone(all);
  shut.progress.brands = shut.progress.brands.filter(b => !GLOOM_BRANDS.includes(b));
  delete shut.progress.flags.story['council-3-done'];
  const seen = mapsOf(flood(shut));
  for (const id of GLOOM) assert.ok(!seen.has(id), `${id} stays sealed before the third council, even with every key`);
  // the fen stair and the causeway are the only ways between the Gloomfen and the rest of the world
  for (const id of GLOOM) {
    for (const x of MAPS[id].exits) {
      assert.ok(x.to && (!x.sealed || x.gate), `${id}/${x.id} is a way through`);
      if (MAPS[x.to].region !== 'gloomfen') assert.ok((id === 'murkway' && x.to === 'mossfall') || (id === 'causeway' && x.to === 'keep'), `${id}/${x.id} leaves the Gloomfen only for Mossfall or the Keep`);
    }
  }
  const up = anchor('mossfall', 'from-murkway'), home = anchor('keep', 'from-causeway');
  assert.ok(cellsOf({ area: stair.area }).some(([x, y]) => Math.abs(x - up.x) + Math.abs(y - up.y) === 1), 'the climb back up the fen stair lands beside it');
  assert.ok(cellsOf({ area: sw.area }).some(([x, y]) => Math.abs(x - home.x) + Math.abs(y - home.y) === 1), 'the road home lands beside keep-sw');
});

for (const starter of Object.keys(STARTERS)) {
  test(`reachability (${starter}): every GLOOM_PATH target from an Ironspire-complete party, with only the starter relic at the worst-case level`, () => {
    for (let i = 0; i < GP.length; i++) {
      const g = gloomStage(starter, i);
      const hit = ENTITY_OF[GP[i]];
      assert.ok(hit, `${GP[i]} is placed`);
      assert.equal(MAPS[hit.map].region, 'gloomfen', `${GP[i]} is in the Gloomfen`);
      const live = present(g, hit.map).find(e => e.id === hit.entity.id);
      assert.ok(live, `${GP[i]} is present when it is next (stage ${i})`);
      assert.ok(reaches(flood(g), hit.map, hit.entity), `${GP[i]} (${hit.map}) is reachable at stage ${i} (level 8)`);
    }
  });
}

test('no hard lock stands on the Gloomfen path; Hodge\'s bar waits on his toll, and Tamsin\'s gate on her duel (spec §2.2, A11, A12)', () => {
  for (let i = 0; i < GP.length; i++) {
    const g = gloomStage('cairnmaul', i, { keys: false });           // every hard lock shut
    const hit = ENTITY_OF[GP[i]];
    assert.ok(reaches(flood(g), hit.map, hit.entity), `${GP[i]} needs no key (stage ${i})`);
  }
  // until the toll is paid (or Hodge beaten) his bar keeps Tamsin and everything west of the channel out of reach
  const at = GP.indexOf('tamsin-rotbridge');
  const unpaid = gloomStage('cairnmaul', at);
  delete unpaid.progress.flags.story['toll-paid'];
  const r = flood(unpaid);
  assert.ok(reaches(r, 'rotbridge', MAPS.rotbridge.entities.find(e => e.id === 'rb-hodge')), 'Hodge sits on his stool on your side of the bar');
  assert.ok(!reaches(r, 'rotbridge', ENTITY_OF['tamsin-rotbridge'].entity) && !mapsOf(r).has('bogmire'), 'the bar holds the bridge until the toll is paid');
  const beaten = structuredClone(unpaid);
  beaten.progress.flags.beaten.hodge = 1;
  assert.ok(reaches(flood(beaten), 'rotbridge', ENTITY_OF['tamsin-rotbridge'].entity), 'beating Hodge lifts the bar too');
  // Tamsin's gate: a win or a yield opens it
  const duel = gloomStage('cairnmaul', at + 1);
  assert.ok(mapsOf(flood(duel)).has('bogmire'), 'past Tamsin once her duel is settled');
});

test('after each Gloomfen Brand, the re-armed fights never shut the way home from the Brand\'s lair', () => {
  for (const id of ['lantern-mother', 'blackwater-leviathan']) {
    const g = gloomStage('hearthbrand', GP.indexOf(id) + 1);          // the Brand is won: the region re-arms
    assert.ok(present(g, 'murkway').some(e => e.id === 'mk-leeches'), `after ${id} the leeches are back in their ford`);
    const hit = ENTITY_OF[id];
    const from = nextTo(g, hit.map, hit.entity);
    assert.ok(from, `${id} can be stood beside`);
    const r = flood(g, { from: [hit.map, ...from] });
    // every Gloomfen fire kindled on the way, and the Keep's own, stays reachable on foot (the Mother's Hollow has no
    // Hearthfire travel); after the Brand of the Deep the way home is the causeway
    const kindled = ['hearthstone-keep', ...Object.keys(HEARTHS).filter(h => MAPS[HEARTHS[h].map].region === 'gloomfen' && g.progress.flags.kindled[h])];
    assert.ok(kindled.length >= (id === 'lantern-mother' ? 5 : 9), `after ${id}: ${kindled.join(', ')}`);
    for (const fire of kindled) assert.ok(reaches(r, HEARTHS[fire].map, ENTITY_OF[fire].entity), `after ${id}, ${fire} is still reachable from the lair`);
    if (id === 'blackwater-leviathan') assert.ok(r.used.has('bm-causeway') || r.used.has('cw-n'), 'the causeway home is open');
    // and every re-armed road guard of the path behind stands beside its open gate
    const behind = GP.slice(0, GP.indexOf(id));
    let checked = 0;
    for (const m of GLOOM) for (const e of present(g, m)) if (e.kind === 'gate' && e.guard && behind.includes(e.guard)) { assert.equal(e.state, 'open', `after ${id}, ${m}/${e.id} stays open`); checked++; }
    assert.ok(checked >= (id === 'lantern-mother' ? 5 : 9), `after ${id}: ${checked} road gates checked`);
  }
});

test('world tables: GLOOM_PATH is spec §2.2\'s route and GLOOM_LEADS its leads, each placed once in the Gloomfen and reachable', () => {
  assert.deepEqual([...GP], ['mk-leeches', 'reed-shrine', 'mk-reedcutters', 'willow-hearth', 'wm-wights', 'toll-lamp', 'tamsin-rotbridge',
    'stilt-hearth', 'lf-moths', 'fen-cairn', 'lf-hags', 'lantern-mother', 'lb-drowned', 'bell-hearth', 'mh-salvage',
    'mh-ringers', 'wreck-fire', 'br-barge', 'flats-beacon', 'tf-bargemaster', 'blackwater-leviathan']);
  assert.deepEqual(JSON.parse(JSON.stringify(GLOOM_LEADS)), { willow: ['wm-willow'], grue: ['grue-hollow'], cantor: ['db-choir', 'cantor'], jaws: ['old-jaws'], hodge: ['hodge'] });
  const leads = Object.values(GLOOM_LEADS).flat();
  const placedIn = id => MAPS[ENTITY_OF[id]?.map]?.region;
  for (const id of [...GP, ...leads]) {
    assert.ok(ENCOUNTERS[id] && ENCOUNTERS[id].region === 'gloomfen', `${id} is a Gloomfen encounter`);
    assert.equal(placedIn(id), 'gloomfen', `${id} is placed in the Gloomfen`);
  }
  for (const id of Object.keys(ENCOUNTERS).filter(k => ENCOUNTERS[k].region === 'gloomfen')) assert.equal(placedIn(id), 'gloomfen', `${id} sits on a Gloomfen map`);
  const all = flood(openHeldLocks(allKeys({ brand: true })));
  for (const id of leads) assert.ok(reaches(all, ENTITY_OF[id].map, ENTITY_OF[id].entity), `the lead ${id} is reachable with every key`);
  // at the path's end the party that walked it (level 8, its starter relic, Domains as they stand) reaches every lead,
  // each lead's fights in their order (the Drowned Cantor waits behind his choir)
  for (const list of Object.values(GLOOM_LEADS)) {
    const g = gloomStage('stillwater-lance', GP.length);
    for (const id of list) {
      assert.ok(reaches(flood(openHeldLocks(structuredClone(g))), ENTITY_OF[id].map, ENTITY_OF[id].entity), `the lead ${id} is reachable at the path's end`);
      beat(g, id);
    }
  }
});

test('every Gloomfen entity is reachable with every key, and every lock in the Gloomfen has two keys (spec §2.7)', () => {
  const r = flood(openHeldLocks(allKeys({ brand: true })));
  for (const id of GLOOM) {
    for (const e of MAPS[id].entities) {
      if (['trigger', 'light', 'prop'].includes(e.kind) || (e.kind === 'encounter' && e.if)) continue;
      assert.ok(reaches(r, id, e), `${id}/${e.id} can be reached`);
    }
  }
  for (const type of ['bog', 'fog', 'blackwater', 'witch-ward']) {
    const L = LOCKS[type];
    assert.ok(L.powers.length >= 2 && L.domain.level > 0, `${type}: two relic keys and a Domain`);
  }
  // the new keys for older locks (spec §2.7)
  for (const [type, power] of [['darkness', 'mothers-light'], ['darkness', 'pearl-light'], ['mirage', 'hag-sight'], ['stream', 'gar-current'], ['boulder', 'haul'], ['bramble', 'willow-weep']]) {
    assert.ok(LOCKS[type].powers.includes(power), `${type} opens with ${power}`);
  }
  // the soft locks: the bog burns (3% a step, as the drift), the fog closes the sight to 3 tiles on a foggy map
  assert.deepEqual(LOCKS.bog.soft, { hpPct: 0.03 });
  assert.deepEqual(LOCKS.fog.soft, { vision: 3 });
  assert.equal(LOCKS.blackwater.soft, false);
  assert.equal(LOCKS['witch-ward'].soft, false);
  // the fog is a map flag, never a lock entity
  for (const id of GLOOM) assert.ok(!MAPS[id].entities.some(e => e.kind === 'lock' && e.lock === 'fog'), `${id}: no fog lock entity`);
});

// What spec §2.3 (with §2.5, §2.7, §3.1, §3.3) puts on each map: its biome, its Hearthfires (true = cold), its fights and
// their modes, at least this many locks of each type, and its people. Road-first (A3): every route and lead fight stands
// still (a block or a lair); only the zone packs roam.
const GLOOM_SPEC = {
  murkway: { biome: 'fen', fires: { 'reed-shrine': false }, fights: { 'mk-leeches': 'block', 'mk-reedcutters': 'block', 'mk-bogfolk': 'pack' }, locks: { bog: 3 }, npcs: [] },
  willowmurk: { biome: 'willow-village', fires: { 'willow-hearth': false }, fights: { 'wm-wights': 'block', 'wm-willow': 'lair' }, locks: { 'witch-ward': 1 }, npcs: ['moss', 'sedge', 'wm-villager'] },
  rotbridge: { biome: 'channel', fires: { 'toll-lamp': false }, fights: { hodge: 'block', 'tamsin-rotbridge': 'block', 'rb-gars': 'pack' }, locks: { blackwater: 1 }, npcs: ['hodge'] },
  bogmire: { biome: 'stilt-town', fires: { 'stilt-hearth': false }, fights: {}, locks: {}, npcs: ['gretch', 'nettie', 'pell', 'bm-watch'] },
  lanternfen: { biome: 'bog', fires: { 'fen-cairn': true }, fights: { 'lf-moths': 'block', 'lf-hags': 'block', 'lf-lights': 'pack', 'grue-hollow': 'lair' }, locks: { 'witch-ward': 1, bog: 1 }, npcs: [] },
  'mothers-hollow': { biome: 'drowned-grove', fires: {}, fights: { 'lantern-mother': 'lair' }, locks: {}, npcs: [] },
  'long-boardwalk': { biome: 'boardwalk', fires: {}, fights: { 'lb-drowned': 'block', 'lb-lights': 'pack' }, locks: { blackwater: 1 }, npcs: [] },
  misthollow: { biome: 'sunken-city', fires: { 'bell-hearth': true }, fights: { 'mh-salvage': 'block', 'mh-ringers': 'block' }, locks: { blackwater: 1 }, npcs: ['corvus'] },
  'drowned-belfry': { biome: 'belfry', fires: {}, fights: { 'db-choir': 'block', cantor: 'lair' }, locks: {}, npcs: [] },
  'blackwater-reach': { biome: 'channel', fires: { 'wreck-fire': true }, fights: { 'br-barge': 'block', 'br-gars': 'pack', 'old-jaws': 'lair' }, locks: { blackwater: 1 }, npcs: [] },
  'tidal-flats': { biome: 'mudflat', fires: { 'flats-beacon': false }, fights: { 'tf-bargemaster': 'block', 'blackwater-leviathan': 'lair' }, locks: {}, npcs: [] },
  causeway: { biome: 'causeway', fires: {}, fights: { 'cw-lights': 'pack' }, locks: {}, npcs: [] },
};

test('the Gloomfen maps hold what spec §2.3 puts on them', () => {
  assert.deepEqual(Object.keys(GLOOM_SPEC).sort(), [...GLOOM].sort());
  for (const [id, want] of Object.entries(GLOOM_SPEC)) {
    const m = MAPS[id], of = k => m.entities.filter(e => e.kind === k);
    assert.equal(m.biome, want.biome, `${id} biome`);
    assert.ok(m.lore.length >= 1, `${id} has lore for the Atlas`);
    assert.ok(m.roads?.length, `${id} declares its roads (spec A3)`);
    assert.equal(m.backdrop, id, `${id} fights on its own backdrop (spec §6.2)`);
    assert.deepEqual(Object.fromEntries(of('hearthfire').map(e => [e.id, !!e.cold])), want.fires, `${id} Hearthfires`);
    assert.deepEqual(Object.fromEntries(of('encounter').map(e => [e.id, e.mode])), want.fights, `${id} fights`);
    for (const [type, n] of Object.entries(want.locks)) assert.ok(of('lock').filter(e => e.lock === type).length >= n, `${id}: ${n} ${type}`);
    for (const npc of want.npcs) assert.ok(of('npc').some(e => e.npc === npc), `${id}: ${npc}`);
  }
  const on = (map, id) => MAPS[map].entities.find(e => e.id === id);
  // the music (spec §2.1): the fen track, but for the two towns, the causeway home and the two dungeons
  assert.deepEqual(GLOOM.filter(id => MAPS[id].music !== 'fen').map(id => [id, MAPS[id].music]).sort(),
    [['bogmire', 'town'], ['causeway', 'road'], ['drowned-belfry', 'dungeon'], ['mothers-hollow', 'dungeon'], ['willowmurk', 'town']]);
  // the fog (spec §4.4) and the dark: never both on one map; the two dungeons have no Hearthfire travel
  assert.deepEqual(GLOOM.filter(id => MAPS[id].fog).sort(), ['lanternfen', 'misthollow']);
  assert.deepEqual(GLOOM.filter(id => MAPS[id].dark).sort(), ['drowned-belfry', 'mothers-hollow']);
  for (const m of Object.values(MAPS)) assert.ok(!(m.fog && m.dark), `${m.id} is never both foggy and dark`);
  assert.deepEqual(GLOOM.filter(id => !MAPS[id].travel).sort(), ['drowned-belfry', 'mothers-hollow']);
  // the zones (spec §2.6), each fighting on its own map's backdrop
  assert.deepEqual(GLOOM.filter(id => MAPS[id].zone).map(id => [id, MAPS[id].zone]).sort(),
    [['blackwater-reach', 'blackwater'], ['causeway', 'causeway'], ['lanternfen', 'lanternfen'], ['long-boardwalk', 'boardwalk'], ['misthollow', 'misthollow'], ['murkway', 'murkway'], ['tidal-flats', 'tidal-flats']]);
  for (const [zone, map] of [['murkway', 'murkway'], ['lanternfen', 'lanternfen'], ['boardwalk', 'long-boardwalk'], ['misthollow', 'misthollow'], ['blackwater', 'blackwater-reach'], ['tidal-flats', 'tidal-flats'], ['causeway', 'causeway']]) {
    assert.equal(ZONES[zone].backdrop, map, `the ${zone} zone fights on ${map}'s backdrop`);
  }
  // Hodge's bar (spec A11, §2.2): no guard; Hodge the NPC sits beside it on your side; his fight starts only from his
  // toll dialogue, so its encounter never stands on the map by itself
  const bar = on('rotbridge', 'rb-toll-bar');
  assert.equal(bar.kind, 'gate');
  assert.deepEqual(bar.open, { any: [{ flag: 'toll-paid' }, { beaten: 'hodge' }] });
  assert.equal(bar.guard, undefined);
  const hodge = MAPS.rotbridge.entities.find(e => e.kind === 'npc' && e.npc === 'hodge');
  assert.ok(hodge && cellsOf(bar).some(([x, y]) => Math.max(Math.abs(x - hodge.at[0]), Math.abs(y - hodge.at[1])) === 1), 'Hodge sits beside his bar');
  const g = gloomStage('hearthbrand', GP.indexOf('toll-lamp') + 1);
  assert.ok(!present(g, 'rotbridge').some(e => e.kind === 'encounter' && e.enc === 'hodge'), 'Hodge\'s fight never stands on the map by itself');
  assert.deepEqual(on('rotbridge', 'hodge').at, hodge.at, 'his fight is placed where he sits');
  const tollChoices = (DIALOGUE[ENCOUNTERS.hodge.talk]?.choices || []).flatMap(c => c.do || []);
  assert.ok(tollChoices.some(e => e.fight === 'hodge'), 'his toll dialogue can start his fight');
  // Tamsin at Rotbridge holds the far half of the bridge: a win or a yield opens her gate, and she talks first
  const far = on('rotbridge', 'rb-far-gate');
  assert.deepEqual(far.open, { any: [{ beaten: 'tamsin-rotbridge' }, { flag: 'tamsin-yielded-4' }] });
  assert.equal(far.guard, 'tamsin-rotbridge');
  assert.equal(on('rotbridge', 'tamsin-rotbridge').talk, 'tamsin-rotbridge');
  assert.ok(bar.area[0] > far.area[2], 'Hodge\'s bar comes first from Willowmurk, Tamsin\'s gate on the bridge\'s far half');
  // after her fall (a win or a yield, spec A12) she is gone for good, the black barge with her, and her gate stands open
  const fell = structuredClone(gloomStage('hearthbrand', GP.indexOf('tamsin-rotbridge') + 1));
  fell.progress.flags.story['tamsin-fallen'] = true;
  const after = present(fell, 'rotbridge');
  assert.ok(!after.some(e => e.id === 'tamsin-rotbridge' || e.id === 'rb-black-barge'), 'Tamsin and the barge are gone after her fall');
  assert.equal(after.find(e => e.id === 'rb-far-gate')?.state, 'open', 'her gate stands open after her fall');
  // the gated exits (spec §2.2): the long boardwalk's east end and Bogmire's causeway, each with its sealed words and hint
  const lbE = MAPS['long-boardwalk'].exits.find(x => x.id === 'lb-e');
  assert.deepEqual(lbE.gate, { brand: 'brand-of-lanterns' });
  assert.equal(lbE.to, 'misthollow');
  assert.equal(lbE.sealed.text, 'The lights on the boardwalk won\'t let anyone past.');
  assert.equal(lbE.sealed.hint, 'The lights will go out when the Lantern Mother rests.');
  const bmC = MAPS.bogmire.exits.find(x => x.id === 'bm-causeway');
  assert.deepEqual(bmC.gate, { brand: 'brand-of-the-deep' });
  assert.equal(bmC.to, 'causeway');
  assert.ok(bmC.sealed.text && bmC.sealed.hint, 'Bogmire\'s causeway says why it is shut and what opens it');
  // Bogmire: the board, the four ways out
  assert.equal(on('bogmire', 'bm-board')?.opens, 'bounties', 'the Bogmire board');
  assert.deepEqual(MAPS.bogmire.exits.map(x => x.to).sort(), ['causeway', 'lanternfen', 'long-boardwalk', 'rotbridge']);
  // the leads' locks (spec §2.3): Grandfather Willow and Mother Grue behind witch-wards, Old Jaws behind a dock; the
  // Lanternfen's chest behind a bog stretch
  for (const [map, lock, fight] of [['willowmurk', 'wm-witch-ward', 'wm-willow'], ['lanternfen', 'lf-witch-ward', 'grue-hollow'], ['blackwater-reach', 'br-pond-dock', 'old-jaws']]) {
    const g2 = openHeldLocks(allKeys({ brand: true }));
    const shut = structuredClone(g2);
    delete shut.progress.flags.unlocked[lock];
    assert.ok(reaches(flood(g2), map, on(map, fight)) && !reaches(flood(shut), map, on(map, fight)), `${fight} lies behind ${lock}`);
  }
  assert.equal(on('lanternfen', 'lf-bog')?.lock, 'bog');
  assert.equal(on('lanternfen', 'lf-boots')?.text, 'Small bootprints, all going one way.');
  assert.equal(on('murkway', 'mk-sign')?.text, 'Willowmurk. Keep to the path. The path keeps to you.');
  // Willowmurk's ring of ward-stones: three dark until the wards are mended
  const stones = MAPS.willowmurk.entities.filter(e => e.kind === 'sign' && String(e.look).startsWith('ward-stone'));
  assert.equal(stones.filter(e => e.look === 'ward-stone-dark').length, 3, 'three dark ward-stones');
  for (const e of stones.filter(x => x.look === 'ward-stone-dark')) assert.deepEqual(e.if, { not: { flag: 'wards-mended' } });
  // the props the scenes use: the black barge (until Tamsin's fall), the children asleep (until the Brand of
  // Lanterns), the Sleeper under the Belfry's floor, the sealed chest (until the salvage crew is beaten)
  assert.deepEqual(on('rotbridge', 'rb-black-barge')?.if, { not: { flag: 'tamsin-fallen' } });
  assert.ok(MAPS['mothers-hollow'].entities.filter(e => e.prop === 'sleeping-child' && e.if?.not?.brand === 'brand-of-lanterns').length >= 3, 'the children asleep in the lamplight');
  assert.ok(on('drowned-belfry', 'sleeper')?.kind === 'prop' && !on('drowned-belfry', 'sleeper').solid, 'the Sleeper, under the floor');
  assert.deepEqual(on('misthollow', 'mh-sealed-chest')?.if, { not: { beaten: 'mh-salvage' } });
  // the Champions' lairs are 3 by 2, and every big lair carries its sprite foot inside its footprint
  for (const [map, id] of [['mothers-hollow', 'lantern-mother'], ['tidal-flats', 'blackwater-leviathan']]) {
    const [x0, y0, x1, y1] = on(map, id).area;
    assert.deepEqual([x1 - x0 + 1, y1 - y0 + 1], [3, 2], `${id}'s footprint`);
  }
  for (const id of GLOOM) for (const e of MAPS[id].entities) if (e.kind === 'encounter' && e.area) assert.ok(covers(e, e.at[0], e.at[1]), `${id}/${e.id} stands in its footprint`);
  // the stair down to the Drowned Belfry lies past the salvage camp's chain, in the old city
  assert.equal(MAPS.misthollow.exits.find(x => x.id === 'mh-belfry')?.to, 'drowned-belfry');
});

// Spec §2.2's table of roads (A3): each road from its anchor to its exit (or up to its fight), with its gates in the
// order you meet them, named by their guards (Hodge's bar has none: by its id).
const GLOOM_ROADS = [
  ['murkway', 'from-mossfall', 'mk-s', ['mk-leeches', 'mk-reedcutters']],
  ['willowmurk', 'from-murkway', 'wm-w', ['wm-wights']],
  ['willowmurk', 'from-rotbridge', 'wm-willow', []],
  ['rotbridge', 'from-willowmurk', 'rb-w', ['rb-toll-bar', 'tamsin-rotbridge']],
  ['lanternfen', 'from-bogmire', 'lf-n', ['lf-moths', 'lf-hags']],
  ['long-boardwalk', 'from-bogmire', 'lb-e', ['lb-drowned']],
  ['misthollow', 'from-boardwalk', 'mh-s', ['mh-salvage', 'mh-ringers']],
  ['drowned-belfry', 'from-misthollow', 'cantor', ['db-choir']],
  ['blackwater-reach', 'from-misthollow', 'br-w', ['br-barge']],
  ['tidal-flats', 'from-reach', 'blackwater-leviathan', ['tf-bargemaster']],
];

test('the Gloomfen roads are spec §2.2\'s, gate by gate, and every Gloomfen gate stands on one of them', () => {
  for (const [id, from, to, guards] of GLOOM_ROADS) {
    const m = MAPS[id];
    const road = (m.roads || []).find(r => r.from === from && r.to === to);
    assert.ok(road, `${id}: a road from ${from} to ${to}`);
    const named = road.gates.map(g => { const e = m.entities.find(x => x.id === g); return e?.guard || e?.id; });
    assert.deepEqual(named, guards, `${id}: ${from} -> ${to} passes ${guards.join(', ') || 'no gate'}, in that order`);
  }
  // no gate stands off the roads: each one holds a road the road test walks
  for (const id of GLOOM) {
    for (const e of MAPS[id].entities.filter(x => x.kind === 'gate')) {
      assert.ok((MAPS[id].roads || []).some(r => r.gates.includes(e.id)), `${id}/${e.id} holds one of ${id}'s roads`);
    }
  }
});

test('Gloomfen chests: a little silver, gems and materials by real ids, bog amber only in the Gloomfen, embers behind a key, no relic', () => {
  const chests = GLOOM.flatMap(id => MAPS[id].entities.filter(e => e.kind === 'chest').map(e => ({ map: id, e })));
  assert.ok(chests.length >= 10, `${chests.length} chests`);
  const open = openHeldLocks(allKeys({ brand: true }));
  const behindKey = (map, e) => {
    const g = structuredClone(open);
    for (const x of MAPS[map].entities) if (x.kind === 'lock' && !LOCKS[x.lock].soft) delete g.progress.flags.unlocked[x.id];
    return !reaches(flood(g), map, e);
  };
  for (const { map, e } of chests) {
    for (const [k, n] of Object.entries(e.loot.materials || {})) assert.ok(MATERIALS[k] && n >= 1 && n <= 2, `${map}/${e.id}: ${k} x${n}`);
    for (const [k, n] of Object.entries(e.loot.gems || {})) assert.ok(GEMS[k] && n >= 1 && n <= 2, `${map}/${e.id}: ${k} x${n}`);
    assert.ok(!e.loot.gems?.['ash-garnet'] && !e.loot.gems?.['frost-opal'], `${e.id}: no Sunscorch or Ironspire gem in the fen`);
    if (e.loot.materials?.embers) assert.ok(e.hidden || e.lock || behindKey(map, e), `${e.id}: embers are well hidden (hidden, or behind a key)`);
    assert.ok(!e.loot.relic && (e.loot.items || []).every(it => !it.base || !RELICS[it.base]), `${e.id}: no chest duplicates a relic`);
  }
  // bog amber drops only in the Gloomfen (spec §3.7)
  for (const m of Object.values(MAPS)) for (const e of m.entities) if (e.kind === 'chest' && e.loot.gems?.['bog-amber']) assert.equal(m.region, 'gloomfen', `${m.id}/${e.id}: bog amber only in the Gloomfen`);
  assert.ok(chests.filter(({ e }) => e.loot.materials?.silver).length * 2 >= chests.length, 'most hold a little silver');
  assert.ok(chests.filter(({ e }) => e.loot.gems?.['bog-amber']).length >= 3, 'the fen pays in bog amber');
});

// ---- M7: the Hearth Below (spec §2, §8) -------------------------------------------------------------------------

const AP = ACT3_PATH;
const BELOW = MAP_IDS.filter(id => MAPS[id].region === 'below');
const COUNCIL = ['hollow-miravel', 'hollow-qasim', 'hollow-brundar', 'hollow-gretch'];

// A Gloomfen-complete party (spec §2.2, §8): the M3 to M6 critical paths behind it (all eight Brands, the Waking at 8,
// every earlier Act's flags and duels), the fourth council sat and the fifth, at level 8 (the worst case the earlier
// tests allow; nothing says it has levelled since), with only its starter relic. Then the first i ACT3_PATH targets
// are beaten. `keys` opens every lock whose key the party holds.
function belowStage(starter, i, { keys = true } = {}) {
  const g = structuredClone(newGame({ name: 'Map', starter, seed: 11 }));
  setLevels(g, 8);
  for (const id of [...CP, ...SP, ...IP, ...GP]) beat(g, id);
  Object.assign(g.progress.flags.story, { 'council-2-done': true, 'met-wynn': true, 'highfold-open': true, 'council-3-done': true,
    'toll-paid': true, 'tamsin-fallen': true, 'council-4-done': true, 'council-5-done': true });
  giveRuneKey(g);
  for (let j = 0; j < i; j++) beat(g, AP[j]);
  return keys ? openHeldLocks(g) : g;
}

test('the Hearth Below opens down the Great Hall\'s vault stair once the fifth council is sat, and not before (spec §2.2, §2.4, A5)', () => {
  const down = MAPS['keep-hall'].exits.find(x => x.id === 'hall-down');
  assert.deepEqual(down.area, [21, 8, 22, 8], 'the vault\'s two floor tiles');
  assert.deepEqual(down.gate, { flag: 'council-5-done' });
  assert.equal(down.to, 'hollow-hall');
  assert.equal(down.anchor, 'from-vault');
  assert.equal(down.sealed.region, 'below');
  assert.ok(down.sealed.text && down.sealed.hint, 'the vault floor says why it is shut and what opens it');
  assert.deepEqual(REGIONS.below.entries, ['hall-down']);
  assert.equal(REGIONS.below.act, 3);
  assert.deepEqual(REGIONS.below.brands, []);
  assert.equal(BELOW.length, 4);
  // every key: all four maps, down the vault stair
  const all = openHeldLocks(allKeys({ brand: true }));
  const r = flood(all);
  assert.ok(r.used.has('hall-down'), 'the fill goes down the vault stair');
  for (const id of BELOW) assert.ok(mapsOf(r).has(id), `${id} is reachable once the fifth council is sat`);
  // before the fifth council nothing below can be reached, even with every key
  const shut = structuredClone(all);
  delete shut.progress.flags.story['council-5-done'];
  const seen = mapsOf(flood(shut));
  for (const id of BELOW) assert.ok(!seen.has(id), `${id} stays sealed before the fifth council, even with every key`);
  // the vault stair is the only way between the Hearth Below and the rest of the world
  for (const id of BELOW) {
    for (const x of MAPS[id].exits) {
      assert.ok(x.to && (!x.sealed || x.gate), `${id}/${x.id} is a way through`);
      if (MAPS[x.to].region !== 'below') assert.ok(id === 'hollow-hall' && x.id === 'hh-up' && x.to === 'keep-hall', `${id}/${x.id} leaves the Hearth Below only up the vault stair`);
    }
  }
  const up = anchor('keep-hall', 'from-below');
  assert.deepEqual([up.x, up.y, up.face], [21, 7, 'w']);
  assert.ok(cellsOf({ area: down.area }).some(([x, y]) => Math.abs(x - up.x) + Math.abs(y - up.y) === 1), 'the climb back up lands beside the vault stair');
  // the vault (spec §2.4): the boxes on its back row, soot-sealed after the fourth council and open after the fifth, both
  // solid; the stair, not solid, on the exit's tiles once the fifth council is sat; the way from the vault door to the
  // stair, (20,7) to (21,7) to (21,8), stays open; and the fifth council's trigger is guarded by its flags, never once
  const on = id => MAPS['keep-hall'].entities.find(e => e.id === id);
  assert.deepEqual(on('vault-boxes').area, [21, 6, 22, 6]);
  assert.deepEqual(on('vault-boxes').if, { all: [{ flag: 'council-4-done' }, { not: { flag: 'council-5-done' } }] });
  assert.deepEqual(on('vault-boxes-open').area, [21, 6, 22, 6]);
  assert.deepEqual(on('vault-boxes-open').if, { flag: 'council-5-done' });
  assert.ok(on('vault-boxes').solid && on('vault-boxes-open').solid, 'the boxes are solid');
  assert.deepEqual(on('vault-stair').area, down.area);
  assert.deepEqual(on('vault-stair').if, { flag: 'council-5-done' });
  assert.ok(!on('vault-stair').solid, 'the vault stair is not solid');
  const trig = on('council-5');
  assert.equal(trig.kind, 'trigger');
  assert.deepEqual(trig.if, { all: [{ flag: 'council-4-done' }, { not: { flag: 'council-5-done' } }] });
  assert.ok(!trig.once, 'the fifth council\'s trigger is guarded by its flags, never once');
  const opening = structuredClone(shut);
  for (const g of [opening, all]) {
    for (const [x, y] of [[20, 7], [21, 7], [21, 8], [22, 8]]) assert.ok(canWalk(g, 'keep-hall', x, y), `keep-hall (${x},${y}) is open${g === all ? ' after the fifth council' : ''}`);
  }
  assert.ok(present(opening, 'keep-hall').some(e => e.id === 'vault-boxes') && !present(opening, 'keep-hall').some(e => e.id === 'vault-stair'), 'before the fifth council: the sealed boxes, and no stair');
  assert.ok(present(all, 'keep-hall').some(e => e.id === 'vault-boxes-open') && present(all, 'keep-hall').some(e => e.id === 'vault-stair'), 'after it: the boxes open, and the stair');
});

test('the stair back (hh-up) is open before the first Council fight, shut from Miravel until Gretch is beaten, and open again after (spec §2.2, A11)', () => {
  const back = MAPS['hollow-hall'].exits.find(x => x.id === 'hh-up');
  assert.deepEqual(back.gate, { any: [{ not: { beaten: 'hollow-miravel' } }, { beaten: 'hollow-gretch' }] });
  assert.equal(back.to, 'keep-hall');
  assert.equal(back.anchor, 'from-below');
  assert.equal(`${back.sealed.text} ${back.sealed.hint}`, 'The stair behind you has filled with ash. The Hollow Council sits until the last chair is empty.');
  const foot = anchor('hollow-hall', 'from-vault');
  assert.ok(cellsOf({ area: back.area }).some(([x, y]) => Math.abs(x - foot.x) + Math.abs(y - foot.y) === 1), 'the stair\'s foot is beside the way back up');
  assert.deepEqual(AP.slice(1, 5), COUNCIL, 'the Council, back to back, in the order of their chairs');
  for (let i = 1; i <= AP.indexOf('hollow-gretch') + 1; i++) {
    const g = belowStage('hearthbrand', i);
    const r = flood(g, { from: ['hollow-hall', foot.x, foot.y] });
    const sitting = i > AP.indexOf('hollow-miravel') && i <= AP.indexOf('hollow-gretch');
    assert.equal(r.used.has('hh-up'), !sitting, `stage ${i}: the stair back is ${sitting ? 'shut' : 'open'}`);
    assert.equal(mapsOf(r).has('keep-hall'), !sitting, `stage ${i}: the Great Hall is ${sitting ? 'out of reach' : 'a climb away'}`);
  }
});

for (const starter of Object.keys(STARTERS)) {
  test(`reachability (${starter}): every ACT3_PATH target from a Gloomfen-complete party, with only the starter relic at the worst-case level`, () => {
    for (let i = 0; i < AP.length; i++) {
      const g = belowStage(starter, i);
      const hit = ENTITY_OF[AP[i]];
      assert.ok(hit, `${AP[i]} is placed`);
      // the Act begins with a rest at the Eternal Hearth, in the Great Hall; everything after it lies below
      assert.equal(MAPS[hit.map].region, i === 0 ? 'verdant' : 'below', `${AP[i]} is ${i === 0 ? 'the Keep\'s' : 'in the Hearth Below'}`);
      const live = present(g, hit.map).find(e => e.id === hit.entity.id);
      assert.ok(live, `${AP[i]} is present when it is next (stage ${i})`);
      assert.ok(reaches(flood(g), hit.map, hit.entity), `${AP[i]} (${hit.map}) is reachable at stage ${i} (level 8)`);
    }
  });
}

test('no lock stands on the Act III road or anywhere below: every door on it is a fight or a story flag (spec §2.7)', () => {
  for (let i = 0; i < AP.length; i++) {
    const g = belowStage('cairnmaul', i, { keys: false });           // every hard lock shut
    const hit = ENTITY_OF[AP[i]];
    assert.ok(reaches(flood(g), hit.map, hit.entity), `${AP[i]} needs no key (stage ${i})`);
  }
  for (const id of BELOW) assert.ok(!MAPS[id].entities.some(e => e.kind === 'lock' || e.lock), `${id}: no lock`);
});

test('world tables: ACT3_PATH is spec §2.2\'s route and Act III has no leads, each target placed once below and reachable', () => {
  assert.deepEqual([...AP], ['hearthstone-keep', 'hollow-miravel', 'hollow-qasim', 'hollow-brundar', 'hollow-gretch', 'under-coal',
    'as-thralls', 'cd-unmade', 'chain-fire', 'wf-warden', 'unsmith']);
  assert.deepEqual(JSON.parse(JSON.stringify(ACT3_LEADS)), {});
  const placedIn = id => MAPS[ENTITY_OF[id]?.map]?.region;
  for (const id of AP.slice(1)) {
    assert.ok(ENCOUNTERS[id] && ENCOUNTERS[id].region === 'below', `${id} is a Hearth Below encounter`);
    assert.equal(placedIn(id), 'below', `${id} is placed in the Hearth Below`);
  }
  for (const id of Object.keys(ENCOUNTERS).filter(k => ENCOUNTERS[k].region === 'below')) assert.equal(placedIn(id), 'below', `${id} sits on a Hearth Below map`);
  // the road ends at the finale (spec §3.3, A3)
  assert.equal(AP.at(-1), 'unsmith');
  assert.equal(ENCOUNTERS.unsmith.finale, true);
  assert.deepEqual(Object.keys(ENCOUNTERS).filter(k => ENCOUNTERS[k].finale), ['unsmith'], 'one finale');
  const r = flood(belowStage('hearthbrand', AP.length));
  for (const id of AP) assert.ok(reaches(r, ENTITY_OF[id].map, ENTITY_OF[id].entity), `${id} is still reachable at the road's end`);
});

test('every Hearth Below entity is reachable with every key', () => {
  const r = flood(openHeldLocks(allKeys({ brand: true })));
  for (const id of BELOW) {
    for (const e of MAPS[id].entities) {
      if (['trigger', 'light', 'prop'].includes(e.kind) || (e.kind === 'encounter' && e.if)) continue;
      assert.ok(reaches(r, id, e), `${id}/${e.id} can be reached`);
    }
  }
});

// What spec §2.3 (with §2.5, §2.6, §3.1, §3.3) puts on each map: its biome and backdrop, its Hearthfires (true = cold), its
// fights and their modes, and its people. Road-first (A3): every route fight stands still (a block or a lair); only the
// zone's packs roam. Each map fights on its own backdrop (spec §6.2, P6's) and walks on its own biome (spec §6.1, P5's
// art/tiles.js: council, hearth-roots, chains and worldforge).
const ACT3_SPEC = {
  'hollow-hall': { biome: 'council', backdrop: 'hollow-hall', fires: {}, fights: { 'hollow-miravel': 'block', 'hollow-qasim': 'block', 'hollow-brundar': 'block', 'hollow-gretch': 'block' }, npcs: [] },
  'ash-stair': { biome: 'hearth-roots', backdrop: 'ash-stair', fires: { 'under-coal': true }, fights: { 'as-thralls': 'block', 'as-patrol': 'pack' }, npcs: [] },
  'chained-deep': { biome: 'chains', backdrop: 'chained-deep', fires: { 'chain-fire': false }, fights: { 'cd-unmade': 'block' }, npcs: ['tamsin'] },
  worldforge: { biome: 'worldforge', backdrop: 'worldforge', fires: {}, fights: { 'wf-warden': 'block', unsmith: 'lair' }, npcs: [] },
};

test('the Hearth Below maps hold what spec §2.3 puts on them', () => {
  assert.deepEqual(Object.keys(ACT3_SPEC).sort(), [...BELOW].sort());
  for (const [id, want] of Object.entries(ACT3_SPEC)) {
    const m = MAPS[id], of = k => m.entities.filter(e => e.kind === k);
    assert.equal(m.biome, want.biome, `${id} biome`);
    assert.equal(m.backdrop, want.backdrop, `${id} backdrop`);
    assert.ok(m.lore.length >= 1, `${id} has lore for the Atlas`);
    assert.deepEqual([m.lore[0][0], m.lore[0][1]], REGIONS.below.lore, `${id}'s "you are here" is the Keep's point (spec §2.1)`);
    assert.ok(m.roads?.length, `${id} declares its roads (spec A3)`);
    assert.ok(!m.dark && !m.fog, `${id} is neither dark nor foggy: the Act III road needs no light key`);
    assert.deepEqual(Object.fromEntries(of('hearthfire').map(e => [e.id, !!e.cold])), want.fires, `${id} Hearthfires`);
    assert.deepEqual(Object.fromEntries(of('encounter').map(e => [e.id, e.mode])), want.fights, `${id} fights`);
    for (const npc of want.npcs) assert.ok(of('npc').some(e => e.npc === npc), `${id}: ${npc}`);
  }
  const on = (map, id) => MAPS[map].entities.find(e => e.id === id);
  // the sizes (spec §2.1: the painting shapes batch 4 asks for, 3:2 or 2:3)
  assert.deepEqual(BELOW.map(id => [id, MAPS[id].w, MAPS[id].h]).sort(), [['ash-stair', 24, 36], ['chained-deep', 42, 28], ['hollow-hall', 36, 24], ['worldforge', 36, 24]]);
  // the music (spec §2.1): the dungeon track, and the boss track at the Worldforge
  assert.deepEqual(BELOW.map(id => [id, MAPS[id].music]).sort(), [['ash-stair', 'dungeon'], ['chained-deep', 'dungeon'], ['hollow-hall', 'dungeon'], ['worldforge', 'boss']]);
  // the zone (spec §2.6): the Ash Stair's cinder-thrall packs, rabble, 2 to 3 a pack
  assert.deepEqual(BELOW.filter(id => MAPS[id].zone).map(id => [id, MAPS[id].zone]), [['ash-stair', 'ash-stair']]);
  assert.equal(ZONES['ash-stair'].sets, 'ash-stair');
  for (const set of PATROLS['ash-stair']) {
    assert.ok(set.length >= 2 && set.length <= 3, 'two to three a pack');
    for (const sp of set) assert.equal(sp.family, 'cinder-thrall', 'the packs are cinder-thralls');
  }
  // the Hollow Hall (spec §2.3): the four gates across the nave, each held by its Council member, who stands beside it
  // facing the stair; the four chairs; the alms chest
  COUNCIL.forEach((enc, k) => {
    const gate = on('hollow-hall', `hh-gate-${k + 1}`);
    assert.equal(gate.kind, 'gate');
    assert.deepEqual(gate.open, { beaten: enc });
    assert.equal(gate.guard, enc);
    assert.equal(gate.look, 'hollow-gate');
    const who = on('hollow-hall', enc);
    assert.equal(who.mode, 'block');
    assert.equal(who.face, 'w', `${enc} faces the stair`);
    assert.ok(cellsOf(gate).some(([x, y]) => Math.abs(x - who.at[0]) + Math.abs(y - who.at[1]) === 1), `${enc} stands beside hh-gate-${k + 1}`);
  });
  const gx = COUNCIL.map((enc, k) => on('hollow-hall', `hh-gate-${k + 1}`).area[0]);
  assert.deepEqual([...gx].sort((a, b) => a - b), gx, 'the gates in the order you meet them from the stair');
  for (const chair of ['hh-chair-verdant', 'hh-chair-sunscorch', 'hh-chair-ironspire', 'hh-chair-gloomfen']) assert.equal(on('hollow-hall', chair)?.kind, 'sign', chair);
  assert.equal(on('hollow-hall', 'hh-alms')?.kind, 'chest');
  // the Ash Stair: the Under-Coal (cold) above the narrows, whose gate the cinder-thralls hold; the side ledge's chest
  assert.deepEqual(on('ash-stair', 'as-ash-gate').open, { beaten: 'as-thralls' });
  assert.equal(on('ash-stair', 'as-ash-gate').guard, 'as-thralls');
  assert.ok(on('ash-stair', 'under-coal').at[1] < on('ash-stair', 'as-ash-gate').area[1], 'the Under-Coal is on the first landing, above the narrows');
  assert.equal(on('ash-stair', 'as-cache')?.kind, 'chest');
  // the Chained Deep: the chain gate the unmade hold, the Chain Fire past it, the First Sleeper (a large solid prop), the
  // three chains out, and Tamsin before the forge door until she joins
  assert.deepEqual(on('chained-deep', 'cd-chain-gate').open, { beaten: 'cd-unmade' });
  assert.equal(on('chained-deep', 'cd-chain-gate').guard, 'cd-unmade');
  assert.ok(on('chained-deep', 'chain-fire').at[0] > on('chained-deep', 'cd-chain-gate').area[2], 'the Chain Fire is past the narrows');
  // the First Sleeper: one solid prop, drawn once at its foot (M6's rule for a large sprite: the view draws a prop on every
  // tile of an `area`), deep in its solid hollow: every tile within 3 of its foot is solid, so it is large and nobody
  // walks under it
  const sleeper = on('chained-deep', 'sleeper-first');
  assert.ok(sleeper.kind === 'prop' && sleeper.prop === 'sleeper-first' && sleeper.solid && sleeper.at && !sleeper.area, 'the First Sleeper, one solid prop at its foot');
  const [sx, sy] = sleeper.at, deep = MAPS['chained-deep'];
  const hollow = cellsOf({ area: [sx - 3, sy - 3, sx + 3, sy + 3] }).filter(([x, y]) => x !== sx || y !== sy);
  assert.ok(hollow.length === 48 && hollow.every(([x, y]) => solidTile(deep, x, y)), 'the First Sleeper, large and solid: its hollow is solid all round it');
  for (const chain of ['cd-chain-lull', 'cd-chain-ash', 'cd-chain-hush']) assert.equal(on('chained-deep', chain)?.kind, 'sign', chain);
  const tamsin = on('chained-deep', 'cd-tamsin');
  assert.equal(tamsin.npc, 'tamsin');
  assert.deepEqual(tamsin.if, { not: { flag: 'tamsin-returned' } });
  const g = belowStage('hearthbrand', AP.indexOf('chain-fire') + 1);
  assert.ok(present(g, 'chained-deep').some(e => e.id === 'cd-tamsin'), 'Tamsin waits before the forge door');
  const joined = structuredClone(g);
  joined.progress.flags.story['tamsin-returned'] = true;
  assert.ok(!present(joined, 'chained-deep').some(e => e.id === 'cd-tamsin'), 'she leaves the map once she has joined');
  // the Worldforge: the bridge gate the forge-warden holds; the Unsmith's lair, 3 by 2 with his foot inside it, the
  // finale; the heart behind him
  assert.deepEqual(on('worldforge', 'wf-bridge-gate').open, { beaten: 'wf-warden' });
  assert.equal(on('worldforge', 'wf-bridge-gate').guard, 'wf-warden');
  const lair = on('worldforge', 'unsmith');
  const [x0, y0, x1, y1] = lair.area;
  assert.deepEqual([x1 - x0 + 1, y1 - y0 + 1], [3, 2], 'the Unsmith\'s footprint');
  assert.ok(covers(lair, lair.at[0], lair.at[1]), 'his sprite\'s foot is inside it');
  assert.equal(on('worldforge', 'wf-heart')?.kind, 'sign');
  assert.ok(on('worldforge', 'wf-heart').at[0] > x1, 'the heart is behind him');
  // the chests pay no relic, in real materials and gems
  for (const id of BELOW) {
    for (const e of MAPS[id].entities.filter(x => x.kind === 'chest')) {
      for (const [k, n] of Object.entries(e.loot.materials || {})) assert.ok(MATERIALS[k] && n >= 1, `${id}/${e.id}: ${k} x${n}`);
      for (const [k, n] of Object.entries(e.loot.gems || {})) assert.ok(GEMS[k] && n >= 1, `${id}/${e.id}: ${k} x${n}`);
      assert.ok(!e.loot.relic && (e.loot.items || []).every(it => !it.base || !RELICS[it.base]), `${e.id}: no chest duplicates a relic`);
    }
  }
});

// Spec §2.2's table of roads (A3): each road from its anchor to its exit (or up to its fight), with its gates in the
// order you meet them, named by their guards.
const ACT3_ROADS = [
  ['hollow-hall', 'from-vault', 'hh-down', ['hollow-miravel', 'hollow-qasim', 'hollow-brundar', 'hollow-gretch']],
  ['ash-stair', 'from-hall', 'as-down', ['as-thralls']],
  ['chained-deep', 'from-stair', 'cd-forge', ['cd-unmade']],
  ['worldforge', 'from-deep', 'unsmith', ['wf-warden']],
];

test('the Hearth Below roads are spec §2.2\'s, gate by gate, and every gate below stands on one of them', () => {
  for (const [id, from, to, guards] of ACT3_ROADS) {
    const m = MAPS[id];
    const road = (m.roads || []).find(r => r.from === from && r.to === to);
    assert.ok(road, `${id}: a road from ${from} to ${to}`);
    const named = road.gates.map(g => { const e = m.entities.find(x => x.id === g); return e?.guard || e?.id; });
    assert.deepEqual(named, guards, `${id}: ${from} -> ${to} passes ${guards.join(', ') || 'no gate'}, in that order`);
  }
  for (const id of BELOW) {
    for (const e of MAPS[id].entities.filter(x => x.kind === 'gate')) {
      assert.ok((MAPS[id].roads || []).some(r => r.gates.includes(e.id)), `${id}/${e.id} holds one of ${id}'s roads`);
    }
  }
});

// ---- M7: the layouts batch 4 describes (art-requests/batch-4/places.md), place by place ---------------------------

// The tiles a party can walk to on one map from (x, y), through the engine's canWalk (the walk stops on an exit).
function reachOn(g, mapId, [x, y]) {
  const m = MAPS[mapId], seen = new Set([`${x},${y}`]), q = [[x, y]];
  while (q.length) {
    const [cx, cy] = q.pop();
    if ((cx !== x || cy !== y) && m.exits.some(ex => covers(ex, cx, cy))) continue;
    for (const [d, [dx, dy]] of Object.entries(DIRS)) {
      const nx = cx + dx, ny = cy + dy, k = `${nx},${ny}`;
      if (seen.has(k) || !canWalk(g, mapId, nx, ny, { dir: d })) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}
// you can stand beside it (and face it)
const besideIn = (set, e) => cellsOf(e).some(([x, y]) => Object.values(DIRS).some(([dx, dy]) => set.has(`${x + dx},${y + dy}`)));
const fromAnchor = (map, name) => { const a = anchor(map, name); return [a.x, a.y]; };

test('the Hearth Below is laid out as batch 4 describes it: the ways in and on, the nave and its chairs, the landings and the narrows, the floors round the Sleeper, the moat and the bridge', () => {
  const ent = (map, id) => MAPS[map].entities.find(e => e.id === id);
  const exit = (map, id) => MAPS[map].exits.find(e => e.id === id);
  const midOf = e => { const [x0, y0, x1, y1] = areaOf(e); return [(x0 + x1) / 2, (y0 + y1) / 2]; };

  // The Hollow Hall: the stair in (three wide) at the bottom edge near the west end, the stair down (three wide) at the
  // east end by the east wall; each soot line and its keeper fill the nave, five wide, the same five rows all along; the
  // chairs alternate sides (the tree north, the sun south, the anvil north, the lantern south), west to east, each
  // behind its line; the alms chest in the north wall past the fourth chair
  const hall = MAPS['hollow-hall'];
  const hhUp = exit('hollow-hall', 'hh-up'), hhDown = exit('hollow-hall', 'hh-down');
  assert.ok(hhUp.area[3] === hall.h - 1 && hhUp.area[2] < hall.w / 3 && hhUp.area[2] - hhUp.area[0] + 1 === 3, 'the stair in: three wide, at the bottom edge near the west end');
  assert.ok(hhDown.area[0] >= hall.w - 5 && hhDown.area[3] - hhDown.area[1] + 1 === 3, 'the stair down: three wide, at the east end by the east wall');
  const nave = COUNCIL.map((enc, k) => {
    const gate = ent('hollow-hall', `hh-gate-${k + 1}`), who = ent('hollow-hall', enc);
    const cells = [...cellsOf(gate), who.at];
    assert.ok(cells.every(([x]) => x === gate.area[0]), `hh-gate-${k + 1} and ${enc} stand across the nave`);
    return cells.map(([, y]) => y).sort((a, b) => a - b);
  });
  for (const ys of nave) assert.deepEqual(ys, nave[0], 'the nave keeps its five rows all along');
  assert.deepEqual(nave[0], [0, 1, 2, 3, 4].map(k => nave[0][0] + k), 'each soot line and its keeper fill the nave, five wide');
  const [naveTop, naveBottom] = [nave[0][0], nave[0][4]];
  const chairs = ['hh-chair-verdant', 'hh-chair-sunscorch', 'hh-chair-ironspire', 'hh-chair-gloomfen'].map(id => ent('hollow-hall', id));
  chairs.forEach((c, k) => {
    assert.ok(k % 2 === 0 ? c.at[1] < naveTop - 1 : c.at[1] > naveBottom + 1, `${c.id}: in a bay behind the ${k % 2 === 0 ? 'north' : 'south'} pillars`);
    assert.ok(Math.abs(c.at[0] - ent('hollow-hall', `hh-gate-${k + 1}`).area[0]) <= 2, `${c.id}: its soot line crosses the nave before it`);
    const who = ent('hollow-hall', COUNCIL[k]);
    assert.ok(k % 2 === 0 ? who.at[1] === naveTop : who.at[1] === naveBottom, `${COUNCIL[k]} stands at the soot line's end on the side of the chair`);
  });
  const alms = ent('hollow-hall', 'hh-alms');
  assert.ok(alms.at[0] > ent('hollow-hall', 'hh-gate-4').area[0] && alms.at[1] < naveTop, 'the alms chest: in the north wall, past the fourth chair');

  // The Ash Stair: in at the top edge left of centre, on at the bottom edge; the Under-Coal on the first landing (the
  // top third, east); the narrows three wide between two iron roots; two wide landings, one west in the middle third and
  // one east in the lower third; the cache off the middle landing, below the narrows (the way on reaches it with the
  // ash gate shut, the way in does not)
  const st = MAPS['ash-stair'];
  const asUp = exit('ash-stair', 'as-up'), asDown = exit('ash-stair', 'as-down');
  assert.ok(asUp.area[1] === 0 && midOf(asUp)[0] < st.w / 2, 'the way in: the top edge, left of centre');
  assert.ok(asDown.area[3] === st.h - 1, 'the way on: the bottom edge');
  const coal = ent('ash-stair', 'under-coal');
  assert.ok(coal.at[1] < st.h / 3 && coal.at[0] > st.w / 2, 'the Under-Coal: on the first landing, in the top third, east');
  const ash = ent('ash-stair', 'as-ash-gate'), [ax0, ay, ax1] = ash.area;
  assert.ok(ay === ash.area[3] && ax1 - ax0 + 1 === 3, 'the narrows: three wide');
  assert.ok(st.rows[ay][ax0 - 1] === 'Y' && st.rows[ay][ax1 + 1] === 'Y', 'the narrows: between two great iron roots');
  const [west, east] = [...st.roam.rects].sort((a, b) => a[0] - b[0]);
  assert.equal(st.roam.rects.length, 2, 'two wide landings');
  assert.ok((west[0] + west[2]) / 2 < st.w / 2 && (west[1] + west[3]) / 2 >= st.h / 3 && (west[1] + west[3]) / 2 < (2 * st.h) / 3, 'one landing west, in the middle third');
  assert.ok((east[0] + east[2]) / 2 > st.w / 2 && (east[1] + east[3]) / 2 >= (2 * st.h) / 3, 'the other east, in the lower third');
  for (const r of st.roam.rects) assert.ok(r[2] - r[0] + 1 >= 8, `landing [${r}] is about ten across`);
  const before = belowStage('hearthbrand', AP.indexOf('as-thralls'));
  assert.ok(present(before, 'ash-stair').some(e => e.id === 'as-ash-gate' && e.state === 'closed'), 'the ash gate is shut before the thralls fall');
  const cache = ent('ash-stair', 'as-cache');
  assert.ok(!besideIn(reachOn(before, 'ash-stair', fromAnchor('ash-stair', 'from-hall')), cache), 'the cache lies below the narrows');
  assert.ok(besideIn(reachOn(before, 'ash-stair', fromAnchor('ash-stair', 'from-deep')), cache), 'the cache is off the middle landing');

  // The Chained Deep: in by the stair at the north-west corner, on through the forge door in the middle of the east
  // edge; the narrows three wide; the Sleeper in the middle; the chain to the south-west read in the west, the chain to
  // the south-east in the east, the chain to the south edge from the middle; Tamsin on the paving before the door. The
  // floors round the Sleeper never meet: with the chain gate shut, the way in reaches only the west chain, and the way
  // back from the forge door only the east one and Tamsin
  const deep = MAPS['chained-deep'];
  const cdUp = exit('chained-deep', 'cd-up'), cdForge = exit('chained-deep', 'cd-forge');
  assert.ok(cdUp.area[1] === 0 && cdUp.area[2] < deep.w / 4, 'the way in: the stair at the north-west corner');
  assert.ok(cdForge.area[0] === deep.w - 1 && cdForge.area[1] <= deep.h / 2 && cdForge.area[3] >= deep.h / 2, 'the forge door: the middle of the east edge');
  const chainGate = ent('chained-deep', 'cd-chain-gate');
  assert.equal(cellsOf(chainGate).length, 3, 'the narrows: three wide');
  const [fx, fy] = ent('chained-deep', 'sleeper-first').at;
  assert.ok(fx >= deep.w / 3 && fx < (2 * deep.w) / 3 && fy >= deep.h / 3 && fy < (2 * deep.h) / 3, 'the First Sleeper: in the middle');
  const [lull, ashChain, hush] = ['cd-chain-lull', 'cd-chain-ash', 'cd-chain-hush'].map(id => ent('chained-deep', id));
  assert.ok(lull.at[0] < deep.w / 2 && hush.at[0] > deep.w / 2 && ashChain.at[0] >= deep.w / 3 && ashChain.at[0] < (2 * deep.w) / 3, 'the chains: south-west, south-east, and the one down the middle');
  for (const c of [lull, ashChain, hush]) assert.equal(c.look, 'chain', `${c.id} looks like a chain`);
  const tamsin = ent('chained-deep', 'cd-tamsin');
  assert.ok(Math.abs(tamsin.at[0] - cdForge.area[0]) <= 4 && tamsin.at[1] >= cdForge.area[1] && tamsin.at[1] <= cdForge.area[3], 'Tamsin waits on the paving before the forge door');
  const shut = belowStage('hearthbrand', AP.indexOf('cd-unmade'));
  assert.ok(present(shut, 'chained-deep').some(e => e.id === 'cd-chain-gate' && e.state === 'closed'), 'the chain gate is shut before the unmade fall');
  const inWest = reachOn(shut, 'chained-deep', fromAnchor('chained-deep', 'from-stair'));
  const inEast = reachOn(shut, 'chained-deep', fromAnchor('chained-deep', 'from-forge'));
  assert.ok(besideIn(inWest, lull) && !besideIn(inWest, hush) && !besideIn(inWest, tamsin), 'from the way in: the west floor and its chain, and nothing past the narrows');
  assert.ok(besideIn(inEast, hush) && besideIn(inEast, tamsin) && !besideIn(inEast, lull), 'from the forge door: the east floor and its chain, and Tamsin');
  assert.ok(besideIn(inEast, ashChain), 'the chain down the middle is read from the walkway past the narrows');

  // The Worldforge: in by the iron door in the middle of the west edge; the molten moat three wide from the north edge
  // to the south, about a third of the way in; the bridge three wide in line with the door, its gate at the near end;
  // the heart's step behind the Unsmith, and nobody reaches it past him while he stands
  const wf = MAPS.worldforge;
  const wfOut = exit('worldforge', 'wf-out');
  assert.ok(wfOut.area[0] === 0 && wfOut.area[1] <= wf.h / 2 && wfOut.area[3] >= wf.h / 2 - 1, 'the way in: the middle of the west edge');
  const moat = [];
  for (let x = 0; x < wf.w; x++) if (wf.rows.every(r => r[x] === '~' || r[x] === 'b')) moat.push(x);
  assert.deepEqual(moat, [moat[0], moat[0] + 1, moat[0] + 2], 'the moat: one channel, three wide, from the north edge to the south');
  assert.ok(moat[0] >= wf.w / 4 && moat[0] < wf.w / 2, 'the moat: about a third of the way in');
  const bridgeRows = [...new Set(wf.rows.flatMap((r, y) => (r[moat[0]] === 'b' ? [y] : [])))];
  assert.equal(bridgeRows.length, 3, 'the bridge: three wide');
  assert.deepEqual(bridgeRows, cellsOf(wfOut).map(([, y]) => y), 'the bridge: in line with the door');
  for (const x of moat) for (const y of bridgeRows) assert.equal(wf.rows[y][x], 'b', `the bridge spans the moat at (${x},${y})`);
  assert.deepEqual(ent('worldforge', 'wf-bridge-gate').area, [moat[0], bridgeRows[0], moat[0], bridgeRows[2]], 'the bridge gate: across the bridge\'s near end');
  const heart = ent('worldforge', 'wf-heart');
  const facing = belowStage('hearthbrand', AP.indexOf('unsmith'));
  assert.ok(!besideIn(reachOn(facing, 'worldforge', fromAnchor('worldforge', 'from-deep')), heart), 'the heart: only past the Unsmith, while he stands');
  assert.ok(besideIn(reachOn(belowStage('hearthbrand', AP.length), 'worldforge', fromAnchor('worldforge', 'from-deep')), heart), 'the heart: open once he is beaten');
});

test('the Hearth Below\'s large props are each drawn once, at their foot, and stand in solid ground (the Sleeper, the Worldforge, the great anvil)', () => {
  // the view draws a prop on every tile of an `area` (M6's rule: a large sprite is one entity at its foot, as the
  // Belfry's Lull and Rotbridge's barge are); the tiles beside and above the foot are solid, so the sprite never stands
  // over open floor
  for (const [map, id, prop] of [['chained-deep', 'sleeper-first', 'sleeper-first'], ['worldforge', 'wf-furnace', 'worldforge'], ['worldforge', 'wf-anvil', 'great-anvil']]) {
    const m = MAPS[map], e = m.entities.find(x => x.id === id);
    assert.ok(e && e.kind === 'prop' && e.prop === prop && e.solid, `${map}/${id}: a solid ${prop}`);
    assert.ok(e.at && !e.area, `${map}/${id}: one entity at its foot, drawn once`);
    const [x, y] = e.at;
    assert.ok(!solidTile(m, x, y), `${map}/${id} stands on ground`);
    for (const [cx, cy] of [[x - 1, y], [x + 1, y], [x - 1, y - 1], [x, y - 1], [x + 1, y - 1]]) assert.ok(solidTile(m, cx, cy), `${map}/${id}: (${cx},${cy}) beside or above its foot is solid`);
  }
});

test('every Hearth Below map is closed at its edges but for its exits, and the Ash Stair\'s patrols keep to its landings', () => {
  for (const id of BELOW) {
    const m = MAPS[id];
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        if (x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1) continue;
        assert.ok(solidTile(m, x, y) || m.exits.some(ex => covers(ex, x, y)), `${id} (${x},${y}): the edge is open`);
      }
    }
  }
  // the stair's steps are never roamed (rules/world.js roamMask), so each landing is an island: no patrol can wander
  // onto the stair, into the narrows or to an exit
  const st = MAPS['ash-stair'], mask = roamMask(st);
  const gate = st.entities.find(e => e.id === 'as-ash-gate');
  for (const [x0, y0, x1, y1] of st.roam.rects) {
    const seen = new Set(), q = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (mask[y * st.w + x]) { seen.add(`${x},${y}`); q.push([x, y]); }
    assert.ok(q.length >= 24, 'a roomy landing');
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= st.w || ny >= st.h || seen.has(k) || !mask[ny * st.w + nx]) continue;
        seen.add(k);
        q.push([nx, ny]);
      }
    }
    for (const k of seen) {
      const [x, y] = k.split(',').map(Number);
      assert.ok(x >= x0 && x <= x1 && y >= y0 && y <= y1, `the landing [${x0},${y0},${x1},${y1}]'s patrols stay on it (they could reach ${k})`);
    }
    assert.ok(!cellsOf(gate).some(([x, y]) => seen.has(`${x},${y}`)), 'no patrol reaches the narrows');
  }
  const pack = st.entities.find(e => e.id === 'as-patrol');
  assert.ok(st.roam.rects.some(([x0, y0, x1, y1]) => pack.at[0] >= x0 && pack.at[0] <= x1 && pack.at[1] >= y0 && pack.at[1] <= y1), 'the pack is at home on a landing');
});

test('every gated exit carries its sealed text: the rules shut only a sealed exit, so a gate alone would stand open', () => {
  for (const map of Object.values(MAPS)) {
    for (const x of map.exits) {
      if (!x.gate) continue;
      assert.ok(x.to, `${map.id} ${x.id}: a gated exit leads somewhere`);
      assert.ok(x.sealed?.text && x.sealed?.region, `${map.id} ${x.id}: gated, so sealed (text and region) until the gate opens`);
    }
  }
});
