// The wall: a few hundred stones laid dry in courses, each one shaped on its own,
// and the moss that takes them over.
import * as THREE from 'three';
import { rng, fbm, vnoise, smoothstep, lerp } from './noise.js';
import { U, patch, GLSL_MOSS, wallX, gh, wallKeep, CAM_Z, WALL_Z0, WALL_Z1 } from './land.js';

function template(detail) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position, map = new Map(), dirs = [], index = [];
  for (let i = 0; i < p.count; i++) {
    const k = `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
    let j = map.get(k);
    if (j === undefined) { j = dirs.length / 3; map.set(k, j); dirs.push(p.getX(i), p.getY(i), p.getZ(i)); }
    index.push(j);
  }
  g.dispose();
  return { dirs, index, count: dirs.length / 3 };
}

class Batch {
  constructor(detail) { this.t = template(detail); this.pos = []; this.nor = []; this.info = []; this.idx = []; }
  // One stone: a rounded box, lumped by noise, with a few corners knocked off.
  add(r, c, s, rot, groundY, fade) {
    const { dirs, index, count } = this.t, base = this.pos.length / 3;
    const seed = r() * 100, box = .74 + r() * .16, rnd = r();
    const minDim = Math.min(s[0], s[1], s[2]);
    const chips = [];
    for (let k = 0, n = 2 + Math.floor(r() * 3); k < n; k++) {
      const v = new THREE.Vector3(r() - .5, (r() - .5) * .9, r() - .5).normalize();
      const support = (Math.abs(v.x) * s[0] + Math.abs(v.y) * s[1] + Math.abs(v.z) * s[2]) / 2;
      chips.push([v, support * (.66 + r() * .2)]);
    }
    const e = new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ'), m = new THREE.Matrix4().makeRotationFromEuler(e);
    const v = new THREE.Vector3(), P = new Float32Array(count * 3), N = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const dx = dirs[i * 3], dy = dirs[i * 3 + 1], dz = dirs[i * 3 + 2];
      const mx = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
      v.set(lerp(dx, dx / mx, box) * s[0] / 2, lerp(dy, dy / mx, box) * s[1] / 2, lerp(dz, dz / mx, box) * s[2] / 2);
      const d = (fbm(v.x * 5 + seed, v.y * 5, v.z * 5, 3) - .47) * minDim * .34
        + (vnoise(v.x * 24 + seed, v.y * 24, v.z * 24) - .5) * .012;
      v.x += dx * d; v.y += dy * d; v.z += dz * d;
      for (const [n, o] of chips) { const dd = v.dot(n) - o; if (dd > 0) v.addScaledVector(n, -dd * .88); }
      v.applyMatrix4(m);
      P[i * 3] = v.x + c[0]; P[i * 3 + 1] = v.y + c[1]; P[i * 3 + 2] = v.z + c[2];
    }
    const a = new THREE.Vector3(), b = new THREE.Vector3(), cc = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < index.length; i += 3) {
      const i0 = index[i], i1 = index[i + 1], i2 = index[i + 2];
      a.fromArray(P, i0 * 3); b.fromArray(P, i1 * 3); cc.fromArray(P, i2 * 3);
      n.crossVectors(b.sub(a), cc.sub(a));
      for (const j of [i0, i1, i2]) { N[j * 3] += n.x; N[j * 3 + 1] += n.y; N[j * 3 + 2] += n.z; }
      this.idx.push(base + i0, base + i1, base + i2);
    }
    for (let i = 0; i < count; i++) {
      n.fromArray(N, i * 3).normalize();
      this.pos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); this.nor.push(n.x, n.y, n.z);
      this.info.push(rnd, P[i * 3 + 1] - groundY, fade);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('aInfo', new THREE.Float32BufferAttribute(this.info, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

const STONE_ALBEDO = /* glsl */`
{
  vec3 p = vWp; float rnd = vInfo.x;
  float g1 = fbm(p*9. + rnd*20.), g2 = vn(p*70.), g3 = vn(p*260.);
  vec3 base = mix(vec3(.27, .26, .245), vec3(.15, .145, .14), rnd);
  base = mix(base, vec3(.30, .235, .17), smoothstep(.5, .8, vn(p*1.3 + rnd*5.))*.5);
  float band = sin(dot(p, normalize(vec3(.2, 1., .15 + rnd)))*90. + g1*9.)*.5 + .5;   // bedding
  vec3 col = base*(.55 + .7*g1)*(.8 + .4*g2)*(.85 + .3*g3)*(.9 + .2*band);
  // crustose lichen: tight pale specks gathered into colonies
  float colony = smoothstep(.45, .7, fbm(p*4. + rnd*9.));
  float speck = smoothstep(.5, .58, vn(p*120.)*.55 + vn(p*45.)*.45);
  col = mix(col, vec3(.44, .48, .40), colony*speck*uLichen*.85);
  float gold = smoothstep(.62, .72, fbm(p*6. + 50.))*smoothstep(.45, .55, vn(p*150.))*uLichen*step(.5, rnd);
  col = mix(col, vec3(.5, .38, .07), gold*.8);
  col *= mix(.5, 1., smoothstep(0., .45, vInfo.y));
  float mask = mossMask(p, vWn, rnd, vInfo.y);
  vec3 far = mix(vec3(.022, .055, .012), vec3(.095, .15, .025), vn(p*38.))*mix(.7, 1.2, fbm(p*1.9 + 3.));
  col = mix(col, mix(vec3(.014, .026, .01), far, vInfo.z), mask);
  col *= mix(1., .68, uWet);
  col = mix(col, vec3(.80, .85, .93), snowOn(p, vWn));
  diffuseColor.rgb = col;
  vHgt = g1*.6 + g2*.3 + g3*.2 + band*.08 + colony*speck*.15 - mask*.3;
}
`;

export function buildWall(scene) {
  const r = rng(1107);
  const tiers = [new Batch(5), new Batch(3), new Batch(1)];   // near (furred), middle (furred), far
  const tierOf = z => { const d = CAM_Z - z; return d < 3.4 ? 0 : d < 9.5 ? 1 : 2; };
  const fadeOf = z => smoothstep(6.5, 9.5, CAM_Z - z);
  const gy = z => gh(wallX(z), z);
  const yaw = z => Math.atan2(wallX(z - .2) - wallX(z + .2), -.4);   // heading of the wall at z
  const courses = [.2, .18, .17, .16, .15];
  const full = courses.reduce((a, b) => a + b, 0);
  const capTops = [];

  let y0 = 0;
  courses.forEach((hc, c) => {
    const hw = lerp(.34, .24, c / courses.length);
    for (const side of [-1, 1]) {
      let z = WALL_Z0 + r() * .3;
      while (z > WALL_Z1) {
        const len = lerp(.24, .58, r()) * (1.15 - c * .06), dep = lerp(.18, .3, r());
        const zc = z - len / 2; z -= len;
        if (y0 + hc > full * wallKeep(zc) + .03) continue;
        const x = wallX(zc) + side * (hw - dep / 2 + (r() - .5) * .03);
        tiers[tierOf(zc)].add(r, [x, gy(zc) + y0 + hc / 2, zc],
          [dep, hc * lerp(.9, 1.06, r()), len * .985],
          [(r() - .5) * .07, yaw(zc) + (r() - .5) * .1, (r() - .5) * .07], gy(zc), fadeOf(zc));
      }
    }
    y0 += hc;
  });
  // Cap stones span the wall and are where most of the moss will live.
  for (let z = WALL_Z0 + .1; z > WALL_Z1;) {
    const len = lerp(.24, .5, r()), zc = z - len / 2; z -= len;
    if (wallKeep(zc) < .93) continue;
    const h = lerp(.11, .21, r()), top = gy(zc) + full * Math.min(1, wallKeep(zc)) + h - .02;
    tiers[tierOf(zc)].add(r, [wallX(zc) + (r() - .5) * .05, top - h / 2, zc], [.5 + r() * .09, h, len * .97],
      [(r() - .5) * .16, yaw(zc) + (r() - .5) * .22, (r() - .5) * .16], gy(zc), fadeOf(zc));
    capTops.push([wallX(zc), top, zc]);
  }
  // What has already fallen out of the gap, and a few field stones that were never picked up.
  for (let i = 0; i < 26; i++) {
    const zc = -10.6 + (r() - .5) * 3.4, side = r() < .5 ? -1 : 1, x = wallX(zc) + side * (.35 + r() * r() * 1.5);
    const s = [lerp(.16, .34, r()), lerp(.1, .2, r()), lerp(.2, .5, r())];
    tiers[tierOf(zc)].add(r, [x, gh(x, zc) + s[1] * .3, zc], s, [r() * .8 - .4, r() * 6.3, r() * .8 - .4], gh(x, zc), fadeOf(zc));
  }
  for (const [x, z, sz] of [[1.75, -.55, .5], [2.5, -2.6, .85], [1.15, -4.4, .42], [-1.7, -3.4, .7], [3.5, -6.8, 1.15], [-2.4, -8.2, .9], [.95, -1.7, .26], [2.05, -5.2, .3]]) {
    tiers[tierOf(z)].add(r, [x, gh(x, z) + sz * .16, z], [sz * lerp(.9, 1.3, r()), sz * .62, sz], [r() * .3 - .15, r() * 6.3, r() * .3 - .15], gh(x, z), fadeOf(z));
  }

  const stoneMat = patch(new THREE.MeshStandardMaterial({ roughness: .92, metalness: 0 }), {
    key: 'stone',
    vHead: 'attribute vec3 aInfo; varying vec3 vInfo;', vBody: 'vInfo = aInfo;',
    fHead: 'varying vec3 vInfo; float vHgt;' + GLSL_MOSS,
    fAlbedo: STONE_ALBEDO,
    fRough: 'roughnessFactor = mix(.95, .72, uWet);',
    fNormal: 'normal = bumpN(-vViewPosition, normal, vHgt, .018);'
  });

  // Moss as shells: the same stones drawn again and again, each a little further out,
  // keeping only the pixels that land inside a strand.
  const mossMat = n => patch(new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 }), {
    key: 'moss', uniforms: { uShells: n },
    vHead: 'attribute vec3 aInfo; varying vec3 vInfo; varying vec3 vN0; varying float vSh; varying float vCush;' + GLSL_MOSS,
    vBody: /* glsl */`
      vInfo = aInfo; vN0 = normal;
      vSh = 1. - float(gl_InstanceID)/uShells;
      float cu = fbm(position*6.1);
      vCush = smoothstep(.25, .7, cu);
      // thin at the edge of a patch, deep in the middle where it is oldest
      float age = smoothstep(-.06, .5, mossField(position, normal, aInfo.x, aInfo.y));
      float thick = uMossH*(.1 + 1.7*vCush)*(.25 + .75*age)*(1. - aInfo.z);
      transformed += normal*vSh*max(thick, uMossH*.9*snowOn(position, normal));
    `,
    fHead: 'varying vec3 vInfo; varying vec3 vN0; varying float vSh; varying float vCush; vec3 vJit; float vLod; float vTuft;' + GLSL_MOSS,
    fAlbedo: /* glsl */`
    {
      vec3 p = vRest, n0 = normalize(vN0);
      float mask = mossMask(p, n0, vInfo.x, vInfo.y);
      float snow = snowOn(p, n0);
      bool snowHere = vSh < snow*.8;
      vec3 q = p*300.;
      float lod = smoothstep(.4, 1.3, length(fwidth(q)));
      vec3 c = floor(q), f = fract(q) - .5;
      float rr = h13(c);
      vJit = vec3(h13(c + 7.1), h13(c + 13.7), h13(c + 29.3)) - .5; vLod = lod;
      float d = length(f + vJit*.45);
      float tuft = vn(p*46.)*.6 + vn(p*105.)*.4; vTuft = tuft;      // little heads, a centimetre or two across
      float len = mask*mix(mix(.38, 1., rr), .7, lod)*mix(.45, 1., tuft);
      float rel = vSh/max(len, 1e-3);
      float rad = mix(mix(.66, .15, rel), .95, lod);
      if (!snowHere && (rel >= 1. || d > rad)) discard;
      float pv = fbm(p*1.9 + 3.);
      vec3 tip = mix(vec3(.05, .125, .02), vec3(.15, .2, .03), smoothstep(.32, .66, pv));
      tip = mix(tip, vec3(.028, .095, .035), smoothstep(.5, .78, vn(p*1.1 + 9.)));
      tip = mix(tip, vec3(.22, .21, .05), smoothstep(.72, .9, vn(p*3.3 + 21.))*.7);
      tip = mix(tip, tip*vec3(1.3, .95, .5), uAutumn*.25);
      tip = mix(tip, vec3(dot(tip, vec3(.33)))*vec3(.9, 1., .8), uSnow*.35);
      vec3 col = mix(vec3(.012, .022, .008), tip, pow(clamp(rel, 0., 1.), 1.7))*mix(.6, 1.3, rr);
      col *= mix(.5, 1.12, vCush);          // the hollows between cushions stay dark
      col *= mix(.5, 1.15, smoothstep(.25, .75, tuft));
      col *= mix(1., .8, uWet);
      if (snowHere) col = mix(vec3(.72, .78, .88), vec3(.86, .89, .94), vSh/max(snow*.8, 1e-3));
      diffuseColor.rgb = col;
    }`,
    fNormal: 'normal = bumpN(-vViewPosition, normal, vTuft, .01); normal = normalize(normal + vJit*.8*(1. - vLod));'
  });

  const group = new THREE.Group();
  const shellCounts = [16, 8];
  const shells = [];
  tiers.forEach((t, i) => {
    const g = t.geometry();
    const mesh = new THREE.Mesh(g, stoneMat);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    if (i < 2) {
      // Each tier carries its own shell count, so its outermost shell is always the tips.
      const n = { value: shellCounts[i] };
      const fur = new THREE.InstancedMesh(g, mossMat(n), shellCounts[i]);
      fur.receiveShadow = true; fur.frustumCulled = false;
      fur.userData.setShells = k => { n.value = k; fur.count = k; };
      group.add(fur); shells.push(fur);
    }
  });
  scene.add(group);

  // Three cap stones that are still up, for now.
  const fallers = [];
  [[-12.55, 5, 1], [-8.75, 17, -1], [-13.3, 41, -1]].forEach(([z, year, side]) => {
    const b = new Batch(3), h = .13, top = gy(z) + full * wallKeep(z) + h;
    b.add(r, [0, 0, 0], [.58, h, .46], [0, 0, 0], -1, 1);
    const m = new THREE.Mesh(b.geometry(), stoneMat); m.castShadow = m.receiveShadow = true;
    const from = new THREE.Vector3(wallX(z), top - h / 2, z);
    const x1 = wallX(z) + side * (.75 + r() * .4), z1 = z + (r() - .5) * .5;
    fallers.push({
      mesh: m, year, t: -1, from, yaw: yaw(z),
      to: new THREE.Vector3(x1, gh(x1, z1) + .07, z1), side, roll: 2.4 + r() * 2
    });
    m.position.copy(from); m.rotation.y = yaw(z);
    group.add(m);
  });

  return { group, shells, shellCounts, fallers, capTops, top: z => gy(z) + full * Math.min(1, wallKeep(z)) + .12 };
}

// Stones come off a wall one at a time, decades apart, and each takes about a second.
export function updateFallers(wall, years, dt, onFall) {
  for (const f of wall.fallers) {
    if (f.t < 0) {
      if (years < f.year) { f.mesh.position.copy(f.from); f.mesh.rotation.set(0, f.yaw, 0); continue; }
      f.t = 0; if (onFall) onFall(f);
    }
    if (years < f.year - .01) { f.t = -1; continue; }   // time was wound back by hand
    if (f.t >= 1) continue;
    f.t = Math.min(1, f.t + dt / .95);
    const t = f.t, e = t * t;
    f.mesh.position.lerpVectors(f.from, f.to, smoothstep(0, 1, t) * .35 + e * .65);
    f.mesh.position.y = lerp(f.from.y, f.to.y, e) + Math.sin(Math.min(1, t * 1.6) * Math.PI) * .05
      + (t > .82 ? Math.sin((t - .82) / .18 * Math.PI) * .03 : 0);
    f.mesh.rotation.set(0, f.yaw + t * .6, -f.side * f.roll * smoothstep(0, 1, t));
  }
}
