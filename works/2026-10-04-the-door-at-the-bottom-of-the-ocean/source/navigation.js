import * as THREE from 'three';
import {WATER_HEIGHT,SWIM_CEILING} from './ocean-depth.js';

// Camera-relative thrust with world-relative ascent. All input ends on interruption.
export class FreeNavigation {
  constructor(camera, canvas, groundHeight) {
    this.camera=camera;this.groundHeight=groundHeight;this.enabled=false;this.mode='swim';
    this.yaw=0;this.pitch=0;this.move={x:0,y:0};this.look={x:0,y:0};
    this.zoomTarget=camera.zoom;this.keys=new Set();this.velocity=new THREE.Vector3();this.cleanups=[];
    this.forward=new THREE.Vector3();this.right=new THREE.Vector3();this.wanted=new THREE.Vector3();
    this.bindStick(document.querySelector('#move-stick'),this.move);
    this.bindStick(document.querySelector('#look-stick'),this.look);
    let drag=null,pinchDistance=null;const touches=new Map();
    const distance=()=>{const [a,b]=touches.values();return a&&b?Math.hypot(a.x-b.x,a.y-b.y):null;};
    canvas.addEventListener('pointerdown',e=>{
      if(!this.enabled||e.button!==0)return;
      if(e.pointerType==='touch'){
        if(touches.size>=2)return;
        touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(touches.size===2){drag=null;pinchDistance=distance();}
        else drag={id:e.pointerId,x:e.clientX,y:e.clientY};
      }else{if(drag||touches.size)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};}
      e.preventDefault();canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove',e=>{
      if(!this.enabled)return;
      if(touches.has(e.pointerId)){
        touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(touches.size===2){const next=distance();if(next>=12&&pinchDistance>=12)this.zoomBy(next/pinchDistance);pinchDistance=next;e.preventDefault();return;}
      }
      if(!drag||e.pointerId!==drag.id)return;
      this.yaw-=(e.clientX-drag.x)*.004;this.pitch-=(e.clientY-drag.y)*.003;
      drag.x=e.clientX;drag.y=e.clientY;this.constrainPitch();
    });
    const end=e=>{
      if(touches.delete(e.pointerId)){
        pinchDistance=null;const remaining=touches.entries().next().value;
        drag=remaining?{id:remaining[0],...remaining[1]}:null;
      }else if(drag?.id===e.pointerId)drag=null;
    };
    for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,end);
    this.cleanups.push(()=>{const ids=new Set([...touches.keys(),...(drag?[drag.id]:[])]);touches.clear();drag=null;pinchDistance=null;for(const id of ids)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);});
    canvas.addEventListener('wheel',e=>{
      if(!this.enabled)return;e.preventDefault();
      const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
      this.zoomBy(Math.exp(-THREE.MathUtils.clamp(pixels,-300,300)*.0018));
    },{passive:false});
    document.addEventListener('keydown',e=>{if(!this.enabled||document.querySelector('dialog[open]')||e.target.matches('input,textarea,select'))return;
      if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}});
    document.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>this.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
  }
  bindStick(el,value){let id=null;const knob=el.querySelector('.stick-knob');
    const update=e=>{const r=el.getBoundingClientRect(),radius=r.width*.33;let x=(e.clientX-r.left-r.width/2)/radius,y=(e.clientY-r.top-r.height/2)/radius;const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}knob.style.transform=`translate(${x*radius}px,${y*radius}px)`;const strength=Math.max(0,(Math.min(len,1)-.12)/.88);value.x=len?x*strength:0;value.y=len?y*strength:0;};
    const reset=()=>{const previous=id;id=null;value.x=value.y=0;knob.style.transform='';el.classList.remove('engaged');if(previous!==null&&el.hasPointerCapture(previous))el.releasePointerCapture(previous);};
    el.addEventListener('pointerdown',e=>{if(id!==null||!this.enabled)return;e.preventDefault();id=e.pointerId;el.setPointerCapture(id);el.classList.add('engaged');update(e);});
    el.addEventListener('pointermove',e=>{if(id===e.pointerId){e.preventDefault();update(e);}});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,e=>{if(id===e.pointerId)reset();});this.cleanups.push(reset);
  }
  zoomBy(factor){if(Number.isFinite(factor)&&factor>0)this.zoomTarget=THREE.MathUtils.clamp(this.zoomTarget*factor,.65,2.5);}
  resetZoom(){this.zoomTarget=this.camera.zoom=1;this.camera.updateProjectionMatrix();}
  clear(){this.zoomTarget=this.camera.zoom;this.keys.clear();this.velocity.set(0,0,0);for(const cleanup of this.cleanups)cleanup();}
  setEnabled(value){this.enabled=value;if(!value)this.clear();}
  reset(habitat){this.clear();this.resetZoom();const mobile=innerWidth<600;this.camera.position.set(mobile?2:0,habitat==='floor'?-5:WATER_HEIGHT+1,habitat==='floor'?17:22);this.yaw=0;this.pitch=habitat==='floor'?-.1:0;this.orient();}
  constrainPitch(){this.pitch=THREE.MathUtils.clamp(this.pitch,-1.45,1.45);}
  direction(){return this.forward.set(-Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch));}
  orient(){this.constrainPitch();this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');}
  update(dt){if(this.enabled){const key=k=>Number(this.keys.has(k));this.yaw-= (this.look.x*1.35+(key('ArrowRight')-key('ArrowLeft'))*1.2)*dt;this.pitch-=(this.look.y*1.1+(key('ArrowDown')-key('ArrowUp')))*dt;this.constrainPitch();
      const forward=key('KeyW')-key('KeyS')-this.move.y,side=key('KeyD')-key('KeyA')+this.move.x,up=key('KeyE')-key('KeyQ');
      this.right.set(Math.cos(this.yaw),0,-Math.sin(this.yaw));this.wanted.copy(this.direction()).multiplyScalar(forward).addScaledVector(this.right,side);if(this.mode==='walk')this.wanted.y=0;else this.wanted.y+=up;if(this.wanted.lengthSq()>1)this.wanted.normalize();const fast=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight');this.wanted.multiplyScalar(this.mode==='walk'?(fast?3.2:1.8):(fast?9:4.5));
      this.velocity.lerp(this.wanted,1-Math.exp(-8*dt));this.camera.position.addScaledVector(this.velocity,dt);
      const p=this.camera.position;if(this.mode==='walk'){p.x=THREE.MathUtils.clamp(p.x,-2.45,2.45);p.z=THREE.MathUtils.clamp(p.z,-17.5,3.8);p.y=1.65;}else{p.x=THREE.MathUtils.clamp(p.x,-34,34);p.z=THREE.MathUtils.clamp(p.z,-104,30);p.y=THREE.MathUtils.clamp(p.y,this.groundHeight(p.x,p.z)+.9,SWIM_CEILING);}
    }if(Math.abs(this.camera.zoom-this.zoomTarget)>.0001){this.camera.zoom=THREE.MathUtils.damp(this.camera.zoom,this.zoomTarget,12,dt);if(Math.abs(this.camera.zoom-this.zoomTarget)<.001)this.camera.zoom=this.zoomTarget;this.camera.updateProjectionMatrix();}this.orient();
  }
  snapshot(){return {zoom:this.camera.zoom,zoomTarget:this.zoomTarget,position:this.camera.position.toArray(),yaw:this.yaw,pitch:this.pitch,velocity:this.velocity.toArray(),move:{...this.move},look:{...this.look},enabled:this.enabled,mode:this.mode};}
}
