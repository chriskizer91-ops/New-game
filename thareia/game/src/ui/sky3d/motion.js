// Thareia (T2): how the 3D ship leans (design/09-t2-spec.md 6.7). Pure: no three.js, no DOM; node-testable.
//
// Spring(k, d): a damped spring that follows a target (the player's page uses k 60, d 8 for the ship).
// createMotion({ reduced }) -> { step(dt, { turn, speed, accel }) -> { bank, pitch, bob }, state }
//   turn:  the heading's rate of change, radians a second; positive turns right (clockwise on the screen, where y
//          runs down), and a right turn banks right: bank > 0 is the right side down.
//   speed: painting px a second (0 .. MAX_SPEED); accel: its rate of change. Speeding up dips the nose (pitch < 0).
//   bank and pitch are radians. The bank is capped at 25 degrees (8 with reduced motion) even while the spring
//   overshoots, and settles back to level when the turn stops. bob is a slow rise and fall in level flight (none with
//   reduced motion), in painting px.
export const BANK_MAX = 25 * Math.PI / 180, BANK_MAX_REDUCED = 8 * Math.PI / 180;
export const MAX_SPEED = 150;
const BANK_PER_TURN = 0.55;   // radians of bank for each radian a second of turn (a hard 2.4 rad/s turn hits the cap)
const PITCH_PER_ACCEL = 0.0012, PITCH_MAX = 6 * Math.PI / 180;

export class Spring {
  constructor(k = 60, d = 8) { this.k = k; this.d = d; this.x = 0; this.v = 0; }
  update(target, dt) {
    // small fixed steps keep a long frame (dt up to 0.05 s) stable
    let left = Math.max(0, dt);
    while (left > 1e-6) {
      const h = Math.min(left, 1 / 120);
      const a = (target - this.x) * this.k - this.v * this.d;
      this.v += a * h; this.x += this.v * h; left -= h;
    }
    return this.x;
  }
}

const clamp = (v, a) => Math.max(-a, Math.min(a, v));

export function createMotion({ reduced = false } = {}) {
  const cap = reduced ? BANK_MAX_REDUCED : BANK_MAX;
  const bank = new Spring(60, 8), pitch = new Spring(40, 9);
  let t = 0;
  const state = { bank: 0, pitch: 0, bob: 0 };
  return {
    state, cap,
    step(dt, { turn = 0, speed = 0, accel = 0 } = {}) {
      t += dt;
      const want = clamp(turn * BANK_PER_TURN * Math.min(1, 0.35 + speed / MAX_SPEED), cap);
      state.bank = clamp(bank.update(want, dt), cap);
      state.pitch = clamp(pitch.update(clamp(-accel * PITCH_PER_ACCEL, PITCH_MAX), dt), PITCH_MAX);
      const level = 1 - Math.min(1, Math.abs(state.bank) / cap);
      state.bob = reduced ? 0 : Math.sin(t * 1.3) * 3 * level + Math.sin(t * 0.7) * 1.5 * level;
      return state;
    },
  };
}
