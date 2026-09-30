// The Hearth Below's battle and item art (M7 P6): the Hollow Council (each hollowed, the gift glowing violet-black until it
// is snapped off, two phases), the Unsmith (three phase looks, his three pieces each gone when snapped off, the Thief
// hung with what he took), the cinder-thralls and their overseer, the unmade and the forge-warden in every pose and
// Waking gear tier, Tamsin's finale look drawn on the party's side (flipped), the four backdrops, the nine Page V relics
// and the Masterpiece's primal look, the two new intent dice, and the M6 art pixel for pixel as it shipped (the pinned
// hashes below were taken from the M6 art before any M7 change). `AETH_PIN=1 node --test test/art-below.test.mjs` prints
// the hashes instead of checking them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

globalThis.ImageData ??= class ImageData {
  constructor(d, w, h) { if (typeof d === 'number') { h = w; w = d; d = new Uint8ClampedArray(w * h * 4); } this.data = d; this.width = w; this.height = h; }
};
const { FOES } = await import('../src/data/foes.js');
const { RELICS } = await import('../src/data/relics.js');
const { ITEMS } = await import('../src/data/items.js');
const { ENCOUNTERS } = await import('../src/data/encounters.js');
const { ZONES } = await import('../src/data/world.js');
const { MASTERPIECE_BASES } = await import('../src/data/masterpiece.js');
const { FOE_ART, renderFoe, foeLooks } = await import('../src/art/foes.js');
const { BACKDROPS, renderBackdrop, ambient } = await import('../src/art/scenes.js');
const { RELIC_ART, itemArt, itemPortrait, itemIcon, gearLooks, RARITY_LOOK } = await import('../src/art/item-looks.js');
const { renderHero } = await import('../src/art/hero-looks.js');
const { INTENT_DIE, diceIcon } = await import('../src/art/icons.js');
const { MAT } = await import('../src/art/forge.js');

const PIN = !!process.env.AETH_PIN;
const hashOf = imgs => { const h = createHash('sha256'); for (const im of imgs) { h.update(`${im.width}x${im.height}`); h.update(im.data); } return h.digest('hex').slice(0, 24); };
const mean = img => { let s = 0; for (let i = 0; i < img.data.length; i += 4) s += img.data[i] * .3 + img.data[i + 1] * .59 + img.data[i + 2] * .11; return s / (img.data.length / 4); };
const differ = (a, b) => { let n = 0; for (let i = 0; i < a.data.length; i += 4) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) n++; return n; };
const count = (img, test) => { let n = 0; for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3] && test(img.data[i], img.data[i + 1], img.data[i + 2])) n++; return n; };
const violet = (r, g, b) => b > 150 && r > g * 1.3 && b > g * 1.5;

const COUNCIL = { 'hollow-miravel': 'hollow-wreath', 'hollow-qasim': 'hollow-chalice', 'hollow-brundar': 'hollow-gauntlet', 'hollow-gretch': 'hollow-chain' };
const BELOW_KEYS = ['cinder-thrall', 'thrall-overseer', 'unmade', 'forge-warden', ...Object.keys(COUNCIL), 'unsmith'];
const PAGE_V = ['fenwicks-poker', 'hollow-wreath', 'hollow-chalice', 'hollow-gauntlet', 'hollow-chain', 'tamsins-bargain', 'unmaking-hammer', 'ironvein-apron', 'worldforge-heart'];
const BELOW_BACKDROPS = ['hollow-hall', 'ash-stair', 'chained-deep', 'worldforge'];
const POSES = [['idle', 0], ['idle', .7], ['attack', .1], ['attack', .6], ['hurt', 0], ['ko', 0]];

test('every Hearth Below art key draws in every pose, gear tier and phase (the keys the families name, and the overseer)', () => {
  for (const key of BELOW_KEYS) {
    const def = FOE_ART[key];
    assert.ok(def && !def.standIn, `FOE_ART draws ${key}`);
    const w = def.kind === 'humanoid' ? 64 : def.w, h = def.kind === 'humanoid' ? 64 : def.h;
    for (const phase of [1, 2, 3]) for (const [pose, t] of POSES) for (const gearTier of [0, 3]) {
      const img = renderFoe(key, { pose, t, gearTier, phase });
      assert.equal(img.width, w, key); assert.equal(img.height, h, key);
      for (const a of ['foot', 'head', 'center']) assert.ok(img.anchors[a]?.every(Number.isFinite), `${key} ${pose} phase ${phase}: anchor ${a}`);
    }
    for (const flip of [false, true]) assert.ok(renderFoe(key, { flip, t: 1.1, reduced: true }), `${key} flip ${flip}`);
  }
  // the Waking shows on the three families: each gear tier looks its own
  for (const key of ['cinder-thrall', 'thrall-overseer', 'unmade', 'forge-warden']) assert.equal(new Set([0, 1, 2, 3].map(gearTier => hashOf([renderFoe(key, { gearTier, t: .2 })]))).size, 4, `${key}: four gear tiers`);
  // the overseer is its family's veteran, a head taller
  assert.ok(FOE_ART['thrall-overseer'].h > FOE_ART['cinder-thrall'].h);
  // the two new tiers the battle passes draw as a Champion's
  for (const [key, tier] of [...Object.keys(COUNCIL).map(k => [k, 'hollow']), ['unsmith', 'unsmith']]) assert.deepEqual(renderFoe(key, { tier, t: .3 }).data, renderFoe(key, { tier: 'champion', t: .3 }).data, `${key}: tier ${tier}`);
});

test('the Hollow Council: each hollowed, the gift drawn from its relic and glowing violet-black until it is snapped off, two phases', () => {
  for (const [key, gift] of Object.entries(COUNCIL)) {
    const def = FOE_ART[key];
    assert.equal(def.kind, 'humanoid', `${key} is on the rig, as their own look`);
    assert.deepEqual(def.relics, [gift], `${key} holds ${gift}`);
    assert.ok(FOES[key].relics.includes(gift), `${key}: the art's piece is the data's`);
    assert.ok(RELIC_ART[gift] && !RELIC_ART[gift].stub, `${gift} is drawn from its own relic art`);
    for (const phase of [1, 2]) for (const [pose, t] of POSES) {
      const held = renderFoe(key, { phase, pose, t }), snapped = renderFoe(key, { phase, pose, t, broken: [gift] });
      assert.equal((held.anchors.relics || []).length, 1, `${key} phase ${phase} ${pose}: the gift glints`);
      assert.equal((snapped.anchors.relics || []).length, 0, `${key} phase ${phase} ${pose}: the gift is gone`);
    }
    const on = renderFoe(key, { t: .3 }), off = renderFoe(key, { t: .3, broken: [gift] }), taken = renderFoe(key, { t: .3, relicHeld: false });
    assert.ok(differ(on, off) > 20, `${key}: snapping the gift off shows`);
    assert.deepEqual(taken.data, off.data, `${key}: relicHeld false is the same as the gift snapped off`);
    assert.ok(count(on, violet) > count(off, violet) + 8, `${key}: the violet light goes out with the gift`);
    assert.ok(differ(renderFoe(key, { phase: 1, t: .3 }), renderFoe(key, { phase: 2, t: .3 })) > 20, `${key}: the second phase looks its own`);
    // the walker rig can read them too: grey skin while the gift holds, their own gift in its slot
    const L = foeLooks(key);
    assert.ok(L.H && /^m7\.hollow\./.test(L.H.skin), `${key}: grey skin (${L.H.skin})`);
  }
});

test('the Unsmith: three phase looks, his three pieces drawn from their relics and gone once snapped off, the Thief hung with what he took', () => {
  const def = FOE_ART.unsmith, pieces = def.relics;
  assert.equal(def.phases, 3); assert.equal(def.w, 96); assert.equal(def.h, 96);
  assert.deepEqual([...pieces].sort(), [...FOES.unsmith.relics].sort(), 'the art\'s pieces are the data\'s relics');
  for (const piece of pieces) assert.ok(RELIC_ART[piece] && !RELIC_ART[piece].stub, `${piece} is drawn from its own relic art`);
  const combos = [[], ...pieces.map(p => [p]), [pieces[0], pieces[1]], pieces];
  for (const phase of [1, 2, 3]) for (const broken of combos) for (const [pose, t] of POSES) {
    const img = renderFoe('unsmith', { phase, broken, pose, t });
    assert.equal((img.anchors.relics || []).length, 3 - broken.length, `phase ${phase} ${pose} broken ${broken}`);
  }
  assert.equal((renderFoe('unsmith', { relicHeld: false }).anchors.relics || []).length, 0, 'relicHeld: false');
  for (const piece of pieces) for (const phase of [1, 3]) assert.ok(differ(renderFoe('unsmith', { phase, t: .3 }), renderFoe('unsmith', { phase, t: .3, broken: [piece] })) > 20, `${piece} snapped off shows in phase ${phase}`);
  const p = [1, 2, 3].map(phase => renderFoe('unsmith', { phase, t: .3 }));
  assert.ok(differ(p[0], p[1]) > 60 && differ(p[1], p[2]) > 60 && differ(p[0], p[2]) > 60, 'the Smith, the Thief and the Worldforge each look their own');
  // the Thief: glinting stolen things (the relics he took, when the battle screen names them), and never in the other phases
  const thief = renderFoe('unsmith', { phase: 2, t: .3 }), named = renderFoe('unsmith', { phase: 2, t: .3, stolen: ['hearthbrand', 'mire-pearl', 'wardens-seal'] });
  assert.equal(thief.anchors.glints.length, 6, 'six stolen things when none are named');
  assert.equal(named.anchors.glints.length, 3, 'the three he took');
  assert.ok(differ(thief, named) > 20, 'what he took is what shows');
  // M7 (lead): an empty list is what he took when the Warden claimed everything: no stolen things hang on him at all
  const none = renderFoe('unsmith', { phase: 2, t: .3, stolen: [] });
  assert.ok(!(none.anchors.glints || []).length, 'he took nothing, and wears nothing stolen');
  assert.ok(differ(none, thief) > 20, 'unlike the glint of stolen things when the battle does not say');
  assert.ok(!renderFoe('unsmith', { phase: 1, t: .3, stolen: ['hearthbrand'] }).anchors.glints && !renderFoe('unsmith', { phase: 3, t: .3 }).anchors.glints, 'only the Thief wears them');
  // the Worldforge: the heart burning in his chest (molten light there); gone cold once the heart is snapped out
  const hot = (r, g, b) => r > 230 && g > 150 && b < 170;
  assert.ok(count(p[2], hot) > count(p[0], hot) + 10, 'the heart burns in his chest in phase 3');
  assert.ok(count(renderFoe('unsmith', { phase: 3, t: .3, broken: ['worldforge-heart'] }), hot) < count(p[2], hot), 'and goes cold when it is taken');
  // beaten, he goes down on one knee and looks up: his head stays well above the floor
  const ko = renderFoe('unsmith', { pose: 'ko' });
  assert.ok(ko.anchors.foot[1] - ko.anchors.head[1] > 40, 'he kneels, he does not lie down');
});

test('the Unsmith as the Smith reads as a face and shoulders too (his dialogue portrait): Hilda\'s copper going grey at the temple, a clean face, the broken-ring clasp', () => {
  const img = renderFoe('unsmith', { phase: 1, t: 0, reduced: true }), [hx, hy] = img.anchors.head;
  const px = (x, y) => { const i = (y * img.width + x) * 4; return img.data[i + 3] ? `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}` : null; };
  const of = k => new Set(MAT[k].pal.map(c => c.join(',')));
  const tally = (x0, y0, x1, y1, keys, keep = () => true) => { const sets = keys.map(of), n = keys.map(() => 0); for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++) { const p = px(x, y); if (p && keep(x, y)) sets.forEach((s, i) => { if (s.has(p)) n[i]++; }); } return n; };
  // the head and shoulders round the head anchor: his sister's copper hair and beard, grey only at the temple, no soot on the face
  const [copper, silver, char] = tally(hx - 10, hy - 10, hx + 12, hy + 14, ['hairCopper', 'hairSilver', 'char']);
  assert.ok(copper > 60 && copper > silver * 6, `copper hair and beard (${copper} copper, ${silver} grey)`);
  assert.ok(silver >= 4, 'going grey at the temple');
  assert.ok(char <= 2, `a clean face (${char} soot pixels)`);
  // the clasp at his throat, the hammer-in-a-broken-ring struck in it: bronze with the dark mark inside
  const [bronze, dark] = tally(47, 27, 57, 37, ['bronze', 'dark'], (x, y) => Math.hypot(x + .5 - 51.6, y + .5 - 31.6) <= 3.3);
  assert.ok(bronze >= 10 && dark >= 8, `the clasp and its mark (${bronze} bronze, ${dark} dark)`);
});

test('Tamsin at the finale: gear tier 5 with the Bargain in her hand, and drawn flipped she faces the foes from the party\'s side', () => {
  const o = { relic: 'tamsins-bargain', gearTier: 5, t: .3 };
  const right = renderFoe('tamsin', o), left = renderFoe('tamsin', { ...o, flip: true });
  assert.equal(FOE_ART.tamsin.gear.length, 6, 'tiers 0-4 as they were, and the finale');
  assert.ok(right.anchors.relics?.length >= 2, 'the Bargain and the Vale Gauntlets glint');
  assert.ok(count(right, violet) > 10, 'the Bargain is violet-black');
  // flipped: a mirror of the geometry (the light stays top-left), every anchor mirrored
  for (const k of ['foot', 'head', 'center', 'weaponTip']) assert.ok(Math.abs(left.anchors[k][0] - (64 - right.anchors[k][0])) <= 1 && left.anchors[k][1] === right.anchors[k][1], `${k} mirrored`);
  assert.ok(left.anchors.weaponTip[0] < left.anchors.center[0] && right.anchors.weaponTip[0] > right.anchors.center[0], 'her blade points at the foes either way');
  for (const [pose, t] of POSES) assert.equal(renderFoe('tamsin', { ...o, pose, t, flip: true }).width, 64);
  // her finale look is its own: not her kindled Scorchgate kit
  assert.ok(differ(right, renderFoe('tamsin', { ...o, gearTier: 4 })) > 40);
});

test('the four Hearth Below backdrops are painted, each with its ambient; darker in the dark; every Act III backdrop listed', () => {
  for (const k of BELOW_BACKDROPS) {
    assert.ok(BACKDROPS[k]?.name, `BACKDROPS lists ${k}`);
    const img = renderBackdrop(k, { t: 1.3 });
    assert.equal(img.width, 160); assert.equal(img.height, 96);
    assert.ok(mean(img) > 8, `${k} is painted`);
    assert.ok(mean(renderBackdrop(k, { t: 1.3, dark: true })) < mean(img), `${k}: its dark treatment is darker`);
    assert.ok(ambient(k, 1.3).length > 0, `${k} has its ambient motes`);
    assert.ok(differ(renderBackdrop(k, { t: 0 }), renderBackdrop(k, { t: 2.2 })) > 10, `${k}: its lights and motes move`);
    assert.equal(renderBackdrop(k, { w: 120, h: 104, t: .7 }).width, 120);
  }
  assert.equal(new Set(BELOW_BACKDROPS.map(k => hashOf([renderBackdrop(k, { t: 1.3, reduced: true })]))).size, 4, 'no two alike');
  // the Hollow Hall's chair glows violet-black; the Worldforge's mouth burns white-gold
  const lit = (r, g, b) => b > 110 && b > r && r > g * 1.3; // a backdrop's lights are blended over it, so its violet is dimmer than a sprite's
  assert.ok(count(renderBackdrop('hollow-hall', { t: 1, reduced: true }), lit) > 15, 'the chair glows violet');
  assert.ok(count(renderBackdrop('worldforge', { t: 1, reduced: true }), (r, g, b) => r > 240 && g > 220 && b > 150) > 20, 'the Worldforge burns');
  for (const e of Object.values(ENCOUNTERS)) if (e.region === 'below') assert.ok(BACKDROPS[e.backdrop], `${e.id}: ${e.backdrop}`);
  assert.ok(BACKDROPS[ZONES['ash-stair'].backdrop], 'the Ash Stair zone');
});

test('the nine Page V relics are drawn (no stand-in left), each its own look, on the card, in the bag and on a hero; the primal ones burn', () => {
  for (const id of PAGE_V) {
    const R = RELICS[id], art = RELIC_ART[id];
    assert.ok(R && art && !art.stub, `${id} is drawn, not a stand-in`);
    assert.equal(art.r, R.kind === 'gauntlets' ? 'gauntlets' : R.kind, `${id}: its art is a ${R.kind}`);
    const item = { uid: 'u', base: id, kind: R.kind, rarity: R.rarity, aspect: R.aspect, seed: 1, temper: 0, gems: [] };
    assert.equal(itemPortrait(item, { t: 1.3 }).width, 64); assert.equal(itemPortrait(item, { t: 1.3, size: 96 }).width, 96); assert.ok(itemIcon(item));
    for (const o of [{ temper: 10 }, { gems: ['sunstone', 'glass-pearl'] }, { deeds: { claim: 1 }, awakened: 'b' }]) assert.ok(itemPortrait({ ...item, ...o }, { t: .6 }));
    const slot = R.slot, hero = renderHero('warden', { [slot]: id }, { pose: 'attack', t: .62 });
    assert.equal(hero.width, 64, `${id} on a hero`);
    assert.ok(gearLooks({ [slot]: id })[slot], `${id}: the rig has a look for it`);
  }
  assert.equal(new Set(PAGE_V.map(id => hashOf([itemPortrait(id, { t: 1.3 })]))).size, PAGE_V.length, 'no two look alike');
  for (const id of ['fenwicks-poker', 'worldforge-heart']) assert.equal(RELICS[id].rarity, 'primal');
  // violet-black regalia: the gifts and the Bargain glow violet on the card
  for (const id of ['hollow-wreath', 'hollow-chalice', 'hollow-gauntlet', 'hollow-chain', 'tamsins-bargain']) assert.ok(count(itemPortrait(id, { t: 1.3, reduced: true }), violet) > 6, `${id} glows violet`);
});

test('the Masterpiece: a generated primal weapon of every base Hilda offers draws on the card, in the bag and in the hand', () => {
  assert.ok(RARITY_LOOK.primal.flame, 'the primal card burns with its white flame');
  const looks = new Set();
  for (const base of MASTERPIECE_BASES) {
    const B = ITEMS[base], item = { uid: 'm', base, kind: B.kind, slot: B.slot, rarity: 'primal', name: 'Hearthsong', aspect: 'ember', seed: 1234567, temper: 0, gems: [], masterpiece: true };
    const art = itemArt(item);
    assert.ok(art && art.rarity === 'primal', `${base}: a primal ${B.kind}`);
    assert.equal(itemPortrait(item, { t: 1.3, size: 96 }).width, 96); assert.ok(itemIcon(item));
    assert.equal(renderHero('warden', { weapon: item }, { pose: 'attack', t: .62 }).width, 64);
    looks.add(hashOf([itemPortrait(item, { t: 1.3, reduced: true })]));
  }
  assert.equal(looks.size, MASTERPIECE_BASES.length, 'each base its own');
});

test('the two new intent dice: the Hollow Council\'s smoky violet d20 (apart from the Champion\'s amethyst) and the Unsmith\'s forge-iron pair', () => {
  for (const tier of ['hollow', 'unsmith']) {
    const d = INTENT_DIE[tier];
    assert.ok(d && d.sides === 20, `${tier}: a d20`);
    const img = diceIcon(d.sides, { value: 17, mat: d.mat });
    assert.equal(img.width, 20);
    assert.ok(differ(img, diceIcon(20, { value: 17, mat: INTENT_DIE.champion.mat })) > 40, `${tier}: not the Champion's die`);
    assert.ok(differ(img, diceIcon(20, { value: 17, mat: 'bone' })) > 40, `${tier}: its own material (registered)`);
  }
  assert.ok(differ(diceIcon(20, { value: 5, mat: INTENT_DIE.hollow.mat }), diceIcon(20, { value: 5, mat: INTENT_DIE.unsmith.mat })) > 40);
});

// ---- the M6 art is held as it shipped: hashes taken from the M6 art before any M7 change ----
const M6_FOES = ['mire-leech', 'marsh-light', 'lamp-moth', 'blackwater-gar', 'old-jaws', 'willow-wight', 'grandfather-willow', 'drowned', 'bell-ringer', 'drowned-choir', 'drowned-cantor', 'lantern-mother', 'blackwater-leviathan', 'bog-hag', 'mother-grue', 'hodge', 'salvage-master', 'bargemaster', 'reedcutter', 'salvage-diver', 'bargehand'];
const M6_BACKDROPS = ['murkway', 'willowmurk', 'rotbridge', 'bogmire', 'lanternfen', 'mothers-hollow', 'long-boardwalk', 'misthollow', 'drowned-belfry', 'blackwater-reach', 'tidal-flats', 'causeway', 'mothers-hollow:dark', 'drowned-belfry:dark'];
const M6_RELICS = ['unfair-toll', 'bogstriders', 'weeping-bow', 'willow-ward', 'hag-stone', 'lamplighters-lantern', 'mourning-veil', 'salvagers-helm', 'cantors-staff', 'gar-tooth', 'barge-gauntlets', 'corvus-harpoon', 'deep-pearl', 'hexbane-shawl'];
const PINNED_M6 = {
  'foe mire-leech': '12763f840108a054e7049c9c',
  'foe marsh-light': 'ea611e20cb724f6036141a45',
  'foe lamp-moth': '215d6ed65b1afd420635fef5',
  'foe blackwater-gar': '909c0b8a7fbdf184e9c404ac',
  'foe old-jaws': '91eaf2014aba0927aad28b29',
  'foe willow-wight': '730031ef793c5332d37bc08b',
  'foe grandfather-willow': '1e999683894babc49698763d',
  'foe drowned': '34c78945974b38d39226d9c3',
  'foe bell-ringer': '9bfae43b0fd62f9af1da2f3d',
  'foe drowned-choir': '677f5115fd9741ea4e6ebd5b',
  'foe drowned-cantor': '885d380bd75179f10f7095fc',
  'foe lantern-mother': 'e99815b58e0b2ffd28d78cd7',
  'foe blackwater-leviathan': '2b3bcaabae85def554686ed1',
  'foe bog-hag': '804afaf349e1a189be784a8d',
  'foe mother-grue': '543fc057f2e54d7671cb0428',
  'foe hodge': '15e61aafaa606d98dbfac994',
  'foe salvage-master': 'a7a0e4cb97495045804a785b',
  'foe bargemaster': '41289f9295d4a82636882a80',
  'foe reedcutter': 'aedb01045db4cb437290c62e',
  'foe salvage-diver': 'cc295e8612d1c55eb157b6fb',
  'foe bargehand': 'e508d9b392aa11cf825996be',
  'foe tamsin rotbridge': '7abb4854b1cfc377e92045d3',
  'backdrop murkway': 'f4019fef9af1feb1e58f7508',
  'backdrop willowmurk': 'effdf6ece5fa94f3b2da3510',
  'backdrop rotbridge': 'e10607e41026827b85702f99',
  'backdrop bogmire': 'abcbd136b10e93c9ce0598ee',
  'backdrop lanternfen': '90b0c6cb0760d7836faa3535',
  'backdrop mothers-hollow': 'fc539bb5ec850a21cbfa9298',
  'backdrop long-boardwalk': 'b9066313ae415733cd00331f',
  'backdrop misthollow': '24e1371157e5e2a3a7168f5e',
  'backdrop drowned-belfry': '9c873626ff6a21bf9871c87e',
  'backdrop blackwater-reach': '6fbe7b70a95e02d0999fca79',
  'backdrop tidal-flats': '18536a9588c017981a59ae26',
  'backdrop causeway': '8e6034b80f8f796df02157af',
  'backdrop mothers-hollow:dark': '6ce38d8d37fa3090dc27396b',
  'backdrop drowned-belfry:dark': '0e03a95b7959fd6ddcf764c7',
  'relic unfair-toll': 'a1b4e13b8395c45ba800e877',
  'relic bogstriders': 'c4403dfb2b360fb078775d49',
  'relic weeping-bow': '6503da1eb549dfe4f1a2a8c2',
  'relic willow-ward': '541c7a4680878a787c54bae4',
  'relic hag-stone': 'e5132652eb2b6b1c4723285a',
  'relic lamplighters-lantern': '8aa0ed1a3b8148d131e01d20',
  'relic mourning-veil': '9d2fa949b66d832dd89a097a',
  'relic salvagers-helm': 'a14483f0b86df20d6706009d',
  'relic cantors-staff': '23004889166a8c46894160ae',
  'relic gar-tooth': 'a360a6ea3dd274d38b81cbcf',
  'relic barge-gauntlets': '4a0744a1b52632eb7da265ad',
  'relic corvus-harpoon': '577ede445750aeefbd8dc361',
  'relic deep-pearl': '8ecb51d95d1b585b2c934ef2',
  'relic hexbane-shawl': 'f5cf2289603122812febb058',
  'hero warden m6': '93645ba183c2f6efe9cbcd42',
  'hero pip m6': '46db0462bec3a08a6cc9667f',
  'hero bryn m6': '7e42c2b6a3e4ff1b82adb785',
  'hero alondra m6': 'e1a4c338b9105b2346e18757',
};
const pinnedM6 = (name, got) => { if (PIN) console.log(`  '${name}': '${got}',`); else assert.equal(got, PINNED_M6[name], `${name}: the M6 art changed`); };

test('every M6 foe, backdrop, relic and relic-dressed hero renders exactly as it shipped', () => {
  for (const key of M6_FOES) {
    const imgs = [];
    for (const [pose, t] of [['idle', .2], ['attack', .6], ['hurt', 0], ['ko', 0]]) for (const gearTier of [0, 3]) imgs.push(renderFoe(key, { pose, t, gearTier }));
    if (FOE_ART[key].relics) for (const phase of [2, 3]) { imgs.push(renderFoe(key, { phase, broken: [FOE_ART[key].relics[0]], t: .3 })); imgs.push(renderFoe(key, { phase, broken: [FOE_ART[key].relics[1]], t: .3, pose: 'attack' })); }
    if (FOE_ART[key].relic) imgs.push(renderFoe(key, { relicHeld: false, t: .3 }));
    if (FOE_ART[key].dive) imgs.push(renderFoe(key, { pose: 'dive', t: .3 }), renderFoe(key, { pose: 'dive', phase: 3, t: .3 }));
    pinnedM6('foe ' + key, hashOf(imgs));
  }
  { const imgs = []; for (const relic of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) for (const [pose, t] of [['idle', 1.3], ['attack', .6]]) imgs.push(renderFoe('tamsin', { relic, variant: relic, gearTier: 4, wears: 'bogstriders', pose, t })); pinnedM6('foe tamsin rotbridge', hashOf(imgs)); }
  for (const key of M6_BACKDROPS) pinnedM6('backdrop ' + key, hashOf([renderBackdrop(key, { t: 1.3 }), renderBackdrop(key, { w: 120, h: 104, t: .7 })]));
  for (const id of M6_RELICS) {
    const R = RELICS[id], imgs = [];
    for (const o of [{ temper: 0 }, { temper: 2 }, { temper: 5 }, { temper: 8 }, { temper: 10 }, { gems: ['bog-amber', 'glass-pearl'] }, { deeds: { 'first-blood': 1 } }, { deeds: { 'first-blood': 1 }, awakened: 'a' }, { deeds: { 'first-blood': 1 }, awakened: 'b' }]) {
      const item = Object.assign({ uid: 'u', base: id, kind: R.kind, rarity: 'heirloom', aspect: R.aspect, seed: 1, temper: 0, gems: [] }, o);
      imgs.push(itemPortrait(item, { t: 1.3 }), itemIcon(item));
    }
    pinnedM6('relic ' + id, hashOf(imgs));
  }
  const kits = [['warden', { weapon: 'corvus-harpoon', offhand: 'willow-ward', head: 'salvagers-helm', body: 'hexbane-shawl', feet: 'bogstriders', hands: 'barge-gauntlets' }], ['pip', { weapon: 'gar-tooth', amulet: 'unfair-toll', ring: 'hag-stone' }], ['bryn', { weapon: 'cantors-staff', offhand: 'lamplighters-lantern', head: 'mourning-veil' }], ['alondra', { weapon: 'weeping-bow', amulet: 'deep-pearl' }]];
  for (const [hero, gear] of kits) pinnedM6('hero ' + hero + ' m6', hashOf([renderHero(hero, gear, { pose: 'idle', t: .1 }), renderHero(hero, gear, { pose: 'attack', t: .62 })]));
});
