// The world renderer (M3 spec §5.3): baked ground chunks, y-sorted sprites, overhead chunks,
// the darkness layer and emotes, within 40 drawImage calls per frame.
// Exports: createView(canvas, { reduced }) -> { setMap(mapId), resize(cssW, cssH, dpr, coarse), draw(game, walk, now), destroy() }
// SCAFFOLD: fills the canvas with a flat colour and a marker for the party. WP7 builds the renderer.
// Owner: WP7.

import { TILE } from './constants.js';

export function createView(canvas, { reduced = false } = {}) {
  const g = canvas.getContext('2d');
  let mapId = null;
  return {
    setMap(id) { mapId = id; },
    resize(cssW, cssH) {
      canvas.width = Math.max(1, Math.floor(cssW / 3)); canvas.height = Math.max(1, Math.floor(cssH / 3));
    },
    draw(game, walk) {
      if (!g) return;
      g.fillStyle = mapId ? '#23301f' : '#000';
      g.fillRect(0, 0, canvas.width, canvas.height);
      if (walk) {
        g.fillStyle = '#e8c070';
        g.fillRect(Math.floor(canvas.width / 2 - TILE / 4), Math.floor(canvas.height / 2 - TILE / 4), TILE / 2, TILE / 2);
      }
    },
    destroy() { mapId = null; },
    get reduced() { return reduced; },
  };
}
