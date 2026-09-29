// Foe families of the Verdant Wilds (M2, M3), the Sunscorch Wastes (M4), the Ironspire Peaks (M5) and the Gloomfen Marsh (M6). Art keys match the shared vocabulary.
//
// Stats are for level 1; rules/foe.js scales them by level, gear tier, Omens and the Waking.
// Each family has a MOVE TABLE read like a D&D random table: the foe rolls its intent die
// (rabble d6, veteran d8, relic-bearer d12, champion d20) and the face picks the move.
// The intent is rolled at the end of the foe's previous turn, so the player always sees it
// coming. A disarmed relic-bearer's die drops a size (d12 -> d8): its high faces, which hold
// its relic Art, can no longer come up.
//
// Move fields: name, text, target (enemy | all-enemies | self | all-allies), effects (skill
// effect format), charge (announced as "charging"; Stagger cancels it), requires (a relic id
// that must still be held), when ({ hpBelow }), fallback (move used if unavailable),
// weapon:true on an attack uses the dice of the weapon the foe visibly carries.
// M5: then (a move id: the foe's next intent is forced to it, e.g. Kharzul's Burrow, then Erupt); a
// `swallowed` status effect may carry a `label` for the hero's plate ("Held under", "Carried off");
// a summon may name a `variant` of its family (the Rime-Abbot's choir).

import { deepFreeze } from '../core/freeze.js';

export const FOE_TIERS = deepFreeze({
  rabble: { id: 'rabble', name: 'Rabble', die: 6 },
  veteran: { id: 'veteran', name: 'Veteran', die: 8 },
  'relic-bearer': { id: 'relic-bearer', name: 'Relic-Bearer', die: 12 },
  champion: { id: 'champion', name: 'Champion', die: 20 },
});

// Intent dice sizes in order, for stepping down when a relic-bearer is disarmed.
export const DIE_STEPS = Object.freeze([6, 8, 12, 20]);

const atk = (dice, kind, o = {}) => ({ type: 'attack', dice, kind, ...o });
const status = (id, o = {}) => ({ type: 'status', status: id, ...o });

// Move tables shared by a family and its named variants (a variant's `moves` replaces the family's).
const BANDIT_MOVES = {
  hack: { name: 'Hack', target: 'enemy', text: 'A workmanlike chop.', effects: [atk('1d6', 'slash', { weapon: true })] },
  'shield-bash': { name: 'Shield Bash', target: 'enemy', text: 'Rim to the jaw: Staggers.', effects: [atk('1d4', 'crush', { riders: [status('staggered')] })] },
  'dirty-trick': { name: 'Dirty Trick', target: 'enemy', text: 'A knee where it counts. Frightened.', effects: [atk('1d4', 'crush', { riders: [status('frightened')] })] },
  'heavy-swing': { name: 'Heavy Swing', target: 'enemy', charge: true, text: 'Winds up a two-handed swing.', effects: [atk('1d6', 'slash', { weapon: true, bonusDice: [{ dice: '1d8' }] })] },
  'second-wind': { name: 'Second Wind', target: 'self', when: { hpBelow: 0.5 }, fallback: 'hack', text: 'Spits, steadies, keeps coming.', effects: [{ type: 'heal', dice: '1d8', diceEvery: 3 }] },
};
const TALLY_MOVES = {
  cut: { name: 'Cut', target: 'enemy', text: 'A clerk\'s neat, nasty cut.', effects: [atk('1d4', 'pierce', { weapon: true })] },
  'tally-mark': { name: 'Tally Mark', target: 'enemy', text: 'Chalks your name in the ledger. You are Marked.', effects: [status('marked')] },
  'smoke-pot': { name: 'Smoke Pot', target: 'all-enemies', text: 'Stinking smoke. WIS save or Frightened.', effects: [status('frightened', { save: 'WIS' })] },
  'cheats-cut': { name: 'Cheat\'s Cut', target: 'enemy', requires: 'tallyknife', fallback: 'cut', text: 'The Tallyknife collects: 2 stacks of Poisoned.', effects: [atk('1d4', 'pierce', { weapon: true, aspect: 'blight', bonusDice: [{ dice: '1d4', aspect: 'blight' }], riders: [status('poisoned', { stacks: 2 })] })] },
  'seal-flash': { name: 'Seal Flash', target: 'all-enemies', requires: 'wardens-seal', fallback: 'cut', text: 'The stolen Seal blazes. 1d6 radiant, DEX save for half.', effects: [{ type: 'damage', dice: '1d6', kind: 'radiant', aspect: 'radiant', save: 'DEX' }] },
};

const SMUGGLER_MOVES = {
  cut: { name: 'Cut', target: 'enemy', text: 'A smuggler\'s knife, quick and low.', effects: [atk('1d4', 'pierce', { weapon: true })] },
  caltrops: { name: 'Caltrops', target: 'all-enemies', text: 'Iron burrs across the path. DEX save or Rooted.', effects: [status('rooted', { save: 'DEX' })] },
  bolt: { name: 'Bolt', target: 'self', when: { hpBelow: 0.5 }, fallback: 'cut', text: 'Gone into the reeds.', effects: [{ type: 'escape' }] },
};
const DRUID_MOVES = {
  'thorn-lash': { name: 'Thorn Lash', target: 'enemy', text: 'A staff wrapped in living thorn.', effects: [atk('1d6', 'crush', { weapon: true })] },
  barkskin: { name: 'Barkskin', target: 'self', text: 'Bark creeps over the druid\'s skin: Warded.', effects: [status('warded', { value: { dice: '2d6', diceEvery: 3 } })] },
  'call-the-briars': { name: 'Call the Briars', target: 'self', text: 'The druid sings and a Briarling tears up out of the ground.', effects: [{ type: 'summon', family: 'briarling', count: 1, max: 1, levelDelta: -2 }] },
};
const RANGER_MOVES = {
  'rot-arrow': { name: 'Rot-Arrow', target: 'enemy', text: 'A black-fletched arrow: Poisoned.', effects: [atk('1d6', 'pierce', { weapon: true, riders: [status('poisoned')] })] },
  knife: { name: 'Knife', target: 'enemy', text: 'A ranger\'s knife, from habit.', effects: [atk('1d4', 'pierce')] },
  remember: { name: 'Remember', target: 'self', when: { hpBelow: 0.3 }, fallback: 'rot-arrow', text: 'It says a name. Its own.', effects: [] },
};
const TAMSIN_MOVES = {
  riposte: { name: 'Riposte', target: 'enemy', text: 'Two cuts, one breath. Tamsin makes it look easy.', effects: [atk('1d8', 'slash'), atk('1d8', 'slash')] },
  'cheap-shot': { name: 'Cheap Shot', target: 'enemy', text: 'A pommel where it hurts. Frightened.', effects: [atk('1d6', 'crush', { riders: [status('frightened')] })] },
  showboat: { name: 'Showboat', target: 'self', text: 'She takes a bow mid-fight: Hasted.', effects: [status('hasted')] },
  parry: { name: 'Parry', target: 'self', text: 'She waits for you to try: Guarding.', effects: [status('guarding')] },
  'not-like-this': { name: 'Not Like This', target: 'self', when: { hpBelow: 0.35 }, fallback: 'riposte', text: 'Not like this. She steadies: 2d8 healing and Warded.', effects: [{ type: 'heal', dice: '2d8' }, status('warded', { value: { dice: '1d6', diceEvery: 3 } })] },
};

const VERDANT = {
  cutpurse: {
    id: 'cutpurse', name: 'Cutpurse', art: 'cutpurse', tier: 'rabble', humanoid: true,
    hp: 16, guard: 14, atk: 3, dmg: 2, speed: 12, armor: 'hide', aspect: null,
    saves: { STR: 0, DEX: 2, CON: 0, WIS: 0 },
    moves: {
      stab: { name: 'Stab', target: 'enemy', text: 'A quick knife in the ribs.', effects: [atk('1d4', 'pierce', { weapon: true })] },
      'pocket-sand': { name: 'Pocket Sand', target: 'enemy', text: 'A fistful of grit to the eyes. DEX save or Frightened.', effects: [status('frightened', { save: 'DEX' })] },
      bolt: { name: 'Bolt', target: 'self', when: { hpBelow: 0.5 }, fallback: 'stab', text: 'It breaks and runs for the trees.', effects: [{ type: 'escape' }] },
    },
    table: [[1, 3, 'stab'], [4, 5, 'pocket-sand'], [6, 6, 'bolt']],
    gear: [
      [{ base: 'belt-knife' }, { base: 'hood' }],
      [{ base: 'belt-knife' }, { base: 'hood' }, { base: 'jerkin' }],
      [{ base: 'rondel' }, { base: 'mail-coif' }, { base: 'jerkin' }],
      [{ base: 'rondel' }, { base: 'mail-coif' }, { base: 'brigandine' }],
    ],
    text: 'Road-rats of the Hearth Road. They run when it goes badly.',
  },
  briarling: {
    id: 'briarling', name: 'Briarling', art: 'briarling', tier: 'rabble', kind: 'plant',
    hp: 13, guard: 13, atk: 3, dmg: 1, speed: 10, armor: 'hide', aspect: 'verdant',
    saves: { STR: 0, DEX: 1, CON: 1, WIS: 0 },
    moves: {
      'thorn-jab': { name: 'Thorn Jab', target: 'enemy', text: 'A whip of thorns.', effects: [atk('1d6', 'pierce')] },
      'seed-spit': { name: 'Seed Spit', target: 'enemy', text: 'A spray of bitter seeds that leave you Poisoned.', effects: [atk('1d4', 'pierce', { aspect: 'verdant', riders: [status('poisoned')] })] },
      tangle: { name: 'Tangle', target: 'enemy', text: 'Runners wrap your ankles. STR save or Rooted.', effects: [status('rooted', { save: 'STR' })] },
    },
    table: [[1, 3, 'thorn-jab'], [4, 5, 'seed-spit'], [6, 6, 'tangle']],
    text: 'Bramble that learned to walk the night the hearth flickered.',
  },
  thornhound: {
    id: 'thornhound', name: 'Thornhound', art: 'thornhound', tier: 'rabble', kind: 'beast',
    hp: 18, guard: 14, atk: 4, dmg: 1, speed: 13, armor: 'hide', aspect: null,
    saves: { STR: 1, DEX: 2, CON: 1, WIS: 0 },
    moves: {
      bite: { name: 'Bite', target: 'enemy', text: 'Teeth like blackthorn.', effects: [atk('1d6', 'pierce')] },
      lunge: { name: 'Lunge', target: 'enemy', charge: true, text: 'It crouches, charging a lunge for the throat.', effects: [atk('1d10', 'pierce')] },
      howl: { name: 'Pack Howl', target: 'all-allies', text: 'The pack answers: every foe is Hasted.', effects: [status('hasted')] },
    },
    table: [[1, 3, 'bite'], [4, 5, 'lunge'], [6, 6, 'howl']],
    text: 'Lean hunting dogs gone feral in the bramble, burrs matted into their hides.',
  },
  bandit: {
    id: 'bandit', name: 'Bandit', art: 'bandit', tier: 'veteran', humanoid: true,
    hp: 26, guard: 15, atk: 4, dmg: 2, speed: 10, armor: 'hide', aspect: null,
    saves: { STR: 2, DEX: 1, CON: 1, WIS: 0 },
    names: ['Skarn', 'Mother Brisk', 'Hobb Two-Knives', 'Red Aldo', 'Jessamy Crook', 'Old Tam'],
    moves: BANDIT_MOVES,
    table: [[1, 3, 'hack'], [4, 4, 'shield-bash'], [5, 5, 'dirty-trick'], [6, 7, 'heavy-swing'], [8, 8, 'second-wind']],
    variants: {
      // M3 named holder (scaffold stub; WP4 owns the numbers).
      poacher: {
        name: 'Haskett', tier: 'relic-bearer', hp: 64, art: 'haskett',
        moves: { ...BANDIT_MOVES, longshot: { name: 'Longshot', target: 'enemy', requires: 'hartshorn', fallback: 'hack', charge: true, text: 'Hartshorn draws to the ear, charging a shot that crackles.', effects: [atk('3d8', 'pierce', { aspect: 'storm' })] } },
        table: [[1, 4, 'hack'], [5, 5, 'shield-bash'], [6, 6, 'dirty-trick'], [7, 8, 'heavy-swing'], [9, 9, 'second-wind'], [10, 12, 'longshot']],
      },
    },
    gear: [
      [{ base: 'hand-axe' }, { base: 'hood' }, { base: 'jerkin' }],
      [{ base: 'hand-axe' }, { base: 'kettle-helm' }, { base: 'jerkin' }, { base: 'buckler' }],
      [{ base: 'bearded-axe' }, { base: 'kettle-helm' }, { base: 'chain-shirt' }, { base: 'buckler' }],
      [{ base: 'bearded-axe' }, { base: 'great-helm' }, { base: 'hauberk' }, { base: 'heater-shield' }],
    ],
    text: 'Thornhollow deserters and worse. Every Waking they come back better armed.',
  },
  tallyman: {
    id: 'tallyman', name: 'Tallyman', art: 'tallyman', tier: 'veteran', humanoid: true,
    hp: 24, guard: 15, atk: 4, dmg: 2, speed: 12, armor: 'hide', aspect: null,
    saves: { STR: 0, DEX: 2, CON: 1, WIS: 2 },
    names: ['Sneck', 'Quill', 'Ledger-Maud', 'Hollis Fairweight', 'Dun the Counter'],
    moves: TALLY_MOVES,
    table: [[1, 3, 'cut'], [4, 4, 'tally-mark'], [5, 5, 'smoke-pot'], [6, 8, 'cheats-cut']],
    variants: {
      thief: {
        name: 'Tallyman Thief', hp: 20, guard: 13, atk: 3,
        table: [[1, 4, 'cut'], [5, 6, 'tally-mark'], [7, 8, 'seal-flash']],
      },
      // M3 named holders (scaffold stubs; WP4 owns the numbers).
      signalmaster: {
        name: 'Hollis Fairweight', tier: 'relic-bearer', hp: 60, art: 'hollis',
        moves: { ...TALLY_MOVES, 'signal-flare': { name: 'Signal Flare', target: 'all-enemies', requires: 'mosswatch-lantern', fallback: 'cut', text: 'The Lantern flares: 2d6 ember to all, and everyone is Marked.', effects: [{ type: 'damage', dice: '2d6', kind: 'ember', aspect: 'ember', riders: [status('marked')] }] } },
        table: [[1, 4, 'cut'], [5, 6, 'tally-mark'], [7, 8, 'smoke-pot'], [9, 12, 'signal-flare']],
      },
      counter: {
        name: 'Dun the Counter', tier: 'relic-bearer', hp: 66, art: 'dun',
        moves: { ...TALLY_MOVES, 'oath-cut': { name: 'Oath Cut', target: 'enemy', requires: 'isoldes-oath', fallback: 'cut', text: 'A borrowed oath, badly kept: 2d8 frost and 2 stacks of Chilled.', effects: [atk('2d8', 'slash', { aspect: 'frost', riders: [status('chilled', { stacks: 2 })] })] } },
        table: [[1, 4, 'cut'], [5, 6, 'tally-mark'], [7, 8, 'smoke-pot'], [9, 12, 'oath-cut']],
      },
      apothecary: {
        name: 'Vesper', hp: 30, art: 'vesper',
        moves: { ...TALLY_MOVES, 'miracle-sap': { name: 'Miracle Sap', target: 'all-allies', text: 'A thimble of miracle sap goes round: 2d8 healing.', effects: [{ type: 'heal', dice: '2d8', diceEvery: 3 }] } },
        table: [[1, 3, 'cut'], [4, 4, 'tally-mark'], [5, 5, 'smoke-pot'], [6, 8, 'miracle-sap']],
      },
    },
    gear: [
      [{ base: 'belt-knife' }, { base: 'hood' }, { base: 'jerkin' }],
      [{ base: 'rondel' }, { base: 'hood' }, { base: 'jerkin' }],
      [{ base: 'rondel' }, { base: 'mail-coif' }, { base: 'brigandine' }],
      [{ base: 'rondel' }, { base: 'mail-coif' }, { base: 'brigandine' }, { base: 'gloves' }],
    ],
    text: 'A relic-thief cult with ink-stained fingers. They keep accounts of everything they steal.',
  },
  rotstag: {
    id: 'rotstag', name: 'The Rot-Stag', art: 'rotstag', tier: 'relic-bearer', kind: 'beast', unique: true,
    hp: 120, guard: 15, atk: 5, dmg: 2, speed: 11, armor: 'hide', aspect: 'blight',
    saves: { STR: 3, DEX: 1, CON: 3, WIS: 1 },
    relics: ['rotwood-circlet'],
    moves: {
      gore: { name: 'Gore', target: 'enemy', text: 'Black antlers, low and fast.', effects: [atk('2d8', 'pierce')] },
      trample: { name: 'Trample', target: 'all-enemies', text: 'It goes through the party like a falling tree.', effects: [atk('1d8', 'crush')] },
      'rot-bellow': { name: 'Rot Bellow', target: 'all-enemies', text: 'A bellow that smells of grave-sap. CON save or Poisoned.', effects: [status('poisoned', { save: 'CON' })] },
      'antler-charge': { name: 'Antler Charge', target: 'enemy', charge: true, text: 'It lowers its head, charging.', effects: [atk('3d8', 'pierce', { riders: [status('staggered')] })] },
      'rotwood-crown': { name: 'Rotwood Crown', target: 'all-enemies', requires: 'rotwood-circlet', fallback: 'gore', text: 'Black sap weeps from the circlet: 2d6 blight to all, CON save for half, and the Stag drinks it.', effects: [{ type: 'damage', dice: '2d6', kind: 'blight', aspect: 'blight', save: 'CON' }, { type: 'heal', dice: '1d8', diceEvery: 2, self: true }] },
    },
    table: [[1, 4, 'gore'], [5, 6, 'trample'], [7, 8, 'rot-bellow'], [9, 10, 'antler-charge'], [11, 12, 'rotwood-crown']],
    text: 'Once the white stag of Fawnrest. The Rot got into its antlers, and something tangled a crown there.',
  },
  oldsnag: {
    id: 'oldsnag', name: 'Old Snag', art: 'oldsnag', tier: 'relic-bearer', kind: 'beast', unique: true,
    hp: 76, guard: 15, atk: 5, dmg: 3, speed: 10, armor: 'hide', aspect: null, resist: ['pierce'],
    saves: { STR: 4, DEX: 0, CON: 4, WIS: 1 },
    relics: ['thornsplitter'],
    moves: {
      tusk: { name: 'Tusk', target: 'enemy', text: 'A hooking rip of yellow tusk.', effects: [atk('2d8', 'slash')] },
      trample: { name: 'Trample', target: 'all-enemies', text: 'Four hundredweight of boar, going through.', effects: [atk('1d8', 'crush')] },
      bristle: { name: 'Bristle', target: 'self', text: 'Hackles up, head down: it Guards.', effects: [status('guarding')] },
      wallow: { name: 'Wallow', target: 'self', when: { hpBelow: 0.6 }, fallback: 'tusk', text: 'It rolls in the black mud and the wounds close: Regenerating.', effects: [status('regenerating', { value: { dice: '1d6', diceEvery: 3 } })] },
      'splitting-charge': { name: 'Splitting Charge', target: 'enemy', requires: 'thornsplitter', fallback: 'tusk', charge: true, text: 'The hatchet in its hide catches the light. It is charging.', effects: [atk('3d8', 'slash', { aspect: 'verdant', riders: [status('bleeding', { stacks: 2 })] })] },
    },
    table: [[1, 4, 'tusk'], [5, 6, 'trample'], [7, 7, 'bristle'], [8, 8, 'wallow'], [9, 12, 'splitting-charge']],
    text: 'A boar the size of a cart with a ranger\'s hatchet buried in its shoulder. It has not forgotten the ranger.',
  },
  briarmaw: {
    id: 'briarmaw', name: 'Briarmaw', art: 'briarmaw', tier: 'champion', kind: 'beast', unique: true,
    hp: 182, guard: 16, atk: 6, dmg: 3, speed: 12, armor: 'chitin', aspect: 'verdant',
    saves: { STR: 4, DEX: 1, CON: 4, WIS: 2 },
    relics: ['thornwreath', 'briarfang'],
    noFlee: true,
    moves: {
      maul: { name: 'Maul', target: 'enemy', text: 'Bark-clad claws the size of shovels.', effects: [atk('2d6', 'slash')] },
      'thorn-volley': { name: 'Thorn Volley', target: 'all-enemies', text: 'It shakes, and thorns fly like arrows.', effects: [atk('1d6', 'pierce')] },
      'call-the-briars': { name: 'Call the Briars', target: 'self', requires: 'thornwreath', fallback: 'maul', text: 'The thorn-crown pulses and a Briarling tears up out of the floor.', effects: [{ type: 'summon', family: 'briarling', count: 1, max: 2, levelDelta: -2 }] },
      'fang-rake': { name: 'Fang Rake', target: 'enemy', requires: 'briarfang', fallback: 'maul', text: 'The great fang opens you up: Bleeding.', effects: [atk('1d8', 'pierce', { riders: [status('bleeding', { stacks: 2 })] })] },
      'bramble-wall': { name: 'Bramble Wall', target: 'self', text: 'Bramble knits over its hide: Warded.', effects: [status('warded', { value: { dice: '3d6', diceEvery: 3 } })] },
      rootquake: { name: 'Rootquake', target: 'all-enemies', text: 'The den floor heaves: 2d6 verdant, STR save for half, and you are Rooted.', effects: [{ type: 'damage', dice: '2d6', kind: 'verdant', aspect: 'verdant', save: 'STR', riders: [status('rooted')] }] },
      devour: { name: 'Devour', target: 'enemy', charge: true, text: 'It opens its whole bramble-maw, charging.', effects: [atk('3d8', 'pierce')] },
      thornstorm: { name: 'Thornstorm', target: 'all-enemies', text: 'A storm of thorns: everyone Bleeds.', effects: [atk('1d8', 'pierce', { riders: [status('bleeding')] })] },
    },
    phases: [
      { at: 1, text: 'Briarmaw uncoils from the den wall.', table: [[1, 7, 'maul'], [8, 11, 'thorn-volley'], [12, 15, 'call-the-briars'], [16, 20, 'fang-rake']] },
      { at: 0.66, text: 'Briarmaw tears itself free of the den wall. The roots under your feet begin to move.', table: [[1, 5, 'maul'], [6, 8, 'thorn-volley'], [9, 11, 'rootquake'], [12, 13, 'bramble-wall'], [14, 16, 'call-the-briars'], [17, 20, 'fang-rake']] },
      { at: 0.33, text: 'The thorn-crown blazes green. Briarmaw stops holding anything back.', table: [[1, 4, 'maul'], [5, 8, 'thornstorm'], [9, 12, 'devour'], [13, 15, 'call-the-briars'], [16, 20, 'fang-rake']] },
    ],
    text: 'The beast on Captain Dael\'s bounty board that nobody could name. It wears a crown of thorns that grew there.',
  },

  // ---- M3: ten new families and the rival (spec §3.2). Scaffold stubs: stats and tables follow
  // the spec table; WP4 owns the final numbers, WP6A the art (FOE_ART aliases until then). ----
  smuggler: {
    id: 'smuggler', name: 'Smuggler', art: 'smuggler', tier: 'rabble', humanoid: true,
    hp: 17, guard: 14, atk: 3, dmg: 2, speed: 12, armor: 'hide', aspect: null,
    saves: { STR: 0, DEX: 2, CON: 0, WIS: 0 },
    moves: SMUGGLER_MOVES,
    table: [[1, 3, 'cut'], [4, 5, 'caltrops'], [6, 6, 'bolt']],
    variants: {
      queen: {
        name: 'Mags Kestrel', tier: 'relic-bearer', hp: 58, art: 'mags',
        moves: { ...SMUGGLER_MOVES, sleight: { name: 'Sleight', target: 'enemy', requires: 'lightfingers', fallback: 'cut', text: 'Lightfingers finds your purse and your ribs: 2d6, Marked, and Mags is Hasted.', effects: [atk('2d6', 'pierce', { riders: [status('marked')] }), status('hasted', { self: true })] } },
        table: [[1, 5, 'cut'], [6, 8, 'caltrops'], [9, 12, 'sleight']],
      },
    },
    gear: [
      [{ base: 'belt-knife' }, { base: 'hood' }],
      [{ base: 'belt-knife' }, { base: 'hood' }, { base: 'jerkin' }],
      [{ base: 'rondel' }, { base: 'mail-coif' }, { base: 'jerkin' }],
      [{ base: 'rondel' }, { base: 'mail-coif' }, { base: 'brigandine' }],
    ],
    text: 'Fen-runners with kerchiefs over their faces. They know every dry path, and every way out.',
  },
  boglurcher: {
    id: 'boglurcher', name: 'Boglurcher', art: 'boglurcher', tier: 'rabble', kind: 'beast',
    hp: 22, guard: 13, atk: 3, dmg: 2, speed: 9, armor: 'hide', aspect: 'tide', resist: ['crush'],
    saves: { STR: 2, DEX: 0, CON: 2, WIS: 0 },
    moves: {
      slam: { name: 'Slam', target: 'enemy', text: 'A wet mound of marsh falls on you.', effects: [atk('1d8', 'crush')] },
      'mire-grab': { name: 'Mire Grab', target: 'enemy', text: 'Mud-hands grab your ankles. STR save or Rooted.', effects: [atk('1d6', 'crush'), status('rooted', { save: 'STR' })] },
      'drag-under': { name: 'Drag Under', target: 'enemy', charge: true, text: 'It sinks low, charging to drag you under.', effects: [atk('2d8', 'crush', { aspect: 'tide' })] },
    },
    table: [[1, 3, 'slam'], [4, 5, 'mire-grab'], [6, 6, 'drag-under']],
    text: 'A heap of bog with eyes in it. It was lying in wait before you knew it was there.',
  },
  glowcap: {
    id: 'glowcap', name: 'Glowcap', art: 'glowcap', tier: 'rabble', kind: 'plant',
    hp: 14, guard: 12, atk: 3, dmg: 1, speed: 8, armor: 'hide', aspect: 'verdant',
    saves: { STR: 0, DEX: 0, CON: 2, WIS: 0 },
    moves: {
      headbutt: { name: 'Headbutt', target: 'enemy', text: 'A spongy, surprisingly heavy cap.', effects: [atk('1d6', 'crush')] },
      'spore-puff': { name: 'Spore Puff', target: 'all-enemies', text: 'A cloud of glowing spores. CON save or Poisoned.', effects: [status('poisoned', { save: 'CON' })] },
      glow: { name: 'Glow', target: 'self', text: 'Its gills blaze: Warded.', effects: [status('warded', { value: { dice: '1d6', diceEvery: 3 } })] },
    },
    table: [[1, 3, 'headbutt'], [4, 5, 'spore-puff'], [6, 6, 'glow']],
    text: 'Mushrooms the size of children that walk toward light. Any light.',
  },
  rotgrub: {
    id: 'rotgrub', name: 'Rotgrub', art: 'rotgrub', tier: 'rabble', kind: 'beast',
    hp: 15, guard: 13, atk: 3, dmg: 1, speed: 11, armor: 'chitin', aspect: 'blight',
    saves: { STR: 0, DEX: 1, CON: 2, WIS: 0 },
    moves: {
      latch: { name: 'Latch', target: 'enemy', text: 'It latches on: Bleeding.', effects: [atk('1d6', 'pierce', { riders: [status('bleeding')] })] },
      'ichor-spit': { name: 'Ichor Spit', target: 'enemy', text: 'Black spit: 2 stacks of Poisoned.', effects: [atk('1d4', 'pierce', { aspect: 'blight', riders: [status('poisoned', { stacks: 2 })] })] },
      burrow: { name: 'Burrow', target: 'self', text: 'It burrows into the root-mulch: Guarding.', effects: [status('guarding')] },
    },
    table: [[1, 3, 'latch'], [4, 5, 'ichor-spit'], [6, 6, 'burrow']],
    text: 'Pale grubs as long as your arm, fat on the black sap of the eldest trees.',
  },
  'feral-druid': {
    id: 'feral-druid', name: 'Feral Druid', art: 'feral-druid', tier: 'veteran', humanoid: true,
    hp: 26, guard: 14, atk: 4, dmg: 2, speed: 10, armor: 'hide', aspect: 'verdant',
    saves: { STR: 0, DEX: 1, CON: 1, WIS: 2 },
    moves: DRUID_MOVES,
    table: [[1, 4, 'thorn-lash'], [5, 6, 'barkskin'], [7, 8, 'call-the-briars']],
    variants: {
      thornmother: {
        name: 'Oda the Thornmother', tier: 'relic-bearer', hp: 70, art: 'oda',
        moves: { ...DRUID_MOVES, 'rising-sap': { name: 'Rising Sap', target: 'all-allies', requires: 'rootsong', fallback: 'thorn-lash', text: 'Rootsong hums: every foe heals 2d6 and Regenerates.', effects: [{ type: 'heal', dice: '2d6', diceEvery: 3 }, status('regenerating', { value: { dice: '1d6', diceEvery: 3 } })] } },
        table: [[1, 5, 'thorn-lash'], [6, 7, 'barkskin'], [8, 9, 'call-the-briars'], [10, 12, 'rising-sap']],
      },
    },
    gear: [
      [{ base: 'quarterstaff' }, { base: 'hood' }, { base: 'robe' }],
      [{ base: 'quarterstaff' }, { base: 'hood' }, { base: 'robe' }],
      [{ base: 'rowan-staff' }, { base: 'circlet' }, { base: 'robe' }],
      [{ base: 'rowan-staff' }, { base: 'circlet' }, { base: 'robe' }, { base: 'gloves' }],
    ],
    text: 'Eldergrove druids who stopped listening to the trees and started answering the Rot.',
  },
  'hollowed-ranger': {
    id: 'hollowed-ranger', name: 'Hollowed Ranger', art: 'hollowed-ranger', tier: 'veteran', humanoid: true,
    hp: 28, guard: 15, atk: 4, dmg: 2, speed: 11, armor: 'hide', aspect: 'blight',
    saves: { STR: 1, DEX: 2, CON: 1, WIS: 0 },
    moves: RANGER_MOVES,
    table: [[1, 4, 'rot-arrow'], [5, 6, 'knife'], [7, 8, 'remember']],
    variants: {
      sergeant: {
        name: 'Sgt Corra Thistle', tier: 'relic-bearer', hp: 72, art: 'corra',
        moves: { ...RANGER_MOVES, 'hold-the-line': { name: 'Hold the Line', target: 'all-allies', requires: 'oathshield', fallback: 'rot-arrow', text: 'The Oathshield comes up and the patrol closes ranks: Warded.', effects: [status('warded', { value: { dice: '3d6', diceEvery: 3 } })] } },
        table: [[1, 5, 'rot-arrow'], [6, 7, 'knife'], [8, 8, 'remember'], [9, 12, 'hold-the-line']],
      },
    },
    gear: [
      [{ base: 'shortbow' }, { base: 'hood' }, { base: 'jerkin' }],
      [{ base: 'shortbow' }, { base: 'hood' }, { base: 'jerkin' }, { base: 'boots' }],
      [{ base: 'longbow' }, { base: 'hood' }, { base: 'brigandine' }, { base: 'boots' }],
      [{ base: 'longbow' }, { base: 'mail-coif' }, { base: 'brigandine' }, { base: 'ironshod-boots' }],
    ],
    text: 'The last Thornwatch patrol. The Rot kept them walking after they stopped being themselves.',
  },
  sapwight: {
    id: 'sapwight', name: 'Sapwight', art: 'sapwight', tier: 'veteran', kind: 'plant',
    hp: 32, guard: 14, atk: 4, dmg: 2, speed: 9, armor: 'plate', aspect: 'blight',
    saves: { STR: 2, DEX: 0, CON: 2, WIS: 1 },
    moves: {
      'sap-leech': { name: 'Sap Leech', target: 'enemy', text: 'Bark fingers drink from you, and it heals.', effects: [{ type: 'damage', dice: '1d8', kind: 'blight', aspect: 'blight' }, { type: 'heal', dice: '1d8', self: true }] },
      grasp: { name: 'Grasp', target: 'enemy', text: 'Root-arms close. STR save or Rooted.', effects: [status('rooted', { save: 'STR' })] },
      'bark-hide': { name: 'Bark Hide', target: 'self', text: 'Its bark thickens: Guarding.', effects: [status('guarding')] },
    },
    table: [[1, 4, 'sap-leech'], [5, 6, 'grasp'], [7, 8, 'bark-hide']],
    text: 'A ghoul of bark and black sap. It used to be someone the Heartroot drank.',
  },
  gloamwing: {
    id: 'gloamwing', name: 'The Gloamwing', art: 'gloamwing', tier: 'relic-bearer', kind: 'beast', unique: true,
    hp: 180, guard: 15, atk: 6, dmg: 4, speed: 13, armor: 'hide', aspect: 'radiant', weak: ['ember'],
    saves: { STR: 1, DEX: 3, CON: 2, WIS: 3 },
    relics: ['dawnbell'],
    moves: {
      'wing-buffet': { name: 'Wing Buffet', target: 'enemy', text: 'Pale wings hit like a door slammed in a gale.', effects: [atk('2d6', 'crush')] },
      dreamdust: { name: 'Dreamdust', target: 'all-enemies', text: 'Scales like snow. WIS save or Frightened.', effects: [status('frightened', { save: 'WIS' })] },
      cocoon: { name: 'Cocoon', target: 'self', when: { hpBelow: 0.5 }, fallback: 'wing-buffet', text: 'It wraps itself in silk: Regenerating.', effects: [status('regenerating', { value: { dice: '1d6', diceEvery: 3 } })] },
      'bell-hum': { name: 'Bell-Hum', target: 'all-enemies', requires: 'dawnbell', fallback: 'wing-buffet', text: 'The Dawnbell hums on its thorax: 2d6 radiant to all, and you Stagger.', effects: [{ type: 'damage', dice: '2d6', kind: 'radiant', aspect: 'radiant', riders: [status('staggered')] }] },
    },
    table: [[1, 4, 'wing-buffet'], [5, 7, 'dreamdust'], [8, 8, 'cocoon'], [9, 12, 'bell-hum']],
    text: 'A pale moth the size of a cart, with the Fawnrest bell spun into the silk on its thorax.',
  },
  mirelord: {
    id: 'mirelord', name: 'Gorrow the Mire-King', art: 'mirelord', tier: 'relic-bearer', kind: 'beast', unique: true,
    hp: 110, guard: 15, atk: 5, dmg: 3, speed: 9, armor: 'hide', aspect: 'tide', resist: ['crush'],
    saves: { STR: 4, DEX: 0, CON: 4, WIS: 1 },
    relics: ['mire-pearl'],
    moves: {
      'belly-flop': { name: 'Belly-Flop', target: 'all-enemies', text: 'The Mire-King lands on everyone at once.', effects: [atk('1d8', 'crush')] },
      'drag-under': { name: 'Drag Under', target: 'enemy', charge: true, text: 'A tongue like a hawser, charging to drag you under.', effects: [atk('3d8', 'crush', { riders: [status('rooted')] })] },
      wallow: { name: 'Wallow', target: 'self', text: 'It settles into the mire: Regenerating.', effects: [status('regenerating', { value: { dice: '1d6', diceEvery: 3 } })] },
      undertow: { name: 'Undertow', target: 'all-enemies', requires: 'mire-pearl', fallback: 'belly-flop', text: 'The pearl glows in its reed crown: 2d6 tide to all, and you are Chilled.', effects: [{ type: 'damage', dice: '2d6', kind: 'tide', aspect: 'tide', riders: [status('chilled')] }] },
    },
    table: [[1, 4, 'belly-flop'], [5, 7, 'drag-under'], [8, 8, 'wallow'], [9, 12, 'undertow']],
    text: 'A frog-king as wide as a hut, with the Mire Pearl set in a crown of reeds.',
  },
  rotwarden: {
    id: 'rotwarden', name: 'The Rotwarden', art: 'rotwarden', tier: 'champion', kind: 'beast', unique: true,
    hp: 200, guard: 16, atk: 6, dmg: 3, speed: 10, armor: 'plate', aspect: 'blight',
    saves: { STR: 4, DEX: 1, CON: 4, WIS: 3 },
    relics: ['ichor-mask', 'first-seed'],
    noFlee: true,
    moves: {
      rootlash: { name: 'Rootlash', target: 'enemy', text: 'A root as thick as a mast lashes out.', effects: [atk('2d8', 'slash')] },
      'bark-hide': { name: 'Bark Hide', target: 'self', text: 'Plate and bark grow together: Warded.', effects: [status('warded', { value: { dice: '3d6', diceEvery: 3 } })] },
      graft: { name: 'Graft', target: 'self', requires: 'first-seed', fallback: 'rootlash', text: 'The First Seed pulses, and a Sapwight tears out of the wall.', effects: [{ type: 'summon', family: 'sapwight', count: 1, max: 2, levelDelta: -3 }] },
      blacken: { name: 'Blacken the Sap', target: 'all-enemies', requires: 'ichor-mask', fallback: 'rootlash', text: 'The mask weeps black: 2d8 blight to all, and it drinks.', effects: [{ type: 'damage', dice: '2d8', kind: 'blight', aspect: 'blight' }, { type: 'heal', dice: '1d8', diceEvery: 2, self: true }] },
      'grasping-roots': { name: 'Grasping Roots', target: 'all-enemies', text: 'The floor reaches up. STR save or Rooted.', effects: [status('rooted', { save: 'STR' })] },
      'ichor-tide': { name: 'Ichor Tide', target: 'all-enemies', text: 'Black sap floods the chamber: 2 stacks of Poisoned.', effects: [atk('1d8', 'crush', { aspect: 'blight', riders: [status('poisoned', { stacks: 2 })] })] },
      'heartroot-bloom': { name: 'Heartroot Bloom', target: 'self', requires: 'first-seed', fallback: 'rootlash', text: 'The Seed blooms: Regenerating.', effects: [status('regenerating', { value: { dice: '3d6', diceEvery: 3 } })] },
      'ichor-rain': { name: 'Ichor Rain', target: 'all-enemies', requires: 'ichor-mask', fallback: 'grief', text: 'It rains sap from the roots: 2d6 blight and Poisoned.', effects: [{ type: 'damage', dice: '2d6', kind: 'blight', aspect: 'blight', riders: [status('poisoned')] }] },
      devour: { name: 'Devour', target: 'enemy', charge: true, text: 'The bark splits into a maw, charging.', effects: [atk('3d10', 'crush')] },
      unmaking: { name: 'Unmaking', target: 'enemy', requires: 'ichor-mask', fallback: 'grief', charge: true, text: 'The mask turns to one of you, charging.', effects: [{ type: 'damage', dice: '4d8', kind: 'blight', aspect: 'blight' }] },
      grief: { name: 'Grief', target: 'all-enemies', text: 'It weeps sap. Something under the wood says "Thank you."', effects: [{ type: 'damage', dice: '1d6', kind: 'blight', aspect: 'blight' }] },
    },
    phases: [
      { at: 1, text: 'The Warden Keeps.', table: [[1, 7, 'rootlash'], [8, 11, 'bark-hide'], [12, 15, 'graft'], [16, 20, 'blacken']] },
      { at: 0.66, text: 'The Roots Answer.', table: [[1, 5, 'rootlash'], [6, 9, 'grasping-roots'], [10, 12, 'ichor-tide'], [13, 15, 'heartroot-bloom'], [16, 20, 'blacken']] },
      { at: 0.33, text: 'The Mask Speaks.', table: [[1, 4, 'rootlash'], [5, 9, 'ichor-rain'], [10, 14, 'devour'], [15, 20, 'unmaking']] },
    ],
    text: 'A First-Age warden of the root, bark grown through its plate, wearing a smith\'s mask that is not its face.',
  },
  // The rival (not one of the 18 families). Variants are keyed by the rival starter id (`$rival`).
  tamsin: {
    id: 'tamsin', name: 'Tamsin', art: 'tamsin', tier: 'relic-bearer', humanoid: true, unique: true,
    hp: 90, guard: 15, atk: 5, dmg: 2, speed: 15, armor: 'hide', aspect: null,
    saves: { STR: 2, DEX: 2, CON: 1, WIS: 1 },
    moves: TAMSIN_MOVES,
    table: [[1, 3, 'riposte'], [4, 5, 'cheap-shot'], [6, 6, 'showboat'], [7, 7, 'parry'], [8, 11, 'riposte'], [12, 12, 'not-like-this']],
    variants: {
      hearthbrand: {
        moves: { ...TAMSIN_MOVES, 'kindled-cut': { name: 'Kindled Cut', target: 'enemy', requires: 'hearthbrand', fallback: 'riposte', text: 'Hearthbrand, in someone else\'s hand: 2d8 ember and Burning.', effects: [atk('2d8', 'slash', { aspect: 'ember', riders: [status('burning')] })] } },
        table: [[1, 3, 'riposte'], [4, 5, 'cheap-shot'], [6, 6, 'showboat'], [7, 7, 'parry'], [8, 11, 'kindled-cut'], [12, 12, 'not-like-this']],
      },
      'stillwater-lance': {
        moves: { ...TAMSIN_MOVES, 'still-point': { name: 'Still Point', target: 'enemy', requires: 'stillwater-lance', fallback: 'riposte', text: 'The Lance goes very still, then very fast: 2d8 frost and 2 stacks of Chilled.', effects: [atk('2d8', 'pierce', { aspect: 'frost', riders: [status('chilled', { stacks: 2 })] })] } },
        table: [[1, 3, 'riposte'], [4, 5, 'cheap-shot'], [6, 6, 'showboat'], [7, 7, 'parry'], [8, 11, 'still-point'], [12, 12, 'not-like-this']],
      },
      cairnmaul: {
        moves: { ...TAMSIN_MOVES, 'cairn-swing': { name: 'Cairn Swing', target: 'enemy', requires: 'cairnmaul', fallback: 'riposte', charge: true, text: 'She hefts the Cairnmaul, charging a swing that Staggers.', effects: [atk('3d10', 'crush', { riders: [status('staggered')] })] } },
        table: [[1, 3, 'riposte'], [4, 5, 'cheap-shot'], [6, 6, 'showboat'], [7, 7, 'parry'], [8, 11, 'cairn-swing'], [12, 12, 'not-like-this']],
      },
    },
    gear: [
      [{ base: 'arming-sword' }, { base: 'hood' }, { base: 'jerkin' }],
      [{ base: 'arming-sword' }, { base: 'hood' }, { base: 'brigandine' }],
      [{ base: 'longsword' }, { base: 'mail-coif' }, { base: 'brigandine' }],
      [{ base: 'longsword' }, { base: 'mail-coif' }, { base: 'chain-shirt' }],
    ],
    text: 'The Keep\'s other Warden. Isolde sent her in first. She has not forgiven anyone for that yet.',
  },
};

// ---- M4: the Sunscorch Wastes (spec §3.2; owner P4). Stats are for level 1, like everything above; the
// Waking adds the rest (a player meets these at Waking 2 or 3). Sand in the Eyes blinds with Frightened
// (docs/RULES.md §5). M5 (spec §2.4) made three M4 approximations exact with the new statuses: a wisp's
// Beguile charms (`charmed`), the Wyrm swallows you whole (`swallowed`), and Kharzul's Burrow takes it under
// the floor (`burrowed`), then `then: 'erupt'` brings it up under someone, after which it lies half-buried.
const RAIDER_MOVES = {
  'scimitar-cut': { name: 'Scimitar Cut', target: 'enemy', text: 'A curved blade, drawn and swung in the same breath.', effects: [atk('1d6', 'slash', { weapon: true })] },
  'sand-in-the-eyes': { name: 'Sand in the Eyes', target: 'enemy', text: 'A fistful of hot sand flung from the saddle. DEX save or you fight half-blind (Frightened).', effects: [status('frightened', { save: 'DEX' })] },
  'dune-charge': { name: 'Dune Charge', target: 'enemy', charge: true, text: 'It wheels back up the dune and comes down at you, charging.', effects: [atk('1d6', 'slash', { weapon: true, bonusDice: [{ dice: '1d8' }], riders: [status('staggered')] })] },
  'war-cry': { name: 'War-Cry', target: 'all-allies', text: 'A cry like thunder rolling off the dunes: every raider is Hasted.', effects: [status('hasted')] },
};
const SCORPION_MOVES = {
  pincer: { name: 'Pincer', target: 'enemy', text: 'A glass claw closes on you like a vice.', effects: [atk('1d6', 'crush')] },
  'glass-sting': { name: 'Glass Sting', target: 'enemy', text: 'The glass stinger punches through armour and snaps off in the wound: Bleeding.', effects: [atk('1d8', 'pierce', { riders: [status('bleeding')] })] },
  carapace: { name: 'Carapace', target: 'self', text: 'It hunkers down under its glassy shell: Guarding.', effects: [status('guarding')] },
};
const WISP_MOVES = {
  'cold-touch': { name: 'Cold Touch', target: 'enemy', text: 'A touch like well-water at midnight: Chilled.', effects: [atk('1d8', 'frost', { aspect: 'frost', riders: [status('chilled')] })] },
  blink: { name: 'Blink', target: 'self', text: 'It blinks out and back a step to the left, and your blow finds shimmer: Guarding.', effects: [status('guarding')] },
  beguile: { name: 'Beguile', target: 'enemy', text: 'It shows you water where there is none, and a friend where the mirage is. WIS save or Charmed.', effects: [status('charmed', { save: 'WIS' })] },
};
const WIGHT_MOVES = {
  'ash-blade': { name: 'Ash Blade', target: 'enemy', text: 'A blade still hot from the fire that killed the hand holding it.', effects: [atk('1d6', 'slash', { weapon: true })] },
  'cinder-grasp': { name: 'Cinder Grasp', target: 'enemy', text: 'A burnt hand closes on yours and drinks the warmth out of it. It heals.', effects: [{ type: 'damage', dice: '1d6', kind: 'ember', aspect: 'ember' }, { type: 'heal', dice: '1d8', self: true }] },
  'ember-breath': { name: 'Ember Breath', target: 'enemy', text: 'It breathes on you, and three hundred years of ember breathe with it. DEX save or Burning.', effects: [{ type: 'damage', dice: '1d6', kind: 'ember', aspect: 'ember', save: 'DEX', riders: [status('burning')] }] },
};

// a named holder: a relic-bearer variant of its family, using its relic through requires/fallback moves
const holder = (name, art, hp, moves, table, o = {}) => ({ name, art, tier: 'relic-bearer', hp, moves, table, ...o });

const SUNSCORCH = {
  'sand-skink': {
    id: 'sand-skink', name: 'Sand-Skink', art: 'sand-skink', tier: 'rabble', kind: 'beast',
    hp: 14, guard: 14, atk: 4, dmg: 1, speed: 15, armor: 'hide', aspect: 'ember',
    saves: { STR: 0, DEX: 3, CON: 0, WIS: 0 },
    moves: {
      bite: { name: 'Bite', target: 'enemy', text: 'Needle teeth, hot as a stove lid.', effects: [atk('1d6', 'pierce')] },
      'sun-spit': { name: 'Sun-Spit', target: 'enemy', text: 'A gob of sun-hot venom: Burning.', effects: [atk('1d4', 'pierce', { aspect: 'ember', riders: [status('burning')] })] },
      skitter: { name: 'Skitter', target: 'self', when: { hpBelow: 0.5 }, fallback: 'bite', text: 'It skitters under a rock and is gone.', effects: [{ type: 'escape' }] },
    },
    table: [[1, 3, 'bite'], [4, 5, 'sun-spit'], [6, 6, 'skitter']],
    text: 'Quick little lizards the colour of hot sand. They bite, they spit, and they run.',
  },
  scavenger: {
    id: 'scavenger', name: 'Dune Scavenger', art: 'scavenger', tier: 'rabble', humanoid: true,
    hp: 17, guard: 13, atk: 3, dmg: 2, speed: 11, armor: 'hide', aspect: null,
    saves: { STR: 1, DEX: 1, CON: 1, WIS: 0 },
    moves: {
      'hook-knife': { name: 'Hook-Knife', target: 'enemy', text: 'A wrecker\'s hook, for cutting straps and purses.', effects: [atk('1d4', 'slash', { weapon: true })] },
      'salvage-net': { name: 'Salvage Net', target: 'enemy', text: 'A weighted net off a wrecked wagon. DEX save or Rooted.', effects: [status('rooted', { save: 'DEX' })] },
      scarper: { name: 'Scarper', target: 'self', when: { hpBelow: 0.5 }, fallback: 'hook-knife', text: 'It drops the sack and scarpers over the dune.', effects: [{ type: 'escape' }] },
    },
    table: [[1, 3, 'hook-knife'], [4, 5, 'salvage-net'], [6, 6, 'scarper']],
    gear: [
      [{ base: 'belt-knife' }, { base: 'hood' }],
      [{ base: 'hand-axe' }, { base: 'hood' }, { base: 'jerkin' }],
      [{ base: 'spear' }, { base: 'kettle-helm' }, { base: 'jerkin' }],
      [{ base: 'spear' }, { base: 'kettle-helm' }, { base: 'brigandine' }],
    ],
    text: 'Wreck-pickers of the caravan roads, wrapped to the eyes against the sun. They run when it goes badly.',
  },
  'dune-raider': {
    id: 'dune-raider', name: 'Dune Raider', art: 'dune-raider', tier: 'veteran', humanoid: true,
    hp: 22, guard: 15, atk: 3, dmg: 2, speed: 12, armor: 'hide', aspect: 'storm',
    saves: { STR: 1, DEX: 2, CON: 1, WIS: 0 },
    names: ['Qadir', 'Sefa Half-Veil', 'Ninefingers', 'Old Harrow', 'Duma the Dry'],
    moves: RAIDER_MOVES,
    table: [[1, 3, 'scimitar-cut'], [4, 5, 'sand-in-the-eyes'], [6, 7, 'dune-charge'], [8, 8, 'war-cry']],
    variants: {
      rider: holder('Rasa the Dune-Rider', 'rasa', 62, {
        ...RAIDER_MOVES,
        'dune-step': { name: 'Dune-Step', target: 'enemy', requires: 'sandwalkers', fallback: 'scimitar-cut', text: 'Sandwalkers skim the dune and she is behind you before you turn: 2d8 slashing, you Stagger, and Rasa is Hasted.', effects: [atk('2d8', 'slash', { riders: [status('staggered')] }), status('hasted', { self: true })] },
      }, [[1, 4, 'scimitar-cut'], [5, 6, 'sand-in-the-eyes'], [7, 8, 'dune-charge'], [9, 12, 'dune-step']], { speed: 14 }),
      'raider-king': holder('Gnash the Raider-King', 'gnash', 92, {
        ...RAIDER_MOVES,
        'kings-blow': { name: 'King\'s Blow', target: 'enemy', text: 'Whatever is in his hands, he swings it like a door.', effects: [atk('1d8', 'crush', { weapon: true })] },
        'dunefall': { name: 'Dunefall', target: 'all-enemies', requires: 'dunebreaker', fallback: 'kings-blow', charge: true, text: 'Gnash hefts Dunebreaker over his head, charging: the whole dune comes down on every hero, and you Stagger.', effects: [atk('2d6', 'crush', { aspect: 'stone', riders: [status('staggered')] })] },
      }, [[1, 5, 'kings-blow'], [6, 7, 'sand-in-the-eyes'], [8, 8, 'war-cry'], [9, 12, 'dunefall']], { speed: 9, atk: 5, dmg: 3 }),
    },
    gear: [
      [{ base: 'arming-sword' }, { base: 'hood' }, { base: 'jerkin' }],
      [{ base: 'arming-sword' }, { base: 'hood' }, { base: 'jerkin' }, { base: 'buckler' }],
      [{ base: 'arming-sword' }, { base: 'kettle-helm' }, { base: 'brigandine' }, { base: 'buckler' }],
      [{ base: 'longsword' }, { base: 'kettle-helm' }, { base: 'brigandine' }, { base: 'heater-shield' }],
    ],
    text: 'Riders of the deep dunes, faces wrapped, blades curved like the moon. The caravans pay them or pray.',
  },
  'glass-scorpion': {
    id: 'glass-scorpion', name: 'Glass Scorpion', art: 'glass-scorpion', tier: 'veteran', kind: 'beast',
    hp: 28, guard: 16, atk: 4, dmg: 2, speed: 11, armor: 'none', aspect: 'stone',
    saves: { STR: 2, DEX: 1, CON: 2, WIS: 0 },
    moves: SCORPION_MOVES,
    table: [[1, 3, 'pincer'], [4, 6, 'glass-sting'], [7, 8, 'carapace']],
    variants: {
      // the Aqueduct Matriarch: a lair boss with no relic (spec §3.3: the cistern quest)
      matriarch: holder('The Glass Matriarch', 'glass-matriarch', 80, {
        ...SCORPION_MOVES,
        moult: { name: 'Moult', target: 'self', when: { hpBelow: 0.5 }, fallback: 'glass-sting', text: 'She splits her cracked shell and steps out of it: Regenerating.', effects: [status('regenerating', { value: { dice: '1d6', diceEvery: 3 } })] },
        'shell-rain': { name: 'Shell Rain', target: 'all-enemies', text: 'She shakes the aqueduct, and a season of shed shells comes down on everyone: Bleeding.', effects: [atk('1d10', 'pierce', { riders: [status('bleeding')] })] },
      }, [[1, 3, 'pincer'], [4, 7, 'glass-sting'], [8, 8, 'carapace'], [9, 9, 'moult'], [10, 12, 'shell-rain']], { atk: 5 }),
    },
    text: 'A scorpion the size of a dog, its shell gone to cloudy glass in the heat. It clicks when it is hungry. It is always clicking.',
  },
  'mirage-wisp': {
    id: 'mirage-wisp', name: 'Mirage Wisp', art: 'mirage-wisp', tier: 'veteran', kind: 'spirit',
    hp: 22, guard: 16, atk: 5, dmg: 3, speed: 13, armor: 'none', aspect: 'frost',
    saves: { STR: 0, DEX: 3, CON: 1, WIS: 2 },
    moves: WISP_MOVES,
    table: [[1, 5, 'cold-touch'], [6, 6, 'blink'], [7, 8, 'beguile']],
    variants: {
      queen: holder('The Wisp-Queen', 'wisp-queen', 72, {
        ...WISP_MOVES,
        'drink-the-well': { name: 'Drink the Well', target: 'self', when: { hpBelow: 0.5 }, fallback: 'cold-touch', text: 'She drinks from the well until the bucket comes up dry: 2d8 healing.', effects: [{ type: 'heal', dice: '2d8', diceEvery: 3 }] },
        'hall-of-mirrors': { name: 'Hall of Mirrors', target: 'all-enemies', requires: 'mirage-glass', fallback: 'cold-touch', text: 'The Mirage Glass flashes and there are a hundred queens: 2d8 frost to every hero, WIS save for half, and you are Chilled.', effects: [{ type: 'damage', dice: '2d8', kind: 'frost', aspect: 'frost', save: 'WIS', riders: [status('chilled')] }] },
      }, [[1, 5, 'cold-touch'], [6, 6, 'blink'], [7, 7, 'beguile'], [8, 8, 'drink-the-well'], [9, 12, 'hall-of-mirrors']], { speed: 15 }),
    },
    text: 'A shimmer that walks on its own. It looks like water until it bites, and it bites cold.',
  },
  'ash-wight': {
    id: 'ash-wight', name: 'Ash-Wight', art: 'ash-wight', tier: 'veteran', kind: 'undead', humanoid: true,
    hp: 18, guard: 13, atk: 2, dmg: 1, speed: 9, armor: 'mail', aspect: 'ember', weak: ['radiant'],
    saves: { STR: 2, DEX: 0, CON: 2, WIS: 1 },
    names: ['Sergeant Cole', 'Tamber of the Gate', 'the Standard-Bearer', 'Old Watch'],
    moves: WIGHT_MOVES,
    table: [[1, 4, 'ash-blade'], [5, 6, 'cinder-grasp'], [7, 8, 'ember-breath']],
    variants: {
      captain: holder('The Ash-Captain', 'ash-captain', 50, {
        ...WIGHT_MOVES,
        'fall-in': { name: 'Fall In!', target: 'all-allies', text: 'Three hundred years dead and still barking orders: every wight is Warded.', effects: [status('warded', { value: { dice: '1d6', diceEvery: 4 } })] },
        'keyless-turn': { name: 'The Keyless Turn', target: 'all-enemies', requires: 'scorchgate-key', fallback: 'ash-blade', text: 'He turns the ring that has no key on it, and every lock in Scorchgate answers: 2d6 ember to every hero, CON save for half, and you Burn.', effects: [{ type: 'damage', dice: '2d6', kind: 'ember', aspect: 'ember', save: 'CON', riders: [status('burning')] }] },
      }, [[1, 4, 'ash-blade'], [5, 6, 'cinder-grasp'], [7, 7, 'ember-breath'], [8, 8, 'fall-in'], [9, 12, 'keyless-turn']]),
    },
    gear: [
      [{ base: 'spear' }, { base: 'kettle-helm' }, { base: 'chain-shirt' }],
      [{ base: 'spear' }, { base: 'kettle-helm' }, { base: 'chain-shirt' }, { base: 'buckler' }],
      [{ base: 'arming-sword' }, { base: 'great-helm' }, { base: 'hauberk' }, { base: 'buckler' }],
      [{ base: 'arming-sword' }, { base: 'great-helm' }, { base: 'hauberk' }, { base: 'heater-shield' }],
    ],
    text: 'A soldier of Scorchgate still on watch, three hundred years after the fire. The ash holds the shape of the man.',
  },
  'sand-wyrm': {
    id: 'sand-wyrm', name: 'The Sand Wyrm', art: 'sand-wyrm', tier: 'relic-bearer', kind: 'beast', unique: true,
    hp: 162, guard: 15, atk: 6, dmg: 4, speed: 12, armor: 'chitin', aspect: 'stone',
    saves: { STR: 4, DEX: 1, CON: 4, WIS: 1 },
    relics: ['wyrmscale'],
    moves: {
      maw: { name: 'Maw', target: 'enemy', text: 'A mouth like a well, lined with glass teeth.', effects: [atk('2d10', 'pierce')] },
      thrash: { name: 'Thrash', target: 'all-enemies', text: 'It thrashes, and the sinkhole walls come down on everyone.', effects: [atk('1d8', 'crush')] },
      'sand-dive': { name: 'Sand-Dive', target: 'self', text: 'It pours itself back into the sand, and blows glance off: Guarding.', effects: [status('guarding')] },
      swallow: { name: 'Swallow', target: 'enemy', charge: true, text: 'The sand opens underneath you. It is charging to swallow you whole, until it has had enough of you or you hit it hard enough to make it spit.', effects: [atk('3d10', 'crush', { riders: [status('swallowed', { label: 'Swallowed' })] })] },
      'scale-grind': { name: 'Scale-Grind', target: 'all-enemies', requires: 'wyrmscale', fallback: 'maw', text: 'It grinds the great scale in its hide against the sinkhole wall: 2d8 stone to every hero, STR save for half, and the sand has you to the knees (Rooted).', effects: [{ type: 'damage', dice: '2d8', kind: 'crush', aspect: 'stone', save: 'STR', riders: [status('rooted')] }] },
    },
    table: [[1, 3, 'maw'], [4, 6, 'thrash'], [7, 7, 'sand-dive'], [8, 9, 'swallow'], [10, 12, 'scale-grind']],
    text: 'It swims in the sand under the Dust Trail and waits for the wagons. One scale in its hide is the size of a door, and it glints.',
  },
  // Champions (spec §3.5). Each piece is a held relic with its own grip meter; prying one loose shuts its moves down.
  kharzul: {
    id: 'kharzul', name: 'Kharzul the Glass Scorpion', art: 'kharzul', tier: 'champion', kind: 'beast', unique: true,
    hp: 200, guard: 19, atk: 7, dmg: 3, speed: 11, armor: 'chitin', aspect: 'stone',
    saves: { STR: 4, DEX: 2, CON: 4, WIS: 2 },
    relics: ['cinderfang', 'glass-carapace'],
    noFlee: true,
    moves: {
      'tail-lash': { name: 'Tail Lash', target: 'enemy', text: 'The tail comes over like a thrown spear.', effects: [atk('2d10', 'pierce')] },
      'glass-sting': { name: 'Glass Sting', target: 'enemy', text: 'The stinger punches through plate and snaps off in the wound: 2 stacks of Bleeding.', effects: [atk('1d10', 'pierce', { riders: [status('bleeding', { stacks: 2 })] })] },
      glasscutter: { name: 'Glasscutter', target: 'all-enemies', requires: 'cinderfang', fallback: 'tail-lash', charge: true, text: 'Cinderfang comes round in one long arc, charging: a cut at every hero, and every cut Burns.', effects: [atk('2d8', 'slash', { aspect: 'ember', riders: [status('burning')] })] },
      burrow: { name: 'Burrow', target: 'self', then: 'erupt', text: 'It goes down into the glass floor as if it were water. Nothing can reach it until it comes up.', effects: [status('burrowed', { self: true })] },
      erupt: { name: 'Erupt', target: 'enemy', charge: true, text: 'The glass floor bursts under you, charging: 4d10 piercing, a spray of glass that Bleeds (two stacks), and you Stagger. Then it lies half-buried (Guarding).', effects: [atk('4d10', 'pierce', { riders: [status('staggered'), status('bleeding', { stacks: 2 })] }), status('guarding', { self: true })] },
      'carapace-brace': { name: 'Carapace Brace', target: 'self', requires: 'glass-carapace', fallback: 'tail-lash', text: 'The Glass Carapace locks plate over plate: Guarding, and Warded until the glass gives.', effects: [status('guarding'), status('warded', { value: { dice: '3d6', diceEvery: 3 } })] },
      'glass-rain': { name: 'Glass Rain', target: 'all-enemies', text: 'The ceiling of the Glass Heart comes down in needles: 2d6 piercing to every hero, DEX save for half, and you Bleed.', effects: [{ type: 'damage', dice: '2d6', kind: 'pierce', save: 'DEX', riders: [status('bleeding')] }] },
      'molten-tail': { name: 'Molten Tail', target: 'enemy', requires: 'cinderfang', fallback: 'glass-sting', text: 'Cinderfang glows white in the tail: 3d8 ember, and you Burn.', effects: [atk('3d8', 'slash', { aspect: 'ember', riders: [status('burning')] })] },
    },
    phases: [
      { at: 1, text: 'The Glass Wakes. Kharzul uncoils from the heart of the cavern, and the blade in its tail catches the light.', table: [[1, 7, 'tail-lash'], [8, 13, 'glass-sting'], [14, 20, 'glasscutter']] },
      { at: 0.66, text: 'It Burrows. Kharzul goes down into the glass floor as if it were water.', table: [[1, 4, 'tail-lash'], [5, 8, 'glass-sting'], [9, 13, 'burrow'], [14, 16, 'carapace-brace'], [17, 20, 'glasscutter']] },
      { at: 0.33, text: 'Glass Storm. The whole cavern starts to ring, and the ceiling answers.', table: [[1, 4, 'tail-lash'], [5, 10, 'glass-rain'], [11, 14, 'glass-sting'], [15, 20, 'molten-tail']] },
    ],
    text: 'A scorpion of living glass the size of a wagon, with a scimitar lodged in its tail for three hundred years. The blade has been warm the whole time.',
  },
  'ashen-warden': {
    id: 'ashen-warden', name: 'The Ashen Warden', art: 'ashen-warden', tier: 'champion', kind: 'undead', unique: true,
    hp: 152, guard: 17, atk: 8, dmg: 5, speed: 9, armor: 'plate', aspect: 'ember', weak: ['radiant'],
    saves: { STR: 4, DEX: 1, CON: 4, WIS: 3 },
    relics: ['ashen-aegis', 'cinder-crown'],
    noFlee: true,
    moves: {
      'ash-blade': { name: 'Ash Blade', target: 'enemy', text: 'Scorchgate\'s last sword, still hot from the last fire.', effects: [atk('2d10', 'slash', { aspect: 'ember' })] },
      'ember-sweep': { name: 'Ember Sweep', target: 'all-enemies', text: 'One wide, burning cut across the whole line.', effects: [atk('1d8', 'slash', { aspect: 'ember' })] },
      'ward-of-ash': { name: 'Ward of Ash', target: 'self', requires: 'ashen-aegis', fallback: 'ash-blade', text: 'The Aegis comes up and the ash settles on it. The next blow sinks into the ash (Warded).', effects: [status('warded', { value: { dice: '2d8', diceEvery: 3 } })] },
      'call-the-watch': { name: 'Call the Watch', target: 'self', text: 'It strikes the floor with the Aegis rim, and a wight climbs out of the ash to stand beside it.', effects: [{ type: 'summon', family: 'ash-wight', count: 1, max: 2, levelDelta: -4 }] },
      'command-of-cinders': { name: 'Command of Cinders', target: 'all-allies', requires: 'cinder-crown', fallback: 'ash-blade', text: 'The Cinder Crown flares and every soldier of Scorchgate answers at the double: every foe is Hasted.', effects: [status('hasted')] },
      'scorch-the-vault': { name: 'Scorch the Vault', target: 'all-enemies', charge: true, text: 'It lifts its sword and the Vault fills with fire, charging: 3d8 ember to every hero, DEX save for half, and you Burn.', effects: [{ type: 'damage', dice: '3d8', kind: 'ember', aspect: 'ember', save: 'DEX', riders: [status('burning')] }] },
      'watch-unbroken': { name: 'The Watch Unbroken', target: 'all-enemies', requires: 'cinder-crown', fallback: 'ash-blade', text: 'The embers in the Crown drink the fire off you: 1d6 ember to every hero, and the Warden heals.', effects: [{ type: 'damage', dice: '1d6', kind: 'ember', aspect: 'ember' }, { type: 'heal', dice: '2d8', diceEvery: 3, self: true }] },
    },
    phases: [
      { at: 1, text: 'The Warden Stands. Ash falls off it like snow as it raises the Aegis.', table: [[1, 10, 'ash-blade'], [11, 14, 'ember-sweep'], [15, 20, 'ward-of-ash']] },
      { at: 0.66, text: 'The Ash Rises. The drifts on the Vault floor stand up and take the shapes of soldiers.', table: [[1, 6, 'ash-blade'], [7, 10, 'call-the-watch'], [11, 13, 'ward-of-ash'], [14, 20, 'command-of-cinders']] },
      { at: 0.33, text: 'The Last Watch. The Crown burns white. It will not let the Vault fall twice.', table: [[1, 6, 'ash-blade'], [7, 11, 'scorch-the-vault'], [12, 16, 'watch-unbroken'], [17, 20, 'command-of-cinders']] },
    ],
    text: 'The last Warden of Scorchgate, still guarding a vault of ash. The Aegis on its arm and the Crown on its brow are all that did not burn.',
  },
};

// The Tallymen of the Sunscorch: new variants of the M3 families (spec §3.2). Brask and Vell are holders.
const TALLY_SUN = {
  tallyman: {
    ...VERDANT.tallyman,
    variants: {
      ...VERDANT.tallyman.variants,
      foreman: holder('Foreman Brask', 'brask', 64, {
        ...TALLY_MOVES,
        pick: { name: 'Pick', target: 'enemy', text: 'A miner\'s pick, swung by someone who has swung ten thousand of them.', effects: [atk('1d8', 'pierce')] },
        'dig-faster': { name: 'Dig Faster!', target: 'all-allies', text: 'Brask cracks the tally-whip: every digger is Hasted.', effects: [status('hasted')] },
        'noon-flare': { name: 'Noon Flare', target: 'all-enemies', requires: 'sunstone-lantern', fallback: 'pick', text: 'Brask unshutters the Sunstone Lantern and it is noon underground: 2d6 ember to every hero, CON save for half, and the glare leaves you half-blind (Frightened).', effects: [{ type: 'damage', dice: '2d6', kind: 'ember', aspect: 'ember', save: 'CON', riders: [status('frightened')] }] },
      }, [[1, 4, 'pick'], [5, 6, 'tally-mark'], [7, 8, 'dig-faster'], [9, 12, 'noon-flare']]),
      quartermaster: {
        name: 'The Quartermaster', hp: 34, art: 'quartermaster',
        moves: { ...TALLY_MOVES, 'hand-out': { name: 'Hand Out the Good Stuff', target: 'all-allies', text: 'The Quartermaster opens a crate that was not his: every foe is Warded.', effects: [status('warded', { value: { dice: '1d8', diceEvery: 3 } })] } },
        table: [[1, 3, 'cut'], [4, 4, 'tally-mark'], [5, 5, 'smoke-pot'], [6, 8, 'hand-out']],
      },
    },
  },
  smuggler: {
    ...VERDANT.smuggler,
    variants: {
      ...VERDANT.smuggler.variants,
      sharpshooter: holder('Vell Saltglass', 'vell', 54, {
        ...SMUGGLER_MOVES,
        'pin-down': { name: 'Pin Down', target: 'enemy', text: 'An arrow through your bootlace and into the sand: Rooted.', effects: [atk('1d6', 'pierce', { weapon: true, riders: [status('rooted')] })] },
        'singing-shot': { name: 'Singing Shot', target: 'enemy', requires: 'saltglass', fallback: 'cut', charge: true, text: 'Saltglass sings as Vell draws it to the ear, charging: 3d8 storm, and you Stagger.', effects: [atk('3d8', 'pierce', { aspect: 'storm', riders: [status('staggered')] })] },
      }, [[1, 4, 'cut'], [5, 6, 'caltrops'], [7, 8, 'pin-down'], [9, 12, 'singing-shot']], { speed: 13 }),
    },
  },
};

// ---- M5: the Ironspire Peaks (spec §3.2, §3.5; owner P4). Stats are for level 1, like everything above; the
// Waking adds the rest (a player arrives at Waking 4, and meets the Frost half at Waking 5). The new statuses
// (spec §4.2) are used where the spec asks: the Thunder-Roc carries a hero off and the Rime-Abbot's Drown holds
// one under the ice (`swallowed`), and the Abbot's Hushing charms (`charmed`). Tuned with tools/sim.mjs
// (docs/RULES.md §12, M5).
const WOLF_MOVES = {
  'rime-bite': { name: 'Rime Bite', target: 'enemy', text: 'Teeth rimed with frost: the cold goes in with them (Chilled).', effects: [atk('1d6', 'pierce', { riders: [status('chilled')] })] },
  lunge: { name: 'Lunge', target: 'enemy', charge: true, text: 'It drops low in the snow, charging a lunge for the throat.', effects: [atk('1d10', 'pierce')] },
  circle: { name: 'Circle', target: 'self', text: 'It circles you on the crust, quick and light: Hasted.', effects: [status('hasted')] },
};
const BRIGAND_MOVES = {
  hack: { name: 'Hack', target: 'enemy', text: 'An army blade, swung by someone who stopped drilling with it.', effects: [atk('1d6', 'slash', { weapon: true })] },
  crossbow: { name: 'Crossbow', target: 'enemy', text: 'A Stormwatch crossbow, stolen along with the deserter: 1d8 piercing.', effects: [atk('1d8', 'pierce')] },
  desert: { name: 'Desert', target: 'self', when: { hpBelow: 0.5 }, fallback: 'hack', text: 'He deserted once already. He does it again, down the scree.', effects: [{ type: 'escape' }] },
};
const SENTINEL_MOVES = {
  'iron-fist': { name: 'Iron Fist', target: 'enemy', text: 'A riveted fist, swung like a smith\'s hammer.', effects: [atk('1d8', 'crush')] },
  'gate-slam': { name: 'Gate Slam', target: 'enemy', charge: true, text: 'It sets its feet and shoulders the gate shut on you, charging: you Stagger.', effects: [atk('2d6', 'crush', { riders: [status('staggered')] })] },
  'lock-shields': { name: 'Lock Shields', target: 'all-allies', text: 'The Sentinels lock their shields across the stair: every one of them Guards.', effects: [status('guarding')] },
};
const FORGE_MOVES = {
  'molten-fist': { name: 'Molten Fist', target: 'enemy', text: 'A fist of half-cooled slag: it Burns where it lands.', effects: [atk('1d6', 'crush', { aspect: 'ember', riders: [status('burning')] })] },
  'slag-spit': { name: 'Slag Spit', target: 'enemy', text: 'It spits a gob of molten slag: 1d8 ember, DEX save for half.', effects: [{ type: 'damage', dice: '1d8', kind: 'ember', aspect: 'ember', save: 'DEX' }] },
  stoke: { name: 'Stoke', target: 'self', text: 'It rakes its own furnace hotter and the cracks in it glow white: Hasted.', effects: [status('hasted')] },
};
const TROLL_MOVES = {
  club: { name: 'Club', target: 'enemy', text: 'A pine trunk with the branches knocked off.', effects: [atk('1d10', 'crush')] },
  pummel: { name: 'Pummel', target: 'enemy', text: 'Both fists, one after the other.', effects: [atk('1d6', 'crush'), atk('1d6', 'crush')] },
  'hurl-boulder': { name: 'Hurl Boulder', target: 'enemy', charge: true, text: 'It prises a boulder out of the scree and heaves it overhead, charging: you Stagger.', effects: [atk('2d8', 'crush', { riders: [status('staggered')] })] },
  regrow: { name: 'Regrow', target: 'self', when: { hpBelow: 0.8 }, fallback: 'club', text: 'The wound closes while you watch: Regenerating.', effects: [status('regenerating', { value: { dice: '1d6', diceEvery: 3 } })] },
};
const WRAITH_MOVES = {
  'drowned-grasp': { name: 'Drowned Grasp', target: 'enemy', text: 'A hand as cold as the lake-bed closes on yours: Chilled.', effects: [atk('1d6', 'frost', { aspect: 'frost', riders: [status('chilled')] })] },
  dirge: { name: 'Dirge', target: 'all-enemies', text: 'It sings the office for the drowned. WIS save or Frightened.', effects: [status('frightened', { save: 'WIS' })] },
  'pull-under': { name: 'Pull Under', target: 'enemy', charge: true, text: 'It reaches up out of the ice for your ankles, charging: 2d8 frost and two stacks of Chilled.', effects: [atk('2d8', 'frost', { aspect: 'frost', riders: [status('chilled', { stacks: 2 })] })] },
};

const IRONSPIRE = {
  'rime-wolf': {
    id: 'rime-wolf', name: 'Rime Wolf', art: 'rime-wolf', tier: 'rabble', kind: 'beast',
    hp: 15, guard: 14, atk: 4, dmg: 1, speed: 14, armor: 'hide', aspect: 'frost',
    saves: { STR: 1, DEX: 3, CON: 1, WIS: 0 },
    moves: WOLF_MOVES,
    table: [[1, 3, 'rime-bite'], [4, 5, 'lunge'], [6, 6, 'circle']],
    text: 'Grey wolves of the high passes with frost in their ruffs. They run the snow crust faster than you can wade it, and the bite stays cold.',
  },
  brigand: {
    id: 'brigand', name: 'Pass Brigand', art: 'brigand', tier: 'rabble', humanoid: true,
    hp: 18, guard: 14, atk: 3, dmg: 2, speed: 11, armor: 'hide', aspect: null,
    saves: { STR: 1, DEX: 1, CON: 1, WIS: 0 },
    moves: BRIGAND_MOVES,
    table: [[1, 3, 'hack'], [4, 5, 'crossbow'], [6, 6, 'desert']],
    variants: {
      warden: holder('Rhune the Pass-Warden', 'rhune', 52, {
        ...BRIGAND_MOVES,
        'toll-chain': { name: 'Toll Chain', target: 'enemy', text: 'He cracks the toll-chain across your shins: 1d8 crushing, and you Stagger.', effects: [atk('1d8', 'crush', { riders: [status('staggered')] })] },
        'gale-step': { name: 'Gale Step', target: 'all-enemies', requires: 'windstep-boots', fallback: 'hack', text: 'The Windstep Boots take him up onto the wind and along the whole line: a cut at every hero, and he is Hasted.', effects: [atk('1d8', 'slash'), status('hasted', { self: true })] },
      }, [[1, 4, 'hack'], [5, 6, 'crossbow'], [7, 8, 'toll-chain'], [9, 12, 'gale-step']], { speed: 13 }),
      // the East Road's camp (the lead's six-map road before the pass): a sergeant who still drills the men who ran with him; no relic
      sergeant: {
        name: 'Deserter Sergeant', tier: 'veteran', hp: 28,
        moves: {
          ...BRIGAND_MOVES,
          'drill-lunge': { name: 'Drill Lunge', target: 'enemy', charge: true, text: 'The lunge the drill-yard taught him, charging: his blade and 1d8 more.', effects: [atk('1d6', 'slash', { weapon: true, bonusDice: [{ dice: '1d8' }] })] },
          'close-up': { name: 'Close Up!', target: 'all-allies', text: 'He bawls the old Stormwatch drill and his deserters close up: every one of them Guards.', effects: [status('guarding')] },
        },
        table: [[1, 4, 'hack'], [5, 6, 'crossbow'], [7, 7, 'drill-lunge'], [8, 8, 'close-up']],
      },
    },
    gear: [
      [{ base: 'hand-axe' }, { base: 'hood' }, { base: 'jerkin' }],
      [{ base: 'arming-sword' }, { base: 'kettle-helm' }, { base: 'jerkin' }],
      [{ base: 'arming-sword' }, { base: 'kettle-helm' }, { base: 'chain-shirt' }, { base: 'buckler' }],
      [{ base: 'longsword' }, { base: 'great-helm' }, { base: 'hauberk' }, { base: 'heater-shield' }],
    ],
    text: 'Stormwatch deserters working the pass for tolls. They still wear the army\'s coats, with the storm badge picked off.',
  },
  rockling: {
    id: 'rockling', name: 'Rockling', art: 'rockling', tier: 'rabble', kind: 'construct',
    hp: 17, guard: 15, atk: 3, dmg: 2, speed: 9, armor: 'none', aspect: 'stone', weak: ['crush'],
    saves: { STR: 2, DEX: 0, CON: 3, WIS: 0 },
    moves: {
      slam: { name: 'Slam', target: 'enemy', text: 'A fist of scree.', effects: [atk('1d6', 'crush')] },
      'roll-in': { name: 'Roll In', target: 'enemy', text: 'It tucks into a boulder and rolls into you: you Stagger.', effects: [atk('1d8', 'crush', { riders: [status('staggered')] })] },
      hunker: { name: 'Hunker', target: 'self', text: 'It settles into the scree and looks like any other rock: Guarding.', effects: [status('guarding')] },
    },
    table: [[1, 3, 'slam'], [4, 5, 'roll-in'], [6, 6, 'hunker']],
    text: 'A heap of scree that stood up. A hammer breaks it; a sword just gets blunt.',
  },
  'forge-spark': {
    id: 'forge-spark', name: 'Forge-Spark', art: 'forge-spark', tier: 'rabble', kind: 'construct',
    hp: 10, guard: 14, atk: 4, dmg: 1, speed: 15, armor: 'none', aspect: 'ember',
    saves: { STR: 0, DEX: 3, CON: 0, WIS: 0 },
    moves: {
      singe: { name: 'Singe', target: 'enemy', text: 'It darts in and touches you: Burning.', effects: [atk('1d4', 'ember', { aspect: 'ember', riders: [status('burning')] })] },
      flare: { name: 'Flare', target: 'all-enemies', text: 'It flares white-hot: 1d6 ember to every hero, DEX save for half.', effects: [{ type: 'damage', dice: '1d6', kind: 'ember', aspect: 'ember', save: 'DEX' }] },
      gutter: { name: 'Gutter', target: 'self', when: { hpBelow: 0.5 }, fallback: 'singe', text: 'It gutters, and goes out.', effects: [{ type: 'escape' }] },
    },
    table: [[1, 4, 'singe'], [5, 5, 'flare'], [6, 6, 'gutter']],
    text: 'A living cinder the size of a fist, in a cage of slag. Harrow\'s bellows still breathe them out, down in the Deeps.',
  },
  'iron-sentinel': {
    id: 'iron-sentinel', name: 'Iron Sentinel', art: 'iron-sentinel', tier: 'veteran', kind: 'construct',
    hp: 30, guard: 17, atk: 4, dmg: 2, speed: 8, armor: 'plate', aspect: 'stone',
    saves: { STR: 3, DEX: 0, CON: 3, WIS: 1 },
    moves: SENTINEL_MOVES,
    table: [[1, 4, 'iron-fist'], [5, 6, 'gate-slam'], [7, 8, 'lock-shields']],
    variants: {
      captain: holder('The Sentinel-Captain', 'sentinel-captain', 70, {
        ...SENTINEL_MOVES,
        ironwall: { name: 'Ironwall', target: 'all-allies', requires: 'ironwall', fallback: 'iron-fist', text: 'The Captain brings Ironwall down like a portcullis, and the stair is shut: every Sentinel is Warded.', effects: [status('warded', { value: { dice: '2d6', diceEvery: 3 } })] },
        'shield-rush': { name: 'Shield Rush', target: 'enemy', requires: 'ironwall', fallback: 'iron-fist', charge: true, text: 'Ironwall first and the Captain behind it, charging: 3d8 crushing, and you Stagger.', effects: [atk('3d8', 'crush', { riders: [status('staggered')] })] },
      }, [[1, 4, 'iron-fist'], [5, 6, 'gate-slam'], [7, 8, 'lock-shields'], [9, 10, 'ironwall'], [11, 12, 'shield-rush']]),
    },
    text: 'A dwarven automaton of riveted iron, still keeping the stair against whoever the Thane told it to keep out. A sword skids off it; a hammer rings it like a bell.',
  },
  forgeborn: {
    id: 'forgeborn', name: 'Forgeborn', art: 'forgeborn', tier: 'veteran', kind: 'construct',
    hp: 26, guard: 15, atk: 4, dmg: 2, speed: 10, armor: 'none', aspect: 'ember',
    saves: { STR: 2, DEX: 0, CON: 3, WIS: 0 },
    moves: FORGE_MOVES,
    table: [[1, 4, 'molten-fist'], [5, 6, 'slag-spit'], [7, 8, 'stoke']],
    variants: {
      bellows: {
        name: 'The Bellows', hp: 34, art: 'bellows',
        moves: {
          ...FORGE_MOVES,
          'bellows-blast': { name: 'Bellows Blast', target: 'all-enemies', text: 'It opens its bellows on the whole line: 1d6 ember to every hero, CON save for half.', effects: [{ type: 'damage', dice: '1d6', kind: 'ember', aspect: 'ember', save: 'CON' }] },
          'blow-sparks': { name: 'Blow Sparks', target: 'self', fallback: 'bellows-blast', text: 'It pumps its bellows, and a spark the size of a fist comes tumbling out, alive.', effects: [{ type: 'summon', family: 'forge-spark', count: 1, max: 2, levelDelta: -2 }] },
        },
        table: [[1, 3, 'molten-fist'], [4, 5, 'bellows-blast'], [6, 8, 'blow-sparks']],
      },
      journeyman: holder('Harrow\'s Journeyman', 'journeyman', 130, {
        ...FORGE_MOVES,
        'smiths-hammer': { name: 'Smith\'s Hammer', target: 'enemy', text: 'A smith\'s hammer, swung by a smith: 1d10 crushing.', effects: [atk('1d10', 'crush')] },
        'temper-kin': { name: 'Temper the Kin', target: 'all-allies', text: 'He runs a hand over his forgeborn the way a smith checks a blade: every one of them is Warded.', effects: [status('warded', { value: { dice: '1d8', diceEvery: 3 } })] },
        'rune-fire': { name: 'Rune-Fire', target: 'all-enemies', requires: 'runestaff', fallback: 'smiths-hammer', text: 'Harrow\'s runes flare down the Runestaff: 2d8 ember to every hero, CON save for half, and you Burn.', effects: [{ type: 'damage', dice: '2d8', kind: 'ember', aspect: 'ember', save: 'CON', riders: [status('burning')] }] },
        'white-heat': { name: 'White Heat', target: 'enemy', charge: true, text: 'He thrusts his hammer into the forge-coals until it glows white, charging: 2d10 crushing, and you Burn.', effects: [atk('2d10', 'crush', { aspect: 'ember', riders: [status('burning')] })] },
      }, [[1, 3, 'smiths-hammer'], [4, 5, 'slag-spit'], [6, 6, 'temper-kin'], [7, 8, 'white-heat'], [9, 12, 'rune-fire']], { atk: 7, dmg: 5 }),
    },
    text: 'One of Harrow\'s molten servants: a man-shape of black slag with the heat showing through the cracks, still tending forges nobody lights.',
  },
  'peak-troll': {
    id: 'peak-troll', name: 'Peak-Troll', art: 'peak-troll', tier: 'veteran', kind: 'beast',
    hp: 36, guard: 13, atk: 4, dmg: 3, speed: 8, armor: 'hide', aspect: 'stone',
    saves: { STR: 4, DEX: 0, CON: 4, WIS: 0 },
    moves: TROLL_MOVES,
    table: [[1, 3, 'club'], [4, 4, 'pummel'], [5, 6, 'hurl-boulder'], [7, 8, 'regrow']],
    variants: {
      'old-horn': holder('Old Horn', 'old-horn', 110, {
        ...TROLL_MOVES,
        'horn-toss': { name: 'Horn Toss', target: 'enemy', text: 'He gets his one horn under you and throws: 2d8 piercing, and you Stagger.', effects: [atk('2d8', 'pierce', { riders: [status('staggered')] })] },
        'mantle-of-trolls': { name: 'Mantle of Trolls', target: 'self', requires: 'trollhide-mantle', fallback: 'club', text: 'The hides of every troll he ever beat knit over his wounds: he heals 2d8, and they Regenerate.', effects: [{ type: 'heal', dice: '2d8', diceEvery: 3 }, status('regenerating', { value: { dice: '1d6', diceEvery: 3 } })] },
      }, [[1, 4, 'club'], [5, 5, 'pummel'], [6, 7, 'hurl-boulder'], [8, 8, 'horn-toss'], [9, 12, 'mantle-of-trolls']]),
    },
    text: 'A troll of the high passes, grey-green and mossed like a boulder. Cut it and it grows back; the old ones wear the hides of the young.',
  },
  'rime-wraith': {
    id: 'rime-wraith', name: 'Rime-Wraith', art: 'rime-wraith', tier: 'veteran', kind: 'undead',
    hp: 24, guard: 15, atk: 4, dmg: 2, speed: 11, armor: 'none', aspect: 'frost',
    saves: { STR: 1, DEX: 1, CON: 2, WIS: 2 },
    moves: WRAITH_MOVES,
    table: [[1, 4, 'drowned-grasp'], [5, 6, 'dirge'], [7, 8, 'pull-under']],
    variants: {
      abbess: holder('The Drowned Abbess', 'drowned-abbess', 72, {
        ...WRAITH_MOVES,
        'last-rites': { name: 'Last Rites', target: 'all-allies', text: 'She says the last rites over her choir, as she did every night for thirty years: every drowned monk heals 2d6.', effects: [{ type: 'heal', dice: '2d6', diceEvery: 3 }] },
        'censer-swing': { name: 'Censer Swing', target: 'all-enemies', requires: 'drowned-censer', fallback: 'drowned-grasp', text: 'The Drowned Censer swings, and the smoke smells of lake-water: 2d6 frost to every hero, WIS save for half, and you are Chilled.', effects: [{ type: 'damage', dice: '2d6', kind: 'frost', aspect: 'frost', save: 'WIS', riders: [status('chilled')] }] },
      }, [[1, 4, 'drowned-grasp'], [5, 6, 'dirge'], [7, 7, 'pull-under'], [8, 8, 'last-rites'], [9, 12, 'censer-swing']]),
      choir: {
        name: 'Choir-Wraith', hp: 22, art: 'choir-wraith',
        moves: {
          ...WRAITH_MOVES,
          'the-note': { name: 'The Note', target: 'all-enemies', text: 'It sings one long note under the ice, and the cold gets into you: 1d6 frost, CON save for half, and you are Chilled.', effects: [{ type: 'damage', dice: '1d6', kind: 'frost', aspect: 'frost', save: 'CON', riders: [status('chilled')] }] },
        },
        table: [[1, 3, 'drowned-grasp'], [4, 6, 'the-note'], [7, 8, 'dirge']],
      },
    },
    text: 'A drowned monk of Frostmere, still wet under the frost and still singing. It remembers the office, and nothing else.',
  },
  'thunder-roc': {
    id: 'thunder-roc', name: 'The Thunder-Roc', art: 'thunder-roc', tier: 'relic-bearer', kind: 'beast', unique: true,
    hp: 140, guard: 15, atk: 6, dmg: 4, speed: 14, armor: 'hide', aspect: 'storm',
    saves: { STR: 3, DEX: 4, CON: 3, WIS: 2 },
    relics: ['roc-feather-cloak'],
    moves: {
      talons: { name: 'Talons', target: 'enemy', text: 'Talons like a harrow\'s tines.', effects: [atk('2d8', 'slash')] },
      'wing-gale': { name: 'Wing Gale', target: 'all-enemies', text: 'It beats its wings and the eyrie\'s snow comes off the crag in a wall: 1d8 crushing to every hero, DEX save for half, and you Stagger.', effects: [{ type: 'damage', dice: '1d8', kind: 'crush', save: 'DEX', riders: [status('staggered')] }] },
      'carry-off': { name: 'Carry Off', target: 'enemy', charge: true, text: 'It drops on you out of the sun, charging: it means to carry you off the crag.', effects: [atk('2d6', 'slash', { riders: [status('swallowed', { label: 'Carried off' })] })] },
      'storm-mantle': { name: 'Storm Mantle', target: 'all-enemies', requires: 'roc-feather-cloak', fallback: 'talons', text: 'The cloak of its own feathers crackles on its talon, and lightning runs down the crag: 2d8 storm to every hero, CON save for half, and you Stagger.', effects: [{ type: 'damage', dice: '2d8', kind: 'storm', aspect: 'storm', save: 'CON', riders: [status('staggered')] }] },
    },
    table: [[1, 4, 'talons'], [5, 6, 'wing-gale'], [7, 8, 'carry-off'], [9, 12, 'storm-mantle']],
    text: 'A bird the size of a barn, nesting on the Highfold crags. It carries off goats, and sometimes shepherds; one shepherd\'s cloak of its own feathers is still caught on its talon.',
  },
  // Champions (spec §3.5): each piece is a relic with its own grip meter; snapping one off shuts its moves down.
  'mother-anvil': {
    id: 'mother-anvil', name: 'Mother Anvil', art: 'mother-anvil', tier: 'champion', kind: 'construct', unique: true,
    hp: 170, guard: 18, atk: 9, dmg: 6, speed: 10, armor: 'plate', aspect: 'ember', resist: ['crush'], weak: ['frost'],
    saves: { STR: 5, DEX: 0, CON: 5, WIS: 2 },
    relics: ['worldforge-hammer', 'anvil-heart'],
    noFlee: true,
    moves: {
      hammerfall: { name: 'Hammerfall', target: 'enemy', text: 'The anvil rears up on its iron legs and comes down on you: 2d10 crushing.', effects: [atk('2d10', 'crush')] },
      sparks: { name: 'Sparks', target: 'all-enemies', text: 'She strikes her own back with the hammer, and the sparks go everywhere: 1d6 ember to every hero, and you Burn.', effects: [{ type: 'damage', dice: '1d6', kind: 'ember', aspect: 'ember', riders: [status('burning')] }] },
      temper: { name: 'Temper', target: 'self', requires: 'anvil-heart', fallback: 'hammerfall', text: 'The Anvil Heart glows white and the iron of her plates goes blue with temper: Guarding, and Warded.', effects: [status('guarding'), status('warded', { value: { dice: '3d6', diceEvery: 3 } })] },
      'steam-burst': { name: 'Steam Burst', target: 'all-enemies', text: 'She plunges her hammer-arm into the quench-trough and the forge fills with steam: 2d6 ember to every hero, DEX save for half.', effects: [{ type: 'damage', dice: '2d6', kind: 'ember', aspect: 'ember', save: 'DEX' }] },
      'anvil-strike': { name: 'Anvil Strike', target: 'enemy', requires: 'worldforge-hammer', fallback: 'hammerfall', text: 'The Worldforge Hammer comes down on you as if you were iron on the anvil: 3d8 crushing, and you Stagger.', effects: [atk('3d8', 'crush', { riders: [status('staggered')] })] },
      bellows: { name: 'Bellows', target: 'self', fallback: 'hammerfall', text: 'Harrow\'s great bellows breathe once, and a forgeborn climbs out of the fire-pit to stand at her side.', effects: [{ type: 'summon', family: 'forgeborn', count: 1, max: 2, levelDelta: -4 }] },
      'heart-flare': { name: 'Heart Flare', target: 'all-enemies', requires: 'anvil-heart', fallback: 'sparks', text: 'The Anvil Heart flares through her ribs like a furnace door flung open: 3d6 ember to every hero, and you Burn.', effects: [{ type: 'damage', dice: '3d6', kind: 'ember', aspect: 'ember', riders: [status('burning')] }] },
      'worldforge-blow': { name: 'Worldforge Blow', target: 'enemy', requires: 'worldforge-hammer', fallback: 'hammerfall', charge: true, text: 'She lifts the Worldforge Hammer as high as the forge roof, charging: 4d10 crushing, for one of you.', effects: [atk('4d10', 'crush')] },
    },
    phases: [
      { at: 1, text: 'The Anvil Wakes. The ring of anvils rings once, and the biggest of them stands up on four iron legs.', table: [[1, 8, 'hammerfall'], [9, 14, 'sparks'], [15, 20, 'temper']] },
      { at: 0.66, text: 'Quench. She wades into the quench-trough and comes out wreathed in steam.', table: [[1, 5, 'hammerfall'], [6, 10, 'steam-burst'], [11, 15, 'anvil-strike'], [16, 20, 'bellows']] },
      { at: 0.33, text: 'The Last Strike. The Heart burns white through her ribs, and she lifts the Hammer one last time.', table: [[1, 5, 'hammerfall'], [6, 12, 'heart-flare'], [13, 20, 'worldforge-blow']] },
    ],
    text: 'Harrow\'s first forge-golem: an anvil the size of a cart on four iron legs, with his hammer in one arm and a heart of fire in her ribs. Her plate turns a hammer; cold water finds the flaws in it.',
  },
  'rime-abbot': {
    id: 'rime-abbot', name: 'The Rime-Abbot', art: 'rime-abbot', tier: 'champion', kind: 'undead', unique: true,
    hp: 160, guard: 21, atk: 8, dmg: 7, speed: 8, armor: 'none', aspect: 'frost',
    saves: { STR: 3, DEX: 1, CON: 4, WIS: 5 },
    relics: ['rime-crozier', 'hushweave-cowl'],
    noFlee: true,
    moves: {
      'crozier-strike': { name: 'Crozier Strike', target: 'enemy', text: 'The Rime Crozier comes down like a bell-clapper: 2d8 frost, and you are Chilled.', effects: [atk('2d8', 'frost', { aspect: 'frost', riders: [status('chilled')] })] },
      toll: { name: 'Toll', target: 'all-enemies', text: 'He tolls the drowned bell under the ice. Every hero: WIS save or Frightened.', effects: [status('frightened', { save: 'WIS' })] },
      'rime-ward': { name: 'Rime Ward', target: 'self', requires: 'rime-crozier', fallback: 'crozier-strike', text: 'He plants the Crozier, and the rime grows over him like a second habit: Warded.', effects: [status('warded', { value: { dice: '3d6', diceEvery: 3 } })] },
      drown: { name: 'Drown', target: 'enemy', charge: true, text: 'He takes one of you by the collar and walks you down under the ice, charging: held under, for two turns.', effects: [atk('1d8', 'frost', { aspect: 'frost', riders: [status('swallowed', { label: 'Held under' })] })] },
      'call-the-choir': { name: 'Call the Choir', target: 'self', fallback: 'crozier-strike', text: 'He lifts the Crozier, and one of his drowned choir rises through the ice, singing.', effects: [{ type: 'summon', family: 'rime-wraith', variant: 'choir', count: 1, max: 2, levelDelta: -4 }] },
      hushing: { name: 'Hushing', target: 'enemy', requires: 'hushweave-cowl', fallback: 'toll', text: 'The Hushweave Cowl breathes out a silence, and one of you hears nothing but Hush. WIS save or Charmed.', effects: [status('charmed', { save: 'WIS' })] },
      heartbeat: { name: 'Heartbeat', target: 'all-enemies', text: 'Under the floor, Hush\'s heart beats once. The Abbot heals 2d8, and every hero is Chilled.', effects: [{ type: 'heal', dice: '2d8', diceEvery: 3, self: true }, status('chilled')] },
      'rime-nova': { name: 'Rime Nova', target: 'all-enemies', text: 'The whole cave of ice answers him at once: 3d8 frost to every hero, DEX save for half, and you are Chilled.', effects: [{ type: 'damage', dice: '3d8', kind: 'frost', aspect: 'frost', save: 'DEX', riders: [status('chilled')] }] },
    },
    phases: [
      { at: 1, text: 'Vespers. Brother Aurel lifts his head from the ice, and the Crozier lights the cave blue.', table: [[1, 8, 'crozier-strike'], [9, 14, 'toll'], [15, 20, 'rime-ward']] },
      { at: 0.66, text: 'Compline. He sings the last office of the day, and the drowned sing it with him.', table: [[1, 5, 'crozier-strike'], [6, 10, 'drown'], [11, 15, 'call-the-choir'], [16, 20, 'hushing']] },
      { at: 0.33, text: 'Hush. Under the ice something vast turns over in its sleep, and its heart beats.', table: [[1, 8, 'crozier-strike'], [9, 14, 'heartbeat'], [15, 20, 'rime-nova']] },
    ],
    text: 'Brother Aurel of Peak\'s Veil, who went down to listen to Hush and did not come up. The Crozier froze to his hand; the Cowl was woven down there, by someone who was listening.',
  },
};

// The Tallymen of the Ironspire: new variants of the M3 families (spec §3.2). The Cutter-Chief is a holder.
const TALLY_IRON = {
  tallyman: {
    ...TALLY_SUN.tallyman,
    variants: {
      ...TALLY_SUN.tallyman.variants,
      'ice-cutter': holder('The Cutter-Chief', 'cutter-chief', 66, {
        ...TALLY_MOVES,
        'ice-pick': { name: 'Ice-Pick', target: 'enemy', text: 'A Tallyman ice-pick, for cutting blocks and bargains: 1d8 piercing.', effects: [atk('1d8', 'pierce')] },
        'split-the-ice': { name: 'Split the Ice', target: 'all-enemies', requires: 'cutters-pick', fallback: 'ice-pick', text: 'The Cutter\'s Pick bites into the road-ice and the floe splits under the whole line: 2d6 frost to every hero, DEX save for half, and you are Chilled.', effects: [{ type: 'damage', dice: '2d6', kind: 'frost', aspect: 'frost', save: 'DEX', riders: [status('chilled')] }] },
      }, [[1, 4, 'ice-pick'], [5, 6, 'tally-mark'], [7, 8, 'smoke-pot'], [9, 12, 'split-the-ice']]),
    },
  },
  smuggler: {
    ...TALLY_SUN.smuggler,
    variants: {
      ...TALLY_SUN.smuggler.variants,
      sawyer: {
        name: 'Sawyer', hp: 20, art: 'sawyer',
        moves: {
          ...SMUGGLER_MOVES,
          'ice-saw': { name: 'Ice-Saw', target: 'enemy', text: 'One end of a two-man ice saw, swung like a scythe: 1d8 slashing.', effects: [atk('1d8', 'slash')] },
        },
        table: [[1, 4, 'ice-saw'], [5, 5, 'caltrops'], [6, 6, 'bolt']],
      },
    },
  },
};

// ---- M6: the Gloomfen Marsh (spec §3.2; owner P4). STUBS from the M6 scaffold: each borrows an earlier
// family's numbers, moves and look until P4 writes the real family in its place (with `art: <its id>`,
// which P6 draws; art-keys.test.mjs fails for a new key until both have landed).
const stub = (id, name, from, o = {}) => ({ ...from, id, name, stub: true, variants: {}, ...o });
const stubHolder = (name, hp, o = {}) => ({ name, tier: 'relic-bearer', hp, ...o });
const GLOOMFEN = {
  'mire-leech': stub('mire-leech', 'Mire Leech', VERDANT.rotgrub, { aspect: 'blight', text: 'A leech as long as your arm, black and patient. It drinks.' }),
  'marsh-light': stub('marsh-light', 'Marsh-Light', VERDANT.glowcap, { kind: 'spirit', aspect: 'radiant', text: 'A light over the water that the locals know better than to follow.' }),
  'lamp-moth': stub('lamp-moth', 'Lamp-Moth', VERDANT.briarling, { kind: 'beast', aspect: 'radiant', text: 'A moth the size of a hand, drawn to the Lantern Mother\'s light.' }),
  'blackwater-gar': stub('blackwater-gar', 'Blackwater Gar', VERDANT.thornhound, { aspect: 'tide',
    variants: { 'old-jaws': stubHolder('Old Jaws', 80) },
    text: 'A gar out of the Blackwater, all teeth and no manners. It leaps.' }),
  'bog-hag': stub('bog-hag', 'Bog-Hag', VERDANT['feral-druid'], { aspect: 'blight',
    variants: { grue: stubHolder('Mother Grue', 70) },
    text: 'A hag of the eastern bogs, stirring something in a pot you should not look into.' }),
  'willow-wight': stub('willow-wight', 'Willow-Wight', VERDANT.sapwight, { kind: 'plant', aspect: 'verdant',
    variants: { grandfather: stubHolder('Grandfather Willow', 90) },
    text: 'A willow that got up and walked when Willowmurk\'s wards failed.' }),
  drowned: stub('drowned', 'Drowned', IRONSPIRE['rime-wraith'], { kind: 'undead', aspect: 'tide',
    variants: { 'bell-ringer': { name: 'Drowned Bell-Ringer', hp: 34 }, choir: { name: 'Drowned Chorister', hp: 30 }, cantor: stubHolder('The Drowned Cantor', 72) },
    text: 'One of Misthollow\'s drowned, still going about its business under the water.' }),
  hodge: stub('hodge', 'Hodge', VERDANT.tamsin, { unique: true, relics: ['unfair-toll'],
    text: 'The toll-keeper of Rotbridge: not actually a troll, just an extremely unpleasant old man.' }),
  'lantern-mother': stub('lantern-mother', 'The Lantern Mother', VERDANT.rotwarden, { kind: 'undead', aspect: 'radiant', unique: true, relics: ['lamplighters-lantern', 'mourning-veil'],
    text: 'The last lamplighter of Misthollow, leading children out along the boardwalk again.' }),
  'blackwater-leviathan': stub('blackwater-leviathan', 'The Blackwater Leviathan', VERDANT.rotwarden, { kind: 'beast', aspect: 'tide', unique: true, relics: ['corvus-harpoon', 'deep-pearl'],
    text: 'The thing that lives in the Blackwater, as long as the channel is wide, chained and maddened.' }),
};

// the Tallymen of the Gloomfen: new variants of the M3 families (spec §3.2)
const TALLY_GLOOM = {
  tallyman: { ...TALLY_IRON.tallyman, variants: { ...TALLY_IRON.tallyman.variants, 'salvage-master': stubHolder('The Salvage-Master', 70), bargemaster: stubHolder('The Bargemaster', 74) } },
  smuggler: { ...TALLY_IRON.smuggler, variants: { ...TALLY_IRON.smuggler.variants, reedcutter: { name: 'Reed-Cutter', hp: 22 }, diver: { name: 'Salvage Diver', hp: 22 }, bargehand: { name: 'Bargehand', hp: 24 } } },
};

export const FOES = deepFreeze({ ...VERDANT, ...TALLY_SUN, ...SUNSCORCH, ...TALLY_IRON, ...IRONSPIRE, ...TALLY_GLOOM, ...GLOOMFEN });

export const FOE_IDS = Object.freeze(Object.keys(FOES));
