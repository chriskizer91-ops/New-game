// The road: the Gauntlet as a path of nodes, the party on it, and what to do where you stand.
import { renderBackdrop, renderHero, renderFoe, FOE_ART, diceIcon, statusIcon, INTENT_DIE, itemIcon } from '../../art/index.js';
import { route, currentNode, canAdvance, advance, rest, startBattle, spawnsFor } from '../../rules/gauntlet.js';
import { deriveHero } from '../../rules/stats.js';
import { relicItem } from '../../rules/loot.js';
import { createRng } from '../../core/rng.js';
import { FOES } from '../../data/foes.js';
import { OMENS } from '../../data/omens.js';
import { ENCOUNTERS, BRANDS } from '../../data/encounters.js';
import { el, esc, button, toCanvas } from '../lib/dom.js';
import { animate, isReduced } from '../lib/anim.js';
import { gearOf, customOf, bustCanvas } from '../lib/art.js';
import { screenNav } from '../lib/keys.js';

const REST_LINES = [
  'Pip is asleep before the kettle boils. Bryn reads the firewood. Alondra keeps the watch she always keeps.',
  'The coal from the Keep takes to the kindling like it missed you. Everyone is whole by morning.',
  'Somebody burns the porridge. Nobody complains. The road can wait until dawn.',
  'Bryn swears the embers spell something. Alondra says they spell “sleep”. Alondra wins.',
  'You sharpen what needs sharpening and mend what needs mending. The fire does the rest.',
];
const TIER_WORD = { rabble: 'Rabble', veteran: 'Veteran', 'relic-bearer': 'Relic-Bearer', champion: 'Champion' };

// What a node holds: its kind, foes, and the relics you can see on them.
export function nodeInfo(game, id) {
  const n = ENCOUNTERS[id];
  const spawns = n.spawns ? spawnsFor(game, id) : [];
  const tiers = spawns.map(s => FOES[s.family].tier);
  const kind = n.type === 'hearthfire' ? 'hearthfire' : tiers.includes('champion') ? 'champion' : tiers.includes('relic-bearer') ? 'relic-bearer' : 'fight';
  const grudges = game.progress.flags.grudges || {};
  const nameOf = s => (s.grudge && grudges[s.grudge]?.name) || s.name || FOES[s.family].name;
  const relics = [];
  for (const s of spawns) {
    for (const h of s.held || []) {
      if (h.relic) relics.push({ relic: h.relic, holder: nameOf(s) });
      else if (h.item) relics.push({ item: h.item, holder: nameOf(s), echo: true });
    }
    if (s.wears) relics.push({ relic: s.wears, holder: nameOf(s), worn: true });
  }
  const top = spawns.reduce((b, s) => (['rabble', 'veteran', 'relic-bearer', 'champion'].indexOf(FOES[s.family].tier) > ['rabble', 'veteran', 'relic-bearer', 'champion'].indexOf(b) ? FOES[s.family].tier : b), 'rabble');
  return { node: n, spawns, kind, relics, nameOf, top };
}

export function previewItem(game, r, place) {
  if (r.item) return r.item;
  return relicItem(r.relic, createRng('preview-' + r.relic), { from: r.holder, where: place, day: game.progress.flags.day });
}

export function mount(root, ctx, params = {}) {
  const game0 = ctx.game;
  if (!game0) { ctx.go('title'); return {}; }
  let restLine = null;
  let brandMoment = params.brand || null;

  function render() {
    const game = ctx.game;
    root.replaceChildren();
    const node = currentNode(game);
    const info = nodeInfo(game, node.id);
    const cleared = canAdvance(game);
    const flags = game.progress.flags;
    ctx.audio.music(node.type === 'hearthfire' ? 'hearth' : 'road');

    // ---- header ----
    const head = el('header', 'road-top');
    const brands = game.progress.brands.map(b => BRANDS[b]?.name || b);
    head.append(
      el('div', 'where', `<span class="realm">The Gauntlet${game.progress.waking ? ` · Waking ${game.progress.waking}` : ''}</span><h1 class="title-display">${esc(node.name)}</h1><p class="sub">${esc(node.place)} · Day ${flags.day}</p>`),
      el('div', 'purse', `<span class="gold" title="Gold"><i class="coin"></i>${game.gold}</span><span class="brands" title="${esc(brands.join(', ') || 'No Brands yet')}"><i class="brand-mark"></i>${brands.length} ${brands.length === 1 ? 'Brand' : 'Brands'}</span>`),
    );
    const menu = el('nav', { class: 'road-menu', 'aria-label': 'Menu' });
    menu.append(
      button('Party', 'btn', () => { ctx.audio.sfx('confirm'); ctx.go('party'); }),
      button('Codex', 'btn', () => { ctx.audio.sfx('confirm'); ctx.go('codex'); }),
      button('Settings', 'btn', () => { ctx.audio.sfx('confirm'); ctx.go('settings', { from: 'road' }); }),
    );
    head.append(menu);
    root.append(head);

    if (brandMoment) root.append(brandBanner(brandMoment, game, () => { brandMoment = null; render(); }));
    else if (game.progress.waking > 0 && !cleared && node.id === 'hearth-road' && !flags.cleared['hearth-road']) {
      root.append(el('p', 'waking-note', `The Waking stands at ${game.progress.waking}. Every foe on this road has re-armed: higher levels, better gear, new Omens, and better loot in their hands.`));
    }

    const grid = el('div', 'road-grid');
    const left = el('div', 'road-left'), right = el('div', 'road-right');
    grid.append(left, right);
    root.append(grid);

    // ---- party strip ----
    const strip = el('section', { class: 'party-strip', 'aria-label': 'The party' });
    for (const id of game.party.active) {
      const h = game.party.roster[id], d = deriveHero(h, game.inventory);
      const b = el('button', { type: 'button', class: 'ps-hero' + (h.hp <= 0 ? ' down' : ''), 'aria-label': `${h.name}, level ${h.level}, ${h.hp} of ${d.maxHp} HP` });
      b.append(bustCanvas(game, id, { size: 24, scale: 2 }));
      const hpPct = Math.max(0, Math.min(100, h.hp / d.maxHp * 100)), mpPct = d.maxMp ? Math.max(0, Math.min(100, h.mp / d.maxMp * 100)) : 0;
      b.append(el('span', 'ps-info', `<span class="nm">${esc(id === 'alondra' ? 'Alondra' : h.name.split(' ')[0])}</span><span class="bar hp" style="--p:${hpPct}%"><i></i></span><span class="bar mp" style="--p:${mpPct}%"><i></i></span><span class="nums"><small>Lv ${h.level}</small> ${h.hp}/${d.maxHp}</span>`));
      b.addEventListener('click', () => { ctx.audio.sfx('select'); ctx.go('party', { hero: id }); });
      strip.append(b);
    }
    left.append(strip);

    // ---- the scene where you stand ----
    const scene = el('section', { class: 'road-scene', 'data-kind': info.kind });
    const cv = el('canvas', { class: 'px', role: 'img', 'aria-label': sceneLabel(info, cleared) });
    scene.append(cv);
    left.append(scene);
    paintScene(cv, scene, game, info, cleared);

    // ---- what to do here ----
    const panel = el('section', 'node-panel panel');
    panel.append(el('p', 'node-text', esc(node.text)));
    if (node.type === 'fight' && !cleared) {
      const foes = el('ul', 'foe-list');
      for (const s of info.spawns) {
        const F = FOES[s.family];
        const omens = (s.omens || []).map(o => `<i class="omen" style="--c:${OMENS[o]?.color || '#999'}" title="${esc(OMENS[o]?.text || '')}">${esc(OMENS[o]?.name || o)}</i>`).join('');
        const die = INTENT_DIE[F.tier] || INTENT_DIE.rabble;
        const li = el('li', `tier-${F.tier}`);
        li.append(toCanvas(diceIcon(die.sides, { size: 20, mat: die.mat }), null, 1));
        li.append(el('span', 'fn', `<b>${esc(info.nameOf(s))}</b> <small>${esc(TIER_WORD[F.tier])} · Lv ${s.level}</small>${omens ? `<span class="omens">${omens}</span>` : ''}`));
        foes.append(li);
      }
      panel.append(foes);
      const gr = info.spawns.filter(s => s.grudge);
      if (gr.length) panel.append(el('p', 'grudge-note', `<b>Grudge.</b> ${esc(gr.map(s => info.nameOf(s)).join(', '))} beat you here once. Settle it: every piece they drop comes one rarity higher, plus a bonus item.`));
    }
    if (info.relics.length && !cleared) {
      const rl = el('div', 'relic-row');
      for (const r of info.relics) {
        const item = previewItem(game, r, node.place);
        const b = el('button', { type: 'button', class: 'glint-btn' + (r.echo ? ' echo' : ''), 'aria-label': `See the card: ${item.name}, held by ${r.holder}` });
        const ic = toCanvas(itemIcon(item), null, 2); ic.setAttribute('aria-hidden', 'true');
        b.append(el('span', 'gl', [ic]), el('span', 'gt', `<b>${esc(r.echo ? 'Echo · ' + item.name : item.name)}</b><small>${r.worn ? 'Worn' : 'Held'} by ${esc(r.holder)}</small>`));
        b.addEventListener('click', () => { ctx.audio.sfx('page'); ctx.services.cardPreview(item, { heldBy: r.holder }); });
        rl.append(b);
      }
      panel.append(el('p', 'label', 'Glinting on them'), rl);
    }
    if (restLine) panel.append(el('p', 'rest-line', `${esc(restLine)} <b>Saved.</b>`));

    const acts = el('div', 'node-acts');
    const nextId = nextNodeId(game);
    const full = game.party.active.every(id => { const h = game.party.roster[id]; const d = deriveHero(h, game.inventory); return h.hp >= d.maxHp && h.mp >= d.maxMp; });
    let primary = null;
    if (node.type === 'fight' && !cleared) {
      primary = button(info.kind === 'champion' ? 'Face the Champion' : 'Fight', 'btn primary big fight', () => fight(false));
      acts.append(primary);
    }
    if (node.type === 'hearthfire') {
      const r = button(restLine && full ? 'Rested and saved' : 'Rest at the Hearthfire', 'btn big rest', doRest);
      r.disabled = !!(restLine && full);
      acts.append(r);
      if (!full && !restLine) primary = r;
    }
    if (cleared && nextId) {
      const a = button(`Advance<small>${esc(ENCOUNTERS[nextId].name)}</small>`, 'btn big advance', doAdvance);
      acts.append(a);
      if (!primary) primary = a;
    }
    if (primary) { primary.classList.add('primary'); primary.setAttribute('data-primary', ''); }
    const pat = button('Patrol<small>Optional: a rabble patrol for XP, gold and loot</small>', 'btn big patrol', () => fight(true));
    acts.append(pat);
    panel.append(acts);
    left.append(panel);

    // ---- the route ----
    const rt = el('section', { class: 'route-box', 'aria-label': 'The Gauntlet route' });
    rt.append(el('h2', 'label', `The Gauntlet · ${route(game).filter(n => n.cleared && n.type === 'fight').length} of ${route(game).filter(n => n.type === 'fight' && !n.skipped).length} fights won`));
    const ol = el('ol', 'route');
    for (const n of route(game)) {
      const ni = nodeInfo(game, n.id);
      const state = n.current ? 'current' : n.skipped ? 'skipped' : (n.cleared && n.type === 'fight') || GAUNTLETIndex(game, n.id) < GAUNTLETIndex(game, node.id) ? 'cleared' : 'ahead';
      const li = el('li', { class: `rn is-${state} k-${ni.kind}`, 'aria-current': n.current ? 'location' : null });
      const mark = el('span', 'mark');
      if (ni.kind === 'hearthfire') mark.append(toCanvas(statusIcon('burning', { size: 12 }), null, 2));
      else { const d = INTENT_DIE[ni.top] || INTENT_DIE.rabble; mark.append(toCanvas(diceIcon(d.sides, { size: 20, mat: d.mat, state: state === 'cleared' ? 'dim' : '' }), null, 1)); }
      li.append(mark);
      const kindWord = { hearthfire: 'Hearthfire', champion: 'Champion', 'relic-bearer': 'Relic-Bearer', fight: 'Fight' }[ni.kind];
      li.append(el('div', 'rn-info', `<b>${esc(n.name)}</b><small>${esc(kindWord)}${n.level ? ` · Lv ${n.level}` : ''}${n.grudges.length ? ' · Grudge' : ''}</small>`));
      const unclaimed = ni.relics.filter(r => r.relic && !game.codex[r.relic]?.claimed);
      if (unclaimed.length && !n.cleared) {
        const r = unclaimed[0];
        const item = previewItem(game, r, n.place);
        const g = el('button', { type: 'button', class: 'rn-glint', 'aria-label': `${item.name}, held by ${r.holder}: see its card` });
        const ic = toCanvas(itemIcon(item), null, 2); ic.setAttribute('aria-hidden', 'true');
        g.append(ic);
        g.addEventListener('click', () => { ctx.audio.sfx('page'); ctx.services.cardPreview(item, { heldBy: r.holder }); });
        li.append(g);
      }
      li.append(el('span', 'rn-state', state === 'current' ? 'You' : state === 'cleared' ? '✓' : state === 'skipped' ? 'Done' : ''));
      ol.append(li);
    }
    rt.append(ol);
    right.append(rt);
    // keep the current node in view inside the sticky route column (laptop), without moving the page
    requestAnimationFrame(() => {
      const cur = ol.querySelector('.is-current');
      if (cur && right.scrollHeight > right.clientHeight) right.scrollTop = Math.max(0, cur.offsetTop - right.clientHeight / 2);
    });
  }

  function nextNodeId(game) {
    const g2 = advance(game);
    return g2 !== game && g2.progress.node !== game.progress.node ? g2.progress.node : null;
  }

  function fight(patrol) {
    const { game, battle } = startBattle(ctx.game, patrol ? { patrol: true } : {});
    ctx.setGame(game);
    const info = nodeInfo(ctx.game, ctx.game.progress.node);
    ctx.audio.sfx('confirm');
    ctx.audio.music(!patrol && info.kind === 'champion' ? 'boss' : 'battle');
    ctx.go('battle', { battle, returnTo: 'road' });
  }
  function doRest() {
    ctx.setGame(rest(ctx.game));
    restLine = REST_LINES[ctx.game.progress.flags.day % REST_LINES.length];
    ctx.audio.sfx('hearth');
    ctx.toast(`Rested at ${currentNode(ctx.game).name}. Saved.`);
    render();
  }
  function doAdvance() {
    const g = advance(ctx.game);
    if (g === ctx.game) return;
    ctx.setGame(g);
    restLine = null;
    ctx.audio.sfx('page');
    render();
    window.scrollTo(0, 0);
  }

  render();
  const nav = screenNav(root, { menu: () => ctx.go('party'), back: () => ctx.go('title') });
  return { onAction: nav };
}

const GAUNTLETIndex = (game, id) => route(game).findIndex(n => n.id === id);

function sceneLabel(info, cleared) {
  if (info.kind === 'hearthfire') return `${info.node.name}: a Hearthfire, and the party around it.`;
  if (cleared) return `${info.node.name}: the road is clear.`;
  return `${info.node.name}: ${info.spawns.map(s => info.nameOf(s)).join(', ')} bar the road.`;
}

// The backdrop with the party on the right and the foes (or a campfire) on the left.
function paintScene(cv, host, game, info, cleared) {
  const tmp = document.createElement('canvas');
  const layout = () => {
    const cw = host.clientWidth || 358;
    const k = cw < 420 ? 2 : 3;
    const W = Math.floor(cw / k), H = k === 2 ? 104 : 100;
    cv.width = W; cv.height = H; cv.style.width = W * k + 'px'; cv.style.height = H * k + 'px';
    return { W, H };
  };
  let dims = null;
  const foes = cleared || info.kind === 'hearthfire' ? [] : info.spawns.map((s, i) => ({ s, i }));
  const draw = t => {
    if (!dims) dims = layout();
    const { W, H } = dims, g = cv.getContext('2d'), reduced = isReduced();
    g.imageSmoothingEnabled = false;
    g.putImageData(renderBackdrop(info.node.backdrop, { w: W, h: H, t, reduced }), 0, 0);
    const floor = H - 6;
    // foes, facing right, on the left
    const n = foes.length;
    foes.forEach(({ s, i }) => {
      const F = FOES[s.family], A = FOE_ART[F.art] || FOE_ART[s.family];
      if (!A) return;
      const held = s.held || [], heldRelic = held.find(h => h.relic)?.relic;
      const o = { tier: F.tier, gearTier: s.gearTier || 0, t: t + i * .5, reduced };
      if (A.relic || A.relics) {
        // unique bearers draw their own relics; a relic you already own comes back as an Echo
        const ids = F.relics || [];
        if (ids.length > 1) o.broken = ids.filter((id, j) => held[j]?.item);
        else if (held.some(h => h.item)) o.relic = null;
      } else if (heldRelic || s.wears) o.relic = heldRelic || s.wears;
      const img = renderFoe(F.art || s.family, o);
      toCanvas(img, tmp);
      const foot = img.anchors?.foot || A.foot || [img.width / 2, img.height - 8];
      const span = Math.min(W * .46, 30 + n * 26);
      const x = Math.round(6 + (n === 1 ? span / 2 - 10 : i * (span / n)) - foot[0] + 18), y = Math.round(floor - (i % 2 ? 6 : 0) - foot[1]);
      g.drawImage(tmp, x, y);
    });
    if (info.kind === 'hearthfire') drawFire(g, Math.round(W * .38), floor - 4, t, reduced);
    // the party, facing left, on the right
    const ids = game.party.active.slice().reverse();
    ids.forEach((id, j) => {
      const h = game.party.roster[id];
      const img = renderHero(id, gearOf(game, id), { pose: h.hp <= 0 ? 'ko' : 'idle', t: t + j * .41, custom: customOf(game, id), reduced });
      toCanvas(img, tmp);
      const x = Math.round(W - 40 - j * 13 - (info.kind === 'hearthfire' ? 6 : 0)), y = Math.round(floor - 56 - (j % 2 ? 5 : 0));
      g.drawImage(tmp, x - 16, y);
    });
  };
  animate(cv, draw, 10);
}

function drawFire(g, x, y, t, reduced) {
  const P = (px, py, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.fillRect(px | 0, py | 0, 1, 1); };
  // logs
  for (let i = -5; i <= 5; i++) { P(x + i, y + 1, '#3a1e12'); P(x + i, y + 2, '#5e331b'); }
  for (let i = -3; i <= 3; i++) P(x + i, y, '#2a140c');
  // glow on the ground
  for (let i = -14; i <= 14; i++) for (let j = 0; j < 3; j++) if ((i + j) & 1) P(x + i, y + 2 + j, '#ee8e31', .18 * (1 - Math.abs(i) / 15));
  const f = reduced ? 0 : Math.floor(t * 9);
  const cols = ['#fff4b4', '#ffbe48', '#ee7a1c', '#bf3e0c'];
  for (let k = 0; k < 18; k++) {
    const h = ((k * 7 + f * 3) % 9), dx = ((k * 5 + f) % 7) - 3, lvl = Math.min(3, Math.floor(h / 2.4));
    if (Math.abs(dx) > 3 - h / 4) continue;
    P(x + dx, y - 1 - h, cols[lvl], 1);
  }
  P(x, y - 1, '#fff4b4'); P(x - 1, y - 2, '#ffbe48'); P(x + 1, y - 2, '#ffbe48'); P(x, y - 3, '#ffbe48');
  if (!reduced) for (let k = 0; k < 4; k++) { const ph = (t * .6 + k / 4) % 1; P(x + Math.sin(t * 2 + k) * 3, y - 6 - ph * 18, '#ffb04a', 1 - ph); }
  g.globalAlpha = 1;
}

function brandBanner(brand, game, onDone) {
  const b = el('section', 'brand-banner');
  b.append(
    el('p', 'kick', 'Brand earned'),
    el('h2', 'title-display', esc(brand.name || 'A Brand')),
    el('p', '', esc(brand.text || 'One coal of the hearth relights.')),
    el('p', 'waking', `<b>The Waking rises to ${brand.waking ?? game.progress.waking}.</b> Every foe in Aethermoor re-arms: six levels higher, a gear tier better, an Omen more on the elites. The loot in their hands gets better too.`),
    el('p', 'small', 'The road home to the Keep and back north starts again. It will not be the same road.'),
  );
  b.append(button('Walk it again, stronger', 'btn primary', onDone, { 'data-primary': '' }));
  return b;
}

