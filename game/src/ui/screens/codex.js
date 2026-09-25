// The Hearth Codex: a binder of every relic with Sighted / Claimed / Awakened stamps.
// Unsighted entries are silhouettes with a riddle; tap any entry to see its card.
import { RELICS } from '../../data/relics.js';
import { relicItem } from '../../rules/loot.js';
import { createRng } from '../../core/rng.js';
import { el, esc, button } from '../lib/dom.js';
import { portraitCanvas, rarityColor, rarityName } from '../lib/art.js';
import { codexNo } from '../lib/items.js';
import { screenNav } from '../lib/keys.js';

const RIDDLES = {
  hearthbrand: 'It has never once gone cold. Ask Fenwick where the Keep keeps its coals.',
  'stillwater-lance': 'Cut from a lake the winter it held its breath.',
  cairnmaul: 'A stone from the Old Road that refused to break.',
  'wardens-seal': 'Pressed into every oath the Keep has sworn. Someone with ink-stained fingers wants the oaths.',
  tallyknife: 'Every notch is a debt. Look for the one counting coins by lamplight.',
  thornsplitter: 'A ranger buried it in something that never forgave him. Listen for grunting in the black mud.',
  'rotwood-circlet': 'Grown, not made. The white stag of Fawnrest does not wear white any more.',
  'thornwatch-hood': 'Thirty names were on the roll once. A toll-keeper wears one he never earned.',
  'thornwatch-jerkin': 'It knits itself closed. Someone in a Tallyman camp is wearing it badly.',
  'thornwatch-boots': 'They leave no trail the forest will tell. Deep in the bramble, someone is walking in them.',
  thornwreath: 'It grew around a skull the night the hearth flickered, and it has not stopped growing.',
  briarfang: 'A fang the length of a knife, still in the mouth it came from.',
};

const HOLDER = {
  hearthbrand: 'the Keep reliquary', 'stillwater-lance': 'Tamsin Vale', cairnmaul: 'the Keep reliquary',
  'wardens-seal': 'Sneck the Tallyman', tallyknife: 'a Tallyman veteran', thornsplitter: 'Old Snag', 'rotwood-circlet': 'the Rot-Stag',
  'thornwatch-hood': 'Skarn', 'thornwatch-jerkin': 'a bandit veteran', 'thornwatch-boots': 'a bandit veteran', thornwreath: 'Briarmaw', briarfang: 'Briarmaw',
};

export function mount(root, ctx) {
  if (!ctx.game) { ctx.go('title'); return {}; }
  const game = ctx.game;
  const ids = Object.values(RELICS).sort((a, b) => a.codex - b.codex).map(r => r.id);
  const entry = id => game.codex[id] || { sighted: false, claimed: false, awakened: false };
  const mine = ['hearthbrand', 'stillwater-lance', 'cairnmaul'].find(id => entry(id).claimed);
  const tamsins = { hearthbrand: 'cairnmaul', 'stillwater-lance': 'hearthbrand', cairnmaul: 'stillwater-lance' }[mine];
  const holderOf = id => (RELICS[id].starter ? (id === tamsins ? 'Tamsin Vale' : 'the Keep reliquary') : HOLDER[id] || RELICS[id].holder);
  const claimed = ids.filter(id => entry(id).claimed).length, sighted = ids.filter(id => entry(id).sighted).length;

  const top = el('header', 'topbar');
  top.append(button('‹ Road', 'btn ghost back', () => { ctx.audio.sfx('back'); ctx.go('road'); }), el('div', 'tb-title', '<span class="realm">The Hearth Codex</span><h1 class="title-display">Every legend has a holder</h1>'));
  root.append(top);
  const sum = el('section', 'codex-sum panel');
  sum.append(
    el('p', '', `Page I · <b>The Verdant Wilds</b>. ${claimed} of ${ids.length} claimed, ${sighted} sighted. Every relic here is in somebody’s hands until you take it off them.`),
    el('span', 'cbar', `<i style="width:${claimed / ids.length * 100}%"></i><b style="width:${sighted / ids.length * 100}%"></b>`),
  );
  root.append(sum);

  const binder = el('div', 'binder');
  ids.forEach((id, i) => {
    const R = RELICS[id], e = entry(id);
    const owned = game.inventory.find(it => it.base === id && !it.shattered) || game.inventory.find(it => it.base === id);
    const item = owned || relicItem(id, createRng('codex-' + id), { from: R.holder, where: 'The Verdant Wilds', day: game.progress.flags.day });
    const state = e.claimed ? 'claimed' : e.sighted ? 'sighted' : 'unsighted';
    const b = el('button', { type: 'button', class: `pocket is-${state}`, 'data-r': R.rarity, 'aria-label': `${codexNo(R)}: ${state === 'unsighted' ? 'unknown relic' : R.name}, ${state}` });
    const p = portraitCanvas(item, { size: 64, develop: state === 'unsighted' ? 0 : undefined, still: state !== 'claimed' });
    b.append(el('span', 'no', codexNo(R).replace(' / ', '/')), el('span', 'pp', [p.canvas]));
    b.append(el('span', 'pn', state === 'unsighted' ? '???' : esc(R.name)));
    b.append(el('span', 'pr', state === 'unsighted' ? 'Unsighted' : `<span style="color:${rarityColor(R.rarity)}">${esc(rarityName(R.rarity))}</span>`));
    if (state === 'unsighted') b.append(el('span', 'hint', esc(RIDDLES[id] || 'Nobody has seen it yet.')));
    else if (state === 'sighted') b.append(el('span', 'hint', `Held by ${esc(holderOf(id))}`));
    b.append(el('span', 'stamps', `<i class="${e.sighted ? 'on' : ''}">Sighted</i><i class="${e.claimed ? 'on' : ''}">Claimed</i><i class="${e.awakened ? 'on' : ''}">Awakened</i>`));
    b.addEventListener('click', () => {
      ctx.audio.sfx('page');
      if (state === 'unsighted') ctx.services.cardInspect(item, { silhouette: true, riddle: RIDDLES[id], picker: false });
      else if (state === 'sighted') ctx.services.cardPreview(item, { heldBy: holderOf(id) });
      else ctx.services.cardInspect(owned || item, { picker: !!owned });
    });
    b.dataset.pick = String(i + 1);
    binder.append(b);
  });
  root.append(binder);
  root.append(el('p', 'codex-foot', 'Sighted: seen on its holder. Claimed: pried loose and yours. Awakened: a relic that has done three great deeds in your hands. No relic has woken that far yet.'));
  if (!ctx.audio.track || ctx.audio.track === 'victory') ctx.audio.music('road');
  return { onAction: screenNav(root, { back: () => ctx.go('road'), menu: () => ctx.go('road') }) };
}
