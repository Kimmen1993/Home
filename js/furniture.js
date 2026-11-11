// Möbelmotorn: varje möbel byggs av riktiga mått och val (sitsar, luckor, ben, material …).
// Lokala koordinater: x = bredd, z = djup (+z = framsida, baksidan mot väggen), y = upp, origo mitt på golvet.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeMat, worldUV, MATS } from './materials.js?v=1794407677';

// ---------- byggklossar ----------
let G = null;   // gruppen som byggs just nu
function add(geo, mat, x, y, z, vertical) { worldUV(geo, vertical); const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; G.add(m); return m; }
// låda med botten på y. r = rundade kanter.
function box(w, h, d, mat, x, y, z, r = 0, soft = 0) {
  w = Math.max(w, .002); h = Math.max(h, .002); d = Math.max(d, .002);
  let geo; const rr = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  if (rr > .001) { geo = new RoundedBoxGeometry(w, h, d, soft ? 4 : 2, rr); } else geo = new THREE.BoxGeometry(w, h, d);
  if (soft) geo = puff(geo, w, h, d, soft);
  return add(geo, mat, x, y + h / 2, z, h > Math.max(w, d) * 1.2);
}
// mjuk kudde: buktar ut på mitten
function puff(geo, w, h, d, amt) {
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo = mergeVertices(geo);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const fx = Math.max(0, 1 - (x / (w / 2)) ** 2), fz = Math.max(0, 1 - (z / (d / 2)) ** 2), fy = Math.max(0, 1 - (y / (h / 2)) ** 2);
    p.setY(i, y + Math.sign(y) * amt * fx * fz); p.setX(i, x + Math.sign(x) * amt * .25 * fy * fz); p.setZ(i, z + Math.sign(z) * amt * .25 * fy * fx); }
  geo.computeVertexNormals(); return geo;
}
function cyl(rt, rb, h, mat, x, y, z, seg = 24, open = false) { return add(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat, x, y + h / 2, z, true); }
function sphere(r, mat, x, y, z) { return add(new THREE.SphereGeometry(r, 28, 18), mat, x, y, z); }
function lathe(pts, mat, x, y, z, seg = 40) { const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg); const m = add(g, mat, x, y, z, true); m.material = mat; return m; }
function tube(points, r, mat) { const c = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))); return add(new THREE.TubeGeometry(c, 48, r, 12), mat, 0, 0, 0); }
function sub(x = 0, y = 0, z = 0, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; G.add(g); return g; }
function into(g, fn) { const prev = G; G = g; fn(); G = prev; }
const twoS = new WeakMap();
function ds(m) { let c = twoS.get(m); if (!c) { c = m.clone(); c.side = THREE.DoubleSide; twoS.set(m, c); } return c; }
const dark = () => makeMat('matt', '#141414');
const glow = (color, o = {}) => { const m = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0, roughness: .5, ...o }); m.userData.glow = 1; return m; };

// ---------- handtag & fronter (kök, garderob, tv-bänk) ----------
function handle(style, mat, x, y, z, vertical, len = .16) {
  if (style === 'inga' || style === 'greppfri') return;
  if (style === 'knopp') { const m = cyl(.013, .011, .028, mat, 0, 0, 0, 20); m.rotation.x = Math.PI / 2; m.position.set(x, y, z + .014); return; }
  if (style === 'list') { box(vertical ? .016 : len, vertical ? len : .016, .022, mat, x, y - (vertical ? len / 2 : .008), z + .011, .003); return; }
  if (style === 'lader') { const m = box(vertical ? .03 : len * .7, vertical ? len * .7 : .03, .006, makeMat('lader', '#5a3a24'), x, y - (vertical ? len * .35 : .015), z + .003, .002); return m; }
  // bygelhandtag
  const r = .0065, bar = cyl(r, r, len, mat, 0, 0, 0, 16); if (vertical) bar.position.set(x, y, z + .032); else { bar.rotation.z = Math.PI / 2; bar.position.set(x, y, z + .032); }
  for (const s of [-1, 1]) { const st = cyl(r * .8, r * .8, .03, mat, 0, 0, 0, 12); st.rotation.x = Math.PI / 2; st.position.set(x + (vertical ? 0 : s * len * .42), y + (vertical ? s * len * .42 : 0), z + .016); }
}
// en front (lucka/låda). x,y = nedre vänstra hörnet? nej: x = mitt, y = botten. z = baksidan av fronten.
function front(st, mat, w, h, x, y, z, grooveMat) {
  const t = .019, g = .0025; w -= g * 2; h -= g * 2; y += g;
  if (st === 'greppfri') { box(w, .028, t * .6, grooveMat, x, y + h - .028, z); h -= .034; }
  box(w, h, t, mat, x, y, z + t / 2, .0015);
  if (st === 'ram' && w > .12 && h > .12) { const f = Math.min(.065, w * .18), p = .005;
    box(w, f, p, mat, x, y, z + t + p / 2, .002); box(w, f, p, mat, x, y + h - f, z + t + p / 2, .002);
    box(f, h - 2 * f, p, mat, x - w / 2 + f / 2, y + f, z + t + p / 2, .002); box(f, h - 2 * f, p, mat, x + w / 2 - f / 2, y + f, z + t + p / 2, .002); }
  if (st === 'spar') { const n = Math.max(2, Math.round(w / .045)); for (let i = 1; i < n; i++) box(.004, h, .0008, grooveMat, x - w / 2 + i * w / n, y, z + t + .0004); }
  if (st === 'ribbor') { const n = Math.max(3, Math.round(w / .03)); for (let i = 0; i < n; i++) { const c = cyl(.012, .012, h, mat, 0, 0, 0, 10); c.scale.z = .6; c.position.set(x - w / 2 + (i + .5) * w / n, y + h / 2, z + t); } }
  return { w, h, y, z: z + t + (st === 'ram' ? .005 : 0) };
}
const FRONT_STYLES = [['slat', 'Slät'], ['ram', 'Ram (shaker)'], ['spar', 'Spår'], ['greppfri', 'Greppfri']];
const HANDLES = [['bygel', 'Bygel'], ['knopp', 'Knopp'], ['list', 'Kantlist'], ['lader', 'Läderflik'], ['inga', 'Inga']];
// en dörr med handtag. hinge: -1 = gångjärn vänster, 1 = höger
function door(o, M, w, h, x, y, z, hinge, hpos = 'top') {
  const f = front(o.frontstil, M.front, w, h, x, y, z, M.handtag);
  if (o.frontstil === 'greppfri') return;
  const hx = x - hinge * (f.w / 2 - .045), len = o.handtag === 'list' ? .2 : .16;
  const hy = hpos === 'top' ? f.y + f.h - .06 - len / 2 : hpos === 'bottom' ? f.y + .06 + len / 2 : f.y + f.h / 2;
  handle(o.handtag, M.handtag, o.handtag === 'list' ? x - hinge * (f.w / 2 - .01) : hx, hy, f.z, true, len);
}
function drawer(o, M, w, h, x, y, z) {
  const f = front(o.frontstil, M.front, w, h, x, y, z, M.handtag); if (o.frontstil === 'greppfri') return;
  const len = Math.min(.32, Math.max(.128, w * .4));
  handle(o.handtag, M.handtag, x, o.handtag === 'list' ? f.y + f.h - .002 : f.y + f.h - Math.min(.07, f.h / 2), f.z, false, o.handtag === 'list' ? w * .6 : len);
}

// ---------- SOFFA / FÅTÖLJ ----------
const ARMW = { smala: .1, raka: .16, breda: .2, rundade: .18, inga: 0 };
function sofa(it, o, M) {
  const W = it.w, D = it.d, H = it.h, n = o.sits;
  const legH = o.ben === 'dolda' ? .03 : o.benH;
  const armW = ARMW[o.armar] ?? .14;
  const armH = Math.min(H - .1, o.armH || .62), cushT = .15, seatTop = o.sitth || .44;
  const baseY = legH, baseH = Math.max(.1, seatTop - cushT - legH), backT = o.rygg === 'kuddar' ? .16 : .2;
  const side = o.form?.endsWith('H') ? 1 : -1, ext = o.form?.startsWith('sch') ? 'sch' : o.form?.startsWith('horn') ? 'horn' : null;
  const L = Math.max(D + .4, o.d2 || 1.6);
  const g = sub(); if (side === 1) g.scale.x = -1;   // höger = spegelvänd vänster
  const armR = { smala: .02, breda: .04, raka: .03, rundade: armW * .48, inga: 0 }[o.armar] ?? .03;
  into(g, () => {
    const cw = (W - 2 * armW) / n;                       // sittbredd
    const x0 = ext === 'horn' ? -W / 2 + backT : -W / 2 + armW, x1 = W / 2 - armW;
    // ram / bas
    box(W, baseH, D, M.kladsel, 0, baseY, 0, .025);
    // rygg
    const backH = o.rygg === 'kuddar' ? Math.min(H, seatTop + .26) : H;
    box(ext === 'horn' ? W : W - (o.armar === 'inga' ? 0 : armW * 2) + .02, backH - baseY, backT, M.kladsel, ext === 'horn' ? 0 : 0, baseY, -D / 2 + backT / 2, o.rygg === 'kuddar' ? .03 : .06, o.rygg === 'kuddar' ? 0 : .012);
    // armar
    const arm = (x, z0, z1) => { if (!armW) return; box(armW, armH - baseY, z1 - z0, M.kladsel, x, baseY, (z0 + z1) / 2, armR, .006); };
    arm(W / 2 - armW / 2, -D / 2, D / 2);
    if (ext !== 'horn') arm(-W / 2 + armW / 2, -D / 2, ext === 'sch' ? -D / 2 + L : D / 2);
    // sittdynor
    const seatZ0 = -D / 2 + backT, seats = [];
    if (ext === 'horn') { const cw2 = (x1 - x0) / n; for (let i = 0; i < n; i++) seats.push([x0 + i * cw2, x0 + (i + 1) * cw2, seatZ0, D / 2]); }
    else for (let i = 0; i < n; i++) seats.push([x0 + i * cw, x0 + (i + 1) * cw, seatZ0, ext === 'sch' && i === 0 ? -D / 2 + L : D / 2]);
    for (const [a, b, c, d] of seats) box(b - a - .006, cushT, d - c - .006, M.kladsel, (a + b) / 2, seatTop - cushT, (c + d) / 2 + .003, .05, .018);
    // schäslong / hörn-förlängning
    if (ext === 'sch') box(armW + cw, baseH, L - D, M.kladsel, -W / 2 + (armW + cw) / 2, baseY, D / 2 + (L - D) / 2, .025);
    if (ext === 'horn') {
      const ex = -W / 2, ew = D;
      box(ew, baseH, L - D, M.kladsel, ex + ew / 2, baseY, D / 2 + (L - D) / 2, .025);
      box(backT, backH - baseY, L, M.kladsel, ex + backT / 2, baseY, -D / 2 + L / 2, o.rygg === 'kuddar' ? .03 : .06, o.rygg === 'kuddar' ? 0 : .012);
      const z0 = D / 2, z1 = -D / 2 + L - armW, m = Math.max(1, Math.round((z1 - z0) / .65));
      for (let i = 0; i < m; i++) { const a = z0 + i * (z1 - z0) / m, b = z0 + (i + 1) * (z1 - z0) / m;
        box(ew - backT - .006, cushT, b - a - .006, M.kladsel, ex + backT + (ew - backT) / 2, seatTop - cushT, (a + b) / 2, .05, .018); }
      if (o.armar !== 'inga') arm(ex + ew / 2, -D / 2 + L - armW, -D / 2 + L);
      // ryggdynor längs sidan
      if (o.rygg === 'kuddar') for (let i = 0; i < m; i++) { const a = z0 + i * (z1 - z0) / m, b = z0 + (i + 1) * (z1 - z0) / m;
        const c = box(b - a - .01, H - seatTop - .02, .17, M.kladsel, 0, 0, 0, .06, .02); c.rotation.y = Math.PI / 2; c.rotation.x = .17;
        c.position.set(ex + backT + .07, seatTop + (H - seatTop) / 2 - .01, (a + b) / 2); }
    }
    // ryggdynor
    if (o.rygg === 'kuddar') {
      const bx0 = ext === 'horn' ? x0 + .17 : x0, bw = (x1 - bx0) / n;
      for (let i = 0; i < n; i++) { const c = box(bw - .01, H - seatTop - .02, .17, M.kladsel, bx0 + (i + .5) * bw, 0, 0, .06, .02);
        c.rotation.x = -.17; c.position.y = seatTop + (H - seatTop) / 2 - .01; c.position.z = -D / 2 + backT + .07; }
      if (ext === 'horn') { const c = box(.4, H - seatTop - .02, .17, M.kladsel, x0 + .08, 0, 0, .06, .02); c.rotation.set(-.17, Math.PI / 4, 0); c.position.set(x0 + .1, seatTop + (H - seatTop) / 2 - .01, -D / 2 + backT + .1); }
    }
    // vingar (öronlappsfåtölj)
    if (o.vinge) for (const s of [-1, 1]) box(armW || .1, H - armH, .38, M.kladsel, s * (W / 2 - (armW || .1) / 2), armH - .02, -D / 2 + .19 + .05, .04, .006);
    // prydnadskuddar
    const k = o.kuddar | 0;
    for (let i = 0; i < k; i++) { const left = i % 2 === 0, j = Math.floor(i / 2);
      const x = left ? x0 + .26 + j * .3 : x1 - .26 - j * .3; const c = box(.45, .45, .12, M.kuddar, 0, 0, 0, .05, .022);
      c.position.set(x, seatTop + .2, -D / 2 + backT + .2); c.rotation.set(-.3, (left ? 1 : -1) * .25, (left ? -1 : 1) * .12); }
    // ben
    const legs = [[-W / 2 + .07, -D / 2 + .07], [W / 2 - .07, -D / 2 + .07], [-W / 2 + .07, D / 2 - .07], [W / 2 - .07, D / 2 - .07]];
    if (ext) legs.push([-W / 2 + .07, -D / 2 + L - .07], [ext === 'sch' ? -W / 2 + armW + cw - .07 : -W / 2 + D - .07, -D / 2 + L - .07]);
    if (W > 2.2) legs.push([0, -D / 2 + .07], [0, D / 2 - .07]);
    if (o.ben === 'dolda') { box(W - .1, legH, D - .1, dark(), 0, 0, 0); if (ext) box(ext === 'sch' ? armW + cw - .1 : D - .1, legH, L - D, dark(), -W / 2 + (ext === 'sch' ? armW + cw : D) / 2, 0, D / 2 + (L - D) / 2 - .05); }
    else if (o.ben === 'medar') for (const s of [-1, 1]) { const x = s * (W / 2 - armW / 2 - .01); box(.02, .02, D - .08, M.ben, x, 0, 0, .005); box(.02, legH, .02, M.ben, x, 0, -D / 2 + .06); box(.02, legH, .02, M.ben, x, 0, D / 2 - .06); }
    else for (const [x, z] of legs) { if (o.ben === 'metall') box(.018, legH, .018, M.ben, x, 0, z); else if (o.ben === 'kloss') box(.05, legH, .05, M.ben, x, 0, z, .004); else cyl(.024, .016, legH, M.ben, x, 0, z, 16); }
  });
}

// ---------- BORD ----------
function table(it, o, M) {
  const W = it.w, D = o.form === 'rund' ? W : it.d, H = it.h, t = o.tjocklek || .03;
  if (o.form === 'rekt') box(W, t, D, M.skiva, 0, H - t, 0, .004);
  else { const c = cyl(W / 2, W / 2 - .002, t, M.skiva, 0, H - t, 0, 64); c.scale.z = D / W; }
  const legH = H - t, round = o.form !== 'rekt';
  const inset = round ? 0 : .06, lx = round ? W * .3 : W / 2 - inset, lz = round ? D * .3 : D / 2 - inset;
  const apron = H > .6 && o.ben !== 'pelare' && o.ben !== 'ram';
  if (o.ben === '4ben' || o.ben === 'konisk' || o.ben === 'hårnål') {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      if (o.ben === '4ben') box(.045, legH, .045, M.ben, sx * (lx - .0225), 0, sz * (lz - .0225));
      else if (o.ben === 'hårnål') { for (const d of [-.05, .05]) { const r = cyl(.005, .005, legH, M.ben, 0, 0, 0, 8); r.position.set(sx * (lx - .04) + d * .5, legH / 2, sz * (lz - .04) + d); r.rotation.x = sz * .04; } }
      else { const l = cyl(.026, .014, legH + .01, M.ben, 0, 0, 0, 16); l.position.set(sx * (lx - .05), legH / 2, sz * (lz - .05)); l.rotation.z = sx * .05; l.rotation.x = -sz * .05; }
    }
    if (apron && !round && o.ben !== 'hårnål') { box(W - 2 * inset - .06, .08, .02, M.ben, 0, legH - .08, lz - .03); box(W - 2 * inset - .06, .08, .02, M.ben, 0, legH - .08, -lz + .03);
      box(.02, .08, D - 2 * inset - .06, M.ben, lx - .03, legH - .08, 0); box(.02, .08, D - 2 * inset - .06, M.ben, -lx + .03, legH - .08, 0); }
  } else if (o.ben === 'pelare') {
    const r = Math.min(W, D) * (H > .6 ? .28 : .3); cyl(.07, .07, legH - .02, M.ben, 0, .02, 0, 32); const b = cyl(r, r, .02, M.ben, 0, 0, 0, 48); b.scale.z = D > W ? 1 : 1;
  } else if (o.ben === 'bock') {
    for (const s of [-1, 1]) { const x = s * (W / 2 - Math.min(.25, W * .15));
      box(.07, .05, D * .78, M.ben, x, 0, 0, .006); box(.07, .05, D * .7, M.ben, x, legH - .05, 0, .006); box(.08, legH - .1, .08, M.ben, x, .05, 0, .004); }
    box(W - Math.min(.5, W * .3) * 2, .04, .04, M.ben, 0, .25, 0);
  } else if (o.ben === 'ram') {
    for (const s of [-1, 1]) { const x = s * (W / 2 - .05), q = .03;
      box(q, legH, q, M.ben, x, 0, D / 2 - .06); box(q, legH, q, M.ben, x, 0, -D / 2 + .06); box(q, q, D - .12, M.ben, x, 0, 0); box(q, q, D - .12, M.ben, x, legH - q, 0); }
  }
  if (o.hylla) { if (round) { const c = cyl(W * .34, W * .34, .02, M.skiva, 0, .12, 0, 48); c.scale.z = D / W; } else box(W - 2 * inset - .04, .02, D - 2 * inset - .04, M.skiva, 0, .12, 0, .003); }
}

// ---------- STOL ----------
function chair(it, o, M) {
  const W = it.w, D = it.d, H = it.h, sh = o.sitth || .46;
  if (o.stil === 'karm') return tubChair(W, D, H, sh, o, M);
  if (o.stil === 'skal') {
    const s = box(W, .045, D - .06, M.sits, 0, sh - .045, .02, .02); const b = box(W - .02, .4, .04, M.sits, 0, 0, 0, .02);
    b.rotation.x = -.18; b.position.set(0, sh + .2, -D / 2 + .07);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = cyl(.017, .012, sh, M.stomme, 0, 0, 0, 12); l.position.set(sx * (W / 2 - .07), sh / 2 - .02, sz * (D / 2 - .09)); l.rotation.z = sx * .09; l.rotation.x = -sz * .09; }
    return;
  }
  const lt = .035;
  for (const sx of [-1, 1]) { box(lt, sh - .03, lt, M.stomme, sx * (W / 2 - lt / 2 - .01), 0, D / 2 - lt / 2 - .02);
    const back = box(lt, H, lt, M.stomme, 0, 0, 0); back.position.set(sx * (W / 2 - lt / 2 - .01), H / 2, -D / 2 + lt / 2 + .02); back.rotation.x = -.06; }
  box(W - .06, .05, .02, M.stomme, 0, sh - .1, D / 2 - .03); box(W - .06, .05, .02, M.stomme, 0, sh - .1, -D / 2 + .04);
  if (o.stil === 'stoppad') {
    box(W - .02, .07, D - .05, M.sits, 0, sh - .05, .01, .025, .008);
    const b = box(W - .07, .3, .05, M.sits, 0, 0, 0, .02, .006); b.rotation.x = -.08; b.position.set(0, H - .23, -D / 2 + .05);
  } else {
    box(W - .02, .025, D - .04, M.stomme, 0, sh - .025, .01, .006);
    const top = box(W - .06, .07, .022, M.stomme, 0, 0, 0, .006); top.rotation.x = -.1; top.position.set(0, H - .07, -D / 2 + .06);
    for (let i = 0; i < 3; i++) { const p = cyl(.008, .008, H - sh - .1, M.stomme, 0, 0, 0, 10); p.position.set((i - 1) * (W - .1) / 4, sh + (H - sh - .1) / 2, -D / 2 + .045); p.rotation.x = -.08; }
  }
}

// helklädd karmstol: ryggen går i en båge över i armstöden, sidorna ner till golvet
function tubChair(W, D, H, sh, o, M) {
  const t = .075, r = W / 2, cz = -D / 2 + r, armH = Math.min(H - .08, o.armH || .66), fz = D / 2;
  const sh2 = new THREE.Shape();
  const seg = (x, z0, z1) => { for (let i = 1; i <= 8; i++) sh2.lineTo(x, z0 + (z1 - z0) * i / 8); };   // fler punkter så armens lutning blir mjuk
  sh2.moveTo(-r, fz); seg(-r, fz, cz); sh2.absarc(0, cz, r, Math.PI, 0, false); seg(r, cz, fz);
  sh2.lineTo(r - t, fz); seg(r - t, fz, cz); sh2.absarc(0, cz, r - t, 0, Math.PI, true); seg(-r + t, cz, fz); sh2.closePath();
  const bev = .014; let g = new THREE.ExtrudeGeometry(sh2, { depth: H - 2 * bev - .012, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * .8, bevelSegments: 3, curveSegments: 12 });
  const ext = H - 2 * bev - .012; g.rotateX(Math.PI / 2); g.translate(0, ext, 0);   // formen ligger i x/z, extruderas i höjdled
  const p = g.attributes.position, top = ext;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i);
    const u = THREE.MathUtils.smoothstep((z - cz) / (fz - cz), -.1, .45);   // 0 bak → 1 fram
    const h = H - (H - armH) * u;
    if (y > top * .5) p.setY(i, y + bev + .012 + (h - H)); else p.setY(i, y + bev + .012); }
  g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-4); g.computeVertexNormals();   // mjuk yta utan ränder
  add(g, M.sits, 0, 0, 0);
  const uv = g.attributes.uv;   // tyget följer bågen runt stolen
  for (let i = 0; i < g.attributes.position.count; i++) { const x = g.attributes.position.getX(i), y = g.attributes.position.getY(i), z = g.attributes.position.getZ(i);
    uv.setXY(i, z < cz ? r * Math.atan2(x, cz - z) : Math.sign(x) * (r * Math.PI / 2 + z - cz), y); }
  // sits: bas + dyna
  const iw = W - 2 * t + .01, id = fz - cz + r - t;
  box(iw, sh - .13 - .02, id - .01, M.sits, 0, .02, cz - (r - t) + id / 2, .02);
  box(iw - .004, .11, id - .02, M.sits, 0, sh - .11, cz - (r - t) + id / 2 + .005, .045, .02);
  // ryggstoppning
  const b = box(iw - .08, H - sh - .1, .05, M.sits, 0, 0, 0, .025, .012); b.rotation.x = -.1; b.position.set(0, sh + (H - sh - .1) / 2 - .02, cz - r + t + .03);
  for (const [x, z] of [[-r + .05, cz], [r - .05, cz], [-r + .05, fz - .05], [r - .05, fz - .05]]) cyl(.012, .012, .012, dark(), x, 0, z, 10);
}

// ---------- KÖK ----------
export const KMODS = {
  lador:      { name: 'Lådor',          icon: '🗄️', w: .6 },
  lucka:      { name: 'Skåp med lucka', icon: '🚪', w: .6 },
  disk:       { name: 'Diskbänk',       icon: '🚰', w: .8 },
  spis:       { name: 'Spis (ugn+häll)', icon: '🔥', w: .6 },
  diskmaskin: { name: 'Diskmaskin',     icon: '🫧', w: .6 },
  hogskap:    { name: 'Högskåp',        icon: '▯', w: .6, tall: 1 },
  kyl:        { name: 'Kyl/frys (inbyggd)', icon: '🧊', w: .6, tall: 1 },
  ugnstorn:   { name: 'Ugnstorn',       icon: '♨️', w: .6, tall: 1 },
  kylfri:     { name: 'Kyl, fristående', icon: '🧊', w: .7, tall: 1 },
  oppen:      { name: 'Öppen hylla',    icon: '▭', w: .4 },
};
export const KWIDTHS = [.2, .3, .4, .5, .6, .7, .8, .9, 1.0];
function kitchen(it, o, M) {
  const D = it.d, back = -D / 2, CH = o.bankH || .9, ct = o.bankT || .03, pl = o.sockel || .1;
  const cabD = .58, frontZ = back + cabD, top = o.toppH || 2.2, upY = CH + (o.overGap || .55), upD = .37;
  const W = o.mods.reduce((s, m) => s + m.w, 0); let x = -W / 2;
  const segs = []; let seg = null;
  const steel = makeMat('rostfritt'), blackGlass = new THREE.MeshPhysicalMaterial({ color: '#0b0b0c', roughness: .05, metalness: 0, clearcoat: 1 });
  o.mods.forEach((m, i) => {
    const K = KMODS[m.t] || KMODS.lucka, w = m.w, cx = x + w / 2, hinge = i % 2 ? 1 : -1;
    if (K.tall) {
      seg = null;
      if (m.t === 'kylfri') { box(w - .01, 2.0, .66, steel, cx, .01, back + .34, .02);
        box(w - .02, .006, .002, dark(), cx, 1.25, back + .672); for (const [y0, h] of [[.05, 1.18], [1.26, .72]]) cyl(.009, .009, h * .6, steel, cx - w / 2 + .07, y0 + h * .2, back + .7, 12);
        x += w; return; }
      box(w, pl, cabD - .05, M.sockel, cx, 0, back + (cabD - .05) / 2);
      box(w - .002, top - pl, cabD, M.stomme, cx, pl, back + cabD / 2);
      if (m.t === 'hogskap') { door(o, M, w, 1.4 - pl, cx, pl, frontZ, hinge, 'top'); door(o, M, w, top - 1.4, cx, 1.4, frontZ, hinge, 'bottom'); }
      if (m.t === 'kyl') { door(o, M, w, .8 - pl, cx, pl, frontZ, hinge, 'top'); door(o, M, w, top - .8, cx, .8, frontZ, hinge, 'bottom'); }
      if (m.t === 'ugnstorn') { drawer(o, M, w, .4, cx, pl, frontZ); drawer(o, M, w, .85 - pl - .4, cx, pl + .4, frontZ);
        oven(cx, .85, frontZ, w, .6, steel, blackGlass); oven(cx, 1.45, frontZ, w, .38, steel, blackGlass, true);
        door(o, M, w, top - 1.83, cx, 1.83, frontZ, hinge, 'bottom'); }
      x += w; return;
    }
    if (!seg) { seg = { x0: x, x1: x, holes: [] }; segs.push(seg); } seg.x1 = x + w;
    if (m.t !== 'oppen') { box(w, pl, cabD - .05, M.sockel, cx, 0, back + (cabD - .05) / 2); box(w - .002, CH - ct - pl, cabD, M.stomme, cx, pl, back + cabD / 2); }
    const fh = CH - ct - pl - .003;
    if (m.t === 'lador') { const hs = [.2, .33, .47].map(f => f * fh); let y = pl; for (const h of hs.reverse()) { drawer(o, M, w, h, cx, y, frontZ); y += h; } }
    if (m.t === 'lucka') { if (w > .6) { door(o, M, w / 2, fh, cx - w / 4, pl, frontZ, -1); door(o, M, w / 2, fh, cx + w / 4, pl, frontZ, 1); } else door(o, M, w, fh, cx, pl, frontZ, hinge); }
    if (m.t === 'diskmaskin') door(o, M, w, fh, cx, pl, frontZ, 0, 'top');
    if (m.t === 'disk') { if (w > .6) { door(o, M, w / 2, fh, cx - w / 4, pl, frontZ, -1); door(o, M, w / 2, fh, cx + w / 4, pl, frontZ, 1); } else door(o, M, w, fh, cx, pl, frontZ, hinge);
      const sw = Math.min(w - .16, .7), sd = .4, sz = back + .03 + .635 / 2; seg.holes.push([cx - sw / 2, cx + sw / 2, sz - sd / 2, sz + sd / 2]);
      const bm = M.ho; box(sw, .004, sd, bm, cx, CH - .2, sz); box(sw, .2, .004, bm, cx, CH - .2, sz - sd / 2); box(sw, .2, .004, bm, cx, CH - .2, sz + sd / 2);
      box(.004, .2, sd, bm, cx - sw / 2, CH - .2, sz); box(.004, .2, sd, bm, cx + sw / 2, CH - .2, sz); cyl(.025, .025, .003, dark(), cx, CH - .197, sz, 20);
      // kran
      const tx = cx, tz = sz - sd / 2 - .06; cyl(.025, .028, .04, M.kran, tx, CH, tz, 20);
      tube([[tx, CH + .03, tz], [tx, CH + .3, tz], [tx, CH + .36, tz + .06], [tx, CH + .32, tz + .2], [tx, CH + .25, tz + .22]], .013, M.kran);
      const lev = cyl(.006, .006, .09, M.kran, 0, 0, 0, 10); lev.rotation.z = Math.PI / 2; lev.position.set(tx + .05, CH + .12, tz); }
    if (m.t === 'spis') { drawer(o, M, w, fh - .6, cx, pl, frontZ); oven(cx, pl + fh - .6, frontZ, w, .6, steel, blackGlass);
      const hz = back + .03 + .635 / 2 + .01; box(w - .03, .006, .51, blackGlass, cx, CH, hz, .003);
      for (const [dx, dz, r] of [[-.14, -.11, .1], [.14, -.11, .08], [-.14, .12, .08], [.14, .12, .1]]) { const ring = new THREE.Mesh(new THREE.RingGeometry(r - .004, r, 48), makeMat('matt', '#5a5a5a')); ring.rotation.x = -Math.PI / 2; ring.position.set(cx + dx * w / .6, CH + .0065, hz + dz); G.add(ring); } }
    if (m.t === 'oppen') { box(w, CH - ct, .018, M.stomme, cx, 0, back + .009); for (const y of [0, .35, .7]) box(w - .02, .018, cabD - .02, M.stomme, cx, y, back + cabD / 2); box(.018, CH - ct, cabD, M.stomme, cx - w / 2 + .009, 0, back + cabD / 2); box(.018, CH - ct, cabD, M.stomme, cx + w / 2 - .009, 0, back + cabD / 2); }
    // överskåp / fläkt
    if (o.overskap || m.t === 'spis') {
      if (m.t === 'spis' && o.flakt !== 'ingen') {
        if (o.flakt === 'vagg') { box(Math.max(w, .6), .07, .5, steel, cx, 1.62, back + .25, .004); box(.28, Math.max(2.45, top) - 1.69, .26, steel, cx, 1.69, back + .13); }
        else if (o.overskap) { box(w, top - 1.85, upD, M.stomme, cx, 1.85, back + upD / 2); door(o, M, w, top - 1.85, cx, 1.85, back + upD, hinge, 'bottom'); box(w - .01, .04, .3, steel, cx, 1.81, back + .15); }
      } else if (o.overskap) {
        box(w - .002, top - upY, upD, M.stomme, cx, upY, back + upD / 2);
        if (m.t === 'oppen') { for (const y of [upY, upY + (top - upY) / 2]) box(w - .02, .018, upD - .02, M.stomme, cx, y, back + upD / 2); }
        else if (w > .6) { door(o, M, w / 2, top - upY, cx - w / 4, upY, back + upD, -1, 'bottom'); door(o, M, w / 2, top - upY, cx + w / 4, upY, back + upD, 1, 'bottom'); }
        else door(o, M, w, top - upY, cx, upY, back + upD, hinge, 'bottom');
        if (o.belysning) { const strip = box(w - .04, .008, .02, glow('#fff1d8'), cx, upY - .009, back + upD - .04); strip.userData.lamp = 1; }
      }
    }
    if (o.stank && M.stank) { let ts = CH + .6; if (m.t === 'spis' && o.flakt === 'vagg') ts = 1.62; else if (o.overskap) ts = m.t === 'spis' && o.flakt === 'inbyggd' ? 1.81 : upY;
      box(w, ts - CH, .008, M.stank, cx, CH, back + .004); }
    x += w;
  });
  // bänkskivor (med hål för diskhon)
  for (const s of segs) { const z0 = back, z1 = back + .635;
    const holes = s.holes.sort((a, b) => a[0] - b[0]); let cx = s.x0;
    for (const [a, b, c, d] of holes) { if (a > cx) box(a - cx, ct, z1 - z0, M.bank, (a + cx) / 2, CH - ct, (z0 + z1) / 2);
      box(b - a, ct, c - z0, M.bank, (a + b) / 2, CH - ct, (z0 + c) / 2); box(b - a, ct, z1 - d, M.bank, (a + b) / 2, CH - ct, (d + z1) / 2); cx = b; }
    if (s.x1 > cx) box(s.x1 - cx, ct, z1 - z0, M.bank, (s.x1 + cx) / 2, CH - ct, (z0 + z1) / 2, .0015); }
}
function oven(cx, y, z, w, h, steel, glass, micro) {
  box(w - .006, h - .006, .02, steel, cx, y + .003, z + .01, .002);
  box(w - .07, h * (micro ? .62 : .58), .004, glass, cx - (micro ? .06 : 0), y + h * (micro ? .2 : .1), z + .022, .002);
  box(w - .02, h * .16, .004, glass, cx, y + h * .8, z + .022, .002);
  if (!micro) { const b = cyl(.008, .008, w - .14, steel, 0, 0, 0, 12); b.rotation.z = Math.PI / 2; b.position.set(cx, y + h * .73, z + .055); for (const s of [-1, 1]) { const st = cyl(.006, .006, .03, steel, 0, 0, 0, 8); st.rotation.x = Math.PI / 2; st.position.set(cx + s * (w / 2 - .1), y + h * .73, z + .037); } }
}

// ---------- SÄNG ----------
function bed(it, o, M) {
  const W = it.w, D = it.d, mw = o.storlek / 100, ml = 2.0, cont = o.typ === 'kontinental';
  const legH = cont ? .1 : .14, headT = o.gavel === 'ingen' ? 0 : .08, mz = -D / 2 + headT + ml / 2 + (cont ? 0 : .03);
  let mt;
  if (cont) { box(mw, .3, ml, M.gavel, 0, legH, mz, .02, .004); box(mw - .01, .2, ml - .01, makeMat('tyg', '#e9e8e4'), 0, legH + .3, mz, .05, .01); box(mw - .02, .07, ml - .02, makeMat('tyg', '#f3f2ee'), 0, legH + .5, mz, .03, .008); mt = legH + .57; }
  else { box(W, .24, D - headT, M.ram, 0, legH, headT / 2, .008); box(mw - .01, .2, ml - .01, makeMat('tyg', '#ecebe7'), 0, legH + .17, mz, .05, .01); mt = legH + .37; }
  // ben
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = sx * (W / 2 - .06), z = sz * (D / 2 - .08) + (sz < 0 ? headT : 0);
    if (o.ben === 'metall') box(.02, legH, .02, M.ben, x, 0, z); else cyl(.03, .02, legH, M.ben, x, 0, z, 16); }
  // gavel
  const gh = o.gavelH || 1.1;
  if (o.gavel === 'stoppad') box(W + .02, gh - .08, headT, M.gavel, 0, .08, -D / 2 + headT / 2, .03, .015);
  if (o.gavel === 'tra') box(W + .02, gh - .08, .035, M.ram, 0, .08, -D / 2 + .02, .004);
  if (o.gavel === 'spjal') { const n = Math.round(W / .09); for (let i = 0; i < n; i++) box(.05, gh - .1, .03, M.ram, -W / 2 + (i + .5) * W / n, .1, -D / 2 + .02, .004); box(W + .02, .05, .04, M.ram, 0, gh - .05, -D / 2 + .02, .004); }
  // sängkläder
  const pillowN = mw >= 1.4 ? 2 : 1, pz = mz - ml / 2 + .3;
  for (let r = 0; r < (o.kuddar || 1); r++) for (let i = 0; i < pillowN; i++) { const px = pillowN === 1 ? 0 : (i - .5) * mw / 2, c = box(Math.min(.6, mw / pillowN - .06), .12, .48, M.kladsel, 0, 0, 0, .045, .02);
    c.position.set(px, mt + .08 + r * .07, pz + r * .1 - .03); c.rotation.x = -.28 + r * .12; }
  const dz0 = mz - ml / 2 + .55, dz1 = mz + ml / 2 + .03, drape = cont ? .2 : .14;
  box(mw + .06, .07 + drape, dz1 - dz0, M.kladsel, 0, mt - drape, (dz0 + dz1) / 2, .04, .015);
  box(mw + .065, .09, .3, M.kladsel, 0, mt - .03, dz0 + .15, .045, .02);   // vikt kant
  if (o.overkast) { const oz0 = dz0 + .4; box(mw + .14, mt + .1 - .18, dz1 + .05 - oz0, M.overkast, 0, .18, (oz0 + dz1 + .05) / 2, .03, .006); }
}

// ---------- GARDEROB ----------
function wardrobe(it, o, M) {
  const W = it.w, D = it.d, H = it.h, pl = .08, n = o.dorrar || Math.max(1, Math.round(W / .5));
  box(W, pl, D - .06, M.stomme, 0, 0, -.03);
  box(W, H - pl, D - .02, M.stomme, 0, pl, -.01, .002);
  const fz = D / 2 - .02, mirror = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 1, roughness: .02 });
  if (o.typ === 'skjut') {
    const n2 = Math.max(2, Math.min(4, n)), dw = W / n2 + .02;
    box(W, .04, .07, M.stomme, 0, H - .04, fz - .025, .003);
    for (let i = 0; i < n2; i++) { const zz = fz - .04 + (i % 2) * .03, x = -W / 2 + dw / 2 + i * (W - dw) / (n2 - 1);
      const mat = o.spegel && i % 2 === 1 ? mirror : M.front; front(o.spegel && i % 2 === 1 ? 'slat' : o.frontstil, mat, dw, H - pl - .07, x, pl + .01, zz, M.handtag);
      box(.012, H - pl - .3, .006, M.handtag, x + (i < n2 / 2 ? 1 : -1) * (dw / 2 - .03), pl + .15, zz + .02, .002); }
    return;
  }
  for (let i = 0; i < n; i++) { const dw = W / n, x = -W / 2 + dw / 2 + i * dw, hinge = i % 2 ? 1 : -1;
    if (o.spegel && i === Math.floor(n / 2)) { front('slat', M.front, dw, H - pl, x, pl, fz); box(dw - .1, H - pl - .3, .004, mirror, x, pl + .15, fz + .021, .002);
      handle(o.handtag, M.handtag, x - hinge * (dw / 2 - .05), pl + 1.0, fz + .02, true, .3); }
    else door(o, M, dw, H - pl, x, pl, fz, hinge, 'mid'); }
}

// ---------- BOKHYLLA ----------
function rnd(seed) { let s = seed * 9301 + 49297 | 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const BOOKC = ['#7a2f2a', '#2b4256', '#c9b38a', '#e9e3d6', '#3d5240', '#1f1f22', '#a4673a', '#5b3a4d', '#d3c7a6', '#8b8f86', '#bfa178', '#36556b'];
function shelf(it, o, M) {
  const W = it.w, D = it.d, H = it.h, t = o.skiva || .018, n = o.sektioner || Math.max(1, Math.round(W / .8)), sw = (W - t) / n, nh = o.hyllor || 5;
  for (let i = 0; i <= n; i++) box(t, H, D, M.stomme, -W / 2 + t / 2 + i * sw, 0, 0);
  if (o.bak) box(W, H, .006, M.stomme, 0, 0, -D / 2 + .003);
  const r = rnd(it.seed || 7), books = new Map();
  const bm = c => { if (!books.has(c)) books.set(c, makeMat('matt', c)); return books.get(c); };
  for (let i = 0; i < n; i++) { const x0 = -W / 2 + t + i * sw, x1 = x0 + sw - t, cx = (x0 + x1) / 2;
    const y0 = o.skiva ? 0 : .06;
    for (let j = 0; j <= nh; j++) { const y = y0 + j * (H - y0 - t) / nh; box(sw - t, t, D - .01, M.stomme, cx, y, .005);
      if (j === nh || !o.bocker) continue; const room = (H - y0 - t) / nh - t - .02;
      let x = x0 + .01; const end = x1 - .01 - (r() < .3 ? sw * .35 : 0);
      while (x < end - .05) { const bw = .018 + r() * .035, bh = Math.min(room, .17 + r() * .14), bd = Math.min(D - .04, .14 + r() * .1);
        if (r() < .06) { x += .06; continue; }
        box(bw, bh, bd, bm(BOOKC[(r() * BOOKC.length) | 0]), x + bw / 2, y + t, -D / 2 + bd / 2 + .02, .002); x += bw + .001; }
      if (r() < .25) for (let k = 0; k < 3; k++) box(.2 - k * .015, .03, .15, bm(BOOKC[(r() * BOOKC.length) | 0]), x1 - .13, y + t + k * .03, 0, .002);
    } }
  if (!o.skiva) box(W, .06, .01, M.stomme, 0, 0, D / 2 - .03);
}

// ---------- TV-BÄNK / SIDEBOARD ----------
function sideboard(it, o, M) {
  const W = it.w, D = it.d, H = it.h, legH = o.ben === 'vagg' ? 0 : o.ben === 'sockel' ? .06 : .14, bh = H - legH, t = .018;
  const y0 = o.ben === 'vagg' ? .3 : legH;
  box(W, bh, D - .02, M.stomme, 0, y0, -.01, .003);
  const n = Math.max(2, Math.round(W / .6)), dw = W / n, fz = D / 2 - .02;
  for (let i = 0; i < n; i++) { const x = -W / 2 + dw / 2 + i * dw;
    if (o.front === 'oppen') { box(dw - .02, bh - .04, .004, dark(), x, y0 + .02, fz - .01); continue; }
    if (o.front === 'lador') { drawer(o, M, dw, bh / 2, x, y0, fz); drawer(o, M, dw, bh / 2, x, y0 + bh / 2, fz); }
    else if (o.front === 'ribbor') front('ribbor', M.front, dw, bh, x, y0, fz, M.handtag);
    else door(o, M, dw, bh, x, y0, fz, i % 2 ? 1 : -1, 'mid'); }
  if (o.ben === 'sockel') box(W - .06, legH, D - .08, dark(), 0, 0, 0);
  else if (o.ben !== 'vagg') for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = cyl(.018, .012, legH, M.ben, 0, 0, 0, 14); l.position.set(sx * (W / 2 - .06), legH / 2, sz * (D / 2 - .06)); l.rotation.z = sx * .06; }
}

// ---------- TV ----------
function tv(it, o, M) {
  const inch = o.tum || 55, W = inch * .0254 * .872 + .02, H = inch * .0254 * .49 + .02, wall = o.montering === 'vagg', y0 = wall ? (o.hojd || 1.0) : .08, z = wall ? -it.d / 2 + .03 : 0;
  const screen = new THREE.MeshPhysicalMaterial({ color: '#050506', roughness: .08, clearcoat: 1, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 }); screen.userData.glow = 1; screen.userData.screen = 1;
  const frame = makeMat('svartmetall', '#18181a');
  box(W, H, .03, frame, 0, y0, z, .004);
  const sc = box(W - .012, H - .012, .002, screen, 0, y0 + .006, z + .016); sc.castShadow = false;
  if (!wall) { box(.32, .012, .22, frame, 0, 0, 0, .004); box(.05, y0, .025, frame, 0, 0, -.02); }
}

// ---------- MATTA ----------
const rugCache = new Map();
function rug(it, o, M) {
  const W = it.w, D = o.form === 'rund' ? W : it.d, t = it.m.matta?.mat === 'ryamatta' ? .03 : .012;
  const base = it.m.matta?.color || MATS[it.m.matta?.mat || 'ull'].color, c2 = o.farg2 || '#6b5a48', k = [o.monster, base, c2, W.toFixed(2), D.toFixed(2)].join();
  let tex = rugCache.get(k);
  if (!tex) { const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * D / W); const g = cv.getContext('2d'), w = cv.width, h = cv.height;
    g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = c2; g.strokeStyle = c2;
    if (o.monster === 'kant') { g.lineWidth = w * .035; g.strokeRect(w * .06, h * .06 * W / D, w * .88, h - h * .12 * W / D); }
    if (o.monster === 'rand') for (let i = 0; i < 9; i++) if (i % 2) g.fillRect(0, i * h / 9, w, h / 9);
    if (o.monster === 'ruta') { const s = w / 8; for (let i = 0; i < 8; i++) for (let j = 0; j < h / s; j++) if ((i + j) % 2) g.fillRect(i * s, j * s, s, s); }
    if (o.monster === 'berber') { g.lineWidth = w * .008; for (let i = 0; i < 6; i++) { const y = (i + .5) * h / 6; g.beginPath(); for (let x = 0; x <= w; x += w / 10) g.lineTo(x, y + (x / (w / 10) % 2 ? -1 : 1) * h / 30); g.stroke(); } }
    tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; rugCache.set(k, tex); }
  const src = makeMat(it.m.matta?.mat || 'ull', '#ffffff'), mat = src.clone(); mat.map = tex; mat.color.set('#ffffff');
  if (src.bumpMap) { mat.bumpMap = src.bumpMap.clone(); mat.bumpMap.repeat.set(W / .3, D / .3); mat.bumpMap.needsUpdate = true; }
  let geo; if (o.form === 'rund') { geo = new THREE.CylinderGeometry(W / 2, W / 2, t, 64); const uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / W + .5, p.getZ(i) / W + .5); }
  else geo = new RoundedBoxGeometry(W, t, D, 2, t / 2.2);
  if (o.form !== 'rund') { const uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / W + .5, .5 - p.getZ(i) / D); }
  const m = new THREE.Mesh(geo, mat); m.position.y = t / 2 + .001; m.receiveShadow = true; G.add(m);
}

// ---------- LAMPOR ----------
const KELVIN = { 2200: '#ffa24d', 2700: '#ffb46b', 3000: '#ffc58f', 4000: '#ffe2c4' };
function lightAt(it, o, x, y, z, power = 1, castShadow = false, dir = null) {
  const c = KELVIN[o.temp || 2700];
  const L = dir ? new THREE.SpotLight(c, 0, 9, dir, .7, 1.6) : new THREE.PointLight(c, 0, 9, 1.6);
  L.position.set(x, y, z); L.castShadow = castShadow; if (castShadow) { L.shadow.mapSize.set(512, 512); L.shadow.bias = -.002; L.shadow.radius = 6; }
  if (dir) { L.target.position.set(x, y - 1, z); G.add(L.target); }
  L.userData.power = power; L.userData.lamp = 1; G.add(L); return L;
}
function pendant(it, o, M) {
  const ceil = it.ceilH || 2.5, drop = o.hang ?? .7, y = ceil - drop, gm = glow(KELVIN[o.temp || 2700]);
  cyl(.004, .004, drop, makeMat('svartmetall', '#111'), 0, y, 0, 8); cyl(.04, .04, .02, M.stomme, 0, ceil - .02, 0, 20);
  if (o.stil === 'kupa') { const r = (o.storlek || .4) / 2; lathe([[.02, 0], [.04, -.01], [r * .5, -r * .15], [r * .85, -r * .45], [r, -r * .75], [r, -r * .78]], ds(M.skarm), 0, y, 0);
    sphere(.04, gm, 0, y - r * .35, 0).userData.bulb = 1; const d = new THREE.Mesh(new THREE.CircleGeometry(r * .96, 40), gm); d.rotation.x = Math.PI / 2; d.position.set(0, y - r * .7, 0); G.add(d); lightAt(it, o, 0, y - r * .5, 0, 1.4, true); }
  else if (o.stil === 'glob') { const r = (o.storlek || .35) / 2, s = sphere(r, M.skarm, 0, y - r, 0); const inner = sphere(r * .96, gm, 0, y - r, 0); inner.castShadow = false; s.castShadow = false; s.userData.shell = 1; lightAt(it, o, 0, y - r * 2.1, 0, 1.6, true); }
  else { const r = (o.storlek || .45) / 2; cyl(r * .45, r, r * .9, ds(M.skarm), 0, y - r * .9, 0, 40, true); const inner = cyl(r * .44, r * .99, r * .89, gm, 0, y - r * .9, 0, 40, true); inner.material.side = THREE.BackSide; inner.castShadow = false; lightAt(it, o, 0, y - r * .7, 0, 1.4, true); }
}
function floorlamp(it, o, M) {
  const H = it.h, gm = glow(KELVIN[o.temp || 2700]);
  if (o.stil === 'bage') { box(.28, .06, .2, M.fot || makeMat('marmor'), 0, 0, 0, .004); const top = H, reach = 1.4;
    tube([[0, .06, 0], [0, H * .6, 0], [.15, H, 0], [reach * .7, H * 1.0, 0], [reach, H * .85, 0]], .011, M.stomme);
    const r = .2; lathe([[.02, 0], [r * .5, -r * .2], [r * .9, -r * .55], [r, -r * .7]], ds(M.skarm), reach, H * .85 - .01, 0);
    const d = new THREE.Mesh(new THREE.CircleGeometry(r * .95, 40), gm); d.rotation.x = Math.PI / 2; d.position.set(reach, H * .85 - r * .65, 0); G.add(d); lightAt(it, o, reach, H * .85 - .2, 0, 1.3, true); return; }
  cyl(.15, .16, .025, M.stomme, 0, 0, 0, 40); cyl(.009, .009, H - .3, M.stomme, 0, .025, 0, 12);
  const r = o.stil === 'spot' ? .09 : .22;
  if (o.stil === 'spot') { const s = cyl(.04, r, .16, ds(M.skarm), 0, H - .2, 0, 32, true); s.rotation.z = .5; const d = cyl(.039, r * .98, .15, gm, 0, H - .2, 0, 32, true); d.rotation.z = .5; d.material.side = THREE.BackSide; lightAt(it, o, .02, H - .25, 0, .8, false); return; }
  cyl(r * .85, r, .3, ds(M.skarm), 0, H - .32, 0, 48, true);
  const inner = cyl(r * .84, r * .99, .29, gm, 0, H - .315, 0, 48, true); inner.material.side = THREE.BackSide; inner.castShadow = false; lightAt(it, o, 0, H - .2, 0, 1.1, false);
}
function tablelamp(it, o, M) {
  const y0 = 0, H = it.h, gm = glow(KELVIN[o.temp || 2700]);
  lathe([[0, 0], [.07, 0], [.1, .08], [.09, .2], [.03, .27], [.015, .3], [0, .3]].map(([a, b]) => [a * H / .5, b * H / .5]), M.fot || makeMat('keramik'), 0, y0, 0);
  const r = .17 * H / .5; cyl(r * .8, r, .2 * H / .5, ds(M.skarm), 0, y0 + H * .58, 0, 40, true);
  const inner = cyl(r * .79, r * .99, .19 * H / .5, gm, 0, y0 + H * .585, 0, 40, true); inner.material.side = THREE.BackSide; inner.castShadow = false; lightAt(it, o, 0, y0 + H * .7, 0, .6, false);
}

// ---------- VÄXTER & BUSKAR ----------
// Bladen är "kort" (genomskinliga bilder) som färgas med vald bladfärg. Busken fylls med klungor runt en tät kärna.
const leafTex = new Map();
function leafMat(kind, color) {
  const k = kind + color; if (leafTex.has(k)) return leafTex.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const R = rnd(kind.length * 17);
  g.fillStyle = '#d8d8d8'; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
  const leafShape = (cx, cy, s, a) => { g.save(); g.translate(cx, cy); g.rotate(a); g.scale(s, s); g.beginPath(); g.moveTo(0, 60); g.bezierCurveTo(-46, 40, -38, -30, 0, -60); g.bezierCurveTo(38, -30, 46, 40, 0, 60); g.fill(); g.beginPath(); g.moveTo(0, 60); g.lineTo(0, -55); g.stroke(); g.restore(); };
  if (kind === 'monstera') { g.beginPath(); g.ellipse(128, 128, 110, 120, 0, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) { const a = -1.1 + i * .5; g.beginPath(); g.moveTo(128 + s * 30 * Math.cos(a), 128 + 30 * Math.sin(a)); g.lineTo(128 + s * 130 * Math.cos(a - .05), 128 + 130 * Math.sin(a - .05)); g.lineTo(128 + s * 130 * Math.cos(a + .12), 128 + 130 * Math.sin(a + .12)); g.fill(); }
    g.globalCompositeOperation = 'source-over'; g.beginPath(); g.moveTo(128, 250); g.lineTo(128, 10); g.stroke(); }
  else if (kind === 'gras') { g.beginPath(); g.moveTo(120, 256); g.quadraticCurveTo(110, 120, 128, 0); g.quadraticCurveTo(146, 120, 136, 256); g.fill(); }
  else if (kind === 'oval') { leafShape(128, 128, 2, 0); }
  else if (kind === 'klunga') { for (let i = 0; i < 14; i++) { const a = R() * 6.28, d = R() * 70; g.fillStyle = `hsl(0,0%,${70 + R() * 25}%)`; leafShape(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, .55 + R() * .35, R() * 6.28); } }
  else if (kind === 'barr') { g.lineCap = 'round';
    for (let b = 0; b < 5; b++) { const x0 = 128 + (b - 2) * 30, a0 = (b - 2) * .25; g.strokeStyle = '#bbb'; g.lineWidth = 4; g.beginPath(); g.moveTo(128, 250); g.lineTo(x0 + Math.sin(a0) * 200, 250 - Math.cos(a0) * 230); g.stroke();
      for (let i = 0; i < 40; i++) { const t = i / 40, px = 128 + (x0 + Math.sin(a0) * 200 - 128) * t, py = 250 - Math.cos(a0) * 230 * t; g.strokeStyle = `hsl(0,0%,${65 + R() * 30}%)`; g.lineWidth = 2;
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(px, py); g.lineTo(px + s * (14 + R() * 8) * (1 - t * .5), py - 10 - R() * 6); g.stroke(); } } } }
  else if (kind === 'blomma') { for (let i = 0; i < 18; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * 95, cx = 128 + Math.cos(a) * d, cy = 128 + Math.sin(a) * d, r = 12 + R() * 8;
      g.fillStyle = `hsl(0,0%,${82 + R() * 18}%)`; for (let k = 0; k < 5; k++) { const b = k * 1.2566 + a; g.beginPath(); g.ellipse(cx + Math.cos(b) * r * .6, cy + Math.sin(b) * r * .6, r * .55, r * .38, b, 0, 6.28); g.fill(); }
      g.fillStyle = '#e9d27a'; g.beginPath(); g.arc(cx, cy, r * .22, 0, 6.28); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: t, color, alphaTest: .45, side: THREE.DoubleSide, roughness: kind === 'barr' ? .8 : .55 }); leafTex.set(k, m); return m;
}
function leaf(mat, s, x, y, z, ry, tilt, bend = .3) {
  const geo = new THREE.PlaneGeometry(s, s, 1, 6); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = p.getY(i) / s + .5; p.setZ(i, -bend * s * v * v); } geo.translate(0, s / 2, 0); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.order = 'YXZ'; m.rotation.y = ry; m.rotation.x = tilt; m.castShadow = true; m.userData.noAO = 1; G.add(m); return m;
}
// kort utspridda på en form: ett enda nät per material (snabbt även med hundratals blad)
function cards(mat, list) {
  const geos = list.map(({ s, p, n, spin }) => { const g = new THREE.PlaneGeometry(s, s); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    g.applyMatrix4(new THREE.Matrix4().makeRotationZ(spin)); g.applyQuaternion(q); g.translate(p.x, p.y, p.z); return g; });
  if (!geos.length) return; const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = m.receiveShadow = true; m.userData.noAO = 1; G.add(m);
}
// buskens form: punkt på ytan (u,v i 0..1) → position + normal
function shapeAt(form, W, D, H, y0, u, v) {
  const a = u * Math.PI * 2;
  if (form === 'kon') { const y = v * H, r = (1 - v) * .5 + .02; return { p: new THREE.Vector3(Math.cos(a) * r * W, y0 + y, Math.sin(a) * r * D), n: new THREE.Vector3(Math.cos(a), .45, Math.sin(a)).normalize() }; }
  if (form === 'pelare') { const y = v * H, top = v > .85 ? Math.sqrt(1 - ((v - .85) / .15) ** 2) : 1, r = .5 * Math.max(.15, top); return { p: new THREE.Vector3(Math.cos(a) * r * W, y0 + y, Math.sin(a) * r * D), n: new THREE.Vector3(Math.cos(a) * top, v > .85 ? .8 : .1, Math.sin(a) * top).normalize() }; }
  if (form === 'hack') { const side = Math.floor(u * 5), t = (u * 5) % 1;
    if (side === 4) return { p: new THREE.Vector3((t - .5) * W, y0 + H, (v - .5) * D), n: new THREE.Vector3(0, 1, 0) };
    const n = [[0, 1], [1, 0], [0, -1], [-1, 0]][side]; return { p: new THREE.Vector3(n[0] ? n[0] * W / 2 : (t - .5) * W, y0 + v * H, n[1] ? n[1] * D / 2 : (t - .5) * D), n: new THREE.Vector3(n[0], 0, n[1]) }; }
  const ph = Math.acos(1 - 2 * Math.max(.04, v * .82 + .02)); const n = new THREE.Vector3(Math.sin(ph) * Math.cos(a), Math.cos(ph), Math.sin(ph) * Math.sin(a));
  return { p: new THREE.Vector3(n.x * W / 2, y0 + H / 2 + n.y * H / 2, n.z * D / 2), n };
}
function foliage(it, o, W, D, H, y0) {
  const r = rnd(it.seed || 5), form = o.form || 'rund', lov = o.lov || 'blad', col = o.bladfarg || '#3d6b34';
  const core = makeMat('matt', new THREE.Color(col).multiplyScalar(.45).getStyle());
  // tät kärna så man inte ser igenom
  if (form === 'kon') { const c = cyl(.02, W * .46, H * .97, core, 0, y0, 0, 20); c.scale.z = D / W; }
  else if (form === 'pelare') { const c = add(new THREE.CapsuleGeometry(W * .44, H * .7, 6, 16), core, 0, y0 + H * .5, 0); c.scale.z = D / W; c.scale.y = H / (H * .7 + W * .88); }
  else if (form === 'hack') box(W * .94, H * .95, D * .94, core, 0, y0, 0, .08);
  else { const c = sphere(.5, core, 0, y0 + H / 2, 0); c.scale.set(W * .92, H * .92, D * .92); }
  const area = form === 'hack' ? 2 * (W + D) * H + W * D : Math.PI * (W + D) / 2 * H;
  const kind = lov === 'barr' ? 'barr' : 'klunga', size = lov === 'barr' ? .32 : .3, n = Math.min(900, Math.round(area / (size * size) * 3.2));
  const list = [];
  for (let i = 0; i < n; i++) { const { p, n: nn } = shapeAt(form, W, D, H, y0, r(), r()); const jit = new THREE.Vector3(r() - .5, r() - .5, r() - .5).multiplyScalar(.9);
    list.push({ s: size * (.75 + r() * .5), p: p.addScaledVector(nn, (r() - .4) * .08), n: nn.clone().add(jit).normalize(), spin: lov === 'barr' ? (r() - .5) * .8 + (form === 'kon' ? 0 : 0) : r() * 6.28 }); }
  // barr: lite varierad grönska i två toner
  if (lov === 'barr') { const half = list.length / 2 | 0; cards(leafMat('barr', col), list.slice(0, half)); cards(leafMat('barr', new THREE.Color(col).lerp(new THREE.Color('#9fb38a'), .18).getStyle()), list.slice(half)); }
  else { const half = list.length / 2 | 0; cards(leafMat('klunga', col), list.slice(0, half)); cards(leafMat('klunga', new THREE.Color(col).lerp(new THREE.Color('#c9d86a'), .15).getStyle()), list.slice(half)); }
  if (lov === 'blommor') { const fl = [], m = Math.round(n * (o.tathet ?? .35));
    for (let i = 0; i < m; i++) { const { p, n: nn } = shapeAt(form, W, D, H, y0, r(), form === 'hack' || form === 'rund' ? .15 + r() * .85 : r()); fl.push({ s: .16 + r() * .1, p: p.addScaledVector(nn, .05), n: nn, spin: r() * 6.28 }); }
    cards(leafMat('blomma', o.blomfarg || '#e7a6c4'), fl); }
}
function pot(o, M, pr, ph) {
  if (o.kruka === 'ingen') return 0;
  if (o.kruka === 'konisk') cyl(pr, pr * .75, ph, M.kruka, 0, 0, 0, 32);
  else if (o.kruka === 'fot') { cyl(pr, pr * .9, ph * .8, M.kruka, 0, ph * .2, 0, 32); for (let i = 0; i < 3; i++) { const a = i * 2.1; cyl(.012, .01, ph * .3, makeMat('ek'), Math.cos(a) * pr * .6, 0, Math.sin(a) * pr * .6, 8); } }
  else if (o.kruka === 'lada') box(pr * 2, ph, pr * 2, M.kruka, 0, 0, 0, .01);
  else cyl(pr, pr * .95, ph, M.kruka, 0, 0, 0, 32);
  const soil = cyl(pr * .93, pr * .93, .01, makeMat('matt', '#3a2b20'), 0, ph - .03, 0, 24); soil.castShadow = false; return ph - .02;
}
function plant(it, o, M) {
  const H = it.h, pr = Math.min(it.w, it.d) / 2 * .8, r = rnd(it.seed || 3), col = o.bladfarg || '#3d6b34';
  const ph = pot(o, M, pr, Math.min(.45, H * .3)) || 0;
  if (o.typ === 'fikus') { const trunk = makeMat('valnot', '#5a4636'); tube([[0, ph, 0], [.02, H * .5, .01], [-.01, H * .85, 0]], .015, trunk);
    const lm = leafMat('oval', col); for (let i = 0; i < 46; i++) { const y = H * .45 + r() * H * .5, a = r() * 6.28, d = r() * .25 * (1 - (y - H * .7) ** 2 * 4);
      leaf(lm, .2 + r() * .1, Math.cos(a) * d, y, Math.sin(a) * d, a + 1.57, -.6 - r() * .7, .2); } }
  else if (o.typ === 'monstera') { const lm = leafMat('monstera', col), stem = makeMat('matt', '#4e7a3b');
    for (let i = 0; i < 9; i++) { const a = i * 2.4 + r(), hh = ph + .2 + r() * (H - ph - .35), d = .12 + r() * .25;
      tube([[0, ph, 0], [Math.cos(a) * d * .3, hh * .7, Math.sin(a) * d * .3], [Math.cos(a) * d, hh, Math.sin(a) * d]], .006, stem);
      leaf(lm, .32 + r() * .15, Math.cos(a) * d, hh, Math.sin(a) * d, 0, -1.0 - r() * .3, .25).rotation.y = -a + Math.PI / 2; } }
  else if (o.typ === 'gras') { const lm = leafMat('gras', col); for (let i = 0; i < 40; i++) { const a = r() * 6.28; const l = leaf(lm, H - ph, Math.cos(a) * .04, ph, Math.sin(a) * .04, a, -.15 - r() * .35, .5); l.scale.x = .25; } }
  else if (o.typ === 'blomma') { const lm = leafMat('oval', col), fm = leafMat('blomma', o.blomfarg || '#e7a6c4');
    for (let i = 0; i < 22; i++) { const a = r() * 6.28; leaf(lm, .12 + r() * .06, Math.cos(a) * .03, ph, Math.sin(a) * .03, a, -.9 - r() * .5, .25); }
    for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = r() * pr * .7, hh = ph + (H - ph) * (.6 + r() * .4); tube([[0, ph, 0], [Math.cos(a) * d * .5, (ph + hh) / 2, Math.sin(a) * d * .5], [Math.cos(a) * d, hh, Math.sin(a) * d]], .004, makeMat('matt', '#4e7a3b'));
      const f = leaf(fm, .14, Math.cos(a) * d, hh - .07, Math.sin(a) * d, a, -.25, .05); f.rotation.x = -Math.PI / 2 + .3; } }
  else if (o.typ === 'kaktus') { const lm = makeMat('matt', col); for (let i = 0; i < 5; i++) { const a = i * 1.3, hh = (H - ph) * (.5 + r() * .5); const c = add(new THREE.CapsuleGeometry(.05, hh, 6, 12), lm, Math.cos(a) * pr * .45 * (i ? 1 : 0), ph + hh / 2, Math.sin(a) * pr * .45 * (i ? 1 : 0)); c.rotation.z = (i ? .15 : 0) * Math.cos(a); } }
  else { // buske i kruka (oliv, buxbom …)
    if (o.form !== 'hack') { cyl(.015, .02, H * .35, makeMat('valnot', '#5a4636'), 0, ph, 0, 10); }
    const fh = o.form === 'hack' ? H - ph : (H - ph) * .75; foliage(it, o, it.w * .95, it.d * .95, fh, H - fh); }
}
function bush(it, o, M) {
  const W = it.w, D = it.d, H = it.h, ph = pot(o, M, Math.min(W, D) * .35, Math.min(.5, H * .3)) || 0;
  if (o.stam) { const th = (H - ph) * .4; cyl(.02, .03, th + .1, makeMat('valnot', '#5a4636'), 0, ph, 0, 10); foliage(it, o, W, D, H - ph - th, ph + th); }
  else foliage(it, o, W, D, H - ph, ph);
}

// ---------- REGISTRET ----------
// t: sel (val), num (reglage), bool (av/på), color (färg), mods (köksmoduler). if: visas bara när villkoret gäller.
// slots: [nyckel, rubrik, materialgrupp, standardmaterial, standardfärg?]
const SOFA_OPTS = [
  { k: 'form', t: 'sel', label: 'Form', v: 'rak', o: [['rak', 'Rak'], ['schV', 'Schäslong v.'], ['schH', 'Schäslong h.'], ['hornV', 'Hörn v.'], ['hornH', 'Hörn h.']] },
  { k: 'd2', t: 'num', label: 'Schäslong/hörn, längd', v: 1.6, min: 1.3, max: 2.8, step: .05, unit: 'm', if: o => o.form !== 'rak' },
  { k: 'sits', t: 'sel', label: 'Sittdynor', v: 3, o: [[1, '1'], [2, '2'], [3, '3'], [4, '4']] },
  { k: 'armar', t: 'sel', label: 'Armstöd', v: 'smala', o: [['smala', 'Smala'], ['raka', 'Raka'], ['breda', 'Breda'], ['rundade', 'Rundade'], ['inga', 'Inga']] },
  { k: 'armH', t: 'num', label: 'Armstödshöjd', v: .62, min: .5, max: .75, step: .01, unit: 'm', if: o => o.armar !== 'inga' },
  { k: 'rygg', t: 'sel', label: 'Rygg', v: 'kuddar', o: [['kuddar', 'Lösa ryggdynor'], ['fast', 'Fast rygg']] },
  { k: 'sitth', t: 'num', label: 'Sitthöjd', v: .44, min: .38, max: .5, step: .01, unit: 'm' },
  { k: 'ben', t: 'sel', label: 'Ben', v: 'tra', o: [['tra', 'Runda'], ['kloss', 'Fyrkantiga'], ['metall', 'Smala metall'], ['medar', 'Medar'], ['dolda', 'Dolda']] },
  { k: 'benH', t: 'num', label: 'Benhöjd', v: .12, min: .04, max: .22, step: .01, unit: 'm', if: o => o.ben !== 'dolda' },
  { k: 'kuddar', t: 'num', label: 'Prydnadskuddar', v: 2, min: 0, max: 6, step: 1 },
];
const KITCHEN_OPTS = [
  { k: 'mods', t: 'mods', label: 'Skåp (vänster → höger)', v: [{ t: 'kyl', w: .6 }, { t: 'lador', w: .6 }, { t: 'disk', w: .8 }, { t: 'diskmaskin', w: .6 }, { t: 'spis', w: .6 }, { t: 'lador', w: .4 }] },
  { k: 'frontstil', t: 'sel', label: 'Luckor', v: 'slat', o: FRONT_STYLES },
  { k: 'handtag', t: 'sel', label: 'Handtag', v: 'bygel', o: HANDLES, if: o => o.frontstil !== 'greppfri' },
  { k: 'overskap', t: 'bool', label: 'Överskåp', v: true },
  { k: 'flakt', t: 'sel', label: 'Köksfläkt', v: 'vagg', o: [['vagg', 'Väggfläkt'], ['inbyggd', 'Inbyggd'], ['ingen', 'Ingen']] },
  { k: 'stank', t: 'bool', label: 'Stänkskydd', v: true },
  { k: 'belysning', t: 'bool', label: 'Bänkbelysning', v: true, if: o => o.overskap },
  { k: 'bankT', t: 'sel', label: 'Bänkskiva, tjocklek', v: .03, o: [[.012, '12 mm'], [.02, '20 mm'], [.03, '30 mm'], [.04, '40 mm']] },
  { k: 'bankH', t: 'num', label: 'Bänkhöjd', v: .9, min: .85, max: .96, step: .01, unit: 'm' },
  { k: 'sockel', t: 'num', label: 'Sockel', v: .1, min: .08, max: .15, step: .01, unit: 'm' },
];
export const FURN = {
  soffa: { name: 'Soffa', icon: '🛋️', cat: 'vardag', w: 2.3, d: .95, h: .82, dims: { w: [1.3, 3.8], d: [.8, 1.15], h: [.65, 1.0] }, opts: SOFA_OPTS,
    slots: [['kladsel', 'Klädsel', 'textil', 'tyg', '#8b8f86'], ['kuddar', 'Prydnadskuddar', 'textil', 'linne', '#c8b393'], ['ben', 'Ben', 'ben', 'ek']], build: sofa,
    foot: (it, o) => { const L = o.d2 || 1.6, s = o.form?.endsWith('H') ? 1 : -1; if (o.form === 'rak') return null; const aw = ARMW[o.armar] ?? .14, ew = o.form.startsWith('horn') ? it.d : (it.w - 2 * aw) / o.sits + aw; return { x: s * (it.w / 2 - ew / 2), z: it.d / 2 + (L - it.d) / 2, w: ew, d: L - it.d }; } },
  fatolj: { name: 'Fåtölj', icon: '💺', cat: 'vardag', w: .85, d: .88, h: .82, dims: { w: [.65, 1.1], d: [.7, 1.0], h: [.7, 1.15] },
    opts: [{ k: 'vinge', t: 'bool', label: 'Öronlappar (hög rygg)', v: false }, ...SOFA_OPTS.filter(x => !['form', 'd2', 'sits'].includes(x.k)).map(x => x.k === 'kuddar' ? { ...x, v: 1, max: 2 } : x.k === 'armar' ? { ...x, v: 'breda' } : x)],
    slots: [['kladsel', 'Klädsel', 'textil', 'sammet', '#3f5a4c'], ['kuddar', 'Kudde', 'textil', 'linne', '#c8b393'], ['ben', 'Ben', 'ben', 'valnot']],
    build: (it, o, M) => sofa(it, { ...o, sits: 1, form: 'rak' }, M), sync: (it, o) => { if (o.vinge && it.h < 1) it.h = 1.05; } },
  soffbord: { name: 'Soffbord', icon: '▭', cat: 'vardag', w: 1.2, d: .6, h: .42, dims: { w: [.4, 1.8], d: [.4, 1.2], h: [.3, .55] },
    opts: [{ k: 'form', t: 'sel', label: 'Form', v: 'rekt', o: [['rekt', 'Rektangulär'], ['oval', 'Oval'], ['rund', 'Rund']] },
      { k: 'ben', t: 'sel', label: 'Ben', v: 'konisk', o: [['konisk', 'Koniska'], ['4ben', 'Raka'], ['hårnål', 'Hårnål'], ['pelare', 'Pelarfot'], ['ram', 'Ram']] },
      { k: 'tjocklek', t: 'sel', label: 'Skiva', v: .025, o: [[.012, '12 mm'], [.025, '25 mm'], [.04, '40 mm']] }, { k: 'hylla', t: 'bool', label: 'Hylla under', v: true }],
    slots: [['skiva', 'Skiva', 'skiva', 'ek'], ['ben', 'Ben', 'ben', 'ek']], build: table, sync: (it, o) => { if (o.form === 'rund') it.d = it.w; } },
  matbord: { name: 'Matbord', icon: '🍽️', cat: 'kok', w: 1.8, d: .9, h: .74, dims: { w: [.7, 3.2], d: [.7, 1.2], h: [.7, 1.1] },
    opts: [{ k: 'form', t: 'sel', label: 'Form', v: 'rekt', o: [['rekt', 'Rektangulär'], ['oval', 'Oval'], ['rund', 'Rund']] },
      { k: 'ben', t: 'sel', label: 'Ben', v: '4ben', o: [['4ben', 'Raka'], ['konisk', 'Koniska'], ['bock', 'Bockben'], ['pelare', 'Pelarfot'], ['ram', 'Metallram']] },
      { k: 'tjocklek', t: 'sel', label: 'Skiva', v: .03, o: [[.02, '20 mm'], [.03, '30 mm'], [.045, '45 mm']] }, { k: 'stolar', t: 'num', label: 'Platser (60 cm/person)', v: 6, min: 0, max: 12, step: 1, info: 1 }],
    slots: [['skiva', 'Skiva', 'skiva', 'ek'], ['ben', 'Ben', 'ben', 'ek']], build: table, sync: (it, o) => { if (o.form === 'rund') it.d = it.w; o.stolar = it.w >= 1 ? Math.floor(it.w / .6) * 2 + (o.form === 'rund' ? 0 : 0) : 2; } },
  stol: { name: 'Stol', icon: '🪑', cat: 'kok', w: .45, d: .52, h: .82, dims: { w: [.4, .7], d: [.45, .7], h: [.75, 1.0] },
    opts: [{ k: 'stil', t: 'sel', label: 'Modell', v: 'tra', o: [['tra', 'Pinnstol'], ['stoppad', 'Stoppad'], ['skal', 'Skalstol'], ['karm', 'Karmstol, helklädd']] },
      { k: 'sitth', t: 'num', label: 'Sitthöjd', v: .46, min: .42, max: .52, step: .01, unit: 'm' },
      { k: 'armH', t: 'num', label: 'Armstödshöjd', v: .66, min: .6, max: .75, step: .01, unit: 'm', if: o => o.stil === 'karm' }],
    slots: [['stomme', 'Stomme', 'ben', 'ek'], ['sits', 'Sits', 'textil', 'tyg', '#b9ae9a']], build: chair },
  kok: { name: 'Köksrad', icon: '🍳', cat: 'kok', w: 3.6, d: .635, h: 2.2, fixed: 1, opts: KITCHEN_OPTS,
    slots: [['front', 'Luckor', 'front', 'matt', '#efece6'], ['bank', 'Bänkskiva', 'bank', 'ek'], ['stank', 'Stänkskydd', 'stank', 'kakel'], ['handtag', 'Handtag', 'metall', 'svartmetall'],
      ['stomme', 'Stomme', 'front', 'matt', '#efece6'], ['sockel', 'Sockel', 'front', 'matt', '#efece6'], ['ho', 'Diskho', 'metall', 'rostfritt'], ['kran', 'Kran', 'metall', 'krom']],
    build: kitchen, sync: (it, o) => { it.w = +o.mods.reduce((s, m) => s + m.w, 0).toFixed(3) || .6; it.h = o.toppH || 2.2; } },
  sang: { name: 'Säng', icon: '🛏️', cat: 'sov', w: 1.66, d: 2.12, h: 1.1, fixed: 1,
    opts: [{ k: 'storlek', t: 'sel', label: 'Bredd (madrass)', v: 160, o: [[90, '90'], [120, '120'], [140, '140'], [160, '160'], [180, '180'], [210, '210']] },
      { k: 'typ', t: 'sel', label: 'Typ', v: 'ram', o: [['ram', 'Sängram'], ['kontinental', 'Kontinental']] },
      { k: 'gavel', t: 'sel', label: 'Sänggavel', v: 'stoppad', o: [['stoppad', 'Stoppad'], ['tra', 'Trä'], ['spjal', 'Spjäl'], ['ingen', 'Ingen']] },
      { k: 'gavelH', t: 'num', label: 'Gavelhöjd', v: 1.1, min: .8, max: 1.5, step: .05, unit: 'm', if: o => o.gavel !== 'ingen' },
      { k: 'ben', t: 'sel', label: 'Ben', v: 'tra', o: [['tra', 'Trä'], ['metall', 'Metall']] },
      { k: 'kuddar', t: 'num', label: 'Kuddar per sida', v: 2, min: 1, max: 3, step: 1 }, { k: 'overkast', t: 'bool', label: 'Överkast', v: true }],
    slots: [['kladsel', 'Sängkläder', 'textil', 'linne', '#e8e4dc'], ['overkast', 'Överkast', 'textil', 'tyg', '#9aa29a'], ['gavel', 'Gavel', 'textil', 'tyg', '#7d837a'], ['ram', 'Ram', 'stomme', 'ek'], ['ben', 'Ben', 'ben', 'ek']],
    build: bed, sync: (it, o) => { it.w = o.storlek / 100 + (o.typ === 'ram' ? .06 : 0); it.d = 2.04 + (o.gavel === 'ingen' ? 0 : .08); it.h = o.gavel === 'ingen' ? .6 : o.gavelH; } },
  garderob: { name: 'Garderob', icon: '🚪', cat: 'sov', w: 1.5, d: .6, h: 2.36, dims: { w: [.4, 4], d: [.35, .7], h: [1.8, 2.6] },
    opts: [{ k: 'typ', t: 'sel', label: 'Dörrar', v: 'gangjarn', o: [['gangjarn', 'Vanliga'], ['skjut', 'Skjutdörrar']] }, { k: 'dorrar', t: 'num', label: 'Antal dörrar', v: 3, min: 1, max: 8, step: 1 },
      { k: 'frontstil', t: 'sel', label: 'Front', v: 'slat', o: FRONT_STYLES.filter(f => f[0] !== 'greppfri') }, { k: 'handtag', t: 'sel', label: 'Handtag', v: 'list', o: HANDLES }, { k: 'spegel', t: 'bool', label: 'Spegeldörr', v: false }],
    slots: [['front', 'Front', 'front', 'matt', '#efece6'], ['stomme', 'Stomme', 'front', 'matt', '#efece6'], ['handtag', 'Handtag', 'metall', 'svartmetall']], build: wardrobe },
  bokhylla: { name: 'Bokhylla', icon: '📚', cat: 'vardag', w: 1.6, d: .32, h: 2.0, dims: { w: [.4, 4], d: [.2, .45], h: [.6, 2.6] },
    opts: [{ k: 'sektioner', t: 'num', label: 'Sektioner', v: 2, min: 1, max: 6, step: 1 }, { k: 'hyllor', t: 'num', label: 'Hyllplan', v: 5, min: 2, max: 8, step: 1 },
      { k: 'bak', t: 'bool', label: 'Bakstycke', v: true }, { k: 'bocker', t: 'bool', label: 'Böcker', v: true }],
    slots: [['stomme', 'Stomme', 'stomme', 'matt', '#efece6']], build: shelf },
  tvbank: { name: 'TV-bänk / sideboard', icon: '▬', cat: 'vardag', w: 1.8, d: .42, h: .5, dims: { w: [.6, 3], d: [.3, .55], h: [.3, .9] },
    opts: [{ k: 'front', t: 'sel', label: 'Front', v: 'ribbor', o: [['luckor', 'Luckor'], ['lador', 'Lådor'], ['ribbor', 'Ribbade'], ['oppen', 'Öppen']] },
      { k: 'frontstil', t: 'sel', label: 'Luckstil', v: 'slat', o: FRONT_STYLES, if: o => o.front === 'luckor' || o.front === 'lador' },
      { k: 'handtag', t: 'sel', label: 'Handtag', v: 'knopp', o: HANDLES, if: o => o.front === 'luckor' || o.front === 'lador' },
      { k: 'ben', t: 'sel', label: 'Ben', v: 'ben', o: [['ben', 'Ben'], ['sockel', 'Sockel'], ['vagg', 'Vägghängd']] }],
    slots: [['stomme', 'Stomme', 'stomme', 'valnot'], ['front', 'Front', 'front', 'valnot'], ['handtag', 'Handtag', 'metall', 'massing'], ['ben', 'Ben', 'ben', 'valnot']], build: sideboard },
  tv: { name: 'TV', icon: '📺', cat: 'media', w: 1.25, d: .25, h: .75, fixed: 1, onTop: 1,
    opts: [{ k: 'tum', t: 'sel', label: 'Storlek', v: 55, o: [[43, '43"'], [50, '50"'], [55, '55"'], [65, '65"'], [75, '75"'], [85, '85"']] },
      { k: 'montering', t: 'sel', label: 'Montering', v: 'fot', o: [['fot', 'På fot'], ['vagg', 'På vägg']] }, { k: 'hojd', t: 'num', label: 'Höjd till underkant', v: 1.0, min: .5, max: 1.8, step: .01, unit: 'm', if: o => o.montering === 'vagg' }],
    slots: [], build: tv, sync: (it, o) => { it.w = o.tum * .0254 * .872 + .02; it.h = o.tum * .0254 * .49 + (o.montering === 'vagg' ? o.hojd : .1); } },
  matta: { name: 'Matta', icon: '🟫', cat: 'vardag', w: 2.4, d: 1.7, h: .015, dims: { w: [.6, 4], d: [.6, 4] }, flat: 1,
    opts: [{ k: 'form', t: 'sel', label: 'Form', v: 'rekt', o: [['rekt', 'Rektangulär'], ['rund', 'Rund']] },
      { k: 'monster', t: 'sel', label: 'Mönster', v: 'kant', o: [['enfargad', 'Enfärgad'], ['kant', 'Bård'], ['rand', 'Ränder'], ['ruta', 'Rutor'], ['berber', 'Berber']] },
      { k: 'farg2', t: 'color', label: 'Mönsterfärg', v: '#8a7a64', if: o => o.monster !== 'enfargad' }],
    slots: [['matta', 'Matta', 'matta', 'ull']], build: rug, sync: (it, o) => { if (o.form === 'rund') it.d = it.w; } },
  taklampa: { name: 'Taklampa', icon: '💡', cat: 'ljus', w: .4, d: .4, h: .7, fixed: 1, lamp: 1, ceil: 1,
    opts: [{ k: 'stil', t: 'sel', label: 'Modell', v: 'kupa', o: [['kupa', 'Kupa'], ['glob', 'Glob'], ['kon', 'Tygskärm']] }, { k: 'storlek', t: 'num', label: 'Diameter', v: .4, min: .2, max: .8, step: .05, unit: 'm' },
      { k: 'hang', t: 'num', label: 'Pendellängd', v: .75, min: .2, max: 1.5, step: .05, unit: 'm' }, { k: 'temp', t: 'sel', label: 'Ljusfärg', v: 2700, o: [[2200, 'Mysigt'], [2700, 'Varmt'], [3000, 'Neutralt'], [4000, 'Kallt']] }],
    slots: [['skarm', 'Skärm', 'skarm', 'svartmetall'], ['stomme', 'Takkopp', 'metall', 'svartmetall']], build: pendant, sync: (it, o) => { it.w = it.d = o.storlek; it.h = o.hang; } },
  golvlampa: { name: 'Golvlampa', icon: '🪔', cat: 'ljus', w: .4, d: .4, h: 1.55, dims: { h: [1.1, 1.9] }, lamp: 1,
    opts: [{ k: 'stil', t: 'sel', label: 'Modell', v: 'skarm', o: [['skarm', 'Med skärm'], ['bage', 'Båglampa'], ['spot', 'Läslampa']] }, { k: 'temp', t: 'sel', label: 'Ljusfärg', v: 2700, o: [[2200, 'Mysigt'], [2700, 'Varmt'], [3000, 'Neutralt'], [4000, 'Kallt']] }],
    slots: [['skarm', 'Skärm', 'skarm', 'linne', '#efe7d8'], ['stomme', 'Stativ', 'metall', 'massing']], build: floorlamp },
  bordslampa: { name: 'Bordslampa', icon: '🕯️', cat: 'ljus', w: .3, d: .3, h: .5, dims: { h: [.3, .8] }, lamp: 1, onTop: 1,
    opts: [{ k: 'temp', t: 'sel', label: 'Ljusfärg', v: 2200, o: [[2200, 'Mysigt'], [2700, 'Varmt'], [3000, 'Neutralt'], [4000, 'Kallt']] }],
    slots: [['skarm', 'Skärm', 'skarm', 'linne', '#efe7d8'], ['fot', 'Fot', 'kruka', 'keramik', '#6f7b6a']], build: tablelamp },
  vaxt: { name: 'Krukväxt', icon: '🪴', cat: 'vardag', w: .5, d: .5, h: 1.3, dims: { w: [.25, 1.2], h: [.3, 2.4] },
    opts: [{ k: 'typ', t: 'sel', label: 'Växt', v: 'fikus', o: [['fikus', 'Fikus'], ['monstera', 'Monstera'], ['blomma', 'Blommande'], ['buske', 'Buske/oliv'], ['gras', 'Gräs'], ['kaktus', 'Kaktus']] },
      { k: 'form', t: 'sel', label: 'Form', v: 'rund', o: [['rund', 'Rund'], ['kon', 'Kon'], ['pelare', 'Pelare'], ['hack', 'Kub']], if: o => o.typ === 'buske' },
      { k: 'lov', t: 'sel', label: 'Bladverk', v: 'blad', o: [['blad', '🍃 Blad'], ['barr', '🌲 Barr'], ['blommor', '🌸 Blommor']], if: o => o.typ === 'buske' },
      { k: 'bladfarg', t: 'color', label: 'Bladfärg', v: '#3d6b34', pal: ['#2f5a2c', '#3d6b34', '#5d8a3a', '#7f9a4c', '#8aa07a', '#2a4a3a', '#6b2f2f', '#8f7a3a'] },
      { k: 'blomfarg', t: 'color', label: 'Blomfärg', v: '#e7a6c4', pal: ['#f4f1ea', '#e7a6c4', '#c2185b', '#d64045', '#f2c14e', '#ef8a3c', '#8e7cc3', '#5a7bd8'], if: o => o.typ === 'blomma' || (o.typ === 'buske' && o.lov === 'blommor') },
      { k: 'kruka', t: 'sel', label: 'Kruka', v: 'cyl', o: [['cyl', 'Rak'], ['konisk', 'Konisk'], ['fot', 'På ben'], ['lada', 'Låda']] }],
    slots: [['kruka', 'Kruka', 'kruka', 'terrazzo']], build: plant },
  buske: { name: 'Buske / häck', icon: '🌳', cat: 'ute', w: 1.0, d: 1.0, h: 1.0, dims: { w: [.3, 6], d: [.3, 3], h: [.3, 4] },
    opts: [{ k: 'form', t: 'sel', label: 'Form', v: 'rund', o: [['rund', 'Rund'], ['kon', 'Kon (tuja)'], ['pelare', 'Pelare'], ['hack', 'Häck']] },
      { k: 'lov', t: 'sel', label: 'Bladverk', v: 'blommor', o: [['blad', '🍃 Blad'], ['barr', '🌲 Barr'], ['blommor', '🌸 Blommor']] },
      { k: 'bladfarg', t: 'color', label: 'Bladfärg', v: '#3d6b34', pal: ['#2f5a2c', '#3d6b34', '#5d8a3a', '#7f9a4c', '#8aa07a', '#2a4a3a', '#6b2f2f', '#8f7a3a', '#c46a2a'] },
      { k: 'blomfarg', t: 'color', label: 'Blomfärg', v: '#9db7e8', pal: ['#f4f1ea', '#e7a6c4', '#c2185b', '#d64045', '#f2c14e', '#ef8a3c', '#8e7cc3', '#9db7e8'], if: o => o.lov === 'blommor' },
      { k: 'tathet', t: 'num', label: 'Mängd blommor', v: .35, min: .1, max: .8, step: .05, if: o => o.lov === 'blommor' },
      { k: 'stam', t: 'bool', label: 'På stam', v: false, if: o => o.form === 'rund' },
      { k: 'kruka', t: 'sel', label: 'Kruka', v: 'ingen', o: [['ingen', 'I marken'], ['cyl', 'Rak kruka'], ['konisk', 'Konisk'], ['lada', 'Odlingslåda']] }],
    slots: [['kruka', 'Kruka', 'kruka', 'betong']], build: bush, sync: (it, o) => { if (o.form === 'hack' && it.w < 1.5) { it.w = 2.5; it.d = .6; it.h = 1.2; } } },
};

// Ny möbel med standardval
let seedN = 1;
export function newFurniture(type, extra = {}) {
  const F = FURN[type], it = { type, w: F.w, d: F.d, h: F.h, x: 0, y: 0, rot: 0, seed: (Date.now() % 9973) + seedN++, o: {}, m: {}, ...extra };
  for (const op of F.opts) if (!(op.k in it.o)) it.o[op.k] = Array.isArray(op.v) ? op.v.map(m => ({ ...m })) : op.v;
  for (const [k, , , mat, color] of F.slots) if (!it.m[k]) it.m[k] = { mat, color: color || null };
  F.sync?.(it, it.o); return it;
}
export function syncFurniture(it) { FURN[it.type]?.sync?.(it, it.o); }

// Bygger möbeln som en grupp (origo på golvet, mitt i möbeln).
export function buildFurniture(it) {
  const F = FURN[it.type]; const g = new THREE.Group(); G = g;
  const M = new Proxy({}, { get: (_, k) => { const s = it.m[k]; return s ? makeMat(s.mat, s.color) : null; } });
  try { F.build(it, it.o, M); } catch (e) { console.error('möbel', it.type, e); }
  G = null; return g;
}
