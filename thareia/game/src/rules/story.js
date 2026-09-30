// The story runner (M3 spec §4.4): NPC talk, dialogue nodes and their effects, Domain checks and
// contests, quests derived from conditions, bounties and the Ladder. Pure: every function returns a
// new game and never mutates its input. Rolls come from game.rngState.
//
// talkTo(game, npcId) -> dialogueId | null
// dialogueView(game, id) -> { id, lines: [{ speaker, name, text }], choices: [{ i, text, odds: null | { pct, label, hero },
//                              price?, disabled?, reasons? }] }   M6: a choice that pays shows its price, disabled when
//                              unaffordable. M7: a choice's `needs: [{ if: cond, why: text }]` shows it disabled, with
//                              the `why` of every part that does not hold (Kindle Anew at the Worldforge's heart)
// enterDialogue(game, id) -> { game, events }            applies node.do once
// choose(game, id, i) -> { game, next: dialogueId | null, events, roll: null | { label, dc, total, nat, pass, parts? } }
// questLog(game) -> [{ id, name, kind, state: 'active'|'ready'|'done', step: { text, target } }]   (hidden omitted)
// nextObjective(game) -> { text, map, entity } | null
// claimQuest(game, id) -> { game, events }               id may be 'bounty:<bountyId>' to turn a bounty in,
//                                                        or 'bounties' to turn in every settled one
// bounties(game) -> [{ id, enc, name, gold, state: 'active'|'ready'|'done' }]
// ladder(game) -> [{ id, name, act, state: 'silhouette'|'scouted'|'settled', found? }]   M6: an entry with an `if` shows once it
//                  holds. M7: a rumour whose `found.if` holds carries `found`, the id of the poster it settled into
// afterDialogue(game, encId, result) -> dialogueId | null   what to play back from a fight ('victory'|'yield')
// restDialogue(game, hfId) -> dialogueId | null             what to play after resting (the Fawnrest dream)
// pendingLetter(game) -> brandId | null                     a held Brand whose Unsmith letter is unread
// readLetter(game, brandId) -> game                         marks it read (story['letter:<brandId>'])
// Events: { t: 'fight', enc } { t: 'open', screen } { t: 'item', item } { t: 'gold', n } { t: 'letter', id } { t: 'end', act }
//         M4: { t: 'gems', gems } { t: 'materials', materials } { t: 'page', id } (a gift finished a Codex page)
// M4 effects: { gems: { [gemId]: n } }, { materials: { scrap?, silver?, embers? } }; quest rewards may
// carry `gems` and `materials` too.
// M6 effects: { scout: encId } marks an encounter scouted, as walking near its holders does (its Ladder poster, its
// relics Sighted: Hodge, whose fight never stands on the map); { pay: { gold?, bag?: { [id]: n }, materials?: { [id]: n } } }
// takes the price (event { t: 'paid', price });
// a choice whose `do` pays is refused (and shown disabled) while the party cannot afford it (cond.js canAfford).
// A check or a contest's check may name an `ability` as well as (or instead of) a `domain`, and a `name` for its
// label (Hodge's toll game: "Deception DC 16").
// M7 effect: { ending: 'rekindle' | 'release' | 'anew' } sets game.ending, once: the choice at the Worldforge's heart is
// final for the save, so a later `ending` changes nothing (event { t: 'ending', id }, only when it is set).
// Import direction (A6): world -> story -> cond -> gauntlet. Never import world here.
// Owner: WP1.

import { NPCS } from '../data/npcs.js';
import { DIALOGUE, AFTER, RESTS } from '../data/dialogue.js';
import { LETTERS } from '../data/letters.js';
import { QUESTS, BOUNTIES } from '../data/quests.js';
import { LADDER } from '../data/ladder.js';
import { TH_OBJECTIVES } from '../data/thareia/objectives.js';
import { HEROES } from '../data/heroes.js';
import { DOMAINS } from '../data/domains.js';
import { check, questState, bountyState, flagsOf, storyOf, canAfford } from './cond.js';
import { deriveHero } from './stats.js';
import { generateItem, relicItem } from './loot.js';
import { spawnsFor, recruit } from './gauntlet.js';
import { pageBonus, markPages } from './codex.js';
import { mod, ibFor, rngFrom, addCounts } from './util.js';

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
const labelOf = c => `${c.name || (c.domain ? DOMAINS[c.domain]?.name.split(' ')[0] : c.ability)} DC ${c.dc}`;
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
      .map(({ c, i }) => {
        const price = priceOf(c);
        const reasons = unmet(game, c);
        return {
          i, text: fill(game, c.text), odds: oddsFor(game, c), ...(price ? { price, ...(canAfford(game, price) ? {} : { disabled: true }) } : {}),
          ...(reasons.length ? { disabled: true, reasons } : {}),
        };
      }),
  };
}

// M7: the `why` of every part of a choice's `needs` that does not hold
const unmet = (game, c) => (c.needs || []).filter(n => !check(game, n.if)).map(n => fill(game, n.why));

// M6: what a choice costs (its `pay` effects, summed), or null
function priceOf(choice) {
  const pays = (choice.do || []).filter(e => 'pay' in e).map(e => e.pay);
  if (!pays.length) return null;
  const out = {};
  for (const p of pays) {
    if (p.gold) out.gold = (out.gold || 0) + p.gold;
    if (p.bag) out.bag = addCounts(out.bag, p.bag);
    if (p.materials) out.materials = addCounts(out.materials, p.materials);
    if (p.gems) out.gems = addCounts(out.gems, p.gems);
  }
  return out;
}

// ---- effects ------------------------------------------------------------------------------------

function healAll(g) {
  const bonus = pageBonus(g);
  for (const [id, h] of Object.entries(g.party.roster)) {
    const d = deriveHero(h, g.inventory, bonus);
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
      for (const id of markPages(g)) events.push({ t: 'page', id });
    } else if ('item' in e) {
      const item = generateItem(rng, { ...e.item, ilvl: e.item.ilvl || 1, provenance: { from: 'a gift', day: f.day } });
      g.inventory.push(item);
      events.push({ t: 'item', item });
    } else if ('gold' in e) { g.gold += e.gold; events.push({ t: 'gold', n: e.gold }); }
    else if ('bag' in e) for (const [id, n] of Object.entries(e.bag)) g.bag[id] = (g.bag[id] || 0) + n;
    else if ('gems' in e) { g.gems = addCounts(g.gems, e.gems); events.push({ t: 'gems', gems: { ...e.gems } }); }
    else if ('materials' in e) { g.materials = addCounts(g.materials, e.materials); events.push({ t: 'materials', materials: { ...e.materials } }); }
    else if ('pay' in e) payInto(g, e.pay, events);
    else if ('scout' in e) scoutInto(g, e.scout);
    else if ('unlock' in e) f.unlocked = { ...(f.unlocked || {}), [e.unlock]: true };
    else if ('heal' in e) healAll(g);
    else if ('fight' in e) events.push({ t: 'fight', enc: e.fight });
    else if ('claim' in e) claimInto(g, e.claim, rng, events);
    else if ('open' in e) events.push({ t: 'open', screen: e.open });
    else if ('letter' in e) { f.story[`letter:${e.letter}`] = true; events.push({ t: 'letter', id: e.letter }); }
    else if ('end' in e) events.push({ t: 'end', act: e.end });
    else if ('ending' in e) { if (g.ending == null) { g.ending = e.ending; events.push({ t: 'ending', id: e.ending }); } }
    // Thareia (T1): a companion joins or leaves; a painted cut-scene; a short line for the toast
    else if ('join' in e) { if (joinInto(g, e.join, rng)) events.push({ t: 'join', hero: e.join }); }
    else if ('leave' in e) { if (leaveFrom(g, e.leave)) events.push({ t: 'leave', hero: e.leave }); }
    else if ('cut' in e) events.push({ t: 'cut', id: e.cut, text: e.text || '' });
    else if ('note' in e) events.push({ t: 'note', text: e.note });
  }
}

// Thareia (T1): a hero joins at the party's level (rules/gauntlet.js recruit), into the line when there is room
function joinInto(g, id, rng) {
  if (!HEROES[id] || g.party.roster[id]) return false;
  const level = Math.max(1, ...g.party.active.map(h => g.party.roster[h]?.level || 1));
  g.party.roster[id] = recruit(g, id, rng, { level: HEROES[id].guestLevel ? level + HEROES[id].guestLevel : level });
  if (g.party.active.length < 4) g.party.active = [...g.party.active, id];
  return true;
}
// a guest leaves with the gear on their back
function leaveFrom(g, id) {
  const h = g.party.roster[id];
  if (!h || id === 'warden') return false;
  const worn = new Set(Object.values(h.gear || {}).filter(Boolean));
  g.inventory = g.inventory.filter(it => !worn.has(it.uid));
  delete g.party.roster[id];
  g.party.active = g.party.active.filter(x => x !== id);
  return true;
}

// M6: an encounter scouted from talk (world.js sightEncounter does the same when you walk near its holders)
function scoutInto(g, encId) {
  const f = g.progress.flags;
  if (f.scouted?.[encId]) return;
  for (const s of spawnsFor(g, encId)) for (const r of [...(s.held || []).map(h => h.relic), s.wears].filter(Boolean)) g.codex[r] = { claimed: false, awakened: false, ...g.codex[r], sighted: true };
  f.scouted = { ...(f.scouted || {}), [encId]: true };
}

// M6: take a price the party can afford (choose() refuses a choice it cannot)
function payInto(g, price, events) {
  const minus = o => Object.fromEntries(Object.entries(o || {}).map(([k, n]) => [k, -n]));
  if (price.gold) g.gold -= price.gold;
  if (price.bag) g.bag = addCounts(g.bag, minus(price.bag));
  if (price.materials) g.materials = addCounts(g.materials, minus(price.materials));
  if (price.gems) g.gems = addCounts(g.gems, minus(price.gems)); // M7
  events.push({ t: 'paid', price: structuredClone(price) });
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
  const price = priceOf(c);
  if (price && !canAfford(game, price)) return { game, next: null, events: [], roll: null }; // M6: shown disabled
  if (unmet(game, c).length) return { game, next: null, events: [], roll: null }; // M7: shown disabled, with its reasons
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
  if (q) return { text: q.step.text, map: q.step.target.map, entity: q.step.target.entity };
  // Thareia (T1): the Prologue's steps
  const t = game?.world === 'thareia' ? TH_OBJECTIVES.find(o => check(game, o.if)) : null;
  return t ? { text: t.text, map: t.map, entity: t.entity } : null;
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
  // every step done is enough, even if the giver was never met first: the Wilds are open, and a
  // thank-you must never leave a quest stuck at "ready"
  const q = QUESTS[id];
  if (!q || questState(g, id) === 'done' || !q.steps.every(s => check(g, s.done))) return;
  const r = q.reward || {};
  f.quests[id] = 'claimed';
  apply(g, [
    ...(r.gold ? [{ gold: r.gold }] : []), ...(r.relic ? [{ give: r.relic }] : []),
    ...(r.item ? [{ item: r.item }] : []), ...(r.set ? [{ set: r.set }] : []),
    ...(r.gems ? [{ gems: r.gems }] : []), ...(r.materials ? [{ materials: r.materials }] : []),
  ], rng, events);
}

export function claimQuest(game, id) {
  return run(game, (g, rng, events) => { claimInto(g, id, rng, events); });
}

export function bounties(game) {
  if (game?.world === 'thareia') return []; // Thareia (T1): the old game's bounties are not Thareia's
  return Object.values(BOUNTIES).map(b => ({ ...b, state: bountyState(game, b.id) }));
}

export function ladder(game) {
  if (game?.world === 'thareia') return [];
  const scouted = flagsOf(game).scouted || {};
  return LADDER.filter(p => check(game, p.if)).map(p => ({
    id: p.id, name: p.name, act: p.act, enc: p.enc || null, spawn: p.spawn ?? null,
    state: p.enc && check(game, { beaten: p.enc }) ? 'settled' : (scouted[p.enc] || scouted[p.id]) ? 'scouted' : 'silhouette',
    ...(p.found && check(game, p.found.if) ? { found: p.found.poster } : {}),
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
