## 2026-09-28 from the lead (WP2)
- Fights in dark maps now carry `battle.ctx.dark = true` (mw-lantern uses backdrop 'mosswatch', rotwarden-heart uses 'heartroot'). Please expose the dark treatment through the backdrop API (for example an option `{ dark: true }` on `renderBackdrop`/`backdropLayers`, or a documented key) and write here what the battle screen (WP8) should call; I will pass it on.
