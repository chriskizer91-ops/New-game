// The long walk (M3 spec §6.1 WP1 "done when"): a bot plays from newGame to act1-complete for each
// of the 3 starters on the real maps, using only findPath, move, interact, dialogue and forced
// battle wins (foes at 1 HP), and must never get stuck. It follows CRITICAL_PATH: walk to each
// target (across maps by their exits), rest at Hearthfires, fight blocks, lairs and packs, open
// the locks it holds a key for, and play every trigger's dialogue on the way. Owner: WP1.
// M4 (spec §2.2, §8; owner M4 P2): the same bot walks SUN_PATH from an Act-I-complete save (both Verdant
// Brands, act1-complete, at the Keep, level 8 with only its starter relic) through the Keep's south-east
// gate, then comes home to the Great Hall for the second council.
// M5 (spec §2.2, §8; owner M5 P2): the same bot walks IRON_PATH from a Sunscorch-complete save (all four earlier
// Brands, the second council sat, at the Keep, level 8 with only its starter relic) through the Keep's east
// postern, asks Thane Brundar for the Rune-Key once Tamsin's duel is settled, earns both Ironspire Brands and
// comes home to the Great Hall for the third council.
// M6 (spec §2.2, §8; owner M6 P2): the same bot walks GLOOM_PATH from an Ironspire-complete save (all six earlier
// Brands, the third council sat, at the Keep, level 8 with only its starter relic and the purse the Ironspire left
// it) down Mossfall's fen stair, pays Hodge the day's price at his bar, earns both Gloomfen Brands and comes home
// across the causeway and through the Keep's south-west gate to the Great Hall for the fourth council.
// M7 (spec §2.2, §8; owner M7 P2): the same bot walks ACT3_PATH from a Gloomfen-complete save (all eight Brands, the four
// councils sat, at the Keep, level 8 with only its starter relic): the fifth council plays as it enters the Great Hall,
// then it goes down the vault stair, through the Hollow Council back to back (the stair behind it shut from Miravel's fall
// until Gretch's), down the Ash Stair and across the Chained Deep (where Tamsin joins), to the Unsmith at the Worldforge,
// and climbs home to the Great Hall.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, startBattle, resolveBattle, rest } from '../src/rules/gauntlet.js';
import { enterMap, move, interact, findPath, present, lockStatus, openLock, afterBattle } from '../src/rules/world.js';
import { enterDialogue, choose, dialogueView } from '../src/rules/story.js';
import { START_AT, CRITICAL_PATH, SUN_PATH, IRON_PATH, GLOOM_PATH, ACT3_PATH, HEARTHS } from '../src/data/world.js';
import { MAPS, ENTITY_OF } from '../src/data/maps/index.js';
import { ENCOUNTERS } from '../src/data/encounters.js';
import { DIALOGUE } from '../src/data/dialogue.js';
import { dirTo } from '../src/rules/path.js';
import { check } from '../src/rules/cond.js';
import { levelUp } from '../src/rules/progression.js';
import { createRng } from '../src/core/rng.js';
import { playOut } from './helpers.mjs';

class Stuck extends Error {}

// A forced win: every foe at 1 HP (M7: and Guard 0, so a low-level walking party can land a blow on the Hollow Council,
// and a Council member who heals cannot outlast it), every hero at 500 HP, then the autoplay policy plays it out.
function forceWin(game, where) {
  const { game: g, battle } = startBattle(game, where.nodeId ? { nodeId: where.nodeId } : { patrol: where.patrol }, where.opts || {});
  const b = structuredClone(battle);
  for (const u of Object.values(b.units)) if (u.side === 'foe') { u.hp = 1; u.guard = 0; }
  for (const u of Object.values(b.units)) if (u.side === 'hero') { u.hp = u.maxHp = 500; }
  const played = playOut(b).state;
  if (played.ended?.result !== 'victory') throw new Stuck(`a forced win was not a win (${played.ended?.result})`);
  return resolveBattle(g, played);
}

// `game` (a save to start from), `path` (the targets, in order) and `start` (where to enter) default to
// M3's long walk: newGame, CRITICAL_PATH, the Great Hall.
function makeBot(starter, { game = null, path = CRITICAL_PATH, start = null } = {}) {
  const s = { game: game || newGame({ name: 'Tess', seed: 9, starter }), walk: null, log: [], steps: 0, held: 0, exits: new Set() };
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
        case 'exit': log(`exit ${e.id}`); s.exits.add(e.id); enter({ map: e.to, anchor: e.anchor }); return 'exit';
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
    // a loop guard, not a limit on the world: M5's way home from under Frostmere crosses 15 maps
    for (let hops = 0; hops < 24 && s.walk.map !== target; hops++) {
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

  // M5: a path step 'npc:<id>' walks up to that person and talks (Thane Brundar gives the Rune-Key)
  function talk(npc) {
    const where = Object.values(MAPS).find(m => m.entities.some(e => e.kind === 'npc' && e.npc === npc));
    if (!where) stuck(`nobody called ${npc} stands on a map`);
    const e = where.entities.find(x => x.kind === 'npc' && x.npc === npc);
    goToMap(where.id);
    if (walkTo(e.at[0], e.at[1], { adjacent: true }) === 'exit') return talk(npc);
    face(e.at[0], e.at[1]);
    const r = interact(s.game, s.walk);
    s.game = r.game; s.walk = r.walk;
    if (!r.events.some(ev => ev.t === 'talk')) stuck(`could not talk to ${npc}`);
    handle(r.events);
    return null;
  }

  // M6: a path step 'pay:<npc>' walks up to that person and pays what the day asks: the dialogue choice that carries a
  // price and is not disabled (Hodge's toll; the lead's `pay` effect, P3's toll lines). The gate it opens held the road
  // until then.
  function pay(npc) {
    const where = Object.values(MAPS).find(m => m.entities.some(e => e.kind === 'npc' && e.npc === npc));
    if (!where) stuck(`nobody called ${npc} stands on a map`);
    const e = where.entities.find(x => x.kind === 'npc' && x.npc === npc);
    goToMap(where.id);
    const bar = where.entities.find(g => g.kind === 'gate' && JSON.stringify(g.open || {}).includes(`"${npc}"`));
    if (bar) {
      const road = where.roads.find(r => r.gates.includes(bar.id));
      const exit = where.exits.find(x => x.id === road.to);
      if (findPath(s.game, s.walk, [exit.area[0], exit.area[1]], { max: 800 })) stuck(`the road past ${bar.id} is open before the toll is paid`);
      s.held++;
    }
    if (walkTo(e.at[0], e.at[1], { adjacent: true }) === 'exit') return pay(npc);
    face(e.at[0], e.at[1]);
    const r = interact(s.game, s.walk);
    const ev = r.events.find(x => x.t === 'talk');
    if (!ev?.dialogue) stuck(`could not talk to ${npc}`);
    const d = enterDialogue(s.game, ev.dialogue);
    s.game = d.game;
    handle(d.events);
    const v = dialogueView(s.game, ev.dialogue);
    const pick = v.choices.find(c => c.price && !c.disabled);
    if (!pick) stuck(`${npc} asks a price the party cannot pay: ${v.choices.map(c => c.text).join(' / ')}`);
    const c = choose(s.game, ev.dialogue, pick.i);
    s.game = c.game;
    handle(c.events);
    log(`paid ${npc}: ${JSON.stringify(pick.price)}`);
    return null;
  }

  function follow(ids) {
    for (const id of ids) {
      log(`-> ${id}`);
      if (id.startsWith('npc:')) talk(id.slice(4));
      else if (id.startsWith('pay:')) pay(id.slice(4));
      else reach(id);
    }
    return s;
  }

  return {
    run() {
      enter(start || { map: START_AT.map, at: [START_AT.x, START_AT.y], face: START_AT.face });
      return follow(path);
    },
    // M7: walk on to more targets from where the bot stands (the Act III walk stops between the Council's fights)
    more(ids) { return follow(ids); },
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

// ---- M5: the Ironspire walk (spec §2.2, §8) ------------------------------------------------------------

// A Sunscorch-complete save: the M3 and M4 critical paths behind it (all four earlier Brands, the Waking at 4,
// both councils sat), standing in the Keep's courtyard, every hero at level 8 (the worst case the map tests
// allow) and only the starter relic in the pack.
function sunscorchSave(starter) {
  const g = actOneSave(starter);
  g.progress.brands.push('brand-of-glass', 'brand-of-ash');
  g.progress.waking = 4;
  const f = g.progress.flags;
  for (const id of SUN_PATH) {
    const e = ENCOUNTERS[id];
    if (e.type === 'hearthfire') { f.kindled[id] = true; continue; }
    f.beaten[id] = 1;
    if (e.once) f.done[id] = true;
    if (e.opens) f.unlocked[e.opens] = true;
  }
  Object.assign(f.story, { 'tamsin-yielded-2': true, 'sunscorch-complete': true, 'council-2-done': true });
  return g;
}

// IRON_PATH as a player walks it: Thane Brundar is asked for his Rune-Key once Tamsin's duel is settled
const IRON_WALK = IRON_PATH.flatMap(id => (id === 'tamsin-ironhold' ? [id, 'npc:brundar'] : [id]));

for (const starter of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) {
  test(`the Ironspire walk (${starter}): from a Sunscorch-complete save through the east postern, IRON_PATH to both Brands, then home`, () => {
    const bot = makeBot(starter, { game: sunscorchSave(starter), path: IRON_WALK, start: { map: 'keep', anchor: 'from-hall' } });
    const s = bot.run();
    const f = s.game.progress.flags;
    assert.ok(s.game.progress.brands.includes('brand-of-iron') && s.game.progress.brands.includes('brand-of-frost'), 'both Ironspire Brands');
    assert.equal(f.story['ironspire-complete'], true);
    for (const id of IRON_PATH) {
      if (HEARTHS[id]) assert.ok(f.kindled[id], `${id} kindled`);
      else assert.ok(f.beaten[id] || f.story[ENCOUNTERS[id].yields], `${id} fought`);
    }
    assert.ok(f.story['rune-given'], 'Thane Brundar gave the Rune-Key');
    // the way home from under Frostmere is open (the Deeps and Beneath Frostmere are underground: no travel)
    bot.home('keep-hall');
    assert.equal(s.walk.map, 'keep-hall');
    assert.equal(s.game.progress.flags.story['council-3-done'], true, 'the third council plays in the Great Hall');
    assert.ok(s.steps > 300, `${s.steps} steps`);
    assert.ok(s.held >= 9, `the road held before ${s.held} fights (M4.5)`);
  });
}

// ---- M6: the Gloomfen walk (spec §2.2, §8) ------------------------------------------------------------

// An Ironspire-complete save: the M3, M4 and M5 critical paths behind it (all six earlier Brands, the Waking at 6, the
// three councils sat), standing in the Keep's courtyard, every hero at level 8 (the worst case the map tests allow),
// only the starter relic in the pack, and the purse the Ironspire left it: enough to meet any of Hodge's three prices.
function ironspireSave(starter) {
  const g = sunscorchSave(starter);
  g.progress.brands.push('brand-of-iron', 'brand-of-frost');
  g.progress.waking = 6;
  const f = g.progress.flags;
  for (const id of IRON_PATH) {
    const e = ENCOUNTERS[id];
    if (e.type === 'hearthfire') { f.kindled[id] = true; continue; }
    f.beaten[id] = 1;
    if (e.once) f.done[id] = true;
    if (e.opens) f.unlocked[e.opens] = true;
  }
  Object.assign(f.story, { 'tamsin-yielded-3': true, 'met-wynn': true, 'highfold-open': true, 'rune-given': true, 'ironspire-complete': true, 'council-3-done': true });
  g.gold = 600;
  g.materials = { ...g.materials, silver: 3 };
  g.bag = { ...g.bag, 'hearth-tonic': (g.bag['hearth-tonic'] || 0) + 4 };
  return g;
}

// GLOOM_PATH as a player walks it: Hodge is paid at his bar before Tamsin's gate
const GLOOM_WALK = GLOOM_PATH.flatMap(id => (id === 'tamsin-rotbridge' ? ['pay:hodge', id] : [id]));

for (const starter of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) {
  test(`the Gloomfen walk (${starter}): from an Ironspire-complete save down the fen stair, GLOOM_PATH to both Brands, then home across the causeway`, () => {
    const bot = makeBot(starter, { game: ironspireSave(starter), path: GLOOM_WALK, start: { map: 'keep', anchor: 'from-hall' } });
    const s = bot.run();
    const f = s.game.progress.flags;
    assert.ok(s.game.progress.brands.includes('brand-of-lanterns') && s.game.progress.brands.includes('brand-of-the-deep'), 'both Gloomfen Brands');
    assert.equal(f.story['gloomfen-complete'], true);
    for (const id of GLOOM_PATH) {
      if (HEARTHS[id]) assert.ok(f.kindled[id], `${id} kindled`);
      else assert.ok(f.beaten[id] || f.story[ENCOUNTERS[id].yields], `${id} fought`);
    }
    assert.ok(s.exits.has('mf-fen-stair'), 'in down the fen stair below Mossfall');
    assert.equal(f.story['toll-paid'], true, 'Hodge was paid the day\'s price');
    assert.ok(!f.beaten.hodge, 'and nobody fought him');
    // the way home: the Blackwater has fallen, the causeway is dry, and the Keep's south-west gate is open
    bot.home('keep-hall');
    assert.equal(s.walk.map, 'keep-hall');
    assert.ok(s.exits.has('bm-causeway') && s.exits.has('cw-n'), 'home across the causeway and through the Keep\'s south-west gate');
    assert.equal(s.game.progress.flags.story['council-4-done'], true, 'the fourth council plays in the Great Hall');
    assert.ok(s.steps > 300, `${s.steps} steps`);
    assert.ok(s.held >= 13, `the road held before ${s.held} fights and Hodge's bar (M4.5)`);
  });
}

// ---- M7: the Act III walk (spec §2.2, §8) ------------------------------------------------------------

// A Gloomfen-complete save: the M3 to M6 critical paths behind it (all eight Brands, the Waking at 8, the four councils
// sat, Tamsin fallen at Rotbridge), standing in the Keep's courtyard, every hero at level 8 (the worst case the map tests
// allow) and only the starter relic in the pack.
function gloomfenSave(starter) {
  const g = ironspireSave(starter);
  g.progress.brands.push('brand-of-lanterns', 'brand-of-the-deep');
  g.progress.waking = 8;
  const f = g.progress.flags;
  for (const id of GLOOM_PATH) {
    const e = ENCOUNTERS[id];
    if (e.type === 'hearthfire') { f.kindled[id] = true; continue; }
    f.beaten[id] = 1;
    if (e.once) f.done[id] = true;
    if (e.opens) f.unlocked[e.opens] = true;
  }
  Object.assign(f.story, { 'toll-paid': true, 'tamsin-yielded-4': true, 'tamsin-fallen': true, 'gloomfen-complete': true, 'council-4-done': true });
  return g;
}

// ACT3_PATH as a player walks it: Tamsin, waiting before the forge door, is spoken to (and joins) past the Chain Fire
const ACT3_WALK = ACT3_PATH.flatMap(id => (id === 'chain-fire' ? [id, 'npc:tamsin'] : [id]));

// The stair back up to the vault, tried from its foot in the Hollow Hall: the event a step onto it gives
function stairBack(game) {
  const [x, y] = MAPS['hollow-hall'].anchors['from-vault'];
  const walk = { map: 'hollow-hall', visit: 1, x, y, face: 's', tick: 0, rng: 1, grace: 0, gone: {}, roamers: [] };
  const up = MAPS['hollow-hall'].exits.find(e => e.id === 'hh-up');
  const dir = [['n', 0, -1], ['e', 1, 0], ['s', 0, 1], ['w', -1, 0]].find(([, dx, dy]) => x + dx >= up.area[0] && x + dx <= up.area[2] && y + dy >= up.area[1] && y + dy <= up.area[3]);
  return move(game, walk, dir[0]).events.find(e => e.t === 'sealed' || e.t === 'exit');
}

for (const starter of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) {
  test(`the Act III walk (${starter}): from a Gloomfen-complete save down the vault stair, ACT3_PATH to the Unsmith, then home`, () => {
    // down to the Hollow Hall and through Miravel's soot line; then the stair behind has filled with ash, and it stays
    // so until the last chair is empty (spec §2.2, A11)
    const miravel = ACT3_WALK.indexOf('hollow-miravel') + 1, gretch = ACT3_WALK.indexOf('hollow-gretch') + 1;
    const bot = makeBot(starter, { game: gloomfenSave(starter), path: ACT3_WALK.slice(0, miravel), start: { map: 'keep', anchor: 'from-hall' } });
    let s = bot.run();
    assert.equal(stairBack(gloomfenSave(starter)).t, 'exit', 'before the Council sits, the stair back is a way home');
    const shut = stairBack(s.game);
    assert.equal(shut.t, 'sealed', 'once Miravel falls, the stair back is shut');
    assert.equal(`${shut.text} ${shut.hint}`, 'The stair behind you has filled with ash. The Hollow Council sits until the last chair is empty.');
    s = bot.more(ACT3_WALK.slice(miravel, gretch - 1));
    assert.equal(stairBack(s.game).t, 'sealed', 'still shut while Gretch holds the last chair');
    s = bot.more(ACT3_WALK.slice(gretch - 1, gretch));
    assert.equal(stairBack(s.game).t, 'exit', 'open again once the last chair is empty');
    s = bot.more(ACT3_WALK.slice(gretch));
    const f = s.game.progress.flags;
    assert.equal(f.story['council-5-done'], true, 'the fifth council played in the Great Hall');
    assert.ok(s.exits.has('hall-down'), 'down the vault stair');
    for (const id of ACT3_PATH) {
      if (HEARTHS[id]) assert.ok(f.kindled[id], `${id} kindled`);
      else assert.ok(f.beaten[id], `${id} fought`);
    }
    assert.equal(f.story['tamsin-returned'], true, 'Tamsin joined in the Chained Deep');
    assert.ok(!present(s.game, 'chained-deep').some(e => e.id === 'cd-tamsin'), 'and left her place before the forge door');
    // the way home: the last chair is empty, so the stair back to the vault is open again
    bot.home('keep-hall');
    assert.equal(s.walk.map, 'keep-hall');
    assert.ok(s.exits.has('hh-up'), 'home up the Hollow Hall\'s stair');
    assert.ok(s.steps > 300, `${s.steps} steps`);
    assert.ok(s.held >= 7, `the road held before ${s.held} fights (M4.5)`);
  });
}
