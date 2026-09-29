// Quests and bounties (M3 spec §3.6, §4.4; M4 spec §3.6; M5 spec §3.6). Quest state is derived from
// conditions; only flags.quests[id] = 'claimed' is stored.
//
// QUESTS[id] = { id, name, kind: 'main'|'side', giver, start: cond,
//                steps: [{ text, done: cond, target: { map, entity } }],
//                reward: { gold?, relic?, item?, set?, gems?: { gemId: n }, materials?: { scrap?, silver?, embers? } } }
// BOUNTIES[id] = { id, enc, name, gold, giver }   posted on a board (Thornhollow: Dael; Sandspire: Zara;
//                                                  Stormwatch: Ysolde), complete once { beaten: enc }; any
//                                                  bounty-giver pays any of them
// The thank-you rule (M3 review): a line that claims a quest also sets its start flag, and a claim
// needs every step done, so a deed done before meeting its giver is never lost.
// Owner: WP3S (M3), P3 story (M4, M5).

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
  // ---- M4: the Sunscorch Wastes (spec §3.6) ----
  // As in M3, a talk step also counts once the Brand it leads to is earned: the region is open, and a
  // Warden who walks past Sandspire must still close the quest at the second council.
  'sunscorch-waking': {
    id: 'sunscorch-waking', name: 'The Sunscorch Waking', kind: 'main', giver: 'isolde', start: { flag: 'act1-complete' },
    steps: [
      step('Reach Sandspire and speak with Cistern Lord Qasim.', { any: [{ flag: 'met-qasim' }, { brand: 'brand-of-glass' }, { brand: 'brand-of-ash' }] }, 'sandspire', 'qasim'),
      step('Find Luma the assayer at Dusthaven.', { any: [{ flag: 'met-luma' }, { brand: 'brand-of-glass' }] }, 'dusthaven', 'luma'),
      step('Go down the Deep Shaft and take the Brand of Glass.', { brand: 'brand-of-glass' }, 'deep-shaft-2', 'kharzul-heart'),
      step('Find a way through Scorchgate\'s vault door.', { any: [{ unlocked: 'sg-vault-door' }, { brand: 'brand-of-ash' }] }, 'scorchgate', 'sg-vault-door'),
      step('Take the Brand of Ash in the Scorchgate Vaults.', { brand: 'brand-of-ash' }, 'scorchgate-vaults', 'ashen-warden'),
      step('Come home to the Keep. The Council is waiting.', { flag: 'council-2-done' }, 'keep-hall', 'isolde'),
    ],
    reward: {}, // the second council's scene claims it (data/dialogue.js council-2)
  },
  'humming-crate': {
    id: 'humming-crate', name: 'The Humming Crate', kind: 'side', giver: 'zara', start: { flag: 'met-zara' },
    steps: [
      // the caravan's AFTER lines set crate-found; the win alone is enough, should a reload cut them short
      step('Find the Tallyman caravan that took Zara\'s crate, out on the Glass Flats.', { any: [{ flag: 'crate-found' }, { beaten: 'gf-caravan' }] }, 'glass-flats', 'gf-caravan'),
      step('Bring the humming crate home to Zara in Sandspire.', { flag: 'crate-returned' }, 'sandspire', 'zara'),
    ],
    reward: { relic: 'zaras-orrery' },
  },
  'cistern-water': {
    id: 'cistern-water', name: 'Water for Sandspire', kind: 'side', giver: 'qasim', start: { flag: 'met-qasim' },
    steps: [
      step('Clear the glass-scorpion nest choking the aqueduct on the Dust Trail.', { beaten: 'dt-aqueduct' }, 'dust-trail', 'dt-aqueduct'),
      step('Tell Qasim the water runs again.', { flag: 'cistern-told' }, 'sandspire', 'qasim'),
    ],
    reward: { relic: 'qasims-signet', gold: 200 },
  },
  'sunstone-heart': {
    id: 'sunstone-heart', name: 'Luma\'s Secret', kind: 'side', giver: 'luma', start: { flag: 'met-luma' },
    steps: [
      step('Take Foreman Brask\'s sunstone lantern in the Deep Shaft.', { owns: 'sunstone-lantern' }, 'deep-shaft-1', 'ds-crew'),
      step('Bring Luma the lantern, and keep her secret.', { flag: 'luma-trusted' }, 'dusthaven', 'luma'),
    ],
    reward: { relic: 'sunstone-heart' },
  },
  'well-of-mirages': {
    id: 'well-of-mirages', name: 'The Well of Mirages', kind: 'side', giver: 'sabah', start: { flag: 'met-sabah' },
    steps: [
      step('Quiet the Wisp-Queen, who drinks the well dry each night.', { beaten: 'wisp-queen' }, 'miragewell', 'wisp-queen'),
      step('Tell Sabah the well is safe.', { flag: 'well-told' }, 'miragewell', 'sabah'),
    ],
    reward: { gold: 150, gems: { 'glass-pearl': 2 } },
  },
  // ---- M5: the Ironspire Peaks (spec §3.6) ----
  // The main quest shows the moment the Sunscorch is won (sunscorch-complete, a rule flag), so its first
  // step is the second council. As in M3 and M4, a talk step also counts once the Brand it leads to is
  // earned, so a Warden who walks past Peak's Veil or the stockade still closes it at the third council.
  // Facing Tamsin is its own step (the spec's "win the Thane's leave" in two), so the Journal points at
  // her first and then at the Thane.
  'ironspire-waking': {
    id: 'ironspire-waking', name: 'The Ironspire Waking', kind: 'main', giver: 'isolde', start: { flag: 'sunscorch-complete' },
    steps: [
      step('Come home to the Keep and sit the second council.', { flag: 'council-2-done' }, 'keep-hall', 'isolde'),
      step('Take the East Road from the postern up to Peak\'s Veil, and find Mother Wynn.', { any: [{ flag: 'met-wynn' }, { brand: 'brand-of-iron' }] }, 'peaks-veil', 'wynn'),
      step('Climb the Iron Stair to Ironhold and speak with Thane Brundar.', { any: [{ flag: 'met-brundar' }, { brand: 'brand-of-iron' }] }, 'ironhold', 'brundar'),
      step('Face Tamsin on the Deeps stair.', { any: [{ beaten: 'tamsin-ironhold' }, { flag: 'tamsin-yielded-3' }, { flag: 'rune-given' }, { brand: 'brand-of-iron' }] }, 'ironhold', 'tamsin-ironhold'),
      step('Win the Thane\'s leave to go down into the Deeps: his rune-key.', { any: [{ flag: 'rune-given' }, { brand: 'brand-of-iron' }] }, 'ironhold', 'brundar'),
      step('Go down through the Deeps and take the Brand of Iron in Harrow\'s Forge.', { brand: 'brand-of-iron' }, 'harrows-forge', 'mother-anvil'),
      step('Reach Stormwatch and hear Rook out, in the stockade.', { any: [{ flag: 'met-rook' }, { brand: 'brand-of-frost' }] }, 'stormwatch', 'rook'),
      step('Take the Frost Road to Frostmere, and the Brand of Frost beneath it.', { brand: 'brand-of-frost' }, 'frostmere-below', 'rime-abbot'),
      step('Come home to the Keep. The Council is waiting.', { flag: 'council-3-done' }, 'keep-hall', 'isolde'),
    ],
    reward: {}, // the Rune-Key is given by the Thane's scene (data/dialogue.js brundar-rune); the third council claims it
  },
  // The bell rings from its rope in the tower (pv-bell-rope) or with Mother Wynn (wynn-ring); she thanks you.
  'bell-of-veil': {
    id: 'bell-of-veil', name: 'The Bell of Peak\'s Veil', kind: 'side', giver: 'wynn', start: { flag: 'met-wynn' },
    steps: [
      step('Give the Drowned Abbess her rest, on the island shrine of Frostmere.', { beaten: 'fm-shrine' }, 'frostmere', 'fm-shrine'),
      step('Ring the bell of Peak\'s Veil for the drowned.', { flag: 'bell-rung-veil' }, 'peaks-veil', 'wynn'),
    ],
    reward: { relic: 'veilbell' },
  },
  // Hilda's thanks (data/dialogue.js hilda-hammer) claims it; the reward is hers, the scene is the rest
  'harrows-hammer': {
    id: 'harrows-hammer', name: 'Harrow\'s Hammer', kind: 'side', giver: 'hilda', start: { owns: 'worldforge-hammer' },
    steps: [
      step('Show Hilda the Worldforge Hammer, at her forge in the Keep.', { flag: 'hammer-shown' }, 'keep', 'hilda'),
    ],
    reward: { gold: 300, materials: { embers: 2 } },
  },
  'rooks-ledger': {
    id: 'rooks-ledger', name: 'Rook\'s Ledger', kind: 'side', giver: 'rook', start: { flag: 'met-rook' },
    steps: [
      step('Take the Cutter-Chief\'s ledger at the ice-saw camp on the Frost Road.', { beaten: 'fr-cutters' }, 'frost-road', 'fr-cutters'),
      step('Bring the ledger to Rook in the Stormwatch stockade.', { flag: 'ledger-given' }, 'stormwatch', 'rook'),
    ],
    reward: { gold: 250, gems: { 'frost-opal': 1 } },
  },
  'sentinel-oath': {
    id: 'sentinel-oath', name: 'The Sentinel\'s Oath', kind: 'side', giver: 'brundar', start: { flag: 'met-brundar' },
    steps: [
      step('Give Harrow\'s journeyman his rest, in the Ironhold Deeps.', { beaten: 'id-smith' }, 'ironhold-deeps', 'id-smith'),
      step('Tell Thane Brundar his sister\'s boy is at rest.', { flag: 'smith-told' }, 'ironhold', 'brundar'),
    ],
    reward: { gold: 200, materials: { silver: 2 } },
  },
  // ---- M6: the Gloomfen Marsh (spec §3.6). STUBS from the M6 scaffold: the spec's steps; P3 words them. ----
  'gloomfen-waking': {
    id: 'gloomfen-waking', name: 'The Gloomfen Waking', kind: 'main', giver: 'isolde', start: { flag: 'ironspire-complete' },
    steps: [
      step('Come home to the Keep and sit the third council.', { flag: 'council-3-done' }, 'keep-hall', 'isolde'),
      step('Go down the fen stair below Mossfall and find Elder Moss in Willowmurk.', { any: [{ flag: 'met-moss' }, { brand: 'brand-of-lanterns' }] }, 'willowmurk', 'moss'),
      step('Get past Hodge\'s bar at Rotbridge.', { any: [{ flag: 'toll-paid' }, { beaten: 'hodge' }, { brand: 'brand-of-lanterns' }] }, 'rotbridge', 'hodge'),
      step('Face Tamsin on Rotbridge.', { any: [{ beaten: 'tamsin-rotbridge' }, { flag: 'tamsin-yielded-4' }, { brand: 'brand-of-lanterns' }] }, 'rotbridge', 'tamsin-rotbridge'),
      step('Reach Bogmire and speak with Mayor Gretch.', { any: [{ flag: 'met-gretch' }, { brand: 'brand-of-lanterns' }] }, 'bogmire', 'gretch'),
      step('Follow the lanterns into the eastern bogs, and take the Brand of Lanterns.', { brand: 'brand-of-lanterns' }, 'mothers-hollow', 'lantern-mother'),
      step('Follow the long boardwalk to Misthollow and find Corvus.', { any: [{ flag: 'met-corvus' }, { brand: 'brand-of-the-deep' }] }, 'misthollow', 'corvus'),
      step('Go down the Blackwater to the Tidal Flats, and take the Brand of the Deep.', { brand: 'brand-of-the-deep' }, 'tidal-flats', 'blackwater-leviathan'),
      step('Come home to the Keep. The Council is waiting.', { flag: 'council-4-done' }, 'keep-hall', 'isolde'),
    ],
    reward: {}, // the fourth council claims it (data/dialogue.js council-4)
  },
  'failing-wards': {
    id: 'failing-wards', name: 'The Failing Wards', kind: 'side', giver: 'moss', start: { flag: 'met-moss' },
    steps: [
      step('Quiet Grandfather Willow, outside the wards.', { beaten: 'wm-willow' }, 'willowmurk', 'wm-willow'),
      step('Tell Elder Moss.', { flag: 'wards-mended' }, 'willowmurk', 'moss'),
    ],
    reward: { relic: 'willow-ward' },
  },
  'nettie-remedy': {
    id: 'nettie-remedy', name: 'Nettie\'s Remedy', kind: 'side', giver: 'nettie', start: { flag: 'met-nettie' },
    steps: [
      step('Take Mother Grue\'s Hag-Stone, in the Lanternfen.', { beaten: 'grue-hollow' }, 'lanternfen', 'grue-hollow'),
      step('Bring Nettie word.', { flag: 'grue-told' }, 'bogmire', 'nettie'),
    ],
    reward: { relic: 'hexbane-shawl', gems: { 'bog-amber': 1 } },
  },
  'corvus-harpoon': {
    id: 'corvus-harpoon', name: 'Corvus\'s Harpoon', kind: 'side', giver: 'corvus', start: { flag: 'met-corvus' },
    steps: [
      step('Get Corvus\'s harpoon out of the Leviathan.', { owns: 'corvus-harpoon' }, 'tidal-flats', 'blackwater-leviathan'),
      step('Show it to Corvus.', { flag: 'harpoon-shown' }, 'misthollow', 'corvus'),
    ],
    reward: { gold: 300, materials: { silver: 2 } },
  },
  'dead-tongue': {
    id: 'dead-tongue', name: 'The Dead Tongue', kind: 'side', giver: 'corvus', start: { flag: 'met-corvus' },
    steps: [
      step('Take the salvage crew\'s sealed chest.', { beaten: 'mh-salvage' }, 'misthollow', 'mh-salvage'),
      step('Have Elder Moss read its warnings.', { flag: 'chest-read' }, 'willowmurk', 'moss'),
      step('Tell Corvus what the chest says.', { flag: 'chest-told' }, 'misthollow', 'corvus'),
    ],
    reward: { gold: 250, gems: { 'bog-amber': 1 } },
  },
});

export const BOUNTIES = deepFreeze({
  skarn: { id: 'skarn', enc: 'bramble-toll', name: 'Skarn of the Bramble Toll', gold: 40, giver: 'dael' },
  snag: { id: 'snag', enc: 'snag-wallow', name: 'Old Snag', gold: 120, giver: 'dael' },
  rotstag: { id: 'rotstag', enc: 'rotstag-glade', name: 'The Rot-Stag', gold: 100, giver: 'dael' },
  mags: { id: 'mags', enc: 'hr-smugglers', name: 'Mags Kestrel', gold: 100, giver: 'dael' },
  haskett: { id: 'haskett', enc: 'poachers-holm', name: 'Haskett the Poacher', gold: 250, giver: 'dael' },
  tappers: { id: 'tappers', enc: 'hr1-tappers', name: 'Dun\'s Sap-Tappers', gold: 150, giver: 'dael' },
  // M4 (spec §3.6): the Sandspire board, turned in to Zara al-Khem
  'b-skinks': { id: 'b-skinks', enc: 'dt-skinks', name: 'The Rail-Cut Skink Nest', gold: 60, giver: 'zara' },
  'b-raiders': { id: 'b-raiders', enc: 'gf-raiders', name: 'Dune Raiders of the Flats', gold: 90, giver: 'zara' },
  'b-scorpions': { id: 'b-scorpions', enc: 'ds-scorpions', name: 'Scorpions in the Shaft', gold: 90, giver: 'zara' },
  'b-wights': { id: 'b-wights', enc: 'sg-wights', name: 'The Wall-Walkers of Scorchgate', gold: 120, giver: 'zara' },
  // M5 (spec §3.6): the Stormwatch board, turned in to Captain Ysolde
  'b-wolves': { id: 'b-wolves', enc: 'rp-wolves', name: 'The Rime Wolves of the Pass', gold: 90, giver: 'ysolde' },
  'b-trolls': { id: 'b-trolls', enc: 'is-trolls', name: 'The Switchback Trolls', gold: 120, giver: 'ysolde' },
  'b-frostwolves': { id: 'b-frostwolves', enc: 'fr-wolves', name: 'The Frost Road Pack', gold: 120, giver: 'ysolde' },
  'b-roc': { id: 'b-roc', enc: 'roc-eyrie', name: 'The Thunder-Roc of the Highfold', gold: 160, giver: 'ysolde' },
  // M6 (spec §3.6): the Bogmire board, turned in to Mayor Gretch
  'b-bogfolk': { id: 'b-bogfolk', enc: 'mk-bogfolk', name: 'The Murkway Bogfolk', gold: 100, giver: 'gretch' },
  'b-lights': { id: 'b-lights', enc: 'lf-lights', name: 'The Lights of the Lanternfen', gold: 110, giver: 'gretch' },
  'b-gars': { id: 'b-gars', enc: 'br-gars', name: 'The Gars of the Reach', gold: 130, giver: 'gretch' },
  'b-jaws': { id: 'b-jaws', enc: 'old-jaws', name: 'Old Jaws of the Blackwater', gold: 170, giver: 'gretch' },
});

export const QUEST_IDS = Object.freeze(Object.keys(QUESTS));
export const BOUNTY_IDS = Object.freeze(Object.keys(BOUNTIES));
