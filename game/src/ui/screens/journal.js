// The Journal (M3 spec §5.6): tabs for Quests, Bounties, the Ladder and Keys.
// mount(root, ctx, { tab: 'quests' | 'bounties' | 'ladder' | 'keys' = 'quests', from = 'world' })
//
//   Quests    rules/story.js questLog: each quest's steps so far (ticked by their `done`
//             conditions), the step you are on and where, the reward and whom to tell
//   Bounties  rules/story.js bounties: Dael's board, hunting / ready to turn in / paid
//   Ladder    rules/story.js ladder: a renderFoe poster per villain, a black silhouette until
//             scouted, stamped when settled; the Act II rumours after them
//   Keys      rules/world.js lockStatus for every lock type: a tick or cross per key and whose
//             Domain counts; the story seals (crownwalls, the roads out of the Wilds) listed apart
// Test hooks: tabs are .jr-tab[data-tab]; posters are .poster[data-id][data-state].
// Owner: WP8.
import { questLog, bounties, ladder } from '../../rules/story.js';
import { lockStatus, keys } from '../../rules/world.js';
import { check } from '../../rules/cond.js';
import { spawnsFor } from '../../rules/gauntlet.js';
import { buildFoe } from '../../rules/foe.js';
import { renderFoe } from '../../art/foes.js';
import { lockIcon, keyIcon } from '../../art/icons.js';
import { QUESTS } from '../../data/quests.js';
import { LADDER } from '../../data/ladder.js';
import { LOCKS, LOCK_IDS, CROWNWALL } from '../../data/locks.js';
import { NPCS } from '../../data/npcs.js';
import { RELICS } from '../../data/relics.js';
import { DOMAINS } from '../../data/domains.js';
import { REGIONS } from '../../data/world.js';
import { MAPS, ENTITY_OF } from '../../data/maps/index.js';
import { el, button, toCanvas } from '../lib/dom.js';
import { screenNav } from '../lib/keys.js';
import { foeLook } from '../battle/sprites.js';

const TABS = [['quests', 'Quests'], ['bounties', 'Bounties'], ['ladder', 'Ladder'], ['keys', 'Keys']];
const STATE_WORD = { active: 'Active', ready: 'Ready', done: 'Done' };
const mapName = id => MAPS[id]?.name || '';
const whereOf = encId => mapName(ENTITY_OF[encId]?.map);

export function mount(root, ctx, params = {}) {
  if (!ctx.game) { ctx.go('title'); return {}; }
  let tab = TABS.some(([t]) => t === params.tab) ? params.tab : 'quests';
  const from = params.from || 'world';
  const back = () => { ctx.audio.sfx('back'); ctx.go(from); };
  const top = el('header', 'topbar');
  const title = el('div', 'tb-title');
  title.append(el('span', { class: 'realm', text: 'The Journal' }), el('h1', { class: 'title-display', text: 'Leads & Keys' }));
  top.append(button('‹ Back', 'btn ghost back', back), title);
  const tabs = el('div', { class: 'tabs jr-tabs', role: 'tablist', 'aria-label': 'Journal' });
  const panel = el('section', { class: 'jr-panel', role: 'tabpanel', id: 'jr-panel' });
  root.append(top, tabs, panel);
  let cancelArt = () => {};

  function render() {
    cancelArt();
    tabs.replaceChildren(...TABS.map(([t, label], i) => {
      const b = button('', 'tab jr-tab', () => { if (tab === t) return; tab = t; ctx.audio.sfx('page'); render(); }, { role: 'tab', 'aria-selected': String(t === tab), 'aria-controls': 'jr-panel', 'data-tab': t, 'data-pick': String(i + 1) });
      b.textContent = label;
      return b;
    }));
    panel.replaceChildren();
    panel.dataset.tab = tab;
    const g = ctx.game;
    try {
      if (tab === 'quests') renderQuests(g);
      else if (tab === 'bounties') renderBounties(g);
      else if (tab === 'ladder') renderLadder(g);
      else renderKeys(g);
    } catch (err) {
      console.error(err);
      panel.append(el('p', { class: 'panel small', text: 'This page of the Journal is smudged. Try again after the next step.' }));
    }
  }

  // ---- quests ---------------------------------------------------------------------------------
  function renderQuests(g) {
    const log = questLog(g).slice().sort((a, b) => (a.kind === 'main' ? -1 : 0) - (b.kind === 'main' ? -1 : 0) || (a.state === 'done') - (b.state === 'done'));
    if (!log.length) { panel.append(el('p', { class: 'panel jr-empty', text: 'No leads yet. Somebody in the Keep will have work for you soon enough.' })); return; }
    for (const q of log) {
      const Q = QUESTS[q.id];
      const card = el('article', `jr-quest panel is-${q.state} k-${q.kind}`);
      card.dataset.id = q.id;
      card.append(el('p', 'jr-kick', [el('span', { class: 'jr-kind', text: q.kind === 'main' ? 'Main quest' : 'Side quest' }), el('span', { class: `chip st-${q.state}`, text: STATE_WORD[q.state] || q.state })]));
      card.append(el('h2', { class: 'title-display', text: q.name }));
      const steps = el('ol', 'jr-steps');
      let cur = -1;
      (Q?.steps || []).forEach((s, i) => {
        const done = safeCheck(g, s.done);
        if (!done && cur < 0) cur = i;
        if (!done && i > cur) return; // later steps stay unwritten
        const li = el('li', done ? 'done' : 'now');
        li.append(el('span', { class: 'mk', 'aria-hidden': 'true', text: done ? '✓' : '▸' }), el('span', { class: 'tx', text: s.text }));
        if (!done && s.target?.map) li.append(el('small', { class: 'where', text: mapName(s.target.map) }));
        li.setAttribute('aria-label', `${done ? 'Done' : 'Now'}: ${s.text}`);
        steps.append(li);
      });
      const left = cur < 0 ? 0 : (Q?.steps.length || 0) - cur - 1;
      if (left > 0) steps.append(el('li', { class: 'more', text: `${left} more ${left === 1 ? 'step' : 'steps'} unwritten` }));
      card.append(steps);
      const giver = NPCS[Q?.giver]?.name;
      const r = Q?.reward || {};
      const reward = [r.gold && `${r.gold} gold`, r.relic && RELICS[r.relic]?.name, r.item && 'an item'].filter(Boolean).join(' and ');
      if (q.state === 'ready') card.append(el('p', { class: 'jr-ready', text: `Done. Tell ${giver || 'whoever asked'}${reward ? ` for ${reward}` : ''}.` }));
      else if (q.state === 'active' && (reward || giver)) card.append(el('p', { class: 'jr-meta', text: [giver && `From ${giver}`, reward && `Reward: ${reward}`].filter(Boolean).join(' · ') }));
      panel.append(card);
    }
  }

  // ---- bounties -------------------------------------------------------------------------------
  function renderBounties(g) {
    const list = bounties(g);
    const met = safeCheck(g, { flag: 'met-dael' });
    panel.append(el('p', { class: 'jr-lede', text: met ? 'Posted on Captain Dael’s board in Thornhollow. Bring him the proof and he pays.' : 'Captain Dael keeps a bounty board in Thornhollow. You have not read it yet, but word gets around.' }));
    const ul = el('ul', 'jr-bounties');
    for (const b of list) {
      const li = el('li', `jr-bounty panel is-${b.state}`);
      li.dataset.id = b.id;
      const st = b.state === 'ready' ? 'Ready: turn in to Dael' : b.state === 'done' ? 'Paid' : 'Hunting';
      li.append(
        el('span', 'jb-txt', [el('b', { text: b.name }), el('small', { text: [whereOf(b.enc), st].filter(Boolean).join(' · ') })]),
        el('span', { class: 'jb-gold', text: `${b.gold} g` }),
      );
      ul.append(li);
    }
    panel.append(ul);
  }

  // ---- the Ladder -----------------------------------------------------------------------------
  function renderLadder(g) {
    const posters = ladder(g);
    const settled = posters.filter(p => p.state === 'settled').length, act1 = posters.filter(p => p.act === 1).length;
    panel.append(el('p', { class: 'jr-lede', text: `The Ladder: every name that has a hand in this. ${settled} of ${act1} settled. A poster fills in once you have seen its villain.` }));
    const grid = el('div', 'ladder');
    const jobs = [];
    for (const p of posters) {
      const L0 = LADDER.find(x => x.id === p.id) || {};
      const L = { ...L0, enc: p.enc ?? L0.enc, spawn: p.spawn ?? L0.spawn };
      const known = p.state !== 'silhouette';
      const card = el('article', `poster is-${p.state}${L.silhouette ? ' rumour' : ''}`);
      card.dataset.id = p.id; card.dataset.state = p.state;
      const art = el('canvas', { class: 'px poster-art', width: '112', height: '96', role: 'img', 'aria-label': known ? p.name : L.silhouette ? `A rumour: ${p.name}` : 'An unknown villain, a black silhouette' });
      card.append(el('span', { class: 'poster-k', text: L.silhouette ? `Act ${p.act}` : 'Wanted' }), el('span', 'poster-frame', [art]));
      card.append(el('b', { class: 'poster-name', text: known || L.silhouette ? p.name : '???' }));
      card.append(el('small', { class: 'poster-where', text: L.silhouette ? 'Only a rumour' : known ? whereOf(L.enc) || '' : 'Not scouted' }));
      if (p.state === 'settled') card.append(el('span', { class: 'poster-stamp', text: 'Settled' }));
      else if (p.state === 'scouted') card.append(el('span', { class: 'poster-stamp scouted', text: 'Scouted' }));
      grid.append(card);
      jobs.push(() => paintPoster(art, g, L, known));
    }
    panel.append(grid);
    // paint the posters a few at a time, so the tab opens at once
    let alive = true, t = 0;
    const run = () => {
      if (!alive) return;
      const t0 = performance.now();
      while (jobs.length && performance.now() - t0 < 12) { try { jobs.shift()(); } catch (err) { console.error(err); } }
      if (jobs.length) t = setTimeout(run, 0);
    };
    t = setTimeout(run, 0);
    cancelArt = () => { alive = false; clearTimeout(t); };
  }

  // ---- keys -----------------------------------------------------------------------------------
  function renderKeys(g) {
    const k = keys(g);
    panel.append(el('p', { class: 'jr-lede', text: 'Every lock in the Wilds has two keys: a relic’s map power, or a Domain. A relic counts while you own it, worn or not. A Domain counts for your best active hero.' }));
    const dom = el('ul', { class: 'jr-domains', 'aria-label': 'Your best Domains' });
    const used = new Set(LOCK_IDS.map(id => LOCKS[id].domain.id));
    for (const [id, D] of Object.entries(DOMAINS).filter(([id]) => used.has(id))) {
      const best = k.domains?.[id] || { level: 0, heroId: null };
      const who = best.heroId ? g.party.roster[best.heroId]?.name : null;
      dom.append(el('li', '', [icon(keyIcon(id, { size: 12 })), el('span', '', [el('b', { text: `${D.name.split(' ')[0]} ${best.level || 0}` }), el('small', { text: who || 'nobody' })])]));
    }
    panel.append(dom);
    const ul = el('ul', 'jr-locks');
    for (const id of LOCK_IDS) {
      const L = LOCKS[id];
      const st = lockStatus(g, id);
      const li = el('li', `jr-lock panel ${st.open ? 'is-open' : 'is-shut'}`);
      li.dataset.lock = id;
      li.append(el('p', 'jl-head', [icon(lockIcon(id, { size: 12, dim: st.open })), el('b', { text: L.name }), el('span', { class: `chip ${st.open ? 'st-done' : 'st-shut'}`, text: st.open ? 'You can open it' : L.soft ? 'Soft' : 'Locked' })]));
      const ks = el('ul', 'jl-keys');
      for (const key of st.keys) {
        const row = el('li', key.have ? 'have' : 'lack');
        const detail = key.kind === 'power' ? (key.have ? `${key.detail} · yours` : key.detail) : `best: ${key.detail}`;
        row.append(el('span', { class: 'mk', text: key.have ? '✓' : '✗', 'aria-label': key.have ? 'Have' : 'Missing' }), icon(keyIcon(key.kind === 'power' ? 'power' : key.id, { size: 12, dim: !key.have })), el('span', { class: 'kl', text: key.label }), el('small', { text: detail }));
        ks.append(row);
      }
      li.append(ks);
      if (L.soft) li.append(el('p', { class: 'jl-soft', text: L.soft.vision ? 'Soft: without a key you can still go in, seeing only two tiles.' : L.soft.hpPct ? `Soft: without a key every step costs ${Math.round(L.soft.hpPct * 100)}% of max HP (never below 1).` : 'Soft: it never blocks the way.' }));
      else if (L.text) li.append(el('p', { class: 'jl-text', text: L.text }));
      ul.append(li);
    }
    panel.append(ul);
    // the story seals: not locks, and no key opens them
    const seals = el('section', 'jr-seals panel');
    const crownOpen = safeCheck(g, CROWNWALL.open);
    seals.append(el('h2', 'label', 'Story seals'));
    const sl = el('ul', 'jl-keys');
    const seal = (name, open, text) => sl.append(el('li', open ? 'have' : 'lack', [el('span', { class: 'mk', text: open ? '✓' : '✗' }), icon(lockIcon('crownwall', { size: 12, dim: open })), el('span', { class: 'kl', text: name }), el('small', { text })]));
    seal(`${CROWNWALL.name}s`, crownOpen, crownOpen ? 'Fallen with Briarmaw. The old roads are yours.' : CROWNWALL.journal);
    const closed = Object.values(REGIONS).filter(r => !r.open);
    seal('The roads out of the Wilds', false, `${closed.map(r => r.name.replace(/^The /, '')).join(', ')}: sealed. ${safeCheck(g, { flag: 'act1-complete' }) ? 'The way opens in the next chapter.' : 'Not in this chapter.'}`);
    seals.append(sl);
    panel.append(seals);
  }

  render();
  const nav = screenNav(root, {
    back, menu: back,
    pick: n => { const t = TABS[n - 1]; if (!t) return false; if (tab !== t[0]) { tab = t[0]; ctx.audio.sfx('page'); render(); } return true; },
  });
  return {
    unmount() { cancelArt(); },
    onAction: nav,
  };
}

const safeCheck = (g, cond) => { try { return check(g, cond); } catch { return false; } };
// a 12 px art icon at 2x (decorative: the words beside it carry the meaning)
function icon(img) {
  const s = el('span', { class: 'jl-ico', 'aria-hidden': 'true' });
  try { if (img) s.append(toCanvas(img, null, 2)); } catch { /* art still loading */ }
  return s;
}

// One poster: the villain as the battle draws them, or a black silhouette until scouted.
function paintPoster(cv, game, L, known) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  if (!L.enc) { paintRumour(g, cv.width, cv.height); return; }
  const spawns = spawnsFor(game, L.enc);
  const s = spawns[L.spawn ?? 0] || spawns[0];
  if (!s) return;
  const u = buildFoe(s, { id: 'poster', seq: 0 });
  const img = renderFoe(u.art, { ...foeLook(u), pose: 'idle', t: 0, reduced: true });
  if (!known) {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) { d[i] = 11; d[i + 1] = 9; d[i + 2] = 16; d[i + 3] = d[i + 3] > 40 ? 255 : d[i + 3]; }
  }
  // fit the figure: crop to its opaque box, scale down (never up) into the poster
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (img.data[(y * img.width + x) * 4 + 3] > 96) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return;
  const tmp = document.createElement('canvas');
  tmp.width = img.width; tmp.height = img.height;
  tmp.getContext('2d').putImageData(img, 0, 0);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  // whole-pixel upscaling when the figure has room (pixel art stays crisp), else fit it down
  const fit = Math.min((cv.width - 8) / bw, (cv.height - 8) / bh);
  const k = fit >= 2 ? Math.floor(fit) : Math.min(1, fit);
  const w = Math.round(bw * k), h = Math.round(bh * k);
  g.imageSmoothingEnabled = false;
  g.drawImage(tmp, x0, y0, bw, bh, Math.round((cv.width - w) / 2), cv.height - 3 - h, w, h);
}

// Act II rumours: a question mark in smoke.
function paintRumour(g, W, H) {
  g.fillStyle = 'rgba(11, 9, 16, 0.85)';
  g.beginPath(); g.ellipse(W / 2, H * 0.62, W * 0.26, H * 0.3, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#5a4838';
  const q = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'];
  const px = 4, ox = Math.round(W / 2 - 10), oy = Math.round(H * 0.62 - 14);
  q.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') g.fillRect(ox + x * px, oy + y * px, px, px); }));
}
