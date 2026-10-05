/* Lagos Run — obstacles (danfo, market people, vendors…), boosters and naira coins */
(function () {
  "use strict";
  const LS = (window.LS = window.LS || {});
  const T = THREE;
  const { G, M, B, MT, mesh, box, pick, rnd, canvasTex, signTex, ankaraTex, umbrellaTex, glowTex, blob } = LS.util;
  const human = LS.human, pose = LS.pose;

  const SKINS = [0x5a3825, 0x6b4226, 0x7b4b2a, 0x8d5a34, 0x4a2f1c];
  const SLOGANS = ["GOD DEY", "NO TIME", "OYA OYA", "LAGOS OR NOTHING", "OMO NAIJA", "JESUS IS LORD", "SUPER GBEDU", "WE DEY COME", "PATIENCE", "JUST DO AM", "EKO FOR SHOW", "NO CONDITION"];
  const SLOGAN_COLORS = [[0x141414, 0xffc800], [0xffffff, 0xd62828], [0x138a36, 0xffffff], [0xd62828, 0xffffff]];
  const ANK = [
    [0xd81b60, 0xffc107, 0xffffff], [0x00897b, 0xff7043, 0xfff8e1],
    [0x5e35b1, 0xffca28, 0xffffff], [0xe53935, 0x1e88e5, 0xfff9c4], [0x1b5fbf, 0xff8a1f, 0xfff1c9],
  ];
  const ankKey = (c) => c.join("-");

  /* ───────── obstacles ───────── */
  function danfo() {
    const g = new T.Group();
    const Y = 0xffc800, L = 5.6;
    blob(2.7, 6.6, g);
    box(2.0, 1.05, L, Y, 0, 1.0, 0, g);
    box(2.02, 0.3, L + 0.02, 0x141414, 0, 0.98, 0, g);
    box(1.94, 0.95, L - 0.4, Y, 0, 2.0, 0, g);
    box(2.0, 0.1, L - 0.3, 0xe0a800, 0, 2.52, 0, g);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) box(0.05, 0.55, 0.95, 0x2b3f5c, s * 0.98, 2.05, -1.95 + i * 1.3, g);
      const sg = mesh(G("plane", 3.4, 0.26), MT("danfoside", signTex("DANFO  ★  EKO O NI BAJE", 0x141414, 0xffc800, 512, 40, false)), s * 1.012, 0.98, 0, g);
      sg.rotation.y = s * Math.PI / 2;
    }
    box(1.55, 0.62, 0.05, 0x24364f, 0, 2.05, 2.62, g);                 // rear window
    const [bg, fg] = pick(SLOGAN_COLORS);
    mesh(G("plane", 1.7, 0.46), MT("slg", signTex(pick(SLOGANS), bg, fg, 256, 70), 0xffffff), 0, 1.3, 2.81, g);
    for (const s of [-1, 1]) box(0.26, 0.2, 0.05, 0xff2a2a, s * 0.8, 1.45, 2.82, g).material = B(0xff3030);
    box(2.06, 0.22, 0.2, 0x1b1b1b, 0, 0.58, 2.86, g);
    box(0.4, 0.14, 0.04, 0xffffff, 0, 0.8, 2.85, g);
    // roof luggage
    if (Math.random() < 0.7) {
      box(1.5, 0.3, 2.2, pick([0xf1e4c3, 0x7aa6d6, 0xd98a8a]), 0, 2.72, 0.4, g);
      box(0.9, 0.28, 0.9, pick([0xc89b5a, 0x8d6e63]), 0.2, 3.0, -0.6, g);
    }
    const wheels = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = new T.Group(); w.position.set(sx * 1.0, 0.45, sz * 1.8); g.add(w);
      const c = mesh(G("cyl", 0.46, 0.46, 0.3, 14), M(0x161616), 0, 0, 0, w); c.rotation.z = Math.PI / 2;
      const hub = mesh(G("cyl", 0.2, 0.2, 0.32, 8), M(0x9aa0a6), 0, 0, 0, w); hub.rotation.z = Math.PI / 2;
      wheels.push(w);
    }
    return { g, halfW: 1.05, halfL: 2.9, top: 2.95, bottom: 0, vs: Math.random() < 0.5 ? 0 : 5.5, wheels, big: true,
      anim(t, dt, o) { if (o.vs) for (const w of wheels) w.rotation.x -= o.vs * dt * 2.2; } };
  }

  function marketWoman() {
    const g = new T.Group();
    const c = pick(ANK), c2 = pick(ANK), phase = Math.random() * 6;
    const rig = human({ skin: pick(SKINS), shirtTex: ankaraTex(...c), shirtTexKey: ankKey(c), sleeves: "short",
      skirt: 0, skirtTex: ankaraTex(...c2), skirtTexKey: ankKey(c2), hair: "none", pants: 0x333333, shoes: 0x333333,
      basket: pick(["basin", "wicker"]), goods: pick([[0xe53935, 0xe53935, 0xff9800, 0x43a047, 0xe53935, 0xff9800, 0xffeb3b], [0xff9800, 0xffa726, 0xff9800, 0x66bb6a, 0xffa726, 0xff9800, 0xffcc80]]) });
    rig.root.rotation.y = Math.PI;
    g.add(rig.root); blob(1.7, 1.7, g);
    return { g, halfW: 0.8, halfL: 0.6, top: 2.75, bottom: 0, vs: -1.4,
      anim(t) { pose.carry(rig, t * 4 + phase); rig.body.rotation.z = Math.sin(t * 2 + phase) * 0.03; } };
  }

  function marketMan() {
    const g = new T.Group();
    const phase = Math.random() * 6;
    const rig = human({ skin: pick(SKINS), shirt: pick([0xf2c94c, 0x2f80ed, 0xeb5757, 0x27ae60, 0xf2f2f2]), sleeves: "short",
      pants: pick([0x8d7b5a, 0x3b3b3b, 0x5b4636]), shoes: 0x2a2a2a, hair: "fade", bag: true, beard: Math.random() < 0.4 });
    rig.root.rotation.y = Math.PI;
    g.add(rig.root); blob(1.7, 1.7, g);
    return { g, halfW: 0.8, halfL: 0.6, top: 2.95, bottom: 0, vs: -1.6,
      anim(t) { pose.carry(rig, t * 4.5 + phase); } };
  }

  function kiosk() {
    const g = new T.Group();
    blob(2.4, 2.4, g);
    box(1.9, 0.9, 0.9, 0x8a5a2b, 0, 0.45, 0.35, g);
    box(2.0, 0.08, 1.0, 0xb07a3f, 0, 0.94, 0.35, g);
    for (let i = 0; i < 5; i++) {
      const c = pick([0xe53935, 0xffb300, 0x43a047, 0x1e88e5, 0xffffff]);
      mesh(G("cyl", 0.1, 0.1, 0.3, 8), M(c), -0.75 + i * 0.37, 1.13, 0.3, g);
    }
    for (const s of [-1, 1]) mesh(G("cyl", 0.045, 0.045, 2.8, 6), M(0x555555), s * 0.95, 1.4, -0.12, g);
    const uc = pick([[0xe53935, 0xffffff], [0x1e88e5, 0xffd60a], [0x138a36, 0xffffff], [0xff7a00, 0xffffff]]);
    mesh(G("cone", 1.6, 0.6, 16), MT("umb", umbrellaTex(uc[0], uc[1]), 0xffffff, { side: T.DoubleSide }), 0, 2.95, -0.1, g);
    mesh(G("sph", 0.07, 6, 6), M(0x333333), 0, 3.28, -0.1, g);
    mesh(G("plane", 1.5, 0.4), MT("ks", signTex(pick(["PURE WATER", "FRESH PEPPER", "AGEGE BREAD", "GROUNDNUT", "ZOBO & CHAPMAN"]), 0xffffff, 0x138a36, 256, 70), 0xffffff), 0, 0.5, 0.82, g);
    const kc = pick(ANK);
    const rig = human({ skin: pick(SKINS), shirtTex: ankaraTex(...kc), shirtTexKey: ankKey(kc), sleeves: "short", hair: "none", hat: "gele", hatColor: pick([0xe91e63, 0xffc107, 0x7e57c2]), pants: 0x333333 });
    rig.root.rotation.y = Math.PI; rig.root.position.set(0, 0, -0.25); g.add(rig.root);
    const ph = Math.random() * 6;
    return { g, halfW: 1.15, halfL: 1.0, top: 3.3, bottom: 0, vs: 0, anim(t) { pose.stand(rig, t * 2 + ph); } };
  }

  function hawker() {
    const g = new T.Group();
    const ph = Math.random() * 6;
    const rig = human({ skin: pick(SKINS), shirt: pick([0xff5722, 0x03a9f4, 0xcddc39, 0xffffff, 0xab47bc]), sleeves: "short", pants: 0x2b2b2b, shoes: 0xf2f2f2,
      hair: "fade", basket: "basin", goods: [0xdff3ff, 0xffffff, 0xcfe8ff, 0xffffff, 0xdff3ff, 0xffffff, 0xcfe8ff] });
    g.add(rig.root); blob(1.5, 1.5, g);
    return { g, halfW: 0.75, halfL: 0.55, top: 2.75, bottom: 0, vs: 0, hawker: true,
      anim(t, dt, o) {
        const moving = o.moving;
        rig.root.rotation.y += ((moving ? -o.dir * Math.PI / 2 : Math.PI) - rig.root.rotation.y) * Math.min(1, 10 * dt);
        pose.carry(rig, t * (moving ? 7 : 4) + ph);
      } };
  }

  function okada() {
    const g = new T.Group();
    blob(1.1, 2.4, g);
    for (const z of [-0.8, 0.8]) { const w = mesh(G("cyl", 0.4, 0.4, 0.14, 12), M(0x161616), 0, 0.4, z, g); w.rotation.z = Math.PI / 2; }
    box(0.22, 0.32, 1.7, 0xd62828, 0, 0.72, 0, g);
    box(0.4, 0.3, 0.55, 0x222222, 0, 1.0, -0.1, g);
    box(0.34, 0.1, 0.8, 0x151515, 0, 0.98, 0.5, g);
    box(0.9, 0.06, 0.06, 0x333333, 0, 1.15, -0.62, g);
    box(0.2, 0.14, 0.04, 0xff3030, 0, 0.9, 0.95, g).material = B(0xff3030);
    const rig = human({ skin: pick(SKINS), shirt: pick([0x2e7d32, 0xf9a825, 0x1565c0]), sleeves: "long", pants: 0x3b3b3b, shoes: 0x222222, hair: "none", hat: "cap", hatColor: 0xffc800, scale: 0.82 });
    rig.root.position.set(0, 0.12, 0.35);
    pose.run(rig, 0, 0, 0.25);
    rig.legL.rotation.x = 1.15; rig.legR.rotation.x = 1.15; rig.kneeL.rotation.x = -1.2; rig.kneeR.rotation.x = -1.2;
    rig.armL.rotation.x = 1.25; rig.armR.rotation.x = 1.25; rig.foreL.rotation.x = 0.3; rig.foreR.rotation.x = 0.3;
    g.add(rig.root);
    return { g, halfW: 0.6, halfL: 1.1, top: 2.3, bottom: 0, vs: 9, anim() {} };
  }

  function table(variant) {
    const g = new T.Group();
    blob(2.3, 1.6, g);
    for (const x of [-0.8, 0.8]) for (const z of [-0.45, 0.45]) box(0.08, 0.9, 0.08, 0x6d4c2a, x, 0.45, z, g);
    box(1.95, 0.08, 1.15, 0xa8743a, 0, 0.92, 0, g);
    variant = variant || pick(["orange", "tomato", "water", "yam"]);
    if (variant === "orange" || variant === "tomato") {
      const c1 = variant === "orange" ? 0xff9800 : 0xe53935, c2 = variant === "orange" ? 0xffb74d : 0x43a047;
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) for (let j = 0; j < 2; j++)
        mesh(G("sph", 0.17, 8, 6), M(Math.random() < 0.2 ? c2 : c1), -0.6 + i * 0.4 + r * 0.2 + (j * 0.07), 1.12 + r * 0.26, -0.18 + j * 0.36, g);
    } else if (variant === "water") {
      for (let i = 0; i < 3; i++) for (let r = 0; r < 2; r++) {
        box(0.5, 0.3, 0.4, 0xe3f2fd, -0.6 + i * 0.6, 1.1 + r * 0.3, 0, g);
        box(0.52, 0.06, 0.42, 0x1976d2, -0.6 + i * 0.6, 1.1 + r * 0.3, 0, g);
      }
    } else {
      for (let i = 0; i < 5; i++) for (let r = 0; r < 2; r++) {
        const y = mesh(G("cyl", 0.12, 0.1, 0.8, 8), M(0xa67c52), -0.5 + i * 0.25, 1.1 + r * 0.2, -0.1 + r * 0.1, g);
        y.rotation.z = Math.PI / 2 + 0.2; y.rotation.y = 0.4;
      }
    }
    return { g, halfW: 1.05, halfL: 0.7, top: 1.18, bottom: 0, vs: 0, low: true, anim() {} };
  }

  function sacks() {
    const g = new T.Group();
    blob(2.1, 1.5, g);
    const gh = MT("ghana", LS.util.ghanaTex());
    for (const x of [-0.5, 0.5]) mesh(G("box", 0.95, 0.5, 0.75), gh, x, 0.25, 0, g);
    mesh(G("box", 0.95, 0.5, 0.75), gh, 0, 0.75, 0, g).rotation.y = 0.15;
    mesh(G("box", 0.9, 0.4, 0.7), gh, 0.15, 1.2, 0, g).rotation.y = -0.2;
    return { g, halfW: 1.0, halfL: 0.6, top: 1.4, bottom: 0, vs: 0, low: true, anim() {} };
  }

  function barrier() {
    const g = new T.Group();
    blob(2.2, 1.0, g);
    for (const x of [-0.9, 0.9]) box(0.1, 1.0, 0.1, 0x444444, x, 0.5, 0, g);
    mesh(G("plane", 2.0, 0.4), MT("div", signTex("DIVERSION", 0xd62828, 0xffffff, 256, 52), 0xffffff, { side: T.DoubleSide }), 0, 0.82, 0, g);
    mesh(G("plane", 2.0, 0.3), MT("div2", signTex("ROAD WORK", 0xffffff, 0xd62828, 256, 40), 0xffffff, { side: T.DoubleSide }), 0, 0.42, 0, g);
    return { g, halfW: 1.05, halfL: 0.4, top: 1.05, bottom: 0, vs: 0, low: true, anim() {} };
  }

  function cloth() {
    const g = new T.Group();
    for (const s of [-1, 1]) mesh(G("cyl", 0.08, 0.08, 3.4, 6), M(0x6d4c2a), s * 4.0, 1.7, 0, g);
    box(8.2, 0.1, 0.1, 0x6d4c2a, 0, 3.35, 0, g);
    const banner = Math.random() < 0.35;
    const pieces = [];
    if (banner) {
      const bg = new T.Group(); bg.position.set(0, 3.3, 0); g.add(bg);
      mesh(G("plane", 7.4, 1.3), MT("sale", signTex(pick(["BIG SALE! BIG SALE!", "ANKARA · ASO-EBI · LACE", "FRESH FISH · CHEAP!"]), 0xffe600, 0xd62828, 512, 90), 0xffffff, { side: T.DoubleSide }), 0, -0.75, 0, bg);
      pieces.push(bg);
    } else {
      for (let i = 0; i < 10; i++) {
        const c = pick(ANK);
        const pg = new T.Group(); pg.position.set(-3.6 + i * 0.8, 3.3, 0); g.add(pg);
        mesh(G("plane", 0.74, 1.9), MT("cl" + ankKey(c), ankaraTex(...c), 0xffffff, { side: T.DoubleSide }), 0, -0.95, 0, pg);
        pieces.push(pg);
      }
    }
    return { g, halfW: 4.1, halfL: 0.35, top: 4.0, bottom: banner ? 1.9 : 1.4, vs: 0, high: true, wide: true,
      anim(t) { pieces.forEach((p, i) => { p.rotation.z = Math.sin(t * 2 + i) * 0.05; p.rotation.x = Math.sin(t * 1.5 + i * 0.7) * 0.06; }); } };
  }

  const OBSTACLE_INFO = {
    danfo: { msg: "Danfo jam you!", f: danfo },
    mwoman: { msg: "You bump market woman!", f: marketWoman },
    mman: { msg: "Ghana-must-go bag knock you!", f: marketMan },
    kiosk: { msg: "You run enter vendor shop!", f: kiosk },
    hawker: { msg: "Hawker block your way!", f: hawker },
    okada: { msg: "Okada nearly kill you!", f: okada },
    table: { msg: "You kick the vendor table!", f: table },
    sacks: { msg: "You trip on the bags!", f: sacks },
    barrier: { msg: "Road work! Diversion!", f: barrier },
    cloth: { msg: "You no roll under the cloth!", f: cloth },
  };

  /* ───────── boosters ───────── */
  const POWERS = {
    garri:     { name: "GARRI SHIELD", icon: "🥣", dur: 8,  price: 25000, color: 0xf3e3a0, css: "#f3e3a0", desc: "Strong! Blocks one crash" },
    groundnut: { name: "GROUNDNUT MAGNET", icon: "🥜", dur: 9, price: 40000, color: 0xe0a458, css: "#e0a458", desc: "Naira flies to you" },
    zobo:      { name: "ZOBO x2", icon: "🥤", dur: 10, price: 60000, color: 0xc2185b, css: "#e91e63", desc: "Double score" },
    jollof:    { name: "JOLLOF JUMP", icon: "🍛", dur: 9, price: 75000, color: 0xff5722, css: "#ff7043", desc: "Mega jump over danfo" },
    suya:      { name: "SUYA RUSH", icon: "🍢", dur: 5.5, price: 120000, color: 0xff6a2b, css: "#ff7a3b", desc: "Turbo dash — smash everything" },
  };
  const haloMats = {};
  function halo(color) {
    if (!haloMats[color]) haloMats[color] = new T.SpriteMaterial({ map: glowTex(), color, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 });
    const s = new T.Sprite(haloMats[color]); s.scale.set(2.3, 2.3, 1); return s;
  }
  function pickupModel(kind) {
    const g = new T.Group(), it = new T.Group(); g.add(it);
    const P = POWERS[kind];
    if (kind === "garri") {
      mesh(G("cyl", 0.42, 0.28, 0.26, 16), M(0xf4f4f4), 0, 0, 0, it);
      mesh(G("torus", 0.42, 0.04, 6, 16), M(0x2a6fd1), 0, 0.13, 0, it).rotation.x = Math.PI / 2;
      mesh(G("sph", 0.38, 14, 10), M(0xf6e7a8), 0, 0.12, 0, it).scale.set(1, 0.62, 1);
      for (let i = 0; i < 6; i++) mesh(G("sph", 0.05, 5, 4), M(0xe3cf86), Math.cos(i * 1.1) * 0.22, 0.34, Math.sin(i * 1.1) * 0.22, it);
    } else if (kind === "groundnut") {
      const c = mesh(G("cone", 0.3, 0.7, 10), M(0xc8a26a), 0, -0.1, 0, it); c.rotation.x = Math.PI;
      for (let i = 0; i < 9; i++) {
        const a = i * 0.9;
        const n = mesh(G("sph", 0.1, 6, 5), M(0xd9a066), Math.cos(a) * 0.17, 0.28 + (i % 3) * 0.06, Math.sin(a) * 0.17, it);
        n.scale.set(1, 0.8, 1.3);
      }
    } else if (kind === "suya") {
      const st = mesh(G("cyl", 0.025, 0.025, 1.1, 5), M(0xcaa56a), 0, 0, 0, it);
      [0x7a3b12, 0x9a4f1c, 0x6e330f, 0x8a4516].forEach((c, i) => {
        const m = mesh(G("box", 0.26, 0.2, 0.2), M(c), 0, -0.3 + i * 0.22, 0, it);
        m.rotation.y = i * 0.5;
        box(0.28, 0.04, 0.22, 0xc0392b, 0, -0.2 + i * 0.22, 0, it).rotation.y = i * 0.5;
      });
      it.rotation.z = 0.35;
    } else if (kind === "zobo") {
      mesh(G("cyl", 0.2, 0.2, 0.55, 12), M(0x7b1230), 0, 0, 0, it);
      mesh(G("cyl", 0.205, 0.205, 0.16, 12), M(0xffffff), 0, 0.02, 0, it);
      mesh(G("cyl", 0.09, 0.2, 0.18, 10), M(0x7b1230), 0, 0.36, 0, it);
      mesh(G("cyl", 0.1, 0.1, 0.07, 10), M(0xffd84a), 0, 0.5, 0, it);
    } else { // jollof
      mesh(G("cyl", 0.52, 0.4, 0.07, 16), M(0xffffff), 0, -0.1, 0, it);
      mesh(G("sph", 0.4, 14, 10), M(0xe2552b), 0, -0.02, 0, it).scale.set(1, 0.6, 1);
      for (let i = 0; i < 3; i++) mesh(G("cyl", 0.1, 0.1, 0.05, 8), M(0xe6b422), 0.3 - i * 0.12, 0.12, 0.28 - i * 0.05, it).rotation.x = 0.4;
      mesh(G("sph", 0.1, 6, 5), M(0x2e9e4a), -0.1, 0.22, -0.1, it);
    }
    it.scale.setScalar(1.3);
    g.add(halo(P.color));
    g.userData.it = it;
    return g;
  }

  /* ───────── coins ───────── */
  function coinFace() {
    return canvasTex("coinface", 64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32);
      gr.addColorStop(0, "#ffe680"); gr.addColorStop(1, "#e0a800");
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      g.strokeStyle = "#b8860b"; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.stroke();
      // hand-drawn naira sign (no font dependency): N with two bars
      g.strokeStyle = "#7a5200"; g.lineWidth = 6; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(21, 46); g.lineTo(21, 18); g.lineTo(43, 46); g.lineTo(43, 18); g.stroke();
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(14, 28); g.lineTo(50, 28); g.moveTo(14, 37); g.lineTo(50, 37); g.stroke();
    });
  }
  function makeCoin() {
    const g = new T.Group();
    const side = M(0xd49a00, { emissive: 0x4a3200 });
    const face = MT("coinF", coinFace(), 0xffffff, { emissive: 0x6b4a00 });
    const c = new T.Mesh(G("cyl", 0.36, 0.36, 0.09, 20), [side, face, face]);
    c.rotation.x = Math.PI / 2;
    g.add(c);
    return g;
  }

  LS.Props = {
    POWERS, OBSTACLE_INFO, makeCoin,
    makeObstacle(type, variant) {
      const info = OBSTACLE_INFO[type];
      const o = info.f(variant);
      o.type = type; o.msg = info.msg;
      return o;
    },
    makePickup: pickupModel,
  };
})();
