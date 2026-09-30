// The four heroes: identity layers, starter gear, and the battle renderer.
//
// renderHero(heroKey, gear, { pose, t, flip, aspect, custom, reduced }) -> ImageData 64x64
//   gear: { weapon, offhand, head, body, hands, feet, amulet, ring } where each value is an
//         ItemInstance, a relic id, an art { r, p }, or null. Pass undefined for the starter kit.
//   pose: 'idle' | 'attack' | 'cast' | 'hurt' | 'ko' | 'guard'
//   t:    seconds. idle uses t for the 2-frame breath and blinks; attack uses t in [0,1)
//         (wind-up before .4, strike after); flicker/glints use t everywhere.
//   The returned ImageData carries .anchors (canvas px): foot, head, handL, handR, weaponTip,
//   weaponMid, weaponGrip, orb, amulet.
// heroBust(heroKey, gear, { size=24, custom }) -> ImageData (head and shoulders, transparent bg)
import { compose } from './forge.js';
import { ART } from './item-art.js';
import { mailTex } from './recipes.js';
import { heroForge, posePreset, paintFace, BUILD, FRAME_BATTLE } from './heroes.js';
import { gearLooks, ASPECT_LOOK, SLOTS } from './item-looks.js';
import { lru, objId } from './cache.js';

export const HERO_SIZE = { w: FRAME_BATTLE.w, h: FRAME_BATTLE.h, foot: [FRAME_BATTLE.ox + 16, FRAME_BATTLE.oy + 46.6 | 0] };

// customisation presets for the player's Hearthwarden (UI shows these as choices)
export const WARDEN_PRESETS = Object.freeze({
  skin: ['skin', 'skinPale', 'skinTan', 'skinDeep'],
  hairMat: ['hairAuburn', 'hairBrown', 'hairBlack', 'hairCopper', 'hairBlond', 'hairSilver'],
  hair: ['short', 'crop', 'long', 'pony', 'braid', 'none'],
  beard: [false, true],
  eye: ['#1c2a48', '#24381c', '#3a1a10', '#2a2030'],
});

const S = {
  shortsword: ART.shortsword, buckler: ART.buckler, kettle: ART.kettle, hidegloves: ART.hidegloves, marshboots: ART.marshboots, locket: ART.locket, copperband: ART.copperband, yew: ART.yew, reedcharm: ART.reedcharm, prayerbeads: ART.prayerbeads,
  chainshirt: { r: 'mail', p: { mat: 'steel', tex: mailTex, trim: 'iron', belt: 'leather' } },
  pipHood: { r: 'hood', p: { look: 'hood', mat: 'hoodGreen', tip: 1, trim: 'leather' } },
  pipJerkin: { r: 'leather', p: { mat: 'leather', shirt: 'gambeson', belt: 'leatherDark', buckle: 'bronze', pouch: 'leatherDark' } },
  pipBoots: { r: 'boots', p: { mat: 'leather', trim: 'leatherDark', fold: true } },
  pipGloves: { r: 'gloves', p: { mat: 'leatherDark' } },
  brynStaff: { r: 'staff', p: { style: 'rings', headT: 62, haft: 'bogwood', haftR: 2.1, wobble: .5, wrap: 'hoodGreen', bands: [], metal: 'bark', foot: 'bronze', leaves: 'moss', glow: 'verdant', ringR: 9.5 } },
  brynRobe: { r: 'robe', p: { mat: 'robeBark', trim: 'moss', sash: 'hoodGreen', cowl: 'moss', tex: null } },
  brynBoots: { r: 'boots', p: { mat: 'leather', trim: 'moss' } },
  alondraStaff: { r: 'staff', p: { style: 'crook', headT: 63, haft: 'wood', haftR: 1.9, wrap: 'clothWhite', bands: [48], bandMat: 'silver', foot: 'silver', gem: 'pearl', chainMat: 'silver' } },
  alondraRobe: { r: 'robe', p: { mat: 'clothWhite', trim: 'silver', sash: 'clothBlue', cowl: 'clothWhite' } },
  sandals: { r: 'boots', p: { mat: 'robe', trim: 'leather' } },
};
// identity layers (H) and the starter kit for each hero (art params; the rules own the real items)
export const HERO_ART = Object.freeze({
  warden: {
    name: 'Hearthwarden', aspect: 'ember', presets: WARDEN_PRESETS,
    H: { build: 'human', skin: 'skin', hairMat: 'hairAuburn', hair: 'short', cloak: 'cloakRed', mantle: 'cloakRed', tabard: 'cloakRed', eye: '#1c2a48', gloves: 'leather' },
    starter: { weapon: S.shortsword, offhand: S.buckler, head: S.kettle, body: S.chainshirt, hands: S.hidegloves, feet: S.marshboots, amulet: S.locket, ring: S.copperband },
  },
  pip: {
    name: 'Pip', aspect: 'verdant',
    H: { build: 'youth', skin: 'skinPale', hairMat: 'hairCopper', hair: 'short', freckles: true, cloak: 'hoodGreen', quiver: 'leather', fletch: 'clothWhite', eye: '#24381c', tunic: 'gambeson', gloves: 'leather' },
    starter: { weapon: S.yew, head: S.pipHood, body: S.pipJerkin, hands: S.pipGloves, feet: S.pipBoots, amulet: S.reedcharm },
  },
  bryn: {
    name: 'Bryn the Bark-Reader', aspect: 'verdant',
    H: { build: 'human', skin: 'skinTan', hairMat: 'hairMoss', hair: 'long', ears: 'long', marks: 'bark', mantle: 'moss', eye: '#5a3a10', gloves: 'skinTan', tunic: 'robeBark' },
    starter: { weapon: S.brynStaff, body: S.brynRobe, feet: S.brynBoots },
  },
  alondra: {
    name: 'Sister Alondra', aspect: 'radiant',
    H: { build: 'human', skin: 'skinDeep', hairMat: 'hairBlack', hair: 'long', blindfold: 'clothWhite', mantle: 'clothWhite', gloves: 'skinDeep', tunic: 'clothWhite' },
    starter: { weapon: S.alondraStaff, body: S.alondraRobe, feet: S.sandals, amulet: S.prayerbeads },
  },
});
export const HERO_KEYS = Object.keys(HERO_ART);

function identity(key, custom) {
  const A = HERO_ART[key] || HERO_ART.warden;
  if (!custom) return A.H;
  const H = Object.assign({}, A.H);
  for (const k of ['skin', 'hairMat', 'hair', 'beard', 'eye']) if (custom[k] !== undefined) H[k] = custom[k];
  if (custom.skin && !A.H.gloves.startsWith('leather')) H.gloves = custom.skin;
  return H;
}
const idSig = H => ['skin', 'hairMat', 'hair', 'beard', 'eye'].map(k => H[k]).join(',');
const looksSig = L => SLOTS.map(s => (L[s] ? L[s].id : '-')).join('|');

const rasterCache = lru(160), looksCache = lru(120);
function looksOf(key, gear) {
  const g = gear === undefined ? HERO_ART[key].starter : gear;
  if (!g) return {};
  return looksCache.get(key + ':' + SLOTS.map(s => { const v = g[s]; return !v ? '-' : typeof v === 'string' ? v : v.r ? objId(v) : `${v.base || ''}/${v.kind}/${v.rarity}/${v.aspect}/${v.seed}`; }).join('|'), () => gearLooks(g));
}
// frame key: which poses share a raster (face and flicker are applied after the raster)
function frameOf(pose, t) {
  if (pose === 'attack') return t < .4 ? 'w' : 's';
  if (pose === 'idle' || !pose) return 'i' + (Math.floor(t * 1.6) % 2);
  return pose;
}
function build(key, gear, o) {
  const H = identity(key, o.custom), L = looksOf(key, gear), pose = o.pose || 'idle', t = o.t || 0;
  const cls = L.weapon ? L.weapon.cls : null, b = BUILD[H.build] || BUILD.human;
  const P = posePreset(pose, t, cls, b);
  const aspect = o.aspect || (L.weapon && L.weapon.aspect) || HERO_ART[key].aspect;
  const glowMat = (ASPECT_LOOK[aspect] || ASPECT_LOOK.ember).glow;
  const rk = [key, idSig(H), looksSig(L), pose, frameOf(pose, t), glowMat, o.flip ? 'm' : ''].join('|');
  const base = rasterCache.get(rk, () => {
    const r = heroForge(H, { gear: L, pose: P, frame: FRAME_BATTLE, aspectGlow: glowMat });
    const R = r.F.raster({ mirror: !!o.flip });
    const W = FRAME_BATTLE.w, mx = p => (p && o.flip ? [W - p[0], p[1]] : p);
    const anchors = {}; for (const k in r.anchors) anchors[k] = mx(r.anchors[k]);
    const relicParts = new Set(); r.F.parts.forEach((p, i) => { if (p.relic) relicParts.add(i); });
    return { R, anchors, face: r.face, hc: r.j.hc, H, relic: relicParts.size > 0, map: r.map };
  });
  return { base, P, t, H };
}
export function renderHero(key, gear, o = {}) {
  const { base, P, t, H } = build(key, gear, o);
  const oo = { flicker: o.reduced ? 0 : Math.floor(t * 8), hue: (170 + t * 30) % 360 };
  if (base.relic && base.anchors.weaponMid && !o.reduced) { const gp = (t % 2.6) / 2.6; if (gp < .12) oo.glints = [[Math.round(base.anchors.weaponMid[0]), Math.round(base.anchors.weaponMid[1]), gp < .04 || gp > .09 ? 1 : 2]]; }
  if (o.tint) oo.tint = o.tint;
  const img = compose(base.R, oo);
  if (base.face) paintFace(img, H, base.hc, FRAME_BATTLE.ox, FRAME_BATTLE.oy, P.face, !!o.flip, base.map);
  img.anchors = base.anchors;
  return img;
}
export function heroAnchors(key, gear, o = {}) { return build(key, gear, o).base.anchors; }
// small head-and-shoulders portrait for the Initiative Ribbon / party row
export function heroBust(key, gear, o = {}) {
  const size = o.size || 24;
  const img = renderHero(key, gear, { pose: 'idle', t: .2, custom: o.custom });
  const [hx0, hy0] = img.anchors.head, x0 = Math.round(hx0 - size / 2), y0 = Math.round(hy0 - size * .5 + 1);
  const out = new ImageData(size, size), s = img.data, d = out.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const X = x + x0, Y = y + y0; if (X < 0 || Y < 0 || X >= img.width || Y >= img.height) continue;
    const i = (Y * img.width + X) * 4, j = (y * size + x) * 4; d[j] = s[i]; d[j + 1] = s[i + 1]; d[j + 2] = s[i + 2]; d[j + 3] = s[i + 3];
  }
  return out;
}
export const HERO_POSES = ['idle', 'attack', 'cast', 'hurt', 'ko', 'guard'];
// rasterise every pose frame once (call at battle start so the first hit/cast never hitches)
export function prewarmHero(key, gear, o = {}) {
  for (const [pose, t] of [['idle', 0], ['idle', .7], ['attack', .1], ['attack', .6], ['cast', 0], ['hurt', 0], ['ko', 0], ['guard', 0]]) renderHero(key, gear, Object.assign({}, o, { pose, t }));
}
