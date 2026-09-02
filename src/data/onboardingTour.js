export const initialOnboardingTourConfig = {
  "allowClose": true,
  "showStepDots": true,
  "labels": {
    "next": "Suivant",
    "prev": "Précédent",
    "close": "Fermer",
    "finish": "Terminer"
  },
  "steps": [
    {
      "id": "welcome",
      "target": "#tour-onboarding-anchor",
      "title": "Bienvenue sur Project Navigator",
      "content": "Découvrons ensemble comment cadrer votre projet pas à pas.",
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": false,
      "actions": [
        {
          "id": "path-full",
          "label": "Parcours complet",
          "action": "next",
          "stepId": "",
          "variant": "primary"
        },
        {
          "id": "path-showcase",
          "label": "Voir la vitrine",
          "action": "goTo",
          "stepId": "showcase-top",
          "variant": "ghost"
        }
      ]
    },
    {
      "id": "create-project",
      "target": "[data-tour-id=\"home-create-project\"]",
      "title": "Lancer un nouveau projet",
      "content": "Cliquez ici pour démarrer. Nous allons utiliser un projet de démonstration pour l’exemple.",
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "question-overview",
      "target": "[data-tour-id=\"question-main-content\"]",
      "title": "Répondre aux questions",
      "content": "Renseignez les informations demandées étape par étape pour qualifier votre initiative.",
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "question-guidance",
      "target": "[data-tour-id=\"question-guidance-toggle\"]",
      "title": "Comprendre chaque question",
      "content": "Chaque étape propose des conseils contextualisés pour répondre sereinement.",
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-report-top",
      "target": "[data-tour-id=\"synthesis-summary\"]",
      "title": "Lire le rapport de compliance",
      "content": "Retrouvez ici le résumé du projet avec l’ensemble des informations que vous avez renseignées. Vous pouvez revenir en arrière pour les modifier.",
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
      "title": "Identifier les équipes compliance",
      "content": "Visualisez les interlocuteurs clés, leurs priorités et les questions à anticiper pour préparer vos échanges.",
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-risks",
      "target": "[data-tour-id=\"synthesis-risks\"]",
      "title": "Risques et points de vigilance",
      "content": "Analysez les risques identifiés et les points de vigilance compliance à traiter en priorité.",
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-submit",
      "target": "[data-tour-id=\"synthesis-submit\"]",
      "title": "Soumettre le projet",
      "content": "Transmettez votre projet : les équipes concernées sont notifiées automatiquement.",
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "compliance-showcase-button",
      "target": "[data-tour-id=\"synthesis-showcase\"]",
      "title": "Ouvrir la vitrine du projet",
      "content": "Accédez à la vitrine du projet générée automatiquement pour présenter votre initiative.",
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-top",
      "target": "[data-tour-id=\"showcase-hero\"]",
      "title": "Présenter votre projet",
      "content": "Parcourez la vitrine présentant votre projet avec une mise en page le mettant en valeur. Parfait pour une présentation à votre manager !",
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
      "title": "Explorer la suite de la vitrine",
      "content": "Vous retrouvez sur la vitrine les jalons de votre projet mais également les alertes liées à des problématiques de respect de certains délais.",
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
      "title": "Modifier la vitrine",
      "content": "Activez le mode édition pour ajuster les contenus avant diffusion.",
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
      "id": "showcase-edit",
      "target": "[data-tour-id=\"showcase-edit-panel\"]",
      "title": "Personnaliser la vitrine",
      "content": "Adaptez textes, messages clés et jalons pour refléter fidèlement votre projet. Ses informations sont automatiquement mises à jour dans le rapport de compliance.",
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-custom-sections",
      "target": "[data-tour-id=\"showcase-edit-panel\"]",
      "title": "Créer des sections personnalisées",
      "content": "Ajoutez des sections sur-mesure avec différents modèles : listes, colonnes, accroches et même des blocs qui intègrent des documents (PDF, slides, etc.).",
      "placement": "left",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-save-edits",
      "target": "[data-tour-id=\"showcase-save-edits\"]",
      "title": "Enregistrer les modifications",
      "content": "Validez vos ajustements pour mettre à jour immédiatement la vitrine.",
      "placement": "top",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-usage-mode-selection",
      "target": "[data-tour-id=\"showcase-display-mode-buttons\"]",
      "title": "Sélection du mode d’utilisation",
      "content": "Ce bloc vous permet de configurer l’affichage de la vitrine du projet (mode Light ou complet) pour masquer certains éléments pendant une présentation à une équipe.",
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-share",
      "target": "[data-tour-id=\"showcase-share-trigger\"]",
      "title": "Partager la vitrine du projet",
      "content": "Cliquez sur ce bouton pour partager la vitrine du projet avec vos collaborateurs.",
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-share-settings",
      "target": "#showcase-share-title",
      "title": "Choisir l’affichage & activer les commentaires",
      "content": "Sélectionnez un affichage Light ou complet pour masquer certaines informations pendant vos présentations. Lors du partage, vous pouvez aussi autoriser les commentaires : des post-its fictifs illustrent le résultat.",
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-comment-button",
      "target": "[data-tour-id=\"showcase-comment-toggle\"]",
      "title": "Activer les commentaires",
      "content": "Ce bouton permet d’ouvrir l’espace de commentaires et d’ajouter des post-its directement dans la vitrine.",
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-comments-postits",
      "target": "[data-tour-id=\"showcase-annotation-note\"]",
      "title": "Voir les post-its",
      "content": "Une fois le mode annotation actif, les post-its apparaissent sur la vitrine pour centraliser les retours des parties prenantes.",
      "placement": "right",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "showcase-back-to-report",
      "target": "[data-tour-id=\"showcase-back-to-report\"]",
      "title": "Retourner à la synthèse",
      "content": "Revenez au rapport de synthèse pour poursuivre votre préparation et éventuellement enregistrer la dernière version de votre projet.",
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "project-filters",
      "target": "[data-tour-id=\"home-filters\"]",
      "title": "Découvrir les projets",
      "content": "Filtrez les initiatives par nom, équipe ou date et laissez-vous inspirer.",
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "project-inspiration",
      "target": "[data-tour-id=\"home-inspiration-toggle\"]",
      "title": "Voir et ajouter des projets inspirants",
      "content": "Passez sur l’onglet Inspiration pour consulter des projets inspirants et utilisez le bouton dédié pour en ajouter un nouveau.",
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    },
    {
      "id": "home-goodbye",
      "target": "[data-tour-id=\"home-create-project\"]",
      "title": "Merci d’utiliser Project Navigator",
      "content": "Nous espérons que Project Navigator vous plaira et vous sera utile pour mener à bien votre projet.",
      "placement": "bottom",
      "highlightScope": "target",
      "showDefaultButtons": true,
      "actions": []
    }
  ]
};
