// Visible dice. Every roll returns its individual faces so the UI can show them.

export function rollDice(rng, n, sides) {
  const rolls = [];
  for (let i = 0; i < n; i++) rolls.push(rng.int(1, sides));
  return { sides, rolls, total: rolls.reduce((a, b) => a + b, 0) };
}

export function rollD20(rng, { adv = false, dis = false } = {}) {
  const both = adv !== dis;
  const rolls = both ? [rng.int(1, 20), rng.int(1, 20)] : [rng.int(1, 20)];
  const kept = !both ? rolls[0] : adv ? Math.max(...rolls) : Math.min(...rolls);
  return { rolls, kept, nat: kept };
}

export function parseDice(str) {
  const terms = [];
  let flat = 0;
  for (const part of String(str).replace(/\s+/g, '').replace(/-/g, '+-').split('+')) {
    if (!part) continue;
    const m = part.match(/^(-?)(\d*)d(\d+)$/i);
    if (m) terms.push({ n: (m[2] ? +m[2] : 1) * (m[1] ? -1 : 1), sides: +m[3] });
    else flat += +part;
  }
  return { terms, flat };
}
