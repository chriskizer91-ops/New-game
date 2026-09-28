// The world HUD (M3 spec §5.4): Menu button, place name with the "Next:" line, gold, the Hearth
// Clock (8 Brand coals, uniqueBrands filled, plus the Waking), and the bust strip.
// Exports: createHud(root, { onMenu, onParty }) -> { update(game, walk, next), el, destroy() }
// SCAFFOLD: plain text. WP7 builds it.
// Owner: WP7.

export function createHud(root, handlers = {}) {
  const el = document.createElement('header');
  el.className = 'world-hud';
  root.append(el);
  return {
    el,
    update(game, walk, next) {
      el.textContent = `${walk?.map || ''} · ${game?.gold ?? 0} gold${next ? ` · Next: ${next.text}` : ''}`;
    },
    handlers,
    destroy() { el.remove(); },
  };
}
