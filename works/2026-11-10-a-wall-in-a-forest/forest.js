// Everything that is not the wall: ground, trees, their leaves, ferns, and what the leaves become.
import * as THREE from 'three';
import { rng, vnoise, lerp } from './noise.js';
import { patch, depthFor, wallX, gh, CAM_Z, WALL_Z1 } from './land.js';

const TREE_GROW = /* glsl */`
// x: girth, y: height. Trees fatten slowly and for a long time.
vec2 treeGrow(float birth){
  float g = clamp(1. - exp(-(uYears - birth)/45.), 0., 1.);
  return vec2(pow(g, .7), pow(g, .4));
}
`;

function buildGround(scene) {
  const g = new THREE.PlaneGeometry(150, 150, 230, 230);
  g.rotateX(-Math.PI / 2); g.translate(0, 0, -28);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, gh(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const mat = patch(new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 }), {
    key: 'ground',
    fHead: 'float gH;',
    fAlbedo: /* glsl */`
    {
      vec3 p = vWp;
      vec2 q = p.xz*24. + (vec2(vn(p*3.1), vn(p*3.1 + 40.)) - .5)*3.;
      vec2 ci = floor(q), cf = fract(q);
      float md = 9., md2 = 9., cr = 0.;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = vec2(h13(vec3(ci + g, 1.)), h13(vec3(ci + g, 2.)));
        float d = length(g + o - cf);
        if (d < md) { md2 = md; md = d; cr = h13(vec3(ci + g, 3.)); } else if (d < md2) md2 = d;
      }
      float edge = smoothstep(0., .12, md2 - md);         // the dark where one leaf lies over another
      float litter = smoothstep(.2, .55, fbm(p*.7 + 11.) + cr*.25);
      vec3 soil = vec3(.045, .033, .022)*(.6 + .8*vn(p*17.));
      vec3 old = mix(vec3(.085, .055, .032), vec3(.2, .14, .08), cr*cr)*(.55 + .45*edge);
      vec3 fr = mix(vec3(.62, .26, .035), vec3(.74, .52, .08), fract(cr*7.3));
      fr = mix(fr, vec3(.4, .09, .03), step(.82, fract(cr*3.1)))*(.6 + .4*edge);
      float isFresh = step(fract(cr*5.7), uFresh*.9);
      vec3 col = mix(soil, mix(old, mix(fr, old*1.25, uRot), isFresh), max(litter, isFresh));
      float e = mix(1.0, .5, uGrowth);
      float gm = smoothstep(e - .08, e + .08, fbm(p*.8 + 5.) + vn(p*6.)*.2);
      vec3 mossc = mix(vec3(.045, .10, .022), vec3(.14, .23, .04), vn(p*31.));
      col = mix(col, mossc, gm*(1. - isFresh*.8));
      col *= mix(1., .7, uWet);
      float sn = smoothstep(0., .3, uSnow*1.3 - fbm(p*1.3)*.32);
      col = mix(col, vec3(.80, .85, .93), sn);
      diffuseColor.rgb = col;
      gH = (edge*.35 + cr*.5 + vn(p*40.)*.3 + gm*vn(p*90.)*.5)*(1. - sn) + sn*fbm(p*3.)*.6;
    }`,
    fNormal: 'normal = bumpN(-vViewPosition, normal, gH, .02);'
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function buildTrees(scene, r) {
  const pos = [], base = [], tree = [], idx = [];
  const clumps = { center: [], scale: [], base: [], info: [] };
  const trees = [];

  function tube(path, radius, NR, b, info) {
    const start = pos.length / 3, n = path.length;
    const up = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3();
    for (let j = 0; j < n; j++) {
      t.subVectors(path[Math.min(n - 1, j + 1)], path[Math.max(0, j - 1)]).normalize();
      u.crossVectors(t, Math.abs(t.y) > .95 ? new THREE.Vector3(1, 0, 0) : up).normalize();
      v.crossVectors(u, t);
      for (let k = 0; k < NR; k++) {
        const a = k / NR * Math.PI * 2, rr = radius(j / (n - 1), a);
        pos.push(path[j].x + (Math.cos(a) * v.x + Math.sin(a) * u.x) * rr,
          path[j].y + (Math.cos(a) * v.y + Math.sin(a) * u.y) * rr,
          path[j].z + (Math.cos(a) * v.z + Math.sin(a) * u.z) * rr);
        base.push(b[0], b[1], b[2]); tree.push(info[0], info[1]);
      }
    }
    for (let j = 0; j < n - 1; j++) for (let k = 0; k < NR; k++) {
      const a = start + j * NR + k, c = start + j * NR + (k + 1) % NR;
      idx.push(a, c, a + NR, c, c + NR, a + NR);
    }
  }

  function addTree(x, z, R, H, birth, shrub) {
    const y = gh(x, z) - .15, b = [x, y, z], tint = r(), info = [birth, tint];
    const lean = [(r() - .5) * .09, (r() - .5) * .09], wob = r() * 10, lobes = 3 + Math.floor(r() * 3), lph = r() * 6;
    const centre = h => new THREE.Vector3(
      x + lean[0] * h + Math.sin(h * .35 + wob) * R * .9, y + h, z + lean[1] * h + Math.cos(h * .31 + wob) * R * .9);
    const path = [];
    for (let j = 0; j <= 13; j++) path.push(centre(H * Math.pow(j / 13, 1.7)));
    tube(path, (t, a) => {
      const h = H * Math.pow(t, 1.7);
      return R * (1 - .78 * t) * (1 + .9 * Math.exp(-h / (R * 2.4)) * (1 + .3 * Math.sin(a * lobes + lph)));
    }, 10, b, info);
    const nb = shrub ? 2 : 4 + Math.floor(r() * 4);
    const tips = [], low = [];
    for (let k = 0; k < nb; k++) {
      const h0 = H * lerp(.38, .9, r()), a = r() * Math.PI * 2, len = (shrub ? .6 : lerp(2, 5.5, r())) * (1.2 - h0 / H * .5);
      const p0 = centre(h0), bp = [];
      for (let j = 0; j <= 4; j++) {
        const t = j / 4;
        bp.push(new THREE.Vector3(p0.x + Math.cos(a) * len * t, p0.y + len * (.35 * t + .35 * t * t), p0.z + Math.sin(a) * len * t));
      }
      const rb = R * (1 - .78 * h0 / H) * .45;
      tube(bp, t => rb * (1 - .8 * t) + .008, 5, b, info);
      tips.push(bp[4]);
    }
    tips.push(centre(H));
    // Trees close to the wall keep a low bough or two, so there are leaves at eye height.
    if (!shrub && Math.hypot(x, z + 5) < 15) for (let k = 0; k < 2; k++) {
      const h0 = lerp(2.6, 5.2, r()), a = Math.atan2(-5 - z, .2 - x) + (r() - .5) * 1.6, len = lerp(1.6, 3, r());
      const p0 = centre(h0), bp = [];
      for (let j = 0; j <= 4; j++) { const t = j / 4; bp.push(new THREE.Vector3(p0.x + Math.cos(a) * len * t, p0.y + len * (.25 * t - .2 * t * t), p0.z + Math.sin(a) * len * t)); }
      tube(bp, t => R * .16 * (1 - .8 * t) + .008, 5, b, info);
      low.push(bp[4], bp[3]);
    }
    // Leaves gather where the branches end.
    const near = Math.hypot(x, z + 6) < 26;
    for (const tip of tips) for (let c = 0, n = shrub || !near ? 1 : 2; c < n; c++) {
      const s = shrub ? lerp(.5, 1., r()) : lerp(1.7, 3.3, r()) * (near ? 1 : 1.25), spread = shrub ? .3 : 1.6;
      clumps.center.push(tip.x + (r() - .5) * spread, tip.y + (r() - .3) * spread * .8, tip.z + (r() - .5) * spread);
      clumps.scale.push(s, s * lerp(.45, .7, r()), s * lerp(.8, 1.2, r()));
      clumps.base.push(...b); clumps.info.push(birth, r());
    }
    for (const tip of low) {
      const s = lerp(.8, 1.3, r());
      clumps.center.push(tip.x, tip.y + .1, tip.z); clumps.scale.push(s, s * .5, s);
      clumps.base.push(...b); clumps.info.push(birth, r());
    }
    trees.push([x, z, R]);
  }

  const camX = wallX(CAM_Z) + .4;
  const ok = (x, z, gap) => {
    if (z > WALL_Z1 && Math.abs(x - wallX(z)) < 1.25) return false;
    if (z > -9 && Math.abs(x - camX) < 1.9 + (CAM_Z - z) * .12 && z < CAM_Z + 3) return false;
    for (const [tx, tz, tr] of trees) if (Math.hypot(tx - x, tz - z) < gap + tr) return false;
    return true;
  };
  // A few old ones that were here before, placed by hand so they frame the wall.
  addTree(4.3, -5.2, .5, 24, -170); addTree(-3.3, -7.4, .52, 25, -190); addTree(wallX(-16) + 1.15, -16, .42, 23, -130);
  addTree(-5.6, -1.2, .38, 22, -110); addTree(7.2, -12.5, .5, 24, -170); addTree(wallX(-23) - 1.5, -23, .46, 24, -150);
  addTree(2.6, -11.4, .3, 21, -60); addTree(-1.9, -13.5, .34, 22, -80);
  for (let i = 0, made = 0; i < 6000 && made < 190; i++) {
    const x = (r() - .5) * 70, z = lerp(-66, 9, r());
    if (!ok(x, z, 2.1)) continue;
    addTree(x, z, lerp(.15, .44, r() * r()) + .06, lerp(15, 24, r()), made < 125 ? lerp(-75, -5, r()) : lerp(1, 70, r()));
    made++;
  }
  for (let i = 0, made = 0; i < 2000 && made < 60; i++) {
    const x = (r() - .5) * 40, z = lerp(-40, 4, r());
    if (!ok(x, z, .9)) continue;
    addTree(x, z, lerp(.035, .06, r()), lerp(2.2, 5, r()), lerp(-25, 45, r()), true);
    made++;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aBase', new THREE.Float32BufferAttribute(base, 3));
  g.setAttribute('aTree', new THREE.Float32BufferAttribute(tree, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const vHead = 'attribute vec3 aBase; attribute vec2 aTree; varying float vTint; varying float vUp;' + TREE_GROW;
  const vBody = /* glsl */`
    vec2 tg = treeGrow(aTree.x);
    vec3 rel = transformed - aBase; rel.xz *= tg.x; rel.y *= tg.y;
    transformed = aBase + rel; vTint = aTree.y; vUp = position.y - aBase.y;
  `;
  const bark = patch(new THREE.MeshStandardMaterial({ roughness: .95, metalness: 0 }), {
    key: 'bark', vHead, vBody,
    fHead: 'varying float vTint; varying float vUp; float bH;',
    fAlbedo: /* glsl */`
    {
      vec3 p = vRest;
      float ridges = fbm(vec3(p.x*16., p.y*1.6, p.z*16.));
      float fine = vn(vec3(p.x*60., p.y*9., p.z*60.));
      vec3 a = mix(vec3(.105, .085, .065), vec3(.20, .19, .17), vTint);
      vec3 col = a*(.45 + 1.0*ridges)*(.8 + .4*fine);
      float north = vWn.x*.5 + .5;
      float m = smoothstep(.75, 1.2, fbm(p*1.3) + north*.5 + exp(-vUp*.9)*.75 + uGrowth*.3 - .25);
      col = mix(col, mix(vec3(.045, .10, .02), vec3(.15, .24, .04), fine), m*.9);
      float li = smoothstep(.5, .75, fbm(p*2. + vTint*9.))*smoothstep(.5, .6, vn(vec3(p.x*40., p.y*14., p.z*40.)))*(1. - m)*.55;
      col = mix(col, vec3(.36, .40, .32), li);
      col *= mix(1., .7, uWet);
      col = mix(col, vec3(.80, .85, .93), uSnow*smoothstep(.5, .9, -vWn.z*.6 + vWn.y + fine*.4)*.8);
      diffuseColor.rgb = col;
      bH = ridges + fine*.25;
    }`,
    fNormal: 'normal = bumpN(-vViewPosition, normal, bH, .05);'
  });
  const mesh = new THREE.Mesh(g, bark);
  mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.customDepthMaterial = depthFor({ key: 'bark', vHead: 'attribute vec3 aBase; attribute vec2 aTree;' + TREE_GROW, vBody: 'vec2 tg = treeGrow(aTree.x); vec3 rel = transformed - aBase; rel.xz *= tg.x; rel.y *= tg.y; transformed = aBase + rel;' });
  scene.add(mesh);

  // Leaves: every bough is the same spray of a hundred-odd leaves, scaled and turned.
  // The gaps between them are what make the light on the wall move.
  const lp = [], lc = [], ln = [], lr = [];
  for (let i = 0; i < 96; i++) {
    const d = new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize(), rad = Math.pow(r(), .45);
    const c = d.clone().multiplyScalar(rad), sz = lerp(.1, .17, r()), rnd = r();
    const a = new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize();
    const b = new THREE.Vector3().crossVectors(a, d).normalize().multiplyScalar(sz * .62); a.multiplyScalar(sz);
    const nn = d.clone().multiplyScalar(.75).addScaledVector(new THREE.Vector3().crossVectors(a, b).normalize(), .25).normalize();
    const P = [c.clone().add(a), c.clone().add(b), c.clone().sub(a), c.clone().sub(b)];
    for (const k of [0, 1, 2, 0, 2, 3]) { lp.push(P[k].x, P[k].y, P[k].z); lc.push(c.x, c.y, c.z); ln.push(nn.x, nn.y, nn.z); lr.push(rnd); }
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  cg.setAttribute('normal', new THREE.Float32BufferAttribute(ln, 3));
  cg.setAttribute('aLC', new THREE.Float32BufferAttribute(lc, 3));
  cg.setAttribute('aLR', new THREE.Float32BufferAttribute(lr, 1));
  const n = clumps.info.length / 2;
  cg.setAttribute('aCenter', new THREE.InstancedBufferAttribute(new Float32Array(clumps.center), 3));
  cg.setAttribute('aScale', new THREE.InstancedBufferAttribute(new Float32Array(clumps.scale), 3));
  cg.setAttribute('aBase', new THREE.InstancedBufferAttribute(new Float32Array(clumps.base), 3));
  cg.setAttribute('aClump', new THREE.InstancedBufferAttribute(new Float32Array(clumps.info), 2));
  const lvHead = 'attribute vec3 aCenter, aScale, aBase, aLC; attribute vec2 aClump; attribute float aLR; varying float vSeed;' + TREE_GROW;
  const lvBody = /* glsl */`
    vec2 tg = treeGrow(aClump.x);
    float lseed = fract(aLR + aClump.y*7.31);
    // each leaf has its own day to open and its own day to let go
    float keep = step(lseed, uLeaf*1.02 - .01);
    vec3 local = (aLC + (position - aLC)*keep*mix(.55, 1., smoothstep(lseed, lseed + .3, uLeaf)))*aScale;
    float sw = sin(uTime*.7 + aClump.y*40.)*.5 + sin(uTime*1.9 + aClump.y*91. + aLC.x*5.)*.3;
    transformed = aBase + (aCenter - aBase)*tg.y + local*tg.y + vec3(sw, sw*.3, sw*.6)*.13*uWind;
    vRest = aCenter + local; vSeed = lseed;
  `;
  const leaves = patch(new THREE.MeshStandardMaterial({ roughness: .75, metalness: 0, side: THREE.DoubleSide }), {
    key: 'leaves', vHead: lvHead, vBody: lvBody, fHead: 'varying float vSeed;',
    fAlbedo: /* glsl */`
    {
      float s = vSeed, tone = vn(vRest*1.3)*.6 + s*.4;
      vec3 green = mix(vec3(.03, .10, .02), vec3(.10, .21, .035), tone);
      green = mix(green, vec3(.24, .36, .06), uSpring);
      float au = smoothstep(s*.6, s*.6 + .4, uAutumn);
      vec3 aut = mix(vec3(.60, .32, .04), vec3(.50, .12, .03), fract(s*7.));
      aut = mix(aut, vec3(.72, .52, .07), step(.5, fract(s*13.)));
      diffuseColor.rgb = mix(green, aut*(.6 + .7*tone), au);
    }`,
    fEmissive: 'totalEmissiveRadiance += diffuseColor.rgb*uSunCol*uGlow*.5;'
  });
  const canopy = new THREE.InstancedMesh(cg, leaves, n);
  canopy.castShadow = true; canopy.frustumCulled = false;
  canopy.customDepthMaterial = depthFor({ key: 'leaves', vHead: lvHead, vBody: lvBody, fHead: 'varying float vSeed;' });
  canopy.customDepthMaterial.side = THREE.DoubleSide;
  scene.add(canopy);
  return trees;
}

function fernGeometry(r) {
  const pos = [];
  for (let k = 0; k < 9; k++) {
    const yaw = k * 2.4 + r() * .5, L = lerp(.5, .8, r()), a = lerp(.85, 1.2, r()), b = lerp(.85, 1.15, r());
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const rach = t => [0, L * (a * t - b * t * t), L * t * .85];
    const put = (x, y, z) => pos.push(x * cy + z * sy, y, -x * sy + z * cy);
    for (let j = 0; j < 17; j++) {
      const t = .1 + .9 * j / 17, d = .022;
      const w = L * .3 * Math.pow(Math.sin(Math.PI * Math.pow(t, .62)), .9) + .01;
      const p0 = rach(t - d), p1 = rach(t + d), pm = rach(t);
      for (const s of [-1, 1]) {
        put(...p0); put(...p1); put(pm[0] + s * w, pm[1] - w * .28, pm[2] + w * .35);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function buildFerns(scene, r, trees) {
  const N = 150, g = fernGeometry(r), info = new Float32Array(N * 2);
  const mat = patch(new THREE.MeshStandardMaterial({ roughness: .7, metalness: 0, side: THREE.DoubleSide }), {
    key: 'fern',
    vHead: 'attribute vec2 aFern; varying float vH; varying float vS;',
    vBody: /* glsl */`
      float life = smoothstep(0., 5., uYears - aFern.x);
      transformed.y *= mix(.16, 1., uFern);
      transformed *= life*mix(.6, 1., uFern);
      transformed.x += sin(uTime*1.4 + aFern.y*30. + position.z*4.)*.12*position.y*uWind;
      vH = position.y; vS = aFern.y;
    `,
    fHead: 'varying float vH; varying float vS;',
    fAlbedo: /* glsl */`
    {
      vec3 g = mix(vec3(.04, .12, .02), vec3(.15, .29, .05), clamp(vH*3.5, 0., 1.))*mix(.8, 1.2, vS);
      g = mix(g, vec3(.28, .42, .07), uSpring*.7);
      vec3 br = mix(vec3(.28, .15, .045), vec3(.42, .27, .08), vS);
      vec3 col = mix(g, br, clamp(uFernBrown*1.25 - vS*.25, 0., 1.));
      diffuseColor.rgb = mix(col, vec3(.80, .85, .93), uSnow*.75);
    }`,
    fEmissive: 'totalEmissiveRadiance += diffuseColor.rgb*uSunCol*uGlow*.3;'
  });
  const mesh = new THREE.InstancedMesh(g, mat, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    let x, z;
    if (i < 70) {            // ferns like the foot of a wall
      z = lerp(2, -22, r()); x = wallX(z) + (r() < .5 ? -1 : 1) * lerp(.42, 1.1, r());
    } else if (i < 100) {    // and the foot of a tree
      const t = trees[Math.floor(r() * Math.min(trees.length, 60))], a = r() * 6.3;
      x = t[0] + Math.cos(a) * (t[2] + .35); z = t[1] + Math.sin(a) * (t[2] + .35);
    } else { x = (r() - .3) * 16; z = lerp(1, -20, r()); if (Math.abs(x - wallX(z)) < .45) x += 1; }
    const sc = lerp(.6, 1.35, r());
    e.set((r() - .5) * .2, r() * 6.3, (r() - .5) * .2); q.setFromEuler(e);
    m.compose(p.set(x, gh(x, z) - .02, z), q, s.set(sc, sc, sc)); mesh.setMatrixAt(i, m);
    info[i * 2] = i < 12 ? -10 : lerp(-6, 38, r()); info[i * 2 + 1] = r();
  }
  g.setAttribute('aFern', new THREE.InstancedBufferAttribute(info, 2));
  mesh.receiveShadow = true; mesh.frustumCulled = false;
  scene.add(mesh);
}

function buildLitter(scene, r, capTops) {
  const g = new THREE.BufferGeometry();
  const T = [0, 0, .5], B = [0, 0, -.5], L = [-.3, .03, 0], R = [.3, .03, 0], M = [0, -.05, 0];
  g.setAttribute('position', new THREE.Float32BufferAttribute([...B, ...M, ...L, ...L, ...M, ...T, ...T, ...M, ...R, ...R, ...M, ...B], 3));
  g.computeVertexNormals();
  const N = 7000, info = new Float32Array(N * 2);
  const mat = patch(new THREE.MeshStandardMaterial({ roughness: .85, metalness: 0, side: THREE.DoubleSide }), {
    key: 'litter',
    vHead: 'attribute vec2 aLeaf; varying vec2 vLeaf;',
    vBody: 'transformed *= step(aLeaf.y, uFresh + .001); transformed.y -= uSnow*.7; vLeaf = aLeaf;',
    fHead: 'varying vec2 vLeaf;',
    fAlbedo: /* glsl */`
    {
      float s = vLeaf.x;
      vec3 old = mix(vec3(.12, .08, .045), vec3(.25, .18, .10), s);
      vec3 fr = mix(vec3(.72, .30, .04), vec3(.82, .60, .09), fract(s*7.3));
      fr = mix(fr, vec3(.46, .10, .03), step(.82, fract(s*3.1)));
      vec3 col = mix(old, mix(fr, old*1.25, uRot), step(.001, vLeaf.y)*smoothstep(0., .5, uFresh));
      diffuseColor.rgb = col*mix(1., .7, uWet);
    }`
  });
  const mesh = new THREE.InstancedMesh(g, mat, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    let x, y, z, show = r() < .45 ? 0 : lerp(.08, .95, r());
    if (i < 150) {          // some come to rest on the wall, for a season
      const c = capTops[Math.floor(r() * Math.min(capTops.length, 40))];
      x = c[0] + (r() - .5) * .4; z = c[2] + (r() - .5) * .4; y = c[1] + .012; show = lerp(.2, .9, r());
    } else {
      const d = Math.pow(r(), 1.6) * 16; z = CAM_Z + 1 - d; x = wallX(z) + (r() - .5) * (4 + d * 1.1);
      if (Math.abs(x - wallX(z)) < .36) x += .8;
      y = gh(x, z) + .012;
    }
    const sc = lerp(.05, .1, r());
    e.set((r() - .5) * .7, r() * 6.3, (r() - .5) * .7); q.setFromEuler(e);
    m.compose(p.set(x, y, z), q, s.set(sc, sc, sc)); mesh.setMatrixAt(i, m);
    info[i * 2] = r(); info[i * 2 + 1] = show;
  }
  g.setAttribute('aLeaf', new THREE.InstancedBufferAttribute(info, 2));
  mesh.receiveShadow = true; mesh.frustumCulled = false;
  scene.add(mesh);
}

export function buildForest(scene, wall) {
  const r = rng(424242);
  buildGround(scene);
  const trees = buildTrees(scene, r);
  buildFerns(scene, r, trees);
  buildLitter(scene, r, wall.capTops);
}
