# M6 P4: foes, encounters, relics and balance (the Gloomfen Marsh)

Package P4 of `docs/M6-SPEC.md` (§2.6, §3.2-§3.5, §3.7's spoils, §8's balance). No git is run. Files I edit:
`src/data/foes.js`, `src/data/encounters.js` (not `BRANDS`), `src/data/relics.js`, `src/data/rivals.js` (the Rotbridge
kit), `src/data/items.js` (only if needed: not touched), `tools/sim.mjs`, `docs/RULES.md`, `test/data.test.mjs`,
`test/loot.test.mjs`, `test/battle.test.mjs` (new cases), `test/rivals.test.mjs` (new cases). Private build folder:
`scratchpad/m6-builds/p4`.

Status: **done**: content, tests, tuning (every Gate 6 target met, zero stuck, M3-M5 unchanged), `docs/RULES.md`, and
the lead's two asks (see "Where I am").

## What I made

- **The ten families** (`data/foes.js`, spec §3.2), no stub left: `mire-leech` (Latch On bleeds; Drink heals it; it
  sinks away when hurt), `marsh-light` (Cold Fire; Lure: WIS or Charmed; Flicker: Guarding), `lamp-moth` (Batter; Dust in
  the Eyes: DEX or Frightened; Circle the Light: Hasted), `blackwater-gar` (Bite; Leap: charging, Staggers; Dive:
  Guarding), `bog-hag` (Ladle; Hex: WIS or Hexed; Rot: 2d6 blight, CON for half, Rotting; Stir the Pot heals her
  worst-hurt friend), `willow-wight` (Lash: Rooted; Bough-Fall: charging, Staggers; Weep: Regenerating), `drowned` (Cold
  Hands; Drag Down: Rooted and Chilled; Toll: WIS or Frightened; Black Water: CON or Rotting), `hodge`, `lantern-mother`,
  `blackwater-leviathan` (spec §3.5, below).
- **Variants:** Old Jaws (`old-jaws`: Death Roll, The Tooth), Mother Grue (`mother-grue`: The Evil Eye, 2d6 blight to
  every hero, WIS or Hexed), Grandfather Willow (`grandfather-willow`: Weeping Volley, every hero, DEX or Rooted), the
  drowned `bell-ringer` (Peal: 1d4 tide to every hero, CON or Staggered), `choir` (`drowned-choir`: The Hymn, WIS or
  Hexed), `cantor` (`drowned-cantor`: Beat Time hastes the choir; Downbeat, 2d8 tide to every hero, WIS or Hexed); the
  Tallymen's `salvage-master` (Salvage Hook staggers; The Diving Bell, 2d6 tide to all, CON, Chilled), `bargemaster`
  (Boat-Hook; Make Fast!; Haul Away: charging 3d8, Staggered), and the rabble `reedcutter` (Reed-Hook), `diver`
  (`salvage-diver`: Grapnel, Exposed), `bargehand` (Punt-Pole, Staggered). Every holder's Art is on its d12's 9-12.
- **The Lantern Mother** (radiant undead, weak to tide; the Lantern held, the Veil worn): Lamplight (Lamp-Pole, Lantern
  Flare 3d8 DEX half, Lure, Hush Now), the Children's Road (Lead Them Down: charging, WIS or led away, "Led away"; Moths:
  a lamp-moth, two at most, 4 levels down; Mourning: every hero Frightened and Rotting), Lights Out (Snuff: Exposed;
  Lantern Nova: 3d8 radiant to all and Burning; Drown the Light: charging 4d10 tide). The Lantern powers Lure and Nova,
  the Veil Mourning; each falls back to Lamp-Pole.
- **The Blackwater Leviathan** (tide beast, hide; storm beats it on the wheel): the Wake (Coil 2d10, Rooted; Tail Slap;
  Sound: `burrowed`, then `then: 'breach'`, 4d10 tide and Staggered), the Deep (Swallow: charging, "Swallowed whole";
  Undertow: 1d6 tide, STR or Rooted and Chilled; Harpoon Rage: two Coils, needs the Harpoon), Blackwater (Pearl-Light:
  heals 2d8 and Wards, needs the Pearl, else Tail Slap; Flood 3d8 DEX half; Swallow).
- **Hodge** (humanoid relic-bearer, unique; gear tiers 0-3: a mace or flanged mace, hood, jerkin/brigandine): `opener:
  'toll-is-due'` (a `delay` at the `strongest` hero, CHA save DC 20), Old Man's Cane (2d10 crushing, Staggered), Bridge
  Troll (charging, "In the river"), Clipped Coin (needs the toll: two blows, always heads). `koText` (he sits down on his
  stool and says so), `keepsRelics` (his toll comes loose only by grip; the rule is the lead's: see Needs). His spawn:
  party level + 6, `noWaking`, gear tier 3, Frenzied, Swift and Ironclad.
- **Encounters** (`data/encounters.js`): the 25 of §3.3 with the spec's spawns, holders, modes, `once`, `duel`,
  `yields`, `talk`, `brand`, `dark` (the Mother's Hollow, the Belfry's two); every Gloomfen fight and Hearthfire on its
  map's backdrop (`BACKDROPS` lists the twelve); `tamsin-rotbridge` has `leaves: { flag: 'tamsin-fallen' }` (the lead's
  ask; `test/data.test.mjs` checks that every encounter's `leaves` parses, with `condErrors`); the seven PATROLS sets of
  §2.6. GLOOM (4 levels a Waking) and GLOOM_R, at most three Waking Omens; the Champions
  and named holders carry chosen Omens (`wakeOmenCap: 0`), never Twinned.
- **Tamsin's Rotbridge kit** (`data/rivals.js`, the same for each starter): Fen-Step (2d10 slashing, she is Hasted),
  Mire-Footing (DEX or Rooted), All In (charging 4d10 slashing, then she is Exposed); Riposte 1-3, Fen-Step 4, Cheap Shot
  5, Mire-Footing 6, All In 7, her starter's Art 8-11, Not Like This 12. Spawn: party + 4, gear tier 4, Swift, Ironclad
  and Thornskinned, the Bogstriders worn.
- **Relics 53-66** (`data/relics.js`): real stats, Surges, lore, deeds, sockets and awakenings (hand-named for the
  Champions' four pieces, with two sockets). Surges: Heads I Win (the Unfair Toll: every foe a whole turn later, no
  save), Fen-Footed, Willow Rain, The Wards Hold, Through the Hole, Every Lamp Lit, Veil of Tears, Air for Everyone, The
  Downbeat, Snap, Haul Away, Harpoon and Line, Pearl-Glow, Undo the Knot. The Unfair Toll's lore is the brief's line.
  The Bogstriders' holder line (the lead's ask): "Tamsin at Rotbridge (worn; yours when you beat her, or left behind when
  she goes)".
- **`tools/sim.mjs`**: modes `gloomfen`, `gloomfen-forged` (+8 and a Bog Amber; Hodge at the end of the region),
  `gloom-first-lead`; `--iron-cache`; `--gloom-leads`; Hodge is fought once (`ONE_TRY`: a lost fight is not retried, the
  party pays the toll); the re-arm after a Gloomfen wipe (as M5's); the Gate 6 table; `--trace` also prints the re-arm.
- **`docs/RULES.md`**: rotting and hexed (§4, and the M6 `swallowed` labels), the M6 foes (§5), the M6 Champions' pieces
  and Hodge's toll by grip (§6), relics 53-66's Surges and Toll Is Due (§7), the Gloomfen spoils (§9), and §12's M6 part
  (how to run the Gloomfen modes, targets vs results, what the tuning settled, the three mode tables).
- **Tests**: `data.test` +6 (and the `leaves` line), `battle.test` +7, `loot.test` +3, `rivals.test` +2; mutation checks
  on them (24 of 24 mutants caught, in a private copy).

## Decisions (with the sim's numbers; first tries, 200 seeds)

1. **Champions carry Frenzied and a Grudge must not add it.** A lost fight makes a Champion a Grudge with one Omen it
   lacks. Without Frenzied chosen, a Grudge adds it half the time, and a Frenzied retry is far harder than the first try:
   the Leviathan with Swift, Ironclad and Thornskinned was 32% first try but 1 run in 200 stuck in two modes. So, as M5's
   Rime-Abbot, the Leviathan carries **Frenzied and Swift** (a Grudge adds Emberblooded, Thornskinned or Ironclad), and the
   Lantern Mother **Frenzied, Swift and Ironclad**. Zero stuck since.
2. **Guard is what makes the forge count** (M5's lesson): the Leviathan's Guard 22 (+11 at its level) makes a +8 weapon
   worth much more than a plain one: 36% unforged, 15.5% forged. Hodge's Guard 19 with 72 HP (Ironclad on top) does the
   same for him: 73.5% wipes on arrival, a forged party at the region's end wins 61-68%.
3. **Rabble and Omens**: a base level also picks a spawn's Omens, and on rabble Twinned and Emberblooded double a
   fight's danger (the salvage divers at 17: 13% wipes; at 16: 3%). Levels were chosen with the Omens in view
   (`scratchpad/m6-builds/p4/omens.mjs` prints them). Second-half rabble sit 3-4 levels under the party (as M5's).
4. **Back to back**: the salvage camp and the bell-ringers stand on the road with no Hearthfire between (the party
   arrives at the ringers hurt and without tonics), so the bell-ringers are light (22 HP, level 3, Peal on one face).
5. **Hodge's Toll Is Due** uses DC 20 (his own save DC at party + 6 would be 30: no hero could make it).
6. **The hags hit harder than they look**: Rot is 2d6 (at 1d6 Mother Grue's hollow was 0-10%).

Tuning history (first tries): the Lantern Mother 7 → 9 (L33 on arrival), 160 → 215 HP, Guard 18 → 19, Flare 2d8 → 3d8,
Drown 3d10 → 4d10, + Swift: 0.5% → 4% → 8% → 26% → 35%; the Leviathan 190 HP no Swift 15-20% → + Swift 64% → 140-160
HP, Guard 22, speed 7: 30-36% (see 1 for the Omens); Hodge 110 HP Guard 16 Thornskinned: 86% on arrival, forged 30% win
→ 72 HP, Guard 19, Ironclad: 73.5% / 61-68%; Mother Grue 0% → level 12, 140 HP, atk 6, dmg 5, Rot 2d6: 22%; the Cantor
3% → level 10, 180 HP, atk 7, dmg 6: 15.5%; Grandfather Willow 15% → 170 HP, atk 6, dmg 4: 21%; Old Jaws 63% (level 8)
→ level 6: 24.5%; Tamsin 69.5% → All In 4d10, Fen-Step 2d10: 64%.

## Balance (Gate 6: 200 seeds; the same numbers in the full run of every mode)

| mode | target | result |
|---|---|---|
| gloomfen | the Lantern Mother wipe 1st 30-40% | 35% (party L31.9, 32.5 rounds) |
| gloomfen | the Blackwater Leviathan wipe 1st 30-40% | 36% |
| gloomfen | Tamsin at Rotbridge party win 55-70% | 64% (36% yield) |
| gloomfen-forged | the Lantern Mother <= 20% | 8.5% |
| gloomfen-forged | the Leviathan <= 20% | 15.5% |
| gloomfen-forged | Hodge at the end of the region (never 100%) | 61.5% win |
| gloom-first-lead | Grandfather Willow / Mother Grue / the Cantor / Old Jaws 15-25% | 21% / 22% / 15.5% / 24.5% |
| gloom-first-lead | Hodge on arrival 60-80% | 73.5% |
| every Gloomfen mode | stuck 0 | 0 |

Road fights: the salvage camp 6%, the bell-ringers 11% (back to back), the barge-camp 8%, the hags' pot 2%, the
drowned 1%, everything else 0-2%; the Reach's zone patrol 7% (straight after the ringers), the Tidal Flats' 4%.

**The full run** (every mode, 200 seeds, `--jobs 4`, 830 s): every M3, M4 and M5 table and the Gate 4 and Gate 5 checks
are the M5 release's, number for number (diffed against a run of the tree before my changes); Gate 4, 5 and 6 all ok;
zero stuck in all fifteen modes. `docs/RULES.md` §12 has the Gloomfen tables.

## For P6 and P5 (the looks, settled)

The art keys are §3.2's (all drawn by now per `art-keys.test`). What each carries, for the sprites: the bog-hag and
Mother Grue a quarterstaff or rowan staff (the ladle is her swing), a hood and a robe (tiers: + gloves, + boots); Mother
Grue the Hag-Stone on a finger. Hodge a mace (tiers 0-1) or flanged mace (2-3) as his cane/cudgel, a hood (tier 3 a
kettle hat), a jerkin (brigandine at 2-3), boots; his lantern and toll-book are his own (not gear); the Unfair Toll is
an amulet (a clipped coin on a cord). Old Jaws holds the Gar's Tooth in his jaw. The Salvage-Master wears the Salvager's
Helm (copper diving helm) as his held relic; the Bargemaster the Barge-Chain Gauntlets. The Lantern Mother: the Lantern
in her hand, the Veil over her face. The Leviathan: the Harpoon in its side, the Pearl in its brow, a collar and chain.

## For P7 (e2e-battle)

Every Gloomfen family is real now, so the M6 scenarios can run. Useful facts: Hodge's opener is always `toll-is-due` at
the strongest hero (CHA save DC 20: the harness heroes fail it on most rolls); Bridge Troll is on his d12's 7-8 (d8 once
the toll is pried); the Lantern Mother's Lead Them Down is a WIS save (the harness heroes fail it on most rolls) on the
Children's Road's 6-10; the Leviathan's Sound is on the Wake's 16-20, its Swallow on the Deep's 6-10 and Blackwater's
17-20; a bog-hag Hexes on 4-5 and Rots on 6-7 of her d8 (`lf-hags`); the drowned's Black Water Rots on 7-8.

## Needs from others

1. **Lead (`rules/loot.js` `battleLoot`): Hodge's toll comes loose only by grip** (spec §3.2 "drops his toll only by
   grip", §3.5 "his toll is yours only if it was pried loose first"). Today a holder beaten while gripping drops its
   relic shattered, so a Hodge beaten with his toll in hand would drop a shattered Unfair Toll (Hilda could reforge it).
   `FOES.hodge.keepsRelics` is set: please skip the shattered drop for such a holder, e.g.
   `else if (f.ko && !FOES[f.family]?.keepsRelics) drops.push(s.ctx.gentle ? item : { ...item, shattered: true });`
   (or through `familyData`). The test I would add to `test/loot.test.mjs` then: a Hodge KO'd while still gripping drops
   no Unfair Toll at all, and pried loose it is claimed (the second half is in already).
2. **Lead (optional, `rules/gauntlet.js` `recordGrudge`):** the spec's "Hodge the Paid-in-Full and the like": if you
   want Hodge's Grudge titles, a family field (e.g. `grudgeTitles: ['the Paid-in-Full', ...]`) read before `WIN_TITLES`
   (and in the `baseName` strip) would do it. I have not added the field: say if you want it and I will.
3. **P3 (the Bogstriders on a yield):** fine by me; the holder line says so now (the lead's wording).
4. **P7 (optional, `ui/battle/hud.js`):** the grip bar's label is a relic name's first word after "The ", so M6's
   possessive names read "Hodge's", "Gar's", "Corvus's", "Lamplighter's", "Salvager's", "Cantor's" (seen in the
   e2e-battle `hodge-toll` shot). Skipping a possessive first word (e.g. "Toll", "Tooth", "Harpoon") would read better.
   The names are the spec's (§5), so I have left them.

## Where I am
- Done: families, variants, Champions, Hodge, encounters, relics, the Rotbridge kit, the sim's modes, tuning (every Gate
  6 target met, zero stuck, M3-M5 unchanged), tests, `docs/RULES.md`, and the lead's two asks (Tamsin's `leaves` with
  its `condErrors` test line; the Bogstriders' holder line). `npm test`: 498 of 498 pass (P6's backdrops are painted
  now, so art-keys is green too); `npm run lint`: clean.
- A private build (`node tools/build.mjs --out scratchpad/m6-builds/p4/build`) builds; it warns that the game is
  2576 KB (over the 2.5 MB warning line, under the 3.2 MB failure line): for the lead.
- A private e2e-battle run of the M6 scenarios (`--only=lantern,led-away,leviathan,hodge,fen`, into
  `scratchpad/m6-builds/p4/e2e`): all five pass.
- Open for others: the lead's `keepsRelics` loot rule (Needs 1), if wanted Hodge's Grudge titles (Needs 2), and the
  grip label for P7 (Needs 4).

Private tuning aids (not in the tree): `scratchpad/m6-builds/p4/tune.mjs` (the first try at one fight from each seed's
cached pre-fight state; `--spawns` fights a custom spawn for calibration), `look.mjs` (what happens inside a fight),
`omens.mjs` (each spawn's Omens at its Waking), `iron-cache.json` (`node tools/sim.mjs ... --iron-cache <file>`).
