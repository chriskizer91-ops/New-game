// Story data tests (M3 spec §3.1, §3.6, §4.4, §6.1 WP3S). Owner: WP3S.
// SCAFFOLD: ids, conditions, line lengths and quest targets. WP3S adds "no flag is read that is
// never set" and the rest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPCS } from '../src/data/npcs.js';
import { DIALOGUE } from '../src/data/dialogue.js';
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
