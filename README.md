# Parla

Aprende **catalán** y **alemán** (y, con el tutor IA, inglés, francés, italiano y portugués) un poco cada día: racha diaria, lecciones de 3 minutos, juegos, voz y un tutor con IA que **recuerda tus fallos y tus gustos** y adapta todo a ti.

Hecha a partir de la experiencia de [Enten](https://github.com/marcos08pr-ops/mi-artefacto-app): un único archivo (`index.html`), oscuro con detalles morados (también en claro), que funciona como artefacto privado de Claude o como web propia instalable en el iPhone.

## Qué incluye

| | |
|---|---|
| **Cursos** | Catalán y alemán para hispanohablantes: 24 unidades de A1 a C1 (A1, A2, B1, B2 y C1), 240 palabras y 192 frases por idioma, con guía gramatical en cada unidad (falsos amigos de género, «vaig anar» = fui, «halb vier» = 3:30, subjuntivo, Konjunktiv II, pasiva, registro formal, modismos…). Otros idiomas: unidades creadas por el tutor IA. |
| **Gramática** | Conjugación de 25 verbos por idioma en todos los tiempos hasta B2 (tablas con audio y práctica a medida), 16 temas por idioma con explicación en cada fallo: artículos y determinantes, posesivos, demostrativos, contracciones, género y número, plurales, pronombres débiles (en, hi, l'hi…), preposiciones, casos alemanes (acusativo, dativo, genitivo, Wechselpräpositionen), declinación del adjetivo, orden de palabras, relativos, pasiva, subjuntivo, Konjunktiv I, conectores y registro formal. Cada unidad mete ejercicios de su gramática y el tutor IA crea temas a medida. |
| **Ejercicios** | Elegir imagen, traducir con fichas, escribir, dictado, escuchar y elegir, hablar, emparejar, completar huecos y artículos (der/die/das, el/la). |
| **Dificultad** | Fácil, Normal, Difícil y Experto (3 vidas y cronómetro). La tolerancia con tildes y erratas cambia con el nivel. Se ajusta sola según tu precisión. |
| **Adaptación** | Repetición espaciada, repaso de lo que fallas, ejercicios que se vuelven más fáciles tras dos fallos seguidos, más ejercicios del tipo que prefieres, prueba de nivel inicial. |
| **Tutor IA con memoria** | Guarda un resumen de ti, notas (gustos, metas, errores típicos) y tus últimos fallos. Lo usa para explicarte errores, darte el consejo del día, crear lecciones a tu medida y charlar contigo. Puedes ver y borrar lo que sabe en **Perfil**. |
| **Charla** | Núria (Barcelona) y Lukas (Berlín): conversación libre, «corrígeme todo», dudas en castellano, diario de tres frases y roleplays (panadería de Gràcia, vermut, Döner en Kreuzberg, WG-Casting, tren con retraso…). Corrige tus mensajes, traduce y manda las palabras nuevas a tu repaso. |
| **Racha** | Como Duolingo: un día cuenta con una lección, meta diaria de XP, protectores de racha (empiezas con uno), recuperación si la pierdes (3 lecciones en el día), hitos con premio, misiones diarias, gemas y XP doble. |
| **Juegos** | Parejas (memory de cartas), Palabra del día (tipo Wordle/Paraulògic), Contrarreloj, Ahorcado, ¿El o la? / Der-die-das, Anagramas, Verbos contrarreloj, Ruleta de verbos, Determinantes exprés y Género y número. |
| **Hablar y escuchar** | Voces del sistema (normal y despacio). Para hablar: ejercicios de leer y de traducir en voz alta dentro de las lecciones, y en Practicar → Hablar: responder preguntas de tu nivel (el tutor corrige tu respuesta), leer textos en voz alta, trabalenguas, describir escenas, pares mínimos, modo sombra y conversación por voz con el tutor. Con reconocimiento de voz del navegador o con el dictado del teclado. |
| **Amigos** | Dentro de Claude, liga semanal con las personas con las que compartes la app. |
| **Tendencias** | Palabras virales y jerga (Jugendwort 2025 «das crazy», «quina passada», «pixapins»…), métodos que arrasan en redes (shadowing, input comprensible, diario) y series, música y pódcasts para cada idioma. |

## Usarla sin publicarla en ningún sitio (recomendado)

Parla se publica como **artefacto privado de Claude**: solo lo abre quien tú invites.

1. Abre <https://claude.ai/artifact/VQBQUga27MKw8UtAbrwhGr> en el iPhone (Safari) y entra con tu cuenta de Claude.
2. Para invitar a alguien y que su progreso se guarde: botón **Compartir** del artefacto → **desactiva el enlace público** y añade su correo con permiso **Editor**. Claude solo deja guardar datos al propietario y a los editores invitados por correo (en un plan personal, y solo mientras no haya enlace público).
   - Con el **enlace público** también pueden usarla, pero sin guardar en la nube: su progreso queda en el navegador y en iPhone Safari lo borra al cerrarse. La app se lo avisa y les deja **copiar un código de progreso** para recuperarlo al volver.
3. Cada persona tiene su racha, su curso y su tutor. El tutor usa la cuenta de Claude de quien lo usa, sin claves.
4. Para tenerla como app: Safari → **Compartir → Añadir a pantalla de inicio**.

Dentro de Claude el navegador no deja usar el micrófono: para los ejercicios de hablar se usa el dictado del teclado del iPhone (pon el teclado en catalán o alemán en *Ajustes → General → Teclado → Teclados*).

## Usarla como web propia (opcional)

Si prefieres una app a pantalla completa con notificaciones:

1. Haz público el repositorio y activa **Settings → Pages → Deploy from a branch → `main` / (root)**. La app queda en `https://<tu-usuario>.github.io/<repo>/`.
2. Ábrela en Safari → **Compartir → Añadir a pantalla de inicio** (icono de la llama).
3. Para el tutor IA fuera de Claude: crea una clave en [console.anthropic.com](https://console.anthropic.com) y pégala en **Ajustes → Tutor IA**. Se guarda solo en ese navegador y se cobra en tu cuenta de la API.

Los datos de la versión web viven en cada móvil. Pásalos con **Ajustes → Exportar copia / Importar**.

## Recordatorios para no perder la racha

- **En la app**: aviso de racha en peligro con cuenta atrás hasta medianoche.
- **Dentro de Claude**: Ajustes → Recordatorios te guía para crear un recordatorio diario en la app Recordatorios del iPhone (o con Siri).
- **Versión web**: botón **Añadir al calendario** (evento diario con alarma y otra 2 h después) y notificaciones con la app instalada, más el número en el icono mientras la racha está pendiente.
- **Avisos push** (versión web, opcional): llegan aunque no abras la app y cambian de texto si ya practicaste hoy.
  1. En la app: Ajustes → Recordatorios → *Avisos push (avanzado)* → **Generar claves**.
  2. Pega la clave pública en `push-config.json` (`vapidPublicKey`) y la privada en **Settings → Secrets and variables → Actions → New secret** con el nombre `VAPID_PRIVATE_KEY`.
  3. Cada persona pulsa **Activar avisos push** en la app instalada y te pasa su código; añádelo a la lista de `push/subscriptions.json`.
  4. El flujo `.github/workflows/streak-reminders.yml` se ejecuta cada hora y avisa a cada persona en la hora de su recordatorio. Pruébalo en **Actions → Avisos de racha → Run workflow** marcando «Enviar a todos ahora».

## Voces

Las frases se leen con las voces del sistema. En iPhone, descarga las de catalán y alemán en *Ajustes → Accesibilidad → Contenido leído → Voces* (las «mejoradas» suenan mucho mejor).

## Archivos

- `index.html`: la app completa (se genera con `node build.mjs` a partir de `src/`).
- `src/styles.css`, `src/js/*.js`: código por módulos (cursos, motor de ejercicios, racha, tutor, juegos, interfaz).
- `manifest.webmanifest`, `apple-touch-icon.png`, `icon.svg`: instalación en la pantalla de inicio.
- `sw.js`: funcionamiento sin conexión y avisos push.
- `push-config.json`, `push/subscriptions.json`, `scripts/send-reminders.mjs`, `.github/workflows/streak-reminders.yml`: avisos push opcionales.

Para cambiar algo: edita `src/` y ejecuta `node build.mjs --check`.

## En qué se basa

- Mecánicas de racha de Duolingo: protectores, recuperación de rachas perdidas (como el evento de junio de 2026), hitos y misiones diarias.
- Juegos de clase para vocabulario (memory/concentración, ahorcado, contrarreloj) y los juegos virales de palabras en catalán (Wordle en català, Paraulògic).
- Métodos populares en TikTok, YouTube e Instagram: shadowing, input comprensible, microhábitos y diario.
- Jugendwort des Jahres (Langenscheidt): «das crazy» (2025), «Aura» (2024), «goofy» (2023)…
