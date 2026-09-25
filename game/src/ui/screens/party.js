// The party: hero tabs, the hero wearing their gear, stat tiles that count up, equipment slots,
// the bag filtered by slot with compare arrows, skills, Domains, and Hilda's reforge.
import { deriveHero, heroSkills, POWERS } from '../../rules/stats.js';
import { equip, unequip, reforge, reforgeCost, wearerOf } from '../../rules/party.js';
import { xpForLevel, xpToNext } from '../../rules/progression.js';
import { HEROES } from '../../data/heroes.js';
import { SKILLS } from '../../data/skills.js';
import { DOMAINS } from '../../data/domains.js';
import { CONSUMABLES } from '../../data/items.js';
import { RARITY_ORDER } from '../../art/index.js';
import { el, esc, button, fmt, sgn, modText, countTo, replay } from '../lib/dom.js';
import { heroSprite, gearOf, bustCanvas, iconCanvas, rarityColor, rarityName, tierOf, itemsById, SLOT_ORDER } from '../lib/art.js';
import { SLOT_NAME, ABIL, ABIL_NAME, mainStat, verdict, critText } from '../lib/items.js';
import { isReduced } from '../lib/anim.js';
import { screenNav } from '../lib/keys.js';

const short = h => (h.id === 'alondra' ? 'Alondra' : h.name.split(' ')[0]);
const TARGET = { enemy: 'one foe', 'all-enemies': 'every foe', ally: 'one ally', 'ally-ko': 'a fallen ally', 'all-allies': 'the whole party', self: 'self' };
const mod = s => Math.floor((s - 10) / 2);

function tilesOf(d) {
  return [
    ['hit', 'Attack', '+' + d.weapon.hit, d.weapon.hit, `crit on ${critText(21 - d.critRange)}`],
    ['dmg', 'Damage', fmt(d.weapon.avg), d.weapon.avg, `${d.weapon.dice}${d.weapon.flat ? ` ${d.weapon.flat > 0 ? '+' : '−'}${Math.abs(d.weapon.flat)}` : ''}`],
    ['guard', 'Guard', String(d.guard), d.guard, d.armorType === 'none' ? 'no armour' : d.armorType],
    ['hp', 'HP', String(d.maxHp), d.maxHp, 'max'],
    ['mp', 'MP', String(d.maxMp), d.maxMp, 'max'],
    ['speed', 'Speed', String(d.speed), d.speed, 'turn order'],
  ];
}

export function mount(root, ctx, params = {}) {
  if (!ctx.game) { ctx.go('title'); return {}; }
  const S = { hero: params.hero || 'warden', slot: 'weapon', prev: {} };
  if (!ctx.game.party.roster[S.hero]) S.hero = ctx.game.party.active[0];

  const top = el('header', 'topbar');
  top.append(button('‹ Road', 'btn ghost back', () => { ctx.audio.sfx('back'); ctx.go('road'); }), el('div', 'tb-title', '<span class="realm">The Party</span><h1 class="title-display">Arms &amp; the Four</h1>'), el('span', 'tb-gold', ''));
  const tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Party members' });
  const panel = el('div', { class: 'party-grid', role: 'tabpanel' });
  root.append(top, tabs, panel);
  let sprite = null;

  function renderTabs() {
    const game = ctx.game;
    tabs.replaceChildren();
    top.querySelector('.tb-gold').innerHTML = `<i class="coin"></i>${game.gold}`;
    game.party.active.forEach((id, i) => {
      const h = game.party.roster[id], d = deriveHero(h, game.inventory);
      const b = el('button', { type: 'button', class: 'tab', role: 'tab', 'aria-selected': String(id === S.hero), 'data-pick': String(i + 1), id: 'tab-' + id });
      b.append(bustCanvas(game, id, { size: 24, scale: 2 }), el('span', 'nm', esc(short(h))), el('span', 'hp', `<i style="width:${Math.max(0, Math.min(100, h.hp / d.maxHp * 100))}%"></i>`));
      b.addEventListener('click', () => { if (S.hero === id) return; S.hero = id; ctx.audio.sfx('select'); render(); });
      tabs.append(b);
    });
  }

  function render(anim) {
    const game = ctx.game, h = game.party.roster[S.hero], data = HEROES[S.hero];
    const d = deriveHero(h, game.inventory);
    renderTabs();
    panel.replaceChildren();
    // ---- the hero ----
    const hp = el('section', 'hero-panel panel');
    const view = el('div', 'hero-view big');
    sprite = heroSprite(game, S.hero, { scale: innerWidth < 420 ? 3 : 4 });
    view.append(sprite.canvas);
    const need = xpToNext(h.level), into = h.xp - xpForLevel(h.level);
    hp.append(view, el('div', 'hero-id', `<h2>${esc(h.name)}</h2><p>${esc(data.title || '')} · ${esc(data.role)}</p><p class="lvl">Level ${h.level} · <span class="xpbar"><i style="width:${need === Infinity ? 100 : Math.min(100, into / need * 100)}%"></i></span> ${need === Infinity ? 'max' : `${into}/${need} XP`}</p>`));
    const vit = el('p', 'vitals', `<span class="bar hp" style="--p:${Math.min(100, h.hp / d.maxHp * 100)}%"><i></i></span> ${h.hp}/${d.maxHp} HP &nbsp; <span class="bar mp" style="--p:${d.maxMp ? Math.min(100, h.mp / d.maxMp * 100) : 0}%"><i></i></span> ${h.mp}/${d.maxMp} MP`);
    hp.append(vit);
    const der = el('div', 'derived');
    const prev = anim && S.prev[S.hero];
    for (const [k, lab, txt, val, sub] of tilesOf(d)) {
      const t = el('div', 'stat', `<span class="k">${lab}</span><span class="v">${txt}</span><span class="s">${esc(sub)}</span>`);
      t.dataset.k = k;
      der.append(t);
      const was = prev?.[k];
      if (prev && was !== undefined && Math.abs(was - val) > .001) {
        const up = val > was;
        t.classList.add(up ? 'up' : 'down');
        countTo(t.querySelector('.v'), was, val, { reduced: isReduced(), format: v => (k === 'hit' ? '+' : '') + fmt(k === 'dmg' ? v : Math.round(v)) });
        const fl = el('span', `fl ${up ? 'up' : 'down'}`, sgn(val - was)); t.append(fl); replay(fl, 'go');
        setTimeout(() => t.classList.remove('up', 'down'), 2200);
      }
    }
    hp.append(der);
    const ab = el('div', 'abil');
    for (const a of ABIL) {
      const base = h.base[a], tot = d.abilities[a];
      ab.append(el('div', 'stat', `<span class="k" title="${ABIL_NAME[a]}">${a}</span><span class="v">${tot}</span><span class="s">${modText(mod(tot))}${tot !== base ? ` <em>(${base}${modText(tot - base)})</em>` : ''}</span>`));
    }
    hp.append(ab);
    S.prev[S.hero] = Object.fromEntries(tilesOf(d).map(t => [t[0], t[3]]));

    // ---- equipment ----
    const gp = el('section', 'gear-panel panel');
    gp.append(el('h2', 'label', 'Equipment · tap a slot'));
    const slots = el('div', 'slots');
    const by = itemsById(game), gear = gearOf(game, S.hero);
    const twoHanded = gear.weapon && d.weapon.twoHanded;
    for (const s of SLOT_ORDER) {
      const it = gear[s];
      const b = el('button', { type: 'button', class: 'slot', 'aria-pressed': String(S.slot === s), 'data-s': s, 'aria-label': `${SLOT_NAME[s]}: ${it ? it.name : 'empty'}` });
      if (it) { b.append(iconCanvas(it, 3)); const gm = el('span', 'gem'); gm.style.background = rarityColor(it.rarity); b.append(gm); }
      else b.append(el('span', 'empty-ic', ''));
      b.append(el('span', 'sl', SLOT_NAME[s]));
      if (anim === s) b.classList.add('pop');
      b.addEventListener('click', () => { S.slot = s; ctx.audio.sfx('select'); render(); });
      slots.append(b);
    }
    gp.append(slots);
    // the selected slot
    const det = el('div', 'slot-detail');
    const cur = gear[S.slot];
    if (cur) {
      const ms = mainStat(cur);
      const row = el('div', 'cur-item');
      row.append(iconCanvas(cur, 3), el('div', 'ci-txt', `<b>${esc(cur.name)}</b><span class="r" style="color:${rarityColor(cur.rarity)}">${esc(rarityName(cur.rarity))}</span><span class="s">${esc(ms.k)}: ${ms.v.replace(/<[^>]+>/g, '')}</span>`));
      const acts = el('div', 'ci-acts');
      acts.append(button('See card', 'btn', async () => { ctx.audio.sfx('page'); await ctx.services.cardInspect(cur, { heroId: S.hero }); render(); }));
      acts.append(button('Take off', 'btn ghost', () => { ctx.setGame(unequip(ctx.game, S.hero, S.slot)); ctx.audio.sfx('back'); render(true); }));
      det.append(row, acts);
    } else {
      det.append(el('p', 'empty-note', S.slot === 'offhand' && twoHanded ? `Both hands are on ${esc(d.weapon.name)}.` : `Nothing in ${esc(short(game.party.roster[S.hero]))}’s ${SLOT_NAME[S.slot].toLowerCase()} slot.`));
    }
    // the bag for this slot
    const bagItems = game.inventory.filter(i => i.slot === S.slot && gear[S.slot]?.uid !== i.uid)
      // gear another hero wears only shows here if this hero could take it
      .filter(i => { const w = wearerOf(game, i.uid); return !w || verdict(game, S.hero, i).cls !== 'cant'; })
      .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || (b.ilvl || 0) - (a.ilvl || 0));
    det.append(el('h3', 'label', `In the bag · ${SLOT_NAME[S.slot]} · ${bagItems.length}`));
    if (!bagItems.length) det.append(el('p', 'empty-note', 'Nothing spare for this slot. Better gear is walking around out there in someone else’s hands.'));
    const list = el('ul', 'inv-list');
    for (const it of bagItems) {
      const v = it.unidentified ? { cls: '', text: 'Unidentified' } : verdict(game, S.hero, it);
      const w = wearerOf(game, it.uid);
      const li = el('li', `inv ${v.cls}`);
      const open = el('button', { type: 'button', class: 'inv-open', 'aria-label': `${it.name}: see the card` });
      open.append(iconCanvas(it, 2), el('span', 'inv-txt', `<b style="color:${rarityColor(it.rarity)}">${esc(it.unidentified ? 'Unidentified ' + it.kind : it.name)}</b><small>${esc(rarityName(it.rarity))}${it.shattered ? ' · shattered' : ''}${w ? ` · on ${esc(short(game.party.roster[w.heroId]))}` : ''}</small>`), el('span', `vd ${v.cls}`, esc(v.text)));
      open.addEventListener('click', async () => { ctx.audio.sfx('page'); await ctx.services.cardInspect(it, { heroId: S.hero }); render(true); });
      li.append(open);
      if (v.cls !== 'cant' && !it.shattered && !it.unidentified) {
        li.append(button('Equip', 'btn eq-quick', () => {
          const r = equip(ctx.game, S.hero, it.uid);
          if (!r.ok) { ctx.audio.sfx('error'); ctx.toast(r.reason); return; }
          ctx.setGame(r.game); ctx.audio.sfx('equip', { tier: tierOf(it) });
          render(S.slot); if (sprite) sprite.flash(it.rarity);
        }, { 'aria-label': `Equip ${it.name} on ${h.name}` }));
      }
      list.append(li);
    }
    det.append(list);
    gp.append(det);

    // ---- skills and powers ----
    const sk = el('section', 'skills-panel panel');
    sk.append(el('h2', 'label', 'Skills'));
    const ul = el('ul', 'skill-list');
    for (const id of heroSkills(h, d)) {
      const s = SKILLS[id]; if (!s) continue;
      const art = d.grants.includes(id);
      ul.append(el('li', art ? 'art' : '', `<b>${esc(s.name)}</b><span class="mp">${s.mp} MP</span><small>${art ? 'Relic Art · ' : ''}${esc(DOMAINS[s.domain]?.name.split(' ')[0] || s.domain)} · ${esc(TARGET[s.target] || s.target)}</small><p>${esc(s.text)}</p>`));
    }
    const upcoming = data.skills.filter(s => s.level > h.level);
    for (const u of upcoming.slice(0, 2)) { const s = SKILLS[u.id]; if (s) ul.append(el('li', 'locked', `<b>${esc(s.name)}</b><span class="mp">Lv ${u.level}</span><p>${esc(s.text)}</p>`)); }
    sk.append(ul);
    const surge = d.powers[0] ? POWERS[d.powers[0].power] : POWERS['heroic-strike'];
    if (surge) sk.append(el('div', 'surge-box', `<span class="label">Legend Surge · ${d.powers[0] ? esc(by[d.powers[0].uid]?.name || '') : 'no relic power yet'}</span><b>${esc(surge.name)}</b><p>${esc(surge.text)}</p>`));
    for (const sb of d.setBonuses) sk.append(el('div', 'set-box', `<span class="label">Set · Thornwatch (${sb.n})</span><p>${esc(sb.text)}</p>`));
    for (const tr of data.traits || []) sk.append(el('div', 'trait-box', `<span class="label">Trait · ${esc(tr.name)}</span><p>${esc(tr.text)}</p>`));

    // ---- Domains ----
    const dm = el('section', 'domains-panel panel');
    dm.append(el('h2', 'label', `Accretion Domains · Imprint Bonus +${d.ib} · Imprint DC ${d.dc}`));
    const dl = el('ul', 'domain-list');
    for (const [id, v] of Object.entries(h.domains || {})) {
      const D = DOMAINS[id]; if (!D) continue;
      dl.append(el('li', id === data.domain ? 'primary' : '', `<b>${esc(D.name)}</b><span class="dl">Lv ${v.level}<i style="width:${v.level / 20 * 100}%"></i></span><small>${esc(D.ability)}${id === data.domain ? ' · primary' : ''}${v.path ? ' · ' + esc(v.path) : D.paths.length ? ' · path at level 3' : ''}</small>`));
    }
    dm.append(dl, el('p', 'small', 'Domains rise with level. Paths, specialisations and master techniques open in a later chapter.'));

    // ---- forge and bag ----
    const fg = el('section', 'forge-panel panel');
    fg.append(el('h2', 'label', 'Hilda’s forge · reforge a shattered relic'));
    const broken = game.inventory.filter(i => i.shattered);
    if (!broken.length) fg.append(el('p', 'small', 'Nothing broken. Kill a holder before you pry its relic loose and it shatters; Hilda can put it back together, for a price.'));
    for (const it of broken) {
      const cost = reforgeCost(it);
      const row = el('div', 'forge-row');
      row.append(iconCanvas(it, 2), el('span', 'ft', `<b>${esc(it.name)}</b><small>Shattered · ${cost} gold</small>`));
      const b = button(`Reforge · ${cost}g`, 'btn primary', () => {
        const r = reforge(ctx.game, it.uid);
        if (!r.ok) { ctx.audio.sfx('error'); ctx.toast(r.reason); return; }
        ctx.setGame(r.game); ctx.audio.sfx('reveal', { tier: tierOf(it) }); ctx.toast(`${it.name} is whole again.`); render();
      });
      b.disabled = game.gold < cost;
      row.append(b);
      fg.append(row);
    }
    const bag = Object.entries(game.bag || {}).filter(([, n]) => n > 0);
    fg.append(el('h2', 'label bag-l', 'The bag'));
    fg.append(bag.length ? el('ul', 'bag-list', bag.map(([id, n]) => `<li><b>${esc(CONSUMABLES[id]?.name || id)}</b> ×${n}<small>${esc(CONSUMABLES[id]?.text || '')}</small></li>`).join('')) : el('p', 'small', 'Empty. Foes drop tonics now and then.'));

    const colA = el('div', 'pcol a'), colB = el('div', 'pcol b');
    colA.append(hp, sk);
    colB.append(gp, dm, fg);
    panel.append(colA, colB);
    if (anim && anim !== true && sprite) sprite.flash(gear[anim]?.rarity || 'wrought');
  }

  render();
  if (!ctx.audio.track || ctx.audio.track === 'victory') ctx.audio.music('road');
  const nav = screenNav(root, {
    back: () => ctx.go('road'),
    menu: () => ctx.go('road'),
    pick: n => { const id = ctx.game.party.active[n - 1]; if (id) { S.hero = id; render(); return true; } return false; },
  });
  return { onAction: nav };
}
