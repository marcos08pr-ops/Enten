/* ============ Parla · Practicar → Hablar ============
   Responder en voz alta, leer en voz alta, trabalenguas, describir una escena, pares mínimos,
   modo sombra y conversación por voz con el tutor. Datos en SPEAK (05q-speaking.js).
   Con micrófono del navegador cuando hay; si no, dictado del teclado. */
const SPEAK_KINDS = [
  { id: 'questions', em: '🎙️', t: 'Responde en voz alta', d: 'Preguntas de tu nivel: contesta hablando y te corrijo.', n: 5 },
  { id: 'reading', em: '📖', t: 'Lee en voz alta', d: 'Textos cortos: marco en rojo lo que no se entiende.', n: 3 },
  { id: 'tongue', em: '👅', t: 'Trabalenguas', d: 'Para soltar la lengua con los sonidos más difíciles.', n: 3 },
  { id: 'scenes', em: '🖼️', t: 'Describe la escena', d: 'Mira los emojis y cuenta qué pasa.', n: 4 },
  { id: 'pairs', em: '👂', t: 'Pares mínimos', d: 'Distingue y pronuncia palabras que suenan casi igual.', n: 5 },
];
function speakSection(lang) {
  const has = typeof SPEAK !== 'undefined' && SPEAK[lang];
  return '<section class="stack" id="speak"><div><h2>Hablar</h2><p class="small muted">' + (Speech.canListen() ? 'Pulsa el micro y habla.' : 'Aquí el micrófono va con el dictado del teclado: toca el cuadro y pulsa 🎙️ en el teclado.') + '</p></div><div class="grid2">' +
    (has ? SPEAK_KINDS.map((k) => '<button class="tile-card" data-act="sa-open" data-k="' + k.id + '"><span class="em">' + k.em + '</span><h3>' + esc(k.t) + '</h3><p>' + esc(k.d) + '</p></button>').join('') : '') +
    pTile('speak', '🗣️', 'Frases de tus lecciones', 'Lee y traduce en voz alta lo que ya has visto', '') +
    pTile('shadow', '🎧', 'Modo sombra', 'Repite a la vez que el audio: el método viral de pronunciación', 'Tendencia') +
    (AI.ok() ? pTile('voicechat', '📞', 'Conversación por voz', 'Charla con tu tutor hablando: te lee las respuestas en voz alta', 'IA') : '') + '</div></section>';
}
ACT['p-voicechat'] = () => { P.profile.voiceChat = true; P.profile.chatVoice = true; P.save('profile'); go('chat'); toast('🎧 Modo voz activado: te leo cada respuesta' + (Speech.canListen() ? ' y luego te escucho' : '')); };

const SpeakAct = {
  st: null,
  parse(kind, s) {
    const f = s.split('|');
    if (kind === 'tongue') return { t: f[0], es: f[1], cefr: f[2] || 'B1', tip: f[3] || '' };
    if (kind === 'questions') return { q: f[0], es: f[1], cefr: f[2] || 'A1', model: f[3] || '', kw: (f[4] || '').split(';').map((x) => x.trim()).filter(Boolean) };
    if (kind === 'reading') return { t: f[0], es: f[1], cefr: f[2] || 'A1' };
    if (kind === 'scenes') return { em: f[0], es: f[1], cefr: f[2] || 'A1', kw: (f[3] || '').split(';').map((x) => x.trim()).filter(Boolean), model: f[4] || '' };
    if (kind === 'pairs') { const w = f[0].split(';'), m = (f[1] || '').split(';'); return { w, m, tip: f[2] || '' }; }
    return null;
  },
  open(kind) {
    const lang = P.profile.active, data = typeof SPEAK !== 'undefined' && SPEAK[lang] && SPEAK[lang][kind];
    if (!data || !data.length) { toast('Esta actividad aún no está disponible en este idioma'); return; }
    const K = SPEAK_KINDS.find((k) => k.id === kind), my = cefrIdx(userCefr(lang));
    let items = data.map((s) => this.parse(kind, s)).filter(Boolean);
    if (kind !== 'pairs') { const fit = items.filter((x) => cefrIdx(x.cefr) <= my + 1); if (fit.length >= K.n) items = fit; }
    // primero los de tu nivel, luego algo por encima
    items = shuffle(items).sort((a, b) => Math.abs(cefrIdx(a.cefr) - my) - Math.abs(cefrIdx(b.cefr) - my)).slice(0, K.n);
    this.st = { kind, K, lang, items: shuffle(items), i: 0, good: 0, res: [], t0: Date.now() };
    this.render();
  },
  render() {
    const st = this.st, it = st.items[st.i], lang = st.lang, live = Speech.canListen();
    st.cur = { heard: '', typed: '', alts: [], done: false, phase: 'listen' };
    const sp = (t, slow) => '<button class="spk' + (slow ? ' slow' : '') + '" data-act="say" data-text="' + esc(t) + '"' + (slow ? ' data-slow="1"' : '') + ' aria-label="Escuchar">' + ic(slow ? 'turtle' : 'speaker') + '</button>';
    let body = '';
    if (st.kind === 'questions') body = '<div class="row wrap"><span class="tag">' + it.cefr + '</span></div><h2 class="prompt-title">Responde hablando</h2><div class="say">' + sp(it.q) + '<div class="txt">' + esc(it.q) + '<div class="small muted" style="margin-top:4px">' + esc(it.es) + '</div></div></div>' + saInput(lang, live, 'Pulsa y contesta con una frase completa');
    else if (st.kind === 'reading') body = '<div class="row wrap"><span class="tag">' + it.cefr + '</span></div><h2 class="prompt-title">Lee en voz alta</h2><div class="row" style="gap:10px">' + sp(it.t) + sp(it.t, true) + '</div><div class="card"><p style="font-size:19px;line-height:1.55" id="sa-text">' + esc(it.t) + '</p><p class="small muted mt">' + esc(it.es) + '</p></div>' + saInput(lang, live, 'Pulsa y lee el texto');
    else if (st.kind === 'tongue') body = '<h2 class="prompt-title">Trabalenguas</h2><div class="row" style="gap:10px">' + sp(it.t) + sp(it.t, true) + '</div><div class="card"><p style="font-size:21px;font-weight:650;line-height:1.5" id="sa-text">' + esc(it.t) + '</p><p class="small muted mt">' + esc(it.es) + '</p>' + (it.tip ? '<p class="small fg2 mt">👅 ' + esc(it.tip) + '</p>' : '') + '</div>' + saInput(lang, live, 'Escúchalo, y luego dilo de un tirón');
    else if (st.kind === 'scenes') body = '<div class="row wrap"><span class="tag">' + it.cefr + '</span></div><h2 class="prompt-title">Describe la escena</h2><div class="emoji-xl" style="font-size:56px;letter-spacing:6px">' + esc(it.em) + '</div><p class="center muted small">Di 1 o 2 frases sobre lo que ves.</p>' + (P.profile.level === 'facil' && it.kw.length ? '<p class="center small">Pistas: ' + it.kw.slice(0, 3).map(esc).join(' · ') + '</p>' : '') + saInput(lang, live, 'Pulsa y describe la escena');
    else if (st.kind === 'pairs') {
      st.cur.target = rand(2);
      body = '<h2 class="prompt-title">¿Qué palabra oyes?</h2><div class="row" style="justify-content:center;gap:16px"><button class="spk xl" data-act="sa-pair-play" aria-label="Escuchar">' + ic('speaker') + '</button><button class="spk slow" data-act="sa-pair-play" data-slow="1" aria-label="Despacio">' + ic('turtle') + '</button></div>' +
        '<div class="opts" id="sa-pair-opts">' + it.w.map((w, k) => '<button class="opt" data-act="sa-pair-pick" data-k="' + k + '" style="justify-content:center;font-size:22px">' + esc(w) + '</button>').join('') + '</div><div id="sa-pair-say"></div>';
    }
    openOverlay('<div class="ov-top"><button class="icon-btn" data-act="sa-close" aria-label="Salir">' + ic('close') + '</button><div class="ls-prog bar"><i style="width:' + (100 * st.i / st.items.length) + '%"></i></div><span class="small muted">' + st.K.em + '</span></div>' +
      '<div class="ov-body" id="sa-body">' + body + '</div><div class="ov-foot" id="sa-foot">' + (st.kind === 'pairs' ? '' : '<button class="btn block" id="sa-check" data-act="sa-check" disabled>Comprobar</button><button class="btn text" data-act="sa-skip">Saltar</button>') + '</div>');
    this.mountInput();
    if (st.kind === 'pairs') setTimeout(() => ACT['sa-pair-play']({ dataset: {} }), 350);
    if (st.kind === 'questions') setTimeout(() => Speech.speak(it.q, lang), 350);
  },
  mountInput() {
    const inp = $('#sa-in'); if (!inp) return;
    inp.addEventListener('input', () => { this.st.cur.typed = inp.value; const b = $('#sa-check'); if (b) b.disabled = !inp.value.trim(); });
  },
  async check() {
    const st = this.st, it = st.items[st.i], lang = st.lang, heard = (st.cur.heard || st.cur.typed || '').trim(); if (!heard || st.cur.done) return;
    st.cur.done = true; const btn = $('#sa-check'); if (btn) btn.disabled = true;
    const inp = $('#sa-in'); if (inp) inp.readOnly = true;
    P.stats.speak = (P.stats.speak || 0) + 1; Quests.bump('speak', 1);
    let ok = false, html = '';
    if (st.kind === 'reading' || st.kind === 'tongue') {
      let sc = speechScore(heard, it.t); (st.cur.alts || []).forEach((h) => { const s2 = speechScore(h, it.t); if (s2.score > sc.score) sc = s2; });
      ok = sc.score >= SPEAK_PASS[P.profile.level] - (st.kind === 'tongue' ? 0.1 : 0);
      const tx = $('#sa-text'); if (tx) tx.innerHTML = sc.words.map((w) => '<span class="' + (w.ok ? 'w-ok' : 'w-no') + '">' + esc(w.w) + '</span>').join(' ');
      html = '<b>' + Math.round(sc.score * 100) + '% entendido</b>' + (ok ? '' : '<div class="small fg2">Repite fijándote en las palabras en rojo.</div>');
    } else {
      const words = loose(heard).split(' ').filter(Boolean);
      const hit = it.kw.filter((k) => loose(heard).indexOf(loose(k)) >= 0);
      const need = st.kind === 'scenes' ? Math.min(2, it.kw.length) : Math.min(1, it.kw.length);
      ok = words.length >= (st.kind === 'scenes' ? 4 : 2) && hit.length >= need;
      html = '<div class="small muted">Te he entendido: «' + esc(heard) + '»</div>' + (it.model ? '<div class="mt"><span class="small muted">Una respuesta posible</span><div style="font-weight:650">' + esc(it.model) + '</div></div>' : '');
      if (AI.ok()) {
        $('#sa-foot').innerHTML = '<div class="fb ok"><div class="ai-box"><span class="typing"><i></i><i></i><i></i></span> Tu tutor está escuchando…</div></div>';
        try {
          const j = await AI.json({ system: tutorSystem(lang), prompt: (st.kind === 'scenes' ? 'Escena (emojis): ' + it.em + ' — ' + it.es : 'Pregunta: «' + it.q + '» (' + it.es + ')') + '\nNivel de la actividad: ' + it.cefr + '.\nEl alumno ha respondido hablando (transcripción automática, sin puntuación fiable): «' + heard + '»\nEvalúa si ' + (st.kind === 'scenes' ? 'describe la escena' : 'responde a la pregunta') + ' y si el ' + LANGS[lang].es + ' es correcto para su nivel. No penalices la puntuación ni las mayúsculas. Devuelve {"ok": true|false, "score": 0-100, "correccion": "su respuesta corregida y natural en ' + LANGS[lang].es + ' (igual si era correcta)", "consejo": "en castellano, máximo 30 palabras, concreto"}' });
          ok = !!j.ok; markAiOk();
          html = '<div class="small muted">Te he entendido: «' + esc(heard) + '»</div><div class="mt"><span class="small muted">Mejor así</span><div style="font-weight:650">' + esc(j.correccion || it.model) + '</div></div>' + (j.consejo ? '<div class="note mt">💡 ' + esc(j.consejo) + '</div>' : '');
          if (!ok && j.correccion) Memory.record(lang, { type: 'speak', item: { id: '', t: j.correccion, es: '' } }, false, { best: j.correccion, err: 'speaking' }, heard);
        } catch (e) { /* sin IA: valen las palabras clave */ }
      }
    }
    st.res[st.i] = ok; st.good = st.res.filter(Boolean).length;
    Sound.play(ok ? 'ok' : 'bad');
    const say = st.kind === 'reading' || st.kind === 'tongue' ? it.t : it.model;
    $('#sa-foot').innerHTML = '<div class="fb ' + (ok ? 'ok' : 'bad') + '"><h3>' + (ok ? ic('check') + ' ¡Muy bien!' : '💪 Casi, sigue así') + '</h3>' + html +
      '<div class="row wrap">' + (say ? '<button class="btn sm ghost" data-act="say" data-text="' + esc(say) + '">' + ic('speaker', 'sm') + ' Escuchar</button>' : '') + '<button class="btn sm ghost" data-act="sa-retry">Repetir</button></div>' +
      '<button class="btn block ' + (ok ? 'good' : 'bad') + '" data-act="sa-next">Continuar</button></div>';
  },
  next() {
    const st = this.st; Speech.stop(); Speech.cancelListen(); st.i++;
    if (st.i < st.items.length) { this.render(); return; }
    P.save('stats'); P.save('memory');
    const xp = 6 + st.good * 2, r = Streak.addXP(xp, 'speak'); celebrate(r); Sound.play(r.extended ? 'streak' : 'win'); if (r.extended) confetti(180);
    openOverlay('<div class="ov-body"><div class="result-hero">' + (r.extended ? flameSvg('on', 'xl') : '<div class="emoji-xl">' + st.K.em + '</div>') + '<h1>' + esc(st.K.t) + '</h1><p class="fg2">' + st.good + ' de ' + st.items.length + ' bien. +' + r.xp + ' XP</p>' + (r.extended ? '<div class="tag flame">🔥 Racha: ' + r.streak + ' días</div>' : '') + '</div>' +
      '<div class="card flat small fg2">Hablar un poco cada día es lo que más rápido mejora tu fluidez. ' + (Speech.canListen() ? '' : 'Consejo: activa el teclado en ' + esc(LANGS[st.lang].es) + ' para que el dictado te entienda mejor.') + '</div></div>' +
      '<div class="ov-foot"><button class="btn block" data-act="sa-open" data-k="' + st.kind + '">Otra ronda</button><button class="btn ghost block" data-act="sa-close">Salir</button></div>');
  },
};
function saInput(lang, live, hint) {
  return live ? '<button class="mic" id="sa-mic" data-act="sa-mic" aria-label="Pulsa y habla">' + ic('mic') + '</button><p class="center small muted" id="sa-hint">' + esc(hint) + '</p><div class="heard" id="sa-heard"></div>'
    : '<div class="card flat small fg2">🎙️ Toca el cuadro y pulsa el <b>micrófono del teclado</b> para dictar en ' + esc(LANGS[lang].es) + '.</div><textarea class="input" id="sa-in" rows="3" autocomplete="off" spellcheck="false" lang="' + Speech.tag(lang) + '" placeholder="Dicta aquí…"></textarea>';
}
ACT['p-speakhub'] = () => { const el = $('#speak'); if (el) el.scrollIntoView({ behavior: 'smooth' }); };
ACT['sa-open'] = (a) => SpeakAct.open(a.dataset.k);
ACT['sa-close'] = () => { SpeakAct.st = null; closeOverlay(); };
ACT['sa-check'] = () => SpeakAct.check();
ACT['sa-next'] = () => SpeakAct.next();
ACT['sa-skip'] = () => { SpeakAct.st.cur.done = true; SpeakAct.next(); };
ACT['sa-retry'] = () => SpeakAct.render();
ACT['sa-mic'] = async (a) => {
  const st = SpeakAct.st; if (!st || st.cur.done) return;
  if (Speech.rec) { Speech.cancelListen(); return; }
  Speech.stop(); a.classList.add('on'); $('#sa-hint').textContent = 'Escuchando…';
  try {
    const r = await Speech.listen(st.lang, { max: st.kind === 'reading' || st.kind === 'scenes' ? 15000 : 10000, onInterim: (t) => { $('#sa-heard').textContent = t; } });
    st.cur.heard = r.text; st.cur.alts = r.alts; a.classList.remove('on'); SpeakAct.check();
  } catch (e) {
    a.classList.remove('on');
    if (Speech.micBlocked) { toast('No tengo acceso al micrófono aquí: usa el dictado del teclado.', 4000); SpeakAct.render(); }
    else $('#sa-hint').textContent = e.code === 'no-speech' ? 'No te he oído. Pulsa y prueba otra vez.' : 'Algo falló con el micro. Prueba otra vez.';
  }
};
/* pares mínimos: primero escuchar y elegir, luego decirlo */
ACT['sa-pair-play'] = (a) => { const st = SpeakAct.st; if (!st) return; const it = st.items[st.i]; Speech.speak(it.w[st.cur.target], st.lang, { slow: a.dataset && a.dataset.slow === '1' }); };
ACT['sa-pair-pick'] = (a) => {
  const st = SpeakAct.st, it = st.items[st.i]; if (st.cur.phase !== 'listen') return;
  const k = +a.dataset.k, ok = k === st.cur.target; st.cur.phase = 'say'; st.cur.listenOk = ok;
  $$('#sa-pair-opts .opt').forEach((b, i) => { b.disabled = true; if (i === st.cur.target) b.classList.add('ok'); else if (i === k) b.classList.add('bad'); });
  Sound.play(ok ? 'ok' : 'bad');
  const other = 1 - st.cur.target;
  $('#sa-pair-say').innerHTML = '<div class="card flat small fg2">' + esc(it.w[0]) + ' = ' + esc(it.m[0] || '') + ' · ' + esc(it.w[1]) + ' = ' + esc(it.m[1] || '') + (it.tip ? '<br>💡 ' + esc(it.tip) + '' : '') + '</div><h3 class="mt">Ahora di «' + esc(it.w[other]) + '»</h3>' + saInput(st.lang, Speech.canListen(), 'Pulsa y dilo');
  st.cur.sayWord = it.w[other]; st.cur.notWord = it.w[st.cur.target];
  $('#sa-foot').innerHTML = '<button class="btn block" id="sa-check" data-act="sa-pair-check" disabled>Comprobar</button><button class="btn text" data-act="sa-pair-skip">Saltar</button>';
  SpeakAct.mountInput();
  const mic = $('#sa-mic'); if (mic) mic.dataset.act = 'sa-pair-mic';
};
ACT['sa-pair-mic'] = async (a) => {
  const st = SpeakAct.st; if (!st || st.cur.done) return; if (Speech.rec) { Speech.cancelListen(); return; }
  a.classList.add('on');
  try { const r = await Speech.listen(st.lang, { max: 5000, onInterim: (t) => { $('#sa-heard').textContent = t; } }); st.cur.heard = r.text; st.cur.alts = r.alts; a.classList.remove('on'); ACT['sa-pair-check'](); }
  catch (e) { a.classList.remove('on'); if (Speech.micBlocked) { toast('Usa el dictado del teclado.'); } $('#sa-hint').textContent = 'No te he oído. Prueba otra vez.'; }
};
ACT['sa-pair-check'] = () => {
  const st = SpeakAct.st, heard = st.cur.heard || st.cur.typed || ''; if (!heard.trim() || st.cur.done) return;
  st.cur.done = true; const inp = $('#sa-in'); if (inp) inp.readOnly = true;
  // si las dos palabras solo se distinguen por tildes o diéresis (schon/schön, mes/més), la transcripción tiene que traerlas
  const cands = [heard].concat(st.cur.alts || []).map(canon), has = (h, x) => (' ' + h + ' ').indexOf(' ' + x + ' ') >= 0;
  const w = canon(st.cur.sayWord), strict = loose(w) === loose(st.cur.notWord || '');
  const said = cands.some((h) => has(h, w)) || (!strict && cands.some((h) => has(loose(h), loose(w))));
  const ok = said && st.cur.listenOk; st.res[st.i] = ok; st.good = st.res.filter(Boolean).length;
  P.stats.speak = (P.stats.speak || 0) + 1; Quests.bump('speak', 1);
  Sound.play(said ? 'ok' : 'bad');
  $('#sa-foot').innerHTML = '<div class="fb ' + (said ? 'ok' : 'bad') + '"><h3>' + (said ? '✓ Te he entendido «' + esc(st.cur.sayWord) + '»' : 'He oído «' + esc(heard) + '»') + '</h3>' + (said ? '' : '<div class="small fg2">Exagera la diferencia de sonido y repite.</div>') +
    '<div class="row"><button class="btn sm ghost" data-act="say" data-text="' + esc(st.cur.sayWord) + '">' + ic('speaker', 'sm') + ' Escuchar</button></div><button class="btn block ' + (said ? 'good' : 'bad') + '" data-act="sa-next">Continuar</button></div>';
};
ACT['sa-pair-skip'] = () => SpeakAct.next();
