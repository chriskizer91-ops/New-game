// M6 (P7): the UI's pure helpers for the Gloomfen Marsh (docs/M6-SPEC.md §5): the fen track, the chapter cards (the
// third council opens the fen stair; the fourth ends Act II and opens nothing), the Gloomfen card, the Atlas's
// Gloomfen view, the battle's fen statuses and dives, its grip words and worn pieces (the older relics and foes as they
// shipped), and a dialogue price. The screens themselves are covered in Chromium by tools/e2e-world.mjs (28-39),
// tools/e2e-battle.mjs (lantern, led-away, leviathan, hodge, fen) and tools/e2e-flow.mjs (Page IV in the Milestone 5
// profile).
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startBattle } from '../src/rules/gauntlet.js';
import { ENCOUNTERS } from '../src/data/encounters.js';
import { MAPS, MAP_IDS } from '../src/data/maps/index.js';
import { HEARTHS, REGIONS, BRAND_TOTAL } from '../src/data/world.js';
import { PAGES } from '../src/data/codex.js';
import { TRACK_NAMES, badNotes } from '../src/core/audio.js';
import { chapterEnd, hasRegionCard } from '../src/ui/world/story-fx.js';
import { VIEWS, REGION_VIEW, framed, toFrame, relax, regionOpen } from '../src/ui/lib/atlas-geo.js';
import { isHexed, rotStacks, afflictions, divesUnderWater, isSunk, holdInfo, gripWord } from '../src/ui/battle/model.js';
import { RELICS } from '../src/data/relics.js';
import { foeLook } from '../src/ui/battle/sprites.js';
import { logLine } from '../src/ui/battle/log.js';
import { priceText } from '../src/ui/world/dialogue.js';
import { binderPage } from '../src/ui/screens/codex.js';

const BRANDS6 = ['brand-of-briars', 'brand-of-the-heartroot', 'brand-of-glass', 'brand-of-ash', 'brand-of-iron', 'brand-of-frost'];
function councilGame(n) {
  const g = newGame({ seed: 6 });
  Object.assign(g.progress.flags.story, { 'act1-complete': true, 'council-done': true, 'sunscorch-complete': true, 'council-2-done': true });
  if (n >= 3) Object.assign(g.progress.flags.story, { 'ironspire-complete': true, 'council-3-done': true });
  g.progress.brands = [...BRANDS6];
  return g;
}

test('M6: the fen track is a real track, and its notes parse', () => {
  assert.ok(TRACK_NAMES.includes('fen'));
  assert.deepEqual(badNotes(), []);
  for (const id of MAP_IDS) assert.ok(TRACK_NAMES.includes(MAPS[id].music), `${id}: "${MAPS[id].music}" is a track`);
});

test('M6: the third council\'s card opens the fen stair; before it the Gloomfen is the next chapter', () => {
  // before the council sits (its flag not yet set): M5's words
  let V = chapterEnd(councilGame(2), 'ironspire');
  assert.deepEqual(V.chips.map(c => [c.id, c.open]), [['gloomfen', false]]);
  assert.deepEqual(V.lines, ['The Blackwater still holds the causeway.', 'The Gloomfen Marsh opens in the next chapter.']);
  // the council sat (it sets council-3-done before its card): the Gloomfen's road stands open
  const g = councilGame(3);
  assert.equal(regionOpen(g, 'gloomfen'), true);
  V = chapterEnd(g, 'ironspire');
  assert.equal(V.kick, 'The Ironspire is yours');
  assert.deepEqual(V.chips.map(c => [c.id, c.open]), [['gloomfen', true]]);
  assert.equal(V.lines.length, 2);
  assert.equal(V.lines[0], 'The Blackwater still holds the causeway.', 'the Blackwater line comes just before the fen stair\'s');
  assert.match(V.lines[1], /^The fen stair below Mossfall stands open\./);
  assert.ok(!V.lines.some(l => /next chapter/.test(l)), 'nothing is left for the next chapter');
});

test('M6: the fourth council\'s card ends Act II, names Act III and opens nothing', () => {
  const g = councilGame(3);
  g.progress.brands.push('brand-of-lanterns', 'brand-of-the-deep');
  const V = chapterEnd(g, 'gloomfen');
  assert.equal(V.title, 'End of Act II');
  assert.equal(V.kick, 'The Gloomfen is yours');
  assert.match(V.cls, /tbc-gloomfen/);
  assert.deepEqual(V.stats.map(r => r[0]), ['Day', 'Relics', 'Brands', 'Pages']);
  assert.equal(V.stats[2][1], `${BRAND_TOTAL}/${BRAND_TOTAL}`);
  assert.equal(V.stats[3][1], `0/${PAGES.filter(p => p.from != null).length}`);
  assert.ok(V.lines.includes('All eight coals are lit. The Hollow Council waits.'));
  assert.ok(V.lines.some(l => /Act III/.test(l)));
  assert.ok(V.chips.every(c => !c.open) && V.chips.some(c => /Act III/.test(c.name)), 'Act III is named, and nothing opens');
  assert.ok(!V.lines.some(l => /stands open/.test(l)));
  // odd input never throws
  assert.ok(chapterEnd(null, 'gloomfen').lines.length >= 1);
  assert.ok(chapterEnd({}, 'gloomfen').stats.length === 4);
});

test('M6: the Gloomfen has its card; the other regions have none', () => {
  assert.equal(hasRegionCard('gloomfen'), true);
  for (const r of Object.keys(REGIONS).filter(id => id !== 'gloomfen')) assert.equal(hasRegionCard(r), false, r);
  assert.equal(hasRegionCard('nowhere'), false);
});

test('M6: the Atlas\'s Gloomfen view holds every Gloomfen map and fire, and its fires never overlap', () => {
  const V = VIEWS[REGION_VIEW.gloomfen];
  assert.deepEqual(V, framed('gloomfen'));
  assert.ok(Math.abs(V.w / V.h - 1.5) < 1e-9, '3:2');
  assert.ok(V.x >= 0 && V.y >= 0 && V.x + V.w <= 1200 + 1e-9 && V.y + V.h <= 800 + 1e-9, 'on the painting');
  for (const id of MAP_IDS.filter(m => MAPS[m].region === 'gloomfen')) {
    for (const p of MAPS[id].lore) {
      const [x, y] = toFrame(V, p, 600, 400);
      assert.ok(x >= 0 && x <= 600 && y >= 0 && y <= 400, `${id}: lore ${p} is inside the Gloomfen view`);
    }
  }
  const fires = Object.values(HEARTHS).filter(h => MAPS[h.map].region === 'gloomfen');
  assert.equal(fires.length, 8);
  for (const [W, H] of [[318, 212], [866, 577]]) {
    const nodes = relax(fires.map(h => { const [x0, y0] = toFrame(V, h.lore, W, H); return { x0, y0 }; }), { W, H, r: 22 });
    let min = Infinity;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) min = Math.min(min, Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y));
    assert.ok(min >= 43, `the Gloomfen view at ${W}px: closest markers ${min.toFixed(1)}px apart`);
  }
});

test('M6: Page IV is open, and says what opens its road until the third council', () => {
  const g = councilGame(2);
  const IV = binderPage(g, 'gloomfen');
  assert.equal(IV.sealed, false);
  assert.equal(IV.relics.length, 14);
  assert.ok(IV.relics.every(r => r.riddle && !/^Nobody has seen it yet/.test(r.riddle) && r.holder), 'every Page IV pocket has its riddle and holder');
  assert.match(IV.road, /fen stair/);
  assert.equal(binderPage(councilGame(3), 'gloomfen').road, null);
});

const hero = (o = {}) => ({ id: 'pip', side: 'hero', label: 'Pip', ko: false, statuses: [], ...o });
const foe = (o = {}) => ({ id: 'f1', side: 'foe', label: 'The Blackwater Leviathan', ko: false, statuses: [], ...o });

test('M6 battle UI: hexed and rotting read on the card, a dive into water is known, and each hold names its holder', () => {
  const u = hero({ statuses: [{ id: 'hexed', stacks: 1, turns: 2 }, { id: 'rotting', stacks: 2, turns: 3 }] });
  assert.equal(isHexed(u), true);
  assert.equal(rotStacks(u), 2);
  assert.deepEqual(afflictions(u), ['Hexed', 'Rotting']);
  assert.deepEqual(afflictions(hero({ statuses: [{ id: 'rotting', stacks: 1, turns: 3 }] })), ['Rotting']);
  assert.deepEqual(afflictions(hero({ statuses: [{ id: 'poisoned', stacks: 2, turns: 3 }] })), [], 'poison is not rot');
  for (const junk of [null, undefined, {}, { statuses: null }]) { assert.equal(isHexed(junk), false); assert.equal(rotStacks(junk), 0); assert.deepEqual(afflictions(junk), []); }
  // the Leviathan dives into water; a burrower goes under the floor
  assert.equal(divesUnderWater({ family: 'blackwater-leviathan' }), true);
  assert.equal(divesUnderWater({ family: 'kharzul' }), false);
  assert.equal(divesUnderWater({ family: 'no-such-family' }), false);
  assert.equal(isSunk(foe({ family: 'blackwater-leviathan', statuses: [{ id: 'burrowed', stacks: 1, turns: null }] })), true);
  // the new holds, by their labels
  const nameOf = id => ({ f1: 'The Lantern Mother', f2: 'Hodge' }[id] || '');
  assert.equal(holdInfo(hero({ statuses: [{ id: 'swallowed', stacks: 1, turns: 2, source: 'f1', label: 'Led away' }] }), nameOf).text, 'Led away by The Lantern Mother, 2 turns left');
  assert.equal(holdInfo(hero({ statuses: [{ id: 'swallowed', stacks: 1, turns: 1, source: 'f2', label: 'In the river' }] }), nameOf).text, 'In the river, put there by Hodge, 1 turn left');
});

test('M6 battle UI: the log says a heal halved by rot, a hold by its label, and a foe\'s own last words', () => {
  const disp = { units: { pip: hero(), f1: foe(), f2: foe({ id: 'f2', label: 'Hodge' }) } };
  assert.equal(logLine({ t: 'heal', target: 'pip', amount: 4, rot: true }, disp).text, 'Pip recovers 4 HP (halved by rot)');
  assert.equal(logLine({ t: 'heal', target: 'pip', amount: 8 }, disp).text, 'Pip recovers 8 HP');
  assert.equal(logLine({ t: 'status', target: 'pip', status: 'swallowed', op: 'add', stacks: 1, source: 'f1', label: 'Swallowed whole' }, disp).text, 'Pip is swallowed whole by The Blackwater Leviathan');
  assert.equal(logLine({ t: 'status', target: 'pip', status: 'swallowed', op: 'add', stacks: 1, source: 'f2', label: 'In the river' }, disp).text, 'Pip is in the river, put there by Hodge');
  assert.equal(logLine({ t: 'status', target: 'pip', status: 'hexed', op: 'add', stacks: 1 }, disp).text, 'Pip is Hexed');
  assert.equal(logLine({ t: 'status', target: 'pip', status: 'rotting', op: 'add', stacks: 2 }, disp).text, 'Pip is Rotting x2');
  assert.equal(logLine({ t: 'ko', target: 'f2', text: 'Hodge sits down on his stool.' }, disp).text, 'Hodge sits down on his stool.');
});

test('M6: a price reads as it costs ("120 gold", "2 Hearth Tonics", "1 silver")', () => {
  assert.equal(priceText({ gold: 120 }), '120 gold');
  assert.equal(priceText({ bag: { 'hearth-tonic': 2 } }), '2 Hearth Tonics');
  assert.equal(priceText({ bag: { 'hearth-tonic': 1 } }), '1 Hearth Tonic');
  assert.equal(priceText({ materials: { silver: 1 } }), '1 silver');
  assert.equal(priceText({ gold: 5, materials: { silver: 2 } }), '5 gold, 2 silver');
  assert.equal(priceText({}), '');
  assert.equal(priceText(), '');
});

test('M6 battle UI: a grip bar names a Page IV relic by the thing, not whose it is; the older relics keep their words', () => {
  const shipped = name => name.replace(/^The /, '').split(' ')[0];
  const WHOSE = /['\u2019]s?$/;
  const IV = PAGES.find(p => p.id === 'gloomfen');
  let whose = 0;
  for (const r of Object.values(RELICS)) {
    const w = gripWord(r.name, r.id), older = r.codex < IV.from;
    if (older) assert.equal(w, shipped(r.name), `${r.id} keeps "${shipped(r.name)}"`);
    else if (WHOSE.test(shipped(r.name))) { whose++; assert.equal(w, r.name.split(' ').at(-1), `${r.id}: "${r.name}" goes by the thing`); }
    else assert.equal(w, shipped(r.name), `${r.id}: "${r.name}" goes by its first word`);
    assert.equal(WHOSE.test(w), older && WHOSE.test(shipped(r.name)), `${r.id}: "${w}" says whose only on an older relic`);
  }
  assert.ok(whose >= 6, `Page IV has its possessive names (${whose})`);
  assert.deepEqual(['unfair-toll', 'gar-tooth', 'corvus-harpoon', 'lamplighters-lantern', 'salvagers-helm', 'cantors-staff'].map(id => gripWord(RELICS[id].name, id)),
    ['Toll', 'Tooth', 'Harpoon', 'Lantern', 'Helm', 'Staff']);
  assert.equal(gripWord(RELICS['wardens-seal'].name, 'wardens-seal'), 'Warden\'s', 'the tutorial\'s Warden\'s Seal reads as it shipped');
  assert.equal(gripWord(RELICS.bogstriders.name, 'bogstriders'), 'Bogstriders');
  assert.equal(gripWord('Echo of a Blade', null), 'Echo', 'an Echo (no relic id) goes by its first word');
});

test('M6 battle UI: Tamsin wears her Bogstriders on Rotbridge over her lent starter; every earlier foe looks as it shipped', () => {
  const foesOf = enc => { try { return Object.values(startBattle(newGame({ seed: 3 }), { nodeId: enc }).battle.units).filter(u => u.side === 'foe'); } catch { return []; } };
  const [rb] = foesOf('tamsin-rotbridge');
  const o = foeLook(rb);
  assert.equal(o.wears, 'bogstriders', 'the worn boots go to the art');
  assert.ok(o.relic && o.relic !== 'bogstriders' && o.relicHeld, `she still holds her starter (${o.relic})`);
  // her earlier duels wear a piece too (the Vale Gauntlets, the Ironvein Bracers): their looks stay as they shipped
  for (const enc of ['tamsin-duel', 'tamsin-ironhold']) assert.equal(foeLook(foesOf(enc)[0]).wears, undefined, enc);
  let seen = 0;
  for (const id of Object.keys(ENCOUNTERS)) {
    if (id === 'tamsin-rotbridge') continue;
    for (const u of foesOf(id)) { seen++; assert.equal(foeLook(u).wears, undefined, `${id}: ${u.name}`); }
  }
  assert.ok(seen > 200, `every other foe looked at (${seen})`);
});
