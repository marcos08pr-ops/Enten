/* ============ Parla · almacenamiento ============
   Dentro de Claude (artefacto): base de datos del artefacto, en la carpeta privada de cada persona
   (data/users/<id>/…). Cada persona con la que compartes la app tiene su propio progreso.
   Fuera de Claude, o si la persona solo tiene permiso de lectura: localStorage de este navegador.
   Cada documento se guarda también en local; si una escritura no llega (sin conexión), se reintenta. */
const DOCS = ['profile', 'streak', 'memory', 'stats'];
const Store = {
  mode: 'local', db: null, user: null, uid: null, owner: true, inClaude: false,
  docs: {}, pend: new Map(), fails: 0, P: 'parla1:', warned: false,

  async init() {
    const c = window.claude;
    this.inClaude = !!(c && typeof c.use === 'function');
    if (this.inClaude) {
      try {
        const res = await Promise.all([c.use('db'), c.use('user')]);
        this.user = res[1] || null;
        if (this.user) {
          try { this.uid = await this.user.id(); } catch (e) { this.uid = null; }
          try { this.owner = await this.user.isOwner(); } catch (e) { this.owner = true; }
        }
        if (res[0] && this.uid) { this.db = res[0]; this.mode = 'cloud'; }
      } catch (e) { console.warn('db no disponible', e); }
    }
  },

  lsGet(k) { try { const v = localStorage.getItem(this.P + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  lsSet(k, v) { try { if (v == null) localStorage.removeItem(this.P + k); else localStorage.setItem(this.P + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  mirrorKey(name) { return (this.mode === 'cloud' ? 'c:' + this.uid + ':' : '') + name; },
  ref(name) { return this.db.doc('data/users/' + this.uid + '/' + name); },

  async load(name) {
    if (Object.prototype.hasOwnProperty.call(this.docs, name)) return this.docs[name];
    const mirror = this.lsGet(this.mirrorKey(name));
    let data = null;
    if (this.mode === 'cloud') {
      if (mirror && mirror.dirty) { data = mirror.data; this.save(name, data, 200); }
      else {
        let ok = false;
        for (let i = 0; i < 2 && !ok; i++) {
          try { const s = await this.ref(name).get(); data = s.exists ? clone(s.data()) : null; ok = true; }
          catch (e) { if (e && e.code === 'unavailable' && i === 0) { await sleep(400 + Math.random() * 500); continue; } break; }
        }
        if (!ok) data = mirror ? mirror.data : null;
        else this.lsSet(this.mirrorKey(name), data == null ? null : { data });
      }
    } else data = mirror ? (mirror.data !== undefined ? mirror.data : mirror) : null;
    this.docs[name] = data;
    return data;
  },
  get(name) { return this.docs[name]; },

  save(name, data, delay) {
    this.docs[name] = data;
    const json = JSON.stringify(data);
    if (json.length > 240000) console.warn('Documento grande', name, json.length);
    this.lsSet(this.mirrorKey(name), this.mode === 'cloud' ? { data, dirty: true } : { data });
    if (this.mode !== 'cloud') return;
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
      if (this.docs[name] === data) { this.pend.delete(name); this.lsSet(this.mirrorKey(name), { data }); }
      else { p.busy = false; p.t = setTimeout(() => this.flushOne(name), 200); }
    } catch (e) {
      p.busy = false;
      const code = (e && e.code) || 'unavailable';
      if (code === 'invalid_argument' || code === 'transform_error' || code === 'revoked' || code === 'not_granted') {
        // Sin permiso de escritura (p. ej., compartida como «Lector»): el progreso pasa a este dispositivo.
        this.toLocal();
      } else if (code === 'quota_exceeded') {
        toast('El almacenamiento de la app está lleno. Exporta una copia en Ajustes.');
      } else {
        this.fails++;
        p.t = setTimeout(() => this.flushOne(name), Math.min(30000, 1500 * Math.pow(2, Math.min(this.fails, 4))));
      }
    }
  },
  toLocal() {
    if (this.mode !== 'cloud') return;
    const docs = this.docs; this.mode = 'local'; this.pend.forEach((p) => clearTimeout(p.t)); this.pend.clear();
    Object.keys(docs).forEach((k) => this.lsSet(this.mirrorKey(k), { data: docs[k] }));
    if (!this.warned) { this.warned = true; toast('Tu progreso se guardará en este dispositivo: pide a quien te invitó acceso de «Colaborador» para guardarlo en la nube.', 6000); }
  },
  async flushAll() { await Promise.all(Array.from(this.pend.keys()).map((k) => this.flushOne(k))); },

  /* ---- clasificación con amigos (solo dentro de Claude) ---- */
  async boardWrite(data) {
    if (this.mode !== 'cloud') return;
    try { await this.db.doc('board/' + this.uid).set(data); } catch (e) { /* lectura sola: sin clasificación */ }
  },
  boardWatch(cb) {
    if (this.mode !== 'cloud') { cb(null); return () => {}; }
    try { return this.db.collection('board').onSnapshot((s) => cb(s.docs.filter((d) => d.exists).map((d) => Object.assign({ id: d.id }, d.data()))), () => cb(null)); }
    catch (e) { cb(null); return () => {}; }
  },

  /* ---- copia de seguridad ---- */
  allNames() { return Object.keys(this.docs).filter((k) => this.docs[k] != null); },
  exportAll() { const o = { app: 'parla', v: 1, at: new Date().toISOString(), docs: {} }; this.allNames().forEach((k) => { o.docs[k] = this.docs[k]; }); return o; },
  async importAll(o) {
    if (!o || o.app !== 'parla' || !o.docs) throw new Error('formato');
    Object.keys(o.docs).forEach((k) => this.save(k, o.docs[k], 50));
    await sleep(300); await this.flushAll();
  },
  async wipe() {
    const names = this.allNames();
    for (const k of names) {
      this.docs[k] = null; this.lsSet(this.mirrorKey(k), null);
      if (this.mode === 'cloud') { try { await this.ref(k).delete(); } catch (e) {} }
    }
    if (this.mode === 'cloud') { try { await this.db.doc('board/' + this.uid).delete(); } catch (e) {} }
    try { Object.keys(localStorage).filter((k) => k.indexOf(this.P) === 0).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
  },
};
window.addEventListener('online', () => { Store.fails = 0; Store.pend.forEach((p, k) => { clearTimeout(p.t); p.t = setTimeout(() => Store.flushOne(k), 100); }); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Store.flushAll(); });
window.addEventListener('pagehide', () => { Store.flushAll(); });
