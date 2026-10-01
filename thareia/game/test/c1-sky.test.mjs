// Thareia T2 (package A): the airship's rules and data (design/09-t2-spec.md 6.2-6.4, 7.1 items 7, 8 and 12) and the
// 3D ship's lean (6.7, ui/sky3d/motion.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKY_REGIONS, DOCKS, SKY_MARKS, FLIGHTS, HIRE_FLIGHT, toWorld, PAINT, PAINT_H } from '../src/data/thareia/sky.js';
import { dockState, regionOpen, refusalLine, levelFor } from '../src/rules/sky.js';
import { createMotion, Spring, BANK_MAX, BANK_MAX_REDUCED } from '../src/ui/sky3d/motion.js';
import { MAPS, anchor } from '../src/data/maps/index.js';
import { tileOf } from '../src/data/tiles.js';
import { HEROES } from '../src/data/heroes.js';
import { NPCS } from '../src/data/npcs.js';
import { newGame } from '../src/rules/gauntlet.js';
import { THAREIA_START } from '../src/data/heroes.js';
import { TH_START_AT, TH_START_HEARTH } from '../src/data/world.js';

// a game with just what the sky rules read: story flags, known docks, the hero's level
const game = ({ story = {}, docks = {}, level = 1 } = {}) => ({
  world: 'thareia',
  progress: { flags: { story, docks } },
  party: { active: ['warden'], roster: { warden: { level } } },
});
const hire = from => ({ ...HIRE_FLIGHT, from, to: null });
const RENTED = { 'c1-skiff-rented': true };
const DEG = Math.PI / 180;

test('docks: the 6.2 table, each on its painting and on a walkable anchor; the Fjords are a mark, not a dock', () => {
  assert.deepEqual(Object.keys(DOCKS).sort(), ['bogmire', 'eldergrove', 'fawnrest', 'mosswatch', 'thornhollow']);
  const want = {
    thornhollow: ['verdant', [1232, 566], 'th-landing', ['ticket', 'hire', 'own'], true],
    eldergrove: ['verdant', [1278, 300], 'th-eldergrove', ['hire', 'own'], true],
    mosswatch: ['verdant', [715, 462], 'th-mossfall', ['hire', 'own'], true],
    fawnrest: ['verdant', [1075, 705], 'th-fawnrest', ['hire', 'own'], false],
    bogmire: ['gloomfen', [405, 470], 'bogmire-docks', ['ticket'], false],
  };
  for (const [id, [region, at, map, lic, post]] of Object.entries(want)) {
    const d = DOCKS[id];
    assert.equal(d.region, region, id); assert.deepEqual(d.at, at, id); assert.equal(d.map, map, id);
    assert.deepEqual([...d.license], lic, id); assert.equal(!!d.hire, post, id); assert.equal(d.anchor, 'from-skiff', id);
    const a = anchor(d.map, d.anchor), m = MAPS[d.map];
    assert.ok(a && !tileOf(m.rows[a.y][a.x]).solid, `${id}: lands on a walkable tile`);
    assert.ok(d.at[0] >= 0 && d.at[0] < PAINT && d.at[1] >= 0 && d.at[1] < PAINT_H, id);
    if (d.world) assert.ok(d.world[0] >= 0 && d.world[0] < 1536 && d.world[1] >= 0 && d.world[1] < 1024, id);
  }
  assert.deepEqual(DOCKS.mosswatch.if, { flag: 'c1-west-open' });
  assert.deepEqual(DOCKS.fawnrest.if, { flag: 'c1-fawnrest' });
  assert.equal(levelFor(DOCKS.bogmire.level, 'hire'), 36); assert.equal(levelFor(DOCKS.bogmire.level, 'ticket'), 1);
  assert.ok(!DOCKS.fjords && SKY_MARKS.fjords);
  assert.equal(SKY_MARKS.fjords.why, 'licence'); assert.deepEqual(SKY_MARKS.fjords.at, [365, 205]); assert.equal(SKY_MARKS.fjords.region, 'verdant');
});

test('flights: FLIGHTS holds only story flights; the hire flight is its own export; both read their lines from data', () => {
  for (const [id, f] of Object.entries(FLIGHTS)) {
    assert.ok(DOCKS[f.from] && DOCKS[f.to], id);
    for (const [who] of f.lines) assert.ok(HEROES[who] || NPCS[who], `${id}: ${who}`);
    for (const k of ['mapHint', 'locked', 'unlicensed', 'unknown', 'edge', 'from']) assert.ok(f.says[k], `${id}: says.${k}`);
  }
  assert.ok(!FLIGHTS.hire);
  assert.equal(FLIGHTS['first-flight'].says.speaker, 'yara');
  assert.ok(FLIGHTS['first-flight'].says.locked.includes('The fare is to Thornhollow'));
  const H = HIRE_FLIGHT;
  assert.equal(H.ship, 'rented'); assert.equal(H.license, 'hire'); assert.equal(H.free, true); assert.equal(H.pilot, 'warden'); assert.equal(H.fee, 10);
  assert.ok(!('to' in H) && !('from' in H));
  for (const k of ['mapHint', 'locked', 'unlicensed', 'unknown', 'edge']) assert.ok(H.says[k], `hire says.${k}`);
  assert.equal(H.says.edge, 'The licence stops at the edge of the Wilds.');
  assert.ok(H.lines.some(([who, l]) => who === 'narrator' && l === 'Licensed docks only, and bring her back in one piece.'));
  // the writing rules: short lines, no old-game words
  const lines = [...Object.values(FLIGHTS), H].flatMap(f => [...f.lines.map(([, l]) => l), ...Object.values(f.says).filter(s => s.length > 12)]);
  for (const l of lines) {
    assert.ok(l.length <= 140, l);
    assert.ok(!/Dustveil|Cistern|Unwaning|Tallym|Brand|Sleeper|Hollow Council|Rotwarden|First Seed/.test(l), l);
  }
});

test('dockState (7.1 item 7): no hire before the skiff is rented; Eldergrove ok for hire; Fawnrest hidden until c1-fawnrest', () => {
  const f = hire('thornhollow');
  assert.deepEqual(dockState(game(), DOCKS.eldergrove, f), { ok: false, why: 'licence' }, 'no sponsor, no skiff');
  assert.equal(dockState(game(), DOCKS.thornhollow, f).ok, false);
  const g = game({ story: RENTED });
  assert.deepEqual(dockState(g, DOCKS.eldergrove, f), { ok: true, why: null });
  assert.equal(dockState(g, DOCKS.fawnrest, f).why, 'story', 'Fawnrest is hidden before c1-fawnrest');
  assert.equal(dockState(game({ story: { ...RENTED, 'c1-fawnrest': true } }), DOCKS.fawnrest, f).ok, true);
  assert.equal(dockState(g, DOCKS.mosswatch, f).why, 'story', 'Mosswatch waits on the west road');
  assert.equal(dockState(game({ story: { ...RENTED, 'c1-west-open': true } }), DOCKS.mosswatch, f).ok, true);
});

test('dockState: the Bogmire dock refuses the hire licence; unknown docks are refused on the world map but not at 1x', () => {
  const g = game({ story: RENTED, level: 40 });
  assert.equal(dockState(g, DOCKS.bogmire, hire('thornhollow')).why, 'licence');
  const k = game({ story: RENTED, docks: { thornhollow: true } });
  assert.deepEqual(dockState(k, DOCKS.eldergrove, hire('thornhollow'), { pick: 'map' }), { ok: false, why: 'unknown' });
  assert.equal(dockState(k, DOCKS.eldergrove, hire('thornhollow')).ok, true, 'at 1x an unknown licensed dock is fine');
  const known = game({ story: RENTED, docks: { eldergrove: true } });
  assert.equal(dockState(known, DOCKS.eldergrove, hire('thornhollow'), { pick: 'map' }).ok, true);
  assert.equal(refusalLine(HIRE_FLIGHT, 'unknown'), HIRE_FLIGHT.says.unknown);
  assert.equal(refusalLine(HIRE_FLIGHT, 'licence'), HIRE_FLIGHT.says.unlicensed);
});

test('dockState: the hire post it took off from is always a way down; the level check reads the hero, via { heroLevel }', () => {
  // even a dock the flight would not otherwise take (Fawnrest before c1-fawnrest) is ok as the origin
  assert.equal(dockState(game({ story: RENTED }), DOCKS.fawnrest, hire('fawnrest')).ok, true);
  assert.equal(dockState(game({ story: RENTED }), DOCKS.eldergrove, hire('eldergrove'), { pick: 'map' }).ok, true);
  // a dock with a level for the hire licence (made up here: the table's hire docks are all level 1)
  const high = { ...DOCKS.eldergrove, id: 'high', level: 12 };
  assert.deepEqual(dockState(game({ story: RENTED, level: 11 }), high, hire('thornhollow')), { ok: false, why: 'level' });
  assert.equal(dockState(game({ story: RENTED, level: 12 }), high, hire('thornhollow')).ok, true);
  // guests do not count: only the hero's own level
  const g = game({ story: RENTED, level: 3 }); g.party.roster.taela = { level: 20, guest: true };
  assert.equal(dockState(g, high, hire('thornhollow')).why, 'level');
});

test('dockState: the ticket keeps the Prologue flight on its route', () => {
  const f = FLIGHTS['first-flight'], g = game();
  assert.equal(dockState(g, DOCKS.thornhollow, f).ok, true);
  assert.equal(dockState(g, DOCKS.thornhollow, f, { pick: 'map' }).ok, true, 'an unknown end of the route is still tappable');
  assert.equal(dockState(g, DOCKS.bogmire, f).why, 'from');
  assert.equal(dockState(g, DOCKS.eldergrove, f).why, 'route');
  assert.equal(refusalLine(f, 'from'), 'We just came from there.');
});

test('regionOpen (7.1 item 8): hire is refused over the Gloomfen; the ticket may cross it', () => {
  assert.deepEqual(regionOpen(game({ story: RENTED }), 'gloomfen', hire('thornhollow')), { ok: false, why: 'level' });
  assert.equal(regionOpen(game({ story: RENTED, level: 36 }), 'gloomfen', hire('thornhollow')).ok, true);
  assert.deepEqual(regionOpen(game(), 'gloomfen', FLIGHTS['first-flight']), { ok: true, why: null });
  assert.equal(regionOpen(game({ story: RENTED }), 'verdant', hire('thornhollow')).ok, true);
  assert.equal(regionOpen(game(), 'heartland', hire('thornhollow')).why, 'unknown', 'a region not in the game');
  assert.equal(SKY_REGIONS.verdant.level, 1);
});

test('dockState on a real new Thareia game (the hero at level 1)', () => {
  const g = newGame({ name: 'Wren', seed: 3, heroes: THAREIA_START, at: TH_START_AT, hearth: TH_START_HEARTH });
  assert.equal(dockState(g, DOCKS.eldergrove, hire('thornhollow')).why, 'licence');
  g.progress.flags.story = { ...g.progress.flags.story, ...RENTED };
  assert.equal(dockState(g, DOCKS.eldergrove, hire('thornhollow')).ok, true);
  assert.equal(regionOpen(g, 'gloomfen', hire('thornhollow')).why, 'level');
  // the world map places every dock and mark on the continent
  for (const d of [...Object.values(DOCKS), ...Object.values(SKY_MARKS)]) {
    const [x, y] = d.world || toWorld(d.region, d.at);
    assert.ok(x >= 0 && x < 1536 && y >= 0 && y < 1024, d.id);
  }
});

// ---- the lean (ui/sky3d/motion.js) ----
const fly = (m, secs, o) => { let s; for (let t = 0; t < secs; t += 1 / 60) s = m.step(1 / 60, o); return { ...s }; };

test('motion: a right turn banks right, a left turn left', () => {
  assert.ok(fly(createMotion(), 0.4, { turn: 1.5, speed: 150 }).bank > 5 * DEG);
  assert.ok(fly(createMotion(), 0.4, { turn: -1.5, speed: 150 }).bank < -5 * DEG);
  assert.equal(fly(createMotion(), 0.4, { turn: 0, speed: 150 }).bank, 0);
});

test('motion: the bank is capped at 25 degrees (8 with reduced motion), even while the spring overshoots', () => {
  for (const reduced of [false, true]) {
    const m = createMotion({ reduced }), cap = reduced ? BANK_MAX_REDUCED : BANK_MAX;
    let most = 0;
    for (let t = 0; t < 3; t += 1 / 60) most = Math.max(most, Math.abs(m.step(1 / 60, { turn: 9, speed: 150 }).bank));
    assert.ok(most <= cap + 1e-9, `${most / DEG} <= ${cap / DEG}`);
    assert.ok(most > cap * 0.95, 'a hard turn reaches the cap');
    // and it bobs only without reduced motion
    const b = createMotion({ reduced }); let bob = 0;
    for (let t = 0; t < 3; t += 1 / 60) bob = Math.max(bob, Math.abs(b.step(1 / 60, { speed: 0 }).bob));
    assert.equal(bob > 0.5, !reduced);
  }
  assert.ok(Math.abs(BANK_MAX / DEG - 25) < 1e-9 && Math.abs(BANK_MAX_REDUCED / DEG - 8) < 1e-9);
});

test('motion: the spring settles back to level when the turn stops; speeding up dips the nose', () => {
  const m = createMotion();
  fly(m, 1, { turn: 2.4, speed: 150 });
  const s = fly(m, 2, { turn: 0, speed: 150 });
  assert.ok(Math.abs(s.bank) < 0.2 * DEG, `settled at ${s.bank / DEG}`);
  assert.ok(fly(createMotion(), 0.3, { speed: 60, accel: 140 }).pitch < 0);
  // the spring itself (k 60, d 8): it reaches its target and stays
  const sp = new Spring(60, 8);
  for (let t = 0; t < 3; t += 0.05) sp.update(1, 0.05);
  assert.ok(Math.abs(sp.x - 1) < 1e-3 && Math.abs(sp.v) < 1e-2);
});
