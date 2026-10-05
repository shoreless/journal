import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBenthos} from '../benthos.js';
import {createPelagic} from '../pelagic.js';
const terrain=(x,z)=>-10+Math.pow(Math.abs(x)/13,2.1)*8+Math.sin(z*.15+x*.27)*2.2+Math.sin(x*.66+z*.35)*1.1+Math.sin(z*1.2+x*.77)*.3;
const halo=()=>new THREE.Sprite(new THREE.SpriteMaterial());
function random(){let seed=732;return ()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);}
function pose(root){root.updateMatrixWorld(true);const values=[];root.traverse(o=>{values.push(...o.matrixWorld.elements);if(o.geometry)values.push(...o.geometry.attributes.position.array);});return values;}
function finite(root){root.updateMatrixWorld(true);root.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));if(!o.geometry)return;for(const a of Object.values(o.geometry.attributes))assert(a.array.every(Number.isFinite));if(o.geometry.index)assert(o.geometry.index.array.every(i=>i>=0&&i<o.geometry.attributes.position.count));});}
test('benthic animals traverse the floor with grounded feet and freeze with Motion',()=>{
 const root=new THREE.Group(),benthos=createBenthos(root,terrain,halo,random(),new THREE.Texture());
 benthos.update(0,1);const initial=benthos.animals.map(a=>a.group.position.clone());
 benthos.update(10,1);for(let i=0;i<initial.length;i++)assert(benthos.animals[i].group.position.distanceTo(initial[i])>.5);
 const moving=pose(root);benthos.update(10,.2);assert.deepEqual(pose(root),moving);
 for(const time of [0,7,18,70,600]){
  benthos.update(time,1);finite(root);
  for(const a of benthos.animals){assert(a.group.position.y>terrain(a.group.position.x,a.group.position.z));for(const l of a.legs){const tip=new THREE.Vector3(0,.5,0).applyMatrix4(l.claw.matrixWorld);assert(tip.y>terrain(tip.x,tip.z)-.2);}}
 }
});
test('pelagic hunters stay in the passage and animate without invalid geometry',()=>{
 const root=new THREE.Group();root.position.y=80;const pelagic=createPelagic(root,halo);
 pelagic.update(0,1);const initial=pose(root);
 for(const time of [8,60,600]){pelagic.update(time,1);finite(root);for(const animal of root.children){const p=animal.getWorldPosition(new THREE.Vector3());assert(p.y>20&&p.y<60);}}
 assert.notDeepEqual(pose(root),initial);const stopped=pose(root);pelagic.update(600,.2);assert.deepEqual(pose(root),stopped);
});

test('fish travel several body widths and face their swimming direction',()=>{
 const root=new THREE.Group(),pelagic=createPelagic(root,halo);
 pelagic.update(0,1);const initial=pelagic.animals.map(a=>a.g.position.clone());
 pelagic.update(6,1);pelagic.animals.forEach((a,i)=>assert(a.g.position.distanceTo(initial[i])>4));
 for(const t of [1,7,22,48]){
  pelagic.update(t,1);const positions=pelagic.animals.map(a=>a.g.position.clone()),forwards=pelagic.animals.map(a=>new THREE.Vector3(0,0,1).applyQuaternion(a.g.quaternion));
  pelagic.update(t+.05,1);pelagic.animals.forEach((a,i)=>{const velocity=a.g.position.clone().sub(positions[i]);assert(velocity.length()>.045);assert(velocity.normalize().dot(forwards[i])>.98);});
 }
});
test('crawlies advance immediately and stance feet stay planted as their bodies move',()=>{
 const root=new THREE.Group(),benthos=createBenthos(root,terrain,halo,random(),new THREE.Texture());
 benthos.update(0,1);const initial=benthos.animals.map(a=>a.group.position.clone());
 benthos.update(2,1);benthos.animals.forEach((a,i)=>assert(a.group.position.distanceTo(initial[i])>.6));
 benthos.update(3,1);root.updateMatrixWorld(true);const crawler=benthos.animals[0],feet=crawler.legs.map(l=>new THREE.Vector3(0,.5,0).applyMatrix4(l.claw.matrixWorld));
 const position=crawler.group.position.clone();benthos.update(3.04,1);root.updateMatrixWorld(true);assert(crawler.group.position.distanceTo(position)>.02);
 const planted=crawler.legs.filter((l,i)=>new THREE.Vector3(0,.5,0).applyMatrix4(l.claw.matrixWorld).distanceTo(feet[i])<1e-6);assert(planted.length>=6);
});
