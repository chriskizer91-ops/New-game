// The old game's world without Thareia's additions: the Aethermoor tests count and check the old maps, fires,
// encounters, people and scenes, so they read these (Thareia's own content is checked in test/thareia.test.mjs).
import { MAPS as ALL_MAPS, MAP_IDS as ALL_MAP_IDS, TH_MAP_IDS } from '../src/data/maps/index.js';
import { HEARTHS as ALL_HEARTHS } from '../src/data/world.js';
import { ENCOUNTERS as ALL_ENCOUNTERS } from '../src/data/encounters.js';
import { NPCS as ALL_NPCS } from '../src/data/npcs.js';
import { DIALOGUE as ALL_DIALOGUE, AFTER as ALL_AFTER } from '../src/data/dialogue.js';
import { TH_ENCOUNTERS } from '../src/data/thareia/encounters.js';
import { TH_NPCS } from '../src/data/thareia/npcs.js';
import { TH_DIALOGUE, TH_AFTER } from '../src/data/thareia/dialogue.js';
// Thareia (T2): Chapter 1's content is Thareia's too
import { C1_ENCOUNTERS } from '../src/data/thareia/c1-encounters.js';
import { C1_HEARTHS } from '../src/data/thareia/c1-world.js';
import { C1_NPCS } from '../src/data/thareia/c1-npcs.js';
import { C1_DIALOGUE, C1_AFTER } from '../src/data/thareia/c1-dialogue.js';

const without = (obj, ids) => Object.freeze(Object.fromEntries(Object.entries(obj).filter(([id]) => !ids.includes(id))));
export const MAPS = without(ALL_MAPS, TH_MAP_IDS);
export const MAP_IDS = Object.freeze(ALL_MAP_IDS.filter(id => !TH_MAP_IDS.includes(id)));
export const ENCOUNTERS = without(ALL_ENCOUNTERS, [...Object.keys(TH_ENCOUNTERS), ...Object.keys(C1_ENCOUNTERS)]);
export const HEARTHS = without(ALL_HEARTHS, [...Object.keys(TH_ENCOUNTERS), ...Object.keys(C1_ENCOUNTERS), ...Object.keys(C1_HEARTHS)]);
export const NPCS = without(ALL_NPCS, [...Object.keys(TH_NPCS), ...Object.keys(C1_NPCS)]);
export const DIALOGUE = without(ALL_DIALOGUE, [...Object.keys(TH_DIALOGUE), ...Object.keys(C1_DIALOGUE)]);
export const AFTER = without(ALL_AFTER, [...Object.keys(TH_AFTER), ...Object.keys(C1_AFTER)]);
