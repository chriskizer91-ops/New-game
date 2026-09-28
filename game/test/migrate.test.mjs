// The v1 -> v2 migration and the save module (M3 spec §4.8, §4.9), on every M2 fixture in
// test/fixtures/v1/. Owner: WP2.
// SCAFFOLD: covers checks 1-5 and 8 of §4.9 plus the M2 spawn snapshot; WP2 adds the rest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrate, starterOf, saveProblems } from '../src/rules/migrate.js';
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
    const v2 = migrate(v1);
    assert.equal(v2.version, 2);
    assert.equal(v2.migratedFrom, 1);
    for (const k of KEPT) assert.deepEqual(v2[k], v1[k], k);
    for (const k of KEPT_P) assert.deepEqual(v2.progress[k], v1.progress[k], k);
    for (const k of KEPT_F) assert.deepEqual(v2.progress.flags[k], v1.progress.flags[k], k);
    const a = v1Anchor(v1.progress.node);
    assert.deepEqual(v2.progress.pos, { map: a.map, x: a.x, y: a.y, face: a.face });
    assert.ok(canWalk(v2, a.map, a.x, a.y), 'the v1 anchor is walkable');
    assert.deepEqual(migrate(v2), v2, 'migrating twice changes nothing');
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

test('save v2: never writes v1, marks the migration, AETH2 codes, AETH1 accepted, v1 exported byte for byte', async () => {
  const S = await import('../src/core/save.js');
  const store = shim();
  const raw = readFileSync(path.join(dir, 'v1-grudges.json'), 'utf8').trim();
  store.set('aethermoor.save.v1', raw);
  const loaded = S.loadGame(migrate);
  assert.equal(loaded.from, 'v1');
  assert.equal(loaded.game.version, 2);
  assert.equal(store.get('aethermoor.save.v1'), raw, 'loading writes nothing');
  assert.equal(store.has('aethermoor.save.v2'), false);
  assert.equal(S.saveGame(loaded.game), true);
  assert.equal(store.get('aethermoor.save.v1'), raw, 'saving a v2 game never writes v1');
  assert.equal(store.get('aethermoor.v1.migrated'), '1');
  assert.equal(S.loadGame(migrate).from, 'v2');
  const code = S.exportCode(loaded.game);
  assert.match(code, /^AETH2\./);
  assert.deepEqual(S.importCode(code, migrate), loaded.game);
  const v1code = S.exportV1Code();
  assert.match(v1code, /^AETH1\./);
  assert.equal(new TextDecoder().decode(Uint8Array.from(atob(v1code.slice(6)), c => c.charCodeAt(0))), raw);
  assert.equal(S.importCode(v1code, migrate).version, 2);
  assert.equal(S.backupGame(), true);
  assert.equal(S.hasBackup(), true);
  store.delete('aethermoor.save.v2');
  assert.equal(S.loadGame(migrate), null, 'the marker stops the M2 save from coming back');
  delete globalThis.localStorage;
});

test('save v2: clearGame keeps the M2 save and the backup; restoreBackup migrates; hasSave means v2', async () => {
  const S = await import('../src/core/save.js');
  const store = shim();
  const raw = readFileSync(path.join(dir, 'v1-node-thornhollow.json'), 'utf8').trim();
  store.set('aethermoor.save.v1', raw);
  assert.equal(S.hasSave(), false, 'an M2 save alone is not a live save');
  assert.equal(S.hasV1(), true);
  assert.equal(S.isMigrated(), false);
  const g = S.loadGame(migrate).game;
  S.saveGame(g);
  assert.equal(S.hasSave(), true);
  assert.equal(S.backupGame(), true);
  S.clearGame();
  assert.equal(S.hasSave(), false);
  assert.equal(store.get('aethermoor.save.v1'), raw, 'clearGame never touches the M2 save');
  assert.equal(S.hasBackup(), true);
  const back = S.restoreBackup(migrate);
  assert.deepEqual(back, g);
  assert.equal(S.hasSave(), true);
  assert.equal(S.loadGame(migrate).from, 'v2');
  store.set('aethermoor.save.v2', '{broken');
  assert.equal(S.loadGame(migrate), null, 'a corrupt live save reads as none (the marker stops v1)');
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
  assert.deepEqual(saveProblems(null), ['it is not a save']);
});
