/* LAGOS STRUGGLE — endless 3D Lagos runner.  Main game: state, controls, spawner, chase, UI. */
(function () {
  "use strict";
  const LS = window.LS, T = THREE;
  const { LW, ZONE_LEN } = LS.C;
  const { pick, rnd } = LS.util;
  const POWERS = LS.Props.POWERS;
  const $ = (id) => document.getElementById(id);

  /* ───────── renderer / scene ───────── */
  const canvas = $("game");
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(58, 1, 0.1, 320);
  LS.World.init(scene);

  let camBack = 10, camH = 5, fovRad = 1;
  function layout() {
    const w = window.innerWidth, h = window.innerHeight, a = w / h;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = a;
    camera.fov = a >= 1 ? 56 : Math.min(74, 56 + (1 / a - 1) * 12);
    fovRad = camera.fov * Math.PI / 180;
    const tanH = Math.tan(fovRad / 2) * a;
    camBack = Math.max(a >= 1 ? 11.5 : 8.8, Math.min(18, 9.6 / (2 * tanH)));
    camH = a >= 1 ? 3.4 + camBack * 0.33 : 3.6 + camBack * 0.21;
    camera.updateProjectionMatrix();
    FX.mat.uniforms.uScale.value = (h * pixelRatio) / (2 * Math.tan(fovRad / 2));
  }

  /* ───────── particles ───────── */
  const FX = (() => {
    const N = 360;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 4), siz = new Float32Array(N);
    const vel = new Float32Array(N * 3), life = new Float32Array(N), mx = new Float32Array(N), grav = new Float32Array(N), s0 = new Float32Array(N);
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
    geo.setAttribute("pcolor", new T.BufferAttribute(col, 4).setUsage(T.DynamicDrawUsage));
    geo.setAttribute("size", new T.BufferAttribute(siz, 1).setUsage(T.DynamicDrawUsage));
    const mat = new T.ShaderMaterial({
      uniforms: { uScale: { value: 600 } }, transparent: true, depthWrite: false,
      vertexShader: "attribute vec4 pcolor; attribute float size; uniform float uScale; varying vec4 vC; void main(){ vC=pcolor; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*uScale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }",
      fragmentShader: "varying vec4 vC; void main(){ float d=length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor=vec4(vC.rgb, vC.a*smoothstep(0.5,0.15,d)); }",
    });
    const pts = new T.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5;
    scene.add(pts);
    let head = 0;
    return {
      mat,
      emit(x, y, z, vx, vy, vz, l, r, g, b, size, gr) {
        const i = head; head = (head + 1) % N;
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
        life[i] = mx[i] = l; grav[i] = gr || 0; s0[i] = size;
        col[i * 4] = r; col[i * 4 + 1] = g; col[i * 4 + 2] = b; col[i * 4 + 3] = 1;
      },
      burst(x, y, z, n, hex, spd, size, l, gr) {
        const c = new T.Color(hex);
        for (let k = 0; k < n; k++) this.emit(x, y, z, rnd(-spd, spd), rnd(0, spd * 1.2), rnd(-spd, spd), l * rnd(0.6, 1), c.r, c.g, c.b, size * rnd(0.6, 1.2), gr == null ? 9 : gr);
      },
      update(dt, scroll) {
        for (let i = 0; i < N; i++) {
          if (life[i] > 0) {
            life[i] -= dt;
            vel[i * 3 + 1] -= grav[i] * dt;
            pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += (vel[i * 3 + 2] + scroll) * dt;
            const a = Math.max(0, life[i] / mx[i]);
            col[i * 4 + 3] = a; siz[i] = s0[i] * (0.5 + 0.5 * a);
            if (pos[i * 3 + 1] < 0.02) { pos[i * 3 + 1] = 0.02; vel[i * 3 + 1] *= -0.3; }
          } else siz[i] = 0;
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.pcolor.needsUpdate = true; geo.attributes.size.needsUpdate = true;
      },
      clear() { life.fill(0); siz.fill(0); },
    };
  })();

  /* ───────── characters, chaser, player ───────── */
  const CHARS = LS.CHARACTERS;
  const rigs = {};
  CHARS.forEach((c) => { const r = c.build(); r.root.visible = false; scene.add(r.root); rigs[c.id] = r; });
  const agbero = LS.buildAgbero(); agbero.root.visible = false; scene.add(agbero.root);

  let selId = "student";
  try { const s = localStorage.getItem("lagos-run-char"); if (s && rigs[s]) selId = s; } catch (e) {}
  const selChar = () => CHARS.find((c) => c.id === selId);

  const shieldMesh = new T.Mesh(new T.SphereGeometry(1.35, 18, 12), new T.MeshBasicMaterial({ color: 0xf3e3a0, transparent: true, opacity: 0.28, depthWrite: false }));
  shieldMesh.visible = false; scene.add(shieldMesh);
  const magnetRing = new T.Mesh(new T.TorusGeometry(1.0, 0.04, 6, 28), new T.MeshBasicMaterial({ color: 0xe0a458, transparent: true, opacity: 0.8 }));
  magnetRing.visible = false; scene.add(magnetRing);
  const suyaGlow = new T.Sprite(new T.SpriteMaterial({ map: LS.util.glowTex(), color: 0xff6a2b, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
  suyaGlow.scale.set(5, 5, 1); suyaGlow.visible = false; scene.add(suyaGlow);
  const pShadow = LS.util.blob(1.5, 1.5, scene); pShadow.visible = false;

  const GRAV = 30, JUMP_V = 10.5, MEGA_V = 15.5;
  const P = { lane: 1, prev: 1, x: 0, y: 0, vy: 0, ground: true, rolling: false, rollT: 0, queueRoll: false, stumble: 0, invuln: 0, phase: 0, face: Math.PI, dustT: 0, landed: 0 };
  const CH = { z: 26, x: 0, y: 0, phase: 0, closeT: 0, intro: 0, tauntT: 4, side: 1, slapped: false };

  /* ───────── game state ───────── */
  let state = "menu";
  let time = 0, dist = 0, prevDist = 0, speed = 0, slow = 1, startRamp = 0, dash = 0;
  let scoreF = 0, naira = 0, coinCount = 0, shown = { s: -1, n: -1, d: -1 };
  let best = 0, wallet = 0;
  try { best = Number(localStorage.getItem("lagos-run-best") || 0); wallet = Number(localStorage.getItem("lagos-run-wallet") || 0); } catch (e) {}
  const pw = { garri: 0, groundnut: 0, suya: 0, zobo: 0, jollof: 0 };
  let obstacles = [], coins = [], pickups = [], debris = [];
  const coinPool = [];
  let nextRowS = 0, nextPowerS = 0, lastKind = "", deadT = 0, shake = 0, zoneShown = -1, hits = 0, camLook = new T.Vector3(0, 1, -8), camPos = new T.Vector3(0, 5, 10);

  const laneX = (l) => (l - 1) * LW;
  const perkMul = () => (selId === "trader" ? 1.3 : 1);

  /* ───────── UI ───────── */
  const ui = {
    hud: $("hud"), menu: $("menu"), over: $("over"), pause: $("pause"),
    score: $("score"), naira: $("naira"), dist: $("dist"), best: $("best"), zone: $("zonechip"),
    powers: $("powers"), toast: $("toast"), taunt: $("taunt"), mult: $("mult"), banner: $("banner"),
  };
  const fmt = (n) => Math.floor(n).toLocaleString("en-NG");
  let toastT = 0, tauntT = 0, bannerT = 0;
  function toast(txt, color) { ui.toast.textContent = txt; ui.toast.style.color = color || "#fff"; ui.toast.classList.add("show"); toastT = 1.6; }
  function taunt(txt) { ui.taunt.textContent = txt; ui.taunt.classList.add("show"); tauntT = 2.2; }
  function showBanner(Z) {
    ui.banner.innerHTML = `<small>NOW ENTERING</small><b>📍 ${Z.name}</b><span>${Z.tag}</span>`;
    ui.banner.classList.add("show"); bannerT = 3.6;
    ui.zone.textContent = "📍 " + Z.name;
    LS.Audio.zone();
  }

  function buildMenu() {
    const grid = $("chars"); grid.innerHTML = "";
    CHARS.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "char" + (c.id === selId ? " sel" : "");
      b.innerHTML = `<i>${c.emoji}</i><b>${c.name}</b>`;
      b.onclick = () => { selId = c.id; try { localStorage.setItem("lagos-run-char", selId); } catch (e) {} LS.Audio.ui(); showSel(); buildMenu(); };
      grid.appendChild(b);
    });
    showSel();
  }
  function showSel() {
    const c = selChar();
    $("charname").textContent = c.name; $("chartag").textContent = c.tag; $("charperk").textContent = "★ " + c.perk;
    for (const id in rigs) rigs[id].root.visible = (id === selId) && (state === "menu" || state === "playing" || state === "paused" || state === "over");
  }

  function updateBestUI() { $("menu-best").textContent = fmt(best); $("menu-wallet").textContent = fmt(wallet); }

  function setPowersUI() {
    let html = "";
    for (const k in pw) if (pw[k] > 0) {
      const P2 = POWERS[k]; const pct = Math.min(100, (pw[k] / (P2.dur * perkMul())) * 100);
      html += `<div class="pill" style="--c:${P2.css}"><span>${P2.icon}</span><em>${P2.name}</em><u style="width:${pct}%"></u></div>`;
    }
    if (ui.powers._h !== html) { ui.powers.innerHTML = html; ui.powers._h = html; }
  }

  /* ───────── world entities ───────── */
  function clearEntities() {
    obstacles.forEach((e) => scene.remove(e.g)); obstacles = [];
    debris.forEach((e) => scene.remove(e.g)); debris = [];
    coins.forEach((c) => { scene.remove(c.m); coinPool.push(c.m); }); coins = [];
    pickups.forEach((p) => scene.remove(p.m)); pickups = [];
    FX.clear();
  }
  function addObstacle(type, lane, s, o) {
    o = o || {};
    const ob = LS.Props.makeObstacle(type, o.variant);
    const e = { type, lane, s, o: ob, g: ob.g, vs: ob.vs, halfW: ob.halfW, halfL: ob.halfL, top: ob.top, bottom: ob.bottom, msg: ob.msg, hit: false, smash: 0 };
    e.x = ob.wide ? 0 : laneX(lane);
    if (ob.hawker) { e.x0 = laneX(o.from != null ? o.from : (lane === 0 ? 1 : lane - 1)); e.x1 = laneX(lane); e.x = e.x0; e.dir = Math.sign(e.x1 - e.x0) || 1; e.moving = false; }
    scene.add(e.g); obstacles.push(e);
    return e;
  }
  function addCoin(s, x, y) {
    const m = coinPool.pop() || LS.Props.makeCoin();
    scene.add(m);
    coins.push({ s, x, y, m, spin: Math.random() * 6, got: false });
  }
  function addPickup(kind, s, x) {
    const m = LS.Props.makePickup(kind);
    scene.add(m);
    pickups.push({ kind, s, x, y: 1.25, m, got: false });
  }

  const FULLS = ["danfo", "danfo", "mwoman", "mman", "kiosk", "okada", "mwoman", "mman"];
  const LOWS = ["table", "table", "sacks", "barrier"];

  function rushAt(s) { return Math.min(1, Math.max(0, (s - 600) / 2000)); }

  function spawnRow(s) {
    const h = rushAt(s);
    let kind;
    const r = Math.random();
    if (s < 140) kind = "single";
    else if (h > 0.45 && r > 0.84) kind = "squeeze";
    else if (r < 0.36 - h * 0.18) kind = "single";
    else if (r < 0.58 + h * 0.1) kind = "double";
    else if (r < 0.74) kind = "mixed";
    else if (r < 0.86 - h * 0.04) kind = "jumpRow";
    else if (r < 0.94 - h * 0.05) kind = "rollRow";
    else kind = "hawker";
    if (kind === lastKind && (kind === "jumpRow" || kind === "rollRow" || kind === "squeeze")) kind = "single";
    lastKind = kind;
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    const open = [];
    const jumpCoins = [];
    switch (kind) {
      case "single": addObstacle(pick(FULLS), lanes[0], s); open.push(lanes[1], lanes[2]); break;
      case "double": addObstacle(pick(FULLS), lanes[0], s); addObstacle(pick(FULLS), lanes[1], s + (0.5 + rnd(0, 2.2)) * (1 - h * 0.55)); open.push(lanes[2]); break;
      case "mixed": addObstacle(pick(FULLS), lanes[0], s); addObstacle(pick(LOWS), lanes[1], s + rnd(-1, 2) * (1 - h * 0.4)); jumpCoins.push(lanes[1]); open.push(lanes[2]); break;
      case "squeeze": addObstacle(pick(FULLS), 0, s); addObstacle(pick(FULLS), 2, s + rnd(0.3, 1.4)); addObstacle(pick(LOWS), 1, s + 0.6); jumpCoins.push(1); open.push(1); break;
      case "jumpRow": { const v = pick(LOWS); lanes.forEach((l) => addObstacle(v, l, s)); lanes.forEach((l) => jumpCoins.push(l)); open.push(1); break; }
      case "rollRow": addObstacle("cloth", 1, s); open.push(0, 1, 2); break;
      case "hawker": addObstacle("hawker", lanes[0], s, { from: lanes[0] === 1 ? (Math.random() < 0.5 ? 0 : 2) : 1 }); addObstacle(pick(FULLS), lanes[1], s + rnd(-2, 2)); open.push(lanes[0]); break;
    }
    // coin arcs above low obstacles
    jumpCoins.forEach((l) => { for (let i = 0; i < 5; i++) addCoin(s - 3.2 + i * 1.6, laneX(l), 1.0 + Math.sin((i / 4) * Math.PI) * 1.3); });
    // gap to next row
    const timeGap = 1.62 - h * 0.7;
    let gap = speed * timeGap + 4 + rnd(0, 7 * (1 - h * 0.65));
    if (kind === "jumpRow" || kind === "rollRow" || kind === "squeeze") gap += 7;
    gap = Math.max(14, gap);
    // coin trail in an open lane between rows
    const cl = pick(open.length ? open : [1]);
    const n = 5 + ((Math.random() * 4) | 0);
    const cs = s + gap * 0.5 - n * 0.9;
    for (let i = 0; i < n; i++) addCoin(cs + i * 1.8, laneX(cl), 1.0);
    if (nextPowerS <= s) {
      const pl = pick(open.filter((l) => l !== cl).concat(open.length > 1 ? [] : [cl]));
      const kinds = Object.keys(POWERS);
      addPickup(pick(kinds), s + gap * 0.5 + 8, laneX(pl == null ? cl : pl));
      nextPowerS = s + rnd(260, 420) * (selId === "trader" ? 0.8 : 1);
    }
    nextRowS = s + gap;
  }

  /* ───────── game flow ───────── */
  function resetGame() {
    clearEntities();
    dist = 0; prevDist = 0; speed = 12; slow = 1; startRamp = 0; dash = 0; scoreF = 0; naira = 0; coinCount = 0; hits = 0; deadT = 0; shake = 0;
    shown = { s: -1, n: -1, d: -1 };
    for (const k in pw) pw[k] = 0;
    if (selId === "student") pw.garri = 5;
    P.lane = P.prev = 1; P.x = 0; P.y = 0; P.vy = 0; P.ground = true; P.rolling = false; P.rollT = 0; P.queueRoll = false; P.stumble = 0; P.invuln = 0; P.phase = 0;
    CH.z = 3.6; CH.x = 0; CH.closeT = 0; CH.intro = 6; CH.tauntT = 1.2; CH.side = 1; CH.slapped = false;
    nextRowS = 90; nextPowerS = 150; lastKind = ""; zoneShown = -1;
    LS.World.reset();
    for (let i = 0; i < 6; i++) addCoin(30 + i * 1.8, 0, 1.0);
    ui.taunt.classList.remove("show"); ui.toast.classList.remove("show"); ui.banner.classList.remove("show");
    ui.zone.textContent = "📍 " + LS.World.ZONES[0].name;
  }
  function startGame() {
    LS.Audio.unlock();
    LS.Audio.startMusic();
    resetGame();
    state = "playing";
    ui.menu.classList.add("hidden"); ui.over.classList.add("hidden"); ui.pause.classList.add("hidden"); ui.hud.classList.remove("hidden");
    showSel();
  }
  function toMenu() {
    LS.Audio.stopMusic();
    state = "menu"; clearEntities(); LS.World.reset(); dist = 0; prevDist = 0;
    for (const k in pw) pw[k] = 0;
    P.stumble = 0; P.rolling = false; P.y = 0; P.x = 0; P.lane = P.prev = 1;
    ui.menu.classList.remove("hidden"); ui.over.classList.add("hidden"); ui.pause.classList.add("hidden"); ui.hud.classList.add("hidden");
    updateBestUI(); showSel();
  }
  function setPaused(p) {
    if (p && state === "playing") { state = "paused"; ui.pause.classList.remove("hidden"); LS.Audio.stopMusic(); }
    else if (!p && state === "paused") { state = "playing"; ui.pause.classList.add("hidden"); LS.Audio.startMusic(); }
  }

  const DEATH = ["Agbero don catch you! Pay levy!", "Oga, na ₦500 for 'ticket'!", "Agbero collar you — Lagos no easy!", "You no pay union dues — Agbero win!"];
  const TAUNTS = ["Oga! Come here!", "Where your ticket?!", "Pay levy now now!", "I go catch you!", "Stop there! Na me be Agbero!", "Give me ₦200!"];

  function die(reason) {
    state = "over"; deadT = 0; shake = 1.2;
    LS.Audio.caught(); LS.Audio.stopMusic();
    const sc = Math.floor(scoreF);
    const isBest = sc > best;
    if (isBest) { best = sc; }
    wallet += naira;
    try { localStorage.setItem("lagos-run-best", String(best)); localStorage.setItem("lagos-run-wallet", String(wallet)); } catch (e) {}
    $("over-line").textContent = pick(DEATH);
    $("over-reason").textContent = reason || "";
    $("o-score").textContent = fmt(sc); $("o-dist").textContent = fmt(dist) + " m"; $("o-naira").textContent = "₦" + fmt(naira); $("o-best").textContent = fmt(best);
    $("newbest").classList.toggle("hidden", !isBest);
    CH.slapped = false;
  }

  function smash(e) {
    e.smash = 1; e.hit = true;
    const dx = (Math.random() - 0.5) * 14;
    debris.push({ g: e.g, e, x: e.x, y: 0, z: 0, vx: dx, vy: 9 + Math.random() * 4, vz: -6, rx: rnd(-4, 4), rz: rnd(-4, 4), t: 0 });
    obstacles.splice(obstacles.indexOf(e), 1);
    FX.burst(e.x, 1.2, dist - e.s, 14, 0xffc040, 5, 0.5, 0.7);
    LS.Audio.smash(); shake = Math.max(shake, 0.3);
  }

  function crash(e, side) {
    if (pw.suya > 0) { scoreF += 25; smash(e); toast("SMASHED! +25", "#ff9a5a"); return; }
    if (P.invuln > 0) return;
    if (pw.garri > 0) { pw.garri = 0; P.invuln = 1.2; smash(e); toast("🥣 GARRI SAVED YOU!", "#f3e3a0"); return; }
    e.hit = true;
    if (side) { P.lane = P.prev; }
    hits++;
    shake = 0.6;
    LS.Audio.hit();
    if (CH.intro > 0 || CH.closeT > 0) { die(e.msg); return; }
    const bolt = selId === "thief";
    P.stumble = bolt ? 0.35 : 0.9;
    P.invuln = bolt ? 1.15 : 1.6;
    slow = bolt ? 1 : 0.5;
    if (bolt) dash = 3.4;
    CH.closeT = selId === "crooner" ? 4 : 6; CH.tauntT = 0.15;
    CH.side = P.lane === 0 ? 1 : P.lane === 2 ? -1 : (Math.random() < 0.5 ? -1 : 1);
    if (CH.z > camBack - 1) CH.z = camBack + 0.35;
    LS.Audio.whistle();
    toast(bolt ? (e.msg + "  Thief don bolt!") : (e.msg + "  Agbero dey run you!"), bolt ? "#d1c4ff" : "#ff8a80");
    FX.burst(P.x, 1.0, 0, 12, 0xffffff, 4, 0.4, 0.5);
  }

  function activate(kind) {
    const P2 = POWERS[kind];
    pw[kind] = Math.max(pw[kind], P2.dur * perkMul());
    LS.Audio.power(); toast(P2.icon + " " + P2.name + "!  " + P2.desc, P2.css);
    FX.burst(P.x, 1.2, 0, 16, P2.color, 5, 0.5, 0.8, 2);
  }

  /* ───────── input ───────── */
  function setLane(l) {
    if (state !== "playing" || P.stumble > 0.55) return;
    const n = Math.max(0, Math.min(2, l));
    if (n !== P.lane) { P.prev = P.lane; P.lane = n; LS.Audio.lane(); }
  }
  function jump() {
    if (state !== "playing") return;
    if (P.ground) {
      P.vy = pw.jollof > 0 ? MEGA_V : JUMP_V; P.ground = false; P.rolling = false;
      pw.jollof > 0 ? LS.Audio.mega() : LS.Audio.jump();
      if (pw.jollof > 0) FX.burst(P.x, 0.3, 0, 12, 0xff7043, 4, 0.5, 0.6, 3);
    }
  }
  function roll() {
    if (state !== "playing") return;
    if (!P.ground) { P.vy = -24; P.queueRoll = true; }
    else if (!P.rolling) { P.rolling = true; P.rollT = 0; LS.Audio.roll(); }
  }
  window.addEventListener("keydown", (e) => {
    const c = e.code;
    if (c === "ArrowLeft" || c === "KeyA") { e.preventDefault(); setLane(P.lane - 1); }
    else if (c === "ArrowRight" || c === "KeyD") { e.preventDefault(); setLane(P.lane + 1); }
    else if (c === "ArrowUp" || c === "KeyW" || c === "Space") { e.preventDefault(); if (state === "menu" || state === "over") startGame(); else jump(); }
    else if (c === "ArrowDown" || c === "KeyS") { e.preventDefault(); roll(); }
    else if (c === "Escape" || c === "KeyP") { e.preventDefault(); setPaused(state === "playing"); }
    else if (c === "Enter") { if (state === "menu" || state === "over") startGame(); else if (state === "paused") setPaused(false); }
    else if (c === "KeyM") { updMute(LS.Audio.toggleMute()); }
  });
  let sw = null;
  canvas.addEventListener("pointerdown", (e) => { LS.Audio.unlock(); sw = { x: e.clientX, y: e.clientY, done: false }; });
  canvas.addEventListener("pointermove", (e) => {
    if (!sw || sw.done || state !== "playing") return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y, TH = 28;
    if (Math.abs(dx) < TH && Math.abs(dy) < TH) return;
    sw.done = true;
    if (Math.abs(dx) > Math.abs(dy)) setLane(P.lane + (dx > 0 ? 1 : -1)); else if (dy < 0) jump(); else roll();
  });
  const endSw = () => { sw = null; };
  canvas.addEventListener("pointerup", endSw); canvas.addEventListener("pointercancel", endSw);
  document.addEventListener("visibilitychange", () => { if (document.hidden) setPaused(true); });
  window.addEventListener("blur", () => setPaused(true));

  function updMute(m) { $("btn-mute").textContent = m ? "🔇" : "🔊"; $("menu-mute").textContent = m ? "🔇 Sound off" : "🔊 Sound on"; }
  $("btn-start").onclick = startGame;
  $("btn-retry").onclick = startGame;
  $("btn-home").onclick = toMenu;
  $("btn-resume").onclick = () => setPaused(false);
  $("btn-quit").onclick = toMenu;
  $("btn-pause").onclick = () => setPaused(true);
  $("btn-mute").onclick = () => updMute(LS.Audio.toggleMute());
  $("menu-mute").onclick = () => updMute(LS.Audio.toggleMute());
  updMute(LS.Audio.muted);
  window.addEventListener("resize", layout);
  window.addEventListener("orientationchange", () => setTimeout(layout, 120));

  /* ───────── update ───────── */
  function update(dt) {
    time += dt;
    if (shake > 0) shake = Math.max(0, shake - dt * 2.5);
    P.phase += dt * 1; // used only for idle

    if (state === "menu") { dist += 3.5 * dt; prevDist = dist; speed = 3.5; }
    if (state === "paused") return;

    if (state === "playing") {
      const h = rushAt(dist);
      const base = Math.min(42, 14 + dist * 0.0034 + h * h * 14);
      startRamp = Math.min(1, startRamp + dt * 0.7);
      slow = Math.min(1, slow + dt * 0.45);
      let spd = base * (0.55 + 0.45 * startRamp) * slow;
      if (dash > 0) { dash = Math.max(0, dash - dt); spd *= 1.7; }
      if (pw.suya > 0) spd *= 1.45;
      speed = spd;
      prevDist = dist; dist += speed * dt;
      const mult = (pw.zobo > 0 ? 2 : 1) * (pw.suya > 0 ? 2 : 1);
      scoreF += speed * dt * mult * (selId === "king" ? 1.25 : 1) * 0.5;
      for (const k in pw) if (pw[k] > 0) { pw[k] = Math.max(0, pw[k] - dt); if (pw[k] === 0 && k === "suya") P.invuln = Math.max(P.invuln, 1); }
      if (P.stumble > 0) P.stumble -= dt;
      if (P.invuln > 0) P.invuln -= dt;
      if (CH.intro > 0) CH.intro = Math.max(0, CH.intro - dt);
      if (CH.closeT > 0) CH.closeT = Math.max(0, CH.closeT - dt);
      if (CH.intro <= 0 && CH.closeT <= 0 && CH.z < camBack) {
        CH.z = camBack + 8;
        toast("Agbero don go small.", "#b9f6ca");
        ui.taunt.classList.remove("show"); tauntT = 0;
      }
      LS.Audio.setTempo(1 + h * 0.22);

      // spawning
      while (nextRowS < dist + 175) spawnRow(nextRowS);

      // player physics
      const tx = laneX(P.lane);
      P.x += (tx - P.x) * Math.min(1, 16 * dt);
      if (!P.ground) {
        P.vy -= GRAV * dt; P.y += P.vy * dt;
        if (P.y <= 0) {
          P.y = 0; P.vy = 0; P.ground = true; LS.Audio.land();
          FX.burst(P.x, 0.1, 0, 6, 0xb9a27a, 2.2, 0.6, 0.5, 0);
          if (P.queueRoll) { P.queueRoll = false; P.rolling = true; P.rollT = 0; }
        }
      }
      if (P.rolling) { P.rollT += dt; if (P.rollT >= 0.6) P.rolling = false; }
      P.dustT -= dt;
      if (P.ground && P.dustT <= 0) { P.dustT = 0.07; FX.emit(P.x + rnd(-0.2, 0.2), 0.12, 0.3, rnd(-0.5, 0.5), rnd(0.5, 1.4), rnd(1, 3), 0.5, 0.78, 0.7, 0.55, 0.5, 0); }
      if (pw.suya > 0) for (let i = 0; i < 3; i++) FX.emit(P.x + rnd(-0.4, 0.4), P.y + rnd(0.3, 1.5), 0.6, rnd(-1, 1), rnd(-1, 2), rnd(3, 8), 0.45, 1, rnd(0.3, 0.7), 0.1, 0.55, 0);
      if (pw.zobo > 0 && Math.random() < 0.4) FX.emit(P.x + rnd(-0.5, 0.5), P.y + rnd(0.2, 2), rnd(-0.3, 0.3), 0, rnd(0.5, 2), 0, 0.6, 0.9, 0.2, 0.6, 0.4, 0);

      // obstacles
      for (const e of obstacles) {
        e.s += e.vs * dt;
        if (e.o.hawker) {
          const rel = e.s - dist;
          const p = Math.max(0, Math.min(1, (62 - rel) / 36));
          e.x = e.x0 + (e.x1 - e.x0) * p; e.moving = p > 0 && p < 1;
        }
      }
      // collisions (swept along the road)
      const ph = P.rolling ? 0.85 : 1.9;
      for (const e of obstacles) {
        if (e.hit) continue;
        const lo = e.s - e.halfL - 0.3, hi = e.s + e.halfL + 0.3;
        if (dist < lo || prevDist > hi) continue;
        if (Math.abs(P.x - e.x) > e.halfW + 0.36) continue;
        if (!(P.y < e.top && P.y + ph > e.bottom)) continue;
        const side = !e.o.wide && e.lane !== P.lane && Math.abs(P.x - laneX(P.lane)) > 0.15;
        crash(e, side);
        if (state !== "playing") break;
      }
      // coins
      const magnet = pw.groundnut > 0;
      const coinVal = Math.round(50 * (selId === "prince" ? 1.25 : 1));
      for (const c of coins) {
        if (magnet && c.s - dist < 18 && c.s - dist > -3) {
          c.x += (P.x - c.x) * Math.min(1, 9 * dt); c.y += (P.y + 1 - c.y) * Math.min(1, 6 * dt); c.s += (dist - c.s) * Math.min(1, 6 * dt);
        }
        if (c.s < prevDist - 1.0 || c.s > dist + 1.0) continue;
        if (Math.abs(c.x - P.x) < 1.0 && c.y > P.y - 0.35 && c.y < P.y + ph + 0.4) {
          c.got = true; naira += coinVal; coinCount++;
          const mult = (pw.zobo > 0 ? 2 : 1) * (pw.suya > 0 ? 2 : 1);
          scoreF += 10 * mult;
          LS.Audio.coin();
          FX.burst(c.x, c.y, dist - c.s, 5, 0xffd84a, 2.5, 0.35, 0.4, 2);
        }
      }
      // pickups
      for (const p of pickups) {
        if (p.got) continue;
        if (p.s < prevDist - 1.2 || p.s > dist + 1.2) continue;
        if (Math.abs(p.x - P.x) < 1.25 && P.y < p.y + 0.9 && P.y + ph > p.y - 0.7) { p.got = true; activate(p.kind); }
      }
      // cleanup
      obstacles = obstacles.filter((e) => { if (e.s < dist - 18) { scene.remove(e.g); return false; } return true; });
      coins = coins.filter((c) => { if (c.got || c.s < dist - 18) { scene.remove(c.m); coinPool.push(c.m); return false; } return true; });
      pickups = pickups.filter((p) => { if (p.got || p.s < dist - 18) { scene.remove(p.m); return false; } return true; });

      // chaser — on you for ~6s like the Subway Surfers guard, then the gap opens
      const chasing = CH.intro > 0 || CH.closeT > 0;
      const far = camBack + 8;
      const near = pw.suya > 0 ? camBack + 3 : 3.55 - rushAt(dist) * 0.55;
      const tz = chasing ? near : far;
      CH.z += (tz - CH.z) * Math.min(1, (chasing ? 3.4 : 1.7) * dt);
      CH.x += (P.x - CH.x) * Math.min(1, (chasing ? 10 : 3) * dt);
      CH.tauntT -= dt;
      if (chasing && CH.tauntT <= 0 && CH.z < camBack - 2.2) {
        taunt("🟢⚪ AGBERO: " + pick(TAUNTS));
        CH.tauntT = rnd(2.8, 4.4);
        if (Math.random() < 0.45) LS.Audio.horn();
      }

      // zone banner
      const zones = LS.World.ZONES;
      const zi = Math.floor((dist - 8) / ZONE_LEN);
      if (dist >= 8 && zi !== zoneShown) { zoneShown = zi; showBanner(zones[((zi % zones.length) + zones.length) % zones.length]); }
    } else if (state === "over") {
      deadT += dt;
      speed += (0 - speed) * Math.min(1, 5 * dt);
      prevDist = dist; dist += speed * dt;
      CH.z += (0.35 - CH.z) * Math.min(1, 8 * dt);
      CH.x += (P.x - CH.x) * Math.min(1, 12 * dt);
      if (!CH.slapped && deadT > 0.34) {
        CH.slapped = true;
        LS.Audio.slap();
        shake = 1.5;
        FX.burst(P.x + (CH.side || 1) * 0.2, 1.55, 0.1, 14, 0xffe4b0, 4, 0.45, 0.35);
      }
      if (deadT > 1.35 && ui.over.classList.contains("hidden")) ui.over.classList.remove("hidden"), ui.hud.classList.add("hidden");
    }

    // debris
    for (const b of debris) {
      b.t += dt; b.vy -= 28 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      b.g.rotation.x += b.rx * dt; b.g.rotation.z += b.rz * dt;
      b.g.position.set(b.x, Math.max(0, b.y), dist - b.e.s + b.z - 0);
      if (b.t > 1.1) scene.remove(b.g);
    }
    debris = debris.filter((b) => b.t <= 1.1);

    FX.update(dt, state === "playing" || state === "menu" ? speed : speed);
    LS.World.update(dist, dt, camera, time);
  }

  /* ───────── render sync ───────── */
  const tmpV = new T.Vector3();
  function sync(dt) {
    const rig = rigs[selId];
    const playing = state === "playing" || state === "over" || state === "paused";
    // player pose
    const R = rig.root;
    R.position.set(P.x, P.y, 0);
    let ph = P.phase;
    if (state === "menu") {
      R.rotation.y += ((Math.PI + Math.sin(time * 0.6) * 0.55) - R.rotation.y) * Math.min(1, 6 * dt);
      LS.pose.run(rig, 0, 0, 0.0);
      rig.body.position.y = -0.95 + Math.sin(time * 2) * 0.012;
      rig.armL.rotation.x = 0.05; rig.armR.rotation.x = -0.05; rig.foreL.rotation.x = 0.25; rig.foreR.rotation.x = 0.25;
      rig.head.rotation.y = Math.sin(time * 0.8) * 0.15;
      R.rotation.z = 0;
      CH.z = 20;
    } else {
      const tx = laneX(P.lane);
      const yaw = -(tx - P.x) * 0.22;
      R.rotation.y += (yaw - R.rotation.y) * Math.min(1, 12 * dt);
      R.rotation.z = -(tx - P.x) * 0.1;
      rig.head.rotation.y = 0;
      const runPh = (state === "over" ? 0 : time * (8 + speed * 0.28));
      if (state === "over") {
        if (deadT < 0.62) LS.pose.slapped(rig, Math.min(1, deadT / 0.55), CH.side || 1);
        else LS.pose.fall(rig, (deadT - 0.5) * 2.4);
      } else if (P.stumble > 0) {
        LS.pose.stumble(rig, 1 - P.stumble / 0.9, runPh);
      } else if (P.rolling) {
        LS.pose.roll(rig, Math.min(1, P.rollT / 0.6));
      } else if (!P.ground) {
        LS.pose.jump(rig, P.vy);
      } else {
        LS.pose.run(rig, runPh, 1, 0.14 + (pw.suya > 0 ? 0.16 : 0));
      }
    }
    R.visible = true;
    // invulnerability blink
    const blink = (P.invuln > 0 && state === "playing" && Math.floor(time * 16) % 2 === 0);
    R.visible = !blink;

    // auras
    const cy = P.y + (P.rolling ? 0.6 : 1.0);
    shieldMesh.visible = playing && pw.garri > 0;
    if (shieldMesh.visible) { shieldMesh.position.set(P.x, cy, 0); const s = 1 + Math.sin(time * 6) * 0.04; shieldMesh.scale.set(s, s * 1.1, s); shieldMesh.material.opacity = pw.garri < 2 ? (Math.floor(time * 10) % 2 ? 0.1 : 0.3) : 0.28; }
    magnetRing.visible = playing && pw.groundnut > 0;
    if (magnetRing.visible) { magnetRing.position.set(P.x, cy, 0); magnetRing.rotation.set(Math.PI / 2 + Math.sin(time * 3) * 0.3, time * 4, 0); const s = 1.2 + Math.sin(time * 8) * 0.15; magnetRing.scale.set(s, s, s); }
    suyaGlow.visible = playing && pw.suya > 0;
    if (suyaGlow.visible) { suyaGlow.position.set(P.x, cy, 0.8); const s = 4.5 + Math.sin(time * 20) * 0.5; suyaGlow.scale.set(s, s, 1); }
    pShadow.visible = true;
    pShadow.position.set(P.x, 0.03, 0);
    const ss = Math.max(0.5, 1.6 - P.y * 0.25); pShadow.scale.set(ss, ss, 1);

    // chaser
    const showCh = playing && CH.z < camBack - 1.2;
    agbero.root.visible = showCh;
    if (showCh) {
      CH.phase += dt * (9 + speed * 0.3);
      agbero.root.position.set(CH.x, 0, CH.z);
      if (state === "over") {
        agbero.root.rotation.y = 0;
        LS.pose.slap(agbero, Math.min(1, deadT / 0.5), -1);
      } else {
        agbero.root.rotation.y = Math.sin(time * 3) * 0.08;
        LS.pose.chase(agbero, CH.phase);
      }
    }

    // obstacles / coins / pickups
    for (const e of obstacles) {
      e.g.position.set(e.x, 0, dist - e.s);
      if (e.o.anim) e.o.anim(time, dt, e);
    }
    for (const c of coins) {
      c.m.position.set(c.x, c.y + Math.sin(time * 4 + c.s) * 0.06, dist - c.s);
      c.m.rotation.y = time * 3.5 + c.spin;
    }
    for (const p of pickups) {
      p.m.position.set(p.x, p.y + Math.sin(time * 3 + p.s) * 0.18, dist - p.s);
      p.m.userData.it.rotation.y = time * 2;
    }

    // camera
    let tp, tl;
    if (state === "menu") {
      const asp = window.innerWidth / window.innerHeight;
      const ox = asp > 1.1 ? 1.5 : 0;
      tp = tmpV.set(Math.sin(time * 0.35) * 1.4 + ox * 0.0, 1.9, 5.6);
      camPos.lerp(tp, 1 - Math.exp(-4 * dt));
      camLook.lerp(new T.Vector3(ox, asp > 1.1 ? 0.9 : 0.2, 0), 1 - Math.exp(-4 * dt));
    } else {
      tp = tmpV.set(P.x * 0.55, camH, camBack);
      camPos.lerp(tp, 1 - Math.exp(-(state === "over" ? 3 : 6) * dt));
      camLook.lerp(new T.Vector3(P.x * 0.3, 1.2, -9), 1 - Math.exp(-6 * dt));
    }
    camera.position.copy(camPos);
    if (shake > 0) camera.position.add(new T.Vector3((Math.random() - 0.5) * shake * 0.5, (Math.random() - 0.5) * shake * 0.4, 0));
    camera.lookAt(camLook);
    const fovT = (window.innerWidth >= window.innerHeight ? 56 : Math.min(74, 56 + (window.innerHeight / window.innerWidth - 1) * 12)) + (pw.suya > 0 ? 10 : 0) + Math.max(0, speed - 14) * 0.15;
    if (Math.abs(camera.fov - fovT) > 0.05) { camera.fov += (fovT - camera.fov) * Math.min(1, 5 * dt); camera.updateProjectionMatrix(); FX.mat.uniforms.uScale.value = (window.innerHeight * pixelRatio) / (2 * Math.tan(camera.fov * Math.PI / 360)); }

    // HUD
    if (state === "playing" || state === "paused") {
      const s = Math.floor(scoreF);
      if (shown.s !== s) { ui.score.textContent = fmt(s); shown.s = s; }
      if (shown.n !== naira) { ui.naira.textContent = fmt(naira); shown.n = naira; }
      const dd = Math.floor(dist);
      if (shown.d !== dd) { ui.dist.textContent = fmt(dd); shown.d = dd; }
      setPowersUI();
      const mult = (pw.zobo > 0 ? 2 : 1) * (pw.suya > 0 ? 2 : 1);
      ui.mult.textContent = mult > 1 ? "x" + mult : "";
    }
    if (toastT > 0 && (toastT -= dt) <= 0) ui.toast.classList.remove("show");
    if (tauntT > 0 && (tauntT -= dt) <= 0) ui.taunt.classList.remove("show");
    if (bannerT > 0 && (bannerT -= dt) <= 0) ui.banner.classList.remove("show");
  }

  /* ───────── main loop ───────── */
  let last = performance.now(), slowFrames = 0, fpsT = 0, fpsN = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    sync(dt);
    renderer.render(scene, camera);
    // adaptive resolution: drop pixel ratio once if the device struggles
    fpsT += dt; fpsN++;
    if (fpsT > 2.5) {
      const fps = fpsN / fpsT; fpsT = 0; fpsN = 0;
      if (fps < 38 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - 0.5); layout(); }
    }
    requestAnimationFrame(frame);
  }

  layout();
  buildMenu(); updateBestUI(); showSel();
  camPos.set(0, 1.9, 5.6);
  requestAnimationFrame(frame);

  LS.debug = {
    start: startGame, menu: toMenu,
    get: () => ({ state, dist, speed, scoreF, naira, hits, P, CH, pw, obstacles: obstacles.length, coins: coins.length }),
    set: (o) => { if (o.dist != null) { dist = o.dist; prevDist = o.dist; nextRowS = dist + 90; } if (o.pw) Object.assign(pw, o.pw); if (o.sel) { selId = o.sel; buildMenu(); } },
    add: (t, l, rel, v) => addObstacle(t, l, dist + rel, { variant: v }),
    pick: (k, l, rel) => addPickup(k, dist + rel, laneX(l)),
    freeze: (f) => { state = f ? "paused" : "playing"; },
    clear: clearEntities,
    step: (n, dt) => { for (let i = 0; i < n; i++) { update(dt); sync(dt); } },
    obs: () => obstacles.map((e) => ({ type: e.type, lane: e.lane, s: e.s, x: e.x, hw: e.halfW, hl: e.halfL, top: e.top, bot: e.bottom, hit: e.hit })).concat([{ dist }]),
    jump, roll, lane: setLane, selId: () => selId, renderer, scene, camera,
  };
})();
