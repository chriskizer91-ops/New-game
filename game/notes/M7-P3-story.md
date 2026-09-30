# M7 P3 story: Act III, the Hearth Below

Package P3 of `docs/M7-SPEC.md` (§1, §3.1, §3.5's scenes, §3.6, §4.7, and the story in its opening paragraph). No git
was run. Files I changed: `src/data/dialogue.js`, `src/data/npcs.js`, `src/data/quests.js`, `src/data/ladder.js`,
`src/data/letters.js` (comments only), `test/story.test.mjs`, `test/story-data.test.mjs`.
`src/data/maps/keep-hall.js` is unchanged: the scaffold's `council-5` trigger already has the spec's guard and is never
`once` (both tests pin it). Every "STUB from the M7 scaffold" mark in my files is gone.

**Status: done.** `npm test` 562 of 562 pass (541 before: +12 story-data, +9 story); `npm run lint` is clean; the
private build succeeds (the game 2652 KB: my data adds 25 KB to the base's 2627 KB; under 3.2 MB, over the 2.5 MB
warning as before). What waits on others is listed under "Requests"; nothing in my data is a stand-in.

## What I built

Written in the game's voice (short lines, concrete, warm with an edge); the lore follows the game where the brief or
the spec disagree with it (see "For the lead"). 74 new nodes (10 of them the scaffold's stubs, rewritten), 158 lines,
mean 101 characters, max 117 (M6: mean 94, max 117). Measured in the phone's dialogue box: see "Browser check".

**The Opening** (`council-5`, the keep-hall trigger; three nodes, one choice each, every path ends on
`{ end: 'act3-open' }`):
- `council-5` (sets `council-5-done` as it opens, so a reload replays it; scouts the four Council fights, so their
  Ladder posters leave silhouette and their gifts are Sighted): the Council sits a fifth time; none of the four has slept
  since the fourth. Qasim ("to be rid of a debt"), Brundar ("I want to see what he thinks I'm worth"), Gretch ("Tonight
  I'd like to be one [a fool]"), Miravel ("Mine calls me by my name"); Isolde: together, in the vault, under the Seal.
  "Open them together."
- `council-5-open`: four seals of soot broken at once; a gift made for each chair (a wreath of black thorn, a chalice, a
  gauntlet, a chain of office), each stamped with a hammer in a broken ring. **Hilda: "That's our mark. His. The soot
  letters, the man on the barge, and now these. My brother, every time."** (so the two rumours settle into the Unsmith
  here). Each gift takes its chair; their eyes go grey; the vault floor opens on a stair where there was never a stair,
  and the four walk down it. "Go after them."
- `council-5-stair`: Isolde asks Fenwick where it goes ("To the hall the first Council sat in, before there was a Keep on
  top of it. And under that... Bring them back first. ... I'll answer this time."); Hilda: "if my brother's at the bottom
  of it, bring me him"; Isolde holds the hall. Then the Act III card (`act3-open`).
- Isolde's `isolde-boxes` keeps the scaffold's "Open them together, as the letter said." (-> `council-5`, only until it
  has sat): the main quest is hers, and the thank-you rule needs a line of hers that sets `council-5-done`.

**The Hollow Council** (fights only in the Hollow Hall: no talk there; a test checks both the encounters and the map):
- AFTER each victory, their scene as they come back to themselves (the gift is off them, pried loose or broken; the lines
  never say which): Miravel sits in the tree's chair ("Shut every road, it said, and they'll never bleed again"); Qasim
  on the sun's chair's steps ("I have drunk from it for days, and I have never been so thirsty"); Brundar, his bare hand
  shaking ("Harrow's rivets. I'd know them blind"); Gretch ("I'm not a fool. I've told Bogmire so for thirty years.
  Well. Now I've told them wrong once."), then the other three stand, the ash on the stair back up settles, and a
  letter sealed in soot lies on the round table: **`{ letter: 'hollow' }`**, once (guard `not letter:hollow`).
- A wipe (AFTER `defeat`, on all four): "You wake by a fire with ash in your hair, and no memory of the way up."; Bryn:
  "They're still down there, waiting in their chairs. The ones we freed stay freed." (`woke-by-council`), then a
  shorter line of Pip's. The lines name no place: the rules wake the party at the last Hearthfire rested at (see "For
  the lead").
- Home again (their freed entities, `if: { beaten }`): the thanks, once (`heard-<name>`; it is a first meeting too:
  it sets `met-qasim` / `met-brundar` / `met-gretch` / `met-miravel-rot`), about what the gift showed them and the
  Warden; then they notice their gift on you; then a line of their own. Gretch keeps the Bogmire board on all of hers.

**Fenwick:** after the Opening, `fenwick-hollow` (he feels the four on the stair under his hearth). Once `hollow-gretch`
is beaten, `fenwick-truth` (once, until `fenwick-told`): the hearth never burned wood; it burns the Sleepers, four of
them, chained under four hills; a smith did it in the First Age, drew the Worldforge too and never dared light it ("I
held his lamp"); he lit this hearth over the first of them and put his poker in Fenwick's hand; it eats what it's given,
and every coal you lit it ate a little more. "Let him finish." -> `fenwick-poker`: "Here. You'll want something to stir
what comes next." **`{ give: 'fenwicks-poker' }`**, `{ set: 'fenwick-told' }`, `{ claim: 'fenwicks-truth' }`; his hand
opens and stays open, the lines of his face deepen "like frost on a window": "There's my knees." After it his lines
are an old man's (`fenwick-old`, before every line he had before). He notices his poker on you. The letters' two hints
are paid off: his hands, and how old he is.

**Hilda:** after the Opening, `hilda-hollow` (his mark on all four). Once the Council is freed **and** the Worldforge
page is yours: `hilda-masterpiece` (once, `masterpiece-offered`): the last leaf of the plans, the one he dredged a fen
for; **"Harrow Ironvein. The Unsmith. My twin. I've never said the three together out loud. There. It's said."**; "His
forge unmakes. This leaf is the other half: how the old smith made a thing fit to feed a hearth." Every line of hers then
offers **"Forge the Masterpiece." (`{ open: 'masterpiece' }`)** while it waits (the shared FORGE choices carry it, with
`if: beaten hollow-gretch, worldforge-page, not masterpiece-forged`), so her notices never hide it. Without the page:
`hilda-page`, a hint ("If a leaf of them ever turns up that he missed, bring it to me. I've ideas."). Once forged
(`masterpiece-forged`, set by rules/forge.js): `hilda-forged` claims the `masterpiece` quest. After the Unsmith:
`hilda-told` (once, `harrow-told`): Bryn brings her his last words; she tells how he banked her forge every night when
they were small; then `hilda-banks`. After Kindle Anew: `hilda-anew` ("Best review I've ever had."). She notices his
hammer, his apron and the Worldforge Heart.

**Isolde:** `isolde-holds` (after the Opening: "I'm holding the hall."), `isolde-freed` (the Council home), after the
Unsmith `isolde-tamsin` (once: Tamsin came up the vault stair and ate everything; "Best talk we've ever had.") and
`isolde-heart` (the choice is below, and yours). Her notice of Tamsin's Bargain. After an ending, her line for it.

**Tamsin below:** she waits before the forge door (`cd-tamsin`; her talk table already reads `tamsin-return` after the
Opening). Past the unmade (AFTER `cd-unmade`, until she has joined) the party sees her get up off the stones
(`tamsin-waiting`, "Go to her."), so her return is hard to miss. `tamsin-return` sets **`tamsin-returned` and
`met-tamsin-below`**, scouts the Unsmith's poster: she followed his barge to the bottom of the world; he fed the Keep's
relic (her traded starter) to his forge, and that is what lit it; "I wanted to be the better Warden. I was only the one
who said yes. ...I'm sorry."; "Let me stand with you against him." "Stand with us, then." -> `tamsin-joins`. At the Chain
Fire, once, she keeps the watch (`chain-fire-night`). After the Unsmith: `unsmith-after` -> "Turn to Tamsin." ->
`tamsin-after`: **`{ give: 'tamsins-bargain' }`**, `tamsin-gave` (and `tamsin-returned`, `met-tamsin-below`, so a
Tamsin who was passed by never stays at the door after the finale); she goes up to Isolde. Should that scene be cut
short (the page closed on it), Isolde has the sword for you (`isolde-bargain`, the same flags): Page V never hangs on a
lost scene (M6's Bogstriders rule).

**The Unsmith** (speaker `unsmith`, a new NPCS entry named "Harrow Ironvein", like the Rime-Abbot's): past the
forge-warden (AFTER `wf-warden`) he looks up from the great anvil and calls you across (`unsmith-bridge`, "Cross the
bridge.") into **`unsmith`, his word before the fight**: he has Hilda's hands and a smile she never wears; "Metal melts
better clean. I did tell you."; he greets Tamsin ("my better Warden"), who answers him. Choices: "Ask him why." ->
`unsmith-why` (the hearth never burned wood; every relic is a spark struck off the Sleepers; he read it in the plans and
could not unread it; the old smith never dared light this forge, he did: every relic melts, then the hearth goes out,
and the Sleepers with it, "kinder than waking them"; Tamsin: he has been starving them through your coals); "Face him."
(`{ fight: 'unsmith' }`); "Not yet.". It is written to be the encounter's `talk` too (M6's pattern; a request to P4). A
wipe: `unsmith-woke` (a Hearthfire, Tamsin: "this time we win"), then a shorter line. After him: `unsmith-after`: on one
knee before his forge; **"Tell Hild I kept the fire in. She'll know what I mean. She'll hate it."**; he sits down with
his back to the anvil, "the way a smith sits at the end of a long day, and does not get up."

**The heart** (`the-heart`, the sign `wf-heart`'s talk once the Unsmith falls): its one line is where you stand (the
furnace mouth, where the hearth's iron roots come down to the Worldforge's heart), true before and after. Before an
ending (`if: { not: { ending: true } }`): "Rekindle: chain the Sleepers again.", "Release: break their chains.", "Kindle
Anew: a legend of your own." (with **`needs`**, one part per condition of `ENDINGS.anew.needs`, in order: `owns
fenwicks-poker` "Fenwick's Poker", `masterpiece: true` "your Masterpiece", `pages: 'all'` "every page of the Codex"),
"Not yet." Each goes through a last word before it is final (`choose-rekindle` / `-release` / `-anew`, a party line and
"Think again." back to the heart; Kindle Anew's keeps the price). Each ending scene (`ending-rekindle` / `-release` /
`-anew`) applies `ENDING(id)`: `{ ending: id }`, `{ set: 'council-5-done' }` (the thank-you rule), `{ claim:
'hollow-council' }`, `{ end: 'act3' }`. Afterwards the heart's only choice is "Look into the furnace." (one per ending,
`if: { ending: id }`) into `heart-rekindled` / `-released` / `-anew`, which say what was chosen and do nothing.
- Rekindle: the chains draw tight, eight coals flare, the First Sleeper sighs and sleeps on; "Somebody has to remember
  what it costs."
- Release: the chains go slack and fall, the eight coals go grey, the Keep is cold for the first time in nine hundred
  years; "We'll burn logs, like anyone else."
- Kindle Anew: the chains broken first; the Masterpiece held to the heart, "its fire catches, the way a candle lights a
  candle"; stirred with Fenwick's poker; the hearth burns gold; "nobody is paying for it".

**After an ending** (first in their tables, after the once-only lines): Isolde (`isolde-rekindle` / `-release` /
`-anew`), Fenwick (`fenwick-rekindle`: he hears them breathing under the floor again; `fenwick-release`: "Logs! Real
logs"; `fenwick-anew`), and Hilda for Kindle Anew.

**Arrivals** (each map's first entry; no effects): the Hollow Hall (Alondra hears four slow, cold heartbeats, and far
below "something vast"), the Ash Stair, the Chained Deep (Alondra: "There. The fourth. I dreamed of four..."), the
Worldforge.

**Quests (§3.6):**
- `hollow-council` (main, isolde, start `council-5-done`): free the Council (`beaten hollow-gretch`, target
  hollow-gretch); the Chained Deep (`any: [met-tamsin-below, beaten unsmith]`, target cd-tamsin: as in M4-M6, a talk
  step also closes once what it leads to is done, so it never sticks); the Unsmith (`beaten unsmith`); "Choose at the
  Worldforge's heart what the hearth burns now." (`{ ending: true }`, target wf-heart). Reward `{}`: each ending's
  scene claims it.
- `masterpiece` (side, hilda, start `all: [beaten hollow-gretch, flag worldforge-page]`): "Gather Hilda's price..."
  (`any: [afford { gold 2000, materials { embers 5, silver 5 } }, { masterpiece: true }]`: the price as far as a
  condition can say it, and it stays done once spent); "Name your Masterpiece, and have Hilda forge it."
  (`{ masterpiece: true }`). Reward `{}`; `hilda-forged` claims it.
- `fenwicks-truth` (side, fenwick, start `beaten hollow-gretch`): "Hear Fenwick out at the Eternal Hearth."
  (`flag fenwick-told`). Reward `{}`: he gives No. 000 in the scene that claims it.

**The Ladder:** the scaffold's five Act III posters stand (the Council's scouted by the Opening, the Unsmith's by
Tamsin's return). The two rumours carry **`found: { poster: 'unsmith', if: { flag: 'council-5-done' } }`**
(documented in the file's header): once the fifth council has sat they are found, and settle into his poster. What
shows it is the Ladder's (see Requests: P7, and optionally P1); the data and its tests are done.

**Letters:** `hollow` is the spec's text, signed "— H." (the scaffold's; unchanged); the header now says it is his last.

### Flags (all set in my data but one)
- Set and read by the story: `council-5-done` (also the trigger's guard, the vault's props and exits, the towns),
  `heard-miravel` / `heard-qasim` / `heard-brundar` / `heard-gretch`, `woke-by-council`, `fenwick-told`,
  `masterpiece-offered`, `harrow-told`, `tamsin-returned` (the map's `cd-tamsin`), `met-tamsin-below` (the quest),
  `tamsin-gave`, `heard-tamsin-home`, `chain-fire-night`, `woke-by-unsmith`; `letter:hollow` (the `letter` effect).
- Read, set by the rules: **`masterpiece-forged`** (rules/forge.js forgeMasterpiece): added to the test's `RULE_FLAGS`.
- Conditions used: `{ ending: id | true }`, `{ masterpiece: true }`, `{ pages: 'all' }` (P1's).

## Tests

`test/story-data.test.mjs` 27 -> 39 tests; `test/story.test.mjs` 33 -> 42 tests.

**Changed lines (old -> new), each an extension the brief asks for; no assertion was removed or loosened:**
- The effects test's `OPEN` whitelist: `['forge', 'atlas', 'journal', 'ladder', 'bounties']` ->
  `['forge', 'atlas', 'journal', 'ladder', 'bounties', 'masterpiece']` (the brief: add `masterpiece`).
- The effects test's end acts: `['act1', 'act2', 'ironspire', 'gloomfen'].includes(e.end)` ->
  `['act1', 'act2', 'ironspire', 'gloomfen', 'act3-open', 'act3'].includes(e.end)` (the brief: add `act3`, `act3-open`).
- `RULE_FLAGS` (flags set outside the story data): `[..., 'gloomfen-complete']` -> `[..., 'gloomfen-complete',
  'masterpiece-forged']` (rules/forge.js sets it; Hilda's lines read it).
- Strengthened, not changed: the first test also parses each choice's `needs` (and asserts each has a `why`); the
  Ladder test also parses each `found.if`; `storyLeaves()` also walks `needs` (so their relic ids are checked).
- `test/story.test.mjs`: only the header and one import line (`enterMap` -> `enterMap, present`, plus new imports).

**New (story-data):** every scene is reachable (from a talk table, a trigger, a sign's or an encounter's talk, AFTER,
RESTS, ARRIVALS, LOOKOUTS or a `use` entity; it holds for all 449 nodes, old and new); the Opening (exact guard,
never once, sets `council-5-done`, scouts the four, `act3-open` on every path, who speaks, the boxes, the gifts, the
mark, Hilda's brother, the stair, nothing given or fought, Isolde's word); the Hollow Council (no talk, one scene each,
the defeat lines (who is freed stays freed), home again: thanks first, once, and a first meeting, the gift in their
words, then the notice, then a line; Gretch's board; the letter once and only there); Fenwick's truth (its guard, its
words, No. 000 given once and only by him, the quest claimed, "stir what comes next", the knees, the old man's line
placed first); Hilda
(the offer's guard and naming, the Masterpiece tab on every forge line of hers with the exact eligibility, the hint,
the thanks, Harrow's end, her notices); Tamsin (her flags, the scout, sorry, the lead-in after the unmade, the relic
from her or Isolde only, the flags both set, the Chain Fire rest); the Unsmith (the speaker's name, the bridge, his word
always offering the fight and "Not yet.", its words, his end's message, the defeat lines); the heart (the three choices
and "Not yet.", Rekindle and Release unconditional, Kindle Anew's `needs` equal to `ENDINGS.anew.needs.all` part by part
with the three reasons, each last word and "Think again.", each scene setting its own ending and only it, claiming the
quest after it, `act3` on every path; afterwards one inert "Look into the furnace." per ending); the Keep in Act III
(Isolde's order, the ending lines first after the once-only ones, the arrivals); the quests (ids, givers, starts,
steps, targets, rewards; the price equal to `TUNING.masterpiece`; who claims each); the Ladder (the Unsmith's poster,
the rumours' `found`, who scouts which poster); Page V noticed (all nine relics, each gift by its own chair).

**New (story, through the rules):** the Opening played from `enterMap` (the path, the flag, the `act3-open` event,
Hilda, replay before the flag and never after, the four gone from their towns, the quest pointing down the stair,
Isolde's word, the Keep's three lines); the Hollow Council (the wipe lines, each freed scene, only the fourth's letter,
once, the quest moving on, home again in each town with thanks, line and notice, Gretch's board, the thanks as a first
meeting); Fenwick (the quest, the truth played to the poker, the item event, the claim, the old man, the notice, the
truth still there after an ending, the Poker leaving Kindle Anew's reasons); Hilda (the hint without the page, the
offer and its naming, the `open masterpiece` event, the tab on her notices, the quest's two steps before and after the
price is met, a real `forgeMasterpiece`, the thanks claiming it, one to a save, Harrow's end, Kindle Anew's line);
Tamsin (the lead-in, her talk, her flags, leaving her place, the poster scouted, once, the quest step, the Chain Fire
once, after him the relic event and the Codex claim, once, Isolde's homecoming and notice, the lost-scene fallback,
and the Tamsin who was passed by); the Unsmith (the bridge into his word, its three choices and their events, his name,
Tamsin, the defeat lines, not a duel); **the heart**: on a fresh Act III save Kindle Anew is disabled with exactly
`['Fenwick\'s Poker', 'your Masterpiece', 'every page of the Codex']` and refused by `choose`; with the Poker, a forged
Masterpiece and every page it is enabled; each ending through its scene sets `game.ending` once (one `ending` event, one
`act3` end), closes the main quest; then every other ending's scene and a hidden choice taken anyway change nothing; the
heart offers only "Look into the furnace." into the right inert line; Isolde and Fenwick answer each ending; the main
quest step by step (never stuck past Tamsin; `ready` with an ending); the Ladder (48 posters at every stage, the Council
scouted at the Opening, the Unsmith at Tamsin's return, both rumours found, the gifts Sighted, all five settled).

**Mutation check** (`scratchpad/p3-work/mutate.py`): 37 mutations of my data, one at a time, each file restored byte
for byte (sha256 checked): **37 of 37 caught** (among them: the Opening without its flag, its card or a scout; Tamsin
never met below; Kindle Anew without a part, or confirmed for free; an ending setting another; a reason reworded; the
Bargain never given by Isolde or by Tamsin; a thanks that repeats; no letter; a quest never claimed; the Masterpiece
offered before the page; Hilda not naming him; the heart looking the wrong way, or offering again after an ending; the
watch every night; no wipe lines; Gretch without her board; Fenwick telling it twice, or never ageing; Isolde forgetting
an ending; a notice before a thanks; the price not Hilda's, or unpaid once spent; the quest stuck at the Chained Deep;
no ending step; a rumour never found, or found too early).

## Browser check

`scratchpad/p3-work/ui-check.mjs` on the private build (360x740, DPR 3, touch, reduced motion; not in the repo): an
Act III save through the world screen's test seam (`window.__world.event({ t: 'talk', dialogue })`), so **every one
of the 74 new nodes played through the real dialogue box**, following its choices (207 line views). Result: every line
takes at most **five rows** of the phone's text column (7 take three, 71 four, 128 five; the tallest 100 px); every
choice is at least 44 px tall and on screen; the box is on screen; no horizontal scroll; **no page error**. The one line
that wrapped to six rows (`isolde-release`) was shortened and re-measured (five). The Opening played from the trigger
on entering the hall; the Hollow Council's last scene showed **the `hollow` letter card** ("Four chairs empty. ... —
H."); the heart showed its four choices at 360 px with Kindle Anew disabled (its reasons are not drawn yet: P7, below).
Screenshots in `scratchpad/p3-work/shots/`. Two things this check showed that are not mine: the `act3-open` and `act3`
end cards fall through to the Act I card today, and `{ open: 'masterpiece' }` opens nothing yet (P7).

## Requests to other packages

**P7 (UI):**
1. **The end cards.** `{ end: 'act3-open' }` after the Opening is the Act III title card ("Act III: The Hollow
   Council"); `{ end: 'act3' }` after each ending scene is that ending's card (read `game.ending`; the event `{ t:
   'ending', id }` comes first in the same list, only when it was set), the credits and the last card ("The post-game
   opens in the next chapter"), then back to the Great Hall. Today `chapterEnd` falls through to the Act I card for
   both. I kept the brief's default name `act3-open`; if P7 names it otherwise, it is one string in `council-5-stair`
   and one in the story-data test's end whitelist.
2. **`{ open: 'masterpiece' }`**: Hilda's forge on its Masterpiece tab. `openFlow` returns null for it today. It is on
   every line of hers while the Masterpiece waits (choice text "Forge the Masterpiece.", first in her list).
3. **A disabled choice's `reasons`** (P1's `dialogueView` gives them): the dialogue box shows only the price chip today.
   Kindle Anew's are "Fenwick's Poker", "your Masterpiece", "every page of the Codex" (spec §5: "the choice, with
   Kindle Anew's reasons when locked"). A chip like the price's ("Needs Fenwick's Poker, your Masterpiece and every page
   of the Codex") would fit.
4. **The Ladder's found rumours**: a rumour whose `found.if` holds (`check(game, L.found.if)`, or P1's field below)
   shows "Found: " + the poster's name ("Found: the Unsmith", the poster `LADDER.find(p => p.id === L.found.poster)`)
   in place of "Only a rumour", and points at that poster (a link or a scroll to it).
5. The fourth council's end card line "Act III begins." (FX, the brief): council-4's own text is unchanged, so no
   story test changes for it.
6. For e2e: the ids and choice texts. The Opening: trigger `council-5` -> "Open them together." -> `council-5-open` ->
   "Go after them." -> `council-5-stair` (the `act3-open` card); or from Isolde's `isolde-boxes`, "Open them together,
   as the letter said.". Tamsin: `tamsin-waiting` ("Go to her.") or her talk -> `tamsin-return` -> "Stand with us,
   then." -> `tamsin-joins`. The Unsmith: `unsmith-bridge` ("Cross the bridge.") -> `unsmith` ("Ask him why.", "Face
   him.", "Not yet.") -> `unsmith-why` ("Face him.", "Not yet."); after: `unsmith-after` ("Turn to Tamsin.") ->
   `tamsin-after` (the Bargain's card). The heart: `the-heart` ("Rekindle: chain the Sleepers again.", "Release: break
   their chains.", "Kindle Anew: a legend of your own." (disabled with its reasons), "Not yet.") -> `choose-rekindle`
   ("Rekindle.", "Think again.") / `choose-release` ("Release them.", "Think again.") / `choose-anew` ("Kindle Anew.",
   "Think again.") -> `ending-*`; afterwards "Look into the furnace." -> `heart-rekindled` / `-released` / `-anew`.
   Hilda: `hilda-masterpiece` ("Forge the Masterpiece.", "Temper something.", "Leave."). The letter `hollow` after
   `hollow-gretch-after` (checked in the browser: it shows).
7. Optional: `dialogueFlow` plays the Council's title card for `council` to `council-4`; `council-5` is not in that
   list (the `act3-open` card after the scene may be enough).

**P4 (foes and relics):**
1. **The Unsmith's encounter `talk: 'unsmith'`** (M6's pattern, optional but meant): his word before the fight, which
   always offers "Face him." (`{ fight: 'unsmith' }`) and "Not yet."; the data test already checks an encounter's talk
   can start its fight, and mine checks it names `unsmith` if it is set. Without it his word still plays, from the
   bridge, once.
2. **koText suggestions**, their own words coming back to themselves (they avoid the AFTER scenes' words; the scaffold's
   Miravel line "looks at her own hands" repeats hers):
   - Miravel: `Miravel says, in her own voice, "Keep folk come for timber and advice." Then, quieter: "They never take it."`
   - Qasim: `"I dislike owing," says Qasim, hoarse, in his own voice again. "So I pay quickly."`
   - Brundar: `"I don't open gifts from men who rob me," Brundar growls, in his own voice, and his fist comes open.`
   - Gretch: `"I'm not a fool," Gretch says, very quietly, in her own voice. "I'm not that kind of fool."`
3. **The Unsmith's `text`** (foes.js) says "the smith who drew the Worldforge's plans": the game says those plans are a
   thousand years old, in a First-Age hand Fenwick knew, and that Harrow stole them from under Ironhold (council-3,
   council-4-page). Suggest "the smith who stole the Worldforge's plans, and built it".
4. My lines treat the gifts as a wreath of black thorn, a chalice, a gauntlet and a chain of office, stamped with the
   broken ring; Tamsin's Bargain as a sword that bled violet-black; the Unsmith's pieces as his hammer (the bigger one
   of his fifth letter), his apron (the Ironvein mark on the pocket) and a ring. Tell the lead if the relic lore
   changes any of that.

**P1 (rules), optional:**
1. `ladder()` could return `found: <poster id>` for a rumour whose `found.if` holds (and perhaps `state: 'settled'`),
   so the UI need not evaluate it.
2. `afford` could take `gems`, so the Masterpiece quest's first step can name the bog amber too (it names gold, embers
   and silver now; Hilda's tab shows the whole price).
3. A sign's `talk` as a talk table (`[{ if?, d }]`, the first that holds, as an NPC's) would let the heart open straight
   on what was chosen; today it shows its one line and "Look into the furnace." (which reads well; not needed).

**P5 (overworld art):** the new speaker `unsmith` ("Harrow Ironvein") draws `npcSheet('unsmith')`: his battle look if
`FOE_ART.unsmith` is a humanoid, else a hashed villager face. An `NPC_LOOKS.unsmith` (a tall man, boatman's cloak over a
smith's leather apron, the broken ring on his clasp) or adding him to `FOE_FIRST` would give him his own bust.

**P2 (maps):** nothing needed. The vault floor's sealed words (keep-hall `hall-down`, "P2 and P3 word them") read well as
drafted ("The vault floor is old stone, cold as a well. Something under it is colder." / "It opens once the Council has
sat a fifth time."); I would keep them. The exit is yours, so its STUB mark is yours to remove.

## For the lead

- **The spec's opening paragraph** calls Harrow "the smith who drew [the Worldforge's] plans"; the game says the plans
  are First-Age and Harrow stole them. The story follows the game: a First-Age smith drew the Worldforge and chained the
  Sleepers, and never dared light the forge; Harrow built and lit it (with Tamsin's starter). That smith is never named
  (the First Smith is the next milestone's, A15). The spec's "nine hundred years" (the hearth) and the game's "a
  thousand years" (the plans, the choir, the monks) are kept apart: Fenwick, who was there, always says nine hundred.
- **Story decisions to confirm:** the Unsmith dies after his fight, quietly (he sits down against the anvil and does
  not get up); Fenwick ages but lives; Kindle Anew lights the hearth from the Masterpiece's fire and does not burn the
  item (it stays in the pack); Release puts the hearth out and the Keep burns logs in it (the Hearthfire works as
  before); the Sleepers freed are not woken (the post-game's "Sleepers at full power" is untouched); Tamsin goes home
  to Isolde and stays a while (no recruitment).
- **Deviations from the spec's letter, each following an earlier milestone's rule:** the main quest's Chained Deep step
  also closes once the Unsmith is beaten (never stuck); the ending scenes set `council-5-done` again (the thank-you rule
  asks a claim to set its start flag); Tamsin's return has a lead-in after the unmade fight, and her relic a fallback at
  Isolde's (M6's lost-scene rule); `tamsin-after` also sets `tamsin-returned` and `met-tamsin-below`.
- **Where a wipe wakes the party:** the spec says the Eternal Hearth for the Hollow Council (A11) and the Chain Fire for
  the Unsmith (§3.5), but `rules/gauntlet.js` `wipe` wakes a party at the last Hearthfire it rested at (`lastHearthfire`),
  which can be anywhere (a Warden who last slept at Bogmire wakes there). My wake lines name no place, so they hold
  either way; whether the rules should send a party below the Keep to those two fires is P1's call.
- **Kept in step by tests, not by imports** (`data/` may import only `core/`): Kindle Anew's `needs` equal
  `ENDINGS.anew.needs.all`, and the Masterpiece quest's price equals `TUNING.masterpiece`. If P4 retunes the price, the
  story-data test fails and names it: change the gold, embers and silver in `quests.js` to match.
- **The Unsmith's word can start the fight from the bridge scene** (the dialogue's fight event), so the battle may begin
  with the party standing at the bridge rather than his lair; after it they are back there. Hooking `talk` on his
  encounter (P4) makes the usual way the lair.
- **Size:** my data adds 25 KB to the game (2627 KB built from the base's story files, 2652 KB from mine).
- Scratch tools (not in the repo): `scratchpad/p3-work/` (`mutate.py`, `lens.mjs` for line lengths, `reach.mjs`,
  `ui-check.mjs` and its `shots/`), the originals of my files in `p3-work/orig/`.
