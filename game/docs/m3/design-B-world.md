# M3 "The Verdant Wilds": a map you can walk (world-first design)

## 1. Vision

The fixed road becomes a hand-built Verdant Wilds, laid out tile by tile. All four heroes walk it in a conga line, each wearing their real gear.
- **Visible foes.** Rabble packs chase you until you outgrow them. After that they scatter, and walking into a scattering pack is an instant win.
- **Relic-Bearers** stand in their lairs at battle size with the relic glinting. A tap shows the greyed card.
- **Guided first hour.** It follows the M2 spine: Keep, Hearth Road, Thornhollow, Old Snag, Briarmaw.
- **Then the Wilds open.** Briarmaw's thorn-crown grew the *crownwalls* that seal the Wilds, so its death drops them all. Three leads (Mosswatch, Fawnrest, the Grove-Heart) then feed the Heartroot and the Rotwarden, in any order.
- **Two keys for every shortcut:** a relic power or a Domain skill.
- **Sealed gates** toward Sunscorch, Ironspire and Gloomfen stay in plain sight.

## 2. World layout

### 2.1 Maps (16 px tiles, coordinates in tiles)

| id | size | contents |
|---|---|---|
| `keep` Hearthstone Keep | 30×26 | Hub. N gate (15,0) open. Sealed gates: E (29,13) Ironspire, SE (24,25) Sunscorch, SW (5,25) Gloomfen. Great Hall door (15,8); War Room door (6,11). Refugees; Marta's stall (22,14); Hilda after Brand 2 |
| `keep-hall` | 16×12 | Eternal Hearth (8,3) = Hearthfire `hearthstone-keep`; Fenwick; Isolde; reliquary door (15,5) |
| `keep-reliquary` | 14×12 | `keep-vault` (8,6); 24 pedestals, each lit once its relic is claimed |
| `keep-warroom` | 12×10 | Ladder board (6,0); war table = view-only Atlas |
| `hearth-road` The Hearth Road North | 36×64 | Road from (17,63) to (17,0). Millrace stream x6–7, ford (7,44) to Poacher's Holm (x1–5, y36–50). Bramble (34,52) to Smugglers' Run; boulder (26,36); thornwall (10,22) |
| `smugglers-run` | 26×14 | `kestrel-camp` (18,7); tally-sealed strongbox; crownwall N exit to Mossfall |
| `thornhollow` | 28×24 | Hearthfire (14,12); Dael and the bounty board (9–11,7); Hilda (20,15) until Brand 1; practice yard (21,6). S and NW gates open; W and NE gates are crownwalls |
| `thornway` (wild route 1) | 40×32 | `tally-camp` (8,22); `snag-wallow` lair (31,20); thornwall shortcut (26,25); `bramble-deep` (19,10); Hearthfire `den-mouth` (33,5); den entrance (36,3); crownwall N exit to Eldergrove |
| `briarmaw-den` | 18×16 | Lair (9,6) |
| `mossfall` (wild route 2) | 44×24 | Gloomfen-border marsh. Tower door (4,8); cold hearth `mossfall-cairn`; Pip's bramble trail (8,1) to the Grove-Heart; ford (30,18); sealed S exit "Blackwater crossing" |
| `mosswatch-1/2/3` | 14×14 each | 1: Old Garret, `mw-hall`, trapdoor. 2: Darkness, `mw-stair`, tally-sealed ledger room. 3: `mw-lantern`, cold signal fire `mosswatch-fire`, lookout |
| `mosswatch-u` | 14×14 | Flooded, with a ford lock at the trapdoor; `mw-undercroft` |
| `hindwood` (wild route 3) | 36×30 | `gloamwing-hollow` lair (27,11); cold `hindwood-cairn`; Elderway W exit to Eldergrove |
| `fawnrest` | 22×20 | Dreaming Stone = Hearthfire `fawnrest-stone`; empty bell-frame; Vesper's stall; pilgrims |
| `eldergrove` | 32×28 | Miravel at the seed vault; Nan Aldercott; Hearthfire `eldergrove-hearth`; Hilda after Brand 1; Eldest Tree door with rot-knot lock (16,3); rope-ledge lock (30,6) on the Elderway |
| `grove-heart` | 20×18 | The feral druids' stone ring `grove-ring`; S exit to Mossfall |
| `heartroot-1/2/3` | 24×20, 24×20, 18×16 | 1: ichor pools, `hr1-grubs`, `hr1-sap`, `hr1-patrol`. 2: Darkness, `hr2-tappers`, `hr2-sap`, cold `last-green-coal`. 3: `rotwarden-heart` (9,5) and the Eldest Rings wall |

That is 21 maps and about 12k tiles (roughly 14 KB of ASCII). The Hearth Road plus the three wild routes (Thornway, Mossfall, Hindwood) match the brief.

### 2.2 Connections

```
keep-hall─keep─N─hearth-road─N─thornhollow─NW─thornway─den─briarmaw-den
                    │E(bramble)   │W*   │NE*       │N*
              smugglers-run─N*─mossfall  hindwood─N─fawnrest
                               │tower  │N(bramble)   │W(rope-ledge)
                          mosswatch   grove-heart─E─eldergrove─Heartroot(rot-knot)
* crownwall: opens on brand:brand-of-briars
```

### 2.3 Where the M2 ids land

Ids and spawn order are unchanged, so Grudges and Echo salts still match.

| M2 id | map (x,y) | mode | respawn |
|---|---|---|---|
| hearthstone-keep | keep-hall (8,3) | Hearthfire | – |
| keep-vault | keep-reliquary (8,6) | block | once, gentle |
| hearth-road | hearth-road (17,56) | roam | rest |
| waymarker-stones | hearth-road (13,47) | roam | rest |
| milestone-fire | hearth-road (21,40) | Hearthfire | – |
| bramble-toll | hearth-road (15–20,31), chain across the road | block | brand |
| verdant-edge | hearth-road (18,18) | roam | rest |
| rotstag-glade | hearth-road (29,9), visible from the road | lair | brand |
| thornhollow | thornhollow (14,12) | Hearthfire | – |
| tally-camp / snag-wallow / bramble-deep | thornway (8,22) / (31,20) / (19,10) | block / lair / block | brand |
| den-mouth | thornway (33,5) | Hearthfire | – |
| briarmaw-den | briarmaw-den (9,6) | lair | brand (Echo rematch, no second Brand) |

### 2.4 Guided start, then open (about 1.75–2 hours)

1. **Prologue (0:00–0:08).**
   - Newgame hands off to `keep-hall`. Tamsin grabs the starter that beats yours. Sneck bolts, which starts the tutorial vault fight and the Seal reveal.
   - The party is four from minute one, as in M2: Pip brought Dael's message, Bryn came about the Rot, Alondra fled with the dreaming pilgrims.
   - Then the War Room and the Ladder, and out the N gate.
2. **Hearth Road (0:08–0:25).** Packs, the Milestone Fire, Skarn's chain, the Rot-Stag. Poacher's Holm (Haskett, L10) glints across the millrace as the *optional hard area*. Stillwater players can ford it at once.
3. **Thornhollow and the Thornway (0:25–1:00).** Dael's board, the Tally camp, Old Snag. The first Thornsplitter cut is the thornwall beside the wallow, a shortcut home. Then the Bramble-Deep and the Last Coals.
4. **Briarmaw: Brand of Briars, Waking 1.** `fx:'crownwalls-fall'` plays on the Atlas and Unsmith letter #1 arrives. The next time you enter Thornhollow, Tamsin calls you to the yard.
5. **Open Wilds (1:05–2:00).**
   - Mosswatch, Fawnrest and the Grove-Heart come in any order. Each is optional, but each pays: the Lantern lights the Heartroot, radiant and tide relics beat the blight boss, and the dream grants *Forewarned*.
   - The Heartroot's rot-knot opens with the Rotwood Circlet or Knowledge 6, so going there directly is legal.
6. **Rotwarden: Brand of the Heartroot, Waking 2, Act I done.**
   - The Council scene plays, Unsmith letter #2 arrives, and Hilda reads the mask's maker's mark (the Harrow hook).
   - Afterwards: Echo lairs, bounties, the Codex.

### 2.5 Sealed exits (plug points for M4–M6)

Each is an `exit` entity with `sealed:{region,text}`, a guard or sign, and an Atlas padlock.
- **Keep SE:** "The Sandspire caravans stopped a month ago; the dune-glass walls are still too hot to cross."
- **Keep E:** "Rockslide on the pass. Stormwatch hasn't sent a writ since spring."
- **Keep SW and Mossfall S:** "Blackwater's up over the causeway. Nobody's ferrying."

A later milestone ships its maps and swaps `sealed` for an `open` condition. No engine change is needed.

## 3. Content

### 3.1 NPCs (voice: warm epic with an edge)

| NPC · where | sample line |
|---|---|
| Fenwick · keep-hall | "It burned blue. I'd like you to find out why, and not tell anyone I asked." |
| Warden Isolde · hall and war room | "Tamsin, put that down. …No. Keep it. I'd rather it were in a hand than on a shelf." |
| Tamsin Vale · hall, Thornhollow yard | "Cairnmaul? Bold. Slow, but bold. I'll take the lance; somebody should be fast." After losing: "That was a practice swing. The next one isn't." |
| Captain Dael · Thornhollow | "Thirty names on the Thornwatch roll when I took it. Nine now. Don't make me write yours in the other column." |
| Hilda Ironvein · travelling wagon | "Hold still. Not you, the blade." On the Ichor Mask: "Two hammers over a shut eye. I haven't seen that mark since… put it away." |
| Old Garret · Mosswatch | "Somebody lights my fire at midnight and it isn't me. And it isn't ghosts. Ghosts don't leave footprints in my porridge." |
| Elder Miravel · Eldergrove | "Keep folk come for timber and advice. They never take the advice." |
| Vesper · Fawnrest | "Miracle sap, a silver the thimble. Cures rot, rheum and regret." Alondra: "Your voice goes up at the end of 'cures'. People's do, when it doesn't." |
| Pip · banter at home | "Every path has a secret one next to it. The secret one's usually worse." |

- **The Rotwarden, masked:** "GREEN WAS A MISTAKE. THE MASK SAYS SO."
- **The Rotwarden, freed:** "…Warden. I held the root nine hundred years. Hold it now."
- **Unsmith letter #1:** "One coal. How touching. Ask your hearthkeeper what a hearth eats, little Warden, and watch his hands while he answers. — U."

### 3.2 Foe families (18 plus the rival; levels are Waking-0 base)

| family | tier | aspect | lvl | signature move |
|---|---|---|---|---|
| cutpurse, briarling, thornhound | rabble | –/verdant/– | 1–9 | existing |
| **smuggler** (humanoid) | rabble | – | 3–5 | Caltrops: all foes, DEX save or Rooted |
| **boglurcher** (48×48) | rabble | tide | 4–5 | Drag Under: 1d6 tide, Rooted |
| **glowcap** (48×48) | rabble | verdant | 4 | Spore Puff: all foes, CON save or Poisoned |
| **rotgrub** (48×32) | rabble | blight | 5 | Ichor Spit: Poisoned ×2 |
| bandit, tallyman | veteran | – | 1–6 | existing |
| **feral-druid** (humanoid) | veteran | verdant | 5 | Call the Briars (1 summon) |
| **hollowed-ranger** (humanoid, Thornwatch rags, blight eyes) | veteran | blight | 6 | Rot-Arrow (Poisoned). *Remember*: below 30% HP it loses a turn recalling its name |
| **sapwight** (48×64) | veteran | blight | 6–7 | Sap Leech (drain and heal) |
| rotstag, oldsnag | relic-bearer | blight/– | 4, 6 | existing |
| **gloamwing** (64×64 dream-moth) | relic-bearer | radiant, weak to ember | 6 | Dreamdust: all foes, WIS save or Frightened. Bell-Hum needs the Dawnbell |
| **palehart** (the `rotstag` builder with a `pale` option) | relic-bearer | radiant | 7 | White Rush (charge). Mercy's Ache needs Mercy |
| briarmaw | champion | verdant | 7 | existing |
| **rotwarden** (96×96) | champion | blight | 8 | Blacken the Sap |
| **tamsin** (humanoid, youth build) | relic-bearer | per starter | party | the Art of his starter relic |

**Named holders are variants.** `familyOf` already merges variant fields, so a variant can set `tier`, `table` and `art`. The data test must check each die against `v.tier || f.tier`.

| family | variants |
|---|---|
| tallyman | `thief` Sneck, `signalmaster` Hollis (relic-bearer), `counter` Dun, `apothecary` Vesper |
| bandit | `poacher` Haskett (relic-bearer) |
| smuggler | `queen` Mags Kestrel (relic-bearer) |
| boglurcher | `king` Gorrow (relic-bearer; art `mirelord`, 64×64) |
| feral-druid | `thornmother` Oda (relic-bearer) |
| hollowed-ranger | `sergeant` Corra Thistle, Pip's sister (relic-bearer) |

The 6 Omens are unchanged. The 4 Relic-Bearer families are rotstag, oldsnag, gloamwing and palehart.

**New encounters.** Levels are base levels. The Waking adds +6 per step, so the second half is normally met at Waking 1 as L9–14, against a party climbing from L8 to L13.

| id · map | spawns (holder's relic) | respawn |
|---|---|---|
| `kestrel-camp` · smugglers-run | smuggler/queen 6 (lightfingers), smuggler 5 ×2 | brand |
| `poachers-holm` · hearth-road (3,42) | bandit/poacher 10 (hartshorn), thornhound 9 ×2 | brand |
| `tally-wagon` · roams | tallyman/counter 6 (isoldes-oath), smuggler 5 ×2 | brand |
| `tamsin-duel` · thornhollow yard | tamsin, party level | once, duel |
| `mossfall-smugglers` / `mossfall-lurchers` | smuggler 3 ×3 / boglurcher 4 ×2 + smuggler 3 | rest |
| `mw-hall` / `mw-stair` | tallyman 4 + smuggler 3 ×2 / tallyman 5 + boglurcher 4 ×2 | brand |
| `mw-lantern` | tallyman/signalmaster 5 (lantern) + smuggler 4 ×2 | brand |
| `mw-undercroft` | boglurcher/king 7 (mire-pearl) + boglurcher 5 ×2 | brand |
| `hw-caps` / `hw-druids` | glowcap 4 ×3 / feral-druid 5 + thornhound 4 ×2 | rest |
| `gloamwing-hollow` | gloamwing 6 (dawnbell) | brand |
| `vesper-stall` · fawnrest | tallyman/apothecary 5 + smuggler 4 ×2 | once |
| `pale-hart-dream` · fawnrest | palehart 7 (mercy) | brand, dream |
| `grove-ring` | feral-druid/thornmother 6 (rootsong) + feral-druid 5 + briarling 5 | brand |
| `hr1-grubs` / `hr1-sap` | rotgrub 5 ×3 / sapwight 6 + rotgrub 5 ×2 | rest |
| `hr1-patrol` | hollowed-ranger/sergeant 7 (oathshield) + hollowed-ranger 6 ×2 | once |
| `hr2-tappers` / `hr2-sap` | tallyman 6 ×2 + smuggler 5 / sapwight 7 ×2 | brand / rest |
| `rotwarden-heart` | rotwarden 8 (ichor-mask, first-seed); Brand of the Heartroot | brand |

### 3.3 Relics: 24 (3 starters, 18 heirlooms, 3 regalia)

Numbers 1–12 are unchanged, and their existing `mapPower`s finally do something: kindle, still-the-water, break-the-cairn, wardens-writ, cut-the-tally, cut-the-thornwall, hear-the-rot, watchful, thorn-thread, trackless, briar-crown, bloodtrail. The new ones:

| No. | id | kind · aspect | holder | Surge | map power |
|---|---|---|---|---|---|
| 13 | kestrels-lightfingers | gloves · frost | Mags Kestrel | Sleight (grip damage, steals gold) | lightfingers |
| 14 | hartshorn | bow · storm | Haskett | Thunder of the Hart | harts-sight |
| 15 | isoldes-oath | sword · frost | Dun, on the Tally-Wagon | Oath of Winter | stillness |
| 16 | mosswatch-lantern | focus · ember | Hollis | Signal Fire | lamplight |
| 17 | mire-pearl | ring · tide | Gorrow | Undertow | mirebreath |
| 18 | watchkeepers-kettle | kettle · storm | Old Garret (contest or quest) | Longwatch | longwatch |
| 19 | dawnbell | mace · radiant | Gloamwing (spun into its cocoon) | Matins | dawnbell |
| 20 | mercy | spear · radiant | the Pale Hart (lodged in its flank) | Mercy Stroke | mercys-road |
| 21 | rootsong | staff · tide | Oda Thornmother | Rising Sap | rootsong |
| 22 | oathshield | shield · stone | Sgt Corra Thistle | Hold the Line | hold-the-line |
| 23 | ichor-mask | helm · blight | Rotwarden (breakable) | Blacksap | ichorsight |
| 24 | first-seed | amulet · verdant | Rotwarden (breakable) | Greenwake | greenwake |

**First Seed choice.**
- **Return it** to Miravel and she replants the Heartroot. You get *Eldergrove's Blessing* (+5% max HP) and a Storied gift, and the Codex keeps the Claimed stamp.
- **Keep it** and you keep the amulet.

### 3.4 Bosses

**Briarmaw** is unchanged.

**The Rotwarden** (champion, L8 base, so L14 at Waking 1)
- **Stats:** 205 HP base, Guard 16, hide armour, blight aspect (radiant and tide beat it).
- **Ichor Mask** (grip 32): breaking it ends *Blacken the Sap* (2d8 drain to all) and *Ichor Rain*.
- **First Seed** (grip 28, caged in roots on its chest): breaking it ends *Graft* (summons a sapwight, max 2) and *Heartroot Bloom* (Regenerating 3d6).
- **Phases:**
  - P1: Rootlash, Blacken the Sap, Graft, Bark Hide.
  - P2 at 66%: Grasping Roots (all Rooted), Ichor Tide, Heartroot Bloom.
  - P3 at 33%: Ichor Rain and Devour the Green (3d10 charge), or *Grief* if the mask is already broken.
- **Killed while still masked,** the mask shatters and Miravel says: "You killed the warden and left the wound."
- **Forewarned** starts the fight Warded, with its first intent revealed.

**Tamsin Vale** (`duel`)
- **Level:** `max(7, party level)`, `noWaking`, gear tier 1.
- **His relic:** he holds the counter-starter as a `lend` relic. Disarming it stops his Arts, but it is never claimed.
- **d12 table:**

  | roll | move |
  |---|---|
  | 1–4 | Riposte |
  | 5–6 | Cheap Shot |
  | 7 | Showboat |
  | 8 | Parry |
  | 9–11 | his starter's Art |
  | 12 | Not Like This (below 35%: heal, Warded) |

- **Losing is a *yield*:** no gold loss, no Grudge, and you can rematch in the yard.
- **Winning** pays 120 gold and a Storied item.

### 3.5 Quests and bounties

Quests appear in the Journal. Each stage is a condition over game facts.

| quest | stages → reward |
|---|---|
| vault-door, north-road (Isolde) | beat Sneck; reach Thornhollow |
| unnamed-beast (Dael's board) | board → Old Snag → Last Coals → Brand of Briars → 300 g |
| missing-patrol (Dael, Pip) | Thornwatch boots found → Heartroot → `hr1-patrol` freed → report back → 150 g, Pip's scene |
| smugglers-trails / poacher-king | Mags Kestrel 150 g / Haskett 200 g |
| lights-at-midnight (Garret) | Hollis → relight the signal fire → Kettle; or win Garret's contest early (2 of: Knowledge DC 12, Survival 13, Attunement 14) |
| hollis-ledger | tally-sealed ledger: ichor shipped to "the Fen buyer" (Gloomfen hook) |
| silent-bell (Alondra) | Gloamwing → ring the Dawnbell at the frame → the white deer return |
| dreamers (Alondra) | sleep on the Stone → the Four Sleepers → free the Pale Hart → Forewarned |
| miracle-seller | expose Vesper (Influence DC 14, advantage via Alondra) or fight `vesper-stall` |
| whispering-rot (Miravel) | Heart Chamber → Rotwarden → return or keep the Seed |
| eldest-rings (Bryn) | read the rings at the Grove-Heart and the Heart Chamber → +1 Knowledge |
| tally-wagon (Marta's rumour) | on days where day%3 = 0 it runs Hearth Road → Thornhollow → Mossfall |
| rival, hildas-hammer | the duel; Temper anything → "my brother" |

### 3.6 Locks and their keys

In `LOCKS`, every lock lists relic powers first and a Domain skill last.

| lock | keys | where |
|---|---|---|
| thornwall | cut-the-thornwall, briar-crown, or Physical 3 | 7 shortcuts and chests |
| bramble | thorn-thread, briar-crown, or Survival 4 | Smugglers' Run, Pip's trail |
| cold-hearth | kindle, lamplight, or Attunement 2 | the 4 cold Hearthfires |
| stream | still-the-water, mirebreath, or Survival 6 | Holm ford, Mossfall islet, Undercroft |
| boulder | break-the-cairn, or Physical 4 | 2 chests |
| tally-seal | cut-the-tally, lightfingers, or Knowledge 5 | strongboxes, the ledger door |
| barred-gate | wardens-writ, or Influence 3 | Thornhollow stockade cache, Keep armory |
| darkness (soft) | lamplight, kindle (radius 3), or Attunement 4 | Mosswatch 2, Heartroot 2 |
| rot-knot | hear-the-rot, rootsong, ichorsight, or Knowledge 6 | Eldest Tree, the Heartroot doors |
| rope-ledge | harts-sight, or Survival 5 | the Elderway |
| ichor-pool (hazard) | hold-the-line, greenwake, or Attunement 5 | Heartroot 1 |

- **Without a key:** in Darkness you see 2 tiles and hidden chests stay hidden; ichor pools cost 5% max HP per step.
- **Rope ladder:** it can always be kicked down from the Hindwood side.
- **Domain keys** read the best active hero's `domains[d].level`. The Warden's Physical and Influence are ceil(L/2); Pip's, Bryn's and Alondra's primaries equal L.
  - Each starter opens its own shortcuts from level 1, and everyone gets the rest around L4–7.
- **Story gates:** the only ones are the crownwalls and the sealed region roads.

### 3.7 Chests and secrets

- **Loot is seeded** by `chest:${seed}:${id}`, with item level = zone level + 6 × Waking.
- **Chests (16):**
  - `hr-chest-thorn`: tempered weapon
  - `hr-chest-boulder`: 60 g, 2 Frost Draughts
  - `sr-strongbox`: runed item, 80 g
  - `sr-cache`, `th-cache`
  - `tw-chest-thorn`: tempered armour
  - `tw-chest-boulder`: runed ring
  - `mf-islet`: tempered bow
  - `mw-ledger`: the ledger, 100 g
  - `mwu-chest`: runed offhand
  - `hw-den`: unidentified Storied item
  - `fr-shrine`
  - `gh-chest`: runed staff
  - `h1-chest`, `h1-cache`
  - `h2-strongbox`: runed item, 120 g
  - Plus `eg-vault` if the Seed is returned.
- **Secrets:**
  - Hidden caches sparkle within 3 tiles (with Watchful or Survival 3).
  - Three Bloodtrail dens.
  - Reliquary pedestal riddles.
  - Lookouts plus Longwatch reveal the region on the Atlas.

### 3.8 Hilda and Marta

- **Hilda's wagon** moves Thornhollow → Eldergrove → Keep as the Brands fall.
- **Temper** runs +1 to +4 in M3 at 20/40/80/160 gold × ⌈ilvl/2⌉. The effect stays `enchant += ceil(temper/2)`, which is future-proof to +10; the formula is in `stats.js:60` and `ui/lib/items.js:31`.
- **Reforge:** Hilda keeps the existing reforge.
- **Marta** sells Tonic 20, Bitterroot 25, Frost Draught 30, Ember Salts 40.

## 4. Systems

### 4.1 World data (pure, in `src/data/world/`)

```js
// maps/<id>.js
export default { id, name, region, kind:'town'|'route'|'dungeon'|'interior', size:[w,h], music, backdrop,
  atlas:[x,y] /* lore-map viewBox */, dark, zone:{ level, patrols }, tiles:[ h strings of w chars ],
  entities:[
    { id, type:'exit', x,y,w?,h?, to:{map,x,y,dir}, sealed?, gate? /*cond*/ },
    { id, type:'hearth', x,y, cold? },                                   // id = ENCOUNTERS hearthfire id
    { id, type:'foe', x,y, mode:'roam'|'block'|'lair', leash?, w?, dir?, if? }, // id = ENCOUNTERS id
    { id, type:'lock', lock, x,y,w?,h? }, { id, type:'chest', x,y, loot, lock?, hidden? },
    { id, type:'npc', npc, x,y, dir, talk, if?, wander? }, { id, type:'sign', x,y, text },
    { id, type:'trigger', x,y,w,h, run, once?, if? }, { id, type:'prop', prop, x,y },
    { id, type:'board'|'shop'|'forge'|'lookout'|'bellframe', x,y, if? } ] };
```

- **`tiles.js`:** `TILES[char] = {id, art, walk, over?, water?, hazard?, light?, anim?}`. About 28 tiles, from grass to ichor, with one legend shared by all maps. The region picks the palette.
- **Collision:** tile `walk`, plus blocking entities (closed locks, NPCs, chests, block and lair foes).
- **`index.js`** exports:
  - `MAPS`;
  - `HEARTHS` as `{id,map,x,y,atlas}`;
  - `CRITICAL_PATH` (the direct Act I route, for the sim) and `LEADS`;
  - `M2_ROUTE` (the old GAUNTLET order) and `M2_POSITION`;
  - `START_AT = {map:'keep-hall',x:8,y:8,dir:'up'}`.
- **`ENCOUNTERS`** gains `map`, `respawn:'rest'|'brand'` (default `'brand'`, which is M2's behaviour), `duel` and `dream`. Spawns gain `noWaking` and `level:'party'`.
- **`BRANDS`** gains `brand-of-the-heartroot`.
- **`PATROLS`** becomes keyed by zone.

### 4.2 Movement and visible foes

**Movement.** Grid-based, 4 directions, 6 tiles/s; hold B, X or Shift to run at 9. Followers trail the leader. A interacts with whatever you face; exits and triggers fire on arrival.

**Packs and lairs.** A pack is one token of its lead family with ×N pips. A lair shows the battle sprite at 1×, stationary and glinting. Their brains live in `rules/roam.js`; positions are ephemeral and never saved.

**States:**
- *Idle:* wander within a leash of 4. A Grudge pack gets 8 and "stalks the route".
- *Alert:* sight 5 tiles (2 in darkness), shows "!".
- *Chase:* 5.5 tiles/s, gives up 12 tiles from home.
- *Return:* walk back home.
- *Flee:* rabble-only packs whose top level ≤ party level − `TUNING.map.fleeGap` (4) sweat and back away.

**Contact:**

| contact | result |
|---|---|
| with a fleeing pack | **Rout**, the instant win: `routPack` gives 50% XP and gold, no drops, marks the pack cleared |
| you hit its back | **First Strike**: new `ctx.firstStrike` pushes the foes' first turns +40 |
| it hits your back | the existing **ambush**; the full Thornwatch set still blocks it |
| anything else | a normal battle |

After a flee or a wipe the pack resets and you get 2 s of grace.

**Map powers:**
- **Trackless:** rabble never alert; flee gap drops to 2.
- **Dawnbell:** rabble flee until you rest.
- **Stillness:** freezes a pack within 3 tiles for 8 s.
- **Watchful:** chevrons at the screen edge point to holders within 20 tiles.

### 4.3 Hearthfires, rest, fast travel, wipes

- **Ten Hearthfires.**
  - Lit from the start: the 4 M2 ones, `fawnrest-stone` and `eldergrove-hearth`.
  - Cold until opened with the cold-hearth lock: `mossfall-cairn`, `mosswatch-fire`, `hindwood-cairn`, `last-green-coal`.
  - Visiting one sets `flags.kindled[id]` and makes it a fast-travel point.
- **`rest(game, hearthId)`** heals, advances the day, sets `lastHearthfire` and re-arms `respawn:'rest'` encounters. Zone patrol packs re-arm on map re-entry, so grinding never forces a rest.
- **Fast travel** goes Hearthfire to Hearthfire through the Atlas. Mercy's Road allows it from anywhere, once per rest.
- **Atlas coordinates:**

  | Hearthfire | coords |
  |---|---|
  | hearthstone-keep | (540,390) |
  | milestone-fire | (430,330) |
  | thornhollow | (310,260) |
  | den-mouth | (262,208) |
  | mossfall-cairn | (220,275) |
  | mosswatch-fire | (140,280) |
  | hindwood-cairn | (345,215) |
  | fawnrest-stone | (370,170) |
  | eldergrove-hearth | (200,160) |
  | last-green-coal | (185,150) |

- **Wipe:** the M2 rule, with `progress.at` set in front of `lastHearthfire`.
- **Dream fights** wake you at the Dreaming Stone with no penalty.

### 4.4 Waking, Brands, Grudges, patrols

- **Unchanged:** `escalateSpawn`, Echoes, `spawnsFor(game, encId)` and Grudge keys `${encId}#${i}`.
- **`earnBrand`** no longer teleports and only fires for a Brand you don't already hold. It then:
  - pushes the Brand, adds +1 Waking and +1 `runs`;
  - clears `cleared` only for `respawn` 'rest' or 'brand' encounters, except the one that granted it, so beaten lairs return as Echoes.
- **Rematches** pay loot but no Brand, so the Waking rises only with new Brands. M2 loopers keep the Waking they have.
- **Grudges** attach only to authored encounters and show a red title tag on the map.
- **`patrolSpawns(game, zoneId, rng)`** uses `zone.level`, not the GAUNTLET index. The patrol ctx is `{nodeId:null, where:map.name, backdrop, patrol:zoneId}`, which the battle screen already tolerates.
- **Inspecting** a lair on the map now stamps Sighted.

### 4.5 Scripts, checks and flags

Scripts run in `rules/script.js` (pure), as lists of commands:

| command | purpose |
|---|---|
| `say{who,text}` | a line of dialogue |
| `choice{options:[{text,run,check?}]}` | player choice |
| `check{domain\|ability,dc,pass,fail}` | skill check |
| `if{cond,then,else}` | branch |
| `set` / `unset` | flags |
| `give` / `take` | gold, relic, item, bag |
| `quest` | advance a quest stage |
| `battle{encounter}` | start a fight |
| `open{screen}` | open a screen |
| `reveal` | card reveal |
| `fx` | `fade`, `shake`, `crownwalls-fall` |
| `music`, `teleport`, `letter`, `end` | as named |

**Conditions** are strings: `flag:x`, `!flag:x`, `brand:id`, `claimed:relic`, `cleared:enc`, `done:enc`, `kindled:h`, `quest:id>=n`, `waking>=n`, `power:id`, `domain:physical>=3`. Combine them with `['and'|'or',…]`.

**Checks:**
- The odds show before you commit, e.g. "Influence DC 14 · 65%".
- The roll is d20 + Imprint Bonus + ability modifier for the best hero, drawn from `rngState`.
- A failure branches; it is never a dead end.

**A battle inside a script** parks its continuation in `progress.resume = {script,pc,win,lose}`. That survives the battle → aftermath → world round trip and a page reload.

### 4.6 Save v2 and the migration

```js
{ version:2, migratedFrom?:1, seed, rngState, party, inventory, bag, gold, codex, settings,
  progress:{ waking, brands, lastHearthfire, at:{map,x,y,dir}, resume:null,
    flags:{ cleared, done, grudges, day, runs,                 // v1, untouched
            story:{}, opened:{}, looted:{}, kindled:{}, seen:{}, scouted:{}, bounties:{}, hearthUsed:{} } } }
```

**`migrate(save)`** lives in `rules/migrate.js`. It is pure, idempotent, and run by both `loadGame` and `importCode`.

1. **Reject or pass through.** Throw on a non-object or a missing `version`. Return v2+ saves unchanged.
2. **Copy.** `g = structuredClone(save)`. Every v1 field stays byte for byte: seed, rngState, the roster (including `look`, `hpRolls` and gear uids), inventory, bag, gold, codex, waking, brands, cleared, done, grudges, day, runs.
3. **Place the party.** `at = M2_POSITION[node] ?? M2_POSITION[lastHearthfire] ?? START_AT`, using the safe tile in front of each node:

   | map | M2 node → tile |
   |---|---|
   | keep-hall | hearthstone-keep (8,5) |
   | keep-reliquary | keep-vault (2,6) |
   | hearth-road | hearth-road (17,60), waymarker-stones (14,51), milestone-fire (21,42), bramble-toll (17,34), verdant-edge (18,22), rotstag-glade (24,12) |
   | thornhollow | thornhollow (14,14) |
   | thornway | tally-camp (12,26), snag-wallow (27,22), bramble-deep (19,14), den-mouth (33,7) |
   | briarmaw-den | briarmaw-den (9,13) |

4. **Check the Hearthfire.** If `lastHearthfire` is not in `HEARTHS`, set it to `hearthstone-keep`.
5. **Derive story flags.** With `i = M2_ROUTE.indexOf(node)`:
   - `prologue = done['keep-vault'] || i>1 || waking>0`;
   - `met-dael = i>=8 || waking>0`;
   - kindle every M2 Hearthfire at index ≤ i (all four if `waking>0`).

   The crownwalls read `brand:brand-of-briars`. A player who looped M2 therefore lands in keep-hall with the Wilds open, Tamsin waiting, and the lairs re-armed as Echoes, which is what M2 showed them.
6. **Finish.** Delete `progress.node`, set `version=2` and `migratedFrom=1`.

**Storage** (`core/save.js`):
- **New key.** v2 saves go under `aethermoor.save.v2`.
- **One-time M2 import.** When no v2 save exists and the `aethermoor.v1.migrated` marker is unset, `loadGame` migrates `aethermoor.save.v1` and writes the marker. It never writes or deletes the v1 key, and the marker stops New Game from bringing the old save back.
- **Restore.** Settings offers "Restore my M2 save" while the v1 key exists.
- **Save codes.** Exports become `AETH2.`. `importCode` accepts `AETH1.` or `AETH2.`, then scrubs and migrates. The M2 build cleanly rejects `AETH2`.
- **Build output.** The build also writes `dist/aethermoor-m3.html`, so the M2 download is never overwritten.

## 5. Rendering

- **Tiles:** `renderTile(art,{region,variant,frame,mask}) → 16×16 ImageData`.
  - Built with Forge + `Xf` + `MAT` ramps, `compose({glow:false})` and `noShadow`. `hash`/`vnoise` give 2–4 variants.
  - A 4-bit neighbour mask autotiles water, path, cliff and ichor. Water, torches, glowcaps and ichor animate over 2–4 frames.
  - About 0.5 ms each, baked once per region into an atlas canvas (`lru(2)`).
- **Frame:** ground is baked into 256×256 chunk canvases on map load. Each frame then draws, in order:
  1. ≤ 6 chunk blits;
  2. the animated-tile overlay;
  3. y-sorted props, NPCs, foes and party;
  4. the `over` canopy;
  5. Darkness (a black layer with pixel-stepped light holes).
- **Props:** `renderProp(key)` for multi-tile pieces: oaks, First-Age roots, the Mosswatch face, the Eternal Hearth, the palisade gate, the shrine stone, the Eldest Tree.
- **Walkers:** `renderWalker(heroId, gear, {dir:'down'|'up'|'side', frame:0..3, custom}) → 16×24`, foot at (8,23).
  - `heroForge` gains a real `scale` (0.5) that also scales weapon `k`, the bowstring and orb shapes, and `GROUND`.
  - `back:true` skips the face and draws hair/hood and cloak over.
  - Eyes are hand-placed; right-facing comes from `flip`.
  - Gear comes from `heroGear` + `heroCustom`, so the sword on your back is the card's sword.
  - Walkers have their own `lru(160)` keyed by gear signature and are prewarmed lazily, current direction first.
- **NPCs:** `renderNpc(key,{dir,frame})`, the same rig with about 16 `NPC_LOOKS` presets and a dialogue bust.
- **Map foes:** `renderMapFoe(family,{gearTier,dir,frame,flee})`.
  - Humanoids go through the walker path.
  - Beasts get dedicated 16–24 px builders with exaggerated silhouettes.
  - Lairs use `renderFoe` idle, so the glint is the real relic.
- **Camera:** `k = max(1, floor(deviceWidth/240))`, so the logical view = floor(device/k) in integer device pixels, about 15–19 tiles across. Deadzone follow, clamped to the map; small maps are centred.
- **Budget:**
  - Map load ≤ 300 ms on laptop and ≤ 900 ms on a mid phone, hidden behind the fade.
  - Steady JS ≤ 4 ms per frame, with dt-based movement.
  - Bundle: about +90 KB for the Atlas WebP, +70 KB code, +25 KB data.

## 6. UI and controls

- **Phone (360–430 px):**
  - A 44 px HUD strip: map name, Day, Hearth Clock (Brands and Waking), gold, ≡ Menu.
  - The canvas.
  - A control deck: a 3×3 d-pad (44 px cells, pointer capture, slide between directions), A (56 px) and B (44 px). The deck shows only under `(pointer:coarse)`, with `touch-action:none`.
- **Laptop:**
  - The canvas goes up to 960×640. At ≥ 900 px, a side column shows party busts with HP/MP, the tracked quest and a **Nearby** list.
  - Arrows/WASD walk; the world screen keeps its own keydown/keyup held-set, removed on unmount. Z/Enter/Space = A; X/Esc = B (hold to run); M = Menu.
  - Keys are ignored while `overlayOpen()`.
- **Dialogue:** a bottom sheet with a 48 px bust and typewriter text (A skips). Choices are 44 px buttons with odds chips, with exactly one `[data-primary]`.
- **Lock prompt:** e.g. "Thornwall · ✓ Thornsplitter · ✗ Physical 3 (Warden 2)". A uses the best key.
- **Menu:** Party, Codex, Journal (Quests plus a Keys tab listing every power and Domain level), Ladder, Atlas, Settings, Title. Every back button goes to `world`; `road` stays as an alias.
- **Atlas:**
  - `tools/atlas-image.mjs` uses Chromium to pull the 1536×1024 PNG out of the lore HTML. It writes a 960×640 WebP at quality .72 to `src/data/atlas-image.js`, dropping to 768×512 if the file is over 120 KB.
  - HTML markers at viewBox coordinates: the Hearthfires, the party (`MAPS[id].atlas`), and padlocks on Sandspire (870,470), Ironhold (870,160) and Bogmire (280,530).
  - It opens zoomed on the NW quadrant with a "Whole realm" toggle. Unseen places are dimmed.
- **Ladder:** 18 posters. They are black `renderFoe` silhouettes until scouted, then show the face, Omens, grey card and bounty.
- **Forge and shop screens** for Hilda and Marta.
- **Accessibility:**
  - An `aria-live` line for map entry, prompts and dialogue.
  - The canvas is `role=img`, named for the place.
  - The Nearby list gives DOM buttons that walk to and interact with anything within 4 tiles.
- **Reduced motion:** no typewriter or shake, cuts instead of fades, static ambience, snap camera. Walking still animates.
- **Audio:** new tracks `wilds`, `town`, `dungeon`. Add them to `TRACKS` and to the e2e allowlist.

## 7. Implementation plan (8 packages, disjoint files)

| WP | owns | delivers / tests |
|---|---|---|
| **A Geography** | `src/data/world/{tiles,index,locks}.js`, `src/data/world/maps/*.js` (21), `test/world-data.test.mjs` | maps per §4.1. Tests: valid rows and legend, reciprocal exits, entities on walkable tiles, known ids; a flood-fill proves `CRITICAL_PATH` is reachable with the guided keys and every chest with all keys |
| **B Story** | `src/data/world/{npcs,dialogue,quests,ladder,letters,shops}.js`, `test/story-data.test.mjs` | scripts per §4.5; `NPCS[id]={name,look,voice}`, `QUESTS`, `LADDER`. Tests: every condition parses; speakers and encounters exist; no orphan flags |
| **C Foes, relics, balance** | `src/data/{foes,relics,skills,encounters,tuning}.js`, `test/data.test.mjs`, `tools/sim.mjs`, `docs/RULES.md` | 10 families, 9 variants, 12 relics, the encounter list; `TUNING.map{fleeGap:4,routXp:.5,firstStrike:40}`, `TUNING.forge`. The sim walks `CRITICAL_PATH` + `LEADS` (direct / +1 lead / all). Target: Rotwarden first-try wipe 30–40% direct, ≤ 15% with two leads |
| **D Rules** | `src/rules/{gauntlet,world,script,roam}.js`; `battle.js` (firstStrike, lend, duel/dream); `party.js` and `stats.js` (temper, buy); `test/{gauntlet,world,script,roam}.test.mjs` | the API below |
| **E Save, shell, menus** | `src/core/{save,audio}.js`, `src/rules/migrate.js`, `src/ui/app.js`, `src/main.js`, `src/ui/screens/{title,newgame,settings,aftermath,party,codex,battle,atlas,journal,ladder,forge}.js`, `src/data/atlas-image.js`, `tools/{atlas-image,build,e2e-flow}.mjs`, `test/migrate.test.mjs`, `test/fixtures/m2-*.json`; deletes `road.js` | migration and save codes, `world` routing everywhere, the menu screens |
| **F Overworld art** | `src/art/{tiles,walkers,mapfoes,props,npc-looks}.js`, `src/art/heroes.js` (scale/back only), `src/art/index.js`, `tools/gallery*.{mjs,js}` | `renderTile`, `renderProp`, `renderWalker`, `renderNpc`, `renderMapFoe` |
| **G Battle art** | `src/art/{foes,item-looks,recipes,scenes}.js` | FOE_ART for 10 families plus `mirelord` and `palehart`; 5 humanoid identities; RELIC_ART ×12; backdrops `mosswatch`, `fawnrest`, `heartroot` |
| **H World screen** | `src/ui/screens/world.js`, `src/ui/world/{loop,renderer,camera,pad,dialogue,hud,interact,transition}.js`, `src/ui/world.css`, `tools/e2e-world.mjs` | walking, packs, prompts, dialogue, the battle hand-off; test seam `window.__world={teleport,step,interact,state}` |

**WP-D API.** All functions are pure. The UI keeps the party's position in memory and commits `at` on map change, interaction, battle, menu, every 5 s, and on `visibilitychange`.

```js
newGame(opts) -> v2 game at START_AT;  spawnsFor(game, encId);  patrolSpawns(game, zoneId, rng)
startBattle(game, {encounterId, patrol?, firstStrike?, ambush?}) -> {game, battle}
resolveBattle(game, battle) -> {game, report}          // + report.duel:'yield', report.rematch
rest / kindle / travel(game, hearthId);  fastTravelTargets(game);  commitAt(game, at)
onStep(game, mapId, x, y) -> {game, events:[exit|trigger|hazard]};  canStep(game, mapId, x, y)
entitiesOn(game, mapId) -> [{...ent, present, state:'open'|'closed'|'looted'|'cleared'|'cold'|'lit'}]
keysFor(game) -> {powers:Set, domains};  lockState(game, ent) -> {open, keys:[{label, have, need}]}
openLock / lootChest(game, mapId, id);  routPack(game, encId) -> {game, report};  partyLevel(game)
checkOdds(game, spec);  evalCond(game, cond);  startScript(game, id);  stepScript(game, run, input) -> {game, run, show}
// roam.js: initPack(ent, zone); stepPack(pack, world, dt, rng); contact(pack, player) -> 'battle'|'rout'|'firstStrike'|'ambush'|null
```

**Ordering.**
- All packages start on day 1, and this doc's tables are the id contract. Stubs let them work in parallel:
  - WP-H develops on a 20×15 fixture map with flat-colour tiles.
  - WP-D tests against `test/fixtures/map-mini.js`.
  - Until WP-G lands, WP-C gives each new family an existing `art` fallback:

    | new family | fallback art |
    |---|---|
    | smuggler | cutpurse |
    | boglurcher, rotgrub, glowcap | briarling |
    | sapwight | rotstag |
    | gloamwing | thornhound |
    | rotwarden | briarmaw |

- Integration order: C → A and B → D → E → H. F and G merge whenever they are ready.

## 8. Risks and cuts

**Cut first, in order:**
1. tap-to-walk;
2. back-facing walkers (reuse the front view);
3. Marta's shop;
4. the Stillness, Longwatch and Mercy's Road utilities (their Surges stay);
5. the Tally-Wagon schedule (it becomes a static camp);
6. the Undercroft (Gorrow moves to a Mossfall pack);
7. the Pale Hart dream (Mercy moves to Vesper, keeping 24 relics);
8. the Darkness overlay (becomes a dim tint);
9. NPC busts;
10. Ladder silhouettes (becomes a plain list).

**Biggest risks:**

| risk | mitigation |
|---|---|
| walker readability and cold cost (~5 ms × 48 frames) | prewarm lazily; front-view fallback |
| phone frame time | chunk baking is mandatory; never compose per tile per frame |
| migrating real M2 saves | fixtures from actual M2 exports, deep-equal on every kept field, and an e2e that pastes an `AETH1` code |
| id drift across 8 agents | WP-A and WP-B tests fail on unknown ids |
| second-half balance at +6 levels | WP-C's extended sim |
| loop change (Brands are now unique) | explain it in the Journal |
| iOS touch quirks | `touch-action`; guard against double-fire and zoom |
| script resume across a battle and a reload | cover it with an e2e test |