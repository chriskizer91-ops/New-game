// The world HUD (M3 spec §5.4): the 44 px bar (Menu, the place name with the "Next:" line, gold,
// the Hearth Clock: 8 Brand coals with uniqueBrands filled, plus the Waking), the 26 px bust strip
// (HP and MP bars that pulse under 30%; a tap opens Party), the save ember, and the laptop side
// panel (the party, "Next:", and a Nearby list of DOM buttons: the keyboard and screen-reader path).
// Exports:
//   createHud({ onMenu, onParty }) -> { top, busts, update(game, walk, next), saved(), destroy() }
//   createSidePanel({ onParty, onNearby }) -> { el, update(game, next), setNearby(items), destroy() }
//     items: [{ key, label, sub, kind }]   onNearby(key)
// Every string goes in through textContent.
// Owner: WP7.

import { MAPS } from '../../data/maps/index.js';
import { BRAND_TOTAL } from '../../data/world.js';
import { uniqueBrands } from '../../rules/gauntlet.js';
import { heroStats } from '../../rules/stats.js';
import { el } from '../lib/dom.js';
import { bustCanvas } from '../lib/art.js';

const shortName = (game, id) => { const h = game.party.roster[id]; if (!h) return id; return id === 'alondra' ? 'Alondra' : h.name.split(' ')[0]; };
const pct = (v, m) => (m ? Math.max(0, Math.min(100, (v / m) * 100)) : 0);

function vitals(game, id) {
  const h = game.party.roster[id];
  let d = { maxHp: h.hp || 1, maxMp: h.mp || 0 };
  try { d = heroStats(game, id); } catch { /* keep the fallback */ } // M4: the Codex pages' bonus included
  return { h, hp: Math.max(0, h.hp ?? d.maxHp), mp: Math.max(0, h.mp ?? d.maxMp), maxHp: d.maxHp, maxMp: d.maxMp };
}

function setText(node, text) { const t = String(text ?? ''); if (node.textContent !== t) node.textContent = t; }

export function createHud({ onMenu, onParty } = {}) {
  const top = el('header', { class: 'w-hud' });
  const menu = el('button', { type: 'button', class: 'w-menu', 'aria-label': 'Menu' });
  menu.append(el('span', { class: 'w-menu-ico', 'aria-hidden': 'true' }));
  menu.addEventListener('click', () => onMenu && onMenu());
  const where = el('div', 'w-where');
  const place = el('p', 'w-place'), next = el('p', 'w-next');
  where.append(place, next);
  const gold = el('span', { class: 'w-gold' });
  const coin = el('i', { class: 'coin', 'aria-hidden': 'true' }), goldN = el('b', 'w-gold-n');
  gold.append(coin, goldN);
  const clock = el('div', { class: 'w-clock', role: 'img' });
  const coals = el('span', { class: 'w-coals', 'aria-hidden': 'true' });
  for (let i = 0; i < BRAND_TOTAL; i++) coals.append(el('i', 'coal'));
  const wake = el('b', { class: 'w-wake', 'aria-hidden': 'true' });
  clock.append(coals, wake);
  const ember = el('i', { class: 'w-ember', 'aria-hidden': 'true' });
  top.append(menu, where, gold, clock, ember);

  const busts = el('div', { class: 'w-busts', role: 'group', 'aria-label': 'The party' });
  const slots = new Map();
  let gearKey = '';

  function buildBusts(game) {
    busts.replaceChildren();
    slots.clear();
    for (const id of game.party.active) {
      const b = el('button', { type: 'button', class: 'w-bust' });
      b.addEventListener('click', () => onParty && onParty(id));
      const art = bustCanvas(game, id, { size: 24, scale: 1 });
      art.classList.add('w-bust-art');
      const bars = el('span', 'w-bars');
      const nm = el('span', 'w-bust-nm'), hp = el('span', 'bar hp'), mp = el('span', 'bar mp');
      hp.append(el('i')); mp.append(el('i'));
      bars.append(nm, hp, mp);
      b.append(art, bars);
      busts.append(b);
      slots.set(id, { b, nm, hp, mp });
    }
  }

  let savedTimer = 0;
  return {
    top, busts,
    update(game, walk, nx) {
      if (!game) return;
      const map = walk && MAPS[walk.map];
      setText(place, map ? map.name : walk?.map || '');
      setText(next, nx ? `Next: ${nx.text}` : '');
      next.hidden = !nx;
      setText(goldN, game.gold ?? 0);
      gold.setAttribute('aria-label', `${game.gold ?? 0} gold`);
      const lit = Math.min(BRAND_TOTAL, uniqueBrands(game));
      [...coals.children].forEach((c, i) => c.classList.toggle('lit', i < lit));
      const w = game.progress?.waking || 0;
      setText(wake, `W${w}`);
      clock.setAttribute('aria-label', `Hearth Clock: ${lit} of ${BRAND_TOTAL} coals lit, Waking ${w}`);
      const gk = game.party.active.join(',') + '|' + game.party.active.map(id => Object.values(game.party.roster[id]?.gear || {}).join(',')).join('|');
      if (gk !== gearKey) { gearKey = gk; buildBusts(game); }
      for (const id of game.party.active) {
        const s = slots.get(id);
        if (!s) continue;
        const v = vitals(game, id);
        setText(s.nm, shortName(game, id));
        s.hp.style.setProperty('--p', pct(v.hp, v.maxHp) + '%');
        s.mp.style.setProperty('--p', pct(v.mp, v.maxMp) + '%');
        s.b.classList.toggle('low', v.hp > 0 && v.hp < v.maxHp * 0.3);
        s.b.classList.toggle('down', v.hp <= 0);
        s.b.setAttribute('aria-label', `${v.h.name}, level ${v.h.level}, ${v.hp} of ${v.maxHp} HP${v.maxMp ? `, ${v.mp} of ${v.maxMp} MP` : ''}. Open Party.`);
      }
    },
    // the save ember flickers when the game is written
    saved() {
      ember.classList.remove('on'); void ember.offsetWidth; ember.classList.add('on');
      clearTimeout(savedTimer); savedTimer = setTimeout(() => ember.classList.remove('on'), 900);
    },
    destroy() { clearTimeout(savedTimer); top.remove(); busts.remove(); },
  };
}

export function createSidePanel({ onParty, onNearby } = {}) {
  const side = el('aside', { class: 'w-side', 'aria-label': 'Party and nearby' });
  const partyH = el('h2', { class: 'label', text: 'The party' });
  const party = el('div', 'w-side-party');
  const nextH = el('h2', { class: 'label', text: 'Next' });
  const next = el('p', 'w-side-next');
  const nearH = el('h2', { class: 'label', text: 'Nearby' });
  const near = el('ul', { class: 'w-near', 'aria-label': 'Nearby' });
  const keys = el('p', { class: 'w-keys', text: 'Arrows or WASD walk · Z / Enter: A · Shift: run · M / Esc: menu · J: Journal' });
  side.append(partyH, party, nextH, next, nearH, near, keys);
  let partyKey = '', nearKey = '';
  return {
    el: side,
    update(game, nx) {
      setText(next, nx ? nx.text : 'Explore. The Journal keeps your quests.');
      const k = game.party.active.map(id => { const v = vitals(game, id); return `${id}:${v.hp}/${v.maxHp}:${v.mp}/${v.maxMp}:${v.h.level}:${Object.values(v.h.gear || {}).join(',')}`; }).join('|');
      if (k === partyKey) return;
      partyKey = k;
      party.replaceChildren();
      for (const id of game.party.active) {
        const v = vitals(game, id);
        const b = el('button', { type: 'button', class: 'w-side-hero' + (v.hp <= 0 ? ' down' : v.hp < v.maxHp * 0.3 ? ' low' : '') });
        b.setAttribute('aria-label', `${v.h.name}, level ${v.h.level}, ${v.hp} of ${v.maxHp} HP. Open Party.`);
        b.addEventListener('click', () => onParty && onParty(id));
        const art = bustCanvas(game, id, { size: 24, scale: 2 });
        const info = el('span', 'w-side-info');
        const nm = el('b'), lv = el('small'), hp = el('span', 'bar hp'), mp = el('span', 'bar mp'), nums = el('small', 'w-side-nums');
        nm.textContent = shortName(game, id); lv.textContent = ` Lv ${v.h.level}`;
        hp.append(el('i')); mp.append(el('i'));
        hp.style.setProperty('--p', pct(v.hp, v.maxHp) + '%'); mp.style.setProperty('--p', pct(v.mp, v.maxMp) + '%');
        nums.textContent = `${v.hp}/${v.maxHp} HP${v.maxMp ? ` · ${v.mp}/${v.maxMp} MP` : ''}`;
        const head = el('span', 'w-side-nm'); head.append(nm, lv);
        info.append(head, hp, mp, nums);
        b.append(art, info);
        party.append(b);
      }
    },
    setNearby(items) {
      const k = items.map(i => i.key + ':' + i.label + ':' + (i.sub || '')).join('|');
      if (k === nearKey) return;
      nearKey = k;
      near.replaceChildren();
      if (!items.length) { near.append(el('li', { class: 'w-near-none', text: 'Nothing close by.' })); return; }
      for (const it of items) {
        const li = el('li');
        const b = el('button', { type: 'button', class: `w-near-btn k-${it.kind || 'thing'}` });
        const t = el('b'); t.textContent = it.label;
        b.append(t);
        if (it.sub) { const s = el('small'); s.textContent = it.sub; b.append(s); }
        b.addEventListener('click', () => onNearby && onNearby(it.key));
        li.append(b);
        near.append(li);
      }
    },
    destroy() { side.remove(); },
  };
}
