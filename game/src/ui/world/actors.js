// World actors (M3 spec §5.3): the party conga line (followers step into the leader's previous
// tiles; only the leader collides), NPCs with an idle bob, blocks and lairs (lairs are the battle
// art, renderFoe idle at 1x through foeLook(buildFoe(spawn)), with a relic glint every 2 s and a
// Grudge pace), roaming packs (tweened, ×N pips, "!" / sweat / "?" moods), hidden caches, and the
// showoff when a hero's gear changes.
// Exports:
//   gearSig(game, heroId) -> string          the signature flags.worn[heroId] remembers
//   newGearName(game, heroId, oldSig) -> string | null   the item a hero put on since oldSig
//   createActors({ reduced }) -> {
//     reset(game, walk, now, trail?)   a new map: every actor rebuilt, the party on the leader (or the trail)
//     refresh(game, walk, now)         the game changed: NPCs, foes, walkers' gear, hidden caches
//     stepLeader(toX, toY, face, t0, dur)   the leader steps; followers take the previous tiles
//     face(dir)                        the leader turns in place
//     syncRoamers(walk, now, dur)      diff walk.roamers by id and tween the ones that moved
//     emote(kind, target, now, ms)     target: 'leader' | roamer id | hero id; kind '!hunt' (M4) is the
//                                      red "!" of a Grudge that hunts you (the "!" recoloured: a red
//                                      bubble, a cream mark)
//     emotesShown() -> [{ kind, target }]   the emotes on screen (the e2e seam)
//     showoff(heroId, now)             step out of line, face the camera, sparkle (SHOWOFF_MS)
//     update(now) -> busy              tween every actor (no allocation)
//     fill(list, emotes, now) -> [n, ne]   sprite and emote records for the view (no allocation)
//     leader { px, py }, trail() -> [[x, y, face] x3], foeAt(x, y) -> encounter entity | null
//   }
// Owner: WP7; M4 P7b (the hunter's "!").

import { walkerSheet, npcSheet, mapFoeSheet, renderFoe, gearLooks, FOE_ART, RARITY_LOOK } from '../../art/index.js';
import { NPCS } from '../../data/npcs.js';
import { RELICS } from '../../data/relics.js';
import { present, mapOf } from '../../rules/world.js';
import { spawnsFor } from '../../rules/gauntlet.js';
import { buildFoe, familyOf } from '../../rules/foe.js';
import { heroGear, heroCustom, foeLook } from '../battle/sprites.js';
import { canvasOf, emoteSprite, objSprite } from './view.js';
import { TILE, STEP_MS, SHOWOFF_MS, EMOTE_MS, GLINT_MS, HIDDEN_TILES, MAX_SPRITES } from './constants.js';

const SLOT_ORDER = ['weapon', 'offhand', 'head', 'body', 'hands', 'feet', 'amulet', 'ring'];
const ROW = { s: 0, n: 1, e: 2, w: 3 };
const TIER_RANK = { rabble: 0, veteran: 1, 'relic-bearer': 2, champion: 3 };
const HALF = TILE / 2;

// ---- gear signatures (the showoff) ------------------------------------------------------------------

export function gearSig(game, heroId) {
  const h = game?.party?.roster?.[heroId];
  if (!h) return '';
  const by = new Map((game.inventory || []).map(i => [i.uid, i]));
  return SLOT_ORDER.map(s => { const it = h.gear?.[s] && by.get(h.gear[s]); return it && !it.shattered ? `${it.uid}+${it.temper || 0}` : ''; }).join('|');
}

export function newGearName(game, heroId, oldSig) {
  const h = game?.party?.roster?.[heroId];
  if (!h || oldSig == null) return null;
  const old = String(oldSig).split('|'), now = gearSig(game, heroId).split('|');
  for (let i = 0; i < SLOT_ORDER.length; i++) {
    if (now[i] && now[i] !== old[i]) {
      const uid = now[i].split('+')[0];
      const it = (game.inventory || []).find(x => x.uid === uid);
      if (it) return it.unidentified ? 'something unidentified' : it.name;
    }
  }
  return null;
}

// ---- sheets (canvases, cached across mounts) ------------------------------------------------------

const SHEETS = new Map();
function sheetOf(key, build) {
  let s = SHEETS.get(key);
  if (!s) {
    let r = null;
    try { r = build(); } catch (err) { console.warn('[world] sprite', key, err?.message); r = null; }
    s = r && r.img ? { canvas: canvasOf(r.img), w: r.w || 16, h: r.h || 24, foot: r.foot || [8, 23], head: r.head || [(r.w || 16) >> 1, 3], frames: r.frames || 3 } : null;
    SHEETS.set(key, s);
    if (SHEETS.size > 160) SHEETS.delete(SHEETS.keys().next().value);
  }
  return s;
}
function greyOf(sheet) {
  if (!sheet) return null;
  if (sheet.grey) return sheet.grey;
  const c = canvasOf(null, sheet.canvas.width, sheet.canvas.height), g = c.getContext('2d');
  g.drawImage(sheet.canvas, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; d[i] = d[i + 1] = d[i + 2] = l * 0.8 + 30; }
  g.putImageData(img, 0, 0);
  sheet.grey = { ...sheet, canvas: c };
  return sheet.grey;
}
// A Grudge hunter's "!" (M4 spec §4.6): the "!" emote with its colours turned round, a red bubble and
// a cream mark, so it reads at a glance from the plain one (white bubble, red mark).
let HUNT = null;
function huntSprite() {
  if (HUNT) return HUNT;
  const base = emoteSprite('!');
  const frames = base.frames.map(src => {
    const c = canvasOf(null, src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const r = d[i], gr = d[i + 1], b = d[i + 2], hi = Math.max(r, gr, b), lo = Math.min(r, gr, b);
      if (r > 110 && r - Math.max(gr, b) > 50) { d[i] = 255; d[i + 1] = 240; d[i + 2] = 214; } // the mark: cream
      else if (hi > 110 && hi - lo < 70) { const l = hi / 255; d[i] = Math.round(40 + 190 * l); d[i + 1] = Math.round(26 * l); d[i + 2] = Math.round(22 * l); } // the bubble: red
    }
    g.putImageData(img, 0, 0);
    return c;
  });
  HUNT = { frames, foot: base.foot };
  return HUNT;
}
function walkerFor(game, heroId) {
  const custom = heroCustom(game, heroId);
  const key = `walker|${heroId}|${gearSig(game, heroId)}|${custom ? JSON.stringify(custom) : ''}`;
  return sheetOf(key, () => walkerSheet(heroId, gearLooks(heroGear(game, heroId)), { custom }));
}
const npcFor = art => sheetOf(`npc|${art}`, () => npcSheet(art));
const foeSheetFor = (lead, relic = null) => sheetOf(`foe|${lead.art}|${lead.gearTier || 0}|${lead.variant || ''}|${relic || ''}`,
  () => mapFoeSheet(lead.art, { gearTier: lead.gearTier || 0, variant: lead.variant || null, ...(relic ? { relic } : {}) }));
// the relic a block's leader carries, drawn in its hands on the map (art/map-sprites.js mapFoeSheet relic)
function leadRelic(game, encId) {
  let spawns = [];
  try { spawns = spawnsFor(game, encId); } catch { return null; }
  const lead = spawns.slice().sort((a, b) => TIER_RANK[familyOf(b).tier] - TIER_RANK[familyOf(a).tier])[0];
  return lead ? (lead.held || []).find(h => h.relic)?.relic || lead.wears || null : null;
}

const rarityCol = r => (RARITY_LOOK[r] || RARITY_LOOK.heirloom).color;
function relicColour(spawn) {
  const h = (spawn.held || []).find(p => p.relic || p.item);
  if (h?.relic) return rarityCol(RELICS[h.relic]?.rarity);
  if (h?.item) return rarityCol(h.item.rarity);
  if (spawn.wears) return rarityCol(RELICS[spawn.wears]?.rarity);
  return '#fff4c0';
}

// A lair: the battle sprite, idle, at 1x. Two breathing frames; the glint is drawn on top.
function lairFor(game, encId) {
  let spawns = [];
  try { spawns = spawnsFor(game, encId); } catch { spawns = []; }
  if (!spawns.length) return null;
  const lead = spawns.slice().sort((a, b) => TIER_RANK[familyOf(b).tier] - TIER_RANK[familyOf(a).tier])[0];
  let unit, look;
  try { unit = buildFoe(lead, { id: `map-${encId}` }); look = foeLook(unit); } catch { return null; }
  const art = FOE_ART[unit.art] ? unit.art : 'cutpurse';
  const key = `lair|${art}|${unit.tier}|${look.gearTier}|${look.relic || '-'}|${look.relicHeld ? 1 : 0}|${(look.broken || []).join('+')}`;
  const s = SHEETS.get(key);
  if (s !== undefined) return s && { ...s, col: relicColour(lead), glint: spawns.some(x => (x.held || []).some(h => h.relic) || x.wears) };
  let out = null;
  try {
    const f0 = renderFoe(art, { ...look, pose: 'idle', t: 1.3, reduced: false });
    const f1 = renderFoe(art, { ...look, pose: 'idle', t: 1.0, reduced: false });
    const a = f0.anchors || {};
    const foot = a.foot || FOE_ART[art]?.foot || [f0.width >> 1, f0.height - 8];
    const rel = a.relic || a.weaponMid || a.center || [f0.width >> 1, f0.height >> 1];
    const c = canvasOf(null, f0.width * 2, f0.height);
    const g = c.getContext('2d');
    g.putImageData(f0, 0, 0); g.putImageData(f1, f0.width, 0);
    out = { canvas: c, w: f0.width, h: f0.height, foot: [Math.round(foot[0]), Math.round(foot[1])], rel: [Math.round(rel[0]), Math.round(rel[1])], frames: 2 };
  } catch (err) { console.warn('[world] lair art', encId, err?.message); out = null; }
  SHEETS.set(key, out);
  return out && { ...out, col: relicColour(lead), glint: spawns.some(x => (x.held || []).some(h => h.relic) || x.wears) };
}

// ---- records -------------------------------------------------------------------------------------------

const newRec = () => ({ img: null, sx: 0, sy: 0, sw: 16, sh: 16, dx: 0, dy: 0, ys: 0, alpha: 1, fx: 0, fxA: 0, fxB: 0, fxC: 0, col: null, show: false });
const newEmote = () => ({ img: null, spr: null, dx: 0, dy: 0, show: false, until: 0, kind: '', target: null });
const phaseOf = id => { let h = 7; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h % GLINT_MS; };

export function createActors({ reduced = false } = {}) {
  let game = null, map = null;
  const party = [];      // leader first
  const npcs = [], foes = [], extras = [], roamers = [];
  const byRoamer = new Map();
  const emotes = [];
  for (let i = 0; i < 12; i++) emotes.push(newEmote());
  const leader = { px: 0, py: 0 };
  let busy = false;

  function heroActor(id) {
    return { id, x: 0, y: 0, fx: 0, fy: 0, t0: 0, dur: 0, face: 's', step: 0, px: 0, py: 0, moving: false, u: 1, sheet: null, rec: newRec(), show: 0, showUntil: 0 };
  }

  function buildStatic(now) {
    npcs.length = 0; foes.length = 0; extras.length = 0;
    const walkX = party[0]?.x ?? 0, walkY = party[0]?.y ?? 0;
    for (const e of present(game, map.id)) {
      if (e.kind === 'npc') {
        const sheet = npcFor(NPCS[e.npc]?.art || e.npc);
        if (!sheet) continue;
        npcs.push({ e, sheet, rec: newRec(), phase: phaseOf(e.id) });
      } else if (e.kind === 'encounter' && e.mode !== 'pack') {
        const at = e.at || [e.area[0], e.area[3]];
        if (e.mode === 'lair') {
          const L = lairFor(game, e.enc);
          if (L) { foes.push({ e, lair: true, L, at, rec: newRec(), phase: phaseOf(e.id) }); continue; }
        }
        const sheet = e.lead ? foeSheetFor(e.lead, leadRelic(game, e.enc)) : null;
        if (sheet) foes.push({ e, lair: false, sheet, at, rec: newRec(), phase: phaseOf(e.id) });
      } else if (e.kind === 'chest') {
        if (e.state === 'opened') continue;
        const hidden = !!e.hidden;
        extras.push({ kind: 'chest', e, hidden, rec: newRec(), phase: phaseOf(e.id), revealed: false });
      } else if (e.kind === 'prop' && e.prop === 'deer') {
        extras.push({ kind: 'deer', e, rec: newRec(), phase: phaseOf(e.id) });
      }
    }
    for (const p of party) p.sheet = walkerFor(game, p.id);
    reveal(walkX, walkY, now);
  }

  // hidden caches show within 3 tiles for Watchful, Hart's Sight or Survival 3 (spec §3.8)
  let canSeeHidden = false;
  function seeHidden() {
    const inv = game?.inventory || [];
    const powers = new Set(inv.filter(i => RELICS[i.base] && !i.shattered).map(i => RELICS[i.base].mapPower?.id).filter(Boolean));
    let surv = 0;
    for (const id of game?.party?.active || []) surv = Math.max(surv, game.party.roster[id]?.domains?.survival?.level || 0);
    return powers.has('watchful') || powers.has('harts-sight') || surv >= 3;
  }
  function reveal(x, y, now) {
    for (const a of extras) {
      if (a.kind !== 'chest' || !a.hidden) continue;
      const [ex, ey] = a.e.at;
      const was = a.revealed;
      a.revealed = canSeeHidden && Math.max(Math.abs(ex - x), Math.abs(ey - y)) <= HIDDEN_TILES;
      if (a.revealed && !was) emote('sparkle', a, now, 1400);
    }
  }

  function roamerRecord(r) {
    return { id: r.id, r, x: r.x, y: r.y, fx: r.x, fy: r.y, t0: 0, dur: 0, face: r.face || 's', px: r.x * TILE, py: r.y * TILE, moving: false, u: 1, sheet: r.lead ? foeSheetFor(r.lead) : null, rec: newRec(), phase: phaseOf(String(r.id)) };
  }

  function emote(kind, target, now, ms = EMOTE_MS) {
    let slot = null;
    for (let i = 0; i < emotes.length; i++) if (emotes[i].target === target && emotes[i].kind === kind) { slot = emotes[i]; break; }
    if (!slot) for (let i = 0; i < emotes.length; i++) if (!emotes[i].show) { slot = emotes[i]; break; }
    if (!slot) slot = emotes[0];
    slot.spr = kind === '!hunt' ? huntSprite() : emoteSprite(kind); slot.img = slot.spr.frames[0]; slot.kind = kind; slot.target = target; slot.until = ms === Infinity ? Infinity : now + ms; slot.show = true;
  }
  function clearEmotes(target) { for (const e of emotes) if (!target || e.target === target) { e.show = false; e.target = null; } }

  const api = {
    leader,
    get game() { return game; },
    reset(g, walk, now, trail = null) {
      game = g; map = mapOf(walk.map);
      canSeeHidden = seeHidden();
      party.length = 0;
      clearEmotes();
      const ids = g.party.active;
      ids.forEach((id, i) => {
        const a = heroActor(id);
        const t = i > 0 && trail && trail[i - 1];
        a.x = t ? t[0] : walk.x; a.y = t ? t[1] : walk.y; a.face = t ? t[2] : walk.face;
        a.fx = a.x; a.fy = a.y; a.px = a.x * TILE; a.py = a.y * TILE;
        party.push(a);
      });
      roamers.length = 0; byRoamer.clear();
      buildStatic(now);
      api.syncRoamers(walk, now, 0);
      api.update(now);
    },
    refresh(g, walk, now) {
      game = g;
      canSeeHidden = seeHidden();
      if (walk && party[0]) { party[0].face = walk.face; }
      buildStatic(now);
      if (walk) api.syncRoamers(walk, now, 0);
    },
    face(dir) { if (party[0]) party[0].face = dir; },
    stepLeader(toX, toY, face, t0, dur) {
      const L = party[0];
      if (!L) return;
      // each follower takes the tile of the one in front; the leader takes the new tile
      for (let i = party.length - 1; i >= 1; i--) {
        const a = party[i], b = party[i - 1];
        if (a.x === b.x && a.y === b.y) continue;
        a.fx = a.px / TILE; a.fy = a.py / TILE;
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx || dy) a.face = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : (dy > 0 ? 's' : 'n');
        a.x = b.x; a.y = b.y; a.t0 = t0; a.dur = dur; a.step++;
        a.show = 0;
      }
      L.fx = L.px / TILE; L.fy = L.py / TILE;
      L.x = toX; L.y = toY; L.face = face; L.t0 = t0; L.dur = dur; L.step++;
      L.show = 0;
      reveal(toX, toY, t0);
    },
    syncRoamers(walk, now, dur = STEP_MS) {
      const list = walk.roamers || [];
      const seen = new Set();
      for (const r of list) {
        seen.add(r.id);
        let a = byRoamer.get(r.id);
        if (!a) { a = roamerRecord(r); byRoamer.set(r.id, a); roamers.push(a); }
        if (a.x !== r.x || a.y !== r.y) {
          a.fx = a.px / TILE; a.fy = a.py / TILE; a.x = r.x; a.y = r.y;
          a.t0 = now; a.dur = dur > 0 ? dur : 0;
        }
        a.face = r.face || a.face; a.r = r;
        if (r.lead && !a.sheet) a.sheet = foeSheetFor(r.lead);
        if (r.mood === 'flee') emote('sweat', a, now, Infinity);
        else if (r.mood === 'stunned') emote('?', a, now, Infinity);
        else for (const e of emotes) if (e.target === a && e.until === Infinity) { e.show = false; e.target = null; }
      }
      for (let i = roamers.length - 1; i >= 0; i--) {
        const a = roamers[i];
        if (!seen.has(a.id)) { roamers.splice(i, 1); byRoamer.delete(a.id); clearEmotes(a); }
      }
    },
    roamerActor: id => byRoamer.get(id) || null,
    emotesShown: () => emotes.filter(e => e.show && e.target).map(e => ({ kind: e.kind, target: e.target.id ?? e.target.e?.id ?? null })),
    emote(kind, target, now, ms) {
      const t = target === 'leader' ? party[0] : byRoamer.get(target) || party.find(p => p.id === target) || target;
      if (t) emote(kind, t, now, ms);
    },
    showoff(heroId, now) {
      const a = party.find(p => p.id === heroId);
      if (!a) return;
      a.show = now; a.showUntil = now + SHOWOFF_MS;
      emote('sparkle', a, now, SHOWOFF_MS);
    },
    foeAt(x, y) {
      for (const f of foes) {
        const e = f.e, [x0, y0, x1, y1] = e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return e;
        if (f.lair && f.L) {
          // the whole visible sprite counts for a tap or a hold
          const left = f.at[0] * TILE + HALF - f.L.foot[0], top = f.at[1] * TILE + TILE - 1 - f.L.foot[1];
          if (x * TILE + HALF >= left && x * TILE + HALF < left + f.L.w && y * TILE + HALF >= top && y * TILE + HALF < top + f.L.h) return e;
        }
      }
      return null;
    },
    roamerAt(x, y) { for (const a of roamers) if (a.x === x && a.y === y) return a.r; return null; },
    // where a foe's nameplate hangs: the top-centre of its sprite, in art px
    plateAt(id) {
      const f = foes.find(q => q.e.id === id);
      if (!f) return null;
      if (f.lair) return [f.at[0] * TILE + HALF, f.at[1] * TILE + TILE - 1 - f.L.foot[1] + 4];
      return [f.at[0] * TILE + HALF, f.at[1] * TILE + TILE - 1 - f.sheet.foot[1] - 2];
    },
    trail: () => party.slice(1).map(a => [a.x, a.y, a.face]),
    partyShown: () => party.filter(a => a.rec.show).length,
    partyTiles: () => party.map(a => [a.x, a.y]),

    // cam { x, y, w, h } in art px (optional): a roamer stepping off screen does not keep the loop
    // at full rate, so a wandering pack elsewhere on the map leaves the idle rate alone
    update(now, cam = null) {
      busy = false;
      for (let i = 0; i < party.length; i++) if (tween(party[i], now)) busy = true;
      for (let i = 0; i < roamers.length; i++) {
        const a = roamers[i];
        if (tween(a, now) && (!cam || (a.px > cam.x - 2 * TILE && a.px < cam.x + cam.w + TILE && a.py > cam.y - 2 * TILE && a.py < cam.y + cam.h + 2 * TILE))) busy = true;
      }
      const L = party[0];
      if (L) { leader.px = L.px; leader.py = L.py; }
      // emotes bob slowly enough for the idle rate; only a showoff needs full rate
      for (let i = 0; i < emotes.length; i++) { const e = emotes[i]; if (e.show && now > e.until) { e.show = false; e.target = null; } }
      for (let i = 0; i < party.length; i++) { if (party[i].show && now > party[i].showUntil) party[i].show = 0; if (party[i].show) busy = true; }
      return busy;
    },

    fill(list, emo, now) {
      let n = 0;
      const cap = Math.min(list.length, MAX_SPRITES);
      const bob = reduced ? 0 : 1;
      // the party: the leader in front on a shared row; followers stacked under someone are hidden
      for (let i = 0; i < party.length && n < cap; i++) {
        const a = party[i], s = a.sheet, r = a.rec;
        if (!s) continue;
        let hideStack = false;
        if (i > 0 && !a.moving) for (let j = 0; j < i; j++) { const b = party[j]; if (b.x === a.x && b.y === a.y && !b.moving) { hideStack = true; break; } }
        r.show = !hideStack;
        if (hideStack) continue;
        let face = a.face, ox = 0, oy = 0;
        if (a.show) {
          const e = Math.min(1, (now - a.show) / 150, (a.showUntil - now) / 150);
          face = 's'; ox = Math.round((i === 0 ? 0 : 10) * e); oy = Math.round((i === 0 ? 5 : 3) * e);
        }
        const frame = a.moving ? (a.u < 0.5 ? 1 + (a.step & 1) : 0) : 0;
        r.img = s.canvas; r.sw = s.w; r.sh = s.h;
        r.sx = Math.min(frame, (s.frames || 3) - 1) * s.w; r.sy = (ROW[face] ?? 0) * s.h;
        r.dx = Math.round(a.px + HALF - s.foot[0]) + ox; r.dy = Math.round(a.py + TILE - 1 - s.foot[1]) + oy;
        r.ys = a.py + TILE + oy + (3 - i) * 0.1; r.alpha = 1; r.fx = 0;
        list[n++] = r;
      }
      for (let i = 0; i < npcs.length && n < cap; i++) {
        const a = npcs[i], s = a.sheet, r = a.rec, e = a.e;
        r.img = s.canvas; r.sw = s.w; r.sh = s.h; r.sx = 0; r.sy = (ROW[e.face] ?? 0) * s.h;
        const up = bob && (((now + a.phase * 3) / 650) | 0) & 1 ? -1 : 0;
        r.dx = e.at[0] * TILE + HALF - s.foot[0]; r.dy = e.at[1] * TILE + TILE - 1 - s.foot[1] + up;
        r.ys = e.at[1] * TILE + TILE; r.alpha = 1; r.fx = 0; r.show = true;
        list[n++] = r;
      }
      for (let i = 0; i < foes.length && n < cap; i++) {
        const a = foes[i], r = a.rec, e = a.e;
        r.show = true; r.alpha = 1;
        if (a.lair) {
          const L = a.L;
          const fr = reduced ? 0 : (((now + a.phase) / 625) | 0) & 1;
          let pace = 0;
          if (e.grudge && !reduced) {
            const t = ((now + a.phase) % 4000) / 4000;
            pace = t < 0.35 ? 0 : t < 0.5 ? (t - 0.35) / 0.15 : t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
            pace = Math.round(pace * TILE);
          }
          r.img = L.canvas; r.sw = L.w; r.sh = L.h; r.sx = fr * L.w; r.sy = 0;
          r.dx = a.at[0] * TILE + HALF - L.foot[0] + pace; r.dy = a.at[1] * TILE + TILE - 1 - L.foot[1];
          r.ys = a.at[1] * TILE + TILE;
          r.fx = L.glint ? 1 : 0; r.fxA = L.rel[0]; r.fxB = L.rel[1]; r.fxC = a.phase; r.col = L.col;
        } else {
          const s = a.sheet;
          const up = bob && (((now + a.phase * 3) / 700) | 0) & 1 ? -1 : 0;
          r.img = s.canvas; r.sw = s.w; r.sh = s.h; r.sx = 0; r.sy = (ROW[e.face] ?? 0) * s.h;
          r.dx = a.at[0] * TILE + HALF - s.foot[0]; r.dy = a.at[1] * TILE + TILE - 1 - s.foot[1] + up;
          r.ys = a.at[1] * TILE + TILE;
          r.fx = e.glint ? 1 : 0; r.fxA = (s.w >> 1) + 3; r.fxB = s.h >> 1; r.fxC = a.phase; r.col = '#f4ad3f';
        }
        list[n++] = r;
      }
      for (let i = 0; i < roamers.length && n < cap; i++) {
        const a = roamers[i], r = a.rec, rr = a.r;
        const s0 = a.sheet;
        if (!s0) continue;
        const s = rr.mood === 'flee' ? greyOf(s0) : s0;
        const fr = a.moving ? (a.u < 0.5 ? 1 : 0) : 0;
        const up = !a.moving && bob && (((now + a.phase * 3) / 600) | 0) & 1 ? -1 : 0;
        r.img = s.canvas; r.sw = s.w; r.sh = s.h; r.sx = Math.min(fr, (s.frames || 2) - 1) * s.w; r.sy = (ROW[a.face] ?? 0) * s.h;
        r.dx = Math.round(a.px + HALF - s.foot[0]); r.dy = Math.round(a.py + TILE - 1 - s.foot[1]) + up;
        r.ys = a.py + TILE; r.alpha = 1; r.show = true;
        const count = rr.lead?.count || (rr.spawns ? rr.spawns.length : 1);
        r.fx = count > 1 ? 3 : 0; r.fxA = count; r.col = rr.mood === 'flee' ? '#9a968c' : '#ee6c54';
        list[n++] = r;
      }
      for (let i = 0; i < extras.length && n < cap; i++) {
        const a = extras[i], r = a.rec, e = a.e;
        if (a.kind === 'chest') {
          if (a.hidden && !a.revealed) continue;
          // a visible chest is baked into the ground: this record only twinkles; a revealed cache draws itself
          const S = a.hidden ? (a.spr || (a.spr = objSprite('chest', 'closed'))) : null;
          r.img = S ? S.frames[0] : null; r.sx = 0; r.sy = 0;
          r.sw = S ? S.w : 16; r.sh = S ? S.h : 16;
          r.dx = e.at[0] * TILE + HALF - (S ? S.foot[0] : HALF); r.dy = e.at[1] * TILE + TILE - 1 - (S ? S.foot[1] : TILE - 1); r.ys = e.at[1] * TILE + TILE - 0.5;
          r.fx = 4; r.fxA = (r.sw >> 1) + 4; r.fxB = r.sh - 12; r.fxC = a.phase; r.alpha = 1; r.show = true;
        } else if (a.kind === 'deer') {
          const S = a.spr || (a.spr = objSprite('deer', 'graze'));
          const fr = reduced ? 0 : (((now + a.phase * 5) / 900) | 0) % S.frames.length;
          r.img = S.frames[fr]; r.sw = S.w; r.sh = S.h; r.sx = 0; r.sy = 0;
          r.dx = e.at[0] * TILE + HALF - S.foot[0]; r.dy = e.at[1] * TILE + TILE - 1 - S.foot[1];
          r.ys = e.at[1] * TILE + TILE; r.fx = 0; r.alpha = 1; r.show = true;
        } else continue;
        list[n++] = r;
      }
      // emotes follow their target, above its head
      let ne = 0;
      for (let i = 0; i < emotes.length; i++) {
        const e = emotes[i];
        if (!e.show) continue;
        const t = e.target, spr = e.spr;
        let x = 0, y = 0;
        if (t && t.rec && t.rec.show && t.sheet) {
          // the emote's foot sits on the sprite's head anchor
          const hd = t.sheet.head || [t.sheet.w >> 1, 3];
          x = t.rec.dx + hd[0]; y = t.rec.dy + hd[1] - 1;
        } else if (t && t.px !== undefined) { x = t.px + HALF; y = t.py - 6; }
        else if (t && t.e) { x = t.e.at[0] * TILE + HALF; y = t.e.at[1] * TILE; }
        else continue;
        const fr = spr && spr.frames.length > 1 && !reduced ? (((now / 260) | 0) & 1) : 0;
        e.img = spr ? spr.frames[fr] : e.img;
        const foot = spr ? spr.foot : [e.img.width >> 1, e.img.height - 1];
        e.dx = Math.round(x - foot[0]); e.dy = Math.round(y - foot[1] - (reduced || (spr && spr.frames.length > 1) ? 0 : (((now / 300) | 0) & 1)));
        emo[ne++] = e;
      }
      api.counts[0] = n; api.counts[1] = ne;
      return api.counts;
    },
    counts: [0, 0],
    get busy() { return busy; },
  };

  // returns true while the actor is mid-step
  function tween(a, now) {
    if (a.dur && now < a.t0 + a.dur) {
      const u = Math.max(0, (now - a.t0) / a.dur);
      a.px = (a.fx + (a.x - a.fx) * u) * TILE; a.py = (a.fy + (a.y - a.fy) * u) * TILE;
      a.moving = true; a.u = u;
      return true;
    }
    a.px = a.x * TILE; a.py = a.y * TILE; a.moving = false; a.u = 1; a.dur = 0;
    return false;
  }

  return api;
}
