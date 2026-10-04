import * as THREE from 'three';
import {materialMaps} from './textures.js';

// A distant, unmarked naval silhouette: industrial geometry, almost no light.
export function createSubmarine(scene){
 const group=new THREE.Group();group.position.set(-2,14,-37);group.rotation.set(.025,.22,-.035);scene.add(group);
 const skin=new THREE.MeshStandardMaterial({color:'#b5c6c9',emissive:'#0b1c23',emissiveIntensity:.35,...materialMaps('shell',117),bumpScale:.035,metalness:.38,roughness:.84,fog:false});
 const edge=new THREE.MeshStandardMaterial({color:'#263b40',metalness:.55,roughness:.7,fog:false});
 const dark=new THREE.MeshBasicMaterial({color:'#020609',fog:false});
 const profile=[[-16,.05],[-15,.35],[-13,.8],[-11,1.6],[-9,2.05],[-6,2.13],[5,2.13],[9,1.98],[12,1.55],[14,.8],[14.7,.05]].map(([x,r])=>new THREE.Vector2(r,x));
 const hull=new THREE.Mesh(new THREE.LatheGeometry(profile,64),skin);hull.rotation.z=-Math.PI/2;group.add(hull);
 const sailShape=new THREE.Shape();sailShape.moveTo(-4,1.6);sailShape.lineTo(-3.8,4.7);sailShape.quadraticCurveTo(-3.7,5.3,-3.1,5.3);sailShape.lineTo(-.2,5.3);sailShape.quadraticCurveTo(.7,5.25,.8,4.6);sailShape.lineTo(1,1.6);sailShape.closePath();
 const sail=new THREE.Mesh(new THREE.ExtrudeGeometry(sailShape,{depth:1.15,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.12,bevelThickness:.12}),skin);sail.position.z=-.575;group.add(sail);
 function box(x,y,z,w,h,d,mat=edge){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m);return m;}
 function cylinder(x,y,z,r,height){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,height,10),edge);m.position.set(x,y,z);group.add(m);return m;}
 cylinder(-2.6,6.25,0,.055,2);cylinder(-1.8,5.9,.15,.09,1.45);box(-1.65,6.6,.15,.4,.13,.14);cylinder(-3.2,5.9,-.15,.04,1.3);
 // Swept control planes and a shrouded propulsor keep the silhouette recognizable.
 const finShape=new THREE.Shape();finShape.moveTo(-13,-.4);finShape.lineTo(-14.2,4.1);finShape.lineTo(-12.3,3.9);finShape.lineTo(-10.2,-.4);finShape.closePath();
 const finGeo=new THREE.ExtrudeGeometry(finShape,{depth:.16,bevelEnabled:false});
 for(let k=0;k<4;k++){const fin=new THREE.Mesh(finGeo,skin);fin.rotation.x=k*Math.PI/2;group.add(fin);}
 for(const side of [-1,1]){const plane=box(-1,2.1,side*2.1,3,.18,2.7);plane.rotation.y=side*.2;}
 const shroud=new THREE.Mesh(new THREE.TorusGeometry(.86,.13,12,40),edge);shroud.rotation.y=Math.PI/2;shroud.position.x=-15.8;group.add(shroud);
 for(let i=0;i<5;i++){const blade=box(-15.8,0,0,.08,1.3,.17);blade.rotation.x=i*Math.PI/5;}
 for(const x of [-8,-4,3,8]){const band=new THREE.Mesh(new THREE.TorusGeometry(2.135,.013,5,48),edge);band.position.x=x;band.rotation.y=Math.PI/2;group.add(band);}
 for(let i=0;i<7;i++)box(2+i*.36,-.3,2.113,.11,.42,.015,dark);
 for(const x of [3,6,9]){const hatch=new THREE.Mesh(new THREE.TorusGeometry(.37,.035,6,24),edge);hatch.rotation.x=Math.PI/2;hatch.position.set(x,2.13,0);group.add(hatch);}
 // A nearly extinguished red marker; no theatrical beams or illuminated windows.
 const marker=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color:'#6b211c',fog:false}));marker.position.set(-.15,5.2,.72);group.add(marker);
 const grazingLight=new THREE.PointLight('#688b95',600,35,2);grazingLight.position.set(0,8,8);group.add(grazingLight);
 return {group,update(t){group.position.x=-2+Math.sin(t*.012)*1.2;group.position.y=14+Math.sin(t*.025)*.12;}};
}
