/* Lagos Run — the endless Lagos road: zones, sky, lighting, recycled road segments & scenery */
(function () {
  "use strict";
  const LS = (window.LS = window.LS || {});
  const T = THREE;
  const { SEG_LEN, NUM_SEG, ZONE_LEN, ROAD_W } = LS.C;
  const { G, M, B, MT, BT, mesh, box, pick, rnd, canvasTex, signTex, ankaraTex, umbrellaTex, glowTex } = LS.util;

  const C = (hex) => new T.Color(hex);

  /* ───────── zones (the journey across Lagos) ───────── */
  const ZONES = [
    { id: "oshodi", name: "Oshodi", look: "market", tag: "Oshodi Interchange · Morning rush", gate: "WELCOME TO OSHODI", gateBg: 0x138a36, gateFg: 0xffffff,
      top: 0x3f8fd8, hor: 0xd9ecf8, night: 0.0, sunDir: [-0.5, 0.45, -1], sunCol: 0xfff0c8, hemiSky: 0xeaf4ff, hemiGnd: 0x9b8760, hemiI: 0.85, sunI: 0.9,
      ground: 0xa88b5e, walk: 0x9d978a, road: 0xd2d2d6, type: "street",
      pal: [0xe9d8b4, 0xd9a066, 0xb8523a, 0xe6c36a, 0x8fa6a8, 0xcdb58b], hMin: 6, hMax: 13, kind: "wall",
      signs: ["OSHODI MARKET", "FRESH PEPPER", "GARRI & BEANS", "TYRE REPAIR", "BUKA · RICE & STEW", "PHONE CREDIT"] },
    { id: "mushin", name: "Mushin", look: "market", tag: "Mushin · Under the bridge", gate: "WELCOME TO MUSHIN", gateBg: 0xe65100, gateFg: 0xffffff,
      top: 0x4a9be0, hor: 0xf3e2c4, night: 0.0, sunDir: [-0.2, 0.55, -1], sunCol: 0xfff3d0, hemiSky: 0xfff6e8, hemiGnd: 0xa08458, hemiI: 0.88, sunI: 0.95,
      ground: 0xb08960, walk: 0xa39888, road: 0xcfc8bc, type: "street",
      pal: [0xd7b07a, 0xc46b3a, 0x8d6e63, 0xf0d7a0, 0x6d8b74, 0xc45c4a], hMin: 5, hMax: 12, kind: "wall",
      signs: ["MUSHIN MARKET", "PROVISIONS", "PALM OIL", "OKIRIKA", "BUS STOP", "PEAK MILK"] },
    { id: "yaba", name: "Yaba", look: "fabric", tag: "Yaba · Tejuosho & the rails", gate: "YABA · TEJUOSHO", gateBg: 0x6a1b9a, gateFg: 0xffffff,
      top: 0x3d8ad4, hor: 0xe7f2ea, night: 0.0, sunDir: [0.3, 0.6, -1], sunCol: 0xfff6df, hemiSky: 0xf4fff8, hemiGnd: 0x8f9470, hemiI: 0.9, sunI: 1.0,
      ground: 0x9aaa72, walk: 0xb4aa9a, road: 0xd5d2cc, type: "street",
      pal: [0xce93d8, 0xff8a65, 0xffd54f, 0x4db6ac, 0xf48fb1, 0x90caf9], hMin: 7, hMax: 16, kind: "wall",
      signs: ["TEJUOSHO MARKET", "UNILAG GATE", "BOOKS & PAST Q", "FABRIC", "YABA LEFT", "PRINTING PRESS"] },
    { id: "ojuelegba", name: "Ojuelegba", look: "market", tag: "Ojuelegba · Bus stop no be small", gate: "OJUELEGBA BUS STOP", gateBg: 0xc62828, gateFg: 0xfff176,
      top: 0x5b92c9, hor: 0xf8e7c8, night: 0.02, sunDir: [0.45, 0.4, -1], sunCol: 0xffe0a8, hemiSky: 0xfff3e0, hemiGnd: 0x9a7d55, hemiI: 0.84, sunI: 0.92,
      ground: 0xa67c52, walk: 0x9c9084, road: 0xc8c4ba, type: "street",
      pal: [0xffb74d, 0x8d6e63, 0xe57373, 0xfff176, 0x7986cb, 0xa1887f], hMin: 6, hMax: 14, kind: "wall",
      signs: ["OJUELEGBA", "DANFO LOADING", "UNDERBRIDGE", "CD & MIXTAPE", "PEPPER SOUP", "SHOE MAKER"] },
    { id: "surulere", name: "Surulere", look: "street", tag: "Surulere · Stadium side", gate: "SURULERE", gateBg: 0x2e7d32, gateFg: 0xffffff,
      top: 0x4c93d4, hor: 0xe8f5e9, night: 0.0, sunDir: [-0.35, 0.7, -1], sunCol: 0xfff8e8, hemiSky: 0xf1f8e9, hemiGnd: 0x7d8f62, hemiI: 0.9, sunI: 0.98,
      ground: 0x6fa35a, walk: 0xb7b1a4, road: 0xd0d0d4, type: "street",
      pal: [0xece7dc, 0xc5d5c0, 0xd7ccc8, 0xb0bec5, 0xffe0b2], hMin: 6, hMax: 14, kind: "wall",
      signs: ["NATIONAL STADIUM", "ADENIRAN OGUNSANYA", "BODE THOMAS", "VIEWING CENTRE", "SHAWAMA"] },
    { id: "computer", name: "Computer Village", look: "tech", tag: "Ikeja · Phones, laptops & gbege", gate: "COMPUTER VILLAGE", gateBg: 0x1565c0, gateFg: 0xffffff,
      top: 0x4b8fd0, hor: 0xf6e8c8, night: 0.0, sunDir: [0.5, 0.35, -1], sunCol: 0xffe2b0, hemiSky: 0xf4f1ff, hemiGnd: 0x9a9a92, hemiI: 0.85, sunI: 0.95,
      ground: 0x9c9a92, walk: 0xb0b0b0, road: 0xc8c8cf, type: "street",
      pal: [0xeceff1, 0x90caf9, 0x4fc3f7, 0xfff59d, 0xb0bec5, 0xa5d6a7], hMin: 8, hMax: 15, kind: "wall",
      signs: ["PHONES · LAPTOPS", "SCREEN REPAIR", "UNLOCKED GADGETS", "GAMING STATION", "SIM · DATA · AIRTIME", "TECH HUB"] },
    { id: "allen", name: "Allen Avenue", look: "tech", tag: "Ikeja · Allen night is loading", gate: "ALLEN AVENUE", gateBg: 0x283593, gateFg: 0xffeb3b,
      top: 0x35588a, hor: 0xf0d0b0, night: 0.18, sunDir: [0.7, 0.12, -1], sunCol: 0xffb074, hemiSky: 0xffe8d0, hemiGnd: 0x6e624c, hemiI: 0.75, sunI: 0.8,
      ground: 0x8d8a84, walk: 0xb0aaa0, road: 0xc2c4cc, type: "street",
      pal: [0xeceff1, 0x5c6bc0, 0xffcc80, 0x80cbc4, 0xb0bec5], hMin: 8, hMax: 18, kind: "wall",
      signs: ["ALLEN AVENUE", "LOUNGE", "IKEJA CITY MALL", "GRILL", "CAR MART"] },
    { id: "agege", name: "Agege", look: "market", tag: "Agege · Bread, pen cinema, go-slow", gate: "AGEGE", gateBg: 0xf9a825, gateFg: 0x3e2723,
      top: 0x5aa0dc, hor: 0xfff3d6, night: 0.0, sunDir: [-0.55, 0.5, -1], sunCol: 0xfff6d8, hemiSky: 0xfff8e1, hemiGnd: 0xa89060, hemiI: 0.9, sunI: 0.95,
      ground: 0xc4a36e, walk: 0xb1a496, road: 0xd8d2c6, type: "street",
      pal: [0xffe082, 0xd7ccc8, 0xffab91, 0xa5d6a7, 0xbcaaa4, 0xfff59d], hMin: 4, hMax: 11, kind: "wall",
      signs: ["AGEGE BREAD", "PEN CINEMA", "PENCIL", "MOTOR PARK", "PROVISIONS", "PURE WATER"] },
    { id: "theatre", name: "National Theatre", look: "theatre", tag: "Iganmu · The Eko landmark", gate: "IGANMU · NATIONAL THEATRE", gateBg: 0x6a1b9a, gateFg: 0xffe082,
      top: 0x5a86c8, hor: 0xffdca8, night: 0.08, sunDir: [0.6, 0.16, -1], sunCol: 0xffc27a, hemiSky: 0xfff0dc, hemiGnd: 0x8a7a5a, hemiI: 0.8, sunI: 0.95,
      ground: 0x4f9a4a, walk: 0xbdb7a8, road: 0xc4c4ca, type: "street",
      pal: [0xe0d6c3, 0xcfd8dc, 0xbcaaa4, 0xc8e6c9], hMin: 5, hMax: 10, kind: "wall",
      signs: ["ARTS & CULTURE", "NOLLYWOOD", "CRAFT MARKET"] },
    { id: "mile2", name: "Mile 2", look: "market", tag: "Mile 2 · Park full, road full", gate: "MILE 2", gateBg: 0x00695c, gateFg: 0xffffff,
      top: 0x3e7eb8, hor: 0xf6e0c0, night: 0.12, sunDir: [0.2, 0.22, -1], sunCol: 0xffc48a, hemiSky: 0xfff0dc, hemiGnd: 0x8a7048, hemiI: 0.78, sunI: 0.85,
      ground: 0x9a7a52, walk: 0xa89e92, road: 0xc9c3b8, type: "street",
      pal: [0xb0bec5, 0xd7ccc8, 0xffcc80, 0x80cbc4, 0xa1887f], hMin: 5, hMax: 13, kind: "wall",
      signs: ["MILE 2 PARK", "FESTAC LINK", "OKADA PARK", "TYRE", "LUGGAGE"] },
    { id: "ajegunle", name: "Ajegunle", look: "market", tag: "AJ City · The streets dey talk", gate: "AJEGUNLE · AJ CITY", gateBg: 0xad1457, gateFg: 0xffffff,
      top: 0x3a6ea5, hor: 0xf3d2b4, night: 0.16, sunDir: [-0.4, 0.2, -1], sunCol: 0xffb07a, hemiSky: 0xffe4cc, hemiGnd: 0x7a5c40, hemiI: 0.76, sunI: 0.82,
      ground: 0x8d6b45, walk: 0x9a9086, road: 0xc0bbb4, type: "street",
      pal: [0xff8a65, 0xffd54f, 0x8d6e63, 0x4db6ac, 0xce93d8, 0xbcaaa4], hMin: 4, hMax: 11, kind: "wall",
      signs: ["AJ CITY", "BOUNDARY", "WILMER", "STREET FOOTBALL", "BUKA", "SOUND SYSTEM"] },
    { id: "mainland", name: "Third Mainland Bridge", look: "bridge", tag: "Over the lagoon · Golden hour", gate: "THIRD MAINLAND BRIDGE", gateBg: 0x0d47a1, gateFg: 0xffffff,
      top: 0x3b4a8c, hor: 0xffa062, night: 0.3, sunDir: [0.2, 0.05, -1], sunCol: 0xff8a3d, hemiSky: 0xffd9b0, hemiGnd: 0x4a5a7a, hemiI: 0.7, sunI: 0.9,
      ground: 0x1d6fa5, walk: 0x8f8f94, road: 0xd8d8de, type: "bridge",
      pal: [], hMin: 0, hMax: 0, kind: "wall", signs: [] },
    { id: "ojota", name: "Ojota", look: "market", tag: "Ojota · Interchange & oga driver", gate: "OJOTA", gateBg: 0xef6c00, gateFg: 0xffffff,
      top: 0x2c3e78, hor: 0xff9960, night: 0.38, sunDir: [-0.15, 0.04, -1], sunCol: 0xff7a45, hemiSky: 0xffc9a0, hemiGnd: 0x4a4038, hemiI: 0.66, sunI: 0.72,
      ground: 0x7d6848, walk: 0x9a9288, road: 0xb8b4c0, type: "street",
      pal: [0xbcaaa4, 0xffcc80, 0x90a4ae, 0xa1887f, 0xffab91], hMin: 6, hMax: 16, kind: "wall",
      signs: ["OJOTA", "KETU LINK", "NEW GARAGE", "BILLBOARD CITY", "BUS LANE"] },
    { id: "lekki", name: "Lekki Toll Gate", look: "palm", tag: "Lekki · Dusk on the expressway", gate: "LEKKI TOLL GATE", gateBg: 0xff6f00, gateFg: 0xffffff,
      top: 0x1d2459, hor: 0xd36a7e, night: 0.6, sunDir: [-0.3, 0.0, -1], sunCol: 0xff6a5a, hemiSky: 0xd6b4e8, hemiGnd: 0x3a3a5a, hemiI: 0.62, sunI: 0.5,
      ground: 0x4a8a45, walk: 0xb2aca0, road: 0xb8b8c4, type: "street",
      pal: [0xf5f1e6, 0xe3d5b8, 0xb0c4de, 0x9ec5d6, 0xf7d9c4], hMin: 8, hMax: 16, kind: "wall",
      signs: ["LEKKI PHASE 1", "SHOPRITE-STYLE MART", "ESTATE AGENTS", "BEACH ROAD"] },
    { id: "ajah", name: "Ajah", look: "palm", tag: "Ajah · Last bus stop before the sea", gate: "AJAH", gateBg: 0x00838f, gateFg: 0xffffff,
      top: 0x1a2048, hor: 0xc46a88, night: 0.72, sunDir: [0.1, 0.02, -1], sunCol: 0xff7d6a, hemiSky: 0xc9a8dc, hemiGnd: 0x2e3548, hemiI: 0.55, sunI: 0.4,
      ground: 0x3f7a48, walk: 0xa8a498, road: 0xb4b6c4, type: "street",
      pal: [0xf3efe4, 0xd7ccc8, 0x90caf9, 0xffccbc, 0xc5e1a5], hMin: 6, hMax: 15, kind: "wall",
      signs: ["AJAH", "ABRAHAM ADESANYA", "ESTATE", "BEACH", "FILLING STATION"] },
    { id: "vi", name: "Victoria Island", look: "glass", tag: "VI · The city lights up", gate: "VICTORIA ISLAND", gateBg: 0x00bfa5, gateFg: 0x06121f,
      top: 0x070b22, hor: 0x1f2d62, night: 1.0, sunDir: [0.35, 0.5, -1], sunCol: 0xdfe8ff, hemiSky: 0x7f95ff, hemiGnd: 0x1a1f3a, hemiI: 0.5, sunI: 0.35,
      ground: 0x4b5260, walk: 0x8a90a0, road: 0xaeb2c4, type: "street",
      pal: [0x2b6f9e, 0x3a8f8a, 0x35495e, 0x6c7a89, 0x1f3a5f, 0x5b6fa8], hMin: 26, hMax: 62, kind: "glass",
      signs: ["BANK PLAZA", "OIL & GAS HQ", "LUXURY LIVING", "FINTECH"] },
    { id: "ikoyi", name: "Ikoyi", look: "palm", tag: "Ikoyi · Quiet money, loud generators", gate: "IKOYI", gateBg: 0x1b5e20, gateFg: 0xfff8e1,
      top: 0x0a1028, hor: 0x243056, night: 1.0, sunDir: [-0.2, 0.4, -1], sunCol: 0xd8e4ff, hemiSky: 0x6d82c4, hemiGnd: 0x1c2438, hemiI: 0.48, sunI: 0.32,
      ground: 0x3d6b40, walk: 0x9aa094, road: 0xb0b4c0, type: "street",
      pal: [0xe8e0d0, 0xcfd8dc, 0xb0bec5, 0xd7ccc8, 0xeceff1], hMin: 8, hMax: 20, kind: "wall",
      signs: ["IKOYI", "AWOLOWO ROAD", "CLUB", "BOUGAINVILLEA", "PRIVATE ESTATE"] },
    { id: "cms", name: "CMS", look: "glass", tag: "Marina · CMS after dark", gate: "CMS · MARINA", gateBg: 0x0d47a1, gateFg: 0xffe082,
      top: 0x070918, hor: 0x1a2748, night: 1.0, sunDir: [0.5, 0.35, -1], sunCol: 0xc5d4ff, hemiSky: 0x6678b0, hemiGnd: 0x161c30, hemiI: 0.46, sunI: 0.28,
      ground: 0x3e4654, walk: 0x8e94a0, road: 0xa8aec0, type: "street",
      pal: [0x455a64, 0x37474f, 0x546e7a, 0x263238, 0x607d8b], hMin: 16, hMax: 40, kind: "glass",
      signs: ["CMS", "MARINA", "BROAD STREET", "TINUBU", "FERRY"] },
    { id: "balogun", name: "Balogun Market", look: "fabric", tag: "Lagos Island · Trade never sleeps", gate: "BALOGUN MARKET", gateBg: 0xd81b60, gateFg: 0xffe600,
      top: 0x0c1024, hor: 0x2a1c40, night: 0.92, sunDir: [0.15, 0.5, -1], sunCol: 0xf0e0ff, hemiSky: 0x8a78b8, hemiGnd: 0x2a2030, hemiI: 0.5, sunI: 0.32,
      ground: 0x6a5848, walk: 0x8a847c, road: 0xb0aeb8, type: "street",
      pal: [0xff9f43, 0x29b6a8, 0xf06292, 0xffd54f, 0x7e57c2, 0x66bb6a, 0x4fc3f7], hMin: 9, hMax: 18, kind: "wall",
      signs: ["ANKARA & LACE", "ASO-EBI HQ", "FABRIC WORLD", "BEADS & GELE", "WHOLESALE", "SHOES & BAGS"] },
    { id: "idumota", name: "Idumota", look: "fabric", tag: "Idumota · Bales, beads & shouting", gate: "IDUMOTA", gateBg: 0xf9a825, gateFg: 0x3e2723,
      top: 0x0a0c18, hor: 0x261828, night: 1.0, sunDir: [-0.3, 0.45, -1], sunCol: 0xffe0c0, hemiSky: 0x9a86a8, hemiGnd: 0x241820, hemiI: 0.48, sunI: 0.28,
      ground: 0x5c4e40, walk: 0x7e786e, road: 0xa39eaa, type: "street",
      pal: [0xffca28, 0xef5350, 0x26a69a, 0xab47bc, 0xffa726, 0x42a5f5], hMin: 8, hMax: 16, kind: "wall",
      signs: ["IDUMOTA", "BALES", "COSMETICS", "CARTER BRIDGE", "WHOLESALE", "PHONE ACCESSORIES"] },
    { id: "obalende", name: "Obalende", look: "suya", tag: "Suya spot · After midnight", gate: "OBALENDE SUYA SPOT", gateBg: 0xb71c1c, gateFg: 0xffd54f,
      top: 0x05060f, hor: 0x2b1a3f, night: 1.0, sunDir: [-0.4, 0.5, -1], sunCol: 0xf0e8ff, hemiSky: 0x9a7fbf, hemiGnd: 0x2a1a22, hemiI: 0.5, sunI: 0.3,
      ground: 0x5d5043, walk: 0x7d756a, road: 0xa6a2b0, type: "street",
      pal: [0x6d4c41, 0x8d6e63, 0x5d4037, 0x7b6a5d, 0x795548], hMin: 5, hMax: 10, kind: "wall",
      signs: ["SUYA · ASUN", "PEPPER SOUP", "NIGHT MARKET", "BOLE & FISH"] },
  ];
  ZONES.forEach((z) => {
    z.cTop = C(z.top); z.cHor = C(z.hor); z.cSun = C(z.sunCol); z.cHS = C(z.hemiSky); z.cHG = C(z.hemiGnd);
    z.vSun = new T.Vector3(...z.sunDir).normalize();
  });

  /* ───────── textures / materials ───────── */
  function roadTex() {
    return canvasTex("road", 256, 768, (g, w, h) => {
      g.fillStyle = "#6a6a70"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) {
        g.fillStyle = `rgba(${Math.random() < 0.5 ? 0 : 255},${Math.random() < 0.5 ? 0 : 255},${Math.random() < 0.5 ? 0 : 255},0.05)`;
        g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3);
      }
      for (let i = 0; i < 6; i++) { // tyre-worn bands
        g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(55 + i % 2 * 100 + Math.random() * 6, 0, 22, h);
      }
      g.fillStyle = "#e9e9e9";
      for (let k = 0; k < 4; k++) {
        for (const x of [128 - 35.7, 128 + 35.7]) g.fillRect(x - 2.5, k * 192 + 20, 5, 90);
      }
      g.fillStyle = "#f0d24a"; g.fillRect(128 - 116 - 3, 0, 6, h); g.fillRect(128 + 116 - 3, 0, 6, h);
    });
  }
  function noiseTex() {
    return canvasTex("noise", 128, 128, (g, w, h) => {
      g.fillStyle = "#cfcfcf"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) {
        const v = 150 + Math.random() * 100 | 0;
        g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      }
    }, true);
  }
  function waterTex() {
    return canvasTex("water", 128, 128, (g, w, h) => {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(150,200,235,${0.15 + Math.random() * 0.25})`;
        g.fillRect(Math.random() * w, Math.random() * h, 10 + Math.random() * 22, 2);
      }
    }, true);
  }
  const winMats = [];
  function winTex(kind) {
    const map = canvasTex("win" + kind, 256, 256, (g) => {
      if (kind === "wall") {
        g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 256);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
          const x = c * 64, y = r * 64;
          g.fillStyle = "#2c3a52"; g.fillRect(x + 13, y + 12, 38, 36);
          g.fillStyle = "#4b5f80"; g.fillRect(x + 13, y + 12, 38, 12);
          g.fillStyle = "#e4e4e4"; g.fillRect(x + 9, y + 49, 46, 5);
          g.fillStyle = "rgba(0,0,0,0.07)"; g.fillRect(x, y + 58, 64, 6);
        }
      } else {
        g.fillStyle = "#b8d2e6"; g.fillRect(0, 0, 256, 256);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
          const x = c * 64, y = r * 64;
          const gr = g.createLinearGradient(x, y, x + 64, y + 64);
          gr.addColorStop(0, "#5f95bf"); gr.addColorStop(1, "#2f5a80");
          g.fillStyle = gr; g.fillRect(x + 3, y + 3, 58, 58);
          g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x + 3, y + 3, 58, 12);
        }
      }
    }, true);
    const em = canvasTex("winem" + kind, 256, 256, (g) => {
      g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        if (Math.random() < 0.55) {
          g.fillStyle = Math.random() < 0.75 ? "#ffd98a" : "#bfe3ff";
          if (kind === "wall") g.fillRect(c * 64 + 13, r * 64 + 12, 38, 36); else g.fillRect(c * 64 + 3, r * 64 + 3, 58, 58);
        }
      }
    }, true);
    return { map, em };
  }
  const bMatCache = new Map();
  function bldMat(color, kind) {
    const k = color + kind;
    let m = bMatCache.get(k);
    if (!m) {
      const t = winTex(kind);
      m = new T.MeshLambertMaterial({ color, map: t.map, emissive: 0xffffff, emissiveMap: t.em, emissiveIntensity: 0 });
      winMats.push(m); bMatCache.set(k, m);
    }
    return m;
  }
  const bGeoCache = new Map();
  function bldGeo(w, h, d) {
    const key = w + "|" + h + "|" + d;
    let g = bGeoCache.get(key);
    if (g) return g;
    g = new T.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const cy = Math.max(1, Math.round(h / 3.4)) / 4;
    for (let i = 0; i < 24; i++) {
      const face = (i / 4) | 0;
      if (face === 2 || face === 3) { uv.setXY(i, 0.03, 0.03); continue; }
      const len = face < 2 ? d : w;
      const cx = Math.max(1, Math.round(len / 3.2)) / 4;
      uv.setXY(i, uv.getX(i) * cx, uv.getY(i) * cy);
    }
    bGeoCache.set(key, g);
    return g;
  }

  /* glow materials that switch on at night */
  const glowMats = [];
  function glowSprite(color, size, k, parent, x, y, z) {
    const key = "gs" + color + k;
    let m = glowMats.find((e) => e.key === key);
    if (!m) {
      m = { key, k, m: new T.SpriteMaterial({ map: glowTex(), color, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }) };
      glowMats.push(m);
    }
    const s = new T.Sprite(m.m); s.scale.set(size, size, 1); s.position.set(x, y, z);
    parent.add(s);
    return s;
  }
  let poolMat = null;
  function lightPool(parent, x, z, size) {
    if (!poolMat) {
      poolMat = new T.MeshBasicMaterial({ map: glowTex(), color: 0xffc070, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: true });
      glowMats.push({ key: "pool", k: 0.55, m: poolMat });
    }
    const p = new T.Mesh(G("plane", 1, 1), poolMat); p.rotation.x = -Math.PI / 2; p.scale.set(size, size, 1); p.position.set(x, 0.05, z);
    parent.add(p);
  }

  /* ───────── scenery builders ───────── */
  function lamp(d, side, z, Z) {
    const x = side * (Z.type === "bridge" ? 4.35 : 4.6);
    mesh(G("cyl", 0.07, 0.1, 6.4, 6), M(0x4a4f57), x, 3.2, z, d);
    box(1.5, 0.08, 0.08, 0x4a4f57, x - side * 0.75, 6.35, z, d);
    box(0.6, 0.12, 0.28, 0xfff1c0, x - side * 1.5, 6.3, z, d).material = B(0xfff1c0);
    glowSprite(0xffd89a, 4.2, 1, d, x - side * 1.5, 6.1, z);
    lightPool(d, x - side * 1.5, z, 9);
  }
  function palm(d, x, z, s) {
    s = s || 1;
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); d.add(g);
    const tr = mesh(G("cyl", 0.14, 0.24, 5.6, 6), M(0x7a5a3a), 0, 2.8, 0, g); tr.rotation.z = rnd(-0.1, 0.1);
    const crown = new T.Group(); crown.position.y = 5.6; g.add(crown);
    const lc = pick([0x2e8b3f, 0x3a9a48, 0x2a7d38]);
    for (let i = 0; i < 8; i++) {
      const pv = new T.Group(); pv.rotation.y = (i / 8) * Math.PI * 2; crown.add(pv);
      const l = mesh(G("box", 2.5, 0.05, 0.55), M(lc), 1.15, -0.1, 0, pv); l.rotation.z = -0.45;
    }
    for (let i = 0; i < 3; i++) mesh(G("sph", 0.16, 6, 5), M(0x6b4a22), Math.cos(i * 2.1) * 0.25, -0.15, Math.sin(i * 2.1) * 0.25, crown);
  }
  function tree(d, x, z, s) {
    s = s || 1;
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); d.add(g);
    mesh(G("cyl", 0.2, 0.3, 2.6, 6), M(0x6b4a2a), 0, 1.3, 0, g);
    const c = pick([0x3b8f3e, 0x4a9b45, 0x2f7d3a]);
    mesh(G("sph", 1.5, 7, 6), M(c), 0, 3.6, 0, g);
    mesh(G("sph", 1.1, 7, 6), M(c), 0.9, 3.0, 0.3, g);
    mesh(G("sph", 1.0, 7, 6), M(c), -0.8, 3.2, -0.3, g);
  }
  function flag(d, x, z) {
    mesh(G("cyl", 0.05, 0.05, 6, 5), M(0xcccccc), x, 3, z, d);
    const f = new T.Group(); f.position.set(x, 5.4, z); d.add(f);
    for (let i = 0; i < 3; i++) mesh(G("plane", 0.55, 0.9), B(i === 1 ? 0xffffff : 0x138a36, { side: T.DoubleSide }), 0.28 + i * 0.55, 0, 0, f);
  }
  function stall(d, side, z) {
    const x = side * rnd(5.2, 6.2);
    const g = new T.Group(); g.position.set(x, 0, z); d.add(g);
    mesh(G("cyl", 0.04, 0.04, 2.5, 5), M(0x555555), 0, 1.25, 0, g);
    const uc = pick([[0xe53935, 0xffffff], [0x1e88e5, 0xffd60a], [0x138a36, 0xffffff], [0xff7a00, 0xffffff], [0xab47bc, 0xffffff]]);
    mesh(G("cone", 1.4, 0.5, 12), MT("umb", umbrellaTex(uc[0], uc[1]), 0xffffff, { side: T.DoubleSide }), 0, 2.55, 0, g);
    box(1.4, 0.8, 0.8, 0x8a5a2b, 0, 0.4, 0.2, g);
    for (let i = 0; i < 4; i++) mesh(G("sph", 0.16, 6, 5), M(pick([0xe53935, 0xff9800, 0x43a047, 0xffeb3b])), -0.5 + i * 0.33, 0.95, 0.2, g);
  }
  function bystander(d, side, z) {
    const g = new T.Group(); g.position.set(side * rnd(5.2, 6.4), 0, z); d.add(g);
    g.rotation.y = rnd(-1.5, 1.5);
    const skin = pick([0x5a3825, 0x6b4226, 0x7b4b2a, 0x8d5a34]);
    box(0.34, 0.9, 0.26, pick([0x3b3b3b, 0x1b4f9c, 0x2e7d32, 0x2a2a2a]), 0, 0.45, 0, g);
    box(0.46, 0.7, 0.3, pick([0xffffff, 0xe91e63, 0xffc107, 0x1e88e5, 0xd84315, 0x8e24aa, 0x00acc1]), 0, 1.25, 0, g);
    mesh(G("sph", 0.2, 8, 6), M(skin), 0, 1.78, 0, g);
  }
  function bunting(d, z, colors, y) {
    for (let i = 0; i < 15; i++) {
      const x = -5.8 + i * (11.6 / 14);
      const sag = 0.7 * (1 - Math.pow(x / 5.8, 2));
      mesh(G("box", 0.34, 0.34, 0.04), B(colors[i % colors.length]), x, y - 0.1 - (0.7 - sag), z, d).rotation.z = Math.PI / 4;
    }
    for (const s of [-1, 1]) mesh(G("cyl", 0.06, 0.06, y + 0.4, 5), M(0x444444), s * 5.9, (y + 0.4) / 2, z, d);
  }
  function billboard(d, side, z, text, bg, fg) {
    const x = side * rnd(9, 11);
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = -side * 0.3; d.add(g);
    for (const s of [-1, 1]) mesh(G("cyl", 0.12, 0.12, 8, 6), M(0x555a60), s * 2.2, 4, 0, g);
    mesh(G("plane", 6.2, 2.7), BT(signTex(text, bg, fg, 512, 224), { side: T.DoubleSide }), 0, 8.4, 0, g);
    box(6.4, 0.14, 0.14, 0x333333, 0, 9.8, 0, g);
    glowSprite(fg, 8, 0.5, g, 0, 8.4, 0.3);
  }
  function bld(d, side, z, Z, o) {
    o = o || {};
    const wd = pick([7, 8.5, 10]);
    const dp = pick([7, 9, 11]);
    const h = Math.round(rnd(o.hMin != null ? o.hMin : Z.hMin, o.hMax != null ? o.hMax : Z.hMax));
    const x = side * (7.6 + dp / 2 + rnd(0, 1.5));
    const color = pick(Z.pal);
    const g = new T.Group(); g.position.set(x, h / 2, z); d.add(g);
    mesh(bldGeo(wd, h, dp), bldMat(color, Z.kind), 0, 0, 0, g);
    // roof
    box(wd + 0.3, 0.35, dp + 0.3, 0x55595f, 0, h / 2 + 0.17, 0, g);
    if (Z.kind === "glass" && h > 40) {
      mesh(G("cyl", 0.08, 0.08, 7, 5), M(0xdddddd), 0, h / 2 + 3.6, 0, g);
      glowSprite(0xff3040, 3, 1, g, 0, h / 2 + 7.2, 0);
    } else if (Math.random() < 0.6) {
      mesh(G("cyl", 0.8, 0.8, 1.6, 8), M(0x8892a0), rnd(-wd / 3, wd / 3), h / 2 + 1.2, rnd(-dp / 3, dp / 3), g);
    }
    // shop front facing the road
    if (o.shop) {
      const aw = box(0.9, 0.12, wd - 0.6, pick([0xe53935, 0x138a36, 0xffb300, 0x1e88e5, 0xd81b60]), -side * (dp / 2 + 0.45), -h / 2 + 3.2, 0, g);
      aw.rotation.z = side * 0.35;
      const sg = mesh(G("plane", Math.min(wd - 1, 6.5), 1.1), BT(signTex(pick(Z.signs), pick([0xffffff, 0xffe600, 0x138a36, 0xd81b60, 0x1565c0]), pick([0x111111, 0xffffff]), 512, 90)), 0, -h / 2 + 4.4, 0, g);
      sg.position.x = -side * (dp / 2 + 0.05); sg.rotation.y = -side * Math.PI / 2;
      glowSprite(0xffd89a, 5, 0.5, g, -side * (dp / 2 + 0.5), -h / 2 + 3.0, 0);
    }
    return g;
  }
  function skyline(d, side, z) {
    const x = side * rnd(40, 90);
    const h = rnd(18, 60);
    const w = rnd(7, 14);
    const g = mesh(bldGeo(Math.round(w), Math.round(h), 8), bldMat(pick([0x3a4a6a, 0x2f3f5c, 0x4a5a7a]), "glass"), x, h / 2 - 3, z, d);
    return g;
  }
  function boat(d, side, z) {
    const g = new T.Group(); g.position.set(side * rnd(12, 36), -5.2, z + rnd(-4, 4)); g.rotation.y = rnd(0, 6); d.add(g);
    box(1.4, 0.6, 5, pick([0x8d5a34, 0x1e88e5, 0xffffff]), 0, 0.2, 0, g);
    box(1.1, 0.9, 1.4, 0xe0e0e0, 0, 0.9, 0.8, g);
    box(0.08, 2.6, 0.08, 0x444444, 0, 1.6, -1, g);
  }
  function suyaStand(d, side, z) {
    const g = new T.Group(); g.position.set(side * rnd(5.4, 6.0), 0, z); d.add(g);
    box(1.9, 0.9, 0.8, 0x2b2b2b, 0, 0.45, 0, g);
    box(1.7, 0.06, 0.6, 0xff5a1f, 0, 0.93, 0, g).material = B(0xff5a1f);
    for (let i = 0; i < 7; i++) {
      box(0.04, 0.04, 0.8, 0xd9b77a, -0.7 + i * 0.23, 1.0, 0, g);
      box(0.12, 0.1, 0.1, 0x7a3b12, -0.7 + i * 0.23, 1.05, -0.12 + (i % 2) * 0.2, g);
    }
    for (const sx of [-1, 1]) mesh(G("cyl", 0.04, 0.04, 2.6, 5), M(0x555555), sx * 0.95, 1.3, -0.3, g);
    box(2.2, 0.08, 1.4, pick([0xd81b60, 0x1e88e5, 0xffb300, 0x138a36]), 0, 2.6, -0.1, g).rotation.x = -0.15;
    mesh(G("plane", 1.4, 0.4), BT(signTex("SUYA", 0xb71c1c, 0xffd54f, 256, 72)), 0, 2.3, 0.58, g);
    glowSprite(0xff7a2a, 3.6, 1, g, 0, 1.1, 0.1);
    glowSprite(0xffb870, 5, 0.5, g, 0, 2.4, 0.3);
    lightPool(g, 0, 0.5, 6);
  }
  function footbridge(d, Z) {
    for (const s of [-1, 1]) {
      box(0.55, 12.2, 0.55, 0x9aa0a8, s * 6.3, 6.1, -12, d);
      box(1.15, 0.18, 7.2, 0x8a9098, s * 7.4, 5.2, -12, d);
    }
    box(14.2, 0.28, 2.2, 0x7d848c, 0, 12.15, -12, d);
    box(14.2, 0.7, 0.1, 0x6b727a, 0, 12.65, -11.05, d);
    box(14.2, 0.7, 0.1, 0x6b727a, 0, 12.65, -12.95, d);
    mesh(G("plane", 7, 0.85), BT(signTex(Z.name.toUpperCase() + " · CROSS HERE", 0xffd60a, 0x111111, 512, 72)), 0, 13.15, -11.15, d);
  }
  function gate(d, Z, first) {
    // Beam sits above the chase camera so the street name never covers the runner.
    for (const s of [-1, 1]) box(0.55, 13.2, 0.55, 0xe8e8e8, s * 5.7, 6.6, -12, d);
    box(12.6, 1.15, 0.45, 0xf2f2f2, 0, 13.05, -12, d);
    mesh(G("plane", 11.2, 0.95), BT(signTex(Z.gate, Z.gateBg, Z.gateFg, 1024, 144)), 0, 13.05, -11.72, d);
    for (let i = 0; i < 3; i++) box(0.45, 0.22, 0.08, [0x138a36, 0xffffff, 0x138a36][i], -0.55 + i * 0.55, 13.75, -11.85, d);
    glowSprite(0xffffff, 4, 0.45, d, -5, 13.5, -11);
    glowSprite(0xffffff, 4, 0.45, d, 5, 13.5, -11);
  }
  function tollCanopy(d) {
    for (const s of [-1, 1]) {
      box(0.7, 13, 0.7, 0xeceff1, s * 5.5, 6.5, -12, d);
      box(1.5, 0.7, 4.2, 0xe0e0e0, s * 5.6, 0.4, -12, d);
      box(0.7, 1.4, 1.1, 0x90a4ae, s * 5.6, 1.15, -12, d);
    }
    box(12.4, 0.55, 5.2, 0xf5f5f5, 0, 12.85, -12, d);
    box(12.5, 0.18, 5.3, 0xff6f00, 0, 12.5, -12, d);
    for (let i = 0; i < 3; i++) glowSprite(i === 1 ? 0xff5030 : 0x40ff70, 1.6, 1, d, -3 + i * 3, 12.35, -10);
  }
  function theatre(d, side, zc) {
    const g = new T.Group(); g.position.set(side * 30, 0, zc); d.add(g);
    mesh(G("cyl", 15, 15, 1.2, 28), M(0xd9d6cc), 0, 0.6, 0, g);
    mesh(G("cyl", 10.5, 11, 5, 28), M(0xcfc9ba), 0, 3.7, 0, g);
    const dome = mesh(G("sph", 11.5, 28, 14), M(0xece8dc), 0, 6, 0, g); dome.scale.set(1.05, 0.55, 1);
    mesh(G("torus", 11.2, 0.35, 6, 32), M(0xbdb7a6), 0, 6.1, 0, g).rotation.x = Math.PI / 2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      mesh(G("box", 0.7, 3.4, 0.3), M(0x6a6f78), Math.cos(a) * 10.9, 3.8, Math.sin(a) * 10.9, g).rotation.y = -a;
    }
    mesh(G("plane", 9, 1.2), BT(signTex("NATIONAL THEATRE", 0x3a2a5c, 0xffe082, 512, 80)), -side * 11.1, 2.8, 0, g).rotation.y = -side * Math.PI / 2;
    for (let i = 0; i < 5; i++) glowSprite(0xffe4a0, 6, 0.5, g, -side * 9, 2 + i * 0.1, -8 + i * 4);
  }
  function pierDetails(d, side) {
    box(0.5, 1.2, SEG_LEN, 0x9a9ca2, side * 4.35, -0.5, -SEG_LEN / 2, d);
    box(1.6, 6.2, 1.8, 0x8f9298, side * 2.8, -3.2, -12, d);
  }

  /* ───────── per-zone slot filling (3 slots per side per segment) ───────── */
  function fillSlot(d, side, z, k, Z, zs) {
    const board = () => (Z.signs && Z.signs.length ? pick(Z.signs) : Z.name.toUpperCase());
    switch (Z.look) {
      case "market":
        if (Math.random() < 0.9) bld(d, side, z, Z, { shop: true });
        if (Math.random() < 0.55) stall(d, side, z + rnd(-2, 2));
        if (Math.random() < 0.5) bystander(d, side, z + rnd(-3, 3));
        if (k === 2 && Math.random() < 0.3) billboard(d, side, z, board(), Z.gateBg, Z.gateFg);
        break;
      case "fabric":
        bld(d, side, z, Z, { shop: true });
        stall(d, side, z + rnd(-2, 2));
        if (Math.random() < 0.6) stall(d, side, z + rnd(-3, 3));
        if (Math.random() < 0.6) bystander(d, side, z + rnd(-3, 3));
        if (k === 1) bunting(d, z, [0xe91e63, 0xffc107, 0x00bcd4, 0x8bc34a, 0xff5722], 5.8);
        break;
      case "tech":
        bld(d, side, z, Z, { shop: true });
        if (Math.random() < 0.5) stall(d, side, z + rnd(-2, 2));
        if (Math.random() < 0.55) bystander(d, side, z + rnd(-3, 3));
        if (k === 1 && Math.random() < 0.4) billboard(d, side, z, board(), Z.gateBg, Z.gateFg);
        break;
      case "theatre":
        if (side === 1 && k === 1 && zs === 4) { theatre(d, side, z); break; }
        if (Math.random() < 0.35) bld(d, side, z, Z, { shop: Math.random() < 0.5 });
        else palm(d, side * rnd(8, 14), z + rnd(-2, 2), rnd(0.9, 1.3));
        if (k === 0) flag(d, side * 5.2, z);
        if (Math.random() < 0.4) palm(d, side * rnd(5.5, 6.3), z + rnd(-3, 3), 1);
        break;
      case "bridge":
        if (k === 1) { boat(d, side, z); if (Math.random() < 0.6) skyline(d, side, z); }
        if (k === 0 && Math.random() < 0.5) skyline(d, side, z);
        break;
      case "palm":
        if (Math.random() < 0.8) bld(d, side, z, Z, { shop: Math.random() < 0.4 });
        palm(d, side * rnd(5.4, 6.2), z + rnd(-3, 3), rnd(1, 1.3));
        if (k === 2 && Math.random() < 0.3) billboard(d, side, z, board(), Z.gateBg, Z.gateFg);
        break;
      case "glass":
        bld(d, side, z, Z, {});
        if (Math.random() < 0.7) palm(d, side * rnd(5.4, 6.2), z + rnd(-3, 3), rnd(1, 1.25));
        if (k === 1 && Math.random() < 0.5) billboard(d, side, z, board(), Z.gateBg, Z.gateFg);
        break;
      case "suya":
        bld(d, side, z, Z, { shop: true });
        if (Math.random() < 0.85) suyaStand(d, side, z + rnd(-2, 2));
        if (Math.random() < 0.8) { bystander(d, side, z + rnd(-3, 3)); bystander(d, side, z + rnd(-3, 3)); }
        if (k === 1) bunting(d, z, [0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff], 5.6);
        break;
      default:
        if (Math.random() < 0.75) bld(d, side, z, Z, { shop: Math.random() < 0.55 });
        if (Math.random() < 0.35) palm(d, side * rnd(5.6, 8), z + rnd(-3, 3), rnd(0.9, 1.2));
        if (Math.random() < 0.4) bystander(d, side, z + rnd(-3, 3));
        if (k === 1 && Math.random() < 0.3) billboard(d, side, z, board(), Z.gateBg, Z.gateFg);
        break;
    }
  }

  /* ───────── segments ───────── */
  let scene, segs = [], skyMesh, skyU, hemi, sun, fog, pLight, waterT, nightLevel = 0;
  const lerpSkyTop = new T.Color(), lerpHor = new T.Color(), lerpSun = new T.Color(), lerpHS = new T.Color(), lerpHG = new T.Color();
  const lerpDir = new T.Vector3();

  function makeSeg() {
    const g = new T.Group();
    const s = { g };
    s.road = mesh(G("plane", ROAD_W, SEG_LEN), M(0xffffff), 0, 0, -SEG_LEN / 2, g); s.road.rotation.x = -Math.PI / 2;
    s.walkL = mesh(G("box", 2.6, 0.2, SEG_LEN), M(0x999999), -5.6, 0.1, -SEG_LEN / 2, g);
    s.walkR = mesh(G("box", 2.6, 0.2, SEG_LEN), M(0x999999), 5.6, 0.1, -SEG_LEN / 2, g);
    s.curbL = mesh(G("box", 0.25, 0.26, SEG_LEN), M(0xcfcfcf), -4.4, 0.13, -SEG_LEN / 2, g);
    s.curbR = mesh(G("box", 0.25, 0.26, SEG_LEN), M(0xcfcfcf), 4.4, 0.13, -SEG_LEN / 2, g);
    s.groundL = mesh(G("plane", 110, SEG_LEN), M(0x888888), -(6.9 + 55), 0, -SEG_LEN / 2, g); s.groundL.rotation.x = -Math.PI / 2;
    s.groundR = mesh(G("plane", 110, SEG_LEN), M(0x888888), (6.9 + 55), 0, -SEG_LEN / 2, g); s.groundR.rotation.x = -Math.PI / 2;
    const wm = MT("water", waterT, 0x2a7fb8, { emissive: 0x0a2a44 });
    s.waterL = mesh(G("plane", 110, SEG_LEN), wm, -(4.7 + 55), -5.6, -SEG_LEN / 2, g); s.waterL.rotation.x = -Math.PI / 2;
    s.waterR = mesh(G("plane", 110, SEG_LEN), wm, (4.7 + 55), -5.6, -SEG_LEN / 2, g); s.waterR.rotation.x = -Math.PI / 2;
    s.parL = mesh(G("box", 0.45, 1.1, SEG_LEN), M(0xb9bcc2), -4.55, 0.55, -SEG_LEN / 2, g);
    s.parR = mesh(G("box", 0.45, 1.1, SEG_LEN), M(0xb9bcc2), 4.55, 0.55, -SEG_LEN / 2, g);
    s.dyn = new T.Group(); g.add(s.dyn);
    return s;
  }

  function zoneIdx(n) { return ((n % ZONES.length) + ZONES.length) % ZONES.length; }

  function populate(s, s0) {
    s.s0 = s0;
    const zi = zoneIdx(Math.floor(Math.max(0, s0) / ZONE_LEN));
    const Z = ZONES[zi];
    const d = s.dyn;
    while (d.children.length) d.remove(d.children[0]);
    const bridge = Z.type === "bridge";
    s.road.material = MT("road" + zi, roadTex(), Z.road);
    s.walkL.material = s.walkR.material = M(Z.walk);
    s.groundL.material = s.groundR.material = MT("gr" + zi, noiseTex(), Z.ground);
    s.walkL.visible = s.walkR.visible = s.curbL.visible = s.curbR.visible = !bridge;
    s.groundL.visible = s.groundR.visible = !bridge;
    s.waterL.visible = s.waterR.visible = bridge;
    s.parL.visible = s.parR.visible = bridge;
    const zs = Math.round((((s0 % ZONE_LEN) + ZONE_LEN) % ZONE_LEN) / SEG_LEN);

    if (zs === 0 && s0 > 0) { gate(d, Z, true); if (Z.id === "lekki") tollCanopy(d); }
    if (Z.look === "market" && zs % 6 === 2) footbridge(d, Z);
    for (const side of [-1, 1]) {
      lamp(d, side, side < 0 ? -5 : -17.5, Z);
      if (bridge) pierDetails(d, side);
      for (let k = 0; k < 3; k++) fillSlot(d, side, -(k * 8.33 + 4.17), k, Z, zs);
    }
    if (Z.id === "mainland" && zs % 2 === 0) { // far lights on the lagoon
      for (let i = 0; i < 4; i++) glowSprite(0xffc58a, 6, 0.5, d, rnd(-40, 40), -4, rnd(-24, -2));
    }
  }

  const SKY_V = `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
  const SKY_F = `
    varying vec3 vD; uniform vec3 uTop, uHor, uSunDir, uSunCol; uniform float uNight, uTime;
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
    void main(){
      vec3 d = normalize(vD);
      float h = clamp(d.y * 1.5 + 0.02, 0.0, 1.0);
      vec3 col = mix(uHor, uTop, pow(h, 0.55));
      float sd = max(dot(d, normalize(uSunDir)), 0.0);
      col += uSunCol * (pow(sd, 900.0) * 4.0 + pow(sd, 14.0) * 0.4 + pow(sd, 3.0) * 0.12);
      vec2 cp = d.xz / (d.y + 0.22) * 1.6 + vec2(uTime * 0.01, 0.0);
      float c = n2(cp) * 0.6 + n2(cp * 2.1) * 0.3 + n2(cp * 4.3) * 0.1;
      float cm = smoothstep(0.52, 0.85, c) * smoothstep(0.0, 0.22, d.y);
      vec3 cc = mix(vec3(1.0), uHor * 1.2 + 0.2, 0.45) * (1.0 - uNight * 0.75);
      col = mix(col, cc, cm * 0.55);
      vec3 sp = floor(d * 90.0);
      float st = step(0.9965, h2(sp.xy + sp.z * 7.0)) * smoothstep(0.08, 0.45, d.y) * uNight;
      col += vec3(st);
      gl_FragColor = vec4(col, 1.0);
    }`;

  LS.World = {
    ZONES, ZONE_LEN,
    zoneIndex(dist) { return zoneIdx(Math.floor(dist / ZONE_LEN)); },
    init(scn) {
      scene = scn;
      waterT = waterTex(); waterT.repeat.set(10, 5);
      fog = new T.Fog(0xd9ecf8, 55, 198); scene.fog = fog;
      skyU = {
        uTop: { value: new T.Color() }, uHor: { value: new T.Color() }, uSunDir: { value: new T.Vector3() },
        uSunCol: { value: new T.Color() }, uNight: { value: 0 }, uTime: { value: 0 },
      };
      skyMesh = new T.Mesh(new T.SphereGeometry(280, 24, 14), new T.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_V, fragmentShader: SKY_F, side: T.BackSide, depthWrite: false, fog: false }));
      skyMesh.renderOrder = -10; skyMesh.frustumCulled = false;
      scene.add(skyMesh);
      hemi = new T.HemisphereLight(0xffffff, 0x888888, 0.9); scene.add(hemi);
      sun = new T.DirectionalLight(0xffffff, 0.9); sun.position.set(-8, 14, 6); scene.add(sun);
      pLight = new T.PointLight(0xffd9a0, 0, 22, 1.6); scene.add(pLight);
      for (let i = 0; i < NUM_SEG; i++) { const s = makeSeg(); segs.push(s); scene.add(s.g); }
      this.reset();
    },
    reset() {
      segs.forEach((s, i) => populate(s, (i - 2) * SEG_LEN));
      this.update(0, 0, null, 0, true);
    },
    update(dist, dt, cam, time, force) {
      // recycle segments that are behind the camera
      for (const s of segs) {
        while (s.s0 + SEG_LEN < dist - 22) populate(s, s.s0 + NUM_SEG * SEG_LEN);
        s.g.position.z = dist - s.s0;
      }
      waterT.offset.y -= dt * 0.03; waterT.offset.x += dt * 0.01;

      // environment blending between zones
      const zi = Math.floor(dist / ZONE_LEN);
      const t = (dist - zi * ZONE_LEN) / ZONE_LEN;
      const b = (() => { const x = Math.min(1, Math.max(0, (t - 0.72) / 0.28)); return x * x * (3 - 2 * x); })();
      const A = ZONES[zoneIdx(zi)], N = ZONES[zoneIdx(zi + 1)];
      lerpSkyTop.copy(A.cTop).lerp(N.cTop, b);
      lerpHor.copy(A.cHor).lerp(N.cHor, b);
      lerpSun.copy(A.cSun).lerp(N.cSun, b);
      lerpHS.copy(A.cHS).lerp(N.cHS, b);
      lerpHG.copy(A.cHG).lerp(N.cHG, b);
      lerpDir.copy(A.vSun).lerp(N.vSun, b).normalize();
      const night = A.night + (N.night - A.night) * b;
      nightLevel = night;
      skyU.uTop.value.copy(lerpSkyTop); skyU.uHor.value.copy(lerpHor);
      skyU.uSunDir.value.copy(lerpDir); skyU.uSunCol.value.copy(lerpSun);
      skyU.uNight.value = night; skyU.uTime.value = time;
      fog.color.copy(lerpHor);
      hemi.color.copy(lerpHS); hemi.groundColor.copy(lerpHG);
      hemi.intensity = A.hemiI + (N.hemiI - A.hemiI) * b;
      sun.color.copy(lerpSun);
      sun.intensity = A.sunI + (N.sunI - A.sunI) * b;
      sun.position.set(lerpDir.x * 20, 14 + lerpDir.y * 10, 10);
      const glow = Math.min(1, Math.max(0, (night - 0.15) / 0.5));
      for (const m of winMats) m.emissiveIntensity = night * 0.95;
      for (const e of glowMats) e.m.opacity = glow * e.k * (e.key === "pool" ? 1 : 1.4);
      if (cam) {
        skyMesh.position.copy(cam.position);
        pLight.position.set(cam.position.x * 0.5, 3.5, cam.position.z - 6);
        pLight.intensity = night * 1.5;
      }
      this.night = night; this.zone = A; this.zoneIdxAbs = zi;
      const dd = dist - zi * ZONE_LEN;
      this.zoneProgress = dd;
    },
  };
})();
