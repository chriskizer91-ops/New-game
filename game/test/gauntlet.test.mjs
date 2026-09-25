import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { newGame, startBattle, resolveBattle, advance, rest, canAdvance, currentNode, spawnsFor, route } from '../src/rules/gauntlet.js';
import { xpToNext, xpForLevel, levelForXp, grantXp, MAX_LEVEL } from '../src/rules/progression.js';
import { equip, bestHeroFor } from '../src/rules/party.js';
import { deriveHero } from '../src/rules/stats.js';
import { ENCOUNTERS, GAUNTLET } from '../src/data/encounters.js';
import { playOut } from './helpers.mjs';

function at(game, node, lastHearthfire = 'hearthstone-keep') {
  const cleared = {};
  for (const id of GAUNTLET.slice(0, GAUNTLET.indexOf(node))) if (ENCOUNTERS[id].type === 'fight') cleared[id] = true;
  return { ...game, progress: { ...game.progress, node, lastHearthfire, flags: { ...game.progress.flags, cleared } } };
}

function ended(battle, result) {
  const b = structuredClone(battle);
  for (const u of Object.values(b.units)) if (u.side === 'hero' && result === 'defeat') { u.hp = 0; u.ko = true; }
  b.ended = { result, xp: 0, gold: 0, drops: [], claimed: [] };
  return b;
}

function win(game) {
  const { game: g, battle } = startBattle(game);
  const b = structuredClone(battle);
  for (const u of Object.values(b.units)) if (u.side === 'foe') u.hp = 1;
  for (const u of Object.values(b.units)) if (u.side === 'hero') { u.hp = u.maxHp = 500; }
  const played = playOut(b).state;
  assert.equal(played.ended.result, 'victory');
  return resolveBattle(g, played);
}

test('new game follows the ARCHITECTURE game-state shape', () => {
  const g = newGame({ name: 'Tess', starter: 'cairnmaul', seed: 3 });
  for (const k of ['version', 'seed', 'rngState', 'party', 'inventory', 'gold', 'codex', 'progress', 'settings']) assert.ok(k in g, k);
  assert.deepEqual(g.party.active, ['warden', 'pip', 'bryn', 'alondra']);
  const w = g.party.roster.warden;
  for (const k of ['id', 'name', 'level', 'xp', 'hp', 'mp', 'surge', 'base', 'gear', 'skills', 'domains']) assert.ok(k in w, k);
  assert.equal(w.name, 'Tess');
  const weapon = g.inventory.find(i => i.uid === w.gear.weapon);
  assert.equal(weapon.base, 'cairnmaul');
  assert.equal(w.gear.offhand, null, 'a two-handed starter has no shield');
  assert.equal(g.codex.cairnmaul.claimed, true);
  assert.equal(g.codex.hearthbrand.claimed, false);
  assert.equal(g.progress.node, 'hearthstone-keep');
  assert.deepEqual(newGame({ seed: 3, starter: 'cairnmaul', name: 'Tess' }), g);
});

test('walking the route: a fight blocks the road until cleared; Hearthfires heal and save', () => {
  let g = newGame({ seed: 2 });
  assert.equal(canAdvance(g), true);
  g = advance(g);
  assert.equal(currentNode(g).id, 'keep-vault');
  assert.equal(canAdvance(g), false);
  assert.equal(advance(g), g);
  assert.throws(() => rest(g), /Hearthfire/);
  const r = route(g);
  assert.equal(r.length, GAUNTLET.length);
  assert.equal(r.find(n => n.current).id, 'keep-vault');
  const hurt = structuredClone(at(g, 'milestone-fire'));
  hurt.party.roster.pip.hp = 1;
  const rested = rest(hurt);
  assert.equal(rested.progress.lastHearthfire, 'milestone-fire');
  assert.equal(rested.party.roster.pip.hp, deriveHero(rested.party.roster.pip, rested.inventory).maxHp);
  assert.equal(rested.progress.flags.day, hurt.progress.flags.day + 1);
});

test('party wipe: wake at the last Hearthfire, keep gear, lose 10% gold, and a Grudge is born', () => {
  const g0 = { ...at(newGame({ seed: 4 }), 'bramble-toll', 'milestone-fire'), gold: 200 };
  const { game, battle } = startBattle(g0);
  const gear = JSON.stringify(game.party.roster.warden.gear);
  const { game: g, report } = resolveBattle(game, ended(battle, 'defeat'));
  assert.equal(report.result, 'defeat');
  assert.equal(g.gold, 180);
  assert.equal(report.goldLost, 20);
  assert.equal(g.progress.node, 'milestone-fire');
  assert.equal(JSON.stringify(g.party.roster.warden.gear), gear);
  for (const id of g.party.active) assert.ok(g.party.roster[id].hp > 0);
  assert.ok(report.xp > 0, 'a wipe still teaches something');
  assert.equal(g.party.roster.warden.xp, game.party.roster.warden.xp + report.xp);
  assert.equal(report.grudge.name, 'Skarn the Party-Breaker');
  assert.equal(report.grudge.omens.length, 1);
  const sp = spawnsFor(g, 'bramble-toll')[0];
  assert.equal(sp.title, 'the Party-Breaker');
  assert.ok(sp.omens.includes(report.grudge.omens[0]));
  assert.equal(sp.grudge, 'bramble-toll#0');
});

test('fleeing twice makes "Skarn the Twice-Fled"; settling the Grudge pays a tier higher', () => {
  let g = at(newGame({ seed: 5 }), 'bramble-toll', 'milestone-fire');
  for (let i = 0; i < 2; i++) {
    const { game, battle } = startBattle(g);
    g = resolveBattle(game, ended(battle, 'fled')).game;
  }
  assert.equal(g.progress.flags.grudges['bramble-toll#0'].name, 'Skarn the Twice-Fled');
  assert.equal(g.progress.flags.grudges['bramble-toll#0'].omens.length, 2);
  const { game, report } = win(g);
  assert.equal(report.grudgeSettled, 'Skarn the Twice-Fled');
  assert.equal(game.progress.flags.grudges['bramble-toll#0'], undefined);
  assert.ok(report.drops.some(i => i.stamp === 'grudge-settled'));
});

test('beating Briarmaw earns a Brand, raises the Waking and re-gears the whole Gauntlet', () => {
  let g = at(newGame({ seed: 6 }), 'briarmaw-den', 'den-mouth');
  g.progress.flags.done = { 'keep-vault': true };
  const before = spawnsFor(g, 'bramble-toll');
  const { game, report } = win(g);
  assert.equal(report.brand.id, 'brand-of-briars');
  assert.equal(game.progress.waking, 1);
  assert.deepEqual(game.progress.brands, ['brand-of-briars']);
  assert.equal(game.progress.node, 'hearthstone-keep');
  assert.deepEqual(game.progress.flags.cleared, {});
  assert.equal(advance(game).progress.node, 'hearth-road', 'the tutorial is not replayed');
  const after = spawnsFor(game, 'bramble-toll');
  assert.equal(after[0].level, before[0].level + 6);
  assert.equal(after[0].gearTier, before[0].gearTier + 1);
  assert.equal(after[0].omens.length, 1, 'veterans gain an Omen per Waking');
  assert.equal(after[1].omens.length, 0, 'rabble gain Omens from Waking 2');
  const w2 = { ...game, progress: { ...game.progress, waking: 2 } };
  assert.equal(spawnsFor(w2, 'hearth-road')[0].omens.length, 1);
  assert.equal(spawnsFor(w2, 'briarmaw-den')[0].omens.length, 2);
  assert.ok(!spawnsFor(w2, 'briarmaw-den')[0].omens.includes('twinned'), 'no twinned Champions');
});

test('relics you already own come back as Echoes on their holders', () => {
  const g = newGame({ seed: 8 });
  const owned = { ...g, codex: { ...g.codex, thornsplitter: { sighted: true, claimed: true, awakened: false } } };
  const snag = spawnsFor(owned, 'snag-wallow')[0];
  assert.equal(snag.held.length, 1);
  assert.equal(snag.held[0].relic, undefined);
  assert.equal(snag.held[0].item.kind, 'axe');
  assert.equal(spawnsFor(g, 'snag-wallow')[0].held[0].relic, 'thornsplitter');
});

test('XP curve: monotonic to level 50, and levels bring rolled HP, skills and ability scores', () => {
  let prev = 0;
  for (let l = 1; l < MAX_LEVEL; l++) { assert.ok(xpToNext(l) > prev); prev = xpToNext(l); }
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(xpForLevel(6)), 6);
  assert.equal(levelForXp(xpForLevel(6) - 1), 5);
  const pip = newGame({ seed: 1 }).party.roster.pip;
  const { hero, gains } = grantXp(pip, xpForLevel(4), createRng(1));
  assert.equal(hero.level, 4);
  assert.equal(gains.length, 3);
  assert.deepEqual(gains.flatMap(x => x.skills), ['knife-work', 'volley']);
  for (const x of gains) assert.ok(x.hpRoll.value >= 4 && x.hpRoll.value <= 8 && x.hpRoll.sides === 8);
  assert.equal(hero.base.DEX, pip.base.DEX + 1);
  assert.equal(hero.hpRolls.length, 3);
  assert.equal(hero.domains.survival.level, 4);
});

test('a full Gauntlet run with the auto policy reaches level 6-8 and earns the Brand', () => {
  let g = newGame({ name: 'Sim', starter: 'stillwater-lance', seed: 17 });
  let levelAtBoss = null;
  let brand = null;
  for (let step = 0; step < 80 && !brand; step++) {
    const node = currentNode(g);
    if (node.type === 'hearthfire') { g = advance(rest(g)); continue; }
    if (canAdvance(g)) { g = advance(g); continue; }
    if (node.id === 'briarmaw-den' && levelAtBoss == null) levelAtBoss = g.party.roster.warden.level;
    const { game, battle } = startBattle(g);
    const { game: after, report } = resolveBattle(game, playOut(battle).state);
    g = after;
    for (const it of [...report.claimed, ...report.drops]) {
      const who = !it.shattered && bestHeroFor(g, it);
      if (who) g = equip(g, who, it.uid).game;
    }
    brand = report.brand;
  }
  assert.ok(brand, 'Briarmaw falls');
  const blade = g.inventory.find(i => i.uid === g.party.roster.warden.gear.weapon);
  assert.ok(g.inventory.some(i => i.chronicle.kills > 0), 'kills go on weapon Chronicles');
  assert.ok(blade);
  assert.ok(levelAtBoss >= 5 && levelAtBoss <= 8, `level ${levelAtBoss} at Briarmaw`);
  assert.equal(g.progress.waking, 1);
  assert.ok(g.codex.thornsplitter.sighted);
});
