// Thareia walk and sprite test: walk or fly the skiff over a painted region, and see the hero rig at higher detail.
// The hero and gear art is the finished Aethermoor game's own renderer (see tools/build.mjs for the scale patch).
import { renderHero, HERO_ART, HERO_KEYS, HERO_SIZE } from '@game/art/hero-looks.js';
import { posePreset, BUILD } from '@game/art/heroes.js';
import { gearLooks } from '@game/art/item-looks.js';
import { walkerSheet } from '@game/art/walkers.js';
import { RELICS } from '@game/data/relics.js';

const A = window.__ASSETS, $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = $('view'), ctx = canvas.getContext('2d'), stage = $('stage');
const load = src => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
const toCanvas = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').putImageData(img, 0, 0); return c; };

/* ---- state ---- */
const SLOTS = ['weapon', 'offhand', 'head', 'body', 'hands', 'feet'];
const ZOOMS = [['fit', 'Whole map'], [1, '1×'], [1.5, '1.5×'], [2, '2×'], [3, '3×']];
const SCALES = [[1, '1× · the game today'], [2, '2×'], [3, '3×']];
const POSES = ['idle', 'attack', 'cast', 'guard', 'hurt'];
const S = {
  view: 'map', zoom: 1.5, mode: 'walk', sprite: 'new', hero: 'warden', choice: {},
  p: { x: 590, y: 470, dir: 's', face: 1, step: 0, moving: false },
  ship: { x: 590, y: 470, h: -Math.PI / 2, v: 0, alt: 0 },
  target: null, keys: new Set(), scale: 3, pose: 'idle', poseT0: 0,
};

/* ---- gear ---- */
const relicsBySlot = {};
for (const r of Object.values(RELICS)) (relicsBySlot[r.slot] ||= []).push(r);
function gearOf() {
  const g = Object.assign({}, HERO_ART[S.hero].starter);
  for (const s of SLOTS) { const c = S.choice[s]; if (!c || c === 'starter') continue; g[s] = c === 'none' ? null : c; }
  return g;
}
const gearSig = () => S.hero + '|' + SLOTS.map(s => S.choice[s] || 'starter').join(',');

/* ---- sprites (cached per hero and gear) ---- */
const cache = new Map();
const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
function walkerNew() {
  return memo('wn|' + gearSig(), () => {
    const g = gearOf(), b = BUILD[HERO_ART[S.hero].H.build] || BUILD.human, cls = gearLooks(g).weapon?.cls ?? null;
    const base = posePreset('idle', 0, cls, b);
    const Ps = [base, Object.assign({}, base, { legs: 'stride', stride: 2.2, up: [0, -.7] }), base, Object.assign({}, base, { legs: 'stride', stride: -2.2, up: [0, -.7] })];
    return { r: Ps.map(P => toCanvas(renderHero(S.hero, g, { P }))), l: Ps.map(P => toCanvas(renderHero(S.hero, g, { P, flip: true }))), foot: HERO_SIZE.foot };
  });
}
function walkerOld() {
  return memo('wo|' + gearSig(), () => { const w = walkerSheet(S.hero, gearOf()); return { img: toCanvas(w.img), w: w.w, h: w.h, foot: w.foot }; });
}
// the battle sprite at 1x, 2x or 3x. Above 1x the face (painted pixel by pixel in the game) is carried over from the
// 1x sprite, one face pixel to one scaled block.
function battleSprite(scale, pose, t) {
  return memo(`b|${gearSig()}|${scale}|${pose}|${t}`, () => {
    const g = gearOf(), o = { pose, t };
    if (scale === 1) return toCanvas(renderHero(S.hero, g, o));
    const hi = toCanvas(renderHero(S.hero, g, Object.assign({ scale }, o)));
    const a = renderHero(S.hero, g, o), b = renderHero(S.hero, g, Object.assign({ noFace: true }, o));
    const hc = hi.getContext('2d'), ad = a.data, bd = b.data;
    for (let i = 0; i < ad.length; i += 4) {
      if (ad[i] === bd[i] && ad[i + 1] === bd[i + 1] && ad[i + 2] === bd[i + 2] && ad[i + 3] === bd[i + 3]) continue;
      const p = i / 4, x = p % a.width, y = (p / a.width) | 0;
      hc.fillStyle = `rgba(${ad[i]},${ad[i + 1]},${ad[i + 2]},${ad[i + 3] / 255})`; hc.fillRect(x * scale, y * scale, scale, scale);
    }
    return hi;
  });
}

/* ---- the skiff: silhouette for its shadow, and its crystals for the glow ---- */
function shipParts(img) {
  const w = img.width, h = img.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h), glow = new ImageData(w, h);
  const sil = document.createElement('canvas'); sil.width = w; sil.height = h; const sg = sil.getContext('2d');
  sg.drawImage(img, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#000'; sg.fillRect(0, 0, w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    const r = d.data[i], gg = d.data[i + 1], b = d.data[i + 2];
    if (d.data[i + 3] > 200 && r > 205 && gg > 115 && b < 95 && r - b > 130) { glow.data[i] = 255; glow.data[i + 1] = Math.min(255, gg + 50); glow.data[i + 2] = 90; glow.data[i + 3] = 255; }
  }
  const small = document.createElement('canvas'); small.width = 40; small.height = 40; // a cheap blur: shrink, then stretch back
  const smg = small.getContext('2d'); smg.drawImage(sil, 0, 0, 40, 40);
  return { img, glow: toCanvas(glow), shadow: small, w, h };
}

/* ---- world ---- */
let MAP, SHIP;
const clouds = Array.from({ length: 6 }, (_, k) => ({ x: (k * 331) % 1536, y: (k * 577) % 1024, r: 160 + (k * 97) % 140, v: 6 + k % 3 * 3 }));
const puffs = Array.from({ length: 7 }, (_, k) => ({ x: (k * 419) % 1536, y: (k * 263) % 1024, r: 70 + (k * 53) % 70 }));
const motes = [];
const WALK_SPEED = 62, FLY_SPEED = 170; // painting pixels per second

function size() {
  const r = stage.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
  return { cw: r.width, ch: r.height, dpr };
}
let dims = { cw: 1, ch: 1, dpr: 1 };
new ResizeObserver(() => { dims = size(); }).observe(stage);

const zoomOf = () => S.zoom === 'fit' ? Math.min(dims.cw / 1536, dims.ch / 1024) : S.zoom;
function camera() {
  const z = zoomOf(), who = S.mode === 'fly' ? S.ship : S.p, vw = dims.cw / z, vh = dims.ch / z;
  const cx = vw >= 1536 ? 768 : Math.min(1536 - vw / 2, Math.max(vw / 2, who.x));
  const cy = vh >= 1024 ? 512 : Math.min(1024 - vh / 2, Math.max(vh / 2, who.y));
  return { z, cx, cy, toScreen: (x, y) => [(x - cx) * z + dims.cw / 2, (y - cy) * z + dims.ch / 2], toWorld: (sx, sy) => [(sx - dims.cw / 2) / z + cx, (sy - dims.ch / 2) / z + cy] };
}

/* ---- input ---- */
let pressed = false;
const aim = e => { if (S.view !== 'map') return; const r = canvas.getBoundingClientRect(), c = camera(); const [x, y] = c.toWorld(e.clientX - r.left, e.clientY - r.top); S.target = { x: Math.max(0, Math.min(1536, x)), y: Math.max(0, Math.min(1024, y)) }; };
canvas.addEventListener('pointerdown', e => { pressed = true; canvas.setPointerCapture(e.pointerId); aim(e); });
canvas.addEventListener('pointermove', e => { if (pressed) aim(e); });
canvas.addEventListener('pointerup', () => { pressed = false; });
const KEYS = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
addEventListener('keydown', e => { const k = KEYS[e.key] ? e.key : KEYS[e.key?.toLowerCase()] ? e.key.toLowerCase() : null; if (k && S.view === 'map' && !(e.target instanceof HTMLSelectElement)) { S.keys.add(k); S.target = null; e.preventDefault(); } });
addEventListener('keyup', e => { S.keys.delete(e.key); S.keys.delete(e.key?.toLowerCase()); });
function wantDir(from) {
  let dx = 0, dy = 0; for (const k of S.keys) { dx += KEYS[k][0]; dy += KEYS[k][1]; }
  if (dx || dy) { const l = Math.hypot(dx, dy); return [dx / l, dy / l]; }
  if (S.target) { const tx = S.target.x - from.x, ty = S.target.y - from.y, l = Math.hypot(tx, ty); if (l > 3) return [tx / l, ty / l]; S.target = null; }
  return null;
}

/* ---- update ---- */
function update(dt, t) {
  for (const c of clouds) { c.x += c.v * dt; if (c.x - c.r > 1536) c.x = -c.r; }
  if (S.mode === 'walk') {
    const p = S.p, d = wantDir(p);
    p.moving = !!d;
    if (d) {
      p.x = Math.max(0, Math.min(1536, p.x + d[0] * WALK_SPEED * dt)); p.y = Math.max(0, Math.min(1024, p.y + d[1] * WALK_SPEED * dt));
      p.step += WALK_SPEED * dt; if (Math.abs(d[0]) > .2) p.face = d[0] > 0 ? 1 : -1;
      p.dir = Math.abs(d[0]) > Math.abs(d[1]) ? (d[0] > 0 ? 'e' : 'w') : (d[1] > 0 ? 's' : 'n');
    }
    S.ship.alt = Math.max(0, S.ship.alt - dt * 1.5);
  } else {
    const sh = S.ship, d = wantDir(sh);
    sh.alt = Math.min(1, sh.alt + dt * .9);
    if (d && sh.alt > .35) {
      const want = Math.atan2(d[1], d[0]); let dh = ((want - sh.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      sh.h += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh)); sh.v = Math.min(FLY_SPEED, sh.v + 140 * dt);
    } else sh.v = Math.max(0, sh.v - 120 * dt);
    sh.x = Math.max(0, Math.min(1536, sh.x + Math.cos(sh.h) * sh.v * dt)); sh.y = Math.max(0, Math.min(1024, sh.y + Math.sin(sh.h) * sh.v * dt));
    if (!reduced && sh.alt > .3) for (let k = 0; k < (sh.v > 20 ? 2 : 1); k++) if (Math.random() < dt * 30) {
      const back = 30, sx = sh.x - Math.cos(sh.h) * back + (Math.random() - .5) * 10, sy = sh.y - Math.sin(sh.h) * back + (Math.random() - .5) * 10;
      motes.push({ x: sx, y: sy, vx: (Math.random() - .5) * 8, vy: -6 - Math.random() * 8, life: 1.4, age: 0 });
    }
  }
  for (let i = motes.length - 1; i >= 0; i--) { const m = motes[i]; m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; if (m.age > m.life) motes.splice(i, 1); }
  if (S.pose === 'attack' && t - S.poseT0 > .7) S.pose = 'idle';
}

/* ---- draw: the map ---- */
function drawMap(t) {
  const { dpr, cw, ch } = dims, c = camera(), z = c.z;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0a1214'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const [ox, oy] = c.toScreen(0, 0);
  ctx.setTransform(z * dpr, 0, 0, z * dpr, ox * dpr, oy * dpr);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(MAP, 0, 0);
  // drifting cloud shadows over the land
  for (const cl of clouds) { const gr = ctx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.r); gr.addColorStop(0, 'rgba(8,16,24,.2)'); gr.addColorStop(1, 'rgba(8,16,24,0)'); ctx.fillStyle = gr; ctx.fillRect(cl.x - cl.r, cl.y - cl.r, cl.r * 2, cl.r * 2); }
  // tap target marker
  if (S.target) { ctx.strokeStyle = 'rgba(234,165,62,.85)'; ctx.lineWidth = 1.6 / z; ctx.beginPath(); ctx.arc(S.target.x, S.target.y, (5 + Math.sin(t * 6) * 1.2) / z, 0, Math.PI * 2); ctx.stroke(); }

  if (S.mode === 'walk' && S.ship.alt < .05) drawWalker(c, t); else drawShip(c, t);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  $('hud-left').textContent = `Zoom ${S.zoom === 'fit' ? 'whole map' : S.zoom + '×'} · 1 painting pixel = ${(z * dpr).toFixed(1)} screen pixels`;
  $('hud-right').textContent = S.mode === 'fly' ? 'Flying the skiff' : 'On foot';
}
function drawWalker(c, t) {
  const { dpr } = dims, p = S.p, [sx, sy] = c.toScreen(p.x, p.y);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(sx, sy, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.imageSmoothingEnabled = false;
  const X = Math.round(sx * dpr), Y = Math.round(sy * dpr);
  if (S.sprite === 'new') {
    const w = walkerNew(), f = p.moving ? Math.floor(p.step / 9) % 4 : 0, img = (p.face > 0 ? w.r : w.l)[f], k = dpr; // 1 sprite pixel = 1 css pixel
    const bob = p.moving || reduced ? 0 : Math.round(Math.sin(t * 2.4) * .6);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(img, X - w.foot[0] * k, Y - (w.foot[1] + bob) * k, img.width * k, img.height * k);
  } else {
    const w = walkerOld(), row = { s: 0, n: 1, e: 2, w: 3 }[p.dir], f = p.moving ? [0, 1, 0, 2][Math.floor(p.step / 7) % 4] : 0, k = 2 * dpr; // 2 css pixels, about the same height
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(w.img, f * w.w, row * w.h, w.w, w.h, X - w.foot[0] * k, Y - w.foot[1] * k, w.w * k, w.h * k);
  }
}
function drawShip(c, t) {
  const { dpr } = dims, sh = S.ship, P = SHIP, [sx, sy] = c.toScreen(sh.x, sh.y);
  const len = 88, k = len / P.h, alt = sh.alt, bob = reduced ? 0 : Math.sin(t * 1.7) * 2 * alt, rot = sh.h + Math.PI / 2;
  const bank = reduced ? 0 : Math.sin(t * 1.3) * .03;
  // shadow on the ground: further off and softer as the ship climbs
  ctx.setTransform(dpr, 0, 0, dpr, (sx + alt * 26) * dpr, (sy + alt * 34) * dpr); ctx.rotate(rot);
  ctx.globalAlpha = .38 - alt * .12; ctx.imageSmoothingEnabled = true;
  const shs = (1 - alt * .12) * len; ctx.drawImage(P.shadow, -shs / 2, -shs / 2, shs, shs); ctx.globalAlpha = 1;
  // the ship
  const scl = (1 + alt * .1) * k;
  ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, (sy - 8 * alt + bob) * dpr); ctx.rotate(rot + bank); ctx.scale(scl, scl);
  ctx.drawImage(P.img, -P.w / 2, -P.h / 2);
  // the sunstone crystals breathe light
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (reduced ? .25 : .22 + .18 * Math.sin(t * 3.1)) * (.4 + alt * .6);
  ctx.drawImage(P.glow, -P.w / 2, -P.h / 2); ctx.globalAlpha *= .6; ctx.drawImage(P.glow, -P.w * .54, -P.h * .54, P.w * 1.08, P.h * 1.08);
  ctx.globalAlpha = 1;
  // golden aether motes trailing behind
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const m of motes) { const [mx, my] = c.toScreen(m.x, m.y), a = 1 - m.age / m.life; ctx.fillStyle = `rgba(255,${190 + 40 * a | 0},110,${.8 * a})`; ctx.beginPath(); ctx.arc(mx * dpr, (my - 8 * alt) * dpr, (1.2 + a * 1.4) * dpr, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
  // high clouds drift past above the ship, faster than the ground (parallax)
  if (alt > .05) for (const p of puffs) {
    const px = ((p.x - c.cx * 1.35 + t * 9) % 1800 + 1800) % 1800 - 130, py = ((p.y - c.cy * 1.35) % 1150 + 1150) % 1150 - 60;
    const x = px * c.z * .7, y = py * c.z * .7, r = p.r * c.z * .7, gr = ctx.createRadialGradient(x * dpr, y * dpr, 0, x * dpr, y * dpr, r * dpr);
    gr.addColorStop(0, `rgba(255,248,236,${.2 * alt})`); gr.addColorStop(1, 'rgba(255,248,236,0)'); ctx.fillStyle = gr; ctx.fillRect((x - r) * dpr, (y - r) * dpr, r * 2 * dpr, r * 2 * dpr);
  }
}

/* ---- draw: the battle stage ---- */
function drawBattle(t) {
  const { dpr, cw, ch } = dims, W = canvas.width, H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
  // a darkened corner of the Gloomfen painting as the backdrop
  const sw = 560, shh = sw * H / W; ctx.drawImage(MAP, 830, 330, sw, Math.min(700, shh), 0, 0, W, H);
  const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(10,18,20,.55)'); gr.addColorStop(.6, 'rgba(10,18,20,.35)'); gr.addColorStop(1, 'rgba(10,18,20,.85)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  let pose = S.pose, pt = 0;
  if (pose === 'attack') pt = t - S.poseT0 < .28 ? .1 : .6;
  else if (pose === 'idle') pt = reduced ? 0 : (Math.floor(t / .6) % 2 ? .7 : 0);
  const img = battleSprite(S.scale, pose, pt);
  // integer screen pixels per sprite pixel, the same on-screen size at every detail level
  const unit = Math.max(6, Math.floor(Math.min(H * .78, W * .9) / 64 / 6) * 6), per = unit / S.scale;
  const x = Math.round(W / 2 - 32 * unit), y = Math.round(H * .5 - 34 * unit + (pose === 'attack' && pt > .5 ? 0 : 0));
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(W / 2, y + HERO_SIZE.foot[1] * unit, 13 * unit, 3.2 * unit, 0, 0, Math.PI * 2); ctx.fill();
  ctx.imageSmoothingEnabled = false; ctx.drawImage(img, x, y, img.width * per, img.height * per);
  $('hud-left').textContent = `Detail ${S.scale}× · sprite drawn at ${img.width}×${img.height} pixels`;
  $('hud-right').textContent = HERO_ART[S.hero].name || S.hero;
}

/* ---- controls ---- */
function pressGroup(ids, on) { for (const id of ids) $(id).setAttribute('aria-pressed', String(id === on)); }
function chips(host, items, get, set) {
  host.innerHTML = '';
  for (const [v, label] of items) {
    const b = document.createElement('button'); b.textContent = label; b.setAttribute('aria-pressed', String(get() === v));
    b.onclick = () => { set(v); for (const x of host.children) x.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-pressed', 'true'); };
    host.appendChild(b);
  }
}
function setView(v) { S.view = v; $('app').dataset.view = v; pressGroup(['tab-map', 'tab-battle'], 'tab-' + v); }
$('tab-map').onclick = () => setView('map'); $('tab-battle').onclick = () => setView('battle');
$('mode-walk').onclick = () => { if (S.mode === 'fly') { S.p.x = S.ship.x; S.p.y = S.ship.y; } S.mode = 'walk'; S.target = null; pressGroup(['mode-walk', 'mode-fly'], 'mode-walk'); };
$('mode-fly').onclick = () => { if (S.mode === 'walk') { S.ship.x = S.p.x; S.ship.y = S.p.y; S.ship.v = 0; } S.mode = 'fly'; S.target = null; pressGroup(['mode-walk', 'mode-fly'], 'mode-fly'); };
$('spr-new').onclick = () => { S.sprite = 'new'; pressGroup(['spr-new', 'spr-old'], 'spr-new'); };
$('spr-old').onclick = () => { S.sprite = 'old'; pressGroup(['spr-new', 'spr-old'], 'spr-old'); };
chips($('zooms'), ZOOMS, () => S.zoom, v => { S.zoom = v; });
chips($('scales'), SCALES, () => S.scale, v => { S.scale = v; });
chips($('poses'), POSES.map(p => [p, p[0].toUpperCase() + p.slice(1)]), () => S.pose, v => { S.pose = v; S.poseT0 = performance.now() / 1000; });
const music = new Audio(A.music); music.loop = true;
$('music').onclick = () => { if (music.paused) { music.play().catch(() => {}); $('music').setAttribute('aria-pressed', 'true'); $('music').textContent = 'Pause Herbal Decay'; } else { music.pause(); $('music').setAttribute('aria-pressed', 'false'); $('music').textContent = 'Play Herbal Decay'; } };

const heroSel = $('hero');
for (const k of HERO_KEYS) { const o = document.createElement('option'); o.value = k; o.textContent = HERO_ART[k].name || k; heroSel.appendChild(o); }
heroSel.onchange = () => { S.hero = heroSel.value; S.choice = {}; buildGear(); };
function buildGear() {
  const host = $('gear'); host.innerHTML = '';
  const starter = HERO_ART[S.hero].starter;
  for (const s of SLOTS) {
    const lab = document.createElement('label'), sel = document.createElement('select'); sel.id = 'gear-' + s;
    lab.textContent = s === 'offhand' ? 'Off hand' : s[0].toUpperCase() + s.slice(1);
    const opts = [['starter', starter[s] ? 'Starter kit' : 'Nothing (starter)'], ['none', 'Nothing']].concat((relicsBySlot[s] || []).map(r => [r.id, r.name]));
    for (const [v, t] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); }
    sel.value = S.choice[s] || 'starter'; sel.onchange = () => { S.choice[s] = sel.value; };
    lab.appendChild(sel); host.appendChild(lab);
  }
}
buildGear();

/* ---- run ---- */
Promise.all([load(A.map), load(A.ship)]).then(([m, s]) => {
  MAP = m; SHIP = shipParts(s); dims = size();
  let last = performance.now();
  const frame = now => {
    const dt = Math.min(.05, (now - last) / 1000), t = now / 1000; last = now;
    update(dt, t);
    if (S.view === 'map') drawMap(t); else drawBattle(t);
    document.body.dataset.ready = '1';
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
});
