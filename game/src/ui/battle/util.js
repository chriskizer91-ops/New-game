// Small DOM and canvas helpers shared by the battle screen modules.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, u) => a + (b - a) * u;
export const easeOut = u => 1 - (1 - u) * (1 - u);
export const easeInOut = u => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);

// el('div.bt-plate', { attrs }, children...) -> HTMLElement
export function el(spec, attrs = null, ...kids) {
  const [tag, ...classes] = spec.split('.');
  const n = document.createElement(tag || 'div');
  if (classes.length) n.className = classes.join(' ');
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const k of kids.flat()) if (k != null && k !== false) n.append(k);
  return n;
}

// ImageData -> a new canvas (for drawImage, which respects alpha unlike putImageData).
export function toCanvas(img, cv = null) {
  const c = cv || document.createElement('canvas');
  if (!img) { c.width = 1; c.height = 1; return c; }
  if (c.width !== img.width) c.width = img.width;
  if (c.height !== img.height) c.height = img.height;
  c.getContext('2d').putImageData(img, 0, 0);
  return c;
}

// A crisp pixel icon for the DOM: a canvas at its native size, shown at an integer scale by CSS.
export function pixelIcon(img, scale = 2, cls = '') {
  const c = toCanvas(img);
  c.className = `px ${cls}`.trim();
  c.style.width = `${img.width * scale}px`;
  c.style.height = `${img.height * scale}px`;
  c.setAttribute('aria-hidden', 'true');
  return c;
}

// Crop an ImageData (transparent where out of range).
export function crop(img, x0, y0, w, h) {
  const out = new ImageData(w, h), s = img.data, d = out.data;
  for (let y = 0; y < h; y++) {
    const Y = y + y0;
    if (Y < 0 || Y >= img.height) continue;
    for (let x = 0; x < w; x++) {
      const X = x + x0;
      if (X < 0 || X >= img.width) continue;
      const i = (Y * img.width + X) * 4, j = (y * w + x) * 4;
      d[j] = s[i]; d[j + 1] = s[i + 1]; d[j + 2] = s[i + 2]; d[j + 3] = s[i + 3];
    }
  }
  return out;
}

// Bounding box of opaque pixels: { x0, y0, x1, y1 } (inclusive-exclusive).
export function alphaBox(img) {
  let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
  const d = img.data;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (d[(y * img.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x >= x1) x1 = x + 1; if (y >= y1) y1 = y + 1; }
  }
  if (x1 <= x0) return { x0: 0, y0: 0, x1: img.width, y1: img.height };
  return { x0, y0, x1, y1 };
}

export const hexRgb = h => {
  const v = parseInt(h.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

// Cancellable timing for the event player. Waits scale with battle speed; skip() resolves
// every pending wait at once (tap to fast-forward); kill() rejects them (unmount).
export class Clock {
  constructor() { this.speed = 1; this.skipping = false; this.dead = false; this.pending = new Set(); }
  wait(ms) {
    if (this.dead) return Promise.reject(new Cancelled());
    if (this.skipping || ms <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const p = { resolve, reject, t: 0 };
      p.t = setTimeout(() => { this.pending.delete(p); resolve(); }, ms / this.speed);
      this.pending.add(p);
    });
  }
  // wait in real time (not scaled by speed), still skippable
  real(ms) { return this.wait(ms * this.speed); }
  skip() { this.skipping = true; for (const p of this.pending) { clearTimeout(p.t); p.resolve(); } this.pending.clear(); }
  unskip() { this.skipping = false; }
  kill() { this.dead = true; for (const p of this.pending) { clearTimeout(p.t); p.reject(new Cancelled()); } this.pending.clear(); }
}

export class Cancelled extends Error { constructor() { super('cancelled'); this.cancelled = true; } }

export const titleCase = s => String(s || '').replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
