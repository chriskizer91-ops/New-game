// Makes the M2 save fixtures (version 1) that the M3 migration is tested against, plus a
// snapshot of the M2 spawn tables, from the UNMODIFIED M2 rules in src/.
//
//   node tools/make-v1-fixtures.mjs           # write test/fixtures/v1/* and test/fixtures/m2-spawns.json
//   node tools/make-v1-fixtures.mjs --check   # regenerate in memory and compare with the files on disk
//
// It refuses to run once src/ no longer makes version 1 saves: the files on disk are then the
// frozen record of M2, and only an M2 source tree can regenerate them.
//
// Every save is what the M2 page would have autosaved at that moment (ui/app.js saves on every
// setGame: after advance, rest, startBattle and resolveBattle). The party is made the way the
// M2 new-game screen makes it: newGame() with the standard array, then a `look` on the Warden.
// Fights are forced (see FORCE below) and then played out by rules/autoplay.js; everything
// else goes through the real M2 rules: startBattle, resolveBattle, rest, advance, equip.
// See test/fixtures/v1/README.md for what each fixture is.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { deepStrictEqual } from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { newGame, startBattle, resolveBattle, advance, rest, currentNode, canAdvance, spawnsFor } from '../src/rules/gauntlet.js';
import { current, act, foeTurn, commands } from '../src/rules/battle.js';
import { autoCommand } from '../src/rules/autoplay.js';
import { equip, bestHeroFor } from '../src/rules/party.js';
import { ENCOUNTERS, GAUNTLET, PATROLS } from '../src/data/encounters.js';
import { RELICS } from '../src/data/relics.js';
import { exportCode, importCode } from '../src/core/save.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'test/fixtures/v1');
const SPAWNS_FILE = path.join(root, 'test/fixtures/m2-spawns.json');
const README = path.join(OUT, 'README.md');
const CHECK = process.argv.includes('--check');

const SEED = 101;
const NAME = 'Wren';
const START = GAUNTLET[0];
const STARTER_ORDER = ['hearthbrand', 'stillwater-lance', 'cairnmaul'];
// The M2 new-game screen always passes ability scores; this is its standard array
// (ui/screens/newgame.js STANDARD in ARRAY_ORDER). Looks use only WARDEN_PRESETS values.
const BASE = Object.freeze({ STR: 15, CON: 14, DEX: 13, CHA: 12, WIS: 10, INT: 8 });
const LOOKS = Object.freeze({
  hearthbrand: { skin: 'skin', hairMat: 'hairAuburn', hair: 'short', beard: false, eye: '#1c2a48' },
  'stillwater-lance': { skin: 'skinDeep', hairMat: 'hairBlack', hair: 'braid', beard: false, eye: '#3a1a10' },
  cairnmaul: { skin: 'skinTan', hairMat: 'hairCopper', hair: 'crop', beard: true, eye: '#24381c' },
});
const HERO_HP = 500;

// ---- guard: M2 sources only ----------------------------------------------------------------------

{
  const probe = newGame({ seed: SEED });
  if (probe.version !== 1 || !exportCode(probe).startsWith('AETH1.')) {
    console.error('make-v1-fixtures: src/ no longer makes M2 (version 1) saves. The fixtures on disk are the frozen record;\n'
      + 'regenerate them only from the M2 sources (the tree that built dist/aethermoor-m2.html).');
    process.exit(1);
  }
}

// ---- a new game, the way the M2 new-game screen makes one -------------------------------------------

function freshGame(starter) {
  const g = newGame({ name: NAME, starter, seed: SEED, base: { ...BASE } });
  const warden = { ...g.party.roster.warden, look: { ...LOOKS[starter] } };
  return { ...g, party: { ...g.party, roster: { ...g.party.roster, warden } } };
}

// ---- forced fights -----------------------------------------------------------------------------------

const alive = u => !u.ko && !u.gone;
const unitsOf = (s, side) => s.order.map(id => s.units[id]).filter(u => u.side === side && alive(u));
const holding = f => f.held.some(p => p.held);

function heroesUp(s) {
  for (const h of unitsOf(s, 'hero')) { h.maxHp = HERO_HP; h.hp = HERO_HP; h.mp = h.maxMp; }
}

// Applied to the battle state before every turn (act/foeTurn return a fresh state each time).
const FORCE = {
  // Win and claim: heroes at 500 HP with full MP. A relic holder keeps its HP but its grip is 1,
  // so the first grip hit (Pip's Disarm, a crush, a crit) pries the relic loose; after that, and
  // for every other foe, HP is 1. This is how a careful player wins: the relic is claimed.
  claim(s) {
    heroesUp(s);
    for (const f of unitsOf(s, 'foe')) {
      if (holding(f)) for (const p of f.held) p.grip = Math.min(p.grip, 1);
      else f.hp = Math.min(f.hp, 1);
    }
  },
  // Win by killing: every foe at 1 HP, so a holder dies still gripping and its relic shatters.
  shatter(s) {
    heroesUp(s);
    for (const f of unitsOf(s, 'foe')) f.hp = Math.min(f.hp, 1);
  },
  // Lose: heroes at 1 HP, foes back at full.
  wipe(s) {
    for (const h of unitsOf(s, 'hero')) h.hp = Math.min(h.hp, 1);
    for (const f of unitsOf(s, 'foe')) f.hp = f.maxHp;
  },
  // Run: heroes at 500 HP, and every hero turn is a Flee until one gets away.
  flee(s) { heroesUp(s); },
};
const WANT = { claim: 'victory', shatter: 'victory', wipe: 'defeat', flee: 'fled' };

function heroCommand(s, id, mode) {
  if (mode === 'flee') {
    const run = commands(s, id).find(c => c.id === 'flee' && c.enabled);
    if (run) return run;
  }
  return autoCommand(s, id);
}

// Equip whatever is an upgrade, as the player does from the card reveal (the sim's rule).
function equipUpgrades(g, items) {
  let game = g;
  for (const it of items) {
    if (it.shattered) continue;
    const who = bestHeroFor(game, it);
    if (who) game = equip(game, who, it.uid).game;
  }
  return game;
}

const log = [];

function fight(game, mode = 'claim') {
  const node = game.progress.node;
  const started = startBattle(game);
  let s = structuredClone(started.battle);
  for (let n = 0; current(s); n++) {
    if (n > 5000) throw new Error(`${node}: the ${mode} fight never ended`);
    FORCE[mode](s);
    const id = current(s);
    s = (s.units[id].side === 'hero' ? act(s, heroCommand(s, id, mode)) : foeTurn(s)).state;
  }
  const { game: after, report } = resolveBattle(started.game, s);
  if (report.result !== WANT[mode]) throw new Error(`${node}: wanted ${WANT[mode]}, got ${report.result}`);
  const relics = [...report.claimed, ...report.drops].filter(i => RELICS[i.base]);
  log.push(`W${game.progress.waking} ${node} ${mode}: ${report.result}`
    + (relics.length ? `; ${relics.map(i => `${i.base}${i.shattered ? ' (shattered)' : ''}`).join(', ')}` : '')
    + (report.grudge ? `; grudge ${report.grudge.key} ${report.grudge.title}` : '')
    + (report.grudgeSettled ? `; settled ${report.grudgeSettled}` : '')
    + (report.brand ? `; ${report.brand.id}, Waking ${report.brand.waking}` : ''));
  return { game: report.result === 'victory' ? equipUpgrades(after, [...report.claimed, ...report.drops]) : after, report };
}

// ---- walking the Gauntlet ------------------------------------------------------------------------------

// Rest at a Hearthfire, win an uncleared fight, then advance; `onArrive` sees each arrival.
function walkTo(g, until, { modes = {}, onArrive } = {}) {
  for (let i = 0; i < 64; i++) {
    onArrive?.(g);
    if (g.progress.node === until) return g;
    const node = currentNode(g);
    if (node.type === 'hearthfire') g = rest(g);
    else if (!canAdvance(g)) g = fight(g, modes[node.id]).game;
    const next = advance(g);
    if (next.progress.node === g.progress.node) throw new Error(`Stuck at ${node.id}`);
    g = next;
  }
  throw new Error(`Never reached ${until}`);
}

function brand(g) {
  if (g.progress.node !== 'briarmaw-den') throw new Error('Briarmaw is not here');
  const { game, report } = fight(g, 'claim');
  if (!report.brand || game.progress.node !== START) throw new Error('No Brand');
  return game;
}

// One Waking-0 run per starter, with the save on arrival at every node.
const chains = {};
function chain(starter) {
  if (!chains[starter]) {
    const arrivals = {};
    const den = walkTo(freshGame(starter), 'briarmaw-den', { onArrive: g => { arrivals[g.progress.node] = g; } });
    chains[starter] = { arrivals, den };
  }
  return chains[starter];
}

// ---- the fixtures ------------------------------------------------------------------------------------

const starterFor = i => STARTER_ORDER[i % STARTER_ORDER.length];
const fixtures = [];

GAUNTLET.forEach((id, i) => {
  const starter = starterFor(i);
  fixtures.push({ name: `v1-node-${id}`, starter, game: chain(starter).arrivals[id], what: `On arrival at ${id}, every earlier node played.` });
});

{
  const starter = starterFor(14);
  fixtures.push({ name: 'v1-after-brand', starter, game: brand(chain(starter).den), what: 'Just after the first Briarmaw win: Brand of Briars, Waking 1, back at the Keep.' });
}
{
  const starter = starterFor(15);
  let g = brand(chain(starter).den);
  g = brand(walkTo(g, 'briarmaw-den'));
  g = walkTo(g, 'tally-camp');
  fixtures.push({ name: 'v1-waking2-dupe', starter, game: g, what: 'Briarmaw beaten twice (the same Brand twice), Waking 2, walked on to tally-camp.' });
}
{
  const starter = starterFor(16);
  let g = walkTo(freshGame(starter), 'bramble-toll');
  g = fight(g, 'wipe').game;                  // wakes at the Milestone Fire
  g = walkTo(g, 'bramble-toll');              // rest there, walk back
  g = fight(g, 'flee').game;
  g = fight(g, 'claim').game;                 // the only way past: beating Skarn settles his Grudge
  g = walkTo(advance(g), 'tally-camp');
  g = fight(g, 'flee').game;
  fixtures.push({ name: 'v1-grudges', starter, game: g, what: 'A wipe and a flee at bramble-toll (then the win that gets past it), and a flee at tally-camp.' });
}
{
  const starter = starterFor(17);
  let g = walkTo(freshGame(starter), 'snag-wallow');
  g = fight(g, 'shatter').game;               // Old Snag dies gripping the Thornsplitter
  g = advance(g);
  fixtures.push({ name: 'v1-shattered', starter, game: g, what: 'At bramble-deep; Old Snag was killed still gripping the Thornsplitter, so it shattered.' });
}

// ---- sanity checks on what the fixtures must show ------------------------------------------------------

function expect(ok, msg) { if (!ok) throw new Error(`Fixture check failed: ${msg}`); }
const byName = Object.fromEntries(fixtures.map(f => [f.name, f.game]));
for (const [i, id] of GAUNTLET.entries()) {
  const g = byName[`v1-node-${id}`];
  expect(g.version === 1 && g.progress.node === id && g.progress.waking === 0, `v1-node-${id} position`);
  expect(g.codex[starterFor(i)].claimed, `v1-node-${id} starter`);
}
{
  const g = byName['v1-after-brand'];
  expect(g.progress.waking === 1 && g.progress.node === START && g.progress.brands.length === 1, 'v1-after-brand');
}
{
  const g = byName['v1-waking2-dupe'];
  expect(g.progress.waking === 2 && g.progress.node === 'tally-camp', 'v1-waking2-dupe position');
  deepStrictEqual(g.progress.brands, ['brand-of-briars', 'brand-of-briars']);
}
{
  const g = byName['v1-grudges'];
  expect(g.progress.node === 'tally-camp' && Object.keys(g.progress.flags.grudges).length > 0, 'v1-grudges has a live Grudge');
  expect(g.inventory.some(i => i.stamp === 'grudge-settled'), 'v1-grudges carries grudge-settled loot');
}
{
  const g = byName['v1-shattered'];
  const ts = g.inventory.filter(i => i.base === 'thornsplitter');
  expect(g.progress.node === 'bramble-deep' && ts.length === 1 && ts[0].shattered === true, 'v1-shattered item');
  deepStrictEqual(g.codex.thornsplitter, { sighted: true, claimed: false, awakened: false });
  const claimed = byName['v1-node-bramble-deep'];
  expect(claimed.codex.thornsplitter.claimed && !claimed.inventory.some(i => i.shattered), 'v1-node-bramble-deep claims the Thornsplitter');
}

// ---- the spawn snapshot ------------------------------------------------------------------------------

const M2_PATROLS = ['hearth-road', 'verdant-wood', 'thornhollow', 'briarmaw-den'];

function spawnSnapshot() {
  const fights = GAUNTLET.filter(id => ENCOUNTERS[id].type === 'fight');
  const byWaking = {};
  for (const w of [0, 1, 2]) {
    const g = newGame({ seed: SEED });
    g.progress.waking = w;
    byWaking[w] = Object.fromEntries(fights.map(id => [id, spawnsFor(g, id)]));
  }
  return {
    gauntlet: Object.fromEntries(GAUNTLET.map(id => [id, ENCOUNTERS[id].spawns ?? null])),
    // only the four M2 patrol sets: M3 adds mossfall, hindwood and heartroot (spec §3.3)
    patrols: Object.fromEntries(M2_PATROLS.map(k => [k, PATROLS[k]])),
    spawnsFor: byWaking,
  };
}

// ---- output ------------------------------------------------------------------------------------------

const json = v => JSON.stringify(v, null, 2) + '\n';
const files = {};
for (const f of fixtures) {
  const text = json(f.game);
  const code = exportCode(f.game);
  deepStrictEqual(importCode(code), JSON.parse(text), `${f.name}: the AETH1 code does not import to the JSON`);
  files[path.join(OUT, `${f.name}.json`)] = text;
  files[path.join(OUT, `${f.name}.code.txt`)] = code + '\n';
}
files[SPAWNS_FILE] = json(spawnSnapshot());

const levels = g => ['warden', 'pip', 'bryn', 'alondra'].map(id => g.party.roster[id].level).join('/');
const TABLE_HEAD = ['fixture', 'starter', 'node', 'waking', 'brands', 'gold', 'levels w/p/b/a', 'grudges', 'day', 'relics claimed', 'shattered'];
const rows = fixtures.map(({ name, starter, game: g }) => [
  name, starter, g.progress.node, g.progress.waking, g.progress.brands.length, g.gold, levels(g),
  Object.keys(g.progress.flags.grudges).length, g.progress.flags.day,
  Object.entries(g.codex).filter(([, c]) => c.claimed).map(([id]) => id).join(', '),
  g.inventory.filter(i => i.shattered).map(i => i.base).join(', ') || '-',
]);
const mdTable = [`| ${TABLE_HEAD.join(' | ')} |`, `|${TABLE_HEAD.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');

// The README's table sits between two markers and is rewritten on every run.
const START_MARK = '<!-- fixtures:start -->', END_MARK = '<!-- fixtures:end -->';
if (existsSync(README)) {
  const md = readFileSync(README, 'utf8');
  const a = md.indexOf(START_MARK), b = md.indexOf(END_MARK);
  if (a >= 0 && b > a) files[README] = md.slice(0, a + START_MARK.length) + '\n' + mdTable + '\n' + md.slice(b);
}

let stale = 0;
if (!CHECK) mkdirSync(OUT, { recursive: true });
for (const [file, text] of Object.entries(files)) {
  const rel = path.relative(root, file);
  if (CHECK) {
    const now = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (now !== text) { stale++; console.error(`differs: ${rel}`); }
  } else writeFileSync(file, text);
}

// The files on disk must round-trip too (what the migration tests read).
if (!CHECK) {
  for (const f of fixtures) {
    const disk = JSON.parse(readFileSync(path.join(OUT, `${f.name}.json`), 'utf8'));
    deepStrictEqual(importCode(readFileSync(path.join(OUT, `${f.name}.code.txt`), 'utf8')), disk, `${f.name}: code.txt vs json`);
  }
}

console.log(log.join('\n'));
console.log('');
console.log(mdTable);
console.log('');
if (CHECK) {
  console.log(stale ? `${stale} file(s) differ from a fresh run.` : `All ${Object.keys(files).length} files match a fresh run.`);
  process.exit(stale ? 1 : 0);
}
console.log(`Wrote ${fixtures.length} saves (+ .code.txt) to ${path.relative(root, OUT)}/ and ${path.relative(root, SPAWNS_FILE)}; every code imports to its JSON.`);
