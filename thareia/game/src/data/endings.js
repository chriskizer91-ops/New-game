// The three endings of Act III (M7 spec A14, §4.7), chosen at the Worldforge's heart once the Unsmith falls. The
// choice is final for the save (game.ending: rules/story.js, the `ending` effect). Kindle Anew, the true ending, needs
// Fenwick's Poker, the Warden's Masterpiece and every page of the Codex (spec A13).
// Owner: P1 (M7); P3 writes the scenes, P7 the cards.

import { deepFreeze } from '../core/freeze.js';

export const ENDINGS = deepFreeze({
  rekindle: { id: 'rekindle', name: 'Rekindle', text: 'The Sleepers chained again, and the hearth as it was.' },
  release: { id: 'release', name: 'Release', text: 'The chains broken, and the hearth gone out.' },
  anew: { id: 'anew', name: 'Kindle Anew', text: 'The Sleepers freed, and the hearth fed a legend of your own.', needs: { all: [{ owns: 'fenwicks-poker' }, { masterpiece: true }, { pages: 'all' }] } },
});
export const ENDING_IDS = Object.freeze(Object.keys(ENDINGS));
