# P7b: the Codex binder, the Journal's Grudges, the Atlas, the world screen, the desert music

Package P7b of M4 (spec §5.2, §5.4, the §4.6 Journal tab). No git was run. Only my files were edited:
`src/ui/screens/codex.js`, `src/ui/screens/journal.js`, `src/ui/screens/atlas.js`, `src/ui/lib/atlas-geo.js`,
`src/ui/screens/world.js`, `src/ui/world/actors.js`, `src/ui/world/story-fx.js`, `src/core/audio.js`,
`src/ui/screens.css`, `src/ui/world.css`, `tools/e2e-world.mjs`, `test/shell.test.mjs`. There is no
`codex.css`: the binder's styles live in `screens.css`, so `codex.js` still imports in node and the
shell test can run its view model.

## What I built

**The Codex binder** (`ui/screens/codex.js`; `screens.css` "M4: the Codex binder")
- Page tabs I · II · III · IV (`.cx-tab[data-page]`, 44 px+, digit keys 1-4). Open pages show the region
  and a count ("Verdant 1/22"), and a tick once finished. Sealed pages (III Ironspire, IV Gloomfen) show a
  padlock and the region's name, and open a sealed panel that quotes the region's closed roads (the
  Keep's `sealed` exits) instead of pockets.
- Each open page has its progress from `pageProgress` ("1 of 22 claimed, 3 sighted", plus "N awakened"),
  a bar, and its reward line (`.cx-reward[data-earned]`): dashed and grey until earned, then gold with
  "Earned · Day N" (from `flags.pages`, or just "Earned" while only `pageProgress.done` says so).
- The pockets are in Codex order and use M3's layout: the portrait, the name, and a riddle while
  unsighted, the holder while sighted, and the three stamps (Sighted, Claimed, Awakened). An Awakened
  pocket glows (the `cxGlow` animation, off under reduced motion) and its stamp burns. The starters you
  did not choose are marked "Stays in the Keep" / "Tamsin's: only ever lent", and the page does not
  count them (Page I needs 22). Tapping a pocket opens M3's card detail: silhouette, grey held card, or
  your own.
- The page opens on `params.page`, else on the page picked earlier this session in the same region, else
  on the page of the region you stand in (Page II in the Sunscorch). M3's stamp legend stays in the
  footer; its last sentence now counts woken relics.
- Pure exports for node: `binderPage(game, pageId)`, `defaultPage(game)`, `RIDDLES` and `HOLDER` (all 38
  relics, the 14 Sunscorch riddles are new).

**The Journal** (`ui/screens/journal.js`)
- Fifth tab, **Grudges** (`.jr-tab[data-tab="grudges"]`), built from `grudgeView(game)` (pure, exported).
  - Unsettled Grudges come first, one card each: the name and title, "Beat you twice" / "You fled once",
    where (`ENCOUNTERS[nodeId].place` and the map's name), each Omen by name with its text
    (`data/omens.js`), and whether it hunts you (a pack) or holds its ground (a lair or block).
  - Settled Grudges follow, with their day and a "Settled" stamp.
  - The empty states: no Grudges at all; nobody waiting; none settled yet.
  - Every saved string goes in through `textContent`. The e2e checks this with a `<b>` in a name.
- Bounties: one group per board, Dael's (Thornhollow) and Zara's (Sandspire). Zara's board shows once the
  Sunscorch is open, or once you have met Zara or finished one of her bounties. "Ready: turn in to"
  names the bounty's `giver` (`NPCS[b.giver].name`).
- Ladder: the lede counts every poster that is not a rumour ("0 of 25 settled").
- Keys: the lede now says "two keys or more". The story seals add "The road to the Sunscorch Wastes"
  (sealed, then open after Act I) and "The roads beyond" (Ironspire, Gloomfen).
- Quests: rewards list gems and materials by name ("150 gold and 2 Glass Pearls").

**The Atlas** (`ui/screens/atlas.js`, `ui/lib/atlas-geo.js`)
- A third view, **Sunscorch** (`VIEWS.sunscorch` = x 540, y 350, w 600, h 400: from the Keep's
  south-east shore to Miragewell and the Vaults). Each region view shows only its own Hearthfires. The
  Realm view shows all of them on a laptop; on a phone it shows one marker per open region, and a tap
  switches to that region's view. Travel and phones open on the view of the region you stand in; a
  view picked this session sticks.
- `regionOpen(game, id)`: a region is open when `REGIONS` says so and one of its entry exits can be
  walked. The Keep's south-east gate `gate` holds after Act I, so the Sunscorch padlock comes off then.
  Until then the Sunscorch is sealed: the padlock is on Sandspire, its fires and routes are hidden, and
  its note reads "The Keep's south-east gate opens once both Brands of the Wilds are yours."
- Places: on a laptop the marker labels name the place a fire stands in (Sandspire, Dusthaven,
  Miragewell, Scorchgate Ruins), else the fire itself. The Realm view's place names skip spots where
  a marker already stands. `placeOf(mapId)` names a dungeon after the place it lies under.
- "You are here" works for every new map through its `lore` (and projects onto bent and branching
  routes). Travel works to any kindled fire.
- The Hearthfire list is grouped by region (`.atlas-grp[data-region]`), your region first. The cold-fire
  note lists the real keys ("Kindle, Lamplight, Sunlight, Heartglow or Attunement 3").

**The world screen** (`ui/screens/world.js`, `ui/world/actors.js`)
- A Grudge hunter's "!" is red: the `alert` event's `hunter` flag, and a hunter's contact. It shows as
  emote kind `'!hunt'`, the "!" sprite recoloured in `actors.js` (a red bubble with a cream mark).
  Screen readers hear "A Grudge has seen you". The Nearby list says "hunting you" and shows the title.
- Story events: gold, `gems` and `materials` become one toast by their data names ("+150 gold · 1 silver
  · Glass Pearl ×2"). `page` toasts the page and its reward ("Codex Page II complete: The Sunscorch
  Compact. +1 to hit…"). A chest's materials and gems join its toast. Every toast is also announced.
- `{ t: 'end', act }` is passed through to `showToBeContinued(ctx, game, { act })`. The second council
  (`council-2`) plays its own title card, "The Council sits again · Four coals…".
- The Keep's south-east gate's sealed message adds "The gate opens once both Brands of the Wilds are
  yours." New A-button verbs for the four new lock types. The lookout line fits the desert.
- Test seam: `window.__world.story(events)` runs story events through the real handler, and
  `window.__world.emotes()` lists the emotes on screen.

**Story cards** (`ui/world/story-fx.js`; `world.css`)
- End of Act II: "The Sunscorch is yours · To be continued · End of Act II". It shows Day, Relics, Brands
  and Pages, chips for the next chapter's regions (every region still sealed in `data/world.js`), and
  "Ironspire and Gloomfen open in the next chapter."
- The Act I card now points at the open gate ("The Keep's south-east gate stands open…").
- The Brand banner names the Brand's own region ("Every foe in the Sunscorch Wastes re-arms").
- `loreAt` (the crownwall seals) delegates to `atlas-geo.js`.

**Music** (`core/audio.js`): a `desert` track. It is a slow flute melody in the Hijaz mode on D over a
held pad drone and a walking low string, with an oud-like pluck and a maqsum on a new hand drum
(`d` doum, `t` tek, `a` ka).

**Tests** (`test/shell.test.mjs`)
- Existing tests extended: every map's lore is inside the 1200×800 viewBox; "you are here" lands on the
  route for the middle and all four corners of every map (bent and branching routes too; 2-point
  routes keep the old between-the-ends check); the markers-never-overlap test adds the Sunscorch view;
  `desert` is in the track list.
- New tests: every map's lore and every Hearthfire lie inside their region's view, and every view is
  3:2; `regionOpen` (the Sunscorch opens with Act I); `placeOf`; every map's `music` names a real track;
  the binder's view model (Page I 24/22 with the two spare starters, Page II 14, III and IV sealed, a
  forced full claim earns the reward and dates it from `flags.pages`, `defaultPage`); `grudgeView` over
  the real M2 `v1-grudges` save, the settled order, and junk that must not throw.

**e2e** (`tools/e2e-world.mjs`, scenarios 12-19; routes the cached Google Fonts for real type)
- 12: the Keep's south-east gate is sealed before Act I and opens into the Sunward Road after it. The
  desert track plays there, and the wreck's forge loot toasts by name.
- 13: Sandspire. Rest at the Spire Hearth; Idris's "Buy gems." opens his shop; the board opens Zara's
  bounties; the Atlas's Sunscorch view (7 fires, 2 padlocks, 44 px) travels to the Spire Hearth.
- 14: a dune-glass wall shows ✗, then opens with Cinderfang. The Glass Flats mirage opens with
  Knowledge 5.
- 15: Kharzul's pre-fight card: the Champion, and Cinderfang and the Glass Carapace glinting. The Brand
  line is BLOCKED (P7a).
- 16: the Deep Shaft is dark for a Stillwater party and lit by the Sunstone Lantern.
- 17: Glass Flats performance at 4× throttle. A fight when the walk bumps a pack ends as fled and is
  counted.
- 18: the Codex binder: Page I, the Page II tab, sealed Page III, and a forced full claim that shows
  Page I's reward in gold with a glowing Awakened pocket.
- 19: the Grudges tab (one active, one settled, a saved `<b>` stays text) and its empty state. A real
  Grudge pack is seeded as a hunter and shows the red "!". Then the loot and page toasts, and the
  second council's title card through to the end-of-Act-II card.

## Test results (exact)

(filled in below after the final runs)

## Screenshots

(filled in below)

## What is left

(filled in below)

## Needs from others

(filled in below)
