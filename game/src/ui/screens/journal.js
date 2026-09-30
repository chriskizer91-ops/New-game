// The Journal (M3 spec §5.6; M4 spec §4.6, §5.4): tabs for Quests, Bounties, the Ladder, Keys and
// Grudges.
// mount(root, ctx, { tab: 'quests' | 'bounties' | 'ladder' | 'keys' | 'grudges' = 'quests', from = 'world' })
//
//   Quests    rules/story.js questLog: each quest's steps so far (ticked by their `done`
//             conditions), the step you are on and where, the reward and whom to tell
//   Bounties  rules/story.js bounties, one group per board (Dael's in Thornhollow; Zara's in
//             Sandspire once the Sunscorch is open; M5: Captain Ysolde's in Stormwatch once the
//             Ironspire is open; M6: Mayor Gretch's in Bogmire once the Gloomfen is open): hunting /
//             ready to turn in (to its giver) / paid
//   Ladder    rules/story.js ladder: a renderFoe poster per villain, a black silhouette until
//             scouted, stamped when settled; the rumours of the sealed regions after them
//   Keys      rules/world.js lockStatus for every lock type: a tick or cross per key and whose
//             Domain counts; the story seals (crownwalls, the roads to the Sunscorch and, M5, the
//             Ironspire and, M6, the Gloomfen, each with what opens it) listed apart
//   Grudges   flags.grudges (the unsettled: name, title, where, their Omens, and whether the pack
//             hunts you) and flags.settled (name and the day), from grudgeView(game)
// M7 (spec §3.6, §5): Act III in the Journal: the Hollow Council's posters and the Unsmith's; a rumour the story has
// settled into a poster (a LADDER entry's `found: { if, poster }`: the missing smith and the man on the barge, found
// in the Unsmith) says "Found: <poster>" and takes you to it; the Keys tab lists the road to the Hearth Below once the
// fourth council has sat (roadShown), sealed until the fifth.
// Every saved string (a Grudge's name and title, an Omen id) goes in through textContent.
// Pure helper for tests (node): grudgeView(game).
// Test hooks: tabs are .jr-tab[data-tab]; posters are .poster[data-id][data-state]; Grudges are
// .jr-grudge[data-key][data-state="active"|"settled"] (the empty states .jr-empty).
// Owner: WP8; M4 P7b (the Grudges tab, the Sandspire board); M5 P7 (the Stormwatch board, the Ironspire road);
// M6 P7 (the Bogmire board, the Gloomfen road); M7 P7 (Act III: the road below, the rumours found).
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
import { OMENS } from '../../data/omens.js';
import { GEMS, MATERIALS } from '../../data/gems.js';
import { ENCOUNTERS } from '../../data/encounters.js';
import { REGIONS } from '../../data/world.js';
import { MAPS, ENTITY_OF } from '../../data/maps/index.js';
import { el, button, toCanvas } from '../lib/dom.js';
import { screenNav } from '../lib/keys.js';
import { regionOpen } from '../lib/atlas-geo.js';
import { foeLook } from '../battle/sprites.js';

const TABS = [['quests', 'Quests'], ['bounties', 'Bounties'], ['ladder', 'Ladder'], ['keys', 'Keys'], ['grudges', 'Grudges']];
const STATE_WORD = { active: 'Active', ready: 'Ready', done: 'Done' };
const mapName = id => MAPS[id]?.name || '';
const whereOf = encId => mapName(ENTITY_OF[encId]?.map);
const times = n => (n === 1 ? 'once' : n === 2 ? 'twice' : n === 3 ? 'three times' : `${n} times`);
const str = v => (v == null ? '' : String(v));
const inSentence = t => String(t || '').replace(/^The /, 'the ');
// the roads out of the Keep into each region: how the Keys tab says them, open and shut
const ROADS = {
  sunscorch: { open: 'The Keep\'s south-east gate stands open. The Sunward Road runs to Sandspire.', shut: 'Sealed until both Brands of the Wilds are yours.' },
  ironspire: { open: 'The Keep\'s east postern stands open. The Rockslide Pass climbs to Peak\'s Veil.', shut: 'Sealed until the Council has sat a second time.' },
  // M6: the fen stair opens with the third council; the causeway home dries out once the Blackwater falls
  gloomfen: {
    open: g => (safeCheck(g, { brand: 'brand-of-the-deep' }) ? 'The fen stair below Mossfall stands open, and the causeway from the Keep\'s south-west gate runs dry.' : 'The fen stair below Mossfall stands open. Willowmurk\'s safe paths lead down into the Gloomfen.'),
    shut: 'Sealed until the Council has sat a third time.',
  },
  // M7: the stair under the vault opens with the fifth council
  below: { open: 'The stair under the vault stands open. The Hollow Hall waits below the Keep.', shut: 'Sealed until the Council has sat a fifth time.' },
};

// M7: a road the Keys tab lists: an open region with an entry; an Act III road only once the fourth council has sat (the
// Hollow Council is named), or once it is open. Pure: node tests use it.
export function roadShown(game, region) {
  const r = REGIONS[region];
  if (!r?.open || !r.entries?.length) return false;
  if ((r.act || 1) < 3) return true;
  return regionOpen(game, region) || safeCheck(game, { flag: 'council-4-done' });
}

// M7: a rumour the story has settled into a poster ("Found: the Unsmith"): the LADDER entry's `found`, once it holds.
// `said` is the rules' own word when rules/story.js ladder() gives one (`found`: the poster's id, once the `if` holds);
// else the data's `found: { if, poster }` is checked here. Pure: node tests use it (with a ladder of their own).
// -> { poster, name } | null
export function rumourFound(game, id, ladder = LADDER, said = undefined) {
  if (typeof said === 'string') { const P = ladder.find(x => x.id === said); return P ? { poster: P.id, name: P.name } : null; }
  const L = ladder.find(x => x.id === id);
  const f = L?.found;
  if (!f?.poster || !safeCheck(game, f.if)) return null;
  const P = ladder.find(x => x.id === f.poster);
  return P ? { poster: P.id, name: P.name } : null;
}

// The Grudges tab's rows (pure; node tests use it). A Grudge is keyed `<encId>#<spawnIndex>`; old
// saves may miss any field, so everything falls back to something that reads.
export function grudgeView(game) {
  const f = game?.progress?.flags || {};
  const active = Object.entries(f.grudges && typeof f.grudges === 'object' ? f.grudges : {}).map(([key, g0]) => {
    const g = g0 && typeof g0 === 'object' ? g0 : {};
    const nodeId = str(g.nodeId || key.split('#')[0]);
    const E = ENCOUNTERS[nodeId];
    const at = ENTITY_OF[nodeId];
    const wins = Math.max(0, Number(g.wins) || 0), flees = Math.max(0, Number(g.flees) || 0);
    const bits = [wins && `Beat you ${times(wins)}`, flees && `You fled ${times(flees)}`].filter(Boolean);
    return {
      key, nodeId, name: str(g.name) || E?.name || 'A foe you know', title: str(g.title),
      where: [E?.place, at ? mapName(at.map) : ''].filter((s, i, a) => s && a.indexOf(s) === i).join(' · ') || 'Somewhere out there',
      record: bits.join(' · '),
      omens: (Array.isArray(g.omens) ? g.omens : []).map(id => ({ id: str(id), name: OMENS[id]?.name || str(id), color: OMENS[id]?.color || '#999', text: OMENS[id]?.text || '' })),
      // a pack with a Grudge hunts you across its map (spec §4.6); lairs and blocks keep their ground
      hunts: at?.entity?.mode === 'pack',
    };
  });
  const settled = Object.entries(f.settled && typeof f.settled === 'object' ? f.settled : {}).map(([key, s0]) => {
    const s = s0 && typeof s0 === 'object' ? s0 : {};
    const nodeId = key.split('#')[0];
    return { key, name: str(s.name) || ENCOUNTERS[nodeId]?.name || 'A foe you know', day: Number(s.day) || null, where: ENCOUNTERS[nodeId]?.place || '' };
  }).sort((a, b) => (b.day || 0) - (a.day || 0));
  return { active, settled };
}

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
      else if (tab === 'grudges') renderGrudges(g);
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
      const count = (n, name) => (n === 1 ? `${/^[AEIOU]/i.test(name) ? 'an' : 'a'} ${name}` : `${n} ${name}${/s$/.test(name) ? '' : 's'}`);
      const reward = [
        r.gold && `${r.gold} gold`, r.relic && inSentence(RELICS[r.relic]?.name), r.item && 'an item',
        ...Object.entries(r.gems || {}).map(([id, n]) => count(n, GEMS[id]?.name || id)),
        ...Object.entries(r.materials || {}).map(([id, n]) => `${n} ${(MATERIALS[id]?.name || id).toLowerCase()}`),
      ].filter(Boolean).join(' and ');
      if (q.state === 'ready') card.append(el('p', { class: 'jr-ready', text: `Done. Tell ${giver || 'whoever asked'}${reward ? ` for ${reward}` : ''}.` }));
      else if (q.state === 'active' && (reward || giver)) card.append(el('p', { class: 'jr-meta', text: [giver && `From ${giver}`, reward && `Reward: ${reward}`].filter(Boolean).join(' · ') }));
      panel.append(card);
    }
  }

  // ---- bounties -------------------------------------------------------------------------------
  // One group per board: Captain Dael's in Thornhollow, Zara's in Sandspire (once the Sunscorch is
  // open, or a bounty of hers is already done), M5: Captain Ysolde's in Stormwatch, then any other giver's.
  // The board of the region the party stands in comes first. Any board pays for any bounty.
  function renderBounties(g) {
    const list = bounties(g);
    const KNOWN = {
      dael: { home: 'verdant', met: 'met-dael', read: 'Posted on Captain Dael’s board in Thornhollow. Bring him the proof and he pays.', unread: 'Captain Dael keeps a bounty board in Thornhollow. You have not read it yet, but word gets around.' },
      zara: { home: 'sunscorch', met: 'met-zara', read: 'Posted on the Sandspire board, by Zara al-Khem’s caravanserai. She pays for proof, and any board pays for any bounty.', unread: 'Sandspire keeps a bounty board by the caravanserai. Zara al-Khem pays for proof.', region: 'sunscorch' },
      // M5: the Stormwatch board (Ironhold's board posts the same bills); read once you have met the
      // captain or walked into Stormwatch
      ysolde: { home: 'ironspire', met: 'met-ysolde', map: 'stormwatch', read: 'Posted on the Stormwatch board, under the watch tower. Captain Ysolde pays for proof, and any board pays for any bounty.', unread: 'Stormwatch keeps a bounty board under its watch tower, and Ironhold posts the same bills. Captain Ysolde pays for proof.', region: 'ironspire' },
      // M6: the Bogmire board, by the moot-hall (read once you have met the mayor or walked into Bogmire)
      gretch: { home: 'gloomfen', met: 'met-gretch', map: 'bogmire', read: 'Posted on the Bogmire board, by the moot-hall. Mayor Gretch pays for proof, and any board pays for any bounty.', unread: 'Bogmire keeps a bounty board by its moot-hall. Mayor Gretch pays for proof, in coin and in favours.', region: 'gloomfen' },
    };
    const here = MAPS[g.progress?.pos?.map]?.region || 'verdant';
    const atHome = giver => (KNOWN[giver]?.home === here ? 1 : 0);
    const givers = [...new Set(list.map(b => b.giver || 'dael'))].sort((a, b) => atHome(b) - atHome(a) || (KNOWN[b] ? 1 : 0) - (KNOWN[a] ? 1 : 0) || Object.keys(KNOWN).indexOf(a) - Object.keys(KNOWN).indexOf(b));
    for (const giver of givers) {
      const who = NPCS[giver]?.name || 'someone';
      const B = KNOWN[giver] || { met: `met-${giver}`, read: `Posted by ${who}. Bring the proof and be paid.`, unread: `${who} has work posted. You have not read it yet.` };
      const mine = list.filter(b => (b.giver || 'dael') === giver);
      // a board in a sealed region stays out of the Journal until its road opens (or it has paid out)
      const met = safeCheck(g, { flag: B.met }) || !!(B.map && g.progress?.flags?.visits?.[B.map]);
      if (B.region && !regionOpen(g, B.region) && !met && mine.every(b => b.state === 'active')) continue;
      const box = el('section', { class: 'jr-board', 'data-giver': giver });
      box.append(el('p', { class: 'jr-lede', text: met ? B.read : B.unread }));
      const ul = el('ul', 'jr-bounties');
      for (const b of mine) {
        const li = el('li', `jr-bounty panel is-${b.state}`);
        li.dataset.id = b.id;
        const st = b.state === 'ready' ? `Ready: turn in to ${who}` : b.state === 'done' ? 'Paid' : 'Hunting';
        li.append(
          el('span', 'jb-txt', [el('b', { text: b.name }), el('small', { text: [whereOf(b.enc), st].filter(Boolean).join(' · ') })]),
          el('span', { class: 'jb-gold', text: `${b.gold} g` }),
        );
        ul.append(li);
      }
      box.append(ul);
      panel.append(box);
    }
  }

  // ---- Grudges (spec §4.6) --------------------------------------------------------------------
  function renderGrudges(g) {
    const { active, settled } = grudgeView(g);
    panel.append(el('p', { class: 'jr-lede', text: 'A foe that beats you, or that you run from, remembers you: it takes a title and an Omen, and it waits. A pack with a Grudge hunts you across its map. Settle it, and everything it drops says so.' }));
    if (!active.length && !settled.length) {
      panel.append(el('p', { class: 'panel jr-empty jr-grudge-none', text: 'No Grudges yet. Nobody out there has beaten you, and you have run from nobody. Keep it that way, or come back and settle it.' }));
      return;
    }
    const sec = (cls, label, rows, empty) => {
      const s = el('section', { class: `jr-grudges ${cls}` });
      s.append(el('h2', { class: 'label jr-gh', text: `${label} · ${rows.length}` }));
      if (!rows.length) s.append(el('p', { class: 'panel jr-empty', text: empty }));
      panel.append(s);
      return s;
    };
    const A = sec('is-active', 'Unsettled', active, 'Nobody is waiting for you. Every Grudge you made is settled.');
    for (const r of active) {
      const card = el('article', { class: 'jr-grudge panel', 'data-key': r.key, 'data-state': 'active' });
      card.append(el('p', 'jr-kick', [el('span', { class: 'jr-kind', text: r.hunts ? 'Hunts you' : 'Waits for you' }), r.record ? el('span', { class: 'chip st-shut', text: r.record }) : null]));
      card.append(el('h3', { class: 'title-display jg-name', text: r.name }));
      if (r.title && !r.name.endsWith(r.title)) card.append(el('p', { class: 'jg-title', text: r.title }));
      card.append(el('p', { class: 'jg-where', text: r.where }));
      if (r.omens.length) {
        const om = el('ul', { class: 'jg-omens', 'aria-label': 'Its Omens' });
        for (const o of r.omens) {
          const li = el('li', 'jg-omen');
          const chip = el('b', { class: 'omen', text: o.name });
          chip.style.setProperty('--c', /^#[0-9a-f]{3,8}$/i.test(o.color) ? o.color : '#999');
          li.append(chip);
          if (o.text) li.append(el('small', { text: o.text }));
          om.append(li);
        }
        card.append(om);
      }
      card.append(el('p', { class: 'jg-note', text: r.hunts ? 'It sees you from farther off than the rest, never runs, and follows you anywhere on its map.' : 'It holds its ground, and it will know you when you come back.' }));
      A.append(card);
    }
    const S = sec('is-settled', 'Settled', settled, 'None settled yet. Beat a Grudge and every piece it drops is stamped Grudge settled.');
    const ul = el('ul', 'jr-settled');
    for (const r of settled) {
      const li = el('li', { class: 'jr-grudge panel', 'data-key': r.key, 'data-state': 'settled' });
      li.append(el('span', 'jb-txt', [el('b', { text: r.name }), el('small', { text: [r.where, r.day ? `Settled on Day ${r.day}` : 'Settled'].filter(Boolean).join(' · ') })]), el('span', { class: 'jg-stamp', text: 'Settled' }));
      ul.append(li);
    }
    if (settled.length) S.append(ul);
  }

  // ---- the Ladder -----------------------------------------------------------------------------
  function renderLadder(g) {
    const posters = ladder(g);
    // every poster with a villain behind it counts (Act I and the Sunscorch); the rumours do not
    const real = posters.filter(p => !LADDER.find(x => x.id === p.id)?.silhouette);
    const settled = real.filter(p => p.state === 'settled').length;
    panel.append(el('p', { class: 'jr-lede', text: `The Ladder: every name that has a hand in this. ${settled} of ${real.length} settled. A poster fills in once you have seen its villain.` }));
    const grid = el('div', 'ladder');
    const jobs = [];
    for (const p of posters) {
      const L0 = LADDER.find(x => x.id === p.id) || {};
      const L = { ...L0, enc: p.enc ?? L0.enc, spawn: p.spawn ?? L0.spawn };
      const known = p.state !== 'silhouette';
      // M7: a rumour the story settled into a poster (found in the Unsmith) points at it
      const found = L.silhouette ? rumourFound(g, p.id, LADDER, p.found) : null;
      const card = el('article', `poster is-${p.state}${L.silhouette ? ' rumour' : ''}${found ? ' is-found' : ''}`);
      card.dataset.id = p.id; card.dataset.state = p.state;
      if (found) card.dataset.found = found.poster;
      const art = el('canvas', { class: 'px poster-art', width: '112', height: '96', role: 'img', 'aria-label': known ? p.name : L.silhouette ? `A rumour: ${p.name}` : 'An unknown villain, a black silhouette' });
      card.append(el('span', { class: 'poster-k', text: found ? 'Found' : L.silhouette ? `Act ${p.act}` : 'Wanted' }), el('span', 'poster-frame', [art]));
      card.append(el('b', { class: 'poster-name', text: known || L.silhouette ? p.name : '???' }));
      if (found) {
        const go = button('', 'btn ghost poster-found', () => {
          const to = grid.querySelector(`.poster[data-id="${found.poster}"]`);
          if (!to) return;
          ctx.audio.sfx('page');
          to.scrollIntoView({ block: 'center', behavior: ctx.reduced() ? 'auto' : 'smooth' });
          to.classList.remove('flash-to'); void to.offsetWidth; to.classList.add('flash-to');
        }, { 'aria-label': `${p.name}: found. Show ${found.name}'s poster` });
        go.textContent = `Found: ${found.name.replace(/^The /, 'the ')}`;
        card.append(go);
      } else card.append(el('small', { class: 'poster-where', text: L.silhouette ? 'Only a rumour' : known ? whereOf(L.enc) || '' : 'Not scouted' }));
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
    panel.append(el('p', { class: 'jr-lede', text: 'Every lock has two keys or more: a relic’s map power, or a Domain. A relic counts while you own it, worn or not. A Domain counts for your best active hero.' }));
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
      const tiles = n => ['no', 'one', 'two', 'three', 'four', 'five'][n] || n;
      if (L.soft) li.append(el('p', { class: 'jl-soft', text: L.soft.vision ? `Soft: without a key you can still go in, seeing only ${tiles(L.soft.vision)} tiles${id === 'fog' ? ' through the fog' : ''}.` : L.soft.hpPct ? `Soft: without a key every step costs ${Math.round(L.soft.hpPct * 100)}% of max HP (never below 1).` : 'Soft: it never blocks the way.' }));
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
    // the Sunscorch road (the Keep's south-east gate) opens with Act I, the Ironspire's (the east postern)
    // with the second council (M5), the Gloomfen's (the fen stair) with the third (M6); the rest wait on
    // later chapters
    const act1 = safeCheck(g, { flag: 'act1-complete' });
    for (const r of Object.values(REGIONS).filter(r => roadShown(g, r.id))) {
      const o = regionOpen(g, r.id);
      const R = ROADS[r.id] || { open: 'Its road stands open.', shut: 'Sealed for now.' };
      seal(`The road to ${inSentence(r.name)}`, o, o ? (typeof R.open === 'function' ? R.open(g) : R.open) : R.shut);
    }
    const closed = Object.values(REGIONS).filter(r => !r.open);
    if (closed.length) seal('The roads beyond', false, `${closed.map(r => r.name.replace(/^The /, '')).join(', ')}: sealed. ${act1 ? 'The way opens in a later chapter.' : 'Not in this chapter.'}`);
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
