/* Lagos Run — shared utils, procedural textures, characters & poses (all built from primitives) */
(function () {
  "use strict";
  const LS = (window.LS = window.LS || {});
  const T = THREE;

  LS.C = { LW: 2.4, SEG_LEN: 25, NUM_SEG: 10, ZONE_LEN: 300, ROAD_W: 8.6 };

  /* ───────── caches ───────── */
  const geoCache = new Map(), matCache = new Map(), texCache = new Map();

  function G(kind, ...a) {
    const key = kind + a.join(",");
    let g = geoCache.get(key);
    if (!g) {
      switch (kind) {
        case "box": g = new T.BoxGeometry(...a); break;
        case "cyl": g = new T.CylinderGeometry(...a); break;
        case "sph": g = new T.SphereGeometry(...a); break;
        case "cone": g = new T.ConeGeometry(...a); break;
        case "plane": g = new T.PlaneGeometry(...a); break;
        case "torus": g = new T.TorusGeometry(...a); break;
        case "cap": g = new T.CapsuleGeometry(...a); break;
        default: throw new Error("geo " + kind);
      }
      geoCache.set(key, g);
    }
    return g;
  }
  function M(color, o) {
    const key = "L" + color + (o ? JSON.stringify(o) : "");
    let m = matCache.get(key);
    if (!m) { m = new T.MeshLambertMaterial(Object.assign({ color }, o || {})); matCache.set(key, m); }
    return m;
  }
  function B(color, o) {
    const key = "B" + color + (o ? JSON.stringify(o) : "");
    let m = matCache.get(key);
    if (!m) { m = new T.MeshBasicMaterial(Object.assign({ color }, o || {})); matCache.set(key, m); }
    return m;
  }
  // textured Lambert material, cached by texture uuid (+ simple options)
  function MT(key, tex, color, o) {
    const k = "T" + tex.uuid + (color == null ? "" : color) + (o ? JSON.stringify(o) : "");
    let m = matCache.get(k);
    if (!m) { m = new T.MeshLambertMaterial(Object.assign({ map: tex, color: color == null ? 0xffffff : color }, o || {})); matCache.set(k, m); }
    return m;
  }
  // textured Basic (unlit) material — used for signs/billboards
  function BT(tex, o) {
    const k = "BT" + tex.uuid + (o ? JSON.stringify(o) : "");
    let m = matCache.get(k);
    if (!m) { m = new T.MeshBasicMaterial(Object.assign({ map: tex }, o || {})); matCache.set(k, m); }
    return m;
  }
  function mesh(g, m, x, y, z, parent) {
    const o = new T.Mesh(g, m);
    o.position.set(x || 0, y || 0, z || 0);
    if (parent) parent.add(o);
    return o;
  }
  function box(w, h, d, color, x, y, z, parent) { return mesh(G("box", w, h, d), M(color), x, y, z, parent); }
  const css = (n) => "#" + n.toString(16).padStart(6, "0");
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function canvasTex(key, w, h, draw, repeat) {
    let t = texCache.get(key);
    if (t) return t;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    t = new T.CanvasTexture(c);
    t.anisotropy = 4;
    if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
    texCache.set(key, t);
    return t;
  }

  /* ───────── procedural textures ───────── */
  function signTex(text, bg, fg, w, h, border) {
    w = w || 512; h = h || 128;
    return canvasTex("sign:" + text + bg + fg + w + h, w, h, (g) => {
      g.fillStyle = css(bg); g.fillRect(0, 0, w, h);
      if (border !== false) {
        g.strokeStyle = css(fg); g.lineWidth = h * 0.06;
        g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12);
      }
      let fs = h * 0.56;
      const font = (s) => `900 ${s}px "Segoe UI", "Arial Black", Arial, sans-serif`;
      g.font = font(fs);
      while (g.measureText(text).width > w * 0.86 && fs > 8) { fs -= 2; g.font = font(fs); }
      g.fillStyle = css(fg); g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(text, w / 2, h / 2 + h * 0.03);
    });
  }

  function ankaraTex(c1, c2, c3) {
    return canvasTex("ank" + c1 + c2 + c3, 128, 128, (g, w, h) => {
      g.fillStyle = css(c1); g.fillRect(0, 0, w, h);
      const motif = (cx, cy, r) => {
        g.fillStyle = css(c2); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
        g.fillStyle = css(c1); g.beginPath(); g.arc(cx, cy, r * 0.7, 0, 7); g.fill();
        g.fillStyle = css(c3); g.beginPath(); g.arc(cx, cy, r * 0.4, 0, 7); g.fill();
        g.fillStyle = css(c2); g.beginPath(); g.arc(cx, cy, r * 0.15, 0, 7); g.fill();
      };
      motif(32, 32, 28); motif(96, 96, 28);
      g.fillStyle = css(c3);
      g.save(); g.translate(96, 32); g.rotate(Math.PI / 4); g.fillRect(-14, -14, 28, 28); g.restore();
      g.save(); g.translate(32, 96); g.rotate(Math.PI / 4); g.fillRect(-14, -14, 28, 28); g.restore();
      g.fillStyle = css(c2);
      for (let i = 0; i < 4; i++) { g.fillRect(64 - 2, i * 32 + 6, 4, 10); g.fillRect(i * 32 + 6, 64 - 2, 10, 4); }
    }, true);
  }

  function ghanaTex() { // the famous red-white-blue checked bag
    return canvasTex("ghana", 128, 128, (g, w, h) => {
      g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, w, h);
      const col = ["#d62828", "#1f4fb4"];
      for (let i = 0; i < 8; i++) {
        g.fillStyle = col[i % 2]; g.globalAlpha = 0.9;
        g.fillRect(i * 16, 0, 9, h);
        g.fillRect(0, i * 16, w, 9);
      }
      g.globalAlpha = 1;
    }, true);
  }

  function umbrellaTex(c1, c2) {
    return canvasTex("umb" + c1 + c2, 128, 16, (g, w, h) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = css(i % 2 ? c1 : c2); g.fillRect(i * 16, 0, 16, h); }
    }, true);
  }

  function glowTex() {
    return canvasTex("glow", 64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.25, "rgba(255,255,255,0.55)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    });
  }

  function shadowTex() {
    return canvasTex("shadow", 64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(0,0,0,0.55)");
      gr.addColorStop(0.6, "rgba(0,0,0,0.3)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    });
  }
  function blob(w, d, parent, y) {
    const m = new T.Mesh(G("plane", 1, 1), MT("shadow", shadowTex(), 0x000000, { transparent: true, depthWrite: false, opacity: 1 }));
    m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.position.y = y == null ? 0.03 : y;
    m.renderOrder = 1;
    if (parent) parent.add(m);
    return m;
  }

  /* ───────── humans ───────── */
  function human(o) {
    o = Object.assign({
      skin: 0x8d5a34, shirt: 0xffffff, shirtTex: null, pants: 0x2c3e50, shoes: 0xffffff,
      sleeves: "short", shorts: false, skirt: null, skirtTex: null,
      hair: "fade", hairColor: 0x111111, hat: null, hatColor: 0x222222,
      shades: false, chain: false, backpack: null, basket: null, bag: false,
      accent: null, beard: false, earring: false, lanyard: false, sash: null, scale: 1,
    }, o);

    const root = new T.Group();
    const pivot = new T.Group(); pivot.position.y = 0.95; root.add(pivot);
    const body = new T.Group(); body.position.y = -0.95; pivot.add(body);
    const skinM = M(o.skin);
    const shirtM = o.shirtTex ? MT("shirt" + o.shirtTexKey, o.shirtTex) : M(o.shirt);
    const sleeveM = o.sleeves === "long" ? M(o.shirt) : (o.sleeves === "short" ? shirtM : skinM);
    const rig = { root, pivot, body };

    // torso
    rig.torso = mesh(G("box", 0.74, 0.68, 0.42), shirtM, 0, 1.14, 0, body);
    if (o.accent != null) box(0.77, 0.1, 0.45, o.accent, 0, 0.84, 0, body);
    if (o.sash != null) {
      const s = box(0.14, 0.95, 0.46, o.sash, 0, 1.14, 0, body);
      s.rotation.z = 0.62;
    }
    if (o.lanyard) { box(0.06, 0.5, 0.02, 0xd62828, 0.1, 1.2, -0.225, body); box(0.14, 0.18, 0.03, 0xffffff, 0.1, 0.9, -0.23, body); }
    mesh(G("cyl", 0.1, 0.1, 0.16, 8), skinM, 0, 1.52, 0, body);

    // head
    const head = new T.Group(); head.position.set(0, 1.82, 0); body.add(head); rig.head = head;
    mesh(G("sph", 0.3, 18, 14), skinM, 0, 0, 0, head);
    for (const ex of [-0.115, 0.115]) {
      mesh(G("sph", 0.065, 8, 6), B(0xffffff), ex, 0.05, -0.255, head).scale.set(1, 0.85, 0.5);
      mesh(G("sph", 0.038, 8, 6), B(0x111111), ex, 0.05, -0.285, head);
    }
    mesh(G("sph", 0.06, 8, 6), M(o.skin), 0, -0.04, -0.3, head).scale.set(1, 0.8, 0.8);
    mesh(G("sph", 0.07, 8, 6), skinM, -0.3, 0, 0, head);
    mesh(G("sph", 0.07, 8, 6), skinM, 0.3, 0, 0, head);
    if (o.earring) { mesh(G("sph", 0.035, 8, 6), B(0xffd84a), -0.34, -0.06, 0, head); mesh(G("sph", 0.035, 8, 6), B(0xffd84a), 0.34, -0.06, 0, head); }
    if (o.beard) box(0.34, 0.14, 0.1, 0x111111, 0, -0.2, -0.24, head);
    if (o.shades) {
      box(0.54, 0.09, 0.06, 0x0a0a0a, 0, 0.05, -0.285, head);
      box(0.2, 0.12, 0.05, 0x0a0a0a, -0.12, 0.05, -0.3, head);
      box(0.2, 0.12, 0.05, 0x0a0a0a, 0.12, 0.05, -0.3, head);
    }
    if (o.mask) {
      box(0.46, 0.18, 0.1, o.mask, 0, -0.15, -0.26, head);
      box(0.07, 0.05, 0.08, o.mask, -0.3, -0.12, -0.1, head);
      box(0.07, 0.05, 0.08, o.mask, 0.3, -0.12, -0.1, head);
    }

    // hair / hats
    const hairM = M(o.hairColor);
    const cap = (cover) => mesh(G("sph", 0.315, 16, 8, 0, Math.PI * 2, 0, cover), hairM, 0, 0.02, 0.025, head);
    switch (o.hair) {
      case "fade": cap(Math.PI * 0.46); break;
      case "braids": {
        cap(Math.PI * 0.46);
        for (let i = -3; i <= 3; i++) {
          const b = box(0.07, 0.55, 0.07, o.hairColor, i * 0.075, -0.1, 0.27 - Math.abs(i) * 0.02, head);
          b.rotation.x = 0.18;
          mesh(G("sph", 0.04, 6, 5), B(0xffd84a), i * 0.075, -0.4, 0.34 - Math.abs(i) * 0.02, head);
        }
        box(0.5, 0.05, 0.06, o.hairColor, 0, 0.27, -0.18, head);
        break;
      }
      case "dreads": {
        cap(Math.PI * 0.5);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const r = 0.3;
          const d = mesh(G("cyl", 0.045, 0.04, 0.62, 6), hairM, Math.sin(a) * r, -0.12, Math.cos(a) * r, head);
          d.rotation.z = -Math.sin(a) * 0.2; d.rotation.x = Math.cos(a) * 0.2;
          if (Math.cos(a) > -0.3) d.visible = true;
        }
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const d = mesh(G("cyl", 0.04, 0.05, 0.3, 6), hairM, Math.sin(a) * 0.12, 0.34, Math.cos(a) * 0.12, head);
          d.rotation.z = Math.sin(a) * 0.5; d.rotation.x = -Math.cos(a) * 0.5;
        }
        break;
      }
      case "none": break;
      default: cap(Math.PI * 0.46);
    }
    if (o.hat === "cap") {
      mesh(G("sph", 0.33, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.46), M(o.hatColor), 0, 0.02, 0.02, head);
      box(0.4, 0.04, 0.3, o.hatColor, 0, 0.14, -0.4, head).rotation.x = 0.12;
      box(0.3, 0.02, 0.02, 0xffffff, 0, 0.2, -0.32, head);
    } else if (o.hat === "fila") {
      const f = mesh(G("cyl", 0.36, 0.3, 0.3, 14), M(o.hatColor), 0, 0.33, 0, head);
      f.rotation.z = 0.2;
      mesh(G("cyl", 0.31, 0.31, 0.06, 14), M(0xffd84a), 0, 0.2, 0, head);
    } else if (o.hat === "hood") {
      mesh(G("sph", 0.36, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), M(o.hatColor), 0, 0.04, 0.02, head);
      box(0.08, 0.55, 0.46, o.hatColor, -0.34, -0.02, 0.02, head);
      box(0.08, 0.55, 0.46, o.hatColor, 0.34, -0.02, 0.02, head);
      box(0.7, 0.42, 0.08, o.hatColor, 0, -0.02, 0.28, head);
    } else if (o.hat === "gele") {
      const gl = M(o.hatColor);
      mesh(G("sph", 0.36, 12, 8), gl, 0, 0.28, 0, head).scale.set(1.3, 0.75, 1.05);
      mesh(G("sph", 0.26, 10, 8), gl, 0.28, 0.46, 0, head).scale.set(1, 1, 0.9);
      mesh(G("torus", 0.3, 0.07, 6, 14), M(0xffd84a), 0, 0.1, 0, head).rotation.x = Math.PI / 2;
    }

    // chain
    if (o.chain) {
      const ch = mesh(G("torus", 0.2, 0.025, 6, 16), B(0xffd84a), 0, 1.45, -0.04, body);
      ch.rotation.x = Math.PI / 2 + 0.35;
      box(0.11, 0.11, 0.03, 0xffd84a, 0, 1.22, -0.235, body).rotation.z = Math.PI / 4;
    }

    // arms
    function arm(side) {
      const a = new T.Group(); a.position.set(side * 0.48, 1.42, 0); body.add(a);
      mesh(G("box", 0.21, 0.44, 0.21), sleeveM, 0, -0.21, 0, a);
      const fore = new T.Group(); fore.position.y = -0.42; a.add(fore);
      mesh(G("box", 0.17, 0.4, 0.17), o.sleeves === "long" ? sleeveM : skinM, 0, -0.2, 0, fore);
      mesh(G("sph", 0.1, 8, 6), skinM, 0, -0.43, 0, fore);
      return { a, fore };
    }
    const aL = arm(-1), aR = arm(1);
    rig.armL = aL.a; rig.foreL = aL.fore; rig.armR = aR.a; rig.foreR = aR.fore;

    // legs
    function leg(side) {
      const l = new T.Group(); l.position.set(side * 0.19, 0.8, 0); body.add(l);
      mesh(G("box", 0.29, 0.4, 0.3), o.shorts ? M(o.pants) : M(o.pants), 0, -0.2, 0, l);
      const knee = new T.Group(); knee.position.y = -0.4; l.add(knee);
      mesh(G("box", 0.25, 0.4, 0.27), o.shorts ? skinM : M(o.pants), 0, -0.2, 0, knee);
      mesh(G("box", 0.29, 0.14, 0.46), M(o.shoes), 0, -0.33, -0.08, knee);
      return { l, knee };
    }
    const lL = leg(-1), lR = leg(1);
    rig.legL = lL.l; rig.kneeL = lL.knee; rig.legR = lR.l; rig.kneeR = lR.knee;

    if (o.skirt != null) {
      const sk = mesh(G("cyl", 0.38, 0.54, 0.84, 14), o.skirtTex ? MT("skirt" + o.skirtTexKey, o.skirtTex) : M(o.skirt), 0, 0.6, 0, body);
      sk.scale.set(1, 1, 0.85);
      box(0.5, 0.45, 0.04, 0xffffff, 0, 0.8, -0.3, body);
    }

    // backpack
    if (o.backpack != null) {
      const bp = new T.Group(); bp.position.set(0, 1.15, 0.33); body.add(bp);
      box(0.56, 0.66, 0.26, o.backpack, 0, 0, 0, bp);
      box(0.58, 0.2, 0.28, o.backpackFlap || 0x1e3a8a, 0, 0.27, 0.01, bp);
      box(0.4, 0.26, 0.07, o.backpackFlap || 0x1e3a8a, 0, -0.14, 0.15, bp);
      mesh(G("cyl", 0.07, 0.07, 0.34, 8), M(0x4aa3ff), 0.33, -0.1, 0, bp);
      box(0.1, 0.09, 0.02, 0xffffff, 0, 0.27, 0.15, bp);
      bp.userData.y = 1.15;
      rig.backpack = bp;
      for (const s of [-1, 1]) {
        box(0.09, 0.5, 0.04, 0x222222, s * 0.2, 1.2, -0.215, body);
        box(0.09, 0.04, 0.5, 0x222222, s * 0.2, 1.48, 0.05, body);
      }
    }

    // basket / basin on the head
    if (o.basket) {
      const bk = new T.Group(); bk.position.set(0, 2.18, 0); body.add(bk); rig.basket = bk;
      mesh(G("cyl", 0.26, 0.26, 0.07, 10), M(0xe8e0d0), 0, 0, 0, bk);
      const wicker = o.basket === "basin" ? 0xe9edf2 : 0xb8864b;
      mesh(G("cyl", 0.66, 0.46, 0.3, 14), M(wicker), 0, 0.17, 0, bk);
      mesh(G("cyl", 0.68, 0.68, 0.05, 14), M(o.basket === "basin" ? 0x3b7fd1 : 0x8a5f2e), 0, 0.32, 0, bk);
      const goods = o.goods || [0xe53935, 0xff9800, 0x43a047, 0xe53935, 0xffeb3b, 0xff9800, 0xe53935];
      goods.forEach((c, i) => {
        const a = (i / goods.length) * Math.PI * 2;
        const r = i === 0 ? 0 : 0.34;
        mesh(G("sph", 0.17, 8, 6), M(c), Math.cos(a) * r, 0.42 + (i === 0 ? 0.16 : 0), Math.sin(a) * r, bk);
      });
    }
    // ghana-must-go bag carried on the head
    if (o.bag) {
      const bg = new T.Group(); bg.position.set(0, 2.5, 0); body.add(bg); rig.bagG = bg;
      mesh(G("box", 1.05, 0.78, 0.6), MT("ghana", ghanaTex()), 0, 0, 0, bg);
      box(1.08, 0.08, 0.62, 0x1f4fb4, 0, 0.36, 0, bg);
      box(0.3, 0.05, 0.64, 0x222222, 0, 0.0, 0, bg);
    }

    root.scale.setScalar(o.scale);
    rig.o = o;
    return rig;
  }

  /* ───────── poses ───────── */
  function reset(r) {
    r.pivot.rotation.set(0, 0, 0); r.pivot.position.y = 0.95; r.pivot.scale.set(1, 1, 1);
    r.body.rotation.set(0, 0, 0); r.head.rotation.set(0, 0, 0);
  }
  const pose = {
    run(r, ph, amp, lean) {
      amp = amp == null ? 1 : amp; lean = lean == null ? 0.14 : lean;
      reset(r);
      const s = Math.sin(ph), c = Math.cos(ph);
      r.legL.rotation.x = s * 0.95 * amp; r.legR.rotation.x = -s * 0.95 * amp;
      r.kneeL.rotation.x = -Math.max(0, Math.sin(ph + 1.3)) * 1.2 * amp - 0.08;
      r.kneeR.rotation.x = -Math.max(0, Math.sin(ph + 1.3 + Math.PI)) * 1.2 * amp - 0.08;
      r.armL.rotation.x = -s * 0.95 * amp; r.armR.rotation.x = s * 0.95 * amp;
      r.foreL.rotation.x = 1.0 + Math.max(0, s) * 0.3; r.foreR.rotation.x = 1.0 + Math.max(0, -s) * 0.3;
      r.body.position.y = -0.95 + Math.abs(c) * 0.07 * amp;
      r.body.rotation.x = -lean; r.body.rotation.y = s * 0.12 * amp;
      r.head.rotation.x = lean * 0.8;
      if (r.backpack) r.backpack.position.y = r.backpack.userData.y + Math.abs(c) * 0.035 * amp;
    },
    jump(r, vy) {
      reset(r);
      const up = vy > 0 ? 1 : 0.4;
      r.legL.rotation.x = 0.75; r.kneeL.rotation.x = -1.2;
      r.legR.rotation.x = -0.35 * up; r.kneeR.rotation.x = -0.5;
      r.armL.rotation.x = 2.5; r.armR.rotation.x = 2.5; r.foreL.rotation.x = 0.3; r.foreR.rotation.x = 0.3;
      r.body.rotation.x = -0.08; r.body.position.y = -0.95;
    },
    roll(r, p) {
      reset(r);
      r.pivot.rotation.x = -p * Math.PI * 2;
      r.pivot.position.y = 0.62;
      r.legL.rotation.x = 1.7; r.legR.rotation.x = 1.7; r.kneeL.rotation.x = -2.1; r.kneeR.rotation.x = -2.1;
      r.armL.rotation.x = 1.1; r.armR.rotation.x = 1.1; r.foreL.rotation.x = 1.9; r.foreR.rotation.x = 1.9;
      r.body.rotation.x = -0.5; r.head.rotation.x = 0.6;
    },
    stumble(r, p, ph) {
      pose.run(r, ph * 0.7, 0.6, 0.1);
      r.body.rotation.x = -0.65 * Math.sin(Math.min(1, p) * Math.PI);
      r.armL.rotation.x = 2.2 * (1 - p) ; r.armR.rotation.x = 2.2 * (1 - p);
    },
    fall(r, p) {
      reset(r);
      p = Math.min(1, p);
      r.pivot.rotation.x = -p * 1.45;
      r.pivot.position.y = 0.95 - p * 0.42;
      r.armL.rotation.x = 2.6 * p; r.armR.rotation.x = 2.6 * p; r.legL.rotation.x = 0.3 * p; r.legR.rotation.x = -0.3 * p;
    },
    // hand: -1 slaps with the left arm, +1 with the right. p is 0..1 through the swing.
    slap(r, p, hand) {
      reset(r);
      const strike = p < 0.22 ? 0 : Math.min(1, (p - 0.22) / 0.14);
      const arm = hand < 0 ? r.armL : r.armR;
      const fore = hand < 0 ? r.foreL : r.foreR;
      const back = hand < 0 ? r.armR : r.armL;
      const backF = hand < 0 ? r.foreR : r.foreL;
      r.body.rotation.y = -hand * (0.15 + strike * 0.55);
      r.body.rotation.x = 0.1 + strike * 0.12;
      r.head.rotation.y = -hand * 0.25;
      arm.rotation.x = (1 - strike) * -0.55 + strike * 1.85;
      arm.rotation.z = hand * ((1 - strike) * 1.15 - strike * 1.05);
      fore.rotation.x = 0.25 + strike * 1.45;
      back.rotation.x = 0.35;
      backF.rotation.x = 0.9;
      r.legL.rotation.x = hand < 0 ? 0.35 : -0.1;
      r.legR.rotation.x = hand < 0 ? -0.1 : 0.35;
    },
    // fromSide is which side the slap comes from. The head snaps away from it.
    slapped(r, p, fromSide) {
      reset(r);
      const hit = p < 0.3 ? 0 : Math.min(1, (p - 0.3) / 0.12);
      r.head.rotation.z = -fromSide * hit * 1.05;
      r.head.rotation.y = -fromSide * hit * 0.7;
      r.body.rotation.z = -fromSide * hit * 0.5;
      r.body.rotation.x = hit * 0.28;
      r.pivot.position.x = -fromSide * hit * 0.28;
      r.pivot.rotation.z = -fromSide * hit * 0.22;
      r.armL.rotation.x = 0.5 + hit * 0.8;
      r.armR.rotation.x = 0.4 + hit * 0.5;
      r.kneeL.rotation.x = -0.55 * hit;
      r.kneeR.rotation.x = -0.4 * hit;
    },
    chase(r, ph) {
      pose.run(r, ph, 1.15, 0.3);
      const s = Math.sin(ph * 2);
      r.armL.rotation.x = 1.35 + s * 0.15; r.armR.rotation.x = 1.4 - s * 0.15;
      r.foreL.rotation.x = 0.2; r.foreR.rotation.x = 0.25;
    },
    walk(r, ph) {
      pose.run(r, ph, 0.55, 0.04);
      r.body.position.y = -0.95 + Math.abs(Math.cos(ph)) * 0.04;
    },
    carry(r, ph) { // arms up holding something on the head, walking
      pose.walk(r, ph);
      r.armL.rotation.x = 3.0; r.armR.rotation.x = 3.0;
      r.foreL.rotation.x = 0.35; r.foreR.rotation.x = 0.35;
    },
    stand(r, ph) { // vendor behind counter
      reset(r);
      r.armL.rotation.x = 0.7 + Math.sin(ph) * 0.25; r.armR.rotation.x = 0.6 - Math.sin(ph) * 0.25;
      r.foreL.rotation.x = 1.2; r.foreR.rotation.x = 1.2;
      r.body.position.y = -0.95 + Math.sin(ph * 0.5) * 0.015;
    },
  };

  /* ───────── playable characters ───────── */
  const CHARACTERS = [
    {
      id: "student", name: "Campus Student", emoji: "🎓", tag: "Backpack · Book-smart",
      perk: "Backpack packs a free Garri shield for the first 5 seconds.",
      build: () => human({ skin: 0x8d5a34, shirt: 0xf4f6f8, accent: 0x1e3a8a, pants: 0x1c2a4a, shoes: 0xe63946, hair: "fade",
        backpack: 0xff7a00, backpackFlap: 0x1e3a8a, lanyard: true, sleeves: "short" }),
    },
    {
      id: "prince", name: "Afro Prince", emoji: "🎤", tag: "Braids · Gold chain · Red jacket",
      perk: "Hype! Every naira note is worth 25% more.",
      build: () => human({ skin: 0x6b4226, shirt: 0xd62839, accent: 0x111111, sleeves: "long", pants: 0x16161c, shoes: 0xffffff,
        hair: "braids", chain: true, earring: true }),
    },
    {
      id: "crooner", name: "Smooth Crooner", emoji: "🕶️", tag: "Cap · Shades · Bomber",
      perk: "Smooth talker — the Agbero falls back much faster.",
      build: () => human({ skin: 0x7b4b2a, shirt: 0x23232b, accent: 0xffd60a, sleeves: "long", pants: 0xcfd8dc, shoes: 0xffd60a,
        hair: "none", hat: "cap", hatColor: 0x111116, shades: true, chain: true }),
    },
    {
      id: "king", name: "Gbedu King", emoji: "👑", tag: "Dreads · Ankara · Swagger",
      perk: "Gbedu flow — distance score grows 25% faster.",
      build: () => human({ skin: 0x5a3825, shirtTex: ankaraTex(0x0b8f4e, 0xffc107, 0xffffff), shirtTexKey: "king", sleeves: "short",
        pants: 0x1c3b2b, shoes: 0x7a4a24, hair: "dreads", shades: true, chain: true, earring: true }),
    },
    {
      id: "trader", name: "Market Trader", emoji: "🧺", tag: "Basket on head · Hustler",
      perk: "Hustle! Boosters (garri, suya…) last 30% longer.",
      build: () => human({ skin: 0x7b4b2a, shirtTex: ankaraTex(0x1b5fbf, 0xff8a1f, 0xfff1c9), shirtTexKey: "trader", sleeves: "short",
        pants: 0x5b4636, shoes: 0x2a2a2a, hair: "none", hat: "fila", hatColor: 0xc0392b, basket: "wicker", beard: true,
        goods: [0xe53935, 0xff9800, 0x43a047, 0xe53935, 0xffeb3b, 0x43a047, 0xe53935] }),
    },
    {
      id: "thief", name: "Area Thief", emoji: "🥷", tag: "Hood · Mask · Quick legs",
      perk: "Bolt! Hit an obstacle and you dash faster instead of slowing down.",
      build: () => human({ skin: 0x6b4226, shirt: 0x161616, accent: 0x0a0a0a, sleeves: "long", pants: 0x101010, shoes: 0xf2f2f2,
        hair: "none", hat: "hood", hatColor: 0x121212, mask: 0x1c1c1c, shades: true,
        backpack: 0x2a2a2a, backpackFlap: 0x111111 }),
    },
  ];

  /* The Agbero who chases you: white top, green trousers, green cap + sash */
  function buildAgbero() {
    return human({ skin: 0x5a3825, shirt: 0xffffff, sleeves: "long", accent: 0x138a36, sash: 0x138a36, pants: 0x138a36, shoes: 0xf2f2f2,
      hair: "none", hat: "fila", hatColor: 0x138a36, beard: true, scale: 1.05 });
  }

  LS.util = { G, M, B, MT, BT, mesh, box, css, pick, rnd, canvasTex, signTex, ankaraTex, ghanaTex, umbrellaTex, glowTex, shadowTex, blob };
  LS.human = human;
  LS.pose = pose;
  LS.CHARACTERS = CHARACTERS;
  LS.buildAgbero = buildAgbero;
})();
