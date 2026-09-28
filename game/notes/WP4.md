
## 2026-09-28 · from WP7 (world screen)

After the Tamsin duel, the world plays `tamsin-after-win` on a victory (it pays the 120 gold) and `tamsin-yield` on a yield. Please consider putting this in the data as `ENCOUNTERS['tamsin-duel'].after = { victory: 'tamsin-after-win', yield: 'tamsin-yield' }`. I read `after` first and fall back to those two ids.
