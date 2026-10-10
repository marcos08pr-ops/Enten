/* ============ Parla · recordatorios para no perder la racha ============
   1) Dentro de la app: aviso de racha en peligro con cuenta atrás hasta medianoche.
   2) Calendario del iPhone: evento diario con alarma (archivo .ics) — funciona sin servidor.
   3) App instalada en la pantalla de inicio (fuera de Claude): número en el icono y notificaciones.
   4) Avisos push reales (opcional): ver README → «Avisos push». */
const APP_LINK = 'https://claude.ai/artifact/VQBQUga27MKw8UtAbrwhGr'; // enlace del artefacto privado de Claude
const Notify = {
  reg: null, cfg: null, timer: 0,
  hosted() { return !Store.inClaude && /^https?:$/.test(location.protocol); },
  standalone() { try { return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; } catch (e) { return false; } },
  link() { return this.hosted() ? location.href.split('#')[0] : APP_LINK; },
  async init() {
    if (this.hosted() && 'serviceWorker' in navigator) {
      try { this.reg = await navigator.serviceWorker.register('sw.js'); } catch (e) { this.reg = null; }
      try { const r = await fetch('push-config.json', { cache: 'no-store' }); if (r.ok) this.cfg = await r.json(); } catch (e) { this.cfg = null; }
    }
    this.schedule(); this.syncState();
  },
  perm() { return 'Notification' in window ? Notification.permission : 'unsupported'; },
  canLocal() { return this.hosted() && 'Notification' in window; },
  async request() { if (!('Notification' in window)) return 'unsupported'; try { return await Notification.requestPermission(); } catch (e) { return 'denied'; } },
  async show(title, body) {
    if (this.perm() !== 'granted') return;
    try { if (this.reg) await this.reg.showNotification(title, { body, icon: 'apple-touch-icon.png', tag: 'parla-racha' }); else new Notification(title, { body }); } catch (e) {}
  },
  /* Si la app está abierta a la hora del recordatorio y aún no has practicado. */
  schedule() {
    clearTimeout(this.timer); const r = P.profile && P.profile.reminder; if (!r || !r.on) return;
    const p = r.time.split(':').map(Number), at = new Date(); at.setHours(p[0], p[1], 0, 0);
    const ms = at - Date.now(); if (ms < 0) return;
    this.timer = setTimeout(() => {
      if (Streak.doneToday()) return;
      const n = Streak.count();
      this.show('🔥 Tu racha te espera', n ? 'Una lección rápida y salvas tus ' + plural(n, 'día', 'días') + '.' : 'Empieza hoy una racha nueva: solo 3 minutos.');
      toast('🔥 Es tu hora de practicar: ¡una lección y racha salvada!', 5000);
      if (typeof render === 'function') render();
    }, Math.min(ms, 2147483000));
  },
  syncState() {
    try { if (navigator.setAppBadge) { if (Streak.doneToday()) navigator.clearAppBadge(); else navigator.setAppBadge(1); } } catch (e) {}
    if (!this.hosted() || !('indexedDB' in window)) return;
    const st = { day: dayKey(), done: Streak.doneToday(), streak: Streak.count(), name: P.profile.name || '', lang: P.profile.active, at: Date.now() };
    try {
      const rq = indexedDB.open('parla-sw', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
      rq.onsuccess = () => { try { const tx = rq.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(st, 'state'); } catch (e) {} };
    } catch (e) {}
  },
  /* Evento diario de calendario con dos alarmas. */
  ics() {
    const r = P.profile.reminder || { time: '20:30' }; const p = r.time.split(':').map(Number);
    const d = new Date(); const pad = (n) => String(n).padStart(2, '0');
    const start = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(p[0]) + pad(p[1]) + '00';
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const late = p[0] * 60 + p[1] <= 21 * 60 + 30;
    const url = this.link();
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Parla//Racha//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:parla-racha-' + Date.now() + '@parla', 'DTSTAMP:' + stamp, 'DTSTART:' + start, 'DURATION:PT10M', 'RRULE:FREQ=DAILY',
      'SUMMARY:🔥 Parla: mantén tu racha', 'DESCRIPTION:Una lección de 3 minutos y tu racha sigue viva.' + (url ? '\\n' + url : ''), url ? 'URL:' + url : '',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:🔥 ¡No pierdas tu racha en Parla!', 'TRIGGER:PT0M', 'END:VALARM',
      late ? 'BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:⏰ Última llamada: tu racha acaba a medianoche\r\nTRIGGER:PT2H\r\nEND:VALARM' : '',
      'END:VEVENT', 'END:VCALENDAR'].filter(Boolean);
    return lines.join('\r\n');
  },
  downloadIcs() {
    try {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([this.ics()], { type: 'text/calendar' }));
      a.download = 'parla-racha.ics'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      return true;
    } catch (e) { return false; }
  },
  /* ---- push con servidor (GitHub Actions) ---- */
  pushReady() { return !!(this.hosted() && this.reg && 'PushManager' in window && this.cfg && this.cfg.vapidPublicKey); },
  async subscribe() {
    const perm = await this.request(); if (perm !== 'granted') throw { code: 'denied' };
    const key = this.cfg.vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(key + '==='.slice((key.length + 3) % 4)); const u8 = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    let sub = await this.reg.pushManager.getSubscription();
    if (!sub) sub = await this.reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8 });
    const j = sub.toJSON();
    return { name: P.profile.name || '', endpoint: j.endpoint, keys: j.keys, time: (P.profile.reminder || {}).time || '20:30', tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid' };
  },
  async genKeys() {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
    const b = (s) => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const dec = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); const r = atob(s + '==='.slice((s.length + 3) % 4)); return Array.from(r, (c) => c.charCodeAt(0)); };
    const pub = [4].concat(dec(jwk.x), dec(jwk.y));
    return { publicKey: b(btoa(String.fromCharCode.apply(null, pub))), privateKey: b(jwk.d) };
  },
};
