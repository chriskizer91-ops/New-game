// Sprite management for the battle screen: turns battle units into art options, caches the
// composed frame per sprite (recomposed only when its visual key changes), measures figure
// bounds once, and prewarms every pose raster in small chunks so the forge never hitches mid-fight.
import { renderFoe, FOE_ART } from '../../art/foes.js';
import { renderHero, heroBust, HERO_SIZE } from '../../art/hero-looks.js';
import { RELIC_ART } from '../../art/item-looks.js';
import { toCanvas, crop, alphaBox } from './util.js';

// ---- foes -------------------------------------------------------------------------------------

// Art options for a foe unit (engine unit or display copy). A relic the art can draw goes in
// `relic`; pieces that were disarmed are `relicHeld: false` (Briarmaw uses `broken`).
export function foeLook(u) {
  const def = FOE_ART[u.art] || FOE_ART.cutpurse;
  const held = u.held || [];
  const o = { tier: u.tier, gearTier: u.gearTier || 0, phase: u.phase || 1 };
  if (def.relics) {
    // multi-relic champion: pieces snap off one by one
    o.broken = held.filter(p => !p.held).map(p => p.relic || p.echoOf).filter(Boolean);
    o.relicHeld = true;
    return o;
  }
  const piece = held[0];
  if (piece) {
    // a named relic the art knows; an Echo (generated item) shows the family's own relic look on beasts
    const id = piece.relic && RELIC_ART[piece.relic] ? piece.relic : def.kind === 'beast' ? def.relic || null : null;
    o.relic = id;
    o.relicHeld = !!piece.held;
  } else if (u.wears && RELIC_ART[u.wears]) {
    o.relic = u.wears; // a visible regalia piece (no grip)
    o.relicHeld = true;
  } else {
    o.relic = null;
  }
  return o;
}

const FOE_FRAMES = [['idle', 0], ['idle', 0.7], ['attack', 0.1], ['attack', 0.6], ['hurt', 0], ['ko', 0]];
const HERO_FRAMES = [['idle', 0], ['idle', 0.7], ['attack', 0.1], ['attack', 0.6], ['cast', 0], ['hurt', 0], ['ko', 0], ['guard', 0]];

const lookKey = o => [o.tier, o.gearTier, o.phase, o.relic || '-', o.relicHeld ? 1 : 0, (o.broken || []).join('+')].join('|');

// Quantised animation key: idle breath (1.6 Hz), blinks, relic glint window, emissive flicker (8 Hz).
function animKey(pose, t, reduced) {
  if (reduced) return pose;
  const q = Math.floor(t * 8);
  if (pose === 'attack') return `${pose}${t < 0.4 ? 'w' : 's'}`;
  return `${pose}:${q}`;
}

export class FoeSprite {
  constructor(unit, reduced) {
    this.key = unit.art;
    this.def = FOE_ART[unit.art] || FOE_ART.cutpurse;
    this.reduced = reduced;
    this.canvas = document.createElement('canvas');
    this.setUnit(unit);
  }
  setUnit(unit) {
    const o = foeLook(unit);
    const lk = lookKey(o);
    if (lk === this.lk) return false;
    this.o = o;
    this.lk = lk;
    this.fk = null;
    const idle = renderFoe(this.key, { ...o, pose: 'idle', t: 0, reduced: true });
    this.anchors = idle.anchors;
    this.box = alphaBox(idle);
    this.w = idle.width;
    this.h = idle.height;
    return true;
  }
  // -> canvas with the composed frame
  frame(pose = 'idle', t = 0, tint = null) {
    const fk = `${animKey(pose, t, this.reduced)}|${tint ? tint.join(',') : ''}`;
    if (fk !== this.fk) {
      this.fk = fk;
      const img = renderFoe(this.key, { ...this.o, pose, t: this.reduced ? 0 : t, reduced: this.reduced, tint: tint || undefined });
      toCanvas(img, this.canvas);
      this.poseAnchors = img.anchors;
    }
    return this.canvas;
  }
  // prewarm jobs: `now` = every pose of the current look; `later` = the looks it can change into
  // (boss phases, disarmed, broken pieces), rasterised in the background after the battle starts.
  jobs(unit) {
    const base = foeLook(unit);
    const later = [];
    if (this.def.phases) for (let p = 2; p <= this.def.phases; p++) later.push({ ...base, phase: p });
    if (base.relic && base.relicHeld && (unit.held || []).length) later.push({ ...base, relicHeld: false });
    if (this.def.relics) {
      for (let p = 1; p <= (this.def.phases || 1); p++) {
        for (const b of [[this.def.relics[0]], [this.def.relics[1]], this.def.relics]) later.push({ ...base, phase: p, broken: b });
      }
    }
    const frames = o => FOE_FRAMES.map(([pose, t]) => () => renderFoe(this.key, { ...o, pose, t, reduced: this.reduced }));
    return { now: frames(base), later: later.flatMap(frames) };
  }
  // small head portrait for the Initiative Ribbon
  portrait(size = 18) {
    const img = renderFoe(this.key, { ...this.o, pose: 'idle', t: 0, reduced: true });
    const a = img.anchors.head || img.anchors.center || [img.width / 2, img.height / 3];
    const big = this.w > 64 ? 4 : 0;
    return crop(img, Math.round(a[0] - size / 2 + (big ? 2 : 0)), Math.round(a[1] - size / 2 + 1), size, size);
  }
}

// ---- heroes -----------------------------------------------------------------------------------

// Gear map for renderHero from the saved roster (ItemInstances by slot). undefined = starter kit.
export function heroGear(game, heroId) {
  const h = game?.party?.roster?.[heroId];
  if (!h || !h.gear) return undefined;
  const inv = game.inventory || [];
  const out = {};
  for (const [slot, uid] of Object.entries(h.gear)) out[slot] = uid ? inv.find(i => i.uid === uid) || null : null;
  return out;
}

export function heroCustom(game, heroId) {
  const h = game?.party?.roster?.[heroId];
  return h ? h.custom || h.look || undefined : undefined;
}

export class HeroSprite {
  constructor(heroId, gear, custom, reduced) {
    this.key = heroId;
    this.gear = gear;
    this.custom = custom;
    this.reduced = reduced;
    this.canvas = document.createElement('canvas');
    this.fk = null;
    this.w = HERO_SIZE.w;
    this.h = HERO_SIZE.h;
    this.foot = HERO_SIZE.foot;
  }
  frame(pose = 'idle', t = 0, tint = null) {
    const fk = `${animKey(pose, t, this.reduced)}|${tint ? tint.join(',') : ''}`;
    if (fk !== this.fk) {
      this.fk = fk;
      const img = renderHero(this.key, this.gear, { pose, t: this.reduced ? 0 : t, custom: this.custom, reduced: this.reduced, tint: tint || undefined });
      toCanvas(img, this.canvas);
      this.anchors = img.anchors;
    }
    return this.canvas;
  }
  jobs() {
    return HERO_FRAMES.map(([pose, t]) => () => renderHero(this.key, this.gear, { pose, t, custom: this.custom, reduced: this.reduced }));
  }
  portrait(size = 18) {
    return heroBust(this.key, this.gear, { size, custom: this.custom });
  }
}

// ---- chunked prewarm -------------------------------------------------------------------------------

// Runs jobs in slices of ~budget ms, yielding to the browser between slices.
export function runJobs(jobs, { budget = 14, isDead = () => false } = {}) {
  return new Promise(resolve => {
    let i = 0;
    const step = () => {
      if (isDead()) { resolve(false); return; }
      const t0 = performance.now();
      while (i < jobs.length && performance.now() - t0 < budget) {
        try { jobs[i](); } catch (e) { console.warn('prewarm failed', e); }
        i++;
      }
      if (i >= jobs.length) resolve(true);
      else setTimeout(step, 0);
    };
    step();
  });
}
