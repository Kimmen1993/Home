// Snabbval: kända möbler med deras riktiga mått, t.ex. "billy 80" eller "kallax 4x4".
// Måtten är hämtade från de vanligaste varianterna; färgerna är ungefärliga.
const W = '#f1efe9', SVB = '#2b2420', EK = 'ljusek', BJ = 'bjork';
const fin = { vit: ['matt', W], svartbrun: ['matt', SVB], ek: [EK, null], bjork: [BJ, null], svart: ['matt', '#1c1c1c'], gra: ['matt', '#8e8f8b'] };
const B = (name, type, w, d, h, o = {}, m = {}, kw = '') => ({ name, type, size: { w, d, h }, o, m, kw });
const shelfM = f => ({ stomme: { mat: fin[f][0], color: fin[f][1] } });
const list = [];
// BILLY bokhylla (28 cm djup)
for (const f of ['vit', 'svartbrun', 'ek', 'bjork']) {
  list.push(B('BILLY', 'bokhylla', .8, .28, 2.02, { sektioner: 1, hyllor: 6, bak: true }, shelfM(f), f));
  list.push(B('BILLY', 'bokhylla', .4, .28, 2.02, { sektioner: 1, hyllor: 6, bak: true }, shelfM(f), f));
  list.push(B('BILLY', 'bokhylla', .8, .28, 1.06, { sektioner: 1, hyllor: 3, bak: true }, shelfM(f), f));
  list.push(B('BILLY', 'bokhylla', .8, .28, 2.37, { sektioner: 1, hyllor: 7, bak: true }, shelfM(f), f + ' påbyggnad'));
}
// KALLAX hylla (39 cm djup, 33×33 fack, tjocka skivor)
for (const f of ['vit', 'svartbrun', 'ek']) for (const [c, r] of [[1, 4], [2, 2], [2, 4], [4, 2], [4, 4], [5, 5]]) {
  const w = [0, .42, .77, 0, 1.47, 1.82][c], h = [0, .42, .77, 0, 1.47, 1.82][r];
  list.push(B('KALLAX', 'bokhylla', w, .39, h, { sektioner: c, hyllor: r, bak: false, skiva: .038 }, shelfM(f), `${c}x${r} ${f}`));
}
// PAX garderob (58 cm djup)
for (const f of ['vit', 'svartbrun']) for (const w of [.5, .75, 1.0, 1.5, 2.0]) for (const h of [2.01, 2.36]) {
  const doors = Math.max(1, Math.round(w / .5));
  list.push(B('PAX', 'garderob', w, .58, h, { typ: 'gangjarn', dorrar: doors, frontstil: 'slat', handtag: 'list' }, { front: { mat: 'matt', color: fin[f][1] }, stomme: { mat: 'matt', color: fin[f][1] } }, f));
}
// MALM säng (hög gavel 100 cm)
for (const s of [90, 140, 160, 180]) for (const f of ['vit', 'svartbrun', 'ek'])
  list.push(B('MALM', 'sang', 0, 0, 0, { storlek: s, typ: 'ram', gavel: 'tra', gavelH: 1.0, ben: 'tra' }, { ram: { mat: fin[f][0], color: fin[f][1] }, ben: { mat: fin[f][0], color: fin[f][1] } }, f));
// LACK bord
for (const f of ['vit', 'svart', 'ek']) {
  list.push(B('LACK soffbord', 'soffbord', .9, .55, .45, { form: 'rekt', ben: '4ben', tjocklek: .05, hylla: true }, { skiva: { mat: fin[f][0], color: fin[f][1] }, ben: { mat: fin[f][0], color: fin[f][1] } }, f));
  list.push(B('LACK sidobord', 'soffbord', .55, .55, .45, { form: 'rekt', ben: '4ben', tjocklek: .05, hylla: false }, { skiva: { mat: fin[f][0], color: fin[f][1] }, ben: { mat: fin[f][0], color: fin[f][1] } }, f));
}
// soffor & fåtöljer
list.push(B('KIVIK 3-sits', 'soffa', 2.28, .95, .83, { form: 'rak', sits: 3, armar: 'breda', rygg: 'kuddar', ben: 'dolda' }, {}, ''));
list.push(B('KIVIK 3-sits med schäslong', 'soffa', 2.28, .95, .83, { form: 'schV', d2: 1.63, sits: 3, armar: 'breda', rygg: 'kuddar', ben: 'dolda' }, {}, 'divan'));
list.push(B('EKTORP 3-sits', 'soffa', 2.18, .88, .88, { form: 'rak', sits: 3, armar: 'rundade', rygg: 'kuddar', ben: 'dolda' }, {}, ''));
list.push(B('SÖDERHAMN 3-sits', 'soffa', 1.98, .99, .83, { form: 'rak', sits: 3, armar: 'smala', rygg: 'kuddar', ben: 'metall', benH: .06 }, {}, 'soderhamn'));
list.push(B('KLIPPAN 2-sits', 'soffa', 1.8, .88, .66, { form: 'rak', sits: 2, armar: 'breda', rygg: 'fast', ben: 'dolda', armH: .58, sitth: .42 }, {}, ''));
list.push(B('STRANDMON fåtölj', 'fatolj', .82, .96, 1.01, { vinge: true, armar: 'rundade', rygg: 'fast', ben: 'tra', benH: .12 }, {}, 'öronlapp oronlapp'));
// BESTÅ tv-bänk
for (const w of [1.2, 1.8]) for (const f of ['vit', 'svartbrun', 'ek'])
  list.push(B('BESTÅ TV-bänk', 'tvbank', w, .42, .48, { front: 'luckor', frontstil: 'slat', handtag: 'inga', ben: 'ben' }, { stomme: { mat: fin[f][0], color: fin[f][1] }, front: { mat: fin[f][0], color: fin[f][1] } }, `${f} besta`));
// METOD-kök (60 cm moduler, 63,5 cm bänkdjup)
list.push(B('METOD kök', 'kok', 0, 0, 0, { mods: [{ t: 'kyl', w: .6 }, { t: 'lador', w: .6 }, { t: 'disk', w: .8 }, { t: 'diskmaskin', w: .6 }, { t: 'spis', w: .6 }, { t: 'lador', w: .6 }] }, {}, 'kok kök'));

export const PRESETS = list.map(p => ({ ...p,
  label: `${p.name} ${p.type === 'sang' ? p.o.storlek + '×200' : p.name === 'KALLAX' ? '' : p.size.w ? Math.round(p.size.w * 100) + '×' + Math.round(p.size.h * 100) : ''} ${p.kw.replace('besta', '').replace('divan', '').replace(/oronlapp|öronlapp|kok|kök/g, '')}`.replace(/\s+/g, ' ').trim(),
  dims: p.size.w ? `${Math.round(p.size.w * 100)}×${Math.round(p.size.d * 100)}×${Math.round(p.size.h * 100)} cm` : '' }))
  .map(p => { if (!p.size.w) delete p.size; return p; });

const norm = s => s.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/×/g, 'x');
export function findPreset(q) {
  q = norm(q).trim(); if (q.length < 2) return [];
  const words = q.split(/[\s,]+/).filter(Boolean), nums = words.filter(w => /^\d+$/.test(w)).map(Number);
  const scored = [];
  for (const p of PRESETS) { const text = norm(p.name + ' ' + p.kw + ' ' + p.label); let sc = 0, ok = true;
    for (const w of words) { if (/^\d+x\d+$/.test(w)) { if (text.includes(w)) sc += 8; else sc -= 2; continue; } if (/^\d+$/.test(w)) continue; if (text.includes(w)) sc += 2; else ok = false; }
    if (!ok) continue;
    const pd = p.size ? [p.size.w, p.size.d, p.size.h].map(v => Math.round(v * 100)) : [p.o.storlek, 200];
    for (const n of nums) { if (pd.includes(n)) sc += 3; else if (pd.some(v => Math.abs(v - n) <= 3)) sc += 2; else if (p.kw.includes(n + 'x') || p.kw.includes('x' + n)) sc += 2; else sc -= 1; }
    scored.push([sc, p]); }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]);
}
