/* ============ Parla · charla con el tutor ============
   El tutor responde en el idioma que aprendes, corrige tus mensajes, traduce si lo pides y guarda
   palabras nuevas en tu repaso. Lo que aprende de ti pasa a su memoria. */
const Chat = {
  busy: false, ctl: null,
  key(lang) { return 'chat_' + lang; },
  async load(lang) { let d = await Store.load(this.key(lang)); if (!d) { d = { msgs: [], scen: null, mode: 'libre', n: 0 }; Store.save(this.key(lang), d); } return d; },
  doc(lang) { return Store.get(this.key(lang || P.profile.active)); },
  save(lang) { const d = this.doc(lang); if (d.msgs.length > 60) d.msgs = d.msgs.slice(-60); Store.save(this.key(lang || P.profile.active), d); },
  system(lang, d) {
    const L = LANGS[lang], C = P.courseData(lang), cu = C.units[currentUnit(lang)], cefr = cu ? cu.cefr : 'A1';
    const scen = d.scen ? (L.scen || []).find((s) => s.id === d.scen) : null;
    const mode = d.mode || 'libre';
    let s = tutorSystem(lang) + '\n\n';
    if (mode === 'tutor') {
      s += 'Ahora haces de profesor particular: el alumno te pregunta dudas en castellano. Responde en castellano, claro y breve (máx. 120 palabras), con ejemplos en ' + L.es + '. Si escribe en ' + L.es + ', corrígele.\nFormato: tu respuesta y, si el alumno cometió errores en ' + L.es + ', una línea final que empiece por ">>CORR:" con la versión corregida.';
      return s;
    }
    s += 'Estáis conversando en ' + L.es + '. Nivel del alumno: ' + cefr + '. Usa frases cortas y vocabulario de su nivel, con alguna palabra nueva útil. Haz siempre una pregunta para que la conversación siga. Saca temas de sus intereses cuando encaje.\n';
    if (scen) s += 'Roleplay: ' + scen.d + ' Mantente en tu papel.\n';
    if (mode === 'estricto') s += 'Corrige TODOS los errores del alumno, incluso los pequeños (tildes, artículos, orden).\n';
    if (mode === 'diario') s += 'Hoy toca diario: pide al alumno que te cuente su día en tres frases, corrígelas con cariño y comenta algo de lo que cuente.\n';
    s += '\nFormato obligatorio de cada respuesta:\n1) Tu mensaje en ' + L.es + ' (1 a 3 frases).\n' +
      '2) Si el último mensaje del alumno tenía errores, una línea que empiece por ">>CORR:" con la frase corregida y una explicación de 10 palabras como máximo en castellano. Si no tenía errores, no pongas esta línea.\n' +
      '3) Una línea que empiece por ">>TRAD:" con la traducción al castellano de tu mensaje.\n' +
      '4) Opcional: una línea ">>VOCAB:" con 1 o 2 palabras nuevas de tu mensaje, formato "palabra = traducción; palabra = traducción".\nNo uses markdown.';
    return s;
  },
  parse(raw) {
    const out = { main: '', corr: '', trad: '', vocab: [] };
    const lines = String(raw || '').split('\n'); const main = [];
    lines.forEach((l) => {
      const m = /^\s*>>\s*(CORR|TRAD|VOCAB)\s*:\s*(.*)$/i.exec(l);
      if (m) { const k = m[1].toUpperCase(); if (k === 'CORR') out.corr = m[2].trim(); else if (k === 'TRAD') out.trad = m[2].trim(); else out.vocab = m[2].split(';').map((x) => x.split('=').map((y) => y.trim())).filter((x) => x.length === 2 && x[0] && x[1]).slice(0, 3); }
      else if (!/^\s*>>/.test(l)) main.push(l);
    });
    out.main = main.join('\n').trim();
    return out;
  },
  async send(text, o) {
    o = o || {};
    const lang = P.profile.active, d = this.doc(lang); if (this.busy) return;
    if (!AI.ok()) { toast(AI.msg({ code: 'no_ai' }), 4500); return; }
    if (text) d.msgs.push({ r: 'u', t: text, hidden: !!o.hidden });
    this.busy = true; this.save(lang); renderChatMsgs(true);
    const hist = d.msgs.slice(-18).map((m) => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.r === 'u' ? m.t : m.t + (m.trad ? '' : '') }));
    this.ctl = new AbortController();
    const bubble = $('#chat-live');
    try {
      const raw = await AI.text({ system: this.system(lang, d), messages: hist, signal: this.ctl.signal, onText: (t) => { const b = $('#chat-live'); if (b) b.textContent = this.parse(t).main || '…'; scrollChat(); } });
      const p = this.parse(raw);
      d.msgs.push({ r: 'a', t: p.main || raw.trim(), trad: p.trad, corr: p.corr });
      markAiOk();
      // corrección → memoria de fallos
      if (p.corr && text && !o.hidden) {
        const m = P.memory; m.mistakes.push({ t: Date.now(), lang, id: '', ex: 'chat', q: '', exp: p.corr.slice(0, 160), got: text.slice(0, 120), err: 'grammar' });
        m.tags[lang] = m.tags[lang] || {}; m.tags[lang].grammar = (m.tags[lang].grammar || 0) + 0.5; P.save('memory');
      }
      // vocabulario nuevo → repaso
      if (p.vocab.length) {
        const c = P.course(lang); c.custom = c.custom || {}; c.srs = c.srs || {}; let added = 0;
        p.vocab.forEach((v) => { const id = lang + ':chat:' + hash(v[0]).toString(36); if (!c.custom[id]) { c.custom[id] = { id, k: 'w', t: v[0], alt: [], es: v[1], altEs: [], em: '💬', unit: 'chat' }; c.srs[id] = [1, dayNum(), 0, 0, dayNum()]; added++; } });
        if (added) { P.saveCourse(lang); d.msgs[d.msgs.length - 1].vocab = p.vocab; }
      }
      if (text && !o.hidden) {
        d.n = (d.n || 0) + 1; P.stats.chat = (P.stats.chat || 0) + 1; Quests.bump('chat', 1);
        const st = P.stats; st.chatDay = st.chatDay && st.chatDay.day === dayKey() ? st.chatDay : { day: dayKey(), xp: 0 };
        if (st.chatDay.xp < 15) { st.chatDay.xp += 1; const r = Streak.addXP(1, 'chat'); if (r.extended) { Sound.play('streak'); toast('🔥 ¡Racha ampliada charlando! ' + r.streak + ' días', 3500); renderTop(); renderTabbar(); } }
        P.save('stats');
        if (d.n % 6 === 0) Memory.consolidate(lang, d.msgs.filter((m) => m.r === 'u' && !m.hidden).slice(-8).map((m) => 'Alumno: ' + m.t).join('\n'));
      }
      if (P.profile.chatVoice || P.profile.voiceChat) Speech.speak(p.main, lang).then(() => { if (P.profile.voiceChat && App.tab === 'chat' && !$('#overlay').innerHTML) setTimeout(chatAutoListen, 250); });
    } catch (e) {
      const msg = AI.msg(e); if (msg) toast(msg, 4500);
      if (text && e && e.code !== 'cancelled') { /* deja el mensaje para reintentar */ }
    }
    this.busy = false; this.ctl = null; this.save(lang); renderChatMsgs(); renderTop();
  },
};

function renderChat(v) {
  const lang = P.profile.active, L = LANGS[lang];
  if (!Chat.doc(lang)) { v.innerHTML = '<div class="center muted">Cargando…</div>'; Chat.load(lang).then(() => { if (App.tab === 'chat') renderChat($('#view')); }); return; }
  const d = Chat.doc(lang);
  if (App.chatMode) { d.mode = App.chatMode; d.msgs = []; d.scen = null; App.chatMode = null; Chat.save(lang); if (AI.ok()) setTimeout(() => Chat.send('(Empieza: pídeme que te cuente mi día en tres frases.)', { hidden: true }), 50); }
  const P_ = L.persona;
  let h = '<div class="chat-head"><span class="avatar">' + P_.em + '</span><div class="grow"><h2>' + esc(P_.name) + '</h2><div class="small muted">' + esc(P_.bio) + '</div></div><button class="icon-btn" data-act="chat-voice" aria-label="Leer respuestas en voz alta" style="color:' + (P.profile.chatVoice ? 'var(--accent-hi)' : 'var(--fg-3)') + '">' + ic('speaker') + '</button><button class="icon-btn" data-act="chat-new" aria-label="Nueva charla">' + ic('refresh') + '</button></div>';
  h += '<div class="scen"><button class="chip" data-act="chat-voicemode" aria-pressed="' + !!P.profile.voiceChat + '">🎧 Modo voz</button>' + CHAT_MODES.concat([{ id: 'diario', t: '📓 Diario' }]).map((m) => '<button class="chip" data-act="chat-mode" data-m="' + m.id + '" aria-pressed="' + ((d.mode || 'libre') === m.id && !d.scen) + '">' + m.t + '</button>').join('') + '</div>';
  h += '<div class="scen">' + (L.scen || []).map((s) => '<button class="chip" data-act="chat-scen" data-s="' + s.id + '" aria-pressed="' + (d.scen === s.id) + '">' + esc(s.t) + '</button>').join('') + '</div>';
  if (!AI.ok()) h += '<div class="card warn"><h3>Activa el tutor IA</h3><p class="small fg2 mt">' + esc(AI.msg({ code: AI.state === 'denied' ? 'not_granted' : 'no_ai' })) + '</p>' + (!Store.inClaude ? '<button class="btn sm mt" data-act="settings-ai">Añadir clave</button>' : '') + '</div>';
  h += '<div class="msgs" id="msgs"></div><div style="height:90px"></div>';
  v.innerHTML = h;
  renderChatMsgs(); showComposer();
}
function renderChatMsgs(live) {
  const box = $('#msgs'); if (!box) return;
  const lang = P.profile.active, d = Chat.doc(lang), L = LANGS[lang];
  let h = '';
  if (!d.msgs.filter((m) => !m.hidden).length && !live) h += botBubble({ t: L.persona.hello, trad: '' }, -1);
  d.msgs.forEach((m, i) => {
    if (m.hidden) return;
    if (m.r === 'u') h += '<div class="msg me">' + esc(m.t) + '</div>';
    else { if (m.corr) h += '<div class="corr">✎ <b>' + esc(m.corr) + '</b></div>'; h += botBubble(m, i); }
  });
  if (live) h += '<div class="msg bot" id="chat-live"><span class="typing"><i></i><i></i><i></i></span></div>';
  box.innerHTML = h; scrollChat();
}
function botBubble(m, i) {
  return '<div class="msg bot">' + esc(m.t) + (m.showTr && m.trad ? '<div class="tr">' + esc(m.trad) + '</div>' : '') +
    (m.vocab ? '<div class="tr">📚 ' + m.vocab.map((v) => esc(v[0]) + ' = ' + esc(v[1])).join(' · ') + ' <span class="small">(en tu repaso)</span></div>' : '') +
    '<div class="tools"><button data-act="say" data-text="' + esc(m.t) + '">🔊 Escuchar</button>' + (m.trad ? '<button data-act="chat-tr" data-i="' + i + '">' + (m.showTr ? 'Ocultar' : 'Traducir') + '</button>' : '') + '</div></div>';
}
function scrollChat() { requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight })); }
function showComposer() {
  let c = $('#composer');
  if (!c) {
    c = document.createElement('div'); c.id = 'composer'; c.className = 'composer';
    c.innerHTML = '<div class="composer-in">' + (Speech.canListen() ? '<button class="micb" id="chat-mic" data-act="chat-mic" aria-label="Dictar">' + ic('mic') + '</button>' : '') +
      '<textarea id="chat-in" rows="1" placeholder="Escribe…" aria-label="Mensaje"></textarea><button class="send" data-act="chat-send" aria-label="Enviar">' + ic('send') + '</button></div>';
    document.body.appendChild(c);
    const ta = $('#chat-in');
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(130, ta.scrollHeight) + 'px'; });
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ACT['chat-send'](); } });
  }
  const lang = P.profile.active; $('#chat-in').placeholder = 'Escribe en ' + LANGS[lang].es + '…'; $('#chat-in').lang = Speech.tag(lang);
  c.hidden = false;
}
function hideComposer() { const c = $('#composer'); if (c) c.hidden = true; }
ACT['chat-send'] = () => { const ta = $('#chat-in'); const t = ta.value.trim(); if (!t || Chat.busy) return; ta.value = ''; ta.style.height = 'auto'; Chat.send(t); };
ACT['chat-tr'] = (a) => { const d = Chat.doc(); const m = d.msgs[+a.dataset.i]; if (m) { m.showTr = !m.showTr; renderChatMsgs(); } };
ACT['chat-voice'] = () => { P.profile.chatVoice = !P.profile.chatVoice; P.save('profile'); toast(P.profile.chatVoice ? 'Leeré las respuestas en voz alta' : 'Voz desactivada en la charla'); renderChat($('#view')); };
ACT['chat-new'] = async () => {
  const d = Chat.doc(); if (d.msgs.length && !(await confirmBox({ title: '¿Empezar una charla nueva?', text: 'Se borra esta conversación. Tu tutor conserva lo que ha aprendido de ti.', ok: 'Nueva charla' }))) return;
  if (Chat.ctl) Chat.ctl.abort(); d.msgs = []; d.scen = null; Chat.save(); renderChat($('#view'));
};
ACT['chat-mode'] = (a) => {
  const d = Chat.doc(), m = a.dataset.m; if (Chat.busy) return;
  d.mode = m; d.scen = null; d.msgs = []; Chat.save(); renderChat($('#view'));
  if (!AI.ok()) return;
  if (m === 'diario') Chat.send('(Empieza: pídeme que te cuente mi día en tres frases.)', { hidden: true });
  else if (m === 'tutor') { d.msgs.push({ r: 'a', t: '¡Pregúntame lo que quieras! Gramática, palabras, cómo se dice algo… Te respondo en castellano. ✍️' }); Chat.save(); renderChatMsgs(); }
};
ACT['chat-scen'] = (a) => {
  const d = Chat.doc(); if (Chat.busy) return;
  d.scen = a.dataset.s; d.mode = 'libre'; d.msgs = []; Chat.save(); renderChat($('#view'));
  if (AI.ok()) Chat.send('(Empieza el roleplay tú con un saludo propio de la situación.)', { hidden: true });
};
ACT['chat-mic'] = async (a, ev, auto) => {
  if (Speech.rec) { Speech.cancelListen(); return; }
  a.classList.add('on'); const ta = $('#chat-in');
  try {
    const r = await Speech.listen(P.profile.active, { max: 12000, onInterim: (t) => { ta.value = t; } }); ta.value = r.text; P.stats.speak = (P.stats.speak || 0) + 1; Quests.bump('speak', 1);
    if ((auto || P.profile.voiceChat) && r.text.trim()) { a.classList.remove('on'); ACT['chat-send'](); return; }
  } catch (e) { if (Speech.micBlocked) { toast('Sin acceso al micro aquí: usa el micrófono del teclado.', 4000); a.remove(); } }
  a.classList.remove('on');
};
/* Modo voz: el tutor lee su respuesta y después te escucha (o abre el teclado para dictar) */
function chatAutoListen() {
  const mic = $('#chat-mic');
  if (mic && Speech.canListen()) ACT['chat-mic'](mic, null, true);
  else { const ta = $('#chat-in'); if (ta) ta.focus(); }
}
ACT['chat-voicemode'] = () => {
  const pr = P.profile; pr.voiceChat = !pr.voiceChat; if (pr.voiceChat) pr.chatVoice = true; P.save('profile');
  toast(pr.voiceChat ? '🎧 Modo voz: te leo cada respuesta' + (Speech.canListen() ? ' y luego te escucho' : '; contesta con el dictado del teclado') : 'Modo voz desactivado');
  renderChat($('#view'));
};
