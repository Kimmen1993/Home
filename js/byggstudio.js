// Byggverkstan: 1) välj vägg + börja tomt eller från ett förslag  2) bygg väggen framifrån (dra, snäpp, ändra storlek)
// 3) inköpslista + sätt in. Varianter A/B/C av samma vägg. Samma utseende som Elfa-verkstan.
import { STUDIO_CSS, wallPlanSvg } from './elfastudio.js?v=1794479499';
import { PARTS, CATS, IKEA, FRONTS, PANEL_STIL, newPart, isIkea, hangOk, snapMove, builtIn, suggestions, byggList, tvSize } from './bygg.js?v=1794479499';
import { MATS, GROUPS, swatch } from './materials.js?v=1794479499';

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
@media (max-width:900px){.bs-shop{grid-template-columns:1fr}}
`;

// ---------- ritningen framifrån ----------
const fillOf = (p, m) => p.k === 'farg' ? (p.color || '#3b3f3a') : p.k === 'panel' ? (m.panel?.color || '#b48a5c') : p.k === 'skiva' ? (m.skiva?.color || '#b48a5c')
  : p.k === 'gips' ? (m.gips?.color || '#f4f2ee') : p.k === 'sockel' ? '#222' : (p.k === 'passbit' || p.k === 'kappa') ? (m.front?.color || '#f2f2f0') : (m.stomme?.color || '#f2f2f0');
const matColor = s => s?.color || MATS[s?.mat]?.color || '#ddd';
const ORDER = ['farg', 'panel', 'gips', 'sockel', 'passbit', 'kappa', 'besta', 'metod', 'skiva', 'led', 'tv'];
export function wallSvg(parts, m, { crop = null, L, H, win = [], doors = [], items = [], sel = null, guides = [], interactive = false, showIkea = true, cls = 'es-svg' } = {}) {
  const X = v => +(v * 100).toFixed(1), Y = v => +((H - v) * 100).toFixed(1), mm = { stomme: { color: matColor(m.stomme) }, front: { color: matColor(m.front) }, panel: { color: matColor(m.panel) }, skiva: { color: matColor(m.skiva) }, gips: { color: matColor(m.gips) } };
  let out = `<rect x="0" y="0" width="${X(L)}" height="${X(H)}" fill="#2a312a"/><rect x="0" y="${X(H)}" width="${X(L)}" height="8" fill="#4a3a28"/>`;
  for (const [a, w, s, h] of win) out += `<rect x="${X(a)}" y="${Y(s + h)}" width="${X(w)}" height="${X(h)}" fill="#2a3b4c" stroke="#7f9fbf" stroke-width="1.5"/>`;
  for (const [a, w, h] of doors) out += `<rect x="${X(a)}" y="${Y(h)}" width="${X(w)}" height="${X(h)}" fill="#151a15" stroke="#6b7a68" stroke-width="1.5"/>`;
  for (const [a, w, top, bot, nm] of items) out += `<rect x="${X(a)}" y="${Y(top)}" width="${X(w)}" height="${X(top - bot)}" fill="rgba(160,170,160,.18)" stroke="rgba(200,210,200,.45)" stroke-dasharray="4 3"/>` + (w > .45 ? `<text x="${X(a + w / 2)}" y="${Y(top) - 4}" fill="#9aa39a" font-size="10" text-anchor="middle">${esc(nm)}</text>` : '');
  for (const p of [...parts].sort((a, b) => ORDER.indexOf(a.k) - ORDER.indexOf(b.k))) {
    const on = sel === p.id, x = X(p.x), y = Y(p.y + p.h), w = Math.max(1, X(p.w)), h = Math.max(1, X(p.h)), ik = isIkea(p), bad = !hangOk(p);
    let g = '';
    if (p.k === 'tv') g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#0b0c0e" stroke="#555"/><text x="${x + w / 2}" y="${y + h / 2 + 4}" fill="#777" font-size="11" text-anchor="middle">TV ${p.inch}"</text>`;
    else if (p.k === 'led') g = `<rect x="${x}" y="${y - 2}" width="${w}" height="4" fill="#ffd27a" style="filter:drop-shadow(0 0 4px #ffd27a)"/>`;
    else { g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fillOf(p, mm)}" ${p.k === 'farg' ? 'opacity=".9"' : ''}/>`;
      if (p.k === 'panel' && p.stil !== 'slat') { const st = 4; for (let i = st / 2; i < w; i += st) g += `<line x1="${x + i}" x2="${x + i}" y1="${y}" y2="${y + h}" stroke="${p.stil === 'akustik' ? '#1c1c1c' : 'rgba(0,0,0,.25)'}" stroke-width="1.2"/>`; }
      if (ik) { const cols = Math.max(1, Math.round(p.w / (p.k === 'metod' ? p.w : .6))), rows = p.h > 1.5 ? 3 : p.h > 1 ? 2 : 1;
        if (p.front === 'oppen') { const n = Math.max(2, Math.round(p.h / .32)); g += `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="rgba(0,0,0,.35)"/>`; for (let r = 1; r < n; r++) g += `<line x1="${x + 2}" x2="${x + w - 2}" y1="${y + h * r / n}" y2="${y + h * r / n}" stroke="${mm.stomme.color}" stroke-width="2"/>`; }
        else for (let c = 0; c < cols; c++) for (let r = 0; r < rows * (p.front === 'lador' ? 2 : 1); r++) { const fw = w / cols, fh = h / (rows * (p.front === 'lador' ? 2 : 1));
          g += `<rect x="${x + c * fw + 1}" y="${y + r * fh + 1}" width="${fw - 2}" height="${fh - 2}" fill="${p.front === 'glas' ? 'rgba(90,86,80,.85)' : mm.front.color}" stroke="rgba(0,0,0,.35)" stroke-width=".8"/>`; } } }
    const ol = p.k === 'led' || p.k === 'tv' ? '' : `<rect class="ol" x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${bad ? '#ff5a4a' : showIkea ? (ik ? '#7fb2ff' : 'rgba(255,122,47,.55)') : 'rgba(0,0,0,.3)'}" stroke-width="${ik ? 1.6 : 1}" ${p.auto ? 'stroke-dasharray="4 3"' : ''}/>`;
    out += `<g class="bp ${on ? 'on' : ''}" data-part="${p.id}">${g}${ol}${on && interactive ? `<rect class="ol" x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(255,122,47,.12)" stroke="#ff7a2f" stroke-width="2.5"/>` : ''}</g>`;
    if (on && interactive && !isIkea(p) && p.k !== 'tv') out += `<rect class="rh" data-rs="${p.id}" x="${x + w - 7}" y="${y - 7}" width="14" height="14" rx="3"/>`;
    if (bad) out += `<text x="${x + w / 2}" y="${y - 4}" fill="#ff7a6a" font-size="10" text-anchor="middle">${cm(p.h)} cm hög får inte hängas på vägg</text>`;
  }
  for (const g of guides) out += g.x !== undefined ? `<line x1="${X(g.x)}" x2="${X(g.x)}" y1="0" y2="${X(H)}" stroke="#ff7a2f" stroke-width="1.3" stroke-dasharray="6 5"/>` : `<line x1="0" x2="${X(L)}" y1="${Y(g.y)}" y2="${Y(g.y)}" stroke="#ff7a2f" stroke-width="1.3" stroke-dasharray="6 5"/>`;
  const sp = sel && parts.find(p => p.id === sel);
  if (sp && interactive) out += `<text x="${X(sp.x + sp.w / 2)}" y="${X(H) + 26}" fill="#ff7a2f" font-size="13" text-anchor="middle">↔ ${cm(sp.w)} · ↕ ${cm(sp.h)} · ${cm(sp.x)} cm från vänster · ${cm(sp.y)} cm upp</text>`;
  out += `<text x="${X(L / 2)}" y="${X(H) + (interactive ? 46 : 24)}" fill="#8f9a8b" font-size="13" text-anchor="middle">${cm(L)} cm vägg · ${cm(H)} cm till taket</text>`;
  const c0 = crop ? Math.max(0, crop[0]) : 0, c1 = crop ? Math.min(L, crop[1]) : L;
  return `<svg class="${cls}" viewBox="${X(c0) - 14} -14 ${X(c1 - c0) + 28} ${X(H) + (interactive ? 62 : 40)}" preserveAspectRatio="xMidYMid meet">${out}</svg>`;
}

export function openByggStudio({ item, rooms, startRoom = 0, startWall = 0, roomH = 2.5, onDone }) {
  if (!document.getElementById('es-css')) { const st = document.createElement('style'); st.id = 'es-css'; st.textContent = STUDIO_CSS; document.head.appendChild(st); }
  if (!document.getElementById('bs-css')) { const st = document.createElement('style'); st.id = 'bs-css'; st.textContent = CSS2; document.head.appendChild(st); }
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
      <div class="es-body s${S.step}" ${S.step === 2 ? 'style="grid-template-columns:170px 1fr 270px"' : ''}>${S.step === 1 ? step1() : S.step === 2 ? step2() : step3()}</div>
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
  function step2() {
    const p = selPart(), ks = Object.keys(PARTS);
    const pal = CATS.map(c => `<h5>${c.toUpperCase()}</h5>` + ks.filter(k => PARTS[k].cat === c).map(k => `<button data-pal="${k}">${PARTS[k].icon}<span>${PARTS[k].name}</span></button>`).join('')).join('');
    return `<div class="es-card"><h4>DRA IN</h4><div class="es-pal">${pal}</div></div>
      <div class="es-cv"><div class="es-hd"><div class="bs-tabs">${o.variants.map((v, i) => `<button data-var="${i}" class="${i === o.active ? 'on' : ''}">${esc(v.name)}</button>`).join('')}<button data-var="new" title="Ny variant (kopia)">＋</button></div>
        <span>Dra delar hit · dra för att flytta · orange ruta = ändra storlek</span></div>
        ${wallSvg(parts(), m, { crop: crop(), L: L(), H, win: W().win, doors: W().doors, items: W().items || [], sel: S.sel, guides: S.drag?.guides || [], interactive: true, showIkea: S.showIkea })}
        ${L() >= 4 ? `<div class="es-seg" style="margin-top:6px;justify-content:center"><button data-whole>${S.whole ? '🔍 Zooma in på bygget' : '↔ Visa hela väggen'}</button></div>` : ''}</div>
      <div class="es-card">${p ? partPanel(p) : `<h4>GÖR DET INBYGGT</h4>
        <div class="es-seg" style="flex-direction:column;align-items:stretch">${[['passbit', '▕ Passbitar mot väggarna'], ['kappa', '▔ Kappa ända upp till taket'], ['sockel', '▁ Sockel under stående skåp']].map(([k, l]) => `<button data-auto="${k}" class="${parts().some(q => q.auto === k) ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="es-note">Ett klick fyller ut glipor så att det ser platsbyggt ut. Klicka igen för att ta bort.</div>
        <h4>FRONTER</h4><div class="es-seg"><button data-fr="ikea" class="${o.fronter !== 'egna' ? 'on' : ''}">IKEA:s egna</button><button data-fr="egna" class="${o.fronter === 'egna' ? 'on' : ''}">Egna (snickrade/beställda)</button></div>
        <div class="es-seg" style="margin-top:6px">${[['slat', 'Släta'], ['ram', 'Ram'], ['ribbor', 'Ribbor'], ['spar', 'Spår']].map(([k, l]) => `<button data-fs="${k}" class="${(o.frontstil || 'slat') === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        ${matBlock('front', 'Fronternas färg')}${matBlock('stomme', 'Stommar')}${matBlock('panel', 'Ribbor/panel')}${matBlock('skiva', 'Skivor')}
        <div class="es-tog ${S.showIkea ? 'on' : ''}" data-tog="ikea" style="margin-top:8px"><span>Visa vad som är IKEA (blått)</span><i></i></div>
        <div class="es-seg" style="margin-top:8px"><button data-varname>✏️ Byt namn på ${esc(V().name)}</button>${o.variants.length > 1 ? '<button data-vardel>🗑 Ta bort varianten</button>' : ''}</div>`}</div>`;
  }
  function matBlock(k, label) {
    const ids = { front: ['matt', 'lack', 'ek', 'ljusek', 'valnot', 'svartask'], stomme: ['matt', 'ek', 'svartask'], panel: ['ek', 'ljusek', 'valnot', 'svartask', 'matt'], skiva: ['ek', 'ljusek', 'valnot', 'svartask', 'marmor', 'betong'] }[k];
    const cols = k === 'front' || k === 'stomme' ? ['#f2f2f0', '#e8e2d6', '#c9c4ba', '#8a8f87', '#4a4f4a', '#2b2b2b', '#3e4a3f', '#3b4656'] : null;
    return `<h4>${label.toUpperCase()}</h4><div class="bs-mats">${ids.map(id => `<button data-mat="${k}:${id}" class="${m[k].mat === id && (!cols || MATS[id].group !== 'farg') ? 'on' : ''}"><img src="${swatch(id, m[k].mat === id ? m[k].color : null)}">${MATS[id].name.split(/[ ,]/)[0]}</button>`).join('')}</div>
      ${cols && MATS[m[k].mat].group === 'farg' ? `<div class="es-seg" style="margin-top:5px">${cols.map(c => `<button data-col="${k}:${c}" style="width:26px;height:26px;padding:0;background:${c};${m[k].color === c ? 'outline:2px solid #ff7a2f' : ''}"></button>`).join('')}</div>` : ''}`;
  }
  function partPanel(p) {
    const P = PARTS[p.k], ik = isIkea(p), I = IKEA[p.k];
    const seg = (key, list, fmt = v => cm(v)) => `<div class="es-seg">${list.map(v => `<button data-ps="${key}:${v}" class="${Math.abs(p[key] - v) < .002 ? 'on' : ''}">${fmt(v)}</button>`).join('')}</div>`;
    return `<div class="es-sel"><i>${P.icon}</i><b>${P.name}${ik ? ` ${cm(p.w)}×${cm(p.d)}×${cm(p.h)}` : ''}</b><span>${cm(p.x)} cm från vänster · ${cm(p.y)} cm upp</span></div>
      ${ik ? `<h4>BREDD</h4>${seg('w', I.ws)}<h4>HÖJD</h4>${seg('h', I.hs)}${I.ds.length > 1 ? `<h4>DJUP</h4>${seg('d', I.ds)}` : ''}
        <h4>FRONT</h4><div class="es-seg">${FRONTS.map(([v, l]) => `<button data-pf="${v}" class="${p.front === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        ${!hangOk(p) ? `<div class="es-note" style="color:#ff9a8a">⚠️ ${cm(p.h)} cm höga stommar får inte hängas på väggen – ställ den på golvet.</div>` : ''}`
      : p.k === 'tv' ? `<h4>STORLEK</h4>${seg('inch', [43, 50, 55, 65, 75, 85], v => v + '"')}`
      : `<h4>MÅTT (CM)</h4><div class="bs-num"><label>Bredd<input data-num="w" value="${cm(p.w)}" inputmode="decimal"></label><label>Höjd<input data-num="h" value="${cm(p.h)}" inputmode="decimal"></label><label>Djup<input data-num="d" value="${cm(p.d)}" inputmode="decimal"></label></div>`}
      <h4>LÄGE (CM)</h4><div class="bs-num"><label>Från vänster<input data-num="x" value="${cm(p.x)}" inputmode="decimal"></label><label>Från golvet<input data-num="y" value="${cm(p.y)}" inputmode="decimal"></label><label>Ut från väggen<input data-num="z" value="${cm(p.z || 0)}" inputmode="decimal"></label></div>
      ${p.k === 'panel' ? `<h4>SORT</h4><div class="es-seg">${PANEL_STIL.map(([v, l]) => `<button data-pst="${v}" class="${p.stil === v ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}
      ${p.k === 'farg' ? `<h4>FÄRG</h4><div class="es-seg">${['#3b3f3a', '#2f3b45', '#5b6b5a', '#8a6f5a', '#c9b8a3', '#e8e2d6', '#1f2328', '#a33b2b'].map(c => `<button data-pc="${c}" style="width:28px;height:28px;padding:0;background:${c};${p.color === c ? 'outline:2px solid #ff7a2f' : ''}"></button>`).join('')}</div>` : ''}
      <div class="es-seg es-wide" style="margin-top:12px"><button data-dup title="Kopiera">⧉</button><button data-fill title="Fyll hela väggens bredd">↔</button><button data-del title="Ta bort">🗑</button></div>
      <div class="es-note">Dra delen i bilden – den snäpper mot väggar, golv, tak, fönster och andra delar. Piltangenter = 1 cm, med Shift 10 cm.</div>`;
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
    t.innerHTML = wallSvg(parts(), m, { crop: S.drag?.crop ?? crop(), L: L(), H, win: W().win, doors: W().doors, items: W().items || [], sel: S.sel, guides: S.drag?.guides || [], interactive: true, showIkea: S.showIkea }); host.querySelector('svg').replaceWith(t.firstChild); };
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
    if (d.kind === 'new' && !d.moved) { const p = newPart(d.k); p.x = Math.max(0, L() / 2 - p.w / 2); p.y = d.k === 'tv' ? 1.05 : d.k === 'besta' ? .25 : d.k === 'panel' || d.k === 'farg' ? 0 : 1.0; if (p.h > H) p.h = H; parts().push(p); S.sel = p.id; }
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
    if (!p) return;
    if (d.ps) { const [k, v] = d.ps.split(':'); p[k] = +v; if (k === 'inch') Object.assign(p, tvSize(+v)); if (!hangOk(p)) say(`⚠️ ${cm(p.h)} cm höga stommar får inte hängas på vägg`); return draw(); }
    if (d.pf) { p.front = d.pf; return draw(); }
    if (d.pst) { p.stil = d.pst; return draw(); }
    if (d.pc) { p.color = d.pc; return draw(); }
    if ('dup' in d) { const c = { ...JSON.parse(JSON.stringify(p)), id: 'p' + Math.random().toString(36).slice(2, 8), auto: undefined }; c.x = Math.min(L() - c.w, p.x + p.w); parts().push(c); S.sel = c.id; return draw(); }
    if ('fill' in d) { if (isIkea(p)) { say('IKEA-stommar har fasta bredder – använd passbitar för att fylla ut'); return; } p.x = 0; p.w = +L().toFixed(3); return draw(); }
    if ('del' in d) { V().parts = parts().filter(q => q !== p); S.sel = null; return draw(); }
  });
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
