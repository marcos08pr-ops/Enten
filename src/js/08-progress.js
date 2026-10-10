/* ============ Parla · perfil, racha, XP, misiones, memoria del tutor ============ */
const DAY_MIN = 10;       // XP mínimos en un día para mantener la racha (≈ una lección)
const FREEZE_COST = 100;  // gemas por protector de racha
const BOOST_COST = 80;    // gemas por 15 min de XP doble
const MAX_FREEZES = 2;

const Session = {
  noListenUntil: 0, noSpeakUntil: 0,
  noListen() { return Date.now() < this.noListenUntil; },
  noSpeak() { return Date.now() < this.noSpeakUntil; },
};

function defaultProfile() {
  return { v: 1, name: '', created: dayKey(), active: 'ca', langs: {}, goal: 20, level: 'normal', autoLevel: true, theme: 'dark', sound: true, rate: 0.95, voices: {},
    prefs: { styles: [], interests: [], motive: [], explain: 'breve', tone: 'divertido' }, reminder: { time: '20:30', on: true }, aiOk: false, onboarded: false };
}
function defaultStreak() { return { days: {}, frozen: {}, freezes: 1, gems: 50, best: 0, quests: null, repair: null, boost: 0, ms: [], events: [] }; }
function defaultStats() { return { xp: 0, lessons: 0, perfect: 0, chat: 0, speak: 0, listen: 0, games: 0, secs: 0, words: 0, night: false, early: false, badges: {}, acc: [] }; }
function defaultMemory() { return { mistakes: [], tags: {}, notes: [], summary: '', tip: null, updated: 0 }; }
function defaultCourse() { return { lessons: {}, unlocked: 0, srs: {}, custom: {}, gen: {}, placed: false, xp: 0 }; }

const P = {
  get profile() { return Store.get('profile'); },
  get streak() { return Store.get('streak'); },
  get stats() { return Store.get('stats'); },
  get memory() { return Store.get('memory'); },
  course(lang) { return Store.get('course_' + (lang || P.profile.active)); },
  save(name) { Store.save(name, Store.get(name)); },
  saveCourse(lang) { const n = 'course_' + (lang || P.profile.active); Store.save(n, Store.get(n)); },
  async loadCourse(lang) {
    const n = 'course_' + lang; let c = await Store.load(n);
    if (!c) { c = defaultCourse(); Store.save(n, c); }
    return c;
  },
  courseData(lang) { lang = lang || P.profile.active; const c = P.course(lang); return Course.get(lang, c && c.gen); },
};

/* ---------- racha ---------- */
const Streak = {
  active(k) { const s = P.streak; return (s.days[k] || 0) >= DAY_MIN || !!s.frozen[k]; },
  doneToday() { return (P.streak.days[dayKey()] || 0) >= DAY_MIN; },
  todayXP() { return P.streak.days[dayKey()] || 0; },
  count() {
    const s = P.streak; let k = dayKey(); let n = 0;
    if (!this.active(k)) k = addDays(k, -1);
    for (let guard = 0; guard < 4000 && this.active(k); guard++) { if ((s.days[k] || 0) >= DAY_MIN) n++; k = addDays(k, -1); }
    return n;
  },
  state() { return this.doneToday() ? 'on' : (this.count() > 0 && P.streak.frozen[addDays(dayKey(), -1)] ? 'ice' : 'off'); },
  /* Al abrir: gasta protectores en los días perdidos y detecta rachas rotas que aún se pueden recuperar. */
  reconcile() {
    const s = P.streak, today = dayKey(), ev = [];
    const keys = Object.keys(s.days).filter((k) => s.days[k] >= DAY_MIN).concat(Object.keys(s.frozen)).sort();
    const last = keys.filter((k) => k < today).pop();
    if (!last) return ev;
    const gap = dayDiff(last, today) - 1; // días sin actividad entre el último activo y hoy
    if (gap <= 0) return ev;
    // racha que había justo antes del hueco
    let n = 0, k = last; for (let g = 0; g < 4000 && this.active(k); g++) { if ((s.days[k] || 0) >= DAY_MIN) n++; k = addDays(k, -1); }
    let d = addDays(last, 1); const used = [];
    while (n > 0 && d < today && s.freezes > 0) { s.frozen[d] = 'freeze'; s.freezes--; used.push(d); d = addDays(d, 1); }
    if (used.length) ev.push({ type: 'frozen', days: used, streak: n });
    if (d < today && n >= 3) {
      const missing = []; for (let x = d; x < today; x = addDays(x, 1)) missing.push(x);
      if (missing.length <= 2 && (!s.repair || s.repair.day !== today)) {
        s.repair = { day: today, need: 3, done: 0, days: missing, lost: n };
        ev.push({ type: 'lost', streak: n, repairable: true });
      } else if (missing.length > 2) ev.push({ type: 'lost', streak: n, repairable: false });
    }
    if (s.repair && s.repair.day !== today) s.repair = null;
    P.save('streak');
    return ev;
  },
  /* Suma XP y devuelve qué ha pasado (racha ampliada, meta cumplida, hito…). */
  addXP(xp, src) {
    const s = P.streak, st = P.stats, pr = P.profile, today = dayKey();
    if (s.boost && Date.now() < s.boost) xp *= 2;
    const before = s.days[today] || 0, after = before + xp;
    const wasDone = before >= DAY_MIN, goal = pr.goal || 20;
    s.days[today] = after;
    st.xp = (st.xp || 0) + xp;
    const c = P.course(); if (c) c.xp = (c.xp || 0) + xp;
    // limita el historial a ~2 años
    const ks = Object.keys(s.days); if (ks.length > 800) ks.sort().slice(0, ks.length - 800).forEach((k) => delete s.days[k]);
    const r = { xp, extended: !wasDone && after >= DAY_MIN, goal: before < goal && after >= goal, streak: 0, milestone: 0, repaired: false };
    if (src === 'lesson' && s.repair && s.repair.day === today) {
      s.repair.done++;
      if (s.repair.done >= s.repair.need) { s.repair.days.forEach((d) => { s.frozen[d] = 'repair'; }); r.repaired = s.repair.lost; s.repair = null; }
    }
    r.streak = this.count();
    if (r.streak > (s.best || 0)) s.best = r.streak;
    if (r.extended || r.repaired) {
      const m = MILESTONES.filter((x) => x <= r.streak && (s.ms || []).indexOf(x) < 0).pop();
      if (m) { s.ms = (s.ms || []).concat(m); r.milestone = m; s.gems += m >= 30 ? 50 : 20; if (m === 7 || m === 30 || m === 100) s.freezes = Math.min(MAX_FREEZES, s.freezes + 1); }
    }
    Quests.bump('xp', xp);
    const h = new Date().getHours(); if (h >= 23) st.night = true; if (h < 7) st.early = true;
    P.save('streak'); P.save('stats'); P.saveCourse();
    Board.sync();
    Notify.syncState();
    return r;
  },
  weekXP() { const s = P.streak, wk = weekKey(); return Object.keys(s.days).filter((k) => weekKey(keyDate(k)) === wk).reduce((a, k) => a + s.days[k], 0); },
  last7() { const out = []; for (let i = 6; i >= 0; i--) { const k = addDays(dayKey(), -i); out.push({ k, xp: P.streak.days[k] || 0, ice: !!P.streak.frozen[k] }); } return out; },
};

/* ---------- misiones diarias (se eligen según tus preferencias) ---------- */
const Quests = {
  ensure() {
    const s = P.streak, today = dayKey();
    if (s.quests && s.quests.day === today) return s.quests.list;
    const rng = seeded(today + (P.profile.name || ''));
    const styles = (P.profile.prefs && P.profile.prefs.styles) || [];
    const pool = QUESTS.map((q) => ({ q, w: (q.pref && styles.indexOf(q.pref) >= 0 ? 3 : 1) * (q.id === 'xp' ? 2.5 : 1) }));
    const chosen = [];
    while (chosen.length < 3 && pool.length) {
      const tot = pool.reduce((a, x) => a + x.w, 0); let r = rng() * tot; let idx = 0;
      for (let i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) { idx = i; break; } }
      chosen.push(pool.splice(idx, 1)[0].q);
    }
    s.quests = { day: today, list: chosen.map((q) => ({ id: q.id, goal: q.goals[Math.floor(rng() * q.goals.length)], prog: 0, claimed: false })) };
    P.save('streak');
    return s.quests.list;
  },
  def(id) { return QUESTS.find((q) => q.id === id); },
  bump(metric, v) {
    const list = this.ensure(); let changed = false;
    list.forEach((x) => {
      const q = this.def(x.id); if (!q || q.metric !== metric || x.claimed) return;
      const np = q.max ? Math.max(x.prog, v) : x.prog + v;
      if (np !== x.prog) { x.prog = Math.min(np, x.goal); changed = true; }
      if (x.prog >= x.goal && !x.claimed) { x.claimed = true; P.streak.gems += q.gems; toast('Misión cumplida: ' + q.t(x.goal) + ' · +' + q.gems + ' 💎'); }
    });
    if (changed) P.save('streak');
  },
};

/* ---------- tienda ---------- */
const Shop = {
  buyFreeze() {
    const s = P.streak; if (s.freezes >= MAX_FREEZES) return 'max'; if (s.gems < FREEZE_COST) return 'gems';
    s.gems -= FREEZE_COST; s.freezes++; P.save('streak'); return 'ok';
  },
  buyBoost() {
    const s = P.streak; if (s.gems < BOOST_COST) return 'gems';
    s.gems -= BOOST_COST; s.boost = Math.max(Date.now(), s.boost || 0) + 15 * 60000; P.save('streak'); return 'ok';
  },
};

/* ---------- clasificación semanal con amigos ---------- */
const Board = {
  t: 0,
  sync() {
    if (Store.mode !== 'cloud') return;
    clearTimeout(this.t);
    this.t = setTimeout(() => Store.boardWrite({ wk: weekKey(), wxp: Streak.weekXP(), streak: Streak.count(), lang: P.profile.active, today: Streak.doneToday(), t: Date.now() }), 1500);
  },
};

/* ---------- memoria del tutor: fallos, etiquetas y notas ---------- */
const ERR_NAMES = { gender: 'Género y artículos', order: 'Orden de las palabras', missing: 'Palabras que faltan', spelling: 'Ortografía', accent: 'Tildes y signos', vocab: 'Vocabulario', grammar: 'Gramática', listening: 'Comprensión oral', speaking: 'Pronunciación', blank: 'Respuestas en blanco' };
const Memory = {
  record(lang, e, ok, res, given) {
    const m = P.memory; const err = res && res.err; if (ok && (!err || err === 'spelling')) return;
    const kind = !ok && (e.type === 'listen' || e.type === 'listenPick') ? 'listening' : !ok && e.type === 'speak' ? 'speaking' : err || 'vocab';
    m.tags[lang] = m.tags[lang] || {}; m.tags[lang][kind] = (m.tags[lang][kind] || 0) + (ok ? 0.3 : 1);
    if (ok) return;
    m.mistakes.push({ t: Date.now(), lang, id: e.item ? e.item.id : '', ex: e.type, q: e.item ? (e.dir === 't2es' ? e.item.t : e.item.es || e.item.t) : '', exp: res ? res.best : '', got: String(given || '').slice(0, 120), err: kind });
    if (m.mistakes.length > 150) m.mistakes = m.mistakes.slice(-150);
  },
  weak(lang, n) {
    const t = (P.memory.tags || {})[lang] || {};
    return Object.keys(t).filter((k) => t[k] >= 1).sort((a, b) => t[b] - t[a]).slice(0, n || 4);
  },
  recent(lang, n) { return P.memory.mistakes.filter((x) => x.lang === lang).slice(-(n || 10)); },
  /* Resumen que recibe la IA en cada consulta. */
  context(lang) {
    const pr = P.profile, m = P.memory, L = LANGS[lang];
    const st = pr.prefs || {};
    const lines = [];
    lines.push('Alumno: ' + (pr.name || 'sin nombre') + '. Lengua materna: castellano. Aprende ' + L.es + '.');
    const C = P.courseData(lang), c = P.course(lang);
    const cur = currentUnit(lang);
    lines.push('Nivel aproximado: ' + (C.units[cur] ? C.units[cur].cefr : 'A1') + ' (unidad ' + (cur + 1) + ' de ' + C.units.length + ': ' + (C.units[cur] ? C.units[cur].t : '') + '). Dificultad elegida: ' + LEVELS[pr.level].name + '.');
    if (st.styles && st.styles.length) lines.push('Le gusta aprender con: ' + st.styles.join(', ') + '.');
    if (st.interests && st.interests.length) lines.push('Intereses: ' + st.interests.join(', ') + '.');
    if (st.motive && st.motive.length) lines.push('Motivo: ' + st.motive.join(', ') + '.');
    lines.push('Explicaciones: ' + (st.explain === 'detallada' ? 'detalladas, con ejemplos' : 'breves y directas') + '. Tono: ' + (st.tone === 'serio' ? 'serio y claro' : 'cercano y con humor') + '.');
    const w = this.weak(lang, 4); if (w.length) lines.push('Puntos débiles detectados: ' + w.map((k) => ERR_NAMES[k] || k).join(', ') + '.');
    if (m.summary) lines.push('Lo que recuerdas de él/ella: ' + m.summary);
    const notes = (m.notes || []).slice(-12).map((x) => '- ' + x.text); if (notes.length) lines.push('Notas de memoria:\n' + notes.join('\n'));
    const rec = this.recent(lang, 8).map((x) => '- [' + (ERR_NAMES[x.err] || x.err) + '] esperado «' + x.exp + '», escribió «' + x.got + '»');
    if (rec.length) lines.push('Últimos fallos:\n' + rec.join('\n'));
    const weakIds = SRS.weak(c, Object.keys(c.srs || {})).slice(0, 8).map((id) => C.byId[id] || (c.custom || {})[id]).filter(Boolean).map((it) => it.t);
    if (weakIds.length) lines.push('Palabras o frases que más falla: ' + weakIds.join(' · '));
    return lines.join('\n');
  },
  /* Tras una lección o una charla, la IA actualiza su memoria (resumen + notas). */
  async consolidate(lang, extra) {
    if (!AI.ok() || !P.profile.aiOk) return;
    const m = P.memory;
    if (Date.now() - (m.updated || 0) < 3 * 60000 && !extra) return;
    m.updated = Date.now(); P.save('memory');
    try {
      const r = await AI.json({
        system: 'Eres el tutor de idiomas de una app tipo Duolingo. Mantienes una memoria breve sobre cada alumno para adaptar las clases.',
        prompt: Memory.context(lang) + (extra ? '\n\nNuevo material de esta sesión:\n' + extra : '') +
          '\n\nActualiza tu memoria del alumno. Devuelve {"summary": "máximo 450 caracteres en castellano: nivel real, errores recurrentes, gustos y cómo prefiere aprender", "notes": ["hasta 3 hechos NUEVOS y concretos sobre el alumno (gustos, metas, errores típicos) que no estén ya en las notas; [] si no hay"], "focus": ["2 o 3 cosas concretas a practicar la próxima vez"]}',
      });
      if (r && typeof r.summary === 'string') m.summary = r.summary.slice(0, 600);
      if (r && Array.isArray(r.notes)) r.notes.filter((x) => typeof x === 'string' && x.trim()).slice(0, 3).forEach((x) => addNote(x.trim().slice(0, 200), 'ai'));
      if (r && Array.isArray(r.focus)) m.focus = r.focus.filter((x) => typeof x === 'string').slice(0, 3);
      P.save('memory');
    } catch (e) { /* silencioso: es una mejora en segundo plano */ }
  },
};
function addNote(text, src) {
  const m = P.memory; m.notes = m.notes || [];
  if (m.notes.some((n) => canon(n.text) === canon(text))) return;
  m.notes.push({ id: 'n' + Date.now().toString(36) + rand(1000), text, t: Date.now(), src: src || 'user' });
  if (m.notes.length > 30) m.notes = m.notes.slice(-30);
  P.save('memory');
}

/* Ajuste automático de dificultad según la precisión de las últimas lecciones. */
function adaptLevel(acc) {
  const st = P.stats, pr = P.profile; st.acc = (st.acc || []).concat(Math.round(acc * 100) / 100).slice(-8);
  P.save('stats');
  if (!pr.autoLevel || st.acc.length < 3) return null;
  const last = st.acc.slice(-3), avg = last.reduce((a, b) => a + b, 0) / 3, i = LEVEL_ORDER.indexOf(pr.level);
  let to = null;
  if (avg >= 0.93 && i < 3) to = LEVEL_ORDER[i + 1];
  else if (avg < 0.6 && i > 0) to = LEVEL_ORDER[i - 1];
  if (to) { pr.level = to; st.acc = []; P.save('profile'); P.save('stats'); }
  return to;
}

/* ---------- progreso en el curso ---------- */
function lessonKey(u, i) { return u.id + ':' + i; }
function lessonDone(c, u, i) { return !!(c.lessons[lessonKey(u, i)] && c.lessons[lessonKey(u, i)].n) || u.idx < (c.unlocked || 0); }
function currentUnit(lang) {
  const C = P.courseData(lang), c = P.course(lang); if (!c) return 0;
  for (const u of C.units) for (let i = 0; i < 4; i++) if (!lessonDone(c, u, i)) return u.idx;
  return C.units.length - 1;
}
function nextLesson(lang) {
  const C = P.courseData(lang), c = P.course(lang);
  for (const u of C.units) for (let i = 0; i < 4; i++) if (!lessonDone(c, u, i)) return { u, i };
  return null;
}
function unitUnlocked(c, C, u) {
  if (u.idx === 0 || u.idx <= (c.unlocked || 0)) return true;
  const prev = C.units[u.idx - 1]; return lessonDone(c, prev, 2);
}
function lessonUnlocked(c, C, u, i) { if (!unitUnlocked(c, C, u)) return false; return i === 0 || lessonDone(c, u, i - 1); }
function countWords() {
  let n = 0; Object.keys(P.profile.langs || {}).forEach((l) => { const c = P.course(l); if (c) n += SRS.learned(c); });
  P.stats.words = n; return n;
}
