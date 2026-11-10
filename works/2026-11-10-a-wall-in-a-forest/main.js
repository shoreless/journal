import * as THREE from 'three';
import { U, wallX, CAM_Z } from './land.js';
import { buildWall, updateFallers } from './wall.js';
import { buildForest } from './forest.js';
import { buildAir } from './air.js';
import { buildPost } from './post.js';
import { buildSound } from './sound.js';
import { WallClock, climate, makeEnv, caption } from './time.js';
import { lerp } from './noise.js';

const params = new URLSearchParams(location.search);
const num = k => params.has(k) ? parseFloat(params.get(k)) : null;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('view');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  document.body.classList.add('no-gl');
  throw e;
}
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let pixelRatio = Math.min(devicePixelRatio || 1, params.get('q') === 'low' ? 1 : 1.75);
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x889988, .04);
const camera = new THREE.PerspectiveCamera(40, 1, .05, 220);

const wall = buildWall(scene);
buildForest(scene, wall);
const air = buildAir(scene);

const hemi = new THREE.HemisphereLight(0xffffff, 0x223311, 1);
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: 5, far: 150 });
sun.shadow.bias = -.0005; sun.shadow.normalBias = .035;
sun.target.position.set(0, 0, -6);
scene.add(hemi, sun, sun.target);

// The eye sits on the wall and looks down its own length.
const eye = new THREE.Vector3(wallX(CAM_Z) + .6, wall.top(CAM_Z) + .4, CAM_Z);
const aim = new THREE.Vector3(wallX(-6) - .15, wall.top(-6) - .35, -6);
camera.position.copy(eye); camera.lookAt(aim);
const baseQuat = camera.quaternion.clone(), look = { x: 0, y: 0, tx: 0, ty: 0 };

const post = buildPost(renderer, camera);
const sound = buildSound();
const clock = new WallClock();
const env = makeEnv();
if (reduced) clock.maxSpeed = 365 / 45;
if (num('y') !== null || num('p') !== null || num('d') !== null) clock.fixed = { y: num('y') ?? 0, p: num('p') ?? .4, d: num('d') ?? .42 };
if (num('still') !== null) clock.still = num('still');

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 58 : 40;        // held upright, a phone sees more of the wood
  camera.updateProjectionMatrix();
  post.resize();
}
addEventListener('resize', resize); resize();

// ---- stirring ----
const line = document.getElementById('line'), hint = document.getElementById('hint'), cap = document.getElementById('caption');
const soundBtn = document.getElementById('sound');
let last = null;
function stir(e) {
  if (e && e.type === 'pointermove') {
    if (last && Math.hypot(e.clientX - last[0], e.clientY - last[1]) < 2) return;
    last = [e.clientX, e.clientY];
    look.tx = (e.clientX / innerWidth - .5) * 2; look.ty = (e.clientY / innerHeight - .5) * 2;
  }
  clock.stir();
}
for (const t of ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchmove']) addEventListener(t, stir, { passive: true });
soundBtn.addEventListener('click', () => {
  const on = sound.toggle();
  soundBtn.textContent = on ? 'sound on' : 'sound off'; soundBtn.setAttribute('aria-pressed', on);
});

// ---- quality: start generous, back off if the machine is struggling ----
let frames = 0, slow = 0, level = params.get('q') === 'low' ? 2 : matchMedia('(pointer: coarse)').matches ? 1 : 0;
function setLevel(l) {
  level = l;
  wall.shells.forEach((s, i) => s.userData.setShells([[16, 8], [10, 5], [6, 3]][l][i]));
  post.uniforms.uDof.value = l < 3 ? 1 : 0;
  if (l >= 1) { pixelRatio = Math.min(pixelRatio, l >= 2 ? 1 : 1.25); post.setSamples(l >= 2 ? 0 : 4); }
  if (l >= 2) { sun.shadow.mapSize.set(1024, 1024); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  resize();
}
if (level) setLevel(level);

let prev = performance.now(), time = 0, shown = '', intro = 0;
const manual = params.has('manual');      // no loop: frames are asked for one at a time
function frame(now) {
  if (!manual) requestAnimationFrame(frame);
  const raw = (now - prev) / 1000; prev = now;
  tick(Math.min(raw, .1), raw);
}
function tick(dt, raw = dt) {
  time += dt; intro += dt;
  if (!clock.fixed) clock.update(dt);
  climate(clock, env);

  U.time.value = time; U.years.value = env.years; U.growth.value = env.growth; U.lichen.value = env.lichen;
  U.snow.value = env.snow; U.wet.value = env.wet; U.fresh.value = env.fresh; U.leaf.value = env.leaf;
  U.autumn.value = env.autumn; U.spring.value = env.spring; U.rot.value = env.rot; U.fern.value = env.fern; U.fernBrown.value = env.fernBrown;
  U.wind.value = env.wind; U.glow.value = env.glow;
  U.sunCol.value.copy(env.sunCol).multiplyScalar(env.sunInt / 3.2);
  sun.color.copy(env.sunCol); sun.intensity = env.sunInt;
  sun.position.copy(sun.target.position).addScaledVector(env.sunDir, 75);
  hemi.color.copy(env.sky); hemi.groundColor.copy(env.ground); hemi.intensity = env.hemiInt;
  scene.fog.color.copy(env.fog); scene.fog.density = env.fogDensity;
  post.uniforms.uExposure.value = env.exposure;

  updateFallers(wall, env.years, dt, () => sound.thud());
  air.update(env, time, renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360)));
  sound.update(env, clock.dayBlend > .5);

  // You cannot move, but you can look, a little.
  const k = 1 - Math.exp(-dt / .6);
  look.x = lerp(look.x, look.tx, k); look.y = lerp(look.y, look.ty, k);
  camera.quaternion.copy(baseQuat)
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-look.y * .055, -look.x * .1, 0, 'YXZ')));

  renderer.info.reset();
  post.render(scene, time);

  // words
  const c = caption(env.years);
  if (c !== shown) { cap.textContent = shown = c; }
  document.body.classList.toggle('intro', intro < 9);
  document.body.classList.toggle('hinting', intro > 10 && intro < 22);
  document.body.classList.toggle('counting', intro > 12);

  // quality check over the first few seconds
  if (frames++ > 20 && frames < 200 && level < 3 && !params.has('q')) {
    if (raw > 1 / 26) slow++;
    if (slow > 24) { slow = 0; frames = 0; setLevel(level + 1); }
  }
}
requestAnimationFrame(frame);

// For poking at it from the console, and for taking its picture.
renderer.info.autoReset = false;
window.wall = {
  clock, env, scene, camera, renderer, post, U, setLevel,
  at(y, p, d) { clock.fixed = { y, p, d }; }, release() { clock.fixed = null; },
  step(dt = 1 / 30) { tick(dt); },
  snap(dt = 1 / 30) { tick(dt); return canvas.toDataURL('image/jpeg', .92); }
};
