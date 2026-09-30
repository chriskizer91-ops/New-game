// Thareia (T2): Chapter 1's objective line (design/09-t2-spec.md 3.3), put above the Prologue's in objectives.js
// TH_OBJECTIVES. First match wins; each names its map and entity for the mini map's star. Owner: P (F wrote the
// spec's table in as the starting point).
const O = (cond, text, map, entity) => ({ if: cond, text, map, entity });

export const C1_OBJECTIVES = [
  O({ flag: 'c1-done' }, 'Chapter 1 is done. Chapter 2 comes next.', 'th-thornhollow', 'th-dael'),
  O({ flag: 'c1-aldric-letter' }, 'Tell Ranger Dael.', 'th-thornhollow', 'th-dael'),
  O({ flag: 'c1-lens' }, 'Show Aldric the lens.', 'th-thornhollow', 'th-aldric'),
  O({ flag: 'c1-node-found' }, 'Face what guards the node.', 'th-fawnrest-node', 'c1-guardian'),
  O({ flag: 'c1-stair-found' }, 'Go down the stair under the court.', 'th-fawnrest', 'th-fr-slab'),
  O({ flag: 'c1-fawnrest' }, 'Walk the shrine court with the shard.', 'th-fawnrest', 'c1-fr-court'),
  O({ flag: 'c1-hindwood' }, 'Go on to Fawnrest and find the keeper.', 'th-fawnrest', 'th-keeper'),
  O({ flag: 'c1-to-fawnrest' }, 'Go through the Hindwood to Fawnrest.', 'th-hindwood', 'c1-feral-druid'),
  O({ beaten: 'c1-mw-lantern' }, 'Talk to Garret in the Lamp Room.', 'th-mosswatch-2', 'th-garret-up'),
  O({ flag: 'c1-mw-arrived' }, 'Climb Mosswatch Tower to the Lamp Room.', 'th-mosswatch-2', 'c1-mw-lantern'),
  O({ flag: 'c1-west-open' }, 'Take the west road to Mosswatch Tower.', 'th-mossfall', 'th-mw-hire'),
  O({ flag: 'c1-aldric-maps' }, 'Ask Ranger Dael to open the west road.', 'th-thornhollow', 'th-dael'),
  O({ flag: 'c1-pulse' }, 'Tell Aldric about the warm water.', 'th-thornhollow', 'th-aldric'),
  O({ flag: 'c1-warm-water' }, 'Rest at Eldergrove\'s hearth.', 'th-eldergrove', 'th-eg-hearth'),
  O({ flag: 'c1-circle-saved' }, 'Go down under the Eldest Tree.', 'th-eldergrove', 'th-eldest-door'),
  O({ flag: 'c1-taela-guest' }, 'Stop the burners at the stone circle.', 'th-eldergrove', 'c1-grove-circle'),
  O({ flag: 'c1-met-taela' }, 'Hold the shard near the roots.', 'th-eldergrove', 'c1-eg-shard'),
  O({ flag: 'c1-thornway' }, 'Find Taela Greenmantle at the Eldest Tree.', 'th-eldergrove', 'th-taela'),
  O({ flag: 'c1-courier' }, 'Take the Thornway to Eldergrove.', 'th-thornway', 'c1-runner-camp'),
  O({ all: [{ flag: 'c1-start' }, { beaten: 'c1-landing' }] }, 'Find Aldric Fernshaw on the square.', 'th-thornhollow', 'th-aldric'),
  O({ flag: 'c1-start' }, 'Stop the thieves at the crate.', 'th-landing', 'c1-crate-thieves'),
];
