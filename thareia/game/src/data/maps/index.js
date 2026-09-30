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
// A prop is drawn on every tile of its `area` (a gate's look, the vault's boxes); a large one (Hush, the black barge,
// the First Sleeper, the Worldforge) is one entity at its sprite's foot (`at`), drawn once, with solid tiles round it.
// Map rules that test/maps.test.mjs enforces (so new maps, e.g. M4's, keep the world playable):
//   - a Hearthfire touches its stand, so `interact` from the stand reaches it;
//   - every CRITICAL_PATH target is reachable with only the starter relic at the worst-case levels,
//     and a block or lair the Brand re-arms never closes the only way on;
//   - every hard lock and story gate is the only way through to what it guards;
//   - pack homes are roamable and inside a roam rect; roam rects stay roomy.
// tools/map-draft.mjs draws any map as ASCII or PNG (--png, --art for the real tiles) with a lint.
// Owner: WP3 (index, keep, keep-hall, hearth-road, thornhollow, thornway, briarmaw-den, mossfall);
// WP3B (mosswatch-1, mosswatch-2, hindwood, fawnrest, eldergrove, heartroot-1, heartroot-2); M4 P2 (the
// Sunscorch maps); M5 P2 (the Ironspire maps and the Ironspire Gallery); M6 P2 (the Gloomfen maps and the Gloomfen Gallery);
// M7 P2 (the Hearth Below's four maps).

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
// M5, the East Road (the lead's six painted maps between the Keep's east postern and the Rockslide Pass)
import oldBridge from './old-bridge.js';
import drystoneLea from './drystone-lea.js';
import plankford from './plankford.js';
import shrinewood from './shrinewood.js';
import silverfall from './silverfall.js';
import lastCamp from './last-camp.js';
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
// M6: the Gloomfen Marsh (spec §2.1) and the reliquary's fourth room
import murkway from './murkway.js';
import willowmurk from './willowmurk.js';
import rotbridge from './rotbridge.js';
import bogmire from './bogmire.js';
import lanternfen from './lanternfen.js';
import mothersHollow from './mothers-hollow.js';
import longBoardwalk from './long-boardwalk.js';
import misthollow from './misthollow.js';
import drownedBelfry from './drowned-belfry.js';
import blackwaterReach from './blackwater-reach.js';
import tidalFlats from './tidal-flats.js';
import causeway from './causeway.js';
import keepGallery3 from './keep-gallery-3.js';
// M7: the Hearth Below (spec §2.1), under the Keep's vault
import hollowHall from './hollow-hall.js';
import ashStair from './ash-stair.js';
import chainedDeep from './chained-deep.js';
import worldforge from './worldforge.js';
// Thareia (T1): the Prologue's maps (th-bogmire and th-thornhollow draw the old game's paintings)
import bogmireDocks from './bogmire-docks.js';
import thBogmire from './th-bogmire.js';
import thThornhollow from './th-thornhollow.js';
// Thareia (T2): Chapter 1's maps (the th-* copies draw the old Verdant Wilds paintings; the landing, the node and the
// cove are new painted maps)
import thLanding from './th-landing.js';
import thThornway from './th-thornway.js';
import thEldergrove from './th-eldergrove.js';
import thHeartroot1 from './th-heartroot-1.js';
import thMossfall from './th-mossfall.js';
import thMosswatch1 from './th-mosswatch-1.js';
import thMosswatch2 from './th-mosswatch-2.js';
import thHindwood from './th-hindwood.js';
import thFawnrest from './th-fawnrest.js';
import thBriarmawDen from './th-briarmaw-den.js';
import thFawnrestNode from './th-fawnrest-node.js';
import thFjordsCove from './th-fjords-cove.js';

const LIST = [keep, keepHall, hearthRoad, thornhollow, thornway, briarmawDen, mossfall, mosswatch1, mosswatch2, hindwood, fawnrest, eldergrove, heartroot1, heartroot2,
  sunRoad, sandspire, dustTrail, dusthaven, deepShaft1, deepShaft2, glassFlats, miragewell, scorchgate, scorchgateVaults, keepGallery,
  oldBridge, drystoneLea, plankford, shrinewood, silverfall, lastCamp, rockslidePass, peaksVeil, highfold, ironStair, ironhold, ironholdDeeps, harrowsForge, stormwatch, frostRoad, frostmere, frostmereBelow, keepGallery2,
  murkway, willowmurk, rotbridge, bogmire, lanternfen, mothersHollow, longBoardwalk, misthollow, drownedBelfry, blackwaterReach, tidalFlats, causeway, keepGallery3,
  hollowHall, ashStair, chainedDeep, worldforge,
  bogmireDocks, thBogmire, thThornhollow,
  thLanding, thThornway, thEldergrove, thHeartroot1, thMossfall, thMosswatch1, thMosswatch2, thHindwood, thFawnrest, thBriarmawDen,
  thFawnrestNode, thFjordsCove];

export const MAPS = Object.freeze(Object.fromEntries(LIST.map(m => [m.id, m])));
// Thareia's own maps (the old game's tests of its world leave them out; test/thareia.test.mjs checks them)
export const TH_MAP_IDS = Object.freeze(['bogmire-docks', 'th-bogmire', 'th-thornhollow',
  'th-landing', 'th-thornway', 'th-eldergrove', 'th-heartroot-1', 'th-mossfall', 'th-mosswatch-1', 'th-mosswatch-2', 'th-hindwood',
  'th-fawnrest', 'th-briarmaw-den', 'th-fawnrest-node', 'th-fjords-cove']);
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
