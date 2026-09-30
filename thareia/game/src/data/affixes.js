// Bonus traits. Prefixes are named for the regions of Aethermoor, suffixes for the Accretion
// Domains of the character sheet. A generated item rolls `rarity.affixes` of these.
//
// value = roll(range) * rarity.statMult + floor(ilvl * perLevel)   (rules/loot.js)
// Quality stars compare the roll against the range (rules/loot.js affixQuality).
//
// Stat keys understood by rules/stats.js:
//   hp mp guard hit dmg speed crit(widens crit range) regen mpRegen healBonus(%) surgeGain(%)
//   gripDmg STR DEX CON INT WIS CHA
//   resist (needs `aspect`, value is %)          extraDice (needs `aspect`: +1d(2*value) on hit)
//   vsHurt (+1d(2*value) vs foes at or below half HP)
//   vsUnaware (+1d(2*value) vs foes that are marked, rooted, frozen or staggered)
// `group` stops two affixes of the same family landing on one item.

import { deepFreeze } from '../core/freeze.js';

const ARMOR = ['head', 'body', 'hands', 'feet', 'offhand'];
const JEWEL = ['amulet', 'ring'];
const ANY = ['weapon', 'offhand', 'head', 'body', 'hands', 'feet', 'amulet', 'ring'];

const P = (id, name, region, stat, range, slots, o = {}) => ({ id, name, type: 'prefix', region, stat, range, slots, minTier: 1, perLevel: 0, ...o });
const S = (id, name, domain, stat, range, slots, o = {}) => ({ id, name, type: 'suffix', domain, stat, range, slots, minTier: 1, perLevel: 0, ...o });

export const AFFIXES = deepFreeze({
  // ---- prefixes: regions ----------------------------------------------------------------
  thornwoven: P('thornwoven', 'Thornwoven', 'Thornhollow', 'regen', [1, 2], ['body', 'feet', ...JEWEL], { perLevel: 0.15, text: 'Regrow {v} HP at the start of each turn' }),
  eldergrown: P('eldergrown', 'Eldergrown', 'Eldergrove', 'hp', [4, 8], ['head', 'body', 'offhand', ...JEWEL], { perLevel: 0.8, text: '+{v} max HP' }),
  mossbound: P('mossbound', 'Mossbound', 'Mosswatch', 'guard', [1, 1], ARMOR, { group: 'guard', text: '+{v} Guard' }),
  ironhold: P('ironhold', 'Ironhold', 'Ironspire', 'guard', [1, 2], ['body', 'offhand', 'head'], { minTier: 2, group: 'guard', text: '+{v} Guard' }),
  fawnlit: P('fawnlit', 'Fawnlit', 'Fawnrest', 'healBonus', [10, 20], ['weapon', 'offhand', ...JEWEL], { text: '+{v}% healing done' }),
  scorchgate: P('scorchgate', 'Scorchgate', 'Sunscorch', 'extraDice', [2, 4], ['weapon'], { aspect: 'ember', group: 'extra', text: '+1d{d} ember damage on hit' }),
  frostmere: P('frostmere', 'Frostmere', 'Ironspire', 'extraDice', [2, 4], ['weapon'], { aspect: 'frost', group: 'extra', text: '+1d{d} frost damage on hit' }),
  stormwatch: P('stormwatch', 'Stormwatch', 'Ironspire', 'extraDice', [2, 4], ['weapon'], { aspect: 'storm', group: 'extra', text: '+1d{d} storm damage on hit' }),
  bogmire: P('bogmire', 'Bogmire', 'Gloomfen', 'extraDice', [2, 4], ['weapon'], { aspect: 'blight', group: 'extra', text: '+1d{d} blight damage on hit' }),
  blackwater: P('blackwater', 'Blackwater', 'Gloomfen', 'extraDice', [2, 4], ['weapon'], { aspect: 'tide', group: 'extra', text: '+1d{d} tide damage on hit' }),
  sandspire: P('sandspire', 'Sandspire', 'Sunscorch', 'resist', [10, 20], ARMOR, { aspect: 'ember', perLevel: 0.5, group: 'resist', text: 'Resist ember {v}%' }),
  willowmurk: P('willowmurk', 'Willowmurk', 'Gloomfen', 'resist', [10, 20], ARMOR, { aspect: 'blight', perLevel: 0.5, group: 'resist', text: 'Resist blight {v}%' }),
  misthollow: P('misthollow', 'Misthollow', 'Gloomfen', 'resist', [10, 20], ARMOR, { aspect: 'verdant', perLevel: 0.5, group: 'resist', text: 'Resist verdant {v}%' }),
  dusthaven: P('dusthaven', 'Dusthaven', 'Sunscorch', 'speed', [1, 2], ['weapon', 'feet', 'hands', ...JEWEL], { group: 'speed', text: '+{v} speed' }),
  hearthstone: P('hearthstone', 'Hearthstone', 'Hearthstone Keep', 'surgeGain', [10, 25], ANY, { text: '+{v}% Legend Surge gain' }),
  veilkissed: P('veilkissed', "Veilkissed", "Peak's Veil", 'mp', [3, 6], ['head', 'offhand', 'weapon', ...JEWEL], { perLevel: 0.4, text: '+{v} MP' }),

  // ---- suffixes: Domains ------------------------------------------------------------------
  titan: S('titan', 'of the Titan', 'physical', 'STR', [1, 2], ['weapon', 'hands', ...JEWEL], { group: 'ability', text: '+{v} STR' }),
  unyielding: S('unyielding', 'of the Unyielding', 'physical', 'CON', [1, 2], ['body', 'head', ...JEWEL], { group: 'ability', text: '+{v} CON' }),
  sprinter: S('sprinter', 'of the Sprinter', 'physical', 'DEX', [1, 2], ['feet', 'hands', 'weapon', ...JEWEL], { group: 'ability', text: '+{v} DEX' }),
  duelist: S('duelist', 'of the Duelist', 'combat', 'hit', [1, 2], ['weapon', 'hands', 'ring'], { text: '+{v} to hit' }),
  executioner: S('executioner', 'of the Executioner', 'combat', 'vsHurt', [2, 4], ['weapon'], { group: 'vs', text: '+1d{d} damage vs foes at half HP or less' }),
  guardian: S('guardian', 'of the Guardian', 'combat', 'guard', [1, 1], ['offhand', 'body', 'amulet'], { minTier: 2, text: '+{v} Guard' }),
  stalker: S('stalker', 'of the Stalker', 'survival', 'vsUnaware', [2, 4], ['weapon'], { group: 'vs', text: '+1d{d} damage vs marked, rooted, frozen or staggered foes' }),
  pathfinder: S('pathfinder', 'of the Pathfinder', 'survival', 'speed', [1, 1], ['feet', 'head', 'body'], { group: 'speed', text: '+{v} speed' }),
  smith: S('smith', 'of the Smith', 'craft', 'gripDmg', [2, 4], ['weapon', 'hands'], { text: '+{v} grip damage' }),
  forge: S('forge', 'of the Forge', 'craft', 'dmg', [1, 2], ['weapon', 'hands'], { text: '+{v} damage' }),
  scholar: S('scholar', 'of the Scholar', 'knowledge', 'INT', [1, 2], ['head', 'offhand', 'weapon', ...JEWEL], { group: 'ability', text: '+{v} INT' }),
  herald: S('herald', 'of the Herald', 'influence', 'CHA', [1, 2], ['head', 'body', ...JEWEL], { group: 'ability', text: '+{v} CHA' }),
  attuned: S('attuned', 'of the Attuned', 'attunement', 'WIS', [1, 2], ['head', 'offhand', 'weapon', ...JEWEL], { group: 'ability', text: '+{v} WIS' }),
  mender: S('mender', 'of the Mender', 'attunement', 'healBonus', [10, 20], ['offhand', 'weapon', 'amulet'], { text: '+{v}% healing done' }),
  seer: S('seer', 'of the Seer', 'psionics', 'crit', [1, 1], ['weapon', 'ring', 'hands'], { minTier: 3, text: 'Legend Strike range +{v}' }),
  ironwill: S('ironwill', 'of the Iron Will', 'psionics', 'mpRegen', [1, 1], ['head', 'amulet', 'ring'], { minTier: 2, text: 'Regain {v} MP at the start of each turn' }),
  wolffriend: S('wolffriend', 'of the Wolf-Friend', 'beastmastery', 'hp', [3, 6], ['body', 'feet', 'amulet'], { perLevel: 0.6, text: '+{v} max HP' }),
});
