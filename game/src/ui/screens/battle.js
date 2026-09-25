// The battle screen. mount(root, ctx, { battle, returnTo }) plays a battle from the engine state
// to its end, then hands off: ctx.go('aftermath', { battle: finalState, returnTo, result: outcome }).
// It never calls ctx.setGame.
//
// Layout (phone portrait first): stage (backdrop + foes) / Initiative Ribbon / party row / command
// dock with the dice tray. Laptop: a wider stage, the dock beside the party, keyboard shortcuts.
// Modules in ../battle/: stage (canvas), party (hero strip + cards), hud (plates, intents, ribbon,
// floating numbers), tray (dice), menu (commands, targeting, Analyze), player (event animation),
// model (display state), log, slam (Legend Surge and HELD BY fallbacks), sprites (art caching).
import '../battle.css';
import { current, act, foeTurn, outcome, commands, targets, timeline, inspect } from '../../rules/battle.js';
import { autoCommand } from '../../rules/autoplay.js';
import { ENCOUNTERS } from '../../data/encounters.js';
import { BACKDROPS, renderBackdrop } from '../../art/scenes.js';
import { Stage } from '../battle/stage.js';
import { Party } from '../battle/party.js';
import { Hud } from '../battle/hud.js';
import { Tray } from '../battle/tray.js';
import { CommandInput, inspectSheet } from '../battle/menu.js';
import { Player, intentTarget } from '../battle/player.js';
import { Labels, makeDisp, syncDisp } from '../battle/model.js';
import { runJobs, foeLook } from '../battle/sprites.js';
import { familyData } from '../../rules/ai.js';
import { heldByPreview, pieceItem } from '../battle/slam.js';
import { el, Clock, toCanvas } from '../battle/util.js';

const SPEEDS = [1, 2, 4];

export function mount(root, ctx, { battle, returnTo = 'road' } = {}) {
  if (!battle) {
    root.append(el('p', { text: 'No battle to show.' }));
    return {};
  }
  const reduced = !!ctx.reduced();
  const clock = new Clock();
  const labels = new Labels();
  let state = battle;
  const disp = makeDisp(state, labels);
  let dead = false;
  let auto = !!ctx.settings.battleAuto;
  let speed = SPEEDS.includes(ctx.settings.battleSpeed) ? ctx.settings.battleSpeed : 1;
  const node = ENCOUNTERS[state.ctx.nodeId] || null;
  const backdrop = state.ctx.backdrop || node?.backdrop || 'hearth-road';
  const foes0 = state.order.map(id => state.units[id]).filter(u => u.side === 'foe');
  const boss = foes0.some(f => f.tier === 'champion' || f.tier === 'relic-bearer');
  const sfx = (name, opts) => { try { ctx.audio.sfx(name, opts); } catch { /* audio is optional */ } };
  const hooks = globalThis.__btHooks || null; // dev/e2e harness only

  // ---- skeleton ---------------------------------------------------------------------------------------
  root.classList.add('bt-screen');
  const where = el('div.bt-where', null,
    el('span.bt-where-k', { text: state.ctx.patrol ? `Patrol · ${node?.place || BACKDROPS[backdrop]?.name || ''}` : node?.place || BACKDROPS[backdrop]?.name || 'Battle' }),
    el('h1.bt-where-name', { text: state.ctx.patrol ? 'A roving patrol' : node?.name || 'Battle' }));
  const logBtn = el('button.bt-tool', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'bt-log', title: 'Battle log' }, el('span', { text: 'Log' }));
  const autoBtn = el('button.bt-tool.bt-auto', { type: 'button', 'aria-pressed': String(auto), title: 'Auto battle' }, el('i.dot'), el('span', { text: 'Auto' }));
  const speedBtn = el('button.bt-tool.bt-speed', { type: 'button', title: 'Battle speed (F)' }, el('span', { text: `${speed}x` }));
  const top = el('header.bt-top', null, where, el('div.bt-tools', null, logBtn, autoBtn, speedBtn));

  const stageHost = el('section.bt-stage', { 'aria-label': 'Battlefield' });
  const moveBan = el('div.bt-move-ban', { hidden: true });
  const bigBan = el('div.bt-big-ban', { hidden: true });
  const finePointer = !('ontouchstart' in window) && !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
  const skipHint = el('div.bt-skip', { text: finePointer ? 'click or Enter to hurry' : 'tap to hurry' });
  const intro = el('div.bt-intro', null,
    el('p.bt-intro-k', { text: state.ctx.ambush ? 'Ambush!' : boss ? 'A foe of note' : 'Battle' }),
    el('h2.bt-intro-name', { text: state.ctx.patrol ? 'A roving patrol' : node?.name || 'Battle' }),
    el('p.bt-intro-foes', { text: [...new Set(foes0.map(f => f.name))].join(' · ') }));
  stageHost.append(moveBan, bigBan, skipHint);

  const ribbonHost = el('nav.bt-ribbon', { 'aria-label': 'Initiative Ribbon: the next turns' }, el('span.bt-rib-k', { text: 'Turns' }));
  const partyHost = el('section.bt-party', { 'aria-label': 'Your party' });
  const whoEl = el('span.bt-who');
  const captionEl = el('p.bt-caption', { 'aria-live': 'polite' });
  const inspectBtn = el('button.bt-tool.bt-analyze', { type: 'button', title: 'Analyze a foe (M)' }, el('span', { text: 'Analyze' }));
  const cmdsEl = el('div.bt-cmds', { hidden: true, role: 'group', 'aria-label': 'Commands' });
  const subEl = el('div.bt-sub', { hidden: true });
  const aimEl = el('div.bt-aim', { hidden: true });
  const miniLog = el('ol.bt-minilog', { 'aria-hidden': 'true' });
  const body = el('div.bt-dock-body', null, miniLog, cmdsEl, subEl, aimEl);
  const dock = el('section.bt-dock', { 'aria-label': 'Commands and dice' }, el('div.bt-dock-head', null, whoEl, captionEl, inspectBtn), body);
  const logList = el('ol.bt-log-list');
  const logPanel = el('div.bt-logpanel', { id: 'bt-log', role: 'log', 'aria-label': 'Battle log', hidden: true }, el('div.bt-log-head', null, el('span', { text: 'Battle log' }), el('button.bt-tool', { type: 'button', text: 'Close', onclick: () => toggleLog(false) })), logList);
  const shell = el('div.bt', { 'data-speed': speed }, top, stageHost, ribbonHost, partyHost, dock, logPanel);
  root.append(shell);
  shell.style.setProperty('--spd', speed);
  if (reduced) shell.classList.add('reduced');

  // ---- components ---------------------------------------------------------------------------------------
  const stage = new Stage(stageHost, { backdrop, reduced });
  stageHost.append(intro);
  const nameOf = id => disp.units[id]?.label || '';
  const hud = new Hud({ stageHost, ribbonHost, onFoe: id => tapUnit(id), onGrip: (id, i) => tapGrip(id, i) });
  hud.targetText = (u, it) => intentTarget(u, it, nameOf);
  const heroes = disp.order.map(id => disp.units[id]).filter(u => u.side === 'hero');
  const party = new Party(partyHost, heroes, { game: ctx.game, reduced, onTap: id => tapUnit(id) });
  const tray = new Tray(body);
  const input = new CommandInput({ root: dock, cmds: cmdsEl, sub: subEl, aim: aimEl }, {
    sfx,
    say: t => caption(t, 'warn'),
    sayTarget: id => sayTarget(id),
    setTargets: (ids, focus) => setTargets(ids, focus),
    targetsFor: cmd => targets(state, cmd),
    hpFrac: id => { const u = disp.units[id]; return u ? u.hp / u.maxHp : 1; },
    holdsRelic: id => (disp.units[id]?.held || []).some(p => p.held),
    keyboard: () => keyboardUsed,
  });

  const S = {
    disp, labels, stage, party, hud, tray, clock, sfx, reduced, root: shell, stageHost, partyHost, hooks,
    get services() { return ctx.services || {}; },
    ended: null, onSkip: null,
    log, caption, setActor, refreshUnit, shake, moveBanner, bigBanner, pulseStatus, gripHit,
    ribbonAdvance, addFoe,
    setPlaying(on) { playing = on; shell.classList.toggle('playing', on); if (on) { input.cancel(); } },
  };
  const player = new Player(S);
  let playing = false;
  let keyboardUsed = false;
  let ribbonIds = [];

  function applySpeed() {
    clock.speed = speed; stage.speed = speed; party.speed = speed;
    shell.style.setProperty('--spd', speed);
    shell.dataset.speed = speed;
    speedBtn.firstChild.textContent = `${speed}x`;
    speedBtn.setAttribute('aria-label', `Battle speed ${speed}x`);
  }
  applySpeed();

  // ---- display helpers ------------------------------------------------------------------------------------
  function addFoe(u, spawn = false) {
    stage.addFoe(u, { spawn });
    hud.addFoe(u);
    stage.formation();
    refreshUnit(u.id);
    placeAll();
  }
  function refreshUnit(id) {
    const u = disp.units[id];
    if (!u) return;
    if (u.side === 'hero') party.update(u);
    else {
      hud.update(u);
      stage.setLook(id, u);
      prewarmNext(u);
      const v = stage.foes.get(id);
      if (v && !v.removed) hud.place(id, stage.geom(id));
    }
    requestDraw();
  }
  function placeAll() {
    placedVersion = stage.version;
    for (const [id, v] of stage.foes) {
      const f = hud.foes.get(id);
      if (!f) continue;
      f.box.hidden = v.removed;
      if (!v.removed) hud.place(id, stage.geom(id));
    }
  }
  function setActor(id) {
    const u = disp.units[id];
    party.setActor(u?.side === 'hero' ? id : null);
    hud.setActor(u?.side === 'foe' ? id : null);
    stage.actorId = u?.side === 'foe' ? id : null;
    whoEl.textContent = u ? (u.side === 'hero' ? `${u.label}` : u.label) : '';
    whoEl.dataset.side = u?.side || '';
  }
  function setTargets(ids, focus) {
    const foeIds = ids.filter(id => disp.units[id]?.side === 'foe');
    const heroIds = ids.filter(id => disp.units[id]?.side === 'hero');
    stage.targets = new Set(foeIds);
    stage.focusId = focus;
    hud.setTargets(foeIds, focus);
    party.setTargets(heroIds, focus);
    shell.classList.toggle('aiming', ids.length > 0);
    requestDraw();
  }
  function sayTarget(id) {
    const u = disp.units[id];
    if (!u) return;
    let extra = '';
    if (u.side === 'foe') {
      const info = inspect(state, id);
      if (info?.weakTo?.length) extra = ` · weak to ${info.weakTo.slice(0, 3).join(', ')}`;
    }
    caption(`${u.label} · ${u.hp}/${u.maxHp} HP${extra}`, 'aim');
  }
  let captionTimer = 0;
  function caption(text, kind = '') {
    captionEl.textContent = text;
    captionEl.dataset.kind = kind;
    captionEl.classList.remove('flash'); void captionEl.offsetWidth; captionEl.classList.add('flash');
    clearTimeout(captionTimer);
  }
  function log(line) {
    if (!line) return;
    if (hooks && hooks.log) hooks.log(line);
    const li = el(`li.${line.kind || 'text'}`, { text: line.text });
    logList.append(li);
    if (line.kind !== 'turn') {
      miniLog.append(el(`li.${line.kind || 'text'}`, { text: line.text }));
      while (miniLog.children.length > 4) miniLog.firstChild.remove();
    }
    while (logList.children.length > 240) logList.firstChild.remove();
    if (!logPanel.hidden) li.scrollIntoView({ block: 'end' });
  }
  function toggleLog(on = logPanel.hidden) {
    logPanel.hidden = !on;
    logBtn.setAttribute('aria-expanded', String(on));
    shell.classList.toggle('log-open', on);
    if (on) logList.lastChild?.scrollIntoView({ block: 'end' });
    sfx(on ? 'select' : 'back');
  }
  let shakeTimer = 0;
  function shake(level = 1) {
    if (reduced) return;
    const cls = level >= 3 ? 'shake-3' : level === 2 ? 'shake-2' : 'shake-1';
    stageHost.classList.remove('shake-1', 'shake-2', 'shake-3'); void stageHost.offsetWidth;
    stageHost.classList.add(cls);
    clearTimeout(shakeTimer);
    shakeTimer = setTimeout(() => stageHost.classList.remove(cls), 520);
  }
  let moveTimer = 0;
  function moveBanner(name, side, text) {
    moveBan.replaceChildren(...[el('b', { text: name }), text ? el('small', { text }) : null].filter(Boolean));
    moveBan.dataset.side = side;
    moveBan.hidden = false;
    moveBan.classList.remove('in'); void moveBan.offsetWidth; moveBan.classList.add('in');
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => { moveBan.hidden = true; }, Math.max(450, 1300 / speed));
  }
  let bigTimer = 0;
  function bigBanner(title, sub, kind = '') {
    moveBan.hidden = true;
    bigBan.replaceChildren(...[el('b', { text: title }), sub ? el('small', { text: sub }) : null].filter(Boolean));
    bigBan.dataset.kind = kind;
    bigBan.hidden = false;
    bigBan.classList.remove('in'); void bigBan.offsetWidth; bigBan.classList.add('in');
    clearTimeout(bigTimer);
    bigTimer = setTimeout(() => { bigBan.hidden = true; }, Math.max(700, 2000 / speed));
  }
  function pulseStatus(id, status) {
    const host = disp.units[id]?.side === 'hero' ? party.v.get(id)?.card : hud.foes.get(id)?.box;
    const chip = host?.querySelector(`[data-st="${status}"]`);
    if (chip) { chip.classList.remove('tick'); void chip.offsetWidth; chip.classList.add('tick'); }
  }
  function gripHit(id, i, amount) {
    const f = hud.foes.get(id);
    const chip = f?.grips.children[i];
    if (chip) { chip.classList.remove('hit'); void chip.offsetWidth; chip.classList.add('hit'); }
    const g = stage.geom(id);
    if (g && amount > 0) hud.float(hud.fx, g.cx, g.top + (g.floor - g.top) * 0.62, `-${amount}`, 'grip', 'grip', 1000, `${id}:grip`);
  }
  function ribbonAdvance(actor) {
    if (ribbonIds[0] === actor) return;
    const i = ribbonIds.indexOf(actor);
    if (i > 0) ribbonIds = ribbonIds.slice(i);
    else ribbonIds = [actor, ...ribbonIds.filter(x => x !== actor)].slice(0, 8);
    renderRibbon(true);
  }
  function portraitOf(id) {
    const u = disp.units[id];
    if (u?.side === 'hero') return party.v.get(id).sprite.portrait(18);
    const v = stage.foes.get(id);
    return v ? v.sprite.portrait(18) : new ImageData(18, 18);
  }
  function renderRibbon(animate = false) {
    hud.ribbon(ribbonIds, disp.units, portraitOf, animate && !reduced);
  }

  // sync everything from the engine state (after each sequence)
  function syncAll() {
    const added = syncDisp(disp, state, labels);
    for (const id of added) if (disp.units[id].side === 'foe') addFoe(disp.units[id], false);
    for (const id of disp.order) {
      const u = disp.units[id];
      if (u.side === 'foe') {
        const v = stage.foes.get(id);
        if (v && (u.ko || u.gone) && !v.removed && !v.fade) { if (u.ko) stage.ko(id); else stage.escape(id); }
      }
      refreshUnit(id);
    }
    setActor(state.actor);
    ribbonIds = timeline(state, 8);
    renderRibbon(false);
    placeAll();
  }

  // ---- idle-time rasterising ---------------------------------------------------------------------------------
  // Cold rasters are the expensive part of the art (a boss pose is 150-300 ms on a slow phone). The
  // poses not needed at once, and the looks a foe is about to change into (a relic about to drop, the
  // next boss phase), are rendered one at a time when nothing is animating.
  const jobQ = [];
  const queuedLooks = new Set();
  let lastPump = 0;
  function pump(t, busy) {
    if (!jobQ.length || busy || t - lastPump < 90) return;
    lastPump = t;
    const t0 = performance.now();
    do { try { jobQ.shift()(); } catch (e) { console.warn('prewarm failed', e); } } while (jobQ.length && !playing && performance.now() - t0 < 12);
  }
  function prewarmNext(u) {
    const v = stage.foes.get(u.id);
    if (!v || u.ko || u.gone) return;
    const base = foeLook(u);
    const want = (key, look) => { if (!queuedLooks.has(key)) { queuedLooks.add(key); jobQ.unshift(...v.sprite.lookJobs(look)); } };
    const phases = familyData(u).phases;
    if (phases && u.phase < phases.length && u.hp / u.maxHp < phases[u.phase].at + 0.15) want(`${u.id}:phase${u.phase + 1}:${base.broken}`, { ...base, phase: u.phase + 1 });
    for (const p of u.held || []) {
      if (!p.held || p.grip / p.max > 0.6) continue;
      const look = v.sprite.def.relics ? { ...base, broken: [...(base.broken || []), p.relic] } : { ...base, relicHeld: false };
      want(`${u.id}:drop:${p.relic || p.item?.base}:${base.phase}`, look);
    }
  }

  // ---- drawing loop ------------------------------------------------------------------------------------------
  let raf = 0, lastDraw = 0, forceDraw = true, placedVersion = -1;
  const t0 = performance.now();
  function requestDraw() { forceDraw = true; }
  function frame() {
    raf = requestAnimationFrame(frame);
    const t = performance.now();
    const busy = stage.busy(t) || party.busy(t);
    pump(t, busy);
    const interval = busy ? 33 : reduced ? 1e9 : 110;
    if (!forceDraw && t - lastDraw < interval) return;
    lastDraw = t;
    forceDraw = false;
    const clockT = reduced ? 0 : (t - t0) / 1000;
    stage.draw(t, clockT);
    party.draw(t, clockT);
    if (stage.version !== placedVersion) placeAll();
  }

  // ---- layout ------------------------------------------------------------------------------------------------
  const extraSlots = foes0.some(f => f.tier === 'champion') ? 2 : foes0.some(f => (f.omens || []).includes('twinned')) ? 1 : 0;
  function relayout() {
    if (dead) return;
    stage.layout(extraSlots);
    party.layout();
    placeAll();
    requestDraw();
  }
  let roPending = 0;
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { cancelAnimationFrame(roPending); roPending = requestAnimationFrame(relayout); }) : null;

  // ---- taps -------------------------------------------------------------------------------------------------
  function fastForward() {
    if (!playing) return;
    clock.skip();
    if (S.onSkip) { S.onSkip(); S.onSkip = null; }
  }
  stageHost.addEventListener('click', e => {
    if (playing) { e.stopPropagation(); fastForward(); }
  }, true);
  partyHost.addEventListener('click', e => { if (playing) { e.stopPropagation(); fastForward(); } }, true);
  // the dock hurries on pointerdown: a click that confirms a command must not skip its own animation
  dock.addEventListener('pointerdown', e => { if (playing && !e.target.closest('.bt-analyze')) fastForward(); });

  function tapUnit(id) {
    if (playing) return;
    if (input.mode === 'target') { input.pick(id); return; }
    openInspect(id);
  }
  function tapGrip(id, i) {
    if (playing) return;
    const u = disp.units[id];
    const piece = u?.held?.[i];
    if (!piece) return;
    if (input.mode === 'target') { input.pick(id, piece.relic || piece.item?.base || null); return; }
    openPreview(u, piece);
  }
  let modalOpen = false;
  async function openPreview(u, piece) {
    const item = pieceItem(piece);
    if (!item) return;
    sfx('select');
    const svc = ctx.services && ctx.services.cardPreview;
    if (svc) {
      modalOpen = true;
      try { await svc(item, { heldBy: u.label, loose: !piece.held }); return; } catch (e) { console.warn('cardPreview failed, using the fallback', e); } finally { modalOpen = false; }
    }
    modalOpen = true;
    try { await heldByPreview(shell, { item, heldBy: u.label, loose: !piece.held }, { sfx, reduced }); } finally { modalOpen = false; }
  }
  async function openInspect(id) {
    const ids = disp.order.filter(x => disp.units[x].side === 'foe' && !disp.units[x].ko && !disp.units[x].gone);
    id = id || stage.focusId || ids[0];
    const info = id && inspect(state, id);
    if (!info) return;
    sfx('select');
    const u = disp.units[id];
    let portrait = null;
    if (u.side === 'foe') {
      const v = stage.foes.get(id);
      if (v) { portrait = toCanvas(null); const c = v.sprite.frame('idle', 0); portrait.width = c.width; portrait.height = c.height; portrait.getContext('2d').drawImage(c, 0, 0); }
    } else {
      portrait = toCanvas(null); const c = party.v.get(id).sprite.frame('idle', 0); portrait.width = c.width; portrait.height = c.height; portrait.getContext('2d').drawImage(c, 0, 0);
    }
    if (portrait) { portrait.className = 'px'; const k = portrait.width > 64 ? 1 : 2; portrait.style.width = `${portrait.width * k}px`; portrait.style.height = `${portrait.height * k}px`; }
    modalOpen = true;
    try {
      await inspectSheet(shell, info, { portrait, label: u.label, names: nameOf }, { sfx, onRelic: i => { const p = u.held?.[i]; if (p) openPreview(u, p); } });
    } finally { modalOpen = false; }
  }
  inspectBtn.addEventListener('click', e => { e.stopPropagation(); openInspect(input.mode === 'target' ? stage.focusId : null); });
  logBtn.addEventListener('click', () => toggleLog());
  autoBtn.addEventListener('click', () => {
    auto = !auto;
    autoBtn.setAttribute('aria-pressed', String(auto));
    try { ctx.setSettings({ battleAuto: auto }); } catch { /* settings optional */ }
    sfx(auto ? 'confirm' : 'back');
    if (auto && input.active) input.cancel();
    caption(auto ? 'Auto battle on: the party fights on its own.' : 'Auto battle off.', 'info');
  });
  function toggleSpeed() {
    speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    try { ctx.setSettings({ battleSpeed: speed }); } catch { /* settings optional */ }
    applySpeed();
    sfx('select');
  }
  speedBtn.addEventListener('click', toggleSpeed);

  const onKeyAny = () => { keyboardUsed = true; };
  const onPointerAny = () => { keyboardUsed = false; };
  window.addEventListener('keydown', onKeyAny, true);
  window.addEventListener('pointerdown', onPointerAny, true);

  // ---- the battle loop --------------------------------------------------------------------------------------
  function describe(cmd) {
    const t = cmd.target && disp.units[cmd.target] ? disp.units[cmd.target].label : '';
    if (cmd.type === 'attack') return `Attacks ${t}`;
    if (cmd.type === 'defend') return 'Raises a guard.';
    if (cmd.type === 'flee') return 'Looks for a way out...';
    return `${cmd.name.replace('Legend Surge: ', '')}${t && cmd.target !== cmd.actor ? ` on ${t}` : ''}`;
  }
  async function heroCommand(id) {
    if (auto) {
      await clock.wait(220);
      return autoCommand(state, id);
    }
    const u = disp.units[id];
    caption('Choose a command.', 'prompt');
    const cmd = await input.begin(u, commands(state, id));
    return cmd;
  }

  async function run() {
    // intro card while every pose is rasterised
    for (const id of disp.order) {
      if (disp.units[id].side !== 'foe') continue;
      addFoe(disp.units[id]);
      await new Promise(r => setTimeout(r, 0)); // one cold raster per task
      if (dead) return;
    }
    for (const h of heroes) party.update(h);
    relayout();
    if (ro) { ro.observe(stageHost); ro.observe(partyHost); }
    ctx.audio.music?.(boss ? 'boss' : 'battle');
    const now = [() => renderBackdrop(backdrop, { w: stage.lw, h: stage.lh, t: 0, reduced })], later = [];
    for (const v of stage.foes.values()) { const j = v.sprite.jobs(disp.units[v.id]); now.push(...j.now); later.push(...j.later); }
    for (const v of party.v.values()) { const j = v.sprite.jobs(); now.push(...j.now); later.push(...j.later); }
    const t0i = performance.now();
    await runJobs(now, { isDead: () => dead });
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const waited = performance.now() - t0i;
    await clock.real(Math.max(0, (reduced ? 300 : 900) - waited));
    intro.classList.add('out');
    setTimeout(() => intro.remove(), 500);
    jobQ.push(...later); // the other poses rasterise in idle moments
    syncAll();
    ribbonIds = timeline(state, 8);
    renderRibbon(false);
    await player.play(state.openingEvents || [], state);
    syncAll();

    let guard = 0;
    while (!state.ended && !dead && guard++ < 3000) {
      const id = current(state);
      const u = state.units[id];
      let r;
      if (u.side === 'foe') {
        await clock.wait(180);
        r = foeTurn(state);
      } else {
        const cmd = await heroCommand(id);
        if (dead) return;
        if (!cmd) continue; // auto was switched on mid-choice
        caption(describe(cmd), 'move');
        try { r = act(state, cmd); } catch (e) {
          console.error('Command failed', e);
          caption('That cannot be done right now.', 'warn');
          continue;
        }
        sfx('confirm');
      }
      await player.play(r.events, r.state);
      state = r.state;
      syncAll();
    }
    if (dead) return;
    await finish();
  }

  async function finish() {
    const out = outcome(state);
    const res = out?.result || S.ended || 'victory';
    const title = res === 'victory' ? 'Victory' : res === 'defeat' ? 'Defeat' : 'Escaped';
    const sub = res === 'victory' ? `+${out?.xp || 0} XP · +${out?.gold || 0} gold` : res === 'defeat' ? 'The party falls. The hearth will wake you.' : 'You break away from the fight.';
    sfx(res === 'victory' ? 'victory' : res === 'defeat' ? 'defeat' : 'back');
    setTargets([], null);
    const end = el(`div.bt-end.${res}`, { role: 'status' }, el('p.bt-end-k', { text: res === 'victory' ? 'The field is yours' : res === 'defeat' ? 'Party wiped' : 'Fled' }), el('h2', { text: title }), el('p.bt-end-sub', { text: sub }));
    shell.append(end);
    requestAnimationFrame(() => end.classList.add('in'));
    shell.classList.add('ended');
    await clock.real(reduced ? 900 : 1700).catch(() => {});
    if (hooks && hooks.peak) await hooks.peak({ t: 'end', result: res });
    if (dead) return;
    ctx.go('aftermath', { battle: state, returnTo, result: outcome(state) });
  }

  run().catch(e => {
    if (e && e.cancelled) return;
    console.error(e);
    try { ctx.toast('The battle hit a snag. Resolving it quietly.'); } catch { /* no toast */ }
    // never strand the player: resolve the rest automatically and hand off
    let s = state, g = 0;
    while (!s.ended && g++ < 3000) {
      const id = current(s);
      s = (s.units[id].side === 'hero' ? act(s, autoCommand(s, id)) : foeTurn(s)).state;
    }
    state = s;
    if (!dead) ctx.go('aftermath', { battle: s, returnTo, result: outcome(s) });
  });

  return {
    unmount() {
      dead = true;
      clock.kill();
      input.cancel();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(roPending);
      if (ro) ro.disconnect();
      clearTimeout(moveTimer); clearTimeout(bigTimer); clearTimeout(shakeTimer); clearTimeout(captionTimer);
      window.removeEventListener('keydown', onKeyAny, true);
      window.removeEventListener('pointerdown', onPointerAny, true);
      root.classList.remove('bt-screen');
    },
    onAction(action) {
      keyboardUsed = true;
      if (modalOpen || document.body.classList.contains('ov-open')) return false;
      if (action === 'fast') { toggleSpeed(); return true; }
      if (playing) {
        if (action === 'confirm') { fastForward(); return true; }
        return false;
      }
      if (action === 'menu') { openInspect(input.mode === 'target' ? stage.focusId : null); return true; }
      if (input.active) return input.onAction(action);
      return false;
    },
  };
}

