// The v1 -> v2 migration and the save module (M3 spec §4.8, §4.9), on every M2 fixture in
// test/fixtures/v1/. Owner: WP2.
// SCAFFOLD: covers checks 1-5 and 8 of §4.9 plus the M2 spawn snapshot; WP2 adds the rest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrate, toV2, toV3, toV4, SAVE_VERSION, starterOf, saveProblems } from '../src/rules/migrate.js';
import { canWalk, present } from '../src/rules/world.js';
import { spawnsFor, newGame, uniqueBrands } from '../src/rules/gauntlet.js';
import { v1Anchor, MAP_IDS } from '../src/data/maps/index.js';
import { ENCOUNTERS, GAUNTLET, PATROLS } from '../src/data/encounters.js';
import { deepFreeze } from '../src/core/freeze.js';
import { familyOf } from '../src/rules/foe.js';
import { TUNING } from '../src/data/tuning.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, 'fixtures/v1');
const FIX = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')).sort() : [];
const load = f => JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
const KEPT = ['seed', 'rngState', 'party', 'inventory', 'bag', 'gold', 'codex', 'settings'];
const KEPT_P = ['waking', 'brands', 'node', 'lastHearthfire'];
const KEPT_F = ['cleared', 'done', 'grudges', 'day', 'runs'];

test('there are 18 M2 fixtures', () => { assert.equal(FIX.length, 18); });

for (const f of FIX) {
  test(`migrate ${f}: version 2 at its v1 anchor, M2 fields untouched, idempotent, input frozen`, () => {
    const v1 = deepFreeze(load(f));
    const v2 = toV2(v1); // the M3 step (spec §4.9), exactly as M3 shipped it
    assert.equal(v2.version, 2);
    assert.equal(v2.migratedFrom, 1);
    for (const k of KEPT) assert.deepEqual(v2[k], v1[k], k);
    for (const k of KEPT_P) assert.deepEqual(v2.progress[k], v1.progress[k], k);
    for (const k of KEPT_F) assert.deepEqual(v2.progress.flags[k], v1.progress.flags[k], k);
    const a = v1Anchor(v1.progress.node);
    assert.deepEqual(v2.progress.pos, { map: a.map, x: a.x, y: a.y, face: a.face });
    assert.ok(canWalk(v2, a.map, a.x, a.y), 'the v1 anchor is walkable');
    assert.deepEqual(toV2(v2), v2, 'migrating twice changes nothing');
    const looped = v1.progress.flags.runs > 0 || v1.progress.brands.length > 0;
    const crown = present(v2, 'thornhollow').find(e => e.id === 'th-crown-w');
    assert.equal(crown.state, looped ? 'open' : 'closed', 'crownwalls open for loopers only');
    const gate = present(v2, 'keep').find(e => e.id === 'keep-n-gate');
    assert.equal(gate.state === 'open', !!v1.progress.flags.done['keep-vault']);
  });
}

test('the Waking-2 fixture keeps both Brands but counts one; the shattered fixture has the thornwall open', () => {
  const dupe = migrate(load('v1-waking2-dupe.json'));
  assert.equal(dupe.progress.brands.length, 2);
  assert.equal(uniqueBrands(dupe), 1);
  assert.equal(starterOf(dupe), 'hearthbrand', 'read from the codex, not the rondel in hand');
  assert.equal(migrate(load('v1-shattered.json')).progress.flags.unlocked['tw-thornwall'], true);
});

test('present() runs on every map and spawnsFor on every fight for a migrated save', () => {
  const g = migrate(load('v1-after-brand.json'));
  for (const id of MAP_IDS) assert.ok(Array.isArray(present(g, id)), id);
  for (const id of Object.keys(ENCOUNTERS)) if (ENCOUNTERS[id].type === 'fight') assert.ok(spawnsFor(g, id).length, id);
});

test('missing or junk input throws', () => {
  assert.throws(() => migrate(null), /Not an Aethermoor save/);
  assert.throws(() => migrate({ nope: 1 }), /Not an Aethermoor save/);
  assert.throws(() => migrate({ version: 1, party: {} }), /missing/);
});

test('the M2 spawn tables are unchanged (test/fixtures/m2-spawns.json)', () => {
  const snap = JSON.parse(readFileSync(path.join(here, 'fixtures/m2-spawns.json'), 'utf8'));
  const plain = v => JSON.parse(JSON.stringify(v));
  for (const id of GAUNTLET) assert.deepEqual(ENCOUNTERS[id].spawns ? plain(ENCOUNTERS[id].spawns) : null, snap.gauntlet[id], id);
  for (const k of Object.keys(snap.patrols)) assert.deepEqual(plain(PATROLS[k]), snap.patrols[k], k);
  // The Waking-escalated spawns match the M2 snapshot except where M3 deliberately changes them
  // (spec D3): rabble now rise TUNING.waking.rabbleLevels (2) levels per Waking instead of 6.
  const base = newGame({ seed: 101 });
  const drop = TUNING.waking.levels - TUNING.waking.rabbleLevels;
  for (const w of Object.keys(snap.spawnsFor)) {
    const g = { ...base, progress: { ...base.progress, waking: +w } };
    for (const id of Object.keys(snap.spawnsFor[w])) {
      const want = snap.spawnsFor[w][id].map(sp => (familyOf(sp).tier === 'rabble' ? { ...sp, level: sp.level - +w * drop } : sp));
      assert.deepEqual(plain(spawnsFor(g, id)), want, `${id} at Waking ${w}`);
    }
  }
});

// ---- the save module, with an in-memory localStorage ----------------------------------------------
function shim() {
  const m = new Map();
  globalThis.localStorage = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
  return m;
}

for (const f of FIX) {
  test(`migrate ${f} to the current version: the M3 game plus the version and M4's empty purse, pouch, pages and settled Grudges, whether it comes from M2, M3, M4 or Milestone 4.5`, () => {
    const v1 = deepFreeze(load(f));
    const now = migrate(v1), m3 = deepFreeze(toV2(v1)), m4 = deepFreeze(toV3(v1));
    assert.equal(now.version, SAVE_VERSION);
    assert.equal(SAVE_VERSION, 4, 'M5 saves are version 4 (M5 spec §4.1)');
    assert.equal(m4.version, 3, 'an M4 or Milestone 4.5 save is version 3');
    const expected = structuredClone(m3);
    Object.assign(expected, { version: 4, materials: { scrap: 0, silver: 0, embers: 0 }, gems: {} });
    Object.assign(expected.progress.flags, { pages: {}, settled: {} });
    assert.deepEqual(now, expected, 'nothing else changes on the way to M4 (M4 spec §4.1) or to M5 (M5 spec §4.1)');
    assert.deepEqual(migrate(m3), now, 'an M3 save and the M2 save it came from give the same game');
    assert.deepEqual(migrate(m4), now, 'so does the M4 or Milestone 4.5 save they came to');
    assert.deepEqual(migrate(now), now, 'idempotent');
  });
}

test('toV3 fills only what is missing: a partial purse keeps its counts, a pouch and pages stay as they are', () => {
  const g = migrate(newGame({ name: 'Tess', seed: 5 }));
  const partial = { ...g, materials: { silver: 3 }, gems: { sunstone: 1 }, progress: { ...g.progress, flags: { ...g.progress.flags, pages: { verdant: 4 }, settled: { 'x#0': { day: 2, name: 'X' } } } } };
  const m = migrate(deepFreeze(partial));
  assert.deepEqual(m.materials, { scrap: 0, silver: 3, embers: 0 });
  assert.deepEqual(m.gems, { sunstone: 1 });
  assert.deepEqual(m.progress.flags.pages, { verdant: 4 });
  assert.deepEqual(m.progress.flags.settled, { 'x#0': { day: 2, name: 'X' } });
  assert.deepEqual(migrate(m), m, 'idempotent');
});

test('toV3 Claims a whole relic in the bag that the Codex missed (M2 and M3 reforged without saying so); never a shattered one', () => {
  const g = migrate(newGame({ name: 'Tess', seed: 5 }));
  const whole = { ...g.inventory[0], uid: 'x-whole', base: 'thornsplitter', kind: 'axe', slot: 'weapon', rarity: 'heirloom' };
  const broken = { ...whole, uid: 'x-broken', base: 'dawnbell', kind: 'mace', shattered: true };
  const old = deepFreeze({ ...g, version: 2, inventory: [...g.inventory, whole, broken], codex: { ...g.codex, thornsplitter: { sighted: true, claimed: false, awakened: false } } });
  const m = migrate(old);
  assert.deepEqual(m.codex.thornsplitter, { sighted: true, claimed: true, awakened: false });
  assert.equal(m.codex.dawnbell, undefined, 'a shattered relic is not Claimed until it is reforged');
  assert.deepEqual(migrate(m), m, 'idempotent');
});

test('toV3 (M4.5): every fight a save has won counts as beaten, so its road gate is open; idempotent', () => {
  const g = migrate(load('v1-node-thornhollow.json'));
  const f = g.progress.flags;
  const won = Object.keys(f.cleared).filter(id => ENCOUNTERS[id]?.type === 'fight');
  assert.ok(won.length >= 3, 'the fixture has won fights');
  // an M3 or M4 save that lost track of beaten (or never had it) for some of them
  const old = structuredClone(g);
  old.version = 2;
  delete old.progress.flags.beaten[won[0]];
  old.progress.flags.beaten = Object.fromEntries(Object.entries(old.progress.flags.beaten).filter(([id]) => id !== won[1]));
  old.progress.flags.done = { ...old.progress.flags.done, 'tamsin-duel': true };
  const m = migrate(deepFreeze(old));
  for (const id of [won[0], won[1], 'tamsin-duel']) assert.ok(m.progress.flags.beaten[id] >= 1, `${id} is beaten`);
  assert.equal(m.progress.flags.beaten['milestone-fire'], undefined, 'a Hearthfire is never beaten');
  const kept = { ...g, progress: { ...g.progress, flags: { ...g.progress.flags, beaten: { ...g.progress.flags.beaten, [won[2]]: 4 } } } };
  assert.equal(migrate(kept).progress.flags.beaten[won[2]], 4, 'a count a save already has is kept');
  assert.deepEqual(migrate(m), m, 'idempotent');
});

test('toV4 (M5): a version 3 save (M4 or Milestone 4.5) walks on unchanged but for its version; a version 4 save is left as it is', () => {
  const m45 = deepFreeze(toV3(load('v1-after-brand.json')));
  const v4 = toV4(m45);
  assert.equal(v4.version, 4);
  assert.deepEqual({ ...v4, version: 3 }, m45, 'only the version changes (M5 spec §4.1)');
  assert.deepEqual(toV4(deepFreeze(v4)), v4, 'idempotent');
  assert.deepEqual(migrate(m45), v4);
  // a save from a later milestone (a higher version) is never turned back
  assert.equal(toV4(deepFreeze({ ...v4, version: 5 })).version, 5);
  assert.throws(() => toV4(null), /Not an Aethermoor save/);
});

test('save (M5): its own key; the M4.5, M4, M3 and M2 saves are only read, offered newest first, and exported byte for byte', async () => {
  const S = await import('../src/core/save.js');
  const store = shim();
  const raw1 = readFileSync(path.join(dir, 'v1-grudges.json'), 'utf8').trim();
  const raw2 = JSON.stringify(toV2(load('v1-node-thornhollow.json')));
  const raw4 = JSON.stringify(toV3(load('v1-waking2-dupe.json')));
  const raw45 = JSON.stringify(toV3(load('v1-after-brand.json')));
  store.set('aethermoor.save.v1', raw1);
  store.set('aethermoor.save.v2', raw2);
  assert.equal(S.loadGame(migrate).from, 'v2', 'the Milestone 3 save is offered before the M2 one');
  store.set('aethermoor.save.m4', raw4);
  store.set('aethermoor.m4.started', '1');
  assert.equal(S.loadGame(migrate).from, 'm4', 'the Milestone 4 save is offered before the older ones (M4\'s own marker is not this milestone\'s)');
  store.set('aethermoor.save.m4.5', raw45);
  store.set('aethermoor.m4.5.started', '1');
  const loaded = S.loadGame(migrate);
  assert.equal(loaded.from, 'm45', 'the Milestone 4.5 save is offered before the older ones');
  assert.equal(S.hasM45(), true);
  assert.equal(S.readM45().version, 3);
  assert.deepEqual(loaded.game, migrate(JSON.parse(raw45)));
  assert.equal(loaded.game.version, SAVE_VERSION);
  const old = () => [store.get('aethermoor.save.v1'), store.get('aethermoor.save.v2'), store.get('aethermoor.save.m4'), store.get('aethermoor.save.m4.5'),
    store.get('aethermoor.m4.started'), store.get('aethermoor.m4.5.started')];
  const before = [raw1, raw2, raw4, raw45, '1', '1'];
  assert.deepEqual(old(), before, 'loading writes nothing');
  assert.equal(store.has('aethermoor.save.m5'), false);
  assert.equal(S.isStarted(), false);
  assert.equal(S.saveGame(loaded.game), true);
  assert.deepEqual(old(), before, 'saving never writes the M2, Milestone 3, Milestone 4 or Milestone 4.5 keys');
  assert.equal(store.get('aethermoor.save.m5'), JSON.stringify(loaded.game));
  assert.equal(store.get('aethermoor.m5.started'), '1');
  assert.equal(S.loadGame(migrate).from, 'live');
  const code = S.exportCode(loaded.game);
  assert.match(code, /^AETH4\./);
  assert.deepEqual(S.importCode(code, migrate), loaded.game);
  const decode = c => new TextDecoder().decode(Uint8Array.from(atob(c.slice(6)), ch => ch.charCodeAt(0)));
  const v1code = S.exportV1Code(), v2code = S.exportV2Code(), m4code = S.exportM4Code(), m45code = S.exportM45Code();
  assert.match(v1code, /^AETH1\./);
  assert.match(v2code, /^AETH2\./);
  assert.match(m4code, /^AETH3\./);
  assert.match(m45code, /^AETH3\./, 'the Milestone 4.5 file reads it back');
  assert.equal(decode(v1code), raw1, 'the M2 save, byte for byte');
  assert.equal(decode(v2code), raw2, 'the Milestone 3 save, byte for byte');
  assert.equal(decode(m4code), raw4, 'the Milestone 4 save, byte for byte');
  assert.equal(decode(m45code), raw45, 'the Milestone 4.5 save, byte for byte');
  assert.equal(S.importCode(v1code, migrate).version, SAVE_VERSION);
  assert.deepEqual(S.importCode(v2code, migrate), migrate(JSON.parse(raw2)));
  assert.deepEqual(S.importCode(m4code, migrate), migrate(JSON.parse(raw4)));
  assert.deepEqual(S.importCode(m45code, migrate), migrate(JSON.parse(raw45)));
  assert.equal(S.backupGame(), true);
  assert.equal(S.hasBackup(), true);
  assert.equal(store.has('aethermoor.save.m5.bak'), true);
  assert.equal(store.has('aethermoor.save.m4.5.bak'), false, 'the backup is this milestone\'s own');
  store.delete('aethermoor.save.m5');
  assert.equal(S.loadGame(migrate), null, 'the started marker stops the older saves from coming back');
  assert.deepEqual(old(), before);
  delete globalThis.localStorage;
});

test('save (M5): an M2 save alone is offered; clearGame keeps the older saves and the backup; restoreBackup migrates', async () => {
  const S = await import('../src/core/save.js');
  const store = shim();
  const raw = readFileSync(path.join(dir, 'v1-node-thornhollow.json'), 'utf8').trim();
  store.set('aethermoor.save.v1', raw);
  assert.equal(S.hasSave(), false, 'an M2 save alone is not a live save');
  assert.equal(S.hasV1(), true);
  assert.equal(S.hasV2(), false);
  assert.equal(S.hasM4(), false);
  assert.equal(S.hasM45(), false);
  assert.equal(S.exportM45Code(), null);
  assert.equal(S.isStarted(), false);
  const first = S.loadGame(migrate);
  assert.equal(first.from, 'v1');
  const g = first.game;
  S.saveGame(g);
  assert.equal(S.hasSave(), true);
  assert.equal(S.backupGame(), true);
  S.clearGame();
  assert.equal(S.hasSave(), false);
  assert.equal(store.get('aethermoor.save.v1'), raw, 'clearGame never touches the M2 save');
  assert.equal(store.has('aethermoor.save.v2'), false, 'nor writes a Milestone 3 one');
  assert.equal(store.has('aethermoor.save.m4'), false, 'nor a Milestone 4 one');
  assert.equal(store.has('aethermoor.save.m4.5'), false, 'nor a Milestone 4.5 one');
  assert.equal(S.hasBackup(), true);
  const back = S.restoreBackup(migrate);
  assert.deepEqual(back, g);
  assert.equal(S.hasSave(), true);
  assert.equal(S.loadGame(migrate).from, 'live');
  store.set('aethermoor.save.m5', '{broken');
  assert.equal(S.loadGame(migrate), null, 'a corrupt live save reads as none (the marker stops the M2 save)');
  assert.equal(store.get('aethermoor.save.v1'), raw);
  delete globalThis.localStorage;
});

test('every fixture: present() on every map and spawnsFor on every fight', () => {
  for (const f of FIX) {
    const g = migrate(load(f));
    for (const id of MAP_IDS) assert.ok(Array.isArray(present(g, id)), `${f} ${id}`);
    for (const id of Object.keys(ENCOUNTERS)) if (ENCOUNTERS[id].type === 'fight') assert.ok(spawnsFor(g, id).length, `${f} ${id}`);
  }
});

test('a pasted code must have the shape the game walks on: every real save passes, damaged ones name the damage', () => {
  for (const f of FIX) assert.deepEqual(saveProblems(migrate(load(f))), [], f);
  const good = migrate(newGame({ name: 'Tess', seed: 5 }));
  assert.deepEqual(saveProblems(good), []);
  const broken = fn => { const g = structuredClone(good); fn(g); return saveProblems(g); };
  // each of these broke Continue or the title when it got through (review, M3)
  assert.ok(broken(g => { delete g.inventory; }).includes('its items'));
  assert.ok(broken(g => { g.inventory = {}; }).includes('its items'));
  assert.ok(broken(g => { delete g.codex; }).includes('its codex'));
  assert.ok(broken(g => { delete g.progress.flags.grudges; }).includes('its grudges flags'));
  assert.ok(broken(g => { g.party.active = []; }).includes('its active party'));
  assert.ok(broken(g => { g.party.active = ['warden', 'nobody']; }).includes('its active party'));
  assert.ok(broken(g => { g.party.roster.pip.gear = 'none'; }).includes('the hero pip'));
  assert.ok(broken(g => { g.gold = '12'; }).includes('its gold'));
  assert.ok(broken(g => { g.progress.pos = { map: 'nowhere', x: 1, y: 1 }; }).includes('where you stand'));
  assert.ok(broken(g => { g.progress.pos.x = 9999; }).includes('where you stand'));
  // M4 (spec §4.1): the purse, the pouch, the pages, the settled Grudges and each item's sockets
  assert.ok(broken(g => { g.materials = { scrap: 'lots' }; }).includes('its forge materials'));
  assert.ok(broken(g => { g.materials = { silver: -1 }; }).includes('its forge materials'));
  assert.ok(broken(g => { delete g.materials; }).includes('its forge materials'));
  assert.ok(broken(g => { g.gems = ['sunstone']; }).includes('its gems'));
  assert.ok(broken(g => { g.progress.flags.pages = 3; }).includes('its pages flags'));
  assert.ok(broken(g => { g.progress.flags.settled = null; }).includes('its settled flags'));
  assert.ok(broken(g => { g.inventory[0].gems = 'sunstone'; }).includes('its items'));
  assert.ok(broken(g => { g.inventory[0].gems = [{ id: 'sunstone' }]; }).includes('its items'));
  assert.deepEqual(broken(g => { g.inventory[0].gems = ['sunstone', null]; g.gems = { sunstone: 2 }; }), [], 'sockets hold gem ids or nothing');
  // the forge and the Chronicle read these; a malformed one would throw or corrupt the save (review, M4)
  for (const [k, v] of [['temper', 1.5], ['temper', 11], ['temper', '3'], ['rerolls', '1'], ['rerolls', -1], ['deeds', 'all'], ['awakened', 'c'],
    ['chronicle', 'long'], ['chronicle', { kills: 'many' }], ['chronicle', { bearers: 3 }], ['chronicle', { bearers: [{ id: 'pip' }] }]]) {
    assert.ok(broken(g => { g.inventory[0][k] = v; }).includes('its items'), `${k}: ${JSON.stringify(v)}`);
  }
  assert.deepEqual(broken(g => { Object.assign(g.inventory[0], { temper: 10, rerolls: 2, deeds: { rout: 3 }, awakened: 'b', chronicle: { kills: 4, bearers: ['pip'], mightiest: null } }); }), [], 'well-formed M4 fields pass');
  assert.deepEqual(saveProblems(null), ['it is not a save']);
});
