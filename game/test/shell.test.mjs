// The shell's pure helpers (WP8): the carry-over card's facts and the title's Continue line over every
// M2 fixture, the Atlas geometry (lore projection, marker relaxation, where relics are held), and
// the music tracks. The screens themselves are covered in Chromium by tools/e2e-flow.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrate } from '../src/rules/migrate.js';
import { newGame } from '../src/rules/gauntlet.js';
import { MAPS, MAP_IDS, ENTITY_OF } from '../src/data/maps/index.js';
import { HEARTHS } from '../src/data/world.js';
import { RELICS } from '../src/data/relics.js';
import { QUESTS } from '../src/data/quests.js';
import { carryFacts, saveLine, inSentence, RELIC_TOTAL } from '../src/ui/lib/carry-facts.js';
import { VIEWS, loreAt, entityLore, toFrame, relax, RELIC_SITE } from '../src/ui/lib/atlas-geo.js';
import { TRACK_NAMES, badNotes } from '../src/core/audio.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/v1');
const fixtures = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => [f, JSON.parse(readFileSync(path.join(dir, f), 'utf8'))]);

test('the carry-over card has the party, the relics out of 38, and a real place to wake for every M2 fixture', () => {
  assert.equal(RELIC_TOTAL, 38);
  for (const [name, v1] of fixtures) {
    const g = migrate(v1);
    const F = carryFacts(g);
    assert.equal(F.heroes.length, 4, name);
    assert.equal(F.total, 38, name);
    assert.equal(F.gold, v1.gold, name);
    assert.equal(F.waking, v1.progress.waking, name);
    assert.equal(F.place, MAPS[g.progress.pos.map].name, name);
    assert.ok(F.at === 'on' || F.at === 'at', name);
    assert.ok(!F.near || !F.near.toLowerCase().includes(F.place.replace(/^The /, '').toLowerCase()), `${name}: "${F.near}" repeats "${F.place}"`);
    assert.equal(F.looper, (v1.progress.flags.runs || 0) > 0 || v1.progress.brands.length > 0, name);
    assert.equal(F.grudges, Object.keys(v1.progress.flags.grudges || {}).length, name);
  }
  assert.equal(inSentence('The Great Hall'), 'the Great Hall');
});

test('the title Continue line reads name · place · day · level · relics', () => {
  const g = newGame({ name: 'Wren', starter: 'hearthbrand', seed: 7 });
  assert.match(saveLine(g), /^Wren · The Great Hall · Day 1 · Lv 1 · 1\/38 relics$/);
  for (const [name, v1] of fixtures) assert.match(saveLine(migrate(v1)), /^.+ · .+ · Day \d+ · Lv \d+ · \d+\/38 relics$/, name);
});

test('you-are-here projects onto each route between its lore ends, and points stay put', () => {
  for (const id of MAP_IDS) {
    const L = MAPS[id].lore;
    assert.ok(L?.length >= 1, `${id} has lore`);
    const a = L[0], b = L[L.length - 1];
    assert.deepEqual(loreAt(id, a[2], a[3]).map(Math.round), [a[0], a[1]], id);
    assert.deepEqual(loreAt(id, b[2], b[3]).map(Math.round), [b[0], b[1]], id);
    if (L.length === 1) assert.deepEqual(loreAt(id, 0, 0), [a[0], a[1]], id);
    // every point of the map lands between the ends
    const [x, y] = loreAt(id, Math.floor(MAPS[id].w / 2), Math.floor(MAPS[id].h / 2));
    assert.ok(x >= Math.min(a[0], b[0]) - 0.01 && x <= Math.max(a[0], b[0]) + 0.01 && y >= Math.min(a[1], b[1]) - 0.01 && y <= Math.max(a[1], b[1]) + 0.01, id);
  }
  for (const [id, where] of Object.entries(ENTITY_OF)) assert.ok(entityLore(where.map, where.entity), id);
});

test('Atlas markers never overlap: each region\'s Hearthfires in its own view and all of them in the realm view, on a phone and a laptop', () => {
  const inRegion = region => Object.values(HEARTHS).filter(h => MAPS[h.map].region === region);
  const VIEW_FIRES = { wilds: inRegion('verdant'), realm: Object.values(HEARTHS) };
  for (const [W, H] of [[318, 212], [866, 577]]) {
    for (const view of ['wilds', 'realm']) {
      const run = () => relax(VIEW_FIRES[view].map(h => { const [x0, y0] = toFrame(VIEWS[view], h.lore, W, H); return { x0, y0 }; }), { W, H, r: 22 });
      const nodes = run();
      for (const n of nodes) assert.ok(n.x >= 22 && n.x <= W - 22 && n.y >= 22 && n.y <= H - 22, `${view} ${W}: inside the frame`);
      let min = Infinity;
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) min = Math.min(min, Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y));
      assert.ok(min >= 43, `${view} at ${W}px: closest markers ${min.toFixed(1)}px apart`);
      assert.deepEqual(run(), nodes, 'deterministic');
    }
  }
  // the Wilds view holds every Hearthfire of the Wilds (M4: the Sunscorch ones are in the realm view)
  for (const [id, h] of Object.entries(HEARTHS).filter(([, h]) => MAPS[h.map].region === 'verdant')) {
    const [x, y] = toFrame(VIEWS.wilds, h.lore, 480, 320);
    assert.ok(x > 0 && x < 480 && y > 0 && y < 320, `${id} is inside the Wilds view`);
  }
});

test('every held or worn relic has a placed holder for the Atlas', () => {
  for (const [relic, enc] of Object.entries(RELIC_SITE)) {
    assert.ok(RELICS[relic], relic);
    assert.ok(ENTITY_OF[enc], `${relic}: ${enc} is placed on a map`);
  }
  // a quest's reward (M4: the Orrery, the Signet, the Sunstone Heart) and Garret's Kettle have no holder
  const given = new Set(['watchkeepers-kettle', ...Object.values(QUESTS).map(q => q.reward?.relic).filter(Boolean)]);
  const held = Object.values(RELICS).filter(r => !r.starter && !given.has(r.id)).map(r => r.id);
  for (const r of held) assert.ok(RELIC_SITE[r], `${r} has a holder`);
});

test('the world music tracks exist and every note parses', () => {
  for (const t of ['title', 'road', 'battle', 'boss', 'victory', 'hearth', 'wilds', 'town', 'dungeon']) assert.ok(TRACK_NAMES.includes(t), t);
  assert.deepEqual(badNotes(), []);
});
