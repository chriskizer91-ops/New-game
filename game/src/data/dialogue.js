// Dialogue nodes (M3 spec §3.1, §4.4). `{warden}` in a line is replaced with the player's name;
// every line is rendered with textContent. Lines are at most 140 characters.
//
// DIALOGUE[id] = {
//   lines: [[speaker, text]],   speaker: an NPCS id | 'warden' | 'pip' | 'bryn' | 'alondra' | 'narrator'
//   do?: [effect],              applied once when the node is shown
//   choices?: [{ text, if?, next?, do?: [effect],
//                check?: { domain | ability, dc, adv?: cond, pass: dialogueId, fail: dialogueId },
//                contest?: { checks: [{ domain, dc }], need, pass, fail } }],
// }
// Effects: {set: flag, value?} ({value: 'day'} stores today's day, for {since}) {unset: flag}
//   {give: relicId} {item: {rarity, slot?, kind?, ilvl?}} {gold: n} {bag: {id: n}} {unlock: entityId}
//   {heal: true} {fight: encId} {claim: questId | 'bounties'} {open: 'shop:<id>'|'forge'|'atlas'|'journal'|'ladder'}
//   {letter: brandId} {end: 'act1'}
//
// Also here (read by rules/story.js and rules/world.js):
//   ARRIVALS[mapId] = dialogueId   played once on the first entry to a map (the party's homecoming lines)
//   AFTER[encId] = [{ on: 'victory'|'yield', if?, d }]   played when you come back from that fight
//   RESTS = [{ at: hearthfireId, if?, d }]                played after resting at that Hearthfire
//   LOOKOUTS[entityId] = { flag, maps }                   Longwatch from a lookout marks these maps
// A `use` entity (bellframe, lookout) whose id is a DIALOGUE id opens that dialogue.
// Owner: WP3S.

import { deepFreeze } from '../core/freeze.js';

const LEAVE = { text: 'Leave.' };
const FORGE = [{ text: 'Temper something.', do: [{ open: 'forge' }] }, LEAVE];
const DAEL = [
  { text: 'Turn in bounties.', if: { bounty: 'any', state: 'ready' }, do: [{ claim: 'bounties' }], next: 'dael-paid' },
  { text: 'Read the bounty board.', do: [{ open: 'journal' }] },
  LEAVE,
];

export const DIALOGUE = deepFreeze({
  // ---- story beats --------------------------------------------------------------------------
  'keep-intro': {
    lines: [['fenwick', 'The vault! Warden, the Seal!'], ['narrator', 'Something small and ink-stained glints at the vault door, and bolts.']],
    do: [{ set: 'intro-done' }],
  },
  council: {
    lines: [['isolde', 'Two coals, {warden}. The Council sits tonight, and for once they will listen.'], ['fenwick', 'It is humming again. Louder.']],
    do: [{ set: 'council-done' }, { claim: 'hearth-gutters' }],
    choices: [
      { text: 'Show Hilda the Ichor Mask.', if: { owns: 'ichor-mask' }, next: 'council-mask' },
      { text: 'Let the Council talk.', do: [{ end: 'act1' }] },
    ],
  },
  'council-mask': {
    lines: [['hilda', 'A hammer in a broken ring. That\'s Harrow\'s mark. My brother\'s.'], ['isolde', 'Then the Unsmith has a name. Good. Names can be found.']],
    do: [{ set: 'harrow-named' }, { end: 'act1' }],
  },
  'boots-clue': {
    lines: [['pip', 'Bootprints. Thornwatch issue, going north. Nobody walks like that on purpose.']],
    do: [{ set: 'saw-boots' }],
  },
  // the party's homecoming lines (ARRIVALS)
  'pip-thornhollow': { lines: [['pip', 'Every path has a secret one next to it. The secret one\'s usually worse.']] },
  'bryn-eldergrove': { lines: [['bryn', 'Home. Mind the roots, {warden}. They remember who stepped on them.']] },
  'alondra-fawnrest': { lines: [['alondra', 'I can hear the stone dreaming. It\'s dreaming of deer.']] },
  'dream-four-sleepers': {
    lines: [['alondra', 'Four Sleepers under four hills. One of them is turning over.'], ['narrator', 'You wake before dawn, Forewarned.']],
    do: [{ set: 'forewarned' }],
  },

  // ---- the Keep -------------------------------------------------------------------------------
  fenwick: {
    lines: [['fenwick', 'It burned blue, Warden. Nine hundred years and it never once burned blue.']],
    choices: [{ text: 'Ask about the hearth.', next: 'fenwick-hearth' }, LEAVE],
  },
  'fenwick-hearth': { lines: [['fenwick', 'It eats what it\'s given. Go on, the road\'s waiting.']] },
  'fenwick-brand': { lines: [['fenwick', 'One coal. Hear it? It\'s humming. I\'d forgotten it could hum.']] },
  'notice-fenwick-kettle': { lines: [['fenwick', 'A watch-kettle! My grandfather wore one. It hums before a storm.']] },
  isolde: { lines: [['isolde', 'The Seal first. A Keep that can\'t close its own vault can\'t ask anyone for anything.']] },
  'isolde-commission': {
    lines: [['isolde', 'If Tamsin\'s taken something that isn\'t hers, bring her back. If she\'s taken something that is, bring it back anyway.']],
    do: [{ set: 'heard-commission' }],
  },
  'notice-isolde-seal': { lines: [['isolde', 'The Seal suits you. Now you\'re the vault, {warden}. Don\'t get robbed.']] },
  'notice-isolde-oath': { lines: [['isolde', 'Where did you... That was my sword. Keep it. I\'ve no winters left in me.']] },
  marta: {
    lines: [['marta', 'Half the Hearth Road is sleeping in my courtyard. Buy something so I can feed them.']],
    choices: [{ text: 'Buy.', do: [{ open: 'shop:marta' }] }, LEAVE],
  },
  refugee: { lines: [['refugee', 'We walked from the Hearth Road with what we could carry. The road took the rest.']] },
  'guard-e': { lines: [['gate-guard-e', 'Rockslide on the pass. Stormwatch hasn\'t sent a writ since spring.']] },
  'guard-se': { lines: [['gate-guard-se', 'The Sandspire caravans stopped a month ago, and the dune-glass walls are still too hot to cross.']] },
  'guard-sw': { lines: [['gate-guard-sw', 'Blackwater\'s up over the causeway. Nobody\'s ferrying.']] },
  hilda: {
    lines: [['hilda', 'Hold still. Not you. The blade.'], ['hilda', 'Heat, hammer, patience. Mostly gold.']],
    choices: FORGE,
  },
  'hilda-mask': {
    lines: [['hilda', 'A hammer in a broken ring. I\'ve seen that mark once, on my brother\'s anvil. Put it away before I do something stupid.']],
    choices: FORGE,
  },
  'notice-hilda-crown': { lines: [['hilda', 'Briarmaw\'s crown on a Warden\'s head. Don\'t let it grow into you.']], choices: FORGE },
  'notice-hilda-gauntlets': { lines: [['hilda', 'Tamsin\'s gauntlets. She\'ll want those back, and for once she\'ll ask nicely.']], choices: FORGE },

  // ---- Thornhollow ----------------------------------------------------------------------------
  dael: {
    lines: [['dael', 'Thirty names on the Thornwatch roll when I took it. Nine now.'], ['dael', 'My board can\'t put a name to it. Bring me a name. Or a head.']],
    do: [{ set: 'met-dael' }],
    choices: DAEL,
  },
  'dael-brand': {
    lines: [['dael', 'Briarmaw. So it had a name after all. Here, the Keep\'s bounty, every coin of it.']],
    do: [{ gold: 300 }, { set: 'paid-briarmaw' }],
    choices: DAEL,
  },
  'dael-report': {
    lines: [['dael', 'Corra Thistle, walking and talking. You found them.'], ['dael', 'That\'s the patrol\'s pay. They won\'t miss it; they\'re too busy being alive.']],
    do: [{ set: 'reported-patrol' }, { claim: 'missing-patrol' }],
    choices: DAEL,
  },
  'dael-home': { lines: [['dael', 'Three went out. Three came home. I\'ll take it.']], choices: DAEL },
  'dael-paid': { lines: [['dael', 'Names off the board, coin in your hand. The roll gets shorter the right way for once.']] },
  'notice-dael-hood': { lines: [['dael', 'That hood had a name in it once. Earn it.']], choices: DAEL },
  'notice-dael-splitter': { lines: [['dael', 'Snag\'s hatchet. Ranger Wick carried it before the boar did. Swing it like she did.']], choices: DAEL },
  nell: {
    lines: [['nell', 'No credit. The last lad I gave credit to is on the board.']],
    choices: [{ text: 'Buy.', do: [{ open: 'shop:nell' }] }, LEAVE],
  },
  'notice-nell-gloves': {
    lines: [['nell', 'Mags\'s gloves. Keep your hands where I can see them.']],
    choices: [{ text: 'Buy.', do: [{ open: 'shop:nell' }] }, LEAVE],
  },
  corra: { lines: [['corra', 'I remembered my own name halfway through a sentence. Pip had to finish it.']] },
  'notice-corra-shield': { lines: [['corra', 'My shield. It\'s heavier than I remember. Hold the line with it.']] },
  'th-lookout': {
    lines: [['narrator', 'From the lookout you can see the whole valley: the Thornway, the Hearth Road, the smoke of Thornhollow.']],
    choices: [{ text: 'Mark it all with the Kettle.', if: { all: [{ power: 'longwatch' }, { not: { flag: 'longwatch:thornhollow' } }] }, do: [{ set: 'longwatch:thornhollow' }], next: 'longwatch-marked' }, LEAVE],
  },
  'longwatch-marked': { lines: [['narrator', 'The Kettle hums. Every chest, lock and holder in sight goes down on your Atlas.']] },

  // ---- Mosswatch ------------------------------------------------------------------------------
  garret: {
    lines: [['garret', 'Lights? There\'s moss, and there\'s me, and the moss is winning.'], ['alondra', 'He\'s lying, and he\'s frightened of the lie.']],
    do: [{ set: 'met-garret' }],
    choices: [
      {
        text: 'Challenge him for the Kettle.', if: { since: { flag: 'garret-tried', days: 1 } }, do: [{ set: 'garret-tried', value: 'day' }],
        contest: { checks: [{ domain: 'knowledge', dc: 12 }, { domain: 'survival', dc: 13 }, { domain: 'influence', dc: 12 }], need: 2, pass: 'garret-won', fail: 'garret-lost' },
      },
      { text: 'Ask about the lights.', next: 'garret-lights' },
      LEAVE,
    ],
  },
  'garret-lights': { lines: [['garret', 'Ghosts don\'t leave bootprints in the porridge.']] },
  'garret-won': { lines: [['garret', 'Fine. Fine! Take the Kettle. It hums when weather\'s coming.']], do: [{ give: 'watchkeepers-kettle' }] },
  'garret-thanks': {
    lines: [['garret', 'The fire\'s lit. I saw it from the kitchen and I cried into the porridge. Don\'t tell anyone.'], ['garret', 'Take the Kettle. The tower wants someone to keep watch.']],
    do: [{ set: 'garret-told' }, { give: 'watchkeepers-kettle' }, { claim: 'lights-at-midnight' }],
  },
  'garret-thanks-gold': {
    lines: [['garret', 'The fire\'s lit. I saw it from the kitchen and I cried into the porridge. Don\'t tell anyone.'], ['garret', 'You\'ve the Kettle already, so have my savings. Don\'t argue.']],
    do: [{ set: 'garret-told' }, { gold: 150 }, { claim: 'lights-at-midnight' }],
  },
  'notice-garret-lantern': { lines: [['garret', 'My tower\'s lantern! Keep it lit, then. Somebody should.']] },
  'mw-lookout': {
    lines: [['narrator', 'The tower top. Mossfall spreads out below like a green hand, fingers in the fen.']],
    choices: [{ text: 'Mark it all with the Kettle.', if: { all: [{ power: 'longwatch' }, { not: { flag: 'longwatch:mossfall' } }] }, do: [{ set: 'longwatch:mossfall' }], next: 'longwatch-marked' }, LEAVE],
  },
  'garret-lost': { lines: [['garret', 'Come back tomorrow. The moss will still be winning.']] },

  // ---- Eldergrove -----------------------------------------------------------------------------
  miravel: {
    lines: [['miravel', 'Keep folk come for timber and advice. They never take the advice.']],
  },
  'miravel-brand': {
    lines: [['miravel', 'Briarmaw\'s crown held the old roads shut. It\'s dead; the roads are yours.'], ['miravel', 'The eldest trees bleed black from the root. Something down there is drinking them.']],
    do: [{ set: 'met-miravel-rot' }],
  },
  'notice-miravel-circlet': { lines: [['miravel', 'The Rot-Stag\'s circlet. It still hears the rot. So will you. Don\'t answer it.']] },
  'notice-miravel-rootsong': { lines: [['miravel', 'Oda\'s staff. The trees are listening to you now. Speak kindly.']] },
  nan: { lines: [['nan', 'Bitterroot for the Rot. Won\'t cure it. Makes it sulk.']] },
  'tamsin-door': {
    lines: [['tamsin', 'Isolde sent me in first. You can watch. Or try.']],
    choices: [{ text: 'Try.', do: [{ fight: 'tamsin-duel' }] }, { text: 'Not yet.' }],
  },
  'tamsin-after-win': { lines: [['tamsin', 'Fine. Not luck. Don\'t let it go to your head.']], do: [{ gold: 120 }] },
  'tamsin-yield': {
    lines: [['tamsin', 'That was a practice swing. The next one isn\'t. Door\'s open, by the way.']],
    do: [{ set: 'tamsin-yielded' }],
  },

  // ---- Fawnrest -------------------------------------------------------------------------------
  ivo: {
    lines: [['ivo', 'The deer left the way deer do: all at once, and then not at all.'], ['ivo', 'The bell? Something with wings took it off the frame.']],
    do: [{ set: 'met-ivo' }],
  },
  'ivo-thanks': {
    lines: [['ivo', 'The deer came home. So did I, I think.'], ['ivo', 'The pilgrims left the offering-stone by the old path heavy. Take what\'s under it.']],
    do: [{ claim: 'silent-bell' }],
  },
  'notice-ivo-bell': { lines: [['ivo', 'The bell, on a mace? Well. It rings true either way.']] },
  'fr-bellframe': {
    lines: [['narrator', 'An empty bell-frame. The rope still swings a little, as if it remembers.']],
    choices: [{ text: 'Hang the Dawnbell and ring it.', if: { all: [{ owns: 'dawnbell' }, { not: { flag: 'bell-rung' } }] }, do: [{ set: 'bell-rung' }], next: 'bell-rung' }, LEAVE],
  },
  'bell-rung': {
    lines: [['narrator', 'The Dawnbell rings once, clear as cold water.'], ['narrator', 'Out of the pale trees, one by one, the white deer come home.']],
  },
  pilgrim: {
    lines: [['pilgrim', 'Vesper\'s sap cured my cough.'], ['alondra', 'And gave you a new one.']],
    do: [{ set: 'met-pilgrim' }],
  },
  'pilgrim-thanks': {
    lines: [['pilgrim', 'Swamp-water! I paid a silver a thimble for swamp-water. Here, it\'s all I had left.']],
    do: [{ claim: 'miracle-sap' }],
  },
  vesper: {
    lines: [['vesper', 'Miracle sap, a silver the thimble. Cures rot, rheum and regret.']],
    choices: [
      { text: 'Call it what it is.', check: { domain: 'influence', dc: 14, adv: { active: 'alondra' }, pass: 'vesper-exposed', fail: 'vesper-angry' } },
      { text: 'Knock the stall over.', do: [{ fight: 'vesper-stall' }] },
      LEAVE,
    ],
  },
  'vesper-exposed': {
    lines: [['alondra', 'Swamp-water and bitterroot. I can smell it from here.'], ['vesper', '...The stall is closed.']],
    do: [{ set: 'vesper-exposed' }],
  },
  'vesper-angry': { lines: [['vesper', 'Slander! Lads, see our friend out.']], do: [{ fight: 'vesper-stall' }] },

  // ---- after fights (AFTER) ----------------------------------------------------------------------
  'corra-freed': {
    lines: [['corra', '...Thistle. Corra Thistle. Sergeant. Why is it so dark in here?'], ['pip', 'Long story. Walk with us.']],
  },
  'rotwarden-after': {
    lines: [['rotwarden', '...Warden. I held the root nine hundred years. Hold it now.']],
  },
});

export const ARRIVALS = deepFreeze({
  thornhollow: 'pip-thornhollow',
  eldergrove: 'bryn-eldergrove',
  fawnrest: 'alondra-fawnrest',
});

export const AFTER = deepFreeze({
  'tamsin-duel': [{ on: 'victory', d: 'tamsin-after-win' }, { on: 'yield', d: 'tamsin-yield' }],
  'hollowed-patrol': [{ on: 'victory', d: 'corra-freed' }],
  'rotwarden-heart': [{ on: 'victory', if: { owns: 'ichor-mask' }, d: 'rotwarden-after' }],
});

export const RESTS = deepFreeze([
  { at: 'fawnrest-stone', if: { all: [{ flag: 'bell-rung' }, { not: { flag: 'forewarned' } }] }, d: 'dream-four-sleepers' },
]);

export const LOOKOUTS = deepFreeze({
  'th-lookout': { flag: 'longwatch:thornhollow', maps: ['thornhollow', 'hearth-road', 'thornway'] },
  'mw-lookout': { flag: 'longwatch:mossfall', maps: ['mossfall', 'mosswatch-1', 'mosswatch-2'] },
});

export const DIALOGUE_IDS = Object.freeze(Object.keys(DIALOGUE));
