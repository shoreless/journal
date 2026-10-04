import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildBuccalApparatus, makeSerratedSuckerRing } from './anatomy-detail.js';
import { installTripleTap } from './triple-tap.js';
import { installSubmersible } from './submersible.js';

const $ = id => document.getElementById(id);
let phase='ocean',transitionStart=0,beachTheme=false,returnView=null;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let running=true,sub=null;
const graphics=window.__abyssGraphics;
if(!graphics?.context)throw new Error('No graphics context');
const renderer=new THREE.WebGLRenderer({canvas:graphics.canvas,context:graphics.context,...graphics.options});
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.setClearColor(0x05202b);
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.35;
$('ocean').appendChild(renderer.domElement);
// The island is a responsive illustration: no second WebGL scene or GPU resources.
const island=document.createElement('picture');island.className='illustrated-island';
island.innerHTML='<source media="(max-width: 700px)" srcset="./assets/beach-tall.webp"><img src="./assets/beach-wide.webp" alt="Giant grilled ikayaki at an Okinawa-inspired beach barbecue" draggable="false">';
$('ocean').appendChild(island);
const islandImage=island.querySelector('img');
const oceanHint=document.querySelector('.interaction-hint').innerHTML;

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x05202b,.023);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,160);
const target=new THREE.Vector3(-2.5,0,0);
const home=new THREE.Vector3(7,2.5,23);
camera.position.copy(home);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.copy(target);controls.enableDamping=true;controls.dampingFactor=.045;
controls.minDistance=.65;controls.maxDistance=48;controls.enablePan=false;
controls.minPolarAngle=.3;controls.maxPolarAngle=Math.PI-.3;controls.rotateSpeed=.55;
const ambient=new THREE.HemisphereLight(0x83b9ce,0x010207,.012);scene.add(ambient);
const key=new THREE.DirectionalLight(0xe8ebdf,.6);key.position.set(-6,9,10);scene.add(key);
const rim=new THREE.DirectionalLight(0xb0c8d4,.18);rim.position.set(4,6,-6);scene.add(rim);
const fill=new THREE.PointLight(0x64a7ab,0,35,2);fill.position.set(-5,-4,5);scene.add(fill);
const torch=new THREE.SpotLight(0xf4ece0,470,90,.64,.65,1.4);scene.add(torch);scene.add(torch.target);

// Anatomy informed by Smithsonian Ocean and Roper & Jereb's Architeuthis account.
// Approximately 2.6 scene units per meter; posture and motion remain interpretive.
const skinCanvas=document.createElement('canvas');skinCanvas.width=skinCanvas.height=1024;
const ctx=skinCanvas.getContext('2d');ctx.fillStyle='#874538';ctx.fillRect(0,0,1024,1024);
let seed=71431;
function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<58000;i++){const a=random();ctx.fillStyle=a>.38?`rgba(63,12,20,${.1+random()*.29})`:`rgba(229,186,153,${random()*.25})`;ctx.beginPath();ctx.ellipse(random()*1024,random()*1024,random()*2.9+.5,random()*3.7+.7,random()*Math.PI,0,Math.PI*2);ctx.fill();}
const skinMap=new THREE.CanvasTexture(skinCanvas);skinMap.colorSpace=THREE.SRGBColorSpace;skinMap.wrapS=skinMap.wrapT=THREE.RepeatWrapping;
const reliefCanvas=document.createElement('canvas');reliefCanvas.width=reliefCanvas.height=512;
const relief=reliefCanvas.getContext('2d'),reliefPixels=relief.createImageData(512,512);
for(let i=0;i<512*512;i++){const value=110+random()*34;reliefPixels.data.set([value,value,value,255],i*4);}relief.putImageData(reliefPixels,0,0);
const skinRelief=new THREE.CanvasTexture(reliefCanvas);skinRelief.wrapS=skinRelief.wrapT=THREE.RepeatWrapping;
const skin=new THREE.MeshPhysicalMaterial({map:skinMap,bumpMap:skinRelief,bumpScale:.0015,color:0xd2ada2,roughness:.6,metalness:0,clearcoat:.13,clearcoatRoughness:.5});
const finMaterial=skin.clone();finMaterial.side=THREE.DoubleSide;finMaterial.color.set(0xc8a59b);
const suckerMaterial=new THREE.MeshStandardMaterial({color:0xc9af97,roughness:.72});
const squid=new THREE.Group();squid.position.set(2,1.3,0);squid.rotation.set(.08,-.72,-.34);scene.add(squid);
const profileKeys=[[.56,.03],[.68,.15],[.79,.6],[.8,1.2],[.75,1.9],[.63,2.7],[.46,3.5],[.3,4.2],[.14,4.85],[.025,5.25],[0,5.3]];
const profileCurve=new THREE.SplineCurve(profileKeys.map(p=>new THREE.Vector2(...p)));
const mantle=new THREE.Mesh(new THREE.LatheGeometry(profileCurve.getPoints(84),64),skin);mantle.name='Muscular mantle';squid.add(mantle);
function ellipsoid(material,position,scale){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),material);mesh.position.set(...position);mesh.scale.set(...scale);squid.add(mesh);return mesh;}
const head=ellipsoid(skin,[0,-.43,0],[.58,.66,.53]);head.name='Head';
const collar=new THREE.Mesh(new THREE.TorusGeometry(.585,.034,8,64),skin);collar.rotation.x=Math.PI/2;collar.position.y=.055;squid.add(collar);
const fins=[];
for(const sign of [-1,1]){
  const vertices=[],uv=[],indices=[],N=28,M=12;
  for(let i=0;i<=N;i++)for(let j=0;j<=M;j++){
    const u=i/N,v=j/M;const y=3.9+u*1.4;
    const attachment=.365*Math.pow(1-u,1.15);
    const width=Math.pow(Math.sin(Math.PI*u),.8)*.62;
    vertices.push(sign*(attachment+width*v),y,Math.sin(Math.PI*v)*.055+Math.sin(u*Math.PI)*v*.045);uv.push(u,v);
  }
  for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,finMaterial);mesh.name='Small ovoid posterior fin';squid.add(mesh);fins.push({mesh,base:vertices.slice(),sign,N,M});
}
// Large eyes are embedded laterally in the head, with no forward-facing stalks.
const eyeOuter=new THREE.MeshPhysicalMaterial({color:0x303c34,roughness:.34,metalness:0,clearcoat:.5});
const eyeBlack=new THREE.MeshPhysicalMaterial({color:0x030607,roughness:.12,clearcoat:.9});
const eyes=[];
for(const sign of [-1,1]){
  const globe=ellipsoid(eyeOuter,[sign*.52,-.36,.015],[.23,.33,.32]);globe.name='Lateral eye';eyes.push(globe);
  ellipsoid(eyeBlack,[sign*.731,-.36,.027],[.027,.15,.147]);
  const lid=new THREE.Mesh(new THREE.TorusGeometry(.305,.039,10,48),skin);lid.rotation.y=Math.PI/2;lid.position.set(sign*.61,-.36,.015);lid.scale.y=1.03;squid.add(lid);
}
// The funnel projects from the ventral side beneath the mantle opening.
const funnelCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.12,.45),new THREE.Vector3(0,-.12,.61),new THREE.Vector3(0,-.53,.72)]);
const funnel=new THREE.Mesh(new THREE.TubeGeometry(funnelCurve,20,.13,20,false),skin);funnel.name='Ventral funnel';squid.add(funnel);
const opening=new THREE.Mesh(new THREE.CircleGeometry(.107,24),new THREE.MeshStandardMaterial({color:0x231311,roughness:.9,side:THREE.DoubleSide}));opening.position.copy(funnelCurve.getPoint(1));opening.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),funnelCurve.getTangent(1));squid.add(opening);
// The paired beak is set inside a muscular buccal ring, not mounted on the face.
ellipsoid(skin,[0,-.91,0],[.53,.23,.49]);
const beak=buildBuccalApparatus(skin);squid.add(beak.root);

const arms=[],segments=112,sides=12;
const axis=new THREE.Vector3(),normal=new THREE.Vector3(),binormal=new THREE.Vector3(),tmp=new THREE.Vector3(),inward=new THREE.Vector3();
const up=new THREE.Vector3(0,0,1);
function armPoint(arm,u,t,out){
  const a=arm.angle,L=arm.length;
  // Slow, low-amplitude drag with individual flexion; not an octopus-like walking gait.
  const spread=.46+Math.sin(u*Math.PI*.85)*(arm.long?.8:1.05);
  const wave=Math.sin(u*5.2-t*.42+arm.phase)*u*u;
  out.set(Math.cos(a)*spread+wave*(arm.long?.62:.36),
    -.98-u*L+Math.pow(u,4)*(arm.long?3.1:.7)+Math.sin(t*.65+arm.phase)*u*.07,
    Math.sin(a)*spread+Math.sin(u*4.7-t*.38+arm.phase)*u*u*.44);
  if(arm.long){const bend=Math.pow(u,3);out.x+=arm.sign*bend*2.3;out.z+=bend*.9;}
  else {out.x+=Math.cos(a+u*5.2+arm.phase)*Math.pow(u,4)*.48;out.z+=Math.sin(a+u*5.2+arm.phase)*Math.pow(u,4)*.48;}
  return out;
}
// A recessed cup, rather than a ring floating on the skin; openings face the oral side.
const cupProfile=[[0,-.035],[.025,-.025],[.035,.015],[.066,.055],[.073,.065],[.072,.077],[.062,.07],[.052,.043],[.023,.015],[0,.014]].map(p=>new THREE.Vector2(...p));
const suckerGeo=new THREE.LatheGeometry(cupProfile,20);suckerGeo.rotateX(Math.PI/2);
const cupColors=[],cupColor=new THREE.Color();
for(let i=0;i<suckerGeo.attributes.position.count;i++){
  const profileIndex=i%cupProfile.length;
  cupColor.setHex(profileIndex>=8?0x62564c:profileIndex===7?0x998775:profileIndex<3?0xb4a28f:0xe1cfb6);
  cupColors.push(cupColor.r,cupColor.g,cupColor.b);
}
suckerGeo.setAttribute('color',new THREE.Float32BufferAttribute(cupColors,3));
const cupMaterial=suckerMaterial.clone();cupMaterial.vertexColors=true;
const toothRingGeometry=makeSerratedSuckerRing();
const toothRingMaterial=new THREE.MeshStandardMaterial({color:0x9c8057,roughness:.44,side:THREE.DoubleSide});
const knobGeo=new THREE.SphereGeometry(.034,8,6);
const dummy=new THREE.Object3D();
for(let i=0;i<10;i++){
  const long=i>=8,sign=i===8?1:-1,a=long?(i===8?Math.PI/4:Math.PI*3/4):Math.PI/8+i/8*Math.PI*2;
  const arm={angle:a,phase:i*.69,length:long?(i===8?18:18.7):[5.4,6.1,6.3,5.8,5.8,6.3,6.1,5.4][i],long,sign};
  const pos=new Float32Array((segments+1)*(sides+1)*3),uv=[],indices=[];
  for(let j=0;j<=segments;j++)for(let k=0;k<=sides;k++){uv.push(k/sides,j/segments*3);if(j<segments&&k<sides){const n=j*(sides+1)+k;indices.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);
  arm.mesh=new THREE.Mesh(g,skin);arm.mesh.name=long?'Feeding tentacle and club':'Grasping arm';arm.mesh.frustumCulled=false;squid.add(arm.mesh);
  arm.layout=[];arm.knobLayout=[];
  if(long){
    // Sparse alternating locking suckers/knobs along the stalk.
    for(let j=0;j<21;j++){const u=.08+Math.pow(j/21,.73)*.73;arm.layout.push({u,angle:-.4,scale:.2});arm.knobLayout.push({u:u+.006,angle:.4});}
    // Carpus: six irregular series of small suckers, with interspersed knobs.
    for(let j=0;j<6;j++)for(let k=0;k<6;k++){const u=.822+j*.008+(k%2)*.002;arm.layout.push({u,angle:(k-2.5)*.28,scale:.25});if(k%2===0)arm.knobLayout.push({u:u+.004,angle:(k-2)*.28});}
    // Manus: four rows; the two medial rows have enlarged suckers.
    for(let j=0;j<13;j++)for(let k=0;k<4;k++)arm.layout.push({u:.872+j*.0061,angle:(k-1.5)*.44,scale:(k===1||k===2)?.79:.36});
    // Dactylus: four tapering rows of small terminal suckers.
    for(let j=0;j<8;j++)for(let k=0;k<4;k++)arm.layout.push({u:.953+j*.005,angle:(k-1.5)*.42,scale:.32*(1-j/10)});
  }else{
    for(let j=0;j<34;j++)for(let k=0;k<2;k++){const u=.045+j/34*.91;arm.layout.push({u,angle:k===0?-.48:.48,scale:Math.max(.13,.93*Math.pow(1-u,.78))});}
  }
  arm.suckers=new THREE.InstancedMesh(suckerGeo,cupMaterial,arm.layout.length);arm.suckers.frustumCulled=false;arm.suckers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);squid.add(arm.suckers);
  arm.toothRings=new THREE.InstancedMesh(toothRingGeometry,toothRingMaterial,arm.layout.length);arm.toothRings.frustumCulled=false;arm.toothRings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);squid.add(arm.toothRings);
  if(long){arm.knobs=new THREE.InstancedMesh(knobGeo,suckerMaterial,arm.knobLayout.length);arm.knobs.frustumCulled=false;squid.add(arm.knobs);}
  arms.push(arm);
}
const center=new THREE.Vector3(),next=new THREE.Vector3();
function armFrame(arm,u,t){
  armPoint(arm,u,t,center);armPoint(arm,u+.001,t,next);axis.subVectors(next,center).normalize();
  inward.set(-Math.cos(arm.angle),0,-Math.sin(arm.angle));
  normal.copy(inward).addScaledVector(axis,-inward.dot(axis)).normalize();binormal.crossVectors(axis,normal).normalize();
}
function radius(arm,u){
  if(!arm.long)return .212*Math.pow(Math.max(0,1-u),1.02)+.009;
  const club=Math.exp(-Math.pow((u-.907)/.066,4));
  const terminal=1-THREE.MathUtils.smoothstep(u,.958,1);
  return (.057+club*.095)*terminal+.005;
}
function width(arm,u,r){return arm.long?r*(1+.72*Math.exp(-Math.pow((u-.907)/.066,4))):r*.94;}
function placeSurface(arm,u,angle,t,scale){
  armFrame(arm,u,t);const r=radius(arm,u),w=width(arm,u,r);
  dummy.position.copy(center).addScaledVector(normal,Math.cos(angle)*r).addScaledVector(binormal,Math.sin(angle)*w);
  tmp.copy(normal).multiplyScalar(Math.cos(angle)/r).addScaledVector(binormal,Math.sin(angle)/w).normalize();
  dummy.quaternion.setFromUnitVectors(up,tmp);dummy.scale.setScalar(scale);dummy.updateMatrix();
}
function updateArms(t){for(const arm of arms){const p=arm.mesh.geometry.attributes.position;
  for(let j=0;j<=segments;j++){const u=j/segments;armFrame(arm,u,t);const r=radius(arm,u),w=width(arm,u,r);for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2;tmp.copy(center).addScaledVector(normal,Math.cos(a)*r).addScaledVector(binormal,Math.sin(a)*w);p.setXYZ(j*(sides+1)+k,tmp.x,tmp.y,tmp.z);}}
  p.needsUpdate=true;arm.mesh.geometry.computeVertexNormals();
  for(let i=0;i<arm.layout.length;i++){const {u,angle,scale}=arm.layout[i];placeSurface(arm,u,angle,t,scale);arm.suckers.setMatrixAt(i,dummy.matrix);arm.toothRings.setMatrixAt(i,dummy.matrix);}
  arm.suckers.instanceMatrix.needsUpdate=true;arm.toothRings.instanceMatrix.needsUpdate=true;
  if(arm.knobs){for(let i=0;i<arm.knobLayout.length;i++){const {u,angle}=arm.knobLayout[i];placeSurface(arm,u,angle,t,.55);arm.knobs.setMatrixAt(i,dummy.matrix);}arm.knobs.instanceMatrix.needsUpdate=true;}
}}

// Suspended marine snow and broad, feathered shafts of light.
const particles=3200,positions=new Float32Array(particles*3),colors=new Float32Array(particles*3);
for(let i=0;i<particles;i++){positions[i*3]=(random()-.5)*100;positions[i*3+1]=(random()-.5)*75;positions[i*3+2]=(random()-.5)*85;const c=.35+random()*.5;colors.set([c*.62,c*.86,c],i*3);}
const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(positions,3));pg.setAttribute('color',new THREE.BufferAttribute(colors,3));
const pm=new THREE.ShaderMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},illumination:{value:1},pixelRatio:{value:renderer.getPixelRatio()}},vertexShader:`uniform float time;uniform float pixelRatio;varying vec3 vColor;varying float vFade;void main(){vColor=color;vec3 p=position;p.y=mod(p.y+37.5+time*.09,75.)-37.5;p.x+=sin(time*.08+p.y*.2)*.4;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(30./-mv.z,1.,3.)*pixelRatio;vFade=clamp(1.-length(mv.xyz)/90.,0.,1.);}`,fragmentShader:`uniform float illumination;varying vec3 vColor;varying float vFade;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vColor,pow(1.-r,2.)*vFade*.55*illumination);}`});scene.add(new THREE.Points(pg,pm));
const beams=new THREE.Group();scene.add(beams);
const beamMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{strength:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float strength;varying vec2 vUv;void main(){float edge=pow(sin(vUv.x*3.14159),3.);float fade=pow(vUv.y,.6);gl_FragColor=vec4(.18,.55,.65,edge*fade*strength);}`});
for(let i=0;i<8;i++){const beam=new THREE.Mesh(new THREE.PlaneGeometry(1.6+random()*2.2,65),beamMaterial);beam.position.set(-15+i*5,13,-13-random()*12);beam.rotation.z=-.25;beams.add(beam);}
// A distant scattering of small fish gives the animal a sense of scale.
const fish=new THREE.Group();const fishMat=new THREE.MeshStandardMaterial({color:0x15343d,roughness:1});
for(let i=0;i<26;i++){const f=new THREE.Mesh(new THREE.ConeGeometry(.055,.35,3),fishMat);f.rotation.z=-Math.PI/2;f.position.set((random()-.5)*35,(random()-.5)*16,-16-random()*12);f.scale.setScalar(.6+random());fish.add(f);}scene.add(fish);

let viewMode='overview',resumeAfterInspection=false;
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,t=0,last=performance.now(),lightOn=true;
function updateMotionUI(){$('motion-icon').innerHTML=paused?'<svg viewBox="0 0 20 20" width="18" height="18"><path d="M5 3l11 7-11 7z" fill="none" stroke="currentColor"/></svg>':'<svg viewBox="0 0 20 20" width="18" height="18"><path d="M6 4v12M14 4v12" stroke="currentColor" stroke-width="2"/></svg>';$('motion').querySelector('.control-label').textContent=paused?'Play':'Pause';$('motion').setAttribute('aria-label',paused?'Play animation':'Pause animation');}updateMotionUI();
$('motion').onclick=()=>{paused=!paused;updateMotionUI();};
$('light').onclick=()=>{lightOn=!lightOn;$('light').setAttribute('aria-pressed',String(lightOn));$('illumination-status').textContent=lightOn?'ROV FLOODLIGHTS · ON':'ROV LIGHT OFF · NEAR DARKNESS';};
function finishBeakView(){
  if(viewMode==='beak'){paused=!resumeAfterInspection;updateMotionUI();}
  document.body.classList.remove('beak-view');$('beak-panel').hidden=true;
  $('beak-view').setAttribute('aria-pressed','false');camera.up.set(0,1,0);
}
function resetCamera(){if(sub?.active){sub.reset();return;}finishBeakView();viewMode='overview';controls.enableDamping=false;controls.update();camera.position.copy(home);controls.target.copy(target);controls.update();controls.enableDamping=true;$('inspect').setAttribute('aria-pressed','false');}
$('reset').onclick=()=>{if(phase==='beach')returnDeep();else if(phase==='ocean')resetCamera();};
$('inspect').onclick=()=>{
  if(viewMode==='anatomy'){resetCamera();return;}
  finishBeakView();viewMode='anatomy';const focus=squid.localToWorld(new THREE.Vector3(0,-.7,0));controls.target.copy(focus);camera.position.copy(focus).add(new THREE.Vector3(7.5,2,10));controls.update();$('inspect').setAttribute('aria-pressed','true');
};
function frameBeak(){
  squid.updateMatrixWorld(true);
  const mobile=innerWidth<700;
  const focus=beak.root.localToWorld(new THREE.Vector3(0,mobile?-.1:0,.06));
  const eye=beak.root.localToWorld(mobile?new THREE.Vector3(.44,.38,1.85):new THREE.Vector3(.48,.3,1.12));
  camera.up.copy(new THREE.Vector3(0,1,0).transformDirection(beak.root.matrixWorld));
  camera.position.copy(eye);controls.target.copy(focus);controls.update();
}
$('beak-view').onclick=()=>{
  if(viewMode==='beak'){resetCamera();return;}
  resumeAfterInspection=!paused;paused=true;updateMotionUI();viewMode='beak';
  document.body.classList.add('beak-view');$('beak-panel').hidden=false;
  $('beak-view').setAttribute('aria-pressed','true');$('inspect').setAttribute('aria-pressed','false');frameBeak();
};
$('beak-back').onclick=resetCamera;
$('jaw-opening').oninput=e=>{const value=Number(e.target.value);beak.setGape(value/100);$('jaw-value').textContent=value+'%';};
let sunlight=0;

function setDepth(depth){
  $('depth-value').textContent=depth;
  sunlight=depth>=1000?0:Math.exp(-(depth-200)/85);
  const c=new THREE.Color().lerpColors(new THREE.Color(0x010407),new THREE.Color(0x08212c),sunlight);
  scene.fog.color.copy(c);renderer.setClearColor(c);scene.fog.density=.018;
  ambient.intensity=.002+sunlight*.5;beamMaterial.uniforms.strength.value=sunlight*.035;
  renderer.toneMappingExposure=1.4;
  $('zone-name').textContent=depth>=1000?'THE MIDNIGHT ZONE':'THE TWILIGHT ZONE';
}
$('depth').oninput=e=>setDepth(Number(e.target.value));setDepth(Number($('depth').value));
let audioContext,gain,noise;
$('sound').onclick=async()=>{try{if(!audioContext){audioContext=new (window.AudioContext||window.webkitAudioContext)();const buffer=audioContext.createBuffer(1,audioContext.sampleRate*4,audioContext.sampleRate);const data=buffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.018)/1.018;data[i]=brown*3.5;}noise=audioContext.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=260;gain=audioContext.createGain();gain.gain.value=0;noise.connect(filter).connect(gain).connect(audioContext.destination);noise.start();}await audioContext.resume();const active=$('sound').getAttribute('aria-pressed')!=='true';gain.gain.setTargetAtTime(active?.65:0,audioContext.currentTime,.4);$('sound').setAttribute('aria-pressed',String(active));}catch{$('sound').title='Audio is unavailable in this browser';}};
$('about').onclick=()=>$('notes').showModal();$('close-notes').onclick=()=>$('notes').close();$('notes').onclick=e=>{if(e.target===$('notes')){const r=$('notes').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('notes').close();}};
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(innerWidth<700){home.set(8,1.5,37);target.set(.3,-2.2,0);}else{home.set(7,1.5,32);target.set(-3.8,-3.6,0);}if(viewMode==='beak')frameBeak();else if(!sub?.active){camera.up.set(0,1,0);camera.position.copy(home);controls.target.copy(target);}}
addEventListener('resize',resize);resize();updateArms(0);
// Triple-tap is attached only to the canvas; interface buttons never count.
renderer.domElement.tabIndex=0;
renderer.domElement.setAttribute('role','button');
renderer.domElement.setAttribute('aria-label','Giant squid. Tap three times, or press Enter three times, for an island barbecue surprise. Drag to orbit.');
const tapRay=new THREE.Raycaster(),tapPointer=new THREE.Vector2();
const tapTargets=[mantle,head,...fins.map(f=>f.mesh),...arms.map(a=>a.mesh),beak.lips];
function hitSquid(x,y){
  camera.updateMatrixWorld();squid.updateMatrixWorld(true);
  const rect=renderer.domElement.getBoundingClientRect();
  const hitAt=(px,py)=>{tapPointer.set((px-rect.left)/rect.width*2-1,-(py-rect.top)/rect.height*2+1);tapRay.setFromCamera(tapPointer,camera);return tapRay.intersectObjects(tapTargets,false).length>0;};
  if(hitAt(x,y))return true;
  // A small tolerance helps fingers hit a slender arm without making the sea clickable.
  return innerWidth<700&&[[7,0],[-7,0],[0,7],[0,-7]].some(([dx,dy])=>hitAt(x+dx,y+dy));
}
function setBeachTheme(){
  if(beachTheme)return;beachTheme=true;document.body.classList.add('beach-mode');
  document.title='ABYSS — The Island Detour';document.querySelector('.brand>span').textContent='THE ISLAND DETOUR';
  $('illumination-status').textContent='SEA BREEZE · CHARCOAL FIRE';
  document.querySelector('.interaction-hint').textContent='ILLUSTRATED ISLAND DETOUR';
  document.querySelector('footer>span:first-child').innerHTML='<i></i> ILLUSTRATED VIEW';
  renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.tabIndex=-1;
}
function restoreOceanView(){
  phase='ocean';controls.enabled=true;
  if(returnView?.sub){
    sub.setActive(true);camera.position.copy(returnView.position);camera.quaternion.copy(returnView.quaternion);
  }else resetCamera();
  returnView=null;
}
async function startTransformation(){
  if(phase!=='ocean')return;
  returnView={sub:sub?.active,position:camera.position.clone(),quaternion:camera.quaternion.clone()};
  sub?.setActive(false);phase='transition';transitionStart=0;controls.enabled=false;
  document.body.classList.add('transforming');$('ocean').setAttribute('aria-busy','true');
  $('tap-status').textContent='THE GRILL IS WARMING…';
  try{await islandImage.decode();}catch{
    if(!running)return;
    restoreOceanView();document.body.classList.remove('transforming');$('ocean').removeAttribute('aria-busy');tapping.reset();
    $('tap-status').textContent='THE BEACH COULD NOT LOAD · TAP TO TRY AGAIN';return;
  }
  if(!running)return;
  transitionStart=performance.now();
}
const tapping=installTripleTap(renderer.domElement,{
  hit:hitSquid,isEnabled:()=>running&&phase==='ocean',onComplete:startTransformation,
  onProgress:count=>{if(phase!=='ocean')return;document.querySelectorAll('#tap-cue i').forEach((el,i)=>el.classList.toggle('lit',i<count));$('tap-status').textContent=count===0?'TAP THE SQUID 3×':count===1?'1 / 3 · KEEP TAPPING':count===2?'2 / 3 · ONE MORE…':'ISLAND MAGIC…';},
});
function returnDeep(){
  if(phase!=='beach')return;
  beachTheme=false;document.body.classList.remove('beach-mode','transforming');
  document.title='ABYSS — A Giant Squid Encounter';document.querySelector('.brand>span').textContent='DEEP SEA OBSERVATORY';
  $('illumination-status').textContent=lightOn?'ROV FLOODLIGHTS · ON':'ROV LIGHT OFF · NEAR DARKNESS';
  document.querySelector('.interaction-hint').innerHTML=oceanHint;
  document.querySelector('footer>span:first-child').innerHTML='<i></i> LIVE SIMULATION';
  renderer.domElement.removeAttribute('aria-hidden');renderer.domElement.tabIndex=0;
  setDepth(Number($('depth').value));restoreOceanView();tapping.reset();
  renderer.domElement.focus({preventScroll:true});
}
$('return-deep').onclick=returnDeep;
function animate(now){
  if(!running)return;
  requestAnimationFrame(animate);const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(elapsed,.05);last=now;
  if(phase==='transition'){
    if(!transitionStart)return;
    const duration=reducedMotion?300:900,p=Math.min(1,(now-transitionStart)/duration);
    $('transition-veil').style.opacity=String(Math.sin(Math.PI*p));
    if(p>=.5)setBeachTheme();
    if(p>=1){phase='beach';document.body.classList.remove('transforming');$('transition-veil').style.opacity='0';$('ocean').removeAttribute('aria-busy');$('return-deep').focus({preventScroll:true});}
    return;
  }
  // Retain the ocean's resources for returning, but do no GPU work on the beach.
  if(phase==='beach')return;
  if(!paused){t+=dt;updateArms(t);squid.position.y=1.3+Math.sin(t*.52)*.09;squid.rotation.y=-.72+Math.sin(t*.16)*.045;const pulse=1-Math.pow(Math.max(0,Math.sin(t*1.2)),4)*.022;mantle.scale.set(pulse,1,pulse);for(const f of fins){const p=f.mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=(i%(f.M+1))/f.M,u=Math.floor(i/(f.M+1))/f.N;p.setZ(i,f.base[i*3+2]+Math.sin(u*4-t*1.2)*v*.075);}p.needsUpdate=true;f.mesh.geometry.computeVertexNormals();}pm.uniforms.time.value=t;fish.position.x=Math.sin(t*.035)*8;}
  const fade=1-Math.exp(-elapsed*7),lampPower=470*Math.pow(camera.position.distanceTo(viewMode==='beak'?controls.target:squid.position)/29,1.4);torch.intensity=THREE.MathUtils.lerp(torch.intensity,lightOn?lampPower:0,fade);key.intensity=THREE.MathUtils.lerp(key.intensity,lightOn?.65:0,fade);rim.intensity=THREE.MathUtils.lerp(rim.intensity,lightOn?.12:0,fade);key.position.copy(camera.position);rim.position.copy(camera.position).add(new THREE.Vector3(-3,1,0));torch.position.copy(camera.position);if(sub?.active)torch.target.position.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(15));else if(viewMode==='beak')torch.target.position.copy(controls.target);else torch.target.position.copy(squid.position).add(new THREE.Vector3(-1,-3,0));pm.uniforms.illumination.value=(torch.intensity/lampPower)*.8+sunlight*.2;if(!sub?.active)controls.update();renderer.render(scene,camera);
}
// Pilot independently of the orbit camera; keep the lamp aligned with the viewport.
const flightDirection=new THREE.Vector3(),flightRight=new THREE.Vector3(),flightRotation=new THREE.Euler(0,0,0,'YXZ');
function subFocus(part){
  const stations={whole:{at:[0,-10,0],eye:[8,-3,34]},eye:{at:[.5,-.4,.2],eye:[3.7,.1,4]},mantle:{at:[0,2.5,0],eye:[4,3.5,7]},arms:{at:[0,-3.5,0],eye:[4,-3,10]}};
  const station=stations[part]||stations.whole;squid.updateMatrixWorld(true);
  camera.position.copy(squid.localToWorld(new THREE.Vector3(...station.eye)));
  camera.up.set(0,1,0);camera.lookAt(squid.localToWorld(new THREE.Vector3(...station.at)));
}
sub=installSubmersible({surface:renderer.domElement,available:()=>running&&phase==='ocean',
  enter(){finishBeakView();controls.enabled=false;viewMode='sub';camera.fov=58;camera.updateProjectionMatrix();torch.angle=.48;subFocus('whole');},
  leave(){controls.enabled=true;viewMode='overview';camera.fov=43;camera.updateProjectionMatrix();torch.angle=.64;resetCamera();},
  focus:subFocus,
  look(dx,dy){flightRotation.setFromQuaternion(camera.quaternion,'YXZ');flightRotation.y-=dx*.003;flightRotation.x=THREE.MathUtils.clamp(flightRotation.x-dy*.003,-1.35,1.35);camera.quaternion.setFromEuler(flightRotation);},
  move(direction,dt){
    camera.getWorldDirection(flightDirection);flightRight.set(1,0,0).applyQuaternion(camera.quaternion);
    const delta=new THREE.Vector3();const speed=4*dt;
    if(direction==='forward'||direction==='back')delta.copy(flightDirection).multiplyScalar(direction==='forward'?speed:-speed);
    if(direction==='left'||direction==='right')delta.copy(flightRight).multiplyScalar(direction==='right'?speed:-speed);
    if(direction==='up'||direction==='down')delta.y=direction==='up'?speed:-speed;
    const next=camera.position.clone().add(delta);
    // Keep flight outside a conservative envelope around the mantle and head.
    const local=squid.worldToLocal(next.clone()),bodyY=THREE.MathUtils.clamp(local.y,-1,5.3);
    if(Math.hypot(local.x,local.y-bodyY,local.z)<1.6)return;
    if(next.distanceTo(squid.position)<55)camera.position.copy(next);
  },
  readout(){camera.getWorldDirection(flightDirection);return {depth:Math.round(Number($('depth').value)-(camera.position.y-squid.position.y)/2.6)+' M',range:'HEAD RANGE '+(camera.position.distanceTo(squid.position)/2.6).toFixed(1)+' M',heading:'HDG '+String(Math.round((Math.atan2(flightDirection.x,-flightDirection.z)*180/Math.PI+360)%360)).padStart(3,'0')+'°'};}
});
requestAnimationFrame(animate);$('loading').classList.add('ready');
function dispose(){if(!running)return;running=false;sub?.dispose();controls.dispose();tapping.reset();removeEventListener('resize',resize);try{audioContext?.close();}catch{}renderer.dispose();}
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();dispose();window.dispatchEvent(new Event('abyss:usefallback'));},{once:true});
window.__abyss={mode:'webgl',sub,dispose,scene,camera,renderer,arms,mantle,eyes,fins,funnel,torch,beamMaterial,beak,controls,squid,get phase(){return phase;},get beach(){return island;}};
