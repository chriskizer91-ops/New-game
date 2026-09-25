// Settings: sound, music, battle speed, reduced motion; save codes out and in; start over.
import { exportCode, importCode, clearGame } from '../../core/save.js';
import { el, esc, button } from '../lib/dom.js';
import { screenNav } from '../lib/keys.js';

const SPEEDS = [[1, 'Normal'], [2, 'Fast'], [4, 'Fastest']];

export function mount(root, ctx, params = {}) {
  const from = params.from || (ctx.game ? 'road' : 'title');
  const back = () => { ctx.audio.sfx('back'); ctx.go(ctx.game ? from : 'title'); };
  const top = el('header', 'topbar');
  top.append(button(`‹ ${from === 'title' ? 'Title' : 'Road'}`, 'btn ghost back', back), el('div', 'tb-title', '<span class="realm">Settings</span><h1 class="title-display">By the fire</h1>'));
  root.append(top);
  const apply = patch => { ctx.setSettings(patch); if (ctx.services.applySettings) ctx.services.applySettings(); };

  // ---- toggles ----
  const opts = el('section', 'set-opts panel');
  const toggle = (key, label, sub, after) => {
    const on = ctx.settings[key] !== false && !!ctx.settings[key];
    const b = el('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(on) });
    b.innerHTML = `<span class="sw-txt"><b>${label}</b><small>${sub}</small></span><span class="sw-knob" aria-hidden="true"><i></i></span>`;
    b.addEventListener('click', () => {
      const v = b.getAttribute('aria-checked') !== 'true';
      b.setAttribute('aria-checked', String(v));
      ctx.audio.unlock();
      apply({ [key]: v });
      if (after) after(v);
      ctx.audio.sfx(v ? 'confirm' : 'back');
    });
    return b;
  };
  opts.append(
    toggle('sound', 'Sound effects', 'Dice, hits, chimes and the loot reveal.'),
    toggle('music', 'Music', 'Chiptune tracks for the road, the fire and the fight.'),
    toggle('reducedMotion', 'Reduced motion', 'No shakes, flashes or drifting embers. Cards appear without flipping.'),
  );
  const speed = el('fieldset', 'seg');
  speed.append(el('legend', '', '<b>Battle speed</b><small>How fast turns play out.</small>'));
  const segRow = el('div', 'seg-row');
  for (const [v, label] of SPEEDS) {
    const b = button(label, 'btn seg-b', () => { apply({ battleSpeed: v }); ctx.audio.sfx('select'); segRow.querySelectorAll('.seg-b').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }, { 'aria-pressed': String((ctx.settings.battleSpeed || 1) === v) });
    segRow.append(b);
  }
  speed.append(segRow);
  opts.append(speed);
  root.append(opts);

  // ---- save codes ----
  const saves = el('section', 'set-saves panel');
  saves.append(el('h2', 'label', 'Move your save'));
  saves.append(el('p', 'small', 'Your journey saves on this device by itself at every Hearthfire and after every fight. To carry it to another phone or laptop, make a code here and paste it in over there.'));
  const outBox = el('div', 'code-out');
  const ta = el('textarea', { class: 'code', readonly: '', rows: '4', 'aria-label': 'Your save code', spellcheck: 'false' });
  const copyBtn = button('Copy code', 'btn', () => {
    ta.focus(); ta.select();
    const done = ok => { copyBtn.textContent = ok ? 'Copied' : 'Selected: copy it'; ctx.audio.sfx(ok ? 'confirm' : 'select'); setTimeout(() => { copyBtn.textContent = 'Copy code'; }, 1800); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => done(true), () => { ta.select(); done(false); });
      else { ta.select(); done(false); }
    } catch { ta.select(); done(false); }
  });
  const mk = button('Make a save code', 'btn primary', () => {
    if (!ctx.game) return;
    ta.value = exportCode(ctx.game);
    outBox.hidden = false; mk.textContent = 'Make a fresh code';
    ta.focus(); ta.select();
    ctx.audio.sfx('page');
  });
  mk.disabled = !ctx.game;
  outBox.append(ta, el('div', 'row-btns', [copyBtn]));
  outBox.hidden = true;
  saves.append(mk, outBox);
  if (!ctx.game) saves.append(el('p', 'small', 'No journey yet on this device. Start one, or load a code below.'));

  const inBox = el('div', 'code-in');
  const inTa = el('textarea', { class: 'code', rows: '4', placeholder: 'Paste a code that starts with AETH1.', 'aria-label': 'Paste a save code', spellcheck: 'false', autocomplete: 'off' });
  const err = el('p', { class: 'err', role: 'alert' });
  const load = button('Load this save', 'btn', () => {
    err.textContent = '';
    const code = inTa.value.trim();
    if (!code) { err.textContent = 'Paste a save code first. It starts with AETH1.'; ctx.audio.sfx('error'); return; }
    let g;
    try { g = importCode(code); } catch (e) { err.textContent = e.message || 'That code could not be read.'; ctx.audio.sfx('error'); return; }
    if (!g.party?.roster?.warden || !g.progress) { err.textContent = 'That code is from a different game or version. Nothing was changed.'; ctx.audio.sfx('error'); return; }
    ctx.setGame(g);
    ctx.audio.sfx('reveal', { tier: 2 });
    ctx.toast(`Welcome back, ${g.party.roster.warden.name}.`);
    ctx.go('road');
  });
  inBox.append(el('label', 'label', 'Load a code'), inTa, err, load);
  saves.append(inBox);
  root.append(saves);

  // ---- start over ----
  const danger = el('section', 'set-danger panel');
  danger.append(el('h2', 'label', 'Start over'));
  const confirmBox = el('div', 'confirm-box'); confirmBox.hidden = true;
  const who = ctx.game ? ctx.game.party.roster.warden.name : 'this journey';
  const startBtn = button('Start over', 'btn danger', () => { confirmBox.hidden = false; startBtn.hidden = true; ctx.audio.sfx('select'); confirmBox.querySelector('.danger').focus(); });
  startBtn.disabled = !ctx.game;
  confirmBox.append(
    el('p', '', `This erases ${esc(who)}’s journey from this device: gear, Codex, all of it. Make a save code first if you might want it back.`),
    el('div', 'row-btns', [
      button('Yes, erase it', 'btn danger', () => { clearGame(); ctx.setGame(null); ctx.audio.sfx('defeat'); ctx.toast('The hearth is swept. A new Warden can begin.'); ctx.go('title'); }),
      button('Keep playing', 'btn', () => { confirmBox.hidden = true; startBtn.hidden = false; ctx.audio.sfx('back'); startBtn.focus(); }),
    ]),
  );
  danger.append(el('p', 'small', 'Wipes the saved game on this device. Settings stay.'), startBtn, confirmBox);
  root.append(danger);

  return { onAction: screenNav(root, { back }) };
}
