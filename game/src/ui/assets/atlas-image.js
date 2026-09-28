// The player's illustrated map, embedded (M3 spec §5.6, A9): a 960x640 WebP of at most 150 KB,
// written by tools/make-atlas.mjs as `export default 'data:image/webp;base64,...'`.
// SCAFFOLD: a 1x1 placeholder until WP8 runs tools/make-atlas.mjs. Screens must fall back to the
// procedural parchment when the image fails to load or is this placeholder (ATLAS_PLACEHOLDER).
// Owner: WP8.
export const ATLAS_PLACEHOLDER = true;
export default 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
