// Story data tests (M3 spec §3.1, §3.6, §4.4, §6.1 WP3S; M4 spec §3.1, §3.6, §8; M5 spec §3.1, §3.5,
// §3.6, §8): ids, conditions, line lengths, quest targets, the beats around fights and rests, "no flag
// is read that is never set", the thank-you rule, the Sunscorch's and the Ironspire's people, the second
// and third councils, Hush's scene, the letters, and the Act II Ladder.
// Owner: WP3S (M3), P3 story (M4, M5).
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
import { GEMS } from '../src/data/gems.js';
import { DOMAINS } from '../src/data/domains.js';
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

// The Act II posters the M4 spec fills in (§3.6), in order, with the encounter whose lead they show.
const ACT2_POSTERS = [
  ['rasa', 'sr-toll'], ['sand-wyrm', 'wyrm-lair'], ['brask', 'ds-crew'], ['kharzul', 'kharzul-heart'],
  ['gnash', 'gnash-camp'], ['wisp-queen', 'wisp-queen'], ['ash-captain', 'sg-captain'], ['ashen-warden', 'ashen-warden'],
  // M5: the Ironspire
  ['rhune', 'rp-brigands'], ['thunder-roc', 'roc-eyrie'], ['old-horn', 'troll-cave'], ['sentinel-captain', 'is-sentinels'],
  ['journeyman', 'id-smith'], ['mother-anvil', 'mother-anvil'], ['drowned-abbess', 'fm-shrine'], ['rime-abbot', 'rime-abbot'],
];

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
    for (const [gem, n] of Object.entries(q.reward.gems || {})) assert.ok(GEMS[gem] && n > 0, `${q.id}: gem ${gem}`);
    for (const [mat, n] of Object.entries(q.reward.materials || {})) assert.ok(['scrap', 'silver', 'embers'].includes(mat) && n > 0, `${q.id}: ${mat}`);
  }
  for (const b of Object.values(BOUNTIES)) assert.ok(ENCOUNTERS[b.enc], b.id);
  for (const s of Object.values(SHOPS)) for (const id of s.items) assert.ok(CONSUMABLES[id], `${s.id}: ${id}`);
  // M4 (spec §3.7): Idris sells gems at their price, never the Ash Garnet
  for (const s of Object.values(SHOPS)) for (const id of s.gems || []) assert.ok(GEMS[id]?.price > 0, `${s.id}: gem ${id} has a price`);
  assert.deepEqual([...SHOPS.idris.gems].sort(), ['glass-pearl', 'moss-agate', 'sunstone']);
  assert.ok(SHOPS.pithead.items.length);
  assert.equal(LADDER.filter(p => p.act === 1).length, 17);
  // M4: the Act I rumour of a glass scorpion is Kharzul's poster now; Gloomfen stays a rumour, and so does
  // Harrow (M5 finds his forge, not him)
  assert.deepEqual(LADDER.filter(p => p.act === 2 && !p.silhouette).map(p => [p.id, p.enc]), ACT2_POSTERS);
  assert.deepEqual(LADDER.filter(p => p.silhouette).map(p => p.id), ['lantern-mother', 'missing-smith']);
  assert.equal(new Set(LADDER.map(p => p.id)).size, LADDER.length, 'poster ids are unique');
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
const RULE_FLAGS = ['act1-complete', 'tamsin-yielded', 'starter', 'm2-save', 'intro-done', 'met-dael', 'bounty-briarmaw', 'sunscorch-complete', 'ironspire-complete'];

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

// ---- M4 (P3 story) ----------------------------------------------------------------------------------

// Every node reachable from `id` (choices' next, checks and contests).
function reachable(id, out = new Set()) {
  if (!id || out.has(id) || !DIALOGUE[id]) return out;
  out.add(id);
  for (const c of DIALOGUE[id].choices || []) for (const n of [c.next, c.check?.pass, c.check?.fail, c.contest?.pass, c.contest?.fail]) reachable(n, out);
  return out;
}
// Each place effects are applied together: a node's `do`, and a node's `do` followed by one choice's.
function effectLists() {
  const out = [];
  for (const [id, d] of Object.entries(DIALOGUE)) {
    out.push({ at: id, node: id, list: d.do || [] });
    (d.choices || []).forEach((c, i) => out.push({ at: `${id} choice ${i}`, node: id, list: [...(d.do || []), ...(c.do || [])] }));
  }
  return out;
}
// Every condition inside the story's own data (not the maps'), flattened to its leaves.
function storyLeaves() {
  const out = [];
  const leaf = (c, at) => {
    if (!c || typeof c !== 'object') return;
    if (c.all || c.any) { (c.all || c.any).forEach(x => leaf(x, at)); return; }
    if (c.not) { leaf(c.not, at); return; }
    out.push([c, at]);
  };
  for (const n of Object.values(NPCS)) for (const t of n.talk) leaf(t.if, `talk ${n.id}`);
  for (const [id, d] of Object.entries(DIALOGUE)) for (const c of d.choices || []) { leaf(c.if, `${id} choice`); leaf(c.check?.adv, `${id} adv`); }
  for (const q of Object.values(QUESTS)) { leaf(q.start, `${q.id} start`); for (const s of q.steps) leaf(s.done, `${q.id} step`); }
  for (const [enc, list] of Object.entries(AFTER)) for (const a of list) leaf(a.if, `after ${enc}`);
  for (const r of RESTS) leaf(r.if, `rest ${r.at}`);
  return out;
}

test('every id a story condition names is real (relics, encounters, Brands, fires, quests, powers)', () => {
  const powers = new Set(Object.values(RELICS).map(r => r.mapPower?.id).filter(Boolean));
  const entities = new Set(Object.values(MAPS).flatMap(m => [...m.entities.map(e => e.id), ...m.exits.map(x => x.unlock).filter(Boolean)]));
  for (const [c, at] of storyLeaves()) {
    for (const k of ['owns', 'wears']) if (k in c) assert.ok(RELICS[c[k]], `${at}: ${k} ${c[k]}`);
    for (const k of ['beaten', 'cleared', 'done']) if (k in c) assert.ok(ENCOUNTERS[c[k]], `${at}: ${k} ${c[k]}`);
    if ('brand' in c) assert.ok(BRANDS[c.brand], `${at}: brand ${c.brand}`);
    if ('kindled' in c) assert.ok(HEARTHS[c.kindled], `${at}: kindled ${c.kindled}`);
    for (const k of ['unlocked', 'opened']) if (k in c) assert.ok(entities.has(c[k]), `${at}: ${k} ${c[k]}`);
    if ('power' in c) assert.ok(powers.has(c.power), `${at}: power ${c.power}`);
    if ('active' in c) assert.ok(HERO_IDS.includes(c.active), `${at}: active ${c.active}`);
    if ('domain' in c) assert.ok(DOMAINS[c.domain], `${at}: domain ${c.domain}`);
    if ('quest' in c) { assert.ok(QUESTS[c.quest], `${at}: quest ${c.quest}`); assert.ok(['hidden', 'active', 'ready', 'done'].includes(c.state || 'done'), at); }
    if ('bounty' in c) assert.ok(c.bounty === 'any' || BOUNTIES[c.bounty], `${at}: bounty ${c.bounty}`);
  }
});

test('effects use the known vocabulary and name real things', () => {
  const KEYS = ['set', 'unset', 'give', 'item', 'gold', 'bag', 'gems', 'materials', 'unlock', 'heal', 'fight', 'claim', 'open', 'letter', 'end'];
  const OPEN = ['forge', 'atlas', 'journal', 'ladder', 'bounties'];
  for (const [id, d] of Object.entries(DIALOGUE)) for (const e of [...(d.do || []), ...(d.choices || []).flatMap(c => c.do || [])]) {
    const k = Object.keys(e).find(x => KEYS.includes(x));
    assert.ok(k, `${id}: unknown effect ${JSON.stringify(e)}`);
    if (k === 'open') assert.ok(OPEN.includes(e.open) || (e.open.startsWith('shop:') && SHOPS[e.open.slice(5)]), `${id}: open ${e.open}`);
    if (k === 'claim') assert.ok(e.claim === 'bounties' || QUESTS[e.claim] || BOUNTIES[e.claim.replace(/^bounty:/, '')], `${id}: claim ${e.claim}`);
    if (k === 'gems') for (const [g, n] of Object.entries(e.gems)) assert.ok(GEMS[g] && n > 0, `${id}: gem ${g}`);
    if (k === 'materials') for (const [m, n] of Object.entries(e.materials)) assert.ok(['scrap', 'silver', 'embers'].includes(m) && n > 0, `${id}: ${m}`);
    if (k === 'letter') assert.ok(LETTERS[e.letter], `${id}: letter ${e.letter}`);
    // M5: 'ironspire' is the card after the third council (the UI draws it; the Gloomfen comes next)
    if (k === 'end') assert.ok(['act1', 'act2', 'ironspire'].includes(e.end), `${id}: end ${e.end}`);
    if (k === 'gold') assert.ok(Number.isInteger(e.gold) && e.gold > 0, `${id}: gold`);
  }
});

test('an encounter that talks first can always start its fight from that talk', () => {
  // (the scaffold's Tamsin-at-Scorchgate talk had no way into the duel)
  for (const e of Object.values(ENCOUNTERS)) {
    if (!e.talk) continue;
    const fights = [...reachable(e.talk)].some(id => [...(DIALOGUE[id].do || []), ...(DIALOGUE[id].choices || []).flatMap(c => c.do || [])].some(x => x.fight === e.id));
    assert.ok(fights, `${e.id}: its talk ${e.talk} never starts the fight`);
  }
});

// A talk condition that only holds once the quest has started (M3: Ivo's and the pilgrim's thank-yous).
const requiresStarted = (c, qid) => !!c && ((c.quest === qid && ['active', 'ready'].includes(c.state)) || (c.all || []).some(x => requiresStarted(x, qid)));

test('the thank-you rule: a line that claims a quest also sets its start flag, and every giver can start theirs', () => {
  const ruleSet = new Set(RULE_FLAGS);
  for (const { at, node, list } of effectLists()) for (const e of list) {
    const q = QUESTS[e.claim];
    if (!q || !q.start?.flag || ruleSet.has(q.start.flag) || list.some(x => x.set === q.start.flag)) continue;
    const via = Object.values(NPCS).flatMap(n => n.talk).filter(t => reachable(t.d).has(node));
    assert.ok(via.length && via.every(t => requiresStarted(t.if, q.id)), `${at} claims ${q.id} but never sets ${q.start.flag}`);
  }
  for (const q of Object.values(QUESTS)) {
    if (!q.start?.flag || ruleSet.has(q.start.flag)) continue;
    const says = new Set(NPCS[q.giver].talk.flatMap(t => [...reachable(t.d)]));
    const sets = [...says].some(id => [...(DIALOGUE[id].do || []), ...(DIALOGUE[id].choices || []).flatMap(c => c.do || [])].some(x => x.set === q.start.flag));
    assert.ok(sets, `${q.giver} never says a line that starts ${q.id} (${q.start.flag})`);
  }
});

const SUNSCORCH_NPCS = ['zara', 'qasim', 'idris', 'spire-guard', 'water-seller', 'luma', 'ode', 'miner', 'sabah', 'pilgrim-mw', 'cinder'];

test('the Sunscorch\'s people (spec §3.1): never silent, met before they notice, shops and bounties in the right hands', () => {
  for (const id of SUNSCORCH_NPCS) {
    const n = NPCS[id];
    assert.ok(n, id);
    assert.ok(n.talk.length && !n.talk[n.talk.length - 1].if, `${id}: the last talk line has no condition, so they always answer`);
    // a giver's first meeting comes before any "the world notices" line
    const first = n.talk.findIndex(t => t.if?.not?.flag?.startsWith('met-'));
    if (first >= 0) for (const [i, t] of n.talk.entries()) if (JSON.stringify(t.if || {}).includes('"wears"')) assert.ok(i > first, `${id}: notice ${t.d} before the first meeting`);
  }
  for (const n of Object.values(NPCS)) if (n.talk.length) assert.ok(!n.talk[n.talk.length - 1].if, `${n.id} always answers`);
  const opens = (npc, what) => NPCS[npc].talk.some(t => [...reachable(t.d)].some(id => (DIALOGUE[id].choices || []).some(c => (c.do || []).some(e => e.open === what || e.claim === what))));
  assert.ok(opens('idris', 'shop:idris'), 'Idris sells gems');
  assert.ok(opens('ode', 'shop:pithead'), 'Old Ode keeps the pithead store');
  for (const b of Object.values(BOUNTIES)) {
    assert.ok(NPCS[b.giver], `${b.id}: giver ${b.giver}`);
    assert.ok(opens(b.giver, 'bounties'), `${b.id}: ${b.giver} takes bounties in`);
  }
  assert.deepEqual(Object.values(BOUNTIES).filter(b => b.giver === 'zara').map(b => b.enc), ['dt-skinks', 'gf-raiders', 'ds-scorpions', 'sg-wights']);
});

test('the Sunscorch beats: arrivals, after-fight lines, rests and the Sandspire lookout', () => {
  for (const m of ['sandspire', 'dusthaven', 'miragewell', 'scorchgate']) assert.ok(ARRIVALS[m], `arrival lines for ${m}`);
  // an arrival is marked seen before it plays, so it must never change the game
  for (const d of Object.values(ARRIVALS)) {
    assert.ok(!DIALOGUE[d].do?.length, `${d} changes the game`);
    assert.ok(!(DIALOGUE[d].choices || []).length, `${d} has choices`);
  }
  const after = (enc, on) => (AFTER[enc] || []).filter(a => a.on === on);
  for (const enc of ['kharzul-heart', 'ashen-warden', 'tamsin-scorchgate', 'gf-caravan']) assert.ok(after(enc, 'victory').length, `${enc} victory`);
  assert.ok(after('tamsin-scorchgate', 'yield').length, 'the Tamsin duel has yield lines');
  // the last victory entry of a Champion is unconditional: a win always gets its lines
  for (const enc of ['kharzul-heart', 'ashen-warden']) assert.ok(!after(enc, 'victory').at(-1).if, enc);
  // the yield lines set the duel's `yields` flag too
  assert.ok(DIALOGUE[after('tamsin-scorchgate', 'yield')[0].d].do.some(e => e.set === ENCOUNTERS['tamsin-scorchgate'].yields));
  // one-time scenes: a rest or after-fight scene that sets a flag is guarded by it
  for (const r of RESTS) for (const e of DIALOGUE[r.d].do || []) if (e.set) assert.ok(JSON.stringify(r.if).includes(`"not":{"flag":"${e.set}"}`), `rest ${r.d} replays`);
  assert.ok(LOOKOUTS['ss-lookout'], 'the Sandspire lookout');
});

test('the second council (spec §3.6): flag-guarded, closes the main quest, ends Act II on every path', () => {
  const t = MAPS['keep-hall'].entities.find(e => e.id === 'council-2');
  assert.ok(t && t.kind === 'trigger' && !t.once, 'a keep-hall trigger, never once');
  assert.deepEqual(t.if, { all: [{ flag: 'sunscorch-complete' }, { not: { flag: 'council-2-done' } }] });
  const d = DIALOGUE[t.dialogue];
  assert.ok(d.do.some(e => e.set === 'council-2-done'));
  assert.ok(d.do.some(e => e.claim === 'sunscorch-waking'));
  assert.ok(d.lines.some(([who]) => who === 'qasim'), 'Qasim sits at the table');
  // every way out of the scene carries the to-be-continued card
  const ends = (id, got, seen) => {
    const n = DIALOGUE[id];
    const here = got || (n.do || []).some(e => e.end === 'act2');
    if (!n.choices?.length) return here;
    return n.choices.every(c => {
      const now = here || (c.do || []).some(e => e.end === 'act2');
      return c.next && !seen.has(c.next) ? ends(c.next, now, new Set([...seen, id])) : now;
    });
  };
  assert.ok(ends(t.dialogue, false, new Set()), 'every path ends with { end: act2 }');
  const text = [...reachable(t.dialogue)].flatMap(id => DIALOGUE[id].lines.map(l => l[1])).join(' ');
  assert.match(text, /Ironspire/);
  assert.match(text, /Gloomfen/);
  assert.match(text, /Harrow/);
});

test('the Unsmith\'s Sunscorch letters never count coals (the region is taken in either order)', () => {
  for (const b of ['brand-of-glass', 'brand-of-ash']) {
    assert.ok(LETTERS[b].text.endsWith('— U.'), b);
    assert.doesNotMatch(LETTERS[b].text, /\b(Three|Four|third|fourth)\b/i, b);
  }
});

// ---- M5 (P3 story) ----------------------------------------------------------------------------------

const IRONSPIRE_NPCS = ['wynn', 'kesh', 'novice', 'brundar', 'durra', 'ih-guard', 'rook', 'ysolde', 'quill'];
const PAGE_III = new Set(Object.values(RELICS).filter(r => r.codex >= 39 && r.codex <= 52).map(r => r.id));
// Some line reachable from an NPC's talk has a choice doing `what` (opens a screen or claims).
const offers = (npc, what) => NPCS[npc].talk.some(t => [...reachable(t.d)].some(id => (DIALOGUE[id].choices || []).some(c => (c.do || []).some(e => e.open === what || e.claim === what))));

test('the Ironspire\'s people (spec §3.1): never silent, met before they notice, they notice Page III, shops and the Stormwatch board in the right hands', () => {
  for (const id of IRONSPIRE_NPCS) {
    const n = NPCS[id];
    assert.ok(n, id);
    assert.ok(n.talk.length && !n.talk[n.talk.length - 1].if, `${id}: the last talk line has no condition, so they always answer`);
    // a giver's first meeting comes before any "the world notices" line
    const first = n.talk.findIndex(t => t.if?.not?.flag?.startsWith('met-'));
    if (first >= 0) for (const [i, t] of n.talk.entries()) if (JSON.stringify(t.if || {}).includes('"wears"')) assert.ok(i > first, `${id}: notice ${t.d} before the first meeting`);
    assert.ok(n.talk.some(t => PAGE_III.has(t.if?.wears)), `${id} notices a relic of Codex Page III`);
  }
  assert.equal(PAGE_III.size, 14);
  assert.ok(offers('durra', 'shop:durra'), 'Durra keeps the armoury');
  assert.ok(offers('quill', 'shop:quill'), 'Quill keeps the stores');
  assert.deepEqual([...SHOPS.durra.gems].sort(), ['frost-opal', 'glass-pearl', 'moss-agate'], 'Durra sells three gems, the Frost Opal among them');
  assert.ok(SHOPS.durra.items.length && SHOPS.quill.items.length && !(SHOPS.quill.gems || []).length, 'both sell the consumables; Quill no gems');
  assert.deepEqual(Object.values(BOUNTIES).filter(b => b.giver === 'ysolde').map(b => [b.id, b.enc, b.gold]),
    [['b-wolves', 'rp-wolves', 90], ['b-trolls', 'is-trolls', 120], ['b-frostwolves', 'fr-wolves', 120], ['b-roc', 'roc-eyrie', 160]]);
});

test('the Ironspire\'s quests (spec §3.6): ids, givers, starts and rewards; the flags the maps and rules read are set; the Rune-Key', () => {
  const Q = (id, giver, start) => {
    assert.equal(QUESTS[id]?.giver, giver, `${id} giver`);
    assert.deepEqual(QUESTS[id].start, start, `${id} start`);
    return QUESTS[id];
  };
  const main = Q('ironspire-waking', 'isolde', { flag: 'sunscorch-complete' });
  assert.equal(main.kind, 'main');
  assert.deepEqual(main.steps[0].done, { flag: 'council-2-done' }, 'its first step is the second council');
  assert.deepEqual(main.steps[main.steps.length - 1].done, { flag: 'council-3-done' }, 'it closes at the third council');
  // every step between the councils also closes with a Brand, so a Warden who talks to nobody never sticks
  for (const s of main.steps.slice(1, -1)) assert.ok(JSON.stringify(s.done).includes('"brand"'), s.text);
  assert.deepEqual(Q('bell-of-veil', 'wynn', { flag: 'met-wynn' }).reward, { relic: 'veilbell' });
  assert.deepEqual(Q('harrows-hammer', 'hilda', { owns: 'worldforge-hammer' }).reward, { gold: 300, materials: { embers: 2 } });
  assert.deepEqual(Q('rooks-ledger', 'rook', { flag: 'met-rook' }).reward, { gold: 250, gems: { 'frost-opal': 1 } });
  assert.deepEqual(Q('sentinel-oath', 'brundar', { flag: 'met-brundar' }).reward, { gold: 200, materials: { silver: 2 } });
  // the flags the spec fixes (the maps and the rules read some of them) are set by the story
  const set = new Set();
  for (const d of Object.values(DIALOGUE)) for (const e of [...(d.do || []), ...(d.choices || []).flatMap(c => c.do || [])]) if (e.set) set.add(e.set);
  for (const f of ['met-wynn', 'highfold-open', 'bell-rung-veil', 'met-brundar', 'rune-given', 'smith-told', 'met-rook', 'ledger-given', 'hammer-shown', 'tamsin-yielded-3', 'council-3-done']) assert.ok(set.has(f), `${f} is set`);
  // meeting Wynn opens the Highfold gate, whichever of her lines is the first meeting
  for (const [id, d] of Object.entries(DIALOGUE)) if ((d.do || []).some(e => e.set === 'met-wynn')) assert.ok(d.do.some(e => e.set === 'highfold-open'), `${id} opens the Highfold`);
  // the Rune-Key comes only from the Thane, once Tamsin's duel is won or yielded
  const rune = Object.entries(DIALOGUE).filter(([, d]) => (d.do || []).some(e => e.give === 'thanes-rune'));
  assert.deepEqual(rune.map(([id]) => id), ['brundar-rune']);
  assert.ok(rune[0][1].do.some(e => e.set === 'rune-given'));
  assert.deepEqual(NPCS.brundar.talk.find(t => t.d === 'brundar-rune').if,
    { all: [{ any: [{ beaten: 'tamsin-ironhold' }, { flag: 'tamsin-yielded-3' }] }, { not: { flag: 'rune-given' } }] });
});

test('the Ironspire beats: arrivals, the Champions and the duel, Hush\'s scene, the hammer, the bell', () => {
  for (const m of ['peaks-veil', 'ironhold', 'stormwatch', 'frostmere']) assert.ok(ARRIVALS[m], `arrival lines for ${m}`);
  const after = (enc, on) => (AFTER[enc] || []).filter(a => a.on === on);
  for (const enc of ['mother-anvil', 'rime-abbot', 'tamsin-ironhold']) assert.ok(after(enc, 'victory').length, `${enc} victory`);
  for (const enc of ['mother-anvil', 'rime-abbot']) assert.ok(!after(enc, 'victory').at(-1).if, `${enc}: a first win always gets its lines`);
  // Tamsin: a win leaves the bracers and the spec's line; a yield sets the duel's flag
  const win = DIALOGUE[after('tamsin-ironhold', 'victory')[0].d];
  assert.ok(win.lines.some(([who, t]) => who === 'tamsin' && t === 'He was here. He left the fire burning so we\'d think he\'d be back.'));
  assert.ok(DIALOGUE[after('tamsin-ironhold', 'yield')[0].d].do.some(e => e.set === ENCOUNTERS['tamsin-ironhold'].yields));
  // Hush's scene follows the Rime-Abbot's last words: Brother Kesh names it if you have met him, else the narrator
  const down = DIALOGUE[after('rime-abbot', 'victory').at(-1).d].choices;
  assert.ok(down.length === 2 && down.every(c => c.next && !c.do), 'every way out of his last words goes on down');
  const by = cond => DIALOGUE[down.find(c => JSON.stringify(c.if) === JSON.stringify(cond))?.next];
  const withKesh = by({ flag: 'met-kesh' }), without = by({ not: { flag: 'met-kesh' } });
  assert.ok(withKesh && without, 'one way with Kesh, one without');
  assert.ok(withKesh.lines.some(([who, t]) => who === 'kesh' && /\bHush\b/.test(t)), 'Kesh names it');
  assert.ok(without.lines.some(([who, t]) => who === 'narrator' && /\bHush\b/.test(t)), 'else the narrator names it');
  for (const n of [withKesh, without]) assert.match(n.lines.map(l => l[1]).join(' '), /slowing/, 'its heartbeat slows');
  // Hilda knows her brother's hammer (the spec's line), and her thank-you comes before any notice
  const ham = DIALOGUE['hilda-hammer'];
  assert.ok(ham.lines.some(([who, t]) => who === 'hilda' && t === 'That\'s my brother\'s hammer. He never put it down in his life. Where is he?'));
  assert.ok(ham.do.some(e => e.claim === 'harrows-hammer') && ham.do.some(e => e.set === 'hammer-shown'));
  assert.equal(NPCS.hilda.talk[0].d, 'hilda-hammer');
  // the bell rings only once the Drowned Abbess is at rest: from its rope in the tower, or with Wynn
  for (const id of ['pv-bell-rope', 'wynn-ring']) {
    const c = (DIALOGUE[id].choices || []).find(x => (x.do || []).some(e => e.set === 'bell-rung-veil'));
    assert.ok(c, `${id} rings the bell`);
    assert.ok(JSON.stringify(c.if || {}).includes('"beaten":"fm-shrine"'), `${id}: not before the Abbess rests`);
  }
  assert.ok(LOOKOUTS['pv-lookout'], 'the lookout on Peak\'s Veil\'s wall');
});

// Every way out of scene `id` carries `{ end: act }` (a node's `do`, or the choice taken).
function endsOn(id, act, got = false, seen = new Set()) {
  const n = DIALOGUE[id];
  const here = got || (n.do || []).some(e => e.end === act);
  if (!n.choices?.length) return here;
  return n.choices.every(c => {
    const now = here || (c.do || []).some(e => e.end === act);
    return c.next && !seen.has(c.next) ? endsOn(c.next, act, now, new Set([...seen, id])) : now;
  });
}

test('the third council (spec §3.6): flag-guarded, closes the main quest, the Thane takes Ironspire\'s chair, the Ironspire card on every path', () => {
  const t = MAPS['keep-hall'].entities.find(e => e.id === 'council-3');
  assert.ok(t && t.kind === 'trigger' && !t.once, 'a keep-hall trigger, never once');
  assert.deepEqual(t.if, { all: [{ flag: 'ironspire-complete' }, { not: { flag: 'council-3-done' } }] });
  const d = DIALOGUE[t.dialogue];
  assert.ok(d.do.some(e => e.set === 'council-3-done'));
  assert.ok(d.do.some(e => e.claim === 'ironspire-waking'));
  assert.ok(d.lines.some(([who]) => who === 'brundar'), 'Thane Brundar sits at the table');
  assert.ok(endsOn(t.dialogue, 'ironspire'), 'every path ends with { end: ironspire }');
  const text = [...reachable(t.dialogue)].flatMap(id => DIALOGUE[id].lines.map(l => l[1])).join(' ');
  assert.match(text, /Gloomfen/);
  assert.match(text, /Harrow/);
  assert.match(text, /Worldforge/);
});

test('the Unsmith\'s Ironspire letters count coals (the region is taken in one order, spec A4)', () => {
  assert.match(LETTERS['brand-of-iron'].text, /\bFive\b/);
  assert.match(LETTERS['brand-of-frost'].text, /\bSix\b/);
  for (const b of ['brand-of-iron', 'brand-of-frost']) assert.ok(LETTERS[b].text.endsWith('— U.'), b);
});
