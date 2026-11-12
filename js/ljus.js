// Ljus: färgtemperatur (kelvin), RGB och ljusflöde (lumen) – delas av byggverkstan, 3D-vyn och Styr.
// En lampas egenskaper: it.lt = { typ: 'varm'|'kall'|'just'|'rgb', k: 2700, lm: 400, hue: 30, sat: 1 }
//   varm/kall = fast vitt (kelvin går inte att ändra i Styr), just = justerbar vit 2200–6500 K, rgb = färg + justerbar vit.
// Tillståndet i Styr kan välja annan kelvin/färg: it.state.k / it.state.hue / it.state.rgb (true = färg, annars vitt).

export const TYPER = [['varm', 'Varmvit', '2700 K'], ['kall', 'Kallvit', '4000 K'], ['just', 'Justerbar vit', '2200–6500 K'], ['rgb', 'RGB + vit', 'alla färger']];
export const K_MIN = 2200, K_MAX = 6500;
export const DEF = { spot: { typ: 'varm', k: 2700, lm: 350 }, ledlist: { typ: 'varm', k: 2700, lm: 600 } };   // ledlist: lumen per meter
export const lt = it => ({ ...(DEF[it.type] || DEF.spot), ...(it.lt || {}) });

// kelvin → rgb 0..1 (Tanner Helland-kurvan, bra nog för att se skillnad mellan 2200 och 6500 K)
export function kRGB(k) { k /= 100; let r, g, b;
  if (k <= 66) { r = 255; g = 99.47 * Math.log(k) - 161.12; b = k <= 19 ? 0 : 138.52 * Math.log(k - 10) - 305.04; }
  else { r = 329.7 * Math.pow(k - 60, -.1332); g = 288.12 * Math.pow(k - 60, -.0755); b = 255; }
  const c = v => Math.max(0, Math.min(255, v)) / 255; return [c(r), c(g), c(b)]; }
export function hueRGB(h, s = 1) { const f = n => { const k = (n + h / 30) % 12, a = s * .5; return .5 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)]; }
export const css = ([r, g, b]) => `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;

// färgen lampan lyser med just nu
export function lightRGB(it) { const L = lt(it), st = it.state || {};
  if (L.typ === 'rgb' && (st.rgb ?? L.rgb)) return hueRGB(st.hue ?? L.hue ?? 30, st.sat ?? 1);
  const k = L.typ === 'varm' || L.typ === 'kall' ? L.k : (st.k ?? L.k); return kRGB(k); }
// ljusflöde i lumen (ledlist: per meter × längd)
export const lumen = it => { const L = lt(it); return it.type === 'ledlist' ? L.lm * Math.max(.1, it.w || 1) : L.lm; };
// lumen → three.js-intensitet (kalibrerat så att en 350 lm spot ungefär motsvarar tidigare "power 6")
export const power = it => lumen(it) / 58;

// ---------- reglage (samma utseende överallt) ----------
export const LJUS_CSS = `
.lj h6{margin:10px 0 5px;font-size:10.5px;letter-spacing:.08em;color:#8f9a8b;font-weight:600}
.lj .ch{display:flex;flex-wrap:wrap;gap:5px}.lj .ch button{background:#1c221c;border:1px solid #2c342c;color:#e9ede6;border-radius:9px;padding:5px 9px;font:12px system-ui;cursor:pointer}
.lj .ch button.on{border-color:#ff7a2f;background:#2a1d14}
.lj .rw{display:flex;align-items:center;gap:8px;margin:5px 0}.lj .rw label{width:64px;color:#8f9a8b;font-size:12px}.lj .rw output{width:66px;text-align:right;font-size:12.5px;font-variant-numeric:tabular-nums}
.lj input[type=range]{flex:1;accent-color:#ff7a2f;min-width:0}
.lj .bar{height:8px;border-radius:4px;margin:-3px 74px 2px 72px}.lj .kel{background:linear-gradient(90deg,#ff9b3d,#ffc98a,#fff1dc,#f4f6ff,#cfdcff)}.lj .hue{background:linear-gradient(90deg,red,#ff0,lime,cyan,blue,#f0f,red)}
.lj .sw{display:inline-block;width:14px;height:14px;border-radius:50%;vertical-align:-2px;margin-right:6px;box-shadow:0 0 8px currentColor}
`;
// key = vad som ändras (skickas tillbaka i data-lj), L = ljusinställningen, perM = lumen per meter (LED-list)
export function ljusHtml(key, L, { perM = false, title = 'LJUS' } = {}) {
  const lmMax = perM ? 1500 : 1200, col = css(L.typ === 'rgb' && L.rgb ? hueRGB(L.hue ?? 30) : kRGB(L.k));
  return `<div class="lj"><h6><span class="sw" style="background:${col};color:${col}"></span>${title}</h6>
    <div class="ch">${TYPER.map(([v, n]) => `<button data-lj="${key}|typ|${v}" class="${L.typ === v ? 'on' : ''}" title="${n} · ${TYPER.find(t => t[0] === v)[2]}">${n}</button>`).join('')}</div>
    ${L.typ === 'rgb' ? `<div class="ch" style="margin-top:6px"><button data-lj="${key}|rgb|0" class="${!L.rgb ? 'on' : ''}">Vitt</button><button data-lj="${key}|rgb|1" class="${L.rgb ? 'on' : ''}">Färg</button></div>` : ''}
    ${L.typ === 'rgb' && L.rgb ? `<div class="rw"><label>Färg</label><input type="range" min="0" max="359" value="${L.hue ?? 30}" data-ljr="${key}|hue"><output>${L.hue ?? 30}°</output></div><div class="bar hue"></div>`
      : `<div class="rw"><label>Kelvin</label><input type="range" min="${K_MIN}" max="${K_MAX}" step="100" value="${L.k}" data-ljr="${key}|k" ${L.typ === 'varm' || L.typ === 'kall' ? 'disabled' : ''}><output>${L.k} K</output></div><div class="bar kel"></div>`}
    <div class="rw"><label>Ljusflöde</label><input type="range" min="${perM ? 100 : 50}" max="${lmMax}" step="10" value="${L.lm}" data-ljr="${key}|lm"><output>${L.lm} lm${perM ? '/m' : ''}</output></div></div>`;
}
// tillämpa ett klick/reglage på en ljusinställning. Returnerar true om något ändrades.
export function ljusSet(L, field, v) {
  if (field === 'typ') { L.typ = v; if (v === 'varm') L.k = 2700; if (v === 'kall') L.k = 4000; if ((v === 'just' || v === 'rgb') && !L.k) L.k = 3000; return true; }
  if (field === 'rgb') { L.rgb = v === '1'; return true; }
  if (field === 'k' || field === 'lm' || field === 'hue') { L[field] = +v; if (field === 'k' && (L.typ === 'varm' || L.typ === 'kall')) L.typ = 'just'; return true; }
  return false;
}
export const ljusText = L => L.typ === 'rgb' && L.rgb ? `RGB ${L.hue ?? 30}°` : `${L.k} K`;
