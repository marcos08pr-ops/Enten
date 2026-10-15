/* ============ Parla · gramática: conjugación y ejercicios por tema ============
   Datos: VERBS_CA / VERBS_DE (tablas de conjugación) y DRILLS_CA / DRILLS_DE (temas: determinantes,
   género y número, pronombres, casos, conectores…). Formato de cada ejercicio de tema:
   'frase con ___|respuesta;alternativa|distractor;distractor|traducción|explicación'
   'ORDER|frase correcta|traducción|explicación'  (ordenar palabras) */
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1'];
const CEFR_NAME = { A1: 'Acceso', A2: 'Plataforma', B1: 'Umbral', B2: 'Avanzado', C1: 'Dominio' };
const cefrIdx = (c) => Math.max(0, CEFR.indexOf(String(c || 'A1').slice(0, 2)));
/* Gramática de las unidades 1-12 (las nuevas la traen en su campo gr) */
const UNIT_GR = {
  ca: { hola: ['drill:articles'], jo: ['conj:pres', 'drill:personal'], menjar: ['drill:articles', 'drill:contraccions'], familia: ['drill:possessius'], numeros: ['drill:plurals'], ciutat: ['drill:contraccions', 'drill:demostratius'],
    dia: ['conj:pres'], oci: ['drill:adjectius'], viatge: ['conj:fut', 'drill:preposicions'], ahir: ['conj:perif', 'conj:perfet'], sentir: ['drill:serestar', 'drill:adjectius'], feina: ['conj:cond', 'drill:possessius'] },
  de: { hallo: ['drill:artikel'], ich: ['conj:pres'], essen: ['drill:akkusativ'], familie: ['drill:possessiv'], zahlen: ['drill:plural'], stadt: ['drill:praepositionen'],
    tag: ['drill:trennbar', 'conj:pres'], freizeit: ['drill:akkusativ'], reisen: ['drill:dativ', 'drill:praepositionen'], gestern: ['conj:perfekt'], gefuehle: ['drill:pronomen', 'drill:adjektiv'], arbeit: ['drill:wortstellung'] },
};
/* Tipo de error de cada tema (para la memoria del tutor) */
const DRILL_ERR = {
  articles: 'determiners', personal: 'determiners', contraccions: 'determiners', possessius: 'determiners', demostratius: 'determiners', artikel: 'determiners', possessiv: 'determiners',
  plurals: 'agreement', adjectius: 'agreement', plural: 'agreement', adjektiv: 'agreement',
  febles: 'pronouns', febles2: 'pronouns', relatius: 'pronouns', pronomen: 'pronouns', relativ: 'pronouns',
  akkusativ: 'cases', dativ: 'cases', genitiv: 'cases', wechsel: 'cases', praepositionen: 'prepositions', preposicions: 'prepositions',
  subjuntiu: 'mood', konj1: 'mood', serestar: 'grammar', accents: 'accent', connectors: 'connectors', konnektoren: 'connectors', wortstellung: 'order', trennbar: 'order', passiv: 'grammar', registre: 'grammar',
};
const Gram = {
  verbsData(lang) { return lang === 'ca' ? (typeof VERBS_CA !== 'undefined' ? VERBS_CA : null) : lang === 'de' ? (typeof VERBS_DE !== 'undefined' ? VERBS_DE : null) : null; },
  drills(lang) { return lang === 'ca' ? (typeof DRILLS_CA !== 'undefined' ? DRILLS_CA : []) : lang === 'de' ? (typeof DRILLS_DE !== 'undefined' ? DRILLS_DE : []) : []; },
  drill(lang, id) { return this.drills(lang).find((d) => d.id === id) || null; },
  tense(lang, id) { const V = this.verbsData(lang); return V ? V.tenses.find((t) => t.id === id) || null : null; },
  has(lang) { return !!this.verbsData(lang) || this.drills(lang).length > 0; },
  /* formas de un tiempo: [[canónica, alternativas…] × 6] */
  forms(v, tense) { const s = v.f && v.f[tense]; return s ? s.split('|').map((x) => x.split(';').map((y) => y.trim()).filter(Boolean)) : null; },
  parse(lang, d, s, i) {
    const f = s.split('|'), id = lang + ':gr:' + d.id + ':' + i;
    if (f[0] === 'ORDER') return { kind: 'order', id, t: f[1], es: f[2] || '', why: f[3] || '' };
    return { kind: 'cloze', id, q: f[0], ans: (f[1] || '').split(';').map((x) => x.trim()).filter(Boolean), opts: (f[2] || '').split(';').map((x) => x.trim()).filter(Boolean), es: f[3] || '', why: f[4] || '' };
  },
  items(lang, d) { return d.items.map((s, i) => this.parse(lang, d, s, i)); },
  /* ---- ejercicios para el reproductor de lecciones ---- */
  drillEx(lang, d, it, level, pool) {
    const rng = Math.random;
    if (it.kind === 'order') {
      const item = { id: it.id, k: 's', t: it.t, alt: [], es: it.es, altEs: [], unit: 'gram' };
      const others = (pool || []).filter((x) => x.kind === 'order' && x.id !== it.id).map((x) => ({ id: x.id, k: 's', t: x.t, es: x.es }));
      const e = mkBank(item, others, 'es2t', level === 'facil' ? 0 : level === 'normal' ? 1 : 2, rng);
      e.why = it.why; e.drill = d.id; e.gram = true; e.title = d.name;
      return e;
    }
    const typed = (level === 'dificil' && rng() < 0.5) || level === 'experto';
    const full = it.q.replace('___', it.ans[0]);
    return { type: 'gram', mode: typed ? 'type' : 'choice', drill: d.id, title: d.name, why: it.why, q: it.q, answer: it.ans[0], answers: it.ans,
      options: shuffle([it.ans[0]].concat(it.opts.slice(0, 3)), rng), item: { id: it.id, k: 's', t: full, es: it.es, alt: [], altEs: [] } };
  },
  conjEx(lang, v, tenseId, p, level) {
    const V = this.verbsData(lang), T = this.tense(lang, tenseId), forms = this.forms(v, tenseId); if (!forms) return null;
    const ans = forms[p], rng = Math.random;
    const pool = uniq(forms.map((x) => x[0]).concat(V.tenses.map((t) => { const f = this.forms(v, t.id); return f ? f[p][0] : null; }).filter(Boolean)));
    const distract = shuffle(pool.filter((x) => ans.map(canon).indexOf(canon(x)) < 0), rng).slice(0, 3);
    const typed = level === 'dificil' || level === 'experto' || (level === 'normal' && rng() < 0.35);
    return { type: 'conj', mode: typed ? 'type' : 'choice', verb: v, tense: T, person: V.persons[p], answers: ans, answer: ans[0],
      options: shuffle([ans[0]].concat(distract), rng), item: { id: lang + ':cj:' + v.inf + ':' + tenseId + ':' + p, k: 's', t: V.persons[p].split(' / ')[0] + ' ' + ans[0], es: v.es, alt: [], altEs: [] } };
  },
  /* tiempos disponibles hasta un nivel */
  tensesUpTo(lang, cefr) { const V = this.verbsData(lang); return V ? V.tenses.filter((t) => cefrIdx(t.cefr) <= cefrIdx(cefr)) : []; },
  verbsUpTo(lang, cefr) { const V = this.verbsData(lang); return V ? V.verbs.filter((v) => cefrIdx(v.cefr) <= Math.max(cefrIdx(cefr), 1)) : []; },
  conjSession(lang, o) {
    const V = this.verbsData(lang); if (!V) return [];
    const tenses = (o.tenses && o.tenses.length ? o.tenses : V.tenses.map((t) => t.id)).filter((t) => this.tense(lang, t));
    const verbs = o.verbs && o.verbs.length ? V.verbs.filter((v) => o.verbs.indexOf(v.inf) >= 0) : V.verbs;
    const out = []; let guard = 0;
    while (out.length < (o.n || 12) && guard++ < 200) {
      const v = verbs[rand(verbs.length)], t = tenses[rand(tenses.length)], p = rand(6);
      const e = this.conjEx(lang, v, t, p, o.level || P.profile.level);
      if (e && !out.some((x) => x.item.id === e.item.id)) out.push(e);
    }
    return out;
  },
  drillSession(lang, ids, n, level) {
    const ds = ids.map((id) => this.drill(lang, id)).filter(Boolean); if (!ds.length) return [];
    const all = ds.flatMap((d) => this.items(lang, d).map((it) => ({ d, it })));
    const c = P.course(lang) || {};
    // primero lo que más falla esta persona, luego al azar
    const weak = SRS.weak(c, all.map((x) => x.it.id));
    const order = uniq(weak.concat(shuffle(all.map((x) => x.it.id)))).slice(0, n || 12);
    return order.map((id) => all.find((x) => x.it.id === id)).map((x) => this.drillEx(lang, x.d, x.it, level || P.profile.level, all.filter((y) => y.d === x.d).map((y) => y.it)));
  },
  /* ejercicios de gramática para una lección de unidad (según su campo gr) */
  forUnit(lang, u, n, level) {
    const gr = (u.gr && u.gr.length ? u.gr : (UNIT_GR[lang] || {})[u.id]) || [];
    const out = [];
    for (let k = 0; k < n * 3 && out.length < n; k++) {
      const g = gr[k % gr.length]; if (!g) break;
      const [kind, id] = g.split(':');
      if (kind === 'conj') { const V = this.verbsData(lang); if (!V) continue; const vs = this.verbsUpTo(lang, u.cefr); const e = this.conjEx(lang, vs[rand(vs.length)] || V.verbs[0], id, rand(6), level); if (e) out.push(e); }
      else if (kind === 'drill') { const d = this.drill(lang, id); if (!d) continue; const its = this.items(lang, d); const it = its[rand(its.length)]; out.push(this.drillEx(lang, d, it, level, its)); }
    }
    return out;
  },
};
