// What the title and the carry-over card say about a journey (M3 spec §5.7). Pure and DOM-free, so
// node can test it (test/shell.test.mjs).
//
//   saveLine(game) -> 'Wren · Thornhollow · Day 4 · Lv 5 · 9/24 relics'   (the title's Continue sub-line)
//   carryFacts(game) -> { heroes: [{ id, name, level }], claimed, total, gold, waking, place, at, near,
//                         looper, grudges }   (the carry-over card "The road has become a land";
//                         `at` is 'on' for a road and 'at' for a place)
//   inSentence(name)  "The Great Hall" -> "the Great Hall" (for the middle of a sentence)
// Owner: WP8.
import { MAPS } from '../../data/maps/index.js';
import { RELICS } from '../../data/relics.js';
import { ENCOUNTERS } from '../../data/encounters.js';
import { partyLevel } from '../../rules/gauntlet.js';

// M7 (spec §4.6): relics are counted out of the highest Codex number, as the Codex label counts them ("No. 000 / 074")
export const RELIC_TOTAL = Math.max(...Object.values(RELICS).map(r => r.codex));
export const inSentence = name => String(name || '').replace(/^The /, 'the ');
const shortName = (id, h) => (id === 'alondra' ? 'Alondra' : String(h?.name || id).split(' ')[0]);
const claimedOf = game => Object.keys(RELICS).filter(id => game.codex?.[id]?.claimed).length;

export function saveLine(game) {
  const w = game.party.roster.warden;
  const place = MAPS[game.progress.pos?.map]?.name || 'Hearthstone Keep';
  return `${w.name} · ${place} · Day ${game.progress.flags.day} · Lv ${partyLevel(game)} · ${claimedOf(game)}/${RELIC_TOTAL} relics`;
}

export function carryFacts(game) {
  const p = game.progress || {}, f = p.flags || {};
  const heroes = (game.party?.active || []).map(id => ({ id, name: shortName(id, game.party.roster[id]), level: game.party.roster[id]?.level || 1 }));
  const map = MAPS[p.pos?.map];
  const node = p.node && ENCOUNTERS[p.node];
  // "by the Bramble Toll"; a place's own fire is "its Hearthfire" ("Thornhollow, by Thornhollow Hearth" reads twice)
  const bare = s => String(s || '').replace(/^The /, '').toLowerCase();
  let near = node && map && node.name !== map.name ? node.name : null;
  if (near && bare(near).includes(bare(map.name))) near = node.type === 'hearthfire' ? 'its Hearthfire' : null;
  return {
    heroes, claimed: claimedOf(game), total: RELIC_TOTAL, gold: game.gold || 0, waking: p.waking || 0,
    place: map ? map.name : 'Hearthstone Keep',
    at: map && map.lore?.length > 1 ? 'on' : 'at', // you wake on a road, at a place
    near,
    looper: (f.runs || 0) > 0 || (p.brands || []).length > 0,
    grudges: Object.keys(f.grudges || {}).length,
  };
}
