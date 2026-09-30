// Renders every sound offline in Chromium, measures its peak, and writes LEVEL in sounds.js so each sound peaks at its
// group's target. Then renders again through playSfx and reports the result. Run: node tools/level.mjs
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../sounds.js');
const TARGET = { 'Menus and interface': .22, 'Walking the world': .26, 'Music cues and places': .34 };
const LOUD = new Set(['crit', 'surge-release', 'reveal-primal', 'boss', 'thunder', 'beast', 'aether-storm', 'stone', 'storm']);
const QUIET = new Set(['ui-cursor', 'ui-blip', 'step-grass', 'step-stone', 'rain', 'campfire', 'river', 'wind', 'auros']);
const measure = async (src, useLevels) => {
  const b = await pw.chromium.launch(); const p = await b.newPage(); await p.setContent('<html></html>');
  const r = await p.evaluate(async ({ src, useLevels }) => {
    const mod = await import(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    const out = [];
    for (const s of mod.SFX) {
      const oc = new OfflineAudioContext(2, 44100 * 5, 44100); mod.sfxInit(oc);
      if (useLevels) mod.playSfx(s, .02); else s.play(.02);
      const buf = await oc.startRendering(); let peak = 0, bad = 0;
      for (let c = 0; c < 2; c++) for (const v of buf.getChannelData(c)) { if (!Number.isFinite(v)) bad++; else if (Math.abs(v) > peak) peak = Math.abs(v); }
      out.push({ id: s.id, cat: s.cat, peak, bad });
    }
    return out;
  }, { src, useLevels });
  await b.close(); return r;
};
let src = await readFile(file, 'utf8');
const raw = await measure(src, false);
const lv = {};
for (const r of raw) {
  let tgt = TARGET[r.cat] ?? .32; if (LOUD.has(r.id)) tgt = .5; if (QUIET.has(r.id)) tgt = Math.min(tgt, .16);
  lv[r.id] = +Math.min(16, Math.max(.4, tgt / Math.max(r.peak, 1e-4))).toFixed(2);
}
const body = 'const LEVEL = ' + JSON.stringify(lv).replace(/,"/g, ', "').replace(/"([a-z0-9-]+)":/g, "'$1': ") + ';';
src = src.replace(/\/\/ LEVEL: GENERATED\n[\s\S]*?\n\/\/ LEVEL: END/, `// LEVEL: GENERATED\n${body}\n// LEVEL: END`);
await writeFile(file, src);
const after = await measure(src, true);
const off = after.filter(r => r.bad || r.peak < .1 || r.peak > .9);
console.log('levelled', after.length, 'sounds; outside 0.1-0.9:', off.length ? JSON.stringify(off) : 'none');
console.log('peaks', after.map(r => r.peak).sort((a, b) => a - b).filter((_, i, a) => i % 20 === 0 || i === a.length - 1).map(v => v.toFixed(2)).join(' '));
