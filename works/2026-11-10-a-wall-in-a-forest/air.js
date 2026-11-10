// What is in the air: sky, shafts of light, dust, falling leaves, snow, fireflies.
import * as THREE from 'three';
import { rng, lerp } from './noise.js';
import { wallX, gh } from './land.js';

const FOGGED = /* glsl */`
uniform float uFogDensity; uniform vec3 uFogCol;
vec3 fogged(vec3 c, float dist){ float f = 1. - exp(-uFogDensity*uFogDensity*dist*dist); return mix(c, uFogCol, f); }
`;

export function buildAir(scene) {
  const r = rng(77);
  const A = {
    time: { value: 0 }, px: { value: 800 }, fogDensity: { value: .04 }, fogCol: { value: new THREE.Color() },
    sky: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() },
    glow: { value: 0 }, motes: { value: 0 }, snowfall: { value: 0 }, leafFall: { value: 0 }, firefly: { value: 0 }, shafts: { value: 0 }
  };
  const u = extra => ({
    uTime: A.time, uPx: A.px, uFogDensity: A.fogDensity, uFogCol: A.fogCol, ...extra
  });

  // Sky: mostly hidden by trees, but it is where the fog gets its colour.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uFogCol: A.fogCol, uSky: A.sky, uSunDir: A.sunDir, uSunCol: A.sunCol, uGlow: A.glow },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*viewMatrix*vec4(position + cameraPosition, 1.); gl_Position.z = gl_Position.w; }',
    fragmentShader: /* glsl */`
      uniform vec3 uFogCol, uSky, uSunDir, uSunCol; uniform float uGlow; varying vec3 vD;
      void main(){
        vec3 d = normalize(vD);
        vec3 c = mix(uFogCol, uSky, smoothstep(0., .55, d.y));
        float s = max(dot(d, uSunDir), 0.);
        c += uSunCol*uGlow*(pow(s, 6.)*.35 + pow(s, 60.)*1.2);
        gl_FragColor = vec4(c, 1.);
      }`
  }));
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  const box = (n, f) => { const a = new Float32Array(n * 4); for (let i = 0; i < n; i++) a.set(f(i), i * 4); return a; };
  const points = (n, seeds, vertex, fragment, blending) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    const m = new THREE.Points(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending,
      uniforms: u({ uAmt: { value: 0 }, uSunCol: A.sunCol }),
      vertexShader: 'attribute vec4 aSeed; uniform float uTime, uPx, uAmt; varying float vA; varying float vDist;\n' + vertex,
      fragmentShader: 'uniform float uAmt; uniform vec3 uSunCol; varying float vA; varying float vDist;\n' + FOGGED + fragment
    }));
    m.frustumCulled = false; scene.add(m);
    return m;
  };

  // Dust and pollen, only visible where the sun finds it.
  const motes = points(700, box(700, () => [r(), r(), r(), r()]), /* glsl */`
    void main(){
      vec3 p = vec3(mix(-5., 6., aSeed.x), mix(.1, 3.2, aSeed.y), mix(-11., 2., aSeed.z));
      float t = uTime*.12 + aSeed.w*40.;
      p += vec3(sin(t*1.3 + aSeed.x*20.), sin(t*.9 + aSeed.y*20.)*.5, cos(t*1.1 + aSeed.z*20.))*.5;
      vec4 mv = viewMatrix*vec4(p, 1.);
      vA = (.4 + .6*sin(uTime*.7 + aSeed.w*60.))*uAmt; vDist = -mv.z;
      gl_PointSize = max(1.5, .011*uPx/-mv.z); gl_Position = projectionMatrix*mv;
    }`, /* glsl */`
    void main(){
      float d = length(gl_PointCoord - .5); if (d > .5) discard;
      gl_FragColor = vec4(uSunCol*vec3(1., .95, .75)*smoothstep(.5, .1, d)*vA*.5*exp(-vDist*.12), 1.);
    }`, THREE.AdditiveBlending);

  const snow = points(3200, box(3200, () => [r(), r(), r(), r()]), /* glsl */`
    void main(){
      float fall = uTime*(.35 + aSeed.w*.3);
      vec3 p = vec3(mix(-9., 10., aSeed.x), 7. - mod(aSeed.y*7. + fall, 7.), mix(-18., 3., aSeed.z));
      p.x += sin(uTime*.6 + aSeed.w*50. + p.y)*.25; p.z += cos(uTime*.5 + aSeed.x*50. + p.y*.7)*.2;
      p.y -= .4;
      vec4 mv = viewMatrix*vec4(p, 1.);
      vA = step(aSeed.z*.6 + aSeed.w*.4, uAmt); vDist = -mv.z;
      gl_PointSize = max(1.5, (.014 + aSeed.w*.016)*uPx/-mv.z); gl_Position = projectionMatrix*mv;
    }`, /* glsl */`
    void main(){
      float d = length(gl_PointCoord - .5); if (d > .5 || vA < .5) discard;
      gl_FragColor = vec4(fogged(vec3(.9, .93, .98)*(.25 + uSunCol*.8), vDist*.6), smoothstep(.5, .2, d)*.85);
    }`, THREE.NormalBlending);

  // Fireflies wander near the wall. Two of them carry real light, so the moss sees them pass.
  const NF = 60;
  const flyAt = (s, t, out) => {
    const z = lerp(-10, .6, s[2]), side = s[0] - .5;
    const x = wallX(z) + side * 5.5 + Math.sin(t * .23 * (.6 + s[3]) + s[0] * 30) * 1.1;
    const y = gh(x, z) + .5 + s[1] * 1.3 + Math.sin(t * .31 * (.5 + s[1]) + s[3] * 20) * .35;
    return out.set(x, y, z + Math.cos(t * .19 * (.7 + s[0]) + s[2] * 40) * 1.2);
  };
  const flySeeds = box(NF, i => i < 2 ? [[.56, .47][i], [.42, .3][i], [.9, .78][i], [.2, .7][i]] : [r(), r(), r(), r()]);
  const flies = points(NF, flySeeds, /* glsl */`
    void main(){
      float t = uTime;
      vec4 mv = viewMatrix*vec4(position, 1.);
      float blink = pow(max(0., sin(t*(.7 + aSeed.w*.9) + aSeed.x*70.)), 3.);
      vA = blink*uAmt; vDist = -mv.z;
      gl_PointSize = max(3., .22*uPx/-mv.z); gl_Position = projectionMatrix*mv;
    }`, /* glsl */`
    void main(){
      float d = length(gl_PointCoord - .5)*2.; if (d > 1.) discard;
      float g = exp(-d*d*9.)*.55 + exp(-d*d*260.)*3.;
      gl_FragColor = vec4(vec3(.75, 1., .28)*g*vA*exp(-vDist*.035), 1.);
    }`, THREE.AdditiveBlending);
  const lamps = [0, 1].map(() => { const l = new THREE.PointLight(0xb8ff50, 0, 1.8, 2); scene.add(l); return l; });
  const tmp = new THREE.Vector3();

  // Leaves on their way down.
  const lg = new THREE.PlaneGeometry(.085, .065, 2, 1);
  lg.attributes.position.setZ(1, .012); lg.attributes.position.setZ(4, .012);
  const NL = 420;
  lg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(box(NL, () => [r(), r(), r(), r()]), 4));
  const falling = new THREE.InstancedMesh(lg, new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: u({ uAmt: { value: 0 }, uSunCol: A.sunCol }),
    vertexShader: /* glsl */`
      attribute vec4 aSeed; uniform float uTime, uAmt; varying vec3 vC; varying float vDist; varying vec3 vN; varying vec2 vUv;
      mat3 rot(vec3 a, float t){ float c = cos(t), s = sin(t), o = 1. - c; a = normalize(a);
        return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s, o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s, o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }
      void main(){
        float cyc = uTime*(.085 + aSeed.w*.05) + aSeed.y;
        float t = fract(cyc), id = floor(cyc);
        vec3 c = vec3(mix(-8., 9., fract(aSeed.x + id*.37)), mix(9., -.2, t), mix(-16., 2.5, fract(aSeed.z + id*.61)));
        c.x += sin(t*17. + aSeed.w*40.)*.35 + t*.8; c.z += cos(t*13. + aSeed.x*40.)*.3;
        mat3 R = rot(vec3(aSeed.x - .5, .3, aSeed.z - .5), t*26.*(.5 + aSeed.w) + aSeed.y*9.);
        vec3 p = c + R*position*step(aSeed.x*.5 + aSeed.w*.5, uAmt);
        vN = R*normal; vUv = uv;
        vec3 a = mix(vec3(.70, .30, .04), vec3(.82, .60, .09), fract(aSeed.w*7.3));
        vC = mix(a, vec3(.46, .10, .03), step(.82, aSeed.z));
        vec4 mv = viewMatrix*vec4(p, 1.); vDist = -mv.z; gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: 'uniform vec3 uSunCol; varying vec3 vC; varying float vDist; varying vec3 vN; varying vec2 vUv;\n' + FOGGED + /* glsl */`
      void main(){ vec2 q = abs(vUv - .5); if (q.x*1.05 + q.y*1.6 > .52) discard; float l = .3 + .7*abs(normalize(vN).y); gl_FragColor = vec4(fogged(vC*l*(.3 + uSunCol*.9), vDist), 1.); }`
  }), NL);
  falling.frustumCulled = false; scene.add(falling);

  // Shafts: long soft ribbons along the light, turned to face you.
  const NS = 22, sg = new THREE.PlaneGeometry(1, 1), ss = new Float32Array(NS * 4), so = new Float32Array(NS * 3);
  for (let i = 0; i < NS; i++) {
    const z = lerp(-20, -1.5, r()), x = wallX(z) + (r() - .5) * 15;
    so.set([x, gh(x, z), z], i * 3); ss.set([lerp(.25, 1.1, r()), r(), r(), r()], i * 4);
  }
  sg.setAttribute('aRoot', new THREE.InstancedBufferAttribute(so, 3));
  sg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(ss, 4));
  const shafts = new THREE.InstancedMesh(sg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: u({ uAmt: A.shafts, uSunCol: A.sunCol, uSunDir: A.sunDir }),
    vertexShader: /* glsl */`
      attribute vec3 aRoot; attribute vec4 aSeed; uniform vec3 uSunDir; uniform float uTime; varying vec2 vUv; varying float vA; varying float vDist;
      void main(){
        vec3 mid = aRoot + uSunDir*7.;
        vec3 side = normalize(cross(uSunDir, cameraPosition - mid));
        vec3 p = aRoot + uSunDir*(uv.y*15. - .3) + side*(uv.x - .5)*aSeed.x*(1. + uv.y*.6);
        vUv = uv; vA = .55 + .45*sin(uTime*.25 + aSeed.w*30.);
        vec4 mv = viewMatrix*vec4(p, 1.); vDist = -mv.z; gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSunCol; uniform float uAmt; varying vec2 vUv; varying float vA; varying float vDist;
      void main(){
        float a = pow(sin(vUv.x*3.14159), 2.)*smoothstep(0., .08, vUv.y)*smoothstep(1., .35, vUv.y);
        a *= smoothstep(.4, 2.5, vDist)*exp(-vDist*.03);
        gl_FragColor = vec4(uSunCol*vec3(1., .97, .82)*a*vA*uAmt*.05, 1.);
      }`
  }), NS);
  shafts.frustumCulled = false; shafts.renderOrder = 5; scene.add(shafts);

  return {
    update(env, time, pxScale) {
      A.time.value = time; A.px.value = pxScale;
      A.fogDensity.value = env.fogDensity; A.fogCol.value.copy(env.fog); A.sky.value.copy(env.sky);
      A.sunDir.value.copy(env.sunDir); A.sunCol.value.copy(env.sunCol).multiplyScalar(env.sunInt / 3.2);
      A.glow.value = env.glow; A.shafts.value = env.shafts;
      motes.material.uniforms.uAmt.value = env.motes; motes.visible = env.motes > .01;
      snow.material.uniforms.uAmt.value = env.snowfall; snow.visible = env.snowfall > .01;
      falling.material.uniforms.uAmt.value = env.leafFall; falling.visible = env.leafFall > .01;
      shafts.visible = env.shafts > .02;
      flies.material.uniforms.uAmt.value = env.firefly; flies.visible = env.firefly > .01;
      if (flies.visible) {
        const p = flies.geometry.attributes.position;
        for (let i = 0; i < NF; i++) { flyAt(flySeeds.subarray(i * 4, i * 4 + 4), time, tmp); p.setXYZ(i, tmp.x, tmp.y, tmp.z); }
        p.needsUpdate = true;
      }
      lamps.forEach((l, i) => {
        const s = flySeeds.subarray(i * 4, i * 4 + 4);
        flyAt(s, time, l.position);
        l.intensity = env.firefly * Math.pow(Math.max(0, Math.sin(time * (.7 + s[3] * .9) + s[0] * 70)), 3) * .14;
      });
    }
  };
}
