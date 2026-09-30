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

test('the twelve M2 relics match the shared vocabulary; M3 adds twelve heirlooms (codex 13-24), M4 fourteen more (25-38), M5 fourteen more (39-52), M6 fourteen more (53-66), M7 Page V\'s nine (No. 000 and 67-74)', () => {
  for (const id of Object.keys(RELIC_TABLE)) assert.ok(RELICS[id], id);
  assert.equal(Object.keys(RELICS).length, 75);
  assert.deepEqual(Object.values(RELICS).map(r => r.codex).sort((a, b) => a - b), Array.from({ length: 75 }, (_, i) => i));
  for (const r of Object.values(RELICS).filter(r => r.codex > 12 && r.codex <= 24)) {
    assert.equal(r.rarity, 'heirloom', r.id);
    assert.ok(r.power && r.mapPower, `${r.id} has a power and a map power`);
  }
  // M4 (spec §3.4): every Sunscorch relic is an heirloom with a signature power and a map power (M5's and M6's too)
  for (const r of Object.values(RELICS).filter(r => r.codex > 24 && r.codex <= 66)) {
    assert.equal(r.rarity, 'heirloom', r.id);
    assert.ok(r.power && r.mapPower, `${r.id} has a power and a map power`);
  }
  // M7 (spec §3.4): Page V's No. 000 and the Worldforge Heart are primal, the rest regalia; each has both powers
  const PAGE_V = Object.values(RELICS).filter(r => r.codex === 0 || r.codex > 66);
  assert.deepEqual(PAGE_V.map(r => r.codex).sort((a, b) => a - b), [0, 67, 68, 69, 70, 71, 72, 73, 74]);
  for (const r of PAGE_V) {
    assert.equal(r.rarity, ['fenwicks-poker', 'worldforge-heart'].includes(r.id) ? 'primal' : 'regalia', r.id);
    assert.ok(r.power && r.mapPower, `${r.id} has a power and a map power`);
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

test('M3, M4, M5, M6 and M7 encounters: every one has a region, a valid backdrop, real families and real relics', async () => {
  const { BRANDS, PATROLS } = await import('../src/data/encounters.js');
  const { REGIONS } = await import('../src/data/world.js');
  const { familyOf } = await import('../src/rules/foe.js');
  for (const [id, n] of Object.entries(ENCOUNTERS)) {
    assert.ok(BACKDROPS.includes(n.backdrop), `${id} backdrop`);
    if (!GAUNTLET.includes(id)) assert.ok(['verdant', 'sunscorch', 'ironspire', 'gloomfen', 'below'].includes(n.region), `${id} region`);
    for (const s of n.spawns || []) {
      if (s.variant && !s.variant.startsWith('$rival')) assert.ok(FOES[s.family].variants?.[s.variant], `${id}: ${s.family}/${s.variant}`); // '$rival' or '$rival:<duel>' (M5)
      for (const r of [s.relic, s.wears]) if (r && r !== '$rival') assert.ok(RELICS[r], `${id}: relic ${r}`);
      if (!String(s.variant).startsWith('$rival')) assert.ok(familyOf(s).tier, `${id}: tier`);
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

test('shops sell consumables with prices; the temper table has ten steps (M4 spec §4.2)', async () => {
  const { TUNING } = await import('../src/data/tuning.js');
  for (const id of ['hearth-tonic', 'bitterroot', 'frost-draught', 'ember-salts']) assert.ok(CONSUMABLES[id].price > 0, id);
  assert.equal(TUNING.temper.max, 10);
  assert.equal(TUNING.temper.mult.length, 10);
  assert.equal(TUNING.waking.rabbleLevels, 2);
});

// ---- M4 data (spec §3.2-§3.5, §4.3; P4) --------------------------------------------------------------

const SUN_FAMILIES = {
  'sand-skink': ['rabble', 'ember'], scavenger: ['rabble', null], 'dune-raider': ['veteran', 'storm'], 'glass-scorpion': ['veteran', 'stone'],
  'mirage-wisp': ['veteran', 'frost'], 'ash-wight': ['veteran', 'ember'], 'sand-wyrm': ['relic-bearer', 'stone'],
  kharzul: ['champion', 'stone'], 'ashen-warden': ['champion', 'ember'],
};
// variant -> the relic its Art needs (null: a lair boss or a veteran with no relic)
const SUN_VARIANTS = {
  'dune-raider/rider': 'sandwalkers', 'dune-raider/raider-king': 'dunebreaker', 'glass-scorpion/matriarch': null,
  'mirage-wisp/queen': 'mirage-glass', 'ash-wight/captain': 'scorchgate-key',
  'tallyman/foreman': 'sunstone-lantern', 'tallyman/quartermaster': null, 'smuggler/sharpshooter': 'saltglass',
};

test('M4 foes: the nine Sunscorch families are real (no scaffold stubs), with the spec\'s tiers and aspects', () => {
  for (const [id, [tier, aspect]] of Object.entries(SUN_FAMILIES)) {
    const f = FOES[id];
    assert.ok(f, id);
    assert.ok(!f.stub, `${id} is no longer the scaffold stub`);
    assert.equal(f.id, id);
    assert.equal(f.tier, tier, `${id} tier`);
    assert.equal(f.aspect, aspect, `${id} aspect`);
    for (const k of ['hp', 'guard', 'atk', 'dmg', 'speed']) assert.ok(Number.isFinite(f[k]) && f[k] > 0, `${id}.${k}`);
    for (const k of ['STR', 'DEX', 'CON', 'WIS']) assert.ok(Number.isFinite(f.saves[k]), `${id} saves ${k}`);
    assert.ok(f.name && f.art && f.text.length > 30, `${id} has a name, an art key and flavour`);
    if (f.humanoid) {
      assert.equal(f.gear.length, 4, `${id}: a gear row per gear tier`);
      for (const row of f.gear) assert.ok(row.some(g => ITEMS[g.base].slot === 'weapon') && row.every(g => ITEMS[g.base]), `${id} gear`);
    }
    // every move is described and has effects; every table face is covered (tested above for all families)
    for (const [mid, m] of Object.entries(f.moves)) assert.ok(m.name && m.text && m.effects.length, `${id}/${mid}`);
  }
  // rabble flee when it goes badly; the Wyrm and the Champions are one of a kind
  for (const id of ['sand-skink', 'scavenger']) assert.ok(Object.values(FOES[id].moves).some(m => m.when?.hpBelow && m.effects.some(e => e.type === 'escape')), `${id} flees`);
  for (const id of ['sand-wyrm', 'kharzul', 'ashen-warden']) assert.equal(FOES[id].unique, true, id);
  assert.ok(Object.values(FOES['dune-raider'].moves).some(m => m.name === 'Sand in the Eyes'));
  assert.ok(Object.values(FOES['glass-scorpion'].moves).some(m => m.name === 'Glass Sting' && m.effects[0].riders.some(r => r.status === 'bleeding')));
  assert.ok(Object.values(FOES['ash-wight'].moves).some(m => m.effects.some(e => e.type === 'heal' && e.self)), 'wights drain');
  assert.ok(Object.values(FOES['ash-wight'].moves).some(m => m.effects.some(e => e.riders?.some(r => r.status === 'burning'))), 'wights set Burning');
  assert.deepEqual(FOES['sand-wyrm'].relics, ['wyrmscale']);
});

test('M4 variants: every Sunscorch holder and Tallyman variant is valid and uses its relic through requires/fallback', () => {
  for (const [key, relic] of Object.entries(SUN_VARIANTS)) {
    const [fam, name] = key.split('/');
    const v = FOES[fam].variants?.[name];
    assert.ok(v, key);
    assert.ok(v.name && v.art && v.moves && v.table, `${key}: name, art, moves, table`);
    const tier = v.tier || FOES[fam].tier;
    assert.equal(tier, key === 'tallyman/quartermaster' ? 'veteran' : 'relic-bearer', `${key} tier`);
    const arts = Object.values(v.moves).filter(m => m.requires);
    if (!relic) continue;
    assert.ok(RELICS[relic], relic);
    const own = arts.filter(m => m.requires === relic);
    assert.ok(own.length, `${key} has an Art that needs ${relic}`);
    for (const m of own) assert.ok(v.moves[m.fallback] && !v.moves[m.fallback].requires, `${key}: ${m.name} falls back to a plain move`);
    // the Art sits on the d12's high faces, which the disarmed d8 cannot roll
    const faces = v.table.filter(([, , mid]) => v.moves[mid].requires === relic).flatMap(([lo, hi]) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i));
    assert.ok(faces.length && faces.every(n => n > 8), `${key}: the Art is on faces 9-12`);
  }
  // the M3 variants are untouched by M4's additions
  for (const k of ['thief', 'signalmaster', 'counter', 'apothecary']) assert.ok(FOES.tallyman.variants[k], `tallyman/${k}`);
  assert.ok(FOES.smuggler.variants.queen);
});

test('M4 Champions: Kharzul and the Ashen Warden fight in three phases whose Arts need their breakable pieces', () => {
  const PIECES = { kharzul: ['cinderfang', 'glass-carapace'], 'ashen-warden': ['ashen-aegis', 'cinder-crown'] };
  const NEEDS = {
    kharzul: { glasscutter: 'cinderfang', 'molten-tail': 'cinderfang', 'carapace-brace': 'glass-carapace' },
    'ashen-warden': { 'ward-of-ash': 'ashen-aegis', 'command-of-cinders': 'cinder-crown', 'watch-unbroken': 'cinder-crown' },
  };
  for (const [id, pieces] of Object.entries(PIECES)) {
    const f = FOES[id];
    assert.deepEqual(f.relics, pieces);
    assert.equal(f.noFlee, true);
    assert.deepEqual(f.phases.map(p => p.at), [1, 0.66, 0.33]);
    for (const ph of f.phases) {
      assert.ok(ph.text.length > 10);
      const faces = new Set();
      for (const [lo, hi, mid] of ph.table) { assert.ok(f.moves[mid], mid); for (let n = lo; n <= hi; n++) faces.add(n); }
      assert.equal(faces.size, 20, `${id}: every d20 face`);
    }
    for (const [mid, relic] of Object.entries(NEEDS[id])) {
      assert.equal(f.moves[mid].requires, relic, `${id}/${mid}`);
      assert.ok(f.moves[f.moves[mid].fallback] && !f.moves[f.moves[mid].fallback].requires, `${id}/${mid} falls back`);
    }
    // each piece shuts at least one move down, and every move a piece powers is on some phase table
    for (const r of pieces) assert.ok(Object.values(f.moves).some(m => m.requires === r), `${id}: ${r} powers something`);
    const used = new Set(f.phases.flatMap(p => p.table.map(([, , m]) => m)));
    for (const mid of Object.keys(NEEDS[id])) assert.ok(used.has(mid), `${id}/${mid} is rolled in some phase`);
  }
  const k = FOES.kharzul;
  assert.equal(k.moves.glasscutter.charge, true);
  assert.equal(k.moves.glasscutter.fallback, 'tail-lash');
  assert.equal(k.moves.glasscutter.target, 'all-enemies');
  assert.equal(k.armor, 'chitin');
  assert.deepEqual(k.phases.map(p => p.table.map(([, , m]) => m).filter(m => ['glasscutter', 'burrow', 'carapace-brace', 'glass-rain', 'molten-tail'].includes(m))),
    [['glasscutter'], ['burrow', 'carapace-brace', 'glasscutter'], ['glass-rain', 'molten-tail']]);
  const w = FOES['ashen-warden'];
  const call = w.moves['call-the-watch'].effects.find(e => e.type === 'summon');
  assert.equal(call.family, 'ash-wight');
  assert.equal(call.max, 2);
  assert.ok(w.phases[1].table.some(([, , m]) => m === 'call-the-watch') && w.phases[2].table.some(([, , m]) => m === 'scorch-the-vault'));
});

const SUN_RELICS = {
  25: ['sandwalkers', 'feet', 'boots', 'storm', 'sandwalk'], 26: ['zaras-orrery', 'amulet', 'amulet', 'storm', 'star-reckoning'],
  27: ['wyrmscale', 'offhand', 'shield', 'stone', 'burrow-sense'], 28: ['sunstone-lantern', 'offhand', 'focus', 'ember', 'sunlight'],
  29: ['glass-carapace', 'body', 'plate', 'stone', 'mirror-skin'], 30: ['dunebreaker', 'weapon', 'hammer', 'stone', 'shatter-glass'],
  31: ['cinderfang', 'weapon', 'sword', 'ember', 'melt-glass'], 32: ['mirage-glass', 'amulet', 'amulet', 'frost', 'see-true'],
  33: ['qasims-signet', 'ring', 'ring', 'frost', 'cistern-writ'], 34: ['sunstone-heart', 'amulet', 'amulet', 'ember', 'heartglow'],
  35: ['scorchgate-key', 'ring', 'ring', 'ember', 'ashen-key'], 36: ['ashen-aegis', 'offhand', 'shield', 'ember', 'ash-ward'],
  37: ['cinder-crown', 'head', 'helm', 'ember', 'crown-of-embers'], 38: ['saltglass', 'weapon', 'bow', 'storm', 'longsight'],
};

test('M4 relics: Codex Nos. 25-38 follow the spec table, each with a signature power, lore and a holder or a quest', async () => {
  const { POWERS } = await import('../src/rules/stats.js');
  const QUEST = ['zaras-orrery', 'qasims-signet', 'sunstone-heart'];
  for (const [no, [id, slot, kind, aspect, power]] of Object.entries(SUN_RELICS)) {
    const r = RELICS[id];
    assert.ok(r, id);
    assert.equal(r.codex, +no, id);
    assert.deepEqual([r.slot, r.kind, r.aspect, r.rarity, r.mapPower.id], [slot, kind, aspect, 'heirloom', power], id);
    assert.ok(r.power && POWERS[r.power.id] === r.power, `${id} has a Legend Surge the engine can fire`);
    assert.ok(r.power.text && r.power.effects.length, id);
    assert.ok(r.lore.length > 20 && r.holder, id);
    assert.ok(Object.keys(r.stats).length, `${id} has stats`);
    if (QUEST.includes(id)) assert.equal(r.grip, undefined, `${id} is a quest reward`);
    else assert.ok(r.grip >= 20, `${id} is held with a grip meter`);
    if (slot === 'weapon') assert.match(r.weapon.dice, /^\d+d\d+$/);
  }
  // No. 031 Cinderfang, as the design brief describes it
  const c = RELICS.cinderfang;
  assert.deepEqual([c.weapon.dice, c.weapon.dmg, c.weapon.extra], ['2d8', 'slash', [{ dice: '1d6', aspect: 'ember' }]]);
  assert.equal(c.stats.DEX, 2);
  assert.equal(c.stats.crit, 1, 'crits on 19-20');
  assert.ok(c.weapon.weight < 0 && c.stats.speed > 0, 'acts sooner');
  assert.equal(c.sockets, 2);
  assert.equal(c.power.name, 'Glasscutter');
  assert.equal(c.power.target, 'all-enemies');
  assert.ok(c.power.effects[0].type === 'attack' && c.power.effects[0].weapon && c.power.effects[0].riders.some(x => x.status === 'burning'));
  assert.deepEqual([c.awaken.a.name, c.awaken.b.name], ['Sunmarrow', 'Glassline']);
  assert.equal(c.lore, 'Forged in Scorchgate to kill the dragon that burned it. It failed. It has been warm ever since.');
});

test('M4, M5, M6 and M7 relics: all 75 carry sockets (0-2), three deeds from DEED_IDS and two awakening branches with names and stats', async () => {
  const { DEED_IDS } = await import('../src/data/deeds.js');
  const { POWERS, branchPowerId } = await import('../src/rules/stats.js');
  const STAT_KEYS = new Set([...Object.values(AFFIXES).map(a => a.stat), 'resist', 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
  const HAND_NAMED = ['hearthbrand', 'stillwater-lance', 'cairnmaul', 'cinderfang', 'thornwreath', 'briarfang', 'ichor-mask', 'first-seed', 'glass-carapace', 'ashen-aegis', 'cinder-crown',
    'anvil-heart', 'worldforge-hammer', 'rime-crozier', 'hushweave-cowl', // M5: the Ironspire Champions' pieces
    'lamplighters-lantern', 'mourning-veil', 'corvus-harpoon', 'deep-pearl']; // M6: the Gloomfen Champions' pieces
  const names = new Set();
  const statusRefs = [];
  const walk = effs => { for (const e of effs || []) { if (e.status) statusRefs.push(e.status); walk(e.riders); } };
  for (const r of Object.values(RELICS)) {
    assert.ok(Number.isInteger(r.sockets) && r.sockets >= 0 && r.sockets <= 2, `${r.id} sockets ${r.sockets}`);
    assert.ok(Array.isArray(r.deeds) && r.deeds.length === 3 && new Set(r.deeds).size === 3, `${r.id}: three different deeds`);
    for (const d of r.deeds) assert.ok(DEED_IDS.includes(d), `${r.id}: deed ${d}`);
    assert.deepEqual(Object.keys(r.awaken).sort(), ['a', 'b'], `${r.id} has the Hand and the Heart`);
    for (const k of ['a', 'b']) {
      const b = r.awaken[k];
      assert.ok(typeof b.name === 'string' && b.name.length > 2 && b.text.length > 15, `${r.id}/${k}: a name and a text`);
      assert.ok(b.stats && Object.keys(b.stats).length, `${r.id}/${k}: stats`);
      for (const [stat, v] of Object.entries(b.stats)) {
        assert.ok(STAT_KEYS.has(stat), `${r.id}/${k}: ${stat} is an affix stat key`);
        if (stat === 'resist') for (const [a, pct] of Object.entries(v)) assert.ok(ASPECTS[a] && pct > 0, `${r.id}/${k}: resist ${a}`);
        else assert.ok(Number.isFinite(v) && v !== 0, `${r.id}/${k}: ${stat}`);
      }
      if (b.power) {
        assert.ok(r.power, `${r.id}/${k}: only a relic with a power changes it`);
        assert.ok(!b.power.id && b.power.text && b.power.effects.length, `${r.id}/${k}: a new text and effects under the relic's power`);
        assert.ok(POWERS[branchPowerId(r.id, k)], `${r.id}/${k}: the awakened Surge is registered`);
        walk(b.power.effects);
      }
      names.add(`${r.id}/${b.name}`);
    }
    assert.notEqual(r.awaken.a.name, r.awaken.b.name, r.id);
    if (HAND_NAMED.includes(r.id)) for (const k of ['a', 'b']) assert.doesNotMatch(r.awaken[k].name, /^the [\w'-]+ (Hand|Heart)$/, `${r.id}/${k} is hand-named`);
    else {
      assert.match(r.awaken.a.name, /^the [\w'-]+ Hand$/, `${r.id}: branch a is the Hand`);
      assert.match(r.awaken.b.name, /^the [\w'-]+ Heart$/, `${r.id}: branch b is the Heart`);
    }
  }
  for (const s of statusRefs) assert.ok(STATUSES[s], s);
  assert.equal(names.size, 150); // two named branches for each of the 75 relics
  // M7 (spec §3.4): no Page V relic asks for the Branded deed (no Brand is left to win, M6 review B2)
  for (const r of Object.values(RELICS).filter(r => r.codex === 0 || r.codex > 66)) assert.ok(!r.deeds.includes('brand'), `${r.id} asks for no Brand`);
  // starters and Champion pieces carry two sockets; a key ring with no key has none
  for (const id of HAND_NAMED) assert.equal(RELICS[id].sockets, 2, id);
  assert.equal(RELICS['scorchgate-key'].sockets, 0);
});

test('M4 encounters: the nineteen Sunscorch fights hold the spec\'s spawns and holders, and the Waking climbs them from Waking 2', async () => {
  const { BRANDS } = await import('../src/data/encounters.js');
  const { escalateSpawn, familyOf } = await import('../src/rules/foe.js');
  const SPEC = {
    'sr-skinks': ['sand-skink', 'sand-skink', 'sand-skink'], 'sr-toll': ['dune-raider/rider:sandwalkers', 'dune-raider', 'dune-raider'],
    'dt-skinks': ['sand-skink', 'sand-skink', 'sand-skink', 'sand-skink'], 'dt-scorpions': ['glass-scorpion', 'glass-scorpion'],
    'dt-aqueduct': ['glass-scorpion/matriarch', 'glass-scorpion', 'glass-scorpion'], 'wyrm-lair': ['sand-wyrm'],
    'ds-crew': ['tallyman/foreman:sunstone-lantern', 'smuggler', 'smuggler'], 'ds-scorpions': ['glass-scorpion', 'glass-scorpion', 'sand-skink'],
    'kharzul-heart': ['kharzul'], 'gf-raiders': ['dune-raider', 'dune-raider', 'dune-raider'], 'gf-wisps': ['mirage-wisp', 'mirage-wisp'],
    'gf-caravan': ['tallyman/quartermaster', 'smuggler/sharpshooter:saltglass', 'smuggler'],
    'gnash-camp': ['dune-raider/raider-king:dunebreaker', 'dune-raider', 'dune-raider'],
    'wisp-queen': ['mirage-wisp/queen:mirage-glass', 'mirage-wisp', 'mirage-wisp'], 'sg-wights': ['ash-wight', 'ash-wight', 'ash-wight'],
    'sg-captain': ['ash-wight/captain:scorchgate-key', 'ash-wight', 'ash-wight'], 'tamsin-scorchgate': ['tamsin/$rival:$rival'],
    'vault-guard': ['ash-wight', 'ash-wight', 'ash-wight'], 'ashen-warden': ['ashen-warden'],
  };
  const sun = Object.values(ENCOUNTERS).filter(e => e.region === 'sunscorch' && e.type === 'fight').map(e => e.id).sort();
  assert.deepEqual(sun, Object.keys(SPEC).sort());
  for (const [id, want] of Object.entries(SPEC)) {
    const got = ENCOUNTERS[id].spawns.map(s => `${s.family}${s.variant ? `/${s.variant}` : ''}${s.relic ? `:${s.relic}` : ''}`);
    assert.deepEqual(got, want, id);
    for (const s of ENCOUNTERS[id].spawns) {
      if (s.level === 'party') continue;
      assert.ok(Number.isInteger(s.level) && s.level >= 1, `${id}: a Waking-0 level of at least 1`);
      if (familyOf(s).tier === 'rabble') continue;
      // arrived at Waking 2, met again at Waking 3: the Waking climbs every Sunscorch foe
      const w2 = escalateSpawn(s, 2, id).level, w3 = escalateSpawn(s, 3, id).level;
      assert.ok(w2 >= 10 && w2 <= 16 && w3 > w2, `${id}: level ${w2} at Waking 2, ${w3} at Waking 3`);
    }
  }
  assert.equal(ENCOUNTERS['kharzul-heart'].brand, 'brand-of-glass');
  assert.equal(ENCOUNTERS['ashen-warden'].brand, 'brand-of-ash');
  assert.ok(BRANDS['brand-of-glass'] && BRANDS['brand-of-ash']);
  for (const id of ['ds-crew', 'ds-scorpions', 'vault-guard', 'ashen-warden']) assert.equal(ENCOUNTERS[id].dark, true, `${id} is fought in the dark`);
  const t = ENCOUNTERS['tamsin-scorchgate'];
  assert.deepEqual([t.once, t.duel, t.yields, t.talk], [true, true, 'tamsin-yielded-2', 'tamsin-scorchgate']);
  assert.deepEqual(Object.fromEntries(['partyDelta', 'gearTier', 'lend', 'noWaking'].map(k => [k, t.spawns[0][k]])), { partyDelta: 4, gearTier: 4, lend: true, noWaking: true });
});

test('M4 zones: the five Sunscorch patrol zones pick rabble-only sets, and a patrol stays within reach of a party arriving at Waking 2', async () => {
  const { ZONES } = await import('../src/data/world.js');
  const { PATROLS } = await import('../src/data/encounters.js');
  const { escalateSpawn } = await import('../src/rules/foe.js');
  for (const id of ['sun-road', 'dust-trail', 'deep-shaft', 'glass-flats', 'scorchgate']) {
    const z = ZONES[id];
    assert.ok(z && PATROLS[z.sets]?.length, id);
    assert.ok(Number.isInteger(z.level) && z.level >= 1, `${id} level`);
    for (const set of PATROLS[z.sets]) for (const s of set) assert.equal(FOES[s.family].tier, 'rabble');
    const lvl = escalateSpawn({ ...PATROLS[z.sets][0][0], level: z.level }, 2, id).level;
    assert.ok(lvl >= 10 && lvl <= 17, `${id}: patrols at level ${lvl} on arrival`);
  }
});

// ---- M5 data (spec §2.4, §2.6, §3.2-§3.5; P4) -----------------------------------------------------------

// family -> [tier, kind, aspect]
const IRON_FAMILIES = {
  'rime-wolf': ['rabble', 'beast', 'frost'], brigand: ['rabble', undefined, null], rockling: ['rabble', 'construct', 'stone'],
  'forge-spark': ['rabble', 'construct', 'ember'], 'iron-sentinel': ['veteran', 'construct', 'stone'], forgeborn: ['veteran', 'construct', 'ember'],
  'peak-troll': ['veteran', 'beast', 'stone'], 'rime-wraith': ['veteran', 'undead', 'frost'], 'thunder-roc': ['relic-bearer', 'beast', 'storm'],
  'mother-anvil': ['champion', 'construct', 'ember'], 'rime-abbot': ['champion', 'undead', 'frost'],
};
// variant -> [tier, its own art key, the relic its Art needs (null: none)]
const IRON_VARIANTS = {
  'brigand/warden': ['relic-bearer', 'rhune', 'windstep-boots'], 'iron-sentinel/captain': ['relic-bearer', 'sentinel-captain', 'ironwall'],
  'forgeborn/bellows': ['veteran', 'bellows', null], 'forgeborn/journeyman': ['relic-bearer', 'journeyman', 'runestaff'],
  'peak-troll/old-horn': ['relic-bearer', 'old-horn', 'trollhide-mantle'], 'rime-wraith/abbess': ['relic-bearer', 'drowned-abbess', 'drowned-censer'],
  'rime-wraith/choir': ['veteran', 'choir-wraith', null], 'tallyman/ice-cutter': ['relic-bearer', 'cutter-chief', 'cutters-pick'],
  'smuggler/sawyer': ['rabble', 'sawyer', null], 'brigand/sergeant': ['veteran', undefined, null], // the East Road's sergeant draws as a brigand
};
const movesWith = (moves, pred) => Object.values(moves).filter(m => m.effects.some(e => pred(e) || (e.riders || []).some(pred)));

test('M5 foes: the Ironspire families are real (no scaffold stubs left), with the spec\'s tiers, kinds, aspects and their own art', async () => {
  const { damageMult } = await import('../src/rules/combat.js');
  // M6 (spec §8): no stand-in family is left, the Gloomfen's ten included. STUB from the M7 scaffold: the Hearth Below's
  // eight families are the scaffold's stand-ins until M7 P4 writes them (M7 spec §7); every other family is real. P4
  // removes this list, so the check covers every family again at M7's delivery (M7 spec §8).
  const M7_STUBS = ['cinder-thrall', 'unmade', 'forge-warden', 'hollow-miravel', 'hollow-qasim', 'hollow-brundar', 'hollow-gretch', 'unsmith'];
  assert.ok(Object.values(FOES).every(f => !f.stub || M7_STUBS.includes(f.id)), 'no stub family is left but the M7 scaffold\'s (M6 spec §8)');
  for (const [id, [tier, kind, aspect]] of Object.entries(IRON_FAMILIES)) {
    const f = FOES[id];
    assert.ok(f, id);
    assert.equal(f.id, id);
    assert.deepEqual([f.tier, f.kind, f.aspect], [tier, kind, aspect], `${id}: tier, kind, aspect`);
    assert.equal(f.art, id, `${id} draws as itself`);
    for (const k of ['hp', 'guard', 'atk', 'dmg', 'speed']) assert.ok(Number.isFinite(f[k]) && f[k] > 0, `${id}.${k}`);
    for (const k of ['STR', 'DEX', 'CON', 'WIS']) assert.ok(Number.isFinite(f.saves[k]), `${id} saves ${k}`);
    assert.ok(f.name && f.text.length > 30, `${id} has a name and flavour`);
    for (const [mid, m] of Object.entries(f.moves)) assert.ok(m.name && m.text && m.effects.length, `${id}/${mid}`);
    if (f.humanoid) {
      assert.equal(f.gear.length, 4, `${id}: a gear row per gear tier`);
      for (const row of f.gear) assert.ok(row.some(g => ITEMS[g.base].slot === 'weapon') && row.every(g => ITEMS[g.base]), `${id} gear`);
    }
  }
  // what §3.2 says each one does
  const unit = f => ({ side: 'foe', armor: f.armor, aspect: f.aspect, weak: f.weak || [], resist: f.resist || [], immune: [] });
  assert.ok(movesWith(FOES['rime-wolf'].moves, e => e.status === 'chilled').length && FOES['rime-wolf'].speed >= 14, 'rime wolves are fast and their bite Chills');
  assert.ok(Object.values(FOES.brigand.moves).some(m => m.when?.hpBelow && m.effects.some(e => e.type === 'escape')), 'brigands desert');
  assert.equal(FOES.brigand.humanoid, true);
  assert.ok(movesWith(FOES.rockling.moves, e => e.status === 'staggered').length, 'a rockling rolls into you (Staggered)');
  for (const id of ['rockling', 'iron-sentinel']) assert.ok(damageMult(unit(FOES[id]), 'crush', null) > 1, `${id} is weak to crush`);
  assert.ok(FOES['iron-sentinel'].guard >= 17, 'Iron Sentinels have a high Guard');
  assert.ok(movesWith(FOES.forgeborn.moves, e => e.status === 'burning').length, 'the forgeborn set you Burning');
  assert.ok(movesWith(FOES['peak-troll'].moves, e => e.status === 'regenerating').length, 'peak-trolls regenerate');
  assert.ok(movesWith(FOES['rime-wraith'].moves, e => e.status === 'chilled').length, 'the drowned Chill');
  assert.ok(movesWith(FOES['thunder-roc'].moves, e => e.status === 'swallowed' && e.label === 'Carried off').length, 'the Thunder-Roc carries a hero off');
  for (const id of ['thunder-roc', 'mother-anvil', 'rime-abbot']) assert.equal(FOES[id].unique, true, id);
  assert.deepEqual(FOES['thunder-roc'].relics, ['roc-feather-cloak']);
});

test('M5 variants: every Ironspire holder and Tallyman variant has its own look and uses its relic through requires/fallback', () => {
  for (const [key, [tier, art, relic]] of Object.entries(IRON_VARIANTS)) {
    const [fam, name] = key.split('/');
    const v = FOES[fam].variants?.[name];
    assert.ok(v && v.name && v.moves && v.table, `${key}: name, moves, table`);
    assert.equal(v.tier || FOES[fam].tier, tier, `${key} tier`);
    assert.equal(v.art, art, `${key} art`);
    const arts = Object.values(v.moves).filter(m => m.requires);
    if (!relic) { assert.equal(arts.length, 0, `${key} needs no relic`); continue; }
    assert.ok(RELICS[relic], relic);
    const own = arts.filter(m => m.requires === relic);
    assert.ok(own.length, `${key} has an Art that needs ${relic}`);
    for (const m of own) assert.ok(v.moves[m.fallback] && !v.moves[m.fallback].requires, `${key}: ${m.name} falls back to a plain move`);
    // the Art sits on the d12's high faces, which the disarmed d8 cannot roll
    const faces = v.table.filter(([, , mid]) => v.moves[mid].requires === relic).flatMap(([lo, hi]) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i));
    assert.ok(faces.length && faces.every(n => n > 8), `${key}: the Art is on faces 9-12`);
  }
  // the Bellows blows sparks (at most two); the choir sings the note that Chills everyone
  const blow = Object.values(FOES.forgeborn.variants.bellows.moves).flatMap(m => m.effects).find(e => e.type === 'summon');
  assert.deepEqual([blow.family, blow.max], ['forge-spark', 2]);
  assert.equal(FOES['forge-spark'].tier, 'rabble');
  assert.ok(Object.values(FOES['rime-wraith'].variants.choir.moves).some(m => m.target === 'all-enemies' && m.effects.some(e => e.riders?.some(r => r.status === 'chilled'))));
  // the earlier variants are untouched by M5's additions
  for (const k of ['thief', 'signalmaster', 'counter', 'apothecary', 'foreman', 'quartermaster']) assert.ok(FOES.tallyman.variants[k], `tallyman/${k}`);
  for (const k of ['queen', 'sharpshooter']) assert.ok(FOES.smuggler.variants[k], `smuggler/${k}`);
});

test('M5 Champions: Mother Anvil and the Rime-Abbot fight in the spec\'s three phases, and their Arts need their breakable pieces', () => {
  const PIECES = { 'mother-anvil': ['worldforge-hammer', 'anvil-heart'], 'rime-abbot': ['rime-crozier', 'hushweave-cowl'] };
  const NEEDS = {
    'mother-anvil': { temper: 'anvil-heart', 'anvil-strike': 'worldforge-hammer', 'heart-flare': 'anvil-heart', 'worldforge-blow': 'worldforge-hammer' },
    'rime-abbot': { 'rime-ward': 'rime-crozier', hushing: 'hushweave-cowl' },
  };
  // spec §3.5, phase by phase (each phase may also keep a plain blow on its low faces)
  const PHASES = {
    'mother-anvil': [['hammerfall', 'sparks', 'temper'], ['steam-burst', 'anvil-strike', 'bellows'], ['heart-flare', 'worldforge-blow']],
    'rime-abbot': [['crozier-strike', 'toll', 'rime-ward'], ['drown', 'call-the-choir', 'hushing'], ['heartbeat', 'rime-nova', 'crozier-strike']],
  };
  for (const [id, pieces] of Object.entries(PIECES)) {
    const f = FOES[id];
    assert.deepEqual(f.relics, pieces);
    assert.equal(f.noFlee, true);
    assert.deepEqual(f.phases.map(p => p.at), [1, 0.66, 0.33]);
    f.phases.forEach((ph, i) => {
      assert.ok(ph.text.length > 10);
      const faces = new Set();
      for (const [lo, hi, mid] of ph.table) { assert.ok(f.moves[mid], mid); for (let n = lo; n <= hi; n++) faces.add(n); }
      assert.equal(faces.size, 20, `${id}: every d20 face`);
      const moves = ph.table.map(([, , m]) => m);
      for (const m of PHASES[id][i]) assert.ok(moves.includes(m), `${id} phase ${i + 1} rolls ${m}`);
    });
    for (const [mid, relic] of Object.entries(NEEDS[id])) {
      assert.equal(f.moves[mid].requires, relic, `${id}/${mid}`);
      assert.ok(f.moves[f.moves[mid].fallback] && !f.moves[f.moves[mid].fallback].requires, `${id}/${mid} falls back`);
    }
    for (const r of pieces) assert.ok(Object.values(f.moves).some(m => m.requires === r), `${id}: ${r} powers something`);
  }
  const a = FOES['mother-anvil'];
  assert.equal(a.moves['worldforge-blow'].charge, true);
  assert.equal(a.moves['worldforge-blow'].target, 'enemy');
  assert.deepEqual([a.armor, a.resist, a.weak], ['plate', ['crush'], ['frost']], 'crush-resistant plate, weak to frost');
  const bellows = a.moves.bellows.effects.find(e => e.type === 'summon');
  assert.deepEqual([bellows.family, bellows.max], ['forgeborn', 2]);
  const r = FOES['rime-abbot'];
  assert.equal(r.moves.drown.charge, true);
  assert.ok(r.moves.drown.effects.some(e => e.riders?.some(x => x.status === 'swallowed' && x.label === 'Held under')), 'Drown holds a hero under the ice');
  assert.ok(r.moves.hushing.effects.some(e => e.status === 'charmed' && e.save === 'WIS'), 'Hushing charms one hero');
  const choir = r.moves['call-the-choir'].effects.find(e => e.type === 'summon');
  assert.deepEqual([choir.family, choir.variant, choir.max], ['rime-wraith', 'choir', 2]);
  assert.ok(r.moves.heartbeat.effects.some(e => e.type === 'heal' && e.self) && r.moves.heartbeat.effects.some(e => e.status === 'chilled'), 'Heartbeat heals the Abbot and Chills every hero');
});

test('M5 makes M4\'s approximations exact (spec §2.4): Kharzul burrows, the Sand Wyrm swallows, the wisps charm', () => {
  const k = FOES.kharzul.moves;
  assert.ok(k.burrow.effects.some(e => e.status === 'burrowed' && e.self), 'Kharzul goes under the floor');
  assert.equal(k.burrow.then, 'erupt');
  assert.ok(k.erupt && k.erupt.target !== 'self' && k.erupt.effects.some(e => e.type === 'attack'), 'and comes up under someone');
  assert.ok(FOES.kharzul.phases[1].table.some(([, , m]) => m === 'burrow'), 'It Burrows in its second phase');
  const swallow = FOES['sand-wyrm'].moves.swallow;
  assert.equal(swallow.charge, true);
  assert.ok(swallow.effects.some(e => e.riders?.some(x => x.status === 'swallowed')), 'the Sand Wyrm swallows you whole');
  assert.ok(!swallow.effects.some(e => e.riders?.some(x => x.status === 'rooted')), 'no longer the Rooted stand-in');
  for (const moves of [FOES['mirage-wisp'].moves, FOES['mirage-wisp'].variants.queen.moves]) {
    assert.ok(moves.beguile.effects.some(e => e.status === 'charmed' && e.save === 'WIS'), 'Beguile charms (WIS save)');
    assert.ok(!moves.beguile.effects.some(e => e.status === 'rooted'), 'no longer the Rooted stand-in');
  }
});

// No. -> [id, slot, kind, aspect, map power]
const IRON_RELICS = {
  39: ['windstep-boots', 'feet', 'boots', 'storm', 'windstep'], 40: ['veilbell', 'amulet', 'amulet', 'frost', 'crack-the-ice'],
  41: ['ironwall', 'offhand', 'shield', 'stone', 'iron-stance'], 42: ['drowned-censer', 'offhand', 'focus', 'frost', 'hymn-of-rest'],
  43: ['ironvein-bracers', 'hands', 'gauntlets', 'ember', 'iron-grip'], 44: ['roc-feather-cloak', 'body', 'leather', 'storm', 'roc-glide'],
  45: ['thanes-rune', 'ring', 'ring', 'stone', 'thanes-rune'], 46: ['trollhide-mantle', 'body', 'leather', 'stone', 'snowshoe'],
  47: ['runestaff', 'weapon', 'staff', 'ember', 'rune-reading'], 48: ['anvil-heart', 'amulet', 'amulet', 'ember', 'forge-heat'],
  49: ['worldforge-hammer', 'weapon', 'hammer', 'ember', 'anvil-strike'], 50: ['cutters-pick', 'weapon', 'axe', 'frost', 'ice-bridge'],
  51: ['rime-crozier', 'weapon', 'staff', 'frost', 'rime-light'], 52: ['hushweave-cowl', 'head', 'hood', 'frost', 'hushwalk'],
};
// who holds each (spec §3.4): an encounter's spawn relic, a family's pieces, a worn relic, or a quest
const IRON_HOLDERS = {
  'windstep-boots': 'rp-brigands', ironwall: 'is-sentinels', 'drowned-censer': 'fm-shrine', 'ironvein-bracers': 'tamsin-ironhold',
  'roc-feather-cloak': 'roc-eyrie', 'trollhide-mantle': 'troll-cave', runestaff: 'id-smith', 'anvil-heart': 'mother-anvil',
  'worldforge-hammer': 'mother-anvil', 'cutters-pick': 'fr-cutters', 'rime-crozier': 'rime-abbot', 'hushweave-cowl': 'rime-abbot',
};

test('M5 relics: Codex Nos. 39-52 follow the spec table, each with a Legend Surge, lore, and a holder that carries it or a quest', async () => {
  const { POWERS } = await import('../src/rules/stats.js');
  const { LOCKS } = await import('../src/data/locks.js');
  for (const [no, [id, slot, kind, aspect, power]] of Object.entries(IRON_RELICS)) {
    const r = RELICS[id];
    assert.ok(r, id);
    assert.equal(r.codex, +no, id);
    assert.deepEqual([r.slot, r.kind, r.aspect, r.rarity, r.mapPower.id], [slot, kind, aspect, 'heirloom', power], id);
    assert.ok(r.power && POWERS[r.power.id] === r.power, `${id} has a Legend Surge the engine can fire`);
    assert.ok(r.power.text && r.power.effects.length, id);
    assert.ok(r.lore.length > 40 && r.holder, id);
    assert.ok(Object.keys(r.stats).length, `${id} has stats`);
    if (slot === 'weapon') assert.match(r.weapon.dice, /^\d+d\d+$/);
    if (slot === 'body') assert.ok(r.armor?.base >= 12, `${id} is armour`);
    // held ones have a grip meter and are held; the Veilbell and the Rune-Key are quest gifts; the bracers are worn
    const enc = IRON_HOLDERS[id];
    if (!enc) { assert.equal(r.grip, undefined, `${id} is a quest reward`); continue; }
    const spawns = ENCOUNTERS[enc].spawns;
    if (id === 'ironvein-bracers') { assert.ok(spawns.some(s => s.wears === id) && r.grip === undefined, 'Tamsin wears the Ironvein Bracers'); continue; }
    assert.ok(r.grip >= 24, `${id} is held with a grip meter`);
    assert.ok(spawns.some(s => s.relic === id || (!s.relic && FOES[s.family].relics?.includes(id))), `${enc} holds ${id}`);
  }
  // Nos. 39-52 hold the spec's lock keys (§2.7), where a map power opens a lock
  for (const [lock, keys] of Object.entries({ chasm: ['windstep', 'roc-glide'], ice: ['forge-heat', 'crack-the-ice'], 'rune-seal': ['thanes-rune', 'rune-reading'], drift: ['snowshoe', 'hushwalk'], boulder: ['anvil-strike', 'iron-grip'], darkness: ['rime-light'], 'cold-hearth': ['forge-heat'], stream: ['ice-bridge'] })) {
    for (const k of keys) assert.ok(LOCKS[lock]?.powers.includes(k), `${lock} opens with ${k}`);
  }
  // the Champions' pieces are hand-named, with two sockets (the all-relics test checks the names)
  for (const id of ['anvil-heart', 'worldforge-hammer', 'rime-crozier', 'hushweave-cowl']) assert.equal(RELICS[id].sockets, 2, id);
  assert.match(RELICS['worldforge-hammer'].lore, /Harrow/, 'the Worldforge Hammer is Harrow\'s');
});

test('M5 encounters: the nineteen Ironspire fights (and the East Road\'s three) hold the spec\'s spawns and holders, and the Waking climbs them from Waking 4', async () => {
  const { BRANDS, PATROLS } = await import('../src/data/encounters.js');
  const { escalateSpawn, familyOf } = await import('../src/rules/foe.js');
  const SPEC = {
    'er-wolves': ['rime-wolf', 'rime-wolf', 'rime-wolf'], 'er-toll': ['brigand', 'brigand', 'brigand'], 'er-camp': ['brigand/sergeant', 'brigand', 'brigand'], // the East Road
    'rp-brigands': ['brigand/warden:windstep-boots', 'brigand', 'brigand'], 'rp-rocklings': ['rockling', 'rockling', 'rockling', 'rockling'],
    'rp-wolves': ['rime-wolf', 'rime-wolf', 'rime-wolf'], 'hf-trolls': ['peak-troll', 'peak-troll'], 'roc-eyrie': ['thunder-roc'],
    'is-sentinels': ['iron-sentinel/captain:ironwall', 'iron-sentinel', 'iron-sentinel'], 'is-trolls': ['peak-troll', 'rockling', 'rockling'],
    'troll-cave': ['peak-troll/old-horn:trollhide-mantle', 'peak-troll'], 'tamsin-ironhold': ['tamsin/$rival:ironhold:$rival'],
    'id-forgeborn': ['forgeborn', 'forgeborn', 'forgeborn'], 'id-bellows': ['forgeborn/bellows', 'forgeborn', 'forgeborn'],
    'id-smith': ['forgeborn/journeyman:runestaff', 'forgeborn'], 'mother-anvil': ['mother-anvil'],
    'fr-cutters': ['tallyman/ice-cutter:cutters-pick', 'smuggler/sawyer', 'smuggler/sawyer'], 'fr-wolves': ['rime-wolf', 'rime-wolf', 'rime-wolf', 'rime-wolf'],
    'fm-wraiths': ['rime-wraith', 'rime-wraith', 'rime-wraith'], 'fm-shrine': ['rime-wraith/abbess:drowned-censer', 'rime-wraith/choir', 'rime-wraith/choir'],
    'fb-choir': ['rime-wraith/choir', 'rime-wraith/choir', 'rime-wraith/choir'], 'rime-abbot': ['rime-abbot'],
  };
  // the Frost half is met after the Brand of Iron (Waking 5), the rest on arrival (Waking 4)
  const FROST = new Set(['fr-cutters', 'fr-wolves', 'fm-wraiths', 'fm-shrine', 'fb-choir', 'rime-abbot']);
  const iron = Object.values(ENCOUNTERS).filter(e => e.region === 'ironspire' && e.type === 'fight').map(e => e.id).sort();
  assert.deepEqual(iron, Object.keys(SPEC).sort());
  for (const [id, want] of Object.entries(SPEC)) {
    const got = ENCOUNTERS[id].spawns.map(s => `${s.family}${s.variant ? `/${s.variant}` : ''}${s.relic ? `:${s.relic}` : ''}`);
    assert.deepEqual(got, want, id);
    for (const s of ENCOUNTERS[id].spawns) {
      if (s.level === 'party') continue;
      assert.ok(Number.isInteger(s.level) && s.level >= 1, `${id}: a Waking-0 level of at least 1`);
      const w = FROST.has(id) ? 5 : 4;
      const lvl = escalateSpawn(s, w, id).level;
      if (familyOf(s).tier === 'rabble') {
        assert.equal(s.wakeLevels, undefined, `${id}: rabble climb the usual 2 a Waking`);
        assert.ok(lvl >= 18 && lvl <= 28, `${id}: rabble at level ${lvl} at Waking ${w}`);
        continue;
      }
      // every Ironspire foe that is not rabble climbs 4 levels a Waking (IRON), and is met near the party's level
      assert.equal(s.wakeLevels, 4, `${id}: an IRON spawn`);
      assert.ok(lvl >= 18 && lvl <= 30 && escalateSpawn(s, w + 1, id).level === lvl + 4, `${id}: level ${lvl} at Waking ${w}`);
    }
  }
  assert.equal(ENCOUNTERS['mother-anvil'].brand, 'brand-of-iron');
  assert.equal(ENCOUNTERS['rime-abbot'].brand, 'brand-of-frost');
  assert.ok(BRANDS['brand-of-iron'] && BRANDS['brand-of-frost']);
  for (const id of ['id-forgeborn', 'id-bellows', 'id-smith', 'fb-choir', 'rime-abbot']) assert.equal(ENCOUNTERS[id].dark, true, `${id} is fought in the dark`);
  for (const id of ['mother-anvil', 'fm-wraiths', 'fm-shrine', 'rp-brigands']) assert.ok(!ENCOUNTERS[id].dark, `${id} is not dark`);
  const t = ENCOUNTERS['tamsin-ironhold'];
  assert.deepEqual([t.once, t.duel, t.yields, t.talk], [true, true, 'tamsin-yielded-3', 'tamsin-ironhold']);
  assert.deepEqual(Object.fromEntries(['partyDelta', 'gearTier', 'lend', 'noWaking', 'wears', 'variant', 'relic'].map(k => [k, t.spawns[0][k]])),
    { partyDelta: 4, gearTier: 4, lend: true, noWaking: true, wears: 'ironvein-bracers', variant: '$rival:ironhold', relic: '$rival' });
  // the Ironspire patrol sets (spec §2.6): rabble only, of the families the spec names
  const SETS = { 'rockslide-pass': ['rime-wolf', 'brigand'], highfold: ['rime-wolf', 'rockling'], 'iron-stair': ['rockling', 'brigand'], deeps: ['rockling', 'forge-spark'], 'frost-road': ['rime-wolf', 'brigand'], frostmere: ['rime-wolf', 'rockling'] };
  for (const [k, fams] of Object.entries(SETS)) {
    const got = new Set(PATROLS[k].flat().map(s => s.family));
    assert.deepEqual([...got].sort(), [...fams].sort(), `${k} patrols`);
    for (const s of PATROLS[k].flat()) assert.equal(FOES[s.family].tier, 'rabble');
  }
});

// ---- M6 data (spec §2.6, §2.7, §3.2-§3.5; P4) -----------------------------------------------------------

// family -> [tier, kind, aspect]
const GLOOM_FAMILIES = {
  'mire-leech': ['rabble', 'beast', 'blight'], 'marsh-light': ['rabble', 'spirit', 'radiant'], 'lamp-moth': ['rabble', 'beast', 'radiant'],
  'blackwater-gar': ['rabble', 'beast', 'tide'], 'bog-hag': ['veteran', undefined, 'blight'], 'willow-wight': ['veteran', 'plant', 'verdant'],
  drowned: ['veteran', 'undead', 'tide'], hodge: ['relic-bearer', undefined, null], 'lantern-mother': ['champion', 'undead', 'radiant'],
  'blackwater-leviathan': ['champion', 'beast', 'tide'],
};
// variant -> [tier, its own art key (spec §3.2's "Art keys"), the relic its Art needs (null: none)]
const GLOOM_VARIANTS = {
  'blackwater-gar/old-jaws': ['relic-bearer', 'old-jaws', 'gar-tooth'], 'bog-hag/grue': ['relic-bearer', 'mother-grue', 'hag-stone'],
  'willow-wight/grandfather': ['relic-bearer', 'grandfather-willow', 'weeping-bow'], 'drowned/bell-ringer': ['veteran', 'bell-ringer', null],
  'drowned/choir': ['veteran', 'drowned-choir', null], 'drowned/cantor': ['relic-bearer', 'drowned-cantor', 'cantors-staff'],
  'tallyman/salvage-master': ['relic-bearer', 'salvage-master', 'salvagers-helm'], 'tallyman/bargemaster': ['relic-bearer', 'bargemaster', 'barge-gauntlets'],
  'smuggler/reedcutter': ['rabble', 'reedcutter', null], 'smuggler/diver': ['rabble', 'salvage-diver', null], 'smuggler/bargehand': ['rabble', 'bargehand', null],
};

test('M6 foes: the ten Gloomfen families are real, with the spec\'s tiers, kinds and aspects, their own art, and what §3.2 says they do', async () => {
  const { damageMult } = await import('../src/rules/combat.js');
  for (const [id, [tier, kind, aspect]] of Object.entries(GLOOM_FAMILIES)) {
    const f = FOES[id];
    assert.ok(f && !f.stub, `${id} is real`);
    assert.equal(f.id, id);
    assert.deepEqual([f.tier, f.kind, f.aspect], [tier, kind, aspect], `${id}: tier, kind, aspect`);
    assert.equal(f.art, id, `${id} draws as itself`);
    for (const k of ['hp', 'guard', 'atk', 'dmg', 'speed']) assert.ok(Number.isFinite(f[k]) && f[k] > 0, `${id}.${k}`);
    for (const k of ['STR', 'DEX', 'CON', 'WIS']) assert.ok(Number.isFinite(f.saves[k]), `${id} saves ${k}`);
    assert.ok(f.name && f.text.length > 30, `${id} has a name and flavour`);
    for (const [mid, m] of Object.entries(f.moves)) assert.ok(m.name && m.text && m.effects.length, `${id}/${mid}`);
    for (const m of Object.values(f.moves)) if (m.fallback) assert.ok(f.moves[m.fallback] && !f.moves[m.fallback].requires, `${id}: ${m.name} falls back to a plain move`);
  }
  // humanoid families show gear tiers 0-3 (spec §3.2): the bog-hags, Hodge and the Tallymen
  for (const id of ['bog-hag', 'hodge', 'tallyman', 'smuggler']) {
    const f = FOES[id];
    assert.equal(f.humanoid, true, `${id} is humanoid`);
    assert.equal(f.gear.length, 4, `${id}: a gear row per gear tier`);
    for (const row of f.gear) assert.ok(row.some(g => ITEMS[g.base].slot === 'weapon') && row.every(g => ITEMS[g.base]), `${id} gear`);
  }
  const unit = f => ({ side: 'foe', armor: f.armor, aspect: f.aspect, weak: f.weak || [], resist: f.resist || [], immune: [] });
  const has = (id, pred, moves = FOES[id].moves) => movesWith(moves, pred).length > 0;
  // the leech latches on (Bleeding) and drinks (it heals itself), and lets go when it is hurt
  assert.ok(has('mire-leech', e => e.status === 'bleeding'), 'a leech latches on: Bleeding');
  assert.ok(Object.values(FOES['mire-leech'].moves).some(m => m.effects.some(e => e.type === 'damage') && m.effects.some(e => e.type === 'heal' && e.self)), 'a leech drinks, and heals');
  // the lights Lure (charmed, WIS) and Flicker (Guarding); the moths throw dust in your eyes (Frightened, DEX)
  assert.ok(has('marsh-light', e => e.status === 'charmed' && e.save === 'WIS') && has('marsh-light', e => e.status === 'guarding'), 'Lure and Flicker');
  assert.ok(has('lamp-moth', e => e.status === 'frightened' && e.save === 'DEX'), 'dust in the eyes');
  // the gars leap from the channel; the hags Hex, Rot and Stir the Pot for a friend; the willows Lash and Weep
  assert.ok(Object.values(FOES['blackwater-gar'].moves).some(m => m.charge), 'a gar leaps (a charging move)');
  assert.ok(has('bog-hag', e => e.status === 'hexed') && has('bog-hag', e => e.status === 'rotting'), 'the hags Hex and Rot');
  assert.ok(Object.values(FOES['bog-hag'].moves).some(m => m.target === 'ally' && m.effects.some(e => e.type === 'heal')), 'Stir the Pot heals a friend');
  assert.ok(has('willow-wight', e => e.status === 'rooted') && has('willow-wight', e => e.status === 'regenerating'), 'Lash roots, Weep regenerates');
  // the drowned Drag Down (Rooted and Chilled), Toll (Frightened), and their black water Rots
  const drag = FOES.drowned.moves['drag-down'].effects[0].riders.map(r => r.status);
  assert.deepEqual(drag, ['rooted', 'chilled'], 'Drag Down roots and chills');
  assert.ok(has('drowned', e => e.status === 'frightened' && e.save === 'WIS') && has('drowned', e => e.status === 'rotting'), 'Toll, and the black water');
  // weak and resist: the Lantern Mother is weak to tide (a neutral match on the wheel), the Leviathan to storm (the wheel)
  assert.ok(damageMult(unit(FOES['lantern-mother']), 'tide', 'tide') >= 1.5, 'the Lantern Mother is weak to tide');
  assert.ok(damageMult(unit(FOES['blackwater-leviathan']), 'storm', 'storm') >= 1.5, 'the Leviathan is weak to storm');
  for (const id of ['hodge', 'lantern-mother', 'blackwater-leviathan']) assert.equal(FOES[id].unique, true, id);
  // the Tallymen reuse their M3 families; the Murkway's pack reuses the boglurcher
  assert.equal(FOES.boglurcher.tier, 'rabble');
});

test('M6 variants: Old Jaws, Mother Grue, Grandfather Willow, the drowned, and the Tallymen of the fen draw as their own art keys and use their relics through requires/fallback', () => {
  for (const [key, [tier, art, relic]] of Object.entries(GLOOM_VARIANTS)) {
    const [fam, name] = key.split('/');
    const v = FOES[fam].variants?.[name];
    assert.ok(v && v.name && v.moves && v.table, `${key}: name, moves, table`);
    assert.equal(v.tier || FOES[fam].tier, tier, `${key} tier`);
    assert.equal(v.art, art, `${key} art`);
    const arts = Object.values(v.moves).filter(m => m.requires);
    if (!relic) { assert.equal(arts.length, 0, `${key} needs no relic`); continue; }
    assert.ok(RELICS[relic], relic);
    const own = arts.filter(m => m.requires === relic);
    assert.ok(own.length, `${key} has an Art that needs ${relic}`);
    for (const m of own) assert.ok(v.moves[m.fallback] && !v.moves[m.fallback].requires, `${key}: ${m.name} falls back to a plain move`);
    // the Art sits on the d12's high faces, which the disarmed d8 cannot roll
    const faces = v.table.filter(([, , mid]) => v.moves[mid].requires === relic).flatMap(([lo, hi]) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i));
    assert.ok(faces.length && faces.every(n => n > 8), `${key}: the Art is on faces 9-12`);
  }
  // the choir sings the hymn (Hexed) and the Cantor beats time for it; the bell-ringers' Peal is heard by everyone
  const choir = FOES.drowned.variants.choir.moves['the-hymn'];
  assert.ok(choir.target === 'all-enemies' && choir.effects.some(e => e.status === 'hexed' && e.save === 'WIS'), 'the hymn hexes');
  assert.ok(FOES.drowned.variants.cantor.moves['beat-time'].target === 'all-allies', 'the Cantor beats time for his choir');
  assert.equal(FOES.drowned.variants['bell-ringer'].moves.peal.target, 'all-enemies');
  // the earlier variants are untouched by M6's additions
  for (const k of ['thief', 'signalmaster', 'counter', 'apothecary', 'foreman', 'quartermaster', 'ice-cutter']) assert.ok(FOES.tallyman.variants[k], `tallyman/${k}`);
  for (const k of ['queen', 'sharpshooter', 'sawyer']) assert.ok(FOES.smuggler.variants[k], `smuggler/${k}`);
});

test('M6 Champions: the Lantern Mother and the Blackwater Leviathan fight in the spec\'s three phases, and their pieces shut their moves down', () => {
  const PIECES = { 'lantern-mother': ['lamplighters-lantern', 'mourning-veil'], 'blackwater-leviathan': ['corvus-harpoon', 'deep-pearl'] };
  const NEEDS = {
    'lantern-mother': { lure: 'lamplighters-lantern', 'lantern-nova': 'lamplighters-lantern', mourning: 'mourning-veil' },
    'blackwater-leviathan': { 'harpoon-rage': 'corvus-harpoon', 'pearl-light': 'deep-pearl' },
  };
  // spec §3.5, phase by phase (each phase may also keep a plain blow on its low faces)
  const PHASES = {
    'lantern-mother': [['lure', 'lantern-flare', 'hush-now'], ['lead-them-down', 'moths', 'mourning'], ['snuff', 'lantern-nova', 'drown-the-light']],
    'blackwater-leviathan': [['coil', 'tail-slap', 'sound'], ['swallow', 'undertow', 'harpoon-rage'], ['pearl-light', 'flood', 'swallow']],
  };
  for (const [id, pieces] of Object.entries(PIECES)) {
    const f = FOES[id];
    assert.deepEqual(f.relics, pieces);
    assert.equal(f.noFlee, true);
    assert.deepEqual(f.phases.map(p => p.at), [1, 0.66, 0.33]);
    f.phases.forEach((ph, i) => {
      assert.ok(ph.text.length > 10);
      const faces = new Set();
      for (const [lo, hi, mid] of ph.table) { assert.ok(f.moves[mid], mid); for (let n = lo; n <= hi; n++) faces.add(n); }
      assert.equal(faces.size, 20, `${id}: every d20 face`);
      const moves = ph.table.map(([, , m]) => m);
      for (const m of PHASES[id][i]) assert.ok(moves.includes(m), `${id} phase ${i + 1} rolls ${m}`);
    });
    for (const [mid, relic] of Object.entries(NEEDS[id])) {
      assert.equal(f.moves[mid].requires, relic, `${id}/${mid}`);
      assert.ok(f.moves[f.moves[mid].fallback] && !f.moves[f.moves[mid].fallback].requires, `${id}/${mid} falls back`);
    }
    for (const r of pieces) assert.ok(Object.values(f.moves).some(m => m.requires === r), `${id}: ${r} powers something`);
  }
  const m = FOES['lantern-mother'].moves;
  assert.ok(m.lure.effects.some(e => e.status === 'charmed' && e.save === 'WIS'), 'Lure charms one hero (WIS)');
  assert.ok(m['lantern-flare'].target === 'all-enemies' && m['lantern-flare'].effects.some(e => e.type === 'damage' && e.aspect === 'radiant' && e.save === 'DEX'), 'Lantern Flare: radiant to every hero, DEX for half');
  assert.ok(m['hush-now'].target === 'all-enemies' && m['hush-now'].effects.some(e => e.status === 'hexed' && e.save === 'WIS'), 'Hush Now: WIS or Hexed');
  assert.equal(m['lead-them-down'].charge, true);
  assert.ok(m['lead-them-down'].effects.some(e => e.status === 'swallowed' && e.label === 'Led away'), 'Lead Them Down: led away');
  const moths = m.moths.effects.find(e => e.type === 'summon');
  assert.deepEqual([moths.family, moths.max], ['lamp-moth', 2], 'Moths: a lamp-moth, two at most');
  assert.ok(m.mourning.target === 'all-enemies' && ['frightened', 'rotting'].every(st => m.mourning.effects.some(e => e.status === st)), 'Mourning: Frightened and Rotting');
  assert.ok(m.snuff.effects.some(e => e.status === 'exposed'), 'Snuff: Exposed');
  assert.ok(m['lantern-nova'].effects.some(e => e.aspect === 'radiant' && e.riders?.some(r => r.status === 'burning')), 'Lantern Nova burns');
  assert.equal(m['drown-the-light'].charge, true);
  const v = FOES['blackwater-leviathan'].moves;
  assert.ok(v.coil.effects.some(e => e.kind === 'crush' && e.riders?.some(r => r.status === 'rooted')), 'Coil: crushing, Rooted');
  assert.ok(v.sound.effects.some(e => e.status === 'burrowed' && e.self) && v.sound.then === 'breach', 'Sound: it dives, then breaches');
  assert.ok(v.breach.target === 'enemy' && v.breach.effects.some(e => e.aspect === 'tide' && e.riders?.some(r => r.status === 'staggered')), 'Breach: under one hero, Staggered');
  assert.equal(v.swallow.charge, true);
  assert.ok(v.swallow.effects.some(e => e.riders?.some(r => r.status === 'swallowed' && r.label === 'Swallowed whole')), 'Swallow: swallowed whole');
  assert.ok(v.undertow.effects.some(e => e.save === 'STR' && ['rooted', 'chilled'].every(st => e.riders?.some(r => r.status === st))), 'Undertow: STR or Rooted and Chilled');
  assert.equal(v['harpoon-rage'].effects.filter(e => e.type === 'attack').length, 2, 'Harpoon Rage: two Coils in one turn');
  assert.ok(v['pearl-light'].effects.some(e => e.type === 'heal') && v['pearl-light'].effects.some(e => e.status === 'warded'), 'Pearl-Light heals and Wards');
  assert.ok(v.flood.target === 'all-enemies' && v.flood.effects.some(e => e.save === 'DEX'), 'Flood: every hero, DEX for half');
});

test('M6 Hodge: party level + 6 and three Omens with Frenzied among them; Toll Is Due opens, Bridge Troll, the Cane, the Clipped Coin; he sits down at 0 HP and keeps his toll unless it is pried loose', () => {
  const h = FOES.hodge;
  assert.deepEqual(h.relics, ['unfair-toll']);
  assert.equal(h.opener, 'toll-is-due', 'his first move in every fight');
  const toll = h.moves['toll-is-due'];
  assert.equal(toll.target, 'strongest', 'the strongest hero');
  assert.ok(toll.effects.some(e => e.type === 'delay' && e.save === 'CHA' && (e.turns || 1) === 1), 'a CHA save or the next turn comes a whole turn later');
  assert.ok(!h.table.some(([, , mid]) => mid === 'toll-is-due'), 'only as his opener');
  assert.equal(h.moves['bridge-troll'].charge, true);
  assert.ok(h.moves['bridge-troll'].effects.some(e => e.riders?.some(r => r.status === 'swallowed' && r.label === 'In the river')), 'shoved off the bridge: in the river');
  const cane = h.moves['old-mans-cane'].effects[0];
  assert.deepEqual([cane.dice, cane.kind, cane.riders.map(r => r.status)], ['2d10', 'crush', ['staggered']], 'Old Man\'s Cane: 2d10 crushing, Staggered');
  const coin = h.moves['clipped-coin'];
  assert.equal(coin.requires, 'unfair-toll');
  assert.equal(coin.effects.filter(e => e.type === 'attack').length, 2, 'heads: he hits twice');
  assert.ok(h.moves[coin.fallback] && !h.moves[coin.fallback].requires);
  assert.ok(typeof h.koText === 'string' && /stool/.test(h.koText), 'he never dies: he sits down on his stool and says so');
  assert.equal(h.keepsRelics, true, 'his toll comes loose only by grip');
  assert.ok(!Object.values(h.moves).some(m => m.effects.some(e => e.type === 'escape')), 'he never flees');
  const e = ENCOUNTERS.hodge;
  assert.deepEqual([e.once, e.talk, e.region, e.backdrop], [true, 'hodge-toll', 'gloomfen', 'rotbridge']);
  const [sp] = e.spawns;
  assert.deepEqual([sp.family, sp.level, sp.partyDelta, sp.noWaking, sp.relic], ['hodge', 'party', 6, true, 'unfair-toll'], 'party level + 6, and the Waking does not add to it');
  assert.equal(sp.omens.length, 3);
  assert.ok(sp.omens.includes('frenzied') && !sp.omens.includes('twinned'), 'Frenzied among them, never Twinned');
});

// No. -> [id, slot, kind, aspect, map power]
const GLOOM_RELICS = {
  53: ['unfair-toll', 'amulet', 'amulet', 'tide', 'hodges-ferry'], 54: ['bogstriders', 'feet', 'boots', 'verdant', 'bogstride'],
  55: ['weeping-bow', 'weapon', 'bow', 'verdant', 'willow-weep'], 56: ['willow-ward', 'offhand', 'shield', 'verdant', 'ward-song'],
  57: ['hag-stone', 'ring', 'ring', 'blight', 'hag-sight'], 58: ['lamplighters-lantern', 'offhand', 'focus', 'radiant', 'mothers-light'],
  59: ['mourning-veil', 'head', 'hood', 'tide', 'mourners-path'], 60: ['salvagers-helm', 'head', 'helm', 'tide', 'deep-breath'],
  61: ['cantors-staff', 'weapon', 'staff', 'tide', 'still-song'], 62: ['gar-tooth', 'weapon', 'dagger', 'tide', 'gar-current'],
  63: ['barge-gauntlets', 'hands', 'gauntlets', 'stone', 'haul'], 64: ['corvus-harpoon', 'weapon', 'spear', 'tide', 'harpoon-line'],
  65: ['deep-pearl', 'amulet', 'amulet', 'tide', 'pearl-light'], 66: ['hexbane-shawl', 'body', 'robe', 'blight', 'hexbane'],
};
// who holds each (spec §3.4): an encounter's spawn relic, a family's pieces, a worn relic, or a quest (null)
const GLOOM_HOLDERS = {
  'unfair-toll': 'hodge', bogstriders: 'tamsin-rotbridge', 'weeping-bow': 'wm-willow', 'willow-ward': null, 'hag-stone': 'grue-hollow',
  'lamplighters-lantern': 'lantern-mother', 'mourning-veil': 'lantern-mother', 'salvagers-helm': 'mh-salvage', 'cantors-staff': 'cantor',
  'gar-tooth': 'old-jaws', 'barge-gauntlets': 'tf-bargemaster', 'corvus-harpoon': 'blackwater-leviathan', 'deep-pearl': 'blackwater-leviathan', 'hexbane-shawl': null,
};

test('M6 relics: Codex Nos. 53-66 follow the spec table, each with a Legend Surge, lore, and a holder that carries it or a quest', async () => {
  const { POWERS } = await import('../src/rules/stats.js');
  const { LOCKS } = await import('../src/data/locks.js');
  for (const [no, [id, slot, kind, aspect, power]] of Object.entries(GLOOM_RELICS)) {
    const r = RELICS[id];
    assert.ok(r, id);
    assert.equal(r.codex, +no, id);
    assert.deepEqual([r.slot, r.kind, r.aspect, r.rarity, r.mapPower.id], [slot, kind, aspect, 'heirloom', power], id);
    assert.ok(r.power && POWERS[r.power.id] === r.power, `${id} has a Legend Surge the engine can fire`);
    assert.ok(r.power.text && r.power.effects.length, id);
    assert.ok(r.lore.length > 40 && r.holder, id);
    assert.ok(Object.keys(r.stats).length, `${id} has stats`);
    assert.ok(r.ilvl >= 20, `${id}: a notch above Page III`);
    if (slot === 'weapon') assert.match(r.weapon.dice, /^\d+d\d+$/);
    if (slot === 'body') assert.ok(r.armor?.base >= 12, `${id} is armour`);
    const enc = GLOOM_HOLDERS[id];
    if (enc === null) { assert.equal(r.grip, undefined, `${id} is a quest reward`); continue; }
    const spawns = ENCOUNTERS[enc].spawns;
    if (id === 'bogstriders') { assert.ok(spawns.some(s => s.wears === id) && r.grip === undefined, 'Tamsin wears the Bogstriders'); continue; }
    assert.ok(r.grip >= 24, `${id} is held with a grip meter`);
    assert.ok(spawns.some(s => s.relic === id || (!s.relic && FOES[s.family].relics?.includes(id))), `${enc} holds ${id}`);
  }
  // Nos. 53-66 hold the spec's lock keys (§2.7), where a map power opens a lock (the new locks and five older ones)
  const KEYS = {
    bog: ['bogstride', 'mourners-path'], fog: ['mothers-light', 'hag-sight', 'still-song'], blackwater: ['hodges-ferry', 'harpoon-line', 'deep-breath'],
    'witch-ward': ['ward-song', 'hag-sight', 'hexbane'], darkness: ['mothers-light', 'pearl-light'], mirage: ['hag-sight'], stream: ['gar-current'], boulder: ['haul'], bramble: ['willow-weep'],
  };
  for (const [lock, keys] of Object.entries(KEYS)) for (const k of keys) assert.ok(LOCKS[lock]?.powers.includes(k), `${lock} opens with ${k}`);
  // the Champions' four pieces are hand-named, with two sockets (the all-relics test checks the names)
  for (const id of ['lamplighters-lantern', 'mourning-veil', 'corvus-harpoon', 'deep-pearl']) assert.equal(RELICS[id].sockets, 2, id);
  // Hodge's Unfair Toll: "+2 CHA", its Surge "Heads I Win" (every foe pays: a turn later, no save: it is always heads), the brief's line
  const t = RELICS['unfair-toll'];
  assert.equal(t.stats.CHA, 2);
  assert.equal(t.power.name, 'Heads I Win');
  assert.equal(t.power.target, 'all-enemies');
  assert.ok(t.power.effects.some(e => e.type === 'delay' && !e.save), 'a clipped coin always comes up Hodge');
  assert.equal(t.lore, 'Hodge charges what he likes. Now so do you.');
  assert.match(RELICS['corvus-harpoon'].lore, /Corvus/, 'Corvus\'s harpoon is his');
});

test('M6 encounters: the twenty-five Gloomfen fights hold the spec\'s spawns and holders, fight on their maps\' backdrops, and the Waking climbs them from Waking 6', async () => {
  const { BRANDS, PATROLS, BACKDROPS: BDS } = await import('../src/data/encounters.js');
  const { ZONES, GLOOM_PATH, GLOOM_LEADS } = await import('../src/data/world.js');
  const { escalateSpawn, familyOf } = await import('../src/rules/foe.js');
  const { condErrors } = await import('../src/rules/cond.js');
  // [map, spawns (lead first)] as spec §3.3 lists them
  const SPEC = {
    'mk-leeches': ['murkway', 'mire-leech', 'mire-leech', 'mire-leech'], 'mk-reedcutters': ['murkway', 'smuggler/reedcutter', 'smuggler/reedcutter', 'tallyman'],
    'mk-bogfolk': ['murkway', 'boglurcher', 'boglurcher', 'boglurcher'], 'wm-wights': ['willowmurk', 'willow-wight', 'willow-wight'],
    'wm-willow': ['willowmurk', 'willow-wight/grandfather:weeping-bow', 'willow-wight'], hodge: ['rotbridge', 'hodge:unfair-toll'],
    'tamsin-rotbridge': ['rotbridge', 'tamsin/$rival:rotbridge:$rival'], 'rb-gars': ['rotbridge', 'blackwater-gar', 'blackwater-gar', 'blackwater-gar'],
    'lf-moths': ['lanternfen', 'lamp-moth', 'lamp-moth', 'lamp-moth', 'lamp-moth'], 'lf-hags': ['lanternfen', 'bog-hag', 'bog-hag', 'mire-leech'],
    'lf-lights': ['lanternfen', 'marsh-light', 'marsh-light', 'marsh-light'], 'grue-hollow': ['lanternfen', 'bog-hag/grue:hag-stone', 'bog-hag'],
    'lantern-mother': ['mothers-hollow', 'lantern-mother'], 'lb-drowned': ['long-boardwalk', 'drowned', 'drowned', 'drowned'],
    'lb-lights': ['long-boardwalk', 'marsh-light', 'marsh-light', 'lamp-moth', 'lamp-moth'],
    'mh-salvage': ['misthollow', 'tallyman/salvage-master:salvagers-helm', 'smuggler/diver', 'smuggler/diver'],
    'mh-ringers': ['misthollow', 'drowned/bell-ringer', 'drowned/bell-ringer', 'drowned/bell-ringer'],
    'db-choir': ['drowned-belfry', 'drowned/choir', 'drowned/choir', 'drowned/choir'], cantor: ['drowned-belfry', 'drowned/cantor:cantors-staff', 'drowned/choir', 'drowned/choir'],
    'br-barge': ['blackwater-reach', 'smuggler/bargehand', 'smuggler/bargehand', 'smuggler/bargehand'], 'br-gars': ['blackwater-reach', 'blackwater-gar', 'blackwater-gar', 'blackwater-gar'],
    'old-jaws': ['blackwater-reach', 'blackwater-gar/old-jaws:gar-tooth', 'blackwater-gar', 'blackwater-gar'],
    'tf-bargemaster': ['tidal-flats', 'tallyman/bargemaster:barge-gauntlets', 'smuggler/bargehand', 'smuggler/bargehand'],
    'blackwater-leviathan': ['tidal-flats', 'blackwater-leviathan'], 'cw-lights': ['causeway', 'marsh-light', 'marsh-light', 'mire-leech'],
  };
  // met after the Brand of Lanterns (Waking 7): the long boardwalk and everything past it; the causeway after the Deep (8)
  const DEEP = new Set(['lb-drowned', 'lb-lights', 'mh-salvage', 'mh-ringers', 'db-choir', 'cantor', 'br-barge', 'br-gars', 'old-jaws', 'tf-bargemaster', 'blackwater-leviathan']);
  const gloom = Object.values(ENCOUNTERS).filter(e => e.region === 'gloomfen' && e.type === 'fight').map(e => e.id).sort();
  assert.deepEqual(gloom, Object.keys(SPEC).sort());
  for (const [id, [map, ...want]] of Object.entries(SPEC)) {
    const e = ENCOUNTERS[id];
    const got = e.spawns.map(s => `${s.family}${s.variant ? `/${s.variant}` : ''}${s.relic ? `:${s.relic}` : ''}`);
    assert.deepEqual(got, want, id);
    assert.equal(e.backdrop, map, `${id} fights on its map's backdrop (spec §6.2)`);
    assert.ok(BDS.includes(map), `${map} is a listed backdrop`);
    for (const s of e.spawns) {
      if (s.level === 'party') continue;
      assert.ok(Number.isInteger(s.level) && s.level >= 1, `${id}: a Waking-0 level of at least 1`);
      const w = id === 'cw-lights' ? 8 : DEEP.has(id) ? 7 : 6;
      const x = escalateSpawn(s, w, id);
      assert.ok(x.omens.length <= 3, `${id}: at most three Waking Omens`);
      if (familyOf(s).unique || s.relic) assert.ok(!x.omens.includes('twinned'), `${id}: a unique foe or a holder is never Twinned`);
      if (familyOf(s).tier === 'rabble') {
        assert.equal(s.wakeLevels, undefined, `${id}: rabble climb the usual 2 a Waking`);
        assert.ok(x.level >= 26 && x.level <= 34, `${id}: rabble at level ${x.level} at Waking ${w}`);
        continue;
      }
      // every Gloomfen foe that is not rabble climbs 4 levels a Waking (GLOOM), and is met near the party's level
      assert.equal(s.wakeLevels, 4, `${id}: a GLOOM spawn`);
      assert.ok(x.level >= 28 && x.level <= 38 && escalateSpawn(s, w + 1, id).level === x.level + 4, `${id}: level ${x.level} at Waking ${w}`);
    }
  }
  // the named lair holders and the Champions carry chosen Omens (never Twinned)
  for (const id of ['wm-willow', 'grue-hollow', 'lantern-mother', 'cantor', 'old-jaws', 'blackwater-leviathan', 'mh-salvage', 'tf-bargemaster']) {
    const lead = ENCOUNTERS[id].spawns[0];
    assert.equal(lead.wakeOmenCap, 0, `${id}: chosen Omens`);
    assert.ok(lead.omens.length && !lead.omens.includes('twinned'), id);
  }
  assert.equal(ENCOUNTERS['lantern-mother'].brand, 'brand-of-lanterns');
  assert.equal(ENCOUNTERS['blackwater-leviathan'].brand, 'brand-of-the-deep');
  assert.ok(BRANDS['brand-of-lanterns'] && BRANDS['brand-of-the-deep']);
  for (const id of ['lantern-mother', 'db-choir', 'cantor']) assert.equal(ENCOUNTERS[id].dark, true, `${id} is fought in the dark`);
  for (const id of ['blackwater-leviathan', 'mh-salvage', 'wm-willow', 'hodge']) assert.ok(!ENCOUNTERS[id].dark, `${id} is not dark`);
  // every Gloomfen Hearthfire rests on its map's backdrop too
  for (const e of Object.values(ENCOUNTERS).filter(x => x.region === 'gloomfen' && x.type === 'hearthfire')) assert.ok(BDS.includes(e.backdrop), e.id);
  // Tamsin at Rotbridge (spec §3.5): her fourth duel, her Rotbridge kit, the Bogstriders; gone for good after her fall
  const t = ENCOUNTERS['tamsin-rotbridge'];
  assert.deepEqual([t.once, t.duel, t.yields, t.talk], [true, true, 'tamsin-yielded-4', 'tamsin-rotbridge']);
  assert.deepEqual(Object.fromEntries(['partyDelta', 'gearTier', 'lend', 'noWaking', 'wears', 'variant', 'relic'].map(k => [k, t.spawns[0][k]])),
    { partyDelta: 4, gearTier: 4, lend: true, noWaking: true, wears: 'bogstriders', variant: '$rival:rotbridge', relic: '$rival' });
  assert.deepEqual(t.leaves, { flag: 'tamsin-fallen' }, 'she sails off on the barge after her fall');
  // every `leaves` condition parses (rules/world.js reads it)
  for (const e of Object.values(ENCOUNTERS)) if (e.leaves) assert.deepEqual(condErrors(e.leaves), [], `${e.id}: leaves`);
  // the critical path and the leads are these encounters and Hearthfires
  for (const id of [...GLOOM_PATH, ...Object.values(GLOOM_LEADS).flat()]) assert.ok(ENCOUNTERS[id]?.region === 'gloomfen', id);
  // the Gloomfen patrol sets (spec §2.6): rabble only, of the families the spec names, within reach at the Waking they are met
  const SETS = {
    murkway: ['mire-leech', 'boglurcher'], lanternfen: ['lamp-moth', 'marsh-light'], boardwalk: ['marsh-light', 'mire-leech'], misthollow: ['marsh-light', 'lamp-moth'],
    blackwater: ['blackwater-gar', 'mire-leech'], 'tidal-flats': ['blackwater-gar', 'mire-leech'], causeway: ['marsh-light', 'mire-leech'],
  };
  const ZONE_WAKING = { murkway: 6, lanternfen: 6, boardwalk: 7, misthollow: 7, blackwater: 7, 'tidal-flats': 7, causeway: 8 };
  for (const [k, fams] of Object.entries(SETS)) {
    const got = new Set(PATROLS[k].flat().map(s => s.family));
    assert.deepEqual([...got].sort(), [...fams].sort(), `${k} patrols`);
    for (const s of PATROLS[k].flat()) assert.equal(FOES[s.family].tier, 'rabble');
    const z = Object.values(ZONES).find(x => x.sets === k);
    assert.ok(z && Number.isInteger(z.level), `${k}: a zone`);
    const lvl = escalateSpawn({ ...PATROLS[k][0][0], level: z.level }, ZONE_WAKING[k], k).level;
    assert.ok(lvl >= 26 && lvl <= 34, `${k}: patrols at level ${lvl}`);
  }
});

test('M6: a relic won only in the last Brand\'s fight never asks for the Branded deed (no Brand is left to earn after it)', async () => {
  const { BRANDS } = await import('../src/data/encounters.js');
  const { BRAND_TOTAL } = await import('../src/data/world.js');
  assert.equal(Object.keys(BRANDS).length, BRAND_TOTAL, 'every Brand is in the game');
  const last = ENCOUNTERS[BRANDS['brand-of-the-deep'].from]; // the Gloomfen's second, the eighth and last (spec A4)
  // what its foes carry: a Champion's pieces (its family's relics), a spawn's held, worn or given relic
  const pieces = last.spawns.flatMap(s => [...(FOES[s.family].relics || []), ...(s.held || []).map(h => h.relic), s.relic, s.wears]).filter(Boolean);
  assert.deepEqual([...new Set(pieces)].sort(), ['corvus-harpoon', 'deep-pearl']);
  for (const r of pieces) assert.ok(!RELICS[r].deeds.includes('brand'), `${r}: its deeds can all be done after the last Brand`);
});
