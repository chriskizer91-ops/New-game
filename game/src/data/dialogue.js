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
//   {heal: true} {fight: encId} {claim: questId} {open: 'shop:<id>'|'forge'|'atlas'|'journal'|'ladder'}
//   {letter: brandId} {end: 'act1'}
// Owner: WP3S.

import { deepFreeze } from '../core/freeze.js';

const LEAVE = { text: 'Leave.' };

export const DIALOGUE = deepFreeze({
  // ---- story beats --------------------------------------------------------------------------
  'keep-intro': {
    lines: [['fenwick', 'The vault! Warden, the Seal!'], ['narrator', 'Something small and ink-stained glints at the vault door, and bolts.']],
    do: [{ set: 'intro-done' }],
  },
  council: {
    lines: [['isolde', 'Two coals, {warden}. The Council sits tonight, and for once they will listen.'], ['fenwick', 'It is humming again. Louder.']],
    do: [{ set: 'council-done' }, { end: 'act1' }],
  },
  'boots-clue': {
    lines: [['pip', 'Bootprints. Thornwatch issue, going north. Nobody walks like that on purpose.']],
    do: [{ set: 'saw-boots' }],
  },
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
  isolde: { lines: [['isolde', 'The Seal first. A Keep that can\'t close its own vault can\'t ask anyone for anything.']] },
  'isolde-commission': {
    lines: [['isolde', 'If Tamsin\'s taken something that isn\'t hers, bring her back. If she\'s taken something that is, bring it back anyway.']],
  },
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
    choices: [{ text: 'Temper something.', do: [{ open: 'forge' }] }, LEAVE],
  },
  'hilda-mask': {
    lines: [['hilda', 'A hammer in a broken ring. I\'ve seen that mark once, on my brother\'s anvil. Put it away before I do something stupid.']],
    choices: [{ text: 'Temper something.', do: [{ open: 'forge' }] }, LEAVE],
  },

  // ---- Thornhollow ----------------------------------------------------------------------------
  dael: {
    lines: [['dael', 'Thirty names on the Thornwatch roll when I took it. Nine now.'], ['dael', 'My board can\'t put a name to it. Bring me a name. Or a head.']],
    do: [{ set: 'met-dael' }],
  },
  'dael-brand': {
    lines: [['dael', 'Briarmaw. So it had a name after all. Here, the Keep\'s bounty, every coin of it.']],
    do: [{ gold: 300 }, { set: 'paid-briarmaw' }],
  },
  'dael-home': { lines: [['dael', 'Three went out. Three came home. I\'ll take it.']] },
  nell: {
    lines: [['nell', 'No credit. The last lad I gave credit to is on the board.']],
    choices: [{ text: 'Buy.', do: [{ open: 'shop:nell' }] }, LEAVE],
  },
  corra: { lines: [['corra', 'I remembered my own name halfway through a sentence. Pip had to finish it.']] },

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
    lines: [['garret', 'The fire\'s lit. I saw it from the kitchen and I cried into the porridge. Don\'t tell anyone.']],
    do: [{ set: 'garret-told' }],
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
  pilgrim: {
    lines: [['pilgrim', 'Vesper\'s sap cured my cough.'], ['alondra', 'And gave you a new one.']],
    do: [{ set: 'met-pilgrim' }],
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
});

export const DIALOGUE_IDS = Object.freeze(Object.keys(DIALOGUE));
