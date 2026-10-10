/* ============ Parla · pestaña Practicar ============ */
function renderPractice(v) {
  const lang = P.profile.active, C = P.courseData(), c = P.course(), L = LANGS[lang];
  const seen = learnedItems(C, c).concat(Object.values(c.custom || {}).filter((x) => SRS.get(c, x.id)));
  const due = SRS.due(c, seen.map((x) => x.id)).length, weakN = SRS.weak(c, seen.map((x) => x.id)).length, learned = SRS.learned(c);
  const weak = Memory.weak(lang, 5);
  let h = '<div class="hello"><h1>Practicar</h1><p class="fg2">' + learned + ' palabras y frases aprendidas en ' + esc(L.es) + (due ? ' · <b>' + due + ' para repasar hoy</b>' : '') + '</p></div>';
  h += '<div class="grid2">' +
    pTile('review', '🧠', 'Repaso inteligente', due ? due + ' pendientes hoy' : 'Lo que estás a punto de olvidar', due ? 'Toca hoy' : '') +
    pTile('weak', '🎯', 'Tus fallos', weakN ? weakN + ' cosas que se te resisten' : 'Aún sin fallos guardados', '') +
    pTile('ai-lesson', '✨', 'A tu medida', AI.ok() ? 'Tu tutor crea una lección con tus fallos y gustos' : 'Necesita el tutor IA', AI.ok() ? 'IA' : '') +
    pTile('listen', '🎧', 'Solo escuchar', 'Dictados y comprensión oral', '') +
    pTile('speak', '🎙️', 'Solo hablar', 'Lee en voz alta y te corrijo', '') +
    pTile('shadow', '🗣️', 'Modo sombra', 'Repite a la vez que el audio: el método viral de pronunciación', 'Tendencia') +
    '</div>';
  if (weak.length) h += '<section class="card"><h3>Lo que más te cuesta</h3><div class="weak mt">' + weak.map((k) => '<span class="chip">' + esc(ERR_NAMES[k] || k) + '</span>').join('') + '</div><p class="small muted mt">Tus lecciones meten más ejercicios de esto. ' + (AI.ok() ? 'Tu tutor también lo tiene en cuenta.' : '') + '</p></section>';
  const tr = TRENDS[lang];
  if (tr) h += '<section class="stack"><div><h2>Lo que se lleva</h2><p class="small muted">Jerga, palabras virales y expresiones que oirás en la calle y en redes.</p></div>' +
    '<div class="scen trends">' + tr.map((t, i) => '<div class="card trend"><div class="row between"><span class="tag ' + (/Jugendwort|Viral|viral/.test(t.tag) ? 'flame' : '') + '">' + esc(t.tag) + '</span><button class="spk mini" data-act="say" data-text="' + esc(t.w) + '" aria-label="Escuchar">' + ic('speaker') + '</button></div><div class="w">' + esc(t.w) + '</div><div class="fg2" style="font-weight:600">' + esc(t.es) + '</div><p class="small muted">' + esc(t.n) + '</p><button class="btn text" style="align-self:flex-start;padding:0" data-act="trend-add" data-i="' + i + '">+ Añadir a mi repaso</button></div>').join('') + '</div></section>';
  h += '<section class="stack"><div><h2>Métodos que arrasan en redes</h2><p class="small muted">Lo que más se comparte en TikTok, YouTube e Instagram para aprender idiomas, convertido en ejercicios.</p></div>' +
    METHODS.map((m) => '<div class="card"><div class="row"><span style="font-size:28px">' + m.em + '</span><div class="grow"><h3>' + esc(m.t) + '</h3><p class="small fg2">' + esc(m.d) + '</p></div></div>' + (m.act ? '<button class="btn sm ghost mt" data-act="method" data-m="' + m.act + '">Probar</button>' : '') + '</div>').join('') + '</section>';
  if (MEDIA[lang]) h += '<section class="card" id="media"><h3>Para ver y escuchar</h3><div class="list mt">' + MEDIA[lang].map((m) => '<div class="row"><span style="font-size:24px">' + m.em + '</span><div class="grow"><b>' + esc(m.t) + '</b><div class="small muted">' + esc(m.d) + '</div></div></div>').join('') + '</div></section>';
  v.innerHTML = h;
}
function pTile(act, em, t, d, tag) { return '<button class="tile-card" data-act="p-' + act + '"><span class="em">' + em + '</span><h3>' + esc(t) + '</h3><p>' + esc(d) + '</p>' + (tag ? '<span class="tag ' + (tag === 'Toca hoy' ? 'flame' : '') + '">' + esc(tag) + '</span>' : '') + '</button>'; }
ACT['p-review'] = () => startReview();
ACT['p-weak'] = () => startWeak();
ACT['p-ai-lesson'] = () => ACT['ai-lesson']();
ACT['p-listen'] = () => { if (!Speech.hasVoice(P.profile.active)) { voiceHelp(); return; } startReview('listen'); };
ACT['p-speak'] = () => startReview('speak');
ACT['p-shadow'] = () => Shadow.open();
ACT.method = (a) => {
  const m = a.dataset.m;
  if (m === 'shadow') Shadow.open();
  else if (m === 'lesson') ACT['next-lesson']();
  else if (m === 'diary') { App.chatMode = 'diario'; go('chat'); }
  else if (m === 'media') { const el = $('#media'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
};
ACT['trend-add'] = (a) => {
  const lang = P.profile.active, t = TRENDS[lang][+a.dataset.i], c = P.course();
  const id = lang + ':tr:' + hash(t.w).toString(36);
  c.custom = c.custom || {}; c.custom[id] = { id, k: 'w', t: t.w, alt: [], es: t.es, altEs: [], em: '🔥', unit: 'trend' };
  c.srs = c.srs || {}; if (!c.srs[id]) c.srs[id] = [1, dayNum(), 0, 0, dayNum()];
  P.saveCourse(); toast('«' + t.w + '» está en tu repaso');
};
function voiceHelp() {
  const lang = P.profile.active;
  openSheet('<h2>🔈 Falta la voz en ' + esc(LANGS[lang].es) + '</h2><p class="fg2">Tu dispositivo no tiene voz para este idioma, así que no puedo leerte las frases.</p>' +
    '<div class="card flat small"><b>iPhone:</b> Ajustes → Accesibilidad → Contenido leído → Voces → ' + esc(LANGS[lang].name) + ' → descarga una (las «mejoradas» suenan mucho mejor).<br><br><b>Android:</b> Ajustes → Idioma → Salida de texto a voz → instala el idioma.</div><p class="small muted">Después, recarga la app.</p>');
}

/* ---------- lección a medida (IA) ---------- */
ACT['ai-lesson'] = () => {
  if (!AI.ok()) { toast(AI.msg({ code: 'no_ai' }), 4500); return; }
  const ints = ((P.profile.prefs || {}).interests || []).slice(0, 6);
  const focus = (P.memory.focus || []).slice(0, 3);
  openSheet('<h2>✨ Lección a tu medida</h2><p class="fg2">Tu tutor mezcla lo que más fallas con un tema que te guste.</p>' +
    (focus.length ? '<div class="card flat small"><b>Tu tutor quiere practicar:</b><br>' + focus.map(esc).join('<br>') + '</div>' : '') +
    '<div class="field"><label for="ai-topic">Tema (opcional)</label><input class="input" id="ai-topic" placeholder="Fútbol, una cita, pedir en un bar…"></div>' +
    (ints.length ? '<div class="row wrap">' + ints.map((x) => '<button class="chip" data-act="ai-topic-pick" data-v="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' : '') +
    '<button class="btn block" data-act="ai-lesson-go">Crear lección</button>');
};
ACT['ai-topic-pick'] = (a) => { $('#ai-topic').value = a.dataset.v; };
ACT['ai-lesson-go'] = async (a) => {
  const lang = P.profile.active, topic = ($('#ai-topic') || {}).value || '', c = P.course();
  a.disabled = true; a.innerHTML = '<span class="typing"><i></i><i></i><i></i></span> Preparando…';
  try {
    const r = await AI.json({ system: 'Eres autor de lecciones de idiomas tipo Duolingo para hispanohablantes de España. Contenido correcto, natural y actual.',
      prompt: Memory.context(lang) + '\n\nCrea una mini lección de ' + LANGS[lang].es + ' adaptada a este alumno: refuerza sus fallos y puntos débiles' + (topic ? ', con el tema «' + topic + '»' : ', con alguno de sus intereses') + ', a su nivel (' + LEVELS[P.profile.level].name + ').\nDevuelve {"title": "título corto en castellano", "intro": "1 frase en castellano: qué vas a practicar y por qué", "w": [6 palabras "palabra|traducción|emoji"; sustantivos con artículo], "s": [6 frases cortas "frase|traducción"; puedes añadir alternativas correctas separadas por ";" dentro de cada lado]}. Sin el carácter | dentro de los textos.' });
    const W = (r.w || []).filter((x) => typeof x === 'string' && x.split('|').length >= 2).slice(0, 8), S = (r.s || []).filter((x) => typeof x === 'string' && x.split('|').length >= 2).slice(0, 8);
    if (W.length + S.length < 5) throw { code: 'invalid_json' };
    const tag = 'ai' + Date.now().toString(36);
    const words = W.map((s, i) => parseWord(lang, tag, i, s)), sents = S.map((s, i) => parseSent(lang, tag, i, s));
    c.custom = c.custom || {}; words.concat(sents).forEach((it) => { c.custom[it.id] = it; });
    const ks = Object.keys(c.custom); if (ks.length > 220) ks.slice(0, ks.length - 220).forEach((k) => delete c.custom[k]);
    P.saveCourse(lang); markAiOk(); closeSheet(true);
    const C = P.courseData();
    const extra = SRS.weak(c, Object.keys(c.srs || {})).filter((id) => C.byId[id]).slice(0, 3).map((id) => C.byId[id]);
    const intro = r.intro ? String(r.intro).slice(0, 200) : '';
    if (intro) toast('✨ ' + intro, 5000);
    Lesson.start({ kind: 'ai', lang, course: C, words, sents, extra, newIds: new Set(words.concat(sents).map((x) => x.id)), title: r.title || 'A tu medida' });
  } catch (e) { a.disabled = false; a.textContent = 'Crear lección'; toast(AI.msg(e), 4500); }
};

/* ---------- modo sombra (shadowing) ---------- */
const Shadow = {
  st: null,
  open() {
    const lang = P.profile.active, C = P.courseData(), c = P.course();
    let pool = learnedItems(C, c).filter((x) => x.k === 's');
    if (pool.length < 5) { const cu = C.units[currentUnit(lang)]; pool = pool.concat(cu ? cu.sents : []); }
    if (!pool.length) { toast('Haz una lección primero'); return; }
    if (!Speech.hasVoice(lang)) { voiceHelp(); return; }
    this.st = { lang, list: pick(pool, Math.min(6, pool.length)), i: 0, good: 0 };
    this.render();
  },
  render() {
    const st = this.st, it = st.list[st.i], live = Speech.canListen();
    openOverlay('<div class="ov-top"><button class="icon-btn" data-act="sh-close" aria-label="Salir">' + ic('close') + '</button><div class="ls-prog bar"><i style="width:' + (100 * st.i / st.list.length) + '%"></i></div></div>' +
      '<div class="ov-body"><div class="eyebrow">Modo sombra · ' + (st.i + 1) + ' de ' + st.list.length + '</div><h2 class="prompt-title">Escucha y repite a la vez</h2>' +
      '<p class="fg2 small">Dale a escuchar y habla encima del audio, imitando ritmo y entonación. Luego hazlo tú solo.</p>' +
      '<div class="card"><div class="big-word" style="font-size:26px">' + esc(it.t) + '</div><p class="center muted mt">' + esc(it.es) + '</p></div>' +
      '<div class="row" style="justify-content:center;gap:16px"><button class="spk xl" data-act="say" data-text="' + esc(it.t) + '" aria-label="Escuchar">' + ic('speaker') + '</button><button class="spk slow" data-act="say" data-slow="1" data-text="' + esc(it.t) + '" aria-label="Despacio">' + ic('turtle') + '</button></div>' +
      (live ? '<button class="mic" data-act="sh-mic" aria-label="Ahora tú">' + ic('mic') + '</button><p class="center small muted" id="sh-hint">Ahora tú solo: pulsa y repite</p><div class="heard" id="sh-heard"></div>' : '<p class="center small muted">Repite la frase en voz alta 3 veces.</p>') +
      '</div><div class="ov-foot"><div class="row"><button class="btn ghost grow" data-act="sh-next" data-ok="0">Otra vez mañana</button><button class="btn grow" data-act="sh-next" data-ok="1">Me ha salido</button></div></div>');
    setTimeout(() => Speech.speak(it.t, st.lang), 300);
  },
};
ACT['sh-close'] = () => { Shadow.st = null; closeOverlay(); };
ACT['sh-mic'] = async (a) => {
  const st = Shadow.st, it = st.list[st.i]; if (Speech.rec) { Speech.cancelListen(); return; }
  a.classList.add('on'); $('#sh-hint').textContent = 'Escuchando…';
  try {
    const r = await Speech.listen(st.lang, { onInterim: (t) => { $('#sh-heard').textContent = t; } });
    const sc = speechScore(r.text, it.t); a.classList.remove('on');
    $('#sh-heard').innerHTML = sc.words.map((w) => '<span class="' + (w.ok ? 'w-ok' : 'w-no') + '">' + esc(w.w) + '</span>').join(' ');
    $('#sh-hint').textContent = Math.round(sc.score * 100) + '% · ' + (sc.score >= 0.8 ? '¡Muy bien!' : 'Repite fijándote en las palabras en rojo');
    P.stats.speak = (P.stats.speak || 0) + 1; Quests.bump('speak', 1);
    if (sc.score >= 0.8) Sound.play('ok');
  } catch (e) { a.classList.remove('on'); $('#sh-hint').textContent = Speech.micBlocked ? 'Sin acceso al micro aquí: repite en voz alta y valóralo tú.' : 'No te he oído. Prueba otra vez.'; }
};
ACT['sh-next'] = (a) => {
  const st = Shadow.st; if (a.dataset.ok === '1') st.good++;
  SRS.mark(P.course(), st.list[st.i].id, a.dataset.ok === '1');
  st.i++;
  if (st.i < st.list.length) { Shadow.render(); return; }
  P.saveCourse(); P.stats.lessons = (P.stats.lessons || 0) + 0; const r = Streak.addXP(8, 'shadow'); celebrate(r); Sound.play(r.extended ? 'streak' : 'win');
  openOverlay('<div class="ov-body"><div class="result-hero"><div class="emoji-xl">🗣️</div><h1>¡Sesión de sombra hecha!</h1><p class="fg2">' + st.good + ' de ' + st.list.length + ' frases te salieron bien. +' + r.xp + ' XP</p>' + (r.extended ? '<div class="tag flame">🔥 Racha: ' + r.streak + ' días</div>' : '') + '</div></div><div class="ov-foot"><button class="btn block" data-act="sh-close">Continuar</button></div>');
};
