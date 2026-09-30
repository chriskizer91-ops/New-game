// DOM overlays for the battle: foe plates (name, HP, statuses, grip meters), intent-die bubbles,
// the Initiative Ribbon, floating numbers and banners. Positions come from Stage.geom().
// M5: a burrowed foe's plate says so (.bt-foe.sunk: "Burrowed · out of reach"), and its box is never a
// valid target; on the ribbon a held hero's turn is iced over (.held) and a charmed one's pink (.charmed).
// M6: a foe that dives into water (the Blackwater Leviathan) reads "Dived · out of reach" (.bt-foe.sunk.water); a
// grip bar names a Page IV relic by the thing, not whose it is (model.js gripWord: "Toll", not "Hodge's").
// M7 (spec §4.2, §4.4, §5): the new tiers' dice read as the Champion's unless the art gives them a look of their own;
// a two-dice foe (the Unsmith) shows both intents, one row a die (.bt-int-row[data-slot]), the one he has played
// dimmed and a Staggered one broken off; a hollow foe's die shows its natural roll with the +4 beside it
// (.bt-int-bonus: "+4 = 17") while the gift holds; the Stolen Arts he takes up sit on his plate as the relics'
// icons (.bt-stolen); the guest's turns on the ribbon are hers (.bt-rib.ally).
import { statusIcon, diceIcon, gripIcon, INTENT_DIE } from '../../art/icons.js';
import { itemIcon } from '../../art/item-looks.js';
import { STATUSES } from '../../data/statuses.js';
import { RELICS } from '../../data/relics.js';
import { el, pixelIcon, toCanvas, clamp } from './util.js';
import { heldStatus, isCharmed, isSunk, untargetable, divesUnderWater, gripWord, statusWords, tierKey, dieText, stolenOf } from './model.js';

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

// the intent die's look: the tier's own, else the tier it reads as (the hollow and the Unsmith read the Champion's)
export function intentDie(tier) {
  return INTENT_DIE[tierKey(INTENT_DIE, tier)] || INTENT_DIE.rabble;
}
function dieFor(u, intent) {
  const look = intentDie(u.tier);
  return { sides: intent?.die || look.sides, mat: look.mat };
}
// what the die shows: the natural roll (a hollow foe's +4 is beside it), else the face
const shownFace = it => it?.natural ?? it?.face;

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
    const bonus = el('span.bt-int-bonus', { hidden: true });
    const iname = el('span.bt-int-name');
    const itgt = el('span.bt-int-tgt');
    const charge = el('span.bt-int-charge', { text: 'charging' });
    const queue = el('span.bt-int-queue');
    // M7: the second die's row (the Unsmith: two intents, both played on his turn, in order)
    const die2 = el('span.bt-die');
    const bonus2 = el('span.bt-int-bonus', { hidden: true });
    const iname2 = el('span.bt-int-name');
    const itgt2 = el('span.bt-int-tgt');
    const charge2 = el('span.bt-int-charge', { text: 'charging' });
    const two = el('span.bt-int-two', { hidden: true, 'data-slot': '1' }, die2, el('span.bt-int-txt', null, el('span.bt-int-line', null, bonus2, iname2), itgt2), charge2);
    const intent = el('div.bt-intent', { 'aria-hidden': 'true' }, die, el('span.bt-int-txt', null, el('span.bt-int-line', null, bonus, iname), itgt), charge, two, queue);
    const name = el('span.bt-foe-name', { text: u.label || u.name });
    const lv = el('span.bt-foe-lv', { text: `L${u.level}` });
    const bar = el('span.bt-bar.hp.foe', null, el('i.lag'), el('i.fill'));
    const hpNum = el('span.bt-foe-hpnum');
    const st = el('span.bt-foe-st');
    const grips = el('span.bt-grips');
    const state = el('span.bt-foe-state', { hidden: true });
    // M7: the Stolen Arts he took up (the relics' icons), once he has taken them
    const stolen = el('span.bt-stolen', { hidden: true });
    st.hidden = true;
    grips.hidden = true;
    const plate = el('div.bt-plate', null, el('span.bt-plate-top', null, name, lv), el('span.bt-plate-bar', null, bar, hpNum), state, st, grips, stolen);
    plate.addEventListener('click', e => { if (!e.target.closest('.bt-grip')) this.onFoe(u.id); });
    const box = el('div.bt-foe', { 'data-id': u.id }, hit, intent, plate);
    this.layer.append(box);
    const f = {
      id: u.id, box, hit, intent, die, bonus, iname, itgt, charge, queue, two, die2, bonus2, iname2, itgt2, charge2, plate, name, bar, hpNum, st, state, grips, stolen,
      statusKey: '', gripKey: '', intentKey: '', stolenKey: '', dieTimer: 0,
    };
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
    // never under 44 px (M6: a foe gone down into the water shows only its back, and is still tapped to see why it
    // cannot be targeted): a short box grows up from the floor, a narrow one out from its middle
    const hw = Math.max(44, g.right - g.left + hitPad * 2), hh = Math.max(44, g.floor - g.top + hitPad);
    Object.assign(f.hit.style, { left: `${Math.round((g.left + g.right) / 2 - hw / 2)}px`, top: `${Math.round(g.floor - hh)}px`, width: `${Math.round(hw)}px`, height: `${Math.round(hh)}px` });
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
    // M5: under the floor (burrowed): out of reach until its own turn comes round
    const sunk = isSunk(u) && !u.ko && !u.gone;
    const water = sunk && divesUnderWater(u);
    f.box.classList.toggle('sunk', sunk);
    f.box.classList.toggle('water', water);
    f.state.hidden = !sunk;
    if (sunk) f.state.textContent = `${water ? 'Dived' : STATUSES[u.statuses.find(s => STATUSES[s.id]?.untargetable)?.id]?.name || 'Out of reach'} · out of reach`;
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
    // M7: the Stolen Arts on his plate: each relic he took, by its icon (the Analyze sheet names them and their moves)
    const stolen = stolenOf(u);
    const sk = stolen.map(s => s.id).join(',');
    if (sk !== f.stolenKey) {
      f.stolenKey = sk;
      f.stolen.replaceChildren(el('span.bt-stolen-k', { text: 'Stolen' }), ...stolen.map(s => {
        const i = el('i.bt-stolen-i', { title: s.move, 'data-relic': s.id });
        try { const img = itemIcon(s.id, { size: 12 }); if (img) i.append(pixelIcon(img, 1)); } catch { /* the name is in the title */ }
        return i;
      }));
      f.stolen.hidden = !stolen.length;
      f.stolen.setAttribute('aria-label', stolen.length ? `Stolen Arts: ${stolen.map(s => s.name).join(', ')}` : '');
    }
    // intent bubble
    this.setIntent(u, u.intent, analyzedQueue ?? (u.analyzed ? u.queue : []));
    this.label(u);
  }

  // what a screen reader hears for the foe: who, HP, statuses, what it intends (a hollow foe's roll with its +4) and
  // what it took. Kept with the bubble: a new roll (tumbleIntent) is read out at once, not at the next refresh.
  label(u) {
    const f = this.foes.get(u.id);
    if (!f) return;
    const stolen = stolenOf(u);
    const said = it => `${it.name}${it.charging && !it.cancelled ? ' (charging)' : ''}${it.cancelled ? ' (broken off)' : ''}${it.bonus ? ` (${dieText(it)})` : ''}`;
    const its = [u.intent, u.dice > 1 ? u.intent2 : null].filter(Boolean);
    const intentTxt = its.length ? `, intends ${its.map(said).join(', then ')}` : '';
    const stolenTxt = stolen.length ? `, wearing ${stolen.length} stolen ${stolen.length === 1 ? 'relic' : 'relics'}` : '';
    f.hit.setAttribute('aria-label', `${u.label || u.name}, level ${u.level}, HP ${u.hp} of ${u.maxHp}${statusWords(u).map(w => `, ${w}`).join('')}${untargetable(u) ? ', cannot be targeted' : ''}${intentTxt}${stolenTxt}`);
  }

  gripChip(u, p, i) {
    const name = relicName(p);
    const pct = p.max ? clamp(p.grip / p.max, 0, 1) * 100 : 0;
    const b = el('button.bt-grip', { type: 'button', 'data-relic': p.relic || p.item?.base || '', 'data-idx': i, 'aria-label': p.held ? `${name}: grip ${p.grip} of ${p.max}. Show the card.` : `${name}: knocked loose. Show the card.` },
      pixelIcon(gripIcon({ size: 12, broken: !p.held }), 1),
      el('span.bt-grip-nm', { text: gripWord(name, p.relic || p.item?.base) }),
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
    const second = u.dice > 1 ? u.intent2 || null : null;
    const k = it => (it ? `${it.face}|${it.natural ?? ''}|${it.bonus ?? ''}|${it.name}|${it.target}|${it.charging}|${it.cancelled}|${it.played}|${it.die}` : '-');
    const key = intent ? `${k(intent)}|${k(second)}|${queue.map(q => q.face + q.name).join(',')}` : '-';
    if (key === f.intentKey) return;
    f.intentKey = key;
    f.intent.hidden = !intent || u.ko || u.gone;
    if (!intent) return;
    const d = dieFor(u, intent);
    this.paintRow(u, intent, { die: f.die, bonus: f.bonus, name: f.iname, tgt: f.itgt, charge: f.charge }, d);
    f.intent.classList.toggle('cancelled', !!intent.cancelled);
    f.intent.classList.toggle('charging', !!intent.charging && !intent.cancelled);
    f.intent.classList.toggle('played', !!intent.played && !!second);
    // M7: the second die (slot 1), in its own row under the first
    f.two.hidden = !second;
    f.intent.classList.toggle('two-dice', !!second);
    if (second) {
      this.paintRow(u, second, { die: f.die2, bonus: f.bonus2, name: f.iname2, tgt: f.itgt2, charge: f.charge2 }, dieFor(u, second));
      f.two.classList.toggle('cancelled', !!second.cancelled);
      f.two.classList.toggle('played', !!second.played);
    }
    f.queue.replaceChildren(...queue.map(q => el('span.bt-q', null, pixelIcon(diceIcon(d.sides, { value: q.face, size: 12, mat: d.mat }), 1), el('span', { text: q.name }))));
    f.queue.hidden = !queue.length;
  }
  // one intent's row: its die (a hollow foe's natural roll, with "+4 = 17" beside the move), its name and its aim
  paintRow(u, it, r, d) {
    r.die.replaceChildren(pixelIcon(diceIcon(d.sides, { value: shownFace(it), size: 16, mat: d.mat }), 2));
    r.bonus.hidden = !it.bonus;
    r.bonus.textContent = it.bonus ? `+${it.bonus} = ${it.face}` : '';
    r.name.textContent = it.name;
    r.tgt.textContent = this.targetText(u, it);
    r.charge.hidden = !it.charging || !!it.cancelled;
  }
  // replaced by the screen with a version that knows move targets and display names
  targetText(u, intent) { return intent.target && intent.target !== u.id ? 'at someone' : ''; }

  // the intent die tumbles, then settles on its face (M7: a hollow foe's on its natural roll, the +4 popping in
  // beside it; the Unsmith's two dice tumble together)
  tumbleIntent(u, intent, ms, reduced) {
    const f = this.foes.get(u.id);
    if (!f || !intent) return;
    clearInterval(f.dieTimer);
    f.intentKey = '';
    this.setIntent(u, intent, u.analyzed ? u.queue : []);
    this.label(u);
    const rows = [[f.die, intent, f.bonus]];
    if (u.dice > 1 && u.intent2 && !f.two.hidden) rows.push([f.die2, u.intent2, f.bonus2]);
    const rolled = rows.filter(([, it]) => it.face != null);
    if (reduced || ms < 90 || !rolled.length) return; // an opener is not rolled: its die stays blank
    f.intent.classList.add('rolling');
    for (const [, , b] of rolled) b.classList.add('wait');
    let k = 0;
    const draw = () => {
      k++;
      for (const [die, it] of rolled) {
        const d = dieFor(u, it);
        die.replaceChildren(pixelIcon(diceIcon(d.sides, { value: 1 + Math.floor(Math.random() * d.sides), size: 16, mat: d.mat, spin: k & 3 }), 2));
      }
    };
    draw();
    f.dieTimer = setInterval(draw, 70);
    setTimeout(() => {
      clearInterval(f.dieTimer);
      f.intent.classList.remove('rolling');
      for (const [die, it, b] of rolled) {
        const d = dieFor(u, it);
        die.replaceChildren(pixelIcon(diceIcon(d.sides, { value: shownFace(it), size: 16, mat: d.mat }), 2));
        b.classList.remove('wait');
        if (it.bonus) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
      }
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
    // a long label on the edge hero ("Carried off by the Thunder-Roc") stays inside its row (M5)
    const hw = host.clientWidth, nw = n.offsetWidth;
    if (hw && nw) n.style.left = `${Math.round(clamp(x + (k % 2 ? 10 : 0), nw / 2 + 2, Math.max(nw / 2 + 2, hw - nw / 2 - 2)))}px`;
    setTimeout(() => n.remove(), dur + 60);
    return n;
  }

  // ---- ribbon ---------------------------------------------------------------------------------------
  // ids: next turns; units: display units; portrait(id) -> ImageData
  ribbon(ids, units, portrait, animate) {
    // M5: a hold or a charm changes how a turn looks, not only the order
    const marks = ids.map(id => (heldStatus(units[id]) ? 'h' : isCharmed(units[id]) ? 'c' : '')).join('');
    const key = `${ids.join(',')}|${marks}`;
    if (key === this.ribbonKey) return;
    const shifted = this.ribbonKey && this.ribbonKey.split('|')[0].split(',').slice(1).join(',').startsWith(ids.slice(0, 3).join(','));
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
  const held = heldStatus(u), charmed = isCharmed(u);
  const how = held ? `, ${String(held.label || STATUSES[held.id]?.name || 'held').toLowerCase()}: the turn is lost` : charmed ? ', charmed' : '';
  // M7: the guest's turn (.bt-rib.ally) is hers: the engine plays it
  const who = u.side === 'ally' ? `${u.label || u.name}, beside you` : u.label || u.name;
  const item = el(`li.bt-rib.${u.side}${i === 0 ? '.now' : ''}${held ? '.held' : ''}${charmed ? '.charmed' : ''}`, { title: `${i === 0 ? 'Now' : `Turn ${i + 1}`}: ${who}${how}` }, canvas);
  if (i === 0) item.append(el('span.bt-rib-now', { text: 'now' }));
  list.append(item);
}
