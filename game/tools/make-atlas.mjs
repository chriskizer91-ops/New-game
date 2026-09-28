// Makes src/ui/assets/atlas-image.js from the player's illustrated map (M3 spec §5.6, A9): launches
// Chromium (/opt/pw-browsers), pulls the embedded PNG out of
// /home/user/New-game/aethermoor-interactive-image-map-polished.html, draws it at 960x640 and writes
// `export default 'data:image/webp;base64,...'`, stepping the WebP quality down from 0.62 until the
// image is at most 150 KB (the integrator measured about 141 KB at q 0.6).
//
//   node tools/make-atlas.mjs
//
// SCAFFOLD: not implemented yet. It prints what it will do and leaves the placeholder alone.
// Owner: WP8.
console.log('make-atlas: not implemented yet (WP8). src/ui/assets/atlas-image.js keeps its 1x1 placeholder.');
