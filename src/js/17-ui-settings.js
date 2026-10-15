/* ============ Parla · ajustes, preferencias, recordatorios y bienvenida ============ */
const STYLES = [['juegos', '🎮 Jugando'], ['hablar', '🎙️ Hablando'], ['escuchar', '🎧 Escuchando'], ['escribir', '✍️ Escribiendo'], ['gramatica', '📐 Entendiendo la gramática'], ['visual', '🖼️ Con imágenes']];
const INTERESTS = ['Fútbol', 'Música', 'Series y cine', 'Videojuegos', 'Cocina', 'Viajes', 'Tecnología', 'Moda', 'Naturaleza', 'Fiesta', 'Historia', 'Arte', 'Deporte', 'Libros', 'Animales'];
const MOTIVES = ['Viajar', 'Trabajo', 'Estudios', 'Familia o pareja', 'Mudarme', 'Cultura', 'Por diversión', 'Examen oficial'];
function styleName(id) { const s = STYLES.find((x) => x[0] === id); return s ? s[1].replace(/^\S+\s/, '') : id; }
function chips(name, list, sel) { return '<div class="row wrap" data-group="' + name + '">' + list.map((x) => { const id = Array.isArray(x) ? x[0] : x, t = Array.isArray(x) ? x[1] : x; return '<button class="chip" data-act="chip" data-v="' + esc(id) + '" aria-pressed="' + (sel.indexOf(id) >= 0) + '">' + esc(t) + '</button>'; }).join('') + '</div>'; }
function seg(name, list, val) { return '<div class="seg" data-group="' + name + '">' + list.map((x) => '<button data-act="seg" data-v="' + esc(x[0]) + '" aria-pressed="' + (String(val) === String(x[0])) + '">' + x[1] + '</button>').join('') + '</div>'; }
ACT.chip = (a) => { a.setAttribute('aria-pressed', a.getAttribute('aria-pressed') !== 'true'); Sound.play('tap'); };
ACT.seg = (a) => { $$('button', a.parentNode).forEach((b) => b.setAttribute('aria-pressed', b === a)); Sound.play('tap'); const f = ACT['seg:' + a.parentNode.dataset.group]; if (f) f(a.dataset.v); };
const readChips = (root, name) => $$('[data-group="' + name + '"] [aria-pressed="true"]', root).map((b) => b.dataset.v);
const readSeg = (root, name) => { const b = $('[data-group="' + name + '"] [aria-pressed="true"]', root); return b ? b.dataset.v : null; };

/* ---------- ajustes ---------- */
ACT.settings = () => {
  const pr = P.profile, lang = pr.active, vs = Speech.list(lang), cur = Speech.voice(lang);
  const root = openOverlay('<div class="ov-top"><button class="icon-btn" data-act="ov-close" aria-label="Cerrar">' + ic('back') + '</button><h2 class="grow">Ajustes</h2></div><div class="ov-body">' +
    '<section class="stack"><p class="eyebrow">Apariencia</p>' + seg('theme', [['dark', '🌙 Oscuro'], ['light', '☀️ Claro'], ['auto', '⚙️ Auto']], pr.theme) + '</section>' +
    '<section class="stack"><p class="eyebrow">Aprendizaje</p>' +
      '<div class="field"><label>Meta diaria</label>' + seg('goal', [[10, 'Casual'], [20, 'Normal'], [30, 'Serio'], [50, 'Intenso']], pr.goal) + '</div>' +
      '<div class="field"><label>Dificultad</label>' + seg('level', LEVEL_ORDER.map((k) => [k, LEVELS[k].name]), pr.level) + '<p class="small muted" id="lvl-d">' + esc(LEVELS[pr.level].d) + '</p></div>' +
      '<button class="setrow" data-act="toggle-auto"><span class="grow"><b>Dificultad automática</b><br><span class="small muted">Sube o baja según tus resultados</span></span><span class="switch" role="switch" aria-checked="' + !!pr.autoLevel + '"></span></button>' +
      '<button class="btn ghost block" data-act="prefs">Preferencias e intereses</button>' +
      '<button class="btn ghost block" data-act="placement">Hacer la prueba de nivel de ' + esc(LANGS[lang].es) + '</button></section>' +
    '<section class="stack"><p class="eyebrow">Voz y sonido</p>' +
      '<div class="field"><label>Velocidad de la voz</label>' + seg('rate', [[0.75, '🐢 Lenta'], [0.95, 'Normal'], [1.1, '🐇 Rápida']], pr.rate || 0.95) + '</div>' +
      (vs.length ? '<div class="field"><label for="voice-sel">Voz en ' + esc(LANGS[lang].es) + '</label><select class="input" id="voice-sel">' + vs.map((v) => '<option value="' + esc(v.voiceURI) + '"' + (cur && v.voiceURI === cur.voiceURI ? ' selected' : '') + '>' + esc(v.name) + ' (' + esc(v.lang) + ')</option>').join('') + '</select></div>' : '<div class="card flat small">No hay voz instalada para ' + esc(LANGS[lang].es) + '. <button class="link" data-act="voice-help">Cómo instalarla</button></div>') +
      '<button class="btn ghost block" data-act="voice-test">' + ic('speaker', 'sm') + ' Probar voz</button>' +
      '<button class="setrow" data-act="toggle-sound"><span class="grow"><b>Sonidos de la app</b></span><span class="switch" role="switch" aria-checked="' + (pr.sound !== false) + '"></span></button></section>' +
    '<section class="stack"><p class="eyebrow">Racha</p><button class="btn block" data-act="reminders">' + ic('bell') + ' Recordatorios y avisos</button></section>' +
    '<section class="stack"><p class="eyebrow">Tutor IA</p>' + aiSettings() + '</section>' +
    '<section class="stack"><p class="eyebrow">Compartir</p><div class="card flat small fg2">' + shareText() + '</div></section>' +
    '<section class="stack"><p class="eyebrow">Tus datos</p><div class="small muted">' + (Store.mode === 'cloud' ? 'Guardados en tu cuenta de Claude, en una carpeta privada solo tuya.' : 'Guardados en este navegador.') + '</div>' +
      (guestMode() ? '<div class="row"><button class="btn grow" data-act="progress-save">Copiar código de progreso</button><button class="btn ghost grow" data-act="progress-restore">Recuperar</button></div>' : '') +
      '<div class="row"><button class="btn ghost grow" data-act="export">Exportar copia</button><label class="btn ghost grow" for="import-file" style="cursor:pointer">Importar</label><input type="file" id="import-file" accept="application/json,.json" hidden></div>' +
      '<button class="btn bad block" data-act="wipe">Borrar todo mi progreso</button></section>' +
    '<p class="small muted center">Parla · hecha con la experiencia de Enten · ' + (Store.inClaude ? 'dentro de Claude' : 'web') + '</p></div>');
  const sel = $('#voice-sel', root); if (sel) sel.onchange = () => { pr.voices = pr.voices || {}; pr.voices[lang] = sel.value; Speech.prefs = pr.voices; P.save('profile'); Speech.speak(LANGS[lang].persona.hello, lang); };
  const imp = $('#import-file', root); if (imp) imp.onchange = () => importFile(imp.files[0]);
  const key = $('#api-key', root); if (key) key.onkeydown = (e) => { if (e.key === 'Enter') ACT['save-key'](); };
};
ACT['ov-close'] = () => closeOverlay();
ACT['seg:theme'] = (v) => { P.profile.theme = v; P.save('profile'); applyTheme(); };
ACT['seg:goal'] = (v) => { P.profile.goal = +v; P.save('profile'); };
ACT['seg:level'] = (v) => { P.profile.level = v; P.save('profile'); const d = $('#lvl-d'); if (d) d.textContent = LEVELS[v].d; };
ACT['seg:rate'] = (v) => { P.profile.rate = +v; Speech.rate = +v; P.save('profile'); Speech.speak(LANGS[P.profile.active].persona.hello, P.profile.active); };
ACT['toggle-auto'] = (a) => { const pr = P.profile; pr.autoLevel = !pr.autoLevel; P.save('profile'); $('.switch', a).setAttribute('aria-checked', pr.autoLevel); };
ACT['toggle-sound'] = (a) => { const pr = P.profile; pr.sound = pr.sound === false; Sound.on = pr.sound; P.save('profile'); $('.switch', a).setAttribute('aria-checked', pr.sound); };
ACT['voice-test'] = () => { const l = P.profile.active; if (!Speech.hasVoice(l)) { voiceHelp(); return; } Speech.speak(LANGS[l].persona.hello, l); };
ACT['voice-help'] = () => voiceHelp();
ACT.placement = () => { closeOverlay(); startPlacement(P.profile.active); };
function shareText() {
  if (!Store.inClaude) return 'Pasa este enlace a quien quieras: ' + esc(Notify.link()) + '. Cada persona guarda su progreso en su propio móvil.';
  if (guestMode()) return 'Entras sin permiso para guardar en la nube (normalmente, con el enlace público). Pide a quien te pasó Parla que te invite por correo como <b>Editor</b> con el enlace público desactivado. Mientras, guarda tu código de progreso antes de salir.';
  return 'Para que cada amigo guarde su progreso en la nube: botón <b>Compartir</b> del artefacto → <b>desactiva el enlace público</b> e invita a cada persona con su correo como <b>Editor</b>. Cada una tendrá su racha, su curso y su tutor (que usa su propia cuenta de Claude), y apareceréis en la liga de amigos.<br><br>Con el enlace público también pueden usarla, pero Claude no les deja guardar en la nube y en iPhone se borra al cerrar Safari: la app les ofrece un código para guardar y recuperar su progreso.';
}
function aiSettings() {
  if (Store.inClaude) return '<div class="card flat small">' + (AI.ok() ? '✅ Activo con tu cuenta de Claude. No necesitas clave.' : '⚠️ ' + esc(AI.msg({ code: AI.state === 'denied' ? 'not_granted' : 'capability_disabled' }))) + '</div>';
  const has = !!AI.getKey();
  return '<div class="card flat small fg2">' + (has ? '✅ Clave guardada en este navegador. ' : 'Fuera de Claude, el tutor usa tu clave de la API de Anthropic (se cobra aparte, en console.anthropic.com). ') + 'La clave solo viaja a api.anthropic.com.</div>' +
    '<div class="row"><input class="input grow" id="api-key" type="password" autocomplete="off" placeholder="' + (has ? '••••••••' : 'sk-ant-…') + '"><button class="btn sm" data-act="save-key">Guardar</button></div>' + (has ? '<button class="btn text" data-act="del-key">Quitar la clave</button>' : '');
}
ACT['settings-ai'] = () => { ACT.settings(); setTimeout(() => { const k = $('#api-key'); if (k) { k.scrollIntoView({ block: 'center' }); k.focus(); } }, 200); };
ACT['save-key'] = () => { const v = ($('#api-key').value || '').trim(); if (!/^sk-ant-/.test(v)) { toast('La clave debe empezar por sk-ant-'); return; } AI.setKey(v); toast('Clave guardada: tutor IA activo'); ACT.settings(); };
ACT['del-key'] = () => { AI.setKey(''); toast('Clave eliminada'); ACT.settings(); };
ACT.export = async () => {
  const data = JSON.stringify(Store.exportAll(), null, 1), name = 'parla-copia-' + dayKey() + '.json';
  if (Store.inClaude) {
    let dl = null; try { dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
    if (!dl) { toast('Esta vista no permite descargar archivos.'); return; }
    try { await dl.save({ filename: name, data }); } catch (e) { if (e && e.code !== 'declined') toast('No se ha podido guardar la copia.'); }
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
};
function importFile(f) {
  if (!f) return; const r = new FileReader();
  r.onload = async () => {
    try { const o = JSON.parse(r.result); if (!(await confirmBox({ title: '¿Importar esta copia?', text: 'Sustituye tu progreso actual por el de la copia.', ok: 'Importar' }))) return; await Store.importAll(o); toast('Copia importada'); setTimeout(() => location.reload(), 600); }
    catch (e) { toast('Ese archivo no es una copia de Parla.'); }
  };
  r.readAsText(f);
}
ACT.wipe = async () => {
  if (!(await confirmBox({ title: '¿Borrar todo?', text: 'Se borran tu racha, tu progreso, la memoria del tutor y las charlas. No se puede deshacer.', ok: 'Borrar todo', danger: true }))) return;
  await Store.wipe(); toast('Progreso borrado'); setTimeout(() => location.reload(), 500);
};

/* ---------- preferencias ---------- */
ACT.prefs = () => {
  const p = P.profile.prefs || {};
  openSheet('<h2>Cómo aprendes mejor</h2><p class="small fg2">Tu tutor y tus lecciones se adaptan a esto.</p>' +
    '<p class="eyebrow">Me gusta aprender…</p>' + chips('styles', STYLES, p.styles || []) +
    '<p class="eyebrow">Mis intereses</p>' + chips('interests', INTERESTS, p.interests || []) +
    '<p class="eyebrow">¿Para qué?</p>' + chips('motive', MOTIVES, p.motive || []) +
    '<p class="eyebrow">Explicaciones</p>' + seg('explain', [['breve', 'Breves'], ['detallada', 'Detalladas']], p.explain || 'breve') +
    '<p class="eyebrow">Tono del tutor</p>' + seg('tone', [['divertido', '😄 Con humor'], ['serio', '🎓 Serio']], p.tone || 'divertido') +
    '<button class="btn block" data-act="prefs-save">Guardar</button>');
};
ACT['prefs-save'] = () => {
  const r = $('.sheet-in'); const p = P.profile.prefs = P.profile.prefs || {};
  p.styles = readChips(r, 'styles'); p.interests = readChips(r, 'interests'); p.motive = readChips(r, 'motive');
  p.explain = readSeg(r, 'explain') || 'breve'; p.tone = readSeg(r, 'tone') || 'divertido';
  P.save('profile'); closeSheet(); toast('Preferencias guardadas'); render();
};

/* ---------- recordatorios ---------- */
ACT.reminders = () => {
  const r = P.profile.reminder || { time: '20:30', on: true }, ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  let h = '<h2>' + ic('bell') + ' No pierdas tu racha</h2>' +
    '<div class="field"><label for="rem-time">Hora del recordatorio</label><input class="input" type="time" id="rem-time" value="' + esc(r.time) + '"></div>' +
    '<button class="setrow" data-act="rem-toggle"><span class="grow"><b>Recordatorio diario</b><br><span class="small muted">Avisos dentro de la app y cuenta atrás hasta medianoche</span></span><span class="switch" role="switch" aria-checked="' + !!r.on + '"></span></button>';
  if (Notify.hosted()) {
    h += '<div class="card"><h3>📅 Aviso en el calendario</h3><p class="small fg2 mt">Crea un evento diario a esa hora con alarma (y otra a las 2 h si es pronto). Funciona en cualquier iPhone, aunque no abras la app.</p><button class="btn block mt" data-act="rem-ics">Añadir al calendario</button></div>';
    if (Notify.canLocal()) h += '<div class="card"><h3>🔔 Notificaciones</h3><p class="small fg2 mt">' + (ios && !Notify.standalone() ? 'En iPhone, primero añade Parla a la pantalla de inicio (Compartir → Añadir a pantalla de inicio) y ábrela desde allí.' : 'Te aviso si tienes Parla abierta a tu hora y marco el icono con un punto rojo mientras la racha esté pendiente.') + '</p><button class="btn ghost block mt" data-act="rem-notif">' + (Notify.perm() === 'granted' ? '✓ Activadas' : 'Activar notificaciones') + '</button></div>';
    if (Notify.pushReady()) h += '<div class="card accent"><h3>🚀 Avisos push</h3><p class="small fg2 mt">Avisos aunque no abras la app, enviados cada día a tu hora. Si ya practicaste, te felicita en vez de avisarte.</p><button class="btn block mt" data-act="rem-push">Activar avisos push</button><div id="push-out"></div></div>';
    else h += '<details class="card flat small"><summary><b>Avisos push (avanzado)</b></summary><p class="fg2 mt">Para recibir avisos aunque no abras la app hace falta un pequeño envío diario desde GitHub Actions. Los pasos están en el README del repositorio. Genera aquí tus claves:</p><button class="btn sm ghost mt" data-act="rem-keys">Generar claves</button><div id="keys-out"></div></details>';
  } else {
    h += '<div class="card"><h3>📱 Aviso diario en el iPhone</h3><p class="small fg2 mt">Dentro de Claude la app no puede enviarte notificaciones, así que crea un recordatorio que se repita:</p>' +
      '<ol class="small fg2" style="padding-left:18px;margin:8px 0 0"><li>Abre la app <b>Recordatorios</b> y crea uno: <b>🔥 Parla: mantén tu racha</b>.</li><li>Toca ⓘ → activa <b>Fecha</b> y <b>Hora</b> (' + esc(r.time) + ').</li><li><b>Repetir → Cada día</b>. Si quieres, añade el enlace de Parla en <b>URL</b>.</li></ol>' +
      '<button class="btn ghost block mt" data-act="rem-copy">Copiar texto del recordatorio</button></div>' +
      '<div class="card flat small fg2">También puedes pedirle a Siri: «Recuérdame todos los días a las ' + esc(r.time.replace(':', ' y ')) + ' practicar en Parla».</div>';
  }
  openSheet(h, (el) => {
    const t = $('#rem-time', el); t.onchange = () => { P.profile.reminder = Object.assign({}, P.profile.reminder, { time: t.value || '20:30' }); P.save('profile'); Notify.schedule(); toast('Recordatorio a las ' + t.value); };
  });
};
ACT['rem-toggle'] = (a) => { const r = P.profile.reminder = Object.assign({ time: '20:30' }, P.profile.reminder); r.on = !r.on; P.save('profile'); $('.switch', a).setAttribute('aria-checked', r.on); Notify.schedule(); };
ACT['rem-ics'] = () => { if (Notify.downloadIcs()) toast('Abre el archivo y pulsa «Añadir todo»'); else toast('No se ha podido crear el evento'); };
ACT['rem-notif'] = async () => { const p = await Notify.request(); toast(p === 'granted' ? 'Notificaciones activadas' : 'Sin permiso para notificaciones'); if (p === 'granted') { Notify.syncState(); Notify.show('🔥 ¡Así te avisaré!', 'Racha actual: ' + Streak.count() + ' días.'); } ACT.reminders(); };
ACT['rem-copy'] = () => copyText('🔥 Parla: mantén tu racha' + (Notify.link() ? ' · ' + Notify.link() : ''));
ACT['rem-push'] = async () => {
  const out = $('#push-out');
  try { const sub = await Notify.subscribe(); const code = JSON.stringify(sub); out.innerHTML = '<p class="small fg2 mt">Listo. Envía este código a quien gestiona Parla (o pégalo tú en <b>push/subscriptions.json</b> del repositorio):</p><textarea class="input small" readonly rows="4">' + esc(code) + '</textarea><button class="btn sm ghost mt" data-act="copy-push">Copiar código</button>'; App.pushCode = code; }
  catch (e) { out.innerHTML = '<p class="small" style="color:var(--bad)">' + (e && e.code === 'denied' ? 'Sin permiso para notificaciones. Actívalo en Ajustes del iPhone → Notificaciones → Parla.' : 'No se ha podido activar. En iPhone, abre Parla desde la pantalla de inicio.') + '</p>'; }
};
ACT['copy-push'] = () => copyText(App.pushCode || '');
ACT['rem-keys'] = async () => {
  const k = await Notify.genKeys(); App.keys = k;
  $('#keys-out').innerHTML = '<p class="small fg2 mt"><b>Pública</b> (va en push-config.json):</p><textarea class="input small" readonly rows="3">' + esc(k.publicKey) + '</textarea><button class="btn sm ghost mt" data-act="copy-pub">Copiar pública</button>' +
    '<p class="small fg2 mt"><b>Privada</b> (va en el secreto VAPID_PRIVATE_KEY de GitHub; no la compartas):</p><textarea class="input small" readonly rows="2">' + esc(k.privateKey) + '</textarea><button class="btn sm ghost mt" data-act="copy-priv">Copiar privada</button>';
};
ACT['copy-pub'] = () => copyText(App.keys.publicKey);
ACT['copy-priv'] = () => copyText(App.keys.privateKey);

/* ---------- bienvenida ---------- */
const Onb = {
  st: null, steps: 7,
  start() { this.st = { step: 0, name: '', lang: 'ca', start: 'zero', styles: [], interests: [], motive: [], explain: 'breve', tone: 'divertido', goal: 20, level: 'normal', time: '20:30' }; this.render(); },
  render() {
    const s = this.st, n = s.step; let h = '';
    const dots = n ? '<div class="steps">' + Array.from({ length: this.steps }, (_, i) => '<i class="' + (i < n ? 'on' : '') + '"></i>').join('') + '</div>' : '';
    if (n === 0) h = '<div class="onb" style="padding-top:6vh"><div class="logo">Parla</div><h1>Aprende catalán, alemán y más, un poco cada día.</h1><p class="fg2">Lecciones de 3 minutos, juegos, voz y un tutor con IA que recuerda tus fallos y tus gustos. Tu racha te espera.</p><div class="row wrap">' + flag('ca', 'lg') + flag('de', 'lg') + flag('en', 'lg') + flag('fr', 'lg') + flag('it', 'lg') + flag('pt', 'lg') + '</div>' +
      '<button class="btn ghost block" data-act="progress-restore">Ya usaba Parla: recuperar mi progreso</button></div>';
    else if (n === 1) h = '<div class="onb"><h2>¿Cómo te llamas?</h2><p class="fg2">Así te hablará tu tutor.</p><input class="input" id="onb-name" maxlength="30" autocomplete="given-name" placeholder="Tu nombre" value="' + esc(s.name) + '"></div>';
    else if (n === 2) h = '<div class="onb"><h2>¿Qué quieres aprender?</h2><div class="stack tight">' + ['ca', 'de', 'en', 'fr', 'it', 'pt'].map((l) => '<button class="lang-card" data-act="onb-lang" data-l="' + l + '" aria-pressed="' + (s.lang === l) + '">' + flag(l, 'lg') + '<div class="grow"><div class="nm">' + esc(LANGS[l].name) + '</div><div class="small muted">' + (LANGS[l].ai ? 'Curso generado por el tutor IA' : 'Curso completo para hispanohablantes') + '</div></div>' + (LANGS[l].ai ? '<span class="tag">IA</span>' : '') + '</button>').join('') + '</div><p class="small muted">Podrás añadir más idiomas cuando quieras.</p></div>';
    else if (n === 3) h = '<div class="onb"><h2>¿Cuánto sabes de ' + esc(LANGS[s.lang].es) + '?</h2><div class="stack tight">' + [['zero', '🌱', 'Empiezo de cero'], ['some', '🌿', 'Sé algunas cosas', 'Hago una prueba de nivel de 2 minutos'], ['good', '🌳', 'Me defiendo bien', 'Prueba de nivel y salto hasta donde llegues']].map((x) => '<button class="lang-card" data-act="onb-start" data-v="' + x[0] + '" aria-pressed="' + (s.start === x[0]) + '"><span style="font-size:30px">' + x[1] + '</span><div class="grow"><div class="nm">' + x[2] + '</div>' + (x[3] ? '<div class="small muted">' + x[3] + '</div>' : '') + '</div></button>').join('') + '</div></div>';
    else if (n === 4) h = '<div class="onb"><h2>Cuéntame de ti</h2><p class="fg2">Tu tutor usará tus intereses en las frases y en la charla.</p><p class="eyebrow">¿Para qué lo aprendes?</p>' + chips('motive', MOTIVES, s.motive) + '<p class="eyebrow">Te interesa…</p>' + chips('interests', INTERESTS, s.interests) + '</div>';
    else if (n === 5) h = '<div class="onb"><h2>¿Cómo aprendes mejor?</h2><p class="fg2">Elige todo lo que te guste: las lecciones meterán más de eso.</p>' + chips('styles', STYLES, s.styles) + '<p class="eyebrow">Explicaciones</p>' + seg('explain', [['breve', 'Breves'], ['detallada', 'Detalladas']], s.explain) + '<p class="eyebrow">Tono del tutor</p>' + seg('tone', [['divertido', '😄 Con humor'], ['serio', '🎓 Serio']], s.tone) + '</div>';
    else if (n === 6) h = '<div class="onb"><h2>Tu meta diaria</h2>' + seg('goal', [[10, 'Casual<br><span class="small muted">5 min</span>'], [20, 'Normal<br><span class="small muted">10 min</span>'], [30, 'Serio<br><span class="small muted">15 min</span>'], [50, 'Intenso<br><span class="small muted">25 min</span>']], s.goal) + '<p class="eyebrow">Dificultad</p>' + seg('level', LEVEL_ORDER.map((k) => [k, LEVELS[k].name]), s.level) + '<p class="small muted" id="lvl-d">' + esc(LEVELS[s.level].d) + ' Se ajusta sola según tus resultados.</p></div>';
    else if (n === 7) h = '<div class="onb"><h2>¿A qué hora te recuerdo la racha?</h2><p class="fg2">Elige un momento en el que suelas tener 5 minutos libres.</p><input class="input" type="time" id="onb-time" value="' + esc(s.time) + '"><div class="card flat small fg2">' + flameSvg('on') + ' Cada día que completes una lección, tu racha sube. Si un día fallas, un <b>protector</b> 🧊 la salva. Empiezas con uno.</div></div>';
    const root = openOverlay('<div class="ov-top">' + (n ? '<button class="icon-btn" data-act="onb-back" aria-label="Atrás">' + ic('back') + '</button>' : '') + '<div class="grow">' + dots + '</div></div><div class="ov-body">' + h + '</div><div class="ov-foot"><button class="btn block" data-act="onb-next">' + (n === 0 ? 'Empezar' : n === 7 ? '¡A por la primera lección!' : 'Continuar') + '</button></div>');
    const nm = $('#onb-name', root); if (nm) { setTimeout(() => nm.focus(), 250); nm.onkeydown = (e) => { if (e.key === 'Enter') ACT['onb-next'](); }; }
  },
  collect() {
    const s = this.st, r = $('#overlay');
    if (s.step === 1) s.name = ($('#onb-name', r).value || '').trim();
    if (s.step === 4) { s.motive = readChips(r, 'motive'); s.interests = readChips(r, 'interests'); }
    if (s.step === 5) { s.styles = readChips(r, 'styles'); s.explain = readSeg(r, 'explain') || 'breve'; s.tone = readSeg(r, 'tone') || 'divertido'; }
    if (s.step === 6) { s.goal = +(readSeg(r, 'goal') || 20); s.level = readSeg(r, 'level') || 'normal'; }
    if (s.step === 7) s.time = $('#onb-time', r).value || '20:30';
  },
  async finish() {
    const s = this.st, pr = P.profile;
    Object.assign(pr, { name: s.name, active: s.lang, goal: s.goal, level: s.level, onboarded: true, reminder: { time: s.time, on: true } });
    pr.prefs = { styles: s.styles, interests: s.interests, motive: s.motive, explain: s.explain, tone: s.tone };
    pr.langs[s.lang] = { started: dayKey() };
    P.save('profile'); await P.loadCourse(s.lang); Notify.schedule(); Board.sync();
    this.st = null; closeOverlay();
    if (LANGS[s.lang].ai) { ACT['next-lesson'](); return; }
    if (s.start !== 'zero') startPlacement(s.lang); else startUnitLesson(0, 0);
  },
};
ACT['onb-next'] = () => {
  const s = Onb.st; Onb.collect();
  if (s.step === 1 && !s.name) { toast('Escribe tu nombre (o un apodo)'); return; }
  if (s.step === 2 && LANGS[s.lang].ai && !AI.ok()) { toast(AI.msg({ code: 'no_ai' }), 5000); return; }
  if (s.step === 2 && LANGS[s.lang].ai) s.step++; // sin prueba de nivel en cursos IA
  if (s.step >= 7) { Onb.finish(); return; }
  s.step++; Onb.render();
};
ACT['onb-back'] = () => { const s = Onb.st; Onb.collect(); s.step = Math.max(0, s.step - 1); Onb.render(); };
ACT['onb-lang'] = (a) => { Onb.st.lang = a.dataset.l; $$('[data-act="onb-lang"]').forEach((b) => b.setAttribute('aria-pressed', b === a)); Sound.play('tap'); };
ACT['onb-start'] = (a) => { Onb.st.start = a.dataset.v; $$('[data-act="onb-start"]').forEach((b) => b.setAttribute('aria-pressed', b === a)); Sound.play('tap'); };
