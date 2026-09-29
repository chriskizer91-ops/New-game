// Painted art (M5 spec A10): the paintings tools/paint-import.mjs fitted to maps (ui/assets/paint/) and the
// cut-scene stills (ui/assets/cuts/). Each painting names a real map and covers it exactly at 16 px per
// tile; every image is a WebP whose own header agrees with the size its entry claims; and the file stays
// small enough to carry many of them. Owner: lead (P8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PAINTINGS } from '../src/ui/assets/paint/index.js';
import { CUTS } from '../src/ui/assets/cuts/index.js';
import { MAPS } from '../src/data/maps/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const TILE = 16;
const MAX_KB = { map: 160, cut: 150 }; // WebP bytes per image (a map this size of Hearthstone Keep is ~100 KB)

// A WebP's pixel size from its RIFF header: lossy ('VP8 '), lossless ('VP8L') or extended ('VP8X').
function webpSize(src) {
  const m = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(src);
  assert.ok(m, 'a WebP data URL');
  const b = Buffer.from(m[1], 'base64');
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.toString('ascii', 8, 12), 'WEBP');
  const kind = b.toString('ascii', 12, 16);
  let w, h;
  if (kind === 'VP8 ') { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff; }
  else if (kind === 'VP8L') { const v = b.readUInt32LE(21); w = (v & 0x3fff) + 1; h = ((v >>> 14) & 0x3fff) + 1; }
  else if (kind === 'VP8X') { w = b.readUIntLE(24, 3) + 1; h = b.readUIntLE(27, 3) + 1; }
  else assert.fail(`unknown WebP chunk ${kind}`);
  return { w, h, bytes: b.length };
}

test('every painting is a real map, covered exactly at 16 px per tile, and small', () => {
  assert.ok(Object.keys(PAINTINGS).length >= 1, 'the pilot paintings are in');
  for (const [id, p] of Object.entries(PAINTINGS)) {
    const map = MAPS[id];
    assert.ok(map, `${id} is a map`);
    assert.deepEqual([p.w, p.h], [map.w * TILE, map.h * TILE], `${id}: its painting covers the map`);
    const s = webpSize(p.src);
    assert.deepEqual([s.w, s.h], [p.w, p.h], `${id}: the image is the size its entry says`);
    assert.ok(s.bytes <= MAX_KB.map * 1024, `${id}: ${(s.bytes / 1024).toFixed(0)} KB (at most ${MAX_KB.map} KB)`);
  }
});

test('the cut-scene stills: WebP, the size they say, and the prologue has both halves or neither', () => {
  for (const [id, c] of Object.entries(CUTS)) {
    const s = webpSize(c.src);
    assert.deepEqual([s.w, s.h], [c.w, c.h], id);
    assert.ok(s.bytes <= MAX_KB.cut * 1024, `${id}: ${(s.bytes / 1024).toFixed(0)} KB (at most ${MAX_KB.cut} KB)`);
  }
  assert.equal(!!CUTS['hearth-gold'], !!CUTS['hearth-blue'], 'the gold hall and the blue one come together (ui/screens/newgame.js)');
});

test('the indexes list every generated file, and nothing else', () => {
  const dir = d => readdirSync(path.join(here, '../src/ui/assets', d)).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => f.slice(0, -3)).sort();
  assert.deepEqual(Object.keys(PAINTINGS).sort(), dir('paint'));
  assert.deepEqual(Object.keys(CUTS).sort(), dir('cuts'));
  // the renderer draws a painted map from its painting and the rest from tiles; layout references stay tiles
  const view = readFileSync(path.join(here, '../src/ui/world/view.js'), 'utf8');
  assert.match(view, /B\.paint = null; \/\/ a layout reference is drawn from the tiles/);
});
