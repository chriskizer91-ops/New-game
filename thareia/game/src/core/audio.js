// Audio facade. Screens call these names; Thareia's sound library (../../../sfx/sounds.js, 182 sounds made in code)
// and its music (../../../sfx/music.js, 9 pieces made in code) live behind them.
// Until audio is unlocked by a user gesture every call is silent (music requests are remembered and start on
// unlock). Sound effects and music switch on and off separately.
//
// sfx names: any id in the library (see the sound board, thareia/sfx/dist/sound-board.html), or one of the old
//            game's names, which map onto the library below (select confirm back dice hit graze miss crit heal
//            status disarm ko surge legend victory defeat phase chest reveal equip levelup hearth beam tick stamp
//            coin page identify slam error bump alert door blip unlock chime)
//   opts: { tier } for rarity-scaled sounds (reveal, beam: 0 worn .. 7 primal)
//         { voice } 0-7 (or { pitch } in Hz) for blip, the dialogue typewriter: one voice per speaker
// music tracks: the pieces (travel battle flight title boss town ruins marsh desert), or the old game's track
//               names, which map onto them (MAPS[id].music). null stops the music; 'victory' plays the victory
//               cue and lets the music rest. A change of track crossfades.
//
// API: unlock() setEnabled(on) setMusicEnabled(on) enabled musicEnabled sfx(name, opts)
//      music(track) track duck(amount, seconds)

import { SFX, sfxInit, sfxContext, playSfx, tone } from '../../../sfx/sounds.js';
import { MUSIC, musicPlay, musicStop, musicPlaying, musicGain } from '../../../sfx/music.js';

const PIECES = MUSIC.map(m => m.id);
// the old game's track names, and what plays for them now
const OLD_TRACKS = {
  title: 'title', road: 'travel', wilds: 'travel', battle: 'battle', boss: 'boss', victory: null,
  hearth: 'town', town: 'town', dungeon: 'ruins', desert: 'desert', peaks: 'travel', fen: 'marsh',
};
const pieceFor = name => (PIECES.includes(name) ? name : OLD_TRACKS[name] ?? null);

export const TRACK_NAMES = Object.freeze([...new Set([...PIECES, ...Object.keys(OLD_TRACKS)])]);
// the old sequencer's note check; the new pieces are checked by thareia/sfx/tools
export const badNotes = () => [];

const IDS = new Set(SFX.map(s => s.id));
// the old game's sound names, and the library sound each plays
const OLD_SFX = {
  select: 'ui-cursor', tick: 'ui-cursor', confirm: 'ui-confirm', back: 'ui-back', error: 'ui-error', page: 'ui-page',
  dice: 'dice-roll', hit: 'hit-slash', graze: 'graze', miss: 'miss', crit: 'crit', heal: 'heal', status: 'hex',
  disarm: 'grip-crack', ko: 'ko', surge: 'surge-release', legend: 'reveal-primal', victory: 'victory', defeat: 'defeat',
  phase: 'boss', chest: 'chest', equip: 'equip', levelup: 'levelup', hearth: 'hearthfire', stamp: 'ui-save',
  coin: 'coins', identify: 'identify', slam: 'shield-bash', bump: 'bump', alert: 'alert', door: 'door',
  unlock: 'secret', chime: 'resonance',
};
const clampTier = t => Math.max(0, Math.min(7, t | 0));
const VOICES = [660, 520, 780, 440, 880, 590, 700, 370];
const soundFor = (name, o) => {
  if (name === 'reveal') { const t = clampTier(o.tier); return t >= 5 ? 'reveal-primal' : t >= 3 ? 'reveal-heirloom' : 'reveal-common'; }
  if (name === 'beam') return clampTier(o.tier) >= 2 ? 'relic-drop' : null;
  return IDS.has(name) ? name : OLD_SFX[name] ?? null;
};
const MUSIC_LEVEL = .6;

export function createAudio() {
  let enabled = true, musicOn = true, unlocked = false, wanted = null;
  let AC = null;
  const ctx = () => {
    if (AC) { if (AC.state === 'suspended') AC.resume().catch(() => {}); return AC; }
    try { AC = sfxInit(); } catch { AC = null; }
    return AC;
  };

  function duck(amount, secs) {
    const g = musicGain();
    if (!g || !AC) return;
    const t = AC.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(MUSIC_LEVEL * amount, t + .08); g.linearRampToValueAtTime(MUSIC_LEVEL, t + secs);
  }
  function sync() {
    if (!unlocked || !ctx()) return;
    const want = musicOn ? wanted : null;
    if (!want) { if (musicPlaying()) musicStop(.8); return; }
    if (musicPlaying() === want) return;
    musicPlay(want);
    const g = musicGain();
    if (g) { const t = AC.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(0, t); g.linearRampToValueAtTime(MUSIC_LEVEL, t + .9); }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      const c = sfxContext();
      if (!c) return;
      if (document.hidden) c.suspend().catch(() => {});
      else c.resume().catch(() => {});
    });
  }

  return {
    unlock() {                   // call from a click/tap handler
      if (unlocked) { ctx(); return; }
      unlocked = true;
      sync();
    },
    setEnabled(on) { enabled = !!on; },
    get enabled() { return enabled; },
    setMusicEnabled(on) { musicOn = !!on; sync(); },
    get musicEnabled() { return musicOn; },
    get unlocked() { return unlocked; },
    get track() { return wanted; },
    sfx(name, opts = {}) {
      if (!enabled || !unlocked || !ctx()) return;
      try {
        const t = AC.currentTime + .01;
        if (name === 'blip') { tone(t, { f: Math.max(120, Math.min(2400, opts.pitch || VOICES[(opts.voice | 0) & 7])), d: .04, g: .05, type: 'square', lp: 2400 }); return; }
        const id = soundFor(name, opts);
        if (!id) return;
        playSfx(id, t);
        if (id === 'reveal-primal' || id === 'reveal-heirloom' || id === 'levelup' || id === 'victory') duck(.35, 2.2);
      } catch (err) { console.warn('[audio]', name, err); /* never let sound break the game */ }
    },
    music(track) {
      if (track === 'victory') { wanted = null; sync(); return; }
      wanted = track ? pieceFor(track) : null;
      sync();
    },
    duck(amount = .4, secs = 1.5) { if (AC && unlocked) duck(amount, secs); },
  };
}
