import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRiftia} from '../riftia.js';
const terrain=(x,z)=>-10+Math.pow(Math.abs(x)/13,2.1)*8+Math.sin(z*.15+x*.27)*2.2+Math.sin(x*.66+z*.35)*1.1+Math.sin(z*1.2+x*.77)*.3;
test('colonies have renderable finite geometry and valid triangle indices',()=>{
 const root=new THREE.Group(),riftia=createRiftia(root,terrain,new THREE.Texture());
 assert.equal(root.children.length,2);
 for(const time of [0,20,250]){
  riftia.update(time,1);root.updateMatrixWorld(true);
  root.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));if(!o.geometry)return;const g=o.geometry;for(const attr of Object.values(g.attributes))assert(Array.from(attr.array).every(Number.isFinite));if(g.index)assert(Array.from(g.index.array).every(i=>i>=0&&i<g.attributes.position.count));});
 }
});
test('soft crowns move while tubes stay fixed, and pausing keeps the pose',()=>{
 const root=new THREE.Group(),riftia=createRiftia(root,terrain,new THREE.Texture());
 const tubes=root.children.map(c=>c.getObjectByName('riftia-tubes'));
 const crowns=[];root.traverse(o=>{if(o.name==='riftia-gills')crowns.push(o);});assert(crowns.length>0);
 function snapshot(objects){root.updateMatrixWorld(true);return objects.map(o=>o.matrixWorld.toArray());}
 riftia.update(0,1);const fixed=snapshot(tubes),initial=snapshot(crowns);
 riftia.update(10,1);assert.deepEqual(snapshot(tubes),fixed);assert.notDeepEqual(snapshot(crowns),initial);const moving=snapshot(crowns);
 riftia.update(10,.2);assert.deepEqual(snapshot(crowns),moving);root.traverse(o=>{if(o.isPointLight)assert(Math.abs(o.intensity-2.4)<1e-10);});
});
