import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { newGame, startBattle, resolveBattle, rest, spawnsFor, travel, routPack, partyLevel, uniqueBrands, fightDeedIds } from '../src/rules/gauntlet.js';
import { SAVE_VERSION } from '../src/rules/migrate.js';
import { xpToNext, xpForLevel, levelForXp, grantXp, MAX_LEVEL } from '../src/rules/progression.js';
import { equip, bestHeroFor } from '../src/rules/party.js';
import { deriveHero } from '../src/rules/stats.js';
import { ENCOUNTERS, GAUNTLET } from '../src/data/encounters.js';
import { HEARTHS, START_AT, CRITICAL_PATH } from '../src/data/world.js';
import { familyOf, buildFoe } from '../src/rules/foe.js';
import { relicDeeds, relicsOn, stageOf } from '../src/rules/codex.js';
import { generateItem } from '../src/rules/loot.js';
import { RELICS } from '../src/data/relics.js';
import { TUNING } from '../src/data/tuning.js';
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

// (M2 fought wherever progress.node stood; M3 names the encounter)
function win(game, nodeId = game.progress.node) {
  const { game: g, battle } = startBattle(game, { nodeId });
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
  // M3 (spec §4.6, §4.8): a game in the Great Hall, with no road node; M4: at the current save version
  assert.equal(g.version, SAVE_VERSION);
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
  const { game, battle } = startBattle(g0, { nodeId: 'bramble-toll' });
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
    const { game, battle } = startBattle(g, { nodeId: 'bramble-toll' });
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

test('Tamsin: above the party level, the rival starter lent, the Vale Gauntlets worn, no Waking', () => {
  const g = v2At(newGame({ seed: 24, starter: 'hearthbrand' }), { waking: 2 });
  const [t] = spawnsFor(g, 'tamsin-duel');
  assert.equal(t.level, partyLevel(g) + ENCOUNTERS['tamsin-duel'].spawns[0].partyDelta);
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

// ---- M4: deeds, the Chronicle, settled Grudges, spoils and Codex pages (spec §4.3-§4.6, §3.7) -------

// A won fight against `nodeId` with every foe at 1 HP; `tweak(state)` edits the finished battle.
function wonFight(game, nodeId, tweak = () => {}) {
  const { game: g, battle } = startBattle(game, { nodeId });
  const b = structuredClone(battle);
  for (const u of Object.values(b.units)) if (u.side === 'foe') u.hp = 1;
  for (const u of Object.values(b.units)) if (u.side === 'hero') { u.hp = u.maxHp = 500; }
  const played = structuredClone(playOut(b).state);
  assert.equal(played.ended.result, 'victory');
  tweak(played);
  return { before: g, played, ...resolveBattle(g, played) };
}

test('fightDeedIds: what a fight did, deed by deed (spec §4.3)', () => {
  const battle = {
    order: ['f1', 'f2'], waking: 2,
    units: { f1: { side: 'foe', tier: 'rabble', held: [], gear: [] }, f2: { side: 'foe', tier: 'veteran', held: [], gear: [{ relic: 'thornwatch-hood' }] } },
  };
  const item = { uid: 'u1', base: 'hearthbrand', chronicle: { kills: 50 } };
  const out = { result: 'victory', log: { nat20: { warden: 1 }, surged: [{ uid: 'u1' }], downs: 0, felled: [] }, pried: [{ relic: 'tallyknife' }], party: [] };
  const report = { grudgeSettled: 'Skarn the Party-Breaker', brand: { id: 'brand-of-briars' } };
  assert.deepEqual(fightDeedIds(battle, out, report, 'warden', item).sort(),
    ['brand', 'claim', 'fell-holder', 'first-blood', 'hundred', 'legend-strike', 'settle', 'surge', 'untouched']);
  const champ = { ...battle, units: { ...battle.units, f1: { side: 'foe', tier: 'champion', held: [], gear: [] } } };
  assert.ok(fightDeedIds(champ, out, {}, 'warden', item).includes('fell-champion'));
  const held = { ...battle, units: { f1: { side: 'foe', tier: 'veteran', held: [{ relic: 'tallyknife', held: true }], gear: [] } }, order: ['f1'] };
  assert.ok(fightDeedIds(held, out, {}, 'warden', item).includes('fell-holder'), 'a named holder');
  const lost = { result: 'defeat', log: { nat20: { pip: 1 }, surged: [{ uid: 'u2' }], downs: 3, felled: [] }, pried: [], party: [] };
  assert.deepEqual(fightDeedIds({ ...battle, waking: 0 }, lost, {}, 'warden', { ...item, chronicle: { kills: 49 } }), [], 'nothing for a lost fight');
  assert.deepEqual(fightDeedIds(battle, { ...lost, log: { ...lost.log, nat20: { warden: 2 } }, pried: [{}] }, {}, 'warden', item).sort(),
    ['claim', 'hundred', 'legend-strike'], 'a Legend Strike, a pry and fifty felled count even in a lost fight');
  assert.ok(!fightDeedIds({ ...battle, waking: 1 }, out, {}, 'warden', item).includes('untouched'), 'Waking 2 or more');
  assert.ok(!fightDeedIds(battle, { ...out, log: { ...out.log, downs: 1 } }, {}, 'warden', item).includes('untouched'), 'nobody down');
});

test('a fight marks a relic\'s own deeds (never others), kindles it, and writes the Chronicle', () => {
  const g0 = at(newGame({ seed: 12 }), 'bramble-toll', 'milestone-fire');
  g0.progress = { ...g0.progress, waking: 2 };
  const uid = g0.party.roster.warden.gear.weapon;
  g0.inventory = g0.inventory.map(i => (i.uid === uid ? { ...i, chronicle: { ...i.chronicle, kills: 50 } } : i));
  const { played, game, report } = wonFight(g0, 'bramble-toll', b => {
    b.log.nat20 = { warden: 1 };
    b.log.surged = [{ hero: 'warden', uid, power: 'kindle' }];
    b.log.downs = 0;
  });
  // Skarn wears the Thornwatch Hood (a holder); the warden rolled a 20 and surged; fifty felled; Waking 2
  const fought = new Set(['first-blood', 'fell-holder', 'legend-strike', 'surge', 'hundred', 'untouched']);
  const own = relicDeeds('hearthbrand');
  const want = own.filter(d => fought.has(d));
  const blade = game.inventory.find(i => i.uid === uid);
  assert.deepEqual(Object.keys(blade.deeds || {}).sort(), [...want].sort());
  for (const d of want) assert.equal(blade.deeds[d], game.progress.flags.day);
  assert.deepEqual(report.deeds, want.map(d => ({ uid, relic: 'hearthbrand', deed: d })));
  assert.deepEqual(report.kindled, want.length ? [uid] : []);
  assert.deepEqual(report.ready, want.length === 3 ? [uid] : []);
  assert.equal(stageOf(blade), want.length ? 'kindled' : 'dormant');
  // the Chronicle: each foe felled by a hero goes on their weapon (and relics), with the mightiest
  const felled = played.log.felled;
  assert.ok(felled.length >= 1);
  for (const id of game.party.active) {
    const w = game.inventory.find(i => i.uid === game.party.roster[id].gear.weapon);
    const mine = felled.filter(k => k.by === id);
    const was = g0.inventory.find(i => i.uid === w.uid).chronicle?.kills || 0;
    assert.equal(w.chronicle.kills, was + mine.length, `${id}'s weapon`);
    if (mine.length) assert.equal(w.chronicle.mightiest.level, Math.max(...mine.map(k => k.level)));
    assert.ok(w.chronicle.bearers.includes(id), 'everyone who fought is a bearer');
  }
  // a Rout marks `rout` on the relics the active heroes wear
  const r = routPack(newGame({ seed: 12 }), { nodeId: 'hearth-road' });
  assert.deepEqual(r.report.deeds, own.includes('rout') ? [{ uid, relic: 'hearthbrand', deed: 'rout' }] : []);
});

test('settling a Grudge: flags.settled keeps its name and day, and every piece from the fight says so', () => {
  let g = at(newGame({ seed: 13 }), 'bramble-toll', 'milestone-fire');
  const { game: lostGame, battle } = startBattle(g, { nodeId: 'bramble-toll' });
  g = resolveBattle(lostGame, ended(battle, 'fled')).game;
  const name = g.progress.flags.grudges['bramble-toll#0'].name;
  const { game, report } = wonFight(g, 'bramble-toll');
  assert.equal(report.grudgeSettled, name);
  assert.deepEqual(game.progress.flags.settled, { 'bramble-toll#0': { day: game.progress.flags.day, name } });
  const items = [...report.claimed, ...report.drops];
  assert.ok(items.length > 0);
  for (const it of items) {
    assert.equal(it.provenance.grudge, name);
    assert.equal(game.inventory.find(i => i.uid === it.uid).provenance.grudge, name);
  }
  if (relicDeeds('hearthbrand').includes('settle')) assert.ok(report.deeds.some(d => d.deed === 'settle'));
});

test('Sunscorch fights pay forge materials by tier; Scorchgate\'s pay Ash Garnets; the Wilds pay none', () => {
  const g0 = { ...newGame({ seed: 14 }), progress: { ...newGame({ seed: 14 }).progress, waking: 2 } };
  const { played, game, report } = wonFight(g0, 'sr-toll');
  let want = {};
  for (const u of Object.values(played.units)) {
    if (u.side !== 'foe' || !u.ko || u.summonedBy) continue;
    for (const [k, n] of Object.entries(TUNING.forge.spoils[u.tier] || {})) want[k] = (want[k] || 0) + n;
  }
  assert.deepEqual(report.materials, want);
  for (const k of ['scrap', 'silver', 'embers']) assert.equal(game.materials[k], g0.materials[k] + (want[k] || 0), k);
  assert.deepEqual(report.gems, {});
  const cap = wonFight(g0, 'sg-captain');
  assert.deepEqual(cap.report.gems, { 'ash-garnet': TUNING.forge.garnets['sg-captain'] });
  assert.equal(cap.game.gems['ash-garnet'], TUNING.forge.garnets['sg-captain']);
  const wilds = wonFight(g0, 'hearth-road');
  assert.deepEqual([wilds.report.materials, wilds.report.gems], [{}, {}]);
  assert.deepEqual(wilds.game.materials, g0.materials);
});

test('the fight that finishes a Codex page records it once (the aftermath banner)', () => {
  const g0 = newGame({ seed: 15 });
  const need = relicsOn('verdant').filter(id => !RELICS[id].starter);
  const g = { ...g0, codex: { ...g0.codex, ...Object.fromEntries(need.map(id => [id, { sighted: true, claimed: true, awakened: false }])) } };
  const first = wonFight(g, 'hearth-road');
  assert.deepEqual(first.report.pages, ['verdant']);
  assert.equal(first.game.progress.flags.pages.verdant, first.game.progress.flags.day);
  assert.deepEqual(wonFight(first.game, 'hearth-road').report.pages, [], 'only once');
  // the page's +5% max HP reaches the battle's heroes and their clamp afterwards
  const { battle } = startBattle(first.game, { nodeId: 'hearth-road' });
  const w = battle.units.warden;
  assert.equal(w.maxHp, Math.round(deriveHero(first.game.party.roster.warden, first.game.inventory).maxHp * 1.05));
});

test('a new game starts on version 3 with an empty purse and pouch, and its gear knows who carries it', () => {
  const g = newGame({ seed: 16 });
  assert.deepEqual(g.materials, { scrap: 0, silver: 0, embers: 0 });
  assert.deepEqual(g.gems, {});
  assert.deepEqual([g.progress.flags.pages, g.progress.flags.settled], [{}, {}]);
  for (const id of g.party.active) {
    for (const uid of Object.values(g.party.roster[id].gear).filter(Boolean)) {
      assert.deepEqual(g.inventory.find(i => i.uid === uid).chronicle.bearers, [id]);
    }
  }
  const knife = generateItem(createRng(3), { base: 'belt-knife', rarity: 'wrought', ilvl: 1 });
  const onPip = equip({ ...g, inventory: [...g.inventory, knife] }, 'pip', knife.uid);
  assert.equal(onPip.ok, true, onPip.reason);
  const moved = equip(onPip.game, 'warden', knife.uid);
  assert.equal(moved.ok, true, moved.reason);
  assert.deepEqual(moved.game.inventory.find(i => i.uid === knife.uid).chronicle.bearers, ['pip', 'warden'], 'equipping adds the bearer');
});

test('a foe\'s look has its own tier: Tamsin\'s kindled kit at 4, beasts re-gear with the Waking; stats stay capped', () => {
  const g = { ...newGame({ seed: 17 }), progress: { ...newGame({ seed: 17 }).progress, waking: 2 } };
  const tamsin = buildFoe(spawnsFor(g, 'tamsin-scorchgate')[0], { id: 't' });
  assert.equal(tamsin.artTier, 4, 'the kindled look');
  assert.equal(tamsin.gearTier, 3, 'her stats use the capped tier');
  const beast = spawnsFor(g, 'wyrm-lair')[0];
  const wyrm = buildFoe(beast, { id: 'w' });
  assert.equal(familyOf(beast).humanoid, undefined);
  assert.equal(wyrm.gearTier, 0, 'beasts gain no gear stats');
  assert.equal(wyrm.artTier, beast.gearTier, 'but they look the part of the Waking');
  assert.ok(wyrm.artTier >= 2);
});

test('a Grudge never Twins a named holder with a relic in hand (only the Twinned Omen left: none is added)', async () => {
  const { OMENS, OMEN_IDS } = await import('../src/data/omens.js');
  const g0 = newGame({ seed: 18 });
  const { game, battle } = startBattle(g0, { nodeId: 'sr-toll' });
  const b = structuredClone(battle);
  const rasa = Object.values(b.units).find(u => u.side === 'foe' && (u.held || []).length);
  assert.ok(rasa, 'Rasa holds her relic');
  rasa.omens = OMEN_IDS.filter(o => o !== 'twinned' && !OMENS[o].notFor?.includes(rasa.tier));
  const { report } = resolveBattle(game, ended(b, 'defeat'));
  assert.ok(report.grudge, 'a Grudge is born');
  assert.ok(!report.grudge.omens.includes('twinned'), `no Twinned Omen (${report.grudge.omens.join(', ')})`);
});
