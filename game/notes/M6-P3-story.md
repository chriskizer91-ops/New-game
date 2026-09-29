# M6 P3 story: the Gloomfen's people, quests and scenes

Package P3 of `docs/M6-SPEC.md` (§3.1, §3.5's scenes, §3.6, §3.7's shops, §2.4's dialogue lines). No git is run.
Files I edit: `src/data/npcs.js`, `src/data/dialogue.js`, `src/data/quests.js`, `src/data/ladder.js` (comments only
so far), `src/data/letters.js`, `src/data/shops.js`, `test/story.test.mjs`, `test/story-data.test.mjs`.
`src/data/maps/keep-hall.js` is unchanged: the scaffold's `council-4` trigger has the spec's guard (a test pins it).
Private build folder: `scratchpad/m6-builds/p3` (the build, `ui-check.mjs`, `rows.mjs`, `mutate.py`, `shots/`).

**Status: done**, but for one item that waits on the lead's rules: the rumour "the man on the barge" needs
`ladder()` to skip an entry whose `if` fails (see "Needs from others"; the entry and its tests are written out
there, ready to paste). Every "STUBS from the M6 scaffold" marker in my files is gone.

## What I built

**People (§3.1).** Each has a talk table in the givers' order (the thank-you first, which sets the met flag too;
then the first meeting while the met flag is unset; then story beats, "the world notices" Page IV, the lines that
repeat). Everyone always answers, and each of the nine notices at least one Page IV relic (all fourteen are noticed
by somebody, the Keep's people included).
- **Elder Moss** (Willowmurk): riddles, every one true. The first meeting: three ward-stones went dark in one night,
  "Stones don't die. They're drunk": Grandfather Willow's roots are drinking the ring. His three riddles (the lights,
  the bridge, the bells) are a standing choice list (`MOSS`). The thank-you of the Failing Wards (`moss-wards`) gives
  the last of Willowmurk's three Willow-Wards; `moss-chest` reads the Tallymen's chest (Dead Tongue step 2). He
  changes with the wards, the Brand of Lanterns and the Brand of the Deep. "The fen talks through reeds" sets up
  his voice in Lull's scene.
- **Sedge** (herb-seller, `shop:sedge`) and the **villager**: the wards, the Blackwater's fall; Sedge envies Nettie's
  knots.
- **Hodge** (Rotbridge; P2's NPC `rb-hodge`): see "Hodge's toll" below.
- **Mayor Gretch** (Bogmire): fear and favours; the main quest's `met-gretch`; the Bogmire board (`GRETCH`: "Turn in
  bounties." / "Read the bounty board."); "Ask about soot-sealed letters." (`gretch-box`: "For Bogmire's chair.",
  unopened); the children home: the town's thanks once, 150 gold ("Some of it's buttons"), also a first meeting; her
  summons once the Gloomfen is won; after the council.
- **Nettie the Swamp Witch** (`shop:nettie`): Mother Grue taught her everything, "including when to leave"; the east
  quarter is hexed, and "a hex holds while its maker holds her stone". The thank-you (`nettie-grue`) claims her
  remedy (the Hexbane Shawl, 1 bog amber). A companion hint only (`nettie-someday`: "I'm not saying yes. I'm saying
  ask.").
- **Widow Pell**: her boy **Lark** followed a light nine nights ago; once home he asks for "the lamp-lady" ("Tell her
  it is true." -> she leaves a lamp in her window). **The Stilt-Watch**: lamps kept dark ("Lights bring the walking"),
  then lit; the causeway dry.
- **Corvus** (Misthollow): he dove for the Tallymen, brought up their chest, and put his harpoon into "something big";
  the Salvage-Master cut his line. Two thank-yous, each also a first meeting: the harpoon, known on sight (300 gold, 2
  silver), and the chest read by Moss (he breaks the seal: one page in a First-Age hand; 250 gold, 1 bog amber, and
  `worldforge-page`, the chest's secret). "You've got the chest!" points to Moss while it is unread.
- **The Lantern Mother** joins `NPCS` for her name only (like the Rime-Abbot): she speaks after her fight.

**Hodge's toll (A11, §4.4).** Every line of his (the first meeting `hodge`, the day's openers, `hodge-paid`,
`hodge-stool`, the notices, `hodge-heavier`, and `hodge-toll`, which is also his encounter's `talk`) carries one
choice list, `TOLL`: "Pay today's toll." (day % 3 = 1: 120 gold; 2: 1 silver; 0: 2 Hearth Tonics; shown only while
the bar is down; sets `toll-paid`, for good), "Play his toll game: best of three." (Persuasion = Influence DC 17,
Deception = raw CHA DC 16, Intimidation = Influence with STR DC 18; two of three; once a day; only for a coin you do not
own; winning gives the Unfair Toll and lifts the bar), "Refuse, and make him move." (bar down) or "Shift him off his
stool." (bar up) = `{ fight: 'hodge' }` while he is unbeaten, and Leave. His openers name the day's price in his
words (gold; forge silver "for a tooth"; tonics "for my chest"). After the fight (AFTER `hodge`): he sits down on his
stool and says so (with a line for his coin on your chain); after a loss (`on: 'defeat'`): you wake with a page of his
toll-book in your collar ("Refused toll. Did not move me."), then a shorter line. The DCs give P4's 200 Ironspire-end
sim parties 58% a day (min 58, max 68); a level-20 test party in the browser saw 43%.

**Tamsin at Rotbridge (§3.5, A12).** `tamsin-rotbridge` (the duel's talk): a month following his letters; "He wrote
back... He says he'll show me what a Warden is for." "Try again." / "Not yet.". AFTER (each once, while
`tamsin-fallen` is unset): the win (`tamsin-rb-win`: she steps out of the Bogstriders and leaves them) and the yield
(`tamsin-rb-yield`: sets `tamsin-yielded-4`, and she leaves the boots too: `{ give: 'bogstriders' }`, see "Needs from
others") each have one choice, "Look downstream.", into **her fall**: `tamsin-fall` (sets `tamsin-fallen`): the black
barge out of the fog; a tall man in a boatman's cloak, a smith's leather apron under it, a hammer in a broken ring on
his clasp; a sackcloth bundle that bleeds violet-black; Bryn: "That mark." One choice, "Tamsin. Don't.", into
`tamsin-traded`: she hands down the relic she took from the Keep the night the hearth burned blue; "Tell Isolde I was
the better Warden. Tell her I had to prove it somewhere."; the fog closes; Hodge: "She paid her toll. Heavier than
yours." The man never speaks and nobody names him. Afterwards Hodge (`hodge-heavier`, once; it also sets
`tamsin-fallen`, should the scene have been cut short) and his fire at night (`toll-lamp-night`).

**The Champions.** The Lantern Mother (`mother-after-lantern` if you pried her lantern loose, else `mother-after`,
where it breaks): her veil falls; "Are they safe? I was taking them home..."; the children wake in the lamplight and
come to you, Lark among them; the boardwalk's lights go out; sets `children-home` (and `mother-fell` for the
rematch line). The Blackwater Leviathan (`leviathan-after-harpoon` / `leviathan-after`): the collar's lock is
stamped with the broken ring; it sinks back into the deep and the Blackwater with it; the causeway will be dry by
morning; a song stops. One choice, "Listen.", into **the Sleeper's scene**: `lull-moss` (met Moss: his voice in the
reeds names **Lull**) or `lull` (the narrator names it); Alondra: "Three, then. Hush under the ice, the one under the
ash, and Lull. I dreamed of four." Then the Unsmith's letter.

**The leads.** Grandfather Willow (`willow-rest`), Mother Grue (`grue-rest`) and the salvage camp's chest
(`salvage-chest`) point at their quest's giver and play only until that step is done; the Drowned Cantor
(`cantor-rest`, once): the city sings on without him, tired.

**The fourth council (§3.6, A13)** (`council-4`; sets `council-4-done`, claims `gloomfen-waking`): eight coals, every
chair filled; Mayor Gretch takes the Gloomfen's chair and sets down her box; Qasim, Brundar and, after a long moment,
Miravel set theirs beside it (hers came "the night the eldest trees began to bleed"); "Four chairs, four boxes, one
sender. Nobody opens anything." "Tell Isolde what Tamsin said." (`council-4-tamsin`: Isolde raised her, per the
prologue: "She was the better Warden... I thought there would be time."; Fenwick has seen a relic bleed violet-black
once) -> "Show them the Worldforge page." (with `worldforge-page`: Fenwick knows the hand; Hilda: Harrow never had
this page; into the vault) or "Let the Council talk."; every path ends on `{ end: 'gloomfen' }` and opens nothing.

**The Keep (§2.4).** `isolde-gloomfen` now: "Willowmurk's elders have sent a reed-token... They've summoned an
outsider for the first time in decades... The fen stair below Mossfall is open to you now." (once; never after
Rotbridge or the fourth council, so a Warden who skipped it never hears a stale send-off). The third council's last
line is retold ("And Willowmurk has sent for you, {warden}: the fen stair below Mossfall."). The south-west gate
guard: shut; "go round by Mossfall's fen stair" after the third council; the causeway dry after the Brand of the
Deep. Isolde after Rotbridge will hear it only at the Council table; after the council, the boxes are in the vault and
warm. Fenwick's seventh and eighth coals ("It's listening"); Hilda hears of the clasp once (`hilda-barge`); Miravel's
shame about her box. Notices: Isolde (the Bogstriders), Fenwick (the Lantern), Hilda (the Barge-Chain Gauntlets,
Corvus's Harpoon).

**Quests (§3.6)**, the spec's ids, givers, starts, steps and rewards; texts short enough for the HUD's one line.
`gloomfen-waking`: the third council; Moss; Hodge's bar (target `rb-hodge`); Tamsin; Gretch; the Brand of Lanterns;
Corvus; the Brand of the Deep; the fourth council (every step between the councils also closes with a Brand).
`failing-wards`, `nettie-remedy`, `corvus-harpoon` ("whole": a shattered harpoon waits for Hilda's reforge),
`dead-tongue` (its reward also sets `worldforge-page`). **Bounties**: the scaffold's four, turned in to Gretch.
**Letters**: "Seven. You carried the fen's children home, little Warden. I only needed the one, and she came to me on
her own. — U." / "Eight. Every coal lit, and the fen has stopped singing. I sent your Council four gifts. Tell them to
open them together. — U." **Shops**: Nettie (the consumables; bog amber, moss agate, glass pearl), Sedge (the
consumables, Bitterroot first). **Arrivals**: Willowmurk, Rotbridge, Bogmire (every lamp dark: they fear lights),
Misthollow (a song, one word). **Rests** (once each): `wards-night` (Willow Hearth), `toll-lamp-night` (Toll-Lamp),
`bogmire-lamps` (Stilt Hearth: every window lit; Pell).

**Voice.** 92 new nodes (and 4 retold), 171 new lines, mean 94 characters, max 117. Measured in the phone box (a
196 px text column at 360 px): every new line takes at most five rows, as the earlier ones do (I trimmed the three
that took six).

### New story flags (all set in my data; nothing added to `RULE_FLAGS`)
- Met: `met-moss`, `met-hodge`, `met-gretch`, `met-nettie`, `met-corvus`.
- Steps and gates (the spec's): `wards-mended`, `grue-told`, `harpoon-shown`, `chest-read`, `chest-told`, `toll-paid`,
  `tamsin-yielded-4` (the rules set it too), `tamsin-fallen`, `children-home`, `council-4-done`; the reward flag
  `worldforge-page`.
- Once-only: `hodge-tried` (a day), `hodge-heavier`, `knocked-by-hodge`, `gretch-thanked`, `heard-barge`, `mother-fell`,
  `leviathan-fell`, `cantor-fell`, `wards-night`, `hodge-fireside`, `bogmire-lamps`.
- Read by P2's maps: `wards-mended` (the ward-stones), `toll-paid` (the bar), `tamsin-fallen` (the barge).

## Tests (mine)
- `test/story-data.test.mjs` 20 -> 27. The AFTER check now admits `on: 'defeat'` (the UI passes a loss as
  'defeat'), and gains two asserts: 'defeat' never on a duel, 'yield' only on one. New: the Gloomfen's people (always
  answer, met before they notice, each notices Page IV, all 14 noticed, each giver's first meeting sets its met flag,
  the shops and gems, Gretch's board, no recruitment); the quests (ids, givers, starts, steps, rewards, the Brand rule,
  the spec's flags set); Hodge's toll (one choice list on every line and on his encounter's talk, three prices over
  three days while the bar is down, the game's checks and guards, the fight never after he is beaten, his lines
  after a win, a loss, and after Tamsin); the beats (arrivals, Tamsin's talk, AFTER once each into the fall, the fall's
  every detail and both exact lines, the man never speaks, the Bogstriders never lost, the Champions, children-home,
  Lull by Moss or the narrator, Alondra's three, the leads, the rests); the fourth council (exact guard, never `once`,
  the claim, Gretch, the four boxes by name, Tamsin, `{ end: 'gloomfen' }` on every path, opens nothing); the Keep
  (the reed-token, the fen stair, the retold council, the south-west guard); the letters count seven and eight.
- `test/story.test.mjs` 25 -> 33, walked through the rules: Hodge's toll (each day's opener and price, paid once for
  good, the game lost and won from seeded rolls, once a day, no second coin, the fight, beaten, his AFTERs, the
  encounter's talk); Tamsin (the duel, win and yield into the fall, the boots, Hodge once, his fire once, Isolde, Hilda
  after her brother's letter); the Failing Wards, Nettie's Remedy, Corvus's two quests (each happy path, out of order,
  and "a claim needs every step"); the main quest step by step, straight down, the fourth council through `enterMap`,
  both paths and the page, replay until done, both councils in order; the Champions, the children home, Bogmire's
  lines, Lull, the rematches, the Ladder; Gretch's bounties, the shops, eleven notices.
- **Mutation check** (`scratchpad/m6-builds/p3/mutate.py`): 18 mutations of my data, one at a time, each file restored
  byte for byte (sha256 checked): **18 of 18 caught** (Tamsin's talk without its fight, a thank-you without its met
  flag, a notice before a first meeting, a council path without its card, an arrival with an effect, the council-4
  trigger `once`, a price with the bar up, the toll game every time, the boots lost on a yield, a fall that never
  marks her fallen, Lull unnamed, an uncounted letter, Gretch without her board, the children never home, Isolde's
  stale send-off, the chest's secret never given, the fight after he is beaten, Tamsin misquoted).

## Results (22:52)
- My two files and the lead's `toll.test.mjs` (and P2's `walk.test.mjs`, which pays Hodge through my dialogue): 77/77.
- `npm test`, the whole tree with everyone's work in progress (22:52): **461/463**; the 2 failures are
  `art-keys.test.mjs` (foe art keys and backdrops: P6's art, mid-work).
- `npm run lint`: 0 errors; 7 warnings, all in `src/art/foes.js` (P6's). My files are clean.
- Private build (22:50): the game 2475 KB (under the 2.5 MB warning), the paintings 20303 KB.
- **Browser check** (`ui-check.mjs`, 360x740, reduced motion): 14/14 ok. Hodge on P2's Rotbridge: "Pay today's toll."
  with its "120 gold" chip, the toll game's odds chip ("Contest: 2 of 3 · 43%"), the fight, Leave; paying lifts the bar
  (500 -> 380 gold, `toll-paid`); on a silver day a party with none sees "1 silver" disabled. All 115 new or retold
  nodes played through the real dialogue box: 275 lines, the tallest line 100 px of text (five rows; `rows.mjs`: 128
  new lines take five rows, none six), every box on screen with its choices, no horizontal scroll, no page error (the
  sandbox's proxy refuses Google Fonts, filtered). The fourth council through its trigger: Gretch, Miravel's box, four boxes,
  the page, then P7's card "The Gloomfen is yours · End of Act II · ... The Hollow Council waits.", and
  `council-4-done`. Shots in `scratchpad/m6-builds/p3/shots/`.

## Needs from others
- **Lead (P1, `rules/story.js` `ladder()`): the barge rumour.** The spec's new rumour appears only once Tamsin has
  fallen, but `ladder()` lists every entry. Please skip an entry whose `if` fails:
  `return LADDER.filter(p => check(game, p.if)).map(p => ({ ... }))` (a missing `if` holds). Then paste:
  - `src/data/ladder.js`, after `missing-smith`:
    `// M6: the man on the barge who took Tamsin: a rumour once she has fallen (her duel over, won or yielded)`
    `{ id: 'man-on-the-barge', name: 'the man on the barge', silhouette: true, act: 2, if: { any: [{ flag: 'tamsin-fallen' }, { beaten: 'tamsin-rotbridge' }, { flag: 'tamsin-yielded-4' }] } },`
  - `test/story-data.test.mjs`: the rumour list becomes `['missing-smith', 'man-on-the-barge']`, and add
    `for (const p of LADDER) cond(p.if, \`ladder ${p.id}\`);` to the Ladder test (so its condition parses and its flags
    count as read).
  - `test/story.test.mjs` (the Tamsin test, after `fall`): `assert.ok(!ladder(g).some(p => p.id === 'man-on-the-barge'))`
    and `assert.ok(ladder(fall.game).some(p => p.id === 'man-on-the-barge' && p.state === 'silhouette'))`; the fresh
    Ladder's count stays 42.
  Without the filter the entry would show from day one, so it is not in `ladder.js` yet.
- **Lead (rules): Tamsin after her fall.** After a yield she still sits by her open gate (P2 raised it too: a road
  guard carries no `if`), though her fall takes her off on the barge; talking to her would replay her pre-duel talk.
  I agree with P2's first option: let the rules count `tamsin-fallen` as settling `tamsin-rotbridge` (present() drops
  it as it drops a `done` encounter). If you would rather have the scene mark it, give me an effect (e.g.
  `{ done: encId }`) and I will put it in `tamsin-fall`'s `do`. My AFTER entries for her duel play only while
  `tamsin-fallen` is unset, so a rematch never replays the fall.
- **Lead / P4 (a decision to confirm): the Bogstriders on a yield.** Tamsin leaves Rotbridge for good in her fall, so
  a Warden who yields could never win the Bogstriders (Codex No. 54, "drops when you win"), and Page IV would be
  closed to them ("never a wall", the brief). In her yield scene she steps out of them and leaves them
  (`{ give: 'bogstriders' }`; "Keep the boots. Where I'm going, I won't need to walk."); a win still drops them from
  the fight. To keep them a winner's prize instead, drop that one effect and the test line that asks for it, and she
  must then stay for rematches. P4: the holder line "(worn; yours when you beat her)" could add "or when she leaves".
- **Lead (rules), optional: Hodge's poster.** His encounter never stands on the map (P2), so nothing scouts his Ladder
  poster; a Warden who wins his coin at the game and never fights him keeps a silhouette forever. An effect such as
  `{ scout: 'hodge' }` (or scouting when you talk to an NPC who stands for an encounter) would let his first meeting
  scout it; I would add it to `hodge` and `hodge-toll`.
- **P7 (UI):** `dialogueFlow` plays the Council's title card for `council`, `council-2`, `council-3`; the fourth
  council is `council-4` (eight coals, every chair at the long table filled; the third council's card says one chair
  is still empty). Your 'gloomfen' end card reads well after the scene (checked). The `paid` event carries the price
  for your toast.
- **P4 (lore):** my lines follow your current relic lore (three Willow-Wards, the last one Moss's; Nettie's knots and
  "hag's hair"; the Lantern's children; Corvus's harpoon lost "in something" on his last dive; the Salvager's Helm's
  Tallyman stamp; Old Jaws's teeth; the chain-links in the Bargemaster's gauntlets; the Deep-Pearl's glow). Corvus
  says the Salvage-Master cut his line, and the Leviathan's collar lock carries the broken ring (spec §3.5). Tell the
  lead if any of that changes.

## For P7 (e2e ids and choice texts; spec §8)
- **Hodge** (NPC `rb-hodge` on Rotbridge): the first talk is `hodge` (5 lines, sets `met-hodge`); later his opener is
  the day's (`hodge-gold` day % 3 = 1, `hodge-silver` 2, `hodge-tonics` 0), `hodge-paid` once the bar is up,
  `hodge-stool` once he is beaten. Every one of them carries the same choices: "Pay today's toll." (the `price` chip:
  120 gold / 1 silver / 2 Hearth Tonics; `disabled` when you cannot meet it; it sets `toll-paid`, emits `paid`, then
  `hodge-paid-up`, 2 lines), "Play his toll game: best of three." (a contest, "Contest: 2 of 3"; its checks read
  "Persuasion DC 17", "Deception DC 16", "Intimidation DC 18"; once a day; won: `hodge-won` gives the Unfair Toll and
  sets `toll-paid`; lost: `hodge-lost`), "Refuse, and make him move." (bar down: `{ fight: 'hodge' }`), "Shift him off
  his stool." (bar up, unbeaten: the same fight), "Leave.". After the fight: AFTER `hodge-sits` (or `hodge-sits-coin`);
  after a loss (`on: 'defeat'`): `hodge-knocked`, then `hodge-knocked-again`.
- **Tamsin** (`tamsin-rotbridge`, the duel's talk, 4 lines): "Try again." (the fight) / "Not yet.". AFTER: victory
  `tamsin-rb-win`, yield `tamsin-rb-yield` (sets `tamsin-yielded-4`, gives the Bogstriders); each has one choice, "Look
  downstream.", into `tamsin-fall` (5 lines; sets `tamsin-fallen`; the barge, the tall man, the clasp), whose one
  choice "Tamsin. Don't." leads to `tamsin-traded` (her line "Tell Isolde I was the better Warden. Tell her I had to
  prove it somewhere.", then Hodge's "She paid her toll. Heavier than yours.").
- **The fourth council** (`council-4`, 7 lines; sets `council-4-done`, claims `gloomfen-waking`): "Tell Isolde what
  Tamsin said." -> `council-4-tamsin` (6 lines) -> "Show them the Worldforge page." (only with `worldforge-page`, the
  Dead Tongue's reward) -> `council-4-page` (4 lines), or "Let the Council talk."; "Let the Council talk." from any of
  them. Every path ends on `{ end: 'gloomfen' }`.
- **Willowmurk:** `moss` (4 lines, `met-moss`) with "Ask about the lights in the fen." / "Ask about Rotbridge." / "Ask
  about the bells under the water." / "Leave."; Sedge "Buy." opens `shop:sedge`.
- **Bogmire:** `gretch` (4 lines, `met-gretch`): "Ask about soot-sealed letters.", "Turn in bounties." (when one is
  ready), "Read the bounty board.", "Leave."; Nettie "Buy." opens `shop:nettie`.
- **Arrivals** (2 lines each, no choices): `arrive-willowmurk`, `arrive-rotbridge`, `arrive-bogmire`,
  `arrive-misthollow`. **Rests** (once each): `wards-night` (`willow-hearth`, after the wards), `toll-lamp-night`
  (`toll-lamp`, after Tamsin's fall), `bogmire-lamps` (`stilt-hearth`, after the children come home).
- **The Champions:** AFTER `lantern-mother` -> `mother-after-lantern` / `mother-after` (7 lines; `children-home`);
  AFTER `blackwater-leviathan` -> `leviathan-after-harpoon` / `leviathan-after` (5 lines), one choice "Listen." ->
  `lull-moss` (met Moss) / `lull`. Then the Unsmith's letter ("Seven." / "Eight.").

## For P5 (looks: the dialogue box draws a bust from `npcSheet(NPCS[id].art)`)
- The nine people (`moss`, `sedge`, `wm-villager`, `hodge`, `gretch`, `nettie`, `pell`, `bm-watch`, `corvus`) as the
  lines have them: Elder Moss, a very old man in willow-green with reed charms; Sedge, a herb-seller with bundles of
  reeds; Hodge, an old man with a cudgel, a lantern and a toll-book (met as an NPC and as a foe: perhaps `FOE_FIRST`,
  like Tamsin and Vesper, so he reads as one man); Mayor Gretch, a stout older woman with a chain of office; Nettie, a
  witch in a knotted bog-cotton shawl, bottles at her belt; Widow Pell, in grey; the Stilt-Watch, a guard with a
  pole-lantern (kept dark) and a boat-hook; Corvus, a lean, wet diver with a coil of rope and no harpoon.
- A new speaker, `lantern-mother` (NPC entry for the name, like `rime-abbot`): a young woman in black lace, streaked
  with lamp-black, holding a lantern. Without a look she gets a hashed villager face.

## Where I am
- Done, and checked on the tree as it stood at 22:45 (see Results). Open: the barge rumour (waits on the lead's
  `ladder()` filter; the paste is above), and the lead's calls on Tamsin after her fall, the Bogstriders on a yield
  and Hodge's poster.
- If resumed: re-read this file, then re-run `node --test test/story.test.mjs test/story-data.test.mjs
  test/toll.test.mjs` and, for the browser, build into `scratchpad/m6-builds/p3` and run `ui-check.mjs` there with
  `NODE_PATH=$(npm root -g)` (about 5 minutes; it logs to `ui-check.log`).
