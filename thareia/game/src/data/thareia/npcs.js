// Thareia (T1): the Prologue's people, merged into data/npcs.js NPCS (format there). Art keys with no look of their own
// in art/map-sprites.js NPC_LOOKS fall back to a villager drawn from the key.
const N = (id, name, role, talk, art = id) => ({ id, name, art, role, talk });

export const TH_NPCS = {
  yara: N('yara', 'Captain Yara Dustwind', 'Skiff captain', [
    { if: { flag: 'th-hired' }, d: 'th-yara-deck' },
    { if: { flag: 'th-read-notice' }, d: 'th-yara-hire' },
    { if: { flag: 'met-yara' }, d: 'th-yara-again' },
    { d: 'th-yara-first' },
  ]),
  merryn: N('merryn', 'Merryn Copperpot', 'Herbalist', [
    { if: { not: { flag: 'th-saw-sedrin' } }, d: 'th-merryn-busy' },
    { d: 'th-merryn' },
  ]),
  sedrin: N('sedrin', 'Sedrin', 'Outrider', [{ d: 'th-sedrin-talk' }]),
  'th-fisher': N('th-fisher', 'Old Tobbin', 'Eel fisher', [{ d: 'th-fisher' }]),
  'th-netmender': N('th-netmender', 'Hesk', 'Net-mender', [{ d: 'th-netmender' }]),
  'th-gretch': N('th-gretch', 'Mayor Gretch', 'Mayor of Bogmire', [{ d: 'th-gretch' }], 'gretch'),
  'th-townsfolk': N('th-townsfolk', 'Widow Pell', 'Bogmire local', [{ d: 'th-townsfolk' }], 'pell'),
  'th-watch': N('th-watch', 'The Stilt-Watch', 'Bogmire watch', [{ d: 'th-watch' }], 'bm-watch'),
  'th-skeet': N('th-skeet', 'Skeet Marrow', 'Smuggler', [], 'smuggler'),
  aldric: N('aldric', 'Aldric Fernshaw', 'Merchant', [{ d: 'th-aldric' }]),
  'th-ranger': N('th-ranger', 'Ranger Dael', 'Thornwatch ranger', [{ d: 'th-ranger' }], 'dael'),
};
