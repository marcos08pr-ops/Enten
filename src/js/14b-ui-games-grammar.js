/* ============ Parla · juegos de gramática ============
   Verbos contrarreloj, Ruleta de verbos (escribir la forma), Determinantes exprés y Género y número. */
GAME_LIST.push(
  { id: 'conjrush', em: '⚡', t: 'Verbos contrarreloj', d: '60 s conjugando: elige la forma correcta. Los combos dan tiempo extra.', only: ['ca', 'de'], req: (l) => !!Gram.verbsData(l) },
  { id: 'ruleta', em: '🎡', t: 'Ruleta de verbos', d: 'Gira: verbo, persona y tiempo al azar. Escribe la forma sin fallar.', only: ['ca', 'de'], req: (l) => !!Gram.verbsData(l) },
  { id: 'detrush', em: '🔤', t: 'Determinantes exprés', d: 'Artículos, posesivos, demostrativos y contracciones a toda velocidad.', only: ['ca', 'de'], req: (l) => ((RUSH_DRILLS.detrush[l] || []).some((id) => Gram.drill(l, id))) },
  { id: 'numrush', em: '🔢', t: 'Género y número', d: 'Plurales y concordancias contra el reloj.', only: ['ca', 'de'], req: (l) => ((RUSH_DRILLS.numrush[l] || []).some((id) => Gram.drill(l, id))) }
);
const RUSH_DRILLS = {
  detrush: { ca: ['articles', 'personal', 'contraccions', 'possessius', 'demostratius'], de: ['artikel', 'akkusativ', 'possessiv', 'dativ'] },
  numrush: { ca: ['plurals', 'adjectius'], de: ['plural', 'adjektiv'] },
};
/* Un único motor para los tres juegos con opciones y reloj */
const Rush = {
  open(kind) {
    const lang = P.profile.active; let gen = null, title = '';
    if (kind === 'conjrush') {
      const V = Gram.verbsData(lang); if (!V) { toast('No disponible en este idioma'); return; }
      const ten = Gram.tensesUpTo(lang, userCefr(lang)).map((t) => t.id), vs = Gram.verbsUpTo(lang, userCefr(lang));
      title = 'Verbos contrarreloj';
      gen = () => { const v = vs[rand(vs.length)], t = ten[rand(ten.length)], e = Gram.conjEx(lang, v, t, rand(6), 'facil'); return e && { html: '<div class="tag" style="align-self:center">' + esc(e.tense.name) + '</div><div class="speed-word">' + esc(e.person) + ' · ' + esc(v.inf) + '</div><p class="center muted small">' + esc(v.es) + '</p>', opts: e.options, ans: e.answers, say: e.item.t, id: e.item.id }; };
    } else {
      const ids = (RUSH_DRILLS[kind] || {})[lang] || [];
      const pool = ids.map((id) => Gram.drill(lang, id)).filter(Boolean).flatMap((d) => Gram.items(lang, d).filter((x) => x.kind === 'cloze').map((it) => ({ d, it })));
      if (pool.length < 5) { toast('No disponible en este idioma'); return; }
      title = kind === 'detrush' ? 'Determinantes exprés' : 'Género y número';
      gen = () => { const x = pool[rand(pool.length)], p = x.it.q.split('___'); return { html: '<div class="tag" style="align-self:center">' + esc(x.d.name) + '</div><div class="card center" style="font-size:20px;font-weight:650;line-height:1.4">' + esc(p[0]) + '<span style="color:var(--accent-hi)">___</span>' + esc(p[1] || '') + '</div><p class="center muted small">' + esc(x.it.es) + '</p>', opts: shuffle([x.it.ans[0]].concat(x.it.opts.slice(0, 3))), ans: x.it.ans, say: x.it.q.replace('___', x.it.ans[0]), id: x.it.id, why: x.it.why }; };
    }
    Games.cur = { kind: 'rush', id: kind, lang, gen, left: 60, score: 0, combo: 0, best: 0, q: null, miss: [] };
    openOverlay(gameHead(title, '60 s') + '<div class="ov-body"><div class="row between"><span class="tag">Aciertos: <b id="ru-score">0</b></span><span class="combo" id="ru-combo"></span></div><div class="timer"><i id="ru-bar" style="width:100%"></i></div><div class="stack" id="ru-q"></div><div class="opts" id="ru-opts"></div></div>');
    this.next();
    clearInterval(Games.tm);
    Games.tm = setInterval(() => { const g = Games.cur; if (!g || g.kind !== 'rush') { clearInterval(Games.tm); return; } g.left--; this.tick(); if (g.left <= 0) { clearInterval(Games.tm); this.finish(); } }, 1000);
  },
  tick() { const g = Games.cur; $('#g-right').textContent = Math.max(0, g.left) + ' s'; const b = $('#ru-bar'); if (b) b.style.width = Math.max(0, (100 * g.left) / 60) + '%'; },
  next() {
    const g = Games.cur; let q = null; for (let k = 0; k < 10 && !q; k++) q = g.gen(); if (!q) return;
    g.q = q; $('#ru-q').innerHTML = q.html;
    $('#ru-opts').innerHTML = q.opts.map((o, i) => '<button class="opt" data-act="ru-pick" data-i="' + i + '" style="justify-content:center">' + esc(o) + '</button>').join('');
  },
  finish() {
    const g = Games.cur, names = { conjrush: 'Verbos contrarreloj', detrush: 'Determinantes exprés', numrush: 'Género y número' };
    const rev = g.miss.slice(-3).map((m) => '<br>✖ ' + esc(m)).join('');
    P.saveCourse(); P.save('memory');
    Games.end(g.id, Math.min(16, 3 + Math.round(g.score / 2)), g.score + ' aciertos', 'Mejor combo: ×' + g.best + '.' + (rev ? '<br><span class="small">Para repasar:' + rev + '</span>' : ''), g.score);
  },
};
ACT['ru-pick'] = (a) => {
  const g = Games.cur; if (!g || g.kind !== 'rush' || g.left <= 0) return;
  const o = g.q.opts[+a.dataset.i], ok = g.q.ans.map(canon).indexOf(canon(o)) >= 0;
  if (ok) { g.score++; g.combo++; g.best = Math.max(g.best, g.combo); if (g.combo % 5 === 0) { g.left += 3; toast('+3 s por combo'); } Sound.play('ok'); Quests.bump('gram', 1); }
  else { g.combo = 0; g.left -= 3; Sound.play('bad'); buzz(30); g.miss.push(g.q.say); Memory.record(g.lang, { type: g.id === 'conjrush' ? 'conj' : 'gram', item: { id: g.q.id, t: g.q.say, es: '' } }, false, { best: g.q.say, err: g.id === 'conjrush' ? 'conjugation' : g.id === 'detrush' ? 'determiners' : 'agreement' }, o); }
  SRS.mark(P.course(), g.q.id, ok);
  $('#ru-score').textContent = g.score; $('#ru-combo').textContent = g.combo >= 3 ? '🔥 ×' + g.combo : '';
  Rush.tick(); if (g.left <= 0) { clearInterval(Games.tm); Rush.finish(); return; }
  Rush.next();
};

/* ---------- Ruleta de verbos: escribir la forma ---------- */
const Ruleta = {
  open() {
    const lang = P.profile.active, V = Gram.verbsData(lang); if (!V) { toast('No disponible en este idioma'); return; }
    Games.cur = { kind: 'ruleta', lang, round: 0, rounds: 10, ok: 0, run: 0, bestRun: 0, e: null };
    this.spin();
  },
  spin() {
    const g = Games.cur, lang = g.lang, ten = Gram.tensesUpTo(lang, userCefr(lang)).map((t) => t.id), vs = Gram.verbsUpTo(lang, userCefr(lang));
    g.e = Gram.conjEx(lang, vs[rand(vs.length)], ten[rand(ten.length)], rand(6), 'experto'); g.done = false;
    const e = g.e;
    openOverlay(gameHead('Ruleta de verbos', (g.round + 1) + '/' + g.rounds) + '<div class="ov-body"><div class="row between"><span class="tag">Seguidas: <b>' + g.run + '</b></span><span class="tag">Aciertos: ' + g.ok + '</span></div>' +
      '<div class="card center" id="rl-wheel"><div class="eyebrow">Persona · verbo · tiempo</div><div class="big-word" style="font-size:26px" id="rl-spin">🎡</div></div>' +
      '<input class="input" id="rl-in" autocomplete="off" autocapitalize="off" spellcheck="false" lang="' + Speech.tag(lang) + '" placeholder="Escribe la forma" disabled>' + Lesson.keys(lang) + '<div id="rl-fb"></div></div>' +
      '<div class="ov-foot"><button class="btn block" data-act="rl-check" id="rl-btn" disabled>Comprobar</button></div>');
    // pequeña animación de ruleta
    const V = Gram.verbsData(lang); let k = 0; const el = $('#rl-spin');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = setInterval(() => {
      k++; const vv = V.verbs[rand(V.verbs.length)];
      el.textContent = V.persons[rand(6)].split(' / ')[0] + ' · ' + vv.inf; Sound.play('tap');
      if (k >= (reduce ? 1 : 9)) {
        clearInterval(tick); el.innerHTML = esc(e.person) + ' · ' + esc(e.verb.inf) + '<div class="small muted" style="font-size:14px;font-weight:600;margin-top:6px">' + esc(e.tense.name) + ' · ' + esc(e.verb.es) + '</div>';
        const inp = $('#rl-in'); inp.disabled = false; inp.focus(); $('#rl-btn').disabled = false;
        inp.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ACT['rl-check'](); } };
      }
    }, 90);
  },
};
ACT['rl-check'] = () => {
  const g = Games.cur; if (!g || g.kind !== 'ruleta') return;
  const inp = $('#rl-in');
  if (g.done) { g.round++; if (g.round >= g.rounds) { P.saveCourse(); P.save('memory'); Games.end('ruleta', 4 + g.ok, g.ok + ' de ' + g.rounds, 'Mejor serie: ' + g.bestRun + ' seguidas.', g.bestRun); return; } Ruleta.spin(); return; }
  if (!inp.value.trim()) return;
  const r = checkText(inp.value, g.e.answers, g.lang, 'dificil'); g.done = true; inp.readOnly = true;
  if (r.ok) { g.ok++; g.run++; g.bestRun = Math.max(g.bestRun, g.run); Sound.play('ok'); Quests.bump('gram', 1); } else { g.run = 0; Sound.play('bad'); Memory.record(g.lang, g.e, false, { best: g.e.item.t, err: 'conjugation' }, inp.value); }
  SRS.mark(P.course(), g.e.item.id, r.ok);
  Speech.speak(g.e.item.t, g.lang);
  $('#rl-fb').innerHTML = '<div class="card ' + (r.ok ? '' : 'warn') + '"><b>' + (r.ok ? '✓ ' : '✖ ') + esc(g.e.person + ' ' + g.e.answer) + '</b>' + (r.note ? '<div class="small fg2">' + esc(r.note) + '</div>' : '') + '</div>';
  $('#rl-btn').textContent = g.round + 1 >= g.rounds ? 'Ver resultado' : 'Girar otra vez';
};
const ConjRush = { open: () => Rush.open('conjrush') }, DetRush = { open: () => Rush.open('detrush') }, NumRush = { open: () => Rush.open('numrush') };
ACT.game = (a) => { const g = a.dataset.g; Sound.init(); ({ memory: Memory_G, wordle: Wordle, speed: Speed, hang: Hang, gender: GenderG, anagram: Anagram, conjrush: ConjRush, ruleta: Ruleta, detrush: DetRush, numrush: NumRush })[g].open(); };
