// The dialogue box (M3 spec §5.5): on phones it replaces the control deck in place (the ▸ button
// sits where A was, B skips); on laptops it docks over the bottom of the canvas. The speaker's name
// in the pixel font, 3 lines of 15 px text typed at 45 chars/s with a per-speaker blip (instant with
// reduced motion), choices as 44 px buttons with odds chips ("Influence DC 14 · 65% · Alondra"), and
// the roll shown after a check. role="dialog" (openOverlay) with an aria-live line.
// Exports:
//   openDialogue(ctx, { game, id, dock }) -> Promise<{ game, events }>   runs a dialogue to its end
//     through rules/story.js (enterDialogue applies node.do; choose rolls checks and contests)
//   openMessage(ctx, { text, name, dock }) -> Promise<void>              a sign, a gate, a sealed road
//   dock: { left, width, bottom } in CSS px (laptop: over the canvas); omitted on phones
// Owner: WP7.

import { enterDialogue, dialogueView, choose } from '../../rules/story.js';
import { NPCS } from '../../data/npcs.js';
import { HEROES } from '../../data/heroes.js';
import { npcSheet } from '../../art/index.js';
import { openOverlay } from '../lib/overlay.js';
import { el } from '../lib/dom.js';
import { bustCanvas } from '../lib/art.js';
import { TYPE_CPS } from './constants.js';

const voiceOf = speaker => { let h = 5; for (const c of String(speaker || '')) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h % 8; };

function portrait(ctx, game, speaker) {
  if (!speaker || speaker === 'narrator') return null;
  try {
    if (HEROES[speaker] && game?.party?.roster?.[speaker]) {
      const c = bustCanvas(game, speaker, { size: 24, scale: 2 });
      c.classList.add('dlg-face');
      return c;
    }
    const art = NPCS[speaker]?.art || speaker;
    const s = npcSheet(art);
    const c = document.createElement('canvas');
    c.width = s.w; c.height = s.h;
    const tmp = document.createElement('canvas');
    tmp.width = s.img.width; tmp.height = s.img.height;
    tmp.getContext('2d').putImageData(s.img, 0, 0);
    c.getContext('2d').drawImage(tmp, 0, 0, s.w, s.h, 0, 0, s.w, s.h);
    c.className = 'px dlg-face npc';
    c.setAttribute('aria-hidden', 'true');
    return c;
  } catch { return null; }
}

// The box itself: one overlay reused for every node of a conversation.
function dialogueBox(ctx, { dock } = {}) {
  const reduced = ctx.reduced();
  const ov = openOverlay({ cls: 'ov-dialogue' + (dock ? ' docked' : ''), label: 'Conversation', onKey: (a, e) => onKey(a, e) });
  const box = el('section', 'dlg');
  if (dock) Object.assign(box.style, { left: dock.left + 'px', width: dock.width + 'px', bottom: dock.bottom + 'px' });
  const head = el('div', 'dlg-head');
  const faceHost = el('span', 'dlg-face-host');
  const name = el('p', 'dlg-name');
  head.append(faceHost, name);
  const text = el('p', { class: 'dlg-text', 'aria-hidden': 'true' });
  const live = el('p', { class: 'sr-only', 'aria-live': 'polite' });
  const choices = el('div', { class: 'dlg-choices', role: 'group', 'aria-label': 'Choices' });
  const roll = el('p', 'dlg-roll');
  roll.hidden = true;
  const keys = el('div', 'w-ab dlg-ab');
  const skip = el('button', { type: 'button', class: 'w-btn w-b', 'aria-label': 'B: skip' });
  skip.append(el('b', { text: 'B' }), el('small', { text: 'Skip' }));
  const nextB = el('button', { type: 'button', class: 'w-btn w-a dlg-next', 'aria-label': 'Next', 'data-primary': '' });
  nextB.append(el('b', { text: '▸' }));
  keys.append(skip, nextB);
  box.append(head, text, roll, choices, keys, live);
  ov.inner.append(box);

  let typing = null, waiter = null, skipAll = false;
  function finishTyping() {
    if (!typing) return false;
    clearInterval(typing.timer);
    text.textContent = typing.full;
    typing = null;
    return true;
  }
  function advance() {
    if (finishTyping()) return;
    if (waiter && !choices.childElementCount) { const w = waiter; waiter = null; w(); }
  }
  function onKey(a, e) {
    if (a === 'confirm') {
      const f = document.activeElement, z = e?.code === 'KeyZ';
      // Enter or Space on a focused button (a choice, ▸ or B) presses it natively, so one key press
      // never advances twice; Z is A, and presses the focused choice or moves the talk on
      if (z && f && choices.contains(f)) { f.click(); return true; }
      if (!z && f && (choices.contains(f) || f === nextB || f === skip)) return false;
      advance(); return true;
    }
    if (a === 'back') {
      // B skips: the rest of this node's lines at once, up to the next choice or the end
      skipAll = true;
      finishTyping();
      if (waiter && !choices.childElementCount) { const w = waiter; waiter = null; w(); }
      return true;
    }
    if (a.startsWith('pick')) {
      const b = choices.children[+a.slice(4) - 1];
      if (b) { b.click(); return true; }
    }
    return false;
  }
  nextB.addEventListener('click', advance);
  skip.addEventListener('click', () => onKey('back'));
  box.addEventListener('click', e => { if (e.target === box || e.target === text) advance(); });

  return {
    ov,
    get skipping() { return skipAll; },
    // show one line, typed out; resolves when the player moves on
    say(game, line) {
      roll.hidden = true;
      choices.replaceChildren();
      faceHost.replaceChildren();
      const f = portrait(ctx, game, line.speaker);
      if (f) faceHost.append(f);
      name.textContent = line.name || '';
      name.hidden = !line.name;
      live.textContent = line.name ? `${line.name}: ${line.text}` : line.text;
      nextB.hidden = false;
      const full = String(line.text || '');
      if (reduced || skipAll) text.textContent = full;
      else {
        text.textContent = '';
        let i = 0;
        const voice = voiceOf(line.speaker);
        const t = { full, timer: 0 };
        t.timer = setInterval(() => {
          i = Math.min(full.length, i + 1);
          text.textContent = full.slice(0, i);
          if (i % 3 === 1 && full[i - 1] !== ' ') ctx.audio.sfx('blip', { voice });
          if (i >= full.length) { clearInterval(t.timer); if (typing === t) typing = null; }
        }, 1000 / TYPE_CPS);
        typing = t;
      }
      nextB.focus({ preventScroll: true });
      if (skipAll) return Promise.resolve();
      return new Promise(res => { waiter = res; });
    },
    // offer the choices; resolves with the chosen index
    ask(list) {
      finishTyping();
      nextB.hidden = true;
      skip.hidden = true;
      choices.replaceChildren();
      return new Promise(res => {
        list.forEach((c, k) => {
          const b = el('button', { type: 'button', class: 'dlg-choice', 'data-pick': String(k + 1) });
          const t = el('span', 'dlg-choice-t');
          t.textContent = c.text;
          b.append(el('span', { class: 'dlg-choice-n', text: String(k + 1), 'aria-hidden': 'true' }), t);
          if (c.odds) {
            const chip = el('span', 'dlg-odds');
            chip.textContent = [c.odds.label, `${c.odds.pct}%`, c.odds.hero].filter(Boolean).join(' · ');
            b.append(chip);
            b.setAttribute('aria-label', `${c.text} (${chip.textContent})`);
          }
          b.addEventListener('click', () => { ctx.audio.sfx('confirm'); choices.replaceChildren(); nextB.hidden = false; skip.hidden = false; res(c.i); });
          choices.append(b);
        });
        const first = choices.firstElementChild;
        if (first) first.focus({ preventScroll: true });
        skipAll = false;
      });
    },
    showRoll(r) {
      if (!r) return Promise.resolve();
      roll.hidden = false;
      const parts = r.parts ? ` · ${r.parts.map(p => (p.pass ? '✓' : '✗')).join(' ')}` : '';
      roll.textContent = r.parts ? `${r.label}${parts} · ${r.pass ? 'Won' : 'Lost'}` : `${r.label} · rolled ${r.total}${r.nat === 20 ? ' (a natural 20)' : ''} · ${r.pass ? 'Pass' : 'Fail'}`;
      roll.dataset.pass = r.pass ? '1' : '0';
      live.textContent = roll.textContent;
      ctx.audio.sfx(r.pass ? 'chime' : 'error');
      text.textContent = '';
      name.textContent = '';
      faceHost.replaceChildren();
      nextB.hidden = false;
      nextB.focus({ preventScroll: true });
      return new Promise(res => { waiter = res; });
    },
    close() { finishTyping(); ov.close(); },
  };
}

export async function openDialogue(ctx, { game, id, dock } = {}) {
  let g = game;
  const events = [];
  if (!id || !dialogueView(g, id)) return { game: g, events, id };
  const box = dialogueBox(ctx, { dock });
  try {
    let nodeId = id, guard = 0;
    while (nodeId && guard++ < 40) {
      const r = enterDialogue(g, nodeId);
      g = r.game; events.push(...r.events);
      const view = dialogueView(g, nodeId);
      if (!view) break;
      for (const line of view.lines) await box.say(g, line);
      if (!view.choices.length) break;
      const i = await box.ask(view.choices);
      const c = choose(g, nodeId, i);
      g = c.game; events.push(...c.events);
      if (c.roll) await box.showRoll(c.roll);
      nodeId = c.next;
    }
  } finally {
    box.close();
  }
  return { game: g, events, id };
}

export async function openMessage(ctx, { text, name = '', speaker = 'narrator', dock } = {}) {
  const box = dialogueBox(ctx, { dock });
  try { await box.say(null, { speaker, name, text }); } finally { box.close(); }
}
