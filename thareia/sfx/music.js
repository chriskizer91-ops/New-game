// Thareia music: pieces written as notes and played live by code, from the same voices as the sound effects (sounds.js).
// A piece is sections of bars; each section's parts are melody lines, chord patterns or drum patterns. The player
// schedules notes a little ahead of time, plays the sections in order and loops back to `loop`.
//
//   musicPlay(id)   musicStop()   MUSIC = [{ id, name, desc }]
import { sfxInit, tone, noise, fm, hz, withBus, sfxNodes } from './sounds.js';

/* ---- instruments: inst(t, note, dur, vel, pan) ---- */
const INST = {
  // soft string section: three slightly detuned saws, filtered, slow bow
  strings: (t, n, d, v, p) => { for (const det of [-9, 0, 8]) tone(t, { f: n, d: d + .35, g: .026 * v, a: .09, hold: d * .7, type: 'sawtooth', lp: 2300, detune: det, pan: p + det / 30, rv: .45 }); },
  // short string chord hits for battle
  stab: (t, n, d, v, p) => { for (const det of [-7, 6]) tone(t, { f: n, d: .28, g: .045 * v, a: .005, type: 'sawtooth', lp: 3000, f2: 900, detune: det, pan: p, rv: .25 }); },
  // warm pad under everything
  pad: (t, n, d, v, p) => { tone(t, { f: n, d: d + .6, g: .03 * v, a: .5, hold: d * .6, type: 'sawtooth', lp: 900, detune: -6, pan: p - .2, rv: .6 }); tone(t, { f: n, d: d + .6, g: .03 * v, a: .5, hold: d * .6, type: 'triangle', detune: 6, pan: p + .2, rv: .6 }); },
  // harp or lute: plucked, bright then softening
  harp: (t, n, d, v, p) => tone(t, { f: n, d: 1.1, g: .11 * v, a: .003, type: 'triangle', lp: 3200, f2: 700, fg: .5, pan: p, rv: .4 }),
  // wooden flute: breathy sine with late vibrato
  flute: (t, n, d, v, p) => { tone(t, { f: n, d: d + .12, g: .09 * v, a: .05, hold: d * .75, type: 'sine', vib: 5.2, vibd: hz(n) * .012, pan: p, rv: .45 }); noise(t, { bp: hz(n) * 2, q: 8, d: Math.min(.3, d), g: .012 * v, a: .02 }); },
  // bright horn or trumpet line
  brass: (t, n, d, v, p) => tone(t, { f: n, d: d + .08, g: .07 * v, a: .03, hold: d * .8, type: 'sawtooth', lp: 1400, f2: 2600, fg: .12, vib: 5, vibd: hz(n) * .006, pan: p, rv: .35 }),
  // choir-like "aah": a saw through two voice formants
  choir: (t, n, d, v, p) => { for (const [f, q] of [[750, 5], [1150, 6]]) tone(t, { f: n, d: d + .5, g: .05 * v, a: .35, hold: d * .6, type: 'sawtooth', bp: f, q, vib: 4.5, vibd: hz(n) * .01, pan: p, rv: .7 }); },
  // crystal bells, echoing
  bell: (t, n, d, v, p) => fm(t, { f: n, ratio: 3.5, index: 1.1, d: 1.6, g: .05 * v, pan: p, rv: .5, echo: .5 }),
  // plain glockenspiel for sparkle
  glock: (t, n, d, v, p) => fm(t, { f: n, ratio: 2, index: .5, d: .9, g: .045 * v, pan: p, rv: .4 }),
  bass: (t, n, d, v, p) => { tone(t, { f: n, d: d + .05, g: .16 * v, a: .01, hold: d * .6, type: 'triangle', pan: p }); tone(t, { f: n, d: d * .6 + .05, g: .04 * v, a: .005, type: 'sawtooth', lp: 500 }); },
  // driving picked bass for battle
  pbass: (t, n, d, v, p) => tone(t, { f: n, d: Math.min(d, .2) + .04, g: .14 * v, a: .004, type: 'sawtooth', lp: 700, f2: 250, fg: .15, pan: p }),
  // drums
  kick: (t, n, d, v) => tone(t, { f: 110, to: 42, glide: .12, d: .3, g: .55 * v }),
  snare: (t, n, d, v) => { noise(t, { bp: 1800, q: .7, d: .18, g: .28 * v }); tone(t, { f: 190, to: 140, d: .1, g: .12 * v, type: 'triangle' }); },
  hat: (t, n, d, v, p) => noise(t, { hp: 7500, d: .05, g: .08 * v, pan: .3 }),
  shaker: (t, n, d, v) => noise(t, { bp: 6000, q: 1.5, d: .07, g: .045 * v, a: .02, pan: -.3 }),
  taiko: (t, n, d, v) => { tone(t, { f: 80, to: 50, d: .6, g: .5 * v, rv: .3 }); noise(t, { lp: 500, d: .15, g: .2 * v }); },
  tom: (t, n, d, v, p) => tone(t, { f: 150, to: 90, d: .3, g: .3 * v, pan: p }),
  crash: (t, n, d, v) => noise(t, { hp: 3500, d: 1.6, g: .12 * v, a: .005, rv: .3 }),
  wind: (t, n, d, v) => noise(t, { bp: 500, f2: 1100, d: d + 1, g: .08 * v, q: 3, a: d * .5, rv: .4 }),
  heart: (t, n, d, v) => tone(t, { f: 60, to: 45, d: .35, g: .3 * v }),
};

/* ---- writing notes ---- */
// melody("B4:1 D5:1 G5:2 r:1") -> events in beats: note:beats (r = rest, + joins a chord, ! = accent)
function melody(str) {
  const out = []; let at = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [n, len] = tok.split(':'); const beats = +len || 1;
    if (n !== 'r') out.push({ at, notes: n.replace('!', '').split('+'), beats, v: n.endsWith('!') ? 1.25 : 1 });
    at += beats;
  }
  return out;
}
const CH = { // chord notes, low to high
  G: ['G3', 'B3', 'D4'], Em: ['E3', 'G3', 'B3'], C: ['C3', 'E3', 'G3'], D: ['D3', 'F#3', 'A3'], Am: ['A2', 'C3', 'E3'], Bm: ['B2', 'D3', 'F#3'],
  B: ['B2', 'D#3', 'F#3'], E: ['E3', 'G#3', 'B3'], Fsm: ['F#3', 'A3', 'C#4'], A: ['A2', 'C#3', 'E3'], Dadd: ['D3', 'A3', 'E4'], Eadd: ['E3', 'B3', 'F#4'],
};
const up = (n, oct) => n.replace(/-?\d$/, d => String(+d + oct));
// patterns built from a chord progression, one chord per bar (4 beats)
const perBar = (prog, fn) => prog.flatMap((c, bar) => fn(CH[c], c).map(e => ({ ...e, at: e.at + bar * 4 })));
const padOf = (prog, oct = 1) => perBar(prog, ch => [{ at: 0, notes: ch.map(n => up(n, oct)), beats: 4, v: 1 }]);
const arpOf = (prog, shape, oct = 1, step = .5) => perBar(prog, ch => { const tones = [ch[0], ch[1], ch[2], up(ch[0], 1), up(ch[1], 1), up(ch[2], 1)]; return shape.map((k, i) => ({ at: i * step, notes: [up(tones[k], oct)], beats: step, v: i % 4 ? .85 : 1 })); });
const bassOf = (prog, oct = -1, beats = [0, 2]) => perBar(prog, ch => beats.map((b, i) => ({ at: b, notes: [up(i % 2 ? ch[2] : ch[0], oct)], beats: 4 / beats.length, v: 1 })));
const drive = (prog) => perBar(prog, ch => [0, .5, 1, 1.5, 2, 2.5, 3, 3.5].map((b, i) => ({ at: b, notes: [up(i === 3 || i === 7 ? ch[2] : ch[0], i === 2 || i === 6 ? 0 : -1)], beats: .5, v: i % 2 ? .8 : 1 })));
const stabsOf = (prog) => perBar(prog, ch => [0, 1.5, 2.5].map(b => ({ at: b, notes: ch.map(n => up(n, 1)), beats: .25, v: b ? .8 : 1 })));
// drum grid: one string per bar of 16 sixteenths, 'x' hit, 'X' accent, '.' none; repeated for `bars`
const drum = (grid, bars) => { const out = []; for (let b = 0; b < bars; b++) [...grid].forEach((c, i) => { if (c !== '.') out.push({ at: b * 4 + i / 4, notes: [''], beats: .25, v: c === 'X' ? 1.25 : 1 }); }); return out; };
const shift = (evs, beats) => evs.map(e => ({ ...e, at: e.at + beats }));

/* ---- the pieces ---- */
const TRAVEL_A = ['G', 'D', 'Em', 'C', 'G', 'C', 'Am', 'D'];
const TRAVEL_B = ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D'];
const FIGHT_A = ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B'];
const FIGHT_B = ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'];
const FLY_A = ['Dadd', 'Eadd', 'Dadd', 'Eadd'];
const FLY_B = ['D', 'E', 'Fsm', 'E', 'D', 'E', 'Bm', 'A'];

const PIECES = [
  {
    id: 'travel', name: 'Over the Wilds', desc: 'Walking the wilds and towns: calm but curious. A harp, a wooden flute and soft strings, in G major.',
    bpm: 92, loop: 1,
    sections: [
      { bars: 4, parts: [['harp', arpOf(['G', 'Em', 'C', 'D'], [0, 1, 2, 3, 4, 3, 2, 1])], ['pad', padOf(['G', 'Em', 'C', 'D'])]] },
      { bars: 8, parts: [
        ['flute', melody('B4:1 D5:1 G5:2  F#5:1 E5:1 D5:2  E5:1 G5:1 B5:1.5 A5:.5  G5:1 E5:1 C5:2  B4:1 D5:1 G5:1 A5:1  B5:1 A5:1 G5:1 E5:1  E5:1 A5:1 G5:1 E5:1  D5:1 F#5:1 A5:2')],
        ['harp', arpOf(TRAVEL_A, [0, 1, 2, 3, 4, 3, 2, 1])], ['pad', padOf(TRAVEL_A)], ['bass', bassOf(TRAVEL_A)], ['shaker', drum('x.x.x.x.x.x.x.x.', 8)]] },
      { bars: 8, parts: [
        ['strings', melody('G4:2 B4:2  E5:3 D5:1  B4:2 D5:2  A4:4  G4:2 B4:2  C5:2 E5:2  D5:2 C5:1 B4:1  A4:2 F#4:2')],
        ['harp', arpOf(TRAVEL_B, [0, 2, 4, 2, 0, 2, 4, 2])], ['pad', padOf(TRAVEL_B)], ['bass', bassOf(TRAVEL_B)]] },
      { bars: 8, parts: [
        ['flute', melody('B4:1 D5:1 G5:2  F#5:1 E5:1 D5:2  E5:1 G5:1 B5:1.5 A5:.5  G5:1 E5:1 C5:2  B4:1 D5:1 G5:1 A5:1  B5:1 A5:1 G5:1 E5:1  E5:1 A5:1 G5:1 E5:1  D5:2 G5:2')],
        ['glock', melody('r:2 D6:2  r:2 A6:2  r:2 B6:2  r:2 G6:2  r:2 D6:2  r:2 E6:2  r:2 C6:2  r:2 F#6:2')],
        ['harp', arpOf(TRAVEL_A, [0, 1, 2, 3, 4, 3, 2, 1])], ['pad', padOf(TRAVEL_A)], ['bass', bassOf(TRAVEL_A)], ['shaker', drum('x.x.x.x.x.x.x.x.', 8)]] },
    ],
  },
  {
    id: 'battle', name: 'Break the Grip', desc: 'Battles: driving and heroic. Taiko and snare, a picked bass, string stabs and a brass melody, in E minor.',
    bpm: 150, loop: 1,
    sections: [
      { bars: 2, parts: [['taiko', melody('E2:1 E2:1 E2:.5 E2:.5 E2:1  E2:.5 E2:.5 E2:.5 E2:.5 E2:1 E2:1')], ['pbass', drive(['Em', 'Em'])], ['hat', drum('x.x.x.x.x.x.x.x.', 2)]] },
      { bars: 8, parts: [
        ['brass', melody('B4:1 E5:1 G5:1 F#5:.5 E5:.5  G5!:2 E5:1 C5:1  D5:1 F#5:1 A5:1 G5:.5 F#5:.5  F#5!:2 D#5:2  E5:1 G5:1 B5:1 A5:.5 G5:.5  C6!:1.5 B5:.5 A5:1 G5:1  A5:1 E5:1 C5:1 E5:1  D#5!:2 F#5:1 B4:1')],
        ['stab', stabsOf(FIGHT_A)], ['pbass', drive(FIGHT_A)],
        ['kick', drum('x.....x.x.......', 8)], ['snare', drum('....x.......x...', 8)], ['hat', drum('x.x.x.x.x.x.x.x.', 8)], ['crash', drum('x...............', 1)]] },
      { bars: 8, parts: [
        ['strings', melody('E5:2 G5:2  F#5:2 A5:2  B5:3 G5:1  E5:4  C5:2 E5:2  D5:2 F#5:2  D#5:4  F#5:2 B5:2')],
        ['bell', arpOf(FIGHT_B, [3, 4, 5, 4, 3, 4, 5, 4], 1)], ['pbass', drive(FIGHT_B)],
        ['kick', drum('x.......x.......', 8)], ['snare', drum('....x.......x.x.', 8)], ['hat', drum('x.xxx.xxx.xxx.xx', 8)], ['tom', shift(drum('..........x.x.xx', 1), 28)]] },
    ],
  },
  {
    id: 'flight', name: 'Sunstone Wind', desc: 'Flying the airship: open, floating and spacey. Echoing crystal bells, a choir, a slow heartbeat and wind, in D Lydian.',
    bpm: 80, loop: 0,
    sections: [
      { bars: 4, parts: [['bell', arpOf(FLY_A, [0, 1, 2, 4, 2, 1, 3, 5], 1)], ['pad', padOf(FLY_A, 0)], ['wind', melody('D3:8 r:8')], ['heart', drum('x.......x.......', 4)]] },
      { bars: 8, parts: [
        ['choir', melody('A4:2 F#5:2  G#5:3 E5:1  C#5:2 A5:2  G#5:4  F#5:2 A5:1 B5:1  C#6:2 B5:1 G#5:1  F#5:3 D5:1  E5:4')],
        ['bell', arpOf(FLY_B, [0, 2, 4, 5, 4, 2, 1, 3], 1)], ['pad', padOf(FLY_B, 0)], ['bass', bassOf(FLY_B, -1, [0])], ['heart', drum('x.......x.......', 8)], ['wind', melody('D3:8 r:8 D3:8 r:8')]] },
      { bars: 8, parts: [
        ['flute', melody('F#5:1 G#5:1 A5:2  B5:2 G#5:2  A5:1 C#6:1 B5:2  G#5:4  A5:1 B5:1 C#6:2  E6:2 C#6:2  B5:3 A5:1  G#5:4')],
        ['choir', melody('D4+A4:4 E4+B4:4 F#4+C#5:4 E4+B4:4 D4+A4:4 E4+B4:4 D4+B4:4 C#4+A4:4')],
        ['bell', arpOf(FLY_B, [3, 4, 5, 4, 3, 4, 5, 4], 1)], ['bass', bassOf(FLY_B, -1, [0])], ['heart', drum('x.......x.......', 8)]] },
    ],
  },
];
export const MUSIC = PIECES.map(({ id, name, desc }) => ({ id, name, desc }));

/* ---- the player ---- */
let cur = null;
export function musicStop(fade = .8) {
  if (!cur) return;
  const c = cur; cur = null; clearInterval(c.timer);
  const { AC } = sfxNodes(); const g = c.bus.gain; g.cancelScheduledValues(AC.currentTime); g.setValueAtTime(g.value, AC.currentTime); g.linearRampToValueAtTime(0, AC.currentTime + fade);
  setTimeout(() => { try { c.bus.disconnect(); c.rev.disconnect(); c.echoIn.disconnect(); } catch { /* gone */ } }, (fade + 3) * 1000);
}
export function musicPlaying() { return cur ? cur.id : null; }
// musicPlay(id, { ctx, at, until }) plays live; with an OfflineAudioContext it schedules from `at` up to `until` seconds
// in one go (for checking), instead of running a timer.
export function musicPlay(id, o = {}) {
  musicStop(.6);
  const AC = o.ctx ? sfxInit(o.ctx) : sfxInit(), { OUT, REV } = sfxNodes();
  const P = PIECES.find(p => p.id === id); if (!P) return;
  const bus = AC.createGain(); bus.gain.value = .9; bus.connect(OUT);
  const rev = AC.createGain(); rev.gain.value = .9; rev.connect(REV);
  // a tempo-synced echo (three sixteenths), fed back softly and darkened
  const beat = 60 / P.bpm, echoIn = AC.createGain(), dl = AC.createDelay(2), fb = AC.createGain(), dark = AC.createBiquadFilter();
  dl.delayTime.value = beat * .75; fb.gain.value = .38; dark.type = 'lowpass'; dark.frequency.value = 2600;
  echoIn.connect(dl); dl.connect(dark); dark.connect(fb); fb.connect(dl); dark.connect(bus);
  const sched = [];                 // the whole piece as [{ time in beats, inst, notes, beats, v, pan }], plus its length
  let len = 0; const loopAt = P.sections.slice(0, P.loop).reduce((a, s) => a + s.bars * 4, 0);
  for (const s of P.sections) {
    s.parts.forEach(([inst, evs], k) => { for (const e of evs) if (e.at < s.bars * 4) sched.push({ ...e, at: len + e.at, inst, pan: (k % 2 ? .25 : -.25) * (k % 3 === 0 ? 0 : 1) }); });
    len += s.bars * 4;
  }
  sched.sort((a, b) => a.at - b.at);
  const t0 = (o.at ?? AC.currentTime) + .08;
  let pos = 0, idx = 0, offset = 0;   // offset: the beat at which the current pass started
  const play = e => withBus(bus, rev, echoIn, () => { for (const n of e.notes) INST[e.inst](t0 + (offset + e.at) * beat, n || 'C4', e.beats * beat, e.v, e.pan); });
  const pump = horizon => {         // schedule every note before `horizon` (seconds)
    for (;;) {
      if (idx >= sched.length) { offset += len - loopAt; idx = sched.findIndex(e => e.at >= loopAt); pos = loopAt; if (idx < 0) return; }
      const e = sched[idx], when = t0 + (offset + e.at) * beat;
      if (when > horizon) return;
      play(e); idx++;
    }
  };
  cur = { id, bus, rev, echoIn, timer: null };
  if (o.until) { pump(o.until); return; }
  pump(AC.currentTime + .3);
  cur.timer = setInterval(() => pump(AC.currentTime + .3), 60);
}
