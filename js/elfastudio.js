// Elfa-verkstan: 1) välj vägg, system och färg  2) bygg väggen i stort format (dra in delar)  3) sätt in i rummet.
// Används av demon (och sen huvudappen). Allt räknas i meter; ritningen i cm.
import { ELFA_SYS, ELFA_PARTS, ELFA_CATS, elfaWhyNot, ELFA_MODS, elfaSys, elfaGeo, elfaFits, elfaSnap, elfaClash, elfaAdd, elfaTemplate, elfaModsFor, elfaUnder, elfaDepth, elfaWidths, newFurniture } from './furniture.js?v=1794434861';
import { FAMILIES } from './presets.js?v=1794434861';
import { swatch } from './materials.js?v=1794434861';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const cm = v => Math.round(v * 100);
// Elfas egna namn på bredd/djup (W:60 = 607 mm, D:40 = 405 mm …)
const nm = v => { const c = v * 100, r = Math.round(c / 5) * 5; return Math.abs(r - c) < 1.2 ? r : Math.round(c); };
const BRK = { .305: 32, .405: 42, .494: 50 };
const SHELF = ['hylla', 'slat', 'trim', 'tra', 'mhylla'];
export const STUDIO_CSS = `
.es-ov{position:fixed;inset:0;z-index:50;background:#0b0e0b;color:#e9ede6;display:flex;flex-direction:column;font-family:inherit}
.es-top{display:flex;align-items:center;gap:14px;padding:10px 16px;border-bottom:1px solid rgba(190,210,175,.13)}
.es-top b{font-size:17px}
.es-steps{display:flex;gap:6px;margin:0 auto}
.es-steps button{background:none;border:1px solid rgba(190,210,175,.18);color:#8f9a8b;border-radius:99px;padding:7px 14px;cursor:pointer;font-size:13px}
.es-steps button.on{background:#ff7a2f;color:#1a0d05;border-color:#ff7a2f;font-weight:700}
.es-steps button.done{color:#7bd88f;border-color:rgba(123,216,143,.4)}
.es-x{background:none;border:1px solid rgba(190,210,175,.18);color:#e9ede6;border-radius:9px;width:36px;height:36px;font-size:16px;cursor:pointer}
.es-body{flex:1;min-height:0;display:grid;gap:12px;padding:12px}
.es-body.s1{grid-template-columns:minmax(260px,1fr) 1.4fr;overflow:auto}
.es-body.s2{grid-template-columns:170px 1fr 250px}
.es-body.s3{grid-template-columns:1fr 1fr;overflow:auto}
.es-card{background:#141914;border:1px solid rgba(190,210,175,.13);border-radius:14px;padding:12px;min-height:0;overflow:auto}
.es-card h4{margin:0 0 8px;font-size:11px;letter-spacing:.14em;color:#8f9a8b;font-weight:600}
.es-card h4:not(:first-child){margin-top:14px}
.es-sys{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.es-sys button{background:#0f130f;border:2px solid rgba(190,210,175,.13);border-radius:12px;padding:10px;cursor:pointer;text-align:left;color:#e9ede6}
.es-sys button i{font-style:normal;font-size:26px;display:block}
.es-sys button b{display:block;margin:4px 0 2px;font-size:14px}
.es-sys button span{font-size:11.5px;color:#8f9a8b;line-height:1.3}
.es-sys button.on{border-color:#ff7a2f;background:rgba(255,122,47,.08)}
.es-sw{display:flex;flex-wrap:wrap;gap:8px}
.es-sw button{background:none;border:2px solid transparent;border-radius:10px;padding:3px;cursor:pointer;color:#8f9a8b;font-size:11px;display:flex;flex-direction:column;align-items:center;gap:3px;width:68px}
.es-sw button img{width:56px;height:56px;border-radius:8px}
.es-sw button.on{border-color:#ff7a2f;color:#e9ede6}
.es-seg{display:flex;flex-wrap:wrap;gap:5px}
.es-seg button{background:#0f130f;border:1px solid rgba(190,210,175,.18);color:#cfd6cb;border-radius:9px;padding:7px 11px;cursor:pointer;font-size:13px}
.es-seg button.on{border-color:#ff7a2f;color:#fff;background:rgba(255,122,47,.14)}
.es-seg button:disabled{opacity:.35;cursor:default}
.es-pal{display:grid;grid-template-columns:1fr 1fr;gap:5px}.es-pal h5{grid-column:1/-1;margin:8px 0 0;font-size:10px;letter-spacing:.12em;color:#8f9a8b;font-weight:600}
.es-pal button{background:#0f130f;border:1px solid rgba(190,210,175,.18);border-radius:11px;padding:6px 2px;cursor:grab;color:#e9ede6;font-size:21px;display:flex;flex-direction:column;align-items:center;gap:2px;touch-action:none;user-select:none}
.es-pal button span{font-size:9.5px;color:#8f9a8b;text-align:center;line-height:1.15}
.es-pal button:hover{border-color:#ff7a2f}
.es-pal button.off{opacity:.3}
.es-cv{display:flex;flex-direction:column;min-height:0}
.es-cv .es-hd{font-size:12px;color:#8f9a8b;margin:0 0 6px;display:flex;justify-content:space-between;gap:8px}
.es-svg{flex:1;min-height:0;width:100%;background:#0f130f;border:1px solid rgba(190,210,175,.13);border-radius:14px;touch-action:none;user-select:none}
.es-svg .sec{fill:transparent;cursor:pointer}.es-svg .sec:hover{fill:rgba(255,255,255,.03)}.es-svg .sec.on{fill:rgba(255,122,47,.07);stroke:#ff7a2f;stroke-width:1.2;stroke-dasharray:4 3}
.es-svg .pt{cursor:grab}.es-svg .pt .hit{fill:transparent}.es-svg .pt:hover .hit{fill:rgba(255,255,255,.06)}
.es-svg .pt.on .hit{fill:rgba(255,122,47,.18);stroke:#ff7a2f;stroke-width:1.5}
.es-svg .bad .hit{fill:rgba(255,90,74,.25);stroke:#ff5a4a;stroke-width:1.5}
.es-svg .chip{cursor:pointer}.es-svg .chip rect{fill:#1c231c;stroke:rgba(190,210,175,.3)}.es-svg .chip.on rect{stroke:#ff7a2f;fill:#2a1d13}
.es-svg text{font-family:inherit;pointer-events:none}
.es-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 16px;border-top:1px solid rgba(190,210,175,.13)}
.es-btn{background:#ff7a2f;color:#1a0d05;font-weight:700;border:0;border-radius:12px;padding:12px 20px;font-size:15px;cursor:pointer}
.es-btn.ghost{background:none;color:#e9ede6;border:1px solid rgba(190,210,175,.2);font-weight:500}
.es-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(190,210,175,.08);font-size:13.5px;gap:8px}
.es-row:last-child{border:0}
.es-tog{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;font-size:13.5px;padding:6px 0}
.es-tog i{width:38px;height:22px;border-radius:99px;background:#2a332a;position:relative;flex:none}
.es-tog i:after{content:'';position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#cfd6cb;transition:.15s}
.es-tog.on i{background:#ff7a2f}.es-tog.on i:after{left:19px;background:#fff}
.es-msg{position:fixed;left:50%;bottom:76px;transform:translateX(-50%);background:#2a1d13;border:1px solid #ff7a2f;color:#fff;padding:9px 16px;border-radius:99px;font-size:13px;z-index:60;pointer-events:none;opacity:0;transition:.2s}
.es-msg.show{opacity:1}
.es-note{font-size:12px;color:#8f9a8b;margin-top:6px;line-height:1.4}
.es-big{font-size:15px}
input.es-rng{width:100%}
.es-svg .sec{cursor:grab}.es-svg .trk{fill:rgba(255,122,47,0);cursor:ns-resize}.es-svg .trk:hover,.es-svg .trk.on{fill:rgba(255,122,47,.45)}
.es-svg .hdl{cursor:ew-resize}.es-svg .hdl rect{fill:#ff7a2f}.es-svg .hdl:hover rect{fill:#ff9a5c}
.es-tips{font-size:13px;color:#cfd6cb;line-height:1.9;background:#0f130f;border-radius:10px;padding:8px 10px}
.es-sel{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0 10px}.es-sel i{font-style:normal;font-size:44px}.es-sel b{font-size:16px}.es-sel span{color:#8f9a8b;font-size:13px}
.es-wide{display:grid !important;grid-template-columns:1fr 1fr 1fr}.es-wide button{font-size:18px;padding:10px}
.es-more{background:none;border:0;color:#8f9a8b;cursor:pointer;padding:12px 0 4px;font-size:13px}
@media (max-width:900px){.es-body.s1,.es-body.s2,.es-body.s3{grid-template-columns:1fr;overflow:auto}.es-pal{flex-direction:row;flex-wrap:wrap}.es-pal button{width:74px}.es-svg{min-height:55vh}}
`;

// ---------- ritning framifrån (används också som liten förhandsbild i panelen) ----------
export function elevationSvg(o, m, { wall = null, off = 0, roomH = 2.5, sel = null, ghost = null, cls = 'es-svg', interactive = false, guide = [], drag = null } = {}) {
  const g = elfaGeo(o), { s, H, L, yB, xs, W } = g, len = wall ? wall.len : W, RH = wall ? roomH : Math.max(H + .05, 1);
  const X = v => +(v * 100).toFixed(1), Y = v => +((RH - v) * 100).toFixed(1), X0 = wall ? off : 0;
  const metal = m?.stomme?.color || '#f2f2f0', wood = m?.decor?.color || '#d9bf98', rod = '#c9cbcd';
  let out = '';
  if (wall) { out += `<rect x="0" y="0" width="${X(len)}" height="${X(RH)}" fill="#20271f"/><rect x="0" y="${X(RH)}" width="${X(len)}" height="10" fill="#4a3a28"/>`;
    for (const [a, w, sill, h] of wall.win || []) out += `<rect x="${X(a)}" y="${Y(sill + h)}" width="${X(w)}" height="${X(h)}" fill="#2a3b4c" stroke="#7f9fbf" stroke-width="1.5"/><line x1="${X(a + w / 2)}" x2="${X(a + w / 2)}" y1="${Y(sill + h)}" y2="${Y(sill)}" stroke="#7f9fbf"/>`;
    for (const [a, w, h] of wall.doors || []) out += `<rect x="${X(a)}" y="${Y(h)}" width="${X(w)}" height="${X(h)}" fill="#151a15" stroke="#6b7a68" stroke-width="1.5"/>`; }
  const ux = v => X(X0 + v);
  // sektionernas klickytor
  o.mods.forEach((md, i) => { const a = xs[i], b = xs[i + 1] + .025; out += `<rect class="sec ${sel && sel.sec === i ? 'on' : ''}" data-sec="${i}" x="${ux(a)}" y="${Y(H + .02)}" width="${X(b - a)}" height="${X(H + .02 - Math.max(0, yB - .05))}" rx="3"/>`; });
  // stommen
  const fr = (x, y, w, h, f = metal, ex = '') => `<rect x="${ux(x)}" y="${Y(y + h)}" width="${Math.max(.6, X(w))}" height="${Math.max(.6, X(h))}" fill="${f}" ${ex}/>`;
  if (g.track) { out += fr(0, H - .032, W, .032); for (const sx of xs) out += fr(sx, yB, .025, L, metal, 'opacity=".85"'); }
  if (s === 'hylla') for (const sx of xs) out += fr(sx, yB, .025, L, metal, 'opacity=".85"');
  if (s === 'frist') { for (const sx of xs) { out += fr(sx, .06, .025, H - .09); out += fr(sx - .1, 0, .225, .06); } out += fr(0, H - .031, W, .031); }
  if (s === 'lada') { const fh = o.ram; for (const sx of xs) out += fr(sx, yB, .025, fh); o.mods.forEach((md, i) => { for (const y of [yB, yB + fh - .03]) out += fr(xs[i] + .025, y, xs[i + 1] - xs[i] - .025, .03, metal, 'opacity=".6"'); });
    if (o.toppskiva !== false) out += fr(-.005, yB + fh, W + .01, .02); if (o.hjul) for (const sx of xs) out += `<circle cx="${ux(sx + .0125)}" cy="${Y(.035)}" r="3.5" fill="#222"/>`; }
  // delarna
  o.mods.forEach((md, i) => { const bad = elfaClash(md, o), xa = xs[i] + .025, xb = xs[i + 1], w = xb - xa;
    if (interactive && !md.parts.length) out += `<text x="${ux(xa + w / 2)}" y="${Y(yB + (H - yB) / 2)}" fill="#5d6a5b" font-size="13" text-anchor="middle">dra in</text><text x="${ux(xa + w / 2)}" y="${Y(yB + (H - yB) / 2) + 16}" fill="#5d6a5b" font-size="13" text-anchor="middle">delar här</text>`;
    const P = md.parts.map((p, j) => ({ ...p, j, y: H - p.dn, u: elfaUnder(p, o) }));
    const below = (y, j) => Math.max(.02, ...P.filter(q => q.j !== j && q.y < y - .001).map(q => q.y));
    for (const p of P) { const { y, u, j } = p, on = sel && sel.sec === i && sel.part === j, ok = elfaFits(p, md.w, o);
      let v = '';
      if (SHELF.includes(p.t)) v = fr(xa - .005, y - (p.t === 'mhylla' ? .019 : p.t === 'tra' || p.t === 'trim' ? .032 : .018), w + .01, p.t === 'tra' || p.t === 'trim' ? .032 : .02, p.t === 'tra' ? wood : p.t === 'mhylla' || p.t === 'slat' ? metal : '#e8ece6')
        + (p.t === 'trim' ? fr(xa - .005, y - .032, w + .01, .02, wood) : '');
      else if (p.t === 'stang') { const ry = y - .075, room = ry - below(y, j) - .06, L2 = Math.min(room, room > 1.05 ? 1.15 : .9);
        if (room > .3 && o.klader !== false) { for (let k = 0, n = Math.max(3, Math.floor(w / .045)); k < n; k++) { const cx = xa + .02 + k * (w - .04) / (n - 1), ll = L2 * (.75 + ((k * 37) % 10) / 40);
          out += `<path d="M${ux(cx - .018)} ${Y(ry - .03)} L${ux(cx + .018)} ${Y(ry - .03)} L${ux(cx + .02)} ${Y(ry - .03 - ll)} L${ux(cx - .02)} ${Y(ry - .03 - ll)} Z" fill="#5c6f8a" opacity=".28"/>`; } }
        v = fr(xa, ry - .0125, w, .025, rod) + fr(xa + .01, ry, .012, .06, metal) + fr(xb - .022, ry, .012, .06, metal); }
      else if (ELFA_PARTS[p.t].h) { const h = ELFA_PARTS[p.t].h, y0 = s === 'lada' ? y - u + .008 : y - .02 - h, wire = p.t.startsWith('trad');
        v = fr(xa + .005, y0, w - .01, h, p.t === 'tralada' ? wood : wire ? 'none' : '#d7ddd4', `rx="2" stroke="${wire ? metal : '#8b958a'}" stroke-width="${wire ? 1.6 : .8}"`);
        if (wire) for (let k = 1; k < Math.floor((w - .01) / .025); k++) v += `<line x1="${ux(xa + .005 + k * .025)}" x2="${ux(xa + .005 + k * .025)}" y1="${Y(y0 + h)}" y2="${Y(y0)}" stroke="${metal}" stroke-width=".7" opacity=".8"/>`;
        else v += fr(xa + w / 2 - .05, y0 + h - .04, .1, .012, '#6b756a', 'rx="2"'); }
      else if (p.t === 'korg') { v = fr(xa, y - .096, w, .096, 'none', `stroke="${metal}" stroke-width="1.6"`); for (let k = 1; k < Math.floor(w / .025); k++) v += `<line x1="${ux(xa + k * .025)}" x2="${ux(xa + k * .025)}" y1="${Y(y)}" y2="${Y(y - .096)}" stroke="${metal}" stroke-width=".7"/>`; }
      else if (p.t === 'bricka') v = fr(xa, y - .045, w, .045, 'none', `stroke="${metal}" stroke-width="2"`) + fr(xa, y - .045, w, .006, metal);
      else if (p.t === 'skodrag') { v = fr(xa, y - .1, w, .05, 'none', `stroke="${metal}" stroke-width="1.6"`); if (o.klader !== false) for (let k = 0; k < Math.floor(w / .1); k++) v += `<ellipse cx="${ux(xa + .05 + k * .1)}" cy="${Y(y - .06)}" rx="4.5" ry="3.2" fill="#6d5a4a" opacity=".7"/>`; }
      else if (p.t === 'skogrund') { v = `<line x1="${ux(xa)}" y1="${Y(y - .02)}" x2="${ux(xb)}" y2="${Y(y - .02)}" stroke="${metal}" stroke-width="2"/><line x1="${ux(xa)}" y1="${Y(y - .09)}" x2="${ux(xb)}" y2="${Y(y - .09)}" stroke="${metal}" stroke-width="2"/>`;
        if (o.klader !== false) for (let k = 0; k < Math.floor(w / .1); k++) v += `<rect x="${ux(xa + .03 + k * .1)}" y="${Y(y - .03)}" width="6" height="12" rx="2" fill="#6d5a4a" opacity=".7"/>`; }
      else if (p.t === 'krok') { v = fr(xa, y - .07, w, .064, metal); for (let k = 0; k < 3; k++) v += fr(xa + w * (k + .5) / 3 - .009, y - .09, .018, .03, metal); }
      else if (p.t === 'sko') { v = `<line x1="${ux(xa)}" y1="${Y(y - .09)}" x2="${ux(xb)}" y2="${Y(y - .035)}" stroke="${metal}" stroke-width="3"/>`;
        if (o.klader !== false) for (let k = 0; k < Math.floor(w / .11); k++) { const cx = xa + .06 + k * .11; v += `<ellipse cx="${ux(cx)}" cy="${Y(y - .085 + (cx - xa) / w * .055 + .035)}" rx="4.5" ry="3.2" fill="#6d5a4a" opacity=".7"/>`; } }
      else if (p.t === 'byxa') { v = fr(xa, y - .05, w, .024, metal); if (o.klader !== false) for (let k = 0; k < Math.floor(w / .06); k++) v += fr(xa + .02 + k * .06, y - .5, .02, .45, '#4d5d73', 'opacity=".35"'); }
      else if (p.t === 'led') v = fr(xa + .01, y - .05, w - .02, .01, '#ffd27a', 'filter="drop-shadow(0 0 3px #ffd27a)"');
      const top = p.t === 'stang' ? y : y + .005, bot = Math.min(y - u, p.t === 'stang' ? y - .1 : y - Math.max(u, .04));
      out += `<g class="pt ${on ? 'on' : ''} ${bad.has(j) ? 'bad' : ''}" data-sec="${i}" data-part="${j}">${v}${interactive ? `<rect class="hit" x="${ux(xa)}" y="${Y(top)}" width="${X(w)}" height="${X(top - bot)}" rx="2"/>` : ''}</g>`;
      if (!ok) out += `<text x="${ux(xa + w / 2)}" y="${Y(y) - 3}" fill="#ff7a6a" font-size="9" text-anchor="middle">${elfaWhyNot(p.t, md.w, o)}</text>`; }
  });
  // spöke medan man drar
  if (ghost) { const h = Math.max(ghost.u, .03); out += `<rect x="${ux(ghost.xa)}" y="${Y(ghost.y)}" width="${X(ghost.w)}" height="${X(h)}" fill="${ghost.ok ? 'rgba(255,122,47,.35)' : 'rgba(255,90,74,.35)'}" stroke="${ghost.ok ? '#ff7a2f' : '#ff5a4a'}" stroke-width="2" stroke-dasharray="5 4" rx="2"/>
    <text x="${ux(ghost.xa + ghost.w + .02)}" y="${Y(ghost.y) + 10}" fill="#ff7a2f" font-size="12">${cm(ghost.y)} cm</text>`; }
  // handtag: bärlisten (höjd) och kanterna (fler/färre sektioner) + hjälplinjer
  if (interactive) {
    if (g.track || s === 'hylla') out += `<rect class="trk ${drag === 'trk' ? 'on' : ''}" data-trk="1" x="${ux(-.02)}" y="${Y(H + .045)}" width="${X(W + .04)}" height="9" rx="3"/><text x="${ux(W + .04)}" y="${Y(H) + 4}" fill="#ff7a2f" font-size="12">↕ ${cm(H)} cm</text>`;
    const cy = yB + (H - yB) / 2; for (const [sd, x] of [['l', -.06], ['r', W + .06]]) out += `<g class="hdl" data-hdl="${sd}"><rect x="${ux(x) - 7}" y="${Y(cy) - 22}" width="14" height="44" rx="7"/><text x="${ux(x)}" y="${Y(cy) + 4}" fill="#1a0d05" font-size="12" font-weight="700" text-anchor="middle">⇔</text></g>`;
    for (const gx of guide) out += `<line x1="${X(gx)}" x2="${X(gx)}" y1="0" y2="${X(RH)}" stroke="#ff7a2f" stroke-width="1.5" stroke-dasharray="6 5"/>`; }
  // breddknappar + mått
  if (interactive) { o.mods.forEach((md, i) => { const cx = (xs[i] + xs[i + 1] + .025) / 2; out += `<g class="chip ${sel && sel.sec === i ? 'on' : ''}" data-chip="${i}"><rect x="${ux(cx) - 22}" y="${X(RH) + 14}" width="44" height="20" rx="6"/><text x="${ux(cx)}" y="${X(RH) + 28}" fill="#e9ede6" font-size="12" text-anchor="middle">${nm(md.w)} cm</text></g>`; });
    out += `<text x="${ux(W / 2)}" y="${X(RH) + 52}" fill="#8f9a8b" font-size="12" text-anchor="middle">↔ ${cm(W)} cm${wall ? ` · ${cm(off)} cm från vänster hörn · ${cm(Math.max(0, len - off - W))} cm kvar till höger` : ''}</text>`; }
  const pad = interactive ? 62 : 4;
  return `<svg class="${cls}" viewBox="-12 -12 ${X(len) + 24} ${X(RH) + pad + 12}" preserveAspectRatio="xMidYMid meet">${out}</svg>`;
}

// planen uppifrån där man väljer vägg (används också av byggverkstan)
export function wallPlanSvg(ws, sel) {
const xs = ws.flatMap(w => [w.x1, w.x2]), zs = ws.flatMap(w => [w.z1, w.z2]), mnx = Math.min(...xs), mxx = Math.max(...xs), mnz = Math.min(...zs), mxz = Math.max(...zs);
  const k = 100, u = Math.max(1, Math.max(mxx - mnx, mxz - mnz) / 4), P = (x, z) => [((x - mnx) * k + 40 * u), ((z - mnz) * k + 40 * u)];
return `<svg viewBox="0 0 ${((mxx - mnx) * k + 80 * u).toFixed(0)} ${((mxz - mnz) * k + 80 * u).toFixed(0)}" style="width:100%;max-height:360px">
    <rect x="${40 * u}" y="${40 * u}" width="${((mxx - mnx) * k).toFixed(0)}" height="${((mxz - mnz) * k).toFixed(0)}" fill="#1a201a"/>
    ${ws.map((w, i) => { const [ax, az] = P(w.x1, w.z1), [bx, bz] = P(w.x2, w.z2), on = i === sel, cx = (ax + bx) / 2 - w.nx * 26 * u, cz = (az + bz) / 2 - w.nz * 26 * u;
      return `<g data-wall="${i}" style="cursor:pointer"><line x1="${ax}" y1="${az}" x2="${bx}" y2="${bz}" stroke="${on ? '#ff7a2f' : '#9aa39a'}" stroke-width="${(on ? 14 : 8) * u}" stroke-linecap="round"/>
        <line x1="${ax}" y1="${az}" x2="${bx}" y2="${bz}" stroke="transparent" stroke-width="${44 * u}"/>
        ${w.win.map(([a, ww]) => { const p1 = P(w.x1 + w.rx * a, w.z1 + w.rz * a), p2 = P(w.x1 + w.rx * (a + ww), w.z1 + w.rz * (a + ww)); return `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#7fb2ff" stroke-width="${6 * u}"/>`; }).join('')}
        <text x="${cx}" y="${cz + 7 * u}" font-size="${22 * u}" font-weight="700" fill="${on ? '#ff7a2f' : '#8f9a8b'}" text-anchor="middle">${w.name}</text>
        <text x="${(ax + bx) / 2 + w.nx * 30 * u}" y="${(az + bz) / 2 + w.nz * 30 * u + 5 * u}" font-size="${14 * u}" fill="#8f9a8b" text-anchor="middle">${cm(w.len)} cm</text></g>`; }).join('')}</svg>`;
}

// ---------- verkstan ----------
export function openElfaStudio({ item, walls: walls0, rooms = null, startRoom = 0, roomH = 2.5, startWall = 0, startOff = null, onDone }) {
  rooms = rooms || [{ name: '', walls: walls0 }];
  if (!document.getElementById('es-css')) { const st = document.createElement('style'); st.id = 'es-css'; st.textContent = STUDIO_CSS; document.head.appendChild(st); }
  const base = item ? JSON.parse(JSON.stringify(item)) : newFurniture('elfa');
  const S = { o: base.o, m: base.m, wall: item?.o.wall ?? startWall, off: 0, step: item ? 2 : 1, sel: { sec: 0, part: null }, doors: false, drag: null };
  // ny inredning: bara stommen, inga delar – man bygger själv
  if (!item) S.o.mods = [{ t: 'tom', w: .607, parts: [] }, { t: 'tom', w: .607, parts: [] }];
  if (!S.o.mods.length) S.o.mods.push({ t: 'tom', w: .607, parts: [] });
  const fam = FAMILIES['Elfa'];
  const ov = document.createElement('div'); ov.className = 'es-ov'; document.body.appendChild(ov);
  const msg = document.createElement('div'); msg.className = 'es-msg'; ov.appendChild(msg);
  let msgT = 0; const say = t => { msg.textContent = t; msg.classList.add('show'); clearTimeout(msgT); msgT = setTimeout(() => msg.classList.remove('show'), 2200); };
  S.room = startRoom; const walls = () => rooms[S.room].walls;
  const W = () => walls()[S.wall], geo = () => elfaGeo(S.o), sys = () => elfaSys(S.o), SY = () => ELFA_SYS[sys()];
  const fit = () => { const g = geo(), len = W().len; S.off = Math.max(0, Math.min(S.off, len - g.W)); };
  // ny eller flyttad hit från rummet
  S.off = item ? (startOff ?? item.o.off ?? 0) : Math.max(0, (W().len - geo().W) / 2); fit();
  const resync = () => { const it = { o: S.o, w: 0, d: 0, h: 0 }; FURNSYNC(it); fit(); };
  // sektioner man inte rört byggs om efter mallen när ramen ändras (höjd, grenar) – ändrade sektioner behåller sina delar
  const refresh = () => { for (const md of S.o.mods) if (!md.edited) md.parts = elfaTemplate(md.t, md.w, S.o); resync(); };
  const choicesFor = g => fam.choices.filter(c => c.group === g && (!c.when || c.when(S.o)));
  // välj en giltig färg om systemet byts
  const fixColors = () => { for (const g of ['Metall', 'Trä']) { const cs = choicesFor(g); if (!cs.length) continue; const k = Object.keys(cs[0].m)[0], cur = S.m[k];
    let hit = cs.find(c => c.m[k].color === cur?.color && c.m[k].mat === cur?.mat); if (!hit) { hit = cs[0]; S.m[k] = { ...hit.m[k] }; } if (g === 'Metall') S.o.farg = hit.name; } };
  const setSystem = k => { S.o.system = k; const sy = ELFA_SYS[k]; S.o.djup = sy.dep[0] === .305 ? .405 : sy.dep[0];
    if (k === 'hylla') { S.o.gren = 1.98; S.o.skenaH = Math.min(roomH - .2, 2.1); } else if (sy.len) { S.o.gren = 2.14; S.o.skenaH = Math.min(roomH - .02, 2.2); }
    S.o.mods = S.o.mods.map(md => { const w = sy.ws.reduce((b, x) => Math.abs(x - md.w) < Math.abs(b - md.w) ? x : b, sy.ws[0]);
      return { t: 'tom', w, edited: true, parts: (md.parts || []).filter(p => ELFA_PARTS[p.t].sys.includes(k)) }; });   // behåll delar som finns i det nya systemet
    resync(); fixColors(); S.sel = { sec: 0, part: null }; };
  fixColors(); resync();

  function draw() {
    const steps = [['1', 'Vägg, system & färg'], ['2', 'Bygg'], ['3', 'Klart']];
    ov.innerHTML = `<div class="es-top"><b>🛠 Elfa-verkstan</b><div class="es-steps">${steps.map(([n, t], i) => `<button data-step="${i + 1}" class="${S.step === i + 1 ? 'on' : S.step > i + 1 ? 'done' : ''}">${S.step > i + 1 ? '✓' : n} ${t}</button>`).join('')}</div><button class="es-x" data-close title="Stäng utan att spara">✕</button></div>
      <div class="es-body s${S.step}">${S.step === 1 ? step1() : S.step === 2 ? step2() : step3()}</div>
      <div class="es-foot"><button class="es-btn ghost" data-${S.step === 1 ? 'close' : 'step="' + (S.step - 1) + '"'}>${S.step === 1 ? 'Avbryt' : '◀ Tillbaka'}</button>
      <span class="es-note">${esc(SY().name)} · ${S.o.mods.length} sektioner · ${cm(geo().W)} cm · vägg ${esc(W().name)}</span>
      ${S.step < 3 ? `<button class="es-btn" data-step="${S.step + 1}">Nästa ▶</button>` : `<button class="es-btn" data-done>✓ Sätt in i rummet</button>`}</div>`;
    ov.appendChild(msg);
  }
  // ---- steg 1 ----
  function step1() {
    const plan = wallPlanSvg(walls(), S.wall);
    return `<div class="es-card">${rooms.length > 1 ? `<h4>VILKET RUM?</h4><div class="es-seg" style="margin-bottom:10px">${rooms.map((r, i) => `<button data-room="${i}" class="${i === S.room ? 'on' : ''}">${esc(r.name)}</button>`).join('')}</div>` : ''}<h4>VILKEN VÄGG?</h4>${plan}<div class="es-note">Klicka på väggen där inredningen ska sitta. Fönster syns i nästa steg.</div></div>
      <div class="es-card"><h4>VILKET SYSTEM?</h4><div class="es-sys">${Object.entries(ELFA_SYS).map(([k, y]) => `<button data-sys="${k}" class="${sys() === k ? 'on' : ''}"><i>${y.icon}</i><b>${y.name}</b><span>${y.desc}</span></button>`).join('')}</div>
        ${colorBlock()}
        <h4>DJUP</h4><div class="es-seg">${SY().dep.map(d => `<button data-djup="${d}" class="${Math.abs(S.o.djup - d) < .002 ? 'on' : ''}">${nm(d)} cm</button>`).join('')}</div>
        ${sys() === 'lada' ? '' : `<div class="es-note">${sys() === 'hylla' ? 'Hyllornas djup. 25–30 cm passar böcker.' : 'Hyllornas djup. Klädstänger hänger mitt i, så kläder tar ca 45–55 cm från väggen.'}</div>`}</div>`;
  }
  function colorBlock() {
    return ['Metall', 'Trä'].map(g => { const cs = choicesFor(g); if (!cs.length || (g === 'Trä' && !fam.groupIf['Trä'](S.o))) return '';
      const k = Object.keys(cs[0].m)[0], cur = S.m[k];
      return `<h4>${g === 'Metall' ? 'FÄRG' : 'TRÄ'}</h4><div class="es-sw">${cs.map(c => `<button data-col="${fam.choices.indexOf(c)}" class="${cur && cur.color === c.m[k].color && cur.mat === c.m[k].mat ? 'on' : ''}"><img src="${swatch(c.m[k].mat, c.m[k].color)}">${esc(c.name)}</button>`).join('')}</div>`; }).join('')
      + (sys() === 'topp' ? `<div class="es-tog ${S.o.decor ? 'on' : ''}" data-tog="decor"><span>Décor-detaljer i trä på hyllor och lådor</span><i></i></div>` : '');
  }
  // ---- steg 2 ----
  function step2() {
    const md = S.o.mods[S.sel.sec] || S.o.mods[0], parts = Object.keys(ELFA_PARTS).filter(k => ELFA_PARTS[k].sys.includes(sys()));
    const P = S.sel.part !== null ? md.parts[S.sel.part] : null, g = geo();
    const unit = sys() === 'frist' ? `<h4>HÖJD</h4><div class="es-seg">${SY().hts.map(h => `<button data-hojd="${h}" class="${Math.abs(S.o.hojd - h) < .002 ? 'on' : ''}">${cm(h)} cm</button>`).join('')}</div>`
      : sys() === 'lada' ? `<h4>RAMENS HÖJD</h4><div class="es-seg">${SY().hts.map(h => `<button data-ram="${h}" class="${Math.abs(S.o.ram - h) < .002 ? 'on' : ''}">${cm(h)} cm</button>`).join('')}</div>
        <div class="es-tog ${S.o.hjul ? 'on' : ''}" data-tog="hjul"><span>Hjul</span><i></i></div><div class="es-tog ${S.o.toppskiva !== false ? 'on' : ''}" data-tog="toppskiva"><span>Toppskiva</span><i></i></div>`
      : `<h4>${sys() === 'hylla' ? 'VÄGGLISTER' : 'GRENAR'}</h4><div class="es-seg">${SY().len.map(l => `<button data-gren="${l}" class="${Math.abs(S.o.gren - l) < .002 ? 'on' : ''}" ${l > S.o.skenaH - .03 ? 'disabled' : ''}>${cm(l)} cm</button>`).join('')}</div>`;
    return `<div class="es-card"><h4>DRA IN</h4><div class="es-pal">${ELFA_CATS.map(c => { const ks = parts.filter(k => ELFA_PARTS[k].cat === c); return !ks.length ? '' : `<h5>${c.toUpperCase()}</h5>` + ks.map(k => { const why = elfaWhyNot(k, md.w, S.o);
        return `<button data-pal="${k}" class="${why ? 'off' : ''}" title="${why ? esc(ELFA_PARTS[k].name + ' ' + why) : 'Dra in på väggen, eller klicka för att lägga i vald sektion'}">${ELFA_PARTS[k].icon}<span>${ELFA_PARTS[k].name}</span></button>`; }).join(''); }).join('')}</div></div>
      <div class="es-cv"><div class="es-hd"><span>Vägg ${esc(W().name)} · ${cm(W().len)} cm · tak ${cm(roomH)} cm</span><span>Dra delar hit · klicka för att välja · Delete tar bort</span></div>
        ${elevationSvg(S.o, S.m, { wall: W(), off: S.off, roomH, sel: S.sel, interactive: true, ghost: S.drag?.ghost, guide: S.drag?.guide || [], drag: S.drag?.kind })}</div>
      <div class="es-card">
        ${P ? `<div class="es-sel"><i>${ELFA_PARTS[P.t].icon}</i><b>${ELFA_PARTS[P.t].name}</b><span>${cm(g.H - P.dn)} cm från golvet</span></div>
          <div class="es-seg es-wide"><button data-mv="-1" title="Upp">▲</button><button data-mv="1" title="Ner">▼</button><button data-del title="Ta bort">🗑</button></div>
          <div class="es-note">Dra den i bilden, även till en annan sektion.</div>`
        : `<h4>SEKTION ${S.sel.sec + 1}</h4><div class="es-seg">${elfaWidths(S.o).map(([w, l]) => `<button data-w="${w}" class="${Math.abs(md.w - w) < .002 ? 'on' : ''}">${l} cm</button>`).join('')}</div>
          <h4>SNABBSTART (VALFRITT)</h4><div class="es-seg">${elfaModsFor(S.o).map(k => `<button data-tpl="${k}">${ELFA_MODS[k].icon} ${ELFA_MODS[k].name}</button>`).join('')}</div>
          <div class="es-seg" style="margin-top:10px"><button data-sdel>🗑 Ta bort sektionen</button></div>`}
        <h4>SÅ HÄR</h4><div class="es-tips">✋ Dra skåpet i sidled<br>${g.track || sys() === 'hylla' ? '↕ Dra i den orange listen för höjden<br>' : ''}⇔ Dra i kanterna för fler sektioner<br>🧲 Dra in delar från vänster</div>
        <button class="es-more" data-more>⚙ Fler inställningar ${S.more ? '▴' : '▾'}</button>
        ${S.more ? `${unit}<div class="es-tog ${S.o.klader !== false ? 'on' : ''}" data-tog="klader"><span>Visa kläder & skor</span><i></i></div>` : ''}
      </div>`;
  }
  // ---- steg 3 ----
  function bom() {
    const g = geo(), n = S.o.mods.length, rows = [], s = sys(), c = new Map(), add = (k, v = 1) => c.set(k, (c.get(k) || 0) + v);
    if (g.track) { rows.push(['⎴', `Bärlist ${cm(g.W)} cm (kapas)`, 1], ['┃', `Grenar ${cm(S.o.gren)} cm`, n + 1]); }
    if (s === 'hylla') rows.push(['┃', `Vägglister ${cm(S.o.gren)} cm`, n + 1]);
    if (s === 'frist') rows.push(['┃', `Fristående stolpar ${S.o.hojd > 2 ? 212 : 104} cm`, n + 1], ['▁', 'Fötter', n + 1], ['━', 'Stabiliseringssats 60', n]);
    if (s === 'lada') rows.push(['▯', `Ramsidor ${cm(S.o.ram)} cm, par`, n], ['━', 'Tvärslåar, sats', n], ...(S.o.toppskiva !== false ? [['▬', 'Toppskiva', n]] : []), ...(S.o.hjul ? [['⚙', 'Hjul, sats', n]] : []));
    let br = 0;
    for (const md of S.o.mods) { const w = nm(md.w); for (const p of md.parts) { if (!elfaFits(p, md.w, S.o)) continue;
      const shared = p.t === 'stang' && md.parts.some(q => q !== p && SHELF.includes(q.t) && Math.abs(q.dn - p.dn) < .001);
      if (['hylla', 'slat', 'trim', 'tra', 'stang', 'lada8', 'lada18', 'lada28', 'trad8', 'trad18', 'trad28', 'tralada', 'byxa', 'korg', 'bricka', 'skodrag'].includes(p.t) && s !== 'lada' && !shared) br += 2;
      if (/^(lada|trad)\d/.test(p.t) && s !== 'lada') add(`▭|Glidram ${w}×${nm(S.o.djup)}`);
      add(`${ELFA_PARTS[p.t].icon}|${ELFA_PARTS[p.t].name}${p.t === 'led' ? '' : ` ${w}${['hylla', 'slat', 'trim', 'tra', 'mhylla'].includes(p.t) ? '×' + nm(S.o.djup) : ''}`}`); } }
    if (br) rows.push(['◣', `Konsoler ${BRK[S.o.djup] || nm(S.o.djup)} cm`, br]);
    if (s === 'hylla') rows.push(['◣', 'Hyllkonsoler', [...c].filter(([k]) => k.includes('melamin')).reduce((a, [, v]) => a + v * 2, 0)]);
    for (const [k, v] of c) { const [ic, name] = k.split('|'); rows.push([ic, name, v]); }
    return rows;
  }
  function step3() {
    const g = geo(), wallOk = SY().wall || sys() === 'frist';
    return `<div class="es-card"><h4>DET HÄR BEHÖVS</h4>${bom().map(([ic, t, n]) => `<div class="es-row"><span>${ic} ${esc(t)}</span><b>${n} st</b></div>`).join('')}
        <div class="es-note">Räknat ur Elfas sortiment. Kontrollera alltid hos Elfa innan du beställer.</div></div>
      <div class="es-card"><h4>FÖRHANDSBILD</h4>${elevationSvg(S.o, S.m, { wall: W(), off: S.off, roomH, cls: 'es-svg' })}
        ${wallOk ? `<div class="es-tog ${S.doors ? 'on' : ''}" data-tog="doors" style="margin-top:10px"><span>🚪 Lägg till Elfa skjutdörrar framför, vägg till vägg</span><i></i></div>` : ''}
        <div class="es-note">Inredningen sätts mot vägg ${esc(W().name)}, ${cm(S.off)} cm från vänster hörn. Djup ${cm(elfaDepth(S.o))} cm från väggen.</div></div>`;
  }

  // ---------- händelser ----------
  const svgPt = e => { const sv = ov.querySelector('svg.es-svg'); if (!sv) return null; const p = sv.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const r = p.matrixTransform(sv.getScreenCTM().inverse()); return { x: r.x / 100 - S.off, y: roomH - r.y / 100, sv }; };
  const secAt = x => { const g = geo(); for (let i = 0; i < S.o.mods.length; i++) if (x >= g.xs[i] - .01 && x <= g.xs[i + 1] + .035) return i; return -1; };
  function ghostFor(t, e, ignore) {
    const q = svgPt(e); if (!q) return null; const i = secAt(q.x); if (i < 0) return { sec: -1 };
    const g = geo(), md = S.o.mods[i], p = { t }, u = elfaUnder(p, S.o), dn = elfaSnap(S.o, g.H - q.y - (sys() === 'lada' ? u / 2 : Math.min(u, .3) / 2), p);
    const test = { ...md, parts: [...md.parts.filter(x => x !== ignore), { t, dn }] }, ok = elfaFits(p, md.w, S.o) && !elfaClash(test, S.o).has(test.parts.length - 1);
    return { sec: i, dn, ok, fits: elfaFits(p, md.w, S.o), xa: g.xs[i] + .025, w: g.xs[i + 1] - g.xs[i] - .025, y: g.H - dn, u };
  }
  const redrawSvg = () => { const host = ov.querySelector('.es-cv'); if (!host) return; const old = host.querySelector('svg'); const tmp = document.createElement('div');
    tmp.innerHTML = elevationSvg(S.o, S.m, { wall: W(), off: S.off, roomH, sel: S.sel, interactive: true, ghost: S.drag?.ghost, guide: S.drag?.guide || [], drag: S.drag?.kind }); old.replaceWith(tmp.firstChild); };
  ov.addEventListener('pointerdown', e => {
    const pal = e.target.closest('[data-pal]'), pt = e.target.closest('.pt');
    if (pal) { S.drag = { kind: 'new', t: pal.dataset.pal, x: e.clientX, y: e.clientY, moved: false }; e.preventDefault(); return; }
    if (S.step !== 2) return;
    if (pt) { const i = +pt.dataset.sec, j = +pt.dataset.part; S.sel = { sec: i, part: j }; S.drag = { kind: 'move', i, j, x: e.clientX, y: e.clientY, moved: false }; draw(); e.preventDefault(); return; }
    const trk = e.target.closest('[data-trk]'), hdl = e.target.closest('[data-hdl]'), sec = e.target.closest('.sec'), q = svgPt(e);
    if (trk) { S.drag = { kind: 'trk', x: e.clientX, y: e.clientY, moved: false }; e.preventDefault(); return; }
    if (hdl) { S.drag = { kind: 'hdl', side: hdl.dataset.hdl, x: e.clientX, y: e.clientY, moved: false }; e.preventDefault(); return; }
    if (sec && q) { S.drag = { kind: 'unit', sec: +sec.dataset.sec, ax0: q.x + S.off, off0: S.off, x: e.clientX, y: e.clientY, moved: false }; e.preventDefault(); }
  });
  // skåpet snäpper mot hörnen, mitten och fönsterkanterna
  function snapOff(off) { const len = W().len, w = geo().W, T = .05, L = [[0, 0], [(len - w) / 2, len / 2]], R = [[len - w, len]];
    for (const [a, ww] of W().win || []) { L.push([a, a], [a + ww, a + ww]); R.push([a - w, a], [a + ww - w, a + ww]); }
    let best = null; for (const [o2, gx] of [...L, ...R]) { const dd = Math.abs(o2 - off); if (dd < T && (!best || dd < best[2])) best = [o2, gx, dd]; }
    off = Math.max(0, Math.min(len - w, best ? best[0] : off)); return [off, best ? [best[1]] : []]; }
  const addSec = (atStart, w0) => { const md = { t: 'tom', w: w0, parts: [] };
    if (atStart) { S.o.mods.unshift(md); S.sel.sec++; } else S.o.mods.push(md); resync(); };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  function onMove(e) {
    const d = S.drag; if (!d) return; if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return; d.moved = true;
    if (d.kind === 'unit') { const q = svgPt(e); if (!q) return; [S.off, d.guide] = snapOff(d.off0 + (q.x + S.off) - d.ax0); redrawSvg(); return; }
    if (d.kind === 'trk') { const q = svgPt(e); if (!q) return; const mn = sys() === 'hylla' ? S.o.gren + .05 : 1.0; S.o.skenaH = Math.max(mn, Math.min(roomH - .015, Math.round(q.y * 100) / 100)); refresh(); redrawSvg(); return; }
    if (d.kind === 'hdl') { const q = svgPt(e); if (!q) return; const abs = q.x + S.off, ws = SY().ws, w0 = ws[Math.min(1, ws.length - 1)], len = W().len;
      if (d.side === 'r') { const tgt = abs - S.off;
        while (geo().W + w0 * .6 < tgt && S.off + geo().W + w0 <= len + .001) addSec(false, w0);
        while (S.o.mods.length > 1 && geo().W - S.o.mods[S.o.mods.length - 1].w * .6 > tgt) { S.o.mods.pop(); resync(); } }
      else { const right = S.off + geo().W, tgt = right - abs;
        while (geo().W + w0 * .6 < tgt && right - geo().W - w0 >= -.001) { addSec(true, w0); S.off = right - geo().W; }
        while (S.o.mods.length > 1 && geo().W - S.o.mods[0].w * .6 > tgt) { S.o.mods.shift(); S.sel.sec = Math.max(0, S.sel.sec - 1); resync(); S.off = right - geo().W; } }
      S.sel.sec = Math.min(S.sel.sec, S.o.mods.length - 1); S.sel.part = null; redrawSvg(); return; }
    const t = d.kind === 'new' ? d.t : S.o.mods[d.i].parts[d.j].t; d.ghost = ghostFor(t, e, d.kind === 'move' ? S.o.mods[d.i].parts[d.j] : null);
    if (d.ghost && d.ghost.sec < 0) d.ghost = null; redrawSvg();
  }
  function onUp() {
    const d = S.drag; S.drag = null; if (!d) return;
    if (['unit', 'trk', 'hdl'].includes(d.kind)) { if (d.moved) { S.noClick = true; setTimeout(() => S.noClick = false, 50); draw(); } return; }
    if (d.kind === 'new' && !d.moved) { const md = S.o.mods[S.sel.sec]; if (!elfaFits({ t: d.t }, md.w, S.o)) { say(`${ELFA_PARTS[d.t].name} ${elfaWhyNot(d.t, md.w, S.o)}`); return; }
      const p = elfaAdd(md, d.t, S.o); md.edited = true; S.sel.part = md.parts.indexOf(p); draw(); return; }
    if (!d.moved) return;
    const gh = d.ghost; if (!gh) { draw(); return; }
    if (!gh.fits) { const t = d.kind === 'new' ? d.t : S.o.mods[d.i].parts[d.j].t; say(`${ELFA_PARTS[t].name} ${elfaWhyNot(t, S.o.mods[gh.sec].w, S.o)}`); draw(); return; }
    if (d.kind === 'new') { const md = S.o.mods[gh.sec], p = elfaAdd(md, d.t, S.o, gh.dn); md.edited = true; S.sel = { sec: gh.sec, part: md.parts.indexOf(p) }; }
    else { const from = S.o.mods[d.i], p = from.parts[d.j]; from.parts.splice(d.j, 1); p.dn = gh.dn; const to = S.o.mods[gh.sec]; from.edited = to.edited = true; to.parts.push(p); to.parts.sort((a, b) => a.dn - b.dn); S.sel = { sec: gh.sec, part: to.parts.indexOf(p) }; }
    if (!gh.ok) say('Krockar med en annan del – flytta den eller ta bort'); draw();
  }
  ov.addEventListener('click', e => {
    if (S.noClick) return;
    const b = e.target.closest('button,[data-wall],[data-sec],[data-chip],[data-tog],[data-room]'); if (!b) return; const d = b.dataset;
    if ('more' in d) { S.more = !S.more; return draw(); }
    if ('close' in d) return close();
    if (d.step) { S.step = +d.step; S.sel.part = null; return draw(); }
    if ('done' in d) { cleanup(); onDone({ o: S.o, m: S.m, wall: S.wall, off: S.off, doors: S.doors, room: S.room }); return; }
    if (d.room !== undefined) { S.room = +d.room; S.wall = 0; S.off = Math.max(0, (W().len - geo().W) / 2); fit(); return draw(); }
    if (d.wall) { S.wall = +d.wall; S.off = Math.max(0, (W().len - geo().W) / 2); fit(); return draw(); }
    if (d.sys) { setSystem(d.sys); return draw(); }
    if (d.col) { const c = fam.choices[+d.col]; for (const [k, v] of Object.entries(c.m)) S.m[k] = { ...v }; if (c.group === 'Metall') S.o.farg = c.name; return draw(); }
    if (d.djup) { S.o.djup = +d.djup; resync(); return draw(); }
    if (d.tog) { if (d.tog === 'doors') S.doors = !S.doors; else S.o[d.tog] = d.tog === 'toppskiva' || d.tog === 'klader' ? S.o[d.tog] === false : !S.o[d.tog]; if (d.tog === 'decor') fixColors(); resync(); return draw(); }
    if (d.chip !== undefined) { const md = S.o.mods[+d.chip], ws = SY().ws, k = ws.findIndex(w => Math.abs(w - md.w) < .002); md.w = ws[(k + 1) % ws.length]; S.sel = { sec: +d.chip, part: null }; resync(); return draw(); }
    if (d.sec !== undefined && !d.part && !e.target.closest('.pt')) { S.sel = { sec: +d.sec, part: null }; return draw(); }
    const md = S.o.mods[S.sel.sec];
    if (d.w) { md.w = +d.w; resync(); return draw(); }
    if (d.tpl) { md.t = d.tpl; md.edited = false; md.parts = elfaTemplate(d.tpl, md.w, S.o); S.sel.part = null; return draw(); }
    if (d.smv) { const j = S.sel.sec + +d.smv; if (j >= 0 && j < S.o.mods.length) { [S.o.mods[S.sel.sec], S.o.mods[j]] = [S.o.mods[j], S.o.mods[S.sel.sec]]; S.sel = { sec: j, part: null }; } return draw(); }
    if ('sdel' in d) { if (S.o.mods.length > 1) { S.o.mods.splice(S.sel.sec, 1); S.sel = { sec: Math.max(0, S.sel.sec - 1), part: null }; resync(); } else say('Minst en sektion'); return draw(); }
    if ('sadd' in d) { const w = SY().ws[Math.min(1, SY().ws.length - 1)], room = W().len - geo().W; if (room < w - .01) { say('Det får inte plats fler sektioner på väggen'); return; }
      S.o.mods.splice(S.sel.sec + 1, 0, { t: 'tom', w, parts: [] }); S.sel = { sec: S.sel.sec + 1, part: null }; resync(); return draw(); }
    if (d.pos !== undefined) { S.off = +d.pos * Math.max(0, W().len - geo().W); return draw(); }
    if (d.mv) return movePart(+d.mv);
    if ('del' in d) return delPart();
    if (d.hojd) { S.o.hojd = +d.hojd; regen(); return draw(); }
    if (d.ram) { S.o.ram = +d.ram; regen(); return draw(); }
    if (d.gren) { S.o.gren = +d.gren; refresh(); return draw(); }
  });
  // nya mått på ramen: fyll om sektionerna som inte ändrats för hand (enklast: mallarna igen)
  const regen = () => { resync(); refresh(); S.sel.part = null; };
  ov.addEventListener('input', e => { const t = e.target;
    if ('off' in t.dataset) { S.off = +t.value; redrawSvg(); }
    if ('skena' in t.dataset) { S.o.skenaH = +t.value; resync(); t.nextElementSibling.querySelector('b').textContent = cm(S.o.skenaH) + ' cm'; redrawSvg(); } });
  ov.addEventListener('change', e => { if ('skena' in e.target.dataset || 'off' in e.target.dataset) draw(); });
  function movePart(dir) { const md = S.o.mods[S.sel.sec], p = md.parts[S.sel.part]; if (!p) return; md.edited = true; p.dn = elfaSnap(S.o, p.dn + dir * SY().pitch, p); md.parts.sort((a, b) => a.dn - b.dn); S.sel.part = md.parts.indexOf(p); draw(); }
  function delPart() { const md = S.o.mods[S.sel.sec]; if (S.sel.part === null) return; md.edited = true; md.parts.splice(S.sel.part, 1); S.sel.part = null; draw(); }
  const onKey = e => { if (S.step !== 2 || e.target.tagName === 'INPUT') return;
    if (e.key === 'Delete' || e.key === 'Backspace') { delPart(); e.preventDefault(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { movePart(e.key === 'ArrowUp' ? -1 : 1); e.preventDefault(); }
    if (e.key === 'Escape') { S.sel.part = null; draw(); } };
  window.addEventListener('keydown', onKey);
  function cleanup() { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('keydown', onKey); ov.remove(); }
  function close() { cleanup(); }
  draw();
  return { close };
}
// sync utan att importera hela FURN-objektet i onödan
import { FURN } from './furniture.js?v=1794434861';
const FURNSYNC = it => FURN.elfa.sync(it, it.o);
