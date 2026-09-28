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
import { renderFoe, foeAnchors, foeLooks, relicSlot, FOE_ART, FOE_KEYS, FOE_POSES } from '../src/art/foes.js';
import { RELIC_ART } from '../src/art/item-looks.js';

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
window.__done = true;
