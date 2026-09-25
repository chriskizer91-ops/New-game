// Status effects, interpreted by rules/battle.js. Durations count the bearer's own turns and
// tick down at the END of each of its turns; `until: 'turn-start'` statuses drop off as the
// bearer's next turn begins. Damage-over-time ticks at the START of the bearer's turn.
//
// Engine fields:
//   harmful        cleansable, counts for "vs unaware" style bonuses
//   turns          default duration          maxStacks  stacks cap (default 1: refresh)
//   atMax          status that replaces this one when stacks reach maxStacks (chilled -> frozen)
//   tick           { dice, kind, aspect, perStack } damage at turn start
//   tickHeal       heals `value` (set when applied) at turn start
//   delayMult      multiplies the bearer's ribbon delay (hasted < 1 < rooted)
//   delayPerStack  extra delay per stack (chilled)
//   guard          Guard modifier while active
//   damageMult     multiplies damage the bearer takes (guarding)
//   attackDis      bearer attacks with disadvantage
//   attackersAdv   attacks against the bearer have advantage
//   bonusDmg       flat damage added to every hit against the bearer
//   absorb         `value` soaks damage before HP (warded)
//   skipTurn       bearer loses its turn (frozen)
//   crushMult      crush damage multiplier against the bearer; `shatter` removes it on a crush hit
//   push           ribbon delay added on application (staggered); `breaksCharge` cancels a charge
//   forceTarget    bearer must target the status source with single-target moves (provoked)

import { deepFreeze } from '../core/freeze.js';

export const STATUSES = deepFreeze({
  burning: {
    id: 'burning', name: 'Burning', harmful: true, turns: 3, maxStacks: 1,
    tick: { dice: '1d6', kind: 'ember', aspect: 'ember' },
    text: 'Takes 1d6 ember damage at the start of each turn.',
  },
  chilled: {
    id: 'chilled', name: 'Chilled', harmful: true, turns: 3, maxStacks: 3, atMax: 'frozen',
    delayPerStack: 0.1,
    text: 'Each stack slows it. Three stacks and it freezes solid.',
  },
  frozen: {
    id: 'frozen', name: 'Frozen', harmful: true, turns: 1, skipTurn: true, attackersAdv: true,
    crushMult: 1.5, shatter: true,
    text: 'Loses its next turn. Attacks against it have advantage; crush shatters the ice for 1.5x.',
  },
  poisoned: {
    id: 'poisoned', name: 'Poisoned', harmful: true, turns: 4, maxStacks: 3,
    tick: { dice: '1d4', kind: 'blight', aspect: 'blight', perStack: true },
    text: 'Takes 1d4 blight damage per stack at the start of each turn.',
  },
  bleeding: {
    id: 'bleeding', name: 'Bleeding', harmful: true, turns: 3, maxStacks: 3,
    tick: { dice: '1d4', kind: 'pierce', aspect: null, perStack: true },
    text: 'Takes 1d4 damage per stack at the start of each turn.',
  },
  staggered: {
    id: 'staggered', name: 'Staggered', harmful: true, until: 'turn-start', push: 35, breaksCharge: true, guard: -1,
    text: 'Knocked back on the Initiative Ribbon. A charging move is cancelled.',
  },
  frightened: {
    id: 'frightened', name: 'Frightened', harmful: true, turns: 2, attackDis: true,
    text: 'Attacks with disadvantage.',
  },
  rooted: {
    id: 'rooted', name: 'Rooted', harmful: true, turns: 2, attackersAdv: true, delayMult: 1.2,
    text: 'Held fast by roots: attacks against it have advantage and it acts later.',
  },
  marked: {
    id: 'marked', name: 'Marked', harmful: true, turns: 3, attackersAdv: true, bonusDmg: 2,
    text: 'Hunted: attacks against it have advantage and deal +2 damage.',
  },
  exposed: {
    id: 'exposed', name: 'Exposed', harmful: true, turns: 3, guard: -2,
    text: 'Its weak points are known: -2 Guard.',
  },
  provoked: {
    id: 'provoked', name: 'Provoked', harmful: true, turns: 2, forceTarget: true,
    text: 'Must strike at whoever provoked it.',
  },
  warded: {
    id: 'warded', name: 'Warded', harmful: false, turns: 3, absorb: true,
    text: 'A shimmer of light soaks up damage before HP.',
  },
  hasted: {
    id: 'hasted', name: 'Hasted', harmful: false, turns: 2, delayMult: 0.7,
    text: 'Acts sooner on the Initiative Ribbon.',
  },
  regenerating: {
    id: 'regenerating', name: 'Regenerating', harmful: false, turns: 3, tickHeal: true,
    text: 'Heals at the start of each turn.',
  },
  guarding: {
    id: 'guarding', name: 'Guarding', harmful: false, until: 'turn-start', damageMult: 0.5, guard: 2,
    text: 'Defending: +2 Guard and half damage until its next turn.',
  },
});
