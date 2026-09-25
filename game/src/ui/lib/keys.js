// Keyboard helpers on top of core/input.js.
//
// screenNav(root, { back, pick, menu }) -> an onAction handler for a screen: arrows move focus
//   through the screen's buttons, confirm presses the focused button (natively) or the
//   [data-primary] one, back/pick/menu call the given functions.
// trapKeys(handler) -> stop(): an overlay's key handler. It runs before the screen's (capture
//   phase on window) and hides the key from it; only the topmost trap is active.

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'confirm', Space: 'confirm', KeyZ: 'confirm',
  Escape: 'back', KeyX: 'back', Backspace: 'back', KeyM: 'menu', KeyF: 'fast',
};

const visible = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
export const focusables = root => [...root.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea, select, [tabindex="0"]')].filter(visible);

export function moveFocus(root, dir) {
  const items = focusables(root);
  if (!items.length) return false;
  const i = items.indexOf(document.activeElement);
  const next = i < 0 ? (dir > 0 ? items[0] : items[items.length - 1]) : items[(i + dir + items.length) % items.length];
  next.focus();
  if (next.scrollIntoView) next.scrollIntoView({ block: 'nearest' });
  return true;
}

export function screenNav(root, { back, pick, menu } = {}) {
  return action => {
    if (document.querySelector('.ov')) return false;
    if (action === 'up' || action === 'left') return moveFocus(root, -1);
    if (action === 'down' || action === 'right') return moveFocus(root, 1);
    if (action === 'confirm') {
      const a = document.activeElement;
      if (a && root.contains(a) && a !== root && a.tagName !== 'MAIN') return false; // the browser presses it
      const p = root.querySelector('[data-primary]:not([disabled])');
      if (p && visible(p)) { p.click(); return true; }
      return false;
    }
    if (action === 'back' && back) { back(); return true; }
    if (action === 'menu' && menu) { menu(); return true; }
    if (action.startsWith('pick') && pick) return pick(+action.slice(4)) === true;
    return false;
  };
}

const traps = [];
export function trapKeys(handler) {
  const entry = { handler };
  const fn = e => {
    if (traps[traps.length - 1] !== entry) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    let a = KEYMAP[e.code];
    if (!a && /^Digit[1-9]$/.test(e.code)) a = 'pick' + e.code.slice(5);
    if (!a) return;
    e.stopPropagation();
    if (handler(a, e) === true) e.preventDefault();
  };
  traps.push(entry);
  window.addEventListener('keydown', fn, true);
  return () => {
    window.removeEventListener('keydown', fn, true);
    const i = traps.indexOf(entry);
    if (i >= 0) traps.splice(i, 1);
  };
}
