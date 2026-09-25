import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASPECTS, ASPECT_IDS, ARMOR_CHART } from '../src/data/aspects.js';
import { RARITY, RARITY_ORDER } from '../src/data/rarity.js';
import { ITEMS, KINDS_BY_SLOT, CONSUMABLES } from '../src/data/items.js';
import { RELICS, SETS } from '../src/data/relics.js';
import { AFFIXES } from '../src/data/affixes.js';
import { SKILLS } from '../src/data/skills.js';
import { STATUSES } from '../src/data/statuses.js';
import { HEROES, HERO_IDS, STARTERS } from '../src/data/heroes.js';
import { FOES, FOE_TIERS } from '../src/data/foes.js';
import { OMENS } from '../src/data/omens.js';
import { ENCOUNTERS, GAUNTLET, BACKDROPS } from '../src/data/encounters.js';
import { DOMAIN_IDS } from '../src/data/domains.js';

const RELIC_TABLE = {
  hearthbrand: ['sword', 'ember'], 'stillwater-lance': ['spear', 'frost'], cairnmaul: ['hammer', 'stone'],
  'wardens-seal': ['amulet', 'radiant'], tallyknife: ['dagger', 'blight'], thornsplitter: ['axe', 'verdant'],
  'rotwood-circlet': ['circlet', 'blight'], 'thornwatch-hood': ['hood', 'verdant'], 'thornwatch-jerkin': ['leather', 'verdant'],
  'thornwatch-boots': ['boots', 'verdant'], thornwreath: ['crown', 'verdant'], briarfang: ['dagger', 'verdant'],
};

test('aspect wheel: each aspect beats two and is beaten by two', () => {
  assert.deepEqual([...ASPECT_IDS].sort(), ['blight', 'ember', 'frost', 'radiant', 'stone', 'storm', 'tide', 'verdant']);
  for (const a of ASPECT_IDS) {
    assert.equal(ASPECTS[a].beats.length, 2, `${a} beats two`);
    const beatenBy = ASPECT_IDS.filter(b => ASPECTS[b].beats.includes(a));
    assert.equal(beatenBy.length, 2, `${a} is beaten by two`);
    assert.ok(!ASPECTS[a].beats.includes(a));
  }
});

test('aspect wheel keeps the starter triangle and the radiant/blight pair', () => {
  assert.ok(ASPECTS.ember.beats.includes('frost'));
  assert.ok(ASPECTS.frost.beats.includes('stone'));
  assert.ok(ASPECTS.stone.beats.includes('ember'));
  assert.ok(ASPECTS.radiant.beats.includes('blight') && ASPECTS.blight.beats.includes('radiant'));
  assert.equal(ARMOR_CHART.crush.plate > 1, true);
  assert.equal(ARMOR_CHART.slash.hide > 1, true);
});

test('rarity tiers are the eight shared ids with colours, in order', () => {
  assert.deepEqual(RARITY_ORDER, ['worn', 'wrought', 'tempered', 'runed', 'storied', 'heirloom', 'regalia', 'primal']);
  RARITY_ORDER.forEach((id, i) => {
    assert.equal(RARITY[id].rank, i);
    assert.match(RARITY[id].color, /^#[0-9a-f]{6}$/i);
  });
  assert.deepEqual(['worn', 'wrought', 'tempered', 'runed'].map(r => RARITY[r].affixes), [0, 1, 2, 3]);
  assert.ok(RARITY.primal.statMult > RARITY.heirloom.statMult);
});

test('every shared item kind has at least one base item', () => {
  for (const [slot, kinds] of Object.entries(KINDS_BY_SLOT)) {
    for (const kind of kinds) assert.ok(Object.values(ITEMS).some(b => b.kind === kind && b.slot === slot), `${slot}/${kind}`);
  }
  assert.ok(Object.keys(ITEMS).length >= 30);
  for (const b of Object.values(ITEMS).filter(b => b.slot === 'weapon')) assert.match(b.dice, /^\d+d\d+$/);
  for (const c of ['hearth-tonic', 'ember-salts', 'frost-draught']) assert.ok(CONSUMABLES[c]);
});

test('the twelve named relics match the shared vocabulary', () => {
  assert.deepEqual(Object.keys(RELICS).sort(), Object.keys(RELIC_TABLE).sort());
  for (const [id, [kind, aspect]] of Object.entries(RELIC_TABLE)) {
    assert.equal(RELICS[id].kind, kind, id);
    assert.equal(RELICS[id].aspect, aspect, id);
    assert.ok(RELICS[id].lore.length > 20);
    if (RELICS[id].rarity === 'heirloom') assert.ok(RELICS[id].power, `${id} has a signature power`);
  }
  assert.equal(RELICS.thornsplitter.rarity, 'heirloom');
  assert.equal(RELICS['thornwatch-hood'].rarity, 'regalia');
  assert.deepEqual(SETS.thornwatch.bonuses.map(b => b.n), [2, 3]);
});

test('skills, affixes and foes reference real statuses, domains and relics', () => {
  const statusRefs = [];
  const walk = effs => { for (const e of effs || []) { if (e.status) statusRefs.push(e.status); walk(e.riders); } };
  for (const sk of Object.values(SKILLS)) { assert.ok(DOMAIN_IDS.includes(sk.domain), sk.id); walk(sk.effects); }
  for (const f of Object.values(FOES)) for (const m of Object.values(f.moves)) { walk(m.effects); if (m.requires) assert.ok(RELICS[m.requires]); }
  for (const r of Object.values(RELICS)) walk(r.power?.effects);
  for (const s of statusRefs) assert.ok(STATUSES[s], s);
  assert.ok(Object.keys(SKILLS).length >= 20);
  assert.ok(Object.keys(AFFIXES).length >= 30);
  for (const a of Object.values(AFFIXES)) if (a.type === 'suffix') assert.ok(DOMAIN_IDS.includes(a.domain), a.id);
});

test('every move table covers every face of its intent die', () => {
  for (const f of Object.values(FOES)) {
    const die = FOE_TIERS[f.tier].die;
    const tables = f.phases ? f.phases.map(p => p.table) : [f.table, ...Object.values(f.variants || {}).map(v => v.table)];
    for (const t of tables) {
      for (let face = 1; face <= die; face++) {
        const row = t.find(([lo, hi]) => face >= lo && face <= hi);
        assert.ok(row && f.moves[row[2]], `${f.id} face ${face}`);
      }
    }
  }
  assert.deepEqual(FOES.briarmaw.relics, ['thornwreath', 'briarfang']);
  assert.deepEqual(FOES.oldsnag.relics, ['thornsplitter']);
  assert.deepEqual(FOES.rotstag.relics, ['rotwood-circlet']);
  assert.equal(Object.keys(OMENS).length, 6);
});

test('heroes: base stats in 4d6-drop-lowest range and valid starting gear', () => {
  assert.deepEqual([...HERO_IDS], ['warden', 'pip', 'bryn', 'alondra']);
  for (const h of Object.values(HEROES)) {
    for (const v of Object.values(h.base)) assert.ok(v >= 3 && v <= 18);
    for (const g of Object.values(h.gear)) if (g !== 'starter') assert.ok(ITEMS[g.base], g.base);
    for (const sk of h.skills) assert.ok(SKILLS[sk.id], sk.id);
  }
  assert.deepEqual(Object.keys(STARTERS).sort(), ['cairnmaul', 'hearthbrand', 'stillwater-lance']);
});

test('the Gauntlet: ordered nodes, Hearthfires, holders in place, backdrops valid', () => {
  assert.ok(GAUNTLET.length >= 12);
  const fires = GAUNTLET.filter(id => ENCOUNTERS[id].type === 'hearthfire');
  assert.ok(fires.length >= 3 && fires.length <= 4);
  for (const id of GAUNTLET) {
    const n = ENCOUNTERS[id];
    assert.ok(BACKDROPS.includes(n.backdrop), id);
    for (const s of n.spawns || []) assert.ok(FOES[s.family], s.family);
  }
  assert.equal(ENCOUNTERS['keep-vault'].spawns[0].relic, 'wardens-seal');
  assert.equal(ENCOUNTERS[GAUNTLET[GAUNTLET.length - 1]].spawns[0].family, 'briarmaw');
});

test('data tables are frozen', () => {
  assert.ok(Object.isFrozen(FOES.briarmaw.moves.maul));
  assert.throws(() => { 'use strict'; RELICS.hearthbrand.name = 'x'; });
});
