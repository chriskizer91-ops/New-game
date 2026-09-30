// Thareia (T1): what to do next in the Prologue, for the HUD's objective line and the mini map's star
// (rules/story.js nextObjective falls back to these when no quest is active). The first entry whose `if` holds.
export const TH_OBJECTIVES = Object.freeze([
  { if: { all: [{ flag: 'th-landed' }] }, text: 'Find Aldric Fernshaw in Thornhollow. Chapter 1 comes next.', map: 'th-thornhollow', entity: 'th-aldric' },
  { if: { flag: 'th-shard' }, text: 'Board the skiff and fly to Thornhollow.', map: 'bogmire-docks', entity: 'skiff' },
  { if: { flag: 'th-crate-cracked' }, text: 'Defend the dock and the crate.', map: 'bogmire-docks', entity: 'dock-crate' },
  { if: { flag: 'th-hired' }, text: 'Load Aldric Fernshaw\'s crate into the skiff.', map: 'bogmire-docks', entity: 'dock-crate' },
  { if: { flag: 'th-read-notice' }, text: 'Ask Captain Yara Dustwind for the deckhand job.', map: 'bogmire-docks', entity: 'yara' },
  { if: { flag: 'th-arrived' }, text: 'Find work: read the job board in Bogmire\'s square.', map: 'th-bogmire', entity: 'th-board' },
]);
