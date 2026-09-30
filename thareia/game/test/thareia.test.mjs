// Thareia (T1): the Prologue's maps, people, scenes and sky, and its story played through the rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, TH_MAP_IDS, anchor } from '../src/data/maps/index.js';
import { tileOf } from '../src/data/tiles.js';
import { NPCS } from '../src/data/npcs.js';
import { HEROES, THAREIA_START } from '../src/data/heroes.js';
import { ENCOUNTERS } from '../src/data/encounters.js';
import { HEARTHS, TH_START_AT, TH_START_HEARTH } from '../src/data/world.js';
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
      if (e.dialogue || e.talk) assert.ok(TH_DIALOGUE[e.dialogue || e.talk], `${id}/${e.id}: scene ${e.dialogue || e.talk}`);
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
