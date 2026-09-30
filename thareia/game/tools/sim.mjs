// Headless balance sim for M3 (spec §7 "Balance sim"), M4 (M4 spec §8 "Balance"), M5 (M5 spec §8), M6 (M6 spec §8) and M7 (M7
// spec §8): plays routes of encounters with the scripted policy in src/rules/autoplay.js across many seeds, teleporting
// between fights (no walking, no roaming packs), and prints balance tables.
//
//   node tools/sim.mjs [--seeds 200] [--starter hearthbrand|stillwater-lance|cairnmaul|mix] [--md] [--jobs N]
//                      [--modes m2,direct,leads2,leads-all,looper-w2,first-lead,sunscorch,sunscorch-forged,sun-first-lead,
//                               ironspire,ironspire-forged,iron-first-lead,gloomfen,gloomfen-forged,gloom-first-lead,
//                               below,below-forged]
//                      [--leads caravan,wyrm,gnash,well,aqueduct]   (sun-first-lead: only these leads)
//                      [--iron-leads roc,horn,smith,shrine]         (iron-first-lead: only these leads)
//                      [--gloom-leads willow,hodge,grue,cantor,jaws] (gloom-first-lead: only these leads)
//                      [--seed N | --from A --to B] [--trace] [--sun-cache <file>] [--iron-cache <file>] [--gloom-cache <file>]
//
// Modes (targets from the spec):
//   m2          Waking 0, the M2 road in order, equips drops; a wipe grinds a level and retries.
//               Waking-0 first-try results within +-3 points of the M2 table in docs/RULES.md.
//   direct      m2, then straight down the critical path after the Brand: Eldergrove, the Tamsin
//               duel, the Heartroot, the Rotwarden. Party L10-12 at the Rotwarden; Rotwarden
//               first-try wipe 30-40%; Tamsin first-try party win 55-70%.
//   leads2      m2, then the Mosswatch and Bell leads (the Dawnbell's dream: Forewarned), then the
//               critical path. Rotwarden first-try wipe <= 20%.
//   leads-all   m2, then every lead, then the critical path.
//   looper-w2   the migrated v1-waking2-dupe fixture (Waking 2) down the critical path.
//               Rotwarden first-try wipe <= 45%.
//   first-lead  m2, then each lead's lair as the first thing done at Waking 1: 15-25% first-try wipe.
// M4 (Gate 4), each from the end state of a `direct` run (the party that just beat the Rotwarden, at
// Waking 2, Act I done):
//   sunscorch        home to the Keep, then SUN_PATH (data/world.js) with one zone patrol per zone map
//                    crossed; after Kharzul (the Brand of Glass: Waking 3) back up the shaft and through
//                    Sandspire to the Glass Flats. Kharzul and the Ashen Warden first-try wipe 30-40%;
//                    Tamsin at Scorchgate first-try party win 55-70%.
//   sunscorch-forged the same, with every hero's weapon tempered to +4 and one gem each (a Sunstone in
//                    the weapon, or in the first socketed piece they wear): both Champions <= 20%.
//   sun-first-lead   each Sunscorch lead's lair (SUN_LEADS) as the first thing done after Sandspire, at
//                    Waking 2 (the Dust Trail's); the Glass Flats' once the Brand of Glass opens them, at
//                    Waking 3 (M4.5): 15-25% first-try wipe.
// M5 (Gate 5), each from the end state of a `sunscorch` run (the party that just beat the Ashen Warden, at
// Waking 4, both Sunscorch Brands held):
//   ironspire        home to the Keep (the second council), out of the east postern, then IRON_PATH
//                    (data/world.js) with one zone patrol per zone map crossed and a rest at each Hearthfire
//                    passed; the party rests before each Champion (the Deeps Furnace before Mother Anvil; back
//                    across the lake to the Frost Cairn before the Rime-Abbot). Mother Anvil and the
//                    Rime-Abbot first-try wipe 30-40%; Tamsin at Ironhold first-try party win 55-70%.
//   ironspire-forged the same, with every hero's weapon tempered to +6 and one gem each (a Frost Opal in the
//                    weapon, or in the first socketed piece they wear): both Champions <= 20%.
//   iron-first-lead  each Ironspire lead's lair (IRON_LEADS) as the first thing done once the road reaches
//                    it: the Thunder-Roc and Old Horn from Peak's Veil (Waking 4), Harrow's Journeyman once
//                    the Deeps open (Waking 4), the Drowned Abbess once the Brand of Iron opens the Frost Road
//                    (Waking 5): 15-25% first-try wipe.
// M6 (the Gloomfen), each from the end state of an `ironspire` run (the party that just beat the Rime-Abbot, at
// Waking 6, every earlier Brand held):
//   gloomfen         home to the Keep (the third council), down Mossfall's fen stair, then GLOOM_PATH (data/world.js)
//                    with one zone patrol per zone map crossed and a rest at each Hearthfire passed; Hodge's bar is
//                    paid (nothing is fought); the party rests before each Champion (the Fen Cairn before the Lantern
//                    Mother; the Flats Beacon before the Leviathan). The Lantern Mother and the Blackwater Leviathan
//                    first-try wipe 30-40%; Tamsin at Rotbridge first-try party win 55-70%.
//   gloomfen-forged  the same, with every hero's weapon tempered to +8 and one gem each (a Bog Amber in the weapon, or
//                    in the first socketed piece they wear): both Champions <= 20%. At the end of the region the forged
//                    party walks back to Rotbridge and fights Hodge (spec §8: never 100%).
//   gloom-first-lead each Gloomfen lead's lair (GLOOM_LEADS) as the first thing done once the road reaches it:
//                    Grandfather Willow from Willowmurk, Hodge on arrival at Rotbridge, Mother Grue from the Fen
//                    Cairn (Waking 6); the Drowned Cantor from the Belltower Fire and Old Jaws from the Wreck Fire, once
//                    the Brand of Lanterns opens the long boardwalk (Waking 7): 15-25% first-try wipe; Hodge 60-80%.
// M7 (the Hearth Below, Act III), each from the end state of a `gloomfen` run (the party that just beat the Blackwater
// Leviathan, at Waking 8, every Brand held):
//   below            home to the Keep (the fourth and fifth councils: nothing is fought), a rest at the Eternal Hearth,
//                    then ACT3_PATH (data/world.js): the Hollow Council back to back (no rest between the four; a wipe
//                    wakes the party at the Eternal Hearth and keeps who is beaten), the Ash Stair (a rest at the
//                    Under-Coal, the thralls at the narrows, their pack on the middle landing and one zone patrol), the
//                    Chained Deep (the unmade at the narrows, a rest at the Chain Fire), the forge-warden on the
//                    Worldforge's bridge, back to the Chain Fire to rest, and the Unsmith with Tamsin beside the party
//                    (the encounter's guest), his Stolen Arts decided by what this run's party has claimed
//                    (rules/codex.js stolenFor). Targets: 35-45% of runs wipe somewhere in the four, no Council member
//                    above 25%; the Unsmith first try 30-40%; every road fight <= 10%.
//   below-forged     the same, with every hero's weapon tempered to +10 and one gem each (a Bog Amber), and the
//                    Warden's Masterpiece forged at Hilda's once the Council is freed (the Warden's own, of the kind
//                    they carry, tempered to +10 too): the Unsmith <= 20%.
// Every mode: zero stuck runs. A duel lost is a yield (not retried); the door opens anyway. Hodge is fought once
// (ONE_TRY): a player who loses to him pays the day's price instead, and the bar opens either way (spec A11).
// Crossing a zone map costs a fight with one of its roaming patrols ('patrol:<zone>' in a route);
// a weak one runs from you and costs nothing (Milestone 4.5: no Routs; the player walks on). The m2
// mode has none, to compare with M2.
// --jobs N splits the seeds over N worker processes (the tables are the same, just sooner). --sun-cache
// <file> keeps each seed's Sunscorch end state in a file for the Ironspire modes (a tuning aid: only valid
// while nothing before the Ironspire changes; delete the file when it does). --iron-cache <file> does the same with
// each seed's Ironspire end state for the Gloomfen modes, and --gloom-cache <file> with each seed's Gloomfen end state
// for the Hearth Below's modes (M7).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { newGame, startBattle, resolveBattle, rest, spawnsFor, partyLevel } from '../src/rules/gauntlet.js';
import { isWeak } from '../src/rules/world.js';
import { ZONES, SUN_PATH, IRON_PATH, IRON_LEADS, GLOOM_PATH, GLOOM_LEADS, ACT3_PATH } from '../src/data/world.js';
import { migrate } from '../src/rules/migrate.js';
import { escalateSpawn, familyOf } from '../src/rules/foe.js';
import { current, act, foeTurn, outcome } from '../src/rules/battle.js';
import { autoCommand } from '../src/rules/autoplay.js';
import { equip, bestHeroFor } from '../src/rules/party.js';
import { damageMult } from '../src/rules/combat.js';
import { deriveHero, itemProfile } from '../src/rules/stats.js';
import { pageBonus } from '../src/rules/codex.js';
import { socketsOf, forgeMasterpiece, masterpieceCost } from '../src/rules/forge.js';
import { createRng } from '../src/core/rng.js';
import { ENCOUNTERS, GAUNTLET, PATROLS } from '../src/data/encounters.js';
import { RARITY_ORDER } from '../src/data/rarity.js';
import { RELICS } from '../src/data/relics.js';
import { ITEMS } from '../src/data/items.js';
import { MASTERPIECE_BASES } from '../src/data/masterpiece.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const SEEDS = +arg('seeds', 200);
const STARTER = arg('starter', 'mix');
const MD = args.includes('--md');
const M3_MODES = ['m2', 'direct', 'leads2', 'leads-all', 'looper-w2', 'first-lead'];
const SUN_MODES = ['sunscorch', 'sunscorch-forged', 'sun-first-lead'];
const IRON_MODES = ['ironspire', 'ironspire-forged', 'iron-first-lead'];
const GLOOM_MODES = ['gloomfen', 'gloomfen-forged', 'gloom-first-lead'];
const BELOW_MODES = ['below', 'below-forged'];
const ALL_MODES = [...M3_MODES, ...SUN_MODES, ...IRON_MODES, ...GLOOM_MODES, ...BELOW_MODES];
const ONLY = arg('modes', ALL_MODES.join(',')).split(',');
const ONE_SEED = arg('seed', null) ? +arg('seed') : null; // --seed N: replay one seed
const FROM = +arg('from', ONE_SEED ?? 1);                 // --from A --to B: a range of seeds (the workers)
const TO = +arg('to', ONE_SEED ?? SEEDS);
const JOBS = Math.max(1, +arg('jobs', 1));
const JSON_OUT = args.includes('--json');                  // a worker: print the raw stats as JSON
const TRACE = args.includes('--trace');                    // print every fight
const SUN_ONLY_LEADS = arg('leads', null);                 // --leads wyrm,aqueduct: sun-first-lead runs only these
const IRON_ONLY_LEADS = arg('iron-leads', null);           // --iron-leads roc,shrine: iron-first-lead runs only these
const GLOOM_ONLY_LEADS = arg('gloom-leads', null);         // --gloom-leads hodge,jaws: gloom-first-lead runs only these
const SUN_CACHE = arg('sun-cache', null);
const IRON_CACHE = arg('iron-cache', null);
const GLOOM_CACHE = arg('gloom-cache', null);
const STARTERS = ['hearthbrand', 'stillwater-lance', 'cairnmaul'];
const MAX_TRIES = 8; // a player who keeps wiping grinds a level each time; eight tries is 'stuck'

// Routes: hearthfire ids rest; fight ids are fought until cleared (duels once).
const AFTER_BRAND = ['patrol:thornway', 'eldergrove-hearth', 'tamsin-duel', 'patrol:heartroot', 'hr1-grubs', 'patrol:heartroot', 'hr1-sapwight', 'last-green-coal', 'rotwarden-heart'];
const LEAD_ROUTES = {
  mosswatch: ['thornhollow', 'patrol:mossfall', 'mossfall-cairn', 'mw-stair', 'mw-lantern', 'mosswatch-fire'],
  mire: ['thornhollow', 'patrol:mossfall', 'mossfall-cairn', 'mf-smugglers', 'mire-shrine', 'mossfall-cairn'],
  bell: ['thornhollow', 'patrol:hindwood', 'hindwood-cairn', 'hw-glowcaps', 'gloamwing-hollow', 'fawnrest-stone', 'dream'],
  grove: ['patrol:thornway', 'eldergrove-hearth', 'grove-circle', 'eldergrove-hearth'],
  roots: ['last-green-coal', 'hollowed-patrol', 'hr1-tappers', 'last-green-coal'],
};
const LEAD_LAIRS = { mosswatch: 'mw-lantern', mire: 'mire-shrine', bell: 'gloamwing-hollow', grove: 'grove-circle' };

// M4: the Sunscorch. Home to the Keep's Eternal Hearth first, then the Sunward Road. Every SUN_PATH id
// appears in order (checked below); the rest are the zone patrols of the maps walked through and the
// Hearthfires passed on the way. After the Brand of Glass (Waking 3) the party walks back up the Deep
// Shaft and the Dust Trail and rests at the Spire Hearth before the Glass Flats. As M3's route rests at
// the Last Green Coal before the Rotwarden, the party climbs back out of the Vaults to the Last
// Watchfire before the Ashen Warden.
const SUN_START = ['hearthstone-keep', 'patrol:sun-road', 'waystone', 'sr-toll', 'spire-hearth'];
const SUN_ROUTE = [...SUN_START,
  'patrol:dust-trail', 'dt-scorpions', 'dust-cairn', 'pithead',
  'patrol:deep-shaft', 'ds-crew', 'shaft-lamp', 'kharzul-heart',
  'patrol:deep-shaft@back', 'patrol:dust-trail@back', 'spire-hearth',
  'patrol:glass-flats', 'gf-raiders',
  'patrol:scorchgate', 'last-watchfire', 'sg-captain', 'tamsin-scorchgate', 'vault-guard', 'last-watchfire', 'ashen-warden'];
// A route must walk its critical path in order (first visits; hearthfires and patrols may repeat).
function checkRoute(route, pathIds, name) {
  const onPath = route.filter(id => pathIds.includes(id));
  const firsts = onPath.filter((id, i) => onPath.indexOf(id) === i);
  if (firsts.join() !== pathIds.join()) throw new Error(`${name} must walk its path in order: ${firsts.join(', ')}`);
}
checkRoute(SUN_ROUTE, SUN_PATH, 'SUN_ROUTE');
// Each lead's lair taken first, right after Sandspire (the dust-trail ones kindle the Dust Cairn first).
// Milestone 4.5: the Glass Flats open with the Brand of Glass (docs/M45-SPEC.md A3), so an east lead
// is first taken on the way back from Kharzul through Sandspire, at Waking 3 (SUN_WEST, then the lead).
const SUN_WEST = SUN_ROUTE.slice(0, SUN_ROUTE.indexOf('spire-hearth', SUN_ROUTE.indexOf('kharzul-heart')) + 1);
const EAST_LEADS = new Set(['caravan', 'gnash', 'well']);
const SUN_LEAD_ROUTES = {
  caravan: ['patrol:glass-flats', 'gf-caravan'],
  wyrm: ['patrol:dust-trail', 'dust-cairn', 'wyrm-lair'],
  gnash: ['patrol:glass-flats', 'gnash-camp'],
  well: ['patrol:glass-flats', 'well-fire', 'wisp-queen'],
  aqueduct: ['patrol:dust-trail', 'dust-cairn', 'dt-aqueduct'],
};
// The zone a Sunscorch fight's backdrop grinds in (a wipe grinds a level on that zone's patrols).
const SUN_GRIND = {
  'sun-road': 'sun-road', sandspire: 'sun-road', 'dust-trail': 'dust-trail', 'deep-shaft': 'deep-shaft', 'glass-heart': 'deep-shaft',
  'glass-flats': 'glass-flats', miragewell: 'glass-flats', scorchgate: 'scorchgate', 'scorchgate-vaults': 'scorchgate',
};

// M5: the Ironspire (spec §2.2). Home to the Eternal Hearth (the second council), out through the Keep's east
// postern and along the East Road (its three road fights: the Lea's wolves, the Plankford toll, then a rest at
// the Last Camp Fire and the deserters' camp; the East Road's maps have no roaming zone), up the Rockslide Pass
// to Peak's Veil, the Iron Stair, Ironhold and Tamsin on the Deeps stair, the
// Deeps, and Harrow's Forge; then (the Brand of Iron: Waking 5) back up through the Deeps to Stormwatch, the
// Frost Road, Frostmere and down the hole in the ice. The party rests at the Deeps Furnace before Mother Anvil
// (it is on the same map) and walks back across the lake to the Frost Cairn before the Rime-Abbot, as the
// Sunscorch route rests before its Champions.
const IRON_START = ['hearthstone-keep', 'er-wolves', 'er-toll', 'camp-fire', 'er-camp', 'patrol:rockslide-pass', 'pass-shrine', 'rp-brigands', 'rp-rocklings', 'veil-hearth'];
const IRON_WEST = [...IRON_START, 'patrol:iron-stair', 'is-sentinels', 'stair-cairn', 'thanes-hearth', 'tamsin-ironhold',
  'patrol:deeps', 'id-forgeborn', 'deeps-forge'];
const IRON_ROUTE = [...IRON_WEST, 'id-bellows', 'deeps-forge', 'mother-anvil',
  'patrol:deeps@back', 'stormwatch-fire',
  'patrol:frost-road', 'fr-cutters', 'frost-cairn',
  'patrol:frostmere', 'fm-wraiths', 'fb-choir', 'patrol:frostmere@back', 'frost-cairn', 'patrol:frostmere@again', 'rime-abbot'];
checkRoute(IRON_ROUTE, IRON_PATH, 'IRON_ROUTE');
// Each lead's lair as the first thing done once the road reaches it: the Highfold (the Thunder-Roc, past its
// trolls) and Old Horn's cave on the Iron Stair from Peak's Veil; Harrow's Journeyman from the Deeps Furnace;
// the Drowned Abbess from the Frost Cairn, once the Brand of Iron has opened Stormwatch's north gate.
const IRON_EAST = IRON_ROUTE.slice(0, IRON_ROUTE.indexOf('frost-cairn') + 1);
const IRON_LEAD_ROUTES = {
  roc: { from: IRON_START, route: ['patrol:highfold', 'hf-trolls', 'roc-eyrie'] },
  horn: { from: IRON_START, route: ['patrol:iron-stair', 'troll-cave'] },
  smith: { from: IRON_WEST, route: ['id-smith'] },
  shrine: { from: IRON_EAST, route: ['patrol:frostmere', 'fm-shrine'] },
};
const IRON_LAIRS = { roc: 'roc-eyrie', horn: 'troll-cave', smith: 'id-smith', shrine: 'fm-shrine' };
for (const [k, fights] of Object.entries(IRON_LEADS)) {
  const r = IRON_LEAD_ROUTES[k]?.route || [];
  if (!fights.every(id => r.includes(id))) throw new Error(`IRON_LEAD_ROUTES.${k} must fight ${fights.join(', ')}`);
}
// The zone an Ironspire fight grinds in after a wipe (the zone of its map, or the nearest one).
const IRON_GRIND = {
  'er-wolves': 'rockslide-pass', 'er-toll': 'rockslide-pass', 'er-camp': 'rockslide-pass',
  'rp-brigands': 'rockslide-pass', 'rp-rocklings': 'rockslide-pass', 'rp-wolves': 'rockslide-pass', 'hf-trolls': 'highfold', 'roc-eyrie': 'highfold',
  'is-sentinels': 'iron-stair', 'is-trolls': 'iron-stair', 'troll-cave': 'iron-stair', 'tamsin-ironhold': 'iron-stair',
  'id-forgeborn': 'deeps', 'id-bellows': 'deeps', 'id-smith': 'deeps', 'mother-anvil': 'deeps',
  'fr-cutters': 'frost-road', 'fr-wolves': 'frost-road', 'fm-wraiths': 'frostmere', 'fm-shrine': 'frostmere', 'fb-choir': 'frostmere', 'rime-abbot': 'frostmere',
};

// M6: the Gloomfen (spec §2.2). Home to the Eternal Hearth (the third council), through Mossfall (its cairn) and down
// the fen stair onto the Murkway, Willowmurk, Rotbridge (the Toll-Lamp; Hodge's bar is paid, nothing is fought) and
// Tamsin on the bridge, Bogmire, the Lanternfen (the party rests at the Fen Cairn before the Mother's Hollow); then
// (the Brand of Lanterns: Waking 7) back through the Lanternfen to Bogmire, along the long boardwalk to Misthollow, down
// the Blackwater Reach to the Tidal Flats, and a rest at the Flats Beacon before the Leviathan. Willowmurk, Rotbridge and
// Bogmire have no roaming zone.
const GLOOM_START = ['hearthstone-keep', 'mossfall-cairn', 'patrol:murkway', 'mk-leeches', 'reed-shrine', 'mk-reedcutters', 'willow-hearth', 'wm-wights', 'toll-lamp'];
const GLOOM_WEST = [...GLOOM_START, 'tamsin-rotbridge', 'stilt-hearth'];
const GLOOM_ROUTE = [...GLOOM_WEST, 'patrol:lanternfen', 'lf-moths', 'fen-cairn', 'lf-hags', 'fen-cairn', 'lantern-mother',
  'patrol:lanternfen@back', 'stilt-hearth', 'patrol:boardwalk', 'lb-drowned', 'patrol:misthollow', 'bell-hearth', 'mh-salvage', 'mh-ringers',
  'patrol:blackwater', 'wreck-fire', 'br-barge', 'patrol:tidal-flats', 'flats-beacon', 'tf-bargemaster', 'flats-beacon', 'blackwater-leviathan'];
checkRoute(GLOOM_ROUTE, GLOOM_PATH, 'GLOOM_ROUTE');
// Each lead's lair as the first thing done once the road reaches it, after the road fight that guards its way in and a
// rest at the nearest fire (the review's finding: every lair stands past a road gate): Grandfather Willow past
// Willowmurk's ward-gate (the wights), Hodge on arrival at Rotbridge (his toll refused), Mother Grue from the Fen Cairn
// past the moths; the Drowned Cantor (his choir first) past the salvage chain, from the Belltower Fire, and Old Jaws
// past the barge, from the Wreck Fire, once the Brand of Lanterns has opened the long boardwalk.
const GLOOM_MISTHOLLOW = GLOOM_ROUTE.slice(0, GLOOM_ROUTE.indexOf('bell-hearth') + 1);
const GLOOM_REACH = GLOOM_ROUTE.slice(0, GLOOM_ROUTE.indexOf('wreck-fire') + 1);
const GLOOM_LEAD_ROUTES = {
  willow: { from: [...GLOOM_START.slice(0, GLOOM_START.indexOf('wm-wights') + 1), 'willow-hearth'], route: ['wm-willow'] },
  hodge: { from: GLOOM_START, route: ['hodge'] },
  // batch 3: the painting puts Mother Grue's hut before the Lanternfen's first gate, behind only its witch-ward, a
  // few steps from Bogmire: past the zone's patrol, back to the Stilt Hearth to rest, then her
  grue: { from: GLOOM_WEST, route: ['patrol:lanternfen', 'stilt-hearth', 'grue-hollow'] },
  cantor: { from: [...GLOOM_MISTHOLLOW, 'mh-salvage', 'bell-hearth'], route: ['db-choir', 'cantor'] },
  jaws: { from: [...GLOOM_REACH, 'br-barge', 'wreck-fire'], route: ['old-jaws'] },
};
const GLOOM_LAIRS = { willow: 'wm-willow', grue: 'grue-hollow', cantor: 'cantor', jaws: 'old-jaws' };
for (const [k, fights] of Object.entries(GLOOM_LEADS)) {
  const r = GLOOM_LEAD_ROUTES[k]?.route || [];
  if (!fights.every(id => r.includes(id))) throw new Error(`GLOOM_LEAD_ROUTES.${k} must fight ${fights.join(', ')}`);
}
// The zone a Gloomfen fight grinds in after a wipe (the zone of its map, or the nearest one).
const GLOOM_GRIND = {
  'mk-leeches': 'murkway', 'mk-reedcutters': 'murkway', 'mk-bogfolk': 'murkway', 'wm-wights': 'murkway', 'wm-willow': 'murkway',
  hodge: 'murkway', 'tamsin-rotbridge': 'murkway', 'rb-gars': 'murkway',
  'lf-moths': 'lanternfen', 'lf-hags': 'lanternfen', 'lf-lights': 'lanternfen', 'grue-hollow': 'lanternfen', 'lantern-mother': 'lanternfen',
  'lb-drowned': 'boardwalk', 'lb-lights': 'boardwalk', 'mh-salvage': 'misthollow', 'mh-ringers': 'misthollow', 'db-choir': 'misthollow', cantor: 'misthollow',
  'br-barge': 'blackwater', 'br-gars': 'blackwater', 'old-jaws': 'blackwater', 'tf-bargemaster': 'tidal-flats', 'blackwater-leviathan': 'tidal-flats', 'cw-lights': 'causeway',
};
// Fought once and not retried: a player who loses to Hodge pays his price instead (spec A11: the bar opens either way).
const ONE_TRY = new Set(['hodge']);

// M7: the Hearth Below (spec §2.2, A4). Home to the Eternal Hearth (the fourth and fifth councils play; nothing is
// fought) and a rest there, then down the vault stair: the Hollow Council back to back in the order their regions
// were first opened (no rest between the four), the Ash Stair (a rest at the Under-Coal on the first landing, the
// thralls at the narrows below it, then the thralls' pack on the middle landing and one zone patrol on the lower), the
// Chained Deep (the unmade at the narrows, a rest at the Chain Fire past them), the forge-warden at the Worldforge's
// bridge, back through the forge door to rest at the Chain Fire (the Worldforge has no fire of its own, and the
// Unsmith's wipe wakes the party there, `wakeAt`), and the Unsmith. The Hollow Hall, the Chained Deep and the
// Worldforge have no roaming zone.
const COUNCIL = ['hollow-miravel', 'hollow-qasim', 'hollow-brundar', 'hollow-gretch'];
const BELOW_ROUTE = ['hearthstone-keep', ...COUNCIL, 'under-coal', 'as-thralls', 'as-patrol', 'patrol:ash-stair',
  'cd-unmade', 'chain-fire', 'wf-warden', 'chain-fire', 'unsmith'];
checkRoute(BELOW_ROUTE, ACT3_PATH, 'BELOW_ROUTE');
// the forged party has Hilda forge the Warden's Masterpiece once the Council is freed (spec §4.5), on its way down
const BELOW_FORGED_ROUTE = [...BELOW_ROUTE.slice(0, BELOW_ROUTE.indexOf('hollow-gretch') + 1), 'masterpiece',
  ...BELOW_ROUTE.slice(BELOW_ROUTE.indexOf('hollow-gretch') + 1)];
// The zone an Act III fight grinds in after a wipe: the Council's wipe wakes the party at the Eternal Hearth above, and
// the Ash Stair lies past the four, so it grinds where the party last was (the Tidal Flats); everything past the
// Council grinds on the Ash Stair.
const BELOW_GRIND = Object.fromEntries([...COUNCIL.map(id => [id, 'tidal-flats']), ...['as-thralls', 'as-patrol', 'cd-unmade', 'wf-warden', 'unsmith'].map(id => [id, 'ash-stair'])]);
// Fights tuned together (spec §8): the share of runs that wipe somewhere in the group on its first pass.
const GROUPS = { council: COUNCIL };

function fight(battle, stats) {
  let b = battle;
  for (let n = 0; current(b) && n < 3000; n++) {
    const id = current(b);
    const r = b.units[id].side === 'hero' ? act(b, autoCommand(b, id)) : foeTurn(b);
    for (const e of r.events) {
      if (e.t === 'roll' && e.purpose === 'attack' && b.units[e.actor]?.side === 'hero') {
        stats.rolls[e.result] = (stats.rolls[e.result] || 0) + 1;
        stats.rolls.n += 1;
      }
    }
    b = r.state;
  }
  return b;
}

function equipDrops(g, items) {
  let game = g;
  for (const it of items) {
    if (it.shattered) continue;
    const who = bestHeroFor(game, it);
    if (who) game = equip(game, who, it.uid).game;
  }
  return game;
}

const hpLeft = b => {
  const p = outcome(b).party;
  return p.reduce((a, h) => a + h.hp, 0) / p.reduce((a, h) => a + h.maxHp, 0);
};

function nodeStats(stats, id) {
  stats.nodes[id] ||= { tries: 0, first: 0, firstWins: 0, wins: 0, wipes: 0, rounds: [], hpLeft: [], level: [], stuck: 0, claims: 0, shatters: 0, yields: 0 };
  return stats.nodes[id];
}

function recordDrops(stats, items) {
  for (const it of items) {
    if (RELICS[it.base] && !it.shattered) { stats.relics++; continue; }
    const k = it.shattered ? 'shattered' : it.rarity;
    stats.drops[k] = (stats.drops[k] || 0) + 1;
  }
}

// The zone a wipe grinds in: M4's by the Sunscorch fight's backdrop, M5's, M6's and M7's by the fight (ctx.zone).
function grindZone(ctx) {
  if (ctx.iron) return ZONES[ctx.zone || 'rockslide-pass'];
  if (ctx.gloom) return ZONES[ctx.zone || 'murkway'];
  if (ctx.below) return ZONES[ctx.zone || 'ash-stair'];
  if (ctx.sun) return ZONES[SUN_GRIND[ctx.backdrop] || 'sun-road'];
  return null;
}

// Grinding as in M2: rabble patrols at the level of the strongest rabble already beaten, from the
// patrol set of the last fight's backdrop, rest between patrols.
// M4: in the Sunscorch (ctx.sun) a wipe grinds on the zone patrols of the fight's map, as the world
// seeds them: the zone's level plus 0-1, escalated by the Waking. M5: the Ironspire's likewise (ctx.iron).
function grind(g, levels, stats, ctx) {
  const target = partyLevel(g) + levels;
  const rng = ctx.rng;
  for (let i = 0; i < 60 && partyLevel(g) < target; i++) {
    const zone = grindZone(ctx);
    const set = rng.pick(zone ? PATROLS[zone.sets] : PATROLS[ctx.backdrop] || PATROLS['verdant-wood']);
    const lvl = zone ? zone.level + rng.int(0, 1) : Math.max(1, ctx.rabble);
    const spawns = set.map((sp, k) => ({ ...escalateSpawn({ ...sp, level: lvl }, g.progress.waking, `patrol#${k}`), spawnIndex: k }));
    const started = startBattle(g, { patrol: { spawns, where: 'The Wilds', backdrop: ctx.backdrop } }, { ambush: rng.chance(0.25) });
    const b = fight(started.battle, stats);
    const res = resolveBattle(started.game, b);
    g = res.game;
    stats.grindFights++;
    if (res.report.result === 'victory') { recordDrops(stats, res.report.drops); g = equipDrops(g, res.report.drops); }
    g = rest(g, g.progress.lastHearthfire);
  }
  return g;
}

// Play a route from `g`. Returns { g, done } (done: the route's last fight was won or yielded).
// One roaming zone patrol, as the world seeds them (rules/world.js seedRoamers): a weak one runs.
function patrolFight(g, key, stats, ctx) {
  const zoneId = key.split('@')[0];
  const zone = ZONES[zoneId];
  const set = ctx.rng.pick(PATROLS[zone.sets]);
  const level = zone.level + ctx.rng.int(0, 1);
  const spawns = set.map((sp, i) => ({ ...escalateSpawn({ ...sp, level }, g.progress.waking, `sim:${zoneId}:${i}`), spawnIndex: i }));
  const ns = nodeStats(stats, `patrol:${key}`);
  ns.first++;
  ns.level.push(partyLevel(g));
  if (isWeak(g, spawns)) { ns.ran = (ns.ran || 0) + 1; ns.firstWins++; ns.wins++; return g; }
  const started = startBattle(g, { patrol: { spawns, where: zoneId, backdrop: zone.backdrop } });
  const b = fight(started.battle, stats);
  const res = resolveBattle(started.game, b);
  if (ctx.sun) ctx.backdrop = zone.backdrop; // a Sunscorch wipe grinds on this zone's patrols
  if (ctx.iron || ctx.gloom || ctx.below) ctx.zone = zoneId; // an Ironspire, Gloomfen or Hearth Below one too
  ns.tries++;
  ns.rounds.push(res.report.rounds);
  if (res.report.result === 'victory') { ns.wins++; ns.firstWins++; ns.hpLeft.push(hpLeft(b)); recordDrops(stats, res.report.drops); return equipDrops(res.game, res.report.drops); }
  if (res.report.result === 'defeat') { ns.wipes++; return grind(rest(res.game, res.game.progress.lastHearthfire), 1, stats, ctx); }
  return res.game;
}

// M7 (spec §4.5): Hilda forges the Warden's Masterpiece (the forged party, once the Council is freed). The party is
// given the page and the price (a forged party has paid for everything), and she forges the finest base of the kind
// the Warden carries, which the Warden takes up, tempered as the rest of the party's weapons are.
function forgeTheMasterpiece(game, stats, temper) {
  const g0 = structuredClone(game);
  const c = masterpieceCost();
  g0.progress.flags.story = { ...(g0.progress.flags.story || {}), 'worldforge-page': true };
  g0.gold += c.gold;
  for (const [k, n] of Object.entries(c.materials)) g0.materials[k] = (g0.materials[k] || 0) + n;
  for (const [k, n] of Object.entries(c.gems)) g0.gems[k] = (g0.gems[k] || 0) + n;
  const held = g0.inventory.find(i => i.uid === g0.party.roster.warden.gear.weapon);
  const base = MASTERPIECE_BASES.find(b => ITEMS[b].kind === held?.kind) || MASTERPIECE_BASES[0];
  const r = forgeMasterpiece(g0, { base, name: 'The Sim\'s Own' });
  if (!r.ok) { stats.masterpieceFailed = (stats.masterpieceFailed || 0) + 1; return game; }
  r.game.inventory.find(i => i.uid === r.item.uid).temper = temper;
  const e = equip(r.game, 'warden', r.item.uid);
  stats.masterpieces = (stats.masterpieces || 0) + 1;
  return e.ok ? e.game : r.game;
}

// M5: after a wipe in the Ironspire (M6: and the Gloomfen) the party re-arms against the foe that beat it, as a player does who has
// read its card (Mother Anvil: crush-resistant plate, weak to frost): each hero takes the bag weapon that
// hits that foe hardest (hit chance x average damage x the damage multiplier), if it beats the one in hand
// by a fifth. `armed` keeps what each hero held before the first re-arm, so the weapons go back when the
// fight is done (unarm). The first try never re-arms, so first-try numbers are the scripted policy's.
function rearm(g, b, armed = {}) {
  const foe = Object.values(b.units).filter(u => u.side === 'foe').sort((x, y) => y.maxHp - x.maxHp)[0];
  if (!foe) return { g, armed };
  const bonus = pageBonus(g);
  const score = (hero, inv) => {
    const w = deriveHero(hero, inv, bonus).weapon;
    const p = Math.min(0.95, Math.max(0.05, (21 - (foe.guard - w.hit)) / 20));
    return p * w.avg * damageMult(foe, w.dmg, w.aspect);
  };
  const worn = new Set(Object.values(g.party.roster).flatMap(h => Object.values(h.gear)).filter(Boolean));
  const next = { ...armed };
  for (const id of g.party.active) {
    const hero = g.party.roster[id];
    let best = null, bestScore = score(hero, g.inventory) * 1.2;
    for (const it of g.inventory) {
      if (worn.has(it.uid) || it.shattered || !itemProfile(it)?.weapon) continue;
      const r = equip(g, id, it.uid);
      if (!r.ok) continue;
      const s = score(r.game.party.roster[id], r.game.inventory);
      if (s > bestScore) { best = it.uid; bestScore = s; }
    }
    if (!best) continue;
    if (!next[id]) next[id] = { weapon: hero.gear.weapon, offhand: hero.gear.offhand };
    next[id] = { ...next[id], rearmed: best };
    if (TRACE) console.log(`    re-arm: ${id} takes ${g.inventory.find(i => i.uid === best).name} against ${foe.name}`);
    g = equip(g, id, best).game;
    worn.add(best);
  }
  return { g, armed: next };
}

// The weapons back in hand after a re-armed fight (unless a drop has replaced the borrowed one since).
function unarm(g, armed) {
  for (const [id, a] of Object.entries(armed || {})) {
    if (g.party.roster[id]?.gear.weapon !== a.rearmed) continue;
    const back = uid => uid && g.inventory.some(i => i.uid === uid && !i.shattered);
    if (back(a.weapon)) g = equip(g, id, a.weapon).game;
    if (back(a.offhand)) g = equip(g, id, a.offhand).game;
  }
  return g;
}

function playRoute(g, route, stats, ctx) {
  for (const id of route) {
    if (id === 'dream') { g = { ...g, progress: { ...g.progress, flags: { ...g.progress.flags, story: { ...g.progress.flags.story, 'bell-rung': true, forewarned: true } } } }; continue; }
    if (id === 'masterpiece') { g = forgeTheMasterpiece(g, stats, ctx.temper || 0); continue; } // M7: the forged party
    if (id.startsWith('patrol:')) { g = patrolFight(g, id.slice(7), stats, ctx); continue; } // 'patrol:<zone>[@tag]'
    const node = ENCOUNTERS[id];
    if (node.type === 'hearthfire') { g = rest(g, id); continue; }
    const f = g.progress.flags;
    if (f.done[id] || (f.cleared[id] && !node.brand)) continue;
    const ns = nodeStats(stats, id);
    if (ctx.iron) ctx.zone = IRON_GRIND[id] || ctx.zone;
    if (ctx.gloom) ctx.zone = GLOOM_GRIND[id] || ctx.zone;
    if (ctx.below) ctx.zone = BELOW_GRIND[id] || ctx.zone;
    let armed = null;
    for (let tries = 1; ; tries++) {
      if (tries > MAX_TRIES) { ns.stuck++; return { g: unarm(g, armed), done: false, at: `${id} (seed ${ctx.seed}, party L${partyLevel(g)})` }; }
      const level = partyLevel(g);
      const spawns = spawnsFor(g, id);
      const started = startBattle(g, { nodeId: id });
      const b = fight(started.battle, stats);
      const res = resolveBattle(started.game, b);
      g = res.game;
      const rep = res.report;
      ns.tries++;
      if (TRACE) {
        const boss = Object.values(b.units).filter(u => u.side === 'foe').sort((x, y) => y.maxHp - x.maxHp)[0];
        console.log(`  ${id} try ${tries}: ${rep.result}${rep.yield ? ' (yield)' : ''} at party L${level}, ${rep.rounds} rounds${boss ? `, ${boss.name} at ${Math.max(0, boss.hp)}/${boss.maxHp}` : ''}`);
      }
      if (tries === 1) {
        ns.first++; ns.level.push(level); ns.rounds.push(rep.rounds);
        // M7: what a stealing foe took (its Stolen Arts), and whether a guest fighting beside the party fell
        const thief = Object.values(b.units).find(u => u.side === 'foe' && familyOf(u).phases?.some(p => p.steals));
        if (thief) { ns.stealable = [...(ns.stealable || []), (thief.stealable || []).length]; ns.stole = [...(ns.stole || []), thief.stolen ? thief.stolen.ids.length : -1]; }
        const guests = Object.values(b.units).filter(u => u.guest);
        if (guests.length) { ns.guestFights = (ns.guestFights || 0) + 1; ns.guestDown = (ns.guestDown || 0) + (guests.some(u => u.ko) ? 1 : 0); }
      }
      ctx.backdrop = node.backdrop;
      if (rep.result === 'victory') {
        ns.wins++;
        if (tries === 1) { ns.firstWins++; ns.hpLeft.push(hpLeft(b)); }
        for (const s of spawns) if (familyOf(s).tier === 'rabble') ctx.rabble = Math.max(ctx.rabble, s.level);
        recordDrops(stats, rep.drops);
        ns.claims += rep.claimed.filter(i => RELICS[i.base]).length;
        ns.shatters += rep.drops.filter(i => i.shattered).length;
        g = equipDrops(unarm(g, armed), [...rep.claimed, ...rep.drops]);
        break;
      }
      if (rep.yield) { ns.yields++; g = unarm(g, armed); break; }
      if (rep.result === 'defeat') {
        ns.wipes++;
        for (const [k, ids] of Object.entries(GROUPS)) if (ids.includes(id)) (ctx.groupWipes ||= new Set()).add(k); // M7: the Council
        if (ONE_TRY.has(id)) { g = unarm(g, armed); break; } // Hodge: the party pays the toll instead
        g = grind(rest(g, g.progress.lastHearthfire), 1, stats, ctx);
        if (ctx.iron || ctx.gloom || ctx.below) ({ g, armed } = rearm(g, b, armed || {}));
      }
    }
  }
  return { g, done: true };
}

function newStats() {
  return { nodes: {}, rolls: { n: 0 }, drops: {}, relics: 0, grindFights: 0, runs: 0, cleared: 0, endLevel: [], entryLevel: [], stuck: 0 };
}

const avg = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const pct = (a, b) => (b ? `${Math.round(100 * a / b)}%` : '-');
const f1 = x => (Number.isFinite(x) ? x.toFixed(1) : '-');

const LOOPER = JSON.parse(readFileSync(path.join(root, 'test/fixtures/v1/v1-waking2-dupe.json'), 'utf8'));

// The forged party: every hero's weapon tempered (sunscorch-forged: +4, ironspire-forged: +6, gloomfen-forged: +8), and
// one gem each (a Dusthaven Sunstone; a Frost Opal in the Ironspire; a Bog Amber in the Gloomfen) in the weapon if it has
// a socket, else in the first socketed piece they wear.
function forgeParty(game, stats, { temper = 4, gem = 'sunstone' } = {}) {
  const g = structuredClone(game);
  for (const id of g.party.active) {
    const gear = g.party.roster[id].gear;
    const weapon = gear.weapon && g.inventory.find(i => i.uid === gear.weapon);
    if (weapon) weapon.temper = Math.max(weapon.temper || 0, temper);
    const socketed = [weapon, ...Object.values(gear).map(uid => uid && g.inventory.find(i => i.uid === uid))]
      .find(it => it && !it.shattered && socketsOf(it) > 0 && !(it.gems || []).some(Boolean));
    if (socketed) { socketed.gems = [gem, ...(socketed.gems || []).slice(1)]; stats.gemmed = (stats.gemmed || 0) + 1; stats.gemInWeapon = (stats.gemInWeapon || 0) + (socketed === weapon ? 1 : 0); }
    stats.forgedHeroes = (stats.forgedHeroes || 0) + 1;
    stats.forgedTemper = temper;
  }
  return g;
}

// --sun-cache: each seed's Sunscorch end state ({ g, rabble, backdrop }), kept between runs for the Ironspire modes.
const sunCache = SUN_CACHE && existsSync(SUN_CACHE) ? JSON.parse(readFileSync(SUN_CACHE, 'utf8')) : {};
let sunCacheDirty = false;
const sunCacheNew = {}; // a worker hands its new entries back to the parent, which writes the file
// --iron-cache: each seed's Ironspire end state, kept between runs for the Gloomfen modes (M6), the same way.
const ironCache = IRON_CACHE && existsSync(IRON_CACHE) ? JSON.parse(readFileSync(IRON_CACHE, 'utf8')) : {};
let ironCacheDirty = false;
const ironCacheNew = {};
// --gloom-cache: each seed's Gloomfen end state, kept between runs for the Hearth Below's modes (M7), the same way.
const gloomCache = GLOOM_CACHE && existsSync(GLOOM_CACHE) ? JSON.parse(readFileSync(GLOOM_CACHE, 'utf8')) : {};
let gloomCacheDirty = false;
const gloomCacheNew = {};

function simSeed(seed, all) {
  const run = (k, g, route, ctx) => {
    const st = all[k];
    const r = playRoute(g, route, st, ctx);
    st.runs++;
    if (r.done) st.cleared++; else { st.stuck++; st.stuckSeeds = [...(st.stuckSeeds || []), r.at ? `${r.at}` : '?']; }
    st.endLevel.push(partyLevel(r.g));
    // M7: fights tuned together: did this run wipe anywhere in the group?
    for (const [name, ids] of Object.entries(GROUPS)) {
      if (!ids.some(id => route.includes(id))) continue;
      const grp = ((st.groups ||= {})[name] ||= { runs: 0, wiped: 0 });
      grp.runs++;
      if (ctx.groupWipes?.has(name)) grp.wiped++;
    }
    return r;
  };
  const starter = STARTER === 'mix' ? STARTERS[seed % 3] : STARTER;
  const ctx0 = () => ({ rng: createRng(`sim:${seed}`), rabble: 1, backdrop: 'hearth-road', seed });
  const wantBelow = ONLY.some(m => BELOW_MODES.includes(m));
  const wantGloom = ONLY.some(m => GLOOM_MODES.includes(m)) || wantBelow;
  const wantIron = ONLY.some(m => IRON_MODES.includes(m)) || wantGloom;
  // M7: a seed whose Gloomfen end state is cached skips everything before the Hearth Below (when only its modes run)
  const cachedGloom = wantBelow && gloomCache[seed] && !ONLY.some(m => [...M3_MODES, ...SUN_MODES, ...IRON_MODES, ...GLOOM_MODES].includes(m)) ? gloomCache[seed] : null;
  let belowBase = cachedGloom ? { g: cachedGloom.g, ctx: { rng: null, rabble: cachedGloom.rabble, backdrop: cachedGloom.backdrop, seed, gloom: true } } : null;
  // M6: a seed whose Ironspire end state is cached skips everything before the Gloomfen (when only Gloomfen modes run)
  const cachedIron = wantGloom && !cachedGloom && ironCache[seed] && !ONLY.some(m => [...M3_MODES, ...SUN_MODES, ...IRON_MODES].includes(m)) ? ironCache[seed] : null;
  let gloomBase = cachedIron ? { g: cachedIron.g, ctx: { rng: null, rabble: cachedIron.rabble, backdrop: cachedIron.backdrop, seed, iron: true } } : null;
  const cachedSun = wantIron && !cachedIron && !cachedGloom && sunCache[seed] && !ONLY.some(m => [...M3_MODES, ...SUN_MODES].includes(m)) ? sunCache[seed] : null;
  let ironBase = cachedSun ? { g: cachedSun.g, ctx: { rng: null, rabble: cachedSun.rabble, backdrop: cachedSun.backdrop, seed, sun: true } } : null;
  const need = ONLY.filter(m => m !== 'looper-w2');
  let base = null;
  if (need.length && !cachedSun && !cachedIron && !cachedGloom) {
    const ctx = ctx0();
    const r = run('m2', newGame({ name: 'Sim', starter, seed }), GAUNTLET, ctx);
    if (r.done) base = { g: r.g, ctx };
  }
  if (base) {
    const fork = () => ({ g: base.g, ctx: { ...base.ctx, rng: createRng(`sim:${seed}:fork`) } });
    let sunBase = null; // M4: the end state of the direct run, the party that just beat the Rotwarden
    if (ONLY.includes('direct') || ONLY.some(m => SUN_MODES.includes(m)) || wantIron) {
      const f = fork();
      const r = run('direct', f.g, AFTER_BRAND, f.ctx);
      if (r.done) sunBase = { g: r.g, ctx: f.ctx };
    }
    if (sunBase) {
      const sunFork = salt => ({ g: sunBase.g, ctx: { ...sunBase.ctx, sun: true, rng: createRng(`sim:${seed}:sun:${salt}`) } });
      const entry = st => st.entryLevel.push(partyLevel(sunBase.g));
      if (ONLY.includes('sunscorch') || wantIron) {
        const f = sunFork('path');
        entry(all.sunscorch);
        const r = run('sunscorch', f.g, SUN_ROUTE, f.ctx);
        if (r.done) { // M5: the Ironspire starts from here
          ironBase = { g: r.g, ctx: f.ctx };
          if (SUN_CACHE) { sunCache[seed] = sunCacheNew[seed] = { g: r.g, rabble: f.ctx.rabble, backdrop: f.ctx.backdrop }; sunCacheDirty = true; }
        }
      }
      if (ONLY.includes('sunscorch-forged')) { const f = sunFork('path'); entry(all['sunscorch-forged']); run('sunscorch-forged', forgeParty(f.g, all['sunscorch-forged']), SUN_ROUTE, f.ctx); }
      if (ONLY.includes('sun-first-lead')) {
        for (const lead of Object.keys(SUN_LEAD_ROUTES).filter(l => !SUN_ONLY_LEADS || SUN_ONLY_LEADS.split(',').includes(l))) { const f = sunFork(lead); entry(all['sun-first-lead']); run('sun-first-lead', f.g, [...(EAST_LEADS.has(lead) ? SUN_WEST : SUN_START), ...SUN_LEAD_ROUTES[lead]], f.ctx); }
      }
    }
    if (ONLY.includes('leads2')) { const f = fork(); run('leads2', f.g, [...LEAD_ROUTES.mosswatch, ...LEAD_ROUTES.bell, 'thornhollow', ...AFTER_BRAND], f.ctx); }
    if (ONLY.includes('leads-all')) {
      const f = fork();
      const leads = [...LEAD_ROUTES.mosswatch, ...LEAD_ROUTES.mire, ...LEAD_ROUTES.bell, ...LEAD_ROUTES.grove];
      run('leads-all', f.g, [...leads, 'eldergrove-hearth', 'tamsin-duel', ...LEAD_ROUTES.roots, 'hr1-grubs', 'hr1-sapwight', 'last-green-coal', 'rotwarden-heart'], f.ctx);
    }
    if (ONLY.includes('first-lead')) {
      for (const lead of Object.keys(LEAD_LAIRS)) { const f = fork(); run('first-lead', f.g, LEAD_ROUTES[lead], f.ctx); }
    }
  }
  // M5: the Ironspire, from the end of the sunscorch run (Waking 4)
  if (ironBase) {
    const ironFork = salt => ({ g: ironBase.g, ctx: { ...ironBase.ctx, sun: false, iron: true, zone: 'rockslide-pass', rng: createRng(`sim:${seed}:iron:${salt}`) } });
    const entry = st => st.entryLevel.push(partyLevel(ironBase.g));
    if (ONLY.includes('ironspire') || wantGloom) {
      const f = ironFork('path');
      entry(all.ironspire);
      const r = run('ironspire', f.g, IRON_ROUTE, f.ctx);
      if (r.done) { // M6: the Gloomfen starts from here
        gloomBase = { g: r.g, ctx: f.ctx };
        if (IRON_CACHE) { ironCache[seed] = ironCacheNew[seed] = { g: r.g, rabble: f.ctx.rabble, backdrop: f.ctx.backdrop }; ironCacheDirty = true; }
      }
    }
    if (ONLY.includes('ironspire-forged')) { const f = ironFork('path'); entry(all['ironspire-forged']); run('ironspire-forged', forgeParty(f.g, all['ironspire-forged'], { temper: 6, gem: 'frost-opal' }), IRON_ROUTE, f.ctx); }
    if (ONLY.includes('iron-first-lead')) {
      for (const lead of Object.keys(IRON_LEAD_ROUTES).filter(l => !IRON_ONLY_LEADS || IRON_ONLY_LEADS.split(',').includes(l))) {
        const f = ironFork(lead);
        entry(all['iron-first-lead']);
        run('iron-first-lead', f.g, [...IRON_LEAD_ROUTES[lead].from, ...IRON_LEAD_ROUTES[lead].route], f.ctx);
      }
    }
  }
  // M6: the Gloomfen, from the end of the ironspire run (Waking 6)
  if (gloomBase) {
    const gloomFork = salt => ({ g: gloomBase.g, ctx: { ...gloomBase.ctx, sun: false, iron: false, gloom: true, zone: 'murkway', rng: createRng(`sim:${seed}:gloom:${salt}`) } });
    const entry = st => st.entryLevel.push(partyLevel(gloomBase.g));
    if (ONLY.includes('gloomfen') || wantBelow) {
      const f = gloomFork('path');
      entry(all.gloomfen);
      const r = run('gloomfen', f.g, GLOOM_ROUTE, f.ctx);
      if (r.done) { // M7: the Hearth Below starts from here
        belowBase = { g: r.g, ctx: f.ctx };
        if (GLOOM_CACHE) { gloomCache[seed] = gloomCacheNew[seed] = { g: r.g, rabble: f.ctx.rabble, backdrop: f.ctx.backdrop }; gloomCacheDirty = true; }
      }
    }
    if (ONLY.includes('gloomfen-forged')) {
      const f = gloomFork('path');
      entry(all['gloomfen-forged']);
      // at the end of the region the forged party travels back to the Toll-Lamp and refuses Hodge's toll
      run('gloomfen-forged', forgeParty(f.g, all['gloomfen-forged'], { temper: 8, gem: 'bog-amber' }), [...GLOOM_ROUTE, 'toll-lamp', 'hodge'], f.ctx);
    }
    if (ONLY.includes('gloom-first-lead')) {
      for (const lead of Object.keys(GLOOM_LEAD_ROUTES).filter(l => !GLOOM_ONLY_LEADS || GLOOM_ONLY_LEADS.split(',').includes(l))) {
        const f = gloomFork(lead);
        entry(all['gloom-first-lead']);
        run('gloom-first-lead', f.g, [...GLOOM_LEAD_ROUTES[lead].from, ...GLOOM_LEAD_ROUTES[lead].route], f.ctx);
      }
    }
  }
  // M7: the Hearth Below, from the end of the gloomfen run (Waking 8)
  if (belowBase) {
    const belowFork = salt => ({ g: belowBase.g, ctx: { ...belowBase.ctx, sun: false, iron: false, gloom: false, below: true, zone: 'tidal-flats', groupWipes: new Set(), rng: createRng(`sim:${seed}:below:${salt}`) } });
    const entry = st => st.entryLevel.push(partyLevel(belowBase.g));
    if (ONLY.includes('below')) { const f = belowFork('path'); entry(all.below); run('below', f.g, BELOW_ROUTE, f.ctx); }
    if (ONLY.includes('below-forged')) {
      const f = belowFork('path');
      entry(all['below-forged']);
      run('below-forged', forgeParty(f.g, all['below-forged'], { temper: 10, gem: 'bog-amber' }), BELOW_FORGED_ROUTE, { ...f.ctx, temper: 10 });
    }
  }
  if (ONLY.includes('looper-w2')) {
    const g = migrate(LOOPER);
    run('looper-w2', { ...g, seed: g.seed + seed, rngState: (g.rngState + seed * 7919) | 0 }, AFTER_BRAND, { rng: createRng(`sim:${seed}:looper`), rabble: 12, backdrop: 'verdant-wood' });
  }
}

function simulate() {
  const all = Object.fromEntries(ALL_MODES.map(k => [k, newStats()]));
  for (let seed = FROM; seed <= TO; seed++) simSeed(seed, all);
  if (sunCacheDirty && !JSON_OUT) writeFileSync(SUN_CACHE, JSON.stringify(sunCache));
  if (ironCacheDirty && !JSON_OUT) writeFileSync(IRON_CACHE, JSON.stringify(ironCache));
  if (gloomCacheDirty && !JSON_OUT) writeFileSync(GLOOM_CACHE, JSON.stringify(gloomCache));
  return all;
}

// --jobs N: the seeds split over N workers (each prints its stats as JSON), merged here in seed order.
function mergeStats(into, from) {
  for (const [id, n] of Object.entries(from.nodes)) {
    const m = nodeStats(into, id);
    for (const [k, v] of Object.entries(n)) m[k] = Array.isArray(v) ? [...(m[k] || []), ...v] : (m[k] || 0) + v;
  }
  for (const [k, v] of Object.entries(from.rolls)) into.rolls[k] = (into.rolls[k] || 0) + v;
  for (const [k, v] of Object.entries(from.drops)) into.drops[k] = (into.drops[k] || 0) + v;
  for (const k of ['relics', 'grindFights', 'runs', 'cleared', 'stuck', 'gemmed', 'gemInWeapon', 'forgedHeroes', 'masterpieces', 'masterpieceFailed']) if (from[k]) into[k] = (into[k] || 0) + from[k];
  for (const k of ['endLevel', 'entryLevel', 'stuckSeeds']) if (from[k]) into[k] = [...(into[k] || []), ...from[k]];
  if (from.forgedTemper) into.forgedTemper = from.forgedTemper;
  for (const [k, v] of Object.entries(from.groups || {})) {
    const grp = ((into.groups ||= {})[k] ||= { runs: 0, wiped: 0 });
    grp.runs += v.runs;
    grp.wiped += v.wiped;
  }
}

async function simulateJobs() {
  const lo = FROM, hi = TO, n = Math.min(JOBS, hi - lo + 1);
  const pass = args.filter((a, i) => !['--jobs', '--from', '--to', '--seed', '--md'].includes(a) && !['--jobs', '--from', '--to', '--seed'].includes(args[i - 1]));
  const chunks = Array.from({ length: n }, (_, k) => [lo + Math.floor((hi - lo + 1) * k / n), lo + Math.floor((hi - lo + 1) * (k + 1) / n) - 1]);
  const outs = await Promise.all(chunks.map(([a, b]) => new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), ...pass, '--from', String(a), '--to', String(b), '--json'], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.on('close', code => (code === 0 ? resolve(JSON.parse(out)) : reject(new Error(`sim worker ${a}-${b} exited ${code}`))));
  })));
  const all = Object.fromEntries(ALL_MODES.map(k => [k, newStats()]));
  for (const o of outs) for (const k of ALL_MODES) mergeStats(all[k], o.stats[k]);
  const fresh = Object.assign({}, ...outs.map(o => o.cache || {}));
  if (SUN_CACHE && Object.keys(fresh).length) writeFileSync(SUN_CACHE, JSON.stringify({ ...sunCache, ...fresh }));
  const freshIron = Object.assign({}, ...outs.map(o => o.ironCache || {}));
  if (IRON_CACHE && Object.keys(freshIron).length) writeFileSync(IRON_CACHE, JSON.stringify({ ...ironCache, ...freshIron }));
  const freshGloom = Object.assign({}, ...outs.map(o => o.gloomCache || {}));
  if (GLOOM_CACHE && Object.keys(freshGloom).length) writeFileSync(GLOOM_CACHE, JSON.stringify({ ...gloomCache, ...freshGloom }));
  return all;
}

function table(rows, head) {
  if (MD) return [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');
  const w = head.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
  const line = r => r.map((c, i) => String(c).padEnd(w[i])).join('  ');
  return [line(head), w.map(n => '-'.repeat(n)).join('  '), ...rows.map(line)].join('\n');
}

const LABELS = {
  m2: 'm2: Waking 0, the M2 road, equips drops (a wipe grinds a level)',
  direct: 'direct: the critical path after the Brand (Waking 1)',
  leads2: 'leads2: Mosswatch and Bell leads (Forewarned), then the critical path',
  'leads-all': 'leads-all: every lead, then the critical path',
  'looper-w2': 'looper-w2: the migrated Waking-2 M2 save down the critical path',
  'first-lead': 'first-lead: each lead taken first at Waking 1',
  sunscorch: 'sunscorch: from the direct run\'s end (Waking 2), home to the Keep, then SUN_PATH',
  'sunscorch-forged': 'sunscorch-forged: the same party with weapons tempered to +4 and one gem each',
  'sun-first-lead': 'sun-first-lead: each Sunscorch lead\'s lair taken first: the Dust Trail\'s right after Sandspire (Waking 2), the Glass Flats\' once Kharzul opens them (Waking 3)',
  ironspire: 'ironspire: from the sunscorch run\'s end (Waking 4), home to the Keep, then IRON_PATH',
  'ironspire-forged': 'ironspire-forged: the same party with weapons tempered to +6 and one gem each',
  'iron-first-lead': 'iron-first-lead: each Ironspire lead\'s lair taken first: the Roc\'s and Old Horn\'s from Peak\'s Veil and the Journeyman\'s from the Deeps (Waking 4), the Drowned Abbess\'s once the Brand of Iron opens the Frost Road (Waking 5)',
  gloomfen: 'gloomfen: from the ironspire run\'s end (Waking 6), home to the Keep, then GLOOM_PATH',
  'gloomfen-forged': 'gloomfen-forged: the same party with weapons tempered to +8 and one gem each; Hodge at the end of the region',
  'gloom-first-lead': 'gloom-first-lead: each Gloomfen lead\'s lair taken first: Grandfather Willow\'s, Hodge\'s (on arrival) and Mother Grue\'s (Waking 6), the Drowned Cantor\'s and Old Jaws\'s once the Brand of Lanterns opens the boardwalk (Waking 7)',
  below: 'below: from the gloomfen run\'s end (Waking 8), home to the Keep, then ACT3_PATH: the Hollow Council back to back, the road down, and the Unsmith with Tamsin beside the party',
  'below-forged': 'below-forged: the same party with weapons tempered to +10, one gem each, and the Warden\'s Masterpiece once the Council is freed',
};

// Gate 4 (M4 spec §8) and Gate 5 (M5 spec §8): the targets the Sunscorch and Ironspire modes are tuned to.
const SUN_TARGETS = [
  ['sunscorch', 'kharzul-heart', 'wipe', 30, 40], ['sunscorch', 'ashen-warden', 'wipe', 30, 40], ['sunscorch', 'tamsin-scorchgate', 'win', 55, 70],
  ['sunscorch-forged', 'kharzul-heart', 'wipe', 0, 20], ['sunscorch-forged', 'ashen-warden', 'wipe', 0, 20],
  ...['gf-caravan', 'wyrm-lair', 'gnash-camp', 'wisp-queen', 'dt-aqueduct'].map(id => ['sun-first-lead', id, 'wipe', 15, 25]),
];
const IRON_TARGETS = [
  ['ironspire', 'mother-anvil', 'wipe', 30, 40], ['ironspire', 'rime-abbot', 'wipe', 30, 40], ['ironspire', 'tamsin-ironhold', 'win', 55, 70],
  ['ironspire-forged', 'mother-anvil', 'wipe', 0, 20], ['ironspire-forged', 'rime-abbot', 'wipe', 0, 20],
  ...Object.values(IRON_LAIRS).map(id => ['iron-first-lead', id, 'wipe', 15, 25]),
];
// M6 (spec §8): Hodge on arrival is a terrible idea (60-80% first-try wipes), and never 100%: a forged party at the end
// of the region beats him more often than not.
const GLOOM_TARGETS = [
  ['gloomfen', 'lantern-mother', 'wipe', 30, 40], ['gloomfen', 'blackwater-leviathan', 'wipe', 30, 40], ['gloomfen', 'tamsin-rotbridge', 'win', 55, 70],
  ['gloomfen-forged', 'lantern-mother', 'wipe', 0, 20], ['gloomfen-forged', 'blackwater-leviathan', 'wipe', 0, 20], ['gloomfen-forged', 'hodge', 'win', 50, 100],
  ...Object.values(GLOOM_LAIRS).map(id => ['gloom-first-lead', id, 'wipe', 15, 25]), ['gloom-first-lead', 'hodge', 'wipe', 60, 80],
];
// M7 (spec §8): the Hollow Council is tuned together (35-45% of runs wipe somewhere in the four, BELOW_GROUP_TARGETS)
// and no one of them above 25%; the Unsmith with Tamsin 30-40% first try, a forged party with the Masterpiece <= 20%;
// every road fight <= 10%.
const BELOW_TARGETS = [
  ...COUNCIL.map(id => ['below', id, 'wipe', 0, 25]), ['below', 'unsmith', 'wipe', 30, 40],
  ...['as-thralls', 'as-patrol', 'patrol:ash-stair', 'cd-unmade', 'wf-warden'].map(id => ['below', id, 'wipe', 0, 10]),
  ['below-forged', 'unsmith', 'wipe', 0, 20],
];
const BELOW_GROUP_TARGETS = [['below', 'council', 'the Hollow Council, all four', 35, 45]];
const GROUP_NAMES = { council: 'the Hollow Council' };

function targetChecks(all, targets, modes) {
  const checks = targets.filter(([k]) => ONLY.includes(k)).map(([k, id, what, lo, hi]) => {
    const n = all[k].nodes[id];
    if (!n || !n.first) return [k, id, `${what} ${lo}-${hi}%`, '-', 'no data'];
    const v = 100 * (what === 'win' ? n.firstWins : n.first - n.firstWins - n.yields) / n.first;
    // a half point shows as one (25.5%, not 26%): the check rounds a target to whole points, the table shows why
    return [k, id, `${what} 1st ${lo}-${hi}%`, `${Number.isInteger(v) ? v : v.toFixed(1)}%`, v >= lo - 0.5 && v <= hi + 0.5 ? 'ok' : 'MISS'];
  });
  for (const k of modes.filter(m => ONLY.includes(m))) checks.push([k, '(every run)', 'stuck 0', String(all[k].stuck), all[k].stuck ? 'MISS' : 'ok']);
  return checks;
}

// M7: a group's check: the share of runs that wiped somewhere in it (its first pass fails at the first wipe).
function groupChecks(all, targets) {
  return targets.filter(([k]) => ONLY.includes(k)).map(([k, name, label, lo, hi]) => {
    const grp = all[k].groups?.[name];
    if (!grp?.runs) return [k, label, `wipe somewhere ${lo}-${hi}%`, '-', 'no data'];
    const v = 100 * grp.wiped / grp.runs;
    return [k, label, `wipe somewhere ${lo}-${hi}%`, `${Number.isInteger(v) ? v : v.toFixed(1)}%`, v >= lo - 0.5 && v <= hi + 0.5 ? 'ok' : 'MISS'];
  });
}

function report(all) {
  const out = [];
  out.push(`Aethermoor balance sim (M3, M4, M5, M6 and M7): ${TO - FROM + 1} seeds, starter ${STARTER}`);
  for (const k of ALL_MODES) {
    if (!ONLY.includes(k)) continue;
    const st = all[k];
    out.push('', `### ${LABELS[k]}`, '');
    const rows = Object.entries(st.nodes).filter(([, n]) => n.first).map(([id, n]) => [
      id, id.startsWith('patrol:') ? `(zone patrol${n.ran ? `, ${pct(n.ran, n.first)} ran` : ''})` : ENCOUNTERS[id].spawns.map(s => s.family).join('+'), f1(avg(n.level)), pct(n.firstWins, n.first), f1(avg(n.rounds)),
      pct(avg(n.hpLeft), 1), pct(n.first - n.firstWins - n.yields, n.first), n.yields ? pct(n.yields, n.first) : '', n.wipes, n.claims || '', n.shatters || '', n.stuck || '',
    ]);
    out.push(table(rows, ['node', 'foes', 'lvl', 'win 1st', 'rounds', 'hp left', 'wipe 1st', 'yield', 'wipes', 'claimed', 'shattered', 'stuck']));
    const r = st.rolls;
    const drops = [...RARITY_ORDER, 'shattered'].filter(x => st.drops[x]).map(x => `${x} ${st.drops[x]}`).join(', ');
    out.push('', `runs cleared ${st.cleared}/${st.runs} (stuck ${st.stuck}${st.stuckSeeds ? `: ${st.stuckSeeds.join(', ')}` : ''}); end party level ${f1(avg(st.endLevel))}; grind fights/run ${f1(st.grindFights / Math.max(1, st.runs))}`);
    out.push(`hero attack rolls: hit ${pct((r.hit || 0), r.n)}, graze ${pct(r.graze || 0, r.n)}, crit ${pct(r.crit || 0, r.n)}, miss ${pct(r.miss || 0, r.n)}, fumble ${pct(r.fumble || 0, r.n)}`);
    out.push(`random/worn-gear drops by rarity: ${drops}; named relics dropped: ${st.relics}`);
    if (st.entryLevel.length) out.push(`party level entering the ${BELOW_MODES.includes(k) ? 'Hearth Below' : GLOOM_MODES.includes(k) ? 'Gloomfen' : IRON_MODES.includes(k) ? 'Ironspire' : 'Sunscorch'}: ${f1(avg(st.entryLevel))}`);
    if (st.forgedHeroes) out.push(`forged: ${st.forgedHeroes} heroes' weapons at +${st.forgedTemper || 4}; ${st.gemmed || 0} gems set (${st.gemInWeapon || 0} in the weapon)${st.masterpieces ? `; the Warden's Masterpiece forged in ${st.masterpieces} runs${st.masterpieceFailed ? ` (refused in ${st.masterpieceFailed})` : ''}` : ''}`);
    // M7: fights tuned together, a thief's Stolen Arts, and the guest beside the party
    for (const [name, grp] of Object.entries(st.groups || {})) out.push(`${GROUP_NAMES[name] || name}: ${pct(grp.wiped, grp.runs)} of runs wipe somewhere in the group (${grp.wiped} of ${grp.runs})`);
    for (const [id, n] of Object.entries(st.nodes)) {
      if (n.stole?.length) out.push(`${id}: Stolen Arts taken ${f1(avg(n.stole.filter(x => x >= 0)))} on average (of ${f1(avg(n.stealable))} he could take; the Thief reached in ${pct(n.stole.filter(x => x >= 0).length, n.stole.length)} of first tries)`);
      if (n.guestFights) out.push(`${id}: the guest falls in ${pct(n.guestDown, n.guestFights)} of first tries`);
    }
  }
  const sun = targetChecks(all, SUN_TARGETS, SUN_MODES);
  if (sun.length) out.push('', '### Gate 4 targets (M4 spec §8)', '', table(sun, ['mode', 'node', 'target', 'result', '']));
  const iron = targetChecks(all, IRON_TARGETS, IRON_MODES);
  if (iron.length) out.push('', '### Gate 5 targets (M5 spec §8)', '', table(iron, ['mode', 'node', 'target', 'result', '']));
  const gloom = targetChecks(all, GLOOM_TARGETS, GLOOM_MODES);
  if (gloom.length) out.push('', '### Gate 6 targets (M6 spec §8)', '', table(gloom, ['mode', 'node', 'target', 'result', '']));
  const below = [...groupChecks(all, BELOW_GROUP_TARGETS), ...targetChecks(all, BELOW_TARGETS, BELOW_MODES)];
  if (below.length) out.push('', '### Gate 7 targets (M7 spec §8)', '', table(below, ['mode', 'node', 'target', 'result', '']));
  return out.join('\n');
}

// Run as a script; imported (a tuning harness), it only exposes the routes and the players.
export { playRoute, fight, newStats, forgeParty, AFTER_BRAND, SUN_START, SUN_ROUTE, SUN_LEAD_ROUTES, IRON_START, IRON_ROUTE, IRON_LEAD_ROUTES, GLOOM_START, GLOOM_ROUTE, GLOOM_LEAD_ROUTES, COUNCIL, BELOW_ROUTE, BELOW_FORGED_ROUTE, STARTERS, GAUNTLET };
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const t0 = performance.now();
  if (JSON_OUT) { const stats = simulate(); process.stdout.write(JSON.stringify({ stats, cache: sunCacheNew, ironCache: ironCacheNew, gloomCache: gloomCacheNew })); }
  else {
    const all = JOBS > 1 ? await simulateJobs() : simulate();
    console.log(report(all));
    console.log(`\n(${((performance.now() - t0) / 1000).toFixed(1)}s)`);
  }
}
