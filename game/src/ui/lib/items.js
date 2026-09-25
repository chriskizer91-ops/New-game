// Item words for the UI: names, type lines, main stats in D&D terms, affix rows, powers,
// provenance ribbons, and the green/red verdicts for the "Equip on" picker.
import { RELICS, SETS } from '../../data/relics.js';
import { ITEMS } from '../../data/items.js';
import { SKILLS } from '../../data/skills.js';
import { RARITY } from '../../data/rarity.js';
import { itemProfile, POWERS } from '../../rules/stats.js';
import { affixText, affixQuality } from '../../rules/loot.js';
import { compare, wearerOf } from '../../rules/party.js';
import { esc, fmt } from './dom.js';
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

const enchantOf = item => (RARITY[item.rarity]?.enchant || 0) + Math.floor((item.temper || 0) / 2);
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
  const bits = [`${rarityName(item.rarity)} ${kind}`];
  if (item.aspect) bits.push(ASPECT_NAME[item.aspect]);
  bits.push(SLOT_NAME[item.slot]);
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
    // the weapon's own bonus: a relic's fixed numbers, or the rarity enchant (affixes list their own)
    const ench = relic ? 0 : enchantOf(item);
    const hit = relic ? relic.stats?.hit || 0 : ench, dmg = relic ? relic.stats?.dmg || 0 : ench;
    if (hit || dmg) sub.push(hit === dmg ? `+${hit} to hit and damage` : [hit ? `+${hit} to hit` : '', dmg ? `+${dmg} damage` : ''].filter(Boolean).join(', '));
    return { k: 'Damage', v, sub: sub.join(' · '), used: relic ? ['hit', 'dmg'] : [] };
  }
  if (P.armor) {
    const a = P.armor, g = relic ? relic.stats?.guard || 0 : enchantOf(item) + (ITEMS[item.base]?.stats?.guard || 0);
    const v = `${a.base} + DEX${a.maxDex < 9 ? ` <span class="dw">(max ${a.maxDex})</span>` : ''}${g ? ` <em>+${g}</em>` : ''}`;
    return { k: 'Guard', v, sub: ARMOR_WORD[a.type] || '', used: ['guard'] };
  }
  if (item.kind === 'shield') {
    const g = relic ? relic.stats?.guard || 0 : enchantOf(item) + (ITEMS[item.base]?.stats?.guard || 0);
    return { k: 'Guard', v: `+${g}`, sub: `Shield${enchantOf(item) && !relic ? ` · ${rarityName(item.rarity)} make +${enchantOf(item)}` : ''}`, used: ['guard'] };
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
  if (relic) {
    const s = { ...(relic.stats || {}) };
    for (const k of main.used || []) delete s[k];
    if (item.slot !== 'weapon' && !P?.armor && !(item.kind === 'shield')) {
      // the first line already sits in the main stat box
      const lines = statLines(s); lines.shift();
      for (const t of lines) rows.push({ text: t, plain: true });
    } else for (const t of statLines(s)) rows.push({ text: t, plain: true });
    return rows;
  }
  const base = ITEMS[item.base];
  if (base?.stats) {
    const s = { ...base.stats }; for (const k of main.used || []) delete s[k];
    const lines = statLines(s);
    if (item.slot !== 'weapon' && !P?.armor && item.kind !== 'shield') lines.shift();
    for (const t of lines) rows.push({ text: t, plain: true });
  }
  const ench = RARITY[item.rarity]?.enchant || 0;
  if (ench && item.slot !== 'weapon' && item.slot !== 'body' && item.kind !== 'shield') rows.push({ text: `+${ench * 3} max HP (${rarityName(item.rarity)} make)`, plain: true });
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
  const c = compare(hero, item, game.inventory);
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
