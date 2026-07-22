"use client";

/**
 * Runtime, dictionary-based i18n - no routing/URL locale prefixes (this is an
 * authenticated app shell, not SEO content, so a `useSession().language` switch
 * is simpler than next-intl's locale-segment routing and touches zero route
 * files). Every screen's static copy lives here; AI-generated content (the
 * debate, the read, suggestions) is translated server-side instead - see
 * backend/agents/prompts.py::resolve_response_language - because the *source*
 * screenshot's language has to be detected before that content even exists.
 */

import { useSession } from "./session";
import type { SocialMode } from "./types";

export type LanguageCode = "auto" | "en" | "es" | "ar" | "fr" | "pt" | "hi";

export const LANGUAGES: {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
  dir: "ltr" | "rtl";
}[] = [
  { code: "auto", nativeName: "Auto", englishName: "Auto - match the screenshot", dir: "ltr" },
  { code: "en", nativeName: "English", englishName: "English", dir: "ltr" },
  { code: "es", nativeName: "Español", englishName: "Spanish", dir: "ltr" },
  { code: "ar", nativeName: "العربية", englishName: "Arabic", dir: "rtl" },
  { code: "fr", nativeName: "Français", englishName: "French", dir: "ltr" },
  { code: "pt", nativeName: "Português", englishName: "Portuguese", dir: "ltr" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", dir: "ltr" },
];

type UiLanguage = Exclude<LanguageCode, "auto">;

/** "auto" has no UI meaning by itself (nothing to detect the app chrome's
 * language from) - it only affects AI-response language. UI chrome falls
 * back to English while "auto" is selected. */
export function uiLanguage(code: LanguageCode): UiLanguage {
  return code === "auto" ? "en" : code;
}

export function languageDir(code: LanguageCode): "ltr" | "rtl" {
  return LANGUAGES.find((l) => l.code === code)?.dir ?? "ltr";
}

export interface Dict {
  common: { back: string; seeAll: string };
  tabs: { home: string; playbook: string; live: string; profile: string };
  modes: Record<SocialMode, { name: string; desc: string }>;
  missions: Record<
    "icebreaker" | "vibeShift" | "exitStrategy",
    { title: string; desc: string }
  >;
  dashboard: {
    greeting: string;
    heading: string;
    tonightsMode: string;
    change: string;
    playbookTitle: string;
    startRead: string;
  };
  vibe: { eyebrow: string; title: string; subtitle: string; lockIn: string };
  live: {
    yourReads: string;
    newContactPrompt: string;
    newChip: string;
    scenarioLabel: string;
    scenarioPlaceholder: string;
    addScreenshot: string;
    addMoreScreenshots: string;
    screenshotsCount: string;
    removeScreenshot: string;
    screenshotHint: string;
    tooManyScreenshots: string;
    orMission: string;
    read: string;
    reads: string;
    send: string;
  };
  say: { title: string; thinking: string; giveMeThree: string; copy: string; copied: string };
  read: {
    readingTitle: string;
    spokenTitle: string;
    yourScreenshot: string;
    yourScreenshots: string;
    statusDebating: string;
    statusDone: string;
    statusRunning: string;
    inDebate: string;
    goingBackAndForth: string;
    threeTakes: string;
    seeRead: string;
    typing: string;
    showMore: string;
    showLess: string;
    agentRoles: { arthur: string; clara: string; leo: string };
  };
  result: {
    title: string;
    shareCopied: string;
    thinkingHeading: string;
    attractionGauge: string;
    lesson: string;
    bestResponse: string;
    playfulAlt: string;
    directAlt: string;
    copyResponse: string;
    copied: string;
    tryAgain: string;
    synthesizedFrom: string;
    savedToMemory: string;
  };
  recap: {
    title: string;
    dateVenue: string;
    nightEnergy: string;
    energyPct: string;
    stats: { approaches: string; newContacts: string; bestConvo: string; peakConfidence: string };
    bestLineDropped: string;
    demoQuote: string;
    shareRecap: string;
    shareDisclaimer: string;
  };
  playbook: { before: string; homeLink: string; after: string };
  profile: { before: string; recapLink: string; after: string };
  language: { title: string; subtitle: string; autoNote: string };
}

const en: Dict = {
  common: { back: "Back", seeAll: "See all" },
  tabs: { home: "Home", playbook: "Playbook", live: "Live", profile: "Profile" },
  modes: {
    hype: { name: "Hype", desc: "Big energy, loud room." },
    chill: { name: "Chill", desc: "Low-key, easy pace." },
    romantic: { name: "Romantic", desc: "Slow down, one-on-one." },
    direct: { name: "Direct", desc: "No games, say the thing." },
  },
  missions: {
    icebreaker: { title: "Icebreaker", desc: "Break the ice. Start the conversation." },
    vibeShift: { title: "Vibe Shift", desc: "Change the energy. Read the room." },
    exitStrategy: { title: "Exit Strategy", desc: "Wrap it up warm. Leave them smiling." },
  },
  dashboard: {
    greeting: "Hey {name} 👋",
    heading: "Ready for tonight?",
    tonightsMode: "Tonight's mode",
    change: "Change",
    playbookTitle: "Wingman Playbook",
    startRead: "Start a read",
  },
  vibe: {
    eyebrow: "First thing tonight",
    title: "What's your mode?",
    subtitle: "Pick one — it tints the whole night. Change it anytime.",
    lockIn: "Lock in {mode}",
  },
  live: {
    yourReads: "Your reads",
    newContactPrompt: "Who are you talking to? (first name is fine)",
    newChip: "＋ New",
    scenarioLabel: "Scenario",
    scenarioPlaceholder: 'Describe the situation… e.g. "At a coffee shop, she\'s reading my favorite book."',
    addScreenshot: "Add screenshot",
    addMoreScreenshots: "Add more",
    screenshotsCount: "{count} attached",
    removeScreenshot: "Remove",
    screenshotHint: "Screenshots get the full Arthur · Clara · Leo debate.",
    tooManyScreenshots: "That's too many at once - max {max} screenshots per read.",
    orMission: "Or start from a mission",
    read: "read",
    reads: "reads",
    send: "Send",
  },
  say: { title: "What to say next", thinking: "Thinking…", giveMeThree: "Give me three more", copy: "Copy", copied: "Copied!" },
  read: {
    readingTitle: "Reading the room…",
    spokenTitle: "The room has spoken",
    yourScreenshot: "Your screenshot",
    yourScreenshots: "Your screenshots",
    statusDebating: "Takes are in — now they hash it out.",
    statusDone: "Debate settled. Your read is ready.",
    statusRunning: "Three reads happening in parallel right now.",
    inDebate: "in the debate",
    goingBackAndForth: "the coaches are going back and forth…",
    threeTakes: "Three takes, one debate, then one answer.",
    seeRead: "See your read",
    typing: "typing",
    showMore: "Tap to see why",
    showLess: "Hide",
    agentRoles: { arthur: "Frame expert", clara: "Psychology", leo: "The charmer" },
  },
  result: {
    title: "Your read",
    shareCopied: "Copied a shareable summary — paste it anywhere.",
    thinkingHeading: "What she might actually be thinking…",
    attractionGauge: "Attraction Gauge",
    lesson: "LESSON",
    bestResponse: "Best response",
    playfulAlt: "Playful alt",
    directAlt: "Direct alt",
    copyResponse: "Copy response",
    copied: "Copied!",
    tryAgain: "Try again",
    synthesizedFrom: "Synthesized from all three takes",
    savedToMemory: "Saved to {name}'s memory — read #{count}. The next one gets sharper.",
  },
  recap: {
    title: "Night Out Recap",
    dateVenue: "11:42 PM · Downtown Lounge",
    nightEnergy: "A {mode} night",
    energyPct: "{pct}% of the night in {mode} mode — you led the charge.",
    stats: {
      approaches: "Approaches",
      newContacts: "New contacts",
      bestConvo: "Best convo",
      peakConfidence: "Peak confidence",
    },
    bestLineDropped: "Best line dropped",
    demoQuote: "“Careful, if you keep quoting my favorite book at me I'm going to have to buy you a coffee.”",
    shareRecap: "Share recap",
    shareDisclaimer: "Shares as a watermarked story card — the summary, never the raw conversation.",
  },
  playbook: {
    before: "Mission library coming soon. For now, start from a mission on ",
    homeLink: "Home",
    after: " or jump into a live read.",
  },
  profile: {
    before: "Stats, streaks, and settings land here. Tonight's ",
    recapLink: "recap",
    after: " has the demo of where this is headed.",
  },
  language: {
    title: "Language",
    subtitle: "Choose the language for the app and for your reads.",
    autoNote: "Auto detects the conversation's language from the screenshot automatically.",
  },
};

const es: Dict = {
  common: { back: "Atrás", seeAll: "Ver todo" },
  tabs: { home: "Inicio", playbook: "Jugadas", live: "En vivo", profile: "Perfil" },
  modes: {
    hype: { name: "Hype", desc: "Mucha energía, ambiente fuerte." },
    chill: { name: "Relax", desc: "Tranquilo, ritmo suave." },
    romantic: { name: "Romántico", desc: "Con calma, uno a uno." },
    direct: { name: "Directo", desc: "Sin juegos, dilo tal cual." },
  },
  missions: {
    icebreaker: { title: "Rompehielos", desc: "Rompe el hielo. Empieza la conversación." },
    vibeShift: { title: "Cambio de ambiente", desc: "Cambia la energía. Lee la sala." },
    exitStrategy: { title: "Salida elegante", desc: "Cierra con calidez. Que se queden sonriendo." },
  },
  dashboard: {
    greeting: "Hola {name} 👋",
    heading: "¿Listo para esta noche?",
    tonightsMode: "Modo de esta noche",
    change: "Cambiar",
    playbookTitle: "Jugadas del Wingman",
    startRead: "Empezar una lectura",
  },
  vibe: {
    eyebrow: "Lo primero esta noche",
    title: "¿Cuál es tu modo?",
    subtitle: "Elige uno — define el tono de toda la noche. Puedes cambiarlo cuando quieras.",
    lockIn: "Confirmar {mode}",
  },
  live: {
    yourReads: "Tus lecturas",
    newContactPrompt: "¿Con quién estás hablando? (con el nombre basta)",
    newChip: "＋ Nuevo",
    scenarioLabel: "Escenario",
    scenarioPlaceholder: 'Describe la situación… ej. "En una cafetería, ella está leyendo mi libro favorito."',
    addScreenshot: "Añadir captura",
    addMoreScreenshots: "Añadir más",
    screenshotsCount: "{count} adjuntas",
    removeScreenshot: "Quitar",
    screenshotHint: "Las capturas activan el debate completo de Arthur · Clara · Leo.",
    tooManyScreenshots: "Son demasiadas de una vez - máximo {max} capturas por lectura.",
    orMission: "O empieza con una misión",
    read: "lectura",
    reads: "lecturas",
    send: "Enviar",
  },
  say: { title: "Qué decir ahora", thinking: "Pensando…", giveMeThree: "Dame tres más", copy: "Copiar", copied: "¡Copiado!" },
  read: {
    readingTitle: "Leyendo la sala…",
    spokenTitle: "La sala ya habló",
    yourScreenshot: "Tu captura",
    yourScreenshots: "Tus capturas",
    statusDebating: "Ya tienen sus lecturas — ahora lo discuten entre ellos.",
    statusDone: "Debate resuelto. Tu lectura está lista.",
    statusRunning: "Tres lecturas en paralelo, ahora mismo.",
    inDebate: "en el debate",
    goingBackAndForth: "los coaches están debatiendo…",
    threeTakes: "Tres lecturas, un debate, y luego una respuesta.",
    seeRead: "Ver tu lectura",
    typing: "escribiendo",
    showMore: "Toca para ver por qué",
    showLess: "Ocultar",
    agentRoles: { arthur: "Experto en actitud", clara: "Psicología", leo: "El encantador" },
  },
  result: {
    title: "Tu lectura",
    shareCopied: "Se copió un resumen para compartir — pégalo donde quieras.",
    thinkingHeading: "Lo que ella podría estar pensando…",
    attractionGauge: "Medidor de atracción",
    lesson: "LECCIÓN",
    bestResponse: "Mejor respuesta",
    playfulAlt: "Alternativa juguetona",
    directAlt: "Alternativa directa",
    copyResponse: "Copiar respuesta",
    copied: "¡Copiado!",
    tryAgain: "Intentar de nuevo",
    synthesizedFrom: "Sintetizado a partir de las tres lecturas",
    savedToMemory: "Guardado en la memoria de {name} — lectura #{count}. La próxima será más precisa.",
  },
  recap: {
    title: "Resumen de la noche",
    dateVenue: "11:42 PM · Downtown Lounge",
    nightEnergy: "Una noche {mode}",
    energyPct: "{pct}% de la noche en modo {mode} — tú llevaste la iniciativa.",
    stats: {
      approaches: "Acercamientos",
      newContacts: "Contactos nuevos",
      bestConvo: "Mejor charla",
      peakConfidence: "Confianza máxima",
    },
    bestLineDropped: "Mejor frase de la noche",
    demoQuote: "“Cuidado, si sigues citando mi libro favorito voy a tener que invitarte un café.”",
    shareRecap: "Compartir resumen",
    shareDisclaimer: "Se comparte como una tarjeta con marca de agua — solo el resumen, nunca la conversación real.",
  },
  playbook: {
    before: "La biblioteca de misiones llega pronto. Por ahora, empieza una misión en ",
    homeLink: "Inicio",
    after: " o entra a una lectura en vivo.",
  },
  profile: {
    before: "Aquí irán tus estadísticas, rachas y ajustes. El ",
    recapLink: "resumen",
    after: " de esta noche muestra hacia dónde va esto.",
  },
  language: {
    title: "Idioma",
    subtitle: "Elige el idioma de la app y de tus lecturas.",
    autoNote: "Auto detecta el idioma de la conversación directamente desde la captura.",
  },
};

const fr: Dict = {
  common: { back: "Retour", seeAll: "Tout voir" },
  tabs: { home: "Accueil", playbook: "Playbook", live: "En direct", profile: "Profil" },
  modes: {
    hype: { name: "Hype", desc: "Grosse énergie, ambiance intense." },
    chill: { name: "Chill", desc: "Décontracté, rythme tranquille." },
    romantic: { name: "Romantique", desc: "On ralentit, en tête-à-tête." },
    direct: { name: "Direct", desc: "Sans détour, on dit les choses." },
  },
  missions: {
    icebreaker: { title: "Brise-glace", desc: "Brise la glace. Lance la conversation." },
    vibeShift: { title: "Changement d'ambiance", desc: "Change l'énergie. Lis la salle." },
    exitStrategy: { title: "Sortie réussie", desc: "Termine sur une note chaleureuse." },
  },
  dashboard: {
    greeting: "Salut {name} 👋",
    heading: "Prêt pour ce soir ?",
    tonightsMode: "Mode de ce soir",
    change: "Changer",
    playbookTitle: "Playbook du Wingman",
    startRead: "Commencer une lecture",
  },
  vibe: {
    eyebrow: "En premier ce soir",
    title: "Quel est ton mode ?",
    subtitle: "Choisis-en un — il colore toute la soirée. Modifiable à tout moment.",
    lockIn: "Valider {mode}",
  },
  live: {
    yourReads: "Tes lectures",
    newContactPrompt: "À qui parles-tu ? (le prénom suffit)",
    newChip: "＋ Nouveau",
    scenarioLabel: "Scénario",
    scenarioPlaceholder: 'Décris la situation… ex. "Dans un café, elle lit mon livre préféré."',
    addScreenshot: "Ajouter une capture",
    addMoreScreenshots: "Ajouter plus",
    screenshotsCount: "{count} jointes",
    removeScreenshot: "Retirer",
    screenshotHint: "Les captures déclenchent le débat complet d'Arthur, Clara et Leo.",
    tooManyScreenshots: "C'est trop d'un coup - {max} captures maximum par lecture.",
    orMission: "Ou commence par une mission",
    read: "lecture",
    reads: "lectures",
    send: "Envoyer",
  },
  say: { title: "Que dire maintenant", thinking: "Réflexion…", giveMeThree: "Donne-m'en trois de plus", copy: "Copier", copied: "Copié !" },
  read: {
    readingTitle: "Lecture de la salle…",
    spokenTitle: "La salle a parlé",
    yourScreenshot: "Ta capture",
    yourScreenshots: "Tes captures",
    statusDebating: "Les avis sont là — place au débat.",
    statusDone: "Débat terminé. Ta lecture est prête.",
    statusRunning: "Trois lectures en parallèle, en ce moment même.",
    inDebate: "dans le débat",
    goingBackAndForth: "les coachs débattent…",
    threeTakes: "Trois avis, un débat, puis une réponse.",
    seeRead: "Voir ta lecture",
    typing: "en train d'écrire",
    showMore: "Touche pour voir pourquoi",
    showLess: "Masquer",
    agentRoles: { arthur: "Expert en posture", clara: "Psychologie", leo: "Le charmeur" },
  },
  result: {
    title: "Ta lecture",
    shareCopied: "Résumé partageable copié — colle-le où tu veux.",
    thinkingHeading: "Ce qu'elle pense peut-être vraiment…",
    attractionGauge: "Jauge d'attraction",
    lesson: "LEÇON",
    bestResponse: "Meilleure réponse",
    playfulAlt: "Variante joueuse",
    directAlt: "Variante directe",
    copyResponse: "Copier la réponse",
    copied: "Copié !",
    tryAgain: "Réessayer",
    synthesizedFrom: "Synthétisé à partir des trois avis",
    savedToMemory: "Enregistré dans la mémoire de {name} — lecture n°{count}. La prochaine sera plus précise.",
  },
  recap: {
    title: "Récap de la soirée",
    dateVenue: "23h42 · Downtown Lounge",
    nightEnergy: "Une soirée {mode}",
    energyPct: "{pct}% de la soirée en mode {mode} — tu as mené la danse.",
    stats: {
      approaches: "Approches",
      newContacts: "Nouveaux contacts",
      bestConvo: "Meilleure discussion",
      peakConfidence: "Confiance maximale",
    },
    bestLineDropped: "Meilleure phrase de la soirée",
    demoQuote: "«Attention, si tu continues à citer mon livre préféré, je vais devoir t'offrir un café.»",
    shareRecap: "Partager le récap",
    shareDisclaimer: "Partagé comme une carte avec filigrane — juste le résumé, jamais la conversation réelle.",
  },
  playbook: {
    before: "La bibliothèque de missions arrive bientôt. En attendant, lance une mission depuis ",
    homeLink: "Accueil",
    after: " ou passe à une lecture en direct.",
  },
  profile: {
    before: "Tes stats, séries et réglages arriveront ici. Le ",
    recapLink: "récap",
    after: " de ce soir montre déjà où ça va.",
  },
  language: {
    title: "Langue",
    subtitle: "Choisis la langue de l'application et de tes lectures.",
    autoNote: "Auto détecte automatiquement la langue de la conversation depuis la capture.",
  },
};

const pt: Dict = {
  common: { back: "Voltar", seeAll: "Ver tudo" },
  tabs: { home: "Início", playbook: "Playbook", live: "Ao vivo", profile: "Perfil" },
  modes: {
    hype: { name: "Hype", desc: "Muita energia, ambiente agitado." },
    chill: { name: "Tranquilo", desc: "De boa, no ritmo calmo." },
    romantic: { name: "Romântico", desc: "Devagar, só os dois." },
    direct: { name: "Direto", desc: "Sem joguinho, fala logo." },
  },
  missions: {
    icebreaker: { title: "Quebra-gelo", desc: "Quebre o gelo. Comece a conversa." },
    vibeShift: { title: "Mudar o clima", desc: "Mude a energia. Leia o ambiente." },
    exitStrategy: { title: "Saída elegante", desc: "Termine com carinho. Deixe um sorriso." },
  },
  dashboard: {
    greeting: "E aí, {name} 👋",
    heading: "Pronto para hoje à noite?",
    tonightsMode: "Modo de hoje",
    change: "Trocar",
    playbookTitle: "Playbook do Wingman",
    startRead: "Começar uma leitura",
  },
  vibe: {
    eyebrow: "Primeira coisa da noite",
    title: "Qual é o seu modo?",
    subtitle: "Escolha um — ele define o tom da noite toda. Pode mudar quando quiser.",
    lockIn: "Confirmar {mode}",
  },
  live: {
    yourReads: "Suas leituras",
    newContactPrompt: "Com quem você está falando? (o primeiro nome já basta)",
    newChip: "＋ Novo",
    scenarioLabel: "Cenário",
    scenarioPlaceholder: 'Descreva a situação… ex. "Numa cafeteria, ela está lendo meu livro favorito."',
    addScreenshot: "Adicionar print",
    addMoreScreenshots: "Adicionar mais",
    screenshotsCount: "{count} anexados",
    removeScreenshot: "Remover",
    screenshotHint: "Prints ativam o debate completo de Arthur · Clara · Leo.",
    tooManyScreenshots: "Isso é demais de uma vez - máximo de {max} prints por leitura.",
    orMission: "Ou comece por uma missão",
    read: "leitura",
    reads: "leituras",
    send: "Enviar",
  },
  say: { title: "O que dizer agora", thinking: "Pensando…", giveMeThree: "Me dê mais três", copy: "Copiar", copied: "Copiado!" },
  read: {
    readingTitle: "Lendo o ambiente…",
    spokenTitle: "O veredito saiu",
    yourScreenshot: "Seu print",
    yourScreenshots: "Seus prints",
    statusDebating: "As leituras chegaram — agora é debate.",
    statusDone: "Debate encerrado. Sua leitura está pronta.",
    statusRunning: "Três leituras acontecendo em paralelo agora.",
    inDebate: "no debate",
    goingBackAndForth: "os coaches estão debatendo…",
    threeTakes: "Três leituras, um debate, depois uma resposta.",
    seeRead: "Ver sua leitura",
    typing: "digitando",
    showMore: "Toque para ver o porquê",
    showLess: "Ocultar",
    agentRoles: { arthur: "Especialista em postura", clara: "Psicologia", leo: "O charmoso" },
  },
  result: {
    title: "Sua leitura",
    shareCopied: "Resumo compartilhável copiado — cole onde quiser.",
    thinkingHeading: "O que ela pode estar realmente pensando…",
    attractionGauge: "Medidor de atração",
    lesson: "LIÇÃO",
    bestResponse: "Melhor resposta",
    playfulAlt: "Alternativa brincalhona",
    directAlt: "Alternativa direta",
    copyResponse: "Copiar resposta",
    copied: "Copiado!",
    tryAgain: "Tentar de novo",
    synthesizedFrom: "Sintetizado das três leituras",
    savedToMemory: "Salvo na memória de {name} — leitura #{count}. A próxima fica mais precisa.",
  },
  recap: {
    title: "Resumo da noite",
    dateVenue: "23:42 · Downtown Lounge",
    nightEnergy: "Uma noite {mode}",
    energyPct: "{pct}% da noite no modo {mode} — você liderou.",
    stats: {
      approaches: "Aproximações",
      newContacts: "Novos contatos",
      bestConvo: "Melhor papo",
      peakConfidence: "Pico de confiança",
    },
    bestLineDropped: "Melhor frase da noite",
    demoQuote: "“Cuidado, se continuar citando meu livro favorito vou ter que te pagar um café.”",
    shareRecap: "Compartilhar resumo",
    shareDisclaimer: "Compartilhado como um card com marca d'água — só o resumo, nunca a conversa real.",
  },
  playbook: {
    before: "A biblioteca de missões chega em breve. Por enquanto, comece uma missão em ",
    homeLink: "Início",
    after: " ou vá direto para uma leitura ao vivo.",
  },
  profile: {
    before: "Estatísticas, sequências e ajustes vão aparecer aqui. O ",
    recapLink: "resumo",
    after: " de hoje já mostra pra onde isso vai.",
  },
  language: {
    title: "Idioma",
    subtitle: "Escolha o idioma do app e das suas leituras.",
    autoNote: "Auto detecta automaticamente o idioma da conversa a partir do print.",
  },
};

const hi: Dict = {
  common: { back: "वापस", seeAll: "सभी देखें" },
  tabs: { home: "होम", playbook: "प्लेबुक", live: "लाइव", profile: "प्रोफ़ाइल" },
  modes: {
    hype: { name: "हाइप", desc: "पूरा जोश, तेज़ माहौल।" },
    chill: { name: "चिल", desc: "आराम से, धीमी रफ़्तार।" },
    romantic: { name: "रोमांटिक", desc: "धीरे-धीरे, सिर्फ़ दोनों।" },
    direct: { name: "डायरेक्ट", desc: "बिना खेल के, सीधी बात।" },
  },
  missions: {
    icebreaker: { title: "आइसब्रेकर", desc: "बात शुरू करें, झिझक तोड़ें।" },
    vibeShift: { title: "माहौल बदलें", desc: "एनर्जी बदलें, माहौल पढ़ें।" },
    exitStrategy: { title: "एग्ज़िट स्ट्रैटेजी", desc: "गर्मजोशी से खत्म करें, मुस्कान के साथ।" },
  },
  dashboard: {
    greeting: "हाय {name} 👋",
    heading: "आज रात के लिए तैयार?",
    tonightsMode: "आज रात का मोड",
    change: "बदलें",
    playbookTitle: "विंगमैन प्लेबुक",
    startRead: "रीड शुरू करें",
  },
  vibe: {
    eyebrow: "आज रात सबसे पहले",
    title: "आपका मोड क्या है?",
    subtitle: "एक चुनें — यह पूरी रात का रंग तय करेगा। कभी भी बदल सकते हैं।",
    lockIn: "{mode} लॉक करें",
  },
  live: {
    yourReads: "आपकी रीड्स",
    newContactPrompt: "आप किससे बात कर रहे हैं? (सिर्फ़ पहला नाम काफ़ी है)",
    newChip: "＋ नया",
    scenarioLabel: "सिचुएशन",
    scenarioPlaceholder: 'स्थिति बताएं… जैसे "कॉफ़ी शॉप में, वो मेरी पसंदीदा किताब पढ़ रही है।"',
    addScreenshot: "स्क्रीनशॉट जोड़ें",
    addMoreScreenshots: "और जोड़ें",
    screenshotsCount: "{count} जुड़े",
    removeScreenshot: "हटाएं",
    screenshotHint: "स्क्रीनशॉट से आर्थर · क्लारा · लियो की पूरी बहस मिलती है।",
    tooManyScreenshots: "एक बार में इतने ज़्यादा नहीं - हर रीड में अधिकतम {max} स्क्रीनशॉट।",
    orMission: "या किसी मिशन से शुरू करें",
    read: "रीड",
    reads: "रीड्स",
    send: "भेजें",
  },
  say: { title: "आगे क्या कहें", thinking: "सोच रहे हैं…", giveMeThree: "तीन और दो", copy: "कॉपी करें", copied: "कॉपी हो गया!" },
  read: {
    readingTitle: "माहौल पढ़ा जा रहा है…",
    spokenTitle: "फ़ैसला आ गया",
    yourScreenshot: "आपका स्क्रीनशॉट",
    yourScreenshots: "आपके स्क्रीनशॉट्स",
    statusDebating: "तीनों की राय आ गई — अब बहस शुरू।",
    statusDone: "बहस खत्म। आपकी रीड तैयार है।",
    statusRunning: "अभी तीन रीड्स एक साथ चल रही हैं।",
    inDebate: "बहस में",
    goingBackAndForth: "कोच आपस में बहस कर रहे हैं…",
    threeTakes: "तीन राय, एक बहस, फिर एक जवाब।",
    seeRead: "अपनी रीड देखें",
    typing: "टाइप कर रहे हैं",
    showMore: "वजह देखने के लिए टैप करें",
    showLess: "छुपाएं",
    agentRoles: { arthur: "फ़्रेम एक्सपर्ट", clara: "साइकोलॉजी", leo: "चार्मर" },
  },
  result: {
    title: "आपकी रीड",
    shareCopied: "शेयर करने लायक समरी कॉपी हो गई — कहीं भी पेस्ट करें।",
    thinkingHeading: "शायद वो असल में यह सोच रही है…",
    attractionGauge: "अट्रैक्शन गेज",
    lesson: "सबक",
    bestResponse: "सबसे अच्छा जवाब",
    playfulAlt: "मज़ाकिया विकल्प",
    directAlt: "सीधा विकल्प",
    copyResponse: "जवाब कॉपी करें",
    copied: "कॉपी हो गया!",
    tryAgain: "फिर कोशिश करें",
    synthesizedFrom: "तीनों राय से मिलाकर बनाया गया",
    savedToMemory: "{name} की मेमोरी में सेव हुआ — रीड #{count}। अगली बार और सटीक होगा।",
  },
  recap: {
    title: "नाइट आउट रीकैप",
    dateVenue: "11:42 PM · डाउनटाउन लाउंज",
    nightEnergy: "एक {mode} रात",
    energyPct: "रात का {pct}% हिस्सा {mode} मोड में रहा — आपने बाज़ी संभाली।",
    stats: {
      approaches: "अप्रोच",
      newContacts: "नए कॉन्टैक्ट्स",
      bestConvo: "सबसे अच्छी बातचीत",
      peakConfidence: "टॉप कॉन्फ़िडेंस",
    },
    bestLineDropped: "रात की सबसे अच्छी लाइन",
    demoQuote: "“संभल जाओ, मेरी पसंदीदा किताब का ज़िक्र करती रहोगी तो कॉफ़ी पिलानी पड़ेगी।”",
    shareRecap: "रीकैप शेयर करें",
    shareDisclaimer: "यह वॉटरमार्क वाले कार्ड की तरह शेयर होता है — सिर्फ़ समरी, असली बातचीत कभी नहीं।",
  },
  playbook: {
    before: "मिशन लाइब्रेरी जल्द आ रही है। फ़िलहाल, ",
    homeLink: "होम",
    after: " पर किसी मिशन से शुरू करें या लाइव रीड आज़माएं।",
  },
  profile: {
    before: "स्टैट्स, स्ट्रीक्स और सेटिंग्स यहां आएंगी। आज रात का ",
    recapLink: "रीकैप",
    after: " दिखाता है कि यह किस ओर जा रहा है।",
  },
  language: {
    title: "भाषा",
    subtitle: "ऐप और अपनी रीड्स के लिए भाषा चुनें।",
    autoNote: "ऑटो स्क्रीनशॉट से बातचीत की भाषा खुद पहचान लेता है।",
  },
};

const ar: Dict = {
  common: { back: "رجوع", seeAll: "عرض الكل" },
  tabs: { home: "الرئيسية", playbook: "الخطط", live: "مباشر", profile: "الملف الشخصي" },
  modes: {
    hype: { name: "حماس", desc: "طاقة عالية، أجواء صاخبة." },
    chill: { name: "هادئ", desc: "على راحتك، إيقاع هادئ." },
    romantic: { name: "رومانسي", desc: "بهدوء، وجهاً لوجه." },
    direct: { name: "مباشر", desc: "بدون ألاعيب، قلها كما هي." },
  },
  missions: {
    icebreaker: { title: "كسر الجليد", desc: "اكسر الجليد وابدأ المحادثة." },
    vibeShift: { title: "تغيير الأجواء", desc: "غيّر الطاقة واقرأ الموقف." },
    exitStrategy: { title: "خروج أنيق", desc: "أنهِها بدفء واترك ابتسامة." },
  },
  dashboard: {
    greeting: "أهلاً {name} 👋",
    heading: "جاهز لليلة اليوم؟",
    tonightsMode: "وضع الليلة",
    change: "تغيير",
    playbookTitle: "خطط الونجمان",
    startRead: "ابدأ قراءة",
  },
  vibe: {
    eyebrow: "أول شيء الليلة",
    title: "ما هو وضعك؟",
    subtitle: "اختر واحداً — سيحدد طابع الليلة كلها. يمكنك تغييره في أي وقت.",
    lockIn: "تثبيت {mode}",
  },
  live: {
    yourReads: "قراءاتك",
    newContactPrompt: "مع من تتحدث؟ (يكفي الاسم الأول)",
    newChip: "＋ جديد",
    scenarioLabel: "الموقف",
    scenarioPlaceholder: "صف الموقف… مثلاً: \"في مقهى، وهي تقرأ كتابي المفضل.\"",
    addScreenshot: "إضافة لقطة شاشة",
    addMoreScreenshots: "إضافة المزيد",
    screenshotsCount: "تم إرفاق {count}",
    removeScreenshot: "إزالة",
    screenshotHint: "لقطات الشاشة تُفعّل نقاش آرثر وكلارا وليو كاملاً.",
    tooManyScreenshots: "هذا كثير جدًا دفعة واحدة - الحد الأقصى {max} لقطة شاشة لكل قراءة.",
    orMission: "أو ابدأ بمهمة",
    read: "قراءة",
    reads: "قراءات",
    send: "إرسال",
  },
  say: { title: "ماذا تقول الآن", thinking: "يفكر…", giveMeThree: "أعطني ثلاثة أخرى", copy: "نسخ", copied: "تم النسخ!" },
  read: {
    readingTitle: "يقرأون الموقف…",
    spokenTitle: "صدر الحكم",
    yourScreenshot: "لقطة شاشتك",
    yourScreenshots: "لقطات شاشتك",
    statusDebating: "وصلت آراؤهم — الآن يتناقشون.",
    statusDone: "انتهى النقاش. قراءتك جاهزة.",
    statusRunning: "ثلاث قراءات تجري بالتوازي الآن.",
    inDebate: "في النقاش",
    goingBackAndForth: "المدربون يتجادلون الآن…",
    threeTakes: "ثلاث آراء، نقاش واحد، ثم إجابة واحدة.",
    seeRead: "شاهد قراءتك",
    typing: "يكتب",
    showMore: "اضغط لمعرفة السبب",
    showLess: "إخفاء",
    agentRoles: { arthur: "خبير الهيبة", clara: "عِلم النفس", leo: "الساحر" },
  },
  result: {
    title: "قراءتك",
    shareCopied: "تم نسخ ملخص قابل للمشاركة — الصقه في أي مكان.",
    thinkingHeading: "ربما هي تفكر فعلاً في…",
    attractionGauge: "مقياس الانجذاب",
    lesson: "الدرس",
    bestResponse: "أفضل رد",
    playfulAlt: "بديل مرح",
    directAlt: "بديل مباشر",
    copyResponse: "نسخ الرد",
    copied: "تم النسخ!",
    tryAgain: "حاول مجدداً",
    synthesizedFrom: "مُستخلص من الآراء الثلاثة",
    savedToMemory: "تم الحفظ في ذاكرة {name} — القراءة رقم {count}. القادمة ستكون أدق.",
  },
  recap: {
    title: "ملخص السهرة",
    dateVenue: "11:42 مساءً · Downtown Lounge",
    nightEnergy: "ليلة {mode}",
    energyPct: "{pct}% من الليلة في وضع {mode} — أنت من قاد الموقف.",
    stats: {
      approaches: "المحاولات",
      newContacts: "جهات اتصال جديدة",
      bestConvo: "أفضل محادثة",
      peakConfidence: "أعلى ثقة",
    },
    bestLineDropped: "أفضل جملة الليلة",
    demoQuote: "“انتبه، إذا استمريت تقتبس من كتابي المفضل سأضطر لأدعوك لقهوة.”",
    shareRecap: "مشاركة الملخص",
    shareDisclaimer: "تتم المشاركة كبطاقة تحمل علامة مائية — الملخص فقط، وليس المحادثة الفعلية أبداً.",
  },
  playbook: {
    before: "مكتبة المهام قريباً. في الوقت الحالي، ابدأ مهمة من ",
    homeLink: "الرئيسية",
    after: " أو جرّب قراءة مباشرة.",
  },
  profile: {
    before: "الإحصائيات والسلاسل والإعدادات ستظهر هنا. ",
    recapLink: "ملخص",
    after: " الليلة يوضح إلى أين يتجه هذا.",
  },
  language: {
    title: "اللغة",
    subtitle: "اختر لغة التطبيق ولغة قراءاتك.",
    autoNote: "يكتشف \"تلقائي\" لغة المحادثة من لقطة الشاشة تلقائياً.",
  },
};

export const translations: Record<UiLanguage, Dict> = { en, es, ar, fr, pt, hi };

function getPath(dict: Dict, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, dict);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

/** t("result.savedToMemory", { name: "Sarah", count: 2 }) */
export function useT() {
  const language = useSession((s) => s.language);
  const dict = translations[uiLanguage(language)];
  return (path: string, vars?: Record<string, string | number>): string => {
    const value = getPath(dict, path) ?? getPath(en, path);
    return typeof value === "string" ? interpolate(value, vars) : path;
  };
}
