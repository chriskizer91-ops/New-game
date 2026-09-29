// The overworld maps (M3 spec §2, §4.2) and lookups over them. Pure data; imports nothing from rules/.
//
// A map module default-exports a frozen object:
//   { id, name, region, biome, music, backdrop, zone|null, level, travel, dark,
//     lore: [[loreX, loreY, tileX, tileY], ...]   one pair = a point, two = a projection line
//     w, h, rows: [h strings of exactly w chars from data/tiles.js LEGEND],
//     entities: [{ id, kind, at:[x,y] | area:[x0,y0,x1,y1], if?, ...kind fields }],
//     exits: [{ id, area, to, anchor, unlock? } | { id, area, sealed: { region, text } }],
//     anchors: { name: [x, y, face] },   roam: { max, rects: [[x0,y0,x1,y1]] } | null }
// Entity kinds (see §4.2 for their fields): encounter (id === enc; mode pack|block|lair; big lairs
// carry both `at`, the sprite foot, and `area`, the solid footprint), hearthfire (id === hearthfire
// id; stand:[x,y,face]; cold?), npc, gate, lock, chest, sign, board, table, pedestal, lookout,
// bellframe, prop, trigger, light. Entity ids are unique within a map; lock, gate, chest and
// trigger ids are unique across all maps (flags.unlocked / opened / seen are keyed by them).
// Map rules that test/maps.test.mjs enforces (so new maps, e.g. M4's, keep the world playable):
//   - a Hearthfire touches its stand, so `interact` from the stand reaches it;
//   - every CRITICAL_PATH target is reachable with only the starter relic at the worst-case levels,
//     and a block or lair the Brand re-arms never closes the only way on;
//   - every hard lock and story gate is the only way through to what it guards;
//   - pack homes are roamable and inside a roam rect; roam rects stay roomy.
// tools/map-draft.mjs draws any map as ASCII or PNG (--png, --art for the real tiles) with a lint.
// Owner: WP3 (index, keep, keep-hall, hearth-road, thornhollow, thornway, briarmaw-den, mossfall);
// WP3B (mosswatch-1, mosswatch-2, hindwood, fawnrest, eldergrove, heartroot-1, heartroot-2); M4 P2 (the
// Sunscorch maps); M5 P2 (the Ironspire maps and the Ironspire Gallery).

import keep from './keep.js';
import keepHall from './keep-hall.js';
import hearthRoad from './hearth-road.js';
import thornhollow from './thornhollow.js';
import thornway from './thornway.js';
import briarmawDen from './briarmaw-den.js';
import mossfall from './mossfall.js';
import mosswatch1 from './mosswatch-1.js';
import mosswatch2 from './mosswatch-2.js';
import hindwood from './hindwood.js';
import fawnrest from './fawnrest.js';
import eldergrove from './eldergrove.js';
import heartroot1 from './heartroot-1.js';
import heartroot2 from './heartroot-2.js';
// M4: the Sunscorch Wastes (spec §2.1)
import sunRoad from './sun-road.js';
import sandspire from './sandspire.js';
import dustTrail from './dust-trail.js';
import dusthaven from './dusthaven.js';
import deepShaft1 from './deep-shaft-1.js';
import deepShaft2 from './deep-shaft-2.js';
import glassFlats from './glass-flats.js';
import miragewell from './miragewell.js';
import scorchgate from './scorchgate.js';
import scorchgateVaults from './scorchgate-vaults.js';
import keepGallery from './keep-gallery.js';
// M5: the Ironspire Peaks (spec §2.1) and the reliquary's third room
import rockslidePass from './rockslide-pass.js';
import peaksVeil from './peaks-veil.js';
import highfold from './highfold.js';
import ironStair from './iron-stair.js';
import ironhold from './ironhold.js';
import ironholdDeeps from './ironhold-deeps.js';
import harrowsForge from './harrows-forge.js';
import stormwatch from './stormwatch.js';
import frostRoad from './frost-road.js';
import frostmere from './frostmere.js';
import frostmereBelow from './frostmere-below.js';
import keepGallery2 from './keep-gallery-2.js';

const LIST = [keep, keepHall, hearthRoad, thornhollow, thornway, briarmawDen, mossfall, mosswatch1, mosswatch2, hindwood, fawnrest, eldergrove, heartroot1, heartroot2,
  sunRoad, sandspire, dustTrail, dusthaven, deepShaft1, deepShaft2, glassFlats, miragewell, scorchgate, scorchgateVaults, keepGallery,
  rockslidePass, peaksVeil, highfold, ironStair, ironhold, ironholdDeeps, harrowsForge, stormwatch, frostRoad, frostmere, frostmereBelow, keepGallery2];

export const MAPS = Object.freeze(Object.fromEntries(LIST.map(m => [m.id, m])));
export const MAP_IDS = Object.freeze(LIST.map(m => m.id));

// ENTITY_OF[id] -> { map, entity } for every placed encounter and Hearthfire (their ids are
// ENCOUNTERS ids). The first placement wins; the map tests require exactly one.
const entityOf = {};
for (const m of LIST) {
  for (const e of m.entities) {
    if ((e.kind === 'encounter' || e.kind === 'hearthfire') && !entityOf[e.id]) entityOf[e.id] = Object.freeze({ map: m.id, entity: e });
  }
}
export const ENTITY_OF = Object.freeze(entityOf);

// anchor('thornway', 'from-den') -> { map, x, y, face } | null
export function anchor(mapId, name) {
  const a = MAPS[mapId]?.anchors?.[name];
  return a ? { map: mapId, x: a[0], y: a[1], face: a[2] } : null;
}

// Where an M2 save standing on Gauntlet node `nodeId` wakes up: the map anchor named 'v1:<nodeId>'.
const V1 = {};
for (const m of LIST) for (const name of Object.keys(m.anchors)) if (name.startsWith('v1:')) V1[name.slice(3)] = m.id;
export function v1Anchor(nodeId) {
  return V1[nodeId] ? anchor(V1[nodeId], `v1:${nodeId}`) : null;
}
