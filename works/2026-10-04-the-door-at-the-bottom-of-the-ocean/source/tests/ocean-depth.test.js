import test from 'node:test';
import assert from 'node:assert/strict';
import {soundingAt,habitatAt,WATER_HEIGHT,SWIM_CEILING} from '../ocean-depth.js';

test('the entire descent has a continuous, increasing sounding',()=>{
 assert.equal(soundingAt(WATER_HEIGHT+1),1800);
 assert.equal(soundingAt(-5),10920);
 let previous=soundingAt(SWIM_CEILING);
 for(let y=SWIM_CEILING-.1;y>=-15;y-=.1){const depth=soundingAt(y);assert(depth>previous);assert(depth-previous<28);previous=depth;}
 for(const boundary of [65,15])assert(Math.abs(soundingAt(boundary+.0001)-soundingAt(boundary-.0001))<.001);
});
test('station changes work both ways and do not chatter near the boundary',()=>{
 assert.equal(habitatAt(34,'water'),'floor');
 assert.equal(habitatAt(40,'floor'),'floor');
 assert.equal(habitatAt(46,'floor'),'water');
 assert.equal(habitatAt(40,'water'),'water');
});
