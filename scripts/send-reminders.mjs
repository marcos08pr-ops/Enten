// Envía el aviso diario de racha a cada suscripción de push/subscriptions.json
// cuando en su zona horaria es la hora de su recordatorio. Lo ejecuta .github/workflows/streak-reminders.yml.
// Uso local: VAPID_PRIVATE_KEY=... node scripts/send-reminders.mjs [--all]
import webpush from 'web-push';
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync('push-config.json', 'utf8'));
const subs = JSON.parse(readFileSync('push/subscriptions.json', 'utf8'));
const priv = process.env.VAPID_PRIVATE_KEY;
if (!cfg.vapidPublicKey || !priv) { console.log('Avisos push sin configurar (falta la clave pública o el secreto VAPID_PRIVATE_KEY).'); process.exit(0); }
webpush.setVapidDetails(cfg.contact || 'mailto:parla@example.com', cfg.vapidPublicKey, priv);

const all = process.argv.includes('--all');
const now = new Date();
let sent = 0, failed = 0;
for (const s of subs) {
  const tz = s.tz || 'Europe/Madrid';
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(now));
  const want = Number(String(s.time || '20:30').split(':')[0]);
  if (!all && hour !== want) continue;
  try {
    // el service worker decide el texto según si ya practicaste hoy
    await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ kind: 'reminder' }), { TTL: 4 * 3600, urgency: 'high' });
    sent++; console.log('✓', s.name || s.endpoint.slice(-12));
  } catch (e) {
    failed++; console.log('✗', s.name || s.endpoint.slice(-12), e.statusCode || e.message, e.statusCode === 404 || e.statusCode === 410 ? '(suscripción caducada: bórrala)' : '');
  }
}
console.log(`Enviados: ${sent} · fallidos: ${failed} · suscripciones: ${subs.length}`);
