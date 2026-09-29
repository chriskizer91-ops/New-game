// Tamsin's kits (M5 spec §4.3): '$rival:<duel>' resolves to the rival starter's variant plus that duel's
// kit (data/rivals.js); '$rival' alone is unchanged. Owner: P1 (M5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RIVAL_KITS, withKit } from '../src/data/rivals.js';
import { FOES } from '../src/data/foes.js';
import { STARTERS } from '../src/data/heroes.js';
import { ENCOUNTERS } from '../src/data/encounters.js';
import { familyOf, buildFoe } from '../src/rules/foe.js';
import { familyData, rollIntent } from '../src/rules/ai.js';
import { newGame, spawnsFor } from '../src/rules/gauntlet.js';
import { createRng } from '../src/core/rng.js';

test('every rival starter has an Ironhold kit whose table names only moves it can use', () => {
  const rivals = new Set(Object.values(STARTERS).map(s => s.rival));
  for (const r of rivals) {
    const kit = RIVAL_KITS[r]?.ironhold;
    assert.ok(kit, `${r}: an Ironhold kit`);
    const fam = familyOf({ family: 'tamsin', variant: r, kit: 'ironhold' });
    const faces = new Set();
    for (const [lo, hi, move] of kit.table) {
      assert.ok(fam.moves[move], `${r}: ${move} is one of her moves`);
      for (let f = lo; f <= hi; f++) faces.add(f);
    }
    assert.equal(faces.size, 12, `${r}: the kit covers every face of her d12`);
    // her relic Art is still hers: the rival starter's own move stays on the table
    const own = Object.keys(FOES.tamsin.variants[r].moves).find(m => !FOES.tamsin.moves[m]);
    assert.ok(kit.table.some(([, , m]) => m === own), `${r}: ${own} stays on her table`);
  }
});

test('a kit adds to her moves and replaces her table; no kit, no change', () => {
  const plain = familyOf({ family: 'tamsin', variant: 'cairnmaul' });
  const kitted = familyOf({ family: 'tamsin', variant: 'cairnmaul', kit: 'ironhold' });
  for (const m of Object.keys(plain.moves)) assert.deepEqual(kitted.moves[m], plain.moves[m], m);
  assert.ok(kitted.moves['iron-grip'] && !plain.moves['iron-grip']);
  assert.notDeepEqual(kitted.table, plain.table);
  assert.deepEqual(withKit(plain, 'cairnmaul', 'no-such-duel'), plain);
  assert.deepEqual(familyOf({ family: 'tamsin', variant: 'cairnmaul', kit: null }), plain);
  // the unit keeps its kit, and the AI reads the kitted table
  const u = buildFoe({ family: 'tamsin', variant: 'cairnmaul', kit: 'ironhold', relic: 'cairnmaul', lend: true, level: 16, gearTier: 4 }, { id: 'f1' });
  assert.equal(u.kit, 'ironhold');
  assert.ok(familyData(u).moves['bracer-block']);
  const s = { order: ['h', 'f1'], units: { f1: u, h: { id: 'h', side: 'hero', name: 'Wren', hp: 10, maxHp: 10, ko: false, gone: false, statuses: [], heroId: 'warden' } } };
  const rng = createRng(4);
  const seen = new Set();
  for (let i = 0; i < 400; i++) seen.add(rollIntent(s, u, rng).move);
  for (const m of ['iron-grip', 'hunters-mark', 'bracer-block', 'cairn-swing']) assert.ok(seen.has(m), `${m} comes up`);
  // a plain unit (no kit) never uses a kit move
  const p = buildFoe({ family: 'tamsin', variant: 'cairnmaul', level: 16, gearTier: 4 }, { id: 'f1' });
  assert.ok(!('kit' in p));
  const seen2 = new Set();
  for (let i = 0; i < 400; i++) seen2.add(rollIntent({ ...s, units: { ...s.units, f1: p } }, p, rng).move);
  assert.ok(!seen2.has('iron-grip'));
});

test('the earlier duels keep $rival as it was (no kit at the Eldest Tree or at Scorchgate); Ironhold brings her kit', () => {
  const g = newGame({ starter: 'stillwater-lance', seed: 3 });
  g.progress.flags.story.starter = 'stillwater-lance';
  for (const id of ['tamsin-duel', 'tamsin-scorchgate']) {
    const [sp] = spawnsFor(g, id);
    assert.equal(sp.variant, STARTERS['stillwater-lance'].rival, id);
    assert.ok(!sp.kit, `${id} has no kit`);
  }
  // Ironhold's spawn names '$rival:ironhold': she brings the kit
  assert.equal(ENCOUNTERS['tamsin-ironhold'].spawns[0].variant, '$rival:ironhold');
  for (const starter of Object.keys(STARTERS)) {
    const gs = newGame({ starter, seed: 3 });
    gs.progress.flags.story.starter = starter;
    const [sp] = spawnsFor(gs, 'tamsin-ironhold');
    assert.equal(sp.variant, STARTERS[starter].rival, starter);
    assert.equal(sp.kit, 'ironhold', starter);
  }
});

// M6 (spec §4.3; P4): Tamsin's Rotbridge kit, the same for each starter: something fen-footed from the Bogstriders and
// something desperate; her starter's Art keeps faces 8-11.
test('every rival starter has a Rotbridge kit: the same moves for each, every d12 face covered, her Art on 8-11', () => {
  const rivals = [...new Set(Object.values(STARTERS).map(s => s.rival))];
  const moveSets = new Set();
  for (const r of rivals) {
    const kit = RIVAL_KITS[r]?.rotbridge;
    assert.ok(kit, `${r}: a Rotbridge kit`);
    moveSets.add(JSON.stringify(kit.moves));
    const fam = familyOf({ family: 'tamsin', variant: r, kit: 'rotbridge' });
    const faces = new Map();
    for (const [lo, hi, move] of kit.table) {
      assert.ok(fam.moves[move], `${r}: ${move} is one of her moves`);
      for (let f = lo; f <= hi; f++) { assert.ok(!faces.has(f), `${r}: face ${f} once`); faces.set(f, move); }
    }
    assert.equal(faces.size, 12, `${r}: the kit covers every face of her d12`);
    const own = Object.keys(FOES.tamsin.variants[r].moves).find(m => !FOES.tamsin.moves[m]);
    for (let f = 8; f <= 11; f++) assert.equal(faces.get(f), own, `${r}: her Art (${own}) on face ${f}`);
    assert.equal(faces.get(12), 'not-like-this', 'and her last stand on the 12');
  }
  assert.equal(moveSets.size, 1, 'the same kit for each starter');
  const moves = RIVAL_KITS.cairnmaul.rotbridge.moves;
  // fen-footed: she moves where you cannot (Hasted, or you are Rooted in the mud)
  assert.ok(Object.values(moves).some(m => m.effects.some(e => e.status === 'hasted' && e.self)), 'fen-footed: she is Hasted');
  assert.ok(Object.values(moves).some(m => m.effects.some(e => e.status === 'rooted')), 'and you are Rooted');
  // desperate: a charging all-or-nothing blow that leaves her open
  assert.ok(Object.values(moves).some(m => m.charge && m.effects.some(e => e.status === 'exposed' && e.self)), 'desperate: everything in one blow');
  for (const m of Object.values(moves)) assert.ok(m.name && m.text && m.effects.length, m.name);
});

test('Rotbridge brings her Rotbridge kit (\'$rival:rotbridge\'), for each starter, and she wears the Bogstriders', () => {
  assert.equal(ENCOUNTERS['tamsin-rotbridge'].spawns[0].variant, '$rival:rotbridge');
  for (const starter of Object.keys(STARTERS)) {
    const g = newGame({ starter, seed: 5 });
    g.progress.flags.story.starter = starter;
    const [sp] = spawnsFor(g, 'tamsin-rotbridge');
    assert.equal(sp.variant, STARTERS[starter].rival, starter);
    assert.equal(sp.kit, 'rotbridge', starter);
    assert.equal(sp.wears, 'bogstriders', `${starter}: she wears the Bogstriders`);
    const u = buildFoe(sp, { id: 'f1' });
    assert.ok(familyData(u).moves['fen-step'] && familyData(u).moves['all-in'], `${starter}: the kit's moves are hers`);
    assert.ok(u.gear.some(x => x.relic === 'bogstriders'), `${starter}: the boots are on her sprite`);
  }
});
