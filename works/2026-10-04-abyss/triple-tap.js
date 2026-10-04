// Pointer events cover touch, pen, and mouse without synthetic-click double counting.
export function installTripleTap(element,{hit,onProgress,onComplete,isEnabled,timeout=7000}){
  let count=0,timer=0,gesture=null;const active=new Set();
  function reset(){clearTimeout(timer);timer=0;count=0;onProgress(0);}
  function register(){
    if(!isEnabled())return;clearTimeout(timer);count++;onProgress(count);
    if(count===3){count=0;setTimeout(()=>{if(isEnabled())onComplete();},0);}
    else timer=setTimeout(reset,timeout);
  }
  element.addEventListener('pointerdown',e=>{
    if(!isEnabled()||(e.pointerType==='mouse'&&e.button!==0))return;
    active.add(e.pointerId);
    if(active.size!==1){gesture=null;reset();return;}
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,start:performance.now(),moved:false};
  },true);
  element.addEventListener('pointermove',e=>{
    if(gesture&&gesture.id===e.pointerId&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>12){gesture.moved=true;reset();}
  },true);
  element.addEventListener('pointerup',e=>{
    const g=gesture,one=active.size===1;active.delete(e.pointerId);gesture=null;
    if(!g||g.id!==e.pointerId||!one||g.moved||performance.now()-g.start>650||!isEnabled())return;
    if(hit(e.clientX,e.clientY))register();else reset();
  },true);
  element.addEventListener('pointercancel',e=>{active.delete(e.pointerId);gesture=null;reset();},true);
  element.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat&&isEnabled()){e.preventDefault();register();}});
  window.addEventListener('blur',()=>{active.clear();gesture=null;reset();});
  return {reset};
}
