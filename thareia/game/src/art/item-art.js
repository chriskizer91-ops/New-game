// Ported from prototypes/item-card.html (the approved Loot Forge art pipeline).
// Art parameter sets for the prototype's hand-made items and starter gear.
import { vnoise } from './forge.js';
import { TX, scaleTex, mailTex } from './recipes.js';

const rimeTex = ({ x, y, nx, ny, d }) => { const n = vnoise(x * .4, y * .4, 5); const up = -(nx + ny); if (n * .7 + up * .7 + (d < 1.3 ? .12 : 0) > .72) return { m: 'rime', dd: n > .75 ? 1 : 0 }; return 0; };
const mossTex = ({ x, y, nx, ny }) => (vnoise(x * .5, y * .5, 9) > .74 && (nx + ny) < -.1 ? { m: 'seaweed', dd: 1 } : ((x + y) % 5 === 0 ? -1 : 0));
const studTex = ({ x, y }) => ((x % 3 === 1 && y % 3 === 1) ? { m: 'bronze', dd: 1 } : 0);
const ART = {
  rusted: { r: 'sword', p: { gripEnd: 13.5, guardT: 3.4, bladeW: 3.4, bladeL: 50, tipL: 8, taper: .88, blade: 'steel', bladeTex: TX.rust(11), notches: [[46, -3.7, 1.5], [55, 3.3, 1.1]], guard: 'bar', guardMat: 'iron', guardW: 8.5, guardR: 1.8, guardTex: TX.rust(5), grip: 'leather', gripR: 2, pommel: 'iron', pommelR: 3, pommelTex: TX.rust(8) } },
  shortsword: { r: 'sword', p: { gripEnd: 12, guardT: 3, bladeW: 3.2, bladeL: 38, tipL: 7, taper: .9, blade: 'steel', guard: 'bar', guardMat: 'iron', guardW: 7, guardR: 1.6, grip: 'leather', gripR: 2, pommel: 'iron', pommelR: 2.8 } },
  emberheart: { r: 'sword', p: { heat: 1, gripEnd: 16.5, guardT: 4.2, bladeW: 3.9, bladeL: 52, tipL: 9, taper: .86, blade: 'steel', fuller: 'ember', fullerR: 1, guard: 'flame', guardMat: 'gold', gem: 'ember', grip: 'leatherRed', gripR: 2.1, pommel: 'gold', pommelR: 3.5, pommelGem: 'ember' } },
  oath: { r: 'hammer', p: { headT: 55, headH: 15, headW: 15.5, haft: 'wood', haftR: 2.3, wrap: 'leather', wrapEnd: 18, bands: [24, 33], bandMat: 'gold', headMat: 'iron', pommelMat: 'gold', pommelR: 3.1, spike: 11, trim: 'gold', faces: 1, langets: 1, runes: 'frost', headTex: rimeTex } },
  smith: { r: 'hammer', p: { headT: 50, headH: 11, headW: 11, faces: 1, haft: 'wood', haftR: 2.2, wrap: 'leather', wrapEnd: 16, bands: [], headMat: 'iron', pommelR: 2.8 } },
  mace: { r: 'hammer', p: { style: 'mace', headT: 52, headW: 7.5, haft: 'wood', haftR: 2.1, wrap: 'leatherRed', wrapEnd: 16, bands: [40], bandMat: 'gold', headMat: 'bronze', pommelR: 2.8, gem: 'ember', trim: 'gold', spike: 4 } },
  bogbow: { r: 'bow', p: { len: 64, bulge: 10, limbR: 3.2, tipR: 1.5, tassel: 'seaweed', limb: 'bogwood', nock: 'bone', grip: 'clothTeal', bindings: [.27, .73], bindMat: 'bone', gem: 'sapphire', gemMat: 'bronze', limbTex: mossTex } },
  yew: { r: 'bow', p: { len: 58, bulge: 9, limbR: 3, tipR: 1.4, limb: 'wood', nock: 'bone', grip: 'leather', bindings: [] } },
  crown: { r: 'crown', p: { gem: 'prism', gem2: 'seaglass', drips: true } },
  hauberk: { r: 'mail', p: { mat: 'drake', tex: scaleTex(4, 3), trim: 'bronze', belt: 'leather', pauldrons: 'drake', pdTex: scaleTex(3, 5) } },
  chainshirt: { r: 'mail', p: { mat: 'steel', tex: mailTex, trim: 'iron', belt: 'leather' } },
  studded: { r: 'mail', p: { mat: 'leather', tex: studTex, belt: 'leather' } },
  robes: { r: 'mail', p: { mat: 'robe', trim: 'gold', belt: 'leatherRed' } },
  apron: { r: 'mail', p: { mat: 'iron', tex: scaleTex(4, 7), belt: 'leather', trim: 'leather' } },
  buckler: { r: 'shield', p: { r: 22, face: 'wood', planks: true, rim: 'iron', bossR: 7 } },
  roundshield: { r: 'shield', p: { r: 28, face: 'wood', planks: true, rim: 'iron', bossR: 8 } },
  sigil: { r: 'amulet', p: { chain: 'gold', metal: 'gold', gem: 'ember' } },
  kettle: { r: 'helm', p: { look: 'kettle' } },
  hood: { r: 'helm', p: { look: 'hood', mat: 'cloakGreen' } },
  circlet: { r: 'helm', p: { look: 'circlet', gem: 'ember' } },
  coif: { r: 'helm', p: { look: 'coif', mat: 'wool' } },
  hidegloves: { r: 'gloves', p: { mat: 'leather' } },
  bracers: { r: 'gloves', p: { mat: 'leatherRed' } },
  wraps: { r: 'gloves', p: { mat: 'robe' } },
  gauntlets: { r: 'gloves', p: { mat: 'iron' } },
  marshboots: { r: 'boots', p: { mat: 'leather' } },
  softboots: { r: 'boots', p: { mat: 'cloakGreen', trim: 'leather' } },
  sandals: { r: 'boots', p: { mat: 'robe', trim: 'leatherRed' } },
  ironboots: { r: 'boots', p: { mat: 'iron', trim: 'leather' } },
  locket: { r: 'amulet', p: { chain: 'gold', metal: 'bronze', gem: 'ember' } },
  reedcharm: { r: 'beads', p: { mat: 'wood', gem: 'emerald' } },
  prayerbeads: { r: 'beads', p: { mat: 'bone', gem: 'ruby' } },
  copperband: { r: 'ring', p: { metal: 'bronze' } },
  ashring: { r: 'ring', p: { metal: 'iron', gem: 'ember' } },
  signet: { r: 'ring', p: { metal: 'gold', gem: 'ruby' } },
};

export { rimeTex, mossTex, studTex, ART };
