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

// M7 (spec A12, §3.5, §4.3; P4): Tamsin's finale kit. She fights beside the party against the Unsmith, a guest the
// engine plays; the same kit for each starter but her Art (the Bargain swung in her old starter's manner); every move
// but her ward and her last stand goes at the foes, and one pries at his pieces.
test('every rival starter has a finale kit: every d12 face covered, the same moves but her Art, aimed at the foes, one of them prying at his pieces', () => {
  const rivals = [...new Set(Object.values(STARTERS).map(s => s.rival))];
  const shared = new Set();
  for (const r of rivals) {
    const kit = RIVAL_KITS[r]?.finale;
    assert.ok(kit, `${r}: a finale kit`);
    assert.equal(kit.gearTier, 5, `${r}: in her finale look`);
    const fam = familyOf({ family: 'tamsin', variant: r, kit: 'finale' });
    const faces = new Map();
    for (const [lo, hi, move] of kit.table) {
      assert.ok(fam.moves[move], `${r}: ${move} is one of her moves`);
      for (let f = lo; f <= hi; f++) { assert.ok(!faces.has(f), `${r}: face ${f} once`); faces.set(f, move); }
    }
    assert.equal(faces.size, 12, `${r}: the kit covers every face of her d12`);
    const used = new Set(faces.values());
    // she sold her starter for the Bargain: the old starter's Art (which needs it) is not on her table
    const old = Object.keys(FOES.tamsin.variants[r].moves).find(m => !FOES.tamsin.moves[m]);
    assert.ok(!used.has(old), `${r}: ${old} needs the starter she sold`);
    for (const m of used) assert.ok(!fam.moves[m].requires, `${r}: ${m} needs nothing she lacks`);
    const others = rivals.filter(x => x !== r).map(x => RIVAL_KITS[x].finale.moves);
    const own = Object.keys(kit.moves).filter(m => others.every(o => !o[m]));
    assert.equal(own.length, 1, `${r}: one Art of her own`);
    for (let f = 8; f <= 10; f++) assert.equal(faces.get(f), own[0], `${r}: her Art on face ${f}`);
    for (const m of Object.keys(kit.moves).filter(m => m !== own[0])) shared.add(JSON.stringify([m, kit.moves[m]]));
    // aimed at the Unsmith (or whatever stands beside him), but her ward over the worst hurt of the party and her last stand
    for (const m of used) {
      const mv = fam.moves[m];
      if (mv.target === 'self') assert.ok(mv.when?.hpBelow && mv.effects.some(e => e.type === 'heal'), `${r}: ${m} is her last stand`);
      else if (mv.target === 'ally') assert.ok(mv.effects.every(e => e.status === 'warded'), `${r}: ${m} wards one of the party`);
      else assert.equal(mv.target, 'enemy', `${r}: ${m} goes at the foes`);
    }
    // one of them pries at his pieces with the grip effect, on top of a crushing blow
    const pry = [...used].filter(m => fam.moves[m].effects.some(e => e.type === 'grip' && /^\d+d\d+$/.test(e.dice)));
    assert.equal(pry.length, 1, `${r}: one move pries`);
    assert.ok(fam.moves[pry[0]].effects.some(e => e.type === 'attack' && e.kind === 'crush'), `${r}: and it lands a crushing blow too`);
    // she fights like one more strong hero, not like a Champion: her blows land at half weight and scale slowly
    for (const m of used) for (const e of fam.moves[m].effects.filter(x => x.type === 'attack')) assert.ok(e.mult <= 0.5 && e.diceEvery >= 12, `${r}: ${m} is a guest's blow`);
  }
  assert.equal(shared.size, Object.keys(RIVAL_KITS.cairnmaul.finale.moves).length - 1, 'the same shared moves for each starter');
  // the earlier kits are untouched
  for (const r of rivals) for (const k of ['ironhold', 'rotbridge']) assert.ok(RIVAL_KITS[r][k], `${r}: ${k}`);
});

test('the Unsmith\'s guest is Tamsin in her finale kit, for each starter: party level + 2, wearing her Bargain, on the party\'s side; she pries at his pieces', async () => {
  const { startBattle, partyLevel } = await import('../src/rules/gauntlet.js');
  const { runEffects } = await import('../src/rules/combat.js');
  for (const starter of Object.keys(STARTERS)) {
    const g = newGame({ starter, seed: 6 });
    g.progress.flags.story.starter = starter;
    g.progress.waking = 8;
    const { battle } = startBattle(g, { nodeId: 'unsmith' });
    const t = battle.units.a1;
    assert.deepEqual([t.side, t.guest, t.family, t.variant, t.kit], ['ally', true, 'tamsin', STARTERS[starter].rival, 'finale'], starter);
    assert.equal(t.level, partyLevel(g) + 2, `${starter}: party level + 2`);
    assert.ok(t.gear.some(x => x.relic === 'tamsins-bargain'), `${starter}: she wears Tamsin's Bargain`);
    assert.equal(t.held.length, 0, `${starter}: she holds nothing anyone could pry`);
    assert.ok(familyData(t).moves['pry-it-loose'], `${starter}: the kit is hers`);
    assert.ok(!Object.values(battle.units).some(u => u.side === 'foe' && u.family === 'tamsin'), `${starter}: she is not among the foes`);
    // Pry It Loose, from her to him: grip damage on one of his pieces
    const s = structuredClone(battle);
    const B = { s, rng: createRng(`pry:${starter}`), ev: [], touched: new Set(), relic: null };
    const u = s.units.f1;
    const before = u.held.map(p => p.grip);
    runEffects(B, s.units.a1, familyData(t).moves['pry-it-loose'].effects.filter(e => e.type === 'grip'), ['f1']);
    const grip = B.ev.find(e => e.t === 'grip' && e.target === 'f1');
    assert.ok(grip && grip.to < grip.from, `${starter}: she pries at ${grip?.relic}`);
    assert.ok(u.held.some((p, i) => p.grip < before[i]));
  }
});
