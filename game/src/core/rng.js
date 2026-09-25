// Seeded, serializable RNG (mulberry32). Rules code must use this, never Math.random.

function hashSeed(seed) {
  if (typeof seed === 'number') return seed >>> 0;
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function createRng(seed = 1) {
  let a = hashSeed(seed);
  const next = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: arr => arr[Math.floor(next() * arr.length)],
    chance: p => next() < p,
    fork: label => createRng((hashSeed(label) ^ Math.floor(next() * 4294967296)) >>> 0),
    getState: () => a,
    setState: s => { a = s | 0; },
  };
  return rng;
}
