// Takverkstan: sänkt tak (hela, kappa runt om, kappa på en sida, tak-ö, fritt) med reglar, gips, spotlights och indirekt LED.
// Ytorna mäts från rummets övre vänstra hörn (plan-koordinater). drop = hur mycket taket sänks.
// Reglar: c/c 40 cm som säker standard för 12,5 mm takgips (kontrollera alltid skivtillverkarens anvisning, c/c 60 kan gå med rätt skiva).
import { STUDIO_CSS } from './elfastudio.js?v=1794501654';

const cm = v => Math.round(v * 100), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let nid = 1; const aid = () => 'a' + Date.now().toString(36) + (nid++);
export const DROPS = [.1, .15, .2, .25, .3];

// ---------- former ----------
export function shapeAreas(kind, W, D, opt = {}) {
  const k = opt.k ?? .6, drop = opt.drop ?? .15, A = (x, y, w, d) => ({ id: aid(), x: +x.toFixed(3), y: +y.toFixed(3), w: +w.toFixed(3), d: +d.toFixed(3), drop });
  if (kind === 'hela') return [A(0, 0, W, D)];
  if (kind === 'runt') return [A(0, 0, W, k), A(0, D - k, W, k), A(0, k, k, D - 2 * k), A(W - k, k, k, D - 2 * k)];
  if (kind === 'sida') { const s = opt.side || 'A'; return [s === 'A' ? A(0, 0, W, k) : s === 'C' ? A(0, D - k, W, k) : s === 'D' ? A(0, 0, k, D) : A(W - k, 0, k, D)]; }
  if (kind === 'o') { const t = opt.over, w = Math.min(W - .6, t ? t.w + .6 : 2.2), d = Math.min(D - .6, t ? t.d + .4 : 2.4), cx = t ? t.x : W / 2, cy = t ? t.y : D / 2;
    return [A(Math.max(.3, Math.min(W - w - .3, cx - w / 2)), Math.max(.3, Math.min(D - d - .3, cy - d / 2)), w, d)]; }
  return [];
}
// innerkanter = kanter som inte ligger mot rummets vägg (där LED-list och kantlist hamnar)
export function innerEdges(a, W, D) {
  const e = [], T = .02;
  if (a.y > T) e.push({ x: a.x, y: a.y, len: a.w, dir: 'h', n: -1 });
  if (a.y + a.d < D - T) e.push({ x: a.x, y: a.y + a.d, len: a.w, dir: 'h', n: 1 });
  if (a.x > T) e.push({ x: a.x, y: a.y, len: a.d, dir: 'v', n: -1 });
  if (a.x + a.w < W - T) e.push({ x: a.x + a.w, y: a.y, len: a.d, dir: 'v', n: 1 });
  return e;
}
// spotlights: i smala kappor en rad längs mitten, annars ett rutnät. Minst 30 cm från kanterna.
export function autoSpots(areas, s = 1.2) {
  const out = [];
  for (const a of areas) {
    const narrow = Math.min(a.w, a.d) < 1.0, m = .3;
    if (narrow) { const along = a.w >= a.d, L = (along ? a.w : a.d) - 2 * m, n = Math.max(1, Math.round(L / s) + 1);
      for (let i = 0; i < n; i++) { const t = m + (n === 1 ? L / 2 : i * L / (n - 1)); out.push({ id: aid(), x: +(along ? a.x + t : a.x + a.w / 2).toFixed(3), y: +(along ? a.y + a.d / 2 : a.y + t).toFixed(3) }); } }
    else { const nx = Math.max(1, Math.round((a.w - 2 * m) / s) + 1), ny = Math.max(1, Math.round((a.d - 2 * m) / s) + 1);
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) out.push({ id: aid(), x: +(a.x + (nx === 1 ? a.w / 2 : m + i * (a.w - 2 * m) / (nx - 1))).toFixed(3), y: +(a.y + (ny === 1 ? a.d / 2 : m + j * (a.d - 2 * m) / (ny - 1))).toFixed(3) }); }
  }
  return out;
}
export const areaAt = (areas, x, y) => areas.find(a => x >= a.x - .001 && x <= a.x + a.w + .001 && y >= a.y - .001 && y <= a.y + a.d + .001);
// reglar: tvärs den längsta riktningen, c/c, plus runt kanten
export function studs(a, cc = .4) {
  const along = a.w >= a.d, L = along ? a.w : a.d, lines = [];
  for (let t = 0; t <= L + 1e-6; t += cc) { const v = Math.min(t, L); lines.push(along ? [a.x + v, a.y, a.x + v, a.y + a.d] : [a.x, a.y + v, a.x + a.w, a.y + v]); }
  if (Math.abs(L - Math.floor(L / cc) * cc) > .02) lines.push(along ? [a.x + L, a.y, a.x + L, a.y + a.d] : [a.x, a.y + L, a.x + a.w, a.y + L]);
  lines.push(along ? [a.x, a.y, a.x + a.w, a.y] : [a.x, a.y, a.x, a.y + a.d], along ? [a.x, a.y + a.d, a.x + a.w, a.y + a.d] : [a.x + a.w, a.y, a.x + a.w, a.y + a.d]);
  return lines;
}
// inköpslista för taket
export function takList(o, W, D) {
  const L = { Bygghandeln: new Map(), El: new Map() }, add = (s, k, n = 1) => L[s].set(k, (L[s].get(k) || 0) + n);
  const areas = o.areas || []; if (!areas.length) return L;
  let regel = 0, gips = 0, led = 0;
  for (const a of areas) { for (const [x1, y1, x2, y2] of studs(a, o.cc || .4)) regel += Math.hypot(x2 - x1, y2 - y1);
    gips += a.w * a.d; for (const e of innerEdges(a, W, D)) { gips += e.len * a.drop; regel += e.len; } }
  if (o.led) for (const a of areas) for (const e of innerEdges(a, W, D)) led += e.len;
  add('Bygghandeln', `Regel 45×45 · 3,6 m (c/c ${cm(o.cc || .4)})`, Math.ceil(regel * 1.1 / 3.6));
  add('Bygghandeln', 'Takgips 12,5 mm · 900×2400', Math.ceil(gips * 1.12 / 2.16));
  add('Bygghandeln', 'Gipsskruv 3,9×25 (500 st)', Math.max(1, Math.ceil(gips / 20)));
  add('Bygghandeln', 'Träskruv 5×90 för reglar (100 st)', Math.max(1, Math.ceil(regel / 30)));
  add('Bygghandeln', 'Hörnlist/skyddshörn för kanter', Math.max(1, Math.ceil(areas.reduce((s, a) => s + innerEdges(a, W, D).reduce((t, e) => t + e.len, 0), 0) / 2.5)));
  add('Bygghandeln', 'Spackel + skarvremsa', Math.max(1, Math.ceil(gips / 15)));
  const n = (o.spots || []).length;
  if (n) { add('El', 'Spotlight, infälld (inbyggnadsdjup ≤ sänkningen)', n); add('El', 'Smart dimmer för spotlights (Home Assistant)', 1); }
  if (led) { add('El', 'LED-list 24 V · rulle 5 m', Math.ceil(led / 5)); add('El', 'LED-drivare 24 V', Math.max(1, Math.ceil(led / 5))); add('El', 'Smart dimmer för LED (Home Assistant)', 1); add('El', 'Aluminiumprofil för LED (2 m)', Math.ceil(led / 2)); }
  return L;
}

// ---------- ritningen uppifrån ----------
export function takSvg(o, room, { sel = null, mode = 'plan', interactive = false, cls = 'es-svg' } = {}) {
  const { W, D, pts, items = [] } = room, S = 100, P = (x, y) => `${(x * S).toFixed(1)},${(y * S).toFixed(1)}`;
  let out = `<polygon points="${pts.map(p => P(p.x, p.y)).join(' ')}" fill="#20271f" stroke="#9aa39a" stroke-width="10"/>`;
  for (const it of items) out += `<g transform="translate(${(it.x * S).toFixed(1)} ${(it.y * S).toFixed(1)}) rotate(${it.rot || 0})"><rect x="${(-it.w / 2 * S).toFixed(1)}" y="${(-it.d / 2 * S).toFixed(1)}" width="${(it.w * S).toFixed(1)}" height="${(it.d * S).toFixed(1)}" fill="rgba(160,170,160,.14)" stroke="rgba(200,210,200,.4)" stroke-dasharray="6 5"/>${it.w > .6 ? `<text y="5" fill="#9aa39a" font-size="15" text-anchor="middle" transform="rotate(${-(it.rot || 0)})">${esc(it.name)}</text>` : ''}</g>`;
  for (const a of o.areas || []) { const on = sel === a.id;
    out += `<g class="ta ${on ? 'on' : ''}" data-area="${a.id}"><rect x="${a.x * S}" y="${a.y * S}" width="${a.w * S}" height="${a.d * S}" fill="rgba(255,122,47,${on ? .3 : .17})" stroke="#ff7a2f" stroke-width="${on ? 4 : 2}"/>`;
    if (mode === 'regel' || interactive) for (const [x1, y1, x2, y2] of studs(a, o.cc || .4)) out += `<line x1="${x1 * S}" y1="${y1 * S}" x2="${x2 * S}" y2="${y2 * S}" stroke="#e0c27a" stroke-width="${mode === 'regel' ? 4.5 : 2.5}" opacity="${mode === 'regel' ? .95 : .55}"/>`;
    out += `<text x="${(a.x + a.w / 2) * S}" y="${(a.y + a.d / 2) * S + 6}" fill="#ffb27f" font-size="${Math.max(14, Math.min(26, Math.min(a.w, a.d) * 30))}" text-anchor="middle">−${cm(a.drop)} cm</text></g>`;
    if (on && interactive) out += `<rect class="rh" data-ars="${a.id}" x="${(a.x + a.w) * S - 14}" y="${(a.y + a.d) * S - 14}" width="28" height="28" rx="6"/>`;
    if (mode === 'regel') { out += `<text x="${(a.x + a.w / 2) * S}" y="${a.y * S - 8}" fill="#cfe3ff" font-size="17" text-anchor="middle">${cm(a.w)} cm</text><text x="${a.x * S - 8}" y="${(a.y + a.d / 2) * S}" fill="#cfe3ff" font-size="17" text-anchor="end">${cm(a.d)}</text>`; } }
  if (o.led) for (const a of o.areas || []) for (const e of innerEdges(a, W, D)) out += e.dir === 'h' ? `<line x1="${e.x * S}" y1="${e.y * S}" x2="${(e.x + e.len) * S}" y2="${e.y * S}" stroke="#ffd27a" stroke-width="7" style="filter:drop-shadow(0 0 6px #ffd27a)"/>` : `<line x1="${e.x * S}" y1="${e.y * S}" x2="${e.x * S}" y2="${(e.y + e.len) * S}" stroke="#ffd27a" stroke-width="7" style="filter:drop-shadow(0 0 6px #ffd27a)"/>`;
  if (mode !== 'regel') for (const s of o.spots || []) out += `<circle class="ts" data-spot="${s.id}" cx="${s.x * S}" cy="${s.y * S}" r="13" fill="#ffd27a" stroke="#1a0d05" stroke-width="3"/>`;
  return `<svg class="${cls}" viewBox="-60 -60 ${W * S + 120} ${D * S + 120}" preserveAspectRatio="xMidYMid meet">${out}</svg>`;
}

// ---------- verkstan ----------
const CSS3 = `.es-svg .rh{fill:#ff7a2f;cursor:nwse-resize}.es-svg .ta{cursor:grab}.es-svg .ts{cursor:pointer}.es-svg .ts:hover{fill:#fff}.tk-sec{width:100%}`;
export function openTakStudio({ item, rooms, startRoom = 0, onDone }) {
  if (!document.getElementById('es-css')) { const st = document.createElement('style'); st.id = 'es-css'; st.textContent = STUDIO_CSS; document.head.appendChild(st); }
  if (!document.getElementById('tk-css')) { const st = document.createElement('style'); st.id = 'tk-css'; st.textContent = CSS3; document.head.appendChild(st); }
  const o = item ? JSON.parse(JSON.stringify(item.o)) : { areas: [], spots: [], led: true, cc: .4, spacing: 1.2 };
  const S = { step: item ? 2 : 1, room: startRoom, sel: null, tool: 'flytta', drag: null };
  const R = () => rooms[S.room];
  const ov = document.createElement('div'); ov.className = 'es-ov'; document.body.appendChild(ov);
  const msg = document.createElement('div'); msg.className = 'es-msg'; let mt = 0; const say = t => { msg.textContent = t; msg.classList.add('show'); clearTimeout(mt); mt = setTimeout(() => msg.classList.remove('show'), 2400); };
  const H = () => R().H, minH = () => H() - Math.max(0, ...o.areas.map(a => a.drop));
  const resp = () => { o.spots = o.spots.filter(s => areaAt(o.areas, s.x, s.y)); };
  function draw() {
    ov.innerHTML = `<div class="es-top"><b>⬆️ Takverkstan</b><div class="es-steps">${[['1', 'Rum & form'], ['2', 'Justera & belysning'], ['3', 'Ritningar & lista']].map(([n, t], i) => `<button data-step="${i + 1}" class="${S.step === i + 1 ? 'on' : S.step > i + 1 ? 'done' : ''}">${S.step > i + 1 ? '✓' : n} ${t}</button>`).join('')}</div><button class="es-x" data-close>✕</button></div>
      <div class="es-body s${S.step}" ${S.step === 2 ? 'style="grid-template-columns:1fr 290px"' : S.step === 1 ? 'style="grid-template-columns:1fr 1.2fr"' : ''}>${S.step === 1 ? step1() : S.step === 2 ? step2() : step3()}</div>
      <div class="es-foot"><button class="es-btn ghost" data-${S.step === 1 ? 'close' : 'step="' + (S.step - 1) + '"'}>${S.step === 1 ? 'Avbryt' : '◀ Tillbaka'}</button>
      <span class="es-note">${esc(R().name)} · ${o.areas.length} ytor · ${o.spots.length} spotlights · takhöjd blir ${cm(minH())} cm</span>
      ${S.step < 3 ? `<button class="es-btn" data-step="${S.step + 1}">Nästa ▶</button>` : `<button class="es-btn" data-done>✓ Sätt in i rummet</button>`}</div>`;
    ov.appendChild(msg);
  }
  const FORMS = [['hela', '⬛', 'Hela taket', 'Allt sänks – plats för spotlights överallt'], ['runt', '🔲', 'Kappa runt om', 'Ram längs väggarna, LED mot mitten'], ['sida', '▀', 'Kappa på en sida', 'T.ex. över garderoben eller tv-väggen'], ['o', '▣', 'Tak-ö', 'Ö över sängen eller matbordet'], ['tom', '✏️', 'Rita själv', 'Dra ut egna ytor i nästa steg']];
  function step1() {
    return `<div class="es-card">${rooms.length > 1 ? `<h4>VILKET RUM?</h4><div class="es-seg" style="margin-bottom:10px">${rooms.map((r, i) => `<button data-room="${i}" class="${i === S.room ? 'on' : ''}">${esc(r.name)}</button>`).join('')}</div>` : ''}
        <h4>TAKET UPPIFRÅN</h4>${takSvg(o, R(), {})}<div class="es-note">Takhöjd nu ${cm(H())} cm. Möblerna syns som skuggor, så du ser var sängen och bordet står.</div></div>
      <div class="es-card"><h4>VILKEN FORM?</h4><div class="es-sys">${FORMS.map(([k, i, n, d]) => `<button data-form="${k}"><i>${i}</i><b>${n}</b><span>${d}</span></button>`).join('')}</div>
        <h4>HUR MYCKET SKA TAKET SÄNKAS?</h4><div class="es-seg">${DROPS.map(d => `<button data-dropall="${d}" class="${(o.areas[0]?.drop ?? .15) === d ? 'on' : ''}">${cm(d)} cm</button>`).join('')}</div>
        <div class="es-note">15 cm räcker för de flesta infällda spotlights och ger plats för LED i kanten. Kolla spotlightens inbyggnadsdjup.</div></div>`;
  }
  function step2() {
    const a = o.areas.find(x => x.id === S.sel);
    return `<div class="es-cv"><div class="es-hd"><div class="es-seg">${[['flytta', '✋ Flytta & ändra'], ['spot', '💡 Lägg till/ta bort spot'], ['rita', '✏️ Rita ny yta']].map(([k, l]) => `<button data-tool="${k}" class="${S.tool === k ? 'on' : ''}">${l}</button>`).join('')}</div><span>${S.tool === 'spot' ? 'Klicka i en sänkt yta = ny spot · klicka på en spot = ta bort' : S.tool === 'rita' ? 'Dra en rektangel i taket' : 'Dra en yta för att flytta · orange hörn = ändra storlek'}</span></div>
        ${takSvg(o, R(), { sel: S.sel, interactive: true })}</div>
      <div class="es-card">${a ? `<h4>VALD YTA</h4><div class="bs-num" style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${[['w', 'Bredd'], ['d', 'Djup'], ['x', 'Från vänster'], ['y', 'Från övre väggen']].map(([k, l]) => `<label style="font-size:11px;color:#8f9a8b">${l} (cm)<input data-anum="${k}" value="${cm(a[k])}" style="width:100%;margin-top:3px;padding:7px;border-radius:8px;border:1px solid rgba(190,210,175,.2);background:#0f130f;color:#e9ede6"></label>`).join('')}</div>
          <h4>SÄNKNING</h4><div class="es-seg">${DROPS.map(d => `<button data-drop="${d}" class="${a.drop === d ? 'on' : ''}">${cm(d)} cm</button>`).join('')}</div>
          <div class="es-seg" style="margin-top:8px"><button data-adel>🗑 Ta bort ytan</button></div>` : '<div class="es-note">Klicka på en orange yta för att ändra den.</div>'}
        <h4>SPOTLIGHTS</h4><div class="es-seg">${[[.9, 'Tätt 90'], [1.2, 'Normalt 120'], [1.5, 'Glest 150']].map(([v, l]) => `<button data-spacing="${v}" class="${o.spacing === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="es-seg" style="margin-top:6px"><button data-autospots>💡 Placera automatiskt</button><button data-nospots>Ta bort alla</button></div>
        <div class="es-tog ${o.led ? 'on' : ''}" data-tog="led" style="margin-top:8px"><span>✨ Indirekt LED i kanterna</span><i></i></div>
        <h4>REGLAR</h4><div class="es-seg">${[[.4, 'c/c 40 (säkert)'], [.6, 'c/c 60']].map(([v, l]) => `<button data-cc="${v}" class="${(o.cc || .4) === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="es-note">c/c 60 kräver en takskiva som är godkänd för det – kolla skivtillverkarens anvisning.</div>
        <h4>SNITT</h4><svg viewBox="0 0 300 100" style="width:100%"><rect x="0" y="0" width="300" height="10" fill="#555"/><text x="150" y="8" fill="#ddd" font-size="7" text-anchor="middle">befintligt tak</text>
          ${[20, 70, 120].map(x => `<rect x="${x}" y="10" width="8" height="${Math.round((a?.drop ?? .15) * 230)}" fill="#e0c27a"/>`).join('')}
          <rect x="0" y="${10 + Math.round((a?.drop ?? .15) * 230)}" width="150" height="5" fill="#f2f2f0"/><rect x="148" y="10" width="4" height="${Math.round((a?.drop ?? .15) * 230) + 5}" fill="#f2f2f0"/>
          <circle cx="45" cy="${15 + Math.round((a?.drop ?? .15) * 230)}" r="4" fill="#ffd27a"/>${o.led ? `<line x1="156" y1="${8 + Math.round((a?.drop ?? .15) * 230)}" x2="185" y2="${8 + Math.round((a?.drop ?? .15) * 230)}" stroke="#ffd27a" stroke-width="2.5"/>` : ''}
          <text x="230" y="${12 + Math.round((a?.drop ?? .15) * 115)}" fill="#8f9a8b" font-size="8">${cm(a?.drop ?? .15)} cm</text><text x="60" y="${30 + Math.round((a?.drop ?? .15) * 230)}" fill="#8f9a8b" font-size="7">gips 12,5 mm på reglar 45×45</text></svg>
      </div>`;
  }
  function step3() {
    const L = takList(o, R().W, R().D);
    return `<div class="es-card"><h4>REGELPLAN</h4>${takSvg(o, R(), { mode: 'regel' })}<div class="es-note">Reglar 45×45, c/c ${cm(o.cc || .4)} cm. Mått i cm.</div></div>
      <div class="es-card"><h4>BELYSNINGSPLAN</h4>${takSvg(o, R(), { mode: 'el' })}<div class="es-note">${o.spots.length} spotlights${o.led ? ' + indirekt LED i kanterna' : ''}. De blir lampor under 🏠 Styr.</div>
        ${Object.entries(L).map(([k, mp]) => `<h4>${k === 'El' ? '💡 EL' : '🟫 BYGGHANDELN'}</h4>${[...mp].map(([n, c]) => `<div class="es-row"><span>${esc(n)}</span><b>${c} st</b></div>`).join('') || '<div class="es-note">Inget</div>'}`).join('')}
        <div class="es-note" style="color:#ffd38a">⚠️ Nya spotlights, dosor och dimmer är fast elinstallation och ska göras av behörig elinstallatör. Ta med belysningsplanen.</div>
        <div class="es-seg" style="margin-top:8px"><button data-print>🖨 Skriv ut ritningarna</button></div></div>`;
  }
  // ---------- händelser ----------
  const svgPt = e => { const sv = ov.querySelector('.es-cv svg'); if (!sv) return null; const p = sv.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const r = p.matrixTransform(sv.getScreenCTM().inverse()); return { x: r.x / 100, y: r.y / 100 }; };
  const snap = v => Math.round(v * 100) / 100, clampA = a => { a.w = Math.max(.2, Math.min(R().W, a.w)); a.d = Math.max(.2, Math.min(R().D, a.d)); a.x = Math.max(0, Math.min(R().W - a.w, a.x)); a.y = Math.max(0, Math.min(R().D - a.d, a.y)); };
  const snapEdge = (v, lim) => { for (const t of [0, lim, ...o.areas.flatMap(b => [b.x, b.x + b.w, b.y, b.y + b.d])]) if (Math.abs(v - t) < .05) return t; return v; };
  const redraw = () => { const host = ov.querySelector('.es-cv'); if (!host) return; const t = document.createElement('div'); t.innerHTML = takSvg(o, R(), { sel: S.sel, interactive: true }); host.querySelector('svg').replaceWith(t.firstChild); };
  ov.addEventListener('pointerdown', e => {
    if (S.step !== 2 || !e.target.closest('.es-cv svg')) return; const q = svgPt(e); if (!q) return; const ars = e.target.closest('[data-ars]'), ar = e.target.closest('[data-area]'), sp = e.target.closest('[data-spot]');
    if (S.tool === 'spot') { if (sp) { o.spots = o.spots.filter(s => s.id !== sp.dataset.spot); return draw(); } if (areaAt(o.areas, q.x, q.y)) { o.spots.push({ id: aid(), x: snap(q.x), y: snap(q.y) }); return draw(); } say('Spotlights sitter i den sänkta delen – klicka i en orange yta'); return; }
    if (S.tool === 'rita') { const a = { id: aid(), x: snap(q.x), y: snap(q.y), w: .2, d: .2, drop: o.areas[0]?.drop ?? .15 }; o.areas.push(a); S.sel = a.id; S.drag = { kind: 'size', a, x0: a.x, y0: a.y }; e.preventDefault(); return; }
    if (ars) { const a = o.areas.find(x => x.id === ars.dataset.ars); S.drag = { kind: 'size', a, x0: a.x, y0: a.y }; e.preventDefault(); return; }
    if (ar) { const a = o.areas.find(x => x.id === ar.dataset.area); S.sel = a.id; S.drag = { kind: 'move', a, dx: q.x - a.x, dy: q.y - a.y, spots: o.spots.filter(s => areaAt([a], s.x, s.y)).map(s => [s, s.x - a.x, s.y - a.y]) }; draw(); e.preventDefault(); return; }
    S.sel = null; draw();
  });
  const onMove = e => { const d = S.drag; if (!d) return; const q = svgPt(e); if (!q) return; d.moved = true; const a = d.a;
    if (d.kind === 'move') { a.x = snapEdge(snap(q.x - d.dx), R().W - a.w); a.y = snapEdge(snap(q.y - d.dy), R().D - a.d); if (Math.abs(a.x + a.w - R().W) < .05) a.x = R().W - a.w; if (Math.abs(a.y + a.d - R().D) < .05) a.y = R().D - a.d; clampA(a); for (const [s, ox, oy] of d.spots) { s.x = +(a.x + ox).toFixed(3); s.y = +(a.y + oy).toFixed(3); } }
    else { a.w = snapEdge(snap(q.x), R().W) - d.x0; a.d = snapEdge(snap(q.y), R().D) - d.y0; if (a.w < 0) { a.x = d.x0 + a.w; a.w = -a.w; } else a.x = d.x0; if (a.d < 0) { a.y = d.y0 + a.d; a.d = -a.d; } else a.y = d.y0; clampA(a); }
    redraw(); };
  const onUp = () => { const d = S.drag; S.drag = null; if (!d) return; if (d.kind === 'size' && d.a.w * d.a.d < .05) { o.areas = o.areas.filter(x => x !== d.a); S.sel = null; } resp(); draw(); };
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  ov.addEventListener('click', e => {
    const b = e.target.closest('button,[data-tog]'); if (!b) return; const d = b.dataset, a = o.areas.find(x => x.id === S.sel);
    if ('close' in d) return cleanup();
    if (d.step) { S.step = +d.step; return draw(); }
    if ('done' in d) { cleanup(); onDone({ o, room: S.room }); return; }
    if (d.room !== undefined) { S.room = +d.room; o.areas = []; o.spots = []; return draw(); }
    if (d.form) { const drop = o.areas[0]?.drop ?? .15, big = [...(R().items || [])].filter(i => /säng|bord/i.test(i.name)).sort((p, q) => q.w * q.d - p.w * p.d)[0];
      o.areas = d.form === 'tom' ? [] : shapeAreas(d.form, R().W, R().D, { drop, side: 'A', over: big }); o.spots = autoSpots(o.areas, o.spacing); S.step = 2; S.tool = d.form === 'tom' ? 'rita' : 'flytta'; S.sel = null; return draw(); }
    if (d.dropall) { for (const x of o.areas) x.drop = +d.dropall; return draw(); }
    if (d.tool) { S.tool = d.tool; return draw(); }
    if (d.drop && a) { a.drop = +d.drop; return draw(); }
    if ('adel' in d && a) { o.areas = o.areas.filter(x => x !== a); S.sel = null; resp(); return draw(); }
    if (d.spacing) { o.spacing = +d.spacing; o.spots = autoSpots(o.areas, o.spacing); return draw(); }
    if ('autospots' in d) { o.spots = autoSpots(o.areas, o.spacing); return draw(); }
    if ('nospots' in d) { o.spots = []; return draw(); }
    if (d.tog === 'led') { o.led = !o.led; return draw(); }
    if (d.cc) { o.cc = +d.cc; return draw(); }
    if ('print' in d) return printPlans();
  });
  ov.addEventListener('change', e => { const t = e.target, a = o.areas.find(x => x.id === S.sel); if (!t.dataset.anum || !a) return; const v = parseFloat(t.value.replace(',', '.')) / 100; if (isFinite(v)) { a[t.dataset.anum] = v; clampA(a); resp(); } draw(); });
  function printPlans() {
    const L = takList(o, R().W, R().D), w = window.open('', '_blank'); if (!w) return say('Tillåt popup-fönster för att skriva ut');
    w.document.write(`<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>Sänkt tak – ${esc(R().name)}</title><style>body{font-family:system-ui,sans-serif;margin:24px;color:#111}h1{font-size:20px}h2{font-size:15px;margin-top:22px}svg{width:100%;max-height:420px;background:#fff}.es-svg *{}table{border-collapse:collapse;width:100%;font-size:13px}td{border-bottom:1px solid #ddd;padding:5px}</style></head><body>
      <h1>Sänkt tak · ${esc(R().name)} (${cm(R().W)} × ${cm(R().D)} cm, takhöjd ${cm(H())} → ${cm(minH())} cm)</h1>
      <h2>Regelplan · reglar 45×45, c/c ${cm(o.cc || .4)} cm</h2>${takSvg(o, R(), { mode: 'regel', cls: '' }).replace(/#20271f/g, '#f4f4f4').replace(/#9aa39a/g, '#333').replace(/#cfe3ff/g, '#123').replace(/#ffb27f/g, '#a24a12')}
      <h2>Belysningsplan · ${o.spots.length} spotlights${o.led ? ' + indirekt LED' : ''}</h2>${takSvg(o, R(), { mode: 'el', cls: '' }).replace(/#20271f/g, '#f4f4f4').replace(/#9aa39a/g, '#333').replace(/#ffb27f/g, '#a24a12')}
      <h2>Material</h2><table>${Object.values(L).flatMap(mp => [...mp]).map(([n, c]) => `<tr><td>${esc(n)}</td><td>${c} st</td></tr>`).join('')}</table>
      <p style="font-size:12px;color:#555">Fast elinstallation ska utföras av behörig elinstallatör. Kontrollera reglaravstånd och skruvavstånd mot skivtillverkarens anvisning.</p>
      <script>setTimeout(()=>print(),300)<\/script></body></html>`); w.document.close();
  }
  function cleanup() { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); ov.remove(); }
  draw();
}
