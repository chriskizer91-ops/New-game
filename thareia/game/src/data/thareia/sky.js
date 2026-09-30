// Thareia (T1): the sky above Aethermoor, for the airship (ui/screens/sky.js). Pure data; imports nothing.
//
// The world map is the continent painting (1536 x 1024). Each region painting (1536 x 1024) is a closer view of one
// 512 x 512 square of it: SKY_REGIONS[id] = { col, row } names the square, so a point (x, y) on the region painting is
// (col * 512 + x / 3, row * 512 + y / 2) on the continent (toWorld / toRegion below).
// Only the regions whose paintings are in the game are listed; the airship turns back at the edge of the rest.
// DOCKS[id] = { name, region, at: [x, y] on the region painting, map, anchor } where the skiff lands, and the walking map
// and anchor it lands the party on.
// FLIGHTS[id] = { from, to, lines: [[speaker, text]], free } a story flight: where it starts and must end, and the
// captain's lines on take-off; `free` false keeps the ship on its route (the ticket).

export const SKY_REGIONS = Object.freeze({
  verdant: Object.freeze({ id: 'verdant', name: 'The Verdant Wilds', col: 0, row: 0, art: 'verdant' }),
  gloomfen: Object.freeze({ id: 'gloomfen', name: 'The Gloomfen Marsh', col: 0, row: 1, art: 'gloomfen' }),
});

export const DOCKS = Object.freeze({
  bogmire: Object.freeze({ id: 'bogmire', name: 'Bogmire', region: 'gloomfen', at: [405, 470], map: 'bogmire-docks', anchor: 'from-skiff' }),
  // T2: the skiff lands at the landing field outside the south gate (th-landing), not in the town
  thornhollow: Object.freeze({ id: 'thornhollow', name: 'Thornhollow', region: 'verdant', at: [1232, 566], map: 'th-landing', anchor: 'from-skiff' }),
});

export const FLIGHTS = Object.freeze({
  'first-flight': Object.freeze({
    from: 'bogmire', to: 'thornhollow', free: false,
    lines: Object.freeze([
      ['yara', 'Hold on to something that is bolted down. We heat the crystal, and up we go.'],
      ['yara', 'Thornhollow is north, past the top of the fen. You want to learn? Take the wheel. I will shout before we hit anything.'],
    ]),
  }),
});

export const PAINT = 1536, PAINT_H = 1024, SQUARE = 512;
export const toWorld = (regionId, [x, y]) => { const R = SKY_REGIONS[regionId]; return [R.col * SQUARE + x / 3, R.row * SQUARE + y / 2]; };
export function toRegion([cx, cy]) {
  for (const R of Object.values(SKY_REGIONS)) {
    const x = (cx - R.col * SQUARE) * 3, y = (cy - R.row * SQUARE) * 2;
    if (x >= 0 && x < PAINT && y >= 0 && y < PAINT_H) return { region: R.id, at: [x, y] };
  }
  return null;
}
