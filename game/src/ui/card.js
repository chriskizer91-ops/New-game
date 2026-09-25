// The item card (prototype look, real data) and the card services every screen can call:
//   ctx.services.cardReveal(item, { source, title, backdrop })  chest -> rarity beam -> card flip + chime,
//                                                                then "Equip on..." with live try-on
//   ctx.services.cardSlam(item, { power, name, text })         ~1.2 s Legend Surge slam
//   ctx.services.cardPreview(item, { heldBy })                 greyed card stamped HELD BY
//   ctx.services.cardInspect(item, { heroId, stamps })          card + picker, no chest (party, codex)
// Each returns a Promise that resolves when the player closes it.
import './card.css';
import { RARITY_LOOK, itemIcon, hx } from '../art/index.js';
import { equip, unequip, compare, wearerOf, bestHeroFor, canUse } from '../rules/party.js';
import { itemProfile, POWERS } from '../rules/stats.js';
import { identifyItem } from '../rules/loot.js';
import { el, esc, button, toCanvas, fmt, sgn, replay, countTo } from './lib/dom.js';
import { portraitCanvas, cornerCanvas, iconCanvas, bustCanvas, heroSprite, gearOf, itemsById, chestImage, tierOf, rarityName } from './lib/art.js';
import {
  nameParts, typeLine, mainStat, traitRows, powersOf, setInfo, provenanceText, verdict, isRelic, relicOf, codexNo, SLOT_NAME, CMP_ROWS,
} from './lib/items.js';
import { openOverlay } from './lib/overlay.js';
import { isReduced } from './lib/anim.js';
import { renderBackdrop } from '../art/scenes.js';

const shortName = (game, heroId) => {
  const h = game?.party?.roster?.[heroId];
  if (!h) return heroId;
  if (heroId === 'alondra') return 'Alondra';
  return h.name.split(' ')[0];
};
const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const inInventory = (game, item) => !!game?.inventory?.some(i => i.uid === item.uid);
const liveItem = (game, item) => game?.inventory?.find(i => i.uid === item.uid) || item;

// ---- the card ------------------------------------------------------------------------------------
// opts: { source, heldBy, heroId, picker, stamps:[{kind,text}], grey, silhouette, riddle, fresh, onChange }
export function buildCard(itemIn, ctx, opts = {}) {
  let item = liveItem(ctx.game, itemIn);
  const card = el('article', { class: 'card' + (opts.grey ? ' grey' : '') + (item.shattered ? ' shattered' : ''), 'data-r': item.rarity });
  const S = { target: null, sprite: null };
  for (const c of ['tl', 'tr', 'bl', 'br']) card.append(cornerCanvas(item.rarity, c));
  const relic = relicOf(item);
  const head = el('div', 'card-head', `<span class="rar">${esc(rarityName(item.rarity))}</span><span class="ilvl">${relic ? codexNo(relic) : `Item Level ${item.ilvl || 1}`}</span>`);
  card.append(head);

  const pwin = el('div', 'pwin');
  const develop0 = opts.silhouette ? 0 : item.unidentified ? 0 : undefined;
  const port = portraitCanvas(item, { size: 64, develop: develop0 });
  port.canvas.setAttribute('role', 'img');
  const portLabel = () => port.canvas.setAttribute('aria-label', opts.silhouette || item.unidentified ? 'An unknown relic, a black silhouette' : `Pixel portrait of ${item.name}`);
  portLabel();
  pwin.append(port.canvas);
  const stampA = el('div', 'stamp a'); stampA.hidden = true;
  const stampB = el('div', 'stamp b'); stampB.hidden = true;
  pwin.append(stampA, stampB);
  card.append(pwin);

  const body = el('div', 'card-body');
  card.append(body);
  const pickHost = el('div', 'pick-host');
  card.append(pickHost);

  const setStamp = (slot, kind, text, slam) => {
    const s = slot === 'b' ? stampB : stampA;
    if (!kind) { s.hidden = true; return; }
    s.className = `stamp ${slot} st-${kind}`;
    s.textContent = text;
    s.hidden = false;
    if (slam && !isReduced()) replay(s, 'slam');
  };

  function paintBody() {
    item = liveItem(ctx.game, item);
    body.replaceChildren();
    if (opts.silhouette) {
      body.append(el('h2', 'item-name', '???'));
      body.append(el('p', 'itype', esc(`${relic ? codexNo(relic) : ''} · Unsighted`)));
      body.append(el('p', 'lore riddle', `“${esc(opts.riddle || 'Nobody has seen it yet. Somebody is carrying it.')}”`));
      return;
    }
    const np = nameParts(item);
    body.append(el('h2', 'item-name', esc(np.name)));
    if (np.epithet) body.append(el('p', 'epithet', esc(np.epithet)));
    body.append(el('p', 'itype', esc(typeLine(item))));
    const ms = mainStat(item);
    body.append(el('div', 'mainstat', `<span class="k">${esc(ms.k)}</span><span class="v">${ms.v}</span>${ms.sub ? `<span class="sub">${esc(ms.sub)}</span>` : ''}`));
    const rows = traitRows(item);
    if (rows.length) {
      const ul = el('ul', 'affixes');
      for (const r of rows) {
        const li = el('li', r.plain ? 'plain' : r.hidden ? 'hidden' : '');
        li.innerHTML = `<span>${esc(r.text)}</span>${r.stars ? `<i class="q" aria-label="Quality ${r.stars} of 5">${stars(r.stars)}</i>` : ''}`;
        ul.append(li);
      }
      body.append(ul);
    }
    if (!item.unidentified) {
      const pw = powersOf(item);
      if (pw.power || pw.arts.length || pw.map) {
        const sec = el('section', 'blk power');
        if (pw.power) sec.append(el('h3', '', 'Legend Surge'), el('h4', '', esc(pw.power.name)), el('p', '', esc(pw.power.text)));
        for (const a of pw.arts) sec.append(el('p', 'art', `<b>Art · ${esc(a.name)} <span>${a.mp} MP</span></b>${esc(a.text)}`));
        if (pw.map) sec.append(el('p', 'map', `<b>Map power · ${esc(pw.map.name)}</b>${esc(pw.map.text)}`));
        body.append(sec);
      }
      const si = setInfo(item, ctx.game, S.target || wearerOf(ctx.game || { party: { roster: {} } }, item.uid)?.heroId);
      if (si) {
        const n = si.have.length, who = S.target ? ` on ${shortName(ctx.game, S.target)}` : '';
        const sb = el('section', 'blk setb', `<h3>Set · ${esc(si.set.name)} · ${n} of ${si.set.pieces.length}${esc(who)}</h3>`);
        for (const b of si.set.bonuses) sb.append(el('p', n >= b.n ? 'on' : '', `(${b.n}) ${esc(b.text)}`));
        sb.append(el('div', 'pieces', si.pieces.map(p => `${p.on ? '■' : '□'} ${esc(p.name)}`).join(' &nbsp; ')));
        body.append(sb);
      }
      const lore = relic ? relic.lore : item.lore;
      if (lore) body.append(el('p', 'lore', `“${esc(lore)}”`));
    }
    if (item.provenance?.from || opts.heldBy) {
      const txt = opts.heldBy ? `Held by ${opts.heldBy}${relic ? ' · ' + relic.holder : ''}` : provenanceText(item, opts.source);
      body.append(el('p', 'ribbon', `<span>${esc(txt)}</span>`));
    }
    if (!opts.grey) {
      const row = el('div', 'iconrow');
      const icons = el('div', 'icons');
      const box = el('div', 'slotbox');
      const ic = item.unidentified ? darkIcon(item, 3) : iconCanvas(item, 3);
      box.append(ic); icons.append(box, item.unidentified ? darkIcon(item, 1) : iconCanvas(item, 1));
      const wear = ctx.game ? wearerOf(ctx.game, item.uid) : null;
      const kills = item.chronicle?.kills || 0;
      const chron = [kills ? `${kills} ${kills === 1 ? 'foe' : 'foes'} felled` : item.slot === 'weapon' ? 'No foes felled yet' : null, wear ? `Borne by ${shortName(ctx.game, wear.heroId)}` : 'In the bag'].filter(Boolean).join(' · ');
      row.append(icons, el('p', '', `<b>Chronicle</b>${esc(chron)}`));
      body.append(row);
    }
  }

  function paintStamps(slam) {
    item = liveItem(ctx.game, item);
    const wear = ctx.game ? wearerOf(ctx.game, item.uid) : null;
    if (opts.silhouette) { setStamp('a', 'unsighted', 'Unsighted'); return; }
    if (opts.heldBy && opts.loose) { setStamp('a', 'sighted', `Knocked loose · ${opts.heldBy}`); return; }
    if (opts.heldBy) { setStamp('a', 'held', `Held by: ${opts.heldBy}`); return; }
    if (item.unidentified) { setStamp('a', 'unid', 'Unidentified'); return; }
    if (item.shattered) setStamp('a', 'shattered', 'Shattered');
    else if (wear) setStamp('a', 'equipped', `Equipped · ${shortName(ctx.game, wear.heroId)}`, slam === 'equip');
    else setStamp('a', null);
    const extra = (opts.stamps || [])[0];
    if (item.stamp === 'grudge-settled') setStamp('b', 'grudge', 'Grudge settled', slam === 'extra');
    else if (extra) setStamp('b', extra.kind, extra.text, slam === 'extra');
  }

  paintBody();
  paintStamps();

  // ---- identify ritual ----
  let idBtn = null;
  if (item.unidentified && inInventory(ctx.game, item) && !opts.grey) {
    const box = el('div', 'identify');
    const face = el('span', 'die');
    idBtn = button('Roll to identify', 'btn primary identify-btn', async () => {
      idBtn.disabled = true;
      ctx.audio.sfx('dice');
      const bryn = ctx.game.party.roster.bryn;
      const intMod = Math.floor(((bryn?.base?.INT ?? 10) - 10) / 2);
      const roll = 1 + Math.floor(Math.random() * 20);
      face.textContent = `d20: ${roll} ${intMod >= 0 ? '+' : '−'} ${Math.abs(intMod)} INT = ${roll + intMod}`;
      const words = roll + intMod >= 15 ? 'Bryn reads the grain at a glance. The story comes back all at once.' : roll + intMod >= 8 ? 'Bryn turns it in the light until the story gives up its name.' : 'It fights Bryn for a long minute, then tells the truth anyway.';
      box.append(el('p', 'id-note', esc(words)));
      const dur = isReduced() ? 1 : roll + intMod >= 15 ? 900 : 1700;
      ctx.audio.sfx('identify');
      const t0 = performance.now();
      await new Promise(res => {
        const step = () => {
          const u = Math.min(1, (performance.now() - t0) / dur);
          port.setDevelop(u);
          if (u < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
      port.setDevelop(undefined);
      const g = ctx.game;
      ctx.setGame({ ...g, inventory: g.inventory.map(i => (i.uid === item.uid ? identifyItem(i) : i)) });
      item = liveItem(ctx.game, item);
      portLabel();
      ctx.audio.sfx('reveal', { tier: tierOf(item) });
      box.remove();
      paintBody(); paintStamps();
      if (opts.picker) mountPicker();
      opts.onChange && opts.onChange('identify');
    }, { 'data-primary': '' });
    box.append(el('p', 'id-lead', 'A Storied piece arrives as a black silhouette. Bryn can read its story.'), idBtn, face);
    pickHost.append(box);
  }

  // ---- "Equip on..." picker with a live try-on ----
  function mountPicker() {
    pickHost.replaceChildren();
    const game = ctx.game;
    if (!game || !inInventory(game, item) || item.unidentified) return;
    const wear = wearerOf(game, item.uid);
    S.target = opts.heroId || wear?.heroId || bestHeroFor(game, item) || game.party.active.find(id => canUse(game.party.roster[id], item).ok) || game.party.active[0];
    const pick = el('section', 'pick');
    pick.append(el('h3', '', item.shattered ? 'Shattered: Hilda can reforge it' : 'Equip on'));
    const row = el('div', 'pick-row');
    const btns = {};
    game.party.active.forEach((id, i) => {
      const b = el('button', { type: 'button', class: 'pm', 'data-h': id });
      b.append(bustCanvas(game, id, { size: 24, scale: 2 }), el('span', 'nm', esc(shortName(game, id))), el('span', 'vd', ''));
      b.addEventListener('click', () => { S.target = id; ctx.audio.sfx('select'); update(); });
      b.dataset.pick = String(i + 1);
      btns[id] = b; row.append(b);
    });
    pick.append(row);
    const tryon = el('div', 'tryon');
    const view = el('div', 'hero-view');
    const tiles = el('div', 'tiles');
    tryon.append(view, tiles);
    pick.append(tryon);
    const note = el('p', 'note');
    const cmp = el('div', 'cmp');
    pick.append(note, cmp);
    const eq = el('button', { type: 'button', class: 'equip', 'data-primary': '' });
    eq.addEventListener('click', doEquip);
    pick.append(eq);
    const off = button('Take it off', 'btn ghost unequip', doUnequip);
    pick.append(off);
    pickHost.append(pick);
    S.sprite = null;

    function previewGear(id) {
      const g = gearOf(ctx.game, id);
      const c = compare(ctx.game.party.roster[id], item, ctx.game.inventory);
      if (!c.ok) return g;
      const over = { [item.slot]: item };
      for (const uid of c.displaced || []) for (const [s, v] of Object.entries(g)) if (v && v.uid === uid && s !== item.slot) over[s] = null;
      if (itemProfile(item)?.weapon?.hands === 2) over.offhand = null;
      return { ...g, ...over };
    }
    function paintTiles(before, after, animate) {
      const T = [['dmg', 'Damage', v => fmt(v)], ['hit', 'Attack', v => (v >= 0 ? '+' : '') + fmt(v)], ['guard', 'Guard', v => fmt(v)], ['hp', 'HP', v => fmt(v)]];
      tiles.replaceChildren();
      for (const [k, lab, f] of T) {
        const a = before[k], b = after[k], d = Math.round((b - a) * 10) / 10;
        const t = el('div', `stat${d > 0 ? ' up' : d < 0 ? ' down' : ''}`);
        const v = el('span', 'v', f(animate ? a : b));
        t.append(el('span', 'k', lab), v);
        if (d) t.append(el('span', `dl ${d > 0 ? 'up' : 'down'}`, `${d > 0 ? '▲' : '▼'}${fmt(Math.abs(d))}`));
        tiles.append(t);
        if (animate && d) {
          countTo(v, a, b, { reduced: isReduced(), format: f });
          const fl = el('span', `fl ${d > 0 ? 'up' : 'down'}`, sgn(d)); t.append(fl); replay(fl, 'go');
        }
      }
    }
    function update(justEquipped) {
      const game = ctx.game, id = S.target, hero = game.party.roster[id];
      const wearNow = wearerOf(game, item.uid);
      for (const [hid, b] of Object.entries(btns)) {
        const v = verdict(game, hid, item);
        b.setAttribute('aria-pressed', String(hid === id));
        b.classList.toggle('cant', v.cls === 'cant');
        const vd = b.querySelector('.vd'); vd.className = 'vd ' + v.cls; vd.textContent = v.text;
        b.setAttribute('aria-label', `${shortName(game, hid)}: ${v.reason || v.text}`);
        if (v.reason) b.title = v.reason; else b.removeAttribute('title');
      }
      const c = compare(hero, item, game.inventory);
      const owned = wearNow && wearNow.heroId === id;
      const gearNow = owned ? gearOf(game, id) : previewGear(id);
      if (!S.sprite || S.spriteHero !== id) {
        view.replaceChildren();
        S.sprite = heroSprite(game, id, { scale: 3, gear: gearNow });
        S.spriteHero = id;
        view.append(S.sprite.canvas, el('span', 'hv-name', esc(`${game.party.roster[id].name}`)));
      } else S.sprite.set(gearNow);
      view.classList.toggle('cant', !c.ok && !owned);
      if (!justEquipped) paintTiles(c.before, owned ? c.before : c.after, false);
      // compare rows
      cmp.replaceChildren();
      note.className = 'note'; note.textContent = '';
      if (item.shattered) { note.className = 'note bad'; note.textContent = 'Shattered in the fight. Hilda can reforge it at a Hearthfire (Party screen).'; }
      else if (!c.ok && !owned) { note.className = 'note bad'; note.textContent = c.reason || "Can't use this."; }
      else {
        const cur = c.current && itemsById(game)[c.current];
        const repl = el('p', 'repl');
        if (owned) repl.append(el('span', '', `Equipped on <b>${esc(shortName(game, id))}</b>. ${esc(SLOT_NAME[item.slot])} slot.`));
        else if (cur) { repl.append(iconCanvas(cur, 2), el('span', '', `Replaces <b>${esc(cur.name)}</b>`)); }
        else repl.append(el('span', '', `Fills ${esc(shortName(game, id))}'s empty ${esc(SLOT_NAME[item.slot].toLowerCase())} slot.`));
        cmp.append(repl);
        if (!owned) {
          const rows = el('div', 'rows');
          for (const [k, lab, f] of CMP_ROWS) {
            const a = c.before[k], b = c.after[k];
            if (a === b && !['dmg', 'guard'].includes(k)) continue;
            const d = Math.round((b - a) * 10) / 10;
            const dv = k === 'crit' ? (d ? (d > 0 ? 'wider' : 'narrower') : '=') : d ? sgn(d) : '=';
            rows.append(el('div', 'row', `<span class="k">${lab}</span><span class="ba">${f(a)} → <b>${f(b)}</b></span><span class="d ${d > 0 ? 'up' : d < 0 ? 'down' : 'same'}">${dv}</span>`));
          }
          cmp.append(rows);
          const by = itemsById(game);
          const lost = (c.displaced || []).filter(u => u !== c.current).map(u => by[u]).filter(Boolean);
          if (lost.length) cmp.append(el('p', 'note bad', `Two-handed: ${esc(lost.map(x => x.name).join(', '))} comes off.`));
        }
      }
      const other = wearNow && !owned ? shortName(game, wearNow.heroId) : null;
      eq.classList.toggle('done', !!owned);
      if (item.shattered) { eq.disabled = true; eq.textContent = 'Shattered'; }
      else if (owned) { eq.disabled = true; eq.textContent = `Equipped on ${shortName(game, id)}`; }
      else if (!c.ok) { eq.disabled = true; eq.textContent = `${shortName(game, id)} can't use this`; }
      else { eq.disabled = false; eq.textContent = other ? `Move to ${shortName(game, id)}` : `Equip on ${shortName(game, id)}`; }
      off.hidden = !owned || !opts.allowUnequip;
      if (setInfo(item)) paintBody();
    }
    function doEquip() {
      const id = S.target, before = compare(ctx.game.party.roster[id], item, ctx.game.inventory);
      const r = equip(ctx.game, id, item.uid);
      if (!r.ok) { ctx.audio.sfx('error'); ctx.toast(r.reason || "Can't equip that."); return; }
      ctx.setGame(r.game);
      ctx.audio.sfx('equip', { tier: tierOf(item) });
      paintBody();
      paintStamps('equip');
      update(true);
      paintTiles(before.before, before.after, true);
      if (S.sprite) S.sprite.flash(item.rarity);
      opts.onChange && opts.onChange('equip', id);
      if (opts.onEquipped) opts.onEquipped(id);
    }
    function doUnequip() {
      const w = wearerOf(ctx.game, item.uid);
      if (!w) return;
      ctx.setGame(unequip(ctx.game, w.heroId, w.slot));
      ctx.audio.sfx('back');
      paintBody();
      paintStamps();
      update();
      opts.onChange && opts.onChange('unequip', w.heroId);
    }
    S.update = update;
    update();
  }
  if (opts.picker && !item.unidentified) mountPicker();
  else if (opts.picker && item.unidentified && !idBtn) mountPicker();

  return {
    el: card,
    get item() { return item; },
    setStamp, paintStamps,
    selectHero(i) { const id = ctx.game.party.active[i]; if (id && S.update) { S.target = id; S.update(); ctx.audio.sfx('select'); return true; } return false; },
    sizePortrait() { sizePortrait(card, port.canvas); },
  };
}

function darkIcon(item, scale) {
  const img = itemIcon(item), d = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
  for (let i = 0; i < d.data.length; i += 4) if (d.data[i + 3]) { d.data[i] = 20; d.data[i + 1] = 16; d.data[i + 2] = 26; }
  const cv = toCanvas(d, null, scale); cv.setAttribute('aria-hidden', 'true'); return cv;
}

function sizePortrait(card, cv) {
  if (!cv || !card.isConnected) return;
  const cs = getComputedStyle(card);
  const avail = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const k = Math.max(2, Math.min(5, Math.floor(avail / 64)));
  cv.style.width = cv.style.height = 64 * k + 'px';
}

// ---- the chest stage for the reveal ---------------------------------------------------------------
function chestStage(item, { backdrop = 'hearth-road', title, meta, reduced }) {
  const stage = el('section', 'reveal-stage');
  const cv = el('canvas', { class: 'px scene', 'aria-hidden': 'true' });
  const flash = el('div', 'flash');
  const banner = el('div', 'banner', `<div class="kick">${esc(title.kick)}</div><h2>${esc(title.main)}</h2>${meta ? `<p class="meta">${esc(meta)}</p>` : ''}`);
  stage.append(cv, flash, banner);
  const L = RARITY_LOOK[item.rarity] || RARITY_LOOK.worn, tier = L.tier;
  const ramp = L.ramp.map(hx);
  const css = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  const SC = { W: 120, H: 96, k: 3, top: 30, bg: null, parts: [], rv: null, amb: [] };
  const chestC = toCanvas(chestImage(false));
  const chestO = toCanvas(chestImage(true, item.rarity));
  const icon = item.unidentified ? darkIcon(item, 1) : toCanvas(itemIcon(item));
  function layout() {
    const cw = stage.clientWidth || 360;
    const k = cw < 560 ? 3 : 4, W = Math.floor(cw / k);
    // phone: a letterbox above the card; laptop: a tall stage beside it, so the beam has room
    const H = innerWidth < 900 ? 104 : Math.max(92, Math.min(170, Math.floor((innerHeight - 70) / k)));
    Object.assign(SC, { W, H, k, top: Math.ceil((banner.offsetHeight || 90) / k) + 2 });
    cv.width = W; cv.height = H; cv.style.width = W * k + 'px'; cv.style.height = H * k + 'px';
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    const g = bg.getContext('2d');
    g.putImageData(renderBackdrop(backdrop, { w: W, h: H, t: 1.3, reduced: true }), 0, 0);
    g.fillStyle = 'rgba(8,6,10,.45)'; g.fillRect(0, 0, W, H);
    const grd = g.createRadialGradient(W / 2, H - 30, 4, W / 2, H - 30, W * .6); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    SC.bg = bg;
  }
  const hash = (a, b, c) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function draw(t) {
    const g = cv.getContext('2d'), { W, H } = SC; if (!SC.bg) return;
    g.imageSmoothingEnabled = false; g.globalAlpha = 1; g.drawImage(SC.bg, 0, 0);
    const px = (x, y, c, a = 1) => { g.globalAlpha = a; g.fillStyle = typeof c === 'string' ? c : css(c); g.fillRect(x | 0, y | 0, 1, 1); };
    if (!reduced) {
      while (SC.amb.length < 14) SC.amb.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random(), p: Math.random() * 6 });
      for (const a of SC.amb) { a.y -= .25 + a.s * .3; a.x += Math.sin(t * 2 + a.p) * .2; px(a.x, a.y, a.s > .5 ? '#ffb04a' : '#e0622a', .7); if (a.y < -2) a.y = H - 10; }
    }
    const cx = Math.floor(W / 2) - 16, cy = H - 40, mid = cx + 16, rv = SC.rv;
    let chest = chestC, jx = 0;
    if (rv) {
      const e = t - rv.t0;
      if (e < rv.open) jx = reduced ? 0 : Math.round(Math.sin(e * 60) * (e / rv.open) * 1.5);
      else chest = chestO;
      if (e >= rv.open) {
        const grow = Math.min(1, (e - rv.open) / Math.max(.15, rv.hit - rv.open)), top = Math.round(SC.top + (cy + 8 - SC.top) * (1 - grow * grow * (3 - 2 * grow)));
        const bw = L.beam * (reduced ? .8 : 1) * (e > rv.hit ? 1 + .15 * Math.sin(e * 6) : Math.min(1, grow * 1.3));
        for (let x = -bw * 2.2; x <= bw * 2.2; x++) for (let y = -2; y <= 2; y++) { const q = (x / (bw * 2.2)) ** 2 + (y / 2.5) ** 2; if (q < 1 && ((x + y) & 1)) px(mid + x, cy + 26 + y, ramp[2], .35 * (1 - q)); }
        if (tier >= 3 && e > rv.hit && !reduced) { const n = Math.min(tier, 6) * 3; for (let k = 0; k < n; k++) { const a = e * .5 + k / n * Math.PI * 2; for (let rad = 8; rad < 70; rad += 1.3) { if (hash(k, rad | 0, 3) < .35) continue; px(mid + Math.cos(a) * rad, cy + 10 + Math.sin(a) * rad * .8, ramp[2], .22 * (1 - rad / 70)); } } }
        for (let y = top; y < cy + 12; y++) { const wob = reduced ? 0 : Math.sin(e * 7 + y * .3) * .7; const w = bw / 2 + wob; for (let x = -Math.ceil(w) - 1; x <= Math.ceil(w) + 1; x++) { const q = Math.abs(x) / (w + .01); if (q > 1.25) continue; const c = q < .25 ? ramp[4] : q < .55 ? ramp[3] : q < .9 ? ramp[2] : ramp[1]; let a = q < .9 ? .92 : .5; if (q > .55 && ((x + y + Math.floor(e * 12)) & 1)) a *= .5; const fade = Math.min(1, (y - top) / 8); px(mid + x, y, c, a * fade); } }
        if (!reduced) for (let k = 0; k < 6 + Math.min(tier, 6) * 3; k++) { const ph = (e * (.4 + hash(k, 1, 7) * .5) + hash(k, 2, 7)) % 1; px(mid + (hash(k, 3, 7) - .5) * bw * 1.6, cy + 6 - ph * (cy + 6), ramp[4], 1 - ph); }
      }
    }
    g.globalAlpha = 1; g.drawImage(chest, cx + jx, cy);
    if (rv) {
      const e = t - rv.t0;
      for (const p of SC.parts) { p.x += p.vx; p.y += p.vy; p.vy += .07; p.l--; if (p.l > 0) px(p.x, p.y, ramp[p.c], Math.min(1, p.l / 15)); }
      SC.parts = SC.parts.filter(p => p.l > 0);
      if (e >= rv.open) {
        const u = Math.min(1, (e - rv.open) / (rv.hit - rv.open + .35)), ez = 1 - (1 - u) ** 3, hoverY = cy - 26;
        const y = Math.round(cy + 6 + (hoverY - cy - 6) * ez + (e > rv.hit + .35 && !reduced ? Math.sin(e * 3) * 1.4 : 0));
        g.globalAlpha = 1; g.drawImage(icon, mid - 8, y);
      }
    }
    g.globalAlpha = 1;
  }
  let raf = 0, alive = true;
  const loop = () => { if (!alive) return; draw(performance.now() / 1000); raf = requestAnimationFrame(loop); };
  return {
    el: stage,
    start() { layout(); if (reduced) draw(0); raf = requestAnimationFrame(loop); },
    relayout() { layout(); },
    burst() {
      const n = reduced ? 6 : [8, 14, 22, 34, 50, 70, 70, 80][tier], x = Math.floor(SC.W / 2), y = SC.H - 34;
      for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + (Math.random() - .5) * 2.6, v = .6 + Math.random() * (1.2 + Math.min(tier, 6) * .35); SC.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .4, l: 26 + Math.random() * 30, c: 2 + (k % 3) }); }
      if (tier >= 3 && !reduced) { flash.style.background = css(ramp[4]); replay(flash, 'go'); }
      if (tier >= 4 && !reduced) replay(stage, 'shake');
    },
    open(openAt, hitAt) { SC.rv = { t0: performance.now() / 1000, open: openAt, hit: hitAt }; if (reduced) draw(performance.now() / 1000 + hitAt + 1); },
    stop() { alive = false; cancelAnimationFrame(raf); },
  };
}

// ---- services --------------------------------------------------------------------------------------
export function installCardServices(ctx) {
  const reduced = () => ctx.reduced();

  function cardOverlay(item, opts, { withChest = false, title } = {}) {
    return new Promise(resolve => {
      let cardApi = null, stage = null, done = false;
      const finish = () => { if (done) return; done = true; if (stage) stage.stop(); ov.close(); removeEventListener('resize', onResize); resolve({ item: cardApi ? cardApi.item : item }); };
      const ov = openOverlay({
        cls: withChest ? 'ov-reveal' : 'ov-card',
        label: `${rarityName(item.rarity)} item: ${item.unidentified ? 'unidentified' : item.name}`,
        onBack: () => { if (cardApi || !withChest) { ctx.audio.sfx('back'); finish(); } },
        onKey: a => (a.startsWith('pick') && cardApi ? cardApi.selectHero(+a.slice(4) - 1) : false),
      });
      const wrap = el('div', 'reveal-wrap' + (withChest ? ' has-stage' : ''));
      const left = el('div', 'reveal-left'), right = el('div', 'reveal-right');
      wrap.append(left, right);
      ov.inner.append(wrap);
      const foot = el('div', 'ov-foot');
      const cont = button(withChest ? 'Keep it in the bag' : 'Close', 'btn ghost cont', () => { ctx.audio.sfx('confirm'); finish(); });
      foot.append(cont);
      const onResize = () => { if (stage) stage.relayout(); if (cardApi) cardApi.sizePortrait(); };
      addEventListener('resize', onResize);
      const showCard = () => {
        cardApi = buildCard(item, ctx, {
          ...opts, picker: opts.picker !== false && !opts.grey,
          onChange: kind => { if (kind === 'equip') { cont.textContent = 'Continue'; cont.className = 'btn primary cont'; cont.setAttribute('data-primary', ''); } },
        });
        const c = cardApi.el;
        if (withChest) c.classList.add(tierOf(item) >= 4 && !reduced() ? 'flip' : 'enter');
        right.append(c, foot);
        cardApi.sizePortrait();
        if (opts.stamps && opts.stamps[0]) setTimeout(() => { ctx.audio.sfx('stamp'); cardApi.paintStamps('extra'); }, reduced() ? 0 : 520);
        const eq = c.querySelector('.equip:not([disabled]), .identify-btn');
        setTimeout(() => {
          if (withChest && innerWidth < 900) { const r = c.getBoundingClientRect(); ov.el.scrollBy({ top: r.top - 64, behavior: reduced() ? 'auto' : 'smooth' }); }
          (eq || cont).focus({ preventScroll: true });
        }, reduced() ? 0 : 420);
      };
      if (withChest) {
        stage = chestStage(item, { backdrop: opts.backdrop, title, meta: provenanceText(item, opts.source), reduced: reduced() });
        left.append(stage.el);
        stage.start();
        const tier = tierOf(item);
        const openAt = .3, hitAt = openAt + [.2, .32, .5, .8, 1.15, 1.6, 1.7, 1.9][tier] * (reduced() ? .3 : 1);
        setTimeout(() => {
          if (done) return;
          ctx.audio.sfx('chest');
          stage.open(openAt, hitAt);
          setTimeout(() => !done && ctx.audio.sfx('beam', { tier, lead: hitAt - openAt }), openAt * 1000);
          setTimeout(() => {
            if (done) return;
            stage.burst();
            ctx.audio.sfx('reveal', { tier });
            setTimeout(() => !done && showCard(), 140);
          }, hitAt * 1000);
        }, reduced() ? 60 : 380);
      } else {
        showCard();
      }
    });
  }

  ctx.services.cardReveal = (item, opts = {}) => {
    const source = opts.source || (item.shattered ? 'shattered' : isRelic(item) ? 'claimed' : 'drop');
    const stamps = [];
    if (source === 'claimed' && isRelic(item) && !item.shattered) stamps.push({ kind: 'claimed', text: 'Claimed' });
    const title = opts.title || (item.shattered ? { kick: 'Shattered', main: `${item.name}, in pieces` }
      : source === 'claimed' ? { kick: 'Claimed', main: item.unidentified ? 'A Storied relic' : item.name }
        : { kick: item.stamp === 'grudge-settled' ? 'Grudge settled' : 'Loot', main: item.unidentified ? 'Something with a story' : item.name });
    return cardOverlay(item, { ...opts, source, stamps: [...stamps, ...(opts.stamps || [])] }, { withChest: true, title });
  };
  ctx.services.cardInspect = (item, opts = {}) => cardOverlay(item, { ...opts, allowUnequip: true }, { withChest: false });
  ctx.services.cardPreview = (item, opts = {}) => cardOverlay(item, { ...opts, grey: true, picker: false }, { withChest: false });

  ctx.services.cardSlam = (item, { power, name, text } = {}) => new Promise(resolve => {
    const r = reduced();
    const ov = el('div', { class: 'ov-slam' + (r ? ' still' : ''), 'aria-live': 'assertive', 'data-r': item?.rarity || 'heirloom' });
    const pw = typeof power === 'string' ? POWERS[power] || null : power && typeof power === 'object' ? power : null;
    const title = name || pw?.name || (item ? item.name : 'Legend Surge');
    const words = text || pw?.text || '';
    const rays = el('div', 'slam-rays');
    const card = el('div', 'slam-card');
    for (const c of ['tl', 'tr', 'bl', 'br']) card.append(cornerCanvas(item?.rarity || 'heirloom', c));
    if (item) { const p = portraitCanvas(item, { size: 64 }); p.canvas.style.width = p.canvas.style.height = Math.min(256, Math.floor(innerWidth * .5 / 64) * 64 || 192) + 'px'; card.append(p.canvas); }
    card.append(el('p', 'slam-kick', 'Legend Surge'), el('h2', 'slam-name', esc(title)));
    if (item && title !== item.name) card.append(el('p', 'slam-item', esc(item.name)));
    if (words) card.append(el('p', 'slam-text', esc(words)));
    ov.append(rays, card);
    document.body.append(ov);
    ctx.audio.sfx('slam');
    setTimeout(() => { ov.classList.add('out'); }, r ? 900 : 1000);
    setTimeout(() => { ov.remove(); resolve(); }, r ? 1000 : 1250);
  });
}

