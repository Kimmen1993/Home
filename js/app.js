// Hemma – kopplar ihop ritning, 3D, panelerna och smarta hemmet.
import { flushSave, syncFromStorage, STORAGE_KEY, rawHome, addLevel, levelView, S, home, emit, on, load, save, commit, undo, redo, clearHistory, template, uid, movePoint, wallLen, nameOf, polyArea, roomAt, inPoly, makeItem, wallGap, insidePoint, trackProj, trackLen, panelS, migrate, splitWalls, mergeWalls, cleanWalls, wallSides, rebuildRooms, touchRooms } from './store.js?v=1794431659';
import { CATS, ITEMS, OPENINGS, PALETTE, FLOORS, WALLMATS, HOME_TYPES } from './catalog.js?v=1794431659';
import { createPlan } from './plan2d.js?v=1794431659';
import { createView } from './view3d.js?v=1794431659';
import { createHA } from './ha.js?v=1794431659';
import { detectPlan } from './autoplan.js?v=1794431659';
import { FURN, ELFA_SYS, elfaSys } from './furniture.js?v=1794431659';
import { furnKey, ensureFurn, syncF, furnObj } from './furnbridge.js?v=1794431659';
import { furnPanelHtml, bindFurnPanel } from './furnpanel.js?v=1794431659';
import { PRESETS, findPreset, FAMILIES } from './presets.js?v=1794431659';
import { arrange, arrangeAll, groupKind, setChairs, CHAIRS } from './groups.js?v=1794431659';
import { checkHome } from './check.js?v=1794431659';
import { openElfaStudio } from './elfastudio.js?v=1794431659';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let toastT = 0;
window.toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); };

load();
const ui = { trackDone(t) { const n = panelsForWindows(home(), t); window.toast(n ? `🛤️ Skena klar – ${n} gardiner hängdes vid fönstren` : '🛤️ Skena klar – lägg till gardiner i panelen'); }, toast: window.toast, ptSel() { renderRight(); }, rotated(it) { const r = right.querySelector('[data-rot]'), b = right.querySelector('[data-f=rot]'); if (r) r.value = Math.round(it.rot); if (b) b.value = Math.round(it.rot); }, toolDone() { if (!S.placing && (S.tool === 'add' || S.tool === 'room')) S.tool = 'select'; renderToolbar(); renderRight(); hint(); } };
const plan = createPlan($('#plan'), ui);
const view = createView($('#pane3d'), { device: onDevice, toast: window.toast, toolDone: ui.toolDone, levelChanged() { renderAll(); emit('full'); } });
const ha = createHA({ onState: haState, onStatus: (s, msg) => { renderSide(); if (msg) window.toast(msg); if (s === 'on') { window.toast('Ansluten till Home Assistant ✔'); renderRight(); } } });
let catTab = 'oppningar';

// ---------- händelser från datan ----------
let stateT = 0;
on((kind, id) => {
  // grupper: delarna följer med föräldern
  if (kind === 'item') { const h = home(), it = h.items.find(i => i.id === id); let ids = [];
    if (it?.g) ids = arrange(h, it); else if (it?.grp) { const p = h.items.find(i => i.id === it.grp); if (p) ids = arrange(h, p); }
    updateWarns(); plan.draw(); view.syncItem(id); ids.forEach(x => view.syncItem(x)); return; }
  if (kind !== 'state' && kind !== 'sel') { arrangeAll(home()); updateWarns(); }
  if (kind === 'state') { plan.draw(); view.states(); cancelAnimationFrame(stateT); stateT = requestAnimationFrame(() => { if (S.mode === 'styr') renderRight(); }); return; }
  if (kind === 'sel') { if (S.sel?.type !== 'room' || S.sel.id !== S.selPt?.room) S.selPt = null; plan.draw(); view.highlight(); renderRight();
    if (S.walls === 'rum' && S.sel?.type === 'room' && S.sel.id !== S.focus) { S.focus = S.sel.id; view.build(); } return; }
  plan.draw(); view.build();
  if (id !== 'panel' && id !== 'drag') renderRight();
  if (id !== 'drag') { renderSide(); renderLevels(); $('#homeName').value = home().name; }
});

// ---------- sidomeny ----------
function renderSide() {
  const h = home();
  $('#side').innerHTML = `
    <div class="logo">HEMMA</div><div class="sub">MINA HEM · KONTROLLRUM</div>
    <div class="sec">LÄGE</div>
    <div class="modes"><button class="mode ${S.mode === 'styr' ? 'on' : ''}" data-mode="styr"><b>🏠</b>Styr</button><button class="mode ${S.mode === 'bygg' ? 'on' : ''}" data-mode="bygg"><b>✏️</b>Bygg</button></div>
    <div class="sec">MINA HEM</div>
    ${S.homes.map(x => `<button class="nav ${x.id === h.id ? 'on' : ''}" data-home="${x.id}"><i>${HOME_TYPES[x.type]?.icon || '🏡'}</i><span>${esc(x.name)}</span><span class="x" data-del="${x.id}">✕</span></button>`).join('')}
    <button class="nav" data-new><i>＋</i>Nytt hem</button>
    <div class="sec hidem">KOPPLAT</div>
    <div class="sys hidem" data-ha>Home Assistant <span class="dot ${ha.status}"></span></div>
    <div class="note hidem" style="padding:0 10px 6px">Apple Home, Homey, Hue, IKEA, Sonos… kopplas in via Home Assistant.</div>
    <div class="sec hidem">FIL</div>
    <button class="small hidem" data-export>⬇ Spara som fil</button>
    <button class="small hidem" data-import>⬆ Öppna fil</button>`;
}
$('#side').addEventListener('click', e => {
  const t = e.target.closest('[data-mode],[data-home],[data-new],[data-ha],[data-export],[data-import],[data-del]'); if (!t) return;
  if (t.dataset.del) { e.stopPropagation(); if (S.homes.length < 2) return window.toast('Du behöver minst ett hem');
    const x = S.homes.find(h => h.id === t.dataset.del); if (confirm(`Ta bort "${x.name}"?`)) { S.homes = S.homes.filter(h => h !== x); if (S.cur === x.id) switchHome(S.homes[0].id); else emit('full'); } return; }
  if (t.dataset.mode) setMode(t.dataset.mode);
  else if (t.dataset.home) switchHome(t.dataset.home);
  else if (t.hasAttribute('data-new')) newHomeDialog();
  else if (t.hasAttribute('data-ha')) haDialog();
  else if (t.hasAttribute('data-export')) exportHome();
  else if (t.hasAttribute('data-import')) $('#fileJson').click();
});
function switchHome(id) { S.cur = id; S.level = null; S.sel = null; S.placing = null; clearHistory(); emit('full'); view.buildNow(); view.fitCam(); plan.fit(); }
function setMode(m) {
  S.inside = false; S.mode = m; S.sel = null; S.placing = null; S.tool = 'select'; plan.cancel();
  if (m === 'styr') { if (S.walls === 'hela') S.walls = 'halva'; S.day = false; } else { S.day = true; if (!S._seenBygg) S.view = innerWidth < 980 ? '2d' : 'split'; }
  S._seenBygg = S._seenBygg || m === 'bygg';
  renderAll(); view.build(); setTimeout(() => plan.fit(), 60);
}

// ---------- topp & verktyg ----------
$('#homeName').addEventListener('change', e => { commit(); home().name = e.target.value.trim() || 'Mitt hem'; emit('full'); });
function renderTop() {
  const h = home();
  $('#crumb').textContent = `HEMMA / ${(HOME_TYPES[h.type]?.name || 'Hus').toUpperCase()} / ${S.mode === 'styr' ? 'STYR' : 'BYGG'}`;
  $('#homeName').value = h.name;
  $('#topRight').innerHTML = `
    ${S.mode === 'bygg' ? `<div class="seg">${[['2d', '📐 2D'], ['split', '◫ Båda'], ['3d', '🧊 3D']].map(([k, l]) => `<button data-view="${k}" class="${S.view === k ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}
    ${(() => { const W = [['hela', '▮', 'Hela väggar'], ['halva', '▬', 'Halva väggar'], ['golv', '▁', 'Bara golv'], ['rum', '⬚', 'Ett rum']], i = Math.max(0, W.findIndex(x => x[0] === S.walls)), nx = W[(i + 1) % W.length];
      return `<button class="ib" data-walls="${nx[0]}" title="Klicka för: ${nx[2]}">${W[i][1]} ${W[i][2]}</button>`; })()}
    ${S.walls === 'hela' ? `<button class="ib ${S.ceil === true ? 'on' : ''}" data-ceil title="Innertak">🏠 Tak ${S.ceil === true ? 'på' : 'av'}</button>` : ''}
    <button class="ib ${S.inside ? 'on' : ''}" data-eye title="Stå i rummet i ögonhöjd">${S.inside ? '🚪 Gå ut' : '🧍 Gå in'}</button>
    <button class="ib" data-day>${S.day ? '☀️ Dag' : '🌙 Kväll'}</button>
    <button class="ib" data-cam title="Centrera">⤢</button>`;
  $('#stage').dataset.view = S.mode === 'styr' ? '3d' : S.view;
  requestAnimationFrame(() => { plan.resize(); view.resize(); });
}
$('#topRight').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.view) { S.view = t.dataset.view; renderTop(); requestAnimationFrame(() => plan.fit()); }
  if (t.dataset.walls) { S.walls = t.dataset.walls; if (S.walls === 'rum' && S.sel?.type === 'room') S.focus = S.sel.id;
    renderTop(); view.build(); if (S.walls === 'rum') window.toast('Välj ett annat rum: klicka på det i 2D-ritningen'); }
  if (t.hasAttribute('data-ceil')) { S.ceil = S.ceil !== true; renderTop(); view.build(); }
  if (t.hasAttribute('data-eye') && S.inside) { goOut(); return; }
  if (t.hasAttribute('data-eye')) { const h = home(), r = (S.sel?.type === 'room' && h.rooms.find(x => x.id === S.sel.id)) || h.rooms.find(x => x.id === S.focus) || [...h.rooms].filter(x => !x.outdoor).sort((a, b) => polyArea(b.pts) - polyArea(a.pts))[0];
    if (!r) return window.toast('Rita ett rum först'); S.prev = { walls: S.walls, ceil: S.ceil }; S.walls = 'hela'; S.ceil = true; if (S.mode === 'bygg' && S.view === '2d') S.view = 'split'; S.inside = true; renderTop(); view.buildNow(); view.eye(r);
    window.toast(`🧍 Du står i ${r.name} · dra = titta runt · högerklick-dra = gå · 🚪 Gå ut eller Esc = tillbaka`); }
  if (t.hasAttribute('data-day')) { S.day = !S.day; renderTop(); view.build(); }
  if (t.hasAttribute('data-cam')) { goOut(); plan.fit(); }
});
const TOOLS = [['select', '✋', 'Välj'], ['room', '⬜', 'Rum'], ['wall', '🧱', 'Vägg']];
const MORE = [['divider', '✂️', 'Dela ett rum'], ['bild', '🖼️', 'Planritning som bild']];
function renderToolbar() {
  if (S.mode !== 'bygg') { $('#toolbar').innerHTML = ''; return; }
  const cur = S.placing ? 'add' : S.tool;
  $('#toolbar').innerHTML = TOOLS.map(([k, i, l]) => `<button class="tool ${cur === k ? 'on' : ''}" data-tool="${k}">${i}<small>${l}</small></button>`).join('') +
    `<button class="tool add ${cur === 'add' ? 'on' : ''}" data-tool="add"><b>＋</b><small>Lägg till</small></button><span class="sep"></span>
    <button class="tool" data-undo title="Ångra (Ctrl+Z)">↶<small>Ångra</small></button><button class="tool" data-redo title="Gör om">↷<small>Gör om</small></button>
    <span class="moremenu"><button class="tool ${MORE.some(m => m[0] === cur) ? 'on' : ''}" data-moremenu>⋯<small>Mer</small></button>${S.moreOpen ? `<div class="menu">${MORE.map(([k, i, l]) => `<button data-tool="${k}">${i} ${l}</button>`).join('')}
      <button data-snap>🧲 Rutnät ${S.snap === false ? 'av – klicka för på' : 'på – klicka för av'}</button></div>` : ''}</span>`;
}
$('#toolbar').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if ('moremenu' in t.dataset) { S.moreOpen = !S.moreOpen; renderToolbar(); return; }
  S.moreOpen = false;
  if (t.hasAttribute('data-snap')) { S.snap = S.snap === false; renderToolbar(); window.toast(S.snap ? '🧲 Fäster mot rutnät' : '✏️ Fri ritning – rita i vilken vinkel du vill'); return; }
  if (t.hasAttribute('data-undo')) return undo();
  if (t.hasAttribute('data-redo')) return redo();
  setTool(t.dataset.tool);
});
function setTool(k) {
  S.tool = k; S.placing = null; S.sel = null; plan.cancel();
  if ((k === 'room' || k === 'wall' || k === 'divider' || k === 'track' || k === 'bild') && S.view === '3d') { S.view = 'split'; renderTop(); }
  if (k === 'bild' && !home().bg) $('#fileImg').click();
  renderToolbar(); renderRight(); hint(); emit('sel');
}
function hint() {
  const H = {
    select: '✋ Klicka = välj · dra en vald sak = flytta (i 3D) · dra tomt = snurra · R = vrid · Delete = ta bort',
    room: '⬜ Dra en rektangel i ritningen = nytt rum med väggar',
    wall: '🧱 Klicka punkt för punkt i ritningen · dubbelklicka eller Esc = klar',
    track: '🛤️ Klicka hörn för hörn där skenan ska gå (den lägger sig 12 cm ut från väggen) · dubbelklicka eller Esc = klar',
    divider: '✂️ Klicka från vägg till vägg för att dela ett rum · Alt eller 🧲 av = fritt · Esc = klar',
    add: '🛋️ Välj något i listan till höger',
    bild: '🖼️ Dra bilden på plats · kalibrera med ett mått du vet',
  };
  let t = S.mode === 'styr' ? '👆 Klicka på lampor, dörrar, gardiner och TV i huset · klicka på ett golv = rummets lampor'
    : S.placing ? (S.placing.kind === 'item' ? '👆 Klicka där den ska stå · Shift = flera · Alt = inte mot vägg' : '👆 Klicka på en vägg') : H[S.tool];
  $('#hint').textContent = t;
}
$('#zoom2d').addEventListener('click', e => { const z = e.target.dataset.z; if (!z) return; z === 'fit' ? plan.fit() : plan.zoom(+z); });

// ---------- högerpanel ----------
// ---------- rumskontroll ----------
const wpill = document.createElement('button'); wpill.className = 'wpill'; wpill.hidden = true; $('#stage').appendChild(wpill);
wpill.onclick = () => { S.sel = null; S.showWarns = true; emit('sel'); renderRight(); };
function updateWarns() { S.warns = S.mode === 'bygg' ? checkHome(home()) : []; const n = S.warns.length;
  wpill.hidden = S.mode !== 'bygg'; wpill.className = 'wpill ' + (n ? 'bad' : 'ok'); wpill.innerHTML = n ? `⚠️ ${n} ${n === 1 ? 'sak' : 'saker'} att kolla` : '✅ Rummen ser bra ut'; }
function warnPanel() {
  return `<h2>🔍 Kolla rummen</h2><p class="note">Sådant som är lätt att missa när man möblerar. Klicka för att se var.</p>
    ${S.warns.length ? S.warns.map(w => `<button class="warn" data-wsel="${w.id}"><b>${w.icon}</b><span>${esc(w.msg)}</span></button>`).join('') : '<div class="tips"><div><b>✅</b>Inga problem hittades – dörrar går fria, det finns plats bakom stolarna och vid sängarna.</div></div>'}
    <p class="note" style="margin-top:12px">Riktvärden: 75 cm bakom matstolar · 50–60 cm vid sängens sidor · 60–90 cm för att gå förbi.</p>`;
}
$('#right').addEventListener('click', e => { const b = e.target.closest('[data-wsel]'); if (!b) return; S.showWarns = false; S.sel = { type: 'item', id: b.dataset.wsel }; emit('sel'); });
function renderRight() {
  const el = $('#right'); if (S.showWarns && !S.sel && S.mode === 'bygg' && !S.placing && S.tool === 'select') { el.innerHTML = warnPanel(); return; } if (S.sel) S.showWarns = false; if (S.sel?.type !== 'item') { const sb = document.querySelector('.selbar'); if (sb) sb.hidden = true; }
  if (S.mode === 'styr') { el.innerHTML = controlPanel(); return; }
  if (S.tool === 'bild') { el.innerHTML = bgPanel(); return; }
  if (S.tool === 'add' || S.placing) { el.innerHTML = catalogPanel(); return; }
  const h = home(), s = S.sel;
  if (s?.type === 'item') { const it = h.items.find(i => i.id === s.id); if (it) { el.innerHTML = it.type === 'skena' ? trackPanel(it) : itemPanel(it); fillEnts(); return; } }
  if (s?.type === 'opening') { const o = h.openings.find(i => i.id === s.id); if (o) { el.innerHTML = openingPanel(o); fillEnts(); return; } }
  if (s?.type === 'wall') { const w = h.walls.find(i => i.id === s.id); if (w) { el.innerHTML = wallPanel(w); return; } }
  if (s?.type === 'room') { const r = h.rooms.find(i => i.id === s.id); if (r) { el.innerHTML = roomPanel(r); return; } }
  el.innerHTML = homePanel();
}
function fillEnts() { $('#ents').innerHTML = ha.entities().map(e => `<option value="${e}">${esc(ha.state(e)?.attributes?.friendly_name || '')}</option>`).join(''); }
const cm = v => Math.round(v * 100);
const field = (label, f, val, type = 'cm') => `<label class="f">${label}<input data-f="${f}" data-u="${type}" value="${type === 'cm' ? cm(val) : esc(val)}" ${type === 'cm' || type === 'num' ? 'inputmode="decimal"' : ''}></label>`;
const swatches = (f, cur) => `<div class="sws">${PALETTE.map(c => `<button class="swc ${c === cur ? 'on' : ''}" style="background:${c}" data-color="${c}" data-f="${f}"></button>`).join('')}<input type="color" data-f="${f}" data-u="color" value="${cur || '#ffffff'}"></div>`;
const HANDLES = [['#9aa0a6', 'Stål'], ['#1f2328', 'Svart'], ['#c9a227', 'Mässing'], ['#b87333', 'Koppar'], ['#ffffff', 'Vit']];
const HANDLE_TYPES = ['underskap', 'diskho', 'spis', 'overskap', 'hogskap', 'kyl', 'koksoe', 'garderob', 'nattduks'];
const handles = cur => `<label class="f">Handtag</label><div class="sws">${HANDLES.map(([c, n]) => `<button class="swc ${c === (cur || '#9aa0a6') ? 'on' : ''}" title="${n}" style="background:${c}" data-color="${c}" data-f="handleColor"></button>`).join('')}</div>`;
const opt = (f, cur, list) => `<div class="opt">${list.map(([v, l]) => `<button data-opt="${f}" data-v="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;

// inköpslista: alla riktiga produkter i hemmet, med färg
function shopList(h) {
  const rows = new Map();
  for (const it of h.items) { if (!it.family || !furnKey(it)) continue; const fam = FAMILIES[it.family]; let col = '';
    if (fam) { const k0 = Object.keys(fam.choices[0].m)[0], c = fam.choices.find(c => (!c.when || c.when(it.o)) && Object.entries(c.m).every(([k, v]) => it.m[k]?.color === v.color && it.m[k]?.mat === v.mat)); col = c ? c.name : ''; void k0; }
    const key = `${it.name || it.family}${col ? ' – ' + col : ''}`; rows.set(key, (rows.get(key) || 0) + 1); }
  if (!rows.size) return '';
  const txt = [...rows].map(([k, n]) => `${n} × ${k}`).join('\n');
  return `<h3>🛒 INKÖPSLISTA</h3><div class="shop">${[...rows].map(([k, n]) => `<div class="row"><div class="l"><span>${esc(k)}</span></div><b>${n} st</b></div>`).join('')}</div>
    <div class="btns" style="margin-bottom:10px"><button class="btn" data-copy="${esc(txt)}">📋 Kopiera listan</button></div>`;
}
function homePanel() {
  const h = home();
  return `<h2>${HOME_TYPES[h.type]?.icon || '🏡'} ${esc(h.name)}</h2>
    <div class="tips">
      <div><b>⬜</b>Rita rum: välj Rum och dra en ruta</div>
      <div><b>🛋️</b>Lägg till: dörrar, fönster, kök, möbler, lampor</div>
      <div><b>✋</b>Klicka på något för att ändra mått och färg</div>
      <div><b>🖼️</b>Har du en planritning? Lägg in den som bild och rita ovanpå</div>
    </div>
    ${h.bg ? `<h3>RITNINGSBILDEN</h3><div class="btns"><button class="btn ${h.bg.hidden ? '' : 'acc'}" data-act="bgtoggle">${h.bg.hidden ? '👁 Visa bilden' : '✔ Nöjd – göm bilden'}</button><button class="btn danger" data-act="bgdel">🗑 Ta bort</button></div>` : ''}
    <h3>VÅNING</h3>
    <div class="g2"><label class="f">Namn<input data-f="level.name" data-u="text" value="${esc(h.__level.name)}"></label><label class="f">Golvhöjd över mark (cm)<input data-f="level.z" data-u="cm" value="${cm(h.__level.z || 0)}"></label></div>
    ${h.__raw.levels.length > 1 ? '<div class="btns"><button class="btn danger" data-act="dellevel">🗑 Ta bort våningen</button></div>' : ''}
    <h3>HEMMET</h3>
    <label class="f">Typ</label>${opt('home.type', h.type, Object.entries(HOME_TYPES).map(([k, v]) => [k, v.icon + ' ' + v.name]))}
    <div style="height:10px"></div>
    <label class="f">Takhöjd (cm)<input data-f="home.ceiling" data-u="cm" value="${cm(h.ceiling)}"></label>
    <div class="btns" style="margin-bottom:10px"><button class="btn" data-act="cleanwalls" title="Slår ihop raka väggbitar och tar bort småbitar från planritningen">🧹 Städa väggar</button></div>
    ${(h.ignore || []).length + h.rooms.filter(r => r.hidden).length ? `<div class="btns" style="margin-bottom:10px"><button class="btn" data-act="unignore">↩ Visa ${(h.ignore || []).length + h.rooms.filter(r => r.hidden).length} borttagna rum igen</button></div>` : ''}
    <label class="f">Rummen följer väggarna</label>${opt('home.autoRooms', h.autoRooms === false ? 'nej' : 'ja', [['ja', '🔄 Automatiskt'], ['nej', '✋ Manuellt']])}<div style="height:8px"></div>
    ${shopList(h)}
    <div class="note">${h.rooms.filter(r => !r.outdoor && !r.hidden).length} rum · ${h.rooms.filter(r => !r.outdoor && !r.hidden).reduce((s, r) => s + polyArea(r.pts), 0).toFixed(0)} m² · ${h.items.length} saker</div>`;
}
// katalogens sak för en möbeltyp (för riktiga produkter ur sökningen)
const itemKeyFor = (k, p) => k === 'sang' ? (p?.o?.storlek <= 120 ? 'sang90' : 'sang') : k === 'kok' ? 'koksrad' : Object.keys(ITEMS).find(x => ITEMS[x].furn === k) || null;
let searchQ = '';
function searchResults() { const list = findPreset(searchQ).filter(p => itemKeyFor(p.type, p)); right._sres = list;
  return list.length ? `<div class="sres">${list.map((p, i) => `<button data-sres="${i}"><b>${FURN[p.type].icon}</b><span>${esc(p.label)}<em>${esc(p.dims || '')}</em></span></button>`).join('')}</div>` : searchQ.length > 1 ? '<p class="note">Hittade inget. Prova t.ex. "rossi", "billy 80", "elfa", "malm 160".</p>' : ''; }
function catalogPanel() {
  const list = catTab === 'oppningar' ? Object.entries(OPENINGS).map(([k, v]) => ['opening', k, v]) : Object.entries(ITEMS).filter(([, v]) => v.cat === catTab).map(([k, v]) => ['item', k, v]);
  return `<h2>🛋️ Lägg till</h2>
    <input class="search" data-search placeholder="🔍 Sök möbel, t.ex. rossi, billy 80, elfa" value="${esc(searchQ)}" autocomplete="off">
    <div data-sresbox>${searchResults()}</div>
    <div class="chips">${CATS.map(([k, n, i]) => `<button class="chip ${catTab === k ? 'on' : ''}" data-cat="${k}">${i} ${n}</button>`).join('')}</div>
    <div class="grid">${list.map(([kind, k, v]) => `<button class="cat ${S.placing?.key === k ? 'on' : ''}" data-place="${kind}:${k}"><b>${v.icon}</b>${v.name}</button>`).join('')}</div>
    <p class="note">Välj, klicka sedan i ritningen eller i 3D. Skåp, sängar, TV m.m. lägger sig automatiskt mot väggen.</p>`;
}
// smarta grupper i panelen: stolar runt bordet, sängbord, soffgrupp
function groupPanel(it) {
  const h = home(), k = groupKind(it), g = it.g || {};
  if (it.grp) { const p = h.items.find(i => i.id === it.grp); if (!p) return '';
    return `<div class="grp"><span>🔗 Hör till <b>${esc(p.family || p.name || ITEMS[p.type].name)}</b>. Den flyttar sig själv med gruppen.</span><div class="btns"><button class="btn" data-gsel="${p.id}">Välj hela gruppen</button><button class="btn" data-gfree>Lös från gruppen</button></div></div>`; }
  if (k === 'stolar') { const round = it.o?.form === 'rund' && !(it.o.utdragen && it.o.ilagg), cap = it.o?.stolar || 4;
    return `<div class="grp"><h4>🪑 Stolar runt bordet</h4><div class="cnt"><button data-g="n:-1">−</button><b>${g.n || 0}</b><button data-g="n:1">＋</button><span>${g.n > cap ? `⚠️ Trångt – ${cap} får plats bekvämt` : `Plats för ${cap}`}</span></div>
      ${g.n && !round ? `<div class="opt">${[['runt', 'Jämnt runt'], ['lang', 'Långsidorna'], ['en', 'En sida']].map(([v, l]) => `<button data-g="mode:${v}" class="${(g.mode || 'runt') === v ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}
      ${g.n ? `<div class="opt" style="margin-top:6px">${CHAIRS.map(([v, l]) => `<button data-g="chair:${v}" class="${(g.chair || CHAIRS[0][0]) === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>` : ''}</div>`; }
  if (k === 'sangbord') return `<div class="grp"><h4>🛏️ Sängbord</h4><div class="opt">${[[0, 'Inga'], [1, 'Ett'], [2, 'Två']].map(([v, l]) => `<button data-g="n:=${v}" class="${(g.n || 0) === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
  if (k === 'soffgrupp') return `<div class="grp"><h4>🛋️ Soffgrupp</h4><div class="opt"><button data-g="bord:t" class="${g.bord ? 'on' : ''}">▭ Soffbord framför</button><button data-g="matta:t" class="${g.matta ? 'on' : ''}">🟫 Matta under</button></div></div>`;
  return '';
}
function itemPanel(it) {
  const c = ITEMS[it.type];
  if (furnKey(it)) { ensureFurn(it); const f = furnObj(it);
    return `<h2>${c.icon} ${esc(it.family || it.name || c.name)}</h2>
    <div class="btns"><button class="btn" data-act="rot-90" title="Vrid">⟲</button><button class="btn" data-act="rot90" title="Vrid">⟳</button><button class="btn" data-act="dup">⧉ Kopiera</button><button class="btn danger" data-act="del">🗑</button></div>
    ${groupPanel(it)}
    ${furnPanelHtml(f, { more: right._more })}
    ${c.dev ? `<h3>SMART ENHET</h3>
      <label class="f">Koppling i Home Assistant<input data-f="entity" data-u="text" list="ents" value="${esc(it.entity)}" placeholder="${c.dev === 'light' ? 'light.vardagsrum' : 'media_player.tv'}"></label>
      <div class="btns"><button class="btn acc" data-act="test">${it.state?.on ? 'Släck / stäng av' : 'Tänd / sätt på'}</button></div>` : ''}`; }
  return `<h2>${c.icon} ${esc(c.name)}</h2>
    ${field('Namn (valfritt)', 'name', it.name, 'text')}
    <div class="g2">${field('Bredd (cm)', 'w', it.w)}${field('Djup (cm)', 'd', it.d)}${field('Höjd (cm)', 'h', it.h)}${field('Över golvet (cm)', 'elev', it.elev)}</div>
    <label class="f">Vinkel</label>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><input type="range" min="0" max="359" value="${Math.round(it.rot)}" data-rot style="flex:1"><input data-f="rot" data-u="deg" value="${Math.round(it.rot)}" inputmode="decimal" style="width:64px"><span class="note">°</span></div>
    <div class="btns" style="margin-bottom:10px"><button class="btn" data-act="rot-90">⟲ 90°</button><button class="btn" data-act="rot-15">⟲ 15°</button><button class="btn" data-act="rot15">⟳ 15°</button><button class="btn" data-act="rot90">⟳ 90°</button></div>
    <label class="f">${c.c1 || 'Färg'}</label>${swatches('color', it.color)}
    ${c.c2 ? `<label class="f">${c.c2}</label>${swatches('color2', it.color2)}` : ''}
    ${HANDLE_TYPES.includes(it.type) ? handles(it.handleColor) : ''}
    ${it.type === 'gardin' ? `<h3>GARDIN</h3>
      <label class="f">Längder</label>${opt('cstyle', it.cstyle || 'dubbel', [['dubbel', '▌▐ Två'], ['mitten', '◫ Mot mitten'], ['vanster', '▌ Vänster'], ['hoger', '▐ Höger']])}
      <label class="f" style="margin-top:8px">Tyg</label>${opt('fabric', it.fabric || 'tjock', [['tjock', 'Tjockt'], ['tunn', 'Tunt'], ['mork', 'Mörkläggning']])}
      <label class="f" style="margin-top:8px">Mönster</label>${opt('pattern', it.pattern || 'enfargad', [['enfargad', 'Enfärgat'], ['rand', 'Randigt'], ['rutig', 'Rutigt']])}
      <label class="f" style="margin-top:8px">Veck</label>${opt('folds', it.folds || 'veck', [['raka', 'Raka'], ['veck', 'Veckade'], ['wave', 'Wave']])}
      <label class="f" style="margin-top:8px">Upphängning</label>${opt('rod', it.rod || 'stang', [['stang', 'Stång'], ['skena', 'Skena'], ['tak', 'Takskena'], ['dold', 'Dold']])}
      <label class="f" style="margin-top:8px">Avstånd från väggen (cm)<input data-f="gap" data-u="cm" value="${cm(it.gap ?? it.d / 2)}"></label>${it.rod === 'tak' ? '<p class="note">Takskena: gardinen går automatiskt från taket ner till golvet.</p>' : ''}
      <label class="f" style="margin-top:8px">Fördragna: ${Math.round(curtainPos(it) * 100)}%<input type="range" min="0" max="100" value="${Math.round(curtainPos(it) * 100)}" data-cpos="${it.id}"></label>` : ''}
    ${c.dev ? `<h3>SMART ENHET</h3>
      <label class="f">Koppling i Home Assistant<input data-f="entity" data-u="text" list="ents" value="${esc(it.entity)}" placeholder="${c.dev === 'light' ? 'light.vardagsrum' : c.dev === 'curtain' ? 'cover.gardiner (valfritt)' : 'media_player.tv'}"></label>
      <div class="btns"><button class="btn acc" data-act="test">${c.dev === 'curtain' ? (it.state?.on ? 'Dra ifrån' : 'Dra för') : it.state?.on ? 'Släck / stäng av' : 'Tänd / sätt på'}</button></div>
      ${c.dev === 'light' && it.state?.on ? `<label class="f" style="margin-top:8px">Ljusstyrka<input type="range" min="5" max="100" value="${Math.round((it.state.bri ?? .8) * 100)}" data-bri="${it.id}"></label>` : ''}` : ''}
    <div class="btns" style="margin-top:14px"><button class="btn" data-act="dup">⧉ Kopiera</button><button class="btn danger" data-act="del">🗑 Ta bort</button></div>`;
}
// ---------- gardinskena ----------
function windowsNear(h, it) { return h.openings.filter(o => o.kind === 'window' || o.glass).map(o => { const w = h.walls.find(x => x.id === o.wall); if (!w) return null;
  const L = wallLen(w), c = { x: w.a.x + (w.b.x - w.a.x) / L * o.t, y: w.a.y + (w.b.y - w.a.y) / L * o.t }, pr = trackProj(it.pts, c); return pr.d < .6 ? { o, s: pr.s } : null; }).filter(Boolean); }
function newPanel(extra) { return { id: uid(), s: 1, w: 1.6, cstyle: 'dubbel', pos: 0, color: '#d8cfc0', fabric: 'tjock', pattern: 'enfargad', folds: 'veck', window: null, entity: '', ...extra }; }
function panelsForWindows(h, it) { let n = 0; it.panels = it.panels || [];
  for (const { o, s } of windowsNear(h, it)) { if (it.panels.some(p => p.window === o.id)) continue; it.panels.push(newPanel({ s, w: Math.round((o.w + .5) * 100) / 100, window: o.id })); n++; }
  emit('full'); return n; }
function trackPanel(it) {
  const h = home(), wins = windowsNear(h, it), P = (it.panels || []).find(p => p.id === S.panelSel);
  const winName = p => { const o = h.openings.find(x => x.id === p.window); return o ? nameOf(h, o) : null; };
  return `<h2>🛤️ Gardinskena</h2>
    <div class="note">${(trackLen(it.pts) ).toFixed(2).replace('.', ',')} m · ${(it.panels || []).length} gardiner · ${wins.length} fönster längs skenan</div>
    <label class="f" style="margin-top:8px">Färg på skenan</label>${swatches('color', it.color)}
    <div class="btns"><button class="btn acc" data-act="pwin">＋ Gardin vid varje fönster</button><button class="btn" data-act="padd">＋ Lägg till gardin</button></div>
    <h3>GARDINER PÅ SKENAN</h3>
    ${(it.panels || []).map((p, i) => `<div class="row" data-psel="${p.id}" style="${p.id === S.panelSel ? 'color:#fff' : ''}"><div class="l"><span>${p.id === S.panelSel ? '▾' : '▸'} ${esc(p.name || winName(p) || 'Gardin ' + (i + 1))}</span><em>${Math.round(p.w * 100)} cm · ${Math.round((p.pos || 0) * 100)}% fördragen</em></div><span class="swc" style="background:${p.color};width:16px;height:16px"></span></div>
      ${p.id === S.panelSel ? panelEditor(p, wins, h) : ''}`).join('') || '<p class="note">Inga gardiner än.</p>'}
    <div class="btns" style="margin-top:14px"><button class="btn danger" data-act="del">🗑 Ta bort skenan</button></div>`;
}
const popt = (f, cur, list) => `<div class="opt">${list.map(([v, l]) => `<button data-popt="${f}" data-v="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
function panelEditor(p, wins, h) {
  return `<div class="card" style="margin:6px 0 10px">
    <label class="f">Namn<input data-pf="name" value="${esc(p.name || '')}" placeholder="t.ex. Gardin vid soffan"></label>
    <label class="f">Hör till fönster<select data-pf="window"><option value="">– inget –</option>${wins.map(({ o }) => `<option value="${o.id}" ${o.id === p.window ? 'selected' : ''}>${esc(nameOf(h, o))} (${Math.round(o.w * 100)} cm)</option>`).join('')}</select></label>
    ${p.window ? `<label class="f">Placering vid fönstret</label>${popt('anchor', p.anchor || 'center', [['left', '◧ Vänster om'], ['center', '▣ Mitt för'], ['right', 'Höger om ◨']])}<div style="height:6px"></div>` : '<p class="note">Fri placering – dra gardinen längs skenan i 2D-ritningen.</p>'}
    <div class="g2"><label class="f">Bredd (cm)<input data-pf="w" data-u="cm" value="${Math.round(p.w * 100)}"></label>${p.window ? '' : `<label class="f">Läge längs skenan (cm)<input data-pf="s" data-u="cm" value="${Math.round(p.s * 100)}"></label>`}</div>
    ${p.cstyle === 'dubbel' || p.cstyle === 'mitten' || !p.cstyle ? `<label class="f">Paret</label>${popt('split', p.split ? '1' : '', [['', '🔗 Ihop'], ['1', '✂️ Frikopplade']])}
      ${p.split ? `<div class="g2" style="margin-top:6px"><label class="f">Vänster längd: flytta ut (cm)<input data-pf="offL" data-u="cm" value="${Math.round((p.offL || 0) * 100)}"></label><label class="f">Höger längd: flytta ut (cm)<input data-pf="offR" data-u="cm" value="${Math.round((p.offR || 0) * 100)}"></label></div><p class="note">Dra en längd i 2D för att flytta bara den. Minus = närmare mitten.</p>` : ''}<div style="height:6px"></div>` : ''}
    <label class="f">Längder</label>${popt('cstyle', p.cstyle, [['dubbel', '▌▐ Två'], ['mitten', '◫ Mot mitten'], ['vanster', '▌ Vänster'], ['hoger', '▐ Höger']])}
    <label class="f" style="margin-top:6px">Tyg</label>${popt('fabric', p.fabric, [['tjock', 'Tjockt'], ['tunn', 'Tunt'], ['mork', 'Mörkläggning']])}
    <label class="f" style="margin-top:6px">Mönster</label>${popt('pattern', p.pattern, [['enfargad', 'Enfärgat'], ['rand', 'Randigt'], ['rutig', 'Rutigt']])}
    <label class="f" style="margin-top:6px">Veck</label>${popt('folds', p.folds, [['raka', 'Raka'], ['veck', 'Veckade'], ['wave', 'Wave']])}
    <div class="sws" style="margin-top:8px">${PALETTE.map(c => `<button class="swc ${c === p.color ? 'on' : ''}" style="background:${c}" data-pcolor="${c}"></button>`).join('')}<input type="color" data-pf="color" value="${p.color}"></div>
    <label class="f">Fördragen: ${Math.round((p.pos || 0) * 100)}%<input type="range" min="0" max="100" value="${Math.round((p.pos || 0) * 100)}" data-ppos="${p.id}"></label>
    <label class="f">Koppling (motor, valfritt)<input data-pf="entity" list="ents" value="${esc(p.entity || '')}" placeholder="cover.gardin_vardagsrum"></label>
    <div class="btns"><button class="btn" data-act="pdup">⧉ Kopiera</button><button class="btn danger" data-act="pdel">✕ Ta bort gardin</button></div></div>`;
}
function panelSet(it, p, v) { if (linked(p.entity)) ha.call('cover', 'set_cover_position', { entity_id: p.entity, position: Math.round((1 - v) * 100) }); p.pos = v; emit('state'); }
function openingPanel(o) {
  const c = OPENINGS[o.key];
  return `<h2>${c.icon} ${esc(c.name)}</h2>
    ${field('Namn (valfritt)', 'name', o.name, 'text')}
    <div class="g2">${field('Bredd (cm)', 'w', o.w)}${field('Höjd (cm)', 'h', o.h)}${o.kind === 'window' ? field('Bröstning (cm)', 'sill', o.sill) : ''}${o.kind !== 'hole' ? `<label class="f">Karmdjup (cm)<input data-f="depth" data-u="cm" value="${o.depth ? cm(o.depth) : ''}" placeholder="auto (${cm((home().walls.find(w => w.id === o.wall) || { t: .15 }).t)})"></label>` : ''}</div>
    ${o.kind === 'door' ? `<label class="f">Gångjärn</label>${opt('hinge', o.hinge, [['L', '◧ Vänster'], ['R', 'Höger ◨']])}<div class="btns" style="margin:8px 0 10px"><button class="btn" data-act="swing">⇅ Öppnas åt andra hållet</button></div>` : ''}
    ${o.kind !== 'hole' ? `<label class="f">Färg</label>${swatches('color', o.color)}` : ''}
    ${o.kind === 'door' && !o.glass ? `<label class="f">Material</label>${opt('mat', o.mat || 'malad', [['malad', 'Målad'], ['tra', 'Trä']])}<div style="height:8px"></div>` : ''}
    ${o.kind === 'door' ? handles(o.handleColor) : ''}
    ${o.kind === 'window' ? `<h3>FÖNSTER</h3><label class="f">Öppnas som</label>${opt('openType', o.openType || 'sido', [['sido', '🚪 Sido'], ['sving', '🔄 Sväng'], ['tipp', '↘ Tipp'], ['fast', '▫ Fast']])}
      <label class="f" style="margin-top:8px">Indelning</label>${opt('panes', String(o.panes || (o.w > 1 ? 2 : 1)), [['1', '▯ Ett'], ['2', '▯▯ Två'], ['3', '▯▯▯ Tre']])}
      <label class="f" style="margin-top:8px">Spröjs</label>${opt('grid', o.grid || 'none', [['none', 'Inga'], ['kors', '✚ Kors'], ['sprojs', '▦ Spröjs']])}
      <label class="f" style="margin-top:8px">Överljus</label>${opt('transom', o.transom ? '1' : '', [['', 'Nej'], ['1', 'Ja']])}` : ''}
    ${o.kind === 'window' || o.glass ? `<h3>GARDIN</h3>${opt('blind', o.blind, [['none', 'Ingen'], ['rullgardin', 'Rullgardin'], ['persienn', 'Persienn']])}
      ${o.blind !== 'none' && o.kind === 'window' ? `<div style="height:8px"></div><label class="f">Montering</label>${opt('blindMount', o.blindMount || 'nisch', [['nisch', 'I nischen'], ['mellan', 'Mellan glasen'], ['vagg', 'Utanpå väggen']])}` : ''}
      ${o.blind !== 'none' ? `<div style="height:8px"></div><label class="f">Gardinfärg</label>${swatches('blindColor', o.blindColor)}
      <label class="f">Nere: ${Math.round(o.state.blind * 100)}%<input type="range" min="0" max="100" value="${Math.round(o.state.blind * 100)}" data-blind="${o.id}"></label>
      <label class="f">Koppling gardin (cover)<input data-f="blindEntity" data-u="text" list="ents" value="${esc(o.blindEntity)}" placeholder="cover.sovrum"></label>` : ''}` : ''}
    ${o.kind !== 'hole' ? `<h3>${o.kind === 'garage' ? 'PORTÖPPNARE' : 'BRYTARE (ÖPPEN/STÄNGD)'}</h3>
      <label class="f">Koppling i Home Assistant<input data-f="entity" data-u="text" list="ents" value="${esc(o.entity)}" placeholder="${o.kind === 'garage' ? 'cover.garageport' : 'binary_sensor.ytterdorr'}"></label>
      <div class="btns"><button class="btn acc" data-act="testdoor">${o.state.open > .5 ? 'Stäng' : 'Öppna'} (test)</button>${o.blind && o.blind !== 'none' ? `<button class="btn" data-dev="blind:${o.id}">${o.state.blind > .5 ? 'Gardin upp' : 'Gardin ner'}</button>` : ''}</div>` : ''}
    <div class="btns" style="margin-top:14px"><button class="btn danger" data-act="del">🗑 Ta bort</button></div>`;
}
function wallPanel(w) {
  if (w.virtual) return `<h2>✂️ Rumsgräns</h2><p class="note">En osynlig gräns som delar golvet i två rum. Syns inte i 3D.</p>${field('Längd (cm)', 'len', wallLen(w))}<div class="btns"><button class="btn danger" data-act="del">🗑 Ta bort gräns</button></div>`;
  return `<h2>🧱 Vägg</h2>
    ${(() => { const gs = [1, -1].map(sd => ({ sd, g: wallGap(home(), w, sd) })).filter(x => x.g); return gs.length ? `<h3>↔ MÅTT TILL MOTSATT VÄGG</h3>
      ${gs.map(({ sd, g }) => `<label class="f">Mot ${esc(g.room ? g.room.name : 'nästa vägg')} (invändigt, cm)<input data-gap="${sd}" inputmode="decimal" value="${Math.round(g.inner * 100)}"></label>`).join('')}
      <p class="note" style="margin-top:-4px">Skriv det du mäter med måttband – väggen flyttas, fönster/dörrar följer med.</p>` : ''; })()}
    <div class="g2">${field('Längd (cm)', 'len', wallLen(w))}${field('Tjocklek (cm)', 't', w.t)}${field('Höjd (cm)', 'h', w.h)}</div>
    ${(() => { const sd = wallSides(home(), w); return `
    <h3>SIDA MOT ${esc((sd.P ? sd.P.name : 'utsidan').toUpperCase())}</h3>${opt('matP', w.matP || 'malad', Object.entries(WALLMATS).slice(0, 3))}${opt('matP', w.matP || 'malad', Object.entries(WALLMATS).slice(3))}${swatches('colorP', w.colorP || w.color)}
    <h3>SIDA MOT ${esc((sd.N ? sd.N.name : 'utsidan').toUpperCase())}</h3>${opt('matN', w.matN || 'malad', Object.entries(WALLMATS).slice(0, 3))}${opt('matN', w.matN || 'malad', Object.entries(WALLMATS).slice(3))}${swatches('colorN', w.colorN || w.color)}`; })()}
    <div class="btns" style="margin-bottom:10px"><button class="btn" data-act="sameboth">Samma färg på båda sidor</button></div>
    <p class="note">Dra väggen för att flytta den rakt ut/in – väggarna runt hörnen följer med så att hörnen håller. Dra en vit prick för att flytta bara den änden. Håll Alt för att flytta fritt.</p>
    <div class="btns"><button class="btn danger" data-act="del">🗑 Ta bort vägg</button></div>`;
}
function roomPanel(r) {
  return `<h2>⬜ Rum</h2>
    ${field('Namn', 'name', r.name, 'text')}
    <label class="f">Typ</label>${opt('outdoor', r.outdoor ? '1' : '', [['', '🛋️ Inne'], ['1', '🌤️ Ute']])}<div style="height:8px"></div>
    <h3>GOLV</h3>${opt('style', r.style || 'tra', Object.entries(FLOORS).slice(0, 4))}${opt('style', r.style || 'tra', Object.entries(FLOORS).slice(4))}
    <label class="f" style="margin-top:8px">Riktning</label>${opt('floorRot', String(r.floorRot || 0), [['0', '↔ Längs'], ['90', '↕ Tvärs'], ['45', '⤢ Diagonalt']])}
    <div style="height:8px"></div>${swatches('floor', r.floor)}
    <h3>ALLA VÄGGAR I RUMMET</h3>${opt('roomwallmat', '', Object.entries(WALLMATS).slice(0, 3))}${opt('roomwallmat', '', Object.entries(WALLMATS).slice(3))}${swatches('roomwalls', null)}
    ${r.outdoor ? '' : `<h3>TAK</h3>${swatches('ceilColor', r.ceilColor || '#f4f2ee')}`}
    <div class="note">${polyArea(r.pts).toFixed(1).replace('.', ',')} m²</div>
    <p class="note">Ändra formen i 2D: dra de vita hörnen · dra ett <b>+</b> för nytt hörn · klicka ett hörn och tryck Delete för att ta bort det${r.outdoor ? ' · dra ytan för att flytta den' : ''}.</p>
    <div class="btns">${S.selPt?.room === r.id ? '<button class="btn" data-act="delpt">✕ Ta bort markerad punkt</button>' : ''}<button class="btn danger" data-act="del">🗑 Ta bort rum</button></div>`;
}
function bgPanel() {
  const b = home().bg;
  return `<h2>🖼️ Bild att rita på</h2>
    <div class="steps"><div><b>1</b>Lägg in en planritning</div><div><b>2</b>✨ Väggar, dörrar, fönster och rum skapas automatiskt</div><div><b>3</b>Skriv bostadens storlek (m²) så blir måtten rätt</div><div><b>4</b>Rätta det som blev fel – klicka och ändra</div></div>
    <div class="btns"><button class="btn ${b ? '' : 'acc'}" data-act="bgnew">${b ? 'Byt bild' : 'Välj bild'}</button>${b ? '<button class="btn" data-act="calib">📏 Kalibrera</button>' : ''}</div>
    ${b ? '<div class="btns"><button class="btn acc" data-act="auto">✨ Gör om till ritning automatiskt</button></div>' : ''}
    ${b ? `<div class="btns"><button class="btn" data-act="bgtoggle">${b.hidden ? '👁 Visa bilden' : '✔ Göm bilden'}</button></div>
      <label class="f" style="margin-top:12px">Synlighet<input type="range" min="10" max="100" value="${Math.round((b.opacity ?? .5) * 100)}" data-bgop></label>
      <div class="btns"><button class="btn danger" data-act="bgdel">Ta bort bild</button></div>` : ''}
    <p class="note" style="margin-top:12px">Fungerar bäst med tydliga ritningar: svarta väggar på vit bakgrund, som från mäklare.</p>`;
}

// ---------- styrpanel ----------
function controlPanel() {
  const h = home();
  const lights = h.items.filter(i => ITEMS[i.type].dev === 'light'), media = h.items.filter(i => ['tv', 'speaker'].includes(ITEMS[i.type].dev));
  const doors = h.openings.filter(o => o.kind === 'door' || o.kind === 'garage'), blinds = h.openings.filter(o => (o.kind === 'window' || o.glass) && o.blind && o.blind !== 'none'), wins = h.openings.filter(o => o.kind === 'window'), curtains = h.items.filter(i => ITEMS[i.type].dev === 'curtain'), tpanels = h.items.filter(i => i.type === 'skena').flatMap(it => (it.panels || []).map((p, k) => ({ it, p, k })));
  const on = lights.filter(i => i.state?.on).length, open = doors.filter(o => o.state.open > .5).length + wins.filter(o => o.state.open > .5).length;
  const src = x => x.entity ? (ha.ok && ha.state(x.entity) ? x.entity : x.entity + ' · ej ansluten') : 'Demo – ej kopplad';
  return `
    <div class="summary"><span>💡 ${on} av ${lights.length} tända</span><span>${open ? '🔴' : '🟢'} ${open} öppna</span><span>🪟 ${blinds.filter(o => o.state.blind > .5).length} nere</span></div>
    <div class="scenes"><button class="scene" data-scene="home"><b>🏠</b>Välkommen</button><button class="scene" data-scene="bio"><b>🎬</b>Bio</button><button class="scene" data-scene="morning"><b>☀️</b>Morgon</button><button class="scene" data-scene="off"><b>🌙</b>Allt av</button></div>
    <div class="card"><h3>💡 BELYSNING</h3>${lightGroups(h, lights, src) || '<div class="note">Inga lampor än – lägg till under Bygg.</div>'}</div>
    <div class="card"><h3>🚪 DÖRRAR & PORTAR</h3>${doors.map(o => `<div class="row" data-dev="opening:${o.id}"><div class="l"><span>${esc(nameOf(h, o))}</span><em>${esc(src(o))}</em></div><span class="pill ${o.state.open > .5 ? 'bad' : 'ok'}">${o.state.open > .5 ? 'Öppen' : 'Stängd'}</span></div>`).join('') || '<div class="note">Inga dörrar.</div>'}</div>
    ${wins.length ? `<div class="card"><h3>🪟 FÖNSTER</h3>${wins.map(o => `<div class="row" data-dev="opening:${o.id}"><div class="l"><span>${esc(nameOf(h, o))}</span><em>${esc(src(o))}</em></div><span class="pill ${o.state.open > .5 ? 'bad' : 'ok'}">${o.state.open > .5 ? 'Öppet' : 'Stängt'}</span></div>`).join('')}</div>` : ''}
    ${blinds.length || curtains.length || tpanels.length ? `<div class="card"><h3>🪟 GARDINER</h3>${tpanels.map(({ it, p, k }) => { const o = h.openings.find(x => x.id === p.window); return `<div class="row" data-dev="panel:${it.id}:${p.id}"><div class="l"><span>🧵 ${esc(p.name || (o ? nameOf(h, o) : 'Gardin ' + (k + 1)))}</span><em>${esc(p.entity || 'Demo – ej kopplad')}</em></div><span class="pill ${(p.pos || 0) > .5 ? 'bad' : 'ok'}">${(p.pos || 0) > .5 ? 'Fördragen' : 'Ifrån'}</span></div><input type="range" min="0" max="100" value="${Math.round((p.pos || 0) * 100)}" data-tpos="${it.id}:${p.id}">${q3('panel:' + it.id + ':' + p.id, p.pos || 0)}`; }).join('')}${curtains.map(i => `<div class="row" data-dev="item:${i.id}"><div class="l"><span>${esc(nameOf(h, i))}</span><em>${esc(src(i))}</em></div><span class="pill ${curtainPos(i) > .5 ? 'bad' : 'ok'}">${curtainPos(i) > .5 ? 'Fördragna' : 'Ifrån'}</span></div><input type="range" min="0" max="100" value="${Math.round(curtainPos(i) * 100)}" data-cpos="${i.id}">${q3('item:' + i.id, curtainPos(i))}`).join('')}${blinds.map(o => `<div class="row" data-dev="blind:${o.id}"><div class="l"><span>${esc(nameOf(h, o))}</span><em>${o.blind === 'persienn' ? 'Persienn' : 'Rullgardin'} · ${esc(o.blindEntity || 'Demo')}</em></div><span class="pill ${o.state.blind > .5 ? 'bad' : 'ok'}">${o.state.blind > .5 ? 'Nere' : 'Uppe'}</span></div>
      <input type="range" min="0" max="100" value="${Math.round(o.state.blind * 100)}" data-blind="${o.id}">`).join('')}</div>` : ''}
    ${media.length ? `<div class="card"><h3>🎵 MEDIA</h3>${media.map(i => `<div class="row" data-dev="item:${i.id}"><div class="l"><span>${ITEMS[i.type].icon} ${esc(nameOf(h, i))}</span><em>${esc(src(i))}</em></div><span class="sw ${i.state?.on ? 'on' : ''}"></span></div>`).join('')}</div>` : ''}
    <p class="note">Koppla till riktiga prylar: välj en sak under ✏️ Bygg och skriv in dess namn i Home Assistant.</p>`;
}

const openRooms = new Set();
function lightGroups(h, lights, src) {
  const groups = new Map();
  for (const i of lights) { const r = roomAt(h, i), k = r ? r.id : 'ute'; if (!groups.has(k)) groups.set(k, { name: r ? r.name : 'Ute', list: [] }); groups.get(k).list.push(i); }
  return [...groups].map(([k, g]) => { const n = g.list.filter(i => i.state.on).length, open = openRooms.has(k);
    return `<div class="row" data-group="${k}"><div class="l"><span>${open ? '▾' : '▸'} ${esc(g.name)}</span><em>${n} av ${g.list.length} tända</em></div><span class="sw ${n ? 'on' : ''}" data-gsw="${k}"></span></div>
    ${open ? g.list.map(i => `<div class="row" data-dev="item:${i.id}" style="padding-left:14px"><div class="l"><span>${ITEMS[i.type].icon} ${esc(i.name || ITEMS[i.type].name)}</span><em>${esc(src(i))}</em></div><span class="sw ${i.state?.on ? 'on' : ''}"></span></div>
      ${i.state?.on ? `<input type="range" min="5" max="100" value="${Math.round((i.state.bri ?? .8) * 100)}" data-bri="${i.id}">` : ''}`).join('') : ''}`; }).join('');
}

// ---------- panel-händelser ----------
const right = $('#right');
// ---------- möbelpanelen (samma som i demon) ----------
bindFurnPanel(right, {
  item: () => { const it = selected(); return S.sel?.type === 'item' && it && furnKey(it) ? furnObj(it) : null; },
  before: () => commit(),
  changed(full) { syncF(selected()); emit('full', full ? undefined : 'panel'); },
  redraw: () => renderRight(),
  act(a) { if (a === 'studio') openStudio(selected()); },
});
right.addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (!b) return; navigator.clipboard?.writeText(b.dataset.copy.replace(/\\n/g, '\n')); window.toast('📋 Listan är kopierad'); });
// grupper
right.addEventListener('click', e => { const b = e.target.closest('[data-g],[data-gsel],[data-gfree]'); if (!b) return; const h = home(), it = selected(); if (!it) return;
  if (b.dataset.gsel) { S.sel = { type: 'item', id: b.dataset.gsel }; emit('sel'); return; }
  commit();
  if ('gfree' in b.dataset) { const p = h.items.find(i => i.id === it.grp); delete it.grp; delete it.gtag; if (p?.g?.n) p.g.n--; emit('full'); return; }
  const [k, v] = b.dataset.g.split(':'); it.g = it.g || {};
  if (k === 'n') it.g.n = Math.max(0, Math.min(16, v[0] === '=' ? +v.slice(1) : (it.g.n || 0) + +v));
  else if (k === 'chair') setChairs(h, it, v);
  else if (v === 't') it.g[k] = !it.g[k]; else it.g[k] = v;
  arrange(h, it); emit('full'); });
// sök riktiga produkter
right.addEventListener('input', e => { if (!('search' in e.target.dataset)) return; searchQ = e.target.value; right.querySelector('[data-sresbox]').innerHTML = searchResults(); });
right.addEventListener('keydown', e => { if ('search' in e.target.dataset && e.key === 'Enter') right.querySelector('[data-sres]')?.click(); });
right.addEventListener('click', e => { const b = e.target.closest('[data-sres]'); if (!b) return; const p = right._sres[+b.dataset.sres], key = itemKeyFor(p.type, p);
  const extra = JSON.parse(JSON.stringify({ o: p.o, m: p.m, family: p.family || null, name: p.name, preset: p.variant || p.label, ...(p.size || {}) }));
  if (key === 'elfa') return openStudio(null, extra);
  S.placing = { kind: 'item', key, extra }; S.tool = 'add'; searchQ = ''; renderRight(); renderToolbar(); hint(); window.toast(`👆 Klicka där ${p.name} ska stå`); });
// ---------- Elfa-verkstan med rummets riktiga väggar ----------
// rummets väggar sedda inifrån: från vänster till höger hörn, inre väggytan, med fönster och dörrar
function roomWalls(h, r) {
  const P = r.pts, n = P.length;
  return P.map((a, i) => { const b = P[(i + 1) % n], L = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    let nx = -uy, ny = ux; if (!inPoly({ x: (a.x + b.x) / 2 + nx * .05, y: (a.y + b.y) / 2 + ny * .05 }, P)) { nx = -nx; ny = -ny; }
    const near = (p, w) => { const wl = wallLen(w), wx = (w.b.x - w.a.x) / wl, wy = (w.b.y - w.a.y) / wl, t = (p.x - w.a.x) * wx + (p.y - w.a.y) * wy; return Math.abs((p.x - w.a.x) * wy - (p.y - w.a.y) * wx) < .08 && t > -.08 && t < wl + .08; };
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, wall = h.walls.find(w => near(mid, w)), T = wall?.t || .1, half = T / 2;
    const rx = ny, ry = -nx, s0 = ux * rx + uy * ry > 0 ? a : b, len = Math.max(.2, L - T);
    const x1 = s0.x + nx * half + rx * half, y1 = s0.y + ny * half + ry * half, win = [], doors = [];
    for (const o of h.openings) { const w = h.walls.find(x => x.id === o.wall); if (!w || !(near(w.a, { a, b }) || near(w.b, { a, b }) || w === wall)) continue;
      const wl = wallLen(w), cx = w.a.x + (w.b.x - w.a.x) / wl * o.t, cy = w.a.y + (w.b.y - w.a.y) / wl * o.t, along = (cx - x1) * rx + (cy - y1) * ry;
      if (Math.abs((cx - x1) * nx + (cy - y1) * ny) > .3 || along < -o.w / 2 || along > len + o.w / 2) continue;
      if (o.kind === 'window') win.push([along - o.w / 2, o.w, o.sill || 0, o.h]); else doors.push([along - o.w / 2, o.w, o.h]); }
    return { name: 'ABCDEFGHIJKL'[i], len, nx, nz: ny, rx, rz: ry, x1, z1: y1, x2: x1 + rx * len, z2: y1 + ry * len, win, doors }; });
}
function placeOnWall(it, W, off, out = 0) { it.rot = ((-Math.atan2(W.nx, W.nz) * 180 / Math.PI) % 360 + 360) % 360;
  const a = off + it.w / 2, n = out + it.d / 2; it.x = Math.round((W.x1 + W.rx * a + W.nx * n) * 1000) / 1000; it.y = Math.round((W.z1 + W.rz * a + W.nz * n) * 1000) / 1000; }
function openStudio(it, extra) {
  const h = home(), rooms = h.rooms.filter(r => !r.hidden && !r.outdoor && r.pts.length >= 3);
  if (!rooms.length) return window.toast('Rita ett rum först – Elfa sätts mot rummets väggar');
  const r = (it && roomAt(h, it)) || (S.sel?.type === 'room' && rooms.find(x => x.id === S.sel.id)) || rooms.find(x => x.id === S.focus) || [...rooms].sort((a, b) => polyArea(b.pts) - polyArea(a.pts))[0];
  const RL = [r, ...rooms.filter(x => x !== r)], roomsW = RL.map(x => ({ name: x.name || 'Rum', walls: roomWalls(h, x) })), walls = roomsW[0].walls; let wi = 0, off = null;
  if (it) { let best = 1e9; walls.forEach((W, i) => { const dist = (it.x - W.x1) * W.nx + (it.y - W.z1) * W.nz, along = (it.x - W.x1) * W.rx + (it.y - W.z1) * W.rz;
    if (Math.abs(dist - it.d / 2) < best && along > -.2 && along < W.len + .2) { best = Math.abs(dist - it.d / 2); wi = i; off = Math.max(0, along - it.w / 2); } }); }
  const item = it ? { type: 'elfa', o: it.o, m: it.m, w: it.w, d: it.d, h: it.h } : extra ? { type: 'elfa', o: extra.o, m: extra.m } : null;
  if (item) item.o.wall = wi;
  openElfaStudio({ item, rooms: roomsW, roomH: h.ceiling || 2.5, startWall: wi, startOff: off, onDone: ({ o, m, wall, off: of2, doors, room }) => {
    commit(); const W = roomsW[room].walls[wall]; let t = it && h.items.includes(it) ? it : makeItem(h, 'elfa', 0, 0, 0, { o, m });
    t.o = o; t.m = m; t.family = 'Elfa'; t.name = 'Elfa ' + ELFA_SYS[elfaSys(o)].name; t.preset = extra?.preset || 'Egen uppställning'; syncF(t); placeOnWall(t, W, of2);
    if (doors) { let dr = h.items.find(x => x.id === t.o.doors); const p = PRESETS.find(q => q.name === 'Elfa skjutdörrar Artic Plain');
      if (!dr) { dr = makeItem(h, 'skjutdorr', 0, 0, 0, JSON.parse(JSON.stringify({ o: p.o, m: p.m, family: p.family, name: p.name, preset: p.variant }))); t.o.doors = dr.id; }
      dr.w = W.len; dr.h = (h.ceiling || 2.5) - .005; syncF(dr); placeOnWall(dr, W, 0, t.d + .04); }
    S.sel = { type: 'item', id: t.id }; S.placing = null; S.tool = 'select'; emit('full'); renderToolbar(); hint(); window.toast('🧥 Elfa-inredningen sitter på plats'); } });
}
right.addEventListener('click', e => {
  const h = home(), s = S.sel;
  const gsw = e.target.closest('[data-gsw]');
  if (gsw) { const k = gsw.dataset.gsw, ls = h.items.filter(i => ITEMS[i.type].dev === 'light' && ((roomAt(h, i)?.id) || 'ute') === k); const any = ls.some(i => i.state.on); ls.forEach(i => lightSet(i, !any, i.state.bri ?? .8)); return; }
  const grp = e.target.closest('[data-group]'); if (grp) { const k = grp.dataset.group; openRooms.has(k) ? openRooms.delete(k) : openRooms.add(k); renderRight(); return; }
  const ps = e.target.closest('[data-psel]'); if (ps) { S.panelSel = S.panelSel === ps.dataset.psel ? null : ps.dataset.psel; renderRight(); plan.draw(); return; }
  const pc = e.target.closest('[data-pcolor],[data-popt]'); if (pc) { const it = selected(), p = it?.panels?.find(x => x.id === S.panelSel); if (!p) return; commit();
    if (pc.dataset.pcolor) p.color = pc.dataset.pcolor; else if (pc.dataset.popt === 'split') { p.split = !!pc.dataset.v; if (!p.split) { p.offL = 0; p.offR = 0; } } else p[pc.dataset.popt] = pc.dataset.v; emit('full'); return; }
  const q = e.target.closest('[data-q3]'); if (q) { const [key, v] = q.dataset.q3.split('|'), [type, id, pid] = key.split(':'), hh = home(), it = hh.items.find(i => i.id === id);
    if (type === 'panel') { const pn = it?.panels?.find(x => x.id === pid); if (pn) panelSet(it, pn, +v); } else if (it) curtainSet(it, +v); return; }
  const t = e.target.closest('button,[data-dev]'); if (!t) return;
  if (t.dataset.cat) { catTab = t.dataset.cat; renderRight(); return; }
  if (t.dataset.place === 'item:skena') { setTool('track'); return; }
  if (t.dataset.place === 'item:elfa') { openStudio(null); return; }
  if (t.dataset.place) { const [kind, key] = t.dataset.place.split(':'); S.placing = { kind, key }; S.tool = 'add'; renderRight(); renderToolbar(); hint(); return; }
  if (t.dataset.scene) return scene(t.dataset.scene);
  if (t.dataset.dev) { const [type, id, pid] = t.dataset.dev.split(':'); return onDevice({ type, id, pid }); }
  if (t.dataset.color) { commit(); setField(t.dataset.f, t.dataset.color); emit('full'); return; }
  if (t.dataset.opt) { commit(); setField(t.dataset.opt, t.dataset.v); emit('full'); return; }
  const act = t.dataset.act; if (!act) return;
  const obj = selected();
  if (act.startsWith('rot')) { commit(); obj.rot = ((obj.rot + +act.slice(3)) % 360 + 360) % 360; emit('full', 'panel'); return; }
  if (act === 'dellevel') { const raw = h.__raw; if (!confirm(`Ta bort ${h.__level.name} med allt på den?`)) return; commit(); raw.levels = raw.levels.filter(l => l !== h.__level); S.level = null; renderAll(); emit('full'); view.buildNow(); view.fitCam(); return; }
  if (act === 'unignore') { commit(); h.ignore = []; h.rooms.forEach(r => delete r.hidden); rebuildRooms(h); emit('full'); return; }
  if (act === 'cleanwalls') { commit(); const snap = JSON.stringify(h.__level), before = h.walls.length, nRooms = h.rooms.filter(r => !r.hidden && !r.outdoor).length;
    mergeWalls(h); cleanWalls(h); splitWalls(h); h.rooms.forEach(r => { if (!r.outdoor) r.custom = false; }); rebuildRooms(h);
    if (h.rooms.filter(r => !r.hidden && !r.outdoor).length < nRooms) { Object.assign(h.__level, JSON.parse(snap)); emit('full'); window.toast('🧹 Städningen skulle ha tagit bort rum – ingenting ändrades'); return; }
    emit('full'); window.toast(`🧹 ${before} → ${h.walls.length} väggar`); return; }
  if (act === 'pwin') { commit(); const n = panelsForWindows(h, obj); window.toast(n ? `${n} gardiner tillagda` : 'Alla fönster längs skenan har redan gardiner'); return; }
  if (act === 'padd') { commit(); const p = newPanel({ s: Math.round(trackLen(obj.pts) / 2 * 100) / 100 }); obj.panels.push(p); S.panelSel = p.id; emit('full'); return; }
  if (act === 'pdel') { commit(); obj.panels = obj.panels.filter(p => p.id !== S.panelSel); S.panelSel = null; emit('full'); return; }
  if (act === 'pdup') { commit(); const p0 = obj.panels.find(p => p.id === S.panelSel); const p = { ...p0, id: uid(), s: p0.s + p0.w, window: null }; obj.panels.push(p); S.panelSel = p.id; emit('full'); return; }
  if (act === 'delpt') return deletePoint();
  if (act === 'del') return deleteSel();
  if (act === 'dup') return dupSel();
  if (act === 'test') return onDevice({ type: 'item', id: obj.id }, true);
  if (act === 'testdoor') return onDevice({ type: 'opening', id: obj.id }, true);
  if (act === 'sameboth') { commit(); obj.colorN = obj.colorP || obj.color; obj.matN = obj.matP; emit('full'); return; }
  if (act === 'swing') { commit(); obj.swing = -obj.swing; emit('full'); return; }
  if (act === 'bgnew') return $('#fileImg').click();
  if (act === 'calib') { plan.calibrate(); window.toast('Klicka på två punkter i bilden'); return; }
  if (act === 'auto') return autoPlan();
  if (act === 'bgtoggle') { h.bg.hidden = !h.bg.hidden; emit('full'); return; }
  if (act === 'bgdel') { if (!confirm('Ta bort ritningsbilden? Väggarna och rummen ligger kvar.')) return; commit(); h.bg = null; emit('full'); return; }
});
right.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.gap) { const w = selected(), sd = +t.dataset.gap, g = wallGap(home(), w, sd), want = parseFloat(t.value.replace(',', '.')) / 100;
    if (!g || !(want > .1)) return renderRight(); commit(); const L = wallLen(w), nx = -(w.b.y - w.a.y) / L, ny = (w.b.x - w.a.x) / L;
    plan.moveWallBy(w, -sd * (want - g.inner)); emit('full'); window.toast(`↔ ${Math.round(want * 100)} cm`); return; }
  if (t.dataset.pf) { const it = selected(), p = it?.panels?.find(x => x.id === S.panelSel); if (!p) return; commit(); let v = t.value;
    if (t.dataset.u === 'cm') { v = parseFloat(v.replace(',', '.')) / 100; if (!(v > 0) && t.dataset.pf === 'w') return renderRight(); if (!isFinite(v)) return renderRight(); }
    if (t.dataset.pf === 'window') { if (!v && p.window) p.s = panelS(home(), it, p); p.window = v || null; const wn = windowsNear(home(), it).find(x => x.o.id === v); if (wn) { p.s = wn.s; p.anchor = p.anchor || 'center'; } }
    else p[t.dataset.pf] = v; emit('full'); return; }
  if (!t.dataset.f) return;
  commit(); let v = t.value;
  if (t.dataset.u === 'deg') { v = ((parseFloat(String(v).replace(',', '.')) % 360) + 360) % 360; if (!isFinite(v)) { renderRight(); return; } }
  if (t.dataset.u === 'cm') { v = parseFloat(v.replace(',', '.')) / 100; if (!(v >= 0) && !(t.dataset.f === 'level.z' && isFinite(v))) { renderRight(); return; } }
  if (t.dataset.f === 'depth' && !t.value.trim()) { delete selected().depth; emit('full'); return; }
  setField(t.dataset.f, v); if (S.sel?.type === 'wall' && ['len', 't'].includes(t.dataset.f)) { const w = selected(); touchRooms(home(), [[w.a, w.b]]); rebuildRooms(home()); } emit('full', t.dataset.u === 'color' ? 'panel' : undefined);
});
right.addEventListener('input', e => {
  const t = e.target, h = home();
  if (t.dataset.u === 'color') { setField(t.dataset.f, t.value); emit('full', 'panel'); }
  if (t.hasAttribute('data-rot')) { const it = selected(); if (!t._c) { commit(); t._c = true; } it.rot = +t.value; emit('item', it.id); const box = right.querySelector('[data-f=rot]'); if (box) box.value = t.value; }
  if (t.dataset.ppos) { const it = selected(), p = it?.panels?.find(x => x.id === t.dataset.ppos); if (p) panelSet(it, p, t.value / 100); const lab = t.closest('label'); if (lab) lab.firstChild.textContent = `Fördragen: ${t.value}%`; }
  if (t.dataset.tpos) { const [iid, pid] = t.dataset.tpos.split(':'), it = home().items.find(i => i.id === iid), p = it?.panels?.find(x => x.id === pid); if (p) panelSet(it, p, t.value / 100); }
  if (t.dataset.cpos) { const it = home().items.find(i => i.id === t.dataset.cpos) || selected(); curtainSet(it, t.value / 100); const lab = t.closest('label'); if (lab) lab.firstChild.textContent = `Fördragna: ${t.value}%`; }
  if (t.dataset.bri) { const it = h.items.find(i => i.id === t.dataset.bri); lightSet(it, true, t.value / 100); }
  if (t.dataset.blind) { const o = h.openings.find(i => i.id === t.dataset.blind); blindSet(o, t.value / 100); const lab = t.closest('label'); if (lab) lab.firstChild.textContent = `Nere: ${t.value}%`; }
  if (t.hasAttribute('data-bgop')) { h.bg.opacity = t.value / 100; plan.draw(); save(); }
});
function selected() { const h = home(), s = S.sel; if (!s) return null;
  return s.type === 'item' ? h.items.find(i => i.id === s.id) : s.type === 'opening' ? h.openings.find(i => i.id === s.id) : s.type === 'wall' ? h.walls.find(i => i.id === s.id) : h.rooms.find(i => i.id === s.id); }
function setField(f, v) {
  const h = home();
  if (f === 'home.type') { h.type = v; return; }
  if (f === 'level.name') { h.__level.name = v || h.__level.name; renderLevels(); return; }
  if (f === 'level.z') { h.__level.z = v; h.__raw.levels.sort((a, b) => a.z - b.z); renderLevels(); return; }
  if (f === 'home.autoRooms') { h.autoRooms = v === 'ja'; h.manualChosen = v !== 'ja'; if (h.autoRooms) rebuildRooms(h); return; }
  if (f === 'home.ceiling') { const old = h.ceiling; h.ceiling = v; h.walls.forEach(w => { if (Math.abs(w.h - old) < .01) w.h = v; });
    h.items.forEach(it => { if (ITEMS[it.type].ceil) it.elev = v - it.h; }); return; }
  const o = selected(); if (!o) return;
  if (f === 'len') { const L = wallLen(o), ux = (o.b.x - o.a.x) / L, uy = (o.b.y - o.a.y) / L; o.b = { x: Math.round((o.a.x + ux * v) * 1000) / 1000, y: Math.round((o.a.y + uy * v) * 1000) / 1000 }; return; }
  if (f === 'roomwallmat') { for (const w of h.walls) { const sd = wallSides(h, w); if (sd.P === o) w.matP = v; if (sd.N === o) w.matN = v; } return; }
  if (f === 'roomwalls') { for (const w of h.walls) { const sd = wallSides(h, w); if (sd.P === o) w.colorP = v; if (sd.N === o) w.colorN = v; } return; }
  if (f === 'h' && o.type && ITEMS[o.type].ceil) { o.elev = h.ceiling - v; }
  if (f === 'outdoor') { o.outdoor = !!v; return; }
  if (f === 'panes') { o.panes = +v; return; }
  if (f === 'transom') { o.transom = !!v; return; }
  o[f] = v;
}
function deletePoint() {
  const h = home(), r = h.rooms.find(x => x.id === S.selPt?.room); if (!r) return;
  if (r.pts.length <= 3) return window.toast('Ett rum behöver minst 3 hörn');
  commit(); if (!r.outdoor) r.custom = true; r.pts.splice(S.selPt.i, 1); S.selPt = null; emit('full');
}
function dupSel() { const h = home(), obj = selected(); if (!obj || S.sel?.type !== 'item') return; commit(); const c = JSON.parse(JSON.stringify(obj)); c.id = uid(); delete c.grp; delete c.gtag; c.x += .3; c.y += .3; h.items.push(c); S.sel = { type: 'item', id: c.id }; emit('full'); }
function rotSel(d) { const obj = selected(); if (!obj || S.sel?.type !== 'item') return; commit(); obj.rot = ((obj.rot + d) % 360 + 360) % 360; emit('full', 'panel'); }
// liten flytande meny vid det man valt (i 2D)
const selbar = document.createElement('div'); selbar.className = 'selbar'; selbar.hidden = true; $('#pane2d').appendChild(selbar);
selbar.innerHTML = '<button data-sb="rl" title="Vrid åt vänster">⟲</button><button data-sb="rr" title="Vrid åt höger">⟳</button><button data-sb="dup" title="Kopiera">⧉</button><button data-sb="del" title="Ta bort" class="danger">🗑</button>';
selbar.addEventListener('pointerdown', e => e.stopPropagation());
selbar.addEventListener('click', e => { const b = e.target.closest('[data-sb]'); if (!b) return; const k = b.dataset.sb;
  if (k === 'rl') rotSel(-90); if (k === 'rr') rotSel(90); if (k === 'dup') dupSel(); if (k === 'del') deleteSel(); });
ui.selbar = p => { if (!p || S.mode !== 'bygg') { selbar.hidden = true; return; } selbar.hidden = false; selbar.style.left = p.x + 'px'; selbar.style.top = Math.max(6, p.y) + 'px'; };
function deleteSel() {
  const h = home(), s = S.sel; if (!s) return; commit();
  if (s.type === 'item') h.items = h.items.filter(i => i.id !== s.id);
  if (s.type === 'opening') h.openings = h.openings.filter(i => i.id !== s.id);
  if (s.type === 'wall') { const w = h.walls.find(i => i.id === s.id); if (w) touchRooms(h, [[w.a, w.b]]); h.walls = h.walls.filter(i => i.id !== s.id); h.openings = h.openings.filter(o => o.wall !== s.id); rebuildRooms(h); }
  if (s.type === 'room') { const r = h.rooms.find(i => i.id === s.id); if (r && !r.outdoor && h.autoRooms !== false) r.hidden = true; else h.rooms = h.rooms.filter(i => i.id !== s.id); }
  S.sel = null; emit('full');
}

// ---------- smarta hemmet ----------
const dom = e => (e || '').split('.')[0];
const linked = e => e && ha.ok && ha.state(e);
function lightSet(it, onOff, bri) {
  if (linked(it.entity)) { const d = dom(it.entity);
    if (!onOff) ha.call(d, 'turn_off', { entity_id: it.entity });
    else ha.call(d, 'turn_on', d === 'light' && bri != null ? { entity_id: it.entity, brightness_pct: Math.round(bri * 100) } : { entity_id: it.entity }); }
  it.state.on = onOff; if (bri != null) it.state.bri = bri; emit('state');
}
const cycle3 = v => v < .25 ? .5 : v < .75 ? 1 : 0;
const q3 = (key, cur) => `<div class="opt" style="margin:4px 0 8px">${[[0, 'Ifrån'], [.5, 'Halvt'], [1, 'För']].map(([v, l]) => `<button data-q3="${key}|${v}" class="${Math.abs(v - cur) < .02 ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const curtainPos = it => it.state?.pos ?? (it.state?.on ? 1 : 0);
function curtainSet(it, v) {
  if (linked(it.entity)) ha.call('cover', 'set_cover_position', { entity_id: it.entity, position: Math.round((1 - v) * 100) });
  it.state.pos = v; it.state.on = v > .5; emit('state');
}
function mediaSet(it, onOff) {
  if (linked(it.entity)) { const sp = ITEMS[it.type].dev === 'speaker'; ha.call('media_player', sp ? (onOff ? 'media_play' : 'media_pause') : (onOff ? 'turn_on' : 'turn_off'), { entity_id: it.entity }); }
  it.state.on = onOff; emit('state');
}
function doorSet(o, open) {
  if (linked(o.entity)) { const d = dom(o.entity);
    if (d === 'cover') ha.call('cover', open ? 'open_cover' : 'close_cover', { entity_id: o.entity });
    else if (d === 'lock') ha.call('lock', open ? 'unlock' : 'lock', { entity_id: o.entity });
    else { window.toast(o.kind === 'window' ? 'Fönstret visar vad fönsterbrytaren säger' : 'Dörren visar vad dörrbrytaren säger'); return; } }
  o.state.open = open ? 1 : 0; emit('state');
}
function blindSet(o, v) {
  if (linked(o.blindEntity)) ha.call('cover', 'set_cover_position', { entity_id: o.blindEntity, position: Math.round((1 - v) * 100) });
  o.state.blind = v; emit('state');
}
function onDevice(p) {
  const raw = home().__raw, L = raw.levels.find(l => l.id === p.lv) || home().__level, h = levelView(raw, L);
  if (p.type === 'item') { const it = h.items.find(i => i.id === p.id); if (!it) return; const dev = ITEMS[it.type].dev;
    if (dev === 'light') lightSet(it, !it.state.on, it.state.bri ?? .8); else if (dev === 'curtain') curtainSet(it, cycle3(curtainPos(it))); else if (dev) mediaSet(it, !it.state.on);
    else { const r = roomAt(h, it); if (r) roomLights(r, h); }
    if (S.mode === 'bygg') renderRight(); return; }
  if (p.type === 'opening') { const o = h.openings.find(i => i.id === p.id); if (!o) return;
    if (o.kind === 'window') { if (o.openType === 'fast') return window.toast('Fast fönster – går inte att öppna'); doorSet(o, o.state.open < .5); }
    else if (o.kind !== 'hole') doorSet(o, o.state.open < .5);
    if (S.mode === 'bygg') renderRight(); return; }
  if (p.type === 'blind') { const o = h.openings.find(i => i.id === p.id); blindSet(o, o.state.blind > .5 ? 0 : 1); if (S.mode === 'bygg') renderRight(); return; }
  if (p.type === 'room') { const r = h.rooms.find(i => i.id === p.id); if (r) roomLights(r, h); }
  if (p.type === 'panel') { const it = h.items.find(i => i.id === p.id), pn = it?.panels?.find(x => x.id === p.pid); if (pn) { panelSet(it, pn, cycle3(pn.pos || 0)); if (S.mode === 'bygg') renderRight(); } }
}
function roomLights(r, h = home()) {
  const ls = h.items.filter(i => ITEMS[i.type].dev === 'light' && roomAt(h, i) === r);
  if (!ls.length) return window.toast(`Inga lampor i ${r.name}`);
  const anyOn = ls.some(i => i.state.on); ls.forEach(i => lightSet(i, !anyOn, i.state.bri ?? .8));
}
function scene(k) {
  const h = home(), lights = h.items.filter(i => ITEMS[i.type].dev === 'light'), blinds = h.openings.filter(o => o.blind && o.blind !== 'none');
  const room = i => roomAt(h, i)?.name || '';
  if (k === 'off') { lights.forEach(i => lightSet(i, false)); h.items.filter(i => ITEMS[i.type].dev && ITEMS[i.type].dev !== 'light').forEach(i => mediaSet(i, false)); }
  if (k === 'home') { lights.forEach(i => lightSet(i, /hall|kök|vardag|allrum/i.test(room(i)) || i.type === 'utelampa', .85)); blinds.forEach(o => blindSet(o, 0)); }
  if (k === 'morning') { blinds.forEach(o => blindSet(o, 0)); lights.forEach(i => lightSet(i, /kök|bad/i.test(room(i)), 1)); }
  if (k === 'bio') { const tv = h.items.find(i => i.type === 'tv'); const r = tv && roomAt(h, tv);
    lights.forEach(i => lightSet(i, !!r && roomAt(h, i) === r && i.type !== 'taklampa', .15));
    blinds.forEach(o => blindSet(o, 1)); if (tv) mediaSet(tv, true);
    h.items.filter(i => ITEMS[i.type].dev === 'speaker' && r && roomAt(h, i) === r).forEach(i => mediaSet(i, true)); }
  window.toast({ off: '🌙 Allt av', home: '🏠 Välkommen hem', morning: '☀️ God morgon', bio: '🎬 Bioläge' }[k]);
}
function haState(entity, st) {
  const h = home(); let hit = false;
  const pos = () => st.attributes?.current_position ?? (st.state === 'open' ? 100 : 0);
  for (const it of h.items) if (it.entity === entity && it.state) { hit = true; const dev = ITEMS[it.type].dev;
    if (dev === 'light') { it.state.on = st.state === 'on'; if (st.attributes?.brightness != null) it.state.bri = st.attributes.brightness / 255; }
    else if (dev === 'tv') it.state.on = !['off', 'standby', 'unavailable', 'unknown'].includes(st.state);
    else if (dev === 'curtain') { const p = st.attributes?.current_position; it.state.pos = p != null ? 1 - p / 100 : (st.state === 'closed' ? 1 : 0); it.state.on = it.state.pos > .5; }
    else it.state.on = st.state === 'playing'; }
  for (const it of h.items) if (it.type === 'skena') for (const p of it.panels || []) if (p.entity === entity) { hit = true; const cp = st.attributes?.current_position; p.pos = cp != null ? 1 - cp / 100 : (st.state === 'closed' ? 1 : 0); }
  for (const o of h.openings) {
    if (o.entity === entity) { hit = true; const d = dom(entity); o.state.open = d === 'cover' ? pos() / 100 : d === 'lock' ? (st.state === 'unlocked' ? 1 : 0) : (st.state === 'on' ? 1 : 0); }
    if (o.blindEntity === entity) { hit = true; o.state.blind = 1 - pos() / 100; }
  }
  if (hit) emit('state');
}

// ---------- dialoger ----------
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="mbox">${html}</div>`; m.hidden = false; return m; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) $('#modal').hidden = true; });
function newHomeDialog() {
  const m = modal(`<h2>Nytt hem</h2><div class="big4">
    <button data-t="villa"><b>🏡</b>Exempelhus<br><span class="note">Färdigt att utgå från</span></button>
    <button data-t="lagenhet"><b>🏢</b>Lägenhet<br><span class="note">2 rok att ändra i</span></button>
    <button data-t="stuga"><b>🌲</b>Sommarstuga<br><span class="note">Liten stuga med altan</span></button>
    <button data-t="tom"><b>✏️</b>Tomt<br><span class="note">Rita allt själv</span></button>
    <button data-t="plan" style="grid-column:1/-1"><b>🗺️</b>Från planritning<br><span class="note">Ladda upp en bild – väggar och rum skapas automatiskt</span></button></div>
    <div class="btns" style="margin-top:14px"><button class="btn" data-close>Avbryt</button></div>`);
  m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const plan_ = b.dataset.t === 'plan', h = template(plan_ ? 'tom-lagenhet' : b.dataset.t); if (plan_) h.name = 'Min bostad';
    S.homes.push(h); m.hidden = true; switchHome(h.id);
    if (b.dataset.t === 'tom') { setMode('bygg'); S.view = 'split'; setTool('room'); renderTop(); }
    if (plan_) { setMode('bygg'); S.view = 'split'; renderTop(); setTool('bild'); }
  });
}
function haDialog() {
  const m = modal(`<h2>🔌 Koppla ditt smarta hem</h2>
    <div class="steps"><div><b>1</b>Ha Home Assistant igång hemma (t.ex. Home Assistant Green)</div>
    <div><b>2</b>Lägg in Apple Home, Homey, Hue, Sonos m.m. i Home Assistant</div>
    <div><b>3</b>Profil → Säkerhet → skapa en "långlivad token" och klistra in här</div></div>
    <label class="f">Adress<input id="haUrl" value="${esc(S.ha.url)}" placeholder="https://xxxx.ui.nabu.casa  eller  http://homeassistant.local:8123"></label>
    <label class="f">Token<textarea id="haTok" rows="3" placeholder="eyJ0eXAiOiJKV1Qi...">${esc(S.ha.token)}</textarea></label>
    <p class="note">Token sparas bara i den här webbläsaren. Status: <span class="dot ${ha.status}"></span> ${{ on: 'Ansluten', off: 'Inte ansluten', error: 'Fel', connecting: 'Ansluter…' }[ha.status]}</p>
    <div class="btns"><button class="btn" data-close>Stäng</button>${S.ha.url ? '<button class="btn danger" id="haOff">Koppla från</button>' : ''}<button class="btn acc" id="haGo">Anslut</button></div>`);
  m.querySelector('#haGo').onclick = () => { S.ha = { url: $('#haUrl').value.trim(), token: $('#haTok').value.trim() }; save(); ha.connect(S.ha.url, S.ha.token); m.hidden = true; };
  const off = m.querySelector('#haOff'); if (off) off.onclick = () => { S.ha = { url: '', token: '' }; save(); ha.disconnect(); ha.connect(); m.hidden = true; };
}

// ---------- planritning → hem ----------
async function autoPlan() {
  const h = home(); if (!h.bg) return;
  if (h.walls.length && !confirm('Ersätta nuvarande väggar och rum med det som hittas i bilden?')) return;
  const img = new Image(); img.src = h.bg.src; await img.decode();
  const r = detectPlan(img);
  if (!r.walls.length) return window.toast('Hittade inga väggar – prova en tydligare ritning');
  commit();
  const ts = r.walls.map(w => w.t).sort((a, b) => a - b), thinT = ts[Math.floor(ts.length * .25)];
  const s = 0.12 / thinT, all = r.walls.flatMap(w => [w.a, w.b]);
  const ox = Math.min(...all.map(p => p.x)), oy = Math.min(...all.map(p => p.y));
  const P = p => ({ x: Math.round((p.x - ox) * s * 1000) / 1000, y: Math.round((p.y - oy) * s * 1000) / 1000 });
  const T = t => Math.min(.4, Math.max(.08, Math.round(t * s * 100) / 100));
  h.walls = []; h.rooms = []; h.openings = [];
  for (const w of r.walls) h.walls.push({ id: uid(), a: P(w.a), b: P(w.b), t: T(w.t), h: h.ceiling, color: '#eeebe5' });
  for (const gp of r.gaps) {
    const a = P(gp.a), b = P(gp.b), L = Math.hypot(b.x - a.x, b.y - a.y), t = T(gp.t);
    const wall = { id: uid(), a, b, t, h: h.ceiling, color: '#eeebe5' }; h.walls.push(wall);
    const w = Math.round((L - t) * 100) / 100; if (w < .35) continue;
    const key = gp.window ? 'fonster' : gp.exterior ? (w < 1.4 ? 'ytterdorr' : 'oppning') : (w > 1.3 ? 'oppning' : 'dorr');
    h.openings.push({ id: uid(), key, kind: OPENINGS[key].kind, wall: wall.id, t: L / 2, w, h: OPENINGS[key].h, sill: OPENINGS[key].sill, color: OPENINGS[key].color,
      hinge: 'L', swing: 1, blind: 'none', blindColor: '#ece6da', entity: '', blindEntity: '', name: '', state: { open: 0, blind: 0 } });
  }
  const rooms = [...r.rooms].sort((a, b) => b.area - a.area);
  mergeWalls(h); cleanWalls(h); splitWalls(h);
  rooms.forEach((rm, i) => h.rooms.push({ id: uid(), name: 'Rum ' + (i + 1), pts: rm.pts.map(P), floor: '#b8915f', style: 'tra' }));
  (r.outdoor || []).forEach((o, i) => h.rooms.push({ id: uid(), name: i ? 'Uteplats ' + (i + 1) : 'Uteplats', pts: o.pts.map(P), floor: '#8a6440', style: 'tra', outdoor: true }));
  h.bg.x = -ox * s; h.bg.y = -oy * s; h.bg.mpp = r.kd * s; h.bg.opacity = .35;
  S.tool = 'select'; S.sel = null; emit('full'); renderToolbar(); hint(); view.buildNow(); view.fitCam(); setTimeout(() => plan.fit(), 50);
  areaDialog(r.walls.length, r.gaps.length, rooms.length, (r.outdoor || []).length);
}
function areaDialog(nw, ng, nr, no = 0) {
  const h = home(), cur = h.rooms.filter(r => !r.outdoor).reduce((a, r) => a + polyArea(r.pts), 0);
  const m = modal(`<h2>✨ Klart! Hittade ${nw} väggar, ${ng} dörrar/fönster, ${nr} rum${no ? ` och ${no === 1 ? 'en uteplats' : no + ' uteplatser'}` : ''}</h2>
    <p class="note">Nu behöver jag veta storleken så att måtten blir rätt.</p>
    <label class="f">Hur många m² är bostaden? (står i annonsen)<input id="areaIn" inputmode="decimal" value="${Math.round(cur)}"></label>
    <div class="btns"><button class="btn" data-close>Hoppa över</button><button class="btn acc" id="areaGo">Klar</button></div>
    <p class="note" style="margin-top:12px">Sedan: klicka på ett rum för att döpa det och välja golv. Klicka på en dörr eller ett fönster för att ändra den. När du är nöjd: tryck <b>✔ Nöjd – göm bilden</b> till höger.</p>`);
  m.querySelector('#areaIn').select();
  m.querySelector('#areaGo').onclick = () => {
    const want = parseFloat(m.querySelector('#areaIn').value.replace(',', '.')); m.hidden = true;
    if (!(want > 0) || !cur) return;
    const k = Math.sqrt(want / cur), sc = p => ({ x: Math.round(p.x * k * 1000) / 1000, y: Math.round(p.y * k * 1000) / 1000 });
    h.walls.forEach(w => { w.a = sc(w.a); w.b = sc(w.b); }); h.rooms.forEach(r => r.pts = r.pts.map(sc));
    h.openings.forEach(o => { o.t *= k; o.w = Math.round(o.w * k * 100) / 100; }); h.items.forEach(i => { i.x *= k; i.y *= k; });
    if (h.bg) { h.bg.x *= k; h.bg.y *= k; h.bg.mpp *= k; }
    emit('full'); view.buildNow(); view.fitCam(); plan.fit(); window.toast(`Skalat till ${want} m² ✔`);
  };
}

// ---------- filer ----------
function exportHome() {
  const h = home(), a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(h, null, 1)], { type: 'application/json' }));
  a.download = h.name.replace(/[^\wåäöÅÄÖ -]/g, '') + '.hemma.json'; a.click();
}
$('#fileJson').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const h = JSON.parse(await f.text()); if (!h.levels && !(h.walls && h.items)) throw 0; h.id = uid(); migrate([h]); S.homes.push(h); switchHome(h.id); window.toast('Öppnade ' + h.name); }
  catch (err) { window.toast('Filen gick inte att läsa'); }
});
$('#fileImg').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const img = new Image(); img.src = URL.createObjectURL(f); await img.decode();
  const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
  c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  commit(); const h = home(); h.bg = { src: c.toDataURL('image/jpeg', .8), x: 0, y: 0, mpp: 15 / c.width, opacity: .5, hidden: false };
  S.tool = 'bild'; emit('full'); renderToolbar(); hint();
  if (!h.walls.length) autoPlan(); else { plan.calibrate(); window.toast('Klicka på två punkter du vet avståndet mellan'); }
});

// ---------- tangentbord ----------
window.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea')) return;
  if (e.key === 'Escape' && S.inside) { goOut(); return; }
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (S.mode !== 'bygg') return;
  if (e.key === 'Escape') { if (S.placing || S.tool !== 'select') setTool('select'); else { S.sel = null; plan.cancel(); emit('sel'); } return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && S.selPt && S.sel?.type === 'room') { e.preventDefault(); deletePoint(); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel) { e.preventDefault(); deleteSel(); return; }
  const it = S.sel?.type === 'item' && selected();
  if (it && e.key.toLowerCase() === 'r') { commit(); it.rot = ((it.rot + (e.shiftKey ? -15 : 90)) % 360 + 360) % 360; emit('full', 'panel'); return; }
  if (it && mod && e.key.toLowerCase() === 'd') { e.preventDefault(); right.querySelector('[data-act=dup]')?.click(); }
  const map = { v: 'select', '1': 'select', '2': 'room', '3': 'wall', '4': 'add' }; if (!mod && map[e.key]) setTool(map[e.key]);
});

// ---------- start ----------
function renderAll() { updateWarns(); renderSide(); renderTop(); renderToolbar(); renderRight(); hint(); renderLevels(); }
function goOut() { const was = S.inside; S.inside = false; if (was && S.prev) { S.walls = S.prev.walls; S.ceil = S.prev.ceil; S.prev = null; view.buildNow(); } view.fitCam(); renderTop(); }
// ---------- våningar ----------
function renderLevels() {
  const raw = home().__raw, cur = home().__level;
  $('#levels').innerHTML = [...raw.levels].reverse().map(L => `<button class="${L === cur ? 'on' : ''}" data-lv="${L.id}">${esc(L.name)}</button>`).join('') +
    (S.mode === 'bygg' ? '<button data-lvadd title="Lägg till våning">＋</button>' : '') +
    (raw.levels.length > 1 ? `<button data-lvall class="${S.showAll ? 'on' : ''}" title="Visa våningarna ovanför också">${S.showAll ? '👁 Alla' : '👁 Hit'}</button>` : '');
}
$('#levels').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.lv) { S.level = t.dataset.lv; S.sel = null; S.selPt = null; plan.cancel(); renderAll(); emit('full'); view.buildNow(); view.fitCam(); return; }
  if (t.hasAttribute('data-lvall')) { S.showAll = !S.showAll; renderLevels(); view.build(); return; }
  if (t.hasAttribute('data-lvadd')) {
    const m = modal(`<h2>Ny våning</h2><div class="big4">
      <button data-k="tom"><b>⬜</b>Tom våning ovanpå<br><span class="note">Rita själv</span></button>
      <button data-k="kopia"><b>⧉</b>Kopiera ${esc(home().__level.name)}<br><span class="note">Samma väggar och fönster – bra för flerbostadshus</span></button>
      <button data-k="kallare"><b>⬇️</b>Källare<br><span class="note">Under marken</span></button></div>
      <div class="btns" style="margin-top:14px"><button class="btn" data-close>Avbryt</button></div>`);
    m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { commit(); const L = addLevel(home().__raw, b.dataset.k); S.level = L.id; S.sel = null; m.hidden = true;
      renderAll(); emit('full'); view.buildNow(); view.fitCam(); window.toast(`${L.name} skapad – den under syns svagt i ritningen`); });
  }
});
renderAll();
view.buildNow(); view.fitCam();
requestAnimationFrame(() => { plan.resize(); plan.fit(); });
window.addEventListener('resize', () => plan.resize());
new ResizeObserver(() => plan.resize()).observe($('#pane2d'));
if (S.ha.url && S.ha.token) ha.connect(S.ha.url, S.ha.token);
window.__hemma = { S, home, emit, plan };
window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
window.addEventListener('storage', e => { if (e.key === STORAGE_KEY && syncFromStorage(e.newValue)) { S.sel = null; renderAll(); emit('full'); window.toast('🔄 Uppdaterat från en annan flik'); } });
