// Base item types, D&D flavoured. Random loot picks one of these, then rolls rarity and affixes.
//
// Weapons: dice + dmg kind, `ability` (best of the listed scores is used for hit and damage),
// `hands` (2 = two-handed, displaces the offhand), `versatile` (bigger die with an empty offhand),
// `weight` (added to the wielder's ribbon delay: a knife is quick, a maul is slow), `ranged`.
// Armour: `armor.base` + DEX mod (capped by maxDex) = Guard, `armor.type` for the physical chart.
// `stats` are flat bonuses (same keys as affix stats). `minIlvl` gates random generation.

import { deepFreeze } from '../core/freeze.js';

const W = (id, name, kind, dice, dmg, o = {}) => ({
  id, name, kind, slot: 'weapon', dice, dmg, hands: 1, weight: 0, ability: ['STR'], minIlvl: 1, stats: {}, ...o,
});
const A = (id, name, kind, slot, o = {}) => ({ id, name, kind, slot, minIlvl: 1, stats: {}, ...o });

export const ITEMS = deepFreeze({
  // ---- weapons ----------------------------------------------------------------------------
  'belt-knife': W('belt-knife', 'Belt Knife', 'dagger', '1d4', 'pierce', { ability: ['STR', 'DEX'], weight: -20, text: '1d4 piercing, finesse, light' }),
  'rondel': W('rondel', 'Rondel Dagger', 'dagger', '1d4', 'pierce', { ability: ['STR', 'DEX'], weight: -15, minIlvl: 4, stats: { hit: 1 }, text: '1d4 piercing, finesse, light, +1 to hit' }),
  'arming-sword': W('arming-sword', 'Arming Sword', 'sword', '1d6', 'slash', { ability: ['STR', 'DEX'], weight: -5, versatile: '1d8', text: '1d6 slashing, finesse, versatile (1d8)' }),
  'longsword': W('longsword', 'Longsword', 'sword', '1d8', 'slash', { weight: 5, versatile: '1d10', minIlvl: 3, text: '1d8 slashing, versatile (1d10)' }),
  'greatsword': W('greatsword', 'Greatsword', 'sword', '2d6', 'slash', { hands: 2, weight: 20, minIlvl: 6, text: '2d6 slashing, two-handed, heavy' }),
  'hand-axe': W('hand-axe', 'Hand Axe', 'axe', '1d6', 'slash', { text: '1d6 slashing, light' }),
  'bearded-axe': W('bearded-axe', 'Bearded Axe', 'axe', '1d8', 'slash', { weight: 10, versatile: '1d10', minIlvl: 3, text: '1d8 slashing, versatile (1d10)' }),
  'warhammer': W('warhammer', 'Warhammer', 'hammer', '1d8', 'crush', { weight: 15, versatile: '1d10', text: '1d8 crushing, versatile (1d10)' }),
  'maul': W('maul', 'Maul', 'hammer', '2d6', 'crush', { hands: 2, weight: 30, minIlvl: 4, text: '2d6 crushing, two-handed, heavy' }),
  'mace': W('mace', 'Mace', 'mace', '1d6', 'crush', { ability: ['STR', 'WIS'], weight: 5, text: '1d6 crushing; a priest may swing it with Wisdom' }),
  'flanged-mace': W('flanged-mace', 'Flanged Mace', 'mace', '1d8', 'crush', { ability: ['STR', 'WIS'], weight: 10, minIlvl: 4, text: '1d8 crushing; a priest may swing it with Wisdom' }),
  'spear': W('spear', 'Spear', 'spear', '1d6', 'pierce', { ability: ['STR', 'DEX'], weight: 5, versatile: '1d8', text: '1d6 piercing, versatile (1d8), reach' }),
  'boar-spear': W('boar-spear', 'Boar Spear', 'spear', '1d10', 'pierce', { hands: 2, weight: 15, minIlvl: 3, text: '1d10 piercing, two-handed, reach' }),
  'shortbow': W('shortbow', 'Shortbow', 'bow', '1d6', 'pierce', { ability: ['DEX'], hands: 2, ranged: true, text: '1d6 piercing, ranged, two-handed' }),
  'longbow': W('longbow', 'Longbow', 'bow', '1d8', 'pierce', { ability: ['DEX'], hands: 2, ranged: true, weight: 10, minIlvl: 4, text: '1d8 piercing, ranged, two-handed, heavy draw' }),
  'quarterstaff': W('quarterstaff', 'Quarterstaff', 'staff', '1d6', 'crush', { ability: ['STR', 'INT', 'WIS'], versatile: '1d8', text: '1d6 crushing, versatile (1d8), a focus for the learned' }),
  'rowan-staff': W('rowan-staff', 'Rowan Staff', 'staff', '1d6', 'crush', { ability: ['STR', 'INT', 'WIS'], versatile: '1d8', minIlvl: 3, stats: { mp: 4 }, text: '1d6 crushing, versatile (1d8), +4 MP' }),

  // ---- offhand ----------------------------------------------------------------------------
  'buckler': A('buckler', 'Buckler', 'shield', 'offhand', { stats: { guard: 1 }, text: '+1 Guard' }),
  'heater-shield': A('heater-shield', 'Heater Shield', 'shield', 'offhand', { stats: { guard: 2 }, text: '+2 Guard' }),
  'tower-shield': A('tower-shield', 'Tower Shield', 'shield', 'offhand', { minIlvl: 5, stats: { guard: 3, speed: -1 }, text: '+3 Guard, -1 speed' }),
  'holy-symbol': A('holy-symbol', 'Holy Symbol', 'focus', 'offhand', { stats: { healBonus: 15 }, text: '+15% healing' }),
  'rune-focus': A('rune-focus', 'Rune Focus', 'focus', 'offhand', { stats: { mp: 4 }, text: '+4 MP' }),

  // ---- head -------------------------------------------------------------------------------
  'hood': A('hood', 'Hood', 'hood', 'head', { stats: { speed: 1 }, text: '+1 speed' }),
  'mail-coif': A('mail-coif', 'Mail Coif', 'coif', 'head', { stats: { guard: 1 }, text: '+1 Guard' }),
  'kettle-helm': A('kettle-helm', 'Kettle Helm', 'kettle', 'head', { stats: { guard: 1, hp: 2 }, text: '+1 Guard, +2 HP' }),
  'great-helm': A('great-helm', 'Great Helm', 'helm', 'head', { minIlvl: 4, stats: { guard: 2, speed: -1 }, text: '+2 Guard, -1 speed' }),
  'circlet': A('circlet', 'Circlet', 'circlet', 'head', { stats: { mp: 3 }, text: '+3 MP' }),
  'bronze-crown': A('bronze-crown', 'Bronze Crown', 'crown', 'head', { minIlvl: 6, stats: { hp: 4, surgeGain: 10 }, text: '+4 HP, +10% Legend Surge' }),

  // ---- body -------------------------------------------------------------------------------
  'robe': A('robe', 'Robe', 'robe', 'body', { armor: { base: 10, maxDex: 9, type: 'none' }, stats: { mp: 2 }, text: 'Guard 10 + DEX, +2 MP' }),
  'jerkin': A('jerkin', 'Leather Jerkin', 'leather', 'body', { armor: { base: 11, maxDex: 9, type: 'hide' }, text: 'Guard 11 + DEX' }),
  'brigandine': A('brigandine', 'Brigandine', 'leather', 'body', { minIlvl: 4, armor: { base: 12, maxDex: 9, type: 'hide' }, text: 'Guard 12 + DEX' }),
  'chain-shirt': A('chain-shirt', 'Chain Shirt', 'mail', 'body', { armor: { base: 13, maxDex: 2, type: 'mail' }, text: 'Guard 13 + DEX (max 2)' }),
  'hauberk': A('hauberk', 'Hauberk', 'mail', 'body', { minIlvl: 4, armor: { base: 14, maxDex: 1, type: 'mail' }, stats: { speed: -1 }, text: 'Guard 14 + DEX (max 1), -1 speed' }),
  'half-plate': A('half-plate', 'Half Plate', 'plate', 'body', { minIlvl: 5, armor: { base: 15, maxDex: 2, type: 'plate' }, stats: { speed: -1 }, needs: { STR: 13 }, text: 'Guard 15 + DEX (max 2), -1 speed, STR 13' }),
  'full-plate': A('full-plate', 'Full Plate', 'plate', 'body', { minIlvl: 8, armor: { base: 17, maxDex: 0, type: 'plate' }, stats: { speed: -2 }, needs: { STR: 15 }, text: 'Guard 17, -2 speed, STR 15' }),

  // ---- hands / feet / jewellery -------------------------------------------------------------
  'gloves': A('gloves', 'Riding Gloves', 'gloves', 'hands', { stats: { gripDmg: 1 }, text: '+1 grip damage' }),
  'gauntlets': A('gauntlets', 'Gauntlets', 'gauntlets', 'hands', { stats: { guard: 1 }, text: '+1 Guard' }),
  'boots': A('boots', 'Travel Boots', 'boots', 'feet', { stats: { speed: 1 }, text: '+1 speed' }),
  'ironshod-boots': A('ironshod-boots', 'Ironshod Boots', 'boots', 'feet', { minIlvl: 4, stats: { guard: 1 }, text: '+1 Guard' }),
  'amulet': A('amulet', 'Copper Amulet', 'amulet', 'amulet', { stats: { hp: 4 }, text: '+4 HP' }),
  'ring': A('ring', 'Iron Band', 'ring', 'ring', { stats: { mp: 2 }, text: '+2 MP' }),
});

export const SLOTS = Object.freeze(['weapon', 'offhand', 'head', 'body', 'hands', 'feet', 'amulet', 'ring']);

export const KINDS_BY_SLOT = deepFreeze({
  weapon: ['sword', 'dagger', 'axe', 'hammer', 'mace', 'spear', 'bow', 'staff'],
  offhand: ['shield', 'focus'],
  head: ['hood', 'coif', 'kettle', 'helm', 'circlet', 'crown'],
  body: ['robe', 'leather', 'mail', 'plate'],
  hands: ['gloves', 'gauntlets'],
  feet: ['boots'],
  amulet: ['amulet'],
  ring: ['ring'],
});

// Battle consumables, kept by count in game.bag. Effects use the skill effect format.
export const CONSUMABLES = deepFreeze({
  'hearth-tonic': {
    id: 'hearth-tonic', name: 'Hearth Tonic', target: 'ally', price: 20, delay: 0.8,
    effects: [{ type: 'heal', dice: '2d4', pct: 0.25 }],
    text: 'Warm as the Keep kitchen. Heals 2d4 + 25% of max HP.',
  },
  'ember-salts': {
    id: 'ember-salts', name: 'Ember Salts', target: 'ally-ko', price: 60, delay: 1,
    effects: [{ type: 'revive', pct: 0.25 }],
    text: 'One sniff and the fallen sit up swearing. Revives at 25% HP.',
  },
  'frost-draught': {
    id: 'frost-draught', name: 'Frost Draught', target: 'ally', price: 15, delay: 0.8,
    effects: [{ type: 'cleanse', statuses: ['burning'] }, { type: 'heal', dice: '1d6' }],
    text: 'Numbs the throat and douses the burn. Cures Burning, heals 1d6.',
  },
  'bitterroot': {
    id: 'bitterroot', name: 'Bitterroot Poultice', target: 'ally', price: 15, delay: 0.8,
    effects: [{ type: 'cleanse', statuses: ['poisoned', 'bleeding'] }, { type: 'heal', dice: '1d6' }],
    text: 'Tastes like regret. Cures Poisoned and Bleeding, heals 1d6.',
  },
});
