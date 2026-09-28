// The Ladder (M3 spec §3.6): one poster per villain, in order, then the Act II silhouettes.
// LADDER = [{ id, enc?, spawn?, name, silhouette?, act }]
//   enc/spawn  the encounter and spawn index whose foe the poster shows (renderFoe silhouette)
//   state      silhouette -> scouted (flags.scouted[id], sighted or fought) -> settled ({ beaten: enc })
// Owner: WP3S.

import { deepFreeze } from '../core/freeze.js';

const P = (id, enc, name, spawn = 0) => ({ id, enc, spawn, name, act: 1 });

export const LADDER = deepFreeze([
  P('sneck', 'keep-vault', 'Sneck the Tallyman'),
  P('skarn', 'bramble-toll', 'Skarn'),
  P('ledger-maud', 'tally-camp', 'Ledger-Maud'),
  P('old-snag', 'snag-wallow', 'Old Snag'),
  P('rot-stag', 'rotstag-glade', 'The Rot-Stag'),
  P('briarmaw', 'briarmaw-den', 'Briarmaw'),
  P('mags', 'hr-smugglers', 'Mags Kestrel'),
  P('haskett', 'poachers-holm', 'Haskett'),
  P('hollis', 'mw-lantern', 'Hollis Fairweight'),
  P('gorrow', 'mire-shrine', 'Gorrow the Mire-King'),
  P('gloamwing', 'gloamwing-hollow', 'The Gloamwing'),
  P('vesper', 'vesper-stall', 'Vesper'),
  P('oda', 'grove-circle', 'Oda the Thornmother'),
  P('tamsin', 'tamsin-duel', 'Tamsin'),
  P('corra', 'hollowed-patrol', 'Sgt Corra Thistle'),
  P('dun', 'hr1-tappers', 'Dun the Counter'),
  P('rotwarden', 'rotwarden-heart', 'The Rotwarden'),
  { id: 'glass-scorpion', name: 'a glass scorpion', silhouette: true, act: 2 },
  { id: 'lantern-mother', name: 'the Lantern Mother', silhouette: true, act: 2 },
  { id: 'missing-smith', name: 'the missing smith', silhouette: true, act: 2 },
]);
