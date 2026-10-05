import * as THREE from 'three';
import {WATER_HEIGHT} from './ocean-depth.js';

// Unresolved lights in open water. They have no visible body, beam or marker.
// A short memory of the swimmer's translation makes their response arrive late.
export function createDistantLights(scene,terrain,glowTexture){
  const definitions=[
    {at:[-5,WATER_HEIGHT-1,-22],phase:.5,delay:1.4,tint:'#c8c5a6'},
    {at:[10,WATER_HEIGHT+8,-43],phase:3.2,delay:2.3,tint:'#a1b9bc'},
    {at:[-5.5,48,-24],phase:1.7,delay:1.9,tint:'#c1bca0'},
    {at:[6.5,24,-36],phase:4.6,delay:2.6,tint:'#9badb9'},
    {at:[-4,-1.5,-25],phase:2.5,delay:1.6,tint:'#c9bea0'}
  ];
  // Uneven little arrangements avoid a repeated pair of eyes or a dotted trail.
  const arrangements=[
    [[-1.7,.1,-.8],[0,.6,0],[.85,-.45,1.2],[2.3,.25,-1.7]],
    [[-1.15,.9,0],[.6,-.3,-1.3],[1.65,.15,.7]],
    [[-1.6,-.4,0],[-.3,.65,-1],[1.7,.05,.8]]
  ];
  const lights=definitions.map((d,i)=>({base:new THREE.Vector3(...d.at),phase:d.phase,delay:d.delay,tint:new THREE.Color(d.tint),points:arrangements[i%arrangements.length],echo:new THREE.Vector3(),visibility:1,quietUntil:-1}));
  const count=lights.reduce((sum,l)=>sum+l.points.length,0),positions=new Float32Array(count*3),colors=new Float32Array(count*3);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage));
  const group=new THREE.Group();group.name='distant-lights';group.visible=false;scene.add(group);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const context=canvas.getContext('2d'),gradient=context.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.24,'rgba(255,255,255,1)');gradient.addColorStop(.55,'rgba(255,255,255,.3)');gradient.addColorStop(1,'rgba(255,255,255,0)');context.fillStyle=gradient;context.fillRect(0,0,64,64);const coreTexture=new THREE.CanvasTexture(canvas);
  for(const [size,opacity,map] of [[.48,1,coreTexture],[2.1,.14,glowTexture]]){
    const points=new THREE.Points(geometry,new THREE.PointsMaterial({map,size,opacity,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));points.frustumCulled=false;group.add(points);
  }
  const history=[],previousCamera=new THREE.Vector3(),recent=new THREE.Vector3(),earlier=new THREE.Vector3(),target=new THREE.Vector3(),center=new THREE.Vector3(),color=new THREE.Color();
  let lastTime=null,lastSample=-Infinity,wasActive=false;
  function remember(time,position){history.push({time,position:position.clone()});lastSample=time;while(history.length>1&&history[1].time<time-5)history.shift();}
  function sample(time,out){
    if(time<=history[0].time)return out.copy(history[0].position);
    for(let i=1;i<history.length;i++)if(history[i].time>=time){const a=history[i-1],b=history[i];return out.copy(a.position).lerp(b.position,(time-a.time)/(b.time-a.time));}
    return out.copy(history[history.length-1].position);
  }
  return {update(time,glow,cameraPosition,active){
    group.visible=active;
    if(!active){wasActive=false;lastTime=time;return;}
    const reset=!wasActive||previousCamera.distanceToSquared(cameraPosition)>100;
    const dt=reset||lastTime===null?0:Math.max(0,Math.min(time-lastTime,.1));
    if(reset){history.length=0;remember(time,cameraPosition);for(const light of lights){light.echo.set(0,0,0);light.visibility=1;light.quietUntil=-1;}}
    else if(dt>0&&time-lastSample>=.05)remember(time,cameraPosition);
    previousCamera.copy(cameraPosition);lastTime=time;wasActive=true;
    let n=0;
    for(const light of lights){
      if(dt>0){
        sample(time-light.delay,recent);sample(time-light.delay-.7,earlier);
        target.subVectors(recent,earlier).multiplyScalar(.85).clampLength(0,3.5);
        light.echo.lerp(target,1-Math.exp(-dt*.85));
      }
      center.copy(light.base).add(light.echo);center.x+=Math.sin(time*.12+light.phase)*.24;center.y+=Math.sin(time*.17+light.phase)*.18;
      center.y=Math.max(center.y,terrain(center.x,center.z)+2.4);
      const distance=center.distanceTo(cameraPosition);
      if(distance<17&&(dt>0||reset))light.quietUntil=time+12;
      const near=THREE.MathUtils.smoothstep(distance,14,27),far=1-THREE.MathUtils.smoothstep(distance,65,100),desired=time<light.quietUntil?0:near;
      if(reset)light.visibility=desired;else if(dt>0)light.visibility=THREE.MathUtils.damp(light.visibility,desired,1.6,dt);
      const breath=.68+.2*Math.sin(time*.31+light.phase)+.12*Math.sin(time*.13+light.phase*3);
      for(let i=0;i<light.points.length;i++){
        const p=light.points[i],index=n*3;
        positions[index]=center.x+p[0]+Math.sin(time*.21+i*2+light.phase)*.08;
        positions[index+1]=center.y+p[1]+Math.cos(time*.16+i+light.phase)*.09;
        positions[index+2]=center.z+p[2];
        const flicker=.75+.25*Math.sin(time*.38-i*.9+light.phase)**2;
        color.copy(light.tint).multiplyScalar(light.visibility*far*breath*flicker*Math.min(glow,1.7)*1.65);color.toArray(colors,index);n++;
      }
    }
    geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;
  }};
}
