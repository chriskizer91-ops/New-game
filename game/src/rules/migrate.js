// The v1 -> v2 save migration (M3 spec §4.9, exact). Pure: never mutates its input. Injected into
// core/save.js as loadGame(migrate) / importCode(code, migrate), so core/ imports nothing game-specific.
// Imports data only (A6): encounters, heroes, world, maps/index.
// Owner: WP2.

import { GAUNTLET, ENCOUNTERS } from '../data/encounters.js';
import { STARTERS } from '../data/heroes.js';
import { HEARTHS } from '../data/world.js';
import { MAPS, v1Anchor } from '../data/maps/index.js';

const NEW_FLAGS = ['story', 'unlocked', 'opened', 'kindled', 'visits', 'quests', 'scouted', 'seen', 'worn', 'beaten'];
const V1_STORY = [['met-dael', 'thornhollow'], ['bounty-briarmaw', 'thornhollow']];
const V1_UNLOCKS = [['bramble-toll-chain', 'verdant-edge'], ['tw-thornwall', 'bramble-deep']];

export function starterOf(g) {
  const claimed = Object.keys(STARTERS).filter(id => g.codex?.[id]?.claimed);
  if (claimed.length === 1) return claimed[0];
  const w = g.party.roster.warden, it = g.inventory.find(i => i.uid === w.gear.weapon);
  return STARTERS[it?.base] ? it.base : (claimed[0] || 'hearthbrand');
}

export function migrate(save) {
  if (!save || typeof save !== 'object' || !save.version) throw new Error('Not an Aethermoor save');
  if (!save.party?.roster?.warden || !save.progress?.flags) throw new Error('The save is missing its party or progress');
  const v = structuredClone(save), p = v.progress, f = p.flags;
  for (const k of NEW_FLAGS) if (!f[k] || typeof f[k] !== 'object') f[k] = {};
  if (v.version >= 2) {                                        // v2: only fill what is missing
    if (!p.pos) { const h = HEARTHS[p.lastHearthfire] || HEARTHS['hearthstone-keep']; p.pos = { map: h.map, x: h.x, y: h.y, face: h.face }; }
    p.act ??= 1; f.story.starter ??= starterOf(v); return v;
  }
  const at = Math.max(0, GAUNTLET.indexOf(p.node));
  const looped = (f.runs || 0) > 0 || (p.brands || []).length > 0;
  const reached = id => looped || at >= GAUNTLET.indexOf(id);
  Object.assign(f.story, { starter: starterOf(v), 'm2-save': true, 'intro-done': true });
  for (const [flag, id] of V1_STORY) if (reached(id)) f.story[flag] = true;
  for (const [ent, id] of V1_UNLOCKS) if (reached(id)) f.unlocked[ent] = true;
  for (const id of GAUNTLET) {
    const e = ENCOUNTERS[id];
    if (e.type === 'hearthfire' && reached(id)) f.kindled[id] = true;
    if (e.type === 'fight' && (f.cleared[id] || f.done[id] || (looped && id !== 'keep-vault') || (looped && f.done[id]))) f.beaten[id] = 1;
  }
  if (!HEARTHS[p.lastHearthfire]) p.lastHearthfire = 'hearthstone-keep';
  f.kindled[p.lastHearthfire] = true;
  const a = v1Anchor(p.node) || v1Anchor('hearthstone-keep');
  p.pos = { map: a.map, x: a.x, y: a.y, face: a.face };
  p.act = 1; v.version = 2; v.migratedFrom = 1;
  return v;                         // cleared, done, grudges, day, runs, waking, brands and node are untouched
}

// A pasted code is untrusted: before it replaces the journey on this device, check that the migrated
// save has the shape the game walks on (not its balance). Returns what is wrong, [] when it is sound.
export function saveProblems(g) {
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const num = v => typeof v === 'number' && Number.isFinite(v);
  if (!obj(g)) return ['it is not a save'];
  const out = [];
  if (g.version !== 2) out.push('its version');
  if (!Array.isArray(g.inventory) || !g.inventory.every(it => obj(it) && typeof it.uid === 'string' && typeof it.base === 'string')) out.push('its items');
  const roster = g.party?.roster, active = g.party?.active;
  if (!obj(roster) || !obj(roster.warden)) out.push('its party');
  else {
    if (!Array.isArray(active) || !active.length || active.length > 4 || !active.every(id => typeof id === 'string' && obj(roster[id]))) out.push('its active party');
    for (const [id, h] of Object.entries(roster)) {
      const ok = obj(h) && num(h.level) && obj(h.base) && obj(h.gear) && Object.values(h.gear).every(u => u == null || typeof u === 'string')
        && (h.domains == null || obj(h.domains)) && (h.hp == null || num(h.hp));
      if (!ok) out.push(`the hero ${id}`);
    }
  }
  if (!num(g.gold)) out.push('its gold');
  if (!obj(g.codex)) out.push('its codex');
  const p = g.progress, f = p?.flags;
  if (!obj(p) || !obj(f)) out.push('its progress');
  else {
    for (const k of ['cleared', 'done', 'grudges', ...NEW_FLAGS]) if (!obj(f[k])) out.push(`its ${k} flags`);
    if (!Array.isArray(p.brands ?? [])) out.push('its Brands');
    if (!num(p.waking ?? 0)) out.push('its Waking');
    const pos = p.pos, map = obj(pos) ? MAPS[pos.map] : null;
    if (!map || !Number.isInteger(pos.x) || !Number.isInteger(pos.y) || pos.x < 0 || pos.y < 0 || pos.x >= map.w || pos.y >= map.h) out.push('where you stand');
  }
  return out;
}
