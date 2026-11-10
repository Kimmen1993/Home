// 3D-vyn: bygger huset från datan, animerar lampor/dörrar/gardiner, klick och dra i 3D.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { S, home, emit, commit, snapToWall, findWall, makeItem, makeOpening, wallLen, roomAt, inPoly, proj, levelView } from './store.js?v=1794341431';
import { ITEMS, OPENINGS } from './catalog.js?v=1794341431';
import { insideSign } from './plan2d.js?v=1794341431';

export function createView(host, api) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
  cam.position.set(20, 18, 24);
  const controls = new OrbitControls(cam, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = 1.48; controls.minDistance = 2; controls.maxDistance = 90;
  controls.screenSpacePanning = false;

  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x3a3226, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2c0, 2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);
  const world = new THREE.Group(); scene.add(world);
  let refs = { items: {}, openings: {}, pick: [] };
  let selBox = null, built = false, need = false, lastSig = '';

  // ---------- material & texturer ----------
  const mats = new Map();
  function M(color, o = {}) {
    const k = color + JSON.stringify(o); if (mats.has(k)) return mats.get(k);
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: .75, ...o }); mats.set(k, m); return m;
  }
  // ---------- texturer (ritas i kod) ----------
  const texCache = new Map();
  const TEX_SIZE = { grus: 1.5, tra: 1.8, fiskben: .9, klinker: 1.2, grass: 4, kakel: 1, tegel: 1, panel: 1, tapet: .6, betong: 2, matta: 1 };
  function floorTex(style, color) {
    const k = style + color; if (texCache.has(k)) return texCache.get(k);
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const base = new THREE.Color(color); g.fillStyle = color; g.fillRect(0, 0, 512, 512);
    const shade = (f) => { const cc = base.clone().multiplyScalar(f); return `rgb(${Math.min(255, cc.r * 255) | 0},${Math.min(255, cc.g * 255) | 0},${Math.min(255, cc.b * 255) | 0})`; };
    let rnd = 1; const R = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
    const grain = (x, y, w, h, vertical) => { for (let j = 0; j < 5; j++) { g.strokeStyle = 'rgba(0,0,0,.05)'; g.beginPath();
      if (vertical) { const xx = x + R() * w; g.moveTo(xx, y); g.lineTo(xx + R() * 6 - 3, y + h); } else { const yy = y + R() * h; g.moveTo(x, yy); g.lineTo(x + w, yy + R() * 6 - 3); } g.stroke(); } };
    if (style === 'tra') { const pw = 512 / 6; for (let i = 0; i < 6; i++) { let y = -R() * 300; while (y < 512) { const L = 200 + R() * 260;
      g.fillStyle = shade(.88 + R() * .22); g.fillRect(i * pw, y, pw, L); g.strokeStyle = 'rgba(0,0,0,.18)'; g.strokeRect(i * pw + .5, y + .5, pw - 1, L - 1); grain(i * pw, y, pw, L, true); y += L; } } }
    else if (style === 'fiskben') { const W = 32, L = 128;
      for (let band = -6; band < 8; band++) for (let n = -20; n < 24; n++) { const x = n * W + band * L, y = n * W - band * L;
        for (const [px, py, pw, ph, v] of [[x, y, L, W, false], [x, y + W, W, L, true]]) for (const ox of [0, 512, -512]) for (const oy of [0, 512, -512]) {
          const X = ((px % 512) + 512) % 512 - 512 + ox + 512, Y = ((py % 512) + 512) % 512 - 512 + oy + 512;
          if (X > 512 || Y > 512 || X + pw < 0 || Y + ph < 0) continue;
          g.fillStyle = shade(.86 + R() * .24); g.fillRect(X, Y, pw, ph); g.strokeStyle = 'rgba(0,0,0,.2)'; g.strokeRect(X + .5, Y + .5, pw - 1, ph - 1); } } }
    else if (style === 'klinker') { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = shade(.95 + R() * .1); g.fillRect(i * 256 + 3, j * 256 + 3, 250, 250); }
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, 254, 512, 4); g.fillRect(254, 0, 4, 512); g.fillRect(0, 0, 512, 3); g.fillRect(0, 0, 3, 512); }
    else if (style === 'kakel') { g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i <= 5; i++) { g.fillRect(i * 102.4 - 2, 0, 4, 512); g.fillRect(0, i * 102.4 - 2, 512, 4); }
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { g.fillStyle = `rgba(255,255,255,${R() * .06})`; g.fillRect(i * 102.4 + 3, j * 102.4 + 3, 96, 30); } }
    else if (style === 'tegel') { const bh = 512 / 15; g.fillStyle = '#d8d2c8'; g.fillRect(0, 0, 512, 512);
      for (let r = 0; r < 15; r++) { const off = r % 2 ? 64 : 0; for (let i = -1; i < 5; i++) { g.fillStyle = shade(.82 + R() * .3); g.fillRect(i * 128 + off + 3, r * bh + 3, 122, bh - 6); } } }
    else if (style === 'panel') { for (let i = 0; i < 8; i++) { g.fillStyle = shade(.94 + R() * .1); g.fillRect(i * 64, 0, 64, 512); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(i * 64, 0, 3, 512); grain(i * 64, 0, 64, 512, true); } }
    else if (style === 'tapet') { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? shade(1.06) : shade(.97); g.fillRect(i * 64, 0, 64, 512); }
      g.fillStyle = 'rgba(255,255,255,.14)'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.beginPath(); g.arc(i * 64 + 32, j * 64 + (i % 2 ? 32 : 0), 6, 0, 7); g.fill(); } }
    else if (style === 'grus') { for (let i = 0; i < 7000; i++) { g.fillStyle = shade(.7 + R() * .6); const r = 1 + R() * 3; g.beginPath(); g.arc(R() * 512, R() * 512, r, 0, 7); g.fill(); } }
    else if (style === 'grass') { for (let i = 0; i < 9000; i++) { g.fillStyle = shade(.75 + R() * .5); g.fillRect(R() * 512, R() * 512, 2, 4); } }
    else { for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${R() > .5 ? '255,255,255' : '0,0,0'},${R() * .06})`; g.fillRect(R() * 512, R() * 512, 3, 3); } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const size = TEX_SIZE[style] || 1.8; t.repeat.set(1 / size, 1 / size);
    texCache.set(k, t); return t;
  }
  function floorMat(style, color, rot = 0) { const k = 'F' + style + color + rot; if (mats.has(k)) return mats.get(k);
    let t = floorTex(style, color); if (rot) { t = t.clone(); t.needsUpdate = true; t.rotation = rot * Math.PI / 180; }
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: style === 'klinker' || style === 'kakel' ? .35 : style === 'matta' ? 1 : .7 }); mats.set(k, m); return m; }
  // väggmaterial: målad = slät färg, annars textur
  function wallMat(mat, color) { return !mat || mat === 'malad' ? M(color, { roughness: .92 }) : floorMat(mat, color); }
  let screenTex = null;
  function tvScreen() { if (screenTex) return screenTex; const c = document.createElement('canvas'); c.width = 256; c.height = 144; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 256, 144); gr.addColorStop(0, '#1d4e89'); gr.addColorStop(.5, '#e86a33'); gr.addColorStop(1, '#2a1a4a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 144);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold 22px system-ui'; g.fillText('▶  Fredagsfilm', 18, 124);
    screenTex = new THREE.CanvasTexture(c); screenTex.colorSpace = THREE.SRGBColorSpace; return screenTex; }
  const shade = (hex, f) => '#' + new THREE.Color(hex).multiplyScalar(f).getHexString();

  // ---------- hjälpare ----------
  function B(g, w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof mat === 'string' ? M(mat) : mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; }
  function C(g, rt, rb, h, mat, x, y, z, seg = 20, open = false) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), typeof mat === 'string' ? M(mat) : mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; }
  const metal = '#9aa0a6'; let handleC = null;
  const metalM = () => M(handleC || metal, { metalness: handleC === '#1f2328' ? .3 : .8, roughness: .3 });

  function doors(g, w, h, y0, z, n, color, handleTop = true) {
    const dw = w / n;
    for (let i = 0; i < n; i++) { const cx = -w / 2 + dw * (i + .5);
      B(g, dw - .006, h, .018, color, cx, y0 + h / 2, z);
      const hx = n === 1 ? cx + dw / 2 - .05 : (i % 2 === 0 ? cx + dw / 2 - .04 : cx - dw / 2 + .04);
      B(g, .012, .14, .02, metalM(), hx, handleTop ? y0 + h - .1 : y0 + .1, z + .015); }
  }

  // ---------- möbler ----------
  function buildItem(it) {
    handleC = it.handleColor || null;
    const g = new THREE.Group(), { w, d, h } = it, c = it.color, c2 = it.color2, cat = ITEMS[it.type];
    const ref = { group: g, it };
    const front = d / 2;
    switch (it.type) {
      case 'underskap': case 'diskho': case 'spis': {
        B(g, w - .02, .1, d - .07, '#1d1d1d', 0, .05, -.035);
        B(g, w - .01, h - .14, d - .04, c, 0, .1 + (h - .14) / 2, -.02);
        if (it.type === 'spis') { B(g, w - .03, .14, .018, c, 0, h - .04 - .08, front - .01); B(g, w - .03, h - .32, .018, M('#141414', { roughness: .15, metalness: .3 }), 0, .1 + (h - .32) / 2, front - .01);
          B(g, w * .7, .02, .02, metalM(), 0, h - .29, front + .01); }
        else { B(g, w - .03, .16, .018, c, 0, h - .04 - .09, front - .01); B(g, .14, .012, .02, metalM(), 0, h - .04 - .06, front + .005); doors(g, w - .02, h - .37, .11, front - .01, w > .7 ? 2 : 1, c); }
        B(g, w, .04, d + .02, it.type === 'spis' ? M(c2 || '#151515', { roughness: .15 }) : c2 || '#3b3b3b', 0, h - .02, .01);
        if (it.type === 'diskho') { B(g, w * .62, .006, d * .55, M('#b8bec4', { metalness: .8, roughness: .25 }), 0, h + .001, .03);
          C(g, .015, .015, .26, metalM(), 0, h + .13, -d / 2 + .08); B(g, .025, .025, .2, metalM(), 0, h + .25, -d / 2 + .17); }
        if (it.type === 'spis') for (const [x, z] of [[-.13, -.12], [.13, -.12], [-.13, .12], [.13, .12]]) C(g, .085, .085, .004, M('#333'), x, h + .002, z, 24);
        break; }
      case 'overskap': B(g, w - .01, h, d - .02, c, 0, h / 2, -.01); doors(g, w - .01, h - .01, .005, front - .01, w > .7 ? 2 : 1, c, false); break;
      case 'flakt': B(g, w, .08, d, M(c, { metalness: .7, roughness: .3 }), 0, .04, 0); B(g, w * .4, h - .08, d * .5, M(c, { metalness: .7, roughness: .3 }), 0, .08 + (h - .08) / 2, -d * .25); break;
      case 'hogskap': B(g, w - .01, .1, d - .07, '#1d1d1d', 0, .05, -.035); B(g, w - .01, h - .1, d - .04, c, 0, .1 + (h - .1) / 2, -.02); doors(g, w - .01, h - .12, .11, front - .01, w > .7 ? 2 : 1, c); break;
      case 'kyl': { const mm = M(c, { metalness: .55, roughness: .3 }); B(g, w - .01, h, d - .04, mm, 0, h / 2, -.02);
        B(g, w - .012, h * .62, .02, mm, 0, h - h * .31, front - .01); B(g, w - .012, h * .36, .02, mm, 0, h * .18, front - .01);
        B(g, .02, h * .4, .03, metalM(), w / 2 - .06, h - h * .3, front + .02); B(g, .02, h * .2, .03, metalM(), w / 2 - .06, h * .26, front + .02); break; }
      case 'koksoe': B(g, w - .1, .1, d - .35, '#1d1d1d', 0, .05, -.1); B(g, w - .04, h - .14, d - .3, c, 0, .1 + (h - .14) / 2, -.1);
        { const n = Math.max(2, Math.round(w / .6)), dw = (w - .06) / n, bz = -.1 - (d - .3) / 2;
          for (let i = 0; i < n; i++) { const x = -(w - .06) / 2 + dw * (i + .5); B(g, dw - .006, h - .2, .018, c, x, .12 + (h - .2) / 2, bz - .01); B(g, .012, .14, .02, metalM(), x + dw / 2 - .05, h - .2, bz - .025); } }
        B(g, w + .04, .05, d, c2 || '#e8e4dc', 0, h - .025, 0); break;
      case 'matbord': case 'soffbord': case 'skrivbord': {
        B(g, w, .04, d, c, 0, h - .02, 0); const lx = w / 2 - .06, lz = d / 2 - .06;
        for (const [x, z] of [[lx, lz], [-lx, lz], [lx, -lz], [-lx, -lz]]) B(g, .05, h - .04, .05, it.type === 'skrivbord' ? '#2b2b2b' : c, x, (h - .04) / 2, z); break; }
      case 'stol': case 'barstol': { const sh = it.type === 'barstol' ? .72 : .45;
        B(g, w, .05, d * .9, c, 0, sh, 0); const lx = w / 2 - .03, lz = d * .45 - .03;
        for (const [x, z] of [[lx, lz], [-lx, lz], [lx, -lz], [-lx, -lz]]) B(g, .03, sh, .03, c, x, sh / 2, z);
        B(g, w, h - sh - .02, .04, c, 0, sh + (h - sh) / 2, -d * .45 + .02); break; }
      case 'soffa': case 'fatolj': case 'utesoffa': {
        const n = it.type === 'fatolj' ? 1 : w > 2.1 ? 3 : 2, aw = .16, sw = (w - aw * 2) / n;
        for (const [x, z] of [[w / 2 - .06, d / 2 - .06], [-w / 2 + .06, d / 2 - .06], [w / 2 - .06, -d / 2 + .06], [-w / 2 + .06, -d / 2 + .06]]) B(g, .05, .08, .05, '#222', x, .04, z);
        B(g, w, .26, d, c, 0, .08 + .13, 0);
        for (let i = 0; i < n; i++) B(g, sw - .02, .13, d - .26, shade(c, 1.08), -w / 2 + aw + sw * (i + .5), .34 + .065, .1);
        B(g, w - aw * 2, h - .34, .22, c, 0, .34 + (h - .34) / 2, -d / 2 + .11);
        for (let i = 0; i < n; i++) B(g, sw - .04, h - .45, .14, shade(c, 1.12), -w / 2 + aw + sw * (i + .5), .47 + (h - .45) / 2 - .02, -d / 2 + .27);
        for (const s of [-1, 1]) B(g, aw, .62 - .08, d, c, s * (w / 2 - aw / 2), .08 + .27, 0);
        break; }
      case 'bokhylla': { B(g, w, h, .02, c, 0, h / 2, -d / 2 + .01); for (const s of [-1, 1]) B(g, .02, h, d, c, s * (w / 2 - .01), h / 2, 0);
        const n = Math.max(2, Math.round(h / .38)); let seed = it.id.charCodeAt(0) * 7 + 3; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const cols = ['#7a2e2e', '#2e4a7a', '#c9a227', '#2f5d50', '#ddd6c8', '#3b3b3b', '#a0704a'];
        for (let i = 0; i <= n; i++) { const y = i * (h - .02) / n + .01; B(g, w - .04, .02, d - .02, c, 0, y, .01);
          if (i < n) { let x = -w / 2 + .03; while (x < w / 2 - .08) { const bw = .025 + R() * .04, bh = .18 + R() * .1; if (R() > .15) B(g, bw, bh, d * .7, cols[(R() * cols.length) | 0], x + bw / 2, y + .01 + bh / 2, 0); x += bw + .003; } } }
        break; }
      case 'matta': B(g, w, .012, d, M(c, { roughness: 1 }), 0, .006, 0); break;
      case 'vaxt': C(g, w * .32, w * .26, .38, c, 0, .19, 0); for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(w * .38, 0), M('#3f7a3a', { flatShading: true }));
        m.position.set(Math.sin(i * 2.1) * w * .15, .5 + i * (h - .6) / 4, Math.cos(i * 2.1) * w * .15); m.castShadow = true; g.add(m); } break;
      case 'sang': case 'sang90': {
        B(g, w, .25, d, c, 0, .07 + .125, 0); for (const s of [-1, 1]) for (const t of [-1, 1]) B(g, .05, .07, .05, '#222', s * (w / 2 - .05), .035, t * (d / 2 - .05));
        B(g, w - .06, .2, d - .08, '#f4f2ee', 0, .32 + .1, .02);
        B(g, w - .02, .07, d * .64, c2 || '#e6ebf0', 0, .53, d * .17);
        B(g, w - .02, .3, .05, c2 || '#e6ebf0', 0, .37, d / 2 - .02 + .015);
        const np = w > 1.2 ? 2 : 1; for (let i = 0; i < np; i++) B(g, (w - .16) / np - .04, .12, .36, '#ffffff', -w / 2 + .08 + (w - .16) / np * (i + .5), .58, -d / 2 + .3);
        B(g, w + .02, 1.05, .08, c, 0, .525, -d / 2 + .04); break; }
      case 'nattduks': B(g, w, h - .06, d, c, 0, .06 + (h - .06) / 2, 0); for (const s of [-1, 1]) for (const t of [-1, 1]) B(g, .03, .06, .03, '#222', s * (w / 2 - .03), .03, t * (d / 2 - .03));
        B(g, w - .04, .002, .002, '#000', 0, h - .16, front + .001); B(g, .1, .012, .02, metalM(), 0, h - .09, front + .01); break;
      case 'garderob': B(g, w, h, d - .02, c, 0, h / 2, -.01); doors(g, w - .01, h - .02, .01, front - .01, Math.max(2, Math.round(w / .5)), c); break;
      case 'spegel': {
        B(g, w, h, .02, c, 0, h / 2, -d / 2 + .01);
        const mirror = new Reflector(new THREE.PlaneGeometry(w - .05, h - .05), { clipBias: .003, textureWidth: 512, textureHeight: Math.round(512 * h / w), color: 0xc0c4c8 });
        mirror.position.set(0, h / 2, -d / 2 + .022); g.add(mirror); ref.mirror = mirror; break; }
      case 'toalett': B(g, .34, .4, .45, c, 0, .2, .08); B(g, .38, .06, .52, c, 0, .43, .06); B(g, .38, .38, .18, c, 0, .62, -d / 2 + .09); B(g, .1, .015, .05, metalM(), 0, .82, -d / 2 + .09); break;
      case 'handfat': B(g, w, .45, d - .02, c2 || '#9a7550', 0, .35 + .225, -.01); B(g, w, .07, d, c, 0, h - .035, 0); B(g, w * .6, .004, d * .55, '#e0e4e6', 0, h + .001, .03);
        C(g, .012, .012, .16, metalM(), 0, h + .08, -d / 2 + .06); B(g, .02, .02, .1, metalM(), 0, h + .155, -d / 2 + .1); break;
      case 'badkar': B(g, w, h, d, c, 0, h / 2, 0); B(g, w - .12, .004, d - .12, '#dfe5e8', 0, h + .002, 0); C(g, .015, .015, .2, metalM(), -w / 2 + .1, h + .1, -d / 2 + .06); break;
      case 'dusch': { B(g, w, .05, d, '#f2f2f2', 0, .025, 0); const glass = M('#cfe8ef', { transparent: true, opacity: .22, roughness: .05, metalness: .1 });
        B(g, w, h - .05, .01, glass, 0, h / 2, d / 2); B(g, .01, h - .05, d, glass, -w / 2, h / 2, 0);
        C(g, .012, .012, h - .2, metalM(), w / 2 - .08, (h - .2) / 2 + .1, -d / 2 + .05); C(g, .1, .1, .02, metalM(), w / 2 - .2, h - .1, -d / 2 + .2); break; }
      case 'tvattmaskin': B(g, w - .01, h, d - .02, c, 0, h / 2, -.01); { const r = C(g, .2, .2, .03, M('#2a3238', { metalness: .4, roughness: .2 }), 0, h * .45, front); r.rotation.x = Math.PI / 2; } B(g, w - .05, .08, .01, '#d0d0d0', 0, h - .06, front); break;
      case 'taklampa': { const sh = .26;
        B(g, .012, h - sh, .012, '#111', 0, sh + (h - sh) / 2, 0);
        const shadeM = new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: .5, metalness: .3, side: THREE.DoubleSide });
        const cone = C(g, .05, w / 2, sh, shadeM, 0, sh / 2, 0, 28, true); cone.castShadow = false;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), new THREE.MeshStandardMaterial({ color: 0x777777 })); bulb.position.y = .06; g.add(bulb);
        ref.bulb = bulb; ref.lightY = .0; ref.power = 14; break; }
      case 'spot': { C(g, w / 2, w / 2, h, c, 0, h / 2, 0); const bulb = C(g, w / 2.6, w / 2.6, .005, new THREE.MeshStandardMaterial({ color: 0x777777 }), 0, -.001, 0); ref.bulb = bulb; ref.lightY = -.15; ref.power = 6; break; }
      case 'golvlampa': { C(g, .16, .18, .03, c, 0, .015, 0); C(g, .012, .012, h - .3, c, 0, (h - .3) / 2, 0);
        const sm = new THREE.MeshStandardMaterial({ color: new THREE.Color(c2), roughness: .9, side: THREE.DoubleSide, transparent: true, opacity: .96 });
        const s = C(g, .13, .2, .3, sm, 0, h - .15, 0, 28, true); s.castShadow = false; ref.shade = s; ref.lightY = h - .2; ref.power = 8; break; }
      case 'bordslampa': { C(g, .06, .08, .03, c, 0, .015, 0); C(g, .015, .015, h - .2, c, 0, (h - .2) / 2, 0);
        const sm = new THREE.MeshStandardMaterial({ color: new THREE.Color(c2), roughness: .9, side: THREE.DoubleSide });
        const s = C(g, .08, w / 2, .2, sm, 0, h - .1, 0, 24, true); s.castShadow = false; ref.shade = s; ref.lightY = h - .12; ref.power = 4; break; }
      case 'ledlist': { const strip = B(g, w, .015, .025, new THREE.MeshStandardMaterial({ color: 0x777777 }), 0, 0, 0); strip.castShadow = false; ref.bulb = strip; ref.lightY = -.05; ref.power = 4; break; }
      case 'tv': { B(g, w, h, .035, '#0b0b0b', 0, h / 2, -d / 2 + .02);
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - .03, h - .03), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: .15, metalness: .2 }));
        scr.position.set(0, h / 2, -d / 2 + .039); g.add(scr); ref.screen = scr; break; }
      case 'tvbank': B(g, w, h - .1, d, c, 0, .1 + (h - .1) / 2, 0); for (let i = 0; i < 3; i++) B(g, w / 3 - .01, h - .14, .01, shade(c, 1.15), -w / 3 + i * w / 3, .12 + (h - .14) / 2, front + .001);
        for (const s of [-1, 1]) for (const t of [-1, 1]) B(g, .03, .1, .03, metalM(), s * (w / 2 - .05), .05, t * (d / 2 - .05)); break;
      case 'hogtalare': case 'golvhogtalare': { B(g, w, h, d, c, 0, h / 2, 0); const cones = [];
        const n = it.type === 'golvhogtalare' ? 2 : 1;
        for (let i = 0; i < n; i++) { const cn = C(g, w * .32, w * .32, .02, M('#2c2c2c', { roughness: .4 }), 0, h * (n === 2 ? .3 + i * .25 : .35), front); cn.rotation.x = Math.PI / 2; cones.push(cn); }
        const tw = C(g, w * .12, w * .12, .02, metalM(), 0, h * .82, front); tw.rotation.x = Math.PI / 2; ref.cones = cones; break; }
      case 'soundbar': { B(g, w, h, d, c, 0, h / 2, 0); B(g, w - .02, h - .02, .005, M('#333', { roughness: 1 }), 0, h / 2, front + .001); ref.cones = []; break; }
      case 'altan': { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [M(c), M(c), floorMat('tra', c), M(c), M(c), M(c)]);
        m.position.y = h / 2; m.receiveShadow = m.castShadow = true; g.add(m);
        scaleTopUV(m.geometry, w, d); break; }
      case 'pool': { const cp = '#d9d4c8'; B(g, w, h, .2, cp, 0, h / 2, -d / 2 + .1); B(g, w, h, .2, cp, 0, h / 2, d / 2 - .1); B(g, .2, h, d, cp, -w / 2 + .1, h / 2, 0); B(g, .2, h, d, cp, w / 2 - .1, h / 2, 0);
        const water = B(g, w - .4, .02, d - .4, M(c, { roughness: .05, metalness: .1, emissive: new THREE.Color(c), emissiveIntensity: .25, transparent: true, opacity: .92 }), 0, .03, 0); water.castShadow = false; break; }
      case 'gang': { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [M(c), M(c), floorMat('klinker', c), M(c), M(c), M(c)]); m.position.y = h / 2; m.receiveShadow = true; g.add(m); scaleTopUV(m.geometry, w, d); break; }
      case 'trad': { C(g, .12, .18, h * .45, '#4a3020', 0, h * .225, 0, 8);
        for (const [x, y, z, s] of [[0, .62, 0, .5], [.25, .5, .15, .36], [-.22, .55, -.2, .38], [.05, .82, .05, .34]]) {
          const m = new THREE.Mesh(new THREE.IcosahedronGeometry(w * s, 1), M(shade(c, .9 + s * .3), { flatShading: true, roughness: .9 })); m.position.set(x * w, y * h, z * w); m.castShadow = true; m.receiveShadow = true; g.add(m); } break; }
      case 'trappa': { const n = Math.max(3, Math.round(h / .18)), rise = h / n, run = d / n;
        for (let i = 0; i < n; i++) B(g, w - .08, .045, run + .03, c, 0, (i + 1) * rise - .022, d / 2 - (i + .5) * run);
        const len = Math.hypot(d, h), ang = Math.atan2(h, d);
        for (const sx of [-1, 1]) { const st = B(g, .04, .25, len, c, sx * (w / 2 - .02), h / 2 - .05, 0); st.rotation.x = ang;
          const rail = B(g, .04, .04, len, c2 || '#1f2328', sx * (w / 2 - .02), h / 2 + .9, 0); rail.rotation.x = ang;
          for (let i = 0; i < n; i += 3) B(g, .02, .9, .02, c2 || '#1f2328', sx * (w / 2 - .02), (i + 1) * rise + .45, d / 2 - (i + .5) * run); }
        break; }
      case 'spiraltrappa': { const n = Math.max(6, Math.round(h / .19)), rise = h / n, turn = Math.PI * 2 * .9;
        C(g, .05, .05, h + .9, c2 || '#1f2328', 0, (h + .9) / 2, 0, 12);
        for (let i = 0; i < n; i++) { const a = i / n * turn, st = new THREE.Group(); st.rotation.y = -a; st.position.y = (i + 1) * rise - .02; g.add(st);
          B(st, w / 2 - .02, .04, .32, c, w / 4, 0, 0); B(st, .02, .9, .02, c2 || '#1f2328', w / 2 - .04, .45, 0); }
        break; }
      case 'vagglampa': { B(g, .1, .18, .02, c, 0, .12, -d / 2 + .01); B(g, .03, .03, .1, c, 0, .16, -d / 2 + .06);
        const bulb = B(g, .11, .16, .11, new THREE.MeshStandardMaterial({ color: 0x777777, transparent: true, opacity: .9 }), 0, .1, d / 2 - .06); bulb.castShadow = false;
        B(g, .13, .02, .13, c, 0, .19, d / 2 - .06); ref.bulb = bulb; ref.lightY = .1; ref.power = 5; break; }
      case 'gran': { C(g, .1, .15, h * .2, '#4a3020', 0, h * .1, 0, 8);
        for (let i = 0; i < 4; i++) { const r = w / 2 * (1 - i * .2), ch = h * .38, m = new THREE.Mesh(new THREE.ConeGeometry(r, ch, 9), M(shade(c, .9 + i * .06), { flatShading: true, roughness: .9 }));
          m.position.y = h * .2 + i * h * .18 + ch / 2; m.castShadow = m.receiveShadow = true; g.add(m); } break; }
      case 'frukttrad': { C(g, .08, .12, h * .4, '#5a3a24', 0, h * .2, 0, 8);
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(w * .45, 1), M(c, { flatShading: true, roughness: .9 })); crown.position.y = h * .68; crown.scale.y = .8; crown.castShadow = true; g.add(crown);
        let sd = 7; const Rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 18; i++) { const a = Rr() * 6.28, b = Rr() * 3.14, r = w * .45; const ap = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), M('#c0392b', { roughness: .4 }));
          ap.position.set(Math.cos(a) * Math.sin(b) * r, h * .68 + Math.cos(b) * r * .8, Math.sin(a) * Math.sin(b) * r); g.add(ap); } break; }
      case 'hack': { const n = Math.max(1, Math.round(w / .5));
        for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.5, 1), M(shade(c, .9 + (i % 3) * .07), { flatShading: true, roughness: .95 }));
          m.position.set(-w / 2 + (i + .5) * w / n, h / 2, 0); m.scale.set(w / n * 1.3, h, d * 1.6); m.castShadow = m.receiveShadow = true; g.add(m); } break; }
      case 'rabatt': { B(g, w, .12, d, '#8a8178', 0, .06, 0); B(g, w - .08, .02, d - .08, c, 0, .12, 0);
        const cols = ['#e84393', '#fdcb6e', '#e17055', '#a29bfe', '#ffffff']; let sd = 3; const Rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < Math.round(w * d * 40); i++) { const x = (Rr() - .5) * (w - .15), z = (Rr() - .5) * (d - .15), sh = .08 + Rr() * .15;
          B(g, .01, sh, .01, '#3d6b34', x, .13 + sh / 2, z); const f = new THREE.Mesh(new THREE.SphereGeometry(.035, 6, 5), M(cols[(Rr() * 5) | 0])); f.position.set(x, .13 + sh, z); g.add(f); } break; }
      case 'utekruka': { C(g, w * .45, w * .35, .5, c, 0, .25, 0, 16); for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(w * .35, 1), M('#3f7a3a', { flatShading: true }));
          m.position.set(Math.sin(i * 2.1) * w * .12, .55 + i * (h - .6) / 3, Math.cos(i * 2.1) * w * .12); m.castShadow = true; g.add(m); } break; }
      case 'parasoll': { C(g, .25, .3, .08, '#555', 0, .04, 0); C(g, .025, .025, h, '#ddd', 0, h / 2, 0);
        const can = new THREE.Mesh(new THREE.ConeGeometry(w / 2, .5, 8, 1, true), new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: .9, side: THREE.DoubleSide }));
        can.position.y = h - .2; can.castShadow = true; g.add(can); break; }
      case 'solstol': { for (const s of [-1, 1]) for (const t of [-1, 1]) B(g, .04, .25, .04, c, s * (w / 2 - .04), .125, t * (d / 2 - .1));
        B(g, w, .04, d * .68, c, 0, .27, d * .16); B(g, w - .04, .06, d * .66, c2 || '#e8e2d6', 0, .32, d * .16);
        const back = B(g, w - .04, .06, d * .34, c2 || '#e8e2d6', 0, .45, -d * .3); back.rotation.x = .7; break; }
      case 'utebord': { B(g, w, .04, d, c, 0, h - .02, 0); for (const s of [-1, 1]) B(g, .06, h - .04, d - .1, c, s * (w / 2 - .12), (h - .04) / 2, 0); break; }
      case 'buske': { for (const [x, z, s] of [[0, 0, .5], [.25, .1, .35], [-.2, -.15, .38]]) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(w * s, 1), M(c, { flatShading: true, roughness: .9 }));
        m.position.set(x * w, h * .45, z * w); m.scale.y = h / w * 1.1; m.castShadow = true; g.add(m); } break; }
      case 'utelampa': { C(g, .05, .06, h - .12, c, 0, (h - .12) / 2, 0); const bulb = C(g, .065, .065, .12, new THREE.MeshStandardMaterial({ color: 0x777777 }), 0, h - .06, 0); C(g, .08, .08, .02, c, 0, h + .01, 0);
        ref.bulb = bulb; ref.lightY = h - .06; ref.power = 3; break; }
      case 'staket': { const n = Math.max(2, Math.round(w / .14)); for (let i = 0; i < n; i++) B(g, .09, h, .02, c, -w / 2 + (i + .5) * w / n, h / 2, 0); for (const y of [.2, h - .2]) B(g, w, .06, .04, shade(c, .85), 0, y, -.03); break; }
      case 'grill': { B(g, w, .35, d, c, 0, .75, 0); const lid = C(g, d / 2, d / 2, w, c, 0, .92, 0, 20); lid.rotation.z = Math.PI / 2; lid.scale.set(1, 1, .7);
        for (const s of [-1, 1]) for (const t of [-1, 1]) B(g, .03, .58, .03, c, s * (w / 2 - .05), .29, t * (d / 2 - .05)); B(g, w + .3, .02, d * .8, '#555', 0, .7, 0); break; }
      case 'bil': { const pm = M(c, { metalness: .6, roughness: .25 }); B(g, w, .55, d, pm, 0, .2 + .275, 0); B(g, w - .1, .08, d - .05, pm, 0, .78, .1);
        const cab = B(g, w - .16, .5, d * .5, M('#151b22', { metalness: .4, roughness: .1 }), 0, 1.06, -.15); cab.scale.x = 1;
        B(g, w - .2, .04, d * .48, pm, 0, 1.33, -.15);
        for (const [x, z] of [[w / 2 - .12, d / 2 - .8], [-w / 2 + .12, d / 2 - .8], [w / 2 - .12, -d / 2 + .75], [-w / 2 + .12, -d / 2 + .75]]) {
          const wh = C(g, .33, .33, .24, '#111', x, .33, z, 24); wh.rotation.z = Math.PI / 2; const rim = C(g, .2, .2, .25, metalM(), x, .33, z, 16); rim.rotation.z = Math.PI / 2; }
        for (const s of [-1, 1]) { B(g, .35, .08, .02, M('#fff', { emissive: 0xffffff, emissiveIntensity: .6 }), s * (w / 2 - .3), .6, d / 2 + .005); B(g, .35, .06, .02, M('#c22', { emissive: 0xff2222, emissiveIntensity: .5 }), s * (w / 2 - .3), .65, -d / 2 - .005); }
        break; }
      default: B(g, w, h, d, c, 0, h / 2, 0);
    }
    if (cat.dev === 'light') {
      const L = new THREE.PointLight(0xffb978, 0, it.type === 'utelampa' ? 6 : 9, 2); L.position.y = ref.lightY ?? h / 2; g.add(L); ref.light = L;
    }
    if (cat.dev === 'tv') { const L = new THREE.PointLight(0x7aa7ff, 0, 4, 2); L.position.set(0, h / 2, front + .3); g.add(L); ref.light = L; ref.power = 2; }
    handleC = null; g.position.set(it.x, it.elev || 0, it.y); g.rotation.y = -it.rot * Math.PI / 180;
    g.traverse(o => { o.userData.pick = { type: 'item', id: it.id }; });
    return ref;
  }
  function scaleTopUV(geo, w, d) { const uv = geo.attributes.uv; for (let i = 8; i < 12; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d); uv.needsUpdate = true; }

  // ---------- väggar, dörrar, fönster ----------
  // Hörn: räkna ut var väggarnas sidor möts (gering), så att hörn och T-korsningar blir släta.
  function wallJoints(walls) {
    const nodes = new Map(), key = p => Math.round(p.x * 1000) + ',' + Math.round(p.y * 1000), out = new Map();
    for (const w of walls) { const L = wallLen(w); if (L < .01) continue; const ux = (w.b.x - w.a.x) / L, uy = (w.b.y - w.a.y) / L;
      for (const end of ['a', 'b']) { const d = end === 'a' ? { x: ux, y: uy } : { x: -ux, y: -uy }, k = key(w[end]);
        if (!nodes.has(k)) nodes.set(k, []); nodes.get(k).push({ w, end, d, ang: Math.atan2(d.y, d.x) }); } }
    const meet = (side, t, d, o, oSide) => { // vår kant (side ±1) mot grannens kant
      const nO = oSide > 0 ? { x: -o.d.y, y: o.d.x } : { x: o.d.y, y: -o.d.x }, nS = side > 0 ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x };
      const rx = nO.x * o.w.t / 2 - nS.x * t, ry = nO.y * o.w.t / 2 - nS.y * t, cr = d.x * o.d.y - d.y * o.d.x;
      if (Math.abs(cr) < 1e-3) return 0;
      const sv = (rx * o.d.y - ry * o.d.x) / cr, lim = Math.max(t, o.w.t / 2) * 4; return Math.max(-lim, Math.min(lim, sv)); };
    for (const list of nodes.values()) { list.sort((p, q) => p.ang - q.ang); const n = list.length;
      for (let i = 0; i < n; i++) { const e = list[i], t = e.w.t / 2; let sL = 0, sR = 0;
        if (n > 1) { sL = meet(1, t, e.d, list[(i + 1) % n], -1); sR = meet(-1, t, e.d, list[(i - 1 + n) % n], 1); }
        const j = out.get(e.w.id) || {}, L = wallLen(e.w);
        if (e.end === 'a') { j.P0 = sL; j.N0 = sR; } else { j.N1 = L - sL; j.P1 = L - sR; }
        out.set(e.w.id, j); } }
    return out;
  }
  // Prisma (vägg-bit) från en polygon i väggens lokala (x längs väggen, z tvärs), med material per sida.
  function prism(g, poly, y0, y1, t2, mats) {
    let area = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; area += a.x * b.z - b.x * a.z; }
    if (area < 0) poly = poly.slice().reverse();
    const pos = [], uv = [], groups = []; let mi;
    const push = (m, verts, uvs) => { const start = pos.length / 3; verts.forEach(v => pos.push(...v)); uvs.forEach(u => uv.push(...u)); groups.push([start, verts.length, m]); };
    const tri = THREE.ShapeUtils.triangulateShape(poly.map(p => new THREE.Vector2(p.x, p.z)), []);
    const top = [], tuv = [], bot = [], buv = [];
    for (const [a, b, c] of tri) { for (const k of [a, c, b]) { top.push([poly[k].x, y1, poly[k].z]); tuv.push([poly[k].x, poly[k].z]); }
      for (const k of [a, b, c]) { bot.push([poly[k].x, y0, poly[k].z]); buv.push([poly[k].x, poly[k].z]); } }
    push(3, top, tuv); push(0, bot, buv);
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], len = Math.hypot(b.x - a.x, b.z - a.z); if (len < 1e-5) continue;
      mi = Math.abs(a.z - t2) < 1e-4 && Math.abs(b.z - t2) < 1e-4 ? 1 : Math.abs(a.z + t2) < 1e-4 && Math.abs(b.z + t2) < 1e-4 ? 2 : 0;
      const ua = mi ? a.x : 0, ub = mi ? b.x : len;
      push(mi, [[a.x, y0, a.z], [b.x, y1, b.z], [b.x, y0, b.z], [a.x, y0, a.z], [a.x, y1, a.z], [b.x, y1, b.z]], [[ua, y0], [ub, y1], [ub, y0], [ua, y0], [ua, y1], [ub, y1]]); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    groups.forEach(([s0, c, m]) => geo.addGroup(s0, c, m)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mats); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh;
  }

  // ---------- väggar, dörrar, fönster ----------
  let joints = new Map();
  function buildWall(h, w, H) {
    const L = wallLen(w); if (L < .01) return;
    const g = new THREE.Group(); g.position.set(w.a.x, 0, w.a.y); g.rotation.y = Math.atan2(-(w.b.y - w.a.y), w.b.x - w.a.x);
    const t = w.t, t2 = t / 2, base = w.color || '#eeebe5', mE = M(base, { roughness: .92 }), cap = M('#3a3a3a');
    const mats = [mE, wallMat(w.matP, w.colorP || base), wallMat(w.matN, w.colorN || base), mE];
    const capMats = [mE, mats[1], mats[2], cap];
    const j = joints.get(w.id) || {}, P0 = j.P0 ?? 0, N0 = j.N0 ?? 0, P1 = j.P1 ?? L, N1 = j.N1 ?? L;
    const ops = h.openings.filter(o => o.wall === w.id).sort((a, b) => a.t - b.t);
    const piece = (x0, x1, y0, y1, isStart, isEnd) => { if (x1 - x0 < .005 && !isStart && !isEnd || y1 - y0 < .005) return;
      const poly = [];
      if (isStart) poly.push({ x: N0, z: -t2 }, { x: 0, z: 0 }, { x: P0, z: t2 }); else poly.push({ x: x0, z: -t2 }, { x: x0, z: t2 });
      if (isEnd) poly.push({ x: P1, z: t2 }, { x: L, z: 0 }, { x: N1, z: -t2 }); else poly.push({ x: x1, z: t2 }, { x: x1, z: -t2 });
      const m = prism(g, poly, y0, y1, t2, Math.abs(y1 - H) < .001 ? capMats : mats); m.userData.pick = { type: 'wall', id: w.id }; };
    let cur = 0, first = true;
    for (const o of ops) { const s = o.t - o.w / 2, e = o.t + o.w / 2; if (s > cur + .001 || first) piece(cur, s, 0, H, first, false); first = false; cur = Math.max(cur, e);
      piece(s, e, 0, Math.min(o.sill, H), false, false); if (o.sill + o.h < H) piece(s, e, o.sill + o.h, H, false, false); }
    piece(cur, L, 0, H, first, true);
    layer.add(g);
    for (const o of ops) buildOpening(h, w, o, g, H);
  }
  function buildOpening(h, w, o, g, H) {
    handleC = o.handleColor || null;
    const t = w.t, fd = o.depth || t + .02, ref = { o }, s = o.t - o.w / 2, e = o.t + o.w / 2, top = o.sill + o.h, fm = M(o.color || '#ffffff', { roughness: .5 });
    const pickIt = m => { m.traverse(x => x.userData.pick = { type: 'opening', id: o.id }); return m; };
    if (top > H + .01 && o.kind !== 'hole') { /* lågt snitt: visa bara den nedre delen */ }
    const vis = Math.min(top, H);
    if (o.kind === 'window') {
      const f = .05;
      [[s + f / 2, o.sill + o.h / 2, f, o.h], [e - f / 2, o.sill + o.h / 2, f, o.h]].forEach(([x, y, ww, hh]) => { if (o.sill < H) pickIt(B(g, ww, Math.min(hh, H - o.sill), fd, fm, x, o.sill + Math.min(hh, H - o.sill) / 2, 0)); });
      if (o.sill < H) pickIt(B(g, o.w, f, fd, fm, o.t, o.sill + f / 2, 0));
      if (top <= H) pickIt(B(g, o.w, f, fd, fm, o.t, top - f / 2, 0));
      const gh = Math.max(0, Math.min(o.h - f * 2, H - o.sill - f));
      if (gh > .01) { // fönsterbågar som går att öppna inåt
        const n = o.panes || (o.w > 1.0 ? 2 : 1), sw = (o.w - f * 2) / n, sgn = insideSign(h, w, o), sf = .035, gm = M('#9fc3d6', { transparent: true, opacity: .25, roughness: .05, metalness: .2 });
        const th = o.transom && gh > .6 ? Math.min(.45, gh * .3) : 0, sh = gh - th;
        if (th) { pickIt(B(g, o.w - f * 2, f, fd * .9, fm, o.t, o.sill + f + sh + f / 2, 0));   // överljus: fast ruta
          const tg = new THREE.Mesh(new THREE.BoxGeometry(o.w - f * 2, th - f, .01), gm); tg.position.set(o.t, o.sill + f + sh + f + (th - f) / 2, 0); tg.castShadow = false; g.add(pickIt(tg));
          if (o.grid && o.grid !== 'none') for (let i = 1; i < n * (o.grid === 'sprojs' ? 2 : 1); i++) pickIt(B(g, .02, th - f, .025, fm, s + f + i * (o.w - f * 2) / (n * (o.grid === 'sprojs' ? 2 : 1)), o.sill + f + sh + f + (th - f) / 2, 0)); }
        ref.sashes = [];
        const ot = o.openType || 'sido';
        for (let i = 0; i < n; i++) { const left = i < n / 2 || n === 1, dir = left ? 1 : -1, x0 = s + f + i * sw, base = o.sill + f;
          const inner = new THREE.Group(), pv = new THREE.Group(); pv.add(inner); g.add(pv);
          B(inner, sf, sh, .04, fm, -sw / 2 + sf / 2, sh / 2, 0); B(inner, sf, sh, .04, fm, sw / 2 - sf / 2, sh / 2, 0);
          B(inner, sw, sf, .04, fm, 0, sf / 2, 0); B(inner, sw, sf, .04, fm, 0, sh - sf / 2, 0);
          const glass = new THREE.Mesh(new THREE.BoxGeometry(sw - sf * 2, sh - sf * 2, .01), gm); glass.position.set(0, sh / 2, 0); glass.castShadow = false; inner.add(glass);
          if (o.grid === 'kors') { B(inner, .022, sh - sf * 2, .028, fm, 0, sh / 2, 0); B(inner, sw - sf * 2, .022, .028, fm, 0, sh * .58, 0); }
          if (o.grid === 'sprojs') { B(inner, .02, sh - sf * 2, .026, fm, 0, sh / 2, 0); for (const k of [1 / 3, 2 / 3]) B(inner, sw - sf * 2, .02, .026, fm, 0, sf + (sh - sf * 2) * k, 0); }
          if (ot === 'sido') { B(inner, .015, .12, .03, metalM(), dir * (sw / 2 - .06), sh / 2, sgn * .03);
            pv.position.set(left ? x0 : x0 + sw, base, 0); inner.position.x = dir * sw / 2; ref.sashes.push({ g: pv, axis: 'y', sign: left ? -sgn : sgn, max: 1.1 }); }
          else if (ot === 'sving') { B(inner, .12, .015, .03, metalM(), 0, sh - .07, sgn * .03);
            pv.position.set(x0 + sw / 2, base + sh / 2, 0); inner.position.y = -sh / 2; ref.sashes.push({ g: pv, axis: 'x', sign: sgn, max: .9 }); }
          else if (ot === 'tipp') { B(inner, .12, .015, .03, metalM(), 0, sh - .07, sgn * .03);
            pv.position.set(x0 + sw / 2, base, 0); ref.sashes.push({ g: pv, axis: 'x', sign: sgn, max: .3 }); }
          else { pv.position.set(x0 + sw / 2, base, 0); }
          pickIt(pv); } }
      if (o.sill > .3 && o.sill < H) pickIt(B(g, o.w + .06, .03, t + .06, '#e8e8e8', o.t, o.sill - .015, 0));
      if (o.blind !== 'none') {
        const side = insideSign(h, w, o) * (t / 2 + .03);
        const bg = new THREE.Group(); bg.position.set(o.t, top, side); g.add(bg);
        const roll = C(bg, .03, .03, o.w + .04, o.blindColor, 0, -.03, 0, 12); roll.rotation.z = Math.PI / 2;
        let cloth;
        if (o.blind === 'persienn') { cloth = new THREE.Group(); const n = Math.round(o.h / .05);
          for (let i = 0; i < n; i++) { const sl = B(cloth, o.w, .004, .045, o.blindColor, 0, -(i + .5) * .05, 0); sl.rotation.x = .5; }
          ref.slats = cloth.children; }
        else { cloth = B(bg, o.w, 1, .006, M(o.blindColor, { roughness: 1, side: THREE.DoubleSide }), 0, -.5, 0); }
        bg.add(cloth); ref.cloth = cloth; if (top > H + .01) bg.visible = false; ref.blindH = o.h; ref.blindG = bg; bg.traverse(x => x.userData.pick = { type: 'blind', id: o.id });
      }
    } else if (o.kind === 'door') {
      const f = .06, fz = fd;
      pickIt(B(g, f, Math.min(o.h, H), fz, fm, s + f / 2, Math.min(o.h, H) / 2, 0)); pickIt(B(g, f, Math.min(o.h, H), fz, fm, e - f / 2, Math.min(o.h, H) / 2, 0));
      if (o.h <= H) pickIt(B(g, o.w, f, fz, fm, o.t, o.h - f / 2, 0));
      const lw = o.w - f * 2, lh = Math.min(o.h - f - .01, H - .01), hingeX = o.hinge === 'L' ? s + f : e - f, dir = o.hinge === 'L' ? 1 : -1;
      const pivot = new THREE.Group(); pivot.position.set(hingeX, 0, 0); g.add(pivot);
      let leaf;
      if (o.glass) { const fm2 = M(o.color, { roughness: .45 }), st = .07, top = .1, bot = .14, x0 = dir * lw / 2;
        leaf = B(pivot, st, lh, .05, fm2, dir * st / 2, .01 + lh / 2, 0); B(pivot, st, lh, .05, fm2, dir * (lw - st / 2), .01 + lh / 2, 0);
        B(pivot, lw, bot, .05, fm2, x0, .01 + bot / 2, 0); B(pivot, lw, top, .05, fm2, x0, .01 + lh - top / 2, 0);
        const gl = new THREE.Mesh(new THREE.BoxGeometry(lw - st * 2, lh - top - bot, .01), M('#9fc3d6', { transparent: true, opacity: .25, roughness: .05, metalness: .2 }));
        gl.position.set(x0, .01 + bot + (lh - top - bot) / 2, 0); gl.castShadow = false; pivot.add(gl); }
      else { leaf = B(pivot, lw, lh, .04, o.mat === 'tra' ? floorMat('panel', o.color) : M(o.color, { roughness: .45 }), dir * lw / 2, .01 + lh / 2, 0);
        if (o.mat === 'tra') { const uv = leaf.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * lw, uv.getY(i) * lh); uv.needsUpdate = true; } }
      B(pivot, .12, .02, .05, metalM(), dir * (lw - .08), 1.0, .04); B(pivot, .12, .02, .05, metalM(), dir * (lw - .08), 1.0, -.04);
      pickIt(pivot); ref.pivot = pivot; ref.sign = -dir * o.swing; ref.leaf = leaf;
    } else if (o.kind === 'garage') {
      const f = .08; pickIt(B(g, f, Math.min(o.h, H), t + .02, fm, s + f / 2, Math.min(o.h, H) / 2, 0)); pickIt(B(g, f, Math.min(o.h, H), t + .02, fm, e - f / 2, Math.min(o.h, H) / 2, 0));
      const pg = new THREE.Group(); pg.position.set(o.t, o.h, 0); g.add(pg);
      const n = 5, ph = o.h / n; for (let i = 0; i < n; i++) B(pg, o.w - f * 2, ph - .01, .05, M(o.color, { metalness: .4, roughness: .45 }), 0, -(i + .5) * ph, 0);
      pickIt(pg); ref.panel = pg; ref.gh = o.h;
    }
    refs.openings[o.id] = ref; handleC = null;
  }

  // ---------- bygg hela scenen ----------
  function disposeWorld() {
    world.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isReflector || o.getRenderTarget) { o.dispose?.(); } });
    world.clear(); refs = { items: {}, openings: {}, pick: [] }; if (selBox) { scene.remove(selBox); selBox.dispose?.(); } selBox = null;
  }
  let layer = world;
  // polygon förstorad d meter (hörnen följer med)
  function grow(pts, d) { if (!d || pts.length < 3) return pts; let a2 = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; a2 += p.x * q.y - q.x * p.y; }); const sg = a2 > 0 ? 1 : -1, n = pts.length;
    return pts.map((p1, i) => { const p0 = pts[(i - 1 + n) % n], p2 = pts[(i + 1) % n], nm = (x, y) => { const L = Math.hypot(x, y) || 1; return { x: x / L, y: y / L }; };
      const e1 = nm(p1.x - p0.x, p1.y - p0.y), e2 = nm(p2.x - p1.x, p2.y - p1.y), n1 = { x: e1.y * sg, y: -e1.x * sg }, n2 = { x: e2.y * sg, y: -e2.x * sg }, b = nm(n1.x + n2.x, n1.y + n2.y), c = b.x * n1.x + b.y * n1.y;
      const k = Math.abs(c) > .3 ? d / c : d; return { x: p1.x + b.x * k, y: p1.y + b.y * k }; }); }
  function build() {
    need = false; const hv = home(); if (!hv) return; disposeWorld();
    const raw = hv.__raw, act = hv.__level, idxAct = raw.levels.indexOf(act);
    const pts = raw.levels.flatMap(L => [...L.walls.flatMap(w => [w.a, w.b]), ...L.rooms.flatMap(r => r.pts), ...L.items.map(i => ({ x: i.x, y: i.y }))]);
    let x0 = -5, x1 = 15, y0 = -5, y1 = 15; if (pts.length) { x0 = Math.min(...pts.map(p => p.x)); x1 = Math.max(...pts.map(p => p.x)); y0 = Math.min(...pts.map(p => p.y)); y1 = Math.max(...pts.map(p => p.y)); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, size = Math.max(x1 - x0, y1 - y0, 8);
    bounds = { cx, cy, size, z: act.z || 0 };
    // mark
    const gs = size * 3 + 40;
    if (raw.type !== 'lagenhet') { const gm = new THREE.Mesh(new THREE.PlaneGeometry(gs, gs), floorMat('grass', '#4b6a3a'));
      gm.rotation.x = -Math.PI / 2; gm.position.set(cx, -.02, cy); gm.receiveShadow = true; const uv = gm.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * gs, uv.getY(i) * gs);
      gm.userData.pick = { type: 'ground' }; world.add(gm); }
    else { const z0 = Math.min(...raw.levels.map(l => l.z || 0)); const gm = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 1.5, .3, y1 - y0 + 1.5), M('#3a3d40')); gm.position.set(cx, z0 - .16, cy); gm.receiveShadow = true; gm.userData.pick = { type: 'ground' }; world.add(gm); }
    const cutV = { hela: 0, halva: 1.15, golv: .1, rum: 0 }[S.walls] ?? 1.15;
    let activeFocus = null;
    raw.levels.forEach((L, li) => {
      if (li > idxAct && !S.showAll) return;
      const h = levelView(raw, L), active = L === act;
      layer = new THREE.Group(); layer.position.y = L.z || 0; world.add(layer);
      // bara ett rum?
      const focus = active && S.walls === 'rum' ? (h.rooms.find(r => r.id === S.focus) || [...h.rooms].filter(r => !r.outdoor).sort((a, b) => area(b) - area(a))[0]) : null;
      if (focus) { S.focus = focus.id; activeFocus = focus; }
      const nearFocus = w => { for (let i = 0; i <= 20; i++) { const p = { x: w.a.x + (w.b.x - w.a.x) * i / 20, y: w.a.y + (w.b.y - w.a.y) * i / 20 };
        for (let k = 0; k < focus.pts.length; k++) { const a = focus.pts[k], b = focus.pts[(k + 1) % focus.pts.length], pr = proj(p, a, b);
          if (pr.t > -.05 && pr.t < pr.L + .05 && Math.abs(pr.d) < w.t / 2 + .12) { const ang = Math.abs(((Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x) - Math.atan2(b.y - a.y, b.x - a.x)) % Math.PI + Math.PI) % Math.PI); if (ang < .1 || ang > Math.PI - .1) return true; } } } return false; };
      // golv
      h.rooms.forEach((r, ri) => { if (focus && r !== focus) return;
        const sh = new THREE.Shape(grow(r.pts, r.outdoor ? 0 : .06).map(p => new THREE.Vector2(p.x, -p.y)));
        const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), floorMat(r.style || 'tra', r.floor, +(r.floorRot || 0))); m.rotation.x = -Math.PI / 2; m.position.y = .002 + ri * .0004; m.receiveShadow = true;
        m.userData.pick = { type: 'room', id: r.id }; layer.add(m);
        const base = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: L.z > 0 ? .3 : .1, bevelEnabled: false }), M('#8a8580')); base.rotation.x = -Math.PI / 2; base.position.y = L.z > 0 ? -.3 : -.1; base.receiveShadow = true; base.castShadow = L.z > 0; layer.add(base);
      });
      // innertak – på den aktiva våningen bara om man valt det, under-våningar alltid stängda
      const ceilOn = active ? S.walls === 'hela' && S.ceil === true : true;
      if (ceilOn) for (const r of h.rooms) { if (r.outdoor || (focus && r !== focus)) continue;
        const sh = new THREE.Shape(r.pts.map(p => new THREE.Vector2(p.x, p.y)));
        const c = new THREE.Mesh(new THREE.ShapeGeometry(sh), M(r.ceilColor || '#f4f2ee', { roughness: .95, emissive: new THREE.Color(r.ceilColor || '#f4f2ee'), emissiveIntensity: S.day ? .55 : .18 })); c.rotation.x = Math.PI / 2; c.position.y = h.ceiling || 2.5; c.receiveShadow = true;
        c.userData.pick = { type: 'room', id: r.id }; layer.add(c);
        const top = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(r.pts.map(p => new THREE.Vector2(p.x, -p.y)))), M('#9a958f', { roughness: .9 })); top.rotation.x = -Math.PI / 2; top.position.y = (h.ceiling || 2.5) + .02; top.castShadow = true; layer.add(top); }
      // väggar
      const cut = active ? cutV : 0;
      joints = wallJoints(h.walls.filter(w => !w.virtual));
      for (const w of h.walls) { if (w.virtual || (focus && !nearFocus(w))) continue; buildWall(h, w, cut ? Math.min(cut, w.h) : w.h); }
      // saker
      for (const it of h.items) { if (focus && !inPoly(it, focus.pts)) continue; const ref = buildItem(it); refs.items[it.id] = ref; layer.add(ref.group);
        if (cut && it.elev > cut - .05 && !ITEMS[it.type].dev && !['trappa', 'spiraltrappa'].includes(it.type)) ref.group.visible = false; }
      layer.traverse(o => { if (o.userData.pick) o.userData.pick.lv = L.id; });
    });
    layer = world;
    const focus = activeFocus;
    // sol
    sun.position.set(cx - size * .6, size * 1.2, cy + size * .8); sun.target.position.set(cx, 0, cy);
    const sc = sun.shadow.camera; sc.left = sc.bottom = -size * .9; sc.right = sc.top = size * .9; sc.near = 1; sc.far = size * 4; sc.updateProjectionMatrix();
    if (focus) { const xs = focus.pts.map(p => p.x), ys = focus.pts.map(p => p.y); focusB = { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, size: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 3), z: act.z || 0 }; } else focusB = null;
    const sig = raw.id + ':' + (pts.length > 0) + ':' + (focus ? focus.id : '') + ':' + act.id; if (!built || sig !== lastSig) fitCam(); built = true; lastSig = sig;
    applyStates(true); setLighting(); highlight();
  }
  let bounds = { cx: 6, cy: 5, size: 12 }, focusB = null;
  const area = r => { let s = 0; r.pts.forEach((a, i) => { const b = r.pts[(i + 1) % r.pts.length]; s += a.x * b.y - b.x * a.y; }); return Math.abs(s / 2); };
  function fitCam() { cam.fov = 36; cam.updateProjectionMatrix(); controls.minDistance = 2; controls.maxDistance = 90; const { cx, cy, size, z = 0 } = focusB || bounds; controls.target.set(cx, z, cy); const s = focusB ? size * 1.1 : Math.max(size, 10); cam.position.set(cx + s * .9, z + s * 1.15, cy + s * 1.3); controls.update(); }

  function setLighting() {
    const day = S.day;
    hemi.intensity = day ? 1.6 : .45; hemi.color.set(day ? 0xdde8ff : 0x6d82b8); hemi.groundColor.set(day ? 0x8a7c66 : 0x2a2620);
    sun.intensity = day ? 2.6 : .35; sun.color.set(day ? 0xffe6c8 : 0x9fb4ff);
    const bg = day ? 0x1b2219 : 0x0c0f0c; scene.background = new THREE.Color(bg); scene.fog = new THREE.Fog(bg, bounds.size * 2.2, bounds.size * 5);
  }

  // ---------- tillstånd (lampor, dörrar, gardiner) ----------
  function applyStates(instant) {
    const raw = home().__raw, h = { items: raw.levels.flatMap(L => L.items), openings: raw.levels.flatMap(L => L.openings) };
    for (const it of h.items) { const r = refs.items[it.id]; if (!r) continue; const st = it.state || {};
      r.target = st.on ? (st.bri ?? .8) : 0; if (instant) r.cur = r.target; }
    for (const o of h.openings) { const r = refs.openings[o.id]; if (!r) continue; r.tOpen = o.state?.open || 0; r.tBlind = o.state?.blind || 0;
      if (instant) { r.open = r.tOpen; r.blind = r.tBlind; } }
  }
  function animate(dt) {
    const k = Math.min(1, dt * 5), now = performance.now() / 1000;
    for (const id in refs.items) { const r = refs.items[id]; if (r.target === undefined) continue;
      r.cur += (r.target - r.cur) * k; const v = r.cur, dev = ITEMS[r.it.type].dev;
      if (r.light) r.light.intensity = v * (r.power || 10) * (dev === 'tv' ? 1 : 1);
      if (r.bulb) { r.bulb.material.emissive.setRGB(1, .72, .42); r.bulb.material.emissiveIntensity = v * 3; r.bulb.material.color.setScalar(v > .05 ? 1 : .45); }
      if (r.shade) { r.shade.material.emissive.setRGB(1, .7, .4); r.shade.material.emissiveIntensity = v * .9; }
      if (r.screen) { const m = r.screen.material; if (v > .05 && !m.emissiveMap) { m.emissiveMap = tvScreen(); m.emissive.set(0xffffff); m.needsUpdate = true; } m.emissiveIntensity = v * 1.2; }
      if (r.cones) { const p = v > .5 ? 1 + Math.abs(Math.sin(now * 9)) * .12 : 1; r.cones.forEach(c => c.scale.set(p, 1, p)); }
    }
    for (const id in refs.openings) { const r = refs.openings[id];
      r.open += ((r.tOpen ?? 0) - (r.open ?? 0)) * k; r.blind += ((r.tBlind ?? 0) - (r.blind ?? 0)) * k;
      if (r.pivot) r.pivot.rotation.y = r.sign * r.open * Math.PI * .5;
      if (r.sashes) r.sashes.forEach(s => s.g.rotation[s.axis] = s.sign * r.open * s.max);
      if (r.panel) { r.panel.scale.y = 1 - r.open * .92; }
      if (r.cloth) { const L = Math.max(.001, r.blind * r.blindH);
        if (r.slats) r.slats.forEach((s, i) => { const y = (i + .5) * .05; s.visible = y <= L + .001; s.rotation.x = r.blind > .02 ? .25 : 1.2; });
        else { r.cloth.scale.y = L; r.cloth.position.y = -L / 2 - .03; r.cloth.visible = L > .01; } }
    }
  }

  // ---------- markering ----------
  function highlight() {
    if (selBox) { scene.remove(selBox); selBox = null; }
    const s = S.sel; if (!s || S.mode !== 'bygg') return;
    let obj = null;
    if (s.type === 'item') obj = refs.items[s.id]?.group;
    if (obj) { selBox = new THREE.BoxHelper(obj, 0xff7a2f); scene.add(selBox); }
  }

  // ---------- klick & dra ----------
  const ray = new THREE.Raycaster(), mv = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hp = new THREE.Vector3();
  let down = null, drag = null;
  const setPlane = () => { plane.constant = -(home().__level.z || 0); };
  function rayAt(e) { setPlane(); const r = renderer.domElement.getBoundingClientRect(); mv.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mv, cam); }
  function pickAt(e) { rayAt(e); const hits = ray.intersectObjects(world.children, true);
    for (const h of hits) { let o = h.object, vis = true; while (o) { if (!o.visible) { vis = false; break; } o = o.parent; } if (!vis) continue;
      const p = h.object.userData.pick; if (p) return { ...p, point: h.point }; } return null; }
  renderer.domElement.addEventListener('pointerdown', e => {
    if (e.button !== 0) return; down = { x: e.clientX, y: e.clientY }; drag = null;
    if (S.mode !== 'bygg' || S.placing) return;
    const p = pickAt(e);
    if (p?.type === 'item') { const it = home().items.find(i => i.id === p.id); if (!it) return; rayAt(e); ray.ray.intersectPlane(plane, hp);
      drag = { it, dx: hp.x - it.x, dy: hp.z - it.y, moved: false, committed: false }; controls.enabled = false; S.sel = { type: 'item', id: it.id }; emit('sel'); }
  });
  renderer.domElement.addEventListener('pointermove', e => {
    if (drag) { rayAt(e); if (!ray.ray.intersectPlane(plane, hp)) return; const it = drag.it;
      if (!drag.committed) { commit(); drag.committed = true; }
      let q = { x: Math.round((hp.x - drag.dx) / .05) * .05, y: Math.round((hp.z - drag.dy) / .05) * .05 };
      if (ITEMS[it.type].snap && !e.altKey) { const sw = snapToWall(home(), it, q); if (sw) { q = sw; it.rot = sw.rot; } }
      it.x = q.x; it.y = q.y; drag.moved = true; emit('item', it.id); return; }
    if (S.mode === 'styr') { const p = pickAt(e); renderer.domElement.style.cursor = p && (p.type === 'item' && ITEMS[home().items.find(i => i.id === p.id)?.type]?.dev || p.type === 'opening' || p.type === 'room') ? 'pointer' : 'grab'; }
  });
  window.addEventListener('pointerup', e => {
    if (drag) { const moved = drag.moved; drag = null; controls.enabled = true; if (moved) { emit('full'); down = null; return; } }
    if (!down || e.target !== renderer.domElement) { down = null; return; }
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; }
    down = null; const p = pickAt(e);
    if (S.mode === 'styr') { if (p) api.device(p); return; }
    if (p?.lv && p.lv !== S.level && p.type !== 'ground') { S.level = p.lv; S.sel = { type: p.type, id: p.id }; api.levelChanged?.(); return; }
    if (S.placing) { placeAt(e, p); return; }
    if (!p || p.type === 'ground') S.sel = null; else S.sel = { type: p.type, id: p.id };
    emit('sel');
  });
  function placeAt(e, p) {
    const h = home(), pl = S.placing; rayAt(e); ray.ray.intersectPlane(plane, hp);
    if (pl.kind === 'item') { let q = { x: Math.round(hp.x * 20) / 20, y: Math.round(hp.z * 20) / 20, rot: 0 }; const c = ITEMS[pl.key];
      if (c.snap) { const sw = snapToWall(h, { w: c.w, d: c.d }, q); if (sw) q = sw; }
      commit(); const it = makeItem(h, pl.key, q.x, q.y, q.rot); if (it.state) it.state.on = true; S.sel = { type: 'item', id: it.id }; }
    else { const pt = p?.point || hp; const f = findWall(h, { x: pt.x, y: pt.z }, .6); if (!f) { api.toast('Klicka på en vägg'); return; }
      const c = OPENINGS[pl.key]; commit(); const o = makeOpening(h, pl.key, f.wall, Math.round(Math.min(Math.max(f.t, c.w / 2), wallLen(f.wall) - c.w / 2) * 20) / 20); S.sel = { type: 'opening', id: o.id }; }
    if (!e.shiftKey) S.placing = null; emit('full'); api.toolDone();
  }

  // ---------- loop ----------
  function resize() { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(host);
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = (now - last) / 1000; last = now;
    if (!host.offsetParent) return;
    if (need) build();
    animate(dt); controls.update(); if (selBox) selBox.update(); renderer.render(scene, cam);
  });

  return {
    build() { need = true; },
    buildNow: build,
    syncItem(id) { const r = refs.items[id]; if (!r) return; const it = r.it; r.group.position.set(it.x, it.elev || 0, it.y); r.group.rotation.y = -it.rot * Math.PI / 180; },
    states() { applyStates(false); },
    highlight, fitCam, setLighting, resize,
    eye(room) { // stå i rummet i ögonhöjd
      const xs = room.pts.map(p => p.x), ys = room.pts.map(p => p.y), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const wide = Math.max(...xs) - Math.min(...xs) > Math.max(...ys) - Math.min(...ys);
      cam.fov = 65; cam.updateProjectionMatrix(); controls.minDistance = .2; controls.maxDistance = 4;
      const back = wide ? { x: Math.max(...xs) - .6, y: cy } : { x: cx, y: Math.max(...ys) - .6 };
      const z = home().__level.z || 0; cam.position.set(back.x, z + 1.6, back.y); controls.target.set(back.x + (wide ? -.8 : 0), z + 1.5, back.y + (wide ? 0 : -.8)); controls.update(); },
    topView() { const { cx, cy, size } = bounds; controls.target.set(cx, 0, cy); cam.position.set(cx, size * 1.6, cy + .01); },
  };
}
