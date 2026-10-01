// Thareia (T2): Chapter 1's fights and fires (design/09-t2-spec.md 5), merged into data/encounters.js. Owner: T.
// C1_ENCOUNTERS[id]: format as data/thareia/encounters.js (every C1 hearthfire needs a { type: 'hearthfire' } entry here,
// its id in C1_HEARTH_IDS and its stand in c1-world.js C1_HEARTHS). C1_PATROLS[setKey] = [[spawn, ...], ...] (merged
// into PATROLS; C1_ZONES pick the set).
//
// Every spawn uses the T1 helper S() (no Waking, gear tier 0 unless set). XP is the tier's XP x level summed over the
// spawns (rabble 7, veteran 16, relic-bearer 48, champion 110), checked in test/c1-fights.test.mjs with buildFoe.
// Fields the rules do not read, kept for the maps' owner and the tests (the map entity carries the real mode and talk):
//   mode      'story' (started by dialogue or a trigger), 'block', 'lair' or 'pack', as on the map
//   main      on the main path (the sim fights it; the solo rule applies before Taela joins)
//   optional  off the main path
//   hard      a lair to come back to ("Come back with someone at your back.")
// The tallyman family is used for its numbers only: every tallyman spawn has a Thareia variant and a name, so no
// line of the family shows (data/foes.js runner, th-signalmaster, th-apothecary).
const S = (family, level, o = {}) => ({ family, level, gearTier: 0, omens: [], noWaking: true, ...o });

// the solo stretch (before Taela joins): the softer kin of the Wilds' rabble, same levels and XP (data/foes.js)
const RAT = (level, o = {}) => S('cutpurse', level, { variant: 'road-rat', name: 'Road-Rat', ...o });
const WILD = (family, level, o = {}) => S(family, level, { variant: 'wild', ...o });
// Chapter 1's party is two: the grubs, leeches and sapwights of the Heartroot and the node hit softer at the same level
const TH = (family, level, o = {}) => S(family, level, { variant: 'th', ...o });

const WILDS = 'The Thornway';
const fire = (id, name, place, backdrop, text) => ({ id, type: 'hearthfire', name, place, backdrop, text });
const fight = (id, name, place, backdrop, o) => ({ id, type: 'fight', name, place, backdrop, region: 'verdant', ...o });

export const C1_ENCOUNTERS = {
  // ---- the landing and the Thornway (solo: at most 2 foes, none above level 4) ----------------------------------
  'c1-landing': fight('c1-landing', 'Road-Rats at the Crate', 'Thornhollow Landing', 'verdant-wood', {
    mode: 'story', main: true, once: true, gentle: true,
    spawns: [S('cutpurse', 1, { variant: 'road-rat', name: 'Road-Rat' }), S('cutpurse', 1, { variant: 'road-rat', name: 'Road-Rat' })],
    text: 'Two road-rats with knives are sawing at the straps of the split crate. They did not hear you land.',
  }),
  'c1-verdant-edge': fight('c1-verdant-edge', 'The Edge of the Wood', WILDS, 'verdant-wood', {
    mode: 'story', main: true, once: true,
    spawns: [S('briarling', 2, { variant: 'wild' }), S('thornhound', 3, { variant: 'wild' })],
    text: 'The bramble moves against the wind. Something in it has roots that hold like hands.',
  }),
  'c1-runner-camp': fight('c1-runner-camp', 'The Runners\' Barricade', WILDS, 'verdant-wood', {
    mode: 'block', main: true, once: true,
    spawns: [S('tallyman', 3, { variant: 'runner', relic: 'th-crateknife', name: 'Crate-Runner' }), S('cutpurse', 3, { variant: 'road-rat', name: 'Road-Rat' })],
    text: 'Carts and rope across the road, and a crate-runner with a knife made for cutting straps.',
  }),
  'c1-bramble-deep': fight('c1-bramble-deep', 'The Bramble-Deep', WILDS, 'verdant-wood', {
    mode: 'block', main: true, once: true,
    spawns: [S('bandit', 4, { variant: 'boot-thief', gearTier: 1, wears: 'thornwatch-boots' }), S('briarling', 3, { variant: 'wild' })],
    text: 'A bandit waits where the thorns are thickest. He is wearing good ranger boots that are not his.',
  }),
  'c1-snag-wallow': fight('c1-snag-wallow', 'Old Snag\'s Wallow', WILDS, 'verdant-wood', {
    mode: 'lair', optional: true, hard: true, once: true,
    spawns: [S('oldsnag', 6)],
    text: 'A boar the size of a cart, with a hatchet in its shoulder. Come back with someone at your back.',
  }),

  // ---- Eldergrove and the Heartroot ------------------------------------------------------------------------------
  'c1-grove-circle': fight('c1-grove-circle', 'The Grove Circle', 'Eldergrove', 'eldergrove', {
    mode: 'lair', main: true, once: true,
    spawns: [S('feral-druid', 5, { variant: 'thornmother', relic: 'rootsong', name: 'Oda the Thornmother' }), WILD('briarling', 4)],
    text: 'Oda the Thornmother stands in the stone ring with a torch. The oldest roots are soaked in lamp oil.',
  }),
  'c1-roots-grubs': fight('c1-roots-grubs', 'Rotgrub Nest', 'The Heartroot', 'heartroot', {
    mode: 'block', main: true, once: true,
    spawns: [TH('rotgrub', 7), TH('rotgrub', 7), TH('rotgrub', 7)],
    text: 'The black mulch under the roots moves. Then it bites.',
  }),
  'c1-roots-sapwight': fight('c1-roots-sapwight', 'The Sapwight', 'The Heartroot', 'heartroot', {
    mode: 'block', main: true, once: true,
    spawns: [TH('sapwight', 7), TH('rotgrub', 7), TH('rotgrub', 7)],
    text: 'Bark and black sap in the shape of a person. It stands in the spring, and the water steams around it.',
  }),
  'c1-missing-patrol': fight('c1-missing-patrol', 'The Missing Patrol', 'The Heartroot', 'heartroot', {
    mode: 'block', optional: true, once: true,
    spawns: [S('hollowed-ranger', 7, { variant: 'vane', gearTier: 1, name: 'Sergeant Edda Vane' }),
      S('hollowed-ranger', 5, { variant: 'thornhollow', gearTier: 1, name: 'Hollowed Ranger' }),
      S('hollowed-ranger', 5, { variant: 'thornhollow', gearTier: 1, name: 'Hollowed Ranger' })],
    text: 'Thornhollow rangers, still in their green. Their eyes are black sap. Edda Vane still gives the orders.',
  }),

  // ---- Mossfall and Mosswatch Tower -------------------------------------------------------------------------------
  'c1-mire-bog': fight('c1-mire-bog', 'The Sucking Bog', 'Mossfall', 'mossfall', {
    mode: 'pack', optional: true,
    spawns: [S('boglurcher', 5), S('boglurcher', 5), S('smuggler', 5, { variant: 'reedcutter', name: 'Reed-Cutter' })],
    text: 'The bog stands up. Twice. A reed-cutter behind it laughs.',
  }),
  'c1-mf-runners': fight('c1-mf-runners', 'Reed-Runners', 'Mossfall', 'mossfall', {
    mode: 'block', optional: true, once: true,
    spawns: [S('smuggler', 5), S('smuggler', 5)],
    text: 'Two runners guard a chain across the ford. They know the dry paths and you do not.',
  }),
  'c1-mire-shrine': fight('c1-mire-shrine', 'The Mire Shrine', 'Mossfall', 'mossfall', {
    mode: 'lair', optional: true, hard: true, once: true,
    spawns: [S('mirelord', 6, { name: 'Gorrow' }), S('boglurcher', 5)],
    text: 'Gorrow sits in the drowned shrine, as wide as a hut. A pearl glows in his crown of reeds.',
  }),
  'c1-mw-stair': fight('c1-mw-stair', 'The Tower Stair', 'Mosswatch Tower', 'mosswatch', {
    mode: 'block', main: true, once: true,
    spawns: [S('tallyman', 7, { variant: 'runner', name: 'Lamp-Runner' }), S('smuggler', 7), S('smuggler', 6)],
    text: 'Crates on Garret\'s stair, and the people who carried them up. They would rather you did not ask what is in them.',
  }),
  'c1-mw-lantern': fight('c1-mw-lantern', 'The Lamp Room', 'Mosswatch Tower', 'mosswatch', {
    mode: 'lair', main: true, once: true, dark: true,
    spawns: [S('tallyman', 8, { variant: 'th-signalmaster', relic: 'mosswatch-lantern', name: 'Hollis Fairweight' }), S('smuggler', 7)],
    text: 'Hollis Fairweight at the parapet, signalling out to sea with the tower\'s own Lantern.',
  }),

  // ---- the fjord cove (S1) --------------------------------------------------------------------------------------
  'c1-fjord-crew': fight('c1-fjord-crew', 'The Cliff Path', 'The Fjord Cove', 'mosswatch', {
    mode: 'block', optional: true, once: true, dark: true,
    spawns: [S('smuggler', 7, { variant: 'diver', name: 'Salvage Diver' }), S('smuggler', 7, { variant: 'bargehand', name: 'Bargehand' }), S('smuggler', 7)],
    text: 'Three of Skeet\'s crew on the cliff path, with a lamp hung low so the sea cannot see it.',
  }),
  'c1-fjord-cove': fight('c1-fjord-cove', 'Skeet\'s Dock', 'The Fjord Cove', 'mosswatch', {
    mode: 'lair', optional: true, once: true, dark: true,
    spawns: [S('smuggler', 8, { variant: 'skeet', relic: 'th-lightfingers', name: 'Skeet Marrow' }), S('smuggler', 7)],
    text: 'Skeet Marrow on the dock by the cave mouth, counting crates. His gloves are worn through at the fingertips.',
  }),
  'c1-fjord-inlet': fight('c1-fjord-inlet', 'The Inlet', 'The Fjord Cove', 'mosswatch', {
    mode: 'lair', optional: true, once: true, dark: true,
    spawns: [S('blackwater-gar', 7), S('blackwater-gar', 7)],
    text: 'Long shapes under the rowing boats. Wenna said to keep clear of the inlet.',
  }),

  // ---- the Hindwood ---------------------------------------------------------------------------------------------
  'c1-glowcaps': fight('c1-glowcaps', 'Glowcap Ring', 'The Hindwood', 'verdant-wood', {
    mode: 'block', main: true, once: true,
    spawns: [S('glowcap', 8), S('glowcap', 8), S('glowcap', 8)],
    text: 'Glowcaps as tall as a child choke the stream. They all turn toward your light.',
  }),
  'c1-feral-druid': fight('c1-feral-druid', 'The Burners\' Camp', 'The Hindwood', 'verdant-wood', {
    mode: 'block', optional: true, once: true, talk: 'c1-burners',
    spawns: [S('feral-druid', 7), S('thornhound', 7, { name: 'Rot-Twisted Hound' }), S('thornhound', 7, { name: 'Rot-Twisted Hound' })],
    text: 'Oda\'s burners, with torches and oil, and two hounds the Rot has bent out of shape.',
  }),
  'c1-gloamwing': fight('c1-gloamwing', 'The Gloamwing\'s Hollow', 'The Hindwood', 'verdant-wood', {
    mode: 'lair', optional: true, once: true,
    spawns: [S('gloamwing', 10)],
    text: 'Pale trees, pale silk, and a moth the size of a cart. A bell hums on its back.',
  }),

  // ---- Fawnrest and the node under it ----------------------------------------------------------------------------
  'c1-vesper': fight('c1-vesper', 'Vesper\'s Stall', 'Fawnrest', 'fawnrest', {
    mode: 'block', optional: true, once: true, talk: 'c1-vesper',
    spawns: [S('tallyman', 7, { variant: 'th-apothecary', name: 'Vesper' }), S('smuggler', 7), S('smuggler', 7)],
    text: 'Miracle sap, one silver a thimble. The pilgrims queue for it. The pilgrims cough.',
  }),
  'c1-node-stair': fight('c1-node-stair', 'The Stair Down', 'Under Fawnrest', 'fawnrest-node', {
    mode: 'block', main: true, once: true,
    spawns: [TH('rotgrub', 9), TH('rotgrub', 9), TH('mire-leech', 9)],
    text: 'Grubs and a fat leech on the stair, in water hot enough to steam.',
  }),
  'c1-node-hall': fight('c1-node-hall', 'The Channel Hall', 'Under Fawnrest', 'fawnrest-node', {
    mode: 'story', main: true, once: true,
    spawns: [S('glowcap', 9), S('glowcap', 9), TH('mire-leech', 9), TH('mire-leech', 9)],
    text: 'The channels are too straight. Glowcaps grow along them, and leeches wait in the warm water.',
  }),
  'c1-node-roots': fight('c1-node-roots', 'The Root Gate', 'Under Fawnrest', 'fawnrest-node', {
    mode: 'block', main: true, once: true,
    spawns: [TH('sapwight', 9), TH('sapwight', 9), TH('rotgrub', 9)],
    text: 'Two sapwights stand in the gate, grown into the roots. Past them, something glows white.',
  }),
  'c1-guardian': fight('c1-guardian', 'The Hart of Fawnrest', 'Under Fawnrest', 'fawnrest-node', {
    mode: 'lair', main: true, once: true, noFlee: true, boss: true,
    spawns: [S('rotstag', 9, { variant: 'guardian', name: 'The Hart of Fawnrest' })],
    text: 'A white hart, grown into the node. A black crown in its antlers. A white-hot stone in its chest.',
  }),

  // ---- after the node (S6) --------------------------------------------------------------------------------------
  'c1-dael-bounty': fight('c1-dael-bounty', 'The Cliff Den', 'The Cliff Den', 'briarmaw-den', {
    mode: 'lair', optional: true, once: true,
    spawns: [S('briarmaw', 10, { variant: 'nameless', relic: 'th-thornwreath', name: 'The Nameless Beast' })],
    text: 'The beast on the rangers\' board that nobody can name. It wears a crown of thorns that grew there.',
  }),

  // ---- the nine fires ---------------------------------------------------------------------------------------------
  'th-tw-hearth': fire('th-tw-hearth', 'The Thornway Stone', WILDS, 'verdant-wood',
    'A standing stone with a fire-bowl on top. The rangers keep it lit for anyone on the road.'),
  'th-eg-hearth': fire('th-eg-hearth', 'Eldergrove Hearth', 'Eldergrove', 'eldergrove',
    'Torches at midday, and a hearth that burns green at the edges.'),
  'th-hr-coal': fire('th-hr-coal', 'The Last Green Coal', 'The Heartroot', 'heartroot',
    'One coal, still green, in a hollow of the roots. It remembers being fire.'),
  'th-mf-cairn': fire('th-mf-cairn', 'Mossfall Cairn', 'Mossfall', 'mossfall',
    'A waystone cairn with a fire-bowl on top. The moss has not touched the bowl.'),
  'th-mw-hearth': fire('th-mw-hearth', 'Garret\'s Kitchen', 'Mosswatch Tower', 'mosswatch',
    'Old Garret\'s kitchen fire, and a kettle that is always on.'),
  'th-mw-fire': fire('th-mw-fire', 'The Mosswatch Fire', 'Mosswatch Tower', 'mosswatch',
    'The tower\'s signal fire. Garret says it has not been lit since the crates came.'),
  'th-hw-cairn': fire('th-hw-cairn', 'Hindwood Cairn', 'The Hindwood', 'verdant-wood',
    'A hunters\' cairn under pale trees. Somebody left kindling, a long time ago.'),
  'th-fr-camp': fire('th-fr-camp', 'The Pilgrims\' Fire', 'Fawnrest', 'fawnrest',
    'The pilgrims\' campfire by the pool. The sick ones sleep close to it.'),
  'th-fr-stone': fire('th-fr-stone', 'The Dreaming Stone', 'Fawnrest', 'fawnrest',
    'A warm stone the pilgrims sleep beside. They say it dreams back.'),
};

// The roaming packs (5.3). Level 0 here: the zone sets the level (ZONES[id].level + 0-1, rules/world.js seedRoamers).
export const C1_PATROLS = {
  // the solo zones meet the solo stretch's softer kin (data/foes.js road-rat, wild)
  'th-landing': [[RAT(0), RAT(0)], [WILD('thornhound', 0)], [WILD('briarling', 0), WILD('briarling', 0)]],
  'th-thornway': [[WILD('briarling', 0), WILD('thornhound', 0)], [RAT(0), WILD('briarling', 0)], [WILD('thornhound', 0), WILD('thornhound', 0)]],
  'th-roots': [[TH('rotgrub', 0), TH('rotgrub', 0), TH('rotgrub', 0)], [TH('rotgrub', 0), TH('rotgrub', 0), TH('mire-leech', 0)], [TH('mire-leech', 0), TH('mire-leech', 0)]],
  'th-mossfall': [[S('smuggler', 0), S('boglurcher', 0)], [S('boglurcher', 0), S('boglurcher', 0)],
    [S('smuggler', 0, { variant: 'reedcutter', name: 'Reed-Cutter' }), S('smuggler', 0), TH('mire-leech', 0)]],
  'th-hindwood': [[S('glowcap', 0), S('glowcap', 0), S('thornhound', 0)], [S('thornhound', 0), S('thornhound', 0), S('briarling', 0)], [S('glowcap', 0), TH('mire-leech', 0)]],
};

export const C1_HEARTH_IDS = ['th-tw-hearth', 'th-eg-hearth', 'th-hr-coal', 'th-mf-cairn', 'th-mw-hearth', 'th-mw-fire', 'th-hw-cairn', 'th-fr-camp', 'th-fr-stone'];
