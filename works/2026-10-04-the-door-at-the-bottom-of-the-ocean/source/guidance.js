import * as THREE from 'three';
import {WATER_HEIGHT} from './ocean-depth.js';

// A loose current of living light, rather than a drawn line or navigation marker.
export function createGuidance(scene,terrain,glowTexture,door){
  const landing=new THREE.Vector3(1,terrain(1,13)+1.4,13);
  const descent=new THREE.CatmullRomCurve3([
    new THREE.Vector3(1,WATER_HEIGHT+1,15),
    new THREE.Vector3(1.5,WATER_HEIGHT-1,10),
    new THREE.Vector3(3,WATER_HEIGHT-12,9),
    new THREE.Vector3(-2,WATER_HEIGHT-30,6),
    new THREE.Vector3(2.5,28,11),
    new THREE.Vector3(.5,10,16),
    landing
  ]);
  const approach=new THREE.CatmullRomCurve3([
    landing,
    new THREE.Vector3(-1.6,terrain(-1.6,7)+1.1,7),
    new THREE.Vector3(-2.5,terrain(-2.5,0)+1.1,0),
    new THREE.Vector3(door.x,terrain(door.x,door.z+4)+1.1,door.z+4),
    new THREE.Vector3(door.x,door.y+1.1,door.z+1.25)
  ]);
  const path=new THREE.CurvePath();path.add(descent);path.add(approach);
  const count=190,positions=new Float32Array(count*3),colors=new Float32Array(count*3);
  const bases=[],phases=[],fractions=[],cool=new THREE.Color('#91b9ad'),warm=new THREE.Color('#c4bea0'),tint=new THREE.Color();
  const hash=n=>{const v=Math.sin(n*127.1+37.2)*43758.5453;return v-Math.floor(v);};
  for(let i=0;i<count;i++){
    const u=(i+.15+hash(i)*.7)/count,p=path.getPointAt(u);
    p.x+=(hash(i+count)-.5)*.75;p.z+=(hash(i+count*2)-.5)*.55;
    p.y=Math.max(p.y,terrain(p.x,p.z)+.9);
    bases.push(p);phases.push(hash(i+count*3)*Math.PI*2);fractions.push(u);
    p.toArray(positions,i*3);
  }
  const geometry=new THREE.BufferGeometry();
  const position=new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage);
  const color=new THREE.BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position',position);geometry.setAttribute('color',color);geometry.computeBoundingSphere();
  const material=new THREE.PointsMaterial({map:glowTexture,size:.38,vertexColors:true,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false});
  const motes=new THREE.Points(geometry,material);motes.visible=false;scene.add(motes);
  return {update(time,glow,active){
    motes.visible=active;if(!active)return;
    for(let i=0;i<count;i++){
      const p=bases[i],phase=phases[i],u=fractions[i];
      positions[i*3]=p.x+Math.sin(time*.23+phase)*.12;
      positions[i*3+1]=p.y+Math.sin(time*.19+phase)*.1;
      positions[i*3+2]=p.z+Math.cos(time*.17+phase)*.08;
      // A slow brightening travels toward the door; the rest remains legible.
      const pulse=Math.pow(.5+.5*Math.cos(u*Math.PI*10-time*.6),8);
      const edge=THREE.MathUtils.smoothstep(u,0,.008)*(1-THREE.MathUtils.smoothstep(u,.97,1));
      tint.copy(cool).lerp(warm,THREE.MathUtils.smoothstep(u,.72,1));
      tint.multiplyScalar((.38+.30*pulse)*(.75+.25*Math.sin(phase)**2)*edge*Math.min(glow,1.5));
      tint.toArray(colors,i*3);
    }
    position.needsUpdate=true;color.needsUpdate=true;
  }};
}
