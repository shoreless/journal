export const entries=[
 {number:'01',watch:'FIRST WATCH · DATE ILLEGIBLE',title:'On the loss of depth',body:[
 'The engines stopped at 04:20. We continue to descend. The depth recorder has gone beyond its scale, though the hull gives no complaint. I have ordered the men to cease tapping the glass.',
 'There is a light below us. Not a beam, nor the diffuse glow of the animals. A straight line, very thin and quite steady. The navigator drew it in yesterday’s chart. He now says he has never seen that chart.',
 'Three knocks were heard beneath the forward compartment. The engineer answered them with a spanner. I have relieved him of his watch.'
 ],margin:'The propeller is still. The wake continues.',alt:'Sepia expedition drawing of an unmarked submarine descending above an immense trench and uncertain architecture.'},
 {number:'02',watch:'SECOND WATCH · NO SOUNDING',title:'The object on the floor',body:[
 'It is a door. I write the word plainly because the others will not. Six panels, a brass handle, no wall. The light comes from beneath it, as though someone has left a lamp burning in the next room.',
 'The pale animals gather around the frame. Their little lights go out whenever the handle moves. We have observed this seven times. No one has yet admitted to seeing the handle move.',
 'I found the enclosed drawing among the ship’s original plans. The paper bears the maker’s watermark. The door bears the number of my childhood house. I have left the number out.'
 ],margin:'No hinges are visible from the other side.',alt:'Antique ink drawing of a freestanding paneled door on the ocean floor, surrounded by strange lure-bearing organisms.'},
 {number:'03',watch:'THIRD WATCH · ENTERED TWICE',title:'Concerning the room beyond',body:[
 'We passed through the door and entered the forward compartment of this vessel. I had left a cup upon the desk. It was still warm. Through the open doorway we could see the submarine above us.',
 'There are fewer men at each muster, but the same number of names. The empty chairs are always turned toward whoever is speaking. I no longer conduct the muster aloud.',
 'This book was already open when I arrived. The last page described my arrival. I tore it out. You are reading what grew in its place.'
 ],margin:'If it knocks a fourth time, do not count it.',alt:'An archival drawing of a submarine corridor whose pipes suggest ribs and gills, an empty writing desk, and a doorway into darkness.'}
];
export function bindJournal({onOpen,onClose}){const dialog=document.querySelector('#journal'),$=s=>dialog.querySelector(s);let page=0;
 function draw(){const e=entries[page];dialog.style.setProperty('--leaf',page);$('#journal-watch').textContent=e.watch;$('#journal-title').textContent=e.title;$('#journal-body').replaceChildren(...e.body.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));$('#journal-margin').textContent=e.margin;$('#journal-art').alt=e.alt;$('#journal-page').textContent=`${e.number} / 03`;$('#journal-prev').disabled=page===0;$('#journal-next').disabled=page===entries.length-1;$('.journal-scroll').scrollTop=0;}
 function turn(direction){page=Math.max(0,Math.min(entries.length-1,page+direction));draw();}
 $('#journal-prev').onclick=()=>turn(-1);$('#journal-next').onclick=()=>turn(1);$('#journal-close').onclick=()=>dialog.close();dialog.addEventListener('close',onClose);dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();turn(1);}if(e.key==='ArrowLeft'){e.preventDefault();turn(-1);}});
 return {open(){onOpen();draw();dialog.showModal();$('#journal-close').focus();},get page(){return page;},get opened(){return dialog.open;}};
}
