// Smarta grupper: en "förälder" (bord, säng, soffa) äger sina delar (stolar, sängbord, soffbord, matta).
// Delarna placeras automatiskt och följer med när föräldern flyttas, vrids eller ändras.
// Plan-koordinater: x, y (y = djupet i 3D), rot i grader. Möblernas framsida är lokal +y.
import { makeItem } from './store.js?v=1794501654';
import { syncF } from './furnbridge.js?v=1794501654';
import { PRESETS } from './presets.js?v=1794501654';

const D2R = Math.PI / 180;
const toWorld = (p, lx, ly) => { const r = p.rot * D2R, c = Math.cos(r), s = Math.sin(r); return { x: p.x + lx * c - ly * s, y: p.y + lx * s + ly * c }; };
const faceTo = (from, to) => ((Math.atan2(-(to.x - from.x), to.y - from.y) / D2R) % 360 + 360) % 360;
const rnd = v => Math.round(v * 1000) / 1000;

// stolmodeller man kan välja för en matgrupp
export const CHAIRS = [
  ['tra', 'Pinnstol', { o: { stil: 'tra' } }], ['stoppad', 'Stoppad', { o: { stil: 'stoppad' } }], ['skal', 'Skalstol', { o: { stil: 'skal' } }], ['karm', 'Karmstol', { o: { stil: 'karm' } }],
  ...PRESETS.filter(p => p.type === 'stol' && p.family).filter((p, i, a) => a.findIndex(q => q.family === p.family) === i)
    .map(p => [p.family, p.family.replace(/^ILVA /, ''), { o: p.o, m: p.m, family: p.family, name: p.name, preset: p.variant, ...(p.size || {}) }]),
];
export const groupKind = it => ({ matbord: 'stolar', sang: 'sangbord', sang90: 'sangbord', soffa: 'soffgrupp', platsbyggt: 'bygg', innertak: 'tak' })[it.type] || null;

// var delarna ska stå (lokalt kring föräldern)
function slots(p) {
  const g = p.g || {}, out = [];
  if (groupKind(p) === 'stolar') {
    const n = g.n || 0, W = p.w, D = p.d, cd = .5, round = p.o?.form === 'rund' && !(p.o.utdragen && p.o.ilagg);
    if (round) { const R = W / 2 + cd / 2 - .14; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; out.push({ key: 'stol', lx: Math.cos(a) * R, ly: Math.sin(a) * R, face: 1 }); } return out; }
    const mode = g.mode || 'runt', ends = mode !== 'runt' ? 0 : n >= 6 && W >= 1.4 ? 2 : n % 2 ? 1 : 0, long = n - ends;
    const top = mode === 'en' ? 0 : Math.floor(long / 2), bot = long - top, off = D / 2 + cd / 2 - .14, use = W - .2;
    const row = (k, ly) => { for (let i = 0; i < k; i++) out.push({ key: 'stol', lx: -use / 2 + (i + .5) * use / k, ly, rot: ly > 0 ? 180 : 0 }); };
    row(bot, off); row(top, -off);
    if (ends >= 1) out.push({ key: 'stol', lx: W / 2 + cd / 2 - .14, ly: 0, rot: 90 });
    if (ends >= 2) out.push({ key: 'stol', lx: -(W / 2 + cd / 2 - .14), ly: 0, rot: 270 });
    return out;
  }
  if (groupKind(p) === 'sangbord') { const n = g.n || 0, nw = .45, nd = .4, y = -p.d / 2 + nd / 2 + .04;
    if (n >= 1) out.push({ key: 'nattduks', lx: -(p.w / 2 + nw / 2 + .03), ly: y, rot: 0 });
    if (n >= 2) out.push({ key: 'nattduks', lx: p.w / 2 + nw / 2 + .03, ly: y, rot: 0 });
    return out; }
  if (groupKind(p) === 'bygg') {   // byggverkstan: LED-listen och tv:n blir riktiga enheter som går att styra
    const parts = p.o?.variants?.[p.o.active || 0]?.parts || [], W = p.w, D = p.d;
    for (const q of parts) {
      // riktning i möbelns lokala ram: x = åt höger längs väggen, y = uppåt, z = ut från väggen
      const DIR = { ned: [0, -1, 0], upp: [0, 1, 0], vagg: [0, 0, -1], fram: [0, 0, 1] };
      if (q.k === 'led') out.push({ key: 'ledlist', tag: q.id, lx: -W / 2 + q.x + q.w / 2, ly: -D / 2 + (q.z ?? .02) + .012, rot: 0, w: q.w, d: .025, elev: q.y, lt: q.lt, o: { ldir: DIR[q.dir || 'ned'] } });
      if (q.k === 'ram') { const sd = q.sides || {}, t = q.t || .05, x0 = q.x + t, x1 = q.x + q.w - t, y0 = q.y + t, y1 = q.y + q.h - t, z = -D / 2 + (q.z || 0) + q.d - .03;
        const d = s => q.dir === 'vagg' ? [0, 0, -1] : q.dir === 'fram' ? [0, 0, 1] : ({ top: [0, -1, 0], bottom: [0, 1, 0], left: [1, 0, 0], right: [-1, 0, 0] })[s].map(v => v * (q.dir === 'ut' ? -1 : 1));
        if (sd.top) out.push({ key: 'ledlist', tag: q.id + ':top', lx: -W / 2 + (x0 + x1) / 2, ly: z, rot: 0, w: x1 - x0, d: .02, elev: y1 - .008, lt: q.lt, o: { ldir: d('top') } });
        if (sd.bottom) out.push({ key: 'ledlist', tag: q.id + ':bottom', lx: -W / 2 + (x0 + x1) / 2, ly: z, rot: 0, w: x1 - x0, d: .02, elev: y0 - .007, lt: q.lt, o: { ldir: d('bottom') } });
        if (sd.left) out.push({ key: 'ledlist', tag: q.id + ':left', lx: -W / 2 + x0 + .008, ly: z, rot: 0, w: .015, d: .02, h: y1 - y0, elev: y0, lt: q.lt, o: { vert: 1, ldir: d('left') } });
        if (sd.right) out.push({ key: 'ledlist', tag: q.id + ':right', lx: -W / 2 + x1 - .008, ly: z, rot: 0, w: .015, d: .02, h: y1 - y0, elev: y0, lt: q.lt, o: { vert: 1, ldir: d('right') } }); }
      if ((q.k === 'kappa' || q.k === 'gips') && q.spots > 0) for (let i = 0; i < q.spots; i++)
        out.push({ key: 'spot', tag: q.id + ':s' + i, lx: -W / 2 + q.x + q.w * (i + .5) / q.spots, ly: -D / 2 + (q.z || 0) + q.d / 2, rot: 0, elev: q.y - .039, lt: q.lt, o: { beam: q.beam || 36 } });
      if (q.k === 'tv') out.push({ key: 'tv', tag: q.id, lx: -W / 2 + q.x + q.w / 2, ly: -D / 2 + .125 + .045, rot: 0, o: { montering: 'vagg', tum: q.inch, hojd: q.y }, elev: 0 }); }
    return out; }
  if (groupKind(p) === 'tak') {   // takverkstan: spotlights och LED-list blir riktiga lampor
    const o = p.o || {}, W = p.w, D = p.d, H = o.H || 2.5, at = (x, y) => (o.areas || []).find(a => x >= a.x - .001 && x <= a.x + a.w + .001 && y >= a.y - .001 && y <= a.y + a.d + .001);
    for (const sp of o.spots || []) { const a = at(sp.x, sp.y); if (a) out.push({ key: 'spot', tag: sp.id, lx: -W / 2 + sp.x, ly: -D / 2 + sp.y, rot: 0, elev: H - a.drop - .04 }); }
    if (o.led) for (const a of o.areas || []) { const T = .02, E = [];
      if (a.y > T) E.push([a.x + a.w / 2, a.y - .03, a.w, 0]); if (a.y + a.d < D - T) E.push([a.x + a.w / 2, a.y + a.d + .03, a.w, 0]);
      if (a.x > T) E.push([a.x - .03, a.y + a.d / 2, a.d, 90]); if (a.x + a.w < W - T) E.push([a.x + a.w + .03, a.y + a.d / 2, a.d, 90]);
      E.forEach(([x, y, len, r], i) => out.push({ key: 'ledlist', tag: a.id + ':' + i, lx: -W / 2 + x, ly: -D / 2 + y, rot: r, w: len, d: .025, elev: H - a.drop + .01 })); }
    return out; }
  if (groupKind(p) === 'soffgrupp') {
    if (g.bord) out.push({ key: 'soffbord', lx: 0, ly: p.d / 2 + .45 + .3, rot: 0, tag: 'bord' });
    if (g.matta) out.push({ key: 'matta', lx: 0, ly: p.d / 2 + .5, rot: 0, tag: 'matta', w: Math.max(2, Math.min(3, p.w + .2)), d: 1.7 });
    return out; }
  return out;
}
// skapar/tar bort/placerar delarna så att de stämmer med föräldern. Returnerar delarnas id.
export function arrange(h, p) {
  if (!groupKind(p)) return [];
  const want = slots(p), have = h.items.filter(i => i.grp === p.id && !i.free);
  // fel sort → bort
  for (const it of have) if (!want.some(s => s.key === it.type)) h.items.splice(h.items.indexOf(it), 1);
  const left = h.items.filter(i => i.grp === p.id && !i.free), ids = [];
  want.forEach((s, i) => {
    let it = left.filter(x => x.type === s.key && (!s.tag || x.gtag === s.tag))[0];
    if (it) left.splice(left.indexOf(it), 1);
    else { const ex = s.key === 'stol' ? JSON.parse(JSON.stringify((CHAIRS.find(c => c[0] === p.g?.chair) || CHAIRS[0])[2])) : {};
      it = makeItem(h, s.key, p.x, p.y, p.rot, { ...ex, grp: p.id, gtag: s.tag || null });
      if (s.key === 'stol' && ex.o) { it.o = { ...it.o, ...ex.o }; syncF(it); } }
    if (s.o) { it.o = { ...it.o, ...s.o }; syncF(it); }
    if (s.w) { it.w = s.w; it.d = s.d; }
    if (s.h) it.h = s.h;
    if (s.lt) it.lt = JSON.parse(JSON.stringify(s.lt));
    if (s.elev !== undefined) it.elev = s.elev;
    const w = toWorld(p, s.lx, s.ly); it.x = rnd(w.x); it.y = rnd(w.y);
    it.rot = s.face ? Math.round(faceTo(it, p)) : (p.rot + (s.rot || 0)) % 360; ids.push(it.id);
  });
  for (const it of left) h.items.splice(h.items.indexOf(it), 1);   // överblivna
  return ids;
}
export function arrangeAll(h) {
  for (const it of [...h.items]) if (it.grp && !h.items.some(p => p.id === it.grp)) h.items.splice(h.items.indexOf(it), 1);   // föräldern borttagen
  for (const p of [...h.items]) if (p.g) arrange(h, p);
}
// byt stolmodell för hela matgruppen
export function setChairs(h, p, key) {
  p.g.chair = key; const ex = (CHAIRS.find(c => c[0] === key) || CHAIRS[0])[2];
  for (const it of h.items.filter(i => i.grp === p.id && i.type === 'stol')) h.items.splice(h.items.indexOf(it), 1);
  void ex; arrange(h, p);
}
