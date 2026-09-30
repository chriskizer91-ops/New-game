# 01 — Brainstorm log

Decisions from the design conversation, newest last. "Settled" means the player said so. "Open" means still to discuss.
Nothing here is built yet.

## Settled (2026-09-30)

**The game**
- A **new hero and a full party**, starting where Sedrin starts (the Gloomfen, the same 18 months before the Approach).
  They **cross paths with Sedrin** at the beginning and a few more times. Everything tagged [PLAYED] in the compendium
  stays true; the party works around it.
- The party is **not all human-looking**: drawn from the canon's peoples (lizardfolk, bugbear, halfling, dwarf, gnome,
  Aurosi elf, tiefling, dragonborn, half-orc, goliath).
- **No mount.** The airship is the party's "mount".
- **The game reaches Auros.**
- **Max level 50**, as in the current game.

**Travel (the FF9 model)**
- **One big painted map per region**, seen from high up, low detail. On it the party shows as one tiny figure on foot, or
  as an airship.
- **Leaving a town by its gate:** walk the region's map and meet beasts and bandits.
- **Leaving a town by its airship dock:** fly between locations.
- **Airship travel comes early.** The first flight may be the way to leave the starting area safely and reach the
  low-level foe area.
- **Areas are gated by level**: for example, the level 10–20 area opens only at level 10.

**Maps (the player will paint them)**
- One view of the whole Aethermoor continent, plus **six closer views of the same continent**, still from high up. The six
  are the regions.

**Battles and loot**
- **Keep the current game's fight and loot mechanics and look**: turn-based, with the same items and effects code.
- **Enemies wear loot, and so do the players.** You see the gear on the foe, win it, and see it on your hero. This is
  one of the best parts of the original game.

**The continent (2026-09-30)**
- The player's continent painting is in `../art-in/continent/`. Its six crops set the **six regions**: the Verdant
  Wilds, Mirrordeep and the Keep, the Ironspire, the Gloomfen, the Southern Lowlands and the
  Sunscorch. Each region gets its own 1536 × 1024 painting (see `02-art-and-budget.md`).

**Delivery, detail, music and the airship (2026-09-30)**
- **One single file** (about 30 MB), as detailed as it can be made within that.
- **Music:** the player makes the songs (Suno) and sends them labelled. Sound effects are made in code, as in the current
  game. See `03-airship-and-music.md`.
- **The airship** is a small painted image in a few views, brought to life with code. See `03-airship-and-music.md`.
- **The six region paintings** arrived (`../art-in/regions/`); the south-centre region is the **Southern Lowlands**.

**Music, the airship's systems and the quality bar (2026-09-30)**
- ~~**Two songs**: one for battle, one for everything else.~~ Replaced below: music is made in code.
- **The airship does all of it**: upgrades in the four canon parts (hull, sunstone array, heat source, steering; the array
  carries the level gates), sunstone charge recharged at docks, sky battles on deck with the same battle system (the ship
  adds one action a round; sky raiders, Aether serpents), the ship as home (rest, save, swap party, store gear), cargo
  runs, spotting glints and hidden places from the air, Aether weather (storms, Luminal tides, the Doldrums), the
  crossing to Auros in its five stages, and two or three ships over the game (a skiff, a larger ship, the Aethership).
- **The first ship's turnaround sheet** and **the Auros painting** arrived (`../art-in/airship/`, `../art-in/auros/`).
- **Walking zooms into the region paintings.**
- **The quality bar is Final Fantasy IX** in scope and feel; the look is retro pixel characters on painted backgrounds
  (see below). The battle content and coded gameplay of the current game are the base.
- The player wants an **image-generation AI connected** so image requests can be made directly.

**After the phone test (2026-09-30): the look and the travel layers**
- **Lean into retro pixel characters on painted backgrounds.** The 2× and 3× sprites were tested and rejected: they
  look clunky, not better.
  - **Walking** (fields, towns): the old **16 × 24** walker. Towns are **top-down**, as in the current game.
  - **Battles and building interiors:** the current **64 × 64** battle rig at 1×.
  - Gear still shows on both, as now.
- **Cut-scenes are painted images of events**, not of the party (their outfits change).
- **A full story**, told through those scenes and the game's dialogue.
- **Travel works in layers:**
  1. **World map** (the whole continent painting): long-distance auto-travel. Tap a place you have been and watch the
     airship fly there.
  2. **Region map at 1× zoom:** pilot the skiff yourself for normal travel; land at docks and clearings.
  3. **Closer walking views:** new, closer paintings for walking the wilds with the 16 × 24 walker (beasts, bandits).
     The region paintings alone are too far away for walking.
  4. **Towns and dungeons:** top-down maps with the 16 × 24 walker.

**Music (2026-09-30): code only**
- **No recorded songs.** All music is made in code, as in the old game, and made richer (see
  `03-airship-and-music.md`). The old game's whole sound system, every effect and all 12 songs, is 36 KB; one recorded
  song costs about 3.3 MB inside the file.

**Story (2026-09-30):** the main quest line is `05-story-and-quests.md`. The antagonist is **the Unwaning**, an Aurosi
faction harvesting Thareia's crystal energy forever; the ending is the player's choice; the party is Taela, Twick,
Delva, Renn and Veyra, with the player's own hero.

**Level gates and ships (2026-09-30):** zones are **hard-locked** by level **and** ship. A free ticket first, a rented
skiff to level 10, then your own ships at levels 10, 20, 30 and 40 (the skiff, the refitted skiff, the cruiser, the
Aethership). All four ship sheets are in `../art-in/airship/`. Details in `05-story-and-quests.md`.

## Open
- **The walking views:** how many per region, and how they connect (they cost the most space; see below).
- **The Southern Lowlands:** what lives there (the canon has no named places on the south shore).
- **Level bands:** how levels 1–50 spread across the six regions, the crossing to Auros, and Auros itself.
- **Sunstone fuel:** how much of a resource it is.
