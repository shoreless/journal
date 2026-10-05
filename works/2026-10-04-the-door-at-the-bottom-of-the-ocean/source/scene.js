import * as THREE from 'three';
import {WATER_HEIGHT,soundingAt,habitatAt} from './ocean-depth.js';
import {createCabin} from './cabin.js';
import {bindJournal} from './journal.js';
import {createSubmarine} from './submarine.js';
import {materialMaps} from './textures.js';
import {createBenthos} from './benthos.js';
import {createRiftia} from './riftia.js';
import {createPelagic} from './pelagic.js';
import {createThreshold} from './threshold.js';
import {createGuidance} from './guidance.js';
import {createDistantLights} from './distant-lights.js';
import {FreeNavigation} from './navigation.js';
import {createVeil,animateVeil} from './creatures.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const $=s=>document.querySelector(s),canvas=$('#ocean');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){$('#loading').innerHTML='<p>This ocean needs WebGL. Try a browser with hardware acceleration enabled.</p>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.background=new THREE.Color('#020b13');scene.fog=new THREE.FogExp2('#020c14',.025);
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,180);camera.position.set(0,1,22);
const composer=new EffectComposer(renderer);const renderPass=new RenderPass(scene,camera);composer.addPass(renderPass);const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.9,.65,.55);composer.addPass(bloom);composer.addPass(new OutputPass());
scene.add(new THREE.AmbientLight('#236578',.38));const moon=new THREE.DirectionalLight('#22768e',1.2);moon.position.set(-8,25,-15);scene.add(moon);
let seed=732;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}const range=(a,b)=>a+rand()*(b-a);
function terrain(x,z){return -10+Math.pow(Math.abs(x)/13,2.1)*8+Math.sin(z*.15+x*.27)*2.2+Math.sin(x*.66+z*.35)*1.1+Math.sin(z*1.2+x*.77)*.3;}
const groundGeo=new THREE.PlaneGeometry(95,150,145,180);groundGeo.rotateX(-Math.PI/2);const gp=groundGeo.attributes.position;const colors=[];for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i)-40;gp.setXYZ(i,x,terrain(x,z),z);const c=new THREE.Color('#b8c7ba').multiplyScalar(.72+.22*Math.sin(x*.53+z*.19)+range(-.05,.05));colors.push(c.r,c.g,c.b);}groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.computeVertexNormals();const sediment=materialMaps('ground',7);for(const texture of Object.values(sediment))texture.repeat.set(22,36);scene.add(new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({vertexColors:true,...sediment,bumpScale:.16,roughness:.98,flatShading:false})));
const rockMaterial=new THREE.MeshStandardMaterial({color:'#7d887e',...materialMaps('ground',23),bumpScale:.11,roughness:1});const rockGeometry=new THREE.DodecahedronGeometry(1,1);const rocks=new THREE.InstancedMesh(rockGeometry,rockMaterial,85),rockPose=new THREE.Object3D();for(let i=0;i<85;i++){const x=range(-18,18),z=range(-85,15);rockPose.position.set(x,terrain(x,z)-.12,z);rockPose.rotation.set(range(0,3),range(0,6),range(0,3));rockPose.scale.set(range(.15,.7),range(.08,.35),range(.2,.65));rockPose.updateMatrix();rocks.setMatrixAt(i,rockPose.matrix);}scene.add(rocks);
const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(220,255,255,1)');g.addColorStop(.08,'rgba(100,255,240,.8)');g.addColorStop(.25,'rgba(30,220,230,.2)');g.addColorStop(1,'rgba(0,120,180,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);})();
function halo(color,size,x,y,z,opacity=.35){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}));s.scale.setScalar(size);s.position.set(x,y,z);return s;}
const veils=[];
function veil(x,y,z,scale,color,phase,ancient=false){veils.push(createVeil(scene,halo,{x,y,z,scale,color,phase,ancient,random:rand}));}
veil(5.8,2.7,0,1.4,'#99c6a8',.5);veil(-2,4,-16,.85,'#7b91ba',3);veil(11,7,-24,1.1,'#9c7baf',1.2);veil(1,-1,-23,.55,'#6eafa2',5);veil(-10,10,-57,7,'#738b83',2,true);
const submarine=createSubmarine(scene);
const waterLife=new THREE.Group();waterLife.position.y=WATER_HEIGHT;scene.add(waterLife);waterLife.add(submarine.group);for(const c of veils)if(!c.ancient)waterLife.add(c.group);
const pelagic=createPelagic(waterLife,halo);
const navigation=new FreeNavigation(camera,canvas,terrain);
const cabin=createCabin();cabin.loadIllustration('./assets/journal-plates.png');let inside=false;
const journal=bindJournal({onOpen:()=>navigation.setEnabled(false),onClose:()=>navigation.setEnabled(immersed)});
export function cabinState(){return {inside,journalOpen:journal.opened,page:journal.page,bookDistance:cabin.distance(camera.position)};}
export function navigationState(){return navigation.snapshot();}
export function presenceState(){return {habitat,sounding:soundingAt(camera.position.y),submarine:submarine.group.visible,ancient:veils.find(c=>c.ancient).group.visible};}
// Slow ribbons of light and scattered life on the canyon floor.
const floorGlows=[];for(let j=0;j<25;j++){const x=range(-24,24),z=range(-75,12),y=terrain(x,z)+.1;const color=rand()>.3?'#31c2d5':'#7470ff';const h=halo(color,range(.3,.8),x,y,z,range(.12,.3));scene.add(h);floorGlows.push(h);}
for(let i=0;i<3;i++){const p=new THREE.PointLight(i===1?'#586cd6':'#1bbfb9',35,25,2);p.position.set(i===0?-13:i===1?18:0,-5,-i*18-5);scene.add(p);}
const count=1100,ps=new Float32Array(count*3),pcolors=new Float32Array(count*3);for(let i=0;i<count;i++){ps[i*3]=range(-55,55);ps[i*3+1]=range(-15,WATER_HEIGHT+40);ps[i*3+2]=range(-90,30);const c=new THREE.Color(rand()>.16?'#548a9e':'#6ee9d8').multiplyScalar(range(.3,1));pcolors.set([c.r,c.g,c.b],i*3);}const particlesGeo=new THREE.BufferGeometry();const particleBases=ps.slice();particlesGeo.setAttribute('position',new THREE.BufferAttribute(ps,3).setUsage(THREE.DynamicDrawUsage));particlesGeo.setAttribute('color',new THREE.BufferAttribute(pcolors,3));const particles=new THREE.Points(particlesGeo,new THREE.PointsMaterial({size:.07,map:glowTex,vertexColors:true,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(particles);
const ribbonGeo=new THREE.BufferGeometry(),rp=[];for(let i=0;i<220;i++){const q=i/219;rp.push(-9+q*14,3+Math.sin(q*6)*1.8,-25+q*2);}ribbonGeo.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));const ribbon=new THREE.Points(ribbonGeo,new THREE.PointsMaterial({color:'#4e95c9',map:glowTex,size:.16,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false}));waterLife.add(ribbon);
let running=!matchMedia('(prefers-reduced-motion: reduce)').matches,immersed=false,glow=1,t=0;
let chartOpen=false;
function setChart(open){const restoreFocus=!open&&$('#station-chart').contains(document.activeElement);chartOpen=open;$('#station-chart').hidden=!open;$('#chart-toggle').setAttribute('aria-expanded',String(open));navigation.setEnabled(immersed&&!open&&!document.querySelector('dialog[open]'));if(open)$('#station-chart .selected').focus();else if(restoreFocus)$('#chart-toggle').focus();}
$('#chart-toggle').onclick=()=>setChart(!chartOpen);
document.addEventListener('pointerdown',e=>{if(chartOpen&&!e.target.closest('#station-chart,#chart-toggle'))setChart(false);});
document.addEventListener('keydown',e=>{if(chartOpen&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();setChart(false);$('#chart-toggle').focus();}},true);
function driftUI(){$('#drift').classList.toggle('active',running);$('#drift').setAttribute('aria-pressed',String(running));$('#drift-label').textContent=running?'RUN':'HELD';}driftUI();$('#drift').onclick=()=>{running=!running;driftUI();};$('#glow').oninput=e=>{glow=+e.target.value;bloom.strength=.9*glow;floorLight.intensity=70*glow;floorFill.intensity=35*glow;};
function immerse(value){setChart(false);immersed=value;$('.intro').inert=value;document.body.classList.toggle('immersed',value);$('#flight-controls').setAttribute('aria-hidden',String(!value));navigation.setEnabled(value);if(!value)navigation.reset(habitat);}
$('#immerse').onclick=()=>immerse(true);$('#return').onclick=()=>inside?exitCabin():immerse(false);$('#reset-view').onclick=()=>{if(inside){navigation.clear();navigation.resetZoom();camera.position.set(0,1.65,1.8);navigation.yaw=navigation.pitch=0;navigation.orient();}else navigation.reset(habitat);};
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(e.key==='Escape'){if(inside)exitCabin();else immerse(false);}if(e.target.matches('input,button,a'))return;if(e.code==='Space'){e.preventDefault();running=!running;driftUI();}});
$('#about').onclick=()=>{setChart(false);navigation.setEnabled(false);$('#notes').showModal();};$('#notes').addEventListener('close',()=>navigation.setEnabled(immersed));$('#close-notes').onclick=()=>$('#notes').close();$('#notes').onclick=e=>{if(e.target===$('#notes')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('#fullscreen').title='Fullscreen is not available in this browser';}};
let audioCtx,audioGain,ambientFilter,sound=false;$('#sound').onclick=async()=>{try{if(!audioCtx){audioCtx=new AudioContext();audioGain=audioCtx.createGain();audioGain.gain.value=0;audioGain.connect(audioCtx.destination);const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*5,audioCtx.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.025)/1.025;data[i]=last*4;}const noise=audioCtx.createBufferSource();noise.buffer=buffer;noise.loop=true;const low=audioCtx.createBiquadFilter();ambientFilter=low;low.type='lowpass';low.frequency.value=inside?550:250;noise.connect(low);low.connect(audioGain);noise.start();for(const freq of [37,55.3,74.4]){const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.frequency.value=freq;gain.gain.value=.025;osc.connect(gain);gain.connect(audioGain);osc.start();}}await audioCtx.resume();sound=!sound;audioGain.gain.setTargetAtTime(sound?(inside?.16:.28):0,audioCtx.currentTime,.8);$('#sound-label').textContent=sound?'ON':'OFF';$('#sound').classList.toggle('active',sound);$('#sound').setAttribute('aria-pressed',String(sound));}catch{$('#sound-label').textContent='N/A';}};
window.addEventListener('resize',()=>{navigation.clear();camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});

// Fictional benthic forms use mottled chitin, folded tissues and angler-like lures.
let habitat='water';const floorLife=new THREE.Group();scene.add(floorLife);
const benthos=createBenthos(floorLife,terrain,halo,rand,glowTex);
const riftia=createRiftia(floorLife,terrain,glowTex);
const threshold=createThreshold(floorLife,terrain);
const guidance=createGuidance(scene,terrain,glowTex,threshold.position);
const distantLights=createDistantLights(scene,terrain,glowTex);
const previousPosition=new THREE.Vector3();
export function thresholdState(){return {opened:threshold.opened,angle:threshold.angle,distance:threshold.distance(camera.position),position:threshold.position.toArray(),visible:floorLife.visible};}
$('#read-journal').onclick=()=>{if(inside&&cabin.distance(camera.position)<3.2)journal.open();};
$('#enter-door').onclick=()=>{if(habitat==='floor'&&threshold.angle>.3&&threshold.distance(camera.position)<7)enterCabin();};
$('#knock').onclick=()=>{if(habitat!=='floor'||!immersed||threshold.distance(camera.position)>7)return;navigation.clear();const opened=threshold.knock();$('#knock').textContent=opened?'Close':'Knock';};
$('#seek-door').onclick=()=>{setHabitat('floor');$('#floor').classList.remove('selected');$('#floor').setAttribute('aria-pressed','false');$('#seek-door').classList.add('selected');$('#seek-door').setAttribute('aria-pressed','true');immerse(true);navigation.clear();camera.position.copy(threshold.center).add(new THREE.Vector3(0,.15,5.5));navigation.yaw=0;navigation.pitch=0;navigation.orient();};
const floorLight=new THREE.PointLight('#b0c8a0',70,26,2);floorLight.position.set(2,-3,7);floorLife.add(floorLight);const floorFill=new THREE.PointLight('#8a7198',35,25,2);floorFill.position.set(-6,-3,-8);floorLife.add(floorFill);
const memory=halo('#7cbfc0',4,0,0,0,0);scene.add(memory);canvas.addEventListener('dblclick',e=>{memory.position.set(0,0,0);const point=new THREE.Vector3(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1,.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(12).add(camera.position);memory.position.copy(point);memory.scale.setScalar(2);memory.material.opacity=.24;});
function setInteriorMode(value){inside=value;navigation.mode=value?'walk':'swim';renderPass.scene=value?cabin.scene:scene;document.body.classList.toggle('in-cabin',value);$('#return').textContent=value?'Return':'Leave';driftUI();if(audioCtx&&sound){audioGain.gain.setTargetAtTime(value?.16:.28,audioCtx.currentTime,.8);ambientFilter.frequency.setTargetAtTime(value?550:250,audioCtx.currentTime,.8);}}
function enterCabin(){if(inside)return;setInteriorMode(true);immerse(true);navigation.clear();navigation.resetZoom();camera.position.set(0,1.65,1.8);navigation.yaw=0;navigation.pitch=-.04;navigation.orient();$('#temperature').textContent='18.4';$('#pressure').textContent='1.0';}
function exitCabin(){if(!inside)return;setInteriorMode(false);setHabitat('floor');immerse(true);navigation.clear();camera.position.copy(threshold.center).add(new THREE.Vector3(0,.15,1.3));navigation.yaw=Math.PI;navigation.pitch=0;navigation.orient();}
function markHabitat(next){
 habitat=next;document.body.classList.toggle('on-floor',next==='floor');
 for(const id of ['water','floor','seek-door']){const selected=id===next;$('#'+id).classList.toggle('selected',selected);$('#'+id).setAttribute('aria-pressed',String(selected));}
}
function setHabitat(next){setChart(false);if(inside)setInteriorMode(false);markHabitat(next);navigation.reset(next);}
$('#water').onclick=()=>setHabitat('water');$('#floor').onclick=()=>setHabitat('floor');setHabitat('water');

const clock=new THREE.Clock();let ready=false;function animate(){requestAnimationFrame(animate);const elapsed=clock.getDelta(),delta=Math.min(elapsed,.05);if(document.hidden)return;if(running)t+=Math.min(elapsed,.25);previousPosition.copy(camera.position);navigation.update(delta);
if(!inside){const next=habitatAt(camera.position.y,habitat);if(next!==habitat)markHabitat(next);}
if(inside){cabin.constrain(camera.position,previousPosition);if(camera.position.z>3.45)exitCabin();}else if(habitat==='floor'){threshold.collide(camera.position,previousPosition);const door=threshold.position;if(immersed&&threshold.angle>.3&&Math.abs(camera.position.x-door.x)<.75&&camera.position.y>door.y+.2&&camera.position.y<door.y+3.1&&previousPosition.z>door.z+.12&&camera.position.z<=door.z+.12)enterCabin();}
threshold.update(delta,t,glow);cabin.update(t);$('#threshold-action').hidden=inside||!(habitat==='floor'&&immersed&&threshold.distance(camera.position)<7);$('#enter-door').hidden=threshold.angle<=.3;$('#journal-action').hidden=!(inside&&immersed&&cabin.distance(camera.position)<3.2);const sounding=Math.round(soundingAt(camera.position.y));if(!inside){const depthFraction=THREE.MathUtils.clamp((sounding-1800)/9120,0,1);$('#temperature').textContent=(3.2-1.4*depthFraction).toFixed(1);$('#pressure').textContent=Math.round(180+920*depthFraction).toLocaleString('en-US');}$('#depth').textContent=inside?'—':sounding.toLocaleString('en-US');$('#instrument-status').textContent=inside?'—':'DEPTH';$('#depth-needle').setAttribute('transform',`rotate(${inside?-135:THREE.MathUtils.clamp(sounding/11000,0,1)*270-135} 50 50)`);
submarine.update(t);pelagic.update(t,glow);for(const c of veils){animateVeil(c,t,glow);const mobile=innerWidth<600&&c===veils[0];c.group.scale.setScalar(c.scale*(mobile?.72:1));if(mobile){c.group.position.x-=2;c.group.position.y-=3.5;}}
benthos.update(t,glow);riftia.update(t,glow);guidance.update(t,glow,immersed&&!inside);distantLights.update(t,glow,camera.position,immersed&&!inside);memory.material.opacity=Math.max(0,memory.material.opacity-delta*.025);memory.scale.addScalar(delta*.05);for(let i=0;i<count;i++){const n=i*3,x=particleBases[n],y=particleBases[n+1],z=particleBases[n+2],span=WATER_HEIGHT+55;ps[n]=x+Math.sin(y*.07+t*.18)*1.4;ps[n+1]=-15+((y+15-t*(.09+(i%7)*.008))%span+span)%span;ps[n+2]=z+Math.cos(x*.09+t*.13)*.9;}particlesGeo.attributes.position.needsUpdate=true;ribbon.rotation.z=Math.sin(t*.15)*.04;composer.render();if(!ready){ready=true;$('#loading').style.opacity=0;setTimeout(()=>$('#loading').remove(),1100);}}animate();
