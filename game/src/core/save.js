// Save/load. The game must run when storage is blocked, so every access is guarded.
// Export codes let a player move a save between phone and laptop by copy/paste.

const KEY = 'aethermoor.save.v1';
const SETTINGS_KEY = 'aethermoor.settings.v1';

function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
function safeDel(key) { try { localStorage.removeItem(key); } catch { /* storage blocked */ } }

export function loadGame() {
  const raw = safeGet(KEY);
  if (!raw) return null;
  try { const g = JSON.parse(raw); return g && g.version ? g : null; } catch { return null; }
}
export const saveGame = game => safeSet(KEY, JSON.stringify(game));
export const clearGame = () => safeDel(KEY);
export const hasSave = () => !!loadGame();

export function loadSettings(defaults) {
  try { return { ...defaults, ...(JSON.parse(safeGet(SETTINGS_KEY) || '{}')) }; } catch { return { ...defaults }; }
}
export const saveSettings = s => safeSet(SETTINGS_KEY, JSON.stringify(s));

// Export code: "AETH1." + base64(utf8 JSON). Long but copy/paste friendly.
export function exportCode(game) {
  const bytes = new TextEncoder().encode(JSON.stringify(game));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return 'AETH1.' + btoa(bin);
}
const DAMAGED = 'The save code is damaged. Copy the whole code and try again.';

// A pasted code may come from anyone, and screens put save values into markup. No string in a
// real save holds angle brackets, so strip them from every value and key.
function scrub(v) {
  if (typeof v === 'string') return v.replace(/[<>]/g, '');
  if (Array.isArray(v)) return v.map(scrub);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [scrub(k), scrub(x)]));
  return v;
}

export function importCode(code) {
  const m = String(code).trim().match(/^AETH1\.([A-Za-z0-9+/=\s]+)$/);
  if (!m) throw new Error('That is not an Aethermoor save code. Codes start with AETH1.');
  let game;
  try {
    const bin = atob(m[1].replace(/\s+/g, ''));
    game = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
  } catch { throw new Error(DAMAGED); }
  if (!game || !game.version || !game.party) throw new Error(DAMAGED);
  return scrub(game);
}
