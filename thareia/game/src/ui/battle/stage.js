// The battle stage: one pixel canvas at an integer scale holding the backdrop (with its ambient
// animation), the foe formation, and the hit/relic/phase effects. DOM overlays (plates, intent
// dice, grip meters, numbers) are positioned from geom(), in CSS px relative to the stage box.
// M5: sink(id, down) takes a burrowed foe under the floor (all but the top of it, over a mound of
// rubble) and brings it back up; no target marker is ever drawn on it (it is never a valid target).
// M6: sink(id, down, { water: true }) is a dive into black water (the Blackwater Leviathan): rings and a
// churn of foam where it went down, in place of the rubble; a foe whose art has a dive pose (FOE_ART[..].dive) is
// drawn in it while under (its fluke going down, its own whirlpool), with the rings. A fight on a foggy map
// ({ fog: true }) has mist lying low over the ground, drifting behind the foes, unless its backdrop draws its own
// (a listing with mist: true: the Lanternfen, the Misthollow Ruins). posed(id): the pose a foe was last drawn in.
import { renderBackdrop, BACKDROPS } from '../../art/scenes.js';
import { PAINTED_BACKDROPS } from '../../art/painted-backdrops.js';
import { itemIcon, RELIC_ART, ASPECT_LOOK } from '../../art/item-looks.js';
import { FoeSprite } from './sprites.js';
import { clamp, lerp, easeOut, hexRgb } from './util.js';

// CSS px reserved above the tallest foe (intent bubble) and below the feet (name plate).
export const TOP_CSS = 50;
const BOT_PLAIN = 62, BOT_HELD = 92; // CSS px under the feet: plate (plus a row of grip meters)
const MIN_SLOT = 44; // logical px per foe, so plates stay readable
const SINK = 0.78; // how much of a burrowed foe's figure goes under the floor

const HIT_TINT = [255, 255, 255, 0.75];

export class Stage {
  constructor(host, { backdrop, reduced, dark = false, fog = false }) {
    this.host = host;
    this.backdropKey = BACKDROPS[backdrop] ? backdrop : 'hearth-road';
    this.reduced = reduced;
    this.dark = !!dark; // a fight in a dark map (battle.ctx.dark): renderBackdrop's dark treatment; the foes stay lit
    this.fog = !!fog && !BACKDROPS[this.backdropKey].mist; // M6: a foggy map's fight: the mist layer (bakeMist), if its backdrop has none
    this.mist = null;
    this.speed = 1;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'bt-stage-cv px';
    this.canvas.setAttribute('aria-hidden', 'true');
    host.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.bd = document.createElement('canvas');
    this.bdT = -1;
    this.foes = new Map(); // id -> visual state
    this.order = [];
    this.effects = [];
    this.dropped = []; // relics lying on the floor after a disarm
    this.targets = new Set();
    this.focusId = null;
    this.actorId = null;
    this.s = 2; this.lw = 180; this.lh = 120; this.ox = 0; this.oy = 0;
    this.dirty = true;
    this.version = 0;
  }

  // ---- foes ------------------------------------------------------------------------------------
  addFoe(unit, { spawn = false } = {}) {
    if (this.foes.has(unit.id)) return this.foes.get(unit.id);
    const v = {
      id: unit.id, sprite: new FoeSprite(unit, this.reduced), x: null, tx: 0, dy: 0, held: !!(unit.held && unit.held.length),
      pose: unit.ko ? 'ko' : 'idle', base: unit.ko ? 'ko' : 'idle', poseUntil: 0, attackAt: 0,
      shakeUntil: 0, flashUntil: 0, tint: null, alpha: 1, fade: null, removed: !!(unit.ko || unit.gone), lunge: 0, lungeAt: 0,
    };
    if (spawn) v.fade = { kind: 'spawn', start: performance.now(), dur: 650 / this.speed };
    this.foes.set(unit.id, v);
    this.order.push(unit.id);
    return v;
  }
  setLook(id, unit) {
    const v = this.foes.get(id);
    if (v && v.sprite.setUnit(unit)) { this.dirty = true; return true; }
    return false;
  }
  visible() { return this.order.map(id => this.foes.get(id)).filter(v => !v.removed); }

  // integer scale that fits the formation (plus room for summons) inside the stage box
  chooseScale(cssW, cssH, extraSlots = 0) {
    const vis = this.visible();
    const figs = vis.map(v => v.sprite);
    const maxS = cssW >= 760 ? 5 : cssW >= 560 ? 4 : 3;
    for (let s = maxS; s >= 2; s--) {
      const lw = Math.floor(cssW / s), lh = Math.floor(cssH / s);
      const top = Math.ceil(TOP_CSS / s), bot = Math.ceil(this.botCss / s);
      const tall = Math.max(40, ...figs.map(f => f.box.y1 - f.box.y0));
      const minSlot = Math.ceil(96 / s);
      const wide = figs.reduce((a, f) => a + Math.max(minSlot, f.box.x1 - f.box.x0 + 8), 0) + extraSlots * Math.max(minSlot, 38) + 8;
      if (tall + top + bot + 2 <= lh && wide <= lw) return s;
    }
    return 2;
  }

  layout(extraSlots = 0) {
    this.botCss = [...this.foes.values()].some(v => v.held) ? BOT_HELD : BOT_PLAIN;
    const r = this.host.getBoundingClientRect();
    const cssW = Math.max(160, Math.round(r.width)), cssH = Math.max(140, Math.round(r.height));
    if (!this.fixedScale || this.cssW !== cssW || this.cssH !== cssH) {
      this.s = this.chooseScale(cssW, cssH, extraSlots);
      this.cssW = cssW; this.cssH = cssH;
    }
    const s = this.s;
    this.lw = Math.ceil(cssW / s);
    this.lh = Math.ceil(cssH / s);
    this.ox = Math.floor((cssW - this.lw * s) / 2);
    this.oy = Math.floor((cssH - this.lh * s) / 2);
    this.canvas.width = this.lw;
    this.canvas.height = this.lh;
    Object.assign(this.canvas.style, { width: `${this.lw * s}px`, height: `${this.lh * s}px`, left: `${this.ox}px`, top: `${this.oy}px` });
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.floorY = this.lh - Math.ceil(this.botCss / s) - 1;
    // a short stage keeps every figure whole; the plates then overlap the legs (see Hud.place)
    const need = Math.max(0, ...this.visible().map(v => v.sprite.def.foot[1] - v.sprite.box.y0)) + 3;
    if (this.floorY < need) this.floorY = Math.min(this.lh - 3, need);
    this.bdT = -1;
    this.mist = this.fog ? this.bakeMist() : null;
    this.formation(true);
    this.dirty = true;
  }

  // M6: the mist a foggy map's fight lies in: soft banks of pale dither, thickest just above the floor and thinning
  // upward, two stage-widths wide and repeating every one, so it can drift across without a seam
  bakeMist() {
    const W = Math.max(8, this.lw), w = W * 2, h = Math.max(8, Math.round(this.lh * 0.5));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h), d = img.data;
    const cell = 22, m = Math.max(1, Math.round(W / cell));
    const hash = (x, y) => { let q = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; q = Math.imul(q ^ (q >>> 13), 1274126177); return ((q ^ (q >>> 16)) >>> 0) / 4294967296; };
    const noise = (x, y) => {
      const gx = (x % W) / W * m, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      const v = (i, j) => hash((x0 + i) % m, y0 + j);
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return (v(0, 0) * (1 - sx) + v(1, 0) * sx) * (1 - sy) + (v(0, 1) * (1 - sx) + v(1, 1) * sx) * sy;
    };
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < h; y++) {
      const u = y / (h - 1), band = Math.min(1, u * 1.6) * (u > 0.85 ? (1 - u) / 0.15 : 1);
      for (let x = 0; x < w; x++) {
        const a = band * (0.35 + 0.65 * noise(x, y)) * 0.5;
        const k = (y * w + x) * 4, lvl = a * 3 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5);
        const q = Math.max(0, Math.min(3, Math.round(lvl)));
        d[k] = 188; d[k + 1] = 202; d[k + 2] = 194; d[k + 3] = [0, 60, 110, 150][q];
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // slot centres, proportional to each figure's width; reflows smoothly after a KO or spawn
  formation(snap = false) {
    this.version = (this.version || 0) + 1;
    const vis = this.visible();
    const minSlot = Math.max(MIN_SLOT * 2 / this.s, 90 / this.s);
    const widths = vis.map(v => Math.max(minSlot, v.sprite.box.x1 - v.sprite.box.x0 + 8));
    const sum = widths.reduce((a, b) => a + b, 0);
    const k = sum > this.lw - 4 ? (this.lw - 4) / sum : 1;
    const gap = k < 1 ? 2 : (this.lw - sum) / (vis.length + 1);
    let x = k < 1 ? 2 : gap;
    vis.forEach((v, i) => {
      const w = widths[i] * k;
      v.tx = x + w / 2;
      v.slotW = w + (k < 1 ? 0 : gap * 0.8);
      v.depth = vis.length >= 3 && i % 2 === 1 ? -4 : 0;
      if (snap || v.x == null) v.x = v.tx;
      x += w + (k < 1 ? 0 : gap);
    });
  }

  // the pose a foe was last drawn in ('idle', 'hurt', 'attack', 'ko'; M6 'dive'), or null (the e2e harness reads it)
  posed(id) { return this.foes.get(id)?.drawn || null; }

  // where a foe sits, in CSS px relative to the stage box (a sunk foe's top is where it shows above the
  // floor, so its intent bubble follows it down)
  geom(id) {
    const v = this.foes.get(id);
    if (!v || v.x == null) return null;
    const sp = v.sprite, s = this.s, b = sp.box;
    const foot = sp.def.foot;
    const drawX = Math.round(v.tx - (b.x0 + b.x1) / 2);
    const drawY = this.floorY - foot[1] + v.depth;
    const top = v.sinkTo ? drawY + b.y1 - Math.max(1, Math.round((b.y1 - b.y0) * (1 - SINK))) : drawY + b.y0;
    return {
      cx: this.ox + v.tx * s,
      left: this.ox + (drawX + b.x0) * s, right: this.ox + (drawX + b.x1) * s,
      top: this.oy + top * s, bottom: this.oy + (drawY + b.y1) * s,
      floor: this.oy + (this.floorY + 1) * s,
      slotW: v.slotW * s, s, stageH: this.cssH, sunk: !!v.sinkTo,
    };
  }
  // a point on the sprite (anchor name) in logical stage px; 'feet' is where it meets the floor
  point(id, name = 'center') {
    const v = this.foes.get(id);
    if (!v || v.x == null) return [this.lw / 2, this.lh / 2];
    if (name === 'feet') return [Math.round(v.x), this.floorY + v.depth - 1];
    const sp = v.sprite, b = sp.box, foot = sp.def.foot;
    const drawX = Math.round(v.x - (b.x0 + b.x1) / 2), drawY = this.floorY - foot[1] + v.depth;
    const a = (sp.poseAnchors && sp.poseAnchors[name]) || sp.anchors[name] || sp.anchors.center || [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
    return [drawX + a[0], drawY + a[1]];
  }

  // ---- animation hooks (called by the event player) ------------------------------------------
  now() { return performance.now(); }
  setPose(id, pose, ms) {
    const v = this.foes.get(id);
    if (!v) return;
    v.pose = pose;
    v.poseUntil = ms ? this.now() + ms / this.speed : 0;
    if (!ms) v.base = pose;
    this.dirty = true;
  }
  attack(id, ms = 520) {
    const v = this.foes.get(id);
    if (!v) return;
    v.pose = 'attack';
    v.attackAt = this.now();
    v.poseUntil = v.attackAt + ms / this.speed;
    v.lungeAt = v.attackAt;
    v.lungeDur = ms / this.speed;
  }
  hurt(id, { big = false } = {}) {
    const v = this.foes.get(id);
    if (!v) return;
    const t = this.now();
    v.pose = 'hurt';
    v.poseUntil = t + (big ? 520 : 380) / this.speed;
    if (!this.reduced) v.shakeUntil = t + (big ? 360 : 240) / this.speed;
    if (!this.reduced) { v.flashUntil = t + 110 / this.speed; v.tint = HIT_TINT; }
  }
  ko(id) {
    const v = this.foes.get(id);
    if (!v) return;
    v.base = 'ko';
    v.pose = 'ko';
    v.poseUntil = 0;
    v.fade = { kind: 'ko', start: this.now() + 420 / this.speed, dur: 520 / this.speed };
  }
  escape(id, kind = 'run') {
    const v = this.foes.get(id);
    if (!v) return;
    v.fade = { kind: kind === 'wither' ? 'wither' : 'run', start: this.now(), dur: 620 / this.speed };
  }
  revive(id) {
    const v = this.foes.get(id);
    if (!v) return;
    v.removed = false; v.fade = null; v.alpha = 1; v.base = 'idle'; v.pose = 'idle';
    this.formation();
  }
  // M5: a burrowed foe goes down into the floor (down) or comes back up; animated over ~0.4 s. M6: `water`, a
  // dive under the water's face
  sink(id, down = true, { water = false } = {}) {
    const v = this.foes.get(id);
    if (!v) return;
    if (down) v.water = !!water;
    const want = down ? 1 : 0;
    if ((v.sinkTo || 0) === want) return;
    const t = this.now();
    v.sinkFrom = this.sinkOf(v, t);
    v.sinkTo = want;
    v.sinkAt = t;
    v.sinkDur = (this.reduced ? 1 : 420) / this.speed;
    this.version = (this.version || 0) + 1; // the plate and the intent bubble follow it
    this.dirty = true;
  }
  sinkOf(v, t) {
    if (!v.sinkAt) return v.sinkTo || 0;
    const u = clamp((t - v.sinkAt) / Math.max(1, v.sinkDur), 0, 1);
    return lerp(v.sinkFrom || 0, v.sinkTo || 0, easeOut(u));
  }
  // M5: a flash of colour on one foe (a charm)
  flashUnit(id, tint, ms = 300) {
    const v = this.foes.get(id);
    if (!v || this.reduced) return;
    v.tint = tint; v.flashUntil = this.now() + ms / this.speed;
  }
  // true while any foe is still fading out (the player waits for reflow before the next beat)
  finishFades(t) {
    let changed = false;
    for (const v of this.foes.values()) {
      if (!v.fade || v.fade.kind === 'spawn') continue;
      if (t >= v.fade.start + v.fade.dur) { v.removed = true; v.fade = null; changed = true; }
    }
    if (changed) this.formation();
    return changed;
  }

  // ---- effects -----------------------------------------------------------------------------------
  fx(e) { e.start = e.start ?? this.now(); e.dur = (e.dur || 400) / this.speed; this.effects.push(e); return e; }

  // pixel sparks bursting from a point
  sparks(x, y, color = '#fff4c0', n = 12, { spread = 1, up = 1 } = {}) {
    if (this.reduced) n = Math.min(n, 4);
    const rgb = Array.isArray(color) ? color : hexRgb(color);
    const ps = Array.from({ length: n }, () => {
      const a = Math.random() * Math.PI * 2, sp = (18 + Math.random() * 38) * spread;
      return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 22 * up, c: Math.random() < 0.3 ? [255, 255, 255] : rgb };
    });
    this.fx({ dur: 480, draw: (ctx, u) => {
      const tt = u * 0.48;
      for (const p of ps) {
        const px = Math.round(x + p.vx * tt), py = Math.round(y + p.vy * tt + 70 * tt * tt);
        ctx.globalAlpha = 1 - u;
        ctx.fillStyle = `rgb(${p.c[0]},${p.c[1]},${p.c[2]})`;
        ctx.fillRect(px, py, 1, 1);
      }
      ctx.globalAlpha = 1;
    } });
  }
  // a quick diagonal slash across a target
  slash(id, color = '#ffffff', crit = false) {
    const [x, y] = this.point(id, 'center');
    const rgb = hexRgb(color);
    const len = crit ? 22 : 15;
    this.fx({ dur: 260, draw: (ctx, u) => {
      const k = easeOut(Math.min(1, u * 1.6));
      ctx.globalAlpha = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
      for (let i = 0; i < len * k; i++) {
        const px = Math.round(x - len / 2 + i), py = Math.round(y - len / 2 + i);
        ctx.fillStyle = i > len * k - 3 ? '#ffffff' : `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        ctx.fillRect(px, py, 1, 1);
        if (crit) ctx.fillRect(px + 1, py, 1, 1);
      }
      ctx.globalAlpha = 1;
    } });
  }
  // an arrow or bolt rising from the party (bottom edge) to a foe
  projectile(fromX, id, kind = 'arrow', color = '#f4e2b8') {
    const [tx, ty] = this.point(id, 'center');
    const sx = clamp(fromX, 4, this.lw - 4), sy = this.lh + 4;
    const rgb = hexRgb(color);
    return this.fx({ dur: 240, draw: (ctx, u) => {
      const x = lerp(sx, tx, u), y = lerp(sy, ty, u);
      const dx = tx - sx, dy = ty - sy, L = Math.hypot(dx, dy) || 1;
      const n = kind === 'arrow' ? 6 : 3;
      for (let i = 0; i < n; i++) {
        const px = Math.round(x - dx / L * i), py = Math.round(y - dy / L * i);
        ctx.fillStyle = i === 0 ? '#ffffff' : `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        ctx.globalAlpha = kind === 'arrow' ? 1 : 1 - i / n;
        ctx.fillRect(px, py, kind === 'arrow' ? 1 : 2, kind === 'arrow' ? 1 : 2);
      }
      ctx.globalAlpha = 1;
    } });
  }
  // an expanding pixel ring (phase change, legend surge impact)
  ring(x, y, color = '#ffcb66', r1 = 40, dur = 600) {
    const rgb = hexRgb(color);
    this.fx({ dur, draw: (ctx, u) => {
      const r = easeOut(u) * r1;
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(1 - u) * 0.9})`;
      const n = Math.max(12, Math.round(r * 3));
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.55), 1, 1);
      }
    } });
  }
  flash(color = '#ffffff', dur = 260, alpha = 0.7) {
    if (this.reduced) return;
    this.fx({ dur, draw: (ctx, u) => { ctx.fillStyle = color; ctx.globalAlpha = alpha * (1 - u); ctx.fillRect(0, 0, this.lw, this.lh); ctx.globalAlpha = 1; } });
  }

  // the relic flies off the holder, tumbles in 90-degree steps and lands glinting on the floor
  relicFly(id, relicId, item) {
    const art = item || RELIC_ART[relicId];
    let icon = null;
    try { icon = itemIcon(art, { size: 16 }); } catch { icon = null; }
    const v = this.foes.get(id);
    if (!icon || !v) return null;
    const cv = document.createElement('canvas');
    cv.width = 16; cv.height = 16; cv.getContext('2d').putImageData(icon, 0, 0);
    const relics = v.sprite.anchors.relics || [];
    const rp = this.point(id, 'relic');
    const which = v.sprite.def.relics ? v.sprite.def.relics.indexOf(relicId) : -1;
    let [x0, y0] = rp;
    if (which >= 0 && relics[which]) {
      const b = v.sprite.box, foot = v.sprite.def.foot;
      x0 = Math.round(v.x - (b.x0 + b.x1) / 2) + relics[which][0];
      y0 = this.floorY - foot[1] + v.depth + relics[which][1];
    }
    const side = v.x > this.lw / 2 ? -1 : 1;
    const x1 = clamp(v.x + side * (v.sprite.box.x1 - v.sprite.box.x0) * 0.45 + side * 6, 10, this.lw - 10);
    const y1 = this.floorY - 3;
    const drop = { canvas: cv, x: x1, y: y1, id, t0: this.now() };
    this.fx({ dur: 900, draw: (ctx, u) => {
      const x = lerp(x0, x1, u), y = lerp(y0, y1, u) - Math.sin(u * Math.PI) * 26;
      const rot = this.reduced ? 0 : Math.floor(u * 8) % 4;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(rot * Math.PI / 2);
      ctx.drawImage(cv, -8, -8);
      ctx.restore();
      if (!this.reduced && Math.floor(u * 12) % 2 === 0) this.star(ctx, Math.round(x) + 6, Math.round(y) - 6, '#fff8d8');
    } });
    this.fx({ start: this.now() + 900 / this.speed, dur: 10, draw: () => { if (!this.dropped.includes(drop)) this.dropped.push(drop); } });
    return drop;
  }
  star(ctx, x, y, color = '#ffffff', big = false) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y - (big ? 2 : 1), 1, big ? 5 : 3);
    ctx.fillRect(x - (big ? 2 : 1), y, big ? 5 : 3, 1);
  }

  // ---- drawing -------------------------------------------------------------------------------------
  // true while something moves (callers keep the loop at full rate)
  busy(t) {
    if (this.effects.length) return true;
    for (const v of this.foes.values()) {
      if (v.fade || (v.poseUntil && t < v.poseUntil) || t < v.shakeUntil || Math.abs(v.x - v.tx) > 0.3) return true;
      if (v.sinkAt && t < v.sinkAt + v.sinkDur) return true;
    }
    return false;
  }

  draw(t, clockT) {
    const ctx = this.ctx, lw = this.lw, lh = this.lh;
    // backdrop at ~8 fps (static when reduced)
    const bq = this.reduced ? 0 : Math.floor(clockT * 8);
    if (bq !== this.bdT) {
      this.bdT = bq;
      const img = renderBackdrop(this.backdropKey, { w: lw, h: lh, t: this.reduced ? 0 : clockT, reduced: this.reduced, dark: this.dark, painted: !!PAINTED_BACKDROPS[this.backdropKey] });
      if (this.bd.width !== lw || this.bd.height !== lh) { this.bd.width = lw; this.bd.height = lh; }
      this.bd.getContext('2d').putImageData(img, 0, 0);
    }
    ctx.clearRect(0, 0, lw, lh);
    ctx.drawImage(this.bd, 0, 0);
    // M6: the mist of a foggy map, drifting slowly (still when motion is reduced), its thickest just above the floor
    if (this.mist) ctx.drawImage(this.mist, -(this.reduced ? 0 : Math.floor(clockT * 3) % this.lw), this.floorY - this.mist.height + Math.round(this.mist.height * 0.2));
    // floor vignette so plates read
    const g = ctx.createLinearGradient(0, this.floorY - 2, 0, lh);
    g.addColorStop(0, 'rgba(11,9,16,0)');
    g.addColorStop(1, 'rgba(11,9,16,0.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, this.floorY - 2, lw, lh - this.floorY + 2);

    this.finishFades(t);
    // relics lying where they fell
    for (const d of this.dropped) {
      ctx.drawImage(d.canvas, Math.round(d.x - 8), Math.round(d.y - 12));
      if (!this.reduced) {
        const ph = ((clockT + d.x * 0.01) % 2.2) / 2.2;
        if (ph < 0.12) this.star(ctx, Math.round(d.x + 3), Math.round(d.y - 9), '#fffbe8', ph > 0.04 && ph < 0.09);
      }
    }
    // foes, back row first
    const list = [...this.foes.values()].filter(v => !v.removed && v.x != null).sort((a, b) => a.depth - b.depth || a.tx - b.tx);
    for (const v of list) this.drawFoe(ctx, v, t, clockT);
    // target markers
    for (const v of list) {
      if (this.targets.has(v.id)) this.marker(ctx, v, clockT, v.id === this.focusId);
      else if (v.id === this.actorId && !this.targets.size) this.actorMark(ctx, v, clockT);
    }
    // effects
    this.effects = this.effects.filter(e => {
      if (t < e.start) return true;
      const u = clamp((t - e.start) / e.dur, 0, 1);
      e.draw(ctx, u, t);
      return u < 1;
    });
    this.dirty = false;
  }

  drawFoe(ctx, v, t, clockT) {
    if (v.x !== v.tx) v.x = Math.abs(v.tx - v.x) < 0.3 ? v.tx : v.x + (v.tx - v.x) * 0.18;
    if (v.poseUntil && t >= v.poseUntil) { v.pose = v.base; v.poseUntil = 0; }
    if (v.flashUntil && t >= v.flashUntil) { v.tint = null; v.flashUntil = 0; }
    const sp = v.sprite, b = sp.box, foot = sp.def.foot;
    let pose = v.pose, at = clockT;
    if (pose === 'attack') at = (t - v.attackAt) / Math.max(1, v.poseUntil - v.attackAt) < 0.42 ? 0.1 : 0.6;
    let dx = 0, dy = 0, alpha = 1, clipBottom = 0;
    if (t < v.shakeUntil) dx = (Math.floor(t / 40) % 2 ? 1 : -1) * 2;
    if (v.lungeAt && t < v.lungeAt + v.lungeDur) {
      const u = (t - v.lungeAt) / v.lungeDur;
      if (u > 0.4) dy = Math.round(Math.sin((u - 0.4) / 0.6 * Math.PI) * 5);
      else dy = -Math.round(Math.sin(u / 0.4 * Math.PI) * 1);
    }
    if (v.fade) {
      const u = clamp((t - v.fade.start) / v.fade.dur, 0, 1);
      if (v.fade.kind === 'ko') alpha = t < v.fade.start ? 1 : 1 - u;
      else if (v.fade.kind === 'run') { dx -= Math.round(easeOut(u) * 60); alpha = 1 - u; }
      else if (v.fade.kind === 'wither') { clipBottom = u; alpha = 1 - u * 0.6; }
      else if (v.fade.kind === 'spawn') { clipBottom = 1 - u; if (u >= 1) v.fade = null; }
    }
    const sunk = this.sinkOf(v, t);
    // M6: once half under the water, a foe with a dive pose is drawn diving (the art draws the water it goes into)
    const diving = !!(v.water && sp.def.dive && sunk >= 0.5);
    if (diving) pose = 'dive';
    v.drawn = pose;
    const frame = sp.frame(pose, at, v.tint);
    const drawX = Math.round(v.x - (b.x0 + b.x1) / 2) + dx;
    const drawY = this.floorY - foot[1] + v.depth + dy;
    // shadow
    if ((pose !== 'ko' || alpha > 0.3) && sunk < 0.5) {
      const sw = Math.round((b.x1 - b.x0) * 0.42), fy = this.floorY + v.depth;
      ctx.fillStyle = `rgba(0,0,0,${0.32 * alpha})`;
      ctx.fillRect(Math.round(v.x - sw), fy - 1, sw * 2, 2);
      ctx.fillRect(Math.round(v.x - sw * 0.7), fy + 1, Math.round(sw * 1.4), 1);
    }
    ctx.globalAlpha = alpha;
    if (diving) {
      ctx.drawImage(frame, drawX, drawY);
      ctx.globalAlpha = 1;
      this.wake(ctx, v, sunk, clockT, { rim: false });
      return;
    }
    if (sunk > 0.001) {
      // M5: under the floor: only the top of the figure shows, over the rubble it went down through
      const fh = b.y1 - b.y0, visH = Math.max(1, Math.round(fh * (1 - sunk * SINK)));
      ctx.drawImage(frame, 0, b.y0, frame.width, visH, drawX, drawY + b.y1 - visH, frame.width, visH);
      ctx.globalAlpha = 1;
      if (v.water) this.wake(ctx, v, sunk, clockT); else this.mound(ctx, v, sunk, clockT);
      return;
    }
    if (clipBottom > 0) {
      // rising out of (or sinking into) the floor: draw only the part above ground
      const visH = Math.round((b.y1) * (1 - clipBottom));
      const sy = b.y1 - visH;
      if (visH > 0) ctx.drawImage(frame, 0, 0, frame.width, b.y1 - sy, drawX, drawY + sy, frame.width, b.y1 - sy);
    } else {
      ctx.drawImage(frame, drawX, drawY);
    }
    ctx.globalAlpha = 1;
  }

  // the broken floor a burrowed foe went down through: a low heap of rubble with a lit rim, and a few
  // grains trickling off it
  mound(ctx, v, k, clockT) {
    const b = v.sprite.box, fy = this.floorY + v.depth;
    const hw = Math.max(6, Math.round((b.x1 - b.x0) * 0.46 * Math.min(1, k * 1.4)));
    const cx = Math.round(v.x);
    for (let x = -hw; x <= hw; x++) {
      const h = Math.max(1, Math.round(Math.sqrt(Math.max(0, 1 - (x / (hw + 0.5)) ** 2)) * 4 * k));
      const n = (x * 7 + 13) % 5;
      ctx.fillStyle = n === 0 ? '#5a4632' : n < 3 ? '#3b2d22' : '#2a2019';
      ctx.fillRect(cx + x, fy - h + 1, 1, h + 1);
      ctx.fillStyle = n === 1 ? '#c9a878' : '#8a7058';
      ctx.fillRect(cx + x, fy - h, 1, 1);
    }
    if (!this.reduced) {
      const ph = Math.floor(clockT * 6);
      ctx.fillStyle = '#b89a70';
      for (let i = 0; i < 3; i++) {
        const gx = cx + ((ph * 5 + i * 11) % (hw * 2)) - hw, gy = fy - 3 + ((ph + i * 2) % 4);
        ctx.fillRect(gx, gy, 1, 1);
      }
    }
  }

  // M6: where a foe dived into the water: dark water closing over it, a pale rim of foam, and rings going out
  // (rim: false, the rings alone: a dive pose draws its own water)
  wake(ctx, v, k, clockT, { rim = true } = {}) {
    const b = v.sprite.box, fy = this.floorY + v.depth;
    const hw = Math.max(6, Math.round((b.x1 - b.x0) * 0.5 * Math.min(1, k * 1.4)));
    const cx = Math.round(v.x);
    for (let x = -hw; rim && x <= hw; x++) {
      const e = Math.sqrt(Math.max(0, 1 - (x / (hw + 0.5)) ** 2)), h = Math.max(1, Math.round(e * 3 * k));
      ctx.fillStyle = (x * 5 + 3) % 7 ? '#0a1a1c' : '#12282a';
      ctx.fillRect(cx + x, fy - h + 1, 1, h + 1);
      ctx.fillStyle = (x + Math.floor(clockT * 4)) % 4 ? '#6fa8a0' : '#d8f0e8';
      ctx.fillRect(cx + x, fy - h, 1, 1);
    }
    // rings going out over the water, fading (still when motion is reduced)
    for (let i = 0; i < 2; i++) {
      const u = this.reduced ? 0.5 + i * 0.25 : ((clockT * 0.6) + i * 0.5) % 1, r = Math.round(hw + 2 + u * 14);
      ctx.globalAlpha = (1 - u) * 0.8;
      ctx.fillStyle = '#a8d8d0';
      ctx.fillRect(cx - r, fy, 3, 1); ctx.fillRect(cx + r - 2, fy, 3, 1);
      ctx.globalAlpha = 1;
    }
  }

  marker(ctx, v, clockT, focused) {
    const b = v.sprite.box, foot = v.sprite.def.foot;
    const drawX = Math.round(v.x - (b.x0 + b.x1) / 2), drawY = this.floorY - foot[1] + v.depth;
    const top = drawY + b.y0, bob = this.reduced ? 0 : (Math.floor(clockT * 4) % 2);
    const cx = Math.round(v.x);
    ctx.fillStyle = focused ? '#ffcb66' : 'rgba(255,203,102,0.8)';
    // down chevron
    const y = top - 6 - bob;
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - 3 + i, y + i, 7 - i * 2, 1);
    ctx.fillStyle = '#0b0910';
    ctx.fillRect(cx - 4, y - 1, 9, 1);
    if (focused) {
      // corner brackets around the figure
      const x0 = drawX + b.x0 - 2, x1 = drawX + b.x1 + 1, y0 = top - 2, y1 = drawY + b.y1 + 1;
      ctx.fillStyle = (this.reduced || Math.floor(clockT * 3) % 3) ? '#ffcb66' : '#fff4c0';
      for (const [x, y2, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
        ctx.fillRect(Math.min(x, x + sx * 4), y2, 5, 1);
        ctx.fillRect(x, Math.min(y2, y2 + sy * 4), 1, 5);
      }
    }
  }
  actorMark(ctx, v, clockT) {
    const b = v.sprite.box, foot = v.sprite.def.foot;
    const drawY = this.floorY - foot[1] + v.depth;
    const cx = Math.round(v.x), y = drawY + b.y0 - 5 - (this.reduced ? 0 : Math.floor(clockT * 3) % 2);
    ctx.fillStyle = '#ee6c54';
    for (let i = 0; i < 3; i++) ctx.fillRect(cx - 2 + i, y + i, 5 - i * 2, 1);
  }
}

// colour for an aspect/kind in effects
export function aspectColor(aspect) {
  const L = aspect && ASPECT_LOOK[aspect];
  return L ? L.light || L.color : '#fff4c0';
}
