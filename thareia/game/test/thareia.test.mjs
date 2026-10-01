// Thareia (T1): the Prologue's maps, people, scenes and sky, and its story played through the rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, TH_MAP_IDS, anchor } from '../src/data/maps/index.js';
import { tileOf } from '../src/data/tiles.js';
import { NPCS } from '../src/data/npcs.js';
import { HEROES, THAREIA_START } from '../src/data/heroes.js';
import { ENCOUNTERS } from '../src/data/encounters.js';
import { HEARTHS, TH_START_AT, TH_START_HEARTH } from '../src/data/world.js';
import { DIALOGUE } from '../src/data/dialogue.js';
import { TH_DIALOGUE, TH_AFTER } from '../src/data/thareia/dialogue.js';
import { TH_NPCS } from '../src/data/thareia/npcs.js';
import { TH_ENCOUNTERS } from '../src/data/thareia/encounters.js';
import { SKY_REGIONS, DOCKS, FLIGHTS, toWorld, toRegion } from '../src/data/thareia/sky.js';
import { newGame, spawnsFor } from '../src/rules/gauntlet.js';
import * as W from '../src/rules/world.js';
import * as St from '../src/rules/story.js';

const walkable = (map, x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && !tileOf(map.rows[y][x]).solid;
const covers = (e, x, y) => (e.area ? x >= e.area[0] && x <= e.area[2] && y >= e.area[1] && y <= e.area[3] : e.at[0] === x && e.at[1] === y);
// the tiles you can walk to from (x, y); solid entities (not triggers or signs laid over the painting) block
function reach(map, [x0, y0], { through = [] } = {}) {
  const block = map.entities.filter(e => !['trigger'].includes(e.kind) && !(e.kind === 'sign' && e.look === 'painted') && !through.includes(e.id) && e.at && !e.area);
  const blocked = (x, y) => block.some(e => covers(e, x, y));
  const seen = new Set([`${x0},${y0}`]), q = [[x0, y0]];
  // an exit into this same map (the docks' tower stair) joins its tile to its anchor
  const links = (map.exits || []).filter(ex => ex.to === map.id);
  while (q.length) {
    const [x, y] = q.pop();
    for (const ex of links) {
      const [ax, ay, bx, by] = ex.area;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= ax && x + dx <= bx && y + dy >= ay && y + dy <= by)) {
        const [tx, ty] = map.anchors[ex.anchor], k = `${tx},${ty}`;
        if (!seen.has(k)) { seen.add(k); q.push([tx, ty]); }
      }
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!seen.has(k) && walkable(map, nx, ny) && !blocked(nx, ny)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return seen;
}
const nextTo = (seen, e) => {
  const tiles = e.area ? [] : [e.at];
  if (e.area) for (let y = e.area[1]; y <= e.area[3]; y++) for (let x = e.area[0]; x <= e.area[2]; x++) tiles.push([x, y]);
  return tiles.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`)));
};

test('Thareia\'s maps: rows from the legend, anchors on walkable tiles, every exit and entity in bounds', () => {
  for (const id of TH_MAP_IDS) {
    const m = MAPS[id];
    assert.equal(m.rows.length, m.h, id);
    for (const r of m.rows) { assert.equal(r.length, m.w, id); for (const ch of r) assert.ok(tileOf(ch) && ch in { ...Object.fromEntries([...r].map(c => [c, 1])) }, `${id}: ${ch}`); }
    for (const [name, [x, y]] of Object.entries(m.anchors)) assert.ok(walkable(m, x, y), `${id}:${name} walkable`);
    for (const ex of m.exits) {
      const [x0, y0, x1, y1] = ex.area;
      assert.ok(x0 >= 0 && y0 >= 0 && x1 < m.w && y1 < m.h, `${id}/${ex.id} in bounds`);
      if (ex.to) assert.ok(anchor(ex.to, ex.anchor), `${id}/${ex.id}: ${ex.to}:${ex.anchor}`);
      else assert.ok(ex.sealed?.text, `${id}/${ex.id} says why it is shut`);
    }
    for (const e of m.entities) {
      if (e.kind === 'npc') assert.ok(NPCS[e.npc], `${id}/${e.id}: npc ${e.npc}`);
      if (e.kind === 'npc' || e.kind === 'chest' || e.kind === 'encounter') assert.ok(walkable(m, ...e.at), `${id}/${e.id} stands on walkable ground`);
      if (e.dialogue || e.talk) assert.ok(DIALOGUE[e.dialogue || e.talk], `${id}/${e.id}: scene ${e.dialogue || e.talk}`);
      if (e.kind === 'hearthfire') { assert.ok(HEARTHS[e.id] && ENCOUNTERS[e.id]?.type === 'hearthfire', e.id); assert.ok(walkable(m, e.stand[0], e.stand[1]), `${e.id} stand`); }
      if (e.kind === 'encounter') assert.ok(ENCOUNTERS[e.enc], e.enc);
    }
  }
  // the painted maps draw their own painting, or another map's (`paint`)
  assert.equal(MAPS['th-bogmire'].paint, 'bogmire');
  assert.deepEqual(MAPS['th-bogmire'].rows, MAPS.bogmire.rows, 'Thareia\'s Bogmire walks as the painting was traced');
  assert.deepEqual(MAPS['th-thornhollow'].rows, MAPS.thornhollow.rows);
});

test('the docks: from the start you reach the town stair, Yara, the crate, the skiff, the fire and every person; the island cache lies past the leeches', () => {
  const m = MAPS['bogmire-docks'];
  const seen = reach(m, MAPS['bogmire-docks'].anchors.start);
  for (const id of ['yara', 'dock-crate', 'skiff', 'docks-lantern', 'dock-fisher', 'dock-widow', 'dk-leeches', 'docks-sign']) assert.ok(nextTo(seen, m.entities.find(e => e.id === id)), `reach ${id}`);
  assert.ok(seen.has('23,0') || seen.has('24,0'), 'the stair up to the town');
  const cache = m.entities.find(e => e.id === 'island-cache');
  assert.ok(!nextTo(seen, cache), 'the leeches hold the way to the reed island');
  assert.ok(nextTo(reach(m, m.anchors.start, { through: ['dk-leeches'] }), cache), 'past them, the cache');
  // the town: from the docks' stair to the board and Merryn
  const t = MAPS['th-bogmire'], ts = reach(t, t.anchors['from-docks']);
  for (const id of ['th-board', 'merryn', 'th-gretch', 'th-watch']) assert.ok(nextTo(ts, t.entities.find(e => e.id === id)), `town: reach ${id}`);
});

test('Thareia\'s people and scenes name real things; every line fits', () => {
  const speakers = new Set(['narrator', 'warden', ...Object.keys(HEROES), ...Object.keys(NPCS)]);
  for (const [id, d] of Object.entries(TH_DIALOGUE)) {
    for (const [who, line] of d.lines) { assert.ok(speakers.has(who), `${id}: ${who}`); assert.ok(line.length <= 140, `${id}: ${line.length} chars`); }
    const effects = [...(d.do || []), ...(d.choices || []).flatMap(c => c.do || [])];
    for (const c of d.choices || []) if (c.next) assert.ok(TH_DIALOGUE[c.next], `${id} -> ${c.next}`);
    for (const e of effects) {
      if (e.fight) assert.ok(TH_ENCOUNTERS[e.fight], e.fight);
      if (e.join || e.leave) assert.ok(HEROES[e.join || e.leave], id);
      if (e.open) assert.ok(e.open.startsWith('sky:') ? FLIGHTS[e.open.slice(4)] : true, e.open);
    }
  }
  for (const n of Object.values(TH_NPCS)) for (const t of n.talk) assert.ok(TH_DIALOGUE[t.d], `${n.id}: ${t.d}`);
  for (const [enc, list] of Object.entries(TH_AFTER)) { assert.ok(TH_ENCOUNTERS[enc], enc); for (const a of list) assert.ok(TH_DIALOGUE[a.d], a.d); }
  for (const id of ['pr-lurkers', 'pr-smugglers', 'dk-leeches']) assert.ok(spawnsFor(newGame({ seed: 1 }), id).length >= 2, id);
});

test('the sky: docks on their paintings and on walkable anchors; the region paintings map to the continent and back', () => {
  for (const d of Object.values(DOCKS)) {
    assert.ok(SKY_REGIONS[d.region], d.id);
    const a = anchor(d.map, d.anchor);
    assert.ok(a && walkable(MAPS[d.map], a.x, a.y), `${d.id}: lands on ${d.map}:${d.anchor}`);
    const back = toRegion(toWorld(d.region, d.at));
    assert.equal(back.region, d.region); assert.ok(Math.abs(back.at[0] - d.at[0]) < 1e-6 && Math.abs(back.at[1] - d.at[1]) < 1e-6);
  }
  for (const f of Object.values(FLIGHTS)) { assert.ok(DOCKS[f.from] && DOCKS[f.to]); for (const [who] of f.lines) assert.ok(HEROES[who] || NPCS[who]); }
  // flying north off the top of the Gloomfen comes down onto the bottom of the Verdant Wilds
  const up = toRegion(toWorld('gloomfen', [700, -2]));
  assert.equal(up.region, 'verdant'); assert.ok(up.at[1] > 1000);
});

test('the Prologue plays through the rules: hired, the crate, both fights, the shard, the skiff, and Thornhollow', () => {
  let g = newGame({ name: 'Wren', seed: 11, heroes: THAREIA_START, at: TH_START_AT, hearth: TH_START_HEARTH });
  assert.deepEqual(g.party.active, ['warden']);
  assert.equal(g.progress.pos.map, 'bogmire-docks');
  const r = W.enterMap(g, { map: 'bogmire-docks', at: [TH_START_AT.x, TH_START_AT.y], face: 'n' });
  assert.ok(r.events.some(e => e.t === 'trigger' && e.dialogue === 'th-intro'));
  g = St.enterDialogue(r.game, 'th-intro').game;
  // the ticket: the skiff takes you at once, and the shard comes with it
  assert.ok(St.dialogueView(g, 'th-skiff').choices.some(c => c.text.startsWith('Show your ticket')));
  const early = St.enterDialogue(g, 'th-board-early');
  assert.deepEqual(early.events.map(e => e.t), ['cut', 'note', 'open']);
  assert.equal(early.events[2].screen, 'sky:first-flight');
  assert.ok(early.game.progress.flags.story['th-shard']);
  assert.equal(St.talkTo(g, 'yara'), 'th-yara-first');
  g = St.enterDialogue(g, 'th-board').game;
  assert.equal(St.talkTo(g, 'yara'), 'th-yara-hire');
  const hired = St.enterDialogue(g, 'th-yara-hired');
  g = hired.game;
  assert.deepEqual(g.party.active, ['warden', 'yara']);
  assert.equal(g.party.roster.yara.level, 2, 'a level above the hero');
  assert.ok(St.dialogueView(g, 'th-crate').choices.some(c => c.text.startsWith('Lift')));
  const cracked = St.enterDialogue(g, 'th-crate-cracks');
  assert.deepEqual(cracked.events.map(e => e.t), ['cut', 'fight']);
  assert.equal(cracked.events[1].enc, 'pr-lurkers');
  g = cracked.game;
  // a wipe before the fights are won: the crate and Yara both offer them again
  assert.ok(St.dialogueView(g, 'th-crate').choices.some(c => c.text.startsWith('Face')));
  assert.equal(St.afterDialogue(g, 'pr-lurkers', 'victory'), 'th-after-lurkers');
  assert.equal(St.afterDialogue(g, 'pr-smugglers', 'victory'), 'th-shard');
  g = St.enterDialogue(g, 'th-shard').game;
  assert.ok(St.dialogueView(g, 'th-skiff').choices.some(c => c.text.startsWith('Climb')));
  const land = St.enterDialogue(g, 'th-landing');
  assert.deepEqual(land.events.map(e => e.t), ['gold', 'leave', 'end']);
  assert.deepEqual(land.game.party.active, ['warden']);
  assert.ok(!land.game.party.roster.yara);
  assert.ok(!land.game.inventory.some(it => it.chronicle?.bearers?.includes('yara')), 'Yara takes her gear with her');
});

// ==== Thareia T2: Chapter 1, "The Rot's Roots" (design/09-t2-spec.md section 7.1) ====================================
// Each package checks its own part in test/c1-*.test.mjs; these are the spec's cross-package checks, kept with T1's.
import { MAPS as ALL_OLD_MAPS } from './old-world.mjs';
import { DIALOGUE as ALL_DIALOGUE, AFTER as ALL_AFTER } from '../src/data/dialogue.js';
import { QUESTS } from '../src/data/quests.js';
import { RELICS } from '../src/data/relics.js';
import { LOCKS } from '../src/data/locks.js';
import { C1_DIALOGUE } from '../src/data/thareia/c1-dialogue.js';
import { C1_NPCS } from '../src/data/thareia/c1-npcs.js';
import { C1_QUESTS } from '../src/data/thareia/c1-quests.js';
import { C1_KEYS } from '../src/data/thareia/c1-keys.js';
import { C1_OBJECTIVES } from '../src/data/thareia/c1-objectives.js';
import { C1_ENCOUNTERS } from '../src/data/thareia/c1-encounters.js';
import { FOES } from '../src/data/foes.js';
import { HIRE_FLIGHT, SKY_MARKS } from '../src/data/thareia/sky.js';
import { dockState, regionOpen } from '../src/rules/sky.js';
import { CUTS } from '../src/ui/assets/cuts/index.js';
import { check } from '../src/rules/cond.js';
import { partyLevel } from '../src/rules/gauntlet.js';
import { buildFoe } from '../src/rules/foe.js';
import { grantXp } from '../src/rules/progression.js';
import { rngFrom } from '../src/rules/util.js';

const C1_MAPS = ['th-landing', 'th-thornhollow', 'th-thornway', 'th-eldergrove', 'th-heartroot-1', 'th-mossfall', 'th-mosswatch-1',
  'th-mosswatch-2', 'th-hindwood', 'th-fawnrest', 'th-briarmaw-den', 'th-fawnrest-node', 'th-fjords-cove'];
const PAINTED = ['th-landing', 'th-fawnrest-node', 'th-fjords-cove']; // traced from the player's paintings (G), 48 x 32
const STEP4 = [['n', [0, -1]], ['e', [1, 0]], ['s', [0, 1]], ['w', [-1, 0]]];
const cells = e => { const [x0, y0, x1, y1] = e.area || [e.at[0], e.at[1], e.at[0], e.at[1]], out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]); return out; };

test('T2 maps (2.12, 7.1 items 1 and 3): every Chapter 1 map is registered; copies keep the old rows; ids are unique across all maps; gated exits say why', () => {
  for (const id of C1_MAPS) assert.ok(TH_MAP_IDS.includes(id) && MAPS[id], `${id} registered`);
  for (const id of C1_MAPS.filter(id => !PAINTED.includes(id))) {
    const m = MAPS[id], old = ALL_OLD_MAPS[m.paint];
    assert.ok(old, `${id} draws an old painting (${m.paint})`);
    assert.deepEqual(m.rows, old.rows, `${id}: the old rows`);
    assert.equal(m.region, 'verdant', id);
  }
  for (const id of PAINTED) { assert.equal(MAPS[id].w, 48, id); assert.equal(MAPS[id].h, 32, id); }
  // the fixed ids of the painted maps, where G traced them
  assert.deepEqual(MAPS['th-fawnrest-node'].entities.find(e => e.id === 'th-fn-node').at, [25, 15]);
  assert.deepEqual(MAPS['th-landing'].anchors['from-skiff'].slice(0, 2), [29, 16]);
  assert.deepEqual(MAPS['th-fjords-cove'].anchors['from-boat'].slice(0, 2), [36, 23]);
  // lock, gate, chest and trigger ids: one of each across every map, the old ones included
  const seen = new Map();
  for (const m of Object.values(MAPS)) for (const e of m.entities) if (['lock', 'gate', 'chest', 'trigger'].includes(e.kind)) {
    assert.ok(!seen.has(e.id) || seen.get(e.id) === m.id, `${e.id} on ${m.id} and ${seen.get(e.id)}`);
    seen.set(e.id, m.id);
  }
  for (const id of C1_MAPS) {
    const m = MAPS[id];
    for (const ex of m.exits) {
      if (ex.gate) assert.ok(ex.sealed?.text, `${id}/${ex.id}: a gated exit says why it is shut`);
      if (ex.to) assert.ok(anchor(ex.to, ex.anchor), `${id}/${ex.id}: ${ex.to}:${ex.anchor}`);
    }
    for (const e of m.entities) {
      for (const [x, y] of cells(e)) assert.ok(x >= 0 && y >= 0 && x < m.w && y < m.h, `${id}/${e.id} in bounds`);
      if (e.kind === 'hearthfire') {
        assert.ok(walkable(m, ...e.stand), `${id}/${e.id}: stand walkable`);
        assert.ok(cells(e).some(([x, y]) => Math.abs(x - e.stand[0]) + Math.abs(y - e.stand[1]) === 1), `${id}/${e.id} touches its stand`);
      }
    }
  }
});

// reachability through the engine's own walk rule (gates, locks and story fights on the map)
function wonGame({ flags = [], won = [] } = {}) {
  const g = newGame({ seed: 7 }), f = g.progress.flags;
  f.story = { ...(f.story || {}), ...Object.fromEntries(flags.map(k => [k, true])) };
  f.done = { ...(f.done || {}), ...Object.fromEntries(won.map(k => [k, true])) };
  f.beaten = { ...(f.beaten || {}), ...Object.fromEntries(won.map(k => [k, 1])) };
  return g;
}
function walkFrom(game, mapId, from) {
  const [x0, y0] = MAPS[mapId].anchors[from], seen = new Set([`${x0},${y0}`]), q = [[x0, y0]];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dir, [dx, dy]] of STEP4) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!seen.has(k) && W.canWalk(game, mapId, nx, ny, { dir })) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return seen;
}
const gets = (game, mapId, from, id) => {
  const m = MAPS[mapId], e = m.entities.find(x => x.id === id) || m.exits.find(x => x.id === id), s = walkFrom(game, mapId, from);
  if (m.exits.includes(e) || e.kind === 'trigger') return cells(e).some(([x, y]) => s.has(`${x},${y}`));
  return cells(e).some(([x, y]) => STEP4.some(([, [dx, dy]]) => s.has(`${x + dx},${y + dy}`)));
};

test('T2 reachability (7.1 item 2): the Thornway, the Heartroot, the Hindwood crossings and the node open as the story does', () => {
  assert.ok(!gets(wonGame(), 'th-thornway', 'from-thornhollow', 'tw-n'), 'the road is held');
  assert.ok(gets(wonGame({ won: ['c1-runner-camp', 'c1-bramble-deep'] }), 'th-thornway', 'from-thornhollow', 'tw-n'));
  assert.ok(!gets(wonGame(), 'th-heartroot-1', 'from-tree', 'c1-hr-spring'), 'the grubs hold the tunnel');
  assert.ok(gets(wonGame({ won: ['c1-roots-grubs'] }), 'th-heartroot-1', 'from-tree', 'c1-hr-spring'));
  assert.ok(!gets(wonGame(), 'th-hindwood', 'from-thornhollow', 'hw-n'), 'both crossings shut');
  assert.ok(gets(wonGame({ won: ['c1-glowcaps'] }), 'th-hindwood', 'from-thornhollow', 'hw-n'));
  assert.ok(!gets(wonGame(), 'th-fawnrest-node', 'from-fawnrest', 'c1-guardian'), 'the node is shut');
  assert.ok(gets(wonGame({ won: ['c1-node-stair', 'c1-node-roots'] }), 'th-fawnrest-node', 'from-fawnrest', 'c1-guardian'));
  // the landing: the first step off the skiff is on the crate-thieves' ground; the town gate is open
  assert.ok(gets(wonGame(), 'th-landing', 'from-skiff', 'tl-n') && gets(wonGame(), 'th-landing', 'from-skiff', 'th-skyhire'));
  assert.ok(gets(wonGame(), 'th-fjords-cove', 'from-boat', 'c1-fjord-cove'));
});

const effectsOf = d => [...(d.do || []), ...(d.choices || []).flatMap(c => c.do || [])];
// cuts with a drawn fallback in the story view (they show the backdrop until a painting arrives)
const DRAWN_CUTS = new Set(['hearth-below']);

test('T2 references (7.1 item 4): talks, speakers, fights, cuts, keys, kindles, unlocks, cold talks and sign talks are real', () => {
  const speakers = new Set(['narrator', 'warden', ...Object.keys(HEROES), ...Object.keys(NPCS)]);
  const ids = new Set(Object.values(MAPS).flatMap(m => m.entities.map(e => e.id)));
  for (const [id, d] of Object.entries(C1_DIALOGUE)) {
    for (const [who] of d.lines) assert.ok(speakers.has(who), `${id}: ${who}`);
    for (const e of effectsOf(d)) {
      if (e.fight) assert.ok(ENCOUNTERS[e.fight], `${id}: fight ${e.fight}`);
      if (e.cut) assert.ok(CUTS[e.cut] || DRAWN_CUTS.has(e.cut), `${id}: cut ${e.cut}`);
      if (e.key) assert.ok(C1_KEYS[e.key], `${id}: key ${e.key}`);
      if (e.kindle) assert.ok(ids.has(e.kindle) && HEARTHS[e.kindle], `${id}: kindle ${e.kindle}`);
      if (e.unlock) assert.ok(ids.has(e.unlock), `${id}: unlock ${e.unlock}`);
    }
  }
  for (const n of Object.values(C1_NPCS)) for (const t of n.talk) assert.ok(ALL_DIALOGUE[t.d], `${n.id}: ${t.d}`);
  for (const id of C1_MAPS) for (const e of MAPS[id].entities) {
    if (e.coldTalk) assert.ok(ALL_DIALOGUE[e.coldTalk], `${id}/${e.id}: coldTalk`);
    if (e.talk) assert.ok(ALL_DIALOGUE[e.talk], `${id}/${e.id}: talk ${e.talk}`);
    if (e.kind === 'trigger') assert.ok(ALL_DIALOGUE[e.dialogue], `${id}/${e.id}: ${e.dialogue}`);
    if (e.kind === 'encounter') assert.ok(ENCOUNTERS[e.enc], `${id}/${e.id}: ${e.enc}`);
    if (e.kind === 'npc') assert.ok(NPCS[e.npc], `${id}/${e.id}: ${e.npc}`);
    if (e.lock) assert.ok(LOCKS[e.lock], `${id}/${e.id}: lock ${e.lock}`);
  }
  for (const [enc, list] of Object.entries(ALL_AFTER)) if (C1_ENCOUNTERS[enc]) for (const a of list) assert.ok(ALL_DIALOGUE[a.d], `${enc}: ${a.d}`);
  // every flag read in Chapter 1 is set somewhere (a scene's effect, a chest's loot.story, a quest reward, or T1's nodes)
  const set = new Set();
  for (const d of Object.values(ALL_DIALOGUE)) for (const e of effectsOf(d)) if (e.set) set.add(e.set);
  for (const m of Object.values(MAPS)) for (const e of m.entities) if (e.loot?.story) set.add(e.loot.story);
  for (const q of Object.values(QUESTS)) if (q.reward?.set) set.add(q.reward.set);
  const flags = (c, out = []) => { if (c && typeof c === 'object') { if (Array.isArray(c)) c.forEach(x => flags(x, out)); else { if (typeof c.flag === 'string') out.push(c.flag); for (const k of ['all', 'any']) if (c[k]) flags(c[k], out); if (c.not) flags(c.not, out); } } return out; };
  const reads = [];
  for (const [id, d] of Object.entries(C1_DIALOGUE)) for (const c of d.choices || []) reads.push(...flags(c.if).map(f => [f, id]));
  for (const n of Object.values(C1_NPCS)) for (const t of n.talk) reads.push(...flags(t.if).map(f => [f, n.id]));
  for (const q of Object.values(C1_QUESTS)) for (const s of [q.start, ...q.steps.map(x => x.done)]) reads.push(...flags(s).map(f => [f, q.id]));
  for (const o of C1_OBJECTIVES) reads.push(...flags(o.if).map(f => [f, o.text]));
  for (const id of C1_MAPS) for (const e of MAPS[id].entities) for (const k of ['if', 'talkIf', 'open', 'coldUntil']) reads.push(...flags(e[k]).map(f => [f, `${id}/${e.id}`]));
  for (const [f, at] of reads) assert.ok(set.has(f), `${at} reads ${f}, which nothing sets`);
});

// ---- the chapter's main path through the rules (7.1 item 5), from both ends of the Prologue ----
const C1_REPEATS = new Set(['set', 'unset', 'go', 'open', 'note', 'guest', 'text', 'value']);
function prologueDone(early) {
  let g = newGame({ name: 'Rook', seed: 5, heroes: THAREIA_START, at: TH_START_AT, hearth: TH_START_HEARTH });
  g = St.enterDialogue(g, 'th-intro').game;
  if (early) g = St.enterDialogue(g, 'th-board-early').game;
  else {
    for (const id of ['th-board', 'th-yara-hired', 'th-crate-cracks']) g = St.enterDialogue(g, id).game;
    for (const enc of ['pr-lurkers', 'pr-smugglers']) { g = structuredClone(g); g.progress.flags.beaten[enc] = 1; const d = St.afterDialogue(g, enc, 'victory'); if (d) g = St.enterDialogue(g, d).game; }
    g = structuredClone(g);
    g.party.roster.warden = grantXp(g.party.roster.warden, 63, rngFrom(3)).hero;
  }
  return St.enterDialogue(g, 'th-landing').game;
}
function mainPath(early) {
  let g = prologueDone(early);
  const events = [];
  const go = id => { const r = St.enterDialogue(g, id); g = r.game; events.push(...r.events); return r; };
  const won = enc => { g = structuredClone(g); g.progress.flags.beaten = { ...(g.progress.flags.beaten || {}), [enc]: 1 }; g.progress.flags.done = { ...(g.progress.flags.done || {}), [enc]: true }; const d = St.afterDialogue(g, enc, 'victory'); if (d) go(d); };
  const talk = (npc, want) => { assert.equal(St.talkTo(g, npc), want, `talk to ${npc}`); return go(want); };
  const choose = (id, text) => { const v = St.dialogueView(g, id); const c = v.choices.find(x => x.text === text); assert.ok(c && !c.disabled, `${id}: "${text}"`); const r = St.choose(g, id, c.i); g = r.game; events.push(...r.events); if (r.next) go(r.next); };
  const at = (text, where) => {
    assert.equal(St.nextObjective(g)?.text, text, `${early ? 'early' : 'fight'} route: ${where}`);
    // no loops: a talk that changes the game (pays, gives, fights) changes what the next talk picks
    for (const npc of ['aldric', 'th-ranger', 'taela', 'th-garret', 'th-keeper']) {
      const d = St.talkTo(g, npc);
      if (!d || effectsOf({ do: ALL_DIALOGUE[d].do }).every(e => Object.keys(e).every(k => C1_REPEATS.has(k)))) continue;
      assert.notEqual(St.talkTo(St.enterDialogue(g, d).game, npc), d, `${where}: ${npc} replays ${d}`);
    }
  };
  at('Stop the thieves at the crate.', 'the landing');
  go('c1-crate-thieves'); won('c1-landing');
  at('Find Aldric Fernshaw on the square.', 'the thieves beaten');
  talk('aldric', 'c1-aldric-start');
  at('Take the Thornway to Eldergrove.', 'the courier job');
  talk('th-ranger', 'c1-dael');
  won('c1-verdant-edge'); go('c1-tw-whisper'); won('c1-runner-camp'); won('c1-bramble-deep'); go('c1-tw-boots');
  go('c1-eg-arrive');
  at('Find Taela Greenmantle at the Eldest Tree.', 'Eldergrove');
  talk('taela', 'c1-taela-first');
  at('Hold the shard near the roots.', 'Taela met');
  go('c1-shard-glows');
  assert.ok(g.party.active.includes('taela') && g.party.roster.taela.guest === true, 'Taela joins as a guest');
  at('Stop the burners at the stone circle.', 'Taela a guest');
  go('c1-grove-circle-before'); won('c1-grove-circle');
  at('Go down under the Eldest Tree.', 'the circle saved');
  go('c1-hr-descent'); won('c1-roots-grubs'); won('c1-roots-sapwight'); go('c1-warm-water');
  at('Rest at Eldergrove\'s hearth.', 'the warm spring');
  assert.ok(St.dayShown(g));
  assert.equal(St.restDialogue(g, 'th-eg-hearth'), 'c1-pulse');
  go('c1-pulse');
  assert.ok(!St.dayShown(g), 'no day after the pulse (7.1 item 11)');
  at('Tell Aldric about the warm water.', 'the pulse');
  talk('aldric', 'c1-aldric-maps');
  at('Ask Ranger Dael to open the west road.', 'the sponsor');
  talk('th-ranger', 'c1-dael-west');
  at('Take the west road to Mosswatch Tower.', 'the west road');
  go('c1-mf-arrive'); talk('th-garret', 'c1-garret-first');
  at('Climb Mosswatch Tower to the Lamp Room.', 'Garret met');
  won('c1-mw-stair'); won('c1-mw-lantern');
  at('Talk to Garret in the Lamp Room.', 'the lantern');
  talk('th-garret', 'c1-rot-line');
  at('Go through the Hindwood to Fawnrest.', 'the Rot line');
  won('c1-glowcaps'); choose('c1-burners', 'Let Taela talk.');
  at('Go on to Fawnrest and find the keeper.', 'the burners');
  go('c1-fr-arrive'); talk('th-keeper', 'c1-keeper');
  at('Walk the shrine court with the shard.', 'the keeper');
  go('c1-stair');
  at('Go down the stair under the court.', 'the stair');
  won('c1-node-stair'); go('c1-fn-hall'); won('c1-node-hall'); won('c1-node-roots');
  at('Face what guards the node.', 'the node');
  go('c1-guardian-wakes'); won('c1-guardian');
  assert.ok(g.party.active.includes('taela') && !g.party.roster.taela.guest, 'the cooling clears guest: Taela joins for good');
  assert.ok(g.progress.flags.keys['th-lens']);
  at('Show Aldric the lens.', 'the node cooled');
  talk('aldric', 'c1-aldric-lens');
  at('Tell Ranger Dael.', 'the letter');
  talk('th-ranger', 'c1-dael-end');
  at('Chapter 1 is done. Chapter 2 comes next.', 'the end');
  talk('th-ranger', 'c1-dael-after');
  assert.equal(events.filter(e => e.t === 'end' && e.act === 'chapter-1').length, 1, 'the chapter ends once');
  assert.equal(events.filter(e => e.t === 'cut').map(e => e.cut || e.id).filter(Boolean).length >= 4, true, 'the cuts play');
  return g;
}

test('T2: Chapter 1\'s main path plays through the rules from the fight route (7.1 item 5)', () => { mainPath(false); });
test('T2: Chapter 1\'s main path plays through the rules from the early route: no Yara, level 1 (7.1 item 5)', () => {
  const g0 = prologueDone(true);
  assert.equal(g0.party.roster.warden.level, 1); assert.ok(!g0.party.roster.yara);
  mainPath(true);
});

test('T2 party (7.1 item 6): partyLevel leaves guests out; { heroLevel } reads the hero only', () => {
  const g = newGame({ seed: 3, heroes: THAREIA_START });
  g.party.roster.warden.level = 4;
  g.party.roster.taela = { ...g.party.roster.warden, id: 'taela', level: 5, guest: true };
  g.party.active = ['warden', 'taela'];
  assert.equal(partyLevel(g), 4);
  assert.ok(check(g, { heroLevel: 4 }) && !check(g, { heroLevel: 5 }));
});

test('T2 sky (7.1 items 7, 8 and 12): dockState, regionOpen, and the T1 dock at the landing', () => {
  const mk = (story = {}, docks = {}) => ({ world: 'thareia', progress: { flags: { story, docks } }, party: { active: ['warden'], roster: { warden: { level: 3 } } } });
  const hire = { ...HIRE_FLIGHT, from: 'thornhollow', to: null };
  assert.equal(dockState(mk(), DOCKS.eldergrove, hire).ok, false, 'no hire before the skiff is rented');
  const rented = mk({ 'c1-skiff-rented': true });
  assert.equal(dockState(rented, DOCKS.eldergrove, hire).ok, true);
  assert.equal(dockState(rented, DOCKS.fawnrest, hire).why, 'story', 'Fawnrest hidden before c1-fawnrest');
  assert.equal(dockState(rented, DOCKS.bogmire, hire).why, 'licence');
  assert.equal(dockState(rented, DOCKS.eldergrove, hire, { pick: 'map' }).why, 'unknown', 'unknown dock refused on the world map');
  assert.equal(dockState(rented, DOCKS.eldergrove, hire).ok, true, 'but allowed at 1x');
  assert.equal(regionOpen(rented, 'gloomfen', hire).ok, false, 'the hire skiff may not cross the Gloomfen');
  assert.equal(regionOpen(rented, 'gloomfen', FLIGHTS['first-flight']).ok, true, 'the ticket may');
  // T1: the ticket's dock is now the landing; the Fjords are a mark, not a dock; the hire flight is not a story flight
  assert.equal(DOCKS.thornhollow.map, 'th-landing'); assert.equal(DOCKS.thornhollow.anchor, 'from-skiff');
  assert.ok(!DOCKS.fjords && SKY_MARKS.fjords && !FLIGHTS.hire);
});

test('T2 hire (7.1 item 9): the prepaid flight costs 0 and is spent; then exactly 10 gp; no flight under 10 gp', () => {
  let g = prologueDone(false);
  for (const f of ['c1-skiff-rented', 'c1-hire-ticket']) g.progress.flags.story[f] = true;
  const gold = g.gold;
  const pick = (game, id, text) => { const c = St.dialogueView(game, id).choices.find(x => x.text === text); assert.ok(c, `${id}: ${text}`); return c; };
  let c = pick(g, 'c1-hire-thornhollow', 'Use Aldric\'s prepaid flight.');
  let r = St.choose(g, 'c1-hire-thornhollow', c.i);
  assert.equal(r.game.gold, gold); assert.ok(!r.game.progress.flags.story['c1-hire-ticket']);
  assert.ok(r.events.some(e => e.t === 'open' && e.screen === 'sky:hire@thornhollow'));
  g = r.game;
  assert.ok(!St.dialogueView(g, 'c1-hire-thornhollow').choices.some(x => x.text === 'Use Aldric\'s prepaid flight.'));
  c = pick(g, 'c1-hire-eldergrove', 'Hire a flight: 10 gp.');
  r = St.choose(g, 'c1-hire-eldergrove', c.i);
  assert.equal(r.game.gold, gold - 10);
  const poor = structuredClone(g); poor.gold = 9;
  assert.ok(pick(poor, 'c1-hire-eldergrove', 'Hire a flight: 10 gp.').disabled);
});

// the main path before Taela joins (optional lairs excepted)
const SOLO = ['c1-landing', 'c1-verdant-edge', 'c1-runner-camp', 'c1-bramble-deep'];
const BANNED = /Dustveil|Cistern|Unwaning|Tallym|tally|Brand|Sleeper|Hollow Council|Rotwarden|First Seed|Briarmaw/i;

test('T2 fights (7.1 item 10): families exist; no forbidden name shows; the solo fights are small; the guardian builds at L9 with 321 HP', () => {
  for (const [id, e] of Object.entries(C1_ENCOUNTERS)) {
    if (e.type === 'hearthfire') continue;
    for (const s of e.spawns) {
      assert.ok(FOES[s.family], `${id}: ${s.family}`);
      if (s.variant) assert.ok(FOES[s.family].variants?.[s.variant], `${id}: ${s.family}/${s.variant}`);
      const f = buildFoe(s, { id: 'x' });
      assert.ok(!BANNED.test(f.name), `${id}: shows "${f.name}"`);
      if (s.relic) assert.ok(RELICS[s.relic] && !BANNED.test(RELICS[s.relic].name), `${id}: relic ${s.relic}`);
    }
    for (const k of ['name', 'text']) if (e[k]) assert.ok(!BANNED.test(e[k]), `${id}: ${e[k]}`);
  }
  for (const id of SOLO) {
    const e = C1_ENCOUNTERS[id];
    assert.ok(e.spawns.length <= 2, `${id}: ${e.spawns.length} foes`);
    for (const s of e.spawns) assert.ok(s.level <= 4, `${id}: L${s.level}`);
  }
  const hart = buildFoe(C1_ENCOUNTERS['c1-guardian'].spawns[0], { id: 'hart' });
  assert.equal(hart.level, 9); assert.equal(hart.hp, 321);
  // the Hart holds both of its relics (the variant's own list, not the family's)
  assert.deepEqual(spawnsFor(newGame({ seed: 2 }), 'c1-guardian')[0].held.map(h => h.relic), ['rotwood-circlet', 'fawnrest-heartstone']);
});

test('T2 language (7.1 item 11): every Chapter 1 string fits in 140 characters and names nothing from the old game', () => {
  const out = [];
  for (const [id, d] of Object.entries(C1_DIALOGUE)) {
    for (const [, l] of d.lines) out.push([id, l]);
    for (const c of d.choices || []) out.push([id, c.text]);
    for (const e of effectsOf(d)) if (e.note || e.text) out.push([id, e.note || e.text]);
  }
  for (const n of Object.values(C1_NPCS)) out.push([n.id, n.name], [n.id, n.role]);
  for (const q of Object.values(C1_QUESTS)) { out.push([q.id, q.name]); for (const s of q.steps) out.push([q.id, s.text]); }
  for (const k of Object.values(C1_KEYS)) out.push(['key', k.name], ['key', k.text]);
  for (const o of C1_OBJECTIVES) out.push(['objective', o.text]);
  for (const e of Object.values(C1_ENCOUNTERS)) { if (e.name) out.push([e.id, e.name]); if (e.text) out.push([e.id, e.text]); }
  for (const r of Object.values(RELICS).filter(x => x.thareia)) {
    out.push([r.id, r.name], [r.id, r.lore], [r.id, r.holder], [r.id, r.power?.text || ''], [r.id, r.mapPower?.text || '']);
    for (const b of Object.values(r.awaken)) out.push([r.id, b.name], [r.id, b.text]);
  }
  for (const id of C1_MAPS) {
    const m = MAPS[id];
    out.push([id, m.name]);
    for (const e of m.entities) for (const k of ['text', 'note', 'name']) if (typeof e[k] === 'string') out.push([`${id}/${e.id}`, e[k]]);
    for (const ex of m.exits) if (ex.sealed) out.push([`${id}/${ex.id}`, ex.sealed.text], [`${id}/${ex.id}`, ex.sealed.hint || '']);
  }
  for (const [at, s] of out) {
    assert.ok(s.length <= 140, `${at}: ${s.length} chars`);
    assert.ok(!BANNED.test(s), `${at}: "${s}"`);
  }
});
