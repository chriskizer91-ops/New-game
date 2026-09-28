import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { newGame, startBattle, resolveBattle, rest, spawnsFor, travel, routPack, partyLevel, uniqueBrands } from '../src/rules/gauntlet.js';
import { xpToNext, xpForLevel, levelForXp, grantXp, MAX_LEVEL } from '../src/rules/progression.js';
import { equip, bestHeroFor } from '../src/rules/party.js';
import { deriveHero } from '../src/rules/stats.js';
import { ENCOUNTERS, GAUNTLET } from '../src/data/encounters.js';
import { HEARTHS, START_AT, CRITICAL_PATH } from '../src/data/world.js';
import { familyOf } from '../src/rules/foe.js';
import { deepFreeze } from '../src/core/freeze.js';
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

function win(game, nodeId) {
  const { game: g, battle } = startBattle(game, nodeId ? { nodeId } : undefined);
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
  // M3 (spec §4.6, §4.8): a version 2 game in the Great Hall, with no road node
  assert.equal(g.version, 2);
  assert.equal(g.progress.node, undefined);
  assert.deepEqual(g.progress.pos, { ...START_AT });
  assert.equal(g.progress.lastHearthfire, 'hearthstone-keep');
  assert.equal(g.progress.act, 1);
  assert.deepEqual(g.progress.flags.kindled, { 'hearthstone-keep': true });
  assert.equal(g.progress.flags.story.starter, 'cairnmaul');
  for (const k of ['cleared', 'done', 'grudges', 'story', 'unlocked', 'opened', 'kindled', 'visits', 'quests', 'scouted', 'seen', 'worn', 'beaten']) assert.equal(typeof g.progress.flags[k], 'object', k);
  assert.deepEqual(newGame({ seed: 3, starter: 'cairnmaul', name: 'Tess' }), g);
});

// M3 (spec §4.6): the M2 road (route/advance) is gone; you rest at a Hearthfire and travel between
// kindled ones.
test('Hearthfires heal, save and kindle; travel needs a kindled fire and lands on its stand', () => {
  const g = newGame({ seed: 2 });
  assert.throws(() => rest(g, 'keep-vault'), /Hearthfire/);
  const hurt = structuredClone(g);
  hurt.party.roster.pip.hp = 1;
  const rested = rest(deepFreeze(hurt), 'milestone-fire');
  assert.equal(rested.progress.lastHearthfire, 'milestone-fire');
  assert.equal(rested.progress.flags.kindled['milestone-fire'], true);
  assert.equal(rested.party.roster.pip.hp, deriveHero(rested.party.roster.pip, rested.inventory).maxHp);
  assert.equal(rested.progress.flags.day, hurt.progress.flags.day + 1);
  assert.equal(travel(g, 'thornhollow'), g, 'an unkindled fire is not a destination');
  const there = travel(rested, 'milestone-fire');
  const h = HEARTHS['milestone-fire'];
  assert.deepEqual(there.progress.pos, { map: h.map, x: h.x, y: h.y, face: h.face });
  assert.equal(partyLevel(g), 1);
});

test('party wipe: wake at the last Hearthfire, keep gear, lose 10% gold, and a Grudge is born', () => {
  const g0 = { ...at(newGame({ seed: 4 }), 'bramble-toll', 'milestone-fire'), gold: 200 };
  const { game, battle } = startBattle(g0);
  const gear = JSON.stringify(game.party.roster.warden.gear);
  const { game: g, report } = resolveBattle(game, ended(battle, 'defeat'));
  assert.equal(report.result, 'defeat');
  assert.equal(g.gold, 180);
  assert.equal(report.goldLost, 20);
  const h = HEARTHS['milestone-fire'];
  assert.deepEqual(g.progress.pos, { map: h.map, x: h.x, y: h.y, face: h.face }, 'M3: wake on the Hearthfire stand');
  assert.equal(report.wokeAt, 'milestone-fire');
  assert.equal(report.yield, false);
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
  assert.equal(report.brand.first, true);
  assert.equal(game.progress.waking, 1);
  assert.deepEqual(game.progress.brands, ['brand-of-briars']);
  // M3 (spec D5): no teleport; every non-once Verdant encounter re-arms, the done tutorial stays done
  assert.deepEqual(game.progress.pos, g.progress.pos);
  assert.deepEqual(game.progress.flags.cleared, { 'keep-vault': true }, 'once encounters stay cleared');
  assert.deepEqual(game.progress.flags.done, { 'keep-vault': true });
  assert.equal(game.progress.flags.beaten['briarmaw-den'], 1);
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

// M3: the same run walks the M2 route by encounter id (rest at each Hearthfire, fight until cleared)
test('a full Gauntlet run with the auto policy reaches level 6-8 and earns the Brand', () => {
  let g = newGame({ name: 'Sim', starter: 'stillwater-lance', seed: 17 });
  let levelAtBoss = null;
  let brand = null;
  for (const id of GAUNTLET) {
    if (ENCOUNTERS[id].type === 'hearthfire') { g = rest(g, id); continue; }
    for (let tries = 0; tries < 8 && !g.progress.flags.cleared[id] && !g.progress.flags.done[id]; tries++) {
      if (id === 'briarmaw-den' && levelAtBoss == null) levelAtBoss = g.party.roster.warden.level;
      const { game, battle } = startBattle(g, { nodeId: id });
      const { game: after, report } = resolveBattle(game, playOut(battle).state);
      g = after;
      for (const it of [...report.claimed, ...report.drops]) {
        const who = !it.shattered && bestHeroFor(g, it);
        if (who) g = equip(g, who, it.uid).game;
      }
      if (report.brand) brand = report.brand;
      if (id === 'briarmaw-den' && brand) break;
    }
  }
  assert.ok(brand, 'Briarmaw falls');
  const blade = g.inventory.find(i => i.uid === g.party.roster.warden.gear.weapon);
  assert.ok(g.inventory.some(i => i.chronicle.kills > 0), 'kills go on weapon Chronicles');
  assert.ok(blade);
  assert.ok(levelAtBoss >= 5 && levelAtBoss <= 8, `level ${levelAtBoss} at Briarmaw`);
  assert.equal(g.progress.waking, 1);
  assert.ok(g.codex.thornsplitter.sighted);
});

// ---- M3 flow (spec §4.6, D3, D4, D5, D9) ----------------------------------------------------------

const v2At = (game, patch = {}) => ({ ...game, progress: { ...game.progress, ...patch, flags: { ...game.progress.flags, ...(patch.flags || {}) } } });

test('Brands: a rematch earns nothing; both Verdant Brands complete Act I; Brands count once', () => {
  const g0 = newGame({ seed: 21 });
  const once = win(g0, 'briarmaw-den');
  assert.equal(once.report.rematch, false);
  const again = win(once.game, 'briarmaw-den');
  assert.equal(again.report.rematch, true, 'Briarmaw returns as an Echo rematch');
  assert.equal(again.report.brand, null);
  assert.deepEqual(again.game.progress.brands, ['brand-of-briars']);
  assert.equal(again.game.progress.waking, 1);
  assert.equal(again.game.progress.flags.beaten['briarmaw-den'], 2);
  assert.equal(again.game.progress.flags.story['act1-complete'], undefined);
  const heart = win(again.game, 'rotwarden-heart');
  assert.equal(heart.report.brand.id, 'brand-of-the-heartroot');
  assert.equal(heart.report.brand.waking, 2);
  assert.equal(heart.report.brand.count, 2);
  assert.equal(heart.game.progress.flags.story['act1-complete'], true);
  // an M2 save can hold the same Brand twice: it still counts once, and the array is kept as is
  const dupe = v2At(g0, { brands: ['brand-of-briars', 'brand-of-briars'], waking: 2 });
  assert.equal(uniqueBrands(dupe), 1);
  const r = win(dupe, 'briarmaw-den');
  assert.equal(r.report.rematch, true);
  assert.deepEqual(r.game.progress.brands, ['brand-of-briars', 'brand-of-briars']);
});

test('the Bramble Toll opens its chain for good', () => {
  const { game } = win(newGame({ seed: 22 }), 'bramble-toll');
  assert.equal(game.progress.flags.unlocked['bramble-toll-chain'], true);
  assert.equal(game.progress.flags.cleared['bramble-toll'], true);
  assert.equal(game.progress.flags.scouted['bramble-toll'], true, 'fought counts as scouted');
});

test('losing the Tamsin duel is a yield: no gold lost, no Grudge, breath back, the door flag set', () => {
  const g0 = { ...newGame({ seed: 23, starter: 'stillwater-lance' }), gold: 300 };
  const { game, battle } = startBattle(g0, { nodeId: 'tamsin-duel' });
  assert.equal(battle.ctx.duel, true);
  const { game: g, report } = resolveBattle(game, ended(battle, 'defeat'));
  assert.equal(report.yield, true);
  assert.equal(report.goldLost, 0);
  assert.equal(g.gold, 300);
  assert.equal(report.grudge, null);
  assert.deepEqual(g.progress.flags.grudges, {});
  assert.equal(g.progress.flags.story['tamsin-yielded'], true);
  assert.deepEqual(g.progress.pos, g0.progress.pos, 'no waking at a Hearthfire');
  assert.equal(report.wokeAt, null);
  for (const id of g.party.active) assert.ok(g.party.roster[id].hp > 1, `${id} got a breather`);
  assert.equal(g.progress.flags.done['tamsin-duel'], undefined, 'she stays for a rematch');
});

test('Tamsin: party level +1, the rival starter lent, the Vale Gauntlets worn, no Waking', () => {
  const g = v2At(newGame({ seed: 24, starter: 'hearthbrand' }), { waking: 2 });
  const [t] = spawnsFor(g, 'tamsin-duel');
  assert.equal(t.level, partyLevel(g) + 1);
  assert.equal(t.variant, 'cairnmaul');
  assert.deepEqual(t.held, [{ relic: 'cairnmaul', lend: true }]);
  assert.equal(t.wears, 'vale-gauntlets');
  assert.deepEqual(t.omens, [], 'noWaking: no Omens either');
  const s = spawnsFor(v2At(newGame({ seed: 24, starter: 'stillwater-lance' })), 'tamsin-duel')[0];
  assert.equal(s.variant, 'hearthbrand');
});

test('the Waking: rabble +2 levels, everyone else +6, relic-bearer variants by their own tier, wakeLevels', () => {
  const g = newGame({ seed: 25 });
  const w1 = v2At(g, { waking: 1 });
  const lvl = (game, id, i) => spawnsFor(game, id)[i].level;
  assert.equal(lvl(w1, 'hearth-road', 0), lvl(g, 'hearth-road', 0) + 2, 'cutpurse rabble');
  assert.equal(lvl(w1, 'bramble-toll', 0), lvl(g, 'bramble-toll', 0) + 6, 'Skarn, a veteran');
  assert.equal(familyOf(ENCOUNTERS['hr-smugglers'].spawns[0]).tier, 'relic-bearer');
  assert.equal(lvl(w1, 'hr-smugglers', 0), lvl(g, 'hr-smugglers', 0) + 6, 'Mags: a rabble family, a relic-bearer variant');
  assert.equal(lvl(w1, 'hr-smugglers', 1), lvl(g, 'hr-smugglers', 1) + 2, 'her smugglers are rabble');
  assert.equal(lvl(w1, 'poachers-holm', 0), lvl(g, 'poachers-holm', 0) + 3, 'Haskett: wakeLevels 3');
});

test('a Rout pays full gold, half the XP and the rabble drop roll, and never makes a Grudge', () => {
  const g = newGame({ seed: 26 });
  const spawns = spawnsFor(g, 'hearth-road');
  const { game, report } = routPack(deepFreeze(structuredClone(g)), { nodeId: 'hearth-road' });
  assert.equal(report.result, 'rout');
  assert.ok(report.gold > 0);
  assert.equal(game.gold, g.gold + report.gold);
  assert.ok(report.xp > 0);
  assert.ok(Array.isArray(report.drops));
  assert.equal(game.inventory.length, g.inventory.length + report.drops.length);
  assert.deepEqual(game.progress.flags.grudges, {});
  assert.equal(game.progress.flags.cleared['hearth-road'], true);
  assert.equal(game.progress.flags.beaten['hearth-road'], 1);
  assert.deepEqual(routPack(g, { nodeId: 'hearth-road' }).report, report, 'deterministic from rngState');
  const patrol = routPack(g, { spawns });
  assert.equal(patrol.game.progress.flags.cleared['hearth-road'], undefined, 'a zone pack has no node');
});

test('battle ctx: first strike and ambush from the world, Forewarned wards, dark maps', () => {
  const g = newGame({ seed: 27 });
  assert.equal(startBattle(g, { nodeId: 'hearth-road' }, { firstStrike: true }).battle.ctx.firstStrike, true);
  assert.equal(startBattle(g, { nodeId: 'hearth-road' }, { ambush: true }).battle.ctx.ambush, true);
  const warded = u => u.statuses.some(st => st.id === 'warded');
  const plain = startBattle(g, { nodeId: 'rotwarden-heart' }).battle;
  assert.ok(Object.values(plain.units).filter(u => u.side === 'hero').every(u => !warded(u)));
  assert.equal(plain.ctx.dark, true);
  const fore = v2At(g, { flags: { story: { ...g.progress.flags.story, forewarned: true } } });
  const b = startBattle(fore, { nodeId: 'rotwarden-heart' }).battle;
  assert.equal(b.ctx.warded, '2d6+4');
  for (const u of Object.values(b.units).filter(x => x.side === 'hero')) {
    const st = u.statuses.find(x => x.id === 'warded');
    assert.ok(st && st.value >= 6 && st.value <= 16, `${u.id} warded ${st?.value}`);
  }
  const p = startBattle(g, { patrol: { spawns: spawnsFor(g, 'hearth-road'), where: 'Mossfall', backdrop: 'mossfall' } }, { firstStrike: true }).battle;
  assert.equal(p.ctx.patrol, true);
  assert.equal(p.ctx.where, 'Mossfall');
  assert.equal(p.ctx.backdrop, 'mossfall');
  assert.equal(p.ctx.firstStrike, true);
});

test('the critical path is made of real encounters and Hearthfires', () => {
  for (const id of CRITICAL_PATH) assert.ok(ENCOUNTERS[id], id);
});
