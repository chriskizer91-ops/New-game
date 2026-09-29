// The display model: what the screen currently shows for each combatant. Events mutate it one
// by one while they animate; after a sequence it is re-synced from the engine's returned state,
// which stays the single source of truth.
import { STATUSES } from '../../data/statuses.js';
import { RELICS } from '../../data/relics.js';
import { familyData } from '../../rules/ai.js';

const clone = x => (x == null ? x : structuredClone(x));

// heroes go by their short name on the field: "Sister Alondra" -> "Alondra"
export function shortName(name) {
  const n = String(name || '');
  const m = n.match(/^(Sister|Brother|Old|Captain|Mother|Father)\s+(.+)$/);
  if (m) return m[2];
  return n.split(' the ')[0];
}

function dunit(u, label) {
  return {
    id: u.id, side: u.side, name: u.name, label: label || (u.side === 'hero' ? shortName(u.name) : u.name), level: u.level, heroId: u.heroId || null,
    tier: u.tier || null, art: u.art || null, family: u.family || null, variant: u.variant || null, gearTier: u.gearTier || 0, wears: u.wears || null,
    hp: u.hp, maxHp: u.maxHp, mp: u.mp ?? 0, maxMp: u.maxMp ?? 0, surge: u.surge ?? 0,
    statuses: clone(u.statuses) || [], ko: !!u.ko, gone: !!u.gone, phase: u.phase || 1,
    held: clone(u.held) || [], intent: clone(u.intent), queue: clone(u.queue) || [], analyzed: !!u.analyzed,
    omens: [...(u.omens || [])], summonedBy: u.summonedBy || null, weaponItem: u.weaponItem || null,
  };
}

// Foes that share a name get letters (Cutpurse A, B, C), kept stable for the whole battle.
export class Labels {
  constructor() { this.map = {}; this.used = {}; }
  assign(state) {
    const foes = state.order.map(id => state.units[id]).filter(u => u.side === 'foe');
    const count = {};
    for (const f of foes) count[f.name] = (count[f.name] || 0) + 1;
    for (const f of foes) {
      if (this.map[f.id]) continue;
      if (count[f.name] > 1 || this.used[f.name]) {
        const n = this.used[f.name] || 0;
        this.used[f.name] = n + 1;
        this.map[f.id] = `${f.name} ${String.fromCharCode(65 + (n % 26))}`;
      } else {
        this.map[f.id] = f.name;
        this.used[f.name] = 1;
      }
    }
    // the first of a pair that was alone at the start keeps a letter once a twin arrives
    return this.map;
  }
  of(id, fallback) { return this.map[id] || fallback; }
}

export function makeDisp(state, labels) {
  labels.assign(state);
  const units = {};
  for (const id of state.order) units[id] = dunit(state.units[id], state.units[id].side === 'foe' ? labels.of(id) : null);
  return { units, order: [...state.order], actor: state.actor };
}

// Re-sync from the engine state; returns ids of units that did not exist before.
export function syncDisp(disp, state, labels) {
  labels.assign(state);
  const added = [];
  for (const id of state.order) {
    if (!disp.units[id]) added.push(id);
    disp.units[id] = dunit(state.units[id], state.units[id].side === 'foe' ? labels.of(id) : null);
  }
  disp.order = [...state.order];
  disp.actor = state.actor;
  return added;
}

export function addUnitFrom(disp, state, id, labels) {
  labels.assign(state);
  const u = state.units[id];
  if (!u) return null;
  disp.units[id] = dunit(u, labels.of(id));
  if (!disp.order.includes(id)) disp.order.push(id);
  return disp.units[id];
}

// A status event on a display unit. M5: `release` (a swallower lets go, a charm is broken by a friend's
// hit) takes the status off like `remove`; an `add` keeps who applied it (`source`) and how a hold reads
// (`label`) when the event carries them (the Player fills them in from the engine state).
export function applyStatus(u, ev) {
  if (!u) return;
  const i = u.statuses.findIndex(s => s.id === ev.status);
  if (ev.op === 'add') {
    const st = { id: ev.status, stacks: ev.stacks || 1, turns: ev.turns ?? null, value: ev.value ?? null };
    if (ev.source) st.source = ev.source;
    if (ev.label) st.label = ev.label;
    if (i >= 0) u.statuses[i] = { ...u.statuses[i], ...st }; else u.statuses.push(st);
  } else if (ev.op === 'remove' || ev.op === 'release' || (ev.op === 'trigger' && ev.stacks === 0)) {
    if (i >= 0) u.statuses.splice(i, 1);
  } else if ((ev.op === 'tick' || ev.op === 'trigger') && i >= 0) {
    u.statuses[i] = { ...u.statuses[i], stacks: ev.stacks || u.statuses[i].stacks, turns: ev.turns ?? u.statuses[i].turns };
  }
}

export const statusName = id => STATUSES[id]?.name || id;
export const harmful = id => !!STATUSES[id]?.harmful;

// ---- M5 (spec §4.2, §5): holds, charms and burrows, read from a unit's statuses ------------------------
// Pure, for the plates, the stage and the ribbon (node tests use them).

// The status that holds a unit out of the line (swallowed), or null.
export const heldStatus = u => (u?.statuses || []).find(s => STATUSES[s.id]?.held) || null;
// A unit nothing can target (burrowed, swallowed): rules/ai.js targetable, from the display copy.
export const untargetable = u => (u?.statuses || []).some(s => STATUSES[s.id]?.untargetable);
export const isCharmed = u => (u?.statuses || []).some(s => STATUSES[s.id]?.charm);
// A foe under the floor: untargetable, and not held by anyone (a foe that dives).
export const isSunk = u => u?.side === 'foe' && untargetable(u) && !heldStatus(u);

// How a hold reads on the hero's plate: { label: 'Held under', by: 'The Rime-Abbot', turns: 2, text }.
// `label` is the status's own ("Held under", "Carried off", "Swallowed"; else the status name), `by` the
// swallower's display name (nameOf(sourceId)), `turns` the turns left (null when unknown).
export function holdInfo(u, nameOf = () => '') {
  const st = heldStatus(u);
  if (!st) return null;
  const label = String(st.label || statusName(st.id));
  const by = (st.source && nameOf(st.source)) || '';
  const turns = Number.isFinite(st.turns) && st.turns > 0 ? st.turns : null;
  const left = turns ? `${turns} ${turns === 1 ? 'turn' : 'turns'} left` : '';
  return { id: st.id, label, by, turns, text: [by ? `${label} by ${by}` : label, left].filter(Boolean).join(', ') };
}

// What a status event lacks for the plate (the engine's `add` event names neither the source nor the
// label): filled in from the unit's entry in the engine state the events lead to, when it is still there.
export function withStatusSource(ev, state) {
  if (ev?.t !== 'status' || ev.op !== 'add' || (ev.source && ev.label)) return ev;
  const st = state?.units?.[ev.target]?.statuses?.find(s => s.id === ev.status);
  if (!st || (!st.source && !st.label)) return ev;
  return { ...ev, source: ev.source || st.source || null, label: ev.label || st.label || null };
}

export function pieceIndex(u, relic) {
  return (u?.held || []).findIndex(p => p.relic === relic || p.item?.base === relic);
}

export function relicLabel(relic, u) {
  if (RELICS[relic]) return RELICS[relic].name;
  const p = (u?.held || []).find(q => q.item?.base === relic);
  return p?.item?.name || 'the relic';
}

// what a foe's move is aimed at, for the intent bubble
export function moveTargetKind(u, moveId) {
  try { return familyData(u).moves[moveId]?.target || 'enemy'; } catch { return 'enemy'; }
}
