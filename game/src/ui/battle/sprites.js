// Sprite management for the battle screen: turns battle units into art options, caches the
// composed frame per sprite (recomposed only when its visual key changes), measures figure
// bounds once, and prewarms every pose raster in small chunks so the forge never hitches mid-fight.
import { renderFoe, FOE_ART } from '../../art/foes.js';
import { renderHero, heroBust, HERO_SIZE } from '../../art/hero-looks.js';
import { RELIC_ART } from '../../art/item-looks.js';
import { ITEMS } from '../../data/items.js';
import { RELICS } from '../../data/relics.js';
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


const RIM = 'rgba(236, 223, 195, 0.26)';

const lookKey = o => [o.tier, o.gearTier, o.phase, o.relic || '-', o.relicHeld ? 1 : 0, (o.broken || []).join('+')].join('|');

// The art animates from t: idle breath (1.6 Hz), blinks, a relic glint and shine window, and
// emissive flicker. Composing is the per-frame cost (a 96px boss is ~12 ms on a slow phone), so t
// is sampled at 2 Hz, and at 12 Hz only inside a glint window or a blink. glint = [period, window].
function sampleT(t, glint) {
  if (glint && t % glint[0] < glint[1]) return Math.floor(t * 12) / 12;
  if (t % 3.7 < 0.16) return Math.floor(t * 12) / 12;
  return Math.floor(t * 2) / 2;
}
function frameKey(pose, t, tq, reduced) {
  if (reduced) return pose;
  if (pose === 'attack') return `${pose}${t < 0.4 ? 'w' : 's'}`;
  return `${pose}:${tq}`;
}
const NOW_FOE = [['idle', 0], ['idle', 0.7], ['hurt', 0]];
const LATER_FOE = [['attack', 0.1], ['attack', 0.6], ['ko', 0]];
const NOW_HERO = [['idle', 0], ['idle', 0.7]];
const LATER_HERO = [['attack', 0.1], ['attack', 0.6], ['cast', 0], ['hurt', 0], ['guard', 0], ['ko', 0]];

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
  get glint() {
    const o = this.o;
    const shows = this.def.relics ? (o.broken || []).length < this.def.relics.length : !!(o.relic && o.relicHeld);
    return shows ? [2.4, 0.95] : null;
  }
  frame(pose = 'idle', t = 0, tint = null) {
    const tq = pose === 'attack' ? t : sampleT(t, this.glint);
    const fk = `${frameKey(pose, t, tq, this.reduced)}|${tint ? tint.join(',') : ''}`;
    if (fk !== this.fk) {
      this.fk = fk;
      const img = renderFoe(this.key, { ...this.o, pose, t: this.reduced ? 0 : tq, reduced: this.reduced, tint: tint || undefined });
      this.tmp = toCanvas(img, this.tmp);
      // a faint rim of light outside the dark outline keeps dark foes readable on dark dens
      const c = this.canvas;
      if (c.width !== img.width) c.width = img.width;
      if (c.height !== img.height) c.height = img.height;
      const g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.drawImage(this.tmp, dx, dy);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = RIM;
      g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over';
      g.drawImage(this.tmp, 0, 0);
      this.poseAnchors = img.anchors;
    }
    return this.canvas;
  }
  // prewarm jobs (each one cold raster): `now` before the fight starts, `later` in idle time
  jobs(unit) {
    const base = foeLook(unit);
    const f = list => list.map(([pose, t]) => () => renderFoe(this.key, { ...base, pose, t, reduced: this.reduced }));
    return { now: f(NOW_FOE), later: f(LATER_FOE) };
  }
  // every pose of a look the foe is about to change into (disarmed, broken piece, next phase)
  lookJobs(o) {
    return [...NOW_FOE, ...LATER_FOE].map(([pose, t]) => () => renderFoe(this.key, { ...o, pose, t, reduced: this.reduced }));
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
  // a two-handed weapon leaves no hand for the off-hand piece
  const w = out.weapon;
  if (w && ((ITEMS[w.base] && ITEMS[w.base].hands === 2) || (RELICS[w.base] && RELICS[w.base].weapon && RELICS[w.base].weapon.hands === 2))) out.offhand = null;
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
    // a relic in hand glints every 2.6 s (hero-looks)
    const relicIn = gear ? Object.values(gear).some(it => it && RELICS[it.base || it]) : heroId === 'warden';
    this.glint = relicIn ? [2.6, 0.34] : null;
  }
  frame(pose = 'idle', t = 0, tint = null) {
    const tq = pose === 'attack' ? t : sampleT(t, this.glint);
    const fk = `${frameKey(pose, t, tq, this.reduced)}|${tint ? tint.join(',') : ''}`;
    if (fk !== this.fk) {
      this.fk = fk;
      const img = renderHero(this.key, this.gear, { pose, t: this.reduced ? 0 : tq, custom: this.custom, reduced: this.reduced, tint: tint || undefined });
      toCanvas(img, this.canvas);
      this.anchors = img.anchors;
    }
    return this.canvas;
  }
  jobs() {
    const f = list => list.map(([pose, t]) => () => renderHero(this.key, this.gear, { pose, t, custom: this.custom, reduced: this.reduced }));
    return { now: f(NOW_HERO), later: f(LATER_HERO) };
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
