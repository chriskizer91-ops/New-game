// The shell's pure helpers (WP8): the carry-over card's facts and the title's Continue line over every
// M2 fixture, the Atlas geometry (lore projection, marker relaxation, where relics are held), and
// the music tracks. M4 (P7b): the region views and the Sunscorch's gate on the Atlas, every map's music,
// the Codex binder's pages (codex.js binderPage) and the Journal's Grudges (journal.js grudgeView).
// The screens themselves are covered in Chromium by tools/e2e-flow.mjs and tools/e2e-world.mjs.
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
import { VIEWS, REGION_VIEW, regionOpen, placeOf, loreAt, entityLore, toFrame, relax, RELIC_SITE } from '../src/ui/lib/atlas-geo.js';
import { TRACK_NAMES, badNotes } from '../src/core/audio.js';
import { binderPage, defaultPage, RIDDLES, HOLDER } from '../src/ui/screens/codex.js';
import { grudgeView } from '../src/ui/screens/journal.js';

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
  // distance from a point to the segment a-b (viewBox units)
  const toSeg = ([x, y], a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len2)) : 0;
    return Math.hypot(a[0] + t * dx - x, a[1] + t * dy - y);
  };
  for (const id of MAP_IDS) {
    const L = MAPS[id].lore, M = MAPS[id];
    assert.ok(L?.length >= 1, `${id} has lore`);
    for (const p of L) assert.ok(p[0] >= 0 && p[0] <= 1200 && p[1] >= 0 && p[1] <= 800, `${id}: lore ${p} is on the illustrated map`);
    const a = L[0], b = L[L.length - 1];
    assert.deepEqual(loreAt(id, a[2], a[3]).map(Math.round), [a[0], a[1]], id);
    assert.deepEqual(loreAt(id, b[2], b[3]).map(Math.round), [b[0], b[1]], id);
    if (L.length === 1) assert.deepEqual(loreAt(id, 0, 0), [a[0], a[1]], id);
    // every point of the map lands on its route: between the ends of a straight one, on one of the legs
    // of a bent or branching one (M4: the Sunward Road bends, the Glass Flats branch at a junction)
    for (const [tx, ty] of [[Math.floor(M.w / 2), Math.floor(M.h / 2)], [0, 0], [M.w - 1, 0], [0, M.h - 1], [M.w - 1, M.h - 1]]) {
      const p = loreAt(id, tx, ty);
      const d = L.length === 1 ? Math.hypot(p[0] - a[0], p[1] - a[1]) : Math.min(...L.slice(1).map((q, i) => toSeg(p, L[i], q)));
      assert.ok(d < 0.01, `${id}: tile ${tx},${ty} lands ${d.toFixed(2)} off its route`);
    }
    if (L.length === 2) {
      const [x, y] = loreAt(id, Math.floor(M.w / 2), Math.floor(M.h / 2));
      assert.ok(x >= Math.min(a[0], b[0]) - 0.01 && x <= Math.max(a[0], b[0]) + 0.01 && y >= Math.min(a[1], b[1]) - 0.01 && y <= Math.max(a[1], b[1]) + 0.01, id);
    }
  }
  for (const [id, where] of Object.entries(ENTITY_OF)) assert.ok(entityLore(where.map, where.entity), id);
});

test('M4 Atlas: each open region has a view that frames its maps and fires; the Sunscorch opens with Act I', () => {
  for (const id of MAP_IDS) {
    const view = VIEWS[REGION_VIEW[MAPS[id].region]];
    assert.ok(view, `${id}: its region (${MAPS[id].region}) has an Atlas view`);
    for (const p of MAPS[id].lore) {
      const [x, y] = toFrame(view, p, 600, 400);
      assert.ok(x >= 0 && x <= 600 && y >= 0 && y <= 400, `${id}: lore ${p} is inside the ${REGION_VIEW[MAPS[id].region]} view`);
    }
  }
  for (const [id, h] of Object.entries(HEARTHS)) {
    const [x, y] = toFrame(VIEWS[REGION_VIEW[MAPS[h.map].region]], h.lore, 480, 320);
    assert.ok(x > 0 && x < 480 && y > 0 && y < 320, `${id} is inside its region's view`);
  }
  for (const v of Object.values(VIEWS)) assert.ok(Math.abs(v.w / v.h - 1.5) < 1e-9, 'every view is 3:2, like the frame');
  const g = newGame({ seed: 3 });
  assert.equal(regionOpen(g, 'verdant'), true);
  assert.equal(regionOpen(g, 'sunscorch'), false, 'sealed until Act I is done');
  const g2 = structuredClone(g);
  g2.progress.flags.story['act1-complete'] = true;
  assert.equal(regionOpen(g2, 'sunscorch'), true, 'the Keep\'s south-east gate opens');
  assert.equal(regionOpen(g2, 'ironspire'), false);
  assert.equal(regionOpen(g2, 'gloomfen'), false);
  // the place a map belongs to: its own, the one it lies under, or (a route) its own name
  assert.equal(placeOf('sandspire'), 'Sandspire');
  assert.equal(placeOf('keep-hall'), 'Hearthstone Keep');
  assert.equal(placeOf('mosswatch-2'), 'Mosswatch Tower');
  assert.equal(placeOf('sun-road'), MAPS['sun-road'].name);
  for (const id of MAP_IDS) assert.ok(typeof placeOf(id) === 'string' && placeOf(id).length > 2, `${id} has a place name`);
});

test('Atlas markers never overlap: each region\'s Hearthfires in its own view and all of them in the realm view, on a phone and a laptop', () => {
  const inRegion = region => Object.values(HEARTHS).filter(h => MAPS[h.map].region === region);
  const VIEW_FIRES = { wilds: inRegion('verdant'), sunscorch: inRegion('sunscorch'), realm: Object.values(HEARTHS) };
  assert.equal(VIEW_FIRES.sunscorch.length, 7, 'the Sunscorch view has the seven Sunscorch fires');
  for (const [W, H] of [[318, 212], [866, 577]]) {
    for (const view of ['wilds', 'sunscorch', 'realm']) {
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
  for (const t of ['title', 'road', 'battle', 'boss', 'victory', 'hearth', 'wilds', 'town', 'dungeon', 'desert']) assert.ok(TRACK_NAMES.includes(t), t);
  assert.deepEqual(badNotes(), []);
});

test('every map\'s music names a real track (M4: the Sunscorch roads play the desert track)', () => {
  for (const id of MAP_IDS) {
    assert.ok(typeof MAPS[id].music === 'string' && MAPS[id].music, `${id} names its music`);
    assert.ok(TRACK_NAMES.includes(MAPS[id].music), `${id}: "${MAPS[id].music}" is a track in core/audio.js`);
  }
  assert.ok(MAP_IDS.some(id => MAPS[id].music === 'desert'), 'the desert track is used');
});

test('the Codex binder: Page I counts your starter and the other 21, Page II all 14, III and IV are sealed', () => {
  for (const id of Object.keys(RELICS)) {
    assert.ok(RIDDLES[id], `${id} has a riddle for its unsighted pocket`);
    assert.ok(HOLDER[id], `${id} has a holder line for its sighted pocket`);
  }
  const g = newGame({ seed: 4, starter: 'cairnmaul' });
  const I = binderPage(g, 'verdant');
  assert.equal(I.sealed, false);
  assert.equal(I.relics.length, 24);
  assert.deepEqual([I.progress.claimed, I.progress.needed], [1, 22]);
  assert.deepEqual(I.relics.filter(x => x.spare).map(x => [x.id, x.spare]).sort(), [['hearthbrand', 'keep'], ['stillwater-lance', 'tamsin']]);
  assert.equal(I.reward.earned, false);
  assert.deepEqual(I.relics.map(x => x.codex), [...I.relics.map(x => x.codex)].sort((a, b) => a - b), 'pockets in Codex order');
  const II = binderPage(g, 'sunscorch');
  assert.equal(II.relics.length, 14);
  assert.deepEqual([II.progress.claimed, II.progress.needed], [0, 14]);
  assert.equal(II.reward.name, 'The Sunscorch Compact');
  for (const id of ['ironspire', 'gloomfen']) {
    const P = binderPage(g, id);
    assert.equal(P.sealed, true, id);
    assert.equal(P.relics.length, 0, id);
    assert.ok(P.texts.length >= 1, `${id}: the sealed page quotes its closed road`);
  }
  // a forced full claim: the reward is earned (and dated once markPages records the day)
  const g2 = structuredClone(g);
  for (const x of I.relics.filter(r => !r.spare)) g2.codex[x.id] = { sighted: true, claimed: true, awakened: x.id === 'thornsplitter' };
  const I2 = binderPage(g2, 'verdant');
  assert.equal(I2.progress.done, true);
  assert.deepEqual([I2.reward.earned, I2.reward.day], [true, null]);
  assert.equal(I2.relics.find(x => x.id === 'thornsplitter').awakened, true);
  g2.progress.flags.pages = { verdant: 9 };
  assert.equal(binderPage(g2, 'verdant').reward.day, 9);
  // the binder opens on the page of the region the party stands in
  assert.equal(defaultPage(g), 'verdant');
  assert.equal(defaultPage({ ...g2, progress: { ...g2.progress, pos: { map: 'sandspire', x: 15, y: 13, face: 'n' } } }), 'sunscorch');
});

test('the Journal\'s Grudges: an M2 save\'s Grudge reads, the settled ones carry their day, and junk never throws', () => {
  const v1 = fixtures.find(([f]) => f === 'v1-grudges.json')[1];
  const g = migrate(v1);
  const V = grudgeView(g);
  assert.equal(V.active.length, 1);
  const a = V.active[0];
  assert.equal(a.key, 'tally-camp#1');
  assert.equal(a.name, 'Bandit the Once-Fled');
  assert.equal(a.title, 'the Once-Fled');
  assert.match(a.where, /Thornhollow/);
  assert.deepEqual(a.omens.map(o => o.name), ['Twinned']);
  assert.equal(a.record, 'You fled once');
  const g2 = structuredClone(g);
  g2.progress.flags.settled = { 'snag-wallow#0': { day: 4, name: 'Old Snag the Party-Breaker' }, 'rotstag-glade#0': { day: 9, name: 'The Rot-Stag the Twice-Victor' } };
  assert.deepEqual(grudgeView(g2).settled.map(s => [s.name, s.day]), [['The Rot-Stag the Twice-Victor', 9], ['Old Snag the Party-Breaker', 4]]);
  // old or odd saves: missing flags, a Grudge with no fields, omens that are not a list
  assert.deepEqual(grudgeView({ progress: { flags: {} } }), { active: [], settled: [] });
  assert.deepEqual(grudgeView({}), { active: [], settled: [] });
  const odd = grudgeView({ progress: { flags: { grudges: { 'gf-wisps#0': null, 'gf-raiders#0': null, 'nowhere#2': { omens: 'swift' } }, settled: { 'x#0': 7 } } } });
  assert.equal(odd.active.length, 3);
  assert.ok(odd.active.every(r => r.name && r.where && Array.isArray(r.omens)));
  assert.equal(odd.active.find(r => r.key === 'gf-wisps#0').hunts, true, 'a pack with a Grudge hunts');
  // M4.5: the raiders became the Glass Flats' road guard, and a guard keeps its ground
  assert.equal(odd.active.find(r => r.key === 'gf-raiders#0').hunts, false, 'a road guard with a Grudge waits');
  assert.equal(odd.settled[0].name, 'A foe you know');
});
