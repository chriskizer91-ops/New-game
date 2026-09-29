// Every milestone the player received is a file of its own, and it stays exactly as it was
// delivered: a new milestone is a new file, never an overwrite (the player's rule, M4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const FROZEN = {
  'aethermoor-m2.html': 'f8b742c1043b14bd1a3fce950ceaa880036d14c77fadb5fda845992afbbe702d',
  'aethermoor-m3.html': 'f758376835cfc8879c9eb9ab822fda44ab298863f54937c552dc924f75b92e15',
  'aethermoor-m4.html': 'a324d1ca4fb1eeb248092caeb8a4caff312fbaed8595a37d65af884e22999c4f',
  'aethermoor-m4.5.html': '42621d634c310a4a7d100c3c6f65910648323e09a23a1271517b630caeaa8ffa',
};

test('the delivered milestone files are byte for byte what the player got', () => {
  for (const [file, sha] of Object.entries(FROZEN)) {
    const got = createHash('sha256').update(readFileSync(new URL(`../dist/${file}`, import.meta.url))).digest('hex');
    assert.equal(got, sha, `dist/${file} changed: it is a delivered milestone and must never be rebuilt`);
  }
});
