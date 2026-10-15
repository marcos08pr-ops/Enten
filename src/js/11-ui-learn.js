/* ============ Parla · pestaña Aprender: racha, misiones, tutor y camino ============ */
function renderLearn(v) {
  const pr = P.profile, s = P.streak, lang = pr.active, C = P.courseData(), c = P.course();
  const n = Streak.count(), done = Streak.doneToday(), h = new Date().getHours();
  let html = '';
  // eventos al abrir (protector usado, racha perdida)
  (App.events || []).forEach((e) => {
    if (e.type === 'frozen') html += '<div class="card" style="border-color:var(--ice)"><div class="row"><span style="font-size:30px">🧊</span><div><b>Tu protector ha salvado la racha</b><div class="small fg2">No practicaste ' + (e.days.length === 1 ? 'ayer' : e.days.length + ' días') + ', pero tus ' + e.streak + ' días siguen vivos.</div></div></div></div>';
    if (e.type === 'lost' && !e.repairable) html += '<div class="card"><div class="row"><span style="font-size:30px">💔</span><div><b>Se apagó tu racha de ' + e.streak + ' días</b><div class="small fg2">Hoy empieza una nueva. La mejor sigue en tu perfil.</div></div></div></div>';
  });
  if (s.repair) html += '<div class="card warn"><h3>🚑 Recupera tu racha de ' + s.repair.lost + ' días</h3><p class="small fg2" style="margin-top:4px">Haz ' + s.repair.need + ' lecciones hoy y vuelve como si nada. Llevas ' + s.repair.done + '.</p><div class="bar flame mt"><i style="width:' + (100 * s.repair.done / s.repair.need) + '%"></i></div><button class="btn block mt" data-act="next-lesson">Empezar</button></div>';
  else if (!done) {
    const urgent = n > 0 && h >= 18;
    html += '<div class="card ' + (n ? 'warn' : 'accent') + '"><div class="row">' + flameSvg('off', '') + '<div class="grow"><h3>' + (n ? (urgent ? '¡Tu racha de ' + n + ' días está en peligro!' : 'Mantén tu racha de ' + n + ' días') : 'Empieza tu racha hoy') + '</h3><div class="small fg2">' + (n ? 'Quedan ' + fmtLeft(msToMidnight()) + ' · una lección basta' : 'Una lección de 3 minutos y se enciende la llama') + '</div></div></div><button class="btn block mt" data-act="next-lesson">' + (n ? 'Salvar mi racha' : 'Empezar') + '</button></div>';
  } else {
    html += '<div class="card flat"><div class="row">' + flameSvg('on') + '<div class="grow"><b>Racha a salvo: ' + plural(n, 'día', 'días') + '</b><div class="small muted">' + (Streak.todayXP() >= (pr.goal || 20) ? 'Meta diaria cumplida. ¡Crack!' : 'Te faltan ' + ((pr.goal || 20) - Streak.todayXP()) + ' XP para tu meta diaria') + '</div></div></div></div>';
  }
  html += guestBanner();
  // misiones
  html += '<section class="card"><div class="row between"><h3>Misiones de hoy</h3><span class="small muted">' + fmtLeft(msToMidnight()) + '</span></div><div class="stack tight mt">' + Quests.ensure().map(questRow).join('') + '</div></section>';
  // tutor
  html += tutorCard(lang);
  // camino
  html += C.units.map((u, i) => (i === 0 || C.units[i - 1].cefr !== u.cefr ? levelDivider(u.cefr, C, c) : '') + unitBlock(u, c, C)).join('');
  const all = C.units.every((u) => [0, 1, 2, 3].every((i) => lessonDone(c, u, i)));
  if (all) html += '<div class="card accent center"><h3>🏁 ¡Has terminado el curso!</h3><p class="fg2 small mt">Sigue con lecciones a tu medida que crea tu tutor IA con lo que más te cuesta.</p><button class="btn block mt" data-act="ai-lesson">' + ic('spark') + ' Lección a tu medida</button></div>';
  v.innerHTML = html;
  App.events = [];
  const cur = $('.node-wrap.cur', v);
  if (cur && !App.scrolled) { App.scrolled = true; setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120); }
}

function tutorCard(lang) {
  const m = P.memory, tip = m.tip && m.tip.day === dayKey() && m.tip.lang === lang ? m.tip.text : '';
  const weak = Memory.weak(lang, 3);
  let body = '';
  if (tip) body = '<p class="ai-tip">' + esc(tip) + '</p>';
  else if (AI.ok()) body = '<p class="small fg2">Tu tutor recuerda tus fallos y tus gustos. Pídele el consejo de hoy y una lección hecha para ti.</p>';
  else body = '<p class="small fg2">' + (weak.length ? 'Lo que más te cuesta ahora: <b>' + weak.map((k) => ERR_NAMES[k]).join(', ') + '</b>. Tu repaso inteligente ya lo tiene en cuenta.' : 'Cuando falles algo, lo recordaré para repasarlo en el momento justo.') + '</p>';
  return '<section class="card accent"><div class="row"><span class="avatar">' + LANGS[lang].persona.em + '</span><div class="grow"><h3>Tu tutor</h3><div class="small muted">' + (AI.ok() ? 'Con memoria · se adapta a ti' : 'Modo sin IA · repaso adaptativo') + '</div></div></div><div class="mt">' + body + '</div>' +
    '<div class="row wrap mt">' + (AI.ok() && !tip ? '<button class="btn sm" data-act="ai-tip">' + ic('spark', 'sm') + ' Consejo de hoy</button>' : '') +
    (AI.ok() ? '<button class="btn sm ghost" data-act="ai-lesson">Lección a tu medida</button>' : '<button class="btn sm ghost" data-act="practice-weak">Practicar mis fallos</button>') + '</div></section>';
}

function unitBlock(u, c, C) {
  const open = unitUnlocked(c, C, u);
  const head = '<div class="unit-head ' + (open ? '' : 'lock') + '"><span class="u-ic">' + u.icon + '</span><div><div class="sub">Unidad ' + (u.idx + 1) + ' · ' + u.cefr + '</div><h3>' + esc(u.t) + '</h3></div>' +
    (u.pending ? '' : '<button class="guide" data-act="guide" data-u="' + u.idx + '">' + ic('book', 'sm') + ' Guía</button>') + '</div>';
  if (u.pending) {
    return '<section class="unit">' + head + '<div class="path"><div class="node-wrap' + (open ? ' cur' : '') + '"><button class="node ' + (open ? '' : 'lock') + '" data-act="gen-unit" data-u="' + u.idx + '" aria-label="Crear unidad con IA">' + (open ? ic('spark') : ic('lock')) + '</button><div class="node-label">' + (open ? 'Crear esta unidad con tu tutor' : 'Bloqueada') + '</div></div></div></section>';
  }
  if (!open) return '<section class="unit">' + head + '<p class="small muted center" style="padding:8px 0 4px">' + ic('lock', 'sm') + ' 4 lecciones · termina la unidad anterior</p></section>';
  const ls = Course.lessons(u); const nx = nextLesson(P.profile.active);
  const offs = [0, 56, 0, -56];
  const nodes = ls.map((l, i) => {
    const d = lessonDone(c, u, i), ok = lessonUnlocked(c, C, u, i), cur = nx && nx.u.idx === u.idx && nx.i === i;
    const rec = c.lessons[lessonKey(u, i)]; const great = rec && rec.best >= 0.95;
    const cls = d ? 'done' : ok ? '' : 'lock';
    const icon = d ? ic('check') : !ok ? ic('lock') : l.review ? ic('trophy') : ic('star');
    return '<div class="node-wrap' + (cur ? ' cur' : '') + '" style="transform:translateX(' + offs[i % 4] + 'px)">' + (cur ? '<span class="bubble">' + (d ? 'Repasar' : 'Empezar') + '</span>' : '') +
      '<button class="node ' + cls + (l.review ? ' review' : '') + '" data-act="lesson-node" data-u="' + u.idx + '" data-i="' + i + '" aria-label="' + esc(l.label + ' · ' + u.t) + (d ? ' (hecha)' : ok ? '' : ' (bloqueada)') + '">' + icon + (great ? '<span class="stars">⭐</span>' : '') + '</button>' +
      '<div class="node-label">' + esc(l.label) + '</div></div>';
  }).join('');
  return '<section class="unit">' + head + '<div class="path">' + nodes + '</div></section>';
}

ACT['lesson-node'] = (a) => {
  const C = P.courseData(), c = P.course(), u = C.units[+a.dataset.u], i = +a.dataset.i;
  if (!lessonUnlocked(c, C, u, i)) { toast(unitUnlocked(c, C, u) ? 'Completa antes la lección anterior' : 'Termina la unidad anterior para desbloquearla'); return; }
  const l = Course.lessons(u)[i], d = lessonDone(c, u, i), rec = c.lessons[lessonKey(u, i)];
  const words = l.words.slice(0, 10).map((w) => '<button class="chip" data-act="say" data-text="' + esc(w.t) + '">' + (w.em ? w.em + ' ' : '') + esc(w.t) + '</button>').join('');
  openSheet('<div class="eyebrow">Unidad ' + (u.idx + 1) + ' · ' + esc(u.t) + '</div><h2>' + esc(l.label) + '</h2>' +
    (l.review ? '<p class="fg2">Mezcla todo lo de la unidad con ejercicios más exigentes.</p>' : '<div class="row wrap">' + words + '</div>') +
    '<div class="small muted">' + LEVELS[P.profile.level].name + ' · ' + (LEVELS[P.profile.level].n + (l.review ? 2 : 0)) + ' ejercicios' + (rec ? ' · mejor resultado ' + Math.round(rec.best * 100) + '%' : '') + '</div>' +
    '<button class="btn block" data-act="start-lesson" data-u="' + u.idx + '" data-i="' + i + '">' + (d ? 'Repetir' : 'Empezar') + ' · +' + xpFor(P.profile.level, l.review) + ' XP</button>' +
    '<button class="btn ghost block" data-act="guide" data-u="' + u.idx + '">' + ic('book', 'sm') + ' Ver la guía</button>');
};
function xpFor(level, review) { return 10 + ({ facil: 0, normal: 2, dificil: 5, experto: 8 }[level] || 0) + (review ? 5 : 0); }
ACT['start-lesson'] = (a) => { closeSheet(true); startUnitLesson(+a.dataset.u, +a.dataset.i); };
ACT['next-lesson'] = () => {
  const nx = nextLesson(P.profile.active);
  if (nx && nx.u.pending) { ACT['gen-unit']({ dataset: { u: nx.u.idx } }); return; }
  if (nx) startUnitLesson(nx.u.idx, nx.i); else startReview();
};
ACT.guide = (a) => {
  const C = P.courseData(), u = C.units[+a.dataset.u], lang = P.profile.active;
  const rows = u.words.map((w) => '<div class="row"><button class="spk mini" data-act="say" data-text="' + esc(w.t) + '" aria-label="Escuchar">' + ic('speaker') + '</button><div class="grow"><b>' + esc(w.t) + '</b>' + (w.g ? ' <span class="tag">' + ({ m: 'masc.', f: 'fem.', n: 'neutro' }[w.g]) + '</span>' : '') + '<div class="small muted">' + esc(w.es) + '</div></div><span style="font-size:22px">' + (w.em || '') + '</span></div>').join('');
  const sents = u.sents.map((x) => '<div class="row"><button class="spk mini" data-act="say" data-text="' + esc(x.t) + '" aria-label="Escuchar">' + ic('speaker') + '</button><div class="grow"><b>' + esc(x.t) + '</b><div class="small muted">' + esc(x.es) + '</div></div></div>').join('');
  openSheet('<div class="eyebrow">Guía · Unidad ' + (u.idx + 1) + ' · ' + u.cefr + '</div><h2>' + u.icon + ' ' + esc(u.t) + '</h2>' +
    (u.tip ? '<div class="card flat"><p style="white-space:pre-wrap">' + esc(u.tip) + '</p></div>' : '') +
    (AI.ok() ? '<button class="btn sm ghost" data-act="ai-explain-unit" data-u="' + u.idx + '">' + ic('spark', 'sm') + ' Explícamelo a mi manera</button><div id="unit-ai"></div>' : '') +
    '<h3>Palabras</h3><div class="list">' + rows + '</div><h3>Frases</h3><div class="list">' + sents + '</div>');
};
ACT['ai-explain-unit'] = async (a) => {
  const C = P.courseData(), u = C.units[+a.dataset.u], lang = P.profile.active, box = $('#unit-ai');
  a.disabled = true; box.innerHTML = '<div class="card flat ai-tip"><span class="typing"><i></i><i></i><i></i></span></div>';
  try {
    const t = await AI.text({ system: tutorSystem(lang), messages: [{ role: 'user', content: 'Explícame la gramática y los trucos de la unidad «' + u.t + '» (' + u.cefr + '). Guía del libro: ' + u.tip + '\nVocabulario: ' + u.words.map((w) => w.t).join(', ') + '.\nAdáptalo a mis gustos y a mis fallos. Usa ejemplos con mis intereses. Máximo 180 palabras, en castellano, con ejemplos en ' + LANGS[lang].es + '.' }], onText: (x) => { box.firstChild.textContent = x; } });
    box.firstChild.textContent = t; markAiOk();
  } catch (e) { box.innerHTML = '<p class="small" style="color:var(--bad)">' + esc(AI.msg(e)) + '</p>'; }
  a.disabled = false;
};
ACT['ai-tip'] = async (a) => {
  const lang = P.profile.active; a.disabled = true; a.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
  try {
    const t = await AI.text({ system: tutorSystem(lang), messages: [{ role: 'user', content: 'Dame mi consejo de hoy: 2 o 3 frases en castellano basadas en lo que recuerdas de mí y en mis fallos, y termina con un mini reto concreto para hoy (una frase en ' + LANGS[lang].es + ' que deba decir en voz alta o escribir). Sin títulos ni listas. Máximo 70 palabras.' }] });
    P.memory.tip = { day: dayKey(), lang, text: t.trim() }; P.save('memory'); markAiOk(); render();
  } catch (e) { toast(AI.msg(e), 4500); a.disabled = false; a.textContent = 'Consejo de hoy'; }
};
function markAiOk() { if (!P.profile.aiOk) { P.profile.aiOk = true; P.save('profile'); } }

/* Unidades de idiomas con curso IA */
ACT['gen-unit'] = async (a) => {
  const lang = P.profile.active, C = P.courseData(), c = P.course(), u = C.units[+a.dataset.u];
  if (!AI.ok()) { toast(AI.msg({ code: 'no_ai' }), 4500); return; }
  if (!unitUnlocked(c, C, u)) { toast('Termina la unidad anterior'); return; }
  openSheet('<h2>' + u.icon + ' Creando «' + esc(u.t) + '»</h2><p class="fg2">Tu tutor está preparando 10 palabras, 8 frases y una guía, a tu nivel y con tus intereses.</p><div class="center"><span class="typing"><i></i><i></i><i></i></span></div>');
  try {
    const r = await AI.json({ system: 'Eres autor de cursos de idiomas tipo Duolingo para hispanohablantes de España. Contenido natural, correcto y actual.',
      prompt: Memory.context(lang) + '\n\nCrea la unidad «' + u.t + '» (nivel ' + u.cefr + ') del curso de ' + LANGS[lang].es + '. Devuelve {"w": [10 palabras con el formato "palabra|traducción al castellano|emoji"; los sustantivos con su artículo], "s": [8 frases cortas con el formato "frase|traducción al castellano"; puedes añadir alternativas correctas separadas por ";" dentro de cada lado], "tip": "guía gramatical breve en castellano (máx. 400 caracteres)"}. Sin el carácter | dentro de los textos.' });
    const ok = r && Array.isArray(r.w) && Array.isArray(r.s) && r.w.length >= 6 && r.s.length >= 4;
    if (!ok) throw { code: 'invalid_json' };
    c.gen = c.gen || {};
    c.gen[u.id] = { w: r.w.filter((x) => typeof x === 'string' && x.split('|').length >= 2).slice(0, 10), s: r.s.filter((x) => typeof x === 'string' && x.split('|').length >= 2).slice(0, 8), tip: String(r.tip || '').slice(0, 600) };
    P.saveCourse(lang); markAiOk(); closeSheet(); render(); toast('Unidad lista ✨');
  } catch (e) { closeSheet(); toast(AI.msg(e), 4500); }
};

const CEFR_DESC = { A1: 'Saludar, presentarte y lo básico del día a día.', A2: 'Rutinas, planes, viajes y contar lo que hiciste.', B1: 'Opinar, narrar el pasado y desenvolverte casi en cualquier situación.', B2: 'Argumentar, hipótesis, noticias y temas abstractos con soltura.', C1: 'Registro formal, matices, modismos y refranes.' };
function levelDivider(cefr, C, c) {
  const us = C.units.filter((u) => u.cefr === cefr); let done = 0, tot = 0;
  us.forEach((u) => { for (let i = 0; i < 4; i++) { tot++; if (lessonDone(c, u, i)) done++; } });
  return '<div class="level-div"><div class="row between"><span class="lv">' + cefr + ' · ' + esc(CEFR_NAME[cefr] || '') + '</span><span class="small muted">' + Math.round((100 * done) / Math.max(1, tot)) + '%</span></div><p class="small muted">' + esc(CEFR_DESC[cefr] || '') + '</p></div>';
}
