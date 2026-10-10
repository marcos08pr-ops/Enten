/* ============ Parla · pestaña Perfil: progreso, memoria del tutor, amigos y logros ============ */
function renderMe(v) {
  const pr = P.profile, st = P.stats, s = P.streak, n = Streak.count();
  countWords();
  const acc = st.acc && st.acc.length ? Math.round((100 * st.acc.reduce((a, b) => a + b, 0)) / st.acc.length) : null;
  const langs = Object.keys(pr.langs || {});
  let h = '<div class="prof-head"><div class="prof-av">' + esc((pr.name || '?').slice(0, 1).toUpperCase()) + '</div><div class="grow"><h1>' + esc(pr.name || 'Tú') + '</h1><div class="row wrap small muted" style="gap:6px">' + langs.map((l) => flag(l)).join('') + ' Desde ' + esc(fmtDate(pr.created)) + '</div></div><button class="icon-btn" data-act="settings" aria-label="Ajustes">' + ic('gear') + '</button></div>';
  h += '<div class="kpis">' +
    kpi('🔥', plural(n, 'día', 'días'), 'Racha · mejor ' + Math.max(s.best || 0, n)) + kpi('⚡', (st.xp || 0) + ' XP', 'Experiencia total') +
    kpi('📚', st.words || 0, 'Palabras y frases aprendidas') + kpi('🎯', acc == null ? '—' : acc + '%', 'Precisión reciente') +
    kpi('📘', st.lessons || 0, 'Lecciones') + kpi('⏱️', Math.round((st.secs || 0) / 60) + ' min', 'Tiempo practicando') + '</div>';
  h += '<section class="card"><div class="row between"><h3>Esta semana</h3><span class="small muted">' + Streak.weekXP() + ' XP</span></div><div class="chart mt">' + xpChart() + '</div></section>';
  h += '<section class="card"><div class="row between"><h3>' + cap(MONTHS[new Date().getMonth()]) + '</h3><span class="small muted">🔥 activo · 🧊 protegido</span></div><div class="mt">' + monthCal() + '</div></section>';
  // progreso por idioma
  h += '<section class="card"><h3>Tus cursos</h3><div class="list mt">' + langs.map((l) => {
    const c = P.course(l); if (!c) return '';
    const C = Course.get(l, c.gen), tot = C.units.length * 4; let done = 0; C.units.forEach((u) => { for (let i = 0; i < 4; i++) if (lessonDone(c, u, i)) done++; });
    const cu = C.units[currentUnit(l)];
    return '<div class="row">' + flag(l) + '<div class="grow"><div class="row between"><b>' + esc(LANGS[l].name) + '</b><span class="small muted">' + (cu ? cu.cefr : '') + ' · ' + SRS.learned(c) + ' aprendidas</span></div><div class="bar" style="margin-top:6px"><i style="width:' + Math.round((100 * done) / tot) + '%"></i></div></div></div>';
  }).join('') + '</div></section>';
  // memoria del tutor
  h += memoryCard();
  // amigos
  h += '<section class="card" id="league">' + leagueHTML() + '</section>';
  // logros
  h += '<section class="card"><h3>Logros</h3><div class="badge-grid mt">' + BADGES.map((b) => { const on = b.ok(st, { best: Math.max(s.best || 0, n) }, pr); if (on && !st.badges[b.id]) { st.badges[b.id] = dayKey(); P.save('stats'); toast('🏅 Logro: ' + b.t); } return '<div class="badge ' + (on ? 'on' : '') + '"><span class="bi">' + b.em + '</span>' + esc(b.t) + '</div>'; }).join('') + '</div></section>';
  v.innerHTML = h;
  League.watch();
}
function kpi(em, v, l) { return '<div class="kpi"><span class="em">' + em + '</span><div><div class="v">' + esc(v) + '</div><div class="l">' + esc(l) + '</div></div></div>'; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function fmtDate(k) { if (!k) return ''; const d = keyDate(k); return d.getDate() + ' de ' + MONTHS[d.getMonth()] + ' de ' + d.getFullYear(); }
function xpChart() {
  const d = Streak.last7(), goal = P.profile.goal || 20, max = Math.max(goal, ...d.map((x) => x.xp)) * 1.15;
  const W = 320, H = 150, pad = 22, bw = 30, gap = (W - 2 * pad - 7 * bw) / 6;
  const y = (v) => H - 24 - ((H - 44) * v) / max;
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="XP de los últimos 7 días">';
  s += '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + y(goal) + '" y2="' + y(goal) + '" stroke="var(--line-2)" stroke-dasharray="4 4"/><text x="' + (W - pad) + '" y="' + (y(goal) - 4) + '" text-anchor="end" font-size="10" fill="var(--fg-3)">meta ' + goal + '</text>';
  d.forEach((x, i) => {
    const X = pad + i * (bw + gap), top = y(x.xp), hh = H - 24 - top;
    s += '<rect x="' + X + '" y="' + top + '" width="' + bw + '" height="' + Math.max(hh, x.xp ? 3 : 0) + '" rx="7" fill="' + (x.xp >= goal ? 'var(--accent)' : x.xp ? 'var(--accent-lo)' : 'var(--surface-3)') + '"/>';
    if (x.xp) s += '<text x="' + (X + bw / 2) + '" y="' + (top - 5) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--fg-2)">' + x.xp + '</text>';
    s += '<text x="' + (X + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" font-weight="' + (i === 6 ? 800 : 600) + '" fill="' + (i === 6 ? 'var(--accent-hi)' : 'var(--fg-3)') + '">' + (x.ice ? '🧊' : DOW[dowIdx(x.k)]) + '</text>';
  });
  return s + '</svg>';
}
function monthCal() {
  const s = P.streak, now = new Date(), y = now.getFullYear(), m = now.getMonth(), first = dayKey(new Date(y, m, 1)), days = new Date(y, m + 1, 0).getDate(), today = dayKey();
  let h = '<div class="cal">' + DOW.map((d) => '<span class="h">' + d + '</span>').join('');
  for (let i = 0; i < dowIdx(first); i++) h += '<span class="c empty"></span>';
  for (let dd = 1; dd <= days; dd++) { const k = dayKey(new Date(y, m, dd)); const on = (s.days[k] || 0) >= DAY_MIN, ice = !!s.frozen[k];
    h += '<span class="c ' + (on ? 'on' : ice ? 'ice' : '') + (k === today ? ' today' : '') + '">' + dd + '</span>'; }
  return h + '</div>';
}
function memoryCard() {
  const m = P.memory, lang = P.profile.active, pr = P.profile.prefs || {};
  const weak = Memory.weak(lang, 5);
  return '<section class="card accent"><div class="row"><span style="font-size:26px">🧠</span><div class="grow"><h3>Lo que tu tutor sabe de ti</h3><div class="small muted">Se usa para adaptar lecciones, explicaciones y charlas. Puedes borrarlo.</div></div></div>' +
    (m.summary ? '<p class="mt ai-tip">' + esc(m.summary) + '</p>' : '<p class="mt small fg2">' + (AI.ok() ? 'Tras unas lecciones y charlas, aquí verás su resumen sobre ti.' : 'Con el tutor IA activo, aquí verás su resumen sobre ti. Mientras tanto, la app ya recuerda tus fallos.') + '</p>') +
    (weak.length ? '<p class="eyebrow mt">Puntos débiles en ' + esc(LANGS[lang].es) + '</p><div class="weak">' + weak.map((k) => '<span class="chip">' + esc(ERR_NAMES[k] || k) + '</span>').join('') + '</div>' : '') +
    '<p class="eyebrow mt">Notas</p><div class="list">' + ((m.notes || []).length ? m.notes.slice().reverse().map((n) => '<div class="mem-note"><span>' + (n.src === 'ai' ? '✨' : '✍️') + '</span><p>' + esc(n.text) + '</p><button data-act="note-del" data-id="' + n.id + '" aria-label="Borrar nota">' + ic('trash', 'sm') + '</button></div>').join('') : '<p class="small muted">Sin notas todavía.</p>') + '</div>' +
    '<div class="row mt"><input class="input grow" id="note-in" placeholder="Ej.: me encanta el Barça, quiero viajar a Berlín…" maxlength="200"><button class="btn sm" data-act="note-add">' + ic('plus', 'sm') + '</button></div>' +
    '<div class="row wrap mt small fg2">Aprendes mejor con: <b>' + esc((pr.styles || []).map(styleName).join(', ') || 'sin elegir') + '</b></div>' +
    '<button class="btn sm ghost mt" data-act="prefs">Cambiar preferencias</button></section>';
}
ACT['note-add'] = () => { const i = $('#note-in'); const t = i.value.trim(); if (!t) return; addNote(t, 'user'); i.value = ''; render(); toast('Tu tutor lo tendrá en cuenta'); };
ACT['note-del'] = (a) => { const m = P.memory; m.notes = (m.notes || []).filter((n) => n.id !== a.dataset.id); P.save('memory'); render(); };

/* ---------- liga de amigos (personas con las que compartes la app) ---------- */
const League = {
  rows: null, unsub: null, watching: false,
  watch() {
    if (this.watching || Store.mode !== 'cloud') return; this.watching = true;
    this.unsub = Store.boardWatch((rows) => { this.rows = rows; const el = $('#league'); if (el && App.tab === 'me') { el.innerHTML = leagueHTML(); this.names(); } });
  },
  async names() {
    if (!this.rows || !Store.user) return;
    try {
      const ids = this.rows.map((r) => r.id); const ps = await Store.user.profiles(ids);
      ids.forEach((id) => { const el = document.querySelector('[data-uid="' + id + '"]'); if (!el) return; const p = ps[id] || {}; $('.nm', el).textContent = p.isMe ? 'Tú' : p.name || 'Alguien'; const img = $('img', el); if (img && p.avatarUrl) img.src = p.avatarUrl; });
    } catch (e) {}
  },
};
function leagueHTML() {
  if (Store.mode !== 'cloud') return '<h3>Liga de amigos</h3><p class="small fg2 mt">Dentro de Claude, las personas con las que compartas Parla aparecen aquí con su XP semanal y su racha.</p>';
  const wk = weekKey(), rows = (League.rows || []).filter((r) => r.wk === wk).sort((a, b) => b.wxp - a.wxp);
  const me = Store.uid;
  return '<div class="row between"><h3>Liga de amigos</h3><span class="small muted">Semana ' + wk.split('-W')[1] + '</span></div>' +
    (rows.length ? '<div class="list mt">' + rows.map((r, i) => '<div class="lb-row' + (r.id === me ? ' me' : '') + '" data-uid="' + esc(r.id) + '"><span class="pos">' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) + '</span><img alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"><div class="grow"><b class="nm">' + (r.id === me ? 'Tú' : '…') + '</b><div class="small muted">' + flagText(r.lang) + ' · 🔥 ' + (r.streak || 0) + (r.today ? ' · hoy ✓' : ' · hoy pendiente') + '</div></div><b class="num">' + r.wxp + ' XP</b></div>').join('') + '</div>'
      : '<p class="small fg2 mt">Aún nadie ha sumado XP esta semana. ¡Sé el primero!</p>') +
    '<p class="small muted mt">Para invitar a alguien: menú Compartir del artefacto → añade su correo con permiso <b>Colaborador</b>, así guarda su propio progreso.</p>';
}
