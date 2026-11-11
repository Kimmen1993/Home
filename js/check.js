// Rumskontroll: hittar sådant man lätt missar när man möblerar.
// Dörrar som slår i möbler, för lite plats bakom matstolar, trånga sängsidor och smala passager.
// Måtten är vanliga riktvärden: 75 cm bakom stolar, 50–60 cm vid sängen, 60 cm för att gå förbi.
import { ITEMS } from './catalog.js?v=1794439882';

const cm = v => Math.round(v * 100);
const ext = it => { const r = it.rot * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)); return { ex: c * it.w / 2 + s * it.d / 2, ey: s * it.w / 2 + c * it.d / 2 }; };
const FLAT = ['matta', 'altan', 'gang', 'pool', 'uteyta', 'skena', 'gardin', 'element', 'handdukstork', 'tavla', 'hylla', 'ledlist', 'spegel', 'tv', 'soundbar'];
const solid = o => !ITEMS[o.type]?.ceil && !ITEMS[o.type]?.area && !FLAT.includes(o.type) && (o.elev || 0) < .9 && !['bordslampa', 'hogtalare'].includes(o.type);
const related = (a, b) => a.grp === b.id || b.grp === a.id || (a.grp && a.grp === b.grp);
const nameOf = it => it.family ? (it.name || it.family) : (it.name || ITEMS[it.type]?.name || 'möbeln');
// avstånd från en punkt i en axelriktning till närmaste vägg eller möbel
function ray(h, items, from, ox, oy, dx, dy, halfAcross, skip) {
  let best = 6, what = null;
  for (const w of h.walls) { const sx = w.b.x - w.a.x, sy = w.b.y - w.a.y, den = dx * sy - dy * sx; if (Math.abs(den) < 1e-9) continue;
    const t = ((w.a.x - ox) * sy - (w.a.y - oy) * sx) / den, u = ((w.a.x - ox) * dy - (w.a.y - oy) * dx) / den;
    if (u < 0 || u > 1 || t < -.02) continue; const tt = t - (w.t || .1) / 2 / Math.max(Math.abs(den) / Math.hypot(sx, sy), .25);
    if (tt < best) { best = Math.max(0, tt); what = 'väggen'; } }
  for (const o of items) { if (o === from || o.id === from.id || related(o, from) || skip?.(o)) continue; const F = ext(o);
    const across = dx ? Math.abs(oy - o.y) < F.ey + halfAcross * .7 : Math.abs(ox - o.x) < F.ex + halfAcross * .7; if (!across) continue;
    const tt = dx > 0 ? o.x - F.ex - ox : dx < 0 ? ox - (o.x + F.ex) : dy > 0 ? o.y - F.ey - oy : oy - (o.y + F.ey);
    if (tt > -.01 && tt < best) { best = Math.max(0, tt); what = o; } }
  return { d: best, what };
}
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export function checkHome(h) {
  const out = [], seen = new Set();
  const items = h.items.filter(solid).flatMap(it => { if (it.type !== 'platsbyggt') return [it];
    const a = it.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return (it.o?.variants?.[it.o.active || 0]?.parts || []).filter(p => !['farg', 'led', 'tv', 'panel'].includes(p.k) && p.d > .1 && p.y < .9).map(p => {
      const lx = -it.w / 2 + p.x + p.w / 2, ly = -it.d / 2 + (p.z || 0) + p.d / 2;
      return { ...it, x: it.x + lx * c - ly * s, y: it.y + lx * s + ly * c, w: p.w, d: p.d, h: p.y + p.h, name: 'Platsbyggt' }; }); });
  // 1) dörrar som slår i möbler
  for (const o of h.openings) { if (o.kind !== 'door') continue; const w = h.walls.find(x => x.id === o.wall); if (!w) continue;
    const L = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y), ux = (w.b.x - w.a.x) / L, uy = (w.b.y - w.a.y) / L, nx = -uy, ny = ux, sd = o.swing || 1, T = (w.t || .1) / 2;
    const tA = o.t - o.w / 2, tB = o.t + o.w / 2, dA = sd > 0 ? T : -o.w * .85, dB = sd > 0 ? o.w * .85 : -T;
    for (const it of items) { const E = ext(it), cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ x: it.x + a * E.ex, y: it.y + b * E.ey }));
      const ts = cs.map(c => (c.x - w.a.x) * ux + (c.y - w.a.y) * uy), ds = cs.map(c => (c.x - w.a.x) * nx + (c.y - w.a.y) * ny);
      if (Math.max(...ts) > tA + .03 && Math.min(...ts) < tB - .03 && Math.max(...ds) > dA + .03 && Math.min(...ds) < dB - .03)
        out.push({ id: it.id, icon: '🚪', msg: `Dörren slår i ${nameOf(it)}` }); } }
  for (const it of items) { const E = ext(it), r = it.rot * Math.PI / 180;
    // 2) matbord: plats att dra ut stolarna (75 cm från bordskanten)
    if (it.type === 'matbord') { const chairs = h.items.filter(c => c.grp === it.id);
      for (const [dx, dy] of DIRS) { const used = chairs.some(c => (c.x - it.x) * dx + (c.y - it.y) * dy > .2); if (chairs.length ? !used : (dx ? E.ex < E.ey : E.ey < E.ex)) continue;
        const ox = it.x + dx * E.ex, oy = it.y + dy * E.ey, R = ray(h, items, it, ox, oy, dx, dy, dx ? E.ey : E.ex, o => o.type === 'stol' || o.type === 'barstol');
        if (R.d < .75) out.push({ id: it.id, icon: '🪑', msg: `Bara ${cm(R.d)} cm bakom stolarna vid ${nameOf(it)} – minst 75 cm behövs för att dra ut en stol` }); } }
    // 3) säng: plats vid långsidorna
    if (it.type === 'sang' || it.type === 'sang90') { const sides = [[Math.cos(r), Math.sin(r)], [-Math.cos(r), -Math.sin(r)]].map(([a, b]) => [Math.round(a), Math.round(b)]);
      const gaps = sides.map(([dx, dy]) => ray(h, items, it, it.x + dx * E.ex, it.y + dy * E.ey, dx, dy, dx ? E.ey : E.ex, o => o.type === 'nattduks' || o.grp === it.id).d);
      const tight = gaps.filter(g => g > .03 && g < .5); if (tight.length && !(it.type === 'sang90' && gaps.some(g => g <= .03)))
        out.push({ id: it.id, icon: '🛏️', msg: `${cm(Math.min(...tight))} cm vid sängens sida – 50–60 cm brukar behövas för att gå och bädda` }); }
    // 4) smala passager mellan två möbler
    for (const [dx, dy] of DIRS) { const R = ray(h, items, it, it.x + dx * E.ex, it.y + dy * E.ey, dx, dy, dx ? E.ey : E.ex);
      if (!R.what || R.what === 'väggen' || R.d < .08 || R.d >= .6) continue; const o = R.what, pair = [it.id, o.id].sort().join();
      const sofaTable = [it.type, o.type].some(t => ['soffa', 'fatolj', 'utesoffa'].includes(t)) && [it.type, o.type].some(t => ['soffbord', 'matta'].includes(t));
      const kitchen = ITEMS[it.type]?.cat === 'kok' && ITEMS[o.type]?.cat === 'kok' && it.type !== 'matbord' && o.type !== 'matbord';
      const small = x => Math.max(x.w, x.d) < .6 || ['vaxt', 'utekruka', 'golvlampa', 'hogtalare', 'golvhogtalare'].includes(x.type) || ITEMS[x.type]?.cat === 'ute';
      if (small(it) || small(o) || out.some(w => w.msg.startsWith(`${cm(R.d)} cm mellan ${nameOf(o)} och ${nameOf(it)}`))) continue;
      if (seen.has(pair) || sofaTable || kitchen || it.type === 'stol' || o.type === 'stol' || it.type === 'nattduks' || o.type === 'nattduks') continue; seen.add(pair);
      out.push({ id: it.id, icon: '↔', msg: `${cm(R.d)} cm mellan ${nameOf(it)} och ${nameOf(o)} – smalt att gå (60–90 cm är bekvämt)` }); }
  }
  return out;
}
