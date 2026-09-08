export const initialOnboardingTourConfig = {
  "allowClose": true,
  "showStepDots": true,
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
        "en": "Let's discover together how to frame your project step by step.",
        "fr": "Découvrons ensemble comment cadrer votre projet pas à pas.",
        "de": "Entdecken wir gemeinsam, wie Sie Ihr Projekt Schritt für Schritt einordnen können.",
        "es": "Descubramos juntos cómo encuadrar su proyecto paso a paso."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": false,
      "actions": [
        {
          "id": "path-full",
          "label": {
            "en": "Full journey",
            "fr": "Parcours complet",
            "de": "Kompletter Rundgang",
            "es": "Recorrido completo"
          },
          "action": "next",
          "stepId": "",
          "variant": "primary"
        },
        {
          "id": "path-showcase",
          "label": {
            "en": "See the showcase",
            "fr": "Voir la vitrine",
            "de": "Vitrine ansehen",
            "es": "Ver la vitrina"
          },
          "action": "goTo",
          "stepId": "showcase-top",
          "variant": "ghost"
        }
      ]
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
        "en": "Click here to get started. We'll use a demo project as an example.",
        "fr": "Cliquez ici pour démarrer. Nous allons utiliser un projet de démonstration pour l’exemple.",
        "de": "Klicken Sie hier, um zu beginnen. Wir verwenden als Beispiel ein Demo-Projekt.",
        "es": "Haga clic aquí para empezar. Usaremos un proyecto de demostración como ejemplo."
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
        "en": "Answer the questions",
        "fr": "Répondre aux questions",
        "de": "Fragen beantworten",
        "es": "Responder a las preguntas"
      },
      "content": {
        "en": "Fill in the requested information step by step to qualify your initiative.",
        "fr": "Renseignez les informations demandées étape par étape pour qualifier votre initiative.",
        "de": "Geben Sie die angeforderten Informationen Schritt für Schritt ein, um Ihre Initiative zu qualifizieren.",
        "es": "Complete la información solicitada paso a paso para calificar su iniciativa."
      },
      "placement": "top",
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
        "en": "Each step offers contextual guidance so you can answer with confidence.",
        "fr": "Chaque étape propose des conseils contextualisés pour répondre sereinement.",
        "de": "Jeder Schritt bietet kontextbezogene Hinweise, damit Sie in Ruhe antworten können.",
        "es": "Cada paso ofrece consejos contextualizados para responder con tranquilidad."
      },
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-report-top",
      "target": "[data-tour-id=\"synthesis-summary\"]",
      "title": {
        "en": "Read the compliance report",
        "fr": "Lire le rapport de compliance",
        "de": "Den Compliance-Bericht lesen",
        "es": "Leer el informe de cumplimiento"
      },
      "content": {
        "en": "Here you'll find your project summary with all the information you entered. You can go back to edit it at any time.",
        "fr": "Retrouvez ici le résumé du projet avec l’ensemble des informations que vous avez renseignées. Vous pouvez revenir en arrière pour les modifier.",
        "de": "Hier finden Sie die Zusammenfassung Ihres Projekts mit allen von Ihnen eingegebenen Informationen. Sie können jederzeit zurückgehen, um sie zu ändern.",
        "es": "Aquí encontrará el resumen del proyecto con toda la información que ha indicado. Puede volver atrás para modificarla."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "scrollIntoViewOptions": {
        "behavior": "smooth",
        "block": "start",
        "inline": "nearest"
      },
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-teams",
      "target": "[data-tour-id=\"synthesis-teams\"]",
      "title": {
        "en": "Identify the compliance teams",
        "fr": "Identifier les équipes compliance",
        "de": "Die Compliance-Teams identifizieren",
        "es": "Identificar los equipos de cumplimiento"
      },
      "content": {
        "en": "View the key contacts, their priorities and the questions to anticipate to prepare your discussions.",
        "fr": "Visualisez les interlocuteurs clés, leurs priorités et les questions à anticiper pour préparer vos échanges.",
        "de": "Sehen Sie die wichtigsten Ansprechpartner, ihre Prioritäten und die zu erwartenden Fragen, um Ihre Gespräche vorzubereiten.",
        "es": "Visualice los interlocutores clave, sus prioridades y las preguntas que debe anticipar para preparar sus intercambios."
      },
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-risks",
      "target": "[data-tour-id=\"synthesis-risks\"]",
      "title": {
        "en": "Risks and points of attention",
        "fr": "Risques et points de vigilance",
        "de": "Risiken und Aufmerksamkeitspunkte",
        "es": "Riesgos y puntos de atención"
      },
      "content": {
        "en": "Review the identified risks and the compliance points of attention to address as a priority.",
        "fr": "Analysez les risques identifiés et les points de vigilance compliance à traiter en priorité.",
        "de": "Analysieren Sie die identifizierten Risiken und die vorrangig zu behandelnden Compliance-Aufmerksamkeitspunkte.",
        "es": "Analice los riesgos identificados y los puntos de atención de cumplimiento que deben tratarse con prioridad."
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
        "en": "Submit the project",
        "fr": "Soumettre le projet",
        "de": "Das Projekt einreichen",
        "es": "Enviar el proyecto"
      },
      "content": {
        "en": "Submit your project: the relevant teams are notified automatically.",
        "fr": "Transmettez votre projet : les équipes concernées sont notifiées automatiquement.",
        "de": "Reichen Sie Ihr Projekt ein: Die betroffenen Teams werden automatisch benachrichtigt.",
        "es": "Envíe su proyecto: los equipos correspondientes serán notificados automáticamente."
      },
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-showcase-button",
      "target": "[data-tour-id=\"synthesis-showcase\"]",
      "title": {
        "en": "Open the project showcase",
        "fr": "Ouvrir la vitrine du projet",
        "de": "Die Projektvitrine öffnen",
        "es": "Abrir la vitrina del proyecto"
      },
      "content": {
        "en": "Access the showcase automatically generated for your project to present your initiative.",
        "fr": "Accédez à la vitrine du projet générée automatiquement pour présenter votre initiative.",
        "de": "Greifen Sie auf die automatisch generierte Projektvitrine zu, um Ihre Initiative zu präsentieren.",
        "es": "Acceda a la vitrina generada automáticamente para presentar su iniciativa."
      },
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-top",
      "target": "[data-tour-id=\"showcase-hero\"]",
      "title": {
        "en": "Present your project",
        "fr": "Présenter votre projet",
        "de": "Ihr Projekt präsentieren",
        "es": "Presentar su proyecto"
      },
      "content": {
        "en": "Browse the showcase presenting your project with a layout that highlights it. Perfect for a presentation to your manager!",
        "fr": "Parcourez la vitrine présentant votre projet avec une mise en page le mettant en valeur. Parfait pour une présentation à votre manager !",
        "de": "Durchstöbern Sie die Vitrine, die Ihr Projekt in einem ansprechenden Layout präsentiert. Perfekt für eine Präsentation vor Ihrem Vorgesetzten!",
        "es": "Recorra la vitrina que presenta su proyecto con un diseño que lo destaca. ¡Perfecto para una presentación a su responsable!"
      },
      "placement": "bottom",
      "highlightScope": "target",
      "scrollIntoViewOptions": {
        "behavior": "smooth",
        "block": "start",
        "inline": "nearest"
      },
      "scrollDuration": 1200,
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-bottom",
      "target": "[data-tour-id=\"showcase-roadmap\"]",
      "title": {
        "en": "Explore the rest of the showcase",
        "fr": "Explorer la suite de la vitrine",
        "de": "Den Rest der Vitrine erkunden",
        "es": "Explorar el resto de la vitrina"
      },
      "content": {
        "en": "The showcase also displays your project milestones as well as alerts related to deadline-compliance issues.",
        "fr": "Vous retrouvez sur la vitrine les jalons de votre projet mais également les alertes liées à des problématiques de respect de certains délais.",
        "de": "Auf der Vitrine finden Sie auch die Meilensteine Ihres Projekts sowie Warnhinweise zu Problemen bei der Einhaltung bestimmter Fristen.",
        "es": "En la vitrina también encontrará los hitos de su proyecto, así como las alertas relacionadas con problemas de cumplimiento de determinados plazos."
      },
      "placement": "top",
      "highlightScope": "target",
      "scrollIntoViewOptions": {
        "behavior": "smooth",
        "block": "center",
        "inline": "nearest"
      },
      "scrollDuration": 1400,
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-edit-trigger",
      "target": "[data-tour-id=\"showcase-edit-trigger\"]",
      "title": {
        "en": "Edit the showcase",
        "fr": "Modifier la vitrine",
        "de": "Die Vitrine bearbeiten",
        "es": "Modificar la vitrina"
      },
      "content": {
        "en": "The “Edit” button turns on live editing: you work directly on the showcase itself, not on a separate form.",
        "fr": "Le bouton « Modifier » active l’édition en direct : vous travaillez directement sur la vitrine elle-même, pas sur un formulaire séparé.",
        "de": "Die Schaltfläche „Bearbeiten“ aktiviert die Live-Bearbeitung: Sie arbeiten direkt auf der Vitrine selbst, nicht in einem separaten Formular.",
        "es": "El botón «Modificar» activa la edición en directo: trabaja directamente sobre la vitrina, no en un formulario aparte."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "scrollIntoViewOptions": {
        "behavior": "smooth",
        "block": "center",
        "inline": "nearest"
      },
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
        "en": "This toolbar gathers everything that isn't tied to a single section: the Outline to navigate between sections, Undo/Redo, a chrome-free Preview, the Light/Full display switch, and the publish status.",
        "fr": "Cette barre regroupe tout ce qui ne dépend pas d’une section précise : le Plan pour naviguer entre les sections, Annuler/Rétablir, l’Aperçu sans le contour d’édition, le choix d’affichage Light/complet et le statut de publication.",
        "de": "Diese Leiste bündelt alles, was nicht an einen bestimmten Abschnitt gebunden ist: die Gliederung zum Navigieren zwischen Abschnitten, Rückgängig/Wiederholen, eine Vorschau ohne Bearbeitungsrahmen, die Umschaltung zwischen Light- und Vollansicht sowie den Veröffentlichungsstatus.",
        "es": "Esta barra reúne todo lo que no depende de una sección concreta: el Esquema para navegar entre secciones, Deshacer/Rehacer, una vista previa sin el contorno de edición, el cambio de visualización Light/completa y el estado de publicación."
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
        "en": "Edit section by section",
        "fr": "Modifier section par section",
        "de": "Abschnitt für Abschnitt bearbeiten",
        "es": "Modificar sección por sección"
      },
      "content": {
        "en": "Click any section directly on the showcase to select it: its text becomes editable in place, and this panel shows its specific settings (template, milestones, visibility…). Everything stays in sync with the compliance report.",
        "fr": "Cliquez sur une section directement dans la vitrine pour la sélectionner : ses textes deviennent modifiables sur place, et ce panneau affiche ses réglages propres (gabarit, jalons, visibilité…). Tout reste synchronisé avec le rapport de compliance.",
        "de": "Klicken Sie direkt in der Vitrine auf einen Abschnitt, um ihn auszuwählen: Seine Texte werden an Ort und Stelle bearbeitbar, und dieses Panel zeigt seine spezifischen Einstellungen (Vorlage, Meilensteine, Sichtbarkeit …). Alles bleibt mit dem Compliance-Bericht synchron.",
        "es": "Haga clic en cualquier sección directamente en la vitrina para seleccionarla: sus textos se vuelven editables in situ, y este panel muestra sus ajustes propios (plantilla, hitos, visibilidad…). Todo permanece sincronizado con el informe de cumplimiento."
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
        "en": "Add custom sections",
        "fr": "Ajouter des sections personnalisées",
        "de": "Individuelle Abschnitte hinzufügen",
        "es": "Añadir secciones personalizadas"
      },
      "content": {
        "en": "Click the “+” between any two sections to open this picker exactly where you want to insert a block: lists, columns, taglines, or even blocks that embed documents (PDF, slides…), each with a true-to-life preview.",
        "fr": "Cliquez sur le « + » entre deux sections pour ouvrir ce sélecteur exactement où vous souhaitez insérer un bloc : listes, colonnes, accroches ou même des blocs qui intègrent des documents (PDF, slides…), chacun avec un aperçu fidèle.",
        "de": "Klicken Sie auf das „+“ zwischen zwei Abschnitten, um diese Auswahl genau an der gewünschten Stelle zu öffnen: Listen, Spalten, Slogans oder sogar Blöcke, die Dokumente einbetten (PDF, Folien …), jeweils mit einer originalgetreuen Vorschau.",
        "es": "Haga clic en el «+» entre dos secciones para abrir este selector exactamente donde desee insertar un bloque: listas, columnas, eslóganes o incluso bloques que integran documentos (PDF, diapositivas…), cada uno con una vista previa fiel."
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
        "en": "Click “Publish” to update the showcase immediately. The bar shows whether changes are still unpublished.",
        "fr": "Cliquez sur « Publier » pour mettre à jour la vitrine immédiatement. La barre indique si des modifications restent à publier.",
        "de": "Klicken Sie auf „Veröffentlichen“, um die Vitrine sofort zu aktualisieren. Die Leiste zeigt an, ob noch Änderungen zu veröffentlichen sind.",
        "es": "Haga clic en «Publicar» para actualizar la vitrina de inmediato. La barra indica si quedan cambios por publicar."
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
        "en": "Choose the usage mode",
        "fr": "Sélection du mode d’utilisation",
        "de": "Auswahl des Nutzungsmodus",
        "es": "Selección del modo de uso"
      },
      "content": {
        "en": "This switch configures how the showcase is displayed (Light or Full) to hide certain elements during a presentation to a team — it's also available from the editing toolbar.",
        "fr": "Ce bloc vous permet de configurer l’affichage de la vitrine du projet (mode Light ou complet) pour masquer certains éléments pendant une présentation à une équipe — il est aussi accessible depuis la barre d’édition.",
        "de": "Mit diesem Block können Sie die Anzeige der Projektvitrine konfigurieren (Light- oder Vollmodus), um bestimmte Elemente während einer Präsentation vor einem Team auszublenden — er ist auch über die Bearbeitungsleiste erreichbar.",
        "es": "Este bloque le permite configurar la visualización de la vitrina del proyecto (modo Light o completo) para ocultar ciertos elementos durante una presentación a un equipo; también está disponible desde la barra de edición."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-share",
      "target": "[data-tour-id=\"showcase-share-trigger\"]",
      "title": {
        "en": "Share the project showcase",
        "fr": "Partager la vitrine du projet",
        "de": "Die Projektvitrine teilen",
        "es": "Compartir la vitrina del proyecto"
      },
      "content": {
        "en": "Click this button to share the project showcase with your colleagues.",
        "fr": "Cliquez sur ce bouton pour partager la vitrine du projet avec vos collaborateurs.",
        "de": "Klicken Sie auf diese Schaltfläche, um die Projektvitrine mit Ihren Kollegen zu teilen.",
        "es": "Haga clic en este botón para compartir la vitrina del proyecto con sus compañeros."
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
        "en": "Choose the display & enable comments",
        "fr": "Choisir l’affichage & activer les commentaires",
        "de": "Anzeige wählen & Kommentare aktivieren",
        "es": "Elegir la visualización y activar los comentarios"
      },
      "content": {
        "en": "Select a Light or full display to hide certain information during your presentations. When sharing, you can also allow comments: sample sticky notes illustrate the result.",
        "fr": "Sélectionnez un affichage Light ou complet pour masquer certaines informations pendant vos présentations. Lors du partage, vous pouvez aussi autoriser les commentaires : des post-its fictifs illustrent le résultat.",
        "de": "Wählen Sie eine Light- oder Vollanzeige, um bestimmte Informationen während Ihrer Präsentationen auszublenden. Beim Teilen können Sie auch Kommentare zulassen: Beispiel-Haftnotizen veranschaulichen das Ergebnis.",
        "es": "Seleccione una visualización Light o completa para ocultar cierta información durante sus presentaciones. Al compartir, también puede permitir comentarios: unas notas adhesivas de ejemplo ilustran el resultado."
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
        "de": "Die Schaltfläche „Kommentieren“ öffnet den Kommentarbereich und ermöglicht es Ihnen, Haftnotizen direkt in der Vitrine hinzuzufügen.",
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
        "en": "View the sticky notes",
        "fr": "Voir les post-its",
        "de": "Haftnotizen anzeigen",
        "es": "Ver las notas adhesivas"
      },
      "content": {
        "en": "Once annotation mode is active, sticky notes appear on the showcase to centralize feedback from stakeholders.",
        "fr": "Une fois le mode annotation actif, les post-its apparaissent sur la vitrine pour centraliser les retours des parties prenantes.",
        "de": "Sobald der Anmerkungsmodus aktiv ist, erscheinen Haftnotizen auf der Vitrine, um das Feedback der Beteiligten zu zentralisieren.",
        "es": "Una vez activado el modo de anotación, las notas adhesivas aparecen en la vitrina para centralizar los comentarios de las partes interesadas."
      },
      "placement": "right",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-back-to-report",
      "target": "[data-tour-id=\"showcase-back-to-report\"]",
      "title": {
        "en": "Return to the summary",
        "fr": "Retourner à la synthèse",
        "de": "Zurück zur Zusammenfassung",
        "es": "Volver al resumen"
      },
      "content": {
        "en": "Go back to the summary report to continue your preparation and, if needed, save the latest version of your project.",
        "fr": "Revenez au rapport de synthèse pour poursuivre votre préparation et éventuellement enregistrer la dernière version de votre projet.",
        "de": "Kehren Sie zum Zusammenfassungsbericht zurück, um Ihre Vorbereitung fortzusetzen und gegebenenfalls die neueste Version Ihres Projekts zu speichern.",
        "es": "Vuelva al informe de síntesis para continuar su preparación y, si es necesario, guardar la última versión de su proyecto."
      },
      "placement": "bottom",
      "highlightScope": "page",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "project-inspiration",
      "target": "[data-tour-id=\"home-inspiration-block\"]",
      "title": {
        "en": "View and add inspiring projects",
        "fr": "Voir et ajouter des projets inspirants",
        "de": "Inspirierende Projekte ansehen und hinzufügen",
        "es": "Ver y añadir proyectos inspiradores"
      },
      "content": {
        "en": "Switch to the Inspiration tab to browse inspiring projects and use the dedicated button to add a new one.",
        "fr": "Passez sur l’onglet Inspiration pour consulter des projets inspirants et utilisez le bouton dédié pour en ajouter un nouveau.",
        "de": "Wechseln Sie zur Registerkarte „Inspiration“, um inspirierende Projekte anzusehen, und nutzen Sie die dafür vorgesehene Schaltfläche, um ein neues hinzuzufügen.",
        "es": "Vaya a la pestaña Inspiración para consultar proyectos inspiradores y utilice el botón correspondiente para añadir uno nuevo."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "highlightPadding": 16,
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "project-filters",
      "target": "[data-tour-id=\"home-filters\"]",
      "title": {
        "en": "Discover projects",
        "fr": "Découvrir les projets",
        "de": "Projekte entdecken",
        "es": "Descubrir los proyectos"
      },
      "content": {
        "en": "Filter initiatives by name, team or date and get inspired.",
        "fr": "Filtrez les initiatives par nom, équipe ou date et laissez-vous inspirer.",
        "de": "Filtern Sie Initiativen nach Name, Team oder Datum und lassen Sie sich inspirieren.",
        "es": "Filtre las iniciativas por nombre, equipo o fecha y déjese inspirar."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "home-goodbye",
      "target": "[data-tour-id=\"home-create-project\"]",
      "title": {
        "en": "Thank you for using Project Navigator",
        "fr": "Merci d’utiliser Project Navigator",
        "de": "Danke, dass Sie Project Navigator nutzen",
        "es": "Gracias por utilizar Project Navigator"
      },
      "content": {
        "en": "We hope you enjoy Project Navigator and that it helps you carry your project through to success.",
        "fr": "Nous espérons que Project Navigator vous plaira et vous sera utile pour mener à bien votre projet.",
        "de": "Wir hoffen, dass Ihnen Project Navigator gefällt und es Ihnen hilft, Ihr Projekt erfolgreich umzusetzen.",
        "es": "Esperamos que disfrute de Project Navigator y que le resulte útil para llevar a cabo su proyecto con éxito."
      },
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    }
  ]
};
