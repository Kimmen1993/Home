// Byggverkstan: platsbyggt på en vägg – IKEA-stommar som grund + egna delar som gör det inbyggt.
// En del: { id, k, x, y, w, h, d, z?, ...val }. x = vänsterkant från väggens vänstra hörn, y = underkant från golvet,
// d = djup ut från väggen, z = avstånd från väggen till delens baksida (t.ex. tv på fäste). Allt i meter.
// IKEA-mått: BESTÅ 60/120/180 bred, 40 (eller 20) djup, 38/64/128/192 hög; bara 38 och 64 får hängas på vägg.
// METOD överskåp 40/60/80 bred, 37 djup, 40/60/80/100 hög.

export const IKEA = {
  besta: { name: 'BESTÅ', ws: [.6, 1.2, 1.8], hs: [.38, .64, 1.28, 1.92], ds: [.4, .2], hang: .64 },
  metod: { name: 'METOD överskåp', ws: [.4, .6, .8], hs: [.4, .6, .8, 1.0], ds: [.37], hang: 1.0 },
};
export const PARTS = {
  besta:   { name: 'BESTÅ', icon: '▭', cat: 'IKEA', ikea: 1, def: { w: 1.2, h: .38, d: .4, front: 'dorr' } },
  metod:   { name: 'METOD överskåp', icon: '▭', cat: 'IKEA', ikea: 1, def: { w: .6, h: .6, d: .37, front: 'dorr' } },
  panel:   { name: 'Ribbpanel', icon: '|||', cat: 'Väggen', def: { w: 1.2, h: 2.0, d: .022, stil: 'akustik' } },
  farg:    { name: 'Färgyta', icon: '🎨', cat: 'Väggen', def: { w: 1.2, h: 2.0, d: .002, color: '#3b3f3a' } },
  gips:    { name: 'Gipsinbyggnad', icon: '▒', cat: 'Väggen', def: { w: 1.2, h: .6, d: .3 } },
  skiva:   { name: 'Skiva / hylla', icon: '▬', cat: 'Inbyggt', def: { w: 1.2, h: .03, d: .25 } },
  passbit: { name: 'Passbit', icon: '▕', cat: 'Inbyggt', def: { w: .06, h: 1.92, d: .4 } },
  kappa:   { name: 'Kappa till taket', icon: '▔', cat: 'Inbyggt', def: { w: 1.2, h: .3, d: .4 } },
  sockel:  { name: 'Sockel', icon: '▁', cat: 'Inbyggt', def: { w: 1.2, h: .1, d: .37 } },
  led:     { name: 'LED-list', icon: '💡', cat: 'Ljus & media', def: { w: 1.2, h: .012, d: .015, z: .02 } },
  tv:      { name: 'TV på väggen', icon: '📺', cat: 'Ljus & media', def: { inch: 65 } },
};
export const CATS = ['IKEA', 'Väggen', 'Inbyggt', 'Ljus & media'];
export const FRONTS = [['dorr', 'Dörrar'], ['lador', 'Lådor'], ['glas', 'Glasdörrar'], ['oppen', 'Öppen']];
export const PANEL_STIL = [['akustik', 'Ribbor på filt'], ['ribbor', 'Ribbor'], ['slat', 'Slät skiva']];
// tv-storlek → mått (16:9, ram 1 cm)
export const tvSize = inch => ({ w: inch * .0254 * .872 + .02, h: inch * .0254 * .49 + .02, d: .05 });
let nid = 1; export const pid = () => 'p' + Date.now().toString(36) + (nid++);
export function newPart(k, at = {}) {
  const P = PARTS[k], p = { id: pid(), k, x: 0, y: 0, ...JSON.parse(JSON.stringify(P.def)), ...at };
  if (k === 'tv') Object.assign(p, tvSize(p.inch), { z: .03 });
  return p;
}
export const isIkea = p => !!PARTS[p.k]?.ikea;
// får den här IKEA-stommen hänga på väggen?
export const hangOk = p => !isIkea(p) || p.y < .02 || p.h <= IKEA[p.k].hang + .001;

// ---------- snäpp: väggens kanter, golv, tak, fönster och andra delars kanter ----------
export function snapMove(p, x, y, parts, L, H, win = [], T = .04) {
  const xs = [[0, 0], [L - p.w, L]], ys = [[0, 0], [H - p.h, H]], guides = [];
  for (const q of parts) { if (q === p) continue;
    xs.push([q.x, q.x], [q.x + q.w, q.x + q.w], [q.x - p.w, q.x], [q.x + q.w - p.w, q.x + q.w], [q.x + q.w / 2 - p.w / 2, q.x + q.w / 2]);
    ys.push([q.y, q.y], [q.y + q.h, q.y + q.h], [q.y - p.h, q.y], [q.y + q.h - p.h, q.y + q.h]); }
  for (const [a, w] of win) xs.push([a, a], [a + w, a + w], [a - p.w, a], [a + w - p.w, a + w]);
  let bx = null, by = null;
  for (const [v, g] of xs) if (Math.abs(v - x) < T && (!bx || Math.abs(v - x) < Math.abs(bx[0] - x))) bx = [v, g];
  for (const [v, g] of ys) if (Math.abs(v - y) < T && (!by || Math.abs(v - y) < Math.abs(by[0] - y))) by = [v, g];
  if (bx) { x = bx[0]; guides.push({ x: bx[1] }); } if (by) { y = by[0]; guides.push({ y: by[1] }); }
  return { x: Math.round(x * 1000) / 1000, y: Math.round(Math.max(0, y) * 1000) / 1000, guides };
}

// ---------- gör det inbyggt: passbitar mot väggarna, kappa upp till taket, sockel ----------
const cab = p => p.k === 'besta' || p.k === 'metod';
export function builtIn(parts, L, H, what, on) {
  const keep = parts.filter(p => p.auto !== what);
  if (!on) return keep;
  const cabs = keep.filter(cab); if (!cabs.length) return keep;
  const add = [];
  if (what === 'passbit') {
    const minx = Math.min(...cabs.map(p => p.x)), maxx = Math.max(...cabs.map(p => p.x + p.w));
    const near = side => cabs.filter(p => side < 0 ? p.x - minx < .02 : maxx - (p.x + p.w) < .02);
    if (minx > .005 && minx < .3) { const g = near(-1), y0 = Math.min(...g.map(p => p.y)), y1 = Math.max(...g.map(p => p.y + p.h));
      add.push({ id: pid(), k: 'passbit', auto: 'passbit', x: 0, y: y0, w: +minx.toFixed(3), h: +(y1 - y0).toFixed(3), d: Math.max(...g.map(p => p.d)) }); }
    if (L - maxx > .005 && L - maxx < .3) { const g = near(1), y0 = Math.min(...g.map(p => p.y)), y1 = Math.max(...g.map(p => p.y + p.h));
      add.push({ id: pid(), k: 'passbit', auto: 'passbit', x: +maxx.toFixed(3), y: y0, w: +(L - maxx).toFixed(3), h: +(y1 - y0).toFixed(3), d: Math.max(...g.map(p => p.d)) }); }
  }
  if (what === 'kappa') { // ovanför höga skåp (överkant > 1,5 m): från överkanten upp till taket
    const tall = keep.filter(p => (cab(p) || p.k === 'passbit') && p.y + p.h > 1.5).sort((a, b) => a.x - b.x);
    let run = null; const flush = () => { if (run && H - run.top > .01 && H - run.top < .9) add.push({ id: pid(), k: 'kappa', auto: 'kappa', x: run.x, y: run.top, w: +(run.x1 - run.x).toFixed(3), h: +(H - run.top).toFixed(3), d: run.d }); run = null; };
    for (const p of tall) { if (run && p.x <= run.x1 + .01 && Math.abs(p.y + p.h - run.top) < .02) { run.x1 = Math.max(run.x1, p.x + p.w); run.d = Math.max(run.d, p.d); } else { flush(); run = { x: p.x, x1: p.x + p.w, top: p.y + p.h, d: p.d }; } }
    flush();
  }
  if (what === 'sockel') for (const p of cabs.filter(p => p.y > .03 && p.y < .2)) add.push({ id: pid(), k: 'sockel', auto: 'sockel', x: p.x, y: 0, w: p.w, h: p.y, d: Math.max(.05, p.d - .04) });
  return [...keep, ...add];
}

// ---------- färdiga förslag, anpassade efter väggens mått ----------
const fitN = (room, w) => Math.max(0, Math.floor((room + 1e-6) / w));
// största fria väggbiten (utan fönster och dörrar) – förslagen läggs där
export function freeSpan(L, win = [], doors = [], items = []) {
  const occ = [...win.map(([a, w]) => [a, a + w]), ...doors.map(([a, w]) => [a, a + w]), ...items.map(([a, w]) => [a, a + w])].map(([a, b]) => [Math.max(0, a - .05), Math.min(L, b + .05)]).sort((x, y) => x[0] - y[0]);
  let best = [0, 0], cur = 0; for (const [a, b] of occ) { if (a - cur > best[1] - best[0]) best = [cur, a]; cur = Math.max(cur, b); }
  if (L - cur > best[1] - best[0]) best = [cur, L]; return best;
}
export function suggestions(L0, H, win = [], doors = [], items = []) {
  const [s0, s1] = freeSpan(L0, win, doors, items), L = s1 - s0 >= 1.2 ? s1 - s0 : L0, off = s1 - s0 >= 1.2 ? s0 : 0;
  return suggestionsIn(L, H).map(sg => ({ ...sg, parts: sg.parts.map(p => ({ ...p, x: +(p.x + off).toFixed(3) })) }));
}
function suggestionsIn(L, H) {
  const out = [], C = (k, a) => newPart(k, a);
  // A: torn i båda ändar + vägghängd bänk + ribbor bakom tv:n
  if (L >= 2.6) { const P = [], tw = .6, bench = []; P.push(C('besta', { x: 0, y: 0, w: tw, h: 1.92, front: 'dorr' }), C('besta', { x: L - tw, y: 0, w: tw, h: 1.92, front: 'dorr' }));
    const room = L - 2 * tw - .2; let n120 = Math.min(3, fitN(room, 1.2)), bw = n120 * 1.2; if (!n120) { bw = Math.min(1.2, fitN(room, .6) * .6); }
    const bx = (L - bw) / 2; for (let x = bx; x < bx + bw - .01;) { const w = bw - (x - bx) >= 1.19 && n120 ? 1.2 : .6; bench.push(C('besta', { x, y: .25, w, h: .38, front: 'lador' })); x += w; }
    P.push(...bench, C('skiva', { x: bx - .02, y: .63, w: bw + .04, h: .03, d: .42, auto: 'top' }));
    P.push(C('panel', { x: tw, y: .66, w: L - 2 * tw, h: 1.26, stil: 'akustik' }));
    const inch = bw >= 2.4 ? 75 : 65; P.push(C('tv', { inch, x: L / 2 - tvSize(inch).w / 2, y: 1.05 }));
    P.push(C('led', { x: tw + .05, y: .64, w: L - 2 * tw - .1 }));
    out.push({ name: 'Torn + vägghängd bänk', parts: fixTv(builtIn(builtIn(P, L, H, 'kappa', true), L, H, 'passbit', true)) }); }
  // B: lång låg bänk + svävande hyllor + mörk färgyta
  { const P = [], n = Math.min(3, fitN(L - .6, 1.2)), bw = Math.max(1.2, n * 1.2), bx = (L - bw) / 2;
    for (let i = 0; i < Math.max(1, n); i++) P.push(C('besta', { x: bx + i * 1.2, y: .2, w: 1.2, h: .38, front: 'dorr' }));
    P.unshift(C('farg', { x: 0, y: 0, w: L, h: H, color: '#3b4038' }));
    if (L - bw > 1.0) for (const sx of [.15, L - .15 - .8]) for (const y of [1.25, 1.6]) P.push(C('skiva', { x: sx, y, w: .8, h: .03, d: .22 }));
    P.push(C('tv', { inch: 65, x: L / 2 - tvSize(65).w / 2, y: 1.0 }), C('led', { x: bx + .05, y: .19, w: bw - .1 }));
    out.push({ name: 'Låg bänk + hyllor', parts: fixTv(P) }); }
  // C: bokhylla runt tv:n (inbyggd från vägg till vägg)
  if (L >= 2.4) { const P = [], gap = 1.8, cols = fitN((L - gap) / 2, .6), side = cols * .6, x0 = (L - (2 * side + gap)) / 2;
    for (let i = 0; i < cols; i++) { P.push(C('besta', { x: x0 + i * .6, y: 0, w: .6, h: 1.92, front: i % 2 ? 'oppen' : 'dorr' })); P.push(C('besta', { x: x0 + side + gap + i * .6, y: 0, w: .6, h: 1.92, front: i % 2 ? 'dorr' : 'oppen' })); }
    for (let x = x0 + side; x < x0 + side + gap - .01; x += .6) { P.push(C('besta', { x, y: 0, w: .6, h: .38, front: 'lador' })); P.push(C('besta', { x, y: 1.54, w: .6, h: .38, front: 'oppen' })); }
    P.push(C('tv', { inch: 65, x: L / 2 - tvSize(65).w / 2, y: .7 }), C('led', { x: x0 + side + .05, y: 1.52, w: gap - .1 }));
    out.push({ name: 'Bokhylla runt tv:n', parts: fixTv(builtIn(builtIn(P, L, H, 'kappa', true), L, H, 'passbit', true)) }); }
  // D: ribbad vägg + flytande bänk
  { const P = [], pw = Math.min(L, Math.max(1.8, L * .6)), px = (L - pw) / 2, bw = L >= 2.2 ? 1.8 : 1.2, bx = (L - bw) / 2;
    P.push(C('panel', { x: px, y: 0, w: pw, h: H, stil: 'akustik' }));
    if (bw === 1.8) P.push(C('besta', { x: bx, y: .3, w: 1.2, h: .38, front: 'lador' }), C('besta', { x: bx + 1.2, y: .3, w: .6, h: .38, front: 'lador' })); else P.push(C('besta', { x: bx, y: .3, w: 1.2, h: .38, front: 'lador' }));
    P.push(C('led', { x: bx + .05, y: .29, w: bw - .1 }), C('tv', { inch: 65, x: L / 2 - tvSize(65).w / 2, y: 1.05 }));
    out.push({ name: 'Ribbad vägg + flytande bänk', parts: fixTv(P) }); }
  return out;
}
const fixTv = P => P.map(p => p.k === 'tv' ? { ...p, ...tvSize(p.inch), z: .03 } : p);

// ---------- inköpslista ----------
const cm = v => Math.round(v * 100);
export function byggList(parts, o = {}) {
  const L = { IKEA: new Map(), Bygghandeln: new Map(), El: new Map(), Färg: new Map() }, add = (s, k, n = 1) => L[s].set(k, (L[s].get(k) || 0) + n);
  const own = o.fronter === 'egna';
  let led = 0, nLed = 0, paint = 0, gipsM2 = 0, regel = 0;
  for (const p of parts) {
    if (p.k === 'besta') { add('IKEA', `BESTÅ stomme ${cm(p.w)}×${cm(p.d)}×${cm(p.h)}`); const cols = Math.max(1, Math.round(p.w / .6));
      if (p.y > .02) add('IKEA', 'BESTÅ upphängningsskena');
      if (p.front !== 'oppen') { const rows = p.h > 1.5 ? 3 : p.h > 1 ? 2 : 1, fh = cm(p.h / rows), n = cols * rows * (p.front === 'lador' ? 2 : 1), dh = Math.round(fh / 2);
        const nm = p.front === 'lador' ? `BESTÅ låda med lådfront 60×${dh}` : p.front === 'glas' ? `BESTÅ glasdörr 60×${fh}` : `BESTÅ dörr 60×${fh}`;
        if (own && p.front !== 'glas') add('Bygghandeln', `Egen front 60×${p.front === 'lador' ? dh : fh} (snickras/beställs)`, n);
        else add('IKEA', nm, n); } }
    if (p.k === 'metod') { add('IKEA', `METOD överskåp ${cm(p.w)}×37×${cm(p.h)}`); add('IKEA', 'METOD upphängningsskena'); if (p.front !== 'oppen') add(own ? 'Bygghandeln' : 'IKEA', `${own ? 'Egen front' : 'METOD dörr'} ${cm(p.w)}×${cm(p.h)}`); }
    if (p.k === 'panel') add('Bygghandeln', `${p.stil === 'akustik' ? 'Akustikpanel (ribbor på filt)' : p.stil === 'ribbor' ? 'Ribbpanel' : 'Skiva'} ${cm(p.w)}×${cm(p.h)} cm · ${(p.w * p.h).toFixed(1)} m²`);
    if (p.k === 'skiva') add('Bygghandeln', `Skiva/hylla ${cm(p.w)}×${cm(p.d)} cm, ${Math.round(p.h * 1000)} mm`);
    if (p.k === 'passbit' || p.k === 'kappa' || p.k === 'sockel') add('Bygghandeln', `${PARTS[p.k].name} ${cm(p.w)}×${cm(p.h)} cm (skiva 16–19 mm${p.k === 'kappa' ? ' + regel' : ''})`);
    if (p.k === 'gips') { const a = p.w * p.h + 2 * p.d * p.h + 2 * p.w * p.d; gipsM2 += a; regel += 2 * (p.w + p.h) * 2 + 4 * p.d * 2; }
    if (p.k === 'led') { led += p.w; nLed++; }
    if (p.k === 'farg') paint += p.w * p.h;
    if (p.k === 'tv') add('El', `Väggfäste för tv ${p.inch}"`);
  }
  if (gipsM2) { add('Bygghandeln', 'Gipsskiva 12,5 mm · 900×2400', Math.ceil(gipsM2 * 1.15 / 2.16)); add('Bygghandeln', 'Regel 45×45 · 3,6 m', Math.ceil(regel * 1.1 / 3.6)); add('Bygghandeln', 'Gipsskruv 3,9×25 (paket)', 1); add('Bygghandeln', 'Spackel + skarvremsa', 1); }
  if (led) { add('El', 'LED-list 24 V · rulle 5 m', Math.ceil(led / 5)); add('El', 'LED-drivare 24 V', nLed); add('El', 'Smart dimmer (Home Assistant)', 1); }
  if (paint) { add('Färg', `Väggfärg ca ${Math.max(1, Math.ceil(paint * 2 / 8))} liter (${paint.toFixed(1)} m², 2 strykningar)`); add('Färg', 'Maskeringstejp + roller', 1); }
  return L;
}
