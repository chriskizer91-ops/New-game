// Map data tests (M3 spec §2, §4.2, §6.1 WP3). Owner: WP3.
// SCAFFOLD: shape, bounds, exits, anchors, placements and locks. WP3 adds the reachability flood fill
// per starter and "every chest reachable with all keys".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, MAP_IDS, ENTITY_OF, anchor, v1Anchor } from '../src/data/maps/index.js';
import { LEGEND } from '../src/data/tiles.js';
import { LOCKS } from '../src/data/locks.js';
import { RELICS } from '../src/data/relics.js';
import { DOMAINS } from '../src/data/domains.js';
import { ENCOUNTERS, GAUNTLET, PATROLS } from '../src/data/encounters.js';
import { HEARTHS, START_AT, CRITICAL_PATH, LEADS, ZONES, REGIONS } from '../src/data/world.js';

const inside = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
const solidTile = (m, x, y) => LEGEND[m.rows[y][x]].solid;

test('14 maps; every row is w characters from the legend; entities and exits are in bounds', () => {
  assert.equal(MAP_IDS.length, 14);
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
