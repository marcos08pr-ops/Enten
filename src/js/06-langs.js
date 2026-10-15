/* ============ Parla · idiomas, personajes, tendencias y listas de juegos ============ */
const FLAGS = {
  ca: '<svg viewBox="0 0 27 18"><rect width="27" height="18" fill="#FCDD09"/><path fill="#DA121A" d="M0 2h27v2H0zM0 6h27v2H0zM0 10h27v2H0zM0 14h27v2H0z"/></svg>',
  de: '<svg viewBox="0 0 5 3"><rect width="5" height="1" fill="#000"/><rect y="1" width="5" height="1" fill="#DD0000"/><rect y="2" width="5" height="1" fill="#FFCE00"/></svg>',
  en: '<svg viewBox="0 0 60 30"><rect width="60" height="30" fill="#012169"/><path d="M0 0l60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30M60 0L0 30" stroke="#C8102E" stroke-width="2.5"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></svg>',
  fr: '<svg viewBox="0 0 3 2"><rect width="1" height="2" fill="#002395"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ED2939"/></svg>',
  it: '<svg viewBox="0 0 3 2"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#CE2B37"/></svg>',
  pt: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#FF0000"/><rect width="12" height="20" fill="#006600"/><circle cx="12" cy="10" r="4" fill="#FFCC00"/><circle cx="12" cy="10" r="2.4" fill="#FF0000"/></svg>',
};
function flag(lang, cls) { return '<span class="flag ' + (cls || '') + '">' + (FLAGS[lang] || '') + '</span>'; }

const LANGS = {
  ca: { name: 'Català', es: 'catalán', units: CA_UNITS, chars: ['à', 'è', 'é', 'í', 'ï', 'ò', 'ó', 'ú', 'ü', 'ç', 'l·l', "'"],
    persona: { name: 'Núria', em: '🎨', bio: 'De Gràcia (Barcelona). Ilustradora, fan de Oques Grasses y de los castells.', hello: 'Hola! Sóc la Núria, de Barcelona. Com estàs avui? 😊' },
    scen: [
      { id: 'fleca', t: '🥐 En una panadería de Gràcia', d: 'Eres la dependienta de una fleca (panadería) del barrio de Gràcia. El alumno quiere comprar pan y algo dulce.' },
      { id: 'vermut', t: '🍸 Quedar para un vermut', d: 'Sois amigos y estáis organizando un vermut el domingo al mediodía. Negociad hora y lugar.' },
      { id: 'pis', t: '🏠 Buscar piso en Barcelona', d: 'Eres la propietaria de un piso de alquiler en Barcelona y el alumno viene a verlo.' },
      { id: 'castells', t: '🏰 Festa major y castells', d: 'Estáis en la festa major de un pueblo viendo castells. Explicas cómo funcionan y charláis.' },
      { id: 'feina', t: '💼 Entrevista de trabajo', d: 'Eres la entrevistadora de una startup de Barcelona. Haz una entrevista breve y amable.' },
      { id: 'cap', t: '🩺 En el médico (CAP)', d: 'Eres la médica de un CAP (centro de salud). El alumno explica qué le pasa.' },
    ] },
  de: { name: 'Deutsch', es: 'alemán', units: DE_UNITS, chars: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
    persona: { name: 'Lukas', em: '🚲', bio: 'De Kreuzberg (Berlín). Mensajero en bici, DJ los findes y fan del Union Berlin.', hello: 'Hey! Ich bin Lukas aus Berlin. Wie geht\'s dir heute? 😄' },
    scen: [
      { id: 'doener', t: '🥙 Pedir un Döner en Kreuzberg', d: 'Trabajas en un puesto de Döner en Kreuzberg. El alumno pide comida; pregúntale salsas y si es para llevar.' },
      { id: 'wg', t: '🏠 WG-Casting en Berlín', d: 'Eres miembro de una WG (piso compartido) en Berlín y entrevistas al alumno como posible compañero.' },
      { id: 'bahn', t: '🚆 Tren con retraso (Deutsche Bahn)', d: 'Eres empleado de la Deutsche Bahn en una estación. El tren del alumno lleva retraso y necesita alternativas.' },
      { id: 'okt', t: '🍺 Oktoberfest', d: 'Estáis en una carpa del Oktoberfest de Múnich. Charla animada sobre la fiesta, comida y costumbres.' },
      { id: 'job', t: '💼 Vorstellungsgespräch', d: 'Eres el entrevistador de una empresa en Hamburgo. Haz una entrevista de trabajo breve.' },
      { id: 'arzt', t: '🩺 Beim Arzt', d: 'Eres el médico de cabecera. El alumno explica qué le pasa.' },
    ] },
  en: { name: 'English', es: 'inglés', ai: true, chars: ['’'],
    persona: { name: 'Maya', em: '☕', bio: 'De Londres. Barista y fan del indie británico.', hello: 'Hi! I\'m Maya from London. How\'s your day going? 😊' },
    scen: [{ id: 'cafe', t: '☕ En una cafetería de Londres', d: 'Eres barista en una cafetería de Londres.' }, { id: 'job', t: '💼 Entrevista de trabajo', d: 'Eres entrevistadora en una empresa tecnológica.' }, { id: 'trip', t: '✈️ En el aeropuerto', d: 'Trabajas en el mostrador de un aeropuerto.' }] },
  fr: { name: 'Français', es: 'francés', ai: true, chars: ['é', 'è', 'ê', 'à', 'â', 'ç', 'ù', 'û', 'î', 'ô', 'ë', 'ï', 'œ'],
    persona: { name: 'Léa', em: '🥐', bio: 'De Lyon. Estudiante de cine y cocinera aficionada.', hello: 'Salut ! Moi, c\'est Léa, de Lyon. Ça va ? 😊' },
    scen: [{ id: 'boul', t: '🥖 En la boulangerie', d: 'Eres la panadera de una boulangerie de Lyon.' }, { id: 'resto', t: '🍷 En un restaurante', d: 'Eres camarera en un bouchon lyonnais.' }, { id: 'metro', t: '🚇 Perdido en el metro de París', d: 'Eres una parisina que ayuda a orientarse.' }] },
  it: { name: 'Italiano', es: 'italiano', ai: true, chars: ['à', 'è', 'é', 'ì', 'ò', 'ù'],
    persona: { name: 'Giulia', em: '🍝', bio: 'De Bolonia. Estudia arquitectura y adora el aperitivo.', hello: 'Ciao! Sono Giulia, di Bologna. Come stai? 😊' },
    scen: [{ id: 'bar', t: '☕ Pedir en un bar italiano', d: 'Eres camarera en un bar de Bolonia.' }, { id: 'aperitivo', t: '🍹 Aperitivo con amigos', d: 'Sois amigos en un aperitivo.' }, { id: 'treno', t: '🚆 En la estación', d: 'Trabajas en la taquilla de Trenitalia.' }] },
  pt: { name: 'Português', es: 'portugués', ai: true, chars: ['ã', 'õ', 'á', 'â', 'à', 'é', 'ê', 'í', 'ó', 'ô', 'ú', 'ç'],
    persona: { name: 'Inês', em: '🌊', bio: 'De Lisboa. Surfista y fan del fado moderno.', hello: 'Olá! Sou a Inês, de Lisboa. Tudo bem? 😊' },
    scen: [{ id: 'pastelaria', t: '🥮 En una pastelaria', d: 'Trabajas en una pastelaria de Lisboa.' }, { id: 'praia', t: '🏄 Un día de playa', d: 'Sois amigos planeando un día de surf.' }, { id: 'eletrico', t: '🚋 En el tranvía 28', d: 'Eres una lisboeta que charla en el tranvía.' }] },
};
const CHAT_MODES = [
  { id: 'libre', t: '💬 Charla libre' },
  { id: 'estricto', t: '✍️ Corrígeme todo' },
  { id: 'tutor', t: '🧑‍🏫 Dudas (en español)' },
];

/* Temas de las unidades (también para los idiomas con curso generado por IA) */
const TOPICS = CA_UNITS.map((u) => ({ id: u.id, t: u.t, cefr: u.cefr, icon: u.icon }));

/* ---- Tendencias: lo que se dice ahora y métodos que arrasan en redes ---- */
const TRENDS = {
  de: [
    { w: 'das crazy', es: '¡qué locura! / ¡flipa!', tag: 'Jugendwort 2025', n: 'Palabra juvenil del año 2025 (Langenscheidt). Respuesta comodín cuando algo te deja sin palabras.' },
    { w: 'checkst du?', es: '¿lo pillas?', tag: 'Top 3 · 2025', n: 'Se pone al final de la frase para comprobar que el otro te sigue.' },
    { w: 'Aura', es: 'carisma, buena vibra', tag: 'Jugendwort 2024', n: '«Der hat Aura» = ese tío tiene un aura especial.' },
    { w: 'goofy', es: 'tontorrón, torpe', tag: 'Jugendwort 2023', n: 'Para alguien gracioso de puro torpe.' },
    { w: 'cringe', es: 'vergüenza ajena', tag: 'Jugendwort 2021', n: 'Igual que en castellano: «Das ist so cringe».' },
    { w: 'Digga', es: 'tío, bro', tag: 'Coloquial', n: 'Muy de Hamburgo y Berlín: «Digga, was geht?»' },
    { w: 'Bock haben', es: 'tener ganas', tag: 'Coloquial', n: '«Ich hab Bock auf Pizza» = me apetece pizza.' },
    { w: 'krass', es: 'brutal', tag: 'Coloquial', n: 'Vale para lo bueno y lo malo: «Wie krass!»' },
    { w: 'Feierabend', es: 'fin de la jornada', tag: 'Sin traducción', n: 'El momento sagrado de salir del trabajo. «Schönen Feierabend!»' },
    { w: 'Ohrwurm', es: 'canción pegadiza', tag: 'Sin traducción', n: 'Literalmente «gusano de oreja».' },
    { w: 'Kummerspeck', es: 'kilos de la pena', tag: 'Sin traducción', n: 'Lo que engordas comiendo cuando estás triste. Literal: «tocino de pena».' },
    { w: 'Fernweh', es: 'ganas de viajar lejos', tag: 'Sin traducción', n: 'Lo contrario de la morriña: nostalgia de sitios donde no has estado.' },
  ],
  ca: [
    { w: 'Quina passada!', es: '¡qué pasada!', tag: 'Coloquial', n: 'Para algo increíble: «Quina passada de concert!»' },
    { w: "Déu n'hi do", es: '¡madre mía! / no está nada mal', tag: 'Clásico', n: 'Sorpresa o admiración. Se oye a todas horas.' },
    { w: 'Ostres!', es: '¡ostras!', tag: 'Coloquial', n: 'Sorpresa suave y apta para todos los públicos.' },
    { w: 'Quin pal!', es: '¡qué palo! / ¡qué pereza!', tag: 'Coloquial', n: 'Cuando algo da muchísima pereza.' },
    { w: 'Anar de bòlit', es: 'ir agobiado, a tope', tag: 'Expresión', n: '«Aquesta setmana vaig de bòlit».' },
    { w: 'Estar fet pols', es: 'estar hecho polvo', tag: 'Expresión', n: 'Igual de gráfico que en castellano.' },
    { w: 'Fer-la petar', es: 'estar de cháchara', tag: 'Expresión', n: '«Ens vam quedar fent-la petar fins tard».' },
    { w: 'Pixapins', es: 'urbanita de ciudad en el campo', tag: 'Viral', n: 'Así llaman en los pueblos al barcelonés que va de excursión el finde.' },
    { w: 'Que vagi bé!', es: '¡que vaya bien!', tag: 'Despedida', n: 'La despedida más catalana en tiendas y bares.' },
    { w: 'Fer un vermut', es: 'tomar el vermut', tag: 'Cultura', n: 'Ritual del domingo antes de comer: vermut, olivas y patatas.' },
    { w: 'Paraulògic', es: 'juego de palabras diario', tag: 'Juego viral', n: 'El «Spelling Bee» catalán: miles de personas lo juegan cada día, junto al Wordle en catalán.' },
    { w: 'Rauxa i seny', es: 'arrebato y sensatez', tag: 'Cultura', n: 'Los dos polos del carácter catalán, según el tópico.' },
  ],
};
const METHODS = [
  { em: '🗣️', t: 'Shadowing', d: 'Escucha una frase y repítela a la vez, imitando ritmo y entonación. Muy popular en YouTube y TikTok para la pronunciación.', act: 'shadow' },
  { em: '🎧', t: 'Input comprensible', d: 'Mucho contenido que entiendas casi entero: series, música y pódcasts a tu nivel.', act: 'media' },
  { em: '⏱️', t: 'Microhábitos de 5 minutos', d: 'Mejor poco cada día que mucho un día. Para eso existe la racha.', act: 'lesson' },
  { em: '📓', t: 'Diario de tres frases', d: 'Cada noche, tres frases sobre tu día. El tutor te las corrige.', act: 'diary' },
  { em: '🎤', t: 'Canta', d: 'La música fija vocabulario y acento sin que te des cuenta.', act: 'media' },
  { em: '📱', t: 'Cambia el idioma del móvil', d: 'Inmersión gratis: verás las mismas palabras decenas de veces al día.', act: null },
];
const MEDIA = {
  ca: [
    { em: '📺', t: 'Merlí', d: 'Serie de un profesor de filosofía. Catalán claro y cotidiano.' },
    { em: '🎵', t: 'Oques Grasses · Manel · Txarango', d: 'Pop y mestizaje en catalán. Letras fáciles de seguir.' },
    { em: '🎤', t: 'Lildami · Mushka', d: 'Rap y música urbana en catalán.' },
    { em: '🎙️', t: 'Easy Catalan', d: 'Entrevistas por la calle con subtítulos en catalán y en inglés.' },
  ],
  de: [
    { em: '🎙️', t: 'Easy German', d: 'Entrevistas por la calle y pódcast para estudiantes.' },
    { em: '📰', t: 'nachrichtenleicht.de', d: 'Noticias en alemán fácil, con audio.' },
    { em: '📺', t: 'Dark · How to Sell Drugs Online (Fast)', d: 'Series alemanas de Netflix; ponlas con subtítulos en alemán.' },
    { em: '🎵', t: 'AnnenMayKantereit · Nina Chuba · Peter Fox', d: 'Pop alemán actual con letras muy citadas.' },
    { em: '🎓', t: 'Nicos Weg (DW)', d: 'Curso gratuito en vídeo de la Deutsche Welle, de A1 a B1.' },
  ],
};

/* ---- Juego «¿el o la?» / «der, die, das?» ---- */
const GENDER = {
  de: { opts: ['der', 'die', 'das'],
    words: ['der Tisch|la mesa', 'die Lampe|la lámpara', 'das Fenster|la ventana', 'der Löffel|la cuchara', 'die Gabel|el tenedor', 'das Messer|el cuchillo', 'das Mädchen|la chica', 'der Käse|el queso',
      'die Butter|la mantequilla', 'das Brot|el pan', 'der Apfel|la manzana', 'die Banane|el plátano', 'das Auto|el coche', 'der Zug|el tren', 'die Straße|la calle', 'das Haus|la casa', 'der Garten|el jardín',
      'die Tür|la puerta', 'das Buch|el libro', 'die Zeitung|el periódico', 'das Handy|el móvil', 'die Uhr|el reloj', 'das Bett|la cama', 'der Schrank|el armario', 'die Küche|la cocina', 'der Hund|el perro',
      'die Katze|el gato', 'das Pferd|el caballo', 'der Vogel|el pájaro', 'die Maus|el ratón', 'der Baum|el árbol', 'die Blume|la flor', 'das Wetter|el tiempo', 'die Sonne|el sol', 'der Mond|la luna',
      'das Meer|el mar', 'die Stadt|la ciudad', 'das Dorf|el pueblo', 'der Berg|la montaña', 'das Kind|el niño', 'das Wasser|el agua', 'die Milch|la leche', 'das Bier|la cerveza', 'der Wein|el vino',
      'das Geld|el dinero', 'die Liebe|el amor', 'die Wohnung|el piso', 'die Freiheit|la libertad', 'die Freundschaft|la amistad', 'das Brötchen|el panecillo', 'der Montag|el lunes', 'der Sommer|el verano', 'der Lehrer|el profesor'],
    rules: [[/ung$|heit$|keit$|schaft$|ion$|tät$/i, 'Las palabras en -ung, -heit, -keit, -schaft, -ion y -tät son femeninas.'], [/chen$|lein$/i, 'Los diminutivos en -chen y -lein siempre son neutros (¡«das Mädchen»!).'], [/^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Sommer|Winter|Frühling|Herbst)$/i, 'Días, meses y estaciones son masculinos.'], [/er$/i, 'Muchos sustantivos de persona en -er son masculinos.']] },
  ca: { opts: ['el', 'la'],
    // «!» = cambia de género respecto al castellano
    words: ['dent|el diente|f|!', 'senyal|la señal|m|!', 'dubte|la duda|m|!', 'costum|la costumbre|m|!', 'llegum|la legumbre|m|!', 'calor|el calor|f|!', 'olor|el olor|f|!', 'suor|el sudor|f|!',
      'vall|el valle|f|!', 'front|la frente|m|!', 'pendent|la pendiente|m|!', 'corrent|la corriente|m|!', 'remor|el rumor|f|!', 'compte|la cuenta|m|!', 'anàlisi|el análisis|f|!', 'marató|el maratón|f|!',
      'avantatge|la ventaja|m|!', 'cap|la cabeza|m|!', 'nas|la nariz|m|!', 'llit|la cama|m|!', 'síndrome|el síndrome|f|!', 'postres|el postre|f|!',
      'casa|la casa|f', 'cotxe|el coche|m', 'taula|la mesa|f', 'llibre|el libro|m', 'llet|la leche|f', 'gos|el perro|m', 'ciutat|la ciudad|f', 'aigua|el agua|f', 'carrer|la calle|m', 'platja|la playa|f',
      'dia|el día|m', 'nit|la noche|f', 'formatge|el queso|m', 'fruita|la fruta|f', 'peix|el pescado|m', 'mà|la mano|f', 'peu|el pie|m', 'llum|la luz|f', 'flor|la flor|f', 'arbre|el árbol|m'] },
};

/* ---- Palabras de 5 letras para «La palabra del día» ---- */
const WORDLE = {
  ca: ['porta|puerta', 'taula|mesa', 'festa|fiesta', 'pluja|lluvia', 'negre|negro', 'blanc|blanco', 'temps|tiempo', 'carta|carta', 'dinar|comer (al mediodía)', 'sopar|cenar', 'beure|beber', 'pomes|manzanas',
    'barca|barca', 'amics|amigos', 'feina|trabajo', 'diari|diario', 'tarda|tarde', 'metro|metro', 'nedar|nadar', 'cuina|cocina', 'dutxa|ducha', 'jugar|jugar', 'cotxe|coche', 'plats|platos', 'salut|salud',
    'bolet|seta', 'terra|tierra', 'cases|casas', 'gelat|helado', 'sucre|azúcar', 'oliva|aceituna', 'peres|peras', 'arròs|arroz', 'poble|pueblo', 'lluna|luna', 'estel|estrella', 'riure|reír', 'viure|vivir',
    'obrir|abrir', 'mirar|mirar', 'pares|padres', 'germà|hermano', 'tieta|tía', 'nebot|sobrino', 'barri|barrio', 'ocell|pájaro', 'verds|verdes', 'dolor|dolor'],
  de: ['Katze|gato', 'Hunde|perros', 'Tisch|mesa', 'Stuhl|silla', 'Fisch|pez', 'Vogel|pájaro', 'Blume|flor', 'Stadt|ciudad', 'Liebe|amor', 'Musik|música', 'Woche|semana', 'Monat|mes', 'Abend|tarde-noche',
    'Nacht|noche', 'Jacke|chaqueta', 'Kerze|vela', 'Lampe|lámpara', 'Milch|leche', 'Birne|pera', 'Mango|mango', 'Pizza|pizza', 'Insel|isla', 'Sonne|sol', 'Regen|lluvia', 'Wolke|nube', 'Fluss|río',
    'Brief|carta', 'Küche|cocina', 'Kunst|arte', 'Spiel|juego', 'Sport|deporte', 'Reise|viaje', 'Vater|padre', 'Onkel|tío', 'Tante|tía', 'Junge|chico', 'lesen|leer', 'essen|comer', 'reden|hablar',
    'Bauch|barriga', 'Augen|ojos', 'Haare|pelo', 'Stern|estrella', 'Feuer|fuego', 'Apfel|manzana', 'Hosen|pantalones', 'Markt|mercado', 'Platz|plaza'],
};

/* ---- Misiones diarias ---- */
const QUESTS = [
  { id: 'xp', em: '⚡', t: (g) => 'Gana ' + g + ' XP', goals: [20, 30, 40], metric: 'xp', gems: 10 },
  { id: 'lessons', em: '📘', t: (g) => 'Completa ' + g + ' lecciones', goals: [2, 3], metric: 'lessons', gems: 10 },
  { id: 'great', em: '🎯', t: () => 'Haz una lección con un 90 % o más', goals: [1], metric: 'great', gems: 15 },
  { id: 'speak', em: '🎙️', t: (g) => 'Di ' + g + ' frases en voz alta', goals: [4, 6], metric: 'speak', gems: 15, pref: 'hablar' },
  { id: 'listen', em: '🎧', t: (g) => 'Acierta ' + g + ' ejercicios de escucha', goals: [4, 6], metric: 'listen', gems: 10, pref: 'escuchar' },
  { id: 'game', em: '🃏', t: (g) => g > 1 ? 'Juega ' + g + ' partidas' : 'Juega una partida', goals: [1, 2], metric: 'games', gems: 10, pref: 'juegos' },
  { id: 'chat', em: '💬', t: (g) => 'Envía ' + g + ' mensajes a tu tutor', goals: [5, 8], metric: 'chat', gems: 15 },
  { id: 'review', em: '🧠', t: (g) => 'Repasa ' + g + ' palabras', goals: [8, 12], metric: 'review', gems: 10 },
  { id: 'gram', em: '📐', t: (g) => 'Acierta ' + g + ' ejercicios de gramática', goals: [6, 10], metric: 'gram', gems: 10, pref: 'gramatica' },
  { id: 'combo', em: '🔥', t: (g) => 'Consigue un combo de ' + g, goals: [6, 8], metric: 'combo', gems: 10, max: true },
];

/* ---- Logros ---- */
const BADGES = [
  { id: 'first', em: '🐣', t: 'Primera lección', ok: (s) => s.lessons >= 1 },
  { id: 'streak7', em: '🔥', t: 'Racha de 7', ok: (s, r) => r.best >= 7 },
  { id: 'streak30', em: '🌋', t: 'Racha de 30', ok: (s, r) => r.best >= 30 },
  { id: 'streak100', em: '💯', t: 'Racha de 100', ok: (s, r) => r.best >= 100 },
  { id: 'words100', em: '📚', t: '100 palabras', ok: (s) => (s.words || 0) >= 100 },
  { id: 'perfect5', em: '🎯', t: '5 perfectas', ok: (s) => (s.perfect || 0) >= 5 },
  { id: 'chat50', em: '💬', t: '50 mensajes', ok: (s) => (s.chat || 0) >= 50 },
  { id: 'polyglot', em: '🌍', t: 'Políglota', ok: (s, r, p) => Object.keys(p.langs || {}).length >= 2 },
  { id: 'speaker', em: '🎙️', t: '50 frases dichas', ok: (s) => (s.speak || 0) >= 50 },
  { id: 'gamer', em: '🎮', t: '20 partidas', ok: (s) => (s.games || 0) >= 20 },
  { id: 'owl', em: '🦉', t: 'Noctámbulo', ok: (s) => !!s.night },
  { id: 'early', em: '🐓', t: 'Madrugador', ok: (s) => !!s.early },
];
const MILESTONES = [3, 7, 14, 30, 50, 75, 100, 150, 200, 250, 300, 365, 500, 730, 1000];
