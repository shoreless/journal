// A wall's clock. Moving keeps you in the present; holding still lets time go, slowly at
// first (a day), then faster (a year), then faster than that (a life).
import * as THREE from 'three';
import { smoothstep, lerp, clamp } from './noise.js';

// seconds of stillness -> days per second
const RAMP = [[0, 1 / 300], [2, 1 / 300], [7, 1 / 18], [25, 1 / 18], [33, 1.2], [41, 365 / 45], [88, 365 / 45],
  [118, 365 / 14], [165, 365 / 6], [225, 3650 / 14]];
function ramp(s) {
  for (let i = 1; i < RAMP.length; i++) if (s < RAMP[i][0]) {
    const [s0, v0] = RAMP[i - 1], [s1, v1] = RAMP[i];
    return Math.exp(lerp(Math.log(v0), Math.log(v1), (s - s0) / (s1 - s0)));
  }
  return RAMP[RAMP.length - 1][1];
}

export class WallClock {
  constructor() {
    this.days = 0;            // since you became a wall
    this.start = .40 * 365 + .40;   // late May, mid-morning
    this.still = 0; this.sinceStir = 9; this.speed = 1 / 300;
    this.dayBlend = 0; this.seasonBlend = 0; this.fixed = null; this.maxSpeed = Infinity;
  }
  stir() { this.sinceStir = 0; }
  get awake() { return this.sinceStir < 1.1; }
  update(dt) {
    this.sinceStir += dt;
    if (!this.awake) this.still += dt;
    const target = Math.min(this.maxSpeed, this.awake ? RAMP[0][1] : ramp(this.still));
    const k = 1 - Math.exp(-dt / (target < this.speed ? .35 : 2.2));
    this.speed = Math.exp(lerp(Math.log(this.speed), Math.log(target), k));
    this.days += this.speed * dt;
    const ls = Math.log(this.speed);
    const db = smoothstep(Math.log(1 / 13), Math.log(1 / 3), ls), sb = smoothstep(Math.log(365 / 6), Math.log(3650 / 14), ls) * .72;
    this.dayBlend = lerp(this.dayBlend, db, 1 - Math.exp(-dt / .8));
    this.seasonBlend = lerp(this.seasonBlend, sb, 1 - Math.exp(-dt / 1.5));
  }
  get years() { return this.fixed?.y ?? this.days / 365; }
  get yearPhase() { return this.fixed?.p ?? ((this.days + this.start) / 365) % 1; }
  get dayPhase() { return this.fixed?.d ?? (this.days + this.start) % 1; }
}

const C = (r, g, b) => new THREE.Color(r, g, b);
const K = {
  sunHigh: C(1, .95, .86), sunLow: C(1, .5, .2), moon: C(.4, .52, .85),
  skyDay: C(.52, .66, .62), skyDusk: C(.62, .42, .38), skyNight: C(.03, .05, .1), skyWinter: C(.6, .66, .74),
  groundSummer: C(.12, .2, .06), groundAutumn: C(.26, .16, .06), groundWinter: C(.5, .54, .62), groundNight: C(.01, .015, .03),
  fogDay: C(.4, .52, .4), fogDusk: C(.78, .5, .34), fogNight: C(.012, .022, .045), fogWinter: C(.66, .7, .76), fogAutumn: C(.62, .55, .4)
};

// Everything the wood needs to know about the moment, from three numbers.
export function climate(clock, env) {
  const p = clock.yearPhase, sb = clock.fixed ? 0 : clock.seasonBlend, db = clock.fixed ? 0 : clock.dayBlend;
  const s = (v, summer) => lerp(v, summer, sb);        // at the speed of decades the seasons run together
  const hard = Math.min(1, sb * 1.36), s2 = (v, summer) => lerp(v, summer, hard);   // snow and bare branches drop out entirely
  env.years = clock.years; env.yearPhase = p;
  const summer = .5 - .5 * Math.cos(2 * Math.PI * (p - .03));
  env.summer = summer;
  env.leaf = s2(smoothstep(.24, .37, p) * (1 - smoothstep(.77, .91, p)), .9);
  env.spring = s(smoothstep(.22, .3, p) * (1 - smoothstep(.36, .5, p)), 0);
  env.autumn = s(smoothstep(.66, .8, p), .12);
  env.snow = s2(Math.max(smoothstep(.925, .985, p), 1 - smoothstep(.09, .185, p)), 0);
  env.snowfall = s(Math.max(smoothstep(.9, .94, p), 1 - smoothstep(.04, .09, p)), 0) * (1 - sb);
  env.leafFall = s(smoothstep(.75, .8, p) * (1 - smoothstep(.87, .92, p)), 0) * (1 - sb);
  env.fresh = s2(p > .5 ? smoothstep(.76, .9, p) : 1 - smoothstep(.14, .45, p), .25);
  env.rot = s(p > .5 ? smoothstep(.9, 1.2, p) : smoothstep(-.1, .2, p), 1);   // this year's leaves go brown under the snow
  env.fern = s2(smoothstep(.27, .42, p) * (1 - smoothstep(.86, .95, p)), .95);
  env.fernBrown = s(p > .5 ? smoothstep(.72, .84, p) : 1 - smoothstep(.2, .3, p), .05);
  env.growth = clamp(.05 + .95 * (1 - Math.exp(-env.years / 9)));
  env.lichen = .3 + .7 * (1 - Math.exp(-env.years / 5));

  // The sun. At speed, the days blur into one long afternoon.
  const d = clock.dayPhase;
  const e = lerp(Math.sin((d - .25) * 2 * Math.PI), .82, db);
  const top = lerp(26, 60, summer) * Math.PI / 180;
  const elev = e * top, az = lerp((d - .5) * Math.PI * 1.15, .42, db) - .5;
  const day = smoothstep(-.1, .14, e), high = smoothstep(.05, .55, e);
  env.day = day; env.night = 1 - smoothstep(-.3, -.08, e);
  if (e > -.1) env.sunDir.set(-Math.sin(az) * Math.cos(elev), Math.sin(Math.max(elev, .03)), -Math.cos(az) * Math.cos(elev)).normalize();
  else env.sunDir.set(.5, .72, .35).normalize();        // the moon keeps to one place; nobody will check
  const winter = env.snow, aut = env.autumn * (1 - winter);
  env.sunCol.copy(K.sunLow).lerp(K.sunHigh, high);
  env.sunInt = day * lerp(1.4, 3.4, high) * lerp(1, .8, winter);
  if (e <= -.1) { env.sunCol.copy(K.moon); env.sunInt = env.night * lerp(.22, .34, winter); }
  env.glow = day * lerp(.35, 1, high);
  env.sky.copy(K.skyNight).lerp(K.skyDusk, smoothstep(-.3, .05, e)).lerp(K.skyDay.clone().lerp(K.skyWinter, winter), high);
  env.ground.copy(K.groundSummer).lerp(K.groundAutumn, aut).lerp(K.groundWinter, winter).lerp(K.groundNight, 1 - day);
  env.hemiInt = lerp(.11, lerp(.95, 1.25, winter), day);
  env.fog.copy(K.fogNight).lerp(K.fogDusk, smoothstep(-.3, .08, e))
    .lerp(K.fogDay.clone().lerp(K.fogAutumn, aut * .8).lerp(K.fogWinter, winter), high);
  const mist = (1 - high) * day;     // mornings and evenings hang in the air
  env.fogDensity = .03 + .03 * mist + .012 * winter + .01 * aut;
  env.wet = clamp(mist * .6 + env.spring * .3);
  env.motes = day * (1 - winter) * (.35 + .65 * summer);
  env.firefly = env.night * smoothstep(.72, .9, summer) * (1 - db);
  env.shafts = day * (.3 + mist * 1.4 + aut * .3) * (1 - .5 * winter);
  env.exposure = lerp(1.5, 1.0, day) * lerp(1, .88, winter);
  env.wind = .45 + .35 * Math.sin(clock.days * 3.1) * (1 - db) + .25 * aut;
  return env;
}

export function makeEnv() {
  return { sunDir: new THREE.Vector3(0, 1, 0), sunCol: C(1, 1, 1), sky: C(0, 0, 0), ground: C(0, 0, 0), fog: C(0, 0, 0) };
}

export function caption(years) {
  const days = years * 365;
  if (days < 1) return 'a wall since this morning';
  if (days < 2) return 'a wall for a day';
  if (days < 60) return `a wall for ${Math.floor(days)} days`;
  if (years < 1) return `a wall for ${Math.floor(days / 30.4)} months`;
  if (years < 2) return 'a wall for a year';
  return `a wall for ${Math.floor(years)} years`;
}
