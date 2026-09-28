// World overlays (M3 spec §5.5), all through ui/lib/overlay.js openOverlay (keeps the focus trap).
// Exports (each returns a Promise that settles when the overlay closes):
//   openPrefight(ctx, { game, encId }) -> Promise<'fight'|'not-yet'>
//   openLockPrompt(ctx, { game, entity, status }) -> Promise<'use'|'not-yet'>
//   openHearthMenu(ctx, { game, hfId }) -> Promise<'rest'|'travel'|'party'|'leave'>
//   openPauseMenu(ctx) -> Promise<'party'|'codex'|'journal'|'atlas'|'settings'|'title'|null>
//   openShop(ctx, { game, shopId }) -> Promise<game>
//   openForge(ctx, { game }) -> Promise<game>
//   showSpoils(ctx, { report }) -> Promise<void>
// SCAFFOLD: every sheet resolves at once with its "cancel" answer. WP7 builds them.
// Owner: WP7.

export const openPrefight = () => Promise.resolve('not-yet');
export const openLockPrompt = () => Promise.resolve('not-yet');
export const openHearthMenu = () => Promise.resolve('leave');
export const openPauseMenu = () => Promise.resolve(null);
export const openShop = (ctx, { game } = {}) => Promise.resolve(game);
export const openForge = (ctx, { game } = {}) => Promise.resolve(game);
export const showSpoils = () => Promise.resolve();
