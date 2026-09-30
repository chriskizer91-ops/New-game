// Thareia (T1): the Prologue's scenes, merged into data/dialogue.js DIALOGUE (format there). Lines are at most 140
// characters. Speakers: 'narrator', 'warden' (the hero), 'yara' (a hero while she flies with you) and TH_NPCS ids.
// The flags, in story order: th-arrived, th-saw-sedrin, th-read-notice, th-hired (Yara joins), th-crate-cracked (the
// bog lurkers), then pr-lurkers and pr-smugglers beaten, th-shard (the humming shard), th-landed (Thornhollow, Yara
// leaves, the Prologue's card).
// New effects (rules/story.js): { join: heroId } { leave: heroId } { cut: id } (a painted event, CUTS[id] when there is
// one) { note: text } (a toast). { open: 'sky:first-flight' } opens the flight (ui/screens/sky.js).
const LEAVE = { text: 'Leave.' };
const LURKERS_LEFT = { all: [{ flag: 'th-crate-cracked' }, { not: { beaten: 'pr-lurkers' } }] };
const THIEVES_LEFT = { all: [{ beaten: 'pr-lurkers' }, { not: { beaten: 'pr-smugglers' } }] };

export const TH_DIALOGUE = {
  // ---- the docks ----
  'th-intro': {
    lines: [
      ['narrator', 'Bogmire. Fog sits on the water like wet wool, and the water under it is warm. It should not be warm.'],
      ['narrator', 'You came up the fen on a peat barge with two silver coins, a borrowed coat and one paid passage north.'],
      ['narrator', 'The ticket says: BOGMIRE TO THORNHOLLOW, CAPTAIN Y. DUSTWIND, THE TOWER DOCK. The skiff is riding at its ropes just there.'],
      ['warden', 'Board now, or look for a day\'s work in town first. Every town has a job board.'],
    ],
    do: [{ set: 'th-arrived' }, { set: 'th-ticket' }, { note: 'You have a passage ticket: Bogmire to Thornhollow, on the skiff at the tower dock.' }],
  },
  'th-yara-first': {
    lines: [
      ['yara', 'If you are selling something, no. If you are asking for work, the board is in the town square, same as everywhere.'],
      ['narrator', 'She goes back to her ropes. Above her, the skiff\'s four sunstone crystals glow like lamps in the fog.'],
    ],
    do: [{ set: 'met-yara' }],
    choices: [{ text: 'Show her your ticket and board.', if: { all: [{ flag: 'th-ticket' }, { not: { flag: 'th-shard' } }] }, next: 'th-board-early' }, LEAVE],
  },
  'th-yara-again': {
    lines: [['yara', 'Board. Town square. Up the stair. I will be here, not hiring you.']],
    choices: [{ text: 'Show her your ticket and board.', if: { all: [{ flag: 'th-ticket' }, { not: { flag: 'th-shard' } }] }, next: 'th-board-early' }, LEAVE],
  },
  'th-yara-hire': {
    lines: [
      ['yara', 'You read my notice. Good. Can you lift, and can you keep your mouth shut about cargo?'],
    ],
    choices: [
      { text: 'I can lift.', next: 'th-yara-hired' },
      { text: 'What is the cargo?', next: 'th-yara-cargo' },
      LEAVE,
    ],
  },
  'th-yara-cargo': {
    lines: [
      ['yara', 'One crate of Aldric Fernshaw\'s "deep sunstone", bound for Thornhollow. Fernshaw pays well. Fernshaw does not say where it is dug.'],
      ['yara', 'You heat the crystal, the ship goes up. You stop heating it, it comes down. Everything else is wind and prayer.'],
    ],
    choices: [{ text: 'I can lift.', next: 'th-yara-hired' }, LEAVE],
  },
  'th-yara-hired': {
    lines: [
      ['yara', 'Two silver a day, and a flight to Thornhollow at the end of it. The crate by the tower goes in the hold.'],
      ['yara', 'Mind that crate. It is warm, and it hums. I do not like cargo that hums.'],
      ['narrator', 'Captain Yara Dustwind joins you. She fights with a shortbow, and she does not miss often.'],
    ],
    do: [{ set: 'th-hired' }, { join: 'yara' }],
  },
  'th-yara-deck': {
    lines: [['yara', 'The crate. By the tower. Into the hold, before the fog lifts and everyone in Bogmire sees what we are carrying.']],
    choices: [
      { text: 'Face what came up out of the water.', if: LURKERS_LEFT, do: [{ fight: 'pr-lurkers' }] },
      { text: 'Stop the crate-thieves.', if: THIEVES_LEFT, do: [{ fight: 'pr-smugglers' }] },
      LEAVE,
    ],
  },
  'th-crate': {
    lines: [
      ['narrator', 'An iron-banded crate stencilled FERNSHAW, THORNHOLLOW, with crates of salt fish round it. It is warm to the touch, and it hums.'],
    ],
    choices: [
      { text: 'Lift it into the skiff\'s hold.', if: { all: [{ flag: 'th-hired' }, { not: { flag: 'th-crate-cracked' } }] }, next: 'th-crate-cracks' },
      { text: 'Face what came up out of the water.', if: LURKERS_LEFT, do: [{ fight: 'pr-lurkers' }] },
      { text: 'Stop the crate-thieves.', if: THIEVES_LEFT, do: [{ fight: 'pr-smugglers' }] },
      LEAVE,
    ],
  },
  'th-crate-cracks': {
    lines: [
      ['narrator', 'You get the crate as far as the hold hatch. The hum climbs to a whine, and the seam splits with a crack like river ice.'],
      ['narrator', 'Gold light pours out. The planks smoke. Under the dock the black water steams, and something big turns over in it.'],
      ['yara', 'Off the edge! Back from the edge! Something is coming up!'],
    ],
    do: [{ set: 'th-crate-cracked' }, { cut: 'crate-cracks', text: 'The crate splits open in the hold, and sunstone light pours out.' }, { fight: 'pr-lurkers' }],
  },
  'th-after-lurkers': {
    lines: [
      ['yara', 'Boglurchers. On my dock, in daylight. The water is cooking them out of the mud.'],
      ['narrator', 'Two figures in kerchiefs come down the boardwalk at a run, pushing a handcart between them.'],
      ['th-skeet', 'That crate is spoken for, friends. Step off it and nobody gets wet.'],
      ['yara', 'Skeet Marrow. I should have known. Whoever is paying you, they are paying you too little.'],
      ['narrator', 'Yara presses a hot tonic into your hand. You drink it in one swallow, and the aches go quiet.'],
    ],
    do: [{ heal: true }, { fight: 'pr-smugglers' }],
  },
  'th-shard': {
    lines: [
      ['narrator', 'Skeet goes over the rail with a splash, and comes up a long way off, swimming hard for the reeds.'],
      ['narrator', 'In the wreck of the crate, among the gold crystal, one small shard lies apart. When you pick it up, it hums back at you.'],
      ['yara', 'Keep it. Fernshaw\'s crate is half ruined anyway, and I would rather not carry the half that sings.'],
      ['yara', 'Everything in that water is coming up warm and angry. We fly. Now. Get aboard.'],
    ],
    do: [{ set: 'th-shard' }, { note: 'You keep the humming shard. It is warm in your hand.' }, { item: { rarity: 'runed', slot: 'ring', ilvl: 2 } }],
  },
  'th-skiff': {
    lines: [
      ['narrator', 'Captain Dustwind\'s cargo skiff: a long hull under four great sunstone crystals, riding at its mooring ropes above the water.'],
    ],
    choices: [
      { text: 'Climb aboard and cast off.', if: { flag: 'th-shard' }, do: [{ open: 'sky:first-flight' }] },
      { text: 'Show your ticket and board.', if: { all: [{ flag: 'th-ticket' }, { not: { flag: 'th-shard' } }] }, next: 'th-board-early' },
      LEAVE,
    ],
  },
  // the ticket: board at once, and the crate splits in the hold as the skiff lifts (the Prologue's fights are skipped)
  'th-board-early': {
    lines: [
      ['yara', 'A paid fare. Good. The cargo can wait for the next run. I do not like the way Fernshaw\'s crate is humming anyway.'],
      ['narrator', 'The skiff lifts off its ropes. Down in the hold, the crate splits along one seam, and gold light spills out across the planks.'],
      ['narrator', 'A small shard rolls to your boots. When you pick it up, it hums back at you. You keep it.'],
    ],
    do: [{ set: 'th-shard' }, { set: 'th-early' }, { cut: 'crate-cracks', text: 'The crate splits in the hold as the skiff lifts.' }, { note: 'You keep the humming shard.' }, { open: 'sky:first-flight' }],
  },
  'th-fisher': {
    lines: [['th-fisher', 'The eels have gone deep, or gone. Water is too warm for them. Too warm for me, some nights. Never used to be.']],
  },
  'th-netmender': {
    lines: [['th-netmender', 'Nets come up hot. Hot! Forty years I have mended nets on this dock, and I never pulled a hot one before this spring.']],
  },

  // ---- the town ----
  'th-sedrin': {
    lines: [
      ['narrator', 'By the board, a young lizardfolk rider in bone-and-leather takes a sealed parcel from a tiny halfling woman.'],
      ['merryn', 'Rotbridge and back, Sedrin. And do not let that animal eat the wrapping this time.'],
      ['narrator', 'Behind the rider a giant crocodilian lies across half the square. One eye opens, finds you, and stays on you.'],
      ['narrator', 'The rider looks up. A long look; then a small nod, one stranger to another. Then the rider and the beast are gone.'],
    ],
    do: [{ set: 'th-saw-sedrin' }, { note: 'Crossing paths: Sedrin.' }],
  },
  'th-sedrin-talk': {
    lines: [['sedrin', 'Water. Warm. Is not right.'], ['narrator', 'Common comes slowly to the rider. The crocodilian hums, low, like a struck bell under water.']],
  },
  'th-merryn-busy': {
    lines: [['merryn', 'One moment, dear, I am just sending off a parcel.']],
  },
  'th-merryn': {
    lines: [
      ['merryn', 'You are new. Do not take the courier job, dear, I have just given it to someone who knows the water.'],
      ['merryn', 'My pennywort only grows where the water is warm, and the warm patches keep moving. Something is changing down there.'],
    ],
  },
  'th-board': {
    lines: [
      ['narrator', 'Notices, three deep. A lost goat. A reward for a stolen lamp. A warm-water survey, posted by the Cartographer\'s Guild.'],
      ['narrator', 'And pinned over them all: DECKHAND WANTED. One run to Thornhollow, today. Strong back, short memory. Y. DUSTWIND, THE TOWER DOCK.'],
    ],
    do: [{ set: 'th-read-notice' }],
  },
  'th-gretch': {
    lines: [['th-gretch', 'New face. Bogmire does not ask where you are from. Bogmire asks if you can pay. Can you?']],
  },
  'th-townsfolk': {
    lines: [['th-townsfolk', 'They say the water is rising from underneath. It cannot rise from underneath. Can it?']],
  },
  'th-watch': {
    lines: [['th-watch', 'The long boardwalk is shut. Orders. Something took a lamplighter off it last week, lamp and all.']],
  },

  // ---- Thornhollow ----
  'th-landing': {
    lines: [
      ['narrator', 'The skiff sets down in the clearing outside Thornhollow\'s south gate, in a storm of leaves.'],
      ['yara', 'Thornhollow. Fernshaw\'s shop is on the square. Tell him his crate sang, and watch what his face does.'],
      ['yara', 'Me, I have a hold to patch. Here, for the trouble. If you are ever at a dock with money in your pocket, I rent.'],
      ['narrator', 'Captain Yara Dustwind goes back to her skiff. The shard in your pocket hums, and it hums louder when you face the west road.'],
    ],
    do: [{ set: 'th-landed' }, { gold: 12 }, { leave: 'yara' }, { end: 'prologue' }],
  },
  'th-aldric': {
    lines: [
      ['aldric', 'My crate? Cracked? And you kept a piece of it. Of course you did.'],
      ['narrator', 'Aldric Fernshaw will not meet your eye. He goes on straightening a shelf that is already straight.'],
      ['aldric', 'I do not ask where it comes from, and they do not ask how I got it. Come back when I have thought about it.'],
    ],
  },
  'th-ranger': {
    lines: [['th-ranger', 'Rangers\' post. The trees along the west road are dying from the roots up, and nobody can tell us why.']],
  },
};

// fights played back (data/dialogue.js AFTER)
export const TH_AFTER = {
  'pr-lurkers': [{ on: 'victory', d: 'th-after-lurkers' }],
  'pr-smugglers': [{ on: 'victory', d: 'th-shard' }],
};
