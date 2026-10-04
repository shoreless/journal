// Shared cockpit and pilot input. The adapter supplies either 3D flight or image exploration.
export function installSubmersible({surface,available,enter,leave,move,look,focus,readout,illustrated=false}){
  const $=id=>document.getElementById(id), abort=new AbortController(),signal=abort.signal;
  let active=false,frame=0,last=0,drag=null;const held=new Map(),keys=new Set();
  const bind=(el,event,fn)=>el.addEventListener(event,fn,{signal});
  function stop(){held.clear();keys.clear();drag=null;}
  function setActive(value){
    if(value&&!available())return;
    if(active===value)return;active=value;stop();
    document.body.classList.toggle('sub-mode',active);$('sub-toggle').setAttribute('aria-pressed',String(active));
    $('sub-toggle').textContent=active?'← Leave submersible':'◎ Board submersible';
    $('sub-cockpit').hidden=!active;
    if(active){enter();surface.focus({preventScroll:true});}else leave();
  }
  $('sub-format').textContent=illustrated?'ILLUSTRATED EXPEDITION':'PILOTED EXPEDITION';
  $('sub-help').textContent=illustrated?'Drag to scan · hold controls to pan & zoom':'Drag to look · hold controls to pilot';
  bind($('sub-toggle'),'click',()=>setActive(!active));
  document.querySelectorAll('[data-flight]').forEach(button=>{
    bind(button,'pointerdown',e=>{if(!active)return;e.preventDefault();button.setPointerCapture(e.pointerId);held.set(e.pointerId,button.dataset.flight);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])bind(button,event,e=>held.delete(e.pointerId));
    bind(button,'click',e=>{if(active&&e.detail===0)move(button.dataset.flight,.18);});
  });
  document.querySelectorAll('[data-sub-focus]').forEach(button=>bind(button,'click',()=>{if(active){stop();focus(button.dataset.subFocus);}}));
  bind(surface,'pointerdown',e=>{if(active){if(drag){drag=null;return;}drag={id:e.pointerId,x:e.clientX,y:e.clientY};surface.setPointerCapture(e.pointerId);}});
  bind(surface,'pointermove',e=>{if(!active||drag?.id!==e.pointerId)return;look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])bind(surface,event,()=>{drag=null;});
  const keyMap={w:'forward',s:'back',a:'left',d:'right',q:'up',e:'down',ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
  bind(window,'keydown',e=>{if(!active||document.querySelector('dialog[open]')||/INPUT|BUTTON|TEXTAREA/.test(e.target.tagName))return;if(e.key==='Escape'){setActive(false);return;}if(keyMap[e.key]){e.preventDefault();keys.add(keyMap[e.key]);}});
  bind(window,'keyup',e=>keys.delete(keyMap[e.key]));bind(window,'blur',stop);bind(document,'visibilitychange',stop);
  function tick(now){
    const dt=Math.min((now-last)/1000||0,.05);last=now;
    if(active){if(!available())setActive(false);else{
      if(document.querySelector('dialog[open]'))stop();
      for(const direction of new Set([...held.values(),...keys]))move(direction,dt);
      const info=readout();$('sub-depth').textContent=info.depth;$('sub-range').textContent=info.range;$('sub-heading').textContent=info.heading;
    }}frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  const api={get active(){return active;},setActive,reset(){stop();focus('whole');},dispose(){setActive(false);abort.abort();cancelAnimationFrame(frame);}};
  return api;
}
