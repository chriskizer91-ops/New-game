// The Scorchgate Vaults (M4 spec §2.1, §2.3), under the keep. The stair from the Vault door (11-12,0)
// comes down into a braziered antechamber, where the only light is what falls down the stair. South
// runs the Hall of the Watch, pillared and drifted with ash, with a gallery either side: the west one
// climbs by a narrow step to the reliquary alcove, whose cache only a light can find (2,3); the east
// one is a collapsed barracks. At the hall's end three wights still stand before the inner door
// (13-14,14): the door (11-12,15) opens for good once they have been beaten. Beyond it is the Vault of
// Ash, where the fire stopped: the Ashen Warden (11,20; footprint x10-12, y19-20) faces the door with
// the Aegis up, and the Cinder Crown lights the vault while it stands.
// Layout notes: `dark` is the whole map (soft); the Crown's glow is a light while the Warden is armed
// (it comes back with the Brand of Ash's re-armed Echo). The inner door is M3's toll pattern, so the
// re-armed guard stands beside it and never shuts the way back up.
// Tiles (vault): '#' vault walls, ':' flagstones, 'k' bare stone, 'm' ash drifts, 'o' rubble,
// '*' braziers, 's' the stair.
// Format: src/data/maps/index.js. Owner: M4 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'scorchgate-vaults', name: 'The Scorchgate Vaults', region: 'sunscorch', biome: 'vault', music: 'dungeon',
  backdrop: 'scorchgate-vaults', zone: null, level: 13, travel: false, dark: true,
  lore: [[935, 676, 11, 12]],
  w: 24, h: 24,
  rows: [
    '###########ss###########', //  0
    '###########::###########', //  1
    '########*::::::*########', //  2
    '##kkk###::::::::########', //  3
    '##kkk###::::::::########', //  4
    '###k####::::::::########', //  5
    '###k#kkk#:::m::#kkkk####', //  6
    '###kkkmk##::::##kokkk###', //  7
    '###kkkkk::m::::#kkokk###', //  8
    '###kmkkk::::::::kmkkk###', //  9
    '###kkkkk##::::#:kkmok###', // 10
    '###kkok##::::m:##kkkk###', // 11
    '#########::::::#########', // 12
    '##########::::##########', // 13
    '#########::::::#########', // 14
    '###########::###########', // 15
    '####kkk*kkkkkkkk*kkk####', // 16
    '###kokkk::::::::kkkkk###', // 17
    '###kkmkk::::::::kkmkk###', // 18
    '##*kkkkk::::::::kkkkk*##', // 19
    '###kkkkk::::::::kkkok###', // 20
    '###kmkkk::::::::kkkmk###', // 21
    '####kkmkkkkkkkkkkmkk####', // 22
    '########################', // 23
  ],
  entities: [
    { id: 'sv-daylight', kind: 'light', at: [11, 1], radius: 3 },
    { id: 'sv-reliquary', kind: 'chest', at: [2, 3], lock: 'darkness', loot: { items: [{ rarity: 'storied' }], gems: { 'ash-garnet': 1 }, materials: { embers: 1 } } },
    { id: 'vault-guard', kind: 'encounter', enc: 'vault-guard', mode: 'block', at: [13, 14], area: [13, 14, 14, 14], face: 'w' },
    { id: 'sv-inner-door', kind: 'gate', area: [11, 15, 12, 15], look: 'door', open: { beaten: 'vault-guard' }, guard: 'vault-guard', text: 'The inner door of the Vaults, black with old fire. Three wights stand before it, as they have for three hundred years.' },
    { id: 'ashen-warden', kind: 'encounter', enc: 'ashen-warden', mode: 'lair', at: [11, 20], area: [10, 19, 12, 20], face: 'n' },
    { id: 'sv-crown-glow', kind: 'light', at: [11, 19], radius: 5, if: { not: { cleared: 'ashen-warden' } } },
  ],
  exits: [
    { id: 'sv-up', area: [11, 0, 12, 0], to: 'scorchgate', anchor: 'from-vaults' },
  ],
  anchors: { 'from-scorchgate': [11, 2, 's'] },
  roam: null,
});
