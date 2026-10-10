/* ============ Parla · IA ============
   Dentro de Claude: capacidad «sample» con la cuenta de Claude de quien usa la app (sin clave).
   Fuera de Claude (p. ej. GitHub Pages): API de Anthropic con tu propia clave, guardada solo en este navegador.
   El SDK oficial se carga bajo demanda desde jsDelivr (igual que Enten). */
const API_KEY_LS = 'parla1:apiKey';
const API_MODEL = 'claude-opus-5-5';
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.132.1/+esm';
const AI = {
  fn: null, state: 'none', mode: null, sdk: null, client: null,
  inClaude() { return !!(window.claude && typeof window.claude.use === 'function'); },
  getKey() { try { return localStorage.getItem(API_KEY_LS) || ''; } catch (e) { return ''; } },
  setKey(k) {
    try { if (k) localStorage.setItem(API_KEY_LS, k); else localStorage.removeItem(API_KEY_LS); } catch (e) { return false; }
    this.client = null; this.initApi(); return true;
  },
  initApi() {
    if (this.mode === 'claude') return;
    if (this.getKey()) { this.mode = 'api'; this.state = 'ready'; } else { this.mode = null; this.state = 'none'; }
  },
  async init() {
    try { if (this.inClaude()) this.fn = await window.claude.use('sample'); } catch (e) { this.fn = null; }
    if (this.fn) { this.mode = 'claude'; this.state = 'ready'; return; }
    if (!this.inClaude()) this.initApi();
  },
  ok() { return this.state === 'ready'; },

  /* Une las instrucciones con la conversación. «sample» no tiene rol de sistema:
     las instrucciones van delante del primer mensaje del usuario. */
  turns(system, messages) {
    const ms = (typeof messages === 'string' ? [{ role: 'user', content: messages }] : messages).map((m) => ({ role: m.role, content: m.content }));
    while (ms.length && ms[0].role !== 'user') ms.shift();
    if (!ms.length) ms.push({ role: 'user', content: '(Empieza tú.)' });
    // fusiona turnos seguidos del mismo rol
    const out = [];
    ms.forEach((m) => { const l = out[out.length - 1]; if (l && l.role === m.role) l.content += '\n\n' + m.content; else out.push(m); });
    if (out[out.length - 1].role !== 'user') out.push({ role: 'user', content: '(Sigue.)' });
    return out;
  },

  /* Texto con streaming. o: {system, messages, onText, signal, tier} */
  async text(o) {
    const turns = this.turns(o.system, o.messages);
    if (this.mode === 'claude') {
      const input = turns.map((m, i) => (i === 0 && o.system ? { role: m.role, content: '<instrucciones>\n' + o.system + '\n</instrucciones>\n\n' + m.content } : m));
      const r = await this.fn(input, { onText: o.onText ? (u) => o.onText(u.text) : undefined, signal: o.signal, cache: false, modelTier: o.tier || 'default' });
      return r.text;
    }
    if (this.mode !== 'api') throw { code: 'no_ai' };
    let text = '';
    try {
      const client = await this.apiClient();
      const stream = client.beta.messages.stream({
        model: API_MODEL,
        max_tokens: 16000,
        system: o.system || undefined,
        output_config: { effort: o.tier === 'complex' ? 'medium' : 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages: turns,
      }, { signal: o.signal });
      stream.on('text', (d, snap) => { text = snap; if (o.onText) o.onText(snap); });
      const fin = await stream.finalMessage();
      if (fin.stop_reason === 'refusal') throw { code: 'refused' };
      const out = fin.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      if (!out.trim()) throw { code: 'empty_completion' };
      return out;
    } catch (e) { throw this.apiErr(e); }
  },

  /* Respuesta en JSON. o: {system, prompt, tier} */
  async json(o) {
    const fmt = '\n\nResponde únicamente con un objeto JSON válido, sin texto antes ni después y sin bloques de código.';
    if (this.mode === 'claude') {
      const input = (o.system ? '<instrucciones>\n' + o.system + '\n</instrucciones>\n\n' : '') + o.prompt + fmt;
      return await this.fn.json(input, { modelTier: o.tier || 'default' });
    }
    if (this.mode !== 'api') throw { code: 'no_ai' };
    let res;
    try {
      const client = await this.apiClient();
      res = await client.beta.messages.create({
        model: API_MODEL,
        max_tokens: 16000,
        system: o.system || undefined,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages: [{ role: 'user', content: o.prompt + fmt }],
      });
    } catch (e) { throw this.apiErr(e); }
    if (res.stop_reason === 'refusal') throw { code: 'refused' };
    const t = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a < 0 || b <= a) throw { code: 'invalid_json' };
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { throw { code: 'invalid_json' }; }
  },

  async apiClient() {
    if (this.client) return this.client;
    if (!this.sdk) { try { this.sdk = await import(SDK_URL); } catch (e) { throw { code: 'sdk_load' }; } }
    this.client = new this.sdk.default({ apiKey: this.getKey(), dangerouslyAllowBrowser: true });
    return this.client;
  },
  apiErr(e) {
    const S = this.sdk || {};
    if (e && e.code && !(e instanceof Error)) return e;
    if (e && e.name === 'AbortError') return { code: 'cancelled' };
    if (S.APIUserAbortError && e instanceof S.APIUserAbortError) return { code: 'cancelled' };
    if (S.AuthenticationError && e instanceof S.AuthenticationError) return { code: 'bad_key' };
    if (S.PermissionDeniedError && e instanceof S.PermissionDeniedError) return { code: 'denied' };
    if (S.RateLimitError && e instanceof S.RateLimitError) return { code: 'rate_limited' };
    if (S.BadRequestError && e instanceof S.BadRequestError) {
      const m = String((e && e.message) || '');
      if (/credit balance/i.test(m)) return { code: 'no_credit' };
      if (/too long|too large/i.test(m)) return { code: 'prompt_too_large' };
      return { code: 'upstream_error' };
    }
    console.warn('API', e);
    return { code: 'upstream_error' };
  },
  msg(e) {
    const c = (e && e.code) || 'upstream_error';
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].indexOf(c) >= 0) {
      this.state = 'denied';
      if (c === 'not_granted') return 'No has dado permiso a Parla para usar Claude. Recarga y acepta el aviso para activar el tutor.';
      return 'La IA no está disponible en esta cuenta o vista.';
    }
    switch (c) {
      case 'cancelled': return '';
      case 'no_ai': return 'El tutor IA funciona dentro de Claude o, fuera de Claude, con tu clave de API (Ajustes → Tutor IA).';
      case 'rate_limited': return 'Has llegado al límite de uso por ahora. Prueba dentro de un rato.';
      case 'session_expired': return 'Tu sesión de Claude ha caducado. Vuelve a iniciar sesión y recarga.';
      case 'refused': return 'La IA no ha respondido a esto. Reformúlalo.';
      case 'empty_completion': return 'No ha llegado respuesta. Prueba otra vez.';
      case 'invalid_json': return 'La respuesta no tenía el formato esperado. Vuelve a intentarlo.';
      case 'prompt_too_large': return 'Demasiado texto para una sola consulta. Empieza una conversación nueva.';
      case 'bad_key': return 'La clave de API no es válida. Cámbiala en Ajustes → Tutor IA.';
      case 'denied': return 'Anthropic ha rechazado la petición.';
      case 'no_credit': return 'Tu cuenta de la API no tiene saldo. Añade crédito en console.anthropic.com.';
      case 'sdk_load': return 'No se ha podido conectar con Claude. Revisa tu conexión.';
      default: return 'Fallo de conexión con la IA. Inténtalo de nuevo.';
    }
  },
};
