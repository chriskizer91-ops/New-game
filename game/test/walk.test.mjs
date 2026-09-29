// The long walk (M3 spec §6.1 WP1 "done when"): a bot plays from newGame to act1-complete for each
// of the 3 starters on the real maps, using only findPath, move, interact, dialogue and forced
// battle wins (foes at 1 HP), and must never get stuck. It follows CRITICAL_PATH: walk to each
// target (across maps by their exits), rest at Hearthfires, fight blocks, lairs and packs, open
// the locks it holds a key for, and play every trigger's dialogue on the way. Owner: WP1.
// M4 (spec §2.2, §8; owner M4 P2): the same bot walks SUN_PATH from an Act-I-complete save (both Verdant
// Brands, act1-complete, at the Keep, level 8 with only its starter relic) through the Keep's south-east
// gate, then comes home to the Great Hall for the second council.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startBattle, resolveBattle, rest } from '../src/rules/gauntlet.js';
import { enterMap, move, interact, findPath, present, lockStatus, openLock, afterBattle } from '../src/rules/world.js';
import { enterDialogue, choose, dialogueView } from '../src/rules/story.js';
import { START_AT, CRITICAL_PATH, SUN_PATH, HEARTHS } from '../src/data/world.js';
import { MAPS, ENTITY_OF } from '../src/data/maps/index.js';
import { ENCOUNTERS } from '../src/data/encounters.js';
import { DIALOGUE } from '../src/data/dialogue.js';
import { dirTo } from '../src/rules/path.js';
import { check } from '../src/rules/cond.js';
import { levelUp } from '../src/rules/progression.js';
import { createRng } from '../src/core/rng.js';
import { playOut } from './helpers.mjs';

class Stuck extends Error {}

// A forced win: every foe at 1 HP, every hero at 500 HP, then the autoplay policy plays it out.
function forceWin(game, where) {
  const { game: g, battle } = startBattle(game, where.nodeId ? { nodeId: where.nodeId } : { patrol: where.patrol }, where.opts || {});
  const b = structuredClone(battle);
  for (const u of Object.values(b.units)) if (u.side === 'foe') u.hp = 1;
  for (const u of Object.values(b.units)) if (u.side === 'hero') { u.hp = u.maxHp = 500; }
  const played = playOut(b).state;
  if (played.ended?.result !== 'victory') throw new Stuck(`a forced win was not a win (${played.ended?.result})`);
  return resolveBattle(g, played);
}

// `game` (a save to start from), `path` (the targets, in order) and `start` (where to enter) default to
// M3's long walk: newGame, CRITICAL_PATH, the Great Hall.
function makeBot(starter, { game = null, path = CRITICAL_PATH, start = null } = {}) {
  const s = { game: game || newGame({ name: 'Tess', seed: 9, starter }), walk: null, log: [], steps: 0, held: 0 };
  const log = m => { s.log.push(m); if (s.log.length > 40) s.log.shift(); };
  const where = () => `${s.walk?.map} (${s.walk?.x},${s.walk?.y})`;
  const stuck = m => { throw new Stuck(`${starter}: ${m} at ${where()}\n  ${s.log.slice(-12).join('\n  ')}`); };

  function enter(target) {
    const r = enterMap(s.game, target);
    s.game = r.game; s.walk = r.walk;
    log(`enter ${r.walk.map}`);
    handle(r.events);
  }
  function dialogue(id) {
    if (!DIALOGUE[id]) return;
    let r = enterDialogue(s.game, id);
    s.game = r.game;
    handle(r.events);
    // take the first choice that moves the story along (a fight or a next node), else leave
    for (let k = 0; k < 6; k++) {
      const v = dialogueView(s.game, id);
      const pick = v.choices.find(c => /^(Try|Hang|Mark|Turn in|Show|Let)/.test(c.text));
      if (!pick) return;
      r = choose(s.game, id, pick.i);
      s.game = r.game;
      handle(r.events);
      if (!r.next) return;
      id = r.next;
      const e = enterDialogue(s.game, id);
      s.game = e.game;
      handle(e.events);
    }
  }
  function battleWon(res, roamerId = null) {
    s.game = res.game;
    s.walk = afterBattle(s.game, s.walk, { roamerId, result: 'victory' });
    if (res.report.brand) log(`Brand: ${res.report.brand.id}`);
  }
  // Process engine events in order; battles are forced wins.
  function handle(events) {
    for (const e of events) {
      switch (e.t) {
        case 'trigger': log(`trigger ${e.id}`); dialogue(e.dialogue); break;
        case 'encounter': log(`fight ${e.id}`); battleWon(forceWin(s.game, { nodeId: e.id })); return 'battle';
        case 'contact': {
          const r = s.walk.roamers.find(x => x.id === e.id);
          log(`contact ${e.id}`);
          const spot = e.enc ? { nodeId: e.enc } : { patrol: { spawns: r.spawns, where: MAPS[s.walk.map].name, backdrop: MAPS[s.walk.map].backdrop } };
          // a weak pack run down is a full battle too (M4.5: no Routs)
          battleWon(forceWin(s.game, { ...spot, opts: { ambush: e.ambush, firstStrike: e.firstStrike, caught: !!e.weak } }), e.id);
          return 'battle';
        }
        case 'fight': log(`fight ${e.enc}`); battleWon(forceWin(s.game, { nodeId: e.enc })); return 'battle';
        case 'gate':
          // a guarded gate (the Bramble Toll chain): walking into it calls out its guard
          if (e.guard && !s.game.progress.flags.cleared[e.guard] && !s.game.progress.flags.done[e.guard]) {
            log(`gate ${e.id}: fight ${e.guard}`);
            battleWon(forceWin(s.game, { nodeId: e.guard }));
            return 'battle';
          }
          break;
        case 'talk': log(`talk ${e.dialogue}`); dialogue(e.dialogue); return 'talk';
        case 'exit': log(`exit ${e.id}`); enter({ map: e.to, anchor: e.anchor }); return 'exit';
        case 'sealed': stuck(`walked into sealed exit ${e.id}`); break;
        default: break;
      }
    }
    return null;
  }

  // Open every lock on the current map that the party holds a key for (a player would).
  function openKnownLocks() {
    for (const e of present(s.game, s.walk.map)) {
      const type = e.kind === 'lock' ? e.lock : e.kind === 'hearthfire' && e.state === 'cold' ? 'cold-hearth' : null;
      if (!type || e.state === 'open' || LOCK_SOFT(type)) continue;
      if (lockStatus(s.game, type).open) { const r = openLock(s.game, e.id); if (r.ok) { s.game = r.game; log(`open ${e.id} (${r.by})`); } }
    }
  }
  const LOCK_SOFT = t => t === 'darkness' || t === 'ichor';

  // Walk to (x, y), or next to it with `adjacent`. Re-plans after anything happens on the way.
  function walkTo(x, y, { adjacent = false } = {}) {
    for (let tries = 0; tries < 60; tries++) {
      const map = s.walk.map;
      if (adjacent ? Math.abs(s.walk.x - x) + Math.abs(s.walk.y - y) === 1 : s.walk.x === x && s.walk.y === y) return true;
      openKnownLocks();
      const path = findPath(s.game, s.walk, [x, y], { max: 400, adjacent });
      if (!path) stuck(`no path to (${x},${y})${adjacent ? ' (adjacent)' : ''}`);
      let broke = false;
      for (const p of path) {
        const dir = dirTo([s.walk.x, s.walk.y], p);
        const r = move(s.game, s.walk, dir);
        s.game = r.game; s.walk = r.walk; s.steps++;
        if (s.steps > 20000) stuck('too many steps');
        const out = handle(r.events);
        if (out === 'exit' || s.walk.map !== map) return 'exit';
        if (out || !r.events.some(ev => ev.t === 'step')) { broke = true; break; }
      }
      if (!broke && (adjacent || (s.walk.x === x && s.walk.y === y))) return true;
    }
    stuck(`could not reach (${x},${y})`);
    return false;
  }

  // Maps to cross: breadth-first over exits (not sealed) from here to `target`.
  function nextExit(from, target) {
    const prev = { [from]: null };
    const q = [from];
    while (q.length) {
      const m = q.shift();
      if (m === target) break;
      for (const ex of MAPS[m].exits) {
        // M4: a gated exit (the Keep's south-east gate) is a way through once its gate holds (rules/world.js move)
        if ((ex.sealed && !(ex.to && ex.gate && check(s.game, ex.gate))) || prev[ex.to] !== undefined) continue;
        prev[ex.to] = { m, ex };
        q.push(ex.to);
      }
    }
    if (prev[target] === undefined) stuck(`no map route to ${target}`);
    let step = prev[target];
    while (step && step.m !== from) step = prev[step.m];
    return step.ex;
  }

  function goToMap(target) {
    for (let hops = 0; hops < 12 && s.walk.map !== target; hops++) {
      const ex = nextExit(s.walk.map, target);
      const tiles = [];
      for (let y = ex.area[1]; y <= ex.area[3]; y++) for (let x = ex.area[0]; x <= ex.area[2]; x++) tiles.push([x, y]);
      const [tx, ty] = tiles[0];
      const r = walkTo(tx, ty);
      if (r !== 'exit') {
        // standing on the exit tile without having left: step onto it again from its inside
        stuck(`did not leave by ${ex.id}`);
      }
    }
    if (s.walk.map !== target) stuck(`could not get to map ${target}`);
  }

  function face(tx, ty) {
    const dir = dirTo([s.walk.x, s.walk.y], [tx, ty]);
    if (!dir) return null; // it moved away (a roamer): approach again
    const r = move(s.game, s.walk, dir);
    s.game = r.game; s.walk = r.walk;
    return handle(r.events);
  }

  // M4.5 (docs/M45-SPEC.md §5): the road holds. Before a fight that holds a road gate is won, the end
  // of that road cannot be reached from where the bot stands (the engine's own findPath, live states).
  function roadHeld(id, mapId) {
    const map = MAPS[mapId];
    for (const road of map.roads || []) {
      const here = present(s.game, mapId);
      const mine = road.gates.map(g => here.find(e => e.id === g)).find(g => g && (g.guard === id || JSON.stringify(g.open || {}).includes(`"${id}"`)));
      if (!mine || mine.state !== 'closed') continue;
      const exit = map.exits.find(x => x.id === road.to);
      const enc = map.entities.find(e => e.kind === 'encounter' && e.enc === road.to);
      const [tx, ty] = exit ? [exit.area[0], exit.area[1]] : enc.at || [enc.area[0], enc.area[1]];
      const path = findPath(s.game, s.walk, [tx, ty], { max: 800, adjacent: !exit });
      if (path) stuck(`the road ${road.from} -> ${road.to} on ${mapId} is open before ${id} is beaten (${path.length} steps)`);
      s.held++;
    }
  }

  // Reach and complete one critical-path target.
  function reach(id) {
    const hit = ENTITY_OF[id];
    assert.ok(hit, `${id} is placed on a map`);
    goToMap(hit.map);
    const node = ENCOUNTERS[id];
    const e = hit.entity;
    if (node.type === 'hearthfire') {
      // the stand (HEARTHS) is where you wake; you tend the fire from the tile next to it
      assert.ok(HEARTHS[id], `${id} is a Hearthfire`);
      const [fx, fy] = e.at;
      if (walkTo(fx, fy, { adjacent: true }) === 'exit') return reach(id);
      openKnownLocks();
      face(fx, fy);
      const r = interact(s.game, s.walk);
      const ev = r.events[0];
      if (ev?.t === 'lock') stuck(`the Hearthfire ${id} is cold and nobody can kindle it`);
      if (ev?.t !== 'hearthfire') stuck(`resting at ${id} gave ${ev?.t}`);
      s.game = rest(s.game, id);
      log(`rest ${id}`);
      return;
    }
    // a Brand re-arms its own Champion (the rules' rematch): once its Brand is held, the target is done
    const settled = () => s.game.progress.flags.cleared[id] || s.game.progress.flags.done[id] || (node.duel && s.game.progress.flags.story[node.yields || 'tamsin-yielded'])
      || (node.brand && s.game.progress.brands.includes(node.brand));
    if (settled()) return;
    roadHeld(id, hit.map);
    for (let tries = 0; tries < 30 && !settled(); tries++) {
      if (s.walk.map !== hit.map) goToMap(hit.map);
      if (e.mode === 'pack') {
        const r = s.walk.roamers.find(x => x.enc === id);
        if (!r) stuck(`the pack ${id} is not on the map`);
        const res = walkTo(r.x, r.y, { adjacent: true });
        if (res === true) { const t = s.walk.roamers.find(x => x.enc === id); if (t) face(t.x, t.y); }
        continue;
      }
      // block or lair: stand next to any tile of it and walk into it
      const [x0, y0, x1, y1] = e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
      let best = null;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d = Math.abs(s.walk.x - x) + Math.abs(s.walk.y - y);
        if (!best || d < best.d) best = { x, y, d };
      }
      // a block you cannot reach may be the guard of a gate: walk into the gate instead
      const gate = present(s.game, s.walk.map).find(g => g.kind === 'gate' && g.guard === id && g.state === 'closed');
      if (gate && !findPath(s.game, s.walk, [best.x, best.y], { max: 400, adjacent: true })) {
        const [gx0, gy0] = gate.area || gate.at;
        if (walkTo(gx0, gy0, { adjacent: true }) === true) face(gx0, gy0);
        continue;
      }
      const res = walkTo(best.x, best.y, { adjacent: true });
      if (res !== true) continue;
      const ends = face(best.x, best.y);
      if (!ends && e.talk) { const r = interact(s.game, s.walk); s.game = r.game; handle(r.events); }
    }
    if (!settled()) stuck(`could not settle ${id}`);
  }

  return {
    run() {
      enter(start || { map: START_AT.map, at: [START_AT.x, START_AT.y], face: START_AT.face });
      for (const id of path) { log(`-> ${id}`); reach(id); }
      return s;
    },
    // walk (across maps) into `mapId`
    home(mapId) { log(`-> home to ${mapId}`); goToMap(mapId); return s; },
  };
}

for (const starter of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) {
  test(`the long walk (${starter}): newGame to act1-complete on the real maps, never stuck`, () => {
    const s = makeBot(starter).run();
    assert.equal(s.game.progress.flags.story['act1-complete'], true);
    assert.equal(new Set(s.game.progress.brands).size, 2);
    assert.ok(s.game.progress.flags.story['intro-done'], 'the intro played');
    assert.ok(s.steps > 100, `${s.steps} steps`);
    assert.ok(s.held >= 8, `the road held before ${s.held} fights (M4.5)`);
  });
}

// ---- M4: the Sunscorch walk (spec §2.2, §8) ------------------------------------------------------------

// An Act-I-complete save: the M3 critical path behind it (both Verdant Brands, the Waking at 2, the first
// council sat), standing in the Keep's courtyard, every hero at level 8 (the worst case the map tests
// allow after the Brand) and only the starter relic in the pack.
function actOneSave(starter) {
  const g = structuredClone(newGame({ name: 'Tess', seed: 9, starter }));
  const rng = createRng('walk-act-one');
  for (const id of g.party.active) {
    let h = g.party.roster[id];
    while (h.level < 8) h = levelUp(h, rng).hero;
    g.party.roster[id] = h;
  }
  g.progress.brands = ['brand-of-briars', 'brand-of-the-heartroot'];
  g.progress.waking = 2;
  const f = g.progress.flags;
  for (const id of CRITICAL_PATH) {
    const e = ENCOUNTERS[id];
    if (e.type === 'hearthfire') { f.kindled[id] = true; continue; }
    f.beaten[id] = 1;
    if (e.once) f.done[id] = true;
    if (e.opens) f.unlocked[e.opens] = true;
  }
  Object.assign(f.story, { 'intro-done': true, 'tamsin-yielded': true, 'act1-complete': true, 'council-done': true });
  g.progress.pos = { map: 'keep', x: 15, y: 6, face: 's' };
  return g;
}

for (const starter of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) {
  test(`the Sunscorch walk (${starter}): from an Act-I-complete save through the south-east gate, SUN_PATH to both Brands, then home`, () => {
    const bot = makeBot(starter, { game: actOneSave(starter), path: SUN_PATH, start: { map: 'keep', anchor: 'from-hall' } });
    const s = bot.run();
    const f = s.game.progress.flags;
    assert.ok(s.game.progress.brands.includes('brand-of-glass') && s.game.progress.brands.includes('brand-of-ash'), 'both Sunscorch Brands');
    assert.equal(f.story['sunscorch-complete'], true);
    for (const id of SUN_PATH) {
      if (HEARTHS[id]) assert.ok(f.kindled[id], `${id} kindled`);
      else assert.ok(f.beaten[id] || f.story[ENCOUNTERS[id].yields], `${id} fought`);
    }
    // the way home from the Vault of Ash is open (the Vaults are underground: no Hearthfire travel)
    bot.home('keep-hall');
    assert.equal(s.walk.map, 'keep-hall');
    assert.equal(f.story['council-2-done'] || s.game.progress.flags.story['council-2-done'], true, 'the second council plays in the Great Hall');
    assert.ok(s.steps > 300, `${s.steps} steps`);
    assert.ok(s.held >= 5, `the road held before ${s.held} fights (M4.5)`);
  });
}
