// Full-screen overlays (card reveal, previews, confirmations) layered over the current screen.
// The screen underneath goes inert, keys are trapped, focus comes back when it closes.
import { el } from './dom.js';
import { trapKeys, moveFocus } from './keys.js';

let open = 0;
const appRoot = () => document.getElementById('app');

export function openOverlay({ cls = '', label = 'Dialog', onKey, onBack } = {}) {
  const prevFocus = document.activeElement;
  const ov = el('div', { class: `ov ${cls}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': label });
  const inner = el('div', 'ov-inner');
  ov.append(inner);
  document.body.append(ov);
  open++;
  const app = appRoot();
  if (app) app.inert = true;
  document.body.classList.add('ov-open');
  let closed = false;
  const stopKeys = trapKeys((a, e) => {
    if (onKey && onKey(a, e) === true) return true;
    if (a === 'back' && onBack) { onBack(); return true; }
    if (a === 'left' || a === 'up') return moveFocus(inner, -1);
    if (a === 'right' || a === 'down') return moveFocus(inner, 1);
    if (a === 'confirm') {
      const f = document.activeElement;
      if (f && inner.contains(f) && f.tagName === 'BUTTON') return false;
      const p = inner.querySelector('[data-primary]:not([disabled])');
      if (p) { p.click(); return true; }
    }
    return false;
  });
  return {
    el: ov, inner,
    get closed() { return closed; },
    close() {
      if (closed) return;
      closed = true;
      stopKeys();
      ov.remove();
      open = Math.max(0, open - 1);
      if (!open) {
        if (app) app.inert = false;
        document.body.classList.remove('ov-open');
      }
      if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    },
  };
}

export const overlayOpen = () => open > 0;
