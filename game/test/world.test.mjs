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
import { TUNING } from '../src/data/tuning.js';
import { MAPS } from '../src/data/maps/index.js';

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
  assert.equal(lockStatus(game, 'stream').keys.length, 5, 'four power keys (M5: the Cutter\'s Pick; M6: the Gar\'s Tooth) and a Domain key');
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

test('weak packs flee on 4 of every 5 ticks, a flee you can catch; catching one is a full battle (M4.5, no Routs)', () => {
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
  let caught = null;
  const seen = [];
  for (let i = 0; i < 60 && !caught; i++) {
    const r = w.roamers[0];
    const dir = r.x > w.x ? 'e' : r.x < w.x ? 'w' : r.y > w.y ? 's' : 'n';
    const m = move(game, w, dir);
    seen.push(...m.events.map(e => e.t));
    caught = m.events.find(e => e.t === 'contact');
    w = m.walk;
  }
  assert.ok(caught, 'caught');
  assert.deepEqual([caught.enc, caught.by, caught.weak], ['waymarker-stones', 'player', true], 'a full battle with the pack, marked as run down');
  assert.ok(!seen.includes('rout'), 'nothing scatters: there are no Routs');
  // a pack that stands its ground is a plain fight
  const plain = move(fresh(), onField(fresh(), [pack(fresh(), { x: 16, y: 10, face: 'w' })], 15, 10, 'e'), 'e').events[0];
  assert.deepEqual([plain.t, plain.weak], ['contact', undefined]);
});

test('the weak gap: Dawnbell narrows it; relic-bearer variants and relic holders never flee', () => {
  const g5 = withLevel(fresh(), 5);
  const rabble = [{ family: 'cutpurse', level: 2 }, { family: 'thornhound', level: 2 }];
  assert.equal(isWeak(g5, rabble), true);
  assert.equal(isWeak(withLevel(fresh(), 4), rabble), false, 'gap 3');
  const bell = { ...withLevel(fresh(), 4), inventory: [...fresh().inventory, relicItem('dawnbell', createRng(1))] };
  assert.equal(isWeak(bell, rabble), true, 'Dawnbell: gap 2');
  assert.equal(isWeak(g5, [{ family: 'smuggler', variant: 'queen', level: 1 }]), false, 'Mags is a relic-bearer by variant');
  assert.equal(isWeak(g5, [{ family: 'cutpurse', level: 1, relic: 'tallyknife' }]), false, 'a relic holder never flees');
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

test('Hymn of Rest (the Drowned Censer, M5): roaming undead never notice you; the living still do (review)', () => {
  const game = fresh();
  const wights = g => pack(g, { spawns: [{ family: 'ash-wight', level: 6 }], trackless: false, x: 17, y: 10 });
  assert.ok(tick(game, onField(game, [wights(game)], 15, 10, 'e')).events.some(e => e.t === 'alert'), 'without it the wights see you');
  const censer = deepFreeze({ ...game, inventory: [...game.inventory, relicItem('drowned-censer', createRng(4))] });
  const quiet = idle(censer, onField(censer, [wights(censer)], 15, 10, 'e'), 6);
  assert.equal(quiet.all.some(e => e.t === 'alert'), false, 'the undead never notice you pass');
  assert.ok(!['alert', 'chase'].includes(quiet.walk.roamers[0].mood));
  const hounds = tick(censer, onField(censer, [pack(censer, { x: 17, y: 10 })], 15, 10, 'e'));
  assert.ok(hounds.events.some(e => e.t === 'alert'), 'the living still do');
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

test('M5: a snowdrift is soft like the ichor: 3% of max HP a step, named in the hazard; the Trollhide Mantle walks it', () => {
  const game = fresh();
  registerMap(deepFreeze({ ...MINI, id: 'mini-drift', entities: MINI.entities.map(e => (e.lock === 'ichor' ? { ...e, id: 'mini-drift-lock', lock: 'drift' } : e)) }));
  const onDrift = { ...at(8, 5), map: 'mini-drift' };
  const hz = move(game, onDrift, 's').events.find(e => e.t === 'hazard');
  assert.ok(hz, 'the drift bites');
  assert.equal(hz.lock, 'drift');
  assert.equal(hz.pct, 0.03);
  assert.equal(move(game, at(8, 5), 's').events.find(e => e.t === 'hazard').lock, 'ichor', 'the ichor still names itself');
  const shod = { ...game, inventory: [...game.inventory, relicItem('trollhide-mantle', createRng(12))] };
  assert.equal(lockStatus(shod, 'drift').by, 'trollhide-mantle', 'Snowshoe');
  assert.ok(!move(shod, onDrift, 's').events.some(e => e.t === 'hazard'), 'no bite with the key');
});

test('M6: a foggy map closes the sight to 3 tiles without a fog key; a fog key or Attunement 7 clears it; darkness keys do not', () => {
  const game = fresh();
  registerMap(deepFreeze({ ...MINI, id: 'mini-fog', fog: true }));
  const inFog = { ...at(5, 5), map: 'mini-fog' };
  assert.equal(light(game, inFog), TUNING.world.fogRadius);
  assert.equal(TUNING.world.fogRadius, 3);
  assert.ok(lockStatus(game, 'darkness').open, 'this party carries a light (a darkness key)...');
  assert.equal(lockStatus(game, 'fog').open, false, '...which is no fog key');
  const lantern = { ...game, inventory: [...game.inventory, relicItem('lamplighters-lantern', createRng(14))] };
  assert.equal(lockStatus(lantern, 'fog').by, 'lamplighters-lantern', 'the Lamplighter\'s Lantern');
  assert.equal(light(lantern, inFog), Infinity);
  const warden = game.party.roster.warden;
  const attuned = { ...game, party: { ...game.party, roster: { ...game.party.roster, warden: { ...warden, domains: { ...warden.domains, attunement: { level: 7 } } } } } };
  assert.equal(lockStatus(attuned, 'fog').by, 'attunement');
  assert.equal(light(attuned, inFog), Infinity);
  assert.equal(light(game, at(5, 5)), Infinity, 'a clear map');
});

test('M6: a bog stretch is soft like the drift: 3% of max HP a step, named in the hazard; the Bogstriders walk it', () => {
  const game = fresh();
  registerMap(deepFreeze({ ...MINI, id: 'mini-bog', entities: MINI.entities.map(e => (e.lock === 'ichor' ? { ...e, id: 'mini-bog-lock', lock: 'bog' } : e)) }));
  const onBog = { ...at(8, 5), map: 'mini-bog' };
  const hz = move(game, onBog, 's').events.find(e => e.t === 'hazard');
  assert.ok(hz, 'the bog bites');
  assert.deepEqual([hz.lock, hz.pct], ['bog', 0.03]);
  const shod = { ...game, inventory: [...game.inventory, relicItem('bogstriders', createRng(15))] };
  assert.equal(lockStatus(shod, 'bog').by, 'bogstriders');
  assert.ok(!move(shod, onBog, 's').events.some(e => e.t === 'hazard'), 'no bite with the key');
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

// ---- M4: Grudge hunters, Longsight, chest materials, the Keep's south-east gate (spec §4.6, §4.7) ----

const grudged = game => deepFreeze({ ...game, progress: { ...game.progress, flags: { ...game.progress.flags, grudges: {
  'waymarker-stones#0': { key: 'waymarker-stones#0', nodeId: 'waymarker-stones', wins: 1, flees: 0, omens: [], title: 'the Party-Breaker', name: 'Thornhound the Party-Breaker' },
} } } });

test('a Grudge pack hunts: seeded as a hunter, never weak, sees 3 farther, a red "!", and no leash on its chase', () => {
  const plain = withLevel(fresh(), 20);
  const game = grudged(plain);
  const seeded = enterMap(game, { map: 'field', anchor: 'start' }).walk.roamers.find(r => r.enc === 'waymarker-stones');
  assert.equal(seeded.hunter, true);
  assert.equal(seeded.weak, false, 'a hunter never flees, even from a party this strong');
  assert.equal(isWeak(plain, seeded.spawns), true, '...though the same pack would');
  assert.equal(enterMap(plain, { map: 'field', anchor: 'start' }).walk.roamers.find(r => r.enc === 'waymarker-stones').hunter, undefined);
  // sight: 8 tiles away along a clear row (5 + 3)
  const far = tick(game, onField(game, [pack(game, { hunter: true })], 12, 10, 'e'));
  const alert = far.events.find(e => e.t === 'alert');
  assert.deepEqual(alert, { t: 'alert', id: 'waymarker-stones', hunter: true });
  assert.equal(tick(game, onField(game, [pack(game)], 12, 10, 'e')).events.some(e => e.t === 'alert'), false, 'a plain pack does not see that far');
  // the chase: far past leash + 6 from home, a plain pack turns back; a hunter keeps coming
  const low = grudged(fresh());
  const lost = pack(low, { x: 6, y: 10, mood: 'chase', face: 'w' });
  assert.equal(tick(low, onField(low, [lost], 3, 10, 'e')).walk.roamers[0].mood, 'return');
  let w = onField(low, [{ ...lost, hunter: true }], 3, 10, 'e');
  let met = null;
  for (let i = 0; i < 6 && !met; i++) { const t = tick(low, w); met = t.events.find(e => e.t === 'contact'); w = t.walk; assert.equal(w.roamers[0].mood, 'chase'); }
  assert.ok(met, 'it runs you down');
  // walking into it is a fight, never a pack run down (a hunter never flees)
  const hit = move(game, onField(game, [pack(game, { x: 16, y: 10, hunter: true, face: 'e' })], 15, 10, 'e'), 'e').events[0];
  assert.deepEqual([hit.t, hit.weak], ['contact', undefined]);
});

const SIGHT = deepFreeze({
  ...FIELD, id: 'm4-field', zone: null, roam: { max: 0, rects: [] },
  entities: [
    { id: 'm4-toll', kind: 'encounter', enc: 'bramble-toll', mode: 'block', at: [24, 10], face: 'w' },
    { id: 'm4-chest', kind: 'chest', at: [2, 2], loot: { gold: 1, materials: { silver: 2, embers: 1 }, gems: { 'ash-garnet': 1 } } },
  ],
});
registerMap(SIGHT);

test('Longsight (Saltglass) widens the Sighted range by 4', () => {
  const game = fresh();
  const walk = { ...at(14, 10, 'e'), map: 'm4-field' };
  assert.equal(move(game, walk, 'e').events.some(e => e.t === 'sighted'), false, '9 tiles: out of range');
  const bow = deepFreeze({ ...game, inventory: [...game.inventory, relicItem('saltglass', createRng(8))] });
  assert.deepEqual(move(bow, walk, 'e').events.filter(e => e.t === 'sighted').map(e => e.relic), ['thornwatch-hood']);
});

test('a chest can hold forge materials and gems', () => {
  const game = deepFreeze({ ...fresh(), materials: { scrap: 1, silver: 0, embers: 0 } });
  const r = openChest(game, 'm4-chest');
  assert.equal(r.ok, true);
  assert.deepEqual([r.materials, r.gems], [{ silver: 2, embers: 1 }, { 'ash-garnet': 1 }]);
  assert.deepEqual(r.game.materials, { scrap: 1, silver: 2, embers: 1 });
  assert.deepEqual(r.game.gems, { 'ash-garnet': 1 });
  assert.equal(openChest(r.game, 'm4-chest').ok, false, 'once');
});

test('the Keep\'s south-east gate: sealed until Act I is done, then the way into the Sunscorch', () => {
  const keep = MAPS.keep;
  const exit = keep.exits.find(e => e.id === 'keep-se');
  assert.ok(exit?.gate && exit.to === 'sun-road', 'a gated exit to the Sunward Road');
  // stand on a walkable tile next to the gate and step into it
  let from = null;
  for (let y = exit.area[1]; y <= exit.area[3] && !from; y++) {
    for (let x = exit.area[0]; x <= exit.area[2] && !from; x++) {
      for (const [dir, [dx, dy]] of Object.entries({ n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] })) {
        const sx = x - dx, sy = y - dy;
        const inside = sx >= exit.area[0] && sx <= exit.area[2] && sy >= exit.area[1] && sy <= exit.area[3];
        if (!inside && canWalk(fresh(), 'keep', sx, sy)) { from = { x: sx, y: sy, dir }; break; }
      }
    }
  }
  assert.ok(from, 'the gate can be walked up to');
  const walk = { map: 'keep', visit: 1, x: from.x, y: from.y, face: from.dir, tick: 0, rng: 1, grace: 0, gone: {}, roamers: [] };
  const before = move(fresh(), walk, from.dir).events[0];
  assert.deepEqual([before.t, before.id, before.nextChapter], ['sealed', 'keep-se', false]);
  const game = fresh();
  const done = { ...game, progress: { ...game.progress, flags: { ...game.progress.flags, story: { ...game.progress.flags.story, 'act1-complete': true } } } };
  const after = move(done, walk, from.dir).events[0];
  assert.deepEqual([after.t, after.to, after.anchor], ['exit', 'sun-road', exit.anchor]);
  assert.ok(enterMap(done, { map: 'sun-road', anchor: exit.anchor }).walk, 'and the anchor is real');
});

// ---- Milestone 4.5 (docs/M45-SPEC.md A3, A7): no save is stranded; a gated exit says what opens it ----

const LANE = deepFreeze({
  id: 'lane', name: 'The Test Lane', region: 'verdant', biome: 'wilds', music: 'wilds', backdrop: 'hearth-road',
  zone: null, level: 2, travel: true, dark: false, lore: [[300, 260, 4, 4]], w: 7, h: 9,
  rows: ['###=###', '#.....#', '#.....#', '###.###', '#.....#', '#......', '#.....#', '#.....#', '###=###'],
  entities: [
    { id: 'lane-gate', kind: 'gate', area: [3, 3, 3, 3], look: 'chain', open: { beaten: 'hearth-road' }, guard: 'hearth-road', text: 'A rope across the lane.' },
    { id: 'hearth-road', kind: 'encounter', enc: 'hearth-road', mode: 'block', at: [4, 4], face: 's' },
  ],
  exits: [
    { id: 'lane-n', area: [3, 0, 3, 0], to: 'keep', anchor: 'from-hall' },
    { id: 'lane-s', area: [3, 8, 3, 8], to: 'keep', anchor: 'from-hall' },
    { id: 'lane-e', area: [6, 5, 6, 5], to: 'keep', anchor: 'from-hall', gate: { brand: 'brand-of-glass' },
      sealed: { region: 'sunscorch', text: 'The east gate is barred.', hint: 'It opens once the Brand of Glass is yours.' } },
  ],
  anchors: { south: [3, 7, 'n'] },
  roads: [{ from: 'south', to: 'lane-n', gates: ['lane-gate'] }],
  roam: null,
});
registerMap(LANE);

test('a carried-over position inside a shut road gate or its guard lands on the near side; a free one stays put', () => {
  const game = fresh();
  const at = (g, x, y) => { const w = enterMap(g, { map: 'lane', at: [x, y], face: 'n' }).walk; return [w.x, w.y]; };
  assert.deepEqual(at(game, 3, 3), [3, 4], 'out of the shut gate, back to the side the road comes from (never beyond it)');
  assert.deepEqual(at(game, 4, 4), [5, 4], 'out of the guard, to the nearest free tile on the near side');
  assert.deepEqual(at(game, 2, 6), [2, 6], 'a free tile stays put');
  assert.deepEqual(at(game, 3, 1), [3, 1], 'beyond the gate, but free: it stays (it can always fight the guard to go back)');
  const beaten = { ...game, progress: { ...game.progress, flags: { ...game.progress.flags, beaten: { 'hearth-road': 1 }, cleared: { 'hearth-road': true } } } };
  assert.deepEqual(at(beaten, 3, 3), [3, 3], 'an open gate is no longer solid');
  assert.deepEqual(enterMap(game, { map: 'lane', anchor: 'south' }).walk.x, 3, 'an anchor is used as is');
  // without roads (the mini map), the nearest free tile
  const w = enterMap(game, { map: 'mini', at: [9, 5], face: 'n' }).walk;
  assert.ok(canWalk(game, 'mini', w.x, w.y) && Math.abs(w.x - 9) + Math.abs(w.y - 5) === 1, `next to the block (${w.x},${w.y})`);
});

// Two gates on one road, neither guard beaten. An M4 save could have walked past the first fight (a pack
// in M4) and stood where new terrain is now: (3,5) is rock.
const LANE2 = deepFreeze({
  id: 'lane2', name: 'The Long Lane', region: 'verdant', biome: 'wilds', music: 'wilds', backdrop: 'hearth-road',
  zone: null, level: 2, travel: true, dark: false, lore: [[300, 260, 3, 6]], w: 7, h: 13,
  rows: ['###=###', '#.....#', '#.....#', '###.###', '#.....#', '#..o..#', '#.....#', '###.###', '#.....#', '#.....#', '#.....#', '#.....#', '###=###'],
  entities: [
    { id: 'lane2-gate-1', kind: 'gate', area: [3, 7, 3, 7], look: 'chain', open: { beaten: 'hearth-road' }, guard: 'hearth-road', text: 'A rope across the lane.' },
    { id: 'hearth-road', kind: 'encounter', enc: 'hearth-road', mode: 'block', at: [4, 8], face: 's' },
    { id: 'lane2-gate-2', kind: 'gate', area: [3, 3, 3, 3], look: 'bramble', open: { beaten: 'waymarker-stones' }, guard: 'waymarker-stones', text: 'Bramble across the lane.' },
    { id: 'waymarker-stones', kind: 'encounter', enc: 'waymarker-stones', mode: 'block', at: [4, 4], face: 's' },
  ],
  exits: [
    { id: 'lane2-n', area: [3, 0, 3, 0], to: 'keep', anchor: 'from-hall' },
    { id: 'lane2-s', area: [3, 12, 3, 12], to: 'keep', anchor: 'from-hall' },
  ],
  anchors: { south: [3, 11, 'n'] },
  roads: [{ from: 'south', to: 'lane2-n', gates: ['lane2-gate-1', 'lane2-gate-2'] }],
  roam: null,
});
registerMap(LANE2);

test('a save past the first of two unbeaten gates stays past it: the nudge is judged from its own stretch of road (review S2)', () => {
  const game = fresh();
  const at = (g, x, y) => { const w = enterMap(g, { map: 'lane2', at: [x, y], face: 'n' }).walk; return [w.x, w.y]; };
  assert.deepEqual(at(game, 3, 5), [3, 4], 'out of the new rock, one step, on the stretch it stood on (not back to the start)');
  assert.deepEqual(at(game, 3, 3), [3, 4], 'out of the second shut gate, to its near side, never beyond it');
  assert.deepEqual(at(game, 3, 7), [3, 8], 'out of the first shut gate, to the road\'s start side');
  assert.deepEqual(at(game, 4, 8), [5, 8], 'out of the first guard, on its own side');
  assert.deepEqual(at(game, 2, 5), [2, 5], 'a free tile stays put');
});

test('a position off the map (a damaged save) enters at the map\'s first anchor instead of throwing (review M1)', () => {
  const game = fresh();
  for (const bad of [[5, 999], [5, -1], [-3, 2], [1.5, 2], [undefined, 3]]) {
    const w = enterMap(game, { map: 'lane', at: bad, face: 'n' }).walk;
    assert.deepEqual([w.x, w.y], [3, 7], `${JSON.stringify(bad)} -> the south anchor`);
  }
  assert.deepEqual([enterMap(game, { map: 'lane', face: 'n' }).walk.x, enterMap(game, { map: 'lane', face: 'n' }).walk.y], [3, 7], 'no position at all');
});

test('a gated exit says what opens it (its sealed hint), then lets you through', () => {
  const game = fresh();
  const walk = enterMap(game, { map: 'lane', at: [5, 5], face: 'e' }).walk;
  const shut = move(game, walk, 'e').events.find(e => e.t === 'sealed');
  assert.deepEqual([shut?.id, shut?.text, shut?.hint], ['lane-e', 'The east gate is barred.', 'It opens once the Brand of Glass is yours.']);
  const branded = { ...game, progress: { ...game.progress, brands: ['brand-of-glass'] } };
  const open = move(branded, walk, 'e').events.find(e => e.t === 'exit');
  assert.equal(open?.id, 'lane-e');
  assert.equal(move(game, enterMap(game, { map: 'mini', at: [10, 4], face: 'e' }).walk, 'e').events.find(e => e.t === 'sealed').hint, null, 'no hint: null');
});

test('M6: an encounter that leaves (Tamsin after her fall) is gone from its map for good, won or yielded', () => {
  const game = fresh();
  const here = g => present(g, 'rotbridge').some(e => e.kind === 'encounter' && e.enc === 'tamsin-rotbridge');
  assert.ok(here(game), 'she waits on the bridge');
  const story = s => ({ ...game, progress: { ...game.progress, flags: { ...game.progress.flags, story: { ...game.progress.flags.story, ...s } } } });
  assert.ok(here(story({ 'tamsin-yielded-4': true })), 'a yield alone leaves her by her open gate...');
  assert.ok(!here(story({ 'tamsin-yielded-4': true, 'tamsin-fallen': true })), '...until the barge takes her');
});
