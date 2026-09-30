// Tamsin's kits (M5 spec §4.3): each of her duels after the second can give her a kit of its own. A spawn's
// variant '$rival:<duel>' resolves (rules/gauntlet.js resolveSpawn) to the rival starter's variant of the
// `tamsin` family plus RIVAL_KITS[rivalStarter][duel]:
//   moves     added to the variant's moves (her Arts and the relic Art she carries stay hers)
//   table     replaces the variant's d12 table
//   gearTier  her look's gear tier for that duel (optional)
// '$rival' alone keeps its M3/M4 meaning: the Eldest Tree and Scorchgate duels use no kit.
// withKit(family, variant, kit) merges a kit over a family already merged with its variant.
// Owner: P1 (M5). The numbers are tuned with tools/sim.mjs (P4: Tamsin at Ironhold, party win 55-70%; M6 P4: the
// Rotbridge kit, the same for each starter, party win 55-70%; M7 P4: the finale kit, Tamsin on the party's side).

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

// The finale (M7 spec A12, §3.5, §4.3; P4 with P1): Tamsin beside the party against the Unsmith, a guest the engine
// plays and nobody commands, at party level + 2 in her finale look (gear tier 5). She sold her starter on the black barge for
// Tamsin's Bargain (No. 71), and wears it: the violet-black sword is her old starter's darker twin, so her Art is the
// Bargain swung in her old relic's manner (Black Kindling, Black Stillness, Black Weight). Every move goes at the
// Unsmith, or at whatever stands beside him, but one: the Bargain's edge; Pry It Loose, which levers at his pieces (the
// `grip` effect, on top of a crushing blow); Inside His Swing, a Stagger that breaks the next of his two moves; On
// Your Feet, a ward over whichever of the party is worst hurt; and Not This Time, her own last stand. The same kit for
// each starter but its Art. Her blows add a die every 12 levels (a foe's add one every 3) and land at half weight
// (`mult`): she fights like one more strong hero, not like a Champion. Tuned with tools/sim.mjs (the Unsmith with Tamsin, first try 30-40%).
const FINALE_MOVES = {
  'bargains-edge': { name: 'The Bargain\'s Edge', target: 'enemy', text: 'Tamsin\'s Bargain, the violet-black sword she sold her starter for, cuts at him: 1d10 slashing and 1d6 blight.', effects: [atk('1d10', 'slash', { diceEvery: 12, mult: 0.5, bonusDice: [{ dice: '1d6', aspect: 'blight' }] })] },
  'pry-it-loose': { name: 'Pry It Loose', target: 'enemy', text: 'She gets the Bargain\'s point under his grip and leans on it: 1d8 crushing, and 4d6 grip damage to one of his pieces.', effects: [atk('1d8', 'crush', { diceEvery: 12, mult: 0.5 }), { type: 'grip', dice: '4d6' }] },
  'inside-his-swing': { name: 'Inside His Swing', target: 'enemy', text: 'She steps inside his swing before it lands: 1d6 crushing, and he Staggers (the next of his moves comes to nothing).', effects: [atk('1d6', 'crush', { diceEvery: 12, mult: 0.5, riders: [status('staggered')] })] },
  'on-your-feet': { name: 'On Your Feet', target: 'ally', text: '"On your feet, Warden." She puts herself in front of whichever of you is worst hurt: that one is Warded.', effects: [status('warded', { value: { dice: '2d8', diceEvery: 3 } })] },
  'not-this-time': { name: 'Not This Time', target: 'self', when: { hpBelow: 0.35 }, fallback: 'bargains-edge', text: 'Not this time. Not down here. She steadies: 2d8 healing, and Warded.', effects: [{ type: 'heal', dice: '2d8', diceEvery: 3 }, status('warded', { value: { dice: '1d6', diceEvery: 3 } })] },
};
// her Art: the Bargain, swung the way she swung the starter she sold for it (faces 8-10, as her Arts sit high)
const FINALE_ARTS = {
  hearthbrand: ['black-kindling', { name: 'Black Kindling', target: 'enemy', text: 'The Bargain burns violet-black, the way Hearthbrand burned gold in her hands once: 2d8 slashing and blight, and he Burns.', effects: [atk('2d8', 'slash', { diceEvery: 12, mult: 0.5, aspect: 'blight', riders: [status('burning')] })] }],
  'stillwater-lance': ['black-stillness', { name: 'Black Stillness', target: 'enemy', text: 'The Bargain goes very still, then very fast, the way the Stillwater Lance did in her hands once: 2d8 piercing and blight, and he is Chilled.', effects: [atk('2d8', 'pierce', { diceEvery: 12, mult: 0.5, aspect: 'blight', riders: [status('chilled')] })] }],
  cairnmaul: ['black-weight', { name: 'Black Weight', target: 'enemy', charge: true, text: 'She swings the Bargain the way she swung the Cairnmaul once, charging: 3d8 crushing and blight, and he Staggers.', effects: [atk('3d8', 'crush', { diceEvery: 12, mult: 0.5, aspect: 'blight', riders: [status('staggered')] })] }],
};
const finale = rival => {
  const [art, move] = FINALE_ARTS[rival];
  return {
    moves: { ...FINALE_MOVES, [art]: move }, gearTier: 5, // her finale look (P6): the Bargain in her hand, not her starter
    table: [[1, 3, 'bargains-edge'], [4, 5, 'pry-it-loose'], [6, 7, 'inside-his-swing'], [8, 10, art], [11, 11, 'on-your-feet'], [12, 12, 'not-this-time']],
  };
};

export const RIVAL_KITS = deepFreeze({
  hearthbrand: { ironhold: ironhold('kindled-cut'), rotbridge: rotbridge('kindled-cut'), finale: finale('hearthbrand') },
  'stillwater-lance': { ironhold: ironhold('still-point'), rotbridge: rotbridge('still-point'), finale: finale('stillwater-lance') },
  cairnmaul: { ironhold: ironhold('cairn-swing'), rotbridge: rotbridge('cairn-swing'), finale: finale('cairnmaul') },
});

export function withKit(fam, variant, kit) {
  const k = kit && RIVAL_KITS[variant]?.[kit];
  return k ? { ...fam, moves: { ...fam.moves, ...(k.moves || {}) }, ...(k.table ? { table: k.table } : {}) } : fam;
}
