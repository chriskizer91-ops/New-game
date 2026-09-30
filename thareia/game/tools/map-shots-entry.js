// Map reference renders for the painters (bundled by tools/map-shots.mjs). Not part of the game build.
// window.__shots.png(mapId, { pad, fill, scale, ents, over }) -> a PNG data URL of the whole map:
// its tiles (and, with ents, its objects), padded and scaled with hard pixel edges.
import { mapImage } from '../src/ui/world/view.js';
import { newGame } from '../src/rules/gauntlet.js';
import { MAPS } from '../src/data/maps/index.js';

const game = newGame({ seed: 1 });

window.__shots = {
  maps: () => Object.keys(MAPS),
  size: id => (MAPS[id] ? { w: MAPS[id].w, h: MAPS[id].h, name: MAPS[id].name, biome: MAPS[id].biome } : null),
  png(id, { pad = null, fill = '.', scale = 1, ents = false, over = true } = {}) {
    const c = mapImage(game, id, { pad, fill, over, keep: () => ents });
    if (!c) return null;
    const out = document.createElement('canvas');
    out.width = c.width * scale; out.height = c.height * scale;
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(c, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  },
};
window.__done = true;
