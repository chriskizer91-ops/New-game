// The world screen's session (M3 spec §5.5): the live Walk survives the battle and aftermath
// screens, so the world can mark a beaten roamer gone, stun one you fled, or re-enter after a wipe.
// Exports: session, getWalk(), setWalk(walk), setPending(p), takePending(), clearSession()
//   session.walk     the current Walk (rules/world.js) or null
//   session.pending  { roamerId } while a battle started from the world is running, else null
// Owner: WP7.

export const session = { walk: null, pending: null };

export const getWalk = () => session.walk;
export function setWalk(walk) { session.walk = walk; return walk; }
export function setPending(p) { session.pending = p; }
export function takePending() { const p = session.pending; session.pending = null; return p; }
export function clearSession() { session.walk = null; session.pending = null; }
