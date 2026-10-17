/* ============ Parla · almacenamiento ============
   Dentro de Claude (artefacto): base de datos del artefacto, en la carpeta privada de cada persona
   (data/users/<id>/…). Solo pueden escribir en ella el propietario y quien tenga permiso para guardar
   (en un plan personal: invitados por correo como «Editor» y con el enlace público desactivado).
   Quien entra con el enlace público tiene acceso de lectura: su progreso queda en este navegador.
   En Safari (iPhone) el almacenamiento de las páginas incrustadas se borra al cerrar Safari, así que
   esas personas pueden guardar y recuperar su progreso con un código (Ajustes → Tus datos).
   Cada documento lleva su hora de guardado (_t): al cargar se usa siempre la copia más reciente. */
const DOCS = ['profile', 'streak', 'memory', 'stats'];
const Store = {
  mode: 'local', db: null, user: null, uid: null, owner: true, inClaude: false, readOnly: false, canWrite: null,
  docs: {}, pend: new Map(), fails: 0, P: 'parla1:', loadFailed: new Set(), changedSinceBackup: false,

  async init() {
    const c = window.claude;
    this.inClaude = !!(c && typeof c.use === 'function');
    if (!this.inClaude) return;
    try {
      const res = await Promise.all([c.use('db'), c.use('user')]);
      this.db = res[0] || null; this.user = res[1] || null;
      if (this.user) {
        try { this.uid = await this.user.id(); } catch (e) { this.uid = null; }
        try { this.owner = await this.user.isOwner(); } catch (e) { this.owner = true; }
        try { this.canWrite = await this.user.can('data.write'); } catch (e) { this.canWrite = null; }
      }
      if (this.db && this.uid) {
        // false = la plataforma ya dice que no puede escribir (p. ej., entra por el enlace público)
        if (this.canWrite === false || (this.canWrite !== true && !this.owner && Date.now() - (+this.lsGet('ro:' + this.uid) || 0) < 3 * 864e5)) this.readOnly = true;
        else this.mode = 'cloud';
      } else if (this.inClaude) this.readOnly = true;
    } catch (e) { console.warn('db no disponible', e); this.readOnly = true; }
  },
  /* En Safari/iOS, lo que guarda una página incrustada (como un artefacto) se borra al cerrar el navegador. */
  ephemeral() { return this.inClaude && this.mode !== 'cloud' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (/Safari\//.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Firefox|Android/.test(navigator.userAgent))); },

  lsGet(k) { try { const v = localStorage.getItem(this.P + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  lsSet(k, v) { try { if (v == null) localStorage.removeItem(this.P + k); else localStorage.setItem(this.P + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  cloudKey(name) { return 'c:' + this.uid + ':' + name; },
  localKey(name) { return (this.uid ? 'u:' + this.uid + ':' : '') + name; },
  ref(name) { return this.db.doc('data/users/' + this.uid + '/' + name); },
  /* Copias locales posibles (incluidas las de versiones anteriores de la app), de la más fiable a la menos. */
  localCandidates(name) {
    const keys = uniq([this.localKey(name), name].concat(this.uid ? [this.cloudKey(name)] : []));
    return keys.map((k, i) => { const v = this.lsGet(k); if (!v) return null; const data = v.data !== undefined ? v.data : v; return data ? { data, t: (data && data._t) || 0, rank: i, dirty: !!v.dirty, mirror: k === this.cloudKey(name) } : null; }).filter(Boolean);
  },
  newest(list) { return list.slice().sort((a, b) => (b.t - a.t) || (a.rank - b.rank))[0] || null; },

  async load(name) {
    if (Object.prototype.hasOwnProperty.call(this.docs, name)) return this.docs[name];
    const local = this.newest(this.localCandidates(name));
    let data = null;
    if (this.mode === 'cloud') {
      let ok = false, cloud = null;
      for (let i = 0; i < 3 && !ok; i++) {
        try { const s = await this.ref(name).get(); cloud = s.exists ? clone(s.data()) : null; ok = true; }
        catch (e) { if (e && (e.code === 'unavailable' || e.code === 'resource_exhausted')) { await sleep(500 + Math.random() * 700 * (i + 1)); continue; } break; }
      }
      // sin respuesta de la nube solo vale una copia local con cambios sin subir; si no, mejor reintentar que pisar la nube con datos viejos
      if (!ok) { if (!local || !local.dirty) this.loadFailed.add(name); data = local && local.dirty ? local.data : null; }
      // una copia local gana si tiene cambios sin subir o viene de antes de usar la nube; una copia limpia de la nube nunca resucita lo borrado
      else if (local && (local.dirty || !local.mirror) && (!cloud ? (local.dirty || local.t) : (local.dirty && !local.t) || local.t > (cloud._t || 0))) { data = local.data; this.save(name, data, 300); }
      else { data = cloud; if (cloud) this.lsSet(this.cloudKey(name), { data: cloud }); }
    } else data = local ? local.data : null;
    this.docs[name] = data;
    return data;
  },
  get(name) { return this.docs[name]; },

  save(name, data, delay) {
    if (data && typeof data === 'object') data._t = Date.now();
    this.docs[name] = data; this.changedSinceBackup = true;
    if (this.mode === 'cloud' && this.loadFailed.has(name)) return; // no se pudo leer: no se escribe encima
    const json = JSON.stringify(data);
    if (json && json.length > 240000) console.warn('Documento grande', name, json.length);
    if (this.mode !== 'cloud') { this.lsSet(this.localKey(name), { data }); return; }
    this.lsSet(this.cloudKey(name), { data, dirty: true });
    const p = this.pend.get(name) || {};
    clearTimeout(p.t);
    p.t = setTimeout(() => this.flushOne(name), delay == null ? 600 : delay);
    this.pend.set(name, p);
  },

  async flushOne(name) {
    const p = this.pend.get(name); if (!p || p.busy) return;
    clearTimeout(p.t); p.busy = true;
    const data = this.docs[name];
    try {
      await this.ref(name).set(data == null ? {} : data);
      this.fails = 0;
      if (this.docs[name] === data) { this.pend.delete(name); this.lsSet(this.cloudKey(name), { data }); }
      else { p.busy = false; p.t = setTimeout(() => this.flushOne(name), 200); }
    } catch (e) {
      p.busy = false;
      const code = (e && e.code) || 'unavailable';
      if (code === 'invalid_argument' || code === 'transform_error' || code === 'revoked' || code === 'not_granted') this.toLocal();
      else if (code === 'quota_exceeded') toast('El almacenamiento de la app está lleno. Exporta una copia en Ajustes.');
      else { this.fails++; p.t = setTimeout(() => this.flushOne(name), Math.min(30000, 1500 * Math.pow(2, Math.min(this.fails, 4)))); }
    }
  },
  /* Sin permiso de escritura: el progreso pasa a este navegador y no vuelve a intentarse la nube. */
  toLocal() {
    if (this.mode !== 'cloud') return;
    this.mode = 'local'; this.readOnly = true; this.pend.forEach((p) => clearTimeout(p.t)); this.pend.clear();
    if (this.uid) this.lsSet('ro:' + this.uid, Date.now());
    Object.keys(this.docs).forEach((k) => { if (this.docs[k] != null) this.lsSet(this.localKey(k), { data: this.docs[k] }); this.lsSet(this.cloudKey(k), null); });
    if (typeof onReadOnly === 'function') onReadOnly();
  },
  async flushAll() { await Promise.all(Array.from(this.pend.keys()).map((k) => this.flushOne(k))); },

  /* ---- clasificación con amigos (solo dentro de Claude; leer también en solo lectura) ---- */
  async boardWrite(data) {
    if (this.mode !== 'cloud') return;
    try { await this.db.doc('board/' + this.uid).set(data); } catch (e) { /* sin permiso: sin clasificación */ }
  },
  boardWatch(cb) {
    if (!this.db) { cb(null); return () => {}; }
    try { return this.db.collection('board').onSnapshot((s) => cb(s.docs.filter((d) => d.exists).map((d) => Object.assign({ id: d.id }, d.data()))), () => cb(null)); }
    catch (e) { cb(null); return () => {}; }
  },

  /* ---- copia de seguridad (archivo y código de progreso) ---- */
  allNames() { return Object.keys(this.docs).filter((k) => this.docs[k] != null); },
  exportAll(noChat) { const o = { app: 'parla', v: 1, at: new Date().toISOString(), docs: {} }; this.allNames().filter((k) => !(noChat && k.indexOf('chat_') === 0)).forEach((k) => { o.docs[k] = this.docs[k]; }); return o; },
  async importAll(o) {
    if (!o || o.app !== 'parla' || !o.docs) throw new Error('formato');
    Object.keys(o.docs).forEach((k) => this.save(k, o.docs[k], 50));
    this.changedSinceBackup = false;
    await sleep(300); await this.flushAll();
  },
  async packCode() {
    const json = JSON.stringify(this.exportAll(true));
    let bytes = new TextEncoder().encode(json), tag = 'PARLA1.';
    try {
      if (typeof CompressionStream === 'function') { bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); tag = 'PARLA2.'; }
    } catch (e) { tag = 'PARLA1.'; bytes = new TextEncoder().encode(json); }
    let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    this.changedSinceBackup = false;
    return tag + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  async unpackCode(code) {
    const m = /PARLA([12])\.([A-Za-z0-9_-]+)/.exec(String(code || '').replace(/\s+/g, ''));
    if (!m) throw new Error('codigo');
    const b = m[2].replace(/-/g, '+').replace(/_/g, '/'); const raw = atob(b + '==='.slice((b.length + 3) % 4));
    let bytes = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    if (m[1] === '2') bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    return JSON.parse(new TextDecoder().decode(bytes));
  },
  async wipe() {
    const names = this.allNames();
    for (const k of names) {
      this.docs[k] = null;
      if (this.mode === 'cloud') { try { await this.ref(k).delete(); } catch (e) {} }
    }
    if (this.mode === 'cloud') { try { await this.db.doc('board/' + this.uid).delete(); } catch (e) {} }
    try { Object.keys(localStorage).filter((k) => k.indexOf(this.P) === 0 && k !== this.P + 'theme' && k !== this.P + 'apiKey').forEach((k) => localStorage.removeItem(k)); } catch (e) {}
  },
};
window.addEventListener('online', () => { Store.fails = 0; Store.pend.forEach((p, k) => { clearTimeout(p.t); p.t = setTimeout(() => Store.flushOne(k), 100); }); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Store.flushAll(); });
window.addEventListener('pagehide', () => { Store.flushAll(); });
