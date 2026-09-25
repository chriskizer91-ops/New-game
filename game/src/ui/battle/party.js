// The party row: one pixel canvas with the four heroes in the pose of the moment, and a card
// per hero (a real button, for ally targeting) with HP, MP, the Legend Surge gauge and statuses.
import { HeroSprite, heroGear, heroCustom } from './sprites.js';
import { el, clamp } from './util.js';
import { statusChip } from './hud.js';

const STRIP_H = 54; // logical px
const FEET = 51;

export class Party {
  constructor(host, heroes, { game, reduced, onTap }) {
    this.host = host;
    this.reduced = reduced;
    this.speed = 1;
    this.ids = heroes.map(h => h.id);
    this.v = new Map();
    this.canvas = el('canvas.bt-party-cv.px', { 'aria-hidden': 'true' });
    this.row = el('div.bt-heroes');
    host.append(this.canvas, this.row);
    this.floor = document.createElement('canvas');
    for (const h of heroes) {
      const sprite = new HeroSprite(h.heroId || h.id, heroGear(game, h.heroId || h.id), heroCustom(game, h.heroId || h.id), reduced);
      const card = el('button.bt-hero', { type: 'button', 'data-id': h.id });
      const name = el('span.bt-hero-name', { text: h.label || h.name });
      const hpCur = el('b');
      const hpMax = el('span.max');
      const hpNum = el('span.bt-num.hp', null, hpCur, hpMax);
      const hp = el('span.bt-bar.hp', null, el('i.lag'), el('i.fill'));
      const mpNum = el('span.bt-num.mp');
      const mp = el('span.bt-bar.mp', null, el('i.fill'));
      const surge = el('span.bt-surge', { title: 'Legend Surge' }, el('i.fill'));
      const st = el('span.bt-hero-st');
      const tag = el('span.bt-hero-tag');
      card.append(
        el('span.bt-hero-space', null, st, tag),
        el('span.bt-hero-info', null,
          el('span.bt-hero-line', null, name),
          el('span.bt-hero-line.sub', null, hp, hpNum),
          el('span.bt-hero-line.sub', null, mp, mpNum),
          surge),
      );
      card.addEventListener('click', () => onTap && onTap(h.id));
      this.row.append(card);
      this.v.set(h.id, {
        id: h.id, sprite, card, hp, hpCur, hpMax, mp, mpNum, surge, st, tag, name,
        pose: h.ko ? 'ko' : 'idle', base: h.ko ? 'ko' : 'idle', poseUntil: 0, hopAt: 0, hopDur: 0,
        shakeUntil: 0, tint: null, flashUntil: 0, attackAt: 0, statusKey: '',
      });
    }
    this.s = 2;
    this.lw = 200;
    this.actorId = null;
  }

  layout() {
    const r = this.host.getBoundingClientRect();
    const cssW = Math.max(200, Math.round(r.width));
    const colW = cssW / this.ids.length;
    this.s = colW >= 150 ? 3 : 2;
    const s = this.s;
    this.lw = Math.ceil(cssW / s);
    this.lh = STRIP_H;
    this.canvas.width = this.lw;
    this.canvas.height = this.lh;
    Object.assign(this.canvas.style, { width: `${this.lw * s}px`, height: `${this.lh * s}px`, left: `${Math.floor((cssW - this.lw * s) / 2)}px` });
    this.host.style.setProperty('--strip-h', `${this.lh * s}px`);
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.paintFloor();
  }

  // a dithered hearth-lit floor band under the party
  paintFloor() {
    const w = this.lw, h = this.lh, c = this.floor;
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const top = FEET - 5;
    for (let y = top; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = Math.abs(x - w / 2) / (w / 2);
        const b = ((x * 3 + y * 5) % 4) / 4;
        const lit = 0.55 - d * 0.35 + (y - top) * -0.02 + b * 0.12;
        g.fillStyle = lit > 0.5 ? '#3a2a1f' : lit > 0.35 ? '#2b1f18' : '#1e1612';
        g.fillRect(x, y, 1, 1);
      }
    }
    g.fillStyle = '#5a4838';
    g.fillRect(0, top, w, 1);
    g.fillStyle = 'rgba(238,142,49,0.10)';
    g.fillRect(0, top + 1, w, 1);
  }

  colX(i) { return (i + 0.5) * this.lw / this.ids.length; }

  // centre of a hero's figure in CSS px relative to the party host
  geom(id) {
    const i = this.ids.indexOf(id);
    if (i < 0) return null;
    const r = this.canvas.getBoundingClientRect(), hr = this.host.getBoundingClientRect();
    const s = this.s;
    return { cx: r.left - hr.left + this.colX(i) * s, cy: r.top - hr.top + (FEET - 22) * s, top: r.top - hr.top + (FEET - 44) * s, s };
  }

  // ---- display -----------------------------------------------------------------------------------
  update(u) {
    const v = this.v.get(u.id);
    if (!v) return;
    const hpPct = clamp(u.hp / u.maxHp, 0, 1) * 100;
    v.hp.style.setProperty('--pct', `${hpPct}%`);
    v.hp.classList.toggle('low', hpPct <= 30);
    v.hpCur.textContent = `${u.hp}`;
    v.hpMax.textContent = `/${u.maxHp}`;
    v.mp.style.setProperty('--pct', `${clamp(u.mp / Math.max(1, u.maxMp), 0, 1) * 100}%`);
    v.mpNum.textContent = `${u.mp}`;
    v.surge.style.setProperty('--pct', `${clamp(u.surge, 0, 100)}%`);
    v.surge.classList.toggle('full', u.surge >= 100);
    v.card.classList.toggle('ko', !!u.ko);
    v.card.classList.toggle('surge-ready', u.surge >= 100 && !u.ko);
    v.tag.textContent = u.ko ? 'KO' : '';
    v.card.setAttribute('aria-label', `${u.name}: ${u.ko ? 'knocked out' : `HP ${u.hp} of ${u.maxHp}, MP ${u.mp} of ${u.maxMp}`}, Legend Surge ${Math.round(u.surge)}%${u.statuses.length ? ', ' + u.statuses.map(s => s.id).join(', ') : ''}`);
    const key = u.statuses.map(s => `${s.id}${s.stacks}`).join(',');
    if (key !== v.statusKey) {
      const before = new Set(v.statusKey.split(',').map(k => k.replace(/\d+$/, '')));
      v.statusKey = key;
      v.st.replaceChildren(...u.statuses.slice(0, 4).map(s => statusChip(s, 2, !before.has(s.id))));
    }
    const guarding = u.statuses.some(s => s.id === 'guarding');
    const base = u.ko ? 'ko' : guarding ? 'guard' : 'idle';
    if (v.base !== base) { v.base = base; if (!v.poseUntil) v.pose = base; }
  }
  setActor(id) {
    this.actorId = id;
    for (const v of this.v.values()) v.card.classList.toggle('active', v.id === id);
  }
  setTargets(ids, focusId) {
    for (const v of this.v.values()) {
      v.card.classList.toggle('valid', ids.includes(v.id));
      v.card.classList.toggle('focus', v.id === focusId);
    }
  }

  // ---- animation hooks ------------------------------------------------------------------------------
  now() { return performance.now(); }
  attack(id, ms = 520) {
    const v = this.v.get(id);
    if (!v) return;
    v.pose = 'attack'; v.attackAt = this.now(); v.poseUntil = v.attackAt + ms / this.speed;
    v.hopAt = v.attackAt; v.hopDur = ms / this.speed;
  }
  cast(id, ms = 600) {
    const v = this.v.get(id);
    if (!v) return;
    v.pose = 'cast'; v.poseUntil = this.now() + ms / this.speed;
    v.hopAt = this.now(); v.hopDur = ms / this.speed;
  }
  hurt(id, big = false) {
    const v = this.v.get(id);
    if (!v) return;
    const t = this.now();
    v.pose = 'hurt'; v.poseUntil = t + (big ? 520 : 400) / this.speed;
    if (!this.reduced) { v.shakeUntil = t + 260 / this.speed; v.tint = [255, 70, 50, 0.45]; v.flashUntil = t + 120 / this.speed; }
    v.card.classList.remove('hit'); void v.card.offsetWidth; v.card.classList.add('hit');
  }
  flashColor(id, tint, ms = 200) {
    const v = this.v.get(id);
    if (!v || this.reduced) return;
    v.tint = tint; v.flashUntil = this.now() + ms / this.speed;
  }
  busy(t) {
    for (const v of this.v.values()) if ((v.poseUntil && t < v.poseUntil) || t < v.shakeUntil || t < v.flashUntil) return true;
    return false;
  }

  draw(t, clockT) {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.lw, this.lh);
    ctx.drawImage(this.floor, 0, 0);
    this.ids.forEach((id, i) => {
      const v = this.v.get(id);
      if (v.poseUntil && t >= v.poseUntil) { v.pose = v.base; v.poseUntil = 0; }
      if (v.flashUntil && t >= v.flashUntil) { v.tint = null; v.flashUntil = 0; }
      let pose = v.pose, at = clockT;
      if (pose === 'attack') at = (t - v.attackAt) / Math.max(1, v.poseUntil - v.attackAt) < 0.42 ? 0.1 : 0.6;
      const cx = Math.round(this.colX(i));
      let dx = 0, dy = 0;
      if (t < v.shakeUntil) dx = (Math.floor(t / 40) % 2 ? 1 : -1) * 2;
      if (v.hopAt && t < v.hopAt + v.hopDur) {
        const u = (t - v.hopAt) / v.hopDur;
        dy = -Math.round(Math.sin(Math.min(1, u * 1.4) * Math.PI) * 4);
      }
      // the active hero stands on an ember ring
      if (id === this.actorId && pose !== 'ko') {
        const pulse = this.reduced ? 0 : Math.floor(clockT * 3) % 2;
        ctx.fillStyle = pulse ? '#ffcb66' : '#ee8e31';
        for (let k = -12; k <= 12; k++) {
          const yy = Math.round(Math.sqrt(Math.max(0, 1 - (k / 12.5) ** 2)) * 3);
          ctx.fillRect(cx + k, FEET + yy, 1, 1);
          if (Math.abs(k) < 9) ctx.fillRect(cx + k, FEET - yy - 1, 1, 1);
        }
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(cx - 10, FEET - 1, 20, 2);
      }
      const frame = v.sprite.frame(pose, at, v.tint);
      ctx.drawImage(frame, cx - v.sprite.foot[0] + dx, FEET - v.sprite.foot[1] + dy);
    });
  }
}
