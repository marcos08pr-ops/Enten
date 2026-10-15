/* ============ Parla · progreso de quien entra sin permiso para guardar ============
   Quien abre Parla con el enlace público (y no pertenece a la cuenta del propietario) no puede escribir
   en la base de datos del artefacto. Su progreso se guarda en el navegador, pero en iPhone Safari lo
   borra al cerrarse. Para no empezar de cero: código de progreso (copiar/pegar) o archivo de copia. */
function guestMode() { return Store.inClaude && Store.mode !== 'cloud'; }
function onReadOnly() { if (App.booted) render(); }
function guestBanner() {
  if (!guestMode()) return '';
  const eph = Store.ephemeral();
  if (!Store.changedSinceBackup && App.guestSaved) return '<div class="card flat small fg2">💾 Progreso guardado en tu código. Si cierras Safari, recupéralo con «Recuperar progreso».</div>';
  return '<div class="card warn"><h3>💾 Guarda tu progreso</h3><p class="small fg2" style="margin-top:4px">' +
    (eph ? 'Entras con el enlace público: Claude no deja guardar tu progreso en la nube y Safari lo borra al cerrarse. ' : 'Entras con el enlace público: tu progreso solo se guarda en este navegador. ') +
    'Copia tu código de progreso antes de salir (por ejemplo, en Notas) y recupéralo la próxima vez.</p>' +
    '<div class="row wrap mt"><button class="btn sm" data-act="progress-save">Copiar mi código</button><button class="btn sm ghost" data-act="progress-restore">Recuperar progreso</button></div>' +
    '<button class="btn text" style="padding:0;min-height:32px" data-act="progress-why">¿Cómo lo guardo siempre?</button></div>';
}
ACT['progress-save'] = async () => {
  let code = '';
  try { code = await Store.packCode(); } catch (e) { toast('No se ha podido crear el código.'); return; }
  App.guestCode = code; App.guestSaved = true;
  const copied = await copyText(code);
  openSheet('<h2>💾 Tu código de progreso</h2><p class="fg2">' + (copied ? 'Ya está copiado. ' : '') + 'Pégalo en Notas o mándatelo por WhatsApp. La próxima vez, en «Recuperar progreso», pégalo y seguirás donde lo dejaste: racha, curso, memoria del tutor…</p>' +
    '<textarea class="input small" readonly rows="4" id="code-out">' + esc(code) + '</textarea>' +
    '<button class="btn block" data-act="progress-copy">Copiar otra vez</button>' +
    '<button class="btn ghost block" data-act="export">Guardar como archivo</button>' +
    '<p class="small muted">Código de ' + Math.round(code.length / 1024) + ' KB. Cada vez que avances, guarda uno nuevo.</p>');
  if (App.tab === 'learn') render();
};
ACT['progress-copy'] = () => copyText(App.guestCode || '');
ACT['progress-restore'] = () => {
  openSheet('<h2>Recuperar progreso</h2><p class="fg2">Pega tu código de progreso (empieza por «PARLA») o elige el archivo de copia.</p>' +
    '<textarea class="input small" rows="5" id="code-in" placeholder="PARLA2.…" autocomplete="off" spellcheck="false"></textarea>' +
    '<button class="btn block" data-act="progress-apply">Recuperar</button>' +
    '<label class="btn ghost block" for="code-file" style="cursor:pointer">Elegir archivo de copia</label><input type="file" id="code-file" accept="application/json,.json" hidden>', (el) => {
    const f = $('#code-file', el); f.onchange = () => importFile(f.files[0]);
  });
};
ACT['progress-apply'] = async () => {
  const v = ($('#code-in') || {}).value || '';
  try {
    const o = await Store.unpackCode(v);
    if (!o || o.app !== 'parla') throw new Error('formato');
    await Store.importAll(o);
    toast('Progreso recuperado ✨'); setTimeout(() => location.reload(), 500);
  } catch (e) { toast('Ese código no es válido. Cópialo entero, desde «PARLA» hasta el final.', 4500); }
};
ACT['progress-why'] = () => {
  openSheet('<h2>¿Por qué no se guarda solo?</h2><p class="fg2">Parla es un artefacto privado de Claude. Solo pueden guardar en la nube quien lo creó y las personas que invita por correo con permiso <b>Editor</b> mientras el enlace público está desactivado.</p>' +
    '<div class="card flat small fg2"><b>Para guardar siempre:</b> pide a quien te pasó Parla que, en el botón <b>Compartir</b> del artefacto, desactive el enlace público y te invite con tu correo como <b>Editor</b>. Después entra con tu cuenta de Claude: tu progreso, tu racha y la liga de amigos se guardarán solos.</div>' +
    '<div class="card flat small fg2"><b>Mientras tanto:</b> antes de cerrar, toca «Copiar mi código» y guárdalo. Al volver, «Recuperar progreso».</div>');
};
