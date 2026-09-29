// Painted art (M5 spec A10): the paintings tools/paint-import.mjs fitted to maps (ui/assets/paint/) and the
// cut-scene stills (ui/assets/cuts/). Each painting names a real map and covers it exactly, at the density
// the world view draws painted maps at (PAINT_DENSITY px per art px); every image is a WebP whose own
// header agrees with the size its entry claims; and each stays small enough to carry many. Owner: lead (P8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PAINTINGS } from '../src/ui/assets/paint/index.js';
import { CUTS } from '../src/ui/assets/cuts/index.js';
import { MAPS } from '../src/data/maps/index.js';
import { LEGEND } from '../src/data/tiles.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const TILE = 16, PAINT_DENSITY = 2; // as ui/world/view.js (which touches the DOM, so is not imported here)
const MAX_BPP = 0.5, MAX_CUT_KB = 150; // WebP bytes per pixel of a map painting (Hearthstone Keep's is ~0.4); a still's KB

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

test('every painting is a real map, covered exactly at the painted density, and small', () => {
  assert.ok(Object.keys(PAINTINGS).length >= 1, 'the pilot paintings are in');
  for (const [id, p] of Object.entries(PAINTINGS)) {
    const map = MAPS[id];
    assert.ok(map, `${id} is a map`);
    assert.deepEqual([p.w, p.h], [map.w * TILE * PAINT_DENSITY, map.h * TILE * PAINT_DENSITY], `${id}: its painting covers the map at ${PAINT_DENSITY} px per art px`);
    const s = webpSize(p.src);
    assert.deepEqual([s.w, s.h], [p.w, p.h], `${id}: the image is the size its entry says`);
    assert.ok(s.bytes <= MAX_BPP * p.w * p.h, `${id}: ${(s.bytes / 1024).toFixed(0)} KB (at most ${MAX_BPP} bytes a pixel)`);
  }
});

test('overhang and overTiles belong to painted maps; a map traced from its painting has one painted at its own size', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    if (map.overhang || map.overTiles === false) assert.ok(PAINTINGS[id], `${id}: overhang and overTiles are for painted maps`);
    for (const r of map.overhang || []) {
      const [x0, y0, x1, y1] = r;
      assert.ok(x0 >= 0 && y0 >= 0 && x1 < map.w && y1 < map.h && x0 <= x1 && y0 <= y1, `${id}: ${r} on the map`);
    }
    // a traced map's rows name only tiles the game knows (an unknown character would read as the void)
    if (map.overTiles === false) for (const row of map.rows) for (const ch of row) assert.ok(LEGEND[ch], `${id}: tile '${ch}'`);
  }
});

test('the cut-scene stills: WebP, the size they say, and the prologue has both halves or neither', () => {
  for (const [id, c] of Object.entries(CUTS)) {
    const s = webpSize(c.src);
    assert.deepEqual([s.w, s.h], [c.w, c.h], id);
    assert.ok(s.bytes <= MAX_CUT_KB * 1024, `${id}: ${(s.bytes / 1024).toFixed(0)} KB (at most ${MAX_CUT_KB} KB)`);
  }
  assert.equal(!!CUTS['hearth-gold'], !!CUTS['hearth-blue'], 'the gold hall and the blue one come together (ui/screens/newgame.js)');
});

test('the indexes list every generated file, and nothing else', () => {
  const dir = d => readdirSync(path.join(here, '../src/ui/assets', d)).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => f.slice(0, -3)).sort();
  assert.deepEqual(Object.keys(PAINTINGS).sort(), dir('paint'));
  assert.deepEqual(Object.keys(CUTS).sort(), dir('cuts'));
  // the renderer draws a painted map from its painting at this test's density, and layout references
  // (tools/map-shots.mjs, tools/paint-refs.mjs) from the tiles
  const view = readFileSync(path.join(here, '../src/ui/world/view.js'), 'utf8');
  assert.match(view, new RegExp(`export const PAINT_DENSITY = ${PAINT_DENSITY};`));
  assert.match(view, /makeBaked\(map, \{ painted: false \}\); \/\/ a layout reference is drawn from the tiles/);
});
