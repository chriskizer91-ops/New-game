// Omens: elite traits that stack on stronger foes. The Waking and Grudges add more of them.
// Every Omen also adds TUNING.foe.omenHp HP and TUNING.foe.omenReward to xp and gold, and
// half a point of loot luck.
//
// Engine fields: riders (applied by every hit the foe lands), reflect (fraction of melee
// damage bounced back), split (HP fraction at which it becomes two), frenzyBelow (HP fraction
// under which its delay halves: it acts twice as often), guard, speed, gripMult, resist.

import { deepFreeze } from '../core/freeze.js';

export const OMENS = deepFreeze({
  emberblooded: {
    id: 'emberblooded', name: 'Emberblooded', color: '#e8622c',
    text: 'Its hits set you Burning. Resists ember.',
    riders: [{ type: 'status', status: 'burning' }], resist: ['ember'],
  },
  thornskinned: {
    id: 'thornskinned', name: 'Thornskinned', color: '#5dbb4f',
    text: 'Reflects a quarter of melee damage back at the attacker.',
    reflect: 0.25,
  },
  twinned: {
    id: 'twinned', name: 'Twinned', color: '#b9a6ff',
    text: 'Splits into two at half health.',
    split: 0.5, notFor: ['champion'],
  },
  frenzied: {
    id: 'frenzied', name: 'Frenzied', color: '#d23b3b',
    text: 'Below a quarter of its health it acts twice as often.',
    frenzyBelow: 0.25,
  },
  ironclad: {
    id: 'ironclad', name: 'Ironclad', color: '#9aa4ad',
    text: '+2 Guard, and its grip is half again as strong.',
    guard: 2, gripMult: 1.5,
  },
  swift: {
    id: 'swift', name: 'Swift', color: '#f4d35e',
    text: '+4 speed: it acts sooner and more often.',
    speed: 4,
  },
});

export const OMEN_IDS = Object.freeze(Object.keys(OMENS));
