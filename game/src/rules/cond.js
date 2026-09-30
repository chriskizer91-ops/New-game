// Conditions (M3 spec §4.3): one evaluator for entity presence, gates, locks, dialogue, quests and
// shops. Pure: reads the game, never changes it. A missing condition (undefined/null) is true.
//
// check(game, cond) -> boolean, where cond is one of
//   { flag }                 story[flag] is truthy
//   { cleared } { done }     flags.cleared[id] / flags.done[id]
//   { beaten }               flags.beaten[id] > 0, or cleared, or done
//   { brand }                progress.brands includes it       { brands: n }  unique Brands >= n
//   { waking: n }            progress.waking >= n               { level: n }   party level >= n
//   { owns }                 relic owned (in the inventory) and not shattered
//   { power }                a relic you own grants this map power (RELICS[x].mapPower.id)
//   { wears }                equipped by an active hero          { active: heroId } in the active party
//   { domain, level }        the best active hero's domains[domain].level >= level
//   { unlocked } { opened } { kindled }                          flags.unlocked / opened / kindled [id]
//   { quest, state }         questState(game, quest) === state ('hidden'|'active'|'ready'|'done')
//   { bounty, state }        bountyState(game, bounty) === state ('active'|'ready'|'done'); bounty 'any'
//                            holds when any bounty is in that state
//   { since: { flag, days } } story[flag] is not a day number yet, or flags.day - story[flag] >= days
//   { day: { every, at } }   M6: flags.day % every === at (Hodge's price of the day, spec §4.4)
//   { afford: { gold?, bag?: { [id]: n }, materials?: { [id]: n } } }   M6: the party has all of it
//   { masterpiece: true }    M7: the party owns the Warden's Masterpiece (an item with masterpiece: true, not shattered)
//   { pages: 'all' }         M7: every page of the Codex is complete, as the Codex screen counts it
//   { ending }               M7: game.ending is that ending ('rekindle' | 'release' | 'anew'), or any ending (true)
//   { all: [...] } { any: [...] } { not: cond }
// Import direction (A6): world -> story -> cond -> gauntlet. Never import world or story here.
// Owner: WP1.

import { RELICS } from '../data/relics.js';
import { QUESTS, BOUNTIES } from '../data/quests.js';
import { ENDING_IDS } from '../data/endings.js';
import { partyLevel, uniqueBrands } from './gauntlet.js';
import { allPagesDone } from './codex.js';

const EMPTY = Object.freeze({});
export const flagsOf = game => game?.progress?.flags || EMPTY;
const bag = (game, k) => flagsOf(game)[k] || EMPTY;
export const storyOf = game => bag(game, 'story');

// Relics you own: in the inventory and not shattered (a codex claim alone is not enough).
export function ownedRelics(game) {
  const out = new Set();
  for (const it of game?.inventory || []) if (RELICS[it.base] && !it.shattered) out.add(it.base);
  return out;
}

export function wornRelics(game) {
  const out = new Set();
  const byUid = new Map((game?.inventory || []).map(i => [i.uid, i]));
  for (const id of game?.party?.active || []) {
    for (const uid of Object.values(game.party.roster[id]?.gear || {})) {
      const it = uid && byUid.get(uid);
      if (it && RELICS[it.base] && !it.shattered) out.add(it.base);
    }
  }
  return out;
}

export function bestDomain(game, domain) {
  let best = { level: 0, heroId: null };
  for (const id of game?.party?.active || []) {
    const lv = game.party.roster[id]?.domains?.[domain]?.level || 0;
    if (lv > best.level) best = { level: lv, heroId: id };
  }
  return best;
}

export function isBeaten(game, id) {
  const f = flagsOf(game);
  return (f.beaten?.[id] || 0) > 0 || !!f.cleared?.[id] || !!f.done?.[id];
}

// A quest's state, derived from its conditions: hidden (not started), active, ready (every step
// done, reward not claimed), done (claimed).
export function questState(game, id) {
  const q = QUESTS[id];
  if (!q) return 'hidden';
  if (bag(game, 'quests')[id] === 'claimed') return 'done';
  if (!check(game, q.start)) return 'hidden';
  return q.steps.every(s => check(game, s.done)) ? 'ready' : 'active';
}

// A bounty's state: active (posted), ready (its encounter beaten), done (turned in to Dael).
export function bountyState(game, id) {
  const b = BOUNTIES[id];
  if (!b) return 'hidden';
  if (bag(game, 'quests')[`bounty:${id}`] === 'claimed') return 'done';
  return isBeaten(game, b.enc) ? 'ready' : 'active';
}

export function check(game, cond) {
  if (cond == null) return true;
  if (Array.isArray(cond)) return cond.every(c => check(game, c));
  if (typeof cond !== 'object') return !!cond;
  const f = flagsOf(game), p = game?.progress || EMPTY;
  if ('all' in cond) return cond.all.every(c => check(game, c));
  if ('any' in cond) return cond.any.some(c => check(game, c));
  if ('not' in cond) return !check(game, cond.not);
  if ('flag' in cond) return !!storyOf(game)[cond.flag];
  if ('cleared' in cond) return !!f.cleared?.[cond.cleared];
  if ('done' in cond) return !!f.done?.[cond.done];
  if ('beaten' in cond) return isBeaten(game, cond.beaten);
  if ('brand' in cond) return (p.brands || []).includes(cond.brand);
  if ('brands' in cond) return uniqueBrands(game) >= cond.brands;
  if ('waking' in cond) return (p.waking || 0) >= cond.waking;
  if ('domain' in cond) return bestDomain(game, cond.domain).level >= (cond.level || 0);
  if ('level' in cond) return partyLevel(game) >= cond.level;
  if ('owns' in cond) return ownedRelics(game).has(cond.owns);
  if ('power' in cond) return [...ownedRelics(game)].some(r => RELICS[r].mapPower?.id === cond.power);
  if ('wears' in cond) return wornRelics(game).has(cond.wears);
  if ('active' in cond) return (game?.party?.active || []).includes(cond.active);
  if ('unlocked' in cond) return !!bag(game, 'unlocked')[cond.unlocked];
  if ('opened' in cond) return !!bag(game, 'opened')[cond.opened];
  if ('kindled' in cond) return !!bag(game, 'kindled')[cond.kindled];
  if ('quest' in cond) return questState(game, cond.quest) === (cond.state || 'done');
  if ('bounty' in cond) {
    const want = cond.state || 'done';
    return cond.bounty === 'any' ? Object.keys(BOUNTIES).some(id => bountyState(game, id) === want) : bountyState(game, cond.bounty) === want;
  }
  if ('since' in cond) {
    const at = storyOf(game)[cond.since.flag];
    return typeof at !== 'number' || (f.day || 1) - at >= (cond.since.days || 0);
  }
  if ('day' in cond) return (f.day || 1) % cond.day.every === (cond.day.at || 0);
  if ('afford' in cond) return canAfford(game, cond.afford);
  if ('masterpiece' in cond) return ownsMasterpiece(game) === !!cond.masterpiece;
  if ('pages' in cond) return allPagesDone(game);
  if ('ending' in cond) return cond.ending === true ? game?.ending != null : game?.ending === cond.ending;
  throw new Error(`Unknown condition ${JSON.stringify(cond)}`);
}

// M7 (spec §4.5): the Warden's Masterpiece is in the inventory (one per save)
export const ownsMasterpiece = game => (game?.inventory || []).some(it => it.masterpiece === true && !it.shattered);

// M6: does the party have every part of a price? { gold?, bag?: { [consumableId]: n }, materials?: { [id]: n } }
export function canAfford(game, price) {
  if (!price) return true;
  if ((price.gold || 0) > (game?.gold || 0)) return false;
  for (const [id, n] of Object.entries(price.bag || {})) if ((game?.bag?.[id] || 0) < n) return false;
  for (const [id, n] of Object.entries(price.materials || {})) if ((game?.materials?.[id] || 0) < n) return false;
  return true;
}

// The keys check() understands, and a validator for data tests ("all conditions parse").
export const COND_KEYS = Object.freeze(['all', 'any', 'not', 'flag', 'cleared', 'done', 'beaten', 'brand', 'brands', 'waking', 'level',
  'owns', 'power', 'wears', 'active', 'domain', 'unlocked', 'opened', 'kindled', 'quest', 'bounty', 'since', 'day', 'afford',
  'masterpiece', 'pages', 'ending']);

// M6: a price is { gold?, bag?, materials? } with whole, positive amounts (the `afford` condition, the `pay` effect)
export function priceErrors(price, at = 'price') {
  if (!price || typeof price !== 'object' || Array.isArray(price)) return [`${at}: not an object`];
  const out = [];
  const whole = n => Number.isInteger(n) && n > 0;
  for (const k of Object.keys(price)) if (!['gold', 'bag', 'materials'].includes(k)) out.push(`${at}: unknown part ${k}`);
  if ('gold' in price && !whole(price.gold)) out.push(`${at}.gold: a whole number above 0`);
  for (const part of ['bag', 'materials']) {
    if (!(part in price)) continue;
    if (!price[part] || typeof price[part] !== 'object') { out.push(`${at}.${part}: not an object`); continue; }
    for (const [id, n] of Object.entries(price[part])) if (!whole(n)) out.push(`${at}.${part}.${id}: a whole number above 0`);
  }
  if (!Object.keys(price).length) out.push(`${at}: empty`);
  return out;
}

export function condErrors(cond, at = 'cond') {
  if (cond == null) return [];
  if (typeof cond !== 'object' || Array.isArray(cond)) return [`${at}: not an object`];
  const keys = Object.keys(cond);
  if ('all' in cond || 'any' in cond) {
    const list = cond.all || cond.any;
    if (!Array.isArray(list)) return [`${at}: all/any needs an array`];
    return list.flatMap((c, i) => condErrors(c, `${at}.${'all' in cond ? 'all' : 'any'}[${i}]`));
  }
  if ('not' in cond) return condErrors(cond.not, `${at}.not`);
  const known = keys.filter(k => COND_KEYS.includes(k));
  if (!known.length) return [`${at}: unknown condition ${JSON.stringify(cond)}`];
  if ('since' in cond && !(cond.since && typeof cond.since.flag === 'string')) return [`${at}: since needs { flag, days }`];
  if ('day' in cond) {
    const d = cond.day;
    if (!(d && Number.isInteger(d.every) && d.every >= 1 && Number.isInteger(d.at ?? 0) && (d.at ?? 0) >= 0 && (d.at ?? 0) < d.every)) return [`${at}: day needs { every, at } with 0 <= at < every`];
  }
  if ('afford' in cond) return priceErrors(cond.afford, `${at}.afford`);
  if ('masterpiece' in cond && typeof cond.masterpiece !== 'boolean') return [`${at}: masterpiece is true or false`];
  if ('pages' in cond && cond.pages !== 'all') return [`${at}: pages is 'all'`];
  if ('ending' in cond && !(cond.ending === true || ENDING_IDS.includes(cond.ending))) return [`${at}: ending is true or one of ${ENDING_IDS.join(', ')}`];
  return [];
}
