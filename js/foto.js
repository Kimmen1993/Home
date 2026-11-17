// 📷 Foto: räknar fram en realistisk bild av 3D-vyn med path tracing (riktigt ljus, skuggor, reflektioner).
// Allt sker i webbläsaren. Bilden blir exakt det som syns i 3D: samma kamera, samma tända lampor, dag eller kväll.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const SIZES = { utkast: 1280, fin: 1920, stor: 2560 };
const GOAL = { utkast: 60, fin: 200, stor: 400 };
let lib = null;   // three-gpu-pathtracer laddas först när någon tar en bild
const loadLib = () => lib ??= import('three-gpu-pathtracer');
// path tracern läser scene.backgroundRotation/environmentRotation, som kom i Three r162 – appen kör r160
for (const k of ['backgroundRotation', 'environmentRotation']) if (!(k in THREE.Scene.prototype) && !(k in new THREE.Scene()))
  Object.defineProperty(THREE.Scene.prototype, k, { configurable: true, get() { return this['_' + k] ??= new THREE.Euler(); } });

export function openFoto(view, { day, name = 'Hemma' } = {}) {
  if (document.querySelector('.foto')) return;   // redan öppen
  let size = 'fin', exposure = 1, denoise = true, pt = null, renderer = null, stopped = false, done = false, raf = 0, t0 = 0, run = 0;
  const ov = document.createElement('div'); ov.className = 'foto';
  ov.innerHTML = `<div class="fbox">
    <div class="fhead"><b>📷 Foto av vyn</b><span class="fstat" id="fStat">Förbereder …</span><button class="fx" data-f="close" title="Stäng">✕</button></div>
    <div class="fwrap" id="fWrap"><div class="fwait" id="fWait">Bygger upp rummet för ljusberäkning …</div></div>
    <div class="fbar"><div class="fprog"><i id="fProg"></i></div></div>
    <div class="ftools">
      <div class="seg">${Object.keys(SIZES).map(k => `<button data-size="${k}" class="${k === size ? 'on' : ''}">${{ utkast: 'Snabb', fin: 'Fin', stor: 'Stor' }[k]}</button>`).join('')}</div>
      <label class="fexp" title="Jämnar ut kornen medan bilden räknas"><input type="checkbox" id="fDen" checked> Brusfri</label>
      <label class="fexp">☀︎ Ljus <input type="range" min="0.3" max="3" step="0.05" value="1" id="fExp"></label>
      <span class="sp"></span>
      <button class="btn" data-f="stop" id="fStop">⏸ Klar nu</button>
      <button class="btn acc" data-f="save" id="fSave" disabled>⬇ Spara bild</button>
    </div>
    <p class="note">${day ? '☀️ Dagsljus' : '🌙 Kvällsljus'} · tända lampor och tv lyser som i 3D. Bilden blir skarpare ju längre den räknas. Vrid vyn och tryck 📷 igen för en ny vinkel.</p>
  </div>`;
  document.body.appendChild(ov);
  const $ = s => ov.querySelector(s), stat = $('#fStat'), prog = $('#fProg');

  async function start() {
    const my = ++run; stopped = false; done = false; $('#fSave').disabled = true; $('#fStop').disabled = false;
    cleanup(); stat.textContent = 'Förbereder …'; prog.style.width = '0%';
    let L; try { L = await loadLib(); } catch (e) { stat.textContent = '⚠️ Kunde inte ladda ljusberäkningen – är du uppkopplad?'; return; }
    if (my !== run) return;
    const W = SIZES[size], H = Math.round(W / view.cam.aspect);
    renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposure;
    renderer.domElement.className = 'fcanvas';
    try { pt = new L.WebGLPathTracer(renderer); } catch (e) { console.error(e); stat.textContent = '⚠️ Ljusberäkningen kunde inte starta på den här datorn'; return; }
    Object.assign(pt, { renderDelay: 0, minSamples: 0, fadeDuration: 0, dynamicLowRes: false, rasterizeScene: false, bounces: 5, transmissiveBounces: 3, filterGlossyFactor: .5 });
    // brusreducering när bilden visas – tar bort kornen, kanterna behålls
    const dq = new FullScreenQuad(new L.DenoiseMaterial({ map: null, sigma: 4, kSigma: 1, threshold: .04 }));
    pt.renderToCanvasCallback = (target, r, quad) => { const ac = r.autoClear; r.autoClear = false;
      if (denoise) { dq.material.map = target.texture; dq.material.threshold = Math.max(.04, .8 / Math.sqrt(Math.max(1, pt.samples))); dq.material.sigma = 5; dq.render(r); }   // starkare i början, svagare när bilden blivit skarp
      else quad.render(r); r.autoClear = ac; };
    // bilden räknas i bitar, så att grafikkortet aldrig jobbar så länge i ett svep att webbläsaren startar om det
    const nt = Math.max(2, Math.ceil(Math.sqrt(W * H / 1000000))); pt.tiles.set(nt, nt);
    renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); if (my !== run) return; stopped = true; stat.textContent = '⚠️ Grafikkortet orkade inte – prova Snabb, eller spara det som hunnit räknas'; });
    const cam = view.cam.clone(); cam.aspect = W / H; cam.updateProjectionMatrix();
    const sky = new L.GradientEquirectTexture(256);
    if (day) { sky.topColor.set(0xbcd2ee); sky.bottomColor.set(0x8d877c); sky.exponent = 2; } else { sky.topColor.set(0x0b1222); sky.bottomColor.set(0x050506); sky.exponent = 2; }
    sky.update();
    const kit = view.tools.photoScene({ env: sky, envIntensity: day ? 1 : .35 });
    try { pt.setScene(kit.scene, cam); }   // allt efter laddningen sker i ett svep – inget annat hinner starta emellan
    catch (e) { console.error(e); stat.textContent = '⚠️ Ljusberäkningen kunde inte starta på den här datorn'; kit.restore(); return; }
    kit.restore();
    if (my !== run) return;
    $('#fWait')?.remove(); $('#fWrap').appendChild(renderer.domElement);
    t0 = performance.now();
    const goal = GOAL[size];
    // Broms: nästa bit skickas först när grafikkortet är klart med den förra (fence). Annars växer kön tills webbläsaren
    // startar om grafikkortet. Är kortet snabbt hinner flera bitar köras per tick, inom ca 14 ms.
    const gl = renderer.getContext(); let tm = 0, fence = null;
    const ready = () => { if (!fence) return true; const r = gl.clientWaitSync(fence, 0, 0); if (r === gl.TIMEOUT_EXPIRED) return false; gl.deleteSync(fence); fence = null; return true; };
    const loop = () => {
      cancelAnimationFrame(raf); clearTimeout(tm);
      if (my !== run || stopped || !pt) return;
      const tEnd = performance.now() + 14;
      while (ready() && performance.now() < tEnd) { pt.renderSample(); fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush(); if (pt.samples >= goal) break; }
      const n = Math.floor(pt.samples), s = (performance.now() - t0) / 1000;
      prog.style.width = Math.min(100, n / goal * 100) + '%';
      const left = n > 2 ? (goal - n) * s / n : 0;
      stat.textContent = `${n} av ${goal} varv · ${s.toFixed(0)} s` + (left > 5 ? ` · ca ${left > 90 ? Math.round(left / 60) + ' min' : Math.round(left) + ' s'} kvar` : '');
      if (n >= 1) $('#fSave').disabled = false;
      if (n >= goal) { finish(); return; }
      raf = requestAnimationFrame(loop); tm = setTimeout(loop, 30);   // det som kommer först – rAF står still när fönstret är dolt
    };
    loop();
  }
  function finish() { stopped = true; done = true; cancelAnimationFrame(raf); $('#fStop').disabled = true; stat.textContent = `✔ Klar · ${Math.floor(pt.samples)} varv · ${((performance.now() - t0) / 1000).toFixed(0)} s`; prog.style.width = '100%'; view.tools.pause(false); }
  function cleanup() { cancelAnimationFrame(raf); if (pt) { try { pt.dispose(); } catch (e) { /* biblioteket 0.0.23 kan fela här – renderaren slängs ändå */ } pt = null; } if (renderer) { renderer.domElement.remove(); renderer.dispose(); renderer.forceContextLoss(); renderer = null; } ov.querySelectorAll('.fcanvas').forEach(c => c.remove()); }
  function close() { run++; cleanup(); view.tools.pause(false); ov.remove(); document.removeEventListener('keydown', onKey); }
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  ov.addEventListener('click', e => { const b = e.target.closest('button'); if (e.target === ov) return close(); if (!b) return;
    if (b.dataset.f === 'close') close();
    if (b.dataset.f === 'stop') finish();
    if (b.dataset.f === 'save' && renderer) renderer.domElement.toBlob(bl => { const a = document.createElement('a'); a.href = URL.createObjectURL(bl);
      const d = new Date(), p = n => String(n).padStart(2, '0'); a.download = `${name} ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, 'image/png');
    if (b.dataset.size && b.dataset.size !== size) { size = b.dataset.size; ov.querySelectorAll('[data-size]').forEach(x => x.classList.toggle('on', x === b)); view.tools.pause(true); start(); } });
  $('#fDen').addEventListener('change', e => { denoise = e.target.checked; if (done && pt) pt.renderSample(); });
  $('#fExp').addEventListener('input', e => { exposure = +e.target.value; if (renderer) { renderer.toneMappingExposure = exposure; if (done && pt) pt.renderSample(); } });

  view.tools.pause(true);   // 3D-vyn står still medan bilden räknas, så hela grafikkortet jobbar med bilden
  start();
}
