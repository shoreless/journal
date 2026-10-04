import * as THREE from 'three';
import {materialMaps} from './textures.js';
export function createBenthos(parent,terrain,halo,random){
 const shell=new THREE.MeshStandardMaterial({color:'#c0bba4',...materialMaps('shell',11),bumpScale:.075,roughness:.86});
 const flesh=new THREE.MeshStandardMaterial({color:'#b9a5b3',...materialMaps('skin',29),bumpScale:.045,roughness:.6});
 const bone=new THREE.MeshStandardMaterial({color:'#c5c7a1',...materialMaps('shell',34),bumpScale:.025,roughness:.72});
 const darkness=new THREE.MeshBasicMaterial({color:'#010405'}),bulbMat=new THREE.MeshBasicMaterial({color:'#f3d59c'}),animals=[];
 function ellipsoid(group,mat,x,y,z,sx,sy,sz){const geo=new THREE.SphereGeometry(1,24,18),p=geo.attributes.position;for(let i=0;i<p.count;i++){const a=p.getX(i),b=p.getY(i),c=p.getZ(i),r=1+.035*Math.sin(a*17+b*11)*Math.cos(c*19-b*9);p.setXYZ(i,a*r,b*r,c*r);}geo.computeVertexNormals();const uv=geo.attributes.uv,ox=random(),oy=random(),zoom=.75+random()*.5;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*zoom+ox,uv.getY(i)*zoom+oy);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);group.add(m);return m;}
 function tube(group,points,mat,r=.03){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,18,r,5,false),mat);group.add(mesh);return mesh;}
 function needle(group,root,tip,r=.028){const a=new THREE.Vector3(...root),b=new THREE.Vector3(...tip),m=new THREE.Mesh(new THREE.ConeGeometry(r,a.distanceTo(b),5),bone);m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());group.add(m);}
 function crawler(x,z,size,phase){const g=new THREE.Group();g.position.set(x,terrain(x,z)+.88,z);g.scale.setScalar(size);g.rotation.y=.62+phase*.16;parent.add(g);const legs=[];
  for(let i=0;i<8;i++){const q=i/7,cx=-1.1+q*3.5,cy=Math.sin(q*Math.PI)*.32;const plate=ellipsoid(g,i%3===0?flesh:shell,cx,cy,0,.46,.5-q*.22,.55-q*.3);plate.rotation.z=.14*Math.sin(i*2+phase);plate.rotation.x=.12*Math.cos(i*3);for(let side of [-1,1]){needle(g,[cx,cy+.28,side*.18],[cx+.5,cy+.85-q*.4,side*(.42+random()*.22)],.065);if(i<7){const joint=new THREE.Group();joint.position.set(cx,cy-.1,side*.25);g.add(joint);tube(joint,[[0,0,0],[.15,.05,side*.38],[.42,-.43,side*.67],[.06,-.88,side*.82]],shell,.037);needle(joint,[.06,-.88,side*.82],[-.23,-.98,side*.88],.032);legs.push({joint,side,phase:i*.8+side});}}}
  ellipsoid(g,flesh,-1.65,.05,0,.67,.6,.59);ellipsoid(g,darkness,-2.26,.03,0,.105,.48,.47);
  const lip=[];for(let i=0;i<=36;i++){const a=i/36*Math.PI*2;lip.push([-2.31+.035*Math.cos(a*3),.03+Math.sin(a)*.5,Math.cos(a)*.49]);}tube(g,lip,flesh,.057);
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2,q=i%2?.34:.14;needle(g,[-2.34,.03+Math.sin(a)*.45,Math.cos(a)*.44],[-2.42-random()*.1,.03+Math.sin(a)*q,Math.cos(a)*q],.024+random()*.012);}
  for(let k=0;k<3;k++)ellipsoid(g,bone,-1.86+k*.14,.37+k*.065,.45,.045,.055,.04);
  const lure=new THREE.Group();lure.position.set(-1.25,.55,0);g.add(lure);tube(lure,[[0,0,0],[-.12,.9,.05],[-.95,1.6,.12],[-1.82,1.2,.16],[-1.96,.77,.12]],flesh,.035);
  const bulb=ellipsoid(lure,bulbMat,-1.96,.77,.12,.095,.14,.075),aura=halo('#e8d6a3',1.2,-1.96,.77,.12,.5);lure.add(aura);
  if(phase===0){const light=new THREE.PointLight('#e7d3a1',6,5,2);light.position.copy(bulb.position);lure.add(light);}
  animals.push({group:g,legs,lure,aura,x,z,phase,size,type:'crawler'});
 }
 function siltmouth(x,z,size,phase){const g=new THREE.Group();g.position.set(x,terrain(x,z)+.46,z);g.scale.setScalar(size);g.rotation.y=-.5;parent.add(g);const body=ellipsoid(g,flesh,0,0,0,1.9,.42,.56),p=body.geometry.attributes.position;for(let i=0;i<p.count;i++){const f=1+.09*Math.sin(p.getX(i)*35);p.setY(i,p.getY(i)*f);p.setZ(i,p.getZ(i)*f);}body.geometry.computeVertexNormals();
  ellipsoid(g,darkness,-1.8,.04,0,.14,.3,.4);const legs=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2;tube(g,[[-1.8,.04+Math.sin(a)*.25,Math.cos(a)*.3],[-2.15,.04+Math.sin(a)*.5,Math.cos(a)*.6],[-2.7,.04+Math.sin(a)*.7,Math.cos(a)*.75],[-3.2,.04+Math.sin(a)*.25,Math.cos(a)*.8]],flesh,.025);needle(g,[-1.91,.04+Math.sin(a)*.25,Math.cos(a)*.28],[-2.06,.04+Math.sin(a)*.1,Math.cos(a)*.12],.018);}
  for(let i=0;i<9;i++)for(const side of [-1,1]){tube(g,[[-1+i*.27,-.1,side*.35],[-.9+i*.27,-.35,side*.65],[-1.2+i*.27,-.42,side*.8]],shell,.025);if(i%2===0)ellipsoid(g,shell,-1+i*.27,.33,side*.14,.14,.21+random()*.15,.14);}
  animals.push({group:g,legs,x,z,phase,size,type:'siltmouth'});
 }
 crawler(3,3,1.05,0);crawler(-5,-5,.68,2);crawler(7,-14,.83,4);siltmouth(7,-2,.9,1);siltmouth(-4,-16,1.1,3);
 return {animals,update(t,glow){for(const a of animals){a.group.position.x=a.x+Math.sin(t*.1+a.phase)*.26;a.group.position.y=terrain(a.group.position.x,a.z)+(a.type==='crawler'?.88:.46);for(const l of a.legs){l.joint.rotation.x=Math.sin(t*.95+l.phase)*.1*l.side;l.joint.rotation.y=Math.cos(t*.95+l.phase)*.08;}if(a.lure){a.lure.rotation.z=Math.sin(t*.42+a.phase)*.09;a.lure.rotation.x=Math.sin(t*.27+a.phase)*.08;a.aura.material.opacity=glow*(.32+.17*Math.sin(t*.65+a.phase));}}}};
}
