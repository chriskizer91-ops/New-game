// The Gloomfen's battle and item art (M6 P6): the two Champions draw their pieces until they are snapped off (and the
// Leviathan dives), the relic-bearers carry their relics until taken, Hodge sits down on his stool at 0 HP, the
// humanoids show their gear tiers, Tamsin wears the Bogstriders on Rotbridge, the fourteen relics are drawn (no stand-in
// left), the twelve backdrops are painted (the Mother's Hollow and the Drowned Belfry read dark with their lamps and the
// Sleeper still lit; the Lanternfen and the Misthollow Ruins drift with mist), Rotting and Hexed have icons of their own,
// and the M5 art renders pixel for pixel as it shipped (the pinned hashes below were taken from the M5 art before any M6
// change). `AETH_PIN=1 node --test test/art-gloomfen.test.mjs` prints the hashes instead of checking them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

globalThis.ImageData ??= class ImageData {
  constructor(d, w, h) { if (typeof d === 'number') { h = w; w = d; d = new Uint8ClampedArray(w * h * 4); } this.data = d; this.width = w; this.height = h; }
};
const { FOES } = await import('../src/data/foes.js');
const { RELICS } = await import('../src/data/relics.js');
const { ENCOUNTERS } = await import('../src/data/encounters.js');
const { FOE_ART, renderFoe } = await import('../src/art/foes.js');
const { BACKDROPS, renderBackdrop, ambient } = await import('../src/art/scenes.js');
const { RELIC_ART, itemPortrait, itemIcon } = await import('../src/art/item-looks.js');
const { renderHero } = await import('../src/art/hero-looks.js');
const { statusIcon, lockIcon, gemIcon } = await import('../src/art/icons.js');

const PIN = !!process.env.AETH_PIN;
const hashOf = imgs => { const h = createHash('sha256'); for (const im of imgs) { h.update(`${im.width}x${im.height}`); h.update(im.data); } return h.digest('hex').slice(0, 24); };
const mean = img => { let s = 0; for (let i = 0; i < img.data.length; i += 4) s += img.data[i] * .3 + img.data[i + 1] * .59 + img.data[i + 2] * .11; return s / (img.data.length / 4); };
const differ = (a, b) => { let n = 0; for (let i = 0; i < a.data.length; i += 4) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) n++; return n; };

const GLOOM_RELICS = ['unfair-toll', 'bogstriders', 'weeping-bow', 'willow-ward', 'hag-stone', 'lamplighters-lantern', 'mourning-veil', 'salvagers-helm', 'cantors-staff', 'gar-tooth', 'barge-gauntlets', 'corvus-harpoon', 'deep-pearl', 'hexbane-shawl'];
const GLOOM_BACKDROPS = ['murkway', 'willowmurk', 'rotbridge', 'bogmire', 'lanternfen', 'mothers-hollow', 'long-boardwalk', 'misthollow', 'drowned-belfry', 'blackwater-reach', 'tidal-flats', 'causeway'];

test('the Gloomfen Champions draw each piece until it is snapped off, in every phase and pose; the Leviathan dives', () => {
  for (const key of ['lantern-mother', 'blackwater-leviathan']) {
    const def = FOE_ART[key], pieces = def.relics;
    assert.equal(def.phases, 3, `${key} has three phases`);
    assert.deepEqual([...pieces].sort(), [...FOES[key].relics].sort(), `${key}: the art's pieces are the data's relics`);
    for (const piece of pieces) assert.ok(RELIC_ART[piece] && !RELIC_ART[piece].stub, `${key}: ${piece} is drawn from its own relic art`);
    for (const phase of [1, 2, 3]) for (const broken of [[], [pieces[0]], [pieces[1]], pieces]) for (const pose of ['idle', 'attack', 'hurt', 'ko']) {
      const img = renderFoe(key, { phase, broken, pose, t: .3 });
      assert.equal(img.width, 96); assert.equal(img.height, 96);
      assert.equal((img.anchors.relics || []).length, 2 - broken.length, `${key} phase ${phase} ${pose} broken ${broken}`);
      for (const a of ['foot', 'head', 'center']) assert.ok(img.anchors[a]?.every(Number.isFinite), `${key} ${pose}: anchor ${a}`);
    }
    assert.equal((renderFoe(key, { relicHeld: false }).anchors.relics || []).length, 0, `${key} relicHeld:false`);
    // snapping a piece off changes the picture, and each phase looks its own
    const whole = renderFoe(key, { phase: 2, t: .3 });
    for (const piece of pieces) assert.ok(differ(whole, renderFoe(key, { phase: 2, broken: [piece], t: .3 })) > 20, `${key}: ${piece} snapped off shows`);
    assert.ok(differ(renderFoe(key, { phase: 1, t: .3 }), renderFoe(key, { phase: 3, t: .3 })) > 100, `${key}: the phases differ`);
  }
  // the Leviathan's dive (burrowed): only its fluke and the whirlpool are left above the water
  assert.equal(FOE_ART['blackwater-leviathan'].dive, true);
  const up = renderFoe('blackwater-leviathan', { t: .3 }), down = renderFoe('blackwater-leviathan', { pose: 'dive', t: .3 });
  const opaque = img => { let n = 0; for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 128) n++; return n; };
  assert.ok(opaque(down) < opaque(up) * .6, 'diving, most of it is under the water');
  assert.ok(down.anchors.center?.every(Number.isFinite));
});

test('the Gloomfen relic-bearers carry their relic until it is taken', () => {
  const bearers = { 'old-jaws': 'gar-tooth', 'grandfather-willow': 'weeping-bow', 'drowned-cantor': 'cantors-staff', 'mother-grue': 'hag-stone', hodge: 'unfair-toll', 'salvage-master': 'salvagers-helm', bargemaster: 'barge-gauntlets' };
  for (const [key, relic] of Object.entries(bearers)) {
    const def = FOE_ART[key];
    assert.equal(def.relic, relic, `${key} carries ${relic}`);
    assert.ok(RELIC_ART[relic] && !RELIC_ART[relic].stub, `${relic} has its own art`);
    const held = renderFoe(key, { t: 1 }), taken = renderFoe(key, { t: 1, relicHeld: false });
    assert.ok(held.anchors.relic?.every(Number.isFinite), `${key}: the relic has a glint point`);
    assert.ok(!taken.anchors.relic, `${key}: no glint once it is taken`);
    assert.notDeepEqual(taken.data, held.data, `${key}: taking the relic changes the picture`);
  }
  // every variant the data names draws as its own art, not a stand-in
  for (const f of Object.values(FOES)) for (const v of [f].concat(Object.values(f.variants || {}))) if (v.art && FOE_ART[v.art]) assert.ok(!FOE_ART[v.art].standIn, `${v.art} is drawn`);
});

test('Hodge does not fall down at 0 HP: he sits on his stool', () => {
  const ko = renderFoe('hodge', { pose: 'ko', gearTier: 3 }), lying = renderFoe('bandit', { pose: 'ko', gearTier: 3 });
  const rise = img => img.anchors.foot[1] - img.anchors.head[1];
  assert.ok(rise(ko) > 20, `Hodge's head stays well above his feet (${rise(ko)})`);
  assert.ok(rise(lying) < rise(ko) - 10, 'a beaten bandit lies down; Hodge sits');
  assert.ok(ko.anchors.relic?.every(Number.isFinite), 'the toll still hangs round his neck');
});

test('the Gloomfen humanoids show gear tiers 0-3; Tamsin wears the Bogstriders on Rotbridge', () => {
  for (const key of ['bog-hag', 'mother-grue', 'hodge', 'salvage-master', 'bargemaster', 'reedcutter', 'salvage-diver', 'bargehand']) {
    const def = FOE_ART[key];
    assert.equal(def.kind, 'humanoid', `${key} is on the rig`);
    assert.equal(def.gear.length, 4, `${key}: four gear tiers`);
    const tiers = [0, 1, 2, 3].map(gearTier => hashOf([renderFoe(key, { gearTier, t: .2 })]));
    assert.equal(new Set(tiers).size, 4, `${key}: each gear tier looks its own`);
  }
  const base = { gearTier: 4, variant: 'hearthbrand', relic: 'hearthbrand', t: .2 };
  const plain = renderFoe('tamsin', base), shod = renderFoe('tamsin', { ...base, wears: 'bogstriders' });
  assert.notDeepEqual(shod.data, plain.data, 'the Bogstriders show on her feet');
  assert.equal((shod.anchors.relics || []).length, (plain.anchors.relics || []).length + 1, 'and they glint');
  // wears is its own cache entry: the plain look is unchanged after the shod one
  assert.deepEqual(renderFoe('tamsin', base).data, plain.data);
});

test('the fourteen Gloomfen relics are drawn (no stand-in left), each its own look, on the card and in the bag', () => {
  for (const id of GLOOM_RELICS) {
    assert.ok(RELICS[id], `${id} is a relic`);
    const art = RELIC_ART[id];
    assert.ok(art && !art.stub, `${id} is drawn, not a stand-in`);
    const item = { uid: 'u', base: id, kind: RELICS[id].kind, rarity: 'heirloom', aspect: RELICS[id].aspect, seed: 1, temper: 0, gems: [] };
    assert.equal(itemPortrait(item, { t: 1.3 }).width, 64); assert.ok(itemIcon(item));
    assert.equal(itemPortrait({ ...item, temper: 7, gems: RELICS[id].sockets ? ['bog-amber', null] : [] }, { t: 1.3, size: 96 }).width, 96);
  }
  const looks = new Set(GLOOM_RELICS.map(id => hashOf([itemPortrait(id, { t: 1.3 })])));
  assert.equal(looks.size, GLOOM_RELICS.length, 'no two look alike');
});

test('the twelve Gloomfen backdrops are painted; the Hollow and the Belfry read dark; the foggy ones drift with mist', () => {
  for (const k of GLOOM_BACKDROPS) {
    assert.ok(BACKDROPS[k]?.name, `BACKDROPS lists ${k}`);
    const img = renderBackdrop(k, { t: 1.3 });
    assert.equal(img.width, 160); assert.equal(img.height, 96);
    assert.ok(mean(img) > 8, `${k} is painted`);
    assert.ok(mean(renderBackdrop(k, { t: 1.3, dark: true })) < mean(img), `${k}: its dark treatment is darker`);
    assert.ok(ambient(k, 1.3).length > 0, `${k} has its ambient motes`);
    assert.ok(renderBackdrop(k, { w: 120, h: 104, t: .7 }), `${k} renders at another size`);
  }
  // every Gloomfen encounter's backdrop, and each dark one reads dark
  for (const e of Object.values(ENCOUNTERS)) if (e.region === 'gloomfen') { assert.ok(BACKDROPS[e.backdrop], `${e.id}: ${e.backdrop}`); if (e.dark) assert.ok(mean(renderBackdrop(e.backdrop, { t: 1, dark: true })) < 40, `${e.id} is dark`); }
  for (const k of ['mothers-hollow', 'drowned-belfry']) {
    assert.ok(BACKDROPS[k + ':dark']?.dark, `${k} has a dark listing`);
    assert.ok(mean(renderBackdrop(k + ':dark', { t: 1 })) < 40, `${k}:dark reads dark`);
  }
  const count = (img, y0, test) => { let n = 0; for (let y = y0; y < img.height; y++) for (let x = 0; x < img.width; x++) { const i = (y * img.width + x) * 4; if (test(img.data[i], img.data[i + 1], img.data[i + 2])) n++; } return n; };
  // in the dark the Mother's lamps stay lit (warm pixels), and the Sleeper's light under the Belfry's floor (violet)
  assert.ok(count(renderBackdrop('mothers-hollow:dark', { t: 1, reduced: true }), 0, (r, g, b) => r > 150 && r > b * 1.8) > 12, 'the lamps are lit in the dark');
  const gy = Math.round(96 * BACKDROPS['drowned-belfry'].horizon);
  assert.ok(count(renderBackdrop('drowned-belfry:dark', { t: 1, reduced: true }), gy, (r, g, b) => b > 80 && b > g * 1.3 && r > g) > 30, 'the Sleeper glows under the floor');
  // the mist drifts: the foggy listings change over time in their mist band far more than their lights alone would
  for (const k of ['lanternfen', 'misthollow']) {
    assert.equal(BACKDROPS[k].mist, true, `${k} is foggy`);
    const a = renderBackdrop(k, { t: 0 }), b = renderBackdrop(k, { t: 4 });
    assert.ok(differ(a, b) > 400, `${k}: the mist moves (${differ(a, b)} pixels)`);
    assert.ok(!BACKDROPS['long-boardwalk'].mist && !BACKDROPS.rotbridge.mist, 'only the foggy maps drift with mist');
  }
});

test('Rotting and Hexed have icons of their own, apart from Poisoned; the Gloomfen locks and Bog Amber are drawn', () => {
  const ids = ['poisoned', 'rotting', 'hexed', 'charmed', 'bleeding'];
  for (const size of [12, 24]) {
    const imgs = ids.map(id => statusIcon(id, { size }));
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) assert.ok(differ(imgs[i], imgs[j]) > size * 3, `${ids[i]} and ${ids[j]} look apart at ${size}px`);
  }
  for (const id of ['bog', 'fog', 'blackwater', 'witch-ward']) assert.notDeepEqual(lockIcon(id).data, lockIcon('no-such-lock').data, `${id} draws its own lock`);
  assert.notDeepEqual(gemIcon('bog-amber').data, gemIcon('no-such-gem').data, 'Bog Amber is drawn');
});

// ---- the M5 art is held as it shipped: hashes taken from the M5 art before any M6 change ----
const M5_FOES = ['brigand', 'rhune', 'cutter-chief', 'sawyer', 'rime-wolf', 'rockling', 'forge-spark', 'iron-sentinel', 'sentinel-captain', 'forgeborn', 'bellows', 'journeyman', 'peak-troll', 'old-horn', 'rime-wraith', 'drowned-abbess', 'choir-wraith', 'thunder-roc', 'mother-anvil', 'rime-abbot'];
const M5_BACKDROPS = ['rockslide-pass', 'peaks-veil', 'highfold', 'iron-stair', 'ironhold', 'ironhold-deeps', 'harrows-forge', 'stormwatch', 'frost-road', 'frostmere', 'frostmere-below', 'ironhold-deeps:dark', 'frostmere-below:dark'];
const M5_RELICS = ['windstep-boots', 'veilbell', 'ironwall', 'drowned-censer', 'ironvein-bracers', 'roc-feather-cloak', 'thanes-rune', 'trollhide-mantle', 'runestaff', 'anvil-heart', 'worldforge-hammer', 'cutters-pick', 'rime-crozier', 'hushweave-cowl'];
const PINNED_M5 = {
   'foe brigand': '86e4a727ea0c54f9a9ef923e',
   'foe rhune': 'd61892ff7503e734c7087af4',
   'foe cutter-chief': '28a4ac7bf35d5f2cb4ce471e',
   'foe sawyer': '2f0ef26e8ac831e106d2e3f2',
   'foe rime-wolf': '4e192c1ec2457cfd43291540',
   'foe rockling': '481b9e8f941acf40a130f97c',
   'foe forge-spark': 'c952135880c091bbf268e8b0',
   'foe iron-sentinel': 'f2997367c630f927b5430651',
   'foe sentinel-captain': '6df45cb6737a9852e924a1ec',
   'foe forgeborn': 'd5183072387bf0b5abcac21a',
   'foe bellows': 'f44403c55e65d1b0166e6f1b',
   'foe journeyman': 'b23fca455a58bf2e5be6091f',
   'foe peak-troll': '9548916a4c8216fa1c89ef4a',
   'foe old-horn': 'fd2162febdda2eb8068e828c',
   'foe rime-wraith': '3b1bd0983d74244b33e77565',
   'foe drowned-abbess': 'a66167a2b0f2decce7663b8a',
   'foe choir-wraith': 'f42ae1cc2b547822ac4f6085',
   'foe thunder-roc': 'd8ba0a23a2cc1c190fec5cab',
   'foe mother-anvil': '5782227503911791e94bbd83',
   'foe rime-abbot': '18956f5b3ec11fd9d5468dee',
   'foe tamsin ironhold': '2ab53fe92239d80c2463ef7c',
   'backdrop rockslide-pass': '9f4420a5e0a771f8ee74f4e5',
   'backdrop peaks-veil': '62cd9714a0c7add6e7981f73',
   'backdrop highfold': '17e62146a6f773e205a8b7e1',
   'backdrop iron-stair': 'b3b0634159de2b242ee3fff5',
   'backdrop ironhold': '486b5d8739747667f6a486cf',
   'backdrop ironhold-deeps': '24185e422f60516f37b5441b',
   'backdrop harrows-forge': '4c6e47cf6fec4268dde13b6c',
   'backdrop stormwatch': '948418312b6567f79eeca510',
   'backdrop frost-road': 'd824adc98872aab29e996ca8',
   'backdrop frostmere': '280a9be212ecf17acf2546fd',
   'backdrop frostmere-below': 'bc05af6975ac51faa68c45ff',
   'backdrop ironhold-deeps:dark': '53ac75fe0c83b9b2b48954a8',
   'backdrop frostmere-below:dark': '2e267b598878ae409249b452',
   'relic windstep-boots': '6b7a2ff2d7ad3ea85a711721',
   'relic veilbell': 'ff1c97063ab2d410b1abdc1d',
   'relic ironwall': 'b93dcceaa05b93f016ae80fa',
   'relic drowned-censer': 'cb7a11a3654a423055574093',
   'relic ironvein-bracers': 'c8d0f3edbaa4ea4881c330c8',
   'relic roc-feather-cloak': '3d6180b7ae696599ff022624',
   'relic thanes-rune': '254c0fe7c34f5feadf9aa482',
   'relic trollhide-mantle': 'fc64857ea01b12d6aea2d8df',
   'relic runestaff': '0828e1bad0b76260a6fc9cbc',
   'relic anvil-heart': 'ad6bb9fc89e311efdaefad42',
   'relic worldforge-hammer': 'fab8b429d4ad2f8795974231',
   'relic cutters-pick': '5614c39bd03ea71c7bb58fa2',
   'relic rime-crozier': '5843cdbdb98125ef45a160c8',
   'relic hushweave-cowl': '313f92ff6345acef32bf32e8',
   'hero warden m5': '8df9484b73ef6a4409ea335e',
   'hero pip m5': '6e3a59995616495e0eea4cfa',
   'hero bryn m5': 'c12b8ce1351444fe121b35e6',
   'hero alondra m5': 'c44efaaaa6a33c59bba4a67c',
};
const pinnedM5 = (name, got) => { if (PIN) console.log(`  '${name}': '${got}',`); else assert.equal(got, PINNED_M5[name], `${name}: the M5 art changed`); };

test('every M5 foe, backdrop, relic and relic-dressed hero renders exactly as it shipped', () => {
  for (const key of M5_FOES) {
    const imgs = [];
    for (const [pose, t] of [['idle', .2], ['attack', .6], ['hurt', 0], ['ko', 0]]) for (const gearTier of [0, 3]) imgs.push(renderFoe(key, { pose, t, gearTier }));
    if (FOE_ART[key].relics) for (const phase of [2, 3]) { imgs.push(renderFoe(key, { phase, broken: [FOE_ART[key].relics[0]], t: .3 })); imgs.push(renderFoe(key, { phase, broken: [FOE_ART[key].relics[1]], t: .3, pose: 'attack' })); }
    if (FOE_ART[key].relic) imgs.push(renderFoe(key, { relicHeld: false, t: .3 }));
    pinnedM5('foe ' + key, hashOf(imgs));
  }
  { const imgs = []; for (const relic of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) for (const [pose, t] of [['idle', 1.3], ['attack', .6]]) imgs.push(renderFoe('tamsin', { relic, variant: relic, gearTier: 4, pose, t })); pinnedM5('foe tamsin ironhold', hashOf(imgs)); }
  for (const key of M5_BACKDROPS) pinnedM5('backdrop ' + key, hashOf([renderBackdrop(key, { t: 1.3 }), renderBackdrop(key, { w: 120, h: 104, t: .7 })]));
  for (const id of M5_RELICS) {
    const R = RELICS[id], imgs = [];
    for (const o of [{ temper: 0 }, { temper: 2 }, { temper: 5 }, { temper: 8 }, { temper: 10 }, { gems: ['frost-opal', 'glass-pearl'] }, { deeds: { 'first-blood': 1 } }, { deeds: { 'first-blood': 1 }, awakened: 'a' }, { deeds: { 'first-blood': 1 }, awakened: 'b' }]) {
      const item = Object.assign({ uid: 'u', base: id, kind: R.kind, rarity: 'heirloom', aspect: R.aspect, seed: 1, temper: 0, gems: [] }, o);
      imgs.push(itemPortrait(item, { t: 1.3 }), itemIcon(item));
    }
    pinnedM5('relic ' + id, hashOf(imgs));
  }
  const kits = [['warden', { weapon: 'worldforge-hammer', offhand: 'ironwall', head: 'hushweave-cowl', body: 'trollhide-mantle', feet: 'windstep-boots', hands: 'ironvein-bracers' }], ['pip', { weapon: 'cutters-pick', amulet: 'anvil-heart', ring: 'thanes-rune' }], ['bryn', { weapon: 'runestaff', offhand: 'veilbell', body: 'roc-feather-cloak' }], ['alondra', { weapon: 'rime-crozier', offhand: 'drowned-censer' }]];
  for (const [hero, gear] of kits) pinnedM5('hero ' + hero + ' m5', hashOf([renderHero(hero, gear, { pose: 'idle', t: .1 }), renderHero(hero, gear, { pose: 'attack', t: .62 })]));
});
