// The four heroes of the Verdant Wilds party. Base stats sit in the 4d6-drop-lowest range.
//
// hpDie: level 1 HP = max die + CON mod; each level-up rolls the die (never below half) + CON.
// mp:    base + perLevel * (level - 1) + 2 * mod(stat)
// prof:  what the hero can use (rules/party.js canUse)
// asi:   ability increases every 4 levels, cycling through the list (+1 to each score in a pair)
// skills: unlocked by level; relic arts come from the equipped relic's `grants`
// gear:  starting gear as base item ids + rarity ('starter' = the Warden's chosen relic)

import { deepFreeze } from '../core/freeze.js';

export const HEROES = deepFreeze({
  warden: {
    id: 'warden', name: 'Hearthwarden', title: 'the Hearthwarden', race: 'human', role: 'Balanced frontliner',
    base: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 11, CHA: 13 },
    hpDie: 10, mp: { base: 6, perLevel: 2, stat: 'CHA' },
    domain: 'combat', secondary: ['physical', 'influence'],
    prof: {
      weapons: ['sword', 'dagger', 'axe', 'hammer', 'mace', 'spear'],
      armor: ['robe', 'leather', 'mail', 'plate'],
      offhand: ['shield'],
    },
    asi: [['STR', 'CON'], ['STR', 'DEX'], ['CON', 'CHA']],
    skills: [{ level: 1, id: 'challenge' }, { level: 3, id: 'wrench' }, { level: 5, id: 'rally' }],
    gear: {
      weapon: 'starter',
      body: { base: 'chain-shirt', rarity: 'worn' },
      feet: { base: 'boots', rarity: 'worn' },
    },
    traits: [{ id: 'hearthborn', name: 'Hearthborn', text: 'Raised by the Keep fire: +10% Legend Surge gain.', stats: { surgeGain: 10 } }],
    blurb: 'A young Hearthwarden of the Keep. Their moves come from the relic they carry.',
  },
  pip: {
    id: 'pip', name: 'Pip', title: 'Thornhollow scout', race: 'halfling', role: 'Scout and relic-thief',
    base: { STR: 10, DEX: 16, CON: 12, INT: 12, WIS: 14, CHA: 11 },
    hpDie: 8, mp: { base: 6, perLevel: 2, stat: 'WIS' },
    domain: 'survival', secondary: ['combat'],
    prof: {
      weapons: ['dagger', 'sword', 'bow', 'spear', 'axe'],
      armor: ['robe', 'leather'],
      offhand: [],
    },
    asi: [['DEX', 'WIS'], ['DEX', 'CON']],
    skills: [{ level: 1, id: 'disarm' }, { level: 1, id: 'mark-prey' }, { level: 2, id: 'knife-work' }, { level: 4, id: 'volley' }],
    gear: {
      weapon: { base: 'shortbow', rarity: 'wrought' },
      head: { base: 'hood', rarity: 'worn' },
      body: { base: 'jerkin', rarity: 'worn' },
      feet: { base: 'boots', rarity: 'worn' },
    },
    traits: [{ id: 'secret-paths', name: 'Secret Paths', text: 'Knows every deer-track: +1 speed.', stats: { speed: 1 } }],
    blurb: 'A young scout who knows the secret paths of the Verdant Wilds, and exactly where a relic\'s strap is weakest.',
  },
  bryn: {
    id: 'bryn', name: 'Bryn', title: 'the Bark-Reader of Eldergrove', race: 'human', role: 'Lore and control',
    base: { STR: 9, DEX: 12, CON: 13, INT: 16, WIS: 14, CHA: 10 },
    hpDie: 8, mp: { base: 10, perLevel: 3, stat: 'INT' },
    domain: 'knowledge', secondary: ['attunement'],
    prof: {
      weapons: ['staff', 'mace', 'dagger', 'spear'],
      armor: ['robe', 'leather'],
      offhand: ['focus'],
    },
    asi: [['INT', 'CON'], ['INT', 'WIS']],
    skills: [{ level: 1, id: 'analyze' }, { level: 1, id: 'rootbind' }, { level: 3, id: 'read-the-rings' }, { level: 5, id: 'heartwood-splinters' }],
    gear: {
      weapon: { base: 'quarterstaff', rarity: 'wrought' },
      head: { base: 'circlet', rarity: 'worn' },
      body: { base: 'jerkin', rarity: 'worn' },
    },
    traits: [{ id: 'bark-reader', name: 'Bark-Reader', text: 'Reads a foe\'s grain at a glance: always sees its aspect.', stats: { mp: 2 } }],
    blurb: 'Reads the rings of the eldest trees the way others read letters. Lately the rings say something is wrong.',
  },
  alondra: {
    id: 'alondra', name: 'Sister Alondra', title: 'the blind priestess of Fawnrest', race: 'human', role: 'Healer',
    base: { STR: 10, DEX: 10, CON: 13, INT: 12, WIS: 16, CHA: 14 },
    hpDie: 8, mp: { base: 10, perLevel: 3, stat: 'WIS' },
    domain: 'attunement', secondary: ['influence'],
    prof: {
      weapons: ['mace', 'hammer', 'staff'],
      armor: ['robe', 'leather', 'mail'],
      offhand: ['shield', 'focus'],
    },
    asi: [['WIS', 'CON'], ['WIS', 'CHA']],
    skills: [{ level: 1, id: 'mend' }, { level: 1, id: 'radiant-lance' }, { level: 2, id: 'ward' }, { level: 3, id: 'revive' }, { level: 6, id: 'dawnsong' }],
    gear: {
      weapon: { base: 'mace', rarity: 'worn' },
      offhand: { base: 'holy-symbol', rarity: 'wrought' },
      body: { base: 'chain-shirt', rarity: 'worn' },
    },
    traits: [{ id: 'blind-sight', name: 'Blind Sight', text: 'Cannot be blinded by pocket sand or frightened by what she cannot see.', immune: ['frightened'] }],
    refuses: { kinds: ['sword', 'dagger', 'axe'], text: 'Sister Alondra will not take up a blade.' },
    blurb: 'The blind priestess of Fawnrest. She dreams of four Sleepers, and she hears a lie before it is finished.',
  },
});

export const HERO_IDS = Object.freeze(['warden', 'pip', 'bryn', 'alondra']);

// Starter relic choice decides the Warden's weapon and offhand.
export const STARTERS = deepFreeze({
  hearthbrand: { relic: 'hearthbrand', offhand: { base: 'heater-shield', rarity: 'worn' }, text: 'Sword and shield. Burns.' },
  'stillwater-lance': { relic: 'stillwater-lance', offhand: { base: 'buckler', rarity: 'wrought' }, text: 'Spear and buckler. Chills, then freezes.' },
  cairnmaul: { relic: 'cairnmaul', offhand: null, text: 'Two-handed hammer. Staggers, and breaks grips.' },
});

export const STARTING_BAG = deepFreeze({ 'hearth-tonic': 3, 'ember-salts': 1, 'frost-draught': 1, 'bitterroot': 1 });
