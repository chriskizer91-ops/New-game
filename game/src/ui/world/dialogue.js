// The dialogue box (M3 spec §5.5): replaces the control deck on phones, docks over the canvas on
// laptops; speaker name, 3 lines typed at 45 chars/s with a per-speaker blip, choices with odds chips.
// Exports: openDialogue(ctx, host, { game, id }) -> Promise<{ game, events }>   runs a dialogue to its end
// SCAFFOLD: resolves at once with the game unchanged. WP7 builds it on rules/story.js.
// Owner: WP7.

export function openDialogue(ctx, host, { game, id } = {}) {
  return Promise.resolve({ game, events: [], id });
}
