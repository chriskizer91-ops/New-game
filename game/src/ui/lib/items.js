// Item words for the UI: names, type lines, main stats in D&D terms, affix rows, powers,
// provenance ribbons, and the green/red verdicts for the "Equip on" picker.
// Enchant (M3 spec D10, mirroring rules/stats.js): the rarity make for generated gear (relics carry
// their own numbers) plus the temper at 1:1. A weapon adds it to hit and damage, body armour and
// shields to Guard, everything else 3 max HP per point.
// M4 (spec §5.1, §5.3; owner P7a): the forge words shared by the card, the forge sheet, the shops, the
// spoils and the aftermath: sockets and gems (socketList, gemText, blockLines), the stage and deeds of a
// relic (stageInfo, kindledText), the Chronicle (chronicleOf), costs and counts (costText, countsText),
// and small gem and material icons (gemIconEl, matIconEl: the art's gemIcon/materialIcon when
// src/art has them, else a CSS stand-in in the gem's colour). verdict() compares with the Codex
// pages' party bonus, as the Party screen shows it.
// Owner: WP8 (M3), P7a (M4).
import { RELICS, SETS } from '../../data/relics.js';
import { ITEMS } from '../../data/items.js';
import { SKILLS } from '../../data/skills.js';
import { RARITY } from '../../data/rarity.js';
import { HEROES } from '../../data/heroes.js';
import { GEMS, MATERIALS } from '../../data/gems.js';
import { TUNING } from '../../data/tuning.js';
import { itemProfile, POWERS } from '../../rules/stats.js';
import { affixText, affixQuality } from '../../rules/loot.js';
import { compare, wearerOf } from '../../rules/party.js';
import { socketsOf } from '../../rules/forge.js';
import { stageOf, deedsOf, pageBonus } from '../../rules/codex.js';
import * as Art from '../../art/index.js';
import { el, esc, fmt, toCanvas } from './dom.js';
import { rarityName } from './art.js';

export const SLOT_NAME = { weapon: 'Weapon', offhand: 'Off-hand', head: 'Head', body: 'Body', hands: 'Hands', feet: 'Feet', amulet: 'Amulet', ring: 'Ring' };
export const KIND_NAME = {
  sword: 'Sword', dagger: 'Dagger', axe: 'Axe', hammer: 'Hammer', mace: 'Mace', spear: 'Spear', bow: 'Bow', staff: 'Staff',
  shield: 'Shield', focus: 'Focus', hood: 'Hood', coif: 'Coif', kettle: 'Kettle Helm', helm: 'Helm', circlet: 'Circlet', crown: 'Crown',
  robe: 'Robe', leather: 'Leather Armour', mail: 'Mail', plate: 'Plate', gloves: 'Gloves', gauntlets: 'Gauntlets', boots: 'Boots', amulet: 'Amulet', ring: 'Ring',
};
export const ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
export const ABIL_NAME = { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' };
export const DMG_WORD = { slash: 'slashing', pierce: 'piercing', crush: 'crushing' };
export const ASPECT_NAME = { ember: 'Ember', frost: 'Frost', storm: 'Storm', stone: 'Stone', verdant: 'Verdant', tide: 'Tide', radiant: 'Radiant', blight: 'Blight' };
const ARMOR_WORD = { none: 'Cloth', hide: 'Hide armour', mail: 'Mail armour', plate: 'Plate armour', chitin: 'Chitin' };

export const isRelic = item => !!RELICS[item?.base];
export const relicOf = item => RELICS[item?.base] || null;
export const RELIC_TOTAL = Object.keys(RELICS).length;
const pad3 = n => String(n).padStart(3, '0');
export const codexNo = relic => `No. ${pad3(relic.codex)} / ${pad3(RELIC_TOTAL)}`;

export const temperOf = item => Math.max(0, item?.temper || 0);
const makeOf = item => (isRelic(item) ? 0 : RARITY[item.rarity]?.enchant || 0);
export const enchantOf = item => makeOf(item) + temperOf(item);
export const critText = c => (c <= 1 ? '20' : `${21 - c}-20`);

// Split "Ashwick, the Quiet Oath" into a name and an epithet.
export function nameParts(item) {
  if (item.unidentified) return { name: `Unidentified ${KIND_NAME[item.kind] || 'Relic'}`, epithet: 'Its story is still asleep.' };
  const m = /^([^,]+), (the .+)$/.exec(item.name || '');
  return m ? { name: m[1], epithet: m[2] } : { name: item.name, epithet: null };
}

export function typeLine(item) {
  const base = ITEMS[item.base];
  const kind = base && !isRelic(item) ? base.name : (KIND_NAME[item.kind] || item.kind);
  const bits = [`${rarityName(item.rarity)} ${kind}${temperOf(item) ? ` +${temperOf(item)}` : ''}`];
  if (item.aspect) bits.push(ASPECT_NAME[item.aspect]);
  // Amulets and rings are their own slot; saying it twice reads as a bug.
  if (SLOT_NAME[item.slot] && SLOT_NAME[item.slot] !== kind) bits.push(SLOT_NAME[item.slot]);
  return bits.join(' · ');
}

// Plain-language lines for a stats block (data stats or an itemProfile accumulator).
export function statLines(stats = {}, { skip = [] } = {}) {
  const out = [];
  const n = v => (v >= 0 ? '+' : '−') + Math.abs(v);
  const W = {
    hp: v => `${n(v)} max HP`, mp: v => `${n(v)} MP`, guard: v => `${n(v)} Guard`, hit: v => `${n(v)} to hit`, dmg: v => `${n(v)} damage`,
    speed: v => `${n(v)} speed`, crit: v => `Legend Strike on ${critText(1 + v)}`, regen: v => `Regrow ${v} HP each turn`,
    regenPct: v => `Regrow ${v}% of max HP each turn`, mpRegen: v => `${n(v)} MP each turn`, healBonus: v => `${n(v)}% healing done`,
    surgeGain: v => `${n(v)}% Legend Surge gain`, gripDmg: v => `${n(v)} grip damage`, ambushImmune: () => 'The party cannot be ambushed',
  };
  for (const [k, v] of Object.entries(stats)) {
    if (skip.includes(k) || v == null) continue;
    if (k === 'resist' || k === 'abilities') continue;
    if (ABIL.includes(k)) { if (v) out.push(`${n(v)} ${ABIL_NAME[k]}`); continue; }
    if (typeof v === 'number' && v && W[k]) out.push(W[k](v));
  }
  for (const [a, v] of Object.entries(stats.abilities || {})) if (v) out.push(`${n(v)} ${ABIL_NAME[a]}`);
  for (const [a, v] of Object.entries(stats.resist || {})) if (v) out.push(`Resist ${a} ${v}%`);
  return out;
}

// The headline number, in D&D terms: weapon dice, armour Guard, or the item's main bonus.
export function mainStat(item) {
  const P = itemProfile(item);
  if (!P) return { k: 'Item', v: esc(item.name), sub: '' };
  const relic = P.relic;
  if (P.weapon) {
    const w = P.weapon;
    let v = `${w.dice} <span class="dw">${DMG_WORD[w.dmg] || w.dmg}</span>`;
    for (const e of [...w.extra, ...P.stats.extra]) v += ` + ${e.dice} <em class="asp asp-${e.aspect}">${e.aspect}</em>`;
    const sub = [w.hands === 2 ? 'Two-handed' : w.versatile ? `Versatile (${w.versatile} with both hands)` : 'One-handed'];
    if (w.ranged) sub.push('ranged');
    if (w.weight <= -10) sub.push('quick'); else if (w.weight >= 15) sub.push('heavy');
    // the weapon's own bonus: a relic's fixed numbers or the rarity make, plus the temper (affixes list their own)
    const ench = enchantOf(item);
    const hit = (relic ? relic.stats?.hit || 0 : 0) + ench, dmg = (relic ? relic.stats?.dmg || 0 : 0) + ench;
    if (hit || dmg) sub.push(hit === dmg ? `+${hit} to hit and damage` : [hit ? `+${hit} to hit` : '', dmg ? `+${dmg} damage` : ''].filter(Boolean).join(', '));
    return { k: 'Damage', v, sub: sub.join(' · '), used: relic ? ['hit', 'dmg'] : [] };
  }
  if (P.armor) {
    const a = P.armor, g = (relic ? relic.stats?.guard || 0 : ITEMS[item.base]?.stats?.guard || 0) + enchantOf(item);
    const v = `${a.base} + DEX${a.maxDex < 9 ? ` <span class="dw">(max ${a.maxDex})</span>` : ''}${g ? ` <em>+${g}</em>` : ''}`;
    return { k: 'Guard', v, sub: ARMOR_WORD[a.type] || '', used: ['guard'] };
  }
  if (item.kind === 'shield') {
    const g = (relic ? relic.stats?.guard || 0 : ITEMS[item.base]?.stats?.guard || 0) + enchantOf(item);
    const bits = [makeOf(item) ? `${rarityName(item.rarity)} make +${makeOf(item)}` : '', temperOf(item) ? `tempered +${temperOf(item)}` : ''].filter(Boolean);
    return { k: 'Guard', v: `+${g}`, sub: ['Shield', ...bits].join(' · '), used: ['guard'] };
  }
  const lines = statLines(relic ? relic.stats : ITEMS[item.base]?.stats || {});
  return { k: 'Bonus', v: esc(lines[0] || 'None'), sub: '', used: [] };
}

// Rows under the main stat: rolled affixes (with quality stars) or a relic's fixed traits.
export function traitRows(item) {
  const rows = [];
  const P = itemProfile(item);
  const relic = relicOf(item);
  const main = mainStat(item);
  const hpSlot = item.slot !== 'weapon' && item.slot !== 'body' && item.kind !== 'shield';
  const tempered = temperOf(item);
  if (relic) {
    const s = { ...(relic.stats || {}) };
    for (const k of main.used || []) delete s[k];
    if (item.slot !== 'weapon' && !P?.armor && !(item.kind === 'shield')) {
      // the first line already sits in the main stat box
      const lines = statLines(s); lines.shift();
      for (const t of lines) rows.push({ text: t, plain: true });
    } else for (const t of statLines(s)) rows.push({ text: t, plain: true });
    if (tempered && hpSlot) rows.push({ text: `+${tempered * 3} max HP (tempered +${tempered})`, plain: true });
    return rows;
  }
  const base = ITEMS[item.base];
  if (base?.stats) {
    const s = { ...base.stats }; for (const k of main.used || []) delete s[k];
    const lines = statLines(s);
    if (item.slot !== 'weapon' && !P?.armor && item.kind !== 'shield') lines.shift();
    for (const t of lines) rows.push({ text: t, plain: true });
  }
  const ench = makeOf(item);
  if (ench && hpSlot) rows.push({ text: `+${ench * 3} max HP (${rarityName(item.rarity)} make)`, plain: true });
  if (tempered && hpSlot) rows.push({ text: `+${tempered * 3} max HP (tempered +${tempered})`, plain: true });
  for (const a of item.affixes || []) {
    if (item.unidentified) { rows.push({ text: '???', stars: 0, hidden: true }); continue; }
    const text = affixText(a);
    if (text) rows.push({ text, stars: affixQuality(a, item.rarity, item.ilvl) });
  }
  return rows;
}

// The Legend Surge power, any granted Art, and the map power.
export function powersOf(item) {
  const P = itemProfile(item);
  const relic = relicOf(item);
  const out = { power: null, arts: [], map: relic?.mapPower || null };
  if (P?.power && POWERS[P.power]) out.power = POWERS[P.power];
  for (const g of P?.grants || []) if (SKILLS[g]) out.arts.push(SKILLS[g]);
  return out;
}

export function setInfo(item, game, heroId) {
  const relic = relicOf(item);
  if (!relic?.set) return null;
  const S = SETS[relic.set];
  const worn = new Set();
  if (game && heroId) {
    const h = game.party.roster[heroId];
    const byUid = Object.fromEntries(game.inventory.map(i => [i.uid, i]));
    for (const uid of Object.values(h.gear)) if (uid && byUid[uid]) worn.add(byUid[uid].base);
    worn.add(item.base); // counting this piece as worn by the hero it would go to
  }
  return { set: S, have: S.pieces.filter(p => worn.has(p)), pieces: S.pieces.map(p => ({ id: p, name: RELICS[p].name, on: worn.has(p) })) };
}

export function provenanceText(item, source) {
  const p = item.provenance || {};
  const from = p.from || 'the road';
  let lead;
  if (/reliquary/i.test(from)) lead = 'Taken down from the Keep reliquary';
  else if (/'s pack$/.test(from)) lead = `From ${from}`;
  else if (item.shattered) lead = `Shattered on ${from}`;
  else if (source === 'claimed' || (isRelic(item) && source !== 'drop')) lead = `Pried from ${from}`;
  else lead = `Taken from ${from}`;
  return [lead, p.where, p.day ? `Day ${p.day}` : null].filter(Boolean).join(' · ');
}

// ▲/▼ verdict for the picker: the stat that matters most for this slot.
export function verdict(game, heroId, item) {
  const hero = game.party.roster[heroId];
  const w = wearerOf(game, item.uid);
  if (w && w.heroId === heroId) return { cls: 'on', text: 'Equipped' };
  const c = compare(hero, item, game.inventory, pageBonus(game));
  if (!c.ok) return { cls: 'cant', text: "Can't use", reason: c.reason };
  const d = c.deltas;
  const order = item.slot === 'weapon' ? [['dmg', 'DMG'], ['hit', 'HIT'], ['guard', 'GRD'], ['hp', 'HP'], ['speed', 'SPD'], ['mp', 'MP'], ['crit', 'CRIT']]
    : [['guard', 'GRD'], ['hp', 'HP'], ['dmg', 'DMG'], ['hit', 'HIT'], ['speed', 'SPD'], ['mp', 'MP'], ['crit', 'CRIT']];
  for (const [k, label] of order) {
    const v = d[k];
    if (v) return { cls: v > 0 ? 'up' : 'down', text: `${v > 0 ? '▲' : '▼'} ${fmt(Math.abs(v))} ${label}`, cmp: c };
  }
  return { cls: '', text: 'No change', cmp: c };
}

export const CMP_ROWS = [
  ['dmg', 'Damage / hit', v => fmt(v)], ['hit', 'Attack', v => (v >= 0 ? '+' : '') + v], ['guard', 'Guard', v => String(v)],
  ['hp', 'Hit points', v => String(v)], ['mp', 'MP', v => String(v)], ['speed', 'Speed', v => String(v)], ['crit', 'Legend Strike on', critText],
];

// ---- M4: the forge words (spec §4.2-§4.5, §5.1, §5.3) ---------------------------------------------------

export const TEMPER_STEPS = TUNING.temper.max; // the flames on a card: +1 to +10

// An item's sockets: a gem id, or null for an empty socket, for each socket it has.
export function socketList(item) {
  const n = item ? socketsOf(item) : 0;
  const list = Array.isArray(item?.gems) ? item.gems : [];
  return Array.from({ length: n }, (_, i) => (GEMS[list[i]] ? list[i] : null));
}

// Plain-language lines for a stats block that may also carry the dice keys of affixes (a gem's stats,
// an Awakened branch's): "+1d4 ember damage on hit", then statLines for the rest.
export function blockLines(stats) {
  if (!stats || typeof stats !== 'object') return [];
  const { extraDice, vsHurt, vsUnaware, aspect, ...rest } = stats;
  const out = [];
  if (extraDice > 0) out.push(`+1d${extraDice * 2}${aspect ? ` ${aspect}` : ''} damage on hit`);
  if (vsHurt > 0) out.push(`+1d${vsHurt * 2} damage vs foes at half HP or less`);
  if (vsUnaware > 0) out.push(`+1d${vsUnaware * 2} damage vs marked, rooted, frozen or staggered foes`);
  return [...out, ...statLines(rest)];
}

// What a gem does set in this slot (rules/stats.js): a weapon takes its `weapon` stats, anything else
// its `other` stats.
export const gemStats = (gemId, slot) => (slot === 'weapon' ? GEMS[gemId]?.weapon : GEMS[gemId]?.other) || {};
export const gemText = (gemId, slot) => blockLines(gemStats(gemId, slot)).join(', ');
export const gemBothText = gemId => `In a weapon: ${gemText(gemId, 'weapon')}. In anything else: ${gemText(gemId, 'other')}.`;
export const gemName = (gemId, n = 1) => `${GEMS[gemId]?.name || gemId}${n === 1 ? '' : 's'}`;

// A Kindled relic's bonus (rules/stats.js itemProfile): to hit on a weapon, Guard on body armour and
// shields, max HP on the rest.
export function kindledText(item) {
  const K = TUNING.forge.kindled;
  const kind = RELICS[item?.base]?.kind || item?.kind;
  if (item?.slot === 'weapon') return `+${K.hit} to hit`;
  if (item?.slot === 'body' || (item?.slot === 'offhand' && kind === 'shield')) return `+${K.guard} Guard`;
  return `+${K.hp} max HP`;
}

// A relic's stage and deeds, for the card and the forge; null for anything that is not a relic.
// { stage, deeds: [{ id, name, text, done, day }], done, total, ready, branch, line }
// line: "Dormant · 0 of 3 deeds", "Kindled · 2 of 3 deeds", "Kindled · 3 of 3 deeds · Hilda can wake it",
// "Awakened · Sunmarrow".
export function stageInfo(item) {
  const stage = stageOf(item);
  if (!stage) return null;
  const deeds = deedsOf(item).map(d => ({ ...d, day: Number(item.deeds?.[d.id]) || null }));
  const done = deeds.filter(d => d.done).length, total = deeds.length;
  const b = stage === 'awakened' ? RELICS[item.base].awaken[item.awakened] : null;
  const branch = b ? { id: item.awakened, name: b.name, text: b.text, stats: b.stats || {} } : null;
  const ready = !branch && total > 0 && done === total;
  const line = branch ? `Awakened · ${branch.name}`
    : `${stage === 'kindled' ? 'Kindled' : 'Dormant'} · ${done} of ${total} deeds${ready ? ' · Hilda can wake it' : ''}`;
  return { stage, deeds, done, total, ready, branch, line };
}

export const heroName = (game, id) => game?.party?.roster?.[id]?.name || HEROES[id]?.name || String(id);

// The back of the card (spec §5.3): foes felled, the mightiest kill, and everyone who has carried it.
// Every field may be missing on an older save: bearers then start with whoever wears it now.
export function chronicleOf(game, item) {
  const c = item?.chronicle && typeof item.chronicle === 'object' ? item.chronicle : {};
  const ids = Array.isArray(c.bearers) ? c.bearers.filter(id => typeof id === 'string') : [];
  const w = game?.party?.roster && item ? wearerOf(game, item.uid) : null;
  if (w && !ids.includes(w.heroId)) ids.push(w.heroId);
  const m = c.mightiest && typeof c.mightiest === 'object' && c.mightiest.name
    ? { name: String(c.mightiest.name), level: Number(c.mightiest.level) || null } : null;
  return { kills: Math.max(0, Number(c.kills) || 0), mightiest: m, bearers: [...new Set(ids)].map(id => heroName(game, id)), wearer: w ? w.heroId : null };
}

// Forge costs and counts in words: "120 gold + 1 silver", "+2 scrap, +1 silver", "+1 Ash Garnet".
export const matWord = (k, n) => (k === 'embers' && n === 1 ? 'ember' : (MATERIALS[k]?.name || k).toLowerCase());
export function costText(cost) {
  if (!cost) return '';
  const bits = [];
  if (cost.gold) bits.push(`${cost.gold} gold`);
  for (const [k, n] of Object.entries(cost.materials || {})) if (n) bits.push(`${n} ${matWord(k, n)}`);
  return bits.join(' + ') || 'Free';
}
export function countsText(counts, { gems = false, sign = '+' } = {}) {
  return Object.entries(counts || {}).filter(([, n]) => n > 0)
    .map(([k, n]) => `${sign}${n} ${gems ? gemName(k, n) : matWord(k, n)}`).join(', ');
}

// Small pixel icons for gems, materials and temper flames. A gem or a material uses the art's gemIcon /
// materialIcon when src/art/index.js exports them (P6); until then (or if one throws) a stand-in drawn
// here: a cut stone in the gem's colour, a chip of scrap, a silver bar, a live coal. `box` is the CSS
// size in px, reached by whole pixel steps.
function artIcon(name, id, box) {
  const fn = Art[name];
  if (typeof fn !== 'function') return null;
  try {
    const img = fn(id, { size: box });
    if (!img || !img.width || !img.height) return null;
    const cv = typeof img.getContext === 'function' ? img : toCanvas(img);
    const k = Math.max(1, Math.floor(box / Math.max(img.width, img.height)));
    cv.style.width = img.width * k + 'px';
    cv.style.height = img.height * k + 'px';
    cv.classList.add('px');
    return cv;
  } catch { return null; }
}

const hexRgb = h => { const n = parseInt(String(h).replace('#', ''), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const shade = (rgb, k) => rgb.map(v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
const pixCache = new Map();
// A tiny sprite from rows of palette digits ('.' is clear), as ImageData (cached by key).
function pixImage(key, rows, pal) {
  if (!pixCache.has(key)) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length, d = new Uint8ClampedArray(w * h * 4);
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      const c = pal[ch];
      if (!c) return;
      const i = (y * w + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }));
    pixCache.set(key, new ImageData(d, w, h));
  }
  return pixCache.get(key);
}
function pixCanvas(img, box) {
  const k = Math.max(1, Math.floor(box / Math.max(img.width, img.height)));
  const cv = toCanvas(img, null, k);
  cv.setAttribute('aria-hidden', 'true');
  return cv;
}

const GEM_ROWS = ['.111111.', '12233221', '12344321', '.123321.', '..1221..', '...11...'];
const MAT_ROWS = {
  scrap: ['..11....', '.1221.1.', '1233212.', '.123321.', '..12221.', '.12222.1', '..1111..'],
  silver: ['...1111..', '..133331.', '.12333321', '122222221', '.1111111.'],
  embers: ['..1111..', '.123321.', '12344321', '12344321', '.123321.', '..1111..'],
};
const MAT_PAL = {
  scrap: { 1: [58, 46, 38], 2: [120, 104, 88], 3: [176, 160, 136] },
  silver: { 1: [72, 78, 92], 2: [168, 178, 196], 3: [236, 242, 250] },
  embers: { 1: [90, 29, 10], 2: [200, 64, 26], 3: [238, 142, 49], 4: [255, 241, 176] },
};
export function gemIconEl(gemId, box = 20) {
  const n = artIcon('gemIcon', gemId, box) || (() => {
    const c = hexRgb(GEMS[gemId]?.color || '#c8c0b0');
    const pal = { 1: shade(c, -0.55), 2: shade(c, -0.2), 3: c, 4: shade(c, 0.6) };
    return pixCanvas(pixImage(`gem:${gemId}`, GEM_ROWS, pal), box);
  })();
  n.classList.add('gem-i');
  n.dataset.gem = gemId;
  n.setAttribute('aria-hidden', 'true');
  return n;
}
export function matIconEl(matId, box = 18) {
  const n = artIcon('materialIcon', matId, box) || pixCanvas(pixImage(`mat:${matId}`, MAT_ROWS[matId] || MAT_ROWS.scrap, MAT_PAL[matId] || MAT_PAL.scrap), box);
  n.classList.add('mat-i');
  n.dataset.mat = matId;
  n.setAttribute('aria-hidden', 'true');
  return n;
}

// One temper flame: 'off' (a dark coal), 'on' (+1 to +6), 'hot' (+7 to +9, white-hot at the core),
// 'white' (+10), 'next' (the step Hilda would add). flameState(i, temper) picks one for flame i (0-9).
const FLAME_ROWS = ['...1...', '..11...', '..121..', '.1221..', '.12221.', '122321.', '1223321', '1233321', '.12321.', '..111..'];
const FLAME_PAL = {
  off: { 1: [70, 52, 40], 2: [44, 32, 25], 3: [36, 26, 20] },
  on: { 1: [164, 82, 26], 2: [238, 142, 49], 3: [255, 203, 102] },
  hot: { 1: [216, 106, 28], 2: [255, 176, 74], 3: [255, 246, 214] },
  white: { 1: [154, 180, 255], 2: [232, 240, 255], 3: [255, 255, 255] },
  next: { 1: [255, 203, 102], 2: [58, 40, 26], 3: [80, 54, 30] },
};
export const flameState = (i, temper) => (i >= temper ? 'off' : temper >= TEMPER_STEPS && i === TEMPER_STEPS - 1 ? 'white' : i >= 6 ? 'hot' : 'on');
export function flameEl(state = 'off', box = 20) {
  const cv = pixCanvas(pixImage(`flame:${state}`, FLAME_ROWS, FLAME_PAL[state] || FLAME_PAL.off), box);
  cv.classList.add('flame', `fl-${state}`);
  return cv;
}
// A row of ten flames for `temper` (+0 to +10); `next` marks the flame the next step lights.
export function flamesEl(temper, { next = false, box = 20, cls = '' } = {}) {
  const t = Math.max(0, Math.min(TEMPER_STEPS, temper || 0));
  const row = el('span', { class: `flames${cls ? ` ${cls}` : ''}${t >= 7 ? ' hot' : ''}`, role: 'img', 'aria-label': `Tempered +${t} of +${TEMPER_STEPS}` });
  for (let i = 0; i < TEMPER_STEPS; i++) row.append(flameEl(next && i === t ? 'next' : flameState(i, t), box));
  return row;
}
