import * as THREE from 'three';
// Seeded material maps: broad stains, fine pits, and uneven roughness.
export function materialMaps(kind,seed=1){const size=256,colors=new Uint8Array(size*size*4),relief=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
 const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7+seed*71.3)*43758.5453;return n-Math.floor(n);};
 const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);};
 const palette=kind==='ground'?[105,119,109]:kind==='wood'?[95,112,92]:kind==='skin'?[123,103,114]:[139,140,107];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size,v=y/size,n=noise(u*7,v*7)*.54+noise(u*19,v*19)*.28+noise(u*65,v*65)*.18,grit=hash(x,y),stain=noise(u*3,v*5),crease=kind==='wood'?Math.pow(.5+.5*Math.sin(u*220+noise(u*11,v*6)*8),10):Math.pow(.5+.5*Math.sin(u*73+v*23+noise(u*12,v*12)*12),24);const pit=grit>.965?.55:1;const value=(.3+n*.95)*(stain<.35?.6:1)*pit-(kind==='ground'?.08:.17)*crease;const i=(y*size+x)*4;
  for(let c=0;c<3;c++){colors[i+c]=Math.max(0,Math.min(255,palette[c]*value+(c===0?12:0)*stain));relief[i+c]=Math.max(0,Math.min(255,80+n*140-crease*50-(pit<1?55:0)));rough[i+c]=145+noise(u*13,v*13)*105;}colors[i+3]=relief[i+3]=rough[i+3]=255;
 }
 const texture=data=>{const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};const map=texture(colors);map.colorSpace=THREE.SRGBColorSpace;return {map,bumpMap:texture(relief),roughnessMap:texture(rough)};
}
