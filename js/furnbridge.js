// Bryggan mellan huvudappens saker (plan-koordinater x/y, rot i grader) och möbelmotorn (FURN).
// En sak i appen som har en möbel bakom sig får it.o (val) och it.m (material) – samma som i demon.
import { FURN, newFurniture, buildFurniture } from './furniture.js?v=1794439882';
import { ITEMS } from './catalog.js?v=1794439882';

export const furnKey = it => ITEMS[it.type]?.furn || null;
const hashSeed = id => { let s = 7; for (const c of String(id)) s = (s * 31 + c.charCodeAt(0)) % 9973; return s + 1; };
// samma form som demon använder (type = FURN-nyckel)
export function furnObj(it) { const k = furnKey(it); return k ? new Proxy(it, { get: (t, p) => p === 'type' ? k : p === 'seed' ? (t.seed ?? hashSeed(t.id)) : t[p], set: (t, p, v) => { if (p !== 'type') t[p] = v; return true; } }) : null; }
// första materialets färg → 2D-ritningen
const slotColor = it => { const k = furnKey(it), s0 = FURN[k].slots[0]?.[0], m = s0 && it.m[s0]; return m?.color || ({ ek: '#b48a5c', ljusek: '#d8c3a5', valnot: '#6e4b33', tyg: '#8b8f86', linne: '#d9d2c4', sammet: '#3f5a4c', matt: '#efece6', pulver: '#f2f2f0', svartmetall: '#232323' })[m?.mat] || '#9a9a9a'; };
export function syncF(it) { const k = furnKey(it); if (!k || !it.o) return; const f = furnObj(it); FURN[k].sync?.(f, f.o); it.color = slotColor(it); }
// gamla sparade saker (före möbelmotorn) får val och material första gången de används
export function ensureFurn(it) {
  const k = furnKey(it); if (!k) return k;
  if (it.o && FURN[k].opts.every(op => op.k in it.o) && FURN[k].slots.every(([sk]) => it.m?.[sk])) return k;
  const fresh = !it.o, c = ITEMS[it.type], f = newFurniture(k, c.fo ? { o: JSON.parse(JSON.stringify(c.fo)) } : undefined);
  it.o = { ...f.o, ...(it.o || {}) }; it.m = { ...f.m, ...(it.m || {}) }; it.seed = it.seed ?? hashSeed(it.id);
  if (!fresh) { syncF(it); return k; }
  if (FURN[k].fixed || !it.w) { it.w = f.w; it.d = f.d; it.h = f.h; }
  const s0 = FURN[k].slots[0]?.[0]; if (s0 && it.color && it.color !== c.color) it.m[s0] = { ...it.m[s0], color: it.color };
  if (FURN[k].lamp || k === 'tv') it.elev = 0;
  syncF(it); return k;
}
// bygger 3D-gruppen (golvbaserad, origo mitt på golvet). ceil = takhöjd. Returnerar lampor och glödande material så appen kan tända dem.
export function buildF(it, ceil = 2.5) {
  const k = ensureFurn(it), f = furnObj(it); f.ceilH = ceil;
  const g = buildFurniture(f), lights = [], glows = [];
  g.traverse(o => { if (o.isLight && o.userData.lamp) { lights.push(o); o.intensity = 0; } if (o.material?.userData?.glow && !o.material.userData.screen) glows.push(o.material); });
  if (FURN[k].ceil) g.position.y = -(it.elev || 0);
  return { g, lights, glows };
}
// saker som står på något (bordslampa, tv på bänk): höjden på det de står på
export function onTopElev(it, items) {
  const k = furnKey(it); if (!k || !FURN[k].onTop || it.grp || (k === 'tv' && it.o?.montering === 'vagg')) return null; let best = 0;
  for (const o of items) { if (o === it) continue; const ok = furnKey(o); if (!ok || FURN[ok].onTop || FURN[ok].flat || FURN[ok].ceil || ['soffa', 'fatolj', 'platsbyggt', 'elfa', 'skjutdorr'].includes(ok)) continue;
    const dx = it.x - o.x, dy = it.y - o.y, a = o.rot * Math.PI / 180, lx = dx * Math.cos(a) + dy * Math.sin(a), ly = -dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= o.w / 2 && Math.abs(ly) <= o.d / 2) best = Math.max(best, ok === 'kok' ? (o.o.bankH || .9) : o.h); }
  return best;
}
// fotavtryck för 2D: rektangel + ev. schäslong; rund = cirkel
export function footShape(it) {
  const k = furnKey(it); if (!k || !it.o) return null; const F = FURN[k];
  if (k === 'innertak') return { parts: (it.o.areas || []).map(a => ({ x: -it.w / 2 + a.x + a.w / 2, z: -it.d / 2 + a.y + a.d / 2, w: a.w, d: a.d, tak: 1 })) };
  if (k === 'platsbyggt') { const P = (it.o.variants?.[it.o.active || 0]?.parts || []).filter(p => !['farg', 'led', 'tv'].includes(p.k) && (p.d || 0) > .015);
    return { parts: P.map(p => ({ x: -it.w / 2 + p.x + p.w / 2, z: -it.d / 2 + (p.z || 0) + p.d / 2, w: p.w, d: p.d, ikea: p.k === 'besta' || p.k === 'metod' })) }; }
  const round = (k === 'matbord' || k === 'soffbord') && it.o.form === 'rund' && !(it.o.utdragen && it.o.ilagg) || (k === 'matta' && it.o.form === 'rund') || k === 'vaxt' || k === 'taklampa' || k === 'golvlampa' || k === 'bordslampa';
  const oval = (k === 'matbord' || k === 'soffbord') && (it.o.form === 'oval' || (it.o.form === 'rund' && it.o.utdragen && it.o.ilagg));
  return { round, oval, extra: F.foot ? F.foot(furnObj(it), it.o) : null };
}
