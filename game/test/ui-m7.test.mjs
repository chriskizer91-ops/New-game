// M7 (P7): the UI's pure helpers for Act III (docs/M7-SPEC.md §5): the guest on the party's side, the Unsmith's two
// dice and a hollow foe's +4 as the battle shows and logs them, the Stolen Arts, the new tiers' die looks, the
// pre-fight card's view, the Masterpiece tab's view, the Opening's card, the endings' cards, the credits and the last
// card, the Pages stat with Page V, the Journal's road below and the rumours' posters, the reliquary line, the
// Codex's road note, the Atlas's Below view and the Act III tracks. Where Act III's families are still the scaffold's
// stand-ins, the tests hold for the stand-ins and for the real families alike (they read the tier and the phases from
// the data), and the mechanics are driven on existing families with their tier swapped, as test/m7-rules.test.mjs
// does. The screens themselves are covered in Chromium by tools/e2e-world.mjs (40-46), tools/e2e-battle.mjs (hollow,
// unsmith) and tools/e2e-flow.mjs (Page V in the Milestone 6 profile).
import test from 'node:test';
import assert from 'node:assert/strict';
import { startBattle } from '../src/rules/gauntlet.js';
import { threat } from '../src/rules/world.js';
import { familyOf, stolenMoves } from '../src/rules/foe.js';
import { rollIntent, intentEvent, familyData } from '../src/rules/ai.js';
import { stolenFor } from '../src/rules/codex.js';
import { forgeMasterpiece, masterpieceCost } from '../src/rules/forge.js';
import { createRng } from '../src/core/rng.js';
import { TRACK_NAMES } from '../src/core/audio.js';
import { FOE_TIERS } from '../src/data/foes.js';
import { RELICS } from '../src/data/relics.js';
import { ENDINGS, ENDING_IDS } from '../src/data/endings.js';
import { MASTERPIECE_BASES } from '../src/data/masterpiece.js';
import { MAPS, MAP_IDS } from '../src/data/maps/index.js';
import { PAGES } from '../src/data/codex.js';
import { LADDER } from '../src/data/ladder.js';
import { BRAND_TOTAL } from '../src/data/world.js';
import { INTENT_DIE } from '../src/art/icons.js';
import { CUTS } from '../src/ui/assets/cuts/index.js';
import { Labels, makeDisp, shortName, inParty, isGuest, tierKey, intentsOf, dieText, stolenOf, moveAttacks, gripWord, ofPageV } from '../src/ui/battle/model.js';
import { logLine } from '../src/ui/battle/log.js';
import { intentDie } from '../src/ui/battle/hud.js';
import { foeLook } from '../src/ui/battle/sprites.js';
import { prefightView, masterpieceView, masterpieceTabShown } from '../src/ui/lib/act3.js';
import { openingCard, endingCard, creditsOf, LAST_CARD, chapterEnd } from '../src/ui/world/story-fx.js';
import { belowMaps, regionOpen } from '../src/ui/lib/atlas-geo.js';
import { RELIC_TOTAL } from '../src/ui/lib/carry-facts.js';
import { roadShown, rumourFound } from '../src/ui/screens/journal.js';
import { reliquaryLine, ROAD_NOTE, binderPage } from '../src/ui/screens/codex.js';
import { party, battleWith } from './helpers.mjs';

const BRANDS8 = ['brand-of-briars', 'brand-of-the-heartroot', 'brand-of-glass', 'brand-of-ash', 'brand-of-iron', 'brand-of-frost', 'brand-of-lanterns', 'brand-of-the-deep'];
// a game at the end of Act II (the fourth council sat), and (fifth) once the Opening has sat too
function councilGame({ fifth = false } = {}) {
  const g = structuredClone(party().game);
  Object.assign(g.progress.flags.story, {
    'act1-complete': true, 'council-done': true, 'sunscorch-complete': true, 'council-2-done': true, 'ironspire-complete': true,
    'council-3-done': true, 'gloomfen-complete': true, 'council-4-done': true, ...(fifth ? { 'council-5-done': true } : {}),
  });
  g.progress.brands = [...BRANDS8];
  return g;
}
// Hilda's price paid and her conditions met (as test/m7-rules.test.mjs readyForHilda)
function readyForHilda() {
  const g = councilGame({ fifth: true });
  g.progress.flags.beaten = { ...g.progress.flags.beaten, 'hollow-gretch': 1 };
  g.progress.flags.story['worldforge-page'] = true;
  const c = masterpieceCost();
  g.gold = c.gold + 7;
  g.materials = { ...g.materials, ...Object.fromEntries(Object.entries(c.materials).map(([k, n]) => [k, n + 1])) };
  g.gems = { ...g.gems, 'bog-amber': c.gems['bog-amber'] };
  return g;
}
// a champion from the data with its tier swapped (and, for the Unsmith, two dice and the relics he took)
function swapped(tier, { dice = 0, stolen = null, seed = 5 } = {}) {
  const s = battleWith([{ family: 'rotwarden', level: 10 }], { seed });
  const f = s.units.f1;
  f.tier = tier;
  f.intent = rollIntent(s, f, createRng(3), dice > 1 ? 0 : null);
  if (dice > 1) { f.dice = dice; f.intent2 = rollIntent(s, f, createRng(9), 1); }
  if (stolen) f.stolen = { ids: stolen, moves: stolenMoves(stolen) };
  return s;
}

// ---- the battle ------------------------------------------------------------------------------------------------

test('M7 battle: the guest stands on the party\'s side; "not a hero" no longer means a foe', () => {
  assert.equal(inParty({ side: 'hero' }), true);
  assert.equal(inParty({ side: 'ally' }), true);
  assert.equal(inParty({ side: 'foe' }), false);
  assert.equal(inParty(null), false);
  assert.equal(isGuest({ side: 'ally', guest: true }), true);
  assert.equal(isGuest({ side: 'hero' }), false);
  assert.equal(isGuest({ side: 'foe' }), false);
});

test('M7 battle: the Unsmith\'s fight brings Tamsin in beside the party, named like a hero and never lettered like a foe', () => {
  const { game } = party();
  const { battle: s } = startBattle(game, { nodeId: 'unsmith' });
  const guests = s.order.map(id => s.units[id]).filter(u => u.side === 'ally');
  assert.equal(guests.length, 1, 'one guest');
  const labels = new Labels();
  const disp = makeDisp(s, labels);
  const a = disp.units[guests[0].id];
  assert.match(a.id, /^a\d+$/);
  assert.equal(a.guest, true);
  assert.match(a.name, /Tamsin/);
  assert.equal(a.label, shortName(a.name), 'her card goes by her short name, as a hero\'s');
  assert.ok(inParty(a) && isGuest(a));
  assert.ok(!Object.keys(labels.map).includes(a.id), 'the foes\' letters leave her out');
  assert.ok(a.intent && intentsOf(a).length === 1, 'she shows her next move, as a foe does');
  assert.ok(s.openingEvents.some(e => e.t === 'intent' && e.foe === a.id && e.side === 'ally'), 'her intent is said as the guest\'s');
  // the display units carry only what the engine gave: no second die, no Stolen Arts on her
  assert.equal(a.dice, undefined);
  assert.deepEqual(stolenOf(a), []);
  // her look's tier comes with her (her finale kit, uncapped); a foe's display unit stays as it shipped, without one
  assert.equal(a.artTier, guests[0].artTier ?? guests[0].gearTier ?? 0);
  assert.ok(Object.values(disp.units).filter(u => u.side === 'foe').every(u => !('artTier' in u)));
});

test('M7 battle: the tiers\' lookups read the hollow and the Unsmith as the Champion, unless a table gives them a row', () => {
  // (P6's art/icons.js gives both dice looks of their own: the smoky hollow d20, the forge-iron one)
  assert.equal(intentDie('hollow'), INTENT_DIE.hollow || INTENT_DIE.champion);
  assert.equal(intentDie('unsmith'), INTENT_DIE.unsmith || INTENT_DIE.champion);
  assert.equal(intentDie('veteran'), INTENT_DIE.veteran);
  assert.equal(intentDie(null), INTENT_DIE.rabble);
  assert.equal(intentDie('no-such-tier'), INTENT_DIE.rabble);
  assert.equal(intentDie('hollow').sides, FOE_TIERS.hollow.die, 'a d20');
  assert.equal(intentDie('unsmith').sides, FOE_TIERS.unsmith.die, 'a d20');
  assert.equal(tierKey(INTENT_DIE, 'hollow'), INTENT_DIE.hollow ? 'hollow' : 'champion');
  assert.equal(tierKey({ champion: 2 }, 'hollow'), 'champion', 'a table without a row reads the Champion\'s');
  assert.equal(tierKey({ hollow: 1, champion: 2 }, 'hollow'), 'hollow', 'a table may give a new tier a row of its own');
  // the art draws them with the Champion's look (the approved battle look is unchanged)
  assert.equal(foeLook({ art: 'rotwarden', tier: 'hollow' }).tier, 'champion');
  assert.equal(foeLook({ art: 'rotwarden', tier: 'unsmith' }).tier, 'champion');
  assert.equal(foeLook({ art: 'cutpurse', tier: 'veteran' }).tier, 'veteran');
  // what the Unsmith took reaches the art (at most six), from a display unit's list or an engine unit's { ids }
  const ids = stolenFor(party().game);
  assert.deepEqual(foeLook({ art: 'ashen-warden', tier: 'unsmith', stolen: ids.slice(0, 2) }).stolen, ids.slice(0, 2));
  assert.deepEqual(foeLook({ art: 'ashen-warden', tier: 'unsmith', stolen: { ids, moves: {} } }).stolen, ids.slice(0, 6));
  assert.equal(foeLook({ art: 'ashen-warden', tier: 'unsmith' }).stolen, undefined, 'nothing taken, nothing passed');
  assert.equal(foeLook({ art: 'ashen-warden', tier: 'unsmith', stolen: [] }).stolen, undefined);
});

test('M7 battle: Page V\'s grip words go by the thing (the four gifts no longer all read "Hollow")', () => {
  const V = ['fenwicks-poker', 'hollow-wreath', 'hollow-chalice', 'hollow-gauntlet', 'hollow-chain', 'tamsins-bargain', 'unmaking-hammer', 'ironvein-apron', 'worldforge-heart'];
  assert.deepEqual(V.map(id => gripWord(RELICS[id].name, id)), ['Poker', 'Wreath', 'Chalice', 'Gauntlet', 'Chain', 'Bargain', 'Hammer', 'Apron', 'Heart']);
  assert.ok(V.every(ofPageV) && !ofPageV('wardens-seal') && !ofPageV('unfair-toll') && !ofPageV('no-such-relic'));
  assert.equal(gripWord(RELICS['wardens-seal'].name, 'wardens-seal'), 'Warden\'s', 'the older relics keep their words');
});

test('M7 battle: a hollow foe\'s die reads "d20 13 +4 = 17"; plain dice and openers read as they did', () => {
  assert.equal(dieText({ die: 20, face: 17 }), 'd20 17');
  assert.equal(dieText({ die: 20, face: 17, natural: 13, bonus: 4 }), 'd20 13 +4 = 17');
  assert.equal(dieText({ die: 20, face: 20, natural: 19, bonus: 4 }), 'd20 19 +4 = 20', 'capped at 20');
  assert.equal(dieText({ die: 12, face: null }), 'first move');
  assert.equal(dieText(null), '');
  // from the rules: every roll of a hollow foe says its natural roll, the +4 and the face that picks the move
  const s = swapped('hollow');
  const f = s.units.f1;
  const rng = createRng(12);
  for (let i = 0; i < 60; i++) {
    const it = rollIntent(s, f, rng);
    const m = dieText(it).match(/^d20 (\d+) \+4 = (\d+)$/);
    assert.ok(m, dieText(it));
    assert.equal(Number(m[2]), Math.min(20, Number(m[1]) + 4));
  }
});

test('M7 battle: the Unsmith\'s two dice and his Stolen Arts reach the display units', () => {
  const ids = stolenFor(party().game).slice(0, 3);
  assert.equal(ids.length, 3);
  const s = swapped('unsmith', { dice: 2, stolen: ids });
  const u = makeDisp(s, new Labels()).units.f1;
  assert.equal(u.dice, 2);
  assert.equal(u.intent.slot, 0);
  assert.equal(u.intent2.slot, 1);
  assert.deepEqual(intentsOf(u).map(i => i.slot), [0, 1], 'shown in the order they are played');
  assert.notEqual(u.intent2, s.units.f1.intent2, 'a copy: the display never shares the engine\'s objects');
  assert.deepEqual(u.stolen, ids);
  assert.deepEqual(stolenOf(u).map(x => x.id), ids);
  assert.ok(stolenOf(u).every(x => x.name === RELICS[x.id].name && x.move === `Stolen: ${RELICS[x.id].name}`));
  // a one-die foe shows one intent, and nothing stolen
  const one = makeDisp(battleWith([{ family: 'rotwarden', level: 10 }], { seed: 5 }), new Labels()).units.f1;
  assert.equal(intentsOf(one).length, 1);
  assert.equal(one.dice, undefined);
  assert.equal(one.stolen, undefined);
  assert.deepEqual(stolenOf(one), []);
  assert.deepEqual(stolenOf({ stolen: ['no-such-relic', ids[0]] }).map(x => x.id), [ids[0]], 'an unknown id is dropped');
  assert.deepEqual(intentsOf({ intent: { face: 3 }, intent2: { face: 9 } }).length, 1, 'a second intent shows only with two dice');
});

test('M7 battle: the log names a hollow foe\'s +4, each of the Unsmith\'s dice and what he took; older lines as they were', () => {
  const hs = swapped('hollow');
  const hd = makeDisp(hs, new Labels());
  const f = hs.units.f1;
  const it = rollIntent(hs, f, createRng(21));
  const line = logLine(intentEvent(f, it), hd);
  assert.equal(line.kind, 'intent');
  assert.ok(line.text.endsWith(`(d20 ${it.natural} +4 = ${it.face})`), line.text);
  // two dice: each line names its die
  const us = swapped('unsmith', { dice: 2 });
  const ud = makeDisp(us, new Labels());
  const U = us.units.f1;
  assert.match(logLine(intentEvent(U, U.intent), ud).text, /, die 1 of 2\)$/);
  assert.match(logLine(intentEvent(U, U.intent2), ud).text, /, die 2 of 2\)$/);
  // M6's lines, unchanged
  const pd = makeDisp(battleWith([{ family: 'cutpurse', level: 3 }]), new Labels());
  const name = pd.units.f1.label;
  assert.equal(logLine({ t: 'intent', foe: 'f1', die: 12, face: 9, text: '9: Slash at Pip', name: 'Slash' }, pd).text, `${name} readies Slash at Pip (d12 9)`);
  assert.equal(logLine({ t: 'intent', foe: 'f1', die: 6, face: null, text: 'Opens with a roar', name: 'Roar' }, pd).text, `${name} readies Opens with a roar (always the first move)`);
  assert.equal(logLine({ t: 'intent', foe: 'f1', die: 6, face: 4, text: 'x', name: 'X', queued: true }, pd).text, `Foreseen: ${name} will use X (d6 4)`);
  // what he took, in the engine's own words (rules/combat.js takeStolen)
  const ids = stolenFor(party().game).slice(0, 2);
  const text = `The Unsmith takes up what you never claimed: ${ids.map(id => RELICS[id].name).join(', ')}.`;
  assert.deepEqual(logLine({ t: 'stolen', foe: 'f1', relics: ids, names: ids.map(id => RELICS[id].name), guard: 17, text }, ud), { text, kind: 'stolen' });
  assert.equal(logLine({ t: 'stolen', foe: 'f1', relics: [] }, ud), null);
});

test('M7 battle: a move strikes with an attack roll or it does not (the guest\'s figure attacks or casts)', () => {
  const s = battleWith([{ family: 'cutpurse', level: 3 }]);
  const u = s.units.f1;
  const moves = familyData(u).moves;
  for (const [id, m] of Object.entries(moves)) assert.equal(moveAttacks(u, id), !!m.effects?.some(e => e.type === 'attack'), id);
  assert.ok(Object.keys(moves).some(id => moveAttacks(u, id)), 'the Cutpurse attacks with something');
  assert.equal(moveAttacks(u, 'no-such-move'), false);
  assert.equal(moveAttacks({ family: 'no-such-family' }, 'x'), false, 'odd input never throws');
});

// ---- the pre-fight card ------------------------------------------------------------------------------------------

test('M7 pre-fight: the card\'s dice, what the Unsmith will take and who fights beside you come from the rules', () => {
  const g = councilGame({ fifth: true });
  for (const enc of ['hollow-miravel', 'hollow-qasim', 'hollow-brundar', 'hollow-gretch', 'unsmith']) {
    const V = prefightView(g, enc);
    const spawns = threat(g, enc).spawns;
    assert.equal(V.dice.length, spawns.length, enc);
    V.dice.forEach((d, i) => {
      const F = familyOf(spawns[i]), T = FOE_TIERS[F.tier];
      assert.equal(d.tier, F.tier);
      assert.equal(d.die, T.die, `${enc}: the tier's die`);
      assert.equal(d.dice, T.dice || 1, `${enc}: the Unsmith's two, else one`);
      assert.equal(d.bonus, T.bonus || 0, `${enc}: a hollow foe's +4`);
      assert.equal(d.gift, d.bonus ? F.bonusWhile || null : null, `${enc}: the gift the +4 lasts while, if the family names one`);
      assert.equal(d.giftName, d.gift ? RELICS[d.gift]?.name || null : null);
    });
    // what he will take: the list the fight itself uses, at the phase that steals; nothing for a foe that never steals
    const steal = spawns.map(s => (familyOf(s).phases || []).findIndex(p => p.steals)).find(k => k >= 0);
    if (steal == null) assert.equal(V.stolen, null, enc);
    else {
      assert.deepEqual(V.stolen.relics, stolenFor(g), enc);
      assert.deepEqual(V.stolen.names, V.stolen.relics.map(id => RELICS[id].name));
      assert.equal(V.stolen.phase, steal + 1);
    }
    if (enc !== 'unsmith') assert.deepEqual(V.allies, [], `${enc}: the Council's fights are the party's alone`);
  }
  // Tamsin fights beside you against the Unsmith
  const U = prefightView(g, 'unsmith');
  assert.equal(U.allies.length, 1);
  assert.match(U.allies[0].name, /Tamsin/);
  assert.equal(U.allies[0].spawn.family, 'tamsin');
  // odd input never throws
  assert.deepEqual(prefightView(g, 'no-such-fight'), { dice: [], stolen: null, allies: [] });
});

// ---- the Masterpiece ---------------------------------------------------------------------------------------------

test('M7 Masterpiece: the tab shows from the fifth council, says what stops the forging, and never takes a hostile name', () => {
  const fresh = party().game;
  assert.equal(masterpieceTabShown(fresh), false, 'not before Act III');
  assert.equal(masterpieceTabShown(councilGame()), false, 'not at the end of Act II');
  assert.equal(masterpieceTabShown(councilGame({ fifth: true })), true, 'from the Opening on');
  // not offered: the rules' first reason
  let V = masterpieceView(councilGame({ fifth: true }));
  assert.equal(V.ready, false);
  assert.equal(V.forged, null);
  assert.equal(V.offer.ok, false);
  assert.equal(V.why, V.offer.reasons[0]);
  assert.match(V.why, /Hollow Council/);
  assert.deepEqual(V.offer.bases, [...MASTERPIECE_BASES]);
  assert.equal(V.offer.bases.length, 10);
  // offered: a base, then a name
  const g = readyForHilda();
  V = masterpieceView(g);
  assert.equal(V.offer.ok, true);
  assert.equal(V.why, 'Choose the weapon Hilda is to forge');
  assert.equal(masterpieceView(g, { base: 'belt-knife', name: 'Pin' }).why, 'Choose the weapon Hilda is to forge', 'only the listed bases');
  const base = MASTERPIECE_BASES[0];
  V = masterpieceView(g, { base });
  assert.equal(V.why, 'Give it a name');
  assert.equal(V.typed, false);
  for (const hostile of ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', 'x'.repeat(25), '   ']) {
    V = masterpieceView(g, { base, name: hostile });
    assert.equal(V.name, null, hostile);
    assert.equal(V.nameOk, false);
    assert.equal(V.ready, false);
  }
  V = masterpieceView(g, { base, name: '<img src=x onerror=alert(1)>' });
  assert.equal(V.typed, true);
  assert.match(V.why, /^Name it with 1 to 24 letters, numbers, spaces, apostrophes or hyphens$/);
  V = masterpieceView(g, { base, name: '<Ember-Heart>' });
  assert.equal(V.name, 'Ember-Heart', 'angle brackets are scrubbed, as from a pasted code');
  assert.equal(V.why, null);
  assert.equal(V.ready, true);
  V = masterpieceView(g, { base, name: "Wren's Answer" });
  assert.equal(V.name, "Wren's Answer");
  // forged: one per save, and the tab stays to show it
  const r = forgeMasterpiece(g, { base, name: V.name });
  assert.equal(r.ok, true);
  V = masterpieceView(r.game, { base: MASTERPIECE_BASES[1], name: 'Another' });
  assert.equal(V.forged?.name, "Wren's Answer");
  assert.equal(V.ready, false);
  assert.equal(V.why, 'Hilda forges one Masterpiece, and it is yours already');
  assert.equal(masterpieceTabShown(r.game), true);
  const bare = structuredClone(r.game);
  delete bare.progress.flags.story['council-5-done'];
  delete bare.progress.flags.story['masterpiece-forged'];
  assert.equal(masterpieceTabShown(bare), true, 'owning one is enough');
  assert.equal(masterpieceTabShown(null), false, 'odd input never throws');
});

// ---- the cards -----------------------------------------------------------------------------------------------------

test('M7 cards: the Opening\'s title card, "Act III: The Hollow Council", with every coal lit', () => {
  const V = openingCard(councilGame({ fifth: true }));
  assert.equal(V.label, 'Act III: The Hollow Council');
  assert.equal(V.kick, 'Act III');
  assert.equal(V.title, 'The Hollow Council');
  assert.equal(V.coals, BRAND_TOTAL);
  assert.equal(V.lines.length, 2);
  assert.match(V.lines[1], /stair under the vault stands open/);
  assert.equal(openingCard(party().game).coals, 0, 'the coals are the save\'s own');
  assert.equal(openingCard(null).coals, BRAND_TOTAL, 'odd input never throws');
});

test('M7 cards: three ending cards, each with its still if painted, else its own scene; Kindle Anew names the Masterpiece', () => {
  const g = councilGame({ fifth: true });
  assert.deepEqual([...ENDING_IDS], ['rekindle', 'release', 'anew']);
  for (const id of ENDING_IDS) {
    const V = endingCard(g, id);
    assert.equal(V.id, id);
    assert.equal(V.name, ENDINGS[id].name);
    assert.equal(V.sub, ENDINGS[id].text);
    assert.equal(V.cut, `ending-${id}`);
    assert.equal(V.still, !!CUTS[`ending-${id}`], 'the player\'s still when there is one; the drawn scene otherwise');
    assert.ok(V.kick && V.lines.length >= 1);
  }
  assert.equal(new Set(ENDING_IDS.map(id => endingCard(g, id).kick)).size, 3, 'each ending its own kick');
  assert.equal(endingCard(g, 'no-such-ending').id, 'rekindle', 'odd input never throws');
  // Kindle Anew: the Warden's Masterpiece burns in the hearth (a plain string: the card sets it as text)
  const r = forgeMasterpiece(readyForHilda(), { base: MASTERPIECE_BASES[2], name: 'Hearthsong' });
  assert.equal(endingCard(r.game, 'anew').lines.at(-1), 'Hearthsong burns in the Eternal Hearth.');
  assert.ok(!endingCard(r.game, 'release').lines.some(l => /Hearthsong/.test(l)), 'only Kindle Anew names it');
  assert.ok(!endingCard(g, 'anew').lines.some(l => /burns in the Eternal Hearth/.test(l)), 'no Masterpiece, no line');
});

test('M7 cards: the credits name the cast and this journey; every saved string stays a plain string', () => {
  const r = forgeMasterpiece(readyForHilda(), { base: MASTERPIECE_BASES[0], name: 'Keeper' });
  const g = structuredClone(r.game);
  const hostile = '<img src=x onerror=alert(1)>';
  g.party.roster.warden.name = hostile;
  g.ending = 'anew';
  const C = creditsOf(g);
  assert.equal(C.title, 'Aethermoor: Hearth & Heirloom');
  assert.deepEqual(C.rows[0], ['The Warden', hostile], 'the Warden\'s name as it was typed: the card sets it as text, never as markup');
  assert.ok(C.rows.some(([k, v]) => k === 'Harrow Ironvein' && v === 'the Unsmith'));
  assert.ok(C.rows.some(([k]) => /Tamsin/.test(k)));
  const J = Object.fromEntries(C.journey);
  assert.equal(J['Relics claimed'], `${Object.values(g.codex).filter(e => e.claimed).length} of ${RELIC_TOTAL}`);
  assert.equal(J['Brands'], `${BRANDS8.length} of ${BRAND_TOTAL}`);
  assert.match(J['Codex pages'], new RegExp(`^\\d of ${PAGES.length}$`));
  assert.equal(J['The Masterpiece'], 'Keeper');
  assert.equal(J['The ending'], 'Kindle Anew');
  assert.ok([...C.rows, ...C.journey].every(([k, v]) => typeof k === 'string' && typeof v === 'string'));
  // no Masterpiece, no ending chosen: neither row
  const plain = Object.fromEntries(creditsOf(party().game).journey);
  assert.ok(!('The Masterpiece' in plain) && !('The ending' in plain));
  assert.ok(creditsOf(null).rows.length > 0, 'odd input never throws');
  assert.equal(RELIC_TOTAL, Object.keys(RELICS).length);
});

test('M7 cards: the last card says the post-game opens in the next chapter', () => {
  assert.equal(LAST_CARD.title, 'The post-game opens in the next chapter');
  assert.ok(LAST_CARD.kick && LAST_CARD.lines.length >= 1);
  assert.ok(Object.isFrozen(LAST_CARD) && Object.isFrozen(LAST_CARD.lines));
});

test('M7 cards: every chapter card\'s Pages stat counts all five pages, Page V among them', () => {
  assert.equal(PAGES.length, 5);
  const g = councilGame();
  for (const act of ['act2', 'ironspire', 'gloomfen']) {
    const V = chapterEnd(g, act);
    assert.deepEqual(V.stats[3], ['Pages', `0/${PAGES.length}`], act);
  }
});

// ---- the Codex, the Journal, the Atlas, the music ------------------------------------------------------------------

test('M7 Codex: the reliquary counts the relics its galleries hold, and names Page V\'s nine as carried or below', () => {
  const fresh = party().game;
  assert.equal(reliquaryLine(fresh), '1 of 66 relics home', 'the starter you carry is home; Page V has no gallery');
  assert.equal(reliquaryLine(councilGame()), '1 of 66 relics home · Page V: 0 carried, 9 below', 'from the fourth council on');
  const poker = structuredClone(fresh);
  poker.codex['fenwicks-poker'] = { sighted: true, claimed: true, awakened: false };
  assert.equal(reliquaryLine(poker), '1 of 66 relics home · Page V: 1 carried, 8 below', 'or once one of them is carried');
  assert.equal(reliquaryLine(null), '0 of 66 relics home');
});

test('M7 Codex: Page V lists No. 000 first, and says what opens its road until the fifth council', () => {
  const fresh = party().game;
  const P = binderPage(fresh, 'below');
  assert.equal(P.sealed, false);
  assert.deepEqual(P.relics.map(r => r.codex), [0, 67, 68, 69, 70, 71, 72, 73, 74]);
  assert.equal(P.relics[0].id, 'fenwicks-poker');
  assert.equal(P.road, ROAD_NOTE.below);
  assert.match(ROAD_NOTE.below, /fifth time/);
  assert.match(ROAD_NOTE.below, /vault/);
  assert.equal(binderPage(councilGame({ fifth: true }), 'below').road, null, 'the road is open');
  assert.ok(P.relics.every(r => r.riddle && r.riddle !== 'Nobody has seen it yet.'), 'every piece of Page V has its riddle');
});

test('M7 Journal: the road below shows from the fourth council on, sealed until the fifth', () => {
  const fresh = party().game;
  assert.equal(roadShown(fresh, 'below'), false, 'not named before the Hollow Council is');
  const c4 = councilGame();
  assert.equal(roadShown(c4, 'below'), true);
  assert.equal(regionOpen(c4, 'below'), false, 'listed, sealed');
  const c5 = councilGame({ fifth: true });
  assert.equal(roadShown(c5, 'below'), true);
  assert.equal(regionOpen(c5, 'below'), true, 'the stair under the vault stands open');
  // the Act II roads show as they did
  for (const r of ['sunscorch', 'ironspire', 'gloomfen']) assert.equal(roadShown(fresh, r), true, r);
  assert.equal(roadShown(fresh, 'no-such-region'), false);
});

test('M7 Journal: a rumour settles into its poster ("Found: the Unsmith") once the story says so', () => {
  const ladder = [
    { id: 'missing-smith', name: 'the missing smith', silhouette: true, act: 2, found: { if: { flag: 'council-5-done' }, poster: 'unsmith' } },
    { id: 'unsmith', enc: 'unsmith', spawn: 0, name: 'The Unsmith', act: 3 },
  ];
  assert.equal(rumourFound(councilGame(), 'missing-smith', ladder), null, 'not before its condition holds');
  assert.deepEqual(rumourFound(councilGame({ fifth: true }), 'missing-smith', ladder), { poster: 'unsmith', name: 'The Unsmith' });
  assert.equal(rumourFound(councilGame({ fifth: true }), 'unsmith', ladder), null, 'a poster is no rumour');
  assert.equal(rumourFound(councilGame({ fifth: true }), 'missing-smith', [{ ...ladder[0], found: { if: { flag: 'council-5-done' }, poster: 'nobody' } }]), null);
  assert.equal(rumourFound(councilGame({ fifth: true }), 'no-such-rumour'), null);
  // the rules' own word, when ladder() gives one (`found`: the poster's id), is taken as it is
  assert.deepEqual(rumourFound(councilGame(), 'missing-smith', ladder, 'unsmith'), { poster: 'unsmith', name: 'The Unsmith' });
  assert.equal(rumourFound(councilGame(), 'missing-smith', ladder, 'nobody'), null);
  // the data: a rumour that settles names a real poster
  for (const L of LADDER.filter(x => x.found)) assert.ok(LADDER.some(x => x.id === L.found.poster && x.enc), `${L.id} settles into a poster`);
});

test('M7 Atlas: the Below view lists the four maps down from the vault, where you stand and where you have walked', () => {
  const ids = MAP_IDS.filter(id => MAPS[id].region === 'below');
  assert.equal(ids.length, 4);
  assert.ok(ids.includes('worldforge'));
  const fresh = party().game;
  assert.deepEqual(belowMaps(fresh).map(m => [m.id, m.state]), ids.map(id => [id, 'unwalked']));
  const g = structuredClone(fresh);
  g.progress.pos.map = ids[2];
  g.progress.flags.visits = { ...g.progress.flags.visits, [ids[0]]: 1, [ids[2]]: 2 };
  assert.deepEqual(belowMaps(g).map(m => m.state), ['walked', 'unwalked', 'here', 'unwalked']);
  assert.ok(belowMaps(g).every(m => m.name === MAPS[m.id].name));
  assert.equal(belowMaps(null).length, 4, 'odd input never throws');
});

test('M7 music: the Act III maps play the dungeon track, and the Worldforge the boss track', () => {
  const ids = MAP_IDS.filter(id => MAPS[id].region === 'below');
  for (const id of ids) {
    assert.ok(TRACK_NAMES.includes(MAPS[id].music), `${id}: "${MAPS[id].music}" is a track`);
    assert.equal(MAPS[id].music, id === 'worldforge' ? 'boss' : 'dungeon', id);
  }
});
