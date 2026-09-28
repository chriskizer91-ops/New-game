// The named relics of the Verdant Wilds slice. Rules own stats and powers; src/art owns the
// looks through RELIC_ART[id]. Ids are the shared vocabulary from ARCHITECTURE.md.
//
// weapon:  { dice, dmg, hands, versatile, weight, ability, ranged, extra:[{dice, aspect}] }
// armor:   { base, maxDex, type }   stats: same keys as affixes (resist is { aspect: % })
// grants:  skills usable while equipped      power: the Legend Surge (heirloom and storied)
// grip:    grip meter when a foe holds it (scaled by the holder's level in rules)
// mapPower: field ability for the overworld (not used by battle rules)

import { deepFreeze } from '../core/freeze.js';

export const RELICS = deepFreeze({
  hearthbrand: {
    id: 'hearthbrand', codex: 1, name: 'Hearthbrand', kind: 'sword', slot: 'weapon', aspect: 'ember', rarity: 'heirloom', ilvl: 1,
    holder: 'The Keep reliquary (starter)', starter: true, dormant: true,
    weapon: { dice: '1d8', dmg: 'slash', hands: 1, versatile: '1d10', weight: 0, ability: ['STR', 'DEX'], extra: [{ dice: '1d4', aspect: 'ember' }] },
    stats: { hit: 1, dmg: 1, resist: { ember: 20 } },
    grants: ['kindle-strike'],
    power: {
      id: 'hearthfall', name: 'Hearthfall', target: 'all-enemies',
      text: 'The sword remembers the hearth: 3d8 ember to every foe, and all of them Burn.',
      effects: [{ type: 'damage', dice: '3d8', kind: 'ember', aspect: 'ember', diceEvery: 6, riders: [{ type: 'status', status: 'burning' }] }],
    },
    mapPower: { id: 'kindle', name: 'Kindle', text: 'Lights cold hearths and burns frost-sealed doors open.' },
    lore: 'Forged in the Keep\'s own coals. It had never once gone cold, until the night the hearth flickered.',
  },
  'stillwater-lance': {
    id: 'stillwater-lance', codex: 2, name: 'Stillwater Lance', kind: 'spear', slot: 'weapon', aspect: 'frost', rarity: 'heirloom', ilvl: 1,
    holder: 'The Keep reliquary (starter)', starter: true, dormant: true,
    weapon: { dice: '1d8', dmg: 'pierce', hands: 1, versatile: '1d10', weight: 0, ability: ['STR', 'DEX'], extra: [{ dice: '1d4', aspect: 'frost' }] },
    stats: { hit: 1, dmg: 1, speed: 1, resist: { frost: 20 } },
    grants: ['stillwater-thrust'],
    power: {
      id: 'stillwater', name: 'Stillwater', target: 'enemy',
      text: 'The lake holds its breath: 4d8 frost, and the foe is Frozen solid.',
      effects: [{ type: 'damage', dice: '4d8', kind: 'frost', aspect: 'frost', diceEvery: 6, riders: [{ type: 'status', status: 'frozen' }] }],
    },
    mapPower: { id: 'still-the-water', name: 'Still the Water', text: 'Freezes streams and millraces into bridges.' },
    lore: 'Cut from Frostmere ice the winter the lake held its breath. The point still remembers the stillness.',
  },
  cairnmaul: {
    id: 'cairnmaul', codex: 3, name: 'Cairnmaul', kind: 'hammer', slot: 'weapon', aspect: 'stone', rarity: 'heirloom', ilvl: 1,
    holder: 'The Keep reliquary (starter)', starter: true, dormant: true,
    weapon: { dice: '1d12', dmg: 'crush', hands: 2, weight: 20, ability: ['STR'], extra: [{ dice: '1d4', aspect: 'stone' }] },
    stats: { hit: 1, dmg: 2, gripDmg: 3, hp: 4, resist: { storm: 20 } },
    grants: ['sunder'],
    power: {
      id: 'cairnfall', name: 'Cairnfall', target: 'enemy',
      text: 'A rockslide on a haft: 4d10 crushing, 4d6 grip damage, and the foe Staggers.',
      effects: [{ type: 'damage', dice: '4d10', kind: 'crush', aspect: 'stone', diceEvery: 6, riders: [{ type: 'status', status: 'staggered' }] }, { type: 'grip', dice: '4d6' }],
    },
    mapPower: { id: 'break-the-cairn', name: 'Break the Cairn', text: 'Shatters cracked boulders and clears rockslides.' },
    lore: 'A cairn-stone from the Old Road, bound to an ash haft by a smith who wanted something that would not break. It hasn\'t.',
  },
  'wardens-seal': {
    id: 'wardens-seal', codex: 4, name: 'The Warden\'s Seal', kind: 'amulet', slot: 'amulet', aspect: 'radiant', rarity: 'storied', ilvl: 1,
    holder: 'On the Tallyman thief\'s belt', grip: 10,
    stats: { hp: 5, guard: 1, CHA: 1, resist: { blight: 15 } },
    power: {
      id: 'seal-of-the-keep', name: 'Seal of the Keep', target: 'all-allies',
      text: 'The Keep\'s oath, pressed in light: every ally is Warded for 2d6 + CHA and sheds one harmful status.',
      effects: [{ type: 'status', status: 'warded', value: { dice: '2d6', stat: 'CHA', diceEvery: 5 } }, { type: 'cleanse', harmful: 1 }],
    },
    mapPower: { id: 'wardens-writ', name: 'Warden\'s Writ', text: 'Keep guards and gatekeepers wave you through.' },
    lore: 'Pressed into the wax of every oath the Keep has sworn. The Tallymen wanted it for the oaths, not the silver.',
  },
  tallyknife: {
    id: 'tallyknife', codex: 5, name: 'Tallyknife', kind: 'dagger', slot: 'weapon', aspect: 'blight', rarity: 'storied', ilvl: 4,
    holder: 'Tallyman veterans', grip: 14,
    weapon: { dice: '1d4', dmg: 'pierce', hands: 1, weight: -15, ability: ['STR', 'DEX'], extra: [{ dice: '1d4', aspect: 'blight' }] },
    stats: { hit: 1, crit: 1, speed: 1 },
    grants: ['tally-cut'],
    power: {
      id: 'final-tally', name: 'Final Tally', target: 'enemy',
      text: 'Every debt comes due at once: 3d6 blight and 3 stacks of Poisoned.',
      effects: [{ type: 'damage', dice: '3d6', kind: 'blight', aspect: 'blight', diceEvery: 6, riders: [{ type: 'status', status: 'poisoned', stacks: 3 }] }],
    },
    mapPower: { id: 'cut-the-tally', name: 'Cut the Tally', text: 'Slits Tallyman ledger-seals and opens their strongboxes.' },
    lore: 'Every notch on the spine is a debt. The Tallymen swear it has never once been wrong about what you owe.',
  },
  thornsplitter: {
    id: 'thornsplitter', codex: 6, name: 'Thornsplitter Hatchet', kind: 'axe', slot: 'weapon', aspect: 'verdant', rarity: 'heirloom', ilvl: 5,
    holder: 'Buried in Old Snag\'s hide', grip: 26,
    weapon: { dice: '1d8', dmg: 'slash', hands: 1, weight: 0, ability: ['STR', 'DEX'], extra: [{ dice: '1d6', aspect: 'verdant' }] },
    stats: { hit: 2, dmg: 1, gripDmg: 2 },
    grants: ['hew'],
    power: {
      id: 'cleave-the-wildwood', name: 'Cleave the Wildwood', target: 'all-enemies',
      text: 'One swing clears a road: 2d10 slashing verdant to every foe, and they Stagger.',
      effects: [{ type: 'damage', dice: '2d10', kind: 'slash', aspect: 'verdant', diceEvery: 6, riders: [{ type: 'status', status: 'staggered' }] }],
    },
    mapPower: { id: 'cut-the-thornwall', name: 'Cut the Thornwall', text: 'Cuts through the enchanted thorn walls that close the Verdant roads.' },
    lore: 'A Thornwatch ranger buried it in Old Snag\'s hide and never came back for it. Snag has carried the grudge ever since.',
  },
  'rotwood-circlet': {
    id: 'rotwood-circlet', codex: 7, name: 'Rotwood Circlet', kind: 'circlet', slot: 'head', aspect: 'blight', rarity: 'heirloom', ilvl: 4,
    holder: 'Tangled in the Rot-Stag\'s antlers', grip: 24,
    stats: { mp: 6, WIS: 1, INT: 1, healBonus: 10, resist: { blight: 25 } },
    power: {
      id: 'rot-remembers', name: 'The Rot Remembers', target: 'all-enemies',
      text: 'Black sap answers the crown: 2d8 blight to every foe and 2 stacks of Poisoned.',
      effects: [{ type: 'damage', dice: '2d8', kind: 'blight', aspect: 'blight', diceEvery: 6, riders: [{ type: 'status', status: 'poisoned', stacks: 2 }] }],
    },
    mapPower: { id: 'hear-the-rot', name: 'Hear the Rot', text: 'Reveals the Whispering Rot\'s sap-trails through the eldest trees.' },
    lore: 'Grown, not made: a crown of Eldergrove heartwood gone black at the core. The Rot-Stag wore it like it was born to.',
  },
  'thornwatch-hood': {
    id: 'thornwatch-hood', codex: 8, name: 'Thornwatch Hood', kind: 'hood', slot: 'head', aspect: 'verdant', rarity: 'regalia', ilvl: 3,
    holder: 'Worn by a bandit veteran on the Hearth Road', set: 'thornwatch',
    stats: { speed: 1, hit: 1, resist: { verdant: 15 } },
    mapPower: { id: 'watchful', name: 'Watchful', text: 'Glinting holders show on the map from farther away.' },
    lore: 'Captain Dael\'s rangers wore these when the Thornwatch still had thirty names on its roll. The bandits wear them now.',
  },
  'thornwatch-jerkin': {
    id: 'thornwatch-jerkin', codex: 9, name: 'Thornwatch Jerkin', kind: 'leather', slot: 'body', aspect: 'verdant', rarity: 'regalia', ilvl: 4,
    holder: 'Worn by a bandit veteran at the Tallyman camp', set: 'thornwatch',
    armor: { base: 12, maxDex: 9, type: 'hide' },
    stats: { hp: 6, resist: { verdant: 15 } },
    mapPower: { id: 'thorn-thread', name: 'Thorn-Thread', text: 'Walk through bramble without a scratch.' },
    lore: 'Stitched with thorn-thread that knits itself closed. It has been stabbed more often than anyone who wore it.',
  },
  'thornwatch-boots': {
    id: 'thornwatch-boots', codex: 10, name: 'Thornwatch Boots', kind: 'boots', slot: 'feet', aspect: 'verdant', rarity: 'regalia', ilvl: 5,
    holder: 'Worn by a bandit veteran in the bramble-deep', set: 'thornwatch',
    stats: { speed: 2, guard: 1 },
    mapPower: { id: 'trackless', name: 'Trackless', text: 'Leaves no trail the forest will tell. Weak foes lose your scent.' },
    lore: 'They leave no trail the forest will tell, which is why nobody could say where the last Thornwatch patrol went.',
  },
  thornwreath: {
    id: 'thornwreath', codex: 11, name: 'Thornwreath', kind: 'crown', slot: 'head', aspect: 'verdant', rarity: 'heirloom', ilvl: 7,
    holder: 'Briarmaw\'s breakable thorn-crown', grip: 30,
    stats: { hp: 8, guard: 1, surgeGain: 15, resist: { verdant: 25 } },
    power: {
      id: 'crown-of-briars', name: 'Crown of Briars', target: 'all-enemies',
      text: 'The bramble answers its crown: 2d8 verdant to every foe and all of them are Rooted.',
      effects: [{ type: 'damage', dice: '2d8', kind: 'pierce', aspect: 'verdant', diceEvery: 6, riders: [{ type: 'status', status: 'rooted' }] }],
    },
    mapPower: { id: 'briar-crown', name: 'Briar Crown', text: 'The bramble parts for whoever wears it.' },
    lore: 'It grew around Briarmaw\'s skull the night the hearth flickered, and it has not stopped growing since.',
  },
  briarfang: {
    id: 'briarfang', codex: 12, name: 'Briarfang', kind: 'dagger', slot: 'weapon', aspect: 'verdant', rarity: 'heirloom', ilvl: 7,
    holder: 'Briarmaw\'s breakable fang', grip: 26,
    weapon: { dice: '1d6', dmg: 'pierce', hands: 1, weight: -10, ability: ['STR', 'DEX'], extra: [{ dice: '1d4', aspect: 'verdant' }] },
    stats: { hit: 2, crit: 1, dmg: 1 },
    power: {
      id: 'bleeding-thorn', name: 'Bleeding Thorn', target: 'enemy',
      text: 'The fang goes in and stays in: 3d8 piercing and 3 stacks of Bleeding.',
      effects: [{ type: 'damage', dice: '3d8', kind: 'pierce', aspect: 'verdant', diceEvery: 6, riders: [{ type: 'status', status: 'bleeding', stacks: 3 }] }],
    },
    mapPower: { id: 'bloodtrail', name: 'Bloodtrail', text: 'Follow any wounded beast\'s trail to its lair.' },
    lore: 'A fang the length of a knife and sharp as a debt. Pried loose, it still bleeds.',
  },

  // ---- M3: the twelve new heirlooms of the Verdant Wilds (codex 13-24; spec §3.4) ----------------
  // Minimal valid entries from the scaffold: WP4 owns the final numbers, WP6B the looks.
  lightfingers: {
    id: 'lightfingers', codex: 13, name: 'Lightfingers', kind: 'gloves', slot: 'hands', aspect: 'frost', rarity: 'heirloom', ilvl: 6,
    holder: 'Mags Kestrel, queen of the Smugglers\' Hollow', grip: 20,
    stats: { DEX: 1, gripDmg: 3, speed: 1 },
    power: {
      id: 'sleight-of-hand', name: 'Sleight of Hand', target: 'enemy',
      text: 'Now you see it: 4d6 grip damage, 2d6 frost, and the foe is Chilled.',
      effects: [{ type: 'grip', dice: '4d6' }, { type: 'damage', dice: '2d6', kind: 'frost', aspect: 'frost', diceEvery: 6, riders: [{ type: 'status', status: 'chilled' }] }],
    },
    mapPower: { id: 'lightfingers', name: 'Lightfingers', text: 'Picks Tallyman ledger-seals without a scratch on the wax.' },
    lore: 'Mags Kestrel never once paid a toll in them. The fingertips are worn through from counting other people\'s coin.',
  },
  hartshorn: {
    id: 'hartshorn', codex: 14, name: 'Hartshorn', kind: 'bow', slot: 'weapon', aspect: 'storm', rarity: 'heirloom', ilvl: 10,
    holder: 'Haskett the poacher, on Poacher\'s Holm', grip: 26,
    weapon: { dice: '1d8', dmg: 'pierce', hands: 2, weight: 0, ability: ['DEX'], ranged: true, extra: [{ dice: '1d6', aspect: 'storm' }] },
    stats: { hit: 2 },
    power: {
      id: 'thunder-of-the-hart', name: 'Thunder of the Hart', target: 'all-enemies',
      text: 'The string cracks like a storm: 2d8 storm to every foe, and they Stagger.',
      effects: [{ type: 'damage', dice: '2d8', kind: 'storm', aspect: 'storm', diceEvery: 6, riders: [{ type: 'status', status: 'staggered' }] }],
    },
    mapPower: { id: 'harts-sight', name: 'Hart\'s Sight', text: 'Spots the old rope on every ledge, and hidden caches sparkle.' },
    lore: 'Strung with the sinew of the white hart\'s grandsire. Haskett swears it still pulls toward deer.',
  },
  'mosswatch-lantern': {
    id: 'mosswatch-lantern', codex: 15, name: 'Mosswatch Lantern', kind: 'focus', slot: 'offhand', aspect: 'ember', rarity: 'heirloom', ilvl: 11,
    holder: 'Hollis Fairweight, in the Lamp Room', grip: 22,
    stats: { mp: 6, healBonus: 10, resist: { blight: 15 } },
    power: {
      id: 'signal-fire', name: 'Signal Fire', target: 'all-enemies',
      text: 'The tower\'s old warning, lit at arm\'s length: 2d8 ember to every foe, and they Burn.',
      effects: [{ type: 'damage', dice: '2d8', kind: 'ember', aspect: 'ember', diceEvery: 6, riders: [{ type: 'status', status: 'burning' }] }],
    },
    mapPower: { id: 'lamplight', name: 'Lamplight', text: 'Lights the dark places, and cold hearths catch from it.' },
    lore: 'The watchkeepers carried it up the stair every dusk for three hundred years. Hollis carried it down.',
  },
  'watchkeepers-kettle': {
    id: 'watchkeepers-kettle', codex: 16, name: 'Watchkeeper\'s Kettle', kind: 'kettle', slot: 'head', aspect: 'storm', rarity: 'heirloom', ilvl: 11,
    holder: 'Old Garret of Mosswatch (a contest, or a favour)',
    stats: { guard: 1, hp: 8, WIS: 1 },
    power: {
      id: 'longwatch', name: 'Longwatch', target: 'all-allies',
      text: 'Eyes on the horizon: every ally is Warded for 2d6 and Hasted.',
      effects: [{ type: 'status', status: 'warded', value: { dice: '2d6', diceEvery: 5 } }, { type: 'status', status: 'hasted' }],
    },
    mapPower: { id: 'longwatch', name: 'Longwatch', text: 'From a lookout, marks the chests, locks and holders around on the Atlas.' },
    lore: 'Dented by every hailstorm Mosswatch ever had. Garret says it hums when weather is coming. It does.',
  },
  'mire-pearl': {
    id: 'mire-pearl', codex: 17, name: 'Mire Pearl', kind: 'ring', slot: 'ring', aspect: 'tide', rarity: 'heirloom', ilvl: 11,
    holder: 'Gorrow the Mire-King, in his crown of reeds', grip: 24,
    stats: { hp: 6, regen: 1, resist: { tide: 20, blight: 10 } },
    power: {
      id: 'undertow', name: 'Undertow', target: 'enemy',
      text: 'The marsh pulls: 3d8 tide, and the foe Staggers.',
      effects: [{ type: 'damage', dice: '3d8', kind: 'tide', aspect: 'tide', diceEvery: 6, riders: [{ type: 'status', status: 'staggered' }] }],
    },
    mapPower: { id: 'mirebreath', name: 'Mirebreath', text: 'Breathe easy in black water. Ichor cannot burn you.' },
    lore: 'Grown in the throat of the oldest frog in Mossfall. It is warm, and it is never quite dry.',
  },
  dawnbell: {
    id: 'dawnbell', codex: 18, name: 'Dawnbell', kind: 'mace', slot: 'weapon', aspect: 'radiant', rarity: 'heirloom', ilvl: 11,
    holder: 'Silk-spun on the Gloamwing\'s thorax', grip: 26,
    weapon: { dice: '1d8', dmg: 'crush', hands: 1, weight: 5, ability: ['STR', 'WIS'], extra: [{ dice: '1d6', aspect: 'radiant' }] },
    stats: { healBonus: 10 },
    power: {
      id: 'matins', name: 'Matins', target: 'all-allies',
      text: 'The first bell of morning: every ally heals 2d8 and sheds one harmful status.',
      effects: [{ type: 'heal', dice: '2d8', diceEvery: 5 }, { type: 'cleanse', harmful: 1 }],
    },
    mapPower: { id: 'dawnbell', name: 'Dawnbell', text: 'Weak packs scatter sooner. Rings the Fawnrest bell.' },
    lore: 'The Fawnrest bell, taken off its frame by something with wings. Rung, it brings the deer home.',
  },
  rootsong: {
    id: 'rootsong', codex: 19, name: 'Rootsong', kind: 'staff', slot: 'weapon', aspect: 'tide', rarity: 'heirloom', ilvl: 11,
    holder: 'Oda the Thornmother, in the Grove circle', grip: 26,
    weapon: { dice: '1d6', dmg: 'crush', hands: 2, weight: 0, ability: ['STR', 'INT', 'WIS'], extra: [{ dice: '1d6', aspect: 'tide' }] },
    stats: { mp: 8, INT: 1 },
    power: {
      id: 'rising-sap', name: 'Rising Sap', target: 'all-allies',
      text: 'The old roots sing up through your boots: every ally heals 1d8 and Regenerates 1d8 a turn.',
      effects: [{ type: 'heal', dice: '1d8', diceEvery: 5 }, { type: 'status', status: 'regenerating', value: { dice: '1d8', diceEvery: 6 } }],
    },
    mapPower: { id: 'rootsong', name: 'Rootsong', text: 'Streams part and rot-knots untie for it.' },
    lore: 'A staff of living rowan that the Eldergrove druids sang into shape. Oda sang it into something else.',
  },
  oathshield: {
    id: 'oathshield', codex: 20, name: 'Oathshield', kind: 'shield', slot: 'offhand', aspect: 'stone', rarity: 'heirloom', ilvl: 12,
    holder: 'Sergeant Corra Thistle of the Thornwatch', grip: 28,
    stats: { guard: 2, hp: 6, resist: { blight: 15 } },
    power: {
      id: 'hold-the-line', name: 'Hold the Line', target: 'all-allies',
      text: 'Shoulder to shoulder: every ally is Warded for 3d6.',
      effects: [{ type: 'status', status: 'warded', value: { dice: '3d6', diceEvery: 5 } }],
    },
    mapPower: { id: 'hold-the-line', name: 'Hold the Line', text: 'Ichor cannot reach you through it.' },
    lore: 'Every Thornwatch sergeant swore on it. Corra swore on it last, and meant it longest.',
  },
  'isoldes-oath': {
    id: 'isoldes-oath', codex: 21, name: 'Isolde\'s Oath', kind: 'sword', slot: 'weapon', aspect: 'frost', rarity: 'heirloom', ilvl: 12,
    holder: 'Dun the Counter, at the sap-taps', grip: 28,
    weapon: { dice: '1d8', dmg: 'slash', hands: 1, versatile: '1d10', weight: 0, ability: ['STR', 'DEX'], extra: [{ dice: '1d6', aspect: 'frost' }] },
    stats: { hit: 2 },
    power: {
      id: 'oath-of-winter', name: 'Oath of Winter', target: 'all-enemies',
      text: 'A vow said once and kept: 2d8 frost to every foe and 2 stacks of Chilled.',
      effects: [{ type: 'damage', dice: '2d8', kind: 'frost', aspect: 'frost', diceEvery: 6, riders: [{ type: 'status', status: 'chilled', stacks: 2 }] }],
    },
    mapPower: { id: 'stillness', name: 'Stillness', text: 'Packs that spot you hesitate far longer before they come.' },
    lore: 'The Warden-Commander\'s own blade, pawned the winter the Keep could not pay its rangers. The Tallymen kept the ticket.',
  },
  'ichor-mask': {
    id: 'ichor-mask', codex: 22, name: 'Ichor Mask', kind: 'helm', slot: 'head', aspect: 'blight', rarity: 'heirloom', ilvl: 13,
    holder: 'The Rotwarden\'s breakable smith\'s mask', grip: 32,
    stats: { INT: 1, WIS: 1, resist: { blight: 30 } },
    power: {
      id: 'blacksap', name: 'Blacksap', target: 'all-enemies',
      text: 'The mask weeps: 2d8 blight to every foe and 2 stacks of Poisoned.',
      effects: [{ type: 'damage', dice: '2d8', kind: 'blight', aspect: 'blight', diceEvery: 6, riders: [{ type: 'status', status: 'poisoned', stacks: 2 }] }],
    },
    mapPower: { id: 'ichorsight', name: 'Ichorsight', text: 'Rot-knots open to it, and the sap-trails show.' },
    lore: 'A smith\'s mask with a hammer in a broken ring stamped inside. It was never meant for a face made of bark.',
  },
  'first-seed': {
    id: 'first-seed', codex: 23, name: 'The First Seed', kind: 'amulet', slot: 'amulet', aspect: 'verdant', rarity: 'heirloom', ilvl: 13,
    holder: 'The Rotwarden\'s breakable heart-seed', grip: 28,
    stats: { hp: 10, regenPct: 3, resist: { blight: 20 } },
    power: {
      id: 'greenwake', name: 'Greenwake', target: 'all-allies',
      text: 'Green comes back: every ally heals 3d8 and sheds one harmful status.',
      effects: [{ type: 'heal', dice: '3d8', diceEvery: 5 }, { type: 'cleanse', harmful: 1 }],
    },
    mapPower: { id: 'greenwake', name: 'Greenwake', text: 'Bramble parts and ichor dries where you walk.' },
    lore: 'The seed the Eldest Tree grew from, kept at the root for nine hundred years. It is still, very faintly, alive.',
  },
  'vale-gauntlets': {
    id: 'vale-gauntlets', codex: 24, name: 'Vale Gauntlets', kind: 'gauntlets', slot: 'hands', aspect: 'storm', rarity: 'heirloom', ilvl: 11,
    holder: 'Worn by Tamsin, the Keep\'s other Warden',
    stats: { STR: 1, hit: 1, gripDmg: 2 },
    power: {
      id: 'showing-off', name: 'Showing Off', target: 'enemy',
      text: 'A strike made for an audience: a weapon strike that cannot miss, dice doubled.',
      effects: [{ type: 'attack', weapon: true, autoCrit: true }],
    },
    mapPower: { id: 'name-drop', name: 'Name-Drop', text: 'Gatekeepers remember whose gauntlets these were, and lift the bar.' },
    lore: 'Tamsin\'s, and before that her mother\'s. Every knuckle-plate is engraved with somebody she beat.',
  },
  // ---- M4: Codex Page II, the Sunscorch Wastes (spec §3.4). STUBS from the M4 scaffold: slot, holder
  // and map power are the spec's; WP-foes (P4) writes the real stats, powers, deeds and awakenings. ----
  sandwalkers: {
    id: 'sandwalkers', codex: 25, name: 'Sandwalkers', kind: 'boots', slot: 'feet', aspect: 'storm', rarity: 'heirloom', ilvl: 10,
    holder: 'Rasa the Dune-Rider, at her toll on the Sunward Road', grip: 24,
    stats: { speed: 2, DEX: 1 },
    mapPower: { id: 'sandwalk', name: 'Sandwalk', text: 'Cross quicksand as if it were stone.' },
    lore: 'Stitched from wyrm-hide by a cobbler who never once sank.',
  },
  'zaras-orrery': {
    id: 'zaras-orrery', codex: 26, name: 'The Orrery of Hours', kind: 'amulet', slot: 'amulet', aspect: 'storm', rarity: 'heirloom', ilvl: 11,
    holder: 'In Zara al-Khem\'s humming crate',
    stats: { INT: 1, mp: 6 },
    mapPower: { id: 'star-reckoning', name: 'Star-Reckoning', text: 'Read the true road by the stars: mirages part.' },
    lore: 'It hums the hour it was made in. Zara says that hour has not happened yet.',
  },
  wyrmscale: {
    id: 'wyrmscale', codex: 27, name: 'Wyrmscale', kind: 'shield', slot: 'offhand', aspect: 'stone', rarity: 'heirloom', ilvl: 11,
    holder: 'The Sand Wyrm of the Dust Trail', grip: 28,
    stats: { guard: 2, hp: 6, resist: { stone: 15 } },
    mapPower: { id: 'burrow-sense', name: 'Burrow-Sense', text: 'Feel where the sand is firm: cross quicksand.' },
    lore: 'A single scale off the Sand Wyrm, big enough to hide behind.',
  },
  'sunstone-lantern': {
    id: 'sunstone-lantern', codex: 28, name: 'Sunstone Lantern', kind: 'focus', slot: 'offhand', aspect: 'ember', rarity: 'heirloom', ilvl: 11,
    holder: 'Foreman Brask, deep in the Dusthaven shaft', grip: 24,
    stats: { mp: 6, resist: { frost: 15 } },
    mapPower: { id: 'sunlight', name: 'Sunlight', text: 'Carry a piece of noon underground: darkness lifts and cold hearths catch.' },
    lore: 'A sunstone the size of a fist, caged in brass. It never learned to set.',
  },
  'glass-carapace': {
    id: 'glass-carapace', codex: 29, name: 'The Glass Carapace', kind: 'plate', slot: 'body', aspect: 'stone', rarity: 'heirloom', ilvl: 13,
    holder: 'Grown over Kharzul the Glass Scorpion', grip: 30,
    armor: { base: 16, maxDex: 0, type: 'plate' },
    stats: { hp: 8, resist: { ember: 15 } },
    mapPower: { id: 'mirror-skin', name: 'Mirror-Skin', text: 'The glass shows what is really there: mirages part.' },
    lore: 'Glass that remembers being a dune, and a dune that remembers being fire.',
  },
  dunebreaker: {
    id: 'dunebreaker', codex: 30, name: 'Dunebreaker', kind: 'hammer', slot: 'weapon', aspect: 'stone', rarity: 'heirloom', ilvl: 12,
    holder: 'Gnash the Raider-King, in his camp on the Glass Flats', grip: 30,
    weapon: { dice: '2d6', dmg: 'crush', hands: 2, weight: 30, ability: ['STR'], extra: [{ dice: '1d6', aspect: 'stone' }] },
    stats: { STR: 1, dmg: 1 },
    mapPower: { id: 'shatter-glass', name: 'Shatter Glass', text: 'Break a dune-glass wall in one swing.' },
    lore: 'Gnash says he took it from a giant. The giant says otherwise.',
  },
  cinderfang: {
    id: 'cinderfang', codex: 31, name: 'Cinderfang', kind: 'sword', slot: 'weapon', aspect: 'ember', rarity: 'heirloom', ilvl: 14,
    holder: 'Lodged in the tail of Kharzul the Glass Scorpion', grip: 32,
    weapon: { dice: '2d8', dmg: 'slash', hands: 1, weight: -5, ability: ['STR', 'DEX'], extra: [{ dice: '1d6', aspect: 'ember' }] },
    stats: { DEX: 2, crit: 1, speed: 1 },
    mapPower: { id: 'melt-glass', name: 'Melt Glass', text: 'Melts glassed dune-walls in the Sunscorch.' },
    lore: 'Forged in Scorchgate to kill the dragon that burned it. It failed. It has been warm ever since.',
  },
  'mirage-glass': {
    id: 'mirage-glass', codex: 32, name: 'The Mirage Glass', kind: 'amulet', slot: 'amulet', aspect: 'frost', rarity: 'heirloom', ilvl: 12,
    holder: 'The Wisp-Queen of Miragewell', grip: 26,
    stats: { WIS: 1, resist: { frost: 15 } },
    mapPower: { id: 'see-true', name: 'See True', text: 'Look through the lens: mirages part.' },
    lore: 'A lens of well-water that never spilled. Through it the desert tells the truth.',
  },
  'qasims-signet': {
    id: 'qasims-signet', codex: 33, name: 'Qasim\'s Signet', kind: 'ring', slot: 'ring', aspect: 'frost', rarity: 'heirloom', ilvl: 12,
    holder: 'Cistern Lord Qasim\'s gift',
    stats: { CHA: 1, hp: 5 },
    mapPower: { id: 'cistern-writ', name: 'Cistern Writ', text: 'Gatekeepers of the dry country lift the bar for the Cistern Lord\'s seal.' },
    lore: 'Pressed into every water-tally in Sandspire. It is worth more than the water.',
  },
  'sunstone-heart': {
    id: 'sunstone-heart', codex: 34, name: 'The Sunstone Heart', kind: 'amulet', slot: 'amulet', aspect: 'ember', rarity: 'heirloom', ilvl: 13,
    holder: 'Luma of Dusthaven\'s secret',
    stats: { hp: 8, resist: { ember: 15 } },
    mapPower: { id: 'heartglow', name: 'Heartglow', text: 'Warm enough to light a cold hearth by holding it close.' },
    lore: 'It beats. Luma asks you not to tell anyone that it beats.',
  },
  'scorchgate-key': {
    id: 'scorchgate-key', codex: 35, name: 'The Scorchgate Key', kind: 'ring', slot: 'ring', aspect: 'ember', rarity: 'heirloom', ilvl: 13,
    holder: 'The Ash-Captain of Scorchgate', grip: 26,
    stats: { guard: 1, resist: { ember: 15 } },
    mapPower: { id: 'ashen-key', name: 'Ashen Key', text: 'Opens the vault seals of Scorchgate.' },
    lore: 'A key ring with no key on it. The seal knows it anyway.',
  },
  'ashen-aegis': {
    id: 'ashen-aegis', codex: 36, name: 'The Ashen Aegis', kind: 'shield', slot: 'offhand', aspect: 'ember', rarity: 'heirloom', ilvl: 14,
    holder: 'Borne by the Ashen Warden', grip: 32,
    stats: { guard: 3, hp: 6, resist: { ember: 20 } },
    mapPower: { id: 'ash-ward', name: 'Ash-Ward', text: 'Ash settles over you: ichor cannot touch you.' },
    lore: 'Scorchgate\'s last shield. It was carried out of the fire and never put down.',
  },
  'cinder-crown': {
    id: 'cinder-crown', codex: 37, name: 'The Cinder Crown', kind: 'helm', slot: 'head', aspect: 'ember', rarity: 'heirloom', ilvl: 14,
    holder: 'Worn by the Ashen Warden', grip: 30,
    stats: { hp: 6, CHA: 1, resist: { ember: 15 } },
    mapPower: { id: 'crown-of-embers', name: 'Crown of Embers', text: 'The crown glows: darkness lifts around you.' },
    lore: 'Every ember in it was a soldier of Scorchgate. They still answer to it.',
  },
  saltglass: {
    id: 'saltglass', codex: 38, name: 'Saltglass', kind: 'bow', slot: 'weapon', aspect: 'storm', rarity: 'heirloom', ilvl: 12,
    holder: 'Vell Saltglass, the caravan\'s sharpshooter', grip: 26,
    weapon: { dice: '1d8', dmg: 'pierce', hands: 2, weight: 0, ability: ['DEX'], ranged: true, extra: [{ dice: '1d6', aspect: 'storm' }] },
    stats: { hit: 2 },
    mapPower: { id: 'longsight', name: 'Longsight', text: 'You see holders from much farther away.' },
    lore: 'Strung with salt-cured gut and cut from a glassed dune. It sings when it is drawn.',
  },
});

export const SETS = deepFreeze({
  thornwatch: {
    id: 'thornwatch', name: 'Thornwatch Regalia',
    pieces: ['thornwatch-hood', 'thornwatch-jerkin', 'thornwatch-boots'],
    bonuses: [
      { n: 2, text: 'Regrow 5% of max HP at the start of each turn.', stats: { regenPct: 5 } },
      { n: 3, text: 'Your party can never be ambushed, and you move first: +2 speed.', stats: { speed: 2, ambushImmune: 1 } },
    ],
  },
});

// Minor powers for generated Storied items, picked by the item's aspect (or 'none').
export const STORIED_POWERS = deepFreeze({
  ember: { id: 'last-ember', name: 'Last Ember', target: 'enemy', text: '3d6 ember and Burning.', effects: [{ type: 'damage', dice: '3d6', kind: 'ember', aspect: 'ember', diceEvery: 6, riders: [{ type: 'status', status: 'burning' }] }] },
  frost: { id: 'held-breath', name: 'Held Breath', target: 'enemy', text: '3d6 frost and 2 stacks of Chilled.', effects: [{ type: 'damage', dice: '3d6', kind: 'frost', aspect: 'frost', diceEvery: 6, riders: [{ type: 'status', status: 'chilled', stacks: 2 }] }] },
  storm: { id: 'first-thunder', name: 'First Thunder', target: 'all-enemies', text: '1d12 storm to every foe.', effects: [{ type: 'damage', dice: '1d12', kind: 'storm', aspect: 'storm', diceEvery: 6 }] },
  stone: { id: 'old-road', name: 'The Old Road', target: 'enemy', text: '3d6 crushing, 2d6 grip damage, Staggers.', effects: [{ type: 'damage', dice: '3d6', kind: 'crush', aspect: 'stone', diceEvery: 6, riders: [{ type: 'status', status: 'staggered' }] }, { type: 'grip', dice: '2d6' }] },
  verdant: { id: 'green-return', name: 'The Green Returns', target: 'all-allies', text: 'Every ally Regenerates 1d6 a turn.', effects: [{ type: 'status', status: 'regenerating', value: { dice: '1d6', diceEvery: 6 } }] },
  tide: { id: 'turning-tide', name: 'The Turning Tide', target: 'all-allies', text: 'Every ally heals 1d8 and sheds a harmful status.', effects: [{ type: 'heal', dice: '1d8', diceEvery: 5 }, { type: 'cleanse', harmful: 1 }] },
  radiant: { id: 'lamplight', name: 'Lamplight', target: 'all-allies', text: 'Every ally is Warded for 1d10.', effects: [{ type: 'status', status: 'warded', value: { dice: '1d10', diceEvery: 5 } }] },
  blight: { id: 'slow-rot', name: 'Slow Rot', target: 'enemy', text: '2d6 blight and 3 stacks of Poisoned.', effects: [{ type: 'damage', dice: '2d6', kind: 'blight', aspect: 'blight', diceEvery: 6, riders: [{ type: 'status', status: 'poisoned', stacks: 3 }] }] },
  none: { id: 'told-and-retold', name: 'Told and Retold', target: 'enemy', text: 'A strike from the old stories: 3d8 damage.', effects: [{ type: 'damage', dice: '3d8', kind: 'slash', diceEvery: 6 }] },
});

// The fallback Surge when a hero carries no relic with a power.
export const HEROIC_SURGE = deepFreeze({
  id: 'heroic-strike', name: 'Heroic Strike', target: 'enemy',
  text: 'Everything you have, in one blow: a weapon strike that cannot miss, dice doubled.',
  effects: [{ type: 'attack', weapon: true, autoCrit: true }],
});
