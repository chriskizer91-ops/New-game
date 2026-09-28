// The overworld engine (M3 spec §4.5). Pure and deterministic: never touches the DOM, Math.random or
// Date, and never mutates its inputs. The UI drives it one tick per step plus an idle tick.
//
// Walk   = { map, visit, x, y, face, tick, rng, grace, gone: {}, roamers: [Roamer] }
// Roamer = { id, enc|null, zone|null, spawns, lead: { family, variant, art, gearTier, count }, x, y, home: [x, y],
//            leash, face, mood: 'wander'|'alert'|'chase'|'return'|'flee'|'stunned', wait, weak, trackless }
//
// enterMap(game, { map, anchor } | { map, at: [x, y], face }) -> { game, walk, events }
// move(game, walk, dir, { run = false } = {}) -> { game, walk, events }      dir 'n'|'e'|'s'|'w'
// interact(game, walk) -> { game, walk, events }          acts on the tile you face
// tick(game, walk) -> { game, walk, events }              idle tick (every 400 ms standing still)
// commit(game, walk) -> game                              writes progress.pos; same object if unchanged
// present(game, mapId) -> [Entity & { solid, state, glint, grudge, name, lead }]   (memoised per game object)
// canWalk(game, mapId, x, y, { dir, roamer = false } = {}) -> boolean
// findPath(game, walk, [x, y], { max = 48, adjacent = false } = {}) -> [[x, y], ...] | null
// threat(game, encId) -> { level, party, rating: 'easy'|'fair'|'hard'|'deadly', tier, spawns, held, wears, grudge }
// keys(game) -> { powers: { [powerId]: relicId }, domains: { [domainId]: { level, heroId } } }
// lockStatus(game, lockType) -> { open, soft, by, keys: [{ kind: 'power'|'domain', id, label, have, detail }] }
// openLock(game, entityId) -> { game, ok, by }        openChest(game, entityId) -> { game, ok, items, gold, bag }
// sightEncounter(game, encId) -> game                 light(game, walk) -> 2 | Infinity
// isWeak(game, spawns) -> boolean
//
// Events (in order; the UI stops at the first battle-starting one):
//   turn { face }  step { x, y }  bump { id? }  exit { id, to, anchor, unlock? }  sealed { id, region, text }
//   encounter { id }  gate { id, text, guard }  lock { id, lock, status }  trigger { id, dialogue }
//   sighted { relic, enc }  hazard { pct }  talk { npc, dialogue, enc? }  sign { text }  use { kind, id }
//   chest { id, lock? }  hearthfire { id }  enter { map }  alert/roam/contact/rout (roamers; WP1)
//
// SCAFFOLD: a working first cut with no roamers yet (walk.roamers stays []), no sighting and no
// hazard damage. WP1 owns and finishes it. registerMap() lets tests use test/fixtures/map-mini.mjs.
// Import direction (A6): world -> story -> cond -> gauntlet.
// Owner: WP1.

import { MAPS, anchor as mapAnchor } from '../data/maps/index.js';
import { tileOf } from '../data/tiles.js';
import { LOCKS } from '../data/locks.js';
import { RELICS } from '../data/relics.js';
import { DOMAINS } from '../data/domains.js';
import { ENCOUNTERS } from '../data/encounters.js';
import { TUNING } from '../data/tuning.js';
import { createRng } from '../core/rng.js';
import { check, ownedRelics, bestDomain, flagsOf } from './cond.js';
import { talkTo } from './story.js';
import { spawnsFor, partyLevel } from './gauntlet.js';
import { familyOf } from './foe.js';
import { generateItem } from './loot.js';
import { aStar, DIRS } from './path.js';

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
  return { map: map.id, visit, x: pos.x, y: pos.y, face: pos.face || 's', tick: 0, rng: rng.getState(), grace: 0, gone: {}, roamers: [] };
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

export function enterMap(game, target) {
  const map = mapOf(target.map);
  if (!map) throw new Error(`Unknown map ${target.map}`);
  const pos = target.anchor ? anchorOf(map.id, target.anchor) : { x: target.at[0], y: target.at[1], face: target.face || 's' };
  if (!pos) throw new Error(`Unknown anchor ${target.anchor} on ${map.id}`);
  const g = structuredClone(game);
  const f = g.progress.flags;
  f.visits = { ...(f.visits || {}) };
  const visit = (f.visits[map.id] || 0) + 1;
  f.visits[map.id] = visit;
  const events = [{ t: 'enter', map: map.id }];
  fireTriggers(g, map, pos.x, pos.y, 'enter', events);
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
    if (exit.sealed) { events.push({ t: 'sealed', id: exit.id, region: exit.sealed.region, text: exit.sealed.text }); return { game, walk: w, events }; }
    let g = game;
    if (exit.unlock && !flagsOf(game).unlocked?.[exit.unlock]) {
      g = structuredClone(game);
      g.progress.flags.unlocked = { ...(g.progress.flags.unlocked || {}), [exit.unlock]: true };
    }
    events.push({ t: 'exit', id: exit.id, to: exit.to, anchor: exit.anchor, ...(exit.unlock ? { unlock: exit.unlock } : {}) });
    return { game: g, walk: w, events };
  }
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
  const ichor = here.find(e => e.kind === 'lock' && e.state === 'locked' && LOCKS[e.lock]?.soft?.hpPct && covers(e, nx, ny));
  if (ichor && !lockStatus(game, ichor.lock).open) events.push({ t: 'hazard', pct: TUNING.world.hazardPct });
  return { game: g, walk: w, events };
}

export function interact(game, walk) {
  const nx = walk.x + DIRS[walk.face][0], ny = walk.y + DIRS[walk.face][1];
  const at = present(game, walk.map).filter(e => covers(e, nx, ny) && e.kind !== 'trigger' && e.kind !== 'light');
  const e = at[0];
  const events = [];
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
  return { game, walk: { ...walk, tick: walk.tick + 1, grace: Math.max(0, walk.grace - 1) }, events: [] };
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
  if (!e || e.kind !== 'chest' || f.opened?.[e.id]) return { game, ok: false, items: [], gold: 0, bag: {} };
  if (e.lock && !lockStatus(game, e.lock).open) return { game, ok: false, items: [], gold: 0, bag: {} };
  const g = structuredClone(game);
  const rng = createRng(`chest:${game.seed}:${e.id}`);
  const ilvl = (mapOf(hit.map).level || 1) + 6 * (game.progress.waking || 0);
  const items = (e.loot.items || []).map(spec => generateItem(rng, { ...spec, ilvl: spec.ilvl || ilvl, provenance: { from: 'a hidden cache', where: mapOf(hit.map).name, day: f.day } }));
  const gold = e.loot.gold || 0, bag = { ...(e.loot.bag || {}) };
  g.inventory.push(...items);
  g.gold += gold;
  for (const [id, n] of Object.entries(bag)) g.bag[id] = (g.bag[id] || 0) + n;
  const gf = g.progress.flags;
  gf.opened = { ...(gf.opened || {}), [e.id]: true };
  if (e.loot.story) gf.story = { ...(gf.story || {}), [e.loot.story]: true };
  return { game: g, ok: true, items, gold, bag };
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
