// Item looks for the battle layer.
//  - RARITY_LOOK / ASPECT_LOOK: shared styling tables (colours, frame materials, glow materials).
//  - RELIC_ART: hand-made recipe params for the 12 named relics.
//  - itemArt(item): deterministic recipe params for ANY rolled item from { kind, rarity, aspect, seed }.
//  - itemPortrait / itemIcon / cardCorner: the card portrait (prototype treatment) and bag icon.
//  - lookFor / gearLooks: turn item art into the layer "looks" the hero sprite draws, so the
//    sword on the card is visibly the sword in the hero's hand.
import { MAT, hx, hsl, bayer, hash, vnoise, compose, Forge, Xf } from './forge.js';
import { RECIPE, renderItem, TX, TX2, mailTex, scaleTex } from './recipes.js';
import { rimeTex } from './item-art.js';
import { createRng } from '../core/rng.js';
import { lru, objId } from './cache.js';

/* ==== rarity ==== */
const R5 = s => s.split(' ');
export const RARITY_ORDER = ['worn', 'wrought', 'tempered', 'runed', 'storied', 'heirloom', 'regalia', 'primal'];
// color: css text colour · ramp: 5 steps dark->light (beams, sparks, card glow) · bg: 4 portrait bg steps
// rim: rim-light colour on the portrait · aura: silhouette aura colour (tier >= 3) · frame: MAT for card
// corners · gem: MAT for the corner gem · beam: reveal beam width (px) · rays: rotating rays behind portrait
export const RARITY_LOOK = Object.freeze({
  worn: { tier: 0, name: 'Worn', color: '#aca699', ramp: R5('#2e2c28 #5e5a52 #aca699 #dcd6ca #ffffff'), bg: R5('#16151a #1f1d24 #2a2830 #36343c'), rim: '#9a968c', aura: null, frame: 'iron', gem: null, beam: 3, rays: false },
  wrought: { tier: 1, name: 'Wrought', color: '#f2eee4', ramp: R5('#3a3834 #7c776c #d8d2c4 #f4f0e6 #ffffff'), bg: R5('#17171b #212026 #2d2c33 #3b3a42'), rim: '#e6e0d2', aura: null, frame: 'steel', gem: 'pearl', beam: 4, rays: false },
  tempered: { tier: 2, name: 'Tempered', color: '#64c85c', ramp: R5('#10331a #2a7a30 #64c85c #b4f0a4 #f2fff0'), bg: R5('#0d1810 #13241a #1b3424 #25482f'), rim: '#5ec85a', aura: null, frame: 'bronze', gem: 'emerald', beam: 5, rays: false },
  runed: { tier: 3, name: 'Runed', color: '#5299f0', ramp: R5('#0e2a5a #1e5ab0 #5299f0 #a8d4ff #f2f8ff'), bg: R5('#0b1224 #111c38 #182a52 #22396c'), rim: '#4a92ea', aura: '#4a92ea', frame: 'steel', gem: 'sapphire', beam: 6, rays: false },
  storied: { tier: 4, name: 'Storied', color: '#b774f4', ramp: R5('#2a0e4a #5e2a9a #b774f4 #e2baff #fcf2ff'), bg: R5('#150c22 #1f1234 #2c1a4a #3c2462'), rim: '#b36cf0', aura: '#b36cf0', frame: 'silver', gem: 'amethyst', beam: 8, rays: false },
  heirloom: { tier: 5, name: 'Heirloom', color: '#f4ad3f', ramp: R5('#4a2008 #a85a14 #f4ad3f #ffe08a #fffbe8'), bg: R5('#1c1008 #2c180a #42240e #5a3212'), rim: '#f2a93b', aura: '#f2a93b', frame: 'gold', gem: 'ruby', beam: 10, rays: true },
  regalia: { tier: 6, name: 'Regalia', color: '#64e5d3', ramp: R5('#073a34 #137a6c #3cc8b4 #9af0e2 #f0fffb'), bg: R5('#07181a #0c2628 #123a3a #1a5250'), rim: '#5fe3d0', aura: '#5fe3d0', frame: 'bronze', gem: 'seaglass', beam: 11, rays: true },
  primal: { tier: 7, name: 'Primal', color: '#f4f8ff', ramp: R5('#28304a #6a7eb0 #c4d6f4 #eef4ff #ffffff'), bg: R5('#0b0d15 #131826 #1d2438 #293350'), rim: '#e8f0ff', aura: '#dce8ff', frame: 'silver', gem: 'prism', beam: 12, rays: true, flame: true },
});
export const rarityTier = r => (RARITY_LOOK[r] ? RARITY_LOOK[r].tier : 0);

/* ==== aspects ==== */
export const ASPECTS = ['ember', 'frost', 'storm', 'stone', 'verdant', 'tide', 'radiant', 'blight'];
// glow: emissive MAT for runes/fullers/orbs · gem: MAT for set stones · cloth: MAT for robes/ribbons
// color: css colour for UI accents · mote: particle behaviour on portraits and casts
export const ASPECT_LOOK = Object.freeze({
  ember: { glow: 'ember', gem: 'ruby', cloth: 'cloakRed', color: '#ee7a1c', light: '#ffbe48', mote: 'rise' },
  frost: { glow: 'frost', gem: 'sapphire', cloth: 'clothBlue', color: '#5cb0e4', light: '#a8e0f8', mote: 'fall' },
  storm: { glow: 'storm', gem: 'stormglass', cloth: 'clothBlue', color: '#7ab8ff', light: '#fffce0', mote: 'spark' },
  stone: { glow: 'amber', gem: 'topaz', cloth: 'gambeson', color: '#da9426', light: '#f8c85a', mote: 'dust' },
  verdant: { glow: 'verdant', gem: 'emerald', cloth: 'hoodGreen', color: '#4ec436', light: '#a6f066', mote: 'spore' },
  tide: { glow: 'water', gem: 'seaglass', cloth: 'clothTeal', color: '#48a4c6', light: '#94daf0', mote: 'bubble' },
  radiant: { glow: 'radiant', gem: 'pearl', cloth: 'clothWhite', color: '#f8e27e', light: '#fff8d4', mote: 'sparkle' },
  blight: { glow: 'blight', gem: 'amethyst', cloth: 'clothGrey', color: '#a8c05a', light: '#eeffa8', mote: 'rise' },
});
// rune glow when an item has no aspect, by rarity tier
const TIER_GLOW = [null, null, null, 'frost', 'arcane', 'radiant', 'water', 'primal'];

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

/* ==== the 12 named relics ==== */
const emberVeins = TX2.cracks(31, 'ember', .036);
const stoneHead = ({ x, y }) => { const n = vnoise(x * .3, y * .3, 12); const c = Math.abs(vnoise(x * .2, y * .2, 5) - .5); if (c < .035) return { m: 'amber', dd: 0 }; return n > .7 ? -1 : n < .2 ? 1 : (hash(x, y, 3) < .1 ? -1 : 0); };
const rotSpots = ({ x, y }) => { const n = vnoise(x * .38, y * .38, 17); return n > .74 ? { m: 'rot', dd: 1 } : 0; };
const mossBlade = ({ x, y, nx, ny }) => (vnoise(x * .5, y * .5, 23) > .74 && (nx + ny) < .1 ? { m: 'moss', dd: 1 } : 0);
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

const artCache = lru(4000);
// itemArt(item) -> { r, p, ... } recipe params. Accepts an ItemInstance ({ base, kind, rarity, aspect, seed }),
// a relic id string, or an art object (returned as-is). Deterministic: same inputs, same look.
export function itemArt(item) {
  if (!item) return null;
  if (typeof item === 'string') return RELIC_ART[item] || null;
  if (item.r && item.p) return item;
  for (const k of [item.base, item.relic, item.id]) if (k && RELIC_ART[k]) return RELIC_ART[k];
  const gen = GEN[item.kind];
  if (!gen) return null;
  const key = `${item.kind}|${item.rarity}|${item.aspect || '-'}|${item.seed ?? 0}`;
  return artCache.get(key, () => { const a = gen(ctxFor(item)); a.kind = item.kind; a.rarity = item.rarity; a.aspect = item.aspect || null; return a; });
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
// itemPortrait(itemOrArt, { size=64, t=0, rarity, reduced, hue, develop, silhouette }) -> ImageData (card portrait,
// prototype treatment). develop 0..1 paints only that fraction of the item's pixels (the Storied identify ritual).
export function itemPortrait(item, o = {}) {
  const art = itemArt(item); if (!art) return null;
  const size = o.size || 64, t = o.reduced ? 0 : (o.t || 0), rar = o.rarity || item.rarity || art.rarity || (art.relic ? 'heirloom' : 'worn');
  const L = RARITY_LOOK[rar] || RARITY_LOOK.worn, R = itemRaster(art, size), k = size / 64;
  const hue = o.hue ?? (170 + t * 30) % 360;
  const oo = { bg: portraitBg(rar, t, size), shadow: [Math.max(1, Math.round(2 * k)), Math.max(1, Math.round(2 * k)), [0, 0, 0], .35], rim: hx(L.rim), hue };
  if (L.tier >= 3) oo.aura = [L.gem === 'prism' ? hsl(hue, .8, .62) : hx(L.aura), Math.max(1, Math.round(2 * k)), .32 + (o.reduced ? 0 : Math.sin(t * 2.2) * .06)];
  if (!o.reduced && L.tier >= 2) { const cyc = (t % 4.2) / 1.3; if (cyc < 1) oo.shine = [Math.round((-20 + cyc * 150) * k), Math.max(2, Math.round(3 * k))]; }
  if (!o.reduced && L.tier >= 3) oo.flicker = Math.floor(t * 8);
  const g = glintPoint(art, size), gp = (t % 3.2) / 3.2;
  if (g && (o.reduced || gp < .16 || L.tier >= 5)) oo.glints = [[g[0], g[1], o.reduced ? 1 : gp < .05 || gp > .11 ? 1 : 2]];
  const asp = art.aspect || item.aspect, fx = art.fx || (asp && ASPECT_LOOK[asp] ? ASPECT_LOOK[asp].mote : null);
  if (!o.reduced && fx && (L.tier >= 3 || art.relic)) { const glowMat = asp ? ASPECT_LOOK[asp].glow : 'ember'; oo.particles = motes(fx, t, size, size, Math.round((6 + L.tier) * k), MAT[glowMat].pal); }
  if (o.develop !== undefined) { oo.develop = o.develop; oo.silhouette = hx(o.silhouette || '#0b0910'); }
  return compose(R, oo);
}
// itemIcon(itemOrArt, { size=16 }) -> ImageData (bag icon; no halos)
export function itemIcon(item, o = {}) {
  const art = itemArt(item); if (!art) return null;
  const size = o.size || 16;
  return iconCache.get(objId(art) + '@' + size, () => compose(itemRaster(art, size), { glow: false, hue: 170 }));
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
export function lookFor(slot, art) {
  if (!art || !art.p) return null;
  const { r, p } = art, id = objId(art);
  switch (slot) {
    case 'weapon': { const R = RECIPE[r] || RECIPE.sword; return { id, r, p, k: art.k || (R.hold && R.hold.k) || .36, axis: art.axis || (R.hold && R.hold.axis), cls: R.cls || 'blade', glow: glowOf(p), relic: !!art.relic, aspect: art.aspect || null }; }
    case 'offhand':
      if (r === 'shield') return { id, look: (p.r || 26) >= 25 ? 'round' : 'buckler', face: p.face, rim: p.rim, boss: p.boss, gem: p.gem, paint: p.paint, paint2: p.paint2 };
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
