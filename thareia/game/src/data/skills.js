// Data-driven skills. rules/battle.js interprets the `effects` list; there is no per-skill code.
// Each skill belongs to an Accretion Domain from the character sheet so the Domain tree can
// adopt it later.
//
// target: enemy | all-enemies | ally | ally-ko | all-allies | self   (relative to the user)
// delay:  multiplies the user's ribbon delay (0.6 = quick, 1.2 = slow)
//
// Effect types:
//   attack  { weapon, dice, diceEvery, kind, aspect, stat, hit, mult, grip, bonusDice:[{dice,aspect}], riders:[...], noMod }
//           d20 + bonus vs Guard (graze/crit rules apply). weapon:true uses the wielded weapon;
//           otherwise dice + stat. riders apply on a hit or crit only. grip = extra grip damage dice.
//   damage  { dice, diceEvery, kind, aspect, stat, save, riders }   no attack roll; a save halves it
//   heal    { dice, diceEvery, stat, pct }       pct = fraction of target max HP added
//   status  { status, stacks, turns, save, value:{dice,stat}, self }   self:true -> lands on the user
//   cleanse { statuses:[...] } or { harmful:n }
//   revive  { pct }
//   grip    { dice, stat }                        pure grip damage (no roll)
//   reveal  { ahead, all }                        pre-rolls and shows the target's next intent(s)
//   surge   { amount }   mp { amount }
// diceEvery: one more die every N levels (a L1 '1d8' with diceEvery 3 is 3d8 at L7).

import { deepFreeze } from '../core/freeze.js';

export const SKILLS = deepFreeze({
  // ---- Hearthwarden: relic arts (granted by the starter) ----------------------------------
  'kindle-strike': {
    id: 'kindle-strike', name: 'Kindle Strike', domain: 'combat', mp: 3, delay: 1, target: 'enemy',
    text: 'Hearthbrand flares: weapon attack +1d6 ember that sets the foe Burning.',
    effects: [{ type: 'attack', weapon: true, bonusDice: [{ dice: '1d6', aspect: 'ember' }], riders: [{ type: 'status', status: 'burning' }] }],
  },
  'stillwater-thrust': {
    id: 'stillwater-thrust', name: 'Stillwater Thrust', domain: 'combat', mp: 3, delay: 1, target: 'enemy',
    text: 'A thrust as cold as the lake: weapon attack +1d6 frost, 2 stacks of Chilled.',
    effects: [{ type: 'attack', weapon: true, bonusDice: [{ dice: '1d6', aspect: 'frost' }], riders: [{ type: 'status', status: 'chilled', stacks: 2 }] }],
  },
  'sunder': {
    id: 'sunder', name: 'Sunder', domain: 'physical', mp: 3, delay: 1.2, target: 'enemy',
    text: 'Cairnmaul comes down like a rockslide: crushing weapon attack, +1d8 grip damage, Staggers.',
    effects: [{ type: 'attack', weapon: true, kind: 'crush', grip: '1d8', bonusDice: [{ dice: '1d6', aspect: 'stone' }], riders: [{ type: 'status', status: 'staggered' }] }],
  },
  // ---- Hearthwarden: levels ----------------------------------------------------------------
  'challenge': {
    id: 'challenge', name: 'Challenge', domain: 'combat', mp: 2, delay: 0.8, target: 'enemy',
    text: 'Plant your feet and call it out. The foe is Provoked into attacking you, and you Guard.',
    effects: [{ type: 'status', status: 'provoked' }, { type: 'status', status: 'guarding', self: true }],
  },
  'wrench': {
    id: 'wrench', name: 'Wrench Free', domain: 'physical', mp: 2, delay: 1, target: 'enemy',
    text: 'Grab the relic and twist: half-damage weapon attack, 2d6 + STR grip damage.',
    effects: [{ type: 'attack', weapon: true, mult: 0.5, grip: '2d6', gripStat: 'STR' }],
  },
  'rally': {
    id: 'rally', name: 'Rally the Hearth', domain: 'influence', mp: 4, delay: 1, target: 'all-allies',
    text: 'A Warden\'s shout: every ally heals 1d6 + CHA, shakes off fear and gains Legend Surge.',
    effects: [{ type: 'heal', dice: '1d6', stat: 'CHA', diceEvery: 4 }, { type: 'cleanse', statuses: ['frightened'] }, { type: 'surge', amount: 10 }],
  },

  // ---- Pip, Thornhollow scout (Survival) -----------------------------------------------------
  'disarm': {
    id: 'disarm', name: 'Disarm', domain: 'survival', mp: 2, delay: 1, target: 'enemy',
    text: 'An arrow for the strap, not the heart: half-damage attack, 2d6 + DEX grip damage.',
    effects: [{ type: 'attack', weapon: true, mult: 0.5, grip: '2d6', gripStat: 'DEX' }],
  },
  'mark-prey': {
    id: 'mark-prey', name: 'Mark Prey', domain: 'survival', mp: 2, delay: 0.6, target: 'enemy',
    text: 'Pip calls the weak spot. The foe is Marked: attacks have advantage and deal +2.',
    effects: [{ type: 'status', status: 'marked' }],
  },
  'knife-work': {
    id: 'knife-work', name: 'Knife Work', domain: 'survival', mp: 1, delay: 0.6, target: 'enemy',
    text: 'Quick as a wren: a belt-knife cut (1d4 + DEX, +1 to hit) that leaves it Bleeding.',
    effects: [{ type: 'attack', dice: '1d4', kind: 'pierce', stat: 'DEX', hit: 1, riders: [{ type: 'status', status: 'bleeding' }] }],
  },
  'volley': {
    id: 'volley', name: 'Volley', domain: 'survival', mp: 4, delay: 1.1, target: 'all-enemies',
    text: 'Three arrows in the air at once: an attack against every foe at 60% damage.',
    effects: [{ type: 'attack', weapon: true, mult: 0.6 }],
  },

  // ---- Bryn the Bark-Reader (Knowledge) ------------------------------------------------------
  'analyze': {
    id: 'analyze', name: 'Analyze', domain: 'knowledge', mp: 2, delay: 0.7, target: 'enemy',
    text: 'Bryn reads it like bark: reveals weaknesses, grip and its next intent, and Exposes it (-2 Guard).',
    effects: [{ type: 'reveal', ahead: 1 }, { type: 'status', status: 'exposed' }],
  },
  'rootbind': {
    id: 'rootbind', name: 'Rootbind', domain: 'knowledge', mp: 3, delay: 1, target: 'enemy',
    text: 'Roots erupt: 1d6 + INT verdant damage, and the foe is Rooted unless it makes a STR save.',
    effects: [{ type: 'damage', dice: '1d6', stat: 'INT', kind: 'verdant', aspect: 'verdant', diceEvery: 5 }, { type: 'status', status: 'rooted', save: 'STR' }],
  },
  'read-the-rings': {
    id: 'read-the-rings', name: 'Read the Rings', domain: 'knowledge', mp: 5, delay: 1, target: 'all-allies',
    text: 'The rings of the old wood say what comes next: every ally is Hasted and every foe\'s next intent is revealed.',
    effects: [{ type: 'status', status: 'hasted' }, { type: 'reveal', ahead: 1, all: true }],
  },
  'heartwood-splinters': {
    id: 'heartwood-splinters', name: 'Heartwood Splinters', domain: 'knowledge', mp: 4, delay: 1.1, target: 'all-enemies',
    text: 'A burst of ironwood shards: 1d8 + INT verdant to every foe, DEX save for half.',
    effects: [{ type: 'damage', dice: '1d8', stat: 'INT', kind: 'pierce', aspect: 'verdant', diceEvery: 5, save: 'DEX' }],
  },

  // ---- Sister Alondra of Fawnrest (Attunement) -----------------------------------------------
  'mend': {
    id: 'mend', name: 'Mend', domain: 'attunement', mp: 3, delay: 1, target: 'ally',
    text: 'Warm light knits flesh: heal 1d8 + WIS (one more d8 every 3 levels).',
    effects: [{ type: 'heal', dice: '1d8', stat: 'WIS', diceEvery: 3 }],
  },
  'radiant-lance': {
    id: 'radiant-lance', name: 'Radiant Lance', domain: 'attunement', mp: 3, delay: 1, target: 'enemy',
    text: 'A spear of shrine-light: WIS spell attack for 2d6 radiant (one more d6 every 4 levels).',
    effects: [{ type: 'attack', dice: '2d6', kind: 'radiant', aspect: 'radiant', stat: 'WIS', diceEvery: 4, noMod: true, ranged: true }],
  },
  'ward': {
    id: 'ward', name: 'Ward', domain: 'attunement', mp: 3, delay: 0.8, target: 'ally',
    text: 'A shimmer that soaks 2d6 + WIS damage for 3 turns.',
    effects: [{ type: 'status', status: 'warded', value: { dice: '2d6', stat: 'WIS', diceEvery: 4 } }],
  },
  'revive': {
    id: 'revive', name: 'Revive', domain: 'attunement', mp: 6, delay: 1.2, target: 'ally-ko',
    text: 'Alondra calls them back by name. A fallen ally rises with 30% HP.',
    effects: [{ type: 'revive', pct: 0.3 }],
  },
  'dawnsong': {
    id: 'dawnsong', name: 'Dawnsong', domain: 'attunement', mp: 7, delay: 1.2, target: 'all-allies',
    text: 'The Fawnrest hymn: every ally heals 1d8 + WIS and sheds one harmful status.',
    effects: [{ type: 'heal', dice: '1d8', stat: 'WIS', diceEvery: 4 }, { type: 'cleanse', harmful: 1 }],
  },

  // ---- relic arts claimed from holders --------------------------------------------------------
  'hew': {
    id: 'hew', name: 'Hew the Hedge', domain: 'physical', mp: 3, delay: 1.1, target: 'all-enemies',
    text: 'Thornsplitter sweeps wide: a weapon attack against every foe at 75% damage.',
    effects: [{ type: 'attack', weapon: true, mult: 0.75 }],
  },
  'tally-cut': {
    id: 'tally-cut', name: 'Tally Cut', domain: 'combat', mp: 2, delay: 0.7, target: 'enemy',
    text: 'One more notch on the spine: a quick weapon attack that leaves 2 stacks of Poisoned.',
    effects: [{ type: 'attack', weapon: true, riders: [{ type: 'status', status: 'poisoned', stacks: 2 }] }],
  },
});
