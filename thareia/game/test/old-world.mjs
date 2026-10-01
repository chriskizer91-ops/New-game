// The old game's world without Thareia's additions: the Aethermoor tests count and check the old maps, fires,
// encounters, people and scenes, so they read these (Thareia's own content is checked in test/thareia.test.mjs).
import { MAPS as ALL_MAPS, MAP_IDS as ALL_MAP_IDS, TH_MAP_IDS } from '../src/data/maps/index.js';
import { HEARTHS as ALL_HEARTHS } from '../src/data/world.js';
import { ENCOUNTERS as ALL_ENCOUNTERS } from '../src/data/encounters.js';
import { NPCS as ALL_NPCS } from '../src/data/npcs.js';
import { DIALOGUE as ALL_DIALOGUE, AFTER as ALL_AFTER, RESTS as ALL_RESTS } from '../src/data/dialogue.js';
import { QUESTS as ALL_QUESTS } from '../src/data/quests.js';
import { SHOPS as ALL_SHOPS } from '../src/data/shops.js';
import { RELICS as ALL_RELICS } from '../src/data/relics.js';
import { TH_ENCOUNTERS } from '../src/data/thareia/encounters.js';
import { TH_NPCS } from '../src/data/thareia/npcs.js';
import { TH_DIALOGUE, TH_AFTER } from '../src/data/thareia/dialogue.js';
// Thareia (T2): Chapter 1's content is Thareia's too
import { C1_ENCOUNTERS } from '../src/data/thareia/c1-encounters.js';
import { C1_HEARTHS } from '../src/data/thareia/c1-world.js';
import { C1_NPCS } from '../src/data/thareia/c1-npcs.js';
import { C1_DIALOGUE, C1_AFTER, C1_RESTS } from '../src/data/thareia/c1-dialogue.js';
import { C1_QUESTS } from '../src/data/thareia/c1-quests.js';
import { C1_SHOPS } from '../src/data/thareia/c1-shops.js';

const without = (obj, ids) => Object.freeze(Object.fromEntries(Object.entries(obj).filter(([id]) => !ids.includes(id))));
export const MAPS = without(ALL_MAPS, TH_MAP_IDS);
export const MAP_IDS = Object.freeze(ALL_MAP_IDS.filter(id => !TH_MAP_IDS.includes(id)));
export const ENCOUNTERS = without(ALL_ENCOUNTERS, [...Object.keys(TH_ENCOUNTERS), ...Object.keys(C1_ENCOUNTERS)]);
export const HEARTHS = without(ALL_HEARTHS, [...Object.keys(TH_ENCOUNTERS), ...Object.keys(C1_ENCOUNTERS), ...Object.keys(C1_HEARTHS)]);
export const NPCS = without(ALL_NPCS, [...Object.keys(TH_NPCS), ...Object.keys(C1_NPCS)]);
export const DIALOGUE = without(ALL_DIALOGUE, [...Object.keys(TH_DIALOGUE), ...Object.keys(C1_DIALOGUE)]);
export const AFTER = without(ALL_AFTER, [...Object.keys(TH_AFTER), ...Object.keys(C1_AFTER)]);
export const QUESTS = without(ALL_QUESTS, Object.keys(C1_QUESTS));
export const SHOPS = without(ALL_SHOPS, Object.keys(C1_SHOPS));
export const RESTS = Object.freeze(ALL_RESTS.filter(r => !C1_RESTS.includes(r) && !C1_RESTS.some(c => c.at === r.at && c.d === r.d)));
// Chapter 1's relics (`thareia: true`, Codex Nos. 75-78) sit on no Codex page
export const RELICS = Object.freeze(Object.fromEntries(Object.entries(ALL_RELICS).filter(([, r]) => !r.thareia)));
