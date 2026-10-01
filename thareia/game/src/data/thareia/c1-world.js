// Thareia (T2): Chapter 1's patrol zones and Hearthfire stands (design/09-t2-spec.md 5.3), merged into data/world.js.
// Owner: T. C1_ZONES[id] = { id, level, sets, backdrop } (format as data/world.js ZONES). C1_HEARTHS[id] =
// { map, x, y, face, lore, name, cold } (the stand; format as data/world.js H()).
//
// A roaming pack stands at ZONES[id].level + 0-1 (rules/world.js seedRoamers). Each zone sits one below the expected
// arrival level on the fight route; the two solo zones (the landing and the Thornway) stay at 1, so an early-route hero
// at level 1 never meets a pack above level 2. The sets are C1_PATROLS in c1-encounters.js, keyed by the zone id.
const Z = (id, level, backdrop) => ({ id, level, sets: id, backdrop });
export const C1_ZONES = {
  'th-landing': Z('th-landing', 1, 'verdant-wood'),
  'th-thornway': Z('th-thornway', 1, 'verdant-wood'),
  'th-roots': Z('th-roots', 6, 'heartroot'),
  'th-mossfall': Z('th-mossfall', 6, 'mossfall'),
  'th-hindwood': Z('th-hindwood', 7, 'verdant-wood'),
};

// The nine fires (5.1), at the stands the maps give them (design/09-t2-spec.md 2.2-2.9). `lore` is the fire's point on
// the illustrated map, next to the old fire of the same place. The Last Green Coal is lit by Taela (coldTalk); the
// Mosswatch Fire and the Dreaming Stone stay cold until the story lights them (coldUntil on the map).
const H = (map, x, y, lore, name, o = {}) => ({ map, x, y, face: 'n', lore, name, cold: false, ...o });
export const C1_HEARTHS = {
  'th-tw-hearth': H('th-thornway', 22, 10, [262, 208], 'The Thornway Stone'),
  'th-eg-hearth': H('th-eldergrove', 13, 16, [200, 160], 'Eldergrove Hearth'),
  'th-hr-coal': H('th-heartroot-1', 4, 21, [192, 152], 'The Last Green Coal', { cold: true }),
  'th-mf-cairn': H('th-mossfall', 30, 8, [225, 272], 'Mossfall Cairn'),
  'th-mw-hearth': H('th-mosswatch-1', 2, 11, [146, 286], 'Garret\'s Kitchen', { face: 'w' }),
  'th-mw-fire': H('th-mosswatch-2', 6, 3, [140, 280], 'The Mosswatch Fire', { cold: true }),
  'th-hw-cairn': H('th-hindwood', 10, 26, [335, 225], 'Hindwood Cairn'),
  'th-fr-camp': H('th-fawnrest', 7, 13, [364, 176], 'The Pilgrims\' Fire'),
  'th-fr-stone': H('th-fawnrest', 11, 7, [370, 170], 'The Dreaming Stone', { cold: true }),
};
