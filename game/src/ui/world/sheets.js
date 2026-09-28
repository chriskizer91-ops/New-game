// World overlays (M3 spec §5.5), all through ui/lib/overlay.js openOverlay (keeps the focus trap).
// Exports (each returns a Promise that settles when the overlay closes):
//   openPrefight(ctx, { game, encId }) -> Promise<'fight'|'not-yet'>
//   openLockPrompt(ctx, { game, entity, lockType, status, crownwall }) -> Promise<'use'|'not-yet'>
//   openHearthMenu(ctx, { game, hfId }) -> Promise<{ act: 'rest'|'travel'|'atlas'|'party'|'leave', to? }>
//   openPauseMenu(ctx) -> Promise<'party'|'codex'|'journal'|'atlas'|'settings'|'title'|null>
//   openShop(ctx, { game, shopId }) -> Promise<game>
//   openForge(ctx, { game }) -> Promise<game>
//   showSpoils(ctx, { report, title }) -> Promise<void>
//   previewRelic(game, held, holder) -> ItemInstance   the grey card's item for a held relic or an Echo
// Every user-visible string goes in through textContent (or esc() for the few html fragments).
// Owner: WP7.

import { ENCOUNTERS } from '../../data/encounters.js';
import { HEARTHS } from '../../data/world.js';
import { LOCKS, CROWNWALL } from '../../data/locks.js';
import { OMENS } from '../../data/omens.js';
import { RELICS } from '../../data/relics.js';
import { SHOPS } from '../../data/shops.js';
import { CONSUMABLES } from '../../data/items.js';
import { MAPS } from '../../data/maps/index.js';
import { createRng } from '../../core/rng.js';
import { threat } from '../../rules/world.js';
import { familyOf, buildFoe } from '../../rules/foe.js';
import { relicItem } from '../../rules/loot.js';
import { itemProfile } from '../../rules/stats.js';
import * as partyRules from '../../rules/party.js';
import { renderFoe, diceIcon, INTENT_DIE, FOE_ART, itemIcon } from '../../art/index.js';
import * as Icons from '../../art/icons.js';
import { foeLook } from '../battle/sprites.js';
import { openOverlay } from '../lib/overlay.js';
import { el, toCanvas } from '../lib/dom.js';
import { iconCanvas, rarityColor, rarityName } from '../lib/art.js';

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
      if (h.relic || h.item) out.push({ held: h, holder, lend: !!h.lend });
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
  if (T.grudge) P.append(text('p', 'pf-grudge-note', `Grudge: ${T.grudge}. They beat you once. Settle it and every piece they drop comes one rarity higher.`));

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
  if (L.soft) P.append(text('p', 'lock-soft', L.soft.vision ? 'Without a key you can still walk in, seeing two steps ahead.' : 'Without a key it burns: 4% of everyone\'s max HP per step, never below 1.'));
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

// ---- a shop ---------------------------------------------------------------------------------------------

export function openShop(ctx, { game, shopId } = {}) {
  const shop = SHOPS[shopId];
  if (!shop) return Promise.resolve(game);
  let g = game;
  const S = sheet(ctx, { cls: 'ov-shop', label: shop.name, onBack: () => S.close(g) });
  const P = S.panel;
  P.classList.add('shop');
  const purse = text('p', 'shop-gold', '');
  P.append(text('p', 'kick', 'Shop'), text('h2', 'title-display', shop.name), purse);
  const list = el('ul', 'shop-list');
  const rows = [];
  for (const id of shop.items) {
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
    rows.push({ id, C, have, buy });
  }
  P.append(list, foot(btn('Done', 'btn primary big', () => { ctx.audio.sfx('confirm'); S.close(g); }, { 'data-primary': '' })));
  function update() {
    purse.textContent = `Purse: ${g.gold} gold`;
    for (const r of rows) { r.have.textContent = `You carry ${g.bag?.[r.id] || 0}`; r.buy.disabled = g.gold < r.C.price; }
  }
  update();
  focusFirst(P);
  return S.wait();
}

// ---- Hilda's forge --------------------------------------------------------------------------------------

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

export function openForge(ctx, { game } = {}) {
  let g = game;
  const S = sheet(ctx, { cls: 'ov-forge', label: 'Hilda\'s forge', onBack: () => S.close(g) });
  const P = S.panel;
  P.classList.add('forge');
  const purse = text('p', 'shop-gold', '');
  P.append(text('p', 'kick', 'Temper'), text('h2', 'title-display', 'Hilda\'s forge'), text('p', 'forge-line', 'Heat, hammer, patience. Mostly gold. Each step adds +1 to the piece, up to +3.'), purse);
  const list = el('ul', 'forge-list');
  const detail = el('div', 'forge-detail');
  P.append(list, detail, foot(btn('Done', 'btn ghost big', () => { ctx.audio.sfx('confirm'); S.close(g); }, { 'data-primary': '' })));
  let sel = null;

  function items() {
    const worn = [];
    for (const id of g.party.active) {
      const h = g.party.roster[id];
      for (const uid of Object.values(h.gear || {})) {
        const it = uid && g.inventory.find(i => i.uid === uid);
        if (it && !it.shattered) worn.push({ it, who: shortName(g, id) });
      }
    }
    const wornIds = new Set(worn.map(w => w.it.uid));
    const bag = g.inventory.filter(i => !wornIds.has(i.uid) && !i.shattered && i.slot).map(it => ({ it, who: null }));
    return [...worn, ...bag];
  }
  function render() {
    purse.textContent = `Purse: ${g.gold} gold`;
    list.replaceChildren();
    for (const { it, who } of items()) {
      const li = el('li');
      const b = el('button', { type: 'button', class: 'forge-item' + (sel === it.uid ? ' on' : '') });
      b.dataset.uid = it.uid;
      try { b.append(iconCanvas(it, 2)); } catch { /* optional */ }
      const t = el('span', 'forge-item-t');
      const nm = text('b', '', `${it.unidentified ? 'Unidentified' : it.name}${it.temper ? ` +${it.temper}` : ''}`);
      nm.style.color = rarityColor(it.rarity);
      t.append(nm, text('small', '', `${rarityName(it.rarity)}${who ? ` · on ${who}` : ' · in the bag'}`));
      b.append(t);
      b.addEventListener('click', () => { ctx.audio.sfx('select'); sel = it.uid; render(); });
      li.append(b);
      list.append(li);
    }
    detail.replaceChildren();
    const it = sel && g.inventory.find(i => i.uid === sel);
    if (!it) { detail.append(text('p', 'forge-hint', 'Pick a piece. What you wear comes first.')); return; }
    const t = it.temper || 0;
    const cost = partyRules.temperCost ? partyRules.temperCost(it) : null;
    const card = el('div', 'forge-card');
    card.append(text('b', 'forge-card-name', `${it.name}${t ? ` +${t}` : ''}`));
    const before = temperNumbers(it), after = cost != null ? temperNumbers({ ...it, temper: t + 1 }) : null;
    const tbl = el('dl', 'forge-nums');
    before.forEach(([k, v], i) => {
      tbl.append(text('dt', '', k));
      const dd = el('dd');
      dd.append(text('span', 'num', v));
      if (after) { dd.append(text('span', 'arrow', ' → ')); dd.append(text('span', 'num next', after[i][1])); }
      tbl.append(dd);
    });
    card.append(tbl);
    detail.append(card);
    if (cost == null) { detail.append(text('p', 'forge-max', `Tempered as far as it goes (+${t}).`)); return; }
    const go = btn(`Temper +1 · ${cost} gold`, 'btn primary big forge-go', () => {
      const r = partyRules.temper ? partyRules.temper(g, it.uid) : { ok: false, reason: 'The forge is cold' };
      if (r.ok) { g = r.game; ctx.audio.sfx('equip', { tier: 4 }); ctx.toast(`${it.name} is +${t + 1} now.`); }
      else { ctx.audio.sfx('error'); ctx.toast(r.reason || 'Not now'); }
      render();
    });
    go.disabled = g.gold < cost;
    detail.append(go);
    if (g.gold < cost) detail.append(text('p', 'forge-max', `Needs ${cost} gold.`));
  }
  render();
  focusFirst(P);
  return S.wait();
}

// ---- the spoils strip (a Rout) --------------------------------------------------------------------------

export function showSpoils(ctx, { report, title = 'Routed!' } = {}) {
  const r = report || {};
  const S = sheet(ctx, { cls: 'ov-spoils', label: 'Spoils', onBack: () => S.close() });
  const P = S.panel;
  P.classList.add('spoils');
  P.append(text('p', 'kick', title), text('h2', 'title-display spoils-sum', `+${r.gold || 0} gold · +${r.xp || 0} XP`));
  const items = [...(r.claimed || []), ...(r.drops || [])];
  if (items.length) {
    const row = el('div', 'spoils-items');
    for (const it of items) {
      const b = el('button', { type: 'button', class: 'spoils-chip' });
      try { b.append(iconCanvas(it, 2)); } catch { /* optional */ }
      const nm = text('b', '', it.unidentified ? 'Unidentified' : it.name);
      nm.style.color = rarityColor(it.rarity);
      b.append(nm);
      b.setAttribute('aria-label', `${it.name}: open its card`);
      b.addEventListener('click', async () => {
        ctx.audio.sfx('page');
        await ctx.services.cardReveal(it, { source: 'drop', backdrop: 'hearth-road' });
      });
      row.append(b);
    }
    P.append(row);
  }
  const bag = Object.entries(r.consumables || {});
  if (bag.length) P.append(text('p', 'spoils-bag', `Also: ${bag.map(([id, n]) => `${CONSUMABLES[id]?.name || id} ×${n}`).join(', ')}`));
  for (const [id, gains] of Object.entries(r.levelUps || {})) {
    const last = gains[gains.length - 1];
    if (last) P.append(text('p', 'spoils-level', `${shortName(ctx.game, id)} reaches level ${last.level}.`));
  }
  P.append(foot(btn('Onward', 'btn primary big', () => { ctx.audio.sfx('confirm'); S.close(); }, { 'data-primary': '' })));
  focusFirst(P);
  return S.wait();
}
