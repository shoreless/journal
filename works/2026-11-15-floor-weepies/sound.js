// A zip, a room, and the quiet inside the wool. All synthesised.
export function buildSound() {
  let ctx = null, master, muffle, pad, padGain, room, on = false, noiseBuf;
  function start() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    muffle = ctx.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 9000; muffle.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    room = ctx.createGain(); room.gain.value = .035; n.connect(f); f.connect(room); room.connect(muffle); n.start();
    // the feeling of being in it: a low fifth that breathes
    padGain = ctx.createGain(); padGain.gain.value = 0; padGain.connect(master);
    pad = [110, 164.81, 220.4, 329.2].map((hz, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = hz; g.gain.value = [.5, .32, .2, .07][i];
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = .09 + i * .037; lg.gain.value = g.gain.value * .45;
      l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(padGain); o.start(); l.start(); return o;
    });
  }
  return {
    get on() { return on; },
    toggle() {
      if (!ctx) start();
      on = !on; if (on) ctx.resume();
      master.gain.setTargetAtTime(on ? .8 : 0, ctx.currentTime, .3);
      return on;
    },
    // one tooth letting go, or catching
    tick(speed, inside) {
      if (!ctx || !on) return;
      const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.value = (inside ? 1500 : 2800) + Math.min(2500, speed * 1400) + Math.random() * 500;
      g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(1e-3, t + .022);
      s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.5, .03);
    },
    update(inside, snug) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      muffle.frequency.setTargetAtTime(inside ? 9000 - 8300 * snug : 9000, t, .3);
      padGain.gain.setTargetAtTime(inside ? .02 + .11 * snug : 0, t, 1.2);
    }
  };
}
