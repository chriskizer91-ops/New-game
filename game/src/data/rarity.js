// Rarity tiers. Shared by rules (affix counts, enchant, drop weights) and by art/ui (colors,
// frame materials, reveal sounds).
//
// - affixes:   number of rolled bonus traits on a generated item
// - statMult:  multiplies rolled affix values
// - enchant:   +hit/+damage on weapons, +Guard on body armour and shields, x3 max HP elsewhere
// - dropWeight: base weight at luck 0 (rules/loot.js bends the curve with luck)
// Heirloom, regalia and primal are hand-designed relics and never roll at random.

import { deepFreeze } from '../core/freeze.js';

export const RARITY_ORDER = Object.freeze(['worn', 'wrought', 'tempered', 'runed', 'storied', 'heirloom', 'regalia', 'primal']);

export const RARITY = deepFreeze({
  worn: {
    id: 'worn', rank: 0, name: 'Worn', color: '#8b8b8b', accent: '#5a5a5a', frame: 'iron',
    affixes: 0, statMult: 1, enchant: 0, dropWeight: 100, gemSlots: 0, chime: 'thud',
    text: 'Base stats only.',
  },
  wrought: {
    id: 'wrought', rank: 1, name: 'Wrought', color: '#f4f1e8', accent: '#bdb6a4', frame: 'iron-rivet',
    affixes: 1, statMult: 1, enchant: 0, dropWeight: 55, gemSlots: 0, chime: 'note',
    text: 'One bonus trait.',
  },
  tempered: {
    id: 'tempered', rank: 2, name: 'Tempered', color: '#4cbf56', accent: '#2a7a32', frame: 'steel',
    affixes: 2, statMult: 1.1, enchant: 1, dropWeight: 22, gemSlots: 0, chime: 'two-note',
    text: 'Two bonus traits.',
  },
  runed: {
    id: 'runed', rank: 3, name: 'Runed', color: '#4a8fe7', accent: '#23508f', frame: 'silver',
    affixes: 3, statMult: 1.2, enchant: 1, dropWeight: 7, gemSlots: 1, chime: 'chord',
    text: 'Three bonus traits and a gem slot.',
  },
  storied: {
    id: 'storied', rank: 4, name: 'Storied', color: '#a35ee8', accent: '#5e2f96', frame: 'silver-filigree',
    affixes: 3, statMult: 1.35, enchant: 2, dropWeight: 1.5, gemSlots: 1, chime: 'arpeggio',
    named: true, unidentified: true,
    text: 'A generated name, a lore line and a minor power. Drops unidentified.',
  },
  heirloom: {
    id: 'heirloom', rank: 5, name: 'Heirloom', color: '#e8b83a', accent: '#8a5a12', frame: 'gold-filigree',
    affixes: 0, statMult: 1.5, enchant: 2, dropWeight: 0, gemSlots: 2, chime: 'bell-arpeggio',
    named: true, handmade: true,
    text: 'Hand-designed, named, a signature power and often a map power.',
  },
  regalia: {
    id: 'regalia', rank: 6, name: 'Regalia', color: '#2fb8a6', accent: '#11685c', frame: 'verdigris',
    affixes: 0, statMult: 1.5, enchant: 2, dropWeight: 0, gemSlots: 1, chime: 'bell-arpeggio',
    named: true, handmade: true, set: true,
    text: 'Set pieces. Wear more of the set for set bonuses.',
  },
  primal: {
    id: 'primal', rank: 7, name: 'Primal', color: '#fffaf0', accent: '#ffcf6b', frame: 'living-flame',
    affixes: 0, statMult: 1.8, enchant: 3, dropWeight: 0, gemSlots: 3, chime: 'choir',
    named: true, handmade: true,
    text: 'Endgame and world-boss relics. White flame.',
  },
});

// Tiers a random roll can produce (the rest are hand-made).
export const RANDOM_RARITIES = Object.freeze(['worn', 'wrought', 'tempered', 'runed', 'storied']);
