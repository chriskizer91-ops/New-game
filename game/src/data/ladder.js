// The Ladder (M3 spec §3.6, M4 spec §3.6, M5 spec §3.6, M6 spec §3.6, M7 spec §3.6): one poster per villain, in order:
// Act I, then the Act II posters of the Sunscorch, the Ironspire and the Gloomfen, then Act III's (M7), then the rumours.
// LADDER = [{ id, enc?, spawn?, name, silhouette?, act, if?, found? }]
//   enc/spawn  the encounter and spawn index whose foe the poster shows (renderFoe silhouette)
//   silhouette a rumour: no encounter yet, only a name
//   if         (M6) the entry shows only once its condition holds (the man on the barge, once Tamsin has fallen)
//   found      (M7) { poster, if }: a rumour settled into a poster. Once `if` holds, the rumour is found: it shows
//              "Found: <that poster's name>" and points at it (the missing smith and the man on the barge were both the
//              Unsmith, and the fifth council shows it)
//   state      silhouette -> scouted (flags.scouted[id], sighted or fought) -> settled ({ beaten: enc })
// Owner: WP3S (M3), P3 story (M4, M5, M6, M7).

import { deepFreeze } from '../core/freeze.js';

const P = (id, enc, name, spawn = 0) => ({ id, enc, spawn, name, act: 1 });
const P2 = (id, enc, name, spawn = 0) => ({ id, enc, spawn, name, act: 2 });
const P3 = (id, enc, name, spawn = 0) => ({ id, enc, spawn, name, act: 3 });
// M7 (spec §2.4, §3.6): the rumours settle into the Unsmith's poster once the fifth council has sat (the gifts carry
// Harrow's mark, and Hilda knows it)
const FOUND = { poster: 'unsmith', if: { flag: 'council-5-done' } };

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
  // M6: the Gloomfen Marsh (spec §3.6). M5's rumour of the Lantern Mother is her poster now.
  P2('hodge', 'hodge', 'Hodge of Rotbridge'),
  P2('grandfather-willow', 'wm-willow', 'Grandfather Willow'),
  P2('mother-grue', 'grue-hollow', 'Mother Grue'),
  P2('lantern-mother', 'lantern-mother', 'The Lantern Mother'),
  P2('salvage-master', 'mh-salvage', 'The Salvage-Master'),
  P2('drowned-cantor', 'cantor', 'The Drowned Cantor'),
  P2('old-jaws', 'old-jaws', 'Old Jaws'),
  P2('blackwater-leviathan', 'blackwater-leviathan', 'The Blackwater Leviathan'),
  // M7: the Hearth Below (spec §3.6): the Hollow Council, silhouettes until the fifth council sits (its scene scouts
  // them), and the Unsmith, a silhouette until Tamsin's return (hers scouts him). The two rumours below settle into his.
  P3('hollow-miravel', 'hollow-miravel', 'Hollow Miravel'),
  P3('hollow-qasim', 'hollow-qasim', 'Hollow Qasim'),
  P3('hollow-brundar', 'hollow-brundar', 'Hollow Brundar'),
  P3('hollow-gretch', 'hollow-gretch', 'Hollow Gretch'),
  P3('unsmith', 'unsmith', 'The Unsmith'),
  // Act II rumours: Harrow is still missing (M7: found, the Unsmith)
  { id: 'missing-smith', name: 'the missing smith', silhouette: true, act: 2, found: FOUND },
  // M6: the man on the barge who took Tamsin: a rumour once she has fallen (her duel over, won or yielded; M7: found)
  { id: 'man-on-the-barge', name: 'the man on the barge', silhouette: true, act: 2, if: { any: [{ flag: 'tamsin-fallen' }, { beaten: 'tamsin-rotbridge' }, { flag: 'tamsin-yielded-4' }] }, found: FOUND },
]);
