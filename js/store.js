// Datamodell, sparning, ångra och mallar.
import { ITEMS, OPENINGS } from './catalog.js?v=1794344368';

export const uid = () => Math.random().toString(36).slice(2, 10);
const KEY = 'hemma.v1';
const r3 = v => Math.round(v * 1000) / 1000;

export const S = {
  homes: [], cur: null, ha: { url: '', token: '' },
  mode: 'styr', tool: 'select', view: '3d', sel: null, placing: null, day: false, walls: 'halva', focus: null, level: null, showAll: false,
};

const listeners = [];
export const on = f => listeners.push(f);
let saveT = 0;
// kind: 'full' (allt ritas om), 'item' (bara flytt av ett objekt), 'state' (lampor/dörrar), 'sel' (markering)
export function emit(kind = 'full', id) {
  for (const f of listeners) f(kind, id);
  if (kind !== 'sel') { clearTimeout(saveT); saveT = setTimeout(save, 500); }
}
// Våningar: varje våning har egna väggar/rum/öppningar/saker. home() ger en vy av den aktiva våningen.
const LEVEL_KEYS = new Set(['walls', 'rooms', 'openings', 'items', 'ceiling', 'bg', 'ignore']);
export function ensureLevels(h) {
  if (!h.levels) { h.levels = [{ id: uid(), name: 'Plan 1', z: 0, walls: h.walls || [], rooms: h.rooms || [], openings: h.openings || [], items: h.items || [], ceiling: h.ceiling || 2.5, bg: h.bg || null }];
    for (const k of LEVEL_KEYS) delete h[k]; }
  return h;
}
export function levelView(raw, L) {
  return new Proxy(raw, { get(t, k) { if (LEVEL_KEYS.has(k)) return L[k]; if (k === '__raw') return t; if (k === '__level') return L; return t[k]; },
    set(t, k, v) { if (LEVEL_KEYS.has(k)) L[k] = v; else t[k] = v; return true; } });
}
export const rawHome = () => S.homes.find(h => h.id === S.cur);
export function home() { const raw = rawHome(); if (!raw) return raw; ensureLevels(raw);
  const L = raw.levels.find(l => l.id === S.level) || raw.levels.find(l => l.z === 0) || raw.levels[0]; S.level = L.id; return levelView(raw, L); }
export function addLevel(raw, kind) {
  const cur = raw.levels.find(l => l.id === S.level) || raw.levels[0], top = raw.levels[raw.levels.length - 1], bottom = raw.levels[0];
  const L = { id: uid(), name: '', z: 0, walls: [], rooms: [], openings: [], items: [], ceiling: cur.ceiling || 2.5, bg: null };
  if (kind === 'kallare') { L.z = r3(bottom.z - 2.4 - .3); L.ceiling = 2.4; raw.levels.unshift(L); }
  else { L.z = r3(top.z + (top.ceiling || 2.5) + .3); raw.levels.push(L); }
  if (kind === 'kopia') { const map = new Map();
    for (const w of cur.walls) { const nw = JSON.parse(JSON.stringify(w)); nw.id = uid(); map.set(w.id, nw.id); L.walls.push(nw); }
    for (const o of cur.openings) { const no = JSON.parse(JSON.stringify(o)); no.id = uid(); no.wall = map.get(o.wall); if (no.key === 'ytterdorr' || no.key === 'garageport') { no.key = 'fonster'; no.kind = 'window'; no.sill = .9; no.h = 1.2; no.w = Math.min(no.w, 1.2); } if (no.wall) L.openings.push(no); }
    for (const r of cur.rooms) if (!r.outdoor) { const nr = JSON.parse(JSON.stringify(r)); nr.id = uid(); L.rooms.push(nr); } }
  raw.levels.forEach((l, i) => { if (!l.name || /^Plan \d+$|^Källare$/.test(l.name)) l.name = l.z < 0 ? 'Källare' : 'Plan ' + (raw.levels.filter(x => x.z >= 0).indexOf(l) + 1); });
  return L;
}

let lastSaved = '';
export function save() {
  const data = JSON.stringify({ homes: S.homes, cur: S.cur, ha: S.ha });
  try { const now = localStorage.getItem(KEY); if (lastSaved && now && now !== lastSaved && now !== data) window.toast?.('⚠️ Hemma är öppet i en annan flik som sparar över – stäng de andra flikarna');
    localStorage.setItem(KEY, data); lastSaved = data; }
  catch (e) { // för stort – spara utan planritningsbilderna hellre än inte alls
    try { const slim = JSON.parse(data); slim.homes.forEach(h => (h.levels || []).forEach(L => { if (L.bg) L.bg = null; }));
      localStorage.setItem(KEY, JSON.stringify(slim)); window.toast?.('Sparat – men planritningsbilden var för stor för att sparas'); }
    catch (e2) { window.toast?.('⚠️ Kunde inte spara! Använd "Spara som fil"'); } }
}
// Om Hemma är öppet i en annan flik: ta in dess ändringar i stället för att skriva över varandra
export function syncFromStorage(json) {
  if (!json || json === lastSaved) return false;
  try { const d = JSON.parse(json); if (!d.homes?.length) return false; S.homes = d.homes; migrate(S.homes); if (!S.homes.some(h => h.id === S.cur)) S.cur = S.homes[0].id; lastSaved = json; return true; } catch (e) { return false; }
}
export const STORAGE_KEY = KEY;
export function flushSave() { clearTimeout(saveT); save(); }
export function load() {
  try {
    const txt = localStorage.getItem(KEY); lastSaved = txt || ''; const d = JSON.parse(txt || 'null');
    if (d && d.homes && d.homes.length) {
      S.homes = d.homes; migrate(S.homes); S.cur = d.homes.some(h => h.id === d.cur) ? d.cur : d.homes[0].id; S.ha = d.ha || S.ha; return;
    }
  } catch (e) { /* börja om */ }
  const h = template('villa'); S.homes = [h]; S.cur = h.id;
}

// äldre sparade hem: fönsterdörrar var fönster förut
export function migrate(homes) { for (const raw of homes) { ensureLevels(raw); if (raw.autoRooms === false && !raw.manualChosen) { raw.autoRooms = true; raw.levels.forEach(L => L.rooms.forEach(r => { if (!r.outdoor) r.custom = true; })); } for (const L of raw.levels) { const h = levelView(raw, L); mergeWalls(h); splitWalls(h); for (const o of h.openings || []) if (o.key === 'fonsterdorr' && o.kind === 'window') { o.kind = 'door'; o.glass = true; o.hinge = o.hinge || 'L'; o.swing = o.swing || 1; o.blind = 'none'; } } } }

// Slår ihop väggbitar som fortsätter rakt i varandra (och där ingen tredje vägg möter) till en hel vägg.
// Fönster/dörrar flyttas med. Ger hela väggar hörn till hörn så att hörnen blir rena.
export function mergeWalls(h) {
  const key = p => Math.round(p.x * 200) + ',' + Math.round(p.y * 200);
  for (let changed = true; changed;) { changed = false;
    const nodes = new Map();
    for (const w of h.walls) for (const e of ['a', 'b']) { const k = key(w[e]); if (!nodes.has(k)) nodes.set(k, []); nodes.get(k).push([w, e]); }
    for (const list of nodes.values()) {
      if (list.length !== 2) continue;
      const [[w1, e1], [w2, e2]] = list; if (w1 === w2 || !!w1.virtual !== !!w2.virtual) continue;
      const o1 = w1[e1 === 'a' ? 'b' : 'a'], o2 = w2[e2 === 'a' ? 'b' : 'a'], P = w1[e1];
      const d1 = Math.atan2(P.y - o1.y, P.x - o1.x), d2 = Math.atan2(o2.y - P.y, o2.x - P.x);
      let da = Math.abs(d1 - d2); if (da > Math.PI) da = 2 * Math.PI - da; if (da > 4 * Math.PI / 180) continue;
      const L1 = wallLen(w1), L2 = wallLen(w2), L = Math.hypot(o2.x - o1.x, o2.y - o1.y);
      const nw = { ...(L1 >= L2 ? w1 : w2), id: w1.id, a: { ...o1 }, b: { ...o2 }, t: Math.round((w1.t * L1 + w2.t * L2) / (L1 + L2) * 100) / 100 };
      const flip = (L1 >= L2 ? e1 === 'a' : e2 === 'b');   // vald vägg vände åt andra hållet → byt sidor
      if (flip) { [nw.colorP, nw.colorN] = [nw.colorN, nw.colorP]; [nw.matP, nw.matN] = [nw.matN, nw.matP]; }
      for (const o of h.openings) {
        if (o.wall === w1.id) { o.t = e1 === 'b' ? o.t : L1 - o.t; }
        else if (o.wall === w2.id) { o.wall = w1.id; o.t = L1 + (e2 === 'a' ? o.t : L2 - o.t); } else continue;
        o.t = Math.max(o.w / 2, Math.min(L - o.w / 2, r3(o.t))); }
      h.walls = h.walls.filter(x => x !== w1 && x !== w2); h.walls.push(nw); changed = true; break;
    }
  }
  return h;
}
// Städar bort småbitar från planritningar: lösa stumpar, korta utstickare och snedbitar i hörn.
export function cleanWalls(h) {
  const key = p => Math.round(p.x * 100) + ',' + Math.round(p.y * 100), hasOp = w => h.openings.some(o => o.wall === w.id);
  const ends = () => { const m = new Map(); for (const w of h.walls) for (const e of ['a', 'b']) { const k = key(w[e]); if (!m.has(k)) m.set(k, []); m.get(k).push([w, e]); } return m; };
  for (let pass = 0; pass < 30; pass++) { let changed = false; const m = ends();
    for (const w of [...h.walls]) { if (w.virtual || hasOp(w)) continue; const L = wallLen(w);
      const na = (m.get(key(w.a)) || []).filter(([o]) => o !== w), nb = (m.get(key(w.b)) || []).filter(([o]) => o !== w);
      if ((L < .6 && !na.length && !nb.length) || (L < .35 && (!na.length || !nb.length))) { h.walls = h.walls.filter(x => x !== w); changed = true; break; }
      if (L < .6 && na.length === 1 && nb.length === 1) {   // snedbit i hörn: förläng grannarna tills de möts
        const [o1, e1] = na[0], [o2, e2] = nb[0]; if (o1 === o2) continue;
        const p1 = o1[e1 === 'a' ? 'b' : 'a'], q1 = o1[e1], p2 = o2[e2 === 'a' ? 'b' : 'a'], q2 = o2[e2];
        const d1 = { x: q1.x - p1.x, y: q1.y - p1.y }, d2 = { x: q2.x - p2.x, y: q2.y - p2.y }, cr = d1.x * d2.y - d1.y * d2.x;
        if (Math.abs(cr) < 1e-6 * Math.hypot(d1.x, d1.y) * Math.hypot(d2.x, d2.y) * 1e3) continue;
        const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / cr, X = { x: r3(p1.x + d1.x * t), y: r3(p1.y + d1.y * t) };
        if (Math.hypot(X.x - (w.a.x + w.b.x) / 2, X.y - (w.a.y + w.b.y) / 2) > .7) continue;
        const ang = Math.abs(Math.atan2(cr, d1.x * d2.x + d1.y * d2.y)); if (ang < .35 || ang > Math.PI - .35) continue;
        o1[e1] = { ...X }; o2[e2] = { ...X }; for (const r of h.rooms) r.pts = r.pts; h.walls = h.walls.filter(x => x !== w); changed = true; break; } }
    if (!changed) {   // pyttebitar: dra ihop båda ändarna till en punkt
      for (const w of [...h.walls]) { if (w.virtual || hasOp(w) || wallLen(w) >= .25) continue;
        const M = { x: r3((w.a.x + w.b.x) / 2), y: r3((w.a.y + w.b.y) / 2) }, ka = key(w.a), kb = key(w.b);
        h.walls = h.walls.filter(x => x !== w);
        for (const o of h.walls) for (const e of ['a', 'b']) if (key(o[e]) === ka || key(o[e]) === kb) o[e] = { ...M };
        changed = true; break; } }
    if (!changed) {   // små slutna rutor (symboler på ritningen, t.ex. diskmaskin)
      const short = h.walls.filter(w => !w.virtual && !hasOp(w) && wallLen(w) < .8), adj = new Map();
      for (const w of short) for (const e of ['a', 'b']) { const k = key(w[e]); if (!adj.has(k)) adj.set(k, []); adj.get(k).push(w); }
      const seen = new Set();
      for (const w0 of short) { if (seen.has(w0)) continue; const comp = [], st = [w0]; seen.add(w0);
        while (st.length) { const w = st.pop(); comp.push(w); for (const e of ['a', 'b']) for (const o of adj.get(key(w[e])) || []) if (!seen.has(o)) { seen.add(o); st.push(o); } }
        const pts = comp.flatMap(w => [w.a, w.b]), nodes = new Set(pts.map(key));
        const bw = Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x)), bh = Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y));
        if (comp.length >= 3 && comp.length >= nodes.size && bw < .9 && bh < .9) { h.walls = h.walls.filter(x => !comp.includes(x)); changed = true; break; } } }
    if (!changed) break; }
  mergeWalls(h); return h;
}
// Delar väggar där en annan vägg möter mitt på (T-korsning), så att varje bit gränsar mot ett rum per sida.
export function splitWalls(h) {
  for (let changed = true; changed;) { changed = false;
    for (const w of [...h.walls]) {
      const L = wallLen(w); if (L < .1) continue;
      const cuts = [];
      for (const o of h.walls) { if (o === w) continue; for (const q of [o.a, o.b]) { const pr = proj(q, w.a, w.b);
        if (Math.abs(pr.d) < .02 && pr.t > .05 && pr.t < L - .05 && !cuts.some(c => Math.abs(c - pr.t) < .02)) cuts.push(pr.t); } }
      if (!cuts.length) continue;
      cuts.sort((a, b) => a - b); const ux = (w.b.x - w.a.x) / L, uy = (w.b.y - w.a.y) / L, at = t => ({ x: r3(w.a.x + ux * t), y: r3(w.a.y + uy * t) });
      const marks = [0, ...cuts, L], ops = h.openings.filter(o => o.wall === w.id);
      h.walls = h.walls.filter(x => x !== w);
      for (let i = 0; i < marks.length - 1; i++) { const s = marks[i], e = marks[i + 1];
        const nw = { ...w, id: i ? uid() : w.id, a: i ? at(s) : w.a, b: i === marks.length - 2 ? w.b : at(e) }; h.walls.push(nw);
        for (const o of ops) if (o.t >= s && o.t < e) { o.wall = nw.id; o.t = r3(o.t - s); } }
      changed = true; break;
    }
  }
  return h;
}
// Vilket rum ligger på varje sida av väggen? (+ = vänster om a→b i ritningen)
export function wallSides(h, w) {
  const L = wallLen(w) || 1, nx = -(w.b.y - w.a.y) / L, ny = (w.b.x - w.a.x) / L, m = { x: (w.a.x + w.b.x) / 2, y: (w.a.y + w.b.y) / 2 }, off = w.t / 2 + .3;
  return { P: roomAt(h, { x: m.x + nx * off, y: m.y + ny * off }), N: roomAt(h, { x: m.x - nx * off, y: m.y - ny * off }) };
}

// Flytta polygonens kanter utåt d meter (hörn möts snett)
function offsetPoly(pts, d) {
  let a2 = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; a2 += p.x * q.y - q.x * p.y; }); const sgn = a2 > 0 ? 1 : -1;
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const e1 = norm(p1.x - p0.x, p1.y - p0.y), e2 = norm(p2.x - p1.x, p2.y - p1.y);
    const n1 = { x: e1.y * sgn, y: -e1.x * sgn }, n2 = { x: e2.y * sgn, y: -e2.x * sgn }, b = norm(n1.x + n2.x, n1.y + n2.y), c = b.x * n1.x + b.y * n1.y;
    const k = Math.abs(c) > .2 ? d / c : d; out.push({ x: r3(p1.x + b.x * k), y: r3(p1.y + b.y * k) }); }
  return out;
}
const norm = (x, y) => { const L = Math.hypot(x, y) || 1; return { x: x / L, y: y / L }; };
// En vägg/gräns har ändrats här: rum som den går genom eller längs ska räknas om på nytt (även handformade)
export function touchRooms(h, segs) {
  for (const r of h.rooms) { if (!r.custom) continue;
    for (const [a, b] of segs) { const L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(2, Math.ceil(L / .1)); let hit = false;
      for (let i = 0; i <= n && !hit; i++) { const p = { x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n };
        if (inPoly(p, r.pts)) hit = true;
        else for (let k = 0; k < r.pts.length && !hit; k++) { const q1 = r.pts[k], q2 = r.pts[(k + 1) % r.pts.length], pr = proj(p, q1, q2); if (pr.t >= 0 && pr.t <= pr.L && Math.abs(pr.d) < .35) hit = true; } }
      if (hit) { r.custom = false; break; } } }
}
// Gardinskena: punkt/riktning en sträcka s längs polylinjen, och projektion av en punkt på den
export function trackAt(pts, s) {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.y - a.y) || 1e-9;
    if (s <= acc + L || i === pts.length - 2) { const t = Math.max(0, Math.min(L, s - acc)), ux = (b.x - a.x) / L, uy = (b.y - a.y) / L; return { x: a.x + ux * t, y: a.y + uy * t, ux, uy, seg: i }; }
    acc += L; }
  return { x: pts[0].x, y: pts[0].y, ux: 1, uy: 0, seg: 0 };
}
// Var på skenan gardinen hänger: följer sitt fönster (mitt för/vänster/höger) eller sitt eget läge
export function panelS(h, it, p) {
  const o = p.window && h.openings.find(x => x.id === p.window), w = o && h.walls.find(x => x.id === o.wall);
  if (!o || !w) return p.s;
  const L = wallLen(w), c = { x: w.a.x + (w.b.x - w.a.x) / L * o.t, y: w.a.y + (w.b.y - w.a.y) / L * o.t }, pr = trackProj(it.pts, c);
  // vänster/höger sett inifrån rummet mot fönstret = mot/med skenans riktning beroende på sida
  const at = trackAt(it.pts, pr.s), vx = c.x - at.x, vy = c.y - at.y, lsign = Math.sign(vy * at.ux - vx * at.uy) || 1, off = o.w / 2 + p.w / 2 - .08;
  return pr.s + (p.anchor === 'left' ? off * lsign : p.anchor === 'right' ? -off * lsign : 0);
}
export const trackLen = pts => pts.slice(1).reduce((s, b, i) => s + Math.hypot(b.x - pts[i].x, b.y - pts[i].y), 0);
export function trackProj(pts, p) {
  let best = { s: 0, d: Infinity }, acc = 0;
  for (let i = 0; i < pts.length - 1; i++) { const pr = proj(p, pts[i], pts[i + 1]), t = Math.max(0, Math.min(pr.L, pr.t));
    const d = Math.hypot(p.x - (pts[i].x + pr.ux * t), p.y - (pts[i].y + pr.uy * t)); if (d < best.d) best = { s: acc + t, d }; acc += pr.L; }
  return best;
}
// En punkt som garanterat ligger inne i polygonen
export function insidePoint(pts) {
  const c = centroid(pts); if (inPoly(c, pts)) return c;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  for (let i = 1; i < 12; i++) for (let j = 1; j < 12; j++) { const p = { x: Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * i / 12, y: Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * j / 12 }; if (inPoly(p, pts)) return p; }
  return c;
}
// Räkna om rummen utifrån väggarna. Gamla rum behåller namn/golv/färg genom att matcha på överlapp.
export function rebuildRooms(h) {
  if (h.autoRooms === false || !h.walls.length) return;
  const res = .04, pts = h.walls.flatMap(w => [w.a, w.b]);
  const x0 = Math.min(...pts.map(p => p.x)) - 1, y0 = Math.min(...pts.map(p => p.y)) - 1;
  const W = Math.ceil((Math.max(...pts.map(p => p.x)) + 1 - x0) / res), H = Math.ceil((Math.max(...pts.map(p => p.y)) + 1 - y0) / res);
  if (W * H > 4e6) return;
  const block = new Uint8Array(W * H);
  for (const w of h.walls) { const r = Math.max(w.t / 2 + .005, res * .8);
    const ix0 = Math.max(0, Math.floor((Math.min(w.a.x, w.b.x) - r - x0) / res)), ix1 = Math.min(W - 1, Math.ceil((Math.max(w.a.x, w.b.x) + r - x0) / res));
    const iy0 = Math.max(0, Math.floor((Math.min(w.a.y, w.b.y) - r - y0) / res)), iy1 = Math.min(H - 1, Math.ceil((Math.max(w.a.y, w.b.y) + r - y0) / res));
    for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) { const p = { x: x0 + (x + .5) * res, y: y0 + (y + .5) * res }, pr = proj(p, w.a, w.b);
      const t = Math.max(0, Math.min(pr.L, pr.t)), d = Math.hypot(p.x - (w.a.x + pr.ux * t), p.y - (w.a.y + pr.uy * t)); if (d <= r) block[y * W + x] = 1; } }
  const label = new Int32Array(W * H), q = new Int32Array(W * H);
  const fill = (seeds, id) => { let hd = 0, tl = 0, n = 0; for (const s of seeds) if (!block[s] && !label[s]) { label[s] = id; q[tl++] = s; }
    while (hd < tl) { const i = q[hd++]; n++; const x = i % W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < W * H && !block[j] && !label[j]) { label[j] = id; q[tl++] = j; } } return n; };
  const edge = []; for (let x = 0; x < W; x++) edge.push(x, (H - 1) * W + x); for (let y = 0; y < H; y++) edge.push(y * W, y * W + W - 1);
  fill(edge, -1);
  const regions = []; let id = 0;
  for (let i = 0; i < W * H; i++) if (!block[i] && !label[i]) { id++; const n = fill([i], id); if (n * res * res >= .5) regions.push({ id, start: i, n }); }
  // ytor man tagit bort som rum ska inte komma tillbaka
  const skip = new Set((h.ignore || []).map(p => { const x = Math.floor((p.x - x0) / res), y = Math.floor((p.y - y0) / res); return x >= 0 && y >= 0 && x < W && y < H ? label[y * W + x] : 0; }));
  for (let i = regions.length - 1; i >= 0; i--) if (skip.has(regions[i].id)) regions.splice(i, 1);
  // kontur → polygon
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const simplify = (p, eps) => { if (p.length < 3) return p; const a = p[0], b = p[p.length - 1], L = Math.hypot(b.x - a.x, b.y - a.y) || 1e-9; let md = 0, mi = 0;
    for (let i = 1; i < p.length - 1; i++) { const d = L > 1e-6 ? Math.abs((b.x - a.x) * (a.y - p[i].y) - (a.x - p[i].x) * (b.y - a.y)) / L : Math.hypot(p[i].x - a.x, p[i].y - a.y); if (d > md) { md = d; mi = i; } }
    return md > eps ? simplify(p.slice(0, mi + 1), eps).slice(0, -1).concat(simplify(p.slice(mi), eps)) : [a, b]; };
  const newRooms = [];
  for (const rg of regions) {
    const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && label[y * W + x] === rg.id;
    let x = rg.start % W, y = (rg.start / W) | 0; const sx = x, sy = y, out = [{ x, y }]; let d = 6;
    for (let g = 0; g < W * H; g++) { let f = false; for (let k = 0; k < 8; k++) { const nd = (d + 6 + k) % 8; if (inside(x + dirs[nd][0], y + dirs[nd][1])) { x += dirs[nd][0]; y += dirs[nd][1]; d = nd; f = true; break; } }
      if (!f || (x === sx && y === sy)) break; out.push({ x, y }); }
    out.push({ x: sx, y: sy });
    let poly = simplify(out, 1.5).slice(0, -1).map(p => ({ x: r3(x0 + (p.x + .5) * res), y: r3(y0 + (p.y + .5) * res) }));
    // räta upp nästan raka kanter
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length];
      if (Math.abs(a.y - b.y) < .06) { const m = r3((a.y + b.y) / 2); a.y = b.y = m; } else if (Math.abs(a.x - b.x) < .06) { const m = r3((a.x + b.x) / 2); a.x = b.x = m; } }
    if (poly.length >= 3) newRooms.push({ rg, poly: offsetPoly(poly, .04) });
  }
  // matcha mot gamla rum
  const old = h.rooms.filter(r => !r.outdoor), used = new Set();
  const scored = [];
  for (const nr of newRooms) for (const o of old) { let c = 0, tot = 0;
    for (let i = nr.rg.start; i < W * H; i += 3) if (label[i] === nr.rg.id) { tot++; if (inPoly({ x: x0 + (i % W + .5) * res, y: y0 + (((i / W) | 0) + .5) * res }, o.pts)) c++; }
    if (c) scored.push({ nr, o, c }); }
  scored.sort((a, b) => b.c - a.c);
  const match = new Map();
  for (const s of scored) { if (match.has(s.nr) || used.has(s.o)) continue; match.set(s.nr, s.o); used.add(s.o); }
  let n = old.length;
  const rooms = newRooms.map(nr => { const o = match.get(nr); if (o) return o.custom ? { ...o } : { ...o, pts: nr.poly };
    const near = scored.find(s => s.nr === nr)?.o; return { ...(near || { floor: '#b8915f', style: 'tra' }), id: uid(), name: near?.hidden ? near.name : 'Rum ' + (++n), pts: nr.poly }; });
  h.rooms = [...rooms, ...h.rooms.filter(r => r.outdoor)];
}

// ---------- ångra ----------
const undoStack = [], redoStack = [];
export function commit() {
  undoStack.push(JSON.stringify(home())); if (undoStack.length > 100) undoStack.shift(); redoStack.length = 0;
}
function replace(json) {
  const h = JSON.parse(json); const i = S.homes.findIndex(x => x.id === h.id); if (!h.levels) ensureLevels(h);
  if (i >= 0) S.homes[i] = h; S.sel = null; emit('full');
}
export function undo() { if (!undoStack.length) return; redoStack.push(JSON.stringify(home())); replace(undoStack.pop()); }
export function redo() { if (!redoStack.length) return; undoStack.push(JSON.stringify(home())); replace(redoStack.pop()); }
export function clearHistory() { undoStack.length = 0; redoStack.length = 0; }

// ---------- geometri ----------
export function proj(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1e-9, ux = dx / L, uy = dy / L;
  const px = p.x - a.x, py = p.y - a.y;
  return { t: px * ux + py * uy, d: -px * uy + py * ux, L, ux, uy };
}
export const wallLen = w => Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
export function polyArea(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s / 2); }
export function centroid(pts) { let x = 0, y = 0; for (const p of pts) { x += p.x; y += p.y; } return { x: x / pts.length, y: y / pts.length }; }
export function inPoly(p, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}
export const roomAt = (h, p) => h.rooms.find(r => !r.hidden && inPoly(p, r.pts));

// Ny vägg – delar som redan täcks av en befintlig vägg hoppas över (så rum kan dela väggar).
export function addWall(h, a, b, o = {}) {
  const L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 0.05) return [];
  const cover = [];
  for (const w of h.walls) {
    const p1 = proj(w.a, a, b), p2 = proj(w.b, a, b);
    if (Math.abs(p1.d) < 0.03 && Math.abs(p2.d) < 0.03) {
      const s = Math.max(Math.min(p1.t, p2.t), 0), e = Math.min(Math.max(p1.t, p2.t), L);
      if (e - s > 0.01) cover.push([s, e]);
    }
  }
  cover.sort((x, y) => x[0] - y[0]);
  const pieces = []; let cur = 0;
  for (const [s, e] of cover) { if (s > cur + 0.05) pieces.push([cur, s]); cur = Math.max(cur, e); }
  if (L > cur + 0.05) pieces.push([cur, L]);
  const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, out = [];
  for (const [s, e] of pieces) {
    const w = { id: uid(), a: { x: r3(a.x + ux * s), y: r3(a.y + uy * s) }, b: { x: r3(a.x + ux * e), y: r3(a.y + uy * e) },
      t: o.t || 0.15, h: o.h || h.ceiling || 2.5, color: o.color || '#eeebe5', ...(o.virtual ? { virtual: true } : {}) };
    h.walls.push(w); out.push(w);
  }
  return out;
}
export function addRoom(h, x, y, w, d, name, floor = '#b8915f', style = 'tra', o = {}) {
  const pts = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + d }, { x, y: y + d }];
  const r = { id: uid(), name, pts, floor, style }; h.rooms.push(r);
  for (let i = 0; i < 4; i++) addWall(h, pts[i], pts[(i + 1) % 4], o);
  return r;
}
// Flyttar en hörnpunkt – alla väggar och rum som delar punkten följer med.
export function movePoint(h, from, to) {
  const eq = p => Math.abs(p.x - from.x) < 1e-3 && Math.abs(p.y - from.y) < 1e-3;
  for (const w of h.walls) { if (eq(w.a)) w.a = { ...to }; if (eq(w.b)) w.b = { ...to }; }
  for (const r of h.rooms) r.pts = r.pts.map(p => eq(p) ? { ...to } : p);
}
export function findWall(h, p, maxD = 0.4) {
  let best = null;
  for (const w of h.walls) { if (w.virtual) continue;
    const pr = proj(p, w.a, w.b);
    if (pr.t < 0 || pr.t > pr.L) continue;
    const d = Math.abs(pr.d);
    if (d < maxD && (!best || d < best.d)) best = { wall: w, t: pr.t, d, side: Math.sign(pr.d) || 1 };
  }
  return best;
}
// Lägger möbeln mot närmaste vägg och vänder fronten ut i rummet.
export function snapToWall(h, it, p) {
  let best = null;
  for (const w of h.walls) { if (w.virtual) continue;
    const pr = proj(p, w.a, w.b);
    if (pr.t < -0.05 || pr.t > pr.L + 0.05) continue;
    const need = w.t / 2 + it.d / 2, gap = Math.abs(Math.abs(pr.d) - need);
    if (Math.abs(pr.d) < need + 0.3 && (!best || gap < best.gap)) best = { w, pr, need, gap };
  }
  if (!best) return null;
  const { w, pr, need } = best, s = Math.sign(pr.d) || 1, nx = -pr.uy * s, ny = pr.ux * s;
  const t = Math.min(Math.max(pr.t, it.w / 2), pr.L - it.w / 2);
  return { x: r3(w.a.x + pr.ux * t + nx * need), y: r3(w.a.y + pr.uy * t + ny * need), rot: Math.round(Math.atan2(-nx, ny) * 180 / Math.PI + 360) % 360 };
}

export function makeItem(h, type, x, y, rot = 0, extra = {}) {
  const c = ITEMS[type];
  const it = { id: uid(), type, x, y, rot, w: c.w, d: c.d, h: c.h, elev: c.ceil ? (h.ceiling || 2.5) - c.h : (c.elev || 0),
    color: c.color, color2: c.color2 || null, name: '', entity: '', state: c.dev ? { on: false, bri: 0.8 } : null, ...extra };
  if (extra.on !== undefined) { it.state.on = extra.on; delete it.on; }
  h.items.push(it); return it;
}
export function makeOpening(h, key, wall, t, extra = {}) {
  const c = OPENINGS[key];
  const o = { id: uid(), key, kind: c.kind, glass: !!c.glass, wall: wall.id, t, w: c.w, h: c.h, sill: c.sill, color: c.color, hinge: 'L', swing: 1,
    blind: 'none', blindColor: '#ece6da', entity: '', blindEntity: '', name: '', state: { open: 0, blind: 0 }, ...extra };
  h.openings.push(o); return o;
}
export function nameOf(h, x) {
  const base = x.name || (x.type ? ITEMS[x.type].name : OPENINGS[x.key].name);
  if (x.name) return base;
  let p = x;
  if (!x.type) { const w = h.walls.find(w => w.id === x.wall); if (w) { const L = wallLen(w), ux = (w.b.x - w.a.x) / L, uy = (w.b.y - w.a.y) / L;
    const c = { x: w.a.x + ux * x.t, y: w.a.y + uy * x.t };
    const r = roomAt(h, { x: c.x - uy * .3, y: c.y + ux * .3 }) || roomAt(h, { x: c.x + uy * .3, y: c.y - ux * .3 });
    return r ? `${base} · ${r.name}` : base; } }
  const r = roomAt(h, p); return r ? `${base} · ${r.name}` : base;
}

// ---------- mallar ----------
function blank(name, type) { return { id: uid(), name, type, ceiling: 2.5, walls: [], rooms: [], openings: [], items: [], bg: null }; }
function op(h, key, x, y, extra) { const f = findWall(h, { x, y }, 0.2); if (f) makeOpening(h, key, f.wall, f.t, extra); }

export function template(kind) {
  if (kind === 'villa') return ensureLevels(splitWalls(villa()));
  if (kind === 'lagenhet') return ensureLevels(splitWalls(apartment()));
  if (kind === 'stuga') return ensureLevels(splitWalls(cabin()));
  return ensureLevels(blank('Mitt nya hem', kind === 'tom-lagenhet' ? 'lagenhet' : 'hus'));
}

function villa() {
  const h = blank('Exempelhuset', 'hus'), O = 0.1, I = 0.075;
  // ytterväggar först (tjockare), sedan rummen
  const out = [{ x: 0, y: 0 }, { x: 14, y: 0 }, { x: 14, y: 10 }, { x: 0, y: 10 }];
  for (let i = 0; i < 4; i++) addWall(h, out[i], out[(i + 1) % 4], { t: 0.2 });
  addRoom(h, 0, 0, 14, 5.5, 'Kök & vardagsrum', '#b8915f', 'tra');
  addRoom(h, 0, 5.5, 4.5, 4.5, 'Sovrum', '#a88761', 'tra');
  addRoom(h, 4.5, 5.5, 3, 4.5, 'Hall', '#8d8d8d', 'klinker');
  addRoom(h, 7.5, 5.5, 3, 4.5, 'Badrum', '#d6d9dc', 'klinker');
  addRoom(h, 10.5, 5.5, 3.5, 4.5, 'Barnrum', '#b09070', 'tra');
  // väggfärger
  h.walls.forEach(w => { if (w.a.x === w.b.x && w.a.x === 0 && w.a.y < 5.5 && w.b.y <= 5.5) w.color = '#e6dccb'; });
  // dörrar
  op(h, 'ytterdorr', 6, 10, { swing: -1 });
  op(h, 'dorr', 4.5, 7.75, { swing: -1 });
  op(h, 'dorr', 7.5, 8.6, { w: .8 });
  op(h, 'oppning', 6, 5.5, { w: 1.2 });
  op(h, 'dorr', 13.3, 5.5, { swing: -1 });
  // fönster
  op(h, 'fonster', 1.8, 0, { w: 1.6, sill: .5, h: 1.6, blind: 'persienn' });
  op(h, 'fonsterdorr', 4.6, 0, { w: 1.0 });
  op(h, 'fonster', 7.4, 0, { w: 1.4, blind: 'persienn' });
  op(h, 'fonster', 10.5, 0, { w: .8, sill: 1.05, h: 1.0 });
  op(h, 'fonster', 14, 2.75, { w: 1.2 });
  op(h, 'fonster', 2.25, 10, { w: 1.4, blind: 'rullgardin', blindColor: '#e8e2d6', state: { open: 0, blind: .55 } });
  op(h, 'fonster', 9.4, 10, { w: .6, h: .6, sill: 1.4, blind: 'rullgardin' });
  op(h, 'fonster', 12.2, 10, { w: 1.2, blind: 'rullgardin', blindColor: '#7a8fa6' });
  op(h, 'fonster', 14, 6.6, { w: 1.0 });
  // vardagsrum
  makeItem(h, 'matta', 2.5, 2.75, 90, { w: 3, d: 2.2 });
  makeItem(h, 'tvbank', O + .2, 2.75, 270);
  makeItem(h, 'tv', O + .03, 2.75, 270, { elev: 1.0, on: false });
  makeItem(h, 'golvhogtalare', O + .15, 1.55, 270);
  makeItem(h, 'golvhogtalare', O + .15, 3.95, 270);
  makeItem(h, 'soffa', 3.7, 2.75, 90);
  makeItem(h, 'soffbord', 2.3, 2.75, 90);
  makeItem(h, 'fatolj', 1.2, .9, 315);
  makeItem(h, 'golvlampa', .45, .5, 0, { on: true });
  makeItem(h, 'vaxt', 6.4, .55, 0);
  makeItem(h, 'taklampa', 2.5, 2.75, 0, { on: true });
  // kök längs norra väggen
  const ky = O + .3;
  makeItem(h, 'kyl', 13.6, O + .325, 0);
  makeItem(h, 'hogskap', 13.0, ky, 0);
  [12.4, 11.2, 9.8, 9.2].forEach(x => makeItem(h, 'underskap', x, ky, 0));
  makeItem(h, 'spis', 11.8, ky, 0);
  makeItem(h, 'diskho', 10.5, ky, 0, { w: .8 });
  [12.4, 11.2, 9.8, 9.2].forEach(x => makeItem(h, 'overskap', x, O + .175, 0));
  makeItem(h, 'flakt', 11.8, O + .225, 0);
  makeItem(h, 'ledlist', 9.5, O + .3, 0, { w: 1.2, on: true });
  makeItem(h, 'ledlist', 11.8, O + .3, 0, { w: 1.8, on: true });
  makeItem(h, 'koksoe', 10.9, 2.6, 0);
  [10.2, 10.9, 11.6].forEach(x => makeItem(h, 'barstol', x, 3.35, 180));
  makeItem(h, 'taklampa', 10.3, 2.6, 0, { on: true, color: '#c9a227' });
  makeItem(h, 'taklampa', 11.5, 2.6, 0, { on: true, color: '#c9a227' });
  makeItem(h, 'matbord', 7.6, 2.75, 90);
  makeItem(h, 'stol', 7.05, 2.3, 270); makeItem(h, 'stol', 7.05, 3.2, 270);
  makeItem(h, 'stol', 8.15, 2.3, 90); makeItem(h, 'stol', 8.15, 3.2, 90);
  makeItem(h, 'taklampa', 7.6, 2.75, 0, { on: true });
  makeItem(h, 'hogtalare', 13.0, 2.75, 90, { elev: 0 });
  // sovrum
  makeItem(h, 'sang', O + 1.05, 7.75, 270);
  makeItem(h, 'nattduks', O + .2, 6.45, 270); makeItem(h, 'nattduks', O + .2, 9.05, 270);
  makeItem(h, 'bordslampa', O + .2, 6.45, 0, { on: true }); makeItem(h, 'bordslampa', O + .2, 9.05, 0);
  makeItem(h, 'garderob', 3.4, 5.5 + I + .3, 0, { w: 1.6 });
  makeItem(h, 'spegel', 4.5 - I - .02, 9.3, 90);
  makeItem(h, 'taklampa', 2.6, 7.75, 0);
  // hall
  makeItem(h, 'taklampa', 6, 7.75, 0, { on: true, color: '#f2efe9' });
  makeItem(h, 'spegel', 7.5 - I - .02, 6.4, 90, { w: .5, h: 1.2, elev: .6 });
  makeItem(h, 'vaxt', 4.9, 9.55, 0);
  // badrum
  makeItem(h, 'badkar', 9.4, 10 - O - .375, 180);
  makeItem(h, 'toalett', 10.5 - I - .325, 6.5, 90);
  makeItem(h, 'handfat', 8.4, 5.5 + I + .225, 0);
  makeItem(h, 'spegel', 8.4, 5.5 + I + .02, 0, { w: .6, h: .8, elev: 1.0 });
  makeItem(h, 'tvattmaskin', 7.5 + I + .3, 7.3, 270);
  makeItem(h, 'spot', 8.5, 7.5, 0); makeItem(h, 'spot', 9.6, 7.5, 0);
  // barnrum
  makeItem(h, 'sang90', 14 - O - 1.0, 8.4, 90);
  makeItem(h, 'skrivbord', 11.4, 5.5 + I + .3, 0);
  makeItem(h, 'stol', 11.4, 6.5, 180);
  makeItem(h, 'bokhylla', 10.5 + I + .175, 8.6, 270);
  makeItem(h, 'taklampa', 12.25, 7.75, 0, { color: '#2f5d50' });
  // ute
  makeItem(h, 'altan', 4, -1.7, 0, { w: 6, d: 3 });
  makeItem(h, 'utesoffa', 2.5, -2.6, 0);
  makeItem(h, 'grill', 6.4, -1.0, 0);
  makeItem(h, 'pool', 10.6, -2.3, 0);
  makeItem(h, 'gang', 6, 12.2, 0);
  makeItem(h, 'gang', 16.8, 7.5, 0, { w: 3.2, d: 9 });
  makeItem(h, 'bil', 16.8, 8.5, 0);
  [[-3, -3], [-3.5, 5], [-3, 12], [19.5, -3], [20, 13], [8, -5.5]].forEach(([x, y]) => makeItem(h, 'trad', x, y, 0));
  [[1, 11], [3, 11.2], [9, 11], [-1.2, -4], [12, 11]].forEach(([x, y]) => makeItem(h, 'buske', x, y, 0));
  [[5.2, 10.5], [6.8, 10.5], [1, -3.4], [7, -3.4], [12.9, -3.6]].forEach(([x, y]) => makeItem(h, 'utelampa', x, y, 0, { on: true }));
  makeItem(h, 'staket', 4, -4.6, 0, { w: 8 });
  return h;
}

function apartment() {
  const h = blank('Lägenheten', 'lagenhet'), O = 0.1;
  const out = [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 8 }, { x: 0, y: 8 }];
  for (let i = 0; i < 4; i++) addWall(h, out[i], out[(i + 1) % 4], { t: 0.2 });
  addRoom(h, 0, 0, 5, 4.5, 'Vardagsrum', '#b8915f');
  addRoom(h, 5, 0, 3, 4.5, 'Kök', '#cfc6b8', 'klinker');
  addRoom(h, 0, 4.5, 4, 3.5, 'Sovrum', '#a88761');
  addRoom(h, 4, 4.5, 2, 3.5, 'Hall', '#8d8d8d', 'klinker');
  addRoom(h, 6, 4.5, 2, 3.5, 'Badrum', '#d6d9dc', 'klinker');
  op(h, 'ytterdorr', 5, 8, { swing: -1 });
  op(h, 'dorr', 4, 6.25, { swing: -1 });
  op(h, 'dorr', 6, 6.25, { w: .8 });
  op(h, 'oppning', 5, 4.5, { w: 1.0 });
  op(h, 'oppning', 5, 2.25, { w: 2.0 });
  op(h, 'fonster', 2.5, 0, { w: 1.6, blind: 'persienn' });
  op(h, 'fonster', 6.5, 0, { w: 1.0 });
  op(h, 'fonster', 0, 6.25, { w: 1.2, blind: 'rullgardin' });
  makeItem(h, 'soffa', 2.5, 3.6, 180);
  makeItem(h, 'soffbord', 2.5, 2.5, 0);
  makeItem(h, 'tvbank', 2.5, O + .2, 0); makeItem(h, 'tv', 2.5, O + .03, 0, { elev: 1.0 });
  makeItem(h, 'taklampa', 2.5, 2.25, 0, { on: true });
  makeItem(h, 'kyl', 8 - O - .325, .4, 90);
  [1.0, 2.2].forEach(y => makeItem(h, 'underskap', 8 - O - .3, y, 90));
  makeItem(h, 'spis', 8 - O - .3, 1.6, 90);
  makeItem(h, 'diskho', 8 - O - .3, 2.9, 90);
  makeItem(h, 'matbord', 6.2, 3.4, 0, { w: 1.2, d: .8 });
  makeItem(h, 'taklampa', 6.5, 2.25, 0, { on: true });
  makeItem(h, 'sang', 2, 8 - O - 1.05, 180);
  makeItem(h, 'taklampa', 2, 6.25, 0);
  makeItem(h, 'toalett', 7, 8 - O - .325, 180);
  makeItem(h, 'dusch', 7.45, 5.05, 0, { w: .9, d: .9 });
  makeItem(h, 'taklampa', 5, 6.25, 0, { on: true });
  return h;
}

function cabin() {
  const h = blank('Sommarstugan', 'stuga'), O = 0.1;
  h.ceiling = 2.3;
  const out = [{ x: 0, y: 0 }, { x: 7, y: 0 }, { x: 7, y: 6 }, { x: 0, y: 6 }];
  for (let i = 0; i < 4; i++) addWall(h, out[i], out[(i + 1) % 4], { t: 0.2, h: 2.3, color: '#d9b48c' });
  addRoom(h, 0, 0, 7, 3.5, 'Allrum', '#d9b48c', 'tra', { h: 2.3, color: '#e6dccb' });
  addRoom(h, 0, 3.5, 4, 2.5, 'Sovrum', '#d9b48c', 'tra', { h: 2.3, color: '#e6dccb' });
  addRoom(h, 4, 3.5, 3, 2.5, 'Dusch & WC', '#cfc6b8', 'klinker', { h: 2.3, color: '#e6dccb' });
  op(h, 'fonsterdorr', 3.5, 0, { w: 1.4 });
  op(h, 'fonster', 1.2, 0, { w: 1.0 });
  op(h, 'fonster', 5.8, 0, { w: 1.0 });
  op(h, 'dorr', 2.5, 3.5);
  op(h, 'dorr', 5, 3.5, { w: .8 });
  op(h, 'fonster', 0, 4.75, { w: .9, blind: 'rullgardin' });
  op(h, 'ytterdorr', 7, 1.75);
  makeItem(h, 'soffa', 1.6, 2.6, 180, { w: 2.0, color: '#7a8fa6' });
  makeItem(h, 'matbord', 5, 1.8, 0, { w: 1.4 });
  makeItem(h, 'taklampa', 1.6, 1.6, 0, { on: true });
  makeItem(h, 'taklampa', 5, 1.8, 0, { on: true });
  makeItem(h, 'sang', 1.9, 6 - O - 1.05, 180, { d: 2.0 });
  makeItem(h, 'toalett', 6.5, 6 - O - .325, 180);
  makeItem(h, 'altan', 3.5, -1.6, 0, { w: 7, d: 2.8 });
  makeItem(h, 'utesoffa', 2, -2.2, 0);
  [[-3, -3], [10, -2], [10, 8], [-3, 8], [4, 10]].forEach(([x, y]) => makeItem(h, 'trad', x, y, 0));
  makeItem(h, 'utelampa', 6.6, -2.8, 0, { on: true });
  return h;
}
