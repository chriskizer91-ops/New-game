// Word lists for generated item names and Storied lore lines, in the Aethermoor voice.

import { deepFreeze } from '../core/freeze.js';

export const NAMES = deepFreeze({
  // Worn items get one of these in front of the base name ("Rust-Pitted Hand Axe").
  worn: ['Rust-Pitted', 'Patched', 'Notched', 'Scuffed', 'Hand-Me-Down', 'Road-Worn', 'Dented', 'Frayed'],
  // Storied proper names are built from two halves ("Ashwick", "Thornsong").
  first: ['Ash', 'Brier', 'Cinder', 'Dusk', 'Ember', 'Fen', 'Gall', 'Hollow', 'Iron', 'Moss', 'Oath', 'Rime', 'Rook', 'Sorrow', 'Thorn', 'Wick', 'Wren', 'Yew'],
  second: ['wick', 'song', 'fall', 'mourn', 'ward', 'bite', 'mere', 'thorn', 'keep', 'call', 'hollow', 'tooth', 'shade', 'reach', 'vow', 'brand'],
  epithet: ['the Patient', 'the Unpaid', 'the Last Word', 'the Long Road', 'the Quiet Oath', 'the Second Chance', 'the Late Harvest', 'the Unforgiven'],
  places: ['the Hearth Road', 'Thornhollow', 'Eldergrove', 'Mosswatch', 'Fawnrest', 'the Verdant Wilds', 'Briarmaw\'s den', 'the Waymarker Stones'],
  lore: [
    'It was somebody\'s best. It still thinks it is.',
    'Whoever carried it last carved a name on it, then scratched the name out.',
    'It hums when the hearth-coals are near, like it remembers being warm.',
    'Three owners, two graves, one very long walk home.',
    'It has been lost in the bramble twice and found both times, which says something.',
    'The Tallymen had it in a ledger under "not yet collected".',
    'Old Garret swears he saw it in the Mosswatch signal-fire once.',
    'It is heavier than it looks, and so is the story.',
  ],
});
