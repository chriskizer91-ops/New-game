// Milestone 7's rules (docs/M7-SPEC.md §4; P1): the hollow tier's +4, the Unsmith's two dice, the guest on the
// heroes' side, the Stolen Arts, the Masterpiece, Page V's conditions and the endings' condition and effect, the
// Unmade and Hearthlit statuses and the `save` stat. The Act III families and encounters themselves are P4's
// (test/data.test.mjs); here the mechanics are driven on existing families.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOE_TIERS, tierAs, tierRow } from '../src/data/foes.js';
import { TUNING } from '../src/data/tuning.js';
import { RELICS } from '../src/data/relics.js';
import { STATUSES } from '../src/data/statuses.js';
import { ENDINGS, ENDING_IDS } from '../src/data/endings.js';
import { MASTERPIECE_BASES, MASTERPIECE_POWER } from '../src/data/masterpiece.js';
import { createBattle, current, act, foeTurn, allyTurn, outcome, commands, targets, inspect } from '../src/rules/battle.js';
import { rollIntent, dieBonus, intentEvent } from '../src/rules/ai.js';
import { stolenArt, stolenMoves } from '../src/rules/foe.js';
import { stolenFor, allPagesDone, pagesDone } from '../src/rules/codex.js';
import { check, condErrors } from '../src/rules/cond.js';
import { masterpieceOffer, masterpieceName, forgeMasterpiece, masterpieceCost } from '../src/rules/forge.js';
import { saveProblems, migrate } from '../src/rules/migrate.js';
import { POWERS, deriveHero } from '../src/rules/stats.js';
import { createRng } from '../src/core/rng.js';
import { party, battleWith, playOut } from './helpers.mjs';

// ---- tiers ----------------------------------------------------------------------------------------------------

test('M7 tiers: hollow is a d20 with +4, the Unsmith two d20s; both read the Champion\'s rows', () => {
  assert.deepEqual({ ...FOE_TIERS.hollow }, { id: 'hollow', name: 'Hollow', die: 20, bonus: 4, as: 'champion' });
  assert.deepEqual({ ...FOE_TIERS.unsmith }, { id: 'unsmith', name: 'The Unsmith', die: 20, dice: 2, as: 'champion' });
  assert.equal(tierAs('hollow'), 'champion');
  assert.equal(tierAs('unsmith'), 'champion');
  assert.equal(tierAs('veteran'), 'veteran');
  assert.equal(tierRow(TUNING.xp.tier, 'hollow'), TUNING.xp.tier.champion);
  assert.equal(tierRow(TUNING.flee.tierDc, 'unsmith'), TUNING.flee.tierDc.champion);
  assert.equal(tierRow({ hollow: 7, champion: 1 }, 'hollow'), 7, 'a table may give a new tier a row of its own');
});

// A champion from the data with its tier swapped: the mechanics need no Act III data.
function withTier(tier, { dice } = {}) {
  const s = battleWith([{ family: 'rotwarden', level: 10 }], { seed: 5 });
  const f = s.units.f1;
  f.tier = tier;
  if (dice) { f.dice = dice; f.intent.slot = 0; f.intent2 = rollIntent(s, f, createRng(9), 1); }
  return s;
}

test('M7 hollow: the intent die adds +4 to the natural roll, capped at 20, and says so', () => {
  const s = withTier('hollow');
  const f = s.units.f1;
  assert.equal(dieBonus(f), 4, 'no gift named: the bonus always holds');
  const rng = createRng(3);
  let capped = 0;
  for (let i = 0; i < 200; i++) {
    const it = rollIntent(s, f, rng);
    assert.equal(it.bonus, 4);
    assert.ok(it.natural >= 1 && it.natural <= 20);
    assert.equal(it.face, Math.min(20, it.natural + 4));
    if (it.natural >= 16) capped++;
    assert.ok(it.face >= 5, 'a +4 d20 never shows below 5');
  }
  assert.ok(capped > 0, 'the high naturals cap at 20');
  const ev = intentEvent({ ...f, intent: rollIntent(s, f, rng) });
  assert.equal(ev.bonus, 4);
  assert.ok(ev.natural >= 1);
  // a Champion's intent keeps its old shape
  const c = withTier('champion');
  const it = rollIntent(c, c.units.f1, createRng(3));
  assert.ok(!('bonus' in it) && !('natural' in it) && !('slot' in it));
});

// (The +4 held only while the gift is held is checked on the Hollow Council's own families, which name their gifts:
// test/data.test.mjs, M7 P4.)

// ---- two dice -------------------------------------------------------------------------------------------------

test('M7 two dice: both intents are played on the turn, in order, each with its slot', () => {
  let s = withTier('unsmith', { dice: 2 });
  for (let i = 0; i < 40 && s.units[current(s)].side !== 'foe'; i++) s = act(s, { type: 'defend' }).state;
  assert.equal(current(s), 'f1');
  const r = foeTurn(s);
  const moves = r.events.filter(e => e.t === 'move' && e.actor === 'f1');
  assert.equal(moves.length, 2, 'two moves on one turn');
  assert.deepEqual(moves.map(m => m.slot), [0, 1]);
  const intents = r.events.filter(e => e.t === 'intent' && e.foe === 'f1');
  assert.deepEqual(intents.map(e => e.slot), [0, 1], 'and two fresh intents for the next');
  const u = r.state.units.f1;
  assert.equal(u.intent.slot, 0);
  assert.equal(u.intent2.slot, 1);
  assert.ok(inspect(r.state, 'f1').intent2, 'the Analyze panel shows the second');
});

test('M7 two dice: a Stagger breaks the next of the two, charging or not, then the other', () => {
  const s = withTier('unsmith', { dice: 2 });
  const f = s.units.f1;
  f.intent.charging = false;
  const Bx = { s, rng: createRng(4), ev: [], touched: new Set() };
  // addStatus through a real effect: run a stagger rider on f1 from a hero
  return import('../src/rules/combat.js').then(({ addStatus }) => {
    addStatus(Bx, f, 'staggered', { source: 'warden' });
    assert.equal(f.intent.cancelled, true, 'the first is broken');
    assert.ok(!f.intent2.cancelled, 'the second still comes');
    f.statuses = [];
    addStatus(Bx, f, 'staggered', { source: 'warden' });
    assert.equal(f.intent2.cancelled, true, 'a second Stagger breaks the second');
    assert.equal(Bx.ev.filter(e => e.t === 'text' && /broken off/.test(e.text)).length, 2);
  });
});

// ---- the guest ------------------------------------------------------------------------------------------------

function withGuest(seed = 21) {
  const { game, heroes } = party();
  return {
    game,
    s: createBattle({
      heroes, foes: [{ family: 'rotwarden', level: 6 }], allies: [{ family: 'tamsin', variant: 'cairnmaul', level: 8 }], seed,
      ctx: { inventory: game.inventory, bag: game.bag },
    }),
  };
}

test('M7 guest: an ally fights on the heroes\' side, built like a foe, and the engine plays her', () => {
  const { s } = withGuest();
  const a = s.units.a1;
  assert.equal(a.side, 'ally');
  assert.equal(a.guest, true);
  assert.equal(a.xp, 0);
  assert.ok(a.intent, 'she has an intent, like a foe');
  assert.ok(s.openingEvents.some(e => e.t === 'intent' && e.foe === 'a1' && e.side === 'ally'));
  assert.equal(allyTurn, foeTurn);
  assert.deepEqual(commands(s, 'a1'), [], 'she takes no command');
  let t = s, played = 0;
  for (let i = 0; i < 200 && current(t) && played < 3; i++) {
    const id = current(t);
    if (id === 'a1') {
      const r = foeTurn(t);
      const mv = r.events.find(e => e.t === 'move' && e.actor === 'a1');
      assert.ok(mv && mv.side === 'ally', 'her move is announced as the guest\'s');
      const hits = r.events.filter(e => (e.t === 'damage' || e.t === 'status') && e.actor === 'a1');
      for (const h of hits) assert.notEqual(t.units[h.target]?.side, 'hero', 'she never strikes the party');
      played++;
      t = r.state;
    } else t = (t.units[id].side === 'hero' ? act(t, { type: 'defend' }) : foeTurn(t)).state;
  }
  assert.ok(played >= 1, 'her turns come round');
});

test('M7 guest: the heroes can heal and revive her; the foes can aim at her', () => {
  const { s } = withGuest();
  assert.ok(targets(s, { actor: 'warden', targeting: 'ally' }).includes('a1'), 'a heal reaches her');
  const down = structuredClone(s);
  down.units.a1.ko = true;
  down.units.a1.hp = 0;
  assert.ok(targets(down, { actor: 'warden', targeting: 'ally-ko' }).includes('a1'), 'so does a revive');
  assert.ok(targets(s, { actor: 'warden', targeting: 'enemy' }).every(id => s.units[id].side === 'foe'));
  // over many foe intents, some aim at her
  const rng = createRng(8);
  let atHer = 0;
  for (let i = 0; i < 300; i++) if (rollIntent(s, s.units.f1, rng).target === 'a1') atHer++;
  assert.ok(atHer > 0, 'the foes aim at her too');
});

test('M7 guest: the fight is lost when every hero is down, though she stands; she is never in the party', () => {
  let { s: t } = withGuest();
  for (let i = 0; i < 200 && current(t) !== 'a1'; i++) t = (t.units[current(t)].side === 'hero' ? act(t, { type: 'defend' }) : foeTurn(t)).state;
  assert.equal(current(t), 'a1');
  const x = structuredClone(t);
  for (const u of Object.values(x.units)) if (u.side === 'hero') { u.hp = 0; u.ko = true; }
  const r = foeTurn(x);
  assert.equal(r.state.ended?.result, 'defeat', 'every hero down is a defeat');
  assert.ok(!r.state.units.a1.ko, 'though the guest still stands');
  // played out, outcome().party is the heroes only
  const o = outcome(playOut(withGuest(33).s).state);
  assert.ok(o.party.length && o.party.every(p => p.id !== 'a1'));
  assert.ok(o.beaten.every(b => b.id !== 'a1'));
});

// ---- Stolen Arts ----------------------------------------------------------------------------------------------

test('M7 Stolen Arts: stolenFor takes never-claimed Pages I-IV relics, the highest Codex number first, at most six', () => {
  const { game } = party();
  const list = stolenFor(game);
  assert.equal(list.length, TUNING.unsmith.stolen.max);
  const nos = list.map(id => RELICS[id].codex);
  assert.deepEqual(nos, [...nos].sort((a, b) => b - a), 'highest first');
  assert.ok(nos.every(n => n >= 1 && n <= 66), 'Pages I to IV only');
  for (const id of list) assert.ok(!game.codex[id]?.claimed);
  // claim the six he would take: he takes the next six down
  const g = structuredClone(game);
  for (const id of list) g.codex[id] = { sighted: true, claimed: true, awakened: false };
  const next = stolenFor(g);
  assert.ok(next.every(id => !list.includes(id)));
  assert.ok(RELICS[next[0]].codex < Math.min(...nos));
  // a full Codex leaves him nothing
  const full = structuredClone(game);
  for (const id of Object.keys(RELICS)) full.codex[id] = { sighted: true, claimed: true, awakened: false };
  assert.deepEqual(stolenFor(full), []);
  assert.deepEqual(stolenFor(game), list, 'deterministic');
});

test('M7 Stolen Arts: each relic becomes one move of its own, by its slot', () => {
  const bySlot = slot => Object.values(RELICS).find(r => r.slot === slot && r.codex >= 1 && r.codex <= 66);
  const w = stolenArt(bySlot('weapon').id);
  assert.match(w.name, /^Stolen: /);
  assert.equal(w.target, 'enemy');
  assert.equal(w.effects[0].type, 'attack');
  const armour = stolenArt(bySlot('body').id);
  assert.equal(armour.target, 'self');
  assert.deepEqual(armour.effects.map(e => e.status), ['guarding', 'warded']);
  const ring = Object.values(RELICS).find(r => (r.slot === 'ring' || r.slot === 'amulet') && !['radiant', 'verdant'].includes(r.aspect));
  assert.equal(stolenArt(ring.id).effects[0].status, 'hexed');
  const kind = Object.values(RELICS).find(r => (r.slot === 'ring' || r.slot === 'amulet') && ['radiant', 'verdant'].includes(r.aspect));
  if (kind) assert.equal(stolenArt(kind.id).effects[0].type, 'heal');
  const moves = stolenMoves([w.stolen, armour.stolen]);
  assert.deepEqual(Object.keys(moves), [`stolen:${w.stolen}`, `stolen:${armour.stolen}`]);
  assert.throws(() => stolenArt('no-such-relic'), /Unknown relic/);
});

// ---- the Masterpiece ------------------------------------------------------------------------------------------

function readyForHilda() {
  const g = structuredClone(party().game);
  g.progress.flags.beaten = { ...g.progress.flags.beaten, 'hollow-gretch': 1 };
  g.progress.flags.story = { ...g.progress.flags.story, 'worldforge-page': true };
  const c = masterpieceCost();
  g.gold = c.gold + 7;
  g.materials = { ...g.materials, ...Object.fromEntries(Object.entries(c.materials).map(([k, n]) => [k, n + 1])) };
  g.gems = { ...g.gems, 'bog-amber': c.gems['bog-amber'] };
  return g;
}

test('M7 Masterpiece: Hilda needs the Council beaten, the Worldforge page and the price, and says which is missing', () => {
  const fresh = party().game;
  const o = masterpieceOffer(fresh);
  assert.equal(o.ok, false);
  assert.match(o.reasons[0], /Hollow Council/);
  assert.ok(o.reasons.some(r => /Worldforge page/.test(r)));
  assert.ok(o.reasons.some(r => /^Needs /.test(r)), 'the price too');
  assert.deepEqual(o.bases, [...MASTERPIECE_BASES]);
  const g = readyForHilda();
  assert.deepEqual(masterpieceOffer(g).reasons, []);
  const poor = { ...g, gems: {} };
  assert.match(masterpieceOffer(poor).reasons[0], /Bog Amber/);
});

test('M7 Masterpiece: the name is scrubbed like a pasted code and must be 1 to 24 plain characters', () => {
  assert.equal(masterpieceName("Wren's Oath-Keeper"), "Wren's Oath-Keeper");
  assert.equal(masterpieceName('  Ember   Tongue  '), 'Ember Tongue');
  assert.equal(masterpieceName('<b>Hearth</b>'), null, 'the slash that is left is not allowed');
  assert.equal(masterpieceName('<script>alert(1)</script>'), null);
  assert.equal(masterpieceName('<Hearthsong>'), 'Hearthsong', 'angle brackets are stripped, as from a code');
  assert.equal(masterpieceName(''), null);
  assert.equal(masterpieceName('x'.repeat(25)), null);
  assert.equal(masterpieceName('x'.repeat(24)), 'x'.repeat(24));
  assert.equal(masterpieceName('Émber'), null);
  assert.equal(masterpieceName(null), null);
});

test('M7 Masterpiece: forged once, Primal, named, paid for, with Kindle as its Legend Surge', () => {
  const g = readyForHilda();
  assert.equal(check(g, { masterpiece: true }), false);
  const bad = forgeMasterpiece(g, { base: 'longsword', name: '<img src=x onerror=alert(1)>' });
  assert.equal(bad.ok, false);
  assert.equal(bad.game, g, 'a refused forge changes nothing');
  assert.equal(forgeMasterpiece(g, { base: 'belt-knife', name: 'Pin' }).ok, false, 'only the listed bases');
  const r = forgeMasterpiece(g, { base: 'longsword', name: 'Hearthsong' });
  assert.equal(r.ok, true);
  const it = r.item;
  assert.equal(it.rarity, 'primal');
  assert.equal(it.masterpiece, true);
  assert.equal(it.name, 'Hearthsong');
  assert.equal(it.power, MASTERPIECE_POWER.id);
  assert.ok(POWERS[it.power], 'Kindle is a Legend Surge');
  assert.equal(it.affixes.length, 3);
  const c = masterpieceCost();
  assert.equal(r.game.gold, 7);
  assert.equal(r.game.materials.embers, 1);
  assert.equal(r.game.materials.silver, 1);
  assert.equal(r.game.gems['bog-amber'] || 0, 0);
  assert.ok(r.game.progress.flags.story['masterpiece-forged']);
  assert.equal(check(r.game, { masterpiece: true }), true);
  assert.equal(masterpieceOffer(r.game).ok, false, 'one per save');
  assert.ok(masterpieceOffer(r.game).reasons.some(x => /one Masterpiece/.test(x)));
  assert.deepEqual(saveProblems(migrate(r.game)), [], 'a save with its Masterpiece is sound');
  // equipped, its Surge is Kindle
  const h = r.game.party.roster.warden;
  const worn = { ...h, gear: { ...h.gear, weapon: it.uid } };
  const d = deriveHero(worn, r.game.inventory);
  assert.equal(d.powers[0].power, MASTERPIECE_POWER.id);
  assert.ok(c.gold > 0);
});

test('M7 Masterpiece: a pasted save may carry one, correctly named, and no more', () => {
  const r = forgeMasterpiece(readyForHilda(), { base: 'maul', name: 'Keeper' });
  const g = migrate(r.game);
  const renamed = structuredClone(g);
  renamed.inventory.find(i => i.masterpiece).name = 'bad/name';
  assert.ok(saveProblems(renamed).includes('its items'));
  const two = structuredClone(g);
  two.inventory.push({ ...two.inventory.find(i => i.masterpiece), uid: 'dupe' });
  assert.ok(saveProblems(two).includes('its Masterpiece'));
  const odd = structuredClone(g);
  odd.inventory.find(i => i.masterpiece).masterpiece = 'yes';
  assert.ok(saveProblems(odd).includes('its items'));
});

// ---- conditions, effects, endings ------------------------------------------------------------------------------

test('M7 conditions: masterpiece, pages and ending, and their checks', () => {
  const { game } = party();
  assert.equal(check(game, { pages: 'all' }), false);
  assert.equal(allPagesDone(game), false);
  assert.deepEqual(pagesDone(game), []);
  const full = structuredClone(game);
  for (const id of Object.keys(RELICS)) full.codex[id] = { sighted: true, claimed: true, awakened: false };
  assert.equal(check(full, { pages: 'all' }), true, 'every page complete');
  const g = migrate(game);
  assert.equal(check(g, { ending: true }), false);
  for (const e of ENDING_IDS) assert.equal(check(g, { ending: e }), false);
  const chose = { ...g, ending: 'release' };
  assert.equal(check(chose, { ending: true }), true);
  assert.equal(check(chose, { ending: 'release' }), true);
  assert.equal(check(chose, { ending: 'anew' }), false);
  assert.deepEqual(condErrors({ pages: 'all' }), []);
  assert.deepEqual(condErrors({ masterpiece: true }), []);
  assert.deepEqual(condErrors({ ending: 'anew' }), []);
  assert.deepEqual(condErrors({ ending: true }), []);
  assert.equal(condErrors({ pages: 3 }).length, 1);
  assert.equal(condErrors({ ending: 'rekindled' }).length, 1);
  assert.equal(condErrors({ masterpiece: 'yes' }).length, 1);
  // Kindle Anew's condition parses, and needs all three
  assert.deepEqual(condErrors(ENDINGS.anew.needs), []);
  assert.equal(check(full, ENDINGS.anew.needs), false, 'a full Codex alone is not enough');
});

// ---- statuses and stats ----------------------------------------------------------------------------------------

test('M7 Unmade: a hero\'s relic power is struck out, and the Surge is the Heroic one until it wears off', () => {
  const s = battleWith([{ family: 'rotwarden', level: 6 }], { seed: 3 });
  const surge = st => commands(st, 'warden').find(c => c.type === 'surge');
  const before = surge(s);
  assert.notEqual(before.power, 'heroic-strike', 'the starter relic\'s power');
  const t = structuredClone(s);
  t.units.warden.statuses.push({ id: 'unmade', stacks: 1, turns: 2, value: null, source: 'f1' });
  assert.equal(surge(t).power, 'heroic-strike');
  assert.equal(STATUSES.unmade.harmful, true);
});

test('M7 Hearthlit adds +1 to the attack roll; the save stat adds to every saving throw', async () => {
  const { resolveAttack, savingThrow } = await import('../src/rules/combat.js');
  const s = battleWith([{ family: 'rotwarden', level: 6 }], { seed: 3 });
  const roll = (st, lit) => {
    const x = structuredClone(st);
    if (lit) x.units.warden.statuses.push({ id: 'hearthlit', stacks: 1, turns: 3, value: null, source: 'warden' });
    const Bx = { s: x, rng: createRng(12), ev: [], touched: new Set() };
    resolveAttack(Bx, x.units.warden, x.units.f1, { type: 'attack', weapon: true });
    return Bx.ev.find(e => e.t === 'roll').bonus;
  };
  assert.equal(roll(s, true), roll(s, false) + 1);
  const saveOf = bonus => {
    const x = structuredClone(s);
    x.units.warden.stats.saveBonus = bonus;
    const Bx = { s: x, rng: createRng(12), ev: [], touched: new Set() };
    savingThrow(Bx, x.units.warden, 'WIS', 12, x.units.f1);
    return Bx.ev.find(e => e.t === 'roll').bonus;
  };
  assert.equal(saveOf(1), saveOf(0) + 1);
});

test('M7 a sign may open a scene once its condition holds: the Worldforge\'s heart after the Unsmith', async () => {
  const { interact } = await import('../src/rules/world.js');
  const { MAPS } = await import('../src/data/maps/index.js');
  const heart = MAPS.worldforge.entities.find(e => e.id === 'wf-heart');
  assert.equal(heart.kind, 'sign');
  assert.equal(heart.talk, 'the-heart');
  const g = migrate(party().game);
  const walk = { map: 'worldforge', x: heart.at[0], y: heart.at[1] + 1, face: 'n', tick: 0, grace: 0, roamers: [] };
  const before = interact(g, walk).events;
  assert.deepEqual(before.map(e => e.t), ['sign'], 'before the Unsmith falls it is only a step before the furnace');
  const won = structuredClone(g);
  won.progress.flags.beaten = { ...won.progress.flags.beaten, unsmith: 1 };
  const after = interact(won, walk).events;
  assert.deepEqual(after.map(e => [e.t, e.dialogue]), [['talk', 'the-heart']]);
});
