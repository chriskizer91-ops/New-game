// New game: name your Hearthwarden, pick a look, roll ability scores, choose a starter heirloom,
// then the prologue and the road.
import { renderHero, HERO_ART, WARDEN_PRESETS, MAT, diceIcon, aspectIcon, renderBackdrop } from '../../art/index.js';
import { newGame } from '../../rules/gauntlet.js';
import { relicItem } from '../../rules/loot.js';
import { createRng } from '../../core/rng.js';
import { RELICS } from '../../data/relics.js';
import { STARTERS } from '../../data/heroes.js';
import { el, esc, button, toCanvas, modText, sleep } from '../lib/dom.js';
import { animate, isReduced } from '../lib/anim.js';
import { portraitCanvas } from '../lib/art.js';
import { mainStat, ABIL, ABIL_NAME } from '../lib/items.js';
import { screenNav } from '../lib/keys.js';

const STEPS = ['Name', 'Look', 'Abilities', 'Heirloom', 'Prologue'];
const NAMES = ['Wren', 'Tess', 'Bram', 'Rowan', 'Maren', 'Corin', 'Ada', 'Hale', 'Isla', 'Odo'];
const STANDARD = [15, 14, 13, 12, 10, 8];
const ARRAY_ORDER = ['STR', 'CON', 'DEX', 'CHA', 'WIS', 'INT'];
const MAX_ROLLS = 3;
const HAIR_NAME = { short: 'Short', crop: 'Cropped', long: 'Long', pony: 'Ponytail', braid: 'Braid', none: 'Shaved' };
const BEATS = { hearthbrand: 'stillwater-lance', 'stillwater-lance': 'cairnmaul', cairnmaul: 'hearthbrand' };
const BEATEN_BY = { hearthbrand: 'cairnmaul', 'stillwater-lance': 'hearthbrand', cairnmaul: 'stillwater-lance' };
const TAMSIN = {
  hearthbrand: 'Tamsin Vale hefts Cairnmaul off its hooks like it weighs nothing. “Stone smothers fire, Warden. Try to keep up.”',
  'stillwater-lance': 'Tamsin Vale has Hearthbrand out of its scabbard before Fenwick can object. “Fire melts ice. Nothing personal.”',
  cairnmaul: 'Tamsin Vale spins the Stillwater Lance once and grins at you over the point. “Frost splits stone. You’ll want to remember that.”',
};
const KIT = { hearthbrand: 'Sword and shield', 'stillwater-lance': 'Spear and buckler', cairnmaul: 'Two-handed hammer' };

const swatch = mat => { const p = MAT[mat]?.pal; if (!p) return '#888'; const c = p[3]; return `rgb(${c[0]},${c[1]},${c[2]})`; };
const mod = s => Math.floor((s - 10) / 2);

export function mount(root, ctx) {
  const S = {
    step: 0,
    name: '',
    look: { skin: 'skin', hairMat: 'hairAuburn', hair: 'short', beard: false, eye: WARDEN_PRESETS.eye[0] },
    scores: null, rolls: null, rollsLeft: MAX_ROLLS, method: null, sel: null,
    starter: null,
  };
  const head = el('header', 'ng-head');
  const body = el('div', 'ng-body');
  root.append(head, body);
  ctx.audio.music('title');

  function header() {
    head.replaceChildren();
    const back = button('‹ Back', 'btn ghost back', () => goBack());
    const dots = el('ol', { class: 'ng-steps', 'aria-label': 'Steps' });
    STEPS.forEach((n, i) => dots.append(el('li', { class: i === S.step ? 'on' : i < S.step ? 'done' : '', 'aria-current': i === S.step ? 'step' : null }, [el('span', 'n', String(i + 1)), el('span', 'l', n)])));
    head.append(back, el('div', 'ng-title', `<span class="realm">A new Hearthwarden</span><h1 class="title-display">${esc(['Name your Hearthwarden', 'How do they look?', 'Roll your ability scores', 'Choose a starter heirloom', 'The night the hearth flickered'][S.step])}</h1>`), dots);
    if (S.step === 4) back.hidden = true;
  }
  function goBack() {
    ctx.audio.sfx('back');
    if (S.step === 0) { ctx.go('title'); return; }
    if (S.step === 4) return;
    S.step--; render();
  }
  function next() { ctx.audio.sfx('confirm'); S.step++; render(); }

  function render() {
    header();
    body.replaceChildren();
    [stepName, stepLook, stepAbilities, stepHeirloom, stepPrologue][S.step]();
    window.scrollTo(0, 0);
  }

  // ---- 1. name ----
  function stepName() {
    const form = el('form', 'ng-name panel');
    const label = el('label', { for: 'wname', class: 'label' }, 'Your Hearthwarden’s name');
    const input = el('input', { id: 'wname', class: 'ng-input', type: 'text', maxlength: '18', autocomplete: 'off', spellcheck: 'false', placeholder: 'Wren', value: S.name });
    const nextBtn = button('Next: how they look', 'btn primary big', null, { type: 'submit', 'data-primary': '' });
    const upd = () => { nextBtn.disabled = !input.value.trim(); };
    input.addEventListener('input', () => { S.name = input.value.replace(/\s+/g, ' ').slice(0, 18); upd(); });
    form.addEventListener('submit', e => { e.preventDefault(); if (!input.value.trim()) return; S.name = input.value.trim(); next(); });
    const sug = el('div', 'ng-sugs');
    for (const n of NAMES.slice(0, 6)) sug.append(button(n, 'btn chip', () => { input.value = n; S.name = n; upd(); ctx.audio.sfx('select'); input.focus(); }));
    form.append(
      el('p', 'lede', 'The Keep raised you by its fire. The Council knows your face. Now it needs your name, because tonight it is going to need you.'),
      label, input, el('p', 'label sugs-l', 'Or take a Keep name'), sug, nextBtn,
    );
    body.append(form);
    upd();
    if (matchMedia('(pointer: fine)').matches) setTimeout(() => input.focus(), 30);
  }

  // ---- 2. look ----
  function stepLook() {
    const wrap = el('div', 'ng-look');
    const view = el('div', 'hero-view big');
    const cv = el('canvas', { class: 'px', role: 'img', 'aria-label': `${S.name}, the Hearthwarden` });
    cv.width = cv.height = 64;
    view.append(cv, el('span', 'hv-name', esc(S.name)));
    const gear = { ...HERO_ART.warden.starter, head: null, hands: null, amulet: null, ring: null };
    animate(cv, t => toCanvas(renderHero('warden', gear, { pose: 'idle', t, custom: S.look, reduced: isReduced() }), cv), 10);
    const opts = el('div', 'ng-opts panel');
    const group = (title, key, values, render) => {
      const g = el('fieldset', 'opt-group');
      g.append(el('legend', 'label', title));
      const row = el('div', 'opt-row');
      values.forEach((v, i) => {
        const b = el('button', { type: 'button', class: 'opt', 'aria-pressed': String(S.look[key] === v) });
        render(b, v, i);
        b.addEventListener('click', () => { S.look[key] = v; ctx.audio.sfx('select'); row.querySelectorAll('.opt').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
        row.append(b);
      });
      g.append(row);
      return g;
    };
    opts.append(
      group('Skin', 'skin', WARDEN_PRESETS.skin, (b, v, i) => { b.classList.add('sw'); b.style.setProperty('--c', swatch(v)); b.setAttribute('aria-label', `Skin tone ${i + 1}`); }),
      group('Hair colour', 'hairMat', WARDEN_PRESETS.hairMat, (b, v) => { b.classList.add('sw'); b.style.setProperty('--c', swatch(v)); b.setAttribute('aria-label', v.replace('hair', '') + ' hair'); }),
      group('Hair', 'hair', WARDEN_PRESETS.hair, (b, v) => { b.textContent = HAIR_NAME[v] || v; }),
      group('Beard', 'beard', WARDEN_PRESETS.beard, (b, v) => { b.textContent = v ? 'Beard' : 'Clean'; }),
      group('Eyes', 'eye', WARDEN_PRESETS.eye, (b, v, i) => { b.classList.add('sw'); b.style.setProperty('--c', v); b.setAttribute('aria-label', `Eye colour ${i + 1}`); }),
    );
    const acts = el('div', 'ng-acts');
    acts.append(button('Roll a look', 'btn', () => {
      const P = WARDEN_PRESETS, pick = a => a[Math.floor(Math.random() * a.length)];
      S.look = { skin: pick(P.skin), hairMat: pick(P.hairMat), hair: pick(P.hair), beard: pick(P.beard), eye: pick(P.eye) };
      ctx.audio.sfx('dice'); render();
    }), button('Next: ability scores', 'btn primary big', next, { 'data-primary': '' }));
    wrap.append(view, el('div', 'ng-look-r', [opts, acts]));
    body.append(wrap);
  }

  // ---- 3. abilities ----
  function stepAbilities() {
    const sheet = el('section', 'ng-sheet panel');
    sheet.append(el('p', 'lede', 'Roll 4d6 for each ability and drop the lowest die, the old way. You get three rolls in all, or take the standard array. Tap two scores to swap them.'));
    const table = el('div', { class: 'abil-table', role: 'list' });
    sheet.append(table);
    const rows = {};
    for (const a of ABIL) {
      const r = el('button', { type: 'button', class: 'abil-row', role: 'listitem', 'data-a': a });
      r.innerHTML = `<span class="ab"><b>${a}</b><small>${ABIL_NAME[a]}</small></span><span class="dice"></span><span class="tot">–</span><span class="md">–</span>`;
      r.addEventListener('click', () => pickRow(a));
      rows[a] = r; table.append(r);
    }
    const note = el('p', 'ng-note', 'The Hearthwarden fights up close: Strength for the blow, Constitution to take one back, Charisma for the Keep’s oaths.');
    const acts = el('div', 'ng-acts');
    const rollBtn = button('Roll 4d6', 'btn primary big', () => doRoll(), { 'data-primary': '' });
    const arrBtn = button('Use the standard array', 'btn', () => useArray());
    const nextBtn = button('Next: your heirloom', 'btn primary big', next);
    acts.append(rollBtn, arrBtn, nextBtn);
    sheet.append(note, acts);
    body.append(sheet);

    function paint(anim) {
      for (const a of ABIL) {
        const r = rows[a], dice = r.querySelector('.dice');
        dice.replaceChildren();
        const roll = S.rolls?.[a];
        if (roll) {
          const low = roll.indexOf(Math.min(...roll));
          roll.forEach((v, i) => dice.append(toCanvas(diceIcon(6, { value: v, size: 16, mat: 'bone', state: i === low ? 'dim' : '' }), null, 2)));
        } else if (S.scores) dice.append(el('span', 'arr', 'standard array'));
        else for (let i = 0; i < 4; i++) dice.append(toCanvas(diceIcon(6, { size: 16, mat: 'bone', state: 'dim' }), null, 2));
        const s = S.scores?.[a];
        r.querySelector('.tot').textContent = s ?? '–';
        r.querySelector('.md').textContent = s != null ? modText(mod(s)) : '–';
        r.classList.toggle('sel', S.sel === a);
        r.disabled = !S.scores;
        r.setAttribute('aria-label', s != null ? `${ABIL_NAME[a]} ${s}, modifier ${modText(mod(s))}${S.sel === a ? ', selected to swap' : ''}` : ABIL_NAME[a]);
        if (anim) r.classList.add('landed');
      }
      rollBtn.textContent = S.rollsLeft === MAX_ROLLS ? 'Roll 4d6' : S.rollsLeft > 0 ? `Reroll all (${S.rollsLeft} left)` : 'No rolls left';
      rollBtn.disabled = S.rollsLeft <= 0;
      if (S.scores) { rollBtn.removeAttribute('data-primary'); rollBtn.className = 'btn'; nextBtn.setAttribute('data-primary', ''); }
      nextBtn.disabled = !S.scores;
      nextBtn.hidden = !S.scores;
      const total = S.scores ? ABIL.reduce((t, a) => t + mod(S.scores[a]), 0) : null;
      note.textContent = S.scores ? `Modifiers add up to ${modText(total)}. ${total >= 5 ? 'The dice like you.' : total >= 2 ? 'A solid Warden.' : 'Lean, but heroes have started with less.'} Tap two scores to swap them.` : note.textContent;
    }
    async function doRoll() {
      if (S.rollsLeft <= 0) return;
      S.rollsLeft--; S.method = 'roll'; S.sel = null;
      ctx.audio.sfx('dice');
      const rolls = {}, scores = {};
      for (const a of ABIL) { const r = [0, 0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6)); rolls[a] = r; scores[a] = r.reduce((x, y) => x + y, 0) - Math.min(...r); }
      rollBtn.disabled = arrBtn.disabled = true;
      if (!isReduced()) {
        // tumble: each row spins, then lands in turn
        const t0 = performance.now();
        await new Promise(res => {
          const tick = () => {
            const e = performance.now() - t0;
            ABIL.forEach((a, i) => {
              const landAt = 260 + i * 110, dice = rows[a].querySelector('.dice');
              if (e < landAt) { dice.replaceChildren(...[0, 1, 2, 3].map(k => toCanvas(diceIcon(6, { value: 1 + ((Math.floor(e / 60) + k * 3 + i) % 6), size: 16, spin: (Math.floor(e / 60) + k) & 3 }), null, 2))); }
              else if (!rows[a].dataset.done) { rows[a].dataset.done = '1'; ctx.audio.sfx('select'); }
            });
            if (e < 260 + ABIL.length * 110) requestAnimationFrame(tick); else res();
          };
          requestAnimationFrame(tick);
        });
        for (const a of ABIL) delete rows[a].dataset.done;
      }
      S.rolls = rolls; S.scores = scores;
      arrBtn.disabled = false;
      paint(true);
    }
    function useArray() {
      S.method = 'array'; S.rolls = null; S.sel = null;
      S.scores = {}; ARRAY_ORDER.forEach((a, i) => { S.scores[a] = STANDARD[i]; });
      ctx.audio.sfx('page');
      paint();
    }
    function pickRow(a) {
      if (!S.scores) return;
      if (!S.sel) { S.sel = a; ctx.audio.sfx('select'); paint(); return; }
      if (S.sel !== a) {
        const b = S.sel;
        [S.scores[a], S.scores[b]] = [S.scores[b], S.scores[a]];
        if (S.rolls) [S.rolls[a], S.rolls[b]] = [S.rolls[b], S.rolls[a]];
        ctx.audio.sfx('confirm');
      }
      S.sel = null; paint();
    }
    paint();
  }

  // ---- 4. heirloom ----
  function stepHeirloom() {
    const wrap = el('div', 'ng-heir');
    const tri = el('section', 'triangle panel');
    const ic = a => toCanvas(aspectIcon(a, { size: 12 }), null, 3);
    tri.append(el('p', 'lede', 'Fenwick unlocks the reliquary. Three heirlooms have slept on its hooks since the Keep was built. One of them will wake for you, and the aspects hold each other in check:'));
    const t = el('div', 'tri');
    const NAMES_A = { ember: 'Fire', frost: 'Frost', stone: 'Stone' };
    for (const [a, verb, b] of [['ember', 'melts', 'frost'], ['frost', 'splits', 'stone'], ['stone', 'smothers', 'ember']]) {
      t.append(el('div', 'tri-row', [ic(a), el('b', `asp-${a}`, NAMES_A[a]), el('span', 'v', verb), ic(b), el('b', `asp-${b}`, NAMES_A[b])]));
    }
    tri.append(t, el('p', 'small', 'A hit on the aspect you beat lands half again as hard. A hit on the one that beats you lands at half.'));
    const cards = el('div', 'starters');
    const ids = Object.keys(STARTERS);
    const cardEls = {};
    ids.forEach((id, i) => {
      const R = RELICS[id];
      const item = relicItem(id, createRng('starter-' + id), { from: 'the Keep reliquary', where: 'Hearthstone Keep', day: 1 });
      const c = el('article', { class: 'starter', 'data-r': 'heirloom', 'data-id': id });
      const p = portraitCanvas(item, { size: 64 });
      p.canvas.style.width = p.canvas.style.height = '128px';
      const ms = mainStat(item);
      c.append(
        el('div', 'st-port', [p.canvas]),
        el('div', 'st-txt', `<h3>${esc(R.name)}</h3><p class="itype">${esc(KIT[id])} · ${esc(R.aspect)}</p><p class="dmg">${ms.v}</p><p class="pw"><b>${esc(R.power.name)}</b> ${esc(R.power.text)}</p><p class="beats">Beats ${esc(RELICS[BEATS[id]].name)} · beaten by ${esc(RELICS[BEATEN_BY[id]].name)}</p>`),
      );
      const take = button(`Take ${esc(R.name)}`, 'btn primary take', () => choose(id), { 'data-pick': String(i + 1) });
      c.append(take);
      cardEls[id] = c;
      cards.append(c);
    });
    const tamsin = el('section', 'tamsin panel'); tamsin.hidden = true;
    const nextBtn = button('Begin', 'btn primary big', () => begin(), { 'data-primary': '' });
    nextBtn.hidden = true;
    wrap.append(tri, cards, tamsin, el('div', 'ng-acts', [nextBtn]));
    body.append(wrap);
    function choose(id) {
      S.starter = id;
      ctx.audio.sfx('reveal', { tier: 5 });
      for (const [k, c] of Object.entries(cardEls)) {
        c.classList.toggle('chosen', k === id); c.classList.toggle('taken', k === BEATEN_BY[id]); c.classList.toggle('left', k !== id && k !== BEATEN_BY[id]);
        c.querySelector('.take').textContent = k === id ? `${RELICS[k].name} is yours` : `Take ${RELICS[k].name}`;
      }
      tamsin.hidden = false;
      tamsin.innerHTML = `<p class="label">Tamsin Vale, Warden Isolde’s ward</p><p class="line">${esc(TAMSIN[id])}</p><p class="small">${esc(RELICS[id].name)} wakes in your hand. ${esc(RELICS[BEATEN_BY[id]].name)} goes over Tamsin’s shoulder. You will see it again.</p>`;
      nextBtn.hidden = false;
      nextBtn.textContent = `Begin with ${RELICS[id].name}`;
      setTimeout(() => tamsin.scrollIntoView({ behavior: isReduced() ? 'auto' : 'smooth', block: 'center' }), 60);
    }
    function begin() {
      if (!S.starter) return;
      const seed = ((Date.now() % 2147483647) ^ Math.floor(Math.random() * 2147483647)) >>> 0;
      const g = newGame({ name: S.name.trim() || 'Wren', starter: S.starter, seed, base: { ...S.scores } });
      const warden = { ...g.party.roster.warden, look: { ...S.look } };
      ctx.setGame({ ...g, party: { ...g.party, roster: { ...g.party.roster, warden } } });
      ctx.audio.sfx('confirm');
      S.step = 4; render();
    }
  }

  // ---- 5. prologue ----
  function stepPrologue() {
    const starter = RELICS[S.starter] || RELICS.hearthbrand, taken = RELICS[BEATEN_BY[S.starter] || 'cairnmaul'];
    const LINES = [
      { t: 'Hearthstone Keep, the Council hall. The Elders have argued about grain tithes since noon, and the Eternal Hearth has burned behind them for nine hundred years without once being asked for its opinion.' },
      { t: 'Mid-sentence, it gutters. Every torch in the hall goes blue. Nobody finishes the sentence.', blue: true },
      { t: 'Fenwick the hearthkeeper is on his feet first. He does not look surprised. He looks caught.', blue: true },
      { t: `He unlocks the reliquary and puts ${starter.name} in your hands. “It woke up a little just now. So did everything else.” Tamsin already has ${taken.name} over her shoulder.` },
      { t: 'Then the vault door bangs. A Tallyman thief is running for the gate with the Warden’s Seal swinging on his belt. You can see it glint from here.' },
    ];
    let i = 0;
    const wrap = el('section', 'prologue');
    const scene = el('div', 'pro-scene');
    const cv = el('canvas', { class: 'px', 'aria-hidden': 'true' });
    scene.append(cv);
    const text = el('p', { class: 'pro-text', 'aria-live': 'polite' });
    const btn = button('Continue', 'btn primary big', () => step(), { 'data-primary': '' });
    const skip = button('Skip to the road', 'btn ghost', () => { ctx.go('road'); });
    wrap.append(scene, text, el('div', 'ng-acts', [btn, skip]));
    body.append(wrap);
    let W = 0, H = 80;
    const size = () => {
      const k = innerWidth < 520 ? 3 : 4;
      W = Math.max(60, Math.floor(Math.min(scene.clientWidth || innerWidth - 42, 1000) / k));
      cv.width = W; cv.height = H; cv.style.width = W * k + 'px'; cv.style.height = H * k + 'px';
    };
    size();
    requestAnimationFrame(size);
    animate(cv, t => toCanvas(renderBackdrop('hearth-road', { w: W, h: H, t, reduced: isReduced() }), cv), 10);
    const show = async () => {
      const L = LINES[i];
      scene.classList.toggle('blue', !!L.blue);
      if (L.blue && i === 1) ctx.audio.sfx('phase');
      text.classList.remove('in'); await sleep(isReduced() ? 0 : 60);
      text.textContent = L.t; text.classList.add('in');
      btn.textContent = i === LINES.length - 1 ? 'Take the road' : 'Continue';
      skip.hidden = i === LINES.length - 1;
    };
    function step() {
      if (i < LINES.length - 1) { i++; ctx.audio.sfx('page'); show(); return; }
      ctx.audio.sfx('confirm');
      ctx.go('road');
    }
    show();
  }

  render();
  const nav = screenNav(root, { back: goBack, pick: n => { const b = root.querySelector(`[data-pick="${n}"]`); if (b && !b.disabled) { b.click(); return true; } return false; } });
  return { onAction: nav };
}
