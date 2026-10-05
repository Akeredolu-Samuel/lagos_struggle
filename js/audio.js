/* Lagos Run — procedural audio (no files needed): afrobeat-style groove + sfx */
(function () {
  "use strict";
  const LS = (window.LS = window.LS || {});
  const KEY = "lagos-run-muted";
  let actx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === "1"; } catch (e) {}
  let timer = null, nextT = 0, step = 0, tempo = 1, wantMusic = false;

  function ensure() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      const comp = actx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 4;
      master.connect(comp); comp.connect(actx.destination);
      musicBus = actx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
      sfxBus = actx.createGain(); sfxBus.gain.value = 0.95; sfxBus.connect(master);
      const n = actx.sampleRate;
      noiseBuf = actx.createBuffer(1, n, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }

  function tone(f, t, d, type, v, bus, to) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + d + 0.03);
  }
  function noise(t, d, v, bus, hp, bp) {
    const s = actx.createBufferSource(); s.buffer = noiseBuf;
    const f = actx.createBiquadFilter();
    f.type = hp ? "highpass" : "bandpass"; f.frequency.value = hp || bp || 1000;
    const g = actx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t, Math.random() * 0.4); s.stop(t + d + 0.02);
  }

  /* Lagos Struggle theme — one 8-bar anthem, not a playlist. */
  const THEME_BARS = 8;
  const theme = {
    bpm: 106,
    kick: [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
    clap: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
    hat: 0.1, hatHp: 6800,
    openHat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
    bass: {}, bassHold: 2.1, bassV: 0.52,
    log: {},
    stab: { 2:1, 6:1, 10:1, 14:1 }, stabV: 0.04, stabDur: 0.09,
    chords: [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [196, 246.94, 293.66],
      [164.81, 207.65, 246.94],
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [196, 246.94, 329.63],
      [220, 277.18, 329.63],
    ],
    lead: {}, leadV: 0.2, leadHarm: true, leadHold: 1.55,
  };
  (function writeTheme() {
    const roots = [55, 43.65, 49, 41.2, 55, 43.65, 49, 55];
    const passing = [65.41, 55, 73.42, 49, 82.41, 65.41, 73.42, 65.41];
    const hook = [440, 523.25, 659.25, 587.33, 523.25, 659.25, 783.99, 659.25];
    const verse = [659.25, 587.33, 523.25, 440, 523.25, 587.33, 659.25, 523.25];
    const answer = [392, 440, 523.25, 659.25, 587.33, 523.25, 440, 392];
    for (let bar = 0; bar < THEME_BARS; bar++) {
      const root = roots[bar];
      theme.bass[bar * 16] = root;
      theme.bass[bar * 16 + 6] = root * (root < 50 ? 1.5 : 1.25);
      theme.bass[bar * 16 + 8] = root;
      theme.bass[bar * 16 + 14] = passing[bar];
    }
    verse.forEach((n, i) => { theme.lead[i * 4] = n; });
    answer.forEach((n, i) => { theme.lead[64 + i * 4] = n; });
    [32, 96].forEach((start) => {
      hook.forEach((n, i) => { theme.lead[start + i * 2] = n; });
      hook.forEach((n, i) => { theme.lead[start + 16 + i * 2] = n * (i % 4 === 0 ? 1.189 : 1); });
    });
    [36, 44, 52, 60, 100, 108, 116, 124].forEach((s, i) => {
      theme.log[s] = [196, 146.83, 174.61, 130.81][i % 4];
    });
  })();

  function stepDur() { return 60 / (theme.bpm * tempo) / 4; }

  function playStep(i, t) {
    const tr = theme;
    const s16 = i % 16;
    const idx = i % (THEME_BARS * 16);
    const bar = (idx / 16) | 0;
    if (tr.kick[s16]) {
      tone(148, t, 0.14, "sine", 0.86, musicBus, 46);
      tone(62, t, 0.07, "sine", 0.35, musicBus, 38);
    }
    if (tr.clap[s16]) {
      noise(t, 0.1, 0.3, musicBus, 0, 1800);
      tone(190, t, 0.05, "triangle", 0.12, musicBus, 120);
    }
    noise(t, 0.03, (tr.hat || 0.1) * (s16 % 2 ? 0.6 : 1), musicBus, tr.hatHp || 7000);
    if (tr.openHat && tr.openHat[s16]) noise(t, 0.16, 0.11, musicBus, 4200);
    const b = tr.bass[idx];
    if (b) tone(b, t, stepDur() * tr.bassHold, "triangle", tr.bassV, musicBus);
    const log = tr.log[idx];
    if (log) tone(log, t, stepDur() * 2.2, "sine", 0.42, musicBus, Math.max(40, log * 0.52));
    if (tr.stab[s16]) {
      const chord = tr.chords[bar];
      const lift = (bar === 2 || bar === 3 || bar === 6 || bar === 7) ? 1.35 : 1;
      chord.forEach((f) => tone(f, t, tr.stabDur, "square", tr.stabV * lift, musicBus));
    }
    const l = tr.lead[idx];
    if (l) {
      tone(l, t, stepDur() * tr.leadHold, "triangle", tr.leadV, musicBus);
      if (tr.leadHarm) tone(l * 2, t, stepDur() * 0.9, "sine", 0.04, musicBus);
    }
  }

  function scheduler() {
    if (!actx) return;
    if (nextT < actx.currentTime - 0.5) nextT = actx.currentTime + 0.05;
    while (nextT < actx.currentTime + 0.16) {
      playStep(step, nextT);
      nextT += stepDur();
      step = (step + 1) % (THEME_BARS * 16);
    }
  }

  const sfx = (fn) => () => { if (!ensure() || muted) return; fn(actx.currentTime); };

  LS.Audio = {
    unlock() { ensure(); },
    startMusic() {
      wantMusic = true;
      if (!ensure() || timer) return;
      nextT = actx.currentTime + 0.08;
      timer = setInterval(scheduler, 30);
    },
    stopMusic() {
      wantMusic = false;
      if (timer) { clearInterval(timer); timer = null; }
    },
    setTempo(x) { tempo = Math.max(0.9, Math.min(1.28, x)); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 0.9;
      return muted;
    },
    coin: sfx((t) => { tone(1046, t, 0.07, "square", 0.09, sfxBus); tone(1568, t + 0.06, 0.12, "square", 0.08, sfxBus); }),
    jump: sfx((t) => { tone(260, t, 0.16, "triangle", 0.2, sfxBus, 620); }),
    mega: sfx((t) => { tone(200, t, 0.3, "sawtooth", 0.1, sfxBus, 900); tone(400, t, 0.3, "triangle", 0.15, sfxBus, 1200); }),
    roll: sfx((t) => { noise(t, 0.22, 0.25, sfxBus, 0, 700); }),
    land: sfx((t) => { tone(120, t, 0.08, "sine", 0.2, sfxBus, 60); }),
    lane: sfx((t) => { noise(t, 0.07, 0.12, sfxBus, 0, 2500); }),
    power: sfx((t) => { [523, 659, 784, 1046].forEach((f, k) => tone(f, t + k * 0.06, 0.14, "triangle", 0.2, sfxBus)); }),
    smash: sfx((t) => { noise(t, 0.28, 0.5, sfxBus, 0, 500); tone(150, t, 0.2, "sawtooth", 0.2, sfxBus, 50); }),
    hit: sfx((t) => {
      tone(2100, t, 0.045, "square", 0.2, sfxBus, 480);
      tone(3200, t, 0.03, "square", 0.1, sfxBus, 900);
      noise(t, 0.05, 0.55, sfxBus, 3500);
      noise(t, 0.2, 0.4, sfxBus, 0, 420);
      tone(140, t, 0.16, "square", 0.2, sfxBus, 45);
    }),
    whistle: sfx((t) => { tone(2400, t, 0.18, "sine", 0.18, sfxBus, 2900); tone(2900, t + 0.2, 0.3, "sine", 0.18, sfxBus, 2500); }),
    caught: sfx((t) => { tone(400, t, 0.5, "sawtooth", 0.2, sfxBus, 70); noise(t, 0.4, 0.5, sfxBus, 0, 300); }),
    horn: sfx((t) => { tone(310, t, 0.35, "square", 0.08, sfxBus); tone(392, t, 0.35, "square", 0.08, sfxBus); }),
    ui: sfx((t) => { tone(660, t, 0.06, "square", 0.08, sfxBus); }),
    zone: sfx((t) => { [392, 523, 659, 784].forEach((f, k) => tone(f, t + k * 0.09, 0.2, "triangle", 0.16, sfxBus)); }),
  };
})();
