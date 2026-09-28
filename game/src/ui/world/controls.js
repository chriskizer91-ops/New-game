// World controls (M3 spec §5.4): the phone deck (prompt line, a pointer-captured d-pad with a dead
// zone and hysteresis, A, B and a Menu pill) and the laptop held-key set (the latest direction wins;
// it clears on blur, is removed on destroy, and ignores key presses while an overlay is open).
// Exports:
//   keyDir(code) -> 'n'|'e'|'s'|'w'|null         Arrow keys and WASD
//   createControls(root, { onA, onB, onMenu, onJournal, onPress, onTouch, blocked })
//     -> { deck, prompt, held(), takeBuffered(), running(), setA(label), setPrompt(text), clear(), destroy() }
//   held()          the direction held right now (d-pad first, then the newest key), or null
//   takeBuffered()  a direction pressed since the last call (a tap during a step is not lost), or null
//   running()       Shift, X or B is held
// A/confirm, Esc and M reach the screen through core/input.js (screen onAction); J opens the Journal here.
// Owner: WP7.

import { el } from '../lib/dom.js';
import { overlayOpen } from '../lib/overlay.js';
import { DPAD_DEAD, DPAD_HYST } from './constants.js';

const KEY_DIR = { ArrowUp: 'n', KeyW: 'n', ArrowDown: 's', KeyS: 's', ArrowLeft: 'w', KeyA: 'w', ArrowRight: 'e', KeyD: 'e' };
export const keyDir = code => KEY_DIR[code] || null;
const RUN_KEYS = { ShiftLeft: 1, ShiftRight: 1, KeyX: 1 };
const typing = t => !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

export function createControls(root, { onA, onB, onMenu, onJournal, onPress, onTouch, blocked = () => false } = {}) {
  const keys = [];            // held keyboard directions, newest last
  let keyRun = false, bRun = false, bAt = 0;
  let padDir = null, padId = null, padAxis = null, padRect = null;
  let buffered = null;

  // ---- keyboard ----
  const down = e => {
    if (e.altKey || e.ctrlKey || e.metaKey || typing(e.target)) return;
    if (overlayOpen() || blocked()) return;
    const d = keyDir(e.code);
    if (d) {
      if (e.repeat) return;
      const i = keys.indexOf(d);
      if (i >= 0) keys.splice(i, 1);
      keys.push(d);
      buffered = d;
      if (onPress) onPress(d);
      return;
    }
    if (RUN_KEYS[e.code]) keyRun = true;
    if (e.code === 'KeyJ' && !e.repeat && onJournal) onJournal();
  };
  const up = e => {
    const d = keyDir(e.code);
    if (d) { const i = keys.indexOf(d); if (i >= 0) keys.splice(i, 1); }
    if (RUN_KEYS[e.code]) keyRun = false;
  };
  const clear = () => { keys.length = 0; keyRun = false; bRun = false; buffered = null; setPad(null); };
  const hidden = () => { if (document.hidden) clear(); };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', hidden);

  // ---- the deck ----
  const deck = el('div', { class: 'w-deck', role: 'group', 'aria-label': 'Controls' });
  const prompt = el('p', { class: 'w-prompt', 'aria-hidden': 'true' });
  const pad = el('div', { class: 'w-dpad', role: 'group', 'aria-label': 'Direction pad: press and slide to walk' });
  for (const d of ['n', 'e', 's', 'w']) pad.append(el('span', { class: `arm arm-${d}`, 'aria-hidden': 'true' }));
  pad.append(el('span', { class: 'hub', 'aria-hidden': 'true' }));
  const menuPill = el('button', { type: 'button', class: 'w-pill', 'aria-label': 'Menu' });
  menuPill.textContent = 'Menu';
  const btnB = el('button', { type: 'button', class: 'w-btn w-b', 'aria-label': 'B: hold to run' });
  btnB.append(el('b', { text: 'B' }), el('small', { text: 'Run' }));
  const btnA = el('button', { type: 'button', class: 'w-btn w-a', 'aria-label': 'A' });
  const aLabel = el('small', { class: 'w-a-label' });
  btnA.append(el('b', { text: 'A' }), aLabel);
  const pads = el('div', 'w-deck-row');
  const ab = el('div', 'w-ab');
  ab.append(btnB, btnA);
  pads.append(pad, menuPill, ab);
  deck.append(prompt, pads);

  function setPad(d) {
    if (d === padDir) return;
    padDir = d;
    pad.dataset.dir = d || '';
    if (d) { buffered = d; if (onPress) onPress(d); }
  }
  function readPad(e) {
    const r = padRect || pad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax < DPAD_DEAD && ay < DPAD_DEAD) { padAxis = null; setPad(null); return; }
    let axis = ax >= ay ? 'x' : 'y';
    if (padAxis && axis !== padAxis) {
      // hysteresis: the other axis has to win by 20% before the thumb turns
      const cur = padAxis === 'x' ? ax : ay, nxt = padAxis === 'x' ? ay : ax;
      if (nxt < cur * (1 + DPAD_HYST)) axis = padAxis;
    }
    padAxis = axis;
    setPad(axis === 'x' ? (dx > 0 ? 'e' : 'w') : (dy > 0 ? 's' : 'n'));
  }
  pad.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (blocked() || overlayOpen()) return;
    if (padId != null) return;
    padId = e.pointerId;
    try { pad.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
    padRect = pad.getBoundingClientRect();
    padAxis = null;
    readPad(e);
  });
  pad.addEventListener('pointermove', e => { if (e.pointerId === padId) readPad(e); });
  const release = e => { if (e.pointerId !== padId) return; padId = null; padRect = null; padAxis = null; setPad(null); };
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);
  pad.addEventListener('lostpointercapture', release);

  // A answers at once on touch (no click delay); a keyboard press arrives as a click with detail 0
  btnA.addEventListener('pointerdown', e => { e.preventDefault(); if (!blocked() && onA) onA(); });
  btnA.addEventListener('click', e => { if (e.detail === 0 && onA) onA(); });
  // B: hold to run, a short tap is "back" (cancels a tap-walk)
  btnB.addEventListener('pointerdown', e => {
    e.preventDefault(); bRun = true; bAt = performance.now();
    try { btnB.setPointerCapture(e.pointerId); } catch { /* optional */ }
  });
  const bUp = () => { if (!bRun) return; bRun = false; if (performance.now() - bAt < 250 && onB) onB(); };
  btnB.addEventListener('pointerup', bUp);
  btnB.addEventListener('pointercancel', () => { bRun = false; });
  btnB.addEventListener('click', e => { if (e.detail === 0 && onB) onB(); });
  menuPill.addEventListener('click', () => { if (onMenu) onMenu(); });

  // the first real touch shows the deck on a touch laptop (touchControls: 'auto')
  const touch = e => { if (e.pointerType === 'touch' && onTouch) onTouch(); };
  root.addEventListener('pointerdown', touch, true);

  let aText = null, pText = null;
  return {
    deck, prompt, pad, btnA, btnB,
    held: () => padDir || keys[keys.length - 1] || null,
    takeBuffered() { const b = buffered; buffered = null; return b; },
    running: () => keyRun || bRun,
    setA(label) {
      const t = label || '';
      if (t === aText) return;
      aText = t;
      aLabel.textContent = t;
      btnA.setAttribute('aria-label', t ? `A: ${t}` : 'A');
      btnA.classList.toggle('idle', !t);
    },
    setPrompt(text) {
      const t = text || '';
      if (t === pText) return;
      pText = t;
      prompt.textContent = t;
    },
    clear,
    destroy() {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', hidden);
      root.removeEventListener('pointerdown', touch, true);
      clear();
    },
  };
}
