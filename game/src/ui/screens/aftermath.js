// After a battle: resolve it once, then XP and level-ups, gold, one chest per drop (each opens
// the card reveal), consumables, Grudges and Brands. A wipe wakes you at the Hearthfire.
// mount(root, ctx, { battle, returnTo = 'world' }). On leaving it calls
//   ctx.go(returnTo, { result, brand, wokeAt, yield, rematch, enc })
// (M3 spec §5.5): result 'victory'|'defeat'|'fled'; brand = report.brand or null; wokeAt = the
// Hearthfire id a wipe woke you at (HEARTHS in data/world.js), else null; yield = a duel defeat
// (Tamsin: no gold lost, no Grudge); rematch = a Brand fight won again; enc = the encounter id.
// Owner: WP8.
import { resolveBattle } from '../../rules/gauntlet.js';
import { xpForLevel, xpToNext } from '../../rules/progression.js';
import { diceIcon } from '../../art/index.js';
import { SKILLS } from '../../data/skills.js';
import { CONSUMABLES } from '../../data/items.js';
import { ENCOUNTERS, BRANDS } from '../../data/encounters.js';
import { HEARTHS } from '../../data/world.js';
import { MAPS } from '../../data/maps/index.js';
import { OMENS } from '../../data/omens.js';
import { el, esc, button, toCanvas, sleep, countTo, plural } from '../lib/dom.js';
import { isReduced } from '../lib/anim.js';
import { bustCanvas, chestImage, iconCanvas, rarityColor, rarityName, tierOf } from '../lib/art.js';
import { isRelic, ABIL_NAME } from '../lib/items.js';
import { screenNav } from '../lib/keys.js';

// A battle object resolves exactly once, even if this screen is mounted again for it.
const RESOLVED = new WeakMap();

const pctOf = h => { const base = xpForLevel(h.level), need = xpToNext(h.level); return need === Infinity ? 100 : Math.max(0, Math.min(100, (h.xp - base) / need * 100)); };
const short = h => (h.id === 'alondra' ? 'Alondra' : h.name.split(' ')[0]);

export function mount(root, ctx, params = {}) {
  const { battle, returnTo = 'world' } = params;
  if (!battle || !ctx.game) { ctx.go(ctx.game ? 'world' : 'title'); return {}; }
  let R = RESOLVED.get(battle);
  if (!R) {
    const before = ctx.game;
    try {
      const { game, report } = resolveBattle(before, battle);
      R = { before, report };
      RESOLVED.set(battle, R);
      ctx.setGame(game);
    } catch (err) {
      console.error(err);
      root.append(el('p', 'panel', 'That battle never finished. Back to the Wilds.'));
      setTimeout(() => ctx.go('world'), 900);
      return {};
    }
  }
  const { before, report } = R;
  const game = ctx.game;
  const foes = battle.order.map(id => battle.units[id]).filter(u => u.side === 'foe' && !u.summonedBy);
  const names = [...new Set(foes.map(f => f.name))];
  const patrol = !!battle.ctx?.patrol;
  const res = report.result;
  const yielded = res === 'defeat' && !!report.yield;
  const enc = battle.ctx?.nodeId || null;
  const next = () => {
    ctx.audio.sfx('confirm');
    ctx.go(returnTo, { result: res, brand: report.brand || null, wokeAt: report.wokeAt || null, yield: yielded, rematch: !!report.rematch, enc });
  };

  const head = el('header', `af-head af-${res}`);
  const wrap = el('div', 'af-body');
  root.append(head, wrap);

  if (res === 'victory') {
    ctx.audio.music('victory'); // the battle screen already played the victory sting
    const main = foes.length === 1 ? `${foes[0].name} falls.` : patrol ? 'The pack is scattered.' : 'The way is clear.';
    head.innerHTML = `<p class="kick">Victory</p><h1 class="title-display">${esc(main)}</h1><p class="meta">${esc(names.join(' · '))} · ${plural(Math.max(1, Math.round(report.rounds || 1)), 'round')}</p>`;
  } else if (yielded) {
    // a duel lost is a yield (M3 spec §3.5, D9): no gold lost, no Grudge, and the door opens anyway
    ctx.audio.music('hearth');
    const who = foes[0]?.name || 'Your rival';
    head.classList.add('af-yield');
    head.innerHTML = `<p class="kick">You yield</p><h1 class="title-display">${esc(who)} lowers her blade.</h1><p class="meta">${esc(names.join(' · '))} · Day ${game.progress.flags.day}</p>`;
    wrap.append(el('p', 'af-story panel', `${esc(who)} offers you a hand up and does not quite hide the grin. Nobody loses a coin, nobody holds a grudge, and the way she was guarding is open anyway. She will be waiting if you want the rematch.`));
  } else if (res === 'defeat') {
    ctx.audio.music('hearth');
    const hf = HEARTHS[report.wokeAt] || HEARTHS[game.progress.lastHearthfire] || null;
    const fire = hf ? hf.name : ENCOUNTERS[report.wokeAt]?.name || 'the last Hearthfire';
    const where = hf && MAPS[hf.map] ? MAPS[hf.map].name : null;
    head.innerHTML = `<p class="kick">The party falls</p><h1 class="title-display">You wake at the Hearthfire.</h1><p class="meta">${esc([fire, where, `Day ${game.progress.flags.day}`].filter(Boolean).join(' · '))}</p>`;
    wrap.append(el('p', 'af-story panel', `Someone dragged you all back to ${esc(fire.replace(/^The /, 'the '))}. Everyone is on their feet, and every piece of gear is where you left it. The purse is lighter, and the lesson stuck.`));
  } else {
    ctx.audio.music('road');
    head.innerHTML = `<p class="kick">Fled</p><h1 class="title-display">You got away.</h1><p class="meta">${esc(names.join(' · '))}</p>`;
    wrap.append(el('p', 'af-story panel', patrol ? 'You break for the trees and the pack loses interest before long. Nothing lost but a little pride.' : 'You break for the trees and nobody follows far. Whoever was holding the way will remember your back.'));
  }

  // ---- gold ----
  if (report.gold || report.goldLost) {
    const g = el('section', 'af-gold panel');
    if (report.gold) {
      const v = el('b', 'num', '0');
      g.append(el('span', 'coin-big', ''), el('span', 'gl', 'Gold'), v, el('span', 'tot', `Purse: ${game.gold}`));
      countTo(v, 0, report.gold, { reduced: isReduced(), format: n => '+' + Math.round(n) });
      setTimeout(() => ctx.audio.sfx('coin'), 300);
    } else {
      g.classList.add('lost');
      g.append(el('span', 'coin-big', ''), el('span', 'gl', 'Gold lost in the scramble (10%)'), el('b', 'num', `−${report.goldLost}`), el('span', 'tot', `Purse: ${game.gold}`));
    }
    wrap.append(g);
  }

  // ---- XP and level-ups ----
  if (report.xp) {
    const xs = el('section', 'af-xp panel');
    xs.append(el('h2', 'label', res === 'defeat' ? `A hard lesson is still a lesson · +${report.xp} XP each` : `Experience · +${report.xp} XP each`));
    const list = el('div', 'xp-list');
    game.party.active.forEach((id, i) => {
      const b = before.party.roster[id], a = game.party.roster[id];
      const row = el('div', 'xp-row');
      const lv = el('span', 'lv', `Lv ${b.level}`);
      const bar = el('span', 'xpbar', '<i></i>');
      const fill = bar.firstChild;
      row.append(bustCanvas(game, id, { size: 24, scale: 2 }), el('span', 'nm', esc(short(a))), lv, bar, el('span', 'xpn', `${a.xp} XP`));
      list.append(row);
      const gained = a.level - b.level, p0 = pctOf(b), p1 = pctOf(a);
      fill.style.width = p0 + '%';
      if (isReduced()) { fill.style.width = p1 + '%'; lv.textContent = `Lv ${a.level}`; if (gained) row.classList.add('leveled'); return; }
      setTimeout(() => {
        const t0 = performance.now(), dur = 900 + gained * 500, end = gained * 100 + p1;
        let shown = b.level;
        const step = () => {
          if (!fill.isConnected) return;
          const u = Math.min(1, (performance.now() - t0) / dur), e = 1 - (1 - u) ** 3, v = p0 + (end - p0) * e;
          const lvNow = b.level + Math.min(gained, Math.floor(v / 100));
          if (lvNow > shown) { shown = lvNow; lv.textContent = `Lv ${lvNow}`; row.classList.add('leveled'); ctx.audio.sfx('levelup'); }
          fill.style.width = (u >= 1 ? p1 : v % 100) + '%';
          if (u < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, 250 + i * 120);
    });
    xs.append(list);
    wrap.append(xs);
  }
  const ups = Object.entries(report.levelUps || {});
  if (ups.length) {
    const ls = el('section', 'af-levels');
    for (const [id, gains] of ups) {
      const h = game.party.roster[id], first = gains[0].level - 1, last = gains[gains.length - 1].level;
      const c = el('article', 'lvl-card panel');
      c.append(el('p', 'kick', gains.length > 1 ? `Level up ×${gains.length}` : 'Level up'), el('h3', '', `${esc(short(h))} reaches level ${last}`));
      if (gains.length > 1) c.append(el('p', 'lvl-from', `Level ${first} → ${last}`));
      for (const gn of gains) {
        const die = el('div', 'hp-roll');
        die.append(toCanvas(diceIcon(gn.hpRoll.sides, { value: gn.hpRoll.rolled, size: 20, mat: 'bone' }), null, 2));
        const floor = gn.hpRoll.value > gn.hpRoll.rolled ? ` (counts as ${gn.hpRoll.value}: a bad roll never ruins a level)` : '';
        const st = Object.entries(gn.stats || {});
        die.append(el('p', '', `${gains.length > 1 ? `<span class="lv-n">Lv ${gn.level}</span> ` : ''}Rolled <b>${gn.hpRoll.rolled}</b> on the d${gn.hpRoll.sides} hit die${esc(floor)}. <b class="up">+${gn.hp} HP</b>${gn.mp ? `, <b class="mp">+${gn.mp} MP</b>` : ''}.${st.length ? ` <b class="up">${st.map(([k, v]) => `+${v} ${ABIL_NAME[k]}`).join(', ')}</b>.` : ''}`));
        c.append(die);
      }
      for (const gn of gains) for (const sk of gn.skills || []) { const S = SKILLS[sk]; if (S) c.append(el('p', 'new-skill', `<b>New skill · ${esc(S.name)}</b> ${esc(S.text)} <span>${S.mp} MP</span>`)); }
      ls.append(c);
    }
    wrap.append(ls);
  }

  // ---- Grudges ----
  if (report.grudgeSettled) wrap.append(el('section', 'af-grudge settled panel', `<p class="kick">Grudge settled</p><p><b>${esc(report.grudgeSettled)}</b> will not be telling that story any more. Their gear paid out one rarity higher, with a bonus piece on top.</p>`));
  if (report.grudge) {
    const G = report.grudge;
    const om = (G.omens || []).map(o => OMENS[o]?.name || o).join(', ');
    wrap.append(el('section', 'af-grudge panel', `<p class="kick">${res === 'fled' ? 'They will remember' : 'A Grudge is born'}</p><p><b>${esc(G.name)}</b>. ${res === 'fled' ? 'You ran, and the story is already going round.' : 'They beat you, and they will be waiting.'}${om ? ` They carry ${esc(om)} now.` : ''}</p><p class="small">Beat them later for a better prize: every piece they drop comes one rarity higher, plus a bonus item.</p>`));
  }

  // ---- loot ----
  const items = [...(report.claimed || []), ...(report.drops || [])];
  const chests = [];
  if (res === 'victory' && items.length) {
    const ls = el('section', 'af-loot panel');
    ls.append(el('h2', 'label', `The spoils · ${plural(items.length, 'chest')}`));
    const row = el('div', 'chest-row');
    items.forEach((item0, i) => {
      const b = el('button', { type: 'button', class: 'chest', 'data-pick': String(i + 1), 'aria-label': `Open chest ${i + 1}, from ${item0.provenance?.from || 'the fight'}` });
      const cv = toCanvas(chestImage(false), null, 2);
      b.append(el('span', 'ch-art', [cv]), el('span', 'ch-from', esc(item0.provenance?.from || 'The fight')));
      const st = { opened: false, item: item0 };
      const source = item0.shattered ? 'shattered' : isRelic(item0) ? 'claimed' : 'drop';
      b.addEventListener('click', async () => {
        const live = ctx.game.inventory.find(x => x.uid === st.item.uid) || st.item;
        if (st.opened) { ctx.audio.sfx('page'); await ctx.services.cardInspect(live, {}); refresh(); return; }
        st.opened = true;
        b.classList.add('opened');
        b.replaceChildren(el('span', 'ch-art', [toCanvas(chestImage(true, live.rarity), null, 2)]), el('span', 'ch-from', 'Opening…'));
        await ctx.services.cardReveal(live, { source, backdrop: battle.ctx?.backdrop || 'hearth-road' });
        refresh();
      });
      const refresh = () => {
        const live = ctx.game.inventory.find(x => x.uid === st.item.uid) || st.item;
        st.item = live;
        const art = el('span', 'ch-art');
        art.append(toCanvas(chestImage(true, live.rarity), null, 2));
        const ic = iconCanvas(live, 2); ic.classList.add('ch-icon'); art.append(ic);
        b.replaceChildren(art, el('span', 'ch-name', `<b style="color:${rarityColor(live.rarity)}">${esc(live.unidentified ? 'Unidentified' : live.name)}</b><small>${esc(rarityName(live.rarity))}${live.shattered ? ' · shattered' : ''}</small>`));
        b.setAttribute('aria-label', `${live.name}: see the card again`);
        updateCta();
      };
      chests.push({ b, st, tier: tierOf(item0) });
      row.append(b);
    });
    ls.append(row);
    const bag = Object.entries(report.consumables || {});
    if (bag.length) ls.append(el('p', 'af-bag', `Also found: ${bag.map(([id, n]) => `<b>${esc(CONSUMABLES[id]?.name || id)}</b> ×${n}`).join(', ')}.`));
    wrap.append(ls);
  } else if (res === 'victory') {
    const bag = Object.entries(report.consumables || {});
    wrap.append(el('p', 'af-empty panel', bag.length ? `Nothing worth carrying but ${bag.map(([id, n]) => `${esc(CONSUMABLES[id]?.name || id)} ×${n}`).join(', ')}.` : 'Nothing worth carrying this time. Their gear was worse than yours.'));
  }

  // ---- the Brand (or a rematch for one already held) ----
  if (report.brand) {
    const B = report.brand;
    wrap.append(el('section', 'af-brand', `<p class="kick">Brand earned</p><h2 class="title-display">${esc(B.name)}</h2><p>${esc(B.text)}</p><p class="waking"><b>The Waking rises to ${Number(B.waking) || game.progress.waking}.</b> Every foe in the Wilds re-arms: higher levels, better gear, Omens on the elites, and better loot in their hands. Rabble that know they are beaten will run from you.</p>`));
    setTimeout(() => ctx.audio.sfx('legend'), 600);
  } else if (report.rematch) {
    const B = BRANDS[ENCOUNTERS[enc]?.brand];
    wrap.append(el('section', 'af-brand af-rematch', `<p class="kick">A rematch</p><h2 class="title-display">${esc(B ? B.name : 'The Brand')} is already yours</h2><p class="waking">No new coal, so the Waking holds at ${game.progress.waking}. The Wilds remember the first time, and so does everything in them.</p>`));
  }

  // ---- the way out ----
  const foot = el('div', 'af-foot');
  const cta = button('', 'btn primary big', () => {
    const closed = chests.find(c => !c.st.opened);
    if (closed) closed.b.click(); else next();
  }, { 'data-primary': '' });
  const skip = button('Back to the Wilds', 'btn ghost', next);
  foot.append(cta, skip);
  wrap.append(foot);
  function updateCta() {
    const left = chests.filter(c => !c.st.opened).length;
    cta.textContent = left ? (left === chests.length ? 'Open the chests' : `Open the next chest (${left} left)`) : report.brand ? 'Walk on' : res === 'defeat' ? 'Get back up' : 'Back to the Wilds';
    skip.hidden = !left;
  }
  updateCta();
  // the big news first: a Brand, then the purse and XP, the chests, then the level-ups
  for (const sel of ['.af-story', '.af-brand', '.af-gold', '.af-xp', '.af-grudge.settled', '.af-loot', '.af-empty', '.af-levels', '.af-grudge:not(.settled)', '.af-foot']) {
    wrap.querySelectorAll(':scope > ' + sel).forEach(n => wrap.append(n));
  }
  sleep(0).then(() => { if (res === 'victory' && chests.length) cta.focus({ preventScroll: true }); });

  return { onAction: screenNav(root, { back: next, pick: n => { const c = chests[n - 1]; if (c) { c.b.click(); return true; } return false; } }) };
}
