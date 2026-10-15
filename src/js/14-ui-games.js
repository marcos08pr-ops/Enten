/* ============ Parla · juegos ============
   Inspirados en juegos de clase (memory, ahorcado, contrarreloj) y en los fenómenos virales de palabras
   (Wordle en catalán, Paraulògic). Todos dan XP y cuentan para la racha. */
const GAME_LIST = [
  { id: 'memory', em: '🃏', t: 'Parejas', d: 'Memory de cartas: une cada palabra con su traducción.' },
  { id: 'wordle', em: '🟩', t: 'Palabra del día', d: 'Adivina la palabra de 5 letras en 6 intentos. Una nueva cada día.', only: ['ca', 'de'] },
  { id: 'speed', em: '⏱️', t: 'Contrarreloj', d: '60 segundos para acertar todas las que puedas. Los combos suman.' },
  { id: 'hang', em: '🪢', t: 'Ahorcado', d: 'Adivina la palabra letra a letra con una pista.' },
  { id: 'gender', em: '⚖️', t: '¿El o la?', d: 'Los géneros que no coinciden con el castellano.', only: ['ca'] },
  { id: 'gender', em: '⚖️', t: 'Der, die, das', d: 'Ráfaga de artículos con las reglas que te salvan.', only: ['de'] },
  { id: 'anagram', em: '🔀', t: 'Anagramas', d: 'Ordena las letras desordenadas.' },
];
function renderGames(v) {
  const lang = P.profile.active, st = P.stats, wd = st.wordle && st.wordle.day === dayKey() && st.wordle.lang === lang ? st.wordle : null;
  v.innerHTML = '<div class="hello"><h1>Juegos</h1><p class="fg2">Aprender jugando también suma XP y salva tu racha.</p></div>' +
    '<div class="grid2">' + GAME_LIST.filter((g) => (!g.only || g.only.indexOf(lang) >= 0) && (!g.req || g.req(lang))).map((g) =>
      '<button class="tile-card" data-act="game" data-g="' + g.id + '"><span class="em">' + g.em + '</span><h3>' + esc(g.t) + '</h3><p>' + esc(g.d) + '</p>' + (g.id === 'wordle' ? '<span class="tag ' + (wd && wd.done ? 'good' : 'flame') + '">' + (wd && wd.done ? (wd.won ? 'Resuelta hoy' : 'Mañana otra') : 'Nueva hoy') + '</span>' : (st.best && st.best[g.id + lang] ? '<span class="tag">Récord: ' + st.best[g.id + lang] + '</span>' : '')) + '</button>').join('') + '</div>' +
    '<p class="small muted center">' + plural(st.games || 0, 'partida jugada', 'partidas jugadas') + '</p>';
}
ACT.game = (a) => { const g = a.dataset.g; Sound.init(); ({ memory: Memory_G, wordle: Wordle, speed: Speed, hang: Hang, gender: GenderG, anagram: Anagram })[g].open(); };

function gameWords(lang, n, filter) {
  const C = P.courseData(lang), c = P.course(lang);
  let pool = C.units.filter((u) => !u.pending).flatMap((u) => u.words).filter((w) => SRS.get(c, w.id));
  const cu = C.units[currentUnit(lang)]; if (pool.length < n && cu) pool = uniq(pool.concat(cu.words));
  if (pool.length < n) pool = uniq(pool.concat(C.units.filter((u) => !u.pending).slice(0, 3).flatMap((u) => u.words)));
  if (filter) pool = pool.filter(filter);
  return pick(pool, n);
}
const baseCh = (ch) => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const baseWord = (w) => Array.from(w).map(baseCh).join('');
function gameHead(title, right) { return '<div class="ov-top"><button class="icon-btn" data-act="g-close" aria-label="Salir">' + ic('close') + '</button><h3 class="grow">' + esc(title) + '</h3><span id="g-right" style="font-weight:800" class="num">' + (right || '') + '</span></div>'; }
ACT['g-close'] = () => { clearInterval(Games.tm); Games.cur = null; closeOverlay(); };
const Games = {
  tm: 0, cur: null,
  end(id, xp, title, msg, score) {
    const st = P.stats, lang = P.profile.active; st.games = (st.games || 0) + 1;
    if (score != null) { st.best = st.best || {}; if (!st.best[id + lang] || score > st.best[id + lang]) st.best[id + lang] = score; }
    Quests.bump('games', 1); P.save('stats'); P.saveCourse();
    const r = Streak.addXP(Math.max(1, Math.round(xp)), 'game'); celebrate(r); Sound.play(r.extended ? 'streak' : 'win'); if (r.extended) confetti(180);
    openOverlay('<div class="ov-body"><div class="result-hero">' + (r.extended ? flameSvg('on', 'xl') : '<div class="emoji-xl">🎮</div>') + '<h1>' + esc(title) + '</h1><p class="fg2">' + msg + '</p><div class="stat-grid" style="width:100%"><div class="stat xp"><div class="l">XP</div><div class="v">+' + r.xp + '</div></div><div class="stat acc"><div class="l">Racha</div><div class="v">' + r.streak + '</div></div><div class="stat time"><div class="l">Partidas</div><div class="v">' + st.games + '</div></div></div>' +
      (r.extended ? '<div class="tag flame">🔥 ¡Racha ampliada!</div>' : '') + '</div></div><div class="ov-foot"><button class="btn block" data-act="game" data-g="' + id + '">Otra partida</button><button class="btn ghost block" data-act="g-close">Salir</button></div>');
  },
};

/* ---------- Parejas (memory) ---------- */
const Memory_G = {
  open() {
    const lang = P.profile.active, lvl = P.profile.level, pairs = { facil: 6, normal: 8, dificil: 10, experto: 10 }[lvl] || 8;
    const ws = gameWords(lang, pairs); if (ws.length < 4) { toast('Haz alguna lección para desbloquear el juego'); return; }
    const cards = shuffle(ws.flatMap((w) => [{ id: w.id, side: 't', txt: w.t, em: '' }, { id: w.id, side: 'e', txt: w.es, em: w.em }]));
    Games.cur = { kind: 'memory', ws, cards, open: [], done: 0, moves: 0, t0: Date.now(), lock: false };
    const cols = cards.length <= 12 ? 3 : 4;
    openOverlay(gameHead('Parejas', '0 mov.') + '<div class="ov-body"><p class="small muted">Gira dos cartas: una palabra y su traducción. Al girar la de ' + esc(LANGS[lang].es) + ' la oirás.</p><div class="mem-grid" style="grid-template-columns:repeat(' + cols + ',1fr)">' +
      cards.map((c, i) => '<button class="mem" data-act="mem" data-i="' + i + '" aria-label="Carta ' + (i + 1) + '"><span class="b">' + (c.side === 't' ? '✦' : '✦') + '</span><span class="f ' + c.side + '">' + (c.em ? '<span class="em">' + c.em + '</span>' : '') + esc(c.txt) + '</span></button>').join('') + '</div></div>');
  },
};
ACT.mem = (a) => {
  const g = Games.cur; if (!g || g.kind !== 'memory' || g.lock || a.classList.contains('open') || a.classList.contains('done')) return;
  const i = +a.dataset.i, c = g.cards[i]; a.classList.add('open'); Sound.play('flip');
  if (c.side === 't') Speech.speak(c.txt, P.profile.active);
  g.open.push({ i, el: a });
  if (g.open.length < 2) return;
  g.moves++; $('#g-right').textContent = g.moves + ' mov.';
  const [x, y] = g.open; g.open = [];
  if (g.cards[x.i].id === g.cards[y.i].id && g.cards[x.i].side !== g.cards[y.i].side) {
    x.el.classList.add('done'); y.el.classList.add('done'); g.done++; Sound.play('ok'); SRS.mark(P.course(), g.cards[x.i].id, true);
    if (g.done === g.ws.length) {
      const secs = Math.round((Date.now() - g.t0) / 1000), perfect = g.moves <= g.ws.length + 1;
      if (perfect) P.stats.memPerfect = true;
      setTimeout(() => Games.end('memory', 6 + g.ws.length - Math.min(6, Math.max(0, g.moves - g.ws.length * 1.5)), perfect ? '¡Memoria de elefante!' : '¡Todas las parejas!', g.moves + ' movimientos en ' + fmtDur(secs) + '.', Math.max(1, 100 - g.moves)), 600);
    }
  } else {
    g.lock = true; setTimeout(() => { x.el.classList.remove('open'); y.el.classList.remove('open'); g.lock = false; }, 850);
  }
};

/* ---------- Palabra del día (tipo Wordle) ---------- */
const KB_ROWS = ['qwertyuiop', 'asdfghjkl', '⏎zxcvbnm⌫'];
const Wordle = {
  open(free) {
    const lang = P.profile.active, list = WORDLE[lang]; if (!list) return;
    const st = P.stats; const today = dayKey();
    let saved = !free && st.wordle && st.wordle.day === today && st.wordle.lang === lang ? st.wordle : null;
    const idx = free ? rand(list.length) : Math.floor(seeded(today + lang)() * list.length);
    const f = list[saved ? saved.idx : idx].split('|');
    Games.cur = { kind: 'wordle', lang, free: !!free, idx: saved ? saved.idx : idx, word: f[0], es: f[1], target: baseWord(f[0]), rows: saved ? saved.rows.slice() : [], cur: '', done: saved ? saved.done : false, won: saved ? saved.won : false };
    this.render();
  },
  score(guess, target) {
    const res = Array(5).fill('no'), t = target.split(''), g = guess.split('');
    g.forEach((ch, i) => { if (ch === t[i]) { res[i] = 'ok'; t[i] = null; } });
    g.forEach((ch, i) => { if (res[i] !== 'ok') { const k = t.indexOf(ch); if (k >= 0) { res[i] = 'near'; t[k] = null; } } });
    return res;
  },
  render() {
    const g = Games.cur, keyState = {};
    g.rows.forEach((r) => { const sc = this.score(r, g.target); r.split('').forEach((ch, i) => { const s = sc[i], o = keyState[ch]; if (s === 'ok' || (s === 'near' && o !== 'ok') || (!o)) keyState[ch] = s; }); });
    let grid = '';
    for (let r = 0; r < 6; r++) {
      const word = g.rows[r] || (r === g.rows.length ? g.cur : ''), sc = g.rows[r] ? this.score(g.rows[r], g.target) : null;
      grid += '<div class="wd-row">' + Array.from({ length: 5 }, (_, i) => '<div class="wd-cell ' + (sc ? sc[i] : r === g.rows.length && i === g.cur.length ? 'cur' : '') + '">' + esc((word[i] || '').toUpperCase()) + '</div>').join('') + '</div>';
    }
    const hint = !g.done && g.rows.length >= 3 && P.profile.level !== 'experto' ? '<p class="center small">Pista: significa «<b>' + esc(g.es) + '</b>»</p>' : '';
    const end = g.done ? '<div class="card center"><div class="big-word">' + esc(g.word) + '</div><p class="fg2">«' + esc(g.es) + '»</p><button class="spk mini" style="margin:8px auto 0" data-act="say" data-text="' + esc(g.word) + '">' + ic('speaker') + '</button></div><button class="btn block" data-act="wd-more">Partida libre</button>' : '';
    openOverlay(gameHead(g.free ? 'Partida libre' : 'Palabra del día', g.rows.length + '/6') + '<div class="ov-body"><p class="small muted center">Palabras en ' + esc(LANGS[g.lang].es) + '. Las tildes no cuentan. 🟩 bien colocada · 🟨 está en otro sitio.</p><div class="wd-grid">' + grid + '</div>' + hint + end + '</div>' +
      (g.done ? '' : '<div class="ov-foot"><div class="kb">' + KB_ROWS.map((row) => '<div class="r">' + Array.from(row).map((k) => '<button class="' + (k === '⏎' || k === '⌫' ? 'wide' : keyState[k] || '') + '" data-act="wd-key" data-k="' + k + '" aria-label="' + (k === '⏎' ? 'Comprobar' : k === '⌫' ? 'Borrar' : k) + '">' + (k === '⏎' ? 'OK' : k) + '</button>').join('') + '</div>').join('') + '</div></div>'));
  },
  key(k) {
    const g = Games.cur; if (!g || g.kind !== 'wordle' || g.done) return;
    if (k === '⌫') g.cur = g.cur.slice(0, -1);
    else if (k === '⏎') {
      if (g.cur.length < 5) { toast('Faltan letras'); return; }
      g.rows.push(g.cur); const won = g.cur === g.target; g.cur = '';
      if (won || g.rows.length >= 6) {
        g.done = true; g.won = won;
        if (!g.free) { P.stats.wordle = { day: dayKey(), lang: g.lang, idx: g.idx, rows: g.rows, done: true, won }; }
        this.render(); Speech.speak(g.word, g.lang);
        setTimeout(() => Games.end('wordle', won ? 14 - g.rows.length : 4, won ? '¡Palabra adivinada!' : 'Esta vez no', won ? 'En ' + g.rows.length + ' intentos: <b>' + esc(g.word) + '</b> = «' + esc(g.es) + '».' : 'Era <b>' + esc(g.word) + '</b> = «' + esc(g.es) + '».', won ? 7 - g.rows.length : 0), 1600);
        return;
      }
      if (!g.free) { P.stats.wordle = { day: dayKey(), lang: g.lang, idx: g.idx, rows: g.rows, done: false, won: false }; P.save('stats'); }
    } else if (g.cur.length < 5 && /^[a-z]$/.test(k)) g.cur += k;
    Sound.play('tap'); this.render();
  },
};
ACT['wd-key'] = (a) => Wordle.key(a.dataset.k);
ACT['wd-more'] = () => Wordle.open(true);
document.addEventListener('keydown', (ev) => {
  const g = Games.cur; if (!g || !$('#overlay').innerHTML) return;
  if (g.kind === 'wordle') { if (ev.key === 'Enter') Wordle.key('⏎'); else if (ev.key === 'Backspace') Wordle.key('⌫'); else if (/^[a-zà-ÿ]$/i.test(ev.key)) Wordle.key(baseCh(ev.key)); }
  if (g.kind === 'hang' && /^[a-zà-ÿ]$/i.test(ev.key)) Hang.guess(baseCh(ev.key));
});

/* ---------- Contrarreloj ---------- */
const Speed = {
  open() {
    const lang = P.profile.active, ws = gameWords(lang, 30); if (ws.length < 5) { toast('Haz alguna lección para desbloquear el juego'); return; }
    Games.cur = { kind: 'speed', lang, ws, left: 60, score: 0, combo: 0, best: 0, q: null, n: 0 };
    openOverlay(gameHead('Contrarreloj', '60 s') + '<div class="ov-body"><div class="row between"><span class="tag">Aciertos: <b id="sp-score">0</b></span><span class="combo" id="sp-combo"></span></div><div class="timer"><i id="sp-bar" style="width:100%"></i></div><div class="emoji-xl" id="sp-em"></div><div class="speed-word" id="sp-word"></div><div class="opts" id="sp-opts"></div></div>');
    this.next();
    clearInterval(Games.tm);
    Games.tm = setInterval(() => { const g = Games.cur; if (!g || g.kind !== 'speed') { clearInterval(Games.tm); return; } g.left--; this.tick(); if (g.left <= 0) { clearInterval(Games.tm); this.finish(); } }, 1000);
  },
  tick() { const g = Games.cur; $('#g-right').textContent = Math.max(0, g.left) + ' s'; const b = $('#sp-bar'); if (b) b.style.width = Math.max(0, (100 * g.left) / 60) + '%'; },
  next() {
    const g = Games.cur, w = g.ws[g.n++ % g.ws.length], rev = g.n % 3 === 0;
    const opts = shuffle([rev ? w.t : w.es].concat(distinct(g.ws.filter((x) => x.id !== w.id), (x) => (rev ? x.t : x.es), rev ? w.t : w.es, 3, Math.random)));
    g.q = { w, rev, ans: rev ? w.t : w.es, opts };
    $('#sp-em').textContent = rev ? w.em || '' : ''; $('#sp-word').textContent = rev ? w.es : w.t;
    $('#sp-opts').innerHTML = opts.map((o, i) => '<button class="opt" data-act="sp-pick" data-i="' + i + '">' + esc(o) + '</button>').join('');
    if (!rev && P.profile.level !== 'experto') Speech.speak(w.t, g.lang);
  },
  finish() { const g = Games.cur; Games.end('speed', Math.min(16, 3 + Math.round(g.score / 2)), g.score + ' aciertos', 'Mejor combo: ×' + g.best + '. ' + (g.score >= 15 ? '¡Velocidad de nativo!' : 'Cuanto más practiques, más rápido irás.'), g.score); },
};
ACT['sp-pick'] = (a) => {
  const g = Games.cur; if (!g || g.kind !== 'speed' || g.left <= 0) return;
  const ok = g.q.opts[+a.dataset.i] === g.q.ans;
  if (ok) { g.score++; g.combo++; g.best = Math.max(g.best, g.combo); if (g.combo % 5 === 0) { g.left += 3; toast('+3 s por combo'); } Sound.play('ok'); SRS.mark(P.course(), g.q.w.id, true); }
  else { g.combo = 0; g.left -= 3; Sound.play('bad'); buzz(30); SRS.mark(P.course(), g.q.w.id, false); }
  $('#sp-score').textContent = g.score; $('#sp-combo').textContent = g.combo >= 3 ? '🔥 ×' + g.combo : '';
  Speed.tick(); if (g.left <= 0) { clearInterval(Games.tm); Speed.finish(); return; }
  Speed.next();
};

/* ---------- Ahorcado ---------- */
const Hang = {
  open() {
    const lang = P.profile.active;
    const ws = gameWords(lang, 1, (w) => baseWord(w.noun || w.t).replace(/[^a-z]/g, '').length >= 4 && !/\s/.test(w.noun || w.t)); if (!ws.length) { toast('Haz alguna lección para desbloquear el juego'); return; }
    const w = ws[0], word = w.noun || w.t;
    Games.cur = { kind: 'hang', lang, w, word, base: baseWord(word), got: new Set(), miss: new Set(), lives: P.profile.level === 'facil' ? 8 : 6 };
    this.render();
  },
  render() {
    const g = Games.cur, chars = Array.from(g.word);
    const shown = chars.map((ch) => { const b = baseCh(ch); return /[a-z]/.test(b) ? (g.got.has(b) ? ch : '') : ch; });
    const won = shown.join('') === g.word, lost = g.lives <= 0;
    openOverlay(gameHead('Ahorcado', '❤️ ' + g.lives) + '<div class="ov-body"><div class="emoji-xl">' + (g.w.em || '❓') + '</div><p class="center fg2">Pista: <b>' + esc(g.w.es) + '</b>' + (g.w.art ? ' · ' + esc(g.w.art) + ' …' : '') + '</p>' +
      '<div class="hang">' + shown.map((s, i) => '<span>' + esc(won || lost ? chars[i] : s) + '</span>').join('') + '</div>' +
      (g.miss.size ? '<p class="center small muted">Fallos: ' + Array.from(g.miss).join(' ').toUpperCase() + '</p>' : '') + '</div>' +
      (won || lost ? '' : '<div class="ov-foot"><div class="kb">' + KB_ROWS.map((row) => '<div class="r">' + Array.from(row.replace('⏎', '').replace('⌫', '')).map((k) => '<button class="' + (g.got.has(k) ? 'ok' : g.miss.has(k) ? 'no' : '') + '" data-act="hg-key" data-k="' + k + '">' + k + '</button>').join('') + '</div>').join('') + '</div></div>'));
    if (won || lost) {
      Speech.speak(g.w.t, g.lang); SRS.mark(P.course(), g.w.id, won);
      setTimeout(() => Games.end('hang', won ? 6 + g.lives : 3, won ? '¡Salvado!' : '¡Ahorcado!', 'La palabra era <b>' + esc(g.w.t) + '</b> = «' + esc(g.w.es) + '».', won ? g.lives : 0), 1300);
    }
  },
  guess(k) {
    const g = Games.cur; if (!g || g.kind !== 'hang' || g.lives <= 0 || g.got.has(k) || g.miss.has(k)) return;
    if (g.base.indexOf(k) >= 0) { g.got.add(k); Sound.play('ok'); } else { g.miss.add(k); g.lives--; Sound.play('bad'); }
    this.render();
  },
};
ACT['hg-key'] = (a) => Hang.guess(a.dataset.k);

/* ---------- ¿el o la? / der, die, das ---------- */
const GenderG = {
  open() {
    const lang = P.profile.active, G = GENDER[lang]; if (!G) return;
    const list = pick(G.words, 12).map((s) => { const f = s.split('|'); if (lang === 'de') { const m = /^(der|die|das) (.+)$/.exec(f[0]); return { art: m[1], noun: m[2], es: f[1] }; } return { art: f[2] === 'f' ? 'la' : 'el', noun: f[0], es: f[1], ff: f[3] === '!' }; });
    Games.cur = { kind: 'gender', lang, list, i: 0, ok: 0, combo: 0 };
    this.render();
  },
  render(fb) {
    const g = Games.cur, q = g.list[g.i], G = GENDER[g.lang];
    openOverlay(gameHead(g.lang === 'de' ? 'Der, die, das' : '¿El o la?', (g.i + 1) + '/' + g.list.length) + '<div class="ov-body"><div class="bar"><i style="width:' + (100 * g.i / g.list.length) + '%"></i></div>' +
      '<div class="big-word" style="margin-top:20px">' + esc(q.noun) + '</div><p class="center muted">' + esc(q.es) + '</p>' +
      '<div class="opts">' + G.opts.map((o) => '<button class="opt" style="justify-content:center;font-size:22px" data-act="gd-pick" data-v="' + o + '"' + (fb ? ' disabled' : '') + '>' + o + '</button>').join('') + '</div>' + (fb || '') + '</div>' +
      (fb ? '<div class="ov-foot"><button class="btn block" data-act="gd-next">Continuar</button></div>' : ''));
    if (fb) $$('#overlay [data-act="gd-pick"]').forEach((b) => { if (b.dataset.v === q.art) b.classList.add('ok'); else if (b.dataset.v === g.pickV) b.classList.add('bad'); });
  },
  rule(q) {
    if (this_lang() === 'de') { const r = GENDER.de.rules.find((x) => x[0].test(q.noun)); return r ? r[1] : ''; }
    return q.ff ? '¡Ojo! En castellano es «' + q.es + '», pero en catalán es ' + (q.art === 'la' ? 'femenino' : 'masculino') + '.' : '';
  },
};
function this_lang() { return Games.cur ? Games.cur.lang : P.profile.active; }
ACT['gd-pick'] = (a) => {
  const g = Games.cur, q = g.list[g.i], ok = a.dataset.v === q.art; g.pickV = a.dataset.v;
  if (ok) { g.ok++; g.combo++; Sound.play('ok'); } else { g.combo = 0; Sound.play('bad'); Memory.record(g.lang, { type: 'gender', item: { id: '', t: q.art + ' ' + q.noun, es: q.es } }, false, { best: q.art + ' ' + q.noun, err: 'gender' }, a.dataset.v + ' ' + q.noun); }
  const sayTxt = g.lang === 'ca' && /^[aeiouhàèéíòóú]/i.test(q.noun) ? "l'" + q.noun : q.art + ' ' + q.noun;
  Speech.speak(sayTxt, g.lang);
  const rule = GenderG.rule(q);
  GenderG.render('<div class="card ' + (ok ? '' : 'warn') + '"><b>' + (ok ? '✓ ' : '✖ ') + esc(sayTxt) + '</b>' + (g.lang === 'ca' && sayTxt.indexOf("l'") === 0 ? ' <span class="small muted">(' + (q.art === 'la' ? 'femenino' : 'masculino') + ')</span>' : '') + (rule ? '<div class="small fg2 mt">' + esc(rule) + '</div>' : '') + '</div>');
};
ACT['gd-next'] = () => {
  const g = Games.cur; g.i++; g.pickV = null;
  if (g.i >= g.list.length) { P.save('memory'); Games.end('gender', 3 + g.ok, g.ok + ' de ' + g.list.length, g.ok >= 10 ? '¡Dominas los géneros!' : 'Los que fallaste ya están en tu memoria de fallos.', g.ok); return; }
  GenderG.render();
};

/* ---------- Anagramas ---------- */
const Anagram = {
  open() {
    const lang = P.profile.active;
    const ws = gameWords(lang, 8, (w) => { const x = w.noun || w.t; return !/\s/.test(x) && x.length >= 4 && x.length <= 10; });
    if (ws.length < 3) { toast('Haz alguna lección para desbloquear el juego'); return; }
    Games.cur = { kind: 'anagram', lang, ws, i: 0, ok: 0 };
    this.round();
  },
  round() {
    const g = Games.cur, w = g.ws[g.i], word = w.noun || w.t; let letters;
    do { letters = shuffle(Array.from(word).map((ch, i) => ({ ch, i }))); } while (letters.map((x) => x.ch).join('') === word && word.length > 1);
    g.cur = { w, word, letters, picked: [] };
    this.render();
  },
  render(done) {
    const g = Games.cur, c = g.cur;
    openOverlay(gameHead('Anagramas', (g.i + 1) + '/' + g.ws.length) + '<div class="ov-body"><div class="emoji-xl">' + (c.w.em || '🔀') + '</div><p class="center fg2">«' + esc(c.w.es) + '»' + (c.w.art ? ' · ' + esc(c.w.art) + ' …' : '') + '</p>' +
      '<div class="answer-line" style="min-height:62px;justify-content:center;background:none">' + c.picked.map((k) => '<button class="tile" data-act="an-back" data-k="' + k + '">' + esc(c.letters[k].ch) + '</button>').join('') + '</div>' +
      '<div class="tiles">' + c.letters.map((x, k) => '<button class="tile' + (c.picked.indexOf(k) >= 0 ? ' ghost' : '') + '" data-act="an-pick" data-k="' + k + '">' + esc(x.ch) + '</button>').join('') + '</div>' +
      (done ? '<div class="card center"><b>' + (done === 'ok' ? '✓ ' : '✖ ') + esc(c.w.t) + '</b></div>' : '') + '</div>' +
      '<div class="ov-foot">' + (done ? '<button class="btn block" data-act="an-next">Continuar</button>' : '<button class="btn ghost block" data-act="an-skip">Me rindo</button>') + '</div>');
  },
};
ACT['an-pick'] = (a) => {
  const g = Games.cur, c = g.cur, k = +a.dataset.k; if (c.picked.indexOf(k) >= 0) return;
  c.picked.push(k); Sound.play('tap');
  if (c.picked.length === c.letters.length) {
    const ok = canon(c.picked.map((x) => c.letters[x].ch).join('')) === canon(c.word);
    if (ok) { g.ok++; Sound.play('ok'); Speech.speak(c.w.t, g.lang); SRS.mark(P.course(), c.w.id, true); Anagram.render('ok'); }
    else { Sound.play('bad'); c.picked = []; toast('Casi: prueba otro orden'); Anagram.render(); }
  } else Anagram.render();
};
ACT['an-back'] = (a) => { const c = Games.cur.cur, k = +a.dataset.k; c.picked = c.picked.slice(0, c.picked.indexOf(k)); Anagram.render(); };
ACT['an-skip'] = () => { const g = Games.cur; SRS.mark(P.course(), g.cur.w.id, false); g.cur.picked = []; Speech.speak(g.cur.w.t, g.lang); Anagram.render('no'); };
ACT['an-next'] = () => { const g = Games.cur; g.i++; if (g.i >= g.ws.length) { Games.end('anagram', 3 + g.ok, g.ok + ' de ' + g.ws.length, 'Ordenar letras fija la ortografía de cada palabra.', g.ok); return; } Anagram.round(); };
