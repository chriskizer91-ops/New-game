// Keyboard -> game actions. Touch is handled by real buttons in each screen; this adds
// laptop shortcuts on top. Screens subscribe with onAction and get plain action names.

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'confirm', Space: 'confirm', KeyZ: 'confirm',
  Escape: 'back', KeyX: 'back', Backspace: 'back',
  Tab: null, KeyM: 'menu', KeyF: 'fast',
};

export function createInput(target = window) {
  const subs = new Set();
  const onKey = e => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const el = e.target;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
    let action = KEYMAP[e.code];
    if (!action && /^Digit[1-9]$/.test(e.code)) action = 'pick' + e.code.slice(5);
    if (!action) return;
    for (const fn of [...subs]) if (fn(action, e) === true) { e.preventDefault(); break; }
  };
  target.addEventListener('keydown', onKey);
  return {
    // fn(action, event) -> return true when handled (prevents default and stops other handlers)
    onAction(fn) { subs.add(fn); return () => subs.delete(fn); },
    destroy() { target.removeEventListener('keydown', onKey); subs.clear(); },
  };
}
