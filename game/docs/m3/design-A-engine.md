# Aethermoor M3 "The Verdant Wilds": walkable slice design (engine first)

## 1. Vision

The fixed road becomes a small hand-built world: 13 tile maps you walk in real time with the phone d-pad or WASD. Foes stand on the map wearing the gear you will take from them. Weak foes run from you. Every obstacle has two keys: a relic's map power or a Domain skill.

Nothing the player already loves changes: the battle, the card reveal, the aftermath, the party screen, the codex and the existing saves. The map only decides which fight comes next.

On the engineering side, the world is plain data plus a pure, deterministic step function in `rules/`. That means movement, locks, roaming foes, the save migration and "can Act I be finished?" are all tested in node. The canvas renderer only draws what the rules decide.

Sunscorch, Ironspire and Gloomfen are already visible as five sealed exits and as region rows in the data, so M4 adds them as data, not engine work.

## 2. World layout

### 2.1 Maps

- Tiles are 16×16 px. Sizes are in tiles.
- `lore` is the map's position on the illustrated map (viewBox 1200×800, taken from its `data-location` markers). It is used for "you are here" and fast travel.
- Roaming foe levels are Waking-0 levels. The rules add the Waking on top.
- An asterisk (*) marks a new battle backdrop.

| id | Name | Biome | Size | Lore | Battle backdrop | Roam Lv | Contents |
|---|---|---|---|---|---|---|---|
| `keep` | Hearthstone Keep | keep | 28×22 | 540,390 | hearth-road | — | Eternal Hearth; reliquary (`keep-vault`); war room with the Ladder board; Fenwick, Isolde, Hilda (early); 4 gates |
| `hearth-road` | The Hearth Road North | wilds | 22×60 | 455,330 | hearth-road | 1–3 | `hearth-road`, `waymarker-stones`, `milestone-fire`, `bramble-toll` with its chain gate; a chest in a thornwall glade |
| `greenway` | The Greenway | wilds | 44×32 | 380,290 | verdant-wood | 2–4 | `verdant-edge`, `rotstag-glade` (side clearing), `deer-path-hounds`, Deer Path thornwall |
| `thornhollow` | Thornhollow | town | 30×26 | 310,260 | thornhollow | — | hearth; Dael and the bounty board; Nell's stores; Hilda (mid-game); Dael's lockup strongbox; Tamsin duel (after the Brand); rescued rangers |
| `bramble-deep` | The Bramble-Deep | wilds | 36×44 | 395,215 | verdant-wood | 4–6 | `tally-camp`, `snag-wallow`, `bramble-deep`, den thornwall, `den-mouth`; bramble path to Fawnrest |
| `briarmaw-den` | Briarmaw's Den | den | 18×16 | 420,190 | briarmaw-den | — | `briarmaw-den` |
| `fawnrest` | Fawnrest Shrine | grove | 26×22 | 370,170 | fawnrest* | 4–6 | shrine hearth `fawnrest`; Sister Hesper; white-deer clearing; `deer-trap`; sealed Highfold Path |
| `mossway` | The Mossway | fen | 44×40 | 215,250 | mossway* | 5–7 | `mossway-bog`, `smugglers-lookout`, `smugglers-hollow` (optional, hard); Garret; `mosswatch-foot` hearth; millrace stream; sealed Fen Stair |
| `eldergrove` | Eldergrove | grove | 34×30 | 200,160 | eldergrove* | edges only after the Brand, 3–5 | hearth; Miravel; Yew's herbs; Bryn's house; Hilda (late); root-gate; `rotting-grove` (after the Brand) |
| `mosswatch` | Mosswatch Tower, floors 1–2 | tower | 20×28 | 140,280 | mosswatch* | 5–6 | `mosswatch-stair`; dark cellar chest |
| `mosswatch-top` | The Lamp Room | tower | 14×12 | 140,280 | mosswatch* | — | `mosswatch-lamp`; cold signal brazier |
| `heartroot` | The Heartroot | roots | 36×32 | 200,175 | heartroot* | 4–6 | `heartroot-gallery`, `ichor-warren`, `oakhollow`; `heartroot-hollow` hearth; dark galleries; sap-trail; ichor pools |
| `heartroot-heart` | The Rotwarden's Hollow | roots | 20×18 | 200,175 | heartroot* | — | `rotwarden-heart` |

### 2.2 How the maps connect

- Keep NW gate ↔ south end of the Hearth Road.
- Hearth Road north ↔ Greenway east.
- Greenway west ↔ Thornhollow south gate.
- Greenway north ↔ Fawnrest south, by the Deer Path (thornwall).
- Thornhollow north gate ↔ Bramble-Deep south.
- Bramble-Deep north ↔ Briarmaw's Den, past the den thornwall.
- Bramble-Deep NW ↔ Fawnrest SE (bramble).
- Thornhollow west gate ↔ Mossway east.
- Mossway north ↔ Eldergrove south.
- Mossway tower door ↔ `mosswatch` ↔ (stair) `mosswatch-top`.
- Eldergrove east ↔ Fawnrest west, by the Old Roots path (open).
- Eldergrove root-gate ↔ `heartroot`. This is a story gate: it needs the Brand of Briars.
- `heartroot` ↔ `heartroot-heart` along the sap-trail.

The hubs are the Keep, Thornhollow and Eldergrove. Fawnrest can be reached three ways, so the north-west forms a loop rather than a line.

### 2.3 Where the M2 encounters land

The encounter ids and spawn arrays stay exactly as they are, because grudges and echo salts are keyed on `nodeId#i`. Each map stores a named anchor `v1:<id>`, and the migration uses it to place a v1 save.

| M2 id | Map | Entity tile | v1 anchor |
|---|---|---|---|
| hearthstone-keep | keep | hearth 14,11 | 14,13 |
| keep-vault | keep | Sneck at the reliquary, 14,3 | 14,5 |
| hearth-road | hearth-road | 11,50 | 11,53 |
| waymarker-stones | hearth-road | 9,40 | 10,43 |
| milestone-fire | hearth-road | hearth 12,30 | 12,32 |
| bramble-toll | hearth-road | Skarn 12,10; chain gate 10–14,8 | 12,13 |
| verdant-edge | greenway | 34,18 | 38,18 |
| rotstag-glade | greenway | 24,8 | 24,12 |
| thornhollow | thornhollow | hearth 15,13 | 15,15 |
| tally-camp | bramble-deep | 10,38 | 12,41 |
| snag-wallow | bramble-deep | 28,26 | 26,29 |
| bramble-deep | bramble-deep | 16,14 | 16,18 |
| den-mouth | bramble-deep | hearth 18,5; thornwall 17–19,8 | 18,7 |
| briarmaw-den | briarmaw-den | 9,5 | 9,12 |

Coordinates are targets. WP-C may move them, but a test checks that every anchor is walkable.

### 2.4 Guided start, then open

1. **The Keep.** A new game ends at the Keep hearth. A step trigger, `keep-intro`, plays Fenwick's shout, and Sneck stands at the reliquary glinting with the Seal. The NW gate opens when `{done:'keep-vault'}` is true. The other three gates are sealed.
2. **The Hearth Road.** Fights stand on the road. The Milestone Fire teaches resting and fast travel. The Bramble Toll chain opens when `{cleared:'bramble-toll'}` is true and stays unlocked for good.
3. **The Greenway.** The Rot-Stag's glade is a visible clearing one step off the road. The Deer Path shows a thornwall ("come back with an axe").
4. **Thornhollow.** Dael's bounty starts the main quest. From here everything is open: north to Old Snag and Briarmaw, west to the Mossway, Mosswatch, Eldergrove and the Smugglers' Hollow, and Fawnrest by two routes. The objective marker follows only the main quest.
5. **Brand of Briars.** Briarmaw grants the Brand and the Waking rises by 1. Tamsin now appears at Thornhollow, and Miravel opens the root-gate.
6. **The Heartroot.** The dark galleries need a light: the Midnight Lamp, Kindle (Hearthbrand), or Alondra's Attunement 9. Beating the Rotwarden grants the Brand of the Heartroot and sets `act1-complete`. The Keep's hearth then shows two coals.

**Decision: the party is four from the first step, as in M2.** Pip, Bryn and Alondra reached the Keep the night the hearth flickered, so Thornhollow, Eldergrove and Fawnrest become homecoming scenes. M2's balance, simulator, saves and battle layout all assume four heroes.

Tamsin is "she", as in the shipped prologue.

### 2.5 Sealed exits

Each sealed exit is an `exit` row with `sealed: { region, text }`. Its target map does not exist yet.

| Exit | Map | Region | Text |
|---|---|---|---|
| NE gate | keep | ironspire | "Rockslide on the Ironspire road." |
| SE gate | keep | sunscorch | "The caravan road is shut under the Cistern Lord's seal." |
| SW gate | keep | gloomfen | "Blackwater stands over the causeway." |
| Fen Stair | mossway (south) | gloomfen | "Fog breathes up the stair. Willowmurk's safe paths start below." |
| Highfold Path | fawnrest (east) | ironspire | "Fallen scree, and somewhere past it, a bell." |

- After `act1-complete`, each exit adds: "The way opens in the next chapter."
- `data/world.js` `REGIONS` lists all four regions with their act, lore centre, entry exits and Brand ids. This lets the Realm Map and the Hearth Clock already show "Brands x/8".
- M4 opens a region by adding its maps and replacing `sealed` with `open: {flag:'act1-complete'}`.

## 3. Content

### NPCs

| id | Where | Sample lines |
|---|---|---|
| fenwick | keep | "It flickered, Warden. In all the Keep's records it never once flickered." · after a Brand: "One coal. Hear it? It's humming." |
| isolde | keep, war room | "If Tamsin's taken something that isn't hers, bring her back. If she's taken something that is, bring it back anyway." |
| hilda | keep, then thornhollow, then eldergrove | "Blade's good. You're holding it like a soup ladle, but the blade's good." · "Heat, hammer, patience. Mostly gold." |
| dael | thornhollow | "Thirty names on the roll when I took it. Nine now. Three went out on patrol three days ago." |
| nell | thornhollow (shop) | "No credit. The last lad I gave credit to is on the board." |
| garret | mossway, tower foot | "Lights? There's moss, and there's me, and the moss is winning." (Alondra: "He's lying, and he's frightened of the lie.") |
| miravel | eldergrove | "The eldest trees bleed black from the root. Something down there is drinking them." |
| yew | eldergrove (shop) | "Bitterroot for the Rot. Won't cure it. Makes it sulk." |
| hesper | fawnrest | "The deer left the way deer do: all at once, and then not at all." |
| tamsin | thornhollow, after the Brand | "One Brand. Isolde sent me to 'help'. I'd rather see if it was luck." · after: "Fine. Not luck. Don't let it go to your head." |
| rangers | thornhollow, after the rescue | "Brisk fed us better than Dael does. Don't tell him." |

Villains speak through their encounter `text`, as in M2. The party (pip, bryn, alondra, warden) can speak in any dialogue.

### Foe families: 8 existing plus 10 new = 18

The 6 existing Omens are unchanged. RB means relic-bearer.

| id | Tier | Lv (Waking 0) | Aspect | Signature move | Art |
|---|---|---|---|---|---|
| cutpurse, briarling, thornhound | rabble | 1–5 | —, verdant, — | Bolt / Tangle / Lunge | existing |
| bandit, tallyman | veteran | 1–7 | — | Heavy Swing / Cheat's Cut | existing |
| rotstag, oldsnag | RB | 4, 6 | blight, — | Rotwood Crown / Splitting Charge | existing |
| briarmaw | champion | 7 | verdant | Call the Briars | existing |
| rotling | rabble | 3–7 | blight | Ichor Spit: 1d4 and Poisoned ×2 | briarling builder with an ichor palette |
| ichor-grub | rabble | 4–7 | blight | Latch: 1d6, Bleeding, heals half | new, 48×32 |
| bog-lurcher | rabble | 4–6 | tide | Mire Grab: STR save or Rooted; resists crush | new, 48×48 |
| mosscrow | rabble | 4–7 | storm | Eye-Peck: Frightened; speed 15 | new, 40×40 |
| smuggler | veteran | 5–8 | — | Caltrops: all heroes Bleeding, DEX save | humanoid, gear tiers 0–3 |
| rot-thrall | veteran | 3–8 | blight | Black Sap: every hit Poisons; resists verdant | humanoid with bark gear |
| lamplighter ("Quill") | RB | 5 | radiant | Signal Flare: all heroes Marked, WIS save or Frightened | tallyman rig plus a lantern |
| mother-brisk | RB | 9 | verdant | Longsong Volley: 2d6 piercing to all | bandit rig plus a longbow |
| tamsin | RB (rival) | 4 | her starter's | her starter's Art; Showing Off below 50% (Hasted, crits on 19–20) | hero rig; `wields` her starter |
| rotwarden | champion | 6 | blight | The Mask Speaks | new, 96×96 |

Encounters that exist only after the Brand are authored at their Waking-0 level, so they play about 6 levels higher. Tamsin is effectively Lv 10 and the Rotwarden Lv 12. The balance pass sets the final levels (§7).

### Relics: 12 existing plus 12 new = 24

The breakdown is 3 starters, 3 Thornwatch regalia pieces, and 18 named Heirlooms (including the Warden's Seal and the Tallyknife). Every new relic is an Heirloom with a `power`.

| No. | id | Kind, aspect | Holder | Map power |
|---|---|---|---|---|
| 13 | midnight-lamp | focus, radiant | Quill the Lamplighter (grip 24) | Lamplight: lights dark galleries |
| 14 | longsong | bow, verdant | Mother Brisk (grip 26) | Longshot: walking into a roaming foe gives First Strike |
| 15 | snarewire-gloves | gloves, tide | Hobb Two-Knives, a smuggler veteran (grip 18) | Snarecraft: shows hidden caches |
| 16 | dawnbell | mace, radiant | Hollis Fairweight, the deer-trapper (tallyman veteran, grip 20) | Ring the Dawn: weak roamers scatter; the white deer come home |
| 17 | heartwood-aegis | shield, verdant | Oakhollow, first of the Rot-Thralls (grip 28) | — |
| 18 | ichor-mask | helm, blight | Rotwarden, breakable piece (grip 32) | Rot-Walker: cross ichor pools |
| 19 | sapdrinker | staff, blight | Rotwarden, breakable piece (grip 28) | Draw the Sap: blighted trees turn green (cosmetic) |
| 20 | rotroot-mantle | robe, blight | Rotwarden, breakable piece (grip 30) | — |
| 21 | vale-gauntlets | gauntlets, radiant | Worn by Tamsin; claimed when you win | — |
| 22 | seedwarden-ring | ring, verdant | Gift from Miravel (quest: The Seed Vault) | Seedsong: grows a root-bridge over streams |
| 23 | watchfire-locket | amulet, ember | Gift from Garret (quest: Lights at Midnight) | Beacon: fast travel from anywhere outside dungeons |
| 24 | oathbriar | sword, verdant | Gift from Dael (quest: Three Days Missing) | Thornwatch Oath: gatekeepers wave you through |

Tamsin keeps her starter until Rotbridge (M6). She `wields` it for looks and dice only, with no grip meter and no drop.

### Bosses

**Briarmaw (unchanged).**
- Three phases, at 100%, 66% and 33%.
- Breaking Thornwreath stops Call the Briars. Breaking Briarfang stops Fang Rake.

**The Rotwarden** (Brand `brand-of-rot`, "the Brand of the Heartroot").
- A First-Age warden with bark grown through its plate, and a smith-forged mask marked with a hammer inside a broken ring (Harrow).
- Stats: base HP about 170, Guard 16, bark-plate armour, blight aspect.
- **Phase 1, "The Warden Keeps":**
  - Sap Lash: 2d6 slashing and Poisoned.
  - Draw the Sap (needs Sapdrinker): drains every hero and heals itself.
  - Rotling Brood (needs the Mantle): summons, up to 2.
- **Phase 2, "The Roots Answer" (66%):**
  - Heartroot Quake: all heroes, STR save or Rooted.
  - Ichor Gaze (needs the Mask): WIS save or Frightened, plus Poisoned ×2.
- **Phase 3, "The Mask Speaks" (33%):**
  - Unmaking (needs the Mask): a charged 4d8 blight attack on one hero.
  - Its table is weighted toward attacks.
- **Breaking the pieces:**
  - The mask shuts off Gaze and Unmaking, and the Rotwarden says "Thank you." in its own voice.
  - The staff shuts off the drain.
  - The mantle shuts off the summons and removes its verdant resistance.

**Tamsin (one fight, once only).**
- A solo duel. Her variant is `RIVAL[starter]`: she holds the starter that beats yours.
- She keeps her starter; the Vale Gauntlets drop when you win.

### Quests and bounties

Quest steps are derived from flags (§4.7).

| id | Name | Giver | Path | Reward |
|---|---|---|---|---|
| m1 | The Warden's Seal | Fenwick | stop Sneck | the NW gate opens |
| m2 | The Beast Nobody Can Name | Dael | Old Snag, then the den thornwall, then Briarmaw | 150 gold and the Brand |
| m3 | The Whispering Rot | Miravel | a light, then the Heartroot, then the Rotwarden | Brand 2, `act1-complete` |
| s1 | Lights at Midnight | Garret | Quill, then relight the brazier | watchfire-locket |
| s2 | The Seed Vault | Miravel | the tally-camp strongbox holds the seed-case | seedwarden-ring |
| s3 | Where the White Deer Went | Hesper | Hollis and the Dawnbell, then ring it in the clearing | storied amulet; the deer return |
| s4 | Three Days Missing | Dael | Smugglers' Hollow, where the rangers are freed | oathbriar |
| s5 | Isolde's Ward | (automatic) | the Tamsin duel | vale-gauntlets |

Bounties are posted on the Thornhollow board and turned in there:
- Skarn: 60 gold.
- Old Snag: 100 gold.
- The Rot-Stag: 100 gold.
- Hobb Two-Knives: 120 gold.

The **Ladder** is a board in the Keep war room, also reachable from the Journal. It shows 13 Verdant villains:
- Sneck, Skarn, Ledger-Maud (tally-camp), Old Snag, the Rot-Stag, Briarmaw.
- Hollis, Hobb, Mother Brisk, Quill, Oakhollow, Tamsin, the Rotwarden.

It also shows three silhouettes for Act II: "a glass scorpion" (Sunscorch), "the Lantern Mother" (Gloomfen) and "the missing smith" (Ironspire).

### Locks

A key "has" a relic's map power if the party owns that relic un-shattered. A Domain key needs any active hero at that Domain level. Current Domain levels are: the primary Domain equals the hero's level, and secondary Domains are half that, rounded up.

| Lock | Relic keys | Domain key | Where |
|---|---|---|---|
| thornwall | Cut the Thornwall (Thornsplitter); Briar Crown | Physical 3 (Warden, about Lv 5) | den approach, Deer Path, Hearth Road glade |
| bramble | Thorn-Thread (Jerkin); Briar Crown | Survival 4 (Pip Lv 4) | Bramble-Deep to Fawnrest; caches |
| dark | Lamplight; Kindle (Hearthbrand) | Attunement 9 (Alondra) | Heartroot galleries; Mosswatch cellar |
| stream | Still the Water (Stillwater); Seedsong | Survival 5 | millrace shortcut; Eldergrove brook |
| boulder | Break the Cairn (Cairnmaul) | Physical 4 | Fawnrest offering; Mossway ledge |
| sap-trail | Hear the Rot (Rotwood Circlet) | Knowledge 5 (Bryn) | the path to the Rotwarden |
| strongbox | Cut the Tally (Tallyknife) | Knowledge 4 | Tallyman chests |
| gatekeeper | Warden's Writ (Seal); Thornwatch Oath | Influence 3 | smuggler lookout (or fight `smugglers-lookout`) |
| ichor | Rot-Walker (Ichor Mask) | Attunement 10 | 2 Heartroot pools to come back for |

Each starter opens one lock type: Hearthbrand opens dark, Stillwater opens stream, Cairnmaul opens boulder. Hilda's reforge restores a shattered key relic.

### Chests and secrets

Chest contents are deterministic, from `createRng('chest:'+seed+':'+id)`.

| Chest | Lock | Contents |
|---|---|---|
| `hr-glade` | thornwall | tempered weapon, ilvl 3 |
| `hr-ditch` | open | 30 gold and 2 tonics |
| `gw-hollow-log` | bramble | wrought boots |
| `th-lockup` | strongbox | runed ring, ilvl 5 |
| `bd-tally-box` | strongbox | seed-case (flag) and 80 gold |
| `bd-wallow-cache` | bramble | tempered body armour, ilvl 6 |
| `fw-offering` | boulder | storied amulet |
| `mw-millrace` | stream | runed weapon, ilvl 7 |
| `mw-cache-1` | hidden (Snarecraft or Survival 6) | 120 gold |
| `mw-cache-2` | hidden (Snarecraft or Survival 6) | storied weapon |
| `mt-cellar` | dark | tempered helm and ember salts |
| `hr-ichor-1`, `hr-ichor-2` | ichor | runed/storied, ilvl 12 |

Secrets:
- The Tenth Waymarker, a lore sign on the Hearth Road.
- A white-deer sighting at dusk on the Greenway after s3.

### Shops and Hilda

- **Nell (Thornhollow) and Yew (Eldergrove)** sell consumables: hearth-tonic 12 gold, bitterroot 10, frost-draught 15, ember-salts 15.
- **Hilda** is at `HILDA[stage]`: the Keep until Thornhollow, then Thornhollow until the Brand, then Eldergrove.
  - **Temper** raises an item +1 per visit, up to `TUNING.temper.max = 5` in M3. Cost is `round((20+4·ilvl)·1.6^temper)`. `stats.js` already turns temper into enchant as `floor(temper/2)`.
  - **Reforge** stays in the Party screen.

## 4. Systems

### 4.1 Map data (`src/data/maps/<id>.js`, pure and frozen)

```js
export default {
  id: 'hearth-road', name: 'The Hearth Road North', region: 'verdant', biome: 'wilds',
  backdrop: 'hearth-road', music: 'road', lore: [455, 330], w: 22, h: 60,
  rows: ['TTTTTTTTT===TTTTTTTTTT', /* h strings, exactly w chars */],
  entities: [
    { id: 'e-hearth-road', kind: 'encounter', at: [11, 50], encounter: 'hearth-road', face: 's' },
    { id: 'milestone-fire', kind: 'hearthfire', at: [12, 30], encounter: 'milestone-fire', stand: [12, 32] },
    { id: 'bramble-toll-chain', kind: 'gate', area: [10, 8, 14, 8], open: { cleared: 'bramble-toll' }, text: '…' },
    { id: 'hr-glade-wall', kind: 'lock', area: [2, 24, 2, 25], lock: 'thornwall' },
    { id: 'hr-glade', kind: 'chest', at: [1, 22], loot: { items: [{ rarity: 'tempered', slot: 'weapon', ilvl: 3 }] } },
    { id: 'hr-sign-1', kind: 'sign', at: [13, 55], text: 'NORTH: Thornhollow, 3 leagues.' },
    { id: 'npc-x', kind: 'npc', at: [5, 5], npc: 'nell', if: { flag: 'reached-thornhollow' } },
    { id: 'keep-intro', kind: 'trigger', area: [0, 0, 27, 21], on: 'enter', once: true, run: 'keep-intro' },
  ],
  exits: [
    { area: [10, 59, 12, 59], to: 'keep', anchor: 'from-hearth-road', face: 's' },
    { area: [10, 0, 12, 0], to: 'greenway', anchor: 'from-hearth-road', face: 'w' },
  ],
  anchors: { 'from-keep': [11, 57, 'n'], 'from-greenway': [11, 1, 's'], 'v1:hearth-road': [11, 53, 'n'] },
  roam: { max: 3, sets: ['hearth-road'], level: [1, 3], zones: [[2, 12, 20, 48]] },
};
```

- `data/maps/index.js` exports:
  - `MAPS`, `MAP_IDS`;
  - `ENTITY_OF[encounterId] -> {map, id, at}`;
  - `HEARTH_AT[hfId] -> {map, x, y}`;
  - `ANCHOR(map, name)`.
- `data/world.js` exports `REGIONS`, `SEALED`, `LORE` (all 17 illustrated-map locations), `CRITICAL_PATH` and `SIDE_PATHS`.
- `CRITICAL_PATH` is the 14 GAUNTLET ids, then `tamsin-duel, eldergrove, rotting-grove, mosswatch-foot, mosswatch-stair, mosswatch-lamp, heartroot-gallery, ichor-warren, heartroot-hollow, rotwarden-heart`.
- Encounters stay in `data/encounters.js`. Each one gains `region: 'verdant'`, plus optional `rearm: false`. Champions get `once: true`.

### 4.2 Tiles and collision (`data/tiles.js`)

`LEGEND` maps a character to `{id, solid, over?, anim?, oneWay?}`:

| Char | Tile | Char | Tile |
|---|---|---|---|
| `.` | grass | `m` | mud |
| `,` | flowers | `f` | glowing fungus (anim) |
| `"` | tall grass | `r` | roots |
| `=` | road | `R` | root wall (solid) |
| `:` | flagstone | `o` | rock (solid) |
| `_` | floor | `+` | door |
| `T` | tree (solid; canopy on the overhead layer, one row up) | `s` | stair |
| `t` | bush (solid) | `Y` | First-Age root (solid) |
| `#` | wall (solid) | `H` | roof (solid, over) |
| `\|` | palisade (solid) | `~` | water (solid) |
| `w` | ford | `b` | bridge |
| `^` | cliff (solid) | `v` | ledge (walkable only moving south) |
| `k` | dark floor | | |

A tile is passable when all of these hold:
- it is in bounds;
- its legend entry is not solid, and it is not a `v` ledge unless you are moving south;
- no present solid entity stands on it (npc, encounter leader, sign, chest, hearthfire, closed gate, unopened lock area);
- no roamer stands on it.

Locks, gates, darkness and bramble are entities, not legend characters, so their meaning stays in one place.

### 4.3 Conditions (`rules/cond.js`)

`check(game, cond)` supports:
- `{flag}`, `{cleared}`, `{done}`, `{beaten}` (cleared or done), `{brand}`, `{brands:n}`
- `{owns: relicId}`, `{power: mapPowerId}`, `{domain, level}`, `{level:n}` (average party level), `{waking:n}`
- `{unlocked: entityId}`, `{opened: chestId}`, `{quest, step}`
- `{all:[…]}`, `{any:[…]}`, `{not:…}`

The same evaluator drives entity `if`, gate `open`, lock keys, dialogue branches and quest steps. By default an encounter is present when `!cleared && !done`.

### 4.4 Walking API (`rules/world.js`, pure, never mutates its inputs)

```js
Walk = { map, visit, x, y, face, t, rng, grace, roamers:[Roamer], gone:{}, pending:null }
Roamer = { id, set, spawns, lead, x, y, home, face, mood:'wander'|'chase'|'flee'|'stunned', stun, weak }

enterMap(game, { map, anchor | at, face }) -> { game, walk }  // visits[map]++, seeds roamers, runs 'enter' triggers
move(game, walk, dir)  -> { game, walk, events }   // one tile attempt, then one roamer tick
interact(game, walk)   -> { game, walk, events }   // the tile you face
tick(game, walk)       -> { walk, events }         // idle tick, every 400 ms while standing still
commit(game, walk)     -> game                     // writes progress.pos (same object if unchanged)
present(game, mapId)   -> [Entity & { solid, glint, grudge, name }]   // memoised on game identity
findPath(game, walk, [x,y]) -> [[x,y]…] | null     // A*, 4-way; used by tap-to-walk and tests
lockStatus(game, lockType) -> { open, by, keys:[{ label, have }] }
openLock(game, entityId) -> { game, ok, by }       // sets flags.unlocked
openChest(game, entityId) -> { game, items, gold, bag }
travelTo(game, hfId) -> game                       // needs flags.fast[hfId]
partyLevel(game); isWeak(game, spawns)
```

`move` does the following, in order:
1. Turns to face `dir`.
2. If the target tile is an exit, emits `exit` (or `sealed`).
3. If the target holds a roamer, emits `contact` (by the player).
4. If the target holds an entity, emits `bump` or `encounter` or `lock`.
5. If the target is solid, emits `bump`.
6. Otherwise it steps, runs step triggers, runs `sight`, then ticks the roamers.

Events:
- `step`, `bump`, `exit{to,anchor}`, `sealed{text}`
- `encounter{id}`, `contact{roamer,by,ambush,firstStrike}`, `instant-win{roamer}`
- `talk{npc,dialogue}`, `sign{text}`, `chest{id,lock?}`, `lock{id,status}`, `hearthfire{id}`
- `sighted{relic,holder}`, `roam{moves}`

### 4.5 Roaming foes

All roaming foes are visible; there are no invisible random encounters.

**Seeding and respawn.**
- Roamers are seeded on each `enterMap` from `createRng('roam:'+seed+':'+map+':'+visits)`.
- Walking has its own RNG stream and never touches `rngState`, so battles stay replayable.
- Each roamer is built as `level = rng.int(lo,hi)` with a set drawn from `ROAM_SETS` (the old `PATROLS` keys stay as an alias). It is then escalated with `escalateSpawn(sp, waking, 'roam:'+map+':'+visit+':'+i)`.
- Roamers are placed at least 8 tiles from where you arrive.
- Beaten roamers stay gone for that visit. Re-entering the map, or resting on it, respawns them.

**Moods.**
- **Weak:** every spawn is rabble and its level is at most `partyLevel − TUNING.world.weakGap` (4). A weak roamer turns to `flee`: it steps away every tick and shows a sweat-drop. Walking into it is an instant win.
- **Chase:** a roamer that is not weak and is within 5 tiles (2 with Trackless) chases you. It moves on 2 of every 3 ticks, so you can out-walk it but not out-wait it.
- **Wander:** otherwise it wanders within 4 tiles of its home.

**Contact.**
- If a roamer walks into you while you face away, you are **ambushed**. The existing Thornwatch set still cancels ambushes.
- If you walk into a roamer that faces away, or you carry Longsong, you get **First Strike**.
- After a battle you get 6 ticks of grace. A roamer you fled from is stunned for 12 ticks.

**Instant win.** `instantWin(game, spawns) -> {game, report}` in the flow module awards the full XP and gold from `buildFoe`, rolls consumables, and gives no gear. It uses `game.rngState`.

### 4.6 Hearthfires, rest, fast travel and wipes

- `rest(game, hfId)` heals everyone, advances the day, sets `lastHearthfire`, sets `fast[hfId]`, and increments `visits` for that map.
- Interacting with a hearthfire also sets `fast[hfId]` and opens the menu: Rest, Fast travel, Hilda (when she is there), Party, Leave.
- **Fast travel** is allowed from any hearthfire. With Beacon it is allowed from anywhere except the tower, roots and den biomes.
- **Wipe:** `pos = HEART_AT[lastHearthfire]`, you keep your gear and lose 10% of your gold. This is the settled rule and is unchanged.

### 4.7 Waking, Brands, Grudges, sighting, quests

- **`earnBrand` (M3).** It pushes the Brand and raises the Waking by 1. It then re-arms the Brand's own region: it deletes `cleared[id]` for every encounter with `region === node.region && !once && rearm !== false`. It also increments `runs`.
  - There is **no teleport**.
  - When both Verdant Brands are held, it sets `story['act1-complete']`.
  - Re-armed fights re-gear through `spawnsFor`. Relic-bearers come back holding Echoes.
  - Gate-guard fights (`rearm:false`) and Champions (`once`) stay down.
  - The Waking applies everywhere at spawn time, so "the region you save for last is hardest" already works.
- **Grudges** are unchanged. They are keyed `id#spawnIndex`, and roamers never create one. A grudge-bearing encounter shows a red banner with its title.
- **Sighting.** `sight` runs on each step. When an encounter whose spawns hold or wear an unclaimed relic is within 6 tiles (10 with Watchful), it marks the codex entry sighted and the villain scouted on the Ladder. `spawnsFor` is memoised per (encounter, waking, set of claimed relics).
- **Dialogue** (`data/dialogue.js`):
  - Shape: `{ lines:[[speaker, text]], choices:[{text, if?, do?, next}], do:[effects] }`.
  - Effects: `set`, `unset`, `give` (relic), `item`, `gold`, `bag`, `unlock`, `heal`, `fight`, `reward` (quest).
  - `{warden}` is replaced with the player's name, and the text is always rendered with `textContent`.
  - `NPCS[id].talk = [{if, dialogue}]`. The first matching entry wins.
- **Quests** (`data/quests.js`):
  - Shape: `{ id, name, kind:'main'|'side'|'bounty', giver, start, steps:[{text, done, target:{map, entity|exit}}], reward }`.
  - A quest's state is derived from conditions. Only `flags.quests[id]='claimed'` is stored.
- `rules/story.js` exports:
  - `talkTo(game, npcId)`, `runDialogue(game, id, choice?) -> {game, lines, choices, done, events}`
  - `questLog`, `nextObjective`, `turnIn`, `ladder`
  - `temperCost`, `temper(game, uid)`, `buy(game, shop, id)`, `hildaAt`

### 4.8 Save v2 and the v1 → v2 migration

```js
{ version: 2, seed, rngState, party, inventory, bag, gold, codex, settings,          // untouched
  progress: { waking, brands, lastHearthfire, node /* v1 field, kept verbatim, never read */,
    pos: { map, x, y, face }, act: 1,
    flags: { cleared, done, grudges, day, runs,                                       // untouched
             story: { starter, … }, unlocked: {}, opened: {}, fast: {}, visits: {}, quests: {}, scouted: {} } } }
```

**Storage.**
- The new build reads `aethermoor.save.v2`. If that key is empty, it reads `aethermoor.save.v1`, migrates the save in memory, and writes **only** the v2 key.
- The v1 key is never written again, so the M2 save stays as a backup. Settings get an "Export M2 backup (AETH1)" button that reads it.
- Export codes become `AETH2.` codes; `AETH1.` codes are migrated when imported. The M2 build refuses `AETH2.` codes cleanly, so an old build cannot corrupt a new save.
- `core/save.js` must stay free of game logic, so the migration is injected: `loadGame(migrate)` and `importCode(code, migrate)`, both called from the UI shell.

**The migration, `rules/migrate.js` `migrate(g)`:**
- It is pure and idempotent.
- A save that is already `version >= 2` only has missing fields filled in.
- It throws when `party` or `progress` is missing.

```js
const v = structuredClone(g); const p = v.progress, f = p.flags;
const at = Math.max(0, GAUNTLET.indexOf(p.node));
const looped = f.runs > 0 || p.brands.length > 0;
const reached = id => looped || at >= GAUNTLET.indexOf(id);
f.story = { starter: starterOf(v) /* the claimed starter in the codex, else the Warden's weapon */, 'm2-save': true };
for (const [flag, after] of V1_STORY) if (reached(after)) f.story[flag] = true;   // reached-thornhollow, bounty-briarmaw…
f.unlocked = {}; for (const [ent, after] of V1_UNLOCKS) if (reached(after)) f.unlocked[ent] = true;
   // keep-nw-gate←keep-vault, bramble-toll-chain←verdant-edge, den-thornwall←bramble-deep
f.fast = Object.fromEntries(GAUNTLET.filter(id => ENCOUNTERS[id].type === 'hearthfire' && reached(id)).map(id => [id, true]));
if (p.brands.includes('brand-of-briars')) f.done['briarmaw-den'] = true;
Object.assign(f, { opened: {}, visits: {}, quests: {}, scouted: {} });
const a = ANCHOR(`v1:${p.node}`) || ANCHOR('v1:hearthstone-keep');
p.pos = { map: a.map, x: a.x, y: a.y, face: a.face };
if (ENCOUNTERS[p.lastHearthfire]?.type !== 'hearthfire') p.lastHearthfire = 'hearthstone-keep';
p.act = 1; v.version = 2; return v;
```

What this preserves and fixes:
- Gear, codex, gold, levels, grudges, Waking, Brands (duplicates included), `cleared`, `done`, `day` and `runs` are copied byte for byte.
- A save from after a Brand in M2 has an empty `cleared`. That is consistent with M3 re-arming the region. The unlocks keep the chain and the den thornwall open.
- A save at Waking 2 keeps its Waking. Its next Brand is the Rotwarden.

## 5. Rendering

**Tiles** (`art/tiles.js`).
- `bakeTileset(biome)` paints each tile id with `Forge` + `Xf` + the `MAT` ramps + `compose({glow:false})`.
- Each tile gets 4 hash variants, and animated tiles get 2–4 frames (water, fungus, torches).
- It also generates 4-bit N/E/S/W edge overlays for the water, road and cliff transitions.
- Everything goes into one atlas `<canvas>` per biome. It costs at most 120 ms, is cached for the session, and is baked over several frames with a generator.
- Biomes: keep, wilds, town, grove, fen, tower, roots, den. The same tile id is re-tinted per biome, so grass in the roots becomes moss.

**Chunks.**
- On map entry the ground is pre-rendered into 256×256 chunk canvases, with a separate overhead set for canopies and roofs.
- A frame draws at most 4 ground chunks, the visible animated tiles, the y-sorted sprites, then at most 4 overhead chunks.

**Walkers** (`art/walkers.js`). This is a dedicated 16×24 rig, not a scaled `heroForge`, which reads poorly and has no back view.
- It takes the same `gearLooks(heroGear(game,id))` output as the battle sprite.
- Body kind and material, cloak, headgear by look and material, gloves and boots, an amulet pixel, a shield on the arm, and a weapon silhouette on the back per weapon class using the item's own materials.
- Heirlooms get a 1 px glint.
- Directions: south, north, east, with west mirrored from east. Frames: stand, step A, step B. That is 9 rasters per look at about 1 ms each, cached in its own `lru(96)` keyed by hero, gear signature and custom look.
- Humanoid foes and NPCs reuse the rig. `art/foes.js` exports `foeLooks(key,{gearTier}) -> {H, gear}`, so a bandit's kettle-helm tier shows on the map too.

**Map foes** (`art/map-sprites.js`).
- Rabble beasts get hand-made 16×16 or 24×16 sprites with exaggerated silhouettes.
- Relic-bearers and Champions use a 2× palette-aware downsample of the battle `renderFoe` idle frames.
- Objects include chest, hearth, gate, thornwall, boulder, brazier, board and sign.

**Camera.** The camera follows the tweened player, is clamped to the map, and snaps to whole pixels. A small map is centred on black.

**Loop and budgets.**
- A rAF loop with its own delta-time, capped at 50 ms. It pauses while the document is hidden and when an overlay is open.
- It drops to 10 fps when nothing is moving.
- A step takes 160 ms (about 6 tiles/s).
- The steady-state loop allocates nothing: every sprite is converted to a canvas once.

| Budget | Target |
|---|---|
| JS per frame on a mid phone | ≤ 3 ms |
| drawImage calls per frame | ≤ 30 |
| Map entry, behind a 200 ms fade | ≤ 250 ms total |
| Canvas memory | ≤ 16 MB |
| Bundle | 846 KB → ≤ 1.2 MB (code and data about +200 KB, realm image ≤ 140 KB) |

**Dark areas.** Inside a dark lock area the tiles draw black until unlocked. The roots biome adds one darkness layer with a light hole around the party (one extra composite per frame).

## 6. UI and controls

**Phone (portrait, 360–430 px).**
- A 40 px HUD across the top: map name, "The Verdant Wilds · Waking n", day, gold, Brand coals, 4 tappable hero heads with HP ticks, and a one-line quest tracker.
- The map canvas at k=2 (about 11×14 tiles).
- A control deck of about 180 px:
  - a d-pad (3×3 grid of 52 px cells, using pointer capture, a 10 px dead zone, and sliding between directions);
  - A (64 px) and B (52 px) buttons;
  - a Menu button.
- The deck and canvas use `touch-action:none; overscroll-behavior:none`, with no callout or text selection.
- Tapping a tile walks there along `findPath`. Tapping an entity walks next to it and interacts.
- The A label changes with what you face: Talk, Open, Fight, Rest, Cut.

**Laptop.**
- The canvas is at k=3 or k=4, with a side panel at 900 px and wider (party, quests, key legend). The deck is hidden when `(hover:hover) and (pointer:fine)`.
- Keys:
  - Held arrows or WASD move, tracked in a held-key set that clears on blur.
  - Z, Enter or Space is A. X or Esc is B.
  - M opens the menu, J opens the Journal.
- The screen's `onAction` swallows the direction actions so the page does not scroll, and ignores all input while `overlayOpen()` is true.

**Overlays** use `openOverlay`, so the M2 focus trap is kept.
- **Dialogue box:** at the bottom of the canvas. Speaker bust, name in the pixel font, typewriter text (instant with reduced motion). A advances, B finishes the line. Choices are 44 px buttons or 1–9. It uses `role="dialog"` with `aria-live`.
- **Encounter sheet:** the M2 node panel moved here. Foes with tier dice, levels and Omens; relic glints that open `cardPreview`; the grudge note; a red "far above you" tag; Fight and Not yet buttons.
- **Lock prompt:** lists both keys and which ones you have. For example: "✓ Pip, Survival 4" and "✗ Thorn-Thread (Thornwatch Jerkin)".
- **Hearth menu**, **Pause menu** (Party · Codex · Journal · Realm Map · Settings · Save code · Title), **Shop**, and **Hilda's Temper**.

**Realm Map** (screen `realm`).
- This is the player's illustrated map.
- `tools/make-realm-map.mjs` uses Playwright Chromium to pull the embedded PNG out of the HTML, draw it at 960×640, and write it as `toDataURL('image/webp', q)`. It steps q down (0.62 → 0.5) until the image is ≤ 140 KB, and saves the data URI to `src/ui/assets/realm-map.js`.
- On a phone it opens zoomed on the Verdant quadrant, with pan and a "Whole realm" toggle.
- Markers: discovered hearthfires (tap to travel when allowed), a "you are here" pin, sealed regions dimmed with a lock, and the Hearth Clock.
- If the image fails to load, a procedural parchment with the same markers is shown.

**Journal** (screen `journal`). It has three tabs:
- Quests.
- Bounties.
- The Ladder, whose posters go from silhouette (`renderFoe` tinted black) to scouted portrait to "Settled" stamp.

**Accessibility and reduced motion.**
- Reduced motion turns off fades, animated tiles, particles, shake and the typewriter. Walking tweens stay.
- A visually hidden live region announces map names and "A: Talk to Captain Dael".
- Every action is reachable by keyboard.

**Navigation.**
- Every screen returns to `'world'`. `main.js` registers `road` as an alias of `world` as a safety net.
- Aftermath calls `go(returnTo, {brand, result})`. The world screen keeps its last `Walk` in module scope and resumes it: after a victory the roamer is removed, after fleeing it is stunned, and if `pos` changed (a wipe) the map is entered fresh.

**Saving.** `setGame` runs on map change, before a battle, after anything that changes the game, every 20 steps, and on `pagehide`/`visibilitychange`.

## 7. Implementation plan

The eight work packages own disjoint files. Every id, format and signature above is frozen.

| WP | Owns (new and existing files) | Interface to the other packages | Tests |
|---|---|---|---|
| **A. World engine** | `rules/world.js`, `rules/cond.js`, `rules/path.js`, `data/tiles.js`, `data/locks.js`, `test/world.test.mjs`, `test/fixtures/maps.mjs`, ARCHITECTURE.md "World" section | §4.2–4.5 API. Imports `data/maps` and `rules/foe.js` (`escalateSpawn`, `buildFoe`). | collision, ledges, exits and sealed exits, two-key locks, roamer determinism, chase/flee, weak gap, ambush and first strike, grace, dark areas, `findPath`, `commit`, frozen inputs |
| **B. Flow, save, story** | `rules/gauntlet.js`, `rules/migrate.js`, `rules/story.js`, `rules/party.js`, `rules/foe.js`, `rules/loot.js`, `rules/battle.js`, `core/save.js`, `data/tuning.js`, `tools/sim.mjs`, `tools/make-v1-fixtures.mjs`, `test/{gauntlet,migrate,story,core}.test.mjs`, `test/fixtures/v1/*.json`, `docs/RULES.md` | See the flow list below. | See the test list below. |
| **C. Maps** | `data/maps/*.js` (13 maps plus `index.js`), `data/world.js`, `test/maps.test.mjs` | the §4.1 format, anchors, `CRITICAL_PATH` | See the test list below. |
| **D. Content data** | `data/encounters.js`, `data/foes.js`, `data/relics.js`, `data/skills.js`, `data/heroes.js` (`STARTERS[x].rival`), `data/npcs.js`, `data/dialogue.js`, `data/quests.js`, `data/shops.js`, `test/data.test.mjs` | ids exactly as in §3; `GAUNTLET` and the M2 spawn arrays untouched | 24 relics; codex numbers 1–24; Heirlooms have powers; `LOCKS` map powers exist; die-face coverage; a snapshot of the M2 spawn arrays; dialogue, quest and shop references |
| **E. Map art** | `art/tiles.js`, `art/walkers.js`, `art/map-sprites.js`, `art/index.js`, gallery tools | See the art list below. | gallery sheet; node timing script within budget |
| **F. Battle art** | `art/foes.js`, `art/item-looks.js`, `art/scenes.js`, `art/recipes.js` | `FOE_ART` for the 10 new families; `foeLooks(key,{gearTier})`; `RELIC_ART` for relics 13–24; 5 new `BACKDROPS`; Tamsin renders with each of the 3 starters | gallery; `renderFoe` of every key and pose does not throw |
| **G. World screen** | `ui/screens/world.js`, `ui/world/{renderer,controls,hud,dialogue,sheets}.js`, `ui/world.css`, deletes `ui/screens/road.js`, `tools/world-preview*.{mjs,js}`, `tools/e2e-world.mjs` | screen `world` with params `{brand, result, arrive}`; opens `realm`, `journal`, `battle{returnTo:'world'}` | e2e: walk by keyboard and d-pad, talk, fight and return, exit, rest, pause menu, no horizontal scroll at 360, p95 frame under 16 ms at 4× CPU throttling |
| **H. Shell** | `main.js`, `ui/app.js`, `ui/screens/{title,newgame,aftermath,party,codex,settings,battle}.js`, `ui/screens/{realm,journal}.js`, `ui/assets/realm-map.js`, `tools/make-realm-map.mjs`, `ui/screens.css`, `core/audio.js` (+`dungeon` track), `tools/e2e-flow.mjs`, `tools/dev-battle-entry.js`, `tools/build.mjs` (fail above 1.3 MB) | registry plus the `road` alias; `migrate` injected into load and import; title shows `MAPS[pos.map].name`; codex shows 24 entries; back buttons go to `world` | e2e-flow updated; import of an `AETH1` fixture lands on the world screen at its anchor |

**WP-B flow API:**
- `newGame -> v2` (starts at the Keep, with `story.starter`).
- `startBattle(game, {nodeId} | {roam:{mapId,key,spawns,name}, ambush, firstStrike})`.
- `resolveBattle`: a wipe sets `pos`; a Brand re-arms its region; a roam fight creates no grudge and no `cleared`.
- `instantWin`, `rest(game, hfId)`, `migrate`.
- Engine tweaks:
  - `wields` (a relic used for looks and dice only);
  - worn relic pieces drop for every tier from veteran up;
  - `ctx.firstStrike`;
  - spawn variant `'$rival'`.
- Save API: `loadGame(migrate)`, `importCode(code, migrate)`, `exportCode` (writes `AETH2`), `exportV1Backup`.

**WP-B tests:**
- The migration keeps these deep-equal on every fixture: seed, rngState, party, inventory, bag, gold, codex, waking, brands, cleared, done, grudges, day, runs.
- Migrating twice gives the same result. The v1 key is never written.
- Rest, wipe, Brand re-arm, instant win and dialogue effects behave as specified.
- A full auto run along the critical path earns 2 Brands.

**WP-C tests:**
- Every row is w characters long and every character is in the legend.
- Entities are in bounds.
- Exits are paired both ways and land on walkable tiles.
- Every `v1:` anchor exists and is walkable.
- Every encounter and hearthfire is placed exactly once.
- **Reachability:** walking `CRITICAL_PATH` with only the keys guaranteed at each point (claimed un-shattered relics or the target Domain level), `findPath` reaches every target.

**WP-E art API:**
- `bakeTileset(biome) -> {canvas, tile(id,v,f), edge(id,mask), frames(id)}`
- `walkerSheet(key, gear, {custom}) -> {canvas, w:16, h:24, foot:[8,23], frame(dir,step)}`
- `mapFoeSprite(family, {gearTier, relic})`, `npcSprite(npcId)`, `objectSprite(kind, state)`

**Order of work.**
1. **Before anything else:** WP-B runs `make-v1-fixtures.mjs` against the *current* M2 rules. That produces 18 saves: one at each of the 14 nodes, one after the Brand, one at Waking 2, one with grudges, and one with a shattered Thornsplitter.
2. **In parallel from the start:** A, B, C, D, E and F. G builds against A's fixture maps with flat-colour tiles until E lands. H starts on the realm tool and the shell.
3. **Gate 1:** `npm test` passes with A, B, C and D together.
4. **Gate 2:** build plus both e2e suites pass with G and H.
5. **Gate 3, balance (WP-B only):** WP-B may edit only `level` fields in `encounters.js` and `TUNING`. Sim modes: `crit`, `side-first`, `side-last`. Targets:
   - party Lv 6–8 at Briarmaw and 11–13 at the Rotwarden;
   - Rotwarden first-try wipe 30–40% on the critical path only, 10–20% with side content.
6. **Gate 4:** performance and bundle size, then build `dist/aethermoor.html` as the download. Keep the M2 file as `dist/aethermoor-m2.html`.

## 8. Risks and cuts

**Cut first, in this order:**
1. Party followers (none are specified yet).
2. Tap-to-walk.
3. Idle roamer ticks (the world moves only when you step).
4. The darkness light-hole effect.
5. The embedded illustrated map: use the procedural parchment and save about 140 KB.
6. Shops.
7. Oakhollow and the Heartwood Aegis. Relic 17 would then become a Bramble-Deep chest relic.
8. Longshot First Strike: the Longsong keeps its sighting flavour only.
9. Fawnrest shrinks to a clearing on the Greenway.
10. Mosswatch becomes one map.

**Biggest risks:**
1. **Readable 16×24 gear walkers.** Mitigation: a dedicated rig, and a phone art review of `walkers.png` before map art is mass-produced.
2. **Performance on mid phones.** Mitigation: atlas and chunk baking, a loop with no allocations, and a throttled e2e frame check.
3. **Migration correctness.** Mitigation: real fixtures frozen from M2 code, deep-equal preservation tests, and a new storage key plus the `AETH2` prefix so an M2 save is never overwritten.
4. **Open-world balance** (post-Brand Waking +6). Mitigation: the three sim orderings and one tuning owner.
5. **Parallel integration.** Mitigation: frozen ids and formats, fixture maps, the `road` alias, and single owners for `main.js`, `art/index.js` and `encounters.js`.
6. **iOS touch quirks** (zoom, bounce, long-press). Mitigation: `touch-action` and `overscroll-behavior` settings, and a 360 px e2e run.