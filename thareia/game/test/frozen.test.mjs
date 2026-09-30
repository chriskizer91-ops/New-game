// Every Thareia milestone the player received is a file of its own, and it stays exactly as it was
// delivered: a new milestone is a new file, never an overwrite (the player's rule, M4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Thareia's delivered milestones (thareia-t1.html, ...) are added here as each is delivered. The old Aethermoor
// game's frozen files stay on its own branch (claude/cool-ptolemy-uc93gg).
const FROZEN = {};

test('the delivered milestone files are byte for byte what the player got', () => {
  for (const [file, sha] of Object.entries(FROZEN)) {
    const got = createHash('sha256').update(readFileSync(new URL(`../dist/${file}`, import.meta.url))).digest('hex');
    assert.equal(got, sha, `dist/${file} changed: it is a delivered milestone and must never be rebuilt`);
  }
});
