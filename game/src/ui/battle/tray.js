// The dice tray: pops up in the bottom panel whenever a d20 is rolled in the open. The d20
// tumbles through random faces, lands on the kept value (both dice for advantage, the dropped
// one dimmed), then shows the maths and the verdict; damage dice follow as small chips.
import { diceIcon } from '../../art/icons.js';
import { el, pixelIcon } from './util.js';

const RESULT = {
  attack: { crit: ['Legend Strike', 'crit'], hit: ['Hit', 'hit'], graze: ['Graze', 'graze'], miss: ['Miss', 'miss'], fumble: ['Fumble', 'fumble'] },
  save: { save: ['Saved', 'hit'], fail: ['Failed', 'miss'] },
  flee: { save: ['Escape!', 'hit'], fail: ['Caught', 'miss'] },
};
const DIE_MAT = { ember: 'ruby', frost: 'sapphire', storm: 'stormglass', stone: 'topaz', verdant: 'emerald', tide: 'seaglass', radiant: 'gold', blight: 'amethyst' };

export class Tray {
  constructor(host) {
    this.head = el('div.bt-tray-head');
    this.dice = el('div.bt-tray-dice');
    this.math = el('div.bt-tray-math');
    this.result = el('div.bt-tray-result');
    this.dmg = el('div.bt-tray-dmg');
    this.box = el('div.bt-tray', { hidden: true, 'aria-hidden': 'true' }, this.head, el('div.bt-tray-main', null, this.dice, el('div.bt-tray-side', null, this.math, this.result)), this.dmg);
    host.append(this.box);
    this.timer = 0;
  }
  get open() { return !this.box.hidden; }
  hide() { this.box.hidden = true; clearInterval(this.timer); this.box.classList.remove('show'); }

  // ev: roll event; names(id) -> display name. Returns after the verdict is shown.
  async roll(ev, { clock, reduced, sfx, names }) {
    clearInterval(this.timer);
    const purpose = ev.purpose || 'attack';
    const actor = names(ev.actor), target = ev.target ? names(ev.target) : '';
    this.head.replaceChildren(
      el('span.who', { text: purpose === 'attack' ? actor : purpose === 'save' ? `${actor}` : actor }),
      el('span.arrow', { text: purpose === 'attack' ? 'attacks' : purpose === 'save' ? `${ev.ability || ''} save` : 'tries to flee' }),
      el('span.who', { text: purpose === 'attack' ? target : '' }),
    );
    this.math.textContent = '';
    this.math.className = 'bt-tray-math';
    this.result.textContent = '';
    this.result.className = 'bt-tray-result';
    this.dmg.replaceChildren();
    this.box.dataset.purpose = purpose;
    this.box.hidden = false;
    this.box.classList.remove('show'); void this.box.offsetWidth; this.box.classList.add('show');

    const rolls = ev.rolls && ev.rolls.length ? ev.rolls : [ev.kept];
    const keptIdx = rolls.indexOf(ev.kept);
    const slots = rolls.map(() => el('span.bt-d20'));
    this.dice.replaceChildren(...slots);
    const draw = (slot, value, state, spin = 0) => slot.replaceChildren(pixelIcon(diceIcon(20, { value, size: 20, state, spin }), 3));
    sfx('dice');
    if (!reduced) {
      let k = 0;
      const tumble = () => { slots.forEach((s, i) => draw(s, 1 + Math.floor(Math.random() * 20), '', (k + i) & 3)); k++; };
      tumble();
      slots.forEach(s => s.classList.add('tumble'));
      this.timer = setInterval(tumble, 55);
      await clock.wait(560);
      clearInterval(this.timer);
      slots.forEach(s => s.classList.remove('tumble'));
    }
    rolls.forEach((v, i) => {
      const kept = i === keptIdx;
      const state = !kept && rolls.length > 1 ? 'dim' : v === 20 && purpose === 'attack' ? 'crit' : v === 1 ? 'fumble' : '';
      draw(slots[i], v, state);
      slots[i].classList.toggle('dropped', !kept && rolls.length > 1);
      slots[i].classList.add('land');
    });
    if (rolls.length > 1) this.head.append(el('span.bt-adv', { text: ev.adv && !ev.dis ? '· advantage' : '· disadvantage' }));
    const sign = ev.bonus >= 0 ? '+' : '-';
    const vsLabel = purpose === 'attack' ? 'Guard' : purpose === 'flee' ? 'DC' : 'DC';
    this.math.replaceChildren(
      el('span', { text: `${ev.kept} ${sign} ${Math.abs(ev.bonus)} = ` }), el('b', { text: ev.total }),
      el('span.vs', { text: ` vs ${vsLabel} ${ev.vs}` }),
    );
    await clock.wait(reduced ? 80 : 180);
    const [label, cls] = (RESULT[purpose] || RESULT.attack)[ev.result] || [ev.result, 'hit'];
    this.result.textContent = label;
    this.result.className = `bt-tray-result ${cls} pop`;
    const s = { crit: 'crit', hit: 'hit', graze: 'graze', miss: 'miss', fumble: 'miss', save: 'confirm', fail: 'miss' }[ev.result];
    if (purpose !== 'attack') sfx(ev.result === 'save' ? 'confirm' : 'miss');
    else if (s === 'miss' || s === 'crit') sfx(s);
    await clock.wait(420);
    return ev.result;
  }

  // damage dice as chips: [d6 4][d6 3] + 3 = 10 (x1.5 weak)
  damage(ev, { eff }) {
    if (this.box.hidden) return;
    const dice = ev.dice || [];
    const shown = dice.slice(0, 10);
    const chips = shown.map(d => el('span.bt-dchip', null, pixelIcon(diceIcon(d.sides, { value: d.value, size: 12, mat: DIE_MAT[d.aspect] || 'bone' }), 2)));
    const parts = [el('span.bt-dlist', null, ...chips, dice.length > shown.length ? el('span.more', { text: `+${dice.length - shown.length}` }) : null)];
    if (ev.flat) parts.push(el('span.flat', { text: `${ev.flat > 0 ? '+' : '-'} ${Math.abs(ev.flat)}` }));
    parts.push(el('span.eq', { text: '=' }), el('b.total', { text: ev.amount }));
    if (eff) parts.push(el(`span.eff.${eff.cls}`, { text: eff.label }));
    this.dmg.replaceChildren(...parts);
    this.dmg.classList.remove('pop'); void this.dmg.offsetWidth; this.dmg.classList.add('pop');
  }
}
