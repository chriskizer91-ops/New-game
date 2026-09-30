// The battle and item art (M4 P6): every key the data names resolves to art, every new foe, backdrop, relic and
// icon renders in node, and every M2 and M3 foe, backdrop and item still renders pixel for pixel as it did when M3
// shipped (the pinned hashes below were taken from the M3 art before any M4 change).
// M5 adds the Ironspire: its Champions' pieces, its relic-bearers, its eleven backdrops (the Deeps and Beneath
// Frostmere read dark, with Hush's light still under the ice), and the M4 art held pixel for pixel as it shipped (those
// hashes were taken from the M4 art before any M5 change).
//
// The art returns ImageData; node has none, so a minimal one is provided (data, width, height), which is all the
// art layer uses. `AETH_PIN=1 node --test test/art-keys.test.mjs` prints the hashes instead of checking them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

globalThis.ImageData ??= class ImageData {
  constructor(d, w, h) { if (typeof d === 'number') { h = w; w = d; d = new Uint8ClampedArray(w * h * 4); } this.data = d; this.width = w; this.height = h; }
};
const { FOES } = await import('../src/data/foes.js');
const { RELICS } = await import('../src/data/relics.js');
const { BACKDROPS: BACKDROP_IDS } = await import('../src/data/encounters.js');
const { ZONES } = await import('../src/data/world.js');

const { GEMS, MATERIALS } = await import('../src/data/gems.js');
const { LOCKS } = await import('../src/data/locks.js');
const { FOE_ART, renderFoe } = await import('../src/art/foes.js');
const { BACKDROPS, renderBackdrop } = await import('../src/art/scenes.js');
const { RELIC_ART, TEMPER_MAX, itemArt, itemPortrait, itemIcon, itemLookKey, artStage, gearLooks, ITEM_KINDS } = await import('../src/art/item-looks.js');
const { renderHero } = await import('../src/art/hero-looks.js');
const { lockIcon, gemIcon, materialIcon, LOCK_ICON_KEYS, GEM_ICON_KEYS, MATERIAL_ICON_KEYS } = await import('../src/art/icons.js');
const Art = await import('../src/art/index.js');
import { ENCOUNTERS, MAPS } from './old-world.mjs'; // the old game's world, without Thareia's

const PIN = !!process.env.AETH_PIN;
const hashOf = imgs => { const h = createHash('sha256'); for (const im of imgs) { h.update(`${im.width}x${im.height}`); h.update(im.data); } return h.digest('hex').slice(0, 24); };
const pinned = (name, got) => { if (PIN) console.log(`  '${name}': '${got}',`); else assert.equal(got, PINNED[name], `${name}: the M2/M3 art changed`); };

// every art key data/foes.js names: the families and each variant's own key
const artKeys = () => { const s = new Set(); for (const f of Object.values(FOES)) { s.add(f.art); for (const v of Object.values(f.variants || {})) if (v.art) s.add(v.art); } return [...s]; };

test('every foe family and variant art key resolves in FOE_ART and renders every pose', () => {
  for (const key of artKeys()) {
    const def = FOE_ART[key];
    assert.ok(def, `FOE_ART has no ${key}`);
    assert.ok(!def.standIn, `${key} still draws a stand-in (${def.standIn})`);
    for (const [pose, t] of [['idle', 0], ['idle', .7], ['attack', .1], ['attack', .6], ['hurt', 0], ['ko', 0]]) {
      for (const gearTier of [0, 3]) {
        const img = renderFoe(key, { pose, t, gearTier });
        const w = def.kind === 'humanoid' ? 64 : def.w, h = def.kind === 'humanoid' ? 64 : def.h;
        assert.equal(img.width, w, key); assert.equal(img.height, h, key);
        for (const a of ['foot', 'head', 'center']) assert.ok(img.anchors[a]?.every(Number.isFinite), `${key} ${pose}: anchor ${a}`);
      }
    }
  }
});

test('the Sunscorch champions draw each piece until it is snapped off, in every phase', () => {
  for (const key of ['kharzul', 'ashen-warden']) {
    const pieces = FOE_ART[key].relics;
    assert.deepEqual([...pieces].sort(), [...FOES[key].relics].sort(), `${key}: the art's pieces are the data's relics`);
    for (const phase of [1, 2, 3]) for (const broken of [[], [pieces[0]], [pieces[1]], pieces]) {
      const img = renderFoe(key, { phase, broken, t: .3 });
      assert.equal((img.anchors.relics || []).length, 2 - broken.length, `${key} phase ${phase} broken ${broken}`);
    }
    assert.equal((renderFoe(key, { relicHeld: false }).anchors.relics || []).length, 0, `${key} relicHeld:false`);
  }
});

test('every encounter, map and patrol-zone backdrop, and every listed BACKDROPS id, has a painter; dark ones read dark', () => {
  const used = new Set(BACKDROP_IDS);
  for (const e of Object.values(ENCOUNTERS)) if (e.backdrop) used.add(e.backdrop);
  for (const z of Object.values(ZONES)) used.add(z.backdrop);
  for (const m of Object.values(MAPS)) if (m.backdrop) used.add(m.backdrop);
  for (const k of used) assert.ok(BACKDROPS[k], `no backdrop ${k}`);
  const mean = img => { let s = 0; for (let i = 0; i < img.data.length; i += 4) s += img.data[i] * .3 + img.data[i + 1] * .59 + img.data[i + 2] * .11; return s / (img.data.length / 4); };
  for (const k of ['sun-road', 'sandspire', 'dust-trail', 'deep-shaft', 'glass-heart', 'glass-flats', 'miragewell', 'scorchgate', 'scorchgate-vaults']) {
    const img = renderBackdrop(k, { t: 1.3 });
    assert.equal(img.width, 160); assert.equal(img.height, 96);
    const dark = renderBackdrop(k, { t: 1.3, dark: true });
    assert.ok(mean(dark) < mean(img), `${k}: its dark treatment is darker`);
  }
  for (const e of Object.values(ENCOUNTERS)) if (e.dark && e.region === 'sunscorch') assert.ok(mean(renderBackdrop(e.backdrop, { t: 1, dark: true })) < 40, `${e.id} is dark`);
});

test('every relic has its own RELIC_ART, and renders with gems, tempers up to +10 and each stage', () => {
  for (const id of Object.keys(RELICS)) {
    assert.ok(RELIC_ART[id], `RELIC_ART has no ${id}`);
    const base = { uid: 'u', base: id, kind: RELICS[id].kind, rarity: RELICS[id].rarity, aspect: RELICS[id].aspect, seed: 1 };
    for (const extra of [{}, { temper: 7 }, { temper: TEMPER_MAX }, { deeds: { 'first-blood': 2 } }, { deeds: { 'first-blood': 2 }, awakened: 'a' }, { deeds: { 'first-blood': 2 }, awakened: 'b' }, { gems: ['sunstone', 'glass-pearl'] }]) {
      const item = { ...base, ...extra }, img = itemPortrait(item, { t: 1.3 });
      assert.equal(img.width, 64, id);
      assert.ok(itemIcon(item), id);
    }
  }
  assert.equal(TEMPER_MAX, 10);
  // the new relics are each their own look, not a copy of another
  const sig = id => JSON.stringify(RELIC_ART[id].p, (k, v) => (typeof v === 'function' ? String(v) : v));
  const seen = new Map();
  for (const id of Object.keys(RELICS)) { const s = RELIC_ART[id].r + sig(id); assert.ok(!seen.has(s), `${id} looks like ${seen.get(s)}`); seen.set(s, id); }
});

test('an item\'s look key and art change with temper, gems, stage and branch (no stale art in any cache)', () => {
  const base = { uid: 'u', base: 'cinderfang', kind: 'sword', rarity: 'heirloom', aspect: 'ember', seed: 1, temper: 0, gems: [] };
  const variants = [base, { ...base, temper: 4 }, { ...base, temper: 7 }, { ...base, temper: 10 }, { ...base, gems: ['sunstone', null] }, { ...base, gems: ['sunstone', 'ash-garnet'] },
    { ...base, deeds: { 'legend-strike': 3 } }, { ...base, deeds: { 'legend-strike': 3 }, awakened: 'a' }, { ...base, deeds: { 'legend-strike': 3 }, awakened: 'b' }];
  const keys = new Set(variants.map(itemLookKey)), arts = new Set(variants.map(itemArt));
  assert.equal(keys.size, variants.length); assert.equal(arts.size, variants.length);
  assert.equal(itemArt({ ...base }), itemArt({ ...base }), 'the same item gives the same art object');
  assert.equal(artStage(base), null); assert.equal(artStage(variants[6]), 'kindled'); assert.equal(artStage(variants[7]), 'awakened');
  // an M2/M3 item (gems: [], temper 0, no deeds) is exactly its plain art
  assert.equal(itemArt(base), RELIC_ART.cinderfang);
  // worn pieces carry their gem, stage and branch into the rig's looks
  const L = gearLooks({ offhand: { ...base, base: 'ashen-aegis', kind: 'shield', gems: ['moss-agate', null], deeds: { 'fell-champion': 1 }, awakened: 'b' } }).offhand;
  assert.equal(L.gem, 'gem.moss-agate'); assert.equal(L.stage, 'awakened'); assert.equal(L.branch, 'b');
});

test('every lock type, gem and forge material has an icon, and the art index exports them', () => {
  for (const id of Object.keys(LOCKS)) assert.ok(LOCK_ICON_KEYS.includes(id), `no lock icon ${id}`);
  for (const id of Object.keys(GEMS)) { assert.ok(GEM_ICON_KEYS.includes(id), `no gem icon ${id}`); assert.equal(gemIcon(id).width, 12); }
  for (const id of Object.keys(MATERIALS)) { assert.ok(MATERIAL_ICON_KEYS.includes(id), `no material icon ${id}`); assert.equal(materialIcon(id, { size: 24 }).width, 24); }
  for (const id of LOCK_ICON_KEYS) assert.equal(lockIcon(id).width, 12);
  for (const k of ['gemIcon', 'materialIcon', 'GEM_ICON_KEYS', 'MATERIAL_ICON_KEYS', 'itemLookKey', 'artStage', 'awakenMotes', 'GEM_MAT', 'lockIcon', 'keyIcon']) assert.ok(Art[k], `art/index.js exports ${k}`);
});

// ---- the M2 and M3 art is frozen: pixel hashes taken before any M4 change ----
const M3_FOES = ['cutpurse', 'bandit', 'tallyman', 'briarling', 'thornhound', 'rotstag', 'oldsnag', 'briarmaw', 'smuggler', 'mags', 'feral-druid', 'oda', 'hollowed-ranger', 'corra', 'haskett', 'hollis', 'dun', 'vesper', 'tamsin', 'boglurcher', 'glowcap', 'rotgrub', 'sapwight', 'gloamwing', 'mirelord', 'rotwarden'];
const M3_BACKDROPS = ['hearth-road', 'verdant-wood', 'thornhollow', 'briarmaw-den', 'mossfall', 'mosswatch', 'fawnrest', 'eldergrove', 'heartroot', 'mosswatch:dark', 'heartroot:dark'];
const M3_RELICS = ['hearthbrand', 'stillwater-lance', 'cairnmaul', 'wardens-seal', 'tallyknife', 'thornsplitter', 'rotwood-circlet', 'thornwatch-hood', 'thornwatch-jerkin', 'thornwatch-boots', 'thornwreath', 'briarfang', 'lightfingers', 'hartshorn', 'mosswatch-lantern', 'watchkeepers-kettle', 'mire-pearl', 'dawnbell', 'rootsong', 'oathshield', 'isoldes-oath', 'ichor-mask', 'first-seed', 'vale-gauntlets'];
const PINNED = {
  'foe cutpurse': '12a832eda7c9f35124efaccf',
  'foe bandit': 'fd5ca51bfed094761ec0a4ec',
  'foe tallyman': '2427a01353579c02bdd6359d',
  'foe briarling': 'f48983fc95ed8e5f643bcc51',
  'foe thornhound': '7f770e9ae5386876c94b1453',
  'foe rotstag': 'f38db774a2385056e5fd1c3d',
  'foe oldsnag': '3923045d4fb0125379d71a46',
  'foe briarmaw': '6d957c8d6da61dcd5b5f4d52',
  'foe smuggler': 'bf78c72b63ef581994e1637d',
  'foe mags': '4d891ce4e05e78f9ab5330d4',
  'foe feral-druid': '048ddc31162986a8062f1bd4',
  'foe oda': 'ce4b49478a62e8436c83a6cb',
  'foe hollowed-ranger': '4352db3d91d2bb3a72405273',
  'foe corra': '1b015bfc767534ceb4efeb8d',
  'foe haskett': '19efc98f2e87740475f4e152',
  'foe hollis': 'cecb5abf951b7c771b196759',
  'foe dun': '608ea92ae59ebf5eb7f59214',
  'foe vesper': '895b944c1c9851b0dec44bc5',
  'foe tamsin': 'ddd756266c56c37bc5f52ba6',
  'foe boglurcher': 'f42c4c2c715279925e86ed55',
  'foe glowcap': 'd57acd20f8d8150376d008ba',
  'foe rotgrub': '8d29017f298004d209d56f86',
  'foe sapwight': 'c28688756204e68ba26f2402',
  'foe gloamwing': '9ba6366950ef9aee55c5d24e',
  'foe mirelord': 'f7dc6cd54e66c19b80d212e2',
  'foe rotwarden': '741d419766a98cc60d574976',
  'backdrop hearth-road': '27bdd327760ba34d67280e89',
  'backdrop verdant-wood': '0d9bca4d3f6a5f4562a9682c',
  'backdrop thornhollow': '0b3fe2a296f77fff46d034dc',
  'backdrop briarmaw-den': 'a5ec85a5ff03b417165ab479',
  'backdrop mossfall': '447e24100a0d55cb6d97597d',
  'backdrop mosswatch': '320c58fbc9c572808913f3c3',
  'backdrop fawnrest': '8b3e4e5bbf5b1383b31154b6',
  'backdrop eldergrove': 'b130b854ed3c86d9945203e6',
  'backdrop heartroot': '568e0fd9751e8a9543a241c6',
  'backdrop mosswatch:dark': 'c87a6d7234104ffd00a768ac',
  'backdrop heartroot:dark': '892a7a2cf4a9f63b91dd3f92',
  'relic hearthbrand': '2e57c2050d8c6ce6a5960baa',
  'relic stillwater-lance': '57776dce398d800c27da7f4f',
  'relic cairnmaul': '98c379c00e31a2a93956f9dd',
  'relic wardens-seal': 'bb5e3866f0d53e62b4729054',
  'relic tallyknife': '3adc40405df13ef392b9b3a8',
  'relic thornsplitter': '9ebb747a53ecbf390e1db2b1',
  'relic rotwood-circlet': '4caca45dd0b773491191e014',
  'relic thornwatch-hood': '75aab81bac770e5cd51ddf69',
  'relic thornwatch-jerkin': 'c41d45bca4cf7830a7b9cad0',
  'relic thornwatch-boots': '2ab0d5ad746790a9b5b35a68',
  'relic thornwreath': 'a85869d2e723e0fbad2ed0bf',
  'relic briarfang': 'c2bfc48f1a380ec6a719a4c6',
  'relic lightfingers': '0c392e1da28e086f94f7c3be',
  'relic hartshorn': 'ee03ad634464dee5b9f69cdb',
  'relic mosswatch-lantern': 'a3e80faa9f7d5e7f46589d01',
  'relic watchkeepers-kettle': '4af190131365f9bd4fc370af',
  'relic mire-pearl': 'b2f4152c4fe62540930f931b',
  'relic dawnbell': 'c41d01e06fdb67c70ccb387d',
  'relic rootsong': 'c34612a38358135d1dfe8f24',
  'relic oathshield': 'e45c3474b408ba6f16be3b0e',
  'relic isoldes-oath': '0d81a05b3c469eb480fc0aee',
  'relic ichor-mask': '7929cdd379ed2a982c6f0b1c',
  'relic first-seed': '37d71ee9fe7cd344b87d6071',
  'relic vale-gauntlets': 'dfc8ae7a7c3105ad18e26438',
  'kind sword': '299d3d5468af6ab2ce409100',
  'kind hammer': '2e8a8244dc5aecdc453f1482',
  'kind mace': '8d3bfe76e7b37391f09f3138',
  'kind axe': 'b5e89df4bdbd003968416c4a',
  'kind dagger': '4a2db19889449020ddc04e00',
  'kind spear': '495b2c44d801b12f0c3755ef',
  'kind staff': 'e2a532d7240d1fe50d695c42',
  'kind bow': '02d92c2887c14d6cc42b1540',
  'kind shield': '1a4c31c6c98942008702a8c4',
  'kind focus': '375cf88c39f6024ff573f270',
  'kind hood': 'a66fb50fc57670f17279090d',
  'kind coif': '45931d270443f3b3a08840aa',
  'kind kettle': '6b2ea9eea65ff5aa3eef01a1',
  'kind helm': '34d17fe6dd7285910d38c700',
  'kind circlet': '100b3a633c79c70ebfc3d70f',
  'kind crown': '52bb81f369086526ba3a6323',
  'kind robe': '87c3dc5ed0d0224e8f0cd1c5',
  'kind leather': 'c7e639d4aa9e1f0880ad5650',
  'kind mail': '3d8a96df839fd02ad157232a',
  'kind plate': '3ab4065ed62db1e21a600763',
  'kind gloves': '2438e8ca2a54667f7f883037',
  'kind gauntlets': 'de22b670b6fb603f2a473dc2',
  'kind boots': '52854d3559cbf2f0d3695347',
  'kind amulet': '5053b0e36afa5233fc5a562b',
  'kind ring': '8fc4e8e8618286aa48282dcf',
  'hero warden': 'd65b03ec8b42309063b7aceb',
  'hero pip': '9fb37c3b97de9574e78aa8a6',
  'hero bryn': '2ff3b54906d6bb84a5303638',
  'hero alondra': '4e2d77253628cf1d3c86b1cf',
  'hero warden starter': '5c51dc4a5982e9f7f11aceb3',
};

test('every M2 and M3 foe renders exactly as before', () => {
  for (const key of M3_FOES) {
    const imgs = [];
    for (const [pose, t] of [['idle', .2], ['attack', .6], ['ko', 0]]) for (const gearTier of [0, 3]) imgs.push(renderFoe(key, { pose, t, gearTier }));
    if (FOE_ART[key].relics) for (const phase of [2, 3]) imgs.push(renderFoe(key, { phase, broken: [FOE_ART[key].relics[0]], t: .3 }));
    if (FOE_ART[key].relic) imgs.push(renderFoe(key, { relicHeld: false, t: .3 }));
    if (key === 'tamsin') for (const relic of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) imgs.push(renderFoe(key, { relic, gearTier: 3, t: .2 }));
    pinned('foe ' + key, hashOf(imgs));
  }
});

test('every M2 and M3 backdrop renders exactly as before', () => {
  for (const key of M3_BACKDROPS) pinned('backdrop ' + key, hashOf([renderBackdrop(key, { t: 1.3 }), renderBackdrop(key, { w: 120, h: 104, t: .7 })]));
});

test('every M2 and M3 item renders exactly as before, tempered +0 to +3 too, on the card, in the bag and on a hero', () => {
  for (const id of M3_RELICS) {
    const R = RELICS[id], imgs = [];
    for (let temper = 0; temper <= 3; temper++) { const item = { uid: 'u', base: id, kind: R.kind, rarity: 'heirloom', aspect: R.aspect, seed: 1, temper, gems: [] }; imgs.push(itemPortrait(item, { t: 1.3 }), itemIcon(item)); }
    pinned('relic ' + id, hashOf(imgs));
  }
  for (const kind of ITEM_KINDS) {
    const imgs = [];
    for (const [rarity, aspect, temper] of [['worn', null, 0], ['tempered', 'verdant', 2], ['runed', 'frost', 3], ['storied', 'storm', 1], ['heirloom', 'ember', 0], ['primal', 'radiant', 0]]) {
      const item = { kind, rarity, aspect, seed: 11, temper, gems: [] }; imgs.push(itemPortrait(item, { t: .9 }), itemIcon(item));
    }
    pinned('kind ' + kind, hashOf(imgs));
  }
  const kits = [['warden', { weapon: 'isoldes-oath', offhand: 'oathshield', head: 'watchkeepers-kettle', hands: 'vale-gauntlets', ring: 'mire-pearl' }], ['pip', { weapon: 'hartshorn', hands: 'lightfingers', amulet: 'first-seed' }], ['bryn', { weapon: 'rootsong', head: 'ichor-mask' }], ['alondra', { weapon: 'dawnbell', offhand: 'mosswatch-lantern' }], ['warden', undefined]];
  for (const [hero, gear] of kits) pinned('hero ' + hero + (gear ? '' : ' starter'), hashOf([renderHero(hero, gear, { pose: 'idle', t: .1 }), renderHero(hero, gear, { pose: 'attack', t: .62 })]));
});

// ---- the Ironspire (M5) ----
test('the Ironspire champions draw each piece until it is snapped off, in every phase and pose', () => {
  for (const key of ['mother-anvil', 'rime-abbot']) {
    const pieces = FOE_ART[key].relics;
    assert.deepEqual([...pieces].sort(), [...FOES[key].relics].sort(), `${key}: the art's pieces are the data's relics`);
    for (const piece of pieces) assert.ok(RELIC_ART[piece] && !RELIC_ART[piece].stub, `${key}: ${piece} is drawn from its own relic art`);
    for (const phase of [1, 2, 3]) for (const broken of [[], [pieces[0]], [pieces[1]], pieces]) for (const pose of ['idle', 'attack', 'hurt', 'ko']) {
      const img = renderFoe(key, { phase, broken, pose, t: .3 });
      assert.equal((img.anchors.relics || []).length, 2 - broken.length, `${key} phase ${phase} ${pose} broken ${broken}`);
    }
    assert.equal((renderFoe(key, { relicHeld: false }).anchors.relics || []).length, 0, `${key} relicHeld:false`);
  }
});

test('the Ironspire relic-bearers carry their relic until it is taken', () => {
  for (const key of ['rhune', 'cutter-chief', 'sentinel-captain', 'journeyman', 'old-horn', 'drowned-abbess', 'thunder-roc']) {
    const def = FOE_ART[key];
    assert.ok(def.relic && RELIC_ART[def.relic] && !RELIC_ART[def.relic].stub, `${key} carries a relic with its own art`);
    const held = renderFoe(key, { t: 1 }), taken = renderFoe(key, { t: 1, relicHeld: false });
    assert.ok(held.anchors.relic?.every(Number.isFinite), `${key}: the relic has a glint point`);
    assert.ok(!taken.anchors.relic, `${key}: no glint once it is taken`);
    assert.notDeepEqual(taken.data, held.data, `${key}: taking the relic changes the picture`);
  }
});

test('the eleven Ironspire backdrops are painted; the Deeps and Beneath Frostmere read dark, Hush still lit under the ice', () => {
  const IRON = ['rockslide-pass', 'peaks-veil', 'highfold', 'iron-stair', 'ironhold', 'ironhold-deeps', 'harrows-forge', 'stormwatch', 'frost-road', 'frostmere', 'frostmere-below'];
  const mean = img => { let s = 0; for (let i = 0; i < img.data.length; i += 4) s += img.data[i] * .3 + img.data[i + 1] * .59 + img.data[i + 2] * .11; return s / (img.data.length / 4); };
  for (const k of IRON) {
    assert.ok(BACKDROPS[k] && BACKDROPS[k].name, `BACKDROPS lists ${k}`);
    const img = renderBackdrop(k, { t: 1.3 });
    assert.equal(img.width, 160); assert.equal(img.height, 96);
    assert.ok(mean(renderBackdrop(k, { t: 1.3, dark: true })) < mean(img), `${k}: its dark treatment is darker`);
    for (const t of [0, 2.2]) assert.ok(renderBackdrop(k, { t }), `${k} animates at t ${t}`);
  }
  for (const k of ['ironhold-deeps', 'frostmere-below']) {
    assert.ok(BACKDROPS[k + ':dark']?.dark, `${k} has a dark listing`);
    assert.ok(mean(renderBackdrop(k + ':dark', { t: 1 })) < 40, `${k}:dark reads dark`);
  }
  for (const e of Object.values(ENCOUNTERS)) if (e.dark && e.region === 'ironspire') assert.ok(mean(renderBackdrop(e.backdrop, { t: 1, dark: true })) < 40, `${e.id} is dark`);
  // Hush's light stays on under the floor when the cave goes dark: violet pixels below the horizon
  const img = renderBackdrop('frostmere-below:dark', { t: 1, reduced: true }), gy = Math.round(96 * BACKDROPS['frostmere-below'].horizon);
  let violet = 0;
  for (let y = gy; y < 96; y++) for (let x = 0; x < 160; x++) { const i = (y * 160 + x) * 4, [r, g, b] = [img.data[i], img.data[i + 1], img.data[i + 2]]; if (b > 90 && b > g * 1.4 && r > g) violet++; }
  assert.ok(violet > 60, `Hush glows under the ice in the dark (${violet} violet pixels)`);
});

test('every status has its own icon, the Ironspire holds and charms too', async () => {
  const { STATUSES } = await import('../src/data/statuses.js');
  const { statusIcon, STATUS_KEYS } = await import('../src/art/icons.js');
  for (const id of Object.keys(STATUSES)) { assert.ok(STATUS_KEYS.includes(id), `no status icon ${id}`); assert.equal(statusIcon(id, { size: 12 }).width, 12); }
  for (const id of ['burrowed', 'swallowed', 'charmed', 'rotting', 'hexed']) assert.notDeepEqual(statusIcon(id).data, statusIcon('no-such-status').data, `${id} draws its own icon, not the neutral token`);
});

// the M4 art is held as it shipped: hashes taken from the M4 art before any M5 change
const M4_FOES = ['sand-skink', 'glass-scorpion', 'glass-matriarch', 'mirage-wisp', 'wisp-queen', 'sand-wyrm', 'kharzul', 'ashen-warden', 'scavenger', 'dune-raider', 'rasa', 'gnash', 'ash-wight', 'ash-captain', 'brask', 'quartermaster', 'vell'];
const M4_BACKDROPS = ['sun-road', 'sandspire', 'dust-trail', 'deep-shaft', 'glass-heart', 'glass-flats', 'miragewell', 'scorchgate', 'scorchgate-vaults', 'deep-shaft:dark', 'scorchgate-vaults:dark'];
const M4_RELICS = ['sandwalkers', 'zaras-orrery', 'wyrmscale', 'sunstone-lantern', 'glass-carapace', 'dunebreaker', 'cinderfang', 'mirage-glass', 'qasims-signet', 'sunstone-heart', 'scorchgate-key', 'ashen-aegis', 'cinder-crown', 'saltglass'];
const PINNED_M4 = {
  'foe sand-skink': '192fe52309b5ef7ef855e87b',
  'foe glass-scorpion': '0b0e1fe2edd02f5493994ff7',
  'foe glass-matriarch': '776dd2ead0286796d85b2a2e',
  'foe mirage-wisp': 'f30e3372d6d4a49f444002f4',
  'foe wisp-queen': '3e93bbf7f1317c3dacaddc9c',
  'foe sand-wyrm': '270d69d6f52f270769edac94',
  'foe kharzul': '30ea2ee8f16594240f4c35a4',
  'foe ashen-warden': '1aa216e79350ac1af4e12669',
  'foe scavenger': '541248afadd3661d97187e67',
  'foe dune-raider': '3e33db1a36999dda0cd0042c',
  'foe rasa': '8a98c862fa008e2bf529ee3d',
  'foe gnash': '24e00c870804468d0a971796',
  'foe ash-wight': 'fc6de0e97893ffc903b1ae26',
  'foe ash-captain': '75df88ad7c5945cb4cb24760',
  'foe brask': '238eeb773d573c2665be154f',
  'foe quartermaster': '72ce10e10cb6203694491eb4',
  'foe vell': 'be4fff1daf0f4285fa49bbfa',
  'foe tamsin kindled': '2ab53fe92239d80c2463ef7c',
  'backdrop sun-road': '331126057c156a62cce72e40',
  'backdrop sandspire': '9e95c4de752f54375ceda9e6',
  'backdrop dust-trail': '3463d074f3fe3e9a8c838f6e',
  'backdrop deep-shaft': '3496536c71e716f3fc3ea20e',
  'backdrop glass-heart': '35f4c6be1cff7bc658f5c9b2',
  'backdrop glass-flats': '2c83a8a04d24cf9449126581',
  'backdrop miragewell': '745642ef8b5226af0c131089',
  'backdrop scorchgate': '7c28fe83044da534eeffc1e3',
  'backdrop scorchgate-vaults': '8cdeb9bc135581b595026db9',
  'backdrop deep-shaft:dark': '9dfeb1a2629f025d23b6e302',
  'backdrop scorchgate-vaults:dark': '704d02b11dcff1fe14e78bda',
  'relic sandwalkers': '3e6b5ad97d206ad43b1089df',
  'relic zaras-orrery': '85c708dbca4aa8278a37e988',
  'relic wyrmscale': 'd0c8917057be6be4df920ead',
  'relic sunstone-lantern': 'b5dc38e5062e96b01c261174',
  'relic glass-carapace': 'a6948cc9fc276e4c67de7c7b',
  'relic dunebreaker': 'e829f51a1554f8f70d9d0e38',
  'relic cinderfang': 'e13856abb15db5a7733e16d9',
  'relic mirage-glass': '64d0ab0b03190cb331323bb9',
  'relic qasims-signet': 'f68b91af8f05d68e6c6db6bf',
  'relic sunstone-heart': 'aea44721b656cef36bfc1c4f',
  'relic scorchgate-key': '9a46293e0e77d6ad22bda0bf',
  'relic ashen-aegis': '094c3d7ff1997ddec6f6f97b',
  'relic cinder-crown': '4f32a8a980d4672cf27eb511',
  'relic saltglass': 'ecb5ea3a974bfaac5f9bb6a3',
  'hero warden m4': '974dbea434a41ed72815d209',
  'hero pip m4': '2bfc4424d495363977b0209b',
  'hero bryn m4': '1cfe69763a89f40fb5f16a18',
  'hero alondra m4': 'cc017f7b47d992c64b2189ea',
};
const pinnedM4 = (name, got) => { if (PIN) console.log(`  '${name}': '${got}',`); else assert.equal(got, PINNED_M4[name], `${name}: the M4 art changed`); };

test('every M4 foe, backdrop, relic and relic-dressed hero renders exactly as it shipped', () => {
  for (const key of M4_FOES) {
    const imgs = [];
    for (const [pose, t] of [['idle', .2], ['attack', .6], ['hurt', 0], ['ko', 0]]) for (const gearTier of [0, 3]) imgs.push(renderFoe(key, { pose, t, gearTier }));
    if (FOE_ART[key].relics) for (const phase of [2, 3]) { imgs.push(renderFoe(key, { phase, broken: [FOE_ART[key].relics[0]], t: .3 })); imgs.push(renderFoe(key, { phase, broken: [FOE_ART[key].relics[1]], t: .3, pose: 'attack' })); }
    if (FOE_ART[key].relic) imgs.push(renderFoe(key, { relicHeld: false, t: .3 }));
    pinnedM4('foe ' + key, hashOf(imgs));
  }
  { const imgs = []; for (const relic of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) for (const [pose, t] of [['idle', 1.3], ['attack', .6]]) imgs.push(renderFoe('tamsin', { relic, gearTier: 4, pose, t })); pinnedM4('foe tamsin kindled', hashOf(imgs)); }
  for (const key of M4_BACKDROPS) pinnedM4('backdrop ' + key, hashOf([renderBackdrop(key, { t: 1.3 }), renderBackdrop(key, { w: 120, h: 104, t: .7 })]));
  for (const id of M4_RELICS) {
    const R = RELICS[id], imgs = [];
    for (const o of [{ temper: 0 }, { temper: 2 }, { temper: 5 }, { temper: 8 }, { temper: 10 }, { gems: ['sunstone', 'glass-pearl'] }, { deeds: { 'first-blood': 1 } }, { deeds: { 'first-blood': 1 }, awakened: 'a' }, { deeds: { 'first-blood': 1 }, awakened: 'b' }]) {
      const item = Object.assign({ uid: 'u', base: id, kind: R.kind, rarity: 'heirloom', aspect: R.aspect, seed: 1, temper: 0, gems: [] }, o);
      imgs.push(itemPortrait(item, { t: 1.3 }), itemIcon(item));
    }
    pinnedM4('relic ' + id, hashOf(imgs));
  }
  const kits = [['warden', { weapon: 'cinderfang', offhand: 'ashen-aegis', head: 'cinder-crown', body: 'glass-carapace', feet: 'sandwalkers', ring: 'scorchgate-key' }], ['pip', { weapon: 'saltglass', amulet: 'mirage-glass', ring: 'qasims-signet' }], ['bryn', { weapon: 'dunebreaker', offhand: 'wyrmscale', amulet: 'zaras-orrery' }], ['alondra', { weapon: 'cinderfang', offhand: 'sunstone-lantern', amulet: 'sunstone-heart' }]];
  for (const [hero, gear] of kits) pinnedM4('hero ' + hero + ' m4', hashOf([renderHero(hero, gear, { pose: 'idle', t: .1 }), renderHero(hero, gear, { pose: 'attack', t: .62 })]));
});
