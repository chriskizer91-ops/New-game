// The Atlas (M3 spec §5.6): the illustrated map with "you are here", kindled Hearthfires (tap to
// travel in travel mode), known places, sighted holders and claimed relics, Longwatch marks and
// the sealed regions. mount(root, ctx, { mode: 'travel' | 'view' }).
// SCAFFOLD placeholder: a plain list of the ten Hearthfires with their kindled state, and Back.
// Owner: WP8.
import { HEARTHS } from '../../data/world.js';
import { MAPS } from '../../data/maps/index.js';
import { el, button } from '../lib/dom.js';
import { screenNav } from '../lib/keys.js';

export function mount(root, ctx, params = {}) {
  if (!ctx.game) { ctx.go('title'); return {}; }
  const game = ctx.game, mode = params.mode === 'travel' ? 'travel' : 'view';
  const kindled = game.progress.flags.kindled || {};
  const back = () => { ctx.audio.sfx('back'); ctx.go('world'); };
  const top = el('header', 'topbar');
  const title = el('div', 'tb-title');
  title.append(el('span', { class: 'realm', text: mode === 'travel' ? 'Travel' : 'The Atlas' }), el('h1', { class: 'title-display', text: 'The Verdant Wilds' }));
  top.append(button('‹ Back', 'btn ghost back', back, { 'data-primary': '' }), title);
  const list = el('ul', 'atlas-list');
  for (const [id, h] of Object.entries(HEARTHS)) {
    const li = el('li', '');
    li.textContent = `${h.name} · ${MAPS[h.map]?.name || h.map} · ${kindled[id] ? 'kindled' : h.cold ? 'cold' : 'unvisited'}`;
    list.append(li);
  }
  root.append(top, list);
  return { onAction: screenNav(root, { back, menu: back }) };
}
