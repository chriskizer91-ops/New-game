// The delivery zip (M7 spec A6): a file sent in the chat may be at most 30 MiB, and a milestone's one self-contained
// HTML file (the player's paintings at full detail) is more than that. So the download goes out as a zip holding that
// one file, which the player unzips (a phone's Files app does it with a tap) and opens as before. The HTML inside is
// byte for byte dist/aethermoor-m<N>.html. Written here with Node's zlib, so no library is needed.
//
//   node tools/zip.mjs <file.html> [--out=<file.zip>]      # default: the HTML's name with .zip, beside it
//   node tools/zip.mjs --check=<file.zip> --against=<file.html>   # unzip it and compare the bytes
//
//   zipFiles([{ name, data, mtime? }]) -> Buffer     deflated entries (stored when deflate would not help)
//   unzip(buf) -> [{ name, data }]                    reads what zipFiles writes (and plain zips like it)
// Owner: the lead (M7).
import { deflateRawSync, inflateRawSync, crc32 } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// MS-DOS date and time, as a zip stores them (local time is not wanted: a fixed date keeps the zip reproducible)
function dosTime(d) {
  const time = (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | Math.floor(d.getUTCSeconds() / 2);
  const date = ((d.getUTCFullYear() - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate();
  return { time, date };
}

export function zipFiles(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data);
    const deflated = deflateRawSync(data, { level: 9 });
    const stored = deflated.length >= data.length;
    const body = stored ? data : deflated;
    const crc = crc32(data) >>> 0;
    const { time, date } = dosTime(e.mtime || new Date(Date.UTC(2026, 0, 1)));
    const method = stored ? 0 : 8;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);            // version needed
    local.writeUInt16LE(0x0800, 6);        // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);          // made by
    central.writeUInt16LE(20, 6);          // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(0, 30);          // extra, comment, disk (16 bits each: 30, 32, 34)
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);          // internal attributes
    central.writeUInt32LE(0, 38);          // external attributes
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const dir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, dir, end]);
}

export function unzip(buf) {
  const endAt = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endAt < 0) throw new Error('not a zip: no end of central directory');
  const count = buf.readUInt16LE(endAt + 10);
  let p = buf.readUInt32LE(endAt + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('not a zip: bad central directory');
    const method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), size = buf.readUInt32LE(p + 20), full = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32), at = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    const lName = buf.readUInt16LE(at + 26), lExtra = buf.readUInt16LE(at + 28);
    const body = buf.subarray(at + 30 + lName + lExtra, at + 30 + lName + lExtra + size);
    const data = method === 0 ? Buffer.from(body) : method === 8 ? inflateRawSync(body) : null;
    if (!data) throw new Error(`${name}: compression method ${method} is not read here`);
    if (data.length !== full || (crc32(data) >>> 0) !== crc) throw new Error(`${name}: damaged (size or CRC)`);
    out.push({ name, data });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

// ---- the command line -----------------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
  if (args.check) {
    const entries = unzip(readFileSync(String(args.check)));
    const want = args.against ? readFileSync(String(args.against)) : null;
    const ok = entries.length === 1 && (!want || entries[0].data.equals(want));
    console.log(`${args.check}: ${entries.map(e => `${e.name} (${e.data.length} bytes)`).join(', ')}${want ? (ok ? ': the same bytes as ' : ': NOT the same bytes as ') + args.against : ''}`);
    process.exit(ok ? 0 : 1);
  }
  const src = process.argv.slice(2).find(a => !a.startsWith('--'));
  if (!src) { console.error('usage: node tools/zip.mjs <file.html> [--out=<file.zip>] | --check=<file.zip> [--against=<file.html>]'); process.exit(2); }
  const out = args.out ? String(args.out) : src.replace(/\.html?$/i, '') + '.zip';
  const data = readFileSync(src);
  const zip = zipFiles([{ name: path.basename(src), data }]);
  writeFileSync(out, zip);
  const mib = n => (n / 1048576).toFixed(2) + ' MiB';
  console.log(`zipped ${src} (${mib(data.length)}) -> ${out} (${mib(zip.length)})${zip.length > 30 * 1048576 ? '  WARNING: still over 30 MiB' : ''}`);
}
