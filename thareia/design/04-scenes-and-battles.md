# 04 — Scenes: walking maps, battle backdrops and cut-scenes

## What arrived (2026-09-30)

Fifteen paintings, in `../art-in/scenes/`, sorted by the job each can do:

| Job | Paintings | Camera |
|---|---|---|
| **Walking maps** (towns, fields, dungeons) | `town-square`, `walk-stream-and-ruins`, `dungeon-temple-courtyard`, `walk-graveyard-path-night` | angled from above (three-quarter) |
| **Walking maps, already walkable in the old game** | `walk-top-stone-bridge`, `-forest-ruin`, `-palisade-camp`, `-meadow`, `-waterfall`, `-plank-bridge` | straight down |
| **Battle backdrops** | `battle-forest-ruins`, `battle-temple-hall`, `battle-dark-cathedral`, `battle-graveyard-night` | from the side, open floor in front |
| **Cut-scene or establishing shot** | `cut-town-at-sunset` | a wide vista |

The six straight-down paintings are byte for byte the ones the player sent the old game (`art-in/extra/path-*.png` on
`claude/cool-ptolemy-uc93gg`); there they are already traced into walkable maps (the Old Bridge, Plankford, Drystone Lea,
Shrinewood, Silverfall and the Last Camp).

## What the old game already does that this needs

- **Walking the 16 × 24 party over a painting:** a painted map draws its painting as the ground, with a traced grid of
  where you can walk and "overhang" areas where the party passes behind canopies and roofs (`tools/paint-import.mjs`).
- **Battles:** the battle stage draws its background through one function (`renderBackdrop` in `art/scenes.js`), so a
  painted backdrop is a contained change. Foes and party still stand where they do now; the painting's open floor is
  where they stand.
- **Touching things:** signs, people, chests and foes standing on the road are all map entities already; stepping onto
  or tapping one starts a talk, a pickup or a fight.

## Size (measured as WebP)

| Kind | Size |
|---|---|
| A walking map at full size (1448 × 1086), quality 80 | about 410–430 KB |
| A battle backdrop at 1024 wide, quality 80 (it sits behind the battle, so full size is not needed) | about 180–260 KB |

**Budget in one 30 MB file** (about 22 MB of real content): code about 3.5 MB, two songs about 5 MB, the world, six
region and Auros maps about 4.2 MB. That leaves about 10 MB for scenes, for example:
- about 16 walking maps (towns, fields, dungeons), about 6.7 MB;
- about 10 battle backdrops, about 2.3 MB;
- about 4 cut-scenes, about 1 MB.

## Open
- **One camera for walking maps:** the new three-quarter view (`town-square`) or the old straight-down view. Mixing the
  two in one game may feel uneven.
- **Which places get walking maps**, within about 16.
