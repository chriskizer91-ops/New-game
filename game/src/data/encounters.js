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
  'mossfall', 'mosswatch', 'fawnrest', 'eldergrove', 'heartroot']); // M3 adds the last five

const S = (family, level, o = {}) => ({ family, level, gearTier: 0, omens: [], ...o });

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
    spawns: [S('mirelord', 5), S('boglurcher', 8), S('boglurcher', 8)],
    text: 'Gorrow the Mire-King sits in the drowned shrine, and the Mire Pearl glows in his crown of reeds.',
  },
  'mw-stair': {
    id: 'mw-stair', type: 'fight', name: 'The Tower Stair', place: 'Mosswatch Tower', backdrop: 'mosswatch', region: 'verdant',
    spawns: [S('tallyman', 4), S('smuggler', 7), S('smuggler', 7)],
    text: 'Someone has been carrying crates up the watchtower stair. They would rather you did not ask what.',
  },
  'mw-lantern': {
    id: 'mw-lantern', type: 'fight', name: 'The Lamp Room', place: 'Mosswatch Tower', backdrop: 'mosswatch', region: 'verdant', dark: true,
    spawns: [S('tallyman', 5, { variant: 'signalmaster', relic: 'mosswatch-lantern', name: 'Hollis Fairweight' }), S('tallyman', 4)],
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
    spawns: [S('gloamwing', 5)],
    text: 'Pale trees, pale silk, and a moth the size of a cart. The Fawnrest bell hums on its thorax.',
  },
  'vesper-stall': {
    id: 'vesper-stall', type: 'fight', name: 'Vesper\'s Stall', place: 'Fawnrest Shrine', backdrop: 'fawnrest', region: 'verdant', once: true, talk: 'vesper',
    spawns: [S('tallyman', 5, { variant: 'apothecary', name: 'Vesper' }), S('smuggler', 8), S('smuggler', 8)],
    text: 'Miracle sap, a silver the thimble. The pilgrims queue for it. The pilgrims cough.',
  },
  'grove-circle': {
    id: 'grove-circle', type: 'fight', name: 'The Grove Circle', place: 'Eldergrove', backdrop: 'eldergrove', region: 'verdant',
    spawns: [S('feral-druid', 5, { variant: 'thornmother', relic: 'rootsong', name: 'Oda the Thornmother' }), S('feral-druid', 4), S('briarling', 8)],
    text: 'Oda the Thornmother sings in the stone ring, and Rootsong answers her instead of the trees.',
  },
  'tamsin-duel': {
    id: 'tamsin-duel', type: 'fight', name: 'Tamsin at the Eldest Tree', place: 'Eldergrove', backdrop: 'eldergrove', region: 'verdant',
    once: true, duel: true, yields: 'tamsin-yielded', talk: 'tamsin-door',
    spawns: [S('tamsin', 'party', { partyDelta: 1, variant: '$rival', relic: '$rival', lend: true, wears: 'vale-gauntlets', noWaking: true, name: 'Tamsin' })],
    text: 'Tamsin, at the Eldest Tree door, with the starter you did not choose. Losing is a yield.',
  },
  'hr1-grubs': {
    id: 'hr1-grubs', type: 'fight', name: 'Rotgrub Nest', place: 'The Heartroot', backdrop: 'heartroot', region: 'verdant',
    spawns: [S('rotgrub', 8), S('rotgrub', 8), S('rotgrub', 8)],
    text: 'The root-mulch moves. Then it bites.',
  },
  'hr1-sapwight': {
    id: 'hr1-sapwight', type: 'fight', name: 'The Sapwight', place: 'The Heartroot', backdrop: 'heartroot', region: 'verdant',
    spawns: [S('sapwight', 5), S('rotgrub', 8), S('rotgrub', 8)],
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
    spawns: [S('rotwarden', 7)],
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
});

export const BRANDS = deepFreeze({
  'brand-of-briars': { id: 'brand-of-briars', name: 'The Brand of Briars', from: 'briarmaw', region: 'verdant', text: 'One coal of the hearth relights. The world wakes one notch.' },
  'brand-of-the-heartroot': { id: 'brand-of-the-heartroot', name: 'The Brand of the Heartroot', from: 'rotwarden', region: 'verdant', text: 'A second coal relights, green at the heart. The world wakes another notch.' },
});
