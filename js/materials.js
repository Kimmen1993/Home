// Materialbiblioteket: riktiga ytor (trä, tyg, sammet, läder, marmor, metall, glas …).
// Texturerna ritas i kod (inga bildfiler) och skalas i meter, så ådring och väv får rätt storlek.
import * as THREE from 'three';

// kind styr hur ytan ritas och hur ljuset beter sig. color = standardfärg (kan bytas, även med RAL-kod).
export const MATS = {
  ek:        { name: 'Ek',             group: 'tra',    kind: 'wood',    color: '#c39a6b' },
  ljusek:    { name: 'Vitpigmenterad ek', group: 'tra', kind: 'wood',    color: '#ddc7a8' },
  valnot:    { name: 'Valnöt',         group: 'tra',    kind: 'wood',    color: '#6e4b33' },
  bjork:     { name: 'Björk',          group: 'tra',    kind: 'wood',    color: '#e3c8a0' },
  svartask:  { name: 'Svartbetsad ask', group: 'tra',   kind: 'wood',    color: '#2e2925' },
  furu:      { name: 'Furu',           group: 'tra',    kind: 'pine',    color: '#dcb37a' },
  matt:      { name: 'Målad, matt',    group: 'farg',   kind: 'paint',   color: '#efece6' },
  lack:      { name: 'Högblank lack',  group: 'farg',   kind: 'lacquer', color: '#f2f0ea' },
  laminat:   { name: 'Laminat',        group: 'farg',   kind: 'laminate', color: '#e9e6df' },
  tyg:       { name: 'Vävt tyg',       group: 'textil', kind: 'fabric',  color: '#8b8f86' },
  linne:     { name: 'Linne',          group: 'textil', kind: 'linen',   color: '#d9d2c4' },
  sammet:    { name: 'Sammet',         group: 'textil', kind: 'velvet',  color: '#3f5a4c' },
  boucle:    { name: 'Bouclé',         group: 'textil', kind: 'boucle',  color: '#ebe5da' },
  lader:     { name: 'Läder',          group: 'textil', kind: 'leather', color: '#7a4a2c' },
  marmor:    { name: 'Marmor',         group: 'sten',   kind: 'marble',  color: '#eeebe6' },
  granit:    { name: 'Granit',         group: 'sten',   kind: 'granite', color: '#3b3b3d' },
  terrazzo:  { name: 'Terrazzo',       group: 'sten',   kind: 'terrazzo', color: '#e6e1d8' },
  betong:    { name: 'Betong',         group: 'sten',   kind: 'concrete', color: '#a8a6a1' },
  rostfritt: { name: 'Borstat stål',   group: 'metall', kind: 'brushed', color: '#c9cbcd' },
  krom:      { name: 'Krom',           group: 'metall', kind: 'chrome',  color: '#e8e9eb' },
  svartmetall:{ name: 'Svart metall',  group: 'metall', kind: 'blackmetal', color: '#232323' },
  massing:   { name: 'Mässing',        group: 'metall', kind: 'brass',   color: '#c19a56' },
  koppar:    { name: 'Koppar',         group: 'metall', kind: 'brass',   color: '#b87150' },
  glas:      { name: 'Glas',           group: 'glas',   kind: 'glass',   color: '#f4f8f8' },
  rokglas:   { name: 'Rökfärgat glas', group: 'glas',   kind: 'glass',   color: '#5b5650' },
  opalglas:  { name: 'Opalglas',       group: 'glas',   kind: 'opal',    color: '#f6f3ec' },
  frostat:   { name: 'Frostat glas',   group: 'glas',   kind: 'frosted', color: '#eef1ef' },
  spegel:    { name: 'Spegel',         group: 'glas',   kind: 'mirror',  color: '#e9eef0' },
  pulver:    { name: 'Pulverlackerad metall', group: 'metall', kind: 'powder', color: '#f2f2f0' },
  keramik:   { name: 'Keramik/porslin', group: 'sten',  kind: 'ceramic', color: '#f5f4f0' },
  kakel:     { name: 'Kakel (tunnelbana)', group: 'sten', kind: 'tiles', color: '#f4f3ef' },
  kakelkv:   { name: 'Kakel 10×10',    group: 'sten',   kind: 'tilesq', color: '#e9ece8' },
  ull:       { name: 'Ull, kort lugg', group: 'matta',  kind: 'wool',    color: '#cfc5b3' },
  ryamatta:  { name: 'Ryamatta',       group: 'matta',  kind: 'shag',    color: '#e3dccd' },
  jute:      { name: 'Jute',           group: 'matta',  kind: 'jute',    color: '#b39a73' },
  rotting:   { name: 'Rotting',        group: 'tra',    kind: 'rattan',  color: '#c8a26e' },
};
// grupper som en del av en möbel får välja mellan
export const GROUPS = {
  textil: ['tyg', 'linne', 'sammet', 'boucle', 'lader'],
  tra: ['ek', 'ljusek', 'valnot', 'bjork', 'furu', 'svartask'],
  front: ['matt', 'lack', 'laminat', 'ek', 'ljusek', 'valnot', 'svartask', 'spegel', 'frostat'],
  stomme: ['ek', 'ljusek', 'valnot', 'bjork', 'furu', 'svartask', 'matt', 'lack'],
  ben: ['ek', 'valnot', 'svartask', 'svartmetall', 'massing', 'krom', 'rostfritt'],
  metall: ['svartmetall', 'massing', 'krom', 'rostfritt', 'koppar', 'pulver'],
  skiva: ['ek', 'ljusek', 'valnot', 'svartask', 'marmor', 'granit', 'terrazzo', 'betong', 'laminat', 'rostfritt', 'glas', 'rokglas'],
  bank: ['laminat', 'ek', 'valnot', 'marmor', 'granit', 'terrazzo', 'betong', 'rostfritt'],
  stank: ['kakel', 'kakelkv', 'keramik', 'marmor', 'granit', 'terrazzo', 'glas', 'rostfritt', 'matt'],
  skarm: ['linne', 'tyg', 'opalglas', 'svartmetall', 'massing', 'matt', 'rotting'],
  kruka: ['keramik', 'betong', 'terrazzo', 'rotting', 'svartmetall', 'matt'],
  matta: ['ull', 'ryamatta', 'jute'],
  vagg: ['matt'],
};
// hur stor yta (meter) en textur täcker
const TILE = { wood: .9, pine: .9, fabric: .12, linen: .15, velvet: .5, boucle: .1, leather: .25, marble: 1.2, granite: .5, terrazzo: .5, concrete: 1.2, brushed: .4, wool: .3, shag: .3, jute: .2, rattan: .12, paint: 1, lacquer: 1, laminate: 1, chrome: 1, blackmetal: .5, brass: .4, glass: 1, opal: 1, ceramic: 1, tiles: .6, tilesq: .4 };

// ---------- brus ----------
function makeNoise(seed = 1) {
  const p = new Uint8Array(512); let s = seed * 9301 + 49297;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const base = [...Array(256).keys()].sort(() => r() - .5); for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  const g = (h) => (p[h] / 255) * 2 - 1;
  const f = t => t * t * (3 - 2 * t);
  // periodisk värdebrus (period P) så texturen kan upprepas utan skarvar
  function n(x, y, P) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const X0 = ((xi % P) + P) % P, Y0 = ((yi % P) + P) % P, X1 = (X0 + 1) % P, Y1 = (Y0 + 1) % P;
    const a = g(p[X0] + Y0), b = g(p[X1] + Y0), c = g(p[X0] + Y1), d = g(p[X1] + Y1), u = f(xf), v = f(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, y, P, oct = 4) { let a = 0, amp = .5, fr = 1; for (let i = 0; i < oct; i++) { a += amp * n(x * fr, y * fr, P * fr); amp *= .5; fr *= 2; } return a; }
  return { n, fbm, r };
}

// ritar detaljtextur (gråskala) + höjd (bump) + grovhet. Färgen läggs på i materialet.
const cache = new Map();
function detail(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const N = 512, col = new Uint8ClampedArray(N * N * 4), bmp = new Uint8ClampedArray(N * N * 4), rgh = new Uint8ClampedArray(N * N * 4);
  const { fbm, n, r } = makeNoise(kind.length * 31 + 7);
  let has = { bump: true, rough: false };
  const put = (i, c, b, ro = 128, tint) => { const k = i * 4;
    if (tint) { col[k] = tint[0]; col[k + 1] = tint[1]; col[k + 2] = tint[2]; } else col[k] = col[k + 1] = col[k + 2] = c;
    col[k + 3] = 255; bmp[k] = bmp[k + 1] = bmp[k + 2] = b; bmp[k + 3] = 255; rgh[k] = rgh[k + 1] = rgh[k + 2] = ro; rgh[k + 3] = 255; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, i = y * N + x;
    if (kind === 'wood' || kind === 'pine') {
      // ådring längs u: ringar som störs av brus
      const w = fbm(u * 3, v * 24, 3, 4) * (kind === 'pine' ? 2.2 : 1.4);
      const ring = (v * (kind === 'pine' ? 14 : 22) + w * 3 + fbm(u * 1, v * 2, 1, 2) * 2) % 1;
      const line = Math.pow(Math.abs(Math.sin(ring * Math.PI)), kind === 'pine' ? 6 : 10);
      const pore = (n(u * 200, v * 1400, 200) > .55) ? .9 : 1;
      const c = (0.80 + 0.2 * (1 - line) + fbm(u * 8, v * 40, 8, 3) * .08) * pore;
      put(i, Math.min(255, c * 255), 128 + (1 - line) * 30 - (pore < 1 ? 40 : 0), 150 + line * 40); has.rough = true;
    } else if (kind === 'fabric' || kind === 'linen') {
      const k = kind === 'linen' ? 48 : 64, a = Math.sin(u * k * Math.PI * 2), b = Math.sin(v * k * Math.PI * 2);
      const weave = ((Math.floor(u * k * 2) + Math.floor(v * k * 2)) % 2 ? a : b) * .5 + .5;
      const slub = kind === 'linen' ? fbm(u * 4, v * 64, 4, 3) * .25 : fbm(u * 8, v * 8, 8, 3) * .08;
      const c = .82 + weave * .12 + slub;
      put(i, c * 255, 90 + weave * 120 + slub * 100);
    } else if (kind === 'boucle') {
      const t = Math.abs(fbm(u * 40, v * 40, 40, 3)); const c = .8 + (1 - t) * .2;
      put(i, c * 255, (1 - t) * 255);
    } else if (kind === 'velvet') {
      const c = .9 + fbm(u * 6, v * 6, 6, 4) * .12; put(i, c * 255, 128 + fbm(u * 60, v * 60, 60, 2) * 30);
    } else if (kind === 'leather') {
      const t = Math.abs(fbm(u * 30, v * 30, 30, 3)), m = fbm(u * 3, v * 3, 3, 3);
      put(i, (.86 + m * .12 + t * .08) * 255, 200 - Math.pow(1 - t, 8) * 160, 120 + t * 80); has.rough = true;
    } else if (kind === 'marble') {
      const t = fbm(u * 2, v * 2, 2, 5) * 6, vein = Math.pow(1 - Math.abs(Math.sin((u * 3 + v * 1.5 + t) * Math.PI)), 18);
      const fine = Math.pow(1 - Math.abs(Math.sin((u * 7 - v * 4 + t * 1.7) * Math.PI)), 40);
      const c = .97 - vein * .45 - fine * .2 + fbm(u * 10, v * 10, 10, 2) * .03; put(i, c * 255, 128, 40 + vein * 40); has.bump = false; has.rough = true;
    } else if (kind === 'granite' || kind === 'terrazzo') {
      const s = kind === 'granite' ? 140 : 40, t = n(u * s, v * s, s), q = n(u * s * 1.7 + 9, v * s * 1.7, Math.round(s * 1.7));
      let c = .95 + fbm(u * 8, v * 8, 8, 2) * .05, tint = null;
      if (kind === 'granite') c = t > .45 ? 1.6 : t < -.45 ? .55 : .95 + q * .1;
      else if (t > .5) tint = [190, 120, 90]; else if (q > .55) tint = [90, 90, 92]; else if (t < -.6) tint = [255, 255, 255];
      put(i, Math.min(255, c * 160), 128, 60, tint); has.bump = false; has.rough = true;
    } else if (kind === 'concrete') {
      const m = fbm(u * 6, v * 6, 6, 5), pore = n(u * 300, v * 300, 300) > .7;
      put(i, (.88 + m * .14 - (pore ? .15 : 0)) * 255, pore ? 60 : 128 + m * 40, 200 + m * 40); has.rough = true;
    } else if (kind === 'brushed' || kind === 'brass' || kind === 'blackmetal') {
      const s = fbm(u * 2, v * 260, 2, 3); put(i, (.94 + s * .06) * 255, 128 + s * 20, 90 + s * 60); has.rough = true;
    } else if (kind === 'wool' || kind === 'shag' || kind === 'jute') {
      if (kind === 'jute') { const k = 26, a = Math.sin(u * k * Math.PI * 2) * .5 + .5, b = Math.sin(v * k * Math.PI * 2) * .5 + .5;
        const w = (Math.floor(u * k) + Math.floor(v * k)) % 2 ? a : b; put(i, (.75 + w * .25 + fbm(u * 30, v * 30, 30, 2) * .1) * 255, w * 255); }
      else { const t = fbm(u * (kind === 'shag' ? 50 : 90), v * (kind === 'shag' ? 50 : 90), kind === 'shag' ? 50 : 90, 3);
        put(i, (.82 + t * .3) * 255, 128 + t * 200); }
    } else if (kind === 'rattan') {
      const k = 18, a = Math.abs(Math.sin(u * k * Math.PI)), b = Math.abs(Math.sin(v * k * Math.PI));
      const over = (Math.floor(u * k) + Math.floor(v * k)) % 2 ? a : b, gap = Math.min(a, b) < .12 && Math.max(a, b) < .5;
      put(i, gap ? 40 : (.75 + over * .25) * 255, gap ? 0 : over * 255);
    } else if (kind === 'tiles' || kind === 'tilesq') {
      const rows = kind === 'tiles' ? 8 : 4, cols = 4, row = Math.floor(v * rows), uu = (u * cols + (kind === 'tiles' && row % 2 ? .5 : 0)) % 1, vv = (v * rows) % 1;
      const e = Math.min(uu, 1 - uu) * (kind === 'tiles' ? 1 : 1), f = Math.min(vv, 1 - vv) * (kind === 'tiles' ? .5 : 1), d = Math.min(e, f);
      const grout = d < .012, bevel = Math.min(1, d / .04);
      put(i, grout ? 200 : (.94 + bevel * .06 + fbm(u * 8, v * 8, 8, 2) * .02) * 255, grout ? 30 : 140 + bevel * 115, grout ? 230 : 30); has.rough = true;
    } else { put(i, 255, 128); has.bump = false; }
  }
  const tex = (data, srgb) => { const c = document.createElement('canvas'); c.width = c.height = N; c.getContext('2d').putImageData(new ImageData(data, N, N), 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.userData.canvas = c; return t; };
  const out = { map: tex(col, true), bump: has.bump ? tex(bmp) : null, rough: has.rough ? tex(rgh) : null };
  cache.set(kind, out); return out;
}

// liten förhandsbild (för materialknapparna)
export function swatch(id, color) {
  const m = MATS[id]; const d = detail(m.kind).map.userData.canvas;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = color || m.color; g.fillRect(0, 0, 64, 64); g.globalCompositeOperation = 'multiply'; g.drawImage(d, 0, 0, 160, 160, 0, 0, 64, 64);
  g.globalCompositeOperation = 'source-over';
  const sh = g.createLinearGradient(0, 0, 64, 64), k = m.kind;
  const gloss = ['mirror', 'lacquer', 'chrome', 'brass', 'marble', 'ceramic', 'glass', 'leather', 'brushed', 'velvet'].includes(k);
  sh.addColorStop(0, `rgba(255,255,255,${gloss ? .45 : .12})`); sh.addColorStop(.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.25)');
  g.fillStyle = sh; g.fillRect(0, 0, 64, 64); return c.toDataURL();
}

const matCache = new Map();
export function makeMat(id, color) {
  const m = MATS[id] || MATS.matt; color = color || m.color; const key = id + color;
  if (matCache.has(key)) return matCache.get(key);
  const k = m.kind, c = new THREE.Color(color), P = { color: c, roughness: .8, metalness: 0 };
  const det = detail(k), rep = 1 / (TILE[k] || 1);
  const useTex = !['paint', 'lacquer', 'laminate', 'chrome', 'glass', 'opal', 'ceramic', 'mirror', 'frosted', 'powder'].includes(k);
  if (useTex) { P.map = det.map.clone(); P.map.repeat.set(rep, rep); P.map.needsUpdate = true;
    if (det.bump) { P.bumpMap = det.bump.clone(); P.bumpMap.repeat.set(rep, rep); P.bumpMap.needsUpdate = true; }
    if (det.rough) { P.roughnessMap = det.rough.clone(); P.roughnessMap.repeat.set(rep, rep); P.roughnessMap.needsUpdate = true; } }
  const bs = { tiles: 2, tilesq: 2, wood: 1, pine: 1, fabric: .5, linen: 2, boucle: 4, velvet: .5, leather: 1, concrete: 1.5, brushed: .3, brass: .3, blackmetal: .3, wool: 3, shag: 6, jute: 4, rattan: 4 }[k] || 1;
  P.bumpScale = bs;
  Object.assign(P, {
    wood: { roughness: .62, clearcoat: .15, clearcoatRoughness: .5 },
    pine: { roughness: .7 },
    paint: { roughness: .82 },
    lacquer: { roughness: .25, clearcoat: 1, clearcoatRoughness: .08 },
    laminate: { roughness: .5 },
    fabric: { roughness: 1, sheen: .6, sheenRoughness: .8, sheenColor: c.clone().lerp(new THREE.Color('#fff'), .3) },
    linen: { roughness: 1, sheen: .5, sheenRoughness: .9, sheenColor: c.clone().lerp(new THREE.Color('#fff'), .3) },
    boucle: { roughness: 1, sheen: .7, sheenRoughness: 1, sheenColor: c.clone().lerp(new THREE.Color('#fff'), .4) },
    velvet: { roughness: .9, sheen: 1, sheenRoughness: .35, sheenColor: c.clone().lerp(new THREE.Color('#fff'), .45) },
    leather: { roughness: .55, clearcoat: .35, clearcoatRoughness: .45 },
    marble: { roughness: .18, clearcoat: .7, clearcoatRoughness: .1 },
    granite: { roughness: .25, clearcoat: .6, clearcoatRoughness: .1 },
    terrazzo: { roughness: .35, clearcoat: .4 },
    concrete: { roughness: .9 },
    brushed: { metalness: 1, roughness: .38 },
    chrome: { metalness: 1, roughness: .06 },
    blackmetal: { metalness: .7, roughness: .5 },
    brass: { metalness: 1, roughness: .3 },
    glass: { roughness: .04, transmission: 1, thickness: .01, ior: 1.5, transparent: true, opacity: 1 },
    opal: { roughness: .35, transmission: .6, thickness: .02, transparent: true },
    mirror: { metalness: 1, roughness: .02 },
    frosted: { roughness: .55, clearcoat: .7, clearcoatRoughness: .04 },
    powder: { roughness: .42, metalness: .3, clearcoat: .25, clearcoatRoughness: .4 },
    ceramic: { roughness: .1, clearcoat: .8, clearcoatRoughness: .05 },
    tiles: { roughness: .2, clearcoat: .6, clearcoatRoughness: .1 },
    tilesq: { roughness: .2, clearcoat: .6, clearcoatRoughness: .1 },
    wool: { roughness: 1, sheen: .5, sheenRoughness: .9, sheenColor: c.clone().lerp(new THREE.Color('#fff'), .3) },
    shag: { roughness: 1, sheen: .8, sheenRoughness: 1, sheenColor: c.clone().lerp(new THREE.Color('#fff'), .3) },
    jute: { roughness: 1 },
    rattan: { roughness: .8 },
  }[k] || {});
  const mat = new THREE.MeshPhysicalMaterial(P);
  if (k === 'glass') { mat.side = THREE.DoubleSide; }
  if (k === 'mirror') mat.userData.mirror = color;   // möblerna lägger en riktig spegelyta framför
  matCache.set(key, mat); return mat;
}

// UV i meter (efter ytans riktning) så att ådring och väv får verklig storlek på alla delar.
export function worldUV(geo, vertical = false) {
  const pos = geo.attributes.position, nor = geo.attributes.normal; if (!nor) geo.computeVertexNormals();
  const N = geo.attributes.normal, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i));
    let u, v; if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = vertical ? y : z; v = vertical ? z : y; } else { u = vertical ? y : x; v = vertical ? x : y; }
    uv[i * 2] = u; uv[i * 2 + 1] = v; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
}
