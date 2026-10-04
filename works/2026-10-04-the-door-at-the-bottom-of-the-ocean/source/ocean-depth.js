// The voyage is spatially compressed; the instruments retain illustrative depths.
export const WATER_HEIGHT=80;
export const SWIM_CEILING=WATER_HEIGHT+70;
export function soundingAt(y){
  if(y>=65)return 1801+WATER_HEIGHT-y;
  if(y<=15)return 10915-y;
  const t=(65-y)/50;
  // Ease into the local metre-per-unit scale at both ends of the passage.
  return 1816+50*t+9034*t*t*(3-2*t);
}
export function habitatAt(y,current){
  // A small overlap prevents the chart flickering when hovering between stations.
  if(current==='water'&&y<35)return 'floor';
  if(current==='floor'&&y>45)return 'water';
  return current;
}
