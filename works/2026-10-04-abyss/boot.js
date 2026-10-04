// The illustrated experience has no Three.js or WebGL dependency.
let switching=false;
async function illustrated(){
  if(switching)return;switching=true;
  try{window.__abyss?.dispose?.();}catch{}
  window.__abyssGraphics=null;
  const {startFallback}=await import('./fallback.js');await startFallback();
}
window.addEventListener('abyss:usefallback',()=>illustrated().catch(showLoadError));
function showLoadError(){
  const loading=document.getElementById('loading');loading.classList.remove('ready');
  document.getElementById('loading-message').textContent='The scene could not finish loading. Please refresh to try again.';
}
async function start(){
  if(new URLSearchParams(location.search).get('view')==='illustrated'){await illustrated();return;}
  const mobile=matchMedia('(max-width: 700px)').matches;
  for(const powerPreference of ['default','low-power']){
    const canvas=document.createElement('canvas');
    const options={alpha:false,antialias:!mobile&&powerPreference==='default',depth:true,stencil:false,powerPreference,failIfMajorPerformanceCaveat:false};
    try{
      const context=canvas.getContext('webgl2',options);
      if(context&&!context.isContextLost()){
        window.__abyssGraphics={canvas,context,options};
        await import('./scene.js');document.body.dataset.renderMode='webgl';return;
      }
    }catch{
      // Try the less demanding profile, then continue without a graphics context.
      window.__abyssGraphics=null;
    }
  }
  await illustrated();
}
start().catch(()=>illustrated().catch(showLoadError));
