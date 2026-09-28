// Story overlays (M3 spec §2.5, §5.5): the Brand banner, the crownwall sequence (the Atlas image
// with 3 seals cracking over Mossfall, the Hindwood and the Thornway north; 3 s, skippable), the
// Unsmith letter, the Council title card and the to-be-continued card. Uses ui/assets/atlas-image.js
// and falls back to a procedural parchment when the image is a placeholder or fails to load.
// Exports (each returns a Promise that settles when it is dismissed):
//   playBrandBanner(ctx, brand, game), playCrownwalls(ctx), showLetter(ctx, brandId), playCouncil(ctx),
//   showToBeContinued(ctx, game), crownSeals() -> [{ id, x, y, to }], loreAt(map, tx, ty) -> [x, y],
//   ATLAS_SRC
// Owner: WP7.

import * as atlasImage from '../assets/atlas-image.js';
import { MAPS } from '../../data/maps/index.js';
import { BRAND_TOTAL } from '../../data/world.js';
import { LETTERS } from '../../data/letters.js';
import { RELICS } from '../../data/relics.js';
import { CROWNWALL } from '../../data/locks.js';
import { uniqueBrands } from '../../rules/gauntlet.js';
import { openOverlay } from '../lib/overlay.js';
import { el } from '../lib/dom.js';

export const ATLAS_SRC = atlasImage.default;
const text = (tag, cls, t) => { const n = el(tag, cls); n.textContent = t ?? ''; return n; };

function card(ctx, { cls, label, button: label2 = 'Onward', onKeyExtra } = {}) {
  let done = null;
  const ov = openOverlay({ cls: `ov-story ${cls}`, label, onBack: () => close(), onKey: a => (onKeyExtra ? onKeyExtra(a) : false) });
  const panel = el('section', `story-card ${cls}-card`);
  ov.inner.append(panel);
  const go = el('button', { type: 'button', class: 'btn primary big story-go', 'data-primary': '' });
  go.textContent = label2;
  go.addEventListener('click', () => { ctx.audio.sfx('confirm'); close(); });
  function close() { if (ov.closed) return; ov.close(); if (done) done(); }
  return { ov, panel, go, close, wait: () => { setTimeout(() => go.focus({ preventScroll: true }), 0); return new Promise(r => { done = r; }); } };
}

// ---- the Brand banner ----------------------------------------------------------------------------------

export function playBrandBanner(ctx, brand, game) {
  if (!brand) return Promise.resolve();
  const C = card(ctx, { cls: 'brand', label: 'Brand earned', button: 'Onward' });
  const P = C.panel;
  const lit = Math.min(BRAND_TOTAL, game ? uniqueBrands(game) : 1);
  const coals = el('div', { class: 'brand-coals', role: 'img', 'aria-label': `The Hearth Clock: ${lit} of ${BRAND_TOTAL} coals lit` });
  for (let i = 0; i < BRAND_TOTAL; i++) coals.append(el('i', 'coal' + (i < lit ? ' lit' : '') + (i === lit - 1 ? ' new' : '')));
  P.append(text('p', 'kick', 'Brand earned'), text('h2', 'title-display', brand.name || 'A Brand'), coals, text('p', 'brand-text', brand.text || 'One coal of the hearth relights.'));
  if (brand.waking != null) P.append(text('p', 'brand-waking', `The Waking rises to ${brand.waking}. Every foe in the Wilds re-arms: higher levels, better gear, better loot in their hands.`));
  P.append(C.go);
  ctx.audio.sfx('legend');
  return C.wait();
}

// ---- the crownwalls fall -------------------------------------------------------------------------------

// Project a tile onto the illustrated map (viewBox 1200x800) along the map's lore line (or its point).
export function loreAt(map, tx, ty) {
  const L = map?.lore;
  if (!L || !L.length) return [600, 400];
  if (L.length === 1) return [L[0][0], L[0][1]];
  const [a, b] = L;
  const vx = b[2] - a[2], vy = b[3] - a[3], len2 = vx * vx + vy * vy || 1;
  const u = Math.max(0, Math.min(1, ((tx - a[2]) * vx + (ty - a[3]) * vy) / len2));
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}

// Every crownwall on the maps, placed a little way toward the land it seals off.
export function crownSeals() {
  const out = [];
  for (const m of Object.values(MAPS)) {
    for (const e of m.entities || []) {
      if (e.kind !== 'gate' || e.look !== 'crownwall') continue;
      const [x0, y0, x1, y1] = e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
      const tx = (x0 + x1) / 2, ty = (y0 + y1) / 2;
      let p = loreAt(m, tx, ty);
      const ex = (m.exits || []).find(x => x.to && x.area[0] <= x1 + 1 && x.area[2] >= x0 - 1 && x.area[1] <= y1 + 1 && x.area[3] >= y0 - 1);
      const dest = ex && MAPS[ex.to];
      if (dest?.lore?.length) {
        // toward the middle of the land it opens (a route's line, or a place's point)
        const q = dest.lore.reduce((acc, l) => [acc[0] + l[0] / dest.lore.length, acc[1] + l[1] / dest.lore.length], [0, 0]);
        p = [p[0] + (q[0] - p[0]) * 0.45, p[1] + (q[1] - p[1]) * 0.45];
      }
      out.push({ id: e.id, x: p[0], y: p[1], to: dest?.name || '' });
    }
  }
  return out;
}

export function playCrownwalls(ctx) {
  const seals = crownSeals();
  if (!seals.length) return Promise.resolve();
  const reduced = ctx.reduced();
  const C = card(ctx, { cls: 'crown', label: 'The crownwalls fall', button: reduced ? 'Onward' : 'Skip' });
  const P = C.panel;
  P.append(text('p', 'kick', 'The crownwalls fall'), text('h2', 'title-display', 'The old roads open'));
  // frame the seals: a 3:2 window of the map around them
  const xs = seals.map(s => s.x), ys = seals.map(s => s.y);
  let vx0 = Math.min(...xs) - 70, vx1 = Math.max(...xs) + 70, vy0 = Math.min(...ys) - 60, vy1 = Math.max(...ys) + 60;
  let vw = Math.max(vx1 - vx0, (vy1 - vy0) * 1.5), vh = vw / 1.5;
  vw = Math.min(1200, vw); vh = Math.min(800, vh);
  const cx = (vx0 + vx1) / 2, cy = (vy0 + vy1) / 2;
  vx0 = Math.max(0, Math.min(1200 - vw, cx - vw / 2)); vy0 = Math.max(0, Math.min(800 - vh, cy - vh / 2));
  const view = el('div', { class: 'cw-view', role: 'img', 'aria-label': `The map: seals crack over ${seals.map(s => s.to).filter(Boolean).join(', ')}` });
  const layer = el('div', 'cw-map');
  Object.assign(layer.style, { width: (1200 / vw) * 100 + '%', height: (800 / vh) * 100 + '%', left: -(vx0 / vw) * 100 + '%', top: -(vy0 / vh) * 100 + '%' });
  const parchment = () => { layer.classList.add('parchment'); };
  if (atlasImage.ATLAS_PLACEHOLDER) parchment();
  else {
    const img = el('img', { class: 'cw-img', alt: '', src: ATLAS_SRC, draggable: 'false' });
    img.addEventListener('error', () => { img.remove(); parchment(); });
    layer.append(img);
  }
  seals.forEach((s, i) => {
    const seal = el('span', { class: 'cw-seal', 'aria-hidden': 'true' });
    Object.assign(seal.style, { left: (s.x / 1200) * 100 + '%', top: (s.y / 800) * 100 + '%', animationDelay: reduced ? '0s' : `${0.5 + i * 0.8}s` });
    seal.append(el('i', 'knot'), el('i', 'crack'));
    if (s.to) { const lab = text('b', 'cw-label', s.to); seal.append(lab); }
    layer.append(seal);
  });
  view.append(layer);
  P.append(view, text('p', 'cw-text', `${CROWNWALL.journal} Mossfall, the Hindwood and the road north to Eldergrove are open.`), C.go);
  if (reduced) layer.classList.add('cracked');
  else {
    layer.classList.add('cracking');
    seals.forEach((s, i) => setTimeout(() => { if (!C.ov.closed) ctx.audio.sfx('unlock'); }, (0.5 + i * 0.8) * 1000 + 350));
    setTimeout(() => { if (!C.ov.closed) { C.go.textContent = 'Onward'; layer.classList.add('cracked'); } }, 3000);
  }
  return C.wait();
}

// ---- the Unsmith's letter ------------------------------------------------------------------------------

export function showLetter(ctx, brandId) {
  const L = LETTERS[brandId];
  if (!L) return Promise.resolve();
  const C = card(ctx, { cls: 'letter', label: 'A letter', button: 'Fold it away' });
  const P = C.panel;
  P.append(text('p', 'kick', 'A letter, sealed in soot'));
  const page = el('div', 'letter-page');
  page.append(text('p', 'letter-text', L.text));
  P.append(page, C.go);
  ctx.audio.sfx('page');
  return C.wait();
}

// ---- the Council ---------------------------------------------------------------------------------------

export function playCouncil(ctx) {
  const C = card(ctx, { cls: 'council', label: 'The Council', button: 'Take your seat' });
  C.panel.append(text('p', 'kick', 'Hearthstone Keep'), text('h2', 'title-display', 'The Council sits'),
    text('p', 'council-text', 'Two coals burn in the Eternal Hearth. The long table is full for the first time in years, and every face turns to the door when you walk in.'), C.go);
  ctx.audio.sfx('hearth');
  return C.wait();
}

// ---- to be continued -----------------------------------------------------------------------------------

export function showToBeContinued(ctx, game) {
  const C = card(ctx, { cls: 'tbc', label: 'To be continued', button: 'Keep exploring' });
  const P = C.panel;
  const relics = Object.keys(RELICS).filter(id => game?.codex?.[id]?.claimed).length;
  const stats = el('dl', 'tbc-stats');
  for (const [k, v] of [['Day', game?.progress?.flags?.day || 1], ['Relics', `${relics}/${Object.keys(RELICS).length}`], ['Brands', `${game ? uniqueBrands(game) : 0}/${BRAND_TOTAL}`]]) {
    stats.append(text('dt', '', k), text('dd', '', String(v)));
  }
  P.append(text('p', 'kick', 'End of Act I'), text('h2', 'title-display', 'To be continued'), stats, text('p', 'tbc-text', 'The way opens in the next chapter.'), C.go);
  ctx.audio.sfx('victory');
  return C.wait();
}
