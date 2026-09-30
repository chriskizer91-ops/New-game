// The Atlas (M3 spec §5.6; M4 spec §5.4): the player's illustrated map with the open regions on it.
// mount(root, ctx, { mode: 'travel' | 'view' = 'view', from = 'world', view? })
//
//   - views: "Wilds" (the Verdant quarter fills the frame), "Sunscorch" (the Sunscorch Wastes, once
//     the region is open: the Keep's south-east gate after Act I), "Ironspire" (M5: the Ironspire
//     Peaks, once the Keep's east postern opens with the second council), "Gloomfen" (M6: the Gloomfen
//     Marsh, once the fen stair below Mossfall opens with the third council) and "Realm" (the whole map).
//     Travel and phones open on the view of the region you stand in; a view picked this session sticks
//   - 44 px markers at viewBox coordinates (1200x800, the image's own aspect), pushed apart where
//     they would overlap, with a leader line back to the true spot:
//       the Hearthfires of the region in view (all of them in the Realm view on a laptop; on a phone
//       the Realm view shows one marker per open region instead): lit when kindled, dim when known,
//       faint when never seen; in travel mode a tap on a kindled one travels there (gauntlet.travel)
//       and returns to the world. Labels (laptop) name the place a fire stands in (Sandspire,
//       Thornhollow), else the fire itself
//       "you are here", projected onto the current map's lore line (it slides as you walk)
//       padlocks on the sealed regions (Sandspire until Act I is done, Ironhold until the second
//       council, Bogmire until the third); a sealed region's note says what opens its road (SEALED_NOTE,
//       else the hint of its entry gate)
//   - map annotations: routes you have walked (only the open regions' routes), sighted holders (an
//     eye), claimed relics (a star), Longwatch marks (a spyglass: the chests, locks and holders on the
//     maps of every lookout in data/dialogue.js LOOKOUTS whose flag is set), and dimmed place names in
//     the Realm view
//   - the Hearth Clock (8 coals, uniqueBrands of them lit, and the Waking)
//   - a Hearthfire list under the map (beside it on a laptop), one group per open region, that also
//     travels, and a list of the marks; both are the keyboard and screen-reader path
//   - view only underground (a map with travel: false), and in view mode
//   - a procedural parchment with the same markers when the image fails (or is the placeholder)
// Test hooks: markers are .atlas-mk[data-key] (hearths also [data-hearth]); list rows are
// .atlas-hf[data-hearth] (grouped in .atlas-grp[data-region]); view buttons are
// .atlas-view[data-view]; the frame carries data-view and data-art ('image' | 'parchment').
// M7 (spec §5): the Hearth Below lies under the Keep, with no place of its own on the painting. Once the vault stair
// opens (the fifth council), a "Below the Keep" marker stands on the Keep in the Wilds and Realm views (on a phone's
// Realm, the region's own marker), and opens the Below view: its two fires, "you are here", and its four maps listed
// (belowMaps: where you are, walked, or not yet). The realm keeps its 33 fires and leaves the two below to that view.
// Owner: WP8; M4 P7b (the Sunscorch); M5 P7 (the Ironspire); M6 P7 (the Gloomfen); M7 P7 (Below the Keep).
import ATLAS_IMAGE, { ATLAS_PLACEHOLDER } from '../assets/atlas-image.js';
import { HEARTHS, HEARTH_IDS, REGIONS, LORE, BRAND_TOTAL } from '../../data/world.js';
import { MAPS, MAP_IDS } from '../../data/maps/index.js';
import { ENCOUNTERS } from '../../data/encounters.js';
import { FOES } from '../../data/foes.js';
import { RELICS } from '../../data/relics.js';
import { travel, uniqueBrands, spawnsFor } from '../../rules/gauntlet.js';
import { present, lockStatus } from '../../rules/world.js';
import { nextObjective } from '../../rules/story.js';
import { relicItem } from '../../rules/loot.js';
import { createRng } from '../../core/rng.js';
import { el, esc, button } from '../lib/dom.js';
import { screenNav } from '../lib/keys.js';
import { LOOKOUTS } from '../../data/dialogue.js';
import { VIEWS, REGION_VIEW, regionOpen, placeOf, loreAt, entityLore, toFrame, relax, RELIC_SITE, belowMaps } from '../lib/atlas-geo.js';

// Small inline icons (static markup, 16x16).
const ICON = {
  fire: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1c.6 2.6 3.8 3.9 3.8 7.9a3.8 3.8 0 0 1-7.6 0c0-1.9.9-3 1.9-3.9-.1 1.7.6 2.7 1.6 3.1C6.9 6.2 8.2 3.9 8 1z"/></svg>',
  coal: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 11.5C3 9.6 5.2 8.5 8 8.5s5 1.1 5 3-2.2 2.5-5 2.5-5-.6-5-2.5z"/><path d="M6.5 9.5l1 2 1.5-1.5" fill="none" stroke="#000" stroke-opacity=".5"/></svg>',
  lock: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.2"/><path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  pin: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15.5s5-5.1 5-9A5 5 0 0 0 3 6.5c0 3.9 5 9 5 9z"/><circle cx="8" cy="6.4" r="2.1" fill="#fff4dc"/></svg>',
  wilds: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1l4 6H9.5l3 4H9v4H7v-4H3.5l3-4H4z"/></svg>',
  // a sun over a dune
  sunscorch: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="6.2" r="3"/><path d="M8 .6v1.6M3 2.6l1.1 1.1M13 2.6l-1.1 1.1M1.4 7h1.6M13 7h1.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M0.5 15c2-3.4 4.6-4.6 7.5-4.6s5.5 1.2 7.5 4.6z"/></svg>',
  // two peaks, snow on the taller one (M5)
  ironspire: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M0.5 14.5L6 4.2l2.6 4.6 1.9-3 5 8.7z"/><path d="M6 4.2l1.9 3.4-1.1-.6-.8 1.2-.9-1.1-1 .5z" fill="#f5ecd0"/></svg>',
  // three bulrushes over black water (M6)
  gloomfen: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.3 12.6V6.8h1.1v5.8zM7.6 12.6V4.6h1.1v8zM10.9 12.6V6h1.1v6.6z"/><rect x="3.9" y="3" width="1.9" height="4.4" rx=".95"/><rect x="7.2" y="1" width="1.9" height="4.4" rx=".95"/><rect x="10.5" y="2.6" width="1.9" height="4" rx=".95"/><path d="M.8 14.6c1.2-.9 2.4-.9 3.6 0s2.4.9 3.6 0 2.4-.9 3.6 0 2.4.9 3.6 0" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
  // a stair going down through a floor (M7: below the Keep)
  below: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 3.5h14v1.6H1z"/><path d="M3 6.4h3.2v2.2H9v2.2h2.8V13H15v1.6H10.2v-2.2H7.4v-2.2H4.6V8H3z"/></svg>',
};
const REGION_ICON = { verdant: ICON.wilds, sunscorch: ICON.sunscorch, ironspire: ICON.ironspire, gloomfen: ICON.gloomfen, below: ICON.below };
const BELOW_LABEL = 'Below the Keep';
// What opens a sealed region's road, for its padlock's note (else its entry gate's own hint)
const SEALED_NOTE = {
  sunscorch: 'The Keep\'s south-east gate opens once both Brands of the Wilds are yours.',
  ironspire: 'The Keep\'s east postern opens once the Council has sat a second time.',
  gloomfen: 'The fen stair below Mossfall opens once the Council has sat a third time.',
};
const TREE = 'M0 -6 L4 0 H1.5 L4.5 4 H0.9 V7 H-0.9 V4 H-4.5 L-1.5 0 H-4 Z';
const EYE = 'M-6 0 C-3 -4.5 3 -4.5 6 0 C3 4.5 -3 4.5 -6 0 Z';
const STAR = 'M0 -6 L1.8 -1.9 6 -1.9 2.6 0.8 3.8 5.2 0 2.6 -3.8 5.2 -2.6 0.8 -6 -1.9 -1.8 -1.9 Z';

const inSentence = s => String(s || '').replace(/^The /, 'the ');
const holderName = s => {
  const F = FOES[s.family];
  const base = s.name || F?.variants?.[s.variant]?.name || F?.name || s.family;
  return s.title ? `${base} ${s.title}` : base;
};
const VIEW_NAME = { wilds: 'The Verdant Wilds', sunscorch: 'The Sunscorch Wastes', ironspire: 'The Ironspire Peaks', gloomfen: 'The Gloomfen Marsh', below: 'The Hearth Below', realm: 'The Realm of Aethermoor' };
const VIEW_BUTTON = { wilds: 'Wilds', sunscorch: 'Sunscorch', ironspire: 'Ironspire', gloomfen: 'Gloomfen', below: 'Below', realm: 'Realm' };
const VIEW_REGION = Object.fromEntries(Object.entries(REGION_VIEW).map(([r, v]) => [v, r]));
const shortRegion = r => String(REGIONS[r]?.name || r).replace(/^The /, '');
// The keys that light a cold Hearthfire, from the lock itself ("Kindle, Lamplight or Attunement 3").
function coldKeys(game) {
  let st = null;
  try { st = lockStatus(game, 'cold-hearth'); } catch { st = null; }
  const names = (st?.keys || []).map(k => (k.kind === 'power' ? k.detail : k.label)).filter(Boolean);
  if (!names.length) return 'a flame';
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}
let lastView = null; // the view chosen last this session

export function mount(root, ctx, params = {}) {
  if (!ctx.game) { ctx.go('title'); return {}; }
  const game = ctx.game;
  const mode = params.mode === 'travel' ? 'travel' : 'view';
  const from = params.from || 'world';
  const f = game.progress.flags || {};
  const story = f.story || {};
  // the world commits its Walk before it opens a menu, so progress.pos is where the party stands
  const pos = game.progress.pos && MAPS[game.progress.pos.map] ? game.progress.pos : null;
  const hereMap = pos ? MAPS[pos.map] : null;
  const here = pos ? loreAt(pos.map, pos.x, pos.y) : null;
  const underground = !!hereMap && hereMap.travel === false;
  const canTravel = mode === 'travel' && !underground;
  const back = () => { ctx.audio.sfx('back'); ctx.go(from); };

  // ---- the regions: open ones have a view and their fires; sealed ones a padlock ----------------
  const open = new Set(Object.keys(REGIONS).filter(r => regionOpen(game, r)));
  const hereRegion = hereMap?.region || 'verdant';
  const views = ['wilds', ...Object.keys(REGION_VIEW).filter(r => r !== 'verdant' && open.has(r)).map(r => REGION_VIEW[r]), 'realm'];

  // ---- what goes on the map -------------------------------------------------------------------
  const hearths = HEARTH_IDS.map(id => {
    const h = HEARTHS[id];
    const kindled = !!f.kindled?.[id];
    const known = kindled || !!f.visits?.[h.map] || (pos && pos.map === h.map);
    const region = MAPS[h.map]?.region || 'verdant';
    // a place's own fire is labelled with the place (Sandspire), a fire on the road with its own name
    const home = Object.values(LORE).find(p => p.map === h.map);
    return { id, h, kindled, known, region, place: placeOf(h.map), label: home ? home.name : h.name, mapName: MAPS[h.map]?.name || h.map };
  }).filter(x => open.has(x.region) || x.kindled || x.known); // a sealed region's fires stay off the map
  const kindledCount = hearths.filter(x => x.kindled).length;
  const inRegion = r => hearths.filter(x => x.region === r);

  const holders = [], longwatch = [];
  // Longwatch (data/dialogue.js LOOKOUTS): a lookout's flag marks the chests, locks and holders on its maps
  const watched = new Set(Object.values(LOOKOUTS).filter(l => story[l.flag]).flatMap(l => l.maps).filter(m => MAPS[m]));
  for (const mapId of MAP_IDS) {
    let here0;
    try { here0 = present(game, mapId); } catch { continue; }
    const counts = { chests: 0, locks: 0, holders: 0 }, marks = [];
    for (const e of here0) {
      const at = entityLore(mapId, e);
      if (!at) continue;
      if (e.kind === 'encounter') {
        let spawns = [];
        try { spawns = spawnsFor(game, e.enc); } catch { spawns = []; }
        let holds = false;
        for (const s of spawns) {
          const pieces = [...(s.held || []).filter(p => p.relic).map(p => ({ relic: p.relic, lend: !!p.lend })), ...(s.wears ? [{ relic: s.wears, worn: true }] : [])];
          for (const p of pieces) {
            holds = true;
            const c = game.codex?.[p.relic];
            if (c?.sighted && !c.claimed) holders.push({ ...p, enc: e.enc, holder: holderName(s), map: mapId, at });
          }
        }
        if (holds && watched.has(mapId)) { counts.holders++; marks.push({ kind: 'holder', at }); }
      } else if (watched.has(mapId) && e.kind === 'chest' && e.state === 'closed' && !e.hidden) { counts.chests++; marks.push({ kind: 'chest', at }); }
      else if (watched.has(mapId) && e.kind === 'lock' && e.state === 'locked') { counts.locks++; marks.push({ kind: 'lock', at }); }
    }
    if (watched.has(mapId) && marks.length) longwatch.push({ map: mapId, counts, marks });
  }
  const claimed = Object.keys(RELICS).filter(r => game.codex?.[r]?.claimed && RELIC_SITE[r]).map(r => {
    const enc = RELIC_SITE[r];
    for (const m of MAP_IDS) {
      const e = MAPS[m].entities.find(x => x.kind === 'encounter' && x.enc === enc);
      if (e) return { relic: r, enc, map: m, at: entityLore(m, e) };
    }
    return null;
  }).filter(x => x && x.at);

  // a region is sealed until one of its roads opens (the Sunscorch: the Keep's south-east gate, after
  // Act I); REGIONS.open alone says only that its maps exist. M7: Act III's region lies under the Keep, with no place of
  // its own on the painting, so it has no padlock: its "Below the Keep" marker stands on the Keep once its stair opens
  const sealed = Object.values(REGIONS).filter(r => !open.has(r.id) && r.act < 3).map(r => {
    const texts = [], hints = [];
    // the roads into it from outside (a gate inside the region, like Stormwatch's north gate, is not its road)
    for (const m of MAP_IDS) {
      if (MAPS[m].region === r.id) continue;
      for (const x of MAPS[m].exits) if (x.sealed?.region === r.id) { texts.push(x.sealed.text); if (x.sealed.hint) hints.push(x.sealed.hint); }
    }
    const cap = Object.values(LORE).find(p => p.region === r.id && p.at[0] === r.lore[0] && p.at[1] === r.lore[1]);
    return { id: r.id, name: r.name, place: cap?.name || r.name, at: r.lore, texts, hint: SEALED_NOTE[r.id] || hints[0] || null, later: !r.open };
  });

  // ---- skeleton ---------------------------------------------------------------------------------
  const top = el('header', 'topbar');
  const title = el('div', 'tb-title');
  const h1 = el('h1', { class: 'title-display', text: VIEW_NAME.wilds });
  title.append(el('span', { class: 'realm', text: mode === 'travel' ? 'Travel' : 'The Atlas' }), h1);
  top.append(button('‹ Back', 'btn ghost back', back), title);

  const bar = el('div', 'atlas-bar');
  const viewBar = el('div', { class: 'atlas-views', role: 'group', 'aria-label': 'Map view', 'data-n': String(views.length) });
  viewBar.style.setProperty('--n', String(views.length));
  const vBtn = {};
  for (const v of views) {
    vBtn[v] = button(VIEW_BUTTON[v], 'btn seg-b atlas-view', () => { if (view !== v) { ctx.audio.sfx('page'); setView(v); } }, { 'data-view': v, 'aria-pressed': 'false' });
    viewBar.append(vBtn[v]);
  }
  const coals = uniqueBrands(game), waking = game.progress.waking || 0;
  const clock = el('div', { class: 'hclock', role: 'img', 'aria-label': `Hearth Clock: ${coals} of ${BRAND_TOTAL} coals lit, Waking ${waking}` });
  const coalRow = el('span', 'hc-coals');
  for (let i = 0; i < BRAND_TOTAL; i++) coalRow.append(el('i', i < coals ? 'lit' : ''));
  clock.append(el('span', { class: 'hc-k', text: 'Hearth Clock' }), coalRow, el('b', { class: 'hc-w', text: `Waking ${waking}` }));
  bar.append(viewBar, clock);

  const frame = el('div', { class: 'atlas-frame', role: 'group', 'aria-label': 'The illustrated map' });
  const sheet = el('div', 'atlas-sheet');
  const ink = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ink.setAttribute('class', 'atlas-ink'); ink.setAttribute('aria-hidden', 'true');
  const marks = el('div', 'atlas-marks');
  frame.append(sheet, ink, marks);
  const info = el('section', { class: 'atlas-info panel', 'aria-live': 'polite' });

  const side = el('aside', 'atlas-side');
  const list = el('section', 'atlas-list panel');
  const notes = el('section', 'atlas-notes panel');
  side.append(list, notes);
  const main = el('div', 'atlas-main');
  main.append(frame, info);
  const wrap = el('div', 'atlas-wrap');
  wrap.append(main, side);
  root.append(top, bar, wrap);

  // ---- the art: the image, or the procedural parchment ----------------------------------------
  let ready = false; // set once the first layout has run
  const useParchment = () => {
    if (frame.dataset.art === 'parchment') return;
    frame.dataset.art = 'parchment';
    const cv = el('canvas', { class: 'atlas-parch', 'aria-hidden': 'true' });
    paintParchment(cv);
    sheet.replaceChildren(cv);
    if (ready) layout(); // the parchment gets its ink trees
  };
  if (ATLAS_PLACEHOLDER || !ATLAS_IMAGE) useParchment();
  else {
    frame.dataset.art = 'image';
    const img = el('img', { class: 'atlas-img', alt: '', draggable: 'false', decoding: 'async' });
    img.addEventListener('error', useParchment);
    img.addEventListener('load', () => { if (img.naturalWidth < 16) useParchment(); });
    img.src = ATLAS_IMAGE;
    sheet.append(img);
  }

  // ---- markers --------------------------------------------------------------------------------
  // the region you stand in: travel and phones open on it; a view picked this session sticks
  const hereView = REGION_VIEW[hereRegion] && views.includes(REGION_VIEW[hereRegion]) ? REGION_VIEW[hereRegion] : 'wilds';
  const asked = views.includes(params.view) ? params.view : null;
  let view = asked || (mode === 'travel' ? hereView : (views.includes(lastView) ? lastView : ((root.clientWidth || innerWidth) < 720 ? hereView : 'realm')));
  let selected = null;
  const markerEls = new Map();
  const hfState = x => (x.kindled ? 'kindled' : x.h.cold && x.known ? 'cold' : x.known ? 'unlit' : 'unknown');
  const stateWord = { kindled: 'Kindled', cold: 'Cold', unlit: 'Not kindled yet', unknown: 'Not found yet' };

  function markerList(ppu) {
    const out = [];
    const region = VIEW_REGION[view];
    // a region's view shows its own fires; the Realm shows them all where there is room (a laptop),
    // and one marker per open region on a phone. M7: the Hearth Below's fires lie under the Keep, so the Realm
    // leaves them to their own view, and marks the Keep "Below the Keep" (spec §5)
    const showHearths = !!region || ppu >= 0.6;
    // M7: "Below the Keep", on the Keep, once the vault stair is open: it opens the Below view (the phone's Realm
    // shows it as the region's own marker, below)
    if (open.has('below') && (view === 'wilds' || (view === 'realm' && showHearths))) {
      out.push({ key: 'below', kind: 'below', at: REGIONS.below.lore, cls: 'mk-below', icon: ICON.below, label: BELOW_LABEL, place: true, aria: `${BELOW_LABEL}: ${REGIONS.below.name}. Show it` });
    }
    if (showHearths) {
      for (const x of region ? inRegion(region) : hearths.filter(y => REGIONS[y.region]?.act !== 3)) {
        const st = hfState(x);
        out.push({
          key: `hf:${x.id}`, kind: 'hearth', at: x.h.lore, cls: `mk-hearth is-${st}`, icon: st === 'kindled' ? ICON.fire : ICON.coal,
          label: x.label, hearth: x.id, place: x.label !== x.h.name,
          aria: `${x.h.name}, ${x.mapName}: ${stateWord[st]}${canTravel && x.kindled ? '. Travel here' : ''}`,
        });
      }
    } else {
      for (const r of Object.keys(REGION_VIEW).filter(id => open.has(id))) {
        const R = REGIONS[r], fires = inRegion(r), lit = fires.filter(x => x.kindled).length;
        // M7: the Hearth Below's marker is "Below the Keep"
        const label = r === 'below' ? BELOW_LABEL : R.name;
        out.push({ key: `region:${r}`, kind: 'region', region: r, at: R.lore, cls: `mk-region rg-${r}${r === 'below' ? ' mk-below' : ''}`, icon: REGION_ICON[r] || ICON.wilds, label, aria: `${label}: ${lit} of ${fires.length} Hearthfires kindled. Show ${inSentence(R.name)}` });
      }
    }
    for (const r of sealed) out.push({ key: `sealed:${r.id}`, kind: 'sealed', at: r.at, cls: 'mk-sealed', icon: ICON.lock, label: r.place, aria: `${r.name}: sealed` });
    if (here) out.push({ key: 'here', kind: 'here', at: here, cls: 'mk-here', icon: ICON.pin, label: null, aria: `You are here: ${hereMap?.name || ''}`, weight: 0.15 });
    return out;
  }

  function layout() {
    const W = frame.clientWidth, H = frame.clientHeight;
    if (!W || !H) return;
    const V = VIEWS[view];
    const ppu = W / V.w;
    frame.dataset.view = view;
    frame.classList.toggle('labels', W >= 600 && view !== 'realm');
    frame.setAttribute('aria-label', view === 'realm' ? 'The illustrated map: the whole Realm of Aethermoor' : `The illustrated map: ${inSentence(VIEW_NAME[view])}`);
    h1.textContent = VIEW_NAME[view];
    for (const [v, b] of Object.entries(vBtn)) b.setAttribute('aria-pressed', String(v === view));
    Object.assign(sheet.style, { width: `${W * 1200 / V.w}px`, height: `${H * 800 / V.h}px`, left: `${-V.x / V.w * W}px`, top: `${-V.y / V.h * H}px` });

    const nodes = markerList(ppu).map(m => {
      const [x0, y0] = toFrame(V, m.at, W, H);
      // a marker outside the view sits on the frame's edge, pointing the way
      const off = x0 < 0 || y0 < 0 || x0 > W || y0 > H;
      const arrow = off ? (y0 < 0 ? '↑' : y0 > H ? '↓' : '') + (x0 < 0 ? '←' : x0 > W ? '→' : '') : '';
      return { ...m, x0: Math.max(0, Math.min(W, x0)), y0: Math.max(0, Math.min(H, y0)), off, arrow };
    });
    relax(nodes, { W, H, r: 22 });
    marks.replaceChildren();
    markerEls.clear();
    for (const n of nodes) {
      const b = button('', `atlas-mk ${n.cls}${n.off ? ' off' : ''}${selected === n.key ? ' sel' : ''}`, () => pick(n), { 'data-key': n.key, 'aria-label': n.aria });
      if (n.hearth) b.dataset.hearth = n.hearth;
      b.append(el('span', 'mk-ico', n.icon));
      if (n.label) {
        // labels read inward near the frame's edges
        const lbl = el('span', { class: `mk-lbl${n.x > W - 80 ? ' to-l' : n.x < 80 ? ' to-r' : ''}${n.y > H - 40 ? ' up' : ''}`, text: n.arrow ? `${n.label} ${n.arrow}` : n.label });
        b.append(lbl);
      }
      b.style.left = `${n.x}px`; b.style.top = `${n.y}px`;
      marks.append(b);
      markerEls.set(n.key, b);
    }
    if (frame.classList.contains('labels')) hideCrowdedLabels(nodes);
    drawInk(W, H, V, ppu, nodes);
  }

  // Greedy: the most useful labels first (lit fires, then known ones, then the rest); a label that
  // would overlap one already shown, or another marker, stays hidden.
  function hideCrowdedLabels(nodes) {
    // (M5: at the same state, a place's name wins over a plain fire's, so Ironhold Fortress is named
    // before the Deeps Furnace under it)
    const rank = n => (n.kind === 'sealed' ? 1 : n.cls.includes('is-kindled') ? 0 : n.cls.includes('is-unknown') ? 3 : 2) - (n.place ? 0.5 : 0);
    const shown = [];
    const icons = [...marks.querySelectorAll('.atlas-mk:not(.mk-here) .mk-ico')].map(e => e.getBoundingClientRect());
    const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    const fr = frame.getBoundingClientRect();
    for (const n of nodes.slice().sort((a, b) => rank(a) - rank(b))) {
      const lbl = markerEls.get(n.key)?.querySelector('.mk-lbl');
      if (!lbl) continue;
      let r = lbl.getBoundingClientRect();
      const blocked = q => shown.some(o => hit(o, q)) || icons.some(o => hit(o, q));
      if (blocked(r)) {
        // the other side of its marker, if that is free and still inside the frame (M5: Ironhold's label
        // goes above its fire, clear of the Deeps Furnace below it)
        const up = lbl.classList.contains('up');
        lbl.classList.toggle('up', !up);
        r = lbl.getBoundingClientRect();
        if (blocked(r) || r.top < fr.top || r.bottom > fr.bottom) { lbl.classList.toggle('up', up); lbl.classList.add('crowded'); continue; }
      }
      shown.push(r);
    }
  }

  function drawInk(W, H, V, ppu, nodes) {
    const P = at => toFrame(V, at, W, H);
    const inside = ([x, y]) => x >= -8 && y >= -8 && x <= W + 8 && y <= H + 8;
    let svg = '';
    ink.setAttribute('viewBox', `0 0 ${W} ${H}`);
    ink.setAttribute('width', W); ink.setAttribute('height', H);
    // routes (maps drawn as a line on the illustrated map), in the open regions only
    for (const id of MAP_IDS) {
      const L = MAPS[id].lore;
      if (!L || L.length < 2 || !open.has(MAPS[id].region || 'verdant')) continue;
      const pts = L.map(p => P([p[0], p[1]]));
      const walked = !!f.visits?.[id] || (pos && pos.map === id);
      svg += `<polyline class="rt${walked ? ' walked' : ''}" points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}"/>`;
    }
    // place names beyond the Wilds (dimmed while their region is sealed), where there is room and no
    // marker already stands on them (an open region's places are its fires' labels); a region's own view
    // names its places that have no fire of their own (M5: Frostmere Lake)
    const regionView = VIEW_REGION[view] || null;
    if ((view === 'realm' && ppu >= 0.5) || (regionView && regionView !== 'verdant')) {
      for (const p of Object.values(LORE)) {
        if (!p.region || p.region === 'verdant') continue;
        if (regionView && p.region !== regionView) continue;
        const [x, y] = P(p.at);
        // a padlock sits on its region's capital, so that name goes under the padlock
        if (sealed.some(r => r.at[0] === p.at[0] && r.at[1] === p.at[1])) { svg += `<text class="pl pl-sealed" x="${x.toFixed(1)}" y="${(y + 34).toFixed(1)}">${esc(p.name)}</text>`; continue; }
        if (nodes.some(n => n.kind === 'hearth' && Math.hypot(n.x0 - x, n.y0 - y) < 14)) continue;
        svg += `<circle class="pl-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5"/><text class="pl${open.has(p.region) ? ' pl-open' : ''}" x="${x.toFixed(1)}" y="${(y - 7).toFixed(1)}">${esc(p.name)}</text>`;
      }
    }
    // annotations: Longwatch marks, sighted holders and claimed relics, fanned out around shared spots
    // (smaller when the whole Realm is squeezed into a phone)
    const k = Math.round(Math.max(0.55, Math.min(1, ppu * 1.5)) * 100) / 100;
    const fan = new Map();
    const spot = at => {
      const [x, y] = P(at);
      const key = `${Math.round(x / 6)}:${Math.round(y / 6)}`;
      const n = fan.get(key) || 0; fan.set(key, n + 1);
      if (!n) return [x, y];
      const a = n * 2.4, r = (9 + 3 * Math.floor(n / 3)) * k;
      return [x + Math.cos(a) * r, y + Math.sin(a) * r];
    };
    for (const lw of longwatch) {
      for (const m of lw.marks) {
        if (!inside(P(m.at))) continue;
        const [x, y] = spot(m.at);
        svg += `<g class="lw lw-${m.kind}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k})"><circle r="3.4"/><path d="M2.4 2.4 L5.2 5.2"/></g>`;
      }
    }
    for (const c of claimed) {
      if (!inside(P(c.at))) continue;
      const [x, y] = spot(c.at);
      svg += `<path class="claimed" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k})" d="${STAR}"/>`;
    }
    for (const h of holders) {
      if (!inside(P(h.at))) continue;
      const [x, y] = spot(h.at);
      svg += `<g class="holder" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k})"><path d="${EYE}"/><circle r="1.9"/></g>`;
    }
    // Verdant stipple on the parchment only (the painting has its own trees)
    if (frame.dataset.art === 'parchment') {
      const rng = createRng('atlas-trees');
      for (let i = 0; i < 90; i++) {
        const at = [120 + rng.next() * 380, 120 + rng.next() * 190];
        const [x, y] = P(at);
        if (inside([x, y])) svg += `<path class="tree" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${Math.max(0.6, Math.min(1.6, ppu * 1.6)).toFixed(2)})" d="${TREE}"/>`;
      }
    }
    // leader lines from each pushed marker back to its true spot
    for (const n of nodes) {
      const d = Math.hypot(n.x - n.x0, n.y - n.y0);
      if (d < 5 || n.off) continue;
      svg += `<line class="lead" x1="${n.x0.toFixed(1)}" y1="${n.y0.toFixed(1)}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}"/><circle class="lead-dot" cx="${n.x0.toFixed(1)}" cy="${n.y0.toFixed(1)}" r="2.2"/>`;
    }
    ink.innerHTML = svg;
  }

  function setView(v) {
    view = v; lastView = v;
    layout();
  }

  // ---- the info panel --------------------------------------------------------------------------
  function showInfo(n) {
    info.replaceChildren();
    const head = (k, t, sub) => info.append(el('p', { class: 'kick', text: k }), el('h2', { class: 'title-display', text: t }), sub && sub !== t ? el('p', { class: 'ai-sub', text: sub }) : '');
    if (!n || n.kind === 'here') {
      head('You are here', hereMap ? hereMap.name : 'Somewhere in the Realm', hereMap ? (hereMap.region === 'below' ? BELOW_LABEL : placeOf(pos.map)) : null);
      const next = safeNext();
      if (next) info.append(el('p', { class: 'ai-next', text: `Next: ${next.text}` }));
      if (hereMap?.region === 'below') belowList();
      if (mode === 'travel') info.append(el('p', { class: 'ai-note', text: underground ? 'Underground, the Atlas is only for looking. Walk back up to a Hearthfire to travel.' : 'Tap a lit Hearthfire to travel there.' }));
      return;
    }
    if (n.kind === 'below') {
      head(BELOW_LABEL, REGIONS.below.name, 'Down the stair under the vault');
      belowList();
      if (view !== 'below' && views.includes('below')) info.append(button('Show the Hearth Below', 'btn ai-go', () => setView('below')));
      return;
    }
    if (n.kind === 'hearth') {
      const x = hearths.find(y => y.id === n.hearth);
      const st = hfState(x);
      head(stateWord[st], x.h.name, `${x.mapName}${x.place !== x.mapName ? ` · ${x.place}` : ''}`);
      const flavour = ENCOUNTERS[x.id]?.text;
      if (flavour && x.known) info.append(el('p', { class: 'ai-text', text: flavour }));
      if (st === 'cold') info.append(el('p', { class: 'ai-note', text: `It needs a flame before it will take a rest: ${coldKeys(game)}.` }));
      else if (st === 'unlit') info.append(el('p', { class: 'ai-note', text: 'Rest at it once and it stays lit for travel.' }));
      else if (st === 'unknown') info.append(el('p', { class: 'ai-note', text: 'Somewhere out there. Nobody in the party has seen it yet.' }));
      if (x.kindled && canTravel) info.append(button(`Travel to ${esc(x.h.name)}`, 'btn primary ai-go', () => go(x.id), { 'data-hearth': x.id }));
      else if (x.kindled && mode === 'travel' && underground) info.append(el('p', { class: 'ai-note', text: 'You cannot travel from underground.' }));
      return;
    }
    if (n.kind === 'sealed') {
      const r = sealed.find(y => `sealed:${y.id}` === n.key);
      head('Sealed', r.name, r.place);
      for (const t of r.texts.slice(0, 2)) info.append(el('p', { class: 'ai-text', text: `“${t}”` }));
      // the Sunscorch waits on Act I, the Ironspire on the second council (M5), the Gloomfen on the third (M6)
      const note = !r.later ? r.hint || 'Its road opens further on in the story.'
        : story['act1-complete'] ? 'The way opens in a later chapter.' : 'No road goes there yet.';
      info.append(el('p', { class: 'ai-note', text: note }));
      return;
    }
    if (n.kind === 'region') {
      const R = REGIONS[n.region], fires = inRegion(n.region);
      head('Open', R.name, `${fires.filter(x => x.kindled).length} of ${fires.length} Hearthfires kindled`);
      info.append(button(`Show ${esc(inSentence(R.name))}`, 'btn ai-go', () => setView(REGION_VIEW[n.region])));
    }
  }
  const safeNext = () => { try { return nextObjective(game); } catch { return null; } };
  // M7: the four maps below the Keep, where you are, walked or not yet
  function belowList() {
    const ul = el('ul', { class: 'atlas-below', 'aria-label': 'The maps below the Keep' });
    const word = { here: 'You are here', walked: 'Walked', unwalked: 'Not yet' };
    for (const m of belowMaps(game)) {
      const li = el('li', { class: `ab-${m.state}`, 'data-map': m.id });
      li.append(el('b', { text: m.name }), el('small', { text: word[m.state] }));
      ul.append(li);
    }
    info.append(ul);
  }

  function pick(n) {
    if (n.kind === 'hearth' && canTravel) {
      const x = hearths.find(y => y.id === n.hearth);
      if (x.kindled) { go(x.id); return; }
    }
    ctx.audio.sfx('select');
    selected = n.key;
    for (const [k, b] of markerEls) b.classList.toggle('sel', k === selected);
    if (n.kind === 'region') { setView(REGION_VIEW[n.region] || 'wilds'); showInfo(n.region === 'below' ? { kind: 'below', key: 'below' } : null); return; }
    if (n.kind === 'below') { if (views.includes('below')) setView('below'); showInfo(n); return; }
    showInfo(n);
  }

  function go(hfId) {
    const g = travel(ctx.game, hfId);
    if (!g || g === ctx.game) { ctx.toast('That Hearthfire is not lit yet.'); ctx.audio.sfx('error'); return; }
    ctx.setGame(g);
    ctx.audio.sfx('hearth');
    ctx.toast(`You travel to ${inSentence(HEARTHS[hfId].name)}.`);
    ctx.go('world', { arrive: 'travel', hearth: hfId });
  }

  // ---- the lists --------------------------------------------------------------------------------
  function renderLists() {
    list.replaceChildren(el('h2', 'label', `Hearthfires · ${kindledCount} of ${hearths.length} kindled`));
    if (mode === 'travel') list.append(el('p', { class: 'small', text: underground ? 'Underground, the Atlas is only for looking.' : 'Choose a lit Hearthfire to travel there.' }));
    // one group per region with fires on the map; the region you stand in first
    const groups = [...new Set(hearths.map(x => x.region))].sort((a, b) => (b === hereRegion) - (a === hereRegion));
    for (const r of groups) {
      const fires = inRegion(r);
      const grp = el('section', { class: 'atlas-grp', 'data-region': r });
      if (groups.length > 1) grp.append(el('h3', { class: 'atlas-grp-h', text: `${shortRegion(r)} · ${fires.filter(x => x.kindled).length} of ${fires.length}` }));
      const ul = el('ul', 'atlas-hfs');
      for (const x of fires) {
        const st = hfState(x);
        const li = el('li');
        const travelNow = canTravel && x.kindled;
        const b = button('', `atlas-hf is-${st}${travelNow ? ' go' : ''}`, () => {
          if (travelNow) { go(x.id); return; }
          ctx.audio.sfx('select');
          // show the fire where it stands: its region's view (the phone's Realm view has no fires)
          const rv = REGION_VIEW[x.region];
          if (rv && views.includes(rv) && (view === 'realm' ? frame.clientWidth / VIEWS.realm.w < 0.6 : view !== rv)) setView(rv);
          selected = `hf:${x.id}`;
          for (const [k, m] of markerEls) m.classList.toggle('sel', k === selected);
          showInfo({ kind: 'hearth', hearth: x.id, key: selected });
        }, { 'data-hearth': x.id });
        b.append(el('span', 'hf-ico', st === 'kindled' ? ICON.fire : ICON.coal), el('span', 'hf-txt', [el('b', { text: x.h.name }), el('small', { text: `${x.mapName} · ${stateWord[st]}` })]));
        if (travelNow) b.append(el('span', { class: 'hf-go', text: 'Travel' }));
        li.append(b);
        ul.append(li);
      }
      grp.append(ul);
      list.append(grp);
    }

    notes.replaceChildren(el('h2', 'label', 'Marks on the map'));
    const rows = el('ul', 'atlas-rows');
    for (const hd of holders) {
      const R = RELICS[hd.relic];
      const b = button('', 'atlas-row holder', () => {
        ctx.audio.sfx('page');
        const item = relicItem(hd.relic, createRng('preview-' + hd.relic), { from: hd.holder, where: MAPS[hd.map]?.name, day: f.day });
        ctx.services.cardPreview(item, { heldBy: hd.holder });
      });
      b.append(el('span', { class: 'ar-ico eye', 'aria-hidden': 'true' }), el('span', 'ar-txt', [el('b', { text: R.name }), el('small', { text: `${hd.lend ? 'Lent to' : hd.worn ? 'Worn by' : 'Held by'} ${hd.holder} · ${MAPS[hd.map]?.name || ''}` })]));
      rows.append(el('li', '', [b]));
    }
    for (const c of claimed) {
      const R = RELICS[c.relic];
      const owned = game.inventory.find(i => i.base === c.relic && !i.shattered) || game.inventory.find(i => i.base === c.relic);
      const b = button('', 'atlas-row claimed', () => { if (!owned) return; ctx.audio.sfx('page'); ctx.services.cardInspect(owned, { picker: false }); });
      b.append(el('span', { class: 'ar-ico star', 'aria-hidden': 'true' }), el('span', 'ar-txt', [el('b', { text: R.name }), el('small', { text: `Claimed · ${MAPS[c.map]?.name || ''}` })]));
      rows.append(el('li', '', [b]));
    }
    for (const lw of longwatch) {
      const bits = [lw.counts.chests && `${lw.counts.chests} ${lw.counts.chests === 1 ? 'chest' : 'chests'}`, lw.counts.locks && `${lw.counts.locks} ${lw.counts.locks === 1 ? 'lock' : 'locks'}`, lw.counts.holders && `${lw.counts.holders} ${lw.counts.holders === 1 ? 'holder' : 'holders'}`].filter(Boolean);
      rows.append(el('li', '', [el('div', 'atlas-row lw', [el('span', { class: 'ar-ico glass', 'aria-hidden': 'true' }), el('span', 'ar-txt', [el('b', { text: MAPS[lw.map].name }), el('small', { text: `Longwatch · ${bits.join(' · ')}` })])])]));
    }
    if (!rows.children.length) rows.append(el('li', { class: 'small', text: 'Nothing marked yet. Relics you sight on their holders show here, and so do the ones you claim.' }));
    notes.append(rows);
    notes.append(el('p', { class: 'atlas-key', html: '<i class="k-eye"></i> sighted holder <i class="k-star"></i> claimed relic <i class="k-glass"></i> Longwatch' }));
  }

  renderLists();
  showInfo(null);
  let ro = null;
  if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => layout()); ro.observe(frame); }
  requestAnimationFrame(layout);
  layout();
  ready = true;
  const nav = screenNav(root, { back, menu: back });
  return {
    unmount() { if (ro) ro.disconnect(); },
    onAction(a) { return nav(a); },
  };
}

// A procedural parchment of the Realm (600x400, half the viewBox): regions, the lake round the Keep,
// ink noise and burned edges. Used when the painting cannot load.
function paintParchment(cv) {
  const W = 600, H = 400;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const lin = g.createLinearGradient(0, 0, W, H);
  lin.addColorStop(0, '#d4b87a'); lin.addColorStop(0.3, '#e8d5a3'); lin.addColorStop(0.55, '#dcc48a'); lin.addColorStop(0.8, '#e8d5a3'); lin.addColorStop(1, '#c4a96a');
  g.fillStyle = lin; g.fillRect(0, 0, W, H);
  const blob = (x, y, r, c) => {
    const rg = g.createRadialGradient(x / 2, y / 2, 0, x / 2, y / 2, r / 2);
    rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  };
  blob(270, 230, 520, 'rgba(45, 90, 39, 0.55)');
  blob(880, 480, 520, 'rgba(196, 148, 58, 0.5)');
  blob(870, 170, 460, 'rgba(106, 110, 120, 0.55)');
  blob(270, 580, 460, 'rgba(74, 58, 92, 0.55)');
  // the lake and the Keep's island, with the causeway running south-west
  g.fillStyle = 'rgba(60, 112, 138, 0.75)';
  g.beginPath(); g.ellipse(270, 196, 46, 30, -0.2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(44, 24, 16, 0.5)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#cdb27a'; g.beginPath(); g.ellipse(270, 195, 9, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(90, 58, 40, 0.8)'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(263, 199); g.lineTo(236, 214); g.stroke();
  // mountains and dunes, a few ink strokes each
  g.strokeStyle = 'rgba(58, 40, 30, 0.45)'; g.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const x = 330 + (i * 37) % 250, y = 30 + (i * 23) % 120;
    g.beginPath(); g.moveTo(x - 7, y + 6); g.lineTo(x, y - 6); g.lineTo(x + 7, y + 6); g.stroke();
  }
  for (let i = 0; i < 22; i++) {
    const x = 350 + (i * 41) % 230, y = 205 + (i * 29) % 120;
    g.beginPath(); g.arc(x, y + 4, 8, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  }
  // ink noise, deterministic
  let s = 0x9e3779b9;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; };
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(60, 36, 20, ${(0.03 + rnd() * 0.06).toFixed(3)})`;
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
  // burned edges
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
  vg.addColorStop(0, 'rgba(44, 24, 16, 0)'); vg.addColorStop(1, 'rgba(44, 24, 16, 0.55)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(90, 58, 40, 0.9)'; g.lineWidth = 2; g.strokeRect(6, 6, W - 12, H - 12);
}
