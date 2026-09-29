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
};
const DARK = new Set(['mosswatch-2', 'heartroot-2', 'deep-shaft-1', 'scorchgate-vaults']);
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

const title = String(args.title || 'Batch 2');
const lines = [
  `# ${title}`,
  '',
  `${places.length} paintings: every map of the Verdant Wilds and the Sunscorch that is not painted yet. The loop, the`,
  'style and the naming are as in `README.md`. For each one: attach its reference from `batch-2/refs/`, paste',
  'its prompt, generate, and keep the best try under the file name given. A long road comes as two panels',
  '(`-a` and `-b`) that overlap by a few rows; paint them the same way and the game joins them.',
  'Upload the finished pictures (or one zip) to `art-in/batch-2/`.',
  '',
  '| # | File | Place | Shape | Attach |',
  '|---|---|---|---|---|',
  ...places.map(({ file }, i) => {
    const { r, p } = panelOf.get(file);
    return `| ${i + 1} | \`${file}\` | ${r.name}${r.panels.length > 1 ? ` (panel ${'ABCDEFGH'[r.panels.indexOf(p)]} of ${r.panels.length})` : ''} | ${SHAPE_WORD[p.aspect]} | \`refs/${p.ref}\` |`;
  }),
  '',
  '---',
  '',
];
places.forEach(({ file, place }, i) => {
  const { id, r, p } = panelOf.get(file);
  lines.push(`## ${i + 1}. \`${file}\`: ${r.name}${r.panels.length > 1 ? `, panel ${'ABCDEFGH'[r.panels.indexOf(p)]} of ${r.panels.length}` : ''}`, '', `Attach \`refs/${p.ref}\`, then paste:`, '', '```', prompt(id, r, p, place), '```', '');
});
await writeFile(path.resolve(String(args.out)), lines.join('\n'));
console.log(`wrote ${path.resolve(String(args.out))}: ${places.length} prompts`);
