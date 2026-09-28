# P7a: Hilda's forge and the card UI (M4)

Package P7a of M4 (spec §5.1, §5.3, driving §4.1-§4.6). No git was run; only P7a's files were edited.

## What I built

**`src/ui/world/sheets.js`** (`openForge`, `openShop`, `showSpoils`; the rest of the file is untouched)
- `openForge(ctx, { game, tab })` replaces M3's Temper-only sheet and still resolves with the new game (the
  world screen saves it and plays its showoffs, as before). Every change goes through `rules/forge.js`.
  - Tabs **Temper · Reroll · Salvage · Gems · Awaken**: 44 px each. On a phone they scroll sideways and
    the chosen tab scrolls into view; from 560 px they share the width. A dot on Awaken marks a relic
    that is ready.
  - The purse and pouch strip: gold, scrap, silver, embers, and each gem you carry. On a phone a gem
    shows as its icon and count only; the name is in its title.
  - Hilda's line for each tab. The eligible pieces: what the party wears (hero by hero, slot by slot),
    then the bag, rarest first. Each row has a thumbnail, name (+temper), rarity, bearer and a badge:
    the temper, the trait count, what salvage gives back, socket dots, or deed pips with "Ready".
  - The selected piece's card preview: a rarity frame, the portrait (64 px on a phone, 128 px wider),
    the name, type and bearer, and **See card**. See card opens the full card as a read-only snapshot of
    the forge's own game (`cardInspect(item, { game })`), so the Chronicle can be read before the forge
    closes.
  - **Temper**: the flames (+1 to +10, the next one blinking, a new one flaring as it lights), the
    numbers before and after, and which materials the next step needs ("The step to +4 needs 1 silver
    as well as gold."). Each cost part shows what you have, and a part you are short of turns red. The
    rules' refusal shows under the button. The rules run once as a dry run for the refusal; nothing is
    kept.
  - **Reroll**: tap one trait row, then reroll. The new trait slides in with its quality stars (loot.js
    `affixText`, `affixQuality`), and the old one stays struck through as "was: …". The page notes how
    many times the piece has been rerolled. An unidentified piece asks to be identified first.
  - **Salvage**: lists what comes back (materials, and gems back to the pouch). The button asks once
    for each piece ("Keep it" / "Yes, melt it down", scrolled to the middle of the screen), and a note
    says what the crucible gave back.
  - **Gems**: 52 px socket buttons (a set gem, or an empty dark ring). Tap a socket, then a gem from
    the pouch; the list says what each gem does in this slot. A set gem can be taken out, and after one
    is set the next empty socket is picked. The page shows the setting cost and, when the pouch is
    empty, where to buy gems.
  - **Awaken**: the three deeds with pips and their days, then both branches (path, name, text, stats).
    The open branch can be picked; the other shows the rules' `why` ("Equip it on someone whose path is
    the Heart (Bryn, Sister Alondra)"). Then Hilda's rite (its cost, "Wake it: Hearthfang"). The
    awakened card then opens stamped **Awakened**.
  - Focus stays on the same control after each change (or the piece, or the tab), for the keyboard.
    Done is still the sheet's only `[data-primary]` (e2e-world scenario 9 relies on that).
- `openShop`: a shop's `gems` sell at `GEMS[id].price` through `buyGem`, one row per gem (icon, name,
  what it does in a weapon and in anything else, how many you carry) plus a pouch strip. Consumable
  shops are unchanged.
- `showSpoils` (the Rout strip): adds the forge spoils, the deeds done, a relic Kindled or ready ("Hilda
  can wake it") and a finished page, when the report has them.
- The sheets that can outgrow the screen (forge, shop, spoils) stay scrollable from the top on a phone
  and centred on a laptop without cutting off their top (a `margin: auto` fix in forge.css). The forge
  goes two columns (list | detail, 960 px wide) from 860 px.

**`src/ui/card.js`** (the reveal, flip, slam and stamp timing are untouched)
- Below the portrait, a forge block: the socket row (gems in their colours, empty sockets as dark rings,
  what the gems do), the temper flames (ten; two rows of five at 420 px and below), and for a relic its
  three deed pips, its stage line ("Kindled · 2 of 3 deeds", "Kindled · 3 of 3 deeds · Hilda can wake
  it", "Awakened · Hearthfang"), the deed names, and the Kindled bonus or the branch's text.
- The M3 Chronicle row gains a **Chronicle** button, which turns the card over (the content flips; the
  frame's own reveal animation is never touched). The back shows foes felled (`chronicle.kills`), the
  mightiest kill, everyone who has carried it (`chronicle.bearers` as hero names, plus the wearer for
  older saves), the deeds with their days, the **Grudge settled** stamp (`provenance.grudge`, or M3's
  `stamp: 'grudge-settled'`) with the Grudge's name, the provenance ribbon, and **Turn it back**.
- The picker's compare numbers include the Codex pages' bonus (`compare(..., pageBonus(game))`).
- `cardInspect(item, { game })` shows a read-only snapshot: nothing it does is saved, and identify and
  the picker are off. A new `.stamp.st-awakened` style is in card.css.

**`src/ui/lib/items.js`**: shared helpers for the forge UI. `socketList`, `blockLines` (a gem's or
branch's stats in words), `gemText`, `gemBothText`, `kindledText`, `stageInfo`, `chronicleOf`,
`costText`, `countsText`, `reportNews` (the report's deeds, kindled, ready, materials, gems and pages),
`flamesEl`/`flameEl` (a temper flame drawn in pixels), `gemIconEl`/`matIconEl`. The icon helpers use the
art's `gemIcon` / `materialIcon` when `src/art/index.js` exports them (they have landed, and the shots use
them), and otherwise a pixel stand-in in the gem's colour. `verdict()` compares with the page bonus.
`mainStat` now shows a relic weapon's or armour's full own bonus (its numbers, temper, gems, Kindled,
branch), so "+7 to hit and damage" matches the rules.

**`src/ui/screens/aftermath.js`**: a finished Codex page as a banner ("The Hearth Codex / Page I complete:
The Verdant Oath / +5% max HP for every hero."), a **Deeds** panel ("The Warden's Seal: First Blood",
"… is Kindled: +5 max HP.", "… has done all three deeds. Hilda can wake it."), and a **For the forge**
panel with the materials and gems won.

**`src/ui/screens/party.js`**: every number comes from `heroStats` (the tabs' HP bars too), and a
"Codex · Page I" box names each finished page's bonus. The bag's compare arrows include the bonus.

**`src/ui/forge.css`** (new, imported by sheets.js): the forge, the gem shop, the Rout strip's news, the
aftermath's banner and panels, and the Party page box. Its selectors are scoped so they win over the M3
forge rules still in world.css.

**`tools/e2e-flow.mjs`**
- M4 counts from the data (the lead's request): the Ladder (`LADDER.length`, with at least every rumour a
  silhouette), the Keys list (every lock type in `LOCK_IDS`, each with at least two key marks), the
  Continue sub-line and the carry-over card (`/${RELIC_TOTAL}`). The Codex check (about line 314) and
  the Atlas Wilds check (about line 417) are left for the lead, as asked.
- New section **K**, at both sizes:
  - Buy a Sunstone from Idris through his dialogue.
  - Open Hilda's forge from her dialogue. Temper the starter to +4, checking that the +4 step asks for
    silver.
  - Reroll a trait on a seeded tempered sword (it slides in with its stars).
  - Salvage seeded boots (asked once; +2 scrap).
  - Set the bought gem.
  - Awaken the starter (seeded with its three deeds), after checking that both branches show and the
    closed one names the Heart.
  - Check that every change reaches the world's saved game.
  - On the Party screen's card: the sockets, the four flames, the three pips and "Awakened · …". Then
    its Chronicle side: 7 felled, Briarmaw, "Tess, Pip", Grudge settled, the ribbon. Then turn it back.
  - Force a Sunscorch win (`vault-guard`) with every Page I relic claimed and the Warden's Seal on Pip.
    Check the page banner, the deed and Kindled lines, +3 scrap and +1 Ash Garnet, and
    `flags.pages.verdant`.
  - Check that the Party screen's HP equals `heroStats` (the page bonus included) and shows the page box.
  - Check for horizontal scroll on every new screen.

## Screenshots (read at both sizes)

`/tmp/aeth-p7a/shots/{phone,laptop}-NN-*.png` (private build `/tmp/aeth-p7a/aethermoor.html`):
- `23-idris`
- `24-forge-temper`, `25-forge-reroll`, `26-forge-salvage`, `27-forge-gems`, `28-forge-awaken`
- `29-forge-awakened-card`, `30-card-forgebits`, `31-card-chronicle`
- `32-aftermath-page`, `33-party-page-bonus`

What I fixed after reading them:
- The forge card's rarity frame lost to specificity.
- The salvage badge was too wide on a phone; it is now icons with counts.
- The confirm box was hidden under the toast.
- The purse took three lines on a phone.
- The deed row's `st-awakened` class clashed with the new stamp style; the stage classes are now
  `stage-*`.
- The stage line is on its own line.
- The gem shop no longer shows the gold twice.

## Test results (exact)

- `npm test`: 265 tests, 262 pass, 3 fail. All 3 failures are in `test/art-keys.test.mjs` (P6's
  in-progress art, not mine):
  - "every foe family and variant art key resolves…" (brask still draws a stand-in)
  - "the Sunscorch champions draw each piece…" (kharzul's pieces)
  - "every encounter and patrol backdrop… has a painter" (no backdrop sun-road)
- `npm run lint`: clean (0 problems, whole repo).
- `e2e-flow` (`AETH_HTML=/tmp/aeth-p7a/aethermoor.html`, both sizes): FINAL_E2E_RESULT
- `e2e-world --scenario=3,9` (the Rout spoils strip and M3's Temper test, which drive my sheets): passed
  at both sizes, with no console errors.

## What is left

- The Codex binder (P7b) could open its cards with `cardInspect(item, { stamps: [{ kind: 'awakened',
  text: 'Awakened' }] })` for an Awakened pocket; the stamp style exists.
- The forge does not reforge shattered relics; that stays on the Party screen, as in M3.

## Needs from others

- **The lead**: the e2e-flow Codex check (about line 314) and Atlas Wilds check (about line 417) still use
  M3 numbers, as agreed. The Codex check fails at both sizes until P7b's binder lands.
- **P7b (world.css)**: the M3 forge rules in world.css (`.forge-list`, `.forge-item`, `.forge-card`,
  `.forge-nums`, `.forge-line`, `.forge-hint`, `.forge-max`) are now overridden by forge.css. They can be
  deleted whenever convenient; nothing depends on them.
- **P6**: nothing blocking. `gemIcon(id, { size })` and `materialIcon(id, { size })` are picked up
  dynamically. A temper flame icon is drawn in `lib/items.js`; if P6 wants its own, export
  `temperFlameIcon(state)` and I will switch to it.
- **P3**: Hilda's forge choice still reads "Temper something."; e2e-flow matches `/Temper/`, and Idris's
  matches `/gem/i`.
