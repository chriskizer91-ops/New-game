# 02 — Art plan and size budget

## What arrived (2026-09-30)

`../art-in/continent/`: one continuous 1536 × 1024 painting of Aethermoor, and six 512 × 512 crops of it (3 columns × 2
rows, see `assembly.json`). The painting matches the canon layout: the Wilds west and north-west, the Ironspire
north-east, the Sunscorch east and south-east, the Gloomfen south-west, and Hearthstone Keep on its island in Mirrordeep
with a bridge to the south-west.

**Use:** the complete painting is the **continent view**: the airship's world map and the title backdrop.

**The problem with the six crops:** the image generator's native size is 1536 × 1024, so each crop is only 512 × 512 of
the same pixels. Cutting a painting up does not add detail. Blown up to fill a phone and scrolled as a walkable region,
a crop looks soft. **Each region needs its own painting at 1536 × 1024**, made with the complete painting and that
region's crop as references. That gives three times the detail per region.

## The six regions (following the crops)

| # | Crop | Region | Places the painting must show (small, painted, not icons) |
|---|---|---|---|
| 1 | North-west | **The Verdant Wilds** | Eldergrove (roofs among giant trees, deep forest), Thornhollow (trading town on the lakeshore, with an airship mast), Mosswatch Tower (hilltop above the west coast), Fawnrest Shrine (clearing, old stones), the Drowned Fjords (narrow flooded inlets on the west coast) |
| 2 | North-centre | **Mirrordeep and Hearthstone Keep** | The Keep on its island, the Sunken Steps into the water, the stone bridge south-west, docks and an airship mast, the northern highlands and lakeshore villages |
| 3 | North-east | **The Ironspire Peaks** | Ironhold (fortress in the mountainside, forge smoke, an airship dock), Peak's Veil (monastery near the snow line), Stormwatch (outpost on the highest reachable peak), Frostmere (high glacial lake), amber sunstone veins in cliff faces |
| 4 | South-west | **The Gloomfen Marsh** | Bogmire (stilt town, long boardwalks, a small airship mast), Rotbridge (long wooden bridge over the main channel), Willowmurk (hidden in reeds and roots), Misthollow Ruins (half-sunk stone), the Tidal Flats (mudflats meeting the sea) |
| 5 | South-centre | **The Southern Reaches** (name to settle) | Meadows, pasture and drowned valleys on Mirrordeep's south shore, stone shepherds' huts, the coast. The canon has no named places here yet: the region's content is ours to design. |
| 6 | South-east | **The Sunscorch Wastes** | Sandspire (city round a giant stone column, busy airship docks), Dusthaven (mining town in a deep canyon), Miragewell (palm oasis), Scorchgate Ruins (half-buried city), walled Cistern Lord estates |

## Image prompts

### A. Region painting (one per region; fill in the brackets)

Attach two images: **(1)** `Aethermoor-Complete-Map.png` and **(2)** that region's crop (for example
`Aethermoor-04-Southwest.png`).

```
A hand-painted fantasy game overworld map of ONE region of a continent, seen from high above at a steep oblique angle, as if from an airship.

Image 1 is the whole continent. Image 2 is the exact part of it this painting shows. Paint that same area, much closer and with far more detail: keep its coastline, rivers, lakes, mountains and biome borders where image 2 has them, and continue the land naturally to all four edges of the canvas. Same painting style, same projection and camera angle, same warm late-afternoon light from the upper left with consistent shadows, as image 1.

The region: [REGION NAME]. [ONE SENTENCE ON ITS LAND, e.g. "Low-lying wetland: winding dark channels, reed beds, mossy islands and flooded forest, with mudflats where it meets the sea."]

Show these places as small, grounded, painted details inside the landscape, never as icons or labels:
- [PLACE]: [WHAT IT LOOKS LIKE]
- [PLACE]: [WHAT IT LOOKS LIKE]
- (one line per place from the table)

Every town with an airship dock has a tall wooden or stone mooring mast with a small sailing airship tied to it. Airships are wooden hulls hung beneath amber crystal arrays, with small sails and rudders; no balloons.

Readable roads, trails, bridges and fords connect the places and follow the terrain, so a traveller could walk between them. Leave open ground between places for travel.

Style: richly detailed gouache-and-oil fantasy landscape illustration, sculpted terrain, lush nuanced foliage, craggy stone, clear water. Clean readable forms, no paper texture, no heavy hatching, no noise.

No text, labels, borders, frames, grid, compass, UI, sky, horizon line, or clouds covering the land.

Landscape 3:2, 1536 x 1024.
```

### B. Auros, the continent view

No reference image needed. Built from the compendium's Auros art brief, but made to work as a playable map.

```
A hand-painted fantasy game overworld map of a small world's visible face, seen from high above at a steep oblique angle, as if from an airship, in the same painterly style as a richly detailed gouache-and-oil fantasy landscape illustration.

The world is Auros, a small, warm, amber-gold moon with low gravity and a breathable golden atmosphere. This is someone's home, not an alien wasteland. Show:
- The Pale Reaches, about 40% of the land: windswept silver-white plains of glowing silver grass.
- Two or three Spire Forests, about 20%: clusters of tree-to-tower-height amber crystal pillars, part living and part mineral, some branching near the top.
- Four or five craters. Some hold blue-green lakes, one has a city built into its walls, and one is darker, deeper and older than the rest.
- The Brightlands near the centre: a warm glowing city region of crystal-laced buildings joined by elevated walkways, with a large airship port.
- Two or three low mountain ranges with gold-tinted snow.
- Light, graceful trees, and many small airships in the air near the city.

Warm amber, gold and silver palette with blue-green lake accents. Readable roads and walkways connect the places.

No oceans, no Earth-green jungle, no ice caps, nothing hostile. No text, labels, borders, frames, UI, or stars.

Landscape 3:2, 1536 x 1024.
```

Nothing else is needed yet. Town and dungeon maps, portraits and cut-scenes come after we place towns, docks and routes
on the region paintings.

## Size budget

The game ships as one HTML file of about 30 MB, so every image is stored inside it as text, which adds a third to its
size. Measured on the continent painting:

| Format | Size |
|---|---|
| PNG, as supplied (1536 × 1024) | 4.2 MB |
| WebP quality 80 (1536 × 1024) | about 550 KB, with no visible loss |
| WebP quality 80 (1024 × 683) | about 260 KB |

**Proposed budget for a 30 MB file:**

| Part | Budget |
|---|---|
| Code and game data | 3–5 MB. The whole current game, code and data, is about 2.7 MB, so 10 MB is far more than needed. |
| Continent views (Aethermoor and Auros) and 6 region paintings | about 5 MB |
| Town, dungeon and Auros maps (about 30 at 250–400 KB) | about 10 MB |
| Portraits, cut-scenes and title art | about 3 MB |
| Room for text encoding and growth | the rest |

**An alternative to decide on:** publish the game as a page with its images as separate files, loaded when needed. The
30 MB limit then disappears (each file can be up to 16 MB, and a page can hold hundreds). The cost: it needs an internet
connection instead of being one file you keep.
