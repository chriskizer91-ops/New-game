// Public art API (see docs/ART.md). Browser-only where noted: anything returning ImageData.
export { MAT, Forge, Xf, compose, hsl, hx, mix, palOf } from './forge.js';
export { RECIPE, renderItem } from './recipes.js';
export {
  RARITY_ORDER, RARITY_LOOK, rarityTier, ASPECTS, ASPECT_LOOK, RELIC_ART, RELIC_IDS, ITEM_KINDS, SLOTS,
  itemArt, itemRaster, itemPortrait, itemIcon, cardCorner, glintPoint, motes, lookFor, gearLooks,
  TEMPER_MAX, temperOf, temperMat,
} from './item-looks.js';
export { HERO_ART, HERO_KEYS, HERO_POSES, HERO_SIZE, WARDEN_PRESETS, renderHero, heroBust, heroAnchors, prewarmHero } from './hero-looks.js';
export { FOE_ART, FOE_KEYS, FOE_POSES, renderFoe, foeAnchors, prewarmFoe, relicSlot, tierNum, foeLooks } from './foes.js';
export { BACKDROPS, BACKDROP_KEYS, renderBackdrop, backdropLayers, ambient, darkBackdrop } from './scenes.js';
export {
  DICE, diceIcon, INTENT_DIE, STATUS_KEYS, statusIcon, aspectIcon, gripIcon, DIGIT_FONTS, drawDigits, digitsImage, textWidth,
  lockIcon, keyIcon, markIcon, LOCK_ICON_KEYS, KEY_ICON_KEYS,
} from './icons.js';
// M3 overworld art (WP5; this index is WP5's and re-exports WP6's foeLooks). See docs/ART.md "World".
export { tileAtlas, tileAtlasAsync, tileAtlasSteps, TILE_PX, BIOMES, EDGE_BITS } from './tiles.js';
export { walkerSheet, rigSheet, resolveGear, WALKER_W, WALKER_H, WALKER_FRAMES, WALKER_ROWS, WALKER_FOOT } from './walkers.js';
export { npcSheet, mapFoeSheet, objectSprite, emote, NPC_LOOKS, OBJECT_KINDS, OBJECT_STATES, HEARTH_LOOKS, EMOTES, MAP_FOE_SIZE } from './map-sprites.js';
