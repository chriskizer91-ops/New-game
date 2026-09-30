// The world screen's session (M3 spec §5.5): the live Walk survives the battle and aftermath
// screens, so the world can mark a beaten roamer gone, stun one you fled, or re-enter after a wipe.
// Exports: session, getWalk(), setWalk(walk), setPending(p), takePending(), clearSession(),
//          afterBattle(walk, pending, result) -> walk
//   session.walk     the current Walk (rules/world.js) or null
//   session.pending  { roamerId, enc, pos, duel, boss } while a battle started from the world runs, else null
//   session.seed     the seed of the game the Walk belongs to (a new or loaded game drops the Walk)
//   session.trail    the followers' tiles [[x, y, face] x3], so the conga line survives other screens
// Owner: WP7.

import { TUNING } from '../../data/tuning.js';

export const session = { walk: null, pending: null, seed: null, trail: null };

export const getWalk = () => session.walk;
export function setWalk(walk) { session.walk = walk; return walk; }
export function setPending(p) { session.pending = p; }
export function takePending() { const p = session.pending; session.pending = null; return p; }
export function clearSession() { session.walk = null; session.pending = null; session.seed = null; session.trail = null; }

// Apply a finished battle to the Walk (spec §4.5 "Grace and stun", §5.5 "Battle hand-off"):
// grace after every battle; a beaten roamer is gone; one you fled from is stunned.
// Pure: returns a new Walk (or the same one when there is nothing to do).
export function afterBattle(walk, pending, result) {
  if (!walk) return walk;
  const W = TUNING.world || {};
  const id = pending?.roamerId || null;
  let w = { ...walk, grace: Math.max(walk.grace || 0, W.grace ?? 6) };
  if (!id) return w;
  if (result === 'victory') {
    w.gone = { ...(w.gone || {}), [id]: true };
    w.roamers = (w.roamers || []).filter(r => r.id !== id);
  } else if (result === 'fled' || result == null) {
    w.roamers = (w.roamers || []).map(r => (r.id === id ? { ...r, mood: 'stunned', wait: W.fleeStun ?? 12 } : r));
  }
  return w;
}
