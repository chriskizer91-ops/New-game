// Thareia T2 (design/09-t2-spec.md 4 and 5): Taela, Chapter 1's fights, the boss, the zones, the fires and the relics.
// Owner: T. The balance itself is checked by `node tools/sim.mjs --route=thareia-c1 [--early]` (5.5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES } from '../src/data/heroes.js';
import { SKILLS } from '../src/data/skills.js';
import { ITEMS, KINDS_BY_SLOT } from '../src/data/items.js';
import { FOES } from '../src/data/foes.js';
import { RELICS } from '../src/data/relics.js';
import { STATUSES } from '../src/data/statuses.js';
import { ENCOUNTERS, PATROLS, BACKDROPS } from '../src/data/encounters.js';
import { ZONES, HEARTHS } from '../src/data/world.js';
import { MAPS } from '../src/data/maps/index.js';
import { tileOf } from '../src/data/tiles.js';
import { C1_ENCOUNTERS, C1_PATROLS, C1_HEARTH_IDS } from '../src/data/thareia/c1-encounters.js';
import { C1_ZONES, C1_HEARTHS } from '../src/data/thareia/c1-world.js';
import { TH_HEARTH_IDS } from '../src/data/thareia/encounters.js';
import { buildFoe, familyOf } from '../src/rules/foe.js';
import { HERO_ART } from '../src/art/hero-looks.js';

// 5.1: every Chapter 1 fight with its XP (tier XP x level, summed)
const XP = {
  'c1-landing': 14, 'c1-verdant-edge': 35, 'c1-runner-camp': 69, 'c1-bramble-deep': 85, 'c1-snag-wallow': 288,
  'c1-grove-circle': 268, 'c1-roots-grubs': 147, 'c1-roots-sapwight': 210, 'c1-missing-patrol': 496,
  'c1-mire-bog': 105, 'c1-mf-runners': 70, 'c1-mire-shrine': 323, 'c1-mw-stair': 203, 'c1-mw-lantern': 433,
  'c1-fjord-crew': 147, 'c1-fjord-cove': 433, 'c1-fjord-inlet': 98, 'c1-glowcaps': 168, 'c1-feral-druid': 210,
  'c1-vesper': 210, 'c1-node-stair': 189, 'c1-node-hall': 252, 'c1-node-roots': 351, 'c1-guardian': 990,
  'c1-gloamwing': 480, 'c1-dael-bounty': 1100,
};
// 5.1: the backdrop, the mode and the flags of each
const ROWS = {
  'c1-landing': ['verdant-wood', 'story', { once: true, gentle: true }], 'c1-verdant-edge': ['verdant-wood', 'story', { once: true }],
  'c1-runner-camp': ['verdant-wood', 'block', { once: true }], 'c1-bramble-deep': ['verdant-wood', 'block', { once: true }],
  'c1-snag-wallow': ['verdant-wood', 'lair', { once: true, optional: true }], 'c1-grove-circle': ['eldergrove', 'lair', { once: true }],
  'c1-roots-grubs': ['heartroot', 'block', { once: true }], 'c1-roots-sapwight': ['heartroot', 'block', { once: true }],
  'c1-missing-patrol': ['heartroot', 'block', { once: true, optional: true }], 'c1-mire-bog': ['mossfall', 'pack', { optional: true }],
  'c1-mf-runners': ['mossfall', 'block', { once: true, optional: true }], 'c1-mire-shrine': ['mossfall', 'lair', { once: true, optional: true, hard: true }],
  'c1-mw-stair': ['mosswatch', 'block', { once: true, main: true }], 'c1-mw-lantern': ['mosswatch', 'lair', { once: true, main: true, dark: true }],
  'c1-fjord-crew': ['mosswatch', 'block', { once: true, dark: true }], 'c1-fjord-cove': ['mosswatch', 'lair', { once: true, dark: true }],
  'c1-fjord-inlet': ['mosswatch', 'lair', { once: true, dark: true }], 'c1-glowcaps': ['verdant-wood', 'block', { once: true, main: true }],
  'c1-feral-druid': ['verdant-wood', 'block', { once: true, talk: 'c1-burners' }], 'c1-vesper': ['fawnrest', 'block', { once: true, optional: true }],
  'c1-node-stair': ['fawnrest-node', 'block', { once: true }], 'c1-node-hall': ['fawnrest-node', 'story', { once: true }],
  'c1-node-roots': ['fawnrest-node', 'block', { once: true }], 'c1-guardian': ['fawnrest-node', 'lair', { once: true, noFlee: true, boss: true }],
  'c1-gloamwing': ['verdant-wood', 'lair', { once: true, optional: true }], 'c1-dael-bounty': ['briarmaw-den', 'lair', { once: true, optional: true }],
};
// the spawns' levels and names (5.1)
const SPAWNS = {
  'c1-landing': [['cutpurse', 1, 'Road-Rat'], ['cutpurse', 1, 'Road-Rat']],
  'c1-verdant-edge': [['briarling', 2], ['thornhound', 3]],
  'c1-runner-camp': [['tallyman', 3, 'Crate-Runner'], ['cutpurse', 3]],
  'c1-bramble-deep': [['bandit', 4], ['briarling', 3]],
  'c1-snag-wallow': [['oldsnag', 6]],
  'c1-grove-circle': [['feral-druid', 5, 'Oda the Thornmother'], ['briarling', 4]],
  'c1-roots-grubs': [['rotgrub', 7], ['rotgrub', 7], ['rotgrub', 7]],
  'c1-roots-sapwight': [['sapwight', 7], ['rotgrub', 7], ['rotgrub', 7]],
  'c1-missing-patrol': [['hollowed-ranger', 7, 'Sergeant Edda Vane'], ['hollowed-ranger', 5], ['hollowed-ranger', 5]],
  'c1-mire-bog': [['boglurcher', 5], ['boglurcher', 5], ['smuggler', 5]],
  'c1-mf-runners': [['smuggler', 5], ['smuggler', 5]],
  'c1-mire-shrine': [['mirelord', 6, 'Gorrow'], ['boglurcher', 5]],
  'c1-mw-stair': [['tallyman', 7, 'Lamp-Runner'], ['smuggler', 7], ['smuggler', 6]],
  'c1-mw-lantern': [['tallyman', 8, 'Hollis Fairweight'], ['smuggler', 7]],
  'c1-fjord-crew': [['smuggler', 7], ['smuggler', 7], ['smuggler', 7]],
  'c1-fjord-cove': [['smuggler', 8, 'Skeet Marrow'], ['smuggler', 7]],
  'c1-fjord-inlet': [['blackwater-gar', 7], ['blackwater-gar', 7]],
  'c1-glowcaps': [['glowcap', 8], ['glowcap', 8], ['glowcap', 8]],
  'c1-feral-druid': [['feral-druid', 7], ['thornhound', 7, 'Rot-Twisted Hound'], ['thornhound', 7, 'Rot-Twisted Hound']],
  'c1-vesper': [['tallyman', 7, 'Vesper'], ['smuggler', 7], ['smuggler', 7]],
  'c1-node-stair': [['rotgrub', 9], ['rotgrub', 9], ['mire-leech', 9]],
  'c1-node-hall': [['glowcap', 9], ['glowcap', 9], ['mire-leech', 9], ['mire-leech', 9]],
  'c1-node-roots': [['sapwight', 9], ['sapwight', 9], ['rotgrub', 9]],
  'c1-guardian': [['rotstag', 9, 'The Hart of Fawnrest']],
  'c1-gloamwing': [['gloamwing', 10]],
  'c1-dael-bounty': [['briarmaw', 10, 'The Nameless Beast']],
};
// the main path before Taela joins (the solo rule, [C23])
const SOLO = ['c1-landing', 'c1-verdant-edge', 'c1-runner-camp', 'c1-bramble-deep'];
// the old game's names Chapter 1 must not show ([C28])
const OLD_WORDS = /tallym|tally|\bbrand\b|briarmaw/i;

const fights = Object.values(C1_ENCOUNTERS).filter(e => e.type === 'fight');
const allSpawns = [...fights.flatMap(e => e.spawns.map(s => [e.id, s])), ...Object.entries(C1_PATROLS).flatMap(([k, sets]) => sets.flat().map(s => [k, s]))];
const built = (s, i = 0) => buildFoe({ ...s, level: s.level || 1 }, { id: `f${i}` });
const walkable = (map, x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && !tileOf(map.rows[y][x]).solid;

test('Taela Greenmantle joins the heroes as spec 4.1 has her, with her four new skills and her look', () => {
  const t = HEROES.taela;
  assert.equal(t.name, 'Taela Greenmantle');
  assert.deepEqual(t.base, { STR: 10, DEX: 13, CON: 13, INT: 12, WIS: 16, CHA: 11 });
  assert.equal(t.hpDie, 8);
  assert.deepEqual(t.mp, { base: 10, perLevel: 3, stat: 'WIS' });
  assert.equal(t.domain, 'attunement');
  assert.deepEqual(t.secondary, ['knowledge']);
  assert.equal(t.guestLevel, 1);
  assert.deepEqual(t.skills.map(s => [s.level, s.id]), [[1, 'mend'], [1, 'root-snare'], [2, 'ward'], [3, 'draw-the-rot'], [4, 'heartwood-splinters'],
    [5, 'greenmantle'], [6, 'dawnsong'], [8, 'revive'], [9, 'cool-the-roots']]);
  for (const s of t.skills) assert.ok(SKILLS[s.id], s.id);
  for (const slot of Object.values(t.gear)) assert.ok(ITEMS[slot.base], slot.base);
  // she refuses metal: the real armour kinds of mail and plate
  assert.deepEqual(t.refuses.kinds, ['mail', 'plate']);
  for (const k of t.refuses.kinds) assert.ok(KINDS_BY_SLOT.body.includes(k), k);
  assert.ok(Object.values(ITEMS).some(i => i.kind === 'mail') && Object.values(ITEMS).some(i => i.kind === 'plate'));
  assert.ok(t.traits[0].immune.includes('rotting') && STATUSES.rotting);
  // 4.2: the new skills
  const rs = SKILLS['root-snare'], rb = SKILLS.rootbind;
  assert.equal(rs.target, 'enemy'); assert.equal(rs.mp, 3);
  assert.deepEqual(rs.effects.map(e => ({ ...e, stat: e.stat && 'X' })), rb.effects.map(e => ({ ...e, stat: e.stat && 'X' })), 'root-snare is rootbind');
  assert.equal(rs.effects[0].stat, 'WIS');
  const dr = SKILLS['draw-the-rot'];
  assert.equal(dr.target, 'ally'); assert.equal(dr.mp, 3);
  assert.deepEqual(dr.effects[0], { type: 'cleanse', statuses: ['rotting', 'poisoned'] });
  assert.equal(dr.effects[1].type, 'heal'); assert.equal(dr.effects[1].dice, '1d6'); assert.equal(dr.effects[1].stat, 'WIS');
  const gm = SKILLS.greenmantle;
  assert.equal(gm.target, 'ally'); assert.equal(gm.mp, 4); assert.equal(gm.effects[0].status, 'regenerating');
  const cr = SKILLS['cool-the-roots'];
  assert.equal(cr.target, 'all-allies'); assert.equal(cr.mp, 7);
  assert.deepEqual(cr.effects[0], { type: 'cleanse', statuses: ['burning'] });
  assert.equal(cr.effects[1].status, 'warded');
  // 4.4: her walker, battle rig and portrait all draw from HERO_ART
  assert.ok(HERO_ART.taela && HERO_ART.taela.starter.weapon && HERO_ART.taela.H.ears);
});

test('every Chapter 1 fight has its families, variants and relics, the 5.1 levels and names, and its XP', () => {
  assert.deepEqual(fights.map(e => e.id).sort(), Object.keys(XP).sort());
  for (const [id, s] of allSpawns) {
    assert.ok(FOES[s.family], `${id}: family ${s.family}`);
    if (s.variant) assert.ok(FOES[s.family].variants?.[s.variant], `${id}: variant ${s.family}/${s.variant}`);
    if (s.relic) assert.ok(RELICS[s.relic], `${id}: relic ${s.relic}`);
    if (s.wears) assert.ok(RELICS[s.wears], `${id}: wears ${s.wears}`);
    for (const r of familyOf(s).relics || []) assert.ok(RELICS[r], `${id}: ${s.family} holds ${r}`);
    assert.equal(s.noWaking, true, `${id}: the T1 helper S()`);
  }
  for (const e of fights) {
    const want = SPAWNS[e.id];
    assert.equal(e.spawns.length, want.length, `${e.id}: spawns`);
    e.spawns.forEach((s, i) => {
      const [family, level, name] = want[i];
      assert.equal(s.family, family, `${e.id}#${i}`);
      assert.equal(s.level, level, `${e.id}#${i} level`);
      if (name) assert.equal(built(s).name, name, `${e.id}#${i} name`);
    });
    assert.equal(e.spawns.reduce((a, s, i) => a + built(s, i).xp, 0), XP[e.id], `${e.id}: XP`);
    const [backdrop, mode, flags] = ROWS[e.id];
    assert.equal(e.backdrop, backdrop, `${e.id}: backdrop`);
    assert.ok(BACKDROPS.includes(e.backdrop), e.backdrop);
    assert.equal(e.mode, mode, `${e.id}: mode`);
    for (const [k, v] of Object.entries(flags)) assert.equal(e[k], v, `${e.id}: ${k}`);
    assert.ok(e.name && e.text && e.text.length <= 140 && e.place, `${e.id}: name, place and a short text`);
    assert.ok(ENCOUNTERS[e.id], `${e.id} is merged into ENCOUNTERS`);
  }
  // the tallyman family is used for numbers only: every tallyman spawn has a Thareia variant and its own name
  for (const [id, s] of allSpawns.filter(([, s]) => s.family === 'tallyman')) {
    assert.ok(['runner', 'th-signalmaster', 'th-apothecary'].includes(s.variant), `${id}: ${s.variant}`);
    assert.ok(s.name, `${id}: named`);
  }
});

test('the solo rule: before Taela joins, a main-path fight has at most 2 foes and none above level 4; the solo zones stay at 1-2', () => {
  for (const id of SOLO) {
    const e = C1_ENCOUNTERS[id];
    assert.ok(e.spawns.length <= 2, `${id}: ${e.spawns.length} foes`);
    for (const s of e.spawns) assert.ok(s.level <= 4, `${id}: ${s.family} L${s.level}`);
  }
  for (const zone of ['th-landing', 'th-thornway']) {
    assert.equal(C1_ZONES[zone].level, 1, zone);
    for (const set of C1_PATROLS[zone]) assert.ok(set.length <= 2, `${zone}: a set of ${set.length}`);
  }
});

test('the Hart of Fawnrest: a champion at level 9 with 321 HP, both relics, three phases and no bell', () => {
  const [spawn] = C1_ENCOUNTERS['c1-guardian'].spawns;
  assert.equal(spawn.family, 'rotstag'); assert.equal(spawn.variant, 'guardian');
  const v = FOES.rotstag.variants.guardian;
  assert.equal(v.name, 'The Hart of Fawnrest');
  assert.equal(v.tier, 'champion'); assert.ok(v.unique && v.noFlee);
  assert.equal(v.hp, 110); assert.deepEqual(v.weak, ['frost']);
  assert.deepEqual(v.relics, ['rotwood-circlet', 'fawnrest-heartstone']);
  const f = buildFoe(spawn, { id: 'hart' });
  assert.equal(f.level, 9); assert.equal(f.hp, 321); assert.equal(f.tier, 'champion');
  assert.equal(f.guard, 17); assert.equal(f.atk, 9); assert.equal(f.dmg, 5);
  assert.deepEqual(f.held.map(h => h.relic), ['rotwood-circlet', 'fawnrest-heartstone']);
  assert.ok(!f.held.some(h => h.relic === 'dawnbell'), 'no bell');
  assert.deepEqual(v.phases.map(p => [p.at, p.text]), [[1, 'The guardian wakes.'], [0.66, 'The node answers.'], [0.33, 'The last white stag.']]);
  const want = [
    [[1, 7, 'gore'], [8, 11, 'trample'], [12, 15, 'rot-bellow'], [16, 20, 'rotwood-crown']],
    [[1, 5, 'gore'], [6, 8, 'antler-charge'], [9, 12, 'node-flare'], [13, 15, 'root-call'], [16, 20, 'rotwood-crown']],
    [[1, 4, 'gore'], [5, 9, 'overheat'], [10, 14, 'node-flare'], [15, 17, 'antler-charge'], [18, 20, 'rot-bellow']],
  ];
  assert.deepEqual(v.phases.map(p => p.table), want);
  for (const p of v.phases) for (const [, , m] of p.table) assert.ok(v.moves[m], m);
  // with both relics pried loose, only gore, trample, antler-charge and bellow remain
  const loose = Object.entries(v.moves).filter(([, m]) => !m.requires).map(([k]) => k).sort();
  assert.deepEqual(loose, ['antler-charge', 'gore', 'rot-bellow', 'trample']);
  for (const m of Object.values(v.moves)) if (m.requires) assert.ok(v.relics.includes(m.requires) && v.moves[m.fallback], m.name);
  assert.deepEqual(v.moves['root-call'].effects[0], { type: 'summon', family: 'rotgrub', count: 1, max: 2, levelDelta: -3 });
  assert.ok(v.moves.overheat.charge && v.moves['antler-charge'].charge);
  const hs = RELICS['fawnrest-heartstone'];
  assert.equal(hs.slot, 'amulet'); assert.equal(hs.aspect, 'ember'); assert.equal(hs.ilvl, 9);
  assert.ok(hs.grip >= 24 && hs.grip <= 40, 'grip about 28');
});

test('Chapter 1\'s relic copies keep the old numbers, and no spawn, relic or fight names the old factions', () => {
  const numbers = r => ({ ...r, id: 0, codex: 0, name: 0, holder: 0, lore: 0, thareia: 0, grants: 0,
    power: r.power && { ...r.power, id: 0, name: 0, text: 0 }, mapPower: r.mapPower && { id: r.mapPower.id },
    awaken: Object.fromEntries(Object.entries(r.awaken).map(([k, b]) => [k, b.stats])) });
  for (const [copy, old] of [['th-crateknife', 'tallyknife'], ['th-lightfingers', 'lightfingers'], ['th-thornwreath', 'thornwreath']]) {
    assert.deepEqual(numbers(RELICS[copy]), numbers(RELICS[old]), `${copy} has ${old}'s numbers`);
    assert.equal(RELICS[copy].mapPower.id, RELICS[old].mapPower.id);
  }
  assert.deepEqual(SKILLS[RELICS['th-crateknife'].grants[0]].effects, SKILLS['tally-cut'].effects);
  const relicText = r => [r.name, r.holder, r.lore, r.power?.name, r.power?.text, r.mapPower?.name, r.mapPower?.text,
    ...Object.values(r.awaken || {}).flatMap(b => [b.name, b.text])];
  for (const id of ['fawnrest-heartstone', 'th-crateknife', 'th-lightfingers', 'th-thornwreath']) {
    for (const t of relicText(RELICS[id])) assert.doesNotMatch(t || '', OLD_WORDS, `${id}: ${t}`);
  }
  const seen = new Set();
  for (const [id, s] of allSpawns) {
    const fam = familyOf(s);
    const texts = [built(s).name, fam.text, fam.koText, ...Object.values(fam.moves).flatMap(m => [m.name, m.text]),
      ...(fam.phases || []).map(p => p.text)];
    for (const t of texts) if (t) assert.doesNotMatch(t, OLD_WORDS, `${id}: ${s.family}${s.variant ? `/${s.variant}` : ''}: ${t}`);
    for (const r of [s.relic, s.wears, ...(s.relic ? [] : fam.relics || [])].filter(Boolean)) seen.add(r);
  }
  for (const r of seen) for (const t of relicText(RELICS[r])) assert.doesNotMatch(t || '', OLD_WORDS, `${r}: ${t}`);
  for (const e of Object.values(C1_ENCOUNTERS)) for (const t of [e.name, e.place, e.text]) assert.doesNotMatch(t, OLD_WORDS, `${e.id}: ${t}`);
});

test('Chapter 1\'s zones, patrols and nine fires are merged, and every fire stands on its map', () => {
  assert.deepEqual(Object.fromEntries(Object.values(C1_ZONES).map(z => [z.id, [z.level, z.backdrop]])), {
    'th-landing': [1, 'verdant-wood'], 'th-thornway': [1, 'verdant-wood'], 'th-roots': [6, 'heartroot'],
    'th-mossfall': [6, 'mossfall'], 'th-hindwood': [7, 'verdant-wood'],
  });
  for (const z of Object.values(C1_ZONES)) {
    assert.ok(ZONES[z.id] && PATROLS[z.sets] && PATROLS[z.sets].length === 3, z.id);
    for (const set of PATROLS[z.sets]) for (const s of set) assert.equal(s.level, 0, `${z.id}: the zone sets the level`);
  }
  // the maps that roam name a zone that exists
  for (const m of Object.values(MAPS)) if (m.id.startsWith('th-') && m.zone) assert.ok(ZONES[m.zone], `${m.id}: zone ${m.zone}`);
  assert.equal(C1_HEARTH_IDS.length, 9);
  assert.deepEqual([...C1_HEARTH_IDS].sort(), Object.keys(C1_HEARTHS).sort());
  for (const id of C1_HEARTH_IDS) {
    assert.ok(TH_HEARTH_IDS.includes(id), id);
    assert.equal(ENCOUNTERS[id]?.type, 'hearthfire', id);
    const h = HEARTHS[id];
    assert.ok(h && h.name === ENCOUNTERS[id].name, `${id}: name`);
    const map = MAPS[h.map];
    assert.ok(map, `${id}: map ${h.map}`);
    assert.ok(walkable(map, h.x, h.y), `${id}: stand walkable`);
    const e = map.entities.find(x => x.id === id);
    if (e) assert.deepEqual(e.stand, [h.x, h.y, h.face], `${id}: the map's stand`);
  }
  assert.ok(C1_HEARTHS['th-hr-coal'].cold && C1_HEARTHS['th-mw-fire'].cold && C1_HEARTHS['th-fr-stone'].cold);
});
