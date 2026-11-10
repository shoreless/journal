// Small deterministic noise, once for JavaScript (placing things) and once for GLSL (colouring them).

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), fx), l(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), fx), fy),
    l(l(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), fx), l(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), fx), fy),
    fz);
}

export function fbm(x, y, z, octaves = 4) {
  let a = .5, s = 0;
  for (let i = 0; i < octaves; i++) {
    s += a * vnoise(x, y, z);
    x = x * 2.03 + 17.1; y = y * 2.03 + 17.1; z = z * 2.03 + 17.1; a *= .5;
  }
  return s;
}

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export const GLSL_NOISE = /* glsl */`
float h13(vec3 p){ p = fract(p*.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y)*p.z); }
float vn(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(mix(h13(i), h13(i + vec3(1,0,0)), f.x), mix(h13(i + vec3(0,1,0)), h13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h13(i + vec3(0,0,1)), h13(i + vec3(1,0,1)), f.x), mix(h13(i + vec3(0,1,1)), h13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a*vn(p); p = p*2.03 + 17.1; a *= .5; } return s; }
`;

// Fragment shaders only: bend a normal by a procedural height field, using screen-space derivatives.
export const GLSL_BUMP = /* glsl */`
vec3 bumpN(vec3 vpos, vec3 n, float h, float scale){
  vec3 dpx = dFdx(vpos), dpy = dFdy(vpos);
  float dhx = dFdx(h)*scale, dhy = dFdy(h)*scale;
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 g = sign(det)*(dhx*r1 + dhy*r2);
  return normalize(abs(det)*n - g);
}
`;
