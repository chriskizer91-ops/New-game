// Thareia: the mini map, in the corner of the walking view. It draws the map's walkable ground (the paths you can
// walk, traced from the painting), and where things are: you, people, fires, chests, fights, the ways out (open or
// shut), and the next objective (a gold star; on another map, the way out toward it).
// Tap it to open it large; tap again (or press M) to close it.
//   createMinimap({ onToggle }) -> { el, update(game, walk, objective), toggle(open?) }
import { tileOf } from '../../data/tiles.js';
import { MAPS } from '../../data/maps/index.js';
import * as W from '../../rules/world.js';

const COL = {
  ground: '#b89a6a', stair: '#d6bf8c', water: '#1f4550', solid: '#141014', edge: '#2a2018',
  you: '#fff6d8', person: '#7fc4ff', fire: '#ffae3a', chest: '#ffd84a', fight: '#ff5a4a', exit: '#8ad872', shut: '#c9564a', sign: '#e8dcc0', star: '#ffcb66',
};

export function createMinimap({ onToggle } = {}) {
  const box = document.createElement('button');
  box.type = 'button';
  box.className = 'w-minimap';
  box.setAttribute('aria-label', 'Mini map: tap to open it large');
  const cv = document.createElement('canvas');
  const label = document.createElement('span');
  label.className = 'w-minimap-name';
  box.append(cv, label);
  let big = false, last = null;
  box.addEventListener('click', () => toggle());
  function toggle(open = !big) {
    big = open;
    box.classList.toggle('big', big);
    box.setAttribute('aria-label', big ? 'Mini map, large: tap to close it' : 'Mini map: tap to open it large');
    if (last) draw(...last);
    if (onToggle) onToggle(big);
  }

  function draw(game, walk, objective) {
    const map = MAPS[walk.map];
    if (!map) return;
    label.textContent = map.name;
    const r = box.getBoundingClientRect();
    const maxW = big ? Math.min(innerWidth - 32, 720) : 150, maxH = big ? Math.min(innerHeight * .62, 520) : 110;
    const k = Math.max(1, Math.min(big ? 14 : 4, maxW / map.w, maxH / map.h));
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const Wd = Math.round(map.w * k), Hd = Math.round(map.h * k);
    cv.style.width = Wd + 'px'; cv.style.height = Hd + 'px';
    cv.width = Math.round(Wd * dpr); cv.height = Math.round(Hd * dpr);
    void r;
    const g = cv.getContext('2d');
    g.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
    g.clearRect(0, 0, map.w, map.h);
    // the ground: walkable tiles, water, and the rest
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const ch = map.rows[y][x], t = tileOf(ch);
      g.fillStyle = !t.solid ? (ch === 's' || ch === '+' ? COL.stair : COL.ground) : t.id === 'water' ? COL.water : COL.solid;
      g.fillRect(x, y, 1, 1);
    }
    // a soft outline along the path's edge, so a one-tile boardwalk still reads
    g.fillStyle = COL.edge;
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      if (tileOf(map.rows[y][x]).solid) continue;
      const solidAt = (xx, yy) => xx < 0 || yy < 0 || xx >= map.w || yy >= map.h || tileOf(map.rows[yy][xx]).solid;
      const e = .12;
      if (solidAt(x, y - 1)) g.fillRect(x, y, 1, e);
      if (solidAt(x, y + 1)) g.fillRect(x, y + 1 - e, 1, e);
      if (solidAt(x - 1, y)) g.fillRect(x, y, e, 1);
      if (solidAt(x + 1, y)) g.fillRect(x + 1 - e, y, e, 1);
    }
    const dot = (x, y, c, rad = .45) => { g.fillStyle = c; g.beginPath(); g.arc(x + .5, y + .5, rad, 0, Math.PI * 2); g.fill(); };
    const ring = (x, y, c, rad = .6) => { g.strokeStyle = c; g.lineWidth = .22; g.beginPath(); g.arc(x + .5, y + .5, rad, 0, Math.PI * 2); g.stroke(); };
    // the ways out
    for (const ex of map.exits || []) {
      const [x0, y0, x1, y1] = ex.area, shut = !!ex.sealed && !(ex.to && ex.gate);
      g.fillStyle = shut ? COL.shut : COL.exit;
      g.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }
    // people and things
    let here = [];
    try { here = W.present(game, map.id); } catch { here = []; }
    const at = e => (e.at ? e.at : e.area ? [Math.round((e.area[0] + e.area[2]) / 2), Math.round((e.area[1] + e.area[3]) / 2)] : null);
    for (const e of here) {
      const p = at(e); if (!p) continue;
      if (e.kind === 'npc') dot(p[0], p[1], COL.person);
      else if (e.kind === 'hearthfire') dot(p[0], p[1], COL.fire, .5);
      else if (e.kind === 'chest' && e.state !== 'open' && !e.hidden) { g.fillStyle = COL.chest; g.fillRect(p[0] + .15, p[1] + .2, .7, .6); }
      else if (e.kind === 'encounter') { g.fillStyle = COL.fight; g.save(); g.translate(p[0] + .5, p[1] + .5); g.rotate(Math.PI / 4); g.fillRect(-.35, -.35, .7, .7); g.restore(); }
      else if ((e.kind === 'sign' || e.kind === 'board') && e.look !== 'painted') { g.fillStyle = COL.sign; g.fillRect(p[0] + .3, p[1] + .3, .4, .4); }
    }
    for (const rm of walk.roamers || []) dot(rm.x, rm.y, COL.fight, .38);
    // the objective: its thing here, or the way out toward its map
    if (objective) {
      let p = null;
      if (objective.map === map.id) { const e = (map.entities || []).find(q => q.id === objective.entity); if (e) p = at(e); }
      else { const ex = (map.exits || []).find(q => q.to === objective.map); if (ex) p = [Math.round((ex.area[0] + ex.area[2]) / 2), Math.round((ex.area[1] + ex.area[3]) / 2)]; }
      if (p) star(g, p[0] + .5, p[1] + .5, big ? 1.1 : 1.8);
    }
    // you
    ring(walk.x, walk.y, '#0b0910', .75); dot(walk.x, walk.y, COL.you, .6);
  }
  function star(g, cx, cy, R) {
    g.fillStyle = COL.star; g.strokeStyle = '#0b0910'; g.lineWidth = .18;
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * .45 : R; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.stroke();
  }
  return {
    el: box,
    update(game, walk, objective) { last = [game, walk, objective]; draw(game, walk, objective); },
    toggle,
    get big() { return big; },
  };
}
