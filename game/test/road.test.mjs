// Milestone 4.5 (docs/M45-SPEC.md A2-A3, §4): the road holds. A map's `roads` entry runs `from` an
// anchor `to` an exit (or up to an encounter), through `gates` in the order you meet them. Terrain and
// the solid things that never move (NPCs, chests, signs, Hearthfires...) are walls. A closed gate and
// its guard hold the road together; other encounters are left out (a beaten one is gone).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/maps/index.js';
import { tileOf } from '../src/data/tiles.js';
import { CRITICAL_PATH, SUN_PATH, LEADS, SUN_LEADS } from '../src/data/world.js';
import { ENCOUNTERS, GAUNTLET } from '../src/data/encounters.js';

const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
const tilesOf = a => { const out = []; for (let y = a[1]; y <= a[3]; y++) for (let x = a[0]; x <= a[2]; x++) out.push([x, y]); return out; };
const around = a => tilesOf([a[0] - 1, a[1] - 1, a[2] + 1, a[3] + 1]).filter(([x, y]) => (x < a[0] || x > a[2]) !== (y < a[1] || y > a[3]));
const MOVABLE = new Set(['gate', 'lock', 'encounter', 'trigger', 'light']);

// The fixed walls of a map, plus the given gates closed. A closed gate's guard still stands (it is
// only ever gone once beaten, and then its gate is open), so it walls its own tiles too.
function walls(map, closed = []) {
  const b = new Uint8Array(map.w * map.h);
  const put = a => { for (const [x, y] of tilesOf(a)) if (x >= 0 && y >= 0 && x < map.w && y < map.h) b[y * map.w + x] = 1; };
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (tileOf(map.rows[y][x]).solid) b[y * map.w + x] = 1;
  for (const e of map.entities) if (!MOVABLE.has(e.kind) && !(e.kind === 'prop' && !e.solid)) put(areaOf(e));
  for (const id of closed) {
    const g = map.entities.find(e => e.id === id);
    put(areaOf(g));
    const guard = g.guard && map.entities.find(e => e.kind === 'encounter' && e.enc === g.guard);
    if (guard) put(areaOf(guard));
  }
  return b;
}
function reach(map, b, [fx, fy]) {
  const seen = new Uint8Array(map.w * map.h);
  if (b[fy * map.w + fx]) return seen;
  const q = [[fx, fy]];
  seen[fy * map.w + fx] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = ny * map.w + nx;
      if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h || seen[k] || b[k]) continue;
      seen[k] = 1;
      q.push([nx, ny]);
    }
  }
  return seen;
}
const hits = (map, seen, tiles) => tiles.some(([x, y]) => x >= 0 && y >= 0 && x < map.w && y < map.h && seen[y * map.w + x]);
// `to`: the tiles of an exit, or the tiles next to an encounter (you walk up to it)
function target(map, to) {
  const exit = map.exits.find(x => x.id === to);
  if (exit) return tilesOf(exit.area);
  const enc = map.entities.find(e => e.kind === 'encounter' && e.enc === to);
  return enc ? around(areaOf(enc)) : null;
}
// the fights a gate's `open` waits on: beaten, done or cleared, or `unlocked` by a fight's `opens`
const OPENS = Object.fromEntries(Object.values(ENCOUNTERS).filter(e => e.opens).map(e => [e.opens, e.id]));
const names = (cond, out = new Set()) => {
  if (Array.isArray(cond)) cond.forEach(c => names(c, out));
  else if (cond && typeof cond === 'object') {
    for (const [k, v] of Object.entries(cond)) {
      if (typeof v === 'string' && ['beaten', 'done', 'cleared'].includes(k)) out.add(v);
      else if (k === 'unlocked' && OPENS[v]) out.add(OPENS[v]);
      else names(v, out);
    }
  }
  return out;
};

const ROADS = Object.values(MAPS).flatMap(map => (map.roads || []).map((road, i) => ({ map, road, key: `${map.id} road ${i + 1} (${road.from} -> ${road.to})` })));

test('the road maps of the spec each have a road', () => {
  for (const id of ['hearth-road', 'thornway', 'heartroot-1', 'dust-trail', 'deep-shaft-1', 'glass-flats', 'scorchgate', 'mossfall', 'hindwood']) {
    assert.ok(MAPS[id].roads?.length, `${id} has no roads`);
  }
});

for (const { map, road, key } of ROADS) {
  test(`${key}: every gate holds it, and you can walk up to each one`, () => {
    const from = map.anchors?.[road.from];
    assert.ok(from, `anchor ${road.from}`);
    const to = target(map, road.to);
    assert.ok(to?.length, `target ${road.to}`);
    const gates = road.gates.map(id => map.entities.find(e => e.id === id));
    gates.forEach((g, i) => assert.equal(g?.kind, 'gate', `${road.gates[i]} is a gate on ${map.id}`));
    assert.ok(hits(map, reach(map, walls(map), from), to), `with every gate open, ${road.to} is reachable`);
    gates.forEach((g, k) => {
      assert.ok(!hits(map, reach(map, walls(map, [g.id]), from), to), `${g.id} alone cuts ${road.from} off from ${road.to}`);
      // at gate k: the earlier gates are open, this one and the later ones shut
      const seen = reach(map, walls(map, road.gates.slice(k)), from);
      assert.ok(hits(map, seen, around(areaOf(g))), `you can walk up to ${g.id}`);
      const named = names(g.open);
      if (g.guard) {
        assert.ok(named.has(g.guard), `${g.id} opens on its guard ${g.guard}: ${JSON.stringify(g.open)}`);
        const enc = map.entities.find(e => e.kind === 'encounter' && e.enc === g.guard);
        assert.ok(enc, `${g.guard} stands on ${map.id}`);
        assert.notEqual(enc.mode, 'pack', `${g.guard} stands still (a block or a lair)`);
        assert.ok(hits(map, seen, around(areaOf(enc))), `you can walk up to ${g.guard} before ${g.id} opens`);
      } else {
        const fights = [...named].filter(id => ENCOUNTERS[id]);
        assert.ok(fights.length, `${g.id} waits on a fight: ${JSON.stringify(g.open)}`);
        // a fight on this map that the gate waits on (a lair off the road) is reachable in front of it
        for (const id of fights) {
          const enc = map.entities.find(e => e.kind === 'encounter' && e.enc === id);
          if (enc) assert.ok(hits(map, seen, around(areaOf(enc))), `you can walk up to ${id} before ${g.id} opens`);
        }
      }
    });
  });
}

// An M2 save stands at its node's anchor (rules/migrate.js): every gate whose fight comes earlier on
// the Gauntlet is open for it, the rest are shut, and from there it can walk up to its node's fight.
for (const { map, road, key } of ROADS) {
  const v1 = Object.keys(map.anchors || {}).filter(a => a.startsWith('v1:') && GAUNTLET.includes(a.slice(3)));
  if (!v1.length) continue;
  test(`${key}: the M2 anchors stand between the right gates`, () => {
    const order = id => GAUNTLET.indexOf(id);
    const gates = road.gates.map(id => map.entities.find(e => e.id === id));
    const fightOf = g => g.guard || [...names(g.open)].find(id => ENCOUNTERS[id]);
    for (const a of v1) {
      const node = a.slice(3), at = map.anchors[a];
      const shut = gates.filter(g => order(fightOf(g)) < 0 || order(fightOf(g)) >= order(node)).map(g => g.id);
      const seen = reach(map, walls(map, shut), map.anchors[road.from]);
      assert.ok(seen[at[1] * map.w + at[0]], `${a} is reachable with ${shut.join(', ') || 'no gate'} shut`);
      const enc = map.entities.find(e => e.kind === 'encounter' && e.enc === node);
      if (enc) assert.ok(hits(map, reach(map, walls(map, shut), at), around(areaOf(enc))), `from ${a} you can walk up to ${node}`);
    }
  });
}

test('no fight on the route or a lead roams, and every route fight holds a gate or a Brand', () => {
  const where = {};
  for (const map of Object.values(MAPS)) for (const e of map.entities) if (e.kind === 'encounter') where[e.enc] = { map: map.id, mode: e.mode };
  const held = new Set();
  for (const map of Object.values(MAPS)) {
    for (const e of map.entities) {
      if (e.kind !== 'gate') continue;
      for (const id of names(e.open)) held.add(id);
      if (e.guard) held.add(e.guard);
    }
  }
  const route = [...CRITICAL_PATH, ...SUN_PATH].filter(id => ENCOUNTERS[id]?.type === 'fight');
  const leads = [...Object.values(LEADS), ...Object.values(SUN_LEADS)].flat();
  for (const id of [...route, ...leads]) {
    assert.ok(where[id], `${id} stands on a map`);
    assert.notEqual(where[id].mode, 'pack', `${id} (${where[id].map}) is not a roaming pack`);
  }
  for (const id of route) assert.ok(ENCOUNTERS[id].brand || held.has(id), `${id} (${where[id].map}) holds a gate or a Brand`);
});
