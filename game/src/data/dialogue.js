// Dialogue nodes (M3 spec §3.1, §4.4; M4 spec §3.1, §3.6; M5 spec §3.1, §3.5, §3.6; M6 spec §2.4, §3.1,
// §3.5, §3.6). `{warden}` in a line is replaced with the player's name; every line is rendered with
// textContent. Lines are at most 140 characters.
//
// DIALOGUE[id] = {
//   lines: [[speaker, text]],   speaker: an NPCS id | 'warden' | 'pip' | 'bryn' | 'alondra' | 'narrator'
//   do?: [effect],              applied once when the node is shown
//   choices?: [{ text, if?, next?, do?: [effect],
//                check?: { domain | ability, dc, name?, adv?: cond, pass: dialogueId, fail: dialogueId },
//                contest?: { checks: [{ domain?, ability?, dc, name? }], need, pass, fail } }],
// }
// Effects: {set: flag, value?} ({value: 'day'} stores today's day, for {since}) {unset: flag}
//   {give: relicId} {item: {rarity, slot?, kind?, ilvl?}} {gold: n} {bag: {id: n}} {unlock: entityId}
//   {gems: {gemId: n}} {materials: {scrap?, silver?, embers?}} (M4)
//   {heal: true} {fight: encId} {claim: questId | 'bounties'}
//   {open: 'shop:<id>'|'forge'|'atlas'|'journal'|'ladder'|'bounties'} {letter: brandId}
//   {end: 'act1'|'act2'|'ironspire'|'gloomfen'}   the to-be-continued card ('ironspire': after the third
//                                  council, M5; 'gloomfen': after the fourth, the end of Act II, M6)
//   {pay: {gold?, bag?, materials?}} (M6: a choice that pays shows its price, disabled while unaffordable)
//
// Also here (read by rules/story.js and rules/world.js):
//   ARRIVALS[mapId] = dialogueId   played once on the first entry to a map (the party's homecoming lines);
//                                  marked seen before it plays, so an arrival never changes the game
//   AFTER[encId] = [{ on: 'victory'|'yield'|'defeat', if?, d }]   played when you come back from that fight
//                                  ('defeat': M6, Hodge's lines when you wake after losing to him)
//   RESTS = [{ at: hearthfireId, if?, d }]                played after resting at that Hearthfire
//   LOOKOUTS[entityId] = { flag, maps }                   Longwatch from a lookout marks these maps
// A `use` entity (bellframe, lookout) whose id is a DIALOGUE id opens that dialogue (M5: Peak's Veil's
// bell rope `pv-bell-rope` and lookout `pv-lookout`).
// Owner: WP3S (M3), P3 story (M4, M5, M6).

import { deepFreeze } from '../core/freeze.js';

const LEAVE = { text: 'Leave.' };
const FORGE = [{ text: 'Temper something.', do: [{ open: 'forge' }] }, LEAVE];
const DAEL = [
  { text: 'Turn in bounties.', if: { bounty: 'any', state: 'ready' }, do: [{ claim: 'bounties' }], next: 'dael-paid' },
  { text: 'Read the bounty board.', do: [{ open: 'journal' }] },
  LEAVE,
];
// M4: Zara keeps the Sandspire board (spec §3.6), Idris and Ode keep shop, Cinder keeps the history
const ZARA = [
  { text: 'Turn in bounties.', if: { bounty: 'any', state: 'ready' }, do: [{ claim: 'bounties' }], next: 'zara-paid' },
  { text: 'Read the bounty board.', do: [{ open: 'bounties' }] },
  LEAVE,
];
const ZARA_ASK = [{ text: 'Ask what is in the crate.', next: 'zara-crate-ask' }, ...ZARA];
const QASIM = [{ text: 'Ask about the Council.', next: 'qasim-council-ask' }, LEAVE];
const IDRIS = [{ text: 'Buy gems.', do: [{ open: 'shop:idris' }] }, LEAVE];
const ODE = [{ text: 'Buy.', do: [{ open: 'shop:pithead' }] }, LEAVE];
const CINDER = [{ text: 'Ask how Scorchgate burned.', next: 'cinder-history' }, LEAVE];
// after a Sunscorch Brand: once both are held, the party turns for home (the second council)
const HOME = [{ text: 'Home to the Keep, then.', if: { flag: 'sunscorch-complete' }, next: 'sunscorch-home' }];
// M5: the Ironspire's standing choices. Kesh's advice changes with the Brands: Mother Anvil, then the Abbot.
const KESH = [
  { text: 'Ask about Frostmere.', next: 'kesh-lake' },
  { text: 'Ask for advice.', if: { not: { brand: 'brand-of-iron' } }, next: 'kesh-anvil' },
  { text: 'Ask for advice.', if: { all: [{ brand: 'brand-of-iron' }, { not: { brand: 'brand-of-frost' } }] }, next: 'kesh-abbot' },
  LEAVE,
];
const BRUNDAR = [{ text: 'Ask about Harrow.', next: 'brundar-harrow' }, LEAVE];
const DURRA = [{ text: 'Buy.', do: [{ open: 'shop:durra' }] }, LEAVE];
const QUILL = [{ text: 'Buy.', do: [{ open: 'shop:quill' }] }, LEAVE];
// Captain Ysolde keeps the Stormwatch board (spec §3.6)
const YSOLDE = [
  { text: 'Turn in bounties.', if: { bounty: 'any', state: 'ready' }, do: [{ claim: 'bounties' }], next: 'ysolde-paid' },
  { text: 'Read the bounty board.', do: [{ open: 'bounties' }] },
  LEAVE,
];
// the bell of Peak's Veil rings once the Drowned Abbess is at rest (from its rope, or with Mother Wynn)
const RING = { all: [{ beaten: 'fm-shrine' }, { not: { flag: 'bell-rung-veil' } }] };
// M6: Hodge's toll-bar (spec A11, §4.4), the choices every line of his carries. The price of the day, one of three
// (flags.day % 3, as his talk table's openers), shown only while the bar is down; paying lifts it for good. His toll
// game, best of three, once a day, for a coin you do not own yet: winning lifts the bar and gives you the coin (the
// DCs give a party at the Ironspire's end, the sim's, about 58%: Deception is raw CHA, and he lies for a living). And
// the fight, "a terrible idea", while he is unbeaten: refused at the bar, or picked with him once it is up.
const BAR_DOWN = [{ not: { flag: 'toll-paid' } }, { not: { beaten: 'hodge' } }];
const PAY = (at, price) => ({ text: 'Pay today\'s toll.', if: { all: [{ day: { every: 3, at } }, ...BAR_DOWN] }, do: [{ pay: price }, { set: 'toll-paid' }], next: 'hodge-paid-up' });
const TOLL = [
  PAY(1, { gold: 120 }),
  PAY(2, { materials: { silver: 1 } }),
  PAY(0, { bag: { 'hearth-tonic': 2 } }),
  {
    text: 'Play his toll game: best of three.', if: { all: [{ since: { flag: 'hodge-tried', days: 1 } }, { not: { owns: 'unfair-toll' } }] }, do: [{ set: 'hodge-tried', value: 'day' }],
    contest: {
      checks: [{ domain: 'influence', dc: 17, name: 'Persuasion' }, { ability: 'CHA', dc: 16, name: 'Deception' }, { domain: 'influence', ability: 'STR', dc: 18, name: 'Intimidation' }],
      need: 2, pass: 'hodge-won', fail: 'hodge-lost',
    },
  },
  { text: 'Refuse, and make him move.', if: { all: BAR_DOWN }, do: [{ fight: 'hodge' }] },
  { text: 'Shift him off his stool.', if: { all: [{ flag: 'toll-paid' }, { not: { beaten: 'hodge' } }] }, do: [{ fight: 'hodge' }] },
  LEAVE,
];
// Elder Moss's riddles (every one of them true), Sedge's herbs, Nettie's hut, and the Bogmire board (Mayor Gretch)
const MOSS = [
  { text: 'Ask about the lights in the fen.', next: 'moss-lights' },
  { text: 'Ask about Rotbridge.', next: 'moss-bridge' },
  { text: 'Ask about the bells under the water.', next: 'moss-bells' },
  LEAVE,
];
const SEDGE = [{ text: 'Buy.', do: [{ open: 'shop:sedge' }] }, LEAVE];
const NETTIE = [{ text: 'Buy.', do: [{ open: 'shop:nettie' }] }, LEAVE];
const GRETCH = [
  { text: 'Turn in bounties.', if: { bounty: 'any', state: 'ready' }, do: [{ claim: 'bounties' }], next: 'gretch-paid' },
  { text: 'Read the bounty board.', do: [{ open: 'bounties' }] },
  LEAVE,
];
const GRETCH_ASK = [{ text: 'Ask about soot-sealed letters.', next: 'gretch-box' }, ...GRETCH];
// Tamsin has fallen: her Rotbridge duel is over, won or yielded, whether or not the scene after it played through
const FALLEN = { any: [{ flag: 'tamsin-fallen' }, { beaten: 'tamsin-rotbridge' }, { flag: 'tamsin-yielded-4' }] };

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
  // M6: the south-west gate, after the third council and once the Blackwater has fallen
  'guard-sw-fen': { lines: [['gate-guard-sw', 'Still no ferry, Warden. For the Gloomfen you go round by Mossfall\'s fen stair. The Willowmurk folk sent word.']] },
  'guard-sw-open': { lines: [['gate-guard-sw', 'The causeway\'s up out of the water! First dry stone since spring. Smells like a fish\'s attic, but it\'s a road.']] },
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
    do: [{ set: 'met-dael' }, { gold: 300 }, { set: 'paid-briarmaw' }],
    choices: DAEL,
  },
  'dael-report': {
    lines: [['dael', 'Corra Thistle, walking and talking. You found them.'], ['dael', 'That\'s the patrol\'s pay. They won\'t miss it; they\'re too busy being alive.']],
    do: [{ set: 'met-dael' }, { set: 'reported-patrol' }, { claim: 'missing-patrol' }],
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
        text: 'Challenge him for the Kettle.', if: { all: [{ since: { flag: 'garret-tried', days: 1 } }, { not: { owns: 'watchkeepers-kettle' } }] }, do: [{ set: 'garret-tried', value: 'day' }],
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
    do: [{ set: 'met-garret' }, { set: 'garret-told' }, { give: 'watchkeepers-kettle' }, { claim: 'lights-at-midnight' }],
  },
  'garret-thanks-gold': {
    lines: [['garret', 'The fire\'s lit. I saw it from the kitchen and I cried into the porridge. Don\'t tell anyone.'], ['garret', 'You\'ve the Kettle already, so have my savings. Don\'t argue.']],
    do: [{ set: 'met-garret' }, { set: 'garret-told' }, { gold: 150 }, { claim: 'lights-at-midnight' }],
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

  // ==== M4: the Sunscorch Wastes (spec §3.1, §3.6) ===================================================

  // ---- the Keep, after Act I --------------------------------------------------------------------------
  'guard-se-open': { lines: [['gate-guard-se', 'Gate\'s open, Warden. Sandspire is three days by caravan. Take water. Then take more water.']] },
  'isolde-south': {
    lines: [
      ['isolde', 'The south-east gate is open. Sandspire hasn\'t answered a letter in thirty years. Go and knock.'],
      ['isolde', 'Two Brands wait in that desert. Bring them home, {warden}. And Tamsin, if she\'ll come.'],
    ],
    do: [{ set: 'heard-south' }],
  },
  // M5: after the second council the east postern is open, and Isolde points the way through it
  'isolde-next': {
    lines: [
      ['isolde', 'The east postern is open. The old East Road runs from it through the woods to the Rockslide Pass.'],
      ['isolde', 'The monks of Peak\'s Veil dug the pass out, and they know the road to Ironhold.'],
      ['isolde', 'Harrow\'s smoke is on those peaks, {warden}. Bring me the Ironspire. And bring me Harrow, if he\'ll come.'],
    ],
    do: [{ set: 'heard-next' }],
  },
  'notice-isolde-crown': { lines: [['isolde', 'Scorchgate\'s crown. Its Warden held one door three hundred years. Hold ours less stubbornly.']] },
  'fenwick-three': { lines: [['fenwick', 'Three coals. It burns clearer now. Hungrier, too. Don\'t mind me, Warden; old men talk to fires.']] },
  'fenwick-four': { lines: [['fenwick', 'Four coals, and it\'s humming a tune. I know that tune, Warden. I had hoped I\'d forgotten it.']] },
  'notice-fenwick-heart': { lines: [['fenwick', 'What\'s that, beating under your collar? No. Don\'t show me. Keep it away from the hearth. Far away.']] },
  'notice-hilda-cinderfang': { lines: [['hilda', 'Cinderfang. Folded in a fire that ate a city, and the edge is still sulking about it. Hand it here.']], choices: FORGE },
  'notice-hilda-dunebreaker': { lines: [['hilda', 'Gnash\'s maul. Whoever forged that had big hands and no patience. My kind of smith.']], choices: FORGE },
  'hilda-ironspire': {
    lines: [['hilda', 'Harrow\'s up in the Ironspire. I can feel his forge in my teeth, and the east postern\'s open at last.'], ['hilda', 'Bring me something of his. His hammer. Or his ear. I\'m not fussy.']],
    choices: FORGE,
  },

  // ---- Sandspire ------------------------------------------------------------------------------------
  zara: {
    lines: [
      ['zara', 'Zara al-Khem. Forty camels, sixty drivers, one road. Last month the road ate a caravan, and my crate.'],
      ['zara', 'The crate hums. Tallymen took it east over the Glass Flats. You could follow it by ear.'],
      ['pip', 'Tallymen, stealing something that hums. It\'s never a kettle.'],
      ['zara', 'Bring it home and what\'s inside is yours. My board pays for anything else that stopped my caravans.'],
    ],
    do: [{ set: 'met-zara' }],
    choices: ZARA_ASK,
  },
  'zara-again': { lines: [['zara', 'Still humming out there, somewhere east. The Flats carry a sound a long way. So do the Tallymen.']], choices: ZARA_ASK },
  'zara-crate-ask': {
    lines: [
      ['zara', 'An orrery. My grandfather\'s. Little brass worlds on little brass arms, and they turn without a key.'],
      ['zara', 'It was always bound for your Keep. He said the day it hummed, your hearthkeeper would want to hear it.'],
      ['zara', 'It started humming the night your hearth burned blue.'],
    ],
    choices: ZARA,
  },
  // the thank-you: also a first meeting, for a Warden who found the caravan before finding Zara
  'zara-crate': {
    lines: [
      ['zara', 'That hum. I\'d know it in my sleep; I\'ve heard little else for a month. You found my crate.'],
      ['narrator', 'Zara scrapes the Tally-chalk off the lid. Inside, brass worlds turn on brass arms, humming.'],
      ['zara', 'It was always bound for the Keep. As far as the road cares, you are the Keep. Take it.'],
    ],
    do: [{ set: 'met-zara' }, { set: 'crate-returned' }, { claim: 'humming-crate' }],
    choices: ZARA,
  },
  'zara-paid': { lines: [['zara', 'Paid in full. A caravan-mistress who stiffs her hunters soon has no hunters, then no caravans.']] },
  'zara-home': { lines: [['zara', 'The caravans run again. Slowly, and with more guards than camels, but they run.']], choices: ZARA },
  'notice-zara-orrery': { lines: [['zara', 'It hums the hour it was made in. I never learned which hour that is. Perhaps you will.']], choices: ZARA },
  'notice-zara-saltglass': { lines: [['zara', 'Vell Saltglass\'s bow. He shot two of my drivers with it. Shoot straighter, for better reasons.']], choices: ZARA },
  qasim: {
    lines: [
      ['qasim', 'A Keep Warden! Sit. Drink, slowly: water is the only coin here, and someone is stealing mine.'],
      ['qasim', 'Glass scorpions have nested in my aqueduct on the Dust Trail. My cisterns fall a finger a day.'],
      ['qasim', 'Clear it, and Sandspire will owe you. I dislike owing, so I pay quickly.'],
    ],
    do: [{ set: 'met-qasim' }],
    choices: QASIM,
  },
  'qasim-again': { lines: [['qasim', 'West, on the Dust Trail. Follow the dry channel. The scorpions will find you first.']], choices: QASIM },
  'qasim-council-ask': {
    lines: [
      ['qasim', 'Sandspire has a chair at your Keep\'s long table. It has stood empty for thirty years.'],
      ['qasim', 'The Keep stopped answering our letters. Bring my water home, and perhaps I\'ll sit in it again. Perhaps.'],
    ],
  },
  'qasim-water': {
    lines: [
      ['qasim', 'The cisterns are rising, and they say a Keep Warden did it. I am Qasim. I pay quickly.'],
      ['qasim', 'Take my signet. Every gate in the dry country opens for it.'],
    ],
    do: [{ set: 'met-qasim' }, { set: 'cistern-told' }, { claim: 'cistern-water' }],
  },
  'qasim-home': { lines: [['qasim', 'Listen: water in every channel. Sandspire sleeps with its shutters open again.']] },
  'qasim-summons': { lines: [['qasim', 'A rider from Isolde: the Council sits, and Sandspire takes its chair. Go home. I ride behind you.']] },
  'qasim-council': { lines: [['qasim', 'Your Keep\'s chairs are hard and its soup is thin. Still: when the Council calls, Sandspire answers.']] },
  'notice-qasim-signet': { lines: [['qasim', 'Mind what you seal with it. In Sandspire a signet is a promise, and promises are paid in water.']] },
  'notice-qasim-cinderfang': { lines: [['qasim', 'Cinderfang! Sandspire paid a cistern a week for that blade. I see it has finally been delivered.']] },
  idris: {
    lines: [
      ['idris', 'Sunstone from the shaft, agate from your green country, pearls from the well. Look, but do not lick.'],
      ['idris', 'Garnets? Only Scorchgate\'s ash grows those. Nobody who digs there sells to me. Nobody comes back.'],
    ],
    choices: IDRIS,
  },
  'notice-idris-heart': { lines: [['idris', 'Something warm under your collar. No, don\'t show me. A gemwright who sees too much gets tempted.']], choices: IDRIS },
  'notice-idris-glass': { lines: [['idris', 'The Queen\'s lens! I\'d trade my stall for it. I\'d trade my brother\'s stall.']], choices: IDRIS },
  'spire-guard': { lines: [['spire-guard', 'Keep your water covered and your hands where I can see them. Mostly the water.']] },
  'spire-guard-caravans': { lines: [['spire-guard', 'Caravans on the road again means thieves on the road again means work. I\'m almost grateful.']] },
  'notice-guard-cinderfang': {
    lines: [['spire-guard', 'Is that really Cinderfang? My gran sang about it. She said it burns the hand that isn\'t worthy.'], ['spire-guard', '...Your hand looks fine. Carry on, Warden.']],
  },
  'water-seller': { lines: [['water-seller', 'Sweet water, a copper the cup. Cistern water, two. It is the same water. People like to choose.']] },
  'water-seller-flowing': { lines: [['water-seller', 'Cisterns full, prices down, me ruined. Thank you. No, truly: my mother drinks free now.']] },
  'notice-water-signet': { lines: [['water-seller', 'The Cistern Lord\'s signet! Water\'s on the house, Warden. It\'s a very small house. One cup.']] },
  'ss-lookout': {
    lines: [['narrator', 'The mesa edge. East, the Glass Flats burn white. West, the Dust Trail. North, the road home.']],
    choices: [{ text: 'Mark it all with the Kettle.', if: { all: [{ power: 'longwatch' }, { not: { flag: 'longwatch:sandspire' } }] }, do: [{ set: 'longwatch:sandspire' }], next: 'longwatch-marked' }, LEAVE],
  },

  // ---- Dusthaven ------------------------------------------------------------------------------------
  luma: {
    lines: [
      ['luma', 'Luma. I test the ore. Don\'t stand so close; it\'s warm today.'],
      ['luma', 'Brask\'s crew went down the shaft with a lantern that finds sunstone. It points up. At me.'],
      ['pip', 'Why would a sunstone lantern point at you?'],
      ['luma', 'Take it off him, and I might tell you. Might.'],
    ],
    do: [{ set: 'met-luma' }],
  },
  'luma-again': { lines: [['luma', 'Brask\'s crew works the tunnels past the Shaft Lamp. Bring me that lantern and we\'ll talk. Probably.']] },
  // the secret: also a first meeting, for a Warden who took the lantern before finding Luma
  'luma-secret': {
    lines: [
      ['luma', 'Brask\'s lantern, in a Warden\'s hand. So Brask is done hunting. Hold it up; watch where it points.'],
      ['narrator', 'The lantern flares. Under Luma\'s collar something answers it, beat for beat, like a second heart.'],
      ['luma', 'Grandmother dug it out of the deepest vein: a sunstone that beats. Stones don\'t beat. This one does.'],
      ['luma', 'The Tallymen want it. The glass below wants it. I want one night\'s sleep without it in my ear.'],
    ],
    do: [{ set: 'met-luma' }],
    choices: [
      { text: 'I\'ll keep your secret.', do: [{ set: 'met-luma' }, { set: 'luma-trusted' }, { claim: 'sunstone-heart' }], next: 'luma-heart-given' },
      { text: 'Not now.' },
    ],
  },
  'luma-heart-given': {
    lines: [
      ['luma', 'Then carry it, far from anyone who digs. It beats slower near you. I think it\'s been waiting.'],
      ['luma', 'And if it ever stops, come and find me. Or I\'ll come and find you. I\'ve never seen a Keep.'],
    ],
  },
  'luma-after': { lines: [['luma', 'The shaft is quieter since the lantern left. So am I. Keep that heart warm, Warden.']] },
  'luma-someday': { lines: [['luma', 'The shaft\'s quiet now. Soon Dusthaven can spare an assayer. Ask me again when the roads open.']] },
  'notice-luma-heart': { lines: [['luma', 'You wear it where I did. It beats slower on you; it isn\'t afraid. Good. One of us shouldn\'t be.']] },
  'notice-luma-lantern': { lines: [['luma', 'Brask\'s lantern, lighting a Warden\'s road. First honest work it\'s done in a month.']] },
  ode: { lines: [['ode', 'Lamp oil, tonics, rope. Everything a miner needs but courage, and I\'m clean out of courage.']], choices: ODE },
  'ode-brask': { lines: [['ode', 'Brask\'s lot won\'t be settling their tab, then. I\'ll put it on the Keep\'s. That\'s a joke. Mostly.']], choices: ODE },
  'notice-ode-lantern': { lines: [['ode', 'Brask\'s lantern! He never paid for the oil. I won\'t charge you. I\'ll just look at you like this.']], choices: ODE },
  miner: { lines: [['miner', 'Brask\'s lot went down the shaft with Tally-chalk and never came up. We stop at the Shaft Lamp now.']] },
  'miner-crew': { lines: [['miner', 'Brask\'s lot is gone, and we can hear the shaft again. It hums. A shaft shouldn\'t hum.']] },
  'miner-glass': { lines: [['miner', 'The glass below stopped singing. First night\'s sleep since spring. I dreamed of nothing. Lovely.']] },

  // ---- Miragewell -----------------------------------------------------------------------------------
  sabah: {
    lines: [
      ['sabah', 'Welcome to Miragewell. Drink, if you can find water. Every night the wisps drink the well dry.'],
      ['sabah', 'Their Queen wears a lens of well-water. By morning the pilgrims find only sand, and cry into it.'],
      ['sabah', 'I am Sabah. I keep the well. Lately I keep an empty hole, and I keep it beautifully.'],
    ],
    do: [{ set: 'met-sabah' }],
  },
  'sabah-again': { lines: [['sabah', 'The Queen holds court at the well after dark. Go gently. Half of what you see there is true.']] },
  // the thank-you: also a first meeting, for a Warden who quieted the Queen before meeting Sabah
  'sabah-well': {
    lines: [
      ['sabah', 'Full at dawn! The pilgrims wept. I wept. A camel wept, I think. It is hard to tell with camels.'],
      ['sabah', 'I am Sabah, and I owe you. Pearls from the well, and a purse from the pilgrims. Take both.'],
    ],
    do: [{ set: 'met-sabah' }, { set: 'well-told' }, { claim: 'well-of-mirages' }],
  },
  'sabah-after': { lines: [['sabah', 'The well shows the pilgrims what they lost again. Mostly keys and husbands. Both turn up.']] },
  'notice-sabah-glass': { lines: [['sabah', 'The Queen\'s lens. Don\'t look into the well through it, Warden. Some things are kinder as mirages.']] },
  'pilgrim-mw': { lines: [['pilgrim-mw', 'They say the well shows you what you lost. It showed me my shoes. I was wearing them.']] },
  'pilgrim-mw-well': { lines: [['pilgrim-mw', 'The well showed me my mother\'s face this morning. Then a camel. I\'m counting it as a blessing.']] },

  // ---- Scorchgate -----------------------------------------------------------------------------------
  cinder: {
    lines: [
      ['cinder', 'Mind the ash; some of it was people. I\'m Brother Cinder. I keep the shrine, and Scorchgate keeps me.'],
      ['cinder', 'Scorchgate burned for a sword. Now it burns for nothing, and I keep it company.'],
    ],
    do: [{ set: 'met-cinder' }],
    choices: CINDER,
  },
  'cinder-again': { lines: [['cinder', 'Still here? The ash gets into everything: boots, bread, prayers. Sit a while. I\'ve nowhere to be.']], choices: CINDER },
  'cinder-history': {
    lines: [
      ['cinder', 'Three hundred years ago something came up out of the sand, burning. The songs call it a dragon.'],
      ['cinder', 'The smiths swore to forge a blade to kill it. Coal wasn\'t hot enough, so they fed the forge the city.'],
      ['cinder', 'Beams, doors, cradles, the temple roof. Scorchgate burned for a sword, and the sword was Cinderfang.'],
    ],
    choices: [{ text: 'Ask what became of the sword.', next: 'cinder-sword' }, { text: 'Ask who holds the vault.', next: 'cinder-vault' }, LEAVE],
  },
  'cinder-sword': {
    lines: [
      ['cinder', 'The captain carried it into the dunes after the dragon. Neither came back.'],
      ['cinder', 'The blade turned up in a scorpion\'s tail. The dragon never turned up at all.'],
      ['cinder', 'Draw your own conclusions. I\'ve had three hundred years to draw mine.'],
    ],
    choices: [{ text: 'Ask who holds the vault.', next: 'cinder-vault' }, LEAVE],
  },
  'cinder-vault': {
    lines: [
      ['cinder', 'The Warden held the vault while the city burned. He holds it still. Nobody\'s told him it\'s over.'],
      ['cinder', 'The Ash-Captain keeps the key, on a ring with no key on it. The seal knows it anyway.'],
    ],
    choices: [{ text: 'Ask what became of the sword.', next: 'cinder-sword' }, LEAVE],
  },
  // after the Brand of Ash: the Sleeper under the sand (also a first meeting, for a Warden who went straight down)
  'cinder-ash': {
    lines: [
      ['cinder', 'The Warden sat down at last. I felt it through the floor, like a breath held three hundred years.'],
      ['cinder', 'Here\'s what I never told the pilgrims: it wasn\'t a dragon. Dragons fly off. This went down.'],
      ['alondra', 'Four Sleepers under four hills. I dreamed it at Fawnrest. One of them is under here, isn\'t it?'],
      ['cinder', 'Under the sand, dreaming of fire and turning over. Take this ember. Your smith will want it.'],
    ],
    do: [{ set: 'met-cinder' }, { set: 'cinder-sleepers' }, { materials: { embers: 1 } }],
  },
  'cinder-after': { lines: [['cinder', 'Quiet under the ash now. The kind of quiet a house has when someone in it is only pretending to sleep.']], choices: CINDER },
  'notice-cinder-fang': { lines: [['cinder', 'You carry the sword my city burned for. Hold it gently. It remembers every beam.']], choices: CINDER },
  'notice-cinder-crown': { lines: [['cinder', 'Every ember in that crown was a soldier of Scorchgate. Speak kindly under it. They can hear you.']], choices: CINDER },
  'notice-cinder-aegis': { lines: [['cinder', 'The Warden\'s shield. He carried it out of the fire and never once put it down. You\'re allowed to.']], choices: CINDER },
  // Tamsin at Scorchgate (the duel's `talk`; the second of seven)
  'tamsin-scorchgate': {
    lines: [
      ['tamsin', 'You again. Good. I\'ve been practising on things that can\'t hit back.'],
      ['tamsin', 'Somebody leaves me letters at night. Soot on the seal. They say I\'m the better Warden. Let\'s find out.'],
      ['pip', 'Her relic\'s glowing. That\'s new. I don\'t like new.'],
    ],
    choices: [{ text: 'Try again.', do: [{ fight: 'tamsin-scorchgate' }] }, { text: 'Not yet.' }],
  },

  // ---- after fights (AFTER) --------------------------------------------------------------------------
  'caravan-crate': {
    lines: [
      ['narrator', 'On the last wagon, under the salt-sacks: a crate with a caravan seal, humming one low note.'],
      ['pip', 'A crate that hums. Somebody in Sandspire is missing this, and I bet they\'d pay to stop missing it.'],
    ],
    do: [{ set: 'crate-found' }],
  },
  'aqueduct-flows': {
    lines: [
      ['narrator', 'The last shell cracks underfoot. Down the channel, slowly, then all at once, water runs for Sandspire.'],
      ['bryn', 'Listen to it. I\'ve never heard a sound a whole city was waiting for.'],
    ],
  },
  'brask-lantern': {
    lines: [
      ['pip', 'Brask\'s lantern. Still lit, and it keeps swinging to point up the shaft. Toward Dusthaven.'],
      ['alondra', 'Toward someone, I think. Lanterns don\'t point at places.'],
    ],
  },
  'queen-quiet': { lines: [['narrator', 'The wisps scatter like dropped coins. Around the well the sand is already darkening, wet from below.']] },
  'kharzul-after-fang': {
    lines: [
      ['narrator', 'The Glass Heart rings like a struck cup, then goes still. Far above, every lamp in Dusthaven flares.'],
      ['pip', 'Three hundred years in a scorpion\'s tail, and still warm. Don\'t drop it. I\'m not climbing down.'],
      ['bryn', 'The songs say Cinderfang failed. It doesn\'t look like a sword that failed. It looks like it waited.'],
    ],
    do: [{ set: 'kharzul-fell' }],
    choices: HOME,
  },
  'kharzul-after': {
    lines: [
      ['narrator', 'The Glass Heart rings like a struck cup, then goes still. Far above, every lamp in Dusthaven flares.'],
      ['pip', 'Cinderfang broke when it fell. Three hundred years in a tail, and we break it in an afternoon.'],
      ['bryn', 'Hilda can reforge it. She\'ll shout first. Then she\'ll reforge it.'],
    ],
    do: [{ set: 'kharzul-fell' }],
    choices: HOME,
  },
  'kharzul-again': { lines: [['pip', 'It grew back. Glass does that, apparently. Can we go before it grows back again?']] },
  'warden-after': {
    lines: [
      ['narrator', 'The Ashen Warden kneels, and the ash of him settles. A voice comes out of it, dry as an old page.'],
      ['ashen-warden', 'Is the fire out? ...No. Don\'t tell me. I held the door. That was all they ever asked of me.'],
      ['ashen-warden', 'Relieved, then. At last. Keep the watch, Warden. It\'s longer than it looks.'],
      ['alondra', 'He\'s asleep. Properly asleep, this time.'],
    ],
    do: [{ set: 'warden-fell' }],
    choices: HOME,
  },
  'warden-again': { lines: [['pip', 'The ash put itself back together. It just won\'t take a hint, will it?']] },
  'sunscorch-home': {
    lines: [
      ['alondra', 'Two coals of the Sunscorch. I can feel the hearth from here, like a door opening in another room.'],
      ['pip', 'Isolde\'s going to want a speech. Bryn, you do the speech.'],
      ['bryn', 'I\'ll do the speech.'],
    ],
  },
  'tamsin-sg-win': {
    lines: [
      ['tamsin', 'Scorchgate burned for a sword. Don\'t let yours make you careless.'],
      ['narrator', 'She tosses you a purse. At the gate she stops, reads a letter from her coat again, and keeps it.'],
    ],
    do: [{ gold: 150 }],
  },
  'tamsin-sg-yield': {
    lines: [
      ['tamsin', 'Stay down a moment. The ash is softer than it looks; I\'ve been sitting in it all week.'],
      ['tamsin', 'So the letters were right. ...Don\'t look at me like that. Come back when you want another go.'],
    ],
    do: [{ set: 'tamsin-yielded-2' }],
  },

  // ---- arrivals (ARRIVALS): first impressions, since nobody in the party is from the Sunscorch -----------
  'arrive-sandspire': {
    lines: [['pip', 'A whole city on a rock, and every door has two locks. I think I\'m in love.'], ['bryn', 'The mesa is older than the city, and the city knows it. Mind your manners at the well.']],
  },
  'arrive-dusthaven': { lines: [['alondra', 'The ground is warm here. Not sun-warm. Warm from underneath, like something sleeping.']] },
  'arrive-miragewell': { lines: [['bryn', 'Half of what you see here is true. The trick is knowing which half. The palms are real. Probably.']] },
  'arrive-scorchgate': {
    lines: [['alondra', 'Ash to the ankles, and it\'s still warm. Something here never stopped burning.'], ['pip', 'Nobody touch anything. I mean it. Especially you, Bryn.']],
  },

  // ---- rests (RESTS) ---------------------------------------------------------------------------------
  'orrery-night': {
    lines: [
      ['narrator', 'The Orrery hums you awake. Four small lights turn under its horizon, where no stars should be.'],
      ['bryn', 'Four lights, under the ground instead of over it. Alondra, how many Sleepers did you dream of?'],
      ['alondra', 'Four. Go back to sleep, Bryn.'],
    ],
    do: [{ set: 'orrery-night' }],
  },
  'luma-fireside': {
    lines: [
      ['narrator', 'Luma sits at the Pithead Fire a while, not talking. For Luma, that is a long conversation.'],
      ['luma', 'When Dusthaven can spare me, I\'d like to see where that heart goes. Not yet. But I\'ve started packing.'],
    ],
    do: [{ set: 'luma-fireside' }],
  },
  'last-watch': {
    lines: [
      ['narrator', 'For the first time in three hundred years, nobody keeps watch on Scorchgate\'s wall. You sleep anyway.'],
      ['narrator', 'Deep under the ash something turns over in its sleep, and the whole ruin creaks like a ship at anchor.'],
    ],
    do: [{ set: 'watch-ended' }],
  },

  // ---- the second council (keep-hall trigger `council-2`, guarded by the flag it sets) -----------------
  'council-2': {
    lines: [
      ['narrator', 'Four coals burn in the Eternal Hearth. At the long table, a chair empty for thirty years is filled.'],
      ['isolde', 'Four coals, {warden}. Sit. The Council has questions, and for once so do I.'],
      ['qasim', 'Two coals of my country burn in your hearth. I could hardly stay home.'],
      ['miravel', 'The Cistern Lord at a Keep table. I\'d have wagered on the trees walking here first.'],
      ['qasim', 'A gift came to Sandspire before your Warden did: a letter sealed in soot, and a box. I\'ve opened neither.'],
      ['isolde', 'Don\'t open them. Two chairs are still empty, Ironspire\'s and Gloomfen\'s. Someone is counting chairs.'],
    ],
    do: [{ set: 'council-2-done' }, { claim: 'sunscorch-waking' }],
    choices: [
      { text: 'Ask about the empty chairs.', next: 'council-2-chairs' },
      { text: 'Let the Council talk.', do: [{ end: 'act2' }] },
    ],
  },
  'council-2-chairs': {
    lines: [
      ['hilda', 'Ironspire. Thane Brundar has sealed his lower halls, and there\'s smoke on the peaks I\'d know anywhere.'],
      ['hilda', 'It\'s Harrow\'s. Harrow Ironvein, my twin. He\'s alive, and forging something he doesn\'t want me to see.'],
      ['isolde', 'And Gloomfen. The Blackwater\'s over the causeway, and Bogmire\'s children walk into the fen at night.'],
      ['alondra', 'Following a lantern. I\'ve dreamed it three nights running.'],
      ['fenwick', 'The hearth is humming a tune, Isolde. I know that tune. I\'d hoped never to hear it again.'],
      ['isolde', 'Then you\'ll tell me tonight, old man. {warden}: the east postern opens at dawn. Ironspire first.'],
    ],
    do: [{ set: 'harrow-named' }, { end: 'act2' }],
  },

  // ==== M5: the Ironspire Peaks (spec §3.1, §3.5, §3.6) ==============================================

  // ---- the Keep, after the second council ------------------------------------------------------------
  'guard-e-open': { lines: [['gate-guard-e', 'Postern\'s open, Warden. The monks dug the slide out; the road climbs to Peak\'s Veil. Wrap up warm. Then warmer.']] },
  'guard-e-writ': { lines: [['gate-guard-e', 'A writ from Stormwatch, first since spring! It says "Thank you. Y." Short, for a writ. I\'m having it framed.']] },
  // M6 (spec §2.4): after the third council Isolde sends you down Mossfall's fen stair, the causeway being drowned
  'isolde-gloomfen': {
    lines: [
      ['isolde', 'Six coals. And Willowmurk\'s elders have sent a reed-token: green rushes, knotted the old way. It\'s for you.'],
      ['isolde', 'They\'ve summoned an outsider for the first time in decades. Something in that fen is very wrong.'],
      ['isolde', 'The fen stair below Mossfall is open to you now. Keep to their safe paths, {warden}, and find Elder Moss.'],
      ['isolde', 'The Blackwater still has the causeway, so you go the long way round. Eat something first. That\'s an order.'],
    ],
    do: [{ set: 'heard-gloomfen' }],
  },
  'notice-isolde-rune': { lines: [['isolde', 'Brundar\'s own rune-key? He wouldn\'t give my father the time of day. What did you do to him?']] },
  'fenwick-five': { lines: [['fenwick', 'Five coals, and a red in the flame like iron in a forge. I haven\'t seen that since... well. Since before.']] },
  'fenwick-six': {
    lines: [
      ['fenwick', 'Don\'t look at me like that, Warden. I\'m old. Old men stare into fires. It\'s allowed.'],
      ['fenwick', 'Six coals, and the hearth sings all night, and something under it keeps time. I\'ve stopped sleeping in the hall.'],
    ],
  },
  'notice-fenwick-cowl': { lines: [['fenwick', 'Take that hood off by my hearth, Warden. It\'s listening. So is the hearth, and I\'d rather they didn\'t talk.']] },
  // Hilda and her brother: the hammer he left (harrows-hammer), then his letter after the third council
  'hilda-hammer': {
    lines: [
      ['narrator', 'Hilda sees the hammer from across the yard. She sets her own down on the anvil, which she never does.'],
      ['hilda', 'That\'s my brother\'s hammer. He never put it down in his life. Where is he?'],
      ['bryn', 'It was in a forge-golem\'s arm, under Ironhold. His forge was cold. He\'d been gone a long while.'],
      ['hilda', 'He left it with a golem and walked off. Harrow did. Then what\'s he forging with now?'],
      ['hilda', '...Keep it. Hit things with it; he\'d hate that. Here, for the finding. And embers: that hammer eats heat.'],
    ],
    do: [{ set: 'hammer-shown' }, { claim: 'harrows-hammer' }],
    choices: FORGE,
  },
  'hilda-harrow': { lines: [['hilda', 'Twins know things. He\'s alive, and he\'s somewhere wet: my knuckles ache like they do in the fen. Don\'t ask.']], choices: FORGE },
  'hilda-letter': {
    lines: [
      ['hilda', 'A letter came for me. Soot on the seal, his broken ring in the wax. My brother\'s hand, and four words.'],
      ['hilda', '"Don\'t wait up, Hild." Twenty years of nothing, and then that. I\'ve read it forty times.'],
      ['hilda', 'Give me something to hit, Warden, before I read it again.'],
    ],
    do: [{ set: 'heard-hild' }],
    choices: FORGE,
  },
  'hilda-waits': { lines: [['hilda', 'I haven\'t waited up. I\'ve just been up. There\'s a difference. Hand me that blade.']], choices: FORGE },
  'notice-hilda-hammer': { lines: [['hilda', 'You hold it lower than he did. He held it like a show-off, up by his ear. Yours is better. Don\'t tell him.']], choices: FORGE },
  'notice-hilda-heart': { lines: [['hilda', 'Mother Anvil\'s heart. He built her the winter our father died. He talked to her more than he talked to me.']], choices: FORGE },
  'notice-hilda-runestaff': { lines: [['hilda', 'Harrow\'s runes. He cut those the winter we were fifteen, to annoy me. They still annoy me.']], choices: FORGE },
  'notice-hilda-bracers': { lines: [['hilda', 'Our mark on the clasp: Harrow made these, small at the wrist. Why is my brother making Tamsin gifts?']], choices: FORGE },
  // Fawnrest: the Highfold path from Peak's Veil
  'ivo-highfold': { lines: [['ivo', 'The Highfold path is open again! The monks came down it every spring to bless the deer. The deer put up with it.']] },

  // ---- Peak's Veil ----------------------------------------------------------------------------------
  // Mother Wynn: the bell (bell-of-veil), and the Highfold gate unbarred (highfold-open) at the first meeting.
  // The bell has not rung since Aurel went down (the map's bell-rope sign says so too): the old Abbess would
  // not toll for a man who might come up, and now she walks the ice herself.
  wynn: {
    lines: [
      ['wynn', 'A Keep Warden, up our pass! Sit. I\'m Wynn. I\'ve kept this house since spring, and it keeps the lake.'],
      ['wynn', 'Our bell hasn\'t rung since Brother Aurel went down to the lake. My Abbess wouldn\'t toll: he might come up.'],
      ['wynn', 'This spring the ice broke under the island shrine. She drowned with her choir, and they didn\'t stay drowned.'],
      ['wynn', 'They walk the ice at night, singing. You can\'t toll for someone still walking. Give her rest, {warden}. Gently.'],
      ['wynn', 'Then we\'ll ring for them all. And I\'ll have the west gate unbarred for you: the Highfold path goes to Fawnrest.'],
    ],
    do: [{ set: 'met-wynn' }, { set: 'highfold-open' }],
    choices: [{ text: 'Ask why the ice broke.', next: 'wynn-ice' }, LEAVE],
  },
  'wynn-ice': {
    lines: [
      ['wynn', 'Tallymen. They came up the Frost Road in spring with ice-saws, and cut Frostmere into blocks like cheese.'],
      ['wynn', 'The island ice was the thickest, so they cut all round it. Ask Brother Kesh the rest. He was there.'],
    ],
  },
  'wynn-again': { lines: [['wynn', 'She walks the island shrine at night with her censer. Go gently, {warden}. She was kind, when she was alive.']] },
  // the Abbess at rest: also a first meeting, for a Warden who went out to the island before stopping here
  'wynn-ring': {
    lines: [
      ['wynn', 'You\'ve been out to the island; I can smell the lake on you. Is she... is my Abbess at rest?'],
      ['alondra', 'She is. At the end she said, "Ring for us."'],
      ['wynn', 'Then we ring. I\'m Wynn; I\'ve kept this house since spring. Come up the tower with me, {warden}. Take the rope.'],
    ],
    do: [{ set: 'met-wynn' }, { set: 'highfold-open' }],
    choices: [{ text: 'Ring the bell.', if: RING, do: [{ set: 'bell-rung-veil' }], next: 'wynn-bell' }, { text: 'Not yet.' }],
  },
  'wynn-bell': {
    lines: [
      ['narrator', 'Wynn unknots the rope. You pull, and pull, and after thirty years the great bell swings out and speaks.'],
      ['narrator', 'Far below, the drowned stop walking. One by one they lie down on the ice, and the ice takes them in.'],
      ['wynn', 'Thank you. She gave me this when I was a novice who couldn\'t keep quiet. It rang for them. Now it\'s yours.'],
    ],
    do: [{ set: 'met-wynn' }, { set: 'highfold-open' }, { set: 'veil-thanked' }, { claim: 'bell-of-veil' }],
  },
  // the bell rope in the tower, if the map makes it a `bellframe` entity (whose id opens this node); its line
  // is the map's own sign text, so the rope reads the same either way
  'pv-bell-rope': {
    lines: [['narrator', 'The bell rope of Peak\'s Veil, knotted up out of reach. The bell has not rung since Brother Aurel went down to the lake.']],
    choices: [{ text: 'Ring the bell.', if: RING, do: [{ set: 'bell-rung-veil' }], next: 'veil-bell-rung' }, LEAVE],
  },
  // the same rope once the bell has rung (the map swaps the entity on bell-rung-veil)
  'pv-bell-rope-rung': {
    lines: [['narrator', 'The bell rope hangs loose now, down from the rafters. High above, the great bell still hums when the wind finds it.']],
    choices: [LEAVE],
  },
  'veil-bell-rung': {
    lines: [
      ['narrator', 'You climb and unknot the rope. You pull, and pull, and after thirty years the great bell swings out and speaks.'],
      ['narrator', 'Far below, the drowned stop walking. One by one they lie down on the ice, and the ice takes them in.'],
    ],
  },
  // the thank-you, after the bell was rung from its rope: also a first meeting
  'wynn-thanks': {
    lines: [
      ['wynn', 'You rang it. I was in the herb garden. I sat down in the thyme and cried, and the thyme didn\'t mind.'],
      ['wynn', 'I\'m Wynn. My Abbess gave me this when I was a novice who couldn\'t keep quiet. It\'s yours now.'],
    ],
    do: [{ set: 'met-wynn' }, { set: 'highfold-open' }, { set: 'veil-thanked' }, { claim: 'bell-of-veil' }],
  },
  'wynn-after': { lines: [['wynn', 'The lake\'s quiet at night now. I sleep with the shutters open, and listen, and hear nothing at all. Lovely.']] },
  'wynn-frost': { lines: [['wynn', 'I sang the office for Aurel the night you came up. Thirty years late. He always said I\'d be late to my own funeral.']] },
  'notice-wynn-bell': { lines: [['wynn', 'It suits you. Ring it when you\'re frightened. It won\'t help, but you\'ll feel better. That\'s most of prayer.']] },
  'notice-wynn-censer': { lines: [['wynn', 'My Abbess\'s censer. Still wet? It will be. The lake keeps a little of everything it gives back.']] },
  'notice-wynn-crozier': { lines: [['wynn', 'Aurel\'s crozier. I watched its light under the ice every night, the winter he went down. I was nine.']] },
  // Brother Kesh: Frostmere's history (three nodes, like Brother Cinder's) and advice before each Champion
  kesh: {
    lines: [
      ['kesh', 'Brother Kesh. When wolves come to the gate, they send me. Mother Wynn says I pray with my elbows.'],
      ['kesh', 'Going up to the lake? Everyone does, in the end. Ask me about Frostmere. I\'ve fallen through it twice.'],
    ],
    do: [{ set: 'met-kesh' }],
    choices: KESH,
  },
  'kesh-again': { lines: [['kesh', 'Still here? Good. The soup\'s better when there are guests. Mother Wynn salts it for company.']], choices: KESH },
  'kesh-lake': {
    lines: [
      ['kesh', 'Frostmere was holy before this house was built. The first sisters came up here to listen to it.'],
      ['kesh', 'Lie on the ice on a still night and you\'ll hear it: a heartbeat, slower than breathing. Slower than thinking.'],
      ['kesh', 'They named it Hush: it\'s what you say to a sleeper. Then they kept their voices down for a thousand years.'],
    ],
    choices: [{ text: 'Ask about Brother Aurel.', next: 'kesh-aurel' }, { text: 'Ask about the spring.', next: 'kesh-spring' }, LEAVE],
  },
  'kesh-aurel': {
    lines: [
      ['kesh', 'Aurel was our abbot. He wouldn\'t let anyone call him Father; it made him feel old, he said. He was seventy.'],
      ['kesh', 'Thirty winters ago the heartbeat changed. Aurel took the choir down the listening-well to sing it to sleep.'],
      ['kesh', 'His crozier-light moved under the ice all that winter. Then it stopped moving. Some nights it\'s still there.'],
    ],
    choices: [{ text: 'Ask about the spring.', next: 'kesh-spring' }, LEAVE],
  },
  'kesh-spring': {
    lines: [
      ['kesh', 'This spring the Tallymen came with ice-saws. They cut all round the island, block by block, and hauled it off.'],
      ['kesh', 'The old Mother went out to sing the lake quiet. I went after her. The ice went. I came up. Nobody else did.'],
      ['kesh', 'Now there\'s a hole where the Tallymen cut down, and the drowned stand round it at night. Waiting.'],
    ],
    choices: [{ text: 'Ask about Brother Aurel.', next: 'kesh-aurel' }, LEAVE],
  },
  'kesh-anvil': {
    lines: [
      ['kesh', 'Mother Anvil? Durra says her plate turns a hammer, but cold finds the flaws in it. Take something cold.'],
      ['kesh', 'And get the hammer off her before her last strike. I saw her swing it once, through a door. It was a big door.'],
    ],
    choices: KESH,
  },
  'kesh-abbot': {
    lines: [
      ['kesh', 'If you go down to Aurel, take fire. He hated the cold his whole life: soup, fires and gossip, in that order.'],
      ['kesh', 'When the choir sings, don\'t listen to the hymn. Listen to the gaps in it. That\'s where you\'ll hear yourself.'],
    ],
    choices: KESH,
  },
  'kesh-frost': {
    lines: [
      ['kesh', 'The lake\'s asleep, Mother says. I lie on the ice and listen, and it\'s slower every night. Asleep. Probably.'],
      ['kesh', 'If it stays asleep, this house won\'t need a brother who fights. Your Keep might. Ask me when the roads open.'],
    ],
  },
  'notice-kesh-boots': { lines: [['kesh', 'Brother Oswin\'s boots. He crossed the slide in them without touching a stone. We never saw him again.']], choices: KESH },
  'notice-kesh-cowl': { lines: [['kesh', 'Take that hood off near the lake, {warden}. It was woven by someone listening, and it still is.']], choices: KESH },
  novice: { lines: [['novice', 'Mother Wynn says nobody may ring the bell. Not even me. I asked. I asked a lot.']] },
  'novice-bell': { lines: [['novice', 'The bell rang! It wasn\'t me. I want everyone to know it wasn\'t me. It was beautiful, though.']] },
  'novice-frost': { lines: [['novice', 'Brother Kesh says the lake\'s asleep. He says it the way you\'d say the bear\'s asleep.']] },
  'notice-novice-bell': { lines: [['novice', 'The little bell! Mother Wynn let me polish it once. I polished a dent into it. Don\'t look for the dent.']] },
  // the lookout on the monastery wall (a `lookout` entity whose id is this node)
  'pv-lookout': {
    lines: [['narrator', 'The monastery wall. South, the Rockslide Pass; west, the Highfold, falling to Fawnrest; north, the Iron Stair.']],
    choices: [{ text: 'Mark it all with the Kettle.', if: { all: [{ power: 'longwatch' }, { not: { flag: 'longwatch:peaks-veil' } }] }, do: [{ set: 'longwatch:peaks-veil' }], next: 'longwatch-marked' }, LEAVE],
  },

  // ---- Ironhold -------------------------------------------------------------------------------------
  // Thane Brundar: the Rune-Key once Tamsin's duel is fought (the main quest), and the Sentinel's Oath
  brundar: {
    lines: [
      ['brundar', 'A Keep Warden in my hall. The last one came for iron and left owing. I\'m Brundar, Thane here. Speak.'],
      ['bryn', 'Harrow Ironvein. And whatever you\'ve sealed up in the Deeps.'],
      ['brundar', 'The Deeps are Ironhold\'s shame, and Ironhold\'s business. There\'s a girl on my stair who agrees with neither.'],
      ['brundar', 'Shift her, or have a go at it, and we\'ll talk keys. Down there my sister\'s boy still works Harrow\'s anvils.'],
      ['brundar', 'He swore the Sentinel\'s oath at sixteen. Put him to rest, Warden, and Ironhold will owe you. I hate owing.'],
    ],
    do: [{ set: 'met-brundar' }],
    choices: BRUNDAR,
  },
  'brundar-harrow': {
    lines: [
      ['brundar', 'Harrow was my master smith, the best under the mountain. He made the Sentinels walk and Mother Anvil sing.'],
      ['brundar', 'One morning his forge was cold and he was gone, with things that weren\'t his. That\'s all you get. For now.'],
    ],
  },
  'brundar-stair': { lines: [['brundar', 'The girl\'s still on my stair. Six of my guards asked her to move. Six of my guards are in the infirmary.']], choices: BRUNDAR },
  // the Thane's leave: Tamsin's duel won or yielded (also a first meeting)
  'brundar-rune': {
    lines: [
      ['brundar', 'Brundar, Thane of Ironhold. I watched that from my gallery. Win or lose, you went at her. My guards drew straws.'],
      ['brundar', 'Here: my rune-key. The Deeps\' doors were cut to know it. What\'s down there is Harrow\'s work, and my shame.'],
      ['brundar', 'My sister\'s boy is down there, Harrow\'s journeyman now. He swore the Sentinel\'s oath once. Give him his rest.'],
    ],
    do: [{ set: 'met-brundar' }, { set: 'rune-given' }, { give: 'thanes-rune' }],
  },
  'brundar-again': { lines: [['brundar', 'Harrow\'s forge is under the Deeps, and Mother Anvil keeps it. He built her to keep everything. She does.']], choices: BRUNDAR },
  // the thank-you of the Sentinel's Oath
  'brundar-smith': {
    lines: [
      ['brundar', 'My sister\'s boy is at rest, then. Harrow took him at twenty and gave me back a furnace with his face.'],
      ['brundar', 'Thank you. Ironhold pays its debts, even the ones it would sooner not have.'],
      ['brundar', 'And when your Council sits, I\'ll tell it what else Harrow took from under this hall. It\'s time someone did.'],
    ],
    do: [{ set: 'met-brundar' }, { set: 'smith-told' }, { claim: 'sentinel-oath' }],
  },
  'brundar-iron': { lines: [['brundar', 'Mother Anvil\'s down and the mountain\'s quiet. Ysolde will open her north gate now. Stubborn woman. Good captain.']] },
  'brundar-summons': { lines: [['brundar', 'A rider from your Isolde: the Council sits, and Ironspire\'s chair is mine. Go home, Warden. I ride behind you.']] },
  'brundar-council': { lines: [['brundar', 'Your Keep\'s chairs are built for tall folk. I sat on the table. Nobody said a word. Good Council.']] },
  'notice-brundar-rune': { lines: [['brundar', 'My key on a Warden\'s hand. Wear it on the left; a Thane\'s ring goes on the left. You\'d make a poor dwarf.']], choices: BRUNDAR },
  'notice-brundar-hammer': { lines: [['brundar', 'Harrow\'s hammer. Don\'t swing it in my hall. The last time it was swung in here, a table died.']], choices: BRUNDAR },
  'notice-brundar-wall': { lines: [['brundar', 'Ironwall. My grandfather held the Black Gate behind it. The Sentinels were built to carry it after him.']], choices: BRUNDAR },
  durra: {
    lines: [
      ['durra', 'Durra Ironhand, armourer to the Thane. Frost opal, agate, pearl, and steel that does what it\'s told.'],
      ['durra', 'Harrow Ironvein and I learned at the same anvil. He was better. I was nicer. Look where it got us both.'],
    ],
    choices: DURRA,
  },
  'durra-iron': { lines: [['durra', 'Harrow\'s forge gone cold. Good. ...No. It was the best forge under the mountain. Cold doesn\'t suit it.']], choices: DURRA },
  'notice-durra-hammer': { lines: [['durra', 'Harrow\'s hammer, in someone else\'s fist. He\'d spit. Swing it past me, slowly. ...Hm. Buy something.']], choices: DURRA },
  'notice-durra-bracers': { lines: [['durra', 'Those bracers. The girl called them a gift. I know whose hand made them, and he never gave anything away.']], choices: DURRA },
  'notice-durra-staff': { lines: [['durra', 'Harrow\'s runes, cut crooked on purpose. He said straight runes were for cowards. I cut mine straight.']], choices: DURRA },
  'ih-guard': { lines: [['ih-guard', 'Mind the Thane. He hasn\'t slept since the Deeps went dark. Neither have we. He paces.']] },
  'ih-guard-rune': { lines: [['ih-guard', 'The Thane gave you his key? He\'s never given anyone anything. He gave me a cold, once.']] },
  'ih-guard-iron': { lines: [['ih-guard', 'The Deeps have gone quiet. First time in a year the floor\'s not warm. I miss it. Don\'t tell the Thane.']] },
  'notice-ih-guard-wall': { lines: [['ih-guard', 'Is that Ironwall? The Sentinel-Captain\'s shield? Nobody\'s shifted that off the stair in two hundred years.']] },
  // Tamsin at Ironhold (the duel's `talk`; the third of seven)
  'tamsin-ironhold': {
    lines: [
      ['tamsin', 'Took you long enough. I\'ve sat on this stair a week. The Thane\'s guards have stopped asking me to move.'],
      ['tamsin', 'The soot letters have a mark in the wax: a hammer in a broken ring. Harrow\'s mark.'],
      ['tamsin', 'I mean to find him first, and ask him why he writes to me. You can have whatever\'s left.'],
      ['pip', 'New bracers. Ironhold work. They\'re glowing, and she\'s smiling, and I don\'t like either.'],
    ],
    choices: [{ text: 'Try again.', do: [{ fight: 'tamsin-ironhold' }] }, { text: 'Not yet.' }],
  },

  // ---- Stormwatch -----------------------------------------------------------------------------------
  ysolde: {
    lines: [
      ['ysolde', 'Captain Ysolde. Stormwatch holds the north road for the Keep. Well, its gate. The Tallymen hold the road.'],
      ['ysolde', 'Half my watch deserted to rob the pass with Rhune. My board pays for whatever makes my roads duller.'],
      ['ysolde', 'The north gate opens for whoever takes Harrow\'s forge under Ironhold. The ice road eats anyone less.'],
    ],
    do: [{ set: 'met-ysolde' }],
    choices: YSOLDE,
  },
  'ysolde-again': { lines: [['ysolde', 'North gate stays shut till you carry the Brand of Iron. My rule. I wrote it, so I\'m allowed to hate it.']], choices: YSOLDE },
  'ysolde-gate': { lines: [['ysolde', 'You took Harrow\'s forge? Then the north gate\'s yours. The Frost Road runs to the lake. Come back down it.']], choices: YSOLDE },
  'ysolde-home': { lines: [['ysolde', 'The ice road\'s quiet. My sentries have started singing on watch. I\'m not sure it\'s an improvement.']], choices: YSOLDE },
  'ysolde-paid': { lines: [['ysolde', 'Paid in Stormwatch silver. Well. Stormwatch copper. Try not to spend it all at Quill\'s.']] },
  'notice-ysolde-boots': { lines: [['ysolde', 'Rhune\'s boots. He was the best sergeant I ever had, right up until he was the worst.']], choices: YSOLDE },
  'notice-ysolde-cloak': { lines: [['ysolde', 'The Roc\'s own feathers! It took three of our goats and a sentry. The sentry came back. The goats didn\'t.']], choices: YSOLDE },
  quill: { lines: [['quill', 'Quartermaster Quill. All you need for the ice road, at army prices: twice the cost, signed in triplicate.']], choices: QUILL },
  'quill-frost': { lines: [['quill', 'The ice road\'s open, and I\'ve sold more tonics this week than all winter. The ink alone!']], choices: QUILL },
  'notice-quill-mantle': { lines: [['quill', 'Old Horn\'s mantle. Does it smell? It smells. Stand downwind of my stores, please.']], choices: QUILL },
  // Rook, in the stockade: the Tallymen's plan (the main quest's "hear Rook out"), then the ledger
  rook: {
    lines: [
      ['rook', 'Rook. Late of the Tallymen, now a guest of Ysolde\'s stockade. The food\'s bad, but the company\'s improving.'],
      ['rook', 'I kept the Tallymen\'s books. Every relic they stole went through my ledger, counted twice, bound for one buyer.'],
      ['rook', 'He pays in iron and never haggles. We called him the Smith. His orders come signed with a U.'],
      ['rook', 'This spring the orders changed: stop stealing, start cutting. The Cutter-Chief took his saws onto Frostmere.'],
      ['rook', 'Nobody cuts ice downward for money. Bring me the Chief\'s ledger and I\'ll tell you what they\'re digging for.'],
    ],
    do: [{ set: 'met-rook' }],
    choices: [{ text: 'Ask why he left the Tallymen.', next: 'rook-why' }, LEAVE],
  },
  'rook-why': { lines: [['rook', 'I asked what the Smith wanted it for. Bookkeepers aren\'t meant to ask. I left before they closed my account.']] },
  'rook-again': { lines: [['rook', 'The Chief\'s camp is on the Frost Road, past the north gate. The ledger\'s in his coat. He never takes it off.']] },
  // the thank-you: also a first meeting, for a Warden who took the ledger before meeting Rook
  'rook-ledger': {
    lines: [
      ['rook', 'The Cutter-Chief\'s ledger! Sealskin, and his dreadful hand. I\'m Rook; I taught him his letters. Badly.'],
      ['rook', 'Ice by the ton, ice by the ton... here, underlined twice: "One heart, cut out whole. Deliver on the thaw."'],
      ['rook', 'They\'re not cutting ice. They\'re cutting down to whatever beats under that lake. The Smith wants its heart.'],
      ['rook', 'Take the Chief\'s purse, and his opal. I kept books for thieves. I never said I kept them honest.'],
    ],
    do: [{ set: 'met-rook' }, { set: 'ledger-given' }, { claim: 'rooks-ledger' }],
  },
  'rook-after': { lines: [['rook', 'I\'ve read that ledger nine times. It doesn\'t improve. Somewhere there\'s a list with four hearts on it.']] },
  'rook-frost': {
    lines: [
      ['rook', 'The Tallymen left the ice the night you came up. Not beaten: recalled. The Smith is patient, Warden. Are you?'],
      ['rook', 'If Ysolde ever lets me out, I\'ll need honest work. Or work. Ask me again when the roads open.'],
    ],
  },
  'notice-rook-pick': { lines: [['rook', 'The Chief\'s pick. There\'s a notch on the haft for every block of lake it cut. Add one for him.']] },
  'notice-rook-knife': { lines: [['rook', 'A tallyknife. I used to hand those out, one per recruit. Mind the notches. They count you back.']] },

  // ---- after fights (AFTER) --------------------------------------------------------------------------
  'tamsin-ih-win': {
    lines: [
      ['narrator', 'Tamsin\'s bracers clatter onto the stair. She looks at them a long moment, and leaves them where they lie.'],
      ['tamsin', 'His rooms are off the Thane\'s hall. Bed made. Tools gone. The hearth still lit.'],
      ['tamsin', 'He was here. He left the fire burning so we\'d think he\'d be back.'],
      ['tamsin', 'He won\'t be. The stair\'s yours, Warden. I\'ve a letter to answer.'],
    ],
  },
  'tamsin-ih-yield': {
    lines: [
      ['tamsin', 'Stay down a moment. The stair\'s cold, but it\'s honest. I\'ve slept on it all week.'],
      ['tamsin', 'Go on, get your key from the Thane. He only wanted to see who\'d try. Harrow\'s long gone anyway.'],
      ['tamsin', 'And {warden}? If a letter comes for you with soot on the seal, don\'t answer it. I did.'],
    ],
    do: [{ set: 'tamsin-yielded-3' }],
  },
  'journeyman-rest': {
    lines: [
      ['narrator', 'The journeyman\'s forge-light gutters out. Under the slag is a young dwarf\'s face, and it looks relieved.'],
      ['bryn', 'He wore a Sentinel\'s badge under all that iron. The Thane will want to know he\'s at rest.'],
    ],
  },
  'anvil-after-hammer': {
    lines: [
      ['narrator', 'Mother Anvil sinks onto her four iron legs. The fire in her ribs dims slowly, like a forge banked for the night.'],
      ['pip', 'The hammer\'s still warm. Someone held this every day for years, then gave it to a golem and walked off.'],
      ['bryn', 'Hilda will know it. She\'ll know it from across the Keep yard.'],
      ['alondra', 'And Stormwatch\'s north gate opens for this Brand. North, then, to the lake.'],
    ],
    do: [{ set: 'anvil-fell' }],
  },
  'anvil-after': {
    lines: [
      ['narrator', 'Mother Anvil sinks onto her four iron legs. The fire in her ribs dims slowly, like a forge banked for the night.'],
      ['pip', 'The hammer broke when she fell. Harrow\'s own hammer, in two pieces, and we did that. Hilda\'s going to shout.'],
      ['bryn', 'Then she\'ll mend it. Take the pieces home, {warden}. Some things should be mended by family.'],
      ['alondra', 'And Stormwatch\'s north gate opens for this Brand. North, then, to the lake.'],
    ],
    do: [{ set: 'anvil-fell' }],
  },
  'anvil-again': { lines: [['pip', 'She got up again. Harrow builds things to last. Just once I wish he\'d built something badly.']] },
  'cutters-ledger': {
    lines: [
      ['narrator', 'In the Cutter-Chief\'s coat: a ledger bound in sealskin. Columns of numbers, and one line underlined twice.'],
      ['pip', 'Tally-cipher. I can read "heart" and nothing else. There\'s a Tallyman in Ysolde\'s stockade who writes this.'],
    ],
  },
  'abbess-rest': {
    lines: [
      ['narrator', 'The Drowned Abbess lowers her censer. For a moment she\'s an old woman, soaked and tired. Then she\'s only frost.'],
      ['alondra', 'She spoke, at the end. "Ring for us." The bell at Peak\'s Veil, I think. Nobody has rung it in thirty years.'],
    ],
  },
  // the Rime-Abbot's last words, then Hush's scene (spec §3.5): Brother Kesh names it if you have met him
  'abbot-after': {
    lines: [
      ['narrator', 'The Rime-Abbot kneels, and the frost slides off him like a cloak. Under it is an old man, tired and very cold.'],
      ['rime-abbot', 'Is it still beating? ...Good. Thirty winters I sang it to sleep, and it never woke. Tell little Wynn I kept it.'],
      ['rime-abbot', 'Don\'t let them cut its heart out. It\'s only sleeping. We\'re all only sleeping.'],
      ['narrator', 'Then he is frost, and then he is nothing. Under your feet, the ice floor begins to glow.'],
    ],
    do: [{ set: 'abbot-fell' }],
    choices: [{ text: 'Look down.', if: { flag: 'met-kesh' }, next: 'hush-kesh' }, { text: 'Look down.', if: { not: { flag: 'met-kesh' } }, next: 'hush' }],
  },
  'hush-kesh': {
    lines: [
      ['narrator', 'Under the ice, lit from within: something as big as the lake, curled up like a sleeping child. It is breathing.'],
      ['narrator', 'Boots on the ice behind you: Brother Kesh, who followed you down. Too late for the fight, and in time for this.'],
      ['kesh', 'Hush. It\'s what you say to a sleeper. A thousand years of listening, and I\'m the one who gets to see it.'],
      ['alondra', 'Its heart. I\'ve heard it since Fawnrest, and thought it was mine. Listen. It\'s slowing.'],
      ['kesh', 'Going back to sleep.'],
      ['alondra', '...Or tired.'],
      ['bryn', 'Six coals. Let\'s go home and tell the Council. I don\'t know how we tell them this.'],
    ],
  },
  hush: {
    lines: [
      ['narrator', 'Under the ice, lit from within: something as big as the lake, curled up like a sleeping child. It is breathing.'],
      ['narrator', 'The monks of Peak\'s Veil call it Hush: what you say to a sleeper. Its heart beats once, slow as a season.'],
      ['alondra', 'I\'ve heard that heart since Fawnrest, and thought it was mine. Listen, {warden}. It\'s slowing.'],
      ['pip', 'Going back to sleep, then. Good. Let\'s all go, quietly.'],
      ['alondra', '...Or it\'s tired.'],
      ['bryn', 'Six coals. Let\'s go home and tell the Council. I don\'t know how we tell them this.'],
    ],
  },
  'abbot-again': { lines: [['pip', 'He got up again. The lake gives everything back in the end. I\'m starting to really dislike this lake.']] },

  // ---- arrivals (ARRIVALS): first impressions of the mountains --------------------------------------------
  'arrive-peaks-veil': {
    lines: [['alondra', 'A great bell up there, and it isn\'t ringing. You can hear a bell that isn\'t ringing, if it\'s big enough.'], ['pip', 'Monks. Everyone whispers, and I can never tell if it\'s holy or rude.']],
  },
  'arrive-ironhold': {
    lines: [['bryn', 'A hall cut out of one mountain, by people who never once asked the mountain. It\'s still sulking. Listen.'], ['pip', 'Everything here is iron, stone or cross. Mostly cross.']],
  },
  'arrive-stormwatch': {
    lines: [['pip', 'An army post with its gate shut and its soldiers bored. My favourite kind of army.'], ['bryn', 'The north gate\'s barred from this side. Whatever\'s on the ice road, they\'d rather it stayed there.']],
  },
  'arrive-frostmere': {
    lines: [['alondra', 'There. Under the ice. A heartbeat, slow as a season. I\'ve heard it since Fawnrest, and I thought it was mine.'], ['bryn', 'The whole lake, holding its breath. Walk softly, all of you. Especially you, Pip.']],
  },

  // ---- rests (RESTS) ---------------------------------------------------------------------------------
  'veil-night': {
    lines: [
      ['narrator', 'In the night the bell of Peak\'s Veil rings once more, softly, with nobody on the rope.'],
      ['wynn', 'It does that now. It\'s only saying goodnight to them. Go back to sleep, {warden}.'],
    ],
    do: [{ set: 'veil-night' }],
  },

  // ---- the third council (keep-hall trigger `council-3`, guarded by the flag it sets) -------------------
  'council-3': {
    lines: [
      ['narrator', 'Six coals burn in the Eternal Hearth. Ironspire\'s chair holds a Thane at last, and he has brought his own cup.'],
      ['isolde', 'Six coals, {warden}. Sit. Ironhold sits with us tonight, for the first time since my father\'s day.'],
      ['brundar', 'Then I owe this table an apology, so here it is: Harrow robbed Ironhold, and I sealed the Deeps to hide it.'],
      ['brundar', 'Under my hall we kept the plans for the Worldforge. A thousand years we kept them. Harrow took them.'],
      ['qasim', 'And a box sealed in soot came to Ironhold, Thane. With a letter. I\'d wager my cisterns on it.'],
      ['brundar', 'It sits on my table, unopened. I don\'t open gifts from men who rob me.'],
      ['isolde', 'Keep it shut. Three chairs filled at last. One still empty: the Gloomfen\'s.'],
    ],
    do: [{ set: 'council-3-done' }, { claim: 'ironspire-waking' }],
    choices: [
      { text: 'Ask about the Worldforge.', next: 'council-3-forge' },
      { text: 'Let the Council talk.', do: [{ end: 'ironspire' }] },
    ],
  },
  'council-3-forge': {
    lines: [
      ['fenwick', 'The Worldforge. I knew the smith who drew those plans. Long ago. Don\'t ask me how long.'],
      ['hilda', 'A forge to melt relics down, every last one. And my brother\'s the only smith alive who could build it.'],
      ['alondra', 'And under Frostmere a Sleeper\'s heart beats slower since the sixth coal caught. I counted, all the way home.'],
      ['narrator', 'Fenwick says nothing. He is looking into the hearth, and for a moment the hearth seems to look back.'],
      ['isolde', 'Then we find Harrow before that forge is lit. Bogmire\'s children still walk into the Gloomfen after a lantern.'],
      // M6 (spec §2.4): retold to match the fen stair's opening
      ['isolde', 'And Willowmurk has sent for you, {warden}: the fen stair below Mossfall. Tonight, eat something. That\'s an order.'],
    ],
    do: [{ end: 'ironspire' }],
  },

  // ==== M6: the Gloomfen Marsh (spec §2.4, §3.1, §3.5, §3.6) ==================================================

  // ---- the Keep, after the third council ----------------------------------------------------------------
  // Isolde hears of Rotbridge at the Council table, not before; after the fourth council, the boxes
  'isolde-rotbridge': {
    lines: [
      ['isolde', 'Pip has told me about Rotbridge, in more words than it needed. Not now, {warden}.'],
      ['isolde', 'When the Gloomfen is won, you\'ll tell it to the Council, properly. Until then I don\'t trust my face.'],
    ],
  },
  'isolde-boxes': {
    lines: [['isolde', 'The boxes are in the vault, under the Seal. Some nights I sit with them. They\'re warm. Boxes shouldn\'t be warm.']],
    // M7 (spec §3.6): Isolde gives Act III's main quest, so her talk can start it: the Opening, as the keep-hall trigger
    // plays it (STUB from the M7 scaffold: P3 decides whether she keeps offering it)
    choices: [{ text: 'Open them together, as the letter said.', if: { not: { flag: 'council-5-done' } }, next: 'council-5' }, LEAVE],
  },
  'notice-isolde-boots': { lines: [['isolde', 'Tamsin\'s boots. She hated boots as a girl; she said they made her slow. She\'d have hated these most of all.']] },
  'fenwick-seven': { lines: [['fenwick', 'Seven coals, and the flame\'s gone soft and gold, like a lamp left in a window for somebody. I don\'t trust it.']] },
  'fenwick-eight': {
    lines: [
      ['fenwick', 'Eight. Every coal lit. Nine hundred years, Warden, and I never once heard this hearth go quiet.'],
      ['fenwick', 'It isn\'t humming. It isn\'t singing. It\'s listening. Go to bed. I\'ll sit up with it.'],
    ],
  },
  'notice-fenwick-lantern': { lines: [['fenwick', 'Keep that lantern away from my hearth, Warden. The hearth likes it. I don\'t like what the hearth likes.']] },
  // Hilda hears about the clasp on the barge (once)
  'hilda-barge': {
    lines: [
      ['bryn', 'Hilda. On Rotbridge, the man on the barge had a mark on his cloak-clasp. A hammer in a broken ring.'],
      ['narrator', 'Hilda doesn\'t stop working. She strikes the same blow three times, and doesn\'t notice.'],
      ['hilda', 'If that was my brother on that barge, he\'s buying Wardens now. With our mark on him.'],
      ['hilda', 'Give me something to hit, Warden. Something that won\'t mind.'],
    ],
    do: [{ set: 'heard-barge' }],
    choices: FORGE,
  },
  'notice-hilda-chain': { lines: [['hilda', 'A chain-link riveted cold into each palm. Crude. Strong. I\'d have done it hot, and made it pretty.']], choices: FORGE },
  'notice-hilda-harpoon': { lines: [['hilda', 'A year in something alive, that harpoon. The iron remembers. Let me temper it before it bites you.']], choices: FORGE },
  'miravel-box': { lines: [['miravel', 'I should have told the Council about the box long ago. I was ashamed of how much I wanted to open it.']] },

  // ---- Willowmurk -------------------------------------------------------------------------------------
  // Elder Moss speaks in riddles, and every one of them is true (the player's own lore): the wards, the lights, the
  // bridge, the bells. He sent the reed-token; the fen talks through reeds, and so does he (the Sleeper's scene).
  moss: {
    lines: [
      ['moss', 'What comes when the fen calls, on dry feet, with Keep mud on its boots? A Warden. Sit. I\'m Moss.'],
      ['moss', 'A riddle that is only the truth: three of my ward-stones went dark in one night. Stones don\'t die. They\'re drunk.'],
      ['moss', 'The oldest willow outside the ring has long roots and a long thirst. Grandfather Willow is drinking my wards.'],
      ['moss', 'Quiet him, and the ring will sing again. And listen to the reeds out there. The fen talks through reeds.'],
    ],
    do: [{ set: 'met-moss' }],
    choices: MOSS,
  },
  'moss-again': { lines: [['moss', 'A riddle costs nothing, and is worth what it costs. Ask me one. The willows are listening; they always are.']], choices: MOSS },
  'moss-lights': {
    lines: [
      ['moss', 'What walks the fen with a lantern and wet feet? Not a marsh-light. A mother, going back for the last child.'],
      ['moss', 'Bogmire\'s little ones follow her lamp into the bog. She means to take them somewhere safe. She\'s kind, and wrong.'],
    ],
    choices: MOSS,
  },
  'moss-bridge': {
    lines: [
      ['moss', 'What sits on a bridge and isn\'t a troll? An old man who wishes he were. Pay him, play him, or be very sorry.'],
      ['moss', 'And on the far half waits one who has read too many letters. Be kind to her. Nobody else has been.'],
    ],
    choices: MOSS,
  },
  'moss-bells': {
    lines: [
      ['moss', 'What do the drowned sing under Misthollow, a thousand years, one word? A lullaby.'],
      ['moss', 'And a lullaby is always for someone. When the singing stops, you\'ll hear who.'],
    ],
    choices: MOSS,
  },
  // the thank-you of the Failing Wards (also a first meeting): the last Willow-Ward
  'moss-wards': {
    lines: [
      ['moss', 'Hear that? The ring is singing. Grandfather Willow is only a willow again, and I\'m only an old man again.'],
      ['moss', 'I\'m Moss. I sent for you, and you came, which is rarer than you\'d think.'],
      ['moss', 'Willowmurk made three Willow-Wards. Two went into the fen with men who never came back. The last is yours.'],
    ],
    do: [{ set: 'met-moss' }, { set: 'wards-mended' }, { claim: 'failing-wards' }],
    choices: MOSS,
  },
  // the Dead Tongue: he reads the sealed chest's warnings (also a first meeting); Corvus opens it
  'moss-chest': {
    lines: [
      ['narrator', 'Elder Moss runs a finger along the lettering on the Tallymen\'s chest, and the finger slows, and stops.'],
      ['moss', 'A dead tongue, First-Age. It says: here sleeps a leaf of the Worldforge. Do not forge it. Let no one forge it.'],
      ['moss', 'And smaller, underneath: it cannot be burned; we tried. Somebody sank this on purpose, Warden.'],
      ['moss', 'Take it back to the diver on Misthollow\'s broken pier. He brought it up. He should know what he brought.'],
    ],
    do: [{ set: 'met-moss' }, { set: 'chest-read' }],
    choices: MOSS,
  },
  'moss-after': { lines: [['moss', 'The ring sings, the willows sleep, and the fen minds its manners. Mostly. Ask me a riddle, or go and be brave.']], choices: MOSS },
  'moss-lanterns': { lines: [['moss', 'The lights are out over the bogs, and nine children sleep in Bogmire. A riddle with a happy ending. Rare.']], choices: MOSS },
  'moss-deep': { lines: [['moss', 'The choir has stopped. I listened to it every night of my life, and now I listen to nothing. Nothing is very loud.']], choices: MOSS },
  'notice-moss-ward': { lines: [['moss', 'The last Willow-Ward, on your arm. It knows you now. Stones are loyal; it\'s the willows you watch.']], choices: MOSS },
  'notice-moss-bow': { lines: [['moss', 'Grandfather\'s bow. He wept three hundred years into that string. Draw it gently; he\'s earned the rest.']], choices: MOSS },
  'notice-moss-staff': { lines: [['moss', 'The Cantor\'s staff. It kept time under the water a thousand years. Don\'t beat time with it. Something might wake.']], choices: MOSS },
  sedge: { lines: [['sedge', 'Sedge, herb-seller. Reed-salve, bog-myrtle, a tonic that tastes of the fen. It works. Nothing else here does.']], choices: SEDGE },
  'sedge-wards': { lines: [['sedge', 'The stones are singing again, so my herbs will keep. Wards are good for business. Willows are bad for it.']], choices: SEDGE },
  'notice-sedge-shawl': { lines: [['sedge', 'Nettie\'s knots! Twenty years she\'s refused me that recipe. Let me look. ...No? Fine. Buy something.']], choices: SEDGE },
  'wm-villager': { lines: [['wm-villager', 'Three ward-stones went dark in one night, and the willows walk right up to the fires now. We sleep in turns.']] },
  'wm-villager-wards': { lines: [['wm-villager', 'The stones lit up all at once, like a lamp you\'d forgotten you left on. The willows went home.']] },
  'wm-villager-deep': { lines: [['wm-villager', 'They say the Blackwater\'s fallen, and you can walk to the Keep on dry stone. I might. I\'ve never seen a Keep.']] },
  'notice-villager-bow': { lines: [['wm-villager', 'Grandfather\'s bow! He used to drop leaves on my washing. On purpose, I always thought.']] },

  // ---- Rotbridge: Hodge's toll (spec A11, §4.4) ---------------------------------------------------------
  // Hodge is not actually a troll, just an extremely unpleasant old man (the player's own lore). Every line of his
  // carries TOLL. His talk table (data/npcs.js) names the day's price; `hodge-toll` is also his encounter's talk.
  hodge: {
    lines: [
      ['narrator', 'By a striped toll-bar sits an old man on a stool: a cudgel across his knees, a lantern, and a toll-book.'],
      ['hodge', 'Toll. Don\'t look at me like that. It\'s a bridge. Bridges have tolls. This one has a bigger one.'],
      ['pip', 'They told us a troll kept Rotbridge.'],
      ['hodge', 'I\'m not a troll. I\'m Hodge. Trolls are reasonable.'],
      ['hodge', 'Toll changes daily, and it isn\'t always coin. Pay today\'s, play me for it, or try and move me. Nobody tries twice.'],
    ],
    do: [{ set: 'met-hodge' }, { scout: 'hodge' }], // his fight never stands on the map: meeting him scouts his poster
    choices: TOLL,
  },
  'hodge-toll': {
    lines: [['hodge', 'Toll. It\'s a bridge, and bridges have tolls. Pay today\'s, play me for it, or try and move me.']],
    do: [{ set: 'met-hodge' }, { scout: 'hodge' }],
    choices: TOLL,
  },
  // the day's price, in his words (the same rotation as TOLL's pay choices)
  'hodge-gold': { lines: [['hodge', 'Today\'s toll is gold. A hundred and twenty. Yesterday\'s was cheaper. Tomorrow\'s? I know. You don\'t.']], choices: TOLL },
  'hodge-silver': { lines: [['hodge', 'Today it\'s forge silver. One piece. Not coin, the real stuff. I\'m having a tooth made. Don\'t ask which.']], choices: TOLL },
  'hodge-tonics': { lines: [['hodge', 'Two Hearth Tonics today. For my chest. It rattles. Don\'t listen to it; I don\'t.']], choices: TOLL },
  'hodge-paid-up': {
    lines: [
      ['narrator', 'Hodge writes you into his toll-book in a hand like a spider falling downstairs. The bar swings up.'],
      ['hodge', 'Paid. Mind the carvings on the bridge; they move. I don\'t.'],
    ],
  },
  // the toll game: winning lifts the bar for good and gives you his clipped coin
  'hodge-won': {
    lines: [
      ['hodge', 'Fine. FINE. Don\'t smile. It makes my teeth hurt.'],
      ['narrator', 'He unhooks a clipped coin from his chain and slaps it into your hand, as if it had bitten him.'],
      ['hodge', 'It never liked me either. Bar\'s up, for good. Don\'t make me say it twice.'],
    ],
    do: [{ give: 'unfair-toll' }, { set: 'toll-paid' }],
  },
  'hodge-lost': { lines: [['hodge', 'Mine, I think. Come back tomorrow. Toll\'ll be different. So will my mood. Worse, probably.']] },
  'hodge-paid': {
    lines: [
      ['hodge', 'Paid is paid. Bar\'s up. Don\'t lean on it.'],
      ['hodge', 'And nobody\'s ever shifted me off this stool, so don\'t get ideas. Or do. I could use the exercise.'],
    ],
    choices: TOLL,
  },
  'hodge-stool': { lines: [['hodge', 'I\'m sitting. I\'m allowed; it\'s my stool. You\'re on my bridge for nothing, and I hate every step you take.']], choices: TOLL },
  // after Tamsin (once): what he saw from his stool (it sets tamsin-fallen too, should her scene have been cut short)
  'hodge-heavier': {
    lines: [
      ['hodge', 'Your friend went downriver on that barge. Black as my boots, no lamp, no oars. Paid no toll. Water never does.'],
      ['hodge', 'I wrote her down anyway. Paid in full. She paid more than you, Warden. Remember that when you complain.'],
    ],
    do: [{ set: 'tamsin-fallen' }, { set: 'hodge-heavier' }],
    choices: TOLL,
  },
  // the same, when her yield scene was lost before she could leave you the Bogstriders (Page IV stays open)
  'hodge-heavier-boots': {
    lines: [
      ['hodge', 'Your friend went downriver on that barge. Black as my boots, no lamp, no oars. Paid no toll. Water never does.'],
      ['hodge', 'She left these on my bridge. Boots. Good ones. I\'d charge you for them, but they\'d never fit me.'],
    ],
    do: [{ give: 'bogstriders' }, { set: 'tamsin-fallen' }, { set: 'hodge-heavier' }],
    choices: TOLL,
  },
  'notice-hodge-coin': { lines: [['hodge', 'That\'s my coin round your neck. It always comes up Hodge. See how you like it coming up you.']], choices: TOLL },
  'notice-hodge-boots': { lines: [['hodge', 'Her boots. She paid me in exact change, every day, and said thank you. I\'ve never been so insulted.']], choices: TOLL },
  // after the terrible fight (AFTER hodge): he never dies; at the end he sits down on his stool and says so
  'hodge-sits': {
    lines: [
      ['narrator', 'Hodge sits down on his stool, hard, as if he had meant to all along, and folds his arms.'],
      ['hodge', 'I\'m sitting down. That\'s not losing. That\'s sitting down. Bar\'s up. Go on, before I stand up.'],
    ],
  },
  'hodge-sits-coin': {
    lines: [
      ['narrator', 'Hodge sits down on his stool, hard, as if he had meant to all along, and folds his arms.'],
      ['hodge', 'That\'s my coin on your chain. It\'ll come home. Coins always come home to me.'],
      ['hodge', 'I\'m sitting down. That\'s not losing. Bar\'s up. Go on, before I stand up.'],
    ],
  },
  // after losing to him (AFTER on 'defeat': you wake at your last Hearthfire)
  'hodge-knocked': {
    lines: [
      ['narrator', 'You wake by a fire with your ears ringing like a toll-bell. A page of Hodge\'s toll-book is tucked in your collar.'],
      ['narrator', 'Under today\'s date, in a hand like a spider falling downstairs: "Refused toll. Did not move me." Underlined twice.'],
      ['pip', 'An old man. With a cane. Nobody tells Isolde. Nobody.'],
    ],
    do: [{ set: 'knocked-by-hodge' }],
  },
  'hodge-knocked-again': { lines: [['pip', 'Again. He hit me with the toll-book this time. It\'s a very big book.']] },

  // ---- Rotbridge: Tamsin's fourth duel (the duel's `talk`), and her fall (spec §3.5, A12) -----------------
  'tamsin-rotbridge': {
    lines: [
      ['tamsin', 'You again. A month I\'ve followed his letters through this fen, and you walk in behind me like a stray dog.'],
      ['tamsin', 'He wrote back, Warden. He\'s coming here, to Rotbridge. He says he\'ll show me what a Warden is for.'],
      ['tamsin', 'So I\'m not moving. Not for the old man, not for the fog, and not for you.'],
      ['pip', 'She walked the whole bog to get here, on foot. Those boots, {warden}. I want those boots.'],
    ],
    choices: [{ text: 'Try again.', do: [{ fight: 'tamsin-rotbridge' }] }, { text: 'Not yet.' }],
  },
  // won or yielded, the boots stay on the bridge: she is going where she won't need to walk (a win drops them from
  // the fight; a yield leaves them here, so Page IV never hangs on a duel that cannot be fought again)
  'tamsin-rb-win': {
    lines: [
      ['narrator', 'Tamsin goes down on one knee. When she stands, she steps out of the Bogstriders, and leaves them.'],
      ['tamsin', 'Four times. Keep the boots. Where I\'m going, I won\'t need to walk.'],
      ['narrator', 'Downstream, something moves in the fog: long and black, with no lamp on it.'],
    ],
    choices: [{ text: 'Look downstream.', next: 'tamsin-fall' }],
  },
  'tamsin-rb-yield': {
    lines: [
      ['tamsin', 'Stay down. The bridge is old, but it holds. It\'s held me three days.'],
      ['narrator', 'She steps out of the Bogstriders and kicks them across the stones to you.'],
      ['tamsin', 'Keep the boots. Where I\'m going, I won\'t need to walk. The far gate\'s yours; I\'ve someone to meet.'],
      ['narrator', 'Downstream, something moves in the fog: long and black, with no lamp on it.'],
    ],
    do: [{ set: 'tamsin-yielded-4' }, { give: 'bogstriders' }],
    choices: [{ text: 'Look downstream.', next: 'tamsin-fall' }],
  },
  // a yield again, the boots already yours (her first yield's scene closed before she went): no second pair
  'tamsin-rb-yield-again': {
    lines: [
      ['tamsin', 'Stay down. You\'ve had my boots already. Where I\'m going, I won\'t need them.'],
      ['narrator', 'Downstream, something moves in the fog: long and black, with no lamp on it.'],
    ],
    do: [{ set: 'tamsin-yielded-4' }],
    choices: [{ text: 'Look downstream.', next: 'tamsin-fall' }],
  },
  // her fall (A12): the black barge, the tall man with a hammer in a broken ring on his clasp, the trade, her word
  'tamsin-fall': {
    lines: [
      ['narrator', 'A black barge slides out of the fog and noses against the bridge pier, quiet as a held breath.'],
      ['narrator', 'In the stern stands a tall man in a boatman\'s cloak. Under it, a smith\'s leather apron.'],
      ['narrator', 'On his cloak-clasp, a hammer in a broken ring.'],
      ['narrator', 'He holds up a sackcloth bundle. Where the cloth has slipped, the thing inside bleeds violet-black, like ink in water.'],
      ['bryn', '{warden}. That mark.'],
    ],
    do: [{ set: 'tamsin-fallen' }],
    choices: [{ text: 'Tamsin. Don\'t.', next: 'tamsin-traded' }],
  },
  'tamsin-traded': {
    lines: [
      ['narrator', 'Tamsin doesn\'t look round. She hands down the relic she took from the Keep the night the hearth burned blue.'],
      ['narrator', 'He gives her the bundle. She holds it as if it burns, and doesn\'t let go.'],
      ['tamsin', 'Tell Isolde I was the better Warden. Tell her I had to prove it somewhere.'],
      ['narrator', 'She steps down into the barge, and the fog closes behind it. There is no sound of oars at all.'],
      ['hodge', 'She paid her toll. Heavier than yours.'],
    ],
  },

  // ---- Bogmire ------------------------------------------------------------------------------------------
  // Mayor Gretch keeps order through fear and favours (the player's own lore): the main quest, the Bogmire board,
  // and a soot-sealed box for the Gloomfen's chair
  gretch: {
    lines: [
      ['gretch', 'A Keep Warden, in Bogmire. Wipe your boots. No, the other way. We keep the mud outside.'],
      ['gretch', 'I\'m Gretch. I keep this town standing with two things, fear and favours, and I\'m running low on both.'],
      ['gretch', 'Our children walk into the fen at night, after a light. Nine so far. Widow Pell\'s boy was the last.'],
      ['gretch', 'Bring them home, and Bogmire owes you a favour. My board pays for anything else that makes the fen quieter.'],
    ],
    do: [{ set: 'met-gretch' }],
    choices: GRETCH_ASK,
  },
  'gretch-again': { lines: [['gretch', 'The lights go east into the Lanternfen, and our children go after them. The board\'s by the moot-hall.']], choices: GRETCH_ASK },
  'gretch-box': {
    lines: [
      ['gretch', 'You\'ve seen those too? A box came, sealed in soot, the week the children started walking. "For Bogmire\'s chair."'],
      ['gretch', 'Bogmire hasn\'t had a chair at your Keep in thirty years. I haven\'t opened it. I\'m not a fool.'],
      ['gretch', 'I haven\'t thrown it in the fen, either. I\'m not that kind of fool.'],
    ],
    choices: GRETCH,
  },
  'gretch-paid': { lines: [['gretch', 'Paid, and counted twice. Everyone in Bogmire counts twice. The ones who didn\'t are in the fen.']] },
  // the children home (children-home): the town's thanks, once (also a first meeting)
  'gretch-children': {
    lines: [
      ['gretch', 'Nine children, home in their own beds. The whole town cried into its porridge. I didn\'t. I had a cold.'],
      ['gretch', 'Bogmire owes you a favour. Here: the collection plate. The town filled it. Some of it\'s buttons.'],
    ],
    do: [{ set: 'met-gretch' }, { set: 'gretch-thanked' }, { gold: 150 }],
    choices: GRETCH,
  },
  'gretch-home': { lines: [['gretch', 'Nine mothers kissed me in the street today. I didn\'t care for it. Much. The board\'s by the moot-hall.']], choices: GRETCH },
  'gretch-summons': { lines: [['gretch', 'A rider from your Isolde: the Council sits, and the Gloomfen has a chair. I\'ll bring my box. And my own chair.']], choices: GRETCH },
  'gretch-council': { lines: [['gretch', 'Your Keep\'s soup is thin and your Council talks too much. I liked it. Tell anyone I said so and I\'ll deny it.']], choices: GRETCH },
  'notice-gretch-lantern': { lines: [['gretch', 'Put that lantern out while you\'re in my town, Warden. Please. We all know whose it was.']], choices: GRETCH },
  'notice-gretch-shawl': { lines: [['gretch', 'Nettie\'s shawl. So she likes you. She\'s never liked me, and I\'ve never needed her to.']], choices: GRETCH },
  // Nettie the Swamp Witch: healer, herbalist, and not someone you cross (the player's own lore). Her remedy: a hex
  // holds while its maker holds her stone, and Mother Grue taught her everything, including when to leave.
  nettie: {
    lines: [
      ['nettie', 'Healer, herbalist, witch. Two of those you can buy. The third you don\'t cross. Mind the jars; some bite.'],
      ['nettie', 'Half the eastern quarter is hexed: rot in the bones, bad luck in the blood. My remedies won\'t take.'],
      ['nettie', 'Mother Grue did it, out in the Lanternfen. She taught me everything I know, including when to leave.'],
      ['nettie', 'A hex holds while its maker holds her stone. Get the Hag-Stone off Grue\'s finger, then come and tell me.'],
      ['alondra', 'She\'s frightened of Grue. She\'d sooner eat her own jars than say so.'],
    ],
    do: [{ set: 'met-nettie' }],
    choices: NETTIE,
  },
  'nettie-again': { lines: [['nettie', 'Buy something or sit down. Standing in a witch\'s doorway is how folk end up as draught excluders.']], choices: NETTIE },
  // the thank-you of Nettie's Remedy (also a first meeting): her shawl, and a piece of bog amber
  'nettie-grue': {
    lines: [
      ['nettie', 'Grue\'s pot has gone cold. I felt it from here, like a draught under the door. The hexes are coming loose.'],
      ['nettie', 'I\'m Nettie, and I don\'t thank people. Here: my shawl, knotted against hexes, and a lump of amber. Call it a remedy.'],
    ],
    do: [{ set: 'met-nettie' }, { set: 'grue-told' }, { claim: 'nettie-remedy' }],
    choices: NETTIE,
  },
  'nettie-after': { lines: [['nettie', 'The east quarter\'s up and grumbling. That\'s healthy. Hexed folk don\'t grumble; they just go grey.']], choices: NETTIE },
  // a companion hint, and only a hint (spec §1: no recruitment in M6)
  'nettie-someday': {
    lines: [
      ['nettie', 'Nine children home and not a sniffle among them. I\'m almost disappointed.'],
      ['nettie', 'If your Keep ever needs a witch, ask me. I\'m not saying yes. I\'m saying ask.'],
    ],
    choices: NETTIE,
  },
  'notice-nettie-stone': { lines: [['nettie', 'Grue\'s stone. Don\'t look at me through it. I know what you\'d see, and so does she.']], choices: NETTIE },
  'notice-nettie-shawl': { lines: [['nettie', 'My knots. Mind the third one; there\'s a hex tied in it I didn\'t want to throw away.']], choices: NETTIE },
  'notice-nettie-veil': { lines: [['nettie', 'The Mother\'s veil. Still wet? It\'ll be wet forever. Grief\'s like that. Don\'t wring it out.']], choices: NETTIE },
  pell: { lines: [['pell', 'My Lark followed a light into the fen nine nights ago. They all say a light. I say a lantern. A lantern has a hand.']] },
  'pell-home': {
    lines: [['pell', 'Lark\'s home. He sleeps with his boots on, and wakes asking for the lamp-lady. I tell him she\'s resting. Is that true?']],
    choices: [{ text: 'Tell her it is true.', next: 'pell-true' }, LEAVE],
  },
  'pell-true': { lines: [['pell', 'Then I\'ll leave a lamp in the window for her. Somebody should. She only wanted them safe. So did I.']] },
  'notice-pell-lantern': { lines: [['pell', 'That\'s her lantern. The lamp-lady\'s. Lark says she sang to them all the way. He says it was a nice song.']] },
  'bm-watch': { lines: [['bm-watch', 'Mind the eastern quarter; the stilts are going. And keep your lamp dark after sundown. Lights bring the walking.']] },
  'bm-watch-home': { lines: [['bm-watch', 'A lamp in every window, and nobody walking into the bog. Nothing to watch. I\'m watching anyway. Habit.']] },
  'bm-watch-deep': { lines: [['bm-watch', 'The causeway\'s up out of the water! You can walk to the Keep on dry stone. Nobody here wants to. Nice thought.']] },
  'notice-watch-chain': { lines: [['bm-watch', 'Tallyman chain in your gauntlets? That chain dragged past my stilts all spring. I\'d know its clank asleep.']] },

  // ---- Misthollow: Corvus the diver (spec §3.6: his harpoon, the sealed chest) ----------------------------
  // He has gone down more times than anyone, and lost something valuable on his last dive (the player's own lore)
  corvus: {
    lines: [
      ['corvus', 'Corvus. I\'ve been down more times than anyone in the fen. Deeper, too. I\'m not boasting; I\'m counting.'],
      ['corvus', 'Last dive, I went down for the Tallymen, for a chest. Came up with it, and with company: something big.'],
      ['corvus', 'I put my harpoon in it. It went off down the channel with my harpoon in its side. Best harpoon I ever had.'],
      ['corvus', 'Then the Tallymen kept the chest and cut my line. Get me my harpoon back. And find out what was in that chest.'],
    ],
    do: [{ set: 'met-corvus' }],
  },
  'corvus-again': { lines: [['corvus', 'The thing with my harpoon went down the Reach to the Tidal Flats. The Tallymen chained it there. Chained it!']] },
  'corvus-chest-taken': { lines: [['corvus', 'You\'ve got the chest! Don\'t open it. I can\'t read what\'s on it; nobody can. Nobody but Elder Moss, in Willowmurk.']] },
  // the thank-you of Corvus's Harpoon (also a first meeting): he knows it on sight
  'corvus-harpoon': {
    lines: [
      ['corvus', 'That\'s her. My harpoon. I\'d know her in the dark; I\'ve held her in the dark. Where did you... No. I know where.'],
      ['corvus', 'I\'m Corvus, and she\'s yours. You\'ve earned her more than I have. Take the silver I saved for a new one, too.'],
    ],
    do: [{ set: 'met-corvus' }, { set: 'harpoon-shown' }, { claim: 'corvus-harpoon' }],
  },
  // the thank-you of the Dead Tongue (also a first meeting): he opens the chest he brought up; its page is yours
  'corvus-chest': {
    lines: [
      ['corvus', 'That\'s the chest I brought up for the Tallymen. Elder Moss read it? ...The Worldforge. For money, I did that.'],
      ['narrator', 'Corvus breaks the seal himself. Inside there is one page, in a First-Age hand as fine as frost on glass.'],
      ['corvus', 'Take it, Warden. It can\'t be burned, and I won\'t be the one who hands it back.'],
      ['corvus', 'And take my dive-money. I\'m done diving for thieves.'],
    ],
    do: [{ set: 'met-corvus' }, { set: 'chest-told' }, { claim: 'dead-tongue' }],
  },
  'corvus-after': { lines: [['corvus', 'I dive for myself now. Mostly for pennies. Once for a fish that looked at me funny. Best year of my life.']] },
  'corvus-deep': { lines: [['corvus', 'The Blackwater\'s fallen. First time in my life I can see the bottom of the channel. It\'s worse than I imagined.']] },
  'notice-corvus-harpoon': { lines: [['corvus', 'Hold her lower. She likes to be thrown from the hip. ...Sorry. Habit. She\'s yours.']] },
  'notice-corvus-helm': { lines: [['corvus', 'The Salvage-Master\'s helm. It was him cut my line, to save his own air. Wear it better than he did.']] },
  'notice-corvus-tooth': { lines: [['corvus', 'One of Old Jaws\'s teeth! He took my brother\'s boat, and my brother\'s good humour with it.']] },
  'notice-corvus-pearl': { lines: [['corvus', 'The pearl from its brow. I saw it glow, down in the dark, the day I lost my harpoon. It looked at me.']] },

  // ---- after fights (AFTER) --------------------------------------------------------------------------
  // each lead's lines point at its quest's giver, and play only until that quest's step is done
  'willow-rest': {
    lines: [
      ['narrator', 'Grandfather Willow settles, roots and all, like an old man lowering himself into a chair.'],
      ['bryn', 'Listen. Back in the village, the ward-stones are humming. Elder Moss will want to hear it from us.'],
    ],
  },
  'grue-rest': {
    lines: [
      ['narrator', 'Mother Grue\'s pot boils over and goes out. The fog in the hollow thins, as if it had been holding its breath.'],
      ['alondra', 'Nettie felt that, I think, all the way from Bogmire. We should tell her anyway. She\'ll want to hear it said.'],
    ],
  },
  'salvage-chest': {
    lines: [
      ['narrator', 'On the jetty sits the Tallymen\'s prize: an iron-bound chest, sealed, lettered all over in a tongue nobody speaks.'],
      ['pip', 'It\'s heavy, it\'s warm, and it hums. I hate it. I\'m carrying it anyway.'],
      ['bryn', 'First-Age letters. Warnings, I think. Elder Moss reads the old tongue, if anyone living does.'],
    ],
  },
  'cantor-rest': {
    lines: [
      ['narrator', 'The Drowned Cantor lowers his staff mid-beat. Far above, in the drowned streets, the singing falters, and goes on.'],
      ['narrator', 'Under the floor, the slow light dims, and brightens, and dims.'],
      ['alondra', 'He kept time for something under the floor. The city sings on without him. It sounds so tired.'],
    ],
    do: [{ set: 'cantor-fell' }],
  },
  // the Lantern Mother at rest (Brand of Lanterns): the children wake in the lamplight and follow you home
  // (children-home). Her lantern pried loose is yours; held to the end, it breaks as she falls.
  'mother-after-lantern': {
    lines: [
      ['narrator', 'The Lantern Mother lets her veil fall. Under it is a young woman\'s face, tired, and streaked with lamp-black.'],
      ['lantern-mother', 'Are they safe? I was taking them home. The water came up the stair, and I went back for the last one...'],
      ['alondra', 'They\'re safe. Their mothers are waiting up for them. You can put the lamp down now.'],
      ['narrator', 'She smiles, and is lamplight, and then is nothing. Her lantern is still warm in your hand.'],
      ['narrator', 'Around the drowned house the children stir in the lamplight, yawning, and come to you one by one.'],
      ['pip', 'Everyone hold hands. We follow this light and no other. This one says he\'s Lark, and his mam\'s the Widow Pell.'],
      ['alondra', 'Far off, over the long boardwalk, the lights are going out. All of them.'],
    ],
    do: [{ set: 'mother-fell' }, { set: 'children-home' }],
  },
  'mother-after': {
    lines: [
      ['narrator', 'The Lantern Mother lets her veil fall. Under it is a young woman\'s face, tired, and streaked with lamp-black.'],
      ['lantern-mother', 'Are they safe? I was taking them home. The water came up the stair, and I went back for the last one...'],
      ['alondra', 'They\'re safe. Their mothers are waiting up for them. You can put the lamp down now.'],
      ['narrator', 'Her lantern breaks as it drops, and she goes out with it. The drowned house keeps its lamps lit.'],
      ['narrator', 'By their light the children stir, yawning, and come to you one by one.'],
      ['pip', 'Everyone hold hands. Nobody follows any light but ours. This one says he\'s Lark, and his mam\'s the Widow Pell.'],
      ['alondra', 'Far off, over the long boardwalk, the lights are going out. All of them.'],
    ],
    do: [{ set: 'mother-fell' }, { set: 'children-home' }],
  },
  'mother-again': { lines: [['pip', 'She lit her lantern again. Somebody should tell her the children are home. Gently. From a distance.']] },
  // the Blackwater Leviathan at rest (Brand of the Deep): the collar breaks, the Blackwater falls, and in the quiet
  // the Sleeper's scene. Corvus's harpoon pried loose is yours; held to the end, it snaps in its side.
  'leviathan-after-harpoon': {
    lines: [
      ['narrator', 'The collar splits at its lock: an iron lock, stamped with a hammer in a broken ring.'],
      ['narrator', 'Free of its chain, the Leviathan sinks back into the deep, slow as a sunset, and the Blackwater sinks with it.'],
      ['pip', 'And Corvus\'s harpoon came out of its side like a cork. He\'s going to cry. I\'m going to watch.'],
      ['bryn', 'Look up the channel: the water\'s falling. By morning the causeway will be dry stone, all the way to the Keep.'],
      ['narrator', 'In the quiet, far up the channel under Misthollow, a song you never knew you were hearing stops.'],
    ],
    do: [{ set: 'leviathan-fell' }],
    choices: [{ text: 'Listen.', if: { flag: 'met-moss' }, next: 'lull-moss' }, { text: 'Listen.', if: { not: { flag: 'met-moss' } }, next: 'lull' }],
  },
  'leviathan-after': {
    lines: [
      ['narrator', 'The collar splits at its lock: an iron lock, stamped with a hammer in a broken ring.'],
      ['narrator', 'Free of its chain, the Leviathan sinks back into the deep, slow as a sunset, and the Blackwater sinks with it.'],
      ['pip', 'Corvus\'s harpoon snapped off in its side as it went. Hilda could mend it. Corvus could cry. Probably both.'],
      ['bryn', 'Look up the channel: the water\'s falling. By morning the causeway will be dry stone, all the way to the Keep.'],
      ['narrator', 'In the quiet, far up the channel under Misthollow, a song you never knew you were hearing stops.'],
    ],
    do: [{ set: 'leviathan-fell' }],
    choices: [{ text: 'Listen.', if: { flag: 'met-moss' }, next: 'lull-moss' }, { text: 'Listen.', if: { not: { flag: 'met-moss' } }, next: 'lull' }],
  },
  // the Sleeper's scene (spec §3.5): Elder Moss names it through the reeds if you have met him, else the narrator
  'lull-moss': {
    lines: [
      ['narrator', 'The reeds along the bank rustle, though there is no wind, and in the rustle is Elder Moss\'s voice, dry as a husk.'],
      ['moss', 'Hear that? Nothing. A thousand years the drowned sang under Misthollow, and tonight they\'ve stopped.'],
      ['moss', 'A riddle with no trick in it: what does a choir sing to sleep? A child too big to carry. Its name is Lull.'],
      ['alondra', 'Lull. I can hear it, now the singing\'s stopped: breathing, under the drowned city. So slow.'],
      ['alondra', 'Three, then. Hush under the ice, the one under the ash, and Lull. I dreamed of four.'],
      ['bryn', 'Eight coals. Let\'s go home, {warden}, and tell the Council. I don\'t know how we tell them this, either.'],
    ],
  },
  lull: {
    lines: [
      ['narrator', 'Under Misthollow the drowned sang one word for a thousand years, to something too big to wake.'],
      ['narrator', 'The word was its name, and its name was Lull. Tonight, for the first time, nobody is singing it.'],
      ['alondra', 'Lull. I can hear it, now the singing\'s stopped: breathing, under the drowned city. So slow.'],
      ['alondra', 'Three, then. Hush under the ice, the one under the ash, and Lull. I dreamed of four.'],
      ['bryn', 'Eight coals. Let\'s go home, {warden}, and tell the Council. I don\'t know how we tell them this, either.'],
    ],
  },
  'leviathan-again': { lines: [['pip', 'It came back up. Of course it did. I\'m never getting in a boat again. Or a bath.']] },

  // ---- arrivals (ARRIVALS): first impressions of the fen --------------------------------------------------
  'arrive-willowmurk': {
    lines: [['bryn', 'Willowmurk. My grandmother said it was a story for children. The children here would disagree.'], ['pip', 'Three of those ward-stones are dark. Even I know that\'s bad, and I don\'t know what a ward-stone is.']],
  },
  'arrive-rotbridge': {
    lines: [['alondra', 'Something on the bridge is breathing. No. The carvings are. They shift when you stop looking at them.'], ['pip', 'And there\'s a toll-bar. Of course there\'s a toll-bar. There\'s always a toll-bar.']],
  },
  'arrive-bogmire': {
    lines: [['pip', 'A whole town on stilts, and half the stilts are rotten. Walk on the nails, not the planks.'], ['alondra', 'A lamp in every window, and every one of them dark. They\'re afraid of lights here.']],
  },
  'arrive-misthollow': {
    lines: [['alondra', 'Bells, under the water. And under the bells, a song: one word, over and over. I can\'t make out the word.'], ['bryn', 'A whole city the fen swallowed. Mind your feet. Half these streets are roofs.']],
  },

  // ---- rests (RESTS) ---------------------------------------------------------------------------------
  'wards-night': {
    lines: [
      ['narrator', 'In the night the ward-stones hum, all of them together, a low sound like bees in a wall.'],
      ['moss', 'Hear that? Nothing is drinking them now. The willows are only willows tonight. Sleep.'],
    ],
    do: [{ set: 'wards-night' }],
  },
  'toll-lamp-night': {
    lines: [
      ['narrator', 'In the night Hodge sits down at your fire without asking, warms his hands, and says nothing for a long while.'],
      ['hodge', 'Fire\'s free. Always was. I only say it costs so nobody gets used to kindness.'],
      ['hodge', 'She sat at this fire three nights reading one letter, and never slept. Go to sleep, Warden. I\'ll watch the bridge.'],
    ],
    do: [{ set: 'hodge-fireside' }],
  },
  'bogmire-lamps': {
    lines: [
      ['narrator', 'That night every window in Bogmire has a lamp lit in it, for the first time since spring. Nobody walks into the fen.'],
      ['pell', 'Lark\'s asleep with his boots on. I haven\'t the heart to take them off. Thank you, {warden}. Go to sleep.'],
    ],
    do: [{ set: 'bogmire-lamps' }],
  },

  // ---- the fourth council (keep-hall trigger `council-4`, guarded by the flag it sets): the end of Act II ----
  // Mayor Gretch takes the Gloomfen's chair, and four soot-sealed boxes sit on the table unopened: Qasim's, Brundar's,
  // Gretch's and Miravel's. Every way out ends on the end-of-Act-II card ({ end: 'gloomfen' }), which opens nothing.
  'council-4': {
    lines: [
      ['narrator', 'Eight coals burn in the hearth, and for the first time in thirty years every chair at the long table is filled.'],
      ['isolde', 'Eight coals, {warden}. Sit. The Gloomfen sits with us tonight: Mayor Gretch of Bogmire.'],
      ['gretch', 'Bogmire\'s children are home in their beds. I owe this Keep a favour, and I always pay my favours. Eventually.'],
      ['gretch', 'And I brought this. It came the week the children started walking. Sealed in soot. I didn\'t open it. I\'m not a fool.'],
      ['narrator', 'She sets a small box on the table. Qasim sets his beside it, then Brundar. Then, after a long moment, Miravel.'],
      ['miravel', 'Eldergrove\'s came the night the eldest trees began to bleed. I told no one. I\'m telling you now.'],
      ['isolde', 'Four chairs, four boxes, one sender. Nobody opens anything. Not tonight.'],
    ],
    do: [{ set: 'council-4-done' }, { claim: 'gloomfen-waking' }],
    choices: [
      { text: 'Tell Isolde what Tamsin said.', next: 'council-4-tamsin' },
      { text: 'Let the Council talk.', do: [{ end: 'gloomfen' }] },
    ],
  },
  'council-4-tamsin': {
    lines: [
      ['narrator', 'You tell them about Rotbridge: the black barge, the tall man, the clasp, the bundle that bled violet-black.'],
      ['narrator', 'Then you tell Isolde what Tamsin said, word for word. The hall is very quiet.'],
      ['isolde', 'She was the better Warden. Faster, braver, and never once patient. I raised her; I would know.'],
      ['isolde', 'She wanted someone to tell her so. I never did. I thought there would be time.'],
      ['fenwick', 'Violet-black. I\'ve seen a relic bleed like that once. Long ago. Don\'t ask me how long.'],
      ['isolde', 'Then we bring her home, and whatever she\'s carrying. That\'s tomorrow\'s work. Tonight the Council rests.'],
    ],
    choices: [
      { text: 'Show them the Worldforge page.', if: { flag: 'worldforge-page' }, next: 'council-4-page' },
      { text: 'Let the Council talk.', do: [{ end: 'gloomfen' }] },
    ],
  },
  // the Dead Tongue's reward: the page from Corvus's chest
  'council-4-page': {
    lines: [
      ['narrator', 'You lay the page from the sealed chest on the table, among the four boxes. The ink is a First-Age hand.'],
      ['fenwick', 'The same hand. I knew him. I told you I knew him.'],
      ['hilda', 'Harrow took Ironhold\'s plans. He never had this page. He\'s been dredging a whole fen to find it.'],
      ['isolde', 'Then he still hasn\'t got it. Into the vault with it, {warden}, with the boxes. Sneck won\'t be getting this one.'],
    ],
    do: [{ end: 'gloomfen' }],
  },

  // ==== M7: the Hearth Below (spec §3.1, §3.5, §3.6, §4.7). STUB from the M7 scaffold, all of them: a line or two each, and the
  // effects the rest of the data reads (the flags, the gifts). P3 writes the real scenes (the Opening's title card and
  // the Act III card are P7's, spec §5); P1 adds the `ending` effect to the heart's choice (§4.7). ==========
  // ---- the fifth council, the Opening (keep-hall trigger `council-5`, guarded by the flag it sets): the boxes open
  // together, and the four go down to their chairs (their Ladder posters are scouted, spec §3.6) ----
  'council-5': {
    lines: [
      ['narrator', 'Eight coals, four chairs, four boxes. The Council opens them together, as the Unsmith\'s letter said.'],
      ['isolde', 'Something is wrong with them, {warden}. And there is a stair in the vault floor that was never there.'],
    ],
    do: [{ set: 'council-5-done' }, { scout: 'hollow-miravel' }, { scout: 'hollow-qasim' }, { scout: 'hollow-brundar' }, { scout: 'hollow-gretch' }],
  },
  // ---- the Hollow Council freed (spec §3.1): each one's line, back in their own town ----
  'freed-miravel': { lines: [['miravel', 'The wreath showed me every tree I ever let fall, and made me feel each one. I still do, Warden. Thank you.']] },
  'freed-qasim': { lines: [['qasim', 'The chalice was never full. It showed me every cup I sold that I should have given. I have stopped selling.']] },
  'freed-brundar': { lines: [['brundar', 'The gauntlet held on to everything for me. You made it let go. Ironhold will not forget that.']] },
  'freed-gretch': { lines: [['gretch', 'I told you I didn\'t open it. I lied. I always pay my favours, Warden, and I owe you a big one.']] },
  // ---- Fenwick's truth (his talk once the Hollow Council is freed): he gives the Warden his poker, No. 000 ----
  'fenwick-truth': {
    lines: [
      ['fenwick', 'The hearth never burned wood, {warden}. It burned the Sleepers\' warmth, and I kept it. Nine hundred years.'],
      ['fenwick', 'Take my poker. You\'ll need something to stir what comes next.'],
    ],
    do: [{ give: 'fenwicks-poker' }, { claim: 'fenwicks-truth' }],
  },
  // ---- Hilda's offer (spec §4.5): the Masterpiece, once the Council is freed and the Worldforge page is yours. A line
  // only: P7's Masterpiece tab and P1's forge do the rest ----
  'hilda-masterpiece': {
    lines: [['hilda', 'That page is my brother\'s hand. Bring me what I ask, and I\'ll forge you something Harrow never could.']],
    choices: FORGE,
  },
  // ---- Tamsin in the Chained Deep (spec A12): she joins for the one fight; after it she gives up her relic ----
  'tamsin-return': {
    lines: [['tamsin', 'I followed the barge to the bottom of the world. I saw what he\'s making. I\'m sorry. Let me stand with you.']],
    do: [{ set: 'tamsin-returned' }, { set: 'met-tamsin-below' }, { scout: 'unsmith' }],
  },
  'tamsin-after': {
    lines: [['tamsin', 'Take it. I bought it with the wrong thing. It\'s yours now. It was always going to be.']],
    do: [{ give: 'tamsins-bargain' }, { set: 'tamsin-gave' }],
  },
  // ---- the Worldforge's heart (spec §4.7): a stand-in; the choice comes later ----
  'the-heart': {
    lines: [['narrator', 'The heart of the Worldforge beats in its furnace. What it burns now is yours to choose, but not yet.']],
  },
});

export const ARRIVALS = deepFreeze({
  thornhollow: 'pip-thornhollow',
  eldergrove: 'bryn-eldergrove',
  fawnrest: 'alondra-fawnrest',
  // M4
  sandspire: 'arrive-sandspire',
  dusthaven: 'arrive-dusthaven',
  miragewell: 'arrive-miragewell',
  scorchgate: 'arrive-scorchgate',
  // M5 (spec §3.6): the Ironspire's four places
  'peaks-veil': 'arrive-peaks-veil',
  ironhold: 'arrive-ironhold',
  stormwatch: 'arrive-stormwatch',
  frostmere: 'arrive-frostmere',
  // M6 (spec §3.6): the Gloomfen's four places
  willowmurk: 'arrive-willowmurk',
  rotbridge: 'arrive-rotbridge',
  bogmire: 'arrive-bogmire',
  misthollow: 'arrive-misthollow',
});

// A first win plays its lines and sets a flag; a rematch (the region re-arms after its next Brand)
// gets a shorter line, so nothing is found or relieved twice.
export const AFTER = deepFreeze({
  'tamsin-duel': [{ on: 'victory', d: 'tamsin-after-win' }, { on: 'yield', d: 'tamsin-yield' }],
  'hollowed-patrol': [{ on: 'victory', d: 'corra-freed' }],
  'rotwarden-heart': [{ on: 'victory', if: { owns: 'ichor-mask' }, d: 'rotwarden-after' }],
  // M4
  'kharzul-heart': [
    { on: 'victory', if: { flag: 'kharzul-fell' }, d: 'kharzul-again' },
    { on: 'victory', if: { owns: 'cinderfang' }, d: 'kharzul-after-fang' },
    { on: 'victory', d: 'kharzul-after' },
  ],
  'ashen-warden': [
    { on: 'victory', if: { flag: 'warden-fell' }, d: 'warden-again' },
    { on: 'victory', d: 'warden-after' },
  ],
  'tamsin-scorchgate': [{ on: 'victory', d: 'tamsin-sg-win' }, { on: 'yield', d: 'tamsin-sg-yield' }],
  // the humming crate is found on the caravan (spec §3.3: a win sets crate-found)
  'gf-caravan': [{ on: 'victory', if: { not: { flag: 'crate-found' } }, d: 'caravan-crate' }],
  'dt-aqueduct': [{ on: 'victory', if: { not: { flag: 'cistern-told' } }, d: 'aqueduct-flows' }],
  'ds-crew': [{ on: 'victory', if: { all: [{ owns: 'sunstone-lantern' }, { not: { flag: 'luma-trusted' } }] }, d: 'brask-lantern' }],
  'wisp-queen': [{ on: 'victory', if: { not: { flag: 'well-told' } }, d: 'queen-quiet' }],
  // M5 (spec §3.5, §3.6): the Champions (the Rime-Abbot's lines lead into Hush's scene) and the duel
  'mother-anvil': [
    { on: 'victory', if: { flag: 'anvil-fell' }, d: 'anvil-again' },
    { on: 'victory', if: { owns: 'worldforge-hammer' }, d: 'anvil-after-hammer' },
    { on: 'victory', d: 'anvil-after' },
  ],
  'rime-abbot': [
    { on: 'victory', if: { flag: 'abbot-fell' }, d: 'abbot-again' },
    { on: 'victory', d: 'abbot-after' },
  ],
  'tamsin-ironhold': [{ on: 'victory', d: 'tamsin-ih-win' }, { on: 'yield', d: 'tamsin-ih-yield' }],
  // each points at its quest's giver, and plays only until that quest's last step is done
  'fm-shrine': [{ on: 'victory', if: { not: { flag: 'bell-rung-veil' } }, d: 'abbess-rest' }],
  'fr-cutters': [{ on: 'victory', if: { not: { flag: 'ledger-given' } }, d: 'cutters-ledger' }],
  'id-smith': [{ on: 'victory', if: { not: { flag: 'smith-told' } }, d: 'journeyman-rest' }],
  // M6 (spec §3.5, §3.6): the Champions (the Leviathan's lines lead into the Sleeper's scene), Hodge, and the duel,
  // whose lines lead into Tamsin's fall (once: she is gone after it)
  'lantern-mother': [
    { on: 'victory', if: { flag: 'mother-fell' }, d: 'mother-again' },
    { on: 'victory', if: { owns: 'lamplighters-lantern' }, d: 'mother-after-lantern' },
    { on: 'victory', d: 'mother-after' },
  ],
  'blackwater-leviathan': [
    { on: 'victory', if: { flag: 'leviathan-fell' }, d: 'leviathan-again' },
    { on: 'victory', if: { owns: 'corvus-harpoon' }, d: 'leviathan-after-harpoon' },
    { on: 'victory', d: 'leviathan-after' },
  ],
  hodge: [
    { on: 'victory', if: { owns: 'unfair-toll' }, d: 'hodge-sits-coin' },
    { on: 'victory', d: 'hodge-sits' },
    { on: 'defeat', if: { flag: 'knocked-by-hodge' }, d: 'hodge-knocked-again' },
    { on: 'defeat', d: 'hodge-knocked' },
  ],
  'tamsin-rotbridge': [
    { on: 'victory', if: { not: { flag: 'tamsin-fallen' } }, d: 'tamsin-rb-win' },
    { on: 'yield', if: { all: [{ not: { flag: 'tamsin-fallen' } }, { owns: 'bogstriders' }] }, d: 'tamsin-rb-yield-again' },
    { on: 'yield', if: { not: { flag: 'tamsin-fallen' } }, d: 'tamsin-rb-yield' },
  ],
  'wm-willow': [{ on: 'victory', if: { not: { flag: 'wards-mended' } }, d: 'willow-rest' }],
  'grue-hollow': [{ on: 'victory', if: { not: { flag: 'grue-told' } }, d: 'grue-rest' }],
  'mh-salvage': [{ on: 'victory', if: { not: { flag: 'chest-read' } }, d: 'salvage-chest' }],
  cantor: [{ on: 'victory', if: { not: { flag: 'cantor-fell' } }, d: 'cantor-rest' }],
  // M7 (spec A12): after the Unsmith, Tamsin gives up the relic she bought (STUB from the M7 scaffold: P3 writes it)
  unsmith: [{ on: 'victory', if: { not: { flag: 'tamsin-gave' } }, d: 'tamsin-after' }],
});

export const RESTS = deepFreeze([
  { at: 'fawnrest-stone', if: { all: [{ flag: 'bell-rung' }, { not: { flag: 'forewarned' } }] }, d: 'dream-four-sleepers' },
  // M4: each plays once (the scene sets the flag its guard reads)
  { at: 'spire-hearth', if: { all: [{ owns: 'zaras-orrery' }, { not: { flag: 'orrery-night' } }] }, d: 'orrery-night' },
  { at: 'pithead', if: { all: [{ flag: 'luma-trusted' }, { not: { flag: 'luma-fireside' } }] }, d: 'luma-fireside' },
  { at: 'last-watchfire', if: { all: [{ brand: 'brand-of-ash' }, { not: { flag: 'watch-ended' } }] }, d: 'last-watch' },
  // M5: the bell says goodnight at the Cloister Fire, once it has rung for the drowned
  { at: 'veil-hearth', if: { all: [{ flag: 'bell-rung-veil' }, { not: { flag: 'veil-night' } }] }, d: 'veil-night' },
  // M6: the ward-stones hum at the Willow Hearth; Hodge sits at your fire after Tamsin's fall; Bogmire lights its lamps
  { at: 'willow-hearth', if: { all: [{ flag: 'wards-mended' }, { not: { flag: 'wards-night' } }] }, d: 'wards-night' },
  { at: 'toll-lamp', if: { all: [FALLEN, { not: { flag: 'hodge-fireside' } }] }, d: 'toll-lamp-night' },
  { at: 'stilt-hearth', if: { all: [{ flag: 'children-home' }, { not: { flag: 'bogmire-lamps' } }] }, d: 'bogmire-lamps' },
]);

export const LOOKOUTS = deepFreeze({
  'th-lookout': { flag: 'longwatch:thornhollow', maps: ['thornhollow', 'hearth-road', 'thornway'] },
  'mw-lookout': { flag: 'longwatch:mossfall', maps: ['mossfall', 'mosswatch-1', 'mosswatch-2'] },
  // M4: the mesa edge at Sandspire (spec §2.3)
  'ss-lookout': { flag: 'longwatch:sandspire', maps: ['sandspire', 'sun-road', 'dust-trail', 'glass-flats'] },
  // M5: the lookout on Peak's Veil's wall (spec §2.3 "A lookout"; the entity id P2 places)
  'pv-lookout': { flag: 'longwatch:peaks-veil', maps: ['peaks-veil', 'rockslide-pass', 'highfold', 'iron-stair'] },
});

export const DIALOGUE_IDS = Object.freeze(Object.keys(DIALOGUE));
