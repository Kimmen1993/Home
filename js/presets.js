// Snabbval: kända möbler (IKEA, MIO, ILVA, Rustikunik, Hemtex) med deras riktiga mått, t.ex. "billy 80" eller "kallax 4x4".
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
// MIO Rossi (låg, djup modulsoffa: djup 112, höjd 86, sitthöjd 44, armstöd 16 cm, fyrkantiga ben 4,5 cm)
const ROSSI = { armar: 'raka', armH: .62, rygg: 'kuddar', sitth: .44, ben: 'kloss', benH: .045, kuddar: 2 };
// tygerna som går att beställa (mio.se, nov 2026) + utgångna tyger som folk har hemma. Färgen är snittet av MIO:s tygprov, lite uppljusat.
const ROSSI_TYG = { Alex: ['Chenille', 'tyg', [['light grey', '#9b9996'], ['medium grey (utgått)', '#82807d'], ['stone', '#696664'], ['beige', '#a3958e'], ['moss', '#272c18'], ['offwhite', '#d6c7bc'], ['brown', '#544a3f']]],
  Aurora: ['Bouclé', 'boucle', [['moss', '#333d2f'], ['pearl', '#bbb4a6'], ['beige', '#796d60'], ['deep terra', '#612e1b'], ['red', '#50131e'], ['amber', '#74501d'], ['deep blue', '#1b252c'], ['grey', '#5f5f5a']]],
  Casa: ['Chenille', 'tyg', [['beige', '#938578'], ['moss', '#3d3a26']]],
  Grand: ['Sammet', 'sammet', [['light grey', '#7e796d'], ['beige', '#78664f'], ['grey', '#393f3a'], ['khaki', '#524b39'], ['rust', '#8d5038'], ['yellow', '#ad7a40']]],
  Iberia: ['Slätvävd', 'tyg', [['offwhite', '#abaa9d'], ['greige', '#897f73'], ['grey', '#676560'], ['beige', '#76685c'], ['dark grey', '#3d3f3e'], ['espresso', '#37342f']]],
  Zoom: ['Manchester', 'sammet', [['cream', '#c4b7ad'], ['beige', '#897a6e'], ['brown', '#554a42'], ['mustard', '#8d642d'], ['moss', '#323b2f'], ['azur', '#334647'], ['ash', '#555252'], ['light aqua', '#5f7a7a']]] };
const lift = (hex, k) => '#' + [1, 3, 5].map(i => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k)).toString(16).padStart(2, '0')).join('');
const ROSSI_CHOICES = Object.entries(ROSSI_TYG).flatMap(([q, [typ, mat, cols]]) => cols.map(([n, hex]) => { const c = lift(hex, 1.18);
  return { name: `${q} ${n}`, group: `${q} · ${typ}`, hex: c, m: { kladsel: { mat, color: c }, kuddar: { mat, color: c } } }; }));
const rossiM = { ...ROSSI_CHOICES.find(c => c.name === 'Alex offwhite').m, ben: { mat: 'matt', color: '#3a2c22' } };
for (const [n, w, sits, extra, kw] of [['Rossi 1,5-sits', 1.38, 1, {}, ''], ['Rossi 2-sits', 1.58, 1, {}, ''], ['Rossi 3-sits', 2.42, 2, {}, ''], ['Rossi 3-sits hel dyna', 2.42, 1, {}, ''],
  ['Rossi 4-sits', 2.82, 2, {}, ''], ['Rossi hörnsoffa vänster', 2.32, 1, { form: 'hornV', d2: 2.32 }, 'horn'], ['Rossi hörnsoffa höger', 2.32, 1, { form: 'hornH', d2: 2.32 }, 'horn']])
  list.push(B('MIO ' + n, 'soffa', w, 1.12, .86, { ...ROSSI, sits, form: 'rak', ...extra }, rossiM, kw));
// Rossi med schäslong byggs av moduler (mio.se): schäslong 122 / schäslong XL 142 cm (190 djup) + ev. mittdel utan armstöd
// (1,5-sits 106 / 2-sits 126) + ändmodul med armstöd (1,5-sits 122 / 2-sits 142). Sittplatser räknas som MIO: schäslong 1, 1,5-sits 1, 2-sits 2.
for (const [side, sk] of [['vänster', 'schV'], ['höger', 'schH']]) for (const [cw, xl] of [[1.22, false], [1.42, true]]) for (const mid of [null, ['1,5-sits', 1.06, 1], ['2-sits', 1.26, 2]]) for (const [en, ew, es] of [['1,5-sits', 1.22, 1], ['2-sits', 1.42, 2]]) {
  const W = +(cw + (mid ? mid[1] : 0) + ew).toFixed(2), seats = 1 + (mid ? mid[2] : 0) + es, parts = [`schäslong${xl ? ' XL' : ''}`, ...(mid ? [mid[0] + ' utan armstöd'] : []), en];
  const name = `MIO Rossi ${seats}-sits med schäslong${xl ? ' XL' : ''} ${side}, ${Math.round(W * 100)} cm`; if (list.some(p => p.name === name)) continue;
  list.push({ ...B(name, 'soffa', W, 1.12, .86, { ...ROSSI, sits: 2 + (mid ? 1 : 0), form: sk, d2: 1.9 }, rossiM,
    `divan ${parts.join(' + ')}${xl && !mid && ew > 1.3 ? ' 2-sits soffa med schäslong xl' : ''}`), hk: 1 }); }
// ILVA Dahl matstol (helklädd karmstol 60×61×80, sitthöjd 49)
const DAHL_CHOICES = [['Austin Antelope (gråbrun)', '#8a7763'], ['Grön', '#3d4636']].map(([name, hex]) => ({ name, hex, m: { sits: { mat: 'tyg', color: hex }, stomme: { mat: 'tyg', color: hex } } }));
list.push(B('ILVA Dahl matstol', 'stol', .6, .61, .8, { stil: 'karm', sitth: .49, armH: .66 }, DAHL_CHOICES[0].m, 'karmstol'));
// MIO Väderö ställbar säng (90×200 per säng, 65 cm hög med 18 cm ben) + fristående gavel 181/91 × 121 × 10 cm
const VADERO_CHOICES = [['Barrel', 'mullvad', '#8f7d69'], ['Barrel', 'ljusbeige', '#a29892'], ['Barrel', 'ljusgrå', '#a49b96'], ['Verita', 'mullvad', '#504338'], ['Verita', 'ljusbeige', '#c8bbb1'],
  ['Verita', 'ljusgrå', '#8b857b'], ['Maloy', 'grå', '#8d8780'], ['Maloy', 'beige', '#9f9383'], ['Maloy', 'antracit', '#232728']].map(([q, n, hex]) => { const c = lift(hex, 1.15);
  return { name: `${q} ${n}`, group: `Tyg ${q}`, hex: c, m: { gavel: { mat: 'tyg', color: c } } }; });
for (const s of [180, 90]) for (const [g, gn] of [['pikerad', 'pikerad'], ['stoppad', 'slät'], ['ribbad', 'ribbad']])
  list.push(B(`MIO Väderö ställbar ${s === 180 ? 'dubbelsäng 180 (2×90)' : 'enkelsäng 90'}, gavel ${gn}`, 'sang', 0, 0, 0,
    { storlek: s, typ: 'stallbar', gavel: g, gavelH: 1.21, gavelT: .1, overkast: false, kuddar: 1 }, { ...VADERO_CHOICES[2].m, ben: { mat: 'krom', color: null } }, 'vadero ställbar'));
// Rustikunik Design (handgjort i Värmland): 4 cm skiva, matbord 74 cm högt, iläggsskivor 50 cm. Kulörer från deras kulörprov.
const RK_EK = [['Hårdvaxolja ofärgad', '#a87750'], ['Hårdvaxolja natur', '#b5927a'], ['Hårdvaxolja vit', '#dbc8ba'], ['Hårdvaxolja vit Glacier', '#e1d3ca'], ['Silvergrå', '#937e6c'], ['Rustikgrå', '#615348'],
  ['Valnöt', '#604134'], ['Rökt ek', '#493b33'], ['Mörk ek', '#43342f'], ['Tjära', '#3d3128'], ['Grafitsvart', '#2b292a']].map(([n, hex]) => { const c = lift(hex, 1.12);
  return { name: n, group: 'Ek', hex: c, m: { skiva: { mat: 'ek', color: c }, ben: { mat: 'ek', color: c } } }; });
const rkM = RK_EK.find(c => c.name === 'Grafitsvart').m;
for (const d of [1.0, 1.1, 1.2, 1.3, 1.4, 1.5]) for (const n of [0, 1, 2, 3])
  list.push(B(`Rustikunik runt matbord, täta ribbor Ø${Math.round(d * 100)}${n ? `, ${n} iläggsskiv${n > 1 ? 'or' : 'a'}` : ''}`, 'matbord', d, d, .74, { form: 'rund', ben: 'ribbor', tjocklek: .04, ilagg: n, utdragen: false }, rkM, 'rustikunik'));
for (const w of [.9, 1.0, 1.1, 1.2, 1.3, 1.4]) for (const dd of [.5, .6, .7, .8])
  list.push(B(`Rustikunik rektangulärt soffbord, kub ${Math.round(w * 100)}×${Math.round(dd * 100)}`, 'soffbord', w, dd, .48, { form: 'rekt', ben: 'kub', tjocklek: .04, hylla: false }, rkM, 'rustikunik'));
// Hemtex Mali sammet: 135 cm bred per längd, 240 eller 300 cm lång, multiband. 1 längd per förpackning.
const MALI = [['beige', '#a29081'], ['grå', '#413f3b'], ['ljusgrå', '#848285'], ['taupe', '#7a6f6b'], ['valnöt', '#4e3d35'], ['grön', '#585447'], ['mörkgrön', '#334343'], ['mörkblå', '#2a2f3c'], ['svart', '#222121']]
  .map(([n, hex]) => { const c = lift(hex, 1.2); return { name: n, hex: c, m: { tyg: { mat: 'sammet', color: c } } }; });
for (const L of [2.4, 3.0]) for (const n of [1, 2, 3, 4])
  list.push(B(`Hemtex Mali sammet, ${n} längd${n > 1 ? 'er' : ''} 135×${Math.round(L * 100)}`, 'gardin', Math.min(3.2, .8 * n), .32, 2.45, { langder: n, bredd: 1.35, langd: L, stangH: 2.45, oppen: true, stang: true }, MALI[1].m, 'gardin'));
// BESTÅ tv-bänk
for (const w of [1.2, 1.8]) for (const f of ['vit', 'svartbrun', 'ek'])
  list.push(B('BESTÅ TV-bänk', 'tvbank', w, .42, .48, { front: 'luckor', frontstil: 'slat', handtag: 'inga', ben: 'ben' }, { stomme: { mat: fin[f][0], color: fin[f][1] }, front: { mat: fin[f][0], color: fin[f][1] } }, `${f} besta`));
// METOD-kök (60 cm moduler, 63,5 cm bänkdjup)
list.push(B('METOD kök', 'kok', 0, 0, 0, { mods: [{ t: 'kyl', w: .6 }, { t: 'lador', w: .6 }, { t: 'disk', w: .8 }, { t: 'diskmaskin', w: .6 }, { t: 'spis', w: .6 }, { t: 'lador', w: .6 }] }, {}, 'kok kök'));

// Elfa Classic, Click-in toppupphängt (Elfas prislista): sektioner cc 451/607/902, grenar 988/1532/2140/2300 mm, hyllor 305/405/494 djupa.
// Startpaketen (1242 och 1862 × 445 × 2140) är måttade för Elfas skjutdörrar. Systemet finns i vit, platina och grafit; Décor-trä i vit och grå.
// Färger per system: Classic vit/platina/grafit (fristående bara vit, lådsystem vit/grafit), Décor+ matt vit/matt grå metall + trä i vit, grå, natur björk.
const ES = (n, hex, when, mat = 'pulver') => ({ name: n, hex, group: 'Metall', when, m: { stomme: { mat, color: hex } } });
const isS = (...a) => o => a.includes(o.system || 'topp');
const ELFA_COL = [ES('Vit', '#f2f2f0', isS('topp', 'frist', 'hylla', 'lada')), ES('Platina', '#bdbab3', isS('topp', 'hylla')), ES('Grafit', '#3a3b3d', isS('topp', 'hylla', 'lada')),
  ES('Matt vit', '#eeeeea', isS('decor')), ES('Matt grå', '#4d4d4b', isS('decor')),
  ...[['Décor vit', '#e6ddd0', 'topp'], ['Décor grå', '#8d8781', 'topp'], ['Vit', '#ece6dc', 'decor'], ['Grå', '#8a847d', 'decor'], ['Natur björk', '#d9bf98', 'decor']]
    .map(([n, hex, sy]) => ({ name: n, hex, group: 'Trä', when: isS(sy), m: { decor: { mat: sy === 'decor' && n.includes('björk') ? 'bjork' : 'ek', color: hex } } }))];
const S6 = .607, S9 = .902, S4 = .451;
for (const [n, system, mods, djup, gren, h, extra = {}] of [
  ['Classic startpaket 124 (2 sektioner)', 'topp', [['hang', S6], ['hang', S6]], .405, 2.14, 2.17],
  ['Classic startpaket 186 (3 sektioner)', 'topp', [['hang', S6], ['hang', S6], ['hang', S6]], .405, 2.14, 2.17],
  ['Classic klädkammare 4 sektioner', 'topp', [['dubbel', S6], ['lador', S6], ['hang', S6], ['hyllor', S6]], .405, 2.14, 2.2],
  ['Classic klädkammare 5 sektioner', 'topp', [['hang', S6], ['dubbel', S6], ['lador', S6], ['skor', S6], ['dubbel', S6]], .405, 2.14, 2.2],
  ['Classic hall 30 djup', 'topp', [['hang', S9], ['skor', S6]], .305, 1.532, 2.0],
  ['Classic förråd hyllor 50 djup', 'topp', [['hyllor', S9], ['hyllor', S9]], .494, 2.14, 2.2],
  ['Décor+ klädkammare 3 sektioner', 'decor', [['dubbel', S6], ['lador', S6], ['hang', S6]], .405, 2.14, 2.2],
  ['Classic fristående 3 sektioner', 'frist', [['hang', S6], ['lador', S6], ['dubbel', S6]], .405, 0, 0, { hojd: 2.2 }],
  ['Classic fristående låg 2 sektioner', 'frist', [['hyllor', S6], ['hyllor', S6]], .405, 0, 0, { hojd: 1.11 }],
  ['hyllsystem bokhylla 3 sektioner', 'hylla', [['hyllor', S9], ['hyllor', S9], ['hyllor', S9]], .25, 1.98, 2.1],
  ['lådsystem 3 lådhurtsar', 'lada', [['mix', .45], ['sma', .45], ['mix', .45]], .535, 0, 0, { ram: .74 }]])
  list.push(B(`Elfa ${n}`, 'elfa', 0, 0, 0, { system, mods: mods.map(([t, w]) => ({ t, w })), djup, gren: gren || 2.14, skenaH: h || 2.2, decor: false, klader: true, farg: ELFA_COL.find(c => c.when({ system })).name, ...extra },
    { stomme: ELFA_COL.find(c => c.when({ system })).m.stomme, decor: ELFA_COL.find(c => c.group === 'Trä' && c.when({ system: system === 'decor' ? 'decor' : 'topp' })).m.decor, stang: { mat: 'rostfritt', color: '#cfd1d3' } },
    'elfa garderobsinredning kladkammare'));
// Elfa skjutdörrar (måttbeställda, upp till 2700 mm höga). Profil: Silver, Sanded White, Sanded Black. Artic och Vista har lite olika fyllningar.
const DF = (n, mat, hex, only) => ({ name: n, hex, group: 'Fyllning', only, m: { fyll1: { mat, color: hex } } });
const ART = /Artic/, VIS = /Vista/;
const ELFA_DOOR = [
  ...[['Silver', 'pulver', '#c9cbcd'], ['Sanded White', 'pulver', '#ecebe6'], ['Sanded Black', 'pulver', '#232323']].map(([n, mat, hex]) => ({ name: n, hex, group: 'Profil', m: { profil: { mat, color: hex } } })),
  DF('Vit melamin', 'laminat', '#f1f0ec'), DF('Kritvit melamin', 'laminat', '#f7f6f1'), DF('Antikvit melamin', 'laminat', '#ebe4d6'), DF('Ljusgrå melamin', 'laminat', '#c9c8c3'),
  DF('Betonggrå melamin', 'laminat', '#9a9893'), DF('Grafitgrå melamin', 'laminat', '#4a4b4c'), DF('Sandbeige melamin', 'laminat', '#cdbfa8'), DF('Natural clay', 'laminat', '#b9a593'),
  DF('Misty grey', 'laminat', '#a7a9a6', ART), DF('Arctic night', 'laminat', '#2f3540', ART), DF('Glossy white', 'lack', '#f5f5f2'),
  DF('Ek melamin', 'ek', '#c99f72'), DF('Ljus ek melamin', 'ljusek', '#dcc6a6'), DF('Vit ek melamin', 'ljusek', '#e9e0d2'), DF('Mörk ek melamin', 'ek', '#6b4f38'), DF('Svart ek melamin', 'svartask', '#2d2a27'),
  DF('Klar spegel', 'spegel', '#e9eef0'), DF('Grå spegel', 'spegel', '#7d8388'), DF('Brons spegel', 'spegel', '#a68d73'),
  DF('Vitt glas', 'lack', '#f4f4f2'), DF('Svart glas', 'lack', '#151515', VIS), DF('Klart härdat glas', 'glas', '#f4f8f8', ART), DF('Frostat härdat glas', 'frostat', '#eef1ef', ART),
  DF('Frostat vitt glas', 'frostat', '#f6f6f2', ART), DF('Frostat svart glas', 'frostat', '#2a2a2b', ART), DF('Linjeglas', 'frostat', '#e6ebe9', ART),
  ...[['Klar spegel', 'spegel', '#e9eef0'], ['Grå spegel', 'spegel', '#7d8388'], ['Brons spegel', 'spegel', '#a68d73'], ['Vitt glas', 'lack', '#f4f4f2'], ['Svart glas', 'lack', '#151515']]
    .map(([n, mat, hex]) => ({ name: n, hex, group: 'Fyllning 2', m: { fyll2: { mat, color: hex } } }))];
for (const [ser, mods] of [['Artic', ['plain', 'trio', 'quattro', 'penta']], ['Vista', ['duo', 'trio', 'quattro', 'penta']]]) for (const md of mods)
  list.push(B(`Elfa skjutdörrar ${ser} ${md[0].toUpperCase() + md.slice(1)}`, 'skjutdorr', 1.8, .1, 2.4, { dorrar: 2, modell: md, profilstil: ser.toLowerCase(), samma: md === 'plain', oppen: 0 },
    { profil: ELFA_DOOR[0].m.profil, fyll1: ELFA_DOOR.find(c => c.name === 'Vit melamin').m.fyll1, fyll2: ELFA_DOOR.find(c => c.group === 'Fyllning 2').m.fyll2 }, 'elfa skjutdorr garderobsdorr spegeldorr spegel'));

export const PRESETS = list.map(p => ({ ...p,
  label: `${p.name} ${/^(MIO|ILVA|Rustikunik|Hemtex|Elfa) /.test(p.name) ? '' : p.type === 'sang' ? p.o.storlek + '×200' : p.name === 'KALLAX' || /^(MIO|ILVA|Rustikunik|Hemtex) /.test(p.name) ? '' : p.size.w ? Math.round(p.size.w * 100) + '×' + Math.round(p.size.h * 100) : ''} ${p.hk ? '' : p.kw.replace('besta', '').replace('divan', '').replace(/oronlapp|öronlapp|kok|kök|karmstol|horn|vadero ställbar|rustikunik|gardin|elfa|garderobsinredning|kladkammare|skjutdorr|garderobsdorr|spegeldorr|spegel/g, '')}`.replace(/\s+/g, ' ').trim(),
  dims: p.size.w ? `${Math.round(p.size.w * 100)}×${Math.round((p.o.d2 || p.size.d) * 100)}×${Math.round(p.size.h * 100)} cm` : '' }))
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
    for (const n of nums) { if (n < 10 && (text.includes(n + '-sits') || text.includes(n + ' ilaggsskiv') || text.includes(n + ' langd') || text.includes(n + ' sektioner'))) sc += 4; else if (pd.includes(n)) sc += 3; else if (pd.some(v => Math.abs(v - n) <= 3)) sc += 2; else if (p.kw.includes(n + 'x') || p.kw.includes('x' + n)) sc += 2; else sc -= 1; }
    scored.push([sc, p]); }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]);
}

// ---------- fasta produkter: bara det som går att köpa ----------
// Varje familj listar de färger/tyger som finns. En möbel från en familj får bara byta mellan dem (och mellan familjens storlekar).
const FIN_NAME = { vit: 'Vit', svartbrun: 'Svartbrun', ek: 'Ekfaner/ekbets', bjork: 'Björkfaner', svart: 'Svart', gra: 'Grå' };
const finish = (fs, slots) => fs.map(f => ({ name: FIN_NAME[f], hex: fin[f][1] || (f === 'ek' ? '#c9a77a' : '#dcc39c'), mat: fin[f][0],
  m: Object.fromEntries(slots.map(k => [k, { mat: fin[f][0], color: fin[f][1] }])) }));
export const FAMILIES = {
  'IKEA BILLY':  { label: 'Färg', choices: finish(['vit', 'svartbrun', 'ek', 'bjork'], ['stomme']) },
  'IKEA KALLAX': { label: 'Färg', choices: finish(['vit', 'svartbrun', 'ek'], ['stomme']) },
  'IKEA PAX':    { label: 'Färg', choices: finish(['vit', 'svartbrun'], ['front', 'stomme']) },
  'IKEA MALM':   { label: 'Färg', choices: finish(['vit', 'svartbrun', 'ek'], ['ram', 'ben']) },
  'IKEA LACK':   { label: 'Färg', choices: finish(['vit', 'svart', 'ek'], ['skiva', 'ben']) },
  'IKEA BESTÅ':  { label: 'Färg', choices: finish(['vit', 'svartbrun', 'ek'], ['stomme', 'front']) },
  'MIO Rossi':   { label: 'Klädsel', choices: ROSSI_CHOICES, fixed: [['Ben', 'Wengébetsat trä, 4,5 cm']] },
  'ILVA Dahl':   { label: 'Klädsel', choices: DAHL_CHOICES },
  'Hemtex Mali': { label: 'Färg', choices: MALI, opts: ['oppen', 'stangH'], dims: ['w'], fixed: [['Tyg', 'Sammet, 100 % polyester'], ['Upphängning', 'Multiband']] },
  'Rustikunik matbord': { label: 'Träslag & kulör', choices: RK_EK, opts: ['utdragen'], fixed: [['Skiva', 'Massiv ek, 4 cm'], ['Höjd', '74 cm']] },
  'Rustikunik soffbord': { label: 'Träslag & kulör', choices: RK_EK, fixed: [['Skiva', 'Massiv ek, 4 cm']] },
  'Elfa': { label: 'Färg', choices: ELFA_COL, groupIf: { 'Trä': o => o.system === 'decor' || (o.system === 'topp' && o.decor) }, opts: ['mods', 'klader'] },
  'Elfa skjutdörrar': { label: 'Profil & fyllning', choices: ELFA_DOOR, groupIf: { 'Fyllning 2': o => o.modell !== 'plain' && !o.samma }, dims: ['w', 'h'], opts: ['dorrar', 'samma', 'oppen'],
    fixed: [['Måttbeställd', 'Bredd och höjd efter din öppning, upp till 270 cm'], ['Skenor', 'Tvåspårig överskena 10 cm + golvskena']] },
  'MIO Väderö':  { label: 'Tyg på säng och gavel', choices: VADERO_CHOICES, fixed: [['Ben', 'Krom, 18 cm'], ['Bäddmadrass', 'Väderö, 8 cm']] },
};
const FAM_OF = n => n.startsWith('Elfa skjut') ? 'Elfa skjutdörrar' : n.startsWith('Elfa ') ? 'Elfa' : n.startsWith('Hemtex Mali') ? 'Hemtex Mali' : n.startsWith('Rustikunik runt') ? 'Rustikunik matbord' : n.startsWith('Rustikunik rekt') ? 'Rustikunik soffbord' : n.startsWith('MIO Rossi') ? 'MIO Rossi' : n.startsWith('MIO Väderö') ? 'MIO Väderö' : n.startsWith('ILVA Dahl') ? 'ILVA Dahl' : n.startsWith('LACK') ? 'IKEA LACK' : n.startsWith('BESTÅ') ? 'IKEA BESTÅ'
  : ['BILLY', 'KALLAX', 'PAX', 'MALM'].includes(n) ? 'IKEA ' + n : null;
for (const p of PRESETS) { p.family = FAM_OF(p.name); if (p.family) p.variant = p.label.replace(/\b(vit|svartbrun|ek|bjork|svart)\b/g, '').replace(/\s+/g, ' ').trim(); }
// familjens storlekar/modeller (en per variant)
export function variantsOf(family) { const seen = new Set(); return PRESETS.filter(p => p.family === family && !seen.has(p.variant) && seen.add(p.variant)); }
