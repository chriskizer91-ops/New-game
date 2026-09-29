// Tamsin's kits (M5 spec §4.3): each of her duels after the second can give her a kit of its own. A spawn's
// variant '$rival:<duel>' resolves (rules/gauntlet.js resolveSpawn) to the rival starter's variant of the
// `tamsin` family plus RIVAL_KITS[rivalStarter][duel]:
//   moves     added to the variant's moves (her Arts and the relic Art she carries stay hers)
//   table     replaces the variant's d12 table
//   gearTier  her look's gear tier for that duel (optional)
// '$rival' alone keeps its M3/M4 meaning: the Eldest Tree and Scorchgate duels use no kit.
// withKit(family, variant, kit) merges a kit over a family already merged with its variant.
// Owner: P1 (M5). The numbers are tuned with tools/sim.mjs (P4: Tamsin at Ironhold, party win 55-70%; M6 P4: the
// Rotbridge kit, the same for each starter, party win 55-70%).

import { deepFreeze } from '../core/freeze.js';

const atk = (dice, kind, o = {}) => ({ type: 'attack', dice, kind, ...o });
const status = (id, o = {}) => ({ type: 'status', status: id, ...o });

// Ironhold: a month on Harrow's trail in the Ironspire, and the Ironvein Bracers on her wrists.
const IRONHOLD_MOVES = {
  'iron-grip': { name: 'Iron Grip', target: 'enemy', text: 'She catches your arm in an Ironvein bracer and wrenches: you Stagger.', effects: [atk('2d8', 'crush', { riders: [status('staggered')] })] },
  'hunters-mark': { name: 'Hunter\'s Mark', target: 'enemy', text: 'A month on Harrow\'s trail taught her where to look: you are Marked.', effects: [status('marked')] },
  'bracer-block': { name: 'Bracer Block', target: 'self', text: 'She takes the blow on the bracers: Guarding, and Warded.', effects: [status('guarding'), status('warded', { value: { dice: '1d8', diceEvery: 3 } })] },
};
// her relic Art (the rival starter's move in data/foes.js) keeps faces 8-11, as in her earlier duels
const ironhold = art => ({
  moves: IRONHOLD_MOVES,
  table: [[1, 3, 'riposte'], [4, 4, 'iron-grip'], [5, 5, 'cheap-shot'], [6, 6, 'hunters-mark'], [7, 7, 'bracer-block'], [8, 11, art], [12, 12, 'not-like-this']],
});

// Rotbridge (M6 spec §4.3): a month in the fen following the soot-sealed letters, the Bogstriders on her feet, and
// nothing much left to lose. Something fen-footed (Fen-Step, Mire-Footing) and something desperate (All In).
const ROTBRIDGE_MOVES = {
  'fen-step': { name: 'Fen-Step', target: 'enemy', text: 'The Bogstriders carry her across the mud where you would sink, and she is behind you before you turn: 2d10 slashing, and she is Hasted.', effects: [atk('2d10', 'slash'), status('hasted', { self: true })] },
  'mire-footing': { name: 'Mire-Footing', target: 'enemy', text: 'She finds the one plank that holds and leaves you the rotten one. DEX save or Rooted.', effects: [status('rooted', { save: 'DEX' })] },
  'all-in': { name: 'All In', target: 'enemy', charge: true, text: 'She stops guarding and puts everything she has left into one cut, charging: 4d10 slashing, and it leaves her wide open (Exposed).', effects: [atk('4d10', 'slash'), status('exposed', { self: true })] },
};
const rotbridge = art => ({
  moves: ROTBRIDGE_MOVES,
  table: [[1, 3, 'riposte'], [4, 4, 'fen-step'], [5, 5, 'cheap-shot'], [6, 6, 'mire-footing'], [7, 7, 'all-in'], [8, 11, art], [12, 12, 'not-like-this']],
});

export const RIVAL_KITS = deepFreeze({
  hearthbrand: { ironhold: ironhold('kindled-cut'), rotbridge: rotbridge('kindled-cut') },
  'stillwater-lance': { ironhold: ironhold('still-point'), rotbridge: rotbridge('still-point') },
  cairnmaul: { ironhold: ironhold('cairn-swing'), rotbridge: rotbridge('cairn-swing') },
});

export function withKit(fam, variant, kit) {
  const k = kit && RIVAL_KITS[variant]?.[kit];
  return k ? { ...fam, moves: { ...fam.moves, ...(k.moves || {}) }, ...(k.table ? { table: k.table } : {}) } : fam;
}
