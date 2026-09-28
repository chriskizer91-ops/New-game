// Story overlays (M3 spec §2.5, §5.5): the Brand banner, the crownwall sequence (the Atlas image
// with 3 seals cracking over Mossfall, the Hindwood and the Thornway north; 3 s, skippable), the
// Unsmith letter and the to-be-continued card. Uses ui/assets/atlas-image.js.
// Exports (each returns a Promise that settles when it is dismissed):
//   playBrandBanner(ctx, brand), playCrownwalls(ctx), showLetter(ctx, brandId), showToBeContinued(ctx, game)
// SCAFFOLD: every one resolves at once. WP7 builds them.
// Owner: WP7.

import ATLAS_IMAGE from '../assets/atlas-image.js';

export const ATLAS_SRC = ATLAS_IMAGE;
export const playBrandBanner = () => Promise.resolve();
export const playCrownwalls = () => Promise.resolve();
export const showLetter = () => Promise.resolve();
export const showToBeContinued = () => Promise.resolve();
