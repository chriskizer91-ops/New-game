// The world screen (M3 spec §5.2-5.5): the overworld map, walking, talking, locks, packs and the
// hand-off to battles. mount(root, ctx, params) with params { arrive?: 'new', result?, brand?, wokeAt? }.
//
// SCAFFOLD placeholder: shows the current map name and position, walks with the arrow keys through
// rules/world.js, and links to Party, Atlas, Journal and the old road. It keeps its game in memory
// only (never calls ctx.setGame), so the M2 save is untouched. WP7 replaces it.
// Test seam: with globalThis.__aethTest set, installs window.__world = { state(), teleport(map, x, y, face),
//   press(action), step(dir, n), interact() }.
// Owner: WP7.
import '../world.css';
import { MAPS, v1Anchor } from '../../data/maps/index.js';
import { START_AT } from '../../data/world.js';
import { enterMap, move, interact } from '../../rules/world.js';
import { nextObjective } from '../../rules/story.js';
import { el, button } from '../lib/dom.js';
import { getWalk, setWalk } from '../world/session.js';
import { createView } from '../world/view.js';
import { createHud } from '../world/hud.js';

const ARROW = { up: 'n', down: 's', left: 'w', right: 'e' };

export function mount(root, ctx, params = {}) {
  if (!ctx.game) { ctx.go('title'); return {}; }
  let game = ctx.game;
  const startPos = () => game.progress.pos || v1Anchor(game.progress.node) || START_AT;
  const enter = (map, x, y, face) => {
    const r = enterMap(game, { map, at: [x, y], face });
    game = r.game;
    return setWalk(r.walk);
  };
  let walk = getWalk();
  if (!walk || params.arrive || !MAPS[walk.map]) { const p = startPos(); walk = enter(p.map, p.x, p.y, p.face); }

  const hud = createHud(root);
  const place = el('h1', 'title-display world-place');
  const pos = el('p', 'world-pos');
  const cv = el('canvas', { class: 'world-canvas px', role: 'img' });
  const log = el('p', { class: 'world-log', 'aria-live': 'polite' });
  const view = createView(cv, { reduced: ctx.reduced() });
  const actions = el('nav', { class: 'world-actions', 'aria-label': 'Menu' });
  actions.append(
    button('Party', 'btn', () => { ctx.audio.sfx('confirm'); ctx.go('party'); }),
    button('Atlas', 'btn', () => { ctx.audio.sfx('confirm'); ctx.go('atlas', { mode: 'view' }); }),
    button('Journal', 'btn', () => { ctx.audio.sfx('confirm'); ctx.go('journal', { tab: 'quests' }); }),
    button('The old road', 'btn primary', () => { ctx.audio.sfx('confirm'); ctx.go('road'); }, { 'data-primary': '' }),
  );
  root.append(place, pos, cv, log, actions);

  function render(events = []) {
    const map = MAPS[walk.map];
    place.textContent = map ? map.name : walk.map;
    pos.textContent = `${walk.map} · ${walk.x}, ${walk.y} facing ${walk.face}`;
    cv.setAttribute('aria-label', map ? map.name : walk.map);
    const said = events.map(e => e.text || e.t).filter(Boolean);
    if (said.length) log.textContent = said.join(' · ');
    hud.update(game, walk, nextObjective(game));
    view.setMap(walk.map);
    view.resize(cv.clientWidth || 480, cv.clientHeight || 320);
    view.draw(game, walk);
  }

  function step(dir) {
    const r = move(game, walk, dir);
    game = r.game; walk = setWalk(r.walk);
    const exit = r.events.find(e => e.t === 'exit');
    if (exit) { const r2 = enterMap(game, { map: exit.to, anchor: exit.anchor }); game = r2.game; walk = setWalk(r2.walk); }
    render(r.events);
    return r.events;
  }
  function act() {
    const r = interact(game, walk);
    render(r.events);
    return r.events;
  }

  render();
  ctx.audio.music('road');

  if (typeof globalThis.__aethTest === 'function') {
    window.__world = {
      state: () => ({ map: walk.map, x: walk.x, y: walk.y, face: walk.face, tick: walk.tick }),
      teleport: (map, x, y, face = 's') => { walk = enter(map, x, y, face); render(); return true; },
      press: a => onAction(a),
      step: (dir, n = 1) => { let ev = []; for (let i = 0; i < n; i++) ev = ev.concat(step(dir)); return ev; },
      interact: () => act(),
    };
  }

  function onAction(a) {
    if (document.querySelector('.ov')) return false;
    if (ARROW[a]) { step(ARROW[a]); return true; }
    if (a === 'confirm') {
      const f = document.activeElement;
      if (f && f.tagName === 'BUTTON' && root.contains(f)) return false; // the browser presses it
      act();
      return true;
    }
    return false;
  }

  return {
    unmount() { view.destroy(); hud.destroy(); if (window.__world) window.__world = undefined; },
    onAction,
  };
}
