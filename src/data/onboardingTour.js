// Le tour est découpé en 6 séquences autonomes (tour rapide, revoir et valider un projet —
// réservée aux experts Compliance —, créer, valider, présenter, inspirer) reliées par des
// actions `goTo` : l'étape `welcome` sert de menu d'entrée et chaque séquence se termine par
// une étape-menu qui renvoie vers les autres. L'ordre du tableau `steps` reste significatif
// (le bouton « Suivant » avance d'un cran), donc les étapes d'une même séquence doivent rester
// contiguës, et chaque étape-menu porte `showDefaultButtons: false` pour ne pas déborder sur la
// séquence suivante.
//
// `version` gouverne la bascule : une config plus ancienne déjà persistée (localStorage ou
// settings.json publié) est remplacée par celle-ci au démarrage — voir
// normalizeOnboardingConfig dans src/utils/onboarding.js. L'incrémenter écrase donc les
// personnalisations back-office du tour : à ne faire que pour une refonte assumée.
export const ONBOARDING_TOUR_VERSION = 8;

// Une action réservée à un public (bouton d'entrée d'un parcours qui n'a de sens que pour lui)
// est retirée du tour des autres au lancement, voir filterOnboardingStepsForAudience.
export const ONBOARDING_AUDIENCE_COMPLIANCE = 'compliance';

// Valeurs par défaut remplacées sans changer de version : une config persistée qui porte encore
// l'ancienne valeur (donc jamais retouchée sur ce champ) reçoit la nouvelle, une valeur
// personnalisée est conservée. De quoi corriger le placement d'une étape sans écraser tout le
// reste du tour personnalisé en back-office.
export const SUPERSEDED_ONBOARDING_STEP_DEFAULTS = {
  // Le titre de la question était mis en avant alors que l'étape décrit la zone de réponse.
  'question-answer-types': { target: ['[data-tour-id="question-main-content"]'] },
  // Le seul titre de la fenêtre de partage était mis en avant, et la bulle, posée dessous,
  // masquait précisément les réglages que l'étape décrit.
  'showcase-share-settings': { target: ['#showcase-share-title'], placement: ['bottom'] }
};

const ACTION_LABELS = {
  create: { en: 'Create a project', fr: 'Créer un projet', de: 'Ein Projekt erstellen', es: 'Crear un proyecto' },
  validate: { en: 'Get your project approved', fr: 'Valider son projet', de: 'Projekt validieren lassen', es: 'Validar su proyecto' },
  present: { en: 'Present your project', fr: 'Présenter son projet', de: 'Projekt präsentieren', es: 'Presentar su proyecto' },
  inspiration: { en: 'Find inspiration', fr: 'Trouver l’inspiration', de: 'Inspiration finden', es: 'Encontrar inspiración' },
  quick: { en: 'Quick tour', fr: 'Tour rapide', de: 'Schnellrundgang', es: 'Recorrido rápido' },
  expert: { en: 'Review and approve a project', fr: 'Revoir et valider un projet', de: 'Ein Projekt prüfen und freigeben', es: 'Revisar y validar un proyecto' },
  finish: { en: 'Finish the tour', fr: 'Terminer la visite', de: 'Rundgang beenden', es: 'Finalizar la visita' }
};

const SEQUENCE_ENTRY_STEPS = {
  quick: 'quick-intro',
  expert: 'expert-intro',
  create: 'create-project',
  validate: 'compliance-report-top',
  present: 'showcase-top',
  inspiration: 'project-inspiration'
};

// Le parcours expert ne s'adresse qu'aux contacts d'une équipe d'experts et aux membres d'un
// comité : son bouton est retiré du tour des autres (filterOnboardingStepsForAudience).
const SEQUENCE_AUDIENCES = {
  expert: ONBOARDING_AUDIENCE_COMPLIANCE
};

const goToSequence = (key, variant = 'ghost') => ({
  id: `go-${key}`,
  label: ACTION_LABELS[key],
  action: 'goTo',
  stepId: SEQUENCE_ENTRY_STEPS[key],
  variant,
  ...(SEQUENCE_AUDIENCES[key] ? { audience: SEQUENCE_AUDIENCES[key] } : {})
});

const finishAction = () => ({
  id: 'finish-tour',
  label: ACTION_LABELS.finish,
  action: 'finish',
  stepId: '',
  variant: 'ghost'
});

// Les menus de fin de séquence ne proposent jamais le tour rapide : il s'adresse à une
// première découverte, pas à quelqu'un qui vient déjà de parcourir une séquence détaillée.
const sequenceMenuActions = (...keys) => [
  ...keys.map((key, index) => goToSequence(key, index === 0 ? 'primary' : 'ghost')),
  finishAction()
];

export const initialOnboardingTourConfig = {
  "version": ONBOARDING_TOUR_VERSION,
  "allowClose": true,
  "showStepDots": false,
  "labels": {
    "next": { "en": "Next", "fr": "Suivant", "de": "Weiter", "es": "Siguiente" },
    "prev": { "en": "Previous", "fr": "Précédent", "de": "Zurück", "es": "Anterior" },
    "close": { "en": "Close", "fr": "Fermer", "de": "Schließen", "es": "Cerrar" },
    "finish": { "en": "Finish", "fr": "Terminer", "de": "Fertigstellen", "es": "Finalizar" }
  },
  "steps": [
    {
      "id": "welcome",
      "target": "#tour-onboarding-anchor",
      "title": {
        "en": "Welcome to Project Navigator",
        "fr": "Bienvenue sur Project Navigator",
        "de": "Willkommen bei Project Navigator",
        "es": "Bienvenido a Project Navigator"
      },
      "content": {
        "en": "Project Navigator helps you frame your project, get feedback and identify the internal experts to involve. Where would you like to start? You can relaunch the other tours at any time from the “Interactive guide” button.",
        "fr": "Project Navigator vous aide à cadrer votre projet, obtenir du feedback et identifier les experts internes à mobiliser. Par où souhaitez-vous commencer ? Vous pourrez relancer les autres visites à tout moment via le bouton « Guide interactif ».",
        "de": "Project Navigator hilft Ihnen, Ihr Projekt zu strukturieren, Feedback einzuholen und die einzubindenden internen Experten zu ermitteln. Womit möchten Sie beginnen? Sie können die anderen Rundgänge jederzeit über die Schaltfläche „Interaktiver Leitfaden“ erneut starten.",
        "es": "Project Navigator le ayuda a encuadrar su proyecto, obtener feedback e identificar a los expertos internos que debe movilizar. ¿Por dónde quiere empezar? Puede volver a lanzar las demás visitas en cualquier momento desde el botón «Guía interactiva»."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": false,
      "actions": [
        goToSequence('quick', 'primary'),
        goToSequence('expert'),
        goToSequence('create'),
        goToSequence('validate'),
        goToSequence('present'),
        goToSequence('inspiration')
      ]
    },

    {
      "id": "quick-intro",
      "target": "[data-tour-id=\"home-create-project\"]",
      "title": {
        "en": "Your compliance copilot",
        "fr": "Votre copilote compliance",
        "de": "Ihr Compliance-Copilot",
        "es": "Su copiloto de cumplimiento"
      },
      "content": {
        "en": "Project Navigator supports you from the idea to the approval: you describe your project and get feedback from your teams. The tool identifies the regulatory risks, the internal experts to involve and the deadlines to meet. Follow the guide — we'll show you everything on a sample project.",
        "fr": "Project Navigator vous accompagne de l’idée à la validation : vous décrivez votre projet, obtenez des retours de vos équipes. L’outil identifie les risques réglementaires, les experts internes à mobiliser et les délais à tenir. Suivez le guide, on vous montre tout sur un projet d’exemple.",
        "de": "Project Navigator begleitet Sie von der Idee bis zur Freigabe: Sie beschreiben Ihr Projekt und erhalten Feedback von Ihren Teams. Das Tool ermittelt die regulatorischen Risiken, die einzubindenden internen Experten und die einzuhaltenden Fristen. Folgen Sie dem Leitfaden — wir zeigen Ihnen alles an einem Beispielprojekt.",
        "es": "Project Navigator le acompaña de la idea a la validación: usted describe su proyecto y obtiene feedback de sus equipos. La herramienta identifica los riesgos reglamentarios, los expertos internos que debe movilizar y los plazos que debe cumplir. Siga la guía: se lo mostramos todo con un proyecto de ejemplo."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "quick-questionnaire",
      "target": "[data-tour-id=\"question-main-content\"]",
      "title": {
        "en": "A questionnaire that adapts to you",
        "fr": "Un questionnaire qui s’adapte",
        "de": "Ein Fragebogen, der sich anpasst",
        "es": "Un cuestionario que se adapta"
      },
      "content": {
        "en": "Everything starts here: questions appear according to your answers and your activity scope, each one is explained, and everything is saved continuously.",
        "fr": "Tout commence ici : les questions apparaissent selon vos réponses et votre périmètre d’activité, chacune est expliquée, et tout est sauvegardé en continu.",
        "de": "Hier beginnt alles: Die Fragen erscheinen je nach Ihren Antworten und Ihrem Tätigkeitsbereich, jede wird erläutert, und alles wird laufend gespeichert.",
        "es": "Todo empieza aquí: las preguntas aparecen según sus respuestas y su ámbito de actividad, cada una se explica y todo se guarda de forma continua."
      },
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "quick-analysis",
      "target": "[data-tour-id=\"synthesis-summary\"]",
      "title": {
        "en": "An automatic analysis",
        "fr": "Une analyse automatique",
        "de": "Eine automatische Analyse",
        "es": "Un análisis automático"
      },
      "content": {
        "en": "As soon as your answers are in: points of attention and expert teams concerned are identified.",
        "fr": "Dès vos réponses saisies : points de vigilance, équipes expertes concernées sont identifiés.",
        "de": "Sobald Ihre Antworten vorliegen: Aufmerksamkeitspunkte und betroffene Expertenteams werden identifiziert.",
        "es": "En cuanto introduce sus respuestas: se identifican los puntos de atención y los equipos expertos implicados."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "start", "inline": "nearest" },
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "quick-experts",
      "target": "[data-tour-id=\"synthesis-team-exchange\"]",
      "title": {
        "en": "The experts come to you",
        "fr": "Les experts viennent à vous",
        "de": "Die Experten kommen zu Ihnen",
        "es": "Los expertos acuden a usted"
      },
      "content": {
        "en": "Once the project is submitted, the right teams and committees are notified automatically. They give their opinion and ask their questions right here. Everything is traced and gathered in one place: no more emails getting lost.",
        "fr": "Une fois le projet soumis, les bonnes équipes et les bons comités sont notifiés automatiquement. Ils rendent leur avis et posent leurs questions ici même. Tout est tracé et réuni au même endroit : fini les mails qui se perdent.",
        "de": "Sobald das Projekt eingereicht ist, werden die richtigen Teams und Gremien automatisch benachrichtigt. Sie geben ihre Stellungnahme ab und stellen ihre Fragen genau hier. Alles ist nachvollziehbar und an einem Ort gebündelt: keine verlorenen E-Mails mehr.",
        "es": "Una vez enviado el proyecto, los equipos y comités adecuados son notificados automáticamente. Emiten su dictamen y plantean sus preguntas aquí mismo. Todo queda trazado y reunido en un solo lugar: se acabaron los correos que se pierden."
      },
      "placement": "top",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "center", "inline": "nearest" },
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "quick-showcase",
      "target": "[data-tour-id=\"showcase-hero\"]",
      "title": {
        "en": "And here is your showcase",
        "fr": "Et voilà votre vitrine",
        "de": "Und hier ist Ihre Vitrine",
        "es": "Y aquí está su vitrina"
      },
      "content": {
        "en": "Your project becomes a visual showcase generated from your answers, with no layout work on your side. Ready to present to your manager, your management or a committee to get feedback.",
        "fr": "Votre projet devient une vitrine visuelle générée à partir de vos réponses, sans aucune mise en page de votre part. Prête à présenter à votre manager, votre direction ou un comité pour obtenir du feedback.",
        "de": "Ihr Projekt wird zu einer visuellen Vitrine, die aus Ihren Antworten erzeugt wird — ganz ohne Layoutarbeit Ihrerseits. Bereit für die Präsentation vor Ihrer Führungskraft, der Leitung oder einem Gremium, um Feedback einzuholen.",
        "es": "Su proyecto se convierte en una vitrina visual generada a partir de sus respuestas, sin ningún trabajo de maquetación por su parte. Lista para presentar a su responsable, su dirección o un comité y obtener feedback."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "start", "inline": "nearest" },
      "scrollDuration": 1200,
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "quick-showcase-edit",
      "target": "[data-tour-id=\"showcase-edit-trigger\"]",
      "title": {
        "en": "Customisable from end to end",
        "fr": "Personnalisable de bout en bout",
        "de": "Von A bis Z anpassbar",
        "es": "Personalizable de principio a fin"
      },
      "content": {
        "en": "Texts, colours, custom sections, embedded documents and media: you edit everything directly on the final rendering.",
        "fr": "Textes, couleurs, sections sur mesure, documents et médias intégrés : vous modifiez tout directement sur le rendu final.",
        "de": "Texte, Farben, maßgeschneiderte Abschnitte, eingebettete Dokumente und Medien: Sie bearbeiten alles direkt in der endgültigen Darstellung.",
        "es": "Textos, colores, secciones a medida, documentos y medios integrados: lo modifica todo directamente sobre el resultado final."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "center", "inline": "nearest" },
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "quick-postits",
      "target": "[data-tour-id=\"showcase-annotation-note\"]",
      "title": {
        "en": "Feedback in the right place",
        "fr": "Le feedback au bon endroit",
        "de": "Feedback an der richtigen Stelle",
        "es": "El feedback en el lugar adecuado"
      },
      "content": {
        "en": "You share the showcase via a link and collect feedback as sticky notes dropped with a double-click directly on the page. Centralised and in context, instead of scattered across ten separate emails.",
        "fr": "Vous partagez la vitrine via un lien et récoltez les retours sous forme de post-its, déposés d’un double-clic directement sur la page. Centralisés et contextualisés, plus dans dix mails séparés.",
        "de": "Sie teilen die Vitrine über einen Link und sammeln Rückmeldungen als Haftnotizen, die per Doppelklick direkt auf der Seite platziert werden. Zentral und im Kontext statt verstreut über zehn einzelne E-Mails.",
        "es": "Comparte la vitrina mediante un enlace y recoge los comentarios en forma de notas adhesivas colocadas con un doble clic directamente en la página. Centralizados y en contexto, en lugar de dispersos en diez correos distintos."
      },
      "placement": "right",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "quick-end",
      "target": "#tour-onboarding-anchor",
      "title": {
        "en": "That's what Project Navigator can do",
        "fr": "Voilà le potentiel de Project Navigator",
        "de": "Das ist das Potenzial von Project Navigator",
        "es": "Este es el potencial de Project Navigator"
      },
      "content": {
        "en": "A project framed, analysed, approved and presented — all in one place, without a single email. Now pick the tour you need to get hands-on.",
        "fr": "Un projet cadré, analysé, validé et présenté — au même endroit, sans un seul mail. Choisissez maintenant le parcours qui vous intéresse pour passer à la pratique.",
        "de": "Ein Projekt strukturiert, analysiert, freigegeben und präsentiert — alles an einem Ort, ohne eine einzige E-Mail. Wählen Sie nun den Rundgang, mit dem Sie in die Praxis einsteigen möchten.",
        "es": "Un proyecto encuadrado, analizado, validado y presentado, todo en un mismo lugar y sin un solo correo. Elija ahora el recorrido que le interese para pasar a la práctica."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": false,
      "actions": sequenceMenuActions('expert', 'create', 'validate', 'present', 'inspiration')
    },

    {
      "id": "create-project",
      "target": "[data-tour-id=\"home-create-project\"]",
      "title": {
        "en": "Start a new project",
        "fr": "Lancer un nouveau projet",
        "de": "Ein neues Projekt starten",
        "es": "Iniciar un nuevo proyecto"
      },
      "content": {
        "en": "Click here to get started. Your project is a draft first: you alone can see it, and you can come back to it as often as you need.",
        "fr": "Cliquez ici pour démarrer. Votre projet est d’abord un brouillon : vous seul le voyez, et vous pouvez le reprendre autant de fois que nécessaire.",
        "de": "Klicken Sie hier, um zu beginnen. Ihr Projekt ist zunächst ein Entwurf: Nur Sie sehen es, und Sie können es so oft fortsetzen, wie Sie möchten.",
        "es": "Haga clic aquí para empezar. Su proyecto es primero un borrador: solo usted lo ve y puede retomarlo tantas veces como necesite."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "question-overview",
      "target": "[data-tour-id=\"question-main-content\"]",
      "title": {
        "en": "Answer at your own pace",
        "fr": "Répondre à votre rythme",
        "de": "In Ihrem Tempo antworten",
        "es": "Responder a su ritmo"
      },
      "content": {
        "en": "Fill in the requested information step by step. Everything is saved automatically with each answer: you can close the tab and come back later.",
        "fr": "Renseignez les informations demandées étape par étape. Tout est enregistré automatiquement à chaque réponse : vous pouvez fermer l’onglet et reprendre plus tard.",
        "de": "Geben Sie die angeforderten Informationen Schritt für Schritt ein. Alles wird bei jeder Antwort automatisch gespeichert: Sie können den Tab schließen und später fortfahren.",
        "es": "Complete la información solicitada paso a paso. Todo se guarda automáticamente con cada respuesta: puede cerrar la pestaña y continuar más tarde."
      },
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "question-summary",
      "target": "[data-tour-id=\"question-summary-panel\"]",
      "title": {
        "en": "Track your progress",
        "fr": "Suivre votre avancement",
        "de": "Ihren Fortschritt verfolgen",
        "es": "Seguir su avance"
      },
      "content": {
        "en": "The outline shows your progress and flags the mandatory questions still empty. Some questions will never appear for you: they depend on your answers and on the activity scope set in “My profile”.",
        "fr": "Le sommaire affiche votre progression et repère les questions obligatoires encore vides. Certaines questions n’apparaîtront jamais pour vous : elles dépendent de vos réponses et de votre périmètre d’activité, défini dans « Mon profil ».",
        "de": "Die Übersicht zeigt Ihren Fortschritt und markiert die noch leeren Pflichtfragen. Manche Fragen erscheinen bei Ihnen nie: Sie hängen von Ihren Antworten und von Ihrem in „Mein Profil“ festgelegten Tätigkeitsbereich ab.",
        "es": "El sumario muestra su avance y señala las preguntas obligatorias aún vacías. Algunas preguntas nunca aparecerán para usted: dependen de sus respuestas y de su ámbito de actividad, definido en «Mi perfil»."
      },
      "placement": "right",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "question-guidance",
      "target": "[data-tour-id=\"question-guidance-toggle\"]",
      "title": {
        "en": "Understand each question",
        "fr": "Comprendre chaque question",
        "de": "Jede Frage verstehen",
        "es": "Comprender cada pregunta"
      },
      "content": {
        "en": "“Understand this question” opens the related explanation: what is expected from you and practical tips to answer it.",
        "fr": "« Comprendre cette question » ouvre l’explication associée : ce qu’on attend de vous et des conseils pratiques pour y répondre.",
        "de": "„Diese Frage verstehen“ öffnet die zugehörige Erläuterung: was von Ihnen erwartet wird und praktische Tipps zur Beantwortung.",
        "es": "«Comprender esta pregunta» abre la explicación asociada: qué se espera de usted y consejos prácticos para responder."
      },
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "question-answer-types",
      "target": "[data-tour-id=\"question-answer-input\"]",
      "title": {
        "en": "Much more than text",
        "fr": "Bien plus que du texte",
        "de": "Viel mehr als nur Text",
        "es": "Mucho más que texto"
      },
      "content": {
        "en": "Depending on the question you can write rich text with links, enter amounts, set your calendar milestones, rank priorities or upload reference documents. The more precise your answers, the more relevant the analysis and the showcase.",
        "fr": "Selon les questions, vous pouvez rédiger en texte enrichi avec des liens, saisir des montants, poser vos jalons de calendrier, classer des priorités ou téléverser des documents. Plus vos réponses sont précises, plus l’analyse et la vitrine seront pertinentes.",
        "de": "Je nach Frage können Sie Rich-Text mit Links verfassen, Beträge eingeben, Ihre Meilensteine setzen, Prioritäten ordnen oder Referenzdokumente hochladen. Je genauer Ihre Antworten, desto treffender sind Analyse und Vitrine.",
        "es": "Según la pregunta, puede redactar texto enriquecido con enlaces, introducir importes, fijar sus hitos de calendario, clasificar prioridades o cargar documentos de referencia. Cuanto más precisas sean sus respuestas, más pertinentes serán el análisis y la vitrina."
      },
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "question-doubt",
      "target": "[data-tour-id=\"question-doubt-toggle\"]",
      "title": {
        "en": "Flag a doubt",
        "fr": "Signaler un doute",
        "de": "Einen Zweifel melden",
        "es": "Señalar una duda"
      },
      "content": {
        "en": "Not sure about an answer? Check “I have a doubt” and explain why in a few words: the point stays visible in your answers recap without stopping you from moving on. You will only need to settle this doubt before a final validation.",
        "fr": "Pas sûr d’une réponse ? Cochez « J’ai un doute » et expliquez pourquoi en quelques mots : le point reste visible dans le rappel de vos réponses, sans vous empêcher d’avancer. Il faudra simplement lever ce doute avant une validation définitive.",
        "de": "Nicht sicher bei einer Antwort? Aktivieren Sie „Ich habe Zweifel“ und erklären Sie kurz, warum: Der Punkt bleibt in der Übersicht Ihrer Antworten sichtbar, ohne Sie am Weiterkommen zu hindern. Dieser Zweifel muss lediglich vor einer endgültigen Validierung geklärt werden.",
        "es": "¿No está seguro de una respuesta? Marque «Tengo una duda» y explique brevemente por qué: el punto queda visible en el resumen de sus respuestas sin impedirle avanzar. Solo deberá resolver esta duda antes de una validación definitiva."
      },
      "placement": "top",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "center", "inline": "nearest" },
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "questionnaire-finish",
      "target": "[data-tour-id=\"questionnaire-finish-button\"]",
      "title": {
        "en": "Finish whenever you want",
        "fr": "Terminer quand vous voulez",
        "de": "Beenden, wann Sie möchten",
        "es": "Terminar cuando quiera"
      },
      "content": {
        "en": "“Finish” takes you straight to your project showcase, so you see the project you have just described. From there, “Project stakes” opens the compliance reading of it. Nothing is sent at this stage: your project stays a private draft, and you can come back to change any answer.",
        "fr": "« Terminer » vous amène directement à la vitrine de votre projet, pour voir le projet que vous venez de décrire. De là, « Enjeux du projet » en ouvre la lecture compliance. Rien n’est envoyé à ce stade : votre projet reste un brouillon privé, et vous pourrez revenir modifier n’importe quelle réponse.",
        "de": "„Fertigstellen“ führt Sie direkt zum Showcase Ihres Projekts, damit Sie das eben beschriebene Projekt sehen. Von dort öffnet „Projektherausforderungen“ die Compliance-Lesart. In diesem Stadium wird nichts versendet: Ihr Projekt bleibt ein privater Entwurf, und Sie können jede Antwort später ändern.",
        "es": "«Terminar» le lleva directamente a la vitrina de su proyecto, para ver el proyecto que acaba de describir. Desde ahí, «Retos del proyecto» abre su lectura de cumplimiento. Nada se envía en esta fase: su proyecto sigue siendo un borrador privado y podrá volver para modificar cualquier respuesta."
      },
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "project-share-member",
      "target": "[data-tour-id=\"synthesis-share-member\"]",
      "title": {
        "en": "Work as a pair",
        "fr": "Travailler à plusieurs",
        "de": "Zu mehreren arbeiten",
        "es": "Trabajar en equipo"
      },
      "content": {
        "en": "Add someone else to your project — a co-lead: they find it in their own list, can edit the answers, follow progress and answer the experts' questions too. Enough to stop being the bottleneck while you are away.",
        "fr": "Ajoutez une autre personne à votre projet — un co-lead : elle le retrouve dans sa propre liste, peut modifier les réponses, suivre l’avancement et répondre aux questions des experts. De quoi ne plus être le point de blocage pendant vos congés.",
        "de": "Fügen Sie eine weitere Person zu Ihrem Projekt hinzu — einen Co-Lead: Sie findet es in ihrer eigenen Liste, kann die Antworten bearbeiten, den Fortschritt verfolgen und ebenfalls die Fragen der Experten beantworten. So sind Sie im Urlaub nicht mehr der Engpass.",
        "es": "Añada a otra persona a su proyecto — un co-lead: lo encontrará en su propia lista, podrá modificar las respuestas, seguir el avance y responder también a las preguntas de los expertos. Así deja de ser el cuello de botella durante sus vacaciones."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "center", "inline": "nearest" },
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "project-early-feedback",
      "target": "[data-tour-id=\"showcase-share-trigger\"]",
      "title": {
        "en": "Collect feedback early",
        "fr": "Récolter du feedback très tôt",
        "de": "Früh Feedback einholen",
        "es": "Recoger feedback muy pronto"
      },
      "content": {
        "en": "You can also share your project showcase right now and ask your manager or your team for feedback through sticky notes — often more effective than having a document reviewed.",
        "fr": "Vous pouvez aussi partager la vitrine de votre projet dès maintenant et demander l’avis de votre manager ou de votre équipe via des post-its — souvent plus efficace qu’une relecture de document.",
        "de": "Sie können die Vitrine Ihres Projekts auch jetzt schon teilen und Ihre Führungskraft oder Ihr Team per Haftnotizen um Rückmeldung bitten — oft wirksamer als eine Dokumentenprüfung.",
        "es": "También puede compartir la vitrina de su proyecto desde ahora y pedir la opinión de su responsable o de su equipo mediante notas adhesivas: suele ser más eficaz que una revisión de documento."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "create-end",
      "target": "#tour-onboarding-anchor",
      "title": {
        "en": "Your project is framed",
        "fr": "Votre projet est cadré",
        "de": "Ihr Projekt ist strukturiert",
        "es": "Su proyecto está encuadrado"
      },
      "content": {
        "en": "The logical next step is to submit it to the experts. You can also discover the showcase or the inspiration area.",
        "fr": "Prochaine étape logique : le soumettre aux experts. Vous pouvez aussi découvrir la vitrine ou l’espace inspiration.",
        "de": "Der logische nächste Schritt: es den Experten vorlegen. Sie können auch die Vitrine oder den Inspirationsbereich entdecken.",
        "es": "El siguiente paso lógico: enviarlo a los expertos. También puede descubrir la vitrina o el espacio de inspiración."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": false,
      "actions": sequenceMenuActions('validate', 'present', 'inspiration')
    },

    {
      "id": "compliance-report-top",
      "target": "[data-tour-id=\"synthesis-summary\"]",
      "title": {
        "en": "Read the project stakes",
        "fr": "Lire les enjeux du projet",
        "de": "Die Projektherausforderungen lesen",
        "es": "Leer los retos del proyecto"
      },
      "content": {
        "en": "The project stakes gather everything without showing it all at once: the left rail says where your project stands and what you can ask for right now, while the right column files the teams, risks, points of attention and the recap of your answers.",
        "fr": "Les enjeux rassemblent tout sans tout vous montrer d’un coup : le rail de gauche dit où en est votre projet et ce que vous pouvez demander maintenant, la colonne de droite range les équipes, les risques, les points de vigilance et le rappel de vos réponses.",
        "de": "Die Projektherausforderungen bündeln alles, ohne alles auf einmal zu zeigen: Die linke Leiste zeigt, wo Ihr Projekt steht und was Sie jetzt anfordern können; die rechte Spalte ordnet Teams, Risiken, Aufmerksamkeitspunkte und die Übersicht Ihrer Antworten.",
        "es": "Los retos lo reúnen todo sin mostrarlo todo de golpe: el panel de la izquierda indica en qué punto está su proyecto y qué puede pedir ahora, y la columna de la derecha ordena los equipos, los riesgos, los puntos de atención y el resumen de sus respuestas."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "start", "inline": "nearest" },
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-readiness",
      "target": "[data-tour-id=\"synthesis-readiness\"]",
      "title": {
        "en": "Consult compliance before you're done",
        "fr": "Consulter la compliance avant d’avoir fini",
        "de": "Die Compliance konsultieren, bevor Sie fertig sind",
        "es": "Consultar a compliance antes de terminar"
      },
      "content": {
        "en": "Orientation, technical advice or validation: this ladder shows exactly what the experts can already do with what you have filled in, and what is still missing to go further.",
        "fr": "Orientation, avis technique ou validation : ce palier montre exactement ce que les experts peuvent déjà faire avec ce que vous avez renseigné, et ce qu’il manque pour aller plus loin.",
        "de": "Orientierung, fachliche Einschätzung oder Validierung: Diese Stufenleiter zeigt genau, was die Experten mit Ihren bisherigen Angaben bereits tun können und was noch fehlt, um weiterzukommen.",
        "es": "Orientación, dictamen técnico o validación: esta escala muestra exactamente lo que los expertos ya pueden hacer con lo que ha completado y lo que falta para ir más lejos."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "start", "inline": "nearest" },
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-missing-info",
      "target": "[data-tour-id=\"mandatory-summary-panel\"]",
      "title": {
        "en": "Complete the mandatory information",
        "fr": "Compléter les informations obligatoires",
        "de": "Die Pflichtangaben vervollständigen",
        "es": "Completar la información obligatoria"
      },
      "content": {
        "en": "This screen takes stock of the core mandatory questions. As long as some are missing, you cannot ask the experts, and the tool tells you which ones. You can still discover your project’s showcase right away.",
        "fr": "Cet écran fait le point sur les questions obligatoires du socle. Tant qu’il en manque, vous ne pouvez pas solliciter les experts, et l’outil vous indique lesquelles. Rien ne vous empêche en revanche de découvrir dès maintenant la vitrine de votre projet.",
        "de": "Dieser Bildschirm zeigt den Stand der Pflichtfragen des Basisbereichs. Solange welche fehlen, können Sie die Experten nicht einbinden, und das Tool nennt Ihnen die betroffenen. Die Vitrine Ihres Projekts können Sie dennoch schon jetzt entdecken.",
        "es": "Esta pantalla hace balance de las preguntas obligatorias del núcleo. Mientras falte alguna, no puede solicitar a los expertos, y la herramienta le indica cuáles. Eso sí, puede descubrir ya la vitrina de su proyecto."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-delays",
      "target": "[data-tour-id=\"synthesis-vigilance\"]",
      "title": {
        "en": "Check your deadlines",
        "fr": "Vérifier vos délais",
        "de": "Ihre Fristen prüfen",
        "es": "Verificar sus plazos"
      },
      "content": {
        "en": "The tool compares your dates with the minimum regulatory lead times and warns you when a milestone is too tight. Better to anticipate it here than to discover it at approval time.",
        "fr": "L’outil compare vos dates aux délais réglementaires minimum et vous alerte quand un jalon est trop serré. Mieux vaut l’anticiper ici que le découvrir au moment de la validation.",
        "de": "Das Tool vergleicht Ihre Termine mit den regulatorischen Mindestfristen und warnt Sie, wenn ein Meilenstein zu knapp ist. Besser hier vorwegnehmen als bei der Freigabe entdecken.",
        "es": "La herramienta compara sus fechas con los plazos reglamentarios mínimos y le avisa cuando un hito está demasiado ajustado. Mejor anticiparlo aquí que descubrirlo en el momento de la validación."
      },
      "placement": "top",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "center", "inline": "nearest" },
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-teams",
      "target": "[data-tour-id=\"synthesis-teams\"]",
      "title": {
        "en": "Know who will be involved",
        "fr": "Savoir qui sera sollicité",
        "de": "Wissen, wer einbezogen wird",
        "es": "Saber a quién se va a solicitar"
      },
      "content": {
        "en": "Here are the expert teams your project calls on, with the points to prepare for each of them. Folded, a card tells you at a glance who is handling that perimeter and where it stands, through a colour dot: blue while the expert has not answered, amber when something is expected from you, green once it is settled. Unfold it for the points to prepare and the exchanges.",
        "fr": "Voici les équipes expertes mobilisées par votre projet, avec les points à préparer pour chacune. Repliée, une carte vous dit d’un coup d’œil qui suit ce périmètre et où il en est, grâce à une pastille de couleur : bleu tant que l’expert n’a pas répondu, ambre quand quelque chose vous est demandé, vert quand c’est acquis. Dépliez-la pour les points à préparer et les échanges.",
        "de": "Hier sind die von Ihrem Projekt einbezogenen Fachteams mit den jeweils vorzubereitenden Punkten. Eingeklappt zeigt eine Karte auf einen Blick, wer diesen Bereich betreut und wie es steht — über einen Farbpunkt: blau, solange der Experte nicht geantwortet hat, bernstein, wenn etwas von Ihnen erwartet wird, grün, wenn es erledigt ist. Klappen Sie sie auf für die vorzubereitenden Punkte und den Austausch.",
        "es": "Estos son los equipos expertos que moviliza su proyecto, con los puntos que debe preparar para cada uno. Plegada, una tarjeta le dice de un vistazo quién lleva ese perímetro y en qué punto está, mediante un punto de color: azul mientras el experto no ha respondido, ámbar cuando se espera algo de usted, verde cuando está resuelto. Despliéguela para ver los puntos a preparar y los intercambios."
      },
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-submit",
      "target": "[data-tour-id=\"synthesis-submit\"]",
      "title": {
        "en": "Two ways to submit",
        "fr": "Deux portes pour solliciter la compliance",
        "de": "Zwei Wege zur Einreichung",
        "es": "Dos vías para solicitar a compliance"
      },
      "content": {
        "en": "The panel puts forward the door that is actually open to you. Once the base information is filled in, you can request a preliminary opinion: the experts are notified and orient you without freezing the project. With several perimeters concerned, you can also start with some of them and ask the others after their opinion. Once every mandatory question has a firm answer, request the final validation of the project instead: each concerned team and committee is then notified to give a formal opinion. You have nobody to notify yourself.",
        "fr": "Le panneau met en avant la porte qui vous est ouverte. Dès que les informations du socle sont renseignées, vous pouvez demander un avis préliminaire : les experts sont notifiés et vous orientent sans figer le projet. Avec plusieurs périmètres concernés, vous pouvez aussi commencer par certains d’entre eux et solliciter les autres après leur avis. Une fois toutes les questions obligatoires renseignées avec des réponses fermes, demandez la validation définitive du projet : chaque équipe et comité concerné est alors notifié pour rendre un avis formel. Vous n’avez personne à prévenir vous-même.",
        "de": "Das Panel stellt die Tür in den Vordergrund, die Ihnen offensteht. Sobald die Basisangaben ausgefüllt sind, können Sie eine vorläufige Stellungnahme anfordern: Die Experten werden benachrichtigt und geben Ihnen eine Orientierung, ohne das Projekt einzufrieren. Sind mehrere Bereiche betroffen, können Sie auch zunächst mit einigen davon beginnen und die anderen nach deren Stellungnahme einbinden. Sobald alle Pflichtfragen mit einer endgültigen Antwort versehen sind, fordern Sie stattdessen die endgültige Validierung des Projekts an: Jedes betroffene Team und Gremium wird dann benachrichtigt, um eine formelle Stellungnahme abzugeben. Sie müssen niemanden selbst informieren.",
        "es": "El panel destaca la puerta que realmente tiene abierta. En cuanto la información básica esté completa, puede solicitar un dictamen preliminar: se notifica a los expertos, que le orientan sin congelar el proyecto. Con varios ámbitos implicados, también puede empezar por algunos y solicitar a los demás tras su dictamen. Una vez que todas las preguntas obligatorias tengan una respuesta firme, solicite en cambio la validación definitiva del proyecto: se notifica entonces a cada equipo y comité implicado para que emita un dictamen formal. No tiene que avisar a nadie usted mismo."
      },
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-cancel-submission",
      "target": "[data-tour-id=\"synthesis-submit\"]",
      "title": {
        "en": "You stay in control",
        "fr": "Vous gardez la main",
        "de": "Sie behalten die Kontrolle",
        "es": "Usted mantiene el control"
      },
      "content": {
        "en": "A project submitted for review stays editable: when you make changes, only the experts actually impacted are re-notified. Cancelling the submission goes further — it pulls the project entirely out of review, from your project list, so you can rework it before submitting again.",
        "fr": "Un projet soumis pour avis reste modifiable : en cas de modifications, seuls les experts concernés par un changement sont re-notifiés. Annuler la soumission va plus loin — cela retire complètement le projet de la revue, depuis votre liste de projets, pour le retravailler avant de le soumettre à nouveau.",
        "de": "Ein zur Prüfung eingereichtes Projekt bleibt bearbeitbar: Bei Änderungen werden nur die tatsächlich betroffenen Experten erneut benachrichtigt. Die Einreichung zurückzuziehen geht weiter — das Projekt wird aus Ihrer Projektliste komplett aus der Prüfung genommen, damit Sie es überarbeiten können, bevor Sie es erneut einreichen.",
        "es": "Un proyecto enviado para dictamen permanece modificable: al hacer cambios, solo se vuelve a notificar a los expertos realmente afectados. Anular el envío va más allá — retira por completo el proyecto de la revisión, desde su lista de proyectos, para poder retrabajarlo antes de enviarlo de nuevo."
      },
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-exchanges",
      "target": "[data-tour-id=\"synthesis-team-exchange\"]",
      "title": {
        "en": "Talk with the experts",
        "fr": "Dialoguer avec les experts",
        "de": "Mit den Experten sprechen",
        "es": "Dialogar con los expertos"
      },
      "content": {
        "en": "This is where it all happens. Each team issues an opinion — Approved, Approved with conditions, Awaiting information, Not concerned or Rejected — along with its recommendations. You reply in the thread, attach a document if needed, and you can see who has taken charge of your file. Everything is traced in one place. For complex questions, don't hesitate to set up a meeting.",
        "fr": "C’est ici que tout se joue. Chaque équipe rend un avis — Validé, Validé sous conditions, En attente d’informations, Non concerné ou Refusé — avec ses recommandations. Vous répondez dans le fil, vous joignez un document si besoin, et vous voyez qui a pris votre dossier en charge. Tout est tracé au même endroit. En cas de questions complexes, n’hésitez pas à organiser une réunion.",
        "de": "Hier entscheidet sich alles. Jedes Team gibt eine Stellungnahme ab — Freigegeben, Freigegeben unter Auflagen, Warten auf Informationen, Nicht betroffen oder Abgelehnt — mit seinen Empfehlungen. Sie antworten im Verlauf, hängen bei Bedarf ein Dokument an und sehen, wer Ihre Akte übernommen hat. Alles ist an einem Ort nachvollziehbar. Bei komplexen Fragen zögern Sie nicht, ein Treffen zu organisieren.",
        "es": "Aquí es donde se juega todo. Cada equipo emite un dictamen — Validado, Validado con condiciones, A la espera de información, No afectado o Rechazado — con sus recomendaciones. Usted responde en el hilo, adjunta un documento si es necesario y ve quién se ha hecho cargo de su expediente. Todo queda trazado en un mismo lugar. Ante preguntas complejas, no dude en organizar una reunión."
      },
      "placement": "top",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "center", "inline": "nearest" },
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-committees",
      "target": "[data-tour-id=\"synthesis-committees\"]",
      "title": {
        "en": "Going through a committee",
        "fr": "Le passage en comité",
        "de": "Der Gang ins Gremium",
        "es": "El paso por comité"
      },
      "content": {
        "en": "Some projects additionally trigger one or more validation committees. Their decisions and arbitrations are recorded in the project report, in the same place as the experts' opinions.",
        "fr": "Certains projets déclenchent en plus un ou plusieurs comités de validation. Leurs décisions et arbitrages sont enregistrés dans le rapport du projet, au même endroit que les avis des experts.",
        "de": "Manche Projekte lösen zusätzlich ein oder mehrere Validierungsgremien aus. Ihre Entscheidungen und Abwägungen werden im Projektbericht festgehalten, am selben Ort wie die Stellungnahmen der Experten.",
        "es": "Algunos proyectos activan además uno o varios comités de validación. Sus decisiones y arbitrajes se registran en el informe del proyecto, en el mismo lugar que los dictámenes de los expertos."
      },
      "placement": "top",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "center", "inline": "nearest" },
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "validate-end",
      "target": "#tour-onboarding-anchor",
      "title": {
        "en": "You know how to get your project approved",
        "fr": "Vous savez faire valider votre projet",
        "de": "Sie wissen, wie Ihr Projekt freigegeben wird",
        "es": "Ya sabe cómo validar su proyecto"
      },
      "content": {
        "en": "Is your project validated? All that is left is to present it well — or to explore the other possibilities of the tool.",
        "fr": "Votre projet est validé ? Il ne reste plus qu’à bien le présenter — ou à explorer les autres possibilités de l’outil.",
        "de": "Ist Ihr Projekt freigegeben? Jetzt muss es nur noch gut präsentiert werden — oder Sie erkunden die weiteren Möglichkeiten des Tools.",
        "es": "¿Su proyecto está validado? Solo queda presentarlo bien, o explorar las demás posibilidades de la herramienta."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": false,
      "actions": sequenceMenuActions('present', 'create', 'inspiration')
    },

    {
      "id": "showcase-top",
      "target": "[data-tour-id=\"showcase-hero\"]",
      "title": {
        "en": "Your showcase already exists",
        "fr": "Votre vitrine existe déjà",
        "de": "Ihre Vitrine gibt es bereits",
        "es": "Su vitrina ya existe"
      },
      "content": {
        "en": "With nothing to do, your project has a showcase built from your answers, whose structure adapts to the project type (for example: problem, solution, benefits, objectives, indicators, team, roadmap, budget). Perfect for a presentation to your manager or a committee.",
        "fr": "Sans rien faire, votre projet dispose d’une vitrine construite à partir de vos réponses, dont la structure s’adapte au type de projet (par exemple : problème, réponse apportée, bénéfices, objectifs, indicateurs, équipe, feuille de route, budget). Parfait pour une présentation à votre manager ou en comité.",
        "de": "Ohne Ihr Zutun verfügt Ihr Projekt über eine Vitrine, die aus Ihren Antworten aufgebaut ist und deren Struktur sich an die Projektart anpasst (zum Beispiel: Problem, Lösung, Nutzen, Ziele, Indikatoren, Team, Fahrplan, Budget). Perfekt für eine Präsentation vor Ihrer Führungskraft oder einem Gremium.",
        "es": "Sin hacer nada, su proyecto dispone de una vitrina construida a partir de sus respuestas, cuya estructura se adapta al tipo de proyecto (por ejemplo: problema, respuesta aportada, beneficios, objetivos, indicadores, equipo, hoja de ruta, presupuesto). Perfecta para una presentación a su responsable o en comité."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "start", "inline": "nearest" },
      "scrollDuration": 1200,
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-bottom",
      "target": "[data-tour-id=\"showcase-roadmap\"]",
      "title": {
        "en": "It stays alive",
        "fr": "Elle reste vivante",
        "de": "Sie bleibt lebendig",
        "es": "Se mantiene viva"
      },
      "content": {
        "en": "You find your milestones there, automatically placed in chronological order, as well as the alerts about meeting certain deadlines. Any change to your answers is reflected here.",
        "fr": "Vous y retrouvez vos jalons, replacés automatiquement dans l’ordre chronologique, ainsi que les alertes liées au respect de certains délais. Toute modification de vos réponses se répercute ici.",
        "de": "Dort finden Sie Ihre Meilensteine, automatisch in chronologischer Reihenfolge angeordnet, sowie die Warnhinweise zur Einhaltung bestimmter Fristen. Jede Änderung Ihrer Antworten wirkt sich hier aus.",
        "es": "Allí encuentra sus hitos, colocados automáticamente en orden cronológico, así como las alertas relativas al cumplimiento de determinados plazos. Cualquier modificación de sus respuestas se refleja aquí."
      },
      "placement": "top",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "center", "inline": "nearest" },
      "scrollDuration": 1400,
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-edit-trigger",
      "target": "[data-tour-id=\"showcase-edit-trigger\"]",
      "title": {
        "en": "You edit the real rendering",
        "fr": "Vous éditez le rendu réel",
        "de": "Sie bearbeiten die echte Darstellung",
        "es": "Usted edita el resultado real"
      },
      "content": {
        "en": "The “Edit” button turns on live editing: you work on the showcase itself, not on a separate form. What you see is exactly what your reader will see.",
        "fr": "Le bouton « Modifier » active l’édition en direct : vous travaillez sur la vitrine elle-même, pas sur un formulaire séparé. Ce que vous voyez est exactement ce que verra votre lecteur.",
        "de": "Die Schaltfläche „Bearbeiten“ aktiviert die Live-Bearbeitung: Sie arbeiten an der Vitrine selbst, nicht in einem separaten Formular. Was Sie sehen, ist genau das, was Ihr Leser sehen wird.",
        "es": "El botón «Modificar» activa la edición en directo: trabaja sobre la vitrina misma, no en un formulario aparte. Lo que ve es exactamente lo que verá su lector."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "center", "inline": "nearest" },
      "scrollDuration": 1400,
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-edit-topbar",
      "target": "[data-tour-id=\"showcase-edit-topbar\"]",
      "title": {
        "en": "The editing toolbar",
        "fr": "La barre d’édition",
        "de": "Die Bearbeitungsleiste",
        "es": "La barra de edición"
      },
      "content": {
        "en": "The Outline to navigate between sections, Undo/Redo to step back without fear, the Preview to hide the editing frame, the Light/Full display switch and the publish status.",
        "fr": "Le Plan pour naviguer entre les sections, Annuler/Rétablir pour revenir en arrière sans crainte, l’Aperçu pour masquer le contour d’édition, le choix d’affichage Light/complet et le statut de publication.",
        "de": "Die Gliederung zum Navigieren zwischen Abschnitten, Rückgängig/Wiederholen für angstfreies Zurückgehen, die Vorschau zum Ausblenden des Bearbeitungsrahmens, die Umschaltung Light/Vollansicht und der Veröffentlichungsstatus.",
        "es": "El Esquema para navegar entre secciones, Deshacer/Rehacer para retroceder sin miedo, la Vista previa para ocultar el contorno de edición, el cambio de visualización Light/completa y el estado de publicación."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-edit",
      "target": "[data-tour-id=\"showcase-edit-panel\"]",
      "title": {
        "en": "Every section has its settings",
        "fr": "Chaque section se règle",
        "de": "Jeder Abschnitt lässt sich einstellen",
        "es": "Cada sección se ajusta"
      },
      "content": {
        "en": "Click a section in the showcase to select it: its texts become editable in place, and the panel shows its own settings — colour from the theme palette, visibility, and for your own blocks, content, formatting and template. You can hide a section from the “Light” display without losing its content.",
        "fr": "Cliquez une section dans la vitrine pour la sélectionner : ses textes deviennent modifiables sur place, et le panneau affiche ses réglages propres — couleur parmi la palette du thème, visibilité, et pour vos propres blocs, contenu, mise en forme et gabarit. Vous pouvez masquer une section de l’affichage « Light » sans perdre son contenu.",
        "de": "Klicken Sie in der Vitrine auf einen Abschnitt, um ihn auszuwählen: Seine Texte werden an Ort und Stelle bearbeitbar, und das Panel zeigt seine eigenen Einstellungen — Farbe aus der Themenpalette, Sichtbarkeit und, bei Ihren eigenen Blöcken, Inhalt, Gestaltung und Vorlage. Sie können einen Abschnitt aus der „Light“-Ansicht ausblenden, ohne seinen Inhalt zu verlieren.",
        "es": "Haga clic en una sección de la vitrina para seleccionarla: sus textos se vuelven editables in situ y el panel muestra sus ajustes propios: color de la paleta del tema, visibilidad y, en sus propios bloques, contenido, formato y plantilla. Puede ocultar una sección de la visualización «Light» sin perder su contenido."
      },
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-custom-sections",
      "target": "[data-tour-id=\"showcase-add-section-panel\"]",
      "title": {
        "en": "Add your own blocks",
        "fr": "Ajoutez vos propres blocs",
        "de": "Fügen Sie eigene Blöcke hinzu",
        "es": "Añada sus propios bloques"
      },
      "content": {
        "en": "The “+” between two sections inserts a block exactly where you want it: key figure, highlight banner, multi-column, narrative block, media gallery (images, videos, sounds), steps, team, quote, or a viewer to embed a document (PDF, slides) by dragging it straight into the page. Each template is previewed as it will appear.",
        "fr": "Le « + » entre deux sections insère un bloc là où vous le voulez : chiffre clé, bandeau de mise en avant, multi-colonnes, bloc narratif, galerie média (images, vidéos, sons), étapes, équipe, citation, ou visionneuse pour intégrer un document (PDF, présentation) en le glissant directement dans la page. Chaque gabarit est prévisualisé tel qu’il s’affichera.",
        "de": "Das „+“ zwischen zwei Abschnitten fügt einen Block genau dort ein, wo Sie ihn haben möchten: Kennzahl, Hervorhebungsbanner, Mehrspalter, Erzählblock, Mediengalerie (Bilder, Videos, Töne), Etappen, Team, Zitat oder ein Viewer, um ein Dokument (PDF, Folien) per Drag-and-drop direkt in die Seite einzubetten. Jede Vorlage wird so angezeigt, wie sie erscheinen wird.",
        "es": "El «+» entre dos secciones inserta un bloque justo donde usted quiere: cifra clave, banner destacado, multicolumna, bloque narrativo, galería multimedia (imágenes, vídeos, sonidos), etapas, equipo, cita o un visor para integrar un documento (PDF, diapositivas) arrastrándolo directamente a la página. Cada plantilla se previsualiza tal como se mostrará."
      },
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-save-edits",
      "target": "[data-tour-id=\"showcase-save-edits\"]",
      "title": {
        "en": "Publish your changes",
        "fr": "Publier vos modifications",
        "de": "Ihre Änderungen veröffentlichen",
        "es": "Publicar los cambios"
      },
      "content": {
        "en": "Your changes stay a draft visible to you alone until you click “Publish”. The bar shows at all times whether changes remain unpublished.",
        "fr": "Vos modifications restent un brouillon visible de vous seul jusqu’à « Publier ». La barre indique en permanence s’il reste des changements non publiés.",
        "de": "Ihre Änderungen bleiben ein nur für Sie sichtbarer Entwurf, bis Sie auf „Veröffentlichen“ klicken. Die Leiste zeigt jederzeit an, ob noch Änderungen unveröffentlicht sind.",
        "es": "Sus modificaciones permanecen como borrador visible solo para usted hasta que pulse «Publicar». La barra indica en todo momento si quedan cambios sin publicar."
      },
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-usage-mode-selection",
      "target": "[data-tour-id=\"showcase-display-mode-buttons\"]",
      "title": {
        "en": "Light or full, depending on the audience",
        "fr": "Light ou complet, selon l’audience",
        "de": "Light oder vollständig, je nach Publikum",
        "es": "Light o completo, según el público"
      },
      "content": {
        "en": "Light mode only shows the sections you pre-selected: ideal to present to a team or in a meeting without exposing “sensitive” or irrelevant elements. Full mode keeps everything.",
        "fr": "Le mode Light ne montre que les sections que vous avez pré-sélectionnées : idéal pour présenter à une équipe ou en séance sans exposer les éléments « sensibles » ou non-pertinents. Le mode complet garde tout.",
        "de": "Der Light-Modus zeigt nur die von Ihnen vorausgewählten Abschnitte: ideal für die Präsentation vor einem Team oder in einer Sitzung, ohne „sensible“ oder nicht relevante Elemente offenzulegen. Der Vollmodus behält alles.",
        "es": "El modo Light solo muestra las secciones que ha preseleccionado: ideal para presentar a un equipo o en una reunión sin exponer elementos «sensibles» o no pertinentes. El modo completo lo mantiene todo."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-share-settings",
      "target": "[data-tour-id=\"showcase-share-dialog\"]",
      "title": {
        "en": "Share and choose what is visible",
        "fr": "Partager et choisir ce qui est visible",
        "de": "Teilen und festlegen, was sichtbar ist",
        "es": "Compartir y elegir qué se ve"
      },
      "content": {
        "en": "Copy the sharing link (or download a shortcut) and choose what your recipients will see: Light or full display, comments allowed or not, everyone's sticky notes or only their own.",
        "fr": "Copiez le lien de partage (ou téléchargez un raccourci) et choisissez ce que verront vos destinataires : affichage Light ou complet, commentaires autorisés ou non, post-its de tous ou uniquement les leurs.",
        "de": "Kopieren Sie den Freigabelink (oder laden Sie eine Verknüpfung herunter) und legen Sie fest, was Ihre Empfänger sehen: Light- oder Vollansicht, Kommentare erlaubt oder nicht, Haftnotizen aller oder nur ihre eigenen.",
        "es": "Copie el enlace de uso compartido (o descargue un acceso directo) y elija lo que verán sus destinatarios: visualización Light o completa, comentarios permitidos o no, notas adhesivas de todos o solo las suyas."
      },
      "placement": "right",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-comment-button",
      "target": "[data-tour-id=\"showcase-comment-toggle\"]",
      "title": {
        "en": "Enable comments",
        "fr": "Activer les commentaires",
        "de": "Kommentare aktivieren",
        "es": "Activar los comentarios"
      },
      "content": {
        "en": "The “Comment” button turns on comment mode: then double-click where you want on the showcase to drop a sticky note.",
        "fr": "Le bouton « Commenter » active le mode commentaire : double-cliquez ensuite à l’endroit voulu de la vitrine pour y déposer un post-it.",
        "de": "Die Schaltfläche „Kommentieren“ aktiviert den Kommentarmodus: Doppelklicken Sie anschließend an der gewünschten Stelle der Vitrine, um eine Haftnotiz zu platzieren.",
        "es": "El botón «Comentar» activa el modo comentario: haga después doble clic en el lugar deseado de la vitrina para colocar una nota adhesiva."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-comments-postits",
      "target": "[data-tour-id=\"showcase-annotation-note\"]",
      "title": {
        "en": "Feedback lands in context",
        "fr": "Le feedback arrive en contexte",
        "de": "Feedback kommt im Kontext an",
        "es": "El feedback llega en contexto"
      },
      "content": {
        "en": "Everyone double-clicks on the showcase to drop their sticky note, right where it matters. Your feedback arrives centralised and in context, instead of scattered across ten separate emails.",
        "fr": "Chacun double-clique sur la vitrine pour y déposer son post-it, à l’endroit concerné. Vos retours arrivent centralisés et contextualisés, plus dans dix mails séparés.",
        "de": "Jeder doppelklickt auf die Vitrine, um seine Haftnotiz genau an der betreffenden Stelle zu platzieren. Ihre Rückmeldungen kommen zentral und im Kontext an, statt verstreut über zehn einzelne E-Mails.",
        "es": "Cada persona hace doble clic en la vitrina para colocar su nota adhesiva, en el punto concreto. Sus comentarios llegan centralizados y en contexto, no dispersos en diez correos distintos."
      },
      "placement": "right",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-end",
      "target": "#tour-onboarding-anchor",
      "title": {
        "en": "Your project is ready to be presented",
        "fr": "Votre projet est prêt à être présenté",
        "de": "Ihr Projekt ist präsentationsbereit",
        "es": "Su proyecto está listo para presentarse"
      },
      "content": {
        "en": "Now discover the other possibilities of the tool.",
        "fr": "Découvrez maintenant les autres possibilités de l’outil.",
        "de": "Entdecken Sie nun die weiteren Möglichkeiten des Tools.",
        "es": "Descubra ahora las demás posibilidades de la herramienta."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": false,
      "actions": sequenceMenuActions('create', 'validate', 'inspiration')
    },

    {
      "id": "project-inspiration",
      "target": "[data-tour-id=\"home-inspiration-block\"]",
      "title": {
        "en": "Find inspiration",
        "fr": "Trouver l’inspiration",
        "de": "Inspiration finden",
        "es": "Encontrar inspiración"
      },
      "content": {
        "en": "To imagine your future project, discover the interesting projects already imagined and shared by other LFB colleagues.",
        "fr": "Pour imaginer votre futur projet, découvrez les projets intéressants déjà imaginés et partagés par d’autres collaborateurs de LFB.",
        "de": "Um Ihr künftiges Projekt zu entwerfen, entdecken Sie die interessanten Projekte, die andere LFB-Kolleginnen und -Kollegen bereits entwickelt und geteilt haben.",
        "es": "Para imaginar su futuro proyecto, descubra los proyectos interesantes ya ideados y compartidos por otros colaboradores de LFB."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "highlightPadding": 16,
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "inspiration-toggle",
      "target": "[data-tour-id=\"home-inspiration-toggle\"]",
      "title": {
        "en": "Look further afield",
        "fr": "Chercher ailleurs",
        "de": "Anderswo suchen",
        "es": "Buscar en otros lugares"
      },
      "content": {
        "en": "If inspiration has to come from elsewhere, click “Inspiration” to discover projects from other organizations and more.",
        "fr": "Si l’inspiration doit venir d’ailleurs, cliquez sur « Inspiration » pour découvrir des projets d’autres organisations…",
        "de": "Wenn die Inspiration von anderswo kommen soll, klicken Sie auf „Inspiration“, um Projekte anderer Organisationen und mehr zu entdecken.",
        "es": "Si la inspiración debe venir de otro lugar, haga clic en «Inspiración» para descubrir proyectos de otras organizaciones…"
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "project-filters",
      "target": "[data-tour-id=\"home-inspiration-filters\"]",
      "title": {
        "en": "Filter to find",
        "fr": "Filtrer pour trouver",
        "de": "Filtern, um zu finden",
        "es": "Filtrar para encontrar"
      },
      "content": {
        "en": "Search and filter by laboratory, country, target or therapeutic area to quickly find what resembles your own subject.",
        "fr": "Recherchez et filtrez par laboratoire, pays, cible ou aire thérapeutique pour retrouver rapidement ce qui ressemble à votre sujet.",
        "de": "Suchen und filtern Sie nach Labor, Land, Zielgruppe oder therapeutischem Gebiet, um schnell zu finden, was Ihrem Thema ähnelt.",
        "es": "Busque y filtre por laboratorio, país, destinatario o área terapéutica para encontrar rápidamente lo que se parece a su tema."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "inspiration-add",
      "target": "[data-tour-id=\"home-add-inspiration\"]",
      "title": {
        "en": "Contribute in turn",
        "fr": "Contribuer à votre tour",
        "de": "Selbst beitragen",
        "es": "Contribuir a su vez"
      },
      "content": {
        "en": "This space is collaborative: add your own inspirations. They can be real projects or ideas from a brainstorming session within LFB!",
        "fr": "Cet espace est collaboratif : ajoutez vos propres inspirations. Il peut s’agir de réels projets ou d’idées issues d’un brainstorming au sein de LFB !",
        "de": "Dieser Bereich ist kollaborativ: Fügen Sie Ihre eigenen Inspirationen hinzu. Das können echte Projekte oder Ideen aus einem Brainstorming innerhalb von LFB sein!",
        "es": "Este espacio es colaborativo: añada sus propias inspiraciones. ¡Pueden ser proyectos reales o ideas surgidas de una lluvia de ideas dentro de LFB!"
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "inspiration-content",
      "target": "[data-tour-id=\"home-add-inspiration\"]",
      "title": {
        "en": "Enrich your entry",
        "fr": "Enrichir votre fiche",
        "de": "Ihren Eintrag anreichern",
        "es": "Enriquecer su ficha"
      },
      "content": {
        "en": "For each inspiration you can add information, your detailed opinion, photos, documents, links… Enough to make it genuinely useful to whoever reads it in six months.",
        "fr": "Pour chaque inspiration, vous pouvez ajouter des informations, votre avis détaillé, des photos, des documents, des liens… De quoi la rendre vraiment utile à celui qui la lira dans six mois.",
        "de": "Zu jeder Inspiration können Sie Informationen, Ihre ausführliche Einschätzung, Fotos, Dokumente, Links hinzufügen … genug, um sie für denjenigen, der sie in sechs Monaten liest, wirklich nützlich zu machen.",
        "es": "Para cada inspiración puede añadir información, su opinión detallada, fotos, documentos, enlaces… Lo suficiente para que sea realmente útil a quien la lea dentro de seis meses."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "inspiration-visibility",
      "target": "[data-tour-id=\"home-inspiration-block\"]",
      "title": {
        "en": "Make it visible to everyone",
        "fr": "La rendre visible de tous",
        "de": "Für alle sichtbar machen",
        "es": "Hacerla visible para todos"
      },
      "content": {
        "en": "An inspiration is “Personal” at first. Switch it to “Shared” to make it visible to everyone: that is what makes the common base grow.",
        "fr": "Une inspiration est d’abord « Personnelle ». Passez-la en « Partagé » pour la rendre visible de tous : c’est ce qui fait grandir la base commune.",
        "de": "Eine Inspiration ist zunächst „Persönlich“. Stellen Sie sie auf „Geteilt“, um sie für alle sichtbar zu machen: Das lässt die gemeinsame Basis wachsen.",
        "es": "Una inspiración es al principio «Personal». Cámbiela a «Compartido» para hacerla visible para todos: eso es lo que hace crecer la base común."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "highlightPadding": 16,
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "inspiration-end",
      "target": "#tour-onboarding-anchor",
      "title": {
        "en": "You have plenty to feed your ideas",
        "fr": "Vous avez de quoi nourrir vos idées",
        "de": "Sie haben genug, um Ihre Ideen zu nähren",
        "es": "Tiene con qué alimentar sus ideas"
      },
      "content": {
        "en": "And when an idea becomes a project, the tool supports you all the way to its approval.",
        "fr": "Et quand une idée devient un projet, l’outil vous accompagne jusqu’à sa validation.",
        "de": "Und wenn aus einer Idee ein Projekt wird, begleitet Sie das Tool bis zur Freigabe.",
        "es": "Y cuando una idea se convierte en proyecto, la herramienta le acompaña hasta su validación."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": false,
      "actions": sequenceMenuActions('create', 'validate', 'present')
    },

    // Le parcours expert reste en fin de tableau : « Précédent » sur la première étape d'une
    // séquence ramène à l'étape qui la précède dans le tableau, et quelqu'un qui n'est pas
    // expert ne doit jamais retomber dans ce parcours-là.
    {
      "id": "expert-intro",
      "target": "[data-tour-id=\"home-compliance-projects\"]",
      "title": {
        "en": "The projects that concern you",
        "fr": "Les projets qui vous concernent",
        "de": "Die Projekte, die Sie betreffen",
        "es": "Los proyectos que le conciernen"
      },
      "content": {
        "en": "This is where the projects that trigger the rules of your team or your committee arrive. There is nothing to look for: the tool brings them to you.",
        "fr": "Ici arrivent les projets qui déclenchent les règles de votre équipe ou de votre comité. Vous n’avez rien à chercher : l’outil vous les apporte.",
        "de": "Hier kommen die Projekte an, die die Regeln Ihres Teams oder Ihres Ausschusses auslösen. Sie müssen nichts suchen: Das Tool bringt sie Ihnen.",
        "es": "Aquí llegan los proyectos que activan las reglas de su equipo o de su comité. No tiene nada que buscar: la herramienta se los trae."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-tabs",
      "target": "[data-tour-id=\"home-compliance-tabs\"]",
      "title": {
        "en": "Your work queue",
        "fr": "Votre file de travail",
        "de": "Ihre Arbeitsliste",
        "es": "Su cola de trabajo"
      },
      "content": {
        "en": "“To review” holds what is waiting for your opinion. “Handled by the team”: a colleague is taking care of it. “Reviewed”: your opinion has been given. “Abandoned”: the owner deleted a project you had answered on, and your work remains available. Committee members also have “Out of committee scope”.",
        "fr": "« À traiter » contient ce qui attend votre avis. « Pris en charge par l’équipe » : un collègue s’en occupe. « Traités » : votre avis est rendu. « Abandonnés » : le porteur a supprimé un projet sur lequel vous aviez répondu, et votre travail reste consultable. Les membres d’un comité ont aussi « Hors scope comité ».",
        "de": "„Zu bearbeiten“ enthält, was auf Ihre Stellungnahme wartet. „Vom Team übernommen“: Ein Kollege kümmert sich darum. „Bearbeitet“: Ihre Stellungnahme ist abgegeben. „Aufgegeben“: Der Projektverantwortliche hat ein Projekt gelöscht, zu dem Sie geantwortet hatten, und Ihre Arbeit bleibt einsehbar. Ausschussmitglieder haben zusätzlich „Außerhalb des Ausschussbereichs“.",
        "es": "«Por tratar» contiene lo que espera su opinión. «Asumidos por el equipo»: un compañero se encarga. «Tratados»: su opinión está emitida. «Abandonados»: el responsable eliminó un proyecto en el que usted había respondido, y su trabajo sigue disponible. Los miembros de un comité también tienen «Fuera del alcance del comité»."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-perimeter",
      "target": "[data-tour-id=\"synthesis-team-card\"]",
      "title": {
        "en": "Your scope in the project",
        "fr": "Votre périmètre dans le projet",
        "de": "Ihr Bereich im Projekt",
        "es": "Su ámbito en el proyecto"
      },
      "content": {
        "en": "When you open a project, you land on its stakes. Your team's card comes first: it recalls why your team is involved and lists the points to prepare that the owner's answers triggered.",
        "fr": "En ouvrant un projet, vous arrivez sur ses enjeux. La carte de votre équipe arrive en tête : elle rappelle pourquoi votre équipe est sollicitée et liste les points à préparer que les réponses du porteur ont déclenchés.",
        "de": "Wenn Sie ein Projekt öffnen, landen Sie bei seinen Herausforderungen. Die Karte Ihres Teams steht oben: Sie erinnert daran, warum Ihr Team eingebunden ist, und listet die vorzubereitenden Punkte auf, die die Antworten des Projektverantwortlichen ausgelöst haben.",
        "es": "Al abrir un proyecto, llega a sus retos. La tarjeta de su equipo aparece primero: recuerda por qué se solicita a su equipo y enumera los puntos que preparar que han activado las respuestas del responsable."
      },
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-showcase-button",
      "target": "[data-tour-id=\"synthesis-showcase\"]",
      "title": {
        "en": "Start with the showcase",
        "fr": "Commencez par la vitrine",
        "de": "Beginnen Sie mit dem Showcase",
        "es": "Empiece por la vitrina"
      },
      "content": {
        "en": "Before going into the details, take a minute for the project showcase. It is how its owner presents it: the ambition, the audience, the team, the main milestones. It is the fastest way to understand what it is about.",
        "fr": "Avant d’entrer dans le détail, prenez une minute pour la vitrine du projet. C’est la présentation qu’en fait son porteur : l’ambition, le public visé, l’équipe, les grandes étapes. C’est le moyen le plus rapide de comprendre de quoi il s’agit.",
        "de": "Bevor Sie ins Detail gehen, nehmen Sie sich eine Minute für das Projekt-Showcase. So stellt der Projektverantwortliche es vor: das Ziel, die Zielgruppe, das Team, die wichtigsten Etappen. Das ist der schnellste Weg zu verstehen, worum es geht.",
        "es": "Antes de entrar en el detalle, dedique un minuto a la vitrina del proyecto. Es la presentación que hace su responsable: la ambición, el público objetivo, el equipo, las grandes etapas. Es la forma más rápida de entender de qué se trata."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-showcase",
      "target": "[data-tour-id=\"showcase-hero\"]",
      "title": {
        "en": "A first overview",
        "fr": "Une première vue d’ensemble",
        "de": "Ein erster Überblick",
        "es": "Una primera visión de conjunto"
      },
      "content": {
        "en": "At a glance, you see what the project wants to achieve and where it stands.",
        "fr": "En un coup d’œil, vous voyez ce que le projet veut accomplir et où il en est.",
        "de": "Auf einen Blick sehen Sie, was das Projekt erreichen will und wo es steht.",
        "es": "De un vistazo, ve lo que el proyecto quiere lograr y en qué punto está."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "scrollIntoViewOptions": { "behavior": "smooth", "block": "start", "inline": "nearest" },
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-back-to-report",
      "target": "[data-tour-id=\"showcase-back-to-report\"]",
      "title": {
        "en": "Back to the stakes",
        "fr": "Revenir aux enjeux",
        "de": "Zurück zu den Herausforderungen",
        "es": "Volver a los retos"
      },
      "content": {
        "en": "Once you have the big picture in mind, this button takes you back to the summary and to your scope.",
        "fr": "Une fois l’idée générale en tête, ce bouton vous ramène à la synthèse et à votre périmètre.",
        "de": "Sobald Sie den Gesamtüberblick haben, bringt Sie diese Schaltfläche zurück zur Zusammenfassung und zu Ihrem Bereich.",
        "es": "Una vez tenga la idea general, este botón le lleva de vuelta a la síntesis y a su ámbito."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-answers",
      "target": "[data-tour-id=\"synthesis-overview\"]",
      "title": {
        "en": "All the owner's answers",
        "fr": "Toutes les réponses du porteur",
        "de": "Alle Antworten des Projektverantwortlichen",
        "es": "Todas las respuestas del responsable"
      },
      "content": {
        "en": "To get to the bottom of the file, the “Project owner’s answers” section holds the whole questionnaire; it opens already expanded for you. An item marked “I don't know yet” is not an answer, it is a question still open — it may well be addressed to you.",
        "fr": "Pour aller au fond du dossier, la section « Réponses du porteur » reprend l’intégralité du questionnaire ; elle s’ouvre déjà dépliée pour vous. Un point marqué « je ne sais pas encore » n’est pas une réponse, c’est une question encore ouverte. Elle vous est peut-être adressée.",
        "de": "Um der Akte auf den Grund zu gehen, enthält der Abschnitt „Antworten des Projektverantwortlichen“ den gesamten Fragebogen; er öffnet sich für Sie bereits aufgeklappt. Ein mit „Ich weiß es noch nicht“ markierter Punkt ist keine Antwort, sondern eine noch offene Frage. Vielleicht ist sie an Sie gerichtet.",
        "es": "Para ir al fondo del expediente, la sección «Respuestas del responsable del proyecto» recoge todo el cuestionario; se abre ya desplegada para usted. Un punto marcado «todavía no lo sé» no es una respuesta, es una pregunta aún abierta. Quizá esté dirigida a usted."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-claim",
      "target": "[data-tour-id=\"synthesis-team-claim\"]",
      "title": {
        "en": "Take charge of the project",
        "fr": "Prendre le projet en charge",
        "de": "Das Projekt übernehmen",
        "es": "Hacerse cargo del proyecto"
      },
      "content": {
        "en": "“I will handle it” makes you the referent of this project for your team. It then leaves your colleagues' “To review” queue, and the following exchanges are sent to you only. Publishing an opinion or setting a status also makes you the referent automatically.",
        "fr": "« Je prends en charge » vous désigne référent de ce projet pour votre équipe. Il quitte alors la file « À traiter » de vos collègues, et les échanges suivants ne sont plus envoyés qu’à vous. Publier un avis ou poser un statut vous désigne aussi automatiquement comme référent.",
        "de": "„Ich übernehme“ macht Sie für Ihr Team zum Ansprechpartner dieses Projekts. Es verschwindet dann aus der Liste „Zu bearbeiten“ Ihrer Kollegen, und der weitere Austausch geht nur noch an Sie. Auch das Veröffentlichen einer Stellungnahme oder das Setzen eines Status macht Sie automatisch zum Ansprechpartner.",
        "es": "«Lo asumo» le designa referente de este proyecto para su equipo. El proyecto sale entonces de la cola «Por tratar» de sus compañeros, y los intercambios siguientes solo se le envían a usted. Publicar una opinión o fijar un estado también le designa automáticamente como referente."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-handover",
      "target": "[data-tour-id=\"synthesis-team-claim\"]",
      "title": {
        "en": "Hand over",
        "fr": "Passer la main",
        "de": "Übergeben",
        "es": "Pasar el relevo"
      },
      "content": {
        "en": "You can no longer follow the project? “Transfer to…” hands it to a colleague from the team, who is notified by email. If the referent is away, any team member can “Take over” the project by giving a reason: nobody stays blocked.",
        "fr": "Vous ne pouvez plus suivre le projet ? « Transférer à… » le confie à un collègue de l’équipe, qui est prévenu par e-mail. Si le référent est absent, n’importe quel membre de l’équipe peut « Reprendre » le projet en indiquant un motif : personne ne reste bloqué.",
        "de": "Sie können das Projekt nicht mehr betreuen? „Übertragen an…“ übergibt es einem Kollegen aus dem Team, der per E-Mail benachrichtigt wird. Ist der Ansprechpartner abwesend, kann jedes Teammitglied das Projekt mit Angabe eines Grundes „Übernehmen“: Niemand bleibt blockiert.",
        "es": "¿Ya no puede seguir el proyecto? «Transferir a…» lo confía a un compañero del equipo, que recibe un aviso por correo. Si el referente está ausente, cualquier miembro del equipo puede «Retomar» el proyecto indicando un motivo: nadie se queda bloqueado."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-followers",
      "target": "[data-tour-id=\"synthesis-team-followers\"]",
      "title": {
        "en": "Keep a colleague in the loop",
        "fr": "Garder un collègue dans la boucle",
        "de": "Einen Kollegen auf dem Laufenden halten",
        "es": "Mantener informado a un compañero"
      },
      "content": {
        "en": "Add a team member as a follower: they also receive the project's notifications, even if someone else has taken it in charge, and they can reply or give the opinion.",
        "fr": "Ajoutez un membre de l’équipe au suivi : il reçoit les notifications du projet même s’il est pris en charge par quelqu’un d’autre, et il peut répondre ou rendre l’avis.",
        "de": "Fügen Sie ein Teammitglied als Beobachter hinzu: Es erhält ebenfalls die Benachrichtigungen des Projekts, auch wenn jemand anderes es übernommen hat, und kann antworten oder die Stellungnahme abgeben.",
        "es": "Añada a un miembro del equipo al seguimiento: recibe las notificaciones del proyecto aunque otra persona se haya hecho cargo, y puede responder o emitir la opinión."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-exchange",
      "target": "[data-tour-id=\"synthesis-team-thread\"]",
      "title": {
        "en": "Talk with the owner",
        "fr": "Échanger avec le porteur",
        "de": "Mit dem Projektverantwortlichen austauschen",
        "es": "Intercambiar con el responsable"
      },
      "content": {
        "en": "This is where the owner answers your team's points to prepare. On your side, you can ask them further questions and attach documents for them to fill in. Everything stays attached to the project, in one place, without going through email.",
        "fr": "C’est ici que le porteur répond aux points à préparer de votre équipe. De votre côté, vous pouvez lui poser des questions supplémentaires et lui joindre des documents à compléter. Tout reste attaché au projet, au même endroit, sans passer par la messagerie.",
        "de": "Hier beantwortet der Projektverantwortliche die vorzubereitenden Punkte Ihres Teams. Ihrerseits können Sie ihm weitere Fragen stellen und Dokumente zum Ausfüllen anhängen. Alles bleibt am Projekt, an einem Ort, ohne Umweg über E-Mails.",
        "es": "Aquí el responsable responde a los puntos que preparar de su equipo. Por su parte, puede hacerle preguntas adicionales y adjuntarle documentos que completar. Todo queda vinculado al proyecto, en un mismo lugar, sin pasar por el correo."
      },
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-opinion",
      "target": "[data-tour-id=\"synthesis-team-opinion\"]",
      "title": {
        "en": "Give your opinion",
        "fr": "Rendre votre avis",
        "de": "Ihre Stellungnahme abgeben",
        "es": "Emitir su opinión"
      },
      "content": {
        "en": "Once you have what you need, choose a status: Approved, Approved with conditions, Awaiting information, Not applicable or Rejected. Explain it in a few lines. The owner only sees your card once you have written something in it.",
        "fr": "Une fois les éléments réunis, choisissez un statut : Validé, Validé sous conditions, En attente d’informations, Non concerné ou Refusé. Expliquez-le en quelques lignes. Le porteur ne voit votre carte qu’à partir du moment où vous y avez écrit quelque chose.",
        "de": "Sobald Sie alles beisammen haben, wählen Sie einen Status: Genehmigt, Genehmigt unter Bedingungen, Warten auf Informationen, Nicht betroffen oder Abgelehnt. Begründen Sie ihn in wenigen Zeilen. Der Projektverantwortliche sieht Ihre Karte erst, wenn Sie etwas hineingeschrieben haben.",
        "es": "Una vez reunidos los elementos, elija un estado: Validado, Validado con condiciones, A la espera de información, No aplica o Rechazado. Explíquelo en unas líneas. El responsable solo ve su tarjeta a partir del momento en que usted ha escrito algo en ella."
      },
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-preliminary-request",
      "target": "#tour-onboarding-anchor",
      "title": {
        "en": "A request for a preliminary opinion",
        "fr": "Une demande d’avis préliminaire",
        "de": "Eine Anfrage nach einer vorläufigen Stellungnahme",
        "es": "Una solicitud de opinión preliminar"
      },
      "content": {
        "en": "An owner can call on you early, on a project still under construction: only the core questions are required, and some answers may still be “I don't know yet”. You can then give them a preliminary opinion or a first orientation: point out what to watch and the questions to prepare. It is not an approval: a favourable opinion shows as “Preliminary advice”, never as “Approved”.",
        "fr": "Un porteur peut vous solliciter tôt, sur un projet encore en construction : seules les questions du socle sont exigées, et certaines réponses peuvent encore être « je ne sais pas encore ». Vous pouvez alors lui rendre un avis préliminaire ou une première orientation : signaler les points de vigilance et les questions à préparer. Ce n’est pas une validation : un avis favorable apparaît comme « Avis préliminaire », jamais comme « Validé ».",
        "de": "Ein Projektverantwortlicher kann Sie früh hinzuziehen, bei einem Projekt, das noch im Aufbau ist: Nur die Kernfragen sind erforderlich, und manche Antworten können noch „Ich weiß es noch nicht“ lauten. Sie können ihm dann eine vorläufige Stellungnahme oder eine erste Orientierung geben: auf Punkte hinweisen, die Aufmerksamkeit verdienen, und auf vorzubereitende Fragen. Das ist keine Freigabe: Eine positive Stellungnahme erscheint als „Vorläufige Einschätzung“, nie als „Genehmigt“.",
        "es": "Un responsable puede consultarle pronto, sobre un proyecto aún en construcción: solo se exigen las preguntas básicas, y algunas respuestas todavía pueden ser «todavía no lo sé». Puede entonces darle una opinión preliminar o una primera orientación: señalar los puntos de atención y las preguntas que preparar. No es una validación: una opinión favorable aparece como «Dictamen preliminar», nunca como «Validado»."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-final-request",
      "target": "#tour-onboarding-anchor",
      "title": {
        "en": "A request for approval",
        "fr": "Une demande de validation",
        "de": "Eine Anfrage nach Freigabe",
        "es": "Una solicitud de validación"
      },
      "content": {
        "en": "Once the project is settled, the owner requests approval: every mandatory question then has a firm answer, with no “I don't know yet” left. You give a formal decision on your scope.",
        "fr": "Quand le projet est arrêté, le porteur demande la validation : toutes les questions obligatoires ont alors une réponse ferme, sans plus aucun « je ne sais pas encore ». Vous vous prononcez formellement sur votre périmètre.",
        "de": "Sobald das Projekt feststeht, beantragt der Projektverantwortliche die Freigabe: Alle Pflichtfragen haben dann eine feste Antwort, ohne ein einziges „Ich weiß es noch nicht“. Sie entscheiden formell über Ihren Bereich.",
        "es": "Cuando el proyecto está cerrado, el responsable solicita la validación: todas las preguntas obligatorias tienen entonces una respuesta firme, sin ningún «todavía no lo sé». Usted se pronuncia formalmente sobre su ámbito."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-staged-consultation",
      "target": "#tour-onboarding-anchor",
      "title": {
        "en": "A consultation in stages",
        "fr": "Une consultation par étapes",
        "de": "Eine Konsultation in Etappen",
        "es": "Una consulta por etapas"
      },
      "content": {
        "en": "For a preliminary opinion, the owner can start with some scopes only — for example the one the rest depends on — then call on the others with a corrected project. A team not yet called on receives nothing and does not see the project. As long as not every scope has been consulted, the project stays in “Partial consultation”.",
        "fr": "Pour un avis préliminaire, le porteur peut commencer par certains périmètres seulement, par exemple celui dont dépend le reste, puis solliciter les autres sur un projet corrigé. Une équipe pas encore sollicitée ne reçoit rien et ne voit pas le projet. Tant que tous les périmètres n’ont pas été consultés, le projet reste en « Consultation partielle ».",
        "de": "Für eine vorläufige Stellungnahme kann der Projektverantwortliche zunächst nur bestimmte Bereiche einbinden – etwa den, von dem der Rest abhängt – und die anderen dann mit einem überarbeiteten Projekt anfragen. Ein noch nicht angefragtes Team erhält nichts und sieht das Projekt nicht. Solange nicht alle Bereiche konsultiert wurden, bleibt das Projekt in „Teilweise Konsultation“.",
        "es": "Para una opinión preliminar, el responsable puede empezar solo por algunos ámbitos, por ejemplo aquel del que depende el resto, y luego consultar a los demás con un proyecto corregido. Un equipo aún no consultado no recibe nada y no ve el proyecto. Mientras no se hayan consultado todos los ámbitos, el proyecto queda en «Consulta parcial»."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-project-evolves",
      "target": "[data-tour-id=\"synthesis-team-review\"]",
      "title": {
        "en": "The project keeps evolving",
        "fr": "Le projet continue d’évoluer",
        "de": "Das Projekt entwickelt sich weiter",
        "es": "El proyecto sigue evolucionando"
      },
      "content": {
        "en": "After sending, the owner can still change their project. You are only notified if a change affects your scope; your opinion then shows “To review again”. Before launch, the owner can also ask you to confirm your opinion: one click on “I confirm my opinion” is enough. If you write a new opinion, it counts as a confirmation.",
        "fr": "Après l’envoi, le porteur peut encore modifier son projet. Vous n’êtes prévenu que si une modification change ce qui concerne votre périmètre ; votre avis passe alors « À ré-examiner ». Avant le lancement, le porteur peut aussi vous demander de confirmer votre avis : un clic sur « Je confirme mon avis » suffit. Si vous rédigez un nouvel avis, il vaut confirmation.",
        "de": "Nach dem Versand kann der Projektverantwortliche sein Projekt weiterhin ändern. Sie werden nur benachrichtigt, wenn eine Änderung Ihren Bereich betrifft; Ihre Stellungnahme steht dann auf „Erneut prüfen“. Vor dem Start kann er Sie außerdem bitten, Ihre Stellungnahme zu bestätigen: Ein Klick auf „Ich bestätige meine Stellungnahme“ genügt. Wenn Sie eine neue Stellungnahme verfassen, gilt sie als Bestätigung.",
        "es": "Tras el envío, el responsable todavía puede modificar su proyecto. Solo recibe un aviso si una modificación cambia lo que concierne a su ámbito; su opinión pasa entonces a «Volver a examinar». Antes del lanzamiento, el responsable también puede pedirle que confirme su opinión: basta un clic en «Confirmo mi dictamen». Si redacta una nueva opinión, vale como confirmación."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "expert-end",
      "target": "#tour-onboarding-anchor",
      "title": {
        "en": "You are ready",
        "fr": "Vous êtes prêt",
        "de": "Sie sind bereit",
        "es": "Está listo"
      },
      "content": {
        "en": "A planned absence? Declare it in your profile (“Absence and backup”) with a backup, so that nothing stays pending. You can relaunch this tour at any time from “Interactive guide”.",
        "fr": "Une absence prévue ? Déclarez-la dans votre profil (« Absence et suppléance ») avec un suppléant, pour que rien ne reste en attente. Vous pouvez relancer ce parcours à tout moment depuis « Guide interactif ».",
        "de": "Eine geplante Abwesenheit? Tragen Sie sie in Ihrem Profil („Abwesenheit und Vertretung“) mit einer Vertretung ein, damit nichts liegen bleibt. Sie können diesen Rundgang jederzeit über „Interaktiver Leitfaden“ erneut starten.",
        "es": "¿Una ausencia prevista? Declárela en su perfil («Ausencia y suplencia») con un suplente, para que nada quede pendiente. Puede volver a lanzar este recorrido en cualquier momento desde «Guía interactiva»."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": false,
      "actions": sequenceMenuActions('create', 'validate')
    }
  ]
};
