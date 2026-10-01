// Thareia: the airship. Two layers of travel (design/01-brainstorm.md, "Travel works in layers"):
//   - the region at 1x: the region painting under the ship, one painting pixel to one screen pixel; you steer (tap or
//     hold where to go, or the arrow keys / WASD), cross from one region's painting to the next at its edge, and land
//     at a dock you are over;
//   - the world map: the whole continent painting; tap a dock and watch the ship fly there on its own.
// mount(root, ctx, { flight, from }): flight is a data/thareia/sky.js FLIGHTS id (the Prologue's 'first-flight'), or
// 'hire' for the rented skiff (HIRE_FLIGHT) taking off from the hire post `from` (T2, design/09-t2-spec.md 6.5). A hire
// flight has no destination (`to` is null) until the player picks a dock; rules/sky.js dockState says where it may land.
// T2 (6.7): at 1x the region is drawn in WebGL (ui/sky3d/: the painting as a tilted plane, the 3D ship banking into
// turns, its shadow on the painting), with the docks, the route, the arrow and the HUD on a 2D canvas over it. The world
// map stays 2D. Without WebGL, when it fails or its context is lost, or with ?sky=2d, the region is drawn in 2D with the
// ship's top-down sprite (the rented skiff's own sprite for a hire flight).
// Landing writes progress.pos (the dock's map and anchor), marks the dock known (flags.docks), counts a hired flight
// (flags.hired), and opens the world there. The fee or the ticket was spent in dialogue before take-off.
import '../sky.css';
import { SKY_REGIONS, DOCKS, SKY_MARKS, FLIGHTS, HIRE_FLIGHT, PAINT, PAINT_H, toWorld, toRegion } from '../../data/thareia/sky.js';
import { dockState, regionOpen, refusalLine } from '../../rules/sky.js';
import { anchor } from '../../data/maps/index.js';
import { HEROES } from '../../data/heroes.js';
import { NPCS } from '../../data/npcs.js';
import { el, button } from '../lib/dom.js';
import { skyMode } from '../sky3d/webgl.js';
import { createSkyScene } from '../sky3d/scene.js';
import { createMotion } from '../sky3d/motion.js';
import continentSrc from '../assets/sky/continent.webp';
import gloomfenSrc from '../assets/sky/gloomfen.webp';
import verdantSrc from '../assets/sky/verdant.webp';
import skiffSrc from '../assets/sky/skiff-top.webp';
import rentedSrc from '../assets/sky/skiff-rented.webp';

const ART = { gloomfen: gloomfenSrc, verdant: verdantSrc };
// the 2D ship sprites; glowBox limits the crystals' glow mask to their box on the sprite (x0, y0, x1, y1 px)
const SHIP_ART = { first: { src: skiffSrc, glowBox: null }, rented: { src: rentedSrc, glowBox: [120, 150, 360, 255] } };
const FLY_SPEED = 150, AUTO_SPEED = 90;  // painting px a second at 1x; world px a second on the map
const LAND_R = 70;                        // how near a dock the ship must be to land (painting px)
const TAP_R = 26;                         // how near a dock or mark a tap must be to pick it (CSS px)
const img = src => { const i = new Image(); i.decoding = 'async'; i.src = src; return i; };
const IMAGES = {};
const imageOf = key => (IMAGES[key] ||= img(key === 'continent' ? continentSrc : SHIP_ART[key] ? SHIP_ART[key].src : ART[key]));

// the flight this screen flies: a story flight, or the rented skiff from a hire post
export function flightFor({ flight, from } = {}) {
  if (flight === 'hire') {
    const start = DOCKS[from] ? from : 'thornhollow';
    return { id: 'hire', ...HIRE_FLIGHT, from: start, to: null };
  }
  const id = FLIGHTS[flight] ? flight : 'first-flight';
  return { id, ...FLIGHTS[id] };
}

export function mount(root, ctx, params = {}) {
  const flight = flightFor(params);
  const reduced = ctx.reduced();
  const from = DOCKS[flight.from], to = flight.to ? DOCKS[flight.to] : null;
  const livery = flight.ship === 'rented' ? 'rented' : 'first';
  const says = flight.says || {};
  const S = {
    mode: 'region', region: from.region, dead: false, landing: null, auto: null, pick: null,
    ship: { x: from.at[0], y: from.at[1], h: -Math.PI / 2, v: 0, alt: 0 },
    target: null, keys: new Set(), talk: [...flight.lines], nudged: 0,
  };
  root.classList.add('full', 'sky-root');
  const stage = el('div', 'sky-stage');
  const cv3 = el('canvas', { class: 'sky-canvas sky-gl', 'aria-hidden': 'true' });
  const cv = el('canvas', { class: 'sky-canvas', role: 'img', 'aria-label': 'The airship over the painted land' });
  const top = el('div', 'sky-top');
  const where = el('p', 'sky-where');
  const aim = el('p', 'sky-aim');
  top.append(where, aim);
  const say = el('div', { class: 'sky-say', role: 'status', 'aria-live': 'polite' });
  const acts = el('div', 'sky-acts');
  const mapBtn = button('World map', 'btn', () => setMode(S.mode === 'map' ? 'region' : 'map'));
  const landBtn = button('Land', 'btn primary', () => land());
  landBtn.hidden = true;
  acts.append(mapBtn, landBtn);
  stage.append(cv3, cv, top, say, acts);
  root.append(stage);
  const g2 = cv.getContext('2d');
  ctx.audio.music('flight');

  // ---- the 3D view (region mode), or the 2D fallback ----
  let three = null;
  const motion = createMotion({ reduced });
  function drop3d() {
    if (!three) return;
    const t = three; three = null;
    try { t.dispose(); } catch { /* gone already */ }
    cv3.hidden = true; stage.dataset.sky = '2d';
  }
  if (skyMode() === '3d') {
    try {
      three = createSkyScene({ canvas: cv3, livery, onLost: () => setTimeout(drop3d, 0) });
      stage.dataset.sky = '3d';
    } catch { three = null; }
  }
  if (!three) { cv3.hidden = true; stage.dataset.sky = '2d'; }

  // ---- sizing ----
  let dims = { cw: 1, ch: 1, dpr: 1 };
  const size = () => {
    const r = stage.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    dims = { cw: r.width, ch: r.height, dpr };
    if (three) three.resize(r.width, r.height, dpr);
  };
  const ro = new ResizeObserver(size); ro.observe(stage); size();

  // ---- the 2D ship: its sprite, silhouette (the shadow) and crystals (their glow) ----
  let SHIP = null;
  const art = SHIP_ART[livery], skiff = imageOf(livery);
  const buildShip = () => {
    const w = skiff.naturalWidth, h = skiff.naturalHeight; if (!w) return;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(skiff, 0, 0);
    const d = g.getImageData(0, 0, w, h), glow = g.createImageData(w, h);
    const [bx0, by0, bx1, by1] = art.glowBox || [0, 0, w, h];
    for (let i = 0; i < d.data.length; i += 4) {
      const x = (i / 4) % w, y = (i / 4 / w) | 0;
      if (x < bx0 || x > bx1 || y < by0 || y > by1) continue;
      const r = d.data[i], gg = d.data[i + 1], b = d.data[i + 2];
      if (d.data[i + 3] > 200 && r > 205 && gg > 115 && b < 95 && r - b > 130) { glow.data[i] = 255; glow.data[i + 1] = Math.min(255, gg + 50); glow.data[i + 2] = 90; glow.data[i + 3] = 255; }
    }
    const gc = document.createElement('canvas'); gc.width = w; gc.height = h; gc.getContext('2d').putImageData(glow, 0, 0);
    const sil = document.createElement('canvas'); sil.width = w; sil.height = h; const sg = sil.getContext('2d');
    sg.drawImage(skiff, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#000'; sg.fillRect(0, 0, w, h);
    const small = document.createElement('canvas'); small.width = 40; small.height = 40; small.getContext('2d').drawImage(sil, 0, 0, 40, 40);
    SHIP = { img: skiff, glow: gc, shadow: small, w, h };
  };
  if (skiff.complete && skiff.naturalWidth) buildShip(); else skiff.addEventListener('load', buildShip, { once: true });
  for (const k of ['continent', 'gloomfen', 'verdant']) imageOf(k);

  // ---- where things are, and who may land where ----
  const shipWorld = () => toWorld(S.region, [S.ship.x, S.ship.y]);
  const dockWorld = d => d.world || toWorld(d.region, d.at);
  const stateOf = (d, pick = '1x') => dockState(ctx.game, d, flight, { pick });
  const shown = d => stateOf(d).why !== 'story';
  const dockNear = () => Object.values(DOCKS).find(d => d.region === S.region && stateOf(d).ok && Math.hypot(d.at[0] - S.ship.x, d.at[1] - S.ship.y) < LAND_R);
  const bearing = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const names = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
    return names[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  };
  // where the arrow points: the story flight's end, else the dock the player picked, else the nearest landable one
  const heading = () => {
    if (to) return to;
    if (S.pick) return S.pick;
    const [wx, wy] = shipWorld();
    let best = null, bd = Infinity;
    for (const d of Object.values(DOCKS)) {
      if (d.id === flight.from || !stateOf(d).ok) continue;
      const [x, y] = toWorld(d.region, d.at), k = Math.hypot(x - wx, y - wy);
      if (k < bd) { bd = k; best = d; }
    }
    return best;
  };
  const camera = () => {
    if (S.mode === 'map') {
      const z = Math.min(dims.cw / PAINT, dims.ch / PAINT_H);
      return { z, ox: (dims.cw - PAINT * z) / 2, oy: (dims.ch - PAINT_H * z) / 2 };
    }
    const z = 1, vw = dims.cw, vh = dims.ch;
    const cx = vw >= PAINT ? PAINT / 2 : Math.min(PAINT - vw / 2, Math.max(vw / 2, S.ship.x));
    const cy = vh >= PAINT_H ? PAINT_H / 2 : Math.min(PAINT_H - vh / 2, Math.max(vh / 2, S.ship.y));
    return { z, ox: vw / 2 - cx, oy: vh / 2 - cy };
  };
  // painting px (and height) -> screen CSS px at 1x, in 3D or in 2D
  const use3d = () => !!three && S.mode === 'region' && !S.auto;
  const toScreen = (x, y, h = 0) => {
    if (use3d()) return three.project(x, y, h);
    const c = camera(); return [x * c.z + c.ox, y * c.z + c.oy];
  };

  // ---- the captain's (or the narrator's) lines ----
  let sayTimer = 0;
  const nameOf = who => (who === 'narrator' ? '' : HEROES[who]?.name || NPCS[who]?.name || who);
  function nextLine() {
    clearTimeout(sayTimer);
    const L = S.talk.shift();
    if (!L) { say.hidden = true; return; }
    const [who, line] = L, name = nameOf(who);
    say.hidden = false;
    say.replaceChildren(...(name ? [el('b', '', name)] : []), el('span', '', line));
    ctx.audio.sfx('blip', { voice: 3 });
    sayTimer = setTimeout(nextLine, 5200);
  }
  say.addEventListener('click', nextLine);
  function tell(line) { if (!line) return; S.talk = [[says.speaker || 'narrator', line]]; nextLine(); }
  function refuse(why) { ctx.audio.sfx('ui-error'); tell(refusalLine(flight, why)); }

  // ---- input ----
  let pressed = false;
  // a dock or mark near a screen point at 1x (only those drawn)
  const pickAt1x = (sx, sy) => {
    const list = [...Object.values(DOCKS).filter(d => d.region === S.region && shown(d)), ...Object.values(SKY_MARKS).filter(m => m.region === S.region)];
    return list.find(d => { const [x, y] = toScreen(d.at[0], d.at[1]); return Math.hypot(x - sx, y - sy) < TAP_R; }) || null;
  };
  const aimAt = (e, first) => {
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    if (S.mode === 'map') { const c = camera(); return first ? pickDock((sx - c.ox) / c.z, (sy - c.oy) / c.z) : null; }
    if (first) {
      const hit = pickAt1x(sx, sy);
      if (hit && (SKY_MARKS[hit.id] === hit || !stateOf(hit).ok)) { pressed = false; return refuse(SKY_MARKS[hit.id] === hit ? hit.why : stateOf(hit).why); }
      if (hit && DOCKS[hit.id] === hit) { S.pick = hit; S.target = { x: hit.at[0], y: hit.at[1] }; return; }
    }
    const p = use3d() ? three.unproject(sx, sy) : (() => { const c = camera(); return [(sx - c.ox) / c.z, (sy - c.oy) / c.z]; })();
    if (!p) return;
    S.target = { x: Math.max(0, Math.min(PAINT, p[0])), y: Math.max(0, Math.min(PAINT_H, p[1])) };
  };
  cv.addEventListener('pointerdown', e => { if (S.landing || S.auto) return; pressed = true; try { cv.setPointerCapture(e.pointerId); } catch { /* ok */ } aimAt(e, true); });
  cv.addEventListener('pointermove', e => { if (pressed && S.mode === 'region') aimAt(e, false); });
  const up = () => { pressed = false; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const KEYS = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
  const keyOf = e => (KEYS[e.key] ? e.key : KEYS[e.key?.toLowerCase?.()] ? e.key.toLowerCase() : null);
  const onDown = e => {
    const k = keyOf(e);
    if (k && S.mode === 'region') { S.keys.add(k); S.target = null; e.preventDefault(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && !landBtn.hidden && document.activeElement === document.body) { land(); e.preventDefault(); }
    if (e.key === 'm' || e.key === 'M') setMode(S.mode === 'map' ? 'region' : 'map');
  };
  const onUp = e => { const k = keyOf(e); if (k) S.keys.delete(k); };
  addEventListener('keydown', onDown); addEventListener('keyup', onUp);
  const wantDir = () => {
    let dx = 0, dy = 0; for (const k of S.keys) { dx += KEYS[k][0]; dy += KEYS[k][1]; }
    if (dx || dy) { const l = Math.hypot(dx, dy); return [dx / l, dy / l]; }
    if (S.target) { const tx = S.target.x - S.ship.x, ty = S.target.y - S.ship.y, l = Math.hypot(tx, ty); if (l > 4) return [tx / l, ty / l]; S.target = null; }
    return null;
  };

  // ---- modes ----
  function setMode(m) {
    if (S.landing || S.auto) return;
    S.mode = m; S.target = null; S.keys.clear();
    mapBtn.textContent = m === 'map' ? 'Take the wheel' : 'World map';
    cv3.style.visibility = m === 'map' ? 'hidden' : '';
    ctx.audio.sfx(m === 'map' ? 'map-open' : 'ui-close');
    if (m === 'map') tell(says.mapHint);
    hud();
  }
  function pickDock(px, py) {
    const c = camera(), near = ([x, y]) => Math.hypot(x - px, y - py) < 22 / c.z;
    const hit = Object.values(DOCKS).find(d => stateOf(d).why !== 'story' && near(dockWorld(d)));
    if (!hit) {
      const mark = Object.values(SKY_MARKS).find(m => near(m.world || toWorld(m.region, m.at)));
      if (mark) refuse(mark.why);
      return;
    }
    const st = stateOf(hit, 'map');
    if (!st.ok) { refuse(st.why); return; }
    ctx.audio.sfx('ui-confirm');
    S.pick = hit;
    const [sx, sy] = shipWorld(), [tx, ty] = dockWorld(hit);
    S.auto = { from: [sx, sy], to: [tx, ty], dock: hit, t: 0, dur: Math.max(1.6, Math.hypot(tx - sx, ty - sy) / AUTO_SPEED) };
    ctx.audio.sfx('sails');
  }
  function land() {
    const d = dockNear();
    if (!d || S.landing) return;
    S.landing = { dock: d, t: 0 };
    S.target = null; S.keys.clear();
    landBtn.hidden = true;
    ctx.audio.sfx('ship-land');
  }
  function arrive(d) {
    if (S.dead) return;
    const a = anchor(d.map, d.anchor);
    const g = structuredClone(ctx.game);
    g.progress.pos = { map: a.map, x: a.x, y: a.y, face: a.face || 's' };
    const f = g.progress.flags;
    f.docks = { ...(f.docks || {}), [d.id]: true, [flight.from]: true };
    if (flight.id === 'hire') f.hired = (f.hired || 0) + 1;
    ctx.setGame(g);
    ctx.go('world', { arrive: 'load' });
  }

  // ---- the loop ----
  const clouds = Array.from({ length: 6 }, (_, k) => ({ x: (k * 331) % PAINT, y: (k * 577) % PAINT_H, r: 160 + (k * 97) % 140, v: 6 + (k % 3) * 3 }));
  const puffs = Array.from({ length: 7 }, (_, k) => ({ x: (k * 419) % PAINT, y: (k * 263) % PAINT_H, r: 70 + (k * 53) % 70 }));
  const motes = [];
  const lean = { turn: 0, lastH: S.ship.h, lastV: 0, accel: 0, glow: 1.6 };
  function update(dt) {
    for (const c of clouds) { c.x += c.v * dt; if (c.x - c.r > PAINT) c.x = -c.r; }
    const sh = S.ship;
    if (S.auto) {
      const A = S.auto; A.t = Math.min(A.dur, A.t + dt);
      if (A.t >= A.dur) {
        const d = A.dock; S.auto = null; S.mode = 'region'; S.region = d.region; sh.x = d.at[0]; sh.y = d.at[1] + 30; sh.v = 0; sh.h = -Math.PI / 2;
        mapBtn.textContent = 'World map'; cv3.style.visibility = '';
        S.landing = { dock: d, t: 0 }; ctx.audio.sfx('ship-land');
      }
      return;
    }
    if (S.landing) {
      const L = S.landing; L.t += dt;
      sh.v = Math.max(0, sh.v - 200 * dt);
      sh.x += (L.dock.at[0] - sh.x) * Math.min(1, dt * 2.5); sh.y += (L.dock.at[1] - sh.y) * Math.min(1, dt * 2.5);
      sh.alt = Math.max(0, sh.alt - dt * .7);
      if (L.t > 1.8) arrive(L.dock);
      return;
    }
    sh.alt = Math.min(1, sh.alt + dt * .8);
    if (S.mode !== 'region') return;
    const d = wantDir();
    if (d && sh.alt > .35) {
      const want = Math.atan2(d[1], d[0]); const dh = ((want - sh.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      sh.h += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh)); sh.v = Math.min(FLY_SPEED, sh.v + 140 * dt);
    } else sh.v = Math.max(0, sh.v - 120 * dt);
    let nx = sh.x + Math.cos(sh.h) * sh.v * dt, ny = sh.y + Math.sin(sh.h) * sh.v * dt;
    // off this painting's edge: onto the next region's when it is in the game and open to this flight; else turn back
    if (nx < 0 || ny < 0 || nx >= PAINT || ny >= PAINT_H) {
      const next = toRegion(toWorld(S.region, [nx, ny]));
      if (next && next.region !== S.region && regionOpen(ctx.game, next.region, flight).ok) {
        S.region = next.region; nx = next.at[0]; ny = next.at[1]; S.target = null; ctx.audio.sfx('new-area'); hud();
      } else {
        // the ship turns back into the painting
        nx = Math.max(2, Math.min(PAINT - 3, nx)); ny = Math.max(2, Math.min(PAINT_H - 3, ny));
        const bx = Math.max(60, Math.min(PAINT - 60, sh.x - Math.cos(sh.h) * 240)), by = Math.max(60, Math.min(PAINT_H - 60, sh.y - Math.sin(sh.h) * 240));
        sh.v *= .5; S.keys.clear(); S.target = { x: bx, y: by };
        if (performance.now() - S.nudged > 6000) { S.nudged = performance.now(); tell(says.edge); }
      }
    }
    sh.x = nx; sh.y = ny;
    if (!reduced && sh.alt > .3) for (let k = 0; k < (sh.v > 20 ? 2 : 1); k++) if (Math.random() < dt * 30) {
      motes.push({ x: sh.x - Math.cos(sh.h) * 30 + (Math.random() - .5) * 10, y: sh.y - Math.sin(sh.h) * 30 + (Math.random() - .5) * 10, vx: (Math.random() - .5) * 8, vy: -6 - Math.random() * 8, life: 1.4, age: 0 });
    }
    for (let i = motes.length - 1; i >= 0; i--) { const m = motes[i]; m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; if (m.age > m.life) motes.splice(i, 1); }
  }
  // the lean: turn rate and acceleration, through the spring (ui/sky3d/motion.js)
  function leanStep(dt) {
    const sh = S.ship;
    const dh = ((sh.h - lean.lastH + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    lean.lastH = sh.h;
    lean.turn = dt > 0 ? dh / dt : 0;
    lean.accel = dt > 0 ? (sh.v - lean.lastV) / dt : 0; lean.lastV = sh.v;
    // the crystals burn brighter while the ship climbs (take-off) or sets down
    const want = S.landing || sh.alt < 1 ? 1.7 : 1;
    lean.glow += (want - lean.glow) * Math.min(1, dt * 2);
    return motion.step(dt, { turn: lean.turn, speed: sh.v, accel: lean.accel });
  }

  function drawShipAt(c, x, y, h, alt, len, t) {
    if (!SHIP) return;
    const { dpr } = dims, P = SHIP, k = len / P.h, sx = x * c.z + c.ox, sy = y * c.z + c.oy;
    const bob = reduced ? 0 : Math.sin(t * 1.7) * 2 * alt, rot = h + Math.PI / 2, bank = reduced ? 0 : Math.sin(t * 1.3) * .03;
    g2.setTransform(dpr, 0, 0, dpr, (sx + alt * 26) * dpr, (sy + alt * 34) * dpr); g2.rotate(rot);
    g2.globalAlpha = .38 - alt * .12; g2.imageSmoothingEnabled = true;
    const shs = (1 - alt * .12) * len; g2.drawImage(P.shadow, -shs / 2, -shs / 2, shs, shs); g2.globalAlpha = 1;
    const scl = (1 + alt * .1) * k;
    g2.setTransform(dpr, 0, 0, dpr, sx * dpr, (sy - 8 * alt + bob) * dpr); g2.rotate(rot + bank); g2.scale(scl, scl);
    g2.drawImage(P.img, -P.w / 2, -P.h / 2);
    g2.globalCompositeOperation = 'lighter'; g2.globalAlpha = (reduced ? .25 : .22 + .18 * Math.sin(t * 3.1)) * (.4 + alt * .6);
    g2.drawImage(P.glow, -P.w / 2, -P.h / 2); g2.globalAlpha *= .6; g2.drawImage(P.glow, -P.w * .54, -P.h * .54, P.w * 1.08, P.h * 1.08);
    g2.globalAlpha = 1; g2.globalCompositeOperation = 'source-over';
  }
  // a dock (or a mark) at screen point (sx, sy): lit when the ship may land; grey with a padlock and "Lv N" for a level
  // it lacks; grey with "no licence"; faint when not known yet (world map)
  const LABEL = { level: d => `Lv ${d.level?.hire ?? d.level}`, licence: () => 'no licence' };
  function drawDock(sx, sy, d, st, t, big, nameless = false) {
    const { dpr } = dims, on = st.ok, faint = st.why === 'unknown';
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    g2.globalAlpha = faint ? .45 : 1;
    const r = (big ? 9 : 7) + (on && !reduced ? Math.sin(t * 4) * 1.5 : 0);
    g2.lineWidth = 2; g2.strokeStyle = on ? 'rgba(255,203,102,.95)' : 'rgba(236,223,195,.55)';
    g2.fillStyle = on ? 'rgba(238,142,49,.35)' : 'rgba(18,14,12,.45)';
    g2.beginPath(); g2.arc(sx, sy, r, 0, Math.PI * 2); g2.fill(); g2.stroke();
    if (st.why === 'level') {
      // a small padlock in the ring
      g2.strokeStyle = '#ecdfc3'; g2.fillStyle = '#ecdfc3'; g2.lineWidth = 1.5;
      g2.beginPath(); g2.arc(sx, sy - 2, 2.6, Math.PI, 0); g2.stroke(); g2.fillRect(sx - 3.8, sy - 1.5, 7.6, 5.5);
    }
    const font = getComputedStyle(document.documentElement).getPropertyValue('--f-pixel') || 'monospace';
    g2.font = `12px ${font}`;
    g2.textAlign = 'center'; g2.lineWidth = 3; g2.strokeStyle = 'rgba(11,9,16,.9)'; g2.fillStyle = on ? '#ffcb66' : '#ecdfc3';
    if (!nameless) { g2.strokeText(d.name, sx, sy - r - 6); g2.fillText(d.name, sx, sy - r - 6); }
    const note = big ? LABEL[st.why]?.(d) : null;   // the notes only at 1x (the world map is too small for them)
    if (note) { g2.font = `10px ${font}`; g2.strokeText(note, sx, sy + r + 13); g2.fillText(note, sx, sy + r + 13); }
    g2.globalAlpha = 1;
  }
  function drawArrow(t) {
    // where the destination lies, when it is off the screen or on another painting
    const dest = heading(); if (!dest) return;
    const { dpr } = dims, [wx, wy] = shipWorld(), [dx, dy] = toWorld(dest.region, dest.at);
    const [px, py] = toScreen(dest.at[0], dest.at[1]);
    const onScreen = dest.region === S.region && Math.abs(px - dims.cw / 2) < dims.cw / 2 - 20 && Math.abs(py - dims.ch / 2) < dims.ch / 2 - 20;
    if (onScreen) return;
    const ang = Math.atan2(dy - wy, dx - wx), rx = dims.cw / 2 - 34, ry = dims.ch / 2 - 70;
    const k = Math.min(Math.abs(rx / Math.cos(ang) || 1e9), Math.abs(ry / Math.sin(ang) || 1e9));
    const ax = dims.cw / 2 + Math.cos(ang) * k, ay = dims.ch / 2 + Math.sin(ang) * k;
    g2.setTransform(dpr, 0, 0, dpr, ax * dpr, ay * dpr); g2.rotate(ang);
    g2.fillStyle = 'rgba(255,203,102,.95)'; g2.strokeStyle = 'rgba(11,9,16,.9)'; g2.lineWidth = 3;
    g2.beginPath(); g2.moveTo(14, 0); g2.lineTo(-8, -10); g2.lineTo(-3, 0); g2.lineTo(-8, 10); g2.closePath(); g2.stroke(); g2.fill();
  }
  // the region's docks and marks, the steering ring, motes and high clouds, on the 2D canvas (over the 3D view)
  function drawRegionOverlay(t) {
    const { dpr } = dims, alt = S.ship.alt;
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.target) {
      const [x, y] = toScreen(S.target.x, S.target.y);
      g2.strokeStyle = 'rgba(234,165,62,.85)'; g2.lineWidth = 1.6; g2.beginPath(); g2.arc(x, y, 5 + Math.sin(t * 6) * 1.2, 0, Math.PI * 2); g2.stroke();
    }
    for (const d of Object.values(DOCKS)) {
      if (d.region !== S.region) continue;
      const st = stateOf(d); if (st.why === 'story') continue;
      // the name steps aside while the ship sits right over the dock (the Land button names it)
      const over = Math.hypot(d.at[0] - S.ship.x, d.at[1] - S.ship.y) < 40;
      const [x, y] = toScreen(d.at[0], d.at[1]); drawDock(x, y, d, st, t, true, over);
    }
    for (const m of Object.values(SKY_MARKS)) if (m.region === S.region) { const [x, y] = toScreen(m.at[0], m.at[1]); drawDock(x, y, m, { ok: false, why: m.why }, t, true); }
    g2.setTransform(1, 0, 0, 1, 0, 0);
    for (const mo of motes) {
      const a = 1 - mo.age / mo.life, [x, y] = toScreen(mo.x, mo.y, three ? 60 * alt : 0);
      g2.fillStyle = `rgba(255,${190 + 40 * a | 0},110,${.8 * a})`; g2.beginPath(); g2.arc(x * dpr, (y - (three ? 0 : 8 * alt)) * dpr, (1.2 + a * 1.4) * dpr, 0, Math.PI * 2); g2.fill();
    }
    // high clouds drift past above the ship, faster than the ground
    if (alt > .05) {
      const [gx, gy] = toScreen(0, 0);
      for (const p of puffs) {
        const cx = -gx + dims.cw / 2, cy = -gy + dims.ch / 2;
        const px = ((p.x - cx * 1.35 + t * 9) % 1800 + 1800) % 1800 - 130, py = ((p.y - cy * 1.35) % 1150 + 1150) % 1150 - 60;
        const x = px * .7, y = py * .7, r = p.r * .7, gr = g2.createRadialGradient(x * dpr, y * dpr, 0, x * dpr, y * dpr, r * dpr);
        gr.addColorStop(0, `rgba(255,248,236,${.2 * alt})`); gr.addColorStop(1, 'rgba(255,248,236,0)'); g2.fillStyle = gr; g2.fillRect((x - r) * dpr, (y - r) * dpr, r * 2 * dpr, r * 2 * dpr);
      }
    }
    drawArrow(t);
  }
  // the next region's painting beside this one, when the ship is near their shared edge and may cross it (3D only)
  function neighbours() {
    const R = SKY_REGIONS[S.region], out = [], reach = Math.max(dims.cw, dims.ch);
    for (const N of Object.values(SKY_REGIONS)) {
      const dc = N.col - R.col, dr = N.row - R.row;
      if (Math.abs(dc) + Math.abs(dr) !== 1 || !regionOpen(ctx.game, N.id, flight).ok) continue;
      const gap = dc > 0 ? PAINT - S.ship.x : dc < 0 ? S.ship.x : dr > 0 ? PAINT_H - S.ship.y : S.ship.y;
      if (gap < reach) out.push({ id: N.id, image: imageOf(N.id), dx: dc * PAINT, dy: dr * PAINT_H });
    }
    return out;
  }
  function draw(t, dt) {
    const { dpr } = dims, c = camera();
    g2.setTransform(1, 0, 0, 1, 0, 0);
    if (S.mode === 'map' || S.auto) {
      g2.fillStyle = '#0a1214'; g2.fillRect(0, 0, cv.width, cv.height);
      const m = imageOf('continent');
      g2.setTransform(c.z * dpr, 0, 0, c.z * dpr, c.ox * dpr, c.oy * dpr); g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high';
      if (m.complete && m.naturalWidth) g2.drawImage(m, 0, 0, PAINT, PAINT_H);
      // the regions the airship knows, outlined
      g2.lineWidth = 2 / c.z; g2.strokeStyle = 'rgba(255,203,102,.35)';
      for (const R of Object.values(SKY_REGIONS)) g2.strokeRect(R.col * 512, R.row * 512, 512, 512);
      // a story flight's route (a hire flight has none)
      if (to) {
        const a = dockWorld(from), b = dockWorld(to);
        g2.setLineDash([8 / c.z, 6 / c.z]); g2.strokeStyle = 'rgba(255,203,102,.8)'; g2.beginPath(); g2.moveTo(a[0], a[1]); g2.lineTo(b[0], b[1]); g2.stroke(); g2.setLineDash([]);
      }
      const sc = ([x, y]) => [x * c.z + c.ox, y * c.z + c.oy];
      for (const d of Object.values(DOCKS)) {
        const st = stateOf(d, 'map'); if (st.why === 'story') continue;
        const [x, y] = sc(dockWorld(d)); drawDock(x, y, d, st, t, false);
      }
      for (const mk of Object.values(SKY_MARKS)) { const [x, y] = sc(mk.world || toWorld(mk.region, mk.at)); drawDock(x, y, mk, { ok: false, why: mk.why }, t, false); }
      let p = shipWorld(), h = S.ship.h;
      if (S.auto) {
        const A = S.auto, k = A.t / A.dur, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        p = [A.from[0] + (A.to[0] - A.from[0]) * e, A.from[1] + (A.to[1] - A.from[1]) * e - Math.sin(Math.PI * k) * 20];
        h = Math.atan2(A.to[1] - A.from[1], A.to[0] - A.from[0]);
      }
      drawShipAt(c, p[0], p[1], h, 1, 30, t);
      return;
    }
    const m = leanStep(dt);
    if (three) {
      try {
        three.setRegion(S.region, imageOf(S.region), neighbours());
        three.frame(dt, { ship: S.ship, motion: m, turn: lean.turn, speed: S.ship.v, glow: lean.glow });
      } catch { drop3d(); }
    }
    if (three) {
      g2.clearRect(0, 0, cv.width, cv.height);
    } else {
      g2.fillStyle = '#0a1214'; g2.fillRect(0, 0, cv.width, cv.height);
      const im = imageOf(S.region);
      g2.setTransform(c.z * dpr, 0, 0, c.z * dpr, c.ox * dpr, c.oy * dpr); g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high';
      if (im.complete && im.naturalWidth) g2.drawImage(im, 0, 0, PAINT, PAINT_H);
      for (const cl of clouds) { const gr = g2.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.r); gr.addColorStop(0, 'rgba(8,16,24,.2)'); gr.addColorStop(1, 'rgba(8,16,24,0)'); g2.fillStyle = gr; g2.fillRect(cl.x - cl.r, cl.y - cl.r, cl.r * 2, cl.r * 2); }
    }
    if (!three && !S.hideShip) drawShipAt(c, S.ship.x, S.ship.y, S.ship.h, S.ship.alt, 88, t);
    drawRegionOverlay(t);
  }

  function hud() {
    const R = SKY_REGIONS[S.region];
    where.textContent = S.mode === 'map' || S.auto ? 'Aethermoor' : R.name;
    const dest = to || S.pick;
    aim.textContent = S.landing ? `Landing at ${S.landing.dock.name}` : S.auto ? `Flying to ${S.auto.dock.name}`
      : dest ? `To ${dest.name}: ${bearing(shipWorld(), toWorld(dest.region, dest.at))}` : 'Rented skiff: licensed docks only';
    const near = !S.landing && !S.auto && S.mode === 'region' && S.ship.alt > .5 ? dockNear() : null;
    landBtn.hidden = !near;
    if (near) landBtn.textContent = `Land at ${near.name}`;
    mapBtn.hidden = !!(S.landing || S.auto);
  }

  // test seam (tools/e2e-sky3d.mjs): which view draws, the ship's lean and where it is on the screen; hide or move the ship
  if (typeof globalThis.__aethTest === 'function') {
    window.__sky = {
      state: () => {
        const h = three ? three.shipHeight : 0, [sx, sy] = toScreen(S.ship.x, S.ship.y, h);
        return { view: stage.dataset.sky, mode: S.mode, region: S.region, ship: { ...S.ship }, bank: motion.state.bank * 180 / Math.PI, screen: [sx, sy], pick: S.pick?.id || null, aim: aim.textContent, say: say.hidden ? '' : say.textContent };
      },
      showShip(on) { S.hideShip = !on; three?.setShipVisible(on); },
      place(x, y, h) { Object.assign(S.ship, { x, y, h }); S.target = null; },
      // T2 e2e: a painting point (x, y) at 1x, in page px (to tap a dock or the Fjords mark)
      screenOf(x, y) { const r = cv.getBoundingClientRect(), [sx, sy] = toScreen(x, y); return [r.left + sx, r.top + sy]; },
    };
  }

  let last = performance.now(), raf = 0, hudT = 0;
  const frame = now => {
    if (S.dead) return;
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    update(dt); draw(now / 1000, dt);
    if ((hudT += dt) > .2) { hudT = 0; hud(); }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  ctx.audio.sfx('ship-takeoff');
  setTimeout(nextLine, 700);
  hud();

  return {
    unmount() {
      S.dead = true; cancelAnimationFrame(raf); clearTimeout(sayTimer); ro.disconnect();
      removeEventListener('keydown', onDown); removeEventListener('keyup', onUp);
      drop3d();
      if (window.__sky) delete window.__sky;
    },
  };
}
