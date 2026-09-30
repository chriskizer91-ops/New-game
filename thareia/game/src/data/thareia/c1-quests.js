// Thareia (T2): Chapter 1's side quests S1-S9 (design/09-t2-spec.md 3.2), merged into data/quests.js QUESTS. Owner: P.
// Format as data/quests.js: { id, name, kind: 'side', giver, start: cond, steps: [{ text, done: cond, target }], reward }.
// Targets are the map and entity ids of spec section 2. Rewards are paid by each quest's last scene (c1-dialogue.js),
// which also marks the quest claimed ({ claim }), so `reward` stays empty here. S5 (the caravan) is T3's.
const step = (text, done, map, entity) => ({ text, done, target: { map, entity } });
const f = flag => ({ flag });
const Q = (id, name, giver, start, steps) => ({ id, name, kind: 'side', giver, start, steps, reward: {} });

export const C1_QUESTS = {
  'c1-s1': Q('c1-s1', 'Lanterns Hung Low', 'th-garret', f('s1-open'), [
    step('Ask Wenna Reedcask to take you to the cove.', f('s1-fjords-night'), 'th-mosswatch-1', 'th-wenna'),
    step('Stop the smugglers on the cove dock.', { beaten: 'c1-fjord-cove' }, 'th-fjords-cove', 'c1-fjord-cove'),
    step('Search the cave mouth.', f('s1-lens-receipt'), 'th-fjords-cove', 'th-cove-receipts'),
    step('Go back to the tower with Wenna.', f('s1-done'), 'th-mosswatch-1', 'th-wenna'),
    step('Show Garret the receipts.', f('s1-paid'), 'th-mosswatch-2', 'th-garret-up'),
  ]),
  'c1-s2': Q('c1-s2', 'The Missing Patrol', 'th-ranger', f('s2-open'), [
    step('Find the missing patrol under the Eldest Tree.', { beaten: 'c1-missing-patrol' }, 'th-heartroot-1', 'c1-missing-patrol'),
    step('Help the rangers who are still alive.', f('s2-healed'), 'th-heartroot-1', 'th-hr-sick-rangers'),
    step('Tell Ranger Dael.', f('s2-done'), 'th-thornhollow', 'th-dael'),
  ]),
  'c1-s3': Q('c1-s3', 'The Burners', 'taela', f('s3-talked'), [
    step('Find Oda\'s burner at the pilgrims\' fire in Fawnrest.', f('s3-done'), 'th-fawnrest', 'th-burner-fr'),
  ]),
  'c1-s4': Q('c1-s4', 'Stop Measuring', 'th-scholar', f('s4-open'), [
    step('Take a sample from the warm spring under the Eldest Tree.', f('s4-spring'), 'th-heartroot-1', 'th-hr-spring-sample'),
    step('Take a sample from the lagoon shore at Mossfall.', f('s4-coast'), 'th-mossfall', 'th-mf-shore-sample'),
    step('Take a sample from the pool at Fawnrest.', f('s4-pool'), 'th-fawnrest', 'th-fr-pool-sample'),
    step('Bring the samples to Illeth Sarovan.', f('s4-done'), 'th-eldergrove', 'th-scholar'),
  ]),
  'c1-s6': Q('c1-s6', 'The Bounty Nobody Can Name', 'th-ranger', f('s6-open'), [
    step('Go into the den on the Thornway cliff.', { any: [f('s6-den'), { beaten: 'c1-dael-bounty' }] }, 'th-briarmaw-den', 'c1-den-enter'),
    step('Face the beast in the den.', { beaten: 'c1-dael-bounty' }, 'th-briarmaw-den', 'c1-dael-bounty'),
    step('Decide what to do with its wreath.', f('s6-done'), 'th-briarmaw-den', 'c1-dael-bounty'),
  ]),
  'c1-s7': Q('c1-s7', 'At the Edge of the Wood', 'th-goblin', f('s7-open'), [
    step('Help the goblins, or send them off.', { any: [f('s7-helped'), f('s7-chased')] }, 'th-thornway', 'th-tw-goblins'),
    step('Go back to Snib.', f('s7-done'), 'th-thornway', 'th-tw-goblins'),
  ]),
  'c1-s8': Q('c1-s8', 'Cargo, Hire Rates', 'th-hire-landing', f('s8-open'), [
    step('Carry the cargo to the other hire post.', f('s8-delivered'), 'th-landing', 'th-skyhire'),
  ]),
  'c1-s9': Q('c1-s9', 'The White Deer Come Home', 'th-keeper', f('s9-open'), [
    step('Find the white deer in the Hindwood\'s northwest glade.', f('s9-deer-1'), 'th-hindwood', 'th-deer-1'),
    step('Find the white deer on the Hindwood\'s south bank.', f('s9-deer-2'), 'th-hindwood', 'th-deer-2'),
    step('Tell Keeper Maren.', f('s9-done'), 'th-fawnrest', 'th-keeper'),
  ]),
};
