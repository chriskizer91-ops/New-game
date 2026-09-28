// World engine tests (rules/world.js, M3 spec §4.5) on test/fixtures/map-mini.mjs. Owner: WP1.
// SCAFFOLD: a first set of real assertions; WP1 adds roamers, determinism, ambush, grace and stun.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/rules/gauntlet.js';
import { migrate } from '../src/rules/migrate.js';
import { deepFreeze } from '../src/core/freeze.js';
import { registerMap, enterMap, move, interact, commit, canWalk, findPath, present, lockStatus, openChest } from '../src/rules/world.js';
import { MINI } from './fixtures/map-mini.mjs';

registerMap(MINI);
const fresh = () => deepFreeze(migrate(newGame({ name: 'Tess', seed: 5 })));
const at = (x, y, face = 'n') => ({ map: 'mini', visit: 1, x, y, face, tick: 0, rng: 1, grace: 0, gone: {}, roamers: [] });
const kinds = r => r.events.map(e => e.t);

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
