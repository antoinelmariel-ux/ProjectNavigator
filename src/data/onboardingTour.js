// Le tour est découpé en 5 séquences autonomes (tour rapide, créer, valider, présenter,
// inspirer) reliées par des actions `goTo` : l'étape `welcome` sert de menu d'entrée et
// chaque séquence se termine par une étape-menu qui renvoie vers les autres. L'ordre du
// tableau `steps` reste significatif (le bouton « Suivant » avance d'un cran), donc les
// étapes d'une même séquence doivent rester contiguës, et chaque étape-menu porte
// `showDefaultButtons: false` pour ne pas déborder sur la séquence suivante.
//
// `version` gouverne la bascule : une config plus ancienne déjà persistée (localStorage ou
// settings.json publié) est remplacée par celle-ci au démarrage — voir
// normalizeOnboardingConfig dans src/utils/onboarding.js. L'incrémenter écrase donc les
// personnalisations back-office du tour : à ne faire que pour une refonte assumée.
export const ONBOARDING_TOUR_VERSION = 4;

const ACTION_LABELS = {
  create: { en: 'Create a project', fr: 'Créer un projet', de: 'Ein Projekt erstellen', es: 'Crear un proyecto' },
  validate: { en: 'Get your project approved', fr: 'Valider son projet', de: 'Projekt validieren lassen', es: 'Validar su proyecto' },
  present: { en: 'Present your project', fr: 'Présenter son projet', de: 'Projekt präsentieren', es: 'Presentar su proyecto' },
  inspiration: { en: 'Find inspiration', fr: 'Trouver l’inspiration', de: 'Inspiration finden', es: 'Encontrar inspiración' },
  quick: { en: 'Quick tour', fr: 'Tour rapide', de: 'Schnellrundgang', es: 'Recorrido rápido' },
  finish: { en: 'Finish the tour', fr: 'Terminer la visite', de: 'Rundgang beenden', es: 'Finalizar la visita' }
};

const SEQUENCE_ENTRY_STEPS = {
  quick: 'quick-intro',
  create: 'create-project',
  validate: 'compliance-report-top',
  present: 'showcase-top',
  inspiration: 'project-inspiration'
};

const goToSequence = (key, variant = 'ghost') => ({
  id: `go-${key}`,
  label: ACTION_LABELS[key],
  action: 'goTo',
  stepId: SEQUENCE_ENTRY_STEPS[key],
  variant
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
        "en": "Project Navigator helps you frame your project, identify the experts to involve and secure your regulatory deadlines. Where would you like to start? You can relaunch the other tours at any time from the “Interactive guide” button.",
        "fr": "Project Navigator vous aide à cadrer votre projet, à identifier les experts à mobiliser et à sécuriser vos délais réglementaires. Par où souhaitez-vous commencer ? Vous pourrez relancer les autres visites à tout moment via le bouton « Guide interactif ».",
        "de": "Project Navigator hilft Ihnen, Ihr Projekt zu strukturieren, die einzubindenden Experten zu ermitteln und Ihre regulatorischen Fristen abzusichern. Womit möchten Sie beginnen? Sie können die anderen Rundgänge jederzeit über die Schaltfläche „Interaktiver Leitfaden“ erneut starten.",
        "es": "Project Navigator le ayuda a encuadrar su proyecto, identificar los expertos que debe movilizar y asegurar sus plazos reglamentarios. ¿Por dónde quiere empezar? Puede volver a lanzar las demás visitas en cualquier momento desde el botón «Guía interactiva»."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": false,
      "actions": [
        goToSequence('quick', 'primary'),
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
        "en": "Project Navigator supports you from the idea to the approval: you describe your project, and the tool identifies the regulatory risks, the experts to involve and the deadlines to meet. Follow the guide — we'll show you everything on a sample project.",
        "fr": "Project Navigator vous accompagne de l’idée à la validation : vous décrivez votre projet, l’outil identifie les risques réglementaires, les experts à mobiliser et les délais à tenir. Suivez le guide, on vous montre tout sur un projet d’exemple.",
        "de": "Project Navigator begleitet Sie von der Idee bis zur Freigabe: Sie beschreiben Ihr Projekt, das Tool ermittelt die regulatorischen Risiken, die einzubindenden Experten und die einzuhaltenden Fristen. Folgen Sie dem Leitfaden — wir zeigen Ihnen alles an einem Beispielprojekt.",
        "es": "Project Navigator le acompaña de la idea a la validación: usted describe su proyecto y la herramienta identifica los riesgos reglamentarios, los expertos que debe movilizar y los plazos que debe cumplir. Siga la guía: se lo mostramos todo con un proyecto de ejemplo."
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
        "en": "Everything starts here: questions appear according to your answers and your activity scope, each one is explained, and everything is saved continuously. You never fill in a useless field.",
        "fr": "Tout commence ici : les questions apparaissent selon vos réponses et votre périmètre d’activité, chacune est expliquée, et tout est sauvegardé en continu. Vous ne remplissez jamais un champ inutile.",
        "de": "Hier beginnt alles: Die Fragen erscheinen je nach Ihren Antworten und Ihrem Tätigkeitsbereich, jede wird erläutert, und alles wird laufend gespeichert. Sie füllen nie ein unnötiges Feld aus.",
        "es": "Todo empieza aquí: las preguntas aparecen según sus respuestas y su ámbito de actividad, cada una se explica y todo se guarda de forma continua. Nunca rellena un campo inútil."
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
        "en": "As soon as your answers are in: risk level, points of attention, expert teams concerned and a check of your regulatory deadlines. You have nothing to calculate, and no regulation to know by heart.",
        "fr": "Dès vos réponses saisies : niveau de risque, points de vigilance, équipes expertes concernées et vérification de vos délais réglementaires. Vous n’avez rien à calculer, ni à connaître de la réglementation.",
        "de": "Sobald Ihre Antworten vorliegen: Risikoniveau, Aufmerksamkeitspunkte, betroffene Expertenteams und Prüfung Ihrer regulatorischen Fristen. Sie müssen nichts berechnen und keine Vorschriften kennen.",
        "es": "En cuanto introduce sus respuestas: nivel de riesgo, puntos de atención, equipos expertos implicados y verificación de sus plazos reglamentarios. No tiene nada que calcular ni que conocer de la normativa."
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
        "en": "Your project becomes a visual showcase generated from your answers, with no layout work on your side. Ready to present to your manager, your management or a committee.",
        "fr": "Votre projet devient une vitrine visuelle générée à partir de vos réponses, sans aucune mise en page de votre part. Prête à présenter à votre manager, votre direction ou un comité.",
        "de": "Ihr Projekt wird zu einer visuellen Vitrine, die aus Ihren Antworten erzeugt wird — ganz ohne Layoutarbeit Ihrerseits. Bereit für die Präsentation vor Ihrer Führungskraft, der Leitung oder einem Gremium.",
        "es": "Su proyecto se convierte en una vitrina visual generada a partir de sus respuestas, sin ningún trabajo de maquetación por su parte. Lista para presentar a su responsable, su dirección o un comité."
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
        "en": "Texts, colours, custom sections, embedded documents: you edit everything directly on the final rendering, never in a separate form.",
        "fr": "Textes, couleurs, sections sur mesure, documents intégrés : vous modifiez tout directement sur le rendu final, jamais dans un formulaire séparé.",
        "de": "Texte, Farben, maßgeschneiderte Abschnitte, eingebettete Dokumente: Sie bearbeiten alles direkt in der endgültigen Darstellung, nie in einem separaten Formular.",
        "es": "Textos, colores, secciones a medida, documentos integrados: lo modifica todo directamente sobre el resultado final, nunca en un formulario aparte."
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
        "en": "You share the showcase with a link and collect feedback as sticky notes placed directly on the page. Centralised and in context, instead of scattered across ten separate emails.",
        "fr": "Vous partagez la vitrine d’un lien et récoltez les retours sous forme de post-its déposés directement sur la page. Centralisés et contextualisés, plus dans dix mails séparés.",
        "de": "Sie teilen die Vitrine per Link und sammeln Rückmeldungen als Haftnotizen, die direkt auf der Seite platziert werden. Zentral und im Kontext statt verstreut über zehn einzelne E-Mails.",
        "es": "Comparte la vitrina con un enlace y recoge los comentarios en forma de notas adhesivas colocadas directamente en la página. Centralizados y en contexto, en lugar de dispersos en diez correos distintos."
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
      "actions": sequenceMenuActions('create', 'validate', 'present', 'inspiration')
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
        "en": "Fill in the requested information step by step. Everything is saved automatically with each answer: you can close the tab and come back later, even after losing your connection.",
        "fr": "Renseignez les informations demandées étape par étape. Tout est enregistré automatiquement à chaque réponse : vous pouvez fermer l’onglet et reprendre plus tard, même après une coupure de réseau.",
        "de": "Geben Sie die angeforderten Informationen Schritt für Schritt ein. Alles wird bei jeder Antwort automatisch gespeichert: Sie können den Tab schließen und später fortfahren, selbst nach einem Verbindungsabbruch.",
        "es": "Complete la información solicitada paso a paso. Todo se guarda automáticamente con cada respuesta: puede cerrar la pestaña y continuar más tarde, incluso tras un corte de red."
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
      "id": "question-stage",
      "target": "[data-tour-id=\"question-stage-selector\"]",
      "title": {
        "en": "Where is your project right now?",
        "fr": "Où en est votre projet ?",
        "de": "Wo steht Ihr Projekt gerade?",
        "es": "¿En qué punto está su proyecto?"
      },
      "content": {
        "en": "Framing, design or about to launch: the stage you declare decides which questions are mandatory right now, not what you will eventually have to answer. Set it honestly to consult compliance without waiting for a finished project.",
        "fr": "Cadrage, conception ou pré-lancement : le stade que vous déclarez décide de ce qui vous est demandé maintenant, pas de ce que vous devrez trancher au final. Déclarez-le honnêtement pour consulter la compliance sans attendre un projet terminé.",
        "de": "Konzeption, Ausarbeitung oder kurz vor dem Start: Das von Ihnen angegebene Stadium bestimmt, was jetzt von Ihnen verlangt wird — nicht, was Sie am Ende entscheiden müssen. Geben Sie es ehrlich an, um die Compliance zu konsultieren, ohne auf ein fertiges Projekt zu warten.",
        "es": "Encuadre, diseño o a punto de lanzarse: la etapa que declara decide lo que se le pide ahora, no lo que tendrá que decidir al final. Decláelo con honestidad para consultar a compliance sin esperar a tener un proyecto terminado."
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
        "en": "“Understand this question” opens the contextual help: what is expected from you, practical tips, and the reason why this question is being asked.",
        "fr": "« Comprendre cette question » ouvre l’aide contextuelle : ce qu’on attend de vous, des conseils pratiques, et la raison pour laquelle cette question vous est posée.",
        "de": "„Diese Frage verstehen“ öffnet die kontextbezogene Hilfe: was von Ihnen erwartet wird, praktische Tipps und der Grund, warum Ihnen diese Frage gestellt wird.",
        "es": "«Comprender esta pregunta» abre la ayuda contextual: qué se espera de usted, consejos prácticos y el motivo por el que se le plantea esta pregunta."
      },
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "question-answer-types",
      "target": "[data-tour-id=\"question-main-content\"]",
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
      "id": "question-ask-expert",
      "target": "[data-tour-id=\"question-ask-expert\"]",
      "title": {
        "en": "Ask an expert without submitting anything",
        "fr": "Interroger un expert sans rien soumettre",
        "de": "Einen Experten fragen, ohne etwas einzureichen",
        "es": "Preguntar a un experto sin enviar nada"
      },
      "content": {
        "en": "A doubt on a specific question? Ask it right here, to the right team: your question stays attached to this question and the team is notified. Marking an answer “I do not know yet” offers the same routing when that answer changes the analysis.",
        "fr": "Un doute sur une question précise ? Posez-la ici même, à la bonne équipe : votre question reste attachée à cette question et l’équipe est notifiée. Répondre « Je ne sais pas encore » propose le même envoi quand cette réponse influe sur l’analyse.",
        "de": "Ein Zweifel bei einer bestimmten Frage? Stellen Sie sie genau hier dem richtigen Team: Ihre Frage bleibt an diese Frage geknüpft, und das Team wird benachrichtigt. Die Antwort „Ich weiß es noch nicht“ bietet dieselbe Weiterleitung, wenn diese Antwort die Analyse beeinflusst.",
        "es": "¿Una duda sobre una pregunta concreta? Plantéela aquí mismo al equipo adecuado: su pregunta queda vinculada a esta pregunta y el equipo recibe una notificación. Responder «Aún no lo sé» ofrece el mismo envío cuando esa respuesta influye en el análisis."
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
        "en": "The project stakes gather everything: the calculated risk level, the teams concerned, the points of attention and the recap of your answers — which you can edit straight from here.",
        "fr": "Les enjeux du projet rassemblent tout : le niveau de risque calculé, les équipes concernées, les points de vigilance et le rappel de vos réponses — que vous pouvez modifier directement depuis ici.",
        "de": "Die Projektherausforderungen bündeln alles: das berechnete Risikoniveau, die betroffenen Teams, die Aufmerksamkeitspunkte und die Übersicht Ihrer Antworten — die Sie direkt von hier aus ändern können.",
        "es": "Los retos del proyecto lo reúnen todo: el nivel de riesgo calculado, los equipos implicados, los puntos de atención y el resumen de sus respuestas, que puede modificar directamente desde aquí."
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
        "en": "Orientation, technical advice or validation: this ladder shows exactly what the experts can already do with what you have filled in, and what is still missing to go further. You don't need a finished project to get a first read.",
        "fr": "Orientation, avis technique ou validation : ce palier montre exactement ce que les experts peuvent déjà faire avec ce que vous avez renseigné, et ce qu’il manque pour aller plus loin. Pas besoin d’un projet terminé pour obtenir une première lecture.",
        "de": "Orientierung, fachliche Einschätzung oder Validierung: Diese Stufenleiter zeigt genau, was die Experten mit Ihren bisherigen Angaben bereits tun können und was noch fehlt, um weiterzukommen. Sie brauchen kein fertiges Projekt für eine erste Einschätzung.",
        "es": "Orientación, dictamen técnico o validación: esta escala muestra exactamente lo que los expertos ya pueden hacer con lo que ha completado y lo que falta para ir más lejos. No necesita un proyecto terminado para obtener una primera lectura."
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
        "en": "This screen takes stock of the mandatory questions. As long as some are missing, submission is refused and the tool tells you which ones: the experts cannot assess an incomplete file.",
        "fr": "Cet écran fait le point sur les questions obligatoires. Tant qu’il en manque, la soumission est refusée et l’outil vous indique lesquelles : les experts ne peuvent pas évaluer un dossier incomplet.",
        "de": "Dieser Bildschirm zeigt den Stand der Pflichtfragen. Solange welche fehlen, wird die Einreichung abgelehnt und das Tool nennt Ihnen die betroffenen: Die Experten können eine unvollständige Akte nicht bewerten.",
        "es": "Esta pantalla hace balance de las preguntas obligatorias. Mientras falte alguna, el envío se rechaza y la herramienta le indica cuáles: los expertos no pueden evaluar un expediente incompleto."
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
        "en": "Here are the expert teams mobilised by your project, with the points to prepare for each of them, and the validation committees that may be required. You know in advance which questions you will be asked.",
        "fr": "Voici les équipes expertes mobilisées par votre projet, avec les points à préparer pour chacune, et les comités de validation éventuellement requis. Vous savez à l’avance quelles questions vous seront posées.",
        "de": "Hier sind die von Ihrem Projekt mobilisierten Expertenteams mit den jeweils vorzubereitenden Punkten sowie die gegebenenfalls erforderlichen Validierungsgremien. Sie wissen im Voraus, welche Fragen Ihnen gestellt werden.",
        "es": "Estos son los equipos expertos movilizados por su proyecto, con los puntos que debe preparar para cada uno, y los comités de validación que puedan ser necesarios. Sabe de antemano qué preguntas se le plantearán."
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
        "en": "Once the base information is filled in, request a preliminary opinion: the experts orient you without freezing the project. Once every mandatory question has a firm answer, request final validation instead — this time each concerned team and committee is notified to give a formal opinion. You have nobody to notify yourself.",
        "fr": "Dès que les informations du socle sont renseignées, demandez un avis préliminaire : les experts vous orientent sans figer le projet. Une fois toutes les questions obligatoires renseignées avec des réponses fermes, demandez plutôt la validation — chaque équipe et comité concerné est alors notifié pour rendre un avis formel. Vous n’avez personne à prévenir vous-même.",
        "de": "Sobald die Basisangaben ausgefüllt sind, fordern Sie eine vorläufige Stellungnahme an: Die Experten geben Ihnen eine Orientierung, ohne das Projekt einzufrieren. Sobald alle Pflichtfragen mit einer endgültigen Antwort versehen sind, fordern Sie stattdessen die Validierung an — dann wird jedes betroffene Team und Gremium benachrichtigt, um eine formelle Stellungnahme abzugeben. Sie müssen niemanden selbst informieren.",
        "es": "En cuanto la información básica esté completa, solicite un dictamen preliminar: los expertos le orientan sin congelar el proyecto. Una vez que todas las preguntas obligatorias tengan una respuesta firme, solicite en cambio la validación — entonces se notifica a cada equipo y comité implicado para que emita un dictamen formal. No tiene que avisar a nadie usted mismo."
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
        "en": "A submitted project already stays editable: small corrections don't require anything special, and only the teams actually impacted by a change get re-notified. Cancelling the submission goes further — it pulls the project entirely out of review, from your project list, so you can rework it before submitting again.",
        "fr": "Un projet soumis reste déjà modifiable : les petites corrections ne demandent rien de particulier, et seules les équipes réellement concernées par un changement sont re-notifiées. Annuler la soumission va plus loin — cela retire complètement le projet de la revue, depuis votre liste de projets, pour le retravailler avant de le soumettre à nouveau.",
        "de": "Ein eingereichtes Projekt bleibt bereits bearbeitbar: kleine Korrekturen erfordern nichts Besonderes, und nur die tatsächlich betroffenen Teams werden bei einer Änderung erneut benachrichtigt. Die Einreichung zurückzuziehen geht weiter — das Projekt wird aus Ihrer Projektliste komplett aus der Prüfung genommen, damit Sie es überarbeiten können, bevor Sie es erneut einreichen.",
        "es": "Un proyecto enviado ya permanece modificable: las pequeñas correcciones no requieren nada especial, y solo los equipos realmente afectados por un cambio vuelven a ser notificados. Anular el envío va más allá — retira por completo el proyecto de la revisión, desde su lista de proyectos, para poder retrabajarlo antes de enviarlo de nuevo."
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
        "en": "This is where it all happens. Each team issues an opinion — Approved, Approved with conditions, Awaiting information, Not concerned or Rejected — along with its recommendations. You reply in the thread, attach a document if needed, and you can see who has taken charge of your file. Everything is traced in one place.",
        "fr": "C’est ici que tout se joue. Chaque équipe rend un avis — Validé, Validé sous conditions, En attente d’informations, Non concerné ou Refusé — avec ses recommandations. Vous répondez dans le fil, vous joignez un document si besoin, et vous voyez qui a pris votre dossier en charge. Tout est tracé au même endroit.",
        "de": "Hier entscheidet sich alles. Jedes Team gibt eine Stellungnahme ab — Freigegeben, Freigegeben unter Auflagen, Warten auf Informationen, Nicht betroffen oder Abgelehnt — mit seinen Empfehlungen. Sie antworten im Verlauf, hängen bei Bedarf ein Dokument an und sehen, wer Ihre Akte übernommen hat. Alles ist an einem Ort nachvollziehbar.",
        "es": "Aquí es donde se juega todo. Cada equipo emite un dictamen — Validado, Validado con condiciones, A la espera de información, No afectado o Rechazado — con sus recomendaciones. Usted responde en el hilo, adjunta un documento si es necesario y ve quién se ha hecho cargo de su expediente. Todo queda trazado en un mismo lugar."
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
        "en": "All that is left is to present it well — or to explore the other possibilities of the tool.",
        "fr": "Il ne reste plus qu’à bien le présenter — ou à explorer les autres possibilités de l’outil.",
        "de": "Jetzt muss es nur noch gut präsentiert werden — oder Sie erkunden die weiteren Möglichkeiten des Tools.",
        "es": "Solo queda presentarlo bien, o explorar las demás posibilidades de la herramienta."
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
        "en": "With nothing to do, your project has a showcase built from your answers: problem, solution, benefits, objectives, indicators, team, roadmap, budget. Perfect for a presentation to your manager or a committee.",
        "fr": "Sans rien faire, votre projet dispose d’une vitrine construite à partir de vos réponses : problème, réponse apportée, bénéfices, objectifs, indicateurs, équipe, feuille de route, budget. Parfait pour une présentation à votre manager ou en comité.",
        "de": "Ohne Ihr Zutun verfügt Ihr Projekt über eine Vitrine, die aus Ihren Antworten aufgebaut ist: Problem, Lösung, Nutzen, Ziele, Indikatoren, Team, Fahrplan, Budget. Perfekt für eine Präsentation vor Ihrer Führungskraft oder einem Gremium.",
        "es": "Sin hacer nada, su proyecto dispone de una vitrina construida a partir de sus respuestas: problema, respuesta aportada, beneficios, objetivos, indicadores, equipo, hoja de ruta, presupuesto. Perfecta para una presentación a su responsable o en comité."
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
        "en": "Click a section in the showcase to select it: its texts become editable in place, and the panel shows its own settings — template, milestones, colour from the theme palette, visibility. You can hide a section without losing its content.",
        "fr": "Cliquez une section dans la vitrine pour la sélectionner : ses textes deviennent modifiables sur place, et le panneau affiche ses réglages propres — gabarit, jalons, couleur parmi la palette du thème, visibilité. Vous pouvez masquer une section sans perdre son contenu.",
        "de": "Klicken Sie in der Vitrine auf einen Abschnitt, um ihn auszuwählen: Seine Texte werden an Ort und Stelle bearbeitbar, und das Panel zeigt seine eigenen Einstellungen — Vorlage, Meilensteine, Farbe aus der Themenpalette, Sichtbarkeit. Sie können einen Abschnitt ausblenden, ohne seinen Inhalt zu verlieren.",
        "es": "Haga clic en una sección de la vitrina para seleccionarla: sus textos se vuelven editables in situ y el panel muestra sus ajustes propios: plantilla, hitos, color de la paleta del tema, visibilidad. Puede ocultar una sección sin perder su contenido."
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
        "en": "The “+” between two sections inserts a block exactly where you want it: key figure, highlight banner, multi-column, narrative block, or a viewer to embed a SharePoint document (PDF, slides) directly in the page. Each template is previewed as it will appear.",
        "fr": "Le « + » entre deux sections insère un bloc là où vous le voulez : chiffre clé, bandeau de mise en avant, multi-colonnes, bloc narratif, ou visionneuse pour intégrer un document SharePoint (PDF, présentation) directement dans la page. Chaque gabarit est prévisualisé tel qu’il s’affichera.",
        "de": "Das „+“ zwischen zwei Abschnitten fügt einen Block genau dort ein, wo Sie ihn haben möchten: Kennzahl, Hervorhebungsbanner, Mehrspalter, Erzählblock oder ein Viewer, um ein SharePoint-Dokument (PDF, Folien) direkt in die Seite einzubetten. Jede Vorlage wird so angezeigt, wie sie erscheinen wird.",
        "es": "El «+» entre dos secciones inserta un bloque justo donde usted quiere: cifra clave, banner destacado, multicolumna, bloque narrativo o un visor para integrar un documento de SharePoint (PDF, diapositivas) directamente en la página. Cada plantilla se previsualiza tal como se mostrará."
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
        "en": "Light mode only shows the sections you pre-selected: ideal to present to an external team or in a meeting without exposing internal elements. Full mode keeps everything.",
        "fr": "Le mode Light ne montre que les sections que vous avez pré-sélectionnées : idéal pour présenter à une équipe externe ou en séance sans exposer les éléments internes. Le mode complet garde tout.",
        "de": "Der Light-Modus zeigt nur die von Ihnen vorausgewählten Abschnitte: ideal für die Präsentation vor einem externen Team oder in einer Sitzung, ohne interne Elemente offenzulegen. Der Vollmodus behält alles.",
        "es": "El modo Light solo muestra las secciones que ha preseleccionado: ideal para presentar a un equipo externo o en una reunión sin exponer elementos internos. El modo completo lo mantiene todo."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-share-settings",
      "target": "#showcase-share-title",
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
      "placement": "bottom",
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
        "en": "The “Comment” button opens the comments area and lets you add sticky notes directly on the showcase.",
        "fr": "Le bouton « Commenter » permet d’ouvrir l’espace de commentaires et d’ajouter des post-its directement dans la vitrine.",
        "de": "Die Schaltfläche „Kommentieren“ öffnet den Kommentarbereich und ermöglicht es, Haftnotizen direkt in der Vitrine hinzuzufügen.",
        "es": "El botón «Comentar» permite abrir el espacio de comentarios y añadir notas adhesivas directamente en la vitrina."
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
        "en": "Everyone drops their sticky notes directly on the showcase, right where it matters. Your feedback arrives centralised and in context, instead of scattered across ten separate emails.",
        "fr": "Chacun dépose ses post-its directement sur la vitrine, à l’endroit concerné. Vos retours arrivent centralisés et contextualisés, plus dans dix mails séparés.",
        "de": "Jeder platziert seine Haftnotizen direkt auf der Vitrine, genau an der betreffenden Stelle. Ihre Rückmeldungen kommen zentral und im Kontext an, statt verstreut über zehn einzelne E-Mails.",
        "es": "Cada persona coloca sus notas adhesivas directamente en la vitrina, en el punto concreto. Sus comentarios llegan centralizados y en contexto, no dispersos en diez correos distintos."
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
        "fr": "Pour imaginer votre futur projet, découvrez les projets intéressants déjà imaginés et partagés par d’autres collaborateurs du LFB.",
        "de": "Um Ihr künftiges Projekt zu entwerfen, entdecken Sie die interessanten Projekte, die andere LFB-Kolleginnen und -Kollegen bereits entwickelt und geteilt haben.",
        "es": "Para imaginar su futuro proyecto, descubra los proyectos interesantes ya ideados y compartidos por otros colaboradores del LFB."
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
        "en": "If inspiration has to come from elsewhere, click the “Inspiration” toggle to discover projects from other laboratories, patient associations and more.",
        "fr": "Si l’inspiration doit venir d’ailleurs, cliquez sur le toggle « Inspiration » pour découvrir des projets d’autres laboratoires, d’associations de patients…",
        "de": "Wenn die Inspiration von anderswo kommen soll, klicken Sie auf den Umschalter „Inspiration“, um Projekte anderer Labore, von Patientenverbänden und mehr zu entdecken.",
        "es": "Si la inspiración debe venir de otro lugar, haga clic en el conmutador «Inspiración» para descubrir proyectos de otros laboratorios, de asociaciones de pacientes…"
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
        "fr": "Cet espace est collaboratif : ajoutez vos propres inspirations. Il peut s’agir de réels projets ou d’idées issues d’un brainstorming au sein du LFB !",
        "de": "Dieser Bereich ist kollaborativ: Fügen Sie Ihre eigenen Inspirationen hinzu. Das können echte Projekte oder Ideen aus einem Brainstorming innerhalb der LFB sein!",
        "es": "Este espacio es colaborativo: añada sus propias inspiraciones. ¡Pueden ser proyectos reales o ideas surgidas de una lluvia de ideas dentro del LFB!"
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
    }
  ]
};
