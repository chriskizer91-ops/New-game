// Tiny LRU memo used by every art module: rasters are expensive (vector -> lit pixels),
// composes are cheap. Keys are strings; values are whatever the builder returns.
export function lru(limit = 256) {
  const m = new Map();
  return {
    get(key, build) {
      if (m.has(key)) { const v = m.get(key); m.delete(key); m.set(key, v); return v; }
      const v = build();
      m.set(key, v);
      if (m.size > limit) m.delete(m.keys().next().value);
      return v;
    },
    clear() { m.clear(); },
    get size() { return m.size; },
  };
}

// identity key for objects (art params may hold closures, so they are keyed by identity)
const ids = new WeakMap();
let nextId = 1;
export function objId(o) {
  if (!o || typeof o !== 'object') return String(o);
  let v = ids.get(o);
  if (!v) { v = '#' + (nextId++); ids.set(o, v); }
  return v;
}
