import { installTripleTap } from './triple-tap.js';
import { installSubmersible } from './submersible.js';

export async function startFallback(){
  const $=id=>document.getElementById(id);
  document.body.classList.remove('beach-mode','beak-view','transforming');document.body.classList.add('fallback-mode');document.body.dataset.renderMode='illustrated';
  $('beak-panel').hidden=true;$('transition-veil').style.opacity='0';$('ocean').removeAttribute('aria-busy');
  const stage=document.createElement('div');stage.className='fallback-stage';stage.tabIndex=0;stage.setAttribute('role','button');stage.setAttribute('aria-label','Giant squid, illustrated view. Tap it three times, or press Enter three times, for an island barbecue surprise.');
  stage.innerHTML='<div class="fallback-particles" aria-hidden="true"></div><picture class="fallback-squid"><source media="(max-width: 700px)" srcset="./assets/squid-tall.webp"><img src="./assets/squid-wide.webp" alt="Giant squid underwater" draggable="false"></picture><picture class="fallback-beach"><source media="(max-width: 700px)" srcset="./assets/beach-tall.webp"><img src="./assets/beach-wide.webp" alt="Giant grilled ikayaki at an Okinawa-inspired beach barbecue" draggable="false"></picture>';
  $('ocean').replaceChildren(stage);
  const squid=stage.querySelector('.fallback-squid img'),beach=stage.querySelector('.fallback-beach img'),particles=stage.querySelector('.fallback-particles');
  for(let i=0;i<35;i++){const mote=document.createElement('i');mote.style.cssText=`left:${(i*37.7)%100}%;top:${(i*23.3)%100}%;animation-delay:-${i*.7}s;animation-duration:${18+i%12}s`;particles.appendChild(mote);}
  let sub=null,returnView=null;
  let phase='ocean',paused=matchMedia('(prefers-reduced-motion: reduce)').matches,lightOn=true,alpha=null,alphaW=0,alphaH=0;
  const mask=document.createElement('canvas'),maskContext=mask.getContext('2d',{willReadFrequently:true});
  function cacheMask(){
    if(!squid.naturalWidth||!maskContext)return;
    mask.width=alphaW=squid.naturalWidth;mask.height=alphaH=squid.naturalHeight;maskContext.clearRect(0,0,alphaW,alphaH);maskContext.drawImage(squid,0,0);
    alpha=maskContext.getImageData(0,0,alphaW,alphaH).data;
  }
  squid.addEventListener('load',cacheMask);
  await squid.decode();cacheMask();
  function hitSquid(x,y){
    if(!alpha)return false;
    const r=squid.getBoundingClientRect(),scale=Math.min(r.width/alphaW,r.height/alphaH),left=r.left+(r.width-alphaW*scale)/2,top=r.top+(r.height-alphaH*scale)/2;
    const px=Math.floor((x-left)/scale),py=Math.floor((y-top)/scale);
    for(const [dx,dy]of [[0,0],[5,0],[-5,0],[0,5],[0,-5]]){const mx=px+dx,my=py+dy;if(mx>=0&&mx<alphaW&&my>=0&&my<alphaH&&alpha[(my*alphaW+mx)*4+3]>55)return true;}
    return false;
  }
  function theme(beachMode){
    document.body.classList.toggle('beach-mode',beachMode);
    document.querySelector('.interaction-hint').textContent=beachMode?'ILLUSTRATED ISLAND DETOUR':'ILLUSTRATED VIEW · A LITTLE ISLAND MAGIC';
    document.title=beachMode?'ABYSS — The Island Detour':'ABYSS — A Giant Squid Encounter';
    document.querySelector('.brand>span').textContent=beachMode?'THE ISLAND DETOUR':'DEEP SEA OBSERVATORY';
    $('illumination-status').textContent=beachMode?'SEA BREEZE · CHARCOAL FIRE':lightOn?'ROV FLOODLIGHTS · ON':'ROV LIGHT OFF · NEAR DARKNESS';
    stage.setAttribute('aria-label',beachMode?'Illustrated giant ikayaki at an Okinawa-inspired beach barbecue. Use Back to the deep to replay.':'Giant squid, illustrated view. Tap it three times, or press Enter three times, for an island barbecue surprise.');
  }
  async function transform(){
    if(phase!=='ocean')return;returnView=sub?.active?{zoom,panX,panY}:null;sub?.setActive(false);phase='transition';$('tap-status').textContent='THE GRILL IS WARMING…';$('ocean').setAttribute('aria-busy','true');
    try{await beach.decode();}catch{phase='ocean';restoreSub();$('ocean').removeAttribute('aria-busy');taps.reset();$('tap-status').textContent='THE BEACH IS STILL LOADING · TRY AGAIN';return;}
    document.body.classList.add('transforming');const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?150:450;
    const veil=$('transition-veil');veil.style.transition=`opacity ${duration}ms ease`;veil.style.opacity='1';
    setTimeout(()=>{theme(true);setTimeout(()=>{veil.style.opacity='0';setTimeout(()=>{phase='beach';document.body.classList.remove('transforming');$('ocean').removeAttribute('aria-busy');},duration);},40);},duration);
  }
  const taps=installTripleTap(stage,{hit:hitSquid,isEnabled:()=>phase==='ocean',onComplete:transform,onProgress:count=>{
    if(phase!=='ocean')return;document.querySelectorAll('#tap-cue i').forEach((el,i)=>el.classList.toggle('lit',i<count));$('tap-status').textContent=count===0?'TAP THE SQUID 3×':count===1?'1 / 3 · KEEP TAPPING':count===2?'2 / 3 · ONE MORE…':'ISLAND MAGIC…';
  }});
  function restoreSub(){if(returnView){const saved=returnView;returnView=null;sub.setActive(true);({zoom,panX,panY}=saved);renderPilot();}}
  function returnDeep(){if(phase==='transition')return;phase='ocean';theme(false);restoreSub();taps.reset();stage.focus({preventScroll:true});}
  $('return-deep').onclick=returnDeep;
  function motionUI(){
    document.body.classList.toggle('fallback-paused',paused);$('motion').setAttribute('aria-label',paused?'Play animation':'Pause animation');
    $('motion').querySelector('.control-label').textContent=paused?'Play':'Pause';$('motion-icon').innerHTML=paused?'<svg viewBox="0 0 20 20" width="18" height="18"><path d="M5 3l11 7-11 7z" fill="none" stroke="currentColor"/></svg>':'<svg viewBox="0 0 20 20" width="18" height="18"><path d="M6 4v12M14 4v12" stroke="currentColor" stroke-width="2"/></svg>';
  }
  $('motion').onclick=()=>{paused=!paused;motionUI();};motionUI();
  $('light').onclick=()=>{lightOn=!lightOn;$('light').setAttribute('aria-pressed',String(lightOn));stage.classList.toggle('unlit',!lightOn);theme(phase==='beach');};
  $('light').setAttribute('aria-pressed','true');
  function depthUI(){const depth=Number($('depth').value);$('depth-value').textContent=depth;$('zone-name').textContent=depth>=1000?'THE MIDNIGHT ZONE':'THE TWILIGHT ZONE';stage.style.setProperty('--depth-light',String(Math.max(0,1-(depth-200)/700)));}
  $('depth').oninput=depthUI;depthUI();
  $('reset').onclick=()=>{if(sub?.active)sub.reset();else returnDeep();taps.reset();};
  $('about').onclick=()=>$('notes').showModal();$('inspect').onclick=()=>$('notes').showModal();$('close-notes').onclick=()=>$('notes').close();
  $('beak-view').onclick=()=>$('illustrated-beak').showModal();$('close-illustrated-beak').onclick=()=>$('illustrated-beak').close();
  let audioContext,gain;
  $('sound').setAttribute('aria-pressed','false');
  $('sound').onclick=async()=>{try{
    if(!audioContext){audioContext=new(window.AudioContext||window.webkitAudioContext)();const buffer=audioContext.createBuffer(1,audioContext.sampleRate*4,audioContext.sampleRate),data=buffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.018)/1.018;data[i]=brown*3.5;}const source=audioContext.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=260;gain=audioContext.createGain();gain.gain.value=0;source.connect(filter).connect(gain).connect(audioContext.destination);source.start();}
    await audioContext.resume();const enabled=$('sound').getAttribute('aria-pressed')!=='true';gain.gain.setTargetAtTime(enabled?.45:0,audioContext.currentTime,.3);$('sound').setAttribute('aria-pressed',String(enabled));
  }catch{$('sound').setAttribute('aria-pressed','false');}};
  document.querySelector('.interaction-hint').textContent='ILLUSTRATED VIEW · A LITTLE ISLAND MAGIC';
  document.querySelector('footer>span:first-child').innerHTML='<i></i> ILLUSTRATED MODE';
  theme(false);$('loading').classList.add('ready');
  const picture=stage.querySelector('.fallback-squid');let zoom=1,panX=0,panY=0;
  function renderPilot(){picture.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;}
  function subFocus(part){
    const mobile=innerWidth<700;
    const points=mobile?{whole:[.57,.525,.85],eye:[.641,.400,3.8],mantle:[.655,.30,2.8],arms:[.55,.49,2.8]}:{whole:[.61,.475,.95],eye:[.66,.338,3.5],mantle:[.671,.215,2.7],arms:[.625,.45,2.6]};
    const [x,y,z]=points[part]||points.whole;zoom=z;
    // Use the displayed image's contain rectangle, including letterboxing.
    const scale=Math.min(innerWidth/squid.naturalWidth,innerHeight/squid.naturalHeight),w=squid.naturalWidth*scale,h=squid.naturalHeight*scale;
    panX=-(x-.5)*w*zoom;panY=-(innerHeight<540?130:mobile?257:237)/2-(y-.5)*h*zoom;renderPilot();
  }
  sub=installSubmersible({surface:stage,available:()=>phase==='ocean',illustrated:true,
    enter(){subFocus('whole');},leave(){picture.style.transform='';},focus:subFocus,
    look(dx,dy){panX=Math.max(-innerWidth*zoom,Math.min(innerWidth*zoom,panX+dx));panY=Math.max(-innerHeight*zoom,Math.min(innerHeight*zoom,panY+dy));renderPilot();},
    move(direction,dt){
      if(direction==='forward'||direction==='back'){const next=Math.max(.65,Math.min(5,zoom+(direction==='forward'?1:-1)*dt*.8));panX*=next/zoom;panY*=next/zoom;zoom=next;}
      if(direction==='left')panX+=dt*120;if(direction==='right')panX-=dt*120;if(direction==='up')panY+=dt*120;if(direction==='down')panY-=dt*120;
      panX=Math.max(-innerWidth*zoom,Math.min(innerWidth*zoom,panX));panY=Math.max(-innerHeight*zoom,Math.min(innerHeight*zoom,panY));renderPilot();
    },
    readout:()=>({depth:$('depth').value+' M',range:'VIEW '+zoom.toFixed(1)+'×',heading:'VISUAL SCAN'})
  });
  window.__abyss={mode:'illustrated',sub,get phase(){return phase;},hitSquid,stage};
}
