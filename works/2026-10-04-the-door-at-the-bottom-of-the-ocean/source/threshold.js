import * as THREE from 'three';
import {materialMaps} from './textures.js';
export function createThreshold(parent,terrain){
 const group=new THREE.Group(),x=-.7,z=-9,base=terrain(x,z);group.position.set(x,base,z);parent.add(group);
 const wood=new THREE.MeshStandardMaterial({color:'#b9c0a7',...materialMaps('wood',81),bumpScale:.035,roughness:.83});
 const trim=new THREE.MeshStandardMaterial({color:'#d2c6a6',...materialMaps('wood',42),bumpScale:.025,roughness:.9});
 const brass=new THREE.MeshStandardMaterial({color:'#998562',metalness:.68,roughness:.57});
 const stone=new THREE.MeshStandardMaterial({color:'#777b70',...materialMaps('ground',91),bumpScale:.045,roughness:1});
 const glowMat=new THREE.MeshBasicMaterial({color:'#ead8ad',toneMapped:false});
 let boxIndex=0;function box(g,w,h,d,px,py,pz,material){const geo=new THREE.BoxGeometry(w,h,d),uv=geo.attributes.uv;boxIndex++;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*(.7+boxIndex%3*.17)+boxIndex*.237,uv.getY(i)*(.7+boxIndex%4*.13)+boxIndex*.419);const m=new THREE.Mesh(geo,material);m.position.set(px,py,pz);g.add(m);return m;}
 box(group,2.15,.16,1.1,0,.04,0,stone);
 for(const side of [-1,1]){box(group,.17,3.12,.28,side*.84,1.64,0,trim);box(group,.23,3.22,.09,side*.86,1.65,.19,trim);}
 box(group,1.94,.2,.32,0,3.2,0,trim);box(group,1.58,.07,.29,0,.18,0,trim);
 // The frame has no wall; its interior does not show the water behind it.
 const voidMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{time:{value:0},open:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;uniform float open;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec2 p=vUv*vec2(28.,46.);vec2 cell=floor(p);vec2 f=fract(p)-.5;float star=pow(max(0.,1.-length(f)*4.),6.)*step(.965,hash(cell));float breath=.65+.35*sin(time*.23+cell.y);vec3 col=vec3(.002,.004,.005)+vec3(.17,.24,.18)*star*breath*open;gl_FragColor=vec4(col,1.);}`});
 const abyss=new THREE.Mesh(new THREE.PlaneGeometry(1.52,2.93),voidMat);abyss.position.set(0,1.67,-.13);group.add(abyss);
 const hinge=new THREE.Group();hinge.position.set(-.735,.2,.08);group.add(hinge);
 box(hinge,1.47,2.87,.11,.735,1.435,0,wood);
 // Six ordinary recessed panels make its human origin unmistakable.
 for(const py of [.56,1.42,2.28])for(const px of [.39,1.08]){box(hinge,.49,.62,.03,px,py,.067,trim);box(hinge,.40,.53,.035,px,py,.09,wood);}
 box(hinge,.11,.28,.027,1.31,1.3,.082,brass);const knob=new THREE.Mesh(new THREE.SphereGeometry(.052,16,12),brass);knob.position.set(1.31,1.33,.15);hinge.add(knob);
 box(group,.018,2.92,.02,.747,1.66,.11,glowMat);box(group,1.49,.018,.04,0,.21,.14,glowMat);
 const light=new THREE.PointLight('#ead2a4',3,9,2);light.position.set(0,1.0,.65);group.add(light);
 let opened=false,response=0,elapsed=0;const center=new THREE.Vector3(x,base+1.5,z);
 return {group,center,position:new THREE.Vector3(x,base,z),get opened(){return opened;},get angle(){return hinge.rotation.y;},knock(){opened=!opened;response=0;return opened;},update(dt,t,glow){elapsed+=dt;response+=dt;const target=opened&&response>1.25?.78:0;hinge.rotation.y=THREE.MathUtils.lerp(hinge.rotation.y,target,1-Math.exp(-dt*1.1));const answer=opened&&response<1.2?Math.pow(Math.max(0,Math.sin(response*16)),12):0;light.intensity=(2.5+answer*4+Math.sin(t*.4)*.3)*glow;voidMat.uniforms.time.value=t;voidMat.uniforms.open.value=hinge.rotation.y*2;},distance(point){return center.distanceTo(point);},collide(point,previous){if(hinge.rotation.y>.3)return;const localX=point.x-x;if(Math.abs(localX)<.92&&point.y>base&&point.y<base+3.3&&Math.abs(point.z-z)<.36)point.z=z+(previous.z>=z?.36:-.36);}};
}
