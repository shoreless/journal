import * as THREE from 'three';
import {materialMaps} from './textures.js';
export function createBenthos(parent,terrain,halo,random,glowTexture){
 const shell=new THREE.MeshStandardMaterial({color:'#c0bba4',...materialMaps('shell',11),bumpScale:.075,roughness:.86});
 const flesh=new THREE.MeshStandardMaterial({color:'#b9a5b3',...materialMaps('skin',29),bumpScale:.045,roughness:.6});
 const bone=new THREE.MeshStandardMaterial({color:'#c5c7a1',...materialMaps('shell',34),bumpScale:.025,roughness:.72});
 const limbGeometry=new THREE.CylinderGeometry(.028,.043,1,6),clawGeometry=new THREE.ConeGeometry(.027,1,5);
 const darkness=new THREE.MeshBasicMaterial({color:'#010405'}),bulbMat=new THREE.MeshBasicMaterial({color:'#f3d59c'}),animals=[];
 function ellipsoid(group,mat,x,y,z,sx,sy,sz){const geo=new THREE.SphereGeometry(1,24,18),p=geo.attributes.position;for(let i=0;i<p.count;i++){const a=p.getX(i),b=p.getY(i),c=p.getZ(i),r=1+.035*Math.sin(a*17+b*11)*Math.cos(c*19-b*9);p.setXYZ(i,a*r,b*r,c*r);}geo.computeVertexNormals();const uv=geo.attributes.uv,ox=random(),oy=random(),zoom=.75+random()*.5;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*zoom+ox,uv.getY(i)*zoom+oy);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);group.add(m);return m;}
 function tube(group,points,mat,r=.03){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,18,r,5,false),mat);group.add(mesh);return mesh;}
 function needle(group,root,tip,r=.028){const a=new THREE.Vector3(...root),b=new THREE.Vector3(...tip),m=new THREE.Mesh(new THREE.ConeGeometry(r,a.distanceTo(b),5),bone);m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());group.add(m);}
 function crawler(x,z,size,phase){const g=new THREE.Group();g.position.set(x,terrain(x,z)+.88,z);g.scale.setScalar(size);g.rotation.y=.62+phase*.16;parent.add(g);const legs=[],plates=[];
  for(let i=0;i<8;i++){const q=i/7,cx=-1.1+q*3.5,cy=Math.sin(q*Math.PI)*.32;const plate=ellipsoid(g,i%3===0?flesh:shell,cx,cy,0,.46,.5-q*.22,.55-q*.3);plate.rotation.z=.14*Math.sin(i*2+phase);plate.rotation.x=.12*Math.cos(i*3);plates.push({plate,y:cy,angle:plate.rotation.z,index:i});for(let side of [-1,1]){needle(g,[cx,cy+.28,side*.18],[cx+.5,cy+.85-q*.4,side*(.42+random()*.22)],.065);if(i<7){const joint=new THREE.Group();joint.position.set(cx,cy-.1,side*.25);g.add(joint);const upper=new THREE.Mesh(limbGeometry,shell),lower=new THREE.Mesh(limbGeometry,shell),claw=new THREE.Mesh(clawGeometry,bone);joint.add(upper,lower,claw);legs.push({joint,upper,lower,claw,side,phase:i*.83+(side<0?Math.PI:0)});}}}
  ellipsoid(g,flesh,-1.65,.05,0,.67,.6,.59);ellipsoid(g,darkness,-2.26,.03,0,.105,.48,.47);
  const lip=[];for(let i=0;i<=36;i++){const a=i/36*Math.PI*2;lip.push([-2.31+.035*Math.cos(a*3),.03+Math.sin(a)*.5,Math.cos(a)*.49]);}tube(g,lip,flesh,.057);
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2,q=i%2?.34:.14;needle(g,[-2.34,.03+Math.sin(a)*.45,Math.cos(a)*.44],[-2.42-random()*.1,.03+Math.sin(a)*q,Math.cos(a)*q],.024+random()*.012);}
  for(let k=0;k<3;k++)ellipsoid(g,bone,-1.86+k*.14,.37+k*.065,.45,.045,.055,.04);
  const lure=new THREE.Group();lure.position.set(-1.25,.55,0);g.add(lure);tube(lure,[[0,0,0],[-.12,.9,.05],[-.95,1.6,.12],[-1.82,1.2,.16],[-1.96,.77,.12]],flesh,.035);
  const bulb=ellipsoid(lure,bulbMat,-1.96,.77,.12,.095,.14,.075),aura=halo('#e8d6a3',1.2,-1.96,.77,.12,.5);lure.add(aura);
  if(phase===0){const light=new THREE.PointLight('#e7d3a1',6,5,2);light.position.copy(bulb.position);lure.add(light);}
  animals.push({group:g,legs,plates,lure,aura,x,z,phase,size,type:'crawler'});
 }
 function siltmouth(x,z,size,phase){const g=new THREE.Group();g.position.set(x,terrain(x,z)+.46,z);g.scale.setScalar(size);g.rotation.y=-.5;parent.add(g);const body=ellipsoid(g,flesh,0,0,0,1.9,.42,.56),p=body.geometry.attributes.position;for(let i=0;i<p.count;i++){const f=1+.09*Math.sin(p.getX(i)*35);p.setY(i,p.getY(i)*f);p.setZ(i,p.getZ(i)*f);}body.geometry.computeVertexNormals();
  ellipsoid(g,darkness,-1.8,.04,0,.14,.3,.4);const legs=[],filaments=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const filament=new THREE.Group();filament.position.set(-1.8,.04+Math.sin(a)*.25,Math.cos(a)*.3);g.add(filament);tube(filament,[[0,0,0],[-.35,Math.sin(a)*.25,Math.cos(a)*.3],[-.9,Math.sin(a)*.45,Math.cos(a)*.45],[-1.4,0,Math.cos(a)*.5]],flesh,.025);filaments.push({filament,phase:a});needle(g,[-1.91,.04+Math.sin(a)*.25,Math.cos(a)*.28],[-2.06,.04+Math.sin(a)*.1,Math.cos(a)*.12],.018);}
  for(let i=0;i<9;i++)for(const side of [-1,1]){tube(g,[[-1+i*.27,-.1,side*.35],[-.9+i*.27,-.35,side*.65],[-1.2+i*.27,-.42,side*.8]],shell,.025);if(i%2===0)ellipsoid(g,shell,-1+i*.27,.33,side*.14,.14,.21+random()*.15,.14);}
  animals.push({group:g,legs,body,bodyBase:p.array.slice(),filaments,x,z,phase,size,type:'siltmouth'});
 }
 crawler(3,3,1.05,0);crawler(-5,-5,.68,2);crawler(7,-14,.83,4);siltmouth(7,-2,.9,1);siltmouth(-4,-16,1.1,3);
 // Small foraging circuits stay away from the Riftia beds and doorway.
 const circuits=[[[3,3],[1,2.8],[-.8,1],[-.2,-1],[2,-.5],[4,1.3]],[[-5,-5],[-6,-3],[-8,-4],[-7,-7],[-5,-8]],[[7,-14],[5,-15],[6,-19],[9,-18],[10,-15]],[[7,-2],[9,0],[11,-1],[10,-4],[8,-5]],[[-4,-16],[-7,-15],[-8,-18],[-5,-21],[-3,-18]]];
 const tau=Math.PI*2,up=new THREE.Vector3(0,1,0),origin=new THREE.Vector3(),foot=new THREE.Vector3(),knee=new THREE.Vector3(),ankle=new THREE.Vector3(),tip=new THREE.Vector3(),direction=new THREE.Vector3(),point=new THREE.Vector3(),tangent=new THREE.Vector3();
 // Almost-continuous foraging: 10.8 seconds moving, a 1.2 second pause,
 // and short eased starts/stops. Distance, rather than time, drives each step.
 function clockAt(a,time){return Math.max(0,time+a.phase*1.1+1.5);}
 function travel(a,time){
  const clock=clockAt(a,time),cycle=Math.floor(clock/12),u=clock%12,ramp=.4;let d;
  if(u<ramp){const q=u/ramp;d=ramp*(q**3-.5*q**4);}
  else if(u<10.4)d=u-ramp*.5;
  else if(u<10.8){const q=(u-10.4)/ramp;d=10.2+ramp*(q-q**3+.5*q**4);}
  else d=10.4;
  return (cycle*10.4+d)*a.pace;
 }
 function speed(a,time){const u=clockAt(a,time)%12;return u<.4?THREE.MathUtils.smoothstep(u,0,.4):u<10.4?1:u<10.8?1-THREE.MathUtils.smoothstep(u,10.4,10.8):0;}
 function locate(a,distance,target){return a.path.getPointAt(((distance/a.length)%1+1)%1,target);}
 function bonePose(mesh,a,b){direction.copy(b).sub(a);mesh.position.copy(a).addScaledVector(direction,.5);mesh.scale.y=direction.length();mesh.quaternion.setFromUnitVectors(up,direction.normalize());}
 for(let i=0;i<animals.length;i++){
  const a=animals[i];a.path=new THREE.CatmullRomCurve3(circuits[i].map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal');a.length=a.path.getLength();a.pace=a.type==='crawler'?.72+i*.035:.4+(i-3)*.035;a.start=travel(a,0);
 }
 const planted=new THREE.Vector3(),landing=new THREE.Vector3(),stepTangent=new THREE.Vector3();
 function footfall(a,l,distance,out){
  locate(a,distance,out);a.path.getTangentAt(((distance/a.length)%1+1)%1,stepTangent);
  const yaw=Math.atan2(stepTangent.z,-stepTangent.x),x=(l.joint.position.x-.24)*a.size,z=l.side*1.09*a.size;
  out.x+=Math.cos(yaw)*x+Math.sin(yaw)*z;out.z+=-Math.sin(yaw)*x+Math.cos(yaw)*z;out.y=terrain(out.x,out.z)+.035*a.size;return out;
 }
 const dustCount=animals.length*24,dustPositions=new Float32Array(dustCount*3),dustColors=new Float32Array(dustCount*3),dustGeometry=new THREE.BufferGeometry();
 dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3).setUsage(THREE.DynamicDrawUsage));dustGeometry.setAttribute('color',new THREE.BufferAttribute(dustColors,3).setUsage(THREE.DynamicDrawUsage));
 const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({map:glowTexture,color:'#94a298',size:.23,transparent:true,opacity:.19,vertexColors:true,depthWrite:false}));dust.frustumCulled=false;parent.add(dust);
 return {animals,update(t,glow){
  for(let index=0;index<animals.length;index++){
   const a=animals[index],distance=travel(a,t)-a.start,activity=speed(a,t),gait=distance/a.size/.9*tau;
   locate(a,distance,point);a.path.getTangentAt(((distance/a.length)%1+1)%1,tangent);
   const yaw=Math.atan2(tangent.z,-tangent.x),height=terrain(point.x,point.z),forwardSlope=(terrain(point.x+tangent.x*.7,point.z+tangent.z*.7)-terrain(point.x-tangent.x*.7,point.z-tangent.z*.7))/1.4;
   const sideX=Math.sin(yaw),sideZ=Math.cos(yaw),sideSlope=(terrain(point.x+sideX*.6,point.z+sideZ*.6)-terrain(point.x-sideX*.6,point.z-sideZ*.6))/1.2;
   a.group.position.set(point.x,height+(a.type==='crawler'?.94:.47)*a.size+Math.sin(gait*2)*activity*.018,point.z);
   a.group.rotation.set(-Math.atan(sideSlope),yaw,-Math.atan(forwardSlope),'YXZ');a.group.updateMatrixWorld(true);
   for(const l of a.legs){
    const q=((gait+l.phase)/tau%1+1)%1,stance=q<2/3,step=stance?q*1.5:(q-2/3)*3,eased=step*step*(3-2*step);
    const stride=.9*a.size,touchdown=distance-q*stride;
    footfall(a,l,touchdown,planted);foot.copy(planted);
    if(!stance){footfall(a,l,touchdown+stride,landing);foot.lerp(landing,eased);foot.y=terrain(foot.x,foot.z)+(.035+Math.sin(step*Math.PI)*.32)*a.size;}
    a.group.worldToLocal(foot);foot.sub(l.joint.position);
    knee.set(foot.x*.35+.25,foot.y*.4+.12,l.side*.68);ankle.copy(foot);ankle.y+=.12;
    bonePose(l.upper,origin,knee);bonePose(l.lower,knee,ankle);tip.copy(foot);bonePose(l.claw,ankle,tip);
   }
   if(a.plates)for(const p of a.plates){p.plate.position.y=p.y+Math.sin(gait*.6-p.index*.65)*.075*activity;p.plate.rotation.z=p.angle+Math.sin(gait*.6-p.index*.65)*.085*activity;}
   if(a.lure){a.lure.rotation.z=Math.sin(t*.56+a.phase)*.15+Math.sin(gait)*.035*activity;a.lure.rotation.x=Math.sin(t*.34+a.phase)*.12;a.aura.material.opacity=glow*(.32+.17*Math.sin(t*.65+a.phase));}
   if(a.body){
    const vertices=a.body.geometry.attributes.position,base=a.bodyBase;
    for(let i=0;i<vertices.count;i++){const x=base[i*3],y=base[i*3+1],z=base[i*3+2],wave=Math.sin(x*5-gait*.75+a.phase),strength=.4+activity*.3;vertices.setXYZ(i,x*(1+.035*wave*strength),y*(1+.09*wave*strength),z+Math.sin(x*4-gait*.65)*.09*strength);}
    vertices.needsUpdate=true;a.body.geometry.computeVertexNormals();
    for(const f of a.filaments){f.filament.rotation.y=Math.sin(t*.8+f.phase)*.14;f.filament.rotation.z=Math.cos(t*.65+f.phase)*.13;}
   }
   // Short-lived, nonluminous silt drifts away from recent footfalls.
   for(let i=0;i<24;i++){
    const age=((t*.23+i*.618+index*.17)%1)*4.35,past=t-age,d=travel(a,Math.max(0,past))-a.start;locate(a,d,point);
    const side=i%2?-1:1,spread=(.65+i%3*.12)*a.size;point.x+=side*sideX*spread+Math.sin(i*3+age)*age*.06;point.z+=side*sideZ*spread+age*.065;
    const n=(index*24+i)*3;dustPositions[n]=point.x;dustPositions[n+1]=terrain(point.x,point.z)+.09+age*.075;dustPositions[n+2]=point.z;
    const fade=past<0?0:Math.sin(age/4.35*Math.PI)*Math.min(speed(a,past),1)*.7;dustColors[n]=fade;dustColors[n+1]=fade;dustColors[n+2]=fade;
   }
  }
  dustGeometry.attributes.position.needsUpdate=true;dustGeometry.attributes.color.needsUpdate=true;
 }};
}
