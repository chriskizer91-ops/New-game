// Small DOM helpers shared by the screens and the card.

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// el('div', 'cls', '<b>html</b>') or el('div', { class, text, html, attrs..., on: { click } }, [children])
export function el(tag, a, b) {
  const e = document.createElement(tag);
  if (typeof a === 'string') { e.className = a; if (b != null) e.innerHTML = b; return e; }
  if (a) {
    for (const [k, v] of Object.entries(a)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else e.setAttribute(k, v === true ? '' : v);
    }
  }
  if (Array.isArray(b)) { for (const c of b) if (c) e.append(c); }
  else if (b != null) e.append(b);
  return e;
}

export function button(label, cls = 'btn', onClick, attrs = {}) {
  const b = el('button', { type: 'button', class: cls, ...attrs });
  if (label instanceof Node) b.append(label); else b.innerHTML = label;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

// Paint ImageData into a canvas (new or given) and size it in CSS pixels.
export function toCanvas(img, cv, scale) {
  cv = cv || document.createElement('canvas');
  if (!img) return cv;
  if (cv.width !== img.width) cv.width = img.width;
  if (cv.height !== img.height) cv.height = img.height;
  cv.getContext('2d').putImageData(img, 0, 0);
  if (!cv.classList.contains('px')) cv.classList.add('px');
  if (scale) { cv.style.width = img.width * scale + 'px'; cv.style.height = img.height * scale + 'px'; }
  return cv;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

export const fmt = v => { const r = Math.round(v * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };
export const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + fmt(Math.abs(v));
export const modText = m => (m >= 0 ? '+' : '−') + Math.abs(m);
export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

// Restart a CSS animation class.
export function replay(node, cls) {
  if (!node) return;
  node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls);
}

// Count a number up in an element (tabular), respecting reduced motion.
export function countTo(node, from, to, { dur = 900, reduced = false, format = v => String(Math.round(v)) } = {}) {
  if (!node) return;
  if (reduced || from === to) { node.textContent = format(to); return; }
  const t0 = performance.now();
  const step = () => {
    if (!node.isConnected) return;
    const u = Math.min(1, (performance.now() - t0) / dur), e = 1 - (1 - u) ** 3;
    node.textContent = format(u >= 1 ? to : from + (to - from) * e);
    if (u < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
