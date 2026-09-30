// Thareia (T2): Chapter 1's people and scenes (design/09-t2-spec.md 1, 3.1-3.3): every talk, after-fight and rest
// target exists; every speaker is a person, a hero or the narrator; every flag read is set somewhere; every line fits;
// the language guard; and the chapter played through the rules from both ends of the Prologue (the dock fights, and
// the early ticket), checking the objective line at each step and that no talk loops. Owner: P.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NPCS } from '../src/data/npcs.js';
import { DIALOGUE, AFTER, RESTS } from '../src/data/dialogue.js';
import { QUESTS } from '../src/data/quests.js';
import { SHOPS } from '../src/data/shops.js';
import { RELICS } from '../src/data/relics.js';
import { HEROES, THAREIA_START } from '../src/data/heroes.js';
import { MAPS, TH_MAP_IDS } from '../src/data/maps/index.js';
import { TH_START_AT, TH_START_HEARTH } from '../src/data/world.js';
import { C1_DIALOGUE, C1_AFTER, C1_RESTS } from '../src/data/thareia/c1-dialogue.js';
import { C1_NPCS } from '../src/data/thareia/c1-npcs.js';
import { C1_QUESTS } from '../src/data/thareia/c1-quests.js';
import { C1_SHOPS } from '../src/data/thareia/c1-shops.js';
import { C1_KEYS } from '../src/data/thareia/c1-keys.js';
import { C1_OBJECTIVES } from '../src/data/thareia/c1-objectives.js';
import { condErrors, questState } from '../src/rules/cond.js';
import { newGame } from '../src/rules/gauntlet.js';
import { grantXp } from '../src/rules/progression.js';
import { rngFrom } from '../src/rules/util.js';
import * as St from '../src/rules/story.js';

// ---- the data -------------------------------------------------------------------------------------------------------

const effectsOf = d => [...(d.do || []), ...(d.choices || []).flatMap(c => c.do || [])];
// the effects Chapter 1 may use (spec 3.2, 3.4); `claim` marks a side quest done in the Journal
const EFFECTS = new Set(['set', 'unset', 'gold', 'pay', 'bag', 'give', 'fight', 'cut', 'note', 'join', 'key', 'kindle', 'unlock', 'go', 'open', 'end', 'claim']);
const EXTRA_KEYS = new Set(['guest', 'text', 'value']);
const HIRE_DOCKS = ['thornhollow', 'eldergrove', 'mosswatch'];

test('Chapter 1: every talk, after-fight, rest, choice and check names a real scene; every speaker is real', () => {
  const speakers = new Set(['narrator', ...Object.keys(HEROES), ...Object.keys(NPCS)]);
  for (const [id, d] of Object.entries(C1_DIALOGUE)) {
    assert.ok(Array.isArray(d.lines) && d.lines.length, `${id}: lines`);
    for (const [who] of d.lines) assert.ok(speakers.has(who), `${id}: speaker ${who}`);
    for (const c of d.choices || []) {
      assert.ok(c.text, `${id}: a choice has text`);
      if (c.next) assert.ok(DIALOGUE[c.next], `${id} -> ${c.next}`);
      if (c.check) { assert.ok(DIALOGUE[c.check.pass] && DIALOGUE[c.check.fail], `${id}: check ends`); assert.ok(c.check.dc > 0); }
      assert.deepEqual(condErrors(c.if, `${id} choice`), []);
    }
    for (const e of effectsOf(d)) {
      const k = Object.keys(e).filter(x => !EXTRA_KEYS.has(x));
      assert.equal(k.length, 1, `${id}: one effect per entry ${JSON.stringify(e)}`);
      assert.ok(EFFECTS.has(k[0]), `${id}: effect ${k[0]}`);
      if (e.key) assert.ok(C1_KEYS[e.key], `${id}: key ${e.key}`);
      if (e.give) assert.ok(RELICS[e.give], `${id}: give ${e.give}`);
      if (e.claim) assert.ok(C1_QUESTS[e.claim], `${id}: claim ${e.claim}`);
      if (e.join) assert.equal(e.join, 'taela', `${id}: only Taela joins in Chapter 1`);
      if (e.go) assert.ok(MAPS[e.go.map]?.anchors?.[e.go.anchor], `${id}: go ${e.go.map}:${e.go.anchor}`);
      if (e.open) {
        const ok = e.open.startsWith('shop:') ? SHOPS[e.open.slice(5)] : HIRE_DOCKS.map(d2 => `sky:hire@${d2}`).includes(e.open);
        assert.ok(ok, `${id}: open ${e.open}`);
      }
      if (e.end) assert.equal(e.end, 'chapter-1', id);
    }
  }
  for (const n of Object.values(C1_NPCS)) {
    assert.ok(n.name && n.role && n.art, n.id);
    for (const t of n.talk) { assert.ok(DIALOGUE[t.d], `${n.id}: ${t.d}`); assert.deepEqual(condErrors(t.if, n.id), []); }
    if (n.talk.length) assert.equal(n.talk.at(-1).if, undefined, `${n.id}: the last talk always holds`);
  }
  for (const [enc, list] of Object.entries(C1_AFTER)) for (const a of list) { assert.ok(DIALOGUE[a.d], `${enc}: ${a.d}`); assert.ok(AFTER[enc].includes(a)); }
  for (const r of C1_RESTS) { assert.ok(DIALOGUE[r.d], r.d); assert.ok(RESTS.includes(r)); }
  assert.deepEqual(C1_RESTS.map(r => [r.at, r.d]), [['th-eg-hearth', 'c1-pulse']]);
  // the spec's nodes (3.2), every one of them
  const NODES = ['c1-crate-thieves', 'c1-landing-after', 'c1-aldric-start', 'c1-aldric-courier-wait', 'c1-dael', 'c1-dael-again',
    'c1-hire-closed', 'c1-board', 'c1-tw-enter', 'c1-tw-whisper', 'c1-tw-boots', 'c1-eg-arrive', 'c1-taela-first', 'c1-taela-roots',
    'c1-shard-glows', 'c1-acolyte', 'c1-miravel', 'c1-grove-circle-before', 'c1-grove-circle-after', 'c1-hr-descent', 'c1-hr-coal',
    'c1-hr-hot-lake', 'c1-warm-water', 'c1-pulse', 'c1-aldric-maps', 'c1-aldric-waiting', 'c1-dael-west', 'c1-hire-thornhollow',
    'c1-hire-eldergrove', 'c1-hire-mosswatch', 'c1-mf-arrive', 'c1-mf-islet', 'c1-mw-arrive', 'c1-garret-first', 'c1-garret-wait',
    'c1-mw-stair-before', 'c1-mw2-arrive', 'c1-mw-lantern-before', 'c1-rot-line', 'c1-garret-after', 'c1-hw-roots', 'c1-hw-ford',
    'c1-burners', 'c1-burners-after', 'c1-fr-arrive', 'c1-keeper', 'c1-keeper-again', 'c1-pilgrim', 'c1-stair', 'c1-fn-hot',
    'c1-fn-hall', 'c1-node-found', 'c1-guardian-wakes', 'c1-node-cools', 'c1-pilgrim-better', 'c1-vesper', 'c1-keeper-deer',
    'c1-deer-1', 'c1-deer-2', 'c1-aldric-lens', 'c1-aldric-after', 'c1-dael-wait', 'c1-dael-end', 'c1-dael-after',
    'th-tt-lookout', 'th-mw-lookout', 'c1-outfitter', 'c1-trader', 'c1-supplier', 'c1-scholar-busy',
    'c1-wenna', 'c1-cove-arrive', 'c1-cove-skeet', 'c1-cove-skeet-after', 'c1-wenna-home', 'c1-wenna-after', 'c1-garret-thanks',
    'c1-dael-patrol', 'c1-sick-rangers', 'c1-dael-patrol-done', 'c1-burner-at-fawnrest', 'c1-scholar-offer', 'c1-scholar-wait',
    'c1-sample-spring', 'c1-sample-coast', 'c1-sample-pool', 'c1-scholar-done', 'c1-scholar-after', 'c1-den-enter', 'c1-den-pool',
    'c1-bounty-relic', 'c1-goblin', 'c1-goblin-after', 'c1-keeper-home', 'c1-keeper-after'];
  for (const id of NODES) assert.ok(C1_DIALOGUE[id], `spec node ${id}`);
  // the spec's after-fight scenes
  for (const [enc, d] of [['c1-landing', 'c1-landing-after'], ['c1-grove-circle', 'c1-grove-circle-after'], ['c1-feral-druid', 'c1-burners-after'],
    ['c1-node-roots', 'c1-node-found'], ['c1-guardian', 'c1-node-cools'], ['c1-fjord-cove', 'c1-cove-skeet-after'], ['c1-dael-bounty', 'c1-bounty-relic']]) {
    assert.ok(C1_AFTER[enc]?.some(a => a.on === 'victory' && a.d === d), `${enc} -> ${d}`);
  }
  // key items, shops and quests
  assert.deepEqual(Object.keys(C1_KEYS).sort(), ['th-buyers-letter', 'th-lens']);
  for (const k of Object.values(C1_KEYS)) assert.ok(k.name && k.text);
  assert.deepEqual(Object.keys(C1_SHOPS).sort(), ['th-eldergrove', 'th-outfitter', 'th-trader']);
  for (const q of Object.values(C1_QUESTS)) {
    assert.equal(q.kind, 'side', q.id); assert.ok(NPCS[q.giver], `${q.id}: giver ${q.giver}`); assert.ok(QUESTS[q.id] === q);
    assert.deepEqual(condErrors(q.start, q.id), []);
    for (const s of q.steps) { assert.ok(s.text && s.target?.map && s.target?.entity, q.id); assert.ok(MAPS[s.target.map], `${q.id}: map ${s.target.map}`); assert.deepEqual(condErrors(s.done, q.id), []); }
  }
  assert.deepEqual(Object.values(C1_QUESTS).map(q => q.name), ['Lanterns Hung Low', 'The Missing Patrol', 'The Burners', 'Stop Measuring',
    'The Bounty Nobody Can Name', 'At the Edge of the Wood', 'Cargo, Hire Rates', 'The White Deer Come Home']);
});

// every { flag } leaf of a condition
function flagsIn(cond, out = new Set()) {
  if (!cond || typeof cond !== 'object') return out;
  if (Array.isArray(cond)) { for (const c of cond) flagsIn(c, out); return out; }
  if (typeof cond.flag === 'string') out.add(cond.flag);
  for (const k of ['all', 'any']) if (cond[k]) for (const c of cond[k]) flagsIn(c, out);
  if (cond.not) flagsIn(cond.not, out);
  return out;
}

test('Chapter 1: every flag a scene, a person, a quest, an objective or a Thareia map reads is set somewhere', () => {
  const read = new Map();
  const note = (cond, at) => { for (const fl of flagsIn(cond)) if (!read.has(fl)) read.set(fl, at); };
  for (const [id, d] of Object.entries(C1_DIALOGUE)) for (const c of d.choices || []) note(c.if, id);
  for (const n of Object.values(C1_NPCS)) for (const t of n.talk) note(t.if, n.id);
  for (const q of Object.values(C1_QUESTS)) { note(q.start, q.id); for (const s of q.steps) note(s.done, q.id); }
  for (const o of C1_OBJECTIVES) note(o.if, o.text);
  for (const [enc, list] of Object.entries(C1_AFTER)) for (const a of list) note(a.if, enc);
  for (const r of C1_RESTS) note(r.if, r.at);
  for (const id of TH_MAP_IDS) {
    const m = MAPS[id];
    for (const e of m.entities || []) for (const k of ['if', 'talkIf', 'open', 'coldUntil']) note(e[k], `${id}/${e.id}`);
    for (const ex of m.exits || []) note(ex.gate, `${id}/${ex.id}`);
  }
  const set = new Set();
  for (const d of Object.values(DIALOGUE)) for (const e of effectsOf(d)) if (e.set) set.add(e.set);
  for (const m of Object.values(MAPS)) for (const e of m.entities || []) if (e.loot?.story) set.add(e.loot.story);
  for (const q of Object.values(QUESTS)) if (q.reward?.set) set.add(q.reward.set);
  // loot.story flags that section 2 puts on chests G places (th-cove-receipts, spec 2.11)
  for (const fl of ['s1-lens-receipt']) set.add(fl);
  for (const [fl, at] of read) assert.ok(set.has(fl), `${at} reads ${fl}, which nothing sets`);
});

// every player-facing string of Chapter 1
function c1Strings() {
  const out = [];
  for (const [id, d] of Object.entries(C1_DIALOGUE)) {
    for (const [, line] of d.lines) out.push([id, line]);
    for (const c of d.choices || []) out.push([id, c.text]);
    for (const e of effectsOf(d)) { if (e.note) out.push([id, e.note]); if (e.cut && e.text) out.push([id, e.text]); }
  }
  for (const n of Object.values(C1_NPCS)) out.push([n.id, n.name], [n.id, n.role]);
  for (const q of Object.values(C1_QUESTS)) { out.push([q.id, q.name]); for (const s of q.steps) out.push([q.id, s.text]); }
  for (const o of C1_OBJECTIVES) out.push(['objective', o.text]);
  for (const [id, k] of Object.entries(C1_KEYS)) out.push([id, k.name], [id, k.text]);
  for (const s of Object.values(C1_SHOPS)) out.push([s.id, s.name]);
  return out;
}

test('Chapter 1: every line fits in 140 characters, and the language guard holds', () => {
  const BANNED = /Dustveil|Cistern|Unwaning|Tallym|tally|Brand|Sleeper|Hollow Council|Rotwarden|First Seed|Briarmaw/i;
  for (const [at, s] of c1Strings()) {
    assert.ok(typeof s === 'string' && s.length > 0, at);
    assert.ok(s.length <= 140, `${at}: ${s.length} chars: ${s}`);
    assert.ok(!BANNED.test(s), `${at}: a forbidden name: ${s}`);
    assert.ok(!/\bdays?\b/i.test(s), `${at}: names the day: ${s}`);
    assert.ok(!/\bWren\b/.test(s), `${at}: the new hero's default name`);
  }
  // no line assumes the hero's gender: the hero is never "he", "she", "sir", "lady" or the like in a narrator line about you
  for (const [id, d] of Object.entries(C1_DIALOGUE)) {
    for (const [, line] of d.lines) assert.ok(!/\b(sir|madam|lady|lad|lass|m'lady|mister|missus)\b/i.test(line), `${id}: ${line}`);
  }
  // every night scene shows Auros
  for (const id of ['c1-pulse', 'c1-wenna', 'c1-cove-arrive', 'c1-cove-skeet', 'c1-wenna-home', 'th-mw-lookout']) {
    assert.ok(C1_DIALOGUE[id].lines.some(([, l]) => l.includes('Auros')), `${id}: Auros in the sky`);
  }
  // the Prologue's fights and Yara's hire: only the twin picked by { beaten: 'pr-smugglers' } names them
  const PROLOGUE = /You again|Bogmire|deckhand|boglurcher/i;
  const TWINS = ['c1-cove-skeet-again'];
  for (const [id, d] of Object.entries(C1_DIALOGUE)) {
    if (TWINS.includes(id)) continue;
    for (const [, line] of d.lines) assert.ok(!PROLOGUE.test(line), `${id}: needs an early-route twin: ${line}`);
  }
  const skeet = C1_DIALOGUE['c1-cove-skeet'].choices;
  assert.deepEqual(skeet.map(c => [c.next, c.if]), [['c1-cove-skeet-again', { beaten: 'pr-smugglers' }], ['c1-cove-skeet-new', { not: { beaten: 'pr-smugglers' } }]]);
});

test('Chapter 1: the objective line is the spec\'s table, in order (3.3)', () => {
  assert.deepEqual(C1_OBJECTIVES.map(o => o.text), [
    'Chapter 1 is done. Chapter 2 comes next.', 'Tell Ranger Dael.', 'Show Aldric the lens.', 'Face what guards the node.',
    'Go down the stair under the court.', 'Walk the shrine court with the shard.', 'Go on to Fawnrest and find the keeper.',
    'Go through the Hindwood to Fawnrest.', 'Talk to Garret in the Lamp Room.', 'Climb Mosswatch Tower to the Lamp Room.',
    'Take the west road to Mosswatch Tower.', 'Ask Ranger Dael to open the west road.', 'Tell Aldric about the warm water.',
    'Rest at Eldergrove\'s hearth.', 'Go down under the Eldest Tree.', 'Stop the burners at the stone circle.', 'Hold the shard near the roots.',
    'Find Taela Greenmantle at the Eldest Tree.', 'Take the Thornway to Eldergrove.', 'Find Aldric Fernshaw on the square.',
    'Stop the thieves at the crate.',
  ]);
  for (const o of C1_OBJECTIVES) { assert.ok(MAPS[o.map], `${o.text}: map ${o.map}`); assert.ok(o.entity, o.text); assert.deepEqual(condErrors(o.if, o.text), []); }
});

// ---- the chapter, played through the rules --------------------------------------------------------------------------

const REPEATABLE = new Set(['set', 'unset', 'go', 'open', 'note']);
const enter = (g, id) => { assert.ok(DIALOGUE[id], `scene ${id}`); return St.enterDialogue(g, id); };
function pick(g, id, text) {
  const v = St.dialogueView(g, id);
  const c = v.choices.find(x => x.text === text);
  assert.ok(c, `${id}: choice "${text}" among ${v.choices.map(x => x.text).join(' | ')}`);
  assert.ok(!c.disabled, `${id}: "${text}" is open`);
  const r = St.choose(g, id, c.i);
  const events = [...r.events];
  let game = r.game;
  if (r.next) { const n = enter(game, r.next); game = n.game; events.push(...n.events); }
  return { game, events, next: r.next };
}
function win(g, enc) {
  const game = structuredClone(g);
  game.progress.flags.beaten = { ...(game.progress.flags.beaten || {}), [enc]: 1 };
  const d = St.afterDialogue(game, enc, 'victory');
  return d ? enter(game, d) : { game, events: [] };
}
const setFlag = (g, fl) => { const game = structuredClone(g); game.progress.flags.story[fl] = true; return game; };
const obj = g => St.nextObjective(g)?.text;

// no talk loops: a talk that pays, gives or fights must change what the next talk picks
function noLoops(g, where) {
  for (const npc of Object.keys(C1_NPCS)) {
    const d = St.talkTo(g, npc);
    if (!d) continue;
    const hard = (DIALOGUE[d].do || []).filter(e => !Object.keys(e).every(k => REPEATABLE.has(k) || EXTRA_KEYS.has(k)));
    if (!hard.length) continue;
    const after = St.talkTo(enter(g, d).game, npc);
    assert.notEqual(after, d, `${where}: talking to ${npc} replays ${d}`);
  }
}
function talk(g, npc, want) {
  const d = St.talkTo(g, npc);
  assert.equal(d, want, `talk to ${npc}`);
  return enter(g, d);
}

function prologueEnd(early) {
  let g = newGame({ name: 'Rook', seed: 7, heroes: THAREIA_START, at: TH_START_AT, hearth: TH_START_HEARTH });
  g = enter(g, 'th-intro').game;
  if (early) g = enter(g, 'th-board-early').game;
  else {
    for (const id of ['th-board', 'th-yara-hired', 'th-crate-cracks']) g = enter(g, id).game;
    g = win(g, 'pr-lurkers').game;
    g = win(g, 'pr-smugglers').game;
    g = structuredClone(g);
    g.party.roster.warden = grantXp(g.party.roster.warden, 63, rngFrom(3)).hero;
  }
  return enter(g, 'th-landing').game;
}

function playChapter(early) {
  let g = prologueEnd(early);
  const step = (want, where) => { assert.equal(obj(g), want, `${early ? 'early' : 'fight'} route, ${where}`); noLoops(g, where); };
  assert.ok(!g.party.roster.yara, 'Yara is not with the hero at the landing');
  assert.deepEqual(g.party.active, ['warden']);
  assert.equal(g.party.roster.warden.level, early ? 1 : 2);
  step('Stop the thieves at the crate.', 'the landing');
  assert.equal(St.talkTo(g, 'th-hire-landing'), 'c1-hire-closed');
  // beat 1
  let r = enter(g, 'c1-crate-thieves');
  assert.deepEqual(r.events, [{ t: 'fight', enc: 'c1-landing' }]);
  g = win(r.game, 'c1-landing').game;
  step('Find Aldric Fernshaw on the square.', 'the thieves beaten');
  const gold0 = g.gold;
  g = talk(g, 'aldric', 'c1-aldric-start').game;
  assert.equal(g.gold, gold0 + 10);
  step('Take the Thornway to Eldergrove.', 'the courier job');
  // beat 2
  g = talk(g, 'th-ranger', 'c1-dael').game;
  assert.equal(St.talkTo(g, 'th-ranger'), 'c1-dael-again');
  assert.deepEqual(St.dialogueView(g, 'c1-board').choices.map(c => c.text), ['Goblins at the edge of the wood.', 'Leave.']);
  g = talk(g, 'th-hire-landing', 'c1-hire-closed').game;
  assert.ok(g.progress.flags.story['c1-saw-hire']);
  // beat 3, and S7 on the way
  assert.deepEqual(enter(g, 'c1-tw-enter').events, [{ t: 'fight', enc: 'c1-verdant-edge' }]);
  g = win(g, 'c1-verdant-edge').game;
  g = enter(g, 'c1-tw-whisper').game;
  g = talk(g, 'th-goblin', 'c1-goblin').game;
  assert.equal(questState(g, 'c1-s7'), 'active');
  const gold1 = g.gold;
  g = pick(g, 'c1-goblin', 'Share your rations.').game;
  assert.equal(g.gold, gold1 - 5);
  g = pick(g, 'c1-goblin-after', 'Take the herbs.').game;
  assert.equal(questState(g, 'c1-s7'), 'done');
  assert.equal(St.dialogueView(g, 'c1-goblin-after').choices.length, 1, 'the herbs come once');
  g = win(g, 'c1-runner-camp').game;
  g = win(g, 'c1-bramble-deep').game;
  g = enter(g, 'c1-tw-boots').game;
  step('Take the Thornway to Eldergrove.', 'the Thornway');
  g = talk(g, 'th-ranger', 'c1-dael-patrol').game;
  assert.equal(questState(g, 'c1-s2'), 'active');
  // beat 4
  const gold2 = g.gold;
  g = enter(g, 'c1-eg-arrive').game;
  assert.equal(g.gold, gold2 + 12);
  step('Find Taela Greenmantle at the Eldest Tree.', 'Eldergrove');
  assert.equal(St.talkTo(g, 'th-scholar'), 'c1-scholar-busy');
  g = talk(g, 'taela', 'c1-taela-first').game;
  assert.equal(St.talkTo(g, 'taela'), 'c1-taela-roots');
  step('Hold the shard near the roots.', 'Taela met');
  r = enter(g, 'c1-shard-glows');
  g = r.game;
  assert.equal(r.events[0].t, 'cut');
  if (HEROES.taela) {
    assert.ok(g.party.active.includes('taela'), 'Taela comes along');
    assert.equal(g.party.roster.taela.guest, true, 'as a guest');
    assert.equal(g.party.roster.taela.level, g.party.roster.warden.level + (HEROES.taela.guestLevel || 0));
  }
  step('Stop the burners at the stone circle.', 'the shard glows');
  assert.deepEqual(enter(g, 'c1-grove-circle-before').events, [{ t: 'fight', enc: 'c1-grove-circle' }]);
  g = win(g, 'c1-grove-circle').game;
  assert.equal(St.afterDialogue(g, 'c1-grove-circle', 'victory'), null, 'the stone circle plays back once');
  step('Go down under the Eldest Tree.', 'the circle saved');
  // beat 5
  g = enter(g, 'c1-hr-descent').game;
  assert.ok(g.progress.flags.unlocked['th-hr-ichor-a'] && g.progress.flags.unlocked['th-hr-ichor-b']);
  if (HEROES.taela) { g = pick(g, 'c1-hr-coal', 'Ask Taela to light it.').game; assert.ok(g.progress.flags.kindled['th-hr-coal']); }
  g = win(g, 'c1-roots-grubs').game;
  g = win(g, 'c1-missing-patrol').game;
  g = talk(g, 'th-sick-ranger', 'c1-sick-rangers').game;
  g = win(g, 'c1-roots-sapwight').game;
  g = enter(g, 'c1-warm-water').game;
  step('Rest at Eldergrove\'s hearth.', 'the warm spring');
  g = talk(g, 'th-scholar', 'c1-scholar-offer').game;
  g = enter(g, 'c1-sample-spring').game;
  assert.ok(St.dayShown(g), 'the day shows until the pulse');
  // beat 6: the pulse, once
  assert.equal(St.restDialogue(g, 'th-eg-hearth'), 'c1-pulse');
  r = enter(g, 'c1-pulse');
  g = r.game;
  assert.deepEqual(r.events.map(e => e.t), ['cut', 'note']);
  assert.equal(St.restDialogue(g, 'th-eg-hearth'), null, 'the pulse plays once');
  assert.ok(!St.dayShown(g), 'no day after the pulse');
  step('Tell Aldric about the warm water.', 'the pulse');
  // S2 closes at Dael
  g = talk(g, 'th-ranger', 'c1-dael-patrol-done').game;
  assert.equal(questState(g, 'c1-s2'), 'done');
  assert.ok(g.inventory.some(it => it.base === 'thornwatch-hood'));
  // beat 7: the sponsor, the prepaid flight, the west road
  g = talk(g, 'aldric', 'c1-aldric-maps').game;
  step('Ask Ranger Dael to open the west road.', 'Aldric sponsors the skiff');
  assert.equal(St.talkTo(g, 'aldric'), 'c1-aldric-waiting');
  assert.equal(St.talkTo(g, 'th-hire-landing'), 'c1-hire-thornhollow');
  assert.equal(St.talkTo(g, 'th-hire-eg'), 'c1-hire-eldergrove');
  let texts = St.dialogueView(g, 'c1-hire-thornhollow').choices.map(c => c.text);
  assert.ok(texts.includes('Use Aldric\'s prepaid flight.') && !texts.includes('Hire a flight: 10 gp.'), texts.join(' | '));
  const gold3 = g.gold;
  r = pick(g, 'c1-hire-thornhollow', 'Use Aldric\'s prepaid flight.');
  assert.deepEqual(r.events, [{ t: 'open', screen: 'sky:hire@thornhollow' }]);
  assert.equal(r.game.gold, gold3, 'the first flight is free');
  assert.ok(!r.game.progress.flags.story['c1-hire-ticket'], 'the ticket is spent');
  g = r.game;
  const hire = St.dialogueView(g, 'c1-hire-mosswatch').choices.find(c => c.text === 'Hire a flight: 10 gp.');
  assert.deepEqual(hire.price, { gold: 10 });
  r = pick(g, 'c1-hire-mosswatch', 'Hire a flight: 10 gp.');
  assert.equal(r.game.gold, gold3 - 10);
  assert.equal(r.events.at(-1).screen, 'sky:hire@mosswatch');
  const broke = structuredClone(g); broke.gold = 9;
  assert.ok(St.dialogueView(broke, 'c1-hire-eldergrove').choices.find(c => c.text === 'Hire a flight: 10 gp.').disabled, 'no flight under 10 gp');
  g = talk(g, 'th-ranger', 'c1-dael-west').game;
  step('Take the west road to Mosswatch Tower.', 'the west road open');
  // S8: a cargo run from level 6
  texts = St.dialogueView(g, 'c1-hire-thornhollow').choices.map(c => c.text);
  if (g.party.roster.warden.level < 6) assert.ok(!texts.some(t => t.startsWith('Take a cargo')), 'no cargo before level 6');
  let big = structuredClone(g); big.party.roster.warden.level = 6;
  big = pick(big, 'c1-hire-thornhollow', 'Take a cargo run to Mosswatch.').game;
  assert.ok(!St.dialogueView(big, 'c1-hire-eldergrove').choices.some(c => c.text.startsWith('Take a cargo')), 'one run at a time');
  const gold4 = big.gold;
  big = pick(big, 'c1-hire-mosswatch', 'Hand over the cargo.').game;
  assert.equal(big.gold, gold4 + 15);
  assert.equal(questState(big, 'c1-s8'), 'done');
  // beat 8: Mossfall and the tower
  g = enter(g, 'c1-mf-arrive').game;
  g = enter(g, 'c1-sample-coast').game;
  g = talk(g, 'th-garret', 'c1-garret-first').game;
  step('Climb Mosswatch Tower to the Lamp Room.', 'Garret met');
  assert.equal(St.talkTo(g, 'th-garret'), 'c1-garret-wait');
  g = win(g, 'c1-mw-stair').game;
  g = win(g, 'c1-mw-lantern').game;
  step('Talk to Garret in the Lamp Room.', 'the Lantern beaten');
  // beat 9
  g = talk(g, 'th-garret', 'c1-rot-line').game;
  step('Go through the Hindwood to Fawnrest.', 'the Rot line');
  assert.equal(St.talkTo(g, 'th-garret'), 'c1-garret-after');
  // S1: the cove at night; Skeet's twin
  r = talk(g, 'th-wenna', 'c1-wenna');
  assert.deepEqual(r.events, [{ t: 'go', map: 'th-fjords-cove', anchor: 'from-boat' }]);
  g = r.game;
  assert.equal(pick(g, 'c1-cove-skeet', 'Step onto the dock.').next, early ? 'c1-cove-skeet-new' : 'c1-cove-skeet-again');
  g = win(g, 'c1-fjord-cove').game;
  g = setFlag(g, 's1-lens-receipt'); // the receipts chest (loot.story)
  g = talk(g, 'th-wenna', 'c1-wenna-home').game;
  const gold5 = g.gold;
  g = talk(g, 'th-garret', 'c1-garret-thanks').game;
  assert.equal(g.gold, gold5 + 150);
  assert.equal(questState(g, 'c1-s1'), 'done');
  assert.equal(St.talkTo(g, 'th-garret'), 'c1-garret-after', 'Garret pays once');
  // beat 10: the Hindwood; the burners talked down (with Taela) or fought
  g = win(g, 'c1-glowcaps').game;
  if (HEROES.taela) {
    g = pick(g, 'c1-burners', 'Let Taela talk.').game;
    assert.equal(questState(g, 'c1-s3'), 'active');
  } else {
    assert.deepEqual(pick(g, 'c1-burners', 'Fight.').events, [{ t: 'fight', enc: 'c1-feral-druid' }]);
    g = win(g, 'c1-feral-druid').game;
  }
  step('Go on to Fawnrest and find the keeper.', 'the burners');
  // beat 11
  g = enter(g, 'c1-fr-arrive').game;
  g = talk(g, 'th-keeper', 'c1-keeper').game;
  step('Walk the shrine court with the shard.', 'the keeper');
  assert.equal(St.talkTo(g, 'th-keeper'), 'c1-keeper-again');
  if (HEROES.taela) { g = pick(g, 'c1-burner-at-fawnrest', 'Take the salve.').game; assert.equal(questState(g, 'c1-s3'), 'done'); }
  g = enter(g, 'c1-sample-pool').game;
  g = talk(g, 'th-scholar', 'c1-scholar-done').game;
  assert.equal(questState(g, 'c1-s4'), 'done');
  g = enter(g, 'c1-stair').game;
  step('Go down the stair under the court.', 'the stair');
  // beats 12-14: the node
  g = win(g, 'c1-node-stair').game;
  assert.deepEqual(enter(g, 'c1-fn-hall').events, [{ t: 'fight', enc: 'c1-node-hall' }]);
  g = win(g, 'c1-node-hall').game;
  r = win(g, 'c1-node-roots');
  assert.deepEqual(r.events.map(e => e.t), ['cut']);
  g = r.game;
  step('Face what guards the node.', 'the node found');
  assert.deepEqual(enter(g, 'c1-guardian-wakes').events.map(e => e.t), ['cut', 'fight']);
  r = win(g, 'c1-guardian');
  g = r.game;
  assert.deepEqual(r.events.filter(e => e.t === 'key').map(e => e.id), ['th-lens']);
  assert.ok(g.progress.flags.keys['th-lens']);
  assert.ok(g.progress.flags.unlocked['th-mf-islet-ford']);
  if (HEROES.taela) { assert.ok(g.party.roster.taela && !g.party.roster.taela.guest, 'Taela joins for good'); assert.ok(g.party.active.includes('taela')); }
  step('Show Aldric the lens.', 'the node cooled');
  // S9, S6
  g = talk(g, 'th-keeper', 'c1-keeper-deer').game;
  g = enter(g, 'c1-deer-1').game;
  g = enter(g, 'c1-deer-2').game;
  g = talk(g, 'th-keeper', 'c1-keeper-home').game;
  assert.equal(questState(g, 'c1-s9'), 'done');
  assert.equal(St.talkTo(g, 'th-pilgrim'), 'c1-pilgrim-better');
  g = pick(g, 'c1-board', 'The bounty nobody can name.').game;
  g = enter(g, 'c1-den-enter').game;
  const gold6 = g.gold;
  g = win(g, 'c1-dael-bounty').game;
  g = pick(g, 'c1-bounty-relic', 'Hand it over for the purse.').game;
  assert.equal(g.gold, gold6 + 200);
  assert.equal(questState(g, 'c1-s6'), 'done');
  assert.equal(St.afterDialogue(g, 'c1-dael-bounty', 'victory'), null);
  // beat 15
  g = talk(g, 'th-ranger', 'c1-dael-wait').game;
  r = talk(g, 'aldric', 'c1-aldric-lens');
  assert.deepEqual(r.events, [{ t: 'key', id: 'th-buyers-letter' }]);
  g = r.game;
  step('Tell Ranger Dael.', 'the letter');
  assert.equal(St.talkTo(g, 'aldric'), 'c1-aldric-after');
  r = talk(g, 'th-ranger', 'c1-dael-end');
  assert.deepEqual(r.events, [{ t: 'end', act: 'chapter-1' }]);
  g = r.game;
  step('Chapter 1 is done. Chapter 2 comes next.', 'the end');
  r = talk(g, 'th-ranger', 'c1-dael-after');
  assert.deepEqual(r.events, [], 'the chapter ends once');
  assert.ok(St.dialogueView(g, 'c1-board').choices.some(c => c.text === 'Caravan to the Keep.'));
  // every side quest is done, and none is left "Ready"
  for (const q of Object.keys(C1_QUESTS)) if (q !== 'c1-s8' && (HEROES.taela || q !== 'c1-s3')) assert.equal(questState(g, q), 'done', q);
  return g;
}

test('Chapter 1 plays through the rules from the fight route\'s end of the Prologue', () => { playChapter(false); });
test('Chapter 1 plays through the rules from the early route (th-board-early: no Yara, level 1)', () => { playChapter(true); });
