// A batch's prompt sheet (M5 spec A10): the painters' page for every layout reference in refs.json
// (tools/paint-refs.mjs), from the place descriptions written for them. Every map prompt shares the
// pilot's opening (keep the layout), style and exclusions (art-requests/pilot.md); the place, the light
// on its ground and the picture's shape are each map's own.
//
//   node tools/paint-prompts.mjs --refs=../art-requests/batch-2/refs/refs.json --places=places.md \
//     --title="Batch 2: the Verdant Wilds and the Sunscorch" --out=../art-requests/batch-2.md
//
// places.md holds one section per painting, in the order the page lists them:
//   ## map-<id>[-a].png
//   Map: <id> · <name> · <biome> · <note>
//   The place: <the paragraph>
// M6 (batch 3): --style=atlas writes the prompts the way the player's own whole-map paintings were made (a
// style transfer: the layout reference as image 1, one of the player's paintings as image 2, named by
// --styleref), and --intro replaces the page's opening sentence. The page's folders follow the refs' folder.
//   node tools/paint-prompts.mjs --refs=../art-requests/batch-3/refs/refs.json --places=../art-requests/batch-3/places.md \
//     --style=atlas --styleref=art-in/pilot/map-thornhollow.png --title="Batch 3: the Gloomfen Marsh" \
//     --intro="every map of the Gloomfen, and the Gloomfen Gallery" --out=../art-requests/batch-3.md
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
if (!args.refs || !args.places || !args.out) { console.error('usage: node tools/paint-prompts.mjs --refs=<refs.json> --places=<places.md> --out=<page.md> [--title=...]'); process.exit(2); }
const refs = JSON.parse(await readFile(path.resolve(String(args.refs)), 'utf8'));
const placesText = await readFile(path.resolve(String(args.places)), 'utf8');

// the painting file -> its place paragraph, in the order written
const places = [];
for (const block of placesText.split(/^## /m).slice(1)) {
  const file = block.split('\n')[0].trim();
  const m = /The place:\s*([\s\S]*?)\s*$/.exec(block);
  if (!m) throw new Error(`${file}: no "The place:" paragraph`);
  places.push({ file, place: m[1].replace(/\s+/g, ' ').trim() });
}
const panelOf = new Map();
for (const [id, r] of Object.entries(refs)) r.panels.forEach(p => panelOf.set(p.painting, { id, r, p }));
for (const { file } of places) if (!panelOf.has(file)) throw new Error(`${file}: not in refs.json`);
const missing = [...panelOf.keys()].filter(f => !places.some(p => p.file === f));
if (missing.length) throw new Error(`no place written for ${missing.join(', ')}`);

// the texture words and the light, by biome; dark places are lit evenly (the game lays its own darkness)
const LOOK = {
  keep: 'worn flagstones, weathered granite, moss in the cracks, faded blue cloth',
  wilds: 'grass, bark and leaves, worn earth paths, moss on the stones',
  town: 'bark, shingles, worn paths, clover',
  grove: 'deep moss, old bark, fern, soft glowing flowers',
  fen: 'reeds, black water with ripples, mud, rotting boardwalk planks',
  tower: 'cold grey stone, damp moss, old timber',
  roots: 'living wood, sap, roots thick as walls, pale fungus',
  den: 'rotting wood, thorn and bramble, sour mud',
  desert: 'wind ripples in pale sand, sun-bleached stone, dry scrub',
  'desert-town': 'sandstone, sun-faded awnings, dusty tiles',
  canyon: 'red rock in bands, scree, dry gullies',
  'mine-camp': 'packed dirt, timber props, spoil heaps, rusted iron',
  mine: 'rough-hewn rock, timber props, iron rails',
  crystal: 'dark rock veined with glowing crystal',
  dunes: 'wind-sculpted dunes, glassy fused sand that glints',
  oasis: 'palm fronds, clear water, green reeds, warm sand',
  ash: 'grey ash drifts, scorched stone, cooled cinders',
  vault: 'carved sandstone, bronze fittings, dust',
  // M6: the Gloomfen
  'willow-village': 'reed thatch, weeping willow fronds, dark earth, weathered planks, still black water',
  channel: 'slow black water, wet timber, lichen on old stone, reeds',
  'stilt-town': 'weathered planks on piles, patched roofs, rope, lantern light on black water',
  bog: 'black water, grey dead trees, reed tussocks, wet peat',
  'drowned-grove': 'black willow bark, roots in dark water, moss, warm lamplight',
  boardwalk: 'weathered grey planks, tarred stilts, lamp-posts, ripples on black water',
  'sunken-city': 'blue-grey stone, green water-stains, cobbles, moss, old bronze',
  belfry: 'wet flagstones, green water-light, old bronze bells, carved wood',
  mudflat: 'grey-brown mud, tide-pools, salt-bleached timber, rusted iron',
  causeway: 'old stone setts, long kerb stones, water-marks, reeds, shallow water',
};
const DARK = new Set(['mosswatch-2', 'heartroot-2', 'deep-shaft-1', 'scorchgate-vaults', 'mothers-hollow', 'drowned-belfry']);
const SHAPE = { '3:2': 'Landscape 3:2, at least 1536 x 1024 pixels.', '2:3': 'Portrait 2:3, at least 1024 x 1536 pixels.', '1:1': 'Square 1:1, at least 1024 x 1024 pixels.' };
const SHAPE_WORD = { '3:2': 'landscape 3:2', '2:3': 'portrait 2:3', '1:1': 'square 1:1' };

const prompt = (id, r, p, place) => {
  const lit = DARK.has(id)
    ? 'even, soft light so that every stone and root reads clearly (the game lays its own darkness over this place), no deep black shadows'
    : 'soft warm afternoon light from the upper left with short shadows falling to the lower right';
  const panel = r.panels.length > 1
    ? ` This picture is panel ${'ABCDEFGH'[r.panels.indexOf(p)]} of ${r.panels.length} of one long map: the panels overlap, so paint the ground, light and colours exactly as in the other ${r.panels.length > 2 ? 'panels' : 'panel'}.`
    : '';
  return [
    `Redraw the attached game map as a finished, detailed 16-bit JRPG pixel-art map. Keep the layout exactly: every wall, roof, tree, rock, road, bridge, cliff and shoreline stays where it is in the attached image, the same size and shape, seen from the same top-down three-quarter view (the ground seen from above, the south faces of walls and buildings visible). Do not add, move or remove anything that would block a path, and keep every road, path, floor and patch of open ground open for walking.${panel}`,
    '',
    `The place: ${place}`,
    '',
    `Style: 16-bit SNES-era JRPG pixel art, crisp hard-edged pixels, a rich but limited palette, ${lit}, readable shapes, gentle texture: ${LOOK[r.biome] || 'stone, earth and growing things'}.`,
    '',
    'Do not include: people, animals or creatures (the game draws them), text or lettering, signs with writing, UI, borders, frames, grid lines, watermarks, blur, a vignette, or an isometric or tilted camera.',
    '',
    SHAPE[p.aspect],
  ].join('\n');
};

// M6: the style of the player's own whole-map paintings (art-in/maps/): a style transfer onto the layout
const atlasPrompt = (id, r, p, place) => {
  const k = r.panels.indexOf(p), n = r.panels.length;
  const lit = DARK.has(id)
    ? 'Even, soft light so that every stone and root reads clearly (the game lays its own darkness over this place), no deep black shadows'
    : 'Soft light from the upper left with short shadows falling to the lower right';
  const panel = n > 1 ? ` This picture is panel ${'ABCDEFGH'[k]} of ${n} of one map: the panels overlap, so paint the ground, light and colours exactly as in the other ${n > 2 ? 'panels' : 'panel'}.` : '';
  return [
    `Use case: style-transfer. Create the ${r.name.replace(/^The /, '')} game map background, with no written title. Image 1 is the game's own map${n > 1 ? ` (panel ${'ABCDEFGH'[k]} of ${n})` : ''} and controls its geometry: every wall, roof, tree, rock, road, bridge, cliff and shoreline stays where it is, the same size and shape. Image 2 is the style to match: its fine ink contours, intricately painted natural colours, richly detailed foliage and weathered materials, close overhead view and crisp fantasy-atlas illustration. The same visual world, not a soft 3D render. ${SHAPE_WORD[p.aspect][0].toUpperCase() + SHAPE_WORD[p.aspect].slice(1)} exactly, image 1 edge to edge; where image 1 shows plain filler at its edges, paint more of the same surroundings.${panel}`,
    '',
    `The place: ${place}`,
    '',
    `Materials: ${LOOK[r.biome] || 'stone, earth and growing things'}. ${lit}.`,
    '',
    'Keep the original axis-aligned overhead three-quarter camera, clear walkable ground and every opening where it is. No isometric rotation or horizon. Do not add, move or remove anything that would block a path. No people, creatures, chests, signs, text, labels, UI, border, grid, pixel blocks, vignette or photographic rendering.',
    '',
    SHAPE[p.aspect],
  ].join('\n');
};

const title = String(args.title || 'Batch 2');
const atlas = args.style === 'atlas';
const styleRef = String(args.styleref || 'art-in/pilot/map-thornhollow.png');
const folder = path.basename(path.dirname(path.dirname(path.resolve(String(args.refs))))); // art-requests/<folder>/refs/refs.json
const intro = String(args.intro || 'every map of the Verdant Wilds and the Sunscorch that is not painted yet');
const lines = [
  `# ${title}`,
  '',
  `${places.length} paintings: ${intro}. The loop and the naming are as in \`README.md\`. For each one: attach its`,
  atlas
    ? `reference from \`${folder}/refs/\` as the first picture and your painting \`${styleRef}\` as the second (the style your`
    : `reference from \`${folder}/refs/\`, paste`,
  atlas
    ? 'whole-map paintings matched), paste its prompt, generate, and keep the best try under the file name given. A map too'
    : 'its prompt, generate, and keep the best try under the file name given. A long road comes as two panels',
  atlas
    ? 'big for one picture comes as panels (`-a`, `-b`, ...) that overlap; paint them the same way and the game joins them.'
    : '(`-a` and `-b`) that overlap by a few rows; paint them the same way and the game joins them.',
  `Upload the finished pictures (or one zip) to \`art-in/${folder}/\`, or send them in the chat.`,
  '',
  '| # | File | Place | Shape | Attach |',
  '|---|---|---|---|---|',
  ...places.map(({ file }, i) => {
    const { r, p } = panelOf.get(file);
    return `| ${i + 1} | \`${file}\` | ${r.name}${r.panels.length > 1 ? ` (panel ${'ABCDEFGH'[r.panels.indexOf(p)]} of ${r.panels.length})` : ''} | ${SHAPE_WORD[p.aspect]} | \`refs/${p.ref}\`${atlas ? ' + the style' : ''} |`;
  }),
  '',
  '---',
  '',
];
places.forEach(({ file, place }, i) => {
  const { id, r, p } = panelOf.get(file);
  const attach = atlas ? `Attach \`refs/${p.ref}\` first and \`${styleRef}\` second, then paste:` : `Attach \`refs/${p.ref}\`, then paste:`;
  lines.push(`## ${i + 1}. \`${file}\`: ${r.name}${r.panels.length > 1 ? `, panel ${'ABCDEFGH'[r.panels.indexOf(p)]} of ${r.panels.length}` : ''}`, '', attach, '', '```', (atlas ? atlasPrompt : prompt)(id, r, p, place), '```', '');
});
await writeFile(path.resolve(String(args.out)), lines.join('\n'));
console.log(`wrote ${path.resolve(String(args.out))}: ${places.length} prompts`);
