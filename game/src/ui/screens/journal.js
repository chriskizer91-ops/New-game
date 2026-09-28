// The Journal (M3 spec §5.6): tabs for Quests, Bounties, the Ladder (renderFoe silhouettes, tinted
// black until scouted) and Keys (a tick or cross for every key, and whose Domain counts).
// mount(root, ctx, { tab: 'quests' | 'bounties' | 'ladder' | 'keys' }).
// SCAFFOLD placeholder: plain text lists from rules/story.js and rules/world.js, and Back.
// Owner: WP8.
import { questLog, bounties, ladder } from '../../rules/story.js';
import { lockStatus } from '../../rules/world.js';
import { LOCKS } from '../../data/locks.js';
import { el, button } from '../lib/dom.js';
import { screenNav } from '../lib/keys.js';

const TABS = ['quests', 'bounties', 'ladder', 'keys'];

export function mount(root, ctx, params = {}) {
  if (!ctx.game) { ctx.go('title'); return {}; }
  let tab = TABS.includes(params.tab) ? params.tab : 'quests';
  const back = () => { ctx.audio.sfx('back'); ctx.go('world'); };
  const top = el('header', 'topbar');
  const title = el('div', 'tb-title');
  title.append(el('span', { class: 'realm', text: 'The Journal' }), el('h1', { class: 'title-display', text: 'Quests & Keys' }));
  top.append(button('‹ Back', 'btn ghost back', back, { 'data-primary': '' }), title);
  const tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Journal' });
  const body = el('ul', { class: 'journal-list', role: 'tabpanel' });
  root.append(top, tabs, body);

  function rows() {
    const g = ctx.game;
    if (tab === 'quests') return questLog(g).map(q => `${q.name} · ${q.state} · ${q.step.text}`);
    if (tab === 'bounties') return bounties(g).map(b => `${b.name} · ${b.gold} gold · ${b.state}`);
    if (tab === 'ladder') return ladder(g).map(p => `${p.state === 'silhouette' ? '???' : p.name} · ${p.state}`);
    return Object.keys(LOCKS).map(id => {
      const st = lockStatus(g, id);
      return `${LOCKS[id].name} · ${st.keys.map(k => `${k.have ? '✓' : '✗'} ${k.label}`).join(' · ')}`;
    });
  }
  function render() {
    tabs.replaceChildren(...TABS.map(t => {
      const b = button('', 'tab', () => { tab = t; render(); }, { role: 'tab', 'aria-selected': String(t === tab) });
      b.textContent = t[0].toUpperCase() + t.slice(1);
      return b;
    }));
    body.replaceChildren(...rows().map(text => el('li', { text })));
    if (!body.children.length) body.append(el('li', { text: 'Nothing yet.' }));
  }
  render();
  return { onAction: screenNav(root, { back, menu: back }) };
}
