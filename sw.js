/* Parla · service worker: funciona sin conexión y muestra los avisos push de racha. */
const CACHE = 'parla-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || u.pathname.endsWith('push-config.json')) return;
  // primero la red (para recibir versiones nuevas), la caché si no hay conexión
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
});
function readState() {
  return new Promise((res) => {
    try {
      const rq = indexedDB.open('parla-sw', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
      rq.onsuccess = () => { try { const g = rq.result.transaction('kv').objectStore('kv').get('state'); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null); } catch (e) { res(null); } };
      rq.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}
function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let data = {}; try { data = e.data ? e.data.json() : {}; } catch (x) { data = {}; }
    const st = await readState(); const n = st ? st.streak || 0 : 0;
    let title, body;
    if (data.title) { title = data.title; body = data.body || ''; }
    else if (st && st.day === today() && st.done) { title = '🔥 Racha a salvo: ' + n + (n === 1 ? ' día' : ' días'); body = 'Hoy ya cumpliste. ¡Mañana a por el ' + (n + 1) + '!'; }
    else if (n > 0) { title = '⚠️ Tu racha de ' + n + (n === 1 ? ' día' : ' días') + ' acaba a medianoche'; body = 'Una lección de 3 minutos y la salvas.'; }
    else { title = '🔥 ¿Empezamos una racha?'; body = 'Solo 3 minutos al día. Tu tutor te espera.'; }
    await self.registration.showNotification(title, { body, icon: 'apple-touch-icon.png', tag: 'parla-racha', renotify: true });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => { for (const w of ws) if ('focus' in w) return w.focus(); return self.clients.openWindow('./'); }));
});
