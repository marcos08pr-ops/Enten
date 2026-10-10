/* ============ Parla · lecciones ============ */
function tutorSystem(lang) {
  const L = LANGS[lang], pr = P.profile;
  return 'Eres ' + L.persona.name + ', tutor/a de ' + L.es + ' en Parla, una app tipo Duolingo. ' + L.persona.bio +
    ' Hablas al alumno de tú, en castellano de España salvo cuando practicáis en ' + L.es + '. Eres ' + ((pr.prefs || {}).tone === 'serio' ? 'claro y preciso' : 'cercano, motivador y con algo de humor') + '. ' +
    'Usa lo que recuerdas del alumno para personalizar ejemplos y para insistir en sus puntos débiles, sin mencionar que tienes una ficha.\n\nFicha del alumno:\n' + Memory.context(lang);
}

function startUnitLesson(ui, li) {
  const lang = P.profile.active, C = P.courseData(), c = P.course(), u = C.units[ui], l = Course.lessons(u)[li];
  const newIds = new Set(l.words.concat(l.sents).filter((it) => !SRS.get(c, it.id)).map((it) => it.id));
  const prevIds = C.units.slice(0, ui).flatMap((x) => x.words.concat(x.sents)).map((x) => x.id);
  const due = SRS.due(c, prevIds).slice(0, 2);
  const weak = SRS.weak(c, Object.keys(c.srs || {})).filter((id) => C.byId[id] && newIds.has(id) === false).slice(0, 2);
  const extra = uniq(due.concat(weak)).map((id) => C.byId[id]).filter(Boolean);
  Lesson.start({ kind: l.review ? 'review' : 'unit', lang, course: C, words: l.words, sents: l.sents, extra, newIds, unit: u, li, title: u.t + ' · ' + l.label });
}
function learnedItems(C, c) { return C.units.filter((u) => !u.pending).flatMap((u) => u.words.concat(u.sents)).filter((it) => SRS.get(c, it.id)); }
function startReview(only) {
  const lang = P.profile.active, C = P.courseData(), c = P.course();
  const seen = learnedItems(C, c).concat(Object.values(c.custom || {}).filter((x) => SRS.get(c, x.id)));
  if (seen.length < 4) { toast('Haz alguna lección antes: el repaso usa lo que ya has visto.'); return; }
  const get = (id) => C.byId[id] || (c.custom || {})[id];
  const ids = seen.map((x) => x.id);
  const pool = uniq(SRS.due(c, ids).concat(SRS.weak(c, ids)).concat(shuffle(ids.slice()))).slice(0, 12).map(get).filter(Boolean);
  Lesson.start({ kind: 'practice', lang, course: C, words: pool.filter((x) => x.k === 'w'), sents: pool.filter((x) => x.k === 's'), newIds: new Set(), only, title: only === 'listen' ? 'Escucha' : only === 'speak' ? 'Habla' : 'Repaso inteligente' });
}
function startWeak() {
  const lang = P.profile.active, C = P.courseData(), c = P.course();
  const ids = uniq(Memory.recent(lang, 40).reverse().map((x) => x.id).concat(SRS.weak(c, Object.keys(c.srs || {})))).filter((id) => C.byId[id]).slice(0, 10);
  if (ids.length < 3) { toast('Aún no hay fallos que repasar. ¡Bien hecho!'); return; }
  const items = ids.map((id) => C.byId[id]);
  Lesson.start({ kind: 'practice', lang, course: C, words: items.filter((x) => x.k === 'w'), sents: items.filter((x) => x.k === 's'), newIds: new Set(), title: 'Tus fallos' });
}
ACT['practice-weak'] = () => startWeak();

const Lesson = {
  st: null,
  start(spec) {
    const pr = P.profile;
    spec.level = spec.level || pr.level; spec.prefs = (pr.prefs && pr.prefs.styles) || [];
    spec.custom = P.course(spec.lang).custom || {};
    const ex = spec.exercises || buildLesson(spec);
    if (!ex.length) { toast('No hay ejercicios disponibles.'); return; }
    this.st = { spec, ex, i: 0, ok: 0, total: 0, combo: 0, maxCombo: 0, wrongRun: 0, lives: spec.level === 'experto' && spec.kind !== 'placement' ? 3 : 99, t0: Date.now(), retried: false, mistakes: [], cur: {}, answered: false, placeWrong: 0, results2: [] };
    Speech.rate = pr.rate || 0.95; Speech.prefs = pr.voices || {};
    this.render();
  },
  ex() { return this.st.ex[this.st.i]; },
  render() {
    const st = this.st, e = this.ex(), lvl = st.spec.level; st.cur = { sel: null, ans: [], typed: '', heard: '', score: 0 }; st.answered = false;
    const prog = st.i / st.ex.length;
    const top = '<div class="ov-top"><button class="icon-btn" data-act="ls-quit" aria-label="Salir">' + ic('close') + '</button><div class="ls-prog bar"><i style="width:' + (prog * 100) + '%"></i></div>' +
      (st.lives < 99 ? '<span class="lives">❤️ ' + st.lives + '</span>' : st.combo >= 3 ? '<span class="combo">🔥 ×' + st.combo + '</span>' : '') + '</div>';
    const timer = lvl === 'experto' && ['match', 'speak'].indexOf(e.type) < 0 && st.spec.kind !== 'placement' ? '<div class="timer"><i id="ls-timer" style="width:100%"></i></div>' : '';
    const root = openOverlay(top + timer + '<div class="ov-body" id="ls-body">' + this.body(e) + '</div><div class="ov-foot" id="ls-foot">' + this.foot(e) + '</div>');
    this.mount(root, e);
    if (timer) this.startTimer(25);
  },
  foot(e) {
    const skip = e.type === 'speak' ? '<button class="btn text" data-act="ls-nospeak">No puedo hablar ahora</button>' : (e.type === 'listen' || e.type === 'listenPick') ? '<button class="btn text" data-act="ls-nolisten">No puedo escuchar ahora</button>' : '';
    return (e.type === 'match' ? '' : '<button class="btn block" id="ls-check" data-act="ls-check" disabled>Comprobar</button>') + skip;
  },
  body(e) {
    const it = e.item, lang = this.st.spec.lang, sp = (t, cls) => '<button class="spk ' + (cls || '') + '" data-act="say" data-text="' + esc(t) + '" data-lang="' + lang + '"' + (cls === 'slow' ? ' data-slow="1"' : '') + ' aria-label="' + (cls === 'slow' ? 'Escuchar despacio' : 'Escuchar') + '">' + ic(cls === 'slow' ? 'turtle' : 'speaker', cls === 'xl' ? '' : '') + '</button>';
    const newTag = e.isNew ? '<span class="newword">' + ic('spark', 'sm') + ' Palabra nueva</span>' : '';
    const hints = this.st.spec.level === 'facil';
    switch (e.type) {
      case 'pic':
        return newTag + '<h2 class="prompt-title">Elige «' + esc(it.es) + '»</h2><div class="pic-grid">' + e.options.map((o, i) => '<button class="opt pic" data-act="ls-opt" data-i="' + i + '" data-say="' + esc(o.t) + '"><span class="em">' + o.em + '</span><span>' + esc(o.t) + '</span></button>').join('') + '</div>';
      case 'choice':
        return newTag + (e.dir === 't2es'
          ? '<h2 class="prompt-title">¿Qué significa?</h2><div class="say">' + sp(it.t) + '<div class="txt">' + esc(it.t) + '</div></div>'
          : '<h2 class="prompt-title">¿Cómo se dice «' + esc(it.es) + '»?</h2>') +
          '<div class="opts">' + e.options.map((o, i) => '<button class="opt" data-act="ls-opt" data-i="' + i + '"' + (e.dir === 'es2t' ? ' data-say="' + esc(o) + '"' : '') + '><span class="k">' + (i + 1) + '</span>' + esc(o) + '</button>').join('') + '</div>';
      case 'bank':
        return '<h2 class="prompt-title">Traduce esta frase</h2><div class="say">' + (e.dir === 't2es' ? sp(it.t) : '') + '<div class="txt">' + esc(e.dir === 't2es' ? it.t : it.es) + '</div></div>' +
          '<div class="answer-line" id="ls-ans"></div><div class="tiles" id="ls-tiles">' + e.tiles.map((t) => '<button class="tile" data-act="ls-tile" data-i="' + t.i + '">' + esc(t.t) + '</button>').join('') + '</div>';
      case 'type':
        return '<h2 class="prompt-title">Escríbelo en ' + LANGS[lang].es + '</h2><div class="say"><div class="txt">' + esc(it.es) + '</div></div>' + (hints && it.k === 's' ? '<p class="small muted">Pista: empieza por «' + esc(tokens(it.t).slice(0, 2).join(' ')) + '…»</p>' : '') +
          '<textarea class="input" id="ls-in" rows="3" autocomplete="off" autocapitalize="sentences" spellcheck="false" lang="' + Speech.tag(lang) + '" placeholder="Escribe en ' + LANGS[lang].es + '"></textarea>' + this.keys(lang);
      case 'listen':
        return '<h2 class="prompt-title">Escribe lo que oyes</h2><div class="row" style="justify-content:center;gap:16px">' + sp(it.t, 'xl') + sp(it.t, 'slow') + '</div>' +
          '<textarea class="input" id="ls-in" rows="3" autocomplete="off" autocapitalize="sentences" spellcheck="false" lang="' + Speech.tag(lang) + '" placeholder="Escribe en ' + LANGS[lang].es + '"></textarea>' + this.keys(lang);
      case 'listenPick':
        return '<h2 class="prompt-title">¿Qué has oído?</h2><div class="row" style="justify-content:center;gap:16px">' + sp(it.t, 'xl') + sp(it.t, 'slow') + '</div>' +
          '<div class="opts">' + e.options.map((o, i) => '<button class="opt" data-act="ls-opt" data-i="' + i + '"><span class="k">' + (i + 1) + '</span>' + esc(this.st.spec.level === 'experto' ? '🔈 Opción ' + (i + 1) : o) + '</button>').join('') + '</div>';
      case 'speak': {
        const live = Speech.canListen();
        return '<h2 class="prompt-title">Dilo en voz alta</h2><div class="say">' + sp(it.t) + '<div class="txt">' + esc(it.t) + '<div class="small muted" style="margin-top:4px">' + esc(it.es) + '</div></div></div>' +
          (live ? '<button class="mic" id="ls-mic" data-act="ls-mic" aria-label="Pulsa y habla">' + ic('mic') + '</button><p class="center small muted" id="ls-mic-hint">Pulsa el micro y lee la frase</p><div class="heard" id="ls-heard"></div>'
            : '<div class="card flat small fg2">🎙️ Toca el cuadro y pulsa el <b>micrófono del teclado</b> para dictar la frase. Pon el teclado en ' + LANGS[lang].es + ' (en iPhone: Ajustes → General → Teclado → Teclados).</div>' +
              '<textarea class="input" id="ls-in" rows="2" autocomplete="off" spellcheck="false" lang="' + Speech.tag(lang) + '" placeholder="Dicta aquí…"></textarea><div class="heard" id="ls-heard"></div>');
      }
      case 'match': {
        const L = shuffle(e.items.slice()), R = shuffle(e.items.slice());
        return '<h2 class="prompt-title">Une las parejas</h2><div class="match-grid">' + L.map((x, k) => '<button class="opt" data-act="ls-match" data-side="L" data-id="' + x.id + '" data-say="' + esc(x.t) + '">' + esc(x.t) + '</button><button class="opt" data-act="ls-match" data-side="R" data-id="' + R[k].id + '">' + esc(R[k].es) + '</button>').join('') + '</div>';
      }
      case 'cloze':
        return '<h2 class="prompt-title">Completa la frase</h2><div class="say">' + sp(it.t) + '<div class="txt">' + e.tokens.map((t, i) => (i === e.idx ? '<span id="ls-gap" style="display:inline-block;min-width:70px;border-bottom:2px solid var(--accent);text-align:center;color:var(--accent-hi)">&nbsp;</span>' : esc(t))).join(' ') + '<div class="small muted" style="margin-top:4px">' + esc(it.es) + '</div></div></div>' +
          '<div class="tiles">' + e.options.map((o, i) => '<button class="tile" data-act="ls-opt" data-i="' + i + '">' + esc(o) + '</button>').join('') + '</div>';
      case 'gender':
        return '<h2 class="prompt-title">¿Qué artículo lleva?</h2><div class="emoji-xl">' + (it.em || '') + '</div><div class="big-word">' + esc(it.noun) + '</div><p class="center muted">' + esc(it.es) + '</p>' +
          '<div class="opts">' + e.options.map((o, i) => '<button class="opt" data-act="ls-opt" data-i="' + i + '" style="justify-content:center;font-size:20px">' + esc(o) + '</button>').join('') + '</div>';
    }
    return '';
  },
  keys(lang) { const ch = LANGS[lang].chars || []; return ch.length ? '<div class="keys">' + ch.map((c) => '<button data-act="ls-key" data-k="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' : ''; },
  mount(root, e) {
    const inp = $('#ls-in', root);
    if (inp) {
      inp.addEventListener('input', () => { this.st.cur.typed = inp.value; const b = $('#ls-check'); if (b) b.disabled = !inp.value.trim(); });
      inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); const b = $('#ls-check'); if (b && !b.disabled) b.click(); } });
      if (e.type === 'type') setTimeout(() => inp.focus(), 250);
    }
    if (e.type === 'listen' || e.type === 'listenPick') setTimeout(() => Speech.speak(e.item.t, this.st.spec.lang), 350);
    if (e.type === 'match') this.st.cur.match = { L: null, R: null, done: 0, miss: 0 };
  },
  startTimer(sec) {
    clearInterval(this.st.tm); let left = sec; const bar = $('#ls-timer');
    this.st.tm = setInterval(() => {
      left--; if (bar) bar.style.width = Math.max(0, (100 * left) / sec) + '%';
      if (left <= 0) { clearInterval(this.st.tm); if (!this.st.answered) { this.st.cur.timeout = true; this.check(); } }
    }, 1000);
  },
  setReady(on) { const b = $('#ls-check'); if (b) b.disabled = !on; },

  /* ---- comprobar ---- */
  evaluate(e) {
    const cur = this.st.cur, lvl = this.st.spec.level, lang = this.st.spec.lang, c = P.course(lang);
    const extraAlts = (c.alts && c.alts[e.item.id]) || [];
    if (cur.timeout) return { ok: false, res: { best: answersFor(e)[0], err: 'blank', note: 'Se acabó el tiempo.' }, given: '' };
    switch (e.type) {
      case 'pic': { const o = e.options[cur.sel]; return { ok: !!o && o.id === e.item.id, res: { best: e.item.t + ' (' + e.item.es + ')', err: 'vocab' }, given: o ? o.t : '' }; }
      case 'choice': case 'listenPick': case 'cloze': { const g = e.options[cur.sel]; return { ok: g === e.answer, res: { best: e.type === 'cloze' ? e.item.t : e.answer, err: e.type === 'cloze' ? 'grammar' : 'vocab' }, given: g }; }
      case 'gender': {
        const it = e.item, exp = lang === 'de' ? it.art : it.g === 'f' ? 'la' : 'el', g = e.options[cur.sel];
        return { ok: g === exp, exp, res: { best: (lang === 'ca' && it.art === "l'" ? "l'" + it.noun + ' (' + (it.g === 'f' ? 'femenino' : 'masculino') + ')' : exp + ' ' + it.noun), err: 'gender' }, given: g };
      }
      case 'bank': { const given = cur.ans.map((i) => e.tiles.find((t) => t.i === i).t).join(' '); const r = checkText(given, answersFor(e).concat(e.dir === 'es2t' ? extraAlts : []), e.dir === 't2es' ? 'es' : lang, 'experto'); return { ok: r.ok, res: r, given }; }
      case 'type': case 'listen': { const r = checkText(cur.typed, answersFor(e).concat(extraAlts), lang, lvl); if (e.type === 'listen' && !r.ok && r.err !== 'blank') r.err = r.err === 'accent' ? 'accent' : 'listening'; return { ok: r.ok, res: r, given: cur.typed }; }
      case 'speak': {
        const heard = cur.heard || cur.typed || ''; const ans = answersFor(e);
        let best = { score: 0, words: [] }, bestA = ans[0];
        ans.forEach((a) => { const sc = speechScore(heard, a); if (sc.score > best.score) { best = sc; bestA = a; } });
        (cur.alts || []).forEach((h) => { const sc = speechScore(h, bestA); if (sc.score > best.score) best = sc; });
        cur.score = best.score; cur.words = best.words;
        const ok = best.score >= SPEAK_PASS[lvl];
        return { ok, res: { best: bestA, err: 'speaking', note: 'Te he entendido un ' + Math.round(best.score * 100) + '%.' }, given: heard };
      }
      case 'match': { const m = cur.match; return { ok: m.miss <= 1, res: { best: '', err: 'vocab', note: m.miss ? 'Fallos al emparejar: ' + m.miss : '' }, given: '' }; }
    }
    return { ok: false, res: {}, given: '' };
  },
  check() {
    const st = this.st, e = this.ex(); if (st.answered) return;
    if (e.type !== 'match' && e.type !== 'speak' && !st.cur.timeout && st.cur.sel == null && !st.cur.typed && !st.cur.ans.length) return;
    clearInterval(st.tm); st.answered = true;
    const lang = st.spec.lang, c = P.course(lang);
    const r = this.evaluate(e); st.last = r;
    const first = !e.retry;
    if (first) st.total++;
    if (r.ok) { if (first) st.ok++; st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo); st.wrongRun = 0; Sound.play('ok'); }
    else { st.combo = 0; st.wrongRun++; Sound.play('bad'); buzz(40); if (st.lives < 99) st.lives--; if (!e.retry) st.mistakes.push({ e, r }); if (st.spec.kind === 'placement') st.placeWrong++; }
    // memoria y repetición espaciada
    if (st.spec.kind !== 'placement') {
      if (e.type === 'match') e.items.forEach((x) => SRS.mark(c, x.id, true)); else SRS.mark(c, e.item.id, r.ok);
      Memory.record(lang, e, r.ok, r.res, r.given);
    }
    if (st.spec.kind === 'placement') st.results2[st.i] = r.ok;
    if (r.ok && (e.type === 'listen' || e.type === 'listenPick')) { Quests.bump('listen', 1); P.stats.listen = (P.stats.listen || 0) + 1; }
    if (e.type === 'speak' && (st.cur.heard || st.cur.typed)) { Quests.bump('speak', 1); P.stats.speak = (P.stats.speak || 0) + 1; }
    if (!r.ok && !e.retry && st.spec.kind !== 'placement' && e.type !== 'match') { const copy = Object.assign({}, e, { retry: true }); st.ex.push(copy); }
    this.markOptions(e, r);
    this.feedback(e, r);
  },
  markOptions(e, r) {
    if (['choice', 'listenPick', 'cloze', 'gender', 'pic'].indexOf(e.type) >= 0) {
      $$('#ls-body [data-act="ls-opt"]').forEach((b, i) => {
        const o = e.options[i]; const isAns = e.type === 'pic' ? o.id === e.item.id : e.type === 'gender' ? o === r.exp : o === e.answer;
        if (isAns) b.classList.add('ok'); else if (i === this.st.cur.sel) b.classList.add('bad');
        b.disabled = true;
      });
    }
    if (e.type === 'cloze') { const g = $('#ls-gap'); if (g) g.textContent = e.answer; }
    if (e.type === 'speak' && this.st.cur.words) { const h = $('#ls-heard'); if (h) h.innerHTML = this.st.cur.words.map((w) => '<span class="' + (w.ok ? 'w-ok' : 'w-no') + '">' + esc(w.w) + '</span>').join(' '); }
    const inp = $('#ls-in'); if (inp) inp.readOnly = true;
  },
  feedback(e, r) {
    const st = this.st, ok = r.ok, lang = st.spec.lang;
    const praise = ['¡Genial!', '¡Perfecto!', '¡Así se hace!', '¡Muy bien!', '¡Bravo!', '¡Clavado!'];
    const sol = r.res && r.res.best ? r.res.best : '';
    const showSol = !ok || (r.res && r.res.note);
    const canJudge = !ok && ['type', 'listen', 'bank'].indexOf(e.type) >= 0 && r.given && AI.ok();
    const html = '<div class="fb ' + (ok ? 'ok' : 'bad') + '"><h3>' + (ok ? ic('check') + ' ' + praise[rand(praise.length)] + (st.combo >= 3 ? ' <span class="combo">🔥 ×' + st.combo + '</span>' : '') : '✖ ' + (st.cur.timeout ? 'Se acabó el tiempo' : 'Casi…')) + '</h3>' +
      (showSol && sol ? '<div class="row"><div class="grow"><div class="small muted">' + (ok ? 'Corrección' : 'Solución') + '</div><div class="sol">' + esc(sol) + '</div></div>' + (e.type !== 'match' ? '<button class="spk mini" data-act="say" data-text="' + esc(e.item.t) + '" data-lang="' + lang + '" aria-label="Escuchar">' + ic('speaker') + '</button>' : '') + '</div>' : '') +
      (r.res && r.res.note ? '<div class="note">' + esc(r.res.note) + '</div>' : '') +
      (!ok && r.given && e.type !== 'speak' ? '<div class="note">Tu respuesta: «' + esc(r.given) + '»</div>' : '') +
      '<div id="ls-ai"></div>' +
      (!ok && AI.ok() ? '<div class="row wrap"><button class="btn sm ghost" data-act="ls-explain">' + ic('spark', 'sm') + ' Explícamelo</button>' + (canJudge ? '<button class="btn sm ghost" data-act="ls-judge">Mi respuesta vale</button>' : '') + '</div>' : '') +
      '<button class="btn block ' + (ok ? 'good' : 'bad') + '" data-act="ls-next" id="ls-next">Continuar</button></div>';
    $('#ls-foot').innerHTML = html;
    if (ok && e.type !== 'speak' && e.type !== 'match' && e.type !== 'listen') Speech.speak(e.item.t, lang);
    setTimeout(() => { const b = $('#ls-next'); if (b) b.focus(); }, 50);
  },
  next() {
    const st = this.st; Speech.stop(); Speech.cancelListen();
    if (st.lives <= 0) return this.failed();
    if (st.spec.kind === 'placement' && st.placeWrong >= 3) return this.finishPlacement();
    st.i++;
    if (st.i >= st.ex.length) return st.spec.kind === 'placement' ? this.finishPlacement() : this.finish();
    // rescate: tras dos fallos seguidos, el siguiente ejercicio de escribir pasa a fichas
    const nx = this.ex();
    if (st.wrongRun >= 2 && (nx.type === 'type' || nx.type === 'listen') && nx.item.k === 's') {
      const allS = st.spec.course.units.flatMap((u) => u.sents); st.ex[st.i] = Object.assign(mkBank(nx.item, allS, 'es2t', 2, Math.random), { retry: nx.retry });
    }
    this.render();
  },
  failed() {
    Sound.play('bad');
    openOverlay('<div class="ov-body"><div class="result-hero"><div class="emoji-xl">💔</div><h1>Sin vidas</h1><p class="fg2">En modo experto tienes 3 vidas por lección. Los fallos ya están guardados para tu repaso.</p></div></div><div class="ov-foot"><button class="btn block" data-act="ls-retry">Reintentar</button><button class="btn ghost block" data-act="ls-close">Salir</button></div>');
  },
  finish() {
    const st = this.st, sp = st.spec, lang = sp.lang, pr = P.profile, c = P.course(lang), stt = P.stats;
    const acc = st.total ? st.ok / st.total : 1, secs = (Date.now() - st.t0) / 1000;
    let xp = sp.kind === 'unit' || sp.kind === 'review' ? xpFor(sp.level, sp.kind === 'review') : 10;
    xp += (acc >= 0.9 ? 5 : 0) + Math.floor(st.maxCombo / 5);
    stt.lessons = (stt.lessons || 0) + 1; stt.secs = (stt.secs || 0) + secs; if (acc === 1) stt.perfect = (stt.perfect || 0) + 1;
    if (sp.unit) { const k = lessonKey(sp.unit, sp.li); const rec = c.lessons[k] || { n: 0, best: 0 }; rec.n++; rec.best = Math.max(rec.best, acc); rec.last = dayKey(); c.lessons[k] = rec; }
    if (sp.kind === 'practice') Quests.bump('review', st.total);
    P.streak.gems += acc === 1 ? 10 : 5;
    const r = Streak.addXP(xp, 'lesson');
    Quests.bump('lessons', 1); if (acc >= 0.9) Quests.bump('great', 1); Quests.bump('combo', st.maxCombo);
    const lvl = adaptLevel(acc); countWords(); P.save('stats'); P.save('memory'); P.saveCourse(lang); P.save('streak');
    if (st.mistakes.length) Memory.consolidate(lang);
    Sound.play(r.extended ? 'streak' : 'win'); if (r.extended || acc === 1) confetti(r.extended ? 200 : 120);
    celebrate(r);
    const n = r.streak;
    const mist = st.mistakes.slice(0, 4).map((m) => '<div class="row"><span class="tag bad">' + esc(ERR_NAMES[m.r.res.err] || 'Repasar') + '</span><div class="grow small"><b>' + esc(m.r.res.best || m.e.item.t) + '</b>' + (m.r.given ? '<div class="muted">Pusiste: ' + esc(m.r.given) + '</div>' : '') + '</div></div>').join('');
    openOverlay('<div class="ov-body"><div class="result-hero">' +
      (r.extended ? flameSvg('on', 'xl') + '<h1>¡' + n + (n === 1 ? ' día' : ' días') + ' de racha!</h1><p class="fg2">' + (n === 1 ? 'Acabas de encender la llama. Vuelve mañana.' : 'Racha ampliada. Mañana a por el ' + (n + 1) + '.') + '</p>'
        : '<div class="emoji-xl">' + (acc === 1 ? '🏆' : acc >= 0.8 ? '🎉' : '💪') + '</div><h1>' + (acc === 1 ? '¡Lección perfecta!' : acc >= 0.8 ? '¡Lección completada!' : '¡Hecho! Seguimos puliendo') + '</h1>') +
      (r.milestone ? '<div class="card warn"><b>🏅 Hito: ' + r.milestone + ' días de racha</b><div class="small fg2">+' + (r.milestone >= 30 ? 50 : 20) + ' 💎' + ([7, 30, 100].indexOf(r.milestone) >= 0 ? ' y un protector de racha' : '') + '</div></div>' : '') +
      (r.goal ? '<div class="tag good">🎯 Meta diaria cumplida</div>' : '') +
      '</div><div class="stat-grid"><div class="stat xp"><div class="l">XP</div><div class="v">+' + r.xp + '</div></div><div class="stat acc"><div class="l">Precisión</div><div class="v">' + Math.round(acc * 100) + '%</div></div><div class="stat time"><div class="l">Tiempo</div><div class="v">' + fmtDur(secs) + '</div></div></div>' +
      (lvl ? '<div class="card accent"><b>' + (LEVEL_ORDER.indexOf(lvl) > LEVEL_ORDER.indexOf(sp.level) ? '📈 Subo la dificultad a ' : '🫶 Bajo la dificultad a ') + LEVELS[lvl].name + '</b><div class="small fg2">' + esc(LEVELS[lvl].d) + ' Lo puedes cambiar en Ajustes.</div></div>' : '') +
      (mist ? '<div class="card"><h3>Para repasar</h3><div class="list mt">' + mist + '</div><p class="small muted mt">Volverán en tu repaso en el momento justo.</p></div>' : '') +
      '<div class="card flat"><h3>Misiones</h3><div class="stack tight mt">' + Quests.ensure().map(questRow).join('') + '</div></div>' +
      '</div><div class="ov-foot"><button class="btn block" data-act="ls-close">Continuar</button></div>');
  },
  finishPlacement() {
    const st = this.st, lang = st.spec.lang, c = P.course(lang);
    // la unidad de inicio es la de la primera pregunta que falló (o la siguiente a la última acertada)
    let unit = 0; for (let k = 0; k < st.results2.length; k++) { if (st.results2[k]) unit = k + 1; else break; }
    const C = st.spec.course; unit = Math.min(unit, C.units.length - 1);
    c.unlocked = unit; c.placed = true; P.saveCourse(lang);
    openOverlay('<div class="ov-body"><div class="result-hero"><div class="emoji-xl">🧭</div><h1>' + (unit ? 'Empiezas en la unidad ' + (unit + 1) : 'Empezamos desde el principio') + '</h1><p class="fg2">' + (unit ? 'Las unidades anteriores quedan abiertas para repasar cuando quieras.' : 'Irás rápido en lo que ya sabes: el curso se adapta a tus aciertos.') + '</p>' + (C.units[unit] ? '<div class="card"><b>' + C.units[unit].icon + ' ' + esc(C.units[unit].t) + '</b> · ' + C.units[unit].cefr + '</div>' : '') + '</div></div><div class="ov-foot"><button class="btn block" data-act="ls-close">Vamos</button></div>');
  },
};
/* Prueba de nivel */
function startPlacement(lang) {
  const C = P.courseData(lang), ex = buildPlacement(C);
  Lesson.start({ kind: 'placement', lang, course: C, words: [], sents: [], exercises: ex, level: 'normal', title: 'Prueba de nivel' });
}

/* ---------- acciones de la lección ---------- */
ACT['ls-opt'] = (a) => {
  const st = Lesson.st; if (!st || st.answered) return;
  st.cur.sel = +a.dataset.i; $$('#ls-body [data-act="ls-opt"]').forEach((b) => b.classList.toggle('sel', b === a));
  if (a.dataset.say) Speech.speak(a.dataset.say, st.spec.lang);
  const e = Lesson.ex(); if (e.type === 'cloze') { const g = $('#ls-gap'); if (g) g.textContent = e.options[st.cur.sel]; }
  Sound.play('tap'); Lesson.setReady(true);
};
ACT['ls-tile'] = (a) => {
  const st = Lesson.st; if (!st || st.answered) return;
  const i = +a.dataset.i, e = Lesson.ex(), ans = $('#ls-ans'), bank = $('#ls-tiles');
  const k = st.cur.ans.indexOf(i);
  if (k >= 0) { st.cur.ans.splice(k, 1); a.remove(); const g = bank.querySelector('[data-i="' + i + '"]'); if (g) g.classList.remove('ghost'); }
  else {
    st.cur.ans.push(i); a.classList.add('ghost');
    const t = e.tiles.find((x) => x.i === i); const b = document.createElement('button'); b.className = 'tile'; b.dataset.act = 'ls-tile'; b.dataset.i = i; b.textContent = t.t; ans.appendChild(b);
    if (e.dir === 'es2t') Speech.speak(t.t, st.spec.lang);
  }
  Sound.play('tap'); Lesson.setReady(st.cur.ans.length > 0);
};
ACT['ls-key'] = (a) => {
  const inp = $('#ls-in'); if (!inp || inp.readOnly) return;
  const s = inp.selectionStart || inp.value.length, en = inp.selectionEnd || s;
  inp.value = inp.value.slice(0, s) + a.dataset.k + inp.value.slice(en); inp.focus();
  const p = s + a.dataset.k.length; try { inp.setSelectionRange(p, p); } catch (e) {}
  inp.dispatchEvent(new Event('input'));
};
ACT['ls-match'] = (a) => {
  const st = Lesson.st; if (!st || st.answered || a.classList.contains('gone')) return;
  const m = st.cur.match, side = a.dataset.side;
  if (side === 'L' && a.dataset.say) Speech.speak(a.dataset.say, st.spec.lang);
  if (m[side]) m[side].classList.remove('sel');
  m[side] = a; a.classList.add('sel'); Sound.play('tap');
  if (m.L && m.R) {
    const L = m.L, R = m.R; m.L = m.R = null;
    if (L.dataset.id === R.dataset.id) {
      [L, R].forEach((b) => { b.classList.remove('sel'); b.classList.add('ok'); setTimeout(() => b.classList.add('gone'), 260); });
      m.done++; Sound.play('ok');
      if (m.done >= Lesson.ex().items.length) setTimeout(() => Lesson.check(), 380);
    } else {
      m.miss++; [L, R].forEach((b) => { b.classList.remove('sel'); b.classList.add('bad'); setTimeout(() => b.classList.remove('bad'), 450); }); Sound.play('bad'); buzz(30);
    }
  }
};
ACT['ls-check'] = () => Lesson.check();
ACT['ls-next'] = () => Lesson.next();
ACT['ls-close'] = () => { Lesson.st = null; App.scrolled = false; closeOverlay(); };
ACT['ls-retry'] = () => { const sp = Lesson.st.spec; Lesson.st = null; if (sp.unit) startUnitLesson(sp.unit.idx, sp.li); else closeOverlay(); };
ACT['ls-quit'] = async () => {
  clearInterval(Lesson.st && Lesson.st.tm);
  const yes = await confirmBox({ title: '¿Salir de la lección?', text: 'Perderás el progreso de esta lección. Lo que hayas fallado ya está guardado para el repaso.', ok: 'Salir', cancel: 'Seguir practicando', danger: true });
  if (yes) { P.saveCourse(); P.save('memory'); Lesson.st = null; closeOverlay(); }
};
ACT['ls-nospeak'] = () => { Session.noSpeakUntil = Date.now() + 3600000; toast('Sin ejercicios de hablar durante una hora'); Lesson.st.answered = true; Lesson.next(); };
ACT['ls-nolisten'] = () => { Session.noListenUntil = Date.now() + 3600000; toast('Sin ejercicios de escuchar durante una hora'); Lesson.st.answered = true; Lesson.next(); };
ACT['ls-mic'] = async (a) => {
  const st = Lesson.st; if (!st || st.answered) return;
  if (Speech.rec) { Speech.cancelListen(); return; }
  Speech.stop(); a.classList.add('on'); $('#ls-mic-hint').textContent = 'Escuchando… habla ahora';
  try {
    const r = await Speech.listen(st.spec.lang, { onInterim: (t) => { $('#ls-heard').textContent = t; } });
    st.cur.heard = r.text; st.cur.alts = r.alts; a.classList.remove('on'); Lesson.check();
  } catch (e) {
    a.classList.remove('on');
    if (Speech.micBlocked) { toast('No tengo acceso al micrófono aquí: usa el dictado del teclado.', 4000); $('#ls-body').innerHTML = Lesson.body(Lesson.ex()); Lesson.mount($('#overlay'), Lesson.ex()); }
    else $('#ls-mic-hint').textContent = e.code === 'no-speech' ? 'No te he oído. Pulsa y prueba otra vez.' : 'Algo falló con el micro. Prueba otra vez.';
  }
};
ACT['ls-explain'] = async (a) => {
  const st = Lesson.st, e = Lesson.ex(), r = st.last, lang = st.spec.lang, box = $('#ls-ai');
  a.disabled = true; box.innerHTML = '<div class="ai-box"><span class="typing"><i></i><i></i><i></i></span></div>';
  const long = (P.profile.prefs || {}).explain === 'detallada';
  try {
    const t = await AI.text({ system: tutorSystem(lang), messages: [{ role: 'user', content: 'Ejercicio: ' + promptText(e) + '\nRespuesta correcta: «' + (r.res.best || e.item.t) + '» (significa: «' + e.item.es + '»)\nMi respuesta: «' + (r.given || '(nada)') + '»\nExplícame en castellano por qué está mal y un truco para recordarlo' + (long ? ', con un par de ejemplos. Máximo 140 palabras.' : '. Máximo 60 palabras, directo.') }], onText: (x) => { box.firstChild.textContent = x; } });
    box.firstChild.textContent = t; markAiOk();
  } catch (err) { box.innerHTML = '<p class="small" style="color:var(--bad)">' + esc(AI.msg(err)) + '</p>'; a.disabled = false; }
};
ACT['ls-judge'] = async (a) => {
  const st = Lesson.st, e = Lesson.ex(), r = st.last, lang = st.spec.lang, box = $('#ls-ai');
  a.disabled = true; box.innerHTML = '<div class="ai-box"><span class="typing"><i></i><i></i><i></i></span></div>';
  const tgtIsEs = e.type === 'bank' && e.dir === 't2es';
  try {
    const j = await AI.json({ system: 'Eres un corrector estricto pero justo de ' + (tgtIsEs ? 'castellano' : LANGS[lang].es) + '.', prompt: 'Frase original: «' + (tgtIsEs ? e.item.t : e.type === 'listen' ? e.item.t : e.item.es) + '»\nTraducciones de referencia: ' + answersFor(e).map((x) => '«' + x + '»').join(', ') + '\nRespuesta del alumno: «' + r.given + '»\n' + (e.type === 'listen' ? 'Es un dictado: solo vale si escribió exactamente lo mismo (se toleran mayúsculas y puntuación).' : '¿Es una traducción correcta y natural con el mismo significado?') + ' Devuelve {"correct": true|false, "why": "explicación breve en castellano (máx. 40 palabras)"}' });
    box.innerHTML = '<div class="ai-box">' + esc((j.correct ? '✅ ' : '❌ ') + (j.why || '')) + '</div>'; markAiOk();
    if (j.correct) {
      const c = P.course(lang); if (!tgtIsEs) { c.alts = c.alts || {}; c.alts[e.item.id] = uniq((c.alts[e.item.id] || []).concat(r.given)).slice(-5); }
      if (!e.retry) { st.ok++; st.mistakes.pop(); } SRS.mark(c, e.item.id, true); if (st.lives < 99) st.lives++;
      const k = st.ex.findIndex((x, idx) => idx > st.i && x.retry && x.item === e.item); if (k > st.i) st.ex.splice(k, 1);
      P.saveCourse(lang); const fb = $('.fb'); if (fb) { fb.classList.remove('bad'); fb.classList.add('ok'); } toast('Respuesta aceptada y guardada como válida');
    }
  } catch (err) { box.innerHTML = '<p class="small" style="color:var(--bad)">' + esc(AI.msg(err)) + '</p>'; a.disabled = false; }
};
document.addEventListener('keydown', (ev) => {
  if (!Lesson.st || !$('#overlay').innerHTML || $('#sheet-root').innerHTML) return;
  if (ev.target && /input|textarea/i.test(ev.target.tagName)) return;
  if (ev.key === 'Enter') { const n = $('#ls-next') || $('#ls-check'); if (n && !n.disabled) { ev.preventDefault(); n.click(); } }
  else if (/^[1-4]$/.test(ev.key)) { const o = $$('#ls-body [data-act="ls-opt"]')[+ev.key - 1]; if (o && !o.disabled) o.click(); }
});
