import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { rollDice, rollD20, parseDice } from '../src/core/dice.js';

test('rng is deterministic per seed and resumable from state', () => {
  const a = createRng('hearth'), b = createRng('hearth');
  const xs = Array.from({ length: 5 }, () => a.next());
  assert.deepEqual(xs, Array.from({ length: 5 }, () => b.next()));
  const s = a.getState(), next = a.next();
  const c = createRng(0); c.setState(s);
  assert.equal(c.next(), next);
});

test('dice stay in range and d20 advantage keeps the higher die', () => {
  const rng = createRng(7);
  for (let i = 0; i < 500; i++) {
    const r = rollDice(rng, 2, 8);
    assert.ok(r.total >= 2 && r.total <= 16 && r.rolls.length === 2);
    const d = rollD20(rng, { adv: true });
    assert.equal(d.kept, Math.max(...d.rolls));
  }
});

test('parseDice reads terms and flat bonus', () => {
  assert.deepEqual(parseDice('2d8+6'), { terms: [{ n: 2, sides: 8 }], flat: 6 });
  assert.deepEqual(parseDice('1d10 + 1d6 - 1'), { terms: [{ n: 1, sides: 10 }, { n: 1, sides: 6 }], flat: -1 });
});
