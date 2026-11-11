// Smarta grupper: en "förälder" (bord, säng, soffa) äger sina delar (stolar, sängbord, soffbord, matta).
// Delarna placeras automatiskt och följer med när föräldern flyttas, vrids eller ändras.
// Plan-koordinater: x, y (y = djupet i 3D), rot i grader. Möblernas framsida är lokal +y.
import { makeItem } from './store.js?v=1794431659';
import { syncF } from './furnbridge.js?v=1794431659';
import { PRESETS } from './presets.js?v=1794431659';

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
export const groupKind = it => ({ matbord: 'stolar', sang: 'sangbord', sang90: 'sangbord', soffa: 'soffgrupp' })[it.type] || null;

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
    if (s.w) { it.w = s.w; it.d = s.d; }
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
