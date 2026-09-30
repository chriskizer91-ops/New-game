// The M2 Gauntlet: the Hearth Road north from Hearthstone Keep into the Verdant Wilds, ending
// in Briarmaw's den. Nodes are visited in GAUNTLET order. Hearthfires are rest + save points.
//
// node:   { id, type: 'hearthfire' | 'fight', name, place, backdrop, text, spawns, once, gentle }
// spawn:  { family, level, gearTier, omens, variant, relic (held, with grip), wears (visible
//           regalia piece), name }
// Levels here are Waking-0 levels; rules/foe.js escalates them each Waking.
// `once` nodes are skipped on later Waking runs. `gentle`: the tutorial relic never shatters.
//
// M3 (spec §3.3) adds the Verdant Wilds encounters below the M2 ones. The M2 entries, GAUNTLET and
// the M2 PATROLS sets stay byte-identical (test/fixtures/m2-spawns.json). New fields:
//   region    'verdant' (a Brand re-arms every non-`once` encounter of its region)
//   duel      losing is a yield (Tamsin)          talk: dialogue id played before the fight
//   forewarned  the battle ctx gets `warded` when story.forewarned is set
//   opens     a win sets flags.unlocked[opens] (the Bramble Toll chain stays open for good)
//   yields    the story flag a lost duel sets (the Eldest Tree door opens anyway)
//   dark      the fight happens in the dark (a dark map): the backdrop is drawn dark
//   spawn.level 'party' = party level + (spawn.partyDelta || 1); variant/relic '$rival' = the rival
//   starter (STARTERS[story.starter].rival); spawn.lend: the held relic is lent (never claimed);
//   spawn.wakeLevels overrides levels per Waking; spawn.noWaking skips escalation.
//   leaves    (M6) a condition: once it holds the encounter is gone from its map for good, as a done one is
//             (Tamsin after her fall)
// Hearthfires with `cold` start unlit (a cold-hearth lock) in data/world.js HEARTHS and on the map.

import { deepFreeze } from '../core/freeze.js';

export const BACKDROPS = Object.freeze(['hearth-road', 'verdant-wood', 'thornhollow', 'briarmaw-den',
  'mossfall', 'mosswatch', 'fawnrest', 'eldergrove', 'heartroot', // M3 adds the last five
  'sun-road', 'sandspire', 'dust-trail', 'deep-shaft', 'glass-heart', 'glass-flats', 'miragewell', 'scorchgate', 'scorchgate-vaults', // M4
  'rockslide-pass', 'peaks-veil', 'highfold', 'iron-stair', 'ironhold', 'ironhold-deeps', 'harrows-forge', 'stormwatch', 'frost-road', 'frostmere', 'frostmere-below', // M5
  'murkway', 'willowmurk', 'rotbridge', 'bogmire', 'lanternfen', 'mothers-hollow', 'long-boardwalk', 'misthollow', 'drowned-belfry', 'blackwater-reach', 'tidal-flats', 'causeway']); // M6

const S = (family, level, o = {}) => ({ family, level, gearTier: 0, omens: [], ...o });
// M4: a Sunscorch spawn that is not rabble climbs SUN_WAKE levels per Waking instead of 6 (M3 §4.6 wakeLevels).
// A player arrives at Waking 2 and meets the region's second Champion at Waking 3, in whichever order
// they take them; the party gains about four levels between the two Brands, so +4 keeps both halves of
// the region (and both orders) fair, where +6 would need Waking-0 levels below 1 for the second half.
const SUN_WAKE = 4;
const SUN = (family, level, o = {}) => S(family, level, { wakeLevels: SUN_WAKE, ...o });
// M5: the Ironspire's spawns that are not rabble climb IRON_WAKE levels per Waking, as the Sunscorch's do
// (spec §2.6). A player arrives at Waking 4 (every earlier Brand is held). Every Ironspire spawn also keeps at
// most IRON_OMENS Waking Omens (M4.5's wakeOmenCap): at Waking 4 and 5 an elite would carry four or five of
// the six, so every foe would look alike (and a frost wraith would be Emberblooded); the Ironspire climbs in
// levels instead. IRON_R is a rabble spawn (the usual 2 levels a Waking), with the same cap.
const IRON_WAKE = 4;
const IRON_OMENS = 3;
const IRON = (family, level, o = {}) => S(family, level, { wakeLevels: IRON_WAKE, wakeOmenCap: IRON_OMENS, ...o });
const IRON_R = (family, level, o = {}) => S(family, level, { wakeOmenCap: IRON_OMENS, ...o });

// M6: the Gloomfen's spawns that are not rabble climb GLOOM_WAKE levels per Waking and keep at most GLOOM_OMENS
// Waking Omens, as the Ironspire's do (spec §2.6). A player arrives at Waking 6 (every earlier Brand is held) and
// meets the Deep half at Waking 7. GLOOM_R is a rabble spawn (the usual 2 levels a Waking), with the same cap.
const GLOOM_WAKE = 4;
const GLOOM_OMENS = 3;
const GLOOM = (family, level, o = {}) => S(family, level, { wakeLevels: GLOOM_WAKE, wakeOmenCap: GLOOM_OMENS, ...o });
const GLOOM_R = (family, level, o = {}) => S(family, level, { wakeOmenCap: GLOOM_OMENS, ...o });

export const ENCOUNTERS = deepFreeze({
  'hearthstone-keep': {
    id: 'hearthstone-keep', type: 'hearthfire', name: 'The Eternal Hearth', place: 'Hearthstone Keep', backdrop: 'hearth-road',
    text: 'The hearth that never flickered is burning blue. Fenwick will not meet your eye.',
  },
  'keep-vault': {
    id: 'keep-vault', type: 'fight', name: 'The Vault Door', place: 'Hearthstone Keep', backdrop: 'hearth-road', once: true, gentle: true,
    spawns: [S('tallyman', 1, { variant: 'thief', relic: 'wardens-seal', name: 'Sneck the Tallyman' }), S('cutpurse', 1)],
    text: 'A Tallyman thief bolts from the reliquary with the Warden\'s Seal swinging on his belt. Break his grip.',
  },
  'hearth-road': {
    id: 'hearth-road', type: 'fight', name: 'The Hearth Road North', place: 'Hearth Road', backdrop: 'hearth-road',
    spawns: [S('cutpurse', 1), S('cutpurse', 1), S('cutpurse', 2)],
    text: 'Road-rats in the ditch, and one of them is wearing a rusty knife he will not keep.',
  },
  'waymarker-stones': {
    id: 'waymarker-stones', type: 'fight', name: 'The Waymarker Stones', place: 'Hearth Road', backdrop: 'hearth-road',
    spawns: [S('thornhound', 2), S('thornhound', 2), S('briarling', 2)],
    text: 'Bramble has swallowed the old waymarkers, and something hunts in it.',
  },
  'milestone-fire': {
    id: 'milestone-fire', type: 'hearthfire', name: 'The Milestone Fire', place: 'Hearth Road', backdrop: 'hearth-road',
    text: 'A coal carried from the Keep still burns in the milestone shrine. Rest while it does.',
  },
  'bramble-toll': {
    id: 'bramble-toll', type: 'fight', name: 'The Bramble Toll', place: 'Verdant Wilds', backdrop: 'verdant-wood', opens: 'bramble-toll-chain',
    spawns: [S('bandit', 3, { gearTier: 1, wears: 'thornwatch-hood', name: 'Skarn' }), S('cutpurse', 2), S('cutpurse', 2)],
    text: 'Bandits have strung a chain across the road. Their captain wears a Thornwatch hood he did not earn.',
  },
  'verdant-edge': {
    id: 'verdant-edge', type: 'fight', name: 'The Verdant Edge', place: 'Verdant Wilds', backdrop: 'verdant-wood',
    spawns: [S('briarling', 3), S('briarling', 3), S('thornhound', 3)],
    text: 'Where the road gives up and the wood begins. The bramble is moving against the wind.',
  },
  'rotstag-glade': {
    id: 'rotstag-glade', type: 'fight', name: 'The Rot-Stag\'s Glade', place: 'Verdant Wilds', backdrop: 'verdant-wood',
    spawns: [S('rotstag', 4)],
    text: 'Fawnrest\'s white stag, gone black. Something is tangled in its antlers, and it glints.',
  },
  thornhollow: {
    id: 'thornhollow', type: 'hearthfire', name: 'Thornhollow Hearth', place: 'Thornhollow', backdrop: 'thornhollow',
    text: 'The outpost\'s thorn walls grew back overnight. Captain Dael\'s bounty board has a beast nobody can name.',
  },
  'tally-camp': {
    id: 'tally-camp', type: 'fight', name: 'The Tallyman Camp', place: 'Thornhollow outskirts', backdrop: 'thornhollow',
    spawns: [S('tallyman', 5, { gearTier: 1, relic: 'tallyknife' }), S('bandit', 5, { gearTier: 1, wears: 'thornwatch-jerkin' }), S('cutpurse', 4, { gearTier: 1 })],
    text: 'Ledgers, strongboxes and a Tallyman counting stolen relics by lamplight.',
  },
  'snag-wallow': {
    id: 'snag-wallow', type: 'fight', name: 'Old Snag\'s Wallow', place: 'Verdant Wilds', backdrop: 'verdant-wood',
    spawns: [S('oldsnag', 6)],
    text: 'A gold glint in the black mud: the Thornsplitter Hatchet, still buried in Old Snag\'s shoulder.',
  },
  'bramble-deep': {
    id: 'bramble-deep', type: 'fight', name: 'The Bramble-Deep', place: 'Verdant Wilds', backdrop: 'verdant-wood',
    spawns: [S('bandit', 6, { gearTier: 2, wears: 'thornwatch-boots' }), S('briarling', 5), S('briarling', 5)],
    text: 'The last Thornwatch patrol came this way. A bandit is wearing their boots.',
  },
  'den-mouth': {
    id: 'den-mouth', type: 'hearthfire', name: 'The Last Coals', place: 'Briarmaw\'s Den', backdrop: 'briarmaw-den',
    text: 'You bank a fire at the mouth of the den. Past it, the thorns breathe.',
  },
  'briarmaw-den': {
    id: 'briarmaw-den', type: 'fight', name: 'Briarmaw\'s Den', place: 'Briarmaw\'s Den', backdrop: 'briarmaw-den', brand: 'brand-of-briars',
    spawns: [S('briarmaw', 7)],
    text: 'It wears a crown of thorns that grew there, and a fang the length of a knife. Snap them off.',
  },

  // ---- M3: the Verdant Wilds (spec §3.3). Levels are Waking-0 levels. ------------------------------
  'hr-smugglers': {
    id: 'hr-smugglers', type: 'fight', name: 'The Smugglers\' Hollow', place: 'Hearth Road', backdrop: 'hearth-road', region: 'verdant',
    spawns: [S('smuggler', 6, { variant: 'queen', relic: 'lightfingers', name: 'Mags Kestrel' }), S('smuggler', 4), S('smuggler', 4)],
    text: 'A pocket behind the bramble, full of other people\'s cargo. Mags Kestrel counts it with gloves on.',
  },
  'poachers-holm': {
    id: 'poachers-holm', type: 'fight', name: 'Poacher\'s Holm', place: 'Hearth Road', backdrop: 'hearth-road', region: 'verdant',
    spawns: [S('bandit', 10, { variant: 'poacher', relic: 'hartshorn', wakeLevels: 3, name: 'Haskett' }), S('thornhound', 8), S('thornhound', 8)],
    text: 'An islet in the millrace, and a poacher who has never missed. His hounds are already looking at you.',
  },
  'mf-smugglers': {
    id: 'mf-smugglers', type: 'fight', name: 'Reed-Runners', place: 'Mossfall', backdrop: 'mossfall', region: 'verdant',
    spawns: [S('smuggler', 7), S('smuggler', 7), S('smuggler', 7)],
    text: 'Kerchiefs up, knives out. They know the dry paths and you do not.',
  },
  'mf-bog': {
    id: 'mf-bog', type: 'fight', name: 'The Sucking Bog', place: 'Mossfall', backdrop: 'mossfall', region: 'verdant',
    spawns: [S('boglurcher', 7), S('boglurcher', 7), S('smuggler', 6)],
    text: 'The bog stands up. Twice. A smuggler behind it laughs.',
  },
  'mire-shrine': {
    id: 'mire-shrine', type: 'fight', name: 'The Mire Shrine', place: 'Mossfall', backdrop: 'mossfall', region: 'verdant',
    spawns: [S('mirelord', 4), S('boglurcher', 5), S('boglurcher', 5)],
    text: 'Gorrow the Mire-King sits in the drowned shrine, and the Mire Pearl glows in his crown of reeds.',
  },
  'mw-stair': {
    id: 'mw-stair', type: 'fight', name: 'The Tower Stair', place: 'Mosswatch Tower', backdrop: 'mosswatch', region: 'verdant',
    spawns: [S('tallyman', 4), S('smuggler', 7), S('smuggler', 7)],
    text: 'Someone has been carrying crates up the watchtower stair. They would rather you did not ask what.',
  },
  'mw-lantern': {
    id: 'mw-lantern', type: 'fight', name: 'The Lamp Room', place: 'Mosswatch Tower', backdrop: 'mosswatch', region: 'verdant', dark: true,
    spawns: [S('tallyman', 5, { variant: 'signalmaster', relic: 'mosswatch-lantern', name: 'Hollis Fairweight' }), S('tallyman', 5), S('smuggler', 7)],
    text: 'The lights at midnight: Hollis Fairweight, signalling someone with the tower\'s own Lantern.',
  },
  'hw-glowcaps': {
    id: 'hw-glowcaps', type: 'fight', name: 'Glowcap Ring', place: 'The Hindwood', backdrop: 'verdant-wood', region: 'verdant',
    spawns: [S('glowcap', 7), S('glowcap', 7), S('glowcap', 7)],
    text: 'A ring of mushrooms that were not there a moment ago, all turning toward your light.',
  },
  'hw-druids': {
    id: 'hw-druids', type: 'fight', name: 'The Feral Druid', place: 'The Hindwood', backdrop: 'verdant-wood', region: 'verdant',
    spawns: [S('feral-druid', 4), S('thornhound', 8), S('thornhound', 8)],
    text: 'A druid in an antler hood, and the hounds that follow her now.',
  },
  'gloamwing-hollow': {
    id: 'gloamwing-hollow', type: 'fight', name: 'The Gloamwing\'s Hollow', place: 'The Hindwood', backdrop: 'verdant-wood', region: 'verdant',
    spawns: [S('gloamwing', 5, { omens: ['swift'] })],
    text: 'Pale trees, pale silk, and a moth the size of a cart. The Fawnrest bell hums on its thorax.',
  },
  'vesper-stall': {
    id: 'vesper-stall', type: 'fight', name: 'Vesper\'s Stall', place: 'Fawnrest Shrine', backdrop: 'fawnrest', region: 'verdant', once: true, talk: 'vesper',
    spawns: [S('tallyman', 5, { variant: 'apothecary', name: 'Vesper' }), S('smuggler', 8), S('smuggler', 8)],
    text: 'Miracle sap, a silver the thimble. The pilgrims queue for it. The pilgrims cough.',
  },
  'grove-circle': {
    id: 'grove-circle', type: 'fight', name: 'The Grove Circle', place: 'Eldergrove', backdrop: 'eldergrove', region: 'verdant',
    spawns: [S('feral-druid', 4, { variant: 'thornmother', relic: 'rootsong', name: 'Oda the Thornmother' }), S('feral-druid', 3), S('briarling', 6)],
    text: 'Oda the Thornmother sings in the stone ring, and Rootsong answers her instead of the trees.',
  },
  'tamsin-duel': {
    id: 'tamsin-duel', type: 'fight', name: 'Tamsin at the Eldest Tree', place: 'Eldergrove', backdrop: 'eldergrove', region: 'verdant',
    once: true, duel: true, yields: 'tamsin-yielded', talk: 'tamsin-door',
    spawns: [S('tamsin', 'party', { partyDelta: 5, gearTier: 3, variant: '$rival', relic: '$rival', lend: true, wears: 'vale-gauntlets', noWaking: true, name: 'Tamsin' })],
    text: 'Tamsin, at the Eldest Tree door, with the starter you did not choose. Losing is a yield.',
  },
  'hr1-grubs': {
    id: 'hr1-grubs', type: 'fight', name: 'Rotgrub Nest', place: 'The Heartroot', backdrop: 'heartroot', region: 'verdant',
    spawns: [S('rotgrub', 8), S('rotgrub', 8), S('rotgrub', 8)],
    text: 'The root-mulch moves. Then it bites.',
  },
  'hr1-sapwight': {
    id: 'hr1-sapwight', type: 'fight', name: 'The Sapwight', place: 'The Heartroot', backdrop: 'heartroot', region: 'verdant',
    spawns: [S('sapwight', 4), S('rotgrub', 8), S('rotgrub', 8)],
    text: 'Bark and black sap in the shape of a person, and the grubs that feed on it.',
  },
  'hollowed-patrol': {
    id: 'hollowed-patrol', type: 'fight', name: 'The Missing Patrol', place: 'The Heartroot', backdrop: 'heartroot', region: 'verdant', once: true,
    spawns: [S('hollowed-ranger', 6, { variant: 'sergeant', relic: 'oathshield', name: 'Sgt Corra Thistle' }), S('hollowed-ranger', 5), S('hollowed-ranger', 5)],
    text: 'The last Thornwatch patrol, still walking. Corra Thistle still holds the line.',
  },
  'hr1-tappers': {
    id: 'hr1-tappers', type: 'fight', name: 'The Sap-Tappers', place: 'The Heartroot', backdrop: 'heartroot', region: 'verdant',
    spawns: [S('tallyman', 6, { variant: 'counter', relic: 'isoldes-oath', name: 'Dun the Counter' }), S('smuggler', 9), S('smuggler', 9)],
    text: 'Taps in the eldest roots, and barrels of black sap. Dun the Counter wears a sword that is not his.',
  },
  'rotwarden-heart': {
    id: 'rotwarden-heart', type: 'fight', name: 'The Heart Chamber', place: 'The Heartroot', backdrop: 'heartroot', region: 'verdant',
    brand: 'brand-of-the-heartroot', forewarned: true, dark: true,
    spawns: [S('rotwarden', 4)],
    text: 'GREEN WAS A MISTAKE. THE MASK SAYS SO.',
  },

  // ---- M3: the six new Hearthfires (four start cold) ---------------------------------------------
  'mossfall-cairn': {
    id: 'mossfall-cairn', type: 'hearthfire', name: 'The Mossfall Cairn', place: 'Mossfall', backdrop: 'mossfall', region: 'verdant',
    text: 'A waystone cairn with a fire-bowl on top, long cold. The moss has not touched the bowl.',
  },
  'mosswatch-fire': {
    id: 'mosswatch-fire', type: 'hearthfire', name: 'The Signal Fire', place: 'Mosswatch Tower', backdrop: 'mosswatch', region: 'verdant',
    text: 'The tower\'s signal fire. Lit, it can be seen from the Keep.',
  },
  'hindwood-cairn': {
    id: 'hindwood-cairn', type: 'hearthfire', name: 'The Hindwood Cairn', place: 'The Hindwood', backdrop: 'verdant-wood', region: 'verdant',
    text: 'A hunters\' cairn under pale trees. Somebody left kindling, a long time ago.',
  },
  'fawnrest-stone': {
    id: 'fawnrest-stone', type: 'hearthfire', name: 'The Dreaming Stone', place: 'Fawnrest Shrine', backdrop: 'fawnrest', region: 'verdant',
    text: 'A warm stone the pilgrims sleep beside. Alondra says it dreams back.',
  },
  'eldergrove-hearth': {
    id: 'eldergrove-hearth', type: 'hearthfire', name: 'The Eldergrove Hearth', place: 'Eldergrove', backdrop: 'eldergrove', region: 'verdant',
    text: 'Torches at midday, and a hearth that burns green at the edges.',
  },
  'last-green-coal': {
    id: 'last-green-coal', type: 'hearthfire', name: 'The Last Green Coal', place: 'The Heartroot', backdrop: 'heartroot', region: 'verdant',
    text: 'One coal, still green, in a hollow of the roots. It remembers being fire.',
  },
  // ---- M4: the Sunscorch Wastes (spec §2.5, §3.3; owner P4). Levels are Waking-0 levels, and a player
  // arrives at Waking 2 at the earliest (both Verdant Brands open the Keep's south-east gate). Every foe
  // that is not rabble is a SUN spawn (4 levels per Waking: +8 on arrival, +12 after the first Sunscorch
  // Brand); rabble climb the usual 2. Tuned in Gate 4 with tools/sim.mjs (docs/RULES.md §12, M4); a base
  // level also picks the spawn's Omens, so a change of one level can change the fight.
  waystone: {
    id: 'waystone', type: 'hearthfire', name: 'The Waystone Fire', place: 'The Sunward Road', backdrop: 'sun-road', region: 'sunscorch',
    text: 'A fire-bowl on a standing stone where the green gives out and the sand begins.',
  },
  'spire-hearth': {
    id: 'spire-hearth', type: 'hearthfire', name: 'The Spire Hearth', place: 'Sandspire', backdrop: 'sandspire', region: 'sunscorch',
    text: 'The market fire of Sandspire, fed with dung-cakes and gossip.',
  },
  'dust-cairn': {
    id: 'dust-cairn', type: 'hearthfire', name: 'The Dust Cairn', place: 'The Dust Trail', backdrop: 'dust-trail', region: 'sunscorch',
    text: 'A miners\' cairn with a fire-bowl on top, choked with sand.',
  },
  pithead: {
    id: 'pithead', type: 'hearthfire', name: 'The Pithead Fire', place: 'Dusthaven', backdrop: 'dust-trail', region: 'sunscorch',
    text: 'The fire at the pithead, where the shifts change and the lamps are lit.',
  },
  'shaft-lamp': {
    id: 'shaft-lamp', type: 'hearthfire', name: 'The Shaft Lamp', place: 'The Deep Shaft', backdrop: 'deep-shaft', region: 'sunscorch',
    text: 'A great lamp bolted to the timbers, dark since the diggers came.',
  },
  'well-fire': {
    id: 'well-fire', type: 'hearthfire', name: 'The Well Fire', place: 'Miragewell', backdrop: 'miragewell', region: 'sunscorch',
    text: 'A small fire by the well, where the pilgrims warm their hands at night.',
  },
  'last-watchfire': {
    id: 'last-watchfire', type: 'hearthfire', name: 'The Last Watchfire', place: 'Scorchgate Ruins', backdrop: 'scorchgate', region: 'sunscorch',
    text: 'The watchfire on Scorchgate\'s last wall, cold for three hundred years.',
  },
  'sr-skinks': {
    id: 'sr-skinks', type: 'fight', name: 'Sand-Skinks', place: 'The Sunward Road', backdrop: 'sun-road', region: 'sunscorch',
    spawns: [S('sand-skink', 8), S('sand-skink', 8), S('sand-skink', 8)],
    text: 'Quick little lizards with too many teeth, sunning themselves on the road.',
  },
  'sr-toll': {
    id: 'sr-toll', type: 'fight', name: 'Rasa\'s Toll', place: 'The Sunward Road', backdrop: 'sun-road', region: 'sunscorch',
    spawns: [SUN('dune-raider', 4, { variant: 'rider', relic: 'sandwalkers', name: 'Rasa the Dune-Rider' }), SUN('dune-raider', 3), SUN('dune-raider', 3)],
    text: 'Rasa the Dune-Rider has strung a rope across the road and wants a toll in water. Her boots have never sunk.',
  },
  'dt-skinks': {
    id: 'dt-skinks', type: 'fight', name: 'Skink Nest', place: 'The Dust Trail', backdrop: 'dust-trail', region: 'sunscorch',
    spawns: [S('sand-skink', 9), S('sand-skink', 9), S('sand-skink', 9), S('sand-skink', 9)],
    text: 'A nest of sand-skinks in the rail cuttings, all of them hungry at once.',
  },
  'dt-scorpions': {
    id: 'dt-scorpions', type: 'fight', name: 'Glass Scorpions', place: 'The Dust Trail', backdrop: 'dust-trail', region: 'sunscorch',
    spawns: [SUN('glass-scorpion', 5), SUN('glass-scorpion', 5)],
    text: 'Two scorpions of cloudy glass, clicking in the heat.',
  },
  'dt-aqueduct': {
    id: 'dt-aqueduct', type: 'fight', name: 'The Choked Aqueduct', place: 'The Dust Trail', backdrop: 'dust-trail', region: 'sunscorch',
    spawns: [SUN('glass-scorpion', 6, { variant: 'matriarch', name: 'The Aqueduct Matriarch' }), SUN('glass-scorpion', 5), SUN('glass-scorpion', 5)],
    text: 'A glass-scorpion nest has choked Sandspire\'s aqueduct channel with its shed shells. The Matriarch is the size of a cart.',
  },
  'wyrm-lair': {
    id: 'wyrm-lair', type: 'fight', name: 'The Sand Wyrm', place: 'The Dust Trail', backdrop: 'dust-trail', region: 'sunscorch',
    spawns: [SUN('sand-wyrm', 5, { name: 'The Sand Wyrm' })],
    text: 'The sand in the sinkhole breathes in and out. Something in it glints like a door.',
  },
  'ds-crew': {
    id: 'ds-crew', type: 'fight', name: 'Brask\'s Crew', place: 'The Deep Shaft', backdrop: 'deep-shaft', region: 'sunscorch', dark: true,
    spawns: [SUN('tallyman', 5, { variant: 'foreman', relic: 'sunstone-lantern', name: 'Foreman Brask' }), S('smuggler', 9), S('smuggler', 9)],
    text: 'Tallyman diggers, working the sunstone veins by the light of a stolen lantern.',
  },
  'ds-scorpions': {
    id: 'ds-scorpions', type: 'fight', name: 'Shaft Scorpions', place: 'The Deep Shaft', backdrop: 'deep-shaft', region: 'sunscorch', dark: true,
    spawns: [SUN('glass-scorpion', 5), SUN('glass-scorpion', 5), S('sand-skink', 10)],
    text: 'Scorpions in the dark, drawn up from the Glass Heart below.',
  },
  'kharzul-heart': {
    id: 'kharzul-heart', type: 'fight', name: 'The Glass Heart', place: 'The Deep Shaft', backdrop: 'glass-heart', region: 'sunscorch',
    brand: 'brand-of-glass',
    spawns: [SUN('kharzul', 6)],
    text: 'A scorpion of living glass, and a scimitar in its tail that has been warm for three hundred years. Snap the carapace; pry the blade loose.',
  },
  'gf-raiders': {
    id: 'gf-raiders', type: 'fight', name: 'Dune Raiders', place: 'The Glass Flats', backdrop: 'glass-flats', region: 'sunscorch',
    spawns: [SUN('dune-raider', 3), SUN('dune-raider', 3), SUN('dune-raider', 3)],
    text: 'Raiders coming over the dune crest, blades out and faces wrapped.',
  },
  'gf-wisps': {
    id: 'gf-wisps', type: 'fight', name: 'Mirage Wisps', place: 'The Glass Flats', backdrop: 'glass-flats', region: 'sunscorch',
    spawns: [SUN('mirage-wisp', 4), SUN('mirage-wisp', 4)],
    text: 'Two shimmers that look like water until they bite.',
  },
  'gf-caravan': {
    id: 'gf-caravan', type: 'fight', name: 'The Tallyman Caravan', place: 'The Glass Flats', backdrop: 'glass-flats', region: 'sunscorch',
    // M5: the plain smuggler 6 (was 7): Kharzul's exact Burrow moved this lead to 25.5% first-try wipes (M4's 15-25%)
    spawns: [SUN('tallyman', 4, { variant: 'quartermaster', name: 'The Quartermaster', wakeOmenCap: 2 }), SUN('smuggler', 5, { variant: 'sharpshooter', relic: 'saltglass', name: 'Vell Saltglass', wakeOmenCap: 2 }), S('smuggler', 6)],
    text: 'A Tallyman caravan with a sharpshooter on the lead wagon, and on the last wagon a crate that hums.',
  },
  'gnash-camp': {
    id: 'gnash-camp', type: 'fight', name: 'Gnash\'s Camp', place: 'The Glass Flats', backdrop: 'glass-flats', region: 'sunscorch',
    spawns: [SUN('dune-raider', 4, { variant: 'raider-king', relic: 'dunebreaker', name: 'Gnash the Raider-King', wakeOmenCap: 2 }), SUN('dune-raider', 3, { wakeOmenCap: 2 }), SUN('dune-raider', 3, { wakeOmenCap: 2 })],
    text: 'Gnash the Raider-King holds court on a throne of glassed sand, with a giant\'s maul across his knees.',
  },
  'wisp-queen': {
    id: 'wisp-queen', type: 'fight', name: 'The Wisp-Queen', place: 'Miragewell', backdrop: 'miragewell', region: 'sunscorch',
    spawns: [SUN('mirage-wisp', 6, { variant: 'queen', relic: 'mirage-glass', name: 'The Wisp-Queen', wakeOmenCap: 2 }), SUN('mirage-wisp', 4, { wakeOmenCap: 2 }), SUN('mirage-wisp', 4, { wakeOmenCap: 2 })],
    text: 'The wisps drink the well dry each night. Their queen wears a lens of well-water that never spills.',
  },
  'sg-wights': {
    id: 'sg-wights', type: 'fight', name: 'Ash-Wights', place: 'Scorchgate Ruins', backdrop: 'scorchgate', region: 'sunscorch',
    spawns: [SUN('ash-wight', 4), SUN('ash-wight', 4), SUN('ash-wight', 4)],
    text: 'Scorchgate\'s soldiers, still walking the walls three hundred years after the fire.',
  },
  'sg-captain': {
    id: 'sg-captain', type: 'fight', name: 'The Ash-Captain', place: 'Scorchgate Ruins', backdrop: 'scorchgate', region: 'sunscorch',
    spawns: [SUN('ash-wight', 4, { variant: 'captain', relic: 'scorchgate-key', name: 'The Ash-Captain' }), SUN('ash-wight', 3), SUN('ash-wight', 3)],
    text: 'The Ash-Captain guards the vault door with a key ring that has no key on it.',
  },
  'tamsin-scorchgate': {
    id: 'tamsin-scorchgate', type: 'fight', name: 'Tamsin at Scorchgate', place: 'Scorchgate Ruins', backdrop: 'scorchgate', region: 'sunscorch',
    once: true, duel: true, yields: 'tamsin-yielded-2', talk: 'tamsin-scorchgate',
    // Her Scorchgate kit: the M3 Arts of her lent counter-starter, the kindled look (gear tier 4 is the
    // art's kindled tier; rules clamp gear to 3), and the Swift Omen (Gate 4: party win 55-70%).
    spawns: [S('tamsin', 'party', { partyDelta: 4, gearTier: 4, omens: ['swift'], variant: '$rival', relic: '$rival', lend: true, noWaking: true, name: 'Tamsin' })],
    text: 'Tamsin, on Scorchgate\'s parade ground, and the relic in her hands has started to glow. Losing is a yield.',
  },
  'vault-guard': {
    id: 'vault-guard', type: 'fight', name: 'The Vault Guard', place: 'The Scorchgate Vaults', backdrop: 'scorchgate-vaults', region: 'sunscorch', dark: true,
    spawns: [SUN('ash-wight', 3), SUN('ash-wight', 3), SUN('ash-wight', 3)],
    text: 'Three wights at the inner door, as they have stood for three hundred years.',
  },
  'ashen-warden': {
    id: 'ashen-warden', type: 'fight', name: 'The Vault of Ash', place: 'The Scorchgate Vaults', backdrop: 'scorchgate-vaults', region: 'sunscorch',
    brand: 'brand-of-ash', dark: true,
    spawns: [SUN('ashen-warden', 7)],
    text: 'The Ashen Warden stands where the fire stopped, with the Aegis up and the Crown lit. Break them both.',
  },

  // ---- M5: the Ironspire Peaks (spec §2.5, §3.3; owner P4). Levels are Waking-0 levels: a player arrives at
  // Waking 4 (every earlier Brand is held) and meets the Frost half at Waking 5, after the Brand of Iron. Every
  // foe that is not rabble is an IRON spawn (4 levels per Waking: +16 on arrival, +20 after the Brand of Iron);
  // rabble climb the usual 2. Tuned in M5 with tools/sim.mjs (docs/RULES.md §12, M5). Each fight's backdrop is its map's
  // (spec §6.2).
  'pass-shrine': {
    id: 'pass-shrine', type: 'hearthfire', name: 'The Pass Shrine', place: 'The Rockslide Pass', backdrop: 'rockslide-pass', region: 'ironspire',
    text: 'A way-shrine cut into the rock, with a coal the monks keep lit for travellers.',
  },
  'veil-hearth': {
    id: 'veil-hearth', type: 'hearthfire', name: 'The Cloister Fire', place: 'Peak\'s Veil', backdrop: 'peaks-veil', region: 'ironspire',
    text: 'The cloister fire of Peak\'s Veil, fed with pine and silence.',
  },
  'stair-cairn': {
    id: 'stair-cairn', type: 'hearthfire', name: 'The Stair Cairn', place: 'The Iron Stair', backdrop: 'iron-stair', region: 'ironspire',
    text: 'A dwarf cairn halfway up the stair, with a fire-bowl gone cold.',
  },
  'thanes-hearth': {
    id: 'thanes-hearth', type: 'hearthfire', name: 'The Thane\'s Hearth', place: 'Ironhold', backdrop: 'ironhold', region: 'ironspire',
    text: 'The great hearth of Ironhold, big enough to roast an ox, and the Thane\'s chair beside it.',
  },
  'deeps-forge': {
    id: 'deeps-forge', type: 'hearthfire', name: 'The Deeps Furnace', place: 'The Ironhold Deeps', backdrop: 'ironhold-deeps', region: 'ironspire',
    text: 'One of Harrow\'s furnaces, cold since the Thane sealed the Deeps.',
  },
  'stormwatch-fire': {
    id: 'stormwatch-fire', type: 'hearthfire', name: 'The Watch Fire', place: 'Stormwatch', backdrop: 'stormwatch', region: 'ironspire',
    text: 'The watch fire in the Stormwatch yard, where the sentries warm their hands between rounds.',
  },
  'frost-cairn': {
    id: 'frost-cairn', type: 'hearthfire', name: 'The Frost Cairn', place: 'The Frost Road', backdrop: 'frost-road', region: 'ironspire',
    text: 'A road-cairn on the ice, with a fire-bowl full of snow.',
  },
  // The East Road (the lead's six maps between the Keep's east postern and the Rockslide Pass, lowland forest and
  // meadow): three road-gate fights, the warm-up before the pass. Green roads, so the Hearth Road backdrop.
  'camp-fire': {
    id: 'camp-fire', type: 'hearthfire', name: 'The Last Camp Fire', place: 'The Last Camp', backdrop: 'hearth-road', region: 'ironspire',
    text: 'A ring of stones and a log bench at the edge of the pines: the last fire on the road before the pass.',
  },
  'er-wolves': {
    id: 'er-wolves', type: 'fight', name: 'Wolves in the Lea', place: 'Drystone Lea', backdrop: 'hearth-road', region: 'ironspire',
    spawns: [IRON_R('rime-wolf', 12), IRON_R('rime-wolf', 12), IRON_R('rime-wolf', 12)],
    text: 'Rime wolves down from the snows too early, hunting the lea where the drystone walls have fallen.',
  },
  'er-toll': {
    id: 'er-toll', type: 'fight', name: 'The Plankford Toll', place: 'Plankford', backdrop: 'hearth-road', region: 'ironspire',
    spawns: [IRON_R('brigand', 10), IRON_R('brigand', 10), IRON_R('brigand', 10)],
    text: 'Stormwatch deserters have chained the plank bridge and want a toll. They are not very good at it yet.',
  },
  'er-camp': {
    id: 'er-camp', type: 'fight', name: 'The Deserters\' Camp', place: 'The Last Camp', backdrop: 'hearth-road', region: 'ironspire',
    spawns: [IRON('brigand', 2, { variant: 'sergeant', name: 'The Deserter Sergeant' }), IRON_R('brigand', 11), IRON_R('brigand', 11)],
    text: 'The deserters\' last camp before the pass: a palisade across the road, and a sergeant who still drills the men who ran with him.',
  },
  'rp-brigands': {
    id: 'rp-brigands', type: 'fight', name: 'Rhune\'s Toll', place: 'The Rockslide Pass', backdrop: 'rockslide-pass', region: 'ironspire',
    spawns: [IRON('brigand', 4, { variant: 'warden', relic: 'windstep-boots', name: 'Rhune the Pass-Warden', omens: ['swift'], wakeOmenCap: 0 }), IRON_R('brigand', 12), IRON_R('brigand', 12)],
    text: 'Rhune the Pass-Warden and his deserters have chained the cleared slide, and want a toll in coin. His boots have never once touched the scree.',
  },
  'rp-rocklings': {
    id: 'rp-rocklings', type: 'fight', name: 'The Scree Field', place: 'The Rockslide Pass', backdrop: 'rockslide-pass', region: 'ironspire',
    spawns: [IRON_R('rockling', 13), IRON_R('rockling', 13), IRON_R('rockling', 13), IRON_R('rockling', 13)],
    text: 'The scree moves. Then it stands up, four times over.',
  },
  'rp-wolves': {
    id: 'rp-wolves', type: 'fight', name: 'Rime Wolves', place: 'The Rockslide Pass', backdrop: 'rockslide-pass', region: 'ironspire',
    spawns: [IRON_R('rime-wolf', 13), IRON_R('rime-wolf', 13), IRON_R('rime-wolf', 13)],
    text: 'Wolves with frost in their fur, hunting in a side hollow.',
  },
  'hf-trolls': {
    id: 'hf-trolls', type: 'fight', name: 'Trolls on the Path', place: 'The Highfold', backdrop: 'highfold', region: 'ironspire',
    spawns: [IRON('peak-troll', 5), IRON('peak-troll', 5)],
    text: 'Two peak-trolls sitting on the scree path, arguing about whose it is.',
  },
  'roc-eyrie': {
    id: 'roc-eyrie', type: 'fight', name: 'The Thunder-Roc', place: 'The Highfold', backdrop: 'highfold', region: 'ironspire',
    spawns: [IRON('thunder-roc', 5, { name: 'The Thunder-Roc', omens: ['swift', 'frenzied', 'thornskinned'], wakeOmenCap: 0 })],
    text: 'An eyrie on a crag, and a bird the size of a barn that carries off goats, and sometimes shepherds. A shepherd\'s cloak is still caught on its talon.',
  },
  'is-sentinels': {
    id: 'is-sentinels', type: 'fight', name: 'The Stair Sentinels', place: 'The Iron Stair', backdrop: 'iron-stair', region: 'ironspire',
    spawns: [IRON('iron-sentinel', 6, { variant: 'captain', relic: 'ironwall', name: 'The Sentinel-Captain' }), IRON('iron-sentinel', 5), IRON('iron-sentinel', 5)],
    text: 'Dwarf automatons at the gate at the stair\'s foot, still keeping out whoever the Thane told them to keep out. The Captain carries a door for a shield.',
  },
  'is-trolls': {
    id: 'is-trolls', type: 'fight', name: 'Stair Trolls', place: 'The Iron Stair', backdrop: 'iron-stair', region: 'ironspire',
    spawns: [IRON('peak-troll', 5), IRON_R('rockling', 14), IRON_R('rockling', 14)],
    text: 'A troll and its rocklings, foraging on the switchbacks.',
  },
  'troll-cave': {
    id: 'troll-cave', type: 'fight', name: 'Old Horn\'s Cave', place: 'The Iron Stair', backdrop: 'iron-stair', region: 'ironspire',
    spawns: [IRON('peak-troll', 10, { variant: 'old-horn', relic: 'trollhide-mantle', name: 'Old Horn', omens: ['frenzied', 'swift'], wakeOmenCap: 0 }), IRON('peak-troll', 5)],
    text: 'Behind a wall of old blue ice, Old Horn the Peak-Troll sleeps in a mantle made of other trolls.',
  },
  'tamsin-ironhold': {
    id: 'tamsin-ironhold', type: 'fight', name: 'Tamsin at Ironhold', place: 'Ironhold', backdrop: 'ironhold', region: 'ironspire',
    once: true, duel: true, yields: 'tamsin-yielded-3', talk: 'tamsin-ironhold',
    // Her Ironhold kit (data/rivals.js RIVAL_KITS[rival].ironhold), the kindled look (gear tier 4) and the
    // Ironvein Bracers she wears, which drop when you win (spec §3.5)
    spawns: [S('tamsin', 'party', { partyDelta: 4, gearTier: 4, omens: ['swift', 'ironclad', 'thornskinned'], variant: '$rival:ironhold', relic: '$rival', lend: true, noWaking: true, name: 'Tamsin', wears: 'ironvein-bracers' })],
    text: 'Tamsin on the Deeps stair, hunting Harrow too, and not in the mood to share. Losing is a yield.',
  },
  'id-forgeborn': {
    id: 'id-forgeborn', type: 'fight', name: 'The Forgeborn', place: 'The Ironhold Deeps', backdrop: 'ironhold-deeps', region: 'ironspire', dark: true,
    spawns: [IRON('forgeborn', 6), IRON('forgeborn', 6), IRON('forgeborn', 6)],
    text: 'Harrow\'s molten servants, still tending forges nobody lights.',
  },
  'id-bellows': {
    id: 'id-bellows', type: 'fight', name: 'The Bellows Hall', place: 'The Ironhold Deeps', backdrop: 'ironhold-deeps', region: 'ironspire', dark: true,
    spawns: [IRON('forgeborn', 7, { variant: 'bellows', name: 'The Bellows' }), IRON('forgeborn', 6), IRON('forgeborn', 6)],
    text: 'A forgeborn built around a great bellows, breathing sparks into the dark.',
  },
  'id-smith': {
    id: 'id-smith', type: 'fight', name: 'Harrow\'s Journeyman', place: 'The Ironhold Deeps', backdrop: 'ironhold-deeps', region: 'ironspire', dark: true,
    spawns: [IRON('forgeborn', 11, { variant: 'journeyman', relic: 'runestaff', name: 'Harrow\'s Journeyman', omens: ['frenzied', 'swift'], wakeOmenCap: 0 }), IRON('forgeborn', 10)],
    text: 'Harrow\'s journeyman, more forge than man now, working a staff of runes at an anvil in the dark.',
  },
  'mother-anvil': {
    id: 'mother-anvil', type: 'fight', name: 'Harrow\'s Forge', place: 'Harrow\'s Forge', backdrop: 'harrows-forge', region: 'ironspire',
    brand: 'brand-of-iron',
    spawns: [IRON('mother-anvil', 7, { omens: ['thornskinned', 'frenzied', 'ironclad'], wakeOmenCap: 0 })],
    text: 'Mother Anvil, Harrow\'s first forge-golem, with his hammer in one arm and a heart of fire in her ribs. Break them both.',
  },
  'fr-cutters': {
    id: 'fr-cutters', type: 'fight', name: 'The Ice-Saw Camp', place: 'The Frost Road', backdrop: 'frost-road', region: 'ironspire',
    spawns: [IRON('tallyman', 5, { variant: 'ice-cutter', relic: 'cutters-pick', name: 'The Cutter-Chief', omens: ['ironclad'], wakeOmenCap: 0 }), IRON_R('smuggler', 13, { variant: 'sawyer' }), IRON_R('smuggler', 13, { variant: 'sawyer' })],
    text: 'A Tallyman ice-saw camp across the road, cutting blocks out of the lake for someone who pays in iron. The Cutter-Chief keeps the ledger.',
  },
  'fr-wolves': {
    id: 'fr-wolves', type: 'fight', name: 'The Frost Pack', place: 'The Frost Road', backdrop: 'frost-road', region: 'ironspire',
    spawns: [IRON_R('rime-wolf', 15), IRON_R('rime-wolf', 15), IRON_R('rime-wolf', 15), IRON_R('rime-wolf', 15)],
    text: 'A pack of rime wolves running the snow beside the road.',
  },
  'fm-wraiths': {
    id: 'fm-wraiths', type: 'fight', name: 'The Drowned', place: 'Frostmere', backdrop: 'frostmere', region: 'ironspire',
    spawns: [IRON('rime-wraith', 5), IRON('rime-wraith', 5), IRON('rime-wraith', 5)],
    text: 'Drowned monks standing round the hole in the ice, as if they were waiting to go back down.',
  },
  'fm-shrine': {
    id: 'fm-shrine', type: 'fight', name: 'The Drowned Shrine', place: 'Frostmere', backdrop: 'frostmere', region: 'ironspire',
    spawns: [IRON('rime-wraith', 6, { variant: 'abbess', relic: 'drowned-censer', name: 'The Drowned Abbess', omens: ['thornskinned', 'swift'], wakeOmenCap: 0 }), IRON('rime-wraith', 4, { variant: 'choir' }), IRON('rime-wraith', 4, { variant: 'choir' })],
    text: 'On the island shrine the Drowned Abbess still swings her censer, and the smoke smells of lake-water.',
  },
  'fb-choir': {
    id: 'fb-choir', type: 'fight', name: 'The Choir', place: 'Beneath Frostmere', backdrop: 'frostmere-below', region: 'ironspire', dark: true,
    spawns: [IRON('rime-wraith', 4, { variant: 'choir' }), IRON('rime-wraith', 4, { variant: 'choir' }), IRON('rime-wraith', 4, { variant: 'choir' })],
    text: 'Three drowned monks singing the same note, over and over, under the ice.',
  },
  'rime-abbot': {
    id: 'rime-abbot', type: 'fight', name: 'The Rime-Abbot', place: 'Beneath Frostmere', backdrop: 'frostmere-below', region: 'ironspire',
    brand: 'brand-of-frost', dark: true,
    spawns: [IRON('rime-abbot', 7, { omens: ['frenzied', 'swift'], wakeOmenCap: 0 })],
    text: 'Brother Aurel, who went down to listen to Hush and did not come up. The Crozier in his hand, the Cowl on his head. Break them both.',
  },

  // ---- M6: the Gloomfen Marsh (spec §2.5, §3.3; owner P4). Levels are Waking-0 levels: a player arrives at Waking 6
  // (every earlier Brand is held) and meets the Deep half (past the long boardwalk) at Waking 7, after the Brand of
  // Lanterns. Every foe that is not rabble is a GLOOM spawn (4 levels per Waking: +24 on arrival, +28 after the first
  // Brand); rabble climb the usual 2. Hodge and Tamsin are levelled on the party instead. Each fight's backdrop is its
  // map's (spec §6.2). Tuned in M6 with tools/sim.mjs (docs/RULES.md §12, M6).
  'reed-shrine': {
    id: 'reed-shrine', type: 'hearthfire', name: 'The Reed Shrine', place: 'The Murkway', backdrop: 'murkway', region: 'gloomfen',
    text: 'A shrine of bound reeds on a hummock above the bog, with a lamp the Willowmurk folk keep lit.',
  },
  'willow-hearth': {
    id: 'willow-hearth', type: 'hearthfire', name: 'The Willow Hearth', place: 'Willowmurk', backdrop: 'willowmurk', region: 'gloomfen',
    text: 'The moot-fire of Willowmurk, under the oldest willow in the fen.',
  },
  'toll-lamp': {
    id: 'toll-lamp', type: 'hearthfire', name: 'The Toll-Lamp', place: 'Rotbridge', backdrop: 'rotbridge', region: 'gloomfen',
    text: 'A lamp-post fire by the road at the east end of Rotbridge. Hodge says it is free. So far.',
  },
  'stilt-hearth': {
    id: 'stilt-hearth', type: 'hearthfire', name: 'The Stilt Hearth', place: 'Bogmire', backdrop: 'bogmire', region: 'gloomfen',
    text: 'A fire in an iron pan on the planks of Bogmire\'s market square, well away from the stilts.',
  },
  'fen-cairn': {
    id: 'fen-cairn', type: 'hearthfire', name: 'The Fen Cairn', place: 'The Lanternfen', backdrop: 'lanternfen', region: 'gloomfen',
    text: 'A cairn on a hummock in the eastern bogs, its fire-bowl full of black water.',
  },
  'bell-hearth': {
    id: 'bell-hearth', type: 'hearthfire', name: 'The Belltower Fire', place: 'The Misthollow Ruins', backdrop: 'misthollow', region: 'gloomfen',
    text: 'A fire-bowl in a dry belfry above the drowned streets, cold since the city sank.',
  },
  'wreck-fire': {
    id: 'wreck-fire', type: 'hearthfire', name: 'The Wreck Fire', place: 'The Blackwater Reach', backdrop: 'blackwater-reach', region: 'gloomfen',
    text: 'A fire-pit in a beached hull on the Reach, the planks still wet.',
  },
  'flats-beacon': {
    id: 'flats-beacon', type: 'hearthfire', name: 'The Flats Beacon', place: 'The Tidal Flats', backdrop: 'tidal-flats', region: 'gloomfen',
    text: 'The Tallymen\'s beacon on the Tidal Flats, burning for barges that come up from the sea.',
  },
  'mk-leeches': {
    id: 'mk-leeches', type: 'fight', name: 'Leeches in the Ford', place: 'The Murkway', backdrop: 'murkway', region: 'gloomfen',
    spawns: [GLOOM_R('mire-leech', 16), GLOOM_R('mire-leech', 16), GLOOM_R('mire-leech', 16)],
    text: 'A ford of the safe path, black and knee-deep, and the leeches that lie in it waiting for knees.',
  },
  'mk-reedcutters': {
    id: 'mk-reedcutters', type: 'fight', name: 'The Reed-Cutters', place: 'The Murkway', backdrop: 'murkway', region: 'gloomfen',
    spawns: [GLOOM_R('smuggler', 16, { variant: 'reedcutter' }), GLOOM_R('smuggler', 16, { variant: 'reedcutter' }), GLOOM('tallyman', 5)],
    text: 'Tallymen cutting a road of their own through the reeds, with a chain across the safe path and a clerk to count who passes.',
  },
  'mk-bogfolk': {
    id: 'mk-bogfolk', type: 'fight', name: 'Bogfolk', place: 'The Murkway', backdrop: 'murkway', region: 'gloomfen',
    spawns: [GLOOM_R('boglurcher', 15), GLOOM_R('boglurcher', 15), GLOOM_R('boglurcher', 15)],
    text: 'Boglurchers in a side pool, arguing with the frogs.',
  },
  'wm-wights': {
    id: 'wm-wights', type: 'fight', name: 'The Broken Ward-Gate', place: 'Willowmurk', backdrop: 'willowmurk', region: 'gloomfen',
    spawns: [GLOOM('willow-wight', 5), GLOOM('willow-wight', 5)],
    text: 'Willow-wights crowding the west road where the ward-stones have gone dark, weeping as they come.',
  },
  'wm-willow': {
    id: 'wm-willow', type: 'fight', name: 'Grandfather Willow', place: 'Willowmurk', backdrop: 'willowmurk', region: 'gloomfen',
    spawns: [GLOOM('willow-wight', 8, { variant: 'grandfather', relic: 'weeping-bow', name: 'Grandfather Willow', omens: ['frenzied', 'swift'], wakeOmenCap: 0 }), GLOOM('willow-wight', 5)],
    text: 'The oldest willow outside the wards, walking, with a bow strung with its own hair. Where it goes, the wards go dark.',
  },
  // Hodge (spec A11, §3.5): party level + 6, three chosen Omens with Frenzied among them. Fought once, and only from his
  // toll dialogue ("Refuse, and make him move."); a win lifts the bar (beaten: hodge).
  hodge: {
    id: 'hodge', type: 'fight', name: 'Hodge', place: 'Rotbridge', backdrop: 'rotbridge', region: 'gloomfen',
    once: true, talk: 'hodge-toll',
    spawns: [S('hodge', 'party', { partyDelta: 6, gearTier: 3, noWaking: true, relic: 'unfair-toll', name: 'Hodge', omens: ['frenzied', 'swift', 'ironclad'] })],
    text: 'Hodge, who is not actually a troll, and would like that noted. You refused his toll. This is a terrible idea.',
  },
  'tamsin-rotbridge': {
    id: 'tamsin-rotbridge', type: 'fight', name: 'Tamsin on Rotbridge', place: 'Rotbridge', backdrop: 'rotbridge', region: 'gloomfen',
    once: true, duel: true, yields: 'tamsin-yielded-4', talk: 'tamsin-rotbridge',
    // after her fall she sails off on the black barge, a yield or not: gone from Rotbridge for good (rules/world.js)
    leaves: { flag: 'tamsin-fallen' },
    // Her Rotbridge kit (data/rivals.js RIVAL_KITS[rival].rotbridge), the kindled look (gear tier 4) and the Bogstriders
    // she wears, which drop when you win (spec §3.5, §4.3; a yield's scene has her leave them behind)
    spawns: [S('tamsin', 'party', { partyDelta: 4, gearTier: 4, omens: ['swift', 'ironclad', 'thornskinned'], variant: '$rival:rotbridge', relic: '$rival', lend: true, noWaking: true, name: 'Tamsin', wears: 'bogstriders' })],
    text: 'Tamsin on the bridge, a month in the fen behind her and a letter with soot on the seal in her pocket. Losing is a yield.',
  },
  'rb-gars': {
    id: 'rb-gars', type: 'fight', name: 'Gars under the Bridge', place: 'Rotbridge', backdrop: 'rotbridge', region: 'gloomfen',
    spawns: [GLOOM_R('blackwater-gar', 16), GLOOM_R('blackwater-gar', 16), GLOOM_R('blackwater-gar', 16)],
    text: 'Gars in the shallows below Rotbridge, waiting for something to fall in.',
  },
  'lf-moths': {
    id: 'lf-moths', type: 'fight', name: 'The Moths', place: 'The Lanternfen', backdrop: 'lanternfen', region: 'gloomfen',
    spawns: [GLOOM_R('lamp-moth', 17), GLOOM_R('lamp-moth', 17), GLOOM_R('lamp-moth', 17), GLOOM_R('lamp-moth', 17)],
    text: 'A cloud of lamp-moths over the road, all flying the same way: east, toward a light in the drowned grove.',
  },
  'lf-hags': {
    id: 'lf-hags', type: 'fight', name: 'The Hags\' Pot', place: 'The Lanternfen', backdrop: 'lanternfen', region: 'gloomfen',
    spawns: [GLOOM('bog-hag', 6), GLOOM('bog-hag', 6), GLOOM_R('mire-leech', 17)],
    text: 'Two bog-hags at a pot in the middle of the road, and something in the pot that is still moving.',
  },
  'lf-lights': {
    id: 'lf-lights', type: 'fight', name: 'Marsh-Lights', place: 'The Lanternfen', backdrop: 'lanternfen', region: 'gloomfen',
    spawns: [GLOOM_R('marsh-light', 16), GLOOM_R('marsh-light', 16), GLOOM_R('marsh-light', 16)],
    text: 'Lights over the water. The locals know better than to follow them.',
  },
  'grue-hollow': {
    id: 'grue-hollow', type: 'fight', name: 'Mother Grue\'s Hollow', place: 'The Lanternfen', backdrop: 'lanternfen', region: 'gloomfen',
    spawns: [GLOOM('bog-hag', 12, { variant: 'grue', relic: 'hag-stone', name: 'Mother Grue', omens: ['frenzied', 'swift'], wakeOmenCap: 0 }), GLOOM('bog-hag', 6)],
    text: 'A sunken hut behind a ring of hung stones, and Mother Grue at her pot with a holed stone on her finger.',
  },
  'lantern-mother': {
    id: 'lantern-mother', type: 'fight', name: 'The Mother\'s Hollow', place: 'The Mother\'s Hollow', backdrop: 'mothers-hollow', region: 'gloomfen',
    brand: 'brand-of-lanterns', dark: true,
    spawns: [GLOOM('lantern-mother', 9, { omens: ['frenzied', 'swift', 'ironclad'], wakeOmenCap: 0 })],
    text: 'The Lantern Mother among the sleeping children, with her lantern lit and her veil down. Break them both.',
  },
  'lb-drowned': {
    id: 'lb-drowned', type: 'fight', name: 'The Drowned on the Boardwalk', place: 'The Long Boardwalk', backdrop: 'long-boardwalk', region: 'gloomfen',
    spawns: [GLOOM('drowned', 5), GLOOM('drowned', 5), GLOOM('drowned', 5)],
    text: 'The drowned standing on the boardwalk\'s broken middle with the water running off them, as if they were waiting for a boat.',
  },
  'lb-lights': {
    id: 'lb-lights', type: 'fight', name: 'Lights on the Jetty', place: 'The Long Boardwalk', backdrop: 'long-boardwalk', region: 'gloomfen',
    spawns: [GLOOM_R('marsh-light', 17), GLOOM_R('marsh-light', 17), GLOOM_R('lamp-moth', 17), GLOOM_R('lamp-moth', 17)],
    text: 'Marsh-lights and moths on a side jetty, circling a lamp that is not there.',
  },
  'mh-salvage': {
    id: 'mh-salvage', type: 'fight', name: 'The Salvage Camp', place: 'The Misthollow Ruins', backdrop: 'misthollow', region: 'gloomfen',
    spawns: [GLOOM('tallyman', 4, { variant: 'salvage-master', relic: 'salvagers-helm', name: 'The Salvage-Master', omens: ['ironclad'], wakeOmenCap: 0 }), GLOOM_R('smuggler', 16, { variant: 'diver' }), GLOOM_R('smuggler', 16, { variant: 'diver' })],
    text: 'The Tallymen\'s salvage camp across the old street: cranes, a diving bell, a chain across the way, and a sealed chest on the jetty.',
  },
  'mh-ringers': {
    id: 'mh-ringers', type: 'fight', name: 'The Bell-Ringers', place: 'The Misthollow Ruins', backdrop: 'misthollow', region: 'gloomfen',
    spawns: [GLOOM('drowned', 3, { variant: 'bell-ringer' }), GLOOM('drowned', 3, { variant: 'bell-ringer' }), GLOOM('drowned', 3, { variant: 'bell-ringer' })],
    text: 'The drowned bell-ringers at the water-gate, still ringing bells that are not there.',
  },
  'db-choir': {
    id: 'db-choir', type: 'fight', name: 'The Drowned Choir', place: 'The Drowned Belfry', backdrop: 'drowned-belfry', region: 'gloomfen',
    dark: true,
    spawns: [GLOOM('drowned', 5, { variant: 'choir' }), GLOOM('drowned', 5, { variant: 'choir' }), GLOOM('drowned', 5, { variant: 'choir' })],
    text: 'The drowned choir in its stalls, singing the same hymn it has sung for a thousand years.',
  },
  cantor: {
    id: 'cantor', type: 'fight', name: 'The Drowned Cantor', place: 'The Drowned Belfry', backdrop: 'drowned-belfry', region: 'gloomfen',
    dark: true,
    spawns: [GLOOM('drowned', 10, { variant: 'cantor', relic: 'cantors-staff', name: 'The Drowned Cantor', omens: ['frenzied', 'swift'], wakeOmenCap: 0 }), GLOOM('drowned', 4, { variant: 'choir' }), GLOOM('drowned', 4, { variant: 'choir' })],
    text: 'The choirmaster of Misthollow, beating time with his staff for a song that must not stop.',
  },
  'br-barge': {
    id: 'br-barge', type: 'fight', name: 'The Barge on the Towpath', place: 'The Blackwater Reach', backdrop: 'blackwater-reach', region: 'gloomfen',
    spawns: [GLOOM_R('smuggler', 18, { variant: 'bargehand' }), GLOOM_R('smuggler', 18, { variant: 'bargehand' }), GLOOM_R('smuggler', 18, { variant: 'bargehand' })],
    text: 'A Tallyman barge moored across the towpath, and its crew not minded to move it.',
  },
  'br-gars': {
    id: 'br-gars', type: 'fight', name: 'Gars in the Reach', place: 'The Blackwater Reach', backdrop: 'blackwater-reach', region: 'gloomfen',
    spawns: [GLOOM_R('blackwater-gar', 18), GLOOM_R('blackwater-gar', 18), GLOOM_R('blackwater-gar', 18)],
    text: 'Gars among the sunk boats, feeding on whatever the Leviathan left.',
  },
  'old-jaws': {
    id: 'old-jaws', type: 'fight', name: 'Old Jaws', place: 'The Blackwater Reach', backdrop: 'blackwater-reach', region: 'gloomfen',
    spawns: [GLOOM('blackwater-gar', 5, { variant: 'old-jaws', relic: 'gar-tooth', name: 'Old Jaws', omens: ['frenzied', 'thornskinned'], wakeOmenCap: 0 }), GLOOM_R('blackwater-gar', 17), GLOOM_R('blackwater-gar', 17)],
    text: 'The oldest gar in the Blackwater, in a pool behind the drowned mill. He has a tooth missing. You can have one of the others.',
  },
  'tf-bargemaster': {
    id: 'tf-bargemaster', type: 'fight', name: 'The Barge-Camp', place: 'The Tidal Flats', backdrop: 'tidal-flats', region: 'gloomfen',
    spawns: [GLOOM('tallyman', 5, { variant: 'bargemaster', relic: 'barge-gauntlets', name: 'The Bargemaster', omens: ['ironclad'], wakeOmenCap: 0 }), GLOOM_R('smuggler', 17, { variant: 'bargehand' }), GLOOM_R('smuggler', 17, { variant: 'bargehand' })],
    text: 'The Tallymen\'s barge-camp at the chain-post, where the great chain runs out across the flats into the deep.',
  },
  'blackwater-leviathan': {
    id: 'blackwater-leviathan', type: 'fight', name: 'The Blackwater Leviathan', place: 'The Tidal Flats', backdrop: 'tidal-flats', region: 'gloomfen',
    brand: 'brand-of-the-deep',
    spawns: [GLOOM('blackwater-leviathan', 7, { omens: ['frenzied', 'swift'], wakeOmenCap: 0 })],
    text: 'The thing that lives in the Blackwater, chained by the collar, with a harpoon in its side and a pearl in its brow. Break them both.',
  },
  'cw-lights': {
    id: 'cw-lights', type: 'fight', name: 'Lights on the Causeway', place: 'The Blackwater Causeway', backdrop: 'causeway', region: 'gloomfen',
    spawns: [GLOOM_R('marsh-light', 16), GLOOM_R('marsh-light', 16), GLOOM_R('mire-leech', 16)],
    text: 'Marsh-lights on the reeds by the causeway, where the water-mark still shows.',
  },
});

export const GAUNTLET = Object.freeze([
  'hearthstone-keep', 'keep-vault', 'hearth-road', 'waymarker-stones', 'milestone-fire', 'bramble-toll',
  'verdant-edge', 'rotstag-glade', 'thornhollow', 'tally-camp', 'snag-wallow', 'bramble-deep', 'den-mouth', 'briarmaw-den',
]);

// Optional grinding: rabble patrols per backdrop, at the level of the node you are standing on.
export const PATROLS = deepFreeze({
  'hearth-road': [[S('cutpurse', 0), S('cutpurse', 0), S('thornhound', 0)], [S('thornhound', 0), S('thornhound', 0)]],
  'verdant-wood': [[S('briarling', 0), S('briarling', 0), S('thornhound', 0)], [S('thornhound', 0), S('thornhound', 0), S('cutpurse', 0)]],
  thornhollow: [[S('cutpurse', 0), S('cutpurse', 0), S('briarling', 0)], [S('thornhound', 0), S('briarling', 0), S('briarling', 0)]],
  'briarmaw-den': [[S('briarling', 0), S('briarling', 0), S('briarling', 0)], [S('thornhound', 0), S('briarling', 0), S('thornhound', 0)]],
  // M3 zone patrols (ZONES in data/world.js pick the set and the level)
  mossfall: [[S('smuggler', 0), S('smuggler', 0), S('boglurcher', 0)], [S('boglurcher', 0), S('boglurcher', 0)]],
  hindwood: [[S('glowcap', 0), S('glowcap', 0), S('thornhound', 0)], [S('thornhound', 0), S('thornhound', 0), S('briarling', 0)]],
  heartroot: [[S('rotgrub', 0), S('rotgrub', 0), S('rotgrub', 0)], [S('rotgrub', 0), S('rotgrub', 0), S('glowcap', 0)]],
  // M4: the Sunscorch zones (spec §2.6). Rabble only, as in M3: skinks, scavengers and smugglers;
  // ZONES in data/world.js pick the set and the Waking-0 level (the Waking adds 2 per Brand).
  'sun-road': [[S('sand-skink', 0), S('sand-skink', 0), S('scavenger', 0)], [S('scavenger', 0), S('scavenger', 0)]],
  'dust-trail': [[S('sand-skink', 0), S('sand-skink', 0), S('sand-skink', 0)], [S('scavenger', 0), S('sand-skink', 0)]],
  'deep-shaft': [[S('smuggler', 0), S('smuggler', 0), S('sand-skink', 0)], [S('scavenger', 0), S('smuggler', 0)]],
  'glass-flats': [[S('scavenger', 0), S('scavenger', 0), S('sand-skink', 0)], [S('sand-skink', 0), S('sand-skink', 0), S('sand-skink', 0)]],
  scorchgate: [[S('scavenger', 0), S('scavenger', 0), S('scavenger', 0)], [S('smuggler', 0), S('scavenger', 0)]],
  // M5: the Ironspire zones (spec §2.6). Rabble only: rime wolves, pass brigands, rocklings, forge-sparks.
  'rockslide-pass': [[IRON_R('rime-wolf', 0), IRON_R('rime-wolf', 0), IRON_R('brigand', 0)], [IRON_R('brigand', 0), IRON_R('brigand', 0)]],
  highfold: [[IRON_R('rime-wolf', 0), IRON_R('rime-wolf', 0)], [IRON_R('rockling', 0), IRON_R('rockling', 0), IRON_R('rime-wolf', 0)]],
  'iron-stair': [[IRON_R('rockling', 0), IRON_R('rockling', 0), IRON_R('brigand', 0)], [IRON_R('brigand', 0), IRON_R('rockling', 0)]],
  deeps: [[IRON_R('rockling', 0), IRON_R('rockling', 0), IRON_R('forge-spark', 0)], [IRON_R('forge-spark', 0), IRON_R('forge-spark', 0), IRON_R('rockling', 0)]],
  'frost-road': [[IRON_R('rime-wolf', 0), IRON_R('rime-wolf', 0), IRON_R('brigand', 0)], [IRON_R('rime-wolf', 0), IRON_R('rime-wolf', 0), IRON_R('rime-wolf', 0)]],
  frostmere: [[IRON_R('rime-wolf', 0), IRON_R('rime-wolf', 0)], [IRON_R('rockling', 0), IRON_R('rime-wolf', 0), IRON_R('rime-wolf', 0)]],
  // M6: the Gloomfen zones (spec §2.6). Rabble only: mire leeches, boglurchers, lamp-moths, marsh-lights, gars.
  murkway: [[GLOOM_R('mire-leech', 0), GLOOM_R('mire-leech', 0), GLOOM_R('boglurcher', 0)], [GLOOM_R('boglurcher', 0), GLOOM_R('boglurcher', 0)]],
  lanternfen: [[GLOOM_R('lamp-moth', 0), GLOOM_R('lamp-moth', 0), GLOOM_R('marsh-light', 0)], [GLOOM_R('marsh-light', 0), GLOOM_R('marsh-light', 0)]],
  boardwalk: [[GLOOM_R('marsh-light', 0), GLOOM_R('marsh-light', 0), GLOOM_R('mire-leech', 0)], [GLOOM_R('mire-leech', 0), GLOOM_R('mire-leech', 0)]],
  misthollow: [[GLOOM_R('marsh-light', 0), GLOOM_R('lamp-moth', 0), GLOOM_R('lamp-moth', 0)], [GLOOM_R('marsh-light', 0), GLOOM_R('marsh-light', 0)]],
  blackwater: [[GLOOM_R('blackwater-gar', 0), GLOOM_R('blackwater-gar', 0), GLOOM_R('mire-leech', 0)], [GLOOM_R('blackwater-gar', 0), GLOOM_R('blackwater-gar', 0)]],
  'tidal-flats': [[GLOOM_R('blackwater-gar', 0), GLOOM_R('mire-leech', 0), GLOOM_R('mire-leech', 0)], [GLOOM_R('blackwater-gar', 0), GLOOM_R('blackwater-gar', 0), GLOOM_R('blackwater-gar', 0)]],
  causeway: [[GLOOM_R('marsh-light', 0), GLOOM_R('mire-leech', 0)], [GLOOM_R('mire-leech', 0), GLOOM_R('mire-leech', 0), GLOOM_R('marsh-light', 0)]],
});

export const BRANDS = deepFreeze({
  'brand-of-briars': { id: 'brand-of-briars', name: 'The Brand of Briars', from: 'briarmaw', region: 'verdant', text: 'One coal of the hearth relights. The world wakes one notch.' },
  'brand-of-the-heartroot': { id: 'brand-of-the-heartroot', name: 'The Brand of the Heartroot', from: 'rotwarden', region: 'verdant', text: 'A second coal relights, green at the heart. The world wakes another notch.' },
  // M4 (spec §3.3)
  'brand-of-glass': { id: 'brand-of-glass', name: 'The Brand of Glass', from: 'kharzul', region: 'sunscorch', text: 'A third coal relights, clear as glass. The whole world wakes another notch.' },
  'brand-of-ash': { id: 'brand-of-ash', name: 'The Brand of Ash', from: 'ashen-warden', region: 'sunscorch', text: 'A fourth coal relights, grey and hot. The Sunscorch is yours, and the world wakes again.' },
  // M5 (spec §3.3)
  'brand-of-iron': { id: 'brand-of-iron', name: 'The Brand of Iron', from: 'mother-anvil', region: 'ironspire', text: 'A fifth coal relights, dull red like iron in the forge. The world wakes another notch.' },
  'brand-of-frost': { id: 'brand-of-frost', name: 'The Brand of Frost', from: 'rime-abbot', region: 'ironspire', text: 'A sixth coal relights, blue at the heart. The Ironspire is yours, and under the ice something turns over.' },
  // M6 (spec §3.3): the seventh and eighth coals; with both, earnBrand sets gloomfen-complete (the fourth council)
  'brand-of-lanterns': { id: 'brand-of-lanterns', name: 'The Brand of Lanterns', from: 'lantern-mother', region: 'gloomfen', text: 'A seventh coal relights, soft and gold like a lamp in a window. The world wakes another notch.' },
  'brand-of-the-deep': { id: 'brand-of-the-deep', name: 'The Brand of the Deep', from: 'blackwater-leviathan', region: 'gloomfen', text: 'The eighth coal relights, black-green at the heart. Every coal is lit, and the whole world wakes.' },
});
