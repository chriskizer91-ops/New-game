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
    moves: {
      hack: { name: 'Hack', target: 'enemy', text: 'A workmanlike chop.', effects: [atk('1d6', 'slash', { weapon: true })] },
      'shield-bash': { name: 'Shield Bash', target: 'enemy', text: 'Rim to the jaw: Staggers.', effects: [atk('1d4', 'crush', { riders: [status('staggered')] })] },
      'dirty-trick': { name: 'Dirty Trick', target: 'enemy', text: 'A knee where it counts. Frightened.', effects: [atk('1d4', 'crush', { riders: [status('frightened')] })] },
      'heavy-swing': { name: 'Heavy Swing', target: 'enemy', charge: true, text: 'Winds up a two-handed swing.', effects: [atk('1d6', 'slash', { weapon: true, bonusDice: [{ dice: '1d8' }] })] },
      'second-wind': { name: 'Second Wind', target: 'self', when: { hpBelow: 0.5 }, fallback: 'hack', text: 'Spits, steadies, keeps coming.', effects: [{ type: 'heal', dice: '1d8', diceEvery: 3 }] },
    },
    table: [[1, 3, 'hack'], [4, 4, 'shield-bash'], [5, 5, 'dirty-trick'], [6, 7, 'heavy-swing'], [8, 8, 'second-wind']],
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
    moves: {
      cut: { name: 'Cut', target: 'enemy', text: 'A clerk\'s neat, nasty cut.', effects: [atk('1d4', 'pierce', { weapon: true })] },
      'tally-mark': { name: 'Tally Mark', target: 'enemy', text: 'Chalks your name in the ledger. You are Marked.', effects: [status('marked')] },
      'smoke-pot': { name: 'Smoke Pot', target: 'all-enemies', text: 'Stinking smoke. WIS save or Frightened.', effects: [status('frightened', { save: 'WIS' })] },
      'cheats-cut': { name: 'Cheat\'s Cut', target: 'enemy', requires: 'tallyknife', fallback: 'cut', text: 'The Tallyknife collects: 2 stacks of Poisoned.', effects: [atk('1d4', 'pierce', { weapon: true, aspect: 'blight', bonusDice: [{ dice: '1d4', aspect: 'blight' }], riders: [status('poisoned', { stacks: 2 })] })] },
      'seal-flash': { name: 'Seal Flash', target: 'all-enemies', requires: 'wardens-seal', fallback: 'cut', text: 'The stolen Seal blazes. 1d6 radiant, DEX save for half.', effects: [{ type: 'damage', dice: '1d6', kind: 'radiant', aspect: 'radiant', save: 'DEX' }] },
    },
    table: [[1, 3, 'cut'], [4, 4, 'tally-mark'], [5, 5, 'smoke-pot'], [6, 8, 'cheats-cut']],
    variants: {
      thief: {
        name: 'Tallyman Thief', hp: 20, guard: 13, atk: 3,
        table: [[1, 4, 'cut'], [5, 6, 'tally-mark'], [7, 8, 'seal-flash']],
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
});

export const FOE_IDS = Object.freeze(Object.keys(FOES));
