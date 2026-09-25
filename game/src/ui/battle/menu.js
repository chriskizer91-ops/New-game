// Player input for a hero's turn: the six commands, the Skills and Items submenus with MP costs
// and disabled reasons, and targeting (tap a foe or a hero; group moves confirm on any tap).
// Also the Analyze/inspect sheet. Keyboard: arrows/WASD move, Enter/Z confirm, Esc/X back, 1-6.
import { aspectIcon, statusIcon, gripIcon } from '../../art/icons.js';
import { STATUSES } from '../../data/statuses.js';
import { OMENS } from '../../data/omens.js';
import { ASPECTS } from '../../data/aspects.js';
import { el, pixelIcon, clamp } from './util.js';
import { relicName } from './hud.js';

const GROUP = ['all-enemies', 'all-allies'];

function nearest(buttons, from, dir) {
  const r0 = from.getBoundingClientRect();
  const c0 = [r0.left + r0.width / 2, r0.top + r0.height / 2];
  let best = null, bd = Infinity;
  for (const b of buttons) {
    if (b === from || b.hidden || !b.offsetParent) continue;
    const r = b.getBoundingClientRect(), c = [r.left + r.width / 2, r.top + r.height / 2];
    const dx = c[0] - c0[0], dy = c[1] - c0[1];
    const main = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
    const cross = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    if (main <= 4) continue;
    const d = main + cross * 2;
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

export class CommandInput {
  constructor(dock, deps) {
    this.dock = dock;
    this.deps = deps;
    this.mode = null;
    this.resolve = null;
  }

  get active() { return !!this.mode; }

  begin(hero, cmds) {
    this.hero = hero;
    this.cmds = cmds;
    return new Promise(res => { this.resolve = res; this.showRoot(); });
  }

  finish(cmd) {
    const res = this.resolve;
    this.resolve = null;
    this.mode = null;
    this.deps.setTargets([], null);
    this.dock.cmds.hidden = true;
    this.dock.sub.hidden = true;
    this.dock.aim.hidden = true;
    this.dock.root.classList.remove('input');
    if (res) res(cmd);
  }
  cancel() { if (this.resolve) this.finish(null); }

  // ---- root menu -------------------------------------------------------------------------------------
  showRoot(focusKey = null) {
    this.mode = 'root';
    this.deps.setTargets([], null);
    const { cmds, hero } = this;
    const by = t => cmds.filter(c => c.type === t);
    const attack = by('attack')[0], skills = by('skill'), items = by('item'), defend = by('defend')[0], surge = by('surge')[0], flee = by('flee')[0];
    const bag = items.reduce((a, c) => a + (c.count || 0), 0);
    const entries = [
      { k: 1, id: 'attack', name: 'Attack', sub: attack?.text?.split(':')[0] || '', cmd: attack, enabled: attack?.enabled, reason: attack?.reason },
      { k: 2, id: 'skills', name: 'Skills', sub: skills.length ? `${skills.filter(s => s.enabled).length}/${skills.length} ready` : 'none yet', enabled: skills.some(s => s.enabled), reason: skills.length ? 'Not enough MP' : 'No skills learned yet' },
      { k: 3, id: 'items', name: 'Items', sub: bag ? `${bag} in the bag` : 'bag empty', enabled: items.some(i => i.enabled), reason: 'The bag is empty' },
      { k: 4, id: 'defend', name: 'Defend', sub: 'Guard +2, MP +2', cmd: defend, enabled: defend?.enabled, reason: defend?.reason },
      { k: 5, id: 'surge', name: 'Surge', sub: surge?.enabled ? surge.name.replace('Legend Surge: ', '') : `${Math.round(hero.surge)}%`, cmd: surge, enabled: surge?.enabled, reason: surge?.reason, surge: true },
      { k: 6, id: 'flee', name: 'Flee', sub: flee?.enabled ? 'DEX check' : 'no escape', cmd: flee, enabled: flee?.enabled, reason: flee?.reason },
    ];
    const buttons = entries.map(e => {
      const b = el(`button.bt-cmd${e.enabled ? '' : '.off'}${e.surge && e.enabled ? '.ready' : ''}`, { type: 'button', 'data-cmd': e.id, 'aria-disabled': e.enabled ? null : 'true', 'aria-keyshortcuts': String(e.k) },
        el('span.bt-key', { text: e.k }), el('span.bt-cmd-name', { text: e.name }), el('span.bt-cmd-sub', { text: e.sub }));
      if (e.surge) b.style.setProperty('--pct', `${clamp(hero.surge, 0, 100)}%`);
      b.addEventListener('click', () => this.pickRoot(e));
      return b;
    });
    this.dock.cmds.replaceChildren(...buttons);
    this.dock.cmds.hidden = false;
    this.dock.sub.hidden = true;
    this.dock.aim.hidden = true;
    this.dock.root.classList.add('input');
    this.rootButtons = buttons;
    const f = buttons.find(b => b.dataset.cmd === focusKey) || (this.deps.keyboard() ? buttons[0] : null);
    if (f) f.focus({ preventScroll: true });
  }

  pickRoot(e) {
    if (!e.enabled) { this.deps.sfx('back'); this.deps.say(e.reason || 'Not now.'); return; }
    this.deps.sfx('select');
    if (e.id === 'skills') return this.showSub('skill');
    if (e.id === 'items') return this.showSub('item');
    return this.startTarget(e.cmd, e.id);
  }

  // ---- submenus ----------------------------------------------------------------------------------------
  showSub(type) {
    this.mode = 'sub';
    this.subType = type;
    const list = this.cmds.filter(c => c.type === type);
    const back = el('button.bt-back', { type: 'button', 'aria-label': 'Back' }, el('span', { text: '‹' }), el('span', { text: 'Back' }));
    back.addEventListener('click', () => this.back());
    const title = el('span.bt-sub-title', { text: type === 'skill' ? `${this.hero.label}'s skills` : 'The bag' });
    const mp = type === 'skill' ? el('span.bt-sub-mp', { text: `MP ${this.hero.mp}/${this.hero.maxMp}` }) : null;
    const rows = list.map(c => {
      const cost = type === 'skill' ? `${c.mp} MP` : `x${c.count}`;
      const b = el(`button.bt-opt${c.enabled ? '' : '.off'}`, { type: 'button', 'aria-disabled': c.enabled ? null : 'true', 'data-id': c.id },
        el('span.bt-opt-top', null, el('span.bt-opt-name', { text: c.name }), el('span.bt-opt-cost', { text: cost })),
        el('span.bt-opt-text', { text: c.enabled ? c.text : `${c.reason}. ${c.text}` }));
      b.addEventListener('click', () => {
        if (!c.enabled) { this.deps.sfx('back'); this.deps.say(c.reason || 'Not now.'); return; }
        this.deps.sfx('select');
        this.startTarget(c, type === 'skill' ? 'skills' : 'items');
      });
      return b;
    });
    this.dock.sub.replaceChildren(el('div.bt-sub-head', null, back, title, mp), el('div.bt-sub-list', null, ...rows));
    this.dock.sub.hidden = false;
    this.dock.cmds.hidden = true;
    this.dock.aim.hidden = true;
    this.subButtons = rows;
    const first = rows.find(r => !r.classList.contains('off')) || rows[0] || back;
    if (this.deps.keyboard()) first.focus({ preventScroll: true });
  }

  // ---- targeting ---------------------------------------------------------------------------------------
  startTarget(cmd, from) {
    const tg = cmd.targeting;
    if (tg === 'none' || tg === 'self') return this.finish({ ...cmd, target: tg === 'self' ? this.hero.id : undefined });
    const ids = this.deps.targetsFor(cmd);
    if (!ids.length) { this.deps.say('No valid target.'); return undefined; }
    this.mode = 'target';
    this.aimCmd = cmd;
    this.aimFrom = from;
    this.aimIds = ids;
    this.group = GROUP.includes(tg);
    const side = tg.includes('ally') ? 'ally' : 'foe';
    this.focusIdx = 0;
    if (!this.group && side === 'foe') {
      // start on the most wounded foe, like a player would
      const hp = id => this.deps.hpFrac(id);
      this.focusIdx = ids.reduce((bi, id, i) => (hp(id) < hp(ids[bi]) ? i : bi), 0);
    }
    const back = el('button.bt-back', { type: 'button', 'aria-label': 'Back' }, el('span', { text: '‹' }), el('span', { text: 'Back' }));
    back.addEventListener('click', () => this.back());
    const prompt = this.group ? (side === 'ally' ? 'Every ally' : 'Every foe') : tg === 'ally-ko' ? 'Choose a fallen ally' : side === 'ally' ? 'Choose an ally' : 'Choose a target';
    const kids = [el('div.bt-aim-head', null, back, el('span.bt-aim-title', null, el('b', { text: cmd.name.replace('Legend Surge: ', '') }), el('span', { text: prompt })))];
    kids.push(el('p.bt-aim-text', { text: cmd.text || '' }));
    if (this.group) {
      const go = el('button.btn.primary.bt-aim-go', { type: 'button', text: 'Confirm' });
      go.addEventListener('click', () => this.pick(ids[0]));
      kids.push(go);
      this.goBtn = go;
    } else {
      const relics = side === 'foe' && ids.some(id => this.deps.holdsRelic(id));
      kids.push(el('p.bt-aim-hint', { text: side === 'ally' ? 'Tap a hero below.' : relics ? 'Tap a foe, or its grip meter to aim at that relic.' : 'Tap a foe.' }));
    }
    this.dock.aim.replaceChildren(...kids);
    this.dock.aim.hidden = false;
    this.dock.cmds.hidden = true;
    this.dock.sub.hidden = true;
    this.refreshTargets();
    if (this.group && this.deps.keyboard()) this.goBtn.focus({ preventScroll: true });
    else if (this.deps.keyboard()) back.blur();
  }
  refreshTargets() {
    const focus = this.group ? null : this.aimIds[this.focusIdx];
    this.deps.setTargets(this.aimIds, focus);
    if (focus) this.deps.sayTarget(focus);
  }
  // a tap on a combatant; returns true if it was consumed by targeting
  pick(id, relic = null) {
    if (this.mode !== 'target') return false;
    if (!this.aimIds.includes(id)) { this.deps.sfx('back'); return true; }
    this.deps.sfx('confirm');
    const cmd = { ...this.aimCmd, target: this.group ? undefined : id };
    if (relic) cmd.relic = relic;
    this.finish(cmd);
    return true;
  }

  back() {
    this.deps.sfx('back');
    if (this.mode === 'target') {
      if (this.aimFrom === 'skills') return this.showSub('skill');
      if (this.aimFrom === 'items') return this.showSub('item');
      return this.showRoot(this.aimFrom);
    }
    if (this.mode === 'sub') return this.showRoot(this.subType === 'skill' ? 'skills' : 'items');
    return undefined;
  }

  // ---- keyboard -------------------------------------------------------------------------------------------
  onAction(action) {
    if (!this.mode) return false;
    if (action === 'back') { if (this.mode !== 'root') this.back(); return true; }
    if (this.mode === 'root' && /^pick[1-6]$/.test(action)) {
      const b = this.rootButtons[Number(action.slice(4)) - 1];
      if (b) { b.focus({ preventScroll: true }); b.click(); }
      return true;
    }
    if (this.mode === 'sub' && /^pick[1-9]$/.test(action)) {
      const b = this.subButtons[Number(action.slice(4)) - 1];
      if (b) { b.focus({ preventScroll: true }); b.click(); }
      return true;
    }
    if (this.mode === 'target') {
      if (['left', 'right', 'up', 'down'].includes(action) && !this.group) {
        const d = action === 'left' || action === 'up' ? -1 : 1;
        this.focusIdx = (this.focusIdx + d + this.aimIds.length) % this.aimIds.length;
        this.deps.sfx('select');
        this.refreshTargets();
        return true;
      }
      if (action === 'confirm') { this.pick(this.group ? this.aimIds[0] : this.aimIds[this.focusIdx]); return true; }
      return false;
    }
    const buttons = this.mode === 'root' ? this.rootButtons : [this.dock.sub.querySelector('.bt-back'), ...this.subButtons];
    const cur = buttons.includes(document.activeElement) ? document.activeElement : null;
    if (['left', 'right', 'up', 'down'].includes(action)) {
      if (!cur) { (buttons.find(b => !b.classList.contains('off')) || buttons[0])?.focus({ preventScroll: true }); return true; }
      let n = nearest(buttons, cur, action);
      if (!n && this.mode === 'sub') {
        const i = buttons.indexOf(cur), d = action === 'up' || action === 'left' ? -1 : 1;
        n = buttons[clamp(i + d, 0, buttons.length - 1)];
      }
      if (n) { n.focus({ preventScroll: true }); n.scrollIntoView?.({ block: 'nearest' }); this.deps.sfx('select'); }
      return true;
    }
    if (action === 'confirm') {
      if (cur) cur.click();
      else (buttons.find(b => !b.classList.contains('off')) || buttons[0])?.focus({ preventScroll: true });
      return true;
    }
    return false;
  }
}

// ---- Analyze / inspect sheet -------------------------------------------------------------------------------

const KIND_NAME = { slash: 'Slash', pierce: 'Pierce', crush: 'Crush' };
function dmgChip(k) {
  const chip = el('span.bt-ins-chip');
  if (ASPECTS[k]) chip.append(pixelIcon(aspectIcon(k, { size: 12 }), 2));
  chip.append(el('span', { text: ASPECTS[k]?.name || KIND_NAME[k] || k }));
  return chip;
}

// info: inspect(state, id); extra: { portrait canvas, label, names(id), isHero }
export function inspectSheet(root, info, extra, { sfx, onRelic }) {
  return new Promise(resolve => {
    const close = el('button.btn', { type: 'button', text: 'Close' });
    const sec = (title, ...kids) => el('div.bt-ins-sec', null, el('h4', { text: title }), ...kids);
    const tierName = info.tier ? info.tier.replace('-', ' ') : 'hero';
    const hpPct = clamp(info.hp / info.maxHp, 0, 1) * 100;
    const head = el('div.bt-ins-head', null,
      extra.portrait ? el('div.bt-ins-pic', null, extra.portrait) : null,
      el('div.bt-ins-title', null,
        el('p.bt-ins-k', { text: `Level ${info.level} ${tierName}` }),
        el('h3', { text: extra.label || info.name }),
        el('span.bt-bar.hp.foe', { style: `--pct:${hpPct}%` }, el('i.lag'), el('i.fill')),
        el('p.bt-ins-stats', null,
          el('span', { text: `HP ${info.hp}/${info.maxHp}` }), el('span', { text: `Guard ${info.guard}` }),
          el('span', { text: `Armour ${info.armor || 'none'}` }),
          info.aspect ? el('span.asp', null, pixelIcon(aspectIcon(info.aspect, { size: 12 }), 1), el('span', { text: ASPECTS[info.aspect]?.name || info.aspect })) : null),
      ));
    const parts = [head];
    const chips = list => (list.length ? el('div.bt-ins-chips', null, ...list.map(dmgChip)) : el('p.bt-ins-none', { text: 'Nothing' }));
    parts.push(el('div.bt-ins-grid', null,
      sec('Weak to', chips(info.weakTo)),
      sec('Resists', chips(info.resists)),
      info.immune.length ? sec('Immune', chips(info.immune)) : null));
    if (info.grip.length) {
      parts.push(sec('Relics · grip', ...info.grip.map((g, i) => {
        const b = el('button.bt-ins-grip', { type: 'button' },
          pixelIcon(gripIcon({ size: 12, broken: !g.held }), 2),
          el('span.nm', { text: relicName({ relic: g.relic, item: g.name ? { name: g.name } : null }) }),
          el('span.bt-bar.grip', { style: `--pct:${g.max ? g.grip / g.max * 100 : 0}%` }, el('i.fill')),
          el('span.num', { text: g.held ? `${g.grip}/${g.max}` : 'loose' }));
        b.addEventListener('click', () => onRelic && onRelic(i));
        return b;
      }), el('p.bt-ins-note', { text: 'Crush damage and Disarm wear grip down. At 0 the relic drops and is yours at victory; kill the holder first and it shatters.' })));
    }
    if (info.side === 'foe') {
      const it = info.intent;
      const rows = [];
      if (it) rows.push(el('p.bt-ins-intent', null, el('b', { text: `d${it.die} ${it.face}` }), el('span', { text: ` ${it.name}${it.target && extra.names(it.target) && it.target !== info.id ? ` at ${extra.names(it.target)}` : ''}${it.charging ? ', charging' : ''}${it.cancelled ? ' (broken off)' : ''}` })));
      if (info.analyzed && info.queue.length) rows.push(...info.queue.map((q, i) => el('p.bt-ins-intent.next', null, el('b', { text: `then ${q.face}` }), el('span', { text: ` ${q.name}` }), el('small', { text: i === 0 ? ' (foreseen)' : '' }))));
      else rows.push(el('p.bt-ins-note', { text: 'Analyze foresees its next move.' }));
      parts.push(sec('Intent', ...rows));
    }
    if (info.statuses.length) {
      parts.push(sec('Statuses', ...info.statuses.map(s => el('p.bt-ins-st', null, pixelIcon(statusIcon(s.id, { size: 12 }), 2),
        el('span', null, el('b', { text: `${STATUSES[s.id]?.name || s.id}${s.stacks > 1 ? ` x${s.stacks}` : ''}` }), el('small', { text: ` ${s.turns ? `${s.turns} turn${s.turns === 1 ? '' : 's'}. ` : ''}${STATUSES[s.id]?.text || ''}` }))))));
    }
    if (info.omens.length) {
      parts.push(sec('Omens', ...info.omens.map(o => el('p.bt-ins-omen', { style: `--oc:${OMENS[o]?.color || '#b9a6ff'}` }, el('b', { text: OMENS[o]?.name || o }), el('small', { text: ` ${OMENS[o]?.text || ''}` })))));
    }
    const panel = el('div.bt-inspect', { role: 'dialog', 'aria-modal': 'true', 'aria-label': `Analyze ${extra.label || info.name}` }, el('div.bt-ins-body', null, ...parts), el('div.bt-ins-foot', null, close));
    const modal = el('div.bt-modal.sheet', null, panel);
    const done = () => { modal.remove(); document.removeEventListener('keydown', onKey, true); sfx('back'); resolve(); };
    const onKey = e => { if (['Escape', 'x', 'X', 'Backspace'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); done(); } };
    close.addEventListener('click', done);
    modal.addEventListener('click', e => { if (e.target === modal) done(); });
    document.addEventListener('keydown', onKey, true);
    root.append(modal);
    requestAnimationFrame(() => panel.classList.add('in'));
    close.focus({ preventScroll: true });
  });
}
