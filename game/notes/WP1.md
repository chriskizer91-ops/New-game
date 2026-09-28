
## 2026-09-28 · from WP7 (world screen)

1. **Roamer events:** I handle roamer events generically from the §4.5 shapes.
   - After every `move` and `tick`, I diff `walk.roamers` by `id` and tween whichever ones moved. That means I only need `id` on `alert`, `contact` and `rout`.
   - I read `contact.by`, `contact.firstStrike` and `contact.ambush`, and I read `roam.moves` only if it's there.
   - Roamer fields I draw from: `lead.art`, `lead.gearTier`, `lead.variant`, `lead.count` (the ×N pips), `face`, `mood` ('flee' shows a sweat drop and is desaturated, 'alert' shows "!", 'stunned' shows "?") and `x` / `y`.
2. **After a battle, in ui/world/session.js:**
   - Every result sets `walk.grace = TUNING.world.grace`.
   - On victory, `gone[id] = true` and the roamer is dropped from `walk.roamers`.
   - On fled, the roamer gets `mood: 'stunned'` and `wait: TUNING.world.fleeStun`.
   If you would rather own this, export `afterBattle(game, walk, { roamerId, result }) -> walk` and I'll switch to it.
3. **Flags the world UI writes itself,** as small immutable updates (no mutation):
   - `flags.worn[heroId]`: the gear signature for the showoff.
   - `story['letter:<brandId>']`: set once the letter has been shown.
   - `story['bell-rung']`: set by `use` on the bellframe while `{power: 'dawnbell'}` holds.
   - `story['longwatch:<map>']`: set by `use` on a lookout while `{power: 'longwatch'}` holds.
   If you'd rather these came out of `interact` or a rules helper, say so and I'll call that instead.
4. **Ichor HP loss:** I show the `hazard{pct}` event (a red flash and the prompt line). I don't apply HP loss, because I expect `move` to return it in `game`.

## 2026-09-28 · from WP6B, for the integrator: a frozen file (`art/hero-looks.js`) keeps stale looks after tempering
- `looksOf()` caches `gearLooks(g)` under `` `${v.base}/${v.kind}/${v.rarity}/${v.aspect}/${v.seed}` `` for an ItemInstance. Temper is not in that key. After Hilda tempers an item, the battle sprite keeps drawing the untempered look until the page reloads (or the entry falls out of the LRU).
- **The fix** is one token in the frozen file: add `` `/${v.temper || 0}` `` to that key. Temper-0 renders are unchanged, because the key only gains a suffix.
- **Workaround without touching the frozen file:** the battle UI passes `itemArt(item)` objects in place of ItemInstances (`renderHero(key, { weapon: itemArt(inst), ... })`). Art objects are keyed by identity, and a tempered item has its own art object. My review page does this for its temper rows.
- Nothing else in the frozen files needs to change for temper. The +2 and +3 materials are registered in `MAT` as variants, so `heroes.js` draws them by name. A tempered weapon's look carries `relic: true`, so `hero-looks` glints it (+1).
