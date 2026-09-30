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
// M7 (spec §5, A14, A15):
//   showOpening(ctx, game)          the Opening's title card, "Act III: The Hollow Council" (P3's council-5 ends with
//                                   { end: 'act3-open' }); openingCard(game) is its pure view model
//   showRegionCard(ctx, 'below')    the Hearth Below's card, the first time down the vault stair (CUTS['hearth-below']
//                                   if painted, else its drawn scene)
//   chapterEnd(game, 'gloomfen')    the fourth council's card: "Act III begins.", its Act III chip open
//   playEnding(ctx, game, id)       an ending's card (CUTS['ending-<id>'] if painted, else a drawn scene), the credits
//                                   and the last card ("The post-game opens in the next chapter"); endingCard(game, id),
//                                   creditsOf(game) and LAST_CARD are the pure view models
// Every saved string (the Warden's name, the Masterpiece's) is set as text.
// Owner: WP7; M4 P7b (the second council, the end of Act II); M5 P7 (the Ironspire card, the third council);
// M6 P7 (the Gloomfen card, the fourth council, the end of Act II); M7 P7 (Act III's cards, the endings, the credits).

import * as atlasImage from '../assets/atlas-image.js';
import { CUTS } from '../assets/cuts/index.js';
import { renderBackdrop, BACKDROPS } from '../../art/scenes.js';
import { MAPS } from '../../data/maps/index.js';
import { BRAND_TOTAL, REGIONS } from '../../data/world.js';
import { PAGES } from '../../data/codex.js';
import { LETTERS } from '../../data/letters.js';
import { RELICS } from '../../data/relics.js';
import { CROWNWALL } from '../../data/locks.js';
import { ENDINGS } from '../../data/endings.js';
import { NPCS } from '../../data/npcs.js';
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
  // M7 (spec §5): the first time down the vault stair; the player's still if painted (batch 4), else the Hollow Hall
  below: {
    cut: 'hearth-below', backdrop: 'hollow-hall', fallback: 'scorchgate-vaults',
    text: 'The stair goes down past the vault, past the Keep’s own cellars, into a hall the First Age built and nobody remembered. Four great chairs wait along it. The hearth’s roots go on down through the ash, into the dark.',
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
//                Council waiting; M7: "Act III begins.", its chip open (the fifth council follows at once)
// -> { act, cls, label, kick, title, sub, stats: [[k, v]], chips: [{ id, name, open }], lines: [text] }
// The Pages stat counts every page of the Codex (M7: Page V, which lists its numbers, among them).
export function chapterEnd(game, act = 'act1') {
  const relics = Object.keys(RELICS).filter(id => game?.codex?.[id]?.claimed).length;
  const stats = [['Day', game?.progress?.flags?.day || 1], ['Relics', `${relics}/${Object.keys(RELICS).length}`], ['Brands', `${game ? uniqueBrands(game) : 0}/${BRAND_TOTAL}`]];
  const pages = () => {
    const open = PAGES.filter(p => p.from != null || p.nos?.length);
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
  // Thareia (T1): the Prologue's card, at the first landing in Thornhollow; Chapter 1 comes next (T2)
  if (act === 'prologue') {
    const lvl = Math.max(1, ...Object.values(game?.party?.roster || {}).map(h => h.level || 1));
    return {
      act, cls: 'tbc tbc-prologue', label: 'End of the Prologue', kick: 'The first flight', title: 'To be continued', sub: 'Chapter 1: The Rot\'s Roots',
      stats: [['Day', game?.progress?.flags?.day || 1], ['Level', lvl], ['Gold', game?.gold || 0]], chips: [],
      lines: ['The shard in your pocket is warm, and it hums when you face west.', 'Chapter 1 opens in the next part of Thareia.'],
    };
  }
  if (act === 'gloomfen') {
    // M6: the eight coals lit, and the end of Act II. M7: Act III begins (the fifth council, the Opening, opens its road
    // down the vault stair), so its chip is open and the card says so; no road opens on this card itself
    return {
      act, cls: 'tbc tbc-act2 tbc-gloomfen', label: 'End of Act II', kick: 'The Gloomfen is yours', title: 'End of Act II', sub: 'Eight coals in the Eternal Hearth',
      stats: [...stats, pages()], chips: [{ id: 'act3', name: 'Act III', open: true }],
      lines: ['All eight coals are lit. The Hollow Council waits.', 'Act III begins.'],
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

// ---- Act III (M7 spec §5, A14, A15) ---------------------------------------------------------------------

// the relics claimed, of those this Warden could claim, as the Codex counts them (the starters passed over are not
// among them: a full Codex reads 73 of 73)
const relicTally = game => PAGES.reduce(([c, n], p) => { const q = pageProgress(game, p.id); return [c + q.claimed, n + q.needed]; }, [0, 0]);
const pagesDoneCount = game => PAGES.filter(p => game?.progress?.flags?.pages?.[p.id] || pageProgress(game, p.id).done).length;
const masterpieceOf = game => (game?.inventory || []).find(i => i.masterpiece === true && !i.shattered) || null;
const wardenName = game => String(game?.party?.roster?.warden?.name || 'the Warden');

// The Opening's title card (P3's council-5 ends with { end: 'act3-open' }): the fifth council, the four boxes opened
// together, the stair in the vault floor. Pure: node tests use it.
export function openingCard(game) {
  const lit = Math.min(BRAND_TOTAL, game ? uniqueBrands(game) : BRAND_TOTAL);
  return {
    kick: 'Act III', title: 'The Hollow Council', label: 'Act III: The Hollow Council', coals: lit,
    lines: [
      'Four gifts, opened together. Four chairs, empty. Elder Miravel, Cistern Lord Qasim, Thane Brundar and Mayor Gretch walked down a stair that was never there.',
      'The stair under the vault stands open. The Hollow Council waits below the Keep.',
    ],
  };
}

export function showOpening(ctx, game) {
  const V = openingCard(game);
  const C = card(ctx, { cls: 'act3 act3-open', label: V.label, button: 'Go down' });
  const P = C.panel;
  const coals = el('div', { class: 'brand-coals', role: 'img', 'aria-label': `The Hearth Clock: ${V.coals} of ${BRAND_TOTAL} coals lit` });
  for (let i = 0; i < BRAND_TOTAL; i++) coals.append(el('i', 'coal' + (i < V.coals ? ' lit' : '')));
  P.append(text('p', 'kick', V.kick), text('h2', 'title-display', V.title), coals);
  for (const line of V.lines) P.append(text('p', 'act3-text', line));
  P.append(C.go);
  ctx.audio.sfx('phase');
  return C.wait();
}

// The endings (data/endings.js): each one's card, its still (the player's painting, CUTS['ending-<id>']) or its own
// drawn scene, and its words. Kindle Anew names the Warden's Masterpiece, as text.
const ENDING_CARD = {
  rekindle: { kick: 'The first ending', lines: ['The chains take the Sleepers’ weight again. The Eternal Hearth burns as it always has, warm and paid for, and the realm sleeps easy.'] },
  release: { kick: 'The second ending', lines: ['The chains break. The Sleepers wake and go, and for the first time in nine hundred years the Eternal Hearth goes out. The Keep is cold tonight, and free.'] },
  anew: { kick: 'The true ending', lines: ['The chains break, and the Sleepers go free. Stirred with Fenwick’s Poker, the hearth takes a fire the Warden made: a legend of their own.'] },
};
export function endingCard(game, id) {
  const E = ENDINGS[id] || ENDINGS.rekindle;
  const Q = ENDING_CARD[E.id];
  const mp = E.id === 'anew' ? masterpieceOf(game) : null;
  return {
    id: E.id, name: E.name, kick: Q.kick, sub: E.text, cut: `ending-${E.id}`, still: !!CUTS[`ending-${E.id}`],
    lines: [...Q.lines, ...(mp ? [`${mp.name} burns in the Eternal Hearth.`] : [])],
  };
}

// The credits: who stood in the story, then this journey's own numbers (every saved string is set as text).
const CAST = [
  ['isolde', 'Warden-Commander of Hearthstone Keep'], ['fenwick', 'who kept the hearth'], ['hilda', 'smith of Ironhold'],
  ['tamsin', 'who came back'], ['miravel', 'Elder of Eldergrove'], ['qasim', 'of the Sandspire cistern'], ['brundar', 'of Ironhold'], ['gretch', 'of Bogmire'],
];
export function creditsOf(game) {
  const roster = game?.party?.roster || {};
  const party = (game?.party?.active || ['warden', 'pip', 'bryn', 'alondra']).filter(id => id !== 'warden').map(id => String(roster[id]?.name || id));
  const E = ENDINGS[game?.ending] || null;
  const mp = masterpieceOf(game);
  return {
    title: 'Aethermoor: Hearth & Heirloom',
    rows: [
      ['The Warden', wardenName(game)],
      ['Beside the Warden', party.join(', ')],
      ...CAST.map(([id, role]) => [String(NPCS[id]?.name || id), role]),
      [String(NPCS.unsmith?.name || 'Harrow Ironvein'), 'the Unsmith'],
    ],
    journey: [
      ['Days on the road', String(game?.progress?.flags?.day || 1)],
      ['Relics claimed', relicTally(game).join(' of ')],
      ['Brands', `${game ? uniqueBrands(game) : 0} of ${BRAND_TOTAL}`],
      ['Codex pages', `${pagesDoneCount(game)} of ${PAGES.length}`],
      ...(mp ? [['The Masterpiece', String(mp.name)]] : []),
      ...(E ? [['The ending', E.name]] : []),
    ],
    thanks: 'Thank you for playing.',
  };
}

// The last card (spec A15): the game goes on at the Keep; the post-game is the next chapter's.
export const LAST_CARD = Object.freeze({
  kick: 'The story goes on', title: 'The post-game opens in the next chapter',
  lines: Object.freeze([
    'The Keep is yours to walk, and the realm remembers what you chose.',
    'The Heat ladder, the Champions awake again, the relics he took going back into the world, the Emberless Reach and the First Smith: all of it waits for the next chapter.',
  ]),
});

// an ending's own scene, drawn (180x120, pixel for pixel) when the player's still is missing or will not load
function drawEndingScene(id, w = 180, h = 120) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const hash = (x, y) => { let q = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; q = Math.imul(q ^ (q >>> 13), 1274126177); return ((q ^ (q >>> 16)) >>> 0) / 4294967296; };
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const rect = (x, y, rw, rh, c) => { g.fillStyle = c; g.fillRect(x, y, rw, rh); };
  const warm = id === 'rekindle', anew = id === 'anew';
  // the hall: dithered stone, lit from the hearth (or, released, from a pale dawn above)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.hypot((x - w / 2) / w, (y - h * 0.62) / h);
    const lit = (warm ? 0.9 : anew ? 0.8 : 0.35) - d * 1.3 + (hash(x >> 1, y >> 1) - 0.5) * 0.18 + (id === 'release' ? (1 - y / h) * 0.25 : 0);
    const pal = warm ? ['#140c08', '#2a170e', '#4a2614', '#6e3a18'] : anew ? ['#0b0d15', '#131826', '#1d2438', '#293350'] : ['#0c0c10', '#16161c', '#22222a', '#34343e'];
    px(x, y, pal[Math.max(0, Math.min(3, Math.floor(lit * 4)))]);
  }
  // stone courses across the back wall
  for (let y = 8; y < h * 0.7; y += 9) for (let x = (y / 9) % 2 ? 0 : 6; x < w; x += 12) rect(x, y, 1, 9, 'rgba(0,0,0,0.25)');
  for (let y = 8; y < h * 0.7; y += 9) rect(0, y, w, 1, 'rgba(0,0,0,0.3)');
  // the floor
  rect(0, Math.round(h * 0.78), w, h, '#0e0b0a');
  for (let x = 0; x < w; x += 2) px(x, Math.round(h * 0.78), '#3a2e26');
  // the great hearth: a stone arch, its mouth, and what burns in it
  const cx = Math.round(w / 2), top = Math.round(h * 0.3), bot = Math.round(h * 0.8), hw = Math.round(w * 0.2);
  for (let y = top - 6; y < bot; y++) {
    const inner = y < top + hw ? Math.round(Math.sqrt(Math.max(0, hw * hw - (top + hw - y) ** 2))) : hw;
    rect(cx - inner - 6, y, 6, 1, '#4a4038'); rect(cx + inner, y, 6, 1, '#4a4038');
    rect(cx - inner, y, inner * 2, 1, '#07060a');
  }
  const flame = warm ? ['#7a2a0e', '#ee8e31', '#ffcb66', '#fff4c0'] : anew ? ['#28304a', '#6a7eb0', '#c4d6f4', '#ffffff'] : null;
  if (flame) {
    for (let i = 0; i < 260; i++) {
      const u = hash(i, 3), v = hash(i, 7), fx = cx + Math.round((u - 0.5) * hw * 1.6 * (1 - v * 0.6)), fy = bot - 2 - Math.round(v * v * hw * 1.5);
      px(fx, fy, flame[Math.min(3, Math.floor((1 - v) * 3 + hash(i, 11)))]);
    }
  } else {
    // released: cold ash in the hearth's mouth
    for (let i = 0; i < 90; i++) px(cx + Math.round((hash(i, 5) - 0.5) * hw * 1.8), bot - 1 - Math.round(hash(i, 9) * 4), hash(i, 2) < 0.5 ? '#5a5a62' : '#8a8a92');
  }
  if (anew) {
    // the Masterpiece standing in the new fire, and the poker leaning on the arch
    rect(cx - 1, bot - hw - 8, 2, hw + 4, '#eef4ff'); rect(cx - 4, bot - hw + 2, 8, 2, '#c4d6f4');
    for (let y = 0; y < 20; y++) px(cx + hw + 2 - Math.round(y / 3), bot - 1 - y, '#8a8a92');
  }
  // the chains: hung whole over the fire (rekindle), or broken on the floor (release, anew)
  const chain = warm ? '#c9a878' : '#6a6a72';
  if (warm) {
    for (const side of [-1, 1]) for (let k = 0; k < 16; k++) { const x = cx + side * (hw + 8 + k * 3), y = top + 4 + Math.round(Math.sin(k / 15 * Math.PI) * 10); rect(x - 1, y, 3, 2, chain); px(x, y + 1, '#000'); }
  } else {
    for (let k = 0; k < 7; k++) { const x = Math.round(w * 0.15) + k * 4, y = Math.round(h * 0.84) + (k % 2); rect(x, y, 3, 2, chain); }
    for (let k = 0; k < 6; k++) { const x = Math.round(w * 0.7) + k * 4, y = Math.round(h * 0.86) - (k % 2); rect(x, y, 3, 2, chain); }
  }
  // sparks going up
  for (let i = 0; i < (flame ? 16 : 5); i++) px(cx + Math.round((hash(i, 21) - 0.5) * hw * 3), Math.round(hash(i, 23) * top), flame ? flame[3] : '#c8c8d0');
  return cv;
}

export function showEnding(ctx, game, id) {
  const V = endingCard(game, id);
  const reduced = ctx.reduced();
  const C = card(ctx, { cls: `ending ending-${V.id}`, label: `The ending: ${V.name}`, button: 'The credits' });
  const P = C.panel;
  P.append(text('p', 'kick', V.kick), text('h2', 'title-display', V.name));
  const view = el('div', { class: `region-view ending-view${reduced ? '' : ' drift'}`, role: 'img', 'aria-label': `${V.name}: ${V.sub}` });
  const drawn = () => { view.classList.add('drawn'); view.replaceChildren(); try { const cv = drawEndingScene(V.id); cv.classList.add('region-drawn'); view.append(cv); } catch { /* the words alone */ } };
  const still = CUTS[V.cut];
  if (still) {
    const img = el('img', { class: 'region-still', src: still.src, alt: '', width: still.w, height: still.h, draggable: 'false', decoding: 'async' });
    img.addEventListener('error', drawn);
    view.append(img);
  } else drawn();
  P.append(view, text('p', 'ending-sub', V.sub));
  for (const line of V.lines) P.append(text('p', 'ending-text', line));
  P.append(C.go);
  ctx.audio.sfx('legend');
  return C.wait();
}

export function showCredits(ctx, game) {
  const V = creditsOf(game);
  const reduced = ctx.reduced();
  const C = card(ctx, { cls: 'credits', label: 'The credits', button: 'Onward' });
  const P = C.panel;
  const roll = el('div', { class: `credits-roll${reduced ? '' : ' rolling'}` });
  roll.append(text('p', 'kick', 'The end of Act III'), text('h2', 'title-display', V.title));
  const cast = el('dl', 'credits-cast');
  for (const [k, v] of V.rows) cast.append(text('dt', '', k), text('dd', '', v));
  const mine = el('dl', 'credits-journey');
  for (const [k, v] of V.journey) mine.append(text('dt', '', k), text('dd', '', v));
  // while there is more below the box, its foot fades and a cue under it says so (M7 review: the journey sat below
  // the fold)
  const more = text('p', 'credits-more', 'More below');
  more.setAttribute('aria-hidden', 'true');
  roll.append(cast, text('p', 'label credits-k', 'Your journey'), mine, text('p', 'credits-thanks', V.thanks));
  P.append(roll, more, C.go);
  const atEnd = () => roll.scrollTop + roll.clientHeight >= roll.scrollHeight - 4;
  const cue = () => { const end = atEnd(); more.classList.toggle('gone', end); roll.classList.toggle('more', !end); };
  roll.addEventListener('scroll', cue, { passive: true });
  requestAnimationFrame(cue);
  // the roll moves on its own, slowly, once the names are in (never under reduced motion); a touch, a wheel or a key
  // hands it to the player
  if (!reduced) {
    let t0 = 0, held = false;
    const hold = () => { held = true; };
    for (const e of ['pointerdown', 'wheel', 'touchstart', 'keydown']) roll.addEventListener(e, hold, { passive: true, once: true });
    const step = t => {
      if (held || !roll.isConnected) return;
      t0 = t0 || t;
      const y = Math.min(roll.scrollHeight - roll.clientHeight, Math.max(0, (t - t0 - 2600) * 0.032));
      if (y > roll.scrollTop) roll.scrollTop = y;
      if (!atEnd()) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  ctx.audio.sfx('victory');
  return C.wait();
}

export function showLastCard(ctx) {
  const V = LAST_CARD;
  const C = card(ctx, { cls: 'last-card', label: V.title, button: 'Back to the Great Hall' });
  const P = C.panel;
  P.append(text('p', 'kick', V.kick), text('h2', 'title-display', V.title));
  for (const line of V.lines) P.append(text('p', 'last-text', line));
  P.append(C.go);
  ctx.audio.sfx('page');
  return C.wait();
}

// An ending, after its scene: its card, the credits, the last card (the world then walks the party back to the Great
// Hall)
export async function playEnding(ctx, game, id) {
  await showEnding(ctx, game, id);
  await showCredits(ctx, game);
  await showLastCard(ctx);
}
