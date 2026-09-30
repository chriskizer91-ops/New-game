// The event player: animates an engine event list one event at a time (timings scale with the
// battle speed; a tap fast-forwards), mutating the display model as it goes. The caller renders
// the engine's returned state afterwards.
// M5 (spec §4.2, §5): a hold (swallowed) takes the hero out of the line with its label ("Held under"),
// a release or the turns running out brings it back; a burrowed foe sinks into the floor and comes up
// at its turn; a charmed hero's turn (a `move` with `charm`) flashes pink and turns on a friend.
// M6 (spec §4.2, §5): a heal halved by rot says so; a hexed unit's roll says why it has disadvantage; the
// Blackwater Leviathan dives into the water (not under the floor); a `ko` that carries its own words (Hodge
// sitting down on his stool) shows them.
import { SKILLS } from '../../data/skills.js';
import { RELICS } from '../../data/relics.js';
import { STATUSES } from '../../data/statuses.js';
import { applyStatus, addUnitFrom, pieceIndex, relicLabel, statusName, harmful, moveTargetKind, withStatusSource, isHexed, divesUnderWater, holdPhrase } from './model.js';
import { logLine } from './log.js';
import { legendSlam } from './slam.js';
import { aspectColor } from './stage.js';

const EFF_LABEL = { weak: { label: 'Weak!', cls: 'weak' }, resist: { label: 'Resisted', cls: 'resist' }, immune: { label: 'Immune', cls: 'immune' } };
const STATUS_COLOR = { burning: '#ff9a3c', poisoned: '#8ad872', bleeding: '#ee6c54', regenerating: '#8ad872', chilled: '#8fd3f4', frozen: '#8fd3f4', rotting: '#a8c860', hexed: '#c89aff' };

export class Player {
  constructor(S) {
    this.S = S;
  }

  get disp() { return this.S.disp; }
  wait(ms) { return this.S.clock.wait(ms); }
  U(id) { return this.disp.units[id]; }
  name(id) { const u = this.U(id); return u ? u.label : ''; }
  isHero(id) { return this.U(id)?.side === 'hero'; }

  // ---- entry ---------------------------------------------------------------------------------------
  async play(events, next) {
    const S = this.S;
    this.next = next;
    this.lastAttack = null;
    this.disarmText = null;
    S.clock.unskip();
    S.setPlaying(true);
    try {
      for (let i = 0; i < events.length; i++) {
        const ev = withStatusSource(events[i], next);
        if (ev.t === 'intent' && !ev.queued) {
          // consecutive intents roll together
          const batch = [ev];
          while (events[i + 1] && events[i + 1].t === 'intent' && !events[i + 1].queued) batch.push(events[++i]);
          await this.intents(batch);
          continue;
        }
        const line = logLine(ev, this.disp);
        if (line && !(ev.t === 'text' && this.disarmText && ev.text.startsWith(this.disarmText))) S.log(line);
        const h = this[`on_${ev.t}`];
        this.peaked = false;
        if (h) await h.call(this, ev);
        if (!this.peaked) await this.peak(ev);
      }
    } finally {
      S.tray.hide();
      S.setPlaying(false);
      S.clock.unskip();
    }
  }

  // ---- helpers -----------------------------------------------------------------------------------------
  // dev/e2e hook: lets the harness pause on the best-looking moment of an event
  async peak(ev) {
    this.peaked = true;
    const h = this.S.hooks;
    if (h && h.peak) await h.peak(ev);
  }
  refresh(id) { this.S.refreshUnit(id); }
  float(id, text, cls = '', sub = '', dur = 1100) {
    const S = this.S;
    if (this.isHero(id)) {
      const g = S.party.geom(id);
      if (g) S.hud.float(S.partyHost, g.cx, g.cy - 6, text, cls, sub, dur / Math.max(1, S.clock.speed * 0.6), id);
    } else {
      const g = S.stage.geom(id);
      if (g) S.hud.float(S.hud.fx, g.cx, g.top + (g.bottom - g.top) * 0.42, text, cls, sub, dur / Math.max(1, S.clock.speed * 0.6), id);
    }
  }
  heroWeaponClass(u) {
    const k = u?.weaponItem?.kind;
    return k === 'bow' ? 'arrow' : k === 'staff' ? 'bolt' : 'melee';
  }
  // projectile start x on the stage (logical px), from the hero's column
  heroX(id) {
    const S = this.S;
    const g = S.party.geom(id);
    if (!g) return S.stage.lw / 2;
    const pr = S.partyHost.getBoundingClientRect(), sr = S.stageHost.getBoundingClientRect();
    return (pr.left + g.cx - sr.left - S.stage.ox) / S.stage.s;
  }

  // ---- handlers ----------------------------------------------------------------------------------------
  async on_turn(ev) {
    const S = this.S;
    this.disp.actor = ev.actor;
    S.setActor(ev.actor);
    S.ribbonAdvance(ev.actor);
    const u = this.U(ev.actor);
    S.caption(u?.side === 'foe' && u.intent ? `${u.intent.name}${u.intent.charging ? ', charging' : ''}` : '', 'turn');
    await this.wait(140);
  }

  async intents(batch) {
    const S = this.S;
    let any = false;
    for (const ev of batch) {
      const u = this.U(ev.foe);
      if (!u) continue;
      const line = logLine(ev, this.disp);
      if (line) S.log(line);
      u.intent = { die: ev.die, face: ev.face, move: ev.move, name: ev.name, text: ev.text, target: ev.target, charging: ev.charging };
      if (u.ko || u.gone) continue;
      S.hud.tumbleIntent(u, u.intent, 560 / S.clock.speed, S.reduced || S.clock.skipping);
      if (ev.face != null) any = true; // an opener is not rolled: no dice sound for it
    }
    if (any) { S.sfx('dice'); await this.wait(600); }
    for (const ev of batch) await this.peak(ev);
  }

  async on_intent(ev) { // queued (Analyze foresight)
    const u = this.U(ev.foe);
    if (!u) return;
    u.analyzed = true;
    u.queue = [...(u.queue || []), { die: ev.die, face: ev.face, move: ev.move, name: ev.name, text: ev.text, target: ev.target }];
    this.refresh(ev.foe);
    this.float(ev.foe, `Foreseen: ${ev.name}`, 'info', '', 1300);
    this.S.sfx('status');
    await this.wait(700);
  }

  async on_move(ev) {
    const S = this.S, u = this.U(ev.actor);
    if (!u) return;
    if (ev.mp) { u.mp = Math.max(0, u.mp - ev.mp); this.refresh(u.id); }
    if (ev.charm) {
      // M5: a charmed hero's turn, played by the engine: it turns on a friend (the roll and blow follow)
      S.moveBanner(ev.name || 'Charmed', 'charm', ev.target ? `turns on ${this.name(ev.target)}` : '');
      if (u.side === 'hero') S.party.flashColor(u.id, [255, 130, 200, 0.55], 420);
      else S.stage.flashUnit?.(u.id, [255, 130, 200, 0.55], 420);
      S.caption(ev.text || `${u.label} is charmed!`, 'charm');
      S.sfx('status');
      await this.wait(640);
      return;
    }
    S.moveBanner(ev.name, u.side);
    if (u.side === 'foe') {
      S.stage.attack(u.id, 620);
      S.caption(ev.text || ev.name, 'move');
    } else {
      const sk = ev.skill && SKILLS[ev.skill];
      const weaponAttack = sk && sk.effects.some(e => e.type === 'attack' && e.weapon);
      if (!weaponAttack) S.party.cast(u.id, 700);
      S.caption(ev.text || ev.name, 'move');
    }
    await this.wait(u.side === 'foe' ? 560 : 520);
  }

  async on_roll(ev) {
    const S = this.S;
    const actor = this.U(ev.actor);
    await S.tray.roll(ev, { clock: S.clock, reduced: S.reduced, sfx: S.sfx, names: id => this.name(id), hexed: isHexed(actor) });
    if (ev.purpose !== 'attack') return;
    this.lastAttack = ev;
    if (actor?.side === 'hero') {
      S.party.attack(actor.id, 460);
      const cls = this.heroWeaponClass(actor);
      if (cls !== 'melee' && ev.target && !this.isHero(ev.target)) {
        S.stage.projectile(this.heroX(actor.id), ev.target, cls === 'arrow' ? 'arrow' : 'bolt', cls === 'arrow' ? '#e8d6a8' : aspectColor(actor.weaponItem?.aspect || 'radiant'));
      }
      await this.wait(ev.result === 'miss' || ev.result === 'fumble' ? 220 : 240);
    }
    if (ev.result === 'miss' || ev.result === 'fumble') {
      if (ev.target) this.float(ev.target, ev.result === 'fumble' ? 'Fumble' : 'Miss', 'miss', '', 900);
      await this.wait(320);
    }
  }

  async on_damage(ev) {
    const S = this.S, t = this.U(ev.target);
    if (!t) return;
    t.hp = ev.hp ?? Math.max(0, t.hp - ev.amount);
    const eff = EFF_LABEL[ev.eff];
    const tick = !ev.actor;
    S.tray.damage(ev, { eff });
    const big = ev.crit || ev.amount >= t.maxHp * 0.25;
    if (t.side === 'foe') {
      if (ev.amount > 0) S.stage.hurt(t.id, { big });
      const col = ev.aspect ? aspectColor(ev.aspect) : '#fff4c0';
      if (!tick) {
        if (this.lastAttack && this.heroWeaponClass(this.U(this.lastAttack.actor)) === 'melee' && this.isHero(this.lastAttack.actor)) S.stage.slash(t.id, col, ev.crit);
        const [x, y] = S.stage.point(t.id, 'center');
        S.stage.sparks(x, y, col, ev.crit ? 22 : 12);
      }
    } else if (ev.amount > 0) {
      S.party.hurt(t.id, big);
    }
    if (ev.crit && !S.reduced && !tick) S.shake(1);
    const txt = ev.amount === 0 && ev.eff === 'immune' ? '0' : `${ev.amount}`;
    const cls = ['dmg', ev.crit ? 'crit' : '', ev.graze ? 'graze' : '', eff ? eff.cls : '', tick ? 'tick' : '', t.side].filter(Boolean).join(' ');
    const sub = tick ? '' : [eff?.label, ev.graze ? 'graze' : '', ev.absorbed ? `warded ${ev.absorbed}` : ''].filter(Boolean).join(' · ');
    this.float(t.id, txt, cls, sub, ev.crit ? 1400 : 1100);
    S.sfx(tick ? 'status' : ev.crit ? 'hit' : ev.graze ? 'graze' : 'hit');
    this.refresh(t.id);
    await this.wait(tick ? 140 : 180);
    await this.peak(ev);
    await this.wait(tick ? 280 : 380);
  }

  async on_heal(ev) {
    const S = this.S, t = this.U(ev.target);
    if (!t) return;
    t.hp = ev.hp ?? Math.min(t.maxHp, t.hp + ev.amount);
    if (this.revived === ev.target) { this.revived = null; this.refresh(t.id); return; }
    if (!ev.amount) return;
    this.float(t.id, `+${ev.amount}`, ev.rot ? 'heal rot' : 'heal', ev.rot ? 'halved by rot' : '');
    if (t.side === 'hero') S.party.flashColor(t.id, [140, 255, 150, 0.35], 260);
    S.sfx('heal');
    this.refresh(t.id);
    // the harness pauses while the number (and a rot's "halved by rot") is still up, as on a hit
    await this.wait(140);
    await this.peak(ev);
    await this.wait(280);
  }

  async on_status(ev) {
    const S = this.S, t = this.U(ev.target);
    if (!t) return;
    const def = STATUSES[ev.status] || {};
    applyStatus(t, ev);
    this.refresh(t.id);
    // M5: a hold takes a hero out of the line, and brings it back; a dive takes a foe under the floor
    if (def.held && ev.op === 'add') {
      const label = ev.label || statusName(ev.status);
      this.float(t.id, label, 'status bad held', ev.source ? `by ${this.name(ev.source)}` : '', 1300);
      S.sfx('status');
      S.caption(`${t.label} is ${holdPhrase(label, ev.source ? this.name(ev.source) : '')}!`, 'held');
      await this.wait(620);
      return;
    }
    if (def.held && (ev.op === 'release' || ev.op === 'remove')) {
      this.float(t.id, 'Free!', 'status good', '', 1100);
      S.party.flashColor(t.id, [200, 240, 255, 0.5], 360);
      S.sfx('heal');
      await this.wait(420);
      return;
    }
    if (def.untargetable && t.side === 'foe' && (ev.op === 'add' || ev.op === 'remove')) {
      const down = ev.op === 'add', water = divesUnderWater(t);
      S.stage.sink(t.id, down, { water });
      const [x, y] = S.stage.point(t.id, 'feet');
      S.stage.sparks(x, y, water ? '#b8e8e0' : '#c9a878', down ? 14 : 18, { spread: 1.4, up: water ? 1.1 : 0.6 });
      if (down) this.float(t.id, water ? 'Dived' : statusName(ev.status), 'status good', 'cannot be targeted', 1200);
      S.sfx(down ? 'miss' : 'hit');
      if (!down) S.shake(1);
      await this.wait(down ? 520 : 380);
      return;
    }
    if (ev.op === 'add') {
      // a hero's Charmed, Hexed or Rotting shows as the tag over its figure, which pops in (a float would cover it)
      if (!(this.isHero(t.id) && S.party.popTag(t.id, ev.status))) this.float(t.id, statusName(ev.status), `status ${harmful(ev.status) ? 'bad' : 'good'}`, ev.stacks > 1 ? `x${ev.stacks}` : '', 1000);
      S.sfx('status');
      await this.wait(300);
    } else if (ev.op === 'release') {
      // a charm broken by a friend's blow (the engine's text line says so)
      this.float(t.id, `${statusName(ev.status)} ends`, 'status good', '', 900);
      await this.wait(200);
    } else if (ev.op === 'trigger') {
      // a held hero's lost turn reads by its hold; a charm's trigger is followed by its own move line
      if (def.charm) { await this.wait(60); return; }
      const held = def.held ? (t.statuses.find(s => s.id === ev.status)?.label || statusName(ev.status)) : statusName(ev.status);
      this.float(t.id, held, 'status bad', '', 1000);
      await this.wait(320);
    } else if (ev.op === 'tick') {
      S.pulseStatus(t.id, ev.status, STATUS_COLOR[ev.status]);
      await this.wait(120);
    } else {
      await this.wait(90);
    }
  }

  async on_grip(ev) {
    const S = this.S, t = this.U(ev.target);
    if (!t) return;
    const i = pieceIndex(t, ev.relic);
    if (i >= 0) t.held[i] = { ...t.held[i], grip: ev.to, max: ev.max };
    this.refresh(t.id);
    S.gripHit(t.id, i, ev.from - ev.to);
    await this.wait(380);
  }

  async on_disarm(ev) {
    const S = this.S, t = this.U(ev.target);
    if (!t) return;
    const i = pieceIndex(t, ev.relic);
    const piece = i >= 0 ? t.held[i] : null;
    if (piece) t.held[i] = { ...piece, held: false, grip: 0 };
    const name = relicLabel(ev.relic, t);
    this.disarmText = null;
    S.sfx('disarm');
    S.stage.relicFly(t.id, ev.relic, piece?.item || null);
    const [x, y] = S.stage.point(t.id, 'relic');
    S.stage.sparks(x, y, '#ffe08a', 26, { spread: 1.3 });
    S.stage.flash('#fff4d8', 240, 0.55);
    S.shake(2);
    S.stage.setLook(t.id, t);
    S.stage.hurt(t.id, { big: true });
    this.refresh(t.id);
    S.bigBanner(`${name} clatters loose!`, `${t.label} loses its grip`, 'disarm');
    // the engine follows with a text line that says the same; keep it in the log only
    this.disarmText = `${RELICS[ev.relic]?.name || name} clatters loose!`;
    await this.wait(420);
    await this.peak(ev);
    await this.wait(1080);
  }

  async on_text(ev) {
    const S = this.S;
    if (this.disarmText && ev.text.startsWith(this.disarmText)) {
      S.log({ text: ev.text, kind: 'disarm' });
      const rest = ev.text.slice(this.disarmText.length).trim();
      if (rest) S.caption(rest, 'text');
      this.disarmText = null;
      await this.wait(rest ? 700 : 100);
      return;
    }
    S.caption(ev.text, 'text');
    await this.wait(Math.min(1100, 380 + ev.text.length * 9));
  }

  async on_surge(ev) {
    const S = this.S, u = this.U(ev.actor);
    if (!u) return;
    u.surge = ev.to;
    this.refresh(u.id);
    if (ev.to >= 100 && ev.from < 100) {
      S.sfx('surge');
      this.float(u.id, 'Surge ready', 'surge', '', 1300);
      await this.wait(420);
    }
  }

  async on_legend(ev) {
    const S = this.S, u = this.U(ev.actor);
    S.tray.hide();
    if (u) { u.surge = 0; this.refresh(u.id); S.party.cast(u.id, 900); }
    const svc = S.services && S.services.cardSlam;
    let slam = null;
    if (svc && ev.item) {
      try {
        const p = svc(ev.item, { power: ev.power, name: ev.name, text: ev.text });
        slam = Promise.race([Promise.resolve(p), S.clock.wait(9000), new Promise(r => { this.S.onSkip = r; })]);
      } catch (e) {
        console.warn('cardSlam failed, using the fallback', e);
      }
    }
    if (!slam) slam = legendSlam(S.root, { item: ev.item, name: ev.name, text: ev.text, actorName: u?.label }, { clock: S.clock, reduced: S.reduced, sfx: S.sfx });
    await Promise.race([slam, S.clock.wait(700)]);
    await this.peak(ev);
    await slam;
    S.stage.flash(aspectColor(ev.item?.aspect) || '#ffcb66', 360, 0.5);
    for (const v of S.stage.visible()) { const [x, y] = S.stage.point(v.id, 'center'); S.stage.ring(x, y, aspectColor(ev.item?.aspect), 26, 520); }
    await this.wait(220);
  }

  async on_ko(ev) {
    const S = this.S, t = this.U(ev.target);
    if (!t) return;
    t.ko = true; t.hp = 0; t.statuses = [];
    if (t.side === 'foe') S.stage.ko(t.id); else S.party.hurt(t.id, true);
    this.refresh(t.id);
    this.float(t.id, t.side === 'foe' ? 'Defeated' : 'Down!', 'ko', '', 1100);
    S.sfx('ko');
    // M6: a foe's own last words on its fall (Hodge sits down on his stool)
    if (ev.text) S.caption(ev.text, 'text');
    await this.wait(ev.text ? Math.min(1400, 650 + ev.text.length * 8) : 650);
  }

  async on_revive(ev) {
    const S = this.S, t = this.U(ev.target);
    if (!t) return;
    t.ko = false; t.hp = ev.hp ?? t.hp;
    this.revived = t.id;
    if (t.side === 'foe') S.stage.revive(t.id);
    this.refresh(t.id);
    this.float(t.id, 'Revived', 'heal', ev.hp ? `${ev.hp} HP` : '');
    S.party.flashColor(t.id, [255, 240, 180, 0.5], 400);
    S.sfx('heal');
    await this.wait(600);
  }

  async on_phase(ev) {
    const S = this.S, t = this.U(ev.foe);
    if (!t) return;
    t.phase = ev.phase;
    S.sfx('phase');
    S.stage.flash('#b774f4', 420, 0.6);
    S.shake(3);
    S.stage.setLook(t.id, t);
    S.stage.hurt(t.id, { big: true });
    const [x, y] = S.stage.point(t.id, 'center');
    S.stage.ring(x, y, '#b4d65a', 60, 900);
    S.stage.sparks(x, y, '#b774f4', 30, { spread: 1.6 });
    S.hud.clearPortrait(t.id);
    this.refresh(t.id);
    S.bigBanner(`Phase ${ev.phase}`, ev.text || '', 'phase');
    S.caption(ev.text || `${t.label} changes!`, 'phase');
    await this.wait(650);
    await this.peak(ev);
    await this.wait(1250);
  }

  async on_spawn(ev) {
    const S = this.S;
    const u = addUnitFrom(this.disp, this.next, ev.foe, S.labels);
    if (!u) return;
    S.addFoe(u, true);
    S.caption(ev.text || `${u.label} joins the fight!`, 'text');
    S.sfx('status');
    await this.wait(520);
    await this.peak(ev);
    await this.wait(240);
  }

  async on_escape(ev) {
    const S = this.S, t = this.U(ev.foe);
    if (!t) return;
    t.gone = true;
    S.stage.escape(t.id, /wither/i.test(ev.text || '') ? 'wither' : 'run');
    this.refresh(t.id);
    S.caption(ev.text || `${t.label} is gone.`, 'text');
    await this.wait(260);
    await this.peak(ev);
    await this.wait(440);
  }

  async on_victory() { this.S.ended = 'victory'; }
  async on_defeat() { this.S.ended = 'defeat'; }
  async on_fled() { this.S.ended = 'fled'; }
}

// text for the intent bubble's target line
export function intentTarget(u, intent, nameOf) {
  const kind = moveTargetKind(u, intent.move);
  if (kind === 'all-enemies') return 'at everyone';
  if (kind === 'all-allies') return 'rallies its side';
  if (kind === 'self' || intent.target === u.id) return 'on itself';
  const n = intent.target ? nameOf(intent.target) : '';
  return n ? `at ${n}` : '';
}

