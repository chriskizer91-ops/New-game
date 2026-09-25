// The nine Accretion Domains from the user's character sheet (aethermoor-character-sheet-4.html).
// Imprint Bonus by domain level: L1-4 +2, L5-8 +3, L9-12 +4, L13-16 +5, L17-20 +6.
// Imprint DC = 8 + IB + the domain's ability modifier.

import { deepFreeze } from '../core/freeze.js';

export const DOMAINS = deepFreeze({
  physical: { id: 'physical', name: 'Physical Mastery', ability: 'STR', paths: ['power', 'speed', 'fortitude'] },
  combat: { id: 'combat', name: 'Predation & Conflict', ability: 'STR', paths: ['precision', 'aggression', 'control'] },
  survival: { id: 'survival', name: 'Survival & Adaptation', ability: 'WIS', paths: ['scout', 'forager', 'shadow'] },
  craft: { id: 'craft', name: 'Craft & Creation', ability: 'INT', paths: ['forge', 'alchemy', 'construction'] },
  knowledge: { id: 'knowledge', name: 'Knowledge & Research', ability: 'INT', paths: [] },
  influence: { id: 'influence', name: 'Influence & Social Mastery', ability: 'CHA', paths: [] },
  attunement: { id: 'attunement', name: 'Attunement (Magical Affinity)', ability: 'WIS', paths: [] },
  psionics: { id: 'psionics', name: 'Psionics & Mental Mastery', ability: 'INT', paths: [] },
  beastmastery: { id: 'beastmastery', name: 'Beastmastery & Bonding', ability: 'WIS', paths: [] },
});

export const DOMAIN_IDS = Object.freeze(Object.keys(DOMAINS));
