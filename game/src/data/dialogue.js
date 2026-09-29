// Dialogue nodes (M3 spec §3.1, §4.4; M4 spec §3.1, §3.6; M5 spec §3.1, §3.5, §3.6). `{warden}` in a
// line is replaced with the player's name; every line is rendered with textContent. Lines are at most
// 140 characters.
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
//   {gems: {gemId: n}} {materials: {scrap?, silver?, embers?}} (M4)
//   {heal: true} {fight: encId} {claim: questId | 'bounties'}
//   {open: 'shop:<id>'|'forge'|'atlas'|'journal'|'ladder'|'bounties'} {letter: brandId}
//   {end: 'act1'|'act2'|'ironspire'}   the to-be-continued card ('ironspire': after the third council, M5)
//
// Also here (read by rules/story.js and rules/world.js):
//   ARRIVALS[mapId] = dialogueId   played once on the first entry to a map (the party's homecoming lines);
//                                  marked seen before it plays, so an arrival never changes the game
//   AFTER[encId] = [{ on: 'victory'|'yield', if?, d }]   played when you come back from that fight
//   RESTS = [{ at: hearthfireId, if?, d }]                played after resting at that Hearthfire
//   LOOKOUTS[entityId] = { flag, maps }                   Longwatch from a lookout marks these maps
// A `use` entity (bellframe, lookout) whose id is a DIALOGUE id opens that dialogue (M5: Peak's Veil's
// bell rope `pv-bell-rope` and lookout `pv-lookout`).
// Owner: WP3S (M3), P3 story (M4, M5).

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
      ['isolde', 'The east postern is open. The monks of Peak\'s Veil dug the pass out, and they know the road to Ironhold.'],
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
  'isolde-gloomfen': {
    lines: [
      ['isolde', 'Six coals. The Gloomfen is the last dark country on the map, and the Blackwater still has the causeway.'],
      ['isolde', 'When it falls, {warden}, that road is yours. Until then, eat something and sleep. That\'s an order.'],
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
  'wynn-frost': { lines: [['wynn', 'I rang for Aurel the night you came up. Thirty years late. He always said I\'d be late to my own funeral.']] },
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
  'notice-kesh-boots': { lines: [['kesh', 'Brother Oswin\'s boots. He crossed the slide in them without touching a stone. We never saw him again.']] },
  'notice-kesh-cowl': { lines: [['kesh', 'Take that hood off near the lake, {warden}. It was woven by someone listening, and it still is.']] },
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
  'notice-brundar-rune': { lines: [['brundar', 'My key on a Warden\'s hand. Wear it on the left; a Thane\'s ring goes on the left. You\'d make a poor dwarf.']] },
  'notice-brundar-hammer': { lines: [['brundar', 'Harrow\'s hammer. Don\'t swing it in my hall. The last time it was swung in here, a table died.']] },
  'notice-brundar-wall': { lines: [['brundar', 'Ironwall. My grandfather held the Black Gate behind it. The Sentinels were built to carry it after him.']] },
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
      ['tamsin', 'He won\'t be. Go and get your key from the Thane, Warden. I\'ve a letter to answer.'],
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
      ['isolde', 'When the Blackwater falls, {warden}, that road is yours. Tonight, eat something. That\'s an order.'],
    ],
    do: [{ end: 'ironspire' }],
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
});

export const RESTS = deepFreeze([
  { at: 'fawnrest-stone', if: { all: [{ flag: 'bell-rung' }, { not: { flag: 'forewarned' } }] }, d: 'dream-four-sleepers' },
  // M4: each plays once (the scene sets the flag its guard reads)
  { at: 'spire-hearth', if: { all: [{ owns: 'zaras-orrery' }, { not: { flag: 'orrery-night' } }] }, d: 'orrery-night' },
  { at: 'pithead', if: { all: [{ flag: 'luma-trusted' }, { not: { flag: 'luma-fireside' } }] }, d: 'luma-fireside' },
  { at: 'last-watchfire', if: { all: [{ brand: 'brand-of-ash' }, { not: { flag: 'watch-ended' } }] }, d: 'last-watch' },
  // M5: the bell says goodnight at the Cloister Fire, once it has rung for the drowned
  { at: 'veil-hearth', if: { all: [{ flag: 'bell-rung-veil' }, { not: { flag: 'veil-night' } }] }, d: 'veil-night' },
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
