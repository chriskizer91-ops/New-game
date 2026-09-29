// World overlays (M3 spec §5.5), all through ui/lib/overlay.js openOverlay (keeps the focus trap).
// Exports (each returns a Promise that settles when the overlay closes):
//   openPrefight(ctx, { game, encId }) -> Promise<'fight'|'not-yet'>
//   openLockPrompt(ctx, { game, entity, lockType, status, crownwall }) -> Promise<'use'|'not-yet'>
//   openHearthMenu(ctx, { game, hfId }) -> Promise<{ act: 'rest'|'travel'|'atlas'|'party'|'leave', to? }>
//   openPauseMenu(ctx) -> Promise<'party'|'codex'|'journal'|'atlas'|'settings'|'title'|null>
//   openShop(ctx, { game, shopId }) -> Promise<game>        consumables, or gems (Idris: rules/forge.js buyGem)
//   openForge(ctx, { game, tab }) -> Promise<game>          Hilda's forge (M4 spec §5.1): Temper, Reroll,
//                                                          Salvage, Gems, Awaken, every change through
//                                                          rules/forge.js; resolves with the new game
//   previewRelic(game, held, holder) -> ItemInstance   the grey card's item for a held relic or an Echo
// Every user-visible string goes in through textContent (or esc() for the few html fragments).
// Owner: WP7 (M3); openShop and openForge: P7a (M4); M5 P7 (a soft lock's cost from its data); M6 P7 (the bog, the fog).

import { ENCOUNTERS, BRANDS } from '../../data/encounters.js';
import { HEARTHS } from '../../data/world.js';
import { LOCKS, CROWNWALL } from '../../data/locks.js';
import { OMENS } from '../../data/omens.js';
import { RELICS } from '../../data/relics.js';
import { SHOPS } from '../../data/shops.js';
import { CONSUMABLES } from '../../data/items.js';
import { MAPS } from '../../data/maps/index.js';
import { GEMS, MATERIALS, MATERIAL_IDS } from '../../data/gems.js';
import { TUNING } from '../../data/tuning.js';
import { RARITY_ORDER } from '../../data/rarity.js';
import { createRng } from '../../core/rng.js';
import { threat } from '../../rules/world.js';
import { familyOf, buildFoe } from '../../rules/foe.js';
import { relicItem, affixText, affixQuality } from '../../rules/loot.js';
import { itemProfile } from '../../rules/stats.js';
import * as partyRules from '../../rules/party.js';
import * as Forge from '../../rules/forge.js';
import { renderFoe, diceIcon, INTENT_DIE, FOE_ART, itemIcon } from '../../art/index.js';
import * as Icons from '../../art/icons.js';
import { foeLook } from '../battle/sprites.js';
import { openOverlay } from '../lib/overlay.js';
import { el, toCanvas } from '../lib/dom.js';
import { iconCanvas, portraitCanvas, rarityColor, rarityName, tierOf, SLOT_ORDER } from '../lib/art.js';
import { isReduced } from '../lib/anim.js';
import {
  typeLine, socketList, stageInfo, blockLines, gemText, gemBothText, gemIconEl, matIconEl, flamesEl, countsText, matWord, TEMPER_STEPS,
} from '../lib/items.js';
import '../forge.css';

const TIER_WORD = { rabble: 'Rabble', veteran: 'Veteran', 'relic-bearer': 'Relic-Bearer', champion: 'Champion' };
const RATING_WORD = { easy: 'Easy', fair: 'Fair', hard: 'Hard', deadly: 'Deadly' };
const RATING_FILL = { easy: 22, fair: 46, hard: 72, deadly: 96 };
const text = (tag, cls, t) => { const n = el(tag, cls); n.textContent = t ?? ''; return n; };
const shortName = (game, id) => { const h = game?.party?.roster?.[id]; if (!h) return id; return id === 'alondra' ? 'Alondra' : h.name.split(' ')[0]; };

// A styled bottom-anchored sheet in an overlay.
function sheet(ctx, { cls = '', label = 'Menu', onBack } = {}) {
  let done = null;
  const ov = openOverlay({ cls: `ov-sheet ${cls}`, label, onBack: () => { ctx.audio.sfx('back'); (onBack || (() => close(null)))(); } });
  const panel = el('section', 'w-sheet');
  ov.inner.append(panel);
  const close = v => { if (ov.closed) return; ov.close(); if (done) done(v); };
  return { ov, panel, close, wait: () => new Promise(res => { done = res; }) };
}
function foot(...buttons) { const f = el('div', 'w-sheet-foot'); f.append(...buttons); return f; }
function btn(label, cls, onClick, attrs = {}) {
  const b = el('button', { type: 'button', class: cls, ...attrs });
  b.textContent = label;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}
function focusFirst(panel) {
  const p = panel.querySelector('[data-primary]:not([disabled])') || panel.querySelector('button:not([disabled])');
  if (p) setTimeout(() => p.focus({ preventScroll: true }), 0);
}

// ---- the grey card's item -------------------------------------------------------------------------------

export function previewRelic(game, held, holder) {
  if (held.item) return held.item;
  const id = held.relic;
  const owned = (game.inventory || []).find(i => i.base === id);
  if (owned) return owned;
  return relicItem(id, createRng(`preview-${id}`), { from: holder, where: held.where || '', day: game.progress?.flags?.day || 1 });
}

function heldList(game, T) {
  const out = [];
  const grudges = game.progress?.flags?.grudges || {};
  for (const s of T.spawns) {
    const holder = (s.grudge && grudges[s.grudge]?.name) || s.name || familyOf(s).name;
    for (const h of s.held || []) {
      // a Champion's breakable armour (the Glass Carapace, the Cinder Crown) is worn, not held
      const slot = h.relic ? RELICS[h.relic]?.slot : h.item?.slot;
      if (h.relic || h.item) out.push({ held: h, holder, lend: !!h.lend, worn: !!slot && !['weapon', 'offhand'].includes(slot) });
    }
    if (s.wears) out.push({ held: { relic: s.wears }, holder, worn: true });
  }
  return out;
}

// ---- pre-fight card -------------------------------------------------------------------------------------

export function openPrefight(ctx, { game, encId } = {}) {
  const enc = ENCOUNTERS[encId];
  let T;
  try { T = threat(game, encId); } catch { T = null; }
  if (!enc || !T) return Promise.resolve('not-yet');
  const S = sheet(ctx, { cls: 'ov-prefight', label: `${enc.name}: before the fight`, onBack: () => S.close('not-yet') });
  const P = S.panel;
  P.classList.add('prefight');
  P.dataset.rating = T.rating;
  const grudges = game.progress?.flags?.grudges || {};
  const nameOf = s => (s.grudge && grudges[s.grudge]?.name) || s.name || familyOf(s).name;
  const lead = T.spawns.slice().sort((a, b) => ['rabble', 'veteran', 'relic-bearer', 'champion'].indexOf(familyOf(b).tier) - ['rabble', 'veteran', 'relic-bearer', 'champion'].indexOf(familyOf(a).tier))[0];

  P.append(text('p', 'kick', `${enc.place || MAPS[game.progress?.pos?.map]?.name || ''} · ${TIER_WORD[T.tier] || 'Foes'}`));
  P.append(text('h2', 'title-display pf-title', enc.name));
  const top = el('div', 'pf-top');
  // the lead sprite, the battle art, idle
  const art = el('div', 'pf-art');
  if (lead) {
    try {
      const u = buildFoe(lead, { id: 'pf' });
      const img = renderFoe(FOE_ART[u.art] ? u.art : 'cutpurse', { ...foeLook(u), pose: 'idle', t: 1.3, reduced: true });
      const cv = toCanvas(img, null, img.width > 64 ? 1 : 2);
      cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', nameOf(lead));
      art.append(cv);
    } catch { /* art is optional here */ }
  }
  const meter = el('div', 'pf-threat');
  meter.append(text('b', 'pf-word', RATING_WORD[T.rating] || T.rating));
  const bar = el('span', { class: 'pf-bar', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(RATING_FILL[T.rating] || 50), 'aria-label': `Threat: ${RATING_WORD[T.rating]}` });
  bar.append(el('i'));
  bar.style.setProperty('--p', (RATING_FILL[T.rating] || 50) + '%');
  meter.append(bar, text('small', 'pf-lv', `Lv ${T.level} vs your ${T.party}`));
  top.append(art, meter);
  P.append(top);

  const list = el('ul', 'pf-foes');
  for (const s of T.spawns) {
    const F = familyOf(s);
    const li = el('li', `tier-${F.tier}`);
    const die = INTENT_DIE[F.tier] || INTENT_DIE.rabble;
    try { const dc = toCanvas(diceIcon(die.sides, { size: 20, mat: die.mat }), null, 1); dc.setAttribute('aria-hidden', 'true'); li.append(dc); } catch { /* icon optional */ }
    const info = el('span', 'pf-foe');
    info.append(text('b', '', nameOf(s)), text('small', '', ` ${TIER_WORD[F.tier] || F.tier} · Lv ${s.level}`));
    if (s.title && !grudges[s.grudge]?.name) info.append(text('em', 'pf-grudge', ` ${s.title}`));
    const om = el('span', 'pf-omens');
    for (const o of s.omens || []) {
      const chip = text('i', 'omen', OMENS[o]?.name || o);
      chip.style.setProperty('--c', OMENS[o]?.color || '#999');
      chip.title = OMENS[o]?.text || '';
      om.append(chip);
    }
    if (om.childElementCount) info.append(om);
    li.append(info);
    list.append(li);
  }
  P.append(list);
  if (T.grudge) {
    // a Grudge is born from a wipe (wins) or from running (flees); say which
    const gr = T.spawns.map(s => s.grudge && grudges[s.grudge]).find(Boolean) || { wins: 1, flees: 0 };
    const times = n => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
    const why = gr.wins && gr.flees ? `They beat you ${times(gr.wins)}, and you ran from them ${times(gr.flees)}.`
      : gr.flees ? `You ran from them ${times(gr.flees)}.` : `They beat you ${times(gr.wins || 1)}.`;
    P.append(text('p', 'pf-grudge-note', `Grudge: ${T.grudge}. ${why} Settle it and every piece they drop comes one rarity higher.`));
  }

  const relics = heldList(game, T);
  if (relics.length) {
    const row = el('div', 'pf-relics');
    for (const r of relics) {
      const item = previewRelic(game, r.held, r.holder);
      const b = el('button', { type: 'button', class: 'pf-relic' });
      b.setAttribute('aria-label', `See the card: ${item.name}, ${r.worn ? 'worn' : 'held'} by ${r.holder}`);
      try { b.append(iconCanvas(item, 2)); } catch { /* icon optional */ }
      const t = el('span', 'pf-relic-t');
      t.append(text('b', '', r.held.item ? `Echo · ${item.name}` : item.name), text('small', '', `${r.worn ? 'Worn' : r.lend ? 'Lent to' : 'Held by'} ${r.holder}`));
      b.append(t);
      b.addEventListener('click', () => { ctx.audio.sfx('page'); ctx.services.cardPreview(item, { heldBy: r.holder }); });
      row.append(b);
    }
    P.append(text('p', 'label', 'Glinting on them'), row);
  }
  const brand = enc.brand && BRANDS[enc.brand];
  if (brand) {
    const held = (game.progress?.brands || []).includes(brand.id);
    P.append(text('p', 'pf-brand', held ? `${brand.name} is already yours: this is a rematch.` : `Win, and ${brand.name} is yours: the Waking rises.`));
  }
  if (enc.duel) P.append(text('p', 'pf-duel', 'Losing is a yield.'));
  if (enc.text) P.append(text('p', 'pf-text', enc.text));
  const fight = btn(T.tier === 'champion' ? 'Face the Champion' : 'Fight', 'btn primary big pf-fight', () => { ctx.audio.sfx('confirm'); S.close('fight'); }, { 'data-primary': '' });
  const notYet = btn('Not yet', 'btn big pf-not-yet', () => { ctx.audio.sfx('back'); S.close('not-yet'); });
  P.append(foot(notYet, fight));
  focusFirst(P);
  return S.wait();
}

// ---- lock prompt ------------------------------------------------------------------------------------------

// Small pixel icons for the lock prompt (art/icons.js lockIcon / keyIcon, when they exist), at 2x.
function icon(make) {
  try { const img = make(); if (!img) return null; const c = toCanvas(img, null, 2); c.setAttribute('aria-hidden', 'true'); c.classList.add('lock-ico'); return c; } catch { return null; }
}
const lockGlyph = id => (typeof Icons.lockIcon === 'function' ? icon(() => Icons.lockIcon(id, { size: 12 })) : null);
function keyGlyph(game, k) {
  if (k.kind === 'power') {
    const r = relicForPower(game, k.id);
    if (r) return icon(() => itemIcon((game.inventory || []).find(i => i.base === r)));
    return typeof Icons.keyIcon === 'function' ? icon(() => Icons.keyIcon('power', { size: 12, dim: true })) : null;
  }
  return typeof Icons.keyIcon === 'function' ? icon(() => Icons.keyIcon(k.id, { size: 12, dim: !k.have })) : null;
}

// The relic you own that grants a map power (the first one, as rules/world.js keys() picks it).
function relicForPower(game, powerId) {
  for (const it of game.inventory || []) if (!it.shattered && RELICS[it.base]?.mapPower?.id === powerId) return it.base;
  return null;
}

function keyOwner(game, relicId) {
  if (!relicId) return null;
  const it = (game.inventory || []).find(i => i.base === relicId && !i.shattered);
  if (!it) return null;
  const w = partyRules.wearerOf(game, it.uid);
  return w ? shortName(game, w.heroId) : 'in the bag';
}

export function openLockPrompt(ctx, { game, entity, lockType, status, crownwall = false } = {}) {
  if (crownwall) {
    const S = sheet(ctx, { cls: 'ov-lock ov-crownwall', label: 'Crownwall', onBack: () => S.close('not-yet') });
    const P = S.panel;
    P.classList.add('lock', 'crownwall');
    const h = el('div', 'lock-head');
    const g = lockGlyph('crownwall');
    if (g) h.append(g);
    h.append(text('h2', 'title-display', CROWNWALL.name));
    P.append(text('p', 'kick', 'A story seal'), h, text('p', 'lock-text', CROWNWALL.text));
    let cut = false;
    try { cut = !!(status && status.open); } catch { cut = false; }
    if (cut) P.append(text('p', 'lock-bounce', CROWNWALL.cutText));
    P.append(text('p', 'lock-journal', CROWNWALL.journal));
    P.append(foot(btn('Leave it', 'btn primary big', () => { ctx.audio.sfx('back'); S.close('not-yet'); }, { 'data-primary': '' })));
    focusFirst(P);
    return S.wait();
  }
  const L = LOCKS[lockType];
  if (!L) return Promise.resolve('not-yet');
  const st = status || { open: false, keys: [] };
  const S = sheet(ctx, { cls: 'ov-lock', label: L.name, onBack: () => S.close('not-yet') });
  const P = S.panel;
  P.classList.add('lock');
  const head = el('div', 'lock-head');
  const lg = lockGlyph(lockType);
  if (lg) head.append(lg);
  head.append(text('h2', 'title-display', L.name));
  P.append(text('p', 'kick', L.soft ? 'Hazard · two keys' : 'Two keys open it'), head, text('p', 'lock-text', L.text || ''));
  const keys = el('ul', 'lock-keys');
  let useWith = null;
  for (const k of st.keys || []) {
    const li = el('li', k.have ? 'have' : 'miss');
    const mark = text('b', 'lock-mark', k.have ? '✓' : '✗');
    mark.setAttribute('aria-label', k.have ? 'You have this key' : 'Missing');
    const who = k.kind === 'power' ? (k.have ? keyOwner(game, relicForPower(game, k.id)) : 'not found yet') : k.detail;
    const kg = keyGlyph(game, k);
    li.append(mark);
    if (kg) li.append(kg);
    li.append(text('span', 'lock-label', k.label), text('small', 'lock-who', who ? `(${who})` : ''));
    if (k.kind === 'power' && k.detail) li.title = k.detail;
    keys.append(li);
    if (k.have && !useWith) useWith = k.label;
  }
  P.append(keys);
  // a soft lock's cost comes from its data (ichor burns 4% a step; M5's snowdrift bites for 3%; M6's bog drags
  // for 3%, and its fog closes in to three steps as the dark does to two)
  const hurt = { ichor: 'it burns', drift: 'the cold bites', bog: 'the mud drags at you' }[lockType] || 'it hurts';
  const steps = n => ['no', 'one', 'two', 'three', 'four', 'five'][n] || n;
  if (L.soft) P.append(text('p', 'lock-soft', L.soft.vision ? `Without a key you can still walk in, seeing ${steps(L.soft.vision)} steps ahead.` : `Without a key ${hurt}: ${Math.round((L.soft.hpPct || 0.04) * 100)}% of everyone's max HP per step, never below 1.`));
  const notYet = btn('Not yet', 'btn big', () => { ctx.audio.sfx('back'); S.close('not-yet'); });
  if (st.open && !L.soft) {
    const use = btn(`Use (${useWith || 'key'})`, 'btn primary big lock-use', () => { S.close('use'); }, { 'data-primary': '' });
    P.append(foot(notYet, use));
  } else {
    if (!st.open) P.append(text('p', 'lock-none', 'You have neither key yet. Grow into one, or find the relic that opens it.'));
    notYet.setAttribute('data-primary', '');
    notYet.classList.add('primary');
    P.append(foot(notYet));
  }
  focusFirst(P);
  return S.wait();
}

// ---- the Hearthfire -----------------------------------------------------------------------------------

export function openHearthMenu(ctx, { game, hfId } = {}) {
  const H = HEARTHS[hfId], E = ENCOUNTERS[hfId];
  const S = sheet(ctx, { cls: 'ov-hearth', label: H?.name || 'Hearthfire', onBack: () => S.close({ act: 'leave' }) });
  const P = S.panel;
  P.classList.add('hearth');
  P.append(text('p', 'kick', 'Hearthfire'), text('h2', 'title-display', H?.name || E?.name || 'Hearthfire'));
  if (E?.text) P.append(text('p', 'hearth-text', E.text));
  const acts = el('div', 'hearth-acts');
  const rest = btn('Rest', 'btn primary big', () => { S.close({ act: 'rest' }); }, { 'data-primary': '' });
  rest.append(text('small', '', 'Everyone whole, a new day, saved here'));
  const kindled = Object.keys(HEARTHS).filter(id => id !== hfId && game.progress?.flags?.kindled?.[id]);
  const travel = btn('Travel', 'btn big', () => showTravel());
  travel.append(text('small', '', kindled.length ? `${kindled.length} kindled ${kindled.length === 1 ? 'fire' : 'fires'}` : 'No other fire is lit yet'));
  travel.disabled = !kindled.length;
  const party = btn('Party', 'btn big', () => S.close({ act: 'party' }));
  const leave = btn('Leave', 'btn big ghost', () => { ctx.audio.sfx('back'); S.close({ act: 'leave' }); });
  acts.append(rest, travel, party, leave);
  P.append(acts);
  const list = el('div', 'hearth-travel');
  list.hidden = true;
  P.append(list);
  function showTravel() {
    ctx.audio.sfx('page');
    list.hidden = false;
    list.replaceChildren(text('p', 'label', 'Travel to a kindled fire'));
    for (const id of kindled) {
      const h = HEARTHS[id];
      const b = btn(h.name, 'btn hearth-to', () => { ctx.audio.sfx('confirm'); S.close({ act: 'travel', to: id }); });
      b.dataset.hearth = id;
      b.append(text('small', '', MAPS[h.map]?.name || h.map));
      list.append(b);
    }
    list.append(btn('Open the Atlas', 'btn ghost', () => S.close({ act: 'atlas' })));
    const first = list.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }
  focusFirst(P);
  return S.wait();
}

// ---- the pause menu -----------------------------------------------------------------------------------

export function openPauseMenu(ctx) {
  const S = sheet(ctx, { cls: 'ov-pause', label: 'Menu', onBack: () => S.close(null) });
  const P = S.panel;
  P.classList.add('pause');
  P.append(text('p', 'kick', 'Paused'), text('h2', 'title-display', 'Menu'));
  const grid = el('div', 'pause-grid');
  const items = [['party', 'Party', 'Gear and skills'], ['codex', 'Codex', 'Every relic and its holder'], ['journal', 'Journal', 'Quests, bounties, the Ladder, keys'],
    ['atlas', 'Atlas', 'Where you are'], ['settings', 'Settings', 'Sound, controls, saves'], ['title', 'Title', 'Back to the title screen']];
  items.forEach(([id, label, sub], i) => {
    const b = btn(label, 'btn big pause-' + id, () => { ctx.audio.sfx('confirm'); S.close(id); }, i === 0 ? { 'data-primary': '' } : {});
    b.dataset.go = id;
    b.append(text('small', '', sub));
    grid.append(b);
  });
  P.append(grid, foot(btn('Back to the map', 'btn ghost big', () => { ctx.audio.sfx('back'); S.close(null); })));
  focusFirst(P);
  return S.wait();
}


// ---- the purse and the pouch (the shops, Hilda's forge) -----------------------------------------------------

const gemShort = id => (GEMS[id]?.name || id).split(' ').pop();
function purseChips(g, { mats = true, gold = true } = {}) {
  const row = el('div', { class: 'forge-purse', role: 'group', 'aria-label': 'Your purse and pouch' });
  const chip = (icon, n, label, key, title = label) => {
    const c = el('span', { class: `fp-chip${n ? '' : ' none'}`, 'data-k': key, title });
    c.append(icon, text('b', 'fp-n', String(n)), text('small', 'fp-l', label));
    return c;
  };
  if (gold) row.append(chip(el('i', { class: 'coin', 'aria-hidden': 'true' }), g.gold || 0, 'gold', 'gold'));
  if (mats) for (const k of MATERIAL_IDS) { const n = g.materials?.[k] || 0; row.append(chip(matIconEl(k, 16), n, matWord(k, n), k, MATERIALS[k].text)); }
  const held = Object.entries(g.gems || {}).filter(([id, n]) => GEMS[id] && n > 0);
  for (const [id, n] of held) row.append(chip(gemIconEl(id, 16), n, gemShort(id), `gem:${id}`, `${GEMS[id].name}: ${gemBothText(id)}`));
  if (!held.length) row.append(text('span', 'fp-chip none fp-nogems', 'No gems'));
  return row;
}

// ---- a shop ---------------------------------------------------------------------------------------------

// Consumables at their price (rules/party.js buy), and gems at Idris's (rules/forge.js buyGem).
export function openShop(ctx, { game, shopId } = {}) {
  const shop = SHOPS[shopId];
  if (!shop) return Promise.resolve(game);
  let g = game;
  const S = sheet(ctx, { cls: 'ov-shop', label: shop.name, onBack: () => S.close(g) });
  const P = S.panel;
  P.classList.add('shop');
  const gems = (shop.gems || []).filter(id => GEMS[id]?.price);
  const purse = text('p', 'shop-gold', '');
  const pouch = el('div', 'shop-pouch');
  P.append(text('p', 'kick', gems.length && !(shop.items || []).length ? 'Gems' : 'Shop'), text('h2', 'title-display', shop.name), purse);
  if (gems.length) P.append(pouch, text('p', 'shop-line', 'Hilda sets them in a socket for you. A gem does one thing in a weapon and another in anything else.'));
  const list = el('ul', 'shop-list');
  const rows = [];
  for (const id of shop.items || []) {
    const C = CONSUMABLES[id];
    if (!C) continue;
    const li = el('li', 'shop-row');
    const info = el('span', 'shop-info');
    const have = text('small', 'shop-have', '');
    info.append(text('b', '', C.name), text('small', '', C.text || ''), have);
    const buy = btn(`Buy · ${C.price} g`, 'btn shop-buy', () => {
      const r = partyRules.buy ? partyRules.buy(g, id, 1) : { ok: false, reason: 'The shop is shut' };
      if (r.ok) { g = r.game; ctx.audio.sfx('coin'); } else { ctx.audio.sfx('error'); ctx.toast(r.reason || 'Not now'); }
      update();
    });
    buy.dataset.item = id;
    li.append(info, buy);
    list.append(li);
    rows.push({ id, price: C.price, have, buy, count: () => g.bag?.[id] || 0, word: n => `You carry ${n}` });
  }
  for (const id of gems) {
    const G = GEMS[id];
    const li = el('li', 'shop-row gem-row');
    li.dataset.gem = id;
    const ic = el('span', 'shop-gem');
    ic.append(gemIconEl(id, 28));
    const info = el('span', 'shop-info');
    const have = text('small', 'shop-have', '');
    info.append(text('b', '', G.name), text('small', '', gemBothText(id)), have);
    const buy = btn(`Buy · ${G.price} g`, 'btn shop-buy', () => {
      const r = Forge.buyGem(g, id, 1);
      if (r.ok) { g = r.game; ctx.audio.sfx('coin'); ctx.toast(`${G.name} goes in your pouch.`); } else { ctx.audio.sfx('error'); ctx.toast(r.reason || 'Not now'); }
      update();
    }, { 'aria-label': `Buy a ${G.name} for ${G.price} gold` });
    buy.dataset.gem = id;
    li.append(ic, info, buy);
    list.append(li);
    rows.push({ id, price: G.price, have, buy, count: () => g.gems?.[id] || 0, word: n => `In your pouch: ${n}` });
  }
  if (!rows.length) list.append(text('li', 'shop-row shop-empty', 'Nothing for sale today.'));
  P.append(list, foot(btn('Done', 'btn primary big', () => { ctx.audio.sfx('confirm'); S.close(g); }, { 'data-primary': '' })));
  function update() {
    purse.textContent = `Purse: ${g.gold} gold`;
    if (gems.length) pouch.replaceChildren(purseChips(g, { mats: false, gold: false }));
    for (const r of rows) { r.have.textContent = r.word(r.count()); r.buy.disabled = g.gold < r.price; }
  }
  update();
  focusFirst(P);
  return S.wait();
}

// ---- Hilda's forge (M4 spec §5.1) -----------------------------------------------------------------------

const FORGE_TABS = Object.freeze([
  { id: 'temper', name: 'Temper', line: 'Heat, hammer, patience. Mostly gold. Past +3 it wants silver, and past +6 embers that never cool.' },
  { id: 'reroll', name: 'Reroll', line: 'Show me the trait you hate and I\'ll beat a new one into it. Relics keep what they were born with.' },
  { id: 'salvage', name: 'Salvage', line: 'Whatever nobody wears goes in the crucible. Scrap, silver or embers come out, and any gems in it go back in your pouch.' },
  { id: 'gems', name: 'Gems', line: 'Pick a socket, then a stone from your pouch. Whatever was in it goes back in the pouch.' },
  { id: 'awaken', name: 'Awaken', line: 'Three deeds wake a relic. Then my rite, and the one who carries it decides what it wakes into.' },
]);
const EMPTY = {
  temper: 'Nothing to temper.',
  reroll: 'Nothing to reroll. Wrought, tempered, runed and storied pieces with traits can be rerolled; relics keep theirs.',
  salvage: 'Nothing in the bag to melt down. Relics never go in the crucible, and neither does anything someone is wearing.',
  gems: 'Nothing with a socket yet. Runed and storied pieces have one, and so do most relics.',
  awaken: 'No relics yet. Pry one loose from its holder.',
};
const FIRST_SILVER = TUNING.temper.silver.findIndex(n => n > 0) + 1;
const FIRST_EMBERS = TUNING.temper.embers.findIndex(n => n > 0) + 1;
const stars = n => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
const byRank = (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || (b.ilvl || 0) - (a.ilvl || 0);

// The card numbers a temper step changes: to hit and damage on weapons, Guard on armour and shields,
// max HP on everything else (rules/stats.js itemProfile, where temper adds +1 enchant per step).
export function temperNumbers(item) {
  const P = itemProfile(item);
  if (!P) return [];
  const s = P.stats;
  if (P.slot === 'weapon') return [['To hit', `+${s.hit}`], ['Damage bonus', `+${s.dmg}`]];
  if (P.slot === 'body' || item.kind === 'shield') return [['Guard', `+${s.guard}`]];
  return [['Max HP', `+${s.hp}`]];
}

export function openForge(ctx, { game, tab = 'temper' } = {}) {
  let g = game;
  const S = sheet(ctx, { cls: 'ov-forge', label: 'Hilda\'s forge', onBack: () => S.close(g) });
  const P = S.panel;
  P.classList.add('forge');
  // sel: the piece; trait/sock/branch: what is picked on it; roll: the last reroll (it slides in);
  // confirm: the piece Salvage is asking about; gone: what the crucible just took; lit: a new flame
  const st = { tab: FORGE_TABS.some(t => t.id === tab) ? tab : 'temper', sel: null, trait: null, sock: null, branch: null, roll: null, confirm: null, gone: null, lit: null };
  const kick = text('p', 'kick', '');
  P.append(kick, text('h2', 'title-display', 'Hilda\'s forge'));
  const tabs = el('div', { class: 'forge-tabs', role: 'tablist', 'aria-label': 'What Hilda can do' });
  const tabBtns = {};
  for (const T of FORGE_TABS) {
    const b = el('button', { type: 'button', class: 'forge-tab', role: 'tab', id: `forge-tab-${T.id}`, 'aria-controls': 'forge-panel', 'data-tab': T.id, 'data-f': `tab:${T.id}` });
    b.append(text('span', 'ft-name', T.name), el('i', { class: 'ft-dot', 'aria-hidden': 'true' }));
    b.addEventListener('click', () => { if (st.tab === T.id) return; ctx.audio.sfx('page'); setTab(T.id); });
    tabBtns[T.id] = b;
    tabs.append(b);
  }
  const purse = el('div', 'forge-purse-host');
  const line = text('p', 'forge-line', '');
  const list = el('ul', { class: 'forge-list', 'aria-label': 'Pieces: what the party wears first, then the bag' });
  const detail = el('div', 'forge-detail');
  const body = el('div', { class: 'forge-body', id: 'forge-panel', role: 'tabpanel' });
  body.append(el('div', 'forge-pieces', [list]), detail);
  P.append(tabs, purse, line, body, foot(btn('Done', 'btn ghost big forge-done', () => { ctx.audio.sfx('confirm'); S.close(g); }, { 'data-primary': '', 'data-f': 'done' })));

  const live = uid => (uid && g.inventory.find(i => i.uid === uid)) || null;
  const wearer = uid => partyRules.wearerOf(g, uid)?.heroId || null;
  // what the party wears (hero by hero, slot by slot), then the bag, rarest first
  function pieces() {
    const out = [], seen = new Set();
    for (const id of g.party.active) {
      const h = g.party.roster[id];
      for (const slot of SLOT_ORDER) {
        const it = live(h?.gear?.[slot]);
        if (it && !seen.has(it.uid)) { seen.add(it.uid); out.push({ it, who: id }); }
      }
    }
    const rest = g.inventory.filter(i => i.slot && !seen.has(i.uid));
    const bench = rest.filter(i => wearer(i.uid)).map(it => ({ it, who: wearer(it.uid) }));
    const bag = rest.filter(i => !wearer(i.uid)).sort(byRank).map(it => ({ it, who: null }));
    return [...out, ...bench, ...bag];
  }
  const ELIGIBLE = {
    temper: it => !it.shattered,
    reroll: it => !!Forge.rerollCost(it),
    salvage: it => !!Forge.salvageYield(it) && !wearer(it.uid),
    gems: it => !it.shattered && Forge.socketsOf(it) > 0,
    awaken: it => !it.shattered && !!Forge.stageOf(it),
  };
  const ready = it => !!Forge.stageOf(it) && !it.shattered && Forge.awakenOptions(g, it.uid).ready;

  function setTab(id) {
    Object.assign(st, { tab: id, trait: null, sock: null, branch: null, roll: null, confirm: null, gone: null });
    render();
    tabBtns[id].focus({ preventScroll: true });
    // on a phone the tabs scroll sideways: keep the chosen one in view
    const r = tabBtns[id].getBoundingClientRect(), row = tabs.getBoundingClientRect();
    if (r.left < row.left || r.right > row.right) tabs.scrollBy({ left: r.left < row.left ? r.left - row.left - 16 : r.right - row.right + 16, behavior: isReduced() ? 'auto' : 'smooth' });
  }
  function select(uid) {
    Object.assign(st, { sel: uid, trait: null, sock: null, branch: null, roll: null, confirm: null, gone: null });
    render();
    // on a phone the detail sits under the list: bring it up
    const r = detail.getBoundingClientRect();
    if (innerWidth < 860 && r.top > innerHeight * 0.55) detail.scrollIntoView({ block: 'start', behavior: isReduced() ? 'auto' : 'smooth' });
  }

  function render() {
    const f = document.activeElement && P.contains(document.activeElement) ? document.activeElement.dataset.f : null;
    const T = FORGE_TABS.find(t => t.id === st.tab);
    kick.textContent = `${T.name} · Hilda Ironvein`;
    for (const t of FORGE_TABS) tabBtns[t.id].setAttribute('aria-selected', String(t.id === st.tab));
    const anyReady = g.inventory.some(ready);
    tabBtns.awaken.classList.toggle('has-dot', anyReady);
    tabBtns.awaken.setAttribute('aria-label', anyReady ? 'Awaken: a relic is ready' : 'Awaken');
    purse.replaceChildren(purseChips(g));
    line.textContent = T.line;
    const items = pieces().filter(p => ELIGIBLE[st.tab](p.it));
    if (!items.some(p => p.it.uid === st.sel)) {
      st.sel = (st.tab === 'awaken' && items.find(p => ready(p.it))?.it.uid) || items[0]?.it.uid || null;
      Object.assign(st, { trait: null, sock: null, branch: null, confirm: null });
    }
    list.replaceChildren();
    if (!items.length) list.append(text('li', 'forge-none', EMPTY[st.tab]));
    for (const p of items) list.append(row(p));
    if (st.tab === 'salvage' && g.inventory.some(i => Forge.salvageYield(i) && wearer(i.uid))) list.append(text('li', 'forge-none small', 'What the party wears is not listed here: take it off first.'));
    paintDetail();
    // keep the keyboard where it was: the same control if it is still there, else the piece itself
    if (f) { const n = P.querySelector(`[data-f="${f}"]:not([disabled])`) || P.querySelector(`[data-f="item:${st.sel}"]`) || tabBtns[st.tab]; n.focus({ preventScroll: true }); }
  }

  // ---- the list ----
  function row({ it, who }) {
    const li = el('li');
    const on = st.sel === it.uid;
    const b = el('button', { type: 'button', class: `forge-item${on ? ' on' : ''}`, 'aria-pressed': String(on), 'data-uid': it.uid, 'data-f': `item:${it.uid}` });
    try { b.append(iconCanvas(it, 2)); } catch { b.append(el('span', 'fi-noart')); }
    const t = el('span', 'forge-item-t');
    const nm = text('b', '', `${it.unidentified ? 'Unidentified' : it.name}${it.temper ? ` +${it.temper}` : ''}`);
    nm.style.color = rarityColor(it.rarity);
    t.append(nm, text('small', '', `${rarityName(it.rarity)} · ${who ? `on ${shortName(g, who)}` : 'in the bag'}`));
    b.append(t, badge(it));
    b.addEventListener('click', () => { ctx.audio.sfx('select'); select(it.uid); });
    li.append(b);
    return li;
  }
  function badge(it) {
    const b = el('span', 'fi-badge');
    if (st.tab === 'temper') b.textContent = (it.temper || 0) >= TEMPER_STEPS ? 'Max' : `+${it.temper || 0}`;
    else if (st.tab === 'reroll') b.textContent = `${it.affixes.length} ${it.affixes.length === 1 ? 'trait' : 'traits'}`;
    else if (st.tab === 'salvage') {
      const y = Forge.salvageYield(it);
      b.classList.add('fi-yield');
      b.setAttribute('aria-label', `Gives back ${[countsText(y?.materials), countsText(y?.gems, { gems: true })].filter(Boolean).join(', ')}`);
      for (const [k, n] of Object.entries(y?.materials || {})) if (n > 0) { const c = el('span'); c.append(matIconEl(k, 14), text('b', '', `${n}`)); b.append(c); }
      for (const [id, n] of Object.entries(y?.gems || {})) if (n > 0) { const c = el('span'); c.append(gemIconEl(id, 14), text('b', '', `${n}`)); b.append(c); }
    }
    else if (st.tab === 'gems') {
      b.classList.add('fi-socks');
      for (const gid of socketList(it)) { const s = el('i', gid ? 'set' : ''); if (gid) s.style.setProperty('--gc', GEMS[gid].color); b.append(s); }
    } else if (st.tab === 'awaken') {
      const info = stageInfo(it);
      b.classList.add('fi-pips');
      for (const d of info.deeds) b.append(el('i', d.done ? 'on' : ''));
      if (info.branch) b.append(text('small', 'awake', 'Awake'));
      else if (ready(it)) b.append(text('small', 'ready', 'Ready'));
    }
    return b;
  }

  // ---- the selected piece: a card preview, its before and after, the cost ----
  function fcard(it, ...more) {
    const card = el('div', 'forge-card');
    card.dataset.r = it.rarity;
    const art = el('div', 'fc-art');
    try { const pc = portraitCanvas(it, { size: 64, develop: it.unidentified ? 0 : undefined }); pc.canvas.setAttribute('aria-hidden', 'true'); art.append(pc.canvas); } catch { /* the art is optional here */ }
    const info = el('div', 'fc-info');
    const nm = text('b', 'forge-card-name', `${it.unidentified ? 'Unidentified' : it.name}${it.temper ? ` +${it.temper}` : ''}`);
    nm.style.color = rarityColor(it.rarity);
    const who = wearer(it.uid);
    info.append(nm, text('small', 'fc-type', typeLine(it)), text('small', 'fc-who', who ? `Borne by ${shortName(g, who)}` : 'In the bag'));
    info.append(btn('See card', 'btn ghost fc-see', async () => { ctx.audio.sfx('page'); await ctx.services.cardInspect(live(it.uid) || it, { game: g }); }, { 'data-f': 'see', 'aria-label': `See the card: ${it.unidentified ? 'the unidentified piece' : it.name}` }));
    card.append(art, info);
    const box = el('div', 'fc-more');
    for (const m of more) if (m) box.append(m);
    if (box.childElementCount) card.append(box);
    return card;
  }
  // "Costs 120 gold + 1 silver", each part with what you have of it
  function costBlock(cost, label = 'Costs') {
    const p = el('div', 'forge-cost');
    p.append(text('span', 'fcost-k', label));
    const parts = [['gold', cost?.gold || 0, g.gold || 0], ...Object.entries(cost?.materials || {}).map(([k, n]) => [k, n, g.materials?.[k] || 0])].filter(([, n]) => n > 0);
    if (!parts.length) p.append(text('span', 'fcost-part', 'Free'));
    for (const [k, n, have] of parts) {
      const c = el('span', `fcost-part${have < n ? ' short' : ''}`);
      c.append(k === 'gold' ? el('i', { class: 'coin', 'aria-hidden': 'true' }) : matIconEl(k, 16), text('b', '', `${n} ${k === 'gold' ? 'gold' : matWord(k, n)}`), text('small', '', `you have ${have}`));
      p.append(c);
    }
    return p;
  }
  function go(label, cls, onClick, reason) {
    const b = btn(label, `btn primary big forge-go ${cls || ''}`.trim(), onClick, { 'data-f': 'go' });
    b.disabled = !!reason;
    const wrap = el('div', 'forge-act');
    wrap.append(b);
    if (reason) wrap.append(text('p', 'forge-why', reason));
    return wrap;
  }
  const fail = res => { ctx.audio.sfx('error'); ctx.toast(res.reason || 'Not now'); render(); };

  function paintDetail() {
    detail.replaceChildren();
    if (st.gone) {
      const n = el('p', 'forge-gone');
      n.append(text('b', '', st.gone.name), text('span', '', ` went in the crucible: ${[countsText(st.gone.y.materials), countsText(st.gone.y.gems, { gems: true })].filter(Boolean).join(', ') || 'nothing came back'}.`));
      detail.append(n);
    }
    const it = live(st.sel);
    if (!it) { detail.append(text('p', 'forge-hint', EMPTY[st.tab])); return; }
    ({ temper: temperDetail, reroll: rerollDetail, salvage: salvageDetail, gems: gemsDetail, awaken: awakenDetail })[st.tab](it);
  }

  // Temper: the numbers before and after, the flames (+1 to +10), what the next step needs
  function temperDetail(it) {
    const t = it.temper || 0;
    const cost = Forge.temperCost(it);
    const before = temperNumbers(it), after = cost ? temperNumbers({ ...it, temper: t + 1 }) : null;
    const tbl = el('dl', 'forge-nums');
    before.forEach(([k, v], i) => {
      tbl.append(text('dt', '', k));
      const dd = el('dd');
      dd.append(text('span', 'num', v));
      if (after) dd.append(text('span', 'arrow', ' → '), text('span', 'num next', after[i][1]));
      tbl.append(dd);
    });
    const flames = el('div', 'forge-flames');
    const row = flamesEl(t, { next: !!cost, box: 20 });
    if (st.lit === it.uid && t > 0) { row.children[t - 1]?.classList.add('lit-now'); st.lit = null; }
    flames.append(row, text('span', 'ff-t', cost ? `+${t} → +${t + 1} of +${TEMPER_STEPS}` : `+${t} of +${TEMPER_STEPS}`));
    detail.append(fcard(it, flames, tbl));
    if (!cost) { detail.append(text('p', 'forge-max', `Tempered as far as it goes (+${t}).`)); return; }
    const mats = Object.entries(cost.materials || {}).filter(([, n]) => n > 0);
    const need = mats.length ? `The step to +${t + 1} needs ${mats.map(([k, n]) => `${n} ${matWord(k, n)}`).join(' and ')} as well as gold.`
      : `The step to +${t + 1} takes only gold.${t + 1 < FIRST_SILVER ? ` Silver from +${FIRST_SILVER}, embers from +${FIRST_EMBERS}.` : ''}`;
    detail.append(text('p', 'forge-need', need), costBlock(cost));
    const dry = Forge.temper(g, it.uid); // a dry run for the refusal: the rules are pure, nothing is kept
    detail.append(go(`Temper to +${t + 1}`, '', () => {
      const res = Forge.temper(g, it.uid);
      if (!res.ok) return fail(res);
      g = res.game;
      st.lit = it.uid;
      ctx.audio.sfx('equip', { tier: 4 });
      ctx.toast(`${it.name} is +${t + 1} now.`);
      render();
    }, dry.ok ? null : dry.reason));
  }

  // Reroll: tap one trait row; the new trait slides in with its quality stars
  function rerollDetail(it) {
    const cost = Forge.rerollCost(it);
    const rows = el('div', { class: 'rr-traits', role: 'group', 'aria-label': 'Pick the trait to reroll' });
    it.affixes.forEach((a, i) => {
      const on = st.trait === i;
      const rolled = st.roll && st.roll.uid === it.uid && st.roll.i === i;
      const q = it.unidentified ? 0 : affixQuality(a, it.rarity, it.ilvl || 1);
      const b = el('button', { type: 'button', class: `rr-trait${on ? ' on' : ''}${rolled ? ' rolled' : ''}`, 'aria-pressed': String(on), 'data-i': String(i), 'data-f': `trait:${i}` });
      const tx = text('span', 'rr-text', it.unidentified ? '???' : affixText(a));
      const qs = text('i', 'rr-q', it.unidentified ? '' : stars(q));
      if (!it.unidentified) qs.setAttribute('aria-label', `Quality ${q} of 5`);
      b.append(tx, qs);
      if (rolled) b.append(text('s', 'rr-was', `was: ${affixText(st.roll.before)} ${stars(affixQuality(st.roll.before, it.rarity, it.ilvl || 1))}`));
      b.addEventListener('click', () => { if (it.unidentified) return; ctx.audio.sfx('select'); st.trait = i; st.roll = null; render(); });
      rows.append(b);
    });
    detail.append(fcard(it, text('p', 'fc-k', it.unidentified ? 'Its traits are still asleep' : 'Tap the trait to reroll'), rows));
    if (it.unidentified) { detail.append(text('p', 'forge-why', 'Identify it first: Bryn can read its story on its card.')); return; }
    detail.append(costBlock(cost));
    if (it.rerolls) detail.append(text('p', 'forge-need', `Rerolled ${it.rerolls} ${it.rerolls === 1 ? 'time' : 'times'} so far: each reroll of this piece costs more gold.`));
    const dry = st.trait == null ? { ok: false, reason: 'Pick a trait to reroll.' } : Forge.reroll(g, it.uid, st.trait);
    detail.append(go(st.trait == null ? 'Reroll a trait' : 'Reroll this trait', '', () => {
      const res = Forge.reroll(g, it.uid, st.trait);
      if (!res.ok) return fail(res);
      g = res.game;
      st.roll = { uid: it.uid, i: st.trait, before: res.before, after: res.after };
      ctx.audio.sfx('dice');
      setTimeout(() => ctx.audio.sfx('reveal', { tier: tierOf(it) }), 240);
      ctx.toast(`New trait: ${affixText(res.after)} ${stars(affixQuality(res.after, it.rarity, it.ilvl || 1))}`);
      render();
    }, dry.ok ? null : dry.reason));
  }

  // Salvage: what comes back, and one question per piece
  function salvageDetail(it) {
    const y = Forge.salvageYield(it);
    const back = el('ul', 'sv-yield');
    for (const [k, n] of Object.entries(y.materials)) if (n > 0) { const li = el('li'); li.append(matIconEl(k, 18), text('span', '', `+${n} ${matWord(k, n)}`)); back.append(li); }
    for (const [id, n] of Object.entries(y.gems)) if (n > 0) { const li = el('li'); li.append(gemIconEl(id, 18), text('span', '', `+${n} ${GEMS[id].name}${n === 1 ? '' : 's'} (back to the pouch)`)); back.append(li); }
    detail.append(fcard(it, text('p', 'fc-k', 'What comes back'), back));
    if (st.confirm === it.uid) {
      const box = el('div', { class: 'sv-confirm', role: 'group', 'aria-label': 'Salvage it?' });
      box.append(text('p', '', `Melt down ${it.name} for good? Once it is in the crucible it is gone.`));
      const no = btn('Keep it', 'btn big sv-no', () => { ctx.audio.sfx('back'); st.confirm = null; render(); }, { 'data-f': 'no' });
      const yes = btn('Yes, melt it down', 'btn primary big forge-confirm', () => {
        const res = Forge.salvage(g, it.uid);
        if (!res.ok) return fail(res);
        g = res.game;
        Object.assign(st, { confirm: null, sel: null, gone: { name: it.name, y: res.yield } });
        ctx.audio.sfx('coin');
        ctx.toast(`Salvaged: ${[countsText(res.yield.materials), countsText(res.yield.gems, { gems: true })].filter(Boolean).join(', ')}`);
        render();
      }, { 'data-f': 'yes' });
      box.append(el('div', 'sv-btns', [no, yes]));
      detail.append(box);
      setTimeout(() => {
        if (!no.isConnected) return;
        box.scrollIntoView({ block: 'center', behavior: isReduced() ? 'auto' : 'smooth' });
        no.focus({ preventScroll: true });
      }, 0);
      return;
    }
    const dry = Forge.salvage(g, it.uid);
    detail.append(go('Salvage it', '', () => { ctx.audio.sfx('select'); st.confirm = it.uid; render(); }, dry.ok ? null : dry.reason));
  }

  // Gems: tap a socket, then a gem from the pouch; a set gem can be taken out
  function gemsDetail(it) {
    const socks = socketList(it);
    if (st.sock == null || st.sock >= socks.length) st.sock = Math.max(0, socks.indexOf(null));
    const row = el('div', { class: 'gm-socks', role: 'group', 'aria-label': 'Sockets' });
    socks.forEach((gid, i) => {
      const on = st.sock === i;
      const b = el('button', { type: 'button', class: `gem-sock${gid ? ' set' : ''}${on ? ' on' : ''}`, 'aria-pressed': String(on), 'data-i': String(i), 'data-f': `sock:${i}`, 'aria-label': `Socket ${i + 1}: ${gid ? GEMS[gid].name : 'empty'}` });
      b.append(gid ? gemIconEl(gid, 24) : el('span', 'ring'));
      b.addEventListener('click', () => { ctx.audio.sfx('select'); st.sock = i; render(); });
      row.append(b);
    });
    const cur = socks[st.sock];
    const info = el('div', 'gm-info');
    info.append(text('p', 'gm-which', `Socket ${st.sock + 1} of ${socks.length}: ${cur ? GEMS[cur].name : 'empty'}`));
    if (cur) {
      info.append(text('p', 'gm-does', gemText(cur, it.slot)));
      info.append(btn('Take it out', 'btn gem-out', () => {
        const res = Forge.unsocket(g, it.uid, st.sock);
        if (!res.ok) return fail(res);
        g = res.game;
        ctx.audio.sfx('back');
        ctx.toast(`${GEMS[cur].name} goes back in your pouch.`);
        render();
      }, { 'data-f': 'out' }));
    } else info.append(text('p', 'gm-does', 'Empty. Pick a gem from your pouch below.'));
    detail.append(fcard(it, row, info));
    const cost = Forge.socketCost(it);
    detail.append(costBlock(cost, 'Setting a gem'));
    const held = Object.entries(g.gems || {}).filter(([id, n]) => GEMS[id] && n > 0);
    if (!held.length) { detail.append(text('p', 'forge-hint', 'Your pouch is empty. Idris the Gemwright sells stones in Sandspire, and Scorchgate\'s ash grows garnets.')); return; }
    const pouch = el('ul', { class: 'gm-pouch', 'aria-label': 'Your pouch' });
    const short = (g.gold || 0) < cost.gold ? `Needs ${cost.gold} gold` : null;
    for (const [id, n] of held) {
      const li = el('li');
      const same = cur === id;
      const b = el('button', { type: 'button', class: 'gem-pick', 'data-gem': id, 'data-f': `gem:${id}`, 'aria-label': `Set a ${GEMS[id].name} in socket ${st.sock + 1}: ${gemText(id, it.slot)}` });
      const t = el('span', 'gp-t');
      t.append(text('b', '', `${GEMS[id].name} ×${n}`), text('small', '', same ? 'Already set in this socket' : `Here: ${gemText(id, it.slot)}`));
      b.append(gemIconEl(id, 24), t);
      b.disabled = same || !!short;
      b.addEventListener('click', () => {
        const res = Forge.socket(g, it.uid, st.sock, id);
        if (!res.ok) return fail(res);
        g = res.game;
        ctx.audio.sfx('chime');
        ctx.toast(`${GEMS[id].name} set in socket ${st.sock + 1}.`);
        const next = socketList(live(it.uid)).indexOf(null);
        if (next >= 0) st.sock = next;
        render();
      });
      li.append(b);
      pouch.append(li);
    }
    detail.append(text('p', 'fc-k pouch-k', `Your pouch · into socket ${st.sock + 1}`), pouch);
    if (short) detail.append(text('p', 'forge-why', short));
  }

  // Awaken: the three deed pips, both branches (open, or whose path would open it), then the rite
  function awakenDetail(it) {
    const info = stageInfo(it);
    const opt = Forge.awakenOptions(g, it.uid);
    const deeds = el('ul', 'aw-deeds');
    for (const d of info.deeds) {
      const li = el('li', d.done ? 'on' : '');
      li.append(el('i', { 'aria-hidden': 'true' }), text('b', '', d.name), text('span', '', d.done ? (d.day ? `Done · Day ${d.day}` : 'Done') : d.text));
      deeds.append(li);
    }
    const stage = text('p', `aw-stage stage-${info.stage}${info.ready ? ' ready' : ''}`, info.line);
    detail.append(fcard(it, stage, deeds));
    if (info.branch) {
      const b = el('div', 'aw-awake');
      b.append(text('p', 'fc-k', 'Awakened'), text('b', 'awb-name', info.branch.name), text('p', 'awb-text', info.branch.text));
      const lines = blockLines(info.branch.stats);
      if (lines.length) b.append(text('p', 'awb-stats', lines.join(' · ')));
      detail.append(b);
      return;
    }
    const open = opt.branches.filter(b => b.enabled);
    if (!open.some(b => b.id === st.branch)) st.branch = open.length === 1 ? open[0].id : null;
    const brs = el('div', { class: 'aw-branches', role: 'group', 'aria-label': 'What it can wake into' });
    for (const b of opt.branches) {
      const on = st.branch === b.id;
      const c = el('button', { type: 'button', class: `aw-branch${on ? ' on' : ''}${b.enabled ? '' : ' shut'}`, 'aria-pressed': String(on), 'aria-disabled': String(!b.enabled), 'data-branch': b.id, 'data-f': `branch:${b.id}` });
      c.append(text('span', 'awb-path', b.path), text('b', 'awb-name', b.name), text('span', 'awb-text', b.text));
      const lines = blockLines(b.stats);
      if (lines.length) c.append(text('span', 'awb-stats', lines.join(' · ')));
      if (!b.enabled && b.why && b.why !== opt.why) c.append(text('span', 'awb-why', b.why));
      else if (b.note) c.append(text('span', 'awb-why', b.note));
      c.addEventListener('click', () => {
        if (!b.enabled) { ctx.audio.sfx('error'); ctx.toast(b.why || 'Not yet'); return; }
        ctx.audio.sfx('select'); st.branch = b.id; render();
      });
      brs.append(c);
    }
    detail.append(text('p', 'fc-k', 'It can wake into'), brs, costBlock(opt.cost, 'Hilda\'s rite'));
    const chosen = opt.branches.find(b => b.id === st.branch);
    const dry = chosen ? Forge.awaken(g, it.uid, chosen.id) : null;
    const reason = !opt.ready ? opt.why : !chosen ? (open.length ? 'Pick what it wakes into.' : opt.branches.find(b => b.why)?.why || 'Not yet.') : dry.ok ? null : dry.reason;
    detail.append(go(chosen ? `Wake it: ${chosen.name}` : 'Wake it', 'aw-go', async () => {
      const res = Forge.awaken(g, it.uid, chosen.id);
      if (!res.ok) return fail(res);
      g = res.game;
      ctx.audio.sfx('legend');
      ctx.toast(`${it.name} wakes: ${chosen.name}.`);
      render();
      await ctx.services.cardInspect(live(it.uid), { game: g, stamps: [{ kind: 'awakened', text: 'Awakened' }] });
    }, reason));
  }

  render();
  setTimeout(() => tabBtns[st.tab].focus({ preventScroll: true }), 0);
  return S.wait();
}
