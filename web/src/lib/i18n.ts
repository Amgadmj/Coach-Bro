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
  common: {
    back: string;
    seeAll: string;
    /** Friendly copy shown instead of a raw fetch/network exception string. */
    offlineMessage: string;
    installTitle: string;
    installAction: string;
    installDismiss: string;
  };
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
    playbookSummaryTitle: string;
    playbookSummaryDesc: string;
    startRead: string;
  };
  vibe: { eyebrow: string; title: string; subtitle: string; lockIn: string };
  /** Copy for the once-ever IdentitySheet (onboarding) and IdentityPicker
   * (Profile, editable anytime) - see components/IdentitySheet.tsx and
   * IdentityPicker.tsx. genderLabel/interestedInLabel are shared by both;
   * the rest split sheet-only vs. picker-only, same pattern as vibe.*
   * (sheet) vs. dashboard.tonightsMode (label) for Social Mode. */
  identity: {
    eyebrow: string;
    sheetTitle: string;
    sheetSubtitle: string;
    continueCta: string;
    pickerTitle: string;
    pickerSubtitle: string;
    genderLabel: string;
    interestedInLabel: string;
    updated: string;
  };
  genders: { male: string; female: string; nonBinary: string };
  interests: { men: string; women: string; everyone: string };
  live: {
    yourReads: string;
    newContactPrompt: string;
    /** Asked right after naming a new contact - see app/live/page.tsx's
     * "+ New" flow and lib/api.ts::setContactGender. A free-text prompt
     * (matching the existing newContactPrompt's own crude-but-working
     * window.prompt pattern), parsed loosely rather than a proper picker. */
    contactGenderPrompt: string;
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
    /** Shown near the attach row while POST /extract is running for the
     * current screenshot batch - see app/live/page.tsx. */
    extracting: string;
    /** Non-blocking - Send still works with the raw screenshot either way. */
    extractionFailed: string;
    /** The delimiter marking the auto-inserted transcript block in the
     * scenario textarea, so it can be found-and-replaced on the next
     * extraction without touching text the user typed themselves. */
    extractedSeparator: string;
  };
  say: { title: string; thinking: string; giveMeThree: string; copy: string; copied: string };
  read: {
    readingTitle: string;
    spokenTitle: string;
    yourScreenshot: string;
    yourScreenshots: string;
    yourMessage: string;
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
    tryAgain: string;
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
    shareConfirmTitle: string;
    shareDisclaimer: string;
    shareConfirm: string;
    shareCancel: string;
    shareCopied: string;
  };
  playbook: { subtitle: string };
  profile: { emptyTitle: string; emptyBody: string };
  language: { title: string; subtitle: string; autoNote: string; updated: string };
  /** Copy for the first-run WelcomeModal and every screen's <Coachmark>
   * sequence - see lib/tutorial.ts and components/Coachmark.tsx. */
  tutorial: {
    welcomeTitle: string;
    welcomeBody: string;
    welcomePoint1: string;
    welcomePoint2: string;
    welcomePoint3: string;
    showMeAround: string;
    skipTour: string;
    stepOf: string;
    back: string;
    next: string;
    done: string;
    skip: string;
    replay: string;
    home: {
      modeTitle: string;
      modeBody: string;
      playbookTitle: string;
      playbookBody: string;
      ctaTitle: string;
      ctaBody: string;
    };
    live: {
      contactsTitle: string;
      contactsBody: string;
      scenarioTitle: string;
      scenarioBody: string;
      sendTitle: string;
      sendBody: string;
    };
    read: { summaryTitle: string; summaryBody: string };
    result: {
      gaugeTitle: string;
      gaugeBody: string;
      bestTitle: string;
      bestBody: string;
      agentsTitle: string;
      agentsBody: string;
    };
    profile: { languageTitle: string; languageBody: string };
  };
}

const en: Dict = {
  common: {
    back: "Back",
    seeAll: "See all",
    offlineMessage: "No connection - check your network and try again.",
    installTitle: "Install Bro Code for quick access",
    installAction: "Install",
    installDismiss: "Not now",
  },
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
    playbookSummaryTitle: "3 missions ready",
    playbookSummaryDesc: "Icebreakers, vibe shifts, exit lines — all in one place.",
    startRead: "Start a read",
  },
  vibe: {
    eyebrow: "First thing tonight",
    title: "What's your mode?",
    subtitle: "Pick one — it tints the whole night. Change it anytime.",
    lockIn: "Lock in {mode}",
  },
  identity: {
    eyebrow: "One quick thing",
    sheetTitle: "Tell us about you",
    sheetSubtitle: "This tunes pronouns and coaching to fit your situation — change it anytime in Profile.",
    continueCta: "Continue",
    pickerTitle: "About you",
    pickerSubtitle: "Tunes pronouns and coaching to fit your situation.",
    genderLabel: "You are",
    interestedInLabel: "Interested in",
    updated: "Updated",
  },
  genders: { male: "Male", female: "Female", nonBinary: "Non-binary" },
  interests: { men: "Men", women: "Women", everyone: "Everyone" },
  live: {
    yourReads: "Your reads",
    newContactPrompt: "Who are you talking to? (first name is fine)",
    contactGenderPrompt: "Are they a man, woman, or non-binary? (leave blank to skip)",
    newChip: "＋ New",
    scenarioLabel: "Scenario",
    scenarioPlaceholder: 'Describe the situation… e.g. "At a coffee shop, they\'re reading my favorite book."',
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
    extracting: "Reading screenshot…",
    extractionFailed: "Couldn't read that screenshot automatically - you can still send it.",
    extractedSeparator: "--- Extracted from screenshot ---",
  },
  say: { title: "What to say next", thinking: "Thinking…", giveMeThree: "Give me three more", copy: "Copy", copied: "Copied!" },
  read: {
    readingTitle: "Reading the room…",
    spokenTitle: "The room has spoken",
    yourScreenshot: "Your screenshot",
    yourScreenshots: "Your screenshots",
    yourMessage: "Your message",
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
    tryAgain: "Try again",
    agentRoles: { arthur: "Frame expert", clara: "Psychology", leo: "The charmer" },
  },
  result: {
    title: "Your read",
    shareCopied: "Copied a shareable summary — paste it anywhere.",
    thinkingHeading: "What they might actually be thinking…",
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
    shareConfirmTitle: "Before you share",
    shareDisclaimer: "Shares as a watermarked story card — the summary, never the raw conversation.",
    shareConfirm: "Share",
    shareCancel: "Cancel",
    shareCopied: "Copied a shareable summary — paste it anywhere.",
  },
  playbook: {
    subtitle: "Every mission, ready whenever you need a script.",
  },
  profile: {
    emptyTitle: "No stats yet",
    emptyBody: "Complete your first read tonight and your streak starts here.",
  },
  language: {
    title: "Language",
    subtitle: "Choose the language for the app and for your reads.",
    autoNote: "Auto detects the conversation's language from the screenshot automatically.",
    updated: "Language updated",
  },
  tutorial: {
    welcomeTitle: "Meet your wingman",
    welcomeBody: "Bro Code reads the room for you and turns it into one clear next move.",
    welcomePoint1: "Paste a screenshot or describe the situation - three AI coaches debate it live.",
    welcomePoint2:
      "Arthur (frame), Clara (psychology), and Leo (charm) argue it out, then one Synthesizer gives you a single best response - never negging, never games.",
    welcomePoint3:
      "Screenshots are processed in memory and discarded - only the read itself gets saved, per contact.",
    showMeAround: "Show me around",
    skipTour: "Skip the tour",
    stepOf: "Step {step} of {total}",
    back: "Back",
    next: "Next",
    done: "Got it",
    skip: "Skip",
    replay: "Replay tutorial",
    home: {
      modeTitle: "Tonight's mode",
      modeBody: "This tints suggestions across the whole app - hype, chill, romantic, or direct. Tap Change anytime.",
      playbookTitle: "The Playbook",
      playbookBody:
        "Icebreaker, Vibe Shift, Exit Strategy - three ready-made scripts. They're peers, not a locked sequence, so jump to whichever fits.",
      ctaTitle: "Start a read",
      ctaBody: "The one button that starts everything - paste a screenshot or describe what's happening.",
    },
    live: {
      contactsTitle: "Save it per person",
      contactsBody: "Tag a read to a contact and your coach gets sharper about them with every read.",
      scenarioTitle: "Screenshot or scenario",
      scenarioBody: "Drop in a screenshot, or just type what's going on - both get the full three-coach debate.",
      sendTitle: "Send it in",
      sendBody: "Arthur, Clara, and Leo will debate this live, then one Synthesizer gives you the final call.",
    },
    read: {
      summaryTitle: "The debate, live",
      summaryBody: "Watch three independent takes come in, then see them hash it out before the verdict lands.",
    },
    result: {
      gaugeTitle: "Attraction Gauge",
      gaugeBody: "A 0-100 read on how into it they seem. Tap it to see the reasoning behind the number.",
      bestTitle: "The best response",
      bestBody:
        "The Synthesizer's pick - always emotionally intelligent, never negging or manipulation, even if one coach argued for it.",
      agentsTitle: "One verdict, three perspectives",
      agentsBody: "Every answer here is the result of a real debate, arbitrated down to one call.",
    },
    profile: {
      languageTitle: "Language",
      languageBody:
        "Switch the app and your AI responses anytime - Auto detects the conversation's language straight from the screenshot.",
    },
  },
};

const es: Dict = {
  common: {
    back: "Atrás",
    seeAll: "Ver todo",
    offlineMessage: "Sin conexión - revisa tu red e inténtalo de nuevo.",
    installTitle: "Instala Bro Code para acceso rápido",
    installAction: "Instalar",
    installDismiss: "Ahora no",
  },
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
    playbookSummaryTitle: "3 misiones listas",
    playbookSummaryDesc: "Rompehielos, cambios de ambiente, salidas — todo en un solo lugar.",
    startRead: "Empezar una lectura",
  },
  vibe: {
    eyebrow: "Lo primero esta noche",
    title: "¿Cuál es tu modo?",
    subtitle: "Elige uno — define el tono de toda la noche. Puedes cambiarlo cuando quieras.",
    lockIn: "Confirmar {mode}",
  },
  identity: {
    eyebrow: "Antes de empezar",
    sheetTitle: "Cuéntanos sobre ti",
    sheetSubtitle: "Esto ajusta los pronombres y el coaching a tu situación — puedes cambiarlo cuando quieras en tu perfil.",
    continueCta: "Continuar",
    pickerTitle: "Sobre ti",
    pickerSubtitle: "Ajusta los pronombres y el coaching a tu situación.",
    genderLabel: "Eres",
    interestedInLabel: "Te interesan",
    updated: "Actualizado",
  },
  genders: { male: "Hombre", female: "Mujer", nonBinary: "No binario" },
  interests: { men: "Hombres", women: "Mujeres", everyone: "Todos" },
  live: {
    yourReads: "Tus lecturas",
    newContactPrompt: "¿Con quién estás hablando? (con el nombre basta)",
    contactGenderPrompt: "¿Es hombre, mujer o no binario? (déjalo en blanco para omitir)",
    newChip: "＋ Nuevo",
    scenarioLabel: "Escenario",
    scenarioPlaceholder: 'Describe la situación… ej. "En una cafetería, esa persona está leyendo mi libro favorito."',
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
    extracting: "Leyendo la captura…",
    extractionFailed: "No se pudo leer esa captura automáticamente - de todos modos puedes enviarla.",
    extractedSeparator: "--- Extraído de la captura ---",
  },
  say: { title: "Qué decir ahora", thinking: "Pensando…", giveMeThree: "Dame tres más", copy: "Copiar", copied: "¡Copiado!" },
  read: {
    readingTitle: "Leyendo la sala…",
    spokenTitle: "La sala ya habló",
    yourScreenshot: "Tu captura",
    yourScreenshots: "Tus capturas",
    yourMessage: "Tu mensaje",
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
    tryAgain: "Intentar de nuevo",
    agentRoles: { arthur: "Experto en actitud", clara: "Psicología", leo: "El encantador" },
  },
  result: {
    title: "Tu lectura",
    shareCopied: "Se copió un resumen para compartir — pégalo donde quieras.",
    thinkingHeading: "Lo que esa persona podría estar pensando en realidad…",
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
    shareConfirmTitle: "Antes de compartir",
    shareDisclaimer: "Se comparte como una tarjeta con marca de agua — solo el resumen, nunca la conversación real.",
    shareConfirm: "Compartir",
    shareCancel: "Cancelar",
    shareCopied: "Se copió un resumen para compartir — pégalo donde quieras.",
  },
  playbook: {
    subtitle: "Todas las misiones, listas cuando necesites un guion.",
  },
  profile: {
    emptyTitle: "Aún no hay estadísticas",
    emptyBody: "Completa tu primera lectura esta noche y tu racha empieza aquí.",
  },
  language: {
    title: "Idioma",
    subtitle: "Elige el idioma de la app y de tus lecturas.",
    autoNote: "Auto detecta el idioma de la conversación directamente desde la captura.",
    updated: "Idioma actualizado",
  },
  tutorial: {
    welcomeTitle: "Conoce a tu wingman",
    welcomeBody: "Bro Code lee el ambiente por ti y lo convierte en un solo paso claro.",
    welcomePoint1: "Pega una captura o describe la situación - tres coaches de IA la debaten en vivo.",
    welcomePoint2:
      "Arthur (actitud), Clara (psicología) y Leo (encanto) discuten, y luego un Sintetizador te da una sola mejor respuesta - sin negs, sin juegos.",
    welcomePoint3: "Las capturas se procesan en memoria y se descartan - solo se guarda la lectura, por contacto.",
    showMeAround: "Muéstrame cómo funciona",
    skipTour: "Saltar el recorrido",
    stepOf: "Paso {step} de {total}",
    back: "Atrás",
    next: "Siguiente",
    done: "Entendido",
    skip: "Saltar",
    replay: "Repetir el tutorial",
    home: {
      modeTitle: "Modo de esta noche",
      modeBody: "Esto tiñe las sugerencias en toda la app - hype, relax, romántico o directo. Toca Cambiar cuando quieras.",
      playbookTitle: "El Playbook",
      playbookBody:
        "Rompehielos, Cambio de ambiente, Salida elegante - tres guiones listos. Son opciones iguales, no una secuencia bloqueada, así que elige la que encaje.",
      ctaTitle: "Empezar una lectura",
      ctaBody: "El único botón que lo pone todo en marcha - pega una captura o describe qué está pasando.",
    },
    live: {
      contactsTitle: "Guárdalo por persona",
      contactsBody: "Etiqueta una lectura a un contacto y tu coach será más preciso con cada lectura.",
      scenarioTitle: "Captura o situación",
      scenarioBody:
        "Sube una captura o simplemente escribe qué está pasando - ambas activan el debate completo de los tres coaches.",
      sendTitle: "Envíalo",
      sendBody: "Arthur, Clara y Leo lo debatirán en vivo, y luego un Sintetizador te da la decisión final.",
    },
    read: {
      summaryTitle: "El debate, en vivo",
      summaryBody: "Mira llegar tres lecturas independientes, y luego cómo las discuten antes de que llegue el veredicto.",
    },
    result: {
      gaugeTitle: "Medidor de atracción",
      gaugeBody: "Una lectura de 0 a 100 de cuánto le interesa. Tócalo para ver el razonamiento detrás del número.",
      bestTitle: "La mejor respuesta",
      bestBody:
        "La elección del Sintetizador - siempre con inteligencia emocional, nunca negs ni manipulación, aunque un coach lo haya propuesto.",
      agentsTitle: "Un veredicto, tres perspectivas",
      agentsBody: "Cada respuesta aquí es el resultado de un debate real, resuelto en una sola decisión.",
    },
    profile: {
      languageTitle: "Idioma",
      languageBody:
        "Cambia el idioma de la app y de tus lecturas de IA cuando quieras - Auto detecta el idioma de la conversación directamente desde la captura.",
    },
  },
};

const fr: Dict = {
  common: {
    back: "Retour",
    seeAll: "Tout voir",
    offlineMessage: "Pas de connexion - vérifie ton réseau et réessaie.",
    installTitle: "Installe Bro Code pour un accès rapide",
    installAction: "Installer",
    installDismiss: "Pas maintenant",
  },
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
    playbookSummaryTitle: "3 missions prêtes",
    playbookSummaryDesc: "Brise-glace, changements d'ambiance, sorties — tout au même endroit.",
    startRead: "Commencer une lecture",
  },
  vibe: {
    eyebrow: "En premier ce soir",
    title: "Quel est ton mode ?",
    subtitle: "Choisis-en un — il colore toute la soirée. Modifiable à tout moment.",
    lockIn: "Valider {mode}",
  },
  identity: {
    eyebrow: "Avant de commencer",
    sheetTitle: "Parle-nous de toi",
    sheetSubtitle: "Ça ajuste les pronoms et le coaching à ta situation — modifiable à tout moment dans ton profil.",
    continueCta: "Continuer",
    pickerTitle: "À propos de toi",
    pickerSubtitle: "Ajuste les pronoms et le coaching à ta situation.",
    genderLabel: "Tu es",
    interestedInLabel: "Intéressé(e) par",
    updated: "Mis à jour",
  },
  genders: { male: "Homme", female: "Femme", nonBinary: "Non-binaire" },
  interests: { men: "Hommes", women: "Femmes", everyone: "Tout le monde" },
  live: {
    yourReads: "Tes lectures",
    newContactPrompt: "À qui parles-tu ? (le prénom suffit)",
    contactGenderPrompt: "C'est un homme, une femme, ou non-binaire ? (laisse vide pour passer)",
    newChip: "＋ Nouveau",
    scenarioLabel: "Scénario",
    scenarioPlaceholder: 'Décris la situation… ex. "Dans un café, cette personne lit mon livre préféré."',
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
    extracting: "Lecture de la capture…",
    extractionFailed: "Impossible de lire cette capture automatiquement - tu peux quand même l'envoyer.",
    extractedSeparator: "--- Extrait de la capture ---",
  },
  say: { title: "Que dire maintenant", thinking: "Réflexion…", giveMeThree: "Donne-m'en trois de plus", copy: "Copier", copied: "Copié !" },
  read: {
    readingTitle: "Lecture de la salle…",
    spokenTitle: "La salle a parlé",
    yourScreenshot: "Ta capture",
    yourScreenshots: "Tes captures",
    yourMessage: "Ton message",
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
    tryAgain: "Réessayer",
    agentRoles: { arthur: "Expert en posture", clara: "Psychologie", leo: "Le charmeur" },
  },
  result: {
    title: "Ta lecture",
    shareCopied: "Résumé partageable copié — colle-le où tu veux.",
    thinkingHeading: "Ce que cette personne pense peut-être vraiment…",
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
    shareConfirmTitle: "Avant de partager",
    shareDisclaimer: "Partagé comme une carte avec filigrane — juste le résumé, jamais la conversation réelle.",
    shareConfirm: "Partager",
    shareCancel: "Annuler",
    shareCopied: "Résumé partageable copié — colle-le où tu veux.",
  },
  playbook: {
    subtitle: "Toutes les missions, prêtes dès que tu as besoin d'un texte.",
  },
  profile: {
    emptyTitle: "Pas encore de stats",
    emptyBody: "Termine ta première lecture ce soir et ta série commence ici.",
  },
  language: {
    title: "Langue",
    subtitle: "Choisis la langue de l'application et de tes lectures.",
    autoNote: "Auto détecte automatiquement la langue de la conversation depuis la capture.",
    updated: "Langue mise à jour",
  },
  tutorial: {
    welcomeTitle: "Découvre ton wingman",
    welcomeBody: "Bro Code lit l'ambiance pour toi et la transforme en une action claire.",
    welcomePoint1: "Colle une capture ou décris la situation - trois coachs IA en débattent en direct.",
    welcomePoint2:
      "Arthur (posture), Clara (psychologie) et Leo (charme) débattent, puis un Synthétiseur te donne une seule meilleure réponse - jamais de neg, jamais de manipulation.",
    welcomePoint3:
      "Les captures sont traitées en mémoire puis supprimées - seule la lecture elle-même est enregistrée, par contact.",
    showMeAround: "Montre-moi comment ça marche",
    skipTour: "Passer la visite",
    stepOf: "Étape {step} sur {total}",
    back: "Retour",
    next: "Suivant",
    done: "Compris",
    skip: "Passer",
    replay: "Revoir le tutoriel",
    home: {
      modeTitle: "Mode de ce soir",
      modeBody: "Ça teinte les suggestions dans toute l'app - hype, chill, romantique ou direct. Touche Changer quand tu veux.",
      playbookTitle: "Le Playbook",
      playbookBody:
        "Brise-glace, Changement d'ambiance, Sortie réussie - trois scripts prêts à l'emploi. Ce sont des égaux, pas une séquence verrouillée, choisis celui qui convient.",
      ctaTitle: "Commencer une lecture",
      ctaBody: "Le seul bouton qui lance tout - colle une capture ou décris ce qui se passe.",
    },
    live: {
      contactsTitle: "Enregistre par personne",
      contactsBody: "Associe une lecture à un contact et ton coach devient plus précis à chaque lecture.",
      scenarioTitle: "Capture ou scénario",
      scenarioBody:
        "Ajoute une capture, ou décris simplement la situation - les deux déclenchent le débat complet des trois coachs.",
      sendTitle: "Envoie",
      sendBody: "Arthur, Clara et Leo en débattront en direct, puis un Synthétiseur te donne la décision finale.",
    },
    read: {
      summaryTitle: "Le débat, en direct",
      summaryBody: "Regarde trois avis indépendants arriver, puis les voir se confronter avant que le verdict tombe.",
    },
    result: {
      gaugeTitle: "Jauge d'attraction",
      gaugeBody: "Une note de 0 à 100 sur son intérêt. Touche-la pour voir le raisonnement derrière le chiffre.",
      bestTitle: "La meilleure réponse",
      bestBody:
        "Le choix du Synthétiseur - toujours avec intelligence émotionnelle, jamais de neg ni de manipulation, même si un coach l'a proposé.",
      agentsTitle: "Un verdict, trois points de vue",
      agentsBody: "Chaque réponse ici est le résultat d'un vrai débat, arbitré en une seule décision.",
    },
    profile: {
      languageTitle: "Langue",
      languageBody:
        "Change la langue de l'app et de tes réponses IA quand tu veux - Auto détecte la langue de la conversation directement depuis la capture.",
    },
  },
};

const pt: Dict = {
  common: {
    back: "Voltar",
    seeAll: "Ver tudo",
    offlineMessage: "Sem conexão - verifique sua rede e tente novamente.",
    installTitle: "Instale o Bro Code para acesso rápido",
    installAction: "Instalar",
    installDismiss: "Agora não",
  },
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
    playbookSummaryTitle: "3 missões prontas",
    playbookSummaryDesc: "Quebra-gelo, mudanças de clima, saídas — tudo num só lugar.",
    startRead: "Começar uma leitura",
  },
  vibe: {
    eyebrow: "Primeira coisa da noite",
    title: "Qual é o seu modo?",
    subtitle: "Escolha um — ele define o tom da noite toda. Pode mudar quando quiser.",
    lockIn: "Confirmar {mode}",
  },
  identity: {
    eyebrow: "Antes de começar",
    sheetTitle: "Conte um pouco sobre você",
    sheetSubtitle: "Isso ajusta os pronomes e o coaching pra sua situação — dá pra mudar quando quiser no seu perfil.",
    continueCta: "Continuar",
    pickerTitle: "Sobre você",
    pickerSubtitle: "Ajusta os pronomes e o coaching pra sua situação.",
    genderLabel: "Você é",
    interestedInLabel: "Interessado em",
    updated: "Atualizado",
  },
  genders: { male: "Homem", female: "Mulher", nonBinary: "Não binário" },
  interests: { men: "Homens", women: "Mulheres", everyone: "Todos" },
  live: {
    yourReads: "Suas leituras",
    newContactPrompt: "Com quem você está falando? (o primeiro nome já basta)",
    contactGenderPrompt: "É homem, mulher ou não binário? (deixe em branco pra pular)",
    newChip: "＋ Novo",
    scenarioLabel: "Cenário",
    scenarioPlaceholder: 'Descreva a situação… ex. "Numa cafeteria, essa pessoa está lendo meu livro favorito."',
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
    extracting: "Lendo o print…",
    extractionFailed: "Não deu pra ler esse print automaticamente - você ainda pode enviá-lo.",
    extractedSeparator: "--- Extraído do print ---",
  },
  say: { title: "O que dizer agora", thinking: "Pensando…", giveMeThree: "Me dê mais três", copy: "Copiar", copied: "Copiado!" },
  read: {
    readingTitle: "Lendo o ambiente…",
    spokenTitle: "O veredito saiu",
    yourScreenshot: "Seu print",
    yourScreenshots: "Seus prints",
    yourMessage: "Sua mensagem",
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
    tryAgain: "Tentar de novo",
    agentRoles: { arthur: "Especialista em postura", clara: "Psicologia", leo: "O charmoso" },
  },
  result: {
    title: "Sua leitura",
    shareCopied: "Resumo compartilhável copiado — cole onde quiser.",
    thinkingHeading: "O que essa pessoa pode estar realmente pensando…",
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
    shareConfirmTitle: "Antes de compartilhar",
    shareDisclaimer: "Compartilhado como um card com marca d'água — só o resumo, nunca a conversa real.",
    shareConfirm: "Compartilhar",
    shareCancel: "Cancelar",
    shareCopied: "Resumo compartilhável copiado — cole onde quiser.",
  },
  playbook: {
    subtitle: "Todas as missões, prontas sempre que você precisar de um roteiro.",
  },
  profile: {
    emptyTitle: "Ainda sem estatísticas",
    emptyBody: "Complete sua primeira leitura hoje à noite e sua sequência começa aqui.",
  },
  language: {
    title: "Idioma",
    subtitle: "Escolha o idioma do app e das suas leituras.",
    autoNote: "Auto detecta automaticamente o idioma da conversa a partir do print.",
    updated: "Idioma atualizado",
  },
  tutorial: {
    welcomeTitle: "Conheça seu wingman",
    welcomeBody: "O Bro Code lê o ambiente por você e transforma isso em um próximo passo claro.",
    welcomePoint1: "Cole um print ou descreva a situação - três coaches de IA debatem em tempo real.",
    welcomePoint2:
      "Arthur (postura), Clara (psicologia) e Leo (charme) discutem, e então um Sintetizador te dá uma única melhor resposta - sem climão, sem joguinho.",
    welcomePoint3: "Os prints são processados na memória e descartados - só a leitura em si é salva, por contato.",
    showMeAround: "Me mostra como funciona",
    skipTour: "Pular o tour",
    stepOf: "Passo {step} de {total}",
    back: "Voltar",
    next: "Próximo",
    done: "Entendi",
    skip: "Pular",
    replay: "Repetir o tutorial",
    home: {
      modeTitle: "Modo de hoje",
      modeBody: "Isso colore as sugestões em todo o app - hype, tranquilo, romântico ou direto. Toque em Trocar quando quiser.",
      playbookTitle: "O Playbook",
      playbookBody:
        "Quebra-gelo, Mudar o clima, Saída elegante - três roteiros prontos. São opções iguais, não uma sequência travada, então vá para o que encaixar.",
      ctaTitle: "Começar uma leitura",
      ctaBody: "O único botão que começa tudo - cole um print ou descreva o que está acontecendo.",
    },
    live: {
      contactsTitle: "Salve por pessoa",
      contactsBody: "Marque uma leitura para um contato e seu coach fica mais afiado a cada leitura.",
      scenarioTitle: "Print ou cenário",
      scenarioBody:
        "Anexe um print ou apenas digite o que está acontecendo - os dois ativam o debate completo dos três coaches.",
      sendTitle: "Envie",
      sendBody: "Arthur, Clara e Leo vão debater isso em tempo real, e então um Sintetizador te dá a decisão final.",
    },
    read: {
      summaryTitle: "O debate, em tempo real",
      summaryBody: "Veja três leituras independentes chegando, e depois o debate entre elas antes do veredito.",
    },
    result: {
      gaugeTitle: "Medidor de atração",
      gaugeBody: "Uma leitura de 0 a 100 de quanto essa pessoa está interessada. Toque para ver o raciocínio por trás do número.",
      bestTitle: "A melhor resposta",
      bestBody:
        "A escolha do Sintetizador - sempre com inteligência emocional, nunca climão ou manipulação, mesmo que um coach tenha sugerido.",
      agentsTitle: "Um veredito, três perspectivas",
      agentsBody: "Cada resposta aqui é o resultado de um debate real, decidido em uma única resposta.",
    },
    profile: {
      languageTitle: "Idioma",
      languageBody:
        "Troque o idioma do app e das suas leituras de IA quando quiser - o Auto detecta o idioma da conversa direto do print.",
    },
  },
};

const hi: Dict = {
  common: {
    back: "वापस",
    seeAll: "सभी देखें",
    offlineMessage: "कोई कनेक्शन नहीं - अपना नेटवर्क जांचें और फिर कोशिश करें।",
    installTitle: "जल्दी एक्सेस के लिए Bro Code इंस्टॉल करें",
    installAction: "इंस्टॉल करें",
    installDismiss: "अभी नहीं",
  },
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
    playbookSummaryTitle: "3 मिशन तैयार",
    playbookSummaryDesc: "आइसब्रेकर, माहौल बदलना, एग्ज़िट — सब एक ही जगह।",
    startRead: "रीड शुरू करें",
  },
  vibe: {
    eyebrow: "आज रात सबसे पहले",
    title: "आपका मोड क्या है?",
    subtitle: "एक चुनें — यह पूरी रात का रंग तय करेगा। कभी भी बदल सकते हैं।",
    lockIn: "{mode} लॉक करें",
  },
  identity: {
    eyebrow: "बस एक और बात",
    sheetTitle: "अपने बारे में बताएं",
    sheetSubtitle: "इससे प्रोनाउन और कोचिंग आपकी स्थिति के हिसाब से सेट होंगे — इसे कभी भी प्रोफ़ाइल में बदल सकते हैं।",
    continueCta: "आगे बढ़ें",
    pickerTitle: "आपके बारे में",
    pickerSubtitle: "प्रोनाउन और कोचिंग आपकी स्थिति के हिसाब से सेट करता है।",
    genderLabel: "आप हैं",
    interestedInLabel: "किसमें दिलचस्पी है",
    updated: "अपडेट हो गया",
  },
  genders: { male: "पुरुष", female: "महिला", nonBinary: "नॉन-बाइनरी" },
  interests: { men: "पुरुष", women: "महिलाएं", everyone: "सभी" },
  live: {
    yourReads: "आपकी रीड्स",
    newContactPrompt: "आप किससे बात कर रहे हैं? (सिर्फ़ पहला नाम काफ़ी है)",
    contactGenderPrompt: "क्या वो पुरुष हैं, महिला हैं, या नॉन-बाइनरी? (छोड़ने के लिए खाली रहने दें)",
    newChip: "＋ नया",
    scenarioLabel: "सिचुएशन",
    scenarioPlaceholder: 'स्थिति बताएं… जैसे "कॉफ़ी शॉप में, वो मेरी पसंदीदा किताब पढ़ रहे हैं।"',
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
    extracting: "स्क्रीनशॉट पढ़ा जा रहा है…",
    extractionFailed: "वो स्क्रीनशॉट अपने आप नहीं पढ़ पाए - फिर भी आप इसे भेज सकते हैं।",
    extractedSeparator: "--- स्क्रीनशॉट से निकाला गया ---",
  },
  say: { title: "आगे क्या कहें", thinking: "सोच रहे हैं…", giveMeThree: "तीन और दो", copy: "कॉपी करें", copied: "कॉपी हो गया!" },
  read: {
    readingTitle: "माहौल पढ़ा जा रहा है…",
    spokenTitle: "फ़ैसला आ गया",
    yourScreenshot: "आपका स्क्रीनशॉट",
    yourScreenshots: "आपके स्क्रीनशॉट्स",
    yourMessage: "आपका मैसेज",
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
    tryAgain: "फिर कोशिश करें",
    agentRoles: { arthur: "फ़्रेम एक्सपर्ट", clara: "साइकोलॉजी", leo: "चार्मर" },
  },
  result: {
    title: "आपकी रीड",
    shareCopied: "शेयर करने लायक समरी कॉपी हो गई — कहीं भी पेस्ट करें।",
    thinkingHeading: "शायद वो असल में यह सोच रहे हैं…",
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
    shareConfirmTitle: "शेयर करने से पहले",
    shareDisclaimer: "यह वॉटरमार्क वाले कार्ड की तरह शेयर होता है — सिर्फ़ समरी, असली बातचीत कभी नहीं।",
    shareConfirm: "शेयर करें",
    shareCancel: "रद्द करें",
    shareCopied: "शेयर करने लायक समरी कॉपी हो गई — कहीं भी पेस्ट करें।",
  },
  playbook: {
    subtitle: "जब भी स्क्रिप्ट चाहिए, हर मिशन यहां तैयार है।",
  },
  profile: {
    emptyTitle: "अभी कोई स्टैट्स नहीं",
    emptyBody: "आज रात अपनी पहली रीड पूरी करें और यहीं से आपकी स्ट्रीक शुरू होगी।",
  },
  language: {
    title: "भाषा",
    subtitle: "ऐप और अपनी रीड्स के लिए भाषा चुनें।",
    autoNote: "ऑटो स्क्रीनशॉट से बातचीत की भाषा खुद पहचान लेता है।",
    updated: "भाषा अपडेट हो गई",
  },
  tutorial: {
    welcomeTitle: "अपने विंगमैन से मिलें",
    welcomeBody: "Bro Code माहौल पढ़ता है और उसे एक साफ़ अगले कदम में बदल देता है।",
    welcomePoint1: "स्क्रीनशॉट पेस्ट करें या स्थिति बताएं - तीन AI कोच लाइव बहस करते हैं।",
    welcomePoint2:
      "आर्थर (फ़्रेम), क्लारा (साइकोलॉजी) और लियो (चार्म) बहस करते हैं, फिर एक सिंथेसाइज़र आपको एक बेस्ट जवाब देता है - कभी नेगिंग नहीं, कभी गेम्स नहीं।",
    welcomePoint3: "स्क्रीनशॉट सिर्फ़ मेमोरी में प्रोसेस होते हैं और फिर डिलीट हो जाते हैं - सिर्फ़ रीड ही, हर कॉन्टैक्ट के लिए, सेव होती है।",
    showMeAround: "मुझे घुमाकर दिखाएं",
    skipTour: "टूर छोड़ें",
    stepOf: "स्टेप {step} / {total}",
    back: "पीछे",
    next: "आगे",
    done: "समझ गया",
    skip: "स्किप करें",
    replay: "ट्यूटोरियल फिर से देखें",
    home: {
      modeTitle: "आज रात का मोड",
      modeBody: "यह पूरी ऐप में सुझावों का रंग तय करता है - हाइप, चिल, रोमांटिक या डायरेक्ट। कभी भी बदलें टैप करें।",
      playbookTitle: "प्लेबुक",
      playbookBody:
        "आइसब्रेकर, माहौल बदलें, एग्ज़िट स्ट्रैटेजी - तीन तैयार स्क्रिप्ट। ये बराबर के विकल्प हैं, कोई लॉक्ड सीक्वेंस नहीं - जो सही लगे उस पर जाएं।",
      ctaTitle: "रीड शुरू करें",
      ctaBody: "यह एक बटन सब कुछ शुरू करता है - स्क्रीनशॉट पेस्ट करें या बताएं क्या हो रहा है।",
    },
    live: {
      contactsTitle: "हर व्यक्ति के लिए सेव करें",
      contactsBody: "किसी कॉन्टैक्ट को रीड टैग करें और हर रीड के साथ आपका कोच उसके बारे में और सटीक होता जाएगा।",
      scenarioTitle: "स्क्रीनशॉट या सिचुएशन",
      scenarioBody: "स्क्रीनशॉट डालें, या बस टाइप करें क्या हो रहा है - दोनों से तीनों कोच की पूरी बहस मिलती है।",
      sendTitle: "भेज दें",
      sendBody: "आर्थर, क्लारा और लियो इस पर लाइव बहस करेंगे, फिर एक सिंथेसाइज़र आपको आख़िरी फ़ैसला देता है।",
    },
    read: {
      summaryTitle: "बहस, लाइव",
      summaryBody: "तीन अलग-अलग राय आते देखें, फिर फ़ैसला आने से पहले उनकी बहस देखें।",
    },
    result: {
      gaugeTitle: "अट्रैक्शन गेज",
      gaugeBody: "0 से 100 का रीड कि वो कितने इंटरेस्टेड लग रहे हैं। नंबर के पीछे की वजह देखने के लिए टैप करें।",
      bestTitle: "सबसे अच्छा जवाब",
      bestBody: "सिंथेसाइज़र की पसंद - हमेशा इमोशनली इंटेलिजेंट, कभी नेगिंग या मैनिपुलेशन नहीं, चाहे किसी कोच ने वो सुझाया हो।",
      agentsTitle: "एक फ़ैसला, तीन नज़रिए",
      agentsBody: "यहां हर जवाब एक असली बहस का नतीजा है, जो एक फ़ैसले में बदल गया।",
    },
    profile: {
      languageTitle: "भाषा",
      languageBody: "कभी भी ऐप और अपनी AI रीड्स की भाषा बदलें - ऑटो स्क्रीनशॉट से बातचीत की भाषा खुद पहचान लेता है।",
    },
  },
};

const ar: Dict = {
  common: {
    back: "رجوع",
    seeAll: "عرض الكل",
    offlineMessage: "لا يوجد اتصال - تحقق من شبكتك وحاول مرة أخرى.",
    installTitle: "ثبّت Bro Code للوصول السريع",
    installAction: "تثبيت",
    installDismiss: "ليس الآن",
  },
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
    playbookSummaryTitle: "3 مهام جاهزة",
    playbookSummaryDesc: "كسر الجليد، تغيير الأجواء، خروج أنيق — كل ذلك في مكان واحد.",
    startRead: "ابدأ قراءة",
  },
  vibe: {
    eyebrow: "أول شيء الليلة",
    title: "ما هو وضعك؟",
    subtitle: "اختر واحداً — سيحدد طابع الليلة كلها. يمكنك تغييره في أي وقت.",
    lockIn: "تثبيت {mode}",
  },
  identity: {
    eyebrow: "قبل أن نبدأ",
    sheetTitle: "أخبرنا عن نفسك",
    sheetSubtitle: "هذا يضبط الضمائر والتوجيه بما يناسب موقفك — يمكنك تغييره في أي وقت من ملفك الشخصي.",
    continueCta: "متابعة",
    pickerTitle: "عنك",
    pickerSubtitle: "يضبط الضمائر والتوجيه بما يناسب موقفك.",
    genderLabel: "أنت",
    interestedInLabel: "مهتم بـ",
    updated: "تم التحديث",
  },
  genders: { male: "ذكر", female: "أنثى", nonBinary: "غير ثنائي" },
  interests: { men: "الرجال", women: "النساء", everyone: "الجميع" },
  live: {
    yourReads: "قراءاتك",
    newContactPrompt: "مع من تتحدث؟ (يكفي الاسم الأول)",
    contactGenderPrompt: "هل هو رجل أم امرأة أم غير ثنائي؟ (اتركه فارغاً للتخطي)",
    newChip: "＋ جديد",
    scenarioLabel: "الموقف",
    scenarioPlaceholder: "صف الموقف… مثلاً: \"في مقهى، وهذا الشخص يقرأ كتابي المفضل.\"",
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
    extracting: "جارٍ قراءة لقطة الشاشة…",
    extractionFailed: "تعذّرت قراءة لقطة الشاشة تلقائياً - يمكنك إرسالها رغم ذلك.",
    extractedSeparator: "--- مستخرج من لقطة الشاشة ---",
  },
  say: { title: "ماذا تقول الآن", thinking: "يفكر…", giveMeThree: "أعطني ثلاثة أخرى", copy: "نسخ", copied: "تم النسخ!" },
  read: {
    readingTitle: "يقرأون الموقف…",
    spokenTitle: "صدر الحكم",
    yourScreenshot: "لقطة شاشتك",
    yourScreenshots: "لقطات شاشتك",
    yourMessage: "رسالتك",
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
    tryAgain: "حاول مجدداً",
    agentRoles: { arthur: "خبير الهيبة", clara: "عِلم النفس", leo: "الساحر" },
  },
  result: {
    title: "قراءتك",
    shareCopied: "تم نسخ ملخص قابل للمشاركة — الصقه في أي مكان.",
    thinkingHeading: "ربما هذا الشخص يفكر فعلاً في…",
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
    shareConfirmTitle: "قبل المشاركة",
    shareDisclaimer: "تتم المشاركة كبطاقة تحمل علامة مائية — الملخص فقط، وليس المحادثة الفعلية أبداً.",
    shareConfirm: "مشاركة",
    shareCancel: "إلغاء",
    shareCopied: "تم نسخ ملخص قابل للمشاركة — الصقه في أي مكان.",
  },
  playbook: {
    subtitle: "كل مهمة، جاهزة كلما احتجت إلى جملة جاهزة.",
  },
  profile: {
    emptyTitle: "لا توجد إحصائيات بعد",
    emptyBody: "أكمل قراءتك الأولى الليلة ومن هنا تبدأ سلسلتك.",
  },
  language: {
    title: "اللغة",
    subtitle: "اختر لغة التطبيق ولغة قراءاتك.",
    autoNote: "يكتشف \"تلقائي\" لغة المحادثة من لقطة الشاشة تلقائياً.",
    updated: "تم تحديث اللغة",
  },
  tutorial: {
    welcomeTitle: "تعرّف على مساعدك",
    welcomeBody: "Bro Code يقرأ الموقف بدلاً منك ويحوّله إلى خطوة واحدة واضحة.",
    welcomePoint1: "أرفق لقطة شاشة أو صف الموقف - ثلاثة مدربين بالذكاء الاصطناعي يتناقشون مباشرة.",
    welcomePoint2:
      "آرثر (الهيبة) وكلارا (علم النفس) وليو (السحر) يتجادلون، ثم يعطيك المُلخِّص رداً واحداً أفضل - بدون تحقير وبدون ألاعيب أبداً.",
    welcomePoint3: "تُعالَج لقطات الشاشة في الذاكرة فقط ثم تُحذف - يُحفظ الملخص فقط، لكل جهة اتصال.",
    showMeAround: "أرني كيف يعمل",
    skipTour: "تخطي الجولة",
    stepOf: "الخطوة {step} من {total}",
    back: "رجوع",
    next: "التالي",
    done: "فهمت",
    skip: "تخطي",
    replay: "إعادة الجولة التعريفية",
    home: {
      modeTitle: "وضع الليلة",
      modeBody: "هذا يحدد لون الاقتراحات في التطبيق كله - حماس، هادئ، رومانسي أو مباشر. اضغط تغيير في أي وقت.",
      playbookTitle: "الخطط",
      playbookBody:
        "كسر الجليد، تغيير الأجواء، خروج أنيق - ثلاث خطط جاهزة. كلها متساوية وليست تسلسلاً مقفلاً، فاذهب لأي واحدة تناسب موقفك.",
      ctaTitle: "ابدأ قراءة",
      ctaBody: "الزر الوحيد الذي يبدأ كل شيء - أرفق لقطة شاشة أو صف ما يحدث.",
    },
    live: {
      contactsTitle: "احفظها لكل شخص",
      contactsBody: "اربط القراءة بجهة اتصال وسيصبح مدربك أكثر دقة معها مع كل قراءة.",
      scenarioTitle: "لقطة شاشة أو موقف",
      scenarioBody: "أرفق لقطة شاشة، أو فقط اكتب ما يحدث - كلاهما يُفعّل نقاش المدربين الثلاثة كاملاً.",
      sendTitle: "أرسلها",
      sendBody: "سيتناقش آرثر وكلارا وليو في هذا مباشرة، ثم يعطيك المُلخِّص القرار النهائي.",
    },
    read: {
      summaryTitle: "النقاش، مباشر",
      summaryBody: "شاهد ثلاث آراء مستقلة تصل، ثم شاهدهم يتناقشون قبل أن يصدر الحكم.",
    },
    result: {
      gaugeTitle: "مقياس الانجذاب",
      gaugeBody: "قراءة من 0 إلى 100 لمدى اهتمام هذا الشخص. اضغط عليه لترى التفكير وراء الرقم.",
      bestTitle: "أفضل رد",
      bestBody: "اختيار المُلخِّص - دائماً بذكاء عاطفي، وبدون تحقير أو تلاعب أبداً، حتى لو اقترحه أحد المدربين.",
      agentsTitle: "حكم واحد، ثلاث وجهات نظر",
      agentsBody: "كل رد هنا هو نتيجة نقاش حقيقي، تم حسمه في قرار واحد.",
    },
    profile: {
      languageTitle: "اللغة",
      languageBody:
        "غيّر لغة التطبيق وردود الذكاء الاصطناعي في أي وقت - يكتشف \"تلقائي\" لغة المحادثة مباشرة من لقطة الشاشة.",
    },
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
