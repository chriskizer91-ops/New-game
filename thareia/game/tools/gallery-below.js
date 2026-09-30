// Act III's battle and item art review page (M7): the Hearth Below's foes (the thralls and their overseer, the unmade,
// the forge-warden), the Hollow Council in both phases with their gifts held and snapped, the Unsmith in his three
// phases (his pieces snapped, what he took), Tamsin as the guest, the four backdrops, Codex Page V and the Masterpiece,
// the new intent dice and statuses, and an edge report (a render touching a side of its canvas is listed). Written by
// the M7 review; bundled by tools/gallery.mjs into the same page shell as tools/gallery-entry.js:
//
//   node tools/gallery.mjs --entry=tools/gallery-below.js --out=/tmp/aeth-m7-gallery
//
// window.__report holds the count of renders checked, any errors, and the renders touching an edge.
import { renderFoe, FOE_ART } from '../src/art/foes.js';
import { RELIC_ART, itemPortrait, itemIcon } from '../src/art/item-looks.js';
import { renderBackdrop, backdropLayers, BACKDROPS } from '../src/art/scenes.js';
import { renderHero } from '../src/art/hero-looks.js';
import { diceIcon, INTENT_DIE, statusIcon } from '../src/art/icons.js';
import { RELICS } from '../src/data/relics.js';
import { ITEMS } from '../src/data/items.js';
import { MASTERPIECE_BASES } from '../src/data/masterpiece.js';

const app = document.getElementById('app');
const BG = '#1a1612';
function section(id, title, note) {
  const s = document.createElement('section'); s.id = id;
  const h = document.createElement('h2'); h.textContent = title; s.appendChild(h);
  if (note) { const p = document.createElement('p'); p.className = 'note'; p.textContent = note; s.appendChild(p); }
  app.appendChild(s); return s;
}
function row(parent, label) { if (label) { const h = document.createElement('h3'); h.textContent = label; parent.appendChild(h); } const r = document.createElement('div'); r.className = 'row'; parent.appendChild(r); return r; }
function fig(parent, img, scale = 2, cap = '', bg) {
  const f = document.createElement('figure'), c = document.createElement('canvas');
  c.width = img.width; c.height = img.height; c.getContext('2d').putImageData(img, 0, 0);
  c.style.width = img.width * scale + 'px'; c.style.height = img.height * scale + 'px';
  if (bg) c.style.background = bg;
  f.appendChild(c);
  if (cap) { const fc = document.createElement('figcaption'); fc.textContent = cap; f.appendChild(fc); }
  parent.appendChild(f); return c;
}
function stage(parent, list, { scale = 2, h = 110, pad = 6, cap = '' } = {}) {
  const w = list.reduce((a, { img }) => a + img.width + pad, pad), c = document.createElement('canvas');
  c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = '#1d1914'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a241d'; g.fillRect(0, h - 8, w, 8);
  let x = pad;
  for (const { img } of list) {
    const t2 = document.createElement('canvas'); t2.width = img.width; t2.height = img.height; t2.getContext('2d').putImageData(img, 0, 0);
    const foot = img.anchors.foot; g.drawImage(t2, x, h - 9 - foot[1]); x += img.width + pad;
  }
  c.style.width = w * scale + 'px'; c.style.height = h * scale + 'px';
  const f = document.createElement('figure'); f.appendChild(c);
  const fc = document.createElement('figcaption'); fc.style.maxWidth = 'none'; fc.textContent = cap || list.map(l => l.label).join(' · '); f.appendChild(fc);
  parent.appendChild(f); return c;
}

// opaque pixels on each border of an image: a figure that touches the edge is probably cut off there
function edges(img) {
  const { width: w, height: h, data: d } = img, A = 40;
  let L = 0, R = 0, T = 0, B = 0;
  for (let y = 0; y < h; y++) { if (d[(y * w) * 4 + 3] > A) L++; if (d[(y * w + w - 1) * 4 + 3] > A) R++; }
  for (let x = 0; x < w; x++) { if (d[x * 4 + 3] > A) T++; if (d[((h - 1) * w + x) * 4 + 3] > A) B++; }
  return { L, R, T, B };
}
const report = [], errors = [];
// (a foe's render has foot, head and center anchors; a hero's, foot and head: `need` names the ones to ask for)
function check(label, fn, need = ['foot', 'head', 'center']) {
  let img;
  try { img = fn(); } catch (e) { errors.push(`${label}: threw ${e.message}`); return null; }
  if (!img) { errors.push(`${label}: returned nothing`); return null; }
  const e = edges(img);
  const fin = p => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
  if (img.anchors) for (const k of need) if (!fin(img.anchors[k])) errors.push(`${label}: anchor ${k} missing`);
  for (const p of (img.anchors?.relics || []).concat(img.anchors?.relic ? [img.anchors.relic] : [])) if (!fin(p) || p[0] < 0 || p[1] < 0 || p[0] >= img.width || p[1] >= img.height) errors.push(`${label}: a relic glint off the canvas ${JSON.stringify(p)}`);
  report.push({ label, w: img.width, h: img.height, ...e });
  return img;
}

const POSES = [['idle', 0], ['idle', .7], ['attack', .1], ['attack', .6], ['hurt', 0], ['ko', 0]];
const COUNCIL = [['hollow-miravel', 'hollow-wreath'], ['hollow-qasim', 'hollow-chalice'], ['hollow-brundar', 'hollow-gauntlet'], ['hollow-gretch', 'hollow-chain']];
const PIECES = ['unmaking-hammer', 'ironvein-apron', 'worldforge-heart'];
const STOLEN6 = ['deep-pearl', 'corvus-harpoon', 'hexbane-shawl', 'gar-tooth', 'cantors-staff', 'mourning-veil'];

// ---- lineup
{
  const s = section('m7-lineup', 'M7 lineup: every Hearth Below foe, feet on one floor, and Tamsin as the guest', 'renderFoe at t .3; the thralls, the unmade and the warden at gear tier 3; the Council in phase 1; the Unsmith in phases 1-3 (phase 2 with six stolen things); Tamsin at gear tier 5 with the Bargain, flipped as the battle screen draws her.');
  const at = (k, o = {}, label = k) => ({ img: check('lineup ' + label, () => renderFoe(k, { t: .3, ...o })), label });
  stage(row(s, 'road foes (gear tier 3), 2x'), [at('cinder-thrall', { gearTier: 3 }), at('thrall-overseer', { gearTier: 3 }), at('unmade', { gearTier: 3 }), at('forge-warden', { gearTier: 3 })].filter(x => x.img), { h: 96 });
  stage(row(s, 'the Hollow Council, phase 1 and 2, 2x'), COUNCIL.flatMap(([k]) => [at(k, { phase: 1 }, k + ' p1'), at(k, { phase: 2 }, k + ' p2')]).filter(x => x.img), { h: 84 });
  stage(row(s, 'the Unsmith: phases 1-3, with Tamsin (guest, flipped), 2x'), [at('unsmith', { phase: 1 }, 'p1'), at('unsmith', { phase: 2, stolen: STOLEN6 }, 'p2 +6'), at('unsmith', { phase: 3 }, 'p3'), at('tamsin', { gearTier: 5, relic: 'tamsins-bargain', relicHeld: true, flip: true }, 'tamsin guest')].filter(x => x.img), { h: 110 });
}
// ---- every M7 key: poses, tiers, phases, pieces
for (const key of ['cinder-thrall', 'thrall-overseer', 'unmade', 'forge-warden']) {
  const s = section('m7-' + key, `${FOE_ART[key].name} (${FOE_ART[key].w}x${FOE_ART[key].h}): every pose at gear tiers 0 and 3, flipped, tinted`, '3x');
  for (const gT of [0, 3]) { const r = row(s, 'gear tier ' + gT); for (const [pose, t] of POSES) { const im = check(`${key} g${gT} ${pose} ${t}`, () => renderFoe(key, { gearTier: gT, pose, t })); if (im) fig(r, im, 3, `${pose} ${t}`, BG); } }
  const r = row(s, 'flipped, tinted, reduced');
  for (const o of [{ flip: true }, { flip: true, pose: 'attack', t: .6 }, { tint: [255, 255, 255, .8] }, { reduced: true }]) { const im = check(`${key} ${JSON.stringify(o)}`, () => renderFoe(key, { gearTier: 2, t: .3, ...o })); if (im) fig(r, im, 3, JSON.stringify(o), BG); }
}
for (const [key, gift] of COUNCIL) {
  const s = section('m7-' + key, `${FOE_ART[key].name}: phases 1 and 2, the ${gift} held and snapped, every pose`, '3x; then flipped and the snapped gift in phase 2.');
  for (const phase of [1, 2]) for (const broken of [[], [gift]]) {
    const r = row(s, `phase ${phase}${broken.length ? ', gift snapped off' : ''}`);
    for (const [pose, t] of POSES) { const im = check(`${key} p${phase} ${broken.length ? 'snapped' : 'held'} ${pose} ${t}`, () => renderFoe(key, { phase, broken, pose, t })); if (im) fig(r, im, 3, `${pose} ${t}`, BG); }
  }
  const r = row(s, 'flipped, relic:null, relicHeld:false');
  for (const o of [{ flip: true }, { relic: null }, { relicHeld: false }]) { const im = check(`${key} ${JSON.stringify(o)}`, () => renderFoe(key, { t: .3, ...o })); if (im) fig(r, im, 3, JSON.stringify(o), BG); }
}
{
  const s = section('m7-unsmith', 'The Unsmith (96x96): three phases, his pieces snapped, the stolen things (none, 2, 6), every pose', '2x');
  for (const phase of [1, 2, 3]) {
    const r = row(s, `phase ${phase}, every pose`);
    for (const [pose, t] of POSES) { const im = check(`unsmith p${phase} ${pose} ${t}`, () => renderFoe('unsmith', { phase, pose, t, ...(phase === 2 ? { stolen: STOLEN6 } : {}) })); if (im) fig(r, im, 2, `${pose} ${t}`, BG); }
  }
  const r = row(s, 'pieces snapped (phase 3): none, hammer, apron, heart, all');
  for (const broken of [[], [PIECES[0]], [PIECES[1]], [PIECES[2]], PIECES.slice()]) { const im = check(`unsmith p3 broken ${broken.join('+') || '-'}`, () => renderFoe('unsmith', { phase: 3, broken, t: .4 })); if (im) fig(r, im, 2, broken.join('+') || 'whole', BG); }
  const r2 = row(s, 'phase 2: stolen undefined, [], 2 ids, 6 ids; flipped');
  for (const st of [undefined, [], STOLEN6.slice(0, 2), STOLEN6]) { const im = check(`unsmith p2 stolen ${st ? st.length : 'undef'}`, () => renderFoe('unsmith', { phase: 2, t: .4, ...(st ? { stolen: st } : {}) })); if (im) fig(r2, im, 2, st ? `${st.length} stolen` : 'no list', BG); }
  const im = check('unsmith flipped', () => renderFoe('unsmith', { phase: 1, t: .4, flip: true })); if (im) fig(r2, im, 2, 'flipped', BG);
}
{
  const s = section('m7-tamsin', 'Tamsin as the guest (gear tier 5, Tamsin\'s Bargain), flipped, every pose', '3x');
  const r = row(s);
  for (const [pose, t] of POSES) { const im = check(`tamsin guest ${pose} ${t}`, () => renderFoe('tamsin', { gearTier: 5, relic: 'tamsins-bargain', relicHeld: true, flip: true, pose, t })); if (im) fig(r, im, 3, `${pose} ${t}`, BG); }
}
// ---- backdrops
for (const key of ['hollow-hall', 'ash-stair', 'chained-deep', 'worldforge']) {
  const s = section('m7-scene-' + key, `${BACKDROPS[key]?.name || '?'} (${key})`, 'renderBackdrop at 160x96 (3x) at two times, dark, 120x104 (phone), 240x90 (wide), a mock-up with a foe and the party, and the layers.');
  const r = row(s);
  for (const t of [1.3, 4.1]) { const im = check(`${key} t${t}`, () => renderBackdrop(key, { t })); if (im) fig(r, im, 3, 't=' + t); }
  const r2 = row(s);
  for (const [cap, o] of [['dark', { t: 1.3, dark: true }], ['120x104', { w: 120, h: 104, t: .7 }], ['240x90', { w: 240, h: 90, t: .7 }]]) { const im = check(`${key} ${cap}`, () => renderBackdrop(key, o)); if (im) fig(r2, im, 2, cap); }
  const bd = renderBackdrop(key, { t: 1 }), c = document.createElement('canvas'); c.width = 160; c.height = 96; const g = c.getContext('2d'); g.putImageData(bd, 0, 0);
  const put = (img, x, y) => { const t2 = document.createElement('canvas'); t2.width = img.width; t2.height = img.height; t2.getContext('2d').putImageData(img, 0, 0); g.drawImage(t2, Math.round(x), Math.round(y)); };
  const fk = { 'hollow-hall': ['hollow-gretch', {}], 'ash-stair': ['thrall-overseer', { gearTier: 3 }], 'chained-deep': ['unmade', { gearTier: 3 }], worldforge: ['unsmith', { phase: 1 }] }[key];
  const foe = renderFoe(fk[0], { t: .3, ...fk[1] }), fa = foe.anchors.foot; put(foe, (foe.width > 64 ? 46 : 42) - fa[0], 86 - fa[1]);
  ['warden', 'pip', 'bryn', 'alondra'].forEach((k, i) => { const im = renderHero(k, undefined, { pose: 'idle', t: .2 + i }), a = im.anchors.foot; put(im, 106 + (i % 2) * 22 - a[0] + (i >> 1) * 10, 78 + (i >> 1) * 12 - a[1]); });
  const f = document.createElement('figure'); c.style.width = 320 + 'px'; c.style.height = 192 + 'px'; f.appendChild(c); const fc = document.createElement('figcaption'); fc.textContent = 'mock-up'; f.appendChild(fc); r2.appendChild(f);
  const r3 = row(s, 'layers');
  try { for (const L of backdropLayers(key).layers) fig(r3, L.img, 1, L.id + ' x' + L.parallax, '#302830'); } catch (e) { errors.push(`${key} layers: ${e.message}`); }
}
// ---- Page V relics and the Masterpiece
{
  const PAGE_V = Object.values(RELICS).filter(r => r.codex === 0 || r.codex > 66).sort((a, b) => a.codex - b.codex).map(r => r.id);
  const item = (id, o = {}) => Object.assign({ uid: id, base: id, kind: RELICS[id].kind, rarity: RELICS[id].rarity, aspect: RELIC_ART[id]?.aspect || RELICS[id].aspect, seed: 1, temper: 0, gems: [] }, o);
  const s = section('m7-relics', 'Codex Page V: No. 000 and Nos. 67-74', 'Card portrait 64px at 3x, bag icon 16px at 1x and 3x; then 96px, unsighted, the forge\'s looks, and on heroes.');
  const r = row(s);
  for (const id of PAGE_V) {
    if (!RELIC_ART[id]) { errors.push(`${id}: no RELIC_ART`); continue; }
    const im = check(`${id} portrait`, () => itemPortrait(item(id), { t: 1.3 })); if (im) fig(r, im, 3, `${id} · ${RELICS[id].rarity}`);
    const ic = check(`${id} icon`, () => itemIcon(item(id))); if (ic) { fig(r, ic, 1, '', '#211a16'); fig(r, ic, 3, '', '#211a16'); }
  }
  const r2 = row(s, '96px (2x), then unsighted');
  for (const id of PAGE_V) { const im = check(`${id} 96`, () => itemPortrait(item(id), { t: 2.1, size: 96 })); if (im) fig(r2, im, 2, id); }
  const r3 = row(s); for (const id of PAGE_V) { const im = check(`${id} unsighted`, () => itemPortrait(item(id), { develop: 0, reduced: true })); if (im) fig(r3, im, 1.5, id); }
  for (const id of PAGE_V) { const rr = row(s, id + ': the forge'); for (const [cap, o] of [['+4', { temper: 4 }], ['+10', { temper: 10 }], ['gems', { gems: ['bog-amber', 'frost-opal'] }], ['awakened a', { deeds: { x: 1 }, awakened: 'a' }], ['awakened b', { deeds: { x: 1 }, awakened: 'b' }]]) { const im = check(`${id} forge ${cap}`, () => itemPortrait(item(id, o), { t: 1.7 })); if (im) fig(rr, im, 2, cap); } }
  const kits = [['warden', { weapon: 'fenwicks-poker', head: 'hollow-wreath', hands: 'hollow-gauntlet', body: 'ironvein-apron', ring: 'worldforge-heart', amulet: 'hollow-chain' }], ['pip', { weapon: 'tamsins-bargain', offhand: 'hollow-chalice' }], ['bryn', { weapon: 'unmaking-hammer' }], ['alondra', { weapon: 'fenwicks-poker', offhand: 'hollow-chalice', head: 'hollow-wreath' }]];
  for (const [hero, gear] of kits) { const rr = row(s, hero + ': ' + Object.values(gear).join(', ')); for (const [pose, t] of [['idle', 0], ['attack', .1], ['attack', .62], ['cast', .3], ['guard', 0], ['hurt', 0]]) { const im = check(`${hero} ${pose} ${t} page V`, () => renderHero(hero, gear, { pose, t }), ['foot', 'head']); if (im) fig(rr, im, 2, pose, '#1e1812'); } }
  const s2 = section('m7-masterpiece', 'The Masterpiece: a primal weapon of every base Hilda offers', 'itemPortrait({ base, rarity: primal, masterpiece: true }) at 64px (3x) and 16px (3x).');
  const r4 = row(s2);
  for (const base of MASTERPIECE_BASES) { const it = { uid: 'mp-' + base, base, kind: ITEMS[base].kind, slot: 'weapon', rarity: 'primal', aspect: 'ember', seed: 7, temper: 0, gems: [], masterpiece: true, name: 'Test <b>x</b>' }; const im = check(`masterpiece ${base}`, () => itemPortrait(it, { t: 1.1 })); if (im) fig(r4, im, 3, base); const ic = check(`masterpiece ${base} icon`, () => itemIcon(it)); if (ic) fig(r4, ic, 3, '', '#211a16'); }
}
// ---- dice and statuses
{
  const s = section('m7-icons', 'The intent dice by tier (the hollow d20 and the Unsmith\'s pair) and the M7 statuses', 'diceIcon at 20px (4x); statusIcon unmade and hearthlit at 12px (4x).');
  const r = row(s);
  for (const [tier, d] of Object.entries(INTENT_DIE)) { const im = check(`die ${tier}`, () => diceIcon(d.sides, { mat: d.mat, size: 20, value: 17 })); if (im) fig(r, im, 4, tier); }
  const r2 = row(s);
  for (const k of ['unmade', 'hearthlit', 'swallowed', 'exposed']) { const im = check(`status ${k}`, () => statusIcon(k, { size: 12 })); if (im) fig(r2, im, 4, k); }
}
// ---- the report
{
  const s = section('m7-report', 'Edge report', 'Opaque pixels (alpha > 40) on each border of every render. A foe or backdrop that touches a side is listed.');
  const pre = document.createElement('pre');
  const touch = report.filter(x => !/(t[0-9]|dark|120x104|240x90|portrait|96|unsighted|forge|icon|die |status|masterpiece)/.test(x.label.split(' ').slice(-1)[0]) && (x.L || x.R || x.T));
  const lines = [`${report.length} renders checked, ${errors.length} errors`, ...errors.map(e => 'ERROR ' + e), '', 'renders touching the left, right or top edge (L R T B = opaque pixels on each border):',
    ...report.filter(x => x.L + x.R + x.T > 0).map(x => `${x.label.padEnd(58)} ${x.w}x${x.h}  L${x.L} R${x.R} T${x.T} B${x.B}`)];
  pre.textContent = lines.join('\n'); s.appendChild(pre);
  window.__report = { n: report.length, errors, touching: report.filter(x => x.L + x.R + x.T > 0) };
  void touch;
}
window.__done = true;
