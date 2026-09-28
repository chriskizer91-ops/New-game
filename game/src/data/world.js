// The world above the maps (M3 spec §2, §3.3, §4.2): regions, Brands, patrol zones, Hearthfires,
// the start position, the 17 places on the illustrated map, the critical path and the optional leads.
// Coordinates: tiles for maps, viewBox 1200x800 for the illustrated map (`lore`).
// Owner: WP3. Imports nothing from rules/.

import { deepFreeze } from '../core/freeze.js';

// The M4 plug point: a region opens by adding its maps and swapping its sealed exits for exits.
export const REGIONS = deepFreeze({
  verdant: { id: 'verdant', name: 'The Verdant Wilds', act: 1, lore: [270, 220], brands: ['brand-of-briars', 'brand-of-the-heartroot'], open: true },
  sunscorch: { id: 'sunscorch', name: 'The Sunscorch Wastes', act: 2, lore: [870, 470], entries: ['keep-se'], brands: [], open: false },
  ironspire: { id: 'ironspire', name: 'The Ironspire Peaks', act: 2, lore: [870, 160], entries: ['keep-e', 'fr-highfold'], brands: [], open: false },
  gloomfen: { id: 'gloomfen', name: 'The Gloomfen Marsh', act: 2, lore: [280, 530], entries: ['keep-sw', 'mf-fen-stair'], brands: [], open: false },
});
export const REGION_IDS = Object.freeze(Object.keys(REGIONS));

// Coals on the Hearth Clock.
export const BRAND_TOTAL = 8;

// Patrol zones: base level (Waking 0), the PATROLS set key in data/encounters.js, battle backdrop.
export const ZONES = deepFreeze({
  'hearth-road': { id: 'hearth-road', level: 2, sets: 'hearth-road', backdrop: 'hearth-road' },
  thornway: { id: 'thornway', level: 5, sets: 'verdant-wood', backdrop: 'verdant-wood' },
  mossfall: { id: 'mossfall', level: 7, sets: 'mossfall', backdrop: 'mossfall' },
  hindwood: { id: 'hindwood', level: 7, sets: 'hindwood', backdrop: 'verdant-wood' },
  heartroot: { id: 'heartroot', level: 8, sets: 'heartroot', backdrop: 'heartroot' },
});

// The ten Hearthfires. x, y, face is the STAND (where the party wakes, rests and arrives by
// travel), facing the fire. `cold` fires start unlit (the cold-hearth lock).
const H = (map, x, y, lore, name, o = {}) => ({ map, x, y, face: 'n', lore, name, cold: false, ...o });
export const HEARTHS = deepFreeze({
  'hearthstone-keep': H('keep-hall', 12, 5, [540, 390], 'The Eternal Hearth'),
  'milestone-fire': H('hearth-road', 15, 44, [430, 330], 'The Milestone Fire'),
  thornhollow: H('thornhollow', 12, 13, [310, 260], 'Thornhollow Hearth'),
  'den-mouth': H('thornway', 22, 10, [262, 208], 'The Last Coals'),
  'mossfall-cairn': H('mossfall', 30, 8, [225, 272], 'The Mossfall Cairn', { cold: true }),
  'mosswatch-fire': H('mosswatch-2', 6, 3, [140, 280], 'The Signal Fire', { cold: true }),
  'hindwood-cairn': H('hindwood', 10, 26, [335, 225], 'The Hindwood Cairn', { cold: true }),
  'fawnrest-stone': H('fawnrest', 11, 7, [370, 170], 'The Dreaming Stone'),
  'eldergrove-hearth': H('eldergrove', 13, 16, [200, 160], 'The Eldergrove Hearth'),
  'last-green-coal': H('heartroot-1', 4, 21, [192, 152], 'The Last Green Coal', { cold: true }),
});
export const HEARTH_IDS = Object.freeze(Object.keys(HEARTHS));

// New game ends here (the prologue in the Great Hall).
export const START_AT = deepFreeze({ map: 'keep-hall', x: 12, y: 6, face: 'n' });

// The 17 places on the illustrated map (viewBox 1200x800), keyed by the map's own location ids.
// `map` links a place to its M3 map; places in sealed regions have none yet.
const P = (name, kind, region, at, map = null) => ({ name, kind, region, at, map });
export const LORE = deepFreeze({
  crossroads: P('Hearthstone Keep', 'Capital & Crossroads', null, [540, 390], 'keep'),
  eldergrove: P('Eldergrove', 'Ancient Settlement', 'verdant', [200, 160], 'eldergrove'),
  thornhollow: P('Thornhollow', 'Outpost', 'verdant', [310, 260], 'thornhollow'),
  mosswatch: P('Mosswatch Tower', 'Watchtower', 'verdant', [140, 280], 'mosswatch-1'),
  fawnrest: P('Fawnrest Shrine', 'Sacred Site', 'verdant', [370, 170], 'fawnrest'),
  sandspire: P('Sandspire', 'Trade City', 'sunscorch', [870, 470]),
  dusthaven: P('Dusthaven', 'Mining Camp', 'sunscorch', [780, 560]),
  miragewell: P('Miragewell', 'Oasis Village', 'sunscorch', [1010, 540]),
  scorchgate: P('Scorchgate Ruins', 'Ancient Ruins', 'sunscorch', [930, 660]),
  ironhold: P('Ironhold Fortress', 'Dwarven Stronghold', 'ironspire', [870, 160]),
  peaksveil: P('Peak\'s Veil', 'Monastery', 'ironspire', [750, 240]),
  stormwatch: P('Stormwatch Outpost', 'Military Post', 'ironspire', [1020, 240]),
  frostmere: P('Frostmere Lake', 'Sacred Lake', 'ironspire', [980, 120]),
  bogmire: P('Bogmire', 'Swamp Town', 'gloomfen', [280, 530]),
  rotbridge: P('Rotbridge', 'Crossing Point', 'gloomfen', [170, 600]),
  willowmurk: P('Willowmurk', 'Hidden Village', 'gloomfen', [410, 620]),
  misthollow: P('Misthollow Ruins', 'Sunken Ruins', 'gloomfen', [330, 680]),
});

// Every encounter and Hearthfire on the guided route, in order (the sim and the walk test follow it).
export const CRITICAL_PATH = Object.freeze(['hearthstone-keep', 'keep-vault', 'hearth-road', 'waymarker-stones', 'milestone-fire', 'bramble-toll', 'verdant-edge',
  'rotstag-glade', 'thornhollow', 'tally-camp', 'snag-wallow', 'bramble-deep', 'den-mouth', 'briarmaw-den',
  'eldergrove-hearth', 'tamsin-duel', 'hr1-grubs', 'hr1-sapwight', 'rotwarden-heart']);

// The optional leads after the Brand (and the early optional fights), by name.
export const LEADS = deepFreeze({
  mosswatch: ['mw-stair', 'mw-lantern'], mire: ['mf-smugglers', 'mire-shrine'], bell: ['hw-glowcaps', 'gloamwing-hollow'],
  grove: ['grove-circle'], roots: ['hollowed-patrol', 'hr1-tappers'], early: ['hr-smugglers', 'poachers-holm'],
});
