**Critic report: 09-t2-spec.md (T2, Chapter 1). I did not edit any file.**

**Coordinate spot-check.** I checked 150 coordinates and areas with node, against the map rows and `tileOf`/LEGEND in `src/data/tiles.js`. The maps were th-thornhollow, thornway, eldergrove, heartroot-1, mossfall, mosswatch-1/2, hindwood, fawnrest, briarmaw-den and the new node grid. Every entity, anchor, stand and exit tile is walkable, including all the ones marked "(check)". Two areas partly cover trees or bushes, which is harmless: `c1-tw-whisper` [19,15,24,17] (2 T tiles) and `th-tw-bramble` [16,18,20,20] (4 t tiles). The problems below are about logic and the engine, not tiles.

**A. Things that do not work in the current engine and have no owner (blockers)**

1. **§2 (th-stockade, th-hr-rot-knot, th-mw-ledger-door, th-hr-ichor-a/b, th-mf-islet-ford): "lock opens on flag X" is not supported.**
   - Locks open only with a relic power or a Domain level (`src/data/locks.js`, `world.js` `lockStatus`).
   - Fix: make each one a `gate` with `open: {flag…}`, or add `{ unlock: '<entity id>' }` to the dialogue that sets the flag. That effect already exists in `story.js`.

2. **§2 (th-tw-strongbox, th-tw-boulder-chest, th-tw-thorn-chest): "chest opens on beaten/flag" is not supported.**
   - `openChest` only checks `lock: <lockType>`.
   - th-tw-strongbox [2,42] sits south of the barricade, so it can be looted before the runner camp is beaten.
   - Fix: give the chests an `if:` (hidden until the condition holds), or place them behind a gate.

3. **§2 (th-mw-fire "cold until beaten c1-mw-lantern", th-fr-stone "cold until c1-node-cooled", th-hr-coal "Taela lights it"): conditional cold hearths are not supported.**
   - `cold` is a fixed boolean. Kindling goes through the `cold-hearth` lock, which opens with Attunement 3, and Taela's domain is attunement, so she can light them early.
   - No story effect writes `flags.kindled` (the `unlock` effect writes `flags.unlocked` instead).
   - Fix: add a `kindle` effect in `story.js` (WP A), and give hearthfires a `coldUntil` condition in `world.js` `entityState`. Assign that `world.js` change to one WP.

4. **§2.8 / §3.2 (c1-feral-druid, beat 10): the burners cannot be talked down.**
   - The encounter is `pack` with `talk c1-burners`, but `interact()` skips pack encounters. A pack is fought on touch and its `talk` never shows.
   - Fix: make it `block` or `lair` with `talk: 'c1-burners'`.

5. **§2.8 (th-deer-1/2 "interact: dialogue c1-deer") and §2.1 (th-notices board "dialogue c1-board").**
   - Props cannot be interacted with. `board` sends a `use` event, which opens the old bounty screen, not a dialogue.
   - One shared `c1-deer` node cannot tell which of `s9-deer-1`/`s9-deer-2` to set.
   - Fix: use `sign` entities with `talk`/`talkIf`, and two nodes `c1-deer-1`/`c1-deer-2`.

6. **§3.4 `{ item: id }` for key items clashes with the existing `item` effect.**
   - The existing effect takes an item-spec object and calls `generateItem`, so `{ item: 'th-lens' }` would break.
   - Fix: add a new `key` effect (or similar) for `th-lens` and `th-buyers-letter`.

7. **§3.4 / WP A `end: 'chapter-1'`: wrong file.** The end card is drawn in `src/ui/world/story-fx.js` (it checks `act === 'prologue'`), not in `src/rules/story.js`. Add `story-fx.js` to WP A's file list.

8. **New looks with no owning file.** Prop `node` (th-fn-node) and prop `open-slab` (th-fr-slab) have no drawer. Gate look `rot-bramble` does not exist; `GATE_KIND` has `bramble`. Fix: use `look: 'bramble'`, and give the two props (in `src/art/map-sprites.js` / `src/ui/world/view.js`) to WP B or WP G.

9. **§3.1 / §6: one hire NPC for two docks.**
   - `th-skiffhand` stands at both Eldergrove and Mossfall with the same talk list, so `c1-hire` cannot know which `sky:hire@<dock>` to open.
   - The spec also leaves "one node per dock or a `<dock>` template" undecided, and dialogue has no templates.
   - Fix: use separate NPC ids (`th-skiffhand-eg`, `th-skiffhand-mw`) and nodes `c1-hire-thornhollow`, `c1-hire-eldergrove`, `c1-hire-mosswatch`.

**B. Story and flag logic**

10. **§3.1, Dael's talk loops on itself.** `c1-done → c1-dael-end`, but `c1-dael-end` is the node that sets `c1-done`, so the chapter can never end. `c1-dael-wait` is also not in the talk order. Fix: `c1-done → c1-dael-after (new)`; `c1-aldric-letter → c1-dael-end`; `c1-lens → c1-dael-wait`; then the rest.

11. **§3.1, Aldric's letter can be given again and again.** `c1-lens → c1-aldric-lens` holds forever, so each talk hands over another letter. Fix: `c1-aldric-letter → c1-aldric-after` placed above `c1-lens`.

12. **§3.1, the keeper's talk loops the same way.** `s9-done → c1-keeper-home`, where `c1-keeper-home` sets `s9-done`. Fix: `s9-done → c1-keeper-after`; `s9-deer-1 and s9-deer-2 → c1-keeper-home`.

13. **§1 beat 1: `c1-start` is never set.** No node sets it, so the crate-thieves trigger, Aldric's talk, the objectives and the e2e fixture all depend on a missing flag. Fix: add `{ set: 'c1-start' }` to T1's final node (`th-landing`, next to `end: 'prologue'`) and say that WP A edits it. Test 4 ("every flag read is set") would fail otherwise.

14. **§3.2 talk targets never defined.** No node exists for: c1-aldric-waiting, c1-aldric-after, c1-dael-wait, c1-taela-roots, c1-acolyte, c1-miravel, c1-outfitter, c1-trader, c1-supplier, c1-garret-wait, c1-garret-after, c1-keeper-again, c1-pilgrim, c1-pilgrim-better, c1-scholar-busy, c1-vesper, c1-goblin-after, c1-dael-patrol-done (content), and the trigger texts (c1-hr-descent, c1-hr-hot-lake, c1-mw-arrive, c1-mw2-arrive, c1-hw-roots, c1-hw-ford, c1-fr-arrive, c1-fn-hot, c1-den-enter, c1-den-pool). Fix: list them with a purpose and effects.

15. **S3/S4/S7 flags with no setter or no map entity.**
    - Nothing sets `s3-done`.
    - Nothing sets `s7-open`, `s7-helped` or `s7-chased`.
    - `s4-spring`, `s4-coast` and `s4-pool` need interactables at the Heartroot spring, the Mossfall islet and the Fawnrest pool. None is placed, and `c1-hr-spring` is `once`.
    - Fix: name the setters and add repeatable sample entities.

16. **§3.3 objectives are missing steps.**
    - After `c1-aldric-maps` the line still reads "Tell Aldric…". Add `c1-aldric-maps` → "Ask Dael to open the west road."
    - Add `c1-met-taela` → "Hold the shard near the roots."
    - Add `c1-node-found` → "Face what guards the node."
    - Add `c1-aldric-letter` → "Tell Dael."
    - `nextObjective` only falls back to TH_OBJECTIVES when no quest is active, so an active side quest from the new `quests.js` would hide the main objective. Say how the two combine.

17. **§2.3 / §3.3 beat 6: the objective and the trigger disagree.** The objective says "Rest at Eldergrove's hearth", but `c1-eg-pulse` fires when the player walks in. Fix: use `RESTS` (`restDialogue`, as the old Fawnrest dream does) with `at: 'th-eg-hearth', if: c1-warm-water and not c1-pulse`, and drop the trigger.

18. **§1 timing rules vs the day counter.** Every rest adds a day and shows "Day N" (`world.js:873` toast, aftermath, carry-facts, item provenance). So "beat 6 = Day 4" and "no day count after beat 6" are not enforced by anything. Fix: a WP (A or E) hides day displays when `c1-pulse` is set and does not tie beat 6 to `flags.day`. Test 11 only checks dialogue lines.

19. **§2.3 / §2.8, the ledge is described two ways.** `eg-e` is called a "one-way ledge", but `hw-w` leads back up with "(Taela lowered the rope)", and `hw-rope` is dropped. Fix: pick one wording.

20. **§2.4, the sap-knot guards only a sealed exit.** `c1-hr-spring` [11,2..13,2] lies south of `th-hr-sap-knot` (row 1), which leads only to the sealed `h1-n`. Fix: move the spring onto the tiles past the knot, or drop the gate and keep the sapwight as the guard.

21. **§2.6 / §2.7, Garret shows on both floors.** `th-garret` on floor 1 has no `if`, so he is still in the kitchen after `th-garret-up` appears upstairs. Fix: add `if: { not: { beaten: 'c1-mw-lantern' } }`.

22. **§1 beat 6 wording.** The table says "something far to the south answers", but canon has the pulse starting at Misthollow (the egg-stone, Day 4) and going outward. The grove is the one answering; the dialogue text in §3.2 already has this right. Fix: change the beat-table wording.

**C. Level curve and fight rules**

23. **§5 "none above the hero's level" is broken by the spec's own fights.**
    - Running XP: 63 at start, landing +21 = 84 (L2), then c1-verdant-edge (L3 foes, hero L2).
    - At 126 (L3): runner-camp tallyman 4 and bramble bandit 4 (hero L3).
    - Thornway patrols reach L4.
    - Test 10 checks "≤4" instead. `c1-snag-wallow` (oldsnag L6) can be fought solo and fails test 10.
    - Fix: change the rule to "≤ level 4" and exempt optional lairs, or lower those foe levels.

24. **§5.5, the story XP does not reach the targets.** Main-path encounter XP only (the XP column matches buildFoe exactly; I checked 21, 64, 990 and 321 hp):
    - Eldergrove 303 (L4) ✓.
    - After the Heartroot 863 (L5, target L6, 1285).
    - After Mosswatch 1379 (L6, target 7-8).
    - Entering the node, with glowcaps and burners fought: 1736 (L7). Before the boss: 2160 (L8, target L9 at 2800+).
    - After the boss 3150 (L9, target L10). The Keep dock in T3 needs level 10.
    - The gap (about 1300 XP) has to come from roaming packs (max 2 per map) and optional fights, and the spec never says so.
    - Fix: raise story spawn levels or XP, or state the expected patrol count and have `--route=thareia-c1` enforce it.
    - The line "Mosswatch keeps the hero from meeting the boss at L8" is wrong: even with Mosswatch, the main path reaches the boss at L8.

25. **§2.8, the Hindwood can be skipped.** The ford `wwww` [9-12,20-21] can be walked, so `c1-glowcaps` and the bridge-knot do not gate the road. The Fawnrest dock (`if c1-to-fawnrest`) also lets the player fly past the Hindwood and beat 10. Fix: gate the ford, or make the Fawnrest dock need `c1-hindwood`. Either way, stop counting these fights as main-path XP.

26. **§4.3 vs §6.4: two different levels gate things.** Docks use "the hero's own level", while §4.3 changes `partyLevel()` "so the level-10 gates" are not dragged down. A guest joins a level above the party, so she would raise it, not drag it. Fix: pick one level source for dock and region gates.

27. **§6 vs design/05 and design/01 on the rented skiff.**
    - 05 says "hire at any dock, levels 1–10, Verdant Wilds and Mirrordeep". The spec allows hire only after beat 7 (about level 6), has no hire post at Fawnrest, and leaves Mirrordeep out.
    - 01 says "a rented skiff to level 10", while the spec expects optional content to reach levels 11-12.
    - Fix: either write these as decided changes in 05 ("hire opens with Aldric's licence; Mirrordeep routes in T3"), or put a hire post at Fawnrest.

**D. Canon and word guard**

28. **§5 names.** `c1-runner-camp` gives `tallyknife`, whose text says "Tallyman veterans", "Final Tally" and "The Tallymen swear…". Its map power `cut-the-tally` also opens `tally-seal` locks, so th-mw-ledger-door would open early. `lightfingers` says "Tallyman ledger-seals", and `LOCKS['tally-seal'].text` says "A Tallyman ledger-seal". Fixes:
    - Make Thareia copies of tallyknife and lightfingers (or name them in §5).
    - Do not use `tally-seal` for th-mw-ledger-door.
    - Extend test 11 to check relic, lock and encounter text, not only dialogue.
    - S6's briarmaw carries thornwreath, whose text says "Briarmaw", while the quest is called "Nobody Can Name". Rename it or rewrite the text.

29. **§5.2 vs c1-gloamwing: two Fawnrest bells.** The boss drops "the shrine's lost bell", but gloamwing's dawnbell says "Rings the Fawnrest bell". Rewrite one.

**E. Work-package file overlaps and missing owners**

30. **`src/rules/world.js`.** B's map behaviour (items 1–3) needs it, and D lists it as "if zones…". Give it to one WP only.

31. **WP A's other files.** WP A also needs `src/data/quests.js` (to merge the new `thareia/quests.js`), `src/ui/world/story-fx.js` (item 7), and T1's `th-landing` node (item 13). WP A's guest join reads `HEROES.taela.guestLevel` from WP C, so the table's "depends on nothing" is wrong.

32. **WP D's sim mode.** It needs `tools/sim.mjs` (`--route=thareia-c1`), which is not in its file list.

33. **`tools/build.mjs`.** WP B edits the paint list, and WP G's paint-import for the new `th-fawnrest-node` painting will likely touch the same list. Say who owns `tools/build.mjs`.

34. **WP B changing th-thornhollow exits.** This touches T1 assertions in `test/thareia.test.mjs` (the sealed-text loop, rows equal at line 72), which is WP F's file. Note that B must keep them green, or hand the change to F.

**Coverage.** Every Chapter 1 beat in design/05 is covered: Aldric nervous about his buyers, Taela and the water table, the shard glowing, Mosswatch and the Fjords smugglers (S1), Fawnrest's unknown stonework, the node, the corrupted guardian, the Rot slowing, and "Someone should tell the Keep." Apart from items 22, 28 and 29, I found nothing that contradicts the compendium.