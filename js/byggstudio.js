// Byggverkstan: 1) välj vägg + börja tomt eller från ett förslag  2) bygg väggen framifrån (dra, snäpp, ändra storlek)
// 3) inköpslista + sätt in. Varianter A/B/C av samma vägg. Samma utseende som Elfa-verkstan.
import { STUDIO_CSS, wallPlanSvg } from './elfastudio.js?v=1794501654';
import { PARTS, CATS, IKEA, FRONTS, PANEL_STIL, FRONT_SERIES, GLASS_SERIES, HANDTAG, RAM_DIR, LED_DIR, SPOT_BEAM, frontOf, lightParts, newPart, isIkea, hangOk, snapMove, builtIn, suggestions, byggList, tvSize } from './bygg.js?v=1794501654';
import { kRGB, hueRGB, css, ljusHtml, ljusSet, ljusText, LJUS_CSS } from './ljus.js?v=1794501654';
import { MATS, GROUPS, swatch } from './materials.js?v=1794501654';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const cm = v => Math.round(v * 100);
const CSS2 = `
.bs-tabs{display:flex;gap:6px;align-items:center}
.bs-tabs button{background:none;border:1px solid rgba(190,210,175,.18);color:#cfd6cb;border-radius:99px;padding:6px 13px;cursor:pointer;font-size:13px}
.bs-tabs button.on{background:#ff7a2f;color:#1a0d05;border-color:#ff7a2f;font-weight:700}
.bs-sug{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.bs-sug button{background:#0f130f;border:2px solid rgba(190,210,175,.13);border-radius:12px;padding:8px;cursor:pointer;color:#e9ede6;text-align:left}
.bs-sug button:hover,.bs-sug button.on{border-color:#ff7a2f}
.bs-sug button svg{width:100%;display:block;border-radius:8px;background:#20271f}
.bs-sug button b{display:block;margin:6px 2px 2px;font-size:13.5px}
.bs-num{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.bs-num label{font-size:11px;color:#8f9a8b}.bs-num input{width:100%;margin-top:3px;padding:7px;border-radius:8px;border:1px solid rgba(190,210,175,.2);background:#0f130f;color:#e9ede6;font-size:14px}
.bs-mats{display:flex;flex-wrap:wrap;gap:5px}.bs-mats button{width:42px;padding:0;border:2px solid transparent;border-radius:9px;background:none;cursor:pointer;font-size:9px;color:#8f9a8b}
.bs-mats button img{width:36px;height:36px;border-radius:7px;display:block;margin:0 auto}.bs-mats button.on{border-color:#ff7a2f;color:#fff}
.bs-shop{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.bs-shop h3{margin:0 0 6px;font-size:14px}
.es-svg .bp{cursor:grab}.es-svg .bp.on>.ol{stroke:#ff7a2f;stroke-width:2.5}.es-svg .bp:hover>.ol{stroke:#ffb27f}
.es-svg .rh{fill:#ff7a2f;cursor:nwse-resize}
.bs-cap{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 16px;margin-top:6px;font-size:13px;color:#8f9a8b;text-align:center}.bs-cap b{color:#ff7a2f;font-weight:600}
.bs-side{display:flex;flex-direction:column;gap:2px}.bs-side h4{margin:12px 0 6px}
.bs-h{margin:0 0 4px;font-size:16px}.bs-dim{color:#8f9a8b;font-weight:400;letter-spacing:0;text-transform:none}
.bs-head{display:flex;align-items:center;gap:10px;padding-bottom:8px;border-bottom:1px solid rgba(190,210,175,.13)}.bs-head i{font-style:normal;font-size:26px}.bs-head b{display:block;font-size:16px}.bs-head span{font-size:12px;color:#8f9a8b}
.bs-head button{margin-left:auto;background:none;border:1px solid rgba(190,210,175,.2);color:#cfd6cb;border-radius:50%;width:30px;height:30px;cursor:pointer}
.bs-sec{border-bottom:1px solid rgba(190,210,175,.09);padding-bottom:10px}
.bs-dims{display:grid;grid-template-columns:44px 1fr;gap:6px 8px;align-items:center}.bs-dims>span{font-size:12px;color:#8f9a8b}
.bs-sw{display:flex;flex-wrap:wrap;gap:6px}.bs-sw button{width:34px;height:34px;border-radius:9px;border:2px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.3)}.bs-sw button.on{border-color:#ff7a2f;box-shadow:0 0 0 2px #141914 inset}
.bs-lrow{display:flex;align-items:center;gap:9px;width:100%;background:#0f130f;border:1px solid rgba(190,210,175,.15);border-radius:10px;padding:8px 10px;margin-bottom:5px;color:#e9ede6;cursor:pointer;text-align:left}
.bs-lrow:hover{border-color:#ff7a2f}.bs-lrow i{width:12px;height:12px;border-radius:50%;box-shadow:0 0 8px currentColor;flex:none}.bs-lrow b{font-size:13px;font-weight:600}.bs-lrow span{margin-left:auto;font-size:12px;color:#8f9a8b}
.bs-frame{position:relative;width:150px;height:96px;background:#2a312a;border-radius:6px;margin:4px 0}.bs-frame span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#cfd6cb;pointer-events:none}
.bs-frame button{position:absolute;background:#e8e6e1;border:none;cursor:pointer;padding:0}.bs-frame button.on{background:#ffcf7a;box-shadow:0 0 10px #ffcf7a}
.bs-f-top{left:0;right:0;top:0;height:14px;border-radius:6px 6px 0 0}.bs-f-bottom{left:0;right:0;bottom:0;height:14px;border-radius:0 0 6px 6px}.bs-f-left{left:0;top:14px;bottom:14px;width:14px}.bs-f-right{right:0;top:14px;bottom:14px;width:14px}
.bs-more{margin-top:10px}.bs-more summary{cursor:pointer;color:#cfd6cb;font-size:13px;padding:6px 0}
.bs-acts{display:grid;grid-auto-flow:column;gap:6px;margin-top:12px}.bs-acts button{background:#0f130f;border:1px solid rgba(190,210,175,.18);color:#e9ede6;border-radius:9px;padding:8px 4px;cursor:pointer;font-size:12.5px}.bs-acts button:hover{border-color:#ff7a2f}
.bs-rail .es-pal{grid-template-columns:1fr 1fr}.bs-rail .es-pal button{padding:8px 2px}.bs-rail .es-pal button span{font-size:10.5px;color:#cfd6cb}
.es-cv .es-hd{align-items:center}
@media (max-width:900px){.bs-shop{grid-template-columns:1fr}}
`;

// ---------- ritningen framifrån ----------
const fillOf = (p, m) => p.k === 'farg' ? (p.color || '#3b3f3a') : p.k === 'panel' ? (m.panel?.color || '#b48a5c') : p.k === 'skiva' ? (m.skiva?.color || '#b48a5c')
  : p.k === 'gips' ? (m.gips?.color || '#f4f2ee') : p.k === 'sockel' ? '#222' : (p.k === 'passbit' || p.k === 'kappa' || p.k === 'ram') ? (m.front?.color || '#f2f2f0') : (m.stomme?.color || '#f2f2f0');
const matColor = s => s?.color || MATS[s?.mat]?.color || '#ddd';
const ORDER = ['farg', 'panel', 'gips', 'sockel', 'passbit', 'kappa', 'ram', 'besta', 'metod', 'skiva', 'led', 'tv'];
const ltOf = p => ({ typ: 'varm', k: 2700, lm: p.k === 'kappa' || p.k === 'gips' ? 350 : 600, ...(p.lt || {}) });
const ltCol = L => css(L.typ === 'rgb' && L.rgb ? hueRGB(L.hue ?? 30) : kRGB(L.k));
let svgN = 0;
export function wallSvg(parts, m, { crop = null, L, H, win = [], doors = [], items = [], sel = null, guides = [], interactive = false, showIkea = true, cls = 'es-svg', night = false } = {}) {
  const X = v => +(v * 100).toFixed(1), Y = v => +((H - v) * 100).toFixed(1), u = 'w' + (++svgN), mm = { stomme: { color: matColor(m.stomme) }, front: { color: matColor(m.front) }, panel: { color: matColor(m.panel) }, skiva: { color: matColor(m.skiva) }, gips: { color: matColor(m.gips) } };
  const pc = mm.panel.color;
  let out = `<defs><linearGradient id="${u}wl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#394139"/><stop offset="1" stop-color="#2b322b"/></linearGradient>
    <linearGradient id="${u}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient>
    <linearGradient id="${u}gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".34" stop-color="#fff" stop-opacity=".06"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/></linearGradient>
    <linearGradient id="${u}tv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b3a6b"/><stop offset=".5" stop-color="#e0754a"/><stop offset="1" stop-color="#2a1640"/></linearGradient>
    <pattern id="${u}sl" width="4" height="10" patternUnits="userSpaceOnUse"><rect width="4" height="10" fill="${pc}"/><rect x="2.8" width="1.2" height="10" fill="#0008"/></pattern>
    <pattern id="${u}ak" width="4" height="10" patternUnits="userSpaceOnUse"><rect width="4" height="10" fill="#1c1c1c"/><rect x=".4" width="2.6" height="10" fill="${pc}"/></pattern>
    <filter id="${u}b3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter><filter id="${u}b8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter></defs>`;
  out += `<rect x="0" y="0" width="${X(L)}" height="${X(H)}" fill="url(#${u}wl)"/><rect x="0" y="${X(H)}" width="${X(L)}" height="9" fill="#6b5137"/><rect x="0" y="${X(H)}" width="${X(L)}" height="2" fill="#0006"/>`;
  for (const [a, w, s, h] of win) out += `<rect x="${X(a)}" y="${Y(s + h)}" width="${X(w)}" height="${X(h)}" fill="#2a3b4c" stroke="#d9dcd6" stroke-width="4"/><line x1="${X(a + w / 2)}" x2="${X(a + w / 2)}" y1="${Y(s + h)}" y2="${Y(s)}" stroke="#d9dcd6" stroke-width="3"/>`;
  for (const [a, w, h] of doors) out += `<rect x="${X(a)}" y="${Y(h)}" width="${X(w)}" height="${X(h)}" fill="#151a15" stroke="#6b7a68" stroke-width="1.5"/>`;
  for (const [a, w, top, bot, nm] of items) out += `<rect x="${X(a)}" y="${Y(top)}" width="${X(w)}" height="${X(top - bot)}" fill="rgba(160,170,160,.18)" stroke="rgba(200,210,200,.45)" stroke-dasharray="4 3"/>` + (w > .45 ? `<text x="${X(a + w / 2)}" y="${Y(top) - 4}" fill="#9aa39a" font-size="10" text-anchor="middle">${esc(nm)}</text>` : '');
  const sorted = [...parts].sort((a, b) => ORDER.indexOf(a.k) - ORDER.indexOf(b.k));
  // skugga under vägghängda delar
  for (const p of sorted) if ((isIkea(p) || p.k === 'skiva' || p.k === 'gips') && p.y > .03) out += `<rect x="${X(p.x) + 3}" y="${Y(p.y) - 2}" width="${X(p.w) - 6}" height="7" fill="#000" opacity=".35" filter="url(#${u}b3)"/>`;
  for (const p of sorted) {
    const x = X(p.x), y = Y(p.y + p.h), w = Math.max(1, X(p.w)), h = Math.max(1, X(p.h)), ik = isIkea(p), bad = !hangOk(p);
    let g = '';
    if (p.k === 'tv') g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#0b0c0e" stroke="#444"/><rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="${night ? `url(#${u}tv)` : '#15171b'}"/>${night ? '' : `<text x="${x + w / 2}" y="${y + h / 2 + 4}" fill="#666" font-size="11" text-anchor="middle">TV ${p.inch}"</text>`}`;
    else if (p.k === 'led') g = `<rect x="${x}" y="${y - 1.5}" width="${w}" height="3" rx="1" fill="${night ? ltCol(ltOf(p)) : '#d8d4c8'}"/>`;
    else if (p.k === 'ram') { const t = X(p.t || .05), fc = fillOf(p, mm);
      g = `<path d="M${x} ${y}h${w}v${h}h${-w}z M${x + t} ${y + t}v${h - 2 * t}h${w - 2 * t}v${-(h - 2 * t)}z" fill-rule="evenodd" fill="${fc}"/><rect x="${x + t}" y="${y + t}" width="${w - 2 * t}" height="${h - 2 * t}" fill="none" stroke="#0005" stroke-width="2.5"/>`;
      const sd = p.sides || {}, lc = night ? ltCol(ltOf(p)) : '#00000055';
      if (sd.top) g += `<line x1="${x + t}" x2="${x + w - t}" y1="${y + t + 1}" y2="${y + t + 1}" stroke="${lc}" stroke-width="2"/>`;
      if (sd.bottom) g += `<line x1="${x + t}" x2="${x + w - t}" y1="${y + h - t - 1}" y2="${y + h - t - 1}" stroke="${lc}" stroke-width="2"/>`;
      if (sd.left) g += `<line x1="${x + t + 1}" x2="${x + t + 1}" y1="${y + t}" y2="${y + h - t}" stroke="${lc}" stroke-width="2"/>`;
      if (sd.right) g += `<line x1="${x + w - t - 1}" x2="${x + w - t - 1}" y1="${y + t}" y2="${y + h - t}" stroke="${lc}" stroke-width="2"/>`; }
    else { g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p.k === 'panel' ? `url(#${u}${p.stil === 'akustik' ? 'ak' : 'sl'})` : fillOf(p, mm)}" ${p.k === 'farg' ? 'opacity=".9"' : ''}/>`;
      if (p.k === 'panel' && p.stil === 'slat') g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${pc}"/>`;
      if (p.k === 'kappa' || p.k === 'gips' || p.k === 'passbit' || p.k === 'skiva') g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${u}sh)"/>`;
      if ((p.k === 'kappa' || p.k === 'gips') && p.spots > 0) for (let i = 0; i < p.spots; i++) { const sx = X(p.x + p.w * (i + .5) / p.spots);
        g += `<ellipse cx="${sx}" cy="${Y(p.y)}" rx="4" ry="1.6" fill="${night ? '#fff' : '#bdbab3'}" stroke="#8a8780" stroke-width=".6"/>`; }
      if (ik) { const cols = Math.max(1, Math.round(p.w / (p.k === 'metod' ? p.w : .6))), rows = p.h > 1.5 ? 3 : p.h > 1 ? 2 : 1, F = frontOf(p), fc = p.fs || p.fc != null || p.front === 'glas' ? F.color : mm.front.color;
        if (p.front === 'oppen') { const n = Math.max(2, Math.round(p.h / .32)); g += `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="rgba(0,0,0,.4)"/>`; for (let r = 1; r < n; r++) g += `<line x1="${x + 2}" x2="${x + w - 2}" y1="${y + h * r / n}" y2="${y + h * r / n}" stroke="${mm.stomme.color}" stroke-width="2"/>`; }
        else for (let c = 0; c < cols; c++) for (let r = 0; r < rows * (p.front === 'lador' ? 2 : 1); r++) { const fw = w / cols, fh = h / (rows * (p.front === 'lador' ? 2 : 1)), fx = x + c * fw + .8, fy = y + r * fh + .8, ww = fw - 1.6, hh = fh - 1.6;
          g += `<rect x="${fx}" y="${fy}" width="${ww}" height="${hh}" rx=".6" fill="${F.glas ? '#3b3a38' : fc}"/>`;
          if (F.glas) g += `<rect x="${fx + 5}" y="${fy + 5}" width="${ww - 10}" height="${hh - 10}" fill="#6d7a80" opacity=".55"/><rect x="${fx + 2.5}" y="${fy + 2.5}" width="${ww - 5}" height="${hh - 5}" fill="none" stroke="${fc}" stroke-width="5"/>`;
          else if (F.stil === 'ram') g += `<rect x="${fx + 5}" y="${fy + 5}" width="${ww - 10}" height="${hh - 10}" fill="none" stroke="#0002" stroke-width="1.4"/>`;
          if (F.mat === 'lack') g += `<rect x="${fx}" y="${fy}" width="${ww}" height="${hh}" fill="url(#${u}gl)"/>`;
          if (F.stil === 'grepp' && p.fs) g += `<rect x="${fx + ww / 2 - 10}" y="${fy + 3}" width="20" height="2.4" rx="1.2" fill="#0003"/>`;
          const lad = p.front === 'lador', hx = lad ? fx + ww / 2 : (c % 2 ? fx + 5 : fx + ww - 5);
          if (p.hd === 'bygel') g += lad ? `<rect x="${hx - 8}" y="${fy + 5}" width="16" height="2.4" rx="1.2" fill="#8d8f8f"/>` : `<rect x="${hx - 1.2}" y="${fy + 6}" width="2.4" height="16" rx="1.2" fill="#8d8f8f"/>`;
          if (p.hd === 'knopp') g += `<circle cx="${hx}" cy="${fy + 8}" r="2.2" fill="#8d8f8f"/>`;
          g += `<rect x="${fx}" y="${fy}" width="${ww}" height="${hh}" fill="url(#${u}sh)"/>`; } } }
    const ol = p.k === 'led' || p.k === 'tv' ? '' : `<rect class="ol" x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${bad ? '#ff5a4a' : showIkea && interactive ? (ik ? '#7fb2ff' : 'rgba(255,122,47,.4)') : 'rgba(0,0,0,.25)'}" stroke-width="${ik && showIkea && interactive ? 1.4 : .8}" ${p.auto ? 'stroke-dasharray="4 3"' : ''}/>`;
    out += `<g class="bp" data-part="${p.id}">${g}${ol}${p.k === 'led' ? `<rect x="${x}" y="${y - 6}" width="${w}" height="12" fill="transparent"/>` : ''}</g>`;
    if (bad) out += `<text x="${x + w / 2}" y="${y - 4}" fill="#ff7a6a" font-size="10" text-anchor="middle">${cm(p.h)} cm hög får inte hängas på vägg</text>`;
  }
  // kväll: mörka ner rummet och lägg ljuset ovanpå (klick går igenom till delarna)
  if (night) { out += `<g pointer-events="none"><rect x="-20" y="-20" width="${X(L) + 40}" height="${X(H) + 50}" fill="#04060a" opacity=".72"/><g style="mix-blend-mode:screen">`;
    for (const p of sorted) { const x = X(p.x), y = Y(p.y + p.h), w = X(p.w), h = X(p.h);
      if (p.k === 'tv') out += `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="url(#${u}tv)" opacity=".9"/><rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" fill="#e0754a" opacity=".1" filter="url(#${u}b8)"/>`;
      if ((p.k === 'kappa' || p.k === 'gips') && p.spots > 0) { const L2 = ltOf(p), c = ltCol(L2), a = Math.min(1, L2.lm / 500), y0 = Y(p.y), drop = Math.min(y0 > 0 ? X(H) - y0 : 0, 260), spread = Math.tan((p.beam || 36) / 2 * Math.PI / 180) * drop;
        for (let i = 0; i < p.spots; i++) { const sx = X(p.x + p.w * (i + .5) / p.spots), gid = `${u}s${p.id}${i}`;
          out += `<defs><radialGradient id="${gid}" cx=".5" cy="0" r="1"><stop offset="0" stop-color="${c}" stop-opacity="${.95 * a}"/><stop offset=".5" stop-color="${c}" stop-opacity="${.25 * a}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>
            <path d="M${sx - 4} ${y0} L${sx + 4} ${y0} L${sx + spread} ${y0 + drop} L${sx - spread} ${y0 + drop}Z" fill="url(#${gid})" filter="url(#${u}b3)"/>`; } }
      const glow = (x1, y1, x2, y2, c, a, dx, dy, id) => { const vert = x1 === x2, len = 22 + a * 40;
        if (!dx && !dy) return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${dy === 0 && dx === 0 ? 14 : 8}" opacity="${.45 * a}" filter="url(#${u}b8)"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2.4"/>`;
        const rx = vert ? (dx < 0 ? x1 - len : x1) : Math.min(x1, x2), ry = vert ? Math.min(y1, y2) : (dy < 0 ? y1 - len : y1), rw = vert ? len : Math.abs(x2 - x1), rh = vert ? Math.abs(y2 - y1) : len;
        return `<defs><linearGradient id="${id}" x1="${dx < 0 ? 1 : 0}" y1="${dy < 0 ? 1 : 0}" x2="${dx > 0 ? 1 : 0}" y2="${dy > 0 ? 1 : 0}"><stop offset="0" stop-color="${c}" stop-opacity="${.8 * a}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
          <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="url(#${id})"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2.4"/>`; };
      if (p.k === 'ram') { const sd = p.sides || {}, t = X(p.t || .05), L2 = ltOf(p), c = ltCol(L2), a = Math.min(1, L2.lm / 800), s = p.dir === 'ut' ? -1 : 1, fl = p.dir === 'vagg' || p.dir === 'fram';
        const D = v => fl ? 0 : v * s;
        if (sd.top) out += glow(x + t, y + t + 1, x + w - t, y + t + 1, c, a, 0, D(1) || (fl ? 0 : 1), `${u}r${p.id}t`);
        if (sd.bottom) out += glow(x + t, y + h - t - 1, x + w - t, y + h - t - 1, c, a, 0, D(-1), `${u}r${p.id}b`);
        if (sd.left) out += glow(x + t + 1, y + t, x + t + 1, y + h - t, c, a, D(1), 0, `${u}r${p.id}l`);
        if (sd.right) out += glow(x + w - t - 1, y + t, x + w - t - 1, y + h - t, c, a, D(-1), 0, `${u}r${p.id}r`); }
      if (p.k === 'led') { const L2 = ltOf(p), c = ltCol(L2), a = Math.min(1, L2.lm / 800), dir = p.dir || 'ned';
        out += glow(x, Y(p.y), x + w, Y(p.y), c, a, 0, dir === 'ned' ? 1 : dir === 'upp' ? -1 : 0, `${u}l${p.id}`); } }
    out += `</g></g>`; }
  // markering och hjälplinjer överst (syns även på kvällen)
  const sp = sel && parts.find(p => p.id === sel);
  if (sp && interactive) { const x = X(sp.x), y = Y(sp.y + sp.h), w = Math.max(2, X(sp.w)), h = Math.max(2, X(sp.h));
    out += `<rect x="${x - 1}" y="${y - 1}" width="${w + 2}" height="${h + 2}" fill="rgba(255,122,47,.08)" stroke="#ff7a2f" stroke-width="2.5" pointer-events="none"/>`;
    if (!isIkea(sp) && sp.k !== 'tv') out += `<rect class="rh" data-rs="${sp.id}" x="${x + w - 7}" y="${y - 7}" width="14" height="14" rx="3"/>`; }
  for (const g of guides) out += g.x !== undefined ? `<line x1="${X(g.x)}" x2="${X(g.x)}" y1="0" y2="${X(H)}" stroke="#ff7a2f" stroke-width="1.3" stroke-dasharray="6 5"/>` : `<line x1="0" x2="${X(L)}" y1="${Y(g.y)}" y2="${Y(g.y)}" stroke="#ff7a2f" stroke-width="1.3" stroke-dasharray="6 5"/>`;
  // i verkstaden visas måtten som vanlig text under ritningen (bildtext i svg:n skalas med zoomen och kapas i kanten)
  if (!interactive) out += `<text x="${X(L / 2)}" y="${X(H) + 24}" fill="#8f9a8b" font-size="13" text-anchor="middle">${cm(L)} cm vägg · ${cm(H)} cm till taket</text>`;
  const c0 = crop ? Math.max(0, crop[0]) : 0, c1 = crop ? Math.min(L, crop[1]) : L;
  return `<svg class="${cls}" viewBox="${X(c0) - 14} -14 ${X(c1 - c0) + 28} ${X(H) + (interactive ? 36 : 40)}" preserveAspectRatio="xMidYMid meet">${out}</svg>`;
}
export function wallCap(parts, sel, L, H) {
  const sp = sel && parts.find(p => p.id === sel);
  return `<div class="bs-cap">${sp ? `<b>↔ ${cm(sp.w)} · ↕ ${cm(sp.h)} cm · ${cm(sp.x)} cm från vänster · ${cm(sp.y)} cm upp</b>` : ''}<span>${cm(L)} cm vägg · ${cm(H)} cm till taket</span></div>`;
}

export function openByggStudio({ item, rooms, startRoom = 0, startWall = 0, roomH = 2.5, onDone }) {
  if (!document.getElementById('es-css')) { const st = document.createElement('style'); st.id = 'es-css'; st.textContent = STUDIO_CSS; document.head.appendChild(st); }
  if (!document.getElementById('bs-css')) { const st = document.createElement('style'); st.id = 'bs-css'; st.textContent = CSS2 + LJUS_CSS; document.head.appendChild(st); }
  const o = item ? JSON.parse(JSON.stringify(item.o)) : { variants: [{ name: 'Förslag A', parts: [] }], active: 0, fronter: 'ikea', frontstil: 'slat' };
  const m = item ? JSON.parse(JSON.stringify(item.m)) : { stomme: { mat: 'matt', color: '#f2f2f0' }, front: { mat: 'matt', color: '#f2f2f0' }, panel: { mat: 'ek', color: null }, skiva: { mat: 'ek', color: null }, gips: { mat: 'matt', color: '#f4f2ee' } };
  const S = { step: item ? 2 : 1, room: startRoom, wall: startWall, sel: null, drag: null, showIkea: true, sug: null };
  const walls = () => rooms[S.room].walls, W = () => walls()[S.wall], L = () => W().len, H = roomH;
  const V = () => o.variants[o.active], parts = () => V().parts;
  const ov = document.createElement('div'); ov.className = 'es-ov'; document.body.appendChild(ov);
  const msg = document.createElement('div'); msg.className = 'es-msg'; let mt = 0; const say = t => { msg.textContent = t; msg.classList.add('show'); clearTimeout(mt); mt = setTimeout(() => msg.classList.remove('show'), 2400); };
  const selPart = () => parts().find(p => p.id === S.sel);
  // zooma in på det man bygger när väggen är lång (minst 3 m bred vy)
  const cropOf = P => { if (!P.length || L() < 4) return null; let a = Math.min(...P.map(p => p.x)) - .6, b = Math.max(...P.map(p => p.x + p.w)) + .6;
    if (b - a < 3) { const c = (a + b) / 2; a = c - 1.5; b = c + 1.5; } return [Math.max(0, a), Math.min(L(), b)]; };
  const crop = () => S.whole ? null : cropOf(parts());

  function draw() {
    ov.innerHTML = `<div class="es-top"><b>🛠 Byggverkstan</b><div class="es-steps">${[['1', 'Vägg & start'], ['2', 'Bygg'], ['3', 'Lista & klart']].map(([n, t], i) => `<button data-step="${i + 1}" class="${S.step === i + 1 ? 'on' : S.step > i + 1 ? 'done' : ''}">${S.step > i + 1 ? '✓' : n} ${t}</button>`).join('')}</div><button class="es-x" data-close>✕</button></div>
      <div class="es-body s${S.step}" ${S.step === 2 ? 'style="grid-template-columns:150px 1fr 320px"' : ''}>${S.step === 1 ? step1() : S.step === 2 ? step2() : step3()}</div>
      <div class="es-foot"><button class="es-btn ghost" data-${S.step === 1 ? 'close' : 'step="' + (S.step - 1) + '"'}>${S.step === 1 ? 'Avbryt' : '◀ Tillbaka'}</button>
      <span class="es-note">${esc(rooms[S.room].name)} · vägg ${esc(W().name)} · ${cm(L())} cm · ${parts().length} delar</span>
      ${S.step < 3 ? `<button class="es-btn" data-step="${S.step + 1}">Nästa ▶</button>` : `<button class="es-btn" data-done>✓ Sätt in i rummet</button>`}</div>`;
    ov.appendChild(msg);
  }
  // ---- steg 1: vägg + hur man vill börja ----
  function step1() {
    if (!S.sug) S.sug = suggestions(L(), H, W().win, W().doors, W().items || []);
    return `<div class="es-card">${rooms.length > 1 ? `<h4>VILKET RUM?</h4><div class="es-seg" style="margin-bottom:10px">${rooms.map((r, i) => `<button data-room="${i}" class="${i === S.room ? 'on' : ''}">${esc(r.name)}</button>`).join('')}</div>` : ''}
        <h4>VILKEN VÄGG?</h4>${wallPlanSvg(walls(), S.wall)}<div class="es-note">Klicka på väggen du vill bygga på, t.ex. tv-väggen eller väggen bakom sängen.</div></div>
      <div class="es-card"><h4>HUR VILL DU BÖRJA?</h4><div class="bs-sug">
        <button data-sug="-1"><svg viewBox="0 0 200 120"><text x="100" y="66" fill="#8f9a8b" font-size="15" text-anchor="middle">Tom vägg</text></svg><b>▫️ Börja tomt</b></button>
        ${S.sug.map((sg, i) => `<button data-sug="${i}">${wallSvg(sg.parts, m, { crop: cropOf(sg.parts), L: L(), H, win: W().win, doors: W().doors, items: W().items || [], cls: '', showIkea: false })}<b>✨ ${esc(sg.name)}</b></button>`).join('')}</div>
        <div class="es-note">Förslagen är gjorda efter just den här väggens mått. Allt går att ändra i nästa steg. Väljer du ett förslag läggs det in som <b>${esc(V().name)}</b>.</div></div>`;
  }
  // ---- steg 2: bygg ----
  // vänster: palett med stora ikoner · mitten: väggen (dra & klicka) · höger: allt om det man klickat på
  const PAL = [['Skåp', [['besta', 'Skåp'], ['metod', 'Överskåp']]], ['Bygg in', [['ram', 'Ram / nisch'], ['kappa', 'Kappa'], ['passbit', 'Passbit'], ['sockel', 'Sockel'], ['skiva', 'Hylla'], ['gips', 'Gips']]],
    ['Vägg', [['panel', 'Ribbor'], ['farg', 'Färg']]], ['Ljus & tv', [['led', 'LED-list'], ['tv', 'TV']]]];
  function step2() {
    const p = selPart();
    const pal = PAL.map(([c, ks]) => `<h5>${c.toUpperCase()}</h5>` + ks.map(([k, n]) => `<button data-pal="${k}" title="Dra in på väggen – eller klicka">${PARTS[k].icon}<span>${n}</span></button>`).join('')).join('');
    return `<div class="es-card bs-rail"><div class="es-pal">${pal}</div></div>
      <div class="es-cv"><div class="es-hd"><div class="bs-tabs">${o.variants.map((v, i) => `<button data-var="${i}" class="${i === o.active ? 'on' : ''}">${esc(v.name)}</button>`).join('')}<button data-var="new" title="Ny variant (kopia)">＋</button></div>
        <div class="bs-tabs"><button data-night="0" class="${!S.night ? 'on' : ''}">☀️ Dag</button><button data-night="1" class="${S.night ? 'on' : ''}">🌙 Kväll</button></div></div>
        ${wallSvg(parts(), m, { crop: crop(), L: L(), H, win: W().win, doors: W().doors, items: W().items || [], sel: S.sel, guides: S.drag?.guides || [], interactive: true, showIkea: S.showIkea, night: S.night })}
        ${wallCap(parts(), S.sel, L(), H)}
        ${L() >= 4 ? `<div class="es-seg" style="margin-top:6px;justify-content:center"><button data-whole>${S.whole ? '🔍 Zooma in på bygget' : '↔ Visa hela väggen'}</button></div>` : ''}</div>
      <div class="es-card bs-side">${p ? partPanel(p) : wallPanel()}</div>`;
  }
  const chips = (attr, list, cur) => `<div class="es-seg">${list.map(([v, l]) => `<button data-${attr}="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  // frontväljare: modell + färg (så som den säljs) + handtag. Gäller valt skåp, eller alla skåp när inget är valt.
  function frontBlock(p) {
    const cabs = parts().filter(q => q.k === 'besta'), ref = p || cabs[0] || {}, F = frontOf(ref), glas = ref.front === 'glas', met = ref.k === 'metod';
    const ser = glas ? GLASS_SERIES : FRONT_SERIES[F.serie];
    return `${glas || met ? `<div class="es-note">${glas ? 'Glasdörrar till BESTÅ heter SINDVIK' : 'METOD-skåpen får egna, målade fronter'}</div>` : `<h4>MODELL</h4><div class="es-seg">${Object.keys(FRONT_SERIES).map(k => `<button data-fser="${k}" class="${F.serie === k ? 'on' : ''}">${k === 'EGEN' ? 'Egen (målad)' : k}</button>`).join('')}</div>`}
      <h4>FÄRG <span class="bs-dim">· ${esc(F.namn)}</span></h4><div class="bs-sw">${ser.farger.map(([n, c], i) => `<button data-fcol="${i}" class="${(ref.fc || 0) === i || (Math.min(ref.fc || 0, ser.farger.length - 1) === i) ? 'on' : ''}" style="background:${c}" title="${esc(n)}"></button>`).join('')}</div>
      ${F.stil === 'grepp' && !glas ? '' : `<h4>HANDTAG</h4>${chips('hd', HANDTAG, ref.hd || 'tryck')}`}`;
  }
  function wallPanel() {
    const cabs = parts().filter(q => q.k === 'besta'), lights = lightParts(parts());
    return `<h3 class="bs-h">🧱 Hela väggen</h3>
      <h4>GÖR DET INBYGGT</h4><div class="es-seg" style="flex-direction:column;align-items:stretch">${[['passbit', '▕ Passbitar mot väggarna'], ['kappa', '▔ Kappa ända upp till taket'], ['sockel', '▁ Sockel under stående skåp']].map(([k, l]) => `<button data-auto="${k}" class="${parts().some(q => q.auto === k) ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${cabs.length ? `<div class="bs-sec"><h4>FRONTER PÅ ALLA SKÅP</h4>${frontBlock(null)}</div>` : ''}
      <div class="bs-sec"><h4>LJUSET PÅ VÄGGEN</h4>${lights.length ? lights.map(q => { const L2 = ltOf(q); return `<button class="bs-lrow" data-selp="${q.id}"><i style="background:${ltCol(L2)};color:${ltCol(L2)}"></i><b>${q.k === 'ram' ? 'LED i ramen' : q.k === 'led' ? 'LED-list' : `${q.spots} spotlights i ${q.k === 'kappa' ? 'kappan' : 'gipsen'}`}</b><span>${ljusText(L2)} · ${L2.lm} lm${q.k === "ram" || q.k === "led" ? "/m" : ""}</span></button>`; }).join('')
        : '<div class="es-note">Inget ljus än. Dra in en <b>ram</b> (LED i innerkanten), en <b>LED-list</b>, eller klicka på en <b>kappa</b> och välj spotlights.</div>'}
        ${lights.length ? `<div class="es-note">Tryck 🌙 Kväll ovanför bilden för att se hur det lyser.</div>` : ''}</div>
      <details class="bs-more"><summary>⚙ Material på stommar, ribbor och skivor</summary>${matBlock('front', 'Kappor, ramar & passbitar')}${matBlock('stomme', 'Stommar (insidan)')}${matBlock('panel', 'Ribbor/panel')}${matBlock('skiva', 'Hyllor & skivor')}
        <div class="es-tog ${S.showIkea ? 'on' : ''}" data-tog="ikea" style="margin-top:8px"><span>Visa vad som är IKEA (blått)</span><i></i></div></details>
      <div class="es-seg" style="margin-top:10px"><button data-varname>✏️ Byt namn på ${esc(V().name)}</button>${o.variants.length > 1 ? '<button data-vardel>🗑 Ta bort varianten</button>' : ''}</div>`;
  }
  function matBlock(k, label) {
    const ids = { front: ['matt', 'lack', 'ek', 'ljusek', 'valnot', 'svartask'], stomme: ['matt', 'ek', 'svartask'], panel: ['ek', 'ljusek', 'valnot', 'svartask', 'matt'], skiva: ['ek', 'ljusek', 'valnot', 'svartask', 'marmor', 'betong'] }[k];
    const cols = k === 'front' || k === 'stomme' ? ['#f2f2f0', '#e8e2d6', '#c9c4ba', '#8a8f87', '#4a4f4a', '#2b2b2b', '#3e4a3f', '#3b4656'] : null;
    return `<h4>${label.toUpperCase()}</h4><div class="bs-mats">${ids.map(id => `<button data-mat="${k}:${id}" class="${m[k].mat === id && (!cols || MATS[id].group !== 'farg') ? 'on' : ''}"><img src="${swatch(id, m[k].mat === id ? m[k].color : null)}">${MATS[id].name.split(/[ ,]/)[0]}</button>`).join('')}</div>
      ${cols && MATS[m[k].mat].group === 'farg' ? `<div class="es-seg" style="margin-top:5px">${cols.map(c => `<button data-col="${k}:${c}" style="width:26px;height:26px;padding:0;background:${c};${m[k].color === c ? 'outline:2px solid #ff7a2f' : ''}"></button>`).join('')}</div>` : ''}`;
  }
  function partPanel(p) {
    const P = PARTS[p.k], ik = isIkea(p), I = IKEA[p.k], nm = { besta: 'BESTÅ-skåp', metod: 'METOD överskåp', ram: 'Ram / nisch', kappa: 'Kappa', gips: 'Gipsinbyggnad', led: 'LED-list', tv: 'TV på väggen', panel: 'Ribbor', farg: 'Färgyta', skiva: 'Hylla / skiva', passbit: 'Passbit', sockel: 'Sockel' }[p.k] || P.name;
    const seg = (key, list, fmt = v => cm(v)) => `<div class="es-seg">${list.map(v => `<button data-ps="${key}:${v}" class="${Math.abs(p[key] - v) < .002 ? 'on' : ''}">${fmt(v)}</button>`).join('')}</div>`;
    let h = `<div class="bs-head"><i>${P.icon}</i><div><b>${nm}</b><span>${p.k === 'tv' ? p.inch + '" · ' : ''}${cm(p.w)} × ${cm(p.h)} cm${p.d > .03 ? ` · ${cm(p.d)} djup` : ''}</span></div><button data-desel title="Klar">✕</button></div>`;
    if (ik) h += `<div class="bs-sec"><h4>STORLEK</h4><div class="bs-dims"><span>Bredd</span>${seg('w', I.ws)}<span>Höjd</span>${seg('h', I.hs)}${I.ds.length > 1 ? `<span>Djup</span>${seg('d', I.ds)}` : ''}</div>
        ${!hangOk(p) ? `<div class="es-note" style="color:#ff9a8a">⚠️ ${cm(p.h)} cm höga stommar får inte hängas på väggen – ställ den på golvet.</div>` : ''}</div>
      <div class="bs-sec"><h4>FRONT</h4>${chips('pf', FRONTS, p.front)}${p.front !== 'oppen' ? frontBlock(p) : ''}
      ${p.k === 'besta' && p.front !== 'oppen' ? `<div class="es-seg" style="margin-top:8px"><button data-sameall>⧉ Samma front på alla skåp</button></div>` : ''}</div>`;
    if (p.k === 'ram') { const sd = p.sides || {}, n = Object.values(sd).filter(Boolean).length;
      h += `<div class="bs-sec"><h4>FRÄST LED I INNERKANTEN</h4><div class="bs-frame">${['top', 'left', 'right', 'bottom'].map(k => `<button data-side="${k}" class="bs-f-${k} ${sd[k] ? 'on' : ''}" title="${{ top: 'Överkant', left: 'Vänster', right: 'Höger', bottom: 'Nederkant' }[k]}"></button>`).join('')}<span>${n === 4 ? 'Runt om' : n ? n + ' sidor' : 'Ingen LED'}</span></div>
        <div class="es-seg" style="margin-top:6px"><button data-sides="all">Runt om</button><button data-sides="none">Ingen</button></div>
        ${n ? `<h4>VART LYSER LISTEN?</h4>${chips('rdir', RAM_DIR, p.dir || 'in')}${ljusHtml(p.id, ltOf(p), { perM: true })}` : ''}</div>
        <div class="bs-sec"><h4>RAMEN</h4><div class="bs-dims"><span>Bredd</span>${seg('t', [.03, .05, .08, .1])}<span>Djup</span>${seg('d', [.05, .1, .15, .2, .3])}</div></div>`; }
    if (p.k === 'kappa' || p.k === 'gips') h += `<div class="bs-sec"><h4>SPOTLIGHTS UNDER</h4>${chips('spots', [0, 1, 2, 3, 4, 5, 6].map(v => [v, v ? v : 'Inga']), p.spots || 0)}
        ${p.spots ? `<h4>SPRIDNING</h4>${chips('beam', SPOT_BEAM, p.beam || 36)}${ljusHtml(p.id, ltOf(p))}<div class="es-note">Infälld ⌀ 68 mm, kräver ca 6 cm bakom. ${p.h >= .06 ? '✓ Det får plats.' : '⚠️ Bygg kappan minst 6 cm hög.'}</div>` : ''}</div>`;
    if (p.k === 'led') h += `<div class="bs-sec"><h4>VART LYSER LISTEN?</h4>${chips('ldir', LED_DIR, p.dir || 'ned')}${ljusHtml(p.id, ltOf(p), { perM: true })}</div>`;
    if (p.k === 'tv') h += `<div class="bs-sec"><h4>STORLEK</h4>${seg('inch', [43, 50, 55, 65, 75, 85], v => v + '"')}</div>`;
    if (p.k === 'panel') h += `<div class="bs-sec"><h4>SORT</h4>${chips('pst', PANEL_STIL, p.stil)}</div>`;
    if (p.k === 'farg') h += `<div class="bs-sec"><h4>FÄRG</h4><div class="bs-sw">${['#3b3f3a', '#2f3b45', '#5b6b5a', '#8a6f5a', '#c9b8a3', '#e8e2d6', '#1f2328', '#a33b2b'].map(c => `<button data-pc="${c}" class="${p.color === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div></div>`;
    h += `<details class="bs-more" ${S.exact ? 'open' : ''}><summary>⚙ Exakta mått och läge</summary>
        ${!ik && p.k !== 'tv' ? `<div class="bs-num"><label>Bredd<input data-num="w" value="${cm(p.w)}" inputmode="decimal"></label><label>Höjd<input data-num="h" value="${cm(p.h)}" inputmode="decimal"></label><label>Djup<input data-num="d" value="${cm(p.d)}" inputmode="decimal"></label></div>` : ''}
        <div class="bs-num" style="margin-top:6px"><label>Från vänster<input data-num="x" value="${cm(p.x)}" inputmode="decimal"></label><label>Från golvet<input data-num="y" value="${cm(p.y)}" inputmode="decimal"></label><label>Ut från väggen<input data-num="z" value="${cm(p.z || 0)}" inputmode="decimal"></label></div>
        <div class="es-note">Eller dra delen i bilden – den snäpper mot väggar, golv, tak, fönster och andra delar. Piltangenter = 1 cm, Shift = 10 cm.</div></details>
      <div class="bs-acts"><button data-dup>⧉ Kopiera</button>${!ik ? '<button data-fill>↔ Hela bredden</button>' : ''}<button data-del>🗑 Ta bort</button></div>`;
    return h;
  }
  // ---- steg 3: lista ----
  function step3() {
    const L2 = byggList(parts(), o), icon = { IKEA: '🔵', Bygghandeln: '🟫', El: '💡', Färg: '🎨' };
    return `<div class="es-card" style="grid-column:1/-1"><h4>INKÖPSLISTA · ${esc(V().name)}</h4><div class="bs-shop">${Object.entries(L2).map(([k, mp]) => `<div><h3>${icon[k]} ${k}</h3>${mp.size ? [...mp].map(([n, c]) => `<div class="es-row"><span>${esc(n)}</span><b>${c} st</b></div>`).join('') : '<div class="es-note">Inget här</div>'}</div>`).join('')}</div>
        <div class="es-note">Räknat från ritningen med lite marginal för spill. IKEA-stommarnas mått följer IKEA:s sortiment – kontrollera hos IKEA innan du handlar. Fast el (nya dosor, spotlights) ska installeras av behörig elinstallatör.</div></div>
      <div class="es-card" style="grid-column:1/-1"><h4>FÖRHANDSBILD</h4>${wallSvg(parts(), m, { crop: cropOf(parts()), L: L(), H, win: W().win, doors: W().doors, items: W().items || [], cls: 'es-svg', showIkea: false })}</div>`;
  }

  // ---------- händelser ----------
  const svgPt = e => { const sv = ov.querySelector('.es-cv svg'); if (!sv) return null; const pt = sv.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const r = pt.matrixTransform(sv.getScreenCTM().inverse()); return { x: r.x / 100, y: H - r.y / 100 }; };
  const redrawSvg = () => { const host = ov.querySelector('.es-cv'); if (!host) return; const t = document.createElement('div');
    t.innerHTML = wallSvg(parts(), m, { crop: S.drag?.crop ?? crop(), L: L(), H, win: W().win, doors: W().doors, items: W().items || [], sel: S.sel, guides: S.drag?.guides || [], interactive: true, showIkea: S.showIkea, night: S.night }); host.querySelector('svg').replaceWith(t.firstChild);
    t.innerHTML = wallCap(parts(), S.sel, L(), H); host.querySelector('.bs-cap')?.replaceWith(t.firstChild); };
  ov.addEventListener('pointerdown', e => {
    if (S.step !== 2) return;
    const pal = e.target.closest('[data-pal]'), rs = e.target.closest('[data-rs]'), bp = e.target.closest('.bp'), q = svgPt(e);
    if (pal) { S.drag = { kind: 'new', k: pal.dataset.pal, sx: e.clientX, sy: e.clientY, crop: crop() }; e.preventDefault(); return; }
    if (rs) { const p = parts().find(x => x.id === rs.dataset.rs); S.drag = { kind: 'size', p, sx: e.clientX, sy: e.clientY, crop: crop() }; e.preventDefault(); return; }
    if (bp && q) { const p = parts().find(x => x.id === bp.dataset.part); S.sel = p.id; S.drag = { kind: 'move', p, dx: q.x - p.x, dy: q.y - p.y, sx: e.clientX, sy: e.clientY, crop: crop() }; draw(); e.preventDefault(); return; }
    if (e.target.closest('.es-cv svg')) { S.sel = null; draw(); }
  });
  const onMove = e => { const d = S.drag; if (!d) return; if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return; d.moved = true; const q = svgPt(e); if (!q) return;
    if (d.kind === 'new') { if (!d.p) { d.p = newPart(d.k); if (d.k === 'panel' || d.k === 'farg') { d.p.h = Math.min(d.p.h, H); } parts().push(d.p); S.sel = d.p.id; draw(); }
      const s = snapMove(d.p, q.x - d.p.w / 2, q.y - d.p.h / 2, parts(), L(), H, W().win); d.p.x = s.x; d.p.y = s.y; d.guides = s.guides; redrawSvg(); return; }
    if (d.kind === 'move') { const s = e.altKey ? { x: +(q.x - d.dx).toFixed(3), y: +Math.max(0, q.y - d.dy).toFixed(3), guides: [] } : snapMove(d.p, q.x - d.dx, q.y - d.dy, parts(), L(), H, W().win); d.p.x = s.x; d.p.y = s.y; d.guides = s.guides; redrawSvg(); return; }
    if (d.kind === 'size') { const p = d.p; const tx = q.x - p.x, ty = q.y - p.y; let w = Math.max(.01, tx), h = Math.max(.005, ty);
      // snäpp högerkant/överkant mot väggens kant, tak och andra delar
      const s = snapMove({ ...p, w: 0, h: 0 }, p.x + w, p.y + h, parts().filter(x => x !== p), L(), H, W().win); w = Math.max(.01, s.x - p.x); h = Math.max(.005, s.y - p.y);
      p.w = +w.toFixed(3); p.h = +h.toFixed(3); d.guides = s.guides; redrawSvg(); } };
  const onUp = () => { const d = S.drag; S.drag = null; if (!d) return;
    if (d.kind === 'new' && !d.moved) { const p = newPart(d.k); p.x = Math.max(0, L() / 2 - p.w / 2); p.y = d.k === 'tv' ? 1.05 : d.k === 'besta' ? .25 : d.k === 'panel' || d.k === 'farg' ? 0 : d.k === 'kappa' ? H - p.h : 1.0; if (p.h > H) p.h = H;
      const tv = parts().find(q => q.k === 'tv');   // en ram läggs runt tv:n om det finns en
      if (d.k === 'ram' && tv) Object.assign(p, { x: +(tv.x - .2).toFixed(3), y: +(tv.y - .2).toFixed(3), w: +(tv.w + .4).toFixed(3), h: +(tv.h + .4).toFixed(3) });
      if (d.k === 'kappa') { p.x = 0; p.w = +L().toFixed(3); }
      parts().push(p); S.sel = p.id; }
    if (d.p && !hangOk(d.p)) say(`⚠️ ${cm(d.p.h)} cm höga stommar får inte hängas på vägg – ställ den på golvet`);
    if (d.moved || d.kind === 'new') draw(); };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  ov.addEventListener('click', e => {
    const b = e.target.closest('button,[data-wall],[data-tog]'); if (!b) return; const d = b.dataset, p = selPart();
    if ('close' in d) return close();
    if (d.step) { S.step = +d.step; return draw(); }
    if ('done' in d) { cleanup(); onDone({ o, m, room: S.room, wall: S.wall }); return; }
    if (d.room !== undefined) { S.room = +d.room; S.wall = 0; S.sug = null; return draw(); }
    if (d.wall !== undefined) { S.wall = +d.wall; S.sug = null; return draw(); }
    if (d.sug !== undefined) { const i = +d.sug; V().parts = i < 0 ? [] : JSON.parse(JSON.stringify(S.sug[i].parts)); if (i >= 0 && V().name.startsWith('Förslag')) V().name = `Förslag ${'ABCDEFG'[o.active]} · ${S.sug[i].name}`; S.step = 2; S.sel = null; return draw(); }
    if (d.var !== undefined) { if (d.var === 'new') { o.variants.push({ name: `Förslag ${'ABCDEFG'[o.variants.length] || o.variants.length + 1}`, parts: JSON.parse(JSON.stringify(parts())).map(q => ({ ...q, id: q.id + 'v' + o.variants.length })) }); o.active = o.variants.length - 1; say('Ny variant – en kopia du kan ändra fritt'); } else o.active = +d.var; S.sel = null; return draw(); }
    if ('varname' in d) { const n = prompt('Namn på varianten', V().name); if (n) V().name = n.trim(); return draw(); }
    if ('vardel' in d) { if (confirm(`Ta bort ${V().name}?`)) { o.variants.splice(o.active, 1); o.active = 0; } return draw(); }
    if (d.auto) { const on = !parts().some(q => q.auto === d.auto); V().parts = builtIn(parts(), L(), H, d.auto, on); if (on && !parts().some(q => q.auto === d.auto)) say(d.auto === 'kappa' ? 'Inga höga skåp att bygga kappa ovanför' : d.auto === 'passbit' ? 'Inga glipor mot väggarna (under 30 cm)' : 'Inga skåp som står lite ovanför golvet'); return draw(); }
    if (d.fr) { o.fronter = d.fr; return draw(); }
    if (d.fs) { o.frontstil = d.fs; return draw(); }
    if (d.mat) { const [k, id] = d.mat.split(':'); m[k] = { mat: id, color: MATS[id].group === 'farg' ? (m[k].color || '#f2f2f0') : null }; return draw(); }
    if (d.col) { const [k, c] = d.col.split(':'); m[k].color = c; return draw(); }
    if (d.tog === 'ikea') { S.showIkea = !S.showIkea; return draw(); }
    if ('whole' in d) { S.whole = !S.whole; return draw(); }
    if (d.night !== undefined) { S.night = d.night === '1'; return draw(); }
    if (d.selp) { S.sel = d.selp; return draw(); }
    if ('desel' in d) { S.sel = null; return draw(); }
    // fronter: valt skåp, eller alla BESTÅ-skåp när inget är valt
    const targets = () => p ? [p] : parts().filter(q => q.k === 'besta');
    if (d.fser) { for (const q of targets()) { q.fs = d.fser; q.fc = 0; } return draw(); }
    if (d.fcol !== undefined) { for (const q of targets()) { if (!p && !q.fs) q.fs = 'LAPPVIKEN'; q.fc = +d.fcol; } return draw(); }
    if (d.hd) { for (const q of targets()) q.hd = d.hd; return draw(); }
    if (d.lj) { const [id, f, v] = d.lj.split('|'), q = parts().find(x => x.id === id); if (q) { q.lt = { ...ltOf(q) }; ljusSet(q.lt, f, v); } return draw(); }
    if (!p) return;
    if ('sameall' in d) { for (const q of parts().filter(x => x.k === 'besta' && x.front !== 'oppen' && x.front !== 'glas')) { q.fs = p.fs; q.fc = p.fc; q.hd = p.hd; } say('Alla skåp har nu samma front'); return draw(); }
    if (d.side) { p.sides = { ...(p.sides || {}) }; p.sides[d.side] = p.sides[d.side] ? 0 : 1; return draw(); }
    if (d.sides) { p.sides = d.sides === 'all' ? { top: 1, bottom: 1, left: 1, right: 1 } : { top: 0, bottom: 0, left: 0, right: 0 }; return draw(); }
    if (d.rdir) { p.dir = d.rdir; return draw(); }
    if (d.ldir) { p.dir = d.ldir; return draw(); }
    if (d.spots !== undefined) { p.spots = +d.spots; if (!p.lt) p.lt = ltOf(p); if (p.spots && !S.night) say('💡 Tryck 🌙 Kväll för att se ljuset'); return draw(); }
    if (d.beam) { p.beam = +d.beam; return draw(); }
    if (d.ps) { const [k, v] = d.ps.split(':'); p[k] = +v; if (k === 'inch') Object.assign(p, tvSize(+v)); if (!hangOk(p)) say(`⚠️ ${cm(p.h)} cm höga stommar får inte hängas på vägg`); return draw(); }
    if (d.pf) { p.front = d.pf; return draw(); }
    if (d.pst) { p.stil = d.pst; return draw(); }
    if (d.pc) { p.color = d.pc; return draw(); }
    if ('dup' in d) { const c = { ...JSON.parse(JSON.stringify(p)), id: 'p' + Math.random().toString(36).slice(2, 8), auto: undefined }; c.x = Math.min(L() - c.w, p.x + p.w); parts().push(c); S.sel = c.id; return draw(); }
    if ('fill' in d) { if (isIkea(p)) { say('IKEA-stommar har fasta bredder – använd passbitar för att fylla ut'); return; } p.x = 0; p.w = +L().toFixed(3); return draw(); }
    if ('del' in d) { V().parts = parts().filter(q => q !== p); S.sel = null; return draw(); }
  });
  // ljusreglagen: uppdatera bilden direkt medan man drar (utan att rita om panelen)
  ov.addEventListener('input', e => { const t = e.target; if (!t.dataset.ljr) return; const [id, f] = t.dataset.ljr.split('|'), q = parts().find(x => x.id === id); if (!q) return;
    q.lt = { ...ltOf(q) }; ljusSet(q.lt, f, t.value); const out = t.parentElement.querySelector('output'); if (out) out.textContent = f === 'k' ? q.lt.k + ' K' : f === 'hue' ? q.lt.hue + '°' : q.lt.lm + ' lm' + (q.k === 'ram' || q.k === 'led' ? '/m' : '');
    const sw = t.closest('.lj')?.querySelector('.sw'); if (sw) { const c = ltCol(q.lt); sw.style.background = c; sw.style.color = c; } redrawSvg(); });
  ov.addEventListener('toggle', e => { if (e.target.matches?.('.bs-more')) S.exact = e.target.open; }, true);
  ov.addEventListener('change', e => { const t = e.target, p = selPart(); if (!t.dataset.num || !p) return; const v = parseFloat(t.value.replace(',', '.')) / 100; if (!isFinite(v)) return draw();
    p[t.dataset.num] = Math.max(t.dataset.num === 'w' || t.dataset.num === 'h' ? .005 : 0, +v.toFixed(3)); draw(); });
  const onKey = e => { if (S.step !== 2 || e.target.tagName === 'INPUT') return; const p = selPart(); if (!p) return; const st = e.shiftKey ? .1 : .01;
    if (e.key === 'Delete' || e.key === 'Backspace') { V().parts = parts().filter(q => q !== p); S.sel = null; draw(); e.preventDefault(); }
    const mv = { ArrowLeft: ['x', -st], ArrowRight: ['x', st], ArrowUp: ['y', st], ArrowDown: ['y', -st] }[e.key]; if (mv) { p[mv[0]] = +Math.max(0, p[mv[0]] + mv[1]).toFixed(3); draw(); e.preventDefault(); } };
  window.addEventListener('keydown', onKey);
  function cleanup() { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('keydown', onKey); ov.remove(); }
  function close() { cleanup(); }
  draw();
}
