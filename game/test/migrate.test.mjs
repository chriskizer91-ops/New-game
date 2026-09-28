// The v1 -> v2 migration and the save module (M3 spec §4.8, §4.9), on every M2 fixture in
// test/fixtures/v1/. Owner: WP2.
// SCAFFOLD: covers checks 1-5 and 8 of §4.9 plus the M2 spawn snapshot; WP2 adds the rest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrate, toV2, SAVE_VERSION, starterOf, saveProblems } from '../src/rules/migrate.js';
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
  test(`migrate ${f} to the current version: the M3 game plus the version and M4's empty purse, pouch, pages and settled Grudges, whether it comes from M2 or from M3`, () => {
    const v1 = deepFreeze(load(f));
    const now = migrate(v1), m3 = deepFreeze(toV2(v1));
    assert.equal(now.version, SAVE_VERSION);
    const expected = structuredClone(m3);
    Object.assign(expected, { version: 3, materials: { scrap: 0, silver: 0, embers: 0 }, gems: {} });
    Object.assign(expected.progress.flags, { pages: {}, settled: {} });
    assert.deepEqual(now, expected, 'nothing else changes on the way to M4 (spec §4.1)');
    assert.deepEqual(migrate(m3), now, 'an M3 save and the M2 save it came from give the same game');
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

test('save (M4): its own key; the M2 and M3 saves are only read, offered newest first, and exported byte for byte', async () => {
  const S = await import('../src/core/save.js');
  const store = shim();
  const raw1 = readFileSync(path.join(dir, 'v1-grudges.json'), 'utf8').trim();
  const raw2 = JSON.stringify(toV2(load('v1-node-thornhollow.json')));
  store.set('aethermoor.save.v1', raw1);
  store.set('aethermoor.save.v2', raw2);
  const loaded = S.loadGame(migrate);
  assert.equal(loaded.from, 'v2', 'the Milestone 3 save is offered before the M2 one');
  assert.equal(loaded.game.version, SAVE_VERSION);
  assert.equal(store.get('aethermoor.save.v1'), raw1, 'loading writes nothing');
  assert.equal(store.get('aethermoor.save.v2'), raw2, 'loading writes nothing');
  assert.equal(store.has('aethermoor.save.m4'), false);
  assert.equal(S.isStarted(), false);
  assert.equal(S.saveGame(loaded.game), true);
  assert.equal(store.get('aethermoor.save.v1'), raw1, 'saving never writes the M2 key');
  assert.equal(store.get('aethermoor.save.v2'), raw2, 'saving never writes the Milestone 3 key');
  assert.equal(store.get('aethermoor.m4.started'), '1');
  assert.equal(S.loadGame(migrate).from, 'live');
  const code = S.exportCode(loaded.game);
  assert.match(code, new RegExp(`^AETH${SAVE_VERSION}\\.`));
  assert.deepEqual(S.importCode(code, migrate), loaded.game);
  const decode = c => new TextDecoder().decode(Uint8Array.from(atob(c.slice(6)), ch => ch.charCodeAt(0)));
  const v1code = S.exportV1Code(), v2code = S.exportV2Code();
  assert.match(v1code, /^AETH1\./);
  assert.match(v2code, /^AETH2\./);
  assert.equal(decode(v1code), raw1, 'the M2 save, byte for byte');
  assert.equal(decode(v2code), raw2, 'the Milestone 3 save, byte for byte');
  assert.equal(S.importCode(v1code, migrate).version, SAVE_VERSION);
  assert.deepEqual(S.importCode(v2code, migrate), migrate(JSON.parse(raw2)));
  assert.equal(S.backupGame(), true);
  assert.equal(S.hasBackup(), true);
  store.delete('aethermoor.save.m4');
  assert.equal(S.loadGame(migrate), null, 'the started marker stops the older saves from coming back');
  assert.equal(store.get('aethermoor.save.v1'), raw1);
  assert.equal(store.get('aethermoor.save.v2'), raw2);
  delete globalThis.localStorage;
});

test('save (M4): an M2 save alone is offered; clearGame keeps the older saves and the backup; restoreBackup migrates', async () => {
  const S = await import('../src/core/save.js');
  const store = shim();
  const raw = readFileSync(path.join(dir, 'v1-node-thornhollow.json'), 'utf8').trim();
  store.set('aethermoor.save.v1', raw);
  assert.equal(S.hasSave(), false, 'an M2 save alone is not a live save');
  assert.equal(S.hasV1(), true);
  assert.equal(S.hasV2(), false);
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
  assert.equal(S.hasBackup(), true);
  const back = S.restoreBackup(migrate);
  assert.deepEqual(back, g);
  assert.equal(S.hasSave(), true);
  assert.equal(S.loadGame(migrate).from, 'live');
  store.set('aethermoor.save.m4', '{broken');
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
  assert.deepEqual(saveProblems(null), ['it is not a save']);
});
