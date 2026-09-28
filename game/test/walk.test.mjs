// The long walk (M3 spec §6.1 WP1 "done when"): from newGame to act1-complete for all 3 starters
// using findPath, move, interact and forced wins, never stuck. Owner: WP1.
// SCAFFOLD: walks the prologue only (the Great Hall to the courtyard, then up to the shut north
// gate). WP1 extends it to the whole critical path once the real maps land.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/rules/gauntlet.js';
import { migrate } from '../src/rules/migrate.js';
import { enterMap, move, findPath } from '../src/rules/world.js';
import { START_AT } from '../src/data/world.js';
import { dirTo } from '../src/rules/path.js';

// Walk a path; return the events of the last step.
function walkPath(game, walk, path) {
  let r = { game, walk, events: [] };
  for (const p of path) r = move(r.game, r.walk, dirTo([r.walk.x, r.walk.y], p));
  return r;
}

for (const starter of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) {
  test(`prologue walk (${starter}): the hall door leads to the courtyard; the north gate is shut until the vault`, () => {
    const game = migrate(newGame({ name: 'Tess', seed: 9, starter }));
    let r = enterMap(game, { map: START_AT.map, at: [START_AT.x, START_AT.y], face: START_AT.face });
    const toDoor = findPath(r.game, r.walk, [12, 13]);
    assert.ok(toDoor, 'a path to the hall door');
    r = walkPath(r.game, r.walk, toDoor);
    const exit = r.events.find(e => e.t === 'exit');
    assert.deepEqual([exit.to, exit.anchor], ['keep', 'from-hall']);
    r = enterMap(r.game, { map: exit.to, anchor: exit.anchor });
    const toGate = findPath(r.game, r.walk, [15, 2]);
    assert.ok(toGate, 'a path round the hall facade to the gate');
    r = walkPath(r.game, r.walk, toGate);
    const gate = move(r.game, r.walk, 'n').events.find(e => e.t === 'gate');
    assert.equal(gate.id, 'keep-n-gate');
  });
}
