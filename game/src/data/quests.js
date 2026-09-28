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
      // a talk step also counts once the Brand it leads to is earned (the Wilds are open: a player can beat
      // Briarmaw before ever meeting Dael, and the quest must still close at the council)
      step('Reach Thornhollow and find Captain Dael.', { any: [{ flag: 'met-dael' }, { brand: 'brand-of-briars' }] }, 'thornhollow', 'dael'),
      step('Name the beast on Dael\'s board.', { brand: 'brand-of-briars' }, 'briarmaw-den', 'briarmaw-den'),
      step('Hear Miravel out about the Rot.', { any: [{ flag: 'met-miravel-rot' }, { brand: 'brand-of-the-heartroot' }] }, 'eldergrove', 'miravel'),
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
  // ---- M4: the Sunscorch Wastes (spec §3.6; STUBS until WP-story finishes them) ----
  'sunscorch-waking': {
    id: 'sunscorch-waking', name: 'The Sunscorch Waking', kind: 'main', giver: 'isolde', start: { flag: 'act1-complete' },
    steps: [
      step('Reach Sandspire and speak with Qasim.', { flag: 'met-qasim' }, 'sandspire', 'qasim'),
      step('Find Luma at Dusthaven.', { any: [{ flag: 'met-luma' }, { brand: 'brand-of-glass' }] }, 'dusthaven', 'luma'),
      step('Take the Brand of Glass in the Deep Shaft.', { brand: 'brand-of-glass' }, 'deep-shaft-2', 'kharzul-heart'),
      step('Find a way into the Scorchgate Vaults.', { any: [{ unlocked: 'sg-vault-door' }, { brand: 'brand-of-ash' }] }, 'scorchgate', 'sg-vault-door'),
      step('Take the Brand of Ash.', { brand: 'brand-of-ash' }, 'scorchgate-vaults', 'ashen-warden'),
      step('Come home to the Keep.', { flag: 'council-2-done' }, 'keep-hall', 'isolde'),
    ],
    reward: {},
  },
  'humming-crate': {
    id: 'humming-crate', name: 'The Humming Crate', kind: 'side', giver: 'zara', start: { flag: 'met-zara' },
    steps: [
      step('Find the Tallyman caravan on the Glass Flats.', { beaten: 'gf-caravan' }, 'glass-flats', 'gf-caravan'),
      step('Bring the crate home to Zara.', { flag: 'crate-returned' }, 'sandspire', 'zara'),
    ],
    reward: { relic: 'zaras-orrery' },
  },
  'cistern-water': {
    id: 'cistern-water', name: 'Water for Sandspire', kind: 'side', giver: 'qasim', start: { flag: 'met-qasim' },
    steps: [
      step('Clear the aqueduct on the Dust Trail.', { beaten: 'dt-aqueduct' }, 'dust-trail', 'dt-aqueduct'),
      step('Tell Qasim the water runs.', { flag: 'cistern-told' }, 'sandspire', 'qasim'),
    ],
    reward: { relic: 'qasims-signet', gold: 200 },
  },
  'sunstone-heart': {
    id: 'sunstone-heart', name: 'Luma\'s Secret', kind: 'side', giver: 'luma', start: { flag: 'met-luma' },
    steps: [
      step('Bring Luma a lantern\'s worth of sunstone.', { owns: 'sunstone-lantern' }, 'deep-shaft-1', 'ds-crew'),
      step('Keep her secret.', { flag: 'luma-trusted' }, 'dusthaven', 'luma'),
    ],
    reward: { relic: 'sunstone-heart' },
  },
  'well-of-mirages': {
    id: 'well-of-mirages', name: 'The Well of Mirages', kind: 'side', giver: 'sabah', start: { flag: 'met-sabah' },
    steps: [
      step('Quiet the Wisp-Queen.', { beaten: 'wisp-queen' }, 'miragewell', 'wisp-queen'),
      step('Tell Sabah the well is safe.', { flag: 'well-told' }, 'miragewell', 'sabah'),
    ],
    reward: { gold: 150 },
  },
});

export const BOUNTIES = deepFreeze({
  skarn: { id: 'skarn', enc: 'bramble-toll', name: 'Skarn of the Bramble Toll', gold: 40 },
  snag: { id: 'snag', enc: 'snag-wallow', name: 'Old Snag', gold: 120 },
  rotstag: { id: 'rotstag', enc: 'rotstag-glade', name: 'The Rot-Stag', gold: 100 },
  mags: { id: 'mags', enc: 'hr-smugglers', name: 'Mags Kestrel', gold: 100 },
  haskett: { id: 'haskett', enc: 'poachers-holm', name: 'Haskett the Poacher', gold: 250 },
  tappers: { id: 'tappers', enc: 'hr1-tappers', name: 'Dun\'s Sap-Tappers', gold: 150 },
  // M4 (spec §3.6): the Sandspire board
  'b-skinks': { id: 'b-skinks', enc: 'dt-skinks', name: 'The Skink Nest', gold: 60 },
  'b-raiders': { id: 'b-raiders', enc: 'gf-raiders', name: 'Dune Raiders', gold: 90 },
  'b-scorpions': { id: 'b-scorpions', enc: 'ds-scorpions', name: 'Shaft Scorpions', gold: 90 },
  'b-wights': { id: 'b-wights', enc: 'sg-wights', name: 'Ash-Wights', gold: 120 },
});

export const QUEST_IDS = Object.freeze(Object.keys(QUESTS));
export const BOUNTY_IDS = Object.freeze(Object.keys(BOUNTIES));
