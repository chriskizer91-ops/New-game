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
// Hearthfires with `cold` start unlit (a cold-hearth lock) in data/world.js HEARTHS and on the map.

import { deepFreeze } from '../core/freeze.js';

export const BACKDROPS = Object.freeze(['hearth-road', 'verdant-wood', 'thornhollow', 'briarmaw-den',
  'mossfall', 'mosswatch', 'fawnrest', 'eldergrove', 'heartroot', // M3 adds the last five
  'sun-road', 'sandspire', 'dust-trail', 'deep-shaft', 'glass-heart', 'glass-flats', 'miragewell', 'scorchgate', 'scorchgate-vaults']); // M4

const S = (family, level, o = {}) => ({ family, level, gearTier: 0, omens: [], ...o });
// M4: a Sunscorch spawn that is not rabble climbs SUN_WAKE levels per Waking instead of 6 (M3 §4.6 wakeLevels).
// A player arrives at Waking 2 and meets the region's second Champion at Waking 3, in whichever order
// they take them; the party gains about four levels between the two Brands, so +4 keeps both halves of
// the region (and both orders) fair, where +6 would need Waking-0 levels below 1 for the second half.
const SUN_WAKE = 4;
const SUN = (family, level, o = {}) => S(family, level, { wakeLevels: SUN_WAKE, ...o });

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
  // arrives at Waking 2 at the earliest (both Verdant Brands open the Keep's south-east gate), so the
  // Waking adds 12 levels to everything but rabble (+4) on arrival and 18 (+6) after the first Sunscorch
  // Brand. They are low on purpose: tuned in Gate 4 with tools/sim.mjs (docs/RULES.md §12, M4).
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
    spawns: [SUN('glass-scorpion', 5, { variant: 'matriarch', name: 'The Aqueduct Matriarch' }), SUN('glass-scorpion', 4), SUN('glass-scorpion', 4)],
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
    spawns: [SUN('tallyman', 4, { variant: 'quartermaster', name: 'The Quartermaster' }), SUN('smuggler', 5, { variant: 'sharpshooter', relic: 'saltglass', name: 'Vell Saltglass' }), S('smuggler', 9)],
    text: 'A Tallyman caravan with a sharpshooter on the lead wagon, and on the last wagon a crate that hums.',
  },
  'gnash-camp': {
    id: 'gnash-camp', type: 'fight', name: 'Gnash\'s Camp', place: 'The Glass Flats', backdrop: 'glass-flats', region: 'sunscorch',
    spawns: [SUN('dune-raider', 5, { variant: 'raider-king', relic: 'dunebreaker', name: 'Gnash the Raider-King' }), SUN('dune-raider', 4), SUN('dune-raider', 4)],
    text: 'Gnash the Raider-King holds court on a throne of glassed sand, with a giant\'s maul across his knees.',
  },
  'wisp-queen': {
    id: 'wisp-queen', type: 'fight', name: 'The Wisp-Queen', place: 'Miragewell', backdrop: 'miragewell', region: 'sunscorch',
    spawns: [SUN('mirage-wisp', 5, { variant: 'queen', relic: 'mirage-glass', name: 'The Wisp-Queen' }), SUN('mirage-wisp', 4), SUN('mirage-wisp', 4)],
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
});

export const BRANDS = deepFreeze({
  'brand-of-briars': { id: 'brand-of-briars', name: 'The Brand of Briars', from: 'briarmaw', region: 'verdant', text: 'One coal of the hearth relights. The world wakes one notch.' },
  'brand-of-the-heartroot': { id: 'brand-of-the-heartroot', name: 'The Brand of the Heartroot', from: 'rotwarden', region: 'verdant', text: 'A second coal relights, green at the heart. The world wakes another notch.' },
  // M4 (spec §3.3)
  'brand-of-glass': { id: 'brand-of-glass', name: 'The Brand of Glass', from: 'kharzul', region: 'sunscorch', text: 'A third coal relights, clear as glass. The whole world wakes another notch.' },
  'brand-of-ash': { id: 'brand-of-ash', name: 'The Brand of Ash', from: 'ashen-warden', region: 'sunscorch', text: 'A fourth coal relights, grey and hot. The Sunscorch is yours, and the world wakes again.' },
});
