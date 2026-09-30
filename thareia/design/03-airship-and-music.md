# 03 — The airship, the music, and the region paintings

## The region paintings (arrived 2026-09-30)

`../art-in/regions/`: six paintings at 1536 × 1024, one per region. They measure about 480–590 KB each as WebP
(quality 80), so the six cost about 3.3 MB in the game.

| # | Painting | What it shows that we can place |
|---|---|---|
| 1 | Verdant Wilds | A coastal port with an airship mast (the Drowned Fjords), Mosswatch Tower on its hill, giant trees with houses and a mast (Eldergrove), a palisade town (Thornhollow), Fawnrest's stones with white deer |
| 2 | Northern Heartland and Hearthstone Keep | The Keep on its island with airship docks and the south-west bridge, lakeshore villages, farmland, a walled abbey or manor in the north, waterfalls from the Ironspire |
| 3 | Ironspire Peaks | Ironhold in the mountainside with an airship, a ridge monastery (Peak's Veil), a gatehouse on the road, a steaming coastal hut, desert ruins on the southern edge |
| 4 | Gloomfen Marsh | Two stilt towns with airship masts, long boardwalks, a gatehouse bridge (Rotbridge), sunken ruins (Misthollow), mudflats to the south-east |
| 5 | Southern Lowlands | Farms and hedged fields, ruined chapels and arches, a coastal tower, the marsh's edge in the west and the desert's in the east |
| 6 | Sunscorch Wastes | Sandspire round its stone column with airships, an oasis with a mast (Miragewell), canyon mines (Dusthaven), Scorchgate's ruins, coastal forts |

**Notes for layout:**
- The paintings overlap at their borders (the Ironspire's south edge is desert, the Lowlands' west edge is marsh). Each
  place belongs to one region; a region's edges are exits to its neighbours.
- The painter's airships set the look: a wooden hull with small sails under a cluster of glowing amber crystals.
- Two things to decide when placing towns: which Gloomfen stilt town is Bogmire (the canon's Willowmurk is hidden and has
  no dock), and where Stormwatch and Frostmere sit in the Ironspire painting.

## The airship

The party's airship is its "mount": a painted image in a few views, brought to life with code.

### What the code can add to a painted ship
- **Any heading from one painting:** a straight top-down view can be rotated smoothly to face any direction.
- **Height:** a shadow on the ground below that shrinks and softens as the ship climbs.
- **Life:** a gentle bob and bank into turns, sails that ripple, the crystals pulsing with light, heat shimmer, a trail
  of golden Aether motes, drifting cloud layers above and below.
- **The time of day and weather:** light, fog, storm flashes and the Aether's glow tint the ship with the world.
- **Upgrades you can see:** brighter crystals, new sails, lanterns, trim colour, banners. The same idea as gear showing
  on heroes.

### Things the airship could do (to choose from)
- **Travel:** fly freely over a region's painting; land only at masts and clearings; low and high altitude (high is
  faster but brings Aether weather and, later, needs breathing gear).
- **Upgrades in the canon's four parts:** hull (toughness), sunstone array (lift: which heights and regions it can reach),
  heat source (range between recharges), steering (speed and handling). This is where level gates live: the array that
  clears the Ironspire, the sealed cabin for the crossing.
- **Sunstone charge:** a light fuel. Recharge at docks, buy crystal, or find it.
- **Sky encounters** fought with the same battle system, on deck: sky raiders, Aether serpents, storm-born things. The
  ship adds one action a round (a crystal flare, a broadside, an evasive roll).
- **The ship as home:** rest, save, swap party members, store gear.
- **Crew:** hire a pilot, a crystalsmith or a lookout for bonuses.
- **Trade and jobs:** cargo runs between towns (sunstone prices differ by region), couriers and passengers, in the
  spirit of the canon's first job.
- **Spotting from the air:** glints of relics and hidden places seen from above, a spyglass to scout foes and their gear.
- **Weather from the canon:** Luminal tides, Aether storms, Resonance Cascades, the Doldrums.
- **The crossing to Auros:** a chapter in the canon's five stages (the Ascent, the Brightway, the Veil, the Silver Road,
  the Descent), and different flight in Auros's low gravity.
- **More than one ship over the game:** a small skiff first, a larger ship later, an Aethership for the crossing.

### Image prompt: the first ship (a turnaround sheet)

One image with all views keeps the ship consistent between them. Attach one of the region paintings (for example
`04-Gloomfen-Marsh.png`) so the ship matches the ones painted there.

```
A game asset sheet showing ONE small fantasy airship from four views, in the same painterly gouache-and-oil style and warm light as the attached map painting, and matching the airships painted in it.

The ship: a small wooden sailing hull for a crew of four, built for travel rather than war. Instead of a balloon, a cluster of glowing amber sunstone crystals rises above the deck in a brass-and-timber frame, warm light inside them. A small brazier or furnace below the crystals keeps them hot. Two or three small triangular sails, a stern rudder and side fins, rope rigging, lanterns, patched canvas, a lived-in look.

The four views, evenly spaced in a 2 x 2 grid, each showing the whole ship at the same size:
1. Top left: seen from directly above, the bow pointing straight up.
2. Top right: from the side, the bow pointing right.
3. Bottom left: a three-quarter view from above and in front.
4. Bottom right: from the front.

Plain flat light grey background (#d8d8d8) behind every view, with no shadows cast on it, no ground, no sky, no clouds, no scenery.

No text, labels, borders or frames. Landscape 3:2, 1536 x 1024.
```

## Music

The player makes the songs with Suno and sends them labelled. Sound effects are made in code, as in the current game.

**What helps most:**
- **Instrumental only, no vocals.**
- **About 1.5 to 2.5 minutes each.** The game loops them; a clean ending helps, and the loop point can be found and
  smoothed here.
- **Name each file by its use** (for example `03-flight.mp3`) and send the best quality you have. It gets compressed here.

**Tracks, in order of priority:**

| # | Use | Mood |
|---|---|---|
| 1 | Title and main theme | Wonder, the Moon overhead |
| 2 | Walking the wilds | Calm but interesting (the player has one) |
| 3 | Airship flight | Soaring, open, the best moment of travel |
| 4 | Battle | High energy (the player has one) |
| 5 | Boss battle | Bigger and darker |
| 6 | Town | Warm, lived-in |
| 7 | Ruins and the Ember Line | Tense, a deep hum beneath |
| 8 | Auros | Light, strange, golden |

Later, if the size allows: a theme per region's towns, the crossing, Sedrin's theme, the Warming.

**The size cost of music:** music is the most expensive thing per minute. Compressed for the game, a minute of music is
roughly 0.4 MB, so eight tracks of about 1.5 minutes cost about 5 MB of the 30 MB file. The budget in
`02-art-and-budget.md` is revised below.

## Revised size budget (one 30 MB file)

Pictures and sound stored inside the file grow by a third, so about 22 MB of real content fits.

| Part | Budget |
|---|---|
| Code and game data | 3–4 MB |
| Continent views (Aethermoor, Auros) and six region paintings | about 4.5 MB (measured) |
| Music, about 8 tracks | about 5 MB |
| Town, dungeon and Auros maps (about 20–25) | about 6–7 MB |
| The airship, portraits, cut-scenes, title art | about 2 MB |

The trade-off to watch: every extra minute of music costs about one painted town map.
