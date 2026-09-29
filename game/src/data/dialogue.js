// Dialogue nodes (M3 spec §3.1, §4.4; M4 spec §3.1, §3.6). `{warden}` in a line is replaced with the
// player's name; every line is rendered with textContent. Lines are at most 140 characters.
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
//   {open: 'shop:<id>'|'forge'|'atlas'|'journal'|'ladder'|'bounties'} {letter: brandId} {end: 'act1'|'act2'}
//
// Also here (read by rules/story.js and rules/world.js):
//   ARRIVALS[mapId] = dialogueId   played once on the first entry to a map (the party's homecoming lines);
//                                  marked seen before it plays, so an arrival never changes the game
//   AFTER[encId] = [{ on: 'victory'|'yield', if?, d }]   played when you come back from that fight
//   RESTS = [{ at: hearthfireId, if?, d }]                played after resting at that Hearthfire
//   LOOKOUTS[entityId] = { flag, maps }                   Longwatch from a lookout marks these maps
// A `use` entity (bellframe, lookout) whose id is a DIALOGUE id opens that dialogue.
// Owner: WP3S (M3), P3 story (M4).

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
  'isolde-next': {
    lines: [
      ['isolde', 'Ironspire or Gloomfen: Harrow\'s smoke, or Bogmire\'s lost children. I won\'t choose for you.'],
      ['isolde', 'Both roads are still shut, {warden}. When they open, I want you first through them.'],
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
    lines: [['hilda', 'Harrow\'s up in the Ironspire. I can feel his forge in my teeth.'], ['hilda', 'When that road opens, bring me something of his. His hammer. Or his ear. I\'m not fussy.']],
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
      ['isolde', 'Then you\'ll tell me tonight, old man. {warden}: Ironspire or Gloomfen. Choose in the morning.'],
    ],
    do: [{ set: 'harrow-named' }, { end: 'act2' }],
  },

  // ---- M5: the Ironspire Peaks (spec §3.1, §3.6). STUBS from the M5 scaffold; P3 writes the real scenes ----
  wynn: {
    lines: [['wynn', 'Welcome to Peak\'s Veil, Warden. The bell has been quiet since Brother Aurel went down to the lake.'], ['wynn', 'The Highfold gate is open to you. The path goes down to Fawnrest.']],
    do: [{ set: 'met-wynn' }, { set: 'highfold-open' }],
    choices: [LEAVE],
  },
  'wynn-again': { lines: [['wynn', 'The bell will ring again. I have to believe that.']], choices: [LEAVE] },
  'wynn-bell': {
    lines: [['wynn', 'The Abbess is at rest? Then ring it, Warden. Ring it for all of them.'], ['narrator', 'The bell of Peak\'s Veil rings out over the ice.']],
    do: [{ set: 'met-wynn' }, { set: 'highfold-open' }, { set: 'bell-rung-veil' }, { claim: 'bell-of-veil' }],
    choices: [LEAVE],
  },
  kesh: { lines: [['kesh', 'Frostmere was a holy lake once. Now nobody walks on it.']], choices: [LEAVE] },
  novice: { lines: [['novice', 'Mother Wynn says nobody may ring the bell. Not even me.']], choices: [LEAVE] },
  brundar: {
    lines: [['brundar', 'A Warden of the Keep, in my hall. Say what you want, and say it quickly.']],
    do: [{ set: 'met-brundar' }],
    choices: [LEAVE],
  },
  'brundar-again': { lines: [['brundar', 'The Deeps stay sealed until I say otherwise.']], choices: [LEAVE] },
  'brundar-rune': {
    lines: [['brundar', 'You dealt with the girl on my stair. Take the Rune-Key. The Deeps are yours to walk.']],
    do: [{ set: 'met-brundar' }, { set: 'rune-given' }, { give: 'thanes-rune' }],
    choices: [LEAVE],
  },
  'brundar-smith': {
    lines: [['brundar', 'Harrow\'s journeyman, quiet at last. Take this for your trouble.']],
    do: [{ set: 'met-brundar' }, { set: 'smith-told' }, { claim: 'sentinel-oath' }],
    choices: [LEAVE],
  },
  durra: { lines: [['durra', 'Harrow\'s sister sent you? Then you get my honest prices. Look.']], choices: [{ text: 'Buy.', do: [{ open: 'shop:durra' }] }, LEAVE] },
  'ih-guard': { lines: [['ih-guard', 'Mind the Thane. He has not slept since the Deeps went dark.']], choices: [LEAVE] },
  rook: {
    lines: [['rook', 'I kept the Tallymen\'s books once. I can tell you what they cut out of that lake.']],
    do: [{ set: 'met-rook' }],
    choices: [LEAVE],
  },
  'rook-again': { lines: [['rook', 'Bring me the Cutter-Chief\'s ledger and I will read it to you.']], choices: [LEAVE] },
  'rook-ledger': {
    lines: [['rook', 'The Cutter-Chief\'s ledger. Give it here. Ice, by the ton, for a buyer with no name.']],
    do: [{ set: 'met-rook' }, { set: 'ledger-given' }, { claim: 'rooks-ledger' }],
    choices: [LEAVE],
  },
  ysolde: {
    lines: [['ysolde', 'Stormwatch holds the north road. What is left of it.']],
    choices: [
      { text: 'Turn in bounties.', if: { bounty: 'any', state: 'ready' }, do: [{ claim: 'bounties' }], next: 'ysolde-paid' },
      { text: 'Read the bounty board.', do: [{ open: 'bounties' }] },
      LEAVE,
    ],
  },
  'ysolde-paid': { lines: [['ysolde', 'Paid in Stormwatch silver. Try not to spend it all at Quill\'s.']], choices: [LEAVE] },
  quill: { lines: [['quill', 'Everything you need for the ice, at army prices.']], choices: [{ text: 'Buy.', do: [{ open: 'shop:quill' }] }, LEAVE] },
  'hilda-hammer': {
    lines: [['hilda', 'That\'s my brother\'s hammer. He never put it down in his life. Where is he?']],
    do: [{ set: 'hammer-shown' }, { claim: 'harrows-hammer' }],
    choices: [LEAVE],
  },
  'tamsin-ironhold': {
    lines: [['tamsin', 'You again. Harrow is mine to find, Warden. Out of my way, or through me.']],
    choices: [{ text: 'Through you, then.', do: [{ fight: 'tamsin-ironhold' }] }, LEAVE],
  },
  'tamsin-ironhold-yield': {
    lines: [['tamsin', 'Fine. Go down, then. He is not there anyway.']],
    do: [{ set: 'tamsin-yielded-3' }],
  },
  // the third council (keep-hall trigger `council-3`, guarded by the flag it sets)
  'council-3': {
    lines: [['isolde', 'Six coals, {warden}. The Council sits again, and this time the Thane of Ironhold sits with us.']],
    do: [{ set: 'council-3-done' }, { claim: 'ironspire-waking' }],
    choices: [LEAVE],
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
});

// A first win plays its lines and sets a flag; a rematch (the region re-arms after its next Brand)
// gets a shorter line, so nothing is found or relieved twice.
export const AFTER = deepFreeze({
  'tamsin-duel': [{ on: 'victory', d: 'tamsin-after-win' }, { on: 'yield', d: 'tamsin-yield' }],
  // M5 (a stub until P3 writes the scenes)
  'tamsin-ironhold': [{ on: 'yield', d: 'tamsin-ironhold-yield' }],
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
});

export const RESTS = deepFreeze([
  { at: 'fawnrest-stone', if: { all: [{ flag: 'bell-rung' }, { not: { flag: 'forewarned' } }] }, d: 'dream-four-sleepers' },
  // M4: each plays once (the scene sets the flag its guard reads)
  { at: 'spire-hearth', if: { all: [{ owns: 'zaras-orrery' }, { not: { flag: 'orrery-night' } }] }, d: 'orrery-night' },
  { at: 'pithead', if: { all: [{ flag: 'luma-trusted' }, { not: { flag: 'luma-fireside' } }] }, d: 'luma-fireside' },
  { at: 'last-watchfire', if: { all: [{ brand: 'brand-of-ash' }, { not: { flag: 'watch-ended' } }] }, d: 'last-watch' },
]);

export const LOOKOUTS = deepFreeze({
  'th-lookout': { flag: 'longwatch:thornhollow', maps: ['thornhollow', 'hearth-road', 'thornway'] },
  'mw-lookout': { flag: 'longwatch:mossfall', maps: ['mossfall', 'mosswatch-1', 'mosswatch-2'] },
  // M4: the mesa edge at Sandspire (spec §2.3)
  'ss-lookout': { flag: 'longwatch:sandspire', maps: ['sandspire', 'sun-road', 'dust-trail', 'glass-flats'] },
});

export const DIALOGUE_IDS = Object.freeze(Object.keys(DIALOGUE));
