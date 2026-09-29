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

test('the earlier duels keep $rival as it was: no kit at the Eldest Tree or at Scorchgate', () => {
  const g = newGame({ starter: 'stillwater-lance', seed: 3 });
  g.progress.flags.story.starter = 'stillwater-lance';
  for (const id of ['tamsin-duel', 'tamsin-scorchgate']) {
    const [sp] = spawnsFor(g, id);
    assert.equal(sp.variant, STARTERS['stillwater-lance'].rival, id);
    assert.ok(!sp.kit, `${id} has no kit`);
  }
  // Ironhold: once its spawn names '$rival:ironhold', she brings the kit
  const iron = ENCOUNTERS['tamsin-ironhold'].spawns[0];
  if (iron.variant === '$rival:ironhold') {
    const [sp] = spawnsFor(g, 'tamsin-ironhold');
    assert.equal(sp.variant, STARTERS['stillwater-lance'].rival);
    assert.equal(sp.kit, 'ironhold');
  }
});
