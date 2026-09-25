// The M2 Gauntlet: the Hearth Road north from Hearthstone Keep into the Verdant Wilds, ending
// in Briarmaw's den. Nodes are visited in GAUNTLET order. Hearthfires are rest + save points.
//
// node:   { id, type: 'hearthfire' | 'fight', name, place, backdrop, text, spawns, once, gentle }
// spawn:  { family, level, gearTier, omens, variant, relic (held, with grip), wears (visible
//           regalia piece), name }
// Levels here are Waking-0 levels; rules/foe.js escalates them each Waking.
// `once` nodes are skipped on later Waking runs. `gentle`: the tutorial relic never shatters.

import { deepFreeze } from '../core/freeze.js';

export const BACKDROPS = Object.freeze(['hearth-road', 'verdant-wood', 'thornhollow', 'briarmaw-den']);

const S = (family, level, o = {}) => ({ family, level, gearTier: 0, omens: [], ...o });

export const ENCOUNTERS = deepFreeze({
  'hearthstone-keep': {
    id: 'hearthstone-keep', type: 'hearthfire', name: 'The Eternal Hearth', place: 'Hearthstone Keep', backdrop: 'hearth-road',
    text: 'The hearth that never flickered is burning blue. Fenwick will not meet your eye.',
  },
  'keep-vault': {
    id: 'keep-vault', type: 'fight', name: 'The Vault Door', place: 'Hearthstone Keep', backdrop: 'hearth-road', once: true, gentle: true,
    spawns: [S('tallyman', 1, { variant: 'thief', relic: 'wardens-seal', name: 'Sneck the Tallyman' }), S('cutpurse', 1)],
    text: 'A Tallyman thief bolts from the reliquary with the Warden\'s Seal swinging on his belt. Break his grip.',
  },
  'hearth-road': {
    id: 'hearth-road', type: 'fight', name: 'The Hearth Road North', place: 'Hearth Road', backdrop: 'hearth-road',
    spawns: [S('cutpurse', 1), S('cutpurse', 1), S('cutpurse', 2)],
    text: 'Road-rats in the ditch, and one of them is wearing a rusty knife he will not keep.',
  },
  'waymarker-stones': {
    id: 'waymarker-stones', type: 'fight', name: 'The Waymarker Stones', place: 'Hearth Road', backdrop: 'hearth-road',
    spawns: [S('thornhound', 2), S('thornhound', 2), S('briarling', 2)],
    text: 'Bramble has swallowed the old waymarkers, and something hunts in it.',
  },
  'milestone-fire': {
    id: 'milestone-fire', type: 'hearthfire', name: 'The Milestone Fire', place: 'Hearth Road', backdrop: 'hearth-road',
    text: 'A coal carried from the Keep still burns in the milestone shrine. Rest while it does.',
  },
  'bramble-toll': {
    id: 'bramble-toll', type: 'fight', name: 'The Bramble Toll', place: 'Verdant Wilds', backdrop: 'verdant-wood',
    spawns: [S('bandit', 3, { gearTier: 1, wears: 'thornwatch-hood', name: 'Skarn' }), S('cutpurse', 2), S('cutpurse', 2)],
    text: 'Bandits have strung a chain across the road. Their captain wears a Thornwatch hood he did not earn.',
  },
  'verdant-edge': {
    id: 'verdant-edge', type: 'fight', name: 'The Verdant Edge', place: 'Verdant Wilds', backdrop: 'verdant-wood',
    spawns: [S('briarling', 3), S('briarling', 3), S('thornhound', 3)],
    text: 'Where the road gives up and the wood begins. The bramble is moving against the wind.',
  },
  'rotstag-glade': {
    id: 'rotstag-glade', type: 'fight', name: 'The Rot-Stag\'s Glade', place: 'Verdant Wilds', backdrop: 'verdant-wood',
    spawns: [S('rotstag', 4)],
    text: 'Fawnrest\'s white stag, gone black. Something is tangled in its antlers, and it glints.',
  },
  thornhollow: {
    id: 'thornhollow', type: 'hearthfire', name: 'Thornhollow Hearth', place: 'Thornhollow', backdrop: 'thornhollow',
    text: 'The outpost\'s thorn walls grew back overnight. Captain Dael\'s bounty board has a beast nobody can name.',
  },
  'tally-camp': {
    id: 'tally-camp', type: 'fight', name: 'The Tallyman Camp', place: 'Thornhollow outskirts', backdrop: 'thornhollow',
    spawns: [S('tallyman', 5, { gearTier: 1, relic: 'tallyknife' }), S('bandit', 5, { gearTier: 1, wears: 'thornwatch-jerkin' }), S('cutpurse', 4, { gearTier: 1 })],
    text: 'Ledgers, strongboxes and a Tallyman counting stolen relics by lamplight.',
  },
  'snag-wallow': {
    id: 'snag-wallow', type: 'fight', name: 'Old Snag\'s Wallow', place: 'Verdant Wilds', backdrop: 'verdant-wood',
    spawns: [S('oldsnag', 6)],
    text: 'A gold glint in the black mud: the Thornsplitter Hatchet, still buried in Old Snag\'s shoulder.',
  },
  'bramble-deep': {
    id: 'bramble-deep', type: 'fight', name: 'The Bramble-Deep', place: 'Verdant Wilds', backdrop: 'verdant-wood',
    spawns: [S('bandit', 6, { gearTier: 2, wears: 'thornwatch-boots' }), S('briarling', 5), S('briarling', 5)],
    text: 'The last Thornwatch patrol came this way. A bandit is wearing their boots.',
  },
  'den-mouth': {
    id: 'den-mouth', type: 'hearthfire', name: 'The Last Coals', place: 'Briarmaw\'s Den', backdrop: 'briarmaw-den',
    text: 'You bank a fire at the mouth of the den. Past it, the thorns breathe.',
  },
  'briarmaw-den': {
    id: 'briarmaw-den', type: 'fight', name: 'Briarmaw\'s Den', place: 'Briarmaw\'s Den', backdrop: 'briarmaw-den', brand: 'brand-of-briars',
    spawns: [S('briarmaw', 7)],
    text: 'It wears a crown of thorns that grew there, and a fang the length of a knife. Snap them off.',
  },
});

export const GAUNTLET = Object.freeze([
  'hearthstone-keep', 'keep-vault', 'hearth-road', 'waymarker-stones', 'milestone-fire', 'bramble-toll',
  'verdant-edge', 'rotstag-glade', 'thornhollow', 'tally-camp', 'snag-wallow', 'bramble-deep', 'den-mouth', 'briarmaw-den',
]);

// Optional grinding: rabble patrols per backdrop, at the level of the node you are standing on.
export const PATROLS = deepFreeze({
  'hearth-road': [[S('cutpurse', 0), S('cutpurse', 0), S('thornhound', 0)], [S('thornhound', 0), S('thornhound', 0)]],
  'verdant-wood': [[S('briarling', 0), S('briarling', 0), S('thornhound', 0)], [S('thornhound', 0), S('thornhound', 0), S('cutpurse', 0)]],
  thornhollow: [[S('cutpurse', 0), S('cutpurse', 0), S('briarling', 0)], [S('thornhound', 0), S('briarling', 0), S('briarling', 0)]],
  'briarmaw-den': [[S('briarling', 0), S('briarling', 0), S('briarling', 0)], [S('thornhound', 0), S('briarling', 0), S('thornhound', 0)]],
});

export const BRANDS = deepFreeze({
  'brand-of-briars': { id: 'brand-of-briars', name: 'The Brand of Briars', from: 'briarmaw', text: 'One coal of the hearth relights. The world wakes one notch.' },
});
