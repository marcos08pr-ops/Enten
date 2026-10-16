/* ============ Parla · Practicar → Gramática ============
   Temas por nivel (determinantes, género y número, pronombres, casos…), conjugación a medida,
   tablas de verbos con audio y temas de gramática creados por el tutor IA. */
function userCefr(lang) { const C = P.courseData(lang), u = C.units[currentUnit(lang)]; return u ? u.cefr : 'A1'; }
function drillMastery(lang, d) {
  const c = P.course(lang) || {}; const its = Gram.items(lang, d);
  return its.filter((it) => { const s = c.srs && c.srs[it.id]; return s && s[0] >= 2; }).length / Math.max(1, its.length);
}
function grammarSection(lang) {
  const ds = Gram.drills(lang), V = Gram.verbsData(lang), my = cefrIdx(userCefr(lang));
  let h = '<section class="stack" id="grammar"><div><h2>Gramática</h2><p class="small muted">Conjugación, determinantes, género y número, pronombres' + (lang === 'de' ? ', casos' : '') + '… con explicación en cada fallo.</p></div>';
  h += '<div class="grid2">' + (V ? pTile('conj', '🔁', 'Conjugación', V.verbs.length + ' verbos · ' + V.tenses.length + ' tiempos, hasta ' + V.tenses[V.tenses.length - 1].cefr, '') + pTile('tables', '📋', 'Tablas de verbos', 'Consulta y escucha cada forma', '') : '') +
    (AI.ok() ? pTile('ai-grammar', '✨', 'Tema a tu medida', 'Pide cualquier duda de gramática y el tutor te crea ejercicios', 'IA') : '') + '</div>';
  if (ds.length) {
    CEFR.forEach((lv, li) => {
      const list = ds.filter((d) => d.cefr === lv); if (!list.length) return;
      h += '<p class="eyebrow mt">' + lv + ' · ' + CEFR_NAME[lv] + (li === my ? ' · tu nivel' : '') + '</p><div class="stack tight">' + list.map((d) => {
        const m = drillMastery(lang, d);
        return '<button class="card tap" data-act="drill" data-id="' + esc(d.id) + '"><div class="row"><span style="font-size:24px">' + (d.icon || '📐') + '</span><div class="grow"><b>' + esc(d.name) + '</b><div class="bar" style="height:7px;margin-top:6px"><i style="width:' + Math.round(m * 100) + '%"></i></div></div>' +
          (li === my || li === my + 1 ? '<span class="tag">' + (li === my ? 'Para ti' : 'Siguiente') + '</span>' : m >= 0.8 ? '<span class="tag good">Dominado</span>' : '') + '</div></button>';
      }).join('') + '</div>';
    });
  } else if (!AI.ok()) h += '<p class="small muted">Los temas de gramática de este idioma los crea el tutor IA.</p>';
  return h + '</section>';
}
ACT.drill = (a) => {
  const lang = P.profile.active, d = Gram.drill(lang, a.dataset.id); if (!d) return;
  const ex = Gram.items(lang, d).filter((x) => x.kind === 'cloze').slice(0, 3).map((x) => '<div class="row"><button class="spk mini" data-act="say" data-text="' + esc(Gram.fill(x.q, x.ans[0])) + '" aria-label="Escuchar">' + ic('speaker') + '</button><div class="grow"><b>' + esc(Gram.fill(x.q, x.ans[0])) + '</b><div class="small muted">' + esc(x.es) + '</div></div></div>').join('');
  openSheet('<div class="eyebrow">' + esc(d.cefr) + ' · Gramática</div><h2>' + (d.icon || '') + ' ' + esc(d.name) + '</h2><div class="card flat"><p style="white-space:pre-wrap">' + esc(d.tip || '') + '</p></div>' +
    (ex ? '<h3>Ejemplos</h3><div class="list">' + ex + '</div>' : '') +
    '<button class="btn block" data-act="drill-go" data-id="' + esc(d.id) + '">Practicar · 12 ejercicios</button>' +
    (AI.ok() ? '<button class="btn ghost block" data-act="drill-ai-explain" data-id="' + esc(d.id) + '">' + ic('spark', 'sm') + ' Explícamelo con mis ejemplos</button><div id="drill-ai"></div>' : ''));
};
ACT['drill-go'] = (a) => {
  const lang = P.profile.active, d = Gram.drill(lang, a.dataset.id); closeSheet(true);
  Lesson.start({ kind: 'grammar', lang, course: P.courseData(lang), words: [], sents: [], exercises: Gram.drillSession(lang, [d.id], 12), title: d.name });
};
ACT['drill-ai-explain'] = async (a) => {
  const lang = P.profile.active, d = Gram.drill(lang, a.dataset.id), box = $('#drill-ai'); a.disabled = true;
  box.innerHTML = '<div class="card flat ai-tip"><span class="typing"><i></i><i></i><i></i></span></div>';
  try {
    const t = await AI.text({ system: tutorSystem(lang), messages: [{ role: 'user', content: 'Explícame el tema de gramática «' + d.name + '» (' + d.cefr + ') de ' + LANGS[lang].es + ' de otra manera, con ejemplos sobre mis intereses y señalando el error típico de un hispanohablante. Teoría del libro: ' + d.tip + '\nMáximo 170 palabras, en castellano, ejemplos en ' + LANGS[lang].es + '.' }], onText: (x) => { box.firstChild.textContent = x; } });
    box.firstChild.textContent = t; markAiOk();
  } catch (e) { box.innerHTML = '<p class="small" style="color:var(--bad)">' + esc(AI.msg(e)) + '</p>'; a.disabled = false; }
};

/* ---------- conjugación a medida ---------- */
ACT['p-conj'] = () => {
  const lang = P.profile.active, V = Gram.verbsData(lang); if (!V) return;
  const my = cefrIdx(userCefr(lang));
  const sel = V.tenses.filter((t) => cefrIdx(t.cefr) <= Math.max(my, 0)).map((t) => t.id);
  openSheet('<h2>🔁 Conjugación</h2><p class="fg2 small">Elige los tiempos. En Difícil y Experto escribes la forma; en Fácil y Normal, sobre todo eliges.</p>' +
    '<p class="eyebrow">Tiempos</p><div class="row wrap" data-group="tenses">' + V.tenses.map((t) => '<button class="chip" data-act="chip" data-v="' + t.id + '" aria-pressed="' + (sel.indexOf(t.id) >= 0) + '">' + esc(t.name) + ' <span class="small muted">' + t.cefr + '</span></button>').join('') + '</div>' +
    '<p class="eyebrow">Verbos</p>' + seg('verbset', [['nivel', 'De mi nivel'], ['todos', 'Todos (' + V.verbs.length + ')']], 'nivel') +
    '<button class="btn block" data-act="conj-go">Empezar · 12 verbos</button>');
};
ACT['conj-go'] = () => {
  const lang = P.profile.active, r = $('.sheet-in'), tenses = readChips(r, 'tenses'), set = readSeg(r, 'verbset') || 'nivel';
  if (!tenses.length) { toast('Elige al menos un tiempo'); return; }
  const verbs = set === 'todos' ? [] : Gram.verbsUpTo(lang, userCefr(lang)).map((v) => v.inf);
  closeSheet(true);
  Lesson.start({ kind: 'grammar', lang, course: P.courseData(lang), words: [], sents: [], exercises: Gram.conjSession(lang, { tenses, verbs, n: 12 }), title: 'Conjugación' });
};

/* ---------- tablas de verbos ---------- */
ACT['p-tables'] = () => {
  const lang = P.profile.active, V = Gram.verbsData(lang); if (!V) return;
  const root = openOverlay('<div class="ov-top"><button class="icon-btn" data-act="ov-close" aria-label="Cerrar">' + ic('back') + '</button><h2 class="grow">Tablas de verbos</h2></div><div class="ov-body"><input class="input" id="vt-q" placeholder="Busca un verbo (' + esc(V.verbs[0].inf) + ', ' + esc(V.verbs[1].inf) + '…)" autocomplete="off"><div class="stack tight" id="vt-list"></div></div>');
  const draw = () => {
    const q = loose($('#vt-q', root).value || '');
    $('#vt-list', root).innerHTML = V.verbs.filter((v) => !q || loose(v.inf).indexOf(q) >= 0 || loose(v.es).indexOf(q) >= 0).map((v) => '<button class="card tap" data-act="vt-verb" data-v="' + esc(v.inf) + '"><div class="row"><div class="grow"><b>' + esc(v.inf) + '</b> <span class="muted">· ' + esc(v.es) + '</span></div><span class="tag">' + esc(v.cefr || '') + '</span></div></button>').join('');
  };
  $('#vt-q', root).oninput = draw; draw();
};
ACT['vt-verb'] = (a) => {
  const lang = P.profile.active, V = Gram.verbsData(lang), v = V.verbs.find((x) => x.inf === a.dataset.v); if (!v) return;
  openSheet('<h2>' + esc(v.inf) + ' <span class="muted" style="font-size:16px">· ' + esc(v.es) + '</span></h2>' + V.tenses.map((t) => {
    const f = Gram.forms(v, t.id); if (!f) return '';
    return '<div class="card flat"><div class="row between"><b>' + esc(t.name) + '</b><span class="tag">' + t.cefr + '</span></div><p class="small muted">' + esc(t.es) + '</p><div class="list mt">' + f.map((x, p) => '<div class="row"><span class="small muted" style="width:96px;flex:none">' + esc(V.persons[p]) + '</span><b class="grow">' + esc(x[0]) + (x.length > 1 ? ' <span class="small muted">(' + esc(x.slice(1).join(', ')) + ')</span>' : '') + '</b><button class="spk mini" data-act="say" data-text="' + esc(V.persons[p].split(' / ')[0] + ' ' + x[0]) + '" aria-label="Escuchar">' + ic('speaker') + '</button></div>').join('') + '</div>' + (t.tip ? '<p class="small fg2 mt">' + esc(t.tip) + '</p>' : '') + '</div>';
  }).join(''));
};

/* ---------- tema de gramática creado por el tutor IA (cualquier idioma) ---------- */
ACT['p-ai-grammar'] = () => {
  const lang = P.profile.active;
  if (!AI.ok()) { toast(AI.msg({ code: 'no_ai' }), 4500); return; }
  const sug = lang === 'de' ? ['Dativ o Akkusativ', 'Verbos con preposición', 'Konjunktiv II', 'n-Deklination'] : lang === 'ca' ? ['Pronoms febles en/hi', 'Per o per a', 'Ser o estar', 'Subjuntiu'] : ['Verbos irregulares', 'Preposiciones', 'Artículos', 'Pronombres'];
  openSheet('<h2>✨ Tema a tu medida</h2><p class="fg2 small">Escribe la duda o el tema y tu tutor prepara 12 ejercicios con explicación, a tu nivel y con tus fallos en cuenta.</p>' +
    '<input class="input" id="aig-topic" placeholder="Ej.: ' + esc(sug[0]) + '">' + '<div class="row wrap">' + sug.map((x) => '<button class="chip" data-act="aig-pick" data-v="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' +
    '<button class="btn block" data-act="aig-go">Crear ejercicios</button>');
};
ACT['aig-pick'] = (a) => { $('#aig-topic').value = a.dataset.v; };
ACT['aig-go'] = async (a) => {
  const lang = P.profile.active, topic = ($('#aig-topic').value || '').trim();
  if (!topic) { toast('Escribe un tema'); return; }
  a.disabled = true; a.innerHTML = '<span class="typing"><i></i><i></i><i></i></span> Preparando…';
  try {
    const r = await AI.json({ system: 'Eres profesor de ' + LANGS[lang].es + ' para hispanohablantes de España. Tus ejercicios son correctos, naturales y sin ambigüedad.',
      prompt: Memory.context(lang) + '\n\nCrea ejercicios sobre «' + topic + '» a su nivel. Devuelve {"name": "nombre corto del tema en castellano", "tip": "explicación en castellano, 300-600 caracteres", "items": [12 strings "frase en ' + LANGS[lang].es + ' con exactamente un ___|respuesta correcta|error típico 1;error típico 2;error típico 3|traducción al castellano de la frase completa|por qué, en castellano, máximo 120 caracteres"]}. Sin el carácter | dentro de los textos. Los distractores deben ser claramente incorrectos en esa frase.' });
    const items = (r.items || []).filter((x) => typeof x === 'string' && x.split('|').length >= 4 && x.split('|')[0].split('___').length === 2 && (x.split('|')[2] || '').trim()).slice(0, 14);
    if (items.length < 5) throw { code: 'invalid_json' };
    const d = { id: 'ai' + hash(topic).toString(36), name: String(r.name || topic).slice(0, 60), cefr: userCefr(lang), icon: '✨', tip: String(r.tip || '').slice(0, 800), items };
    markAiOk(); closeSheet(true);
    if (d.tip) toast('💡 ' + d.tip.slice(0, 160) + (d.tip.length > 160 ? '…' : ''), 6000);
    Lesson.start({ kind: 'grammar', lang, course: P.courseData(lang), words: [], sents: [], exercises: Gram.items(lang, d).map((it, i, all) => Gram.drillEx(lang, d, it, P.profile.level, all)), title: d.name });
  } catch (e) { a.disabled = false; a.textContent = 'Crear ejercicios'; toast(AI.msg(e), 4500); }
};
