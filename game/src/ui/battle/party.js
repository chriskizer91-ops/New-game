// The party row: one pixel canvas with the four heroes in the pose of the moment, and a card
// per hero (a real button, for ally targeting) with HP, MP, the Legend Surge gauge and statuses.
// M5 (spec §5): a held hero (swallowed) is out of the line: its figure leaves the row (a hole where it
// stood) and its card shows how it is held ("Held under", "Carried off"), by whom and the turns left
// (.bt-hero.held, .bt-hero-hold). A charmed hero's card says "Charmed" (.bt-hero.charmed).
// M6 (spec §4.2, §5): a hexed or rotting hero's card says so ("Hexed", "Rotting": .bt-hero.hexed, .rotting),
// and the new holds leave their own marks where the hero stood: "Led away" (the Lantern Mother: black water, and
// a lamp going away over it), "In the river" (Hodge's shove: ripples), "Swallowed whole" (the Leviathan: bubbles).
import { HeroSprite, heroGear, heroCustom } from './sprites.js';
import { el, clamp } from './util.js';
import { statusChip } from './hud.js';
import { holdInfo, isCharmed, afflictions, rotStacks } from './model.js';

const STRIP_H = 54; // logical px
const FEET = 51;
const OUT_MS = 360; // a held hero's figure fades out of the row (and back in) over this long
const shortFoe = n => String(n || '').replace(/^The /, '');
// How a hold's hole looks, by its label: the rim, open air (no pit) and what moves over it
const HOLE_LOOK = [
  [/carried/i, { rim: '#e8e0c8', air: true, over: 'feathers' }], // M5: the Thunder-Roc
  [/under/i, { rim: '#8fd3f4' }], // M5: held under the ice
  [/led/i, { rim: '#5f8a76', water: true, over: 'lamp' }], // M6: the Lantern Mother leads one away under the water
  [/river/i, { rim: '#9ab8c8', water: true, over: 'ripples' }], // M6: shoved off Rotbridge
  [/whole/i, { rim: '#4f8a78', water: true, over: 'bubbles' }], // M6: the Blackwater Leviathan
];
const HOLE_PLAIN = { rim: '#c9b8a0' };
const holeLook = how => (HOLE_LOOK.find(([re]) => re.test(how)) || [null, HOLE_PLAIN])[1];

export class Party {
  constructor(host, heroes, { game, reduced, onTap, nameOf = () => '' }) {
    this.host = host;
    this.reduced = reduced;
    this.nameOf = nameOf;
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
      const holdK = el('b.bt-hold-k'), holdBy = el('span.bt-hold-by'), holdT = el('span.bt-hold-t');
      const hold = el('span.bt-hero-hold', { hidden: true }, holdK, holdBy, holdT);
      card.append(
        el('span.bt-hero-space', null, st, tag, hold),
        el('span.bt-hero-info', null,
          el('span.bt-hero-line', null, name),
          el('span.bt-hero-line.sub', null, hp, hpNum),
          el('span.bt-hero-line.sub', null, mp, mpNum),
          surge),
      );
      card.addEventListener('click', () => onTap && onTap(h.id));
      this.row.append(card);
      this.v.set(h.id, {
        id: h.id, sprite, card, hp, hpCur, hpMax, mp, mpNum, surge, st, tag, name, hold, holdK, holdBy, holdT,
        pose: h.ko ? 'ko' : 'idle', base: h.ko ? 'ko' : 'idle', poseUntil: 0, hopAt: 0, hopDur: 0,
        shakeUntil: 0, tint: null, flashUntil: 0, attackAt: 0, statusKey: '', tagKey: '', out: false, outAt: 0,
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
    // M5: held out of the line, or charmed
    const held = u.ko ? null : holdInfo(u, id => shortFoe(this.nameOf(id)));
    const charmed = !u.ko && isCharmed(u);
    v.card.classList.toggle('held', !!held);
    v.card.classList.toggle('charmed', charmed);
    v.hold.hidden = !held;
    if (held) {
      v.holdK.textContent = held.label;
      v.holdBy.textContent = held.by ? `by ${held.by}` : '';
      v.holdT.textContent = held.turns ? `${held.turns} ${held.turns === 1 ? 'turn' : 'turns'} left` : '';
      v.card.dataset.hold = held.label;
    } else delete v.card.dataset.hold;
    if (!!held !== v.out) { v.out = !!held; v.outAt = this.now(); }
    // the tag over the figure: KO; else Charmed (M5), Hexed and Rotting (M6), one word a line
    const words = u.ko ? [['ko', 'KO']] : [charmed ? ['charmed', 'Charmed'] : null, ...afflictions(u).map(w => [w.toLowerCase(), w])].filter(Boolean);
    const tagKey = words.map(w => w[1]).join('|');
    if (tagKey !== v.tagKey) { v.tagKey = tagKey; v.tag.replaceChildren(...words.map(([k, w]) => el('b.bt-tag-w', { 'data-k': k, text: w }))); }
    v.card.classList.toggle('hexed', !u.ko && words.some(w => w[0] === 'hexed'));
    v.card.classList.toggle('rotting', !u.ko && words.some(w => w[0] === 'rotting'));
    const fen = u.ko ? [] : afflictions(u), rot = rotStacks(u);
    const fenText = fen.map(w => (w === 'Hexed' ? 'hexed: its rolls at a disadvantage' : `rotting${rot > 1 ? ` x${rot}` : ''}: heals halved`)).map(t => `, ${t}`).join('');
    v.card.setAttribute('aria-label', `${u.name}: ${u.ko ? 'knocked out' : `HP ${u.hp} of ${u.maxHp}, MP ${u.mp} of ${u.maxMp}`}${held ? `, ${held.text}: out of the line` : ''}${charmed ? ', charmed: its next turn is an attack on a friend' : ''}${fenText}, Legend Surge ${Math.round(u.surge)}%${u.statuses.length ? ', ' + u.statuses.map(s => s.id).join(', ') : ''}`);
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
    for (const v of this.v.values()) if ((v.poseUntil && t < v.poseUntil) || t < v.shakeUntil || t < v.flashUntil || (v.outAt && t < v.outAt + OUT_MS / this.speed)) return true;
    return false;
  }
  // how far a hero's figure has left the row: 0 in the line, 1 gone (held)
  outOf(v, t) {
    if (!v.outAt) return v.out ? 1 : 0;
    const u = this.reduced ? 1 : clamp((t - v.outAt) / (OUT_MS / this.speed), 0, 1);
    return v.out ? u : 1 - u;
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
      // M5: a held hero is out of the line: its figure sinks away and a hole marks where it stood
      const out = this.outOf(v, t);
      if (out > 0) this.hole(ctx, cx, out, clockT, v.card.dataset.hold || '');
      if (out >= 1) return;
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
      if (out > 0) {
        // going (or coming back): the figure drops below the floor line as it fades
        ctx.globalAlpha = 1 - out;
        const y0 = FEET - v.sprite.foot[1] + dy + Math.round(out * 14);
        const h = Math.max(0, Math.min(frame.height, FEET + 1 - y0));
        if (h > 0) ctx.drawImage(frame, 0, 0, frame.width, h, cx - v.sprite.foot[0] + dx, y0, frame.width, h);
        ctx.globalAlpha = 1;
        return;
      }
      ctx.drawImage(frame, cx - v.sprite.foot[0] + dx, FEET - v.sprite.foot[1] + dy);
    });
  }

  // where a held hero stood: a dark hole with a pale rim (ice for "Held under"; open air, a scatter of
  // feathers, for "Carried off"; M6: black water for "Led away", with a lamp going away over it, ripples for
  // "In the river", bubbles for "Swallowed whole"), swelling in as the figure goes
  hole(ctx, cx, k, clockT, how) {
    const rw = Math.max(2, Math.round(11 * k));
    const L = holeLook(how);
    for (let x = -rw; x <= rw; x++) {
      const yy = Math.round(Math.sqrt(Math.max(0, 1 - (x / (rw + 0.5)) ** 2)) * 2);
      ctx.fillStyle = L.air ? 'rgba(0,0,0,0.25)' : L.water ? '#081410' : '#0b0910';
      ctx.fillRect(cx + x, FEET - yy, 1, yy * 2 + 1);
      ctx.fillStyle = L.rim;
      ctx.fillRect(cx + x, FEET + yy, 1, 1);
      if (Math.abs(x) < rw - 2) ctx.fillRect(cx + x, FEET - yy - 1, 1, 1);
    }
    if (k < 1) return;
    const ph = this.reduced ? 0 : clockT;
    if (L.over === 'feathers') {
      // a few feathers drifting down where it was taken
      ctx.fillStyle = L.rim;
      for (let i = 0; i < 3; i++) {
        const fy = FEET - 30 + Math.round((((ph * 0.9) + i * 0.37) % 1) * 26), fx = cx - 6 + i * 6 + Math.round(Math.sin(ph * 2.7 + i) * 2);
        ctx.fillRect(fx, fy, 2, 1);
      }
    } else if (L.over === 'lamp') {
      // a small light over the water, going away and coming round again: the lantern the hero followed
      const u = this.reduced ? 0.4 : (ph * 0.35) % 1, lx = cx - 4 + Math.round(u * 12), ly = FEET - 8 - Math.round(u * 18);
      ctx.globalAlpha = 1 - u * 0.8;
      ctx.fillStyle = '#ffcb66'; ctx.fillRect(lx, ly, 2, 2);
      ctx.fillStyle = 'rgba(255, 203, 102, 0.35)'; ctx.fillRect(lx - 1, ly - 1, 4, 4);
      ctx.globalAlpha = 1;
    } else if (L.over === 'ripples') {
      // rings going out over the river where the hero went in
      for (let i = 0; i < 2; i++) {
        const u = this.reduced ? 0.5 + i * 0.3 : ((ph * 0.8) + i * 0.5) % 1, r = Math.round(3 + u * (rw + 3));
        ctx.globalAlpha = 1 - u;
        ctx.fillStyle = L.rim;
        ctx.fillRect(cx - r, FEET, 2, 1); ctx.fillRect(cx + r - 1, FEET, 2, 1);
      }
      ctx.globalAlpha = 1;
    } else if (L.over === 'bubbles') {
      // bubbles coming up from whatever took the hero down
      ctx.fillStyle = '#b8e8d8';
      for (let i = 0; i < 3; i++) {
        const u = this.reduced ? 0.3 * i : ((ph * 1.1) + i * 0.33) % 1;
        ctx.fillRect(cx - 5 + i * 5 + Math.round(Math.sin(ph * 4 + i) * 1), FEET - 2 - Math.round(u * 16), 1, 1);
      }
    }
  }
}
