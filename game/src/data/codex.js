// The Hearth Codex binder (M4 spec §4.4): one page per region. A page is finished when every relic on
// it is Claimed; its reward is a permanent bonus for every hero (rules/codex.js pageBonus). Relics
// belong to a page by their Codex number: a page gives its range (`from` and `to`), or lists its numbers (`nos`, M7:
// Page V holds No. 000 and Nos. 67-74). Sealed pages show their region's name and a padlock.
// Owner: P1 (M4, M5, M6, M7).

import { deepFreeze } from '../core/freeze.js';

const P = (id, no, region, name, from, to, reward) => ({ id, no, region, name, from, to, reward });

export const PAGES = deepFreeze([
  P('verdant', 'I', 'verdant', 'The Verdant Wilds', 1, 24,
    { id: 'verdant-oath', name: 'The Verdant Oath', text: '+5% max HP for every hero.', stats: { hpPct: 5 } }),
  P('sunscorch', 'II', 'sunscorch', 'The Sunscorch Wastes', 25, 38,
    { id: 'sunscorch-compact', name: 'The Sunscorch Compact', text: '+1 to hit and 10% ember resist for every hero.', stats: { hit: 1, resist: { ember: 10 } } }),
  P('ironspire', 'III', 'ironspire', 'The Ironspire Peaks', 39, 52,
    { id: 'ironspire-accord', name: 'The Ironspire Accord', text: '+1 Guard and 10% frost resist for every hero.', stats: { guard: 1, resist: { frost: 10 } } }),
  P('gloomfen', 'IV', 'gloomfen', 'The Gloomfen Marsh', 53, 66,
    { id: 'gloomfen-covenant', name: 'The Gloomfen Covenant', text: '+10% healing and 10% blight resist for every hero.', stats: { healBonus: 10, resist: { blight: 10 } } }),
  // M7 (spec §3.4, §4.6): Page V lists its numbers. STUB from the M7 scaffold: `saves` (+1 to every save) is the
  // reward's stat key until P1 reads it in rules/stats.js
  { id: 'below', no: 'V', region: 'below', name: 'The Hearth Below', nos: [0, 67, 68, 69, 70, 71, 72, 73, 74],
    reward: { id: 'hearthkeepers-oath', name: 'The Hearthkeeper\'s Oath', text: '+1 to every save and 5% resist to every aspect for every hero.',
      stats: { saves: 1, resist: { ember: 5, frost: 5, storm: 5, stone: 5, verdant: 5, tide: 5, radiant: 5, blight: 5 } } } },
]);

export const PAGE_IDS = Object.freeze(PAGES.map(p => p.id));
