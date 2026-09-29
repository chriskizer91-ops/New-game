// The app shell: owns the game state, settings, autosave, audio and input, and swaps screens.
//
// A screen module exports mount(root, ctx, params) and may return { unmount(), onAction(a) }.
// ctx gives every screen the same toolkit:
//   ctx.game / ctx.setGame(g)   current game state; setGame autosaves (to this milestone's own key)
//   ctx.go(name, params)        switch screen (unmounts the current one); aliases resolve first,
//                               so go('road') mounts 'world' (root.dataset.screen reads 'world')
//   ctx.screen                  the name of the mounted screen
//   ctx.settings / ctx.setSettings(patch)
//   ctx.audio                   see core/audio.js for names
//   ctx.reduced()               true when motion should be minimal
//   ctx.toast(text)             short status message
//   ctx.services                shared UI services registered by screens (e.g. cardReveal, cardSlam)
//
// Saves (M3 spec §4.8, §5.7, D8; M4: every milestone keeps its own save). The migration
// (rules/migrate.js) is injected into core/save.js here, so core/ imports nothing game-specific.
//   ctx.carry                   an earlier milestone's save migrated in memory, waiting on the title's
//                               carry-over button (null when there is none, or once it is adopted)
//   ctx.carryFrom               where ctx.carry came from: 'm4' (Milestone 4), 'v2' (Milestone 3) or 'v1' (M2)
//   ctx.adopt(game)             holds a migrated game in memory only: it becomes ctx.game, and every
//                               setGame stays in memory until commitAdopted()
//   ctx.adopting                true while an adopted game has not been written yet
//   ctx.commitAdopted() -> bool the world's first successful step: writes the live save, which marks
//                               this milestone started (true when it wrote; false when nothing waited)
//   ctx.replaceGame(game, { backup = true }) -> bool
//                               a New Game, a loaded code or a restore: backs up the live save to .bak
//                               first, drops any adopted hold, and writes the game (which marks this
//                               milestone started, so an older save is never offered again by itself)
//   ctx.clearGame()             Start over: removes the live save only (the earlier milestones' saves
//                               and the backup stay) and marks this milestone started, so nothing
//                               resurrects
//   ctx.migrate                 the injected migration (for importCode / restoreBackup)
//
// Settings (DEFAULT_SETTINGS): sound, music, battleSpeed 1|2|4, battleAuto, reducedMotion, and for
// the world (M3 §5.2, §5.4): touchControls 'auto'|'on'|'off', alwaysRun bool,
// mapZoom 'near'|'normal'|'far' (ui/world/constants.js MAP_ZOOM keys).
// Owner: WP8.

import {
  loadGame, saveGame, clearGame as clearSave, backupGame, markStarted, loadSettings, saveSettings,
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
  let game = loaded && loaded.from === 'live' ? loaded.game : null;
  let carry = loaded && loaded.from !== 'live' ? loaded.game : null;
  let carryFrom = carry ? loaded.from : null;
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
    get carryFrom() { return carryFrom; },
    get adopting() { return adopted; },
    adopt(g) {
      if (!g) return;
      game = g; adopted = true; carry = null; carryFrom = null;
    },
    commitAdopted() {
      if (!adopted || !game) return false;
      adopted = false;
      // saveGame marks this milestone started only once the save is really written: a failed write
      // (storage full) keeps the earlier save on offer
      return saveGame(game);
    },
    replaceGame(g, { backup = true } = {}) {
      if (!g) return false;
      if (backup) backupGame();
      adopted = false; carry = null; carryFrom = null; game = g;
      return saveGame(g);
    },
    clearGame() {
      clearSave();
      markStarted();
      adopted = false; carry = null; carryFrom = null; game = null;
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
