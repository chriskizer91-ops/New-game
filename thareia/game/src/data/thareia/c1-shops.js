// Thareia (T2): Chapter 1's shops (th-outfitter, th-trader, th-eldergrove), merged into data/shops.js SHOPS. Owner: P.
// Format as data/shops.js: { id, name, items: [consumableId], gems?: [gemId] }; opened by { open: 'shop:<id>' }.
// Shops sell consumables and gems only (no gear yet), so the outfitter stocks field kit and the Moss Agate.
export const C1_SHOPS = {
  // Dunna Reeve, Thornhollow's leatherworker: field kit for the Wilds
  'th-outfitter': { id: 'th-outfitter', name: 'Dunna Reeve\'s Leathers', items: ['hearth-tonic', 'bitterroot'], gems: ['moss-agate'] },
  // Col Ashby's general goods on the square
  'th-trader': { id: 'th-trader', name: 'Ashby\'s Goods', items: ['hearth-tonic', 'bitterroot', 'ember-salts', 'frost-draught'] },
  // Moss-Hand Tolly's druid supplies at Eldergrove: herbs, no metal
  'th-eldergrove': { id: 'th-eldergrove', name: 'Tolly\'s Druid Supplies', items: ['bitterroot', 'hearth-tonic'], gems: ['moss-agate'] },
};
