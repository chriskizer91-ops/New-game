// Tamsin's kits (M5 spec §4.3): each of her duels after the second can give her a kit of its own. A spawn's
// variant '$rival:<duel>' resolves (rules/gauntlet.js resolveSpawn) to the rival starter's variant of the
// `tamsin` family plus RIVAL_KITS[rivalStarter][duel]:
//   moves     added to the variant's moves (her Arts and the relic Art she carries stay hers)
//   table     replaces the variant's d12 table
//   gearTier  her look's gear tier for that duel (optional)
// '$rival' alone keeps its M3/M4 meaning: the Eldest Tree and Scorchgate duels use no kit.
// withKit(family, variant, kit) merges a kit over a family already merged with its variant.
// Owner: P1 (M5). The numbers are tuned with tools/sim.mjs (P4: Tamsin at Ironhold, party win 55-70%).

import { deepFreeze } from '../core/freeze.js';

const atk = (dice, kind, o = {}) => ({ type: 'attack', dice, kind, ...o });
const status = (id, o = {}) => ({ type: 'status', status: id, ...o });

// Ironhold: a month on Harrow's trail in the Ironspire, and the Ironvein Bracers on her wrists.
const IRONHOLD_MOVES = {
  'iron-grip': { name: 'Iron Grip', target: 'enemy', text: 'She catches your arm in an Ironvein bracer and wrenches: you Stagger.', effects: [atk('1d8', 'crush', { riders: [status('staggered')] })] },
  'hunters-mark': { name: 'Hunter\'s Mark', target: 'enemy', text: 'A month on Harrow\'s trail taught her where to look: you are Marked.', effects: [status('marked')] },
  'bracer-block': { name: 'Bracer Block', target: 'self', text: 'She takes the blow on the bracers: Guarding, and Warded.', effects: [status('guarding'), status('warded', { value: { dice: '1d8', diceEvery: 3 } })] },
};
// her relic Art (the rival starter's move in data/foes.js) keeps faces 8-11, as in her earlier duels
const ironhold = art => ({
  moves: IRONHOLD_MOVES,
  table: [[1, 3, 'riposte'], [4, 4, 'iron-grip'], [5, 5, 'cheap-shot'], [6, 6, 'hunters-mark'], [7, 7, 'bracer-block'], [8, 11, art], [12, 12, 'not-like-this']],
});

export const RIVAL_KITS = deepFreeze({
  hearthbrand: { ironhold: ironhold('kindled-cut') },
  'stillwater-lance': { ironhold: ironhold('still-point') },
  cairnmaul: { ironhold: ironhold('cairn-swing') },
});

export function withKit(fam, variant, kit) {
  const k = kit && RIVAL_KITS[variant]?.[kit];
  return k ? { ...fam, moves: { ...fam.moves, ...(k.moves || {}) }, ...(k.table ? { table: k.table } : {}) } : fam;
}
