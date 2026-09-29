// Two-key locks (M3 spec §3.7; M4 spec §2.7; M5 spec §2.7). Every lock type opens with a relic map power OR a Domain level.
//
// LOCKS[id] = { id, name, powers: [mapPowerId], domain: { id, level }, soft, text, useText }
//   powers  RELICS[x].mapPower.id values; a relic counts while it is owned and not shattered
//   domain  the best active hero's domains[id].level must reach `level`
//   soft    false, or what it costs to go through without a key:
//           { vision: 2 } (darkness: sight radius) | { hpPct: 0.04 } (ichor, and M5's drift: max HP per step, never below 1)
// Crownwalls are story seals, not locks: see CROWNWALL.
// Owner: WP1.

import { deepFreeze } from '../core/freeze.js';

const L = (id, name, powers, domain, level, o = {}) => ({ id, name, powers, domain: { id: domain, level }, soft: false, ...o });

export const LOCKS = deepFreeze({
  thornwall: L('thornwall', 'Thornwall', ['cut-the-thornwall', 'briar-crown'], 'physical', 3, {
    text: 'A wall of enchanted thorn, thick as a man is tall.', useText: 'You hack a way through the thornwall.' }),
  bramble: L('bramble', 'Bramble', ['thorn-thread', 'briar-crown', 'greenwake'], 'survival', 4, {
    text: 'Bramble, knotted shoulder-high.', useText: 'You find the way through the bramble.' }),
  stream: L('stream', 'Stream', ['still-the-water', 'rootsong', 'ice-bridge'], 'survival', 6, {
    text: 'Fast water, too deep to wade.', useText: 'You cross the stream.' }),
  boulder: L('boulder', 'Boulder', ['break-the-cairn', 'anvil-strike', 'iron-grip'], 'physical', 4, {
    text: 'A cracked boulder blocks the way.', useText: 'The boulder splits and rolls aside.' }),
  'cold-hearth': L('cold-hearth', 'Cold Hearth', ['kindle', 'lamplight', 'sunlight', 'heartglow', 'forge-heat'], 'attunement', 3, {
    text: 'The hearth is cold. Nothing here will catch.', useText: 'The coal takes. The hearth is lit.' }),
  'tally-seal': L('tally-seal', 'Tally-Seal', ['cut-the-tally', 'lightfingers'], 'knowledge', 4, {
    text: 'A Tallyman ledger-seal, stamped and waxed.', useText: 'The ledger-seal gives.' }),
  'barred-gate': L('barred-gate', 'Barred Gate', ['wardens-writ', 'name-drop', 'cistern-writ'], 'influence', 3, {
    text: 'Barred from the inside. Someone has to be talked into it.', useText: 'The bar lifts.' }),
  darkness: L('darkness', 'Darkness', ['lamplight', 'kindle', 'sunlight', 'crown-of-embers', 'rime-light'], 'attunement', 5, {
    soft: { vision: 2 }, text: 'Dark enough to lose your own hands.', useText: 'Hold my sleeve.' }),
  'rot-knot': L('rot-knot', 'Rot-Knot', ['hear-the-rot', 'rootsong', 'ichorsight'], 'knowledge', 6, {
    text: 'A knot of rotten root, black at the heart.', useText: 'The rot-knot unties itself.' }),
  'rope-ledge': L('rope-ledge', 'Rope-Ledge', ['harts-sight', 'bloodtrail'], 'survival', 5, {
    text: 'A ledge too high to climb without a line.', useText: 'You find the old rope and climb.' }),
  ichor: L('ichor', 'Ichor', ['mirebreath', 'hold-the-line', 'greenwake', 'ash-ward'], 'attunement', 6, {
    soft: { hpPct: 0.04 }, text: 'Black sap pools here. It burns.', useText: 'The ichor cannot touch you.' }),
  // M4: the Sunscorch Wastes (spec §2.7)
  'dune-glass': L('dune-glass', 'Dune-Glass', ['melt-glass', 'shatter-glass'], 'craft', 5, {
    text: 'A dune fused to glass by some old fire, still warm to the touch.', useText: 'The glass runs like honey and sets again behind you.' }),
  mirage: L('mirage', 'Mirage', ['see-true', 'star-reckoning', 'mirror-skin'], 'knowledge', 5, {
    text: 'The road bends away from something that shimmers.', useText: 'You walk through the shimmer. It was never there.' }),
  quicksand: L('quicksand', 'Quicksand', ['sandwalk', 'burrow-sense'], 'survival', 6, {
    text: 'The sand here is breathing.', useText: 'You find the firm way across.' }),
  'vault-seal': L('vault-seal', 'Vault Seal', ['ashen-key'], 'knowledge', 7, {
    text: 'An ash-black seal across the vault door, older than Scorchgate.', useText: 'The seal crumbles. The vault breathes out.' }),
  // M5: the Ironspire Peaks (spec §2.7)
  chasm: L('chasm', 'Chasm', ['windstep', 'roc-glide'], 'physical', 7, {
    text: 'A gap in the rock, and the wind coming up it.', useText: 'You are across before you think about it.' }),
  ice: L('ice', 'Ice Wall', ['forge-heat', 'crack-the-ice', 'melt-glass'], 'attunement', 7, {
    text: 'A wall of old blue ice.', useText: 'The ice gives.' }),
  'rune-seal': L('rune-seal', 'Rune-Seal', ['thanes-rune', 'rune-reading'], 'knowledge', 7, {
    text: 'Dwarf runes, cut deep and filled with iron.', useText: 'The runes read you, and let you pass.' }),
  drift: L('drift', 'Snowdrift', ['snowshoe', 'hushwalk'], 'survival', 7, {
    soft: { hpPct: 0.03 }, text: 'Snow to the thigh, and colder underneath.', useText: 'You find the crust that holds.' }),
});

export const LOCK_IDS = Object.freeze(Object.keys(LOCKS));

// Crownwalls (§0 D2): Briarmaw's living crown-growth, opened only by the Brand of Briars.
export const CROWNWALL = deepFreeze({
  id: 'crownwall', name: 'Crownwall', story: true, open: { brand: 'brand-of-briars' },
  text: 'Briarmaw\'s crown-growth walls the road. A green heart-knot pulses in it.',
  cutText: 'The hatchet bounces. These grew from Briarmaw\'s crown.',
  journal: 'A story seal. It falls with the beast that grew it.',
});
