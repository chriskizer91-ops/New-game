// The named relics (Codex Nos. 1-66, and M7's Page V: No. 000 and Nos. 67-74). Rules own stats and powers; src/art owns the looks through
// RELIC_ART[id]. Ids are the shared vocabulary from ARCHITECTURE.md.
//
// weapon:  { dice, dmg, hands, versatile, weight, ability, ranged, extra:[{dice, aspect}] }
// armor:   { base, maxDex, type }   stats: same keys as affixes (resist is { aspect: % })
// grants:  skills usable while equipped      power: the Legend Surge (heirloom and storied)
// grip:    grip meter when a foe holds it (scaled by the holder's level in rules)
// mapPower: field ability for the overworld (not used by battle rules)
//
// M4 (spec §3.4, §4.2-§4.3; owner P4). Every relic also carries:
// sockets: gem sockets at Hilda's forge (0-2; heirlooms default to 1, starters and Champion pieces 2)
// deeds:   exactly three ids from data/deeds.js DEED_IDS. One deed kindles the relic; all three and
//          Hilda's rite awaken it. The relics of the M2 road and the first Brand (Nos. 1-12) wake in Act II:
//          their deeds are untouched (Waking 2+), hundred, settle and rout, so the Verdant keeps the balance
//          it was tuned to (a Kindled relic adds +1 hit, +1 Guard or +5 HP; tools/sim.mjs m2 and direct).
// awaken:  { a: branch, b: branch }, branch = { name, text, stats, power? }. Branch a is the Hand
//          (the bearer's best Domain is physical, combat, survival or beastmastery), b the Heart (craft,
//          knowledge, influence, attunement, psionics). `stats` use the affix stat keys and apply on top
//          of the relic's own. `power`, when given, is merged over the relic's Legend Surge
//          ({ ...relic.power, ...branch.power }: a new text and effects under the same id, name and target).
//          Hand-named for the starters, Cinderfang, the Champions' pieces and every relic of Page V (M7); templated
//          names elsewhere ("the Quick Hand", "the Counting Heart").

import { deepFreeze } from '../core/freeze.js';

const st = (status, o = {}) => ({ type: 'status', status, ...o });
const hand = (word, text, stats, o = {}) => ({ name: `the ${word} Hand`, text, stats, ...o });
const heart = (word, text, stats, o = {}) => ({ name: `the ${word} Heart`, text, stats, ...o });

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
    sockets: 2, deeds: ['untouched', 'settle', 'hundred'],
    awaken: {
      a: {
        name: 'Hearthfang', text: 'The fire learns to bite. +1 to hit and +2 damage, and Hearthfall burns hotter: 4d8 ember to every foe.',
        stats: { hit: 1, dmg: 2 },
        power: { text: 'The hearth bites: 4d8 ember to every foe, and all of them Burn.', effects: [{ type: 'damage', dice: '4d8', kind: 'ember', aspect: 'ember', diceEvery: 6, riders: [st('burning')] }] },
      },
      b: {
        name: 'Keepflame', text: 'The sword remembers every oath sworn by the Keep fire. +20% Legend Surge, +6 MP and 20% frost resist, and Hearthfall wards you as it burns.',
        stats: { surgeGain: 20, mp: 6, resist: { frost: 20 } },
        power: { text: 'The Keep fire answers: 3d8 ember to every foe, all of them Burn, and you are Warded for 2d6.', effects: [{ type: 'damage', dice: '3d8', kind: 'ember', aspect: 'ember', diceEvery: 6, riders: [st('burning')] }, st('warded', { self: true, value: { dice: '2d6', diceEvery: 5 } })] },
      },
    },
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
    sockets: 2, deeds: ['untouched', 'rout', 'hundred'],
    awaken: {
      a: {
        name: 'Rimebreaker', text: 'The point goes in cold and comes out colder. +1 to hit and +1 speed, and Stillwater strikes deeper: 5d8 frost.',
        stats: { hit: 1, speed: 1 },
        power: { text: 'The ice breaks inward: 5d8 frost, and the foe is Frozen solid.', effects: [{ type: 'damage', dice: '5d8', kind: 'frost', aspect: 'frost', diceEvery: 6, riders: [st('frozen')] }] },
      },
      b: {
        name: 'Stillheart', text: 'The lake\'s patience, held in the hand. +20% Legend Surge, +6 MP and 20% ember resist, and Stillwater wards you as the lake closes.',
        stats: { surgeGain: 20, mp: 6, resist: { ember: 20 } },
        power: { text: 'The lake holds its breath: 4d8 frost, the foe is Frozen solid, and you are Warded for 2d6.', effects: [{ type: 'damage', dice: '4d8', kind: 'frost', aspect: 'frost', diceEvery: 6, riders: [st('frozen')] }, st('warded', { self: true, value: { dice: '2d6', diceEvery: 5 } })] },
      },
    },
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
    sockets: 2, deeds: ['settle', 'hundred', 'untouched'],
    awaken: {
      a: {
        name: 'Rockslide', text: 'Every swing brings the hillside with it. +2 damage and +3 grip damage, and Cairnfall breaks 6d6 grip.',
        stats: { dmg: 2, gripDmg: 3 },
        power: { text: 'The whole hillside on a haft: 4d10 crushing, 6d6 grip damage, and the foe Staggers.', effects: [{ type: 'damage', dice: '4d10', kind: 'crush', aspect: 'stone', diceEvery: 6, riders: [st('staggered')] }, { type: 'grip', dice: '6d6' }] },
      },
      b: {
        name: 'Cairnwarden', text: 'The cairn stands over whoever carries it. +2 Guard and +10 HP, and Cairnfall leaves you behind the rubble.',
        stats: { guard: 2, hp: 10 },
        power: { text: 'A rockslide on a haft: 4d10 crushing, 4d6 grip damage, the foe Staggers, and you are Warded for 2d8.', effects: [{ type: 'damage', dice: '4d10', kind: 'crush', aspect: 'stone', diceEvery: 6, riders: [st('staggered')] }, { type: 'grip', dice: '4d6' }, st('warded', { self: true, value: { dice: '2d8', diceEvery: 5 } })] },
      },
    },
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
    sockets: 1, deeds: ['settle', 'untouched', 'rout'],
    awaken: {
      a: hand('Sworn', 'The oath, pressed into the hand that keeps it. +1 STR and +8 HP.', { STR: 1, hp: 8 }),
      b: heart('Witnessing', 'Every oath the Keep ever swore, remembered. +1 CHA, +1 WIS and +10% healing.', { CHA: 1, WIS: 1, healBonus: 10 }),
    },
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
    sockets: 1, deeds: ['settle', 'hundred', 'rout'],
    awaken: {
      a: hand('Quick', 'Every debt collected before it falls due. +1 speed and +1 to hit.', { speed: 1, hit: 1 }),
      b: heart('Counting', 'It keeps the ledger for you now. +4 MP and +2 grip damage.', { mp: 4, gripDmg: 2 }),
    },
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
    sockets: 1, deeds: ['settle', 'hundred', 'rout'],
    awaken: {
      a: hand('Hewing', 'It clears a road wherever you swing it. +1 to hit and +2 damage.', { hit: 1, dmg: 2 }),
      b: heart('Ranger\'s', 'The ranger who buried it comes back for it, in a way. +2 grip damage, +1 WIS and +15% Legend Surge.', { gripDmg: 2, WIS: 1, surgeGain: 15 }),
    },
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
    sockets: 1, deeds: ['untouched', 'settle', 'hundred'],
    awaken: {
      a: hand('Rooted', 'It takes root in you instead of the Rot. +1 CON and +10 HP.', { CON: 1, hp: 10 }),
      b: heart('Clean', 'The rot burns out of the heartwood. +1 WIS, +6 MP and +10% healing.', { WIS: 1, mp: 6, healBonus: 10 }),
    },
  },
  'thornwatch-hood': {
    id: 'thornwatch-hood', codex: 8, name: 'Thornwatch Hood', kind: 'hood', slot: 'head', aspect: 'verdant', rarity: 'regalia', ilvl: 3,
    holder: 'Worn by a bandit veteran on the Hearth Road', set: 'thornwatch',
    stats: { speed: 1, hit: 1, resist: { verdant: 15 } },
    mapPower: { id: 'watchful', name: 'Watchful', text: 'Glinting holders show on the map from farther away.' },
    lore: 'Captain Dael\'s rangers wore these when the Thornwatch still had thirty names on its roll. The bandits wear them now.',
    sockets: 1, deeds: ['rout', 'untouched', 'settle'],
    awaken: {
      a: hand('Watchful', 'A ranger\'s eye under the hood. +1 to hit and +1 speed.', { hit: 1, speed: 1 }),
      b: heart('Patient', 'A ranger\'s patience under the hood. +1 WIS and +6 HP.', { WIS: 1, hp: 6 }),
    },
  },
  'thornwatch-jerkin': {
    id: 'thornwatch-jerkin', codex: 9, name: 'Thornwatch Jerkin', kind: 'leather', slot: 'body', aspect: 'verdant', rarity: 'regalia', ilvl: 4,
    holder: 'Worn by a bandit veteran at the Tallyman camp', set: 'thornwatch',
    armor: { base: 12, maxDex: 9, type: 'hide' },
    stats: { hp: 6, resist: { verdant: 15 } },
    mapPower: { id: 'thorn-thread', name: 'Thorn-Thread', text: 'Walk through bramble without a scratch.' },
    lore: 'Stitched with thorn-thread that knits itself closed. It has been stabbed more often than anyone who wore it.',
    sockets: 1, deeds: ['settle', 'untouched', 'hundred'],
    awaken: {
      a: hand('Thorn-Stitched', 'The thorn-thread pulls tight. +1 Guard and +6 HP.', { guard: 1, hp: 6 }),
      b: heart('Knitting', 'The thorn-thread knits you too: regrow 1 HP a turn and 15% verdant resist.', { regen: 1, resist: { verdant: 15 } }),
    },
  },
  'thornwatch-boots': {
    id: 'thornwatch-boots', codex: 10, name: 'Thornwatch Boots', kind: 'boots', slot: 'feet', aspect: 'verdant', rarity: 'regalia', ilvl: 5,
    holder: 'Worn by a bandit veteran in the bramble-deep', set: 'thornwatch',
    stats: { speed: 2, guard: 1 },
    mapPower: { id: 'trackless', name: 'Trackless', text: 'Leaves no trail the forest will tell. Weak foes lose your scent.' },
    lore: 'They leave no trail the forest will tell, which is why nobody could say where the last Thornwatch patrol went.',
    sockets: 1, deeds: ['rout', 'untouched', 'hundred'],
    awaken: {
      a: hand('Trackless', 'Gone before the forest can tell. +1 speed and +1 DEX.', { speed: 1, DEX: 1 }),
      b: heart('Homeward', 'They always know the way back. +6 HP and +10% Legend Surge.', { hp: 6, surgeGain: 10 }),
    },
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
    sockets: 2, deeds: ['untouched', 'settle', 'hundred'],
    awaken: {
      a: { name: 'The Bramble King', text: 'It grows into a crown that fights. +1 Guard, +1 STR and +8 HP.', stats: { guard: 1, STR: 1, hp: 8 } },
      b: { name: 'The Green Crown', text: 'It grows green again, and so do you: regrow 2 HP a turn and +15% Legend Surge.', stats: { regen: 2, surgeGain: 15 } },
    },
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
    sockets: 2, deeds: ['hundred', 'settle', 'untouched'],
    awaken: {
      a: { name: 'The Long Fang', text: 'It grows to fit the hand. +1 to hit, +1 damage, and a Legend Strike on 17-20.', stats: { hit: 1, dmg: 1, crit: 1 } },
      b: { name: 'The Green Fang', text: 'It draws out the poison it once put in. +2 grip damage, +6 HP and 15% blight resist.', stats: { gripDmg: 2, hp: 6, resist: { blight: 15 } } },
    },
  },

  // ---- M3: the twelve heirlooms of the Verdant Wilds (codex 13-24; spec §3.4) -----------------------
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
    sockets: 1, deeds: ['claim', 'rout', 'fell-holder'],
    awaken: {
      a: hand('Light', 'Quicker than the eye, and the grip. +1 DEX and +2 grip damage.', { DEX: 1, gripDmg: 2 }),
      b: heart('Honest', 'The fingertips grow back. +1 CHA and +4 MP.', { CHA: 1, mp: 4 }),
    },
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
    sockets: 1, deeds: ['legend-strike', 'fell-holder', 'hundred'],
    awaken: {
      a: hand('Steady', 'It never misses the heart. +1 to hit and a Legend Strike on 19-20.', { hit: 1, crit: 1 }),
      b: heart('Hart\'s', 'It pulls toward home now, not deer. +1 WIS and +15% Legend Surge.', { WIS: 1, surgeGain: 15 }),
    },
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
    sockets: 1, deeds: ['surge', 'rout', 'untouched'],
    awaken: {
      a: hand('Signalling', 'A light held out in front, where the fighting is. +1 to hit and 15% ember resist.', { hit: 1, resist: { ember: 15 } }),
      b: heart('Watchkeeping', 'Carried up the stair every dusk, and down again. +6 MP and +10% healing.', { mp: 6, healBonus: 10 }),
    },
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
    sockets: 1, deeds: ['untouched', 'surge', 'settle'],
    awaken: {
      a: hand('Weathered', 'One more dent, and not a scratch on you. +1 Guard and +6 HP.', { guard: 1, hp: 6 }),
      b: heart('Humming', 'It hums the storm before it comes. +1 WIS and 15% storm resist.', { WIS: 1, resist: { storm: 15 } }),
    },
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
    sockets: 1, deeds: ['surge', 'fell-holder', 'untouched'],
    awaken: {
      a: hand('Mire-Strong', 'The oldest frog in Mossfall never once went hungry. +1 CON and +6 HP.', { CON: 1, hp: 6 }),
      b: heart('Deep', 'Still water, deep down. +1 WIS, and regain 1 MP a turn.', { WIS: 1, mpRegen: 1 }),
    },
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
    sockets: 1, deeds: ['first-blood', 'surge', 'rout'],
    awaken: {
      a: hand('Ringing', 'It rings true on every blow. +1 to hit and +1 damage.', { hit: 1, dmg: 1 }),
      b: heart('Morning', 'The first bell of morning, every morning. +1 WIS and +15% healing.', { WIS: 1, healBonus: 15 }),
    },
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
    sockets: 1, deeds: ['surge', 'fell-holder', 'untouched'],
    awaken: {
      a: hand('Singing', 'It hums in the hand when it strikes. +1 STR and +1 to hit.', { STR: 1, hit: 1 }),
      b: heart('Eldergrove', 'Sung back into its first shape by the Eldergrove. +1 INT and +6 MP.', { INT: 1, mp: 6 }),
    },
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
    sockets: 1, deeds: ['untouched', 'settle', 'fell-champion'],
    awaken: {
      a: hand('Sergeant\'s', 'The line holds where you stand. +1 Guard and +8 HP.', { guard: 1, hp: 8 }),
      b: heart('Oath-Keeping', 'Every oath sworn on it, kept. +1 CHA and 15% blight resist.', { CHA: 1, resist: { blight: 15 } }),
    },
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
    sockets: 1, deeds: ['legend-strike', 'settle', 'fell-holder'],
    awaken: {
      a: hand('Redeemed', 'The pawn ticket is torn up. +1 to hit and +2 damage.', { hit: 1, dmg: 2 }),
      b: heart('Remembering', 'It remembers who it was sworn to. +1 CHA and +15% Legend Surge.', { CHA: 1, surgeGain: 15 }),
    },
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
    sockets: 2, deeds: ['surge', 'fell-champion', 'brand'],
    awaken: {
      a: { name: 'The Smith\'s Face', text: 'It fits a human face now, and a smith\'s temper with it. +1 STR, +1 to hit and 15% blight resist.', stats: { STR: 1, hit: 1, resist: { blight: 15 } } },
      b: { name: 'The Clean Mask', text: 'The black sap burns out of it at last. +1 INT, +6 MP and +10% healing.', stats: { INT: 1, mp: 6, healBonus: 10 } },
    },
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
    sockets: 2, deeds: ['fell-champion', 'brand', 'untouched'],
    awaken: {
      a: { name: 'The Deep Root', text: 'It roots, and nothing moves you. +1 CON and +10 HP.', stats: { CON: 1, hp: 10 } },
      b: { name: 'The First Green', text: 'It puts out a leaf. Regrow 2 HP a turn and +10% healing.', stats: { regen: 2, healBonus: 10 } },
    },
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
    sockets: 1, deeds: ['legend-strike', 'claim', 'fell-holder'],
    awaken: {
      a: hand('Showing-Off', 'Every blow made for an audience. +1 STR and +1 to hit.', { STR: 1, hit: 1 }),
      b: heart('Mother\'s', 'Her mother\'s knuckle-plates, and her mother\'s manners. +1 CHA and +2 grip damage.', { CHA: 1, gripDmg: 2 }),
    },
  },

  // ---- M4: Codex Page II, the Sunscorch Wastes (codex 25-38; spec §3.4) -----------------------------
  sandwalkers: {
    id: 'sandwalkers', codex: 25, name: 'Sandwalkers', kind: 'boots', slot: 'feet', aspect: 'storm', rarity: 'heirloom', ilvl: 12,
    holder: 'Rasa the Dune-Rider, at her toll on the Sunward Road', grip: 24,
    stats: { speed: 2, DEX: 1, resist: { storm: 10 } },
    power: {
      id: 'sandstride', name: 'Sandstride', target: 'all-allies',
      text: 'The dunes carry you: every ally is Hasted and shakes off Rooted.',
      effects: [st('hasted'), { type: 'cleanse', statuses: ['rooted'] }],
    },
    mapPower: { id: 'sandwalk', name: 'Sandwalk', text: 'Cross quicksand as if it were stone.' },
    lore: 'Stitched from wyrm-hide by a Sandspire cobbler who never once sank. Rasa has never paid a toll in them either.',
    sockets: 1, deeds: ['first-blood', 'rout', 'untouched'],
    awaken: {
      a: hand('Dune-Running', 'You run the dune crests like a road. +1 speed and +1 DEX.', { speed: 1, DEX: 1 }),
      b: heart('Wayfinding', 'They always find the firm way home. +6 HP and 10% storm resist.', { hp: 6, resist: { storm: 10 } }),
    },
  },
  'zaras-orrery': {
    id: 'zaras-orrery', codex: 26, name: 'The Orrery of Hours', kind: 'amulet', slot: 'amulet', aspect: 'storm', rarity: 'heirloom', ilvl: 12,
    holder: 'In Zara al-Khem\'s humming crate',
    stats: { INT: 1, mp: 6, speed: 1 },
    power: {
      id: 'the-hour-turns', name: 'The Hour Turns', target: 'all-allies',
      text: 'The Orrery chimes an hour that has not happened yet: every ally is Hasted, and every foe\'s next two moves are shown.',
      effects: [st('hasted'), { type: 'reveal', ahead: 2, all: true }],
    },
    mapPower: { id: 'star-reckoning', name: 'Star-Reckoning', text: 'Read the true road by the stars: mirages part.' },
    lore: 'It hums the hour it was made in. Zara says that hour has not happened yet.',
    sockets: 1, deeds: ['surge', 'brand', 'untouched'],
    awaken: {
      a: hand('Punctual', 'Always a heartbeat ahead of the hour. +1 speed and +1 to hit.', { speed: 1, hit: 1 }),
      b: heart('Star-Reading', 'The hours it hums are yours to read. +1 INT and +6 MP.', { INT: 1, mp: 6 }),
    },
  },
  wyrmscale: {
    id: 'wyrmscale', codex: 27, name: 'Wyrmscale', kind: 'shield', slot: 'offhand', aspect: 'stone', rarity: 'heirloom', ilvl: 12,
    holder: 'The Sand Wyrm of the Dust Trail', grip: 34,
    stats: { guard: 2, hp: 8, resist: { stone: 15, ember: 10 } },
    power: {
      id: 'wyrms-shoulder', name: 'Wyrm\'s Shoulder', target: 'enemy',
      text: 'You put the whole scale behind it: 3d8 crushing, 3d6 grip damage, and the foe Staggers.',
      effects: [{ type: 'damage', dice: '3d8', kind: 'crush', aspect: 'stone', diceEvery: 6, riders: [st('staggered')] }, { type: 'grip', dice: '3d6' }],
    },
    mapPower: { id: 'burrow-sense', name: 'Burrow-Sense', text: 'Feel where the sand is firm: cross quicksand.' },
    lore: 'A single scale off the Sand Wyrm, big enough to hide behind. Sand still runs off it like water.',
    sockets: 1, deeds: ['fell-holder', 'settle', 'untouched'],
    awaken: {
      a: hand('Scaled', 'It grows a second scale over the first. +1 Guard and +6 HP.', { guard: 1, hp: 6 }),
      b: heart('Deep-Sand', 'You feel the sand move before it does. +1 WIS and 15% storm resist.', { WIS: 1, resist: { storm: 15 } }),
    },
  },
  'sunstone-lantern': {
    id: 'sunstone-lantern', codex: 28, name: 'Sunstone Lantern', kind: 'focus', slot: 'offhand', aspect: 'ember', rarity: 'heirloom', ilvl: 12,
    holder: 'Foreman Brask, deep in the Dusthaven shaft', grip: 22,
    stats: { mp: 6, healBonus: 10, resist: { frost: 15 } },
    power: {
      id: 'high-noon', name: 'High Noon', target: 'all-enemies',
      text: 'Noon, underground: 2d6 ember to every foe, and in the glare every one of them is Exposed (-2 Guard).',
      effects: [{ type: 'damage', dice: '2d6', kind: 'ember', aspect: 'ember', diceEvery: 6, riders: [st('exposed')] }],
    },
    mapPower: { id: 'sunlight', name: 'Sunlight', text: 'Carry a piece of noon underground: darkness lifts and cold hearths catch.' },
    lore: 'A sunstone the size of a fist, caged in brass. It never learned to set.',
    sockets: 1, deeds: ['surge', 'rout', 'untouched'],
    awaken: {
      a: hand('Sunlit', 'Held up where the fighting is, it never flickers. +1 to hit and 15% frost resist.', { hit: 1, resist: { frost: 15 } }),
      b: heart('Noonday', 'Noon for whoever needs it. +6 MP and +10% healing.', { mp: 6, healBonus: 10 }),
    },
  },
  'glass-carapace': {
    id: 'glass-carapace', codex: 29, name: 'The Glass Carapace', kind: 'plate', slot: 'body', aspect: 'stone', rarity: 'heirloom', ilvl: 14,
    holder: 'Grown over Kharzul the Glass Scorpion (a breakable piece)', grip: 40,
    armor: { base: 16, maxDex: 0, type: 'plate' },
    stats: { hp: 10, speed: -1, resist: { ember: 15, storm: 10 } },
    power: {
      id: 'mirror-shell', name: 'Mirror-Shell', target: 'all-allies',
      text: 'The Carapace throws the light back: every ally is Warded for 2d8, and stops Burning and Bleeding.',
      effects: [st('warded', { value: { dice: '2d8', diceEvery: 5 } }), { type: 'cleanse', statuses: ['burning', 'bleeding'] }],
    },
    mapPower: { id: 'mirror-skin', name: 'Mirror-Skin', text: 'The glass shows what is really there: mirages part.' },
    lore: 'Glass that remembers being a dune, and a dune that remembers being fire.',
    sockets: 2, deeds: ['fell-champion', 'brand', 'untouched'],
    awaken: {
      a: { name: 'Dune-Shell', text: 'Glass that remembers being a dune: it takes the blow and shifts. +1 Guard and +10 HP.', stats: { guard: 1, hp: 10 } },
      b: { name: 'The Mirror Shell', text: 'Glass that remembers being fire: 20% ember resist, +10% Legend Surge, and it no longer slows you.', stats: { resist: { ember: 20 }, surgeGain: 10, speed: 1 } },
    },
  },
  dunebreaker: {
    id: 'dunebreaker', codex: 30, name: 'Dunebreaker', kind: 'hammer', slot: 'weapon', aspect: 'stone', rarity: 'heirloom', ilvl: 13,
    holder: 'Gnash the Raider-King, in his camp on the Glass Flats', grip: 28,
    weapon: { dice: '2d6', dmg: 'crush', hands: 2, weight: 30, ability: ['STR'], extra: [{ dice: '1d6', aspect: 'stone' }] },
    stats: { STR: 1, dmg: 2, gripDmg: 3 },
    power: {
      id: 'break-the-dune', name: 'Break the Dune', target: 'all-enemies',
      text: 'The dune comes down on all of them: 2d10 crushing to every foe, 2d6 grip damage to each, and they Stagger.',
      effects: [{ type: 'damage', dice: '2d10', kind: 'crush', aspect: 'stone', diceEvery: 6, riders: [st('staggered')] }, { type: 'grip', dice: '2d6' }],
    },
    mapPower: { id: 'shatter-glass', name: 'Shatter Glass', text: 'Break a dune-glass wall in one swing.' },
    lore: 'Gnash says he took it from a giant. The giant says otherwise.',
    sockets: 1, deeds: ['first-blood', 'claim', 'hundred'],
    awaken: {
      a: hand('Giant\'s', 'Swung the way the giant swung it. +2 damage and +1 STR.', { dmg: 2, STR: 1 }),
      b: heart('Glass-Cracking', 'It finds the flaw before it lands. +3 grip damage and +1 to hit.', { gripDmg: 3, hit: 1 }),
    },
  },
  cinderfang: {
    id: 'cinderfang', codex: 31, name: 'Cinderfang', kind: 'sword', slot: 'weapon', aspect: 'ember', rarity: 'heirloom', ilvl: 14,
    holder: 'Lodged in the tail of Kharzul the Glass Scorpion', grip: 44,
    // the design brief's item No. 031: 2d8 slashing + 1d6 ember, +2 DEX, crits on 19-20, acts sooner, 2 sockets
    weapon: { dice: '2d8', dmg: 'slash', hands: 1, weight: -5, ability: ['STR', 'DEX'], extra: [{ dice: '1d6', aspect: 'ember' }] },
    stats: { DEX: 2, crit: 1, speed: 1 },
    power: {
      id: 'glasscutter', name: 'Glasscutter', target: 'all-enemies',
      text: 'One long cut through the whole line: a weapon attack against every foe, and each hit sets it Burning (1d6 a turn).',
      effects: [{ type: 'attack', weapon: true, riders: [st('burning')] }],
    },
    mapPower: { id: 'melt-glass', name: 'Melt Glass', text: 'Melts glassed dune-walls in the Sunscorch.' },
    lore: 'Forged in Scorchgate to kill the dragon that burned it. It failed. It has been warm ever since.',
    sockets: 2, deeds: ['legend-strike', 'fell-champion', 'hundred'],
    awaken: {
      a: {
        name: 'Sunmarrow', text: 'The fire spreads. +2 damage and 20% ember resist, and Glasscutter\'s fire runs on to every foe, hit or miss: 1d6 ember and Burning.',
        stats: { dmg: 2, resist: { ember: 20 } },
        power: { text: 'The fire spreads: a weapon attack against every foe, each hit sets it Burning, and the fire runs on to every foe for 1d6 ember and Burning.', effects: [{ type: 'attack', weapon: true, riders: [st('burning')] }, { type: 'damage', dice: '1d6', kind: 'ember', aspect: 'ember', diceEvery: 6, riders: [st('burning')] }] },
      },
      b: {
        name: 'Glassline', text: 'An edge so fine it is there before the blow. +4 speed and +1 to hit: it all but always strikes first, and Glasscutter strikes true (+5 to hit).',
        stats: { speed: 4, hit: 1 },
        power: { text: 'Always first: a weapon attack at +5 against every foe, and each hit sets it Burning.', effects: [{ type: 'attack', weapon: true, hit: 5, riders: [st('burning')] }] },
      },
    },
  },
  'mirage-glass': {
    id: 'mirage-glass', codex: 32, name: 'The Mirage Glass', kind: 'amulet', slot: 'amulet', aspect: 'frost', rarity: 'heirloom', ilvl: 13,
    holder: 'The Wisp-Queen of Miragewell', grip: 30,
    stats: { WIS: 1, mp: 4, resist: { frost: 15, ember: 10 } },
    power: {
      id: 'a-thousand-mirrors', name: 'A Thousand Mirrors', target: 'all-enemies',
      text: 'The lens shows every foe a thousand of you: 2d6 frost to every foe, WIS save for half, and those who fail swing at shimmers (Frightened).',
      effects: [{ type: 'damage', dice: '2d6', kind: 'frost', aspect: 'frost', diceEvery: 6, save: 'WIS', riders: [st('frightened')] }],
    },
    mapPower: { id: 'see-true', name: 'See True', text: 'Look through the lens: mirages part.' },
    lore: 'A lens of well-water that never spilled. Through it the desert tells the truth.',
    sockets: 1, deeds: ['surge', 'settle', 'untouched'],
    awaken: {
      a: hand('True-Seeing', 'The lens shows where the blow will land. +1 to hit and +1 speed.', { hit: 1, speed: 1 }),
      b: heart('Well-Water', 'Cool, clear and never spilled. +1 WIS and +10% healing.', { WIS: 1, healBonus: 10 }),
    },
  },
  'qasims-signet': {
    id: 'qasims-signet', codex: 33, name: 'Qasim\'s Signet', kind: 'ring', slot: 'ring', aspect: 'frost', rarity: 'heirloom', ilvl: 13,
    holder: 'Cistern Lord Qasim\'s gift',
    stats: { CHA: 1, hp: 6, mp: 4, resist: { ember: 10 } },
    power: {
      id: 'the-cistern-opens', name: 'The Cistern Opens', target: 'all-allies',
      text: 'The Cistern Lord\'s seal opens the water: every ally heals 2d8, and the fire goes out (Burning is washed away).',
      effects: [{ type: 'heal', dice: '2d8', diceEvery: 5 }, { type: 'cleanse', statuses: ['burning'] }],
    },
    mapPower: { id: 'cistern-writ', name: 'Cistern Writ', text: 'Gatekeepers of the dry country lift the bar for the Cistern Lord\'s seal.' },
    lore: 'Pressed into every water-tally in Sandspire. It is worth more than the water.',
    sockets: 1, deeds: ['surge', 'rout', 'brand'],
    awaken: {
      a: hand('Generous', 'Water for whoever is thirsty. +1 CON and +6 HP.', { CON: 1, hp: 6 }),
      b: heart('Lordly', 'The seal of the Cistern Lord, and his manner. +1 CHA and +10% healing.', { CHA: 1, healBonus: 10 }),
    },
  },
  'sunstone-heart': {
    id: 'sunstone-heart', codex: 34, name: 'The Sunstone Heart', kind: 'amulet', slot: 'amulet', aspect: 'ember', rarity: 'heirloom', ilvl: 14,
    holder: 'Luma of Dusthaven\'s secret',
    stats: { hp: 10, regen: 1, resist: { ember: 15 } },
    power: {
      id: 'sunbeat', name: 'Sunbeat', target: 'all-allies',
      text: 'It beats once, loud as a drum, and every heart beats with it: every ally heals 2d8 and Regenerates 1d6 a turn.',
      effects: [{ type: 'heal', dice: '2d8', diceEvery: 5 }, st('regenerating', { value: { dice: '1d6', diceEvery: 6 } })],
    },
    mapPower: { id: 'heartglow', name: 'Heartglow', text: 'Warm enough to light a cold hearth by holding it close.' },
    lore: 'It beats. Luma asks you not to tell anyone that it beats.',
    sockets: 1, deeds: ['surge', 'brand', 'untouched'],
    awaken: {
      a: hand('Beating', 'Two hearts in one chest, both of them stubborn. +1 CON and +8 HP.', { CON: 1, hp: 8 }),
      b: heart('Secret', 'Luma\'s secret, kept: regrow 1 HP a turn and +15% Legend Surge.', { regen: 1, surgeGain: 15 }),
    },
  },
  'scorchgate-key': {
    id: 'scorchgate-key', codex: 35, name: 'The Scorchgate Key', kind: 'ring', slot: 'ring', aspect: 'ember', rarity: 'heirloom', ilvl: 14,
    holder: 'The Ash-Captain of Scorchgate', grip: 24,
    stats: { guard: 1, hit: 1, resist: { ember: 15 } },
    power: {
      id: 'the-last-door', name: 'The Last Door', target: 'all-enemies',
      text: 'The key that is not there turns in every lock at once: every foe Staggers and is Exposed (-2 Guard).',
      effects: [st('staggered'), st('exposed')],
    },
    mapPower: { id: 'ashen-key', name: 'Ashen Key', text: 'Opens the vault seals of Scorchgate.' },
    lore: 'A key ring with no key on it. The seal knows it anyway.',
    // a ring with no key on it has nowhere to set a stone
    sockets: 0, deeds: ['fell-holder', 'claim', 'brand'],
    awaken: {
      a: hand('Gate-Holding', 'The last gate of Scorchgate holds in your hand. +1 Guard and +6 HP.', { guard: 1, hp: 6 }),
      b: heart('Unlocking', 'Every door opens a little before you reach it. +1 INT and +15% Legend Surge.', { INT: 1, surgeGain: 15 }),
    },
  },
  'ashen-aegis': {
    id: 'ashen-aegis', codex: 36, name: 'The Ashen Aegis', kind: 'shield', slot: 'offhand', aspect: 'ember', rarity: 'heirloom', ilvl: 15,
    holder: 'Borne by the Ashen Warden (a breakable piece)', grip: 30,
    stats: { guard: 3, hp: 8, speed: -1, resist: { ember: 25 } },
    power: {
      id: 'ward-of-ash', name: 'Ward of Ash', target: 'all-allies',
      text: 'The Aegis comes up over all of you, and the ash takes the blows: every ally is Warded for 3d8.',
      effects: [st('warded', { value: { dice: '3d8', diceEvery: 5 } })],
    },
    mapPower: { id: 'ash-ward', name: 'Ash-Ward', text: 'Ash settles over you: ichor cannot touch you.' },
    lore: 'Scorchgate\'s last shield. It was carried out of the fire and never put down.',
    sockets: 2, deeds: ['fell-champion', 'settle', 'untouched'],
    awaken: {
      a: { name: 'The Last Wall', text: 'It was never put down, and neither are you. +1 Guard and +10 HP.', stats: { guard: 1, hp: 10 } },
      b: { name: 'The Ash-Ward', text: 'The ash remembers the fire and turns it aside: 15% ember and 15% blight resist, and +10% Legend Surge.', stats: { resist: { ember: 15, blight: 15 }, surgeGain: 10 } },
    },
  },
  'cinder-crown': {
    id: 'cinder-crown', codex: 37, name: 'The Cinder Crown', kind: 'helm', slot: 'head', aspect: 'ember', rarity: 'heirloom', ilvl: 15,
    holder: 'Worn by the Ashen Warden (a breakable piece)', grip: 28,
    stats: { hp: 6, CHA: 1, surgeGain: 10, resist: { ember: 15 } },
    power: {
      id: 'command-of-cinders', name: 'Command of Cinders', target: 'all-allies',
      text: 'Every ember in the Crown was a soldier of Scorchgate, and they answer: every ally is Hasted and gains 15 Legend Surge.',
      effects: [st('hasted'), { type: 'surge', amount: 15 }],
    },
    mapPower: { id: 'crown-of-embers', name: 'Crown of Embers', text: 'The crown glows: darkness lifts around you.' },
    lore: 'Every ember in it was a soldier of Scorchgate. They still answer to it.',
    sockets: 2, deeds: ['surge', 'fell-champion', 'brand'],
    awaken: {
      a: { name: 'The Captain\'s Crown', text: 'Worn by whoever leads the charge. +1 STR, +1 to hit and +6 HP.', stats: { STR: 1, hit: 1, hp: 6 } },
      b: { name: 'The Watch Remembered', text: 'The soldiers in the embers keep watch over you now. +1 CHA, +6 MP and +15% Legend Surge.', stats: { CHA: 1, mp: 6, surgeGain: 15 } },
    },
  },
  saltglass: {
    id: 'saltglass', codex: 38, name: 'Saltglass', kind: 'bow', slot: 'weapon', aspect: 'storm', rarity: 'heirloom', ilvl: 13,
    holder: 'Vell Saltglass, the caravan\'s sharpshooter', grip: 24,
    weapon: { dice: '1d8', dmg: 'pierce', hands: 2, weight: 0, ability: ['DEX'], ranged: true, extra: [{ dice: '1d6', aspect: 'storm' }] },
    stats: { hit: 2, crit: 1 },
    power: {
      id: 'the-glass-sings', name: 'The Glass Sings', target: 'enemy',
      text: 'One arrow, drawn until the bow sings: a weapon shot that cannot miss, dice doubled, and the foe Staggers.',
      effects: [{ type: 'attack', weapon: true, autoCrit: true, riders: [st('staggered')] }],
    },
    mapPower: { id: 'longsight', name: 'Longsight', text: 'You see holders from much farther away: they are Sighted from 4 tiles further.' },
    lore: 'Strung with salt-cured gut and cut from a glassed dune. It sings when it is drawn.',
    sockets: 1, deeds: ['legend-strike', 'fell-holder', 'hundred'],
    awaken: {
      a: hand('Far-Drawing', 'Drawn to the ear and past it. +1 to hit and +1 damage.', { hit: 1, dmg: 1 }),
      b: heart('Singing', 'It sings the arrow home. +1 WIS and +15% Legend Surge.', { WIS: 1, surgeGain: 15 }),
    },
  },
  // ---- M5: Codex Page III, the Ironspire Peaks (codex 39-52; spec §3.4; owner P4). A notch above Page II, as
  // the Ironspire is a notch above the Sunscorch. The Champions' four pieces (the Anvil Heart, the Worldforge
  // Hammer, the Rime Crozier, the Hushweave Cowl) have hand-named branches and two sockets, as M4's do. ----
  'windstep-boots': {
    id: 'windstep-boots', codex: 39, name: 'Windstep Boots', kind: 'boots', slot: 'feet', aspect: 'storm', rarity: 'heirloom', ilvl: 16,
    holder: 'Rhune the Pass-Warden, at his toll on the Rockslide Pass', grip: 26,
    stats: { speed: 2, DEX: 1, resist: { storm: 15 } },
    power: {
      id: 'windstride', name: 'Windstride', target: 'all-allies',
      text: 'The wind off the peaks takes your weight: every ally is Hasted, and the next blow meets only wind (Warded for 2d6).',
      effects: [st('hasted'), st('warded', { value: { dice: '2d6', diceEvery: 5 } })],
    },
    mapPower: { id: 'windstep', name: 'Windstep', text: 'Step across a chasm on the wind.' },
    lore: 'Rhune took them off a monk of Peak\'s Veil who crossed the slide without touching it. The monk has not been seen since; the boots have not touched the ground since either.',
    sockets: 1, deeds: ['first-blood', 'rout', 'untouched'],
    awaken: {
      a: hand('Gale-Footed', 'The wind is always at your back. +1 speed and +1 DEX.', { speed: 1, DEX: 1 }),
      b: heart('Wandering', 'You never lose the road, in any weather. +8 HP and 10% storm resist.', { hp: 8, resist: { storm: 10 } }),
    },
  },
  veilbell: {
    id: 'veilbell', codex: 40, name: 'The Veilbell', kind: 'amulet', slot: 'amulet', aspect: 'frost', rarity: 'heirloom', ilvl: 16,
    holder: 'Mother Wynn of Peak\'s Veil (the bell quest)',
    stats: { WIS: 1, mp: 6, resist: { frost: 15 } },
    power: {
      id: 'the-bell-tolls', name: 'The Bell Tolls', target: 'all-allies',
      text: 'One clear note from Peak\'s Veil, and the cold and the fear go out of you: every ally heals 2d6 and shakes off Frightened, Chilled and Charmed.',
      effects: [{ type: 'heal', dice: '2d6', diceEvery: 5 }, { type: 'cleanse', statuses: ['frightened', 'chilled', 'charmed'] }],
    },
    mapPower: { id: 'crack-the-ice', name: 'Crack the Ice', text: 'Ring it against old ice, and the ice gives.' },
    lore: 'A hand-bell cast from the metal of the great bell\'s first crack. Mother Wynn rang it for the drowned every evening; now you carry it, and the drowned can hear.',
    sockets: 1, deeds: ['surge', 'untouched', 'brand'],
    awaken: {
      a: hand('Ringing', 'The note carries into your sword-arm. +1 to hit and +1 WIS.', { hit: 1, WIS: 1 }),
      b: heart('Vesper', 'The note carries into the quiet after it. +6 MP and +10% healing.', { mp: 6, healBonus: 10 }),
    },
  },
  ironwall: {
    id: 'ironwall', codex: 41, name: 'Ironwall', kind: 'shield', slot: 'offhand', aspect: 'stone', rarity: 'heirloom', ilvl: 17,
    holder: 'The Sentinel-Captain, at the foot of the Iron Stair', grip: 30,
    stats: { guard: 3, hp: 10, speed: -1, resist: { stone: 15 } },
    power: {
      id: 'hold-the-stair', name: 'Hold the Stair', target: 'all-allies',
      text: 'Ironwall comes down across the line like a portcullis: every ally is Guarding, and Warded for 2d8.',
      effects: [st('guarding'), st('warded', { value: { dice: '2d8', diceEvery: 5 } })],
    },
    mapPower: { id: 'iron-stance', name: 'Iron Stance', text: 'You start every fight braced: Guarding in the first round.' },
    lore: 'A dwarf door-shield, cut down to carry. The Sentinels were built around it, and the stair was built around them.',
    sockets: 1, deeds: ['fell-holder', 'untouched', 'settle'],
    awaken: {
      a: hand('Unmoving', 'Nothing moves you off the stair. +1 Guard and +8 HP.', { guard: 1, hp: 8 }),
      b: heart('Doorward', 'You know which way the door opens. +8 HP and 15% frost resist.', { hp: 8, resist: { frost: 15 } }),
    },
  },
  'drowned-censer': {
    id: 'drowned-censer', codex: 42, name: 'The Drowned Censer', kind: 'focus', slot: 'offhand', aspect: 'frost', rarity: 'heirloom', ilvl: 18,
    holder: 'The Drowned Abbess, on the island shrine of Frostmere', grip: 28,
    stats: { mp: 8, WIS: 1, healBonus: 10, resist: { frost: 10 } },
    power: {
      id: 'requiem', name: 'Requiem', target: 'all-enemies',
      text: 'The censer swings, and the lake-smoke rolls over them: 2d8 frost to every foe, and two stacks of Chilled.',
      effects: [{ type: 'damage', dice: '2d8', kind: 'frost', aspect: 'frost', diceEvery: 6, riders: [st('chilled', { stacks: 2 })] }],
    },
    mapPower: { id: 'hymn-of-rest', name: 'Hymn of Rest', text: 'Roaming undead never notice you pass.' },
    lore: 'It still swings when nobody holds it, and the smoke is always wet. The Abbess censed the drowned with it every night for thirty years, until she was one of them.',
    sockets: 1, deeds: ['surge', 'fell-holder', 'untouched'],
    awaken: {
      a: hand('Swinging', 'The censer swings with your arm. +1 to hit and +8 HP.', { hit: 1, hp: 8 }),
      b: heart('Censing', 'The hymn stays with you. +6 MP and 15% frost resist.', { mp: 6, resist: { frost: 15 } }),
    },
  },
  'ironvein-bracers': {
    id: 'ironvein-bracers', codex: 43, name: 'Ironvein Bracers', kind: 'gauntlets', slot: 'hands', aspect: 'ember', rarity: 'heirloom', ilvl: 17,
    holder: 'Tamsin, at Ironhold (worn; yours when you beat her)',
    stats: { STR: 1, hit: 1, gripDmg: 3, resist: { ember: 10 } },
    power: {
      id: 'vein-of-iron', name: 'Vein of Iron', target: 'enemy',
      text: 'The bracers lock like a vice: 4d6 grip damage, and a weapon strike that Staggers.',
      effects: [{ type: 'grip', dice: '4d6' }, { type: 'attack', weapon: true, riders: [st('staggered')] }],
    },
    mapPower: { id: 'iron-grip', name: 'Iron Grip', text: 'Heave a cracked boulder out of the road.' },
    lore: 'Forged at Ironhold for someone with small wrists and a big grudge. Tamsin says they were a gift. Durra Ironhand says she knows who made them, and it was not a gift.',
    sockets: 1, deeds: ['legend-strike', 'fell-holder', 'claim'],
    awaken: {
      a: hand('Iron', 'A grip like a vice. +1 STR and +1 damage.', { STR: 1, dmg: 1 }),
      b: heart('Forge-Warm', 'Warm as a forge on a cold road. +8 HP and 15% frost resist.', { hp: 8, resist: { frost: 15 } }),
    },
  },
  'roc-feather-cloak': {
    id: 'roc-feather-cloak', codex: 44, name: 'The Roc-Feather Cloak', kind: 'leather', slot: 'body', aspect: 'storm', rarity: 'heirloom', ilvl: 18,
    holder: 'Caught on the Thunder-Roc\'s talon, in its eyrie on the Highfold', grip: 30,
    armor: { base: 12, maxDex: 9, type: 'hide' },
    stats: { speed: 2, DEX: 1, resist: { storm: 20 } },
    power: {
      id: 'thunder-stoop', name: 'Thunder-Stoop', target: 'enemy',
      text: 'You come down on one foe the way the Roc does: 4d8 storm out of a clear sky, and it Staggers.',
      effects: [{ type: 'damage', dice: '4d8', kind: 'storm', aspect: 'storm', diceEvery: 6, riders: [st('staggered')] }],
    },
    mapPower: { id: 'roc-glide', name: 'Roc-Glide', text: 'Glide across a chasm on the feathers.' },
    lore: 'A shepherd\'s cloak of the Thunder-Roc\'s own moulted feathers, snagged on its talon the day it carried the shepherd off. It sheds rain, snow and arrows, and it remembers flying.',
    sockets: 1, deeds: ['fell-holder', 'untouched', 'rout'],
    awaken: {
      a: hand('Swooping', 'You strike from above. +1 speed and +1 to hit.', { speed: 1, hit: 1 }),
      b: heart('Stormborne', 'The storm is on your side. +8 HP and 15% storm resist.', { hp: 8, resist: { storm: 15 } }),
    },
  },
  'thanes-rune': {
    id: 'thanes-rune', codex: 45, name: 'The Thane\'s Rune-Key', kind: 'ring', slot: 'ring', aspect: 'stone', rarity: 'heirloom', ilvl: 17,
    holder: 'Thane Brundar\'s gift, for the leave to go down into the Deeps',
    stats: { guard: 1, WIS: 1, hp: 8, resist: { stone: 15 } },
    power: {
      id: 'rune-ward', name: 'Rune-Ward', target: 'all-allies',
      text: 'The Thane\'s runes light up along your arms: every ally is Warded for 3d6 and sheds one harmful status.',
      effects: [st('warded', { value: { dice: '3d6', diceEvery: 5 } }), { type: 'cleanse', harmful: 1 }],
    },
    mapPower: { id: 'thanes-rune', name: 'The Thane\'s Rune', text: 'Dwarf rune-seals know the Thane\'s key.' },
    lore: 'A ring of black iron with the Thane\'s rune on it. Every door in the Deeps was cut to know it, and Brundar had not let it off his finger in thirty years.',
    sockets: 1, deeds: ['brand', 'untouched', 'surge'],
    awaken: {
      a: hand('Rune-Cut', 'The runes cut deeper. +1 Guard and +1 to hit.', { guard: 1, hit: 1 }),
      b: heart('Rune-Read', 'You read the runes as you go. +6 MP and +1 WIS.', { mp: 6, WIS: 1 }),
    },
  },
  'trollhide-mantle': {
    id: 'trollhide-mantle', codex: 46, name: 'The Trollhide Mantle', kind: 'leather', slot: 'body', aspect: 'stone', rarity: 'heirloom', ilvl: 18,
    holder: 'Old Horn the Peak-Troll, in his cave on the Iron Stair', grip: 32,
    armor: { base: 14, maxDex: 2, type: 'hide' },
    stats: { hp: 12, regen: 2, resist: { frost: 15 } },
    power: {
      id: 'troll-blood', name: 'Troll Blood', target: 'all-allies',
      text: 'The hides knit, and you knit with them: every ally heals 2d6 and Regenerates 1d8 a turn.',
      effects: [{ type: 'heal', dice: '2d6', diceEvery: 5 }, st('regenerating', { value: { dice: '1d8', diceEvery: 6 } })],
    },
    mapPower: { id: 'snowshoe', name: 'Snowshoe', text: 'Walk on the crust of a snowdrift without breaking through.' },
    lore: 'Old Horn wears the hides of every troll that argued with him about the pass. They still grow back a little, and they still argue.',
    sockets: 1, deeds: ['fell-holder', 'hundred', 'untouched'],
    awaken: {
      a: hand('Troll-Strong', 'Hit it and it heals. +12 HP and +1 CON.', { hp: 12, CON: 1 }),
      b: heart('Troll-Wise', 'You learn to wait, as trolls do. Regrow 1 more HP a turn and 15% frost resist.', { regen: 1, resist: { frost: 15 } }),
    },
  },
  runestaff: {
    id: 'runestaff', codex: 47, name: 'Harrow\'s Runestaff', kind: 'staff', slot: 'weapon', aspect: 'ember', rarity: 'heirloom', ilvl: 18,
    holder: 'Harrow\'s Journeyman, in the Ironhold Deeps', grip: 28,
    weapon: { dice: '1d8', dmg: 'crush', hands: 2, weight: 0, ability: ['STR', 'INT', 'WIS'], extra: [{ dice: '1d8', aspect: 'ember' }] },
    stats: { INT: 1, mp: 8, hit: 1 },
    power: {
      id: 'harrows-rune', name: 'Harrow\'s Rune', target: 'enemy',
      text: 'You cut Harrow\'s own rune in the air, and it finds the flaw in whatever it looks at: 4d6 grip damage, 3d8 ember, and the foe is Exposed.',
      effects: [{ type: 'grip', dice: '4d6' }, { type: 'damage', dice: '3d8', kind: 'ember', aspect: 'ember', diceEvery: 6, riders: [st('exposed')] }],
    },
    mapPower: { id: 'rune-reading', name: 'Rune-Reading', text: 'Read a rune-seal, and it lets you pass.' },
    lore: 'Harrow cut every rune on it himself. His journeyman only carried it, and the runes know the difference; they still read the Deeps\' doors for whoever holds it.',
    sockets: 1, deeds: ['surge', 'fell-holder', 'hundred'],
    awaken: {
      a: hand('Rune-Struck', 'The runes bite. +1 damage and +1 to hit.', { dmg: 1, hit: 1 }),
      b: heart('Rune-Wise', 'The runes answer you, not him. +6 MP and +1 INT.', { mp: 6, INT: 1 }),
    },
  },
  'anvil-heart': {
    id: 'anvil-heart', codex: 48, name: 'The Anvil Heart', kind: 'amulet', slot: 'amulet', aspect: 'ember', rarity: 'heirloom', ilvl: 19,
    holder: 'Glowing in Mother Anvil\'s ribs (a breakable piece)', grip: 36,
    stats: { hp: 12, regenPct: 2, resist: { frost: 20, ember: 10 } },
    power: {
      id: 'heart-of-the-forge', name: 'Heart of the Forge', target: 'all-allies',
      text: 'The Heart beats once like a great bellows: every ally heals 2d8, is Hasted, and thaws (Chilled and Frozen are gone).',
      effects: [{ type: 'heal', dice: '2d8', diceEvery: 5 }, st('hasted'), { type: 'cleanse', statuses: ['chilled', 'frozen'] }],
    },
    mapPower: { id: 'forge-heat', name: 'Forge-Heat', text: 'Carry a forge\'s heart: old ice gives, and cold hearths catch.' },
    lore: 'Harrow set it in her ribs so that she would never go cold. She never has. Held in the hand, it beats.',
    sockets: 2, deeds: ['fell-champion', 'brand', 'untouched'],
    awaken: {
      a: { name: 'The Forge-Heart', text: 'It beats with every blow you strike. +1 STR, +1 to hit and +8 HP.', stats: { STR: 1, hit: 1, hp: 8 } },
      b: { name: 'The Banked Fire', text: 'It keeps the whole line warm through the longest night. 20% frost resist, +6 MP and +10% Legend Surge.', stats: { resist: { frost: 20 }, mp: 6, surgeGain: 10 } },
    },
  },
  'worldforge-hammer': {
    id: 'worldforge-hammer', codex: 49, name: 'The Worldforge Hammer', kind: 'hammer', slot: 'weapon', aspect: 'ember', rarity: 'heirloom', ilvl: 19,
    holder: 'In Mother Anvil\'s arm, in Harrow\'s Forge', grip: 44,
    weapon: { dice: '2d8', dmg: 'crush', hands: 2, weight: 25, ability: ['STR'], extra: [{ dice: '1d8', aspect: 'ember' }] },
    stats: { STR: 1, dmg: 2, gripDmg: 4 },
    power: {
      id: 'worldfall', name: 'Worldfall', target: 'all-enemies',
      text: 'The hammer comes down like the first morning of the world: 3d10 crushing to every foe, 2d6 grip damage to each, and they Stagger.',
      effects: [{ type: 'damage', dice: '3d10', kind: 'crush', aspect: 'ember', diceEvery: 6, riders: [st('staggered')] }, { type: 'grip', dice: '2d6' }],
    },
    mapPower: { id: 'anvil-strike', name: 'Anvil Strike', text: 'One blow splits a boulder.' },
    lore: 'Harrow Ironvein\'s own hammer. Hilda says he never put it down in his life, and there is a groove worn in the haft the shape of his hand.',
    sockets: 2, deeds: ['legend-strike', 'fell-champion', 'hundred'],
    awaken: {
      a: { name: 'The Worldbreaker', text: 'Swung the way Harrow swung it, to finish things. +1 to hit and +2 damage.', stats: { hit: 1, dmg: 2 } },
      b: { name: 'The Maker\'s Hammer', text: 'Swung the way Hilda would, to make things. +3 grip damage, +10 HP and +10% Legend Surge.', stats: { gripDmg: 3, hp: 10, surgeGain: 10 } },
    },
  },
  'cutters-pick': {
    id: 'cutters-pick', codex: 50, name: 'The Cutter\'s Pick', kind: 'axe', slot: 'weapon', aspect: 'frost', rarity: 'heirloom', ilvl: 18,
    holder: 'The Cutter-Chief, at the ice-saw camp on the Frost Road', grip: 28,
    weapon: { dice: '1d10', dmg: 'pierce', hands: 1, weight: 5, ability: ['STR', 'DEX'], extra: [{ dice: '1d6', aspect: 'frost' }] },
    stats: { hit: 1, crit: 1, gripDmg: 2 },
    power: {
      id: 'split-the-lake', name: 'Split the Lake', target: 'all-enemies',
      text: 'One blow like splitting the lake-ice: a weapon strike against every foe, and each hit leaves two stacks of Chilled.',
      effects: [{ type: 'attack', weapon: true, riders: [st('chilled', { stacks: 2 })] }],
    },
    mapPower: { id: 'ice-bridge', name: 'Ice-Bridge', text: 'Cut a bridge of ice across fast water.' },
    lore: 'A Tallyman ice-pick with a notch in the haft for every block of Frostmere it cut. There are a great many notches.',
    sockets: 1, deeds: ['first-blood', 'hundred', 'fell-holder'],
    awaken: {
      a: hand('Ice-Cutting', 'Every blow finds the grain. +1 to hit and +1 damage.', { hit: 1, dmg: 1 }),
      b: heart('Tallying', 'You keep your own tally now. +8 HP and 15% frost resist.', { hp: 8, resist: { frost: 15 } }),
    },
  },
  'rime-crozier': {
    id: 'rime-crozier', codex: 51, name: 'The Rime Crozier', kind: 'staff', slot: 'weapon', aspect: 'frost', rarity: 'heirloom', ilvl: 19,
    holder: 'In the Rime-Abbot\'s hand, beneath Frostmere', grip: 44,
    weapon: { dice: '1d10', dmg: 'crush', hands: 2, weight: 5, ability: ['STR', 'INT', 'WIS'], extra: [{ dice: '1d8', aspect: 'frost' }] },
    stats: { WIS: 2, mp: 10, healBonus: 10 },
    power: {
      id: 'the-last-office', name: 'The Last Office', target: 'all-allies',
      text: 'The Crozier lights blue, and the office is sung for you instead: every ally heals 3d8 and is Warded for 2d6.',
      effects: [{ type: 'heal', dice: '3d8', diceEvery: 5 }, st('warded', { value: { dice: '2d6', diceEvery: 5 } })],
    },
    mapPower: { id: 'rime-light', name: 'Rime-Light', text: 'The Crozier lights the dark with a cold blue light.' },
    lore: 'Brother Aurel\'s crozier, frozen to his hand for thirty years. Its light is the only light under Frostmere, and it is cold.',
    sockets: 2, deeds: ['surge', 'fell-champion', 'brand'],
    awaken: {
      a: { name: 'The Bell-Clapper', text: 'It strikes like the great bell of Peak\'s Veil. +1 to hit, +2 damage and +1 STR.', stats: { hit: 1, dmg: 2, STR: 1 } },
      b: { name: 'The Abbot\'s Light', text: 'Brother Aurel\'s light, carried back up into the air. +1 WIS, +8 MP and +15% healing.', stats: { WIS: 1, mp: 8, healBonus: 15 } },
    },
  },
  'hushweave-cowl': {
    id: 'hushweave-cowl', codex: 52, name: 'The Hushweave Cowl', kind: 'hood', slot: 'head', aspect: 'frost', rarity: 'heirloom', ilvl: 19,
    holder: 'On the Rime-Abbot\'s head (a breakable piece)', grip: 30,
    stats: { WIS: 1, speed: 2, hp: 8, resist: { frost: 20 } },
    power: {
      id: 'hush', name: 'Hush', target: 'all-enemies',
      text: 'Everything goes quiet, and they forget what they were doing: every foe Staggers (a charging move is lost) and is Frightened.',
      effects: [st('staggered'), st('frightened')],
    },
    mapPower: { id: 'hushwalk', name: 'Hushwalk', text: 'Walk on snow without breaking the crust.' },
    lore: 'Woven under the ice from something that was not wool, by someone who was listening. Wear it and you hear it too: a heartbeat, very slow, very far down.',
    sockets: 2, deeds: ['fell-champion', 'untouched', 'surge'],
    awaken: {
      a: { name: 'The Silent Step', text: 'You strike before they hear you coming. +1 speed, +1 to hit and +1 DEX.', stats: { speed: 1, hit: 1, DEX: 1 } },
      b: { name: 'The Listener\'s Hood', text: 'You hear what the ice hears. +1 WIS, +6 MP and 20% frost resist.', stats: { WIS: 1, mp: 6, resist: { frost: 20 } } },
    },
  },
  // ---- M6: Codex Page IV, the Gloomfen Marsh (codex 53-66; spec §3.4; owner P4). A notch above Page III, as the
  // Gloomfen is a notch above the Ironspire. The Champions' four pieces (the Lamplighter's Lantern, the Mourning Veil,
  // Corvus's Harpoon, the Deep-Pearl) have hand-named branches and two sockets, as M4's and M5's do. ----
  'unfair-toll': {
    id: 'unfair-toll', codex: 53, name: 'Hodge\'s Unfair Toll', kind: 'amulet', slot: 'amulet', aspect: 'tide', rarity: 'heirloom', ilvl: 20,
    holder: 'Hodge of Rotbridge: win his toll game, or pry it loose in the terrible fight', grip: 30,
    stats: { CHA: 2, hp: 10, resist: { tide: 15 } },
    power: {
      id: 'heads-i-win', name: 'Heads I Win', target: 'all-enemies',
      text: 'You flip the clipped coin, and it comes up Hodge: every foe stops to pay the toll, and its next turn comes a whole turn later.',
      effects: [{ type: 'delay', turns: 1, text: '{target} stops to pay the toll.' }],
    },
    mapPower: { id: 'hodges-ferry', name: 'Hodge\'s Ferry', text: 'Ring the coin on a Blackwater dock, and Hodge\'s ferry comes. He charges, of course.' },
    lore: 'Hodge charges what he likes. Now so do you.',
    sockets: 1, deeds: ['claim', 'untouched', 'surge'],
    awaken: {
      a: hand('Clipping', 'Every coin you touch comes up yours. +1 CHA and +1 to hit.', { CHA: 1, hit: 1 }),
      b: heart('Tolling', 'Everybody pays in the end. +1 CHA, +6 MP and 10% tide resist.', { CHA: 1, mp: 6, resist: { tide: 10 } }),
    },
  },
  bogstriders: {
    id: 'bogstriders', codex: 54, name: 'The Bogstriders', kind: 'boots', slot: 'feet', aspect: 'verdant', rarity: 'heirloom', ilvl: 20,
    holder: 'Tamsin at Rotbridge (worn; yours when you beat her, or left behind when she goes)',
    stats: { speed: 2, DEX: 1, resist: { blight: 15 } },
    power: {
      id: 'fen-footed', name: 'Fen-Footed', target: 'all-allies',
      text: 'The ground holds for you and for nobody else: every ally is Hasted, and pulls free of Rooted and Chilled.',
      effects: [st('hasted'), { type: 'cleanse', statuses: ['rooted', 'chilled'] }],
    },
    mapPower: { id: 'bogstride', name: 'Bogstride', text: 'Walk the bog on the tussocks that hold.' },
    lore: 'Boots for a country where the ground is only a rumour, bought in Bogmire with the last of the Keep\'s silver. Tamsin walked the fen alone in them for a month, following the letters.',
    sockets: 1, deeds: ['first-blood', 'rout', 'untouched'],
    awaken: {
      a: hand('Fen-Running', 'The bog never slows you. +1 speed and +1 DEX.', { speed: 1, DEX: 1 }),
      b: heart('Tussock-Wise', 'You know where the ground will hold. +8 HP and 10% blight resist.', { hp: 8, resist: { blight: 10 } }),
    },
  },
  'weeping-bow': {
    id: 'weeping-bow', codex: 55, name: 'The Weeping Bow', kind: 'bow', slot: 'weapon', aspect: 'verdant', rarity: 'heirloom', ilvl: 20,
    holder: 'Grandfather Willow, outside Willowmurk\'s wards', grip: 30,
    weapon: { dice: '1d10', dmg: 'pierce', hands: 2, weight: 5, ability: ['DEX'], ranged: true, extra: [{ dice: '1d8', aspect: 'verdant' }] },
    stats: { hit: 1, DEX: 1 },
    power: {
      id: 'willow-rain', name: 'Willow Rain', target: 'all-enemies',
      text: 'The bow weeps, and it rains arrows: a weapon shot at every foe, and every hit Roots it where it stands.',
      effects: [{ type: 'attack', weapon: true, riders: [st('rooted')] }],
    },
    mapPower: { id: 'willow-weep', name: 'Willow-Weep', text: 'The willow\'s weeping rots old bramble away.' },
    lore: 'Strung with a hair of the oldest willow in the fen, which has been weeping for three hundred years. The arrows fall where the tears would.',
    sockets: 1, deeds: ['fell-holder', 'first-blood', 'hundred'],
    awaken: {
      a: hand('Drooping', 'The arrow falls where it means to. +1 to hit and +1 damage.', { hit: 1, dmg: 1 }),
      b: heart('Weeping', 'The willow grieves for you, and you for it. +8 HP and 10% verdant resist.', { hp: 8, resist: { verdant: 10 } }),
    },
  },
  'willow-ward': {
    id: 'willow-ward', codex: 56, name: 'The Willow-Ward', kind: 'shield', slot: 'offhand', aspect: 'verdant', rarity: 'heirloom', ilvl: 20,
    holder: 'Elder Moss of Willowmurk (the wards quest)',
    stats: { guard: 3, hp: 10, resist: { verdant: 10, blight: 10 } },
    power: {
      id: 'the-wards-hold', name: 'The Wards Hold', target: 'all-allies',
      text: 'The ward-stone in its boss sings, and Willowmurk\'s old wards close round the line: every ally is Warded for 3d6, and shakes off Hexed and Charmed.',
      effects: [st('warded', { value: { dice: '3d6', diceEvery: 5 } }), { type: 'cleanse', statuses: ['hexed', 'charmed'] }],
    },
    mapPower: { id: 'ward-song', name: 'Ward-Song', text: 'A witch-ward knows the Willow-Ward, and goes quiet.' },
    lore: 'A willow-wood shield with a ward-stone set in its boss. Willowmurk made three when the wards were young; Elder Moss has kept the last of them under his bed for forty years.',
    sockets: 1, deeds: ['untouched', 'brand', 'settle'],
    awaken: {
      a: hand('Warding', 'The ward holds the line. +1 Guard and +8 HP.', { guard: 1, hp: 8 }),
      b: heart('Singing-Stone', 'The stone hums a charm against the dark. +6 MP and 15% blight resist.', { mp: 6, resist: { blight: 15 } }),
    },
  },
  'hag-stone': {
    id: 'hag-stone', codex: 57, name: 'The Hag-Stone', kind: 'ring', slot: 'ring', aspect: 'blight', rarity: 'heirloom', ilvl: 21,
    holder: 'Mother Grue, in her sunken hollow in the Lanternfen', grip: 28,
    stats: { WIS: 1, INT: 1, mp: 6, resist: { blight: 15 } },
    power: {
      id: 'through-the-hole', name: 'Through the Hole', target: 'all-enemies',
      text: 'You look at them through the holed stone and see them as they are: every foe is Exposed, and Hexed.',
      effects: [st('exposed'), st('hexed')],
    },
    mapPower: { id: 'hag-sight', name: 'Hag-Sight', text: 'Look through the stone: fog, wards and mirages show you the way.' },
    lore: 'A holed stone on a ring of bog-iron. Look through the hole and you see what is really there: the path under the fog, the charm in the ward, the dry sand under the mirage.',
    sockets: 1, deeds: ['fell-holder', 'surge', 'untouched'],
    awaken: {
      a: hand('Hole-Sighted', 'You see the gap in every guard. +1 to hit and +1 WIS.', { hit: 1, WIS: 1 }),
      b: heart('Hag-Wise', 'You see what the hag saw, and a little more. +6 MP and +1 INT.', { mp: 6, INT: 1 }),
    },
  },
  'lamplighters-lantern': {
    id: 'lamplighters-lantern', codex: 58, name: 'The Lamplighter\'s Lantern', kind: 'focus', slot: 'offhand', aspect: 'radiant', rarity: 'heirloom', ilvl: 22,
    holder: 'In the Lantern Mother\'s hand, in the Mother\'s Hollow', grip: 44,
    stats: { WIS: 2, mp: 10, healBonus: 10, resist: { radiant: 15 } },
    power: {
      id: 'every-lamp-lit', name: 'Every Lamp Lit', target: 'all-allies',
      text: 'Every lamp in Misthollow lights at once, and the way home shows: every ally is Warded for 3d8, and shakes off Frightened, Hexed and Charmed.',
      effects: [st('warded', { value: { dice: '3d8', diceEvery: 5 } }), { type: 'cleanse', statuses: ['frightened', 'hexed', 'charmed'] }],
    },
    mapPower: { id: 'mothers-light', name: 'Mother\'s Light', text: 'A lamp that fog and darkness step back from.' },
    lore: 'The lamp that led Misthollow\'s children out along the boardwalk the night the city sank. She went back with it for the last of them, and it has been lit ever since, under the water and out of it.',
    sockets: 2, deeds: ['fell-champion', 'brand', 'untouched'],
    awaken: {
      a: { name: 'The Lamp-Bearer', text: 'You walk ahead with the light, and they follow. +1 WIS, +1 to hit and +1 speed.', stats: { WIS: 1, hit: 1, speed: 1 } },
      b: { name: 'The Window-Lamp', text: 'A light left burning for someone coming home. +8 MP, +15% healing and 10% radiant resist.', stats: { mp: 8, healBonus: 15, resist: { radiant: 10 } } },
    },
  },
  'mourning-veil': {
    id: 'mourning-veil', codex: 59, name: 'The Mourning Veil', kind: 'hood', slot: 'head', aspect: 'tide', rarity: 'heirloom', ilvl: 22,
    holder: 'Over the Lantern Mother\'s face (a breakable piece)', grip: 30,
    stats: { WIS: 1, speed: 2, hp: 8, resist: { tide: 15, blight: 10 } },
    power: {
      id: 'veil-of-tears', name: 'Veil of Tears', target: 'all-enemies',
      text: 'You lift the veil, and they see her grief: every foe is Frightened, and Rotting (two stacks).',
      effects: [st('frightened'), st('rotting', { stacks: 2 })],
    },
    mapPower: { id: 'mourners-path', name: 'Mourner\'s Path', text: 'Walk the bog as the mourners walked it, and it holds.' },
    lore: 'Black lace, still wet. She has worn it since the night she went back for the last child and the water came up over the boardwalk behind her.',
    sockets: 2, deeds: ['fell-champion', 'surge', 'untouched'],
    awaken: {
      a: { name: 'The Widow\'s Step', text: 'Grief makes you quick. +1 speed, +1 DEX and +1 to hit.', stats: { speed: 1, DEX: 1, hit: 1 } },
      b: { name: 'The Last Lament', text: 'Grief makes you kind. +1 WIS, +6 MP and 15% tide resist.', stats: { WIS: 1, mp: 6, resist: { tide: 15 } } },
    },
  },
  'salvagers-helm': {
    id: 'salvagers-helm', codex: 60, name: 'The Salvager\'s Helm', kind: 'helm', slot: 'head', aspect: 'tide', rarity: 'heirloom', ilvl: 21,
    holder: 'The Salvage-Master, at the Tallymen\'s camp in Misthollow', grip: 30,
    stats: { guard: 2, hp: 10, resist: { tide: 15 } },
    power: {
      id: 'air-for-everyone', name: 'Air for Everyone', target: 'all-allies',
      text: 'The diving bell comes down over the whole line with a pocket of air in it: every ally is Warded for 2d8, and pulls free of Rooted, Chilled and Frozen.',
      effects: [st('warded', { value: { dice: '2d8', diceEvery: 5 } }), { type: 'cleanse', statuses: ['rooted', 'chilled', 'frozen'] }],
    },
    mapPower: { id: 'deep-breath', name: 'Deep Breath', text: 'Wade the Blackwater with your head under it.' },
    lore: 'A copper diving-helm with a Tallyman stamp on the collar and a crack in the glass mended with pitch. It still smells of the bottom of the channel.',
    sockets: 1, deeds: ['fell-holder', 'claim', 'hundred'],
    awaken: {
      a: hand('Diving', 'You go in first. +1 Guard and +1 to hit.', { guard: 1, hit: 1 }),
      b: heart('Drowned-Wise', 'You know exactly how long a breath lasts. +8 HP and 10% tide resist.', { hp: 8, resist: { tide: 10 } }),
    },
  },
  'cantors-staff': {
    id: 'cantors-staff', codex: 61, name: 'The Cantor\'s Staff', kind: 'staff', slot: 'weapon', aspect: 'tide', rarity: 'heirloom', ilvl: 22,
    holder: 'The Drowned Cantor, in the Drowned Belfry beneath Misthollow', grip: 30,
    weapon: { dice: '1d10', dmg: 'crush', hands: 2, weight: 5, ability: ['STR', 'INT', 'WIS'], extra: [{ dice: '1d8', aspect: 'tide' }] },
    stats: { WIS: 1, mp: 10, hit: 1 },
    power: {
      id: 'the-downbeat', name: 'The Downbeat', target: 'all-enemies',
      text: 'You beat time once, and everything in the hall stops to listen: every foe Staggers (a charging move is lost), and is Hexed.',
      effects: [st('staggered'), st('hexed')],
    },
    mapPower: { id: 'still-song', name: 'Still-Song', text: 'Sing the fog still, and it parts.' },
    lore: 'The choirmaster\'s staff of Misthollow, black with the river, that beat time under the water for a thousand years for a hymn that must not stop. Now it has stopped.',
    sockets: 1, deeds: ['surge', 'fell-holder', 'untouched'],
    awaken: {
      a: hand('Time-Beating', 'You strike on the beat. +1 to hit and +1 damage.', { hit: 1, dmg: 1 }),
      b: heart('Choir-Led', 'The choir sings with you now. +6 MP and +1 WIS.', { mp: 6, WIS: 1 }),
    },
  },
  'gar-tooth': {
    id: 'gar-tooth', codex: 62, name: 'The Gar\'s Tooth', kind: 'dagger', slot: 'weapon', aspect: 'tide', rarity: 'heirloom', ilvl: 21,
    holder: 'Old Jaws, in his pool off the Blackwater Reach', grip: 28,
    weapon: { dice: '1d6', dmg: 'pierce', hands: 1, weight: -15, ability: ['STR', 'DEX'], extra: [{ dice: '1d6', aspect: 'tide' }] },
    stats: { crit: 1, DEX: 1, speed: 1 },
    power: {
      id: 'snap', name: 'Snap', target: 'enemy',
      text: 'Quick as the gar out of the channel: a strike that cannot miss, dice doubled, and the foe Bleeds (three stacks).',
      effects: [{ type: 'attack', weapon: true, autoCrit: true, riders: [st('bleeding', { stacks: 3 })] }],
    },
    mapPower: { id: 'gar-current', name: 'Gar-Current', text: 'Swim fast water the way the gar does.' },
    lore: 'One of Old Jaws\'s teeth, as long as a hand and hooked like a gaff. He has more. He will miss this one.',
    sockets: 1, deeds: ['first-blood', 'legend-strike', 'fell-holder'],
    awaken: {
      a: hand('Snapping', 'Quick in, quick out. +1 crit and +1 damage.', { crit: 1, dmg: 1 }),
      b: heart('River-Wise', 'You know where the current runs. +8 HP and 10% tide resist.', { hp: 8, resist: { tide: 10 } }),
    },
  },
  'barge-gauntlets': {
    id: 'barge-gauntlets', codex: 63, name: 'The Barge-Chain Gauntlets', kind: 'gauntlets', slot: 'hands', aspect: 'stone', rarity: 'heirloom', ilvl: 22,
    holder: 'The Bargemaster, at the Tallymen\'s barge-camp on the Tidal Flats', grip: 32,
    stats: { STR: 1, guard: 1, gripDmg: 4, resist: { stone: 10, tide: 10 } },
    power: {
      id: 'haul-away', name: 'Haul Away', target: 'all-enemies',
      text: 'Hands that haul barges haul relics loose: 3d6 grip damage to every foe, and they are Rooted where they stand.',
      effects: [{ type: 'grip', dice: '3d6' }, st('rooted')],
    },
    mapPower: { id: 'haul', name: 'Haul', text: 'Haul a boulder out of the way as if it were a barge.' },
    lore: 'Iron gauntlets with a link of the Leviathan\'s chain riveted into each palm. The Bargemaster hauled the great chain with them every tide, and never once let go.',
    sockets: 1, deeds: ['fell-holder', 'claim', 'hundred'],
    awaken: {
      a: hand('Hauling', 'A grip like a winch. +1 STR and +2 grip damage.', { STR: 1, gripDmg: 2 }),
      b: heart('Unchaining', 'You know the weight of a chain, and how to break one. +8 HP and 10% stone resist.', { hp: 8, resist: { stone: 10 } }),
    },
  },
  'corvus-harpoon': {
    id: 'corvus-harpoon', codex: 64, name: 'Corvus\'s Harpoon', kind: 'spear', slot: 'weapon', aspect: 'tide', rarity: 'heirloom', ilvl: 23,
    holder: 'Lodged in the Blackwater Leviathan\'s side', grip: 44,
    weapon: { dice: '1d10', dmg: 'pierce', hands: 1, versatile: '1d12', weight: 5, ability: ['STR', 'DEX'], extra: [{ dice: '1d8', aspect: 'tide' }] },
    stats: { hit: 1, dmg: 2, gripDmg: 3 },
    power: {
      id: 'harpoon-and-line', name: 'Harpoon and Line', target: 'enemy',
      text: 'Thrown, and hauled back on its line with the foe on the end of it: 4d10 piercing, 3d6 grip damage, and the foe is Rooted.',
      effects: [{ type: 'damage', dice: '4d10', kind: 'pierce', aspect: 'tide', diceEvery: 6, riders: [st('rooted')] }, { type: 'grip', dice: '3d6' }],
    },
    mapPower: { id: 'harpoon-line', name: 'Harpoon-Line', text: 'Throw the line across the Blackwater and haul yourself over.' },
    lore: 'Corvus lost it on his last dive, in something he took for a sunk barge. It was not a barge. The Tallymen found his harpoon still in its side, and chained the rest of it.',
    sockets: 2, deeds: ['fell-champion', 'legend-strike', 'claim'],
    awaken: {
      a: { name: 'The Leviathan-Hook', text: 'It remembers the biggest thing it ever held. +1 to hit, +2 damage and +2 grip damage.', stats: { hit: 1, dmg: 2, gripDmg: 2 } },
      b: { name: 'The Diver\'s Line', text: 'It always brings you back up. +12 HP and 15% tide resist.', stats: { hp: 12, resist: { tide: 15 } } },
    },
  },
  'deep-pearl': {
    id: 'deep-pearl', codex: 65, name: 'The Deep-Pearl', kind: 'amulet', slot: 'amulet', aspect: 'tide', rarity: 'heirloom', ilvl: 23,
    holder: 'In the Blackwater Leviathan\'s brow (a breakable piece)', grip: 34,
    stats: { hp: 14, regen: 3, resist: { tide: 15, storm: 10 } },
    power: {
      id: 'pearl-glow', name: 'Pearl-Glow', target: 'all-allies',
      text: 'A green light out of the deep, and the water heals what it touches: every ally heals 3d8, and Regenerates 1d8 a turn.',
      effects: [{ type: 'heal', dice: '3d8', diceEvery: 5 }, st('regenerating', { value: { dice: '1d8', diceEvery: 6 } })],
    },
    mapPower: { id: 'pearl-light', name: 'Pearl-Light', text: 'It glows green in the dark, as it did at the bottom of the channel.' },
    lore: 'Grown in the Leviathan\'s brow over a thousand years in the dark, as big as a fist. It is warm, it glows green, and in your hand it beats very slowly, like the tide.',
    sockets: 2, deeds: ['fell-champion', 'untouched', 'surge'],
    awaken: {
      a: { name: 'The Deep-Eye', text: 'You see the blow coming up out of the dark. +1 to hit, +1 speed and +8 HP.', stats: { hit: 1, speed: 1, hp: 8 } },
      b: { name: 'The Drowned Moon', text: 'It lights the whole line from below. +8 MP, +10% healing and 15% tide resist.', stats: { mp: 8, healBonus: 10, resist: { tide: 15 } } },
    },
  },
  'hexbane-shawl': {
    id: 'hexbane-shawl', codex: 66, name: 'Nettie\'s Hexbane Shawl', kind: 'robe', slot: 'body', aspect: 'blight', rarity: 'heirloom', ilvl: 22,
    holder: 'Nettie the Swamp Witch of Bogmire (her remedy quest)',
    armor: { base: 12, maxDex: 9, type: 'none' },
    stats: { WIS: 1, mp: 8, healBonus: 10, resist: { blight: 20 } },
    power: {
      id: 'undo-the-knot', name: 'Undo the Knot', target: 'all-allies',
      text: 'Nettie\'s knots come undone, and so does every curse on you: every ally sheds up to three harmful statuses, and heals 2d6.',
      effects: [{ type: 'cleanse', harmful: 3 }, { type: 'heal', dice: '2d6', diceEvery: 5 }],
    },
    mapPower: { id: 'hexbane', name: 'Hexbane', text: 'A witch-ward knows Nettie\'s knots, and lets you by.' },
    lore: 'Knotted by Nettie from bog-cotton and hag\'s hair, one knot for every curse she ever undid. Nobody in Bogmire asks whose hair.',
    sockets: 1, deeds: ['untouched', 'surge', 'settle'],
    awaken: {
      a: hand('Knotted', 'The knots take the blow. +1 Guard and +8 HP.', { guard: 1, hp: 8 }),
      b: heart('Hexbound', 'You bind the hex back on its maker. +6 MP and 10% blight resist.', { mp: 6, resist: { blight: 10 } }),
    },
  },
  // ---- M7: Codex Page V, the Hearth Below (No. 000 and Nos. 67-74; spec §3.4, A13; owner P4). The last and best relics:
  // No. 000 and the Worldforge Heart are primal, the rest regalia, a notch above every earlier page. None asks for the
  // Branded deed (no Brand is left to win, M6 review B2), and the four won at or after the finale (Tamsin's Bargain and
  // the Unsmith's three pieces) ask only for deeds the world still offers once every fight on the road is done (First
  // Blood, Untouched, Rout, Fifty Felled, Surge, Legend Strike). The Council's four gifts and the Unsmith's three pieces
  // are held with grip meters (claimed like a Champion's pieces, spec §3.5); the Poker and Tamsin's Bargain are gifts
  // (`give` in `fenwick-truth` and `tamsin-after`). Every one is hand-named, with two sockets. ----
  'fenwicks-poker': {
    id: 'fenwicks-poker', codex: 0, name: 'Fenwick\'s Poker', kind: 'mace', slot: 'weapon', aspect: 'ember', rarity: 'primal', ilvl: 40,
    holder: 'Fenwick, at the Eternal Hearth: he gives it to you once the Hollow Council is freed',
    weapon: { dice: '1d10', dmg: 'crush', hands: 1, weight: 5, ability: ['STR', 'WIS'], extra: [{ dice: '1d8', aspect: 'ember' }] },
    stats: { hit: 2, dmg: 2, surgeGain: 15, resist: { ember: 15 } },
    power: {
      id: 'stir-the-coals', name: 'Stir the Coals', target: 'all-allies',
      text: 'Nine hundred years of keeping one fire in, in a single stir: every ally heals 3d8, and the hearth\'s own fire is in them (Hearthlit: +1 to hit).',
      effects: [{ type: 'heal', dice: '3d8', diceEvery: 5 }, st('hearthlit')],
    },
    mapPower: { id: 'stir', name: 'Stir', text: 'Stir a cold hearth with it, and the hearth remembers what it was.' },
    lore: 'An iron poker worn thin at the grip by one hand over nine hundred years. Fenwick stirred the Eternal Hearth with it every night of them. It is warm, and it has always been warm.',
    sockets: 2, deeds: ['untouched', 'surge', 'hundred'],
    awaken: {
      a: { name: 'The Night Watch', text: 'You keep the fire in through the longest night, blow by blow. +1 to hit, +2 damage and +1 WIS.', stats: { hit: 1, dmg: 2, WIS: 1 } },
      b: { name: 'The Banked Hearth', text: 'Nine hundred years of patience, in the hand. +10 MP, +15% healing and +10% Legend Surge.', stats: { mp: 10, healBonus: 15, surgeGain: 10 } },
    },
  },
  'hollow-wreath': {
    id: 'hollow-wreath', codex: 67, name: 'The Hollow Wreath', kind: 'circlet', slot: 'head', aspect: 'verdant', rarity: 'regalia', ilvl: 38,
    holder: 'Worn by Hollow Miravel, in the Hollow Hall (a breakable piece)', grip: 64,
    stats: { WIS: 2, mp: 10, regen: 2, resist: { verdant: 15, blight: 10 } },
    power: {
      id: 'hollow-thorns', name: 'Hollow Thorns', target: 'all-enemies',
      text: 'The wreath blooms violet-black, and thorns come up through the floor under every foe: 3d8 piercing, and they are Rooted.',
      effects: [{ type: 'damage', dice: '3d8', kind: 'pierce', aspect: 'verdant', diceEvery: 6, riders: [st('rooted')] }],
    },
    mapPower: { id: 'hollow-bloom', name: 'Hollow Bloom', text: 'Old roots and bramble part for the wreath, and close again behind you.' },
    lore: 'A wreath of black thorn, sent to Eldergrove\'s chair in a box sealed with soot and stamped with a hammer in a broken ring. Worn, it shows you every tree you ever let fall, and makes you feel each one.',
    sockets: 2, deeds: ['fell-champion', 'claim', 'untouched'],
    awaken: {
      a: { name: 'The Thorn-Crown', text: 'The thorns are yours now, and they point outward. +1 to hit, +1 WIS and 10% verdant resist.', stats: { hit: 1, WIS: 1, resist: { verdant: 10 } } },
      b: { name: 'The Greening', text: 'The wood remembers being green. +10 HP, +2 regeneration and 10% blight resist.', stats: { hp: 10, regen: 2, resist: { blight: 10 } } },
    },
  },
  'hollow-chalice': {
    id: 'hollow-chalice', codex: 68, name: 'The Hollow Chalice', kind: 'focus', slot: 'offhand', aspect: 'ember', rarity: 'regalia', ilvl: 38,
    holder: 'Held by Hollow Qasim, in the Hollow Hall (a breakable piece)', grip: 64,
    stats: { INT: 1, mp: 12, healBonus: 15, resist: { ember: 15, tide: 10 } },
    power: {
      id: 'the-given-cup', name: 'The Given Cup', target: 'all-allies',
      text: 'You drink from the Hollow Chalice, and for once it gives: every ally heals 3d8 and gets back 6 MP.',
      effects: [{ type: 'heal', dice: '3d8', diceEvery: 5 }, { type: 'mp', amount: 6 }],
    },
    mapPower: { id: 'hollow-draught', name: 'Hollow Draught', text: 'The chalice is never full and never quite empty: a mouthful of water in the driest place.' },
    lore: 'A chalice of black glass, sent to Sandspire\'s chair in a box sealed with soot and stamped with a hammer in a broken ring. Whatever is poured in, it is never full. It showed Qasim every cup he ever sold that he should have given.',
    sockets: 2, deeds: ['fell-champion', 'claim', 'surge'],
    awaken: {
      a: { name: 'The Raider\'s Cup', text: 'One drink before the charge, the way the dune-raiders take it. +1 to hit, +1 speed and +1 DEX.', stats: { hit: 1, speed: 1, DEX: 1 } },
      b: { name: 'The Open Cistern', text: 'Every cup you give comes back. +10 MP, +10% healing and 10% ember resist.', stats: { mp: 10, healBonus: 10, resist: { ember: 10 } } },
    },
  },
  'hollow-gauntlet': {
    id: 'hollow-gauntlet', codex: 69, name: 'The Hollow Gauntlet', kind: 'gauntlets', slot: 'hands', aspect: 'stone', rarity: 'regalia', ilvl: 38,
    holder: 'Worn by Hollow Brundar, in the Hollow Hall (a breakable piece)', grip: 56,
    stats: { STR: 2, guard: 1, gripDmg: 5, resist: { stone: 15, ember: 10 } },
    power: {
      id: 'let-go', name: 'Let Go', target: 'all-enemies',
      text: 'The gauntlet opens, and everything it ever held lets go at once: 2d10 crushing to every foe, 4d6 grip damage to each, and they Stagger.',
      effects: [{ type: 'damage', dice: '2d10', kind: 'crush', aspect: 'stone', diceEvery: 6, riders: [st('staggered')] }, { type: 'grip', dice: '4d6' }],
    },
    mapPower: { id: 'hollow-heave', name: 'Hollow Heave', text: 'An iron hand that does not tire: heave aside what the rock has fallen on.' },
    lore: 'A gauntlet of dark iron with Harrow\'s rivets in it, sent to Ironhold\'s chair in a box sealed with soot and stamped with a hammer in a broken ring. It closed on Brundar\'s hand and held on to everything he had ever kept. It opens only when you mean it to.',
    sockets: 2, deeds: ['fell-champion', 'claim', 'legend-strike'],
    awaken: {
      a: { name: 'The Closed Fist', text: 'Nothing it takes hold of gets away. +1 STR, +3 grip damage and +1 to hit.', stats: { STR: 1, gripDmg: 3, hit: 1 } },
      b: { name: 'The Open Hand', text: 'You know when to let go. +12 HP, +1 Guard and 10% stone resist.', stats: { hp: 12, guard: 1, resist: { stone: 10 } } },
    },
  },
  'hollow-chain': {
    id: 'hollow-chain', codex: 70, name: 'The Hollow Chain', kind: 'amulet', slot: 'amulet', aspect: 'blight', rarity: 'regalia', ilvl: 38,
    holder: 'Worn by Hollow Gretch, in the Hollow Hall (a breakable piece)', grip: 64,
    stats: { CHA: 2, hp: 12, resist: { blight: 15, radiant: 10 } },
    power: {
      id: 'called-in', name: 'Called In', target: 'all-enemies',
      text: 'Every favour the chain ever bought, called in at once, from them: every foe is Frightened and Hexed.',
      effects: [st('frightened'), st('hexed')],
    },
    mapPower: { id: 'hollow-links', name: 'Hollow Links', text: 'A chain knows other chains: a chained way lets it through.' },
    lore: 'A mayor\'s chain of office in black links, sent to Bogmire\'s chair in a box sealed with soot and stamped with a hammer in a broken ring. It is always a little too tight. Gretch told the Council she never opened it.',
    sockets: 2, deeds: ['fell-champion', 'untouched', 'surge'],
    awaken: {
      a: { name: 'The Mayor\'s Word', text: 'Everyone counts twice when you speak. +1 CHA, +1 to hit and +1 speed.', stats: { CHA: 1, hit: 1, speed: 1 } },
      b: { name: 'The Loosened Chain', text: 'You wear it loose, and it weighs less. +10 MP, +10 HP and 10% blight resist.', stats: { mp: 10, hp: 10, resist: { blight: 10 } } },
    },
  },
  'tamsins-bargain': {
    id: 'tamsins-bargain', codex: 71, name: 'Tamsin\'s Bargain', kind: 'sword', slot: 'weapon', aspect: 'blight', rarity: 'regalia', ilvl: 40,
    holder: 'Tamsin, in the Chained Deep: she gives it to you after the Unsmith',
    weapon: { dice: '1d10', dmg: 'slash', hands: 1, versatile: '1d12', weight: 0, ability: ['STR', 'DEX'], extra: [{ dice: '1d8', aspect: 'blight' }] },
    stats: { hit: 1, DEX: 1, crit: 1, speed: 1 },
    power: {
      id: 'bought-dear', name: 'Bought Dear', target: 'enemy',
      text: 'Everything she paid for it, at once: a strike that cannot miss, dice doubled, and the foe is Exposed and Hexed.',
      effects: [{ type: 'attack', weapon: true, autoCrit: true, riders: [st('exposed'), st('hexed')] }],
    },
    mapPower: { id: 'bargain', name: 'Bargain', text: 'Some doors open for a price. This one has paid it.' },
    lore: 'The violet-black sword Tamsin bought on the black barge with the starter relic the Keep gave her: its darker twin, from the Unsmith\'s forge. She carried it to the bottom of the world, and she would like it to be yours now.',
    sockets: 2, deeds: ['first-blood', 'legend-strike', 'rout'],
    awaken: {
      a: { name: 'The Better Warden', text: 'Faster, braver, and never once patient. +1 speed, +1 crit and +2 damage.', stats: { speed: 1, crit: 1, dmg: 2 } },
      b: { name: 'The Bargain Kept', text: 'You know who paid for it, and what. +12 HP, +1 WIS and 10% blight resist.', stats: { hp: 12, WIS: 1, resist: { blight: 10 } } },
    },
  },
  'unmaking-hammer': {
    id: 'unmaking-hammer', codex: 72, name: 'The Unmaking Hammer', kind: 'hammer', slot: 'weapon', aspect: 'ember', rarity: 'regalia', ilvl: 40,
    holder: 'In the Unsmith\'s hand, at the Worldforge (a breakable piece)', grip: 44,
    weapon: { dice: '2d8', dmg: 'crush', hands: 2, weight: 25, ability: ['STR'], extra: [{ dice: '1d10', aspect: 'ember' }] },
    stats: { STR: 1, dmg: 3, gripDmg: 4 },
    power: {
      id: 'unmake', name: 'Unmake', target: 'enemy',
      text: 'The blow that takes a made thing apart: 5d10 crushing, 4d6 grip damage, and the foe Staggers.',
      effects: [{ type: 'damage', dice: '5d10', kind: 'crush', aspect: 'ember', diceEvery: 6, riders: [st('staggered')] }, { type: 'grip', dice: '4d6' }],
    },
    mapPower: { id: 'unmaking', name: 'Unmaking', text: 'One blow takes a boulder, a wall or a chain apart.' },
    lore: 'Harrow Ironvein\'s second hammer, bigger than the one he left in Mother Anvil\'s arm: a hammer for taking made things apart. He unmade relic-bearers with it at the Worldforge, and kept what they held.',
    sockets: 2, deeds: ['legend-strike', 'hundred', 'untouched'],
    awaken: {
      a: { name: 'The Unmaker', text: 'Swung the way Harrow swung it, to finish things. +1 to hit, +2 damage and +2 grip damage.', stats: { hit: 1, dmg: 2, gripDmg: 2 } },
      b: { name: 'The Remaker', text: 'Swung the way Hilda would, to mend things. +12 HP, +1 Guard and +10% Legend Surge.', stats: { hp: 12, guard: 1, surgeGain: 10 } },
    },
  },
  'ironvein-apron': {
    id: 'ironvein-apron', codex: 73, name: 'The Ironvein Apron', kind: 'leather', slot: 'body', aspect: 'stone', rarity: 'regalia', ilvl: 40,
    holder: 'On the Unsmith, at the Worldforge (a breakable piece)', grip: 40,
    armor: { base: 14, maxDex: 4, type: 'hide' },
    stats: { hp: 14, guard: 1, resist: { ember: 25, stone: 10 } },
    power: {
      id: 'nothing-burns-through', name: 'Nothing Burns Through', target: 'all-allies',
      text: 'The apron that has never once burned through spreads over the whole line: every ally is Warded for 3d8, and stops Burning.',
      effects: [st('warded', { value: { dice: '3d8', diceEvery: 5 } }), { type: 'cleanse', statuses: ['burning'] }],
    },
    mapPower: { id: 'forge-proof', name: 'Forge-Proof', text: 'Walk close to the fire and come back unburnt: forge-heat and live embers do not touch you.' },
    lore: 'A smith\'s leather apron with the Ironvein mark on its pocket, scorched to black and never once burned through. Hilda has one the same, and wears it every day.',
    sockets: 2, deeds: ['untouched', 'surge', 'hundred'],
    awaken: {
      a: { name: 'The Smith\'s Stance', text: 'The heat is on your side. +1 Guard, +1 STR and 10% stone resist.', stats: { guard: 1, STR: 1, resist: { stone: 10 } } },
      b: { name: 'The Twin\'s Apron', text: 'Hilda wears one the same. +12 HP, +1 CON and 10% ember resist.', stats: { hp: 12, CON: 1, resist: { ember: 10 } } },
    },
  },
  'worldforge-heart': {
    id: 'worldforge-heart', codex: 74, name: 'The Worldforge Heart', kind: 'ring', slot: 'ring', aspect: 'ember', rarity: 'primal', ilvl: 40,
    holder: 'Burning in the Unsmith\'s chest, at the Worldforge (a breakable piece)', grip: 72,
    stats: { hp: 16, mp: 10, regen: 3, resist: { ember: 20, frost: 10 } },
    power: {
      id: 'heart-of-the-world', name: 'Heart of the World', target: 'all-allies',
      text: 'The Worldforge\'s heart beats once for you: every ally heals 4d8, Regenerates 1d8 a turn, and is Hearthlit (+1 to hit).',
      effects: [{ type: 'heal', dice: '4d8', diceEvery: 5 }, st('regenerating', { value: { dice: '1d8', diceEvery: 6 } }), st('hearthlit')],
    },
    mapPower: { id: 'worldfire', name: 'Worldfire', text: 'Cold hearths catch from it, and so does anything that ever burned.' },
    lore: 'The heart of the Worldforge, small enough to wear on a finger: a heart of molten metal in an iron cage. It is the hottest thing in the world, and it is beating.',
    sockets: 2, deeds: ['surge', 'untouched', 'legend-strike'],
    awaken: {
      a: { name: 'The Beating Heart', text: 'It keeps time with your blows. +1 to hit, +1 speed and +1 crit.', stats: { hit: 1, speed: 1, crit: 1 } },
      b: { name: 'The Hearth Itself', text: 'It is only a hearth, after all, and a hearth keeps people warm. +12 MP, +15% healing and 10% frost resist.', stats: { mp: 12, healBonus: 15, resist: { frost: 10 } } },
    },
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
