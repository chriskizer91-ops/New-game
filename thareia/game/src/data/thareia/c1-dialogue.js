// Thareia (T2): Chapter 1's scenes (design/09-t2-spec.md 3.2), merged into data/dialogue.js. Owner: P.
// C1_DIALOGUE[id] = { lines: [[speaker, text]], do?, choices? } (format: data/dialogue.js, rules/story.js effects,
// including T2's { join, guest }, { key }, { kindle }, { go }); one comment line per node naming its purpose.
// C1_AFTER[encId] = [{ on: 'victory' | 'yield' | 'defeat', if?, d }] (merged into AFTER).
// C1_RESTS = [{ at: hearthfireId, if, d }] (merged into RESTS; the pulse plays after a rest at th-eg-hearth).
//
// Writing rules (spec 1): plain, short sentences; every line at most 140 characters; no line names the hero's gender or
// species; no old-game faction names; every night scene shows Auros; the day is never named. Both routes into the
// chapter work: a line about the dock fights or Yara's hire has a twin picked by { beaten: 'pr-smugglers' }.
// Speakers: 'narrator', 'warden' (the hero), 'taela' (an NPC, then a hero), and C1_NPCS / TH_NPCS ids.
// A side quest's last scene marks it claimed ({ claim }), so the Journal shows it Done, not Ready.
const LEAVE = { text: 'Leave.' };
const TAELA_HERE = { active: 'taela' };
// S8: cargo between the three hire posts (only one run at a time, from level 6)
const NO_CARGO = { not: { any: [{ flag: 'c1-cargo-thornhollow' }, { flag: 'c1-cargo-eldergrove' }, { flag: 'c1-cargo-mosswatch' }] } };
const DOCK_NAME = { thornhollow: 'Thornhollow', eldergrove: 'Eldergrove', mosswatch: 'Mosswatch' };

// one hire node per dock: the prepaid ticket, a paid flight, S8's cargo runs, and Leave
function hireNode(dock, speaker, line) {
  const others = Object.keys(DOCK_NAME).filter(d => d !== dock);
  const self = `c1-hire-${dock}`;
  return {
    lines: [[speaker, line], [speaker, 'Licensed docks only, and bring her back in one piece.']],
    choices: [
      { text: 'Use Aldric\'s prepaid flight.', if: { flag: 'c1-hire-ticket' }, do: [{ unset: 'c1-hire-ticket' }, { open: `sky:hire@${dock}` }] },
      { text: 'Hire a flight: 10 gp.', if: { not: { flag: 'c1-hire-ticket' } }, do: [{ pay: { gold: 10 } }, { open: `sky:hire@${dock}` }] },
      ...others.map(o => ({
        text: `Take a cargo run to ${DOCK_NAME[o]}.`, if: { all: [{ heroLevel: 6 }, NO_CARGO] }, next: self,
        do: [{ set: `c1-cargo-${o}` }, { set: 's8-open' }, { note: `Cargo for the hire post at ${DOCK_NAME[o]}. It pays 15 gp there.` }],
      })),
      {
        text: 'Hand over the cargo.', if: { flag: `c1-cargo-${dock}` }, next: self,
        do: [{ unset: `c1-cargo-${dock}` }, { gold: 15 }, { set: 's8-delivered' }, { claim: 'c1-s8' }],
      },
      LEAVE,
    ],
  };
}

export const C1_DIALOGUE = {
  // ---- beat 1: the landing and Aldric ----
  // two road-rats cut the straps on the half-ruined crate by the skiff
  'c1-crate-thieves': {
    lines: [
      ['narrator', 'Two thin figures crouch by the half-ruined crate at the edge of the platform. One saws at a strap with a knife.'],
      ['narrator', 'They see you and stand up. The one with the knife grins.'],
    ],
    do: [{ fight: 'c1-landing' }],
  },
  // after the road-rats: the crate is safe; Fernshaw's shop is on the square
  'c1-landing-after': {
    lines: [
      ['narrator', 'The road-rats run for the trees. The crate is still here. Its split seam hums, faintly.'],
      ['narrator', 'A painted board by the road reads: FERNSHAW\'S. Up the road, on the square.'],
    ],
  },
  // Aldric pays for the half that did not sing, asks for quiet, and gives the courier job to Eldergrove
  'c1-aldric-start': {
    lines: [
      ['narrator', 'Aldric Fernshaw is straightening a shelf. It was straight before you came in.'],
      ['aldric', 'My crate. Half of it came back whole. Here: ten for the half that did not sing.'],
      ['aldric', 'And I would like it kept quiet. Crates crack. It happens. Nobody needs to talk about it.'],
      ['aldric', 'Now. I owe Taela Greenmantle at Eldergrove a jar of lamp oil and a letter. Take them north on the Thornway?'],
      ['aldric', 'The rangers will open the north gate for my courier. Go on.'],
    ],
    do: [{ set: 'c1-aldric-met' }, { gold: 10 }, { set: 'c1-courier' }],
  },
  // Aldric waits for the courier to reach Eldergrove
  'c1-aldric-courier-wait': {
    lines: [['aldric', 'Eldergrove is up the Thornway. She is expecting oil, not company.']],
  },

  // ---- beat 2: Ranger Dael, the board, the hire post ----
  // Dael: the Rot is worse; the Mossfall road is shut by his order; the board; the druids need water-wise help
  'c1-dael': {
    lines: [
      ['th-ranger', 'You came up from the landing? Then you saw the trees by the road. Grey at the roots. That is the Rot.'],
      ['th-ranger', 'It is worse this year. The west road to Mossfall is shut, by my order. Nobody walks it until we know more.'],
      ['th-ranger', 'The board by the post has work, if you want it.'],
      ['th-ranger', 'And the druids at Eldergrove want anyone who knows about water under the ground. Odd request. Odd year.'],
    ],
    do: [{ set: 'c1-dael' }],
  },
  // Dael, again: the board has work; the west road stays shut
  'c1-dael-again': {
    lines: [['th-ranger', 'The board has work, if you want it. The west road stays shut.']],
  },
  // every hire post before Aldric vouches: no sponsor, no skiff
  'c1-hire-closed': {
    lines: [
      ['narrator', 'A painted sign on the post: DUSTWIND SKIFF HIRE. Licensed routes only. Docks only. No night flying.'],
      ['narrator', 'The Dustwind at the post looks you over. "My cousin Yara flies the long runs. We rent the short ones."'],
      ['narrator', '"But not to strangers. No sponsor, no skiff. Get a Thornhollow name to vouch for you."'],
    ],
    do: [{ set: 'c1-saw-hire' }],
  },
  // the rangers' notices: one choice per open job
  'c1-board': {
    lines: [['narrator', 'RANGERS\' NOTICES. Most are old and curling. A few are fresh.']],
    choices: [
      { text: 'Goblins at the edge of the wood.', next: 'c1-board-goblins' },
      { text: 'The bounty nobody can name.', if: { all: [{ flag: 'c1-node-cooled' }, { not: { flag: 's6-open' } }] }, do: [{ set: 's6-open' }], next: 'c1-board-bounty' },
      { text: 'Caravan to the Keep.', if: { flag: 'c1-done' }, next: 'c1-board-caravan' },
      LEAVE,
    ],
  },
  // the board's S7 hint: goblins on the Thornway
  'c1-board-goblins': {
    lines: [
      ['narrator', 'GOBLINS SEEN IN THE EAST CLEARING, THORNWAY. Stealing from traps. Drive them off.'],
      ['narrator', 'Under it, in a different hand: "They are starving. So are we. Think first."'],
    ],
  },
  // the board's S6: a bounty with no name on it, and a purse from strangers
  'c1-board-bounty': {
    lines: [
      ['narrator', 'A BOUNTY. A beast in the den on the Thornway cliff. The purse is large. The poster names no one who paid it.'],
      ['narrator', 'The den mouth is on the cliff at the north end of the Thornway.'],
    ],
  },
  // the board's S5 notice (T3): the caravan leaves when the Hearth Road opens
  'c1-board-caravan': {
    lines: [['narrator', 'CARAVAN GUARDS WANTED. Thornhollow to the Keep. Leaves when the Hearth Road opens.']],
  },
  // Thornhollow's lookout: a view over the Wilds
  'th-tt-lookout': {
    lines: [
      ['narrator', 'From the lookout the Wilds run green to the edge of sight. Here and there, a patch of trees has gone grey.'],
      ['narrator', 'The grey patches follow the low ground, where the water runs.'],
    ],
  },
  // Dunna Reeve's leather and bow stall
  'c1-outfitter': {
    lines: [['th-outfitter', 'Good leather lasts. Good tonics last longer. What do you need?']],
    do: [{ open: 'shop:th-outfitter' }],
  },
  // Col Ashby's general goods
  'c1-trader': {
    lines: [['th-trader', 'Tonics, salts, bitterroot. Fair prices, and I do not haggle.']],
    do: [{ open: 'shop:th-trader' }],
  },

  // ---- beat 3: the Thornway ----
  // the Rot smell at the Thornway's mouth; the shard hums; the first fight
  'c1-tw-enter': {
    lines: [
      ['narrator', 'Past the gate the road smells of wet rot. The shard in your pocket hums, low and steady.'],
      ['narrator', 'Something moves in the brambles. Then two things. They are coming out.'],
    ],
    do: [{ fight: 'c1-verdant-edge' }],
  },
  // the grey trees whisper when the wind drops
  'c1-tw-whisper': {
    lines: [
      ['narrator', 'The wind drops. The grey trees keep talking.'],
      ['narrator', 'It is not words. It is a dry, soft sound, like pages turning. It stops when you step closer.'],
    ],
    do: [{ set: 'c1-whisper' }],
  },
  // the bandit in the bramble wore ranger boots
  'c1-tw-boots': {
    lines: [
      ['narrator', 'The bandit wore ranger boots. Good ones, with the rangers\' stitching.'],
      ['narrator', 'Rangers do not sell their boots. Ranger Dael should hear about this.'],
    ],
    do: [{ set: 's2-lead' }],
  },

  // ---- beat 4: Eldergrove and Taela ----
  // grey roots weeping black sap; the courier drop pays
  'c1-eg-arrive': {
    lines: [
      ['narrator', 'Eldergrove. Great trees, older than any town. Their roots are grey, and black sap weeps out of the cracks.'],
      ['narrator', 'At the gate a druid takes Aldric\'s oil and counts out twelve coins for the courier. The letter is for Taela.'],
      ['narrator', 'She is up by the Eldest Tree, they say. Cutting root.'],
    ],
    do: [{ set: 'c1-thornway' }, { gold: 12 }],
  },
  // Taela reads the letter, laughs once, explains the Rot, and asks for the shard near the roots
  'c1-taela-first': {
    lines: [
      ['narrator', 'A druid in a moss-green mantle is sawing at a dead root. Her hands are stained dark to the elbow.'],
      ['taela', 'Aldric\'s courier. Give it here.'],
      ['narrator', 'She reads the letter. It is short. She turns it over. There is nothing on the back. She laughs, once.'],
      ['taela', 'Three lines to say nothing. That is Aldric.'],
      ['taela', 'The Rot is not a sickness. It follows the water table. It kills from the roots up.'],
      ['taela', 'What is that in your pocket? It is humming. Hold it near the roots. Go on.'],
    ],
    do: [{ set: 'c1-met-taela' }],
  },
  // Taela waits for the shard to touch the roots
  'c1-taela-roots': {
    lines: [['taela', 'Hold it near the roots. Go on.']],
  },
  // the shard blazes over the grey roots; Taela comes along as a guest; torches at the stone circle
  'c1-shard-glows': {
    lines: [
      ['narrator', 'The shard blazes in your hand. Thin gold threads run down into the grey roots, and fade.'],
      ['taela', 'Do that again.'],
      ['narrator', 'It will not. The shard goes back to a hum.'],
      ['taela', 'I am coming with you. Until I understand that stone.'],
      ['taela', 'Look. Torches at the stone circle. The burners are here. They will set fire to the oldest roots.'],
    ],
    do: [{ cut: 'shard-glows', text: 'The shard blazes, and gold threads run down into the roots.' }, { set: 'c1-shard-roots' },
      { join: 'taela', guest: true }, { set: 'c1-taela-guest' }],
  },
  // Linnet, the sick acolyte: the burners came at dawn
  'c1-acolyte': {
    lines: [
      ['th-acolyte', 'The burners came at dawn. Oda leads them. They say fire cleans it.'],
      ['th-acolyte', 'Fire only moves it.'],
    ],
  },
  // Elder Miravel: the oldest seeds in the vault rot first, from the inside
  'c1-miravel': {
    lines: [
      ['th-miravel', 'I keep the seed vault. The oldest seeds rot first. From the inside, with the husk still whole.'],
      ['th-miravel', 'Whatever this is, it came up from below. Not in on the wind.'],
    ],
  },
  // Moss-Hand Tolly's druid supplies
  'c1-supplier': {
    lines: [['th-eg-supplier', 'Herbs, tonics, stones from the brook. No metal. The grove does not make it.']],
    do: [{ open: 'shop:th-eldergrove' }],
  },
  // Oda at the stone circle: "You cut. We burn."
  'c1-grove-circle-before': {
    lines: [
      ['th-burner', 'Greenmantle. Still cutting root? It does not work. You cut. We burn.'],
      ['taela', 'Put the torches down, Oda. These trees are older than your whole family.'],
      ['th-burner', 'Then they have lived long enough.'],
    ],
    do: [{ fight: 'c1-grove-circle' }],
  },
  // after the stone circle: Oda runs for the Hindwood; the Eldest door can open
  'c1-grove-circle-after': {
    lines: [
      ['narrator', 'Oda drops her torch and runs east, toward the Hindwood. Her burners go with her.'],
      ['taela', 'She will be back. Come. The door under the Eldest Tree. What is killing the roots is down there.'],
    ],
    do: [{ set: 'c1-circle-saved' }],
  },

  // ---- beat 5: under the Eldest Tree ----
  // the descent: the shard warms; Taela sings the black sap back from the path
  'c1-hr-descent': {
    lines: [
      ['narrator', 'The stair goes down between roots as thick as houses. The shard is warm in your hand.'],
      ['taela', 'Black sap. It pools down here and it bites. Stand back.'],
      ['narrator', 'She sings, low and even. The black sap draws back from the path, slow as cold honey.'],
    ],
    do: [{ unlock: 'th-hr-ichor-a' }, { unlock: 'th-hr-ichor-b' }],
  },
  // a cold coal under the roots; Taela can light it
  'c1-hr-coal': {
    lines: [['narrator', 'A ring of stones round a cold coal. Someone kept a fire here once, under the roots.']],
    choices: [{ text: 'Ask Taela to light it.', if: TAELA_HERE, do: [{ kindle: 'th-hr-coal' }] }, LEAVE],
  },
  // the ichor lake is warm from below
  'c1-hr-hot-lake': {
    lines: [
      ['narrator', 'The black pool steams. Heat comes up through it from below.'],
      ['taela', 'It is not the tree.'],
    ],
  },
  // the deepest spring runs warm
  'c1-warm-water': {
    lines: [
      ['narrator', 'At the bottom of the roots a spring wells up. You put a hand in it. It is warm.'],
      ['taela', 'Nothing this deep should be warm. Not ever.'],
      ['taela', 'Back to the grove. I need to sleep, and I need to think.'],
    ],
    do: [{ set: 'c1-warm-water' }],
  },

  // ---- beat 6: the pulse (a rest at Eldergrove's hearth) ----
  // night at the hearth, Auros overhead; every root glows gold for one breath
  'c1-pulse': {
    lines: [
      ['narrator', 'Night at the grove. Auros hangs huge and bright over the trees. The fire is low.'],
      ['narrator', 'The shard jolts in your pocket. Then every root in Eldergrove glows gold, all at once, for one breath.'],
      ['narrator', 'Then it is dark again.'],
      ['taela', 'The grove just heard something. So did your stone.'],
    ],
    do: [{ cut: 'grove-pulse', text: 'Every root in the grove glows gold for one breath.' }, { note: 'Far away, something woke. The grove answered.' },
      { set: 'c1-pulse' }],
  },

  // ---- beat 7: Aldric's maps, the skiff, the west road ----
  // told of the warm water, Aldric admits the map, vouches at the hire post and pays one flight
  'c1-aldric-maps': {
    lines: [
      ['warden', 'Under the Eldest Tree, the deepest spring runs warm.'],
      ['narrator', 'Aldric puts down the cloth he was holding. For a moment he says nothing.'],
      ['aldric', 'My buyers asked for a map. Of where the crystal hums loudest. I thought it was for digging.'],
      ['aldric', 'I will vouch for you at the hire post. The deposit is paid, and one flight.'],
      ['aldric', 'Go and look at the coast for me.'],
    ],
    do: [{ set: 'c1-aldric-maps' }, { set: 'c1-skiff-rented' }, { set: 'c1-hire-ticket' },
      { note: 'Aldric paid your first skiff flight. Show the ticket at any hire post.' }],
  },
  // Aldric waits for news from the coast
  'c1-aldric-waiting': {
    lines: [['aldric', 'Go and look at the coast. Then come back and tell me I am wrong.']],
  },
  // Dael opens the Mossfall road on Aldric's news
  'c1-dael-west': {
    lines: [
      ['th-ranger', 'Fernshaw came to see me. Warm water under the Eldest Tree. He looked like he had not slept.'],
      ['th-ranger', 'The west road is open. Mossfall, then Mosswatch Tower. Old Garret keeps the tower. Tell him I sent you.'],
    ],
    do: [{ set: 'c1-west-open' }],
  },
  // Hob Dustwind's hire post at the Thornhollow landing
  'c1-hire-thornhollow': hireNode('thornhollow', 'th-hire-landing', 'Fernshaw vouched for you. Where to?'),
  // Nell Dustwind's hire post at Eldergrove
  'c1-hire-eldergrove': hireNode('eldergrove', 'th-hire-eg', 'Fernshaw\'s flyer. The skiff is ready.'),
  // Tam Dustwind's hire post at Mosswatch
  'c1-hire-mosswatch': hireNode('mosswatch', 'th-hire-mw', 'Mind the sea wind up here. Where to?'),

  // ---- beat 8: Mossfall and Mosswatch Tower ----
  // Mossfall: marsh water warm in autumn, moss grey at the roots
  'c1-mf-arrive': {
    lines: [
      ['narrator', 'Mossfall. The marsh water is warm, and it is autumn. The moss on the trees is grey at the roots.'],
    ],
  },
  // the lagoon is warmer than the marsh
  'c1-mf-islet': {
    lines: [['narrator', 'The lagoon is warmer than the marsh. Small bubbles rise from the mud and pop.']],
  },
  // Garret shouting from the kitchen
  'c1-mw-arrive': {
    lines: [
      ['narrator', 'The tower door is open. Someone is shouting in the kitchen.'],
      ['th-garret', 'I can hear you! Come in and shut that door, the wind is getting in my soup!'],
    ],
  },
  // Garret: crates went up his stair, and lights burn in his lamp room he did not light
  'c1-garret-first': {
    lines: [
      ['th-garret', 'Dael sent you? Good. Crates went up my stair last night. Not mine.'],
      ['th-garret', 'And there are lights in my lamp room. I did not light them. Somebody is signalling out to sea.'],
      ['th-garret', 'I am too old for the stair and too angry to wait. Go up.'],
    ],
    do: [{ set: 'c1-mw-arrived' }],
  },
  // Garret waits for the stair to be cleared
  'c1-garret-wait': {
    lines: [['th-garret', 'Up the stair. Mind the crates. Mind whoever is minding them.']],
  },
  // a runner on the stair: "Wrong tower, friend."
  'c1-mw-stair-before': {
    lines: [
      ['narrator', 'A runner sits on a crate halfway up the stair. Two more stand behind.'],
      ['th-lamp-runner', 'Wrong tower, friend.'],
    ],
    do: [{ fight: 'c1-mw-stair' }],
  },
  // the Lamp Room: the Lantern's light through the parapet gap, a back turned
  'c1-mw2-arrive': {
    lines: [
      ['narrator', 'The Lamp Room. Light pours out through the gap in the parapet, in long and short flashes.'],
      ['narrator', 'Someone stands at the lamp with their back to you, working the shutter.'],
    ],
  },
  // Hollis Fairweight signalling out to sea
  'c1-mw-lantern-before': {
    lines: [
      ['th-hollis', 'Long, short, long. Almost done. Wait your turn.'],
      ['narrator', 'The signalman turns. Out on the dark water, a lamp answers.'],
      ['th-hollis', 'Ah. You are not who I was waiting for.'],
    ],
    do: [{ fight: 'c1-mw-lantern' }],
  },
  // the Rot map and the tide logs: the line bends to Fawnrest; Garret's ledger key; the Hindwood road
  'c1-rot-line': {
    lines: [
      ['narrator', 'Garret climbs up at last, puffing. He spreads the rangers\' Rot map on the table.'],
      ['th-garret', 'Here is the Rot line. Every year it moves. This year it bends inland. Look where it points.'],
      ['th-garret', 'Fawnrest. And my tide logs say the ground water here is warm. It never was.'],
      ['th-garret', 'Boats come and go at night now, with no lamps. That signalman was talking to them.'],
      ['th-garret', 'And the pilgrims stopped coming to Fawnrest. The pool runs hot enough to scald, they say.'],
      ['th-garret', 'Take my ledger-room key. Whatever they left in there, you have earned a look.'],
    ],
    do: [{ set: 'c1-mosswatch' }, { set: 'c1-rot-line' }, { set: 'c1-to-fawnrest' }, { set: 's1-open' }],
  },
  // Garret points the way to Fawnrest
  'c1-garret-after': {
    lines: [['th-garret', 'Fawnrest. Through the Hindwood. The keeper there is a friend.']],
  },
  // the fjord coast from the tower lookout at dusk, Auros overhead
  'th-mw-lookout': {
    lines: [
      ['narrator', 'Dusk comes over the fjords while you watch. Auros rises, pale and huge, over the sea.'],
      ['narrator', 'Down on the dark water, low lamps move between the cliffs. Nobody hangs a lamp that low without a reason.'],
    ],
  },

  // ---- beats 10-11: the Hindwood and Fawnrest ----
  // black-sap trees; a Rot-twisted hound watches and runs
  'c1-hw-roots': {
    lines: [
      ['narrator', 'The Hindwood trees weep black sap. A hound watches you from the ferns. Its back is bent wrong.'],
      ['narrator', 'It runs.'],
    ],
  },
  // the shard warms at the stream; the roots are black along the water
  'c1-hw-ford': {
    lines: [['narrator', 'The shard warms as you reach the stream. Along the water every root is black.']],
  },
  // Oda's camp: talk them down with Taela, or fight
  'c1-burners': {
    lines: [
      ['narrator', 'Oda\'s camp. Torches, pitch pots, a dozen tired faces. Oda stands up.'],
      ['th-burner', 'Greenmantle. Come to cut some more?'],
      ['taela', 'Come to tell you it is not in the trees. It is in the water. Under them. Your fire cannot reach it.'],
    ],
    choices: [
      { text: 'Let Taela talk.', if: TAELA_HERE, do: [{ set: 's3-talked' }, { set: 'c1-hindwood' }], next: 'c1-burners-talked' },
      { text: 'Fight.', do: [{ fight: 'c1-feral-druid' }] },
    ],
  },
  // Taela talks the burners down; some go to help at Fawnrest
  'c1-burners-talked': {
    lines: [
      ['taela', 'The pool at Fawnrest scalds. The water is hot from below. Come and see it, Oda. Then burn what you like.'],
      ['narrator', 'Oda looks at Taela for a long time. Then she throws her torch in the stream.'],
      ['th-burner', 'Fine. Some of mine will go to the pilgrims\' fire. If you are wrong, we come back with the pitch.'],
    ],
  },
  // after the burners' fight: the camp scatters
  'c1-burners-after': {
    lines: [['narrator', 'The burners scatter into the Hindwood. Their camp smoulders. The road north is clear.']],
    do: [{ set: 'c1-hindwood' }],
  },
  // Fawnrest: the shard warms; no deer; steam off the pool
  'c1-fr-arrive': {
    lines: [
      ['narrator', 'Fawnrest. The shard warms in your hand. There should be white deer here. There are none.'],
      ['narrator', 'Steam rises off the pilgrims\' pool.'],
    ],
  },
  // Keeper Maren: the deer are gone; no mason in Aethermoor cut these stones; they are warm
  'c1-keeper': {
    lines: [
      ['th-keeper', 'Garret sent you? Then welcome. I am Maren. I keep the shrine.'],
      ['th-keeper', 'The white deer are gone. The pool scalds. The pilgrims who came to be healed are sick.'],
      ['th-keeper', 'Look at the stones. No mason in Aethermoor cut these. Nobody knows who did.'],
      ['th-keeper', 'And they are warm under my broom. Every one of them.'],
    ],
    do: [{ set: 'c1-fawnrest' }],
  },
  // the keeper, again: walk the court with the shard
  'c1-keeper-again': {
    lines: [['th-keeper', 'The court. Walk it with that stone of yours.']],
  },
  // a sick pilgrim: came to be healed; the pool scalded
  'c1-pilgrim': {
    lines: [['th-pilgrim', 'I came to be healed. The pool scalded me. Now I cannot walk home.']],
  },
  // the shard drags the hero's hand to the court; a stair under the paving, opened recently
  'c1-stair': {
    lines: [
      ['narrator', 'The shard pulls your hand down, hard, toward the paving. The stones here are hot.'],
      ['narrator', 'One slab has been lifted and put back. The dirt round it is fresh. Under it, a stair goes down.'],
      ['th-keeper', 'I did not open that. I did not know it was there.'],
      ['taela', 'Someone did, and not long ago.'],
      ['taela', 'I tied a rope on the cliff between the Hindwood and Eldergrove on the way. That is our short way home.'],
    ],
    do: [{ set: 'c1-stair-found' }],
  },

  // ---- beats 12-14: the node ----
  // the water down here is hot; Taela goes quiet
  'c1-fn-hot': {
    lines: [
      ['narrator', 'The water on the stair is hot. Steam curls up past you.'],
      ['narrator', 'Taela stops talking.'],
    ],
  },
  // the hall: fitted floors, straight channels, veins that all run one way; something in the channels
  'c1-fn-hall': {
    lines: [
      ['narrator', 'A hall. The floor stones fit with no gap. Two channels run the length of it, too straight, too even.'],
      ['narrator', 'Gold veins run in the stone. Every one of them runs the same way, deeper in.'],
      ['taela', 'Nobody I know built this. Something is moving in the channels.'],
    ],
    do: [{ fight: 'c1-node-hall' }],
  },
  // the node white-hot; a lens clamped to it, stamped with a small mark
  'c1-node-found': {
    lines: [
      ['narrator', 'The veins meet at a round dais. On it sits a crystal as tall as a door, glowing white-hot.'],
      ['narrator', 'A silver ring is clamped to its side. It holds a clear lens. A small cold glint, stamped with a small mark.'],
      ['taela', 'That does not belong on it. Somebody put it there.'],
    ],
    do: [{ cut: 'node-overheats', text: 'The node glows white-hot.' }, { set: 'c1-node-found' }, { set: 'c1-lens-seen' }],
  },
  // the Hart of Fawnrest wakes
  'c1-guardian-wakes': {
    lines: [
      ['narrator', 'Something lies curled before the dais. It stands. A stag, grown through with root and hot crystal.'],
      ['th-keeper', 'It was white once. The pilgrims followed it here to be healed.'],
    ],
    do: [{ cut: 'guardian-wakes', text: 'The Hart of Fawnrest wakes.' }, { fight: 'c1-guardian' }],
  },
  // the hart goes out; the lens comes off; Taela sings the roots cool, joins for good, names Fen Rootwalker
  'c1-node-cools': {
    lines: [
      ['narrator', 'The hart curls up on the stones. It goes out in a silent amber flare, and leaves only crystals.'],
      ['narrator', 'You pry the lens off the node. The white glow drops to a steady gold.'],
      ['narrator', 'Taela kneels and sings to the roots. The steam thins. The stones cool under your hands.'],
      ['taela', 'I am staying with you. Someone should tell the Keep.'],
      ['taela', 'Fen Rootwalker, at the Keep. He has listened to the Hearth for forty years. He will know what this is.'],
    ],
    do: [{ set: 'c1-hart-beaten' }, { cut: 'node-cools', text: 'The node cools to a steady gold.' }, { join: 'taela' },
      { set: 'c1-taela-joined' }, { set: 'c1-node-cooled' }, { key: 'th-lens' }, { set: 'c1-lens' }, { set: 's9-open' },
      { unlock: 'th-mf-islet-ford' }],
  },
  // the pilgrim, after the node: the pool cools; the pilgrim can stand
  'c1-pilgrim-better': {
    lines: [['th-pilgrim', 'The pool is only warm now. Look. I can stand.']],
  },
  // Vesper sells "miracle sap" to the sick pilgrims
  'c1-vesper': {
    lines: [
      ['th-vesper', 'Miracle sap! One drop, and the fever breaks. Two silver a jar, for the faithful.'],
      ['narrator', 'The jars hold black sap from the sick trees, with honey stirred in.'],
    ],
    choices: [
      { text: 'Tell the pilgrims what it is.', check: { ability: 'CHA', dc: 13, name: 'Persuasion', pass: 'c1-vesper-leaves', fail: 'c1-vesper-fights' } },
      { text: 'Fight.', do: [{ fight: 'c1-vesper' }] },
      LEAVE,
    ],
  },
  // the pilgrims believe you; Vesper's men leave
  'c1-vesper-leaves': {
    lines: [
      ['narrator', 'The pilgrims put the jars down. One pours hers out on the grass. It smokes.'],
      ['th-vesper', 'Fine. There are other shrines.'],
    ],
    do: [{ set: 'c1-vesper-gone' }],
  },
  // the pilgrims do not listen; Vesper sets his men on you
  'c1-vesper-fights': {
    lines: [['th-vesper', 'You are bad for trade. Boys.']],
    do: [{ fight: 'c1-vesper' }],
  },

  // ---- beat 15: the lens, the letter, the end of the chapter ----
  // Aldric sees the mark, goes white, and hands over one letter with the same seal
  'c1-aldric-lens': {
    lines: [
      ['narrator', 'You put the lens on Aldric\'s counter. He sees the mark, and goes white.'],
      ['aldric', 'I know that mark. It is on the seal of my buyers\' letters.'],
      ['narrator', 'He unlocks a drawer and takes out one letter. No name. The seal is the same small mark.'],
      ['aldric', 'They pay in Sandspire silver. Always on time. Take it. I do not want it in my shop.'],
    ],
    do: [{ key: 'th-buyers-letter' }, { set: 'c1-aldric-letter' }],
  },
  // Aldric, afterwards: who are they?
  'c1-aldric-after': {
    lines: [['aldric', 'I sell stone. I do not ask. I am asking now. Who are they?']],
  },
  // Dael, while the lens is shown to Aldric first
  'c1-dael-wait': {
    lines: [['th-ranger', 'Aldric wants you. He looked sick.']],
  },
  // Dael: the Rot on the west road has stopped spreading; the chapter ends
  'c1-dael-end': {
    lines: [
      ['th-ranger', 'My rangers walked the west road. The grey has stopped. It is not going away. But it has stopped.'],
      ['th-ranger', 'Whatever you did down there, it worked. Thornhollow owes you.'],
    ],
    do: [{ set: 'c1-done' }, { end: 'chapter-1' }],
  },
  // Dael, after the chapter
  'c1-dael-after': {
    lines: [['th-ranger', 'The west road is quiet. Go on, when you are ready.']],
  },
  // the scholar before the warm water
  'c1-scholar-busy': {
    lines: [['th-scholar', 'Not now. I am measuring.']],
  },

  // ---- S1: Lanterns Hung Low (Garret, Wenna, the cove) ----
  // Wenna poles you to the cove at dusk, Auros rising
  'c1-wenna': {
    lines: [
      ['th-wenna', 'Garret says you want to see where the low lamps go. I know the cove. I run the fjords.'],
      ['narrator', 'At dusk she poles her boat out under the cliffs. Auros comes up over the water, pale and huge.'],
    ],
    do: [{ set: 's1-fjords-night' }, { go: { map: 'th-fjords-cove', anchor: 'from-boat' } }],
  },
  // the cove at night, Auros overhead, lamps hung low; keep clear of the inlet
  'c1-cove-arrive': {
    lines: [
      ['narrator', 'Night in the cove. Auros hangs overhead. Lamps are hung low on the cliff path, down to a dock.'],
      ['th-wenna', 'I wait here. Keep clear of the inlet by the rowing boats. Things live in it.'],
    ],
  },
  // Skeet at the cove dock: the twin is picked by whether the hero met Skeet on the Bogmire docks
  'c1-cove-skeet': {
    lines: [['narrator', 'On the dock by the cave mouth, under Auros\'s light, a figure in a kerchief is counting crates.']],
    choices: [
      { text: 'Step onto the dock.', if: { beaten: 'pr-smugglers' }, next: 'c1-cove-skeet-again' },
      { text: 'Step onto the dock.', if: { not: { beaten: 'pr-smugglers' } }, next: 'c1-cove-skeet-new' },
    ],
  },
  // Skeet knows the hero from the Bogmire docks
  'c1-cove-skeet-again': {
    lines: [
      ['th-skeet', 'You again. Bogmire was not enough for you?'],
      ['th-skeet', 'This time I have my whole crew, and no crate to guard. Get them.'],
    ],
    do: [{ fight: 'c1-fjord-cove' }],
  },
  // Skeet meets the hero for the first time
  'c1-cove-skeet-new': {
    lines: [
      ['th-skeet', 'Who let you down here? Nobody comes down here.'],
      ['th-skeet', 'Skeet Marrow. Remember it, for the swim home. Get them.'],
    ],
    do: [{ fight: 'c1-fjord-cove' }],
  },
  // after the cove: Skeet dives and swims for it
  'c1-cove-skeet-after': {
    lines: [
      ['narrator', 'Skeet goes off the end of the dock in a long dive, and swims hard for the dark.'],
      ['narrator', 'The cave mouth is open. Crates, and a box of papers.'],
    ],
    do: [{ set: 's1-skeet-beaten' }],
  },
  // Wenna, back at the tower with the receipts
  'c1-wenna-home': {
    lines: [
      ['narrator', 'Wenna poles you home. The tower lamp is lit again. Auros is low over the sea.'],
      ['th-wenna', 'Receipts in Sandspire silver, and a wax mark like a little lens. Show Garret. He will want to swear.'],
    ],
    do: [{ set: 's1-done' }],
  },
  // Wenna, after S1
  'c1-wenna-after': {
    lines: [['th-wenna', 'The low lamps are gone from the cove. Fishers are taking the fjords back.']],
  },
  // Garret thanks you for the cove
  'c1-garret-thanks': {
    lines: [
      ['th-garret', 'Receipts. With a mark. Sandspire silver, to run crates past my tower.'],
      ['th-garret', 'Here. It is my savings, and you have earned it.'],
    ],
    do: [{ set: 's1-open' }, { set: 's1-paid' }, { gold: 150 }, { claim: 'c1-s1' }],
  },

  // ---- S2: The Missing Patrol (Dael) ----
  // Dael hears about the ranger boots and asks you to find the patrol
  'c1-dael-patrol': {
    lines: [
      ['warden', 'A bandit on the Thornway wore ranger boots.'],
      ['th-ranger', 'Those are Edda Vane\'s boots. Her patrol went under the Eldest Tree to look at the roots. They never came back.'],
      ['th-ranger', 'If you go down there, look for them. Please.'],
    ],
    do: [{ set: 's2-open' }],
  },
  // two rangers alive; Taela heals them; the third was hollowed
  'c1-sick-rangers': {
    lines: [
      ['th-sick-ranger', 'Water. Please. The sergeant went wrong first. Grey in the eyes. Then she turned on us.'],
      ['narrator', 'Taela kneels by the two of them and draws the Rot out of their wounds.'],
      ['taela', 'They will walk. The third is past helping. I am sorry.'],
    ],
    do: [{ set: 's2-healed' }],
  },
  // Dael thanks you: ranger gear, and the stockade opens
  'c1-dael-patrol-done': {
    lines: [
      ['th-ranger', 'Ilse and Cade came home. Edda did not. You did what you could.'],
      ['th-ranger', 'Take this hood. It was hers. And the stockade by the south wall is yours to open.'],
    ],
    do: [{ set: 's2-open' }, { set: 's2-done' }, { give: 'thornwatch-hood' }, { claim: 'c1-s2' }],
  },

  // ---- S3: The Burners (Taela) ----
  // a burner at the pilgrims' fire gives a salve
  'c1-burner-at-fawnrest': {
    lines: [
      ['th-burner-fr', 'Oda sent some of us to help. The druid was right. It is the water.'],
      ['th-burner-fr', 'We make a salve for burns. Take some.'],
    ],
    choices: [{ text: 'Take the salve.', if: { not: { flag: 's3-done' } }, do: [{ bag: { bitterroot: 2 } }, { set: 's3-done' }, { claim: 'c1-s3' }] }, LEAVE],
  },

  // ---- S4: Stop Measuring (Illeth Sarovan) ----
  // after the warm spring: the scholar wants three warm-water samples
  'c1-scholar-offer': {
    lines: [
      ['th-scholar', 'You went under the Eldest Tree? Was the water warm? I knew it.'],
      ['th-scholar', 'I need three samples. The deep spring, the lagoon shore at Mossfall, and the pool at Fawnrest.'],
    ],
    do: [{ set: 's4-open' }],
  },
  // the scholar waits for the samples
  'c1-scholar-wait': {
    lines: [['th-scholar', 'The spring, the shore, the pool. Three samples. I will be here, measuring.']],
  },
  // a sample from the warm spring under the Eldest Tree
  'c1-sample-spring': {
    lines: [['narrator', 'You fill one of Illeth\'s little bottles at the spring. It is warm through the glass.']],
    do: [{ set: 's4-spring' }],
  },
  // a sample from the Mossfall lagoon shore
  'c1-sample-coast': {
    lines: [['narrator', 'You fill a bottle at the lagoon shore. The water is warmer than the air.']],
    do: [{ set: 's4-coast' }],
  },
  // a sample from the Fawnrest pool
  'c1-sample-pool': {
    lines: [['narrator', 'You dip a bottle in the pool on a string. It comes up too hot to hold.']],
    do: [{ set: 's4-pool' }],
  },
  // Luminara's reply to the scholar: "Stop measuring."
  'c1-scholar-done': {
    lines: [
      ['th-scholar', 'All three. Thank you. I sent my first numbers to a colleague in Luminara. The reply just came.'],
      ['th-scholar', 'Two words. "Stop measuring." Nothing else. So of course I will not.'],
    ],
    do: [{ set: 's4-open' }, { set: 's4-done' }, { gold: 80 }, { claim: 'c1-s4' }],
  },
  // the scholar, after S4
  'c1-scholar-after': {
    lines: [['th-scholar', 'I measure every morning now. The numbers go up. Slowly. But up.']],
  },

  // ---- S6: The Bounty Nobody Can Name (the board, the cliff den) ----
  // the den mouth on the Thornway cliff
  'c1-den-enter': {
    lines: [
      ['narrator', 'The den stinks of old meat and wet rot. Something huge breathes in the dark.'],
      ['taela', 'The Rot has it. Whatever it was, it is in pain.'],
    ],
    do: [{ set: 's6-den' }],
  },
  // black warm water in the den
  'c1-den-pool': {
    lines: [['narrator', 'A pool of black water in the den floor. It is warm, like the spring under the Eldest Tree.']],
  },
  // after the beast: the purse came from Aldric's buyers; hand over its relic, or keep it
  'c1-bounty-relic': {
    lines: [
      ['narrator', 'The beast is down. Tangled in its hide is a wreath of thorn and old gold.'],
      ['narrator', 'A note is tied to the bounty purse at the den mouth: "Bring the wreath. Paid in Sandspire silver." A small mark.'],
      ['taela', 'The same mark as the lens. They wanted the wreath, not the beast.'],
    ],
    choices: [
      { text: 'Hand it over for the purse.', do: [{ gold: 200 }, { set: 's6-sold' }, { set: 's6-done' }, { claim: 'c1-s6' }] },
      { text: 'Keep it.', do: [{ set: 's6-kept' }, { set: 's6-done' }, { claim: 'c1-s6' }] },
    ],
  },

  // ---- S7: At the Edge of the Wood (Snib) ----
  // Snib: the Rot kills their forage; the town blames them
  'c1-goblin': {
    lines: [
      ['th-goblin', 'Not stealing! Not stealing. The roots are grey. Nothing to dig. Nothing to eat.'],
      ['th-goblin', 'Town says goblins make the Rot. Goblins do not make it. Goblins are hungry.'],
    ],
    do: [{ set: 's7-open' }],
    choices: [
      { text: 'Share your rations.', do: [{ pay: { gold: 5 } }, { set: 's7-helped' }], next: 'c1-goblin-after' },
      { text: 'Tell them to go.', do: [{ set: 's7-chased' }, { set: 's7-done' }, { claim: 'c1-s7' }], next: 'c1-goblin-gone' },
    ],
  },
  // Snib's goblins go, hungry
  'c1-goblin-gone': {
    lines: [['narrator', 'Snib looks at you for a long moment. Then the goblins pick up their sacks and go into the trees.']],
  },
  // Snib, after S7: a bundle of clean herbs for the one who helped
  'c1-goblin-after': {
    lines: [['th-goblin', 'Clean herbs. From high up, where the roots are still green. For you.']],
    do: [{ set: 's7-done' }],
    choices: [{ text: 'Take the herbs.', if: { all: [{ flag: 's7-helped' }, { not: { flag: 's7-herbs' } }] }, do: [{ bag: { 'hearth-tonic': 2 } }, { set: 's7-herbs' }, { claim: 'c1-s7' }] }, LEAVE],
  },

  // ---- S9: The White Deer Come Home (Keeper Maren) ----
  // Maren: two white deer were seen in the Hindwood; lead them home
  'c1-keeper-deer': {
    lines: [
      ['th-keeper', 'The pool is cooling. Thank you.'],
      ['th-keeper', 'Two white deer were seen in the Hindwood. They are scared. Can you lead them home?'],
    ],
  },
  // the first white deer, in the northwest glade
  'c1-deer-1': {
    lines: [['narrator', 'A white deer, thin and wary. It watches you. When you turn toward Fawnrest, it follows.']],
    do: [{ set: 's9-deer-1' }],
  },
  // the second white deer, on the south bank
  'c1-deer-2': {
    lines: [['narrator', 'A second white deer steps out of the ferns. It falls in behind you, toward Fawnrest.']],
    do: [{ set: 's9-deer-2' }],
  },
  // the deer are home; Maren's thanks
  'c1-keeper-home': {
    lines: [
      ['th-keeper', 'They came back. Both of them. Look at them drink.'],
      ['th-keeper', 'Take this. The shrine has little to give, but it gives it gladly.'],
    ],
    do: [{ set: 's9-open' }, { set: 's9-done' }, { gold: 60 }, { bag: { 'hearth-tonic': 2 } }, { claim: 'c1-s9' }],
  },
  // Maren, after S9
  'c1-keeper-after': {
    lines: [['th-keeper', 'The deer sleep by the stone again. The pilgrims will come back. Thank you.']],
  },
};

// fights played back (data/dialogue.js AFTER); each plays once
export const C1_AFTER = {
  'c1-landing': [{ on: 'victory', d: 'c1-landing-after' }],
  'c1-grove-circle': [{ on: 'victory', if: { not: { flag: 'c1-circle-saved' } }, d: 'c1-grove-circle-after' }],
  'c1-feral-druid': [{ on: 'victory', if: { not: { flag: 'c1-hindwood' } }, d: 'c1-burners-after' }],
  'c1-node-roots': [{ on: 'victory', if: { not: { flag: 'c1-node-found' } }, d: 'c1-node-found' }],
  'c1-guardian': [{ on: 'victory', if: { not: { flag: 'c1-node-cooled' } }, d: 'c1-node-cools' }],
  'c1-fjord-cove': [{ on: 'victory', if: { not: { flag: 's1-skeet-beaten' } }, d: 'c1-cove-skeet-after' }],
  'c1-dael-bounty': [{ on: 'victory', if: { not: { flag: 's6-done' } }, d: 'c1-bounty-relic' }],
};

// after a rest (data/dialogue.js RESTS): the pulse, the first rest at Eldergrove's hearth after the warm spring
export const C1_RESTS = [
  { at: 'th-eg-hearth', if: { all: [{ flag: 'c1-warm-water' }, { not: { flag: 'c1-pulse' } }] }, d: 'c1-pulse' },
];
