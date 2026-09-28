// Save/load. The game must run when storage is blocked, so every access is guarded.
// Export codes let a player move a save between phone and laptop by copy/paste.
//
// M3 (spec §4.8; owner WP2). This module still imports nothing game-specific: the v1 -> v2
// migration is injected (loadGame(migrate), importCode(code, migrate), restoreBackup(migrate)).
//   aethermoor.save.v2       the live save (version 2 games)
//   aethermoor.save.v1       the M2 save: read only in M3, never written, never removed
//   aethermoor.save.v2.bak   backup of the previous v2 save
//   aethermoor.v1.migrated   '1' once v1 has been carried over or declined
// SCAFFOLD (transitional, so M2 keeps working until WP2/WP8 switch newGame and app.js to v2):
//   - loadGame() with no migrate argument keeps the M2 behaviour: returns the raw v1 game or null.
//   - saveGame / exportCode pick by game.version: version 1 games still go to the v1 key / AETH1.
//   - clearGame removes v2 and (M2 behaviour, until WP2 drops it) v1.

const KEY_V1 = 'aethermoor.save.v1';
const KEY_V2 = 'aethermoor.save.v2';
const KEY_BAK = 'aethermoor.save.v2.bak';
const KEY_MARK = 'aethermoor.v1.migrated';
const SETTINGS_KEY = 'aethermoor.settings.v1';

function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
function safeDel(key) { try { localStorage.removeItem(key); } catch { /* storage blocked */ } }
function parse(raw) {
  if (!raw) return null;
  try { const g = JSON.parse(raw); return g && g.version ? g : null; } catch { return null; }
}
const isV2 = game => !!game && (game.version || 1) >= 2;

// loadGame(migrate) -> { game, from: 'v2' | 'v1' } | null
//   v2 if present; else v1 if present and not yet marked migrated, migrated in memory (nothing written).
// loadGame() -> v1 game | null   (M2 behaviour, until app.js injects the migration)
export function loadGame(migrate) {
  if (typeof migrate !== 'function') return parse(safeGet(KEY_V1));
  const v2 = parse(safeGet(KEY_V2));
  if (v2) { try { return { game: migrate(v2), from: 'v2' }; } catch { return null; } }
  if (safeGet(KEY_MARK) === '1') return null;
  const v1 = readV1();
  if (!v1) return null;
  try { return { game: migrate(v1), from: 'v1' }; } catch { return null; }
}

// Writes v2 only (and the migrated marker for a carried-over M2 save). A version 1 game (the M2
// flow, until newGame makes v2 games) still goes to the v1 key.
export function saveGame(game) {
  if (!isV2(game)) return safeSet(KEY_V1, JSON.stringify(game));
  const ok = safeSet(KEY_V2, JSON.stringify(game));
  if (ok && game.migratedFrom === 1) markMigrated();
  return ok;
}
export const clearGame = () => { safeDel(KEY_V2); safeDel(KEY_V1); };
export const hasSave = () => !!loadGame();

// The previous v2 save, kept before a New Game, an import or a restore.
export function backupGame() {
  const raw = safeGet(KEY_V2);
  return raw ? safeSet(KEY_BAK, raw) : false;
}
export const hasBackup = () => !!parse(safeGet(KEY_BAK));
export function restoreBackup(migrate) {
  const bak = parse(safeGet(KEY_BAK));
  if (!bak) return null;
  let game;
  try { game = typeof migrate === 'function' ? migrate(bak) : bak; } catch { return null; }
  safeSet(KEY_V2, JSON.stringify(game));
  return game;
}

// The untouched M2 save.
export const hasV1 = () => !!parse(safeGet(KEY_V1));
export const readV1 = () => parse(safeGet(KEY_V1));
export const markMigrated = () => safeSet(KEY_MARK, '1');

export function loadSettings(defaults) {
  try { return { ...defaults, ...(JSON.parse(safeGet(SETTINGS_KEY) || '{}')) }; } catch { return { ...defaults }; }
}
export const saveSettings = s => safeSet(SETTINGS_KEY, JSON.stringify(s));

// Export code: "AETH2." (v2 games; "AETH1." for version 1) + base64(utf8 JSON). Long but copy/paste friendly.
function b64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function exportCode(game) {
  return (isV2(game) ? 'AETH2.' : 'AETH1.') + b64(JSON.stringify(game));
}
// The stored M2 save exactly as it is on disk (byte for byte), as an AETH1 code, or null.
export function exportV1Code() {
  const raw = safeGet(KEY_V1);
  return raw && parse(raw) ? 'AETH1.' + b64(raw) : null;
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

// importCode(code, migrate?) accepts AETH1. and AETH2. codes; scrub(), then migrate() when given.
export function importCode(code, migrate) {
  const m = String(code).trim().match(/^AETH[12]\.([A-Za-z0-9+/=\s]+)$/);
  if (!m) throw new Error('That is not an Aethermoor save code. Codes start with AETH1. or AETH2.');
  let game;
  try {
    const bin = atob(m[1].replace(/\s+/g, ''));
    game = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
  } catch { throw new Error(DAMAGED); }
  if (!game || !game.version || !game.party) throw new Error(DAMAGED);
  const clean = scrub(game);
  if (typeof migrate !== 'function') return clean;
  try { return migrate(clean); } catch { throw new Error(DAMAGED); }
}
