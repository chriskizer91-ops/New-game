// The Ladder (M3 spec §3.6, M4 spec §3.6): one poster per villain, in order: Act I, then the
// Sunscorch's Act II posters, then the rumours of the regions still sealed (Gloomfen, Ironspire).
// LADDER = [{ id, enc?, spawn?, name, silhouette?, act }]
//   enc/spawn  the encounter and spawn index whose foe the poster shows (renderFoe silhouette)
//   silhouette a rumour: no encounter yet, only a name
//   state      silhouette -> scouted (flags.scouted[id], sighted or fought) -> settled ({ beaten: enc })
// Owner: WP3S (M3), P3 story (M4).

import { deepFreeze } from '../core/freeze.js';

const P = (id, enc, name, spawn = 0) => ({ id, enc, spawn, name, act: 1 });
const P2 = (id, enc, name, spawn = 0) => ({ id, enc, spawn, name, act: 2 });

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
  // Act II: the Sunscorch Wastes (M4). The Act I rumour of "a glass scorpion" is Kharzul's poster now.
  P2('rasa', 'sr-toll', 'Rasa the Dune-Rider'),
  P2('sand-wyrm', 'wyrm-lair', 'The Sand Wyrm'),
  P2('brask', 'ds-crew', 'Foreman Brask'),
  P2('kharzul', 'kharzul-heart', 'Kharzul the Glass Scorpion'),
  P2('gnash', 'gnash-camp', 'Gnash the Raider-King'),
  P2('wisp-queen', 'wisp-queen', 'The Wisp-Queen'),
  P2('ash-captain', 'sg-captain', 'The Ash-Captain'),
  P2('ashen-warden', 'ashen-warden', 'The Ashen Warden'),
  // M5: the Ironspire Peaks (spec §3.6). Harrow himself is still missing: his rumour stays below.
  P2('rhune', 'rp-brigands', 'Rhune the Pass-Warden'),
  P2('thunder-roc', 'roc-eyrie', 'The Thunder-Roc'),
  P2('old-horn', 'troll-cave', 'Old Horn'),
  P2('sentinel-captain', 'is-sentinels', 'The Sentinel-Captain'),
  P2('journeyman', 'id-smith', 'Harrow\'s Journeyman'),
  P2('mother-anvil', 'mother-anvil', 'Mother Anvil'),
  P2('drowned-abbess', 'fm-shrine', 'The Drowned Abbess'),
  P2('rime-abbot', 'rime-abbot', 'The Rime-Abbot'),
  // Act II rumours: Gloomfen stays sealed until a later chapter, and Harrow is still missing
  { id: 'lantern-mother', name: 'the Lantern Mother', silhouette: true, act: 2 },
  { id: 'missing-smith', name: 'the missing smith', silhouette: true, act: 2 },
]);
