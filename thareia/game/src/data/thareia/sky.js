// Thareia: the sky above Aethermoor, for the airship (ui/screens/sky.js, rules/sky.js). Pure data; imports nothing.
//
// The world map is the continent painting (1536 x 1024). Each region painting (1536 x 1024) is a closer view of one
// 512 x 512 square of it: SKY_REGIONS[id] = { col, row } names the square, so a point (x, y) on the region painting is
// (col * 512 + x / 3, row * 512 + y / 2) on the continent (toWorld / toRegion below).
// Only the regions whose paintings are in the game are listed; the airship turns back at the edge of the rest.
//
// SKY_REGIONS[id] also says who may fly over it (T2, design/09-t2-spec.md 6.4): `license` lists the kinds of flight
// allowed ('ticket' a story passage, 'hire' the rented skiff, 'own' the party's own ship), `level` the hero's level
// needed (a number, or { [license]: n } when it differs by kind; a kind not named needs nothing), and `if` a
// rules/cond.js condition.
//
// DOCKS[id] = { name, region, at: [x, y] on the region painting, map, anchor, license, level, if, hire, world }: where
// the skiff lands, the walking map and anchor it lands the party on, who may land there (as for regions), whether a
// Dustwind hire post stands there (`hire`), and `world`, a hand-placed [x, y] on the continent when toWorld misses the
// place on the world map.
//
// SKY_MARKS[id] = { name, region, at, why, world } a place drawn on the map that is not a dock (no map to land on):
// always grey, with the reason (`why`, as rules/sky.js dockState gives it).
//
// FLIGHTS[id] = { from, to, license, free, pilot, lines: [[speaker, text]], says } a story flight: where it starts and
// must end, the captain's lines on take-off, and `says`, the lines the screen shows (the speaker and the reasons a
// dock or a way is refused); `free` false keeps the ship on its route (the ticket).
// HIRE_FLIGHT is the rented skiff (not a story flight, so not in FLIGHTS): it starts at the hire post it was opened
// from ('sky:hire@<dock>'), has no destination until the player picks one, and lands at any dock it may (6.1).

export const SKY_REGIONS = Object.freeze({
  verdant: Object.freeze({ id: 'verdant', name: 'The Verdant Wilds', col: 0, row: 0, art: 'verdant', license: Object.freeze(['ticket', 'hire', 'own']), level: 1 }),
  // the ticket may still cross the fen (the Prologue's flight); a hired or owned skiff needs level 36
  gloomfen: Object.freeze({ id: 'gloomfen', name: 'The Gloomfen Marsh', col: 0, row: 1, art: 'gloomfen', license: Object.freeze(['ticket', 'hire', 'own']), level: Object.freeze({ hire: 36, own: 36 }) }),
});

export const DOCKS = Object.freeze({
  bogmire: Object.freeze({ id: 'bogmire', name: 'Bogmire', region: 'gloomfen', at: [405, 470], map: 'bogmire-docks', anchor: 'from-skiff',
    license: Object.freeze(['ticket']), level: Object.freeze({ hire: 36, own: 36 }) }),
  // T2: the skiff lands at the landing field outside the south gate (th-landing), not in the town
  thornhollow: Object.freeze({ id: 'thornhollow', name: 'Thornhollow', region: 'verdant', at: [1232, 566], map: 'th-landing', anchor: 'from-skiff',
    license: Object.freeze(['ticket', 'hire', 'own']), level: 1, hire: true }),
  eldergrove: Object.freeze({ id: 'eldergrove', name: 'Eldergrove', region: 'verdant', at: [1278, 300], map: 'th-eldergrove', anchor: 'from-skiff',
    license: Object.freeze(['hire', 'own']), level: 1, hire: true }),
  mosswatch: Object.freeze({ id: 'mosswatch', name: 'Mosswatch', region: 'verdant', at: [715, 462], map: 'th-mossfall', anchor: 'from-skiff',
    license: Object.freeze(['hire', 'own']), level: 1, if: Object.freeze({ flag: 'c1-west-open' }), hire: true, world: [280, 185] }),
  // land only: no hire post
  fawnrest: Object.freeze({ id: 'fawnrest', name: 'Fawnrest', region: 'verdant', at: [1075, 705], map: 'th-fawnrest', anchor: 'from-skiff',
    license: Object.freeze(['hire', 'own']), level: 1, if: Object.freeze({ flag: 'c1-fawnrest' }) }),
});

// the Fjords harbour: seen from the air, but no licence to land (and no map in T2)
export const SKY_MARKS = Object.freeze({
  fjords: Object.freeze({ id: 'fjords', name: 'The Fjords', region: 'verdant', at: [365, 205], why: 'licence', world: [205, 128] }),
});

export const FLIGHTS = Object.freeze({
  'first-flight': Object.freeze({
    from: 'bogmire', to: 'thornhollow', free: false, license: 'ticket', ship: 'first', pilot: 'yara',
    lines: Object.freeze([
      ['yara', 'Hold on to something that is bolted down. We heat the crystal, and up we go.'],
      ['yara', 'Thornhollow is north, past the top of the fen. You want to learn? Take the wheel. I will shout before we hit anything.'],
    ]),
    says: Object.freeze({
      speaker: 'yara',
      mapHint: 'Tap Thornhollow and I will fly us there. Or take the wheel yourself.',
      from: 'We just came from there.',
      locked: 'The fare is to Thornhollow. Nowhere else, not today.',
      unlicensed: 'The fare is to Thornhollow. Nowhere else, not today.',
      unknown: 'The fare is to Thornhollow. Nowhere else, not today.',
      edge: 'Not that way. The Aether is rough past here, and the fare is to Thornhollow.',
    }),
  }),
});

// the rented skiff (design/09-t2-spec.md 6.1): opened as 'sky:hire@<dock>'; the fee or the ticket is paid in dialogue
export const HIRE_FLIGHT = Object.freeze({
  ship: 'rented', license: 'hire', free: true, pilot: 'warden', fee: 10,
  lines: Object.freeze([
    ['narrator', 'Licensed docks only, and bring her back in one piece.'],
  ]),
  says: Object.freeze({
    speaker: 'narrator',
    mapHint: 'Tap a licensed dock you know. The skiff will fly itself there.',
    locked: 'You need more flying hours for that dock.',
    story: 'Nobody there is expecting you yet.',
    unlicensed: 'No licence for that dock.',
    unknown: 'You do not know the way there yet. Fly there yourself first.',
    edge: 'The licence stops at the edge of the Wilds.',
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
