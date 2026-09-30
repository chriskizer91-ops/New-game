// Thareia (T2): Chapter 1's people (design/09-t2-spec.md 3.1), merged into data/npcs.js NPCS. Owner: P.
// Format as data/thareia/npcs.js: N(id, name, role, talk, art); the first talk entry whose `if` holds picks the scene.
// aldric and th-ranger replace their Prologue entries (TH_NPCS); the Prologue's line stays as the last fallback.
// Speaker-only people (no map npc, talk []): th-burner (Oda), th-lamp-runner, th-hollis, th-vesper.
const N = (id, name, role, talk, art = id) => ({ id, name, art, role, talk });
const f = flag => ({ flag });
const not = cond => ({ not: cond });
const all = (...c) => ({ all: c });

// the three Dustwind hire posts: closed until Aldric vouches (c1-skiff-rented)
const hire = node => [{ if: f('c1-skiff-rented'), d: node }, { d: 'c1-hire-closed' }];

export const C1_NPCS = {
  aldric: N('aldric', 'Aldric Fernshaw', 'Merchant', [
    { if: f('c1-aldric-letter'), d: 'c1-aldric-after' },
    { if: f('c1-lens'), d: 'c1-aldric-lens' },
    { if: f('c1-aldric-maps'), d: 'c1-aldric-waiting' },
    { if: f('c1-pulse'), d: 'c1-aldric-maps' },
    { if: f('c1-courier'), d: 'c1-aldric-courier-wait' },
    { if: f('c1-start'), d: 'c1-aldric-start' },
    { d: 'th-aldric' },
  ]),
  'th-ranger': N('th-ranger', 'Ranger Dael', 'Ranger of Thornhollow', [
    { if: f('c1-done'), d: 'c1-dael-after' },
    { if: f('c1-aldric-letter'), d: 'c1-dael-end' },
    { if: f('c1-lens'), d: 'c1-dael-wait' },
    { if: all(f('c1-aldric-maps'), not(f('c1-west-open'))), d: 'c1-dael-west' },
    { if: all(f('s2-healed'), not(f('s2-done'))), d: 'c1-dael-patrol-done' },
    { if: all(f('s2-lead'), not(f('s2-open'))), d: 'c1-dael-patrol' },
    { if: f('c1-dael'), d: 'c1-dael-again' },
    { if: f('c1-start'), d: 'c1-dael' },
    { d: 'th-ranger' },
  ], 'dael'),
  'th-hire-landing': N('th-hire-landing', 'Hob Dustwind', 'Skiff hire, Thornhollow', hire('c1-hire-thornhollow'), 'skyhire'),
  'th-hire-eg': N('th-hire-eg', 'Nell Dustwind', 'Skiff hire, Eldergrove', hire('c1-hire-eldergrove'), 'skyhire'),
  'th-hire-mw': N('th-hire-mw', 'Tam Dustwind', 'Skiff hire, Mosswatch', hire('c1-hire-mosswatch'), 'skyhire'),
  'th-outfitter': N('th-outfitter', 'Dunna Reeve', 'Leatherworker', [{ d: 'c1-outfitter' }], 'outfitter'),
  'th-trader': N('th-trader', 'Col Ashby', 'Trader', [{ d: 'c1-trader' }], 'trader'),
  taela: N('taela', 'Taela Greenmantle', 'Druid of Eldergrove', [
    { if: f('c1-met-taela'), d: 'c1-taela-roots' },
    { d: 'c1-taela-first' },
  ]),
  'th-acolyte': N('th-acolyte', 'Linnet', 'Grove acolyte', [{ d: 'c1-acolyte' }], 'acolyte'),
  'th-miravel': N('th-miravel', 'Elder Miravel', 'Seed-vault keeper', [{ d: 'c1-miravel' }], 'miravel'),
  'th-scholar': N('th-scholar', 'Illeth Sarovan', 'Scholar of the Rot', [
    { if: f('s4-done'), d: 'c1-scholar-after' },
    { if: all(f('s4-spring'), f('s4-coast'), f('s4-pool')), d: 'c1-scholar-done' },
    { if: f('s4-open'), d: 'c1-scholar-wait' },
    { if: f('c1-warm-water'), d: 'c1-scholar-offer' },
    { d: 'c1-scholar-busy' },
  ], 'scholar'),
  'th-eg-supplier': N('th-eg-supplier', 'Moss-Hand Tolly', 'Druid supplies', [{ d: 'c1-supplier' }], 'supplier'),
  'th-sick-ranger': N('th-sick-ranger', 'Ranger Ilse and Ranger Cade', 'Rot-sick rangers', [{ d: 'c1-sick-rangers' }], 'ranger'),
  'th-garret': N('th-garret', 'Old Garret', 'Watchkeeper of Mosswatch', [
    // the thanks pays once (s1-paid), then Garret goes back to his usual line
    { if: all(f('s1-done'), not(f('s1-paid'))), d: 'c1-garret-thanks' },
    { if: f('c1-to-fawnrest'), d: 'c1-garret-after' },
    { if: { beaten: 'c1-mw-lantern' }, d: 'c1-rot-line' },
    { if: f('c1-mw-arrived'), d: 'c1-garret-wait' },
    { d: 'c1-garret-first' },
  ], 'garret'),
  'th-wenna': N('th-wenna', 'Wenna Reedcask', 'Fjord-runner', [
    { if: f('s1-done'), d: 'c1-wenna-after' },
    { if: f('s1-lens-receipt'), d: 'c1-wenna-home' },
    { d: 'c1-wenna' },
  ], 'wenna'),
  'th-keeper': N('th-keeper', 'Keeper Maren', 'Keeper of Fawnrest', [
    { if: f('s9-done'), d: 'c1-keeper-after' },
    { if: all(f('s9-deer-1'), f('s9-deer-2')), d: 'c1-keeper-home' },
    { if: f('c1-node-cooled'), d: 'c1-keeper-deer' },
    { if: f('c1-fawnrest'), d: 'c1-keeper-again' },
    { d: 'c1-keeper' },
  ], 'keeper'),
  'th-pilgrim': N('th-pilgrim', 'A sick pilgrim', 'Pilgrim', [
    { if: f('c1-node-cooled'), d: 'c1-pilgrim-better' },
    { d: 'c1-pilgrim' },
  ], 'pilgrim'),
  'th-burner-fr': N('th-burner-fr', 'A burner', 'Oda\'s burner', [{ d: 'c1-burner-at-fawnrest' }], 'burner'),
  'th-goblin': N('th-goblin', 'Snib', 'Goblin forager', [
    { if: { any: [f('s7-helped'), f('s7-chased')] }, d: 'c1-goblin-after' },
    { d: 'c1-goblin' },
  ], 'goblin'),
  // speakers only
  'th-burner': N('th-burner', 'Oda the Thornmother', 'Burner', [], 'oda'),
  'th-lamp-runner': N('th-lamp-runner', 'A lamp-runner', 'Smuggler', [], 'smuggler'),
  'th-hollis': N('th-hollis', 'Hollis Fairweight', 'Signalman', [], 'smuggler'),
  'th-vesper': N('th-vesper', 'Vesper', 'Seller of cures', [], 'smuggler'),
};
