// The world screen (M3 spec §5.2-5.5): the overworld map, walking, talking, locks, packs and the
// hand-off to battles. mount(root, ctx, params) with params { arrive?: 'new'|'continue'|'carry'|'load'|
// 'travel' } from the menus (new, load and carry drop the old Walk; the rest re-enter at
// game.progress.pos unless the Walk already stands there), or the aftermath's
// { result, brand, wokeAt, yield, rematch, enc }.
//
// The engine is rules/world.js (§4.5) and rules/story.js (§4.4), driven by events: every move, tick
// and interaction returns an ordered event list; sync ones (turn, step, bump, alert, roam, sighted,
// hazard) update the picture at once, the rest run in order after the step lands and stop at the
// first battle-starting event. The Walk lives in ui/world/session.js so it survives the battle.
// Saving (§5.5): ctx.setGame on map change, before a battle, after every game-changing event, every
// 20 steps and on pagehide/visibilitychange; ctx.commitAdopted() on the first successful step.
// Test seam: with globalThis.__aethTest set, installs window.__world = { state(), teleport(map, x, y, face),
//   press(key), step(dir, n), interact(), ... } (see installSeam below) and window.__worldTools.
// Owner: WP7.
import '../world.css';
import { MAPS, v1Anchor } from '../../data/maps/index.js';
import { START_AT, HEARTHS, ZONES } from '../../data/world.js';
import { ENCOUNTERS } from '../../data/encounters.js';
import { FOES } from '../../data/foes.js';
import { DIALOGUE } from '../../data/dialogue.js';
import { NPCS } from '../../data/npcs.js';
import { LOCKS, CROWNWALL } from '../../data/locks.js';
import { RELICS } from '../../data/relics.js';
import { TUNING } from '../../data/tuning.js';
import { createRng } from '../../core/rng.js';
import * as W from '../../rules/world.js';
import * as G from '../../rules/gauntlet.js';
import * as Story from '../../rules/story.js';
import { check } from '../../rules/cond.js';
import { migrate, SAVE_VERSION } from '../../rules/migrate.js';
import { relicItem } from '../../rules/loot.js';
import { dirTo, DIRS } from '../../rules/path.js';
import * as Art from '../../art/index.js';
import { el } from '../lib/dom.js';
import { overlayOpen } from '../lib/overlay.js';
import { session, getWalk, setWalk, setPending, takePending, clearSession, afterBattle } from '../world/session.js';
import { createView } from '../world/view.js';
import { createActors, gearSig, newGearName } from '../world/actors.js';
import { createControls } from '../world/controls.js';
import { createHud, createSidePanel } from '../world/hud.js';
import { openDialogue, openMessage } from '../world/dialogue.js';
import { openPrefight, openLockPrompt, openHearthMenu, openPauseMenu, openShop, openForge, showSpoils, previewRelic } from '../world/sheets.js';
import { playBrandBanner, playCrownwalls, showLetter, playCouncil, showToBeContinued } from '../world/story-fx.js';
import { createLoop } from '../world/loop.js';
import {
  TILE, STEP_MS, RUN_MS, IDLE_TICK_MS, HOLD_MS, FADE_MS, SAVE_EVERY_STEPS, NEAR_TILES, MAP_ZOOM, TAP_TURN_MS, IDLE_FPS, MAX_SPRITES, SHOWOFF_MS, MAX_PATH,
} from '../world/constants.js';

const RATING = { easy: 'Easy', fair: 'Fair', hard: 'Hard', deadly: 'Deadly' };
const LOCK_VERB = { thornwall: 'Cut', bramble: 'Part', stream: 'Cross', boulder: 'Break', 'cold-hearth': 'Light', 'tally-seal': 'Break', 'barred-gate': 'Open', 'rot-knot': 'Untie', 'rope-ledge': 'Climb', darkness: 'Look', ichor: 'Look' };
const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
const covers = (e, x, y) => { const [x0, y0, x1, y1] = areaOf(e); return x >= x0 && x <= x1 && y >= y0 && y <= y1; };
const distTo = (e, x, y) => { const [x0, y0, x1, y1] = areaOf(e); return Math.max(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withFlags = (g, patch) => ({ ...g, progress: { ...g.progress, flags: { ...g.progress.flags, ...patch } } });
const shortName = (g, id) => { const h = g.party.roster[id]; return !h ? id : id === 'alondra' ? 'Alondra' : h.name.split(' ')[0]; };
// Grace after every fight; the roamer is gone (victory, rout) or stunned (fled): rules/world.js
// afterBattle when the engine has it, else the same bookkeeping in ui/world/session.js.
function backFromBattle(game, walk, roamerId, result) {
  if (typeof W.afterBattle === 'function') return W.afterBattle(game, walk, { roamerId, result: result || 'fled' });
  return afterBattle(walk, { roamerId }, result);
}

// Test tools that exist before the world mounts (e2e-world builds its games with them).
if (typeof globalThis.__aethTest === 'function' && typeof window !== 'undefined') {
  window.__worldTools = {
    // a v2 new game (until rules/gauntlet.js newGame returns v2 itself: migrate, then undo the M2 carry-over bits)
    newGame: o => {
      const g = G.newGame(o);
      if ((g.version || 1) >= 2) return g;
      const v = migrate(g);
      delete v.migratedFrom;
      v.progress.flags.story = { starter: v.progress.flags.story.starter };
      v.progress.flags.kindled = { 'hearthstone-keep': true };
      v.progress.pos = { ...START_AT };
      return v;
    },
    migrate: g => migrate(g),
    relicItem: (id, from = 'the e2e') => relicItem(id, createRng(`e2e:${id}`), { from, where: 'e2e', day: 1 }),
    maps: () => Object.keys(MAPS),
    hearth: id => ({ ...HEARTHS[id] }),
    entityOf: (map, id) => { const e = (MAPS[map]?.entities || []).find(q => q.id === id); return e ? structuredClone(e) : null; },
    // a walkable tile next to an entity, facing it (sides tried in order: s, w, e, n by default)
    standBy: (map, id, prefer = ['s', 'w', 'e', 'n']) => {
      const e = (MAPS[map]?.entities || []).find(q => q.id === id);
      if (!e) return null;
      const [x0, y0, x1, y1] = e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
      const mx = Math.round((x0 + x1) / 2), my = Math.round((y0 + y1) / 2);
      const spots = { s: [mx, y1 + 1, 'n'], n: [mx, y0 - 1, 's'], w: [x0 - 1, my, 'e'], e: [x1 + 1, my, 'w'] };
      const g = window.__world?.game?.();
      for (const side of prefer) { const [x, y, face] = spots[side]; if (!g || W.canWalk(g, map, x, y)) return { x, y, face }; }
      const [x, y, face] = spots[prefer[0]];
      return { x, y, face };
    },
  };
}

export function mount(root, ctx, params = {}) {
  if (!ctx.game) { ctx.go('title'); return {}; }
  const reduced = ctx.reduced();
  let dead = false, left = false, lastSet = ctx.game;

  // ---- the game and the Walk -------------------------------------------------------------------------
  let game = ctx.game;
  // An older milestone's game reached the world: migrate it in memory and adopt it (ctx.adopt keeps
  // setGame in memory until the first step). Without ctx.adopt, nothing is written before the first step.
  let legacy = false;
  if ((game.version || 1) < SAVE_VERSION) {
    try { game = (ctx.migrate || migrate)(game); } catch (err) { console.error(err); }
    if (typeof ctx.adopt === 'function') { ctx.adopt(game); lastSet = ctx.game; } else legacy = true;
  }
  // a new, loaded or carried-over game never continues the old Walk
  const newGameArrival = params.arrive === 'new' || params.arrive === 'load' || params.arrive === 'carry';
  if (newGameArrival) clearSession();
  const pending = takePending();
  const pos = game.progress.pos || v1Anchor(game.progress.node) || START_AT;
  let walk = getWalk();
  const same = !!walk && session.seed === game.seed && !!W.mapOf(walk.map) && walk.map === pos.map && walk.x === pos.x && walk.y === pos.y;
  let fresh = newGameArrival || !same;
  let entryEvents = [];
  const result = params.result || (pending && fresh ? 'defeat' : null);
  if (!fresh && pending) walk = setWalk(backFromBattle(game, walk, pending.roamerId, result));
  if (fresh) {
    const map = W.mapOf(pos.map) ? pos.map : START_AT.map;
    const at = W.mapOf(pos.map) ? [pos.x, pos.y] : [START_AT.x, START_AT.y];
    const r = W.enterMap(game, { map, at, face: pos.face || 's' });
    game = r.game; walk = setWalk(r.walk);
    if (pending) walk = setWalk({ ...walk, grace: Math.max(walk.grace || 0, TUNING.world?.grace ?? 6) });
    entryEvents = r.events.filter(e => e.t !== 'enter');
  }
  session.seed = game.seed;

  // ---- the page ------------------------------------------------------------------------------------
  root.classList.add('world-root');
  const wrap = el('div', 'w-wrap');
  const hud = createHud({ onMenu: () => openMenu(), onParty: id => leave('party', { hero: id }) });
  const stage = el('div', 'w-stage');
  const canvas = el('canvas', { class: 'world-canvas px', role: 'img', 'aria-label': 'The map' });
  const plates = el('div', { class: 'w-plates', 'aria-hidden': 'true' });
  const stagePrompt = el('p', { class: 'w-stage-prompt', 'aria-hidden': 'true' });
  const frame = el('div', 'w-frame');
  frame.append(canvas, plates);
  stage.append(frame, stagePrompt);
  const controls = createControls(root, {
    onA: () => pressA(), onB: () => pressB(), onMenu: () => openMenu(),
    onJournal: () => leave('journal', { tab: 'quests' }), onTouch: () => { touched = true; syncDeck(); },
    blocked: () => lock > 0 || M.transition,
  });
  const side = createSidePanel({ onParty: id => leave('party', { hero: id }), onNearby: key => nearbyGo(key) });
  const live = el('p', { class: 'sr-only', 'aria-live': 'polite' });
  wrap.append(hud.top, hud.busts, stage, controls.deck, side.el, live);
  root.append(wrap);

  const view = createView(canvas, { reduced, plateHost: plates });
  const actors = createActors({ reduced });
  const list = new Array(MAX_SPRITES).fill(null), emo = new Array(12).fill(null);
  const DRAWS = new Uint16Array(2048);
  let drawN = 0;

  // the deck shows on (pointer:coarse), after the first touch, or when the setting says so
  const coarseMQ = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
  let touched = false;
  function syncDeck() {
    const s = ctx.settings.touchControls || 'auto';
    const on = s === 'on' || (s !== 'off' && (touched || !!coarseMQ?.matches));
    root.classList.toggle('deck-on', on);
  }
  syncDeck();

  // ---- movement state ------------------------------------------------------------------------------
  const M = { moving: false, blocked: false, end: 0, dur: 0, chain: false, turnAt: 0, idleAt: 0, steps: 0, sinceSave: 0, firstStep: false, path: null, then: null, transition: false, pendingA: false };
  let lock = 0; // async flows in progress (dialogue, sheets, transitions)
  let talking = false; // a dialogue box is open (the camera looks lower)
  let threatMemo = { game: null, map: new Map() };

  function apply(r) {
    if (r.game) game = r.game;
    if (r.walk) walk = setWalk(r.walk);
  }
  function save() {
    if (dead) return;
    game = W.commit(game, walk);
    if (legacy && !M.firstStep) return;
    ctx.setGame(game);
    lastSet = game;
    hud.saved();
    M.sinceSave = 0;
  }
  // Card overlays can change ctx.game (equip, identify): take their game back, with its showoffs.
  async function cards(fn) {
    save();
    const r = await fn();
    if (!dead && ctx.game && ctx.game !== lastSet) {
      game = ctx.game; lastSet = game;
      refreshWorld();
      const s = showoffs();
      if (s.length) await playShowoffs(s);
    }
    return r;
  }
  function announce(t) { live.textContent = ''; live.textContent = t; }
  function setPrompt(t, isHint = false) {
    controls.setPrompt(t);
    controls.prompt.classList.toggle('hint', isHint);
    if (stagePrompt.textContent !== (t || '')) stagePrompt.textContent = t || '';
    stagePrompt.classList.toggle('hint', isHint);
    stagePrompt.hidden = !t;
  }
  function threatOf(encId) {
    if (threatMemo.game !== game) threatMemo = { game, map: new Map() };
    if (!threatMemo.map.has(encId)) { let t = null; try { t = W.threat(game, encId); } catch { t = null; } threatMemo.map.set(encId, t); }
    return threatMemo.map.get(encId);
  }
  const mapNow = () => W.mapOf(walk.map);
  const presentNow = () => W.present(game, walk.map);
  const entityById = id => presentNow().find(e => e.id === id) || (mapNow()?.entities || []).find(e => e.id === id) || null;
  const roamerById = (id, w = walk) => (w?.roamers || []).find(r => r.id === id) || null;

  // ---- layout and the loop -------------------------------------------------------------------------
  function layout() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const zoom = MAP_ZOOM[ctx.settings.mapZoom] || 1;
    const coarse = !!coarseMQ?.matches;
    const basis = coarse ? Math.min(r.width, window.innerWidth, window.innerHeight) : r.width;
    view.resize(r.width, r.height, window.devicePixelRatio || 1, coarse, zoom, basis);
    snapCamera();
    loop.dirty();
  }
  function snapCamera() {
    const B = view.map;
    if (B) view.camera.snap(actors.leader.px + TILE / 2, actors.leader.py + 4, view.size.w, view.size.h, B.pw, B.ph);
  }
  const CAM = { x: 0, y: 0, w: 0, h: 0 }; // reused every frame (no allocation in the loop)
  const loop = createLoop((now, dt) => {
    pump(now);
    CAM.x = view.camera.x; CAM.y = view.camera.y; CAM.w = view.size.w; CAM.h = view.size.h;
    let busy = actors.update(now, CAM);
    const B = view.map;
    // while a conversation covers the bottom of the view, look a little lower so the party stays in sight
    if (B) view.camera.follow(actors.leader.px + TILE / 2, actors.leader.py + 4 + (talking ? view.size.h * 0.22 : 0), dt, view.size.w, view.size.h, B.pw, B.ph, reduced);
    const c = actors.fill(list, emo, now);
    DRAWS[drawN++ & 2047] = view.draw(list, c[0], emo, c[1], now);
    if (M.moving || M.path || M.turnAt || view.camera.moving || view.fade > 0 || controls.held()) busy = true;
    return busy;
  }, { idleFps: IDLE_FPS });
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => layout()) : null;
  if (ro) ro.observe(stage); else window.addEventListener('resize', layout);

  // ---- entering a map ------------------------------------------------------------------------------
  function enterVisuals(trail = null) {
    const map = mapNow();
    view.setMap(game, walk.map);
    actors.reset(game, walk, performance.now(), trail);
    snapCamera();
    ctx.audio.music(map?.music || 'wilds');
    canvas.setAttribute('aria-label', map?.name || walk.map);
    announce(map?.name || '');
    refreshUi();
  }
  function fadeTo(v, ms) {
    return new Promise(res => {
      if (reduced) { view.fade = v; loop.dirty(); res(); return; }
      const from = view.fade, t0 = performance.now();
      const stepF = () => {
        if (dead) { res(); return; }
        const u = Math.min(1, (performance.now() - t0) / ms);
        view.fade = from + (v - from) * u;
        loop.dirty();
        if (u < 1) requestAnimationFrame(stepF); else res();
      };
      requestAnimationFrame(stepF);
    });
  }
  async function transition(target, { door = false } = {}) {
    M.transition = true; M.path = null; M.then = null;
    if (door) ctx.audio.sfx('door');
    // bake the next biome's tiles in slices while the screen fades out (art/tiles.js tileAtlasAsync)
    const nextMap = W.mapOf(target.map);
    let warm = null;
    try { warm = nextMap && typeof Art.tileAtlasAsync === 'function' ? Art.tileAtlasAsync(nextMap.biome) : null; } catch { warm = null; }
    await Promise.all([fadeTo(1, FADE_MS), warm ? warm.catch(() => null) : null]);
    if (dead) return 'stop';
    let r;
    try { r = W.enterMap(game, target); } catch (err) { console.error(err); M.transition = false; await fadeTo(0, FADE_MS); return 'stop'; }
    apply(r);
    session.seed = game.seed;
    enterVisuals(null);
    save();
    await fadeTo(0, FADE_MS);
    M.transition = false; M.chain = false;
    M.idleAt = performance.now();
    const more = r.events.filter(e => e.t !== 'enter');
    if (more.length && !dead) await runEvents(more);
    return 'stop';
  }

  // ---- UI refresh after game changes ------------------------------------------------------------------
  function refreshWorld() {
    view.refresh(game);
    actors.refresh(game, walk, performance.now());
    refreshUi();
  }
  function refreshUi() {
    if (dead) return;
    let nx = null;
    try { nx = Story.nextObjective(game); } catch { nx = null; }
    hud.update(game, walk, nx);
    side.update(game, nx);
    updateFacing();
    updateNear();
    updateDark();
    loop.dirty();
  }
  function updateDark() {
    const map = mapNow();
    let r = Infinity;
    try { r = W.light(game, walk); } catch { r = Infinity; }
    const lights = (map?.entities || []).filter(e => e.kind === 'light' && check(game, e.if)).map(e => ({ x: e.at?.[0] ?? e.area[0], y: e.at?.[1] ?? e.area[1], r: e.radius || 3 }));
    view.setDark(!!map?.dark && r !== Infinity, walk.x, walk.y, r === Infinity ? 0 : r, lights);
  }

  // What the leader faces: an entity, or a roamer.
  function faced() {
    const d = DIRS[walk.face] || [0, 1], x = walk.x + d[0], y = walk.y + d[1];
    const e = presentNow().find(q => covers(q, x, y) && q.kind !== 'trigger' && q.kind !== 'light' && !(q.kind === 'encounter' && q.mode === 'pack'));
    return e || null;
  }
  function keyLine(lockType) {
    const L = LOCKS[lockType];
    let st = null;
    try { st = W.lockStatus(game, lockType); } catch { st = null; }
    if (!L || !st) return '';
    return `${L.name} · ${st.keys.map(k => `${k.have ? '✓' : '✗'} ${k.label}${k.kind === 'domain' && k.detail ? ` (${k.detail})` : ''}`).join(' · ')}`;
  }
  function describe(e) {
    switch (e.kind) {
      case 'npc': return { a: 'Talk', p: `A · Talk to ${NPCS[e.npc]?.name || e.npc}`, label: `Talk to ${NPCS[e.npc]?.name || e.npc}`, sub: NPCS[e.npc]?.role };
      case 'chest': {
        if (e.state === 'opened') return { a: '', p: 'An empty chest', label: 'An empty chest' };
        if (e.lock) return { a: 'Open', p: keyLine(e.lock), label: 'A locked chest', sub: LOCKS[e.lock]?.name };
        return { a: 'Open', p: 'A · Open the chest', label: 'Open the chest' };
      }
      case 'sign': return { a: 'Read', p: 'A · Read the sign', label: 'Read the sign' };
      case 'board': return { a: 'Read', p: e.opens === 'ladder' ? 'A · Read the Ladder' : 'A · Read the bounty board', label: e.opens === 'ladder' ? 'The Ladder' : 'The bounty board' };
      case 'table': return { a: 'Look', p: 'A · The war table: the Atlas', label: 'The war table' };
      case 'pedestal': {
        const r = RELICS[e.relic], seen = game.codex?.[e.relic]?.sighted || game.codex?.[e.relic]?.claimed;
        return { a: 'Look', p: `A · ${seen ? r?.name : 'An empty pedestal'}`, label: seen ? `Pedestal: ${r?.name}` : 'An empty pedestal' };
      }
      case 'lookout': return { a: 'Look', p: 'A · Look out', label: 'The lookout' };
      case 'bellframe': return { a: check(game, { power: 'dawnbell' }) ? 'Ring' : 'Look', p: 'A · The bell-frame', label: 'The bell-frame' };
      case 'hearthfire': {
        const H = HEARTHS[e.id];
        if (e.state === 'cold') return { a: 'Light', p: keyLine('cold-hearth'), label: `${H?.name || 'Hearthfire'} (cold)` };
        return { a: 'Rest', p: `A · Rest at ${H?.name || 'the fire'}`, label: `Rest at ${H?.name || 'the fire'}` };
      }
      case 'lock': return { a: LOCK_VERB[e.lock] || 'Look', p: keyLine(e.lock), label: LOCKS[e.lock]?.name || 'A lock', sub: e.state === 'open' ? 'open' : 'two keys' };
      case 'gate': {
        if (e.state === 'open') return { a: '', p: '', label: 'An open gate' };
        if (e.look === 'crownwall') return { a: 'Look', p: 'Crownwall · a story seal', label: 'Crownwall', sub: 'a story seal' };
        return { a: 'Look', p: 'The way is shut', label: 'A shut gate' };
      }
      case 'encounter': {
        const T = threatOf(e.enc);
        const sub = T ? `Lv ${T.level} · ${RATING[T.rating]}` : '';
        return { a: e.talk ? 'Talk' : 'Fight', p: `A · ${e.name || ENCOUNTERS[e.enc]?.name} · ${sub}`, label: e.name || ENCOUNTERS[e.enc]?.name || e.enc, sub };
      }
      default: return { a: '', p: '', label: e.id };
    }
  }
  function onboarding() {
    const phone = root.classList.contains('deck-on');
    if (M.steps < 4) return phone ? 'Press and slide on the pad to walk' : 'Arrows or WASD walk · Z or Enter is A';
    if (M.steps < 30) return phone ? 'Hold B to run · tap the map to walk there' : 'Hold Shift to run · click the map to walk there';
    return '';
  }
  function updateFacing() {
    const e = faced();
    const d = e ? describe(e) : null;
    controls.setA(d?.a || '');
    const p = d?.p || '';
    if (p) setPrompt(p); else setPrompt(onboarding(), true);
    if (p && p !== lastPrompt) { lastPrompt = p; announce(p); }
  }
  let lastPrompt = '';

  function nearList() {
    const out = [];
    let reliquary = null;
    for (const e of presentNow()) {
      if (e.kind === 'trigger' || e.kind === 'light' || e.kind === 'prop') continue;
      if (e.kind === 'pedestal') {
        // the reliquary is one entry: its nearest pedestal
        const dist = distTo(e, walk.x, walk.y);
        if (dist <= NEAR_TILES && (!reliquary || dist < reliquary.dist)) reliquary = { e, dist };
        continue;
      }
      if (e.kind === 'encounter' && e.mode === 'pack') continue;
      if (e.kind === 'chest' && (e.state === 'opened' || e.hidden)) continue;
      if ((e.kind === 'gate' || e.kind === 'lock') && e.state === 'open') continue;
      if (e.kind === 'lock' && LOCKS[e.lock]?.soft) continue;
      const dist = distTo(e, walk.x, walk.y);
      if (dist > NEAR_TILES) continue;
      const d = describe(e);
      out.push({ key: e.id, label: d.label, sub: d.sub || '', kind: e.kind, dist, e });
    }
    if (reliquary) {
      const home = Object.keys(RELICS).filter(id => game.codex?.[id]?.claimed).length;
      out.push({ key: reliquary.e.id, label: 'The reliquary', sub: `${home} of ${Object.keys(RELICS).length} relics home`, kind: 'pedestal', dist: reliquary.dist, e: reliquary.e });
    }
    for (const r of walk.roamers || []) {
      const dist = Math.max(Math.abs(r.x - walk.x), Math.abs(r.y - walk.y));
      if (dist > NEAR_TILES) continue;
      const count = r.lead?.count || r.spawns?.length || 1;
      const T = r.enc ? threatOf(r.enc) : null;
      const mood = { flee: 'fleeing', chase: 'chasing you', alert: 'has seen you', stunned: 'stunned', return: 'going home' }[r.mood] || 'roaming';
      out.push({ key: `roamer:${r.id}`, label: `${FOES[r.lead?.family]?.name || 'A pack'}${count > 1 ? ` ×${count}` : ''}`, sub: T ? `${mood} · Lv ${T.level} · ${RATING[T.rating]}` : mood, kind: 'roamer', dist, r });
    }
    return out.sort((a, b) => a.dist - b.dist).slice(0, 10);
  }
  function updateNear() {
    const near = nearList();
    side.setNearby(near);
    const plist = [];
    for (const n of near) {
      if (n.kind !== 'encounter') continue;
      const e = n.e, T = threatOf(e.enc);
      if (!T) continue;
      const at = e.at || [e.area[0], e.area[3]];
      const top = actors.plateAt(e.id) || [at[0] * TILE + TILE / 2, at[1] * TILE - 10];
      plist.push({ key: e.id, name: e.name || ENCOUNTERS[e.enc]?.name || e.enc, sub: `Lv ${T.level} · ${RATING[T.rating]}`, title: e.grudge || T.grudge || '', rating: T.rating, x: top[0], y: top[1] });
    }
    view.setPlates(plist);
  }

  // ---- the pump: input to steps ------------------------------------------------------------------------
  function pump(now) {
    if (dead || lock || M.transition || overlayOpen()) return;
    if (M.moving) {
      if (now < M.end) return;
      M.moving = false; M.chain = !M.blocked; M.blocked = false;
      onStepEnd(now);
      if (lock || M.transition) return;
      if (M.pendingA) { M.pendingA = false; doInteract(); return; }
    }
    const h = controls.held();
    if (h) {
      controls.takeBuffered();
      M.path = null; M.then = null;
      if (!M.chain && h !== walk.face && !M.turnAt) { turn(h); M.turnAt = now; return; }
      if (M.turnAt && !M.chain && now - M.turnAt < TAP_TURN_MS) return;
      M.turnAt = 0;
      tryStep(h, now);
      return;
    }
    M.turnAt = 0;
    const b = controls.takeBuffered();
    if (b) { M.path = null; M.then = null; tryStep(b, now); return; }
    if (M.path) {
      if (M.path.length) {
        const nx = M.path.shift();
        const d = dirTo([walk.x, walk.y], nx);
        if (d) tryStep(d, now, true); else { M.path = null; M.then = null; }
        return;
      }
      M.path = null;
      const f = M.then; M.then = null;
      if (f) f();
      return;
    }
    M.chain = false;
    // the idle tick moves the packs; a map without any has nothing to tick
    if (now - M.idleAt >= IDLE_TICK_MS) { M.idleAt = now; if ((walk.roamers || []).length) idleTick(now); }
  }
  function turn(dir) {
    if (walk.face === dir) return;
    walk = setWalk({ ...walk, face: dir });
    actors.face(dir);
    updateFacing();
  }
  function tryStep(dir, now, fromPath = false) {
    // alwaysRun: run everywhere, as if B were held (the Settings label)
    const run = controls.running() || !!ctx.settings.alwaysRun;
    const before = walk;
    let r;
    try { r = W.move(game, walk, dir, { run }); } catch (err) { console.error(err); M.path = null; return; }
    apply(r);
    const stepped = r.events.some(e => e.t === 'step');
    const dur = run ? RUN_MS : STEP_MS;
    if (stepped) {
      const t0 = M.chain && M.end && now - M.end < 60 ? M.end : now;
      M.moving = true; M.end = t0 + dur; M.dur = dur;
      actors.stepLeader(walk.x, walk.y, walk.face, t0, dur);
      onStepped();
    } else {
      // blocked: hold off for a step's time, so pushing into a wall does not call move() every frame
      actors.face(walk.face);
      M.moving = true; M.blocked = true; M.end = now + dur;
      if (fromPath) { M.path = null; }
      updateFacing();
    }
    actors.syncRoamers(walk, now, dur);
    runEvents(r.events, { stepEnd: stepped ? M.end : 0, before });
  }
  function onStepped() {
    M.steps++; M.sinceSave++;
    if (!M.firstStep) {
      M.firstStep = true;
      save();
      if (ctx.commitAdopted) ctx.commitAdopted();
      legacy = false;
    } else if (M.sinceSave >= SAVE_EVERY_STEPS) save();
    updateDark();
  }
  function onStepEnd(now) {
    M.idleAt = now;
    updateFacing();
    updateNear();
  }
  function idleTick(now) {
    let r;
    try { r = W.tick(game, walk); } catch (err) { console.error(err); return; }
    apply(r);
    actors.syncRoamers(walk, now, STEP_MS * 1.4);
    if (r.events.length) runEvents(r.events);
    if ((walk.roamers || []).length) updateNear();
  }

  // ---- events ----------------------------------------------------------------------------------------
  const SYNC = { turn: 1, step: 1, bump: 1, alert: 1, roam: 1, sighted: 1, hazard: 1, enter: 1 };
  let bumpAt = 0;
  function runEvents(events, { stepEnd = 0, before = null } = {}) {
    const later = [];
    const now = performance.now();
    let gameChanged = false;
    for (const e of events) {
      if (!SYNC[e.t]) { later.push(e); continue; }
      if (e.t === 'bump') { if (now - bumpAt > 260) { ctx.audio.sfx('bump'); bumpAt = now; } }
      else if (e.t === 'alert') { actors.emote('!', e.id, now); ctx.audio.sfx('alert'); }
      else if (e.t === 'sighted') { gameChanged = true; sighted(e); }
      else if (e.t === 'hazard') { gameChanged = true; hazard(e); }
    }
    if (gameChanged) { save(); refreshUi(); }
    if (!later.length) return Promise.resolve();
    // a map exit keeps the held keys, so a held direction walks on into the next map
    return flow(async () => {
      if (stepEnd) { const w = stepEnd - performance.now(); if (w > 0) await sleep(w); }
      for (const e of later) {
        if (dead) return;
        const res = await handle(e, before);
        if (res === 'battle' || res === 'stop' || dead) return;
      }
    }, { keepKeys: later.every(e => e.t === 'exit') });
  }
  // run an async flow with the world locked; errors never leave the world stuck
  async function flow(fn, { keepKeys = false } = {}) {
    lock++;
    root.classList.add('locked');
    if (!keepKeys) controls.clear();
    try { return await fn(); } catch (err) { console.error(err); } finally {
      lock = Math.max(0, lock - 1);
      if (!lock) root.classList.remove('locked');
      if (!dead) { M.idleAt = performance.now(); refreshUi(); }
    }
  }
  function sighted(e) {
    const r = RELICS[e.relic];
    if (r) ctx.toast(`Sighted: ${r.name}`);
    ctx.audio.sfx('stamp');
  }
  function hazard(e) {
    stage.classList.remove('hurt'); void stage.offsetWidth; stage.classList.add('hurt');
    setPrompt(`The ichor burns: ${Math.round((e.pct || 0.04) * 100)}% of everyone's HP`);
    refreshUi();
  }

  async function handle(e, before) {
    switch (e.t) {
      case 'exit': {
        const t = mapNow()?.rows?.[walk.y + (DIRS[walk.face]?.[1] || 0)]?.[walk.x + (DIRS[walk.face]?.[0] || 0)];
        return transition({ map: e.to, anchor: e.anchor }, { door: t === '+' || t === 's' });
      }
      case 'sealed': {
        const tail = e.nextChapter || check(game, { flag: 'act1-complete' }) ? ' The way opens in the next chapter.' : '';
        await openMessage(ctx, { text: `${e.text || 'The way is shut.'}${tail}`, dock: dockRect() });
        return null;
      }
      case 'encounter': return encounterFlow(e.id);
      case 'gate': return gateFlow(e);
      case 'lock': return lockFlow(e);
      case 'trigger': return dialogueFlow(e.dialogue);
      case 'talk': return dialogueFlow(e.dialogue, { enc: e.enc });
      case 'sign': await openMessage(ctx, { text: e.text, dock: dockRect() }); return null;
      case 'use': return useFlow(e);
      case 'chest': return chestFlow(e);
      case 'hearthfire': return hearthFlow(e.id);
      case 'contact': return contactFlow(e, before);
      case 'rout': return routFlow(e, before);
      default: return null;
    }
  }

  // ---- flows ------------------------------------------------------------------------------------------
  async function dialogueFlow(id, { enc = null } = {}) {
    if (!id || !DIALOGUE[id]) return null;
    if (id === 'council') { await playCouncil(ctx); if (dead) return 'stop'; }
    talking = true; loop.dirty();
    let r;
    try { r = await openDialogue(ctx, { game, id, dock: dockRect() }); } finally { talking = false; loop.dirty(); }
    if (dead) return 'stop';
    if (r.game !== game) { game = r.game; save(); refreshWorld(); }
    return storyEvents(r.events, { enc });
  }
  async function storyEvents(events) {
    const gold = events.filter(e => e.t === 'gold').reduce((a, e) => a + (e.n || 0), 0);
    if (gold) { ctx.audio.sfx('coin'); ctx.toast(`+${gold} gold`); }
    for (const e of events) {
      if (dead) return 'stop';
      if (e.t === 'fight') return encounterFlow(e.enc, { skipTalk: true });
      if (e.t === 'open') { const r = await openFlow(e.screen); if (r) return r; }
      else if (e.t === 'item') await cards(() => ctx.services.cardReveal(e.item, { source: RELICS[e.item.base] ? 'claimed' : 'drop', backdrop: mapNow()?.backdrop }));
      else if (e.t === 'letter') await showLetter(ctx, e.id);
      else if (e.t === 'end') await showToBeContinued(ctx, game);
    }
    return null;
  }
  async function openFlow(screen) {
    const s = String(screen || '');
    if (s.startsWith('shop:')) { const g = await openShop(ctx, { game, shopId: s.slice(5) }); if (g !== game) { game = g; save(); refreshUi(); } return null; }
    if (s === 'forge') {
      const g = await openForge(ctx, { game });
      if (g !== game) { game = g; save(); refreshWorld(); const so = showoffs(); if (so.length) await playShowoffs(so); }
      return null;
    }
    if (s === 'atlas') { leave('atlas', { mode: 'view' }); return 'stop'; }
    if (s === 'journal') { leave('journal', { tab: 'quests' }); return 'stop'; }
    if (s === 'ladder') { leave('journal', { tab: 'ladder' }); return 'stop'; }
    if (s === 'bounties') { leave('journal', { tab: 'bounties' }); return 'stop'; }
    return null;
  }
  async function encounterFlow(encId, { skipTalk = false } = {}) {
    const enc = ENCOUNTERS[encId];
    if (!enc) return null;
    if (enc.talk && !skipTalk && DIALOGUE[enc.talk]) return dialogueFlow(enc.talk, { enc: encId });
    const choice = await openPrefight(ctx, { game, encId });
    if (dead || choice !== 'fight') return null;
    return battle({ nodeId: encId }, { enc: encId, duel: !!enc.duel });
  }
  async function gateFlow(e) {
    const g = entityById(e.id);
    if (g?.look === 'crownwall') {
      let st = null;
      try { st = W.lockStatus(game, 'thornwall'); } catch { st = null; }
      await openLockPrompt(ctx, { game, crownwall: true, status: st });
      return null;
    }
    await openMessage(ctx, { text: e.text || 'The way is shut.', dock: dockRect() });
    if (dead) return 'stop';
    if (e.guard && presentNow().some(q => q.kind === 'encounter' && q.enc === e.guard)) return encounterFlow(e.guard);
    return null;
  }
  async function lockFlow(e) {
    const ent = entityById(e.id);
    const type = e.lock || (ent?.kind === 'hearthfire' ? 'cold-hearth' : ent?.lock);
    let st = e.status;
    try { st = W.lockStatus(game, type); } catch { /* keep the event's */ }
    const choice = await openLockPrompt(ctx, { game, entity: ent, lockType: type, status: st });
    if (dead || choice !== 'use') return null;
    const r = W.openLock(game, e.id);
    if (!r.ok) { ctx.audio.sfx('error'); return null; }
    game = r.game;
    ctx.audio.sfx(ent?.kind === 'hearthfire' ? 'hearth' : 'unlock');
    ctx.toast(LOCKS[type]?.useText || 'Open.');
    save(); refreshWorld();
    if (ent?.kind === 'hearthfire') return hearthFlow(ent.id);
    return null;
  }
  async function chestFlow(e) {
    if (e.lock) {
      let st = null;
      try { st = W.lockStatus(game, e.lock); } catch { st = null; }
      if (!st?.open) { await openLockPrompt(ctx, { game, lockType: e.lock, status: st }); return null; }
    }
    const r = W.openChest(game, e.id);
    if (!r.ok) { ctx.audio.sfx('error'); return null; }
    game = r.game;
    ctx.audio.sfx('chest');
    save(); refreshWorld();
    const bits = [];
    if (r.gold) bits.push(`+${r.gold} gold`);
    for (const [id, n] of Object.entries(r.bag || {})) bits.push(`${id.replace(/-/g, ' ')} ×${n}`);
    if (bits.length) ctx.toast(bits.join(' · '));
    for (const it of r.items || []) { if (dead) return 'stop'; await cards(() => ctx.services.cardReveal(it, { source: 'drop', backdrop: mapNow()?.backdrop })); }
    return null;
  }
  async function useFlow(e) {
    // lookouts and the bell-frame are dialogues (their choices set bell-rung / longwatch:* through
    // dialogue effects); boards and tables open their screen; a pedestal shows its relic's card
    if (DIALOGUE[e.id]) return dialogueFlow(e.id);
    const ent = entityById(e.id);
    const kind = e.kind || ent?.kind;
    if (kind === 'board' || kind === 'table') {
      const o = ent?.opens || (kind === 'table' ? 'atlas' : 'bounties');
      if (o === 'atlas') { leave('atlas', { mode: 'view' }); return 'stop'; }
      leave('journal', { tab: o === 'ladder' ? 'ladder' : 'bounties' });
      return 'stop';
    }
    if (kind === 'pedestal') {
      const item = (game.inventory || []).find(i => i.base === ent?.relic && !i.shattered);
      if (item) { await cards(() => ctx.services.cardInspect(item, {})); return null; }
      const r = RELICS[ent?.relic];
      const seen = game.codex?.[ent?.relic]?.sighted;
      await openMessage(ctx, { text: seen ? `An empty pedestal. ${r?.name} belongs here. ${r?.holder ? `Last seen with ${r.holder}.` : ''}` : 'An empty pedestal, waiting for a relic you have not seen yet.', dock: dockRect() });
      return null;
    }
    if (kind === 'lookout') { await openMessage(ctx, { text: 'A long view over the trees.', dock: dockRect() }); return null; }
    if (kind === 'bellframe') { await openMessage(ctx, { text: 'An empty bell-frame. Something with wings took the bell.', dock: dockRect() }); return null; }
    return null;
  }
  async function hearthFlow(hfId) {
    const r = await openHearthMenu(ctx, { game, hfId });
    if (dead) return 'stop';
    if (r?.act === 'rest') {
      try { game = G.rest(game, hfId); } catch (err) { console.error(err); return null; }
      ctx.audio.sfx('hearth');
      save(); refreshWorld();
      ctx.toast(`Rested at ${HEARTHS[hfId]?.name || 'the fire'}. Day ${game.progress.flags.day}. Saved.`);
      const dream = typeof Story.restDialogue === 'function' ? Story.restDialogue(game, hfId) : null;
      if (dream && DIALOGUE[dream]) return dialogueFlow(dream);
      return null;
    }
    if (r?.act === 'travel' && r.to) return travelTo(r.to);
    if (r?.act === 'atlas') { leave('atlas', { mode: 'travel' }); return 'stop'; }
    if (r?.act === 'party') { leave('party'); return 'stop'; }
    return null;
  }
  async function travelTo(hfId) {
    const g2 = G.travel ? G.travel(game, hfId) : game;
    if (g2 === game || !g2.progress.pos) { ctx.audio.sfx('error'); return null; }
    game = g2;
    const p = game.progress.pos;
    ctx.audio.sfx('confirm');
    return transition({ map: p.map, at: [p.x, p.y], face: p.face });
  }
  async function contactFlow(e, before) {
    const r0 = roamerById(e.id) || roamerById(e.id, before);
    if (!r0) return null;
    actors.emote('!', e.id, performance.now(), 600);
    ctx.audio.sfx('alert');
    if (!reduced) await sleep(260);
    if (dead) return 'stop';
    const zone = ZONES[mapNow()?.zone];
    const target = r0.enc ? { nodeId: r0.enc } : { patrol: { spawns: r0.spawns || [], where: mapNow()?.name || 'The Wilds', backdrop: zone?.backdrop || mapNow()?.backdrop || 'verdant-wood', dark: !!mapNow()?.dark } };
    return battle(target, { enc: r0.enc || null, roamerId: e.id }, { ambush: !!e.ambush, firstStrike: !!e.firstStrike });
  }
  async function routFlow(e, before) {
    const r0 = roamerById(e.id) || roamerById(e.id, before);
    let res;
    try { res = G.routPack(game, r0?.enc ? { nodeId: r0.enc } : { spawns: r0?.spawns || [], where: mapNow()?.name || 'The Wilds' }); } catch (err) { console.error(err); return null; }
    game = res.game;
    walk = setWalk(backFromBattle(game, walk, e.id, 'rout'));
    actors.syncRoamers(walk, performance.now(), 0);
    ctx.audio.sfx('rout');
    save(); refreshWorld();
    await cards(() => showSpoils(ctx, { report: res.report }));
    return 'stop';
  }

  // The battle hand-off (§5.5): startBattle, setGame(commit), session.pending, music, go('battle').
  function battle(target, info, opts = {}) {
    let r;
    try { r = G.startBattle(game, target, opts); } catch (err) { console.error(err); ctx.toast('That fight would not start.'); return null; }
    const boss = Object.values(r.battle.units || {}).some(u => u.side === 'foe' && u.tier === 'champion');
    game = r.game;
    save();
    setPending({ ...info, boss, pos: { map: walk.map, x: walk.x, y: walk.y } });
    session.trail = actors.trail();
    left = true;
    ctx.audio.music(boss ? 'boss' : 'battle');
    ctx.go('battle', { battle: r.battle, returnTo: 'world' });
    return 'battle';
  }

  // Leave for another screen: commit the Walk first, so progress.pos is current there.
  function leave(name, p = {}) {
    if (dead) return;
    save();
    session.trail = actors.trail();
    left = true;
    ctx.audio.sfx('confirm');
    ctx.go(name, { from: 'world', ...p });
  }
  async function openMenu() {
    if (lock || M.transition || overlayOpen() || dead) return;
    const pick = await flow(() => openPauseMenu(ctx));
    if (dead || !pick) return;
    if (pick === 'title') { save(); left = true; ctx.go('title'); return; }
    if (pick === 'journal') leave('journal', { tab: 'quests' });
    else if (pick === 'atlas') leave('atlas', { mode: 'view' });
    else leave(pick);
  }

  // ---- A, B, taps and holds ---------------------------------------------------------------------------
  function pressA() {
    if (dead || lock || M.transition || overlayOpen()) return;
    M.path = null; M.then = null;
    if (M.moving) { M.pendingA = true; return; }
    doInteract();
  }
  function pressB() { M.path = null; M.then = null; }
  function doInteract() {
    let r;
    try { r = W.interact(game, walk); } catch (err) { console.error(err); return; }
    apply(r);
    if (r.events.length) runEvents(r.events);
  }
  function dockRect() {
    if (root.classList.contains('deck-on')) return null;
    const r = canvas.getBoundingClientRect();
    if (!r.width) return null;
    const width = Math.min(760, r.width - 24);
    return { left: Math.round(r.left + (r.width - width) / 2), width: Math.round(width), bottom: Math.round(window.innerHeight - r.bottom + 12) };
  }
  // walk up to an entity and use it; foes open their card straight away
  function goTo(x, y, then) {
    const path = W.findPath(game, walk, [x, y], { max: MAX_PATH, adjacent: true });
    if (!path) { ctx.audio.sfx('bump'); return; }
    M.path = path;
    M.then = () => {
      const target = [x, y];
      const d = dirTo([walk.x, walk.y], target) || null;
      if (d) turn(d);
      then();
    };
    loop.dirty();
  }
  function useEntity(e) {
    if (e.kind === 'encounter') { flow(() => encounterFlow(e.enc)); return; }
    const [x0, y0, x1, y1] = areaOf(e);
    let best = null;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const d = Math.abs(x - walk.x) + Math.abs(y - walk.y); if (!best || d < best[2]) best = [x, y, d]; }
    if (best[2] === 1) { turn(dirTo([walk.x, walk.y], [best[0], best[1]])); doInteract(); return; }
    goTo(best[0], best[1], () => doInteract());
  }
  function nearbyGo(key) {
    if (lock || M.transition) return;
    if (key.startsWith('roamer:')) {
      const r = roamerById(key.slice(7));
      if (r) { const p = W.findPath(game, walk, [r.x, r.y], { max: MAX_PATH, adjacent: true }); if (p) { M.path = p; M.then = () => { const d = dirTo([walk.x, walk.y], [r.x, r.y]); if (d) tryStep(d, performance.now()); }; } }
      return;
    }
    const e = entityById(key);
    if (e) useEntity(e);
  }
  function onTap(t) {
    const [x, y] = t;
    const foe = actors.foeAt(x, y);
    if (foe) { flow(() => encounterFlow(foe.enc)); return; }
    const e = presentNow().find(q => covers(q, x, y) && !['trigger', 'light', 'prop'].includes(q.kind) && !(q.kind === 'encounter' && q.mode === 'pack')
      && !(q.kind === 'chest' && q.hidden) && !((q.kind === 'gate' || q.kind === 'lock') && q.state === 'open'));
    if (e) { useEntity(e); return; }
    if (x === walk.x && y === walk.y) return;
    const path = W.findPath(game, walk, [x, y], { max: MAX_PATH });
    if (path && path.length) { M.path = path; M.then = null; loop.dirty(); }
    else ctx.audio.sfx('bump');
  }
  async function onHold(t) {
    const foe = actors.foeAt(t[0], t[1]);
    if (!foe) return;
    const T = threatOf(foe.enc);
    const heldBy = [];
    for (const s of T?.spawns || []) {
      const holder = s.name || foe.name || ENCOUNTERS[foe.enc]?.name;
      for (const h of s.held || []) if (h.relic || h.item) heldBy.push({ h, holder });
      if (s.wears) heldBy.push({ h: { relic: s.wears }, holder });
    }
    if (!heldBy.length) { flow(() => encounterFlow(foe.enc)); return; }
    try { game = W.sightEncounter(game, foe.enc); save(); refreshUi(); } catch (err) { console.error(err); }
    const { h, holder } = heldBy[0];
    const item = previewRelic(game, h, holder);
    ctx.audio.sfx('stamp');
    await flow(() => cards(() => ctx.services.cardPreview(item, { heldBy: holder })));
  }
  let hold = null;
  const down = e => {
    if (dead || lock || M.transition || overlayOpen()) return;
    if (e.button && e.button !== 0) return;
    const t = view.tileAt(e.clientX, e.clientY);
    if (!t) return;
    hold = { x: e.clientX, y: e.clientY, t, fired: false, id: e.pointerId };
    hold.timer = setTimeout(() => { if (hold && !hold.fired) { hold.fired = true; onHold(hold.t); } }, HOLD_MS);
  };
  const move = e => { if (hold && e.pointerId === hold.id && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 12) { clearTimeout(hold.timer); hold = null; } };
  const up = e => {
    if (!hold || e.pointerId !== hold.id) return;
    clearTimeout(hold.timer);
    const h = hold; hold = null;
    if (!h.fired && !lock && !M.transition) onTap(h.t);
  };
  const cancel = () => { if (hold) { clearTimeout(hold.timer); hold = null; } };
  const ctxMenu = e => { e.preventDefault(); const t = view.tileAt(e.clientX, e.clientY); if (t && !lock) onHold(t); };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('contextmenu', ctxMenu);

  // ---- saving when the page goes away ------------------------------------------------------------------
  const onHide = () => { if (document.visibilityState === 'hidden' && !dead && ctx.game === lastSet) save(); };
  const onPageHide = () => { if (!dead && ctx.game === lastSet) save(); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onPageHide);

  // ---- after the world appears: story beats, showoffs, entry triggers ----------------------------------
  function showoffs() {
    const worn = game.progress.flags.worn || {};
    const next = { ...worn };
    let changed = false;
    const shows = [];
    for (const id of game.party.active) {
      const sig = gearSig(game, id);
      if (worn[id] === undefined) { next[id] = sig; changed = true; }
      else if (worn[id] !== sig) {
        const nm = newGearName(game, id, worn[id]);
        next[id] = sig; changed = true;
        if (nm) shows.push({ id, nm });
      }
    }
    if (changed) { game = withFlags(game, { worn: next }); save(); }
    return shows;
  }
  async function playShowoffs(shows) {
    for (const s of shows) {
      if (dead) return;
      actors.showoff(s.id, performance.now());
      const line = `${shortName(game, s.id)} wears ${s.nm}`;
      setPrompt(line); announce(line);
      ctx.audio.sfx('equip', { tier: 3 });
      loop.dirty();
      await sleep(reduced ? 600 : SHOWOFF_MS);
    }
    if (!dead) updateFacing();
  }
  async function afterReturn() {
    const brand = params.brand;
    if (brand) {
      await playBrandBanner(ctx, brand, game);
      if (dead) return;
      if (brand.first !== false && CROWNWALL.open?.brand === brand.id) { await playCrownwalls(ctx); if (dead) return; }
    }
    if (params.rematch) ctx.toast('A rematch: the Brand is already yours.');
    if (params.wokeAt && fresh) ctx.toast(`You wake at ${HEARTHS[params.wokeAt]?.name || ENCOUNTERS[params.wokeAt]?.name || 'the Hearthfire'}.`, 3000);
    // an unread Unsmith letter (after a Brand, or an M2 looper's first visit)
    const letter = typeof Story.pendingLetter === 'function' ? Story.pendingLetter(game) : null;
    if (letter) {
      await showLetter(ctx, letter);
      if (dead) return;
      game = Story.readLetter(game, letter);
      save();
    }
    if (brand || letter) refreshWorld();
    // the lines after a fight: Tamsin's win or yield, Corra freed, the Rotwarden's last words
    const enc = pending?.enc || params.enc;
    const res = params.yield ? 'yield' : params.result;
    if (enc && res && typeof Story.afterDialogue === 'function') {
      const d = Story.afterDialogue(game, enc, res);
      if (d && DIALOGUE[d]) await dialogueFlow(d);
    }
  }

  // ---- go ----------------------------------------------------------------------------------------------
  enterVisuals(fresh ? null : session.trail);
  layout();
  if (!reduced) { view.fade = 1; fadeTo(0, FADE_MS); }
  loop.start();
  if (fresh) save();
  const shows = showoffs();
  flow(async () => {
    await afterReturn();
    if (dead) return;
    if (entryEvents.length) {
      const evs = entryEvents; entryEvents = [];
      for (const e of evs) { const r = await handle(e, null); if (r === 'battle' || r === 'stop' || dead) return; }
    }
    if (shows.length) await playShowoffs(shows);
  });

  // ---- keys from core/input.js ---------------------------------------------------------------------------
  function onAction(a, ev) {
    if (overlayOpen()) return false;
    const code = ev?.code;
    if (a === 'up' || a === 'down' || a === 'left' || a === 'right') return true; // the held-set walks; no page scroll
    if (a === 'confirm') {
      const f = document.activeElement;
      if (code !== 'KeyZ' && f && f.tagName === 'BUTTON' && root.contains(f) && !f.classList.contains('w-a')) return false; // the browser presses it
      pressA();
      return true;
    }
    if (a === 'back') { if (code === 'KeyX' || code === 'Backspace') return true; openMenu(); return true; }
    if (a === 'menu') { openMenu(); return true; }
    return false;
  }

  if (typeof globalThis.__aethTest === 'function') installSeam();

  function installSeam() {
    const stepSync = dir => {
      const r = W.move(game, walk, dir, { run: false });
      apply(r);
      if (r.events.some(e => e.t === 'step')) { actors.stepLeader(walk.x, walk.y, walk.face, performance.now() - 1000, 1); onStepped(); }
      else actors.face(walk.face);
      actors.syncRoamers(walk, performance.now(), 0);
      return r.events;
    };
    window.__world = {
      state: () => ({
        map: walk.map, x: walk.x, y: walk.y, face: walk.face, tick: walk.tick, grace: walk.grace, visit: walk.visit,
        moving: M.moving, lock, transition: M.transition, steps: M.steps, stepMs: M.dur, roamers: (walk.roamers || []).map(r => ({ id: r.id, x: r.x, y: r.y, mood: r.mood, enc: r.enc || null })),
        scale: view.size.s, view: [view.size.w, view.size.h], camera: [view.camera.x, view.camera.y], dark: !!view.map?.darkKey,
        a: controls.btnA.getAttribute('aria-label'), prompt: controls.prompt.textContent, deck: root.classList.contains('deck-on'),
      }),
      teleport(map, x, y, face = 's') {
        const r = W.enterMap(game, { map, at: [x, y], face });
        apply(r);
        session.seed = game.seed;
        M.moving = false; M.path = null; M.then = null; M.chain = false;
        enterVisuals(null);
        save();
        return r.events;
      },
      press(key) {
        if (key === 'a' || key === 'A') return pressA();
        if (key === 'b' || key === 'B') return pressB();
        if (key === 'menu') return openMenu();
        if (DIRS[key]) return tryStep(key, performance.now());
        return null;
      },
      step(dir, n = 1) { let ev = []; for (let i = 0; i < n; i++) ev = ev.concat(stepSync(dir)); refreshUi(); return ev; },
      interact() { const r = W.interact(game, walk); apply(r); runEvents(r.events); return r.events; },
      face(dir) { turn(dir); return walk.face; },
      entity(map, id) { const e = W.present(game, map).find(q => q.id === id); return e ? { id: e.id, kind: e.kind, state: e.state, solid: e.solid } : null; },
      game: () => game,
      walkRoamers: () => structuredClone(walk.roamers || []),
      grace(n) { walk = setWalk({ ...walk, grace: n }); return walk.grace; },
      partyShown: () => actors.partyShown(),
      // test only: roaming packs before the engine seeds them, and synthetic events through the real handlers
      roam(roamers) { walk = setWalk({ ...walk, roamers }); actors.syncRoamers(walk, performance.now(), 0); refreshUi(); return walk.roamers.length; },
      event(e) { return runEvents([e]); },
      screenOf(x, y) {
        const r = canvas.getBoundingClientRect(), k = r.width / view.size.w;
        return [r.left + ((x * TILE + TILE / 2) - view.camera.x) * k, r.top + ((y * TILE + TILE / 2) - view.camera.y) * k];
      },
      perf: () => {
        const n = Math.min(loop.stats.n, loop.RING), m = Math.min(drawN, 2048);
        return { work: Array.from(loop.stats.work.slice(0, n)), frames: loop.stats.n, draws: Array.from(DRAWS.slice(0, m)), drawFrames: drawN };
      },
      resetPerf() { loop.stats.n = 0; drawN = 0; },
      busy: () => lock > 0 || M.transition || M.moving || !!M.path,
    };
  }

  return {
    unmount() {
      if (!left && !dead && ctx.game === lastSet) save();
      dead = true;
      if (!left) session.trail = actors.trail();
      loop.stop();
      controls.destroy();
      if (ro) ro.disconnect(); else window.removeEventListener('resize', layout);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      clearTimeout(hold?.timer);
      view.destroy();
      hud.destroy();
      side.destroy();
      if (window.__world) window.__world = undefined;
    },
    onAction,
  };
}
