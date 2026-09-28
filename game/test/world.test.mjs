// World engine tests (rules/world.js, M3 spec §4.5) on test/fixtures/map-mini.mjs and a larger
// open test field. Owner: WP1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/rules/gauntlet.js';
import { migrate } from '../src/rules/migrate.js';
import { deepFreeze } from '../src/core/freeze.js';
import { registerMap, enterMap, move, interact, tick, afterBattle, commit, canWalk, findPath, present, lockStatus, openChest, openLock, isWeak, light, keys, roamMask } from '../src/rules/world.js';
import { spawnsFor } from '../src/rules/gauntlet.js';
import { relicItem } from '../src/rules/loot.js';
import { createRng } from '../src/core/rng.js';
import { MINI } from './fixtures/map-mini.mjs';

registerMap(MINI);
const fresh = () => deepFreeze(migrate(newGame({ name: 'Tess', seed: 5 })));
const at = (x, y, face = 'n') => ({ map: 'mini', visit: 1, x, y, face, tick: 0, rng: 1, grace: 0, gone: {}, roamers: [] });
const kinds = r => r.events.map(e => e.t).filter(t => t !== 'sighted');

test('enterMap places the party on the anchor and counts the visit, without mutating the game', () => {
  const game = fresh();
  const r = enterMap(game, { map: 'mini', anchor: 'start' });
  assert.deepEqual([r.walk.map, r.walk.x, r.walk.y, r.walk.face], ['mini', 5, 5, 'n']);
  assert.equal(r.game.progress.flags.visits.mini, 1);
  assert.equal(game.progress.flags.visits.mini, undefined);
  assert.equal(enterMap(r.game, { map: 'mini', anchor: 'start' }).walk.visit, 2);
});

test('collision: walls and trees bump, grass steps, a ledge only goes south', () => {
  const game = fresh();
  assert.deepEqual(kinds(move(game, at(5, 5), 'n')), ['step']);
  assert.deepEqual(kinds(move(game, at(1, 5, 'w'), 'w')), ['bump']);
  assert.deepEqual(kinds(move(game, at(3, 4, 'w'), 'w')), ['bump'], 'the tree at (2,4)');
  assert.deepEqual(kinds(move(game, at(4, 3), 'n')), ['bump'], 'up the ledge');
  assert.deepEqual(kinds(move(game, at(4, 1, 's'), 's')), ['step'], 'down the ledge');
  assert.equal(canWalk(game, 'mini', 4, 2, { dir: 's' }), true);
  assert.equal(canWalk(game, 'mini', 4, 2, { dir: 'n' }), false);
  const turned = move(game, at(5, 5, 'e'), 'n');
  assert.deepEqual(kinds(turned), ['turn', 'step']);
});

test('exits, sealed exits, closed gates, locks and blocks stop the step with their event', () => {
  const game = fresh();
  const out = move(game, at(5, 7, 's'), 's');
  assert.deepEqual(out.events[0], { t: 'exit', id: 'mini-s', to: 'keep', anchor: 'from-hall' });
  assert.equal(move(game, at(10, 4, 'e'), 'e').events[0].t, 'sealed');
  assert.equal(move(game, at(5, 2), 'n').events[0].t, 'gate');
  const lock = move(game, at(7, 3, 'e'), 'e').events[0];
  assert.equal(lock.t, 'lock');
  assert.equal(lock.lock, 'thornwall');
  assert.equal(lock.status.open, false, 'a level-1 party has no thornwall key');
  assert.deepEqual(move(game, at(8, 5, 'e'), 'e').events[0], { t: 'encounter', id: 'bramble-toll' });
  assert.equal(present(game, 'mini').find(e => e.id === 'mini-ichor').solid, false, 'ichor is a soft lock');
  assert.ok(move(game, at(8, 5), 's').events.some(e => e.t === 'hazard'));
});

test('interact talks to the person you face; commit returns the same object when nothing changed', () => {
  const game = fresh();
  const talk = interact(game, at(3, 6, 'w')).events[0];
  assert.deepEqual(talk, { t: 'talk', npc: 'fenwick', dialogue: 'fenwick' });
  const w = at(3, 6, 'w');
  const g2 = commit(game, w);
  assert.notEqual(g2, game);
  assert.deepEqual(g2.progress.pos, { map: 'mini', x: 3, y: 6, face: 'w' });
  assert.equal(commit(g2, w), g2);
});

test('findPath walks around solid things; chests open once', () => {
  const game = fresh();
  const path = findPath(game, at(5, 5), [10, 2]);
  assert.ok(path && path.length >= 8);
  assert.deepEqual(path[path.length - 1], [10, 2]);
  assert.ok(findPath(game, at(5, 5), [10, 1], { adjacent: true }));
  const r = openChest(game, 'mini-chest');
  assert.equal(r.ok, true);
  assert.equal(r.game.gold, game.gold + 5);
  assert.equal(openChest(r.game, 'mini-chest').ok, false);
  assert.equal(lockStatus(game, 'stream').keys.length, 3, 'two power keys and a Domain key');
});

// ---- roamers (spec §4.5 "Roamer rules") -------------------------------------------------------------------

// A 30x20 open field with a zone, one authored pack and a pond, for the roamer rules.
const FIELD_ROWS = [
  '##############################',
  '#............................#',
  '#............................#',
  '#.....~~~~...................#',
  '#.....~~~~...................#',
  '#............................#',
  '#.......................TT...#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '##############=###############',
];
const FIELD = deepFreeze({
  id: 'field', name: 'The Test Field', region: 'verdant', biome: 'wilds', music: 'wilds', backdrop: 'hearth-road',
  zone: 'hearth-road', level: 2, travel: true, dark: false, lore: [[300, 260, 15, 10]], w: 30, h: 20, rows: FIELD_ROWS,
  entities: [{ id: 'waymarker-stones', kind: 'encounter', enc: 'waymarker-stones', mode: 'pack', at: [20, 10], face: 's', leash: 4 }],
  exits: [{ id: 'field-s', area: [14, 19, 14, 19], to: 'keep', anchor: 'from-hall' }],
  anchors: { start: [3, 17, 'n'], mid: [15, 10, 'n'] },
  roam: { max: 3, rects: [[2, 2, 27, 17]] },
});
registerMap(FIELD);
const withLevel = (game, level) => ({ ...game, party: { ...game.party, roster: Object.fromEntries(Object.entries(game.party.roster).map(([id, h]) => [id, { ...h, level }])) } });
const onField = (game, roamers, x = 15, y = 10, face = 'n', extra = {}) => ({ map: 'field', visit: 1, x, y, face, tick: 0, rng: 7, grace: 0, gone: {}, roamers, ...extra });
const pack = (game, o = {}) => {
  const spawns = spawnsFor(game, 'waymarker-stones');
  return { id: 'waymarker-stones', enc: 'waymarker-stones', zone: null, spawns, lead: { family: 'thornhound', variant: null, art: 'thornhound', gearTier: 0, count: 3 },
    x: 20, y: 10, home: [20, 10], leash: 4, face: 's', mood: 'wander', wait: 0, weak: false, trackless: true, ...o };
};
function idle(game, walk, n) {
  let r = { game, walk, events: [] };
  const all = [];
  for (let i = 0; i < n; i++) { r = tick(r.game, r.walk); all.push(...r.events); }
  return { ...r, all };
}

test('seeding: authored packs at home, zone patrols far from you and off exits; the same inputs give the same Walk', () => {
  const game = fresh();
  const a = enterMap(game, { map: 'field', anchor: 'start' });
  const b = enterMap(game, { map: 'field', anchor: 'start' });
  assert.deepEqual(a.walk, b.walk, 'deterministic');
  assert.deepEqual(JSON.parse(JSON.stringify(a.walk)), a.walk, 'a Walk is plain JSON');
  const authored = a.walk.roamers.find(r => r.enc === 'waymarker-stones');
  assert.deepEqual([authored.x, authored.y], [20, 10]);
  const patrols = a.walk.roamers.filter(r => r.zone === 'hearth-road');
  assert.ok(patrols.length >= 1 && patrols.length <= 3, `${patrols.length} zone patrols`);
  for (const r of patrols) {
    assert.ok(Math.max(Math.abs(r.x - 3), Math.abs(r.y - 17)) >= 8, 'spawns at least 8 tiles away');
    assert.ok(Math.abs(r.x - 14) > 2 || Math.abs(r.y - 19) > 2, 'not within 2 of an exit');
    assert.ok(r.spawns.every(sp => sp.level >= 2), 'zone level');
  }
  // a later visit reseeds from its own stream; game.rngState is never touched
  const c = enterMap(a.game, { map: 'field', anchor: 'start' });
  assert.equal(c.walk.visit, 2);
  assert.equal(c.game.rngState, game.rngState);
  // ticking twice from equal walks stays equal
  assert.deepEqual(idle(game, a.walk, 30).walk, idle(game, b.walk, 30).walk);
  // a cleared authored pack is not seeded
  const cleared = { ...game, progress: { ...game.progress, flags: { ...game.progress.flags, cleared: { 'waymarker-stones': true } } } };
  assert.equal(enterMap(cleared, { map: 'field', anchor: 'start' }).walk.roamers.some(r => r.enc), false);
});

test('the roam mask keeps packs out of exits, doors, entity tiles and 1-wide corridors', () => {
  const m = roamMask(FIELD);
  assert.equal(m[19 * 30 + 14], 0, 'the exit');
  assert.equal(m[10 * 30 + 15], 1, 'open grass');
  const corridor = deepFreeze({ ...FIELD, id: 'corridor', rows: FIELD_ROWS.map((r, y) => (y === 8 ? '#' + '.'.repeat(28) + '#' : y === 7 || y === 9 ? '#'.repeat(30) : r)) });
  const cm = roamMask(corridor);
  assert.equal(cm[8 * 30 + 15], 0, 'a 1-wide corridor is never entered');
});

test('alert, then a chase you can outrun; the pack gives up past leash + 6 and goes home', () => {
  const game = fresh();
  let walk = onField(game, [pack(game, { x: 19, y: 10 })], 15, 10, 'e');
  let r = tick(game, walk);
  assert.ok(r.events.some(e => e.t === 'alert' && e.id === 'waymarker-stones'), 'the "!" beat');
  assert.equal(r.walk.roamers[0].mood, 'alert');
  r = idle(game, r.walk, 2);
  assert.equal(r.walk.roamers[0].mood, 'chase');
  // walk west, away from it: the gap grows (it moves on 2 of every 3 ticks)
  let w = { ...r.walk, face: 'w' };
  const gap0 = Math.abs(w.roamers[0].x - w.x);
  let contact = false;
  for (let i = 0; i < 12; i++) {
    const m = move(game, w, 'w');
    contact ||= m.events.some(e => e.t === 'contact');
    w = m.walk;
  }
  assert.equal(contact, false);
  assert.ok(Math.abs(w.roamers[0].x - w.x) > gap0, 'outrun');
  const moods = [];
  for (let i = 0; i < 20; i++) { const t = tick(game, w); w = t.walk; moods.push(w.roamers[0].mood); }
  assert.ok(moods.includes('return') || moods.includes('wander'), 'it gives up the chase');
});

test('a chasing pack that reaches you is a contact: an ambush if you face away, none during grace', () => {
  const game = fresh();
  const chaser = o => pack(game, { x: 16, y: 10, mood: 'chase', face: 'w', ...o });
  const tickTo = (walk, n = 3) => { for (let i = 0; i < n; i++) { const t = tick(game, walk); if (t.events.some(e => e.t === 'contact')) return t; walk = t.walk; } return null; };
  const back = tickTo(onField(game, [chaser()], 15, 10, 'w'));
  const c = back.events.find(e => e.t === 'contact');
  assert.deepEqual([c.by, c.ambush, c.firstStrike], ['roamer', true, false], 'it came at your back');
  const front = tickTo(onField(game, [chaser()], 15, 10, 'e')).events.find(e => e.t === 'contact');
  assert.equal(front.ambush, false, 'you saw it coming');
  assert.equal(tickTo(onField(game, [chaser()], 15, 10, 'e', { grace: 6 }), 4), null, 'no contact during grace');
});

test('walking into a pack: First Strike from behind, a plain fight from the front', () => {
  const game = fresh();
  const facingAway = pack(game, { x: 15, y: 9, face: 'n' });
  const hit = move(game, onField(game, [facingAway], 15, 10, 'n'), 'n').events[0];
  assert.deepEqual([hit.t, hit.by, hit.firstStrike], ['contact', 'player', true]);
  const facing = pack(game, { x: 15, y: 9, face: 's' });
  assert.equal(move(game, onField(game, [facing], 15, 10, 'n'), 'n').events[0].firstStrike, false);
  assert.equal(interact(game, onField(game, [facingAway], 15, 10, 'n')).events[0].firstStrike, true, 'A does the same');
});

test('weak packs flee on 4 of every 5 ticks, a flee you can catch; walking into one is a Rout', () => {
  const game = withLevel(fresh(), 6);
  const weak = pack(game, { x: 17, y: 10 });
  assert.equal(isWeak(game, weak.spawns), true, 'all rabble, top level 2 <= 6 - 3');
  assert.equal(isWeak(fresh(), weak.spawns), false);
  let w = onField(game, [weak], 15, 10, 'e');
  const t = tick(game, w);
  assert.equal(t.walk.roamers[0].mood, 'flee');
  assert.ok(t.walk.roamers[0].x > 17, 'it runs away from you');
  // chase it into the east wall and catch it
  w = t.walk;
  let rout = null;
  for (let i = 0; i < 60 && !rout; i++) {
    const r = w.roamers[0];
    const dir = r.x > w.x ? 'e' : r.x < w.x ? 'w' : r.y > w.y ? 's' : 'n';
    const m = move(game, w, dir);
    rout = m.events.find(e => e.t === 'rout');
    w = m.walk;
  }
  assert.ok(rout, 'caught');
  assert.equal(rout.enc, 'waymarker-stones');
});

test('the weak gap: Dawnbell narrows it; relic-bearer variants and relic holders never flee', () => {
  const g5 = withLevel(fresh(), 5);
  const rabble = [{ family: 'cutpurse', level: 2 }, { family: 'thornhound', level: 2 }];
  assert.equal(isWeak(g5, rabble), true);
  assert.equal(isWeak(withLevel(fresh(), 4), rabble), false, 'gap 3');
  const bell = { ...withLevel(fresh(), 4), inventory: [...fresh().inventory, relicItem('dawnbell', createRng(1))] };
  assert.equal(isWeak(bell, rabble), true, 'Dawnbell: gap 2');
  assert.equal(isWeak(g5, [{ family: 'smuggler', variant: 'queen', level: 1 }]), false, 'Mags is a relic-bearer by variant');
  assert.equal(isWeak(g5, [{ family: 'cutpurse', level: 1, relic: 'tallyknife' }]), false, 'a relic holder is never Routed');
  assert.equal(isWeak(g5, [{ family: 'cutpurse', level: 1, wears: 'thornwatch-hood' }]), false);
  assert.equal(isWeak(g5, [{ family: 'bandit', level: 1 }]), false, 'veterans never flee');
});

test('Trackless: all-rabble packs never alert; Stillness makes the pause 6 ticks', () => {
  const game = fresh();
  const boots = { ...game, inventory: [...game.inventory, relicItem('thornwatch-boots', createRng(2))] };
  const t = tick(boots, onField(boots, [pack(boots, { x: 17, y: 10 })], 15, 10, 'e'));
  assert.equal(t.events.some(e => e.t === 'alert'), false);
  const oath = { ...game, inventory: [...game.inventory, relicItem('isoldes-oath', createRng(3))] };
  const a = tick(oath, onField(oath, [pack(oath, { x: 17, y: 10 })], 15, 10, 'e'));
  assert.equal(a.walk.roamers[0].wait, 6);
});

test('afterBattle: grace, a beaten roamer is gone, one you fled from is stunned for 12 ticks', () => {
  const game = fresh();
  const w = onField(game, [pack(game, { x: 17, y: 10, mood: 'chase' })], 15, 10, 'e');
  const won = afterBattle(game, w, { roamerId: 'waymarker-stones', result: 'victory' });
  assert.equal(won.roamers.length, 0);
  assert.equal(won.gone['waymarker-stones'], true);
  assert.equal(won.grace, 6);
  const fled = afterBattle(game, w, { roamerId: 'waymarker-stones', result: 'fled' });
  assert.deepEqual([fled.roamers[0].mood, fled.roamers[0].wait], ['stunned', 12]);
  const r = idle(game, fled, 11);
  assert.deepEqual([r.walk.roamers[0].x, r.walk.roamers[0].y], [17, 10], 'it does not move while stunned');
  assert.equal(r.all.some(e => e.t === 'contact'), false);
});

test('frozen inputs are never mutated by move, tick, interact or enterMap', () => {
  const game = fresh();
  const walk = deepFreeze(enterMap(game, { map: 'field', anchor: 'mid' }).walk);
  let g = game, w = walk;
  for (const d of ['n', 'n', 'e', 'e', 's', 'w', 'w', 'w']) { const r = move(g, w, d); g = deepFreeze(r.game); w = deepFreeze(r.walk); }
  deepFreeze(tick(g, w));
  deepFreeze(interact(g, w));
  assert.ok(true);
});

test('holders are Sighted when you come near; the codex gets the stamp and the Ladder scouts them', () => {
  const game = fresh();
  const r = move(game, at(6, 5, 'e'), 'e');
  const seen = r.events.filter(e => e.t === 'sighted');
  assert.deepEqual(seen.map(e => [e.relic, e.enc]), [['thornwatch-hood', 'bramble-toll']]);
  assert.equal(r.game.codex['thornwatch-hood'].sighted, true);
  assert.equal(r.game.progress.flags.scouted['bramble-toll'], true);
  assert.equal(move(r.game, r.walk, 's').events.some(e => e.t === 'sighted'), false, 'only once');
});

test('two keys: each key alone opens a lock; soft darkness and ichor', () => {
  const game = fresh();
  assert.equal(lockStatus(game, 'thornwall').open, false);
  const split = { ...game, inventory: [...game.inventory, relicItem('thornsplitter', createRng(4))] };
  assert.equal(lockStatus(split, 'thornwall').by, 'thornsplitter', 'the relic key');
  const warden5 = { ...game, party: { ...game.party, roster: { ...game.party.roster, warden: { ...game.party.roster.warden, domains: { ...game.party.roster.warden.domains, physical: { level: 3 } } } } } };
  assert.equal(lockStatus(warden5, 'thornwall').by, 'physical', 'the Domain key');
  const opened = openLock(split, 'mini-thorn');
  assert.equal(opened.ok, true);
  assert.equal(present(opened.game, 'mini').find(e => e.id === 'mini-thorn').solid, false);
  assert.equal(keys(game).powers.kindle, 'hearthbrand');
  // soft darkness: without a key you see 2 tiles; Hearthbrand's Kindle lights it
  const darkMap = deepFreeze({ ...MINI, id: 'mini-dark', dark: true });
  registerMap(darkMap);
  const noKey = migrate(newGame({ seed: 5, starter: 'cairnmaul' }));
  assert.equal(light(noKey, { ...at(5, 5), map: 'mini-dark' }), 2);
  assert.equal(light(game, { ...at(5, 5), map: 'mini-dark' }), Infinity);
  // ichor: 4% of max HP per step, never below 1
  const hurt = move(game, at(8, 5), 's');
  const hz = hurt.events.find(e => e.t === 'hazard');
  assert.ok(hz && Object.keys(hz.hurt).length === 4);
  let g = hurt.game, w = hurt.walk;
  for (let i = 0; i < 60; i++) { const m = move(g, w, i % 2 ? 'e' : 'w'); g = m.game; w = m.walk; }
  for (const id of g.party.active) assert.ok(g.party.roster[id].hp >= 1, `${id} never below 1`);
});

test('sealed exits say whether the next chapter has opened them', () => {
  const game = fresh();
  assert.equal(move(game, at(10, 4, 'e'), 'e').events[0].nextChapter, false);
  const done = { ...game, progress: { ...game.progress, flags: { ...game.progress.flags, story: { ...game.progress.flags.story, 'act1-complete': true } } } };
  assert.equal(move(done, at(10, 4, 'e'), 'e').events[0].nextChapter, true);
});

test('a scene cut short by a reload plays again: the intro and the council are guarded by their own flags', () => {
  const g = fresh();
  const scene = (game, id) => enterMap(game, { map: 'keep-hall', at: [12, 6], face: 'n' }).events.some(e => e.t === 'trigger' && e.id === id);
  // the intro fired, the tab was closed before it finished: the saved game has the visit, not intro-done
  const first = enterMap(g, { map: 'keep-hall', at: [12, 6], face: 'n' });
  assert.ok(first.events.some(e => e.t === 'trigger' && e.id === 'keep-intro'));
  assert.equal(scene(first.game, 'keep-intro'), true, 'the intro plays again');
  const story = (game, patch) => ({ ...game, progress: { ...game.progress, flags: { ...game.progress.flags, story: { ...game.progress.flags.story, ...patch } } } });
  assert.equal(scene(story(first.game, { 'intro-done': true }), 'keep-intro'), false, 'and stops once it has done its work');
  const act1 = story(g, { 'intro-done': true, 'act1-complete': true });
  const council = enterMap(act1, { map: 'keep-hall', at: [12, 6], face: 'n' });
  assert.equal(scene(council.game, 'council'), true, 'the council plays again after a reload');
  assert.equal(scene(story(council.game, { 'council-done': true }), 'council'), false);
});

test('ichor never lifts a fallen hero back to 1 HP', () => {
  const game = fresh();
  const down = { ...game, party: { ...game.party, roster: { ...game.party.roster, pip: { ...game.party.roster.pip, hp: 0 } } } };
  // (8,6) is ichor on the mini map: step in and out of it three times
  let g = down, w = at(8, 5);
  for (let i = 0; i < 6; i++) { const m = move(g, w, i % 2 ? 'n' : 's'); g = m.game; w = m.walk; }
  assert.equal(g.party.roster.pip.hp, 0, 'Pip stays down');
  assert.ok(g.party.roster.warden.hp < game.party.roster.warden.hp, 'the others still burn');
});
