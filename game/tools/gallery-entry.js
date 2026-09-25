// Gallery page for reviewing the art layer (bundled by tools/gallery.mjs). Not part of the game build.
import { renderItem, RECIPE } from '../src/art/recipes.js';
import { compose } from '../src/art/forge.js';
import { renderFoe, FOE_ART } from '../src/art/foes.js';
import { ITEMS } from '../src/data/items.js';
import { diceIcon, DICE, statusIcon, STATUS_KEYS, aspectIcon, gripIcon, digitsImage } from '../src/art/icons.js';
import { renderBackdrop, backdropLayers, BACKDROP_KEYS, BACKDROPS } from '../src/art/scenes.js';
import { renderHero, heroBust, HERO_KEYS, HERO_ART, WARDEN_PRESETS } from '../src/art/hero-looks.js';
import { RELIC_ART, RELIC_IDS, RARITY_ORDER, RARITY_LOOK, ASPECTS, itemArt, itemPortrait, itemIcon, cardCorner, ITEM_KINDS } from '../src/art/item-looks.js';

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
