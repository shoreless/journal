import * as THREE from 'three';

// Procedural interpretation of Architeuthis upper/lower beak specimen photographs:
// Young, Bolstad & Vecchione, Tree of Life notes 5452 and 5453.
// Coordinates here: +Z oral/anterior, +Y dorsal, X lateral.
export function buildBuccalApparatus(skin) {
  const root = new THREE.Group();
  root.name = 'Buccal apparatus';
  root.position.set(0, -1.145, 0);
  const basis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0)
  );
  root.quaternion.setFromRotationMatrix(basis);

  const flesh = skin.clone();
  flesh.color.set(0xb18174); flesh.roughness = .52;
  const interior = new THREE.MeshBasicMaterial({color:0x080405});
  const tissueProfile = [[.305,-.045],[.31,.015],[.287,.067],[.245,.112],[.202,.116],[.171,.083],[.155,.031],[.153,-.015]];
  const tissueGeo = new THREE.LatheGeometry(new THREE.SplineCurve(tissueProfile.map(p=>new THREE.Vector2(...p))).getPoints(50),128);
  tissueGeo.rotateX(Math.PI/2);
  const tp=tissueGeo.attributes.position;
  for(let i=0;i<tp.count;i++){
    const x=tp.getX(i),y=tp.getY(i),a=Math.atan2(y,x),r=Math.hypot(x,y);
    const fold=Math.sin(a*23+Math.sin(a*7)*.5)*.0035;
    tp.setXYZ(i,x*(1+fold/r),y*(1+fold/r),tp.getZ(i)+fold);
  }
  tissueGeo.computeVertexNormals();
  const lips=new THREE.Mesh(tissueGeo,flesh);lips.name='Folded buccal lips';root.add(lips);
  const cavity = new THREE.Mesh(new THREE.SphereGeometry(.18,48,32),interior);
  cavity.position.z=-.04; cavity.scale.z=.32;root.add(cavity);

  // Corneous chitin darkens towards the cutting tips. Thin walls remain amber.
  const beakMaterial=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.38,metalness:0,clearcoat:.24,clearcoatRoughness:.3,side:THREE.DoubleSide});
  function interpolate(keys,t){
    const f=t*(keys.length-1),i=Math.min(keys.length-2,Math.floor(f)),u=f-i;
    return keys[0].map((_,k)=>{
      const p0=keys[Math.max(0,i-1)][k],p1=keys[i][k],p2=keys[i+1][k],p3=keys[Math.min(keys.length-1,i+2)][k];
      return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u);
    });
  }
  function shell(keys,sign,name){
    const longitudinal=84,radial=36,count=(longitudinal+1)*(radial+1),pos=[],colors=[],uv=[],indices=[];
    const amber=new THREE.Color(0x956336),brown=new THREE.Color(0x49281a),tip=new THREE.Color(0x160f0b),color=new THREE.Color();
    for(let layer=0;layer<2;layer++)for(let i=0;i<=longitudinal;i++){
      const t=i/longitudinal,[z,cy,rawWidth,rawHeight]=interpolate(keys,t);
      const thickness=.0045*(.35+.65*Math.sin(Math.PI*t));
      const w=Math.max(.0007,rawWidth-layer*thickness),h=Math.max(.0007,rawHeight-layer*thickness);
      for(let j=0;j<=radial;j++){
        const a=j/radial*Math.PI;
        const growth=.00016*Math.sin(t*170+a*2)*Math.sin(Math.PI*t);
        const x=Math.cos(a)*(w+growth),y=cy+sign*Math.sin(a)*(h+growth)-sign*layer*thickness*.15;
        pos.push(x,y,z);uv.push(j/radial,t);
        color.copy(amber).lerp(brown,THREE.MathUtils.smoothstep(t,.12,.67)).lerp(tip,THREE.MathUtils.smoothstep(t,.62,.98));
        color.multiplyScalar((layer?.3:1)*(1+.035*Math.sin(t*140)));
        colors.push(color.r,color.g,color.b);
      }
    }
    for(let layer=0;layer<2;layer++)for(let i=0;i<longitudinal;i++)for(let j=0;j<radial;j++){
      const a=layer*count+i*(radial+1)+j,b=a+radial+1;
      if((layer===0)===(sign===1))indices.push(a,a+1,b,a+1,b+1,b);
      else indices.push(a,b,a+1,a+1,b,b+1);
    }
    // Seal both cutting edges and the thin back/tip margins.
    for(let i=0;i<longitudinal;i++)for(const j of [0,radial]){
      const a=i*(radial+1)+j,b=a+radial+1;indices.push(a,b,a+count,b,b+count,a+count);
    }
    for(const i of [0,longitudinal])for(let j=0;j<radial;j++){
      const a=i*(radial+1)+j;indices.push(a,a+count,a+1,a+1,a+count,a+count+1);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,beakMaterial);mesh.name=name;return mesh;
  }
  const upper=new THREE.Group(),lower=new THREE.Group();
  upper.name='Upper beak';lower.name='Lower beak';root.add(upper,lower);
  upper.add(shell([
    [-.13,.004,.137,.055],[-.075,.012,.155,.09],[-.01,.018,.147,.128],
    [.063,.012,.113,.123],[.127,.002,.073,.087],[.18,-.018,.031,.038],[.211,-.047,.0015,.0015]
  ],1,'Upper hood, lateral walls and hooked rostrum'));
  lower.add(shell([
    [-.14,-.03,.177,.049],[-.075,-.035,.183,.087],[-.01,-.04,.153,.102],
    [.069,-.038,.12,.085],[.137,-.035,.077,.051],[.184,-.037,.039,.02],[.202,-.043,.006,.002]
  ],-1,'Lower wings and cutting rostrum'));
  const setGape=value=>{
    const gape=THREE.MathUtils.clamp(value,0,1);
    upper.rotation.x=-gape*.065;
    lower.rotation.x=gape*.36;
    lower.position.y=-gape*.011;
  };
  setGape(.35);
  return {root,upper,lower,lips,setGape};
}

export function makeSerratedSuckerRing(){
  const positions=[],indices=[],teeth=24,steps=teeth*3;
  for(let i=0;i<=steps;i++){
    const a=i/steps*Math.PI*2,inner=i%3===1?.054:.06;
    positions.push(Math.cos(a)*.069,Math.sin(a)*.069,.074,
      Math.cos(a)*inner,Math.sin(a)*inner,i%3===1?.081:.077);
  }
  for(let i=0;i<steps;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
