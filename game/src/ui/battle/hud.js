// DOM overlays for the battle: foe plates (name, HP, statuses, grip meters), intent-die bubbles,
// the Initiative Ribbon, floating numbers and banners. Positions come from Stage.geom().
import { statusIcon, diceIcon, gripIcon, INTENT_DIE } from '../../art/icons.js';
import { STATUSES } from '../../data/statuses.js';
import { RELICS } from '../../data/relics.js';
import { el, pixelIcon, toCanvas, clamp } from './util.js';

// ---- small shared pieces ----------------------------------------------------------------------------

export function statusChip(st, scale = 2, pop = false) {
  const def = STATUSES[st.id];
  const name = def ? def.name : st.id;
  let icon;
  try { icon = pixelIcon(statusIcon(st.id, { size: 12 }), scale); } catch { icon = el('span.bt-st-fallback', { text: name[0] }); }
  const chip = el(`span.bt-st${pop ? '.pop' : ''}`, { title: `${name}${st.stacks > 1 ? ` x${st.stacks}` : ''}${st.turns ? `, ${st.turns} turn${st.turns === 1 ? '' : 's'}` : ''}${st.value ? ` (${st.value})` : ''}`, 'data-st': st.id }, icon);
  if (st.stacks > 1) chip.append(el('b', { text: st.stacks }));
  return chip;
}

export function relicName(piece) {
  if (!piece) return 'relic';
  if (piece.relic && RELICS[piece.relic]) return RELICS[piece.relic].name;
  return piece.item?.name || 'relic';
}

function dieFor(u, intent) {
  const look = INTENT_DIE[u.tier] || INTENT_DIE.rabble;
  return { sides: intent?.die || look.sides, mat: look.mat };
}

// ---- foe plates + intents ------------------------------------------------------------------------------

export class Hud {
  constructor({ stageHost, ribbonHost, onFoe, onGrip }) {
    this.layer = el('div.bt-overlay');
    stageHost.append(this.layer);
    this.fx = el('div.bt-fx-layer', { 'aria-hidden': 'true' });
    stageHost.append(this.fx);
    this.ribbonHost = ribbonHost;
    this.onFoe = onFoe;
    this.onGrip = onGrip;
    this.foes = new Map();
    this.ribbonKey = '';
    this.portraits = new Map();
    this.slots = new Map();
  }

  addFoe(u) {
    if (this.foes.has(u.id)) return this.foes.get(u.id);
    const hit = el('button.bt-foe-hit', { type: 'button', 'data-id': u.id });
    hit.addEventListener('click', () => this.onFoe(u.id));
    const die = el('span.bt-die');
    const iname = el('span.bt-int-name');
    const itgt = el('span.bt-int-tgt');
    const charge = el('span.bt-int-charge', { text: 'charging' });
    const queue = el('span.bt-int-queue');
    const intent = el('div.bt-intent', { 'aria-hidden': 'true' }, die, el('span.bt-int-txt', null, iname, itgt), charge, queue);
    const name = el('span.bt-foe-name', { text: u.label || u.name });
    const lv = el('span.bt-foe-lv', { text: `L${u.level}` });
    const bar = el('span.bt-bar.hp.foe', null, el('i.lag'), el('i.fill'));
    const hpNum = el('span.bt-foe-hpnum');
    const st = el('span.bt-foe-st');
    const grips = el('span.bt-grips');
    st.hidden = true;
    grips.hidden = true;
    const plate = el('div.bt-plate', null, el('span.bt-plate-top', null, name, lv), el('span.bt-plate-bar', null, bar, hpNum), st, grips);
    plate.addEventListener('click', e => { if (!e.target.closest('.bt-grip')) this.onFoe(u.id); });
    const box = el('div.bt-foe', { 'data-id': u.id }, hit, intent, plate);
    this.layer.append(box);
    const f = { id: u.id, box, hit, intent, die, iname, itgt, charge, queue, plate, name, bar, hpNum, st, grips, statusKey: '', gripKey: '', intentKey: '', dieTimer: 0 };
    this.foes.set(u.id, f);
    return f;
  }

  // positions from the stage (CSS px)
  place(id, g) {
    const f = this.foes.get(id);
    if (!f || !g) return;
    // read sizes first, then write (one layout flush per call)
    const ph = f.plate.offsetHeight || 60;
    const iw = f.intent.offsetWidth || 100, ih = f.intent.offsetHeight || 40;
    const stageW = this.layer.clientWidth || 9999;
    const plateW = clamp(Math.round(g.slotW - 6), 86, 200);
    f.plateW = plateW;
    const hitPad = 6;
    Object.assign(f.hit.style, { left: `${Math.round(g.left - hitPad)}px`, top: `${Math.round(g.top - hitPad)}px`, width: `${Math.round(g.right - g.left + hitPad * 2)}px`, height: `${Math.round(g.floor - g.top + hitPad)}px` });
    // a short stage keeps the plate in view, overlapping the legs
    Object.assign(f.plate.style, { left: `${Math.round(g.cx - plateW / 2)}px`, width: `${plateW}px`, top: `${Math.round(Math.min(g.floor + 3, g.stageH - ph - 3))}px` });
    // the intent bubble is centred on the foe (-50% translate) but stays inside the stage
    f.intent.style.maxWidth = `${Math.max(plateW + 24, 124)}px`;
    f.intent.style.left = `${Math.round(clamp(g.cx, iw / 2 + 3, stageW - iw / 2 - 3))}px`;
    f.intent.style.top = `${Math.max(ih + 3, Math.round(g.top - 8))}px`;
  }

  update(u, { analyzedQueue = null } = {}) {
    const f = this.foes.get(u.id);
    if (!f) return;
    const pct = clamp(u.hp / u.maxHp, 0, 1) * 100;
    f.bar.style.setProperty('--pct', `${pct}%`);
    f.bar.classList.toggle('low', pct <= 30);
    f.hpNum.textContent = `${u.hp}`;
    f.name.textContent = u.label || u.name;
    f.box.classList.toggle('down', !!(u.ko || u.gone));
    f.box.dataset.tier = u.tier || '';
    // statuses
    const key = u.statuses.map(s => `${s.id}${s.stacks}`).join(',');
    const room = Math.max(2, Math.floor(((f.plateW || 120) - 12) / 26));
    if (key !== f.statusKey || room !== f.room) {
      const before = new Set(f.statusKey.split(',').map(k => k.replace(/\d+$/, '')));
      f.statusKey = key;
      f.room = room;
      const list = u.statuses.length > room ? u.statuses.slice(0, room - 1) : u.statuses;
      const chips = list.map(s => statusChip(s, 2, !before.has(s.id)));
      if (list.length < u.statuses.length) chips.push(el('span.bt-st-more', { text: `+${u.statuses.length - list.length}`, title: u.statuses.slice(list.length).map(s => s.id).join(', ') }));
      f.st.replaceChildren(...chips);
      f.st.hidden = !u.statuses.length;
    }
    // grip meters, one per held relic piece
    const gk = (u.held || []).map(p => `${p.relic || p.item?.uid}:${p.grip}:${p.held}`).join('|');
    if (gk !== f.gripKey) {
      f.gripKey = gk;
      f.grips.replaceChildren(...(u.held || []).map((p, i) => this.gripChip(u, p, i)));
      f.grips.hidden = !(u.held || []).length;
    }
    // intent bubble
    this.setIntent(u, u.intent, analyzedQueue ?? (u.analyzed ? u.queue : []));
    const intentTxt = u.intent ? `, intends ${u.intent.name}${u.intent.charging ? ' (charging)' : ''}` : '';
    f.hit.setAttribute('aria-label', `${u.label || u.name}, level ${u.level}, HP ${u.hp} of ${u.maxHp}${u.statuses.length ? ', ' + u.statuses.map(s => s.id).join(', ') : ''}${intentTxt}`);
  }

  gripChip(u, p, i) {
    const name = relicName(p);
    const pct = p.max ? clamp(p.grip / p.max, 0, 1) * 100 : 0;
    const b = el('button.bt-grip', { type: 'button', 'data-relic': p.relic || p.item?.base || '', 'data-idx': i, 'aria-label': p.held ? `${name}: grip ${p.grip} of ${p.max}. Show the card.` : `${name}: knocked loose. Show the card.` },
      pixelIcon(gripIcon({ size: 12, broken: !p.held }), 1),
      el('span.bt-grip-nm', { text: name.replace(/^The /, '').split(' ')[0] }),
      el('span.bt-bar.grip', { style: `--pct:${pct}%` }, el('i.fill')),
      el('span.bt-grip-num', { text: p.held ? `${p.grip}` : 'loose' }),
    );
    b.classList.toggle('loose', !p.held);
    b.addEventListener('click', e => { e.stopPropagation(); this.onGrip(u.id, i); });
    return b;
  }

  setIntent(u, intent, queue = []) {
    const f = this.foes.get(u.id);
    if (!f) return;
    const key = intent ? `${intent.face}|${intent.name}|${intent.target}|${intent.charging}|${intent.cancelled}|${intent.die}|${queue.map(q => q.face + q.name).join(',')}` : '-';
    if (key === f.intentKey) return;
    f.intentKey = key;
    f.intent.hidden = !intent || u.ko || u.gone;
    if (!intent) return;
    const d = dieFor(u, intent);
    f.die.replaceChildren(pixelIcon(diceIcon(d.sides, { value: intent.face, size: 16, mat: d.mat }), 2));
    f.iname.textContent = intent.name;
    f.itgt.textContent = this.targetText(u, intent);
    f.charge.hidden = !intent.charging || intent.cancelled;
    f.intent.classList.toggle('cancelled', !!intent.cancelled);
    f.intent.classList.toggle('charging', !!intent.charging && !intent.cancelled);
    f.queue.replaceChildren(...queue.map(q => el('span.bt-q', null, pixelIcon(diceIcon(d.sides, { value: q.face, size: 12, mat: d.mat }), 1), el('span', { text: q.name }))));
    f.queue.hidden = !queue.length;
  }
  // replaced by the screen with a version that knows move targets and display names
  targetText(u, intent) { return intent.target && intent.target !== u.id ? 'at someone' : ''; }

  // the intent die tumbles, then settles on its face
  tumbleIntent(u, intent, ms, reduced) {
    const f = this.foes.get(u.id);
    if (!f || !intent) return;
    clearInterval(f.dieTimer);
    const d = dieFor(u, intent);
    f.intentKey = '';
    this.setIntent(u, intent, u.analyzed ? u.queue : []);
    if (reduced || ms < 90) return;
    f.intent.classList.add('rolling');
    let k = 0;
    const draw = () => {
      const face = 1 + Math.floor(Math.random() * d.sides);
      f.die.replaceChildren(pixelIcon(diceIcon(d.sides, { value: face, size: 16, mat: d.mat, spin: k++ & 3 }), 2));
    };
    draw();
    f.dieTimer = setInterval(draw, 70);
    setTimeout(() => {
      clearInterval(f.dieTimer);
      f.intent.classList.remove('rolling');
      f.die.replaceChildren(pixelIcon(diceIcon(d.sides, { value: intent.face, size: 16, mat: d.mat }), 2));
      f.intent.classList.remove('settle'); void f.intent.offsetWidth; f.intent.classList.add('settle');
    }, ms * 0.75);
  }

  setTargets(ids, focusId) {
    for (const f of this.foes.values()) {
      f.box.classList.toggle('valid', ids.includes(f.id));
      f.box.classList.toggle('focus', f.id === focusId);
      f.box.classList.toggle('dim', ids.length > 0 && !ids.includes(f.id));
    }
  }
  setActor(id) { for (const f of this.foes.values()) f.box.classList.toggle('active', f.id === id); }

  // ---- floating numbers & labels --------------------------------------------------------------------
  // floats on the same target stack upward instead of piling on one spot
  float(host, x, y, text, cls = '', sub = '', dur = 1100, key = null) {
    const now = performance.now();
    let k = 0;
    if (key) {
      const live = (this.slots.get(key) || []).filter(t => now - t.at < t.dur * 0.7);
      const used = new Set(live.map(t => t.k));
      while (used.has(k) && k < 4) k++;
      live.push({ at: now, dur, k });
      this.slots.set(key, live);
    }
    const dy = k * (cls.includes('status') || cls.includes('info') ? 20 : 26);
    const n = el(`div.bt-float${cls ? '.' + cls.split(' ').join('.') : ''}`, { style: `left:${Math.round(x + (k % 2 ? 10 : 0))}px;top:${Math.round(y - dy)}px;--dur:${dur}ms` }, el('b', { text }));
    if (sub) n.append(el('small', { text: sub }));
    host.append(n);
    setTimeout(() => n.remove(), dur + 60);
    return n;
  }

  // ---- ribbon ---------------------------------------------------------------------------------------
  // ids: next turns; units: display units; portrait(id) -> ImageData
  ribbon(ids, units, portrait, animate) {
    const key = ids.join(',');
    if (key === this.ribbonKey) return;
    const shifted = this.ribbonKey && this.ribbonKey.split(',').slice(1).join(',').startsWith(ids.slice(0, 3).join(','));
    this.ribbonKey = key;
    const list = el('ol.bt-rib-list');
    ids.forEach((id, i) => {
      const u = units[id];
      if (!u) return;
      let cv = this.portraits.get(id);
      if (!cv) { cv = toCanvas(portrait(id)); this.portraits.set(id, cv); }
      const c = cv.cloneNode(); c.getContext('2d').drawImage(cv, 0, 0);
      c.className = 'px';
      li(list, u, c, i);
    });
    this.ribbonHost.querySelector('.bt-rib-list')?.remove();
    this.ribbonHost.append(list);
    if (animate && shifted) { list.classList.add('shift'); }
  }
  clearPortrait(id) { this.portraits.delete(id); }
}

function li(list, u, canvas, i) {
  const item = el(`li.bt-rib.${u.side}${i === 0 ? '.now' : ''}`, { title: `${i === 0 ? 'Now' : `Turn ${i + 1}`}: ${u.label || u.name}` }, canvas);
  if (i === 0) item.append(el('span.bt-rib-now', { text: 'now' }));
  list.append(item);
}
