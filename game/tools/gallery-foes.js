// Foe art review page (WP6A, M3): the ten new families, the seven named holders and Tamsin, next to the
// approved M2 foes, plus a render check of every FOE_ART key, pose, phase, gear tier and relic state.
// Bundled by tools/gallery.mjs into the same page shell as tools/gallery-entry.js:
//
//   node tools/gallery.mjs --entry=tools/gallery-foes.js --out=/tmp/aeth-wp6a/shots
//   node tools/gallery.mjs --entry=tools/gallery-foes.js --only=check          # just the render check
//   node tools/gallery.mjs --entry=tools/gallery-foes.js --only=focus --fk=rotwarden --ph=3   # 4x close-ups
//
// Sections: lineup, humanoids, named, tamsin, rabble, sapwight, bearers, rotwarden, check (and focus on demand).
// The check logs every failure with console.error (gallery.mjs prints them as "page error") and reports
// its counts in the timings table ("check renders", "check failures").
//
// M4 battle and item art (P6), only on demand: --only=sun (every M4 section) or any of sun-lineup, sun-humanoids,
// sun-named, sun-tamsin, sun-beasts, sun-bearers, sun-kharzul, sun-warden, sun-scenes, sun-relics, sun-forge,
// sun-icons, sun-perf, sun-check:
//   node tools/gallery.mjs --entry=tools/gallery-foes.js --out=/tmp/aeth-p6-gallery/m4 --only=sun
// M5 (P6), the same way: --only=iron (every M5 section) or any of iron-lineup, iron-humanoids, iron-named,
// iron-beasts, iron-bearers, iron-anvil, iron-abbot, iron-scenes, iron-relics, iron-icons, iron-perf, iron-check:
//   node tools/gallery.mjs --entry=tools/gallery-foes.js --out=/tmp/aeth-p6-gallery/m5 --only=iron
// M6 (P6), the same way: --only=gloom (every M6 section) or any of gloom-lineup, gloom-humanoids, gloom-named,
// gloom-beasts, gloom-bearers, gloom-mother, gloom-leviathan, gloom-tamsin, gloom-scenes, gloom-relics, gloom-icons,
// gloom-perf, gloom-check:
//   node tools/gallery.mjs --entry=tools/gallery-foes.js --out=/tmp/aeth-p6-gallery/m6 --only=gloom
import { renderFoe, foeAnchors, foeLooks, relicSlot, FOE_ART, FOE_KEYS, FOE_POSES } from '../src/art/foes.js';
import { RELIC_ART } from '../src/art/item-looks.js';
import { itemArt, itemPortrait, itemIcon, TEMPER_MAX } from '../src/art/item-looks.js';
import { renderBackdrop, backdropLayers, BACKDROPS } from '../src/art/scenes.js';
import { renderHero } from '../src/art/hero-looks.js';
import { lockIcon, keyIcon, gemIcon, materialIcon, statusIcon, GEM_ICON_KEYS, MATERIAL_ICON_KEYS } from '../src/art/icons.js';
import { RELICS } from '../src/data/relics.js';

const app = document.getElementById('app');
const hash = window.location.hash;
const only = (hash.match(/only=([^&]+)/) || [])[1];
// at phone width (the gallery's second screenshot pass) only the lineup is drawn, as wrapped figures
const PHONE = window.innerWidth < 600;
const want = id => (id === 'focus' ? !!(only && only.split(',').includes('focus')) : only ? only.split(',').includes(id) : !PHONE || id === 'lineup');
const ZOOM = +((hash.match(/zoom=([\d.]+)/) || [])[1] || 1);
const T = (window.__timings = {});
const time = (label, f) => { const t0 = performance.now(); const r = f(); T[label] = (T[label] || 0) + performance.now() - t0; return r; };

/* ---------- page helpers (same as tools/gallery-entry.js) ---------- */
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
// several sprites standing on one floor line (foot anchors aligned), for side-by-side reading
function stage(parent, list, { scale = 2, h = 104, pad = 6, cap = '', bg = '#1d1914' } = {}) {
  const w = list.reduce((a, { img }) => a + img.width + pad, pad), c = document.createElement('canvas');
  c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = '#2a241d'; g.fillRect(0, h - 8, w, 8);
  let x = pad;
  for (const { img } of list) {
    const t2 = document.createElement('canvas'); t2.width = img.width; t2.height = img.height; t2.getContext('2d').putImageData(img, 0, 0);
    const foot = img.anchors.foot; g.drawImage(t2, x, h - 9 - foot[1]); x += img.width + pad;
  }
  c.style.width = w * scale * ZOOM + 'px'; c.style.height = h * scale * ZOOM + 'px';
  const f = document.createElement('figure'); f.appendChild(c);
  const fc = document.createElement('figcaption'); fc.style.maxWidth = 'none'; fc.textContent = cap || list.map(l => l.label).join(' · '); f.appendChild(fc);
  parent.appendChild(f); return c;
}

const BG = '#1a1612';
const POSES = [['idle', 0], ['idle', .7], ['attack', .1], ['attack', .6], ['hurt', 0], ['ko', 0]];
const M2 = ['cutpurse', 'bandit', 'tallyman', 'briarling', 'thornhound', 'rotstag', 'oldsnag', 'briarmaw'];
const NEW_HUM = ['smuggler', 'feral-druid', 'hollowed-ranger'];
const NAMED = ['mags', 'haskett', 'hollis', 'dun', 'vesper', 'oda', 'corra'];
const STARTERS = ['hearthbrand', 'stillwater-lance', 'cairnmaul'];
const name = k => FOE_ART[k].name;

/* ---------- the lineup: every new foe on one floor with the M2 foes ---------- */
const NEW_BEASTS = ['boglurcher', 'glowcap', 'rotgrub', 'sapwight', 'gloamwing', 'mirelord', 'rotwarden'];
const idleOf = (k, o = {}) => ({ img: renderFoe(k, Object.assign({ t: .3, gearTier: FOE_ART[k].kind === 'humanoid' ? 1 : 0, relic: k === 'tamsin' ? 'hearthbrand' : undefined }, o)), label: k });
if (want('lineup') && PHONE) {
  const s = section('lineup', 'Lineup (phone width)', 'Every new foe idle at 2x, then the M2 foes.');
  const r = row(s, 'M3'); for (const k of NEW_HUM.concat(NAMED, ['tamsin'], NEW_BEASTS)) fig(r, idleOf(k).img, 2, k, BG);
  const r2 = row(s, 'M2 (approved)'); for (const k of M2) fig(r2, idleOf(k, { gearTier: 0 }).img, 2, k, BG);
} else if (want('lineup')) {
  const s = section('lineup', 'Lineup: every new foe, at 2x and 3x, beside the approved M2 foes', 'renderFoe(key, { pose: "idle" }) with each foe\'s default tier and relic (humanoids at gearTier 1; Tamsin holding Hearthbrand), feet on one floor line.');
  stage(row(s, 'M2 (approved), 2x'), M2.map(k => idleOf(k, { gearTier: 0 })), { h: 100 });
  stage(row(s, 'M3 humanoids, named holders and Tamsin, 2x'), NEW_HUM.concat(NAMED.slice(0, 3)).map(k => idleOf(k)), { h: 72 });
  stage(row(s), NAMED.slice(3).concat(['tamsin']).map(k => idleOf(k)), { h: 72 });
  stage(row(s, 'M3 beasts, 2x'), NEW_BEASTS.map(k => idleOf(k)), { h: 100 });
  stage(row(s, 'M3 humanoids at 3x, with the M2 cutpurse, bandit and tallyman'), ['cutpurse', 'smuggler', 'mags', 'bandit', 'haskett', 'tallyman', 'hollis'].map(k => idleOf(k)), { h: 70, scale: 3 });
  stage(row(s), ['dun', 'vesper', 'feral-druid', 'oda', 'hollowed-ranger', 'corra', 'tamsin'].map(k => idleOf(k)), { h: 70, scale: 3 });
  stage(row(s, 'M3 rabble at 3x, with the M2 briarling and thornhound'), ['briarling', 'boglurcher', 'glowcap', 'rotgrub', 'thornhound', 'sapwight'].map(k => idleOf(k)), { h: 70, scale: 3 });
  stage(row(s, 'M3 relic-bearers at 3x, with the Rot-Stag and Old Snag'), ['rotstag', 'gloamwing', 'mirelord', 'oldsnag'].map(k => idleOf(k)), { h: 70, scale: 3 });
  stage(row(s, 'the champions at 3x: Briarmaw, the Rotwarden phase 1 and phase 3'), [idleOf('briarmaw'), idleOf('rotwarden', { phase: 1 }), idleOf('rotwarden', { phase: 3 })], { h: 100, scale: 3 });
}

/* ---------- the new humanoid families: gear tiers 0-3, every pose ---------- */
if (want('humanoids')) {
  const s = section('humanoids', 'New humanoid families: gearTier 0-3, every pose', 'Smuggler (rabble), Feral Druid and Hollowed Ranger (veterans). renderFoe(key, { gearTier, pose, t }) at 64x64, 3x.');
  for (const key of NEW_HUM) for (let gT = 0; gT < 4; gT++) {
    const r = row(s, `${name(key)} gearTier ${gT}`);
    for (const [pose, t] of POSES) fig(r, time(`foe ${key} render`, () => renderFoe(key, { gearTier: gT, pose, t })), 3, `${pose} ${t}`, BG);
  }
}

/* ---------- the seven named holders ---------- */
if (want('named')) {
  const s = section('named', 'Named holders: every pose at gearTier 1, the four gear tiers, disarmed', 'Their relics come from RELIC_ART (or a same-kind heirloom stand-in until WP6B lands a look). 3x.');
  for (const key of NAMED) {
    const r = row(s, `${name(key)} (${FOE_ART[key].relic || 'no relic'} → ${relicSlot(FOE_ART[key].relic) || '-'}${FOE_ART[key].relic && !RELIC_ART[FOE_ART[key].relic] ? ', stand-in' : ''})`);
    for (const [pose, t] of POSES) fig(r, time(`foe ${key} render`, () => renderFoe(key, { gearTier: 1, pose, t })), 3, `${pose} ${t}`, BG);
    const r2 = row(s);
    for (let gT = 0; gT < 4; gT++) fig(r2, renderFoe(key, { gearTier: gT, t: .2 }), 3, `gearTier ${gT}`, BG);
    fig(r2, renderFoe(key, { gearTier: 1, t: 0 }), 3, 'glint t=0', BG);
    if (FOE_ART[key].relic) { fig(r2, renderFoe(key, { gearTier: 1, relicHeld: false }), 3, 'disarmed', BG); fig(r2, renderFoe(key, { gearTier: 1, relicHeld: false, pose: 'attack', t: .6 }), 3, 'disarmed attack', BG); }
  }
}

/* ---------- Tamsin, with each lent starter ---------- */
if (want('tamsin')) {
  const s = section('tamsin', 'Tamsin: the three lent starters, the Vale Gauntlets, gear tiers', 'renderFoe(\'tamsin\', { relic: <starter>, pose, t }). The gauntlets are always worn; the lent starter can be disarmed. 3x.');
  for (const relic of STARTERS) {
    const r = row(s, `lent ${relic}`);
    for (const [pose, t] of POSES) fig(r, time('foe tamsin render', () => renderFoe('tamsin', { relic, pose, t })), 3, `${pose} ${t}`, BG);
    fig(r, renderFoe('tamsin', { relic, t: 1.25 }), 3, 'glint gauntlets', BG);
    fig(r, renderFoe('tamsin', { relic, relicHeld: false }), 3, 'disarmed', BG);
  }
  const r = row(s, 'gear tiers (lent Cairnmaul), and no relic (her own sword)');
  for (let gT = 0; gT < 4; gT++) fig(r, renderFoe('tamsin', { relic: 'cairnmaul', gearTier: gT, t: .2 }), 3, `gearTier ${gT}`, BG);
  fig(r, renderFoe('tamsin', { t: .2 }), 3, 'no relic', BG);
  fig(r, renderFoe('tamsin', { variant: 'stillwater-lance', t: .2 }), 3, 'variant: stillwater-lance', BG);
}

/* ---------- rabble beasts ---------- */
if (want('rabble')) {
  const s = section('rabble', 'New rabble beasts: gearTier 0-3, every pose', 'Boglurcher 48x48, Glowcap 48x48, Rotgrub 48x32. Thornier, then rotting: red eyes at 2, blight at 3. 3x.');
  for (const key of ['boglurcher', 'glowcap', 'rotgrub']) for (let gT = 0; gT < 4; gT++) {
    const r = row(s, `${name(key)} gearTier ${gT}`);
    for (const [pose, t] of POSES) fig(r, time(`foe ${key} render`, () => renderFoe(key, { gearTier: gT, pose, t })), 3, `${pose} ${t}`, BG);
  }
}
if (want('sapwight')) {
  const s = section('sapwight', 'Sapwight (veteran, 48x64): gearTier 0-3, every pose', 'A ghoul of bark and black sap. 3x.');
  for (let gT = 0; gT < 4; gT++) {
    const r = row(s, `Sapwight gearTier ${gT}`);
    for (const [pose, t] of POSES) fig(r, time('foe sapwight render', () => renderFoe('sapwight', { gearTier: gT, pose, t })), 3, `${pose} ${t}`, BG);
  }
}

/* ---------- relic-bearers ---------- */
if (want('bearers')) {
  const s = section('bearers', 'Relic-Bearers: the Gloamwing and Gorrow the Mire-King', 'The Dawnbell silk-spun on the moth\'s thorax; the Mire Pearl in the frog-king\'s crown of reeds. Glints over time, then relicHeld:false. 3x.');
  for (const key of ['gloamwing', 'mirelord']) {
    for (const gT of [0, 1, 2, 3]) {
      const r = row(s, `${name(key)} gearTier ${gT}`);
      for (const [pose, t] of POSES) fig(r, time(`foe ${key} render`, () => renderFoe(key, { gearTier: gT, pose, t })), 3, `${pose} ${t}`, BG);
    }
    const r = row(s, `${name(key)}: glint over time, then disarmed (relic ${FOE_ART[key].relic}${RELIC_ART[FOE_ART[key].relic] ? '' : ', stand-in'})`);
    for (const t of [0, .1, .2, 1.5]) fig(r, renderFoe(key, { t }), 3, `t=${t}`, BG);
    fig(r, renderFoe(key, { relicHeld: false }), 3, 'relicHeld:false', BG);
    fig(r, renderFoe(key, { relicHeld: false, pose: 'attack', t: .6 }), 3, 'disarmed attack', BG);
  }
}

/* ---------- the Rotwarden ---------- */
if (want('rotwarden')) {
  const s = section('rotwarden', 'The Rotwarden, the Champion: phases 1-3, broken pieces, poses', 'renderFoe(\'rotwarden\', { phase, broken, pose, t }) at 96x96, 2x. The Ichor Mask and the First Seed stay until broken (the same mechanism as Briarmaw\'s crown and fang).');
  for (const phase of [1, 2, 3]) {
    const r = row(s, `phase ${phase}`);
    for (const [pose, t] of POSES) fig(r, time('foe rotwarden render', () => renderFoe('rotwarden', { phase, pose, t })), 2, `${pose} ${t}`, BG);
  }
  const r = row(s, 'broken pieces and glints');
  for (const [phase, broken] of [[1, ['ichor-mask']], [2, ['first-seed']], [3, ['ichor-mask', 'first-seed']], [2, ['ichor-mask']]]) fig(r, renderFoe('rotwarden', { phase, broken, t: .3 }), 2, `p${phase} broken: ${broken.join('+')}`, BG);
  fig(r, renderFoe('rotwarden', { phase: 2, relicHeld: false }), 2, 'relicHeld:false', BG);
  fig(r, renderFoe('rotwarden', { phase: 1, t: 0 }), 2, 'glint mask', BG);
  fig(r, renderFoe('rotwarden', { phase: 1, t: 1.25 }), 2, 'glint seed', BG);
  const r2 = row(s, 'phase 3 close-up (3x)');
  fig(r2, renderFoe('rotwarden', { phase: 3, t: .3 }), 3, 'p3 idle', BG);
  fig(r2, renderFoe('rotwarden', { phase: 3, broken: ['ichor-mask'], t: .3 }), 3, 'p3 unmasked', BG);
}

/* ---------- 4x close-ups on demand: --only=focus --fk=key[:gearTier[:relic]],... [--ph=n] ---------- */
if (want('focus')) {
  const s = section('focus', 'Focus');
  const keys = decodeURIComponent((hash.match(/fk=([^&]+)/) || [])[1] || 'rotwarden').split(',');
  const ph = +((hash.match(/ph=(\d)/) || [])[1] || 1);
  for (const entry of keys) {
    const [key, gt, relic] = entry.split(':'), o = { phase: ph, gearTier: gt === undefined ? 1 : +gt };
    if (relic) o.relic = relic === 'none' ? null : relic;
    const r = row(s, entry);
    for (const [pose, t] of [['idle', 0], ['attack', .6], ['hurt', 0], ['ko', 0]]) fig(r, renderFoe(key, Object.assign({ pose, t }, o)), 4, pose, BG);
  }
}

/* ---------- render cost of the new foes (--only=perf) ---------- */
if (only && only.split(',').includes('perf')) {
  const s = section('perf', 'Render cost of the M3 foes', 'cold = a new pose raster plus compose (median of 3 poses); warm = a cached raster re-composed for a new t (median of 24). This machine is shared, so the numbers are noisy.');
  const pre = document.createElement('pre'); s.appendChild(pre);
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1], lines = [];
  for (const key of M2.concat(NEW_HUM, NAMED, ['tamsin'], NEW_BEASTS)) {
    const c = [], w = [];
    ['hurt', 'ko', 'attack'].forEach((pose, k) => { const t0 = performance.now(); renderFoe(key, { pose, t: .6, flip: true, gearTier: k, phase: k + 1 }); c.push(performance.now() - t0); });
    for (let k = 0; k < 24; k++) { const t0 = performance.now(); renderFoe(key, { t: k / 12 * .1 + (k % 2) * .05, gearTier: 1 }); w.push(performance.now() - t0); }
    T['cold ' + key] = med(c); T['warm ' + key] = med(w);
    lines.push(`${key.padEnd(16)} ${FOE_ART[key].kind === 'humanoid' ? '64x64' : FOE_ART[key].w + 'x' + FOE_ART[key].h}  cold ${med(c).toFixed(1).padStart(6)} ms   warm ${med(w).toFixed(2).padStart(6)} ms`);
  }
  pre.textContent = lines.join('\n');
}

/* ---------- the render check ---------- */
if (want('check')) {
  const s = section('check', 'Render check: every FOE_ART key, pose, phase and gear tier', 'Every key renders every pose (plus cast and guard for humanoids) at every phase and gear tier, with relics held, disarmed, absent and unknown, broken pieces, every tier, flipped, reduced and tinted, without throwing; anchors are finite and relic glints sit on the canvas.');
  const t0 = performance.now();
  let n = 0; const fails = [];
  const fin = p => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
  const fail = (key, o, msg) => { fails.push(`${key} ${JSON.stringify(o)}: ${msg}`); console.error(`foe check: ${key} ${JSON.stringify(o)}: ${msg}`); };
  const check = (key, o, test) => {
    let img;
    try { img = renderFoe(key, Object.assign({}, o)); n++; } catch (e) { fail(key, o, 'threw ' + e.message); return; }
    const d = FOE_ART[key], a = img.anchors || {};
    if (img.width !== (d.kind === 'humanoid' ? 64 : d.w) || img.height !== (d.kind === 'humanoid' ? 64 : d.h)) fail(key, o, `size ${img.width}x${img.height}`);
    for (const k of ['foot', 'head', 'center']) if (!fin(a[k])) fail(key, o, `anchor ${k} missing`);
    for (const [k, v] of Object.entries(a)) {
      if (!v || k === 'relics') continue;
      if (!fin(v)) fail(key, o, `anchor ${k} not a point`);
    }
    // relic glints sit on the canvas (the M2 foes are frozen as approved: Briarmaw's fang glints just off it when it lies down)
    const on = p => fin(p) && (M2.includes(key) || (p[0] >= -1 && p[1] >= -1 && p[0] <= img.width + 1 && p[1] <= img.height + 1));
    if (a.relics) for (const p of a.relics) if (!on(p)) fail(key, o, 'relic glint off the canvas');
    if (a.relic && !on(a.relic)) fail(key, o, 'relic anchor off the canvas');
    let lit = 0; for (let i = 3; i < img.data.length; i += 4) if (img.data[i]) lit++;
    if (lit < 60) fail(key, o, `only ${lit} opaque pixels`);
    if (test) { const m = test(img, a); if (m) fail(key, o, m); }
  };
  const poses = [['idle', 0], ['idle', .7], ['idle', 3.72], ['attack', .1], ['attack', .6], ['hurt', 0], ['ko', 0]];
  for (const key of FOE_KEYS) {
    const d = FOE_ART[key], hum = d.kind === 'humanoid', P = hum ? poses.concat([['cast', 0], ['guard', 0]]) : poses;
    for (const [pose, t] of P) for (let gT = 0; gT < 4; gT++) check(key, { pose, t, gearTier: gT, phase: 1 });
    for (const [pose, t] of P) for (const phase of [2, 3]) check(key, { pose, t, phase, gearTier: d.phases ? 3 : 0 });
    for (const [pose, t] of [['idle', 0], ['attack', .6]]) {
      check(key, { pose, t, flip: true, gearTier: 2 }, (img, a) => (a.foot[0] !== img.width - (hum ? 32 : d.foot[0]) ? 'flipped foot not mirrored' : null));
      check(key, { pose, t, reduced: true, gearTier: 1 });
      check(key, { pose, t, tint: [255, 255, 255, .8] });
      check(key, { pose, t, relic: 'no-such-relic' });
      check(key, { pose, t, relic: null });
    }
    if (hum) for (const tier of ['rabble', 'veteran', 'relic-bearer', 'champion']) check(key, { tier, pose: 'idle', t: .2, gearTier: 3 });
    // its own relic: held (a glint), disarmed, and each of the M3 relics offered to it
    if (d.relic) for (const [pose, t] of P) {
      check(key, { pose, t, gearTier: 1 }, (img, a) => (pose !== 'ko' && !a.relic ? 'no relic glint anchor' : null));
      check(key, { pose, t, gearTier: 1, relicHeld: false });
    }
    // a looks table for every humanoid (walkers), and none for beasts
    try { const L = foeLooks(key, { gearTier: 2 }); if (hum ? !L.H || !L.gear.weapon : L.H !== null) fail(key, {}, 'foeLooks shape'); } catch (e) { fail(key, {}, 'foeLooks threw ' + e.message); }
  }
  for (const relic of STARTERS) for (const [pose, t] of poses) for (let gT = 0; gT < 4; gT++) {
    check('tamsin', { relic, pose, t, gearTier: gT }, (img, a) => (pose !== 'ko' && (!a.relics || a.relics.length !== 2) ? 'Tamsin needs two glints (lent starter, gauntlets)' : null));
    check('tamsin', { relic, pose, t, gearTier: gT, relicHeld: false });
  }
  for (const v of STARTERS) try { const L = foeLooks('tamsin', { variant: v }); if (!L.gear.weapon || L.gear.weapon.id === undefined) fail('tamsin', { variant: v }, 'foeLooks variant'); } catch (e) { fail('tamsin', { variant: v }, 'foeLooks threw ' + e.message); }
  for (const key of ['rotwarden', 'briarmaw']) {
    const pieces = FOE_ART[key].relics;
    for (const broken of [[], [pieces[0]], [pieces[1]], pieces.slice()]) for (const phase of [1, 2, 3]) for (const [pose, t] of poses) {
      check(key, { phase, pose, t, broken }, (img, a) => ((a.relics || []).length !== 2 - broken.length ? `expected ${2 - broken.length} relic glints` : null));
      if (key === 'rotwarden') check(key, { phase, pose, t, broken, flip: true });
    }
    for (const phase of [1, 2, 3]) check(key, { phase, relicHeld: false }, (img, a) => ((a.relics || []).length ? 'relicHeld:false still glints' : null));
  }
  // every M3 relic on every humanoid (the stand-in path, or WP6B's look once it lands)
  for (const key of FOE_KEYS.filter(k => FOE_ART[k].kind === 'humanoid')) for (const relic of ['lightfingers', 'hartshorn', 'mosswatch-lantern', 'watchkeepers-kettle', 'mire-pearl', 'dawnbell', 'rootsong', 'oathshield', 'isoldes-oath', 'ichor-mask', 'first-seed', 'vale-gauntlets']) {
    check(key, { relic, t: .1, gearTier: 1 });
    check(key, { relic, relicHeld: false, pose: 'attack', t: .6 });
  }
  try { foeAnchors('rotwarden', { phase: 2 }); foeLooks('no-such-foe'); } catch (e) { fail('misc', {}, e.message); }
  T['check renders'] = n; T['check failures'] = fails.length; T['check ms'] = performance.now() - t0;
  const pre = document.createElement('pre');
  pre.textContent = `${n} renders across ${FOE_KEYS.length} keys (${FOE_POSES.join(', ')} + cast/guard for humanoids), ${fails.length} failures, ${(performance.now() - t0).toFixed(0)} ms` + (fails.length ? '\n' + fails.slice(0, 40).join('\n') : '');
  s.appendChild(pre);
  window.__foeCheck = { renders: n, failures: fails };
}
/* =====================================================================
   M4 (P6): the Sunscorch foes, backdrops, relics, the forge's looks and icons. Each section is its own function.
   ===================================================================== */
const SUN = only && only.split(',').some(k => k === 'sun' || k.startsWith('sun-'));
const wantSun = id => SUN && (only.split(',').includes('sun') || only.split(',').includes(id));
const SUN_HUM = ['scavenger', 'dune-raider', 'ash-wight'];
const SUN_NAMED = ['rasa', 'gnash', 'ash-captain', 'brask', 'quartermaster', 'vell'];
const SUN_BEASTS = ['sand-skink', 'glass-scorpion', 'mirage-wisp'];
const SUN_BEARERS = ['glass-matriarch', 'wisp-queen', 'sand-wyrm'];
const SUN_CHAMPS = ['kharzul', 'ashen-warden'];
const SUN_SCENES = ['sun-road', 'sandspire', 'dust-trail', 'deep-shaft', 'glass-heart', 'glass-flats', 'miragewell', 'scorchgate', 'scorchgate-vaults'];
const SUN_RELICS = ['sandwalkers', 'zaras-orrery', 'wyrmscale', 'sunstone-lantern', 'glass-carapace', 'dunebreaker', 'cinderfang', 'mirage-glass', 'qasims-signet', 'sunstone-heart', 'scorchgate-key', 'ashen-aegis', 'cinder-crown', 'saltglass'];
const RELIC_KIND = { sandwalkers: 'boots', 'zaras-orrery': 'amulet', wyrmscale: 'shield', 'sunstone-lantern': 'focus', 'glass-carapace': 'plate', dunebreaker: 'hammer', cinderfang: 'sword', 'mirage-glass': 'amulet', 'qasims-signet': 'ring', 'sunstone-heart': 'amulet', 'scorchgate-key': 'ring', 'ashen-aegis': 'shield', 'cinder-crown': 'helm', saltglass: 'bow' };
const relicItem = (id, o = {}) => Object.assign({ uid: id, base: id, kind: RELIC_KIND[id], rarity: 'heirloom', aspect: RELIC_ART[id].aspect, seed: 1, temper: 0, gems: [] }, o);

function sunLineup() {
  const s = section('sun-lineup', 'M4 lineup: every Sunscorch foe, feet on one floor', 'renderFoe(key, { pose: "idle", gearTier: 2 }) (the Waking at which players meet the Sunscorch), 2x; then 3x, with the M3 foes they stand beside.');
  const at = (k, o = {}) => ({ img: renderFoe(k, Object.assign({ t: .3, gearTier: 2 }, o)), label: k });
  stage(row(s, 'humanoids and named holders, gearTier 2, 2x'), SUN_HUM.concat(SUN_NAMED).map(k => at(k)), { h: 72 });
  stage(row(s, 'beasts and relic-bearers, 2x'), SUN_BEASTS.concat(SUN_BEARERS).map(k => at(k)), { h: 104 });
  stage(row(s, 'the Champions, 2x, with Briarmaw and the Rotwarden'), [at('briarmaw', { gearTier: 0 }), at('rotwarden', { gearTier: 0 }), at('kharzul'), at('ashen-warden')], { h: 104 });
  stage(row(s, 'humanoids at 3x beside the M3 smuggler and tallyman'), ['smuggler', 'scavenger', 'dune-raider', 'rasa', 'gnash', 'tallyman', 'brask', 'quartermaster', 'vell'].map(k => at(k)), { h: 70, scale: 3 });
  stage(row(s), ['ash-wight', 'ash-captain', 'tamsin'].map(k => at(k, k === 'tamsin' ? { gearTier: 4, relic: 'hearthbrand' } : {})), { h: 70, scale: 3 });
  stage(row(s, 'beasts at 3x'), ['rotgrub', 'sand-skink', 'glass-scorpion', 'mirage-wisp', 'glass-matriarch'].map(k => at(k)), { h: 70, scale: 3 });
  stage(row(s), ['wisp-queen', 'sand-wyrm'].map(k => at(k)), { h: 84, scale: 3 });
}
function sunPoses(s, key, o = {}, scale = 3) {
  for (let gT = 0; gT < 4; gT++) {
    const r = row(s, `${name(key)} gearTier ${gT}`);
    for (const [pose, t] of POSES) fig(r, time(`foe ${key} render`, () => renderFoe(key, Object.assign({ gearTier: gT, pose, t }, o))), scale, `${pose} ${t}`, BG);
  }
}
function sunHumanoids() {
  const s = section('sun-humanoids', 'Sunscorch humanoid families: gearTier 0-3, every pose', 'Dune Scavenger (rabble), Dune Raider and Ash-Wight (veterans). 64x64 at 3x. Tiers 2-3 are the ones met at Waking 2+.');
  for (const key of SUN_HUM) sunPoses(s, key);
}
function sunNamed() {
  const s = section('sun-named', 'Named holders: every pose at gearTier 2, the four gear tiers, disarmed', 'Rasa (Sandwalkers), Gnash (Dunebreaker), the Ash-Captain (the Scorchgate Key), Foreman Brask (the Sunstone Lantern), the Quartermaster (no relic), Vell Saltglass (Saltglass). 3x.');
  for (const key of SUN_NAMED) {
    const r = row(s, `${name(key)} (${FOE_ART[key].relic || 'no relic'} -> ${relicSlot(FOE_ART[key].relic) || '-'})`);
    for (const [pose, t] of POSES) fig(r, time(`foe ${key} render`, () => renderFoe(key, { gearTier: 2, pose, t })), 3, `${pose} ${t}`, BG);
    const r2 = row(s);
    for (let gT = 0; gT < 4; gT++) fig(r2, renderFoe(key, { gearTier: gT, t: .2 }), 3, `gearTier ${gT}`, BG);
    fig(r2, renderFoe(key, { gearTier: 2, t: 0 }), 3, 'glint t=0', BG);
    if (FOE_ART[key].relic) { fig(r2, renderFoe(key, { gearTier: 2, relicHeld: false }), 3, 'disarmed', BG); fig(r2, renderFoe(key, { gearTier: 2, relicHeld: false, pose: 'attack', t: .6 }), 3, 'disarmed attack', BG); }
  }
}
function sunTamsin() {
  const s = section('sun-tamsin', 'Tamsin at Scorchgate: gearTier 4, her kindled look', 'The M3 gearTier 3 kit with the Kindled ember rim on everything she carries, and ember motes. Each lent starter; gearTier 3 beside it for comparison. 3x.');
  for (const relic of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) {
    const r = row(s, `lent ${relic}`);
    fig(r, renderFoe('tamsin', { relic, gearTier: 3, t: .2 }), 3, 'gearTier 3 (M3)', BG);
    for (const [pose, t] of POSES) fig(r, time('foe tamsin kindled', () => renderFoe('tamsin', { relic, gearTier: 4, pose, t: t + 1.1 })), 3, `kindled ${pose}`, BG);
  }
}
function sunBeasts() {
  const s = section('sun-beasts', 'Sunscorch beasts: gearTier 0-3, every pose', 'Sand-Skink 48x32, Glass Scorpion 64x48, Mirage Wisp 48x64. 3x.');
  for (const key of SUN_BEASTS) sunPoses(s, key);
}
function sunBearers() {
  const s = section('sun-bearers', 'Relic-bearers and lair bosses: the Glass Matriarch, the Wisp-Queen, the Sand Wyrm', 'Every pose at gearTier 0 and 3, the relic glint over time, and relicHeld:false. 3x (the Wyrm 2x).');
  for (const key of SUN_BEARERS) {
    const sc = FOE_ART[key].w > 80 ? 2 : 3;
    for (const gT of [0, 3]) { const r = row(s, `${name(key)} gearTier ${gT}`); for (const [pose, t] of POSES) fig(r, time(`foe ${key} render`, () => renderFoe(key, { gearTier: gT, pose, t })), sc, `${pose} ${t}`, BG); }
    const r = row(s, `${name(key)}: glint, disarmed (relic ${FOE_ART[key].relic || 'none'})`);
    for (const t of [0, .1, 1.5]) fig(r, renderFoe(key, { t }), sc, `t=${t}`, BG);
    fig(r, renderFoe(key, { relicHeld: false }), sc, 'relicHeld:false', BG);
    fig(r, renderFoe(key, { relicHeld: false, pose: 'attack', t: .6 }), sc, 'disarmed attack', BG);
  }
}
function sunChampion(id, key, title, note) {
  const s = section(id, title, note);
  for (const phase of [1, 2, 3]) { const r = row(s, `phase ${phase}`); for (const [pose, t] of POSES) fig(r, time(`foe ${key} render`, () => renderFoe(key, { phase, pose, t })), 2, `${pose} ${t}`, BG); }
  const pieces = FOE_ART[key].relics, r = row(s, 'pieces snapped off, and the glints');
  for (const [phase, broken] of [[1, [pieces[0]]], [1, [pieces[1]]], [2, [pieces[0]]], [2, [pieces[1]]], [3, pieces.slice()]]) fig(r, renderFoe(key, { phase, broken, t: .3 }), 2, `p${phase} broken: ${broken.join('+')}`, BG);
  fig(r, renderFoe(key, { phase: 2, relicHeld: false }), 2, 'relicHeld:false', BG);
  fig(r, renderFoe(key, { phase: 1, t: 0 }), 2, `glint ${pieces[0]}`, BG);
  fig(r, renderFoe(key, { phase: 1, t: 1.25 }), 2, `glint ${pieces[1]}`, BG);
  const r2 = row(s, 'close-ups (3x): phase 1, phase 3, phase 3 stripped');
  fig(r2, renderFoe(key, { phase: 1, t: .3 }), 3, 'p1', BG); fig(r2, renderFoe(key, { phase: 3, t: .3 }), 3, 'p3', BG); fig(r2, renderFoe(key, { phase: 3, broken: pieces.slice(), t: .3 }), 3, 'p3 stripped', BG);
}
function sunScenes() {
  const HEROES = ['warden', 'pip', 'bryn', 'alondra'];
  const foeFor = { 'sun-road': ['dune-raider', { gearTier: 2 }], sandspire: ['scavenger', { gearTier: 2 }], 'dust-trail': ['glass-scorpion', { gearTier: 2 }], 'deep-shaft': ['brask', { gearTier: 2 }], 'glass-heart': ['kharzul', {}], 'glass-flats': ['mirage-wisp', { gearTier: 2 }], miragewell: ['wisp-queen', {}], scorchgate: ['ash-wight', { gearTier: 2 }], 'scorchgate-vaults': ['ashen-warden', {}] };
  for (const key of SUN_SCENES) {
    const B = BACKDROPS[key] || {};
    const s = section('sun-scene-' + key, `${B.name || '?'} (${key})`, 'renderBackdrop(key, { w: 160, h: 96, t }) at 3x at two times, then dark (the dark: true a Deep Shaft or Vault fight gets), a mock-up with a foe and the party on the floor band, a phone 120x104 frame, a wide 240x90 frame and the four parallax layers.');
    const r = row(s);
    fig(r, time('backdrop render', () => renderBackdrop(key, { t: 1.3 })), 3, 't=1.3');
    fig(r, renderBackdrop(key, { t: 2.9 }), 3, 't=2.9');
    const r2 = row(s);
    fig(r2, renderBackdrop(key, { t: 1.3, dark: true }), 2, 'dark');
    const bd = renderBackdrop(key, { t: 1, dark: key === 'deep-shaft' || key === 'scorchgate-vaults' }), c = document.createElement('canvas'); c.width = 160; c.height = 96; const g = c.getContext('2d'); g.putImageData(bd, 0, 0);
    const put = (img, x, y) => { const t2 = document.createElement('canvas'); t2.width = img.width; t2.height = img.height; t2.getContext('2d').putImageData(img, 0, 0); g.drawImage(t2, Math.round(x), Math.round(y)); };
    const [fk, fo] = foeFor[key], foe = renderFoe(fk, Object.assign({ t: .3 }, fo)), fa = foe.anchors.foot; put(foe, (foe.width > 64 ? 46 : 42) - fa[0], 86 - fa[1]);
    HEROES.forEach((k, i) => { const im = renderHero(k, undefined, { pose: 'idle', t: .2 + i }), a = im.anchors.foot; put(im, 106 + (i % 2) * 22 - a[0] + (i >> 1) * 10, 78 + (i >> 1) * 12 - a[1]); });
    const f = document.createElement('figure'); c.style.width = 160 * 2 * ZOOM + 'px'; c.style.height = 96 * 2 * ZOOM + 'px'; f.appendChild(c); const fc = document.createElement('figcaption'); fc.textContent = 'mock-up'; f.appendChild(fc); r2.appendChild(f);
    fig(r2, renderBackdrop(key, { w: 120, h: 104, t: .7 }), 2, '120x104 (phone)');
    const r3 = row(s);
    fig(r3, renderBackdrop(key, { w: 240, h: 90, t: .7 }), 2, '240x90 (wide)');
    for (const L of backdropLayers(key).layers) fig(r3, L.img, 1, L.id + ' x' + L.parallax, '#302830');
  }
}
function sunRelics() {
  const s = section('sun-relics', 'Codex Page II: the fourteen Sunscorch relics (Nos. 25-38)', 'Card portrait at 64px (heirloom frame) at 3x, the 16px bag icon at 1x and 3x; then the 96px card, the unsighted silhouette, and each relic worn or held by a hero.');
  const r = row(s);
  for (const id of SUN_RELICS) {
    const f = document.createElement('figure'), wrap = document.createElement('div'); wrap.className = 'row';
    fig(wrap, time('relic portrait 64', () => itemPortrait(relicItem(id), { t: 1.3 })), 3);
    const col = document.createElement('div'); col.style.display = 'flex'; col.style.flexDirection = 'column'; col.style.gap = '6px';
    const ic = time('relic icon 16', () => itemIcon(relicItem(id))); fig(col, ic, 1, '', '#211a16'); fig(col, ic, 3, '', '#211a16');
    wrap.appendChild(col); f.appendChild(wrap); const fc = document.createElement('figcaption'); fc.textContent = `${id} · ${RELIC_ART[id].r} · ${RELIC_ART[id].aspect}`; f.appendChild(fc); r.appendChild(f);
  }
  const r2 = row(s, 'card size 96px (2x), and unsighted (develop 0)');
  for (const id of SUN_RELICS) fig(r2, itemPortrait(relicItem(id), { t: 2.1, size: 96 }), 2, id);
  const r3 = row(s); for (const id of SUN_RELICS) fig(r3, itemPortrait(relicItem(id), { develop: 0, reduced: true }), 1.5, id);
  const kits = [['warden', { weapon: 'cinderfang', offhand: 'ashen-aegis', head: 'cinder-crown', body: 'glass-carapace', feet: 'sandwalkers', ring: 'scorchgate-key' }], ['pip', { weapon: 'saltglass', amulet: 'mirage-glass', ring: 'qasims-signet' }], ['bryn', { weapon: 'dunebreaker', offhand: 'wyrmscale', amulet: 'zaras-orrery' }], ['alondra', { weapon: 'cinderfang', offhand: 'sunstone-lantern', amulet: 'sunstone-heart' }]];
  for (const [hero, gear] of kits) { const rr = row(s, hero + ': ' + Object.values(gear).join(', ')); for (const [pose, t] of [['idle', 0], ['attack', .1], ['attack', .62], ['cast', .3], ['guard', 0], ['hurt', 0]]) fig(rr, renderHero(hero, gear, { pose, t }), 2, pose, '#1e1812'); }
}
function sunForge() {
  const s = section('sun-forge', 'Hilda\'s forge on the art: temper +0 to +10, gems in sockets, Kindled and Awakened', 'Each row is one item. 64px portrait at 2x, the 16px icon at 2x, and the hero sprite wearing it (gear passed as itemArt() objects, as the UI should: see notes/P6-art-battle.md). +1 to +3 are the M3 looks, unchanged.');
  const items = [['Cinderfang', relicItem('cinderfang'), 'warden', 'weapon'], ['runed longsword, frost', { uid: 'b', base: 'longsword', kind: 'sword', rarity: 'runed', aspect: 'frost', seed: 12, gems: [] }, 'warden', 'weapon'], ['the Ashen Aegis', relicItem('ashen-aegis'), 'warden', 'offhand'], ['storied plate, storm', { uid: 'd', base: 'full-plate', kind: 'plate', rarity: 'storied', aspect: 'storm', seed: 3, gems: [] }, 'warden', 'body'], ['Saltglass', relicItem('saltglass'), 'pip', 'weapon'], ['wrought leather jerkin', { uid: 'e', kind: 'leather', rarity: 'wrought', seed: 9, gems: [] }, 'pip', 'body']];
  for (const [label, base, hero, slot] of items) {
    const r = row(s, label + ': temper 0..10');
    for (let n = 0; n <= TEMPER_MAX; n++) { const it = Object.assign({}, base, { temper: n }), f = document.createElement('figure'); fig(f, time('forge portrait 64', () => itemPortrait(it, { t: 1.3 + n * .2 })), 2, '+' + n); r.appendChild(f); }
    const r2 = row(s);
    for (const n of [0, 4, 7, 10]) { const it = Object.assign({}, base, { temper: n }); fig(r2, itemIcon(it), 2, 'icon +' + n, '#211a16'); fig(r2, renderHero(hero, { [slot]: itemArt(it) }, { pose: slot === 'weapon' ? 'attack' : 'idle', t: slot === 'weapon' ? .62 : .1 }), 2, 'hero +' + n, '#1e1812'); }
    const r3 = row(s, label + ': gems, Kindled, Awakened (the Hand, the Heart)');
    const states = [['1 gem', { gems: ['sunstone'] }], ['2 gems', { gems: ['moss-agate', 'ash-garnet'] }], ['glass pearl', { gems: [null, 'glass-pearl'] }], ['kindled', { deeds: { 'first-blood': 3 } }], ['awakened a', { deeds: { 'first-blood': 3 }, awakened: 'a' }], ['awakened b', { deeds: { 'first-blood': 3 }, awakened: 'b' }], ['b +7 2 gems', { deeds: { x: 1 }, awakened: 'b', temper: 7, gems: ['sunstone', 'glass-pearl'] }]];
    for (const [cap, o] of states) { const it = Object.assign({}, base, o); fig(r3, time('forge portrait 64', () => itemPortrait(it, { t: 1.7 })), 2, cap); }
    const r4 = row(s);
    for (const [cap, o] of states) { const it = Object.assign({}, base, o); fig(r4, renderHero(hero, { [slot]: itemArt(it) }, { pose: slot === 'weapon' ? 'attack' : 'idle', t: slot === 'weapon' ? .62 : .1 }), 2, 'hero ' + cap, '#1e1812'); }
  }
  const r5 = row(s, 'the 96px card: Cinderfang plain, +10, 2 gems, Sunmarrow (a), Glassline (b)');
  for (const o of [{}, { temper: 10 }, { gems: ['sunstone', 'ash-garnet'] }, { deeds: { x: 1 }, awakened: 'a' }, { deeds: { x: 1 }, awakened: 'b' }]) fig(r5, itemPortrait(relicItem('cinderfang', o), { t: 2.3, size: 96 }), 2, JSON.stringify(o));
}
function sunIcons() {
  const s = section('sun-icons', 'M4 icons: the Sunscorch locks and their keys, the four gems, the three materials', 'lockIcon, keyIcon (the locks\' Domain keys: Craft, Knowledge, Survival, and a relic power), gemIcon, materialIcon. 12px at 4x and 1x, 24px at 2x; dim locks.');
  const block = (r, a, cap) => { const f = document.createElement('figure'), w = document.createElement('div'); w.className = 'row'; fig(w, a(12), 4); fig(w, a(12), 1); fig(w, a(24), 2); f.appendChild(w); const fc = document.createElement('figcaption'); fc.textContent = cap; f.appendChild(fc); r.appendChild(f); };
  const r = row(s, 'locks'); for (const k of ['dune-glass', 'mirage', 'quicksand', 'vault-seal']) { block(r, n => lockIcon(k, { size: n }), k); block(r, n => lockIcon(k, { size: n, dim: true }), k + ' dim'); }
  const r2 = row(s, 'their keys'); for (const k of ['power', 'craft', 'knowledge', 'survival']) block(r2, n => keyIcon(k, { size: n }), k);
  const r3 = row(s, 'gems'); for (const k of GEM_ICON_KEYS) block(r3, n => gemIcon(k, { size: n }), k);
  const r4 = row(s, 'materials'); for (const k of MATERIAL_ICON_KEYS) block(r4, n => materialIcon(k, { size: n }), k);
}
function sunPerf() {
  const s = section('sun-perf', 'Render cost of the M4 foes, backdrops and relics', 'cold = a new pose raster plus compose (median of 3); warm = a cached raster re-composed for a new t (median of 24). Backdrop cold = first paint of a new size. Shared machine: noisy.');
  const pre = document.createElement('pre'); s.appendChild(pre);
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1], lines = [];
  for (const key of ['rotwarden', 'briarmaw', 'tallyman'].concat(SUN_HUM, SUN_NAMED, SUN_BEASTS, SUN_BEARERS, SUN_CHAMPS)) {
    const c = [], w = [];
    ['hurt', 'ko', 'attack'].forEach((pose, k) => { const t0 = performance.now(); renderFoe(key, { pose, t: .6, flip: true, gearTier: k, phase: k + 1 }); c.push(performance.now() - t0); });
    for (let k = 0; k < 24; k++) { const t0 = performance.now(); renderFoe(key, { t: k / 12 * .1 + (k % 2) * .05, gearTier: 1 }); w.push(performance.now() - t0); }
    T['cold ' + key] = med(c); T['warm ' + key] = med(w);
    lines.push(`${key.padEnd(16)} ${FOE_ART[key].kind === 'humanoid' ? '64x64' : FOE_ART[key].w + 'x' + FOE_ART[key].h}  cold ${med(c).toFixed(1).padStart(6)} ms   warm ${med(w).toFixed(2).padStart(6)} ms`);
  }
  for (const key of ['hearth-road', 'heartroot'].concat(SUN_SCENES)) { const t0 = performance.now(); renderBackdrop(key, { w: 161, h: 97, t: 1 }); const c = performance.now() - t0; const t1 = performance.now(); for (let k = 0; k < 10; k++) renderBackdrop(key, { w: 161, h: 97, t: k * .3 }); T['backdrop ' + key] = c; lines.push(`${('backdrop ' + key).padEnd(28)} cold ${c.toFixed(1).padStart(6)} ms   warm ${((performance.now() - t1) / 10).toFixed(2).padStart(6)} ms`); }
  for (const id of ['hearthbrand', 'vale-gauntlets'].concat(SUN_RELICS)) { const it = relicItem(id, { kind: RELIC_KIND[id] || 'sword', seed: 3 }); const t0 = performance.now(); itemPortrait(Object.assign({}, it, { temper: 7, gems: ['sunstone'] }), { t: 1 }); const c = performance.now() - t0; const t1 = performance.now(); for (let k = 0; k < 10; k++) itemPortrait(Object.assign({}, it, { temper: 7, gems: ['sunstone'] }), { t: k * .3 }); lines.push(`${('relic ' + id).padEnd(28)} cold ${c.toFixed(1).padStart(6)} ms   warm ${((performance.now() - t1) / 10).toFixed(2).padStart(6)} ms`); }
  pre.textContent = lines.join('\n');
}
function sunCheck() {
  const s = section('sun-check', 'Render check: the Sunscorch foes, every pose, phase, gear tier and piece', 'Every M4 key renders every pose at every gear tier and phase, flipped, reduced and tinted, with its relic held, disarmed and absent; the Champions show one glint per piece they still hold.');
  let n = 0; const fails = [], t0 = performance.now();
  const fin = p => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
  const check = (key, o, test) => { let img; try { img = renderFoe(key, o); n++; } catch (e) { fails.push(`${key} ${JSON.stringify(o)}: threw ${e.message}`); return; } const a = img.anchors; for (const k of ['foot', 'head', 'center']) if (!fin(a[k])) fails.push(`${key} ${JSON.stringify(o)}: anchor ${k}`); if (test) { const m = test(img, a); if (m) fails.push(`${key} ${JSON.stringify(o)}: ${m}`); } };
  const poses = [['idle', 0], ['idle', .7], ['attack', .1], ['attack', .6], ['hurt', 0], ['ko', 0]];
  for (const key of SUN_HUM.concat(SUN_NAMED, SUN_BEASTS, SUN_BEARERS, SUN_CHAMPS)) {
    for (const [pose, t] of poses) for (let gT = 0; gT < 4; gT++) check(key, { pose, t, gearTier: gT });
    for (const [pose, t] of poses) for (const phase of [2, 3]) check(key, { pose, t, phase });
    for (const [pose, t] of [['idle', 0], ['attack', .6]]) { check(key, { pose, t, flip: true }); check(key, { pose, t, reduced: true }); check(key, { pose, t, tint: [255, 255, 255, .8] }); check(key, { pose, t, relic: null }); check(key, { pose, t, relicHeld: false }); }
    if (FOE_ART[key].relic && !FOE_ART[key].relics) for (const [pose, t] of poses) check(key, { pose, t }, (img, a) => (pose !== 'ko' && !a.relic ? 'no relic glint anchor' : null));
  }
  for (const key of SUN_CHAMPS) { const P = FOE_ART[key].relics; for (const broken of [[], [P[0]], [P[1]], P.slice()]) for (const phase of [1, 2, 3]) for (const [pose, t] of poses) check(key, { phase, pose, t, broken }, (img, a) => ((a.relics || []).length !== 2 - broken.length ? `expected ${2 - broken.length} glints, got ${(a.relics || []).length}` : null)); }
  for (const relic of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) for (const [pose, t] of poses) check('tamsin', { relic, pose, t, gearTier: 4 });
  T['sun check renders'] = n; T['sun check failures'] = fails.length;
  for (const f of fails.slice(0, 20)) console.error('sun check: ' + f);
  const pre = document.createElement('pre'); pre.textContent = `${n} renders, ${fails.length} failures, ${(performance.now() - t0).toFixed(0)} ms` + (fails.length ? '\n' + fails.slice(0, 40).join('\n') : ''); s.appendChild(pre);
}
if (wantSun('sun-lineup')) sunLineup();
if (wantSun('sun-humanoids')) sunHumanoids();
if (wantSun('sun-named')) sunNamed();
if (wantSun('sun-tamsin')) sunTamsin();
if (wantSun('sun-beasts')) sunBeasts();
if (wantSun('sun-bearers')) sunBearers();
if (wantSun('sun-kharzul')) sunChampion('sun-kharzul', 'kharzul', 'Kharzul the Glass Scorpion: phases 1-3, the pieces, poses', 'renderFoe(\'kharzul\', { phase, broken, pose, t }) at 96x96, 2x. Cinderfang in its tail and the Glass Carapace on its back, each gone once snapped off (broken: [relicId]). Phase 2 has burrowed (sand to the knees), phase 3 is the Glass Storm.');
if (wantSun('sun-warden')) sunChampion('sun-warden', 'ashen-warden', 'The Ashen Warden: phases 1-3, the pieces, poses', 'renderFoe(\'ashen-warden\', { phase, broken, pose, t }) at 96x96, 2x. The Ashen Aegis on its arm and the Cinder Crown on its brow, each gone once snapped off. Phase 2: the ash rises; phase 3: the Crown burns white.');
if (wantSun('sun-scenes')) sunScenes();
if (wantSun('sun-relics')) sunRelics();
if (wantSun('sun-forge')) sunForge();
if (wantSun('sun-icons')) sunIcons();
if (wantSun('sun-perf')) sunPerf();
if (wantSun('sun-check')) sunCheck();
/* =====================================================================
   M5 (P6): the Ironspire foes, backdrops, relics, the Frost Opal and the new locks. Each section is its own function.
   ===================================================================== */
const IRON = only && only.split(',').some(k => k === 'iron' || k.startsWith('iron-'));
const wantIron = id => IRON && (only.split(',').includes('iron') || only.split(',').includes(id));
const IRON_HUM = ['brigand', 'sawyer'];
const IRON_NAMED = ['rhune', 'cutter-chief'];
const IRON_BEASTS = ['rime-wolf', 'rockling', 'forge-spark', 'iron-sentinel', 'forgeborn', 'bellows', 'peak-troll', 'rime-wraith', 'choir-wraith'];
const IRON_BEARERS = ['sentinel-captain', 'journeyman', 'old-horn', 'drowned-abbess', 'thunder-roc'];
const IRON_CHAMPS = ['mother-anvil', 'rime-abbot'];
const IRON_SCENES = ['rockslide-pass', 'peaks-veil', 'highfold', 'iron-stair', 'ironhold', 'ironhold-deeps', 'harrows-forge', 'stormwatch', 'frost-road', 'frostmere', 'frostmere-below'];
const IRON_DARK = ['ironhold-deeps', 'frostmere-below'];
const IRON_RELICS = ['windstep-boots', 'veilbell', 'ironwall', 'drowned-censer', 'ironvein-bracers', 'roc-feather-cloak', 'thanes-rune', 'trollhide-mantle', 'runestaff', 'anvil-heart', 'worldforge-hammer', 'cutters-pick', 'rime-crozier', 'hushweave-cowl'];
const ironItem = (id, o = {}) => Object.assign({ uid: id, base: id, kind: RELICS[id].kind, rarity: 'heirloom', aspect: RELIC_ART[id].aspect, seed: 1, temper: 0, gems: [] }, o);

function ironLineup() {
  const s = section('iron-lineup', 'M5 lineup: every Ironspire foe, feet on one floor', 'renderFoe(key, { pose: "idle", gearTier: 3 }) (players reach the Ironspire at Waking 4, so the gear tier is capped at 3), 2x; then the bearers, and the Champions beside the Sunscorch ones.');
  const at = (k, o = {}) => ({ img: renderFoe(k, Object.assign({ t: .3, gearTier: 3 }, o)), label: k });
  stage(row(s, 'humanoids and named holders, gearTier 3, 2x'), IRON_HUM.concat(IRON_NAMED).map(k => at(k)), { h: 72 });
  stage(row(s, 'beasts, 2x'), IRON_BEASTS.map(k => at(k)), { h: 84 });
  stage(row(s, 'relic-bearers, 2x'), IRON_BEARERS.map(k => at(k)), { h: 104 });
  stage(row(s, 'the Champions, 2x, with Kharzul and the Ashen Warden'), [at('kharzul'), at('ashen-warden'), at('mother-anvil'), at('rime-abbot')], { h: 104 });
  stage(row(s, 'gearTier 0 (a first visit at a low Waking), 2x'), IRON_HUM.concat(IRON_NAMED, IRON_BEASTS).map(k => at(k, { gearTier: 0 })), { h: 84 });
}
function ironNamed() {
  const s = section('iron-named', 'Named holders: Rhune the Pass-Warden (the Windstep Boots) and the Cutter-Chief (the Cutter\'s Pick)', 'Every pose at gearTier 3, the four gear tiers, the glint and disarmed. 3x.');
  for (const key of IRON_NAMED) {
    const r = row(s, `${name(key)} (${FOE_ART[key].relic} -> ${relicSlot(FOE_ART[key].relic) || '-'})`);
    for (const [pose, t] of POSES) fig(r, time(`foe ${key} render`, () => renderFoe(key, { gearTier: 3, pose, t })), 3, `${pose} ${t}`, BG);
    const r2 = row(s);
    for (let gT = 0; gT < 4; gT++) fig(r2, renderFoe(key, { gearTier: gT, t: .2 }), 3, `gearTier ${gT}`, BG);
    fig(r2, renderFoe(key, { gearTier: 3, t: 0 }), 3, 'glint t=0', BG);
    fig(r2, renderFoe(key, { gearTier: 3, relicHeld: false }), 3, 'disarmed', BG); fig(r2, renderFoe(key, { gearTier: 3, relicHeld: false, pose: 'attack', t: .6 }), 3, 'disarmed attack', BG);
  }
}
function ironBearers() {
  const s = section('iron-bearers', 'Relic-bearers: the Sentinel-Captain, Harrow\'s Journeyman, Old Horn, the Drowned Abbess, the Thunder-Roc', 'Every pose at gearTier 0 and 3, the relic glint over time, and relicHeld:false. The relic is drawn from its own recipe. 3x (the Roc 2x).');
  for (const key of IRON_BEARERS) {
    const sc = FOE_ART[key].w > 80 ? 2 : 3;
    for (const gT of [0, 3]) { const r = row(s, `${name(key)} gearTier ${gT}`); for (const [pose, t] of POSES) fig(r, time(`foe ${key} render`, () => renderFoe(key, { gearTier: gT, pose, t })), sc, `${pose} ${t}`, BG); }
    const r = row(s, `${name(key)}: glint, disarmed (relic ${FOE_ART[key].relic})`);
    for (const t of [0, .1, 1.5]) fig(r, renderFoe(key, { t, gearTier: 3 }), sc, `t=${t}`, BG);
    fig(r, renderFoe(key, { relicHeld: false, gearTier: 3 }), sc, 'relicHeld:false', BG);
    fig(r, renderFoe(key, { relicHeld: false, gearTier: 3, pose: 'attack', t: .6 }), sc, 'disarmed attack', BG);
  }
}
function ironScenes() {
  const HEROES = ['warden', 'pip', 'bryn', 'alondra'];
  const foeFor = { 'rockslide-pass': ['rhune', { gearTier: 3 }], 'peaks-veil': ['brigand', { gearTier: 3 }], highfold: ['thunder-roc', {}], 'iron-stair': ['iron-sentinel', { gearTier: 3 }], ironhold: ['sentinel-captain', { gearTier: 3 }], 'ironhold-deeps': ['bellows', { gearTier: 3 }], 'harrows-forge': ['mother-anvil', {}], stormwatch: ['brigand', { gearTier: 3 }], 'frost-road': ['cutter-chief', { gearTier: 3 }], frostmere: ['drowned-abbess', { gearTier: 3 }], 'frostmere-below': ['rime-abbot', {}] };
  for (const key of IRON_SCENES) {
    const B = BACKDROPS[key] || {}, dk = IRON_DARK.includes(key);
    const s = section('iron-scene-' + key, `${B.name || '?'} (${key})`, `renderBackdrop(key, { w: 160, h: 96, t }) at 3x at two times, then dark${dk ? ' (the dark: true its fights get, listed as ' + key + ':dark)' : ''}, a mock-up with a foe and the party on the floor band, a phone 120x104 frame, a wide 240x90 frame and the four parallax layers.`);
    const r = row(s);
    fig(r, time('backdrop render', () => renderBackdrop(key, { t: 1.3 })), 3, 't=1.3');
    fig(r, renderBackdrop(key, { t: 2.9 }), 3, 't=2.9');
    const r2 = row(s);
    fig(r2, renderBackdrop(key, { t: 1.3, dark: true }), 2, 'dark');
    const bd = renderBackdrop(key, { t: 1, dark: dk }), c = document.createElement('canvas'); c.width = 160; c.height = 96; const g = c.getContext('2d'); g.putImageData(bd, 0, 0);
    const put = (img, x, y) => { const t2 = document.createElement('canvas'); t2.width = img.width; t2.height = img.height; t2.getContext('2d').putImageData(img, 0, 0); g.drawImage(t2, Math.round(x), Math.round(y)); };
    const [fk, fo] = foeFor[key], foe = renderFoe(fk, Object.assign({ t: .3 }, fo)), fa = foe.anchors.foot; put(foe, (foe.width > 64 ? 46 : 42) - fa[0], 86 - fa[1]);
    HEROES.forEach((k, i) => { const im = renderHero(k, undefined, { pose: 'idle', t: .2 + i }), a = im.anchors.foot; put(im, 106 + (i % 2) * 22 - a[0] + (i >> 1) * 10, 78 + (i >> 1) * 12 - a[1]); });
    const f = document.createElement('figure'); c.style.width = 160 * 2 * ZOOM + 'px'; c.style.height = 96 * 2 * ZOOM + 'px'; f.appendChild(c); const fc = document.createElement('figcaption'); fc.textContent = 'mock-up'; f.appendChild(fc); r2.appendChild(f);
    fig(r2, renderBackdrop(key, { w: 120, h: 104, t: .7 }), 2, '120x104 (phone)');
    const r3 = row(s);
    fig(r3, renderBackdrop(key, { w: 240, h: 90, t: .7 }), 2, '240x90 (wide)');
    for (const L of backdropLayers(key).layers) fig(r3, L.img, 1, L.id + ' x' + L.parallax, '#302830');
  }
}
function ironRelics() {
  const s = section('iron-relics', 'Codex Page III: the fourteen Ironspire relics (Nos. 39-52)', 'Card portrait at 64px (heirloom frame) at 3x, the 16px bag icon at 1x and 3x; then the 96px card, the unsighted silhouette, each relic worn or held by a hero, and the forge\'s looks.');
  const r = row(s);
  for (const id of IRON_RELICS) {
    const f = document.createElement('figure'), wrap = document.createElement('div'); wrap.className = 'row';
    fig(wrap, time('relic portrait 64', () => itemPortrait(ironItem(id), { t: 1.3 })), 3);
    const col = document.createElement('div'); col.style.display = 'flex'; col.style.flexDirection = 'column'; col.style.gap = '6px';
    const ic = time('relic icon 16', () => itemIcon(ironItem(id))); fig(col, ic, 1, '', '#211a16'); fig(col, ic, 3, '', '#211a16');
    wrap.appendChild(col); f.appendChild(wrap); const fc = document.createElement('figcaption'); fc.textContent = `${id} · ${RELIC_ART[id].r} · ${RELIC_ART[id].aspect}`; f.appendChild(fc); r.appendChild(f);
  }
  const r2 = row(s, 'card size 96px (2x), and unsighted (develop 0)');
  for (const id of IRON_RELICS) fig(r2, itemPortrait(ironItem(id), { t: 2.1, size: 96 }), 2, id);
  const r3 = row(s); for (const id of IRON_RELICS) fig(r3, itemPortrait(ironItem(id), { develop: 0, reduced: true }), 1.5, id);
  const kits = [['warden', { weapon: 'worldforge-hammer', offhand: 'ironwall', head: 'hushweave-cowl', body: 'trollhide-mantle', feet: 'windstep-boots', hands: 'ironvein-bracers', ring: 'thanes-rune' }], ['pip', { weapon: 'cutters-pick', body: 'roc-feather-cloak', amulet: 'veilbell' }], ['bryn', { weapon: 'runestaff', offhand: 'drowned-censer', amulet: 'anvil-heart' }], ['alondra', { weapon: 'rime-crozier', head: 'hushweave-cowl', body: 'roc-feather-cloak' }]];
  for (const [hero, gear] of kits) { const rr = row(s, hero + ': ' + Object.values(gear).join(', ')); for (const [pose, t] of [['idle', 0], ['attack', .1], ['attack', .62], ['cast', .3], ['guard', 0], ['hurt', 0]]) fig(rr, renderHero(hero, gear, { pose, t }), 2, pose, '#1e1812'); }
  const states = [['plain', {}], ['+4', { temper: 4 }], ['+7', { temper: 7 }], ['+10', { temper: 10 }], ['frost opal + sunstone', { gems: ['frost-opal', 'sunstone'] }], ['kindled', { deeds: { x: 1 } }], ['awakened a', { deeds: { x: 1 }, awakened: 'a' }], ['awakened b', { deeds: { x: 1 }, awakened: 'b' }]];
  for (const id of IRON_RELICS) { const rr = row(s, id + ': the forge'); for (const [cap, o] of states) fig(rr, time('forge portrait 64', () => itemPortrait(ironItem(id, o), { t: 1.7 })), 2, cap); }
}
function ironIcons() {
  const s = section('iron-icons', 'M5 icons: the Ironspire locks, the Frost Opal, the new statuses', 'lockIcon (chasm, ice, rune-seal, drift), gemIcon(\'frost-opal\') and statusIcon (burrowed, swallowed, charmed). 12px at 4x and 1x, 24px at 2x; dim locks.');
  const block = (r, a, cap) => { const f = document.createElement('figure'), w = document.createElement('div'); w.className = 'row'; fig(w, a(12), 4); fig(w, a(12), 1); fig(w, a(24), 2); f.appendChild(w); const fc = document.createElement('figcaption'); fc.textContent = cap; f.appendChild(fc); r.appendChild(f); };
  const r = row(s, 'locks'); for (const k of ['chasm', 'ice', 'rune-seal', 'drift']) { block(r, n => lockIcon(k, { size: n }), k); block(r, n => lockIcon(k, { size: n, dim: true }), k + ' dim'); }
  const r2 = row(s, 'gems'); for (const k of GEM_ICON_KEYS) block(r2, n => gemIcon(k, { size: n }), k);
  const r3 = row(s, 'the Ironspire statuses (the neutral token last, for comparison)'); for (const k of ['burrowed', 'swallowed', 'charmed', 'no-such-status']) block(r3, n => statusIcon(k, { size: n }), k);
}
function ironPerf() {
  const s = section('iron-perf', 'Render cost of the M5 foes, backdrops and relics', 'cold = a new pose raster plus compose (median of 3); warm = a cached raster re-composed for a new t (median of 24). Backdrop cold = first paint of a new size. Shared machine: noisy.');
  const pre = document.createElement('pre'); s.appendChild(pre);
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1], lines = [];
  for (const key of ['kharzul', 'ashen-warden'].concat(IRON_HUM, IRON_NAMED, IRON_BEASTS, IRON_BEARERS, IRON_CHAMPS)) {
    const c = [], w = [];
    ['hurt', 'ko', 'attack'].forEach((pose, k) => { const t0 = performance.now(); renderFoe(key, { pose, t: .6, flip: true, gearTier: k, phase: k + 1 }); c.push(performance.now() - t0); });
    for (let k = 0; k < 24; k++) { const t0 = performance.now(); renderFoe(key, { t: k / 12 * .1 + (k % 2) * .05, gearTier: 1 }); w.push(performance.now() - t0); }
    T['cold ' + key] = med(c); T['warm ' + key] = med(w);
    lines.push(`${key.padEnd(18)} ${FOE_ART[key].kind === 'humanoid' ? '64x64' : FOE_ART[key].w + 'x' + FOE_ART[key].h}  cold ${med(c).toFixed(1).padStart(6)} ms   warm ${med(w).toFixed(2).padStart(6)} ms`);
  }
  for (const key of IRON_SCENES.concat(IRON_DARK.map(k => k + ':dark'))) { const t0 = performance.now(); renderBackdrop(key, { w: 161, h: 97, t: 1 }); const c = performance.now() - t0; const t1 = performance.now(); for (let k = 0; k < 10; k++) renderBackdrop(key, { w: 161, h: 97, t: k * .3 }); T['backdrop ' + key] = c; lines.push(`${('backdrop ' + key).padEnd(30)} cold ${c.toFixed(1).padStart(6)} ms   warm ${((performance.now() - t1) / 10).toFixed(2).padStart(6)} ms`); }
  for (const id of IRON_RELICS) { const it = ironItem(id, { seed: 3 }); const t0 = performance.now(); itemPortrait(Object.assign({}, it, { temper: 7, gems: ['frost-opal'] }), { t: 1 }); const c = performance.now() - t0; const t1 = performance.now(); for (let k = 0; k < 10; k++) itemPortrait(Object.assign({}, it, { temper: 7, gems: ['frost-opal'] }), { t: k * .3 }); lines.push(`${('relic ' + id).padEnd(30)} cold ${c.toFixed(1).padStart(6)} ms   warm ${((performance.now() - t1) / 10).toFixed(2).padStart(6)} ms`); }
  pre.textContent = lines.join('\n');
}
function ironCheck() {
  const s = section('iron-check', 'Render check: the Ironspire foes, every pose, phase, gear tier and piece', 'Every M5 key renders every pose at every gear tier and phase, flipped, reduced and tinted, with its relic held, disarmed and absent; relic glints sit on the canvas; the Champions show one glint per piece they still hold; attack frames stay inside the canvas.');
  let n = 0; const fails = [], t0 = performance.now();
  const fin = p => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
  const onCanvas = (img, p) => p[0] >= 0 && p[1] >= 0 && p[0] < img.width && p[1] < img.height;
  const check = (key, o, test) => { let img; try { img = renderFoe(key, o); n++; } catch (e) { fails.push(`${key} ${JSON.stringify(o)}: threw ${e.message}`); return; } const a = img.anchors; for (const k of ['foot', 'head', 'center']) if (!fin(a[k])) fails.push(`${key} ${JSON.stringify(o)}: anchor ${k}`); for (const p of (a.relics || []).concat(a.relic ? [a.relic] : [])) if (!fin(p) || !onCanvas(img, p)) fails.push(`${key} ${JSON.stringify(o)}: a relic glint off the canvas`); if (test) { const m = test(img, a); if (m) fails.push(`${key} ${JSON.stringify(o)}: ${m}`); } };
  const poses = [['idle', 0], ['idle', .7], ['attack', .1], ['attack', .6], ['hurt', 0], ['ko', 0]];
  const edges = img => { const { width: w, height: h, data: d } = img; let e = 0; for (let y = 0; y < h; y++) { if (d[(y * w) * 4 + 3] > 40) e++; if (d[(y * w + w - 1) * 4 + 3] > 40) e++; } for (let x = 0; x < w; x++) if (d[x * 4 + 3] > 40) e++; return e; };
  for (const key of IRON_HUM.concat(IRON_NAMED, IRON_BEASTS, IRON_BEARERS, IRON_CHAMPS)) {
    const beast = FOE_ART[key].kind !== 'humanoid';
    for (const [pose, t] of poses) for (let gT = 0; gT < 4; gT++) check(key, { pose, t, gearTier: gT }, img => (beast && edges(img) > 0 ? 'touches the canvas edge' : null));
    for (const [pose, t] of poses) for (const phase of [2, 3]) check(key, { pose, t, phase });
    for (const [pose, t] of [['idle', 0], ['attack', .6]]) { check(key, { pose, t, flip: true }); check(key, { pose, t, reduced: true }); check(key, { pose, t, tint: [255, 255, 255, .8] }); check(key, { pose, t, relic: null }); check(key, { pose, t, relicHeld: false }); }
    if (FOE_ART[key].relic && !FOE_ART[key].relics) for (const [pose, t] of poses) check(key, { pose, t }, (img, a) => (pose !== 'ko' && !a.relic ? 'no relic glint anchor' : null));
  }
  for (const key of IRON_CHAMPS) { const P = FOE_ART[key].relics; for (const broken of [[], [P[0]], [P[1]], P.slice()]) for (const phase of [1, 2, 3]) for (const [pose, t] of poses) check(key, { phase, pose, t, broken }, (img, a) => ((a.relics || []).length !== 2 - broken.length ? `expected ${2 - broken.length} glints, got ${(a.relics || []).length}` : null)); }
  T['iron check renders'] = n; T['iron check failures'] = fails.length;
  for (const f of fails.slice(0, 20)) console.error('iron check: ' + f);
  const pre = document.createElement('pre'); pre.textContent = `${n} renders, ${fails.length} failures, ${(performance.now() - t0).toFixed(0)} ms` + (fails.length ? '\n' + fails.slice(0, 40).join('\n') : ''); s.appendChild(pre);
}
if (wantIron('iron-lineup')) ironLineup();
if (wantIron('iron-humanoids')) { const s = section('iron-humanoids', 'Ironspire humanoid families: gearTier 0-3, every pose', 'Pass Brigands (Stormwatch deserters) and the Sawyer (one end of the ice saw). 64x64 at 3x.'); for (const key of IRON_HUM) sunPoses(s, key); }
if (wantIron('iron-named')) ironNamed();
if (wantIron('iron-beasts')) { const s = section('iron-beasts', 'Ironspire beasts and constructs: gearTier 0-3, every pose', 'Rime Wolf 64x48, Rockling 48x48, Forge-Spark 40x40, Iron Sentinel 64x64, Forgeborn 64x64, the Bellows 72x72, Peak-Troll 72x72, Rime-Wraith and Choir-Wraith 64x64. 3x.'); for (const key of IRON_BEASTS) sunPoses(s, key); }
if (wantIron('iron-bearers')) ironBearers();
if (wantIron('iron-anvil')) sunChampion('iron-anvil', 'mother-anvil', 'Mother Anvil: phases 1-3, the pieces, poses', 'renderFoe(\'mother-anvil\', { phase, broken, pose, t }) at 96x96, 2x. The Worldforge Hammer in her arm and the Anvil Heart in the cage at her waist, both from their relics\' recipes, each gone once snapped off. Quench (2): steam and blue temper; the Last Strike (3): the Heart white through the ribs, her cracks alight.');
if (wantIron('iron-abbot')) sunChampion('iron-abbot', 'rime-abbot', 'The Rime-Abbot: phases 1-3, the pieces, poses', 'renderFoe(\'rime-abbot\', { phase, broken, pose, t }) at 96x96, 2x. The Rime Crozier in his hand and the Hushweave Cowl on his head, both from their relics\' recipes, each gone once snapped off (his bare tonsured head; a jag of ice in his fist). Compline (2): he sings; Hush (3): violet light up through the ice.');
if (wantIron('iron-scenes')) ironScenes();
if (wantIron('iron-relics')) ironRelics();
if (wantIron('iron-icons')) ironIcons();
if (wantIron('iron-perf')) ironPerf();
if (wantIron('iron-check')) ironCheck();

/* =====================================================================
   M6 (P6): the Gloomfen foes, the Champions, backdrops, relics and icons. Each section is its own function.
   ===================================================================== */
const GLOOM = only && only.split(',').some(k => k === 'gloom' || k.startsWith('gloom-'));
const wantGloom = id => GLOOM && (only.split(',').includes('gloom') || only.split(',').includes(id));
const GLOOM_HUM = ['bog-hag', 'reedcutter', 'salvage-diver', 'bargehand'];
const GLOOM_NAMED = ['mother-grue', 'hodge', 'salvage-master', 'bargemaster'];
const GLOOM_BEASTS = ['mire-leech', 'marsh-light', 'lamp-moth', 'blackwater-gar', 'willow-wight', 'drowned', 'bell-ringer', 'drowned-choir'];
const GLOOM_BEARERS = ['old-jaws', 'grandfather-willow', 'drowned-cantor'];
const GLOOM_CHAMPS = ['lantern-mother', 'blackwater-leviathan'];
const GLOOM_SCENES = ['murkway', 'willowmurk', 'rotbridge', 'bogmire', 'lanternfen', 'mothers-hollow', 'long-boardwalk', 'misthollow', 'drowned-belfry', 'blackwater-reach', 'tidal-flats', 'causeway'];
const GLOOM_DARK = ['mothers-hollow', 'drowned-belfry'];
const GLOOM_RELICS = ['unfair-toll', 'bogstriders', 'weeping-bow', 'willow-ward', 'hag-stone', 'lamplighters-lantern', 'mourning-veil', 'salvagers-helm', 'cantors-staff', 'gar-tooth', 'barge-gauntlets', 'corvus-harpoon', 'deep-pearl', 'hexbane-shawl'];
const gloomItem = (id, o = {}) => Object.assign({ uid: id, base: id, kind: RELICS[id].kind, rarity: 'heirloom', aspect: RELIC_ART[id].aspect, seed: 1, temper: 0, gems: [] }, o);

function gloomLineup() {
  const s = section('gloom-lineup', 'M6 lineup: every Gloomfen foe, feet on one floor', 'renderFoe(key, { pose: "idle", gearTier: 3 }) (the Waking players meet the Gloomfen at), 2x; then the bearers, and the Champions beside the Ironspire ones.');
  const at = (k, o = {}) => ({ img: renderFoe(k, Object.assign({ t: .3, gearTier: 3 }, o)), label: k });
  stage(row(s, 'humanoids and named holders, gearTier 3, 2x'), GLOOM_HUM.concat(GLOOM_NAMED).map(k => at(k)), { h: 72 });
  stage(row(s, 'beasts, 2x'), GLOOM_BEASTS.map(k => at(k)), { h: 84 });
  stage(row(s, 'relic-bearers, 2x'), GLOOM_BEARERS.map(k => at(k)), { h: 104 });
  stage(row(s, 'the Champions, 2x, with Mother Anvil and the Rime-Abbot'), [at('mother-anvil'), at('rime-abbot'), at('lantern-mother'), at('blackwater-leviathan')], { h: 104 });
  stage(row(s, 'gearTier 0, 2x'), GLOOM_HUM.concat(GLOOM_NAMED, GLOOM_BEASTS).map(k => at(k, { gearTier: 0 })), { h: 84 });
}
function gloomNamed() {
  const s = section('gloom-named', 'Named holders: Mother Grue (the Hag-Stone), Hodge (the Unfair Toll), the Salvage-Master (the Salvager\'s Helm), the Bargemaster (the Barge-Chain Gauntlets)', 'Every pose at gearTier 3, the four gear tiers, the glint and disarmed. Hodge sits down on his stool at 0 HP (the ko pose). 3x.');
  for (const key of GLOOM_NAMED) {
    const r = row(s, `${name(key)} (${FOE_ART[key].relic} -> ${relicSlot(FOE_ART[key].relic) || '-'})`);
    for (const [pose, t] of POSES) fig(r, time(`foe ${key} render`, () => renderFoe(key, { gearTier: 3, pose, t })), 3, `${pose} ${t}`, BG);
    const r2 = row(s);
    for (let gT = 0; gT < 4; gT++) fig(r2, renderFoe(key, { gearTier: gT, t: .2 }), 3, `gearTier ${gT}`, BG);
    fig(r2, renderFoe(key, { gearTier: 3, t: 0 }), 3, 'glint t=0', BG);
    fig(r2, renderFoe(key, { gearTier: 3, relicHeld: false }), 3, 'disarmed', BG); fig(r2, renderFoe(key, { gearTier: 3, relicHeld: false, pose: 'ko' }), 3, 'disarmed ko', BG);
  }
}
function gloomBearers() {
  const s = section('gloom-bearers', 'Relic-bearers: Old Jaws (the Gar\'s Tooth), Grandfather Willow (the Weeping Bow), the Drowned Cantor (the Cantor\'s Staff)', 'Every pose at gearTier 0 and 3, the relic glint over time, and relicHeld:false. The relic is drawn from its own recipe. 3x (96px ones 2x).');
  for (const key of GLOOM_BEARERS) {
    const sc = FOE_ART[key].w > 80 ? 2 : 3;
    for (const gT of [0, 3]) { const r = row(s, `${name(key)} gearTier ${gT}`); for (const [pose, t] of POSES) fig(r, time(`foe ${key} render`, () => renderFoe(key, { gearTier: gT, pose, t })), sc, `${pose} ${t}`, BG); }
    const r = row(s, `${name(key)}: glint, disarmed (relic ${FOE_ART[key].relic})`);
    for (const t of [0, .1, 1.5]) fig(r, renderFoe(key, { t, gearTier: 3 }), sc, `t=${t}`, BG);
    fig(r, renderFoe(key, { relicHeld: false, gearTier: 3 }), sc, 'relicHeld:false', BG);
    fig(r, renderFoe(key, { relicHeld: false, gearTier: 3, pose: 'attack', t: .6 }), sc, 'disarmed attack', BG);
  }
}
function gloomTamsin() {
  const s = section('gloom-tamsin', 'Tamsin on Rotbridge: gearTier 4, the lent starter, the Bogstriders she wears', 'renderFoe(\'tamsin\', { gearTier: 4, relic: <starter>, variant: <starter>, wears: \'bogstriders\', pose, t }); without the wears beside it. 3x.');
  for (const relic of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) {
    const r = row(s, relic);
    for (const [pose, t] of POSES) fig(r, renderFoe('tamsin', { gearTier: 4, relic, variant: relic, wears: 'bogstriders', pose, t }), 3, `${pose} ${t}`, BG);
    fig(r, renderFoe('tamsin', { gearTier: 4, relic, variant: relic, t: .2 }), 3, 'without', BG);
  }
}
function gloomScenes() {
  const HEROES = ['warden', 'pip', 'bryn', 'alondra'];
  const foeFor = { murkway: ['mire-leech', { gearTier: 3 }], willowmurk: ['willow-wight', { gearTier: 3 }], rotbridge: ['hodge', { gearTier: 3 }], bogmire: ['bargehand', { gearTier: 3 }], lanternfen: ['bog-hag', { gearTier: 3 }], 'mothers-hollow': ['lantern-mother', {}], 'long-boardwalk': ['drowned', { gearTier: 3 }], misthollow: ['salvage-master', { gearTier: 3 }], 'drowned-belfry': ['drowned-cantor', { gearTier: 3 }], 'blackwater-reach': ['old-jaws', {}], 'tidal-flats': ['blackwater-leviathan', {}], causeway: ['marsh-light', { gearTier: 3 }] };
  for (const key of GLOOM_SCENES) {
    const B = BACKDROPS[key] || {}, dk = GLOOM_DARK.includes(key);
    const s = section('gloom-scene-' + key, `${B.name || '?'} (${key})`, `renderBackdrop(key, { w: 160, h: 96, t }) at 3x at two times${B.mist ? ' (a foggy map: the mist drifts between them)' : ''}, then dark${dk ? ' (the dark: true its fights get, listed as ' + key + ':dark)' : ''}, a mock-up with a foe and the party on the floor band, a phone 120x104 frame, a wide 240x90 frame and the four parallax layers.`);
    const r = row(s);
    fig(r, time('backdrop render', () => renderBackdrop(key, { t: 1.3 })), 3, 't=1.3');
    fig(r, renderBackdrop(key, { t: 4.1 }), 3, 't=4.1');
    const r2 = row(s);
    fig(r2, renderBackdrop(key, { t: 1.3, dark: true }), 2, 'dark');
    const bd = renderBackdrop(key, { t: 1, dark: dk }), c = document.createElement('canvas'); c.width = 160; c.height = 96; const g = c.getContext('2d'); g.putImageData(bd, 0, 0);
    const put = (img, x, y) => { const t2 = document.createElement('canvas'); t2.width = img.width; t2.height = img.height; t2.getContext('2d').putImageData(img, 0, 0); g.drawImage(t2, Math.round(x), Math.round(y)); };
    const [fk, fo] = foeFor[key], foe = renderFoe(fk, Object.assign({ t: .3 }, fo)), fa = foe.anchors.foot; put(foe, (foe.width > 64 ? 46 : 42) - fa[0], 86 - fa[1]);
    HEROES.forEach((k, i) => { const im = renderHero(k, undefined, { pose: 'idle', t: .2 + i }), a = im.anchors.foot; put(im, 106 + (i % 2) * 22 - a[0] + (i >> 1) * 10, 78 + (i >> 1) * 12 - a[1]); });
    const f = document.createElement('figure'); c.style.width = 160 * 2 * ZOOM + 'px'; c.style.height = 96 * 2 * ZOOM + 'px'; f.appendChild(c); const fc = document.createElement('figcaption'); fc.textContent = 'mock-up'; f.appendChild(fc); r2.appendChild(f);
    fig(r2, renderBackdrop(key, { w: 120, h: 104, t: .7 }), 2, '120x104 (phone)');
    const r3 = row(s);
    fig(r3, renderBackdrop(key, { w: 240, h: 90, t: .7 }), 2, '240x90 (wide)');
    for (const L of backdropLayers(key).layers) fig(r3, L.img, 1, L.id + ' x' + L.parallax, '#302830');
  }
}
function gloomRelics() {
  const s = section('gloom-relics', 'Codex Page IV: the fourteen Gloomfen relics (Nos. 53-66)', 'Card portrait at 64px (heirloom frame) at 3x, the 16px bag icon at 1x and 3x; then the 96px card, the unsighted silhouette, each relic worn or held by a hero, and the forge\'s looks.');
  const r = row(s);
  for (const id of GLOOM_RELICS) {
    const f = document.createElement('figure'), wrap = document.createElement('div'); wrap.className = 'row';
    fig(wrap, time('relic portrait 64', () => itemPortrait(gloomItem(id), { t: 1.3 })), 3);
    const col = document.createElement('div'); col.style.display = 'flex'; col.style.flexDirection = 'column'; col.style.gap = '6px';
    const ic = time('relic icon 16', () => itemIcon(gloomItem(id))); fig(col, ic, 1, '', '#211a16'); fig(col, ic, 3, '', '#211a16');
    wrap.appendChild(col); f.appendChild(wrap); const fc = document.createElement('figcaption'); fc.textContent = `${id} · ${RELIC_ART[id].r} · ${RELIC_ART[id].aspect}`; f.appendChild(fc); r.appendChild(f);
  }
  const r2 = row(s, 'card size 96px (2x), and unsighted (develop 0)');
  for (const id of GLOOM_RELICS) fig(r2, itemPortrait(gloomItem(id), { t: 2.1, size: 96 }), 2, id);
  const r3 = row(s); for (const id of GLOOM_RELICS) fig(r3, itemPortrait(gloomItem(id), { develop: 0, reduced: true }), 1.5, id);
  const kits = [['warden', { weapon: 'gar-tooth', offhand: 'willow-ward', head: 'salvagers-helm', feet: 'bogstriders', hands: 'barge-gauntlets', ring: 'hag-stone' }], ['pip', { weapon: 'corvus-harpoon', amulet: 'unfair-toll', head: 'mourning-veil' }], ['bryn', { weapon: 'weeping-bow', body: 'hexbane-shawl', amulet: 'deep-pearl' }], ['alondra', { weapon: 'cantors-staff', offhand: 'lamplighters-lantern', body: 'hexbane-shawl' }]];
  for (const [hero, gear] of kits) { const rr = row(s, hero + ': ' + Object.values(gear).join(', ')); for (const [pose, t] of [['idle', 0], ['attack', .1], ['attack', .62], ['cast', .3], ['guard', 0], ['hurt', 0]]) fig(rr, renderHero(hero, gear, { pose, t }), 2, pose, '#1e1812'); }
  const states = [['plain', {}], ['+4', { temper: 4 }], ['+7', { temper: 7 }], ['+10', { temper: 10 }], ['bog amber + frost opal', { gems: ['bog-amber', 'frost-opal'] }], ['kindled', { deeds: { x: 1 } }], ['awakened a', { deeds: { x: 1 }, awakened: 'a' }], ['awakened b', { deeds: { x: 1 }, awakened: 'b' }]];
  for (const id of GLOOM_RELICS) { const rr = row(s, id + ': the forge'); for (const [cap, o] of states) fig(rr, time('forge portrait 64', () => itemPortrait(gloomItem(id, o), { t: 1.7 })), 2, cap); }
}
function gloomIcons() {
  const s = section('gloom-icons', 'M6 icons: the Gloomfen locks, Bog Amber, Rotting and Hexed', 'lockIcon (bog, fog, blackwater, witch-ward), gemIcon(\'bog-amber\') and statusIcon (rotting and hexed, beside poisoned, charmed and the neutral token). 12px at 4x and 1x, 24px at 2x; dim locks.');
  const block = (r, a, cap) => { const f = document.createElement('figure'), w = document.createElement('div'); w.className = 'row'; fig(w, a(12), 4); fig(w, a(12), 1); fig(w, a(24), 2); f.appendChild(w); const fc = document.createElement('figcaption'); fc.textContent = cap; f.appendChild(fc); r.appendChild(f); };
  const r = row(s, 'locks'); for (const k of ['bog', 'fog', 'blackwater', 'witch-ward']) { block(r, n => lockIcon(k, { size: n }), k); block(r, n => lockIcon(k, { size: n, dim: true }), k + ' dim'); }
  const r2 = row(s, 'gems'); for (const k of GEM_ICON_KEYS) block(r2, n => gemIcon(k, { size: n }), k);
  const r3 = row(s, 'the Gloomfen statuses, and the ones they must not be taken for'); for (const k of ['rotting', 'hexed', 'poisoned', 'charmed', 'bleeding', 'no-such-status']) block(r3, n => statusIcon(k, { size: n }), k);
}
function gloomPerf() {
  const s = section('gloom-perf', 'Render cost of the M6 foes, backdrops and relics', 'cold = a new pose raster plus compose (median of 3); warm = a cached raster re-composed for a new t (median of 24). Backdrop cold = first paint of a new size; warm includes the mist on the foggy ones. Shared machine: noisy.');
  const pre = document.createElement('pre'); s.appendChild(pre);
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1], lines = [];
  for (const key of ['mother-anvil', 'rime-abbot'].concat(GLOOM_HUM, GLOOM_NAMED, GLOOM_BEASTS, GLOOM_BEARERS, GLOOM_CHAMPS)) {
    const c = [], w = [];
    ['hurt', 'ko', 'attack'].forEach((pose, k) => { const t0 = performance.now(); renderFoe(key, { pose, t: .6, flip: true, gearTier: k, phase: k + 1 }); c.push(performance.now() - t0); });
    for (let k = 0; k < 24; k++) { const t0 = performance.now(); renderFoe(key, { t: k / 12 * .1 + (k % 2) * .05, gearTier: 1 }); w.push(performance.now() - t0); }
    T['cold ' + key] = med(c); T['warm ' + key] = med(w);
    lines.push(`${key.padEnd(22)} ${FOE_ART[key].kind === 'humanoid' ? '64x64' : FOE_ART[key].w + 'x' + FOE_ART[key].h}  cold ${med(c).toFixed(1).padStart(6)} ms   warm ${med(w).toFixed(2).padStart(6)} ms`);
  }
  for (const key of GLOOM_SCENES.concat(GLOOM_DARK.map(k => k + ':dark'))) { const t0 = performance.now(); renderBackdrop(key, { w: 161, h: 97, t: 1 }); const c = performance.now() - t0; const t1 = performance.now(); for (let k = 0; k < 10; k++) renderBackdrop(key, { w: 161, h: 97, t: k * .3 }); T['backdrop ' + key] = c; lines.push(`${('backdrop ' + key).padEnd(30)} cold ${c.toFixed(1).padStart(6)} ms   warm ${((performance.now() - t1) / 10).toFixed(2).padStart(6)} ms`); }
  for (const id of GLOOM_RELICS) { const it = gloomItem(id, { seed: 3 }); const t0 = performance.now(); itemPortrait(Object.assign({}, it, { temper: 7, gems: ['bog-amber'] }), { t: 1 }); const c = performance.now() - t0; const t1 = performance.now(); for (let k = 0; k < 10; k++) itemPortrait(Object.assign({}, it, { temper: 7, gems: ['bog-amber'] }), { t: k * .3 }); lines.push(`${('relic ' + id).padEnd(30)} cold ${c.toFixed(1).padStart(6)} ms   warm ${((performance.now() - t1) / 10).toFixed(2).padStart(6)} ms`); }
  pre.textContent = lines.join('\n');
}
function gloomCheck() {
  const s = section('gloom-check', 'Render check: the Gloomfen foes, every pose, phase, gear tier and piece', 'Every M6 key renders every pose at every gear tier and phase, flipped, reduced and tinted, with its relic held, disarmed and absent; relic glints sit on the canvas; the Champions show one glint per piece they still hold (the Leviathan none while it is down); beasts\' frames stay inside the canvas.');
  let n = 0; const fails = [], t0 = performance.now();
  const fin = p => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
  const onCanvas = (img, p) => p[0] >= 0 && p[1] >= 0 && p[0] < img.width && p[1] < img.height;
  const check = (key, o, test) => { let img; try { img = renderFoe(key, o); n++; } catch (e) { fails.push(`${key} ${JSON.stringify(o)}: threw ${e.message}`); return; } const a = img.anchors; for (const k of ['foot', 'head', 'center']) if (!fin(a[k])) fails.push(`${key} ${JSON.stringify(o)}: anchor ${k}`); for (const p of (a.relics || []).concat(a.relic ? [a.relic] : [])) if (!fin(p) || !onCanvas(img, p)) fails.push(`${key} ${JSON.stringify(o)}: a relic glint off the canvas`); if (test) { const m = test(img, a); if (m) fails.push(`${key} ${JSON.stringify(o)}: ${m}`); } };
  const poses = [['idle', 0], ['idle', .7], ['attack', .1], ['attack', .6], ['hurt', 0], ['ko', 0]];
  const edges = img => { const { width: w, height: h, data: d } = img; let e = 0; for (let y = 0; y < h; y++) { if (d[(y * w) * 4 + 3] > 40) e++; if (d[(y * w + w - 1) * 4 + 3] > 40) e++; } for (let x = 0; x < w; x++) if (d[x * 4 + 3] > 40) e++; return e; };
  for (const key of GLOOM_HUM.concat(GLOOM_NAMED, GLOOM_BEASTS, GLOOM_BEARERS, GLOOM_CHAMPS)) {
    const beast = FOE_ART[key].kind !== 'humanoid';
    for (const [pose, t] of poses) for (let gT = 0; gT < 4; gT++) check(key, { pose, t, gearTier: gT }, img => (beast && edges(img) > 6 ? 'runs off the canvas edge' : null));
    for (const [pose, t] of poses) for (const phase of [2, 3]) check(key, { pose, t, phase });
    for (const [pose, t] of [['idle', 0], ['attack', .6]]) { check(key, { pose, t, flip: true }); check(key, { pose, t, reduced: true }); check(key, { pose, t, tint: [255, 255, 255, .8] }); check(key, { pose, t, relic: null }); check(key, { pose, t, relicHeld: false }); }
    if (FOE_ART[key].relic && !FOE_ART[key].relics) for (const [pose, t] of poses) check(key, { pose, t }, (img, a) => (!a.relic ? 'no relic glint anchor' : null));
  }
  for (const key of GLOOM_CHAMPS) { const P = FOE_ART[key].relics; for (const broken of [[], [P[0]], [P[1]], P.slice()]) for (const phase of [1, 2, 3]) for (const [pose, t] of poses) check(key, { phase, pose, t, broken }, (img, a) => ((a.relics || []).length !== 2 - broken.length ? `expected ${2 - broken.length} glints, got ${(a.relics || []).length}` : null)); }
  for (const phase of [1, 2, 3]) check('blackwater-leviathan', { pose: 'dive', phase, t: .3 }, (img, a) => ((a.relics || []).length ? 'glints while it is under' : null));
  check('tamsin', { gearTier: 4, relic: 'hearthbrand', variant: 'hearthbrand', wears: 'bogstriders', t: .2 }, (img, a) => ((a.relics || []).length !== 3 ? 'the Bogstriders do not glint' : null));
  T['gloom check renders'] = n; T['gloom check failures'] = fails.length;
  for (const f of fails.slice(0, 20)) console.error('gloom check: ' + f);
  const pre = document.createElement('pre'); pre.textContent = `${n} renders, ${fails.length} failures, ${(performance.now() - t0).toFixed(0)} ms` + (fails.length ? '\n' + fails.slice(0, 40).join('\n') : ''); s.appendChild(pre);
}
if (wantGloom('gloom-lineup')) gloomLineup();
if (wantGloom('gloom-humanoids')) { const s = section('gloom-humanoids', 'Gloomfen humanoid families: gearTier 0-3, every pose', 'The Bog-Hag (veteran), and the Tallymen\'s hired hands: the Reed-Cutter, the Salvage Diver and the Bargehand (rabble). 64x64 at 3x.'); for (const key of GLOOM_HUM) sunPoses(s, key); }
if (wantGloom('gloom-named')) gloomNamed();
if (wantGloom('gloom-beasts')) { const s = section('gloom-beasts', 'Gloomfen beasts, spirits and drowned: gearTier 0-3, every pose', 'Mire Leech 56x40, Marsh-Light 40x56, Lamp-Moth 48x40, Blackwater Gar 72x48, Willow-Wight 64x72, the Drowned, the Bell-Ringer and the Chorister 64x64. 3x.'); for (const key of GLOOM_BEASTS) sunPoses(s, key); }
if (wantGloom('gloom-bearers')) gloomBearers();
if (wantGloom('gloom-mother')) sunChampion('gloom-mother', 'lantern-mother', 'The Lantern Mother: phases 1-3, the pieces, poses', 'renderFoe(\'lantern-mother\', { phase, broken, pose, t }) at 96x96, 2x. The Lamplighter\'s Lantern in her hand and the Mourning Veil over her head, both from their relics\' recipes, each gone once snapped off (a burnt stub of chain; her drowned face and wet hair). Lamplight (1); the Children\'s Road (2): the lantern held out low, the lamps lit along the drowned path; Lights Out (3): the lamps out but hers, burning white.');
if (wantGloom('gloom-leviathan')) { sunChampion('gloom-leviathan', 'blackwater-leviathan', 'The Blackwater Leviathan: phases 1-3, the pieces, poses, the dive', 'renderFoe(\'blackwater-leviathan\', { phase, broken, pose, t }) at 96x96, 2x. Corvus\'s harpoon lodged in its side and the Deep-Pearl in its brow, both from their relics\' recipes, each gone once snapped off; the iron collar with Harrow\'s broken ring on its lock, the great chain. The Wake (1); the Deep (2): more coils, the chain taut to its post; Blackwater (3): the pearl burns green, the water rises.'); const s = document.getElementById('gloom-leviathan'), r = row(s, 'pose "dive" (it has sounded: burrowed), each phase'); for (const phase of [1, 2, 3]) for (const t of [0, .7]) fig(r, renderFoe('blackwater-leviathan', { pose: 'dive', phase, t }), 2, `p${phase} t=${t}`, BG); }
if (wantGloom('gloom-tamsin')) gloomTamsin();
if (wantGloom('gloom-scenes')) gloomScenes();
if (wantGloom('gloom-relics')) gloomRelics();
if (wantGloom('gloom-icons')) gloomIcons();
if (wantGloom('gloom-perf')) gloomPerf();
if (wantGloom('gloom-check')) gloomCheck();
window.__done = true;
