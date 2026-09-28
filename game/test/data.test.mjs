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

test('the twelve M2 relics match the shared vocabulary; M3 adds twelve heirlooms (codex 13-24), M4 fourteen more (25-38)', () => {
  for (const id of Object.keys(RELIC_TABLE)) assert.ok(RELICS[id], id);
  assert.equal(Object.keys(RELICS).length, 38);
  assert.deepEqual(Object.values(RELICS).map(r => r.codex).sort((a, b) => a - b), Array.from({ length: 38 }, (_, i) => i + 1));
  for (const r of Object.values(RELICS).filter(r => r.codex > 12 && r.codex <= 24)) {
    assert.equal(r.rarity, 'heirloom', r.id);
    assert.ok(r.power && r.mapPower, `${r.id} has a power and a map power`);
  }
  // M4 (spec §3.4): every Sunscorch relic is an heirloom with a map power (its signature power is WP-foes's)
  for (const r of Object.values(RELICS).filter(r => r.codex > 24)) {
    assert.equal(r.rarity, 'heirloom', r.id);
    assert.ok(r.mapPower, `${r.id} has a map power`);
  }
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
  for (const f of Object.values(FOES)) {
    for (const moves of [f.moves, ...Object.values(f.variants || {}).map(v => v.moves).filter(Boolean)]) {
      for (const m of Object.values(moves)) { walk(m.effects); if (m.requires) assert.ok(RELICS[m.requires], m.requires); }
    }
  }
  for (const r of Object.values(RELICS)) walk(r.power?.effects);
  for (const s of statusRefs) assert.ok(STATUSES[s], s);
  assert.ok(Object.keys(SKILLS).length >= 20);
  assert.ok(Object.keys(AFFIXES).length >= 30);
  for (const a of Object.values(AFFIXES)) if (a.type === 'suffix') assert.ok(DOMAIN_IDS.includes(a.domain), a.id);
});

test('every move table covers every face of its intent die', () => {
  for (const f of Object.values(FOES)) {
    // a variant may override the tier (named holders are relic-bearers) and the moves
    const tables = f.phases
      ? f.phases.map(p => ({ t: p.table, die: FOE_TIERS[f.tier].die, moves: f.moves, id: f.id }))
      : [{ t: f.table, die: FOE_TIERS[f.tier].die, moves: f.moves, id: f.id },
        ...Object.entries(f.variants || {}).filter(([, v]) => v.table).map(([k, v]) => ({ t: v.table, die: FOE_TIERS[v.tier || f.tier].die, moves: v.moves || f.moves, id: `${f.id}/${k}` }))];
    for (const { t, die, moves, id } of tables) {
      for (let face = 1; face <= die; face++) {
        const row = t.find(([lo, hi]) => face >= lo && face <= hi);
        assert.ok(row && moves[row[2]], `${id} face ${face}`);
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

// ---- M3 data (spec §3.2-§3.5, §6.1 WP4) ----------------------------------------------------------------

test('M3 and M4 encounters: every one has a region, a valid backdrop, real families and real relics', async () => {
  const { BRANDS, PATROLS } = await import('../src/data/encounters.js');
  const { REGIONS } = await import('../src/data/world.js');
  const { familyOf } = await import('../src/rules/foe.js');
  for (const [id, n] of Object.entries(ENCOUNTERS)) {
    assert.ok(BACKDROPS.includes(n.backdrop), `${id} backdrop`);
    if (!GAUNTLET.includes(id)) assert.ok(n.region === 'verdant' || n.region === 'sunscorch', `${id} region`);
    for (const s of n.spawns || []) {
      if (s.variant && s.variant !== '$rival') assert.ok(FOES[s.family].variants?.[s.variant], `${id}: ${s.family}/${s.variant}`);
      for (const r of [s.relic, s.wears]) if (r && r !== '$rival') assert.ok(RELICS[r], `${id}: relic ${r}`);
      if (s.variant !== '$rival') assert.ok(familyOf(s).tier, `${id}: tier`);
    }
    if (n.brand) assert.ok(BRANDS[n.brand], `${id} brand`);
  }
  for (const b of Object.values(BRANDS)) assert.ok(REGIONS[b.region]?.brands.includes(b.id), `${b.id} has a region that lists it`);
  for (const [k, sets] of Object.entries(PATROLS)) for (const set of sets) for (const s of set) assert.equal(FOES[s.family].tier, 'rabble', `${k}: patrols are rabble`);
});

test('M3 foes: the Rotwarden has three phases whose Arts need its breakable relics; Tamsin has a variant per starter', () => {
  const rw = FOES.rotwarden;
  assert.equal(rw.phases.length, 3);
  assert.deepEqual(rw.relics, ['ichor-mask', 'first-seed']);
  for (const ph of rw.phases) {
    const faces = new Set();
    for (const [lo, hi, move] of ph.table) { assert.ok(rw.moves[move], move); for (let f = lo; f <= hi; f++) faces.add(f); }
    assert.equal(faces.size, 20);
  }
  for (const m of Object.values(rw.moves)) if (m.requires) assert.ok(rw.relics.includes(m.requires) && rw.moves[m.fallback], m.name);
  for (const st of Object.keys(STARTERS)) {
    const v = FOES.tamsin.variants[st];
    assert.ok(v, `Tamsin carries ${st}`);
    assert.ok(Object.values(v.moves).some(m => m.requires === st), `${st}: her Art needs the lent relic`);
    assert.ok(STARTERS[STARTERS[st].rival], 'rivals are starters');
  }
  assert.equal(FOES.tamsin.tier, 'relic-bearer');
  for (const id of ['gloamwing', 'mirelord']) assert.equal(FOES[id].tier, 'relic-bearer');
});

test('shops sell consumables with prices; the temper table has three steps', async () => {
  const { TUNING } = await import('../src/data/tuning.js');
  for (const id of ['hearth-tonic', 'bitterroot', 'frost-draught', 'ember-salts']) assert.ok(CONSUMABLES[id].price > 0, id);
  assert.equal(TUNING.temper.max, 3);
  assert.equal(TUNING.temper.mult.length, 3);
  assert.equal(TUNING.waking.rabbleLevels, 2);
});
