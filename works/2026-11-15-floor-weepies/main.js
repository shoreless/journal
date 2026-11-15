import * as THREE from 'three';
import { buildFlower, TIME, ZTOP, ZBOT } from './knit.js';
import { buildRoom } from './room.js';
import { buildSound } from './sound.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('view');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { document.body.classList.add('no-gl'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9dcc6);
const camera = new THREE.PerspectiveCamera(42, 1, .03, 60);
scene.add(new THREE.HemisphereLight(0xfff4e2, 0x8a6a4a, 1.5));
const key = new THREE.DirectionalLight(0xffe8c4, 2.1); key.position.set(-5, 4.5, 2.5); scene.add(key);
const fill = new THREE.DirectionalLight(0xcfe0ff, .5); fill.position.set(4, 2, 5); scene.add(fill);

const room = buildRoom(scene);
const HOME = new THREE.Vector3(0, 1.6, 5.3), HOME_LOOK = new THREE.Vector3(0, 1.22, -.4);
const flowers = [
  { x: -3.30, z: -0.36, stem: 0x7f9b62, petal: 0xdc6f84, heart: 0xf0c64a, lining: 0xf3b9a8 },
  { x: -1.98, z: -0.65, stem: 0x5f8f86, petal: 0xe9b63a, heart: 0xd9603e, lining: 0xf6d79a },
  { x: -0.66, z: -0.83, stem: 0x8fa35a, petal: 0xb596d6, heart: 0xf4ead2, lining: 0xe2c9ee },
  { x: 0.66, z: -0.83, stem: 0x6a9a6c, petal: 0xe3694a, heart: 0xf2d16b, lining: 0xf7c2a0 },
  { x: 1.98, z: -0.65, stem: 0x77a590, petal: 0xf2e7d2, heart: 0xe0a13a, lining: 0xf4dcc0 },
  { x: 3.30, z: -0.36, stem: 0x93a070, petal: 0x86b4d8, heart: 0xf3e3b0, lining: 0xcfe1f1 }
].map(c => {
  const f = buildFlower(c);
  f.group.position.set(c.x, 0, c.z);
  f.group.rotation.y = Math.atan2(HOME.x * .4 - c.x, HOME.z - c.z);      // zips face the door
  f.win.value = Math.atan2(-Math.cos(f.group.rotation.y), Math.sin(f.group.rotation.y));     // which way the window is, from in there
  f.front = new THREE.Vector3(Math.sin(f.group.rotation.y), 0, Math.cos(f.group.rotation.y));
  scene.add(f.group);
  return f;
});

// ---- where you are ----
let state = 'room', cur = null, hover = null, zipTarget = ZTOP, insideT = 0, snugT = 0, time = 0;
const camPos = HOME.clone(), camLook = HOME_LOOK.clone(), look = { x: 0, y: 0, tx: 0, ty: 0 };
let fov = 42;
const sound = buildSound();
const $ = id => document.getElementById(id);
const hint = $('hint'), line = $('line'), back = $('back'), soundBtn = $('sound'), form = $('names'), said = $('said');
const open = () => cur ? (ZTOP - cur.zip.value) / (ZTOP - ZBOT) : 0;

function setState(s, f = cur) {
  if (s === 'room' && cur) { cur.closing = true; }
  state = s; cur = s === 'room' ? null : f; if (cur) { cur.closing = false; zipTarget = cur.zip.value; }
  document.body.dataset.state = s; insideT = 0; snugT = 0;
}
function act() {            // a tap, or Enter
  if (state === 'room') { if (hover) setState('at', hover); }
  else if (state === 'at') { if (open() > .7) setState('inside'); }
  else if (open() > .7) setState('at');
}
function goBack() { if (state === 'inside') { if (open() > .7) setState('at'); else zipTarget = ZBOT; } else if (state === 'at') setState('room'); }

function pick(x, y) {
  const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  let best = null, bd = 1e9; const a = new THREE.Vector3(), b = new THREE.Vector3(), seg = new THREE.Line3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  for (const f of flowers) {
    a.copy(f.group.position).setY(.25); b.copy(f.group.position).setY(1.7);
    const far = ray.ray.origin.clone().addScaledVector(ray.ray.direction, 30);
    seg.set(a, b);
    // closest approach between the ray and the flower's axis
    const d = Math.sqrt(ray.ray.distanceSqToSegment(a, b, p1, p2)), dist = ray.ray.origin.distanceTo(p2);
    if (d < .55 && dist < bd) { bd = dist; best = f; }
  }
  return best;
}

let down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, ly: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  look.tx = (e.clientX / innerWidth - .5) * 2; look.ty = (e.clientY / innerHeight - .5) * 2;
  if (state === 'room' && !down) { hover = pick(e.clientX, e.clientY); canvas.style.cursor = hover ? 'pointer' : ''; }
  if (down) {
    down.moved += Math.abs(e.clientY - down.ly) + Math.abs(e.movementX || 0);
    if (cur) zipTarget = Math.min(ZTOP, Math.max(ZBOT, zipTarget - (e.clientY - down.ly) / innerHeight * 1.9));
    down.ly = e.clientY;
  }
});
canvas.addEventListener('pointerup', e => {
  if (down && down.moved < 8 && performance.now() - down.t < 500) { if (state === 'room') hover = pick(e.clientX, e.clientY); act(); }
  down = null;
});
addEventListener('wheel', e => { if (cur) zipTarget = Math.min(ZTOP, Math.max(ZBOT, zipTarget - e.deltaY * .0012)); }, { passive: true });
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowDown' && cur) zipTarget = Math.max(ZBOT, zipTarget - .12);
  else if (e.key === 'ArrowUp' && cur) zipTarget = Math.min(ZTOP, zipTarget + .12);
  else if (e.key === 'Enter' || e.key === ' ') { if (state === 'room') hover = hover || flowers[2]; act(); }
  else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { if (state === 'room') hover = flowers[(flowers.indexOf(hover) + (e.key === 'ArrowRight' ? 1 : flowers.length - 1) + (hover ? 0 : 1)) % flowers.length]; }
  else if (e.key === 'Escape') goBack();
});
back.addEventListener('click', goBack);
soundBtn.addEventListener('click', () => { const on = sound.toggle(); soundBtn.textContent = on ? 'sound on' : 'sound off'; soundBtn.setAttribute('aria-pressed', on); });

// ---- other names ----
let names = [];
try { names = JSON.parse(localStorage.getItem('floor-weepies-names') || '[]').filter(n => typeof n === 'string').slice(-12); } catch (e) { /* private window: the board just starts empty */ }
room.slips(names);
form.addEventListener('submit', e => {
  e.preventDefault();
  const v = form.elements.name.value.trim().slice(0, 28); if (!v) return;
  names.push(v); names = names.slice(-12); room.slips(names); form.elements.name.value = '';
  try { localStorage.setItem('floor-weepies-names', JSON.stringify(names)); } catch (e) { /* fine */ }
  said.textContent = 'He pins it up. The sign stays.'; said.classList.add('show'); clearTimeout(said.t); said.t = setTimeout(() => said.classList.remove('show'), 4200);
});

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
let lastTooth = 0, intro = 0;
function tick(dt) {
  time += dt; intro += dt; TIME.value = time;
  const k = t => 1 - Math.exp(-dt / t);

  // the zip follows your hand; left alone in the room, it does itself back up
  for (const f of flowers) {
    const target = f === cur ? zipTarget : ZTOP, before = f.zip.value;
    f.zip.value += (target - f.zip.value) * k(f === cur ? .07 : .5);
    if (f === cur) {
      const tooth = Math.floor(f.zip.value / .0135);
      if (tooth !== lastTooth) { sound.tick(Math.abs(f.zip.value - before) / Math.max(dt, .001), state === 'inside'); lastTooth = tooth; }
    }
    const snug = f === cur && state === 'inside' ? Math.max(0, 1 - open() * 6) : 0;
    f.snug.value += (snug - f.snug.value) * k(1.4);
    f.update(time, f === hover && state === 'room' || f === cur && state === 'at' ? 1 : 0, dt);
  }

  // camera
  const portrait = innerWidth < innerHeight;
  let wantFov = portrait ? 62 : 42;
  if (state === 'room') { tmp.copy(HOME); if (portrait) tmp.z += 1.2; tmp2.copy(HOME_LOOK); }
  else if (state === 'at') { tmp.copy(cur.group.position).addScaledVector(cur.front, portrait ? 3.1 : 2.7).setY(1.35); tmp2.copy(cur.group.position).setY(1.08); }
  else { tmp.copy(cur.group.position).addScaledVector(cur.front, -.1).setY(.8); tmp2.copy(cur.group.position).addScaledVector(cur.front, 1).setY(.84); wantFov = portrait ? 86 : 72; }
  camPos.lerp(tmp, k(.55)); camLook.lerp(tmp2, k(.45)); fov += (wantFov - fov) * k(.6);
  look.x += (look.tx - look.x) * k(.5); look.y += (look.ty - look.y) * k(.5);
  camera.position.copy(camPos); camera.fov = fov; camera.updateProjectionMatrix();
  camera.lookAt(camLook);
  const sw = state === 'inside' ? [.6, .34] : [.05, .03];        // inside, you can look around properly
  camera.rotateY(-look.x * sw[0]); camera.rotateX(-look.y * sw[1]);

  const snugNow = cur ? cur.snug.value : 0;
  if (state === 'inside') { insideT += dt; if (snugNow > .8) snugT += dt; }
  sound.update(state === 'inside', snugNow);
  renderer.render(scene, camera);

  // words
  const o = open();
  hint.textContent = state === 'room' ? 'choose one'
    : state === 'at' ? (o > .7 ? 'tap to climb in' : 'drag down to unzip')
      : snugNow > .5 ? '' : o > .7 && insideT > 1.5 ? 'drag up to zip yourself in' : o > .7 ? '' : 'drag';
  document.body.classList.toggle('intro', intro < 10 && state === 'room');
  document.body.classList.toggle('hinting', intro > 3);
  document.body.classList.toggle('lovely', state === 'inside' && snugT > 5 && snugT < 16);
}

const manual = params.has('manual');
let prev = performance.now();
function frame(now) { if (!manual) requestAnimationFrame(frame); const dt = Math.min((now - prev) / 1000, .1); prev = now; tick(dt); }
setState('room');
requestAnimationFrame(frame);

window.weepies = {
  flowers, camera, scene, renderer, tick,
  go(i) { setState('at', flowers[i]); }, zip(v) { zipTarget = ZTOP - v * (ZTOP - ZBOT); }, enter() { setState('inside'); }, home() { setState('room'); },
  run(seconds, dt = 1 / 30) { for (let t = 0; t < seconds; t += dt) tick(dt); return canvas.toDataURL('image/jpeg', .92); },
  get state() { return { state, open: open(), snug: cur ? cur.snug.value : 0, hint: hint.textContent, cls: document.body.className }; }
};
