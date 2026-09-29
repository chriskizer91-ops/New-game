// The overworld engine (M3 spec §4.5). Pure and deterministic: never touches the DOM, Math.random or
// Date, and never mutates its inputs. The UI drives it one tick per step plus an idle tick.
//
// Walk   = { map, visit, x, y, face, tick, rng, grace, gone: {}, roamers: [Roamer] }
// Roamer = { id, enc|null, zone|null, spawns, lead: { family, variant, art, gearTier, count }, x, y, home: [x, y],
//            leash, face, mood: 'wander'|'alert'|'chase'|'return'|'flee'|'stunned', wait, weak, trackless, hunter }
//
// enterMap(game, { map, anchor } | { map, at: [x, y], face }) -> { game, walk, events }
// move(game, walk, dir, { run = false } = {}) -> { game, walk, events }      dir 'n'|'e'|'s'|'w'
// interact(game, walk) -> { game, walk, events }          acts on the tile you face
// tick(game, walk) -> { game, walk, events }              idle tick (every 400 ms standing still)
// afterBattle(game, walk, { roamerId, result }) -> walk   back from a fight: grace, and the roamer
//                                                         is gone (victory) or stunned (fled)
// commit(game, walk) -> game                              writes progress.pos; same object if unchanged
// present(game, mapId) -> [Entity & { solid, state, glint, grudge, name, lead }]   (memoised per game object)
// canWalk(game, mapId, x, y, { dir, roamer = false } = {}) -> boolean
// findPath(game, walk, [x, y], { max = 48, adjacent = false } = {}) -> [[x, y], ...] | null
// threat(game, encId) -> { level, party, rating: 'easy'|'fair'|'hard'|'deadly', tier, spawns, held, wears, grudge }
// keys(game) -> { powers: { [powerId]: relicId }, domains: { [domainId]: { level, heroId } } }
// lockStatus(game, lockType) -> { open, soft, by, keys: [{ kind: 'power'|'domain', id, label, have, detail }] }
// openLock(game, entityId) -> { game, ok, by }
// openChest(game, entityId) -> { game, ok, items, gold, bag, materials, gems }   (M4: loot.materials, loot.gems)
// sightEncounter(game, encId) -> game                 light(game, walk) -> 2 | Infinity
// isWeak(game, spawns) -> boolean
//
// Events (in order; the UI stops at the first battle-starting one: encounter, contact):
//   turn { face }  step { x, y, run }  bump { id? }  exit { id, to, anchor, unlock? }
//   sealed { id, region, text, hint, nextChapter }   hint: what opens a gated exit (M4.5)
//   encounter { id }  gate { id, text, guard }  lock { id, lock, status }  trigger { id, dialogue }
//   sighted { relic, enc }  hazard { pct, hurt: { heroId: hp lost } }  talk { npc, dialogue, enc? }
//   sign { text }  use { kind, id }  chest { id, lock? }  hearthfire { id }  enter { map }
//   alert { id, hunter? }               a roamer noticed you ("!"; M4: a Grudge's hunter shows a red one)
//   roam { moves: [[id, x, y, face]] }  roamers that moved this tick
//   contact { id, enc, by: 'player'|'roamer', firstStrike, ambush, weak? }   a battle with roamer `id`;
//                                       weak: a pack that runs from you, run down (M4.5: no Routs, a full
//                                       battle; startBattle's `caught`)
//
// Roamers (spec §4.5 "Roamer rules"; numbers in TUNING.world): authored `pack` encounters and zone
// patrols are seeded on enterMap from their own RNG stream (walk.rng, never game.rngState), so a
// Walk is plain JSON and the same inputs always give the same Walk. They wander within `leash` of
// home, notice you within `sight` (line of sight), wait, then chase on 2 of every 3 ticks and give up
// past leash + 6 from home. Weak packs (all rabble, no relics, top level <= party level - fleeGap)
// flee instead, on 4 of every 5 ticks; catching one is a full battle (Milestone 4.5: no Routs).
// Walking into a pack's back is a First Strike; a pack walking into yours is an ambush. They never enter exits, doors, stairs,
// lock or gate areas, Hearthfire stands, entity tiles or 1-wide corridors.
// M4 (spec §4.6): a pack with an unsettled Grudge is a hunter: it sees TUNING.world.hunterSight
// farther, is never weak (never flees), and its chase ignores the leash until you leave
// the map. Saltglass's Longsight widens the Sighted range (spec §4.7).
// registerMap() lets tests use test/fixtures/map-mini.mjs.
// Import direction (A6): world -> story -> cond -> gauntlet.
// Owner: WP1.

import { MAPS, anchor as mapAnchor } from '../data/maps/index.js';
import { tileOf } from '../data/tiles.js';
import { LOCKS } from '../data/locks.js';
import { RELICS } from '../data/relics.js';
import { DOMAINS } from '../data/domains.js';
import { ENCOUNTERS, PATROLS } from '../data/encounters.js';
import { ZONES } from '../data/world.js';
import { ARRIVALS } from '../data/dialogue.js';
import { TUNING } from '../data/tuning.js';
import { createRng } from '../core/rng.js';
import { check, ownedRelics, bestDomain, flagsOf } from './cond.js';
import { talkTo } from './story.js';
import { spawnsFor, partyLevel } from './gauntlet.js';
import { familyOf, escalateSpawn } from './foe.js';
import { generateItem } from './loot.js';
import { deriveHero } from './stats.js';
import { pageBonus } from './codex.js';
import { addCounts } from './util.js';
import { aStar, DIRS, DIR_KEYS } from './path.js';

const TW = TUNING.world;

// ---- maps -------------------------------------------------------------------------------------------

const EXTRA = new Map();
// Test fixtures only (test/fixtures/map-mini.mjs): make a map visible to the engine by id.
export function registerMap(map) { EXTRA.set(map.id, map); }
export const mapOf = id => EXTRA.get(id) || MAPS[id] || null;
function anchorOf(mapId, name) {
  if (MAPS[mapId]) return mapAnchor(mapId, name);
  const a = mapOf(mapId)?.anchors?.[name];
  return a ? { map: mapId, x: a[0], y: a[1], face: a[2] } : null;
}

const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
export const covers = (e, x, y) => { const [x0, y0, x1, y1] = areaOf(e); return x >= x0 && x <= x1 && y >= y0 && y <= y1; };
const exitAt = (map, x, y) => map.exits.find(e => covers(e, x, y)) || null;

// ---- presence -----------------------------------------------------------------------------------------

const LEVEL = { rabble: 0, veteran: 1, 'relic-bearer': 2, champion: 3 };
const MEMO = new WeakMap();

function encounterInfo(game, encId) {
  const spawns = ENCOUNTERS[encId]?.spawns ? spawnsFor(game, encId) : [];
  const lead = spawns.slice().sort((a, b) => LEVEL[familyOf(b).tier] - LEVEL[familyOf(a).tier])[0];
  const fam = lead && familyOf(lead);
  return {
    spawns,
    name: lead ? (lead.name || fam.name) : ENCOUNTERS[encId]?.name || encId,
    lead: lead ? { family: lead.family, variant: lead.variant || null, art: fam.art, gearTier: lead.gearTier || 0, count: spawns.length } : null,
    glint: spawns.some(s => (s.held || []).some(h => h.relic) || s.wears),
    grudge: spawns.find(s => s.grudge)?.title || null,
  };
}

function entityState(game, e) {
  const f = flagsOf(game);
  switch (e.kind) {
    case 'encounter': {
      if (f.done?.[e.enc] || f.cleared?.[e.enc]) return null;
      const info = encounterInfo(game, e.enc);
      return { solid: e.mode !== 'pack', state: 'present', glint: info.glint, grudge: info.grudge, name: info.name, lead: info.lead };
    }
    case 'hearthfire': return { solid: true, state: e.cold && !f.kindled?.[e.id] ? 'cold' : 'lit' };
    case 'gate': { const open = check(game, e.open); return { solid: !open, state: open ? 'open' : 'closed' }; }
    case 'lock': {
      const open = !!f.unlocked?.[e.id];
      return { solid: !open && !LOCKS[e.lock]?.soft, state: open ? 'open' : 'locked' };
    }
    case 'chest': return { solid: true, state: f.opened?.[e.id] ? 'opened' : 'closed' };
    case 'trigger': case 'light': return { solid: false, state: 'idle' };
    case 'prop': return { solid: !!e.solid, state: 'idle' };
    default: return { solid: true, state: 'idle' };
  }
}

export function present(game, mapId) {
  let byMap = MEMO.get(game);
  if (!byMap) { byMap = new Map(); MEMO.set(game, byMap); }
  if (byMap.has(mapId)) return byMap.get(mapId);
  const map = mapOf(mapId);
  const out = [];
  for (const e of map?.entities || []) {
    if (!check(game, e.if)) continue;
    const st = entityState(game, e);
    if (st) out.push({ glint: false, grudge: null, name: e.name || null, lead: null, ...e, ...st });
  }
  byMap.set(mapId, out);
  return out;
}

// ---- walking ----------------------------------------------------------------------------------------

export function canWalk(game, mapId, x, y, { dir = null, roamer = false } = {}) {
  const map = mapOf(mapId);
  if (!map || x < 0 || y < 0 || x >= map.w || y >= map.h) return false;
  const t = tileOf(map.rows[y][x]);
  if (t.solid) return false;
  const exit = exitAt(map, x, y);
  if (t.oneWay && dir !== 's' && !exit) return false;
  if (roamer && (t.noRoam || exit)) return false;
  return !present(game, mapId).some(e => e.solid && covers(e, x, y));
}

function newWalk(game, map, pos, visit) {
  const rng = createRng(`roam:${game.seed}:${map.id}:${visit}`);
  const walk = { map: map.id, visit, x: pos.x, y: pos.y, face: pos.face || 's', tick: 0, rng: 0, grace: 0, gone: {}, roamers: [] };
  walk.roamers = seedRoamers(game, map, walk, rng);
  walk.rng = rng.getState();
  return walk;
}

function fireTriggers(g, map, x, y, on, events) {
  const f = g.progress.flags;
  for (const e of present(g, map.id)) {
    if (e.kind !== 'trigger' || e.on !== on || !covers(e, x, y)) continue;
    if (e.once && f.seen?.[e.id]) continue;
    events.push({ t: 'trigger', id: e.id, dialogue: e.dialogue });
    if (e.once) f.seen = { ...(f.seen || {}), [e.id]: true };
  }
}

// A position inside something solid (a save carried over from before a Milestone 4.5 road gate or its
// new terrain stood there) moves to the nearest free tile, breadth-first in n, e, s, w order. On a map
// with roads it must be a tile of the save's own stretch of road (or one before it): the save's stretch is
// how many of the road's gates, in order, stand between the road's start and the free tiles nearest the
// save, with every gate shut and its guard standing. So a save that walked past a fight in M4 stays past
// it, and a nudge never lands beyond a gate the save had not passed. A free position stays put.
function freeSpot(game, map, x, y) {
  const here = present(game, map.id);
  const W = map.w;
  const inside = (tx, ty) => tx >= 0 && ty >= 0 && tx < W && ty < map.h;
  const solid = (tx, ty) => tileOf(map.rows[ty][tx]).solid || here.some(e => e.solid && covers(e, tx, ty));
  if (!solid(x, y)) return [x, y];
  // the free tiles nearest the save: the first ring of a breadth-first search that has any
  let ring = [[x, y]], nearest = [];
  const ringSeen = new Set([y * W + x]);
  while (ring.length && !nearest.length) {
    const next = [];
    for (const [cx, cy] of ring) for (const k of DIR_KEYS) {
      const nx = cx + DIRS[k][0], ny = cy + DIRS[k][1];
      if (!inside(nx, ny) || ringSeen.has(ny * W + nx)) continue;
      ringSeen.add(ny * W + nx);
      next.push([nx, ny]);
      if (!solid(nx, ny)) nearest.push([nx, ny]);
    }
    ring = next;
  }
  let near = null;
  for (const road of map.roads || []) {
    const a = map.anchors?.[road.from];
    if (!a || solid(a[0], a[1])) continue;
    const parts = road.gates.map(id => {
      const g = map.entities.find(e => e.id === id);
      const guard = g?.guard && map.entities.find(e => e.kind === 'encounter' && e.enc === g.guard);
      return [g, guard].filter(Boolean);
    });
    const on = (list, tx, ty) => list.some(e => covers(e, tx, ty));
    // from the road's start with its first k gates (and their guards) passed; the rest shut with their
    // guards standing (shut), or as things stand
    const flood = (k, shut) => {
      const passed = parts.slice(0, k).flat(), ahead = parts.slice(k).flat();
      const seen = new Uint8Array(W * map.h), q = [[a[0], a[1]]];
      seen[a[1] * W + a[0]] = 1;
      for (let i = 0; i < q.length; i++) for (const d of DIR_KEYS) {
        const nx = q[i][0] + DIRS[d][0], ny = q[i][1] + DIRS[d][1];
        if (!inside(nx, ny) || seen[ny * W + nx]) continue;
        if (!on(passed, nx, ny) && (solid(nx, ny) || (shut && on(ahead, nx, ny)))) continue;
        seen[ny * W + nx] = 1;
        q.push([nx, ny]);
      }
      return seen;
    };
    const stretches = parts.map((_, k) => flood(k, true)).concat([flood(parts.length, true)]);
    let mine = Infinity;
    for (const [fx, fy] of nearest) {
      const k = stretches.findIndex(s => s[fy * W + fx]);
      if (k >= 0) mine = Math.min(mine, k);
    }
    const r = flood(Number.isFinite(mine) ? mine : 0, false);
    near = near || new Uint8Array(W * map.h);
    for (let i = 0; i < r.length; i++) if (r[i]) near[i] = 1;
  }
  const ok = (tx, ty) => !solid(tx, ty) && (!near || near[ty * map.w + tx]);
  const seen = new Set([y * map.w + x]), q = [[x, y]];
  let first = null;
  for (let i = 0; i < q.length; i++) {
    for (const k of DIR_KEYS) {
      const nx = q[i][0] + DIRS[k][0], ny = q[i][1] + DIRS[k][1];
      if (!inside(nx, ny) || seen.has(ny * map.w + nx)) continue;
      seen.add(ny * map.w + nx);
      if (ok(nx, ny)) return [nx, ny];
      if (!first && !solid(nx, ny)) first = [nx, ny];
      q.push([nx, ny]);
    }
  }
  return first || [x, y];
}

export function enterMap(game, target) {
  const map = mapOf(target.map);
  if (!map) throw new Error(`Unknown map ${target.map}`);
  let pos = target.anchor ? anchorOf(map.id, target.anchor) : { x: target.at?.[0], y: target.at?.[1], face: target.face || 's' };
  if (!pos) throw new Error(`Unknown anchor ${target.anchor} on ${map.id}`);
  if (!target.anchor) {
    // a position off the map (a damaged save) enters at the map's first anchor
    const onMap = Number.isInteger(pos.x) && Number.isInteger(pos.y) && pos.x >= 0 && pos.y >= 0 && pos.x < map.w && pos.y < map.h;
    const first = Object.keys(map.anchors || {})[0];
    if (!onMap && first) pos = anchorOf(map.id, first);
    else { const [x, y] = freeSpot(game, map, pos.x, pos.y); pos = { ...pos, x, y }; }
  }
  const g = structuredClone(game);
  const f = g.progress.flags;
  f.visits = { ...(f.visits || {}) };
  const visit = (f.visits[map.id] || 0) + 1;
  f.visits[map.id] = visit;
  const events = [{ t: 'enter', map: map.id }];
  fireTriggers(g, map, pos.x, pos.y, 'enter', events);
  // the party's homecoming lines, once (data/dialogue.js ARRIVALS)
  const home = ARRIVALS[map.id];
  if (home && !f.seen?.[`arrive:${map.id}`]) {
    f.seen = { ...(f.seen || {}), [`arrive:${map.id}`]: true };
    events.push({ t: 'trigger', id: `arrive:${map.id}`, dialogue: home });
  }
  return { game: g, walk: newWalk(g, map, pos, visit), events };
}

export function move(game, walk, dir, { run = false } = {}) {
  const map = mapOf(walk.map);
  const events = [];
  let w = walk;
  if (w.face !== dir) { w = { ...w, face: dir }; events.push({ t: 'turn', face: dir }); }
  const nx = w.x + DIRS[dir][0], ny = w.y + DIRS[dir][1];
  const here = present(game, map.id);
  const at = here.filter(e => covers(e, nx, ny));
  const exit = exitAt(map, nx, ny);
  const gateClosed = at.find(e => e.kind === 'gate' && e.state === 'closed');
  if (exit && !gateClosed) {
    // M4 (spec §4.7): an exit with a `gate` is a way through once the gate holds; until then its
    // `sealed` text stands (the Keep's south-east gate opens into the Sunscorch after Act I)
    if (exit.sealed && !(exit.to && exit.gate && check(game, exit.gate))) {
      // after Act I the UI adds "The way opens in the next chapter." (spec §2.6)
      events.push({ t: 'sealed', id: exit.id, region: exit.sealed.region, text: exit.sealed.text, hint: exit.sealed.hint || null, nextChapter: check(game, { flag: 'act1-complete' }) });
      return { game, walk: w, events };
    }
    let g = game;
    if (exit.unlock && !flagsOf(game).unlocked?.[exit.unlock]) {
      g = structuredClone(game);
      g.progress.flags.unlocked = { ...(g.progress.flags.unlocked || {}), [exit.unlock]: true };
    }
    events.push({ t: 'exit', id: exit.id, to: exit.to, anchor: exit.anchor, ...(exit.unlock ? { unlock: exit.unlock } : {}) });
    return { game: g, walk: w, events };
  }
  const rm = roamerAt(w, nx, ny);
  if (rm) { events.push(touch(game, rm, dir)); return { game, walk: w, events }; }
  const enc = at.find(e => e.kind === 'encounter' && e.mode !== 'pack');
  if (enc) { events.push({ t: 'encounter', id: enc.enc }); return { game, walk: w, events }; }
  if (gateClosed) { events.push({ t: 'gate', id: gateClosed.id, text: gateClosed.text, guard: gateClosed.guard || null }); return { game, walk: w, events }; }
  const lk = at.find(e => e.kind === 'lock' && e.solid);
  if (lk) { events.push({ t: 'lock', id: lk.id, lock: lk.lock, status: lockStatus(game, lk.lock) }); return { game, walk: w, events }; }
  const solid = at.find(e => e.solid);
  if (solid) { events.push({ t: 'bump', id: solid.id }); return { game, walk: w, events }; }
  if (!canWalk(game, map.id, nx, ny, { dir })) { events.push({ t: 'bump' }); return { game, walk: w, events }; }
  w = { ...w, x: nx, y: ny, tick: w.tick + 1, grace: Math.max(0, w.grace - 1) };
  events.push({ t: 'step', x: nx, y: ny, run: !!run });
  let g = game;
  if (here.some(e => e.kind === 'trigger' && e.on === 'step' && covers(e, nx, ny))) {
    g = structuredClone(game);
    fireTriggers(g, map, nx, ny, 'step', events);
  }
  g = sightHolders(g, w, events);
  const ichor = here.find(e => e.kind === 'lock' && e.state === 'locked' && LOCKS[e.lock]?.soft?.hpPct && covers(e, nx, ny));
  if (ichor && !lockStatus(g, ichor.lock).open) g = burn(g, LOCKS[ichor.lock].soft.hpPct, events);
  return { game: g, walk: tickRoamers(g, w, events), events };
}

// Soft ichor: every active hero loses pct of max HP per step, never below 1. A fallen hero (0 HP)
// stays down: the ichor never lifts anyone back to 1.
function burn(game, pct, events) {
  const g = structuredClone(game);
  const hurt = {};
  const bonus = pageBonus(g);
  for (const id of g.party.active) {
    const h = g.party.roster[id];
    const max = deriveHero(h, g.inventory, bonus).maxHp;
    const cur = h.hp ?? max;
    if (cur <= 0) continue;
    const hp = Math.max(1, cur - Math.max(1, Math.round(max * pct)));
    if (hp !== cur) { hurt[id] = cur - hp; g.party.roster[id] = { ...h, hp }; }
  }
  events.push({ t: 'hazard', pct, hurt });
  return Object.keys(hurt).length ? g : game;
}

// Holders you come near are Sighted (their relics get the codex stamp; the Ladder poster is scouted).
function sightHolders(game, walk, events) {
  const T = TW;
  let range = ownedRelics(game).has('thornwatch-hood') ? T.sightRelicWatchful : T.sightRelic;
  if (powerOwned(game, 'longsight')) range += T.longsight;
  if (light(game, walk) !== Infinity) range = Math.min(range, T.darkRadius);
  let g = game;
  for (const e of present(game, walk.map)) {
    // once scouted (sighted or fought), its relics already carry the codex stamp: nothing to do
    if (e.kind !== 'encounter' || e.mode === 'pack' || !e.glint || flagsOf(g).scouted?.[e.enc] || distTo(e, walk.x, walk.y) > range) continue;
    const relics = spawnsFor(g, e.enc).flatMap(s => [...(s.held || []).map(h => h.relic), s.wears]).filter(Boolean);
    const unseen = relics.filter(r => !g.codex[r]?.sighted);
    g = sightEncounter(g, e.enc);
    for (const relic of unseen) events.push({ t: 'sighted', relic, enc: e.enc });
  }
  return g;
}

export function interact(game, walk) {
  const nx = walk.x + DIRS[walk.face][0], ny = walk.y + DIRS[walk.face][1];
  const events = [];
  const rm = roamerAt(walk, nx, ny);
  if (rm) { events.push(touch(game, rm, walk.face)); return { game, walk, events }; }
  const at = present(game, walk.map).filter(e => covers(e, nx, ny) && e.kind !== 'trigger' && e.kind !== 'light' && !(e.kind === 'encounter' && e.mode === 'pack'));
  const e = at[0];
  if (!e) return { game, walk, events };
  switch (e.kind) {
    case 'npc': events.push({ t: 'talk', npc: e.npc, dialogue: talkTo(game, e.npc) }); break;
    case 'sign': events.push({ t: 'sign', text: e.text }); break;
    case 'board': case 'table': case 'pedestal': case 'lookout': case 'bellframe': events.push({ t: 'use', kind: e.kind, id: e.id }); break;
    case 'chest': events.push({ t: 'chest', id: e.id, ...(e.lock ? { lock: e.lock } : {}) }); break;
    case 'lock': events.push({ t: 'lock', id: e.id, lock: e.lock, status: lockStatus(game, e.lock) }); break;
    case 'hearthfire':
      events.push(e.state === 'cold' ? { t: 'lock', id: e.id, lock: 'cold-hearth', status: lockStatus(game, 'cold-hearth') } : { t: 'hearthfire', id: e.id });
      break;
    case 'encounter':
      events.push(e.talk ? { t: 'talk', npc: null, dialogue: e.talk, enc: e.enc } : { t: 'encounter', id: e.enc });
      break;
    case 'gate': if (e.state === 'closed') events.push({ t: 'gate', id: e.id, text: e.text, guard: e.guard || null }); break;
    default: break;
  }
  return { game, walk, events };
}

export function tick(game, walk) {
  const events = [];
  const w = tickRoamers(game, { ...walk, tick: walk.tick + 1, grace: Math.max(0, walk.grace - 1) }, events);
  return { game, walk: w, events };
}

// Back on the map after a fight (spec §4.5 "Grace and stun"): a few ticks with no contact; a
// beaten roamer is gone, one you fled from is stunned.
export function afterBattle(game, walk, { roamerId = null, result = null } = {}) {
  let roamers = walk.roamers;
  let gone = walk.gone;
  if (roamerId && result === 'victory') {
    roamers = roamers.filter(r => r.id !== roamerId);
    gone = { ...gone, [roamerId]: true };
  } else if (roamerId && result === 'fled') {
    roamers = roamers.map(r => (r.id === roamerId ? { ...r, mood: 'stunned', wait: TW.fleeStun } : r));
  }
  return { ...walk, roamers, gone, grace: TW.grace };
}

export function commit(game, walk) {
  const p = game.progress.pos;
  if (p && p.map === walk.map && p.x === walk.x && p.y === walk.y && p.face === walk.face) return game;
  return { ...game, progress: { ...game.progress, pos: { map: walk.map, x: walk.x, y: walk.y, face: walk.face } } };
}

export function findPath(game, walk, [tx, ty], { max = 48, adjacent = false } = {}) {
  const map = mapOf(walk.map);
  return aStar({
    from: [walk.x, walk.y], to: [tx, ty], max, adjacent, w: map.w, h: map.h,
    // exits end a walk: a path may finish on one but never cross one
    passable: (x, y, dir) => canWalk(game, walk.map, x, y, { dir }) && (!exitAt(map, x, y) || (x === tx && y === ty)),
  });
}

// ---- threat, keys and locks ----------------------------------------------------------------------------

export function threat(game, encId) {
  const spawns = spawnsFor(game, encId);
  const party = partyLevel(game);
  const level = Math.max(1, ...spawns.map(s => s.level));
  const tiers = spawns.map(s => familyOf(s).tier);
  const tier = tiers.sort((a, b) => LEVEL[b] - LEVEL[a])[0] || 'rabble';
  const d = level - party + (tier === 'champion' ? 1 : 0);
  const rating = d <= -3 ? 'easy' : d <= 0 ? 'fair' : d <= 3 ? 'hard' : 'deadly';
  return {
    level, party, rating, tier, spawns,
    held: spawns.flatMap(s => (s.held || []).map(h => (h.relic ? { relic: h.relic } : { item: h.item }))),
    wears: spawns.map(s => s.wears).filter(Boolean),
    grudge: spawns.find(s => s.grudge)?.title || null,
  };
}

export function keys(game) {
  const powers = {};
  for (const r of ownedRelics(game)) { const p = RELICS[r].mapPower?.id; if (p && !powers[p]) powers[p] = r; }
  const domains = {};
  for (const d of Object.keys(DOMAINS)) domains[d] = bestDomain(game, d);
  return { powers, domains };
}

export function lockStatus(game, lockType) {
  const L = LOCKS[lockType];
  if (!L) return { open: false, soft: false, by: null, keys: [] };
  const k = keys(game);
  const list = [
    ...L.powers.map(p => {
      const relic = k.powers[p] || null;
      const r = relic ? RELICS[relic] : Object.values(RELICS).find(x => x.mapPower?.id === p);
      return { kind: 'power', id: p, label: r ? r.name : p, have: !!relic, detail: r?.mapPower?.name || p };
    }),
    (() => {
      const best = k.domains[L.domain.id] || { level: 0, heroId: null };
      const who = best.heroId ? game.party.roster[best.heroId]?.name : null;
      return { kind: 'domain', id: L.domain.id, label: `${DOMAINS[L.domain.id].name.split(' ')[0]} ${L.domain.level}`, have: best.level >= L.domain.level, detail: who ? `${who} ${best.level}` : 'nobody' };
    })(),
  ];
  const by = list.find(x => x.have) || null;
  return { open: !!by, soft: !!L.soft, by: by ? (by.kind === 'power' ? k.powers[by.id] : by.id) : null, keys: list };
}

function findEntity(entityId) {
  for (const id of [...EXTRA.keys(), ...Object.keys(MAPS)]) {
    const e = mapOf(id).entities.find(x => x.id === entityId);
    if (e) return { map: id, entity: e };
  }
  return null;
}

export function openLock(game, entityId) {
  const hit = findEntity(entityId);
  if (!hit) return { game, ok: false, by: null };
  const e = hit.entity;
  const type = e.kind === 'hearthfire' ? 'cold-hearth' : e.lock;
  const st = lockStatus(game, type);
  if (!st.open) return { game, ok: false, by: null };
  const g = structuredClone(game);
  const f = g.progress.flags;
  if (e.kind === 'hearthfire') f.kindled = { ...(f.kindled || {}), [e.id]: true };
  else f.unlocked = { ...(f.unlocked || {}), [e.id]: true };
  return { game: g, ok: true, by: st.by };
}

export function openChest(game, entityId) {
  const hit = findEntity(entityId);
  const e = hit?.entity;
  const f = flagsOf(game);
  const none = { game, ok: false, items: [], gold: 0, bag: {}, materials: {}, gems: {} };
  if (!e || e.kind !== 'chest' || f.opened?.[e.id]) return none;
  if (e.lock && !lockStatus(game, e.lock).open) return none;
  const g = structuredClone(game);
  const rng = createRng(`chest:${game.seed}:${e.id}`);
  const ilvl = (mapOf(hit.map).level || 1) + 6 * (game.progress.waking || 0);
  const items = (e.loot.items || []).map(spec => generateItem(rng, { ...spec, ilvl: spec.ilvl || ilvl, provenance: { from: 'a hidden cache', where: mapOf(hit.map).name, day: f.day } }));
  const gold = e.loot.gold || 0, bag = { ...(e.loot.bag || {}) };
  const materials = { ...(e.loot.materials || {}) }, gems = { ...(e.loot.gems || {}) };
  g.inventory.push(...items);
  g.gold += gold;
  for (const [id, n] of Object.entries(bag)) g.bag[id] = (g.bag[id] || 0) + n;
  g.materials = addCounts(g.materials, materials);
  g.gems = addCounts(g.gems, gems);
  const gf = g.progress.flags;
  gf.opened = { ...(gf.opened || {}), [e.id]: true };
  if (e.loot.story) gf.story = { ...(gf.story || {}), [e.loot.story]: true };
  return { game: g, ok: true, items, gold, bag, materials, gems };
}

// ---- sighting, light, weakness ------------------------------------------------------------------------

export function sightEncounter(game, encId) {
  const spawns = spawnsFor(game, encId);
  const relics = spawns.flatMap(s => [...(s.held || []).map(h => h.relic), s.wears]).filter(Boolean);
  const g = structuredClone(game);
  for (const r of relics) g.codex[r] = { claimed: false, awakened: false, ...g.codex[r], sighted: true };
  const f = g.progress.flags;
  f.scouted = { ...(f.scouted || {}), [encId]: true }; // keyed by encounter id (the Ladder reads it by enc)
  return g;
}

export function light(game, walk) {
  const map = mapOf(walk.map);
  if (!map?.dark) return Infinity;
  return lockStatus(game, 'darkness').open ? Infinity : TUNING.world.darkRadius;
}

export function isWeak(game, spawns) {
  if (!spawns?.length) return false;
  if (spawns.some(s => familyOf(s).tier !== 'rabble' || s.relic || s.held || s.wears)) return false;
  const gap = ownedRelics(game).has('dawnbell') ? TUNING.world.fleeGap - 1 : TUNING.world.fleeGap;
  return Math.max(...spawns.map(s => s.level)) <= partyLevel(game) - gap;
}

// ---- roamers -------------------------------------------------------------------------------------------

const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const sq = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
function distTo(e, x, y) {
  const [x0, y0, x1, y1] = areaOf(e);
  return Math.max(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
}
const roamerAt = (walk, x, y) => walk.roamers.find(r => r.x === x && r.y === y) || null;
const powerOwned = (game, power) => [...ownedRelics(game)].some(r => RELICS[r].mapPower?.id === power);
const faceTo = (ax, ay, bx, by) => (Math.abs(bx - ax) >= Math.abs(by - ay) ? (bx >= ax ? 'e' : 'w') : (by >= ay ? 's' : 'n'));

// Where packs may walk (static per map): walkable, not a ledge, door or stair, not an exit, not in
// a lock or gate area, not a Hearthfire stand or any entity tile, and not a 1-wide corridor (a
// walkable tile whose only walkable neighbours are two opposite ones).
const MASKS = new WeakMap();
export function roamMask(map) {
  let m = MASKS.get(map);
  if (m) return m;
  const { w, h } = map;
  const open = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const t = tileOf(map.rows[y][x]);
    return !t.solid && !t.oneWay;
  };
  const blocked = new Uint8Array(w * h);
  const block = a => { for (let y = Math.max(0, a[1]); y <= Math.min(h - 1, a[3]); y++) for (let x = Math.max(0, a[0]); x <= Math.min(w - 1, a[2]); x++) blocked[y * w + x] = 1; };
  for (const e of map.entities) {
    if (e.kind === 'trigger' || e.kind === 'light' || (e.kind === 'encounter' && e.mode === 'pack')) continue;
    block(areaOf(e));
    if (e.kind === 'hearthfire' && e.stand) block([e.stand[0], e.stand[1], e.stand[0], e.stand[1]]);
  }
  for (const x of map.exits) block(x.area);
  m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!open(x, y) || blocked[y * w + x] || tileOf(map.rows[y][x]).noRoam) continue;
      const n = open(x, y - 1), s = open(x, y + 1), e = open(x + 1, y), wv = open(x - 1, y);
      if (n + s + e + wv === 2 && ((n && s) || (e && wv))) continue;
      m[y * w + x] = 1;
    }
  }
  MASKS.set(map, m);
  return m;
}

// Line of sight over tiles (solid tiles block it).
function seesTiles(map, ax, ay, bx, by) {
  let x = ax, y = ay;
  const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 64; guard++) {
    if (x === bx && y === by) return true;
    if ((x !== ax || y !== ay) && tileOf(map.rows[y][x]).solid) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return false;
}

function leadOf(spawns) {
  const lead = spawns.slice().sort((a, b) => LEVEL[familyOf(b).tier] - LEVEL[familyOf(a).tier] || b.level - a.level)[0];
  const fam = familyOf(lead);
  return { family: lead.family, variant: lead.variant || null, art: fam.art, gearTier: lead.gearTier || 0, count: spawns.length };
}

function makeRoamer(game, { id, enc, zone, spawns, x, y, leash, face }) {
  const hunter = !!enc && spawns.some(s => s.grudge);
  return {
    id, enc, zone, spawns, lead: leadOf(spawns), x, y, home: [x, y], leash, face: face || 's',
    mood: 'wander', wait: 0, weak: !hunter && isWeak(game, spawns), trackless: spawns.every(s => familyOf(s).tier === 'rabble'),
    ...(hunter ? { hunter: true } : {}),
  };
}

// Seeding (spec §4.5): authored packs that are not cleared start at home; then 1..roam.max zone
// patrols from PATROLS[zone.sets], at least spawnDistance from you and never within 2 of an exit.
function seedRoamers(game, map, walk, rng) {
  const out = [];
  for (const e of present(game, map.id)) {
    if (e.kind !== 'encounter' || e.mode !== 'pack') continue;
    out.push(makeRoamer(game, { id: e.id, enc: e.enc, zone: null, spawns: spawnsFor(game, e.enc), x: e.at[0], y: e.at[1], leash: e.leash ?? TW.leash, face: e.face }));
  }
  const zone = map.zone && ZONES[map.zone];
  const rects = map.roam?.rects || [];
  if (!zone || !rects.length || !PATROLS[zone.sets]) return out;
  const mask = roamMask(map);
  const count = rng.int(1, Math.max(1, map.roam.max || 1));
  const nearExit = (x, y) => map.exits.some(ex => distTo(ex, x, y) <= 2);
  for (let k = 0; k < count; k++) {
    const set = rng.pick(PATROLS[zone.sets]);
    const level = zone.level + rng.int(0, 1);
    const spawns = set.map((sp, i) => ({ ...escalateSpawn({ ...sp, level }, game.progress.waking || 0, `roam:${map.id}:${walk.visit}:${k}:${i}`), spawnIndex: i }));
    let spot = null;
    for (let tries = 0; tries < 40 && !spot; tries++) {
      const [x0, y0, x1, y1] = rng.pick(rects);
      const x = rng.int(x0, x1), y = rng.int(y0, y1);
      if (x < 0 || y < 0 || x >= map.w || y >= map.h || !mask[y * map.w + x]) continue;
      if (cheb(x, y, walk.x, walk.y) < TW.spawnDistance || nearExit(x, y) || out.some(r => r.x === x && r.y === y)) continue;
      spot = [x, y];
    }
    if (!spot) continue;
    out.push(makeRoamer(game, { id: `patrol-${k}`, enc: null, zone: zone.id, spawns, x: spot[0], y: spot[1], leash: TW.leash, face: DIR_KEYS[rng.int(0, 3)] }));
  }
  return out;
}

// You walk into (or talk to) a roamer: a full fight, with First Strike when you came at its back. A
// weak pack is caught (M4.5: no Routs): a full battle all the same, and it counts for the Rout deed.
function touch(game, r, dir) {
  const weak = !r.hunter && isWeak(game, r.spawns);
  return { t: 'contact', id: r.id, enc: r.enc, by: 'player', firstStrike: r.face === dir && r.mood !== 'chase' && r.mood !== 'alert', ambush: false, ...(weak ? { weak: true } : {}) };
}

// One tick for every roamer (after a step, or an idle tick). Pure: returns a new walk.
function tickRoamers(game, walk, events) {
  if (!walk.roamers.length) return walk;
  const map = mapOf(walk.map);
  const mask = roamMask(map);
  const rng = createRng(0);
  rng.setState(walk.rng);
  const roamers = walk.roamers.map(r => ({ ...r }));
  const px = walk.x, py = walk.y;
  const dark = light(game, walk) !== Infinity;
  const sight = dark ? TW.sightDark : TW.sight;
  const trackless = powerOwned(game, 'trackless');
  const alertWait = powerOwned(game, 'stillness') ? TW.alertWaitStill : TW.alertWait;
  const taken = (x, y) => roamers.some(o => o.x === x && o.y === y);
  const free = (x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && !!mask[y * map.w + x] && !taken(x, y) && !(x === px && y === py);
  const moves = [];
  let contact = null;
  const stepTo = (r, x, y) => { r.face = faceTo(r.x, r.y, x, y); r.x = x; r.y = y; moves.push([r.id, x, y, r.face]); };
  const toward = (r, tx, ty, target) => {
    const path = aStar({ from: [r.x, r.y], to: [tx, ty], max: 24, w: map.w, h: map.h, passable: (x, y) => (target && x === tx && y === ty) || free(x, y) });
    return path && path.length ? path[0] : null;
  };
  for (const r of roamers) {
    if (contact) break;
    r.weak = !r.hunter && isWeak(game, r.spawns);
    const d = cheb(r.x, r.y, px, py);
    const sees = d <= sight + (r.hunter ? TW.hunterSight : 0) && seesTiles(map, r.x, r.y, px, py);
    if (r.mood === 'stunned') {
      r.wait -= 1;
      if (r.wait <= 0) { r.mood = 'return'; r.wait = 0; }
      continue;
    }
    if (r.weak) {
      if (sees) {
        r.mood = 'flee';
        if (walk.tick % 5 === 4) continue;
        // run straight away: the free neighbour farthest from you (squared distance), if any is farther
        let best = null, far = sq(r.x, r.y, px, py);
        for (const k of DIR_KEYS) {
          const x = r.x + DIRS[k][0], y = r.y + DIRS[k][1];
          if (!free(x, y)) continue;
          const dd = sq(x, y, px, py);
          if (dd > far) { far = dd; best = [x, y]; }
        }
        if (best) stepTo(r, best[0], best[1]);
        continue;
      }
      if (r.mood === 'flee' || r.mood === 'chase' || r.mood === 'alert') r.mood = 'wander';
    }
    if (r.mood === 'alert') {
      r.face = faceTo(r.x, r.y, px, py);
      r.wait -= 1;
      if (r.wait <= 0) r.mood = 'chase';
      continue;
    }
    if (r.mood === 'chase') {
      if (!r.hunter && cheb(r.x, r.y, r.home[0], r.home[1]) > r.leash + 6) { r.mood = 'return'; continue; }
      if (walk.tick % 3 === 2) continue;
      const next = toward(r, px, py, true);
      if (!next) continue;
      if (next[0] === px && next[1] === py) {
        r.face = faceTo(r.x, r.y, px, py);
        if (walk.grace > 0) continue;
        contact = { t: 'contact', id: r.id, enc: r.enc, by: 'roamer', firstStrike: false, ambush: walk.face === r.face };
        continue;
      }
      stepTo(r, next[0], next[1]);
      continue;
    }
    if (r.mood === 'return') {
      if (r.x === r.home[0] && r.y === r.home[1]) { r.mood = 'wander'; continue; }
      const next = toward(r, r.home[0], r.home[1], false);
      if (next) stepTo(r, next[0], next[1]); else r.mood = 'wander';
      continue;
    }
    // wander (and notice)
    if (sees && !r.weak && !(trackless && r.trackless)) {
      r.mood = 'alert';
      r.wait = alertWait;
      r.face = faceTo(r.x, r.y, px, py);
      events.push({ t: 'alert', id: r.id, ...(r.hunter ? { hunter: true } : {}) });
      continue;
    }
    if (rng.int(0, 2) !== 0) continue;
    const k = DIR_KEYS[rng.int(0, 3)];
    const x = r.x + DIRS[k][0], y = r.y + DIRS[k][1];
    const inLeash = cheb(x, y, r.home[0], r.home[1]) <= r.leash;
    const homeward = cheb(x, y, r.home[0], r.home[1]) < cheb(r.x, r.y, r.home[0], r.home[1]);
    if (free(x, y) && (inLeash || homeward)) stepTo(r, x, y);
    else r.face = k;
  }
  if (moves.length) events.push({ t: 'roam', moves });
  if (contact) events.push(contact);
  return { ...walk, roamers, rng: rng.getState() };
}
