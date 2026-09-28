// The app shell: owns the game state, settings, autosave, audio and input, and swaps screens.
//
// A screen module exports mount(root, ctx, params) and may return { unmount(), onAction(a) }.
// ctx gives every screen the same toolkit:
//   ctx.game / ctx.setGame(g)   current game state; setGame autosaves (to aethermoor.save.v2)
//   ctx.go(name, params)        switch screen (unmounts the current one); aliases resolve first,
//                               so go('road') mounts 'world' (root.dataset.screen reads 'world')
//   ctx.screen                  the name of the mounted screen
//   ctx.settings / ctx.setSettings(patch)
//   ctx.audio                   see core/audio.js for names
//   ctx.reduced()               true when motion should be minimal
//   ctx.toast(text)             short status message
//   ctx.services                shared UI services registered by screens (e.g. cardReveal, cardSlam)
//
// Saves (M3 spec §4.8, §5.7, D8). The v1 -> v2 migration (rules/migrate.js) is injected into
// core/save.js here, so core/ imports nothing game-specific.
//   ctx.carry                   an M2 save migrated in memory, waiting on the title's "Continue from
//                               the Gauntlet" (null when there is none, or once it is adopted)
//   ctx.adopt(game)             holds a migrated game in memory only: it becomes ctx.game, and every
//                               setGame stays in memory until commitAdopted()
//   ctx.adopting                true while an adopted game has not been written yet
//   ctx.commitAdopted() -> bool the world's first successful step: writes v2 and the migrated marker
//                               (true when it wrote; false when nothing was waiting)
//   ctx.replaceGame(game, { backup = true }) -> bool
//                               a New Game, a loaded code or a restore: backs up the live v2 save to
//                               .bak first, sets the migrated marker while an M2 save exists (so it
//                               never comes back), drops any adopted hold, and writes the game
//   ctx.clearGame()             Start over: removes the live save only (the M2 save and the backup
//                               stay) and marks the M2 save declined, so nothing resurrects
//   ctx.migrate                 the injected migration (for importCode / restoreBackup)
//
// Settings (DEFAULT_SETTINGS): sound, music, battleSpeed 1|2|4, battleAuto, reducedMotion, and for
// the world (M3 §5.2, §5.4): touchControls 'auto'|'on'|'off', alwaysRun bool,
// mapZoom 'near'|'normal'|'far' (ui/world/constants.js MAP_ZOOM keys).
// Owner: WP8.

import {
  loadGame, saveGame, clearGame as clearSave, backupGame, hasV1, markMigrated, loadSettings, saveSettings,
} from '../core/save.js';
import { createInput } from '../core/input.js';
import { createAudio } from '../core/audio.js';
import { migrate } from '../rules/migrate.js';
import { closeOverlays } from './lib/overlay.js';

export const DEFAULT_SETTINGS = Object.freeze({
  sound: true, music: true, battleSpeed: 1, reducedMotion: false,
  touchControls: 'auto', alwaysRun: false, mapZoom: 'normal',
});

// createApp(root, screens, { aliases }) -> ctx.  aliases: { [name]: realScreenName }
export function createApp(root, screens, { aliases = {} } = {}) {
  const input = createInput();
  const audio = createAudio();
  const motionMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const loaded = loadGame(migrate);
  let game = loaded && loaded.from === 'v2' ? loaded.game : null;
  let carry = loaded && loaded.from === 'v1' ? loaded.game : null;
  let adopted = false; // an adopted (migrated) game that must not be written before the first step
  let settings = loadSettings(DEFAULT_SETTINGS);
  const reduced = () => settings.reducedMotion || !!(motionMQ && motionMQ.matches);
  // Settings that act outside any one screen: sound, music, and the reduced-motion class.
  const applySettings = () => {
    audio.setEnabled(settings.sound);
    if (audio.setMusicEnabled) audio.setMusicEnabled(settings.music !== false);
    document.documentElement.classList.toggle('reduce-motion', reduced());
  };
  applySettings();
  if (motionMQ && motionMQ.addEventListener) motionMQ.addEventListener('change', applySettings);
  let current = null, currentName = null;

  const toastEl = document.createElement('div');
  toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.hidden = true;
  let toastTimer = 0;

  const ctx = {
    get game() { return game; },
    setGame(g) {
      game = g || null;
      if (!g) { adopted = false; return; }
      if (!adopted) saveGame(g);
    },
    get carry() { return carry; },
    get adopting() { return adopted; },
    adopt(g) {
      if (!g) return;
      game = g; adopted = true; carry = null;
    },
    commitAdopted() {
      if (!adopted || !game) return false;
      adopted = false;
      const ok = saveGame(game);
      markMigrated();
      return ok;
    },
    replaceGame(g, { backup = true } = {}) {
      if (!g) return false;
      if (backup) backupGame();
      if (hasV1()) markMigrated();
      adopted = false; carry = null; game = g;
      return saveGame(g);
    },
    clearGame() {
      clearSave();
      if (hasV1()) markMigrated();
      adopted = false; carry = null; game = null;
    },
    migrate,
    get settings() { return settings; },
    setSettings(patch) { settings = { ...settings, ...patch }; saveSettings(settings); applySettings(); },
    audio,
    input,
    services: { applySettings },
    reduced,
    toast(text, ms = 2200) {
      toastEl.textContent = text; toastEl.hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
    },
    go(name0, params = {}) {
      const name = aliases[name0] || name0;
      const screen = screens[name];
      if (!screen) throw new Error(`Unknown screen ${name0}`);
      if (current && current.unmount) current.unmount();
      if (current && current.off) current.off();
      closeOverlays(); // a dialogue or sheet left open must not keep the next screen inert
      root.replaceChildren();
      root.dataset.screen = name;
      root.appendChild(toastEl);
      const host = document.createElement('main');
      host.className = `screen screen-${name}`;
      root.prepend(host);
      currentName = name;
      current = screen.mount(host, ctx, params) || {};
      if (current.onAction) current.off = input.onAction(current.onAction);
      window.scrollTo(0, 0);
    },
    get screen() { return currentName; },
  };

  // First tap anywhere unlocks audio (browsers block sound until a gesture).
  const unlock = () => { audio.unlock(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  return ctx;
}
