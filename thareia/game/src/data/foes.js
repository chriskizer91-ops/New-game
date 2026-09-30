// Foe families of the Verdant Wilds (M2, M3), the Sunscorch Wastes (M4), the Ironspire Peaks (M5), the Gloomfen Marsh (M6) and the Hearth Below (M7). Art keys match the shared vocabulary.
//
// Stats are for level 1; rules/foe.js scales them by level, gear tier, Omens and the Waking.
// Each family has a MOVE TABLE read like a D&D random table: the foe rolls its intent die
// (rabble d6, veteran d8, relic-bearer d12, champion d20; M7: hollow d20 +4, the Unsmith two d20s) and the face
// picks the move.
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
// M6: target 'strongest' (the strongest hero) and 'ally' (the worst-hurt friend); the `delay` effect (a whole turn
// later unless the target saves); a family's `opener` (its first move in every fight), `koText` (said instead of
// falling), `keepsRelics` (beaten, it keeps what it still grips: its relic comes loose only by grip) and `grudgeTitles`
// ({ win?, flee? }: four titles each for its Grudge, in place of the Party-Breaker's and the Once-Fled's).

import { deepFreeze } from '../core/freeze.js';

// M7 (spec §4.2): two tiers above the Champion's d20.
//   hollow   the Hollow Council: a d20 that adds `bonus` (+4, capped at 20) while the family's `bonusWhile` relic (its
//            gift) is still held, so the gift's Arts on the high faces come up more often; pried loose, the +4 goes
//   unsmith  the Unsmith: `dice: 2`, two intents shown and two moves every turn
// `as` names the tier whose rows a new tier reads in every table keyed by tier (xp, gold, loot, flee, spoils,
// Grudges, the Champion Felled deed), unless the table gives it a row of its own (tierAs, tierRow).
export const FOE_TIERS = deepFreeze({
  rabble: { id: 'rabble', name: 'Rabble', die: 6 },
  veteran: { id: 'veteran', name: 'Veteran', die: 8 },
  'relic-bearer': { id: 'relic-bearer', name: 'Relic-Bearer', die: 12 },
  champion: { id: 'champion', name: 'Champion', die: 20 },
  hollow: { id: 'hollow', name: 'Hollow', die: 20, bonus: 4, as: 'champion' },
  unsmith: { id: 'unsmith', name: 'The Unsmith', die: 20, dice: 2, as: 'champion' },
});
export const tierAs = tier => FOE_TIERS[tier]?.as || tier;
export const tierRow = (table, tier) => table?.[tier] ?? table?.[tierAs(tier)];

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

// ---- M6: the Gloomfen Marsh (spec §3.2, §3.5; owner P4). Stats are for level 1, like everything above; the Waking
// adds the rest (a player arrives at Waking 6, every earlier Brand held, and meets the Deep half at Waking 7). The fen's
// two statuses (spec §4.2) are used where the spec asks: the bog-hags Hex (`hexed`) and Rot (`rotting`), the drowned
// cough up black water that Rots, their choir's hymn and their Cantor's downbeat Hex, and the Lantern Mother's Hush Now
// Hexes and her Mourning Rots. Holds read on the hero's plate as "Led away" (the Lantern Mother), "Swallowed whole" (the
// Leviathan) and "In the river" (Hodge). Tuned with tools/sim.mjs (docs/RULES.md §12, M6).
const GAR_MOVES = {
  bite: { name: 'Bite', target: 'enemy', text: 'A long jaw like a pike\'s, lined with needles.', effects: [atk('1d8', 'pierce')] },
  leap: { name: 'Leap', target: 'enemy', charge: true, text: 'It sinks under the black water, charging, and comes out of the channel at you like a thrown spear: you Stagger.', effects: [atk('2d6', 'pierce', { riders: [status('staggered')] })] },
  dive: { name: 'Dive', target: 'self', text: 'It slides under the surface, where a blow has to go through the water first: Guarding.', effects: [status('guarding')] },
};
const HAG_MOVES = {
  ladle: { name: 'Ladle', target: 'enemy', text: 'Whatever is in her hand, and it is usually the ladle.', effects: [atk('1d6', 'crush', { weapon: true })] },
  hex: { name: 'Hex', target: 'enemy', text: 'She spits in her palm and says your name backwards. WIS save or Hexed.', effects: [status('hexed', { save: 'WIS' })] },
  rot: { name: 'Rot', target: 'enemy', text: 'A handful of pot-scum, flung: 2d6 blight, CON save for half, and on a failed save you are Rotting.', effects: [{ type: 'damage', dice: '2d6', kind: 'blight', aspect: 'blight', save: 'CON', riders: [status('rotting')] }] },
  'stir-the-pot': { name: 'Stir the Pot', target: 'ally', text: 'She stirs the pot and gives whichever of her kin is worst hurt a ladleful: 2d8 healing.', effects: [{ type: 'heal', dice: '2d8', diceEvery: 3 }] },
};
const WILLOW_MOVES = {
  lash: { name: 'Lash', target: 'enemy', text: 'A switch of willow as thick as your arm, and it wraps round your legs: Rooted.', effects: [atk('1d8', 'slash', { riders: [status('rooted')] })] },
  'bough-fall': { name: 'Bough-Fall', target: 'enemy', charge: true, text: 'It lifts a whole bough over you, charging: when it comes down, you Stagger.', effects: [atk('2d8', 'crush', { riders: [status('staggered')] })] },
  weep: { name: 'Weep', target: 'self', when: { hpBelow: 0.8 }, fallback: 'lash', text: 'It weeps, long and green, and the cuts in its bark close: Regenerating.', effects: [status('regenerating', { value: { dice: '1d6', diceEvery: 3 } })] },
};
const DROWNED_MOVES = {
  'cold-hands': { name: 'Cold Hands', target: 'enemy', text: 'Hands that have been under the water for a thousand years close on yours.', effects: [atk('1d6', 'crush', { aspect: 'tide' })] },
  'drag-down': { name: 'Drag Down', target: 'enemy', text: 'It takes you by the ankles and pulls you toward the water: Rooted, and Chilled.', effects: [atk('1d8', 'crush', { aspect: 'tide', riders: [status('rooted'), status('chilled')] })] },
  toll: { name: 'Toll', target: 'all-enemies', text: 'Somewhere under the water a bell tolls for the drowned. Every hero: WIS save or Frightened.', effects: [status('frightened', { save: 'WIS' })] },
  'black-water': { name: 'Black Water', target: 'enemy', text: 'It coughs the channel up all over you: 1d6 tide, CON save for half, and on a failed save you are Rotting.', effects: [{ type: 'damage', dice: '1d6', kind: 'tide', aspect: 'tide', save: 'CON', riders: [status('rotting')] }] },
};
const HYMN = { name: 'The Hymn', target: 'all-enemies', text: 'They sing the hymn that has kept something asleep under Misthollow for a thousand years, and it drags at you. Every hero: WIS save or Hexed.', effects: [status('hexed', { save: 'WIS' })] };

const GLOOMFEN = {
  'mire-leech': {
    id: 'mire-leech', name: 'Mire Leech', art: 'mire-leech', tier: 'rabble', kind: 'beast',
    hp: 16, guard: 13, atk: 4, dmg: 1, speed: 11, armor: 'none', aspect: 'blight',
    saves: { STR: 1, DEX: 1, CON: 3, WIS: 0 },
    moves: {
      latch: { name: 'Latch On', target: 'enemy', text: 'It comes up out of the ford and fastens on: Bleeding.', effects: [atk('1d6', 'pierce', { riders: [status('bleeding')] })] },
      drink: { name: 'Drink', target: 'enemy', text: 'It drinks, and swells, and heals by what it drinks.', effects: [{ type: 'damage', dice: '1d6', kind: 'blight', aspect: 'blight' }, { type: 'heal', dice: '1d6', diceEvery: 4, self: true }] },
      sink: { name: 'Sink', target: 'self', when: { hpBelow: 0.5 }, fallback: 'latch', text: 'It lets go and sinks back into the black water.', effects: [{ type: 'escape' }] },
    },
    table: [[1, 3, 'latch'], [4, 5, 'drink'], [6, 6, 'sink']],
    text: 'A leech as long as your arm, black and patient, lying in the fords of the safe paths. It fastens on, and it drinks.',
  },
  'marsh-light': {
    id: 'marsh-light', name: 'Marsh-Light', art: 'marsh-light', tier: 'rabble', kind: 'spirit',
    hp: 12, guard: 15, atk: 4, dmg: 1, speed: 13, armor: 'none', aspect: 'radiant',
    saves: { STR: 0, DEX: 3, CON: 0, WIS: 2 },
    moves: {
      'cold-fire': { name: 'Cold Fire', target: 'enemy', text: 'It drifts close and touches you with a fire that gives no heat.', effects: [atk('1d6', 'radiant', { aspect: 'radiant' })] },
      lure: { name: 'Lure', target: 'enemy', text: 'It bobs away over the water, and you want very much to follow it. WIS save or Charmed.', effects: [status('charmed', { save: 'WIS' })] },
      flicker: { name: 'Flicker', target: 'self', text: 'It gutters out, and lights again a step away: Guarding.', effects: [status('guarding')] },
    },
    table: [[1, 3, 'cold-fire'], [4, 5, 'lure'], [6, 6, 'flicker']],
    text: 'A light over the black water, the size and colour of a lantern flame. The fen folk know better than to follow one. Children do not.',
  },
  'lamp-moth': {
    id: 'lamp-moth', name: 'Lamp-Moth', art: 'lamp-moth', tier: 'rabble', kind: 'beast',
    hp: 11, guard: 14, atk: 4, dmg: 1, speed: 15, armor: 'none', aspect: 'radiant',
    saves: { STR: 0, DEX: 3, CON: 0, WIS: 1 },
    moves: {
      batter: { name: 'Batter', target: 'enemy', text: 'It batters at your face the way a moth batters at a lamp.', effects: [atk('1d6', 'crush')] },
      dust: { name: 'Dust in the Eyes', target: 'enemy', text: 'A burst of glittering wing-dust in your face. DEX save or Frightened.', effects: [status('frightened', { save: 'DEX' })] },
      circle: { name: 'Circle the Light', target: 'self', text: 'It wheels round the nearest light, faster and faster: Hasted.', effects: [status('hasted')] },
    },
    table: [[1, 3, 'batter'], [4, 5, 'dust'], [6, 6, 'circle']],
    text: 'A moth the size of a hand, pale gold, drawn to the Lantern Mother\'s light. Where she walks they come in clouds; she calls them to her.',
  },
  'blackwater-gar': {
    id: 'blackwater-gar', name: 'Blackwater Gar', art: 'blackwater-gar', tier: 'rabble', kind: 'beast',
    hp: 17, guard: 14, atk: 4, dmg: 2, speed: 13, armor: 'hide', aspect: 'tide',
    saves: { STR: 1, DEX: 3, CON: 1, WIS: 0 },
    moves: GAR_MOVES,
    table: [[1, 3, 'bite'], [4, 5, 'leap'], [6, 6, 'dive']],
    variants: {
      'old-jaws': holder('Old Jaws', 'old-jaws', 120, {
        ...GAR_MOVES,
        'death-roll': { name: 'Death Roll', target: 'enemy', charge: true, text: 'He takes you in his jaws and rolls, charging: 2d10 piercing, and you are Rooted in the mud of the channel bed.', effects: [atk('2d10', 'pierce', { riders: [status('rooted')] })] },
        'the-tooth': { name: 'The Tooth', target: 'enemy', requires: 'gar-tooth', fallback: 'bite', text: 'The great hooked tooth goes in and stays in: 3d8 piercing, and you Bleed (two stacks).', effects: [atk('3d8', 'pierce', { aspect: 'tide', riders: [status('bleeding', { stacks: 2 })] })] },
      }, [[1, 4, 'bite'], [5, 6, 'leap'], [7, 8, 'death-roll'], [9, 12, 'the-tooth']]),
    },
    text: 'A gar out of the Blackwater as long as a man, all jaw and armour. It lies still under the surface, and then it leaps.',
  },
  'bog-hag': {
    id: 'bog-hag', name: 'Bog-Hag', art: 'bog-hag', tier: 'veteran', humanoid: true,
    hp: 26, guard: 14, atk: 4, dmg: 2, speed: 10, armor: 'none', aspect: 'blight',
    saves: { STR: 0, DEX: 1, CON: 2, WIS: 3 },
    names: ['Aunt Sallow', 'Gammer Reed', 'Old Nan Grist', 'Mother Mould'],
    moves: HAG_MOVES,
    table: [[1, 3, 'ladle'], [4, 5, 'hex'], [6, 7, 'rot'], [8, 8, 'stir-the-pot']],
    variants: {
      grue: holder('Mother Grue', 'mother-grue', 140, {
        ...HAG_MOVES,
        'evil-eye': { name: 'The Evil Eye', target: 'all-enemies', requires: 'hag-stone', fallback: 'ladle', text: 'She looks at each of you in turn through the holed stone on her finger, and you feel yourself seen: 2d6 blight to every hero, WIS save for half, and on a failed save you are Hexed.', effects: [{ type: 'damage', dice: '2d6', kind: 'blight', aspect: 'blight', save: 'WIS', riders: [status('hexed')] }] },
      }, [[1, 3, 'ladle'], [4, 4, 'hex'], [5, 7, 'rot'], [8, 8, 'stir-the-pot'], [9, 12, 'evil-eye']], { atk: 6, dmg: 5 }),
    },
    gear: [
      [{ base: 'quarterstaff' }, { base: 'hood' }, { base: 'robe' }],
      [{ base: 'quarterstaff' }, { base: 'hood' }, { base: 'robe' }, { base: 'gloves' }],
      [{ base: 'rowan-staff' }, { base: 'hood' }, { base: 'robe' }, { base: 'gloves' }],
      [{ base: 'rowan-staff' }, { base: 'hood' }, { base: 'robe' }, { base: 'gloves' }, { base: 'boots' }],
    ],
    text: 'A hag of the eastern bogs with a pot on the boil and a curse on the tip of her tongue. She rots what she touches, and she knows your name.',
  },
  'willow-wight': {
    id: 'willow-wight', name: 'Willow-Wight', art: 'willow-wight', tier: 'veteran', kind: 'plant',
    hp: 34, guard: 13, atk: 4, dmg: 3, speed: 8, armor: 'hide', aspect: 'verdant',
    saves: { STR: 3, DEX: 0, CON: 3, WIS: 1 },
    moves: WILLOW_MOVES,
    table: [[1, 4, 'lash'], [5, 6, 'bough-fall'], [7, 8, 'weep']],
    variants: {
      grandfather: holder('Grandfather Willow', 'grandfather-willow', 170, {
        ...WILLOW_MOVES,
        'weeping-volley': { name: 'Weeping Volley', target: 'all-enemies', requires: 'weeping-bow', fallback: 'lash', text: 'He draws the bow strung with his own hair, and it weeps arrows over the whole line: 2d6 piercing to every hero, DEX save for half, and on a failed save you are Rooted.', effects: [{ type: 'damage', dice: '2d6', kind: 'pierce', aspect: 'verdant', save: 'DEX', riders: [status('rooted')] }] },
      }, [[1, 4, 'lash'], [5, 6, 'bough-fall'], [7, 8, 'weep'], [9, 12, 'weeping-volley']], { atk: 6, dmg: 4 }),
    },
    text: 'A willow that pulled up its roots and walked when Willowmurk\'s wards went dark. It weeps as it comes, and its switches hold on.',
  },
  drowned: {
    id: 'drowned', name: 'Drowned', art: 'drowned', tier: 'veteran', kind: 'undead',
    hp: 26, guard: 14, atk: 4, dmg: 2, speed: 9, armor: 'none', aspect: 'tide',
    saves: { STR: 2, DEX: 0, CON: 3, WIS: 1 },
    moves: DROWNED_MOVES,
    table: [[1, 3, 'cold-hands'], [4, 5, 'drag-down'], [6, 6, 'toll'], [7, 8, 'black-water']],
    variants: {
      'bell-ringer': {
        name: 'Drowned Bell-Ringer', hp: 22, art: 'bell-ringer',
        moves: {
          ...DROWNED_MOVES,
          peal: { name: 'Peal', target: 'all-enemies', text: 'It hauls on a bell-rope that runs down into the dark, and the bell answers: 1d4 tide to every hero, CON save for half, and on a failed save you Stagger.', effects: [{ type: 'damage', dice: '1d4', kind: 'tide', aspect: 'tide', save: 'CON', riders: [status('staggered')] }] },
        },
        table: [[1, 3, 'cold-hands'], [4, 5, 'drag-down'], [6, 6, 'peal'], [7, 8, 'black-water']],
      },
      choir: {
        name: 'Drowned Chorister', hp: 24, art: 'drowned-choir',
        moves: { ...DROWNED_MOVES, 'the-hymn': HYMN },
        table: [[1, 3, 'cold-hands'], [4, 5, 'the-hymn'], [6, 6, 'toll'], [7, 8, 'black-water']],
      },
      cantor: holder('The Drowned Cantor', 'drowned-cantor', 180, {
        ...DROWNED_MOVES,
        'the-hymn': HYMN,
        'beat-time': { name: 'Beat Time', target: 'all-allies', text: 'He beats time on the flagstones with his staff, and the choir sings faster: every one of them is Hasted.', effects: [status('hasted')] },
        downbeat: { name: 'Downbeat', target: 'all-enemies', requires: 'cantors-staff', fallback: 'cold-hands', text: 'He brings the Cantor\'s Staff down on the downbeat, and the whole drowned hall rings with it: 2d8 tide to every hero, WIS save for half, and on a failed save you are Hexed.', effects: [{ type: 'damage', dice: '2d8', kind: 'tide', aspect: 'tide', save: 'WIS', riders: [status('hexed')] }] },
      }, [[1, 3, 'cold-hands'], [4, 5, 'drag-down'], [6, 6, 'the-hymn'], [7, 8, 'beat-time'], [9, 12, 'downbeat']], { atk: 7, dmg: 6 }),
    },
    text: 'One of Misthollow\'s drowned, grey and swollen and still going about its business under the water: ringing its bell, singing its hymn, walking its old street.',
  },
  // Hodge (spec A11, §3.5): the terrible fight. Level party + 6 and three chosen Omens (the encounter's). He opens every
  // fight with Toll Is Due (`opener`: the strongest hero makes a CHA save or loses a turn), he never runs, and at 0 HP he
  // sits down on his stool (`koText`). His toll comes loose only by grip: `keepsRelics`, a holder that keeps what it
  // still grips when it is beaten (no shattered drop; docs/RULES.md §6).
  hodge: {
    id: 'hodge', name: 'Hodge', art: 'hodge', tier: 'relic-bearer', humanoid: true, unique: true, keepsRelics: true,
    // his Grudge titles when he beats you (the spec's "Hodge the Paid-in-Full and the like"; rules/gauntlet.js)
    grudgeTitles: { win: ['the Paid-in-Full', 'the Twice-Paid', 'the Thrice-Paid', 'the Ever-Paid'] },
    hp: 72, guard: 19, atk: 6, dmg: 4, speed: 10, armor: 'hide', aspect: null,
    saves: { STR: 3, DEX: 1, CON: 4, WIS: 3, CHA: 5 },
    relics: ['unfair-toll'],
    opener: 'toll-is-due',
    koText: 'Hodge sits down on his stool, sets the lantern on his knee and looks at you for a long time. "Fine," he says. "Toll\'s paid. This once."',
    moves: {
      'toll-is-due': { name: 'Toll Is Due', target: 'strongest', text: 'Hodge opens the toll-book, licks his thumb and finds the biggest name in it. The toll is due: CHA save, or the strongest of you loses a turn paying it.', effects: [{ type: 'delay', save: 'CHA', dc: 20, turns: 1, text: '{target} stops to count out the toll, and loses a turn.' }] },
      'old-mans-cane': { name: 'Old Man\'s Cane', target: 'enemy', text: 'It is a walking stick. It is also a cudgel with a lead core: 2d10 crushing, and you Stagger.', effects: [atk('2d10', 'crush', { riders: [status('staggered')] })] },
      'bridge-troll': { name: 'Bridge Troll', target: 'enemy', charge: true, text: 'He gets a shoulder under you, charging: he means to shove you off the bridge and into the Blackwater. You will be in the river for two turns.', effects: [atk('1d8', 'crush', { riders: [status('swallowed', { label: 'In the river' })] })] },
      'clipped-coin': { name: 'Clipped Coin', target: 'enemy', requires: 'unfair-toll', fallback: 'old-mans-cane', text: 'He flips the clipped coin. Heads, he hits you twice. It is always heads.', effects: [atk('1d10', 'crush'), atk('1d10', 'crush')] },
    },
    table: [[1, 6, 'old-mans-cane'], [7, 8, 'bridge-troll'], [9, 12, 'clipped-coin']],
    gear: [
      [{ base: 'mace' }, { base: 'hood' }, { base: 'jerkin' }],
      [{ base: 'mace' }, { base: 'hood' }, { base: 'jerkin' }, { base: 'boots' }],
      [{ base: 'flanged-mace' }, { base: 'hood' }, { base: 'brigandine' }, { base: 'boots' }],
      [{ base: 'flanged-mace' }, { base: 'kettle-helm' }, { base: 'brigandine' }, { base: 'ironshod-boots' }],
    ],
    text: 'The toll-keeper of Rotbridge, who is not actually a troll: just an extremely unpleasant old man with a cudgel, a lantern and a toll-book. He is much harder than he looks, and he has never once paid a toll himself.',
  },
  // Champions (spec §3.5): each piece is a relic with its own grip meter; snapping one off shuts its moves down.
  'lantern-mother': {
    id: 'lantern-mother', name: 'The Lantern Mother', art: 'lantern-mother', tier: 'champion', kind: 'undead', unique: true,
    hp: 215, guard: 19, atk: 9, dmg: 7, speed: 11, armor: 'none', aspect: 'radiant', weak: ['tide'],
    saves: { STR: 2, DEX: 3, CON: 3, WIS: 5 },
    relics: ['lamplighters-lantern', 'mourning-veil'],
    noFlee: true,
    moves: {
      'lamp-pole': { name: 'Lamp-Pole', target: 'enemy', text: 'The long hooked pole she lit Misthollow\'s lamps with, swung like a scythe: 2d10 crushing.', effects: [atk('2d10', 'crush')] },
      lure: { name: 'Lure', target: 'enemy', requires: 'lamplighters-lantern', fallback: 'lamp-pole', text: 'She lifts the lantern and smiles at one of you, the way she smiled at the children. WIS save or Charmed.', effects: [status('charmed', { save: 'WIS' })] },
      'lantern-flare': { name: 'Lantern Flare', target: 'all-enemies', text: 'Every lamp in the Hollow flares at once: 3d8 radiant to every hero, DEX save for half.', effects: [{ type: 'damage', dice: '3d8', kind: 'radiant', aspect: 'radiant', save: 'DEX' }] },
      'hush-now': { name: 'Hush Now', target: 'all-enemies', text: '"Hush now," she says, "hush," and it is very hard not to. Every hero: WIS save or Hexed.', effects: [status('hexed', { save: 'WIS' })] },
      'lead-them-down': { name: 'Lead Them Down', target: 'enemy', charge: true, text: 'She takes one of you by the hand, charging: she means to lead you down under the water, where it is safe. WIS save, or you are led away for two turns.', effects: [status('swallowed', { save: 'WIS', label: 'Led away' })] },
      moths: { name: 'Moths', target: 'self', fallback: 'lamp-pole', text: 'She holds up the lantern, and a lamp-moth comes to it out of the dark.', effects: [{ type: 'summon', family: 'lamp-moth', count: 1, max: 2, levelDelta: -4 }] },
      mourning: { name: 'Mourning', target: 'all-enemies', requires: 'mourning-veil', fallback: 'lamp-pole', text: 'She lifts the veil, and you see her grief. Every hero is Frightened, and Rotting.', effects: [status('frightened'), status('rotting')] },
      snuff: { name: 'Snuff', target: 'all-enemies', text: 'She pinches out the lamps one by one, and the dark comes in close. Every hero is Exposed.', effects: [status('exposed')] },
      'lantern-nova': { name: 'Lantern Nova', target: 'all-enemies', requires: 'lamplighters-lantern', fallback: 'lamp-pole', text: 'The lantern burns white, and so does everything it shines on: 3d8 radiant to every hero, and you Burn.', effects: [{ type: 'damage', dice: '3d8', kind: 'radiant', aspect: 'radiant', riders: [status('burning')] }] },
      'drown-the-light': { name: 'Drown the Light', target: 'enemy', charge: true, text: 'She plunges the lantern into the black water, and the water comes up out of it at one of you, charging: 4d10 tide.', effects: [atk('4d10', 'tide', { aspect: 'tide' })] },
    },
    phases: [
      { at: 1, text: 'Lamplight. Every lamp in the sunken house is lit, and she stands among the sleeping children with her lantern held high.', table: [[1, 6, 'lamp-pole'], [7, 11, 'lantern-flare'], [12, 16, 'lure'], [17, 20, 'hush-now']] },
      { at: 0.66, text: 'The Children\'s Road. She turns toward the black water, and the lamps along the drowned path light one by one.', table: [[1, 5, 'lamp-pole'], [6, 10, 'lead-them-down'], [11, 15, 'moths'], [16, 20, 'mourning']] },
      { at: 0.33, text: 'Lights Out. The lamps go out, all but hers, and she stops being gentle.', table: [[1, 4, 'lamp-pole'], [5, 9, 'snuff'], [10, 15, 'lantern-nova'], [16, 20, 'drown-the-light']] },
    ],
    text: 'The last lamplighter of Misthollow, who led its children out along the boardwalk the night the city sank, and went back for the last of them. The Tallymen\'s dredging woke her, and she is leading children out again, to the drowned city, where she thinks they are safe. Water finds her; the lamps are hers.',
  },
  'blackwater-leviathan': {
    id: 'blackwater-leviathan', name: 'The Blackwater Leviathan', art: 'blackwater-leviathan', tier: 'champion', kind: 'beast', unique: true,
    hp: 160, guard: 22, atk: 8, dmg: 6, speed: 7, armor: 'hide', aspect: 'tide',
    saves: { STR: 6, DEX: 1, CON: 5, WIS: 2 },
    relics: ['corvus-harpoon', 'deep-pearl'],
    noFlee: true,
    moves: {
      coil: { name: 'Coil', target: 'enemy', text: 'A loop of it comes up out of the water and closes on one of you: 2d10 crushing, and you are Rooted.', effects: [atk('2d10', 'crush', { riders: [status('rooted')] })] },
      'tail-slap': { name: 'Tail Slap', target: 'all-enemies', text: 'Its tail comes down across the flats: 2d6 tide to every hero, DEX save for half.', effects: [{ type: 'damage', dice: '2d6', kind: 'tide', aspect: 'tide', save: 'DEX' }] },
      sound: { name: 'Sound', target: 'self', then: 'breach', text: 'It sounds: it goes down into the deep, and the great chain runs out after it. Nothing can reach it until it comes up.', effects: [status('burrowed', { self: true })] },
      breach: { name: 'Breach', target: 'enemy', charge: true, text: 'The water heaves under one of you, charging: it comes up out of the deep underneath you, 4d10 tide, and you Stagger.', effects: [atk('4d10', 'tide', { aspect: 'tide', riders: [status('staggered')] })] },
      swallow: { name: 'Swallow', target: 'enemy', charge: true, text: 'Its jaws open over one of you, charging: it means to swallow you whole, until it has had enough of you or you hit it hard enough to make it spit.', effects: [atk('2d8', 'crush', { riders: [status('swallowed', { label: 'Swallowed whole' })] })] },
      undertow: { name: 'Undertow', target: 'all-enemies', text: 'It rolls, and the flats run out from under your feet: 1d6 tide to every hero, and whoever fails a STR save is Rooted and Chilled.', effects: [{ type: 'damage', dice: '1d6', kind: 'tide', aspect: 'tide', save: 'STR', riders: [status('rooted'), status('chilled')] }] },
      'harpoon-rage': { name: 'Harpoon Rage', target: 'enemy', requires: 'corvus-harpoon', fallback: 'coil', text: 'The harpoon in its side twists, and the pain drives it mad: it coils on one of you twice in one breath.', effects: [atk('2d10', 'crush', { riders: [status('rooted')] }), atk('2d10', 'crush', { riders: [status('rooted')] })] },
      'pearl-light': { name: 'Pearl-Light', target: 'self', requires: 'deep-pearl', fallback: 'tail-slap', text: 'The pearl in its brow lights the water green, and its wounds close: it heals 2d8, and is Warded.', effects: [{ type: 'heal', dice: '2d8', diceEvery: 3 }, status('warded', { value: { dice: '2d8', diceEvery: 3 } })] },
      flood: { name: 'Flood', target: 'all-enemies', text: 'The whole channel comes up over the flats: 3d8 tide to every hero, DEX save for half.', effects: [{ type: 'damage', dice: '3d8', kind: 'tide', aspect: 'tide', save: 'DEX' }] },
    },
    phases: [
      { at: 1, text: 'The Wake. The chain goes taut, and something as long as the channel is wide comes up out of the deep.', table: [[1, 9, 'coil'], [10, 15, 'tail-slap'], [16, 20, 'sound']] },
      { at: 0.66, text: 'The Deep. It drags the chain-post half out of the mud, and the flats start to go under.', table: [[1, 5, 'coil'], [6, 10, 'swallow'], [11, 15, 'undertow'], [16, 20, 'harpoon-rage']] },
      { at: 0.33, text: 'Blackwater. The pearl in its brow burns green, and the whole channel comes up with it.', table: [[1, 5, 'coil'], [6, 11, 'pearl-light'], [12, 16, 'flood'], [17, 20, 'swallow']] },
    ],
    text: 'The thing that lives in the Blackwater, as long as the channel is wide. The Tallymen hooked it with a stolen harpoon and chained it by an iron collar to tow their barges up from the sea, and chained and maddened it sinks every other boat. Lightning finds it; the harpoon is still in its side and the pearl in its brow.',
  },
};

// The Tallymen of the Gloomfen: new variants of the M3 families (spec §3.2). The Salvage-Master and the Bargemaster
// are holders; the reed-cutters, divers and bargehands are rabble.
const TALLY_GLOOM = {
  tallyman: {
    ...TALLY_IRON.tallyman,
    variants: {
      ...TALLY_IRON.tallyman.variants,
      'salvage-master': holder('The Salvage-Master', 'salvage-master', 70, {
        ...TALLY_MOVES,
        'salvage-hook': { name: 'Salvage Hook', target: 'enemy', text: 'A crane-hook on a short chain, swung round his head: 1d8 piercing, and it hauls you off your feet (you Stagger).', effects: [atk('1d8', 'pierce', { riders: [status('staggered')] })] },
        'diving-bell': { name: 'The Diving Bell', target: 'all-enemies', requires: 'salvagers-helm', fallback: 'salvage-hook', text: 'He dogs the Salvager\'s Helm shut and cuts the crane loose: the diving bell comes down on the jetty, and the channel comes up after it: 2d6 tide to every hero, CON save for half, and you are Chilled.', effects: [{ type: 'damage', dice: '2d6', kind: 'tide', aspect: 'tide', save: 'CON', riders: [status('chilled')] }] },
      }, [[1, 4, 'salvage-hook'], [5, 6, 'tally-mark'], [7, 8, 'smoke-pot'], [9, 12, 'diving-bell']]),
      bargemaster: holder('The Bargemaster', 'bargemaster', 76, {
        ...TALLY_MOVES,
        'boat-hook': { name: 'Boat-Hook', target: 'enemy', text: 'A barge-pole with an iron hook on the end, long enough to reach you from the deck: 1d8 piercing.', effects: [atk('1d8', 'pierce')] },
        'make-fast': { name: 'Make Fast!', target: 'all-allies', text: 'He bawls the order, and his bargehands close up behind the chain-post: every one of them Guards.', effects: [status('guarding')] },
        'haul-away': { name: 'Haul Away', target: 'enemy', requires: 'barge-gauntlets', fallback: 'boat-hook', charge: true, text: 'He takes the great chain in the Barge-Chain Gauntlets and hauls, charging: the chain comes across the flats at one of you, 3d8 crushing, and you Stagger.', effects: [atk('3d8', 'crush', { riders: [status('staggered')] })] },
      }, [[1, 4, 'boat-hook'], [5, 6, 'tally-mark'], [7, 7, 'make-fast'], [8, 8, 'smoke-pot'], [9, 12, 'haul-away']]),
    },
  },
  smuggler: {
    ...TALLY_IRON.smuggler,
    variants: {
      ...TALLY_IRON.smuggler.variants,
      reedcutter: {
        name: 'Reed-Cutter', hp: 19, art: 'reedcutter',
        moves: { ...SMUGGLER_MOVES, 'reed-hook': { name: 'Reed-Hook', target: 'enemy', text: 'A long sickle on a pole, for cutting reeds and hamstrings: 1d8 slashing.', effects: [atk('1d8', 'slash')] } },
        table: [[1, 4, 'reed-hook'], [5, 5, 'caltrops'], [6, 6, 'bolt']],
      },
      diver: {
        name: 'Salvage Diver', hp: 20, art: 'salvage-diver',
        moves: { ...SMUGGLER_MOVES, grapnel: { name: 'Grapnel', target: 'enemy', text: 'A diver\'s grapnel on a wet line, thrown and hauled: 1d6 piercing, and it drags your guard aside (Exposed).', effects: [atk('1d6', 'pierce', { riders: [status('exposed')] })] } },
        table: [[1, 3, 'cut'], [4, 5, 'grapnel'], [6, 6, 'bolt']],
      },
      bargehand: {
        name: 'Bargehand', hp: 22, art: 'bargehand',
        moves: { ...SMUGGLER_MOVES, 'punt-pole': { name: 'Punt-Pole', target: 'enemy', text: 'A punt-pole, swung two-handed across the towpath: 1d8 crushing, and you Stagger.', effects: [atk('1d8', 'crush', { riders: [status('staggered')] })] } },
        table: [[1, 3, 'cut'], [4, 5, 'punt-pole'], [6, 6, 'bolt']],
      },
    },
  },
};

// ---- M7: the Hearth Below (spec §3.2, §3.5; owner P4). Stats are for level 1, like everything above; the Waking adds the
// rest (a player arrives at Waking 8 with every Brand held, and no Brand is left to raise it; data/encounters.js BELOW).
//   - The cinder-thralls are the Unsmith's ash-men, shaped from the hearth's own ash: the Ash Stair's packs, and at its
//     narrows an overseer with a whip of hot chain (`thrall-overseer`, a veteran). The unmade are relic-bearers the
//     Worldforge unmade: husks still carrying the shape of what they held. The forge-warden is a bellows-and-anvil
//     construct that holds the Worldforge's bridge.
//   - The Hollow Council (spec A11, §3.5): tier `hollow`, a d20 that adds +4 while the gift sent to their chair is still
//     held (`bonusWhile`: their one piece, `relics`). Each gift's Arts need the gift and sit on the d20's high faces, so
//     the +4 brings them up more often; pried loose, the gift takes the +4 with it and its Arts fall back to plain moves.
//     Beaten while it still grips its gift, a member drops it as a Champion drops a piece (not `keepsRelics`). Two phases
//     each (at 1 and 0.5); the second answers their own story: Miravel's thorns, Qasim's drought, Brundar's iron,
//     Gretch's fear and favours. Each is unique, never flees, carries chosen Omens (never Twinned), says their own words
//     back to themselves at 0 HP (`koText`) and has Grudge titles of their own. They are fought back to back and tuned
//     together (spec §8).
//   - The Unsmith (spec A16, §3.5): tier `unsmith`, two d20s (two intents shown, two moves a turn; a Stagger breaks the
//     next of the two). Three phases, each with a piece of his: the Smith (the Unmaking Hammer: hammer blows, and Unmake,
//     which leaves a hero Unmade for two turns), the Thief (at 0.66, `steals`: he takes up the relics the Warden never
//     claimed, rules/codex.js stolenFor, and a table row 'stolen' plays one of his Stolen Arts, or `stolenFallback` for
//     a Warden who left him none) and the Worldforge (at 0.33: the forge's fire on every hero, and the heart's pull,
//     which holds a hero in the furnace's mouth). The Ironvein Apron turns his blows into a ward.
// Tuned with tools/sim.mjs (docs/RULES.md §12, M7).
const THRALL_MOVES = {
  'cinder-fist': { name: 'Cinder Fist', target: 'enemy', text: 'A fist of packed ash with a live coal for a knuckle: 1d6 crushing, and it Burns.', effects: [atk('1d6', 'crush', { aspect: 'ember', riders: [status('burning')] })] },
  'ash-in-the-eyes': { name: 'Ash in the Eyes', target: 'enemy', text: 'It bursts into hot ash in your face and pulls itself back together behind it. DEX save or Frightened.', effects: [status('frightened', { save: 'DEX' })] },
  reform: { name: 'Reform', target: 'self', when: { hpBelow: 0.5 }, fallback: 'cinder-fist', text: 'It slumps into a heap of ash, and the heap stands up again: Regenerating.', effects: [status('regenerating', { value: { dice: '1d6', diceEvery: 3 } })] },
};
const UNMADE_MOVES = {
  'empty-grip': { name: 'Empty Grip', target: 'enemy', text: 'Its hands still close on the shape of the relic it held. They close on you instead: 1d8 crushing.', effects: [atk('1d8', 'crush')] },
  'phantom-art': { name: 'Phantom Art', target: 'enemy', text: 'It swings the relic it no longer holds, and the Art it no longer has comes anyway: 2d6 blight, CON save for half.', effects: [{ type: 'damage', dice: '2d6', kind: 'blight', aspect: 'blight', save: 'CON' }] },
  'grey-touch': { name: 'Grey Touch', target: 'enemy', text: 'A grey hand on your arm, and the colour goes out of you where it touched: 1d6 blight, and you are Rotting.', effects: [atk('1d6', 'blight', { aspect: 'blight', riders: [status('rotting')] })] },
  husk: { name: 'Husk', target: 'self', text: 'It is only a husk. A blow goes straight through it and finds almost nothing to hurt: Guarding.', effects: [status('guarding')] },
};
const WARDEN_MOVES = {
  'hammer-arm': { name: 'Hammer Arm', target: 'enemy', text: 'Its hammer arm comes down on you like a smith\'s on the anvil: 1d10 crushing.', effects: [atk('1d10', 'crush')] },
  'bellows-breath': { name: 'Bellows Breath', target: 'all-enemies', text: 'It opens the bellows in its chest on the whole bridge: 1d8 ember to every hero, CON save for half.', effects: [{ type: 'damage', dice: '1d8', kind: 'ember', aspect: 'ember', save: 'CON' }] },
  'hold-the-bridge': { name: 'Hold the Bridge', target: 'enemy', charge: true, text: 'It plants itself on the bridge and drives its anvil head into you, charging: 2d10 crushing, and you Stagger.', effects: [atk('2d10', 'crush', { riders: [status('staggered')] })] },
  stoke: { name: 'Stoke', target: 'self', text: 'Its thralls rake its fire-door, and the fire inside it goes white: Hasted, and Warded.', effects: [status('hasted'), status('warded', { value: { dice: '1d8', diceEvery: 3 } })] },
};

const HEARTH_BELOW = {
  'cinder-thrall': {
    id: 'cinder-thrall', name: 'Cinder-Thrall', art: 'cinder-thrall', tier: 'rabble', kind: 'construct',
    hp: 17, guard: 14, atk: 4, dmg: 2, speed: 11, armor: 'none', aspect: 'ember',
    saves: { STR: 1, DEX: 2, CON: 2, WIS: 0 },
    moves: THRALL_MOVES,
    table: [[1, 3, 'cinder-fist'], [4, 5, 'ash-in-the-eyes'], [6, 6, 'reform']],
    variants: {
      // the thralls' driver at the Ash Stair's narrows (spec §3.3): a veteran of the same ash, a head taller, in an iron
      // smith's mask with the broken-ring mark on his collar (P6's `thrall-overseer`)
      'thrall-overseer': {
        name: 'Thrall-Overseer', tier: 'veteran', hp: 30, art: 'thrall-overseer',
        moves: {
          ...THRALL_MOVES,
          'hot-chain': { name: 'Hot Chain', target: 'enemy', text: 'A whip of chain drawn hot from the forge, cracked across you: 1d8 slashing, and it Burns.', effects: [atk('1d8', 'slash', { aspect: 'ember', riders: [status('burning')] })] },
          'drive-them': { name: 'Drive Them', target: 'all-allies', text: 'He cracks the hot chain over his thralls, and they come on faster: every one of them is Hasted.', effects: [status('hasted')] },
        },
        table: [[1, 3, 'hot-chain'], [4, 5, 'cinder-fist'], [6, 6, 'ash-in-the-eyes'], [7, 8, 'drive-them']],
      },
    },
    text: 'One of the Unsmith\'s ash-men, shaped from the hearth\'s own ash with a coal for a heart. It remembers being a fire, and it would like to be one again.',
  },
  unmade: {
    id: 'unmade', name: 'The Unmade', art: 'unmade', tier: 'veteran', kind: 'undead',
    hp: 28, guard: 15, atk: 4, dmg: 2, speed: 9, armor: 'none', aspect: 'blight',
    saves: { STR: 2, DEX: 0, CON: 3, WIS: 1 },
    moves: UNMADE_MOVES,
    table: [[1, 3, 'empty-grip'], [4, 5, 'phantom-art'], [6, 7, 'grey-touch'], [8, 8, 'husk']],
    text: 'A relic-bearer the Worldforge unmade: a grey husk still carrying the shape of the thing it held, and still reaching for it.',
  },
  'forge-warden': {
    id: 'forge-warden', name: 'Forge-Warden', art: 'forge-warden', tier: 'veteran', kind: 'construct',
    hp: 40, guard: 17, atk: 5, dmg: 3, speed: 8, armor: 'plate', aspect: 'ember',
    saves: { STR: 4, DEX: 0, CON: 4, WIS: 1 },
    moves: WARDEN_MOVES,
    table: [[1, 3, 'hammer-arm'], [4, 5, 'bellows-breath'], [6, 7, 'hold-the-bridge'], [8, 8, 'stoke']],
    text: 'A kiln of firebrick as tall as a door, with an anvil for a head, a hammer for an arm and a bellows that breathes like a forge, set at the near end of the Worldforge\'s bridge to keep it. Its thralls keep it fed.',
  },
  // ---- the Hollow Council (spec A11, §3.5): Nos. 67-70 are the gifts they wear
  'hollow-miravel': {
    id: 'hollow-miravel', name: 'Hollow Miravel', art: 'hollow-miravel', tier: 'hollow', kind: 'human', unique: true, noFlee: true,
    hp: 150, guard: 19, atk: 10, dmg: 7, speed: 10, armor: 'hide', aspect: 'verdant',
    saves: { STR: 2, DEX: 2, CON: 3, WIS: 5, CHA: 3 },
    relics: ['hollow-wreath'], bonusWhile: 'hollow-wreath',
    grudgeTitles: { win: ['the Unheeded', 'the Twice-Unheeded', 'the Thrice-Unheeded', 'the Ever-Unheeded'] },
    koText: 'Miravel says, in her own voice, "Keep folk come for timber and advice." Then, quieter: "They never take it."',
    moves: {
      'rowan-staff': { name: 'Rowan Staff', target: 'enemy', text: 'The rowan staff she walked Eldergrove\'s bounds with for sixty years: 2d8 crushing.', effects: [atk('2d8', 'crush')] },
      'unheeded-advice': { name: 'Unheeded Advice', target: 'enemy', text: 'She tells you, very kindly, exactly what you are doing wrong, and you cannot stop hearing it. WIS save or Hexed.', effects: [status('hexed', { save: 'WIS' })] },
      'grey-bark': { name: 'Grey Bark', target: 'self', text: 'Bark creeps over her skin, grey where it should be green: Warded.', effects: [status('warded', { value: { dice: '2d8', diceEvery: 3 } })] },
      'hollow-bloom': { name: 'Hollow Bloom', target: 'all-enemies', requires: 'hollow-wreath', fallback: 'rowan-staff', text: 'The Hollow Wreath blooms violet-black, and thorns come up through the floor under every one of you: 2d8 piercing, STR save for half, and you are Rooted.', effects: [{ type: 'damage', dice: '2d8', kind: 'pierce', aspect: 'verdant', save: 'STR', riders: [status('rooted')] }] },
      thornwall: { name: 'Thornwall', target: 'all-enemies', text: 'A wall of grey thorn comes up round the whole line: 1d8 piercing to every hero, and you Bleed.', effects: [{ type: 'damage', dice: '1d8', kind: 'pierce', aspect: 'verdant', riders: [status('bleeding')] }] },
      'every-fallen-tree': { name: 'Every Fallen Tree', target: 'enemy', charge: true, text: 'Every tree she ever let fall comes back up through the floor at one of you as a single trunk of thorn, charging: 3d8 piercing, and you Bleed (two stacks).', effects: [atk('3d8', 'pierce', { aspect: 'verdant', riders: [status('bleeding', { stacks: 2 })] })] },
      'hollow-harvest': { name: 'Hollow Harvest', target: 'all-enemies', requires: 'hollow-wreath', fallback: 'rowan-staff', text: 'The Hollow Wreath takes the green out of everything in the hall and gives it to her: 2d6 verdant to every hero, and she Regenerates.', effects: [{ type: 'damage', dice: '2d6', kind: 'verdant', aspect: 'verdant' }, status('regenerating', { self: true, value: { dice: '2d6', diceEvery: 3 } })] },
    },
    phases: [
      { at: 1, text: 'The Elder. Miravel stands before the tree\'s chair with the Hollow Wreath in her white hair, and it glows violet-black.', table: [[1, 7, 'rowan-staff'], [8, 11, 'unheeded-advice'], [12, 14, 'grey-bark'], [15, 20, 'hollow-bloom']] },
      { at: 0.5, text: 'Every Tree That Fell. The wreath shows her every tree she ever let fall, and every one of them comes back up through the floor as thorn.', table: [[1, 5, 'rowan-staff'], [6, 10, 'thornwall'], [11, 14, 'every-fallen-tree'], [15, 20, 'hollow-harvest']] },
    ],
    text: 'Elder Miravel of Eldergrove, before the chair carved with the tree, wearing the Hollow Wreath the Unsmith sent her. It has hollowed her: she is grey from her hair to her feet, and only the wreath has any colour left.',
  },
  'hollow-qasim': {
    id: 'hollow-qasim', name: 'Hollow Qasim', art: 'hollow-qasim', tier: 'hollow', kind: 'human', unique: true, noFlee: true,
    hp: 125, guard: 19, atk: 8, dmg: 6, speed: 11, armor: 'hide', aspect: 'ember',
    saves: { STR: 3, DEX: 3, CON: 3, WIS: 3, CHA: 4 },
    relics: ['hollow-chalice'], bonusWhile: 'hollow-chalice',
    grudgeTitles: { win: ['the Unquenched', 'the Twice-Unquenched', 'the Thrice-Unquenched', 'the Ever-Thirsting'] },
    koText: '"I dislike owing," says Qasim, hoarse, in his own voice again. "So I pay quickly."',
    moves: {
      scimitar: { name: 'Scimitar', target: 'enemy', text: 'The jewelled scimitar of Sandspire\'s Cistern Lords, and he was a raider before he was a lord: 2d8 slashing.', effects: [atk('2d8', 'slash')] },
      'sand-in-the-eyes': { name: 'Sand in the Eyes', target: 'enemy', text: 'An old raider\'s trick: a fistful of hot sand out of nowhere. DEX save or Frightened.', effects: [status('frightened', { save: 'DEX' })] },
      'what-you-owe': { name: 'What You Owe', target: 'enemy', text: '"You owe Sandspire water," he says, and names the sum. CHA save, or you stop to count it, and your next turn comes a whole turn later.', effects: [{ type: 'delay', save: 'CHA', dc: 20, turns: 1, text: '{target} stops to count what they owe, and loses a turn.' }] },
      'hollow-draught': { name: 'Hollow Draught', target: 'self', requires: 'hollow-chalice', fallback: 'scimitar', text: 'He drinks from the Hollow Chalice, and whatever it holds, it is never full: he heals 3d8, and is Hasted.', effects: [{ type: 'heal', dice: '3d8', diceEvery: 3 }, status('hasted')] },
      drought: { name: 'Drought', target: 'all-enemies', text: 'The air goes dry as the Dust Trail at noon, and then drier: 2d8 ember to every hero, CON save for half, and you Burn.', effects: [{ type: 'damage', dice: '2d8', kind: 'ember', aspect: 'ember', save: 'CON', riders: [status('burning')] }] },
      mirage: { name: 'Mirage', target: 'enemy', text: 'He shows you water where there is none, as the wisps of the Glass Flats do. WIS save or Charmed.', effects: [status('charmed', { save: 'WIS' })] },
      'drink-them-dry': { name: 'Drink Them Dry', target: 'all-enemies', requires: 'hollow-chalice', fallback: 'scimitar', text: 'He holds the Hollow Chalice out over you and it drinks, from every one of you: 2d6 ember to every hero, and he heals 2d8.', effects: [{ type: 'damage', dice: '2d6', kind: 'ember', aspect: 'ember' }, { type: 'heal', dice: '2d8', diceEvery: 3, self: true }] },
    },
    phases: [
      { at: 1, text: 'The Cistern Lord. Qasim stands before the sun\'s chair with the Hollow Chalice in his hand, and it is full of something dark that does not spill.', table: [[1, 7, 'scimitar'], [8, 11, 'sand-in-the-eyes'], [12, 14, 'what-you-owe'], [15, 20, 'hollow-draught']] },
      { at: 0.5, text: 'The Drought. The chalice shows him every cup he ever sold that he should have given, and it drinks the hall dry to fill itself.', table: [[1, 5, 'scimitar'], [6, 10, 'drought'], [11, 14, 'mirage'], [15, 20, 'drink-them-dry']] },
    ],
    text: 'Cistern Lord Qasim of Sandspire, before the chair carved with the sun, holding the Hollow Chalice the Unsmith sent him. It has hollowed him: he is grey from his turban to his boots, and the chalice is never full.',
  },
  'hollow-brundar': {
    id: 'hollow-brundar', name: 'Hollow Brundar', art: 'hollow-brundar', tier: 'hollow', kind: 'human', unique: true, noFlee: true,
    hp: 110, guard: 18, atk: 8, dmg: 6, speed: 8, armor: 'mail', aspect: 'stone',
    saves: { STR: 5, DEX: 1, CON: 5, WIS: 3, CHA: 2 },
    relics: ['hollow-gauntlet'], bonusWhile: 'hollow-gauntlet',
    grudgeTitles: { win: ['the Unforgiving', 'the Twice-Unforgiving', 'the Thrice-Unforgiving', 'the Iron-Hearted'] },
    koText: '"I don\'t open gifts from men who rob me," Brundar growls, in his own voice, and his fist comes open.',
    moves: {
      'thanes-axe': { name: 'Thane\'s Axe', target: 'enemy', text: 'The Thane\'s axe, rune-cut and heavier than it looks, and he hits with the iron back of it: 2d8 crushing.', effects: [atk('2d8', 'crush')] },
      'debts-paid': { name: 'Debts Paid', target: 'enemy', text: 'Ironhold pays its debts, even the ones it would sooner not have: 1d10 crushing, and you Stagger.', effects: [atk('1d10', 'crush', { riders: [status('staggered')] })] },
      'sentinels-stance': { name: 'Sentinel\'s Stance', target: 'self', text: 'He sets his feet the way Ironhold\'s Sentinels set theirs on the stair, and nothing gets past: Guarding, and Warded.', effects: [status('guarding'), status('warded', { value: { dice: '2d8', diceEvery: 3 } })] },
      'iron-grip': { name: 'Iron Grip', target: 'enemy', requires: 'hollow-gauntlet', fallback: 'thanes-axe', text: 'The Hollow Gauntlet closes on you and does not let go: 3d8 crushing, and you are Rooted.', effects: [atk('3d8', 'crush', { riders: [status('rooted')] })] },
      'seal-the-deeps': { name: 'Seal the Deeps', target: 'all-enemies', text: 'He brings his fist down on the floor, and the hall shuts round you like the Deeps\' doors: 2d6 crushing to every hero, STR save for half, and you Stagger.', effects: [{ type: 'damage', dice: '2d6', kind: 'crush', aspect: 'stone', save: 'STR', riders: [status('staggered')] }] },
      ironfall: { name: 'Ironfall', target: 'enemy', charge: true, requires: 'hollow-gauntlet', fallback: 'thanes-axe', text: 'He lifts his axe in the Hollow Gauntlet as high as the hall, charging, and brings the back of it down with everything he ever kept: 4d10 crushing.', effects: [atk('4d10', 'crush')] },
    },
    phases: [
      { at: 1, text: 'The Thane. Brundar stands before the anvil\'s chair in the Hollow Gauntlet. It has closed on his hand, and it will not open.', table: [[1, 7, 'thanes-axe'], [8, 11, 'debts-paid'], [12, 14, 'sentinels-stance'], [15, 20, 'iron-grip']] },
      { at: 0.5, text: 'Iron. The gauntlet shows him the Deeps he sealed to hide Harrow\'s theft, and he seals the hall the same way.', table: [[1, 5, 'thanes-axe'], [6, 10, 'seal-the-deeps'], [11, 14, 'debts-paid'], [15, 20, 'ironfall']] },
    ],
    text: 'Thane Brundar of Ironhold, before the chair carved with the anvil under the mountain, in the Hollow Gauntlet the Unsmith sent him. It has hollowed him: he is grey as the Deeps, and the gauntlet holds on to everything.',
  },
  'hollow-gretch': {
    id: 'hollow-gretch', name: 'Hollow Gretch', art: 'hollow-gretch', tier: 'hollow', kind: 'human', unique: true, noFlee: true,
    hp: 140, guard: 19, atk: 8, dmg: 6, speed: 10, armor: 'none', aspect: 'blight',
    saves: { STR: 1, DEX: 2, CON: 3, WIS: 5, CHA: 5 },
    relics: ['hollow-chain'], bonusWhile: 'hollow-chain',
    grudgeTitles: { win: ['the Owed', 'the Twice-Owed', 'the Thrice-Owed', 'the Ever-Owed'] },
    koText: '"I\'m not a fool," Gretch says, very quietly, in her own voice. "I\'m not that kind of fool."',
    moves: {
      gavel: { name: 'Gavel', target: 'enemy', text: 'Bogmire\'s moot-hall gavel, which has settled more arguments than any law: 2d8 crushing.', effects: [atk('2d8', 'crush')] },
      'mayors-word': { name: 'The Mayor\'s Word', target: 'all-enemies', text: 'She tells you, very calmly, what the fen does to people who cross the Mayor of Bogmire. Every hero: WIS save or Frightened.', effects: [status('frightened', { save: 'WIS' })] },
      'counted-twice': { name: 'Counted Twice', target: 'enemy', text: 'Everyone in Bogmire counts twice, and she counts you: you are Marked.', effects: [status('marked')] },
      'too-tight': { name: 'Too Tight', target: 'enemy', requires: 'hollow-chain', fallback: 'gavel', text: 'The Hollow Chain tightens, on your throat instead of hers: 2d8 blight, and you are Rotting.', effects: [atk('2d8', 'blight', { aspect: 'blight', riders: [status('rotting')] })] },
      'call-in-a-favour': { name: 'Call In a Favour', target: 'self', fallback: 'gavel', text: 'Everyone in Bogmire owes the Mayor a favour, and some of them are in the fen: a mire leech comes up out of the soot to pay its own.', effects: [{ type: 'summon', family: 'mire-leech', count: 1, max: 2, levelDelta: -4 }] },
      fear: { name: 'Fear', target: 'all-enemies', text: 'She stops pretending she is not afraid, and it is catching. Every hero: WIS save or Frightened, and WIS save or Hexed.', effects: [status('frightened', { save: 'WIS' }), status('hexed', { save: 'WIS' })] },
      'every-favour-owed': { name: 'Every Favour Owed', target: 'all-enemies', requires: 'hollow-chain', fallback: 'gavel', text: 'Every favour the chain ever bought her, called in at once: 3d8 blight to every hero, WIS save for half, and you are Frightened.', effects: [{ type: 'damage', dice: '3d8', kind: 'blight', aspect: 'blight', save: 'WIS', riders: [status('frightened')] }] },
    },
    phases: [
      { at: 1, text: 'The Mayor. Gretch stands before the lantern\'s chair in the Hollow Chain. It is too tight, and she will not take it off.', table: [[1, 7, 'gavel'], [8, 11, 'mayors-word'], [12, 14, 'counted-twice'], [15, 20, 'too-tight']] },
      { at: 0.5, text: 'Fear and Favours. The chain shows her what she runs Bogmire on, and she runs out of both at once.', table: [[1, 5, 'gavel'], [6, 9, 'call-in-a-favour'], [10, 14, 'fear'], [15, 20, 'every-favour-owed']] },
    ],
    text: 'Mayor Gretch of Bogmire, before the chair carved with the lantern among the reeds, wearing the Hollow Chain the Unsmith sent her. It has hollowed her: she is grey as the fen at dawn, and the chain is always a little too tight.',
  },
  // ---- the Unsmith (spec A16, §3.5): Nos. 72-74 are his pieces
  unsmith: {
    id: 'unsmith', name: 'The Unsmith', art: 'unsmith', tier: 'unsmith', kind: 'human', unique: true, noFlee: true,
    hp: 190, guard: 19, atk: 9, dmg: 6, speed: 9, armor: 'hide', aspect: 'ember',
    saves: { STR: 5, DEX: 2, CON: 5, WIS: 4, CHA: 4 },
    relics: ['unmaking-hammer', 'ironvein-apron', 'worldforge-heart'],
    stolenFallback: 'nothing-left',
    koText: 'Harrow Ironvein goes down on one knee before his forge. He looks at you, and for a moment he looks exactly like his sister. "Thorough," he says. "She always was, too."',
    moves: {
      'hammer-blow': { name: 'Hammer Blow', target: 'enemy', text: 'A smith\'s hammer in the hand that taught Ironhold\'s smiths: 2d10 crushing, and 1d8 more.', effects: [atk('2d10', 'crush', { diceEvery: 5, bonusDice: [{ dice: '1d8' }] })] },
      'ring-the-anvil': { name: 'Ring the Anvil', target: 'all-enemies', text: 'He strikes the great anvil once, and the note goes through every one of you: 1d8 crushing to every hero, CON save for half, and you Stagger.', effects: [{ type: 'damage', dice: '1d8', diceEvery: 5, kind: 'crush', save: 'CON', riders: [status('staggered')] }] },
      unmake: { name: 'Unmake', target: 'enemy', requires: 'unmaking-hammer', fallback: 'hammer-blow', text: 'The Unmaking Hammer comes down on the relic in your hand, not on you. It is still in your hand afterwards, but it is only iron: 2d8 crushing, and you are Unmade for two turns (your relic\'s Legend Surge is struck out of it).', effects: [atk('2d8', 'crush', { diceEvery: 5, riders: [status('unmade')] })] },
      'forge-apron': { name: 'Forge-Apron', target: 'self', requires: 'ironvein-apron', fallback: 'hammer-blow', text: 'He turns the next blow on the Ironvein Apron, which has never once burned through: Guarding, and Warded.', effects: [status('guarding'), status('warded', { value: { dice: '3d8', diceEvery: 3 } })] },
      'nothing-left': { name: 'Nothing Left', target: 'self', text: 'He reaches for the relics you never claimed, and finds you left him none. For a moment he only stands there with his hands open: he is Exposed.', effects: [status('exposed')] },
      worldfire: { name: 'Worldfire', target: 'all-enemies', text: 'The Worldforge opens behind him, and its fire comes out over all of you: 3d8 ember to every hero, DEX save for half, and you Burn.', effects: [{ type: 'damage', dice: '3d8', diceEvery: 5, kind: 'ember', aspect: 'ember', save: 'DEX', riders: [status('burning')] }] },
      'hearts-pull': { name: 'The Heart\'s Pull', target: 'enemy', charge: true, requires: 'worldforge-heart', fallback: 'hammer-blow', text: 'The heart in his chest pulls, charging, and one of you goes toward it: 1d8 crushing, and you are held in the furnace\'s mouth for two turns, burning.', effects: [atk('1d8', 'crush', { diceEvery: 5, aspect: 'ember', riders: [status('swallowed', { label: 'In the furnace' })] })] },
      'heart-flare': { name: 'Heart Flare', target: 'all-enemies', requires: 'worldforge-heart', fallback: 'hammer-blow', text: 'The Worldforge Heart beats once and the forge beats with it: 2d6 ember to every hero, and he heals 2d8.', effects: [{ type: 'damage', dice: '2d6', diceEvery: 5, kind: 'ember', aspect: 'ember' }, { type: 'heal', dice: '2d8', diceEvery: 3, self: true }] },
    },
    phases: [
      { at: 1, text: 'The Smith. Harrow Ironvein puts down the plans, picks up the Unmaking Hammer, and looks at you the way his sister looks at a blade that has come back to be mended.', table: [[1, 8, 'hammer-blow'], [9, 12, 'ring-the-anvil'], [13, 16, 'forge-apron'], [17, 20, 'unmake']] },
      { at: 0.66, steals: true, text: 'The Thief. He reaches for the relics you never came for, to hang them on his apron like a pedlar\'s wares.', table: [[1, 6, 'hammer-blow'], [7, 14, 'stolen'], [15, 17, 'unmake'], [18, 20, 'ring-the-anvil']] },
      { at: 0.33, text: 'The Worldforge. The furnace behind him opens like a door, and the heart in his chest burns through his shirt.', table: [[1, 6, 'hammer-blow'], [7, 11, 'worldfire'], [12, 15, 'hearts-pull'], [16, 20, 'heart-flare']] },
    ],
    text: 'Harrow Ironvein, Hilda\'s twin and Ironhold\'s master smith, who stole the Worldforge\'s plans from under Ironhold and built it: the Unsmith. He has kept the fire in for you. Two dice, two hands, three pieces, and whatever relics you left behind.',
  },
};

export const FOES = deepFreeze({ ...VERDANT, ...TALLY_SUN, ...SUNSCORCH, ...TALLY_IRON, ...IRONSPIRE, ...TALLY_GLOOM, ...GLOOMFEN, ...HEARTH_BELOW });

export const FOE_IDS = Object.freeze(Object.keys(FOES));
