// Settings (M3 spec §5.7): sound, music, battle speed, reduced motion; the world's touch controls,
// always-run and map zoom; save codes out (AETH3.) and in (any milestone's: AETH1. M2, AETH2.
// Milestone 3, AETH3., through the carry-over card); each earlier milestone's save while one exists
// (export it as its code, or carry it over); the previous save while a backup exists; and start over.
// Every milestone keeps its own save: nothing here ever writes an earlier milestone's.
// mount(root, ctx, { from }): Back returns to `from` ('world' with a journey, else 'title').
// Owner: WP8.
import { exportCode, importCode, exportV1Code, exportV2Code, exportM4Code, exportM45Code, readV1, hasV1, readV2, hasV2, readM4, hasM4, readM45, hasM45, hasBackup, backupGame, restoreBackup, saveGame } from '../../core/save.js';
import { el, esc, button } from '../lib/dom.js';
import { screenNav } from '../lib/keys.js';
import { openCarryCard } from '../lib/carry.js';
import { saveProblems } from '../../rules/migrate.js';

const SPEEDS = [[1, 'Normal'], [2, 'Fast'], [4, 'Fastest']];
const TOUCH = [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']];
const ZOOM = [['near', 'Near'], ['normal', 'Normal'], ['far', 'Far']];

export function mount(root, ctx, params = {}) {
  const from = params.from || (ctx.game ? 'world' : 'title');
  const back = () => { ctx.audio.sfx('back'); ctx.go(ctx.game ? from : 'title'); };
  const top = el('header', 'topbar');
  top.append(button(`‹ ${from === 'title' || !ctx.game ? 'Title' : 'Back'}`, 'btn ghost back', back), el('div', 'tb-title', '<span class="realm">Settings</span><h1 class="title-display">By the fire</h1>'));
  root.append(top);
  const apply = patch => { ctx.setSettings(patch); if (ctx.services.applySettings) ctx.services.applySettings(); };
  const name = g => g?.party?.roster?.warden?.name || 'this journey';
  // a journey that is on disk (an adopted M2 save is not, until the first step)
  const saved = () => !!ctx.game && !ctx.adopting;

  // ---- toggles ----
  const toggle = (key, label, sub, after) => {
    const on = ctx.settings[key] !== false && !!ctx.settings[key];
    const b = el('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(on), 'data-key': key });
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
  // a segmented choice: one of `choices` ([value, label]) for settings[key]
  const segmented = (key, label, sub, choices, fallback) => {
    const f = el('fieldset', 'seg');
    f.dataset.key = key;
    f.append(el('legend', '', `<b>${label}</b><small>${sub}</small>`));
    const row = el('div', 'seg-row');
    const cur = choices.some(([v]) => v === ctx.settings[key]) ? ctx.settings[key] : fallback;
    for (const [v, text] of choices) {
      const b = button(text, 'btn seg-b', () => {
        apply({ [key]: v }); ctx.audio.sfx('select');
        row.querySelectorAll('.seg-b').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      }, { 'aria-pressed': String(cur === v), 'data-v': String(v) });
      row.append(b);
    }
    f.append(row);
    return f;
  };
  const opts = el('section', 'set-opts panel');
  opts.append(
    toggle('sound', 'Sound effects', 'Dice, hits, chimes and the loot reveal.'),
    toggle('music', 'Music', 'Chiptune tracks for the Wilds, the towns, the deep places and the fight.'),
    toggle('reducedMotion', 'Reduced motion', 'No shakes, flashes or drifting embers. Cards appear without flipping, and the map cuts instead of fading.'),
    segmented('battleSpeed', 'Battle speed', 'How fast turns play out.', SPEEDS, 1),
  );
  root.append(opts);

  const wilds = el('section', 'set-opts set-world panel');
  wilds.append(
    el('h2', 'label', 'In the Wilds'),
    segmented('touchControls', 'Touch controls', 'The d-pad and the A and B buttons. Auto shows them on a touch screen.', TOUCH, 'auto'),
    toggle('alwaysRun', 'Always run', 'Run everywhere, as if B (X or Shift) were held down.'),
    segmented('mapZoom', 'Map zoom', 'How close the camera sits. Near shows fewer tiles, bigger.', ZOOM, 'normal'),
  );
  root.append(wilds);

  // ---- save codes ----
  const saves = el('section', 'set-saves panel');
  saves.append(el('h2', 'label', 'Move your save'));
  saves.append(el('p', 'small', 'Your journey saves on this device by itself as you walk, at every Hearthfire and after every fight. To carry it to another phone or laptop, make a code here and paste it in over there.'));
  // a read-only code box with a Copy button
  const codeBox = (label, cls) => {
    const box = el('div', `code-out ${cls || ''}`);
    const ta = el('textarea', { class: 'code', readonly: '', rows: '4', 'aria-label': label, spellcheck: 'false' });
    const copy = button('Copy code', 'btn', () => {
      ta.focus(); ta.select();
      const done = ok => { copy.textContent = ok ? 'Copied' : 'Selected: copy it'; ctx.audio.sfx(ok ? 'confirm' : 'select'); setTimeout(() => { copy.textContent = 'Copy code'; }, 1800); };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => done(true), () => { ta.select(); done(false); });
        else { ta.select(); done(false); }
      } catch { ta.select(); done(false); }
    });
    box.append(ta, el('div', 'row-btns', [copy]));
    box.hidden = true;
    return { box, show(code) { ta.value = code; box.hidden = false; ta.focus(); ta.select(); } };
  };
  const out = codeBox('Your save code', 'code-live');
  const mk = button('Make a save code', 'btn primary', () => {
    if (!ctx.game) return;
    out.show(exportCode(ctx.game));
    mk.textContent = 'Make a fresh code';
    ctx.audio.sfx('page');
  });
  mk.disabled = !ctx.game;
  saves.append(mk, out.box);
  if (!ctx.game) saves.append(el('p', 'small', 'No journey yet on this device. Start one, or load a code below.'));

  const inBox = el('div', 'code-in');
  const inTa = el('textarea', { class: 'code', rows: '4', placeholder: 'Paste a save code: it starts with AETH and a number.', 'aria-label': 'Paste a save code', spellcheck: 'false', autocomplete: 'off' });
  const err = el('p', { class: 'err', role: 'alert' });
  const load = button('Load this save', 'btn', async () => {
    err.textContent = '';
    const code = inTa.value.trim();
    if (!code) { err.textContent = 'Paste a save code first. It starts with AETH and a number, like AETH3.'; ctx.audio.sfx('error'); return; }
    let g;
    try { g = importCode(code, ctx.migrate); } catch (e) { err.textContent = e.message || 'That code could not be read.'; ctx.audio.sfx('error'); return; }
    // a damaged code never replaces your journey
    const bad = saveProblems(g);
    if (bad.length) { err.textContent = `That code is damaged (${bad.slice(0, 3).join(', ')}). Nothing was changed.`; ctx.audio.sfx('error'); return; }
    const kind = /^AETH1\./.test(code) ? 'm2' : /^AETH2\./.test(code) ? 'm3' : 'code';
    const ok = await openCarryCard(ctx, g, {
      kind,
      note: saved() ? `${name(ctx.game)}’s current journey is kept as a backup: Restore previous save brings it back.` : null,
    });
    if (!ok) return;
    ctx.replaceGame(g);
    inTa.value = '';
    ctx.audio.sfx('reveal', { tier: 2 });
    ctx.toast(`Welcome back, ${g.party.roster.warden.name}.`);
    ctx.go('world', { arrive: 'load' });
  });
  inBox.append(el('label', 'label', 'Load a code'), inTa, err, load);
  saves.append(inBox);
  root.append(saves);

  // ---- the earlier milestones' saves (read only, never written or removed) ----
  // each one: copy it out as its own code, or carry it into this milestone (the live save is backed up)
  const earlier = ({ cls, title, blurb, codeLabel, codeCls, exportLabel, carryLabel, read, exportOld, kind, who }) => {
    const sec = el('section', `${cls} panel`);
    const old = read();
    sec.append(el('h2', 'label', title));
    sec.append(el('p', 'small', `${esc(name(old))}’s ${blurb}`));
    const box = codeBox(codeLabel, codeCls);
    const exp = button(exportLabel, 'btn', () => {
      const code = exportOld();
      if (!code) { ctx.toast(`The ${who} save could not be read.`); return; }
      box.show(code);
      ctx.audio.sfx('page');
    });
    const carryOver = button(carryLabel, 'btn', async () => {
      let g;
      try { g = ctx.migrate(read()); } catch { ctx.toast(`The ${who} save could not be read.`); ctx.audio.sfx('error'); return; }
      const ok = await openCarryCard(ctx, g, {
        kind,
        note: saved() ? `${name(ctx.game)}’s current journey is kept as a backup: Restore previous save brings it back.` : `Your ${who} save itself is never touched.`,
      });
      if (!ok) return; // "Not yet" leaves the live save and the backup exactly as they were
      ctx.replaceGame(g); // backs the live save up first
      ctx.audio.sfx('reveal', { tier: 2 });
      ctx.go('world', { arrive: 'load' });
    });
    sec.append(el('div', 'row-btns', [exp, carryOver]), box.box);
    root.append(sec);
  };
  if (hasM45()) {
    earlier({
      cls: 'set-m45', title: 'Your Milestone 4.5 save', who: 'Milestone 4.5', kind: 'm45', read: readM45, exportOld: exportM45Code,
      blurb: 'journey on the road is still on this device, untouched: the Milestone 4.5 file keeps playing it. You can copy it out as an AETH3 code, or carry it into this milestone.',
      codeLabel: 'Your Milestone 4.5 save code', codeCls: 'code-m45', exportLabel: 'Export M4.5 backup (AETH3)', carryLabel: 'Carry over my M4.5 save',
    });
  }
  if (hasM4()) {
    earlier({
      cls: 'set-m4', title: 'Your Milestone 4 save', who: 'Milestone 4', kind: 'm4', read: readM4, exportOld: exportM4Code,
      blurb: 'Sunscorch journey is still on this device, untouched: the Milestone 4 file keeps playing it. You can copy it out as an AETH3 code, or carry it into this milestone.',
      codeLabel: 'Your Milestone 4 save code', codeCls: 'code-m4', exportLabel: 'Export M4 backup (AETH3)', carryLabel: 'Carry over my M4 save',
    });
  }
  if (hasV2()) {
    earlier({
      cls: 'set-m3', title: 'Your Milestone 3 save', who: 'Milestone 3', kind: 'm3', read: readV2, exportOld: exportV2Code,
      blurb: 'Verdant Wilds journey is still on this device, untouched: the Milestone 3 file keeps playing it. You can copy it out as an AETH2 code, or carry it into this milestone.',
      codeLabel: 'Your Milestone 3 save code', codeCls: 'code-v2', exportLabel: 'Export M3 backup (AETH2)', carryLabel: 'Carry over my M3 save',
    });
  }
  if (hasV1()) {
    earlier({
      cls: 'set-m2', title: 'Your M2 save', who: 'M2', kind: 'm2', read: readV1, exportOld: exportV1Code,
      blurb: 'Gauntlet journey is still on this device, untouched: the M2 page keeps playing it. You can copy it out as an AETH1 code, or carry it into this milestone.',
      codeLabel: 'Your M2 save code', codeCls: 'code-v1', exportLabel: 'Export M2 backup (AETH1)', carryLabel: 'Restore my M2 save',
    });
  }

  // ---- the previous save (the live save's .bak) ----
  if (hasBackup()) {
    const prev = el('section', 'set-prev panel');
    prev.append(el('h2', 'label', 'The previous save'), el('p', 'small', 'A backup is kept every time a new game, a loaded code or a restore replaces your journey.'));
    const ask = el('div', 'confirm-box'); ask.hidden = true;
    const rb = button('Restore previous save', 'btn', () => { rb.hidden = true; ask.hidden = false; ctx.audio.sfx('select'); ask.querySelector('.btn').focus(); });
    ask.append(
      el('p', '', saved() ? `${esc(name(ctx.game))}’s journey and the backup swap places, so you can always swap back.` : 'The backup becomes your journey again.'),
      el('div', 'row-btns', [
        button('Restore it', 'btn primary', () => {
          const cur = saved() ? ctx.game : null;
          const g = restoreBackup(ctx.migrate);
          if (!g) { ctx.toast('The backup could not be read.'); ctx.audio.sfx('error'); return; }
          // swap: the journey we are leaving becomes the new backup
          if (cur) { saveGame(cur); backupGame(); }
          ctx.replaceGame(g, { backup: false });
          ctx.audio.sfx('reveal', { tier: 2 });
          ctx.toast(`Welcome back, ${g.party.roster.warden.name}.`);
          ctx.go('world', { arrive: 'load' });
        }),
        button('Keep this one', 'btn', () => { ask.hidden = true; rb.hidden = false; ctx.audio.sfx('back'); rb.focus(); }),
      ]),
    );
    prev.append(rb, ask);
    root.append(prev);
  }

  // ---- start over ----
  const danger = el('section', 'set-danger panel');
  danger.append(el('h2', 'label', 'Start over'));
  const confirmBox = el('div', 'confirm-box'); confirmBox.hidden = true;
  const startBtn = button('Start over', 'btn danger', () => { confirmBox.hidden = false; startBtn.hidden = true; ctx.audio.sfx('select'); confirmBox.querySelector('.danger').focus(); });
  startBtn.disabled = !ctx.game;
  confirmBox.append(
    el('p', '', `This erases ${esc(name(ctx.game))}’s journey from this device: gear, Codex, all of it. Make a save code first if you might want it back.${hasV1() ? ' Your M2 save stays, and can be carried over again from here.' : ''}`),
    el('div', 'row-btns', [
      button('Yes, erase it', 'btn danger', () => { ctx.clearGame(); ctx.audio.sfx('defeat'); ctx.toast('The hearth is swept. A new Warden can begin.'); ctx.go('title'); }),
      button('Keep playing', 'btn', () => { confirmBox.hidden = true; startBtn.hidden = false; ctx.audio.sfx('back'); startBtn.focus(); }),
    ]),
  );
  danger.append(el('p', 'small', 'Wipes the saved game on this device. Settings stay.'), startBtn, confirmBox);
  root.append(danger);

  return { onAction: screenNav(root, { back }) };
}
