/* ============ Parla · hablar y escuchar ============
   Escuchar: voces del sistema (speechSynthesis). En iPhone, las voces de catalán y alemán se descargan en
   Ajustes → Accesibilidad → Contenido leído → Voces.
   Hablar: reconocimiento de voz del navegador cuando existe (Safari en pestaña, Chrome).
   Si no hay (app de pantalla de inicio en iPhone, artefacto de Claude), se usa el dictado del teclado. */
const LANG_TAGS = { ca: 'ca-ES', de: 'de-DE', en: 'en-GB', fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT', es: 'es-ES' };
const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|eddy|flo\b|grandma|grandpa|reed|rocko|sandy|shelley|junior|ralph|fred|kathy/i;
const Speech = {
  voices: [], rate: 0.95, prefs: {}, micBlocked: false, rec: null, speaking: false,
  init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => { try { this.voices = speechSynthesis.getVoices() || []; } catch (e) { this.voices = []; } };
    load();
    try { speechSynthesis.addEventListener('voiceschanged', load); } catch (e) { speechSynthesis.onvoiceschanged = load; }
  },
  tag(lang) { return LANG_TAGS[lang] || lang; },
  list(lang) {
    const pre = this.tag(lang).slice(0, 2).toLowerCase();
    return this.voices.filter((v) => (v.lang || '').toLowerCase().replace('_', '-').indexOf(pre) === 0);
  },
  score(v, lang) {
    let s = 0; const n = v.name || '';
    if (NOVELTY.test(n)) s -= 50;
    if (/premium|enhanced|mejorada|natural|neural|siri/i.test(n)) s += 20;
    if ((v.lang || '').replace('_', '-').toLowerCase() === this.tag(lang).toLowerCase()) s += 8;
    if (v.localService) s += 3;
    if (/google/i.test(n)) s += 2;
    return s;
  },
  voice(lang) {
    const vs = this.list(lang); if (!vs.length) return null;
    const want = this.prefs[lang];
    if (want) { const v = vs.find((x) => x.voiceURI === want); if (v) return v; }
    return vs.slice().sort((a, b) => this.score(b, lang) - this.score(a, lang))[0];
  },
  hasVoice(lang) { return this.list(lang).length > 0; },
  canSpeak() { return 'speechSynthesis' in window; },
  speak(text, lang, o) {
    o = o || {};
    if (!this.canSpeak() || !text) return Promise.resolve(false);
    return new Promise((res) => {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(String(text));
        u.lang = this.tag(lang);
        const v = this.voice(lang); if (v) u.voice = v;
        u.rate = o.slow ? 0.62 : this.rate;
        u.onend = () => { this.speaking = false; res(true); };
        u.onerror = () => { this.speaking = false; res(false); };
        this.speaking = true;
        speechSynthesis.speak(u);
        setTimeout(() => { if (this.speaking && !speechSynthesis.speaking) { this.speaking = false; res(false); } }, 15000);
      } catch (e) { res(false); }
    });
  },
  stop() { try { speechSynthesis.cancel(); } catch (e) {} },

  SR() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; },
  canListen() { return !!this.SR() && !this.micBlocked; },
  /* Escucha una frase. Devuelve {text, alts} o lanza {code}. */
  listen(lang, o) {
    o = o || {};
    const SR = this.SR();
    if (!SR || this.micBlocked) return Promise.reject({ code: 'unsupported' });
    this.cancelListen();
    return new Promise((res, rej) => {
      let done = false, best = '', alts = [];
      const r = new SR(); this.rec = r;
      r.lang = this.tag(lang); r.interimResults = true; r.continuous = false; r.maxAlternatives = 4;
      const finish = (err) => { if (done) return; done = true; clearTimeout(to); this.rec = null; if (err) rej(err); else if (best) res({ text: best, alts }); else rej({ code: 'no-speech' }); };
      r.onresult = (ev) => {
        let txt = '';
        for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
        best = txt.trim();
        const last = ev.results[ev.results.length - 1];
        alts = []; for (let j = 0; j < last.length; j++) alts.push(last[j].transcript.trim());
        if (o.onInterim) o.onInterim(best);
        if (last.isFinal) { try { r.stop(); } catch (e) {} }
      };
      r.onerror = (ev) => {
        const code = ev.error || 'error';
        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') this.micBlocked = true;
        finish({ code });
      };
      r.onend = () => finish(null);
      const to = setTimeout(() => { try { r.stop(); } catch (e) {} }, o.max || 9000);
      try { r.start(); } catch (e) { finish({ code: 'start' }); }
    });
  },
  cancelListen() { if (this.rec) { try { this.rec.abort(); } catch (e) {} this.rec = null; } },
};
