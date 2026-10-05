import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {materialMaps} from './textures.js';
import {WATER_HEIGHT} from './ocean-depth.js';

// Fictional relatives of ceratioid anglerfish and gulper eels. The light comes
// from lures and sparse photophores; the skin, gills and teeth only reflect it.
export function createPelagic(parent, halo) {
  let seed=1847;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const maps=materialMaps('skin',81), boneMaps=materialMaps('shell',89);
  const pixels=maps.map.image.data;for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)pixels[i+c]=Math.min(235,pixels[i+c]*2.65);maps.map.needsUpdate=true;
  const skin=new THREE.MeshStandardMaterial({color:'#c0c8ac',...maps,bumpScale:.085,roughness:.48});
  const tissue=new THREE.MeshStandardMaterial({color:'#9f717e',bumpMap:maps.bumpMap,roughnessMap:maps.roughnessMap,bumpScale:.055,roughness:.64});
  const tooth=new THREE.MeshStandardMaterial({color:'#d1d3ad',bumpMap:boneMaps.bumpMap,bumpScale:.016,roughness:.5});
  const throat=new THREE.MeshStandardMaterial({color:'#090d13',roughness:.85});
  const finMaterial=new THREE.MeshStandardMaterial({color:'#788b81',bumpMap:maps.bumpMap,bumpScale:.035,roughness:.68,transparent:true,opacity:.48,side:THREE.DoubleSide,depthWrite:false});
  const bulbMaterial=new THREE.MeshBasicMaterial({color:'#c8dfab'});
  const animals=[], lights=[], bulbs=[];
  const sphere=new THREE.SphereGeometry(1,24,16);
  function organ(group,material,position,scale) {
    const mesh=new THREE.Mesh(sphere,material);mesh.position.set(...position);mesh.scale.set(...scale);group.add(mesh);return mesh;
  }
  function cord(group,points,material,radius=.025) {
    const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,24,radius,5,false),material);group.add(mesh);return mesh;
  }
  function fang(geometries,root,tip,width) {
    const a=new THREE.Vector3(...root),b=new THREE.Vector3(...tip),mid=a.clone().lerp(b,.55);mid.z+=.09;
    const curve=new THREE.QuadraticBezierCurve3(a,mid,b),vertices=[],indices=[];
    for(let i=0;i<=7;i++){
      const p=curve.getPoint(i/7),tangent=curve.getTangent(i/7),side=new THREE.Vector3(0,0,1).cross(tangent).normalize(),up=tangent.clone().cross(side);
      for(let j=0;j<5;j++){const angle=j/5*Math.PI*2,r=width*(1-i/7);vertices.push(p.x+r*(side.x*Math.cos(angle)+up.x*Math.sin(angle)),p.y+r*(side.y*Math.cos(angle)+up.y*Math.sin(angle)),p.z+r*(side.z*Math.cos(angle)+up.z*Math.sin(angle)));}
    }
    for(let i=0;i<7;i++)for(let j=0;j<5;j++){const a=i*5+j,b=i*5+(j+1)%5;indices.push(a,b,a+5,b,b+5,a+5);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometries.push(geometry);
  }
  function mouth(group,width,height) {
    const jaw=new THREE.Group();group.add(jaw);
    const outline=[],fangs=[];
    const edge=a=>{
      const s=Math.sin(a),c=Math.cos(a),fold=1+.04*Math.sin(a*5)+.023*Math.sin(a*9);
      return [c*width*(.88-.2*s)*fold+.035*Math.sin(a*3),s*height*fold-.12,1.29+.08*Math.sin(a*3)];
    };
    // The opening narrows towards the skull and sags at the lower jaw. Its
    // recessed lining is actual folded tissue, not a flat black mouth decal.
    const vertices=[],indices=[],colors=[];
    for(let ring=0;ring<=12;ring++)for(let i=0;i<=64;i++){
      const q=ring/12,a=i/64*Math.PI*2,e=edge(a),r=1-q;
      vertices.push(e[0]*r,e[1]*r-.1*q,e[2]-.88*Math.sin(q*Math.PI/2)+.024*Math.sin(a*17)*r*q);
      const color=new THREE.Color('#403039').multiplyScalar(.045+.5*Math.pow(r,5));colors.push(color.r,color.g,color.b);
      if(ring<12&&i<64){const j=ring*65+i;indices.push(j,j+1,j+65,j+1,j+66,j+65);}
      if(ring===0)outline.push(e);
    }
    const chamber=new THREE.BufferGeometry();chamber.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));chamber.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));chamber.setIndex(indices);chamber.computeVertexNormals();
    jaw.add(new THREE.Mesh(chamber,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.64,side:THREE.DoubleSide})));
    cord(jaw,outline,tissue,.063);
    for(let row=0;row<2;row++)for(let i=0;i<24;i++){
      const a=(i+.32*row+random()*.23)/24*Math.PI*2,e=edge(a),sy=Math.sin(a),length=(i%7===0?.13:.23+random()*.55)*(row?.64:1);
      fang(fangs,[e[0]*(1-row*.08),e[1]*(1-row*.08),e[2]-row*.12],
        [e[0]*(.73+random()*.13)+(random()-.5)*.07,e[1]-Math.sign(sy)*length,1.38-row*.21+random()*.15],.018+random()*.013);
    }
    const teeth=mergeGeometries(fangs);fangs.forEach(g=>g.dispose());jaw.add(new THREE.Mesh(teeth,tooth));
    // External folds converge on the jaw joint instead of forming a neat ring.
    for(const side of [-1,1])for(let i=0;i<4;i++){
      cord(group,[[side*width*.89,.58-i*.32,.92],[side*(width+.14+i*.025),.3-i*.38,.56],[side*width*.78,-.48-i*.28,.23]],tissue,.024+i*.006);
    }
    return jaw;
  }
  function fin(group,side) {
    const g=new THREE.Group();g.position.set(side*.9,-.05,-.55);group.add(g);
    const vertices=[0,0,0],indices=[],edge=[];
    for(let i=0;i<=13;i++){
      const q=i/13,x=side*(.3+Math.sin(q*Math.PI)*1.3),y=.55-q*1.6,z=-.35-Math.sin(q*Math.PI)*.6;
      vertices.push(x,y,z);edge.push([x,y,z]);
      if(i<13)indices.push(0,i+1,i+2);
      if(i%2===0)cord(g,[[0,0,0],[x*.65,y*.6,z*.4],[x,y,z]],skin,.012);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();g.add(new THREE.Mesh(geometry,finMaterial));return g;
  }
  function photophore(group,position,size=.04,strength=.28) {
    organ(group,bulbMaterial,position,[size,size*.75,size]);
    const aura=halo('#b4d9b1',size*9,...position,strength);group.add(aura);bulbs.push({aura,strength,phase:random()*6});
  }
  function angler(position,scale,phase) {
    const g=new THREE.Group();g.position.set(...position);g.scale.setScalar(scale);g.rotation.y=-.22;parent.add(g);
    const profile=new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.19,1.29,1.22),new THREE.Vector3(1.38,1.48,.55),new THREE.Vector3(1.34,1.28,-.45),new THREE.Vector3(.91,.84,-1.45),new THREE.Vector3(.03,.03,-2.12)
    ]),bodyVertices=[],bodyUV=[],bodyIndices=[];
    for(let i=0;i<=30;i++)for(let j=0;j<=40;j++){
      const q=i/30,a=j/40*Math.PI*2,p=profile.getPoint(q),wrinkle=1+.024*Math.sin(a*13+q*16)+.015*Math.cos(a*7-q*29);
      bodyVertices.push(Math.cos(a)*p.x*wrinkle,Math.sin(a)*p.y*wrinkle+.12,p.z);bodyUV.push(j/40,q);
      if(i<30&&j<40){const k=i*41+j;bodyIndices.push(k,k+41,k+1,k+1,k+41,k+42);}
    }
    const bodyGeometry=new THREE.BufferGeometry();bodyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bodyVertices,3));bodyGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(bodyUV,2));bodyGeometry.setIndex(bodyIndices);bodyGeometry.computeVertexNormals();
    const body=new THREE.Mesh(bodyGeometry,skin);g.add(body);
    // Thick jaw muscles frame a smaller, noncircular gape.
    for(const side of [-1,1])organ(g,skin,[side*.98,-.09,.78],[.35,.94,.46]);
    organ(g,skin,[0,1.05,.63],[.83,.45,.66]);
    organ(g,tissue,[.06,-1.13,.72],[.66,.23,.49]);
    // Distorted skin bulges and dorsal ridges break the silhouette.
    for(let i=0;i<8;i++){
      const z=-1.4+i*.3;organ(g,skin,[Math.sin(i*2)*.1,1.17+Math.sin(i*.4)*.18,z],[.18,.24+random()*.17,.24]);
    }
    const jaw=mouth(g,1.08,1.03);
    for(const side of [-1,1]){
      organ(g,skin,[side*.99,.89,.89],[.12,.09,.09]);
      organ(g,throat,[side*1.02,.89,.973],[.028,.023,.015]);
      for(let j=0;j<4;j++)cord(g,[[side*1.1,.5-j*.17,-.13],[side*1.28,.25-j*.18,-.27],[side*1.16,-.1-j*.16,-.5]],tissue,.023);
    }
    const fins=[fin(g,-1),fin(g,1)];
    const tail=new THREE.Group();tail.position.set(0,.15,-1.7);g.add(tail);
    organ(tail,skin,[0,0,-.65],[.45,.47,1.05]);
    const tailFin=fin(tail,1);tailFin.position.set(0,0,-1.42);tailFin.rotation.y=Math.PI/2;tailFin.scale.set(.75,1.3,.7);
    const lure=new THREE.Group();lure.position.set(.1,1.25,.12);g.add(lure);
    cord(lure,[[0,0,0],[-.2,1.03,-.1],[-.12,1.9,.37],[.45,1.86,1.2],[.63,1.05,1.64]],skin,.031);
    organ(lure,tissue,[.63,1.06,1.64],[.13,.21,.12]);photophore(lure,[.63,.99,1.69],.082,.2);
    for(let i=0;i<5;i++)cord(lure,[[.63,.94,1.65],[.63+(i-2)*.065,.72,1.67],[.59+(i-2)*.1,.55+random()*.14,1.65]],tissue,.009);
    const light=new THREE.PointLight('#c4deb0',9,10,2);light.position.set(.63,1.03,1.98);lure.add(light);lights.push({light,power:9});
    // A faint scattered glow from prey below catches the underside of the jaws.
    const fill=new THREE.PointLight('#709fbb',16,9,2);fill.position.set(-1,-1.2,3.1);g.add(fill);lights.push({light:fill,power:16});
    animals.push({g,position,phase,size:scale,fins,tail,lure,jaw,body,bodyBase:bodyGeometry.attributes.position.array.slice(),type:'angler'});
  }
  function eel(position,scale,phase) {
    const g=new THREE.Group();g.position.set(...position);g.scale.setScalar(scale);g.rotation.y=-.2;parent.add(g);
    const head=new THREE.Group();g.add(head);
    organ(head,skin,[0,.15,-.65],[.68,.81,.87]);
    organ(head,skin,[0,.64,.5],[.46,.25,.4]);
    const jaw=mouth(head,.54,.75);head.rotation.y=.24;
    for(const side of [-1,1]){
      organ(head,skin,[side*.53,.57,.62],[.07,.065,.055]);
      for(let i=0;i<3;i++)cord(head,[[side*.55,.21-i*.2,-.6],[side*.72,-.05-i*.17,-.58],[side*.58,-.24-i*.18,-.7]],tissue,.025);
      cord(head,[[side*.45,-.77,.6],[side*.66,-1.3,.2],[side*.46,-1.65,-.3]],skin,.02);
    }
    const rings=100,sides=12,vertices=new Float32Array((rings+1)*(sides+1)*3),indices=[];
    const colors=[],uvs=[];
    for(let i=0;i<=rings;i++)for(let j=0;j<=sides;j++){
      uvs.push(j/sides,i/rings*5);
      const c=new THREE.Color(j<sides/2?'#a5aba0':'#847a80').multiplyScalar(.66+random()*.3);colors.push(c.r,c.g,c.b);
      if(i<rings&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,a+1,b,a+1,b+1,b);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
    const bodyMaterial=skin.clone();bodyMaterial.vertexColors=true;
    const body=new THREE.Mesh(geometry,bodyMaterial);body.frustumCulled=false;g.add(body);
    const finVertices=new Float32Array((rings+1)*2*3),finIndices=[];
    for(let i=0;i<rings;i++){const a=i*2;finIndices.push(a,a+1,a+2,a+1,a+3,a+2);}
    const finGeometry=new THREE.BufferGeometry();finGeometry.setAttribute('position',new THREE.BufferAttribute(finVertices,3).setUsage(THREE.DynamicDrawUsage));finGeometry.setIndex(finIndices);
    const dorsal=new THREE.Mesh(finGeometry,finMaterial);dorsal.frustumCulled=false;g.add(dorsal);
    const pores=[];
    for(let i=0;i<15;i++){
      const p=new THREE.Group();g.add(p);photophore(p,[0,0,0],.028+i%3*.007,.16);pores.push({p,s:.07+i*.052});
    }
    const light=new THREE.PointLight('#95b9b6',10,9,2);light.position.set(.3,1.3,2.3);head.add(light);lights.push({light,power:10});
    const rim=new THREE.PointLight('#598f9b',26,20,2);rim.position.set(-5,2,2);g.add(rim);lights.push({light:rim,power:26});
    animals.push({g,position,phase,size:scale,head,jaw,geometry,finGeometry,rings,sides,pores,centers:Array.from({length:rings+1},()=>new THREE.Vector3()),spine:Array.from({length:rings+1},()=>new THREE.Vector3()),inverse:new THREE.Quaternion(),type:'eel'});
  }
  // Stagger encounters beside the descending current between stations.
  // This group inherits the upper station's height; these are world elevations.
  angler([-.35,53-WATER_HEIGHT,1.5],1.18,0);
  eel([4.5,40-WATER_HEIGHT,-1],1.25,1.7);
  eel([-5,25-WATER_HEIGHT,5],.86,4.1);

  // Routes cross the descent at different depths. Every animal faces its
  // direction of travel; the eel spine samples where its head previously swam.
  const routes=[
    [[0,0,0],[5,1,5],[9,-1,1],[6,-2,-7],[-2,1,-8],[-6,2,-2]],
    [[0,0,0],[7,1,6],[13,2,-2],[9,-1,-12],[-3,-2,-14],[-10,1,-5]],
    [[0,0,0],[-7,1,6],[-13,2,-1],[-9,0,-11],[2,-2,-13],[8,-1,-5]]
  ];
  for(let i=0;i<animals.length;i++){
    const a=animals[i];a.path=new THREE.CatmullRomCurve3(routes[i].map(p=>new THREE.Vector3(p[0]+a.position[0],p[1]+a.position[1],p[2]+a.position[2])),true,'centripetal');a.path.arcLengthDivisions=400;a.length=a.path.getLength();a.speed=[1.05,1.55,1.3][i];a.g.name='pelagic-'+a.type;
  }
  const wrap=n=>((n%1)+1)%1;
  const point=new THREE.Vector3(),heading=new THREE.Vector3(),ahead=new THREE.Vector3(),right=new THREE.Vector3(),tangent=new THREE.Vector3(),normal=new THREE.Vector3(),binormal=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  const sample=(a,distance,out)=>a.path.getPointAt(wrap(distance/a.length),out);
  return {animals,update(t,glow) {
    for(const {light,power} of lights)light.intensity=power*glow;
    for(const b of bulbs)b.aura.material.opacity=b.strength*glow*(.84+.16*Math.sin(t*.6+b.phase));
    for(const a of animals){
      const p=a.phase,distance=t*a.speed,beat=t*(a.type==='angler'?3.5:3.9)+p;
      sample(a,distance,a.g.position);a.path.getTangentAt(wrap(distance/a.length),heading);a.path.getTangentAt(wrap((distance+1.2)/a.length),ahead);
      const turn=heading.z*ahead.x-heading.x*ahead.z,bank=THREE.MathUtils.clamp(-turn*1.3,-.24,.24);
      a.g.rotation.set(-Math.asin(heading.y),Math.atan2(heading.x,heading.z),bank,'YXZ');
      if(a.type==='angler'){
        a.fins.forEach((f,i)=>{f.rotation.z=Math.sin(beat*.75+i*Math.PI)*.27;f.rotation.y=Math.sin(beat*.75+i*Math.PI+.7)*.22;});
        a.tail.position.x=Math.sin(beat-.85)*.12;a.tail.rotation.y=Math.sin(beat-1)*.42;a.tail.rotation.z=Math.cos(beat)*.06;
        a.lure.rotation.z=Math.sin(beat*.5)*.12;a.lure.rotation.x=Math.sin(beat)*.055;a.jaw.scale.y=1+Math.sin(t*1.3)*.045;
        const vertices=a.body.geometry.attributes.position,base=a.bodyBase;
        for(let i=0;i<vertices.count;i++){const x=base[i*3],y=base[i*3+1],z=base[i*3+2],reach=THREE.MathUtils.clamp(-z/2,0,1);vertices.setXYZ(i,x+Math.sin(beat+z*.5)*.12*reach,y,z);}
        vertices.needsUpdate=true;a.body.geometry.computeVertexNormals();
      }else{
        a.inverse.copy(a.g.quaternion).invert();
        for(let i=0;i<=a.rings;i++){
          const s=i/a.rings;
          sample(a,distance-(.8+s*14)*a.size,point);
          a.spine[i].copy(point).sub(a.g.position).applyQuaternion(a.inverse).divideScalar(a.size);
        }
        for(let i=0;i<=a.rings;i++){
          const s=i/a.rings;tangent.copy(a.spine[Math.max(0,i-1)]).sub(a.spine[Math.min(a.rings,i+1)]).normalize();right.crossVectors(up,tangent).normalize();
          a.centers[i].copy(a.spine[i]).addScaledVector(right,Math.sin(beat-s*9)*Math.pow(s,1.15)*1.2);a.centers[i].y+=Math.sin(beat*.65-s*6)*s*.09;
        }
        const vertices=a.geometry.attributes.position.array,fin=a.finGeometry.attributes.position.array;
        for(let i=0;i<=a.rings;i++){
          const s=i/a.rings,c=a.centers[i];tangent.copy(a.centers[Math.min(a.rings,i+1)]).sub(a.centers[Math.max(0,i-1)]).normalize();
          binormal.crossVectors(tangent,up).normalize();normal.crossVectors(binormal,tangent).normalize();
          const radius=(.63*Math.pow(1-s,1.3)+.008)*(1+.045*Math.sin(s*170));
          for(let j=0;j<=a.sides;j++){
            const angle=j/a.sides*Math.PI*2,idx=(i*(a.sides+1)+j)*3;
            vertices[idx]=c.x+radius*(normal.x*Math.cos(angle)*1.15+binormal.x*Math.sin(angle));
            vertices[idx+1]=c.y+radius*(normal.y*Math.cos(angle)*1.15+binormal.y*Math.sin(angle));
            vertices[idx+2]=c.z+radius*(normal.z*Math.cos(angle)*1.15+binormal.z*Math.sin(angle));
          }
          for(let j=0;j<2;j++){
            const height=radius*1.12+j*(.08+Math.sin(s*Math.PI)*.5)*(1+.22*Math.sin(s*100-beat)),idx=(i*2+j)*3;
            fin[idx]=c.x+normal.x*height;fin[idx+1]=c.y+normal.y*height;fin[idx+2]=c.z+normal.z*height+j*Math.sin(s*25-beat)*.08;
          }
        }
        a.geometry.attributes.position.needsUpdate=true;a.geometry.computeVertexNormals();a.finGeometry.attributes.position.needsUpdate=true;a.finGeometry.computeVertexNormals();
        for(const pore of a.pores){const index=pore.s*a.rings,i=Math.floor(index);pore.p.position.copy(a.centers[i]).lerp(a.centers[Math.min(i+1,a.rings)],index-i);pore.p.position.y-=.24*Math.pow(1-pore.s,1.5);pore.p.position.x+=.44*Math.pow(1-pore.s,1.5);}
        a.head.rotation.y=Math.sin(beat)*.035;a.head.rotation.z=Math.sin(beat*.5)*.04;a.jaw.scale.y=1+Math.sin(t*1.1+p)*.055;
      }
    }
  }};
}
