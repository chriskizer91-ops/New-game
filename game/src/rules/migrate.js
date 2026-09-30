// Save migrations, pure: never mutate their input. migrate() runs a save of any version up to
// SAVE_VERSION and is injected into core/save.js as loadGame(migrate) / importCode(code, migrate), so
// core/ imports nothing game-specific.
//   toV2(save)   v1 (M2) -> v2 (M3), M3 spec §4.9, exact
//   toV3(save)   v2 (M3) -> v3 (M4, and Milestone 4.5)
//   toV4(save)   v3 -> v4 (M5)
//   toV5(save)   v4 -> v5 (M6)
//   toV6(save)   v5 -> v6 (M7)
// Imports data only (A6): encounters, heroes, world, relics, maps/index.
// Owner: WP2.

import { GAUNTLET, ENCOUNTERS } from '../data/encounters.js';
import { STARTERS } from '../data/heroes.js';
import { HEARTHS } from '../data/world.js';
import { RELICS } from '../data/relics.js';
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

export const SAVE_VERSION = 6;

export function toV2(save) {
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

// M4 (spec §4.1): a Milestone 3 save walks on unchanged, with the forge's purse, the gem pouch, the
// finished Codex pages and the settled Grudges added empty; version 3 marks it as this milestone's.
// Only fills what is missing, so it is idempotent. Item fields (gems, deeds, awakened, rerolls, the
// Chronicle's mightiest and bearers, provenance.grudge) stay optional: absent means none.
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
export function toV3(save) {
  const v = toV2(save), f = v.progress.flags;
  v.materials = isObj(v.materials) ? { scrap: 0, silver: 0, embers: 0, ...v.materials } : { scrap: 0, silver: 0, embers: 0 };
  if (!isObj(v.gems)) v.gems = {};
  for (const k of ['pages', 'settled']) if (!isObj(f[k])) f[k] = {};
  // a whole relic in the bag is Claimed (M2 and M3 reforged a shattered relic without saying so, which
  // left its Codex page one short for good)
  if (isObj(v.codex)) {
    for (const it of Array.isArray(v.inventory) ? v.inventory : []) {
      if (!isObj(it) || !RELICS[it.base] || it.shattered || v.codex[it.base]?.claimed) continue;
      v.codex[it.base] = { sighted: true, awakened: false, ...(isObj(v.codex[it.base]) ? v.codex[it.base] : {}), claimed: true };
    }
  }
  // Milestone 4.5 (docs/M45-SPEC.md A7): a road gate opens on `beaten`, so every fight a save has won
  // (cleared, or done for good) counts as beaten at least once
  if (isObj(f.cleared) || isObj(f.done)) {
    const won = [...Object.keys(isObj(f.cleared) ? f.cleared : {}), ...Object.keys(isObj(f.done) ? f.done : {})]
      .filter(id => ENCOUNTERS[id]?.type === 'fight' && (f.cleared?.[id] || f.done?.[id]) && !f.beaten?.[id]);
    if (won.length) f.beaten = { ...(isObj(f.beaten) ? f.beaten : {}), ...Object.fromEntries(won.map(id => [id, 1])) };
  }
  if (v.version < 3) v.version = 3;
  return v;
}

// M5 (spec §4.1): M5 adds no new state (its quests, flags, relics and maps live in the shapes version 3
// already has), so version 4 only marks a save as this milestone's: the files of M4 and Milestone 4.5 stop
// at AETH3 and name an AETH4 code as newer instead of loading a save they cannot read. Idempotent.
export function toV4(save) {
  const v = toV3(save);
  if (v.version < 4) v.version = 4;
  return v;
}

// M6 (spec §4.1): M6 adds no new state either (the Gloomfen's quests, flags, relics and maps live in the shapes
// version 4 already has), so version 5 only marks a save as this milestone's: the M5 file stops at AETH4 and names
// an AETH5 code as newer instead of loading a save it cannot read. Idempotent.
export function toV5(save) {
  const v = toV4(save);
  if (v.version < 5) v.version = 5;
  return v;
}

// M7 (spec §4.1): the ending the Warden chose at the Worldforge's heart, final for the save: null until then, else
// 'rekindle', 'release' or 'anew'. Nothing else changes, so an M6 save carries over whole; the M6 file stops at AETH5
// and names an AETH6 code as newer. Idempotent: an ending already chosen is kept.
export const ENDINGS = ['rekindle', 'release', 'anew'];
export function toV6(save) {
  const v = toV5(save);
  if (v.version < 6) v.version = 6;
  if (!('ending' in v)) v.ending = null;
  return v;
}

// Any save, of any version so far, as the current version.
export const migrate = save => toV6(save);

// A pasted code is untrusted: before it replaces the journey on this device, check that the migrated
// save has the shape the game walks on (not its balance). Returns what is wrong, [] when it is sound.
export function saveProblems(g) {
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const num = v => typeof v === 'number' && Number.isFinite(v);
  if (!obj(g)) return ['it is not a save'];
  const out = [];
  if (g.version !== SAVE_VERSION) out.push('its version');
  const int = (v, lo, hi = Infinity) => Number.isInteger(v) && v >= lo && v <= hi;
  const strings = a => Array.isArray(a) && a.every(x => typeof x === 'string');
  const itemOk = it => {
    if (!obj(it) || typeof it.uid !== 'string' || typeof it.base !== 'string') return false;
    if (it.gems != null && !(Array.isArray(it.gems) && it.gems.every(x => x == null || typeof x === 'string'))) return false;
    // M4's optional fields: absent, or the shape the forge and the Chronicle read
    if (it.temper != null && !int(it.temper, 0, 10)) return false;
    if (it.rerolls != null && !int(it.rerolls, 0)) return false;
    if (it.deeds != null && !obj(it.deeds)) return false;
    if (it.awakened != null && it.awakened !== 'a' && it.awakened !== 'b') return false;
    const c = it.chronicle;
    if (c != null && !(obj(c) && (c.kills == null || num(c.kills)) && (c.bearers == null || strings(c.bearers)))) return false;
    return true;
  };
  if (!Array.isArray(g.inventory) || !g.inventory.every(itemOk)) out.push('its items');
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
  const counts = v => obj(v) && Object.values(v).every(n => num(n) && n >= 0);
  if (!counts(g.materials)) out.push('its forge materials');
  if (!counts(g.gems)) out.push('its gems');
  if (!(g.ending === null || ENDINGS.includes(g.ending))) out.push('its ending');
  const p = g.progress, f = p?.flags;
  if (!obj(p) || !obj(f)) out.push('its progress');
  else {
    for (const k of ['cleared', 'done', 'grudges', ...NEW_FLAGS, 'pages', 'settled']) if (!obj(f[k])) out.push(`its ${k} flags`);
    if (!Array.isArray(p.brands ?? [])) out.push('its Brands');
    if (!num(p.waking ?? 0)) out.push('its Waking');
    const pos = p.pos, map = obj(pos) ? MAPS[pos.map] : null;
    if (!map || !Number.isInteger(pos.x) || !Number.isInteger(pos.y) || pos.x < 0 || pos.y < 0 || pos.x >= map.w || pos.y >= map.h) out.push('where you stand');
  }
  return out;
}
