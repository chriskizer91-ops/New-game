// Audio facade. Screens call these names; the synth implementation lives behind them.
// Until audio is unlocked by a user gesture (or when sound is off) every call is a no-op.
//
// sfx names: select confirm back dice hit graze miss crit heal status disarm ko surge legend
//            victory defeat phase chest reveal equip levelup hearth
// music tracks: title road battle boss victory hearth  (null stops music)

export function createAudio() {
  let enabled = true;
  return {
    unlock() {},                 // call from a click/tap handler
    setEnabled(on) { enabled = !!on; },
    get enabled() { return enabled; },
    sfx(name, opts) {},          // opts: { tier } for rarity-scaled sounds
    music(track) {},
  };
}
