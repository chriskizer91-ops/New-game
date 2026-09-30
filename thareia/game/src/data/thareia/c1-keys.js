// Thareia (T2): Chapter 1's key items (design/09-t2-spec.md 3.2). Owner: P.
// C1_KEYS[id] = { name, text }. Given by the story effect { key: id } (flags.keys[id]); read by the condition { key: id };
// the world screen toasts the name, and the Journal's Keys tab lists the ones held.
export const C1_KEYS = {
  // pried off the node under Fawnrest (c1-node-cools)
  'th-lens': { name: 'The Lens', text: 'A clear lens in a silver ring, stamped with a small mark.' },
  // from Aldric's drawer (c1-aldric-lens)
  'th-buyers-letter': { name: 'The Buyers\' Letter', text: 'One letter, unsigned. Sandspire silver. The same small mark.' },
};
