// Yarn. One shader draws every stitch: V-shaped knit stitches on the outside of a thing,
// rows of purl bumps on the inside, the way a real knitted tube looks when you climb into it.
import * as THREE from 'three';

export const ZTOP = 1.3, ZBOT = .22, POD_H = 1.45;
export const podR = y => .15 + .3 * Math.pow(Math.sin(Math.PI * Math.pow(Math.min(1, Math.max(0, y / POD_H)), .7)), .75);

export const TIME = { value: 0 };

const POD_GLSL = /* glsl */`
uniform float uZip, uSnug, uPhase, uTime;
float podR(float y){ return .15 + .3*pow(max(sin(3.14159*pow(clamp(y/${POD_H}, 0., 1.), .7)), 0.), .75); }
// Half-width of the opening, in radians, at height y: a lens above the zip pull.
float zipW(float y){
  float span = ${ZTOP} - uZip;
  if (y <= uZip || y >= ${ZTOP} || span < .001) return 0.;
  return .62*min(1., span/.45)*pow(sin(3.14159*(y - uZip)/span), .7);
}
float podRadius(float y){ return podR(y)*(1. + .012*sin(uTime*1.1 + uPhase))*(1. - .07*uSnug); }
vec3 podP;
`;

const FRAG = /* glsl */`
uniform vec3 uLining; uniform float uGlow, uSnug, uTime, uTape, uWin;
varying vec2 vSt; varying float vEdge; varying vec2 vPod;
float kH; float kLod;
float segd(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba*clamp(dot(pa, ba)/dot(ba, ba), 0., 1.)); }
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
float knitFront(vec2 st){
  vec2 c = fract(st); float d = 9.;
  for (int j = -1; j <= 1; j++) {
    vec2 q = c - vec2(0., float(j));
    d = min(d, segd(q, vec2(.5, -.22), vec2(.1, 1.1)));
    d = min(d, segd(q, vec2(.5, -.22), vec2(.9, 1.1)));
  }
  return d;
}
float knitBack(vec2 st){
  vec2 c = fract(st); float d = 9., w = .17*cos(6.28318*c.x);
  for (int j = -1; j <= 1; j++) {
    float y = c.y - float(j);
    d = min(d, abs(y - (.28 + w))); d = min(d, abs(y - (.78 - w)));
  }
  return d*.85;
}
vec3 bumpN(vec3 vpos, vec3 n, float h, float scale){
  vec3 dpx = dFdx(vpos), dpy = dFdy(vpos);
  float dhx = dFdx(h)*scale, dhy = dFdy(h)*scale;
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  return normalize(abs(det)*n - sign(det)*(dhx*r1 + dhy*r2));
}
`;

const ALBEDO = /* glsl */`
{
  bool back = !gl_FrontFacing;
  vec3 yarn = back ? uLining : diffuseColor.rgb;
  float d = back ? knitBack(vSt) : knitFront(vSt);
  float h = sqrt(max(0., 1. - (d*d)/(.21*.21)));
  vec2 c = fract(vSt);
  float fw = fwidth(vSt.x) + fwidth(vSt.y), fine = 1. - smoothstep(.03, .12, fw);
  h *= 1. - .1*fine*(.5 - .5*sin((c.y*3. + (c.x < .5 ? -c.x : c.x)*9.)*6.28318));      // the twist in the yarn
  kLod = smoothstep(.08, .4, fw);
  h = mix(h, .66, kLod);
  float tone = .93 + .14*h21(floor(vSt))*(1. - kLod) + (h21(floor(vSt*9.)) - .5)*.08*fine;
  vec3 col = yarn*(.42 + .58*h)*tone;
  float tape = uTape*smoothstep(.05, .03, vEdge);          // the cloth the zip is sewn to
  col = mix(col, vec3(.16, .13, .11), tape); h = mix(h, .5, tape);
  kH = h;
  diffuseColor.rgb = col;
}
`;
const EMISSIVE = /* glsl */`
if (!gl_FrontFacing) {
  // Inside, the only light is what comes through the wool: the yarn is in shadow and
  // every gap between stitches is a small bright hole. More comes in on the window side.
  float breathe = .93 + .07*sin(uTime*1.1);
  float hgt = smoothstep(-.15, 1., vPod.y/1.45), side = .68 + .32*cos(vPod.x - uWin);
  vec3 light = mix(vec3(1., .93, .8), vec3(1., .55, .24), uSnug);
  float amt = uGlow*breathe*mix(.8, .5, uSnug)*(.3 + .7*hgt)*side;
  float gap = (1. - kH)*(1. - kH);
  totalEmissiveRadiance += uLining*light*amt*(.2 + .45*kH) + light*amt*gap*mix(1.1, 1.7, uSnug);
}
`;

function install(mat, o = {}) {
  const uniforms = {
    uLining: { value: o.lining || mat.color }, uGlow: { value: o.glow ?? 0 }, uTape: { value: o.pod ? 1 : 0 },
    uWin: o.win || { value: 0 }, uCapY: { value: o.capY ?? 1 }, uSnug: o.snug || { value: 0 }, uZip: o.zip || { value: ZTOP }, uPhase: { value: o.phase ?? 0 }, uTime: TIME
  };
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSt; varying float vEdge; varying vec2 vPod; uniform float uCapY;\n' + (o.pod || o.tooth ? POD_GLSL : '') + (o.tooth ? 'attribute vec2 aTooth;' : ''))
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + (o.pod ? /* glsl */`
        {
          float a = position.x, y = position.y, w = zipW(y);
          float ap = w + a*(6.28318 - 2.*w)/6.28318;
          float edge = min(a, 6.28318 - a);
          float r = podRadius(y) + w*.2*exp(-edge/.3);          // the flaps fall open a little
          podP = vec3(r*sin(ap), y, r*cos(ap));
          float dr = (podR(y + .01) - podR(y - .01))/.02;
          objectNormal = normalize(vec3(sin(ap), -dr, cos(ap)));
          vEdge = edge; vPod = vec2(ap, y);
        }` : o.tooth ? /* glsl */`
        {
          float y = aTooth.x, w = zipW(y), ang = aTooth.y*(w + .006);
          float r = podRadius(y) + w*.2 + .006;
          vec3 radial = vec3(sin(ang), 0., cos(ang)), tang = vec3(cos(ang), 0., -sin(ang));
          podP = radial*(r + position.z) + vec3(0., y + position.y, 0.) + tang*(position.x - aTooth.y*.002);
          objectNormal = normalize(tang*normal.x + vec3(0., normal.y, 0.) + radial*normal.z);
          vEdge = 9.; vPod = vec2(0.);
        }` : 'vEdge = 9.; vPod = vec2(0., uCapY);'))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSt = uv;\n' + (o.pod || o.tooth ? 'transformed = podP;' : ''));
    if (o.tooth) return;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + ALBEDO)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = bumpN(-vViewPosition, normal, kH, .035*(1. - kLod));')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + EMISSIVE);
  };
  mat.customProgramCacheKey = () => 'knit' + (o.pod ? 'pod' : o.tooth ? 'tooth' : '');
  mat.userData.u = uniforms;
  return mat;
}

export const knit = (color, o) => install(new THREE.MeshStandardMaterial({ color, roughness: .95, metalness: 0, side: THREE.DoubleSide }), o);

// Stitch size, in metres. Chunky.
const SW = .052, SH = .042;
function stitchUV(g, cols, rows) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * cols, uv.getY(i) * rows);
  return g;
}

function petal(L, W, droop, cup) {
  const g = new THREE.PlaneGeometry(1, 1, 8, 12), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const s = p.getX(i) * 2, t = p.getY(i) + .5;
    const w = W * Math.pow(Math.sin(Math.PI * Math.pow(t, .75)), .65) * (.25 + .75 * Math.min(1, t * 4));
    p.setXYZ(i, s * w * .5, -droop * t * t * L + cup * s * s * w, t * L);
  }
  g.computeVertexNormals();
  return stitchUV(g, Math.round(W / SW), Math.round(L / SH));
}

const rnd = (() => { let a = 20261115; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();

// One floor weepie: a stem you can sit in, a zip, two leaves, and a head that hangs.
export function buildFlower({ stem, petal: petalCol, heart, lining }) {
  const group = new THREE.Group();
  const zip = { value: ZTOP }, snug = { value: 0 }, win = { value: 0 }, phase = rnd() * 6.28;

  // The stem. Its vertices are (angle, height); the shader wraps them round and opens the zip.
  const pg = new THREE.PlaneGeometry(1, 1, 110, 84), pp = pg.attributes.position, pu = pg.attributes.uv;
  for (let i = 0; i < pp.count; i++) {
    const a = pu.getX(i) * Math.PI * 2, y = pu.getY(i) * POD_H;
    pp.setXYZ(i, a, y, 0); pu.setXY(i, pu.getX(i) * 50, y / SH);
  }
  const pod = new THREE.Mesh(pg, knit(stem, { pod: true, zip, snug, win, phase, lining: new THREE.Color(lining), glow: 1 }));
  pod.frustumCulled = false; group.add(pod);
  for (const [y, r] of [[.012, .2], [POD_H - .01, .19]]) {         // gathered shut at both ends
    const cap = new THREE.Mesh(stitchUV(new THREE.CircleGeometry(r, 24), 7, 9), knit(stem, { lining: new THREE.Color(lining), glow: 1, snug, capY: y }));
    cap.rotation.x = y < 1 ? Math.PI / 2 : -Math.PI / 2;      // wrong side in, like the stem cap.position.y = y; group.add(cap);
  }

  // Zip teeth, in the same shader space as the stem so they ride the edges of the opening.
  const pitch = .0135, n = Math.floor((ZTOP - ZBOT) / pitch), tooth = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { tooth.set([ZBOT + i * pitch, 1], i * 4); tooth.set([ZBOT + (i + .5) * pitch, -1], i * 4 + 2); }
  const tg = new THREE.BoxGeometry(.013, .0075, .007);
  tg.setAttribute('aTooth', new THREE.InstancedBufferAttribute(tooth, 2));
  const brass = new THREE.MeshStandardMaterial({ color: 0xd9b25a, roughness: .35, metalness: .9 });
  const teeth = new THREE.InstancedMesh(tg, install(brass.clone(), { tooth: true, zip, snug, phase }), n * 2);
  teeth.frustumCulled = false; group.add(teeth);
  const pull = new THREE.Group();
  pull.add(new THREE.Mesh(new THREE.BoxGeometry(.034, .03, .014), brass));
  const tab = new THREE.Mesh(new THREE.BoxGeometry(.022, .062, .004), brass); tab.position.set(0, -.04, .008); tab.rotation.x = -.18; pull.add(tab);
  const bobble = new THREE.Mesh(stitchUV(new THREE.SphereGeometry(.03, 12, 8), 5, 3), knit(petalCol)); bobble.position.set(0, -.085, .016); pull.add(bobble);
  group.add(pull);

  // Neck, bending over.
  const lean = (rnd() < .5 ? -1 : 1) * (.35 + rnd() * .45), reach = .25 + rnd() * .25, tall = 2.12 + rnd() * .22;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, POD_H - .08, 0), new THREE.Vector3(lean * .04, 1.75, .01), new THREE.Vector3(lean * .3, tall - .08, reach * .3),
    new THREE.Vector3(lean * .72, tall, reach * .75), new THREE.Vector3(lean * 1.02, tall - .2, reach), new THREE.Vector3(lean * 1.1, tall - .42, reach * 1.05)
  ]);
  const neck = new THREE.Mesh(stitchUV(new THREE.TubeGeometry(curve, 40, .075, 12), Math.round(curve.getLength() / SH), 9), knit(stem));
  const nu = neck.geometry.attributes.uv; for (let i = 0; i < nu.count; i++) nu.setXY(i, nu.getY(i), nu.getX(i));   // rows run along it
  group.add(neck);
  const collar = new THREE.Mesh(stitchUV(new THREE.TorusGeometry(.16, .045, 10, 28), 20, 6), knit(stem));
  collar.rotation.x = Math.PI / 2; collar.position.y = POD_H - .01; group.add(collar);

  // Head: two rounds of petals and a bobble for a heart, hung from the end of the neck.
  const head = new THREE.Group(), end = curve.getPoint(1), dir = curve.getTangent(1);
  head.position.copy(end);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const pm = knit(petalCol), np = 7 + Math.floor(rnd() * 2);
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < np; i++) {
    const m = new THREE.Mesh(petal(ring ? .38 : .56, ring ? .25 : .33, ring ? -.45 : -.7, -.5), pm);   // hanging, like a bell
    m.rotation.order = 'YXZ'; m.rotation.y = (i + ring * .5) / np * Math.PI * 2 + rnd() * .15; m.rotation.x = ring ? -.55 : -.2 + rnd() * .2;
    m.position.y = ring ? .03 : 0; head.add(m);
  }
  const hm = new THREE.Mesh(stitchUV(new THREE.SphereGeometry(.15, 20, 14), 18, 9), knit(heart)); hm.scale.y = .75; hm.position.y = .06; head.add(hm);
  group.add(head);

  // Leaves.
  const lm = knit(stem);
  for (const s of [-1, 1]) {
    const leaf = new THREE.Mesh(petal(.7 + rnd() * .2, .3, .6, -.35), lm);
    const y = .42 + rnd() * .25; leaf.rotation.order = 'YXZ';
    leaf.rotation.y = s * (1.5 + rnd() * .6); leaf.rotation.x = -.75 - rnd() * .3;
    leaf.position.set(Math.sin(leaf.rotation.y) * podR(y) * .9, y, Math.cos(leaf.rotation.y) * podR(y) * .9); group.add(leaf);
  }

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.05, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }',
    fragmentShader: 'varying vec2 vUv; void main(){ float d = length(vUv - .5)*2.; gl_FragColor = vec4(.16, .09, .05, .5*pow(smoothstep(1., .15, d), 1.6)); }'
  }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, .006, .12); shadow.renderOrder = 1; group.add(shadow);

  const headQ = head.quaternion.clone();
  return {
    group, zip, snug, win, pull, head, perk: 0, phase,
    update(time, perkTarget, dt) {
      this.perk += (perkTarget - this.perk) * (1 - Math.exp(-dt / .35));
      const nod = Math.sin(time * .6 + phase) * .05, sway = Math.sin(time * .43 + phase * 2) * .04;
      head.quaternion.copy(headQ).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(nod - this.perk * .5 + snug.value * .35, 0, sway)));
      const y = zip.value, breathe = 1 + .012 * Math.sin(time * 1.1 + phase);
      pull.position.set(0, y, podR(y) * breathe * (1 - .07 * snug.value) + .016);
      pull.rotation.x = -Math.atan((podR(y + .01) - podR(y - .01)) / .02);
    }
  };
}
