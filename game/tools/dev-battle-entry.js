// Dev harness for the battle screen (bundled by tools/dev-battle.mjs into tools/shots/dev-battle.html).
// Starts any encounter or a roaming patrol from a fresh or levelled newGame, via the URL hash:
//
//   #node=oldsnag&level=5            encounter id or alias (tallyman, rabble, hounds, toll, edge, rotstag,
//                                    camp, oldsnag, deep, briarmaw; lantern, duel, rotwarden) and party level
//   &patrol=1                        a roaming rabble patrol (M3 startBattle { patrol: { spawns, where,
//                                    backdrop } }) from that node's backdrop instead of its fight
//   &seed=7 &starter=cairnmaul       newGame seed and starter relic
//   &speed=4 &auto=1 &reduced=1      battle settings
//   &surge=100                       pre-fill every hero's Legend Surge gauge
//   &svc=1                           register stub cardSlam/cardPreview services
//   &hooks=1                         enable window.__btPauseOn / __btResume (e2e screenshots)
//   &pause=legend,phase              event types to pause on from the very start (with hooks=1)
//
// Not part of the game build. Owner: WP8.
import '../src/ui/theme.css';
import { createApp } from '../src/ui/app.js';
import * as battleScreen from '../src/ui/screens/battle.js';
import { newGame, startBattle } from '../src/rules/gauntlet.js';
import { escalateSpawn } from '../src/rules/foe.js';
import { grantXp, xpForLevel } from '../src/rules/progression.js';
import { deriveHero } from '../src/rules/stats.js';
import { createRng } from '../src/core/rng.js';
import { ENCOUNTERS, GAUNTLET, PATROLS } from '../src/data/encounters.js';
import { FOES } from '../src/data/foes.js';

const ALIAS = {
  tallyman: 'keep-vault', vault: 'keep-vault', rabble: 'hearth-road', road: 'hearth-road', hounds: 'waymarker-stones',
  toll: 'bramble-toll', edge: 'verdant-edge', rotstag: 'rotstag-glade', stag: 'rotstag-glade', camp: 'tally-camp',
  oldsnag: 'snag-wallow', snag: 'snag-wallow', deep: 'bramble-deep', briarmaw: 'briarmaw-den', boss: 'briarmaw-den',
  // M3: a fight in the dark (battle.ctx.dark), the Tamsin duel (ctx.duel), the Rotwarden
  lantern: 'mw-lantern', dark: 'mw-lantern', duel: 'tamsin-duel', tamsin: 'tamsin-duel', rotwarden: 'rotwarden-heart',
};

const params = Object.fromEntries(window.location.hash.replace(/^#/, '').split('&').filter(Boolean).map(kv => {
  const [k, v = '1'] = kv.split('=');
  return [decodeURIComponent(k), decodeURIComponent(v)];
}));
const nodeId = ALIAS[params.node] || params.node || 'keep-vault';
const level = Math.max(1, Number(params.level) || 1);
const seed = Number(params.seed) || 7;

if (params.hooks) {
  window.__btPauseOn = new Set(params.pause ? params.pause.split(',') : []);
  window.__btPaused = null;
  let release = null;
  window.__btResume = () => { window.__btPaused = null; if (release) { const r = release; release = null; r(); } };
  window.__btLog = [];
  globalThis.__btHooks = {
    log(line) { window.__btLog.push(line.text); },
    peak(ev) {
      if (!window.__btPauseOn.has(ev.t)) return null;
      window.__btPauseOn.delete(ev.t);
      window.__btPaused = ev.t;
      window.__btPausedEvent = ev;
      return new Promise(r => { release = r; });
    },
  };
}

function levelParty(game, lvl, surge) {
  const rng = createRng(`dev-level:${seed}`);
  for (const id of game.party.active) {
    let h = game.party.roster[id];
    const need = xpForLevel(lvl) - (h.xp || 0);
    if (need > 0) h = grantXp(h, need, rng).hero;
    const d = deriveHero(h, game.inventory);
    game.party.roster[id] = { ...h, hp: d.maxHp, mp: d.maxMp, surge: surge == null ? h.surge : surge };
  }
  return game;
}

// A roaming rabble patrol for this node's backdrop, at the level of the strongest rabble on the
// Gauntlet up to it (what the M2 road's patrols used), escalated for the Waking.
function patrolFor(game, id) {
  const node = ENCOUNTERS[id];
  const upTo = Math.max(0, GAUNTLET.indexOf(id));
  const levels = GAUNTLET.slice(0, upTo + 1).flatMap(n => (ENCOUNTERS[n].spawns || []).filter(s => FOES[s.family].tier === 'rabble').map(s => s.level));
  const lvl = Math.max(1, ...levels);
  const sets = PATROLS[node.backdrop] || PATROLS['hearth-road'];
  const set = sets[seed % sets.length];
  const spawns = set.map((sp, i) => escalateSpawn({ ...sp, level: lvl }, game.progress.waking, `dev-patrol#${i}`));
  return { spawns, where: node.place, backdrop: node.backdrop };
}

function makeBattle() {
  let game = newGame({ name: params.name || 'Wren', starter: params.starter || 'hearthbrand', seed });
  game = levelParty(game, level, params.surge != null ? Number(params.surge) : null);
  if (!ENCOUNTERS[nodeId]) throw new Error(`Unknown node ${nodeId}`);
  if (params.patrol) return startBattle(game, { patrol: patrolFor(game, nodeId) });
  if (ENCOUNTERS[nodeId].type !== 'fight') throw new Error(`${nodeId} is not a fight`);
  return startBattle(game, { nodeId });
}

// a tiny aftermath stand-in that reports what the battle handed off
const aftermath = {
  mount(root, ctx, p) {
    window.__aftermath = { result: p.result, returnTo: p.returnTo, ended: !!p.battle?.ended };
    const r = p.result || {};
    root.innerHTML = '';
    const h = document.createElement('h1');
    h.className = 'title-display';
    h.textContent = `Aftermath: ${r.result}`;
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify({ result: r.result, xp: r.xp, gold: r.gold, rounds: r.rounds, turns: r.turns, claimed: (r.claimed || []).map(i => i.name), drops: (r.drops || []).map(i => `${i.name} (${i.rarity})`) }, null, 2);
    const again = document.createElement('button');
    again.className = 'btn primary';
    again.textContent = 'Fight again';
    again.onclick = () => { window.location.hash = window.location.hash.replace(/seed=\d+/, '') + `&seed=${seed + 1}`; window.location.reload(); };
    root.append(h, pre, again);
  },
};
const world = { mount(root) { root.textContent = 'World (stub)'; } };

const settings = { battleSpeed: Number(params.speed) || 1, reducedMotion: params.reduced === '1', sound: false };
try { localStorage.setItem('aethermoor.settings.v1', JSON.stringify(settings)); } catch { /* storage blocked */ }

const ctx = createApp(document.getElementById('app'), { battle: battleScreen, aftermath, world }, { aliases: { road: 'world' } });
if (params.svc) {
  window.__svcCalls = [];
  ctx.services.cardSlam = (item, o) => { window.__svcCalls.push(['cardSlam', item?.name, o?.name]); return new Promise(r => setTimeout(r, 300)); };
  ctx.services.cardPreview = (item, o) => { window.__svcCalls.push(['cardPreview', item?.name, o?.heldBy]); return Promise.resolve(); };
}
try {
  const { game, battle } = makeBattle();
  ctx.setGame(game);
  window.__battleStart = { node: nodeId, level, seed, foes: battle.order.filter(id => battle.units[id].side === 'foe').map(id => battle.units[id].name) };
  ctx.go('battle', { battle, returnTo: 'world', auto: params.auto === '1' });
} catch (e) {
  document.getElementById('app').textContent = `Dev harness error: ${e.message}. Nodes: ${GAUNTLET.join(', ')}`;
  throw e;
}
