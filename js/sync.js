// Synk av husen mellan egna enheter via en fil (hemma.json) i ett PRIVAT GitHub-repo.
// Nyckeln (fine-grained token) skrivs in på varje enhet och sparas bara i den webbläsaren – aldrig i koden.
// localStorage är kvar som lokal kopia: appen fungerar utan nät och synkar när nätet kommer tillbaka.
// Krockar: tre-vägs-sammanslagning per id (hem, våningar, väggar, möbler …) mot senast synkade versionen.

const CFG_KEY = 'hemma.sync', FILE = 'hemma.json', API = 'https://api.github.com';

// ---------- små hjälpare ----------
const b64e = s => { const b = new TextEncoder().encode(s); let o = ''; for (let i = 0; i < b.length; i += 0x8000) o += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(o); };
const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
const canon = d => JSON.stringify(d, null, 1);
const idb = (() => {
  let p; const db = () => p ||= new Promise((res, rej) => { const r = indexedDB.open('hemma-sync', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, f) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('kv', mode), q = f(t.objectStore('kv')); t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); }); };
  return { get: k => tx('readonly', s => s.get(k)), set: (k, v) => tx('readwrite', s => s.put(v, k)), del: k => tx('readwrite', s => s.delete(k)) };
})();

// ---------- sammanslagning ----------
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const byId = a => Array.isArray(a) && a.every(x => isObj(x) && x.id != null);
// base = senast synkade, local = den här enheten, remote = GitHub. Ändrar båda samma sak vinner den här enheten.
export function merge3(base, local, remote) {
  let conflicts = 0;
  const m = (b, l, r) => {
    if (same(l, r)) return l;
    if (same(b, l)) return r;
    if (same(b, r)) return l;
    if (isObj(l) && isObj(r)) {
      const o = {}, bo = isObj(b) ? b : {};
      for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) { const v = m(bo[k], l[k], r[k]); if (v !== undefined) o[k] = v; }
      return o;
    }
    if (byId(l) && byId(r) && (l.length || r.length)) {
      const bm = new Map((byId(b) ? b : []).map(x => [x.id, x])), lm = new Map(l.map(x => [x.id, x])), rm = new Map(r.map(x => [x.id, x])), out = [];
      for (const x of l) { const v = m(bm.get(x.id), x, rm.get(x.id)); if (v !== undefined) out.push(v); }
      for (const x of r) if (!lm.has(x.id)) { const v = m(bm.get(x.id), undefined, x); if (v !== undefined) out.push(v); }
      return out;
    }
    conflicts++;
    return l === undefined ? r : l;   // borttaget på ena sidan men ändrat på andra → behåll ändringen
  };
  const value = m(base, local, remote);
  return { value: JSON.parse(JSON.stringify(value)), conflicts };
}

// ---------- GitHub ----------
export function readCfg() { try { const c = JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); return c?.repo && c?.token ? c : null; } catch (e) { return null; } }
function writeCfg(c) { if (c) localStorage.setItem(CFG_KEY, JSON.stringify(c)); else localStorage.removeItem(CFG_KEY); }

async function gh(c, path, opt = {}) {
  const r = await fetch(`${c.api || API}/repos/${c.repo}${path}`, { cache: 'no-store', ...opt,
    headers: { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opt.headers || {}) } });
  return r;
}
async function fail(r) { let msg = ''; try { msg = (await r.json()).message || ''; } catch (e) {} const e = new Error(`GitHub svarade ${r.status}${msg ? ': ' + msg : ''}`); e.status = r.status; return e; }

// Kollar att repot finns, är privat och går att skriva till.
export async function checkRepo(c) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(c.repo || '')) throw new Error('Skriv repot som ägare/namn, t.ex. Kimmen1993/hemma-data');
  let r; try { r = await gh(c, ''); } catch (e) { throw new Error('Når inte GitHub – är du ansluten till nätet?'); }
  if (r.status === 401) throw new Error('Nyckeln fungerar inte (fel inklistrad eller utgången)');
  if (r.status === 404) throw new Error('Hittar inte repot. Kolla namnet och att nyckeln har åtkomst till just det repot.');
  if (!r.ok) throw await fail(r);
  const j = await r.json();
  if (!j.private) throw new Error('Repot är publikt – då kan vem som helst läsa huset. Gör det privat först (Settings → Danger Zone → Change visibility).');
  if (j.permissions && !j.permissions.push) throw new Error('Nyckeln får bara läsa. Ge den "Contents: Read and write".');
}

let etag = '', lastGet = null;
async function getRemote(c) {
  const r = await gh(c, `/contents/${FILE}`, { headers: etag ? { 'If-None-Match': etag } : {} });
  if (r.status === 304 && lastGet) return lastGet;
  if (r.status === 404) { etag = ''; lastGet = null; return null; }
  if (!r.ok) throw await fail(r);
  const j = await r.json();
  let text;
  if (j.encoding === 'base64' && j.content) text = b64d(j.content);
  else { // filer över 1 MB: hämta som blob
    const b = await gh(c, `/git/blobs/${j.sha}`); if (!b.ok) throw await fail(b);
    text = b64d((await b.json()).content);
  }
  etag = r.headers.get('ETag') || ''; lastGet = { sha: j.sha, text };
  return lastGet;
}
async function putRemote(c, text, sha) {
  const r = await gh(c, `/contents/${FILE}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Hemma sparat ${new Date().toLocaleString('sv-SE')} (${deviceName()})`, content: b64e(text), ...(sha ? { sha } : {}) }) });
  if (!r.ok) throw await fail(r);
  return (await r.json()).content.sha;
}
function deviceName() { const u = navigator.userAgent; return /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : 'webbläsare'; }

// Länk som kopplar en ny enhet (läggs i #, som aldrig skickas till någon server)
export function linkFor(c) { const s = b64e(JSON.stringify({ r: c.repo, t: c.token, ...(c.api ? { a: c.api } : {}) })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); return location.origin + location.pathname + '#koppla=' + s; }
export function cfgFromHash() {
  const m = location.hash.match(/^#koppla=([\w-]+)/); if (!m) return null;
  history.replaceState(null, '', location.pathname + location.search);   // ta bort nyckeln ur adressfältet direkt
  try { const j = JSON.parse(b64d(m[1].replace(/-/g, '+').replace(/_/g, '/'))); return j.r && j.t ? { repo: j.r, token: j.t, ...(j.a ? { api: j.a } : {}) } : null; } catch (e) { return null; }
}

// ---------- själva synken ----------
// getData(): { homes } just nu.  applyData(data, { conflicts }): byt ut husen och rita om.  onStatus(): rita om statusen.
export function createSync({ getData, applyData, onStatus }) {
  let cfg = readCfg(), status = cfg ? 'idle' : 'off', msg = '', lastOk = 0, busy = false, again = false, timer = 0;
  const seen = new Set();   // sha:er vi redan har haft – ett svar med en av dem är bara ett gammalt (cachat) svar
  const set = (s, m = '') => { status = s; msg = m; onStatus?.(); };

  async function run() {
    if (!cfg) return;
    if (busy) { again = true; return; }
    busy = true; set('syncing');
    try {
      for (let tries = 0; ; tries++) {
        const remote = await getRemote(cfg);
        let base = await idb.get('base'), sha = await idb.get('sha');
        if (sha) seen.add(sha);
        let next = getData(), conflicts = 0;
        if (remote && remote.sha !== sha && !seen.has(remote.sha)) {
          const rd = JSON.parse(remote.text), localT = canon(next);
          if (base == null || localT === base) next = rd;
          else ({ value: next, conflicts } = merge3(JSON.parse(base), next, rd));
          if (canon(next) !== localT) applyData(next, { conflicts });
          base = canon(rd); sha = remote.sha; seen.add(sha);
          await idb.set('base', base); await idb.set('sha', sha);
        }
        const nextT = canon(next);
        if (nextT === base) break;
        try { const ns = await putRemote(cfg, nextT, remote ? sha : undefined); seen.add(ns); await idb.set('base', nextT); await idb.set('sha', ns); break; }
        catch (e) { if ((e.status === 409 || e.status === 422) && tries < 3) { etag = ''; continue; } throw e; }   // någon annan hann före – hämta, slå ihop, försök igen
      }
      lastOk = Date.now(); set('ok');
    } catch (e) {
      console.warn('Synk:', e);
      const net = !navigator.onLine || e instanceof TypeError;   // fetch kastar TypeError när nätet/GitHub inte nås
      set(net ? 'offline' : 'error', net ? 'Når inte GitHub just nu – allt är sparat på enheten och synkas senare' : e.status === 401 ? 'Nyckeln fungerar inte längre – koppla om enheten' : e.message);
    }
    busy = false;
    if (again) { again = false; run(); }
  }

  // Första kopplingen på en enhet. mode: 'take' = hämta huset från GitHub (det lokala sparas som reservkopia), 'merge' = behåll båda.
  async function link(c, mode) {
    await checkRepo(c);
    etag = ''; lastGet = null; seen.clear();
    const remote = await getRemote(c), local = getData();
    if (!remote) { const t = canon(local), ns = await putRemote(c, t); await idb.set('base', t); await idb.set('sha', ns); seen.add(ns); }
    else {
      const rd = JSON.parse(remote.text);
      if (mode === 'take') { await idb.set('backup', canon(local)); applyData(rd, {}); }
      else applyData(merge3({ homes: [] }, local, rd).value, {});
      await idb.set('base', canon(rd)); await idb.set('sha', remote.sha); seen.add(remote.sha);
    }
    cfg = c; writeCfg(c); lastOk = Date.now(); set('ok');
    if (remote && mode !== 'take') run();   // ladda upp det sammanslagna
    return { uploaded: !remote };
  }
  // Finns det redan ett hus på GitHub? (för att kunna fråga innan något skrivs över)
  async function peek(c) {
    await checkRepo(c);
    etag = ''; lastGet = null;
    const remote = await getRemote(c);
    return remote ? { homes: JSON.parse(remote.text).homes.map(h => h.name) } : null;
  }
  async function unlink() { cfg = null; writeCfg(null); await idb.del('base'); await idb.del('sha'); etag = ''; lastGet = null; seen.clear(); set('off'); }

  // Efter varje lokal sparning: synka en stund senare (samlar ihop många små ändringar till en).
  function schedule() { if (!cfg) return; clearTimeout(timer); timer = setTimeout(run, 6000); }
  const now = () => { clearTimeout(timer); return run(); };
  setInterval(() => { if (cfg && !document.hidden) run(); }, 20000);
  document.addEventListener('visibilitychange', () => { if (cfg) now(); });
  window.addEventListener('online', () => { if (cfg) now(); });
  if (cfg) setTimeout(now, 500);

  return {
    link, peek, unlink, schedule, now,
    get cfg() { return cfg; }, get status() { return status; }, get msg() { return msg; }, get lastOk() { return lastOk; },
    backup: () => idb.get('backup'),
  };
}
