// PLACEHOLDER battle screen: auto-plays the battle and hands off to the aftermath screen.
// It is replaced by the real battle screen (src/ui/screens/battle.js + src/ui/battle/).
// Contract: mount(root, ctx, { battle, returnTo }) -> when the battle ends, go to
// ctx.go('aftermath', { battle, returnTo }). The battle screen never calls ctx.setGame.
import { current, act, foeTurn, outcome } from '../../rules/battle.js';
import { autoCommand } from '../../rules/autoplay.js';

export function mount(root, ctx, { battle, returnTo = 'road' }) {
  root.innerHTML = '<p class="label">Battle (placeholder)</p><p>Auto-resolving…</p>';
  let s = battle, guard = 0;
  while (current(s) && guard++ < 2000) {
    const id = current(s);
    s = (s.units[id].side === 'hero' ? act(s, autoCommand(s, id)) : foeTurn(s)).state;
  }
  const t = setTimeout(() => ctx.go('aftermath', { battle: s, returnTo, result: outcome(s) }), 50);
  return { unmount() { clearTimeout(t); } };
}
