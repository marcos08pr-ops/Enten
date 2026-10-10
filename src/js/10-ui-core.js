/* ============ Parla · interfaz: estructura, navegación y hojas ============ */
const App = { tab: 'learn', booted: false, unsub: null };
const TABS = [
  { id: 'learn', label: 'Aprender', icon: 'path' },
  { id: 'practice', label: 'Practicar', icon: 'dumbbell' },
  { id: 'games', label: 'Juegos', icon: 'game' },
  { id: 'chat', label: 'Charla', icon: 'chat' },
  { id: 'me', label: 'Perfil', icon: 'user' },
];
const ACT = {}; // acciones por data-act

function applyTheme() {
  const t = (P.profile && P.profile.theme) || 'dark';
  document.documentElement.setAttribute('data-app-theme', t);
  try { localStorage.setItem('parla1:theme', t); } catch (e) {}
  const dark = t === 'dark' || (t === 'auto' && !(document.documentElement.getAttribute('data-theme') === 'light' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: light)').matches)));
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#09070f' : '#f6f4fb');
}

function render() {
  if (!App.booted) return;
  renderTop(); renderTabbar();
  const v = $('#view'); const tab = App.tab;
  if (tab !== 'chat') hideComposer();
  if (tab === 'learn') renderLearn(v);
  else if (tab === 'practice') renderPractice(v);
  else if (tab === 'games') renderGames(v);
  else if (tab === 'chat') renderChat(v);
  else if (tab === 'me') renderMe(v);
}
function go(tab) { if (App.tab === tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; } App.tab = tab; render(); window.scrollTo(0, 0); }

function renderTop() {
  const pr = P.profile, s = P.streak, lang = pr.active, n = Streak.count(), today = Streak.todayXP(), goal = pr.goal || 20;
  $('#top').innerHTML =
    '<button class="flagbtn" data-act="langs" aria-label="Cambiar de idioma: ' + esc(LANGS[lang].name) + '">' + flag(lang) + '<span class="small" style="font-weight:700">' + esc(LANGS[lang].name) + '</span></button>' +
    '<span class="sp"></span>' +
    '<button class="pill" data-act="streak" aria-label="Racha de ' + n + ' días" style="color:' + (Streak.doneToday() ? 'var(--flame)' : 'var(--fg-3)') + '">' + flameSvg(Streak.state()) + n + '</button>' +
    '<button class="pill" data-act="shop" aria-label="' + s.gems + ' gemas" style="color:var(--gem)">' + gemSvg() + s.gems + '</button>' +
    '<button class="ring" data-act="goal" aria-label="Meta diaria: ' + today + ' de ' + goal + ' XP">' + ringSvg(today / goal) + '<span class="t">' + Math.min(99, Math.round((100 * today) / goal)) + '%</span></button>' +
    '<button class="icon-btn" data-act="settings" aria-label="Ajustes">' + ic('gear') + '</button>';
}
function renderTabbar() {
  const dot = !Streak.doneToday();
  $('#tabbar').innerHTML = '<div class="tabbar-in">' + TABS.map((t) =>
    '<button class="tab" data-act="tab" data-tab="' + t.id + '"' + (App.tab === t.id ? ' aria-current="page"' : '') + '>' + ic(t.icon) + '<span>' + t.label + '</span>' + (t.id === 'learn' && dot ? '<i class="dot" aria-hidden="true"></i>' : '') + '</button>').join('') + '</div>';
}

/* ---------- hojas inferiores y capas ---------- */
function openSheet(html, mount) {
  closeSheet(true);
  const root = $('#sheet-root');
  root.innerHTML = '<div class="sheet-back" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div class="sheet-in">' + html + '</div></div>';
  document.body.classList.add('noscroll');
  if (mount) mount($('.sheet-in', root));
}
function closeSheet(quiet) { const r = $('#sheet-root'); if (r) r.innerHTML = ''; if (!$('#overlay').innerHTML) document.body.classList.remove('noscroll'); if (!quiet && App.afterSheet) { const f = App.afterSheet; App.afterSheet = null; f(); } }
function openOverlay(html) {
  $('#overlay').innerHTML = '<div class="overlay"><div class="overlay-in">' + html + '</div></div>';
  document.body.classList.add('noscroll'); hideComposer();
  return $('#overlay .overlay-in');
}
function closeOverlay() { Speech.stop(); Speech.cancelListen(); $('#overlay').innerHTML = ''; document.body.classList.remove('noscroll'); render(); }
function confirmBox(o) {
  return new Promise((res) => {
    openSheet('<h2>' + esc(o.title) + '</h2>' + (o.text ? '<p class="fg2">' + esc(o.text) + '</p>' : '') +
      '<div class="stack"><button class="btn block ' + (o.danger ? 'bad' : '') + '" id="cf-ok">' + esc(o.ok || 'Aceptar') + '</button><button class="btn ghost block" id="cf-no">' + esc(o.cancel || 'Cancelar') + '</button></div>', (el) => {
      $('#cf-ok', el).onclick = () => { closeSheet(true); res(true); };
      $('#cf-no', el).onclick = () => { closeSheet(true); res(false); };
    });
  });
}

/* ---------- delegación de eventos ---------- */
document.addEventListener('click', (ev) => {
  const a = ev.target.closest('[data-act]'); if (!a) return;
  const f = ACT[a.dataset.act]; if (!f) return;
  Sound.init();
  f(a, ev);
});
ACT.tab = (a) => go(a.dataset.tab);
ACT['sheet-close'] = () => closeSheet();
ACT.say = (a) => Speech.speak(a.dataset.text, a.dataset.lang || P.profile.active, { slow: a.dataset.slow === '1' });

/* ---------- idioma ---------- */
ACT.langs = () => {
  const pr = P.profile;
  const row = (l) => { const L = LANGS[l], on = l === pr.active, started = !!pr.langs[l];
    return '<button class="lang-card" data-act="pick-lang" data-lang="' + l + '" aria-pressed="' + on + '">' + flag(l, 'lg') + '<div class="grow"><div class="nm">' + esc(L.name) + '</div><div class="small muted">' + (L.ai ? 'Curso generado por tu tutor IA' : 'Curso completo · A1 → B1') + (started ? ' · empezado' : '') + '</div></div>' + (L.ai ? '<span class="tag">IA</span>' : '') + '</button>'; };
  openSheet('<h2>¿Qué quieres practicar?</h2><div class="stack tight">' + ['ca', 'de'].map(row).join('') + '</div><p class="eyebrow mt">Más idiomas con el tutor IA</p><div class="stack tight">' + ['en', 'fr', 'it', 'pt'].map(row).join('') + '</div>');
};
ACT['pick-lang'] = async (a) => {
  const l = a.dataset.lang, pr = P.profile;
  if (LANGS[l].ai && !AI.ok()) { toast(AI.msg({ code: 'no_ai' }), 4500); return; }
  await P.loadCourse(l);
  if (!pr.langs[l]) pr.langs[l] = { started: dayKey() };
  pr.active = l; P.save('profile'); closeSheet(); App.tab = 'learn'; App.scrolled = false; render(); Board.sync();
  toast(flagText(l) + ' Ahora practicas ' + LANGS[l].es);
};
function flagText(l) { return { ca: '🟨🟥', de: '🇩🇪', en: '🇬🇧', fr: '🇫🇷', it: '🇮🇹', pt: '🇵🇹' }[l] || ''; }

/* ---------- racha ---------- */
ACT.streak = () => {
  const s = P.streak, n = Streak.count(), done = Streak.doneToday(), today = dayKey();
  const wk = []; const mon = addDays(today, -dowIdx(today));
  for (let i = 0; i < 7; i++) { const k = addDays(mon, i); const on = (s.days[k] || 0) >= DAY_MIN, ice = !!s.frozen[k];
    wk.push('<div class="d"><span>' + DOW[i] + '</span><span class="b ' + (on ? 'on' : ice ? 'ice' : '') + (k === today ? ' today' : '') + '">' + (on ? flameSvg('on') : ice ? '🧊' : '') + '</span></div>'); }
  const nextMs = MILESTONES.find((m) => m > n) || n + 100;
  openSheet(
    '<div class="streak-hero">' + flameSvg(done ? 'on' : 'off', 'xl') + '<div><div class="streak-num">' + n + '</div><div class="fg2" style="font-weight:650">' + (n === 1 ? 'día de racha' : 'días de racha') + '</div></div></div>' +
    '<p class="fg2">' + (done ? '¡Hoy ya está! Vuelve mañana para llegar a ' + (n + 1) + '.' : n ? 'Te quedan <b>' + fmtLeft(msToMidnight()) + '</b> para hacer una lección y no perderla.' : 'Haz una lección hoy para empezar tu racha.') + '</p>' +
    '<div class="card flat"><div class="week">' + wk.join('') + '</div></div>' +
    (s.repair ? '<div class="card warn"><h3>🚑 Recupera tu racha de ' + s.repair.lost + ' días</h3><p class="fg2 small">Haz ' + s.repair.need + ' lecciones hoy (llevas ' + s.repair.done + ') y la recuperas, como en el evento de Duolingo.</p><div class="bar flame mt"><i style="width:' + (100 * s.repair.done / s.repair.need) + '%"></i></div></div>' : '') +
    '<div class="row"><div class="grow"><b>Próximo hito: ' + nextMs + ' días</b><div class="bar flame mt"><i style="width:' + Math.min(100, 100 * n / nextMs) + '%"></i></div></div></div>' +
    '<div class="card"><div class="row"><span style="font-size:26px">🧊</span><div class="grow"><b>Protectores de racha: ' + s.freezes + ' / ' + MAX_FREEZES + '</b><div class="small muted">Si un día no practicas, se gasta uno solo y tu racha sigue.</div></div></div><button class="btn sm ghost block mt" data-act="buy-freeze">Comprar uno · ' + FREEZE_COST + ' 💎</button></div>' +
    '<button class="btn block" data-act="reminders">' + ic('bell') + ' Recordatorios</button>' +
    '<p class="small muted center">Mejor racha: ' + plural(Math.max(s.best || 0, n), 'día', 'días') + '</p>');
};
ACT['buy-freeze'] = () => { const r = Shop.buyFreeze(); toast(r === 'ok' ? '🧊 Protector equipado' : r === 'max' ? 'Ya tienes el máximo de protectores' : 'Te faltan gemas: gana más con lecciones y misiones'); if (r === 'ok') { renderTop(); ACT.streak(); } };
ACT['buy-boost'] = () => { const r = Shop.buyBoost(); toast(r === 'ok' ? '⚡ XP doble activado durante 15 minutos' : 'Te faltan gemas'); if (r === 'ok') { renderTop(); closeSheet(); } };
ACT.shop = () => {
  const s = P.streak, boost = s.boost && Date.now() < s.boost;
  openSheet('<h2>' + gemSvg() + ' ' + s.gems + ' gemas</h2><p class="fg2 small">Las ganas con lecciones (+5, +10 si es perfecta), misiones e hitos de racha.</p>' +
    '<div class="card"><div class="row"><span style="font-size:28px">🧊</span><div class="grow"><b>Protector de racha</b><div class="small muted">Tienes ' + s.freezes + ' de ' + MAX_FREEZES + '</div></div><button class="btn sm" data-act="buy-freeze">' + FREEZE_COST + ' 💎</button></div></div>' +
    '<div class="card"><div class="row"><span style="font-size:28px">⚡</span><div class="grow"><b>XP doble · 15 min</b><div class="small muted">' + (boost ? 'Activo: quedan ' + Math.ceil((s.boost - Date.now()) / 60000) + ' min' : 'Perfecto para remontar en la liga') + '</div></div><button class="btn sm" data-act="buy-boost">' + BOOST_COST + ' 💎</button></div></div>');
};
ACT.goal = () => {
  const pr = P.profile, t = Streak.todayXP(), g = pr.goal || 20;
  openSheet('<div class="row"><div class="ring lg">' + ringSvg(t / g, 'lg') + '<span class="t">' + t + '</span></div><div><h2>Meta diaria</h2><p class="fg2">' + t + ' de ' + g + ' XP hoy</p></div></div>' +
    '<div class="stack tight">' + Quests.ensure().map(questRow).join('') + '</div>' +
    '<p class="eyebrow">Cambiar meta</p><div class="seg">' + [[10, 'Casual'], [20, 'Normal'], [30, 'Serio'], [50, 'Intenso']].map((x) => '<button data-act="set-goal" data-v="' + x[0] + '" aria-pressed="' + (g === x[0]) + '">' + x[1] + '<br><span class="small muted">' + x[0] + ' XP</span></button>').join('') + '</div>');
};
ACT['set-goal'] = (a) => { P.profile.goal = +a.dataset.v; P.save('profile'); ACT.goal(); renderTop(); };
function questRow(x) {
  const q = Quests.def(x.id); if (!q) return '';
  return '<div class="quest"><span class="em">' + q.em + '</span><div class="grow"><div style="font-weight:650">' + esc(q.t(x.goal)) + '</div><div class="bar ' + (x.claimed ? 'good' : '') + '" style="margin-top:6px;height:9px"><i style="width:' + (100 * Math.min(1, x.prog / x.goal)) + '%"></i></div></div><span class="small ' + (x.claimed ? '' : 'muted') + '" style="font-weight:700">' + (x.claimed ? '✓' : x.prog + '/' + x.goal) + '</span></div>';
}

/* ---------- celebraciones ---------- */
function celebrate(r) {
  if (!r) return;
  if (r.repaired) { Sound.play('streak'); confetti(160); toast('🚑 ¡Racha de ' + r.repaired + ' días recuperada!', 4000); }
  if (r.milestone) { Sound.play('streak'); confetti(220); }
}
