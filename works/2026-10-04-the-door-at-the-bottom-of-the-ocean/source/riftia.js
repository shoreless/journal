import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {materialMaps} from './textures.js';

// Riftia-inspired body horror: crooked chitin tubes, swollen living collars, and folded red gills.
// The plumes reflect the surrounding light; they are not bioluminescent.
export function createRiftia(parent,terrain,glowTexture){
  let seed=819;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const tubeMaps=materialMaps('shell',84);
  const tubeMaterial=new THREE.MeshStandardMaterial({color:'#e7ddc2',map:tubeMaps.map,bumpMap:tubeMaps.bumpMap,roughnessMap:tubeMaps.roughnessMap,bumpScale:.035,roughness:.86});
  const tissueMaps=materialMaps('skin',121);
  const fleshMaterial=new THREE.MeshStandardMaterial({color:'#af8888',bumpMap:tissueMaps.bumpMap,bumpScale:.028,roughness:.38});
  const plumeMaterial=new THREE.MeshStandardMaterial({color:'#bc3942',vertexColors:true,roughness:.4,side:THREE.DoubleSide});
  const tissueTime={value:0};
  plumeMaterial.onBeforeCompile=shader=>{shader.uniforms.tissueTime=tissueTime;shader.vertexShader='uniform float tissueTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat reach = smoothstep(0.02,0.35,position.y); transformed.x += sin(position.y*22.0+position.z*17.0+tissueTime*0.8)*0.012*reach; transformed.z += cos(position.y*18.0+position.x*13.0+tissueTime*0.65)*0.014*reach;');};
  const fringeMaterial=new THREE.LineBasicMaterial({color:'#63272f',transparent:true,opacity:.8});
  const apertureMaterial=new THREE.MeshStandardMaterial({color:'#261319',roughness:.94});
  const mineralMaterial=new THREE.MeshStandardMaterial({color:'#827b6a',...materialMaps('ground',108),bumpScale:.12,roughness:.98});
  const animals=[],lights=[],plumes=[];
  const up=new THREE.Vector3(0,1,0);
  function colony(x,z,count,radius){
    const group=new THREE.Group();group.name="riftia-colony";parent.add(group);const stems=[];
    for(let i=0;i<9;i++){
      const a=random()*Math.PI*2,r=Math.sqrt(random())*radius;
      const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.4+random()*.45,1),mineralMaterial);
      rock.position.set(px,terrain(px,pz)+.1,pz);rock.scale.set(1,.45+random()*.3,.7+random()*.5);rock.rotation.set(random(),random()*6,random());group.add(rock);
    }
    for(let i=0;i<count;i++){
      const a=i*2.39996,r=Math.sqrt((i+.5)/count)*radius;
      const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r,base=terrain(px,pz)+.12;
      const height=.75+random()*1.7,width=.065+height*.026,leanX=(random()-.5)*1.15,leanZ=(random()-.5)*.9;
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(px,base,pz),new THREE.Vector3(px+leanX*.1+Math.sin(i)*.12,base+height*.4,pz+leanZ*.3),new THREE.Vector3(px+leanX*.7,base+height*.77,pz+leanZ*.65),new THREE.Vector3(px+leanX,base+height,pz+leanZ)]);
      const geometry=new THREE.TubeGeometry(curve,28,width,8,false),position=geometry.attributes.position;
      for(let k=0;k<=28;k++){
        const t=k/28,center=curve.getPointAt(t),scale=1-.2*t+.08*Math.sin(t*110+i)+.12*Math.sin(t*17+i)*Math.sin(t*Math.PI);
        for(let j=0;j<=8;j++){const index=k*9+j;position.setXYZ(index,center.x+(position.getX(index)-center.x)*scale,center.y+(position.getY(index)-center.y)*scale,center.z+(position.getZ(index)-center.z)*scale);}
      }
      geometry.computeVertexNormals();stems.push(geometry);
      const end=curve.getPointAt(1),mount=new THREE.Group();mount.position.copy(end);mount.quaternion.setFromUnitVectors(up,curve.getTangentAt(1));group.add(mount);
      const collarGeo=new THREE.LatheGeometry([new THREE.Vector2(width*.73,-.27),new THREE.Vector2(width*.92,-.18),new THREE.Vector2(width*1.17,-.045),new THREE.Vector2(width*1.04,.045),new THREE.Vector2(width*.6,.11)],14);
      const cp=collarGeo.attributes.position;for(let n=0;n<cp.count;n++){const x=cp.getX(n),y=cp.getY(n),z=cp.getZ(n),a=Math.atan2(z,x),f=1+.1*Math.sin(a*3+i)+.055*Math.sin(y*40+a*5);cp.setXYZ(n,x*f,y,z*f);}collarGeo.computeVertexNormals();
      const collar=new THREE.Mesh(collarGeo,fleshMaterial);collar.name="riftia-collar";mount.add(collar);
      const aperture=new THREE.Mesh(new THREE.CircleGeometry(width*.75,14),apertureMaterial);aperture.rotation.x=-Math.PI/2;aperture.position.y=-.018;mount.add(aperture);
      const plume=new THREE.Group();plume.name="riftia-gills";plume.rotation.y=random()*Math.PI;mount.add(plume);
      const gills=[],fringe=[],length=.34+height*.15;
      // Paired but uneven branchial lobes: wet, folded lamellae with visible vessels.
      for(const side of [-1,1])for(let k=0;k<7;k++){
        const q=(k+random()*.4)/7,angle=(q-.5)*2.4,spread=.12+random()*.19;
        const tip=new THREE.Vector3(side*spread,length*(.65+random()*.55),Math.sin(angle)*.2);
        const branch=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.018,0,0),new THREE.Vector3(side*spread*.4,tip.y*.45,tip.z*.4),new THREE.Vector3(tip.x*.9,tip.y+.025,tip.z*.9),tip]);
        const vertices=[],uvs=[],colors=[],indices=[],twist=random()*Math.PI,leafWidth=.045+random()*.055,rows=14,cols=6;
        for(let row=0;row<=rows;row++){
          const t=row/rows,center=branch.getPointAt(t),w=leafWidth*Math.pow(Math.sin(Math.PI*t),.7),turn=twist+t*2.6;
          for(let col=0;col<=cols;col++){
            const across=col/cols*2-1,fold=Math.sin(across*Math.PI)*w*.6,ridge=Math.sin(t*48+across*6+i)*.009*Math.sin(t*Math.PI);
            vertices.push(center.x+Math.cos(turn)*across*w,center.y+fold+ridge,center.z+Math.sin(turn)*across*w+fold*.4);
            uvs.push(col/cols,t);const stain=.6+.4*Math.sin(t*13+q*7)**2;colors.push(stain,.48+stain*.3,.55+stain*.25);
            if(row<rows&&col<cols){const n=row*(cols+1)+col;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
          }
        }
        const leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));leaf.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(vertices.length),3));leaf.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));leaf.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));leaf.setIndex(indices);leaf.computeVertexNormals();gills.push(leaf);
        for(let k=1;k<12;k++){const t=k/13,p=branch.getPointAt(t),next=branch.getPointAt((k+1)/13);fringe.push(p.x,p.y,p.z,next.x,next.y,next.z);}
      }
      const gillGeometry=mergeGeometries(gills);gills.forEach(g=>g.dispose());plume.add(new THREE.Mesh(gillGeometry,plumeMaterial));
      const fringeGeometry=new THREE.BufferGeometry();fringeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fringe,3));plume.add(new THREE.LineSegments(fringeGeometry,fringeMaterial));
      const scale=.8+random()*.4;plume.scale.setScalar(scale);animals.push({plume,collar,scale,phase:random()*Math.PI*2});
    }
    const stemGeometry=mergeGeometries(stems);stems.forEach(g=>g.dispose());const tubes=new THREE.Mesh(stemGeometry,tubeMaterial);tubes.name="riftia-tubes";group.add(tubes);
    const light=new THREE.PointLight('#b3c5be',12,10,2);light.position.set(x-.5,terrain(x,z)+4,z+2);group.add(light);lights.push(light);
    const positions=new Float32Array(26*3),phases=[];
    for(let i=0;i<26;i++)phases.push({x:x+(random()-.5)*.5,z:z+(random()-.5)*.5,phase:random(),speed:.035+random()*.035});
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
    const haze=new THREE.Points(geo,new THREE.PointsMaterial({map:glowTexture,color:'#77867a',size:.38,transparent:true,opacity:.09,depthWrite:false}));haze.frustumCulled=false;group.add(haze);plumes.push({haze,phases,base:terrain(x,z)});
  }
  colony(.5,7,25,1.35);colony(3.6,-6,17,1.1);
  return {update(time,glow){
    tissueTime.value=time;
    for(const {plume,collar,phase,scale} of animals){plume.rotation.x=Math.sin(time*.38+phase)*.09;plume.rotation.z=Math.cos(time*.29+phase)*.075;const breath=.82+.18*Math.sin(time*.28+phase);plume.scale.y=scale*breath;plume.scale.x=scale*(1.1-.1*breath);plume.position.y=-.12*(1-breath);collar.scale.set(1+(1-breath)*.14,1-(1-breath)*.08,1+(1-breath)*.14);}
    for(const light of lights)light.intensity=12*Math.min(glow,1.5);
    for(const {haze,phases,base} of plumes){const p=haze.geometry.attributes.position;for(let i=0;i<phases.length;i++){const s=phases[i],rise=(s.phase+time*s.speed)%1;p.setXYZ(i,s.x+Math.sin(rise*5+time*.12)*rise*.23,base+.3+rise*3.2,s.z+Math.cos(rise*4)*rise*.16);}p.needsUpdate=true;}
  }};
}
