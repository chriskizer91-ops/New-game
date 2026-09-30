// Thareia (T1): the Prologue's fights and rest points, merged into data/encounters.js ENCOUNTERS.
// Format as data/encounters.js. The Prologue's story fights are `once`; their foes stand at levels 1-2, for a hero at
// level 1 with Captain Dustwind (level 2) beside them.
const S = (family, level, o = {}) => ({ family, level, gearTier: 0, omens: [], noWaking: true, ...o });

export const TH_ENCOUNTERS = {
  'docks-lantern': {
    id: 'docks-lantern', type: 'hearthfire', name: 'The Dock Lantern', place: 'Bogmire Docks', backdrop: 'bogmire',
    text: 'A brazier on the landing under the mooring tower, where the dockhands warm their hands at the change of shift.',
  },
  'th-hearth': {
    id: 'th-hearth', type: 'hearthfire', name: 'Thornhollow Hearth', place: 'Thornhollow', backdrop: 'thornhollow',
    text: 'The rangers\' fire in the flagstone square, inside the thorn palisade.',
  },
  // the crate cracks and the warm water gives up what lives in it
  'pr-lurkers': {
    id: 'pr-lurkers', type: 'fight', name: 'Up Out of the Water', place: 'Bogmire Docks', backdrop: 'bogmire', once: true, gentle: true,
    spawns: [S('boglurcher', 1), S('boglurcher', 1)],
    text: 'Two boglurchers heave up onto the dock, steaming. The water under the planks is warm as soup.',
  },
  // a smuggler crew comes for the crate while the dock is in uproar
  'pr-smugglers': {
    id: 'pr-smugglers', type: 'fight', name: 'The Crate-Thieves', place: 'Bogmire Docks', backdrop: 'bogmire', once: true, gentle: true,
    spawns: [S('smuggler', 1), S('smuggler', 2, { gearTier: 1, name: 'Skeet Marrow' }), S('smuggler', 1)],
    text: 'Kerchiefs over their faces and a handcart for the crate. Skeet Marrow has been paid to fetch it, and does not care who is standing on it.',
  },
  // optional: the leeches on the east boardwalk, between the dock and the reed island's cache
  'dk-leeches': {
    id: 'dk-leeches', type: 'fight', name: 'Leeches on the Boardwalk', place: 'Bogmire Docks', backdrop: 'bogmire', once: true,
    spawns: [S('mire-leech', 1), S('mire-leech', 2)],
    text: 'Fat marsh leeches, driven up onto the planks by the warm water. They are hungry, and you are warm.',
  },
};

export const TH_HEARTH_IDS = ['docks-lantern', 'th-hearth'];
