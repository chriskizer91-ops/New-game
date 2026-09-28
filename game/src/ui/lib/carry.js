// The carry-over card (M3 spec §5.7): shown when an earlier milestone's save is carried into this one
// (M2: a local v1 save, a pasted AETH1 code or "Restore my M2 save"; Milestone 3: the local v2 save,
// a pasted AETH2 code or "Carry over my M3 save"), and for this milestone's own codes. It lists the
// heroes and their levels, relics claimed, gold and the Waking, says where the party wakes, and tells
// loopers that the Wilds remember their Wakings.
//
//   openCarryCard(ctx, game, { kind = 'm2', note, primary = 'Walk on', cancel = 'Not yet' }) -> Promise<boolean>
//     kind 'm2' (an M2 save), 'm3' (a Milestone 3 save) or 'code' (this milestone's code); note is an
//     optional last line (what gets written, and when); resolves true for the primary button.
//   carryFacts(game), inSentence(name)   re-exported from ./carry-facts.js (pure; node-tested)
// Every save string goes through esc() or textContent.
// Owner: WP8.
import { el, esc, button } from './dom.js';
import { bustCanvas } from './art.js';
import { openOverlay } from './overlay.js';
import { carryFacts, inSentence } from './carry-facts.js';

export { carryFacts, inSentence };

export function openCarryCard(ctx, game, { kind = 'm2', note = null, primary = 'Walk on', cancel = 'Not yet' } = {}) {
  return new Promise(resolve => {
    const F = carryFacts(game);
    let done = false;
    const finish = v => { if (done) return; done = true; ov.close(); resolve(v); };
    const T = {
      m2: ['Your journey carries over', 'The road has become a land', 'The Gauntlet was only ever one road through the Verdant Wilds. Everything you won on it comes with you.'],
      m3: ['Your Milestone 3 journey carries over', 'The Wilds go with you', 'Everything you won in the Verdant Wilds comes with you: the party, the gear, the Codex and the purse.'],
      code: ['A saved journey', 'The road has become a land', 'Everything in this save comes with it: the party, the gear, the Codex and the purse.'],
    }[kind] || [];
    const ov = openOverlay({ cls: 'carry-ov', label: T[1], onBack: () => { ctx.audio.sfx('back'); finish(false); } });
    const card = el('article', 'carry-card');
    card.append(el('p', 'kick', T[0]), el('h2', 'title-display', T[1]), el('p', 'carry-lede', T[2]));
    const heroes = el('ul', { class: 'carry-heroes', 'aria-label': 'The party' });
    for (const h of F.heroes) {
      const li = el('li', 'carry-hero');
      li.append(bustCanvas(game, h.id, { size: 24, scale: 2 }), el('span', { class: 'nm', text: h.name }), el('span', { class: 'lv', text: `Lv ${h.level}` }));
      heroes.append(li);
    }
    const facts = el('dl', 'carry-facts');
    const fact = (k, v) => facts.append(el('div', 'cf', [el('dt', { text: k }), el('dd', { text: v })]));
    fact('Relics claimed', `${F.claimed} of ${F.total}`);
    fact('Gold', String(F.gold));
    fact('Waking', String(F.waking));
    if (F.grudges) fact('Grudges', String(F.grudges));
    const wake = el('p', 'carry-wake');
    wake.textContent = `You wake ${F.at} ${inSentence(F.place)}${F.near ? `, by ${inSentence(F.near)}` : ''}.`;
    card.append(heroes, facts, wake);
    if (F.looper) card.append(el('p', 'carry-loop', 'The Wilds remember your Wakings. Beating Briarmaw again is a rematch.'));
    if (note) card.append(el('p', { class: 'carry-safe', text: note }));
    const acts = el('div', 'row-btns carry-acts');
    const go = button(esc(primary), 'btn primary big carry-go', () => { ctx.audio.unlock(); ctx.audio.sfx('confirm'); finish(true); }, { 'data-primary': '' });
    const no = button(esc(cancel), 'btn ghost carry-no', () => { ctx.audio.sfx('back'); finish(false); });
    acts.append(go, no);
    card.append(acts);
    ov.inner.append(card);
    ctx.audio.sfx('page');
    setTimeout(() => go.focus({ preventScroll: true }), 30);
  });
}
