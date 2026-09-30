// Act III's view models (M7 spec §3.5, §4.2-§4.5), pure and DOM-free so node can test them (test/ui-m7.test.mjs):
//   prefightView(game, encId) -> { dice, stolen, allies }   what the pre-fight card (ui/world/sheets.js) says of the new
//                                                          tiers, the Unsmith's stolen relics and the guest
//   masterpieceTabShown(game) -> bool                      whether Hilda's forge shows its Masterpiece tab
//   masterpieceView(game, { base, name }) -> { offer, forged, name, nameOk, typed, why, ready }   the Masterpiece tab
// Owner: M7 P7.
import { FOE_TIERS } from '../../data/foes.js';
import { RELICS } from '../../data/relics.js';
import { threat } from '../../rules/world.js';
import { familyOf } from '../../rules/foe.js';
import { alliesFor } from '../../rules/gauntlet.js';
import { stolenFor } from '../../rules/codex.js';
import { ownsMasterpiece, storyOf } from '../../rules/cond.js';
import * as Forge from '../../rules/forge.js';

// What the card says of Act III's fights, from the rules:
//   dice    each foe's intent dice: how many (the Unsmith's two), and a hollow foe's +4 and the gift it lasts while
//           (the family's `bonusWhile`, rules/ai.js dieBonus; none named: the +4 always holds)
//   stolen  a foe whose phases steal (the Unsmith): the relics this game never claimed that he will take up
//           (rules/codex.js stolenFor, the same list the fight and the sim use) and the phase he takes them at, or null
//   allies  the guests who fight beside the party (rules/gauntlet.js alliesFor: Tamsin against the Unsmith)
export function prefightView(game, encId) {
  let spawns = [];
  try { spawns = threat(game, encId)?.spawns || []; } catch { spawns = []; }
  const dice = spawns.map(s => {
    const F = familyOf(s), T = FOE_TIERS[F.tier] || {};
    const gift = T.bonus ? F.bonusWhile || null : null;
    return { name: s.name || F.name, tier: F.tier, die: T.die || 6, dice: T.dice || 1, bonus: T.bonus || 0, gift, giftName: gift ? RELICS[gift]?.name || null : null };
  });
  // the phase that steals (phases[k] is phase k + 1: rules/combat.js afterFoeHurt)
  const stealAt = spawns.map(s => (familyOf(s).phases || []).findIndex(p => p.steals)).find(k => k >= 0);
  const steals = stealAt != null;
  let relics = [];
  if (steals) { try { relics = stolenFor(game); } catch { relics = []; } }
  let allies = [];
  try { allies = alliesFor(game, encId).map(s => { const F = familyOf(s); return { name: s.name || F.name, spawn: s }; }); } catch { allies = []; }
  return { dice, stolen: steals ? { relics, names: relics.map(id => RELICS[id]?.name || id), phase: stealAt + 1 } : null, allies };
}

// The tab shows once Act III has begun (the fifth council), once the Masterpiece is forged, or when a scene opens it
export const masterpieceTabShown = game => !!(storyOf(game)['council-5-done'] || storyOf(game)['masterpiece-forged'] || ownsMasterpiece(game));

// What the Masterpiece tab shows. `name` is what the Warden typed: the rules scrub it (rules/forge.js masterpieceName)
// and the tab shows only the scrubbed name, as text.
//   offer   rules/forge.js masterpieceOffer: { ok, reasons, cost, bases }
//   forged  the Masterpiece the party owns, or null (one per save)
//   name    the scrubbed name, or null when it will not take; nameOk; typed (anything typed at all)
//   why     what stops the forging now (one per save, the first reason, the base, the name), or null: ready
export function masterpieceView(game, { base = null, name = '' } = {}) {
  const offer = Forge.masterpieceOffer(game);
  const forged = (game?.inventory || []).find(i => i.masterpiece === true && !i.shattered) || null;
  const clean = Forge.masterpieceName(name);
  const typed = String(name ?? '').trim().length > 0;
  const why = forged ? 'Hilda forges one Masterpiece, and it is yours already'
    : !offer.ok ? offer.reasons[0]
      : !base || !offer.bases.includes(base) ? 'Choose the weapon Hilda is to forge'
        : !clean ? (typed ? 'Name it with 1 to 24 letters, numbers, spaces, apostrophes or hyphens' : 'Give it a name')
          : null;
  return { offer, forged, name: clean, nameOk: !!clean, typed, why, ready: !why };
}
