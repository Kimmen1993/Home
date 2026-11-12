// Möbelverkstan (demo): ett vardagsrum + kök där varje möbel byggs med riktiga val och material.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FURN, KMODS, KWIDTHS, ELFA_SYS, elfaSys, newFurniture, syncFurniture, buildFurniture } from '../js/furniture.js?v=1794482121';
import { openElfaStudio, elevationSvg } from '../js/elfastudio.js?v=1794482121';
import { MATS, GROUPS, makeMat, swatch, worldUV } from '../js/materials.js?v=1794482121';
import { RAL, ralSearch, ralFind, ralOf } from '../js/ral.js?v=1794482121';
import { PRESETS, findPreset, FAMILIES, variantsOf } from '../js/presets.js?v=1794482121';

const $ = s => document.querySelector(s);
const host = $('#stage');
const RW = 7, RD = 5, RH = 2.5, WT = .15;      // rummets mått (m)
const KEY = 'hemma.demo.v1';

// ---------- renderare ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0e0b');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;
const cam = new THREE.PerspectiveCamera(40, 1, .05, 100); cam.position.set(4.6, 4.6, 6.6);
const controls = new OrbitControls(cam, renderer.domElement);
controls.target.set(0, .6, -.3); controls.enableDamping = true; controls.maxPolarAngle = 1.45; controls.minDistance = 1.2; controls.maxDistance = 16; controls.update();

const hemi = new THREE.HemisphereLight('#dfe9ff', '#5a4a3a', .35); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0dc', 3.2); sun.position.set(-7, 6.5, 3.5); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 }); sun.shadow.bias = -.0003; sun.shadow.normalBias = .02; sun.shadow.radius = 3;
scene.add(sun);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }));
composer.addPass(new RenderPass(scene, cam));
const gtao = new GTAOPass(scene, cam, 1, 1); gtao.blendIntensity = .9;
gtao.updateGtaoMaterial({ radius: .35, distanceExponent: 1.5, thickness: 1, scale: 1.2, samples: 16 });
// blad (genomskinliga kort) ska inte ge skuggkanter i AO-steget
const ov = gtao.overrideVisibility.bind(gtao);
gtao.overrideVisibility = function () { ov(); scene.traverse(o => { if (o.userData.noAO && o.visible) { o.visible = false; this._hid = (this._hid || []); this._hid.push(o); } }); };
const rv = gtao.restoreVisibility.bind(gtao);
gtao.restoreVisibility = function () { rv(); (this._hid || []).forEach(o => o.visible = true); this._hid = []; };
composer.addPass(gtao);
const outline = new OutlinePass(new THREE.Vector2(1, 1), scene, cam); outline.visibleEdgeColor.set('#ff7a2f'); outline.hiddenEdgeColor.set('#7a3a16'); outline.edgeStrength = 4; outline.edgeThickness = 1.2;
composer.addPass(outline); composer.addPass(new OutputPass());

// ---------- läge ----------
let st = null;
let sel = null, mode = 'dag';
const groups = new Map();
function fresh() {
  const P = (type, x, z, rot = 0, extra = {}) => ({ ...newFurniture(type, extra), x, z, rot, id: 'f' + Math.random().toString(36).slice(2, 8) });
  const items = [
    P('kok', 0, 0, 0), P('matbord', 1.7, .55, 0), P('taklampa', 1.7, .55, 0),
    P('stol', 1.15, -.05), P('stol', 1.75, -.05), P('stol', 2.35, -.05), P('stol', 1.15, 1.15, Math.PI), P('stol', 1.75, 1.15, Math.PI), P('stol', 2.35, 1.15, Math.PI),
    P('tvbank', -2.0, 0, 0), P('tv', -2.0, 0, 0), P('matta', -2.0, .3, 0), P('soffbord', -2.0, .35, 0), P('soffa', -2.05, 1.45, Math.PI),
    P('fatolj', -.35, -.45, -Math.PI / 2 - .35), P('golvlampa', -3.2, 2.1), P('bokhylla', 0, -1.55, Math.PI / 2), P('vaxt', -3.15, -.5, 0, { o: { typ: 'monstera' } }),
    P('bordslampa', -2.75, 0, 0), P('taklampa', -2.0, .35, 0),
  ];
  const k = items[0]; k.x = RW / 2 - k.w / 2; k.z = -RD / 2 + k.d / 2;
  for (const it of items) { if (['tvbank', 'tv', 'bordslampa'].includes(it.type)) it.z = -RD / 2 + FURN.tvbank.d / 2; if (it.type === 'bokhylla') it.x = -RW / 2 + it.d / 2; }
  items.find(i => i.type === 'soffa').o.form = 'schH';
  const pend = items.filter(i => i.type === 'taklampa'); pend[1].o.stil = 'kon'; pend[1].o.storlek = .5; pend[1].m.skarm = { mat: 'linne', color: '#e9e1d2' }; syncFurniture(pend[1]);
  items.forEach(it => { syncFurniture(it); it.elev = onTopElev(it, items); });
  return { items, wall: '#ECE7DD', wallRal: null, floor: 'ek', floorColor: null };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); return s?.items ? s : null; } catch (e) { return null; } }

// ---------- rummet ----------
const roomG = new THREE.Group(); scene.add(roomG);
const walls = [];
const glassMat = new THREE.MeshStandardMaterial({ color: '#cfe2ee', emissive: new THREE.Color('#d6e8f4'), emissiveIntensity: .9, roughness: .05, metalness: .2, side: THREE.DoubleSide });
const frameMat = makeMat('matt', '#f4f2ee');
function plankTex(id, color) {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  const det = makeMat(id, color).map?.image; const base = new THREE.Color(color || MATS[id].color);
  let s = 7; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pw = 1024 / 10;   // 20 cm brädor på 2 m
  for (let i = 0; i < 10; i++) { let y = -R() * 600; while (y < 1024) { const L = 400 + R() * 600; const f = .88 + R() * .2;
    g.fillStyle = base.clone().multiplyScalar(f).getStyle(); g.fillRect(i * pw, y, pw, L);
    if (det) { g.save(); g.globalCompositeOperation = 'multiply'; g.beginPath(); g.rect(i * pw, y, pw, L); g.clip(); g.translate(i * pw, y); g.rotate(Math.PI / 2); g.drawImage(det, 0, (R() * 400) | 0, 512, 100, 0, -pw, L, pw); g.restore(); }
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(i * pw, y, 1.5, L); g.fillRect(i * pw, y, pw, 1.5); y += L; } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(.5, .5); t.anisotropy = 8; return t;
}
function buildRoom() {
  roomG.clear(); walls.length = 0;
  // golv
  const fg = new THREE.PlaneGeometry(RW, RD); fg.rotateX(-Math.PI / 2);
  let fm;
  if (MATS[st.floor].group === 'tra') { const src = makeMat(st.floor, st.floorColor); fm = new THREE.MeshPhysicalMaterial({ map: plankTex(st.floor, st.floorColor), roughness: .55, clearcoat: .3, clearcoatRoughness: .4, bumpMap: src.bumpMap, bumpScale: .6 });
    const uv = fg.attributes.uv, p = fg.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i)); }
  else { worldUV(fg); fm = makeMat(st.floor, st.floorColor); }
  const floor = new THREE.Mesh(fg, fm); floor.receiveShadow = true; floor.userData.floor = 1; roomG.add(floor);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(RW + WT * 2, .2, RD + WT * 2), makeMat('matt', '#2a2f2a')); slab.position.y = -.101; roomG.add(slab);
  const wm = new THREE.MeshStandardMaterial({ color: st.wall, roughness: .9 });
  // väggar: [mitt x, mitt z, längd, rotation, normal in mot rummet, fönster [pos längs, bredd, bröstning, höjd]]
  for (const d of DEFS) {
    const g = new THREE.Group(); g.position.set(d.x, 0, d.z); g.rotation.y = d.ry; roomG.add(g);
    const piece = (a, b, y0, y1) => { if (b - a < .001 || y1 - y0 < .001) return; const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, y1 - y0, WT), wm); m.position.set((a + b) / 2, (y0 + y1) / 2, 0); m.castShadow = m.receiveShadow = true; g.add(m); };
    let a = -d.L / 2; const ws = [...d.win].sort((p, q) => p[0] - q[0]);
    // fönsterpositioner räknas från rummets mitt; på vägg med ry = π/2 är lokal x = -världens z
    for (const [c, w, sill, h] of ws) { piece(a, c - w / 2, 0, RH); piece(c - w / 2, c + w / 2, 0, sill); piece(c - w / 2, c + w / 2, sill + h, RH); a = c + w / 2;
      const s = s0(d);
      const fr = (w2, h2, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, .06), frameMat); m.position.set(x, y, z); m.castShadow = true; g.add(m); };
      const fz = -s * .02; fr(w, .06, c, sill + .03, fz); fr(w, .06, c, sill + h - .03, fz); fr(.06, h, c - w / 2 + .03, sill + h / 2, fz); fr(.06, h, c + w / 2 - .03, sill + h / 2, fz); fr(.05, h, c, sill + h / 2, fz);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(w - .1, h - .1), glassMat); gl.position.set(c, sill + h / 2, fz); g.add(gl); gl.userData.glass = 1;
      const sb = new THREE.Mesh(new THREE.BoxGeometry(w + .1, .025, .2), makeMat('marmor', '#eeeae4')); sb.position.set(c, sill, s * (WT / 2 + .03)); sb.castShadow = sb.receiveShadow = true; g.add(sb); }
    piece(a, d.L / 2, 0, RH);
    // golvlist
    const sk = new THREE.Mesh(new THREE.BoxGeometry(d.L - WT * 2, .07, .012), frameMat); sk.position.set(0, .035, s0(d) * (WT / 2 + .006)); g.add(sk);
    walls.push({ g, n: new THREE.Vector3(d.n[0], 0, d.n[1]), pos: new THREE.Vector3(d.x, 0, d.z) });
  }
}
const DEFS = [
  { x: 0, z: -RD / 2 - WT / 2, L: RW + WT * 2, ry: 0, n: [0, 1], win: [] },
  { x: 0, z: RD / 2 + WT / 2, L: RW + WT * 2, ry: 0, n: [0, -1], win: [[-1.4, 1.6, .5, 1.6]] },
  { x: -RW / 2 - WT / 2, z: 0, L: RD, ry: Math.PI / 2, n: [1, 0], win: [[-.4, 1.2, .8, 1.3]] },
  { x: RW / 2 + WT / 2, z: 0, L: RD, ry: Math.PI / 2, n: [-1, 0], win: [[-.9, 1.2, .8, 1.3]] },
];
// väggarna sedda inifrån rummet (för Elfa-verkstan): från vänster hörn till höger hörn, med fönster
function wallInfo() {
  return DEFS.map((d, i) => { const [nx, nz] = d.n, rx = nz, rz = -nx, len = d.ry ? RD : RW, cx = d.x + nx * WT / 2, cz = d.z + nz * WT / 2;
    const lx = Math.cos(d.ry), lz = -Math.sin(d.ry), sg = Math.sign(lx * rx + lz * rz) || 1;
    return { name: 'ABCD'[i], len, nx, nz, rx, rz, x1: cx - rx * len / 2, z1: cz - rz * len / 2, x2: cx + rx * len / 2, z2: cz + rz * len / 2,
      win: d.win.map(([c, w, sill, h]) => [len / 2 + sg * c - w / 2, w, sill, h]) }; });
}
function placeOnWall(it, wi, off, depthOut = 0) {
  const w = wallInfo()[wi]; it.rot = Math.atan2(w.nx, w.nz);
  const a = off + it.w / 2, n = depthOut + it.d / 2; it.x = w.x1 + w.rx * a + w.nx * n; it.z = w.z1 + w.rz * a + w.nz * n;
}
// närmaste vägg + läge längs den (när man öppnar verkstan för en möbel som redan står i rummet)
function nearestWall(it) { let best = [0, 0, 1e9]; wallInfo().forEach((w, i) => { const dx = it.x - w.x1, dz = it.z - w.z1, along = dx * w.rx + dz * w.rz, dist = dx * w.nx + dz * w.nz;
  if (dist > -.1 && dist < best[2]) best = [i, Math.max(0, along - it.w / 2), dist]; }); return best; }
function openStudio(it) {
  let wi = 0, off = null; if (it) { if (it.o.wall !== null && it.o.wall !== undefined) { wi = it.o.wall; off = it.o.off; } else [wi, off] = nearestWall(it); }
  openElfaStudio({ item: it, walls: wallInfo(), roomH: RH, startWall: wi, startOff: off, onDone: ({ o, m, wall, off: of2, doors }) => {
    let t = it && st.items.includes(it) ? it : null;
    if (!t) { t = addItem('elfa', { o, m }); } else { t.o = o; t.m = m; }
    t.o.wall = wall; t.o.off = of2; t.family = 'Elfa'; t.name = 'Elfa ' + ELFA_SYS[elfaSys(t.o)].name; t.preset = 'Egen uppställning';
    syncFurniture(t); placeOnWall(t, wall, of2); build(t);
    if (doors) { const W = wallInfo()[wall]; let dr = st.items.find(x => x.id === t.o.doors);
      if (!dr) { const p = PRESETS.find(q => q.name === 'Elfa skjutdörrar Artic Plain'); dr = addItem('skjutdorr', { o: p.o, m: p.m }); dr.family = p.family; dr.name = p.name; dr.preset = p.variant; t.o.doors = dr.id; }
      dr.w = W.len; dr.h = RH - .005; syncFurniture(dr); placeOnWall(dr, wall, 0, t.d + .04); build(dr); }
    save(); select(t); } });
}
const s0 = d => (d.ry ? d.n[0] : d.n[1]);   // vilken sida (lokal z) som är inne i rummet
function wallsFacing() { for (const w of walls) { const toCam = cam.position.clone().sub(w.pos); w.g.visible = toCam.dot(w.n) > -.2; } }

// ---------- möbler ----------
const topOf = it => it.type === 'kok' ? (it.o.bankH || .9) : (it.elev || 0) + it.h;
function footprint(it) { const c = Math.abs(Math.cos(it.rot)), s = Math.abs(Math.sin(it.rot)); return { ex: c * it.w / 2 + s * it.d / 2, ez: s * it.w / 2 + c * it.d / 2 }; }
function onTopElev(it, list = st.items) {
  if (!FURN[it.type].onTop) return 0; let best = 0;
  for (const o of list) { if (o === it || FURN[o.type].onTop || FURN[o.type].flat || FURN[o.type].ceil) continue;
    const dx = it.x - o.x, dz = it.z - o.z, c = Math.cos(-o.rot), s = Math.sin(-o.rot), lx = dx * c + dz * s, lz = -dx * s + dz * c;
    let hw = o.w / 2, hd = o.d / 2; if (o.type === 'soffa' || o.type === 'fatolj') continue;
    if (Math.abs(lx) < hw && Math.abs(lz) < hd) best = Math.max(best, topOf(o)); }
  return best;
}
function build(it) {
  const old = groups.get(it.id); if (old) { scene.remove(old); old.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isReflector) o.dispose(); }); }
  if (FURN[it.type].ceil) it.ceilH = RH;
  const g = buildFurniture(it); g.position.set(it.x, it.elev || 0, it.z); g.rotation.y = it.rot; g.userData.id = it.id;
  g.traverse(o => { o.userData.id = it.id; });
  scene.add(g); groups.set(it.id, g); applyLight(g);
}
function buildAll() { for (const g of groups.values()) scene.remove(g); groups.clear(); st.items.forEach(build); }
function place(it) { const g = groups.get(it.id); if (g) { g.position.set(it.x, it.elev || 0, it.z); g.rotation.y = it.rot; } }

// ---------- dag / kväll ----------
let envK = .45;
function applyLight(root) {
  const eve = mode === 'kvall';
  root.traverse(o => { if (o.material && 'envMapIntensity' in o.material) o.material.envMapIntensity = envK; });
  root.traverse(o => {
    if (o.isLight && o.userData.lamp) o.intensity = eve ? o.userData.power * (o.isSpotLight ? 40 : 7) : 0;
    if (o.material?.userData?.glow) o.material.emissiveIntensity = eve ? (o.material.userData.screen ? .0 : 2.2) : 0;
  });
}
function setMode(m) {
  mode = m; const eve = m === 'kvall';
  sun.intensity = eve ? 0 : 3.4; hemi.intensity = eve ? .01 : .25; envK = eve ? .04 : .45; renderer.toneMappingExposure = eve ? 1.1 : .95;
  scene.traverse(o => { if (o.material && 'envMapIntensity' in o.material) o.material.envMapIntensity = envK; });
  glassMat.emissive.set(eve ? '#0d1626' : '#d6e8f4'); glassMat.color.set(eve ? '#0d1626' : '#cfe2ee');
  scene.background.set(eve ? '#05070a' : '#0b0e0b');
  for (const g of groups.values()) applyLight(g);
  document.querySelectorAll('#light button').forEach(b => b.classList.toggle('on', b.dataset.l === m));
}

// ---------- välja & flytta ----------
const ray = new THREE.Raycaster(), mv = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let drag = null, down = null;
function rayAt(e) { const r = renderer.domElement.getBoundingClientRect(); mv.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mv, cam); }
function pick(e) { rayAt(e); const objs = [...groups.values()]; const hits = ray.intersectObjects(objs, true).filter(h => h.object.visible && !h.object.isLight);
  // mattor sist, så man kan välja det som står på dem
  hits.sort((a, b) => (FURN[byId(a.object.userData.id)?.type]?.flat ? 1 : 0) - (FURN[byId(b.object.userData.id)?.type]?.flat ? 1 : 0) || a.distance - b.distance);
  return hits[0] ? byId(hits[0].object.userData.id) : null; }
const byId = id => st.items.find(i => i.id === id);
renderer.domElement.addEventListener('pointerdown', e => {
  down = { x: e.clientX, y: e.clientY };
  const it = pick(e);
  if (it && it === sel) { rayAt(e); const p = new THREE.Vector3(); ray.ray.intersectPlane(floorPlane, p); drag = { it, dx: it.x - p.x, dz: it.z - p.z, moved: false }; controls.enabled = false; renderer.domElement.setPointerCapture(e.pointerId); }
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!drag) return; if (!drag.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) return; drag.moved = true;
  rayAt(e); const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(floorPlane, p)) return;
  const it = drag.it; it.x = p.x + drag.dx; it.z = p.z + drag.dz; clampSnap(it); it.elev = onTopElev(it);
  // det som står på möbeln följer med
  place(it); for (const o of st.items) if (FURN[o.type].onTop) { const e2 = onTopElev(o); if (e2 !== o.elev) { o.elev = e2; place(o); } }
});
renderer.domElement.addEventListener('pointerup', e => {
  const click = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5;
  if (drag) { controls.enabled = true; if (drag.moved) save(); drag = null; if (!click) return; }
  if (click) { const it = pick(e); select(it); }
  down = null;
});
function clampSnap(it) {
  const { ex, ez } = footprint(it), pad = .005;
  it.x = Math.max(-RW / 2 + ex + pad, Math.min(RW / 2 - ex - pad, it.x)); it.z = Math.max(-RD / 2 + ez + pad, Math.min(RD / 2 - ez - pad, it.z));
  // nära en vägg och baksidan mot den → dras in mot väggen
  const snap = .12, f = [Math.sin(it.rot), Math.cos(it.rot)];
  if (f[1] > .99 && it.z - ez < -RD / 2 + snap) it.z = -RD / 2 + ez + pad;
  if (f[1] < -.99 && it.z + ez > RD / 2 - snap) it.z = RD / 2 - ez - pad;
  if (f[0] > .99 && it.x - ex < -RW / 2 + snap) it.x = -RW / 2 + ex + pad;
  if (f[0] < -.99 && it.x + ex > RW / 2 - snap) it.x = RW / 2 - ex - pad;
}
function select(it) { sel = it || null; outline.selectedObjects = sel ? [groups.get(sel.id)].filter(Boolean) : []; panel(); $('#hint').style.display = sel ? 'none' : ''; }
addEventListener('keydown', e => {
  if (!sel || e.target.matches('input,select,textarea')) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { removeSel(); e.preventDefault(); }
  if (e.key === 'r' || e.key === 'R') rotate(e.shiftKey ? -Math.PI / 12 : Math.PI / 2);
  if (e.key === 'Escape') select(null);
});
function rotate(d) { sel.rot = ((sel.rot + d) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); clampSnap(sel); place(sel); save(); panel(); }
function removeSel() { const g = groups.get(sel.id); if (g) scene.remove(g); groups.delete(sel.id); st.items = st.items.filter(i => i !== sel); save(); select(null); }
function addItem(type, extra) {
  extra = extra ? JSON.parse(JSON.stringify(extra)) : undefined;
  const it = { ...newFurniture(type, extra), id: 'f' + Math.random().toString(36).slice(2, 8) };
  syncFurniture(it);
  const t = controls.target; it.x = t.x; it.z = t.z; it.rot = 0; clampSnap(it); it.elev = onTopElev(it);
  st.items.push(it); build(it); save(); select(it); return it;
}

// ---------- panelen ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const QUICK = ['9010', '9001', '1013', '1015', '7044', '7035', '7016', '7021', '9005', '6021', '5014', '3012', '8017', '1019'].map(c => ralFind(c));
function colorWidget(key, hex, pal) {
  const r = hex ? ralOf(hex) : null;
  const chips = (pal ? pal.map(h => ({ hex: h, name: h })) : QUICK).map(q => `<button style="background:${q.hex}" title="${esc(q.code ? q.code + ' ' + q.name : '')}" data-col="${key}" data-hex="${q.hex}" class="${hex && hex.toUpperCase() === q.hex.toUpperCase() ? 'on' : ''}"></button>`).join('');
  return `<div class="cw" data-cw="${key}"><div class="chips">${chips}</div>
    <div class="in"><input type="text" data-ral="${key}" placeholder="Skriv RAL-kod, t.ex. 7016" value="${r ? esc(r.code + ' ' + r.name) : ''}"><input type="color" data-col="${key}" value="${hex || '#cccccc'}"></div>
    <div class="sugg" data-sugg="${key}"></div><div class="now">${r ? '✓ ' + esc(r.code) + ' · ' + esc(r.name) : hex ? 'Egen färg ' + hex.toUpperCase() : 'Materialets egen färg'}</div></div>`;
}
const fmtNum = (op, v) => op.unit === 'm' ? Math.round(v * 100) + ' cm' : op.unit === '%' ? Math.round(v * 100) + ' %' : v;
const modsOp = () => FURN[sel.type].opts.find(x => x.t === 'mods'), modsOf = () => modsOp().mods || KMODS;
// Elfa: liten ritning + knapp till verkstan
function elfaField(op, it) {
  return `<div class="f"><label>${esc(ELFA_SYS[elfaSys(it.o)].name)} · ${it.o.mods.length} sektioner<b>${Math.round(it.w * 100)} cm</b></label>${elevationSvg(it.o, it.m, { cls: 'esvg' })}
    <button class="btn" data-act="studio" style="width:100%;padding:12px;font-size:14px;background:var(--acc);color:#1a0d05;border-color:var(--acc);font-weight:700">🛠 Öppna Elfa-verkstan</button></div>`;
}
function optField(op, it) {
  if (op.t === 'elfa') return elfaField(op, it);
  const v = it.o[op.k];
  if (op.t === 'sel') return `<div class="f"><label>${op.label}</label><div class="opt">${op.o.map(([val, l]) => `<button data-o="${op.k}" data-v="${esc(JSON.stringify(val))}" class="${v === val ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
  if (op.t === 'num') { if (op.info) return `<div class="info">🪑 Får plats: <b>${v}</b> personer (60 cm bordskant per person)</div>`;
    return `<div class="f"><label>${op.label}<b>${fmtNum(op, v)}</b></label><input type="range" data-o="${op.k}" data-num="1" min="${op.min}" max="${op.max}" step="${op.step}" value="${v}"></div>`; }
  if (op.t === 'bool') return `<div class="row" data-o="${op.k}" data-v="${!v}"><div class="l"><span>${op.label}</span></div><div class="sw ${v ? 'on' : ''}"></div></div>`;
  if (op.t === 'color') return `<div class="f"><label>${op.label}</label>${colorWidget('o:' + op.k, v, op.pal)}</div>`;
  if (op.t === 'mods') { const MD = op.mods || KMODS, WS = op.widths || KWIDTHS.map(w => [w, Math.round(w * 100) + ' cm']);
    return `<div class="f"><label>${op.label}<b>${Math.round(it.w * 100)} cm</b></label><div class="mods">${v.map((m, i) => `<div class="mod">
      <select data-mod="${i}" data-mk="t">${Object.entries(MD).map(([k, K]) => `<option value="${k}" ${k === m.t ? 'selected' : ''}>${K.icon} ${K.name}</option>`).join('')}</select>
      <select data-mod="${i}" data-mk="w">${WS.filter(([w]) => !MD[m.t]?.ws || MD[m.t].ws.includes(w)).map(([w, l]) => `<option value="${w}" ${Math.abs(w - m.w) < .001 ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button data-modmove="${i}" title="Flytta åt vänster">◀</button><button data-moddel="${i}" title="Ta bort">✕</button></div>`).join('')}</div>
      <div class="btns">${(op.add || [['lador', '＋ Lådor'], ['lucka', '＋ Skåp'], ['hogskap', '＋ Högskåp']]).map(([k, l]) => `<button class="btn" data-modadd="${k}">${l}</button>`).join('')}</div></div>`; }
  return '';
}
function panel() {
  const P = $('#panel');
  if (roomOpen && !sel) { P.innerHTML = `<h2>🎨 Väggar &amp; golv</h2>
    <div class="slot"><h4>Väggfärg</h4>${colorWidget('wall', st.wall)}</div>
    <div class="slot"><h4>Golv <em>${MATS[st.floor].name}</em></h4><div class="mats">${['ek', 'ljusek', 'valnot', 'bjork', 'furu', 'svartask', 'betong', 'marmor', 'terrazzo', 'granit'].map(id => `<button data-floor="${id}" class="${st.floor === id ? 'on' : ''}" title="${MATS[id].name}"><img src="${swatch(id)}">${MATS[id].name.split(/[ ,]/)[0]}</button>`).join('')}</div>${colorWidget('floor', st.floorColor)}</div>
    <div class="info">💡 RAL-koder visas ungefärligt på skärmen. Färgen kan skilja lite mot ett riktigt färgprov.</div>`; return; }
  if (!sel) { P.innerHTML = `<h2>🛋️ Möbelverkstan</h2><div class="info">Välj en möbel i rummet, eller lägg till en till vänster.<br><br>Alla mått är riktiga standardmått. Varje del kan få eget material och egen färg, också med <b>RAL-kod</b>.</div>
    <h3>I RUMMET</h3>${st.items.map(it => `<div class="row" data-pick="${it.id}"><div class="l"><span>${FURN[it.type].icon} ${it.name || FURN[it.type].name}</span><em>${Math.round(it.w * 100)}×${Math.round(it.d * 100)} cm</em></div><span>›</span></div>`).join('')}`; return; }
  const it = sel, F = FURN[it.type], dims = F.dims || {};
  const fam = it.family && FAMILIES[it.family];
  if (fam) {   // fast produkt: bara riktiga storlekar och färger
    const vars = variantsOf(it.family), okC = c => (!c.only || c.only.test(it.name || '')) && (!c.when || c.when(it.o));
    const groups = [...new Set(fam.choices.map(c => c.group || ''))].filter(g => !fam.groupIf?.[g] || fam.groupIf[g](it.o));
    const keyOf = g => Object.keys(fam.choices.find(c => (c.group || '') === g).m)[0];
    P.innerHTML = `<h2>${F.icon} ${esc(it.family)}</h2>
      <div class="info">📦 Riktig produkt. Här finns bara de storlekar och färger som går att köpa.</div>
      <div class="btns"><button class="btn" data-act="rotL">⟲ 90°</button><button class="btn" data-act="rotR">⟳ 90°</button><button class="btn" data-act="dup">⧉ Kopiera</button><button class="btn danger" data-act="del">🗑</button></div>
      <div class="f"><label>Vinkel<b>${Math.round(it.rot * 180 / Math.PI) % 360}°</b></label><input type="range" data-rot="1" min="0" max="355" step="5" value="${Math.round(it.rot * 180 / Math.PI) % 360}"></div>
      ${vars.length > 1 ? `<div class="f"><label>Modell</label><select data-variant="1">${vars.map(v => `<option ${v.variant === it.preset ? 'selected' : ''}>${esc(v.variant)}</option>`).join('')}</select></div>` : ''}
      <div class="f"><label>Mått<b>${Math.round(it.w * 100)} × ${Math.round((it.type === 'soffa' && it.o.form && it.o.form !== 'rak' ? it.o.d2 : it.d) * 100)} × ${Math.round(it.h * 100)} cm</b></label></div>
      ${(fam.dims || []).map(k => `<div class="f"><label>${{ w: 'Bredd', d: 'Djup', h: 'Höjd' }[k]}<b>${Math.round(it[k] * 100)} cm</b></label><input type="range" data-dim="${k}" min="${dims[k][0]}" max="${dims[k][1]}" step=".01" value="${it[k]}"></div>`).join('')}
      ${F.opts.filter(op => fam.opts?.includes(op.k) && (!op.if || op.if(it.o))).map(op => optField(op, it)).join('')}
      <h3>${fam.label.toUpperCase()}</h3>
      ${groups.map(g => { const k0 = keyOf(g), cur = it.m[k0]; return `<div class="slot">${g ? `<h4>${esc(g)}</h4>` : ''}<div class="fam">${fam.choices.map((c, i) => (c.group || '') !== g || !okC(c) ? '' :
        `<button data-choice="${i}" class="${cur && cur.mat === c.m[k0].mat && cur.color === c.m[k0].color ? 'on' : ''}" title="${esc(c.name)}"><img src="${swatch(c.m[k0].mat, c.m[k0].color)}"><span>${esc(g && c.name.startsWith(g.split(' ')[0] + ' ') ? c.name.slice(g.split(' ')[0].length + 1) : c.name)}</span></button>`).join('')}</div></div>`; }).join('')}
      ${(fam.fixed || []).map(([a, b]) => `<div class="f"><label>${a}<b>${esc(b)}</b></label></div>`).join('')}
      <button class="small" data-act="unlock">✏️ Gör om till egen möbel (fria mått och färger)</button>`;
    return;
  }
  const dimRow = (k, label) => dims[k] && !(F.fixed) ? `<div class="f"><label>${label}<b>${Math.round(it[k] * 100)} cm</b></label><input type="range" data-dim="${k}" min="${dims[k][0]}" max="${dims[k][1]}" step=".01" value="${it[k]}"></div>` : '';
  const slots = F.slots.map(([k, label, grp]) => { const s = it.m[k]; return `<div class="slot"><h4>${label}<em>${MATS[s.mat]?.name || ''}</em></h4>
    <div class="mats">${GROUPS[grp].map(id => `<button data-mat="${k}" data-id="${id}" class="${s.mat === id ? 'on' : ''}" title="${MATS[id].name}"><img src="${swatch(id, s.mat === id ? s.color : null)}">${MATS[id].name.split(/[ ,]/)[0]}</button>`).join('')}</div>
    ${colorWidget('m:' + k, s.color)}</div>`; }).join('');
  P.innerHTML = `<h2>${F.icon} ${it.name || F.name}</h2>
    ${it.preset ? `<div class="info">📦 Byggd efter måtten för <b>${esc(it.preset)}</b>. Allt går att ändra.</div>` : ''}
    <div class="btns"><button class="btn" data-act="rotL">⟲ 90°</button><button class="btn" data-act="rotR">⟳ 90°</button><button class="btn" data-act="dup">⧉ Kopiera</button><button class="btn danger" data-act="del">🗑</button></div>
    <div class="f"><label>Vinkel<b>${Math.round(it.rot * 180 / Math.PI) % 360}°</b></label><input type="range" data-rot="1" min="0" max="355" step="5" value="${Math.round(it.rot * 180 / Math.PI) % 360}"></div>
    ${dimRow('w', 'Bredd')}${dimRow('d', 'Djup')}${dimRow('h', 'Höjd')}
    ${F.opts.filter(op => !op.if || op.if(it.o)).map(op => optField(op, it)).join('')}
    ${slots ? '<h3>MATERIAL &amp; FÄRG</h3>' + slots : ''}`;
}
let roomOpen = false, rebuildT = 0;
function changed(full) {
  syncFurniture(sel); clampSnap(sel); sel.elev = onTopElev(sel);
  clearTimeout(rebuildT); rebuildT = setTimeout(() => { build(sel); for (const o of st.items) if (FURN[o.type].onTop) { o.elev = onTopElev(o); place(o); } outline.selectedObjects = [groups.get(sel.id)]; save(); }, 30);
  if (full !== false) panel();
}
function setColor(key, hex) {
  if (key === 'wall') { st.wall = hex; buildRoom(); save(); panel(); return; }
  if (key === 'floor') { st.floorColor = hex; buildRoom(); save(); panel(); return; }
  if (!sel) return;
  if (key.startsWith('m:')) sel.m[key.slice(2)].color = hex; else sel.o[key.slice(2)] = hex;
  changed();
}
const P = $('#panel');
P.addEventListener('click', e => {
  const b = e.target.closest('[data-choice],[data-o],[data-mat],[data-act],[data-col],[data-pick],[data-floor],[data-modadd],[data-moddel],[data-modmove],[data-sugg] button');
  if (!b || b.matches('input')) return;
  if (b.dataset.pick) { select(byId(b.dataset.pick)); return; }
  if (b.dataset.floor) { st.floor = b.dataset.floor; st.floorColor = null; buildRoom(); save(); panel(); return; }
  if (b.dataset.hexpick) { setColor(b.dataset.key, b.dataset.hexpick); return; }
  if (b.dataset.col && b.dataset.hex) { setColor(b.dataset.col, b.dataset.hex); return; }
  if (!sel) return;
  if (b.dataset.choice) { const c = FAMILIES[sel.family].choices[+b.dataset.choice]; for (const [k, v] of Object.entries(c.m)) sel.m[k] = { ...v }; changed(); return; }
  if (b.dataset.o) { const op = FURN[sel.type].opts.find(x => x.k === b.dataset.o); sel.o[op.k] = op.t === 'bool' ? !sel.o[op.k] : JSON.parse(b.dataset.v); changed(); }
  if (b.dataset.mat) { sel.m[b.dataset.mat] = { mat: b.dataset.id, color: null }; changed(); }
  if (b.dataset.modadd) { sel.o.mods.push({ t: b.dataset.modadd, w: modsOf()[b.dataset.modadd].w }); changed(); }
  if (b.dataset.moddel) { sel.o.mods.splice(+b.dataset.moddel, 1); if (!sel.o.mods.length) { const [k, K] = Object.entries(modsOf())[0]; sel.o.mods.push({ t: k, w: K.w }); } changed(); }
  if (b.dataset.modmove) { const i = +b.dataset.modmove; if (i > 0) { const m = sel.o.mods; [m[i - 1], m[i]] = [m[i], m[i - 1]]; changed(); } }
  const a = b.dataset.act;
  if (a === 'studio') { openStudio(sel); return; }
  if (a === 'unlock') { delete sel.family; sel.preset = null; changed(); return; }
  if (a === 'rotL') rotate(Math.PI / 2); if (a === 'rotR') rotate(-Math.PI / 2); if (a === 'del') removeSel();
  if (a === 'dup') { const c = JSON.parse(JSON.stringify(sel)); c.id = 'f' + Math.random().toString(36).slice(2, 8); c.x += .3; c.z += .3; c.seed = (c.seed || 1) + 11; clampSnap(c); st.items.push(c); build(c); save(); select(c); }
});
P.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.dim) { sel[t.dataset.dim] = +t.value; t.previousElementSibling.querySelector('b').textContent = Math.round(t.value * 100) + ' cm'; changed(false); }
  if (t.dataset.rot) { sel.rot = +t.value * Math.PI / 180; t.previousElementSibling.querySelector('b').textContent = t.value + '°'; clampSnap(sel); place(sel); save(); }
  if (t.dataset.o && t.dataset.num) { const op = FURN[sel.type].opts.find(x => x.k === t.dataset.o); sel.o[op.k] = +t.value;
    t.previousElementSibling.querySelector('b').textContent = fmtNum(op, +t.value); changed(false); }
  if (t.type === 'color' && t.dataset.col) { clearTimeout(t._t); t._t = setTimeout(() => setColor(t.dataset.col, t.value), 60); }
  if (t.dataset.ral) { const key = t.dataset.ral, box = P.querySelector(`[data-sugg="${CSS.escape(key)}"]`), q = t.value;
    const exact = ralFind(q.replace(/[^\d]/g, '').slice(0, 4)); const list = ralSearch(q);
    box.innerHTML = list.map(r => `<button data-hexpick="${r.hex}" data-key="${esc(key)}"><i style="background:${r.hex}"></i><b>${r.code}</b> ${esc(r.name)}</button>`).join('') || (q.length > 1 ? '<div class="now">Ingen RAL-kulör hittades</div>' : '');
    if (exact && /^\s*(ral)?\s*\d{4}\s*$/i.test(q)) setColorSoft(key, exact.hex, box); }
});
P.addEventListener('change', e => {
  const t = e.target; if (!sel) return;
  if (t.dataset.mod !== undefined) { const m = sel.o.mods[+t.dataset.mod]; if (t.dataset.mk === 't') { const K = modsOf()[t.value]; m.t = t.value; if (!K.ws || !K.ws.includes(m.w)) m.w = K.w; } else m.w = +t.value; changed(); }
  if (t.dataset.dim || t.dataset.num) panel();
  if (t.dataset.variant) { const v = variantsOf(sel.family).find(x => x.variant === t.value); if (v && v.type === sel.type) {
    sel.o = JSON.parse(JSON.stringify({ ...sel.o, ...v.o })); sel.preset = v.variant; sel.name = v.name; syncFurniture(sel); if (v.size) Object.assign(sel, v.size); changed(); } }
});
P.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.ral) { const b = P.querySelector(`[data-sugg="${CSS.escape(e.target.dataset.ral)}"] button`); if (b) b.click(); } });
// skriver man en hel RAL-kod byts färgen direkt men panelen ritas inte om (så man kan fortsätta skriva)
function setColorSoft(key, hex, box) {
  if (key === 'wall') { st.wall = hex; buildRoom(); save(); }
  else if (key === 'floor') { st.floorColor = hex; buildRoom(); save(); }
  else if (sel) { if (key.startsWith('m:')) sel.m[key.slice(2)].color = hex; else sel.o[key.slice(2)] = hex; changed(false); }
  const r = ralOf(hex); const now = box.parentElement.querySelector('.now'); if (now && r) now.textContent = '✓ ' + r.code + ' · ' + r.name;
}

// ---------- sidomeny ----------
$('#cat').innerHTML = Object.entries(FURN).filter(([k]) => !['platsbyggt', 'innertak'].includes(k)).map(([k, F]) => `<button data-add="${k}"><b>${F.icon}</b>${F.name.split(' ')[0]}</button>`).join('');
$('#cat').addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (!b) return; roomOpen = false; if (b.dataset.add === 'elfa') return openStudio(null); addItem(b.dataset.add); });
$('#roomBtn').onclick = () => { roomOpen = true; select(null); };
$('#reset').onclick = () => { if (!confirm('Börja om demorummet? Dina ändringar här försvinner.')) return; st = fresh(); buildRoom(); buildAll(); save(); select(null); };
document.querySelectorAll('#light button').forEach(b => b.onclick = () => setMode(b.dataset.l));
$('#photo').onclick = () => {
  const r = renderer.getPixelRatio(); outline.selectedObjects = []; renderer.setPixelRatio(2); resize(); composer.render();
  const a = document.createElement('a'); a.download = 'hemma-rum.png'; a.href = renderer.domElement.toDataURL('image/png'); a.click();
  renderer.setPixelRatio(r); resize(); select(sel); toast('📸 Bilden sparades');
};
// snabbsök: "billy 80" m.m.
const search = $('#search'), res = $('#searchRes');
if (search) {
  search.addEventListener('input', () => { const list = findPreset(search.value); res.innerHTML = list.map((p, i) => `<button data-pre="${i}"><b>${FURN[p.type].icon}</b><span>${esc(p.label)}<em>${esc(p.dims)}</em></span></button>`).join(''); res._list = list; });
  search.addEventListener('keydown', e => { if (e.key === 'Enter') res.querySelector('button')?.click(); });
  res.addEventListener('click', e => { const b = e.target.closest('[data-pre]'); if (!b) return; const p = res._list[+b.dataset.pre]; roomOpen = false;
    const it = addItem(p.type, { o: p.o, m: p.m }); Object.assign(it, p.size || {}); it.preset = p.variant || p.label; it.name = p.name; if (p.family) it.family = p.family; syncFurniture(it); if (p.size) Object.assign(it, p.size); clampSnap(it); build(it); save(); select(it);
    search.value = ''; res.innerHTML = ''; });
}
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 1800); }

// ---------- gång ----------
function resize() { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h); composer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(host);
st = load() || fresh();
buildRoom(); buildAll(); setMode('dag'); resize(); panel();
renderer.setAnimationLoop(() => { controls.update(); wallsFacing(); composer.render(); });
window.__demo = { buildAll, get st() { return st; }, scene, cam, controls, select, setMode, addItem, get sel() { return sel; }, byId, resize };
