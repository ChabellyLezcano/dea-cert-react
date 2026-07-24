// Flat, dot-namespaced translation keys. `es` is typed as
// `Record<TranslationKey, string>` (see below), so TypeScript itself
// enforces that every English string has a Spanish counterpart -- a
// missing key here is a compile error, not a silent English fallback in
// the Spanish UI.
export const en = {
  // Navigation / header
  'nav.backToCertifications': 'Certifications',
  'nav.practice': 'Practice',
  'nav.mockExam': 'Mock exam',
  'nav.aiGenerate': 'Generate AI',
  'nav.aiFavorites': 'AI favorites',
  'header.openMenu': 'Open menu',
  'header.theme': 'Theme',
  'header.signOut': 'Sign out',
  'header.language': 'Language',
  'header.appLanguage': 'App language',
  'header.questionLanguage': 'Question language',
  'header.explanationLanguage': 'Explanation language',
  'theme.colorTheme': 'Color theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',

  // Certifications page
  'certifications.title': 'Your certifications',
  'certifications.subtitle': 'Pick a certification to start studying.',
  'certifications.examGuide': 'Exam guide: {version}',
  'certifications.startStudying': 'Start studying',

  // Loading states
  'loading.certifications': 'Loading certifications...',
  'loading.questions': 'Loading questions from the database...',
  'loading.suspenseQuestions': 'Loading questions...',
  'loading.mockExam': 'Loading mock exam...',
  'loading.aiGenerator': 'Loading AI question generator...',
  'loading.aiFavorites': 'Loading favorite AI questions...',
  'loading.studySection': 'Loading study section...',

  // Quiz / practice page
  'quiz.questionsInFilterOfTotal': 'questions in this filter (of {total} total)',
  'quiz.correctSuffix': 'correct',
  'quiz.wrongSuffix': 'wrong',
  'quiz.pendingSuffix': 'pending',
  'quiz.confirmReset': 'Delete all saved progress (correct and wrong answers)?',
  'quiz.bankError':
    'Could not load the question bank: {error}. Make sure the questions table has been created and seeded (see the README).',
  'quiz.syncError': 'Could not sync progress with the server: {error}',

  // Sidebar
  'sidebar.sectionsWeight': 'Sections · official weight',
  'sidebar.allSections': 'All sections',
  'sidebar.shuffle': 'Shuffle question order',
  'sidebar.resetProgress': 'Reset saved progress',
  'sidebar.statsLine': '{correct}/{total} correct · {answered} answered',
  'sidebar.noAttempts': 'No attempts yet',
  'sidebar.accuracy': '{pct}% accuracy',

  // Filters
  'filters.searchPlaceholder': 'Search questions, options and explanations… (VACUUM, broadcast, ABAC…)',
  'filters.searchAriaLabel': 'Search questions',
  'filters.examLabel': 'Exam',
  'filters.filterByExam': 'Filter by exam',
  'filters.allExams': 'All exams',
  'filters.examN': 'Exam {n}',
  'filters.statusLabel': 'Status',
  'filters.filterByStatus': 'Filter by status',
  'filters.status.all': 'All',
  'filters.status.pending': 'Pending',
  'filters.status.wrong': 'Wrong',
  'filters.status.right': 'Correct',

  // Pagination
  'pagination.prev': 'Prev',
  'pagination.next': 'Next',
  'pagination.ariaLabel': 'Question pages',

  // Question card
  'question.multiAnswer': 'multi-answer',
  'question.checkSelection': 'Check selection',
  'question.chooseN': 'choose {n}',
  'question.showAnswer': 'Show answer',
  'question.correct': 'Correct',
  'question.incorrect': 'Incorrect',
  'question.answerRevealed': 'Answer revealed',
  'question.retry': 'Retry',
  'question.explanationLabel': 'Explanation',
  'question.examQ': 'Exam {exam} · Q{n}',

  // Mock exam
  'mockExam.source.unanswered': 'Unanswered',
  'mockExam.source.answered': 'Already answered',
  'mockExam.source.both': 'Both',
  'mockExam.finishedTitle': 'Exam finished ·',
  'mockExam.scoreLine': '{correct}/{total} correct',
  'mockExam.passedNote': 'Above the approximate passing threshold (~71%).',
  'mockExam.failedNote': 'Below the approximate passing threshold (~71%).',
  'mockExam.savedNote': 'Your answers have already been saved to your real progress.',
  'mockExam.exitFinished': 'Exit mock exam',
  'mockExam.inProgress': 'Mock exam in progress · {answered}/{total} answered',
  'mockExam.draftNotice':
    'Your answers for this attempt are not saved until you press "Finish exam" — if you exit early, your real progress is untouched. Even if you include questions you\'ve already answered, they\'ll show up blank: this is a fresh attempt.',
  'mockExam.shortOfTarget':
    "One or more domains didn't have enough eligible questions for this filter; it was topped up with questions from other domains.",
  'mockExam.finish': 'Finish exam',
  'mockExam.exitWithoutSaving': 'Exit without saving',
  'mockExam.targetSuffix': '(target {n})',
  'mockExam.generateTitle': 'Generate mock exam',
  'mockExam.generateDescription':
    'Mixes questions from every exam, distributed by domain according to the official percentages (P 6% · ING 21% · TRA 22% · JOBS 16% · CICD 10% · TRO 10% · GOV 15%). Your answers are only saved if you finish the exam.',
  'mockExam.questionCountLabel': 'Number of questions',
  'mockExam.customCountAriaLabel': 'Custom number of questions',
  'mockExam.ofAvailable': 'of {max} available',
  'mockExam.sourceLabel': 'Questions to include',
  'mockExam.generateButton': 'Generate exam',
  'mockExam.domainBreakdownTitle': 'Result by domain',
  'mockExam.domainResultLine': '{correct}/{total} · {percentage}%',

  // AI generation
  'ai.generate.intro':
    "Generated from your own study notes for this domain. They aren't saved automatically — use the save button to keep the ones you want in your favorites library.",
  'ai.generate.modeLabel': 'Mode',
  'ai.generate.modeTopic': 'By topic',
  'ai.generate.modeExam': 'Full mock exam',
  'ai.generate.domainLabel': 'Domain',
  'ai.generate.countLabel': 'Number of questions',
  'ai.generate.generating': 'Generating...',
  'ai.generate.button': 'Generate questions',
  'ai.generate.examIntro':
    'Generates a {count}-question exam mixed across every domain, distributed by the official exam weights — the same way the practice-bank mock exam is built. This runs several requests in the background, so it takes longer than a single-topic batch.',
  'ai.generate.examButton': 'Generate {count}-question exam',
  'ai.generate.examProgress': 'Generating... block {completed}/{total}',
  'ai.generate.examRateLimited':
    "Groq's free tier rate limit was reached — waiting {seconds}s before retrying...",
  'ai.generate.examAllFailed': 'Could not generate any questions for this exam: {reason}',
  'ai.generate.examPartialFailure': 'Some domains failed to generate ({domains}) — the rest are shown below.',
  'ai.generate.examPartialFailureReason':
    'These domains failed to generate ({domains}): {reason} — the rest are shown below.',
  'ai.generate.autoSavedNotice': 'Questions you get wrong are saved to your AI favorites automatically.',
  'ai.generate.save': 'Save to favorites',
  'ai.generate.saved': 'Saved',
  'ai.generate.error': 'Could not generate questions.',
  'ai.badge': 'AI generated',

  // AI favorites
  'ai.favorites.loading': 'Loading favorites...',
  'ai.favorites.empty': "You haven't saved any AI-generated questions yet.",
  'ai.favorites.confirmRemove': 'Remove this question from your favorites?',
  'ai.favorites.remove': 'Remove',

  // Auth (shared field labels)
  'auth.emailLabel': 'Email',
  'auth.passwordLabel': 'Password',

  // Login
  'auth.login.title': 'Welcome back',
  'auth.login.subtitle': 'Sign in to keep tracking your certification progress.',
  'auth.login.submit': 'Sign in',
  'auth.login.noAccount': 'No account yet?',
  'auth.login.createOne': 'Create one',

  // Signup
  'auth.signup.title': 'Create your account',
  'auth.signup.subtitle': 'Track your progress across all practice exams.',
  'auth.signup.confirmPasswordLabel': 'Confirm password',
  'auth.signup.passwordHint':
    '8-16 characters, with at least one uppercase letter, one lowercase letter, one number and one special character.',
  'auth.signup.submit': 'Create account',
  'auth.signup.alreadyHaveAccount': 'Already have an account?',
  'auth.signup.signInLink': 'Sign in',
  'auth.signup.checkInboxTitle': 'Check your inbox',
  'auth.signup.checkInboxSubtitle': 'We sent you a confirmation link.',
  'auth.signup.confirmationBodyPrefix': 'Click the link we sent to ',
  'auth.signup.confirmationBodySuffix': ' to activate your account, then come back and sign in.',
  'auth.signup.backToSignIn': 'Back to sign in',
} as const;

export type TranslationKey = keyof typeof en;

export const es: Record<TranslationKey, string> = {
  // Navigation / header
  'nav.backToCertifications': 'Certificaciones',
  'nav.practice': 'Practicar',
  'nav.mockExam': 'Examen simulado',
  'nav.aiGenerate': 'Generar IA',
  'nav.aiFavorites': 'Favoritas IA',
  'header.openMenu': 'Abrir menú',
  'header.theme': 'Tema',
  'header.signOut': 'Cerrar sesión',
  'header.language': 'Idioma',
  'header.appLanguage': 'Idioma de la app',
  'header.questionLanguage': 'Idioma de las preguntas',
  'header.explanationLanguage': 'Idioma de las explicaciones',
  'theme.colorTheme': 'Tema de color',
  'theme.light': 'Claro',
  'theme.dark': 'Oscuro',
  'theme.system': 'Sistema',

  // Certifications page
  'certifications.title': 'Tus certificaciones',
  'certifications.subtitle': 'Elige una certificación para empezar a estudiar.',
  'certifications.examGuide': 'Guía del examen: {version}',
  'certifications.startStudying': 'Empezar a estudiar',

  // Loading states
  'loading.certifications': 'Cargando certificaciones...',
  'loading.questions': 'Cargando preguntas de la base de datos...',
  'loading.suspenseQuestions': 'Cargando preguntas...',
  'loading.mockExam': 'Cargando examen simulado...',
  'loading.aiGenerator': 'Cargando generador de preguntas IA...',
  'loading.aiFavorites': 'Cargando preguntas IA favoritas...',
  'loading.studySection': 'Cargando sección de estudio...',

  // Quiz / practice page
  'quiz.questionsInFilterOfTotal': 'preguntas en este filtro (de {total} en total)',
  'quiz.correctSuffix': 'correctas',
  'quiz.wrongSuffix': 'incorrectas',
  'quiz.pendingSuffix': 'pendientes',
  'quiz.confirmReset': '¿Borrar todo el progreso guardado (respuestas correctas e incorrectas)?',
  'quiz.bankError':
    'No se pudo cargar el banco de preguntas: {error}. Asegúrate de que la tabla questions se ha creado y sembrado (consulta el README).',
  'quiz.syncError': 'No se pudo sincronizar el progreso con el servidor: {error}',

  // Sidebar
  'sidebar.sectionsWeight': 'Secciones · peso oficial',
  'sidebar.allSections': 'Todas las secciones',
  'sidebar.shuffle': 'Mezclar orden de preguntas',
  'sidebar.resetProgress': 'Reiniciar progreso guardado',
  'sidebar.statsLine': '{correct}/{total} correctas · {answered} respondidas',
  'sidebar.noAttempts': 'Sin intentos todavía',
  'sidebar.accuracy': '{pct}% de acierto',

  // Filters
  'filters.searchPlaceholder': 'Buscar en preguntas, opciones y explicaciones… (VACUUM, broadcast, ABAC…)',
  'filters.searchAriaLabel': 'Buscar preguntas',
  'filters.examLabel': 'Examen',
  'filters.filterByExam': 'Filtrar por examen',
  'filters.allExams': 'Todos los exámenes',
  'filters.examN': 'Examen {n}',
  'filters.statusLabel': 'Estado',
  'filters.filterByStatus': 'Filtrar por estado',
  'filters.status.all': 'Todas',
  'filters.status.pending': 'Pendientes',
  'filters.status.wrong': 'Incorrectas',
  'filters.status.right': 'Correctas',

  // Pagination
  'pagination.prev': 'Anterior',
  'pagination.next': 'Siguiente',
  'pagination.ariaLabel': 'Páginas de preguntas',

  // Question card
  'question.multiAnswer': 'varias respuestas',
  'question.checkSelection': 'Comprobar selección',
  'question.chooseN': 'elige {n}',
  'question.showAnswer': 'Mostrar respuesta',
  'question.correct': 'Correcta',
  'question.incorrect': 'Incorrecta',
  'question.answerRevealed': 'Respuesta revelada',
  'question.retry': 'Reintentar',
  'question.explanationLabel': 'Explicación',
  'question.examQ': 'Examen {exam} · P{n}',

  // Mock exam
  'mockExam.source.unanswered': 'Sin responder',
  'mockExam.source.answered': 'Ya respondidas',
  'mockExam.source.both': 'Ambas',
  'mockExam.finishedTitle': 'Examen finalizado ·',
  'mockExam.scoreLine': '{correct}/{total} correctas',
  'mockExam.passedNote': 'Por encima del umbral aproximado de aprobado (~71%).',
  'mockExam.failedNote': 'Por debajo del umbral aproximado de aprobado (~71%).',
  'mockExam.savedNote': 'Tus respuestas ya se han guardado en tu progreso real.',
  'mockExam.exitFinished': 'Salir del simulacro',
  'mockExam.inProgress': 'Examen simulado en curso · {answered}/{total} respondidas',
  'mockExam.draftNotice':
    'Tus respuestas de este intento no se guardan hasta que pulses "Finalizar examen" — si sales antes, no se modifica tu progreso real. Aunque incluyas preguntas ya respondidas antes, aparecerán en blanco: es un intento nuevo.',
  'mockExam.shortOfTarget':
    'Algún dominio no tenía suficientes preguntas elegibles con este filtro; se completó con preguntas de otros dominios.',
  'mockExam.finish': 'Finalizar examen',
  'mockExam.exitWithoutSaving': 'Salir sin guardar',
  'mockExam.targetSuffix': '(objetivo {n})',
  'mockExam.generateTitle': 'Generar examen simulado',
  'mockExam.generateDescription':
    'Mezcla preguntas de todos tus exámenes, repartidas por dominio según los porcentajes oficiales (P 6% · ING 21% · TRA 22% · JOBS 16% · CICD 10% · TRO 10% · GOV 15%). Tus respuestas solo se guardan si finalizas el examen.',
  'mockExam.questionCountLabel': 'Número de preguntas',
  'mockExam.customCountAriaLabel': 'Número de preguntas personalizado',
  'mockExam.ofAvailable': 'de {max} disponibles',
  'mockExam.sourceLabel': 'Preguntas a incluir',
  'mockExam.generateButton': 'Generar examen',
  'mockExam.domainBreakdownTitle': 'Resultado por dominio',
  'mockExam.domainResultLine': '{correct}/{total} · {percentage}%',

  // AI generation
  'ai.generate.intro':
    'Se generan a partir de tus propias notas de estudio de este dominio. No se guardan solas — usa el botón de guardar para conservar las que quieras en tu biblioteca de favoritas.',
  'ai.generate.modeLabel': 'Modo',
  'ai.generate.modeTopic': 'Por tema',
  'ai.generate.modeExam': 'Examen simulacro completo',
  'ai.generate.domainLabel': 'Dominio',
  'ai.generate.countLabel': 'Número de preguntas',
  'ai.generate.generating': 'Generando...',
  'ai.generate.button': 'Generar preguntas',
  'ai.generate.examIntro':
    'Genera un examen de {count} preguntas mezclando todos los dominios, repartidas según los pesos oficiales del examen — igual que el examen simulacro del banco de preguntas. Esto lanza varias peticiones en segundo plano, así que tarda más que un bloque de un solo tema.',
  'ai.generate.examButton': 'Generar examen de {count} preguntas',
  'ai.generate.examProgress': 'Generando... bloque {completed}/{total}',
  'ai.generate.examRateLimited':
    'Se alcanzó el límite gratuito de Groq — esperando {seconds}s antes de reintentar...',
  'ai.generate.examAllFailed': 'No se pudo generar ninguna pregunta para este examen: {reason}',
  'ai.generate.examPartialFailure':
    'Algunos dominios fallaron al generar ({domains}) — el resto se muestra abajo.',
  'ai.generate.examPartialFailureReason':
    'Estos dominios fallaron al generar ({domains}): {reason} — el resto se muestra abajo.',
  'ai.generate.autoSavedNotice':
    'Las preguntas que fallas se guardan automáticamente en tus favoritas de IA.',
  'ai.generate.save': 'Guardar en favoritas',
  'ai.generate.saved': 'Guardada',
  'ai.generate.error': 'No se pudieron generar preguntas.',
  'ai.badge': 'Generada por IA',

  // AI favorites
  'ai.favorites.loading': 'Cargando favoritas...',
  'ai.favorites.empty': 'Todavía no has guardado ninguna pregunta generada por IA.',
  'ai.favorites.confirmRemove': '¿Quitar esta pregunta de tus favoritas?',
  'ai.favorites.remove': 'Quitar',

  // Auth (shared field labels)
  'auth.emailLabel': 'Correo electrónico',
  'auth.passwordLabel': 'Contraseña',

  // Login
  'auth.login.title': 'Bienvenido de nuevo',
  'auth.login.subtitle': 'Inicia sesión para seguir con tu progreso de certificación.',
  'auth.login.submit': 'Iniciar sesión',
  'auth.login.noAccount': '¿Todavía no tienes cuenta?',
  'auth.login.createOne': 'Crea una',

  // Signup
  'auth.signup.title': 'Crea tu cuenta',
  'auth.signup.subtitle': 'Sigue tu progreso en todos los exámenes de práctica.',
  'auth.signup.confirmPasswordLabel': 'Confirmar contraseña',
  'auth.signup.passwordHint':
    '8-16 caracteres, con al menos una mayúscula, una minúscula, un número y un carácter especial.',
  'auth.signup.submit': 'Crear cuenta',
  'auth.signup.alreadyHaveAccount': '¿Ya tienes una cuenta?',
  'auth.signup.signInLink': 'Iniciar sesión',
  'auth.signup.checkInboxTitle': 'Revisa tu correo',
  'auth.signup.checkInboxSubtitle': 'Te hemos enviado un enlace de confirmación.',
  'auth.signup.confirmationBodyPrefix': 'Haz clic en el enlace que enviamos a ',
  'auth.signup.confirmationBodySuffix': ' para activar tu cuenta y luego vuelve a iniciar sesión.',
  'auth.signup.backToSignIn': 'Volver a iniciar sesión',
};

export const TRANSLATIONS = { en, es };
