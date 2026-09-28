// Title: the Keep at dusk with the party on the road, the name, and the way in (M3 spec §5.7).
//   - a live save: "Continue", sub-line "Wren · Thornhollow · Day 4 · Lv 5 · 9/24 relics"
//   - no live save yet, but an earlier milestone's: "Continue from Milestone 3" (or, with only an M2
//     save, "Continue from the Gauntlet") -> the carry-over card -> "Walk on" -> ctx.adopt(game) (held
//     in memory; the world writes it, to this milestone's own key, on the first step)
//   - "New game" over any journey asks first; newgame's Begin backs the old save up (ctx.replaceGame)
//   - the milestone tag (TAG)
// Owner: WP8.
import { renderBackdrop, renderHero } from '../../art/index.js';
import { el, esc, button, toCanvas } from '../lib/dom.js';
import { animate, isReduced } from '../lib/anim.js';
import { gearOf, customOf } from '../lib/art.js';
import { screenNav } from '../lib/keys.js';
import { openCarryCard } from '../lib/carry.js';
import { saveLine } from '../lib/carry-facts.js';

const TAG = '<span>M4</span> · Sunscorch';

export function mount(root, ctx) {
  const game = ctx.game || null, carry = game ? null : ctx.carry;
  const shown = game || carry; // whose party stands on the road in the painting
  root.classList.add('full');
  const scene = el('div', 'title-scene');
  const cv = el('canvas', { class: 'px', 'aria-hidden': 'true' });
  scene.append(cv, el('div', 'title-fade'));
  const card = el('div', 'title-card');
  card.append(
    el('p', 'realm', 'A pixel JRPG of stolen legends'),
    el('h1', 'title-display game-title', 'Aethermoor'),
    el('p', 'title-sub', 'Hearth &amp; Heirloom'),
    el('p', 'title-ver', TAG),
    el('p', 'title-tag', 'The Eternal Hearth has flickered. Every legend in the land is in someone else’s hands. Go and take them back, one fight at a time.'),
  );
  const menu = el('div', 'title-menu');
  const go = (name, p) => () => { ctx.audio.unlock(); ctx.audio.sfx('confirm'); ctx.go(name, p); };
  if (game) {
    menu.append(button(`Continue<small>${esc(saveLine(game))}</small>`, 'btn primary big title-continue', go('world', { arrive: 'continue' }), { 'data-primary': '' }));
  } else if (carry) {
    const m3 = ctx.carryFrom === 'v2';
    const cont = button(`${m3 ? 'Continue from Milestone 3' : 'Continue from the Gauntlet'}<small>${esc(saveLine(carry))}</small>`, 'btn primary big title-carry', async () => {
      ctx.audio.unlock(); ctx.audio.sfx('select');
      const ok = await openCarryCard(ctx, carry, {
        kind: m3 ? 'm3' : 'm2',
        note: `Your ${m3 ? 'Milestone 3' : 'M2'} save is never touched: the old ${m3 ? 'file' : 'page'} keeps playing it. This milestone keeps its own save, and nothing is saved here until you take your first step.`,
      });
      if (!ok) { cont.focus(); return; }
      ctx.adopt(carry);
      ctx.go('world', { arrive: 'carry' });
    }, { 'data-primary': '' });
    menu.append(cont);
  }
  if (shown) {
    // a new game replaces the journey on this device, so ask first (in the page, never with confirm())
    const w = shown.party.roster.warden;
    const ask = el('div', 'title-confirm'); ask.hidden = true;
    const ng = button('New game', 'btn big title-new', () => { ctx.audio.unlock(); ctx.audio.sfx('select'); ng.hidden = true; ask.hidden = false; ask.querySelector('.btn').focus(); });
    ask.append(
      el('p', '', game
        ? `A new Hearthwarden replaces ${esc(w.name)}’s journey on this device once you begin. It is kept as a backup, and Settings can bring it back.`
        : `A new Hearthwarden starts fresh instead of carrying ${esc(w.name)}’s journey over. The old save itself is never touched, and Settings can still carry it over later.`),
      el('div', 'row-btns', [button('Start fresh', 'btn danger', go('newgame')), button('Keep my journey', 'btn', () => { ctx.audio.sfx('back'); ask.hidden = true; ng.hidden = false; ng.focus(); })]),
    );
    menu.append(ng, ask);
  } else {
    menu.append(button('New game', 'btn primary big title-new', go('newgame'), { 'data-primary': '' }));
  }
  menu.append(button('Settings', 'btn big', go('settings', { from: 'title' })));
  card.append(menu);
  const hint = el('p', 'tap-hint', 'Tap anywhere to wake the hearth');
  card.append(hint);
  card.append(el('p', 'title-foot', 'Plays on a phone or a laptop. Arrows or WASD to move, Enter or Z to confirm, Esc or X to go back.'));
  root.append(scene, card);

  // the painted scene: the Keep at dusk, the party on the road
  const heroes = ['alondra', 'bryn', 'pip', 'warden'];
  const tmp = document.createElement('canvas');
  let W = 0, H = 0, k = 3;
  const wideMQ = matchMedia('(min-width: 1000px) and (min-aspect-ratio: 5/4)');
  const layout = () => {
    const vw = scene.clientWidth || innerWidth, wide = wideMQ.matches;
    const vh = wide ? Math.max(innerHeight, root.clientHeight) : Math.min(innerHeight * (vw < 520 ? .5 : .62), 560);
    k = vw < 520 ? 3 : vw < 1000 ? 4 : 5;
    W = Math.ceil(vw / k); H = Math.max(84, Math.ceil(vh / k));
    cv.width = W; cv.height = H;
    cv.style.width = W * k + 'px'; cv.style.height = H * k + 'px';
  };
  layout();
  const draw = t => {
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.putImageData(renderBackdrop('hearth-road', { w: W, h: H, t, reduced: isReduced() }), 0, 0);
    const floor = Math.round(H * .86);
    const baseX = Math.round(W * (W < 140 ? .58 : wideMQ.matches ? .66 : .62));
    heroes.forEach((id, i) => {
      const gear = shown ? gearOf(shown, id) : undefined;
      const img = renderHero(id, gear, { pose: 'idle', t: t + i * .37, custom: shown ? customOf(shown, id) : undefined, reduced: isReduced() });
      toCanvas(img, tmp);
      const x = baseX + i * 13 - 32 + (i % 2 ? 0 : 3), y = floor - 56 + (i % 2 ? -5 : 0);
      g.drawImage(tmp, x, y);
    });
  };
  animate(cv, draw, 10);

  const unlock = () => { ctx.audio.unlock(); hint.classList.add('gone'); root.removeEventListener('pointerdown', unlock); };
  root.addEventListener('pointerdown', unlock);
  ctx.audio.music('title');
  let rt = 0;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { layout(); draw(performance.now() / 1000); }, 120); };
  addEventListener('resize', onResize);
  const nav = screenNav(root, {});
  return {
    unmount() { removeEventListener('resize', onResize); root.removeEventListener('pointerdown', unlock); clearTimeout(rt); },
    onAction(a) { if (!hint.classList.contains('gone')) { hint.classList.add('gone'); } return nav(a); },
  };
}
