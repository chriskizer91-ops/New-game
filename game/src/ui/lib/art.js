// UI-side art helpers: turn game state into canvases using the art API in src/art.
import {
  itemPortrait, itemIcon, cardCorner, RARITY_LOOK, rarityTier, renderHero, heroBust, renderBackdrop,
  renderFoe, Forge, Xf, compose, hx,
} from '../../art/index.js';
import { chestR } from '../../art/recipes.js';
import { toCanvas } from './dom.js';
import { animate, isReduced } from './anim.js';

export const SLOT_ORDER = ['weapon', 'offhand', 'head', 'body', 'hands', 'feet', 'amulet', 'ring'];

export const tierOf = item => rarityTier(item?.rarity || 'worn');
export const rarityColor = r => (RARITY_LOOK[r] || RARITY_LOOK.worn).color;
export const rarityName = r => (RARITY_LOOK[r] || RARITY_LOOK.worn).name;

export function itemsById(game) {
  const m = {};
  for (const it of game?.inventory || []) m[it.uid] = it;
  return m;
}
// { slot: ItemInstance | null } for a hero; override replaces slots (a try-on preview)
export function gearOf(game, heroId, override) {
  const h = game.party.roster[heroId], by = itemsById(game), g = {};
  for (const s of SLOT_ORDER) { const uid = h?.gear?.[s]; const it = uid && by[uid]; g[s] = it && !it.shattered ? it : null; }
  return override ? { ...g, ...override } : g;
}
export const customOf = (game, heroId) => (heroId === 'warden' ? game?.party?.roster?.warden?.look : undefined);

// An animated hero sprite (64x64 frame). Returns { canvas, set(gear), flash(color) }.
export function heroSprite(game, heroId, { scale = 3, gear, pose = 'idle', custom } = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'px hero-sprite';
  cv.width = cv.height = 64;
  cv.style.width = cv.style.height = 64 * scale + 'px';
  cv.setAttribute('role', 'img');
  const state = { gear: gear || gearOf(game, heroId), custom: custom ?? customOf(game, heroId), fx: null };
  const name = game.party.roster[heroId]?.name || heroId;
  cv.setAttribute('aria-label', `${name}, wearing their gear`);
  const draw = t => {
    const reduced = isReduced();
    const img = renderHero(heroId, state.gear, { pose, t: reduced ? .2 : t, custom: state.custom, reduced });
    const fx = state.fx;
    if (fx) {
      const e = (performance.now() / 1000 - fx.t0) / .8;
      if (e >= 1) state.fx = null;
      else {
        const d = img.data, c = fx.col;
        if (e < .2) for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { d[i] = d[i] + (255 - d[i]) * .8; d[i + 1] = d[i + 1] + (255 - d[i + 1]) * .8; d[i + 2] = d[i + 2] + (255 - d[i + 2]) * .8; }
        for (let k = 0; k < 18; k++) {
          const a = k / 18 * Math.PI * 2, r = 8 + e * 24, x = Math.round(32 + Math.cos(a) * r), y = Math.round(34 + Math.sin(a) * r * .9);
          if (x < 0 || y < 0 || x > 63 || y > 63) continue;
          const i = (y * 64 + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255 * (1 - e);
        }
      }
    }
    toCanvas(img, cv);
  };
  const stop = animate(cv, draw, 12);
  return {
    canvas: cv,
    set(g, cst) { state.gear = g; if (cst !== undefined) state.custom = cst; draw(performance.now() / 1000); },
    flash(rarity) { state.fx = { t0: performance.now() / 1000, col: hx((RARITY_LOOK[rarity] || RARITY_LOOK.wrought).ramp[3]) }; if (isReduced()) draw(0); },
    stop,
  };
}

export function bustCanvas(game, heroId, { size = 24, scale = 2, gear } = {}) {
  const img = heroBust(heroId, gear || gearOf(game, heroId), { size, custom: customOf(game, heroId) });
  const cv = toCanvas(img, null, scale);
  cv.setAttribute('aria-hidden', 'true');
  return cv;
}

export function iconCanvas(item, scale = 3) {
  const cv = toCanvas(itemIcon(item), null, scale);
  cv.setAttribute('aria-hidden', 'true');
  return cv;
}

// The card portrait. Animated for runed+ tiers and relics; develop 0..1 for the identify ritual.
export function portraitCanvas(item, { size = 64, develop, still = false } = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'px portrait';
  cv.width = cv.height = size;
  const st = { develop };
  const draw = t => toCanvas(itemPortrait(item, { size, t, reduced: isReduced() || still, develop: st.develop }), cv);
  const moving = !still && tierOf(item) >= 2;
  if (moving) animate(cv, draw, 12); else draw(0);
  return { canvas: cv, setDevelop(v) { st.develop = v; draw(performance.now() / 1000); } };
}

export function cornerCanvas(rarity, cls) {
  const cv = toCanvas(cardCorner(rarity));
  cv.className = 'px corner ' + cls;
  cv.setAttribute('aria-hidden', 'true');
  return cv;
}

// The loot chest (32x28), lid open with the rarity's light spilling out.
const CHEST_GLOW = { worn: 'amber', wrought: 'radiant', tempered: 'verdant', runed: 'frost', storied: 'arcane', heirloom: 'radiant', regalia: 'water', primal: 'primal' };
const chestCache = new Map();
export function chestImage(open, rarity = 'worn') {
  const key = (open ? 'o' : 'c') + rarity;
  if (!chestCache.has(key)) {
    const F = new Forge(32, 28), X = Xf(0, 0, 1, 0, 1);
    chestR(F, X, { open, glowMat: CHEST_GLOW[rarity] || 'amber' });
    chestCache.set(key, compose(F.raster(), { glow: open, hue: 170 }));
  }
  return chestCache.get(key);
}

// An animated battle backdrop at w x h pixels.
export function backdropCanvas(key, { w = 160, h = 96, scale = 3, fps = 10 } = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'px backdrop';
  cv.width = w; cv.height = h;
  if (scale) { cv.style.width = w * scale + 'px'; cv.style.height = h * scale + 'px'; }
  cv.setAttribute('aria-hidden', 'true');
  animate(cv, t => toCanvas(renderBackdrop(key, { w, h, t, reduced: isReduced() }), cv), fps);
  return cv;
}

export function foeCanvas(family, o = {}, scale = 2) {
  const cv = document.createElement('canvas');
  cv.className = 'px foe';
  const draw = t => toCanvas(renderFoe(family, { ...o, t, reduced: isReduced() }), cv, scale);
  animate(cv, draw, 10);
  cv.setAttribute('aria-hidden', 'true');
  return cv;
}
