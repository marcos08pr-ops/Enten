/* ============ Parla · motor: cursos, corrección, repetición espaciada y lecciones ============ */

/* ---------- cursos ---------- */
const ART_RE = { de: /^(der|die|das) (.+)$/, ca: /^(el|la|els|les) (.+)$/ };
const G_OF = { der: 'm', die: 'f', das: 'n', el: 'm', la: 'f', els: 'm', les: 'f' };
function parseWord(lang, uid, i, s) {
  const f = s.split('|'), ts = f[0].split(';'), es = f[1].split(';');
  const it = { id: lang + ':' + uid + ':w' + i, k: 'w', t: ts[0], alt: ts.slice(1), es: es[0], altEs: es.slice(1), em: f[2] || '', unit: uid };
  const m = ART_RE[lang] && ART_RE[lang].exec(ts[0]);
  if (m) { it.art = m[1]; it.noun = m[2]; it.g = G_OF[m[1]]; }
  else if (lang === 'ca' && /^l'/.test(ts[0]) && f[3]) { it.art = "l'"; it.noun = ts[0].slice(2); it.g = f[3]; }
  return it;
}
function parseSent(lang, uid, i, s) {
  const f = s.split('|'), ts = f[0].split(';'), es = f[1].split(';');
  return { id: lang + ':' + uid + ':s' + i, k: 's', t: ts[0], alt: ts.slice(1), es: es[0], altEs: es.slice(1), unit: uid };
}
const Course = {
  cache: {},
  /* gen: contenido generado por IA para idiomas sin curso integrado */
  get(lang, gen) {
    const key = lang + ':' + (gen ? Object.keys(gen).length : 0);
    if (this.cache[key]) return this.cache[key];
    const L = LANGS[lang]; const src = L.units || TOPICS.map((t) => Object.assign({}, t, gen && gen[t.id] ? gen[t.id] : { pending: true }));
    const units = src.map((u, ui) => {
      const words = (u.w || []).map((s, i) => parseWord(lang, u.id, i, s));
      const sents = (u.s || []).map((s, i) => parseSent(lang, u.id, i, s));
      return { idx: ui, id: u.id, t: u.t, cefr: u.cefr, icon: u.icon, tip: u.tip || '', gr: u.gr || ((typeof UNIT_GR !== 'undefined' && UNIT_GR[lang]) || {})[u.id] || [], words, sents, pending: !!u.pending && !words.length };
    });
    const byId = {}; units.forEach((u) => { u.words.concat(u.sents).forEach((it) => { byId[it.id] = it; }); });
    const c = { lang, units, byId, ai: !!L.ai };
    Object.keys(this.cache).forEach((k) => { if (k.indexOf(lang + ':') === 0) delete this.cache[k]; });
    this.cache[key] = c;
    return c;
  },
  lessons(u) {
    // 3 lecciones de contenido + repaso de unidad
    const W = u.words, S = u.sents;
    return [
      { i: 0, label: 'Lección 1', words: W.slice(0, 5), sents: S.slice(0, 3) },
      { i: 1, label: 'Lección 2', words: W.slice(5, 10), sents: S.slice(3, 6) },
      { i: 2, label: 'Lección 3', words: W, sents: S.slice(6).concat(S.slice(0, 2)) },
      { i: 3, label: 'Repaso de la unidad', words: W, sents: S, review: true },
    ];
  },
};

/* ---------- normalización y corrección ---------- */
const PUNCT = /[.,!?¿¡;:"«»“”()…—–‐-―\-\/]/g;
function canon(s) {
  return String(s || '').normalize('NFC').toLowerCase()
    .replace(/[’‘`´]/g, "'").replace(/ŀl/g, 'l·l').replace(/l[.•∙⋅]l/g, 'l·l')
    .replace(PUNCT, ' ').replace(/\s+/g, ' ').trim();
}
function loose(s) { return canon(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/·/g, '').replace(/'/g, ' ').replace(/\s+/g, ' ').trim(); }
function translit(s) { return canon(s).replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss'); }
function lev(a, b) {
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
const ARTICLES = { de: ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'kein', 'keine', 'keinen', 'mein', 'meine', 'meinen'], ca: ['el', 'la', 'l', 'els', 'les', 'un', 'una', 'uns', 'unes', 'meu', 'meva', 'meus', 'meves'], es: ['el', 'la', 'los', 'las', 'un', 'una', 'mi', 'mis'] };
/* Compara una respuesta escrita con las válidas.
   level: 'facil'|'normal'|'dificil'|'experto' → tolerancia con tildes y erratas. */
function checkText(given, answers, lang, level) {
  const g = canon(given);
  if (!g) return { ok: false, kind: 'empty', best: answers[0], err: 'blank' };
  for (const a of answers) if (canon(a) === g) return { ok: true, kind: 'exact', best: a };
  if (lang === 'de') for (const a of answers) if (translit(a) === translit(given)) return { ok: true, kind: 'exact', best: a };
  const gl = loose(given);
  let best = answers[0], bd = Infinity;
  for (const a of answers) { const d = lev(loose(a), gl); if (d < bd) { bd = d; best = a; } }
  const bl = loose(best);
  if (bl === gl) {
    if (level === 'experto') return { ok: false, kind: 'accent', best, err: 'accent', note: 'En modo experto las tildes cuentan.' };
    return { ok: true, kind: 'accent', best, err: 'accent', note: 'Ojo con las tildes y los signos: «' + best + '».' };
  }
  const gt = gl.split(' '), bt = bl.split(' ');
  const arts = ARTICLES[lang] || [];
  if (gt.length === bt.length) {
    const diff = gt.map((w, i) => (w !== bt[i] ? i : -1)).filter((i) => i >= 0);
    if (diff.length && diff.every((i) => arts.indexOf(gt[i]) >= 0 && arts.indexOf(bt[i]) >= 0)) return { ok: false, kind: 'wrong', best, err: 'gender', note: 'El artículo o el posesivo no concuerda.' };
    if (gt.slice().sort().join(' ') === bt.slice().sort().join(' ')) return { ok: false, kind: 'wrong', best, err: 'order', note: 'Las palabras son correctas, pero el orden no.' };
  }
  const tol = level === 'experto' ? 0 : level === 'dificil' ? (bl.length >= 10 ? 1 : 0) : bl.length >= 12 ? 2 : bl.length >= 4 ? 1 : 0;
  if (bd <= tol) {
    // no aceptar como errata si cambia un artículo
    const touchesArt = gt.length === bt.length && gt.some((w, i) => w !== bt[i] && (arts.indexOf(w) >= 0 || arts.indexOf(bt[i]) >= 0));
    if (!touchesArt) return { ok: true, kind: 'typo', best, err: 'spelling', note: 'Tenías una errata: «' + best + '».' };
  }
  let err = 'vocab';
  if (Math.abs(gt.length - bt.length) === 1) err = 'missing';
  else if (bd <= 3) err = 'spelling';
  else if (bt.length > 2) err = 'grammar';
  return { ok: false, kind: 'wrong', best, err };
}
/* Parecido entre lo que se ha dicho y la frase objetivo (por palabras). */
function speechScore(heard, target) {
  const tw = loose(target).split(' '), hw = loose(heard).split(' ');
  const n = tw.length, m = hw.length; const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) dp[i][j] = tw[i - 1] === hw[j - 1] || lev(tw[i - 1], hw[j - 1]) <= (tw[i - 1].length > 5 ? 1 : 0) ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  // qué palabras del objetivo se han reconocido
  const hit = new Array(n).fill(false); let i = n, j = m;
  while (i > 0 && j > 0) {
    if ((tw[i - 1] === hw[j - 1] || lev(tw[i - 1], hw[j - 1]) <= (tw[i - 1].length > 5 ? 1 : 0)) && dp[i][j] === dp[i - 1][j - 1] + 1) { hit[i - 1] = true; i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
  }
  const orig = String(target).replace(PUNCT, ' ').split(/\s+/).filter(Boolean);
  return { score: dp[n][m] / Math.max(n, 1), words: orig.map((w, k) => ({ w, ok: !!hit[k] })) };
}
const SPEAK_PASS = { facil: 0.6, normal: 0.72, dificil: 0.82, experto: 0.9 };

/* ---------- repetición espaciada (cajas de Leitner) ---------- */
const SRS_DAYS = [0, 1, 2, 4, 7, 15, 30, 60];
const dayNum = (k) => Math.round(keyDate(k || dayKey()) / 86400000);
const SRS = {
  // estado por ítem: [caja, díaQueToca, aciertos, fallos, últimoDía]
  get(c, id) { return (c.srs && c.srs[id]) || null; },
  mark(c, id, ok) {
    c.srs = c.srs || {};
    const t = dayNum(); const s = c.srs[id] || [0, t, 0, 0, t];
    if (ok) { s[0] = Math.min(7, s[0] + 1); s[2]++; s[1] = t + SRS_DAYS[s[0]]; }
    else { s[0] = Math.max(1, s[0] - 2); s[3]++; s[1] = t; }
    s[4] = t; c.srs[id] = s;
  },
  due(c, ids) { const t = dayNum(); return ids.filter((id) => { const s = c.srs && c.srs[id]; return s && s[1] <= t; }); },
  learned(c) { return Object.keys(c.srs || {}).filter((id) => c.srs[id][0] >= 2 && id.indexOf(':cj:') < 0 && id.indexOf(':gr:') < 0).length; },
  weak(c, ids) {
    return ids.map((id) => ({ id, s: c.srs && c.srs[id] })).filter((x) => x.s && x.s[3] > 0)
      .sort((a, b) => (b.s[3] - b.s[2] * 0.5) - (a.s[3] - a.s[2] * 0.5)).map((x) => x.id);
  },
};

/* ---------- generador de lecciones ---------- */
const LEVELS = {
  facil: { n: 8, name: 'Fácil', d: 'Opciones y fichas, pistas, tildes con aviso.', distract: 2,
    w: { pic: 3, choice: 3, bank: 3, match: 2, listenPick: 1.2, cloze: 2, type: 0.6, listen: 0.6, speak: 0.8, speakTr: 0, gender: 1 } },
  normal: { n: 10, name: 'Normal', d: 'Mezcla de todo: fichas, escribir, escuchar y hablar.', distract: 3,
    w: { pic: 1.2, choice: 2, bank: 3, match: 1, listenPick: 1.6, cloze: 2, type: 2, listen: 1.5, speak: 1.4, speakTr: 0.7, gender: 1.2 } },
  dificil: { n: 12, name: 'Difícil', d: 'Más escritura y dictados; voz más exigente.', distract: 5,
    w: { pic: 0.3, choice: 1, bank: 2, match: 0.5, listenPick: 1, cloze: 1, type: 4, listen: 3, speak: 2, speakTr: 1.4, gender: 1.5 } },
  experto: { n: 14, name: 'Experto', d: 'Todo escrito, sin pistas, 3 vidas y cronómetro.', distract: 6,
    w: { pic: 0, choice: 0.4, bank: 1, match: 0.3, listenPick: 0.6, cloze: 0.6, type: 5, listen: 4, speak: 2.5, speakTr: 2, gender: 1.5 } },
};
const LEVEL_ORDER = ['facil', 'normal', 'dificil', 'experto'];

function tokens(s) { return String(s).replace(/[.,!?¿¡;:"«»“”…]/g, ' ').split(/\s+/).filter(Boolean); }
function wpick(weights, rng) {
  const ks = Object.keys(weights).filter((k) => weights[k] > 0); const tot = ks.reduce((a, k) => a + weights[k], 0);
  let r = rng() * tot; for (const k of ks) { r -= weights[k]; if (r <= 0) return k; } return ks[ks.length - 1];
}

/* spec: {lang, course, prog, words, sents, extra:[items], level, prefs, n, kind, newIds:Set} */
function buildLesson(spec) {
  const rng = Math.random, C = spec.course, L = LEVELS[spec.level] || LEVELS.normal;
  const all = C.units.filter((u) => !u.pending).flatMap((u) => u.words.concat(u.sents));
  const pool0 = spec.words.concat(spec.sents).concat(spec.extra || []);
  const seen = new Set(Object.keys((P.course(spec.lang) || {}).srs || {})), units = new Set(pool0.map((x) => x.unit));
  // distractores de la misma unidad o ya vistos (no de unidades que aún no conoces)
  const near = (list, min) => { const n = list.filter((x) => units.has(x.unit) || seen.has(x.id)); return n.length >= min ? n : list; };
  const allW = near(all.filter((x) => x.k === 'w'), 8), allS = near(all.filter((x) => x.k === 's'), 6);
  const pool = uniq(spec.words.concat(spec.sents).concat(spec.extra || []).map((x) => x.id)).map((id) => C.byId[id] || (spec.custom && spec.custom[id])).filter(Boolean);
  const canHear = Speech.canSpeak() && !Session.noListen() && Speech.hasVoice(spec.lang);
  const canSay = !Session.noSpeak();
  const prefs = spec.prefs || [];
  const W = Object.assign({}, L.w);
  if (prefs.indexOf('hablar') >= 0) { W.speak *= 2; W.speakTr = (W.speakTr || 0.5) * 2; }
  if (prefs.indexOf('escuchar') >= 0) { W.listen *= 1.8; W.listenPick *= 1.8; }
  if (prefs.indexOf('escribir') >= 0) W.type *= 1.6;
  if (prefs.indexOf('juegos') >= 0 || prefs.indexOf('visual') >= 0) { W.match *= 1.5; W.pic *= 1.5; }
  if (prefs.indexOf('gramatica') >= 0) { W.cloze *= 1.5; W.gender *= 1.5; }
  if (!canHear) { W.listen = 0; W.listenPick = 0; }
  if (!canSay) { W.speak = 0; W.speakTr = 0; }
  if (spec.only === 'listen') Object.keys(W).forEach((k) => { if (k !== 'listen' && k !== 'listenPick') W[k] = 0; });
  if (spec.only === 'speak') Object.keys(W).forEach((k) => { if (k !== 'speak' && k !== 'speakTr') W[k] = 0; });
  if (spec.only === 'speak' && !W.speakTr) W.speakTr = W.speak * 0.6;

  const n = spec.n || L.n + (spec.kind === 'review' ? 2 : 0);
  const out = []; const used = {};
  const newWords = pool.filter((x) => x.k === 'w' && spec.newIds && spec.newIds.has(x.id));
  // 1) presentar palabras nuevas con un ejercicio de reconocimiento
  newWords.slice(0, Math.min(newWords.length, Math.ceil(n / 3))).forEach((it, k) => {
    const e = k % 2 === 0 && it.em && allW.filter((x) => x.em).length >= 4 && L.w.pic > 0 ? mkPic(it, allW, rng) : mkChoice(it, allW, k % 4 === 1 ? 't2es' : 'es2t', rng);
    e.isNew = true; out.push(e); used[it.id] = (used[it.id] || 0) + 1;
  });
  // 2) un ejercicio de parejas si hay palabras suficientes
  const pw = pool.filter((x) => x.k === 'w');
  if (pw.length >= 4 && W.match > 0 && rng() < Math.min(0.9, W.match / 2)) out.push(mkMatch(pick(pw, Math.min(5, pw.length), rng)));
  // 3) resto, ponderado y evitando repetir tipo
  let guard = 0;
  while (out.length < n && guard++ < 200) {
    const it = pickItem(pool, used, rng); if (!it) break;
    const w = Object.assign({}, W);
    if (it.k === 'w') { w.bank = 0; w.cloze = 0; w.speakTr = 0; if (!it.em || allW.filter((x) => x.em).length < 4) w.pic = 0; if (!it.g || !GENDER[spec.lang]) w.gender = 0; }
    else { w.pic = 0; w.gender = 0; w.choice *= 0.5; }
    w.match = 0;
    const last2 = out.slice(-2).map((e) => e.type);
    if (last2.length === 2 && last2[0] === last2[1]) w[last2[0]] = 0;
    if ((used[it.id] || 0) === 0 && it.k === 's' && spec.newIds && spec.newIds.has(it.id)) { w.type *= 0.4; w.listen *= 0.4; w.bank *= 1.6; w.speakTr = (w.speakTr || 0) * 0.3; }
    const ty = wpick(w, rng); if (!ty) continue;
    let e = null;
    if (ty === 'pic') e = mkPic(it, allW, rng);
    else if (ty === 'choice') e = mkChoice(it, it.k === 'w' ? allW : allS, rng() < 0.5 ? 't2es' : 'es2t', rng);
    else if (ty === 'bank') e = mkBank(it, allS, rng() < (spec.level === 'facil' ? 0.6 : 0.45) ? 't2es' : 'es2t', L.distract, rng);
    else if (ty === 'type') e = { type: 'type', item: it, dir: 'es2t' };
    else if (ty === 'listen') e = { type: 'listen', item: it };
    else if (ty === 'listenPick') e = mkListenPick(it, it.k === 'w' ? allW : allS, rng);
    else if (ty === 'speak') e = { type: 'speak', item: it };
    else if (ty === 'speakTr') e = { type: 'speakTr', item: it };
    else if (ty === 'cloze') e = mkCloze(it, allS, rng);
    else if (ty === 'gender') e = { type: 'gender', item: it, options: GENDER[spec.lang].opts.slice() };
    if (!e) continue;
    out.push(e); used[it.id] = (used[it.id] || 0) + 1;
  }
  return out;
}
function pickItem(pool, used, rng) {
  if (!pool.length) return null;
  const min = Math.min.apply(null, pool.map((x) => used[x.id] || 0));
  const cand = pool.filter((x) => (used[x.id] || 0) === min);
  return cand[Math.floor(rng() * cand.length)];
}
function distinct(list, key, not, n, rng) {
  const seen = new Set([canon(not)]); const out = [];
  shuffle(list.slice(), rng).forEach((x) => { const v = key(x); const c = canon(v); if (out.length < n && !seen.has(c)) { seen.add(c); out.push(v); } });
  return out;
}
function mkChoice(it, list, dir, rng) {
  const ans = dir === 't2es' ? it.es : it.t;
  const opts = shuffle([ans].concat(distinct(list.filter((x) => x.id !== it.id), (x) => (dir === 't2es' ? x.es : x.t), ans, 3, rng)), rng);
  return { type: 'choice', item: it, dir, options: opts, answer: ans };
}
function mkPic(it, words, rng) {
  const others = distinct(words.filter((x) => x.em && x.id !== it.id && x.em !== it.em), (x) => x.id, it.id, 3, rng).map((id) => words.find((w) => w.id === id));
  return { type: 'pic', item: it, options: shuffle([it].concat(others), rng) };
}
function mkMatch(items) { return { type: 'match', items }; }
function mkBank(it, sents, dir, nd, rng) {
  const target = dir === 't2es' ? it.es : it.t;
  const tk = tokens(target);
  const otherTok = shuffle(sents.filter((x) => x.id !== it.id).flatMap((x) => tokens(dir === 't2es' ? x.es : x.t)), rng);
  const low = new Set(tk.map((t) => t.toLowerCase())); const extra = [];
  for (const t of otherTok) { if (extra.length >= nd) break; if (!low.has(t.toLowerCase())) { low.add(t.toLowerCase()); extra.push(t); } }
  return { type: 'bank', item: it, dir, tiles: shuffle(tk.concat(extra).map((t, i) => ({ i, t })), rng) };
}
function mkListenPick(it, list, rng) {
  const opts = shuffle([it.t].concat(distinct(list.filter((x) => x.id !== it.id), (x) => x.t, it.t, 3, rng)), rng);
  return { type: 'listenPick', item: it, options: opts, answer: it.t };
}
function mkCloze(it, sents, rng) {
  const tk = tokens(it.t); const cands = tk.map((t, i) => ({ t, i })).filter((x) => loose(x.t).length >= 3);
  if (!cands.length || tk.length < 3) return null;
  const pickT = cands[Math.floor(rng() * cands.length)];
  const pool = sents.filter((x) => x.id !== it.id).flatMap((x) => tokens(x.t)).filter((t) => loose(t).length >= 3);
  const opts = shuffle([pickT.t].concat(distinct(pool.map((t) => ({ t })), (x) => x.t, pickT.t, 3, rng)), rng);
  return { type: 'cloze', item: it, idx: pickT.i, tokens: tk, options: opts, answer: pickT.t };
}
/* Prueba de nivel: una pregunta por unidad, de menos a más. */
function buildPlacement(C) {
  const rng = Math.random; const allS = C.units.flatMap((u) => u.sents);
  return C.units.filter((u) => u.sents.length).map((u) => {
    const it = u.sents[Math.floor(rng() * u.sents.length)];
    const e = rng() < 0.5 ? mkChoice(it, allS, 't2es', rng) : mkBank(it, allS, 'es2t', 3, rng);
    e.unit = u.idx; return e;
  });
}

/* Respuestas válidas de un ejercicio */
function answersFor(e) {
  const it = e.item;
  if (e.type === 'gram' || e.type === 'conj') return e.answers;
  if (e.type === 'speakTr') return [it.t].concat(it.alt || []);
  if (e.type === 'bank') return e.dir === 't2es' ? [it.es].concat(it.altEs || []) : [it.t].concat(it.alt || []);
  if (e.type === 'type') return e.dir === 'es2t' ? [it.t].concat(it.alt || []) : [it.es].concat(it.altEs || []);
  if (e.type === 'listen' || e.type === 'speak') return [it.t].concat(it.alt || []);
  return [e.answer];
}
function promptText(e) {
  const it = e.item;
  switch (e.type) {
    case 'pic': return 'Elige «' + it.es + '»';
    case 'choice': return e.dir === 't2es' ? '¿Qué significa «' + it.t + '»?' : '¿Cómo se dice «' + it.es + '»?';
    case 'bank': return e.dir === 't2es' ? 'Traduce: ' + it.t : 'Traduce: ' + it.es;
    case 'type': return 'Escribe: ' + it.es;
    case 'listen': return 'Dictado: ' + it.t;
    case 'listenPick': return 'Escucha y elige: ' + it.t;
    case 'speak': return 'Di en voz alta: ' + it.t;
    case 'cloze': return 'Completa: ' + e.tokens.map((t, i) => (i === e.idx ? '___' : t)).join(' ');
    case 'gender': return 'Artículo de «' + it.noun + '»';
    case 'speakTr': return 'Di en voz alta la traducción de: ' + it.es;
    case 'conj': return 'Conjuga «' + e.verb.inf + '» (' + e.tense.name + ') con «' + e.person + '»';
    case 'gram': return (e.title ? e.title + ': ' : '') + e.q;
    default: return '';
  }
}
