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
import { HEARTHS, REGIONS } from '../src/data/world.js';
import { RELICS } from '../src/data/relics.js';
import { QUESTS } from '../src/data/quests.js';
import { DIALOGUE } from '../src/data/dialogue.js';
import { carryFacts, saveLine, inSentence, RELIC_TOTAL } from '../src/ui/lib/carry-facts.js';
import { codexNo } from '../src/ui/lib/items.js';
import { VIEWS, REGION_VIEW, regionOpen, placeOf, loreAt, entityLore, toFrame, relax, RELIC_SITE } from '../src/ui/lib/atlas-geo.js';
import { TRACK_NAMES, badNotes } from '../src/core/audio.js';
import { binderPage, defaultPage, RIDDLES, HOLDER } from '../src/ui/screens/codex.js';
import { chapterEnd } from '../src/ui/world/story-fx.js';
import { PAGES } from '../src/data/codex.js';
import { grudgeView } from '../src/ui/screens/journal.js';
import { Labels, makeDisp, applyStatus, heldStatus, untargetable, isCharmed, isSunk, holdInfo, withStatusSource } from '../src/ui/battle/model.js';
import { logLine } from '../src/ui/battle/log.js';
import { createBattle, current, act, foeTurn } from '../src/rules/battle.js';
import { autoCommand } from '../src/rules/autoplay.js';
import { addStatus } from '../src/rules/combat.js';
import { targetable } from '../src/rules/ai.js';
import { createRng } from '../src/core/rng.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/v1');
const fixtures = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => [f, JSON.parse(readFileSync(path.join(dir, f), 'utf8'))]);

test('the carry-over card has the party, the relics out of 74 (M7: the highest Codex number), and a real place to wake for every M2 fixture', () => {
  assert.equal(RELIC_TOTAL, 74);
  for (const [name, v1] of fixtures) {
    const g = migrate(v1);
    const F = carryFacts(g);
    assert.equal(F.heroes.length, 4, name);
    assert.equal(F.total, 74, name);
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
  assert.match(saveLine(g), /^Wren · The Great Hall · Day 1 · Lv 1 · 1\/74 relics$/);
  for (const [name, v1] of fixtures) assert.match(saveLine(migrate(v1)), /^.+ · .+ · Day \d+ · Lv \d+ · \d+\/74 relics$/, name);
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

test('Atlas markers never overlap: each region\'s Hearthfires in its own view (M5: the Ironspire\'s too; M7: the Hearth Below\'s) and all of the painting\'s in the realm view, on a phone and a laptop', () => {
  const inRegion = region => Object.values(HEARTHS).filter(h => MAPS[h.map].region === region);
  // M7: the Hearth Below lies under the Keep, so the realm view leaves its fires to the Below view (ui/screens/atlas.js)
  const VIEW_FIRES = { wilds: inRegion('verdant'), sunscorch: inRegion('sunscorch'), ironspire: inRegion('ironspire'), below: inRegion('below'),
    realm: Object.values(HEARTHS).filter(h => REGIONS[MAPS[h.map].region].act !== 3) };
  assert.equal(VIEW_FIRES.sunscorch.length, 7, 'the Sunscorch view has the seven Sunscorch fires');
  assert.equal(VIEW_FIRES.ironspire.length, 8, 'M5: the Ironspire view has the eight Ironspire fires (the East Road\'s Last Camp among them)');
  assert.equal(VIEW_FIRES.below.length, 2, 'M7: the Below view has the Hearth Below\'s two fires');
  assert.equal(VIEW_FIRES.realm.length, 33, 'M7: the realm view has the 33 fires on the painting');
  for (const [W, H] of [[318, 212], [866, 577]]) {
    for (const view of ['wilds', 'sunscorch', 'ironspire', 'below', 'realm']) {
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
  // a quest's reward (M4: the Orrery, the Signet, the Sunstone Heart) and a gift in a scene (Garret's Kettle;
  // M5: the Thane's Rune-Key) have no holder
  const gifts = Object.values(DIALOGUE).flatMap(d => [...(d.do || []), ...(d.choices || []).flatMap(c => c.do || [])]).map(e => e.give).filter(Boolean);
  assert.ok(gifts.includes('watchkeepers-kettle'), 'Garret gives the Kettle in a scene');
  const given = new Set([...gifts, ...Object.values(QUESTS).map(q => q.reward?.relic).filter(Boolean)]);
  const held = Object.values(RELICS).filter(r => !r.starter && !given.has(r.id)).map(r => r.id);
  for (const r of held) assert.ok(RELIC_SITE[r], `${r} has a holder`);
});

test('the world music tracks exist and every note parses', () => {
  for (const t of ['title', 'road', 'battle', 'boss', 'victory', 'hearth', 'wilds', 'town', 'dungeon', 'desert', 'peaks']) assert.ok(TRACK_NAMES.includes(t), t);
  assert.deepEqual(badNotes(), []);
});

test('every map\'s music names a real track (M4: the Sunscorch roads play the desert track)', () => {
  for (const id of MAP_IDS) {
    assert.ok(typeof MAPS[id].music === 'string' && MAPS[id].music, `${id} names its music`);
    assert.ok(TRACK_NAMES.includes(MAPS[id].music), `${id}: "${MAPS[id].music}" is a track in core/audio.js`);
  }
  assert.ok(MAP_IDS.some(id => MAPS[id].music === 'desert'), 'the desert track is used');
  assert.ok(MAP_IDS.some(id => MAPS[id].music === 'peaks'), 'M5: the peaks track is used');
});

test('the Codex binder: Page I counts your starter and the other 21, Pages II, III and IV all 14, Page V (M7) its nine', () => {
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
  const III = binderPage(g, 'ironspire');
  assert.equal(III.relics.length, 14);
  assert.deepEqual([III.progress.claimed, III.progress.needed], [0, 14]);
  assert.equal(III.reward.name, 'The Ironspire Accord');
  // M6: Page IV holds the Gloomfen's fourteen (M6 spec §3.4), so no page is sealed any more
  const IV = binderPage(g, 'gloomfen');
  assert.equal(IV.relics.length, 14);
  assert.deepEqual([IV.progress.claimed, IV.progress.needed], [0, 14]);
  assert.equal(IV.reward.name, 'The Gloomfen Covenant');
  // M7: Page V lists its nine, No. 000 first (spec §4.6), every one needed; the label counts to the highest number
  const V = binderPage(g, 'below');
  assert.equal(V.sealed, false);
  assert.deepEqual(V.relics.map(x => x.codex), [0, 67, 68, 69, 70, 71, 72, 73, 74]);
  assert.deepEqual([V.progress.claimed, V.progress.needed], [0, 9]);
  assert.equal(V.reward.name, 'The Hearthkeeper\'s Oath');
  assert.equal(codexNo(RELICS['fenwicks-poker']), 'No. 000 / 074');
  assert.equal(codexNo(RELICS['hollow-wreath']), 'No. 067 / 074');
  assert.equal(codexNo(RELICS.hearthbrand), 'No. 001 / 074');
  assert.ok(PAGES.every(p => !binderPage(g, p.id).sealed), 'no page is sealed');
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
  assert.equal(defaultPage({ ...g2, progress: { ...g2.progress, pos: { map: 'hollow-hall', x: 2, y: 22, face: 'n' } } }), 'below');
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

// ---- M5 (spec §4.2, §5): the battle screen's holds, charms and burrows, read from the display model ----

const hero = (o = {}) => ({ id: 'pip', side: 'hero', label: 'Pip', ko: false, statuses: [], ...o });
const foe = (o = {}) => ({ id: 'f1', side: 'foe', label: 'The Rime-Abbot', ko: false, statuses: [], ...o });

test('M5 battle UI: a hold reads by its label, names its holder and counts the turns left', () => {
  const names = { f1: 'The Rime-Abbot', f2: 'The Thunder-Roc' };
  const nameOf = id => names[id] || '';
  const u = hero({ statuses: [{ id: 'swallowed', stacks: 1, turns: 2, source: 'f1', label: 'Held under' }] });
  assert.ok(heldStatus(u));
  assert.equal(untargetable(u), true);
  assert.equal(isSunk(u), false, 'a held hero is out of the line, not under the floor');
  assert.deepEqual(holdInfo(u, nameOf), { id: 'swallowed', label: 'Held under', by: 'The Rime-Abbot', turns: 2, text: 'Held under by The Rime-Abbot, 2 turns left' });
  const roc = hero({ statuses: [{ id: 'swallowed', stacks: 1, turns: 1, source: 'f2', label: 'Carried off' }] });
  assert.equal(holdInfo(roc, nameOf).text, 'Carried off by The Thunder-Roc, 1 turn left');
  // no label (an older move) or no source: the status name, and no "by"
  assert.deepEqual(holdInfo(hero({ statuses: [{ id: 'swallowed', stacks: 1, turns: null }] }), nameOf), { id: 'swallowed', label: 'Swallowed', by: '', turns: null, text: 'Swallowed' });
  assert.equal(holdInfo(hero(), nameOf), null);
  assert.equal(holdInfo(hero({ statuses: [{ id: 'frozen', stacks: 1, turns: 1 }] }), nameOf), null, 'frozen skips a turn but holds nobody');
  // charmed, burrowed
  assert.equal(isCharmed(hero({ statuses: [{ id: 'charmed', stacks: 1, turns: null }] })), true);
  assert.equal(isCharmed(hero()), false);
  const dug = foe({ statuses: [{ id: 'burrowed', stacks: 1, turns: null }] });
  assert.equal(isSunk(dug), true);
  assert.equal(untargetable(dug), true);
  assert.equal(isSunk(foe({ statuses: [{ id: 'guarding', stacks: 1, turns: null }] })), false);
  for (const junk of [null, undefined, {}, { statuses: null }]) {
    assert.equal(heldStatus(junk), null);
    assert.equal(untargetable(junk), false);
    assert.equal(isCharmed(junk), false);
    assert.equal(holdInfo(junk), null);
  }
});

test('M5 battle UI: status events keep a hold\'s source and label, and a release takes it off', () => {
  const u = hero();
  applyStatus(u, { t: 'status', target: 'pip', status: 'swallowed', op: 'add', stacks: 1, turns: 2, source: 'f1', label: 'Held under' });
  assert.deepEqual(u.statuses, [{ id: 'swallowed', stacks: 1, turns: 2, value: null, source: 'f1', label: 'Held under' }]);
  // its lost turn (a trigger with stacks) keeps it, with the turns the event carries
  applyStatus(u, { t: 'status', target: 'pip', status: 'swallowed', op: 'trigger', stacks: 1, turns: 1 });
  assert.equal(u.statuses[0].turns, 1);
  assert.equal(u.statuses[0].label, 'Held under');
  applyStatus(u, { t: 'status', target: 'pip', status: 'swallowed', op: 'release', stacks: 0, turns: 0 });
  assert.deepEqual(u.statuses, []);
  // a charm clears on its trigger (stacks 0) and on a friend's blow (release)
  const c = hero();
  applyStatus(c, { t: 'status', target: 'pip', status: 'charmed', op: 'add', stacks: 1, turns: null });
  applyStatus(c, { t: 'status', target: 'pip', status: 'charmed', op: 'trigger', stacks: 0, turns: 0 });
  assert.deepEqual(c.statuses, []);
  applyStatus(c, { t: 'status', target: 'pip', status: 'charmed', op: 'add', stacks: 1, turns: null });
  applyStatus(c, { t: 'status', target: 'pip', status: 'charmed', op: 'release', stacks: 0, turns: 0 });
  assert.deepEqual(c.statuses, []);
  // the engine's add event names neither: they come from the state the events lead to
  const state = { units: { pip: { statuses: [{ id: 'swallowed', stacks: 1, turns: 2, source: 'f1', label: 'Carried off' }] } } };
  const ev = { t: 'status', target: 'pip', status: 'swallowed', op: 'add', stacks: 1, turns: 2 };
  assert.deepEqual(withStatusSource(ev, state), { ...ev, source: 'f1', label: 'Carried off' });
  assert.equal(withStatusSource(ev, { units: { pip: { statuses: [] } } }), ev, 'gone again by the end of the sequence: as it was');
  const tick = { t: 'status', target: 'pip', status: 'swallowed', op: 'tick', stacks: 1, turns: 2 };
  assert.equal(withStatusSource(tick, state), tick);
  assert.equal(withStatusSource({ t: 'damage', target: 'pip' }, state).t, 'damage');
});

test('M5 battle UI: the log says a hold by its label and a charmed turn by the engine\'s own words', () => {
  const disp = { units: { pip: hero(), f1: foe() } };
  assert.equal(logLine({ t: 'status', target: 'pip', status: 'swallowed', op: 'add', stacks: 1, source: 'f1', label: 'Held under' }, disp).text, 'Pip is held under by The Rime-Abbot');
  assert.equal(logLine({ t: 'status', target: 'pip', status: 'swallowed', op: 'add', stacks: 1 }, disp).text, 'Pip is Swallowed');
  assert.equal(logLine({ t: 'status', target: 'pip', status: 'swallowed', op: 'remove' }, disp).text, 'Pip is back in the line');
  assert.equal(logLine({ t: 'status', target: 'pip', status: 'swallowed', op: 'release' }, disp), null, 'the engine\'s text says why');
  assert.equal(logLine({ t: 'status', target: 'pip', status: 'swallowed', op: 'trigger', stacks: 1 }, disp), null);
  assert.equal(logLine({ t: 'status', target: 'pip', status: 'charmed', op: 'trigger', stacks: 0 }, disp), null);
  assert.match(logLine({ t: 'status', target: 'pip', status: 'frozen', op: 'trigger', stacks: 1 }, disp).text, /Frozen takes hold of Pip/);
  assert.equal(logLine({ t: 'move', actor: 'pip', name: 'Charmed', text: 'Pip is charmed and turns on Bryn!', charm: true, target: 'bryn' }, disp).text, 'Pip is charmed and turns on Bryn!');
  assert.equal(logLine({ t: 'move', actor: 'f1', name: 'Drown', text: 'x' }, disp).text, 'The Rime-Abbot: Drown');
});

test('M5 battle UI: a real hold played through the display model shows what the engine holds', () => {
  const g = newGame({ name: 'Tess', starter: 'hearthbrand', seed: 7 });
  const heroes = g.party.active.map(id => g.party.roster[id]);
  let s = createBattle({ heroes, foes: [{ family: 'oldsnag', level: 8 }], seed: 9, ctx: { inventory: g.inventory, bag: g.bag } });
  const labels = new Labels();
  const disp = makeDisp(s, labels);
  const held = s.order.filter(id => s.units[id].side === 'hero')[2];
  // the swallow, as a foe move's effect lands it (combat.addStatus), then the fight plays on
  s = structuredClone(s);
  const B = { s, rng: createRng(4), ev: [], touched: new Set(), relic: null };
  assert.ok(addStatus(B, s.units[held], 'swallowed', { source: 'f1', label: 'Held under' }));
  const events = [...B.ev];
  for (let i = 0; i < 200 && current(s); i++) {
    const id = current(s);
    const r = s.units[id].side === 'hero' ? act(s, autoCommand(s, id)) : foeTurn(s);
    events.push(...r.events);
    s = r.state;
    if (!s.units[held].statuses.some(x => x.id === 'swallowed')) break;
  }
  // replay the events on the display copy, as the Player does (filling in the source from the end state)
  const shown = [];
  for (const ev0 of events) {
    const ev = withStatusSource(ev0, B.s);
    if (ev.t !== 'status' || ev.target !== held) continue;
    applyStatus(disp.units[held], ev);
    const info = holdInfo(disp.units[held], id => disp.units[id]?.label);
    shown.push(info ? `${info.label}|${info.by}|${info.turns}` : '-');
  }
  assert.equal(shown[0], 'Held under|Old Snag|2', `the plate as the hold lands (${shown.join(' ')})`);
  assert.equal(shown[shown.length - 1], '-', 'and gone once the hero is back in the line');
  assert.ok(targetable(s.units[held]));
});

test('M5: the second council opens the Ironspire: the Atlas, the Codex\'s road note, and the chapter cards', () => {
  const g = newGame({ seed: 5 });
  Object.assign(g.progress.flags.story, { 'act1-complete': true, 'council-done': true, 'sunscorch-complete': true });
  // before the second council: sealed, and Page III says what opens its road
  assert.equal(regionOpen(g, 'ironspire'), false);
  assert.match(binderPage(g, 'ironspire').road, /east postern/);
  assert.equal(binderPage(g, 'sunscorch').road, null, 'the Sunscorch road is open');
  // M6: Page IV is open, and says what opens its road: the fen stair, after the third council
  assert.equal(binderPage(g, 'gloomfen').sealed, false);
  assert.match(binderPage(g, 'gloomfen').road, /fen stair/);
  let V = chapterEnd(g, 'act2');
  assert.deepEqual(V.chips.map(c => [c.id, c.open]), [['ironspire', false], ['gloomfen', false]]);
  assert.deepEqual(V.lines, ['Ironspire and Gloomfen open in the next chapter.'], 'M4\'s words while the postern is shut');
  // the second council sat: the postern stands open
  const g2 = structuredClone(g);
  g2.progress.flags.story['council-2-done'] = true;
  assert.equal(regionOpen(g2, 'ironspire'), true);
  assert.equal(regionOpen(g2, 'gloomfen'), false);
  assert.equal(binderPage(g2, 'ironspire').road, null);
  V = chapterEnd(g2, 'act2');
  assert.equal(V.sub, 'End of Act II');
  assert.deepEqual(V.chips.map(c => [c.id, c.open]), [['ironspire', true], ['gloomfen', false]]);
  assert.deepEqual(V.lines, ['The Keep’s east postern stands open. The Rockslide Pass climbs to Peak’s Veil.', 'Gloomfen opens in the next chapter.']);
  // the third council's card for a game whose fen stair is still shut (M5's wording, kept as a pin: the council itself
  // sets council-3-done, so the card a player sees is the M6 one below)
  V = chapterEnd(g2, 'ironspire');
  assert.equal(V.kick, 'The Ironspire is yours');
  assert.match(V.cls, /tbc-ironspire/);
  assert.deepEqual(V.chips.map(c => [c.id, c.open]), [['gloomfen', false]]);
  assert.deepEqual(V.lines, ['The Blackwater still holds the causeway.', 'The Gloomfen Marsh opens in the next chapter.']);
  assert.deepEqual(V.stats.map(r => r[0]), ['Day', 'Relics', 'Brands', 'Pages']);
  assert.equal(V.stats[3][1], `0/${PAGES.filter(p => p.from != null).length}`);
  // M6: the third council sat: the fen stair below Mossfall opens the Gloomfen, and Page IV's road note goes
  const g3 = structuredClone(g2);
  g3.progress.flags.story['council-3-done'] = true;
  assert.equal(regionOpen(g3, 'gloomfen'), true);
  assert.equal(binderPage(g3, 'gloomfen').road, null);
  // the first council's card is as it was
  assert.deepEqual(chapterEnd(newGame({ seed: 5 }), 'act1').lines, ['The Keep’s south-east gate stands open. The Sunward Road runs to Sandspire.']);
  // odd input never throws
  assert.ok(chapterEnd(null, 'ironspire').lines.length >= 1);
  assert.ok(chapterEnd({}, 'act2').chips.length >= 1);
});
