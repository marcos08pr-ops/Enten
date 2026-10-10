/* ============ Parla · arranque ============ */
async function boot() {
  $('#view').innerHTML = '<div class="onb center" style="padding-top:22vh"><div class="logo">Parla</div><p class="muted">Cargando tu progreso…</p></div>';
  Speech.init();
  await Promise.all([Store.init(), AI.init()]);
  await Promise.all(DOCS.map((n) => Store.load(n)));
  if (!Store.get('profile')) Store.save('profile', defaultProfile());
  if (!Store.get('streak')) Store.save('streak', defaultStreak());
  if (!Store.get('stats')) Store.save('stats', defaultStats());
  if (!Store.get('memory')) Store.save('memory', defaultMemory());
  const pr = P.profile;
  // campos nuevos en perfiles antiguos
  const d = defaultProfile(); Object.keys(d).forEach((k) => { if (pr[k] === undefined) pr[k] = d[k]; });
  if (!LANGS[pr.active]) pr.active = 'ca';
  if (!pr.name && Store.user) { try { const n = await Store.user.name(); if (n) Onb.prefill = n.split(' ')[0]; } catch (e) {} }
  applyTheme(); Sound.on = pr.sound !== false; Speech.rate = pr.rate || 0.95; Speech.prefs = pr.voices || {};
  await Promise.all(uniq([pr.active].concat(Object.keys(pr.langs || {}))).map((l) => P.loadCourse(l)));
  App.events = Streak.reconcile();
  Quests.ensure();
  App.booted = true; App.day = dayKey();
  render();
  Notify.init();
  if (!pr.onboarded) { Onb.start(); if (Onb.prefill) Onb.st.name = Onb.prefill; }
  else if (App.events.some((e) => e.type === 'frozen')) Sound.play('ok');
}
// cambio de día con la app abierta y vuelta a primer plano
setInterval(() => { if (App.booted && App.day !== dayKey()) { App.day = dayKey(); App.events = Streak.reconcile(); Quests.ensure(); render(); } }, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && App.booted) { if (App.day !== dayKey()) { App.day = dayKey(); App.events = Streak.reconcile(); Quests.ensure(); } if (!$('#overlay').innerHTML) render(); else { renderTop(); } Notify.syncState(); } });
try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applyTheme()); } catch (e) {}
boot().catch((e) => { console.error(e); $('#view').innerHTML = '<div class="card"><h3>No se ha podido arrancar Parla</h3><p class="small fg2">' + esc(e && e.message) + '</p><button class="btn mt" onclick="location.reload()">Reintentar</button></div>'; });
