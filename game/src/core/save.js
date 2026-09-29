// Save/load. The game must run when storage is blocked, so every access is guarded.
// Export codes let a player move a save between phone and laptop by copy/paste.
//
// Every milestone keeps its own save, so a new build never overwrites the last one's (the player's
// rule, M4): each earlier milestone's key is read only here, never written, never removed.
// This module imports nothing game-specific: the migration to the current save version is injected
// (loadGame(migrate), importCode(code, migrate), restoreBackup(migrate)).
//   aethermoor.save.m4.5       the live save (Milestone 4.5)
//   aethermoor.save.m4.5.bak   backup of the previous live save
//   aethermoor.m4.5.started    '1' once this milestone has a journey of its own (carried over, new,
//                              loaded or started over): the older saves are then no longer offered
//   aethermoor.save.m4         the Milestone 4 save: read only (the M4 file still plays from it)
//   aethermoor.save.v2         the Milestone 3 save: read only (the M3 file still plays from it)
//   aethermoor.save.v1         the M2 save: read only (the M2 page still plays from it)
// Milestone 4.5 keeps the save shape of Milestone 4 (version 3), so its codes are AETH3 too.

const KEY_V1 = 'aethermoor.save.v1';
const KEY_V2 = 'aethermoor.save.v2';
const KEY_M4 = 'aethermoor.save.m4';
const KEY_LIVE = 'aethermoor.save.m4.5';
const KEY_BAK = 'aethermoor.save.m4.5.bak';
const KEY_MARK = 'aethermoor.m4.5.started';
const SETTINGS_KEY = 'aethermoor.settings.v1';

function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
function safeDel(key) { try { localStorage.removeItem(key); } catch { /* storage blocked */ } }
function parse(raw) {
  if (!raw) return null;
  try { const g = JSON.parse(raw); return g && g.version ? g : null; } catch { return null; }
}

const same = g => g;

// loadGame(migrate) -> { game, from: 'live' | 'm4' | 'v2' | 'v1' } | null
//   The live save if present. Otherwise, until this milestone has a journey of its own, the newest
//   earlier save, migrated in memory (nothing written: the world commits it on the first step):
//   the Milestone 4 save (m4), else the Milestone 3 save (v2), else the M2 save (v1).
export function loadGame(migrate = same) {
  if (typeof migrate !== 'function') migrate = same;
  const live = parse(safeGet(KEY_LIVE));
  if (live) { try { return { game: migrate(live), from: 'live' }; } catch { return null; } }
  if (safeGet(KEY_MARK) === '1') return null;
  for (const [from, raw] of [['m4', safeGet(KEY_M4)], ['v2', safeGet(KEY_V2)], ['v1', safeGet(KEY_V1)]]) {
    const old = parse(raw);
    if (!old) continue;
    try { return { game: migrate(old), from }; } catch { /* a broken old save: try the next */ }
  }
  return null;
}

// Writes the live save only, never an earlier milestone's key; marks this milestone started.
export function saveGame(game) {
  if (!game) return false;
  const ok = safeSet(KEY_LIVE, JSON.stringify(game));
  if (ok && !isStarted()) markStarted();
  return ok;
}
// Removes the live save only: the earlier milestones' saves and the backup stay.
export const clearGame = () => { safeDel(KEY_LIVE); };
// A live save exists. An earlier save waiting to be carried over is (hasM4() || hasV2() || hasV1()) && !isStarted().
export const hasSave = () => !!parse(safeGet(KEY_LIVE));

// The previous live save, kept before a New Game, an import or a restore.
export function backupGame() {
  const raw = safeGet(KEY_LIVE);
  return raw ? safeSet(KEY_BAK, raw) : false;
}
export const hasBackup = () => !!parse(safeGet(KEY_BAK));
export function restoreBackup(migrate) {
  const bak = parse(safeGet(KEY_BAK));
  if (!bak) return null;
  let game;
  try { game = typeof migrate === 'function' ? migrate(bak) : bak; } catch { return null; }
  safeSet(KEY_LIVE, JSON.stringify(game));
  return game;
}

// The untouched earlier saves: M2 (v1), Milestone 3 (v2) and Milestone 4 (m4).
export const hasV1 = () => !!parse(safeGet(KEY_V1));
export const readV1 = () => parse(safeGet(KEY_V1));
export const hasV2 = () => !!parse(safeGet(KEY_V2));
export const readV2 = () => parse(safeGet(KEY_V2));
export const hasM4 = () => !!parse(safeGet(KEY_M4));
export const readM4 = () => parse(safeGet(KEY_M4));
export const markStarted = () => safeSet(KEY_MARK, '1');
export const isStarted = () => safeGet(KEY_MARK) === '1';

export function loadSettings(defaults) {
  try { return { ...defaults, ...(JSON.parse(safeGet(SETTINGS_KEY) || '{}')) }; } catch { return { ...defaults }; }
}
export const saveSettings = s => safeSet(SETTINGS_KEY, JSON.stringify(s));

// Export code: "AETH<save version>." + base64(utf8 JSON). Long but copy/paste friendly.
function b64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function exportCode(game) {
  return `AETH${game?.version || 1}.` + b64(JSON.stringify(game));
}
// The stored earlier saves exactly as they are on disk (byte for byte), as codes, or null:
// M2 as AETH1, Milestone 3 as AETH2, Milestone 4 as AETH3.
export function exportV1Code() {
  const raw = safeGet(KEY_V1);
  return raw && parse(raw) ? 'AETH1.' + b64(raw) : null;
}
export function exportV2Code() {
  const raw = safeGet(KEY_V2);
  return raw && parse(raw) ? 'AETH2.' + b64(raw) : null;
}
export function exportM4Code() {
  const raw = safeGet(KEY_M4);
  return raw && parse(raw) ? 'AETH3.' + b64(raw) : null;
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

// importCode(code, migrate?) accepts the codes of every milestone so far (AETH1. M2, AETH2. M3,
// AETH3. M4 and Milestone 4.5); scrub(), then migrate() when given.
export function importCode(code, migrate) {
  const newer = String(code).trim().match(/^AETH(\d+)\./);
  if (newer && +newer[1] > 3) throw new Error(`That code comes from a newer Aethermoor (AETH${+newer[1]}). Load it in the version that made it.`);
  const m = String(code).trim().match(/^AETH[123]\.([A-Za-z0-9+/=\s]+)$/);
  if (!m) throw new Error('That is not an Aethermoor save code. Codes start with AETH and a number, like AETH3.');
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
