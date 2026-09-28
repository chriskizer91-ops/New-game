// The story runner (M3 spec §4.4): NPC talk, dialogue nodes and their effects, Domain checks and
// contests, quests derived from conditions, bounties and the Ladder. Pure: every function returns a
// new game and never mutates its input. Rolls come from game.rngState.
//
// talkTo(game, npcId) -> dialogueId | null
// dialogueView(game, id) -> { id, lines: [{ speaker, name, text }], choices: [{ i, text, odds: null | { pct, label, hero } }] }
// enterDialogue(game, id) -> { game, events }            applies node.do once
// choose(game, id, i) -> { game, next: dialogueId | null, events, roll: null | { label, dc, total, nat, pass, parts? } }
// questLog(game) -> [{ id, name, kind, state: 'active'|'ready'|'done', step: { text, target } }]   (hidden omitted)
// nextObjective(game) -> { text, map, entity } | null
// claimQuest(game, id) -> { game, events }               id may be 'bounty:<bountyId>' to turn a bounty in,
//                                                        or 'bounties' to turn in every settled one
// bounties(game) -> [{ id, enc, name, gold, state: 'active'|'ready'|'done' }]
// ladder(game) -> [{ id, name, act, state: 'silhouette'|'scouted'|'settled' }]
// afterDialogue(game, encId, result) -> dialogueId | null   what to play back from a fight ('victory'|'yield')
// restDialogue(game, hfId) -> dialogueId | null             what to play after resting (the Fawnrest dream)
// pendingLetter(game) -> brandId | null                     a held Brand whose Unsmith letter is unread
// readLetter(game, brandId) -> game                         marks it read (story['letter:<brandId>'])
// Events: { t: 'fight', enc } { t: 'open', screen } { t: 'item', item } { t: 'gold', n } { t: 'letter', id } { t: 'end', act }
// Import direction (A6): world -> story -> cond -> gauntlet. Never import world here.
// Owner: WP1.

import { NPCS } from '../data/npcs.js';
import { DIALOGUE, AFTER, RESTS } from '../data/dialogue.js';
import { LETTERS } from '../data/letters.js';
import { QUESTS, BOUNTIES } from '../data/quests.js';
import { LADDER } from '../data/ladder.js';
import { HEROES } from '../data/heroes.js';
import { DOMAINS } from '../data/domains.js';
import { check, questState, bountyState, flagsOf, storyOf } from './cond.js';
import { deriveHero } from './stats.js';
import { generateItem, relicItem } from './loot.js';
import { mod, ibFor, rngFrom } from './util.js';

// ---- talking ------------------------------------------------------------------------------------

export function talkTo(game, npcId) {
  const t = NPCS[npcId]?.talk.find(x => check(game, x.if));
  return t ? t.d : null;
}

function speakerName(game, speaker) {
  if (speaker === 'narrator') return '';
  if (speaker === 'warden') return game.party.roster.warden?.name || HEROES.warden.name;
  if (HEROES[speaker]) return game.party.roster[speaker]?.name || HEROES[speaker].name;
  return NPCS[speaker]?.name || speaker;
}
const fill = (game, text) => String(text).replaceAll('{warden}', game.party.roster.warden?.name || 'Warden');

// ---- checks -------------------------------------------------------------------------------------

// The best active hero's bonus for a Domain (or a raw ability): d20 + IB(domain level) + mod(ability).
function bonusFor(game, { domain, ability }) {
  let best = { bonus: -99, heroId: null };
  for (const id of game.party.active) {
    const h = game.party.roster[id];
    const ab = ability || DOMAINS[domain]?.ability || 'WIS';
    const lv = domain ? (h.domains?.[domain]?.level || 0) : 0;
    const bonus = (lv > 0 ? ibFor(lv) : 0) + mod(h.base?.[ab]);
    if (bonus > best.bonus) best = { bonus, heroId: id };
  }
  return best;
}
const labelOf = c => `${c.domain ? DOMAINS[c.domain]?.name.split(' ')[0] : c.ability} DC ${c.dc}`;
function passChance(game, c) {
  const { bonus, heroId } = bonusFor(game, c);
  const p = Math.max(0, Math.min(1, (21 - (c.dc - bonus)) / 20));
  return { p: c.adv && check(game, c.adv) ? 1 - (1 - p) ** 2 : p, heroId };
}
function oddsFor(game, choice) {
  if (choice.check) {
    const { p, heroId } = passChance(game, choice.check);
    return { pct: Math.round(p * 100), label: labelOf(choice.check), hero: speakerName(game, heroId) };
  }
  if (choice.contest) {
    // exact: the chance of at least `need` passes over independent checks
    let dist = [1];
    for (const c of choice.contest.checks) {
      const { p } = passChance(game, c);
      const next = new Array(dist.length + 1).fill(0);
      dist.forEach((q, k) => { next[k] += q * (1 - p); next[k + 1] += q * p; });
      dist = next;
    }
    const win = dist.slice(choice.contest.need).reduce((a, b) => a + b, 0);
    return { pct: Math.round(win * 100), label: `Contest: ${choice.contest.need} of ${choice.contest.checks.length}`, hero: null };
  }
  return null;
}
function rollCheck(game, rng, c) {
  const { bonus } = bonusFor(game, c);
  const adv = !!(c.adv && check(game, c.adv));
  const a = rng.int(1, 20), b = adv ? rng.int(1, 20) : a;
  const nat = Math.max(a, b), total = nat + bonus;
  return { label: labelOf(c), dc: c.dc, total, nat, pass: total >= c.dc };
}

export function dialogueView(game, id) {
  const node = DIALOGUE[id];
  if (!node) return null;
  return {
    id,
    lines: node.lines.map(([speaker, text]) => ({ speaker, name: speakerName(game, speaker), text: fill(game, text) })),
    choices: (node.choices || []).map((c, i) => ({ c, i })).filter(({ c }) => check(game, c.if))
      .map(({ c, i }) => ({ i, text: fill(game, c.text), odds: oddsFor(game, c) })),
  };
}

// ---- effects ------------------------------------------------------------------------------------

function healAll(g) {
  for (const [id, h] of Object.entries(g.party.roster)) {
    const d = deriveHero(h, g.inventory);
    g.party.roster[id] = { ...h, hp: d.maxHp, mp: d.maxMp };
  }
}

// Apply effects to a structuredClone'd game `g` (mutated here only), pushing events.
function apply(g, effects, rng, events) {
  const f = g.progress.flags;
  f.story = f.story || {};
  for (const e of effects || []) {
    if ('set' in e) f.story[e.set] = e.value === 'day' ? f.day : (e.value ?? true);
    else if ('unset' in e) delete f.story[e.unset];
    else if ('give' in e) {
      const item = relicItem(e.give, rng, { from: 'a gift', day: f.day });
      g.inventory.push(item);
      g.codex[e.give] = { sighted: true, awakened: false, ...g.codex[e.give], claimed: true };
      events.push({ t: 'item', item });
    } else if ('item' in e) {
      const item = generateItem(rng, { ...e.item, ilvl: e.item.ilvl || 1, provenance: { from: 'a gift', day: f.day } });
      g.inventory.push(item);
      events.push({ t: 'item', item });
    } else if ('gold' in e) { g.gold += e.gold; events.push({ t: 'gold', n: e.gold }); }
    else if ('bag' in e) for (const [id, n] of Object.entries(e.bag)) g.bag[id] = (g.bag[id] || 0) + n;
    else if ('unlock' in e) f.unlocked = { ...(f.unlocked || {}), [e.unlock]: true };
    else if ('heal' in e) healAll(g);
    else if ('fight' in e) events.push({ t: 'fight', enc: e.fight });
    else if ('claim' in e) claimInto(g, e.claim, rng, events);
    else if ('open' in e) events.push({ t: 'open', screen: e.open });
    else if ('letter' in e) { f.story[`letter:${e.letter}`] = true; events.push({ t: 'letter', id: e.letter }); }
    else if ('end' in e) events.push({ t: 'end', act: e.end });
  }
}

function run(game, fn) {
  const g = structuredClone(game);
  const rng = rngFrom(g.rngState);
  const events = [];
  const extra = fn(g, rng, events) || {};
  g.rngState = rng.getState();
  return { game: g, events, ...extra };
}

export function enterDialogue(game, id) {
  const node = DIALOGUE[id];
  if (!node?.do?.length) return { game, events: [] };
  return run(game, (g, rng, events) => { apply(g, node.do, rng, events); });
}

export function choose(game, id, i) {
  const c = DIALOGUE[id]?.choices?.[i];
  if (!c) return { game, next: null, events: [], roll: null };
  return run(game, (g, rng, events) => {
    apply(g, c.do, rng, events);
    if (c.check) {
      const roll = rollCheck(game, rng, c.check);
      return { next: roll.pass ? c.check.pass : c.check.fail, roll };
    }
    if (c.contest) {
      const parts = c.contest.checks.map(k => rollCheck(game, rng, k));
      const wins = parts.filter(p => p.pass).length;
      const pass = wins >= c.contest.need;
      return { next: pass ? c.contest.pass : c.contest.fail, roll: { label: `Contest: ${c.contest.need} of ${parts.length}`, dc: null, total: wins, nat: null, pass, parts } };
    }
    return { next: c.next || null, roll: null };
  });
}

// ---- quests, bounties, the Ladder ---------------------------------------------------------------

export function questLog(game) {
  const out = [];
  for (const q of Object.values(QUESTS)) {
    const state = questState(game, q.id);
    if (state === 'hidden') continue;
    const s = q.steps.find(x => !check(game, x.done)) || q.steps[q.steps.length - 1];
    out.push({ id: q.id, name: q.name, kind: q.kind, state, step: { text: s.text, target: s.target } });
  }
  return out;
}

export function nextObjective(game) {
  const q = questLog(game).find(x => x.kind === 'main' && x.state === 'active') || questLog(game).find(x => x.state === 'active');
  return q ? { text: q.step.text, map: q.step.target.map, entity: q.step.target.entity } : null;
}

function claimInto(g, id, rng, events) {
  const f = g.progress.flags;
  f.quests = { ...(f.quests || {}) };
  if (id === 'bounties') {
    for (const b of Object.keys(BOUNTIES)) if (bountyState(g, b) === 'ready') claimInto(g, `bounty:${b}`, rng, events);
    return;
  }
  if (id.startsWith('bounty:')) {
    const b = BOUNTIES[id.slice(7)];
    if (!b || bountyState(g, b.id) !== 'ready') return;
    f.quests[id] = 'claimed';
    apply(g, [{ gold: b.gold }], rng, events);
    return;
  }
  if (questState(g, id) !== 'ready') return;
  const r = QUESTS[id].reward || {};
  f.quests[id] = 'claimed';
  apply(g, [
    ...(r.gold ? [{ gold: r.gold }] : []), ...(r.relic ? [{ give: r.relic }] : []),
    ...(r.item ? [{ item: r.item }] : []), ...(r.set ? [{ set: r.set }] : []),
  ], rng, events);
}

export function claimQuest(game, id) {
  return run(game, (g, rng, events) => { claimInto(g, id, rng, events); });
}

export function bounties(game) {
  return Object.values(BOUNTIES).map(b => ({ ...b, state: bountyState(game, b.id) }));
}

export function ladder(game) {
  const scouted = flagsOf(game).scouted || {};
  return LADDER.map(p => ({
    id: p.id, name: p.name, act: p.act, enc: p.enc || null, spawn: p.spawn ?? null,
    state: p.enc && check(game, { beaten: p.enc }) ? 'settled' : (scouted[p.enc] || scouted[p.id]) ? 'scouted' : 'silhouette',
  }));
}

// ---- story beats around fights, rests and Brands ----------------------------------------------------

export function afterDialogue(game, encId, result) {
  const hit = (AFTER[encId] || []).find(a => a.on === result && check(game, a.if));
  return hit ? hit.d : null;
}

export function restDialogue(game, hfId) {
  const hit = RESTS.find(r => r.at === hfId && check(game, r.if));
  return hit ? hit.d : null;
}

export function pendingLetter(game) {
  const story = storyOf(game);
  return [...new Set(game?.progress?.brands || [])].find(b => LETTERS[b] && !story[`letter:${b}`]) || null;
}

export function readLetter(game, brandId) {
  if (storyOf(game)[`letter:${brandId}`]) return game;
  const f = game.progress.flags;
  return { ...game, progress: { ...game.progress, flags: { ...f, story: { ...(f.story || {}), [`letter:${brandId}`]: true } } } };
}
