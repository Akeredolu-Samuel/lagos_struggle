(() => {
  "use strict";

  // Classic phone runner (first-version look): fixed 480×720, small sprites, 3 lanes

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = 480;
  const H = 720;

  const $ = (id) => document.getElementById(id);
  const overlay = $("overlay");
  const gameoverEl = $("gameover");
  const pauseScreen = $("pause");
  const hud = $("hud");
  const powerBar = $("power-bar");
  const eventBanner = $("event-banner");

  const LANES = 3;
  const LANE_X = [W * 0.22, W * 0.5, W * 0.78];
  const GROUND_Y = H * 0.78;
  const PLAYER_Y = GROUND_Y - 10;

  const CHARACTERS = [
    { id: "runner", name: "Street Runner", desc: "Balanced hustler", emoji: "🏃", skin: "#8d5524", shirt: "#0b8f4e", pants: "#1a2744", accent: "#fff", shoes: "#f5f5f5" },
    { id: "conductor", name: "Danfo Conductor", desc: "Sharp eyes", emoji: "🚌", skin: "#6b3f1e", shirt: "#ffd60a", pants: "#111", accent: "#111", shoes: "#222" },
    { id: "student", name: "LASU Student", desc: "Backpack dreams", emoji: "🎓", skin: "#a67c52", shirt: "#1e90ff", pants: "#2c3e50", accent: "#fff", shoes: "#e74c3c" },
    { id: "suya", name: "Suya Man", desc: "Spice & speed", emoji: "🍢", skin: "#5c3317", shirt: "#c0392b", pants: "#3d2914", accent: "#ffd60a", shoes: "#8b4513" },
  ];

  const DEATH_LINES = [
    "Wahala don catch you.",
    "Danfo no gree stop!",
    "You no look road well.",
    "Okada fly pass your head.",
    "Pothole swallow you small.",
    "Police checkpoint no be joke.",
    "Lagos go humble anybody.",
    "Area boys collect your phone!",
  ];

  const BILLBOARDS = ["GALA", "PEAK MILK", "INDOMIE", "MTN", "BET9JA", "JOLLOF", "PURE WATER"];
  const STORAGE_KEY = "lagos-struggle-best-v3";
  const CHAR_KEY = "lagos-struggle-char";

  // —— Audio ——
  const AudioFX = (() => {
    let actx = null;
    let musicTimer = null;
    let step = 0;
    function ensure() {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        actx = new AC();
      }
      if (actx.state === "suspended") actx.resume();
      return actx;
    }
    function beep(freq, dur, type, vol, slide) {
      const a = ensure();
      if (!a) return;
      const t0 = a.currentTime;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
      g.gain.setValueAtTime(vol || 0.07, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    }
    function noise(dur, vol) {
      const a = ensure();
      if (!a) return;
      const n = Math.floor(a.sampleRate * dur);
      const buf = a.createBuffer(1, n, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = a.createBufferSource();
      src.buffer = buf;
      const g = a.createGain();
      g.gain.value = vol || 0.05;
      src.connect(g); g.connect(a.destination);
      src.start();
    }
    return {
      unlock: () => ensure(),
      coin: () => beep(880, 0.07, "square", 0.05, 1400),
      jump: () => beep(240, 0.1, "triangle", 0.06, 480),
      roll: () => noise(0.08, 0.04),
      power: () => { beep(440, 0.08, "sine", 0.06); setTimeout(() => beep(660, 0.1, "sine", 0.06), 70); },
      crash: () => { noise(0.2, 0.1); beep(110, 0.25, "sawtooth", 0.07, 40); },
      lane: () => beep(320, 0.04, "square", 0.025),
      startMusic() {
        const a = ensure();
        if (!a || musicTimer) return;
        const bass = [98, 98, 110, 98, 87, 87, 98, 110];
        musicTimer = setInterval(() => {
          if (!actx) return;
          const f = bass[step++ % bass.length];
          const o = actx.createOscillator();
          const g = actx.createGain();
          o.type = "triangle";
          o.frequency.value = f;
          g.gain.setValueAtTime(0.025, actx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.25);
          o.connect(g); g.connect(actx.destination);
          o.start(); o.stop(actx.currentTime + 0.28);
        }, 220);
      },
      stopMusic() {
        if (musicTimer) clearInterval(musicTimer);
        musicTimer = null;
      },
    };
  })();

  let state = "menu";
  let selectedChar = CHARACTERS.find((c) => c.id === localStorage.getItem(CHAR_KEY)) || CHARACTERS[0];
  let score = 0, coinsGot = 0, best = Number(localStorage.getItem(STORAGE_KEY) || 0);
  let distance = 0, speed = 260, mult = 1, time = 0, shake = 0;
  let spawnTimer = 0, coinTimer = 0, powerTimer = 0, eventTimer = 0;
  let bgOffset = 0, roadOffset = 0;
  let floatTexts = [], particles = [], obstacles = [], coins = [], powerups = [];
  let powers = { shield: 0, suya: 0, magnet: 0, x2: 0 };
  let event = null;
  let buildings = [], clouds = [];
  let billboard = { text: BILLBOARDS[0], x: W + 40, y: 120 };

  const player = {
    lane: 1, targetLane: 1, x: LANE_X[1], y: PLAYER_Y,
    w: 28, h: 42, jumpT: -1, rollT: -1, runFrame: 0, invuln: 0,
  };

  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function formatN(n) { return Math.floor(n).toLocaleString("en-NG"); }

  function buildCharGrid() {
    const grid = $("char-grid");
    grid.innerHTML = "";
    CHARACTERS.forEach((ch) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "char-card" + (ch.id === selectedChar.id ? " selected" : "");
      el.innerHTML = `<div class="char-preview">${ch.emoji}</div><strong>${ch.name}</strong><span>${ch.desc}</span>`;
      el.onclick = () => {
        selectedChar = ch;
        localStorage.setItem(CHAR_KEY, ch.id);
        buildCharGrid();
        AudioFX.lane();
      };
      grid.appendChild(el);
    });
  }
  buildCharGrid();

  function seedDecor() {
    buildings = [];
    for (let i = 0; i < 8; i++) {
      buildings.push({
        x: i * 70 + Math.random() * 20,
        w: 28 + Math.random() * 36,
        h: 50 + Math.random() * 90,
        color: pick(["#2a3550", "#243048", "#33405f", "#1e2a42", "#3a2f28"]),
      });
    }
    clouds = [];
    for (let i = 0; i < 4; i++) {
      clouds.push({ x: Math.random() * W, y: 40 + Math.random() * 70, s: 0.5 + Math.random() * 0.5 });
    }
  }

  function updateHud() {
    $("score").textContent = formatN(score);
    $("best").textContent = formatN(best);
    $("dist").textContent = Math.floor(distance);
    $("mult").textContent = String(mult);
    powerBar.innerHTML = "";
    const map = [
      ["shield", "💧 Shield", powers.shield],
      ["suya", "🍢 Suya", powers.suya],
      ["magnet", "🧲 Magnet", powers.magnet],
      ["x2", "⚡ x2", powers.x2],
    ];
    let any = false;
    for (const [, label, t] of map) {
      if (t <= 0) continue;
      any = true;
      const d = document.createElement("div");
      d.className = "power-pill";
      d.textContent = `${label} ${Math.ceil(t)}s`;
      powerBar.appendChild(d);
    }
    powerBar.classList.toggle("hidden", !any || state !== "playing");
  }

  function showEvent(text, dur) {
    event = { t: dur };
    eventBanner.textContent = text;
    eventBanner.classList.remove("hidden");
  }
  function clearEvent() {
    event = null;
    eventBanner.classList.add("hidden");
  }

  function resetGame() {
    score = 0; coinsGot = 0; distance = 0; speed = 260; mult = 1;
    time = 0; shake = 0;
    spawnTimer = 0.8; coinTimer = 1; powerTimer = 12; eventTimer = 25;
    bgOffset = 0; roadOffset = 0;
    floatTexts = []; particles = []; obstacles = []; coins = []; powerups = [];
    powers = { shield: 0, suya: 0, magnet: 0, x2: 0 };
    clearEvent();
    player.lane = 1; player.targetLane = 1; player.x = LANE_X[1]; player.y = PLAYER_Y;
    player.jumpT = -1; player.rollT = -1; player.runFrame = 0; player.invuln = 0;
    billboard = { text: pick(BILLBOARDS), x: W + 60, y: 110 };
    seedDecor();
    // starter coins
    for (let i = 0; i < 5; i++) {
      coins.push({ lane: 1, x: LANE_X[1], y: -30 - i * 40, r: 9, value: 100, spin: 0, got: false });
    }
    updateHud();
  }

  function startGame() {
    AudioFX.unlock();
    AudioFX.startMusic();
    resetGame();
    state = "playing";
    overlay.classList.add("hidden");
    gameoverEl.classList.add("hidden");
    pauseScreen.classList.add("hidden");
    hud.classList.remove("hidden");
  }

  function showMenu() {
    AudioFX.stopMusic();
    state = "menu";
    overlay.classList.remove("hidden");
    gameoverEl.classList.add("hidden");
    pauseScreen.classList.add("hidden");
    hud.classList.add("hidden");
    powerBar.classList.add("hidden");
    clearEvent();
  }

  function die(reason) {
    if (state !== "playing") return;
    if (powers.shield > 0) {
      powers.shield = 0;
      player.invuln = 1;
      floatTexts.push({ x: player.x, y: player.y - 40, text: "SHIELD!", life: 0.8 });
      updateHud();
      return;
    }
    state = "dead";
    shake = 10;
    AudioFX.crash();
    AudioFX.stopMusic();
    best = Math.max(best, score);
    localStorage.setItem(STORAGE_KEY, String(best));
    $("final-score").textContent = formatN(score);
    $("final-dist").textContent = Math.floor(distance);
    $("final-best").textContent = formatN(best);
    $("final-coins").textContent = String(coinsGot);
    $("death-line").textContent = reason || pick(DEATH_LINES);
    gameoverEl.classList.remove("hidden");
    powerBar.classList.add("hidden");
  }

  function setLane(l) {
    const n = Math.max(0, Math.min(2, l));
    if (n !== player.targetLane) {
      player.targetLane = n;
      AudioFX.lane();
    }
  }
  function jump() {
    if (state !== "playing") return;
    if (player.jumpT < 0 && player.rollT < 0) {
      player.jumpT = 0;
      AudioFX.jump();
    }
  }
  function roll() {
    if (state !== "playing") return;
    if (player.rollT < 0 && player.jumpT < 0) {
      player.rollT = 0;
      AudioFX.roll();
    }
  }

  window.addEventListener("keydown", (e) => {
    const c = e.code;
    if (c === "ArrowLeft" || c === "KeyA") { e.preventDefault(); if (state === "playing") setLane(player.targetLane - 1); }
    else if (c === "ArrowRight" || c === "KeyD") { e.preventDefault(); if (state === "playing") setLane(player.targetLane + 1); }
    else if (c === "ArrowUp" || c === "Space" || c === "KeyW") { e.preventDefault(); jump(); }
    else if (c === "ArrowDown" || c === "KeyS") { e.preventDefault(); roll(); }
    else if (c === "Escape" || c === "KeyP") {
      e.preventDefault();
      if (state === "playing") { state = "paused"; pauseScreen.classList.remove("hidden"); AudioFX.stopMusic(); }
      else if (state === "paused") { state = "playing"; pauseScreen.classList.add("hidden"); AudioFX.startMusic(); }
    } else if (c === "Enter") {
      if (state === "menu" || state === "dead") startGame();
    }
  });

  let tSX = 0, tSY = 0;
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    AudioFX.unlock();
    const t = e.changedTouches[0];
    tSX = t.clientX; tSY = t.clientY;
  }, { passive: false });
  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (state !== "playing") return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tSX, dy = t.clientY - tSY;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
      const rect = canvas.getBoundingClientRect();
      if ((t.clientY - rect.top) / rect.height < 0.55) jump();
      else roll();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) setLane(player.targetLane + (dx > 0 ? 1 : -1));
    else if (dy < 0) jump();
    else roll();
  }, { passive: false });

  $("btn-start").onclick = () => { AudioFX.unlock(); startGame(); };
  $("btn-retry").onclick = startGame;
  $("btn-home").onclick = showMenu;
  $("btn-resume").onclick = () => { state = "playing"; pauseScreen.classList.add("hidden"); AudioFX.startMusic(); };
  $("btn-quit").onclick = showMenu;

  function spawnObstacle() {
    const types = [
      { type: "danfo", w: 48, h: 36, jump: false, roll: false },
      { type: "okada", w: 32, h: 28, jump: true, roll: false },
      { type: "pothole", w: 34, h: 14, jump: true, roll: false },
      { type: "keke", w: 40, h: 30, jump: false, roll: false },
      { type: "checkpoint", w: 42, h: 34, jump: false, roll: false },
      { type: "gen", w: 30, h: 26, jump: true, roll: false },
      { type: "banner", w: 50, h: 22, jump: false, roll: true, high: true },
      { type: "areaboy", w: 26, h: 34, jump: false, roll: true },
    ];
    const t = pick(types);
    const lane = (Math.random() * 3) | 0;
    if (obstacles.some((o) => o.lane === lane && o.y < 50)) return;

    obstacles.push({
      type: t.type, lane, x: LANE_X[lane], y: -50,
      w: t.w, h: t.h, jump: t.jump, roll: t.roll, high: !!t.high, passed: false,
    });

    if (speed > 340 && Math.random() < 0.25) {
      let l2 = (lane + 1 + ((Math.random() * 2) | 0)) % 3;
      if (l2 === lane) l2 = (lane + 1) % 3;
      const t2 = pick(types);
      obstacles.push({
        type: t2.type, lane: l2, x: LANE_X[l2], y: -50 - Math.random() * 30,
        w: t2.w, h: t2.h, jump: t2.jump, roll: t2.roll, high: !!t2.high, passed: false,
      });
    }
  }

  function spawnCoins() {
    const lane = (Math.random() * 3) | 0;
    const n = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      coins.push({
        lane, x: LANE_X[lane], y: -40 - i * 32,
        r: 9, value: pick([100, 100, 200, 500]), spin: Math.random() * 6, got: false,
      });
    }
  }

  function spawnPower() {
    const kind = pick(["shield", "suya", "magnet", "x2"]);
    const lane = (Math.random() * 3) | 0;
    powerups.push({ kind, lane, x: LANE_X[lane], y: -40, got: false });
  }

  function update(dt) {
    time += dt;
    if (shake > 0) shake = Math.max(0, shake - dt * 30);

    if (state === "menu") {
      player.runFrame += dt * 8;
      roadOffset += 60 * dt;
      bgOffset += 15 * dt;
      return;
    }
    if (state !== "playing") return;

    let spd = speed;
    if (powers.suya > 0) spd *= 1.35;
    if (event) spd *= 0.7;

    speed = Math.min(420, 260 + distance * 0.4);
    distance += (spd * dt) / 16;

    mult = 1;
    if (powers.x2 > 0) mult *= 2;
    if (powers.suya > 0) mult = Math.max(mult, 2);

    for (const k of Object.keys(powers)) {
      if (powers[k] > 0) powers[k] = Math.max(0, powers[k] - dt);
    }
    if (event) {
      event.t -= dt;
      if (event.t <= 0) clearEvent();
    }

    bgOffset += spd * 0.12 * dt;
    roadOffset += spd * dt;
    player.runFrame += dt * (spd / 45);

    // Lane slide
    const tx = LANE_X[player.targetLane];
    player.x += (tx - player.x) * Math.min(1, 14 * dt);
    if (Math.abs(player.x - tx) < 1) {
      player.x = tx;
      player.lane = player.targetLane;
    }

    // Jump
    if (player.jumpT >= 0) {
      player.jumpT += dt;
      const p = player.jumpT / 0.52;
      if (p >= 1) { player.jumpT = -1; player.y = PLAYER_Y; }
      else player.y = PLAYER_Y - Math.sin(p * Math.PI) * 72;
    } else if (player.rollT < 0) {
      player.y = PLAYER_Y;
    }

    // Roll
    if (player.rollT >= 0) {
      player.rollT += dt;
      if (player.rollT >= 0.45) player.rollT = -1;
    }

    if (player.invuln > 0) player.invuln -= dt;

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = Math.max(0.65, 1.25 - distance * 0.002) + Math.random() * 0.2;
    }
    coinTimer -= dt;
    if (coinTimer <= 0) {
      spawnCoins();
      coinTimer = 0.9 + Math.random() * 0.9;
    }
    powerTimer -= dt;
    if (powerTimer <= 0) {
      spawnPower();
      powerTimer = 14 + Math.random() * 10;
    }
    eventTimer -= dt;
    if (eventTimer <= 0 && !event) {
      showEvent(pick(["🌧️ LAGOS RAIN!", "🚦 GO-SLOW!", "⛽ FUEL BONUS x2!"]), 8);
      eventTimer = 28 + Math.random() * 20;
    }

    const vy = spd;

    for (const o of obstacles) {
      o.y += vy * dt;
      o.x = LANE_X[o.lane];
      if (!o.passed && o.y > player.y) {
        o.passed = true;
        score += 20 * mult;
      }
    }
    obstacles = obstacles.filter((o) => o.y < H + 60);

    for (const c of coins) {
      c.y += vy * dt;
      if (powers.magnet > 0 && c.y > 200) {
        c.x += (player.x - c.x) * 8 * dt;
        c.y += (player.y - 30 - c.y) * 4 * dt;
      } else {
        c.x = LANE_X[c.lane];
      }
      c.spin += dt * 6;
    }

    // Coin collect
    for (const c of coins) {
      if (c.got) continue;
      if (Math.hypot(c.x - player.x, c.y - (player.y - 20)) < 22) {
        c.got = true;
        const v = c.value * mult;
        score += v;
        coinsGot++;
        AudioFX.coin();
        floatTexts.push({ x: c.x, y: c.y, text: `+₦${v}`, life: 0.7 });
      }
    }
    coins = coins.filter((c) => !c.got && c.y < H + 30);

    for (const p of powerups) {
      p.y += vy * dt;
      p.x = LANE_X[p.lane];
      if (!p.got && Math.hypot(p.x - player.x, p.y - (player.y - 20)) < 26) {
        p.got = true;
        const d = { shield: 7, suya: 5, magnet: 7, x2: 8 };
        powers[p.kind] = Math.max(powers[p.kind], d[p.kind]);
        AudioFX.power();
        floatTexts.push({ x: p.x, y: p.y, text: p.kind.toUpperCase() + "!", life: 0.9 });
      }
    }
    powerups = powerups.filter((p) => !p.got && p.y < H + 30);

    // Collisions
    const jumping = player.jumpT >= 0 && player.y < PLAYER_Y - 18;
    const rolling = player.rollT >= 0;
    const pBox = {
      x: player.x,
      y: player.y,
      w: rolling ? 22 : 18,
      h: rolling ? 18 : 30,
    };

    for (const o of obstacles) {
      if (Math.abs(o.y - player.y) > 40) continue;
      if (Math.abs(o.x - player.x) > (o.w * 0.35 + 12)) continue;
      if (o.jump && jumping) continue;
      if (o.roll && rolling) continue;
      if (o.high && rolling) continue;
      if (player.invuln > 0) continue;

      const reasons = {
        danfo: "Danfo no gree stop!",
        okada: "Okada fly pass your head.",
        pothole: "Pothole swallow you small.",
        keke: "Keke napep jam you!",
        checkpoint: "Police checkpoint no be joke.",
        gen: "Generator block the road!",
        banner: "You no roll under am!",
        areaboy: "Area boys collect your phone!",
      };
      die(reasons[o.type] || pick(DEATH_LINES));
      break;
    }

    billboard.x -= spd * 0.3 * dt;
    if (billboard.x < -100) {
      billboard.x = W + 40;
      billboard.text = pick(BILLBOARDS);
      billboard.y = 100 + Math.random() * 30;
    }

    for (const b of buildings) {
      b.x -= spd * 0.1 * dt;
      if (b.x + b.w < 0) {
        b.x = W + Math.random() * 30;
        b.w = 28 + Math.random() * 36;
        b.h = 50 + Math.random() * 90;
      }
    }
    for (const c of clouds) {
      c.x -= spd * 0.03 * dt;
      if (c.x < -60) { c.x = W + 20; c.y = 40 + Math.random() * 70; }
    }

    for (const f of floatTexts) { f.life -= dt; f.y -= 30 * dt; }
    floatTexts = floatTexts.filter((f) => f.life > 0);

    updateHud();
  }

  // ════════ DRAW ════════
  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    drawSky();
    drawCity();
    drawRoad();
    drawBillboard();

    const items = [
      ...coins.map((c) => ({ z: c.y, fn: () => drawCoin(c) })),
      ...powerups.map((p) => ({ z: p.y, fn: () => drawPowerup(p) })),
      ...obstacles.map((o) => ({ z: o.y, fn: () => drawObstacle(o) })),
      { z: player.y, fn: () => drawPlayer() },
    ].sort((a, b) => a.z - b.z);
    items.forEach((i) => i.fn());

    for (const f of floatTexts) {
      ctx.globalAlpha = Math.max(0, f.life * 1.4);
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.font = "bold 13px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    if (state === "playing" && powers.shield > 0) {
      ctx.strokeStyle = `rgba(78,205,196,${0.5 + Math.sin(time * 8) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 22, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    g.addColorStop(0, "#1a2744");
    g.addColorStop(0.5, "#3d4a6b");
    g.addColorStop(0.8, "#c47b3a");
    g.addColorStop(1, "#e8a045");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const sg = ctx.createRadialGradient(W * 0.75, H * 0.38, 4, W * 0.75, H * 0.38, 55);
    sg.addColorStop(0, "rgba(255,230,150,0.9)");
    sg.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(W * 0.75, H * 0.38, 55, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (const c of clouds) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 22 * c.s, 10 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + 14 * c.s, c.y + 2, 16 * c.s, 9 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCity() {
    const base = GROUND_Y - 100;
    for (const b of buildings) {
      ctx.fillStyle = b.color;
      const y = base - b.h * 0.35;
      ctx.fillRect(b.x, y, b.w, b.h * 0.35 + 16);
      ctx.fillStyle = "rgba(255,210,80,0.3)";
      for (let wy = y + 6; wy < y + b.h * 0.3; wy += 10) {
        for (let wx = b.x + 4; wx < b.x + b.w - 6; wx += 8) {
          ctx.fillRect(wx, wy, 4, 5);
        }
      }
    }
    // palms
    for (let i = 0; i < 3; i++) {
      const px = ((i * 160 - bgOffset * 0.4) % (W + 60)) - 30;
      drawPalm(px, GROUND_Y - 88);
    }
  }

  function drawPalm(x, y) {
    ctx.strokeStyle = "#3d2a18";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y + 40);
    ctx.quadraticCurveTo(x + 3, y + 16, x - 1, y);
    ctx.stroke();
    ctx.fillStyle = "#2d6a3e";
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.45;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 14, y + Math.sin(a) * 8, 14, 5, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRoad() {
    ctx.fillStyle = "#3a3428";
    ctx.fillRect(0, GROUND_Y - 60, W, H - (GROUND_Y - 60));

    ctx.fillStyle = "#2c3038";
    ctx.beginPath();
    ctx.moveTo(W * 0.1, H);
    ctx.lineTo(W * 0.3, GROUND_Y - 60);
    ctx.lineTo(W * 0.7, GROUND_Y - 60);
    ctx.lineTo(W * 0.9, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,214,10,0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 14]);
    ctx.lineDashOffset = -roadOffset * 0.12;
    for (const d of [0.4, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(W * d, GROUND_Y - 56);
      ctx.lineTo(W * (0.5 + (d - 0.5) * 1.5), H);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.3, GROUND_Y - 60);
    ctx.lineTo(W * 0.1, H);
    ctx.moveTo(W * 0.7, GROUND_Y - 60);
    ctx.lineTo(W * 0.9, H);
    ctx.stroke();
  }

  function drawBillboard() {
    const x = billboard.x, y = billboard.y;
    ctx.fillStyle = "#555";
    ctx.fillRect(x + 36, y + 22, 4, 50);
    ctx.fillStyle = "#ffd60a";
    ctx.fillRect(x, y, 76, 26);
    ctx.fillStyle = "#111";
    ctx.font = "bold 10px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(billboard.text, x + 38, y + 17);
  }

  function drawPlayer() {
    const ch = selectedChar;
    const x = player.x;
    const y = player.y;
    const rolling = player.rollT >= 0;
    const bob = rolling || player.jumpT >= 0 ? 0 : Math.sin(player.runFrame * 2) * 1.5;
    const leg = Math.sin(player.runFrame * 2.2) * 5;

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(x, PLAYER_Y + 3, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (player.invuln > 0 && Math.floor(time * 18) % 2 === 0) ctx.globalAlpha = 0.4;

    if (rolling) {
      ctx.fillStyle = ch.shirt;
      ctx.beginPath();
      ctx.ellipse(x, y - 8, 14, 10, time * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ch.skin;
      ctx.beginPath();
      ctx.arc(x + 6, y - 10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    ctx.save();
    ctx.translate(x, y + bob);

    // legs
    ctx.strokeStyle = ch.pants;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-4, -14);
    ctx.lineTo(-5 - leg * 0.2, -1);
    ctx.moveTo(4, -14);
    ctx.lineTo(5 + leg * 0.2, -1);
    ctx.stroke();

    ctx.fillStyle = ch.shoes;
    ctx.fillRect(-10 - leg * 0.15, -3, 8, 3);
    ctx.fillRect(2 + leg * 0.15, -3, 8, 3);

    // torso
    ctx.fillStyle = ch.shirt;
    roundRect(-10, -34, 20, 22, 4);
    ctx.fill();
    ctx.fillStyle = ch.accent;
    ctx.fillRect(-10, -24, 20, 3);

    // arms
    ctx.strokeStyle = ch.skin;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, -30);
    ctx.lineTo(-14, -18 + leg * 0.3);
    ctx.moveTo(10, -30);
    ctx.lineTo(14, -18 - leg * 0.3);
    ctx.stroke();

    // head
    ctx.fillStyle = ch.skin;
    ctx.beginPath();
    ctx.arc(0, -42, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a1a1a";
    if (ch.id === "conductor") {
      ctx.fillRect(-9, -50, 18, 6);
      ctx.fillStyle = "#ffd60a";
      ctx.fillRect(-9, -45, 18, 2);
    } else {
      ctx.beginPath();
      ctx.ellipse(0, -46, 8, 5, 0, Math.PI, 0);
      ctx.fill();
    }

    if (ch.id === "student") {
      ctx.fillStyle = "#2c3e50";
      roundRect(-12, -32, 7, 14, 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawCoin(c) {
    const squash = 0.55 + Math.abs(Math.cos(c.spin)) * 0.45;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(squash, 1);
    ctx.fillStyle = "#c9a227";
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd60a";
    ctx.beginPath();
    ctx.arc(0, 0, c.r * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a6200";
    ctx.font = "bold 9px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("₦", 0, 1);
    ctx.restore();
  }

  function drawPowerup(p) {
    const bob = Math.sin(time * 5 + p.y * 0.05) * 3;
    const colors = { shield: "#4ecdc4", suya: "#ff8c42", magnet: "#c084fc", x2: "#ffd60a" };
    const icons = { shield: "💧", suya: "🍢", magnet: "🧲", x2: "⚡" };
    ctx.fillStyle = colors[p.kind] || "#fff";
    ctx.beginPath();
    ctx.arc(p.x, p.y + bob, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = "12px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icons[p.kind] || "?", p.x, p.y + bob + 1);
  }

  function drawObstacle(o) {
    const x = o.x, y = o.y;
    switch (o.type) {
      case "danfo": drawDanfo(x, y); break;
      case "okada": drawOkada(x, y); break;
      case "pothole": drawPothole(x, y); break;
      case "keke": drawKeke(x, y); break;
      case "checkpoint": drawCheckpoint(x, y); break;
      case "gen": drawGen(x, y); break;
      case "banner": drawBanner(x, y); break;
      case "areaboy": drawAreaBoy(x, y); break;
    }
  }

  function drawDanfo(x, y) {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath(); ctx.ellipse(x, y + 2, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffd60a";
    roundRect(x - 24, y - 34, 48, 34, 4); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.fillRect(x - 24, y - 20, 48, 7);
    ctx.fillStyle = "#4a6fa5";
    ctx.fillRect(x - 18, y - 30, 12, 8);
    ctx.fillRect(x - 2, y - 30, 12, 8);
    ctx.fillRect(x + 10, y - 30, 10, 8);
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(x - 14, y - 1, 5, 0, Math.PI * 2); ctx.arc(x + 14, y - 1, 5, 0, Math.PI * 2); ctx.fill();
  }

  function drawOkada(x, y) {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath(); ctx.ellipse(x, y + 1, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(x - 10, y - 3, 5, 0, Math.PI * 2); ctx.arc(x + 10, y - 3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 8, y - 6); ctx.lineTo(x + 8, y - 12); ctx.stroke();
    ctx.fillStyle = "#2c3e50"; ctx.fillRect(x - 4, y - 26, 10, 14);
    ctx.fillStyle = "#8d5524";
    ctx.beginPath(); ctx.arc(x + 1, y - 30, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath(); ctx.arc(x + 1, y - 32, 6, Math.PI, 0); ctx.fill();
  }

  function drawPothole(x, y) {
    ctx.fillStyle = "#1a1510";
    ctx.beginPath(); ctx.ellipse(x, y - 2, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0d0a08";
    ctx.beginPath(); ctx.ellipse(x - 1, y - 3, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawKeke(x, y) {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath(); ctx.ellipse(x, y + 1, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#27ae60";
    roundRect(x - 16, y - 28, 32, 24, 3); ctx.fill();
    ctx.fillStyle = "#ffd60a"; ctx.fillRect(x - 16, y - 12, 32, 5);
    ctx.fillStyle = "#5dade2";
    ctx.fillRect(x - 12, y - 24, 10, 9);
    ctx.fillRect(x + 2, y - 24, 10, 9);
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(x - 10, y - 1, 4, 0, Math.PI * 2); ctx.arc(x + 10, y - 1, 4, 0, Math.PI * 2); ctx.fill();
  }

  function drawCheckpoint(x, y) {
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(x - 18, y - 22, 36, 16);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 18, y - 16, 36, 5);
    ctx.fillStyle = "#2c3e50";
    roundRect(x - 14, y - 40, 28, 12, 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 8px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("STOP", x, y - 32);
  }

  function drawGen(x, y) {
    ctx.fillStyle = "#7f8c8d";
    roundRect(x - 12, y - 22, 24, 18, 2); ctx.fill();
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(x - 6, y - 28, 12, 7);
    ctx.fillStyle = "#e67e22";
    ctx.beginPath(); ctx.arc(x + 7, y - 14, 3, 0, Math.PI * 2); ctx.fill();
  }

  function drawBanner(x, y) {
    ctx.fillStyle = "#8e44ad";
    ctx.fillRect(x - 26, y - 50, 52, 16);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("ROLL!", x, y - 39);
    ctx.fillStyle = "#555";
    ctx.fillRect(x - 26, y - 50, 3, 48);
    ctx.fillRect(x + 23, y - 50, 3, 48);
  }

  function drawAreaBoy(x, y) {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(x - 7, y - 28, 14, 20);
    ctx.fillStyle = "#8d5524";
    ctx.beginPath(); ctx.arc(x, y - 34, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.fillRect(x - 7, y - 40, 14, 4);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Loop
  $("best").textContent = formatN(best);
  seedDecor();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
