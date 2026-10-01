// Thareia (T2): the airship's region view in WebGL (design/09-t2-spec.md 6.7). The region painting is a textured plane,
// 1 world unit to 1 painting px, lying on y = 0 with the painting's y running along +z (north is -z). A perspective
// camera (fov 30) looks down at it, tilted 15 degrees from straight down, at the distance where one painting px is one
// CSS px at the point it looks at. It follows the ship, clamped (as the 2D view is) so no edge of the painting shows.
// The next region's painting lies beside the first when the ship is near their shared edge. The ship floats above the
// plane, and a soft round shadow lies on the painting under it, pushed away from the light by its height.
//
// createSkyScene({ canvas, livery, onLost }) -> scene (throws when WebGL cannot start; the screen then draws in 2D)
//   scene.setRegion(id, image, neighbours)  neighbours: [{ id, image, dx, dy }] with dx, dy in painting px (+-PAINT..)
//   scene.frame(dt, view) where view = { ship: { x, y, h, alt }, motion: { bank, pitch, bob }, turn, speed, glow }
//                         moves the camera and the ship and renders
//   scene.project(x, y, h = 0) -> [sx, sy] CSS px on the canvas, for the 2D overlay (docks, route, arrow)
//   scene.unproject(sx, sy)   -> [x, y] painting px under that screen point
//   scene.resize(w, h, dpr)   scene.dispose()   scene.lost (true once the context is gone)
//   scene.shipHeight, scene.setShipVisible(on) (for the e2e: tools/e2e-sky3d.mjs)
import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, PlaneGeometry, MeshBasicMaterial, Texture, CanvasTexture, SRGBColorSpace,
  HemisphereLight, DirectionalLight, Color, Vector3, Raycaster, Plane, Vector2, LinearMipmapLinearFilter, LinearFilter,
} from 'three';
import { buildShip, LENGTH } from './ship.js';
import { PAINT, PAINT_H } from '../../data/thareia/sky.js';

export const FOV = 30, TILT = 15 * Math.PI / 180;
export const SHIP_HEIGHT = 60;        // painting px above the plane at full height
const SHIP_SIZE = 86;                 // painting px from the rudder to the bowsprit (the 2D sprite is drawn 88)
const LEAN = [0.35, 0.5];             // the shadow moves this far (x, y) per px of height: the light is north-west, high

export function createSkyScene({ canvas, livery = 'first', onLost = () => {} }) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(new Color('#0a1214'), 1);
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 20, 8000);
  scene.add(new HemisphereLight('#fff4de', '#3a4a3c', 1.1));
  const sun = new DirectionalLight('#fff1d6', 1.8); sun.position.set(-LEAN[0] * 1000, 1000, -LEAN[1] * 1000); scene.add(sun);
  const aniso = renderer.capabilities.getMaxAnisotropy();

  // ---- the painting planes ----
  const planeGeo = new PlaneGeometry(PAINT, PAINT_H);
  planeGeo.rotateX(-Math.PI / 2);      // lie flat: the image's top edge goes to -z (north)
  planeGeo.translate(PAINT / 2, 0, PAINT_H / 2);
  const textures = new Map();          // image -> texture (kept for the screen's life, disposed at the end)
  const texOf = image => {
    if (textures.has(image)) return textures.get(image);
    const t = new Texture(image);
    t.colorSpace = SRGBColorSpace; t.anisotropy = aniso; t.generateMipmaps = true;
    t.minFilter = LinearMipmapLinearFilter; t.magFilter = LinearFilter;
    if (image.complete && image.naturalWidth) t.needsUpdate = true;
    else image.addEventListener('load', () => { t.needsUpdate = true; }, { once: true });
    textures.set(image, t);
    return t;
  };
  const planes = [0, 1, 2].map(() => {
    const m = new Mesh(planeGeo, new MeshBasicMaterial({ color: '#ffffff' }));
    m.visible = false; m.renderOrder = -2; scene.add(m);
    return m;
  });
  const showPlane = (m, image, dx, dy) => {
    const t = image ? texOf(image) : null;
    if (m.material.map !== t) { m.material.map = t; m.material.needsUpdate = true; }
    m.position.set(dx, 0, dy); m.visible = !!image;
  };

  // ---- the shadow ----
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 4, 32, 32, 31);
    r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.6, 'rgba(0,0,0,0.7)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return new CanvasTexture(c);
  })();
  const shadowGeo = new PlaneGeometry(1, 1); shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new Mesh(shadowGeo, new MeshBasicMaterial({ map: shadowTex, color: '#000000', transparent: true, opacity: 0.4, depthWrite: false }));
  shadow.renderOrder = -1; scene.add(shadow);

  // ---- the ship ----
  const ship = buildShip({ livery });
  const scale = SHIP_SIZE / (LENGTH + 0.9);
  ship.root.scale.setScalar(scale);
  ship.ink.uniforms.thickness.value = 1.1;   // scene units (about a CSS px at this distance)
  scene.add(ship.root);

  // ---- sizing and the camera ----
  let dims = { w: 1, h: 1 };
  let dist = 1000;
  const look = new Vector3();
  function resize(w, h, dpr = 1) {
    dims = { w: Math.max(1, w), h: Math.max(1, h) };
    renderer.setPixelRatio(Math.min(2, dpr || 1));
    renderer.setSize(dims.w, dims.h, false);
    camera.aspect = dims.w / dims.h;
    dist = dims.h / (2 * Math.tan(FOV * Math.PI / 360));
    camera.far = dist * 3; camera.near = Math.max(10, dist * 0.05);
    camera.updateProjectionMatrix();
  }
  // where the camera looks: the ship's ground point, clamped as the 2D view clamps, but by what the tilted camera sees
  // (a little more ground above the middle than below it, and a wider top row), so no edge of the painting shows
  const aimAt = (x, y) => {
    const half = FOV * Math.PI / 360, high = dist * Math.cos(TILT);
    const above = high * Math.tan(TILT + half) - dist * Math.sin(TILT);   // ground from the middle to the top row
    const below = dist * Math.sin(TILT) - high * Math.tan(TILT - half);   // and to the bottom row
    const wide = dims.w / 2 * (high / Math.cos(TILT + half)) * Math.cos(half) / dist;  // half the top row's width
    // a side with the next painting laid beside it is not clamped: the view runs on over it (a seamless crossing)
    const lo = (v, min, max, openLo, openHi) => Math.min(openHi ? Infinity : max, Math.max(openLo ? -Infinity : min, v));
    const cx = 2 * wide >= PAINT && !open.left && !open.right ? PAINT / 2 : lo(x, wide, PAINT - wide, open.left, open.right);
    const cy = above + below >= PAINT_H && !open.up && !open.down ? PAINT_H / 2 : lo(y, above, PAINT_H - below, open.up, open.down);
    look.set(cx, 0, cy);
    camera.position.set(cx, dist * Math.cos(TILT), cy + dist * Math.sin(TILT));
    camera.up.set(0, 0, -1);
    camera.lookAt(look);
    camera.updateMatrixWorld();
  };

  const v = new Vector3();
  function project(x, y, h = 0) {
    v.set(x, h, y).project(camera);
    return [(v.x + 1) / 2 * dims.w, (1 - v.y) / 2 * dims.h];
  }
  const ray = new Raycaster(), ground = new Plane(new Vector3(0, 1, 0), 0), ndc = new Vector2(), hit = new Vector3();
  function unproject(sx, sy) {
    ndc.set(sx / dims.w * 2 - 1, 1 - sy / dims.h * 2);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(ground, hit) ? [hit.x, hit.z] : null;
  }

  let region = null, open = { left: false, right: false, up: false, down: false };
  function setRegion(id, image, neighbours = []) {
    region = id;
    open = { left: false, right: false, up: false, down: false };
    for (const n of neighbours) {
      if (!n.image) continue;
      if (n.dx < 0) open.left = true; else if (n.dx > 0) open.right = true;
      if (n.dy < 0) open.up = true; else if (n.dy > 0) open.down = true;
    }
    showPlane(planes[0], image, 0, 0);
    for (let i = 1; i < planes.length; i++) {
      const n = neighbours[i - 1];
      showPlane(planes[i], n?.image || null, n?.dx || 0, n?.dy || 0);
    }
  }

  function frame(dt, { ship: s, motion = {}, turn = 0, speed = 0, glow = 1 }) {
    if (api.lost) return;
    aimAt(s.x, s.y);
    const alt = Math.max(0, Math.min(1, s.alt));
    const height = SHIP_HEIGHT * alt + (motion.bob || 0) * alt + 4;
    ship.root.position.set(s.x, height, s.y);
    ship.root.rotation.set(0, Math.PI / 2 - s.h, 0);
    ship.update(dt, { bank: motion.bank || 0, pitch: motion.pitch || 0, turn, speed, glow });
    // the shadow: pushed away from the light by the height, softer and wider as the ship climbs
    shadow.position.set(s.x + LEAN[0] * height, 0.5, s.y + LEAN[1] * height);
    shadow.rotation.y = Math.PI / 2 - s.h;
    const spread = 1 + height * 0.004;
    shadow.scale.set(SHIP_SIZE * 0.55 * spread, 1, SHIP_SIZE * 0.95 * spread);
    shadow.material.opacity = 0.55 / (1 + height * 0.01);
    renderer.render(scene, camera);
  }

  const lostHandler = e => { e.preventDefault(); api.lost = true; onLost(); };
  canvas.addEventListener('webglcontextlost', lostHandler);

  const api = {
    lost: false, renderer, camera, ship,
    get region() { return region; },
    setRegion, frame, project, unproject, resize,
    // the ship's height above the painting now (painting px), and a switch to hide the ship (the e2e's comparison)
    get shipHeight() { return ship.root.position.y; },
    setShipVisible(on) { ship.root.visible = on; shadow.visible = on; },
    dispose() {
      canvas.removeEventListener('webglcontextlost', lostHandler);
      ship.dispose();
      planeGeo.dispose(); for (const p of planes) p.material.dispose();
      for (const t of textures.values()) t.dispose();
      textures.clear();
      shadowGeo.dispose(); shadow.material.dispose(); shadowTex.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch { /* already gone */ }
    },
  };
  return api;
}
