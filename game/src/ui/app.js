// The app shell: owns the game state, settings, autosave, audio and input, and swaps screens.
//
// A screen module exports mount(root, ctx, params) and may return { unmount(), onAction(a) }.
// ctx gives every screen the same toolkit:
//   ctx.game / ctx.setGame(g)   current game state; setGame autosaves
//   ctx.go(name, params)        switch screen (unmounts the current one)
//   ctx.settings / ctx.setSettings(patch)
//   ctx.audio                   see core/audio.js for names
//   ctx.reduced()               true when motion should be minimal
//   ctx.toast(text)             short status message
//   ctx.services                shared UI services registered by screens (e.g. cardReveal, cardSlam)

import { loadGame, saveGame, loadSettings, saveSettings } from '../core/save.js';
import { createInput } from '../core/input.js';
import { createAudio } from '../core/audio.js';

const DEFAULT_SETTINGS = { sound: true, music: true, battleSpeed: 1, reducedMotion: false };

export function createApp(root, screens) {
  const input = createInput();
  const audio = createAudio();
  const motionMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let game = loadGame();
  let settings = loadSettings(DEFAULT_SETTINGS);
  audio.setEnabled(settings.sound);
  let current = null, currentName = null;

  const toastEl = document.createElement('div');
  toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.hidden = true;
  let toastTimer = 0;

  const ctx = {
    get game() { return game; },
    setGame(g) { game = g; if (g) saveGame(g); },
    get settings() { return settings; },
    setSettings(patch) { settings = { ...settings, ...patch }; saveSettings(settings); audio.setEnabled(settings.sound); },
    audio,
    input,
    services: {},
    reduced: () => settings.reducedMotion || !!(motionMQ && motionMQ.matches),
    toast(text, ms = 2200) {
      toastEl.textContent = text; toastEl.hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
    },
    go(name, params = {}) {
      const screen = screens[name];
      if (!screen) throw new Error(`Unknown screen ${name}`);
      if (current && current.unmount) current.unmount();
      if (current && current.off) current.off();
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
