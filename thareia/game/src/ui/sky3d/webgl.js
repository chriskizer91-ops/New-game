// Thareia (T2): can this browser draw the 3D ship? (design/09-t2-spec.md 6.7)
// hasWebGL() tries a throwaway WebGL context once and remembers the answer. skyMode() is '2d' when the page's
// address asks for it (?sky=2d, for tests and weak phones) or WebGL is missing, else '3d'.
let known = null;

export function hasWebGL() {
  if (known !== null) return known;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    known = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    known = false;
  }
  return known;
}

export function forced2d() {
  try { return new window.URLSearchParams(window.location.search).get('sky') === '2d'; } catch { return false; }
}

export const skyMode = () => (forced2d() || !hasWebGL() ? '2d' : '3d');
