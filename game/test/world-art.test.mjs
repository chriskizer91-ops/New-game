// The overworld art (M6 P5): every biome a map names has its tile atlas, and the Gloomfen's ten draw every tile id and
// compose every cell of their maps; every gate, lock, prop, sign and Hearthfire look the maps name is drawn (shut and
// open where it opens); every speaker has a drawn look; every foe family and variant walks on the map as its own
// sprite (a kit, a beast or its battle rig, never a hashed villager); and the M3-M5 overworld art is pixel for pixel as
// it shipped (the pinned digests were taken from the M5 art before any M6 change).
//
// The art returns ImageData; node has none, so a minimal one is provided (data, width, height), which is all the art
// layer uses. `AETH_PIN=1 node --test test/world-art.test.mjs` prints the digests instead of checking them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

globalThis.ImageData ??= class ImageData {
  constructor(d, w, h) { if (typeof d === 'number') { h = w; w = d; d = new Uint8ClampedArray(w * h * 4); } this.data = d; this.width = w; this.height = h; }
};
const { BIOMES, tileAtlas } = await import('../src/art/tiles.js');
const { walkerSheet } = await import('../src/art/walkers.js');
const { NPC_LOOKS, npcSheet, MAP_FOE_SIZE, mapFoeSheet, mapFoeLook, OBJECT_KINDS, OBJECT_STATES, HEARTH_LOOKS, objectSprite, EMOTES, emote } = await import('../src/art/map-sprites.js');
const { HERO_KEYS, WARDEN_PRESETS } = await import('../src/art/hero-looks.js');
const { MAPS } = await import('../src/data/maps/index.js');
const { TILE_IDS } = await import('../src/data/tiles.js');
const { HEARTHS } = await import('../src/data/world.js');
const { LOCKS } = await import('../src/data/locks.js');
const { NPCS } = await import('../src/data/npcs.js');
const { FOES } = await import('../src/data/foes.js');

const GLOOM = ['willow-village', 'channel', 'stilt-town', 'bog', 'drowned-grove', 'boardwalk', 'sunken-city', 'belfry', 'mudflat', 'causeway'];
const allMaps = () => Object.values(MAPS);
const gloomMaps = () => allMaps().filter(m => GLOOM.includes(m.biome) || m.biome === 'fen' && m.id === 'murkway');

test('every map names a biome with a tile atlas; the Gloomfen\'s ten draw every tile id, still and animated', () => {
  for (const m of allMaps()) assert.ok(BIOMES.includes(m.biome), `${m.id}: no atlas for biome ${m.biome}`);
  for (const b of GLOOM) {
    assert.ok(BIOMES.includes(b), `${b} is a biome`);
    const A = tileAtlas(b), W = A.img.width, H = A.img.height;
    for (const id of TILE_IDS) for (const f of [0, 1]) {
      const [sx, sy] = A.at(id, 0, f);
      assert.ok(sx >= 0 && sy >= 0 && sx + 16 <= W && sy + 16 <= H, `${b}: ${id} frame ${f} lies inside the atlas`);
    }
    // the animated tiles move: water, fords, the bog's bubbles, lanterns on walls, glowing air
    for (const id of ['water', 'ford', 'ichor', 'fungus', 'torch-wall']) assert.notDeepEqual(A.at(id, 0, 0), A.at(id, 0, 1), `${b}: ${id} has two frames`);
  }
});

test('every cell of every Gloomfen map composes to drawable ops, in both frames', () => {
  for (const m of gloomMaps()) {
    const A = tileAtlas(m.biome), W = A.img.width, H = A.img.height;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) for (const f of [0, 1]) {
      const ops = A.cell(m.rows, x, y, f);
      assert.ok(ops.ground.length > 0, `${m.id} (${x},${y}): no ground`);
      for (const op of ops.ground.concat(ops.over)) {
        assert.ok(op.length === 6 && op.every(Number.isFinite), `${m.id} (${x},${y}) '${m.rows[y][x]}': an op is not six numbers`);
        const [sx, sy, sw, sh] = op;
        assert.ok(sx >= 0 && sy >= 0 && sw > 0 && sh > 0 && sx + sw <= W && sy + sh <= H, `${m.id} (${x},${y}): an op reads outside the atlas`);
      }
    }
  }
});

// what the view draws for an entity (ui/world/view.js objectFor): a gate by its look, a hard lock by its id, a prop by
// its name, a sign by its look, a Hearthfire by its id
test('every gate, lock, prop, sign and Hearthfire on the Gloomfen maps has its own look, shut and open', () => {
  const seen = new Set();
  for (const m of gloomMaps()) for (const e of m.entities) {
    let kind = null, states = ['closed'], opts = {};
    if (e.kind === 'gate') { kind = e.look || 'gate'; states = ['closed', 'open']; }
    else if (e.kind === 'lock') { if (!LOCKS[e.lock] || LOCKS[e.lock].soft) continue; kind = e.lock; states = ['closed', 'open']; }
    else if (e.kind === 'prop') kind = e.prop;
    else if (e.kind === 'sign') { if (!e.look || e.look === 'painted') continue; assert.ok(OBJECT_STATES.sign.includes(e.look), `${m.id}/${e.id}: sign look ${e.look} is not drawn`); kind = 'sign'; states = [e.look]; }
    else if (e.kind === 'hearthfire') { kind = 'hearth'; states = ['lit', 'cold']; opts = { id: e.id }; assert.ok(HEARTH_LOOKS[e.id], `${m.id}: Hearthfire ${e.id} has no look`); }
    else continue;
    assert.ok(OBJECT_KINDS.includes(kind), `${m.id}/${e.id}: no sprite for ${e.kind} ${kind}`);
    for (const st of states) {
      if (kind !== 'sign' && kind !== 'hearth') assert.ok(OBJECT_STATES[kind].includes(st), `${kind} draws ${st}`);
      const img = objectSprite(kind, st, opts);
      assert.ok(img.width >= 16 && img.height >= 16 && img.anchors.foot.every(Number.isFinite), `${kind} ${st}`);
      let px = 0; for (let i = 3; i < img.data.length; i += 4) px += img.data[i] ? 1 : 0;
      // a lock or gate may open to nothing (a ford, a mirage); shut, everything shows
      if (st !== 'open') assert.ok(px > 12, `${m.id}/${e.id}: ${kind} ${st} draws nothing`);
      if (img.frames > 1) assert.notDeepEqual(objectSprite(kind, st, { ...opts, frame: 1 }).data, img.data, `${kind} ${st}: its second frame moves`);
      seen.add(kind + ':' + st);
    }
    // gates are laid a tile at a time along the way, 16 px wide, rising a half-tile above it (as M5's)
    if (e.kind === 'gate' && kind !== 'gate' && kind !== 'chain') assert.deepEqual([objectSprite(kind, 'closed').width, objectSprite(kind, 'closed').height], [16, 24], kind);
  }
  assert.ok(seen.size > 20, 'the Gloomfen maps name their looks');
});

test('every Hearthfire has a look, lit (animated) and cold', () => {
  for (const id of Object.keys(HEARTHS)) {
    assert.ok(HEARTH_LOOKS[id], `${id} has no look`);
    const lit = objectSprite('hearth', 'lit', { id }), cold = objectSprite('hearth', 'cold', { id });
    assert.equal(lit.frames, 2, `${id} lit flickers`);
    assert.equal(cold.frames, 1, `${id} cold is still`);
    assert.notDeepEqual(lit.data, cold.data, `${id}: lit and cold differ`);
  }
});

test('every speaker has a drawn look (the Gloomfen\'s people their own), and every NPC sheet renders', () => {
  const M6 = ['moss', 'sedge', 'wm-villager', 'hodge', 'gretch', 'nettie', 'pell', 'bm-watch', 'corvus', 'lantern-mother'];
  for (const id of M6) { assert.ok(NPCS[id], `NPCS has ${id}`); assert.ok(NPC_LOOKS[NPCS[id].art], `${id} has its own look`); }
  for (const n of Object.values(NPCS)) {
    const s = npcSheet(n.art);
    assert.deepEqual([s.img.width, s.img.height, s.w, s.h], [48, 96, 16, 24], n.id);
  }
});

test('every foe family and variant walks on the map as its own sprite, at every gear tier', () => {
  for (const [fam, f] of Object.entries(FOES)) {
    const keys = [[f.art, null]].concat(Object.entries(f.variants || {}).map(([v, d]) => [d.art || f.art, v]));
    for (const [art, v] of keys) {
      const look = mapFoeLook(art, v);
      assert.ok(['kit', 'beast', 'rig'].includes(look), `${fam}${v ? '/' + v : ''} draws as ${look}`);
      for (const gearTier of [0, 1, 2, 3]) {
        const s = mapFoeSheet(art, { gearTier, variant: v });
        assert.deepEqual([s.img.width, s.img.height], [s.w * 2, s.h * 4], `${fam}/${v} g${gearTier}: 2 frames x 4 rows`);
        if (look === 'beast') assert.deepEqual([s.w, s.h], MAP_FOE_SIZE[art] || [s.w, s.h], `${art}: its size`);
      }
    }
  }
  // the Gloomfen's lairs carry their relics unless one is taken from them
  for (const key of ['old-jaws', 'grandfather-willow', 'lantern-mother', 'blackwater-leviathan']) {
    assert.notDeepEqual(mapFoeSheet(key, { gearTier: 1 }).img.data, mapFoeSheet(key, { gearTier: 1, relic: null }).img.data, `${key} shows its relic`);
  }
});

/* ---------- the M3-M5 overworld art, pixel for pixel ---------- */
const OLD_BIOMES = ['keep', 'wilds', 'town', 'grove', 'fen', 'tower', 'roots', 'den', 'desert', 'desert-town', 'canyon', 'mine-camp', 'mine', 'crystal', 'dunes', 'oasis', 'ash', 'vault',
  'mountain', 'monastery', 'scree', 'dwarf-hall', 'forge', 'outpost', 'tundra', 'frozen-lake', 'ice-cave'];
const OLD_NPCS = ['fenwick', 'isolde', 'marta', 'refugee', 'gate-guard', 'hilda', 'dael', 'nell', 'corra', 'garret', 'miravel', 'nan', 'ivo', 'pilgrim', 'tamsin', 'vesper',
  'rotwarden', 'zara', 'qasim', 'idris', 'spire-guard', 'water-seller', 'luma', 'ode', 'miner', 'sabah', 'pilgrim-mw', 'cinder', 'ashen-warden', 'wynn', 'kesh', 'novice',
  'brundar', 'durra', 'ih-guard', 'rook', 'ysolde', 'quill', 'rime-abbot', 'villager-0', 'villager-7', 'somebody'];
const OLD_FOES = ['cutpurse', 'bandit', 'tallyman', 'smuggler', 'feral-druid', 'hollowed-ranger', 'tamsin', 'mags', 'haskett', 'hollis', 'dun', 'vesper', 'oda', 'corra',
  'scavenger', 'dune-raider', 'ash-wight', 'rasa', 'ash-captain', 'brask', 'quartermaster', 'vell',
  'brigand', 'rhune', 'cutter-chief', 'sawyer', 'iron-sentinel', 'sentinel-captain', 'forgeborn', 'bellows', 'journeyman', 'rime-wraith', 'drowned-abbess', 'choir-wraith',
  'briarling', 'thornhound', 'boglurcher', 'glowcap', 'rotgrub', 'rotstag', 'oldsnag', 'briarmaw', 'gloamwing', 'mirelord', 'sapwight', 'rotwarden',
  'sand-skink', 'glass-scorpion', 'glass-matriarch', 'mirage-wisp', 'wisp-queen', 'sand-wyrm', 'gnash', 'kharzul', 'ashen-warden',
  'rime-wolf', 'rockling', 'forge-spark', 'peak-troll', 'old-horn', 'thunder-roc', 'mother-anvil', 'rime-abbot'];
const OLD_KINDS = ['chest', 'hearth', 'gate', 'chain', 'crownwall', 'thornwall', 'bramble', 'boulder', 'ford-ice', 'pedestal', 'board', 'sign', 'bellframe', 'lookout', 'rope', 'deer',
  'ichor', 'door', 'table', 'tally-seal', 'barred-gate', 'rot-knot', 'stream', 'dune-glass', 'mirage', 'quicksand', 'vault-seal', 'glass-spire', 'vault-door',
  'chasm', 'ice', 'rune-seal', 'drift', 'prayer-flags', 'hush', 'ice-blocks', 'frozen-door'];
const OLD_SIGNS = ['post', 'stone', 'plaque', 'cradle', 'cradle-full', 'monolith', 'spire', 'bell-rope', 'throne', 'frozen-monk', 'altar'];
const OLD_HEARTHS = ['hearthstone-keep', 'milestone-fire', 'thornhollow', 'den-mouth', 'mossfall-cairn', 'mosswatch-fire', 'hindwood-cairn', 'fawnrest-stone', 'eldergrove-hearth',
  'last-green-coal', 'waystone', 'spire-hearth', 'dust-cairn', 'pithead', 'shaft-lamp', 'well-fire', 'last-watchfire', 'pass-shrine', 'veil-hearth', 'stair-cairn', 'thanes-hearth',
  'deeps-forge', 'stormwatch-fire', 'frost-cairn', 'camp-fire'];
// a grid where every tile character meets every other, to hash what cell() returns (edges, corners, canopies, roofs)
const CH = ['.', ',', '"', '=', ':', '_', 'm', 'f', 'r', 'k', 'T', 't', 'Y', 'R', 'o', '#', 'H', '|', '*', '~', 'w', 'b', '^', 'v', '+', 's', 'i', 'x'];
const GRID = Array.from({ length: 30 }, (_, y) => Array.from({ length: 30 }, (_, x) => CH[(x * (1 + (y % 5)) + y * 3 + ((x * y) % 7)) % CH.length]).join(''));
const digest = fill => { const h = createHash('sha256'); fill(h); return h.digest('hex').slice(0, 24); };
const img = (h, im) => { h.update(`${im.width}x${im.height}|`); h.update(im.data); if (im.anchors) h.update(JSON.stringify(im.anchors)); if (im.frames) h.update('f' + im.frames); };
const PIN = !!process.env.AETH_PIN;
const check = (name, got) => { if (PIN) console.log(`  '${name}': '${got}',`); else assert.equal(got, PINNED[name], `${name}: the M3-M5 overworld art changed`); };

test('the M3-M5 overworld art is pixel for pixel as it shipped', () => {
  for (const b of OLD_BIOMES) check('atlas ' + b, digest(h => {
    const A = tileAtlas(b); img(h, A.img);
    for (let y = 0; y < GRID.length; y++) for (let x = 0; x < GRID[0].length; x++) for (const f of [0, 1]) h.update(JSON.stringify(A.cell(GRID, x, y, f)));
  }));
  const KITS = [undefined, null, { weapon: 'hearthbrand', amulet: 'wardens-seal' }, { weapon: 'briarfang', head: 'thornwatch-hood', body: 'thornwatch-jerkin', feet: 'thornwatch-boots' },
    { weapon: 'cinderfang', offhand: 'ashen-aegis', head: 'cinder-crown', body: 'glass-carapace', feet: 'sandwalkers' }];
  check('walkers', digest(h => {
    for (const key of HERO_KEYS) for (const g of KITS) img(h, walkerSheet(key, g).img);
    const P = WARDEN_PRESETS;
    for (let k = 0; k < 8; k++) img(h, walkerSheet('warden', undefined, { custom: { skin: P.skin[k % 4], hairMat: P.hairMat[(k * 5) % 6], hair: P.hair[k % 6], beard: k === 3 || k === 6, eye: P.eye[k % 4] } }).img);
  }));
  check('npcs', digest(h => { for (const k of OLD_NPCS) img(h, npcSheet(k).img); }));
  check('map foes', digest(h => {
    for (const k of OLD_FOES) for (const gearTier of [0, 1, 2, 3]) { const s = mapFoeSheet(k, { gearTier }); img(h, s.img); h.update(JSON.stringify([s.w, s.h, s.foot, s.head, s.frames])); }
    for (const k of OLD_FOES) img(h, mapFoeSheet(k, { gearTier: 1, relic: null }).img);
    for (const v of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) img(h, mapFoeSheet('tamsin', { variant: v }).img);
    img(h, mapFoeSheet('bandit', { variant: 'poacher' }).img); img(h, mapFoeSheet('cutpurse', { relic: 'tallyknife' }).img);
  }));
  check('objects', digest(h => {
    for (const kind of OLD_KINDS) for (const st of (kind === 'sign' ? OLD_SIGNS : OBJECT_STATES[kind]).concat(['no-such-state', null])) for (const frame of [0, 1]) img(h, objectSprite(kind, st, { frame }));
    for (const st of ['closed', 'open']) for (const frame of [0, 1]) img(h, objectSprite('chasm', st, { look: 'floes', frame }));
    img(h, objectSprite('pedestal', 'lit', { relic: 'hearthbrand' })); img(h, objectSprite('no-such-kind', null));
  }));
  check('hearths', digest(h => { for (const id of OLD_HEARTHS.concat(['an-unknown-hearth'])) for (const st of ['lit', 'cold']) for (const frame of [0, 1]) img(h, objectSprite('hearth', st, { id, frame })); }));
  check('emotes', digest(h => { for (const k of EMOTES) for (const frame of [0, 1]) img(h, emote(k, { frame })); }));
});

// taken from the M5 art before any M6 change (the scaffold's tree), and checked against a private hash of 1036 looks
const PINNED = {
  'atlas keep': '51271c8ed8d2ac36cf58fd1b',
  'atlas wilds': 'd80b3d59eb0e0a8d45a3f359',
  'atlas town': 'b9b059f6587cdab2cdbce443',
  'atlas grove': '89fba7e508898e8fe4a90c23',
  'atlas fen': '76d6629c4b6a51f04b67af72',
  'atlas tower': '27e7e3269ddb1d5bfc817085',
  'atlas roots': '80e1929a66b0df0077542921',
  'atlas den': 'e7b2e3b878932b9656fb1787',
  'atlas desert': 'fbb09c397ce39964fdcbf16f',
  'atlas desert-town': 'a3d33b15711cddff236c0cee',
  'atlas canyon': 'e6e4b98e48af1678050fb7e5',
  'atlas mine-camp': 'e56d3c487186e8bf4faf1229',
  'atlas mine': '16b3604192e1caca9c5f3664',
  'atlas crystal': '07ead6b54a3f3527d36df099',
  'atlas dunes': 'a86c35003cad8f81756f1928',
  'atlas oasis': 'a6102b64d88f107c58eeaa58',
  'atlas ash': '18b1d05648c86e88c5c1acae',
  'atlas vault': '586cafa14ea60fccabc8f2eb',
  'atlas mountain': '24b74322af3df54da8053021',
  'atlas monastery': 'bccaffd2743202e55a06153e',
  'atlas scree': '33c553d2c8b7ee283663be65',
  'atlas dwarf-hall': 'a6c196182a90506b8947ef54',
  'atlas forge': 'b9a4a8a9a86bc82953cae85d',
  'atlas outpost': '1b651b27a07ba825787b2531',
  'atlas tundra': '4df0ad542f597fafb1b4efff',
  'atlas frozen-lake': 'e55284a0c42510e384e43a93',
  'atlas ice-cave': '99fd44b79939019144efcb3d',
  'walkers': '67ba1b30c1dad3dba00c7d4e',
  'npcs': 'fdf386fcb9c5be9533f071d9',
  'map foes': 'e56bf1ef4097722c8eacb755',
  'objects': 'ac7ee78323ed036627e3bf30',
  'hearths': '1791d9c79e8a10ac55f0b5d2',
  'emotes': '09db643ab26425b67b9b0feb',
};
