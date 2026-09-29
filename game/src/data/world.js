// The world above the maps (M3 spec §2, §3.3, §4.2; M4 spec §2; M5 spec §2): regions, Brands, patrol zones,
// Hearthfires, the start position, the 17 places on the illustrated map, the critical paths and the
// optional leads.
// Coordinates: tiles for maps, viewBox 1200x800 for the illustrated map (`lore`).
// Owner: WP3; M4 P2 (the Sunscorch stands, SUN_PATH, SUN_LEADS); M5 P2 (the Ironspire stands, IRON_PATH,
// IRON_LEADS). Imports nothing from rules/.

import { deepFreeze } from '../core/freeze.js';

// The M4 plug point: a region opens by adding its maps and swapping its sealed exits for exits.
export const REGIONS = deepFreeze({
  verdant: { id: 'verdant', name: 'The Verdant Wilds', act: 1, lore: [270, 220], brands: ['brand-of-briars', 'brand-of-the-heartroot'], open: true },
  sunscorch: { id: 'sunscorch', name: 'The Sunscorch Wastes', act: 2, lore: [870, 470], entries: ['keep-se'], brands: ['brand-of-glass', 'brand-of-ash'], open: true },
  ironspire: { id: 'ironspire', name: 'The Ironspire Peaks', act: 2, lore: [870, 160], entries: ['keep-e', 'fr-highfold'], brands: ['brand-of-iron', 'brand-of-frost'], open: true },
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
  // M4: the Sunscorch Wastes (spec §2.6; levels are WP-foes's to tune in Gate 4)
  'sun-road': { id: 'sun-road', level: 9, sets: 'sun-road', backdrop: 'sun-road' },
  'dust-trail': { id: 'dust-trail', level: 10, sets: 'dust-trail', backdrop: 'dust-trail' },
  'deep-shaft': { id: 'deep-shaft', level: 11, sets: 'deep-shaft', backdrop: 'deep-shaft' },
  'glass-flats': { id: 'glass-flats', level: 11, sets: 'glass-flats', backdrop: 'glass-flats' },
  scorchgate: { id: 'scorchgate', level: 12, sets: 'scorchgate', backdrop: 'scorchgate' },
  // M5: the Ironspire Peaks (spec §2.6; levels are P4's to tune; Sunscorch backdrops stand in until P6 paints)
  'rockslide-pass': { id: 'rockslide-pass', level: 13, sets: 'rockslide-pass', backdrop: 'dust-trail' },
  highfold: { id: 'highfold', level: 14, sets: 'highfold', backdrop: 'dust-trail' },
  'iron-stair': { id: 'iron-stair', level: 14, sets: 'iron-stair', backdrop: 'dust-trail' },
  deeps: { id: 'deeps', level: 15, sets: 'deeps', backdrop: 'deep-shaft' },
  'frost-road': { id: 'frost-road', level: 16, sets: 'frost-road', backdrop: 'glass-flats' },
  frostmere: { id: 'frostmere', level: 16, sets: 'frostmere', backdrop: 'miragewell' },
});

// The Hearthfires (ten in the Wilds, seven in the Sunscorch, seven in the Ironspire). x, y, face is the STAND (where the party wakes, rests and arrives by
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
  // M4 (spec §2.5): the stands of the laid-out Sunscorch maps (M4 P2). The Last Watchfire stands against
  // Scorchgate's last wall, so its stand is north of it and faces south.
  waystone: H('sun-road', 16, 21, [700, 420], 'The Waystone Fire'),
  'spire-hearth': H('sandspire', 15, 13, [870, 470], 'The Spire Hearth'),
  'dust-cairn': H('dust-trail', 22, 9, [830, 520], 'The Dust Cairn', { cold: true }),
  pithead: H('dusthaven', 9, 6, [780, 560], 'The Pithead Fire'),
  'shaft-lamp': H('deep-shaft-1', 8, 12, [770, 575], 'The Shaft Lamp', { cold: true }),
  'well-fire': H('miragewell', 10, 13, [1010, 540], 'The Well Fire'),
  'last-watchfire': H('scorchgate', 20, 13, [930, 660], 'The Last Watchfire', { cold: true, face: 's' }),
  // M5 (spec §2.5). Stands are the scaffold's placeholders until P2 lays the maps out.
  'pass-shrine': H('rockslide-pass', 12, 41, [650, 330], 'The Pass Shrine'),
  'veil-hearth': H('peaks-veil', 14, 12, [750, 240], 'The Cloister Fire'),
  'stair-cairn': H('iron-stair', 12, 29, [800, 200], 'The Stair Cairn', { cold: true }),
  'thanes-hearth': H('ironhold', 16, 12, [870, 160], 'The Thane\'s Hearth'),
  'deeps-forge': H('ironhold-deeps', 14, 18, [875, 175], 'The Deeps Furnace', { cold: true }),
  'stormwatch-fire': H('stormwatch', 13, 12, [1020, 240], 'The Watch Fire'),
  'frost-cairn': H('frost-road', 20, 14, [1000, 180], 'The Frost Cairn', { cold: true }),
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
  sandspire: P('Sandspire', 'Trade City', 'sunscorch', [870, 470], 'sandspire'),
  dusthaven: P('Dusthaven', 'Mining Camp', 'sunscorch', [780, 560], 'dusthaven'),
  miragewell: P('Miragewell', 'Oasis Village', 'sunscorch', [1010, 540], 'miragewell'),
  scorchgate: P('Scorchgate Ruins', 'Ancient Ruins', 'sunscorch', [930, 660], 'scorchgate'),
  ironhold: P('Ironhold Fortress', 'Dwarven Stronghold', 'ironspire', [870, 160], 'ironhold'),
  peaksveil: P('Peak\'s Veil', 'Monastery', 'ironspire', [750, 240], 'peaks-veil'),
  stormwatch: P('Stormwatch Outpost', 'Military Post', 'ironspire', [1020, 240], 'stormwatch'),
  frostmere: P('Frostmere Lake', 'Sacred Lake', 'ironspire', [980, 120], 'frostmere'),
  bogmire: P('Bogmire', 'Swamp Town', 'gloomfen', [280, 530]),
  rotbridge: P('Rotbridge', 'Crossing Point', 'gloomfen', [170, 600]),
  willowmurk: P('Willowmurk', 'Hidden Village', 'gloomfen', [410, 620]),
  misthollow: P('Misthollow Ruins', 'Sunken Ruins', 'gloomfen', [330, 680]),
});

// Every encounter and Hearthfire on the guided route, in order (the sim and the walk test follow it).
export const CRITICAL_PATH = Object.freeze(['hearthstone-keep', 'keep-vault', 'hearth-road', 'waymarker-stones', 'milestone-fire', 'bramble-toll', 'verdant-edge',
  'rotstag-glade', 'thornhollow', 'tally-camp', 'snag-wallow', 'bramble-deep', 'den-mouth', 'briarmaw-den',
  'eldergrove-hearth', 'tamsin-duel', 'hr1-grubs', 'hr1-sapwight', 'rotwarden-heart']);

// M4: the Sunscorch critical path (spec §2.2) and its leads, in the same shape.
export const SUN_PATH = Object.freeze(['waystone', 'sr-toll', 'spire-hearth', 'dt-scorpions', 'dust-cairn', 'pithead', 'ds-crew', 'shaft-lamp',
  'kharzul-heart', 'gf-raiders', 'last-watchfire', 'sg-captain', 'tamsin-scorchgate', 'vault-guard', 'ashen-warden']);
export const SUN_LEADS = deepFreeze({
  caravan: ['gf-caravan'], wyrm: ['wyrm-lair'], gnash: ['gnash-camp'], well: ['wisp-queen'], aqueduct: ['dt-aqueduct'],
});

// M5: the Ironspire critical path (spec §2.2), road-first: the Brand of Iron, then the Brand of Frost.
export const IRON_PATH = Object.freeze(['pass-shrine', 'rp-brigands', 'rp-rocklings', 'veil-hearth', 'is-sentinels', 'stair-cairn', 'thanes-hearth',
  'tamsin-ironhold', 'id-forgeborn', 'deeps-forge', 'id-bellows', 'mother-anvil', 'stormwatch-fire',
  'fr-cutters', 'frost-cairn', 'fm-wraiths', 'fb-choir', 'rime-abbot']);
export const IRON_LEADS = deepFreeze({
  roc: ['hf-trolls', 'roc-eyrie'], horn: ['troll-cave'], smith: ['id-smith'], shrine: ['fm-shrine'],
});

// The optional leads after the Brand (and the early optional fights), by name.
export const LEADS = deepFreeze({
  mosswatch: ['mw-stair', 'mw-lantern'], mire: ['mf-smugglers', 'mire-shrine'], bell: ['hw-glowcaps', 'gloamwing-hollow'],
  grove: ['grove-circle'], roots: ['hollowed-patrol', 'hr1-tappers'], early: ['hr-smugglers', 'poachers-holm'],
});
