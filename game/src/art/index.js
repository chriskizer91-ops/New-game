// Public art API (see docs/ART.md). Browser-only where noted: anything returning ImageData.
export { MAT, Forge, Xf, compose, hsl, hx, mix, palOf } from './forge.js';
export { RECIPE, renderItem } from './recipes.js';
export {
  RARITY_ORDER, RARITY_LOOK, rarityTier, ASPECTS, ASPECT_LOOK, RELIC_ART, RELIC_IDS, ITEM_KINDS, SLOTS,
  itemArt, itemRaster, itemPortrait, itemIcon, cardCorner, glintPoint, motes, lookFor, gearLooks,
} from './item-looks.js';
export { HERO_ART, HERO_KEYS, HERO_POSES, HERO_SIZE, WARDEN_PRESETS, renderHero, heroBust, heroAnchors, prewarmHero } from './hero-looks.js';
export { FOE_ART, FOE_KEYS, FOE_POSES, renderFoe, foeAnchors, prewarmFoe, relicSlot, tierNum, foeLooks } from './foes.js';
export { BACKDROPS, BACKDROP_KEYS, renderBackdrop, backdropLayers, ambient } from './scenes.js';
export { DICE, diceIcon, INTENT_DIE, STATUS_KEYS, statusIcon, aspectIcon, gripIcon, DIGIT_FONTS, drawDigits, digitsImage, textWidth } from './icons.js';
// M3 overworld art (WP5; this index is WP5's and re-exports WP6's foeLooks)
export { tileAtlas, TILE_PX, BIOMES } from './tiles.js';
export { walkerSheet, WALKER_W, WALKER_H, WALKER_FRAMES, WALKER_ROWS } from './walkers.js';
export { npcSheet, mapFoeSheet, objectSprite, emote, NPC_LOOKS, OBJECT_KINDS, EMOTES } from './map-sprites.js';
