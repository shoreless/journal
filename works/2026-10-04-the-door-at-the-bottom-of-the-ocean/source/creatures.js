import * as THREE from 'three';

// Soft anatomy, incomplete symmetry: these are fictional pelagic organisms.
export function createVeil(scene,halo,{x,y,z,scale,color,phase,random,ancient=false}) {
  const group=new THREE.Group();group.position.set(x,y,z);group.scale.setScalar(scale);scene.add(group);
  const geo=new THREE.SphereGeometry(1,48,36,0,Math.PI*2,.12,Math.PI*.91);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){const px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i),a=Math.atan2(pz,px);
    const fold=1+.19*Math.sin(a*3+py*2.6+phase)+.11*Math.sin(a*7-py*5);
    pos.setXYZ(i,px*1.45*fold+.32*py*py,py*1.6+.16*Math.sin(a*3)*(1-py*py),pz*.87*fold+.22*Math.sin(py*3));}
  geo.computeVertexNormals();
  const mat=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:phase},tint:{value:new THREE.Color(color)},power:{value:ancient?.16:1}},vertexShader:`varying vec3 vNormal;varying vec3 vView;varying vec3 vPos;uniform float time;void main(){vec3 p=position;float breath=sin(time*.73+p.y*1.3);p.xz*=1.+breath*.085;p.y+=sin(time*.46+p.x*2.)*.11;vPos=p;vec4 mv=modelViewMatrix*vec4(p,1.);vView=-mv.xyz;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying vec3 vNormal;varying vec3 vView;varying vec3 vPos;uniform vec3 tint;uniform float power;uniform float time;void main(){float edge=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.1);float vein=pow(.5+.5*sin(vPos.y*12.+sin(vPos.x*6.)+sin(vPos.z*8.)),22.);float scar=pow(.5+.5*sin(vPos.x*17.+vPos.y*3.+sin(vPos.y*7.)),28.);float silence=.52+.48*smoothstep(-.25,.6,sin(vPos.y*2.7-vPos.x*1.5+time*.28));float stain=smoothstep(-.6,.7,sin(vPos.x*9.+sin(vPos.y*5.))*sin(vPos.z*11.-vPos.y*4.));float pores=fract(sin(dot(floor(vPos*85.),vec3(127.1,311.7,74.7)))*43758.54);float alpha=(.028+edge*.3+vein*.13+scar*.045)*silence*(.58+stain*.42);vec3 col=mix(tint,vec3(.43,.27,.48),smoothstep(-1.,1.,vPos.y)*.36)*(edge*1.5+vein*.8+.23)*power;col*=.65+stain*.3+pores*.05;gl_FragColor=vec4(col,alpha);}`});
  const skin=new THREE.Mesh(geo,mat);group.add(skin);
  const inner=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:'#02070b',side:THREE.DoubleSide}));inner.scale.set(.52,.76,.6);inner.rotation.z=.2;group.add(inner);
  // A displaced inner fold rather than a recognizable stomach or eye.
  const fold=new THREE.Mesh(geo,mat);fold.scale.set(.71,1.02,.69);fold.rotation.set(.2,.5,.3);group.add(fold);
  const tracery=new THREE.Group();group.add(tracery);
  for(let k=0;k<5;k++){const points=[];for(let j=0;j<45;j++){const q=j/44,a=q*4.3+k*1.7;points.push(new THREE.Vector3(Math.cos(a)*(.55+q*.5),-1.2+q*2.5,Math.sin(a)*.42));}tracery.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity:ancient?.04:.19,blending:THREE.AdditiveBlending})));}
  group.add(halo(color,4,0,0,0,ancient?.018:.075));
  const tentacles=[];
  for(let k=0;k<(ancient?15:25);k++){
    const a=k*2.399+phase,root=new THREE.Vector3(Math.cos(a)*.8,-.45-random()*.8,Math.sin(a)*.58),length=2+random()*5.5,spread=(random()-.5)*2.2,major=k<7;
    const steps=35,sides=major?5:1,vertices=new Float32Array(steps*sides*3),indices=[];
    if(major)for(let i=0;i<steps-1;i++)for(let side=0;side<sides;side++){const a=i*sides+side,b=i*sides+(side+1)%sides;indices.push(a,b,a+sides,b,b+sides,a+sides);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(vertices,3));if(major)g.setIndex(indices);
    const m=major?new THREE.MeshBasicMaterial({color,transparent:true,opacity:ancient?.035:.32,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}):new THREE.LineBasicMaterial({color,transparent:true,opacity:ancient?.025:.22,blending:THREE.AdditiveBlending,depthWrite:false});
    const strand=major?new THREE.Mesh(g,m):new THREE.Line(g,m);strand.frustumCulled=false;group.add(strand);
    tentacles.push({strand,root,length,spread,k,sides,steps,a});
    if(k<5){const branch=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(22*3),3)),new THREE.LineBasicMaterial({color,transparent:true,opacity:ancient?.025:.23,blending:THREE.AdditiveBlending,depthWrite:false}));branch.frustumCulled=false;group.add(branch);tentacles[tentacles.length-1].branch=branch;}
  }
  group.rotation.set(.12,phase*.15,-.36+phase*.07);
  const light=new THREE.PointLight(color,ancient?0:8*scale,12*scale,2);group.add(light);
  return {group,mat,tracery,tentacles,light,phase,base:new THREE.Vector3(x,y,z),scale,ancient};
}
export function animateVeil(c,t,glow){const time=t+c.phase;
  c.group.position.x=c.base.x+Math.sin(time*.12)*(c.ancient?.35:.85);c.group.position.y=c.base.y+Math.sin(time*.22)*(c.ancient?.4:.7);c.group.position.z=c.base.z+Math.sin(time*.14)*(c.ancient?.25:.8);
  c.group.rotation.z=-.36+c.phase*.07+Math.sin(time*.15)*.09;c.group.rotation.y=c.phase*.15+Math.sin(time*.11)*.13;c.tracery.rotation.y=Math.sin(time*.09)*.22;
  c.mat.uniforms.time.value=time;c.mat.uniforms.power.value=glow*(c.ancient?.13:1)*(.55+.45*Math.pow(.5+.5*Math.sin(t*.39-c.phase),4));
  for(const ten of c.tentacles){const positions=ten.strand.geometry.attributes.position;
    for(let i=0;i<ten.steps;i++){const q=i/(ten.steps-1),wave=Math.sin(q*6-time*.42+ten.k)*q*.65;
      const x=ten.root.x+q*q*ten.spread+wave,y=ten.root.y-q*ten.length+.28*Math.sin(q*5+time*.3)*q,z=ten.root.z+Math.cos(q*5-time*.35+ten.k)*q*.82;
      for(let side=0;side<ten.sides;side++){const a=side/ten.sides*Math.PI*2,r=ten.sides===1?0:.037*Math.pow(1-q,1.3);positions.setXYZ(i*ten.sides+side,x+Math.cos(a)*r,y,z+Math.sin(a)*r);}
      if(ten.branch&&i===20){const bp=ten.branch.geometry.attributes.position;for(let b=0;b<bp.count;b++){const f=b/(bp.count-1);bp.setXYZ(b,x+f*(ten.k%2?1:-1)+Math.sin(f*5-time*.4)*f*.2,y-f*1.8,z+f*.4);}bp.needsUpdate=true;}
    }positions.needsUpdate=true;ten.strand.material.opacity=(c.ancient?.035:ten.sides===1?.2:.32)*Math.min(glow,1.5);
  }
}
