// Small pure helpers shared by the rules modules.

import { createRng } from '../core/rng.js';
import { parseDice } from '../core/dice.js';

export const mod = score => Math.floor(((score ?? 10) - 10) / 2);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Proficiency grows like the character sheet's Imprint Bonus: +2 at L1, +1 every 4 levels.
export const profFor = level => 2 + Math.floor((Math.max(1, level) - 1) / 4);
// Imprint Bonus from a Domain level (1-20): L1-4 +2, L5-8 +3, L9-12 +4, L13-16 +5, L17-20 +6.
export const ibFor = domainLevel => 2 + Math.floor((clamp(domainLevel, 1, 20) - 1) / 4);

export function rngFrom(state) {
  const rng = createRng(0);
  rng.setState(state);
  return rng;
}

// '1d8' with diceEvery 3 at level 7 -> 3d8. Returns parsed terms with the extra dice added
// to the first term.
export function scaledTerms(expr, level = 1, every = 0) {
  const { terms, flat } = parseDice(expr);
  const extra = every ? Math.floor((Math.max(1, level) - 1) / every) : 0;
  return { terms: terms.map((t, i) => (i === 0 ? { ...t, n: t.n + extra } : { ...t })), flat };
}

// Roll parsed terms, returning every face for the dice tray.
export function rollTerms(rng, terms, mult = 1) {
  const dice = [];
  let total = 0;
  for (const t of terms) {
    const n = Math.abs(t.n) * mult;
    for (let i = 0; i < n; i++) {
      const value = rng.int(1, t.sides);
      dice.push({ sides: t.sides, value });
      total += t.n < 0 ? -value : value;
    }
  }
  return { dice, total };
}

export function rollExpr(rng, expr, level = 1, every = 0) {
  const { terms, flat } = scaledTerms(expr, level, every);
  const r = rollTerms(rng, terms);
  return { dice: r.dice, flat, total: r.total + flat };
}

export function avgExpr(expr, level = 1, every = 0) {
  const { terms, flat } = scaledTerms(expr, level, every);
  return terms.reduce((a, t) => a + t.n * (t.sides + 1) / 2, 0) + flat;
}

export function weightedPick(rng, entries) {
  const total = entries.reduce((a, e) => a + Math.max(0, e.w), 0);
  if (total <= 0) return entries[0]?.v;
  let r = rng.next() * total;
  for (const e of entries) {
    r -= Math.max(0, e.w);
    if (r < 0) return e.v;
  }
  return entries[entries.length - 1].v;
}

export const clone = v => structuredClone(v);

export function indexItems(items) {
  if (!items) return {};
  if (Array.isArray(items)) return Object.fromEntries(items.map(it => [it.uid, it]));
  return items;
}
