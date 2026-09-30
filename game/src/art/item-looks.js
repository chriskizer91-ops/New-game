// Item looks for the battle layer.
//  - RARITY_LOOK / ASPECT_LOOK: shared styling tables (colours, frame materials, glow materials).
//  - RELIC_ART: hand-made recipe params for every named relic (RELIC_IDS in codex order: the 24 of M2-M3, the 14 of
//    the Sunscorch, the 14 of the Ironspire and the 14 of the Gloomfen, M5's and M6's through new recipe styles that
//    older relics never reach).
//  - itemArt(item): deterministic recipe params for ANY rolled item from { kind, rarity, aspect, seed }.
//  - itemPortrait / itemIcon / cardCorner: the card portrait (prototype treatment) and bag icon.
//  - lookFor / gearLooks: turn item art into the layer "looks" the hero sprite draws, so the
//    sword on the card is visibly the sword in the hero's hand.
//  - Temper (M3): an ItemInstance with temper 1-3 gets tempered art: +1 a glint, +2 the metal lifted one ramp
//    step (as MAT variants from temperMat), +3 an aspect-coloured edge. Temper 0 renders exactly as before.
//  - M4: temper runs to +10 (the metal brightens each step, glows from +7, burns with a white flame at +10);
//    gems set in sockets (item.gems) show on the card and in the hand; a Kindled relic (a deed done) gets a
//    faint ember rim, an Awakened one (item.awakened 'a' | 'b') a repaint in its branch's palette and ember
//    motes. All of it is material variants and recipe params, so the card, the bag icon, the hero sprite and
//    the walkers agree. An item with temper 0-3, no gems set and no deeds renders exactly as in M3.
//  - M5: the Frost Opal's gem ramp (gem.frost-opal), and the Ironspire relics' textures (rime on the bell, tarnish on
//    the censer, an iron haft, forge scale).
//  - M6: the fourteen Gloomfen relics (Codex Page IV), each through recipe styles of its own (a clipped coin, a bog-shoe,
//    willow fronds, a wicker ward-shield, a holed stone, a street-lamp, a lace veil, a diving-helm, a choirmaster's
//    staff, a gar's tooth, a chain-link gauntlet, a harpoon, a glowing pearl, a knotted shawl).
import { MAT, hx, hsl, bayer, hash, vnoise, compose, Forge, Xf, mix, ramp } from './forge.js';
import { RECIPE, renderItem, TX, TX2, mailTex, scaleTex } from './recipes.js';
import { rimeTex } from './item-art.js';
import { createRng } from '../core/rng.js';
import { lru, objId } from './cache.js';
import { GEMS } from '../data/gems.js';

/* ==== rarity ==== */
const R5 = s => s.split(' ');
export const RARITY_ORDER = ['worn', 'wrought', 'tempered', 'runed', 'storied', 'heirloom', 'regalia', 'primal'];
// color: css text colour · ramp: 5 steps dark->light (beams, sparks, card glow) · bg: 4 portrait bg steps
// rim: rim-light colour on the portrait · aura: silhouette aura colour (tier >= 3) · frame: MAT for card
// corners · gem: MAT for the corner gem · beam: reveal beam width (px) · rays: rotating rays behind portrait
export const RARITY_LOOK = Object.freeze({
  worn: { tier: 0, name: 'Worn', color: '#8b8b8b', ramp: R5('#2e2c28 #5e5a52 #aca699 #dcd6ca #ffffff'), bg: R5('#16151a #1f1d24 #2a2830 #36343c'), rim: '#9a968c', aura: null, frame: 'iron', gem: null, beam: 3, rays: false },
  wrought: { tier: 1, name: 'Wrought', color: '#f4f1e8', ramp: R5('#3a3834 #7c776c #d8d2c4 #f4f0e6 #ffffff'), bg: R5('#17171b #212026 #2d2c33 #3b3a42'), rim: '#e6e0d2', aura: null, frame: 'steel', gem: 'pearl', beam: 4, rays: false },
  tempered: { tier: 2, name: 'Tempered', color: '#4cbf56', ramp: R5('#10331a #2a7a30 #64c85c #b4f0a4 #f2fff0'), bg: R5('#0d1810 #13241a #1b3424 #25482f'), rim: '#5ec85a', aura: null, frame: 'bronze', gem: 'emerald', beam: 5, rays: false },
  runed: { tier: 3, name: 'Runed', color: '#4a8fe7', ramp: R5('#0e2a5a #1e5ab0 #5299f0 #a8d4ff #f2f8ff'), bg: R5('#0b1224 #111c38 #182a52 #22396c'), rim: '#4a92ea', aura: '#4a92ea', frame: 'steel', gem: 'sapphire', beam: 6, rays: false },
  storied: { tier: 4, name: 'Storied', color: '#a35ee8', ramp: R5('#2a0e4a #5e2a9a #b774f4 #e2baff #fcf2ff'), bg: R5('#150c22 #1f1234 #2c1a4a #3c2462'), rim: '#b36cf0', aura: '#b36cf0', frame: 'silver', gem: 'amethyst', beam: 8, rays: false },
  heirloom: { tier: 5, name: 'Heirloom', color: '#e8b83a', ramp: R5('#4a2008 #a85a14 #f4ad3f #ffe08a #fffbe8'), bg: R5('#1c1008 #2c180a #42240e #5a3212'), rim: '#f2a93b', aura: '#f2a93b', frame: 'gold', gem: 'ruby', beam: 10, rays: true },
  regalia: { tier: 6, name: 'Regalia', color: '#2fb8a6', ramp: R5('#073a34 #137a6c #3cc8b4 #9af0e2 #f0fffb'), bg: R5('#07181a #0c2628 #123a3a #1a5250'), rim: '#5fe3d0', aura: '#5fe3d0', frame: 'bronze', gem: 'seaglass', beam: 11, rays: true },
  primal: { tier: 7, name: 'Primal', color: '#fffaf0', ramp: R5('#28304a #6a7eb0 #c4d6f4 #eef4ff #ffffff'), bg: R5('#0b0d15 #131826 #1d2438 #293350'), rim: '#e8f0ff', aura: '#dce8ff', frame: 'silver', gem: 'prism', beam: 12, rays: true, flame: true },
});
export const rarityTier = r => (RARITY_LOOK[r] ? RARITY_LOOK[r].tier : 0);

/* ==== aspects ==== */
export const ASPECTS = ['ember', 'frost', 'storm', 'stone', 'verdant', 'tide', 'radiant', 'blight'];
// glow: emissive MAT for runes/fullers/orbs · gem: MAT for set stones · cloth: MAT for robes/ribbons
// color: css colour for UI accents · mote: particle behaviour on portraits and casts
export const ASPECT_LOOK = Object.freeze({
  ember: { glow: 'ember', gem: 'ruby', cloth: 'cloakRed', color: '#e8622c', light: '#ffbe48', mote: 'rise' },
  frost: { glow: 'frost', gem: 'sapphire', cloth: 'clothBlue', color: '#8fd3f4', light: '#a8e0f8', mote: 'fall' },
  storm: { glow: 'storm', gem: 'stormglass', cloth: 'clothBlue', color: '#b9a6ff', light: '#fffce0', mote: 'spark' },
  stone: { glow: 'amber', gem: 'topaz', cloth: 'gambeson', color: '#a08c6c', light: '#f8c85a', mote: 'dust' },
  verdant: { glow: 'verdant', gem: 'emerald', cloth: 'hoodGreen', color: '#5dbb4f', light: '#a6f066', mote: 'spore' },
  tide: { glow: 'water', gem: 'seaglass', cloth: 'clothTeal', color: '#2f7fc1', light: '#94daf0', mote: 'bubble' },
  radiant: { glow: 'radiant', gem: 'pearl', cloth: 'clothWhite', color: '#ffe9a0', light: '#fff8d4', mote: 'sparkle' },
  blight: { glow: 'blight', gem: 'amethyst', cloth: 'clothGrey', color: '#7a4f8f', light: '#eeffa8', mote: 'rise' },
});
// rune glow when an item has no aspect, by rarity tier
const TIER_GLOW = [null, null, null, 'frost', 'arcane', 'radiant', 'water', 'primal'];

/* ==== M4 gems (data/gems.js): a material per gem, cut from its colour. GEM_MAT[gemId] -> MAT name ==== */
const GEM_RAMP = { 'frost-opal': '#0c1a38 #1e4a7c #3c8cbc #86cce2 #dcd4f4 #fff6fe', sunstone: '#2a0e02 #6e2a06 #b8560e #f08c1c #ffc45a #fff2c4', 'moss-agate': '#08140a #16301a #2a5230 #4a8a48 #8cc47a #dcf4c8', 'glass-pearl': '#1e2632 #465468 #7c90aa #b4cce4 #dcecfc #ffffff', 'ash-garnet': '#1a0406 #420a0e #7a1416 #b3261e #e0604a #ffc8b0' };
export const GEM_MAT = {};
for (const id of Object.keys(GEMS)) {
  const key = 'gem.' + id;
  if (!MAT[key]) {
    const c = hx(GEMS[id].color), pal = GEM_RAMP[id] ? ramp(GEM_RAMP[id]) : [.12, .28, .5, .78, 1, 1].map((f, k) => (k < 4 ? c.map(v => v * f) : mix(c, [255, 255, 255], k === 4 ? .45 : .85)));
    MAT[key] = id === 'glass-pearl' ? { pal, ks: 1.6, shin: 10, base: 3.4 } : { pal, gem: 1 };
  }
  GEM_MAT[id] = key;
}

/* aspect surface textures for metal (seeded) */
const surfTex = (aspect, seed) => {
  switch (aspect) {
    case 'frost': return rimeTex;
    case 'ember': return TX2.cracks(seed, 'ember', .03);
    case 'storm': return TX2.cracks(seed, 'storm', .028);
    case 'stone': return TX2.cracks(seed, 'amber', .03);
    case 'verdant': return ({ x, y, nx, ny }) => (vnoise(x * .45, y * .45, seed) > .7 && (nx + ny) < .1 ? { m: 'moss', dd: 1 } : 0);
    case 'tide': return ({ x, y }) => (vnoise(x * .4, y * .4, seed) > .72 ? { m: 'verdigris', dd: 0 } : 0);
    case 'blight': return ({ x, y }) => { const n = vnoise(x * .4, y * .4, seed); return n > .76 ? { m: 'rot', dd: 1 } : n > .72 ? { m: 'blight', dd: -1 } : 0; };
    default: return null;
  }
};
const verdTex = seed => ({ x, y, nx, ny, d }) => { const n = vnoise(x * .45, y * .45, seed); return ((nx + ny) > .08 || d < .9) && n > .5 ? { m: 'verdigris', dd: n > .74 ? 1 : 0 } : 0; };

/* ==== the named relics ==== */
const emberVeins = TX2.cracks(31, 'ember', .036);
const stoneHead = ({ x, y }) => { const n = vnoise(x * .3, y * .3, 12); const c = Math.abs(vnoise(x * .2, y * .2, 5) - .5); if (c < .035) return { m: 'amber', dd: 0 }; return n > .7 ? -1 : n < .2 ? 1 : (hash(x, y, 3) < .1 ? -1 : 0); };
const rotSpots = ({ x, y }) => { const n = vnoise(x * .38, y * .38, 17); return n > .74 ? { m: 'rot', dd: 1 } : 0; };
const mossBlade = ({ x, y, nx, ny }) => (vnoise(x * .5, y * .5, 23) > .74 && (nx + ny) < .1 ? { m: 'moss', dd: 1 } : 0);
// textures for the M3 relics
// frost thread stitched down the middle of each finger, as far as the glove reaches
const LF_FINGERS = [[20, 22, 18, 7], [28, 22, 28, 4], [36, 22, 38, 6], [44, 25, 49, 13], [15, 36, 7, 27]];
const frostStitch = ({ x, y, u: px, v: py }) => {
  for (const [a, b, c, d] of LF_FINGERS) { const ex = (c - a) * .64, ey = (d - b) * .64, u = Math.max(.12, Math.min(.95, ((px - a) * ex + (py - b) * ey) / (ex * ex + ey * ey))), qx = a + ex * u - px, qy = b + ey * u - py; if (qx * qx + qy * qy < .3) return (x + y) & 1 ? { m: 'frost', dd: -1 } : -1; }
  return (x * 3 + y) % 7 === 0 ? -1 : 0;
};
const antlerTex = ({ x, y }) => { const n = vnoise(x * .55, y * .55, 71); return n > .7 ? -1 : n < .18 ? 1 : (hash(x, y, 72) < .06 ? -1 : 0); };
const verdSpots = ({ x, y, nx, ny }) => (vnoise(x * .5, y * .5, 81) > .66 && (nx + ny) > -.2 ? { m: 'verdigris', dd: 0 } : 0);
const verdBand = ({ x, y }) => (vnoise(x * .42, y * .42, 101) > .62 ? { m: 'verdigris', dd: 0 } : 0);
const bellPatina = ({ x, y, nx, ny }) => (vnoise(x * .5, y * .5, 91) > .8 && (nx + ny) > .2 ? { m: 'verdigris', dd: 0 } : 0);
const hailDents = (() => {
  const D = []; for (let k = 0; k < 16; k++) D.push([13 + hash(k, 1, 61) * 38, 16 + hash(k, 2, 61) * 25, 1.3 + hash(k, 3, 61) * 1.5]);
  return ({ x, y, u, v }) => { for (const [cx, cy, r] of D) { const dx = u - cx, dy = v - cy, d = dx * dx + dy * dy; if (d < r * r) return d < r * r * .3 ? 0 : dx + dy < 0 ? -1 : 1; } return vnoise(x * .3, y * .9, 62) > .8 ? { m: 'rust', dd: 0 } : 0; };
})();
const oathStone = q => TX2.cracks(41, 'amber', .026)(q) || TX2.granite(7)(q);
// corrosion on the Ichor Mask: dark tarnish, and a few spots where the rot has eaten into the iron
const maskTarnish = ({ x, y }) => { const n = vnoise(x * .38, y * .38, 17); return n > .8 ? { m: 'rot', dd: -1 } : n > .72 ? { m: 'blackiron', dd: 0 } : 0; };
const seedTex = ({ x, y, u, v }) => { const g = ((u - 32) * 1.3 + Math.sin(v * .3) * 1.5) % 5; return Math.abs(g) < .7 ? -1 : vnoise(x * .4, y * .4, 83) > .74 ? -1 : 0; };
// textures for the M4 relics
const cinderVeins = TX2.cracks(131, 'ember', .026);
const glassFused = q => TX2.cracks(53, 'amber', .03)(q) || TX2.granite(19)(q);
const saltCrust = ({ x, y }) => (hash(x, y, 71) < .14 ? { m: 'clothWhite', dd: 1 } : vnoise(x * .4, y * .4, 73) > .72 ? -1 : 0);
const ashFlecks = ({ x, y }) => (hash(x, y, 29) < .14 ? { m: 'ash', dd: 0 } : 0);
// textures for the M5 relics
const bellRime = q => rimeTex(q) || bellPatina(q);
const censerTarnish = ({ x, y, nx, ny }) => (vnoise(x * .45, y * .45, 143) > .64 && (nx + ny) > -.1 ? { m: 'verdigris', dd: 0 } : hash(x, y, 144) < .05 ? -1 : 0);
const ironHaft = ({ u }) => (Math.floor(u / 3.2) % 2 ? -.5 : 0);
const forgeScale = ({ x, y }) => (hash(x, y, 141) < .07 ? -1 : vnoise(x * .4, y * .4, 142) > .76 ? { m: 'char', dd: 1 } : 0);
// textures for the M6 relics
const coinWear = ({ x, y, nx, ny }) => (vnoise(x * .5, y * .5, 151) > .7 && (nx + ny) > -.15 ? { m: 'verdigris', dd: 0 } : hash(x, y, 152) < .05 ? -1 : 0);
const copperGreen = ({ x, y, nx, ny }) => { const n = vnoise(x * .35, y * .35, 155); return n > .7 && (nx + ny) > -.3 ? { m: 'verdigris', dd: n > .8 ? 1 : 0 } : hash(x, y, 156) < .04 ? -1 : 0; };
const linkRust = ({ x, y }) => (vnoise(x * .45, y * .45, 157) > .72 ? { m: 'rust', dd: hash(x, y, 158) < .4 ? -1 : 0 } : hash(x, y, 159) < .06 ? -1 : 0);
const bogPits = ({ x, y }) => (hash(x, y, 162) < .12 ? -1 : vnoise(x * .5, y * .5, 163) > .74 ? { m: 'rust', dd: 0 } : 0);
export const RELIC_ART = Object.freeze({
  hearthbrand: { r: 'sword', relic: true, fx: 'rise', aspect: 'ember', p: { heat: 1, gripEnd: 15.5, guardT: 4.2, bladeW: 4.2, bladeL: 50, tipL: 9, taper: .86, blade: 'steel', bladeTex: emberVeins, fuller: 'ember', fullerR: 1.15, guard: 'flame', guardMat: 'gold', gem: 'ruby', grip: 'leatherRed', gripR: 2.15, pommel: 'gold', pommelR: 3.6, pommelGem: 'ember' } },
  'stillwater-lance': { r: 'spear', relic: true, fx: 'fall', aspect: 'frost', p: { headT: 58, headL: 24, headW: 4.6, wings: 2.6, haft: 'bone', butt: 'silver', wrap: 'clothBlue', wrapA: 25, wrapB: 37, bands: [21, 40, 51], bandMat: 'silver', socket: 'silver', head: 'steel', headTex: rimeTex, fuller: 'frost', gem: 'sapphire', ribbon: 'clothBlue', haftR: 1.8 } },
  cairnmaul: { r: 'hammer', relic: true, fx: 'dust', aspect: 'stone', p: { headT: 53, headH: 15.5, headW: 15, haft: 'bogwood', haftR: 2.5, wrap: 'leather', wrapEnd: 18, bands: [25, 35], bandMat: 'bronze', headMat: 'granite', headTex: stoneHead, pommelMat: 'bronze', pommelR: 3.3, faces: 1, trim: 'bronze', langets: 1, runes: 'amber', spike: 0 } },
  'wardens-seal': { r: 'amulet', relic: true, fx: 'sparkle', aspect: 'radiant', p: { style: 'sun', chain: 'gold', metal: 'gold', rays: 'gold', frame: 'silver', gem: 'topaz', core: 'radiant' } },
  tallyknife: { r: 'dagger', relic: true, fx: 'rise', aspect: 'blight', p: { shape: 'knife', gripEnd: 13, guardT: 2.8, bladeL: 40, bladeW: 6, blade: 'blackiron', bladeTex: rotSpots, tally: 'blight', guard: 'coin', guardMat: 'gold', guardW: 6.5, grip: 'clothGrey', gripR: 2.1, pommel: 'gold', pommelShape: 'coin', pommelR: 3.4 } },
  thornsplitter: { r: 'axe', relic: true, fx: 'spore', aspect: 'verdant', p: { headT: 47, bladeLo: 14, bladeHi: 10, bladeW: 19, bulge: 3.6, back: 'spike', spikeL: 6.5, haft: 'bark', haftR: 2.3, vine: 'bramble', thorn: 'thorn', blade: 'steel', bladeTex: mossBlade, edge: 'verdant', socket: 'bronze', gem: 'emerald', leaves: 'moss', pommel: 'bronze' } },
  'rotwood-circlet': { r: 'circlet', relic: true, fx: 'rise', aspect: 'blight', p: { look: 'circlet', style: 'rotwood', mat: 'rotwood', mat2: 'bark', thorn: 'thorn', gem: 'blight', leaves: 'moss' } },
  'thornwatch-hood': { r: 'hood', relic: true, fx: 'spore', aspect: 'verdant', set: 'thornwatch', p: { look: 'hood', mat: 'hoodGreen', trim: 'leather', clasp: 'bronze', leaf: true, gem: 'verdant', vine: 'bramble', tip: 1, tex: TX2.folds(5) } },
  'thornwatch-jerkin': { r: 'leather', relic: true, fx: 'spore', aspect: 'verdant', set: 'thornwatch', p: { mat: 'leather', shirt: 'hoodGreen', pauldrons: 'hoodGreen', trim: 'bronze', vine: 'bramble', belt: 'leatherDark', buckle: 'bronze', leaf: true, gem: 'verdant', pouch: 'leatherDark' } },
  'thornwatch-boots': { r: 'boots', relic: true, fx: 'spore', aspect: 'verdant', set: 'thornwatch', p: { mat: 'leather', trim: 'hoodGreen', fold: true, vine: 'bramble', buckle: 'bronze', leaf: true, gem: 'verdant', straps: 'leatherDark' } },
  thornwreath: { r: 'crown', relic: true, fx: 'spore', aspect: 'verdant', p: { style: 'thorn', mat: 'bramble', mat2: 'bark', thorn: 'thorn', buds: 'verdant', berries: 'ruby', leaves: 'moss' } },
  briarfang: { r: 'dagger', relic: true, fx: 'spore', aspect: 'verdant', p: { shape: 'fang', curve: 8, gripEnd: 13, guardT: 2.6, bladeL: 41, bladeW: 6.4, blade: 'bone', vein: 'verdant', guard: 'thorn', guardMat: 'bark', thornMat: 'thorn', guardW: 6, grip: 'bramble', gripR: 2.3, pommel: 'bark', pommelShape: 'knot', pommelR: 3.4, pommelGem: 'emerald' } },
  // ---- M3: the twelve heirlooms of the Verdant Wilds (codex 13-24) ----
  lightfingers: { r: 'gloves', relic: true, fx: 'fall', aspect: 'frost', p: { mat: 'leatherDark', cuffMat: 'leatherDark', tex: frostStitch, tips: 'skinPale', tipCut: .66, fray: 'leather', trim: 'silver', sigil: 'frost', cuffBand: 'silver', cuffGem: 'sapphire', cuffSet: 'silver', coin: 'gold', coinAt: [27.4, 21.2], coinR: [5, 3.3, .18] } },
  hartshorn: { r: 'bow', relic: true, fx: 'spark', aspect: 'storm', p: { len: 62, bulge: 10.5, limbR: 3.3, tipR: 1.5, limb: 'stagWhite', limbTex: antlerTex, antler: 'stagWhite', nock: 'silver', grip: 'leatherDark', bindings: [.4, .6], bindMat: 'silver', gem: 'stormglass', gemMat: 'silver', tassel: 'wolfPale', spark: 'storm' } },
  'mosswatch-lantern': { r: 'focus', relic: true, fx: 'rise', aspect: 'ember', p: { style: 'lantern', metal: 'bronze', frame: 'blackiron', glass: 'topaz', glow: 'ember', core: 'radiant', gem: 'ember', capGem: 'ruby', moss: 'moss', capTex: verdSpots } },
  'watchkeepers-kettle': { r: 'kettle', relic: true, fx: 'fall', aspect: 'storm', p: { look: 'kettle', mat: 'iron', tex: hailDents, trim: 'bronze', runes: 'storm', gem: 'stormglass', vane: 'bronze', spark: 'storm', rivets: 'bronze' } },
  'mire-pearl': { r: 'ring', relic: true, fx: 'bubble', aspect: 'tide', p: { style: 'pearl', metal: 'bronze', tex: verdBand, gem: 'pearl', pearlR: 11, sheen: 'seaglass', blush: 'skinPale', toes: 'drake', pads: 'verdigris', reeds: 'seaweed', drips: 'water' } },
  dawnbell: { r: 'mace', relic: true, fx: 'sparkle', aspect: 'radiant', p: { style: 'bell', headT: 30, bellL: 27, bellR: 12, haft: 'wood', haftR: 2.1, wrap: 'leatherRed', wrapEnd: 16, bands: [20], bandMat: 'gold', pommelMat: 'gold', bell: 'bronze', bellTex: bellPatina, trim: 'gold', glow: 'radiant', clapper: 'gold', sun: 'radiant' } },
  rootsong: { r: 'staff', relic: true, fx: 'bubble', aspect: 'tide', p: { style: 'song', headT: 54, haft: 'wood', haftR: 2.3, wobble: .6, spiral: 'bark', holes: 'dark', holeRim: 'thorn', foot: 'bronze', bands: [], orb: 'water', orbR: 6.4, roots: 'bark', leaves: 'moss', berries: 'ruby', thorns: 'rotwood' } },
  oathshield: { r: 'shield', relic: true, fx: 'dust', aspect: 'stone', p: { style: 'oath', shape: 'heater', face: 'granite', faceTex: oathStone, rim: 'bronze', rivets: 'bronze', chief: 'bronze', inscribe: 'amber', notches: 'dark', wreath: 'bronze', boss: 'bronze', gem: 'topaz' } },
  'isoldes-oath': { r: 'sword', relic: true, fx: 'fall', aspect: 'frost', p: { gripEnd: 15, guardT: 3.6, bladeW: 3.9, bladeL: 50, tipL: 10, taper: .9, blade: 'steel', bladeTex: rimeTex, fuller: 'frost', fullerR: 1.05, guard: 'oath', guardMat: 'silver', guardW: 10.5, gem: 'sapphire', grip: 'clothBlue', gripR: 2.15, pommel: 'silver', pommelR: 3.5, pommelGem: 'sapphire', ribbon: 'cloakRed' } },
  'ichor-mask': { r: 'helm', relic: true, fx: 'rise', aspect: 'blight', p: { look: 'helm', style: 'mask', mat: 'iron', tex: maskTarnish, trim: 'bronze', eyes: 'blight', ichor: 'sap', bark: 'bark', stamp: 'gold', strap: 'leatherDark', crest: false } },
  'first-seed': { r: 'amulet', relic: true, fx: 'spore', aspect: 'verdant', p: { style: 'seed', scale: 1.2, chain: 'wood', metal: 'gold', seed: 'thorn', seedTex, glow: 'verdant', veins: 1, gem: 'emerald', leaf: 'moss', bud: 'verdant', stem: 'moss' } },
  'vale-gauntlets': { r: 'gauntlets', relic: true, fx: 'spark', aspect: 'storm', p: { mat: 'silver', plate: 1, cuffMat: 'silver', flare: 1, trim: 'gold', cuffBand: 'gold', knuckles: 'gold', engrave: 'blackiron', bolt: 'storm', cuffGem: 'stormglass' } },
  // ---- M4: Codex Page II, the Sunscorch Wastes (codex 25-38) ----
  // wyrm-hide boots with a broad sand-sole, saffron wraps and an indigo cuff; a storm-glass bead
  sandwalkers: { r: 'boots', relic: true, fx: 'spark', aspect: 'storm', p: { mat: 'wyrmHide', tex: scaleTex(3, 8), trim: 'clothIndigo', fold: true, wraps: 'clothSaffron', sole: 'sand', soleW: 3.5, buckle: 'brass', gem: 'stormglass' } },
  // a brass armillary that hums an hour that has not happened yet
  'zaras-orrery': { r: 'amulet', relic: true, fx: 'spark', aspect: 'storm', p: { style: 'orrery', chain: 'gold', metal: 'brass', gem: 'stormglass', core: 'storm', planet: 'topaz' } },
  // one scale off the Sand Wyrm: growth ridges, a keel, a hide strap; it glints
  wyrmscale: { r: 'shield', relic: true, fx: 'dust', aspect: 'stone', p: { style: 'scale', shape: 'heater', face: 'brass', rim: 'wyrmHide', boss: 'brass', rivets: 'bronze', runes: 'amber', gem: 'topaz' } },
  // a fist of sunstone caged in brass, never set
  'sunstone-lantern': { r: 'focus', relic: true, fx: 'rise', aspect: 'ember', p: { style: 'lantern', metal: 'brass', frame: 'bronze', stone: 'amber', core: 'radiant', rays: 'amber', capGem: 'topaz', gem: 'amber' } },
  // glass lames like a scorpion's back, light in the seams
  'glass-carapace': { r: 'plate', relic: true, fx: 'dust', aspect: 'stone', p: { style: 'carapace', mat: 'glass', seam: 'amber', under: 'char', trim: 'brass' } },
  // a giant's maul: a block of sandstone fused with dune-glass, bound in black iron
  dunebreaker: { r: 'hammer', relic: true, fx: 'dust', aspect: 'stone', k: .4, p: { headT: 51, headH: 17, headW: 16.5, haft: 'bogwood', haftR: 2.8, wrap: 'leatherDark', wrapEnd: 19, bands: [26, 36], bandMat: 'blackiron', headMat: 'sandstone', headTex: glassFused, pommelMat: 'blackiron', pommelR: 3.4, faces: 1, langets: 1, straps: 'blackiron', shards: 'glass', spike: 0 } },
  // No. 031: a dark scimitar cracked with living fire, the edge still hot, a fang for a pommel
  cinderfang: { r: 'sword', relic: true, fx: 'rise', aspect: 'ember', p: { shape: 'scimitar', curve: 7, gripEnd: 14, guardT: 3, bladeW: 4, bladeL: 46, tipL: 8, taper: .88, blade: 'blackiron', bladeTex: cinderVeins, edge: 'ember', guard: 'hook', guardMat: 'bronze', guardW: 8, gem: 'ruby', grip: 'leatherDark', gripR: 2.1, pommel: 'claw', pommelShape: 'hook', pommelR: 2.8 } },
  // a lens of well-water that never spilled, in a frost-silver frame
  'mirage-glass': { r: 'amulet', relic: true, fx: 'fall', aspect: 'frost', p: { style: 'lens', chain: 'silver', metal: 'silver', lens: 'glass', water: 'water', runes: 'frost', gem: 'water' } },
  // the Cistern Lord's seal: a broad signet cut with water-lines
  'qasims-signet': { r: 'ring', relic: true, fx: 'fall', aspect: 'frost', p: { style: 'signet', metal: 'silver', face: 'sapphire', seal: 'silver', runes: 'frost', gem: 'sapphire' } },
  // a heart cut from sunstone, caged in gold; it beats
  'sunstone-heart': { r: 'amulet', relic: true, fx: 'rise', aspect: 'ember', p: { style: 'heart', chain: 'gold', metal: 'gold', stone: 'amber', core: 'radiant', veins: 'ember', gem: 'amber' } },
  // a key ring with no key on it
  'scorchgate-key': { r: 'ring', relic: true, fx: 'rise', aspect: 'ember', p: { style: 'keyring', metal: 'blackiron', clasp: 'bronze', runes: 'ember', glow: 'ember', gem: 'ember' } },
  // Scorchgate's last shield: ash-crusted, cracked with embers, the gate on its face and the fire behind it
  'ashen-aegis': { r: 'shield', relic: true, fx: 'rise', aspect: 'ember', p: { style: 'aegis', shape: 'tower', face: 'ash', rim: 'char', emblem: 'bronze', fire: 'ember', rivets: 'bronze', boss: 'bronze', gem: 'ember' } },
  // black iron tines, a live coal on each: every ember was a soldier of Scorchgate
  'cinder-crown': { r: 'crown', relic: true, fx: 'rise', aspect: 'ember', p: { style: 'regal', metal: 'blackiron', tines: 7, tall: true, gem: 'ember', gem2: 'ruby', embers: 'ember', tex: ashFlecks } },
  // cut from a glassed dune, crusted with salt, strung to sing
  saltglass: { r: 'bow', relic: true, fx: 'spark', aspect: 'storm', p: { len: 62, bulge: 10, limbR: 3.1, tipR: 1.4, limb: 'glass', limbTex: saltCrust, nock: 'silver', grip: 'clothIndigo', bindings: [.3, .7], bindMat: 'silver', gem: 'stormglass', gemMat: 'silver', tassel: 'clothWhite', spark: 'storm' } },
  // ---- M5: Codex Page III, the Ironspire Peaks (codex 39-52) ----
  // a monk's felt boots, bound in white wraps, little silver wings at the ankle and the wind stitched up the shaft
  'windstep-boots': { r: 'boots', relic: true, fx: 'spark', aspect: 'storm', p: { mat: 'clothSlate', tex: TX2.folds(17), trim: 'clothBlue', fold: true, wraps: 'clothWhite', sole: 'leatherDark', buckle: 'silver', gem: 'stormglass', wings: 'clothWhite', wingRoot: 'silver', swirl: 'storm' } },
  // a hand-bell cast from the metal of the great bell's first crack: the crack glows with cold, rime on its shoulders
  veilbell: { r: 'amulet', relic: true, fx: 'fall', aspect: 'frost', p: { style: 'bell', chain: 'silver', metal: 'bronze', tex: bellRime, trim: 'silver', clapper: 'silver', glow: 'frost', crack: 'frost', gem: 'sapphire' } },
  // a dwarf door-shield cut down to carry: black iron planks, bronze strap hinges, runes round the arch, a door-ring
  ironwall: { r: 'shield', relic: true, fx: 'dust', aspect: 'stone', p: { style: 'door', shape: 'tower', face: 'blackiron', rim: 'iron', hinge: 'bronze', rivets: 'iron', boss: 'bronze', ringMat: 'iron', runes: 'amber', gem: 'topaz' } },
  // a thurible on three chains, tarnished silver pierced for the smoke; a cold light inside, and the smoke always wet
  'drowned-censer': { r: 'focus', relic: true, fx: 'fall', aspect: 'frost', p: { style: 'censer', metal: 'silver', tex: censerTarnish, trim: 'bronze', glow: 'frost', smoke: 'mist', drips: 'water', gem: 'sapphire' } },
  // black iron bracers with live fire in the veins of the metal, bronze at the knuckles; small at the wrist
  'ironvein-bracers': { r: 'gauntlets', relic: true, fx: 'rise', aspect: 'ember', p: { mat: 'blackiron', plate: 1, cuffMat: 'blackiron', veins: 'ember', trim: 'bronze', cuffBand: 'bronze', knuckles: 'bronze', cuffGem: 'ruby', cuffSet: 'bronze' } },
  // three feathers of the Thunder-Roc for a cloak, their edges lit with storm, clasped in silver at the throat
  'roc-feather-cloak': { r: 'leather', relic: true, fx: 'spark', aspect: 'storm', p: { style: 'feathers', feather: 'rocFeather', quill: 'pearl', edge: 'storm', mat: 'leatherDark', shirt: 'clothSlate', pauldrons: 'rocFeather', trim: 'silver', belt: 'leather', buckle: 'silver', clasp: 'silver', gem: 'stormglass' } },
  // a ring of black iron with a key's bit standing off it, the Thane's rune cut in its bezel
  'thanes-rune': { r: 'ring', relic: true, fx: 'dust', aspect: 'stone', p: { style: 'key', metal: 'blackiron', face: 'granite', runes: 'amber', gem: 'topaz' } },
  // the hides of the trolls who argued with Old Horn, stitched into a mantle; lichen still grows on it; a horn clasp
  'trollhide-mantle': { r: 'leather', relic: true, fx: 'dust', aspect: 'stone', p: { style: 'mantle', mat: 'trollHide', mat2: 'grizzle', stitch: 'leatherDark', moss: 'lichen', horn: 'bone', clasp: 'iron', shirt: 'leatherDark', belt: 'leather', pauldrons: 'trollHide', trim: 'bone', gem: 'topaz' } },
  // Harrow cut the runes in the black iron haft; the rune-stone at its head burns in a forged cradle
  runestaff: { r: 'staff', relic: true, fx: 'rise', aspect: 'ember', p: { style: 'rune', headT: 58, haft: 'blackiron', haftR: 2.2, wobble: 0, haftTex: ironHaft, foot: 'bronze', bands: [24.2, 39.8], bandMat: 'bronze', metal: 'blackiron', stone: 'granite', glow: 'ember', runes: 'ember', gem: 'ruby' } },
  // Harrow set it in her ribs so she would never go cold: a heart of forge-coal in a cage of black iron ribs
  'anvil-heart': { r: 'amulet', relic: true, fx: 'rise', aspect: 'ember', p: { style: 'ribs', chain: 'blackiron', metal: 'blackiron', tex: forgeScale, stone: 'ruby', core: 'ember', gem: 'ember' } },
  // Harrow Ironvein's own hammer: a smith's head in black iron with a cross-peen, a seam of forge-heat in it that never
  // cooled, his broken ring on the cheek, bronze bands on a bog-oak haft
  'worldforge-hammer': { r: 'hammer', relic: true, fx: 'rise', aspect: 'ember', k: .4, p: { headT: 52, headH: 14, headW: 16.5, peen: 1, haft: 'bogwood', haftR: 2.6, wrap: 'leatherDark', wrapEnd: 18, bands: [24, 34], bandMat: 'bronze', headMat: 'blackiron', headTex: forgeScale, pommelMat: 'bronze', pommelR: 3.3, faces: 1, langets: 1, seam: 'ember', mark: 'gold', spike: 0 } },
  // a Tallyman ice-pick: a long curved pick and a chisel-adze, rime on the steel, a tally cut into the haft
  'cutters-pick': { r: 'axe', relic: true, fx: 'fall', aspect: 'frost', p: { pick: 1, headT: 47, pickL: 23, haft: 'wood', haftR: 2.2, wrap: 'clothGrey', wrapEnd: 15, bands: [], blade: 'steel', bladeTex: rimeTex, edge: 'frost', socket: 'blackiron', tally: 'frost', rime: 'rime', gem: 'sapphire', pommel: 'blackiron' } },
  // Brother Aurel's crozier, frozen to his hand for thirty years: a silver crook curled into a volute and cased in old
  // ice, a cold light hanging in the curl
  'rime-crozier': { r: 'staff', relic: true, fx: 'fall', aspect: 'frost', p: { style: 'crozier', headT: 56, haft: 'silver', haftR: 2, wobble: 0, haftTex: rimeTex, foot: 'silver', bands: [], metal: 'silver', tex: rimeTex, ice: 'ice', orb: 'frost', gem: 'sapphire' } },
  // a deep cowl woven from something that was not wool, under the ice, by someone who was listening: threads of cold
  // light in the weave, a spiral stitched on the brow
  'hushweave-cowl': { r: 'hood', relic: true, fx: 'fall', aspect: 'frost', p: { look: 'hood', mat: 'hushweave', tex: TX2.folds(29), weave: 'frost', spiral: 'silver', trim: 'silver', clasp: 'silver', gem: 'pearl', tip: 0 } },
  // ---- M6: Codex Page IV, the Gloomfen Marsh (codex 53-66) ----
  // a bronze coin worn smooth, a bite clipped off its rim, Hodge's own head struck on its face; a ring through the hole
  'unfair-toll': { r: 'amulet', relic: true, fx: 'bubble', aspect: 'tide', p: { style: 'coin', chain: 'iron', metal: 'bronze', tex: coinWear, gem: 'bronze' } },
  // tall fen boots of oiled leather laced up the shin, a bog-shoe of bent withies strapped under the sole, the fen's moss
  // still on them and a reed in the cuff
  bogstriders: { r: 'boots', relic: true, fx: 'spore', aspect: 'verdant', p: { mat: 'leatherDark', trim: 'moss', fold: true, sole: 'leatherDark', splay: 'willowWood', shoeLace: 'reed', strapMat: 'leather', lacing: 'string', moss: 'moss', reed: 'reed', gem: 'emerald' } },
  // pale willow strung with a hair of the oldest willow in the fen (it glows), fronds weeping from its limbs, tears on them
  'weeping-bow': { r: 'bow', relic: true, fx: 'spore', aspect: 'verdant', p: { len: 62, bulge: 10, limbR: 3.1, tipR: 1.4, limb: 'willowWood', limbTex: TX.grain(153), nock: 'bronze', grip: 'leatherDark', bindings: [.36, .64], bindMat: 'bronze', gem: 'emerald', gemMat: 'bronze', stringMat: 'verdant', fronds: 'willowLeaf', tears: 'water' } },
  // Willowmurk's last ward-shield: withies woven round like a basket lid, a ward-stone in the boss with the ward alight,
  // charms on cords from the rim
  'willow-ward': { r: 'shield', relic: true, fx: 'spore', aspect: 'verdant', p: { style: 'wicker', r: 27, face: 'willowWood', rim: 'bark', binding: 'leather', boss: 'bronze', stone: 'scree', runes: 'verdant', charms: 'bone', gem: 'emerald' } },
  // a flat river stone with a hole worn through it, bound with twine to a band of bog iron; through the hole, an eye
  'hag-stone': { r: 'ring', relic: true, fx: 'rise', aspect: 'blight', p: { style: 'holed', metal: 'bogIron', tex: bogPits, stone: 'scree', eye: 'blight', twine: 'string', gem: 'amethyst' } },
  // a street-lamp's head on a ring for the lamplighter's hook: tapered panes in a leaded frame, a candle burning
  // white-gold in it, verdigris on the cap, water still running off its foot
  'lamplighters-lantern': { r: 'focus', relic: true, fx: 'sparkle', aspect: 'radiant', p: { style: 'lamplighter', metal: 'bronze', frame: 'blackiron', glass: 'radiant', flame: 'radiant', core: 'primal', candle: 'clothWhite', leading: 'blackiron', capTex: verdSpots, capGem: 'pearl', rays: 'radiant', drips: 'water', gem: 'pearl', glow: 'radiant' } },
  // black lace, still wet, hung from a silver comb and falling past the shoulders; a pearl tear at the brow
  'mourning-veil': { r: 'hood', relic: true, fx: 'bubble', aspect: 'tide', p: { look: 'hood', style: 'veil', mat: 'lace', comb: 'silver', trim: 'silver', clasp: 'silver', gem: 'pearl', drips: 'water', tip: 0 } },
  // a copper diving-helm with a Tallyman stamp on its collar: a bolted faceport behind a grille, the side ports, the
  // air-cock and a length of hose; verdigris where the channel got at it
  'salvagers-helm': { r: 'helm', relic: true, fx: 'bubble', aspect: 'tide', p: { look: 'helm', style: 'diving', mat: 'copper', tex: copperGreen, trim: 'brass', glass: 'glass', eyes: 'water', stamp: 'dark', hose: 'leatherDark', crest: false } },
  // the choirmaster's staff of Misthollow: a silver yoke with a bell hung in it, a pearl in the knop, the choir's ribbon,
  // weed trailing from it and barnacles up the haft
  'cantors-staff': { r: 'staff', relic: true, fx: 'bubble', aspect: 'tide', p: { style: 'cantor', headT: 49, haft: 'bogwood', haftR: 2.1, wobble: 0, foot: 'silver', bands: [24, 36], bandMat: 'silver', metal: 'silver', tex: censerTarnish, bell: 'bronze', bellTex: bellPatina, pearl: 'pearl', barnacles: 'barnacle', weed: 'weed', ribbon: 'clothTeal', gem: 'pearl' } },
  // one of Old Jaws's teeth for a blade, as long as a hand, bound onto a bog-oak grip with fishing line; one of his
  // scales for a guard and a bronze fish-hook for a pommel
  'gar-tooth': { r: 'dagger', relic: true, fx: 'bubble', aspect: 'tide', p: { shape: 'tooth', curve: 3.4, gripEnd: 13, guardT: 2.6, bladeL: 38, bladeW: 4.6, blade: 'bone', vein: 'water', binding: 'string', guard: 'scale', guardMat: 'garScale', guardW: 5.4, grip: 'bogwood', gripR: 2.1, pommel: 'bronze', pommelShape: 'hook', pommelR: 2.8 } },
  // iron gauntlets with a link of the Leviathan's chain riveted across each hand, and a length of it hanging from the cuff
  'barge-gauntlets': { r: 'gauntlets', relic: true, fx: 'dust', aspect: 'stone', p: { mat: 'iron', plate: 1, cuffMat: 'blackiron', flare: 1, trim: 'bronze', cuffBand: 'bronze', knuckles: 'iron', link: 'blackiron', linkTex: linkRust, rivet: 'bronze', linkGlow: 'amber', chainCuff: 'blackiron', cuffGem: 'topaz' } },
  // Corvus's harpoon: a barbed iron head on a long shank, a coil of line on a ring at the socket, the butt carved as a
  // crow's head with crow feathers bound under the wrap
  'corvus-harpoon': { r: 'spear', relic: true, fx: 'bubble', aspect: 'tide', p: { headT: 52, headL: 26, headW: 3.4, barbs: 2.6, haft: 'bogwood', haftR: 1.9, butt: 'blackiron', wrap: 'leatherDark', wrapA: 22, wrapB: 34, bands: [20, 36], bandMat: 'blackiron', socket: 'blackiron', head: 'iron', headTex: TX.rust(159), fuller: 'water', line: 'string', crow: 'hairBlack', crowEye: 'amber', feathers: 'rocFeather', gem: 'pearl' } },
  // a great pearl grown in the Leviathan's brow, warm and glowing green-white from inside, in four prongs of black coral
  // on a silver cup crusted with barnacles
  'deep-pearl': { r: 'amulet', relic: true, fx: 'bubble', aspect: 'tide', p: { style: 'deep', chain: 'silver', metal: 'silver', tex: censerTarnish, pearl: 'pearl', glow: 'deepglow', coral: 'rotwood', barnacles: 'barnacle', gem: 'pearl' } },
  // Nettie's shawl, knotted from bog-cotton and hag's hair over a bark-brown robe: an open net of knots, tassels and a
  // few charms on its edges, one thread through it that glows
  'hexbane-shawl': { r: 'robe', relic: true, fx: 'rise', aspect: 'blight', p: { mat: 'robeBark', tex: TX2.folds(66), trim: 'moss', sash: 'clothGrey', shawl: 'bogCotton', hexline: 'blight', charms: 'bone', pauldrons: 'bogCotton', gem: 'amethyst' } },
  // ---- M7: Codex Page V, the Hearth Below (No. 000 and Nos. 67-74). STUB from the M7 scaffold, all nine (stub: true): stand-ins, each
  // its own look; P6 draws the real ones (STUB from the M7 scaffold). ----
  'fenwicks-poker': { r: 'mace', relic: true, stub: true, fx: 'rise', aspect: 'ember', p: { style: 'knob', headT: 52, headW: 6.5, haft: 'blackiron', haftR: 1.8, wrap: 'leatherDark', wrapEnd: 16, bands: [40], bandMat: 'iron', headMat: 'blackiron', pommelR: 2.4, gem: 'ember', trim: 'iron', spike: 0 } },
  'hollow-wreath': { r: 'circlet', relic: true, stub: true, fx: 'rise', aspect: 'verdant', p: { look: 'circlet', style: 'rotwood', mat: 'bark', mat2: 'rotwood', thorn: 'thorn', gem: 'amethyst', leaves: 'bark' } },
  'hollow-chalice': { r: 'focus', relic: true, stub: true, fx: 'rise', aspect: 'ember', p: { style: 'censer', metal: 'blackiron', trim: 'bronze', glow: 'ember', gem: 'amethyst' } },
  'hollow-gauntlet': { r: 'gauntlets', relic: true, stub: true, fx: 'dust', aspect: 'stone', p: { mat: 'blackiron', plate: 1, cuffMat: 'blackiron', trim: 'iron', cuffBand: 'iron', knuckles: 'blackiron', cuffGem: 'amethyst' } },
  'hollow-chain': { r: 'amulet', relic: true, stub: true, fx: 'rise', aspect: 'blight', p: { style: 'coin', chain: 'blackiron', metal: 'blackiron', gem: 'amethyst' } },
  'tamsins-bargain': { r: 'sword', relic: true, stub: true, fx: 'rise', aspect: 'blight', p: { gripEnd: 15, guardT: 3.4, bladeW: 3.8, bladeL: 48, tipL: 9, taper: .88, blade: 'blackiron', fuller: 'blight', fullerR: 1, guard: 'oath', guardMat: 'blackiron', guardW: 10, gem: 'amethyst', grip: 'leatherDark', gripR: 2.1, pommel: 'blackiron', pommelR: 3.2, pommelGem: 'amethyst' } },
  'unmaking-hammer': { r: 'hammer', relic: true, stub: true, fx: 'rise', aspect: 'ember', k: .4, p: { headT: 52, headH: 15, headW: 17, peen: 1, haft: 'blackiron', haftR: 2.6, wrap: 'leatherDark', wrapEnd: 18, bands: [24, 34], bandMat: 'blackiron', headMat: 'blackiron', pommelMat: 'blackiron', pommelR: 3.3, faces: 1, langets: 1, seam: 'blight', spike: 0 } },
  'ironvein-apron': { r: 'leather', relic: true, stub: true, fx: 'rise', aspect: 'stone', p: { mat: 'leatherDark', shirt: 'wool', pauldrons: 'leatherDark', trim: 'blackiron', belt: 'leather', buckle: 'blackiron', gem: 'ember' } },
  'worldforge-heart': { r: 'ring', relic: true, stub: true, fx: 'rise', aspect: 'ember', p: { style: 'signet', metal: 'blackiron', face: 'ruby', seal: 'gold', runes: 'ember', gem: 'ruby' } },
});
export const RELIC_IDS = Object.keys(RELIC_ART);

/* ==== procedural art for rolled items ==== */
const TIER_FIT = [['iron'], ['iron', 'bronze'], ['bronze', 'steel'], ['steel', 'silver', 'bronze'], ['silver', 'steel'], ['gold'], ['bronze'], ['silver']];
const TIER_BLADE = [['iron'], ['iron', 'steel'], ['steel'], ['steel'], ['steel', 'silver'], ['steel'], ['steel'], ['silver']];
const TIER_GRIP = [['leather', 'rags'], ['leather'], ['leather', 'leatherDark', 'leatherRed'], ['leatherDark', 'clothBlue', 'leather'], ['leatherDark', 'clothBlue', 'leatherRed'], ['leatherRed', 'leatherDark'], ['clothTeal'], ['clothWhite']];
const TIER_WOOD = [['wood'], ['wood'], ['wood', 'bogwood'], ['bogwood', 'wood'], ['bogwood'], ['bogwood', 'wood'], ['bogwood'], ['bone']];
const TIER_CLOTH = [['rags', 'wool', 'gambeson'], ['wool', 'gambeson', 'robe'], ['cloakGreen', 'robeRed', 'clothBlue', 'gambeson'], ['clothBlue', 'cloakRed', 'hoodGreen', 'robe'], ['robeRed', 'clothBlue', 'clothWhite'], ['cloakRed', 'clothWhite', 'robeRed'], ['clothTeal'], ['clothWhite']];
const ANY_GEM = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'seaglass'];

function ctxFor(item) {
  const T = rarityTier(item.rarity), A = ASPECT_LOOK[item.aspect] ? item.aspect : null;
  const R = createRng(`${item.kind}|${item.rarity}|${A || '-'}|${item.seed ?? 0}`);
  const pick = a => a[Math.floor(R.next() * a.length)];
  const c = {
    T, A, R, pick,
    rng: (a, b) => +(a + R.next() * (b - a)).toFixed(2),
    int: (a, b) => R.int(a, b),
    chance: p => R.next() < p,
    fit: () => pick(TIER_FIT[T]),
    blade: () => pick(TIER_BLADE[T]),
    grip: () => pick(TIER_GRIP[T]),
    wood: () => pick(TIER_WOOD[T]),
    cloth: () => (A && R.next() < .6 ? ASPECT_LOOK[A].cloth : pick(TIER_CLOTH[T])),
    gem: () => (T >= 7 ? 'prism' : T === 6 ? 'seaglass' : T >= 3 || (T === 2 && R.next() < .35) ? (A ? ASPECT_LOOK[A].gem : pick(ANY_GEM)) : null),
    glow: T >= 3 ? (A ? (T === 7 && R.next() < .5 ? 'primal' : ASPECT_LOOK[A].glow) : TIER_GLOW[T]) : null,
    surf: () => (T === 0 ? TX.rust(R.int(1, 999)) : T === 6 ? verdTex(R.int(1, 999)) : A && T >= 2 ? surfTex(A, R.int(1, 999)) : null),
  };
  return c;
}
const GEN = {
  sword: c => {
    const g = c.gem(), p = { gripEnd: c.rng(11.5, 15), guardT: c.rng(3, 4.2), bladeW: c.rng(3, 4.2), bladeL: c.rng(38, 52), tipL: c.rng(6, 10), taper: c.rng(.84, .93), blade: c.blade(), guard: c.T >= 5 && c.chance(.6) ? 'flame' : 'bar', guardMat: c.fit(), guardW: c.rng(7, 10.5), guardR: c.rng(1.5, 2.1), grip: c.grip(), gripR: c.rng(1.9, 2.2), pommel: c.fit(), pommelR: c.rng(2.6, 3.5), bladeTex: c.surf() };
    if (c.T === 0) { p.notches = [[c.rng(40, 56), -3.5, 1.3]]; p.guardTex = TX.rust(c.int(1, 99)); p.pommelTex = TX.rust(c.int(1, 99)); }
    if (g) { p.gem = g; if (c.T >= 3) p.pommelGem = g; }
    if (p.guard === 'flame' && !p.gem) p.gem = 'ruby';
    if (c.glow) { p.fuller = c.glow; p.fullerR = c.rng(.8, 1.1); } else if (c.T === 2 && c.chance(.5)) { p.fuller = 'iron'; p.fullerR = .8; }
    if (c.A === 'ember' && c.T >= 4) p.heat = 1;
    return { r: 'sword', p };
  },
  hammer: c => {
    const p = { headT: c.rng(48, 55), headH: c.rng(10, 15), headW: c.rng(10, 15), haft: c.wood(), haftR: c.rng(2.1, 2.5), wrap: c.grip(), wrapEnd: c.rng(15, 19), bands: c.T >= 1 ? (c.T >= 3 ? [c.rng(22, 27), c.rng(32, 38)] : [c.rng(22, 28)]) : [], bandMat: c.fit(), headMat: c.A === 'stone' ? 'granite' : c.blade(), pommelMat: c.fit(), pommelR: c.rng(2.6, 3.2), faces: c.chance(.6) ? 1 : 0, spike: c.T >= 2 && c.chance(.5) ? c.rng(5, 11) : 0, trim: c.T >= 4 ? c.fit() : null, langets: c.T >= 3 && c.chance(.6) ? 1 : 0, runes: c.glow, headTex: c.A === 'stone' ? TX2.granite(c.int(1, 99)) : c.surf() };
    return { r: 'hammer', p };
  },
  mace: c => {
    const style = c.pick(['flanged', 'star', 'knob']);
    const p = { style, headT: c.rng(50, 54), headW: c.rng(6.5, 8.5), haft: c.wood(), haftR: 2.1, wrap: c.grip(), wrapEnd: 16, bands: c.T >= 2 ? [c.rng(38, 42)] : [], bandMat: c.fit(), headMat: c.chance(.5) ? c.fit() : c.blade(), pommelR: 2.8, gem: c.T >= 3 ? c.gem() : null, trim: c.fit(), spike: style === 'flanged' && c.T >= 2 ? c.rng(3, 5) : 0, headTex: c.surf() };
    return { r: 'mace', p };
  },
  axe: c => {
    const p = { headT: c.rng(45, 50), bladeLo: c.rng(10, 15), bladeHi: c.rng(7, 10), bladeW: c.rng(15, 20), bulge: c.rng(2, 4), back: c.pick(c.T === 0 ? ['poll', 'none'] : ['poll', 'spike', 'double', 'none']), spikeL: c.rng(5, 9), haft: c.wood(), haftR: c.rng(2, 2.4), wrap: c.T >= 1 ? c.grip() : null, wrapEnd: c.rng(14, 18), bands: c.T >= 2 ? [c.rng(20, 28)] : [], bandMat: c.fit(), blade: c.blade(), edge: c.glow && c.T >= 4 ? c.glow : null, socket: c.fit(), gem: c.T >= 3 ? c.gem() : null, runes: c.glow, bladeTex: c.surf(), vine: c.A === 'verdant' && c.T >= 3 ? 'bramble' : null, leaves: c.A === 'verdant' && c.T >= 5 ? 'moss' : null };
    return { r: 'axe', p };
  },
  dagger: c => {
    const fang = c.T >= 4 && (c.A === 'verdant' || c.A === 'blight') && c.chance(.35);
    const shape = fang ? 'fang' : c.pick(['straight', 'leaf', 'knife']);
    const g = c.gem();
    const p = { shape, curve: fang ? c.rng(4, 8) : shape !== 'knife' && c.chance(.2) ? c.rng(1, 3) : 0, gripEnd: c.rng(11, 14), guardT: c.rng(2.6, 3.4), bladeL: c.rng(32, 41), bladeW: c.rng(4.2, 5.4), blade: fang ? 'bone' : c.blade(), guard: fang ? 'thorn' : c.pick(c.T >= 4 ? ['bar', 'quillon', 'coin'] : ['bar', 'quillon']), guardMat: c.fit(), guardW: c.rng(6, 9), grip: c.grip(), gripR: 2.1, pommel: c.fit(), pommelR: c.rng(2.6, 3.4), pommelGem: c.T >= 3 ? g : null, bladeTex: c.surf() };
    if (c.glow) { if (shape === 'knife' && c.T >= 4) p.tally = c.glow; else if (fang) p.vein = c.glow; else if (shape !== 'knife') p.fuller = c.glow; }
    if (c.T === 0) p.notches = [[p.gripEnd + p.guardT + p.bladeL * .6, p.bladeW * .9, 1.1]];
    return { r: 'dagger', p };
  },
  spear: c => {
    const p = { headT: c.rng(58, 63), headL: c.rng(14, 22), headW: c.rng(3.8, 5.5), wings: c.T >= 2 && c.chance(.5) ? c.rng(1.5, 3) : 0, haft: c.wood(), haftR: c.rng(1.6, 1.9), butt: c.fit(), wrap: c.T >= 1 ? c.grip() : null, wrapA: 24, wrapB: 36, bands: c.T >= 2 ? [c.rng(18, 22), c.rng(40, 46)] : [], bandMat: c.fit(), socket: c.fit(), head: c.blade(), fuller: c.glow, gem: c.T >= 4 ? c.gem() : null, ribbon: c.T >= 2 ? c.cloth() : null, headTex: c.surf() };
    return { r: 'spear', p };
  },
  staff: c => {
    const g = c.gem();
    const style = c.T < 2 ? c.pick(['crook', 'gnarl']) : c.A === 'radiant' && c.chance(.5) ? 'sun' : c.pick(['crook', 'orb', 'gnarl', 'rings']);
    const lit = c.T >= 4 && c.glow;
    const p = { style, headT: c.rng(60, 66), haft: c.wood(), haftR: c.rng(1.9, 2.3), wobble: style === 'gnarl' ? c.rng(.6, 1.2) : 0, wrap: c.T >= 1 ? c.grip() : null, bands: c.T >= 2 ? [c.rng(44, 52)] : [], bandMat: c.fit(), metal: c.fit(), foot: c.fit(), gem: style === 'crook' ? g : null, orb: lit ? c.glow : g || 'sapphire', crystal: lit ? c.glow : g || 'granite', glow: c.glow, leaves: c.A === 'verdant' ? 'moss' : null };
    return { r: 'staff', p };
  },
  bow: c => {
    const p = { len: c.rng(54, 64), bulge: c.rng(8, 10.5), limbR: c.rng(2.8, 3.3), tipR: 1.4, limb: c.T === 7 ? 'bone' : c.wood(), nock: c.T >= 5 ? c.fit() : 'bone', grip: c.grip(), bindings: c.T >= 1 ? [.27, .73] : [], bindMat: c.T >= 3 ? c.fit() : 'string', gem: c.T >= 3 ? c.gem() : null, gemMat: c.fit(), tassel: c.T >= 4 ? c.cloth() : null, limbTex: c.surf() };
    return { r: 'bow', p };
  },
  shield: c => {
    const paint = c.T >= 1 && c.T <= 5 && c.chance(.6) ? c.pick(['chevron', 'quarter', 'thorn']) : null;
    const face = paint ? c.pick(['paintGreen', 'paintRed', 'clothBlue']) : c.T >= 4 && c.chance(.4) ? c.blade() : 'wood';
    const p = { r: c.rng(22, 28), face, planks: face === 'wood', paint, paint2: face === 'paintRed' ? 'paintGreen' : 'paintRed', rim: c.fit(), boss: c.fit(), bossR: c.rng(6, 8.5), gem: c.T >= 3 ? c.gem() : null, rivets: c.T >= 2 ? c.fit() : null, runes: c.glow };
    if (paint === 'thorn') p.paint2 = 'bramble';
    return { r: 'shield', p };
  },
  focus: c => {
    const style = c.pick(['sigil', 'orb', 'tome', 'rings']), g = c.gem() || c.pick(['ruby', 'sapphire', 'emerald', 'topaz']);
    const p = { style, metal: c.fit(), gem: style === 'orb' && c.T >= 4 && c.glow ? c.glow : g, runes: c.glow, cover: c.pick(['leatherRed', 'leatherDark', 'clothBlue', 'leather']), glow: c.glow, moss: c.A === 'verdant' ? 'moss' : null, metal2: c.wood() };
    return { r: 'focus', p };
  },
  hood: c => ({ r: 'hood', p: { look: 'hood', mat: c.cloth(), trim: c.T >= 2 ? c.pick(['leather', c.fit()]) : null, clasp: c.T >= 2 ? c.fit() : null, gem: c.T >= 3 ? c.gem() : null, tip: c.chance(.6) ? 1 : 0, vine: c.A === 'verdant' && c.T >= 3 ? 'bramble' : null, leaf: c.A === 'verdant', tex: TX2.folds(c.int(1, 99)) } }),
  coif: c => { const mat = c.T >= 2 ? c.pick(['steel', 'iron']) : c.pick(['wool', 'leather', 'rags']); return { r: 'coif', p: { look: 'coif', mat, tex: MAT[mat].metal ? mailTex : null, flaps: c.chance(.5) ? 1 : 0, band: c.T >= 3 ? c.fit() : 'leather', gem: c.T >= 4 ? c.gem() : null } }; },
  kettle: c => ({ r: 'kettle', p: { look: 'kettle', mat: c.blade(), tex: c.surf(), trim: c.fit(), crest: c.T >= 3 && c.chance(.5) ? c.fit() : null, runes: c.glow, gem: c.T >= 4 ? c.gem() : null } }),
  helm: c => ({ r: 'helm', p: { look: 'helm', mat: c.T === 7 ? 'silver' : c.T === 5 && c.chance(.4) ? 'gold' : c.blade(), trim: c.fit(), crest: c.chance(.7), crestMat: c.T >= 4 ? c.fit() : null, plume: c.T >= 4 && c.chance(.6) ? c.cloth() : null, runes: c.glow, gem: c.T >= 4 ? c.gem() : null, tex: c.surf() } }),
  circlet: c => ({ r: 'circlet', p: { look: 'circlet', mat: c.T <= 1 ? c.pick(['bronze', 'iron']) : c.fit(), gem: c.gem() || c.pick(['topaz', 'pearl', 'seaglass']), filigree: c.T >= 3 } }),
  crown: c => ({ r: 'crown', p: { style: 'regal', metal: c.T >= 5 ? 'gold' : c.fit(), gem: c.gem() || 'ruby', gem2: c.pick(ANY_GEM), pearls: c.T >= 4 ? 'pearl' : null, glow: c.T >= 5 ? c.glow : null, tines: c.pick([3, 5, 7]), tall: c.chance(.4), tex: c.T === 6 ? verdTex(c.int(1, 99)) : c.T === 0 ? TX.rust(c.int(1, 99)) : null } }),
  robe: c => { const mat = c.cloth(); return { r: 'robe', p: { mat, trim: c.T >= 1 ? c.fit() : null, sash: c.cloth(), cowl: c.chance(.5) ? mat : null, glyph: c.glow, glyphShape: c.A === 'verdant' ? 'tree' : 'sun', gem: c.T >= 4 ? c.gem() : null, sleeve: c.T >= 2 && c.chance(.5) ? c.cloth() : null, tex: TX2.folds(c.int(1, 99)) } }; },
  leather: c => ({ r: 'leather', p: { mat: c.pick(c.T >= 2 ? ['leather', 'leatherDark', 'leatherRed'] : ['leather', 'leatherDark']), shirt: c.T <= 1 ? c.pick(['rags', 'wool', 'gambeson']) : c.cloth(), studs: c.T >= 1 && c.chance(.6) ? c.fit() : null, pauldrons: c.T >= 2 ? c.pick(['leather', 'leatherDark', c.fit()]) : null, trim: c.T >= 3 ? c.fit() : null, laces: c.chance(.7), belt: 'leather', buckle: c.fit(), pouch: c.chance(.5) ? 'leatherDark' : null, gem: c.T >= 4 ? c.gem() : null, vine: c.A === 'verdant' && c.T >= 3 ? 'bramble' : null, leaf: c.A === 'verdant' } }),
  mail: c => ({ r: 'mail', p: { mat: c.blade(), tex: c.chance(.5) ? mailTex : scaleTex(c.int(3, 4), c.int(1, 9)), trim: c.fit(), belt: 'leather', pauldrons: c.T >= 2 && c.chance(.6) ? c.blade() : null, pdTex: scaleTex(3, 5) } }),
  plate: c => ({ r: 'plate', p: { mat: c.T === 7 ? 'silver' : c.T === 5 && c.chance(.4) ? 'gold' : c.blade(), trim: c.T >= 2 ? c.fit() : null, under: 'iron', runes: c.glow, gem: c.T >= 4 ? c.gem() : null, pdTex: c.T === 0 ? TX.rust(c.int(1, 99)) : null } }),
  gloves: c => ({ r: 'gloves', p: { mat: c.pick(['leather', 'leatherDark', 'leatherRed', 'wool']), trim: c.T >= 2 ? c.fit() : null, gem: c.T >= 4 ? c.gem() : null, runes: c.glow } }),
  gauntlets: c => { const m = c.blade(); return { r: 'gauntlets', p: { mat: m, plate: 1, cuffMat: m, trim: c.T >= 2 ? c.fit() : null, gem: c.T >= 4 ? c.gem() : null, runes: c.glow } }; },
  boots: c => ({ r: 'boots', p: { mat: c.pick(['leather', 'leatherDark', 'leatherRed', 'wool']), trim: c.pick(c.T >= 3 ? ['leather', 'leatherDark', c.fit()] : ['leather', 'leatherDark']), fold: c.chance(.4), greave: c.T >= 3 && c.chance(.4) ? c.blade() : null, straps: c.chance(.4) ? 'leatherDark' : null, buckle: c.T >= 2 ? c.fit() : null, gem: c.T >= 4 ? c.gem() : null, vine: c.A === 'verdant' && c.T >= 3 ? 'bramble' : null } }),
  amulet: c => ({ r: 'amulet', p: { chain: c.fit(), metal: c.fit(), gem: c.gem() || c.pick(c.T === 0 ? ['granite', 'bone'] : ['topaz', 'seaglass', 'emerald', 'ruby']), style: c.T >= 4 ? c.pick(['sun', 'seal']) : null, frame: c.T >= 3 ? c.pick(['gold', 'silver', 'bronze']) : null, glyph: c.T >= 5 ? c.glow : null } }),
  ring: c => ({ r: 'ring', p: { metal: c.fit(), gem: c.T >= 3 || (c.T >= 1 && c.chance(.7)) ? (c.gem() || c.pick(ANY_GEM)) : null, runes: c.glow } }),
};
export const ITEM_KINDS = Object.keys(GEN);
// base item ids from data/items.js nudge the procedural look toward that base (a maul is bigger than a warhammer)
const BASE_HINT = {
  'belt-knife': { p: { shape: 'knife', bladeL: 30 } }, rondel: { p: { shape: 'straight', guard: 'coin', bladeW: 3.8 } },
  'arming-sword': { p: { bladeL: 42 } }, longsword: { p: { bladeL: 50, gripEnd: 15 } }, greatsword: { p: { bladeL: 54, bladeW: 4.4, gripEnd: 18, guardW: 11 }, k: .4 },
  'hand-axe': { p: { bladeW: 14, bladeLo: 10, back: 'none' } }, 'bearded-axe': { p: { bladeLo: 16, bladeW: 19 } },
  maul: { p: { headW: 16, headH: 16, haftR: 2.7, faces: 1 }, k: .4 }, mace: { p: { style: 'knob' } }, 'flanged-mace': { p: { style: 'flanged' } },
  spear: { p: { wings: 0 } }, 'boar-spear': { p: { wings: 3, headW: 5.6 } },
  shortbow: { p: { len: 52, bulge: 8 } }, longbow: { p: { len: 64, bulge: 10 } },
  quarterstaff: { p: { style: 'crook', gem: null } }, 'rowan-staff': { p: { style: 'gnarl', leaves: 'moss' } },
  buckler: { p: { r: 20, shape: null } }, 'heater-shield': { p: { shape: 'heater' } }, 'tower-shield': { p: { shape: 'tower' } },
  'holy-symbol': { p: { style: 'sigil' } }, 'rune-focus': { p: { style: 'orb' } },
  'mail-coif': { p: { mat: 'steel', tex: mailTex, flaps: 1 } }, 'bronze-crown': { p: { metal: 'bronze' } },
  brigandine: { p: { studs: 'bronze', pauldrons: 'leatherDark' } }, hauberk: { p: { pauldrons: 'steel' } },
  'ironshod-boots': { p: { greave: 'iron', sole: 'iron' } },
};

const artCache = lru(4000);
// itemArt(item) -> { r, p, ... } recipe params. Accepts an ItemInstance ({ base, kind, rarity, aspect, seed, temper,
// gems, deeds, awakened }), a relic id string, or an art object (returned as-is). Deterministic: same inputs, same look.
// An item with temper 1-10 gets its own tempered art object (art.temper = n); temper 0 returns the plain art. Gems set
// in sockets and a relic's stage (M4) give a further art object of their own (art.gems, art.stage, art.branch), so every
// cache keyed by the art object's identity (objId) sees a new look when any of them changes.
export function itemArt(item) {
  if (!item) return null;
  if (typeof item === 'string') return RELIC_ART[item] || null;
  if (item.r && item.p) return item;
  const n = temperOf(item), fx = forgeFx(item);
  let art = null;
  for (const k of [item.base, item.relic, item.id]) if (k && RELIC_ART[k]) { art = RELIC_ART[k]; break; }
  if (!art) {
    const gen = GEN[item.kind];
    if (!gen) return null;
    const key = `${item.kind}|${item.rarity}|${item.aspect || '-'}|${item.seed ?? 0}`;
    art = artCache.get(key + '|' + (item.base || ''), () => {
      const a = gen(ctxFor(item)), h = BASE_HINT[item.base];
      if (h) { Object.assign(a.p, h.p); if (h.k) a.k = h.k; }
      a.kind = item.kind; a.rarity = item.rarity; a.aspect = item.aspect || null; a.base = item.base || null;
      return a;
    });
  }
  const t = n ? tempered(art, n) : art;
  return fx ? dressed(t, fx) : t;
}
// itemLookKey(item) -> a string that changes whenever the item's look does (base, kind, rarity, aspect, seed, temper,
// gems, stage and branch): for UI caches keyed by item (sprite sheets, canvases), so they never show stale art.
export function itemLookKey(item) {
  if (!item || typeof item !== 'object') return String(item ?? '-');
  if (item.r && item.p) return objId(item);
  const fx = forgeFx(item);
  return [item.base || '', item.kind || '', item.rarity || '', item.aspect || '', item.seed ?? 0, temperOf(item), fx ? fx.key : '-'].join('/');
}
// artStage(item) -> 'kindled' | 'awakened' | null (dormant, or not a relic): what rules/codex.js stageOf reads, taken
// from the item alone (art never imports rules). Awakened: item.awakened names a branch; Kindled: a deed is done.
export function artStage(item) {
  if (!item || typeof item !== 'object' || item.p) return null;
  if (item.awakened === 'a' || item.awakened === 'b') return 'awakened';
  return item.deeds && typeof item.deeds === 'object' && Object.values(item.deeds).some(Boolean) ? 'kindled' : null;
}
// the forge's marks on an item: gems set (as materials, one per socket, null for an empty one) and its stage
function forgeFx(item) {
  const gems = Array.isArray(item.gems) ? item.gems.map(g => (typeof g === 'string' && GEM_MAT[g]) || null) : [];
  const stage = artStage(item), set = gems.some(Boolean);
  if (!stage && !set) return null;
  const branch = stage === 'awakened' ? item.awakened : null;
  return { gems: set ? gems : null, stage, branch, key: (set ? gems.map(g => g || '-').join(',') : '') + '|' + (stage || '-') + (branch || '') };
}

/* ==== temper (M3 spec §3.9): +1 adds a glint, +2 lifts the metal one ramp step, +3 adds an aspect-coloured edge ====
   Each step keeps the ones below it. Temper 0 (every M2 item) never reaches this code.
   M4 (spec §6.3): +4 to +10 brighten the metal further each step, +7 to +9 glow (the metal's rim turns to the
   aspect's glow in the recipe, P.tglow, and the card gets a glowing aura), +10 burns white (the rim is 'primal'
   white fire and the card wears a white flame). +1 to +3 are exactly as in M3. */
export const TEMPER_MAX = 10;
export function temperOf(item) {
  const n = item && typeof item === 'object' ? Math.floor(+item.temper || 0) : 0;
  return n < 0 ? 0 : n > TEMPER_MAX ? TEMPER_MAX : n;
}
const edgeGlow = aspect => (ASPECT_LOOK[aspect] ? ASPECT_LOOK[aspect].glow : 'radiant');
// temperMat(mat, n, aspect, any) -> a material key. At n >= 2 a metal (or, with `any`, any non-glowing material)
// becomes a variant registered in MAT: its ramp lifted one step, and at n >= 3 its two darkest steps tinted by the
// aspect's glow. Registering the variants in MAT lets the hero sprite and walkers draw them by name like any other.
export function temperMat(m, n, aspect, any = false) {
  const b = MAT[m];
  if (n < 2 || !b || b.emit || b.temper || b.stage || !(b.metal || any)) return m;
  const edge = n >= 3 ? edgeGlow(aspect) : '', key = n <= 3 ? `${m}^${edge}` : `${m}^${edge}^${n}`;
  if (!MAT[key]) {
    const p = b.pal, pal = [p[1], p[2], p[3], p[4], p[5], mix(p[5], [255, 255, 255], .45)];
    if (edge) { const g = MAT[edge].pal; pal[0] = mix(g[1], p[1], .3); pal[1] = mix(g[2], p[2], .45); }
    // +4 and up: each step brightens the metal, the middle toward the aspect's light, the top toward white heat
    if (n >= 4) { const f = (n - 3) / 7, g = MAT[edge].pal; for (let k = 1; k < 6; k++) pal[k] = mix(pal[k], k >= 4 ? [255, 250, 240] : g[k + 1], f * (.2 + k * .07)); }
    MAT[key] = Object.assign({}, b, { pal: pal.map(c => c.map(Math.round)), temper: n, of: m });
  }
  return key;
}
/* ==== stages (M4 spec §4.3, §6.3): Kindled ('k') tints the darkest step toward ember, so the outline and the
   shadow side read as a faint ember rim; Awakened repaints every step toward its branch's ramp by value, the Hand
   ('a') warm and ember, the Heart ('b') cool and radiant, and swaps glows that are not of the branch's temper. ==== */
const BRANCH_RAMP = { a: ramp('#2a0a04 #6a1e08 #b04a10 #e88a28 #ffc860 #fff0c0'), b: ramp('#0a1030 #1c3070 #3e68b8 #82b0e8 #d4e8ff #fffef0') };
const BRANCH_GLOW = { a: ['ember', new Set(['ember', 'amber', 'radiant', 'eyeRed', 'heat'])], b: ['heartglow', new Set(['frost', 'water', 'storm', 'radiant', 'heartglow', 'primal'])] };
export const BRANCH_LOOK = Object.freeze({ a: { name: 'the Hand', color: '#ff9a3a', aura: '#ffb04a' }, b: { name: 'the Heart', color: '#a8c8ff', aura: '#cfe0ff' } });
const lum = c => c[0] * .3 + c[1] * .59 + c[2] * .11;
export function stageMat(m, s) {
  const b = MAT[m];
  if (!b || b.stage || !s) return m;
  if (b.emit) { if (s === 'k') return m; const [g, keep] = BRANCH_GLOW[s]; return keep.has(b.of || m) ? m : g; }
  const key = `${m}~${s}`;
  if (!MAT[key]) {
    const pal = b.pal.map(c => c.slice()), E = MAT.ember.pal;
    if (s === 'k') { pal[0] = mix(pal[0], E[1], .6); pal[1] = mix(pal[1], E[2], .2); }
    else {
      const T = BRANCH_RAMP[s];
      for (let k = 0; k < 6; k++) { const l = Math.min(4.99, lum(pal[k]) / 255 * 5.4), i = Math.floor(l); pal[k] = mix(pal[k], mix(T[i], T[Math.min(5, i + 1)], l - i), .52); }
      pal[0] = mix(pal[0], s === 'a' ? E[1] : T[1], .45);
    }
    MAT[key] = Object.assign({}, b, { pal: pal.map(c => c.map(Math.round)), stage: s, of: b.of || m });
  }
  return key;
}
const stageKey = art => (art.stage === 'awakened' ? (art.branch === 'b' ? 'b' : 'a') : art.stage === 'kindled' ? 'k' : null);
// stagedArt(art, stage, branch) -> an art object painted for a stage ('kindled' | 'awakened'), for art with no item
// behind it (a foe's kit: Tamsin at Scorchgate)
export function stagedArt(art, stage, branch = null) { return art && art.p ? dressed(art, { gems: null, stage, branch, key: '|' + stage + (branch || '') }) : art; }
// the art with its gems set and its stage painted: materials in p go to their stage variants, sockets to P.sockets
const dressCache = lru(600);
function dressed(art, fx) {
  return dressCache.get(objId(art) + '|' + fx.key, () => {
    const p = art.p, q = Object.assign({}, p), a = Object.assign({}, art, { p: q, stage: fx.stage, branch: fx.branch, gems: fx.gems });
    const s = stageKey(a);
    if (s) for (const k of Object.keys(p)) if (!NOT_MAT.has(k) && typeof p[k] === 'string' && MAT[p[k]]) q[k] = stageMat(p[k], s);
    if (fx.gems) { q.sockets = fx.gems; q.socketMat = [q.guardMat, q.socket, q.rim, q.metal, q.trim, q.bandMat, q.frame, q.buckle].find(m => typeof m === 'string' && MAT[m] && !MAT[m].emit) || 'gold'; }
    return a;
  });
}
// recipe params that hold names but are not materials
const NOT_MAT = new Set(['look', 'style', 'shape', 'paint', 'guard', 'pommelShape', 'back', 'glyphShape']);
// What brightens: the metal, when metal is at least a fifth of the item at 64px; otherwise (a leather jerkin with
// one buckle, a bow, a robe) every material that does not glow. Decided once per item, so card, icon, hero and
// walker agree.
const shareCache = lru(600);
const mostlySoft = art => shareCache.get(objId(art), () => { const R = itemRaster(art, 64); let all = 0, metal = 0; for (let i = 0; i < R.own.length; i++) if (R.own[i] >= 0) { all++; if (MAT[R.mat[i]].metal) metal++; } return metal < all * .2; });
function temperArt(art, n) {
  const p = art.p, q = Object.assign({}, p), any = mostlySoft(art);
  if (n >= 2) for (const k of Object.keys(p)) if (!NOT_MAT.has(k) && typeof p[k] === 'string' && MAT[p[k]]) q[k] = temperMat(p[k], n, art.aspect, any);
  if (n >= 7) { q.tglow = n >= 10 ? 'primal' : edgeGlow(art.aspect); if (any) q.tglowAll = true; }
  return Object.assign({}, art, { p: q, temper: n, temperAll: any });
}
const temperCache = lru(600);
const tempered = (art, n) => temperCache.get(objId(art) + '|' + n, () => temperArt(art, n));
// the raster with every metal pixel on its tempered variant (materials the recipe picks by default included), and
// every pixel on its stage variant (a Kindled rim or an Awakened repaint reaches the recipe's own defaults too)
const tRasterCache = lru(300);
function temperedRaster(art, size) {
  return tRasterCache.get(objId(art) + '@' + size, () => {
    const R = itemRaster(art, size), n = art.temper || 0, s = stageKey(art);
    if (n < 2 && !s) return R;
    const mat = R.mat.slice();
    for (let i = 0; i < mat.length; i++) {
      if (!mat[i]) continue;
      if (n >= 2) mat[i] = temperMat(mat[i], n, art.aspect, !!art.temperAll);
      if (s && mat[i] !== 'dark' && mat[i] !== 'string') mat[i] = stageMat(mat[i], s);
    }
    return Object.assign({}, R, { mat });
  });
}
// the +1 glint: a second bright point on the metal, about a third of the item away from the first
const glint2Cache = lru(300);
function temperGlint(art, size) {
  return glint2Cache.get(objId(art) + '@' + size, () => {
    const R = itemRaster(art, size), g = glintPoint(art, size), { w, h, own, idx, mat } = R, want = size * .3;
    let best = null, bs = -1e9;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (own[i] < 0 || idx[i] < 3) continue; const m = MAT[mat[i]]; if (!m.metal && !m.gem) continue;
      const d = g ? Math.hypot(x - g[0], y - g[1]) : want, s = idx[i] * 2 - Math.abs(d - want) * .6;
      if (s > bs) { bs = s; best = [x, y]; }
    }
    return best || g;
  });
}
// the +3 edge: the outline around tempered metal takes the aspect's glow, with a soft second ring on portraits
function temperEdge(img, R, art, soft) {
  const { w, h, own, mat } = R, d = img.data, g = MAT[edgeGlow(art.aspect)].pal, c1 = g[3], c2 = g[2];
  const hot = (x, y) => x >= 0 && y >= 0 && x < w && y < h && own[y * w + x] >= 0 && (MAT[mat[y * w + x]].temper || 0) >= 3;
  const ring = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (own[y * w + x] >= 0) continue; if (hot(x - 1, y) || hot(x + 1, y) || hot(x, y - 1) || hot(x, y + 1)) ring[y * w + x] = 1; }
  for (let i = 0; i < w * h; i++) {
    if (ring[i]) { const j = i * 4; d[j] = c1[0]; d[j + 1] = c1[1]; d[j + 2] = c1[2]; d[j + 3] = 255; continue; }
    if (!soft || own[i] >= 0) continue;
    const x = i % w, y = (i / w) | 0;
    if (!((x > 0 && ring[i - 1]) || (x < w - 1 && ring[i + 1]) || (y > 0 && ring[i - w]) || (y < h - 1 && ring[i + w]))) continue;
    const j = i * 4, a = .38 * (d[j + 3] ? 1 : .8);
    d[j] = d[j] * (1 - a) + c2[0] * a; d[j + 1] = d[j + 1] * (1 - a) + c2[1] * a; d[j + 2] = d[j + 2] * (1 - a) + c2[2] * a; d[j + 3] = Math.max(d[j + 3], 150);
  }
}

/* ==== portraits & icons ==== */
const rasterCache = lru(600), iconCache = lru(600);
export function itemRaster(art, size) { return rasterCache.get(objId(art) + '@' + size, () => renderItem(art, size, size < 32 ? { rm: .8 } : {})); }
function portraitBg(rar, t, size) {
  const L = RARITY_LOOK[rar] || RARITY_LOOK.worn, c = L.bg.map(hx), rays = L.rays;
  return (out, w, h, put) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = x + .5 - w / 2, dy = y + .5 - h * .47, d = Math.hypot(dx, dy);
      let l = 3 - d / (w * .5) * 3.3 + bayer(x, y) * .9;
      if (rays && d < w * .52) { const a = Math.atan2(dy, dx) + t * .15; if (Math.floor((a + Math.PI) * 8 / Math.PI) & 1) l += .45; }
      if (L.flame) { const f = vnoise(x * .18, y * .12 + t * 2.2, 3) * (y / h); if (f > .45) l += (f - .45) * 3; }
      l = l < 0 ? 0 : l > 3 ? 3 : Math.round(l); put(y * w + x, c[l], 1);
    }
  };
}
// the brightest metal/gem highlight, preferring the business end of weapons
function findGlint(art, R) {
  const weapon = RECIPE[art.r] && RECIPE[art.r].cls, { w, h, own, idx, mat } = R; let best = null, bs = -1e9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (own[i] < 0 || idx[i] < 4) continue; const m = MAT[mat[i]]; if (!m.metal && !m.gem && !m.emit) continue;
    const s = weapon ? x - y * 1.1 : -(Math.abs(x - w * .42) + Math.abs(y - h * .36)) + idx[i] * 2;
    if (s > bs) { bs = s; best = [x, y]; }
  }
  return best;
}
const glintCache = lru(600);
export function glintPoint(art, size) { return glintCache.get(objId(art) + '@' + size, () => findGlint(art, itemRaster(art, size))); }
// deterministic motes for portraits (and anything else that wants aspect particles)
export function motes(kind, t, w, h, n, rampCols) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const r1 = hash(k, 1, 91), r2 = hash(k, 2, 91), r3 = hash(k, 3, 91), sp = .08 + r2 * .12;
    let x = r1 * w, y, a = 1, c = rampCols[2 + (k % 3)];
    const ph = (t * sp + r3) % 1;
    switch (kind) {
      case 'fall': y = ph * h; x += Math.sin(t * 1.3 + k) * 2; a = .85; break;
      case 'spark': y = r3 * h; a = Math.sin(t * 9 + k * 2.3) > .6 ? 1 : 0; break;
      case 'dust': y = h - ph * h * .5; x += Math.sin(t + k) * 3; a = .5 + .4 * (1 - ph); break;
      case 'spore': y = h - ph * h; x += Math.sin(t * .9 + k * 1.7) * 3.5; a = Math.min(1, (1 - ph) * 2) * .9; break;
      case 'bubble': y = h - ph * h; x += Math.sin(t * 2 + k) * 1.2; a = .6; break;
      case 'sparkle': y = r3 * h * .9; a = Math.max(0, Math.sin(t * 2.5 + k * 1.9)); c = rampCols[4]; break;
      default: y = h - ph * h; x += Math.sin(t * 3 + k) * 1.2; a = Math.min(1, y / (h * .3));
    }
    if (a > .05) out.push({ x, y, c, a });
  }
  return out;
}
// +10's white flame: tongues of white fire rising off the top of the item's silhouette (particles for compose)
const topsCache = lru(120);
function whiteFlame(R, t, reduced) {
  const tops = topsCache.get(objId(R), () => { const T = []; for (let x = 0; x < R.w; x++) for (let y = 0; y < R.h; y++) if (R.own[y * R.w + x] >= 0) { T.push([x, y]); break; } return T; });
  const out = [], n = Math.max(6, Math.round(R.w * .45)), C = [[255, 255, 255], [236, 242, 255], [200, 216, 255]];
  if (!tops.length) return out;
  for (let k = 0; k < n; k++) {
    const [x, y] = tops[Math.floor(hash(k, 3, 41) * tops.length)], ph = reduced ? .3 : (t * (.9 + hash(k, 5, 41) * .8) + hash(k, 7, 41)) % 1, h = 3 + hash(k, 9, 41) * R.h * .1;
    for (let j = 0; j < 3; j++) { const q = ph + j * .12; if (q > 1) continue; out.push({ x: x + Math.round(Math.sin(t * 5 + k + j) * .6), y: Math.round(y - 1 - q * h), c: C[j], a: (1 - q) * (j ? .7 : .95) }); }
  }
  return out;
}
// itemPortrait(itemOrArt, { size=64, t=0, rarity, reduced, hue, develop, silhouette }) -> ImageData (card portrait,
// prototype treatment). develop 0..1 paints only that fraction of the item's pixels (the Storied identify ritual).
export function itemPortrait(item, o = {}) {
  const art = itemArt(item); if (!art) return null;
  const size = o.size || 64, t = o.reduced ? 0 : (o.t || 0), rar = o.rarity || item.rarity || art.rarity || (art.relic ? 'heirloom' : 'worn');
  const L = RARITY_LOOK[rar] || RARITY_LOOK.worn, R = art.temper || art.stage ? temperedRaster(art, size) : itemRaster(art, size), k = size / 64;
  const hue = o.hue ?? (170 + t * 30) % 360, n = art.temper || 0, pulse = o.reduced ? 0 : Math.sin(t * 2.2) * .06;
  const oo = { bg: portraitBg(rar, t, size), shadow: [Math.max(1, Math.round(2 * k)), Math.max(1, Math.round(2 * k)), [0, 0, 0], .35], rim: hx(L.rim), hue };
  if (L.tier >= 3) oo.aura = [L.gem === 'prism' ? hsl(hue, .8, .62) : hx(L.aura), Math.max(1, Math.round(2 * k)), .32 + pulse];
  // M4: the aura says the forge's last word: an Awakened branch, then a glowing temper (+7), then a Kindled ember rim
  if (art.stage === 'awakened') oo.aura = [hx(BRANCH_LOOK[art.branch === 'b' ? 'b' : 'a'].aura), Math.max(2, Math.round(2.5 * k)), .42 + pulse];
  else if (n >= 7) oo.aura = [n >= 10 ? [240, 244, 255] : MAT[edgeGlow(art.aspect)].pal[3], Math.max(1, Math.round((n >= 9 ? 3 : 2) * k)), .3 + (n - 7) * .05 + pulse];
  else if (art.stage === 'kindled') oo.aura = [MAT.ember.pal[2], Math.max(1, Math.round(1.5 * k)), .3 + pulse];
  if (!o.reduced && L.tier >= 2) { const cyc = (t % 4.2) / 1.3; if (cyc < 1) oo.shine = [Math.round((-20 + cyc * 150) * k), Math.max(2, Math.round(3 * k))]; }
  if (!o.reduced && L.tier >= 3) oo.flicker = Math.floor(t * 8);
  const g = glintPoint(art, size), gp = (t % 3.2) / 3.2;
  if (g && (o.reduced || gp < .16 || L.tier >= 5)) oo.glints = [[g[0], g[1], o.reduced ? 1 : gp < .05 || gp > .11 ? 1 : 2]];
  if (art.temper) { const g2 = temperGlint(art, size), gq = ((t + 1.1) % 2.3) / 2.3; if (g2) (oo.glints || (oo.glints = [])).push([g2[0], g2[1], o.reduced ? 1 : gq < .1 ? 2 : 1]); }
  const asp = art.aspect || item.aspect, fx = art.fx || (asp && ASPECT_LOOK[asp] ? ASPECT_LOOK[asp].mote : null);
  if (!o.reduced && fx && (L.tier >= 3 || art.relic)) { const glowMat = asp ? ASPECT_LOOK[asp].glow : 'ember'; oo.particles = motes(fx, t, size, size, Math.round((6 + L.tier) * k), MAT[glowMat].pal); }
  // Awakened: ember motes rise off it (its own aspect motes give way); +10: a white flame licks up from it
  if (!o.reduced && art.stage === 'awakened') oo.particles = motes('rise', t, size, size, Math.round(16 * k), MAT.ember.pal);
  if (n >= 10) oo.particles = (oo.particles || []).concat(whiteFlame(R, t, !!o.reduced));
  // develop 0 is a pure silhouette (the Codex's unsighted relics, unidentified cards): no coloured halos round it
  if (o.develop !== undefined) { oo.develop = o.develop; oo.silhouette = hx(o.silhouette || '#0b0910'); if (o.develop <= 0) oo.glow = false; }
  if (!(art.temper >= 3) || (o.develop !== undefined && o.develop < 1)) return compose(R, oo);
  const img = compose(R, oo); temperEdge(img, R, art, true); return img;
}
// itemIcon(itemOrArt, { size=16 }) -> ImageData (bag icon; no halos). Tempered items keep a glint and their edge.
export function itemIcon(item, o = {}) {
  const art = itemArt(item); if (!art) return null;
  const size = o.size || 16;
  if (!art.temper && !art.stage) return iconCache.get(objId(art) + '@' + size, () => compose(itemRaster(art, size), { glow: false, hue: 170 }));
  return iconCache.get(objId(art) + '@' + size, () => {
    const R = temperedRaster(art, size), g = art.temper ? glintPoint(art, size) : null, img = compose(R, { glow: false, hue: 170, glints: g ? [[g[0], g[1], 1]] : null });
    if (art.temper >= 3) temperEdge(img, R, art, false);
    return img;
  });
}
// cardCorner(rarity) -> 16x16 ImageData corner ornament for the rarity frame (top-left; mirror for others)
const cornerCache = lru(16);
export function cardCorner(rar) {
  return cornerCache.get(rar, () => {
    const L = RARITY_LOOK[rar] || RARITY_LOOK.worn, F = new Forge(16, 16), X = Xf(0, 0, 1, 0, 1), m = L.frame, gem = L.gem;
    F.add({ X, mat: m, prof: 'round', bw: 1.2, grp: 'a', shapes: [X.poly([[1.5, 1.5], [15.5, 1.5], [15.5, 4.2], [4.2, 4.2], [4.2, 15.5], [1.5, 15.5]])] });
    F.add({ X, mat: m, prof: 'round', bw: 1, grp: 'b', shapes: [X.cap(6.8, 6.8, 11.5, 6.8, .95), X.cap(6.8, 6.8, 6.8, 11.5, .95)] });
    F.add({ X, mat: gem || 'iron', prof: 'round', bw: 2, grp: 'g', noShadow: true, shapes: [X.circ(4, 4, gem ? 3.3 : 2.6)] });
    return compose(F.raster(), { glow: false, hue: 170 });
  });
}

/* ==== item art -> hero sprite layer looks ==== */
export const SLOTS = ['weapon', 'offhand', 'head', 'body', 'hands', 'feet', 'amulet', 'ring'];
const glowOf = p => p && (p.fuller || p.runes || p.edge || p.vein || p.tally || p.glow || (p.heat ? 'ember' : null) || null);
// A tempered item's look draws through its tempered materials (+2, +3) and carries temper: n. A tempered weapon
// also sets relic, which makes the battle sprite glint it (+1). glint marks what a small sprite should give a
// 1-px glint: relics, heirloom-and-up items and anything tempered. At +3, edge is the CSS colour of the
// aspect-coloured edge, for rigs that draw their own outline.
export function lookFor(slot, art) {
  const L = lookOf(slot, art);
  if (!L) return L;
  if (art.relic || rarityTier(art.rarity) >= 5 || art.temper) L.glint = true;
  if (art.temper) {
    L.temper = art.temper; if (slot === 'weapon') L.relic = true;
    if (art.temper >= 3) L.edge = '#' + MAT[art.temper >= 10 ? 'primal' : edgeGlow(art.aspect)].pal[3].map(v => v.toString(16).padStart(2, '0')).join('');
    if (art.temper >= 7) L.glow7 = true;
  }
  // M4: a worn piece shows its first set gem where its own gem would sit (a weapon sets them in its recipe);
  // stage and branch ride along for rigs that draw more (walkers: an Awakened relic's ember motes)
  if (art.gems && slot !== 'weapon') { const g = art.gems.find(Boolean); if (g && 'gem' in L) L.gem = g; }
  if (art.gems) L.gems = art.gems.slice();
  if (art.stage) { L.stage = art.stage; if (art.branch) L.branch = art.branch; }
  return L;
}
// awakenMotes(t, box, { branch, n }) -> [{ x, y, c, a }]: ember motes rising round an Awakened relic's bearer, for a
// UI that draws them over a sprite (box = { x, y, w, h } in canvas px); none under reduced motion (pass t = 0)
export function awakenMotes(t, box, { branch = 'a', n = 8 } = {}) {
  const pal = MAT.ember.pal, out = [];
  for (let k = 0; k < n; k++) {
    const ph = (t * (.25 + hash(k, 2, 57) * .2) + hash(k, 3, 57)) % 1;
    out.push({ x: box.x + hash(k, 1, 57) * box.w + Math.sin(t * 2 + k) * 1.5, y: box.y + box.h - ph * box.h * 1.1, c: k % 3 === 2 && branch === 'b' ? [220, 232, 255] : pal[3 + (k % 3 === 0 ? 1 : 0)], a: Math.min(1, (1 - ph) * 2) * .85 });
  }
  return out;
}
function lookOf(slot, art) {
  if (!art || !art.p) return null;
  const { r, p } = art, id = objId(art);
  switch (slot) {
    case 'weapon': { const R = RECIPE[r] || RECIPE.sword; return { id, r, p, k: art.k || (R.hold && R.hold.k) || .36, axis: art.axis || (R.hold && R.hold.axis), cls: R.cls || 'blade', glow: glowOf(p), relic: !!art.relic, aspect: art.aspect || null }; }
    case 'offhand':
      if (r === 'shield') return { id, look: p.shape === 'heater' || p.shape === 'tower' ? p.shape : (p.r || 26) >= 25 ? 'round' : 'buckler', face: p.face, rim: p.rim, boss: p.boss, gem: p.gem, paint: p.paint, paint2: p.paint2 };
      return { id, look: p.style === 'orb' ? 'orb' : p.style === 'tome' ? 'tome' : p.style === 'rings' ? 'rings' : 'sigil', metal: p.metal, gem: p.gem, glow: p.glow || p.runes, cover: p.cover };
    case 'head': {
      const look = r === 'crown' ? 'crown' : p.look || (r === 'helm' ? 'helm' : r);
      return { id, look, mat: p.mat, trim: p.trim, gem: p.gem, runes: p.runes, crest: p.crestMat || (p.crest && p.crest !== true ? p.crest : p.crest ? p.mat || 'steel' : null), plume: p.plume, style: p.style, clasp: p.clasp, metal: p.metal, buds: p.buds, eyes: p.eyes, tip: p.tip, vine: p.vine, flaps: p.flaps, relic: !!art.relic };
    }
    case 'body': {
      const kind = r === 'robe' || r === 'leather' || r === 'plate' ? r : 'mail';
      return { id, kind, mat: p.mat, trim: p.trim, pauldrons: p.pauldrons, shirt: p.shirt, sash: p.sash, studs: p.studs, glyph: p.glyph, gem: p.gem, runes: p.runes, vine: p.vine, sleeve: p.sleeve, belt: p.belt, scale: p.tex && p.tex !== mailTex };
    }
    case 'hands': return { id, mat: p.mat, plate: !!p.plate || r === 'gauntlets', trim: p.trim, gem: p.gem };
    case 'feet': return { id, mat: p.mat, trim: p.trim, greave: p.greave, fold: p.fold, gem: art.relic ? p.gem : null };
    case 'amulet': return { id, metal: p.metal || p.mat || 'gold', gem: p.gem, chain: p.chain || (r === 'beads' ? p.mat : 'gold'), style: p.style, relic: !!art.relic };
    case 'ring': return { id, metal: p.metal, gem: p.gem };
  }
  return null;
}
// gearLooks({ weapon, offhand, ... }) -> layer looks; each value may be an ItemInstance, a relic id, an art {r,p}, or null
export function gearLooks(gear) {
  const L = {};
  if (!gear) return L;
  for (const s of SLOTS) { const a = itemArt(gear[s]); const l = lookFor(s, a); if (l) L[s] = l; }
  return L;
}
