// Möbelpanelen (gemensam för demon och huvudappen): mått, val, riktiga produkter (låsta färger/storlekar), material och RAL-färger.
// Värden ändras direkt på möbeln; värden (host) ritar om 3D via changed().
import { FURN, KMODS, KWIDTHS, ELFA_SYS, elfaSys, syncFurniture } from './furniture.js?v=1794425574';
import { MATS, GROUPS, swatch } from './materials.js?v=1794425574';
import { ralSearch, ralFind, ralOf } from './ral.js?v=1794425574';
import { FAMILIES, variantsOf } from './presets.js?v=1794425574';
import { elevationSvg } from './elfastudio.js?v=1794425574';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const QUICK = ['9010', '9001', '1013', '1015', '7044', '7035', '7016', '7021', '9005', '6021', '5014', '3012', '8017', '1019'].map(c => ralFind(c));
export function colorWidget(key, hex, pal) {
  const r = hex ? ralOf(hex) : null;
  const chips = (pal ? pal.map(h => ({ hex: h, name: h })) : QUICK).map(q => `<button style="background:${q.hex}" title="${esc(q.code ? q.code + ' ' + q.name : '')}" data-col="${key}" data-hex="${q.hex}" class="${hex && hex.toUpperCase() === q.hex.toUpperCase() ? 'on' : ''}"></button>`).join('');
  return `<div class="cw" data-cw="${key}"><div class="chips">${chips}</div>
    <div class="in"><input type="text" data-ral="${key}" placeholder="Skriv RAL-kod, t.ex. 7016" value="${r ? esc(r.code + ' ' + r.name) : ''}"><input type="color" data-col="${key}" value="${hex || '#cccccc'}"></div>
    <div class="sugg" data-sugg="${key}"></div><div class="now">${r ? '✓ ' + esc(r.code) + ' · ' + esc(r.name) : hex ? 'Egen färg ' + hex.toUpperCase() : 'Materialets egen färg'}</div></div>`;
}
const fmtNum = (op, v) => op.unit === 'm' ? Math.round(v * 100) + ' cm' : op.unit === '%' ? Math.round(v * 100) + ' %' : v;
function optField(op, it) {
  if (op.t === 'elfa') return `<div class="f"><label>${esc(ELFA_SYS[elfaSys(it.o)].name)} · ${it.o.mods.length} sektioner<b>${Math.round(it.w * 100)} cm</b></label>${elevationSvg(it.o, it.m, { cls: 'esvg' })}
    <button class="btn big acc" data-act="studio">🛠 Öppna Elfa-verkstan</button></div>`;
  const v = it.o[op.k];
  if (op.t === 'sel') return `<div class="f"><label>${op.label}</label><div class="opt">${op.o.map(([val, l]) => `<button data-o="${op.k}" data-v="${esc(JSON.stringify(val))}" class="${v === val ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
  if (op.t === 'num') { if (op.info) return `<div class="info">🪑 Får plats: <b>${v}</b> personer (60 cm bordskant per person)</div>`;
    return `<div class="f"><label>${op.label}<b>${fmtNum(op, v)}</b></label><input type="range" data-o="${op.k}" data-num="1" min="${op.min}" max="${op.max}" step="${op.step}" value="${v}"></div>`; }
  if (op.t === 'bool') return `<div class="row" data-o="${op.k}" data-v="${!v}"><div class="l"><span>${op.label}</span></div><div class="sw ${v ? 'on' : ''}"></div></div>`;
  if (op.t === 'color') return `<div class="f"><label>${op.label}</label>${colorWidget('o:' + op.k, v, op.pal)}</div>`;
  if (op.t === 'mods') { const MD = op.mods || KMODS, WS = op.widths || KWIDTHS.map(w => [w, Math.round(w * 100) + ' cm']);
    return `<div class="f"><label>${op.label}<b>${Math.round(it.w * 100)} cm</b></label><div class="mods">${v.map((m, i) => `<div class="mod">
      <select data-mod="${i}" data-mk="t">${Object.entries(MD).map(([k, K]) => `<option value="${k}" ${k === m.t ? 'selected' : ''}>${K.icon} ${K.name}</option>`).join('')}</select>
      <select data-mod="${i}" data-mk="w">${WS.filter(([w]) => !MD[m.t]?.ws || MD[m.t].ws.includes(w)).map(([w, l]) => `<option value="${w}" ${Math.abs(w - m.w) < .001 ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button data-modmove="${i}" title="Flytta åt vänster">◀</button><button data-moddel="${i}" title="Ta bort">✕</button></div>`).join('')}</div>
      <div class="btns">${(op.add || [['lador', '＋ Lådor'], ['lucka', '＋ Skåp'], ['hogskap', '＋ Högskåp']]).map(([k, l]) => `<button class="btn" data-modadd="${k}">${l}</button>`).join('')}</div></div>`; }
  return '';
}
const dimText = it => `${Math.round(it.w * 100)} × ${Math.round((it.type === 'soffa' && it.o.form && it.o.form !== 'rak' ? it.o.d2 : it.d) * 100)} × ${Math.round(it.h * 100)} cm`;
// panelens innehåll (utan rubrik/knappar – dem ritar värden). it = { type (FURN-nyckel), w, d, h, o, m, family?, preset?, name? }
export function furnPanelHtml(it, { more = false } = {}) {
  const F = FURN[it.type], dims = F.dims || {}, fam = it.family && FAMILIES[it.family];
  if (fam) {
    const vars = variantsOf(it.family), okC = c => (!c.only || c.only.test(it.name || '')) && (!c.when || c.when(it.o));
    const groups = [...new Set(fam.choices.map(c => c.group || ''))].filter(g => !fam.groupIf?.[g] || fam.groupIf[g](it.o));
    const keyOf = g => Object.keys(fam.choices.find(c => (c.group || '') === g).m)[0];
    return `<div class="fp">
      <div class="info">📦 Riktig produkt. Bara storlekar och färger som går att köpa.</div>
      ${vars.length > 1 ? `<div class="f"><label>Modell</label><select data-variant="1">${vars.map(v => `<option ${v.variant === it.preset ? 'selected' : ''}>${esc(v.variant)}</option>`).join('')}</select></div>` : ''}
      <div class="f"><label>Mått<b>${dimText(it)}</b></label></div>
      ${(fam.dims || []).map(k => `<div class="f"><label>${{ w: 'Bredd', d: 'Djup', h: 'Höjd' }[k]}<b>${Math.round(it[k] * 100)} cm</b></label><input type="range" data-dim="${k}" min="${dims[k][0]}" max="${dims[k][1]}" step=".01" value="${it[k]}"></div>`).join('')}
      ${F.opts.filter(op => fam.opts?.includes(op.k) && (!op.if || op.if(it.o))).map(op => optField(op, it)).join('')}
      ${groups.map(g => { const k0 = keyOf(g), cur = it.m[k0]; return `<div class="slot">${g ? `<h4>${esc(g)}</h4>` : `<h4>${esc(fam.label)}</h4>`}<div class="fam">${fam.choices.map((c, i) => (c.group || '') !== g || !okC(c) ? '' :
        `<button data-choice="${i}" class="${cur && cur.mat === c.m[k0].mat && cur.color === c.m[k0].color ? 'on' : ''}" title="${esc(c.name)}"><img src="${swatch(c.m[k0].mat, c.m[k0].color)}"><span>${esc(g && c.name.startsWith(g.split(' ')[0] + ' ') ? c.name.slice(g.split(' ')[0].length + 1) : c.name)}</span></button>`).join('')}</div></div>`; }).join('')}
      ${(fam.fixed || []).map(([a, b]) => `<div class="f"><label>${a}<b>${esc(b)}</b></label></div>`).join('')}
      <button class="small" data-act="unlock">✏️ Gör om till egen möbel (fria mått och färger)</button></div>`;
  }
  const dimRow = (k, label) => dims[k] && !F.fixed ? `<div class="f"><label>${label}<b>${Math.round(it[k] * 100)} cm</b></label><input type="range" data-dim="${k}" min="${dims[k][0]}" max="${dims[k][1]}" step=".01" value="${it[k]}"></div>` : '';
  const main = F.opts.filter(op => (!op.if || op.if(it.o)) && op.t !== 'hid'), first = main.slice(0, 3), rest = main.slice(3);
  const slotHtml = ([k, label, grp]) => { const s = it.m[k]; return `<div class="slot"><h4>${label}<em>${MATS[s.mat]?.name || ''}</em></h4>
    <div class="mats">${GROUPS[grp].map(id => `<button data-mat="${k}" data-id="${id}" class="${s.mat === id ? 'on' : ''}" title="${MATS[id].name}"><img src="${swatch(id, s.mat === id ? s.color : null)}">${MATS[id].name.split(/[ ,]/)[0]}</button>`).join('')}</div>${colorWidget('m:' + k, s.color)}</div>`; };
  // enkelt först: storlek + de viktigaste valen + första materialet; resten bakom "Fler inställningar"
  return `<div class="fp">
    ${it.preset ? `<div class="info">📦 Byggd efter måtten för <b>${esc(it.preset)}</b>. Allt går att ändra.</div>` : ''}
    ${dimRow('w', 'Bredd')}${dimRow('d', 'Djup')}${dimRow('h', 'Höjd')}
    ${first.map(op => optField(op, it)).join('')}
    ${F.slots[0] ? slotHtml(F.slots[0]) : ''}
    ${rest.length || F.slots.length > 1 ? `<button class="more" data-act="more">⚙ Fler inställningar ${more ? '▴' : '▾'}</button>` : ''}
    ${more ? rest.map(op => optField(op, it)).join('') + F.slots.slice(1).map(slotHtml).join('') : ''}
  </div>`;
}

// Händelser. host = { item(): möbeln (FURN-form), changed(full), redraw(), act(name) }
export function bindFurnPanel(P, host) {
  const sel = () => host.item();
  const setColor = (key, hex, soft) => { const it = sel(); if (!it) return; if (key.startsWith('m:')) it.m[key.slice(2)].color = hex; else it.o[key.slice(2)] = hex; host.changed(!soft); };
  const modsOf = it => FURN[it.type].opts.find(x => x.t === 'mods')?.mods || KMODS;
  P.addEventListener('click', e => {
    const it = sel(); if (!it || !FURN[it.type]) return;
    const b = e.target.closest('[data-choice],[data-o],[data-mat],[data-act],[data-col],[data-modadd],[data-moddel],[data-modmove],[data-hexpick]'); if (!b || b.matches('input')) return;
    if (!b.closest('.fp') && !b.dataset.act) return;
    const a0 = b.dataset.act; if (a0 === 'more') { P._more = !P._more; return host.redraw(); } if (a0 && a0 !== 'unlock') return host.act?.(a0);
    host.before?.();
    if (b.dataset.hexpick) return setColor(b.dataset.key, b.dataset.hexpick);
    if (b.dataset.col && b.dataset.hex) return setColor(b.dataset.col, b.dataset.hex);
    if (b.dataset.choice) { const c = FAMILIES[it.family].choices[+b.dataset.choice]; for (const [k, v] of Object.entries(c.m)) it.m[k] = { ...v }; return host.changed(true); }
    if (b.dataset.o) { const op = FURN[it.type].opts.find(x => x.k === b.dataset.o); it.o[op.k] = op.t === 'bool' ? !it.o[op.k] : JSON.parse(b.dataset.v); return host.changed(true); }
    if (b.dataset.mat) { it.m[b.dataset.mat] = { mat: b.dataset.id, color: null }; return host.changed(true); }
    if (b.dataset.modadd) { it.o.mods.push({ t: b.dataset.modadd, w: modsOf(it)[b.dataset.modadd].w }); return host.changed(true); }
    if (b.dataset.moddel) { it.o.mods.splice(+b.dataset.moddel, 1); if (!it.o.mods.length) { const [k, K] = Object.entries(modsOf(it))[0]; it.o.mods.push({ t: k, w: K.w }); } return host.changed(true); }
    if (b.dataset.modmove) { const i = +b.dataset.modmove; if (i > 0) { const m = it.o.mods; [m[i - 1], m[i]] = [m[i], m[i - 1]]; host.changed(true); } return; }
    const a = b.dataset.act; if (!a) return;
    if (a === 'unlock') { delete it.family; it.preset = null; return host.changed(true); }
    if (a === 'more') { P._more = !P._more; return host.redraw(); }
    host.act?.(a);
  });
  P.addEventListener('input', e => {
    const t = e.target, it = sel(); if (!it || !FURN[it.type] || !t.closest('.fp')) return;
    if (!t._c && !t.dataset.ral) { host.before?.(); t._c = 1; }
    if (t.dataset.dim) { it[t.dataset.dim] = +t.value; t.previousElementSibling.querySelector('b').textContent = Math.round(t.value * 100) + ' cm'; host.changed(false); }
    if (t.dataset.o && t.dataset.num) { const op = FURN[it.type].opts.find(x => x.k === t.dataset.o); it.o[op.k] = +t.value; t.previousElementSibling.querySelector('b').textContent = fmtNum(op, +t.value); host.changed(false); }
    if (t.type === 'color' && t.dataset.col) { clearTimeout(t._t); t._t = setTimeout(() => setColor(t.dataset.col, t.value), 60); }
    if (t.dataset.ral) { const key = t.dataset.ral, box = P.querySelector(`[data-sugg="${CSS.escape(key)}"]`), q = t.value;
      const exact = ralFind(q.replace(/[^\d]/g, '').slice(0, 4)), list = ralSearch(q);
      box.innerHTML = list.map(r => `<button data-hexpick="${r.hex}" data-key="${esc(key)}"><i style="background:${r.hex}"></i><b>${r.code}</b> ${esc(r.name)}</button>`).join('') || (q.length > 1 ? '<div class="now">Ingen RAL-kulör hittades</div>' : '');
      if (exact && /^\s*(ral)?\s*\d{4}\s*$/i.test(q)) { setColor(key, exact.hex, true); const now = box.parentElement.querySelector('.now'); if (now) now.textContent = '✓ ' + exact.code + ' · ' + exact.name; } }
  });
  P.addEventListener('change', e => {
    const t = e.target, it = sel(); if (!it || !FURN[it.type] || !t.closest('.fp')) return;
    if (t.dataset.mod !== undefined || t.dataset.variant) host.before?.();
    if (t.dataset.mod !== undefined) { const m = it.o.mods[+t.dataset.mod]; if (t.dataset.mk === 't') { const K = modsOf(it)[t.value]; m.t = t.value; if (!K.ws || !K.ws.includes(m.w)) m.w = K.w; } else m.w = +t.value; host.changed(true); }
    if (t.dataset.dim || t.dataset.num) host.changed(true);
    if (t.dataset.variant) { const v = variantsOf(it.family).find(x => x.variant === t.value); if (v && v.type === it.type) {
      it.o = JSON.parse(JSON.stringify({ ...it.o, ...v.o })); it.preset = v.variant; it.name = v.name; syncFurniture(it); if (v.size) Object.assign(it, v.size); host.changed(true); } }
  });
  P.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.ral) { const b = P.querySelector(`[data-sugg="${CSS.escape(e.target.dataset.ral)}"] button`); if (b) b.click(); } });
}
