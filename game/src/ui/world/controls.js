// World controls (M3 spec §5.4): the phone deck (d-pad with pointer capture, A, B, Menu pill) and
// the laptop held-key set (latest direction wins; clears on blur; ignored while an overlay is open).
// Exports:
//   keyDir(code) -> 'n'|'e'|'s'|'w'|null         Arrow keys and WASD
//   createControls(root, { onDir, onA, onB, onMenu }) -> { held() -> dir|null, running() -> bool, destroy() }
// SCAFFOLD: keyboard only, no deck. WP7 builds the deck.
// Owner: WP7.

const KEY_DIR = { ArrowUp: 'n', KeyW: 'n', ArrowDown: 's', KeyS: 's', ArrowLeft: 'w', KeyA: 'w', ArrowRight: 'e', KeyD: 'e' };
export const keyDir = code => KEY_DIR[code] || null;

export function createControls(root, { onDir = () => {}, onA = () => {}, onB = () => {}, onMenu = () => {} } = {}) {
  const held = [];
  let run = false;
  const down = e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const d = keyDir(e.code);
    if (d) { if (!held.includes(d)) held.push(d); onDir(d); return; }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') run = true;
    if (e.code === 'KeyZ' || e.code === 'Enter' || e.code === 'Space') onA();
    if (e.code === 'KeyX') onB();
    if (e.code === 'Escape' || e.code === 'KeyM') onMenu();
  };
  const up = e => {
    const d = keyDir(e.code);
    if (d) held.splice(held.indexOf(d), 1);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') run = false;
  };
  const blur = () => { held.length = 0; run = false; };
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  root.addEventListener('keydown', down);
  return {
    held: () => held[held.length - 1] || null,
    running: () => run,
    destroy() { window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); root.removeEventListener('keydown', down); },
  };
}
