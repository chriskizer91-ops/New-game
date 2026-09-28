// Foe families of the Verdant Wilds slice. Art keys match the shared vocabulary.
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

export const FOES = deepFreeze({
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
});

export const FOE_IDS = Object.freeze(Object.keys(FOES));
