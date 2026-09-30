// Who can carry what (moved out of rules/party.js in M4 so rules/forge.js can ask it too; party.js
// re-exports canUse). Pure; imports data only.

import { HEROES } from '../data/heroes.js';
import { ITEMS } from '../data/items.js';
import { RELICS } from '../data/relics.js';

const HERO_WORD = h => HEROES[h.id]?.name || h.id;

export function baseOf(item) {
  return RELICS[item.base] || ITEMS[item.base] || null;
}

export const handsOf = item => (RELICS[item.base]?.weapon?.hands || ITEMS[item.base]?.hands || 1);

// Can this hero use this item? Returns { ok, reason }.
export function canUse(hero, item) {
  const data = HEROES[hero.id];
  const base = item && baseOf(item);
  if (!data || !base) return { ok: false, reason: 'Unknown item' };
  if (item.shattered) return { ok: false, reason: 'Shattered. Hilda can reforge it.' };
  if (data.refuses?.kinds.includes(item.kind)) return { ok: false, reason: data.refuses.text };
  const slot = item.slot;
  if (slot === 'weapon' && !data.prof.weapons.includes(item.kind)) {
    return { ok: false, reason: item.kind === 'bow' ? `Bows need training. ${HERO_WORD(hero)} never learned.` : `${HERO_WORD(hero)} is not trained with ${item.kind}s.` };
  }
  if (slot === 'offhand' && !data.prof.offhand.includes(item.kind)) return { ok: false, reason: `${HERO_WORD(hero)} cannot use a ${item.kind}.` };
  if (slot === 'body' && !data.prof.armor.includes(item.kind)) return { ok: false, reason: `${HERO_WORD(hero)} cannot move in ${item.kind} armour.` };
  for (const [ab, need] of Object.entries(base.needs || {})) {
    if ((hero.base?.[ab] ?? 10) < need) return { ok: false, reason: `Needs ${ab} ${need}.` };
  }
  return { ok: true, reason: null };
}
