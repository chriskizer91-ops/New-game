// Overworld sprites (M3 spec §5.1): NPCs, map foes, objects and emotes. Browser-only: ImageData.
//
// npcSheet(artKey) -> { img, w: 16, h: 24, foot: [8, 23] }        3 frames x 4 rows (s, n, e, w), like walkers
// mapFoeSheet(artKey, { gearTier, variant } = {}) -> { img, w, h, foot, frames: 2, rows: 4 }
//   humanoids reuse the walker rig through foeLooks (art/foes.js) and NPC_LOOKS; beasts get
//   dedicated 16-32 px sprites with exaggerated silhouettes
// objectSprite(kind, state) -> ImageData   chest, hearth (lit/cold), gate, chain, crownwall, thornwall,
//   bramble, boulder, ford-ice, pedestal (lit/unlit), board, sign, bellframe, lookout, rope, deer, ichor
// emote(kind) -> ImageData                 '!', 'sweat', '?', 'sparkle'
// SCAFFOLD: flat-colour boxes of the right sizes. WP5 draws the real sprites.
// Owner: WP5.

import { boxSheet, WALKER_W, WALKER_H } from './walkers.js';
import { lru } from './cache.js';

export const NPC_LOOKS = Object.freeze({}); // npc art key -> walker rig look (WP5)
export const OBJECT_KINDS = Object.freeze(['chest', 'hearth', 'gate', 'chain', 'crownwall', 'thornwall', 'bramble', 'boulder', 'ford-ice',
  'pedestal', 'board', 'sign', 'bellframe', 'lookout', 'rope', 'deer', 'ichor']);
export const EMOTES = Object.freeze(['!', 'sweat', '?', 'sparkle']);

// Map-foe sprite sizes (w, h) by art key; humanoids use the walker size.
const BEAST_SIZE = {
  briarling: [16, 16], thornhound: [24, 16], boglurcher: [24, 16], glowcap: [16, 16], rotgrub: [16, 12],
  rotstag: [32, 32], oldsnag: [32, 24], briarmaw: [32, 32], gloamwing: [32, 32], mirelord: [32, 32], sapwight: [16, 24], rotwarden: [32, 32],
};
const OBJECT_COLOR = {
  chest: [150, 100, 40], hearth: [230, 120, 40], gate: [90, 90, 100], chain: [120, 120, 130], crownwall: [60, 140, 60], thornwall: [50, 90, 40],
  bramble: [70, 110, 50], boulder: [120, 116, 110], 'ford-ice': [190, 230, 250], pedestal: [170, 160, 140], board: [130, 90, 50], sign: [140, 100, 60],
  bellframe: [110, 80, 50], lookout: [100, 80, 60], rope: [180, 150, 100], deer: [240, 236, 226], ichor: [30, 40, 20],
};
const EMOTE_COLOR = { '!': [250, 220, 60], sweat: [120, 190, 250], '?': [250, 250, 250], sparkle: [255, 250, 200] };
const hashColor = key => { let h = 7; for (const c of String(key)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return [80 + (h & 127), 80 + ((h >> 7) & 127), 80 + ((h >> 14) & 127)]; };

const cache = lru(128);
function box(key, w, h, rgb, dim = false) {
  return cache.get(`${key}|${w}x${h}|${dim ? 1 : 0}`, () => {
    const img = new ImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = (y * w + x) * 4, edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
        const s = (edge ? 0.6 : 1) * (dim ? 0.55 : 1);
        d[k] = rgb[0] * s; d[k + 1] = rgb[1] * s; d[k + 2] = rgb[2] * s; d[k + 3] = 255;
      }
    }
    return img;
  });
}

export function npcSheet(artKey) {
  return { img: boxSheet(`npc|${artKey}`, hashColor(artKey)), w: WALKER_W, h: WALKER_H, foot: [8, 23] };
}

export function mapFoeSheet(artKey, { gearTier = 0, variant = null } = {}) {
  const [w, h] = BEAST_SIZE[artKey] || [WALKER_W, WALKER_H];
  const img = boxSheet(`foe|${artKey}|${gearTier}|${variant || ''}`, hashColor(artKey), { w, h, frames: 2, rows: 4, head: [200, 60, 60] });
  return { img, w, h, foot: [Math.floor(w / 2), h - 1], frames: 2, rows: 4 };
}

export function objectSprite(kind, state = null) {
  const dim = state === 'cold' || state === 'unlit' || state === 'open' || state === 'opened';
  return box(`obj|${kind}|${state || ''}`, 16, kind === 'bellframe' || kind === 'lookout' ? 24 : 16, OBJECT_COLOR[kind] || [255, 0, 255], dim);
}

export function emote(kind) {
  return box(`emote|${kind}`, 8, 8, EMOTE_COLOR[kind] || [255, 255, 255]);
}
