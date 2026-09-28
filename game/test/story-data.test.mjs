// Story data tests (M3 spec §3.1, §3.6, §4.4, §6.1 WP3S): ids, conditions, line lengths, quest
// targets, the beats around fights and rests, and "no flag is read that is never set". Owner: WP3S.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPCS } from '../src/data/npcs.js';
import { DIALOGUE, ARRIVALS, AFTER, RESTS, LOOKOUTS } from '../src/data/dialogue.js';
import { HEARTHS } from '../src/data/world.js';
import { QUESTS, BOUNTIES } from '../src/data/quests.js';
import { SHOPS } from '../src/data/shops.js';
import { LADDER } from '../src/data/ladder.js';
import { LETTERS } from '../src/data/letters.js';
import { MAPS } from '../src/data/maps/index.js';
import { ENCOUNTERS, BRANDS } from '../src/data/encounters.js';
import { RELICS } from '../src/data/relics.js';
import { HERO_IDS } from '../src/data/heroes.js';
import { CONSUMABLES } from '../src/data/items.js';
import { condErrors } from '../src/rules/cond.js';

const SPEAKERS = new Set([...Object.keys(NPCS), ...HERO_IDS, 'narrator']);
const conds = [];
const cond = (c, at) => { if (c !== undefined) conds.push([c, at]); };

test('dialogue: speakers exist, lines are at most 140 characters, every link resolves', () => {
  for (const [id, d] of Object.entries(DIALOGUE)) {
    assert.ok(d.lines.length, id);
    for (const [who, text] of d.lines) {
      assert.ok(SPEAKERS.has(who), `${id}: speaker ${who}`);
      assert.ok(text.length <= 140, `${id}: "${text.slice(0, 30)}..." is ${text.length} characters`);
    }
    for (const c of d.choices || []) {
      cond(c.if, `${id} choice`);
      for (const next of [c.next, c.check?.pass, c.check?.fail, c.contest?.pass, c.contest?.fail]) if (next) assert.ok(DIALOGUE[next], `${id} -> ${next}`);
      if (c.check) cond(c.check.adv, `${id} adv`);
      for (const e of c.do || []) if (e.fight) assert.ok(ENCOUNTERS[e.fight], `${id} fight ${e.fight}`);
    }
    for (const e of d.do || []) {
      if (e.give) assert.ok(RELICS[e.give], `${id} gives ${e.give}`);
      if (e.fight) assert.ok(ENCOUNTERS[e.fight], `${id} fight ${e.fight}`);
    }
  }
});

test('NPCs, map talk and triggers point at real dialogue', () => {
  for (const n of Object.values(NPCS)) for (const t of n.talk) { assert.ok(DIALOGUE[t.d], `${n.id} -> ${t.d}`); cond(t.if, n.id); }
  for (const m of Object.values(MAPS)) for (const e of m.entities) {
    cond(e.if, `${m.id}/${e.id}`);
    if (e.kind === 'gate') cond(e.open, `${m.id}/${e.id} open`);
    if (e.kind === 'npc') assert.ok(NPCS[e.npc], `${m.id}/${e.id} npc ${e.npc}`);
    if (e.kind === 'trigger') assert.ok(DIALOGUE[e.dialogue], `${m.id}/${e.id} -> ${e.dialogue}`);
    if (e.talk) assert.ok(DIALOGUE[e.talk], `${m.id}/${e.id} talk ${e.talk}`);
  }
  for (const e of Object.values(ENCOUNTERS)) if (e.talk) assert.ok(DIALOGUE[e.talk], `${e.id} talk`);
});

test('quests, bounties, shops, the Ladder and letters name real things', () => {
  for (const q of Object.values(QUESTS)) {
    cond(q.start, `${q.id} start`);
    assert.ok(NPCS[q.giver], `${q.id} giver`);
    for (const s of q.steps) {
      cond(s.done, `${q.id} step`);
      const m = MAPS[s.target.map];
      assert.ok(m, `${q.id}: map ${s.target.map}`);
      assert.ok(m.entities.some(e => e.id === s.target.entity), `${q.id}: ${s.target.map}/${s.target.entity}`);
    }
    if (q.reward.relic) assert.ok(RELICS[q.reward.relic]);
  }
  for (const b of Object.values(BOUNTIES)) assert.ok(ENCOUNTERS[b.enc], b.id);
  for (const s of Object.values(SHOPS)) for (const id of s.items) assert.ok(CONSUMABLES[id], `${s.id}: ${id}`);
  assert.equal(LADDER.filter(p => p.act === 1).length, 17);
  assert.equal(LADDER.filter(p => p.silhouette).length, 3);
  for (const p of LADDER) if (p.enc) assert.ok(ENCOUNTERS[p.enc]?.spawns?.[p.spawn], p.id);
  for (const b of Object.keys(BRANDS)) assert.ok(LETTERS[b]?.text, `letter for ${b}`);
});

test('every condition in the story data parses', () => {
  for (const [c, at] of conds) assert.deepEqual(condErrors(c), [], at);
  assert.ok(conds.length > 20);
});

test('arrivals, after-fight lines, rests and lookouts point at real things', () => {
  for (const [map, d] of Object.entries(ARRIVALS)) { assert.ok(MAPS[map], map); assert.ok(DIALOGUE[d], d); }
  for (const [enc, list] of Object.entries(AFTER)) {
    assert.ok(ENCOUNTERS[enc], enc);
    for (const a of list) { assert.ok(['victory', 'yield'].includes(a.on)); assert.ok(DIALOGUE[a.d], a.d); cond(a.if, `after ${enc}`); }
  }
  for (const r of RESTS) { assert.ok(HEARTHS[r.at], r.at); assert.ok(DIALOGUE[r.d], r.d); cond(r.if, `rest ${r.at}`); }
  for (const [id, l] of Object.entries(LOOKOUTS)) {
    assert.ok(DIALOGUE[id], `lookout ${id} has a dialogue`);
    for (const m of l.maps) assert.ok(MAPS[m], m);
  }
  // every bellframe and lookout on a map opens its own dialogue
  for (const m of Object.values(MAPS)) for (const e of m.entities) if (e.kind === 'bellframe' || e.kind === 'lookout') assert.ok(DIALOGUE[e.id], `${m.id}/${e.id}`);
});

// Flags set outside the story data, by the rules (gauntlet, migrate, world).
const RULE_FLAGS = ['act1-complete', 'tamsin-yielded', 'starter', 'm2-save', 'intro-done', 'met-dael', 'bounty-briarmaw'];

test('no flag is read that is never set', () => {
  const read = new Map(), set = new Set(RULE_FLAGS);
  const walk = (c, at) => {
    if (!c || typeof c !== 'object') return;
    if (Array.isArray(c)) { c.forEach(x => walk(x, at)); return; }
    if (typeof c.flag === 'string') read.set(c.flag, at);
    if (c.since?.flag) read.set(c.since.flag, at);
    for (const k of ['all', 'any']) if (c[k]) walk(c[k], at);
    if (c.not) walk(c.not, at);
  };
  for (const [c, at] of conds) walk(c, at);
  const effects = (list = []) => { for (const e of list) { if (e.set) set.add(e.set); if (e.letter) set.add(`letter:${e.letter}`); } };
  for (const d of Object.values(DIALOGUE)) { effects(d.do); for (const c of d.choices || []) effects(c.do); }
  for (const q of Object.values(QUESTS)) if (q.reward.set) set.add(q.reward.set);
  for (const m of Object.values(MAPS)) for (const e of m.entities) if (e.kind === 'chest' && e.loot?.story) set.add(e.loot.story);
  const missing = [...read.keys()].filter(f => !set.has(f)).map(f => `${f} (read by ${read.get(f)})`);
  assert.deepEqual(missing, []);
});

test('a trigger whose scene changes the game is guarded by a flag it sets, never by `once`', () => {
  // `once` is saved the moment the trigger fires, before the scene's effects are: a reload mid-scene
  // would lose them for good (the intro, the council). A flag guard lets the scene play again instead.
  const effects = (id, seen = new Set()) => {
    const n = DIALOGUE[id];
    if (!n || seen.has(id)) return false;
    seen.add(id);
    return !!n.do?.length || (n.choices || []).some(c => c.do?.length || c.contest || effects(c.next, seen)) || effects(n.next, seen);
  };
  for (const m of Object.values(MAPS)) for (const e of m.entities) {
    if (e.kind !== 'trigger' || !effects(e.dialogue)) continue;
    assert.ok(!e.once, `${m.id}/${e.id} plays ${e.dialogue}, which changes the game: guard it with a flag instead of once`);
    assert.ok(e.if, `${m.id}/${e.id} needs a guard so it stops once ${e.dialogue} has done its work`);
  }
});
