// Gallery page for reviewing the art layer (bundled by tools/gallery.mjs). Not part of the game build.
import { renderItem, RECIPE } from '../src/art/recipes.js';
import { compose } from '../src/art/forge.js';
import { renderFoe, FOE_ART } from '../src/art/foes.js';
import { ITEMS } from '../src/data/items.js';
import { diceIcon, DICE, statusIcon, STATUS_KEYS, aspectIcon, gripIcon, digitsImage } from '../src/art/icons.js';
import { renderBackdrop, backdropLayers, BACKDROP_KEYS, BACKDROPS } from '../src/art/scenes.js';
import { renderHero, heroBust, HERO_KEYS, HERO_ART, WARDEN_PRESETS } from '../src/art/hero-looks.js';
import { RELIC_ART, RELIC_IDS, RARITY_ORDER, RARITY_LOOK, ASPECTS, itemArt, itemPortrait, itemIcon, cardCorner, ITEM_KINDS } from '../src/art/item-looks.js';
import { walkerSheet, WALKER_ROWS } from '../src/art/walkers.js';
import { tileAtlas, buildTileAtlas, BIOMES, TILE_PX } from '../src/art/tiles.js';
import { TILE_IDS } from '../src/data/tiles.js';
import { npcSheet, mapFoeSheet, objectSprite, emote, OBJECT_KINDS, OBJECT_STATES, HEARTH_LOOKS, EMOTES, MAP_FOE_SIZE } from '../src/art/map-sprites.js';
import { NPCS } from '../src/data/npcs.js';

const app = document.getElementById('app');
const only = (window.location.hash.match(/only=([^&]+)/) || [])[1];
const want = id => !only || only.split(',').includes(id);
const ZOOM = +((window.location.hash.match(/zoom=([\d.]+)/) || [])[1] || 1);
const T = (window.__timings = {});
const time = (label, f) => { const t0 = performance.now(); const r = f(); T[label] = (T[label] || 0) + performance.now() - t0; return r; };

function section(id, title, note) {
  const s = document.createElement('section'); s.id = id;
  s.innerHTML = `<h2>${title}</h2>` + (note ? `<p class="note">${note}</p>` : '');
  app.appendChild(s); return s;
}
function row(parent, label) { if (label) { const h = document.createElement('h3'); h.textContent = label; parent.appendChild(h); } const r = document.createElement('div'); r.className = 'row'; parent.appendChild(r); return r; }
function fig(parent, img, scale = 2, cap = '', bg) {
  const f = document.createElement('figure'), c = document.createElement('canvas');
  c.width = img.width; c.height = img.height; c.getContext('2d').putImageData(img, 0, 0);
  c.style.width = img.width * scale * ZOOM + 'px'; c.style.height = img.height * scale * ZOOM + 'px';
  if (bg) c.style.background = bg;
  f.appendChild(c);
  if (cap) { const fc = document.createElement('figcaption'); fc.textContent = cap; f.appendChild(fc); }
  parent.appendChild(f); return c;
}

/* ---------- relics ---------- */
if (want('relics')) {
  const s = section('relics', 'The 12 named relics', 'Card portrait at 64px (prototype treatment, heirloom frame) shown 3x, and the 16px bag icon at 1x/3x.');
  const r = row(s);
  for (const id of RELIC_IDS) {
    const art = RELIC_ART[id];
    const f = document.createElement('figure');
    const img = time('relic portrait 64', () => itemPortrait(art, { rarity: 'heirloom', t: 1.3 }));
    const wrap = document.createElement('div'); wrap.className = 'row';
    fig(wrap, img, 3);
    const col = document.createElement('div'); col.style.display = 'flex'; col.style.flexDirection = 'column'; col.style.gap = '6px';
    const ic = time('relic icon 16', () => itemIcon(art));
    fig(col, ic, 1, '', '#211a16'); fig(col, ic, 3, '', '#211a16');
    wrap.appendChild(col); f.appendChild(wrap);
    const fc = document.createElement('figcaption'); fc.textContent = id; f.appendChild(fc);
    r.appendChild(f);
  }
  const r2 = row(s, 'the same art at 96px (card size from the brief), and the identify ritual (develop 0.35)');
  for (const id of ['hearthbrand', 'cairnmaul', 'thornwreath', 'briarfang']) fig(r2, itemPortrait(RELIC_ART[id], { rarity: 'heirloom', t: 2.1, size: 96 }), 2, id + ' 96');
  for (const dv of [0, .35, .7, 1]) fig(r2, itemPortrait({ kind: 'sword', rarity: 'storied', aspect: 'storm', seed: 3 }, { size: 64, t: .5, develop: dv }), 2, 'identify ' + dv);
}

/* ---------- every recipe kind at 64 / 16 ---------- */
const KIND_GROUPS = [['kinds-weapons', 'Weapons', ['sword', 'dagger', 'axe', 'hammer', 'mace', 'spear', 'bow', 'staff']], ['kinds-head', 'Off-hand and head', ['shield', 'focus', 'hood', 'coif', 'kettle', 'helm', 'circlet', 'crown']], ['kinds-body', 'Body, hands, feet, trinkets', ['robe', 'leather', 'mail', 'plate', 'gloves', 'gauntlets', 'boots', 'amulet', 'ring']]];
for (const [id, title, kinds] of KIND_GROUPS) {
  if (!want(id)) continue;
  const s = section(id, title + ' across rarities', 'Procedural itemArt() for each kind at each rarity (aspect cycling). 64px portraits at 2x; 16px bag icons under each at 2x.');
  for (const kind of kinds) {
    const r = row(s, kind);
    RARITY_ORDER.forEach((rar, i) => {
      const item = { kind, rarity: rar, aspect: i >= 2 ? ASPECTS[(i * 3 + kind.length) % 8] : null, seed: 7 + i };
      const f = document.createElement('figure');
      fig(f, time('item portrait 64', () => itemPortrait(item, { t: 1.1 })), 2);
      fig(f, time('item icon 16', () => itemIcon(item)), 2, `${rar}${item.aspect ? ' ' + item.aspect : ''}`, '#211a16');
      r.appendChild(f);
    });
  }
}

/* ---------- random grid ---------- */
if (want('loot')) {
  const s = section('loot', '40 rolled items', 'itemArt({ kind, rarity, aspect, seed }) with seeds 100..139: every one distinct, rarer tiers richer.');
  const r = row(s);
  for (let k = 0; k < 40; k++) {
    const kind = ITEM_KINDS[(k * 7) % ITEM_KINDS.length], rar = RARITY_ORDER[(k * 3) % 8], aspect = ASPECTS[(k * 5) % 8];
    const item = { kind, rarity: rar, aspect: RARITY_LOOK[rar].tier >= 2 ? aspect : null, seed: 100 + k };
    fig(r, itemPortrait(item, { t: 2 }), 2, `${kind} ${rar}${item.aspect ? ' ' + item.aspect : ''}`);
  }
  const r2 = row(s, 'rarity card corners');
  for (const rar of RARITY_ORDER) fig(r2, cardCorner(rar), 3, rar);
}



if (want('bases')) {
  const s = section('bases', 'Every base item in data/items.js', 'itemArt({ base, kind, rarity, seed }): the base id nudges the look (greatsword vs arming sword, maul vs warhammer, heater and tower shields).');
  const r = row(s);
  Object.values(ITEMS).forEach((b, i) => { const item = { base: b.id, kind: b.kind, rarity: RARITY_ORDER[i % 5], aspect: i % 5 >= 2 ? ASPECTS[i % 8] : null, seed: 50 + i }; const f = document.createElement('figure'); fig(f, itemPortrait(item, { t: .8 }), 2); fig(f, itemIcon(item), 2, b.id, '#211a16'); r.appendChild(f); });
  const r2 = row(s, 'shield shapes on the hero');
  for (const base of ['buckler', 'heater-shield', 'tower-shield']) fig(r2, renderHero('warden', { weapon: { base: 'longsword', kind: 'sword', rarity: 'tempered', seed: 4 }, offhand: { base, kind: 'shield', rarity: 'runed', aspect: 'frost', seed: 9 }, head: { base: 'great-helm', kind: 'helm', rarity: 'wrought', seed: 2 }, body: { base: 'full-plate', kind: 'plate', rarity: 'tempered', seed: 3 } }, { pose: 'guard' }), 3, base, '#1e1812');
  fig(r2, renderHero('warden', { weapon: { base: 'maul', kind: 'hammer', rarity: 'storied', aspect: 'stone', seed: 4 }, body: { base: 'brigandine', kind: 'leather', rarity: 'runed', seed: 3 } }, { pose: 'attack', t: .6 }), 3, 'maul', '#1e1812');
  fig(r2, renderHero('pip', { weapon: { base: 'longbow', kind: 'bow', rarity: 'runed', aspect: 'verdant', seed: 4 } }, { pose: 'attack', t: .1 }), 3, 'longbow', '#1e1812');
}

/* ---------- heroes ---------- */
const HERO_POSE_SET = [['idle', 0], ['idle', .7], ['attack', .1], ['attack', .6], ['cast', .3], ['hurt', 0], ['guard', 0], ['ko', 0]];
const STAGE = '#1e1812';
if (want('heroes')) {
  const s = section('heroes', 'Heroes: starter gear, every pose', 'renderHero(key, undefined, { pose, t }) at 64x64, shown 3x. Poses: idle (2 breath frames), attack wind-up / strike, cast, hurt, guard, ko.');
  for (const key of HERO_KEYS) {
    const r = row(s, HERO_ART[key].name);
    for (const [pose, t] of HERO_POSE_SET) fig(r, time('hero render (cold+warm)', () => renderHero(key, undefined, { pose, t })), 3, `${pose} t=${t}`, STAGE);
    fig(r, heroBust(key), 3, 'bust 24', STAGE);
  }
}
if (want('heroes-gear')) {
  const s = section('heroes-gear', 'Heroes wearing relics and rolled gear', 'The equipped items are drawn from the same item art as their cards.');
  const kits = [
    ['warden', 'Hearthbrand + Warden\'s Seal', { weapon: 'hearthbrand', offhand: RELIC_ART.x, amulet: 'wardens-seal', head: { kind: 'helm', rarity: 'runed', aspect: 'ember', seed: 3 }, body: { kind: 'plate', rarity: 'storied', aspect: 'ember', seed: 4 }, hands: { kind: 'gauntlets', rarity: 'runed', seed: 2 }, feet: { kind: 'boots', rarity: 'tempered', seed: 5 } }],
    ['warden', 'Stillwater Lance', { weapon: 'stillwater-lance', head: { kind: 'kettle', rarity: 'tempered', aspect: 'frost', seed: 9 }, body: { kind: 'mail', rarity: 'runed', seed: 2 }, hands: { kind: 'gloves', rarity: 'wrought', seed: 1 }, feet: { kind: 'boots', rarity: 'worn', seed: 1 } }],
    ['warden', 'Cairnmaul + shield', { weapon: 'cairnmaul', offhand: { kind: 'shield', rarity: 'heirloom', aspect: 'stone', seed: 11 }, head: { kind: 'coif', rarity: 'runed', seed: 4 }, body: { kind: 'leather', rarity: 'tempered', seed: 8 }, feet: { kind: 'boots', rarity: 'runed', seed: 3 } }],
    ['pip', 'Thornwatch Regalia + Briarfang', { weapon: 'briarfang', head: 'thornwatch-hood', body: 'thornwatch-jerkin', feet: 'thornwatch-boots', hands: { kind: 'gloves', rarity: 'tempered', seed: 6 } }],
    ['pip', 'Tallyknife', { weapon: 'tallyknife', head: { kind: 'circlet', rarity: 'storied', aspect: 'blight', seed: 1 }, body: { kind: 'leather', rarity: 'runed', aspect: 'blight', seed: 5 }, feet: { kind: 'boots', rarity: 'tempered', seed: 5 } }],
    ['bryn', 'Thornsplitter + Thornwreath', { weapon: 'thornsplitter', head: 'thornwreath', body: { kind: 'robe', rarity: 'heirloom', aspect: 'verdant', seed: 3 }, feet: { kind: 'boots', rarity: 'wrought', seed: 2 } }],
    ['bryn', 'Rotwood Circlet + staff', { weapon: { kind: 'staff', rarity: 'regalia', aspect: 'verdant', seed: 5 }, offhand: null, head: 'rotwood-circlet', body: { kind: 'robe', rarity: 'runed', aspect: 'blight', seed: 8 } }],
    ['alondra', 'Warden\'s Seal + focus', { weapon: { kind: 'mace', rarity: 'storied', aspect: 'radiant', seed: 5 }, offhand: { kind: 'focus', rarity: 'heirloom', aspect: 'radiant', seed: 2 }, amulet: 'wardens-seal', body: { kind: 'robe', rarity: 'primal', aspect: 'radiant', seed: 1 }, head: { kind: 'circlet', rarity: 'heirloom', aspect: 'radiant', seed: 4 }, feet: { kind: 'boots', rarity: 'storied', seed: 2 } }],
  ];
  for (const [key, label, gear] of kits) {
    const r = row(s, `${HERO_ART[key].name}: ${label}`);
    for (const [pose, t] of HERO_POSE_SET) fig(r, renderHero(key, gear, { pose, t }), 3, `${pose}`, STAGE);
  }
  const r = row(s, 'Hearthwarden presets (custom skin / hair / beard) and flip');
  const P = WARDEN_PRESETS;
  for (let k = 0; k < 8; k++) {
    const custom = { skin: P.skin[k % 4], hairMat: P.hairMat[(k * 5) % 6], hair: P.hair[k % 6], beard: k === 3 || k === 6, eye: P.eye[k % 4] };
    fig(r, renderHero('warden', undefined, { pose: 'idle', custom }), 2, `${custom.skin} ${custom.hair}`, STAGE);
  }
  fig(r, renderHero('warden', undefined, { pose: 'attack', t: .6, flip: true }), 2, 'flip', STAGE);
}


/* ---------- foes ---------- */
const FOE_BG = '#1a1612';
const FOE_POSE_SET = [['idle', 0], ['idle', .7], ['attack', .1], ['attack', .6], ['hurt', 0], ['ko', 0]];
function foeSection(id, keys, title, note) {
  if (!want(id)) return;
  const s = section(id, title, note);
  for (const key of keys) {
    const def = FOE_ART[key]; if (!def) continue;
    for (let gT = 0; gT < 4; gT++) {
      const r = row(s, `${def.name} gearTier ${gT}`);
      for (const [pose, t] of FOE_POSE_SET) fig(r, time(`foe ${key} render`, () => renderFoe(key, { gearTier: gT, pose, t })), 2, `${pose}`, FOE_BG);
      if (key === 'bandit') fig(r, renderFoe(key, { gearTier: gT, tier: 'veteran' }), 2, 'veteran', FOE_BG);
    }
  }
}
foeSection('foes-humanoid', ['cutpurse', 'bandit', 'tallyman'], 'Humanoid foes: gearTier 0-3, every pose', 'renderFoe(key, { gearTier, pose, t }) at 64x64 (2x). They face right toward the party. Relics are shown in the next section.');
if (want('foes-relic')) {
  const s = section('foes-relic', 'Relics on humanoid foes, held and disarmed', 'relic drawn from RELIC_ART (same art as the card); relicHeld:false removes it. Glint frames at t=0 and t=0.1.');
  const cases = [['tallyman', 'wardens-seal', 0], ['tallyman', 'tallyknife', 2], ['bandit', 'thornwatch-hood', 1], ['bandit', 'thornwatch-jerkin', 2], ['bandit', 'thornwatch-boots', 1], ['cutpurse', 'tallyknife', 1]];
  for (const [key, relic, gT] of cases) {
    const r = row(s, `${key} + ${relic}`);
    for (const t of [0, .12, 1.2]) fig(r, renderFoe(key, { gearTier: gT, tier: 'veteran', relic, t }), 2, `held t=${t}`, FOE_BG);
    fig(r, renderFoe(key, { gearTier: gT, tier: 'veteran', relic, relicHeld: false }), 2, 'disarmed', FOE_BG);
    fig(r, renderFoe(key, { gearTier: gT, tier: 'veteran', relic, pose: 'attack', t: .6 }), 2, 'attack', FOE_BG);
  }
}
foeSection('foes-beasts', ['briarling', 'thornhound'], 'Rabble beasts: gearTier 0-3 (thornier, then rotting), every pose', 'Beasts face right.');


if (want('foes-bearers')) {
  const s = section('foes-bearers', 'Relic-Bearers: the Rot-Stag and Old Snag', 'Relic drawn from RELIC_ART inside the creature (glinting), and gone when relicHeld:false. gearTier escalates rot/thorns.');
  for (const key of ['rotstag', 'oldsnag']) {
    for (const gT of [0, 3]) {
      const r = row(s, `${FOE_ART[key].name} gearTier ${gT}`);
      for (const [pose, t] of FOE_POSE_SET) fig(r, time(`foe ${key} render`, () => renderFoe(key, { gearTier: gT, pose, t })), 2, pose, FOE_BG);
    }
    const r = row(s, `${FOE_ART[key].name}: relic glint over time, then disarmed`);
    for (const t of [0, .1, .2, 1.5]) fig(r, renderFoe(key, { t }), 2, `t=${t}`, FOE_BG);
    fig(r, renderFoe(key, { relicHeld: false }), 2, 'relicHeld:false', FOE_BG);
    fig(r, renderFoe(key, { relicHeld: false, pose: 'attack', t: .6 }), 2, 'disarmed attack', FOE_BG);
  }
}
if (want('foes-boss')) {
  const s = section('foes-boss', 'Briarmaw, the Champion: phases 1-3, broken pieces, poses', 'renderFoe(\'briarmaw\', { phase, broken, pose, t }) at 96x96 (2x).');
  for (const phase of [1, 2, 3]) {
    const r = row(s, `phase ${phase}`);
    for (const [pose, t] of FOE_POSE_SET) fig(r, time('foe briarmaw render', () => renderFoe('briarmaw', { phase, pose, t })), 2, pose, FOE_BG);
  }
  const r = row(s, 'broken pieces');
  for (const [phase, broken] of [[1, ['thornwreath']], [2, ['briarfang']], [3, ['thornwreath', 'briarfang']]]) fig(r, renderFoe('briarmaw', { phase, broken }), 2, `p${phase} broken: ${broken.join('+')}`, FOE_BG);
  fig(r, renderFoe('briarmaw', { phase: 2, t: 0 }), 2, 'glint crown', FOE_BG);
  fig(r, renderFoe('briarmaw', { phase: 2, t: 1.25 }), 2, 'glint fang', FOE_BG);
}


if (only && only.includes('focus')) {
  const s = section('focus', 'Focus');
  const keys = ((window.location.hash.match(/fk=([^&]+)/) || [])[1] || 'briarmaw').split(',');
  for (const key of keys) {
    const r = row(s, key);
    for (const [pose, t] of [['idle', 0], ['attack', .6], ['hurt', 0], ['ko', 0]]) fig(r, renderFoe(key, { pose, t, phase: +((window.location.hash.match(/ph=(\d)/) || [])[1] || 1) }), 4, pose, FOE_BG);
  }
}


/* ---------- backdrops ---------- */
if (want('scenes')) {
  const s = section('scenes', 'Battle backdrops', 'renderBackdrop(key, { w: 160, h: 96, t }) shown 3x, with two time frames (lights flicker, particles drift) and the four parallax layers; last column shows a party + foe standing on the floor band.');
  for (const key of BACKDROP_KEYS) {
    const r = row(s, BACKDROPS[key].name + ' (' + key + ')');
    fig(r, time('backdrop render', () => renderBackdrop(key, { t: 1.3 })), 3, 't=1.3');
    fig(r, renderBackdrop(key, { t: 2.9 }), 3, 't=2.9');
    const r2 = row(s);
    for (const L of backdropLayers(key).layers) fig(r2, L.img, 1, L.id + ' x' + L.parallax, '#302830');
    // a quick battle mock-up on the floor band
    const bd = renderBackdrop(key, { t: 1 }), c = document.createElement('canvas'); c.width = 160; c.height = 96; const g = c.getContext('2d'); g.putImageData(bd, 0, 0);
    const put = (img, x, y) => { const t2 = document.createElement('canvas'); t2.width = img.width; t2.height = img.height; t2.getContext('2d').putImageData(img, 0, 0); g.drawImage(t2, Math.round(x), Math.round(y)); };
    const foe = key === 'briarmaw-den' ? renderFoe('briarmaw', { phase: 2, t: .3 }) : key === 'verdant-wood' ? renderFoe('rotstag', { t: .3 }) : key === 'thornhollow' ? renderFoe('bandit', { gearTier: 2, tier: 'veteran' }) : renderFoe('tallyman', {});
    const fa = foe.anchors.foot; put(foe, 44 - fa[0], 84 - fa[1]);
    const heroes = ['warden', 'pip', 'bryn', 'alondra'];
    heroes.forEach((k, i) => { const im = renderHero(k, undefined, { pose: 'idle', t: .2 + i }), a = im.anchors.foot; put(im, 106 + (i % 2) * 22 - a[0] + (i >> 1) * 10, 78 + (i >> 1) * 12 - a[1]); });
    const f = document.createElement('figure'); c.style.width = '480px'; c.style.height = '288px'; f.appendChild(c); const fc = document.createElement('figcaption'); fc.textContent = 'mock-up'; f.appendChild(fc); r.appendChild(f);
  }
}


/* ---------- icons ---------- */
if (want('icons')) {
  const s = section('icons', 'Icons', 'Dice 20px (4x), status and aspect icons 12px (4x and 1x), grip chain, digit fonts.');
  const r = row(s, 'dice: blank, values, crit, fumble, intent materials, tumble frames');
  for (const d of DICE) { const f = document.createElement('figure'); const w = document.createElement('div'); w.className = 'row';
    fig(w, diceIcon(d), 4); fig(w, diceIcon(d, { value: d }), 4); fig(w, diceIcon(d, { value: d === 20 ? 20 : 1 }), 4); f.appendChild(w); const fc = document.createElement('figcaption'); fc.textContent = 'd' + d; f.appendChild(fc); r.appendChild(f); }
  const r2 = row(s);
  fig(r2, diceIcon(20, { value: 20, state: 'crit' }), 4, 'nat 20 crit'); fig(r2, diceIcon(20, { value: 1, state: 'fumble' }), 4, 'nat 1 fumble'); fig(r2, diceIcon(20, { value: 13, state: 'dim' }), 4, 'dim (discarded)');
  for (const [d, m] of [[6, 'iron'], [8, 'bronze'], [12, 'gold'], [20, 'amethyst']]) fig(r2, diceIcon(d, { value: d - 1, mat: m }), 4, `intent d${d} ${m}`);
  for (let k = 0; k < 4; k++) fig(r2, diceIcon(20, { value: 7 + k, spin: k }), 4, 'spin ' + k);
  for (const v of [2, 5, 9, 11, 17, 20]) fig(r2, diceIcon(20, { value: v, size: 16 }), 4, 'd20 16px ' + v);
  const r3 = row(s, 'status icons');
  for (const k of STATUS_KEYS) { const f = document.createElement('figure'); const w = document.createElement('div'); w.className = 'row'; fig(w, statusIcon(k), 4); fig(w, statusIcon(k), 1); fig(w, statusIcon(k, { size: 24 }), 2); f.appendChild(w); const fc = document.createElement('figcaption'); fc.textContent = k; f.appendChild(fc); r3.appendChild(f); }
  const r4 = row(s, 'aspect tokens and grip');
  for (const a of ASPECTS) { const f = document.createElement('figure'); const w = document.createElement('div'); w.className = 'row'; fig(w, aspectIcon(a), 4); fig(w, aspectIcon(a), 1); f.appendChild(w); const fc = document.createElement('figcaption'); fc.textContent = a; f.appendChild(fc); r4.appendChild(f); }
  fig(r4, gripIcon(), 4, 'grip'); fig(r4, gripIcon({ broken: true }), 4, 'grip broken');
  const r5 = row(s, 'digit fonts');
  fig(r5, digitsImage('0123456789', { color: '#ecdfc3' }), 4, '3x5'); fig(r5, digitsImage('0123456789', { font: '4x6', color: '#ffcb66' }), 4, '4x6'); fig(r5, digitsImage('-12', { font: '4x6', color: '#ee6c54', outline: true }), 4, 'outlined');
}


/* ======================================================================
   M3 overworld art (WP5): tilesets, walkers, NPCs, map foes, objects, emotes
   ====================================================================== */
function crop(img, x, y, w, h) {
  const out = new ImageData(w, h), s = img.data, d = out.data;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const X = x + xx, Y = y + yy; if (X < 0 || Y < 0 || X >= img.width || Y >= img.height) continue;
    const i = (Y * img.width + X) * 4, j = (yy * w + xx) * 4; d[j] = s[i]; d[j + 1] = s[i + 1]; d[j + 2] = s[i + 2]; d[j + 3] = s[i + 3];
  }
  return out;
}
const GROUND_BG = '#2c3a24';
// gear states for the walker review: starter kit, mid-game rolled gear, late relics
const WALKER_KITS = {
  warden: [
    ['starter', undefined],
    ['mid: Stillwater + rolled', { weapon: 'stillwater-lance', head: { kind: 'kettle', rarity: 'tempered', aspect: 'frost', seed: 9 }, body: { kind: 'mail', rarity: 'runed', seed: 2 }, hands: { kind: 'gloves', rarity: 'wrought', seed: 1 }, feet: { kind: 'boots', rarity: 'tempered', seed: 1 }, amulet: { kind: 'amulet', rarity: 'runed', aspect: 'frost', seed: 3 } }],
    ['late: Hearthbrand, Seal, runed helm, plate', { weapon: { base: 'hearthbrand', kind: 'sword', rarity: 'heirloom', aspect: 'ember', temper: 2, seed: 1 }, offhand: { kind: 'shield', rarity: 'heirloom', aspect: 'stone', seed: 11 }, amulet: 'wardens-seal', head: { kind: 'helm', rarity: 'runed', aspect: 'ember', seed: 3 }, body: { kind: 'plate', rarity: 'storied', aspect: 'ember', seed: 4 }, hands: { kind: 'gauntlets', rarity: 'runed', seed: 2 }, feet: { kind: 'boots', rarity: 'tempered', seed: 5 } }],
  ],
  pip: [
    ['starter', undefined],
    ['mid: Tallyknife + rolled', { weapon: 'tallyknife', head: { kind: 'circlet', rarity: 'storied', aspect: 'blight', seed: 1 }, body: { kind: 'leather', rarity: 'runed', aspect: 'blight', seed: 5 }, feet: { kind: 'boots', rarity: 'tempered', seed: 5 }, hands: { kind: 'gloves', rarity: 'tempered', seed: 6 } }],
    ['late: Thornwatch Regalia + Briarfang', { weapon: 'briarfang', head: 'thornwatch-hood', body: 'thornwatch-jerkin', feet: 'thornwatch-boots', hands: { kind: 'gloves', rarity: 'tempered', seed: 6 } }],
  ],
  bryn: [
    ['starter', undefined],
    ['mid: rolled staff + Rotwood Circlet', { weapon: { kind: 'staff', rarity: 'regalia', aspect: 'verdant', seed: 5 }, head: 'rotwood-circlet', body: { kind: 'robe', rarity: 'runed', aspect: 'blight', seed: 8 }, feet: { kind: 'boots', rarity: 'wrought', seed: 2 } }],
    ['late: Thornsplitter + Thornwreath', { weapon: 'thornsplitter', head: 'thornwreath', body: { kind: 'robe', rarity: 'heirloom', aspect: 'verdant', seed: 3 }, feet: { kind: 'boots', rarity: 'wrought', seed: 2 } }],
  ],
  alondra: [
    ['starter', undefined],
    ['mid: Cairnmaul + rolled', { weapon: 'cairnmaul', head: { kind: 'hood', rarity: 'tempered', aspect: 'radiant', seed: 4 }, body: { kind: 'robe', rarity: 'runed', aspect: 'radiant', seed: 6 }, feet: { kind: 'boots', rarity: 'wrought', seed: 3 }, amulet: { kind: 'amulet', rarity: 'tempered', seed: 2 } }],
    ['late: storied mace, heirloom focus, Seal', { weapon: { kind: 'mace', rarity: 'storied', aspect: 'radiant', seed: 5 }, offhand: { kind: 'focus', rarity: 'heirloom', aspect: 'radiant', seed: 2 }, amulet: 'wardens-seal', body: { kind: 'robe', rarity: 'primal', aspect: 'radiant', seed: 1 }, head: { kind: 'circlet', rarity: 'heirloom', aspect: 'radiant', seed: 4 }, feet: { kind: 'boots', rarity: 'storied', seed: 2 } }],
  ],
};

// sample scenes per biome, drawn exactly as the world renderer bakes them: atlas.cell() ground ops
// row by row, then y-sorted sprites, then the overhead ops
const SCENES = {
  keep: ['~~~~~~~~~bb~~~~~~~~~~~', '~####*###bb###*#####~~', '~#::::::::::::::::.T#~', '~#:HHHHHHHH:::::....#~', '~#:HHHHHHHH:::,,,...#~', '~#:###*+*##:::,T,:..#~', '~#:::::::::::::::::::b', '~#.T..:::::_____::::#~', '~#....:::::_____:::t#~', '~#,,..:::::_____::::#~', '~####+############*##~', '~~~~bb~~~~~~~~~~~~~~~~'],
  wilds: ['TTTTTTT....."""..TTTTTT', 'TTTTT.....====....TTTTT', 'TT,..."".==..,=....TTTT', 'T..o..."".=....==......', '...t....==......==...o.', '^^^^^^vv^=^^^^^^^=^^^^^', '.......==..,,....==....', '..~~~~~bb~~~~~~~ww~~~..', '..~~~~~bb~~~~~~~ww~~~..', '...,...==....m...==.t..', '..T....==...mm....=....', '.TT..,.==.........==.TT'],
  town: ['||||||||||==||||||||||', '|.........==.........|', '|.HHHH....==...HHHH..|', '|.HHHH....==...HHHH..|', '|.#*+#....==...#+*#..|', '|.........==.....,,..|', '|..T.....::::.....T..|', '=========::::========|', '|........::::........|', '|.,,.....==....HHHH..|', '|..t.....==....#+##..|', '||||||||||==||||||||||'],
  grove: ['TTTTTTTTTTTTTTTTTTTTTT', 'TT...,,...TTT....f..TT', 'T..:::::...T...###*##T', 'T.:::::::......#+####T', 'T.::,,,::.......""...T', 'T..:::::...==========T', 'T.........==....,,...T', 'TYYY.....==...ff.....T', 'T.f.YY..==..~~~~~....T', 'T.......==..~~ww~~...T', 'TT..,,..==...........T', 'TTTTTTTT==TTTTTTTTTTTT'],
  fen: ['""""..mm.......TT..""""', '"~~~~..mm...,..T..~~~~"', '"~~~~~.mmm......."~~~~"', '~~~~~~~.bbbbbbbb.~~~~~~', '~~~~~~~.bbbbbbbb.~~~~~~', '"~~~~.....mm...."~~~~~"', '"".~~..T..mmm...."~~~""', '...t...""...mm..T.....', 'mm.....""......~~~~...', 'mmm..o...,,...~~ww~~..', '..mm.......".~~~~~~~..', 'T..mm....T.."""""..T..'],
  tower: ['xxxx##############xxxx', 'xxx#*____#s#____*#xxx', 'xx#______#_#______#xx', 'x#__________________#x', '#____kkk_______o_____#', '*____kkk____________*', '#___________________##', '#__"_____####___t____#', '#________#__#________#', 'x#_______#__+_______#x', 'xx#_________________#x', 'xxx###*###++###*###xxx'],
  roots: ['RRRRRRRRRRRRRRRRRRRRRR', 'RRrrrrrrRRRRrrrrrrrRRR', 'Rrrrfrrrrr##rrrriiiirR', 'RrrYYYrrrrrrrrrriiiirR', 'RrrrrrrrrkkkkrrrriirrR', 'RRrrrffrrkkkkrrrrrrrRR', 'Rrrrrrrrrrrrrrrr.rrrrR', 'RrrrrrYYYrrrrrfrrrrrrR', 'Rriiirrrrrrr~~rrrrrrRR', 'RriiiirrrrrrrrrrrYYrrR', 'RRrrrrrrrrs+rrrrrrrrRR', 'RRRRRRRRRRRRRRRRRRRRRR'],
  den: ['RRRRRRRRRRRRRRRRRRRRRR', 'RRmmmmmRRRRRRmmmmmmRRR', 'Rmmmtmmmmmmmmmmmiimm.R', 'Rmm..mmmmmmmmmmiiiimmR', 'Rmm.....o.....mmiimmmR', 'RRm............mmmmRRR', 'Rmm..........t....mmR', 'Rmmmii.....mmmm...mmmR', 'Rmmiiii...mmmmmm..mmRR', 'RRmmii.....mmmm..tmmmR', 'RRRmmmmmmm++mmmmmmmRRR', 'RRRRRRRRRRRRRRRRRRRRRR'],
  // M4: the Sunscorch biomes (every character each place is likely to use)
  desert: ['"""..T.....==..,,,,.T..', '"t"".......==.,,,,,....', '..".....o..==.....f....', '...,,,.....==...HHHH...', '..,,,,.....==...HHHH.o.', '.....T.....==...#*+#...', '..o........==.........t', '^^^^^^vv^^^==^^^^^^^^^^', '.....rrrr..==...~~~~...', '..T..r..r..==..~~~ww~..', '.....r..rrr==...~~~~.t.', '..t..r.....==....T.....'],
  'desert-town': ['.HHHHHH..::::..HHHHHH..', '.HHHHHH..::::..HHHHHH.T', '.#*#+##..::::..##+#*#..', '.,,.T....::::....T.,,..', '........::::::......o..', '=========::::::=========', '...t..~~~~::::~~~~..t..', '...T..~~~~::::~~~~..T..', '.,,...~~ww::::ww~~..,,.', '......________.....#####', '.t....________..o..#*+##', '......________.....#...#'],
  canyon: ['^^^^^^^^^^^^^^^^^^^^^^^', '^^^^^^^^^^^^^^^^^^^^^^^', '..o..rrrrrrrrrr....o...', '.....r........r...,,,..', '==...r..T.....rrrrrrrrr', '====.r...........t.....', '...===rrrrrrr...~~~~~~~', '.,,...==........~~~~~~~', '......."".==....bbb.YY.', '.T.....""..===.....YYY.', 'vvvvvvvvvvvvvvvvvvvvvvv', '...o..#####.....T.m..t.'],
  'mine-camp': ['|||||||||||||||||||||||', '|.HHHHH....s.....HHHH.|', '|.HHHHH..........HHHH.|', '|.#+###.rrrrrrr..#+*#.|', '|......r.......r......|', '|..t...r..,,,..r...T..|', '|......r..,,,..r......|', '=======r.......r=======', '|..o...rrrrrrrrr...t..|', '|..mm.....f.......___.|', '|.mmm..~~~.......____.|', '|||||||||||||||||||||||'],
  mine: ['RRRRRRRRRRRRRRRRRRRRRRR', 'RRRRRR#*##s##*#RRRRRRRR', 'R.....r.......r....fRRR', 'R..T..r...o...r.....RRR', 'R.....rrrrrrrrr..k..RRR', 'RR....r.....,,...kk..RR', 'RR.f..r...t.......YY.RR', 'R.....r....mm...~~~..RR', 'R..,,.r...mmm...~~~..RR', 'Rxxxxxbbbxxxx.........R', 'R.....r........f...+..R', 'RRRRRRRRRRRRRRRRRRRRRRR'],
  crystal: ['RRRRRRRRRRRRRRRRRRRRRRR', 'RRR#*##RRRRRRR##*#RRRRR', 'R.....f....T.....,,..RR', 'R..T...,,.....o.....fRR', 'R....t......YYY......RR', 'R.........f.YYY..t....R', 'RR..o...........~~~~..R', 'R....T....,,...~~~~~..R', 'R..f.........T..~~~..RR', 'R......kkkk.......f...R', 'RR.t...kkkk...o.......R', 'RRRRRRRRRRRRRRRRRRRRRRR'],
  dunes: [',,,,,,....T.......,,,,,', ',,,,,.....o..HHHH.,,,,,', '.......t.....HHHH......', '..T..........#+##...o..', '......f..............,,', '=======================', '...,,,,....t....f......', '..,,,,,,.....T.....,,,,', '^^^^^^vvv^^^^^^^^^^^^^^', '.....""".......####....', '..o..""".......#..#..T.', '.f..........t..........'],
  oasis: ['#####*#######*#########', '#,,.T..,,.T...,,.T..,,#', '#..HHHH.......~~~~~...#', '#..HHHH..T...~~~~~~~..#', '#..#+##......~~~ww~~..#', '#.........T...~~~~~.,,#', '#::::::::::::::.......#', '#,,.t.."""..f..::.t...#', '#...T..""".....::.....#', '#..mmm.....,,,.::..T..#', '#.............f::.....#', '#######+###############'],
  ash: ['#####*#####..#####*####', '#HHHHH#.....,,..HHHH..#', '#HHHHH#..T.,,,..HHHH..#', '#*#+###.........#+##..#', '#......o..mmm.......t.#', '#..""....mmmmm..f.....#', '#::::::::::::::::::::::', '#..t..f...,,,..T..o...#', '#.......iii.....,,....#', '#..T...iiiii......||||#', '#.......iii....___....#', '#####....#########....#'],
  vault: ['#######################', '#*###*#####s####*###*##', '#::::::::::::::::::::##', '#:T:::T:::::::T:::T::##', '#::::::::mm:::::::::::#', '#:::t::::mmm::f::o::::#', '#.......______........#', '#..f....______..mm....#', '#..YY...______...t....#', '#..YY.....,,.........##', '#RRRRRR...+....RRRRRR##', '#######################'],
};
function sceneCanvas(biome, rows, sprites = [], frame = 0) {
  const A = tileAtlas(biome), src = document.createElement('canvas');
  src.width = A.img.width; src.height = A.img.height; src.getContext('2d').putImageData(A.img, 0, 0);
  const w = Math.max(...rows.map(r => r.length)), h = rows.length, c = document.createElement('canvas');
  const pad = rows.map(r => r.padEnd(w, r[r.length - 1]));
  c.width = w * TILE_PX; c.height = h * TILE_PX; const g = c.getContext('2d');
  const over = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ops = A.cell(pad, x, y, frame);
    for (const [sx, sy, sw, shh, dx, dy] of ops.ground) g.drawImage(src, sx, sy, sw, shh, x * TILE_PX + dx, y * TILE_PX + dy, sw, shh);
    for (const o of ops.over) over.push([o, x, y]);
  }
  sprites.slice().sort((a, b) => a.y - b.y).forEach(sp => { const t2 = document.createElement('canvas'); t2.width = sp.img.width; t2.height = sp.img.height; t2.getContext('2d').putImageData(sp.img, 0, 0); g.drawImage(t2, sp.sx || 0, sp.sy || 0, sp.w, sp.h, Math.round(sp.x * TILE_PX + 8 - sp.foot[0]), Math.round(sp.y * TILE_PX + 15 - sp.foot[1]), sp.w, sp.h); });
  for (const [[sx, sy, sw, shh, dx, dy], x, y] of over) g.drawImage(src, sx, sy, sw, shh, x * TILE_PX + dx, y * TILE_PX + dy, sw, shh);
  return c;
}
function figCanvas(parent, c, scale, cap) {
  const f = document.createElement('figure'); c.style.width = c.width * scale * ZOOM + 'px'; c.style.height = c.height * scale * ZOOM + 'px'; f.appendChild(c);
  if (cap) { const fc = document.createElement('figcaption'); fc.textContent = cap; f.appendChild(fc); }
  parent.appendChild(f); return c;
}
const walkerSprite = (key, gear, dir, frame, x, y) => { const sh = walkerSheet(key, gear); return { img: sh.img, sx: frame * 16, sy: WALKER_ROWS.indexOf(dir) * 24, w: 16, h: 24, foot: sh.foot, x, y }; };
if (want('world-tiles')) {
  const bio = ((window.location.hash.match(/bio=([^&]+)/) || [])[1] || BIOMES.join(',')).split(',');
  const s = section('world-tiles', 'World: tilesets by biome', 'tileAtlas(biome): each scene is composed with atlas.cell(rows, x, y, frame) (hash variants, 4-bit edges, inner corners, canopies, roofs, tall-grass tops) at 3x, frame 0 and frame 1, then the raw atlas at 2x.');
  for (const biome of bio) {
    const rows = SCENES[biome];
    const t = time('tileAtlas ' + biome + ' (cold)', () => tileAtlas(biome));
    T['tileAtlas ' + biome + ' (build ms)'] = t.ms;
    const r = row(s, `${biome}: atlas built in ${t.ms.toFixed(1)} ms`);
    const party = biome === 'wilds' ? [walkerSprite('warden', undefined, 's', 0, 9, 3), walkerSprite('pip', undefined, 's', 1, 9, 2), walkerSprite('bryn', undefined, 'e', 2, 8, 6), walkerSprite('alondra', undefined, 'n', 0, 7, 9)] : biome === 'keep' ? [walkerSprite('warden', undefined, 's', 0, 12, 6), walkerSprite('pip', undefined, 'e', 1, 10, 6)] : [walkerSprite('bryn', undefined, 's', 0, 11, 5), walkerSprite('alondra', undefined, 'w', 1, 12, 6)];
    figCanvas(r, sceneCanvas(biome, rows, party, 0), 3, biome + ' frame 0');
    figCanvas(r, sceneCanvas(biome, rows, [], 1), 2, 'frame 1');
    if (!only || only.includes('atlas')) fig(r, t.img, 2, 'atlas ' + t.img.width + 'x' + t.img.height, '#ff00ff');
  }
}

if (want('world-npcs')) {
  const s = section('world-npcs', 'World: NPCs', 'npcSheet(artKey) for every NPC art key in data/npcs.js: full sheets at 3x (stand, stepA, stepB x s, n, e, w), then the front stand frame at 6x.');
  const keys = [...new Set(Object.values(NPCS).map(n => n.art))];
  const r = row(s, keys.join(' · '));
  for (const k of keys) fig(r, time('npcSheet (cold)', () => npcSheet(k)).img, 3, k, GROUND_BG);
  const r2 = row(s, 'front, 6x');
  for (const k of keys) fig(r2, crop(npcSheet(k).img, 0, 0, 16, 24), 6, k, GROUND_BG);
}
const MAP_FOE_KEYS = ['cutpurse', 'bandit', 'tallyman', 'smuggler', 'feral-druid', 'hollowed-ranger', 'tamsin', 'mags', 'haskett', 'hollis', 'dun', 'vesper', 'oda', 'corra',
  'scavenger', 'dune-raider', 'ash-wight', 'rasa', 'ash-captain', 'brask', 'quartermaster', 'vell'];
if (want('world-foes')) {
  const s = section('world-foes', 'World: map foes', 'mapFoeSheet(artKey, { gearTier, variant, relic }): 2 gait frames x rows s, n, e, w. Humanoids reuse the walker rig via foeLooks (gearTier 0-3 shown); named holders carry their relic; beasts are dedicated 16-32 px sprites.');
  const r = row(s, 'humanoids at gearTier 0 and 3 (3x)');
  for (const k of MAP_FOE_KEYS) { fig(r, time('mapFoeSheet humanoid (cold)', () => mapFoeSheet(k, { gearTier: 0 })).img, 3, k + ' g0', GROUND_BG); fig(r, mapFoeSheet(k, { gearTier: 3 }).img, 3, 'g3', GROUND_BG); }
  const r1 = row(s, 'Tamsin with each lent starter; bandit + poacher variant resolves to Haskett (6x, front)');
  for (const v of ['hearthbrand', 'stillwater-lance', 'cairnmaul']) fig(r1, crop(mapFoeSheet('tamsin', { variant: v }).img, 0, 0, 16, 24), 6, 'tamsin ' + v, GROUND_BG);
  fig(r1, crop(mapFoeSheet('bandit', { variant: 'poacher' }).img, 0, 0, 16, 24), 6, 'bandit/poacher', GROUND_BG);
  for (const k of ['mags', 'hollis', 'dun', 'oda', 'corra']) fig(r1, crop(mapFoeSheet(k).img, 0, 48, 16, 24), 6, k + ' e', GROUND_BG);
  for (const key of Object.keys(MAP_FOE_SIZE)) {
    const r2 = row(s, `${key} (${MAP_FOE_SIZE[key].join('x')}), gearTier 0 and 3, at 4x`);
    fig(r2, time('mapFoeSheet beast (cold)', () => mapFoeSheet(key, { gearTier: 0 })).img, 4, 'g0', GROUND_BG);
    fig(r2, mapFoeSheet(key, { gearTier: 3 }).img, 4, 'g3', GROUND_BG);
  }
}
if (want('world-objects')) {
  const s = section('world-objects', 'World: objects and emotes', 'objectSprite(kind, state, { frame, relic, id }) for every kind and state at 4x (animated ones show both frames); hearthfire looks by id; emote(kind, { frame }) at 6x.');
  for (const kind of OBJECT_KINDS) {
    const r = row(s, kind);
    for (const st of OBJECT_STATES[kind]) {
      const a = time('objectSprite (cold)', () => objectSprite(kind, st, { relic: kind === 'pedestal' ? 'hearthbrand' : null }));
      fig(r, a, 4, st, GROUND_BG);
      if (a.frames > 1) fig(r, objectSprite(kind, st, { frame: 1, relic: kind === 'pedestal' ? 'hearthbrand' : null }), 4, st + ' f1', GROUND_BG);
    }
    if (kind === 'hearth') for (const id of Object.keys(HEARTH_LOOKS)) { fig(r, objectSprite('hearth', 'lit', { id }), 4, id, GROUND_BG); fig(r, objectSprite('hearth', 'cold', { id }), 4, 'cold', GROUND_BG); }
  }
  const r = row(s, 'emotes');
  for (const k of EMOTES) { const e = emote(k); fig(r, e, 6, k, GROUND_BG); if (e.frames > 1) fig(r, emote(k, { frame: 1 }), 6, k + ' f1', GROUND_BG); }
  const r2 = row(s, 'every tile id in the wilds atlas: ' + TILE_IDS.length + ' ids');
  const A = tileAtlas('wilds');
  for (const id of TILE_IDS) { const [sx, sy] = A.at(id, 0, 0); fig(r2, crop(A.img, sx, sy, 16, 16), 3, id); }
}
if (want('world-walkers')) {
  const s = section('world-walkers', 'World: hero walkers (16x24 rig)', 'walkerSheet(heroId, gear, { custom }) → 3 frames (stand, stepA, stepB) × rows s, n, e, w. Each hero in 3 gear states: starter kit, mid-game, late relics. Sheets at 3x; the front stand frame and a side step at 6x.');
  for (const key of HERO_KEYS) {
    const r = row(s, HERO_ART[key].name);
    for (const [label, gear] of WALKER_KITS[key]) {
      const sh = time('walkerSheet (cold)', () => walkerSheet(key, gear));
      fig(r, sh.img, 3, label, GROUND_BG);
    }
    for (const [label, gear] of WALKER_KITS[key]) {
      const sh = walkerSheet(key, gear);
      fig(r, crop(sh.img, 0, 0, 16, 24), 6, label.split(':')[0] + ' s', GROUND_BG);
      fig(r, crop(sh.img, 16, 48, 16, 24), 6, 'e step', GROUND_BG);
    }
  }
  const r = row(s, 'Hearthwarden presets (custom look) with the starter kit');
  const P = WARDEN_PRESETS;
  for (let k = 0; k < 8; k++) {
    const custom = { skin: P.skin[k % 4], hairMat: P.hairMat[(k * 5) % 6], hair: P.hair[k % 6], beard: k === 3 || k === 6, eye: P.eye[k % 4] };
    fig(r, crop(walkerSheet('warden', null, { custom }).img, 0, 0, 48, 24), 4, `${custom.skin} ${custom.hair}${custom.beard ? ' beard' : ''}`, GROUND_BG);
  }
}

// close-up review: node tools/gallery.mjs --only=world-zoom --fk=pip  (full sheets at 6x)
if (only && only.includes('world-zoom')) {
  const s = section('world-zoom', 'World close-up');
  const keys = ((window.location.hash.match(/fk=([^&]+)/) || [])[1] || 'warden').split(',');
  for (const key of keys) {
    const r = row(s, key);
    if (MAP_FOE_SIZE[key] || MAP_FOE_KEYS.includes(key)) { for (const gT of [0, 3]) fig(r, mapFoeSheet(key, { gearTier: gT }).img, 6, key + ' g' + gT, GROUND_BG); continue; }
    if (key.startsWith('npc:')) { fig(r, npcSheet(key.slice(4)).img, 6, key, GROUND_BG); continue; }
    if (key.startsWith('obj:')) { const k = key.slice(4); for (const st of OBJECT_STATES[k] || ['closed']) { const a = objectSprite(k, st, { relic: k === 'pedestal' ? 'isoldes-oath' : null }); fig(r, a, 6, st, GROUND_BG); if (a.frames > 1) fig(r, objectSprite(k, st, { frame: 1 }), 6, 'f1', GROUND_BG); } if (k === 'hearth') for (const id of Object.keys(HEARTH_LOOKS)) fig(r, objectSprite('hearth', 'lit', { id }), 6, id, GROUND_BG); continue; }
    for (const [label, gear] of WALKER_KITS[key] || [['starter', undefined]]) fig(r, walkerSheet(key, gear).img, 6, label, GROUND_BG);
  }
}

if (want('world-perf')) {
  const s = section('world-perf', 'World: render cost', 'Build time in this browser. tileAtlas: "first" is the first build in the page (includes JIT warm-up of the Forge paths), then a fresh rebuild of every biome (buildTileAtlas, uncached) and the median of 3. Sheets: cold = first build of a new key, warm = the cached lookup. Budget: tileAtlas <= 150 ms per biome.');
  const pre = document.createElement('pre'); s.appendChild(pre);
  const lines = [], med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
  const t0 = performance.now(); buildTileAtlas('keep'); const first = performance.now() - t0;
  T['tileAtlas first build (keep, JIT)'] = first;
  lines.push(`tileAtlas first build in page (keep, JIT warm-up) ${first.toFixed(1).padStart(7)} ms`);
  for (const b of BIOMES) {
    const runs = []; let cells = 0;
    for (let k = 0; k < 3; k++) { const a = performance.now(); const A = buildTileAtlas(b); runs.push(performance.now() - a); cells = A.cells; }
    T['tileAtlas ' + b + ' (median ms)'] = med(runs); T['tileAtlas ' + b + ' (min ms)'] = Math.min(...runs);
    lines.push(`tileAtlas ${b.padEnd(6)} ${cells} cells   median ${med(runs).toFixed(1).padStart(6)} ms   min ${Math.min(...runs).toFixed(1).padStart(6)} ms   (runs ${runs.map(r => r.toFixed(0)).join(', ')})`);
  }
  const sheet = (label, mk, n) => { const c = []; for (let k = 0; k < n; k++) { const a = performance.now(); mk(k); c.push(performance.now() - a); } T[label] = med(c); lines.push(`${label.padEnd(44)} median ${med(c).toFixed(2).padStart(7)} ms over ${n}`); };
  const P = WARDEN_PRESETS;
  sheet('walkerSheet cold (new custom look each)', k => walkerSheet('warden', undefined, { custom: { skin: P.skin[k % 4], hairMat: P.hairMat[k % 6], hair: P.hair[(k >> 1) % 6], beard: !!(k & 1), eye: P.eye[k % 4] } }), 12);
  sheet('walkerSheet cold, late relic kit', k => walkerSheet(HERO_KEYS[k % 4], WALKER_KITS[HERO_KEYS[k % 4]][2][1], { custom: k > 3 ? { skin: P.skin[k % 4], hair: P.hair[k % 6] } : undefined }), 8);
  sheet('walkerSheet warm (cached)', () => walkerSheet('warden', undefined), 50);
  sheet('npcSheet cold', k => npcSheet('villager-' + k), 8);
  sheet('mapFoeSheet humanoid cold', k => mapFoeSheet(['cutpurse', 'bandit', 'tallyman', 'smuggler'][k % 4], { gearTier: (k >> 2) % 4, relic: k === 7 ? 'tallyknife' : undefined }), 8);
  sheet('mapFoeSheet beast cold (32x32)', k => mapFoeSheet(['rotstag', 'gloamwing', 'mirelord', 'rotwarden'][k % 4], { gearTier: 1 + (k >> 2) }), 8);
  sheet('objectSprite cold', k => objectSprite(OBJECT_KINDS[k % OBJECT_KINDS.length], 'closed', { frame: 1 }), OBJECT_KINDS.length);
  pre.textContent = lines.join('\n');
}

/* ---------- performance ---------- */
if (want('perf')) {
  const s = section('perf', 'Render cost', 'cold = first render of a new pose/gear (vector raster + compose); warm = a cached raster re-composed for a new t (what a 12 fps loop pays per sprite per frame). Median of repeated runs in this browser.');
  const pre = document.createElement('pre'); s.appendChild(pre);
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
  const lines = [];
  const bench = (label, cold, warm) => {
    const c = []; for (let k = 0; k < 3; k++) { const t0 = performance.now(); cold(k); c.push(performance.now() - t0); }
    const w = []; for (let k = 0; k < 24; k++) { const t0 = performance.now(); warm(k / 12); w.push(performance.now() - t0); }
    T['cold ' + label] = med(c); T['warm ' + label] = med(w);
    lines.push(`${label.padEnd(30)} cold ${med(c).toFixed(1).padStart(6)} ms   warm ${med(w).toFixed(2).padStart(6)} ms`);
  };
  const poses = ['hurt', 'ko', 'cast'];
  bench('hero warden 64x64', k => renderHero('warden', undefined, { pose: poses[k], t: 0, flip: true, custom: { hair: ['long', 'pony', 'crop'][k] } }), t => renderHero('warden', undefined, { pose: 'idle', t: t * .1 }));
  bench('hero with relics 64x64', k => renderHero('pip', { weapon: 'briarfang', head: 'thornwatch-hood', body: 'thornwatch-jerkin' }, { pose: poses[k], flip: true }), t => renderHero('pip', { weapon: 'briarfang', head: 'thornwatch-hood', body: 'thornwatch-jerkin' }, { pose: 'idle', t: t * .1 }));
  bench('humanoid foe bandit 64x64', k => renderFoe('bandit', { gearTier: k, pose: 'hurt', flip: true }), t => renderFoe('bandit', { gearTier: 1, t: t * .1 }));
  bench('briarling 48x48', k => renderFoe('briarling', { gearTier: k, pose: 'hurt', flip: true }), t => renderFoe('briarling', { t: t * .1 }));
  bench('thornhound 64x48', k => renderFoe('thornhound', { gearTier: k, pose: 'hurt', flip: true }), t => renderFoe('thornhound', { t: t * .1 }));
  bench('rotstag 64x64 (relic)', k => renderFoe('rotstag', { gearTier: k, pose: 'hurt', flip: true }), t => renderFoe('rotstag', { t }));
  bench('oldsnag 64x64 (relic)', k => renderFoe('oldsnag', { gearTier: k, pose: 'hurt', flip: true }), t => renderFoe('oldsnag', { t }));
  bench('briarmaw 96x96 (2 relics)', k => renderFoe('briarmaw', { phase: k + 1, pose: 'hurt', flip: true }), t => renderFoe('briarmaw', { phase: 2, t }));
  bench('backdrop 160x96', k => renderBackdrop(BACKDROP_KEYS[k], { w: 160 + k, h: 96, t: 0 }), t => renderBackdrop('verdant-wood', { t }));
  bench('item portrait 64 (relic)', k => itemPortrait({ kind: 'sword', rarity: 'heirloom', aspect: 'ember', seed: 900 + k }, { t: 0 }), t => itemPortrait('hearthbrand', { t }));
  bench('dice icon 20', k => diceIcon(20, { value: 3 + k, size: 20 + k }), t => diceIcon(20, { value: 1 + Math.floor(t * 19) }));
  pre.textContent = lines.join('\n');
}

/* ---------- raw recipes (sanity) ---------- */
if (want('raw') && only) {
  const s = section('raw', 'Raw recipes');
  const r = row(s);
  for (const k of Object.keys(RECIPE)) { try { fig(r, compose(renderItem(itemArt({ kind: k, rarity: 'runed', aspect: 'ember', seed: 1 }) || { r: k, p: {} }, 64)), 2, k); } catch (e) { console.error(k, e.message); } }
}
window.__done = true;
