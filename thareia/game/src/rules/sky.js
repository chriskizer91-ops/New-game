// Thareia (T2): who may land where, and fly over what (design/09-t2-spec.md 6.4). Pure: reads the game, never changes it.
//
// dockState(game, dock, flight, { pick }) -> { ok, why }
//   flight: a FLIGHTS entry or HIRE_FLIGHT, with `from` (the dock it took off from) filled in for a hire flight.
//   pick: 'map' when the player taps the dock on the world map (unknown docks are refused there), else 1x.
//   why: 'story'   the dock's `if` fails (the screen does not draw it), for any flight;
//        'from'  a story flight's own start ("we just came from there");
//        'route' a story flight (free false) lands only at its `to`;
//        'licence' the dock does not take this kind of flight (dock.license), or a hire flight before the skiff is
//                  rented (c1-skiff-rented);
//        'level'   the hero's own level is under the dock's ({ heroLevel });
//        'unknown' world map only: the dock is not in progress.flags.docks yet.
//   A hire flight may always land back where it took off (the fee is spent; the hero is never stuck).
// regionOpen(game, regionId, flight) -> { ok, why } the same shape for flying over a region painting.
// levelFor(level, license) reads a dock's or region's level: a number, or { [license]: n } (a kind not named needs 1).
import { check, storyOf, flagsOf } from './cond.js';
import { SKY_REGIONS } from '../data/thareia/sky.js';

export const flightLicense = flight => flight?.license || 'ticket';

export function levelFor(level, license) {
  if (level == null) return 1;
  if (typeof level === 'number') return level;
  return level[license] ?? 1;
}

const YES = Object.freeze({ ok: true, why: null });
const no = why => ({ ok: false, why });

export function dockState(game, dock, flight, { pick = '1x' } = {}) {
  if (!dock) return no('unknown');
  const lic = flightLicense(flight);
  if (flight?.free === false) {
    if (dock.id === flight.to) return YES;
    if (dock.id !== flight.from && dock.if && !check(game, dock.if)) return no('story');
    return no(dock.id === flight.from ? 'from' : 'route');
  }
  if (lic === 'hire' && !storyOf(game)['c1-skiff-rented']) return no('licence');
  // the hire post the skiff took off from: always a way down
  if (lic === 'hire' && flight?.from && dock.id === flight.from) return YES;
  if (dock.if && !check(game, dock.if)) return no('story');
  if (!(dock.license || []).includes(lic)) return no('licence');
  const lv = levelFor(dock.level, lic);
  if (lv > 1 && !check(game, { heroLevel: lv })) return no('level');
  if (pick === 'map' && !flagsOf(game).docks?.[dock.id]) return no('unknown');
  return YES;
}

export function regionOpen(game, regionId, flight) {
  const R = SKY_REGIONS[regionId];
  if (!R) return no('unknown');
  const lic = flightLicense(flight);
  if (!(R.license || []).includes(lic)) return no('licence');
  if (R.if && !check(game, R.if)) return no('story');
  const lv = levelFor(R.level, lic);
  if (lv > 1 && !check(game, { heroLevel: lv })) return no('level');
  return YES;
}

// the line a refusal shows, from the flight's `says` (why -> key)
const SAY_KEY = { from: 'from', route: 'locked', licence: 'unlicensed', level: 'locked', story: 'story', unknown: 'unknown' };
export const refusalLine = (flight, why) => flight?.says?.[SAY_KEY[why]] || flight?.says?.locked || '';
