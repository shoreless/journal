// The lie of the land: where the ground is, where the wall runs, and the helper that lets
// three.js's standard material be coloured procedurally.
import * as THREE from 'three';
import { vnoise, GLSL_NOISE, GLSL_BUMP } from './noise.js';

export const CAM_Z = 1.6;
export const WALL_Z0 = CAM_Z + 1.0;   // just behind the eye
export const WALL_Z1 = -36;           // lost in the mist

export function wallX(z) { return -.2 + .75 * Math.sin(z * .12 + .5) + .22 * Math.sin(z * .33 + 1.3); }
export function gh(x, z) {
  return 1.1 * (vnoise(x * .045 + 3.1, 0, z * .045 + 7.7) - .5)
    + .14 * (vnoise(x * .35, 5, z * .35) - .5)
    + Math.max(0, -z - 6) * .022;
}
// How much of its height the wall still has at z: it has slumped in one place.
export function wallKeep(z) {
  const d = (z + 10.6) / 1.15;
  return (1 - .6 * Math.exp(-d * d)) * (1 + .04 * Math.sin(z * .7));
}

// Every material shares these, so one clock moves the whole wood.
export const U = {
  time: { value: 0 }, years: { value: 0 }, growth: { value: 0 }, lichen: { value: .3 },
  snow: { value: 0 }, wet: { value: 0 }, fresh: { value: 0 }, leaf: { value: 1 }, autumn: { value: 0 },
  spring: { value: 0 }, rot: { value: 0 }, fern: { value: 1 }, fernBrown: { value: 0 }, wind: { value: .5 },
  sunCol: { value: new THREE.Color(1, 1, 1) }, glow: { value: 0 },
  mossH: { value: .017 }, shells: { value: 16 }
};

const V_HEAD = /* glsl */`
varying vec3 vWp; varying vec3 vWn; varying vec3 vRest;
`;
const V_TAIL = /* glsl */`
#ifdef USE_INSTANCING
  mat4 mmW = modelMatrix*instanceMatrix;
#else
  mat4 mmW = modelMatrix;
#endif
vWp = (mmW*vec4(transformed, 1.)).xyz;
vWn = normalize(mat3(mmW)*objectNormal);
`;

// o: { key, uniforms, vHead, vBody, fHead, fAlbedo, fRough, fNormal, fEmissive }
export function patch(mat, o) {
  mat.onBeforeCompile = sh => {
    for (const k in U) sh.uniforms['u' + k[0].toUpperCase() + k.slice(1)] = U[k];
    Object.assign(sh.uniforms, o.uniforms || {});
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + V_HEAD + UNI + GLSL_NOISE + (o.vHead || ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;\n' + (o.vBody || '') + V_TAIL);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + V_HEAD + UNI + GLSL_NOISE + GLSL_BUMP + (o.fHead || ''))
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + (o.fAlbedo || ''))
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + (o.fRough || ''))
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + (o.fNormal || ''))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + (o.fEmissive || ''));
  };
  mat.customProgramCacheKey = () => o.key;
  return mat;
}

// A depth material that moves (and thins) the same way as the thing casting the shadow.
export function depthFor(o) {
  const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mat.onBeforeCompile = sh => {
    for (const k in U) sh.uniforms['u' + k[0].toUpperCase() + k.slice(1)] = U[k];
    Object.assign(sh.uniforms, o.uniforms || {});
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRest;\n' + UNI + GLSL_NOISE + (o.vHead || ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;\n' + (o.vBody || ''));
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRest;\n' + UNI + GLSL_NOISE + (o.fHead || ''))
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + (o.fDiscard || ''));
  };
  mat.customProgramCacheKey = () => 'depth-' + o.key;
  return mat;
}

const UNI = /* glsl */`
uniform float uTime, uYears, uGrowth, uLichen, uSnow, uWet, uFresh, uLeaf, uAutumn, uSpring, uRot, uFern, uFernBrown, uWind, uGlow, uMossH, uShells;
uniform vec3 uSunCol;
`;

// Where moss has taken hold. The same function colours the stone and grows the fur, so they agree.
export const GLSL_MOSS = /* glsl */`
// >0 where moss grows; how far above 0 says how long it has been there.
float mossField(vec3 p, vec3 n, float rnd, float hgt){
  float f = fbm(p*2.3)*1.5 + vn(p*13.)*.16;
  float m = f + (n.y*.5 + .5)*.42 + rnd*.2 + (1. - clamp(hgt, 0., 1.))*.1;
  return m - mix(1.72, .78, uGrowth);
}
float mossMask(vec3 p, vec3 n, float rnd, float hgt){ return smoothstep(-.07, .07, mossField(p, n, rnd, hgt)); }
float snowOn(vec3 p, vec3 n){
  return uSnow*smoothstep(.3, .7, n.y + (vn(p*4.) - .5)*.35);
}
`;
