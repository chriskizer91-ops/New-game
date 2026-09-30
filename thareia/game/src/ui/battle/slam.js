// Fallbacks used when the shared card component (ctx.services.cardSlam / cardPreview) is not
// registered: a Legend Surge slam of the relic's own portrait across the screen, and a greyed
// "HELD BY" preview of a relic still in a foe's grip.
import { itemPortrait, RARITY_LOOK } from '../../art/item-looks.js';
import { RELICS } from '../../data/relics.js';
import { el, toCanvas } from './util.js';

function portraitCanvas(item, rarity, scale, t = 0.8, reduced = false) {
  let img = null;
  try { img = item ? itemPortrait(item, { size: 64, t, rarity, reduced }) : null; } catch { img = null; }
  if (!img) return null;
  const c = toCanvas(img);
  c.className = 'px';
  c.style.width = `${64 * scale}px`;
  c.style.height = `${64 * scale}px`;
  return c;
}

// Returns a promise that resolves when the slam has finished (or was skipped).
export function legendSlam(root, { item, name, text, actorName }, { clock, reduced, sfx }) {
  const rarity = item?.rarity || 'heirloom';
  const look = RARITY_LOOK[rarity] || RARITY_LOOK.heirloom;
  const wide = window.innerWidth >= 700;
  const scale = wide ? 4 : 3;
  const pc = portraitCanvas(item, rarity, scale, 0.8, reduced);
  const card = el('div.bt-slam-card', { 'data-r': rarity, style: `--rc:${look.color}` },
    el('p.bt-slam-k', { text: 'Legend Surge' }),
    pc ? el('div.bt-slam-pwin', null, pc) : el('div.bt-slam-pwin.empty', null, el('span', { text: '✦' })),
    el('h2.bt-slam-name', { text: name || 'Legend Surge' }),
    el('p.bt-slam-item', { text: [item?.name, actorName].filter(Boolean).join(' · ') }),
    text ? el('p.bt-slam-text', { text }) : null,
  );
  const wrap = el('div.bt-slam', { role: 'img', 'aria-label': `Legend Surge: ${name}. ${text || ''}`, style: `--rc:${look.color}` },
    el('div.bt-slam-beam'), card);
  if (reduced) wrap.classList.add('reduced');
  root.append(wrap);
  sfx('legend', { tier: look.tier });
  // the portrait keeps its shine sweep while it is on screen
  let alive = true, t = 0.8;
  const tick = () => {
    if (!alive || reduced || !pc || !item) return;
    t += 1 / 15;
    try { const img = itemPortrait(item, { size: 64, t, rarity }); pc.getContext('2d').putImageData(img, 0, 0); } catch { /* keep last frame */ }
    setTimeout(tick, 66);
  };
  setTimeout(tick, 66);
  requestAnimationFrame(() => wrap.classList.add('in'));
  return (async () => {
    try {
      await clock.wait(380);
      wrap.classList.add('hit');
      await clock.wait(1500);
      wrap.classList.add('out');
      await clock.wait(320);
    } finally {
      alive = false;
      wrap.remove();
    }
  })();
}

// relic piece -> an ItemInstance-like object for card previews
export function pieceItem(piece) {
  if (piece.item) return piece.item;
  const r = RELICS[piece.relic];
  if (!r) return null;
  return { uid: `preview-${r.id}`, base: r.id, kind: r.kind, slot: r.slot, rarity: r.rarity, ilvl: r.ilvl, name: r.name, aspect: r.aspect || null, affixes: [], gems: [], temper: 0, seed: 1, provenance: { from: null, where: null, day: 1 }, chronicle: { kills: 0 } };
}

// The greyed "HELD BY" card. Resolves when closed.
export function heldByPreview(root, { item, heldBy, loose }, { sfx, reduced }) {
  return new Promise(resolve => {
    const relic = RELICS[item.base];
    const rarity = item.rarity || relic?.rarity || 'heirloom';
    const look = RARITY_LOOK[rarity] || RARITY_LOOK.heirloom;
    const pc = portraitCanvas(item, rarity, window.innerWidth >= 700 ? 4 : 3, 1.3, true);
    const close = el('button.btn', { type: 'button', text: 'Close' });
    const power = relic?.power;
    const panel = el('div.bt-preview', { role: 'dialog', 'aria-modal': 'true', 'aria-label': `${item.name}, held by ${heldBy}`, style: `--rc:${look.color}` },
      el('p.bt-prev-k', { text: loose ? `Knocked loose from ${heldBy}` : `Held by ${heldBy}` }),
      pc ? el('div.bt-prev-pwin', null, pc) : null,
      el('h3.bt-prev-name', { text: item.name }),
      el('p.bt-prev-type', { text: `${look.name} ${item.kind}${item.aspect ? ` · ${item.aspect}` : ''}` }),
      power ? el('div.bt-prev-power', null, el('b', { text: power.name }), el('span', { text: power.text })) : null,
      el('p.bt-prev-note', { text: loose ? 'It lies in the dirt. Win the fight and it is yours.' : 'Break its grip to claim it. If the holder falls first, the relic shatters.' }),
      close,
    );
    const modal = el('div.bt-modal', null, panel);
    const done = () => { modal.remove(); document.removeEventListener('keydown', onKey, true); sfx('back'); resolve(); };
    const onKey = e => { if (e.key === 'Escape' || e.key === 'x' || e.key === 'X' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); done(); } };
    close.addEventListener('click', done);
    modal.addEventListener('click', e => { if (e.target === modal) done(); });
    document.addEventListener('keydown', onKey, true);
    root.append(modal);
    if (!reduced) panel.classList.add('in');
    close.focus();
  });
}
