import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGuidance} from '../guidance.js';
const terrain=(x,z)=>-10+Math.pow(Math.abs(x)/13,2.1)*8+Math.sin(z*.15+x*.27)*2.2+Math.sin(x*.66+z*.35)*1.1+Math.sin(z*1.2+x*.77)*.3;
function setup(){const scene=new THREE.Scene(),door=new THREE.Vector3(-.7,terrain(-.7,-9),-9);const guidance=createGuidance(scene,terrain,new THREE.Texture(),door);return {guidance,motes:scene.children[0],door};}
test('guidance connects the entry to the door without gaps or buried motes',()=>{
 const {guidance,motes,door}=setup();
 for(const time of [0,10,40]){
  guidance.update(time,1,true);const p=motes.geometry.attributes.position;
  assert(p.getY(0)>78);const end=new THREE.Vector3().fromBufferAttribute(p,p.count-1);assert(end.distanceTo(door)<2.5);
  for(let i=0;i<p.count;i++){
   const point=new THREE.Vector3().fromBufferAttribute(p,i);assert(point.toArray().every(Number.isFinite));assert(point.y>terrain(point.x,point.z)+.4);
   if(i)assert(point.distanceTo(new THREE.Vector3().fromBufferAttribute(p,i-1))<3);
  }
 }
});
test('guidance respects visibility, motion pause, and the light control',()=>{
 const {guidance,motes}=setup();assert.equal(motes.visible,false);
 guidance.update(3,1,true);const positions=Array.from(motes.geometry.attributes.position.array),colors=Array.from(motes.geometry.attributes.color.array);
 guidance.update(3,1,true);assert.deepEqual(Array.from(motes.geometry.attributes.position.array),positions);assert.deepEqual(Array.from(motes.geometry.attributes.color.array),colors);
 guidance.update(3,.2,true);const dim=motes.geometry.attributes.color.array;assert(dim.reduce((a,v)=>a+v,0)<colors.reduce((a,v)=>a+v,0)*.21);
 guidance.update(4,1,false);assert.equal(motes.visible,false);
});
