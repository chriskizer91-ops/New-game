// The overworld art (M6 P5): every biome a map names has its tile atlas, and the Gloomfen's ten draw every tile id and
// compose every cell of their maps; every gate, lock, prop, sign and Hearthfire look the maps name is drawn (shut and
// open where it opens); every speaker has a drawn look; every foe family and variant walks on the map as its own
// sprite (a kit, a beast or its battle rig, never a hashed villager); and the M3-M5 overworld art is pixel for pixel as
// it shipped (the pinned digests were taken from the M5 art before any M6 change).
// M7 (P5): the Hearth Below's four biomes draw every tile id and compose every cell of the Act III maps; its steps, chains
// and council table read their neighbours; its gate, props, signs and Hearthfires are drawn to their footprints; its foes
// walk as their own sprites, the Council and the Unsmith with their gifts until taken; and the M6 art is pinned too.
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
    for (const key of HERO_KEYS.filter(k => k !== 'yara')) for (const g of KITS) img(h, walkerSheet(key, g).img); // Thareia's heroes are new
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

/* ---------- M7 (P5): the Hearth Below ---------- */
const BELOW = ['council', 'hearth-roots', 'chains', 'worldforge'];
// the biome each Act III map draws in once P5's tiles land (notes/M7-P2-maps.md; the maps name stand-ins until then)
const BELOW_OF = { 'hollow-hall': 'council', 'ash-stair': 'hearth-roots', 'chained-deep': 'chains', worldforge: 'worldforge' };
// which of a tile's variants a cell drew: the atlas rect of its first ground op, looked up among the tile's variants
const variantOf = (A, rows, x, y, id) => { const [sx, sy] = A.cell(rows, x, y, 0).ground[0]; for (let v = 0; v < A.variants(id); v++) { const [ax, ay] = A.at(id, v, 0); if (ax === sx && ay === sy) return v; } return -1; };

test('the Hearth Below\'s four biomes draw every tile id, still and animated', () => {
  for (const b of BELOW) {
    assert.ok(BIOMES.includes(b), `${b} is a biome`);
    const A = tileAtlas(b), W = A.img.width, H = A.img.height;
    for (const id of TILE_IDS) for (const f of [0, 1]) {
      const [sx, sy] = A.at(id, 0, f);
      assert.ok(sx >= 0 && sy >= 0 && sx + 16 <= W && sy + 16 <= H, `${b}: ${id} frame ${f} lies inside the atlas`);
    }
    // the animated tiles move: molten metal, the hot crust, the ember veins, the red cracks, the braziers and seams and vents
    for (const id of ['water', 'ford', 'ichor', 'fungus', 'torch-wall']) assert.notDeepEqual(A.at(id, 0, 0), A.at(id, 0, 1), `${b}: ${id} has two frames`);
  }
  // 'ash' and 'forge' stay Scorchgate's and Harrow's Forge's (spec §6.1)
  for (const b of ['ash', 'forge']) assert.ok(BIOMES.includes(b) && !BELOW.includes(b), `${b} is still its own place`);
});

test('every cell of every Act III map composes in its Hearth Below biome, in both frames', () => {
  for (const [id, b] of Object.entries(BELOW_OF)) {
    const m = MAPS[id], A = tileAtlas(b), W = A.img.width, H = A.img.height;
    assert.ok(m, `${id} is a map`);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) for (const f of [0, 1]) {
      const ops = A.cell(m.rows, x, y, f);
      assert.ok(ops.ground.length > 0, `${id} (${x},${y}): no ground`);
      for (const op of ops.ground.concat(ops.over)) {
        assert.ok(op.length === 6 && op.every(Number.isFinite), `${id} (${x},${y}) '${m.rows[y][x]}': an op is not six numbers`);
        const [sx, sy, sw, sh] = op;
        assert.ok(sx >= 0 && sy >= 0 && sw > 0 && sh > 0 && sx + sw <= W && sy + sh <= H, `${id} (${x},${y}): an op reads outside the atlas`);
      }
    }
  }
});

test('the Hearth Below\'s steps follow their flight, its great chains their band, and the council table is drawn a ninth to a tile', () => {
  const A = tileAtlas('hearth-roots');
  // a long flight going east has its treads upright (variants 2-3); one going south lies across (0-1)
  const east = ['##########', '.ssssssss#', '.ssssssss#', '.ssssssss#', '##########'], south = east[0].split('').map((_, x) => east.map(r => r[x]).join(''));
  assert.ok(variantOf(A, east, 4, 2, 'stair') >= 2, 'a flight going east: treads upright');
  assert.ok(variantOf(A, south, 2, 4, 'stair') < 2, 'a flight going south: treads across');
  // a short flight wider than it is long goes the way its ends open (the Deep's steps down off the walkway, between the rail)
  assert.ok(variantOf(tileAtlas('chains'), ['#===#', '|sss|', 'kkkkk'], 2, 1, 'stair') < 2, 'three steps down off the walkway lie across');
  // a chain band running down to the south-west carries a chain on the diagonal (orientation 3 of 0-3: shape = variant / 10)
  const C = tileAtlas('chains'), band = ['oooooYY', 'ooooYYo', 'oooYYoo', 'ooYYooo', 'oYYoooo', 'YYooooo', 'Yoooooo'];
  assert.equal(Math.floor(variantOf(C, band, 3, 3, 'first-root') / 10), 3, 'a band to the south-west: a diagonal chain');
  // a band two tiles wide running north-south carries one chain down the line between its columns
  const two = Array.from({ length: 7 }, () => 'oYYo'), l = variantOf(C, two, 1, 3, 'first-root'), r = variantOf(C, two, 2, 3, 'first-root');
  assert.deepEqual([Math.floor(l / 10), Math.floor(r / 10)], [2, 2], 'north-south');
  const off = v => (Math.floor(v / 2) % 5) - 2;
  assert.ok(Math.abs(off(l)) === 2 && off(r) === -off(l), 'one chain on the line between the two columns');
  // the round council table: its nine tiles are nine different drawings, and no rim of rock round it
  const T3 = tileAtlas('council'), table = [':::::', ':RRR:', ':RRR:', ':RRR:', ':::::'], seen = new Set();
  for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) { const ops = T3.cell(table, x, y, 0); assert.equal(ops.ground.length, 1, `table (${x},${y}): one drawing, no rim`); seen.add(ops.ground[0].slice(0, 2).join()); }
  assert.equal(seen.size, 9, 'nine ninths');
});

test('the Hearth Below\'s gate, props, signs and Hearthfires are drawn, to their footprints', () => {
  const px = img => { let n = 0; for (let i = 3; i < img.data.length; i += 4) n += img.data[i] ? 1 : 0; return n; };
  // the soot line the gift's light will not let you cross: laid a tile at a time, 16 x 24; shut it shimmers, open it is scuffed soot
  const shut = objectSprite('hollow-gate', 'closed'), open = objectSprite('hollow-gate', 'open');
  assert.deepEqual([shut.width, shut.height, shut.frames], [16, 24, 2], 'the hollow gate');
  assert.notDeepEqual(objectSprite('hollow-gate', 'closed', { frame: 1 }).data, shut.data, 'its light moves');
  assert.ok(px(shut) > 3 * px(open) && px(open) > 0, 'open, only the soot is left');
  // the big props are one sprite each, drawn once at their foot, sized to the footprints the maps give them
  const big = { 'sleeper-first': [240, 152, [120, 107]], worldforge: [112, 240, [56, 239]], 'great-anvil': [48, 40, [24, 39]] };
  for (const [k, [w, h, foot]] of Object.entries(big)) {
    const img = objectSprite(k, 'closed');
    assert.deepEqual([img.width, img.height, img.anchors.foot], [w, h, foot], k);
    assert.equal(img.frames, 2, `${k} breathes, burns or glows`);
    assert.ok(px(img) > w * h / 6, `${k} fills its footprint`);
  }
  for (const k of ['vault-stair', 'vault-boxes', 'vault-boxes-open']) { const img = objectSprite(k, 'closed'); assert.ok(img.width === 16 && px(img) > 40, k); }
  assert.notDeepEqual(objectSprite('vault-boxes', 'closed').data, objectSprite('vault-boxes-open', 'closed').data, 'the boxes open');
  // the sign looks: the chains, the four chairs with their marks, the heart's step
  const signs = ['chain', 'chair-tree', 'chair-sun', 'chair-anvil', 'chair-lantern', 'heart-step'], seen = new Set();
  for (const st of signs) { assert.ok(OBJECT_STATES.sign.includes(st), st); const pic = objectSprite('sign', st); assert.ok(px(pic) > 60, `sign ${st} draws`); seen.add(digest(h => img(h, pic))); }
  assert.equal(seen.size, signs.length, 'each sign look is its own');
  // the two Hearthfires by id, and every gate, prop, sign and Hearthfire the Act III maps and the Keep's vault name
  assert.deepEqual([HEARTH_LOOKS['under-coal'], HEARTH_LOOKS['chain-fire']], ['undercoal', 'chainfire']);
  for (const id of Object.keys(BELOW_OF).concat(['keep-hall'])) for (const e of MAPS[id].entities) {
    let kind = null, st = 'closed', opts = {};
    if (e.kind === 'gate' && e.look === 'hollow-gate') kind = 'hollow-gate';
    else if (e.kind === 'prop') kind = e.prop;
    else if (e.kind === 'sign' && e.look && e.look !== 'painted') { kind = 'sign'; st = e.look; }
    else if (e.kind === 'hearthfire') { kind = 'hearth'; st = 'lit'; opts = { id: e.id }; }
    else continue;
    assert.ok(OBJECT_KINDS.includes(kind), `${id}/${e.id}: ${kind} is drawn`);
    assert.ok(px(objectSprite(kind, st, opts)) > 12, `${id}/${e.id}: ${kind} ${st} draws`);
  }
});

test('the Hearth Below\'s foes walk on the map as their own sprites; the Council and the Unsmith carry their gifts until taken', () => {
  const OWN = { 'cinder-thrall': 'kit', unmade: 'kit', 'forge-warden': 'beast', 'hollow-miravel': 'kit', 'hollow-qasim': 'kit', 'hollow-brundar': 'kit', 'hollow-gretch': 'kit', unsmith: 'beast' };
  for (const [key, look] of Object.entries(OWN)) {
    assert.equal(mapFoeLook(key), look, key);
    for (const gearTier of [0, 1, 2, 3]) {
      const s = mapFoeSheet(key, { gearTier });
      assert.deepEqual([s.img.width, s.img.height], [s.w * 2, s.h * 4], `${key} g${gearTier}: 2 frames x 4 rows`);
      if (look === 'beast') assert.deepEqual([s.w, s.h], MAP_FOE_SIZE[key], `${key}: its size`);
    }
  }
  assert.deepEqual([MAP_FOE_SIZE['forge-warden'], MAP_FOE_SIZE.unsmith], [[24, 32], [32, 48]], 'the Forge-Warden as tall as a door, the Unsmith tall');
  // the thralls harden by gear tier; the Thrall-Overseer (a cinder-thrall variant) is its own sprite
  assert.notDeepEqual(mapFoeSheet('cinder-thrall', { gearTier: 0 }).img.data, mapFoeSheet('cinder-thrall', { gearTier: 3 }).img.data, 'the thralls by gear tier');
  assert.equal(mapFoeLook('cinder-thrall', 'thrall-overseer'), 'kit');
  assert.notDeepEqual(mapFoeSheet('cinder-thrall', { variant: 'thrall-overseer' }).img.data, mapFoeSheet('cinder-thrall').img.data, 'the overseer is drawn apart');
  // each of the Council wears the gift sent to their chair (by default, and when named), and it is gone once taken
  const gifts = { 'hollow-miravel': 'hollow-wreath', 'hollow-qasim': 'hollow-chalice', 'hollow-brundar': 'hollow-gauntlet', 'hollow-gretch': 'hollow-chain', unsmith: 'unmaking-hammer' };
  for (const [key, relic] of Object.entries(gifts)) {
    const worn = mapFoeSheet(key, { gearTier: 1 }).img.data;
    assert.deepEqual(mapFoeSheet(key, { gearTier: 1, relic }).img.data, worn, `${key} wears ${relic}`);
    assert.notDeepEqual(mapFoeSheet(key, { gearTier: 1, relic: null }).img.data, worn, `${key} without ${relic}`);
  }
  // the Unsmith speaks with a face of his own (his battle art is a Champion build), not a hashed villager: Hilda's twin
  assert.ok(NPC_LOOKS.unsmith && NPC_LOOKS.unsmith.H.hairMat === NPC_LOOKS.hilda.H.hairMat, 'the Unsmith has his own look, his sister\'s hair');
  assert.deepEqual([npcSheet('unsmith').img.width, npcSheet('unsmith').img.height], [48, 96], 'his sheet');
  // hollowed: the same folk as their town walkers, not the same drawing
  for (const k of ['miravel', 'qasim', 'brundar', 'gretch']) assert.notDeepEqual(npcSheet(k).img.data.slice(0, 48 * 24 * 4), mapFoeSheet('hollow-' + k).img.data.slice(0, 32 * 24 * 4), k);
});

/* the M6 overworld art, pixel for pixel: pinned from the M6 art as it shipped (the lead's M7 base), before any M7 change, and
   checked against a private hash of 517 looks */
const M6_NPCS = ['moss', 'sedge', 'wm-villager', 'hodge', 'gretch', 'nettie', 'pell', 'bm-watch', 'corvus', 'lantern-mother'];
const M6_FOES = ['drowned', 'bell-ringer', 'drowned-choir', 'drowned-cantor', 'bog-hag', 'mother-grue', 'hodge', 'reedcutter', 'salvage-diver', 'bargehand', 'salvage-master', 'bargemaster',
  'mire-leech', 'marsh-light', 'lamp-moth', 'blackwater-gar', 'old-jaws', 'willow-wight', 'grandfather-willow', 'lantern-mother', 'blackwater-leviathan'];
const M6_KINDS = ['toll-bar', 'leech-ford', 'ward-gate', 'hung-lanterns', 'hag-fence', 'barge-planks', 'water-gate', 'choir-screen', 'blackwater', 'witch-ward',
  'wreck', 'marsh-lights', 'black-barge', 'lantern', 'sleeping-child', 'crane', 'diving-bell', 'sealed-chest', 'barge', 'bell', 'sleeper'];
const M6_HEARTHS = ['reed-shrine', 'willow-hearth', 'toll-lamp', 'stilt-hearth', 'fen-cairn', 'bell-hearth', 'wreck-fire', 'flats-beacon'];
test('the M6 overworld art is pixel for pixel as it shipped', () => {
  const pin = (name, got) => { if (PIN) console.log(`  '${name}': '${got}',`); else assert.equal(got, PINNED_M6[name], `${name}: the M6 overworld art changed`); };
  for (const b of GLOOM) pin('atlas ' + b, digest(h => {
    const A = tileAtlas(b); img(h, A.img);
    for (let y = 0; y < GRID.length; y++) for (let x = 0; x < GRID[0].length; x++) for (const f of [0, 1]) h.update(JSON.stringify(A.cell(GRID, x, y, f)));
  }));
  pin('npcs', digest(h => { for (const k of M6_NPCS) img(h, npcSheet(NPCS[k].art).img); }));
  pin('map foes', digest(h => {
    for (const k of M6_FOES) for (const gearTier of [0, 1, 2, 3]) { const s = mapFoeSheet(k, { gearTier }); img(h, s.img); h.update(JSON.stringify([s.w, s.h, s.foot, s.head, s.frames])); }
    for (const k of M6_FOES) img(h, mapFoeSheet(k, { gearTier: 1, relic: null }).img);
  }));
  pin('objects', digest(h => {
    for (const kind of M6_KINDS) for (const st of OBJECT_STATES[kind]) for (const frame of [0, 1]) img(h, objectSprite(kind, st, { frame }));
    for (const st of ['ward-stone', 'ward-stone-dark', 'bootprints']) for (const frame of [0, 1]) img(h, objectSprite('sign', st, { frame }));
  }));
  pin('hearths', digest(h => { for (const id of M6_HEARTHS) for (const st of ['lit', 'cold']) for (const frame of [0, 1]) img(h, objectSprite('hearth', st, { id, frame })); }));
});
const PINNED_M6 = {
  'atlas willow-village': '3482f253526c6a360e14578b',
  'atlas channel': '287ea13b7a6f21ae0dceab14',
  'atlas stilt-town': '683bb3f4ee4b2936af7ebc5b',
  'atlas bog': '72889a79ebc885157928ecbe',
  'atlas drowned-grove': 'b251c0cc3ded3824b0975934',
  'atlas boardwalk': '3ad5781a74e71de1079c53a2',
  'atlas sunken-city': '159f6ab8d21eba225067b72d',
  'atlas belfry': '932654e5a59f7422e10d3b28',
  'atlas mudflat': 'dcd80c1728037c69f7f68464',
  'atlas causeway': '928edc96632a51fea09d6c16',
  'npcs': '70fac2df90c6c3566601914c',
  'map foes': '003f7deb2290a17cc1682b8d',
  'objects': '2fdd65e51d72f22d3154d196',
  'hearths': '6c89254702671bef6ac77793',
};
