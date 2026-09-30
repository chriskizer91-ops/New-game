// The Aspect wheel. Each aspect beats exactly two others and is beaten by exactly two.
// Radiant and blight beat each other (light sears rot; rot gutters light), which is why
// they are the "dangerous" pair: whoever strikes first wins.
//
//   attack \ defends ->  beats (x1.5 vs)        beaten by (x0.5 vs)
//   ember                frost, verdant          stone, tide
//   frost                stone, storm            ember, radiant
//   storm                tide, radiant           stone, frost
//   stone                ember, storm            frost, verdant
//   verdant              stone, tide             ember, blight
//   tide                 ember, blight           storm, verdant
//   radiant              blight, frost           blight, storm
//   blight               verdant, radiant        radiant, tide
//
// The starter trio forms the triangle from the brief: Hearthbrand (ember) beats Stillwater
// Lance (frost), frost beats Cairnmaul (stone), stone beats ember.

import { deepFreeze } from '../core/freeze.js';

export const ASPECT_IDS = Object.freeze(['ember', 'frost', 'storm', 'stone', 'verdant', 'tide', 'radiant', 'blight']);

export const ASPECTS = deepFreeze({
  ember: {
    id: 'ember', name: 'Ember', color: '#e8622c',
    beats: ['frost', 'verdant'],
    why: { frost: 'Fire melts ice.', verdant: 'Fire eats the green.' },
    text: 'Hearth-heat and forge-fire. Burns.',
  },
  frost: {
    id: 'frost', name: 'Frost', color: '#8fd3f4',
    beats: ['stone', 'storm'],
    why: { stone: 'Ice in a crack splits the rock.', storm: 'A hard freeze stills the sky.' },
    text: 'Stillwater cold. Chills, then freezes.',
  },
  storm: {
    id: 'storm', name: 'Storm', color: '#b9a6ff',
    beats: ['tide', 'radiant'],
    why: { tide: 'Lightning runs through water.', radiant: 'Stormcloud swallows the sun.' },
    text: 'Wind and lightning off the Ironspire.',
  },
  stone: {
    id: 'stone', name: 'Stone', color: '#a08c6c',
    beats: ['ember', 'storm'],
    why: { ember: 'Stone smothers flame.', storm: 'Stone grounds the lightning.' },
    text: 'Cairn-weight. Staggers and breaks grips.',
  },
  verdant: {
    id: 'verdant', name: 'Verdant', color: '#5dbb4f',
    beats: ['stone', 'tide'],
    why: { stone: 'Roots split rock.', tide: 'Roots drink the flood.' },
    text: 'Root, thorn and green growing things.',
  },
  tide: {
    id: 'tide', name: 'Tide', color: '#2f7fc1',
    beats: ['ember', 'blight'],
    why: { ember: 'Water quenches fire.', blight: 'The tide washes rot clean.' },
    text: 'Blackwater and the pull of the deep.',
  },
  radiant: {
    id: 'radiant', name: 'Radiant', color: '#ffe9a0',
    beats: ['blight', 'frost'],
    why: { blight: 'Light sears rot.', frost: 'The sun thaws the ice.' },
    text: 'Holy light of the Fawnrest shrine.',
  },
  blight: {
    id: 'blight', name: 'Blight', color: '#7a4f8f',
    beats: ['verdant', 'radiant'],
    why: { verdant: 'Rot eats the green.', radiant: 'Rot gutters holy light.' },
    text: 'The Whispering Rot. Poisons.',
  },
});

export const ASPECT_MULT = Object.freeze({ strong: 1.5, weak: 0.5, same: 0.5 });

export const PHYSICAL_KINDS = Object.freeze(['slash', 'pierce', 'crush']);
export const ARMOR_TYPES = Object.freeze(['none', 'hide', 'mail', 'plate', 'chitin']);

// Physical kind vs armour type. Slash shreds hide but skids off rings and plate; pierce finds
// the gaps in mail but not in a beetle's shell; crush caves in plate and cracks chitin but
// soft hide soaks it up.
export const ARMOR_CHART = deepFreeze({
  slash: { none: 1, hide: 1.25, mail: 0.75, plate: 0.75, chitin: 1 },
  pierce: { none: 1, hide: 1, mail: 1.25, plate: 1, chitin: 0.75 },
  crush: { none: 1, hide: 0.75, mail: 1, plate: 1.25, chitin: 1.25 },
});
