// The wood, synthesised: wind in whatever leaves there are, birds by day, crickets on
// summer nights, and now and then a stone coming down. No recordings.
export function buildSound() {
  let ctx = null, master, wind, rustle, windGain, rustleGain, nextBird = 0, nextCricket = 0, on = false;

  function noise(seconds) {
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = last * .6 + (Math.random() * 2 - 1) * .4; d[i] = last; }
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; return s;
  }
  function start() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const echo = ctx.createDelay(1); echo.delayTime.value = .19;
    const fb = ctx.createGain(); fb.gain.value = .28; echo.connect(fb); fb.connect(echo); echo.connect(master);
    master.echo = echo;
    wind = ctx.createBiquadFilter(); wind.type = 'bandpass'; wind.frequency.value = 320; wind.Q.value = .5;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    const n1 = noise(5); n1.connect(wind); wind.connect(windGain); windGain.connect(master); n1.start();
    rustle = ctx.createBiquadFilter(); rustle.type = 'highpass'; rustle.frequency.value = 2600;
    rustleGain = ctx.createGain(); rustleGain.gain.value = 0;
    const n2 = noise(4); n2.connect(rustle); rustle.connect(rustleGain); rustleGain.connect(master); n2.start();
  }
  function voice(freq, t, dur, gain, pan, sweep = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(50, freq * (1 + sweep)), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + dur * .25); g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    p.pan.value = pan; o.connect(g); g.connect(p); p.connect(master); p.connect(master.echo);
    o.start(t); o.stop(t + dur + .02);
  }
  function bird(t) {
    const base = 2200 + Math.random() * 2600, pan = Math.random() * 1.6 - .8, far = .25 + Math.random() * .75;
    const n = 2 + Math.floor(Math.random() * 5), kind = Math.random();
    for (let i = 0; i < n; i++) {
      const f = base * (kind < .5 ? 1 + .12 * Math.sin(i * 1.7) : 1 - i * .04);
      voice(f, t + i * (.09 + (kind < .5 ? .05 : 0)), .07 + Math.random() * .05, .035 * far, pan, kind < .5 ? .25 : -.2);
    }
  }
  function cricket(t) {
    const pan = Math.random() * 1.6 - .8, f = 4100 + Math.random() * 500;
    for (let i = 0; i < 3; i++) voice(f, t + i * .055, .035, .012, pan);
  }
  return {
    get on() { return on; },
    toggle() {
      if (!ctx) start();
      on = !on; if (on) ctx.resume();
      master.gain.setTargetAtTime(on ? .7 : 0, ctx.currentTime, .4);
      return on;
    },
    update(env, fast) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      windGain.gain.setTargetAtTime(.1 + .22 * env.wind + .08 * env.snow, t, .8);
      wind.frequency.setTargetAtTime(240 + 260 * env.wind, t, 1.5);
      rustleGain.gain.setTargetAtTime(env.leaf * (.012 + .05 * env.wind), t, .8);
      const birds = env.day * (1 - env.snow) * (.25 + .75 * Math.max(env.leaf, env.spring));
      if (t > nextBird) { if (Math.random() < birds) bird(t + .05); nextBird = t + .25 + Math.random() * (fast ? 1.2 : 2.6); }
      if (t > nextCricket) { if (Math.random() < env.firefly) cricket(t + .05); nextCricket = t + .3 + Math.random() * .5; }
    },
    thud() {
      if (!ctx || !on) return;
      const t = ctx.currentTime + .75;
      for (const [f, g] of [[70, .5], [128, .25]]) voice(f, t, .22, g, .2, -.5);
      voice(900, t, .04, .05, .2, -.7);
    }
  };
}
