// Deeds (M4 spec §4.3): what a relic must do in your hands to awaken. Every relic names three of
// these in RELICS[id].deeds; rules/gauntlet.js resolveBattle and the Rout path mark them done on the
// item (item.deeds[id] = day). One deed kindles a relic; all three, and Hilda's rite, awaken it.
// Owner: P1 (M4).

import { deepFreeze } from '../core/freeze.js';

const D = (id, name, text) => ({ id, name, text });

export const DEEDS = deepFreeze({
  'first-blood': D('first-blood', 'First Blood', 'Win a fight with it.'),
  'fell-holder': D('fell-holder', 'Holder Felled', 'Win a fight against a Relic-Bearer or a named holder.'),
  'fell-champion': D('fell-champion', 'Champion Felled', 'Win a fight against a Champion.'),
  'legend-strike': D('legend-strike', 'Legend Strike', 'Its bearer rolls a natural 20.'),
  surge: D('surge', 'Surge', 'Its Legend Surge fires.'),
  claim: D('claim', 'Pried Loose', 'A relic is pried loose in a fight it is in.'),
  rout: D('rout', 'Rout', 'Rout a pack while it is equipped.'),
  settle: D('settle', 'Grudge Settled', 'Settle a Grudge.'),
  brand: D('brand', 'Branded', 'Earn a Brand while it is equipped.'),
  hundred: D('hundred', 'Fifty Felled', 'Fifty foes fall to its bearer.'),
  untouched: D('untouched', 'Untouched', 'Win a fight at Waking 2 or more with no hero knocked out.'),
});

export const DEED_IDS = Object.freeze(Object.keys(DEEDS));

// Branch a (the Hand) opens for a bearer whose best Domain is one of these; branch b (the Heart) for
// the rest (craft, knowledge, influence, attunement, psionics).
export const HAND_DOMAINS = Object.freeze(['physical', 'combat', 'survival', 'beastmastery']);
