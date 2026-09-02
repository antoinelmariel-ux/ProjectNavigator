export const initialQuestions = [
  {
    "id": "projectName",
    "type": "text",
    "question": {
      "en": "What is the project name?",
      "fr": "Quel est le nom du projet ?",
      "de": "Wie lautet der Name des Projekts?",
      "es": "¿Cuál es el nombre del proyecto?"
    },
    "options": [],
    "required": true,
    "conditions": [],
    "conditionLogic": "all",
    "guidance": {
      "objective": {
        "en": "Clearly name the initiative so it is memorable from the very first seconds.",
        "fr": "Nommer clairement l’initiative pour qu’elle soit mémorisée dès les premières secondes.",
        "de": "Benennen Sie die Initiative klar, damit sie sich von den ersten Sekunden an einprägt.",
        "es": "Nombre claramente la iniciativa para que se recuerde desde los primeros segundos."
      },
      "details": {
        "en": "The name shown in the project showcase serves as a reference point for all teams contributing to the pitch.",
        "fr": "Le nom affiché dans la vitrine du projet sert de repère pour toutes les équipes qui contribuent au pitch.",
        "de": "Der in der Projektvitrine angezeigte Name dient allen am Pitch beteiligten Teams als Orientierungspunkt.",
        "es": "El nombre que aparece en la vitrina del proyecto sirve de referencia para todos los equipos que contribuyen al pitch."
      },
      "tips": [
        {
          "en": "Enter the official name, or the one you want to test with stakeholders.",
          "fr": "Renseignez le nom officiel ou celui que vous souhaitez tester auprès des parties prenantes.",
          "de": "Geben Sie den offiziellen Namen an oder denjenigen, den Sie bei den Stakeholdern testen möchten.",
          "es": "Indique el nombre oficial o el que desea probar con las partes interesadas."
        },
        {
          "en": "If an internal code name exists, add it in parentheses to make tracking easier.",
          "fr": "Si un nom de code interne existe, ajoutez-le entre parenthèses pour faciliter le suivi.",
          "de": "Falls ein interner Codename existiert, fügen Sie ihn in Klammern hinzu, um die Nachverfolgung zu erleichtern.",
          "es": "Si existe un nombre en clave interno, añádalo entre paréntesis para facilitar el seguimiento."
        }
      ]
    },
    "showcase": {
      "sections": [
        "hero"
      ],
      "usage": "Titre principal affiché dans la vitrine du projet."
    },
    "extraCheckbox": {
      "enabled": true,
      "label": {
        "en": "I would need a name / a logo (not yet protected) to communicate externally about my project",
        "fr": "J’aurais besoin d’un nom / un logo (non encore protégé) pour communiquer à l’externe sur mon projet",
        "de": "Ich würde einen Namen / ein Logo (noch nicht geschützt) benötigen, um extern über mein Projekt zu kommunizieren",
        "es": "Necesitaría un nombre / un logotipo (aún no protegido) para comunicar externamente sobre mi proyecto"
      }
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "placeholder": "",
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    },
    "conditionGroups": []
  },
  {
    "id": "teamLead",
    "type": "text",
    "question": {
      "en": "Who is leading this project?",
      "fr": "Qui lead ce projet ?",
      "de": "Wer leitet dieses Projekt?",
      "es": "¿Quién lidera este proyecto?"
    },
    "options": [],
    "required": true,
    "conditions": [],
    "conditionLogic": "all",
    "guidance": {
      "objective": {
        "en": "Identify the main point of contact for compliance discussions",
        "fr": "Identifier l’interlocuteur principal pour les échanges compliance",
        "de": "Den Hauptansprechpartner für den Austausch mit Compliance identifizieren",
        "es": "Identificar al interlocutor principal para los intercambios con compliance"
      },
      "details": {
        "en": "This information allows expert teams to contact the right person to clarify details of the file.",
        "fr": "Cette information permet aux équipes expertes de contacter la bonne personne pour clarifier les éléments du dossier.",
        "de": "Diese Angabe ermöglicht es den Fachteams, die richtige Person zu kontaktieren, um Punkte der Akte zu klären.",
        "es": "Esta información permite a los equipos expertos contactar con la persona adecuada para aclarar los elementos del expediente."
      },
      "tips": [
        {
          "en": "Enter the first and last name",
          "fr": "Renseignez le prénom et le nom",
          "de": "Geben Sie Vor- und Nachnamen an",
          "es": "Indique el nombre y los apellidos"
        }
      ]
    },
    "showcase": {
      "sections": [
        "team"
      ],
      "usage": "Bloc « Lead du projet » dans la section équipe."
    },
    "placeholder": "",
    "conditionGroups": [],
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "teamLeadTeam",
    "type": "choice",
    "question": {
      "en": "Which team is the lead part of?",
      "fr": "À quelle équipe est-il rattaché ?",
      "de": "Welchem Team ist die Person zugeordnet?",
      "es": "¿A qué equipo pertenece?"
    },
    "options": [
      {
        "label": {
          "en": "Marketing DOI",
          "fr": "Marketing DOI",
          "de": "Marketing DOI",
          "es": "Marketing DOI"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "marketing_doi"
      },
      {
        "label": {
          "en": "Medical DOI",
          "fr": "Médical DOI",
          "de": "Médical DOI",
          "es": "Médical DOI"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "medical_doi"
      },
      {
        "label": {
          "en": "Marketing DOF",
          "fr": "Marketing DOF",
          "de": "Marketing DOF",
          "es": "Marketing DOF"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "marketing_dof"
      },
      {
        "label": {
          "en": "Medical DOF",
          "fr": "Médical DOF",
          "de": "Médical DOF",
          "es": "Médical DOF"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "medical_dof"
      },
      {
        "label": {
          "en": "Public Affairs",
          "fr": "Affaires Publiques",
          "de": "Public Affairs",
          "es": "Asuntos Públicos"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "affaires_publiques"
      }
    ],
    "required": true,
    "conditions": [],
    "conditionLogic": "all",
    "guidance": {
      "objective": {
        "en": "Specify the lead's team to streamline approvals.",
        "fr": "Préciser le rattachement du lead pour fluidifier les validations.",
        "de": "Geben Sie die Zugehörigkeit des Projektleiters an, um die Validierungen zu erleichtern.",
        "es": "Precisar la adscripción del responsable del proyecto para agilizar las validaciones."
      },
      "details": {
        "en": "This information is shown alongside the lead to help contacts identify the right channel.",
        "fr": "Cette information s’affiche en complément du lead pour aider les interlocuteurs à identifier le bon canal.",
        "de": "Diese Angabe wird ergänzend zum Projektleiter angezeigt, damit die Ansprechpartner den richtigen Kanal identifizieren können.",
        "es": "Esta información se muestra junto al responsable del proyecto para ayudar a los interlocutores a identificar el canal adecuado."
      },
      "tips": [
        {
          "en": "Select the lead's main team.",
          "fr": "Sélectionnez l’équipe principale du lead.",
          "de": "Wählen Sie das Hauptteam des Projektleiters aus.",
          "es": "Seleccione el equipo principal del responsable del proyecto."
        },
        {
          "en": "Note any dual affiliation in your internal notes if necessary.",
          "fr": "Précisez une double appartenance dans vos notes internes si nécessaire.",
          "de": "Geben Sie bei Bedarf eine doppelte Zugehörigkeit in Ihren internen Notizen an.",
          "es": "Si es necesario, indique una doble pertenencia en sus notas internas."
        }
      ]
    },
    "showcase": {
      "sections": [
        "team"
      ],
      "usage": "Mention du rattachement du lead dans la section équipe."
    },
    "placeholder": "",
    "conditionGroups": [],
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": true,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": {
        "en": "Only if the project is not attached to Medical / Marketing DOF/DOI",
        "fr": "Uniquement si le projet n’est pas rattaché au Médical / Marketing DOF/DOI",
        "de": "Nur wenn das Projekt nicht dem Bereich Médical/Marketing DOF/DOI zugeordnet ist",
        "es": "Únicamente si el proyecto no está vinculado a Médical / Marketing DOF/DOI"
      },
      "value": "other"
    },
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "teamCoreMembers",
    "type": "long_text",
    "question": {
      "en": "Who are the members of the project team?",
      "fr": "Quels sont les membres de l’équipe projet ?",
      "de": "Wer sind die Mitglieder des Projektteams?",
      "es": "¿Quiénes son los miembros del equipo del proyecto?"
    },
    "options": [],
    "required": false,
    "conditions": [],
    "conditionLogic": "all",
    "guidance": {
      "objective": {
        "en": "Highlight the complementary skills of the team.",
        "fr": "Mettre en avant la complémentarité de l’équipe.",
        "de": "Die Komplementarität des Teams hervorheben.",
        "es": "Destacar la complementariedad del equipo."
      },
      "details": {
        "en": "Each line will be displayed as a member of the \"driving team\".",
        "fr": "Chaque ligne sera affichée comme un membre du “collectif moteur”.",
        "de": "Jede Zeile wird als Mitglied des „treibenden Kollektivs\" angezeigt.",
        "es": "Cada línea se mostrará como un miembro del «colectivo impulsor»."
      },
      "tips": [
        {
          "en": "Mention each person's role or area of expertise.",
          "fr": "Mentionnez pour chaque personne le rôle ou l’expertise apportée.",
          "de": "Geben Sie für jede Person die Rolle oder die eingebrachte Expertise an.",
          "es": "Indique para cada persona el rol o la experiencia que aporta."
        },
        {
          "en": "You may also include key external partners or experts.",
          "fr": "Incluez éventuellement les partenaires ou experts externes essentiels.",
          "de": "Nennen Sie gegebenenfalls auch wichtige externe Partner oder Experten.",
          "es": "Incluya, si procede, a los socios o expertos externos esenciales."
        }
      ]
    },
    "showcase": {
      "sections": [
        "team"
      ],
      "usage": "Liste « Collectif moteur » dans la section équipe."
    },
    "placeholder": {
      "en": "First name Last name - Job title (one per line)",
      "fr": "Prénom Nom - Poste de la personne (une par ligne)",
      "de": "Vorname Nachname – Position der Person (eine pro Zeile)",
      "es": "Nombre Apellidos - Puesto de la persona (uno por línea)"
    },
    "conditionGroups": []
  },
  {
    "id": "ProjectType",
    "type": "choice",
    "question": {
      "en": "What type of project is this?",
      "fr": "De quel type de projet s’agit-il ?",
      "de": "Um welche Art von Projekt handelt es sich?",
      "es": "¿De qué tipo de proyecto se trata?"
    },
    "options": [
      {
        "label": {
          "en": "LFB project",
          "fr": "Projet du LFB",
          "de": "Projekt des LFB",
          "es": "Proyecto del LFB"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "projet_du_lfb"
      },
      {
        "label": {
          "en": "Project co-developed by LFB and a partner",
          "fr": "Projet co-construit entre le LFB et un partenaire",
          "de": "Gemeinsam von LFB und einem Partner entwickeltes Projekt",
          "es": "Proyecto co-construido entre el LFB y un socio"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      },
      {
        "label": {
          "en": "Advisory Board not linked to a project",
          "fr": "Advisory Board non relié à un projet",
          "de": "Advisory Board ohne Projektbezug",
          "es": "Advisory Board no vinculado a un proyecto"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "advisory_board_non_relie_a_un_projet"
      },
      {
        "label": {
          "en": "Third-party project supported by LFB",
          "fr": "Projet d’un tiers soutenu par le LFB",
          "de": "Projekt eines Dritten, das vom LFB unterstützt wird",
          "es": "Proyecto de un tercero apoyado por el LFB"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "projet_d_un_tiers_soutenu_par_le_lfb"
      },
      {
        "label": {
          "en": "Donation / grant / call for projects",
          "fr": "Don / bourse / Appel à projets",
          "de": "Spende / Stipendium / Projektausschreibung",
          "es": "Donación / beca / Convocatoria de proyectos"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "don_bourse_appel_a_projets"
      }
    ],
    "required": true,
    "conditions": [],
    "conditionLogic": "all",
    "conditionGroups": [],
    "placeholder": "",
    "guidance": {
      "objective": {
        "en": "Identify the project type to determine which procedures apply",
        "fr": "Identifier le type de projet pour connaitre les procédures applicables",
        "de": "Den Projekttyp bestimmen, um die anwendbaren Verfahren zu kennen",
        "es": "Identificar el tipo de proyecto para conocer los procedimientos aplicables"
      },
      "details": {
        "en": "Depending on the selected project category, we will ask additional questions to refine the project and guide you as effectively as possible",
        "fr": "En fonction de la catégorie du projet sélectionné, nous vous poserons des questions supplémentaires pour affiner le projet et ainsi vous guider au mieux",
        "de": "Je nach ausgewählter Projektkategorie stellen wir Ihnen zusätzliche Fragen, um das Projekt zu präzisieren und Sie so bestmöglich zu begleiten",
        "es": "En función de la categoría de proyecto seleccionada, le formularemos preguntas adicionales para precisar el proyecto y así guiarle de la mejor manera"
      },
      "tips": [
        {
          "en": "If in doubt, select all applicable categories",
          "fr": "En cas de doute, sélectionner les différentes catégories applicables",
          "de": "Wählen Sie im Zweifelsfall alle zutreffenden Kategorien aus",
          "es": "En caso de duda, seleccione las distintas categorías aplicables"
        }
      ]
    },
    "extraCheckbox": {
      "enabled": true,
      "label": {
        "en": "This is a simple renewal or a duplicate of an already-approved project",
        "fr": "Il s’agit d’un simple renouvellement ou d’un duplicata d’un projet déjà validé",
        "de": "Es handelt sich um eine einfache Verlängerung oder ein Duplikat eines bereits validierten Projekts",
        "es": "Se trata de una simple renovación o de un duplicado de un proyecto ya validado"
      }
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q18",
    "type": "multi_choice",
    "question": {
      "en": "Can you specify the type of donation involved?",
      "fr": "Pouvez-vous préciser le type de don dont il s’agit ?",
      "de": "Können Sie die Art der Spende präzisieren?",
      "es": "¿Puede precisar de qué tipo de donación se trata?"
    },
    "options": [
      {
        "label": {
          "en": "Financial donation",
          "fr": "Don financier",
          "de": "Finanzielle Spende",
          "es": "Donación financiera"
        },
        "visibility": "always",
        "subType": "multi_choice",
        "subOptions": [
          {
            "label": {
              "en": "For a defined project",
              "fr": "Pour un projet défini",
              "de": "Für ein definiertes Projekt",
              "es": "Para un proyecto definido"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "pour_un_projet_defini"
          },
          {
            "label": {
              "en": "For a project not yet defined (call for projects)",
              "fr": "Pour un projet non encore défini (appel à projets)",
              "de": "Für ein noch nicht definiertes Projekt (Projektausschreibung)",
              "es": "Para un proyecto aún no definido (convocatoria de proyectos)"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "pour_un_projet_non_encore_defini_appel_a_projets"
          },
          {
            "label": {
              "en": "For general activity",
              "fr": "Pour l’activité générale",
              "de": "Für die allgemeine Tätigkeit",
              "es": "Para la actividad general"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "pour_l_activite_generale"
          }
        ],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "don_financier"
      },
      {
        "label": {
          "en": "Donation of products",
          "fr": "Don de produits",
          "de": "Sachspende",
          "es": "Donación de productos"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "don_de_produits"
      }
    ],
    "required": true,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "don_bourse_appel_a_projets"
      }
    ],
    "conditionLogic": "all",
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "don_bourse_appel_a_projets"
          }
        ]
      }
    ],
    "placeholder": "",
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q18_copy",
    "type": "multi_choice",
    "question": {
      "en": "Can you specify the type of support involved?",
      "fr": "Pouvez-vous préciser le type de soutien dont il s’agit ?",
      "de": "Können Sie die Art der Unterstützung präzisieren?",
      "es": "¿Puede precisar de qué tipo de apoyo se trata?"
    },
    "options": [
      {
        "label": {
          "en": "Project sponsorship",
          "fr": "Parrainage de projet",
          "de": "Projektsponsoring",
          "es": "Patrocinio de proyecto"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [
          {
            "label": {
              "en": "For a survey / study",
              "fr": "Pour une enquête / étude",
              "de": "Für eine Umfrage / Studie",
              "es": "Para una encuesta / estudio"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "pour_une_enquete_etude"
          }
        ],
        "value": "parrainage_de_projet"
      },
      {
        "label": {
          "en": "Event sponsorship",
          "fr": "Parrainage d’événement",
          "de": "Veranstaltungssponsoring",
          "es": "Patrocinio de evento"
        },
        "visibility": "always",
        "subType": "multi_choice",
        "subOptions": [
          {
            "label": {
              "en": "Booth",
              "fr": "Stand",
              "de": "Messestand",
              "es": "Stand"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "stand"
          },
          {
            "label": {
              "en": "Other event support",
              "fr": "Autre soutien à un événement",
              "de": "Sonstige Unterstützung einer Veranstaltung",
              "es": "Otro apoyo a un evento"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "autre_soutien_a_un_evenement"
          }
        ],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "parrainage_d_evenement"
      },
      {
        "label": {
          "en": "Interventional study (IIS)",
          "fr": "Étude interventionnelle (IIS)",
          "de": "Interventionelle Studie (IIS)",
          "es": "Estudio intervencionista (IIS)"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [
          {
            "label": {
              "en": "With product administration",
              "fr": "Avec administration de produit",
              "de": "Mit Produktverabreichung",
              "es": "Con administración de producto"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "avec_administration_de_produit"
          },
          {
            "label": {
              "en": "Without product administration",
              "fr": "Sans administration de produit",
              "de": "Ohne Produktverabreichung",
              "es": "Sin administración de producto"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "sans_administration_de_produit"
          }
        ],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "etude_interventionnelle_iis"
      },
      {
        "label": {
          "en": "Non-interventional study (NIS)",
          "fr": "Étude non-interventionnelle (NIS)",
          "de": "Nicht-interventionelle Studie (NIS)",
          "es": "Estudio no intervencionista (NIS)"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "etude_non_interventionnelle_nis"
      }
    ],
    "required": true,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_d_un_tiers_soutenu_par_le_lfb"
      }
    ],
    "conditionLogic": "all",
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_d_un_tiers_soutenu_par_le_lfb"
          }
        ]
      }
    ],
    "placeholder": "",
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": true,
      "label": {
        "en": "This is multi-sponsor sponsorship (supported by other pharmaceutical companies)",
        "fr": "Il s’agit d’un parrainage multi-sponsors (soutien d’autres laboratoires pharmaceutiques)",
        "de": "Es handelt sich um ein Multi-Sponsoring (Unterstützung durch andere Pharmaunternehmen)",
        "es": "Se trata de un patrocinio multipatrocinador (con el apoyo de otros laboratorios farmacéuticos)"
      }
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "targetAudience",
    "type": "multi_choice",
    "question": {
      "en": "Who is your project aimed at?",
      "fr": "À qui s’adresse votre projet ?",
      "de": "An wen richtet sich Ihr Projekt?",
      "es": "¿A quién se dirige su proyecto?"
    },
    "options": [
      {
        "label": {
          "en": "General public",
          "fr": "Grand public",
          "de": "Allgemeine Öffentlichkeit",
          "es": "Público general"
        },
        "visibility": "conditional",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [
          {
            "logic": "all",
            "conditions": [
              {
                "question": "ProjectType",
                "operator": "not_equals",
                "value": "don_bourse_appel_a_projets"
              }
            ]
          }
        ],
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "not_equals",
            "value": "don_bourse_appel_a_projets"
          }
        ],
        "conditionLogic": "all",
        "value": "grand_public"
      },
      {
        "label": {
          "en": "Patients / Patient associations",
          "fr": "Patients / Association de patients",
          "de": "Patienten / Patientenverbände",
          "es": "Pacientes / Asociación de pacientes"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "patients_association_de_patients"
      },
      {
        "label": {
          "en": "Healthcare professionals",
          "fr": "Professionnels de santé",
          "de": "Angehörige der Gesundheitsberufe",
          "es": "Profesionales de la salud"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "professionnels_de_sante"
      },
      {
        "label": {
          "en": "Institutional stakeholders",
          "fr": "Institutionnels",
          "de": "Institutionelle Akteure",
          "es": "Instituciones"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "institutionnels"
      },
      {
        "label": {
          "en": "LFB employees",
          "fr": "Collaborateurs du LFB",
          "de": "Mitarbeitende des LFB",
          "es": "Empleados del LFB"
        },
        "visibility": "conditional",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [
          {
            "logic": "all",
            "conditions": [
              {
                "question": "ProjectType",
                "operator": "not_equals",
                "value": "don_bourse_appel_a_projets"
              }
            ]
          }
        ],
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "not_equals",
            "value": "don_bourse_appel_a_projets"
          }
        ],
        "conditionLogic": "all",
        "value": "collaborateurs_du_lfb"
      }
    ],
    "required": true,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      }
    ],
    "conditionLogic": "any",
    "guidance": {
      "objective": {
        "en": "Identify the project's target audience",
        "fr": "Identifier les destinataires du projet",
        "de": "Die Zielgruppe des Projekts identifizieren",
        "es": "Identificar a los destinatarios del proyecto"
      },
      "details": {
        "en": "Depending on the target audience, the validation rules will differ",
        "fr": "En fonction de la cible, les règles de validation ne seront pas les mêmes",
        "de": "Je nach Zielgruppe gelten unterschiedliche Validierungsregeln",
        "es": "En función del público objetivo, las reglas de validación no serán las mismas"
      },
      "tips": [
        {
          "en": "Select all the people your project is aimed at",
          "fr": "Choisissez l’ensemble des personnes auxquelles votre projet s’adresse",
          "de": "Wählen Sie alle Personengruppen aus, an die sich Ihr Projekt richtet",
          "es": "Seleccione todas las personas a las que se dirige su proyecto"
        },
        {
          "en": "Only select \"LFB employees\" if the project is aimed at LFB employees (e.g. an intranet site)",
          "fr": "Ne sélectionnez \"Collaborateurs du LFB\" que si le projet s’adresse aux collaborateurs du LFB (ex : un site intranet)",
          "de": "Wählen Sie „Mitarbeitende des LFB\" nur aus, wenn sich das Projekt an LFB-Mitarbeitende richtet (z. B. eine Intranetseite)",
          "es": "Seleccione «Empleados del LFB» únicamente si el proyecto se dirige a los empleados del LFB (por ejemplo, un sitio de intranet)"
        }
      ]
    },
    "showcase": {
      "sections": [
        "hero"
      ],
      "usage": "Badge « Audience principale » dans le bandeau de la vitrine."
    },
    "placeholder": "",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      }
    ],
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": true,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": "",
      "value": "other"
    },
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q27",
    "type": "multi_choice",
    "question": {
      "en": "In which countries will this project be deployed?",
      "fr": "Dans quels pays ce projet sera-t-il déployé ?",
      "de": "In welchen Ländern wird dieses Projekt umgesetzt?",
      "es": "¿En qué países se implementará este proyecto?"
    },
    "options": [
      {
        "label": {
          "en": "Countries linked to subsidiaries outside France",
          "fr": "Pays liés à des filiales hors France",
          "de": "Länder mit Tochtergesellschaften außerhalb Frankreichs",
          "es": "Países vinculados a filiales fuera de Francia"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": "multi_choice",
        "subOptions": [
          {
            "label": {
              "en": "Germany",
              "fr": "Allemagne",
              "de": "Deutschland",
              "es": "Alemania"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "allemagne"
          },
          {
            "label": {
              "en": "Benelux",
              "fr": "Benelux",
              "de": "Benelux",
              "es": "Benelux"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "benelux"
          },
          {
            "label": {
              "en": "Spain",
              "fr": "Espagne",
              "de": "Spanien",
              "es": "España"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "espagne"
          },
          {
            "label": {
              "en": "Great Britain",
              "fr": "Grande-Bretagne",
              "de": "Großbritannien",
              "es": "Gran Bretaña"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "grande_bretagne"
          },
          {
            "label": {
              "en": "Mexico",
              "fr": "Mexique",
              "de": "Mexiko",
              "es": "México"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "mexique"
          }
        ],
        "value": "pays_lies_a_des_filiales_hors_france"
      },
      {
        "label": {
          "en": "France",
          "fr": "France",
          "de": "Frankreich",
          "es": "Francia"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "france"
      }
    ],
    "required": true,
    "conditions": [
      {
        "question": "teamLeadTeam",
        "operator": "equals",
        "value": "marketing_doi"
      },
      {
        "question": "teamLeadTeam",
        "operator": "equals",
        "value": "medical_doi"
      },
      {
        "question": "teamLeadTeam",
        "operator": "equals",
        "value": "affaires_publiques"
      },
      {
        "question": "teamLeadTeam",
        "operator": "equals",
        "value": "other"
      }
    ],
    "conditionLogic": "any",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "teamLeadTeam",
            "operator": "equals",
            "value": "marketing_doi"
          },
          {
            "question": "teamLeadTeam",
            "operator": "equals",
            "value": "medical_doi"
          },
          {
            "question": "teamLeadTeam",
            "operator": "equals",
            "value": "affaires_publiques"
          },
          {
            "question": "teamLeadTeam",
            "operator": "equals",
            "value": "other"
          }
        ]
      }
    ],
    "placeholder": "",
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": true,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": {
        "en": "Specify the other countries under consideration",
        "fr": "Précisez les autres pays imaginés",
        "de": "Geben Sie die weiteren in Betracht gezogenen Länder an",
        "es": "Indique los demás países previstos"
      },
      "value": "other"
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "showcaseTheme",
    "type": "choice",
    "question": {
      "en": "Is this a product or environment project?",
      "fr": "S’agit-il d’un projet produit ou environnement ?",
      "de": "Handelt es sich um ein Produkt- oder ein Themenumfeld-Projekt?",
      "es": "¿Se trata de un proyecto de producto o de entorno terapéutico?"
    },
    "options": [
      {
        "label": {
          "en": "Product",
          "fr": "Produit",
          "de": "Produkt",
          "es": "Producto"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [
          {
            "label": {
              "en": "Alfalastin",
              "fr": "Alfalastin",
              "de": "Alfalastin",
              "es": "Alfalastin"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "alfalastin"
          },
          {
            "label": {
              "en": "Iqymune / Clairyg100/Clairyg 5%",
              "fr": "Iqymune / Clairyg100/Clairyg 5%",
              "de": "Iqymune / Clairyg100/Clairyg 5%",
              "es": "Iqymune / Clairyg100/Clairyg 5%"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "iqymune_clairyg100_clairyg_5"
          },
          {
            "label": {
              "en": "Cevenfacta",
              "fr": "Cevenfacta",
              "de": "Cevenfacta",
              "es": "Cevenfacta"
            },
            "value": "cevenfacta"
          },
          {
            "label": {
              "en": "Clottafact/Fibclot",
              "fr": "Clottafact/Fibclot",
              "de": "Clottafact/Fibclot",
              "es": "Clottafact/Fibclot"
            },
            "value": "clottafact_fibclot"
          },
          {
            "label": {
              "en": "Tegeline",
              "fr": "Tegeline",
              "de": "Tegeline",
              "es": "Tegeline"
            },
            "value": "tegeline"
          },
          {
            "label": {
              "en": "Vialebex",
              "fr": "Vialebex",
              "de": "Vialebex",
              "es": "Vialebex"
            },
            "value": "vialebex"
          },
          {
            "label": {
              "en": "Wilfactin/ Willfact",
              "fr": "Wilfactin/ Willfact",
              "de": "Wilfactin/ Willfact",
              "es": "Wilfactin/ Willfact"
            },
            "value": "wilfactin_willfact"
          },
          {
            "label": {
              "en": "Cross-products",
              "fr": "Cross-produits",
              "de": "Produktübergreifend",
              "es": "Multiproducto"
            },
            "value": "cross_produits"
          }
        ],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "produit"
      },
      {
        "label": {
          "en": "Environment",
          "fr": "Environnement",
          "de": "Umfeld",
          "es": "Entorno"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [
          {
            "label": {
              "en": "Hemostasis",
              "fr": "Hémostase",
              "de": "Hämostase",
              "es": "Hemostasia"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "hemostase"
          },
          {
            "label": {
              "en": "Immunology",
              "fr": "Immunologie",
              "de": "Immunologie",
              "es": "Inmunología"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "immunologie"
          },
          {
            "label": {
              "en": "Pulmonology",
              "fr": "Pneumologie",
              "de": "Pneumologie",
              "es": "Neumología"
            },
            "value": "pneumologie"
          },
          {
            "label": {
              "en": "Intensive care",
              "fr": "Soins intensifs",
              "de": "Intensivmedizin",
              "es": "Cuidados intensivos"
            },
            "value": "soins_intensifs"
          }
        ],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "environnement"
      }
    ],
    "required": true,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      }
    ],
    "conditionLogic": "any",
    "guidance": {
      "objective": {
        "en": "Select the color palette that will serve as the base for the project showcase.",
        "fr": "Sélectionner la palette de couleurs qui servira de base à la vitrine du projet.",
        "de": "Wählen Sie die Farbpalette aus, die als Basis für die Projektvitrine dient.",
        "es": "Seleccionar la paleta de colores que servirá de base para la vitrina del proyecto."
      },
      "details": {
        "en": "Each theme can be adjusted in the back office using the color pickers (background, gradients, accents). Choose the one that best matches your project.",
        "fr": "Chaque thème peut être ajusté dans le back-office grâce aux color-pickers (fond, dégradés, accents). Choisissez celui qui correspond le mieux à votre projet.",
        "de": "Jedes Thema kann im Back-Office über die Farbwähler (Hintergrund, Verläufe, Akzente) angepasst werden. Wählen Sie dasjenige, das am besten zu Ihrem Projekt passt.",
        "es": "Cada tema puede ajustarse en el back-office mediante los selectores de color (fondo, degradados, acentos). Elija el que mejor se adapte a su proyecto."
      },
      "tips": []
    },
    "showcase": {
      "sections": [
        "hero"
      ],
      "usage": "Pilote les couleurs et dégradés utilisés dans l’ensemble de la vitrine."
    },
    "placeholder": "",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      }
    ],
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "problemPainPoints",
    "type": "long_text",
    "question": {
      "en": "List the concrete problems of your target audience that your project addresses",
      "fr": "Listez les problèmes concrets de votre cible auxquels votre projet vient répondre",
      "de": "Listen Sie die konkreten Probleme Ihrer Zielgruppe auf, die Ihr Projekt löst",
      "es": "Enumere los problemas concretos de su público objetivo a los que su proyecto da respuesta"
    },
    "options": [],
    "required": true,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      }
    ],
    "conditionLogic": "any",
    "guidance": {
      "objective": {
        "en": "Show that you understand your audience's priority needs.",
        "fr": "Montrer que vous comprenez les besoins prioritaires de votre audience.",
        "de": "Zeigen Sie, dass Sie die vorrangigen Bedürfnisse Ihrer Zielgruppe verstehen.",
        "es": "Mostrar que comprende las necesidades prioritarias de su audiencia."
      },
      "details": {
        "en": "Each need will be displayed as a bullet point to reinforce empathy.",
        "fr": "Chaque besoin s’affichera comme un bullet point pour renforcer l’empathie.",
        "de": "Jedes Bedürfnis wird als Aufzählungspunkt angezeigt, um Empathie zu vermitteln.",
        "es": "Cada necesidad se mostrará como un punto destacado para reforzar la empatía."
      },
      "tips": [
        {
          "en": "Use one line per need to make it easier to read.",
          "fr": "Utilisez une ligne par besoin pour faciliter la lecture.",
          "de": "Verwenden Sie eine Zeile pro Bedürfnis, um die Lesbarkeit zu erleichtern.",
          "es": "Utilice una línea por necesidad para facilitar la lectura."
        },
        {
          "en": "Describe the situation experienced rather than the desired solution.",
          "fr": "Décrivez la situation vécue plutôt que la solution souhaitée.",
          "de": "Beschreiben Sie die tatsächliche Situation und nicht die gewünschte Lösung.",
          "es": "Describa la situación vivida en lugar de la solución deseada."
        }
      ]
    },
    "showcase": {
      "sections": [
        "problem"
      ],
      "usage": "Liste des irritants principaux affichée dans la colonne de gauche."
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "placeholder": "",
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    },
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      }
    ]
  },
  {
    "id": "solutionDescription",
    "type": "long_text",
    "question": {
      "en": "Describe what your project involves",
      "fr": "Décrivez en quoi consiste votre projet",
      "de": "Beschreiben Sie, worin Ihr Projekt besteht",
      "es": "Describa en qué consiste su proyecto"
    },
    "options": [],
    "required": true,
    "conditions": [],
    "conditionLogic": "all",
    "guidance": {
      "objective": {
        "en": "Clarify the proposed experience before detailing the benefits.",
        "fr": "Clarifier l’expérience proposée avant de détailler les bénéfices.",
        "de": "Das angebotene Erlebnis klären, bevor die Vorteile im Detail beschrieben werden.",
        "es": "Aclarar la experiencia propuesta antes de detallar los beneficios."
      },
      "details": {
        "en": "This description introduces the \"Solution\" section and should remain easy to understand.",
        "fr": "Cette description introduit la section “Solution” et doit rester simple à comprendre.",
        "de": "Diese Beschreibung leitet den Abschnitt „Lösung\" ein und sollte leicht verständlich bleiben.",
        "es": "Esta descripción introduce la sección «Solución» y debe ser fácil de entender."
      },
      "tips": [
        {
          "en": "Structure it in 2-3 sentences: what, for whom, how.",
          "fr": "Structurez en 2-3 phrases : quoi, pour qui, comment.",
          "de": "Strukturieren Sie in 2-3 Sätzen: was, für wen, wie.",
          "es": "Estructúrelo en 2-3 frases: qué, para quién, cómo."
        },
        {
          "en": "Avoid internal jargon: imagine you are presenting the concept to a prospect.",
          "fr": "Évitez le vocabulaire interne : imaginez que vous présentez le concept à un prospect.",
          "de": "Vermeiden Sie internen Fachjargon: Stellen Sie sich vor, Sie präsentieren das Konzept einem potenziellen Kunden.",
          "es": "Evite el vocabulario interno: imagine que presenta el concepto a un cliente potencial."
        }
      ]
    },
    "showcase": {
      "sections": [
        "solution"
      ],
      "usage": "Bloc « Expérience proposée » dans la partie solution."
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "placeholder": "",
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    },
    "conditionGroups": []
  },
  {
    "id": "projectSlogan",
    "type": "text",
    "question": {
      "en": "How would you summarize your project in one sentence to highlight its value proposition?",
      "fr": "Comment résumeriez-vous votre projet en une phrase pour mettre en avant sa proposition de valeur ?",
      "de": "Wie würden Sie Ihr Projekt in einem Satz zusammenfassen, um sein Wertversprechen hervorzuheben?",
      "es": "¿Cómo resumiría su proyecto en una frase para destacar su propuesta de valor?"
    },
    "options": [],
    "required": false,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      }
    ],
    "conditionLogic": "any",
    "guidance": {
      "objective": {
        "en": "Summarize the hook in fewer than 10 words to immediately capture attention.",
        "fr": "Résumer l’accroche en moins de 10 mots pour capter l’attention immédiatement.",
        "de": "Fassen Sie den Aufhänger in weniger als 10 Wörtern zusammen, um sofort Aufmerksamkeit zu erzeugen.",
        "es": "Resumir el mensaje en menos de 10 palabras para captar la atención de inmediato."
      },
      "details": {
        "en": "The slogan appears in the hero section and should be simple, memorable, and benefit-oriented.",
        "fr": "Le slogan apparaît dans la hero section et doit être simple, mémorable et orienté bénéfice.",
        "de": "Der Slogan erscheint im Hero-Bereich und sollte einfach, einprägsam und nutzenorientiert sein.",
        "es": "El eslogan aparece en la sección principal (hero) y debe ser sencillo, fácil de recordar y orientado al beneficio."
      },
      "tips": [
        {
          "en": "Use an action verb that evokes the expected outcome.",
          "fr": "Utilisez un verbe d’action qui évoque le résultat attendu.",
          "de": "Verwenden Sie ein Aktionsverb, das das erwartete Ergebnis andeutet.",
          "es": "Utilice un verbo de acción que evoque el resultado esperado."
        },
        {
          "en": "Prefer a conversational tone: speak directly to your audience.",
          "fr": "Préférez un ton conversationnel : adressez-vous directement à votre audience.",
          "de": "Bevorzugen Sie einen konversationellen Ton: Sprechen Sie Ihre Zielgruppe direkt an.",
          "es": "Prefiera un tono conversacional: diríjase directamente a su audiencia."
        }
      ]
    },
    "showcase": {
      "sections": [
        "hero"
      ],
      "usage": "Promesse courte située sous le nom du projet."
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "placeholder": "",
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    },
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      }
    ]
  },
  {
    "id": "q19",
    "type": "multi_choice",
    "question": {
      "en": "What are the components of the project?",
      "fr": "Quelles sont les composantes du projet ?",
      "de": "Aus welchen Komponenten besteht das Projekt?",
      "es": "¿Cuáles son los componentes del proyecto?"
    },
    "options": [
      {
        "label": {
          "en": "Survey / market study",
          "fr": "Enquête / étude de marché",
          "de": "Umfrage / Marktstudie",
          "es": "Encuesta / estudio de mercado"
        },
        "visibility": "always",
        "subType": "choice",
        "subOptions": [
          {
            "label": {
              "en": "Related to medical practices",
              "fr": "Liée aux pratiques médicales",
              "de": "Bezogen auf medizinische Praktiken",
              "es": "Relacionada con las prácticas médicas"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "liee_aux_pratiques_medicales"
          },
          {
            "label": {
              "en": "Related to living with the disease",
              "fr": "Liée à la vie avec la maladie",
              "de": "Bezogen auf das Leben mit der Krankheit",
              "es": "Relacionada con la vida con la enfermedad"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "liee_a_la_vie_avec_la_maladie"
          }
        ],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "enquete_etude_de_marche"
      },
      {
        "label": {
          "en": "Creation / purchase / handling of a database",
          "fr": "Création / achat / manipulation de base de données",
          "de": "Erstellung / Kauf / Verarbeitung einer Datenbank",
          "es": "Creación / compra / manejo de bases de datos"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "creation_achat_manipulation_de_base_de_donnees"
      },
      {
        "label": {
          "en": "Digital",
          "fr": "Digital",
          "de": "Digital",
          "es": "Digital"
        },
        "visibility": "always",
        "subType": "multi_choice",
        "subOptions": [
          {
            "label": {
              "en": "Website",
              "fr": "Site internet",
              "de": "Website",
              "es": "Sitio web"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "site_internet"
          },
          {
            "label": {
              "en": "Social media campaign",
              "fr": "Campagne réseaux sociaux",
              "de": "Social-Media-Kampagne",
              "es": "Campaña en redes sociales"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "campagne_reseaux_sociaux"
          },
          {
            "label": {
              "en": "Mobile applications",
              "fr": "Applications mobiles",
              "de": "Mobile Anwendungen",
              "es": "Aplicaciones móviles"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "applications_mobiles"
          },
          {
            "label": {
              "en": "Email campaign",
              "fr": "Campagne d’emailing",
              "de": "E-Mail-Kampagne",
              "es": "Campaña de email marketing"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "campagne_d_emailing"
          },
          {
            "label": {
              "en": "Webinar",
              "fr": "Webconférence",
              "de": "Webkonferenz",
              "es": "Videoconferencia"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "webconference"
          },
          {
            "label": {
              "en": "Podcast",
              "fr": "Podcast",
              "de": "Podcast",
              "es": "Podcast"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "podcast"
          },
          {
            "label": {
              "en": "E-learning",
              "fr": "Elearning",
              "de": "E-Learning",
              "es": "Elearning"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "elearning"
          },
          {
            "label": {
              "en": "AI tool (e.g. AI bot)",
              "fr": "Outil d’IA (ex : bot IA)",
              "de": "KI-Tool (z. B. KI-Bot)",
              "es": "Herramienta de IA (por ejemplo, un bot de IA)"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "outil_d_ia_ex_bot_ia"
          }
        ],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "digital"
      },
      {
        "label": {
          "en": "Print",
          "fr": "Print",
          "de": "Print",
          "es": "Material impreso"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "print"
      },
      {
        "label": {
          "en": "Event",
          "fr": "Événement",
          "de": "Veranstaltung",
          "es": "Evento"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "evenement"
      },
      {
        "label": {
          "en": "Presentation of clinical cases",
          "fr": "Présentation de cas cliniques",
          "de": "Präsentation klinischer Fälle",
          "es": "Presentación de casos clínicos"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "presentation_de_cas_cliniques"
      },
      {
        "label": {
          "en": "Writing of abstracts / posters / scientific articles",
          "fr": "Rédaction d’abstract / de poster / articles scientifiques",
          "de": "Verfassen von Abstracts / Postern / wissenschaftlichen Artikeln",
          "es": "Redacción de resúmenes (abstracts) / pósteres / artículos científicos"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "redaction_d_abstract_de_poster_articles_scientifiques"
      }
    ],
    "required": true,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      }
    ],
    "conditionLogic": "any",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      }
    ],
    "placeholder": "",
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q25",
    "type": "choice",
    "question": {
      "en": "Have you planned a Q&A session as part of the event?",
      "fr": "Avez-vous prévu une session de questions / réponses dans le cadre de l’événement ?",
      "de": "Ist im Rahmen der Veranstaltung eine Frage-Antwort-Session vorgesehen?",
      "es": "¿Ha previsto una sesión de preguntas y respuestas en el marco del evento?"
    },
    "options": [
      {
        "label": {
          "en": "Yes",
          "fr": "Oui",
          "de": "Ja",
          "es": "Sí"
        },
        "visibility": "always",
        "subType": "multi_choice",
        "subOptions": [
          {
            "label": {
              "en": "With prior moderation of questions",
              "fr": "Avec modération préalable des questions",
              "de": "Mit vorheriger Moderation der Fragen",
              "es": "Con moderación previa de las preguntas"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "avec_moderation_prealable_des_questions"
          },
          {
            "label": {
              "en": "In the presence of an LFB employee",
              "fr": "En présence d’un collaborateur du LFB",
              "de": "In Anwesenheit eines LFB-Mitarbeiters",
              "es": "En presencia de un empleado del LFB"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "en_presence_d_un_collaborateur_du_lfb"
          }
        ],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "oui"
      },
      {
        "label": {
          "en": "No",
          "fr": "Non",
          "de": "Nein",
          "es": "No"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "non"
      }
    ],
    "required": true,
    "conditions": [
      {
        "question": "q19",
        "operator": "equals",
        "value": "webconference"
      },
      {
        "question": "q19",
        "operator": "equals",
        "value": "evenement"
      }
    ],
    "conditionLogic": "any",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "q19",
            "operator": "equals",
            "value": "webconference"
          },
          {
            "question": "q19",
            "operator": "equals",
            "value": "evenement"
          }
        ]
      }
    ],
    "placeholder": "",
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q24",
    "type": "multi_choice",
    "question": {
      "en": "As part of the project, will you ...",
      "fr": "Dans le cadre du projet allez-vous ...",
      "de": "Werden Sie im Rahmen des Projekts …",
      "es": "En el marco del proyecto, ¿va usted a...?"
    },
    "options": [
      {
        "label": {
          "en": "Share information about our manufacturing processes, facilities, or technical details",
          "fr": "Partager des informations sur nos procédés de fabrication, nos installations ou des éléments techniques",
          "de": "Informationen zu unseren Herstellungsverfahren, Anlagen oder technischen Elementen weitergeben",
          "es": "Compartir información sobre nuestros procesos de fabricación, nuestras instalaciones o elementos técnicos"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "partager_des_informations_sur_nos_procedes_de_fabrication_nos_installations_ou_des_elements_techniques"
      },
      {
        "label": {
          "en": "Attach and/or distribute paper or electronic copies of publications",
          "fr": "Joindre et/ou diffuser des exemplaires papiers ou électroniques de publications",
          "de": "Papier- oder elektronische Exemplare von Publikationen beifügen und/oder verbreiten",
          "es": "Adjuntar y/o difundir ejemplares impresos o electrónicos de publicaciones"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "joindre_et_ou_diffuser_des_exemplaires_papiers_ou_electroniques_de_publications"
      },
      {
        "label": {
          "en": "Share information related to LFB's history before 1994",
          "fr": "Partager des informations liées à l’historique du LFB avant 1994",
          "de": "Informationen zur Geschichte des LFB vor 1994 weitergeben",
          "es": "Compartir información relacionada con la historia del LFB anterior a 1994"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "partager_des_informations_liees_a_l_historique_du_lfb_avant_1994"
      },
      {
        "label": {
          "en": "Share information on sensitive topics (e.g. industrial failure, supply shortage, capital increase, ...)",
          "fr": "Partager des informations sur des sujets sensibles (ex : défaillance industrielle, tension d’approvisionnement, augmentation de capital, ...)",
          "de": "Informationen zu sensiblen Themen weitergeben (z. B. Produktionsausfall, Lieferengpässe, Kapitalerhöhung usw.)",
          "es": "Compartir información sobre temas sensibles (por ejemplo, un fallo industrial, tensiones de suministro, una ampliación de capital, etc.)"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "partager_des_informations_sur_des_sujets_sensibles_ex_defaillance_industrielle_tension_d_approvisionnement_augmentation_de_capital"
      },
      {
        "label": {
          "en": "Use AI",
          "fr": "Utiliser l’IA",
          "de": "KI nutzen",
          "es": "Utilizar la IA"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": "multi_choice",
        "subOptions": [
          {
            "label": {
              "en": "Yes, as part of preparing the project",
              "fr": "Oui, dans le cadre de la préparation du projet",
              "de": "Ja, im Rahmen der Projektvorbereitung",
              "es": "Sí, en el marco de la preparación del proyecto"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "oui_dans_le_cadre_de_la_preparation_du_projet"
          },
          {
            "label": {
              "en": "Yes, to generate content for the project",
              "fr": "Oui, pour générer du contenu pour le projet",
              "de": "Ja, um Inhalte für das Projekt zu erstellen",
              "es": "Sí, para generar contenido para el proyecto"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "oui_pour_generer_du_contenu_pour_le_projet"
          },
          {
            "label": {
              "en": "Yes, the project will allow users to use AI",
              "fr": "Oui, le projet permettra aux utilisateurs d’utiliser l’IA",
              "de": "Ja, das Projekt ermöglicht es den Nutzern, KI zu verwenden",
              "es": "Sí, el proyecto permitirá a los usuarios utilizar la IA"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "oui_le_projet_permettra_aux_utilisateurs_d_utiliser_l_ia"
          }
        ],
        "value": "utiliser_l_ia"
      }
    ],
    "required": false,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      },
      {
        "question": "q18_copy",
        "operator": "equals",
        "value": "stand"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "advisory_board_non_relie_a_un_projet"
      }
    ],
    "conditionLogic": "any",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          },
          {
            "question": "q18_copy",
            "operator": "equals",
            "value": "stand"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "advisory_board_non_relie_a_un_projet"
          }
        ]
      }
    ],
    "placeholder": "",
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q22",
    "type": "multi_choice",
    "question": {
      "en": "Does your project match one of these situations?",
      "fr": "Votre projet correspond-il à une de ces situations ?",
      "de": "Entspricht Ihr Projekt einer dieser Situationen?",
      "es": "¿Corresponde su proyecto a alguna de estas situaciones?"
    },
    "options": [
      {
        "label": {
          "en": "A structured support program for the patient or those around them (e.g. a caregiver) to help them understand their condition and use their treatment (initiation, adherence, management of side effects, understanding of the disease, practical or financial support)",
          "fr": "Un dispositif structuré d’accompagnement du patient ou de son entourage (par ex. aidant) pour l’accompagner notamment dans la compréhension de sa pathologie, l’usage de son traitement (initiation, observance, gestion des effets indésirables, compréhension de la maladie, soutien pratique ou financier)",
          "de": "Ein strukturiertes Programm zur Begleitung des Patienten oder seines Umfelds (z. B. pflegende Angehörige), das ihn insbesondere beim Verständnis seiner Erkrankung und der Anwendung seiner Behandlung unterstützt (Einleitung, Therapietreue, Umgang mit Nebenwirkungen, Krankheitsverständnis, praktische oder finanzielle Unterstützung)",
          "es": "Un dispositivo estructurado de acompañamiento del paciente o de su entorno (por ejemplo, un cuidador) para ayudarle, en particular, a comprender su enfermedad, a usar su tratamiento (inicio, cumplimiento, gestión de los efectos adversos, comprensión de la enfermedad, apoyo práctico o financiero)"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "un_dispositif_structure_d_accompagnement_du_patient_ou_de_son_entourage_par_ex_aidant_pour_l_accompagner_notamment_dans_la_comprehension_de_sa_pathologie_l_usage_de_son_traitement_initiation_observance_gestion_des_effets_indesirables_comprehension_de_la_maladie_soutien_pratique_ou_financier"
      },
      {
        "label": {
          "en": "Enables remote medical acts (consultation, opinion, follow-up, monitoring, prescription, or care coordination)",
          "fr": "Permet de réaliser des actes médicaux à distance (consultation, avis, suivi, surveillance, prescription ou coordination des soins)",
          "de": "Ermöglicht die Durchführung medizinischer Leistungen aus der Ferne (Beratung, Gutachten, Nachsorge, Überwachung, Verschreibung oder Koordination der Versorgung)",
          "es": "Permite realizar actos médicos a distancia (consulta, opinión médica, seguimiento, supervisión, prescripción o coordinación de la atención)"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "permet_de_realiser_des_actes_medicaux_a_distance_consultation_avis_suivi_surveillance_prescription_ou_coordination_des_soins"
      },
      {
        "label": {
          "en": "An application / instrument / tool intended for medical purposes (prevention, diagnosis, treatment, disease monitoring).",
          "fr": "Une application / instrument / outil destiné à être utilisé à des fins médicales (prévention, diagnostic, traitement, suivi de la maladie).",
          "de": "Eine Anwendung / ein Instrument / ein Werkzeug, das für medizinische Zwecke bestimmt ist (Prävention, Diagnose, Behandlung, Krankheitsverlaufskontrolle).",
          "es": "Una aplicación / instrumento / herramienta destinada a utilizarse con fines médicos (prevención, diagnóstico, tratamiento, seguimiento de la enfermedad)."
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "une_application_instrument_outil_destine_a_etre_utilise_a_des_fins_medicales_prevention_diagnostic_traitement_suivi_de_la_maladie"
      }
    ],
    "required": true,
    "conditions": [],
    "conditionLogic": "all",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "targetAudience",
            "operator": "equals",
            "value": "patients_association_de_patients"
          },
          {
            "question": "targetAudience",
            "operator": "equals",
            "value": "professionnels_de_sante"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "question": "q19",
            "operator": "equals",
            "value": "applications_mobiles"
          },
          {
            "question": "q19",
            "operator": "equals",
            "value": "elearning"
          },
          {
            "question": "q19",
            "operator": "equals",
            "value": "outil_d_ia_ex_bot_ia"
          },
          {
            "question": "q19",
            "operator": "equals",
            "value": "site_internet"
          }
        ]
      }
    ],
    "placeholder": "",
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q3",
    "type": "multi_choice",
    "question": {
      "en": "Do you collect / process data from individuals as part of your project / solution?",
      "fr": "Collectez-vous / manipulez-vous des données issues de personnes dans le cadre de votre projet / solution ?",
      "de": "Erheben/verarbeiten Sie im Rahmen Ihres Projekts/Ihrer Lösung personenbezogene Daten?",
      "es": "¿Recopila o trata datos de personas en el marco de su proyecto / solución?"
    },
    "options": [
      {
        "label": {
          "en": "Yes - Health data",
          "fr": "Oui - Données de santé",
          "de": "Ja - Gesundheitsdaten",
          "es": "Sí - Datos de salud"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "oui_donnees_de_sante"
      },
      {
        "label": {
          "en": "Yes - Other sensitive data (e.g. genetic, biometric, ethnic, sexual orientation data, ...)",
          "fr": "Oui - Autres données sensibles (ex : données génétiques, biométriques, ethnique, orientation sexuelle, ...)",
          "de": "Ja - Sonstige sensible Daten (z. B. genetische, biometrische, ethnische Daten, sexuelle Orientierung usw.)",
          "es": "Sí - Otros datos sensibles (por ejemplo, datos genéticos, biométricos, de origen étnico, orientación sexual, etc.)"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "oui_autres_donnees_sensibles_ex_donnees_genetiques_biometriques_ethnique_orientation_sexuelle"
      },
      {
        "label": {
          "en": "Yes - Standard personal data (e.g. email, satisfaction, ...)",
          "fr": "Oui - Données personnelles standard (ex : email, satisfaction, ...)",
          "de": "Ja - Standard-Personendaten (z. B. E-Mail, Zufriedenheit usw.)",
          "es": "Sí - Datos personales estándar (por ejemplo, email, satisfacción, etc.)"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "oui_donnees_personnelles_standard_ex_email_satisfaction"
      },
      {
        "label": {
          "en": "Free-text fields present in my solution",
          "fr": "Présence de champs libres dans ma solution",
          "de": "Vorhandensein von Freitextfeldern in meiner Lösung",
          "es": "Presencia de campos libres en mi solución"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "presence_de_champs_libres_dans_ma_solution"
      },
      {
        "label": {
          "en": "No",
          "fr": "Non",
          "de": "Nein",
          "es": "No"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "non"
      }
    ],
    "required": true,
    "conditions": [],
    "guidance": {
      "objective": {
        "en": "Determine the nature of the personal data being processed.",
        "fr": "Qualifier la nature des données personnelles manipulées.",
        "de": "Die Art der verarbeiteten personenbezogenen Daten bestimmen.",
        "es": "Calificar la naturaleza de los datos personales tratados."
      },
      "details": {
        "en": "Health data requires an enhanced impact assessment (DPIA), HDS-certified hosting, and specific contractual clauses.",
        "fr": "Les données de santé impliquent une analyse d’impact renforcée (DPIA), un hébergement certifié HDS et des clauses contractuelles spécifiques.",
        "de": "Gesundheitsdaten erfordern eine verstärkte Datenschutz-Folgenabschätzung (DPIA), ein zertifiziertes Hosting (HDS) sowie spezifische Vertragsklauseln.",
        "es": "Los datos de salud implican un análisis de impacto reforzado (DPIA), un alojamiento certificado HDS y cláusulas contractuales específicas."
      },
      "tips": [
        {
          "en": "If the collection is uncertain, use the most protective assumption to plan approvals.",
          "fr": "Si la collecte est incertaine, retenez l’hypothèse la plus protectrice pour planifier les validations.",
          "de": "Ist die Erhebung ungewiss, legen Sie der Planung der Validierungen die schutzintensivste Annahme zugrunde.",
          "es": "Si la recopilación es incierta, opte por la hipótesis más protectora para planificar las validaciones."
        }
      ]
    },
    "placeholder": "",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "q19",
            "operator": "contains",
            "value": "site_internet"
          },
          {
            "question": "q19",
            "operator": "contains",
            "value": "applications_mobiles"
          },
          {
            "question": "q19",
            "operator": "equals",
            "value": "enquete_etude_de_marche"
          },
          {
            "question": "q19",
            "operator": "equals",
            "value": "creation_achat_manipulation_de_base_de_donnees"
          },
          {
            "question": "q19",
            "operator": "equals",
            "value": "outil_d_ia_ex_bot_ia"
          },
          {
            "question": "q19",
            "operator": "equals",
            "value": "elearning"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q14",
    "type": "multi_choice",
    "question": {
      "en": "How will you communicate about your project?",
      "fr": "Comment allez-vous communiquer sur votre projet ?",
      "de": "Wie werden Sie über Ihr Projekt kommunizieren?",
      "es": "¿Cómo va a comunicar sobre su proyecto?"
    },
    "options": [
      {
        "label": {
          "en": "Via LFB's digital channels",
          "fr": "Via les canaux digitaux du LFB",
          "de": "Über die digitalen Kanäle des LFB",
          "es": "A través de los canales digitales del LFB"
        },
        "visibility": "always",
        "subType": "multi_choice",
        "subOptions": [
          {
            "label": {
              "en": "LFB corporate website",
              "fr": "Site internet corporate du LFB",
              "de": "Unternehmenswebsite des LFB",
              "es": "Sitio web corporativo del LFB"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "site_internet_corporate_du_lfb"
          },
          {
            "label": {
              "en": "Agora website",
              "fr": "Site internet Agora",
              "de": "Website Agora",
              "es": "Sitio web Agora"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "site_internet_agora"
          },
          {
            "label": {
              "en": "LFB subsidiaries' websites",
              "fr": "Site internet des filiales du LFB",
              "de": "Websites der LFB-Tochtergesellschaften",
              "es": "Sitios web de las filiales del LFB"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "site_internet_des_filiales_du_lfb"
          },
          {
            "label": {
              "en": "LFB social media",
              "fr": "Réseaux sociaux du LFB",
              "de": "Soziale Medien des LFB",
              "es": "Redes sociales del LFB"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "reseaux_sociaux_du_lfb"
          },
          {
            "label": {
              "en": "Email marketing",
              "fr": "Emailing",
              "de": "E-Mail-Versand",
              "es": "Email marketing"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "emailing"
          }
        ],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "via_les_canaux_digitaux_du_lfb"
      },
      {
        "label": {
          "en": "Via LFB's physical channels",
          "fr": "Via les canaux physiques du LFB",
          "de": "Über die physischen Kanäle des LFB",
          "es": "A través de los canales físicos del LFB"
        },
        "visibility": "always",
        "subType": "multi_choice",
        "subOptions": [
          {
            "label": {
              "en": "Handed out (flyer, poster, ...)",
              "fr": "Remis (flyer, affiche, ...)",
              "de": "Ausgehändigt (Flyer, Plakat usw.)",
              "es": "Entregado en mano (folleto, cartel, etc.)"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "remis_flyer_affiche"
          },
          {
            "label": {
              "en": "Sales team",
              "fr": "Équipe vente",
              "de": "Vertriebsteam",
              "es": "Equipo de ventas"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "equipe_vente"
          },
          {
            "label": {
              "en": "Medical team",
              "fr": "Équipe médicale",
              "de": "Medizinisches Team",
              "es": "Equipo médico"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "equipe_medicale"
          },
          {
            "label": {
              "en": "Events (via booth, roll-up banner, ...)",
              "fr": "Événements (via stand, kakémono, ...)",
              "de": "Veranstaltungen (über Messestand, Roll-up usw.)",
              "es": "Eventos (mediante stand, roll-up, etc.)"
            },
            "visibility": "always",
            "subType": null,
            "subOptions": [],
            "conditionGroups": [],
            "conditions": [],
            "conditionLogic": "all",
            "value": "evenements_via_stand_kakemono"
          }
        ],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "via_les_canaux_physiques_du_lfb"
      },
      {
        "label": {
          "en": "Via our partner",
          "fr": "Via notre partenaire",
          "de": "Über unseren Partner",
          "es": "A través de nuestro socio"
        },
        "visibility": "conditional",
        "conditionGroups": [
          {
            "logic": "all",
            "conditions": [
              {
                "question": "q10",
                "operator": "not_equals",
                "value": "aucune_collaboration_prevue_avec_l_externe"
              }
            ]
          }
        ],
        "conditions": [
          {
            "question": "q10",
            "operator": "not_equals",
            "value": "aucune_collaboration_prevue_avec_l_externe"
          }
        ],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "via_notre_partenaire"
      },
      {
        "label": {
          "en": "Via a third party",
          "fr": "Via un tiers",
          "de": "Über einen Dritten",
          "es": "A través de un tercero"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "via_un_tiers"
      },
      {
        "label": {
          "en": "Press release",
          "fr": "Communiqué de presse",
          "de": "Pressemitteilung",
          "es": "Comunicado de prensa"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "communique_de_presse"
      }
    ],
    "required": true,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "not_equals",
        "value": "don_bourse_appel_a_projets"
      },
      {
        "question": "q18_copy",
        "operator": "not_equals",
        "value": "etude_interventionnelle_iis"
      },
      {
        "question": "q18_copy",
        "operator": "not_equals",
        "value": "etude_non_interventionnelle_nis"
      },
      {
        "question": "ProjectType",
        "operator": "not_equals",
        "value": "advisory_board_non_relie_a_un_projet"
      }
    ],
    "conditionLogic": "any",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "not_equals",
            "value": "don_bourse_appel_a_projets"
          },
          {
            "question": "q18_copy",
            "operator": "not_equals",
            "value": "etude_interventionnelle_iis"
          },
          {
            "question": "q18_copy",
            "operator": "not_equals",
            "value": "etude_non_interventionnelle_nis"
          },
          {
            "question": "ProjectType",
            "operator": "not_equals",
            "value": "advisory_board_non_relie_a_un_projet"
          }
        ]
      }
    ],
    "placeholder": "",
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q10",
    "type": "multi_choice",
    "question": {
      "en": "As part of the project, will you collaborate with ...",
      "fr": "Dans le cadre du projet, allez-vous collaborer avec ...",
      "de": "Werden Sie im Rahmen des Projekts zusammenarbeiten mit …",
      "es": "En el marco del proyecto, ¿va a colaborar con...?"
    },
    "options": [
      {
        "label": {
          "en": "No external collaboration planned",
          "fr": "Aucune collaboration prévue avec l’externe",
          "de": "Keine Zusammenarbeit mit Externen vorgesehen",
          "es": "No se prevé ninguna colaboración externa"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "aucune_collaboration_prevue_avec_l_externe"
      },
      {
        "label": {
          "en": "Patient associations / Patients",
          "fr": "Association de patients / Patients",
          "de": "Patientenverbände / Patienten",
          "es": "Asociación de pacientes / Pacientes"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "association_de_patients_patients"
      },
      {
        "label": {
          "en": "Healthcare professional (outside France) (or HCP association / learned society)",
          "fr": "Professionnel de santé (hors France) (ou association de PdS / Société savante)",
          "de": "Angehöriger eines Gesundheitsberufs (außerhalb Frankreichs) (oder Fachverband / wissenschaftliche Gesellschaft)",
          "es": "Profesional de la salud (fuera de Francia) (o asociación de PdS / sociedad científica)"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "professionnel_de_sante_hors_france_ou_association_de_pds_societe_savante"
      },
      {
        "label": {
          "en": "French healthcare professional (or HCP association / learned society)",
          "fr": "Professionnel de santé français (ou association de PdS / Société savante)",
          "de": "Französischer Angehöriger eines Gesundheitsberufs (oder Fachverband / wissenschaftliche Gesellschaft)",
          "es": "Profesional de la salud francés (o asociación de PdS / sociedad científica)"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "professionnel_de_sante_francais_ou_association_de_pds_societe_savante"
      },
      {
        "label": {
          "en": "French expert who is not a healthcare professional",
          "fr": "Expert français non professionnel de santé",
          "de": "Französischer Experte, der kein Angehöriger eines Gesundheitsberufs ist",
          "es": "Experto francés que no es profesional de la salud"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "expert_francais_non_professionnel_de_sante"
      },
      {
        "label": {
          "en": "Hospital institutions",
          "fr": "Etablissements hospitaliers",
          "de": "Krankenhauseinrichtungen",
          "es": "Centros hospitalarios"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "etablissements_hospitaliers"
      },
      {
        "label": {
          "en": "Institutional stakeholder",
          "fr": "Institutionnel",
          "de": "Institutionell",
          "es": "Institucional"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "institutionnel"
      },
      {
        "label": {
          "en": "Agency",
          "fr": "Agence",
          "de": "Agentur",
          "es": "Agencia"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "agence"
      },
      {
        "label": {
          "en": "Another industry player",
          "fr": "Un autre industriel",
          "de": "Ein anderes Industrieunternehmen",
          "es": "Otra empresa del sector"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "un_autre_industriel"
      }
    ],
    "required": false,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "advisory_board_non_relie_a_un_projet"
      }
    ],
    "conditionLogic": "any",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "advisory_board_non_relie_a_un_projet"
          }
        ]
      }
    ],
    "placeholder": "",
    "guidance": {
      "objective": {
        "en": "Anticipate the involvement of external providers and the related controls",
        "fr": "Anticiper l’implication de prestataires externes et les contrôles associés",
        "de": "Die Einbindung externer Dienstleister und die damit verbundenen Kontrollen antizipieren",
        "es": "Anticipar la implicación de proveedores externos y los controles correspondientes"
      },
      "details": {
        "en": "Partnerships require a legal review of contracts, and sometimes additional delays related to reporting obligations / authorization requests to authorities",
        "fr": "Les partenariats imposent une revue juridique des contrats, et parfois des délais supplémentaires liés à des obligations de déclaration / demande d’autorisation aux autorités",
        "de": "Partnerschaften erfordern eine juristische Prüfung der Verträge und mitunter zusätzliche Fristen aufgrund von Melde- oder Genehmigungspflichten gegenüber den Behörden",
        "es": "Las colaboraciones exigen una revisión jurídica de los contratos y, en ocasiones, plazos adicionales derivados de obligaciones de declaración / solicitud de autorización a las autoridades"
      },
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": true,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": "",
      "value": "other"
    },
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q10_copy",
    "type": "multi_choice",
    "question": {
      "en": "Who is the support intended for?",
      "fr": "À destination de qui porte le soutien ?",
      "de": "An wen richtet sich die Unterstützung?",
      "es": "¿A quién va destinado el apoyo?"
    },
    "options": [
      {
        "label": {
          "en": "Patient association",
          "fr": "Association de patients",
          "de": "Patientenverband",
          "es": "Asociación de pacientes"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "association_de_patients"
      },
      {
        "label": {
          "en": "HCP association / learned society",
          "fr": "Association de PdS / Société savante",
          "de": "Fachverband / wissenschaftliche Gesellschaft",
          "es": "Asociación de PdS / sociedad científica"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "association_de_pds_societe_savante"
      },
      {
        "label": {
          "en": "Hospital institutions",
          "fr": "Etablissements hospitaliers",
          "de": "Krankenhauseinrichtungen",
          "es": "Centros hospitalarios"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "etablissements_hospitaliers"
      }
    ],
    "required": false,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_d_un_tiers_soutenu_par_le_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "don_bourse_appel_a_projets"
      }
    ],
    "conditionLogic": "any",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_d_un_tiers_soutenu_par_le_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "don_bourse_appel_a_projets"
          }
        ]
      }
    ],
    "placeholder": "",
    "guidance": {
      "objective": {
        "en": "Anticipate involvement based on the beneficiary",
        "fr": "Anticiper l’implication en fonction du bénéficiaire",
        "de": "Die Einbindung je nach Begünstigtem antizipieren",
        "es": "Anticipar la implicación en función del beneficiario"
      },
      "details": {
        "en": "Financial support sometimes requires additional delays related to reporting obligations / authorization requests to authorities",
        "fr": "Les soutiens financiers imposent parfois des délais supplémentaires liés à des obligations de déclaration / demande d’autorisation aux autorités",
        "de": "Finanzielle Unterstützungen erfordern mitunter zusätzliche Fristen aufgrund von Melde- oder Genehmigungspflichten gegenüber den Behörden",
        "es": "Los apoyos financieros a veces conllevan plazos adicionales derivados de obligaciones de declaración / solicitud de autorización a las autoridades"
      },
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": true,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": "",
      "value": "other"
    },
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q10_copy_copy",
    "type": "multi_choice",
    "question": {
      "en": "Who will be present at the event?",
      "fr": "Qui sera présent à l’événement ?",
      "de": "Wer wird bei der Veranstaltung anwesend sein?",
      "es": "¿Quién estará presente en el evento?"
    },
    "options": [
      {
        "label": {
          "en": "Patient association",
          "fr": "Association de patients",
          "de": "Patientenverband",
          "es": "Asociación de pacientes"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "association_de_patients"
      },
      {
        "label": {
          "en": "Healthcare professionals",
          "fr": "Professionnels de santé",
          "de": "Angehörige der Gesundheitsberufe",
          "es": "Profesionales de la salud"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "professionnels_de_sante"
      },
      {
        "label": {
          "en": "Institutional stakeholders",
          "fr": "Institutionnels",
          "de": "Institutionelle Akteure",
          "es": "Instituciones"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "institutionnels"
      }
    ],
    "required": false,
    "conditions": [
      {
        "question": "q18_copy",
        "operator": "equals",
        "value": "parrainage_d_evenement"
      }
    ],
    "conditionLogic": "any",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "q18_copy",
            "operator": "equals",
            "value": "parrainage_d_evenement"
          }
        ]
      }
    ],
    "placeholder": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": true,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": "",
      "value": "other"
    },
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q17",
    "type": "multi_choice",
    "question": {
      "en": "Do you have any specific expectations regarding your partner(s)?",
      "fr": "Avez-vous des attentes particulières vis-à-vis de votre ou vos partenaires ?",
      "de": "Haben Sie besondere Erwartungen an Ihren Partner bzw. Ihre Partner?",
      "es": "¿Tiene expectativas particulares respecto a su(s) socio(s)?"
    },
    "options": [
      {
        "label": {
          "en": "Exclusivity",
          "fr": "Exclusivité",
          "de": "Exklusivität",
          "es": "Exclusividad"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "exclusivite"
      },
      {
        "label": {
          "en": "Collaboration for more than 3 years negotiated now",
          "fr": "Collaboration pour plus de 3 ans négociée dès maintenant",
          "de": "Bereits jetzt verhandelte Zusammenarbeit über mehr als 3 Jahre",
          "es": "Colaboración de más de 3 años negociada desde ahora"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "collaboration_pour_plus_de_3_ans_negociee_des_maintenant"
      },
      {
        "label": {
          "en": "Ability to easily renew this type of project over time",
          "fr": "Possibilité de renouveler facilement ce type de projets dans le temps",
          "de": "Möglichkeit, diese Art von Projekten im Laufe der Zeit leicht zu erneuern",
          "es": "Posibilidad de renovar fácilmente este tipo de proyectos con el tiempo"
        },
        "visibility": "conditional",
        "conditionGroups": [
          {
            "logic": "any",
            "conditions": [
              {
                "question": "q10",
                "operator": "equals",
                "value": "agence"
              },
              {
                "question": "q10",
                "operator": "equals",
                "value": "un_autre_industriel"
              }
            ]
          }
        ],
        "conditions": [
          {
            "question": "q10",
            "operator": "equals",
            "value": "agence"
          },
          {
            "question": "q10",
            "operator": "equals",
            "value": "un_autre_industriel"
          }
        ],
        "conditionLogic": "any",
        "subType": null,
        "subOptions": [],
        "value": "possibilite_de_renouveler_facilement_ce_type_de_projets_dans_le_temps"
      }
    ],
    "required": false,
    "conditions": [],
    "conditionLogic": "all",
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "question": "q10",
            "operator": "not_equals",
            "value": "aucune_collaboration_prevue_avec_l_externe"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      }
    ],
    "placeholder": "",
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q21",
    "type": "choice",
    "question": {
      "en": "For the design of the logo / name, will you use an external provider?",
      "fr": "Concernant l’élaboration du logo / du nom, allez-vous faire appel à un prestataire ?",
      "de": "Werden Sie für die Entwicklung des Logos/Namens einen Dienstleister beauftragen?",
      "es": "En cuanto a la elaboración del logotipo / del nombre, ¿va a recurrir a un proveedor externo?"
    },
    "options": [
      {
        "label": {
          "en": "Yes",
          "fr": "Oui",
          "de": "Ja",
          "es": "Sí"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "oui"
      },
      {
        "label": {
          "en": "No",
          "fr": "Non",
          "de": "Nein",
          "es": "No"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "non"
      }
    ],
    "required": true,
    "conditions": [
      {
        "question": "projectName__extra_checkbox",
        "operator": "equals",
        "value": "true"
      },
      {
        "question": "q10",
        "operator": "equals",
        "value": "agence"
      }
    ],
    "conditionLogic": "all",
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "question": "projectName__extra_checkbox",
            "operator": "equals",
            "value": "true"
          },
          {
            "question": "q10",
            "operator": "equals",
            "value": "agence"
          }
        ]
      }
    ],
    "placeholder": "",
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q11",
    "type": "multi_choice",
    "question": {
      "en": "Are the project deliverables likely to include any of the following elements?",
      "fr": "Les livrables du projet sont-ils susceptibles de comporter les éléments suivants ?",
      "de": "Könnten die Projektergebnisse folgende Elemente enthalten?",
      "es": "¿Es probable que los entregables del proyecto incluyan los siguientes elementos?"
    },
    "options": [
      {
        "label": {
          "en": "Visuals created specifically for the project",
          "fr": "Visuels créés spécifiquement pour le projet",
          "de": "Speziell für das Projekt erstellte Bildmaterialien",
          "es": "Elementos visuales creados específicamente para el proyecto"
        },
        "visibility": "conditional",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [
          {
            "logic": "all",
            "conditions": [
              {
                "question": "q10",
                "operator": "equals",
                "value": "agence"
              }
            ]
          }
        ],
        "conditions": [
          {
            "question": "q10",
            "operator": "equals",
            "value": "agence"
          }
        ],
        "conditionLogic": "all",
        "value": "visuels_crees_specifiquement_pour_le_projet"
      },
      {
        "label": {
          "en": "Third-party logos (e.g. logos of patient associations, learned societies, ...)",
          "fr": "Logo de tiers (ex : logos d’associations de patients, de sociétés savantes, ...)",
          "de": "Logos Dritter (z. B. Logos von Patientenverbänden, wissenschaftlichen Gesellschaften usw.)",
          "es": "Logotipos de terceros (por ejemplo, logotipos de asociaciones de pacientes, sociedades científicas, etc.)"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "logo_de_tiers_ex_logos_d_associations_de_patients_de_societes_savantes"
      },
      {
        "label": {
          "en": "Third-party images or images from stock photo libraries",
          "fr": "Images de tiers ou issues de banques d’images",
          "de": "Bilder Dritter oder aus Bilddatenbanken",
          "es": "Imágenes de terceros o procedentes de bancos de imágenes"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "images_de_tiers_ou_issues_de_banques_d_images"
      },
      {
        "label": {
          "en": "Excerpts from publications or use of scientific scales",
          "fr": "Extrait de publications ou utilisation d’échelles scientifiques",
          "de": "Auszüge aus Publikationen oder Verwendung wissenschaftlicher Skalen",
          "es": "Extractos de publicaciones o uso de escalas científicas"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "extrait_de_publications_ou_utilisation_d_echelles_scientifiques"
      },
      {
        "label": {
          "en": "Excerpts from websites",
          "fr": "Extrait de sites internet",
          "de": "Auszüge von Websites",
          "es": "Extractos de sitios web"
        },
        "visibility": "always",
        "subType": null,
        "subOptions": [],
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "value": "extrait_de_sites_internet"
      },
      {
        "label": {
          "en": "AI-generated content",
          "fr": "Contenu généré via l’IA",
          "de": "Über KI generierte Inhalte",
          "es": "Contenido generado mediante IA"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "contenu_genere_via_l_ia"
      }
    ],
    "required": false,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      }
    ],
    "conditionLogic": "any",
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      }
    ],
    "placeholder": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "solutionBenefits",
    "type": "long_text",
    "question": {
      "en": "What tangible benefits does your solution bring to your target audience?",
      "fr": "Quels bénéfices tangibles votre solution apporte-t-elle à votre cible ?",
      "de": "Welche konkreten Vorteile bietet Ihre Lösung Ihrer Zielgruppe?",
      "es": "¿Qué beneficios tangibles aporta su solución a su público objetivo?"
    },
    "options": [],
    "required": true,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      }
    ],
    "conditionLogic": "any",
    "guidance": {
      "objective": {
        "en": "Highlight the results achieved rather than the features.",
        "fr": "Mettre en avant les résultats obtenus plutôt que les fonctionnalités.",
        "de": "Die erzielten Ergebnisse hervorheben statt der Funktionen.",
        "es": "Destacar los resultados obtenidos en lugar de las funcionalidades."
      },
      "details": {
        "en": "Each line will be turned into a key benefit in the showcase.",
        "fr": "Chaque ligne sera transformée en bénéfice clé dans la vitrine.",
        "de": "Jede Zeile wird in der Vitrine als zentraler Vorteil dargestellt.",
        "es": "Cada línea se convertirá en un beneficio clave en la vitrina."
      },
      "tips": [
        {
          "en": "Write one sentence per benefit, result-oriented (\"Save 2 hours a week\").",
          "fr": "Rédigez une phrase par bénéfice, orientée résultat (“Gain de 2h par semaine”).",
          "de": "Formulieren Sie pro Vorteil einen ergebnisorientierten Satz („2 Stunden Zeitersparnis pro Woche\").",
          "es": "Redacte una frase por beneficio, orientada a resultados («Ahorro de 2 horas por semana»)."
        },
        {
          "en": "Prioritize the benefits that are most differentiating for your audience.",
          "fr": "Priorisez les bénéfices les plus différenciants pour votre audience.",
          "de": "Priorisieren Sie die für Ihre Zielgruppe unterscheidungskräftigsten Vorteile.",
          "es": "Priorice los beneficios más diferenciadores para su audiencia."
        }
      ]
    },
    "showcase": {
      "sections": [
        "solution"
      ],
      "usage": "Bloc « Différenciation & bénéfices » dans la section solution."
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "placeholder": "",
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    },
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      }
    ]
  },
  {
    "id": "BUDGET",
    "type": "number",
    "question": {
      "en": "What is the estimated cost of the project? (in K€)",
      "fr": "Quel est le coût estimé du projet ? (en K€)",
      "de": "Wie hoch sind die geschätzten Projektkosten? (in K€)",
      "es": "¿Cuál es el coste estimado del proyecto? (en K€)"
    },
    "options": [],
    "required": true,
    "conditions": [],
    "conditionLogic": "all",
    "conditionGroups": [],
    "placeholder": "",
    "numberUnit": {
      "en": "K€",
      "fr": "K€",
      "de": "K€",
      "es": "K€"
    },
    "guidance": {
      "objective": "",
      "details": {
        "en": "Take into account the full budget (development AND deployment / communication) for the project launch",
        "fr": "Prenez en compte l’ensemble du budget (développement ET déploiement / communication) pour le lancement du projet",
        "de": "Berücksichtigen Sie das gesamte Budget (Entwicklung UND Einführung/Kommunikation) für den Projektstart",
        "es": "Tenga en cuenta la totalidad del presupuesto (desarrollo Y despliegue / comunicación) para el lanzamiento del proyecto"
      },
      "tips": [
        {
          "en": "If you don't know the exact amount yet, provide a rough estimate",
          "fr": "Si vous ne savez pas encore le montant précis, indiquez un ordre d’idée",
          "de": "Falls Ihnen der genaue Betrag noch nicht bekannt ist, geben Sie eine Größenordnung an",
          "es": "Si aún no conoce el importe exacto, indique una cifra aproximada"
        },
        {
          "en": "Also consider the costs of any future updates",
          "fr": "Pensez également aux coûts des éventuelles mises à jour",
          "de": "Denken Sie auch an die Kosten für eventuelle Aktualisierungen",
          "es": "Tenga también en cuenta los costes de las posibles actualizaciones"
        }
      ]
    },
    "showcase": {
      "sections": [
        "impact"
      ],
      "usage": "Carte « Budget estimé » dans la section impact."
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "innovationProcess",
    "type": "long_text",
    "question": {
      "en": "What are LFB's objectives behind this project?",
      "fr": "Quels sont les objectifs du LFB derrière ce projet ?",
      "de": "Welche Ziele verfolgt der LFB mit diesem Projekt?",
      "es": "¿Cuáles son los objetivos del LFB detrás de este proyecto?"
    },
    "options": [],
    "required": false,
    "conditions": [],
    "conditionLogic": "all",
    "guidance": {
      "objective": {
        "en": "Identify the business value of the project",
        "fr": "Identifier l’intérêt business du projet",
        "de": "Den geschäftlichen Nutzen des Projekts identifizieren",
        "es": "Identificar el interés de negocio del proyecto"
      },
      "details": {
        "en": "This answer lets you highlight the value the project generates for LFB",
        "fr": "Cette réponse vous permet de mettre en avant la valeur générée du projet pour le LFB",
        "de": "Diese Antwort ermöglicht es Ihnen, den vom Projekt für den LFB generierten Mehrwert hervorzuheben",
        "es": "Esta respuesta le permite destacar el valor que genera el proyecto para el LFB"
      },
      "tips": [
        {
          "en": "Be precise when describing your objective",
          "fr": "Soyez précis dans la description de votre objectif",
          "de": "Beschreiben Sie Ihr Ziel möglichst präzise",
          "es": "Sea preciso al describir su objetivo"
        }
      ]
    },
    "showcase": {
      "sections": [
        "innovation"
      ],
      "usage": "Encart explicatif sur le fonctionnement de l’innovation."
    },
    "placeholder": "",
    "conditionGroups": [],
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "visionStatement",
    "type": "long_text",
    "question": {
      "en": "What indicators will you track to measure the project's impact?",
      "fr": "Quels indicateurs allez-vous suivre pour mesurer l’impact du projet ?",
      "de": "Welche Kennzahlen werden Sie zur Messung der Projektwirkung verfolgen?",
      "es": "¿Qué indicadores va a seguir para medir el impacto del proyecto?"
    },
    "options": [],
    "required": false,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      },
      {
        "question": "q18_copy",
        "operator": "equals",
        "value": "stand"
      }
    ],
    "conditionLogic": "any",
    "guidance": {
      "objective": {
        "en": "Show how you will concretely track value creation.",
        "fr": "Montrer comment vous suivrez concrètement la création de valeur.",
        "de": "Zeigen Sie, wie Sie die Wertschöpfung konkret verfolgen werden.",
        "es": "Mostrar cómo hará el seguimiento concreto de la creación de valor."
      },
      "details": {
        "en": "Each indicator will be displayed as a key point in the impact section to reassure stakeholders.",
        "fr": "Chaque indicateur s’affichera comme un point clé dans la section impact pour rassurer les parties prenantes.",
        "de": "Jede Kennzahl wird im Abschnitt „Wirkung\" als zentraler Punkt angezeigt, um die Stakeholder zu überzeugen.",
        "es": "Cada indicador se mostrará como un punto clave en la sección de impacto para dar confianza a las partes interesadas."
      },
      "tips": [
        {
          "en": "List one metric per line (quantitative or qualitative).",
          "fr": "Listez une métrique par ligne (quantitative ou qualitative).",
          "de": "Listen Sie pro Zeile eine Kennzahl auf (quantitativ oder qualitativ).",
          "es": "Enumere una métrica por línea (cuantitativa o cualitativa)."
        },
        {
          "en": "Specify the target or tracking frequency when relevant.",
          "fr": "Précisez la cible ou la fréquence de suivi lorsque c’est pertinent.",
          "de": "Geben Sie gegebenenfalls den Zielwert oder die Häufigkeit der Nachverfolgung an.",
          "es": "Precise el objetivo o la frecuencia de seguimiento cuando sea pertinente."
        }
      ]
    },
    "showcase": {
      "sections": [
        "impact"
      ],
      "usage": "Citation de conclusion dans la section impact."
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "placeholder": "",
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    },
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          },
          {
            "question": "q18_copy",
            "operator": "equals",
            "value": "stand"
          }
        ]
      }
    ]
  },
  {
    "id": "q23",
    "type": "multi_choice",
    "question": {
      "en": "How will you collect these indicators?",
      "fr": "Comment allez-vous collecter ces indicateurs ?",
      "de": "Wie werden Sie diese Kennzahlen erheben?",
      "es": "¿Cómo va a recopilar estos indicadores?"
    },
    "options": [
      {
        "label": {
          "en": "Satisfaction survey",
          "fr": "Questionnaire de satisfaction",
          "de": "Zufriedenheitsfragebogen",
          "es": "Cuestionario de satisfacción"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "questionnaire_de_satisfaction"
      },
      {
        "label": {
          "en": "Digital trackers (open count, read rate, ...)",
          "fr": "Trackers digitaux (nombre d’ouverture, taux de lecture, ...)",
          "de": "Digitale Tracker (Öffnungsrate, Leserate usw.)",
          "es": "Rastreadores digitales (número de aperturas, tasa de lectura, etc.)"
        },
        "visibility": "always",
        "conditionGroups": [],
        "conditions": [],
        "conditionLogic": "all",
        "subType": null,
        "subOptions": [],
        "value": "trackers_digitaux_nombre_d_ouverture_taux_de_lecture"
      }
    ],
    "required": true,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      }
    ],
    "conditionLogic": "all",
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      }
    ],
    "placeholder": "",
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": true,
      "label": {
        "en": "This data is collected and/or analyzed by an agency",
        "fr": "Ces données sont collectées et / ou analysées par une agence",
        "de": "Diese Daten werden von einer Agentur erhoben und/oder ausgewertet",
        "es": "Estos datos son recopilados y/o analizados por una agencia"
      }
    },
    "otherOption": {
      "enabled": true,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": "",
      "value": "other"
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q26",
    "type": "long_text",
    "question": {
      "en": "Tell me what is changing between the previous project and the new project",
      "fr": "Indiquez-moi ce qui évolue entre le projet historique et le nouveau projet",
      "de": "Geben Sie an, was sich zwischen dem ursprünglichen Projekt und dem neuen Projekt ändert",
      "es": "Indique qué cambia entre el proyecto anterior y el nuevo proyecto"
    },
    "options": [],
    "required": true,
    "conditions": [
      {
        "question": "ProjectType__extra_checkbox",
        "operator": "equals",
        "value": "true"
      }
    ],
    "conditionLogic": "all",
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "question": "ProjectType__extra_checkbox",
            "operator": "equals",
            "value": "true"
          }
        ]
      }
    ],
    "placeholder": {
      "en": "Provide detailed information here...",
      "fr": "Renseignez ici les informations détaillées...",
      "de": "Geben Sie hier die detaillierten Informationen ein...",
      "es": "Indique aquí la información detallada..."
    },
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "launchDate",
    "type": "date",
    "question": {
      "en": "What is the desired launch date?",
      "fr": "Quelle est la date de lancement souhaitée ?",
      "de": "Welches Startdatum ist gewünscht?",
      "es": "¿Cuál es la fecha de lanzamiento deseada?"
    },
    "options": [],
    "required": false,
    "conditions": [],
    "conditionLogic": "all",
    "guidance": {
      "objective": {
        "en": "Align all stakeholders on the launch target.",
        "fr": "Aligner toutes les parties prenantes sur la cible de lancement.",
        "de": "Alle Stakeholder auf den angestrebten Starttermin ausrichten.",
        "es": "Alinear a todas las partes interesadas en torno a la fecha objetivo de lanzamiento."
      },
      "details": {
        "en": "Combined with the compliance submission date, this information helps verify the feasibility of the schedule.",
        "fr": "Associée à la date de soumission compliance, cette information permet de vérifier la faisabilité du planning.",
        "de": "In Verbindung mit dem Compliance-Einreichungsdatum ermöglicht diese Angabe, die Machbarkeit der Planung zu überprüfen.",
        "es": "Junto con la fecha de presentación a compliance, esta información permite verificar la viabilidad del calendario."
      },
      "tips": [
        {
          "en": "Enter the first highlighted date (event, publication, announcement).",
          "fr": "Renseignez la première date de mise en avant (événement, publication, annonce).",
          "de": "Geben Sie das erste Datum der öffentlichen Vorstellung an (Veranstaltung, Veröffentlichung, Ankündigung).",
          "es": "Indique la primera fecha de visibilidad prevista (evento, publicación, anuncio)."
        },
        {
          "en": "If the date is not fixed, provide the most realistic assumption to plan resources.",
          "fr": "Si la date n’est pas figée, indiquez l’hypothèse la plus réaliste pour planifier les ressources.",
          "de": "Steht das Datum noch nicht fest, geben Sie die realistischste Annahme zur Ressourcenplanung an.",
          "es": "Si la fecha no está fijada, indique la hipótesis más realista para planificar los recursos."
        }
      ]
    },
    "showcase": {
      "sections": [
        "timeline"
      ],
      "usage": "Date cible utilisée pour le calcul du runway et du calendrier."
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "placeholder": "",
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    },
    "conditionGroups": []
  },
  {
    "id": "campaignKickoffDate",
    "type": "date",
    "question": {
      "en": "On what date will you submit this project to compliance?",
      "fr": "À quelle date allez-vous soumettre ce projet à la compliance ?",
      "de": "An welchem Datum werden Sie dieses Projekt bei Compliance einreichen?",
      "es": "¿En qué fecha va a presentar este proyecto a compliance?"
    },
    "options": [],
    "required": false,
    "conditions": [],
    "conditionLogic": "all",
    "guidance": {
      "objective": {
        "en": "Set the official milestone for the compliance review.",
        "fr": "Poser le jalon officiel de passage en revue compliance.",
        "de": "Den offiziellen Meilenstein für die Compliance-Prüfung festlegen.",
        "es": "Establecer el hito oficial de revisión por compliance."
      },
      "details": {
        "en": "This date helps anticipate approval exchanges and processing time.",
        "fr": "Cette date permet d’anticiper les échanges de validation et le temps de traitement.",
        "de": "Dieses Datum ermöglicht es, den Validierungsaustausch und die Bearbeitungszeit vorauszuplanen.",
        "es": "Esta fecha permite anticipar los intercambios de validación y el tiempo de tramitación."
      },
      "tips": [
        {
          "en": "Indicate the date the complete file will be sent to compliance.",
          "fr": "Indiquez la date d’envoi du dossier complet à la compliance.",
          "de": "Geben Sie das Datum der Übermittlung der vollständigen Akte an Compliance an.",
          "es": "Indique la fecha de envío del expediente completo a compliance."
        },
        {
          "en": "Update the date as soon as a new slot is confirmed.",
          "fr": "Mettez à jour la date dès qu’un nouveau créneau est confirmé.",
          "de": "Aktualisieren Sie das Datum, sobald ein neuer Termin bestätigt ist.",
          "es": "Actualice la fecha en cuanto se confirme un nuevo plazo."
        }
      ]
    },
    "showcase": {
      "sections": [
        "timeline"
      ],
      "usage": "Point de départ utilisé pour calculer le runway et les prochaines étapes."
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "placeholder": "",
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    },
    "conditionGroups": []
  },
  {
    "id": "roadmapMilestones",
    "type": "milestone_list",
    "question": {
      "en": "Which key milestones would you like to highlight?",
      "fr": "Quels jalons clés souhaitez-vous mettre en avant ?",
      "de": "Welche zentralen Meilensteine möchten Sie hervorheben?",
      "es": "¿Qué hitos clave desea destacar?"
    },
    "options": [],
    "required": false,
    "conditions": [
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      },
      {
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
      }
    ],
    "conditionLogic": "any",
    "guidance": {
      "objective": {
        "en": "Project the major upcoming steps to synchronize stakeholders.",
        "fr": "Projeter les étapes majeures à venir pour synchroniser les parties prenantes.",
        "de": "Die wichtigsten kommenden Etappen darstellen, um die Stakeholder zu synchronisieren.",
        "es": "Proyectar las etapas principales por venir para sincronizar a las partes interesadas."
      },
      "details": {
        "en": "Each milestone will display a date and a description in the showcase's roadmap section.",
        "fr": "Chaque jalon affichera une date et un descriptif dans la section feuille de route de la vitrine.",
        "de": "Jeder Meilenstein zeigt im Roadmap-Abschnitt der Vitrine ein Datum und eine Beschreibung an.",
        "es": "Cada hito mostrará una fecha y una descripción en la sección de hoja de ruta de la vitrina."
      },
      "tips": [
        {
          "en": "Use a YYYY-MM-DD format for dates to make them easier to read.",
          "fr": "Utilisez un format AAAA-MM-JJ pour les dates afin de faciliter la lecture.",
          "de": "Verwenden Sie für Daten das Format JJJJ-MM-TT, um die Lesbarkeit zu erleichtern.",
          "es": "Utilice el formato AAAA-MM-DD para las fechas con el fin de facilitar la lectura."
        },
        {
          "en": "Write actionable descriptions: approval, partial launch, key publication, etc.",
          "fr": "Formulez des descriptions actionnables : validation, lancement partiel, publication clé, etc.",
          "de": "Formulieren Sie handlungsorientierte Beschreibungen: Validierung, Teilstart, wichtige Veröffentlichung usw.",
          "es": "Formule descripciones concretas y accionables: validación, lanzamiento parcial, publicación clave, etc."
        }
      ]
    },
    "showcase": {
      "sections": [
        "timeline"
      ],
      "usage": "Liste de jalons personnalisés dans la section « Les prochains jalons »."
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "placeholder": "",
    "numberUnit": "",
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    },
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      }
    ]
  },
  {
    "id": "q15",
    "type": "long_text",
    "question": {
      "en": "Would you like to share any other key information about this project?",
      "fr": "Souhaitez-vous partager une autre information clef sur ce projet ?",
      "de": "Möchten Sie eine weitere wichtige Information zu diesem Projekt mitteilen?",
      "es": "¿Desea compartir otra información clave sobre este proyecto?"
    },
    "options": [],
    "required": false,
    "conditions": [],
    "conditionLogic": "all",
    "conditionGroups": [],
    "placeholder": {
      "en": "Provide detailed information here...",
      "fr": "Renseignez ici les informations détaillées...",
      "de": "Geben Sie hier die detaillierten Informationen ein...",
      "es": "Indique aquí la información detallada..."
    },
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": []
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "q15_copy",
    "type": "file",
    "question": {
      "en": "Do you have a document you would like to share?",
      "fr": "Avez-vous un document que vous souhaiteriez partager ?",
      "de": "Haben Sie ein Dokument, das Sie teilen möchten?",
      "es": "¿Tiene algún documento que desee compartir?"
    },
    "options": [],
    "required": false,
    "conditions": [],
    "conditionLogic": "all",
    "conditionGroups": [],
    "placeholder": "",
    "numberUnit": "",
    "guidance": {
      "objective": "",
      "details": "",
      "tips": [
        {
          "en": "Remember to give your file a clear, understandable name",
          "fr": "Pensez à donner un nom intelligible à votre fichier",
          "de": "Denken Sie daran, Ihrer Datei einen verständlichen Namen zu geben",
          "es": "Recuerde dar un nombre comprensible a su archivo"
        }
      ]
    },
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "rankingConfig": {
      "title": {
        "en": "Database",
        "fr": "Base de données",
        "de": "Datenbank",
        "es": "Base de datos"
      },
      "criteria": [
        {
          "id": "critere-1",
          "label": {
            "en": "Criterion 1",
            "fr": "Critère 1",
            "de": "Kriterium 1",
            "es": "Criterio 1"
          }
        },
        {
          "id": "critere-2",
          "label": {
            "en": "Criterion 2",
            "fr": "Critère 2",
            "de": "Kriterium 2",
            "es": "Criterio 2"
          }
        },
        {
          "id": "critere-3",
          "label": {
            "en": "Criterion 3",
            "fr": "Critère 3",
            "de": "Kriterium 3",
            "es": "Criterio 3"
          }
        }
      ],
      "entries": []
    }
  },
  {
    "id": "agencyRanking",
    "type": "ranking",
    "question": {
      "en": "If you would like an agency recommendation, rank these criteria by order of importance",
      "fr": "Si vous souhaitez une proposition d’agences, triez ces critères par ordre d’importance",
      "de": "Wenn Sie einen Agenturvorschlag wünschen, ordnen Sie diese Kriterien nach Wichtigkeit",
      "es": "Si desea una propuesta de agencias, ordene estos criterios por orden de importancia"
    },
    "options": [],
    "required": false,
    "conditions": [
      {
        "question": "q10",
        "operator": "equals",
        "value": "agence"
      }
    ],
    "conditionLogic": "all",
    "guidance": {
      "objective": {
        "en": "Quickly identify the agency that best matches your expectations.",
        "fr": "Identifier rapidement l’agence qui correspond le mieux à vos attentes.",
        "de": "Schnell die Agentur identifizieren, die am besten zu Ihren Erwartungen passt.",
        "es": "Identificar rápidamente la agencia que mejor se ajusta a sus expectativas."
      },
      "details": {
        "en": "Order the criteria by importance and set aside those that have no impact for you.",
        "fr": "Ordonnez les critères par importance et mettez de côté ceux qui n’ont aucune incidence pour vous.",
        "de": "Ordnen Sie die Kriterien nach Wichtigkeit und lassen Sie diejenigen außen vor, die für Sie keine Rolle spielen.",
        "es": "Ordene los criterios por importancia y deje de lado aquellos que no tengan incidencia para usted."
      },
      "tips": [
        {
          "en": "Think about the key skills expected (scientific, creativity, international...).",
          "fr": "Pensez aux compétences clés attendues (scientifique, créativité, international...).",
          "de": "Denken Sie an die erwarteten Schlüsselkompetenzen (Wissenschaft, Kreativität, international usw.).",
          "es": "Piense en las competencias clave esperadas (científica, creatividad, internacional...)."
        },
        {
          "en": "Mark irrelevant criteria as \"not important\" to refine the recommendation.",
          "fr": "Marquez les critères non pertinents comme \"sans importance\" pour affiner la recommandation.",
          "de": "Markieren Sie nicht relevante Kriterien als „unwichtig\", um die Empfehlung zu verfeinern.",
          "es": "Marque los criterios no pertinentes como «sin importancia» para afinar la recomendación."
        }
      ]
    },
    "rankingConfig": {
      "title": {
        "en": "Pre-identified providers",
        "fr": "Prestataires pré-identifiés",
        "de": "Bereits identifizierte Dienstleister",
        "es": "Proveedores preidentificados"
      },
      "criteria": [
        {
          "id": "international",
          "label": {
            "en": "International",
            "fr": "International",
            "de": "International",
            "es": "Internacional"
          }
        },
        {
          "id": "scientific",
          "label": {
            "en": "Scientific content",
            "fr": "Contenu scientifique",
            "de": "Wissenschaftlicher Inhalt",
            "es": "Contenido científico"
          }
        },
        {
          "id": "creativity",
          "label": {
            "en": "Creativity",
            "fr": "Créativité",
            "de": "Kreativität",
            "es": "Creatividad"
          }
        },
        {
          "id": "price",
          "label": {
            "en": "Price",
            "fr": "Prix",
            "de": "Preis",
            "es": "Precio"
          }
        },
        {
          "id": "opinion",
          "label": {
            "en": "Overall rating",
            "fr": "Avis global",
            "de": "Gesamtbewertung",
            "es": "Valoración global"
          }
        }
      ],
      "entries": [
        {
          "id": "a-a",
          "name": "A+A",
          "scores": {
            "international": 3,
            "scientific": 3,
            "creativity": 3,
            "price": 3,
            "opinion": 2
          },
          "contact": "antoine.ada@aa.com",
          "website": "https://www.adhealth.com",
          "previousProject": "",
          "opinionText": "+++",
          "notes": "Positionnement premium et solide réseau international."
        },
        {
          "id": "adahealth",
          "name": "ADAHealth",
          "scores": {
            "international": 1,
            "scientific": 2,
            "creativity": 3,
            "price": 3,
            "opinion": 2
          },
          "contact": "robin.benard@adhealth.com",
          "website": "https://www.adhealth.com",
          "previousProject": "",
          "opinionText": "++",
          "notes": "Agence créative avec appétence digitale."
        },
        {
          "id": "anna-purna",
          "name": "Anna Purna",
          "scores": {
            "international": 2,
            "scientific": 2,
            "creativity": 3,
            "price": 3,
            "opinion": 2
          },
          "contact": "l.esperanza@annapurna8000.com",
          "website": "https://www.agence-annapurna.com",
          "previousProject": "",
          "opinionText": "++",
          "notes": "Approche équilibrée entre rigueur médicale et créativité."
        },
        {
          "id": "arsenal-cdm",
          "name": "Arsenal CDM",
          "scores": {
            "international": 1,
            "scientific": 1,
            "creativity": 1,
            "price": 1,
            "opinion": 1
          },
          "contact": "cherry@cdmparis.com",
          "website": "https://www.cdmparis.com",
          "previousProject": "FitCLOT / CLOTTAFACT",
          "opinionText": "++",
          "notes": "Historique sur des projets clotting, bonne connaissance du secteur."
        }
      ]
    },
    "placeholder": "",
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "question": "q10",
            "operator": "equals",
            "value": "agence"
          }
        ]
      }
    ],
    "extraCheckbox": {
      "enabled": false,
      "label": ""
    },
    "otherOption": {
      "enabled": false,
      "label": {
        "en": "Other",
        "fr": "Autre",
        "de": "Andere",
        "es": "Otro"
      },
      "placeholder": ""
    },
    "numberUnit": ""
  }
];
