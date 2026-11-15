// The inventor's room: floorboards, a window's worth of light, wool on a shelf, needles as
// tall as he is, and the sign with the name on it.
import * as THREE from 'three';
import { knit } from './knit.js';

const NOISE = /* glsl */`
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
`;
function surface(mat, body) {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = (modelMatrix*vec4(position, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;\n' + NOISE)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + body);
  };
  mat.customProgramCacheKey = () => body;
  return mat;
}

export const SIGN = 'FLOOR WEEPIES';

export function buildRoom(scene) {
  const room = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), surface(new THREE.MeshStandardMaterial({ roughness: .7 }), /* glsl */`
  {
    float bx = vW.x/.16, id = floor(bx), bz = vW.z/1.9 + h21(vec2(id, 3.))*5.;
    float gap = smoothstep(.0, .03, fract(bx))*smoothstep(1., .97, fract(bx))*smoothstep(0., .006, fract(bz))*smoothstep(1., .994, fract(bz));
    float t = h21(vec2(id, floor(bz)));
    float grain = vn(vec2(vW.x*60., vW.z*3. + t*40.))*.5 + vn(vec2(vW.x*180., vW.z*5.))*.5;
    vec3 wood = mix(vec3(.50, .33, .19), vec3(.66, .47, .28), t)*(.82 + .3*grain);
    // light from the window lies across the boards
    vec2 q = (vW.xz - vec2(-.6, .7))*mat2(.86, .5, -.5, .86);
    float pool = smoothstep(1.7, 1.2, abs(q.x))*smoothstep(1.3, .9, abs(q.y));
    float bars = smoothstep(.03, .06, abs(q.x))*smoothstep(.03, .06, abs(q.y));
    diffuseColor.rgb = wood*mix(.35, 1., gap)*(1. + pool*bars*.75*vec3(1., .9, .7));
  }`));
  floor.rotation.x = -Math.PI / 2; room.add(floor);

  const plaster = () => surface(new THREE.MeshStandardMaterial({ roughness: 1 }), /* glsl */`
  {
    float n = vn(vW.xy*3. + vW.z*2.)*.5 + vn(vW.xy*17. + vW.z*9.)*.5;
    vec3 c = mix(vec3(.80, .70, .60), vec3(.93, .86, .76), smoothstep(0., 3.6, vW.y));
    c = mix(c, vec3(.42, .50, .47), smoothstep(1.02, .98, vW.y)*.9);       // painted to dado height
    diffuseColor.rgb = c*(.92 + .12*n)*mix(.55, 1., smoothstep(0., .5, vW.y));
  }`);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), plaster()); back.position.set(0, 4.5, -3.2); room.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), plaster()); left.rotation.y = Math.PI / 2; left.position.set(-5.2, 4.5, 0); room.add(left);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), plaster()); right.rotation.y = -Math.PI / 2; right.position.set(5.2, 4.5, 0); room.add(right);
  const skirting = new THREE.Mesh(new THREE.BoxGeometry(16, .14, .03), new THREE.MeshStandardMaterial({ color: 0xe9ddc8, roughness: .6 })); skirting.position.set(0, .07, -3.18); room.add(skirting);

  // The window, off to the left: just brightness.
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.3), new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }',
    fragmentShader: /* glsl */`varying vec2 vUv; void main(){
      vec2 q = abs(vUv - .5); float bar = step(.012, q.x)*step(.012, abs(vUv.y - .55));
      float frame = step(q.x, .47)*step(q.y, .48);
      vec3 sky = mix(vec3(1., .93, .78), vec3(.86, .93, 1.), vUv.y)*2.2;
      gl_FragColor = vec4(mix(vec3(.9, .85, .76), sky, bar*frame), 1.); }`
  }));
  win.rotation.y = Math.PI / 2; win.position.set(-5.18, 2.05, -.6); room.add(win);

  // A knitted rug, because of course.
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.3, 64), knit(0xd9c7a6));
  const ru = rug.geometry.attributes.uv; for (let i = 0; i < ru.count; i++) ru.setXY(i, ru.getX(i) * 100, ru.getY(i) * 124);
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, .004, -.2); room.add(rug);

  // Shelf of wool.
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6240, roughness: .6 });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.6, .04, .3), wood); shelf.position.set(2.7, 1.72, -3.03); room.add(shelf);
  const ball = col => surface(new THREE.MeshStandardMaterial({ color: col, roughness: .95 }), /* glsl */`
  {
    vec3 n = normalize(vNormal);
    float a = sin((n.x*1.3 + n.y*.9)*46.)*.5 + .5, b = sin((n.y*1.1 - n.z*1.2)*46.)*.5 + .5;
    diffuseColor.rgb *= .62 + .38*max(a*a, b*b);
  }`);
  const cols = [0xd96a7e, 0xe2b23c, 0x6fa8a0, 0xb79bd1, 0xe36b4a, 0xf1e6d0, 0x7fa064, 0x86b6d6];
  cols.forEach((c, i) => {
    const r = .11 + (i % 3) * .018, m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), ball(c));
    m.position.set(1.6 + i * .3, 1.74 + r, -3.02 + (i % 2) * .04); m.rotation.set(i, i * 2, i * 3); room.add(m);
  });
  [[-3.9, 0xe2b23c, .2], [-3.55, 0xd96a7e, .16], [-3.75, 0x6fa8a0, .14]].forEach(([x, c, r], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), ball(c)); m.position.set(x, r, -2.3 + i * .32); m.rotation.set(i * 2, i, 1); room.add(m);
  });

  // Needles, for scale.
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: .3, metalness: .85 });
  [[-2.5, .12], [-2.25, -.1]].forEach(([x, tilt]) => {
    const n = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, 2.2, 12), steel); shaft.position.y = 1.1; n.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.028, .16, 12), steel); tip.position.y = 2.28; n.add(tip);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.06, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe36b4a, roughness: .4 })); knob.position.y = 0.04; n.add(knob);
    n.position.set(x, 0, -2.75); n.rotation.set(-.17, 0, tilt); room.add(n);
  });

  // The sign, and the board where other people's ideas go.
  const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 256;
  const g = sc.getContext('2d');
  g.fillStyle = '#efe3c8'; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = '#6b4a2d'; g.lineWidth = 14; g.strokeRect(7, 7, 1010, 242);
  g.fillStyle = '#3d4f3a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 118px Georgia, "Times New Roman", serif';
  [...SIGN].forEach((ch, i, a) => {         // painted by hand, one letter at a time
    g.save(); g.translate(512 + (i - (a.length - 1) / 2) * 72, 132 + Math.sin(i * 2.3) * 5); g.rotate(Math.sin(i * 1.7) * .035); g.fillText(ch, 0, 0); g.restore();
  });
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; st.anisotropy = 8;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .6), new THREE.MeshStandardMaterial({ map: st, roughness: .8 }));
  sign.position.set(-.2, 2.75, -3.17); sign.rotation.z = -.012; room.add(sign);

  const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 640;
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace; bt.anisotropy = 8;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: bt, roughness: .95 }));
  board.position.set(-.2, 1.82, -3.17); room.add(board);
  function slips(names) {
    const c = bc.getContext('2d');
    c.fillStyle = '#b08a5c'; c.fillRect(0, 0, 1024, 640);
    for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${90 + (i * 37) % 70},${60 + (i * 17) % 40},30,.18)`; c.fillRect((i * 389) % 1024, (i * 577) % 640, 3, 2); }
    c.strokeStyle = '#6b4a2d'; c.lineWidth = 16; c.strokeRect(8, 8, 1008, 624);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (!names.length) { c.fillStyle = 'rgba(60,40,20,.55)'; c.font = 'italic 34px Georgia, serif'; c.fillText('other names, if you have one', 512, 320); }
    names.slice(-12).forEach((name, i) => {
      const col = i % 3, row = Math.floor(i / 3), x = 190 + col * 322 + Math.sin(i * 5.1) * 22, y = 100 + row * 148 + Math.cos(i * 3.3) * 14;
      c.save(); c.translate(x, y); c.rotate(Math.sin(i * 2.9) * .09);
      c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-142, -46, 290, 100);
      c.fillStyle = ['#fff6dc', '#fde3e6', '#e4f1ea', '#f1e8fb'][i % 4]; c.fillRect(-146, -52, 290, 100);
      c.fillStyle = '#c0392b'; c.beginPath(); c.arc(0, -40, 8, 0, 7); c.fill();
      c.fillStyle = '#2f2a25';
      let size = 36; c.font = `italic ${size}px Georgia, serif`;
      while (c.measureText(name).width > 262 && size > 14) c.font = `italic ${size -= 2}px Georgia, serif`;
      c.fillText(name, 0, 6); c.restore();
    });
    bt.needsUpdate = true;
  }
  slips([]);
  scene.add(room);
  return { slips };
}
