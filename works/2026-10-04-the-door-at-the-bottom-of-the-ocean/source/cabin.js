import * as THREE from 'three';
import {materialMaps} from './textures.js';

export function createCabin(){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#070b0a');scene.fog=new THREE.FogExp2('#090d0b',.036);
 const steel=new THREE.MeshStandardMaterial({color:'#83918a',...materialMaps('shell',62),bumpScale:.025,roughness:.78,metalness:.42});
 const dark=new THREE.MeshStandardMaterial({color:'#354139',roughness:.85,metalness:.5});
 const brass=new THREE.MeshStandardMaterial({color:'#b19961',roughness:.62,metalness:.65});
 const deck=new THREE.MeshStandardMaterial({color:'#777e73',...materialMaps('ground',50),roughness:.98,bumpScale:.04});
 const paper=new THREE.MeshStandardMaterial({color:'#d4c49e',roughness:1});
 scene.add(new THREE.AmbientLight('#809182',.62));
 function box(x,y,z,w,h,d,mat=steel){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);scene.add(m);return m;}
 const hullMaterial=steel.clone();hullMaterial.side=THREE.BackSide;const hull=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.4,25,24,1,true),hullMaterial);hull.rotation.x=Math.PI/2;hull.position.set(0,1.05,-8);scene.add(hull);
 box(0,-.08,-8,6.6,.16,25,deck);
 for(let z=3;z>=-19;z-=2.2){const rib=new THREE.Mesh(new THREE.TorusGeometry(3.32,.065,6,40),dark);rib.position.set(0,1.05,z);scene.add(rib);for(const side of [-1,1])box(side*2.8,1.05,z,.07,2.1,.13,dark);}
 // Pipes only hint at anatomy: their curves remain plausibly mechanical.
 for(let k=0;k<5;k++){const points=[];for(let i=0;i<24;i++)points.push(new THREE.Vector3(-2.65+k*.12+Math.sin(i*.6+k)*.025,2.8+k*.14+Math.sin(i*.3+k)*.025,4-i));const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.045+k*.009,6,false),k%2?brass:dark);scene.add(m);}
 for(const z of [-1,-8,-15]){box(0,3.5,z,.65,.09,.28,new THREE.MeshBasicMaterial({color:'#bda66b'}));const light=new THREE.PointLight('#d1b77a',14,13,2);light.position.set(0,3.2,z);scene.add(light);}
 // A small watch station, empty except for a book and a cold cup.
 box(1.75,.94,-6,1.95,.12,1.35,dark);for(const x of [1,2.5])for(const z of [-6.45,-5.55])box(x,.45,z,.075,.9,.075,dark);
 box(1.35,1.035,-5.92,.86,.09,.56,new THREE.MeshStandardMaterial({color:'#392f23',roughness:1}));
 const pageLeft=box(1.13,1.093,-5.92,.41,.018,.51,paper),pageRight=box(1.57,1.093,-5.92,.41,.018,.51,paper);pageLeft.rotation.z=-.04;pageRight.rotation.z=.04;
 const bookGlow=new THREE.PointLight('#edcb83',5,4,2);bookGlow.position.set(1.6,1.75,-6);scene.add(bookGlow);
 const lampStem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.6,8),brass);lampStem.position.set(2.35,1.3,-6.3);scene.add(lampStem);const shade=new THREE.Mesh(new THREE.ConeGeometry(.23,.25,20,1,true),new THREE.MeshStandardMaterial({color:'#5c6550',side:THREE.DoubleSide,roughness:.65}));shade.position.set(2.35,1.6,-6.3);scene.add(shade);
 const cup=new THREE.Mesh(new THREE.CylinderGeometry(.075,.065,.15,16,1,true),new THREE.MeshStandardMaterial({color:'#a8aea0',side:THREE.DoubleSide,roughness:.4}));cup.position.set(2.28,1.1,-5.7);scene.add(cup);
 const chair=new THREE.Group();chair.position.set(.9,0,-7.2);chair.rotation.y=.6;scene.add(chair);function chairPart(x,y,z,w,h,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),dark);m.position.set(x,y,z);chair.add(m);}chairPart(0,.5,0,.52,.08,.5);chairPart(0,.85,-.24,.52,.62,.07);for(const x of [-.2,.2])for(const z of [-.2,.2])chairPart(x,.24,z,.05,.48,.05);
 // Dead instruments, one living trace.
 box(-2.8,1.5,-8,.36,1.15,2.5,dark);const screenMat=new THREE.MeshBasicMaterial({color:'#20493e'});box(-2.595,1.58,-8,.02,.48,.72,screenMat);for(let i=0;i<7;i++){const g=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.035,16),brass);g.rotation.z=Math.PI/2;g.position.set(-2.58,1.16+i%3*.28,-8.9+Math.floor(i/3)*.34);scene.add(g);}
 // A sealed bulkhead; the ocean door remains behind the visitor.
 box(0,1.65,-18.6,6.3,3.5,.2,steel);box(0,1.45,-18.43,1.6,2.8,.12,dark);const wheel=new THREE.Mesh(new THREE.TorusGeometry(.23,.025,8,24),brass);wheel.position.set(.45,1.45,-18.32);scene.add(wheel);
 box(-2.25,1.8,4,1.55,3.6,.18,dark);box(2.25,1.8,4,1.55,3.6,.18,dark);box(0,3.1,4,3,1.1,.18,dark);
 const seaMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float time;void main(){vec2 p=vUv*vec2(33.,60.);p.y+=time*.1;vec2 cell=floor(p);float n=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5);float snow=pow(max(0.,1.-length(fract(p)-.5)*5.),5.)*step(.975,n);gl_FragColor=vec4(vec3(.006,.035,.039)+snow*vec3(.1,.24,.2),1.);}' });const sea=new THREE.Mesh(new THREE.PlaneGeometry(3,2.6),seaMat);sea.position.set(0,1.3,4.02);scene.add(sea);const seaLight=new THREE.PointLight('#609b96',7,8,2);seaLight.position.set(0,1.8,3.5);scene.add(seaLight);
 const bookPosition=new THREE.Vector3(1.35,1.1,-5.92);
 return {scene,bookPosition,update(t){seaMat.uniforms.time.value=t;screenMat.color.setRGB(.04,.12+Math.sin(t*.7)*.008,.09);},distance(p){return bookPosition.distanceTo(p);},constrain(p,previous){if(p.x>.6&&p.z>-6.95&&p.z<-5.05){if(previous.x<=.6)p.x=.6;else p.z=previous.z>=-5.05?-5.05:-6.95;}},loadIllustration(url){new THREE.TextureLoader().load(url,texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.repeat.set(1/3,1);pageLeft.material=new THREE.MeshStandardMaterial({map:texture,roughness:1});});}};
}
