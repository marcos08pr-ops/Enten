/* ============ Parla · utilidades ============ */
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (n) => Math.floor(Math.random() * n);
function shuffle(a, rng) { const r = rng || Math.random; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pick = (a, n, rng) => shuffle(a.slice(), rng).slice(0, n);
const uniq = (a) => Array.from(new Set(a));
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded(seed) { let a = typeof seed === 'number' ? seed : hash(String(seed)); return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* Fechas en hora local: 'AAAA-MM-DD' */
function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function keyDate(k) { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); }
function addDays(k, n) { const d = keyDate(k); d.setDate(d.getDate() + n); return dayKey(d); }
function dayDiff(a, b) { return Math.round((keyDate(b) - keyDate(a)) / 86400000); }
function weekKey(d) {
  d = d ? new Date(d) : new Date();
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return t.getUTCFullYear() + '-W' + String(Math.ceil(((t - y0) / 86400000 + 1) / 7)).padStart(2, '0');
}
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function dowIdx(k) { return (keyDate(k).getDay() + 6) % 7; }
function msToMidnight() { const n = new Date(); const m = new Date(n); m.setHours(24, 0, 0, 0); return m - n; }
function fmtLeft(ms) { const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h ? h + ' h ' + m + ' min' : m + ' min'; }
function fmtDur(s) { s = Math.round(s); const m = Math.floor(s / 60); return m ? m + ':' + String(s % 60).padStart(2, '0') : s + ' s'; }
function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }

/* ---------- avisos breves ---------- */
function toast(msg, ms) {
  const root = $('#toast'); if (!root || !msg) return;
  const t = document.createElement('div'); t.className = 't'; t.textContent = msg; root.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, ms || 2600);
}

/* ---------- sonidos (sintetizados, sin archivos) ---------- */
const Sound = {
  ctx: null, on: true,
  init() { if (this.ctx) return; try { const C = window.AudioContext || window.webkitAudioContext; if (C) this.ctx = new C(); } catch (e) { this.ctx = null; } },
  tone(f, t0, dur, type, vol) {
    const c = this.ctx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.14, c.currentTime + t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
  },
  play(kind) {
    if (!this.on) return; this.init(); const c = this.ctx; if (!c) return;
    if (c.state === 'suspended') c.resume();
    if (kind === 'ok') { this.tone(660, 0, 0.12, 'triangle'); this.tone(990, 0.09, 0.2, 'triangle'); }
    else if (kind === 'bad') { this.tone(220, 0, 0.18, 'sawtooth', 0.07); this.tone(180, 0.12, 0.22, 'sawtooth', 0.06); }
    else if (kind === 'tap') { this.tone(520, 0, 0.05, 'sine', 0.05); }
    else if (kind === 'flip') { this.tone(400, 0, 0.06, 'triangle', 0.06); }
    else if (kind === 'win') { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.09, 0.25, 'triangle', 0.12)); }
    else if (kind === 'streak') { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, i * 0.07, 0.3, 'triangle', 0.11)); }
  },
};
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 30); } catch (e) {} }

/* ---------- confeti ---------- */
function confetti(n) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('#confetti'); if (!cv) return;
  const ctx = cv.getContext('2d'); const W = cv.width = innerWidth * devicePixelRatio, H = cv.height = innerHeight * devicePixelRatio;
  const cols = ['#9d7dff', '#c4b1ff', '#ff9a3c', '#ffd166', '#3ccf7e', '#7cc8ff'];
  const ps = Array.from({ length: n || 140 }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 22 * devicePixelRatio, vy: (-Math.random() * 20 - 8) * devicePixelRatio, s: (5 + Math.random() * 7) * devicePixelRatio, c: cols[rand(cols.length)], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 }));
  let f = 0;
  (function step() {
    ctx.clearRect(0, 0, W, H); f++;
    ps.forEach((p) => { p.vy += 0.7 * devicePixelRatio; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
    if (f < 160) requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
  })();
}

/* ---------- iconos (trazo) ---------- */
const IC = {
  path: '<path d="M4 20c4-1 4-5 8-6s4-5 8-6"/><circle cx="4" cy="20" r="1.6"/><circle cx="12" cy="14" r="1.6"/><circle cx="20" cy="8" r="1.6"/>',
  dumbbell: '<path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12"/>',
  game: '<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.5" r=".9"/><circle cx="18" cy="13.5" r=".9"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  speaker: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  turtle: '<path d="M4 15c0-4 3.5-7 8-7s8 3 8 7z"/><path d="M20 13h1.5a1.5 1.5 0 0 0 0-3H19M6 15l-1 3M18 15l1 3M9 8l1.5 7M15 8l-1.5 7M5 12h14"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  send: '<path d="M4 12l16-8-6 16-3-6z"/><path d="M11 14l9-10"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h8"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6h14v-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4h12"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  ear: '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0"/><path d="M10 9a2 2 0 0 1 4 0c0 1.5-2 2-2 4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3 2.2 3.5 5"/>',
};
function ic(name, cls) { return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[name] || '') + '</svg>'; }
function flameSvg(state, cls) {
  // state: 'on' (hoy hecho) | 'off' (pendiente) | 'ice' (protegida)
  const a = state === 'on' ? 'var(--flame-hi)' : state === 'ice' ? '#d6f0ff' : 'var(--flame-off)';
  const b = state === 'on' ? 'var(--flame)' : state === 'ice' ? 'var(--ice)' : 'var(--flame-off)';
  const id = 'fg' + rand(1e6);
  return '<svg class="flame-ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs><path fill="url(#' + id + ')" d="M12 2c1 3.2 4.6 5.3 5.6 8.6 1.4 4.6-1.6 10.4-5.6 10.4S4.6 18 5.4 13.6c.4-2.3 1.9-3.6 2.6-5.6.6 1.4 1.2 2.3 2.3 2.9C10 7.6 10.8 4.6 12 2z"/><path fill="' + (state === 'off' ? 'var(--surface)' : 'rgba(255,255,255,.55)') + '" d="M12 12.5c.9 1.6 2.6 2.4 2.6 4.4 0 1.7-1.2 2.9-2.6 2.9s-2.6-1.1-2.6-2.7c0-1.4.9-2.1 1.5-3.1.3.6.7 1 1.1 1.2z"/></svg>';
}
function gemSvg(cls) { return '<svg class="flame-ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path fill="var(--gem)" d="M7 3h10l4 6-9 12L3 9z"/><path fill="rgba(255,255,255,.35)" d="M7 3l2 6h6l2-6zM3 9h18l-9 12z" opacity=".6"/></svg>'; }
function ringSvg(frac, size) {
  const r = 15.5, c = 2 * Math.PI * r, f = clamp(frac, 0, 1);
  return '<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="' + (size === 'lg' ? 3.4 : 4) + '"/><circle cx="18" cy="18" r="' + r + '" fill="none" stroke="' + (f >= 1 ? 'var(--good)' : 'var(--accent)') + '" stroke-width="' + (size === 'lg' ? 3.4 : 4) + '" stroke-linecap="round" stroke-dasharray="' + (c * f).toFixed(1) + ' ' + c.toFixed(1) + '"/></svg>';
}
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); toast('Copiado'); return true; }
  catch (e) { toast('No se ha podido copiar. Mantén pulsado el texto para copiarlo.'); return false; }
}
