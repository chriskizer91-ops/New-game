// World actors (M3 spec §5.3): the party conga line (followers step into the leader's previous
// tiles; only the leader collides), roamers, lairs with nameplates, NPC idle-bob, the showoff.
// Exports: createActors() -> { sync(game, walk), party() -> [{ id, x, y, face }], list() -> [actor] }
// SCAFFOLD: the party stacks on the leader. WP7 builds the actors.
// Owner: WP7.

export function createActors() {
  let party = [], all = [];
  return {
    sync(game, walk) {
      if (!game || !walk) { party = []; all = []; return; }
      party = game.party.active.map(id => ({ id, x: walk.x, y: walk.y, face: walk.face }));
      all = [...party, ...(walk.roamers || []).map(r => ({ id: r.id, x: r.x, y: r.y, face: r.face, roamer: true }))];
    },
    party: () => party,
    list: () => all,
  };
}
