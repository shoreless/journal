import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDistantLights} from '../distant-lights.js';
// The tests exercise motion and visibility; rasterization belongs to browser QA.
globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
function setup(){const root=new THREE.Scene(),lights=createDistantLights(root,()=>-10,new THREE.Texture()),group=root.getObjectByName('distant-lights');return {lights,group,geometry:group.children[0].geometry};}
const camera=()=>new THREE.Vector3(0,81,22);
function energy(geometry){return geometry.attributes.color.array.slice(0,12).reduce((a,b)=>a+b,0);}
test('lights echo translation after a delay, remain bounded, and respect pause and glow',()=>{
 const a=setup(),b=setup(),moving=camera(),still=camera();
 for(let frame=0;frame<=20;frame++){const t=frame*.05;moving.x=t*3;a.lights.update(t,1,moving,true);b.lights.update(t,1,still,true);}
 assert.deepEqual(a.geometry.attributes.position.array,b.geometry.attributes.position.array);
 for(let frame=21;frame<=100;frame++){const t=frame*.05;moving.x=Math.min(t*3,9);a.lights.update(t,1,moving,true);b.lights.update(t,1,still,true);}
 const offset=a.geometry.attributes.position.getX(0)-b.geometry.attributes.position.getX(0);assert(offset>.1&&offset<=3.5);
 const positions=a.geometry.attributes.position.array.slice(),brightness=energy(a.geometry);a.lights.update(5,.2,moving,true);assert.deepEqual(a.geometry.attributes.position.array,positions);assert(Math.abs(energy(a.geometry)/brightness-.2)<1e-5);
 a.lights.update(5,1,moving,false);assert.equal(a.group.visible,false);a.lights.update(5,1,moving,true);assert.equal(a.group.visible,true);
});
test('approaching extinguishes lights; backing away leaves a lingering dark interval',()=>{
 const a=setup(),p=camera(),start=p.clone(),near=new THREE.Vector3(-5,79,-12);
 a.lights.update(0,1,p,true);assert(energy(a.geometry)>1);
 for(let frame=1;frame<=160;frame++){const t=frame*.05;p.copy(start).lerp(near,Math.min(t/4,1));a.lights.update(t,1,p,true);}
 assert(energy(a.geometry)<.04);
 for(let frame=161;frame<=220;frame++){const t=frame*.05;p.copy(near).lerp(start,(t-8)/3);a.lights.update(t,1,p,true);}
 assert(energy(a.geometry)<.01);
 for(let frame=221;frame<=560;frame++)a.lights.update(frame*.05,1,p,true);
 assert(energy(a.geometry)>.5);assert(a.geometry.attributes.position.array.every(Number.isFinite));
});
