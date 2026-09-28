// Quests and bounties (M3 spec §3.6, §4.4). Quest state is derived from conditions; only
// flags.quests[id] = 'claimed' is stored.
//
// QUESTS[id] = { id, name, kind: 'main'|'side', giver, start: cond,
//                steps: [{ text, done: cond, target: { map, entity } }], reward: { gold?, relic?, item?, set? } }
// BOUNTIES[id] = { id, enc, name, gold }    posted on the Thornhollow board, turned in to Dael;
//                                           complete once { beaten: enc }
// Owner: WP3S.

import { deepFreeze } from '../core/freeze.js';

const step = (text, done, map, entity) => ({ text, done, target: { map, entity } });

export const QUESTS = deepFreeze({
  'hearth-gutters': {
    id: 'hearth-gutters', name: 'The Hearth Gutters', kind: 'main', giver: 'isolde', start: { flag: 'intro-done' },
    steps: [
      step('Stop Sneck at the vault door.', { done: 'keep-vault' }, 'keep-hall', 'keep-vault'),
      step('Reach Thornhollow and find Captain Dael.', { flag: 'met-dael' }, 'thornhollow', 'dael'),
      step('Name the beast on Dael\'s board.', { brand: 'brand-of-briars' }, 'briarmaw-den', 'briarmaw-den'),
      step('Hear Miravel out about the Rot.', { flag: 'met-miravel-rot' }, 'eldergrove', 'miravel'),
      step('Go down into the Heartroot.', { brand: 'brand-of-the-heartroot' }, 'heartroot-2', 'rotwarden-heart'),
      step('Come home to the Keep.', { flag: 'council-done' }, 'keep-hall', 'isolde'),
    ],
    reward: {}, // the 300 gold is paid by Dael's dialogue at the Brand
  },
  'lights-at-midnight': {
    id: 'lights-at-midnight', name: 'Lights at Midnight', kind: 'side', giver: 'garret', start: { flag: 'met-garret' },
    steps: [
      step('Stop the lights in the Lamp Room.', { beaten: 'mw-lantern' }, 'mosswatch-2', 'mw-lantern'),
      step('Relight the signal fire.', { kindled: 'mosswatch-fire' }, 'mosswatch-2', 'mosswatch-fire'),
      step('Tell Garret.', { flag: 'garret-told' }, 'mosswatch-1', 'garret'),
    ],
    reward: {}, // Garret's thanks: the Kettle, or 150 gold if it was already won in the contest (data/dialogue.js)
  },
  'silent-bell': {
    id: 'silent-bell', name: 'The Silent Bell', kind: 'side', giver: 'ivo', start: { flag: 'met-ivo' },
    steps: [
      step('Find the Fawnrest bell.', { owns: 'dawnbell' }, 'hindwood', 'gloamwing-hollow'),
      step('Ring it on its frame.', { flag: 'bell-rung' }, 'fawnrest', 'fr-bellframe'),
      step('Sleep on the Dreaming Stone.', { flag: 'forewarned' }, 'fawnrest', 'fawnrest-stone'),
    ],
    reward: { set: 'forewarned' },
  },
  'missing-patrol': {
    id: 'missing-patrol', name: 'The Missing Patrol', kind: 'side', giver: 'dael', start: { flag: 'met-dael' },
    steps: [
      step('Look for the patrol\'s trail on the Thornway.', { any: [{ flag: 'saw-boots' }, { beaten: 'hollowed-patrol' }] }, 'thornway', 'tw-boots'),
      step('Find them.', { beaten: 'hollowed-patrol' }, 'heartroot-1', 'hollowed-patrol'),
      step('Report to Dael.', { flag: 'reported-patrol' }, 'thornhollow', 'dael'),
    ],
    reward: { gold: 150, set: 'rangers-home' },
  },
  'miracle-sap': {
    id: 'miracle-sap', name: 'Miracle Sap', kind: 'side', giver: 'pilgrim', start: { flag: 'met-pilgrim' },
    steps: [
      step('Expose Vesper, or close his stall the hard way.', { any: [{ flag: 'vesper-exposed' }, { beaten: 'vesper-stall' }] }, 'fawnrest', 'vesper-stall'),
    ],
    reward: { gold: 100, set: 'vesper-exposed' },
  },
});

export const BOUNTIES = deepFreeze({
  skarn: { id: 'skarn', enc: 'bramble-toll', name: 'Skarn of the Bramble Toll', gold: 40 },
  snag: { id: 'snag', enc: 'snag-wallow', name: 'Old Snag', gold: 120 },
  rotstag: { id: 'rotstag', enc: 'rotstag-glade', name: 'The Rot-Stag', gold: 100 },
  mags: { id: 'mags', enc: 'hr-smugglers', name: 'Mags Kestrel', gold: 100 },
  haskett: { id: 'haskett', enc: 'poachers-holm', name: 'Haskett the Poacher', gold: 250 },
  tappers: { id: 'tappers', enc: 'hr1-tappers', name: 'Dun\'s Sap-Tappers', gold: 150 },
});

export const QUEST_IDS = Object.freeze(Object.keys(QUESTS));
export const BOUNTY_IDS = Object.freeze(Object.keys(BOUNTIES));
