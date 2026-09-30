// WP6B review page: the M3 relics, temper, the new backdrops and the new icons. Bundled by tools/gallery.mjs:
//   node tools/gallery.mjs --entry=tools/gallery-items.js --out=/tmp/aeth-wp6b/shots [--only=relics,temper]
// Not part of the game build. The page helpers are copied from tools/gallery-entry.js (WP5's).
import { renderFoe } from '../src/art/foes.js';
import { renderHero } from '../src/art/hero-looks.js';
import { renderBackdrop, backdropLayers, BACKDROPS } from '../src/art/scenes.js';
import { statusIcon, lockIcon, keyIcon, markIcon, LOCK_ICON_KEYS, KEY_ICON_KEYS } from '../src/art/icons.js';
import { RELIC_ART, RELIC_IDS, itemArt, itemPortrait, itemIcon } from '../src/art/item-looks.js';

const app = document.getElementById('app');
const only = (window.location.hash.match(/only=([^&]+)/) || [])[1];
const want = id => !only || only.split(',').includes(id);
const ZOOM = +((window.location.hash.match(/zoom=([\d.]+)/) || [])[1] || 1);
const T = (window.__timings = {});
const time = (label, f) => { const t0 = performance.now(); const r = f(); T[label] = (T[label] || 0) + performance.now() - t0; return r; };

function section(id, title, note) {
  const s = document.createElement('section'); s.id = id;
  const h = document.createElement('h2'); h.textContent = title; s.appendChild(h);
  if (note) { const p = document.createElement('p'); p.className = 'note'; p.textContent = note; s.appendChild(p); }
  app.appendChild(s); return s;
}
function row(parent, label) { if (label) { const h = document.createElement('h3'); h.textContent = label; parent.appendChild(h); } const r = document.createElement('div'); r.className = 'row'; parent.appendChild(r); return r; }
function fig(parent, img, scale = 2, cap = '', bg) {
  const f = document.createElement('figure'), c = document.createElement('canvas');
  c.width = img.width; c.height = img.height; c.getContext('2d').putImageData(img, 0, 0);
  c.style.width = img.width * scale * ZOOM + 'px'; c.style.height = img.height * scale * ZOOM + 'px';
  if (bg) c.style.background = bg;
  f.appendChild(c);
  if (cap) { const fc = document.createElement('figcaption'); fc.textContent = cap; f.appendChild(fc); }
  parent.appendChild(f); return c;
}
const M3_RELICS = RELIC_IDS.slice(12);
const KIND = { lightfingers: 'gloves', hartshorn: 'bow', 'mosswatch-lantern': 'focus', 'watchkeepers-kettle': 'kettle', 'mire-pearl': 'ring', dawnbell: 'mace', rootsong: 'staff', oathshield: 'shield', 'isoldes-oath': 'sword', 'ichor-mask': 'helm', 'first-seed': 'amulet', 'vale-gauntlets': 'gauntlets' };
const STAGE = '#1e1812', FOE_BG = '#1a1612';

/* ---------- the twelve new relics ---------- */
if (want('relics')) {
  const s = section('relics', 'The twelve M3 heirlooms (codex 13-24)', 'Card portrait at 64px (heirloom frame, t=1.3) shown 3x, the 16px bag icon at 1x and 3x beside it.');
  const r = row(s);
  for (const id of M3_RELICS) {
    const art = RELIC_ART[id], f = document.createElement('figure'), wrap = document.createElement('div'); wrap.className = 'row';
    fig(wrap, time('relic portrait 64', () => itemPortrait(art, { rarity: 'heirloom', t: 1.3 })), 3);
    const col = document.createElement('div'); col.style.display = 'flex'; col.style.flexDirection = 'column'; col.style.gap = '6px';
    const ic = time('relic icon 16', () => itemIcon(art));
    fig(col, ic, 1, '', '#211a16'); fig(col, ic, 3, '', '#211a16');
    wrap.appendChild(col); f.appendChild(wrap);
    const fc = document.createElement('figcaption'); fc.textContent = `${art.p ? id : '?'} · ${KIND[id]} · ${art.aspect}`; f.appendChild(fc);
    r.appendChild(f);
  }
  const r2 = row(s, 'card size: 96px (shown 2x)');
  for (const id of M3_RELICS) fig(r2, time('relic portrait 96', () => itemPortrait(RELIC_ART[id], { rarity: 'heirloom', t: 2.1, size: 96 })), 2, id);
  const r3 = row(s, 'reduced motion (no particles), and the portrait over time (t = 0, .4, 1.3, 2.6)');
  for (const id of M3_RELICS.slice(0, 4)) { fig(r3, itemPortrait(RELIC_ART[id], { reduced: true }), 2, id + ' reduced'); for (const t of [0, .4, 2.6]) fig(r3, itemPortrait(RELIC_ART[id], { t }), 2, 't=' + t); }
}
if (only && only.includes('zoom')) {
  const ids = ((window.location.hash.match(/fk=([^&]+)/) || [])[1] || M3_RELICS.join(',')).split(',');
  const s = section('zoom', 'Close-up', '64px portrait at 5x and the 96px card at 3x, then the 32px and 16px icons.');
  for (const id of ids) {
    const r = row(s, id);
    fig(r, itemPortrait(RELIC_ART[id], { t: 1.3, reduced: true }), 5, '64 reduced');
    fig(r, itemPortrait(RELIC_ART[id], { t: 2.1, size: 96 }), 3, '96');
    fig(r, itemIcon(RELIC_ART[id], { size: 32 }), 4, '32', '#211a16');
    fig(r, itemIcon(RELIC_ART[id]), 4, '16', '#211a16');
  }
}
if (want('all24')) {
  const s = section('all24', 'All 24 relics in codex order', '64px portraits at 2x: the M2 twelve then the M3 twelve, to check the new ones sit in the same family; then each as the Codex shows it unsighted (develop 0, still), which must be a clean silhouette.');
  const r = row(s);
  for (const id of RELIC_IDS) fig(r, itemPortrait(RELIC_ART[id], { t: 1.3 }), 2, id);
  const r2 = row(s, 'unsighted (develop 0)');
  for (const id of RELIC_IDS) fig(r2, itemPortrait(RELIC_ART[id], { develop: 0, reduced: true }), 1.5, id);
}

/* ---------- temper ---------- */
if (want('temper')) {
  const s = section('temper', 'Temper +0 to +3', 'Each row: the same item at temper 0, 1, 2, 3. +1 adds a glint, +2 lifts the metal one ramp step, +3 adds an aspect-coloured edge. 64px portraits (2x), 16px icons (3x), and the hero sprite (2x) wearing it.');
  const items = [
    ['Hearthbrand (relic)', { uid: 'a', base: 'hearthbrand', kind: 'sword', slot: 'weapon', rarity: 'heirloom', aspect: 'ember', seed: 1 }, 'warden', 'weapon'],
    ['runed longsword, frost', { uid: 'b', base: 'longsword', kind: 'sword', slot: 'weapon', rarity: 'runed', aspect: 'frost', seed: 12 }, 'warden', 'weapon'],
    ['tempered kettle hat, no aspect', { uid: 'c', kind: 'kettle', slot: 'head', rarity: 'tempered', aspect: null, seed: 4 }, 'warden', 'head'],
    ['storied plate, storm', { uid: 'd', base: 'full-plate', kind: 'plate', slot: 'body', rarity: 'storied', aspect: 'storm', seed: 3 }, 'warden', 'body'],
    ['wrought leather jerkin (no metal)', { uid: 'e', kind: 'leather', slot: 'body', rarity: 'wrought', aspect: null, seed: 9 }, 'pip', 'body'],
    ['Dawnbell (relic)', { uid: 'f', base: 'dawnbell', kind: 'mace', slot: 'weapon', rarity: 'heirloom', aspect: 'radiant', seed: 1 }, 'alondra', 'weapon'],
    ['Vale Gauntlets (relic)', { uid: 'g', base: 'vale-gauntlets', kind: 'gauntlets', slot: 'hands', rarity: 'heirloom', aspect: 'storm', seed: 1 }, 'warden', 'hands'],
    ['heater shield, verdant', { uid: 'h', base: 'heater-shield', kind: 'shield', slot: 'offhand', rarity: 'tempered', aspect: 'verdant', seed: 21 }, 'warden', 'offhand'],
  ];
  for (const [label, base, hero, slot] of items) {
    const r = row(s, label);
    for (let n = 0; n <= 3; n++) {
      const item = Object.assign({}, base, { temper: n }), f = document.createElement('figure'), w = document.createElement('div'); w.className = 'row';
      fig(w, time('temper portrait 64', () => itemPortrait(item, { t: 1.3 })), 2);
      fig(w, time('temper icon 16', () => itemIcon(item)), 3, '', '#211a16');
      f.appendChild(w); const fc = document.createElement('figcaption'); fc.textContent = '+' + n; f.appendChild(fc); r.appendChild(f);
    }
    // gear passed as itemArt() objects: hero-looks keys ItemInstances without their temper (see notes/WP1.md)
    for (let n = 0; n <= 3; n++) fig(r, renderHero(hero, { [slot]: itemArt(Object.assign({}, base, { temper: n })) }, { pose: slot === 'weapon' ? 'attack' : 'idle', t: slot === 'weapon' ? .62 : .1 }), 2, 'hero +' + n, STAGE);
  }
  const r2 = row(s, 'glint over time on a +1 item (t = 0 .. 2.2); reduced motion keeps both glints');
  const it = { uid: 'z', base: 'longsword', kind: 'sword', rarity: 'runed', aspect: 'frost', seed: 12, temper: 1 };
  for (const t of [0, .3, .6, 1, 1.3, 1.7, 2.2]) fig(r2, itemPortrait(it, { t }), 2, 't=' + t);
  fig(r2, itemPortrait(it, { reduced: true }), 2, 'reduced');
  fig(r2, itemPortrait(Object.assign({}, it, { temper: 3 }), { reduced: true }), 2, '+3 reduced');
}

/* ---------- holders: the new relics on heroes and on foes ---------- */
if (want('holders')) {
  const s = section('holders', 'The new relics worn and held', 'renderHero with each relic equipped (idle and attack), and renderFoe for humanoid holders (WP6A owns the foe rig; this checks the relic art reads there).');
  const kits = [
    ['warden', { weapon: 'isoldes-oath', offhand: 'oathshield', head: 'watchkeepers-kettle', hands: 'vale-gauntlets', ring: 'mire-pearl' }],
    ['pip', { weapon: 'hartshorn', hands: 'lightfingers', amulet: 'first-seed' }],
    ['bryn', { weapon: 'rootsong', head: 'ichor-mask' }],
    ['alondra', { weapon: 'dawnbell', offhand: 'mosswatch-lantern', amulet: 'first-seed' }],
  ];
  for (const [hero, gear] of kits) {
    const r = row(s, hero + ': ' + Object.values(gear).join(', '));
    for (const [pose, t] of [['idle', 0], ['attack', .1], ['attack', .62], ['cast', .3], ['guard', 0], ['hurt', 0]]) fig(r, renderHero(hero, gear, { pose, t }), 2, pose, STAGE);
  }
  const r2 = row(s, 'foes holding them');
  for (const [key, relic] of [['cutpurse', 'lightfingers'], ['bandit', 'hartshorn'], ['tallyman', 'mosswatch-lantern'], ['tallyman', 'isoldes-oath'], ['bandit', 'oathshield'], ['bandit', 'rootsong'], ['bandit', 'vale-gauntlets'], ['tallyman', 'first-seed']]) {
    try { fig(r2, renderFoe(key, { gearTier: 2, tier: 'relic-bearer', relic, t: .05 }), 2, `${key}+${relic}`, FOE_BG); } catch (e) { console.error(key, relic, e.message); }
  }
}

/* ---------- backdrops ---------- */
if (want('scenes')) {
  const foeFor = { mossfall: ['bandit', { gearTier: 1 }], mosswatch: ['tallyman', { gearTier: 2 }], 'mosswatch:dark': ['tallyman', { gearTier: 3, relic: 'mosswatch-lantern' }], fawnrest: ['tallyman', {}], eldergrove: ['bandit', { gearTier: 3 }], heartroot: ['cutpurse', { gearTier: 3 }], 'heartroot:dark': ['briarmaw', { phase: 3 }] };
  for (const key of ['mossfall', 'mosswatch', 'mosswatch:dark', 'fawnrest', 'eldergrove', 'heartroot', 'heartroot:dark']) {
    const B = BACKDROPS[key] || {};
    const s = section('scene-' + key.replace(':', '-'), `${B.name || '?'} (${key})`, 'renderBackdrop(key, { w: 160, h: 96, t }) at 3x for two times and a mock-up with a foe and the party on the floor band; then a phone-sized 120x104 frame, a wide 240x90 frame and the four parallax layers.');
    const r = row(s);
    fig(r, time('backdrop render', () => renderBackdrop(key, { t: 1.3 })), 3, 't=1.3');
    fig(r, renderBackdrop(key, { t: 2.9 }), 3, 't=2.9');
    const r2 = row(s);
    fig(r2, renderBackdrop(key, { w: 120, h: 104, t: .7 }), 2, '120x104 (phone)');
    fig(r2, renderBackdrop(key, { w: 240, h: 90, t: .7 }), 2, '240x90 (wide)');
    for (const L of backdropLayers(key).layers) fig(r2, L.img, 1, L.id + ' x' + L.parallax, '#302830');
    const bd = renderBackdrop(key, { t: 1 }), c = document.createElement('canvas'); c.width = 160; c.height = 96; const g = c.getContext('2d'); g.putImageData(bd, 0, 0);
    const put = (img, x, y) => { const t2 = document.createElement('canvas'); t2.width = img.width; t2.height = img.height; t2.getContext('2d').putImageData(img, 0, 0); g.drawImage(t2, Math.round(x), Math.round(y)); };
    const [fk, fo] = foeFor[key]; const foe = renderFoe(fk, Object.assign({ t: .3 }, fo)), fa = foe.anchors.foot; put(foe, (fk === 'briarmaw' ? 50 : 44) - fa[0], 84 - fa[1]);
    ['warden', 'pip', 'bryn', 'alondra'].forEach((k, i) => { const im = renderHero(k, undefined, { pose: 'idle', t: .2 + i }), a = im.anchors.foot; put(im, 106 + (i % 2) * 22 - a[0] + (i >> 1) * 10, 78 + (i >> 1) * 12 - a[1]); });
    const f = document.createElement('figure'); c.style.width = '480px'; c.style.height = '288px'; f.appendChild(c); const fc = document.createElement('figcaption'); fc.textContent = 'mock-up'; f.appendChild(fc); r.appendChild(f);
  }
}

/* ---------- icons ---------- */
if (want('icons')) {
  const s = section('icons', 'New icons: lock types, keys, marks', 'lockIcon(id) for every LOCKS type plus the crownwall story seal, keyIcon(kind) for a relic power and each Domain, markIcon(true|false). 12px at 4x and 1x, and 24px at 2x; dim variants for opened locks.');
  const block = (r, img12, img1, img24, cap) => { const f = document.createElement('figure'), w = document.createElement('div'); w.className = 'row'; fig(w, img12, 4); fig(w, img1, 1); if (img24) fig(w, img24, 2); f.appendChild(w); const fc = document.createElement('figcaption'); fc.textContent = cap; f.appendChild(fc); r.appendChild(f); };
  const r = row(s, 'lock types');
  for (const k of LOCK_ICON_KEYS) block(r, lockIcon(k), lockIcon(k), lockIcon(k, { size: 24 }), k);
  block(r, lockIcon('nope'), lockIcon('nope'), lockIcon('nope', { size: 24 }), '(unknown)');
  const r2 = row(s, 'opened (dim)');
  for (const k of LOCK_ICON_KEYS) block(r2, lockIcon(k, { dim: true }), lockIcon(k, { dim: true }), null, k);
  const r3 = row(s, 'keys: a relic power, then the Domains');
  for (const k of KEY_ICON_KEYS) block(r3, keyIcon(k), keyIcon(k), keyIcon(k, { size: 24 }), k);
  block(r3, keyIcon('nope'), keyIcon('nope'), null, '(unknown)');
  const r4 = row(s, 'marks, and the fallback status icon');
  block(r4, markIcon(true), markIcon(true), markIcon(true, { size: 24 }), 'yes');
  block(r4, markIcon(false), markIcon(false), markIcon(false, { size: 24 }), 'no');
  block(r4, statusIcon('some-new-status'), statusIcon('some-new-status'), statusIcon('some-new-status', { size: 24 }), 'status fallback');
  const r5 = row(s, 'a lock prompt line, drawn at 2x: Thornwall  [ok] Thornsplitter  [no] Physical 3');
  const line = document.createElement('div'); line.className = 'row'; line.style.alignItems = 'center';
  const txt = t => { const sp = document.createElement('span'); sp.textContent = t; sp.style.font = '13px system-ui'; return sp; };
  fig(line, lockIcon('thornwall'), 2); line.appendChild(txt('Thornwall ·')); fig(line, markIcon(true), 2); fig(line, itemIcon('thornsplitter', { size: 16 }), 1.5); line.appendChild(txt('Thornsplitter ·')); fig(line, markIcon(false), 2); fig(line, keyIcon('physical'), 2); line.appendChild(txt('Physical 3 (Wren 2)'));
  r5.appendChild(line);
}
/* ---------- render cost ---------- */
if (want('perf')) {
  const s = section('perf', 'Render cost', 'cold = first render (vector raster or scene paint); warm = what an animated card or the battle stage pays per frame for a new t. Median of repeated runs in this browser; the machine is shared, so treat these as rough.');
  const pre = document.createElement('pre'); s.appendChild(pre);
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1], lines = [];
  const bench = (label, cold, warm) => {
    const c = []; for (let k = 0; k < 3; k++) { const t0 = performance.now(); cold(k); c.push(performance.now() - t0); }
    const w = []; for (let k = 0; k < 24; k++) { const t0 = performance.now(); warm(k / 12); w.push(performance.now() - t0); }
    T['cold ' + label] = med(c); T['warm ' + label] = med(w);
    lines.push(`${label.padEnd(34)} cold ${med(c).toFixed(1).padStart(6)} ms   warm ${med(w).toFixed(2).padStart(6)} ms`);
  };
  for (const id of ['lightfingers', 'dawnbell', 'ichor-mask', 'first-seed']) bench(`portrait 64 ${id}`, k => itemPortrait(RELIC_ART[id], { size: 60 + k }), t => itemPortrait(RELIC_ART[id], { t }));
  bench('portrait 96 vale-gauntlets', k => itemPortrait(RELIC_ART['vale-gauntlets'], { size: 94 + k }), t => itemPortrait(RELIC_ART['vale-gauntlets'], { size: 96, t }));
  const sw = n => ({ uid: 'p', base: 'longsword', kind: 'sword', rarity: 'runed', aspect: 'frost', seed: 12, temper: n });
  bench('portrait 64 sword +3 (edge)', k => itemPortrait(sw(3), { size: 61 + k }), t => itemPortrait(sw(3), { t }));
  bench('icon 16 sword +3', k => itemIcon(Object.assign(sw(3), { seed: 40 + k })), () => itemIcon(sw(3)));
  for (const key of ['mossfall', 'mosswatch', 'fawnrest', 'eldergrove', 'heartroot', 'mosswatch:dark', 'heartroot:dark']) bench(`backdrop 180x110 ${key}`, k => renderBackdrop(key, { w: 180 + k, h: 110, t: 0 }), t => renderBackdrop(key, { w: 180, h: 110, t }));
  bench('lockIcon 12 (all types)', k => { for (const id of LOCK_ICON_KEYS) lockIcon(id, { size: 13 + k }); }, () => lockIcon('thornwall'));
  pre.textContent = lines.join('\n');
}
window.__done = true;
