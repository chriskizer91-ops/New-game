// Shared test helpers (not a test file itself).
import { newGame } from '../src/rules/gauntlet.js';
import { createBattle, current, act, foeTurn } from '../src/rules/battle.js';
import { autoCommand } from '../src/rules/autoplay.js';

// An RNG that returns scripted integers (clamped into range) and then a fallback value.
export function scriptedRng(ints = [], fallback = 3) {
  const q = [...ints];
  return {
    next: () => 0.5,
    int: (lo, hi) => Math.max(lo, Math.min(hi, q.length ? q.shift() : fallback)),
    pick: arr => arr[0],
    chance: () => false,
    fork: () => scriptedRng(),
    getState: () => 0,
    setState: () => {},
  };
}

export function party(opts = {}) {
  const game = newGame({ name: 'Tess', starter: 'hearthbrand', seed: 7, ...opts });
  return { game, heroes: game.party.active.map(id => game.party.roster[id]) };
}

export function battleWith(foes, { seed = 11, starter = 'hearthbrand', ctx = {} } = {}) {
  const { game, heroes } = party({ starter });
  return createBattle({ heroes, foes, seed, ctx: { inventory: game.inventory, bag: game.bag, ...ctx } });
}

export const B = (s, rng) => ({ s, rng, ev: [], touched: new Set(), relic: null });

// Play a battle to the end with the autoplay policy; returns { state, events }.
export function playOut(state, max = 3000) {
  let s = state;
  const events = [...s.openingEvents];
  for (let i = 0; current(s) && i < max; i++) {
    const id = current(s);
    const r = s.units[id].side === 'hero' ? act(s, autoCommand(s, id)) : foeTurn(s);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

// Advance a battle until it is a hero's turn (foes act on their own).
export function toHeroTurn(state) {
  let s = state;
  for (let i = 0; current(s) && s.units[current(s)].side === 'foe' && i < 50; i++) s = foeTurn(s).state;
  return s;
}
