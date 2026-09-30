# Batch 3: the Gloomfen's paintings

The player's paintings of the Gloomfen's twelve maps and the Gloomfen Gallery (`art-requests/batch-3.md`): 16 PNGs in
four zips, September 2026, copied here unchanged. 13 are 1536x1024 and 3 are 1024x1536 (the Murkway's two halves and
the Drowned Belfry).

They were painted from the batch's written descriptions (`art-requests/batch-3/places.md`), not from its layout
references, so each shows its place in a layout of its own. The player approved that. Milestone 6 therefore traces
each Gloomfen map from its painting, as Milestone 5 did the East Road (M5 spec A11): the map takes the painting's shape,
its tiles only say what is solid (`overTiles: false`), and everything on it stands where the painting puts it.

`panels.json` gives each map's size and where its picture (or pictures) lie on it, with no padding:
- The Murkway (45x36) is its two halves side by side, overlapping by three tiles, where they are blended.
- The Long Boardwalk (74x20) is its three thirds, overlapping by six and ten tiles, and blended at the middle of each
  overlap.
- Every other map is its one picture at its own shape.

Import one map (from `game/`) with:

```
node tools/paint-import.mjs --map=<id> --src=../art-in/batch-3/map-<id>.png --refs=../art-in/batch-3/panels.json --grid
```

For the Murkway and the Long Boardwalk, list the panels in order in `--src`, comma-separated.
