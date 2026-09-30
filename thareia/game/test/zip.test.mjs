// The delivery zip (M7 spec A6; tools/zip.mjs): what it holds comes back byte for byte, a file that deflate cannot
// shrink is stored, and a damaged zip is refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { zipFiles, unzip } from '../tools/zip.mjs';

test('the delivery zip holds its file byte for byte', () => {
  const html = Buffer.from('<!doctype html>\n<title>Aethermoor</title>\n' + 'data:image/webp;base64,UklGRi'.repeat(4000) + '\n');
  const zip = zipFiles([{ name: 'aethermoor-m7.html', data: html }]);
  assert.ok(zip.length < html.length / 5, 'deflated');
  const [e, ...rest] = unzip(zip);
  assert.equal(rest.length, 0);
  assert.equal(e.name, 'aethermoor-m7.html');
  assert.ok(e.data.equals(html));
  assert.ok(zipFiles([{ name: 'aethermoor-m7.html', data: html }]).equals(zip), 'the same file gives the same zip');
});

test('a file deflate cannot shrink is stored, and several files keep their order', () => {
  const noise = Buffer.alloc(4096);
  let x = 1;
  for (let i = 0; i < noise.length; i++) { x = (x * 1103515245 + 12345) >>> 0; noise[i] = x >>> 24; }
  const zip = zipFiles([{ name: 'a.bin', data: noise }, { name: 'b.txt', data: Buffer.from('hearth') }]);
  const out = unzip(zip);
  assert.deepEqual(out.map(e => e.name), ['a.bin', 'b.txt']);
  assert.ok(out[0].data.equals(noise));
  assert.equal(out[1].data.toString(), 'hearth');
  assert.equal(zip.readUInt16LE(8), 0, 'the noise is stored, not deflated');
});

test('a damaged zip is refused, not unzipped wrong', () => {
  const zip = zipFiles([{ name: 'x.html', data: Buffer.from('<p>the Hearth Below</p>'.repeat(50)) }]);
  const bad = Buffer.from(zip);
  bad[40] ^= 0xff; // inside the deflated body
  assert.throws(() => unzip(bad));
  assert.throws(() => unzip(Buffer.from('not a zip at all')), /not a zip/);
});
