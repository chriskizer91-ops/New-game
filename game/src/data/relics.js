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
