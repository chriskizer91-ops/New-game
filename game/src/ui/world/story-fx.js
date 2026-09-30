// Story overlays (M3 spec §2.5, §5.5): the Brand banner, the crownwall sequence (the Atlas image
// with 3 seals cracking over Mossfall, the Hindwood and the Thornway north; 3 s, skippable), the
// Unsmith letter, the Council title card and the to-be-continued card. Uses ui/assets/atlas-image.js
// and falls back to a procedural parchment when the image is a placeholder or fails to load.
// Exports (each returns a Promise that settles when it is dismissed):
//   playBrandBanner(ctx, brand, game), playCrownwalls(ctx), showLetter(ctx, brandId),
//   playCouncil(ctx, { second, third, fourth }) (M4: the second council; M5: the third; M6: the fourth),
//   showToBeContinued(ctx, game, { act }) (act 'act1' | 'act2' | 'ironspire' | 'gloomfen': the end of a
//   chapter, naming the roads that open now and the regions of the next chapter; M5's 'ironspire' is the third
//   council's card, "The Ironspire is yours", which since M6 names the fen stair open; M6's 'gloomfen' is the
//   fourth council's, the end of Act II, which opens nothing), chapterEnd(game, act) (its pure view model),
//   showRegionCard(ctx, regionId) and hasRegionCard(regionId) (M6 spec A10: the player's painting of a region,
//   under its name, the first time the party comes down into it),
//   crownSeals() -> [{ id, x, y, to }], loreAt(map, tx, ty) -> [x, y], ATLAS_SRC
// Owner: WP7; M4 P7b (the second council, the end of Act II); M5 P7 (the Ironspire card, the third council);
// M6 P7 (the Gloomfen card, the fourth council, the end of Act II).

import * as atlasImage from '../assets/atlas-image.js';
import { CUTS } from '../assets/cuts/index.js';
import { renderBackdrop, BACKDROPS } from '../../art/scenes.js';
import { MAPS } from '../../data/maps/index.js';
import { BRAND_TOTAL, REGIONS } from '../../data/world.js';
import { PAGES } from '../../data/codex.js';
import { LETTERS } from '../../data/letters.js';
import { RELICS } from '../../data/relics.js';
import { CROWNWALL } from '../../data/locks.js';
import { uniqueBrands } from '../../rules/gauntlet.js';
import { pageProgress } from '../../rules/codex.js';
import { loreAt as geoLoreAt, regionOpen } from '../lib/atlas-geo.js';
import { openOverlay } from '../lib/overlay.js';
import { el, toCanvas } from '../lib/dom.js';

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
  const land = REGIONS[brand.region]?.name.replace(/^The /, 'the ') || 'the Wilds';
  if (brand.waking != null) P.append(text('p', 'brand-waking', `The Waking rises to ${brand.waking}. Every foe in ${land} re-arms: higher levels, better gear, better loot in their hands.`));
  P.append(C.go);
  ctx.audio.sfx('legend');
  return C.wait();
}

// ---- the crownwalls fall -------------------------------------------------------------------------------

// Project a tile onto the illustrated map (viewBox 1200x800) along the map's lore line (or its point):
// ui/lib/atlas-geo.js loreAt, which follows every segment of a route (M4 routes bend and branch).
export function loreAt(map, tx, ty) {
  return geoLoreAt(map?.id, tx, ty) || [600, 400];
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

// { second: true } is the second council (M4, the Sunscorch won): four coals, and Sandspire's chair.
// { third: true } is the third (M5, the Ironspire won): six coals, and the Thane of Ironhold at the table.
// { fourth: true } is the fourth (M6, the Gloomfen won): eight coals, and four boxes sealed in soot on the table.
export function playCouncil(ctx, { second = false, third = false, fourth = false } = {}) {
  const C = card(ctx, { cls: `council${fourth ? ' council-4' : third ? ' council-3' : second ? ' council-2' : ''}`, label: 'The Council', button: 'Take your seat' });
  C.panel.append(text('p', 'kick', 'Hearthstone Keep'), text('h2', 'title-display', fourth ? 'The Council sits a fourth time' : third ? 'The Council sits a third time' : second ? 'The Council sits again' : 'The Council sits'),
    text('p', 'council-text', fourth
      ? 'Eight coals burn in the Eternal Hearth, and every chair at the long table is filled. Four boxes sealed in soot sit in the middle of it, and nobody has touched them.'
      : third
        ? 'Six coals burn in the Eternal Hearth. One chair at the long table is still empty, and every face turns to the door when you walk in.'
        : second
          ? 'Four coals burn in the Eternal Hearth. The long table has a new chair at it, and every face turns to the door when you walk in.'
          : 'Two coals burn in the Eternal Hearth. The long table is full for the first time in years, and every face turns to the door when you walk in.'), C.go);
  ctx.audio.sfx('hearth');
  return C.wait();
}

// ---- a region's own painting (M6 spec A10) ----------------------------------------------------------------

// The regions with a card of their own: the player's painting of the region (a CUTS still) under its name, the
// first time the party comes down into it (the world screen keeps it once a save), and a line to walk on with.
// Without the still (or when it fails to load) the card draws its own scene: the region's battle backdrop.
const REGION_CARD = {
  gloomfen: {
    cut: 'region-gloomfen', backdrop: 'murkway', fallback: 'mossfall',
    text: 'Mist on black water, and lights where nobody lives. Somewhere below the stair, Willowmurk’s elders are waiting for the Warden.',
  },
};
const ACT_NO = ['', 'I', 'II', 'III', 'IV'];
export const hasRegionCard = id => !!REGION_CARD[id] && !!REGIONS[id];

export function showRegionCard(ctx, regionId) {
  const R = REGIONS[regionId], Q = REGION_CARD[regionId];
  if (!R || !Q) return Promise.resolve();
  const reduced = ctx.reduced();
  const C = card(ctx, { cls: `region region-${regionId}`, label: R.name, button: 'Walk on' });
  const P = C.panel;
  const head = el('div', 'region-head');
  head.append(text('p', 'kick', `Act ${ACT_NO[R.act] || R.act}`), text('h2', 'title-display', R.name));
  const view = el('div', { class: `region-view${reduced ? '' : ' drift'}`, role: 'img', 'aria-label': `${R.name}, painted` });
  // the drawn scene: the region's backdrop, pixel for pixel (when the painting is missing or will not load)
  const drawn = () => {
    view.classList.add('drawn');
    view.replaceChildren();
    const key = BACKDROPS[Q.backdrop] ? Q.backdrop : Q.fallback;
    try { const cv = toCanvas(renderBackdrop(key, { w: 180, h: 120, t: 0, reduced: true })); cv.classList.add('region-drawn'); view.append(cv); } catch { /* the name alone */ }
  };
  const still = CUTS[Q.cut];
  if (still) {
    const img = el('img', { class: 'region-still', src: still.src, alt: '', width: still.w, height: still.h, draggable: 'false', decoding: 'async' });
    img.addEventListener('error', drawn);
    view.append(img);
  } else drawn();
  P.append(head, view, text('p', 'region-text', Q.text), C.go);
  ctx.audio.sfx('page');
  return C.wait();
}

// ---- to be continued -----------------------------------------------------------------------------------

// The roads a chapter's end opens at once (a region whose entry gate the council itself unbars), and how
// the card says so; a region with no line here opens "in the next chapter".
const ROAD_OPEN = {
  sunscorch: 'The Keep’s south-east gate stands open. The Sunward Road runs to Sandspire.',
  ironspire: 'The Keep’s east postern stands open. The Rockslide Pass climbs to Peak’s Veil.',
  gloomfen: 'The fen stair below Mossfall stands open. Willowmurk’s safe paths lead down into the Gloomfen.',
};
const shortName = r => r.name.replace(/^The /, '').split(' ')[0];
const andList = names => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] || '');

// The end of a chapter (story.js { t: 'end', act }), pure (node tests use it):
//   'act1'       after the first council (M3): Act I is done; the Sunscorch road opens (M4)
//   'act2'       after the second (M4): the Sunscorch is yours; the Ironspire road opens with it (M5),
//                and every region still sealed opens in the next chapter
//   'ironspire'  after the third (M5): the Ironspire is yours; the Blackwater still holds the causeway, and
//                (M6) the fen stair below Mossfall stands open onto the Gloomfen (the council opened it); before
//                that, the Gloomfen Marsh is the next chapter
//   'gloomfen'   after the fourth (M6): the Gloomfen is yours and Act II ends: all eight coals lit, the Hollow
//                Council waiting, Act III named and nothing opened
// -> { act, cls, label, kick, title, sub, stats: [[k, v]], chips: [{ id, name, open }], lines: [text] }
export function chapterEnd(game, act = 'act1') {
  const relics = Object.keys(RELICS).filter(id => game?.codex?.[id]?.claimed).length;
  const stats = [['Day', game?.progress?.flags?.day || 1], ['Relics', `${relics}/${Object.keys(RELICS).length}`], ['Brands', `${game ? uniqueBrands(game) : 0}/${BRAND_TOTAL}`]];
  const pages = () => {
    const open = PAGES.filter(p => p.from != null);
    const done = open.filter(p => game?.progress?.flags?.pages?.[p.id] || pageProgress(game, p.id).done).length;
    return ['Pages', `${done}/${open.length}`];
  };
  const open = r => { try { return !!game && regionOpen(game, r.id); } catch { return false; } };
  // what comes next: the regions of the act still ahead, open now (their road stands open) or later. M7: only Act II's
  // (the Hearth Below is Act III's, and the fourth council's card names it on its own, spec §2.1)
  const ahead = (done = []) => Object.values(REGIONS).filter(r => r.act === 2 && !done.includes(r.id));
  const say = (regions, { full = false } = {}) => {
    const now = regions.filter(r => r.open && open(r) && ROAD_OPEN[r.id]);
    const later = regions.filter(r => !now.includes(r));
    const lines = now.map(r => ROAD_OPEN[r.id]);
    if (later.length) lines.push(`${andList(later.map(full ? r => r.name : shortName))} ${later.length > 1 ? 'open' : 'opens'} in the next chapter.`);
    return { chips: regions.map(r => ({ id: r.id, name: r.name, open: now.includes(r) })), lines };
  };
  if (act === 'gloomfen') {
    // M6: the eight coals lit, and the end of Act II; nothing opens here: Act III is the next chapter
    return {
      act, cls: 'tbc tbc-act2 tbc-gloomfen', label: 'End of Act II', kick: 'The Gloomfen is yours', title: 'End of Act II', sub: 'Eight coals in the Eternal Hearth',
      stats: [...stats, pages()], chips: [{ id: 'act3', name: 'Act III', open: false }],
      lines: ['All eight coals are lit. The Hollow Council waits.', 'Act III begins in the next chapter.'],
    };
  }
  if (act === 'ironspire') {
    const next = say(ahead(['sunscorch', 'ironspire']), { full: true });
    // the story's word on the Blackwater comes just before the Gloomfen's line: before its road (M5: the next
    // chapter), or (M6) before the fen stair the third council opens
    if (next.chips.some(c => c.id === 'gloomfen')) {
      const at = next.lines.findIndex(l => l === ROAD_OPEN.gloomfen);
      next.lines.splice(at >= 0 ? at : next.lines.length - 1, 0, 'The Blackwater still holds the causeway.');
    }
    return { act, cls: 'tbc tbc-act2 tbc-ironspire', label: 'The Ironspire is yours', kick: 'The Ironspire is yours', title: 'To be continued', sub: 'Six coals in the Eternal Hearth', stats: [...stats, pages()], ...next };
  }
  if (act === 'act2') {
    const next = say(ahead(['sunscorch']));
    return { act, cls: 'tbc tbc-act2', label: 'End of Act II', kick: 'The Sunscorch is yours', title: 'To be continued', sub: 'End of Act II', stats: [...stats, pages()], ...next };
  }
  // M4: once Act I is done the Keep's south-east gate stands open, so the next chapter starts here
  const onward = Object.values(REGIONS).some(r => r.open && r.act === 2);
  return { act: 'act1', cls: 'tbc', label: 'To be continued', kick: 'End of Act I', title: 'To be continued', sub: null, stats, chips: [], lines: [onward ? ROAD_OPEN.sunscorch : 'The way opens in the next chapter.'] };
}

export function showToBeContinued(ctx, game, { act = 'act1' } = {}) {
  const V = chapterEnd(game, act);
  const C = card(ctx, { cls: V.cls, label: V.label, button: 'Keep exploring' });
  const P = C.panel;
  const stats = el('dl', 'tbc-stats');
  for (const [k, v] of V.stats) stats.append(text('dt', '', k), text('dd', '', String(v)));
  P.append(text('p', 'kick', V.kick), text('h2', 'title-display', V.title));
  if (V.sub) P.append(text('p', 'tbc-act', V.sub));
  P.append(stats);
  if (V.chips.length) {
    // the regions ahead: open now (their road stands open), or sealed until the next chapter
    const chips = el('p', { class: 'tbc-next', 'aria-hidden': 'true' });
    for (const r of V.chips) chips.append(text('span', `tbc-rg rg-${r.id}${r.open ? ' is-open' : ''}`, r.name));
    P.append(chips);
  }
  for (const line of V.lines) P.append(text('p', 'tbc-text', line));
  P.append(C.go);
  ctx.audio.sfx('victory');
  return C.wait();
}
