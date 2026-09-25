// Audio facade. Screens call these names; the WebAudio synth lives behind them.
// Until audio is unlocked by a user gesture every call is silent (music requests are
// remembered and start on unlock). Sound effects and music switch on and off separately.
//
// sfx names: select confirm back dice hit graze miss crit heal status disarm ko surge legend
//            victory defeat phase chest reveal equip levelup hearth
//            (extra: beam tick stamp coin page identify slam error)
//   opts: { tier } for rarity-scaled sounds (reveal, equip, beam: 0 worn .. 7 primal)
// music tracks: title road battle boss victory hearth  (null stops music; victory does not loop)
//
// API: unlock() setEnabled(on) setMusicEnabled(on) enabled musicEnabled sfx(name, opts)
//      music(track) track duck(amount, seconds)

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freqOf = name => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) return 0;
  const n = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
  return 440 * Math.pow(2, (n - 69) / 12);
};

// ---- the tracks ------------------------------------------------------------------------------
// Each part is a string of step tokens: a note ("D5"), a chord ("D4+F#4"), "-" to hold the
// previous note one more step, "." for a rest. Drum parts use k (kick) s (snare) h (hat)
// c (ember crackle). Parts loop independently over their own length.
const TRACKS = {
  // warm, hearth-lit: music-box arpeggios over a slow bass, the melody arrives on the second pass
  title: {
    bpm: 84, sub: 2, loop: true, gain: .9,
    parts: [
      { v: 'bell', g: .07, s: 'D5 A5 F#5 A5 D6 A5 F#5 A5 B4 F#5 D5 F#5 B5 F#5 D5 F#5 G4 D5 B4 D5 G5 D5 B4 D5 A4 E5 C#5 E5 A5 E5 C#5 E5 D5 A5 F#5 A5 D6 A5 F#5 A5 B4 F#5 D5 F#5 B5 F#5 D5 F#5 E5 B5 G5 B5 E6 B5 G5 B5 A4 E5 C#5 E5 G5 E5 C#5 A4' },
      { v: 'tri', g: .16, s: 'D3 - - - A2 - - - B2 - - - F#2 - - - G2 - - - D3 - - - A2 - - - E2 - - - D3 - - - A2 - - - B2 - - - F#2 - - - E2 - - - B2 - - - A2 - - - C#3 - - -' },
      { v: 'pulse', g: .05, lp: 1800, s: '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . F#5 - - - E5 - D5 - D5 - - - C#5 - B4 - B4 - - - E5 - G5 - F#5 - - - E5 - - -' },
    ],
  },
  // adventurous: a marching pulse lead, octave bass, light drums
  road: {
    bpm: 116, sub: 2, loop: true, gain: .8,
    parts: [
      { v: 'pulse', g: .06, lp: 2600, s: 'G4 - B4 - D5 - - B4 A4 - - - F#4 - A4 - B4 - G4 - E5 - D5 - C5 - - - E5 - D5 C5 B4 - D5 - G5 - - F#5 E5 - D5 - A4 - - - C5 - E5 - G5 - E5 - D5 - - - F#5 - A5 -' },
      { v: 'tri', g: .15, s: 'G2 . G3 . G2 . G3 . D2 . D3 . D2 . D3 . E2 . E3 . E2 . E3 . C3 . C4 . C3 . C4 . G2 . G3 . G2 . G3 . D2 . D3 . D2 . D3 . C3 . C4 . C3 . C4 . D2 . D3 . D2 . F#2 .' },
      { v: 'pluck', g: .035, s: 'B4 D5 G5 D5 . . . . F#4 A4 D5 A4 . . . . G4 B4 E5 B4 . . . . G4 C5 E5 C5 . . . .' },
      { v: 'drum', g: .5, s: 'k . h . s . h h k . h . s . h h k . h . s . h h k . h k s . h h' },
    ],
  },
  // driving: sixteenth-note bass and a minor-key lead
  battle: {
    bpm: 144, sub: 4, loop: true, gain: .8,
    parts: [
      { v: 'pulse', g: .055, lp: 2800, s: 'A4 - C5 - E5 - A5 - G5 - E5 - C5 - D5 - C5 - - - A4 - C5 - F5 - E5 - D5 - C5 - B4 - D5 - G5 - - - F5 - D5 - B4 - D5 - E5 - - - G#4 - B4 - E5 - - - D5 - B4 -' },
      { v: 'tri', g: .17, s: 'A2 . A2 . A3 . A2 . A2 . A3 . G2 . A2 . F2 . F2 . F3 . F2 . F2 . F3 . E2 . F2 . G2 . G2 . G3 . G2 . G2 . G3 . F2 . G2 . E2 . E2 . E3 . E2 . E2 . E3 . D2 . E2 .' },
      { v: 'square', g: .022, lp: 1600, s: 'A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5 F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4 G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4 E4 G#4 B4 G#4 E4 G#4 B4 G#4 E4 G#4 B4 G#4 E4 G#4 B4 G#4' },
      { v: 'drum', g: .55, s: 'k . h . s . h . k k h . s . h h' },
    ],
  },
  // intense: chromatic bass, stabbed chords, a lead that climbs
  boss: {
    bpm: 156, sub: 4, loop: true, gain: .85,
    parts: [
      { v: 'pulse', g: .06, lp: 3000, s: 'D5 - - - A4 - - - D5 - E5 - F5 - - - E5 - D5 - C#5 - D5 - A4 - - - - - - - F5 - - - D5 - Bb4 - F5 - G5 - A5 - - - G#5 - A5 - - - E5 - C#5 - - - A4 - - -' },
      { v: 'tri', g: .18, s: 'D2 . D2 . D3 . D2 . C3 . D2 . A2 . D2 . D2 . D2 . D3 . D2 . F2 . E2 . D2 . C#2 . Bb1 . Bb1 . Bb2 . Bb1 . Bb1 . Bb2 . A1 . Bb1 . A1 . A1 . A2 . A1 . C#3 . A2 . E2 . A1 .' },
      { v: 'pad', g: .05, s: 'D4+F4+A4 - - - . . . . D4+F4+A4 - . . . . . . D4+F4+A4 - - - . . . . D4+G4+Bb4 - . . C#4+E4+A4 - . . Bb3+D4+F4 - - - . . . . Bb3+D4+F4 - . . . . . . A3+C#4+E4 - - - . . . . A3+C#4+E4 - . . A3+C#4+G4 - . .' },
      { v: 'drum', g: .6, s: 'k . h k s . h . k k h . s . h s' },
    ],
  },
  // calm campfire: slow bell arpeggios, a whole-note bass and the odd ember crackle
  hearth: {
    bpm: 66, sub: 2, loop: true, gain: .9,
    parts: [
      { v: 'bell', g: .06, s: 'F4 A4 C5 A4 F5 C5 A4 C5 E4 G4 C5 G4 E5 C5 G4 C5 D4 F4 A4 F4 D5 A4 F4 A4 Bb3 D4 F4 D4 Bb4 F4 D4 F4 F4 A4 C5 A4 F5 C5 A4 C5 C4 E4 G4 E4 C5 G4 E4 G4 Bb3 D4 F4 D4 Bb4 F4 D4 F4 C4 E4 G4 E4 C5 G4 E4 G4' },
      { v: 'tri', g: .13, s: 'F2 - - - - - - - E2 - - - - - - - D2 - - - - - - - Bb1 - - - - - - - F2 - - - - - - - C2 - - - - - - - Bb1 - - - - - - - C2 - - - - - - -' },
      { v: 'flute', g: .045, s: '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . A5 - - - G5 - F5 - G5 - - - E5 - C5 - D5 - - - F5 - Bb5 - A5 - - - G5 - - -' },
      { v: 'drum', g: .5, s: 'c . . . . c . . . . c . . . . . . c . . . . . c . . . c . . . .' },
    ],
  },
  // the fanfare: plays once
  victory: {
    bpm: 132, sub: 4, loop: false, gain: 1,
    parts: [
      { v: 'pulse', g: .08, lp: 3200, s: 'G4 . G4 . G4 . C5 - - - - - E5 - G5 - E5 - - - G5 - - - C6 - - - - - - - - - - - - - - -' },
      { v: 'square', g: .03, lp: 2000, s: 'E4 . E4 . E4 . G4 - - - - - C5 - E5 - C5 - - - E5 - - - G5 - - - - - - - - - - - - - - -' },
      { v: 'tri', g: .17, s: 'C3 - - - - - - - - - - - G2 - - - C3 - - - G2 - - - C3 - - - - - - - - - - - - - - -' },
      { v: 'bell', g: .05, s: '. . . . . . . . . . . . . . . . . . . . . . . . C5+E5+G5+C6 - - - - - - - - - - - - - - -' },
      { v: 'drum', g: .5, s: 'k . . . k . s . . . . . k . s . k . . . s . . . k . . . . . . . . . . . . . . .' },
    ],
  },
};

// Parse a part string into per-step events: { step, notes:[freq], dur (steps), drum }
function parsePart(p) {
  const toks = p.s.trim().split(/\s+/);
  const ev = new Array(toks.length).fill(null);
  let last = null;
  toks.forEach((t, i) => {
    if (t === '-') { if (last) last.dur++; return; }
    if (t === '.') { last = null; return; }
    if (p.v === 'drum') { ev[i] = { drum: t, dur: 1 }; last = null; return; }
    last = { notes: t.split('+').map(freqOf).filter(Boolean), dur: 1 };
    ev[i] = last;
  });
  return { ...p, ev, len: toks.length };
}
const PARSED = Object.fromEntries(Object.entries(TRACKS).map(([k, T]) => [k, { ...T, parts: T.parts.map(parsePart), len: Math.max(...T.parts.map(p => p.s.trim().split(/\s+/).length)) }]));

export function createAudio() {
  let enabled = true, musicOn = true, unlocked = false;
  let AC = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, pulseWave = null;
  let wanted = null, playing = null;

  function ctx() {
    if (!unlocked) return null;
    if (!AC) {
      try {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        AC = new C();
        master = AC.createGain(); master.gain.value = .6;
        const comp = AC.createDynamicsCompressor();
        master.connect(comp); comp.connect(AC.destination);
        sfxBus = AC.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
        musicBus = AC.createGain(); musicBus.gain.value = .5; musicBus.connect(master);
        const n = AC.sampleRate * 1.5; noiseBuf = AC.createBuffer(1, n, AC.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        // a 25% pulse: the NES lead colour
        const N = 32, re = new Float32Array(N), im = new Float32Array(N);
        for (let k = 1; k < N; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * .25);
        pulseWave = AC.createPeriodicWave(re, im);
      } catch { AC = null; return null; }
    }
    if (AC.state === 'suspended' && !document.hidden) AC.resume().catch(() => {});
    return AC;
  }

  // ---- synth primitives (ported from the Loot Forge prototype) ----
  function env(g, t, peak, a, dur, sustain = 1) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (sustain < 1) g.gain.linearRampToValueAtTime(peak * sustain, t + Math.max(a + .01, dur * .5));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  }
  function tone(f, t, dur, o = {}, out = sfxBus) {
    const osc = AC.createOscillator(), g = AC.createGain();
    if (o.type === 'pulse') osc.setPeriodicWave(pulseWave); else osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur * .8);
    if (o.det) osc.detune.value = o.det;
    if (o.vib) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = o.vib; lg.gain.value = f * .012; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + .05); }
    env(g, t, o.g || .15, o.a || .006, dur, o.sus ?? 1);
    let node = g;
    if (o.lp) { const f2 = AC.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; g.connect(f2); node = f2; }
    osc.connect(g); node.connect(out); osc.start(t); osc.stop(t + dur + .05);
  }
  function bell(f, t, dur, g = .12, lp, out = sfxBus, ratio = 2.76) {
    const c = AC.createOscillator(), m = AC.createOscillator(), mg = AC.createGain(), a = AC.createGain();
    c.frequency.value = f; m.frequency.value = f * ratio;
    mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * .02, t + dur);
    m.connect(mg); mg.connect(c.frequency);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + .004); a.gain.exponentialRampToValueAtTime(.0001, t + dur);
    c.connect(a); let node = a;
    if (lp) { const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; a.connect(fl); node = fl; }
    node.connect(out); c.start(t); m.start(t); c.stop(t + dur + .05); m.stop(t + dur + .05);
  }
  function noise(t, dur, o = {}, out = sfxBus) {
    const src = AC.createBufferSource(); src.buffer = noiseBuf;
    const f = AC.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q || 1;
    const g = AC.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.g || .2, t + (o.a || .01)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    const off = Math.random() * .5; src.start(t, off, dur + .05);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---- sound effects ----
  const CHIME = [[659], [587, 880], [523, 659, 784, 1047], [587, 740, 880, 1109, 1480], [523, 659, 784, 1047, 1319, 1568], [698, 880, 1047, 1319, 1480, 1760, 2093], [622, 784, 932, 1245, 1568, 1865, 2489], [784, 988, 1175, 1568, 1976, 2349, 3136]];
  const clampTier = t => Math.max(0, Math.min(7, t | 0));
  const SFX = {
    select(t) { tone(1400, t, .05, { type: 'square', g: .025 }); },
    tick(t) { SFX.select(t); },
    confirm(t) { tone(660, t, .08, { type: 'triangle', g: .09 }); tone(990, t + .06, .14, { type: 'triangle', g: .09 }); },
    back(t) { tone(700, t, .07, { type: 'triangle', g: .07 }); tone(470, t + .05, .12, { type: 'triangle', g: .07 }); },
    error(t) { tone(150, t, .18, { type: 'square', g: .05, lp: 800 }); tone(140, t + .1, .2, { type: 'square', g: .05, lp: 800 }); },
    dice(t) { for (let k = 0; k < 6; k++) { const s = t + k * rnd(.035, .07); noise(s, .04, { type: 'bandpass', f: rnd(1800, 3200), q: 4, g: .18 }); tone(rnd(700, 1100), s, .04, { type: 'triangle', g: .04 }); } },
    hit(t) { noise(t, .14, { type: 'lowpass', f: 1600, g: .32 }); tone(170, t, .16, { to: 70, g: .28, type: 'triangle' }); },
    graze(t) { noise(t, .1, { type: 'highpass', f: 2400, g: .12 }); tone(240, t, .08, { to: 150, g: .08, type: 'triangle' }); },
    miss(t) { noise(t, .22, { type: 'bandpass', f: 2200, to: 500, q: 1.4, g: .1 }); },
    crit(t) { SFX.hit(t); bell(1568, t + .02, .6, .07); bell(2093, t + .06, .5, .05); tone(90, t, .3, { to: 45, g: .35 }); },
    heal(t) { [523, 659, 784, 1047].forEach((f, k) => tone(f, t + k * .06, .45, { type: 'sine', g: .07 })); for (let k = 0; k < 5; k++) tone(rnd(2200, 3600), t + .15 + k * .05, .1, { g: .015 }); },
    status(t) { tone(330, t, .32, { type: 'square', g: .04, lp: 1200, vib: 9 }); tone(311, t + .04, .3, { type: 'triangle', g: .05, vib: 7 }); },
    disarm(t) { bell(520, t, .5, .1, null, sfxBus, 3.7); noise(t, .05, { type: 'highpass', f: 3000, g: .2 }); [880, 760, 640, 700].forEach((f, k) => bell(f, t + .18 + k * .11, .25, .05, null, sfxBus, 3.1)); },
    ko(t) { tone(420, t, .45, { to: 80, type: 'triangle', g: .14 }); noise(t + .3, .2, { type: 'lowpass', f: 400, g: .3 }); },
    surge(t) { noise(t, .6, { type: 'bandpass', f: 400, to: 5000, q: 3, g: .08, a: .5 }); tone(220, t, .6, { to: 880, type: 'pulse', g: .04, lp: 2400 }); },
    legend(t) { tone(55, t, .7, { to: 38, g: .45 }); [130.8, 196, 261.6, 329.6, 392].forEach(f => tone(f, t, 1.6, { type: 'sawtooth', g: .03, lp: 1500 })); [523, 784, 1047, 1568].forEach((f, k) => bell(f, t + .1 + k * .07, 1.2, .05)); noise(t, .8, { type: 'highpass', f: 6000, g: .05 }); },
    slam(t) { tone(70, t, .45, { to: 40, g: .45 }); noise(t, .25, { type: 'lowpass', f: 900, g: .35 }); bell(784, t + .03, .8, .04); },
    victory(t) { [523, 659, 784, 1047].forEach((f, k) => tone(f, t + k * .09, .5, { type: 'pulse', g: .06, lp: 3000 })); bell(1047, t + .36, 1, .05); },
    defeat(t) { [392, 349, 311, 262].forEach((f, k) => tone(f, t + k * .22, .5, { type: 'triangle', g: .09 })); tone(98, t + .7, 1.2, { type: 'sine', g: .12 }); },
    phase(t) { bell(98, t, 2.4, .2, 700); bell(146.8, t + .35, 2, .14, 800); noise(t, 1.2, { type: 'lowpass', f: 300, g: .12, a: .6 }); },
    chest(t) { noise(t, .16, { type: 'lowpass', f: 500, g: .35 }); tone(120, t, .2, { to: 60, g: .3, type: 'triangle' }); },
    beam(t, o) { const tier = clampTier(o.tier), lead = o.lead || .4; if (tier < 2) return; noise(t, lead, { f: 300, to: 4200, q: 2.5, g: .05 + Math.min(5, tier) * .025, a: lead * .8 }); if (tier >= 5) { bell(98, t, 3.2, .22, 700); bell(146.8, t + .45, 3, .16, 800); } },
    reveal(t, o) {
      const tier = clampTier(o.tier), seq = CHIME[tier], step = tier >= 4 ? .085 : .07, tt = t + .02;
      seq.forEach((f, k) => { tone(f, tt + k * step, .5 + Math.min(tier, 5) * .15, { type: 'triangle', g: .1 }); tone(f * 2, tt + k * step, .3, { g: .025 }); });
      if (tier >= 3) { const ch = tier >= 5 ? [174.6, 261.6, 349.2, 440] : [130.8, 196, 261.6, 329.6]; ch.forEach(f => tone(f, tt, 1.6 + tier * .2, { type: 'sawtooth', g: .035, lp: 1400 })); noise(tt, .6, { type: 'highpass', f: 6000, g: .05 }); }
      if (tier >= 4) tone(55, tt, .5, { to: 40, g: .4 });
      if (tier >= 5) seq.forEach((f, k) => bell(f, tt + .5 + k * .12, 1.4, .05));
      if (tier >= 2) for (let k = 0; k < 4 + Math.min(tier, 6) * 2; k++) tone(2000 + Math.random() * 2500, tt + .15 + k * .06, .12, { g: .018 });
      if (tier >= 4) duck(.35, 2.2);
    },
    equip(t, o) { const tier = clampTier(o.tier); noise(t, .22, { type: 'highpass', f: 5000, g: .12 }); tone(1760, t, .25, { to: 2640, g: .06 }); tone(880, t + .03, .35, { type: 'triangle', g: .08 }); if (tier >= 4) tone(1320, t + .12, .6, { type: 'triangle', g: .06 }); },
    stamp(t) { tone(95, t, .18, { to: 55, g: .35 }); noise(t, .09, { type: 'lowpass', f: 1200, g: .28 }); },
    coin(t) { bell(1976, t, .35, .05, null, sfxBus, 2.01); bell(2637, t + .07, .45, .045, null, sfxBus, 2.01); },
    page(t) { noise(t, .18, { type: 'bandpass', f: 2600, to: 1400, q: .8, g: .06, a: .06 }); },
    identify(t) { for (let k = 0; k < 10; k++) tone(880 * Math.pow(2, k / 7), t + k * .07, .25, { type: 'triangle', g: .04 }); noise(t, 1, { type: 'highpass', f: 5000, g: .04, a: .8 }); },
    levelup(t) { [392, 523, 659, 784, 1047].forEach((f, k) => tone(f, t + k * .07, .4, { type: 'pulse', g: .05, lp: 3200 })); bell(1568, t + .4, .9, .05); bell(2093, t + .5, .8, .04); },
    hearth(t) { for (let k = 0; k < 9; k++) noise(t + rnd(0, 1.1), rnd(.02, .05), { type: 'bandpass', f: rnd(1200, 3200), q: 3, g: rnd(.05, .14) }); [174.6, 220, 261.6].forEach(f => tone(f, t, 1.8, { type: 'triangle', g: .05, a: .4 })); },
  };

  function duck(amount, secs) {
    if (!musicBus) return;
    const t = AC.currentTime, base = .5;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(base * amount, t + .08);
    musicBus.gain.linearRampToValueAtTime(base, t + secs);
  }

  // ---- the step sequencer ----
  function musicVoice(p, freqs, t, dur, out) {
    const g = p.g;
    for (const f of freqs) {
      switch (p.v) {
        case 'bell': bell(f, t, Math.max(.6, dur * 1.4), g, 3200, out); break;
        case 'tri': tone(f, t, dur * .95, { type: 'triangle', g, a: .01, sus: .8 }, out); break;
        case 'pulse': tone(f, t, dur * .92, { type: 'pulse', g, a: .006, sus: .7, lp: p.lp || 2400 }, out); break;
        case 'square': tone(f, t, dur * .8, { type: 'square', g, a: .004, sus: .5, lp: p.lp || 1800 }, out); break;
        case 'pluck': tone(f, t, .16, { type: 'triangle', g, a: .003 }, out); break;
        case 'flute': tone(f, t, dur * .95, { type: 'sine', g, a: .06, sus: .85, vib: 5 }, out); break;
        case 'pad': tone(f, t, dur, { type: 'sawtooth', g, a: .02, sus: .6, lp: 900 }, out); tone(f, t, dur, { type: 'sawtooth', g: g * .7, a: .02, sus: .6, lp: 900, det: 9 }, out); break;
      }
    }
  }
  function drum(kind, t, g, out) {
    if (kind === 'k') { tone(130, t, .16, { to: 45, g: g * .9, type: 'sine', a: .002 }, out); }
    else if (kind === 's') noise(t, .12, { type: 'bandpass', f: 1800, q: .9, g: g * .45, a: .002 }, out);
    else if (kind === 'h') noise(t, .04, { type: 'highpass', f: 7000, g: g * .2, a: .001 }, out);
    else if (kind === 'c') { noise(t + Math.random() * .08, .025, { type: 'bandpass', f: 2000 + Math.random() * 1800, q: 3, g: g * .25, a: .001 }, out); }
  }

  function startTrack(name) {
    const T = PARSED[name];
    if (!T || !ctx()) return;
    const bus = AC.createGain(); bus.connect(musicBus);
    const t0 = AC.currentTime + .06, fade = playing ? .9 : .35;
    bus.gain.setValueAtTime(0, AC.currentTime); bus.gain.linearRampToValueAtTime(T.gain, t0 + fade);
    const stepDur = 60 / T.bpm / T.sub;
    const st = { name, bus, step: 0, next: t0, timer: 0, done: false };
    const tick = () => {
      if (!AC || st.done) return;
      while (st.next < AC.currentTime + .15) {
        if (!T.loop && st.step >= T.len) { st.done = true; clearInterval(st.timer); if (wanted === name) wanted = null; setTimeout(() => { try { bus.disconnect(); } catch { /* gone */ } if (playing === st) playing = null; }, 3000); return; }
        for (const p of T.parts) {
          if (!T.loop && st.step >= p.len) continue;
          const e = p.ev[st.step % p.len];
          if (!e) continue;
          if (e.drum) drum(e.drum, st.next, p.g, bus);
          else musicVoice(p, e.notes, st.next, e.dur * stepDur, bus);
        }
        st.next += stepDur; st.step++;
      }
    };
    st.timer = setInterval(tick, 30); tick();
    if (playing) stopTrack(playing, .9);
    playing = st;
  }
  function stopTrack(st, fade = .6) {
    if (!st || st.done) return;
    st.done = true; clearInterval(st.timer);
    if (AC) {
      const t = AC.currentTime;
      st.bus.gain.cancelScheduledValues(t); st.bus.gain.setValueAtTime(st.bus.gain.value, t); st.bus.gain.linearRampToValueAtTime(0, t + fade);
    }
    setTimeout(() => { try { st.bus.disconnect(); } catch { /* gone */ } }, (fade + .3) * 1000);
    if (playing === st) playing = null;
  }
  function sync() {
    if (!unlocked) return;
    const want = musicOn ? wanted : null;
    if (!want) { if (playing) stopTrack(playing); return; }
    if (playing && playing.name === want) return;
    startTrack(want);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!AC) return;
      if (document.hidden) AC.suspend().catch(() => {});
      else AC.resume().catch(() => {});
    });
  }

  return {
    unlock() {                   // call from a click/tap handler
      if (unlocked) { ctx(); return; }
      unlocked = true;
      if (ctx()) sync();
    },
    setEnabled(on) { enabled = !!on; },
    get enabled() { return enabled; },
    setMusicEnabled(on) { musicOn = !!on; sync(); },
    get musicEnabled() { return musicOn; },
    get unlocked() { return unlocked; },
    get track() { return wanted; },
    sfx(name, opts = {}) {       // opts: { tier } for rarity-scaled sounds
      if (!enabled || !unlocked || !SFX[name] || !ctx()) return;
      try { SFX[name](AC.currentTime + .005, opts); } catch { /* never let sound break the game */ }
    },
    music(track) {
      wanted = track && PARSED[track] ? track : null;
      if (track === 'victory' && playing && playing.name === 'victory') { stopTrack(playing, .1); }
      sync();
    },
    duck(amount = .4, secs = 1.5) { if (AC && unlocked) duck(amount, secs); },
  };
}
