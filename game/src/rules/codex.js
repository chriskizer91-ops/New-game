// The Hearth Codex (M4 spec §4.3, §4.4): the binder's pages and their permanent party bonus, and each
// relic's deeds and stage (Dormant, Kindled, Awakened). Pure, and imports data only, so rules/stats.js,
// forge.js, gauntlet.js and story.js can all use it.
//
//   relicsOn(pageId) -> [relicId]              in Codex order
//   pageProgress(game, pageId) -> { total, needed, claimed, sighted, awakened, done }
//   pagesDone(game) -> [pageId]                every relic the page needs is Claimed
//   pageBonus(game) -> stats                   the finished pages' rewards merged: deriveHero's `extra`
//   markPages(g) -> [pageId]                   MUTATES a game the caller already cloned: flags.pages[id]
//                                              = day for pages that just finished; returns them (banner)
//   relicDeeds(relicId) -> [deedId]            the relic's three deeds
//   deedsOf(item) -> [{ id, name, text, done }]   [] for anything that is not a relic
//   stageOf(item) -> 'dormant' | 'kindled' | 'awakened' | null   (null for non-relics)
//
// A page needs every relic on it except the starters you did not choose: those stay on their
// pedestals in the Keep reliquary (you carry one starter; Tamsin's is only ever lent), so Page I
// needs your starter and the other 21.
// Owner: P1 (M4).

import { RELICS } from '../data/relics.js';
import { PAGES } from '../data/codex.js';
import { DEEDS } from '../data/deeds.js';

// A relic whose data names no deeds (only test fixtures): the plainest three.
const DEFAULT_DEEDS = Object.freeze(['first-blood', 'fell-holder', 'brand']);

// M7: a page lists its numbers (`nos`: Page V, No. 000 among them) or gives its range (`from`, `to`); a Codex number is
// always compared as a number, never tested for truth (No. 000 is 0)
const onPage = p => (Array.isArray(p.nos) ? r => p.nos.includes(r.codex) : p.from == null ? () => false : r => r.codex >= p.from && r.codex <= p.to);
const ON_PAGE = Object.freeze(Object.fromEntries(PAGES.map(p => [p.id,
  Object.values(RELICS).filter(onPage(p)).sort((a, b) => a.codex - b.codex).map(r => r.id)])));

export const relicsOn = pageId => ON_PAGE[pageId] || [];

const codexOf = game => (game?.codex && typeof game.codex === 'object' ? game.codex : {});

export function pageProgress(game, pageId) {
  const codex = codexOf(game);
  const ids = relicsOn(pageId);
  const needed = ids.filter(id => !RELICS[id].starter || codex[id]?.claimed);
  const count = key => ids.filter(id => codex[id]?.[key]).length;
  const claimed = needed.filter(id => codex[id]?.claimed).length;
  return {
    total: ids.length, needed: needed.length, claimed, sighted: count('sighted'), awakened: count('awakened'),
    done: needed.length > 0 && claimed === needed.length,
  };
}

export const pagesDone = game => PAGES.filter(p => pageProgress(game, p.id).done).map(p => p.id);

// A page's bonus is permanent: a page recorded in flags.pages keeps paying even if something on it
// were ever lost.
export function pageBonus(game) {
  const recorded = game?.progress?.flags?.pages || {};
  const out = {};
  for (const p of PAGES) {
    if (!p.reward || !(recorded[p.id] || pageProgress(game, p.id).done)) continue;
    for (const [k, v] of Object.entries(p.reward.stats || {})) {
      if (k === 'resist') {
        out.resist = { ...(out.resist || {}) };
        for (const [a, n] of Object.entries(v)) out.resist[a] = (out.resist[a] || 0) + n;
      } else out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}

export function markPages(g) {
  const f = g.progress.flags;
  const fresh = pagesDone(g).filter(id => !f.pages?.[id]);
  if (fresh.length) f.pages = { ...(f.pages || {}), ...Object.fromEntries(fresh.map(id => [id, f.day || 1])) };
  return fresh;
}

// ---- deeds and stages ----------------------------------------------------------------------------

export function relicDeeds(relicId) {
  const r = RELICS[relicId];
  if (!r) return [];
  return (r.deeds?.length ? r.deeds : DEFAULT_DEEDS).filter(id => DEEDS[id]);
}

export function deedsOf(item) {
  if (!item || !RELICS[item.base]) return [];
  return relicDeeds(item.base).map(id => ({ ...DEEDS[id], done: !!item.deeds?.[id] }));
}

export function stageOf(item) {
  if (!item || !RELICS[item.base]) return null;
  if (item.awakened && RELICS[item.base].awaken?.[item.awakened]) return 'awakened';
  return deedsOf(item).some(d => d.done) ? 'kindled' : 'dormant';
}
