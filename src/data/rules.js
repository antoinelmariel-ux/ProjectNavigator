export const initialRules = [
  {
    "id": "dpo_personal_data",
    "name": {
      "en": "Personal data collection - DPO",
      "fr": "Collecte de données personnelles - DPO",
      "de": "Erhebung personenbezogener Daten – DSB",
      "es": "Recopilación de datos personales - DPO"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q3",
            "operator": "not_equals",
            "value": "non"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "contains",
            "value": "site_internet"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "contains",
            "value": "applications_mobiles"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "creation_achat_manipulation_de_base_de_donnees"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "enquete_etude_de_marche"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "dpo"
    ],
    "questions": {
      "dpo": [
        {
          "text": {
            "en": "Who are the individuals whose data will be collected?",
            "fr": "Quelles sont les personnes dont les données vont être collectées ?",
            "de": "Von welchen Personen werden Daten erhoben?",
            "es": "¿Quiénes son las personas cuyos datos se van a recopilar?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What types of data do you want to collect, and why?",
            "fr": "Quels types de données souhaitez-vous collecter, et pourquoi ?",
            "de": "Welche Datenarten möchten Sie erheben, und warum?",
            "es": "¿Qué tipos de datos desea recopilar, y por qué?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Is it possible to limit the personal data collected while still meeting your objective?",
            "fr": "Est-il possible de limiter les données personnelles collectées tout en répondant à votre objectif ?",
            "de": "Ist es möglich, die erhobenen personenbezogenen Daten zu begrenzen und dennoch Ihr Ziel zu erreichen?",
            "es": "¿Es posible limitar los datos personales recopilados sin dejar de cumplir su objetivo?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Where will the data be hosted? Outside the European Union?",
            "fr": "Où seront hébergées les données ? Hors Union Européenne ?",
            "de": "Wo werden die Daten gehostet? Außerhalb der Europäischen Union?",
            "es": "¿Dónde se alojarán los datos? ¿Fuera de la Unión Europea?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "How long do you plan to retain this data?",
            "fr": "Combien de temps prévoyez-vous de conserver ces données ?",
            "de": "Wie lange planen Sie, diese Daten aufzubewahren?",
            "es": "¿Durante cuánto tiempo prevé conservar estos datos?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [
      {
        "description": {
          "en": "Project involving personal data",
          "fr": "Projet impliquant des données personnelles",
          "de": "Projekt mit personenbezogenen Daten",
          "es": "Proyecto que implica datos personales"
        },
        "level": "medium",
        "mitigation": {
          "en": "Any personal data collection must define a clear purpose, a minimal data set and a retention period before going live.",
          "fr": "Toute collecte de données personnelles doit définir une finalité claire, un jeu de données minimal et une durée de conservation avant tout lancement.",
          "de": "Jede Erhebung personenbezogener Daten muss vor dem Start einen klaren Zweck, einen minimalen Datensatz und eine Aufbewahrungsfrist festlegen.",
          "es": "Toda recopilación de datos personales debe definir una finalidad clara, un conjunto de datos mínimo y un plazo de conservación antes de su puesta en marcha."
        },
        "priority": "standard",
        "teamId": "dpo",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": []
  },
  {
    "id": "dpo_health_data",
    "name": {
      "en": "Health data - DPO",
      "fr": "Données de santé - DPO",
      "de": "Gesundheitsdaten – DSB",
      "es": "Datos de salud - DPO"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q3",
            "operator": "equals",
            "value": "oui_donnees_de_sante"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "dpo"
    ],
    "questions": {
      "dpo": [
        {
          "text": {
            "en": "Do you know whether the data host is authorized to store health data?",
            "fr": "Savez-vous si l’hébergeur des données est habilité à stocker des données de santé ?",
            "de": "Wissen Sie, ob der Datenhoster für die Speicherung von Gesundheitsdaten zugelassen ist?",
            "es": "¿Sabe si el proveedor de alojamiento de los datos está habilitado para almacenar datos de salud?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [
      {
        "description": {
          "en": "Project involving health data",
          "fr": "Projet contenant des données de santé",
          "de": "Projekt mit Gesundheitsdaten",
          "es": "Proyecto que contiene datos de salud"
        },
        "level": "high",
        "mitigation": {
          "en": "Projects involving health data require an in-depth analysis of the rules applicable by country, hosting conditions, international transfers and enhanced security requirements, and may be impossible to implement for legal reasons or may involve significant delays.",
          "fr": "Les projets avec des données de santé nécessitent une analyse approfondie des règles applicables selon les pays, des conditions d’hébergement, des transferts internationaux et des exigences de sécurité renforcées, et peuvent être impossibles à mettre en œuvre pour des raisons légales ou avec des délais significatifs.",
          "de": "Projekte mit Gesundheitsdaten erfordern eine eingehende Prüfung der länderspezifisch geltenden Vorschriften, der Hosting-Bedingungen, internationaler Datentransfers sowie verstärkter Sicherheitsanforderungen und können aus rechtlichen Gründen unmöglich umzusetzen sein oder erhebliche Fristen mit sich bringen.",
          "es": "Los proyectos con datos de salud requieren un análisis exhaustivo de las normas aplicables según el país, de las condiciones de alojamiento, de las transferencias internacionales y de los requisitos de seguridad reforzados, y pueden resultar imposibles de llevar a cabo por razones legales o implicar plazos significativos."
        },
        "priority": "critical",
        "teamId": "dpo",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": []
  },
  {
    "id": "dpo_sensitive_data",
    "name": {
      "en": "Sensitive data - DPO",
      "fr": "Données sensibles - DPO",
      "de": "Sensible Daten – DSB",
      "es": "Datos sensibles - DPO"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q3",
            "operator": "equals",
            "value": "oui_autres_donnees_sensibles_ex_donnees_genetiques_biometriques_ethnique_orientation_sexuelle"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "dpo"
    ],
    "questions": {
      "dpo": [
        {
          "text": {
            "en": "Why do you need to collect this sensitive data? Is it truly essential?",
            "fr": "Pourquoi avez-vous besoin de collecter ces données sensibles ? Sont-elles réellement indispensables ?",
            "de": "Warum müssen Sie diese sensiblen Daten erheben? Sind sie wirklich unverzichtbar?",
            "es": "¿Por qué necesita recopilar estos datos sensibles? ¿Son realmente indispensables?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [
      {
        "description": {
          "en": "Project involving special-category data",
          "fr": "Projet impliquant des données sensibles",
          "de": "Projekt mit sensiblen Daten",
          "es": "Proyecto que implica datos sensibles"
        },
        "level": "high",
        "mitigation": {
          "en": "Special-category data (genetic, biometric, ethnic origin, sexual orientation…) requires a documented legal basis and a proportionate collection, or the project may need to be redesigned.",
          "fr": "Les données sensibles (génétiques, biométriques, origine ethnique, orientation sexuelle…) nécessitent une base légale documentée et une collecte proportionnée, sous peine de devoir reconcevoir le projet.",
          "de": "Sensible Daten (genetisch, biometrisch, ethnische Herkunft, sexuelle Orientierung…) erfordern eine dokumentierte Rechtsgrundlage und eine verhältnismäßige Erhebung, andernfalls muss das Projekt überarbeitet werden.",
          "es": "Los datos sensibles (genéticos, biométricos, origen étnico, orientación sexual…) requieren una base legal documentada y una recopilación proporcionada, o el proyecto deberá rediseñarse."
        },
        "priority": "critical",
        "teamId": "dpo",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": []
  },
  {
    "id": "achats_external_provider",
    "name": {
      "en": "External provider - Procurement",
      "fr": "Recours à un prestataire externe - Achats",
      "de": "Externer Dienstleister – Einkauf",
      "es": "Proveedor externo - Compras"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "agence"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "expert_ou_consultant_independant_france"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "expert_ou_consultant_independant_hors_france"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "un_autre_partenaire_du_secteur"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "achats"
    ],
    "questions": {
      "achats": [
        {
          "text": {
            "en": "Has this provider already worked with us? Do you have a cost estimate?",
            "fr": "Ce prestataire a-t-il déjà travaillé avec nous ? Disposez-vous d’une estimation de coût ?",
            "de": "Hat dieser Dienstleister bereits mit uns zusammengearbeitet? Liegt Ihnen eine Kostenschätzung vor?",
            "es": "¿Este proveedor ya ha trabajado con nosotros? ¿Dispone de una estimación de costes?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [],
    "teamRoutingRules": []
  },
  {
    "id": "com_press_release",
    "name": {
      "en": "Press release - External Communications",
      "fr": "Communiqué de presse - Com Externe",
      "de": "Pressemitteilung – Externe Kommunikation",
      "es": "Comunicado de prensa - Comunicación Externa"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q14",
            "operator": "contains",
            "value": "communique_de_presse"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "communication_externe"
    ],
    "questions": {
      "communication_externe": [
        {
          "text": {
            "en": "What is the key message of this press release, and who is the intended audience?",
            "fr": "Quel est le message clé de ce communiqué, et à qui s’adresse-t-il ?",
            "de": "Was ist die Kernbotschaft dieser Pressemitteilung, und an wen richtet sie sich?",
            "es": "¿Cuál es el mensaje clave de este comunicado y a quién va dirigido?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [],
    "teamRoutingRules": []
  },
  {
    "id": "com_social_media",
    "name": {
      "en": "Social media - External Communications",
      "fr": "Réseaux sociaux - Com externe",
      "de": "Soziale Medien – Externe Kommunikation",
      "es": "Redes sociales - Comunicación Externa"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q14",
            "operator": "contains",
            "value": "reseaux_sociaux_du_entreprise_demo"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "communication_externe"
    ],
    "questions": {
      "communication_externe": [
        {
          "text": {
            "en": "For the use of our social media, please follow our social media usage policy.",
            "fr": "Pour l’utilisation de nos réseaux sociaux, merci de suivre notre charte d’utilisation des réseaux sociaux.",
            "de": "Für die Nutzung unserer sozialen Medien folgen Sie bitte unserer Richtlinie zur Nutzung sozialer Medien.",
            "es": "Para el uso de nuestras redes sociales, siga nuestra carta de uso de las redes sociales."
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [],
    "teamRoutingRules": []
  },
  {
    "id": "com_corporate_website",
    "name": {
      "en": "Corporate website - External Communications",
      "fr": "Site corporate - Com externe",
      "de": "Unternehmenswebsite – Externe Kommunikation",
      "es": "Sitio web corporativo - Comunicación Externa"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q14",
            "operator": "contains",
            "value": "site_internet_corporate_du_entreprise_demo"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "communication_externe"
    ],
    "questions": {
      "communication_externe": [
        {
          "text": {
            "en": "Which section of the corporate website is concerned, and who owns the content?",
            "fr": "Quelle section du site corporate est concernée, et qui est propriétaire du contenu ?",
            "de": "Welcher Bereich der Unternehmenswebsite ist betroffen, und wem gehört der Inhalt?",
            "es": "¿Qué sección del sitio web corporativo está afectada y quién es el propietario del contenido?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [],
    "teamRoutingRules": []
  },
  {
    "id": "com_subsidiary_website",
    "name": {
      "en": "Subsidiary website - External Communications",
      "fr": "Site filiale - Com externe",
      "de": "Tochtergesellschaft-Website – Externe Kommunikation",
      "es": "Sitio web de filial - Comunicación Externa"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q14",
            "operator": "contains",
            "value": "site_internet_des_filiales_du_entreprise_demo"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "communication_externe"
    ],
    "questions": {
      "communication_externe": [
        {
          "text": {
            "en": "Which subsidiary is concerned, and has its local team validated the content?",
            "fr": "Quelle filiale est concernée, et son équipe locale a-t-elle validé le contenu ?",
            "de": "Welche Tochtergesellschaft ist betroffen, und hat ihr lokales Team den Inhalt freigegeben?",
            "es": "¿Qué filial está afectada y su equipo local ha validado el contenido?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [],
    "teamRoutingRules": []
  },
  {
    "id": "com_sensitive_topics",
    "name": {
      "en": "Sensitive topics - External Communications",
      "fr": "Sujets sensibles - Com Externe",
      "de": "Sensible Themen – Externe Kommunikation",
      "es": "Temas sensibles - Comunicación Externa"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q24",
            "operator": "contains",
            "value": "partager_des_informations_sur_des_sujets_sensibles_ex_defaillance_industrielle_tension_d_approvisionnement_augmentation_de_capital"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "communication_externe"
    ],
    "questions": {
      "communication_externe": [
        {
          "text": {
            "en": "What is the objective of communicating on this sensitive topic?",
            "fr": "Quel est l’objectif de la communication sur ce sujet sensible ?",
            "de": "Was ist das Ziel der Kommunikation zu diesem sensiblen Thema?",
            "es": "¿Cuál es el objetivo de la comunicación sobre este tema sensible?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [
      {
        "description": {
          "en": "Communication on a sensitive topic",
          "fr": "Communication sur un sujet sensible",
          "de": "Kommunikation zu einem sensiblen Thema",
          "es": "Comunicación sobre un tema sensible"
        },
        "level": "medium",
        "mitigation": {
          "en": "Sensitive topics can carry communication risks: a poor choice of wording can lead to misinterpretation. A review by External Communications before publication is required.",
          "fr": "Les sujets sensibles peuvent être à risque en termes de communication : un mauvais choix de terme peut amener à des interprétations erronées. Une relecture par la communication externe avant diffusion est requise.",
          "de": "Sensible Themen können kommunikativ risikobehaftet sein: Eine unglückliche Wortwahl kann zu Fehlinterpretationen führen. Eine Prüfung durch die externe Kommunikation vor der Veröffentlichung ist erforderlich.",
          "es": "Los temas sensibles pueden entrañar riesgo en términos de comunicación: una elección inadecuada de los términos puede dar lugar a interpretaciones erróneas. Es necesaria una revisión por parte de Comunicación Externa antes de su publicación."
        },
        "priority": "standard",
        "teamId": "communication_externe",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": []
  },
  {
    "id": "pi_new_name_logo",
    "name": {
      "en": "New name / logo - IP",
      "fr": "Nom / Logo - PI",
      "de": "Neuer Name / Logo – Geistiges Eigentum",
      "es": "Nombre / Logotipo nuevo - PI"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "projectName__extra_checkbox",
            "operator": "equals",
            "value": "true"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "pi"
    ],
    "questions": {
      "pi": [
        {
          "text": {
            "en": "Do you already have a name or a logo in mind? Has it been checked for availability?",
            "fr": "Avez-vous déjà un nom ou un logo en tête ? A-t-il été vérifié en termes de disponibilité ?",
            "de": "Haben Sie bereits einen Namen oder ein Logo im Kopf? Wurde dessen Verfügbarkeit geprüft?",
            "es": "¿Ya tiene en mente un nombre o un logotipo? ¿Se ha comprobado su disponibilidad?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [
      {
        "description": {
          "en": "Use of an unprotected name or logo",
          "fr": "Utilisation d’un nom ou logo non protégé",
          "de": "Verwendung eines ungeschützten Namens oder Logos",
          "es": "Uso de un nombre o logotipo no protegido"
        },
        "level": "medium",
        "mitigation": {
          "en": "Contact us before any external communication to run an availability check and, if needed, register the name or logo.",
          "fr": "Contactez-nous avant toute communication externe pour réaliser une recherche de disponibilité et, si besoin, déposer le nom ou le logo.",
          "de": "Kontaktieren Sie uns vor jeder externen Kommunikation, um eine Verfügbarkeitsprüfung durchzuführen und den Namen oder das Logo bei Bedarf anzumelden.",
          "es": "Contáctenos antes de cualquier comunicación externa para realizar una búsqueda de disponibilidad y, si es necesario, registrar el nombre o el logotipo."
        },
        "priority": "standard",
        "teamId": "pi",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": []
  },
  {
    "id": "pi_third_party_visuals",
    "name": {
      "en": "Third-party visuals - IP",
      "fr": "Visuels de tiers - PI",
      "de": "Bildmaterial Dritter – Geistiges Eigentum",
      "es": "Elementos visuales de terceros - PI"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q11",
            "operator": "contains",
            "value": "logo_de_tiers_ex_logos_de_partenaires_ou_d_organismes"
          },
          {
            "type": "question",
            "question": "q11",
            "operator": "contains",
            "value": "images_de_tiers_ou_issues_de_banques_d_images"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "pi"
    ],
    "questions": {
      "pi": [
        {
          "text": {
            "en": "Do you have written permission to use this third-party logo or image, or is it from a licensed image bank?",
            "fr": "Disposez-vous d’une autorisation écrite pour utiliser ce logo ou cette image de tiers, ou provient-elle d’une banque d’images sous licence ?",
            "de": "Verfügen Sie über eine schriftliche Genehmigung zur Nutzung dieses Logos oder Bildes eines Dritten, oder stammt es aus einer lizenzierten Bilddatenbank?",
            "es": "¿Dispone de una autorización por escrito para usar este logotipo o imagen de terceros, o proviene de un banco de imágenes con licencia?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [
      {
        "description": {
          "en": "Use of third-party visual assets",
          "fr": "Utilisation de visuels appartenant à des tiers",
          "de": "Verwendung von Bildmaterial Dritter",
          "es": "Uso de elementos visuales de terceros"
        },
        "level": "medium",
        "mitigation": {
          "en": "Any third-party logo or image requires a written authorization or a valid license before use. If created by an external provider, a copyright assignment agreement is also required.",
          "fr": "Tout logo ou image de tiers nécessite une autorisation écrite ou une licence valide avant utilisation. S’il a été créé par un prestataire externe, un contrat de cession de droits est également requis.",
          "de": "Jedes Logo oder Bild eines Dritten erfordert vor der Nutzung eine schriftliche Genehmigung oder eine gültige Lizenz. Wurde es von einem externen Dienstleister erstellt, ist zusätzlich ein Urheberrechtsübertragungsvertrag erforderlich.",
          "es": "Cualquier logotipo o imagen de terceros requiere una autorización por escrito o una licencia válida antes de su uso. Si ha sido creado por un proveedor externo, también se requiere un contrato de cesión de derechos."
        },
        "priority": "standard",
        "teamId": "pi",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": []
  },
  {
    "id": "pi_existing_content_reuse",
    "name": {
      "en": "Reuse of existing content - IP",
      "fr": "Réutilisation de contenus existants - PI",
      "de": "Wiederverwendung bestehender Inhalte – Geistiges Eigentum",
      "es": "Reutilización de contenido existente - PI"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q11",
            "operator": "contains",
            "value": "extrait_de_publications_ou_d_etudes_existantes"
          },
          {
            "type": "question",
            "question": "q11",
            "operator": "contains",
            "value": "extrait_de_sites_internet"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "pi"
    ],
    "questions": {
      "pi": [
        {
          "text": {
            "en": "Which publication, study or website is this excerpt taken from, and is it correctly credited?",
            "fr": "De quelle publication, étude ou site internet cet extrait est-il tiré, et est-il correctement crédité ?",
            "de": "Aus welcher Veröffentlichung, Studie oder Website stammt dieser Auszug, und ist er korrekt zitiert?",
            "es": "¿De qué publicación, estudio o sitio web procede este extracto, y está correctamente acreditado?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [],
    "teamRoutingRules": []
  },
  {
    "id": "pi_ai_generated_content",
    "name": {
      "en": "AI-generated content - IP",
      "fr": "Contenu généré par IA - PI",
      "de": "KI-generierte Inhalte – Geistiges Eigentum",
      "es": "Contenido generado por IA - PI"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q11",
            "operator": "contains",
            "value": "contenu_genere_via_l_ia"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "pi"
    ],
    "questions": {
      "pi": [
        {
          "text": {
            "en": "Which AI tool was used, and has the output been checked for third-party rights (text, image, style)?",
            "fr": "Quel outil d’IA a été utilisé, et le résultat a-t-il été vérifié au regard des droits de tiers (texte, image, style) ?",
            "de": "Welches KI-Tool wurde verwendet, und wurde das Ergebnis auf Rechte Dritter geprüft (Text, Bild, Stil)?",
            "es": "¿Qué herramienta de IA se utilizó, y se ha comprobado el resultado en relación con los derechos de terceros (texto, imagen, estilo)?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [
      {
        "description": {
          "en": "Use of AI-generated content",
          "fr": "Utilisation de contenu généré par IA",
          "de": "Verwendung von KI-generierten Inhalten",
          "es": "Uso de contenido generado por IA"
        },
        "level": "medium",
        "mitigation": {
          "en": "The ownership and originality of AI-generated content is not always guaranteed. Keep the prompts used and check the tool’s terms of use before any external publication.",
          "fr": "La titularité des droits et l’originalité d’un contenu généré par IA ne sont pas toujours garanties. Conservez les prompts utilisés et vérifiez les conditions d’utilisation de l’outil avant toute diffusion externe.",
          "de": "Die Rechteinhaberschaft und Originalität von KI-generierten Inhalten sind nicht immer gewährleistet. Bewahren Sie die verwendeten Prompts auf und prüfen Sie die Nutzungsbedingungen des Tools vor jeder externen Veröffentlichung.",
          "es": "La titularidad y la originalidad del contenido generado por IA no siempre están garantizadas. Conserve las instrucciones utilizadas y compruebe las condiciones de uso de la herramienta antes de cualquier publicación externa."
        },
        "priority": "standard",
        "teamId": "pi",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": []
  },
  {
    "id": "controle_pub_promotional_review",
    "name": {
      "en": "Promotional content review - Ad Control",
      "fr": "Contrôle des contenus promotionnels - Contrôle pub",
      "de": "Prüfung von Werbeinhalten – Werbekontrolle",
      "es": "Revisión de contenido promocional - Control publicitario"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q11",
            "operator": "contains",
            "value": "visuels_crees_specifiquement_pour_le_projet"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "agence"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "controle_pub"
    ],
    "questions": {
      "controle_pub": [
        {
          "text": {
            "en": "Please share the creative brief so it can be reviewed before production starts.",
            "fr": "Merci de partager le brief créatif afin qu’il puisse être revu avant le lancement de la production.",
            "de": "Bitte teilen Sie das kreative Briefing, damit es vor Produktionsbeginn geprüft werden kann.",
            "es": "Comparta el brief creativo para que pueda revisarse antes de iniciar la producción."
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [],
    "teamRoutingRules": []
  },
  {
    "id": "ethics_third_party_engagement",
    "name": {
      "en": "Independent expert engagement - Ethics & Compliance",
      "fr": "Contrats avec des experts indépendants - E&C",
      "de": "Beauftragung unabhängiger Experten – Ethik & Compliance",
      "es": "Contratación de expertos independientes - Ética y Cumplimiento"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "expert_ou_consultant_independant_france"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "expert_ou_consultant_independant_hors_france"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "un_autre_partenaire_du_secteur"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "ethique_compliance"
    ],
    "questions": {
      "ethique_compliance": [
        {
          "text": {
            "en": "What compensation is planned for this expert, and is it proportionate to the actual work performed?",
            "fr": "Quelle rémunération est prévue pour cet expert, et est-elle proportionnée au travail réellement effectué ?",
            "de": "Welche Vergütung ist für diesen Experten vorgesehen, und ist sie im Verhältnis zur tatsächlich erbrachten Arbeit angemessen?",
            "es": "¿Qué remuneración está prevista para este experto, y es proporcional al trabajo realmente realizado?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [
      {
        "description": {
          "en": "Engagement of an independent expert",
          "fr": "Recours à un expert indépendant",
          "de": "Beauftragung eines unabhängigen Experten",
          "es": "Contratación de un experto independiente"
        },
        "level": "medium",
        "mitigation": {
          "en": "Any engagement with an independent expert must be backed by a written agreement, a fair-market-value compensation and a documented business rationale, to prevent any conflict-of-interest or anti-corruption risk.",
          "fr": "Tout recours à un expert indépendant doit s’appuyer sur un contrat écrit, une rémunération conforme au marché et un rationnel documenté, afin de prévenir tout risque de conflit d’intérêts ou de corruption.",
          "de": "Jede Beauftragung eines unabhängigen Experten muss auf einem schriftlichen Vertrag, einer marktüblichen Vergütung und einer dokumentierten Begründung beruhen, um Interessenkonflikte oder Korruptionsrisiken zu vermeiden.",
          "es": "Toda contratación de un experto independiente debe basarse en un contrato escrito, una remuneración acorde al mercado y una justificación documentada, para prevenir cualquier riesgo de conflicto de intereses o corrupción."
        },
        "priority": "standard",
        "teamId": "ethique_compliance",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": []
  },
  {
    "id": "ethics_sponsoring_partnership",
    "name": {
      "en": "Sponsoring / partnership - Ethics & Compliance",
      "fr": "Parrainage / partenariat - E&C",
      "de": "Sponsoring / Partnerschaft – Ethik & Compliance",
      "es": "Patrocinio / colaboración - Ética y Cumplimiento"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_d_un_tiers_soutenu_par_le_entreprise_demo"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "ethique_compliance"
    ],
    "questions": {
      "ethique_compliance": [
        {
          "text": {
            "en": "What are the benefits in return for us? How is this valuable for the company?",
            "fr": "Quelles sont les contreparties pour nous ? En quoi cela a-t-il de la valeur pour l’entreprise ?",
            "de": "Welche Gegenleistungen erhalten wir? Worin besteht der Mehrwert für das Unternehmen?",
            "es": "¿Cuáles son las contrapartidas para nosotros? ¿Qué valor aporta esto a la empresa?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [
      {
        "description": {
          "en": "Sponsoring or partnership commitment",
          "fr": "Engagement de parrainage ou de partenariat",
          "de": "Sponsoring- oder Partnerschaftsverpflichtung",
          "es": "Compromiso de patrocinio o colaboración"
        },
        "level": "medium",
        "mitigation": {
          "en": "A sponsoring or partnership commitment must have a clear public-interest or business rationale, a proportionate budget and no expectation of preferential treatment in return.",
          "fr": "Un engagement de parrainage ou de partenariat doit reposer sur un rationnel d’intérêt général ou économique clair, un budget proportionné et sans attente de traitement préférentiel en contrepartie.",
          "de": "Ein Sponsoring- oder Partnerschaftsengagement muss auf einer klaren gemeinnützigen oder wirtschaftlichen Begründung, einem angemessenen Budget beruhen und darf keine Erwartung einer Vorzugsbehandlung im Gegenzug beinhalten.",
          "es": "Un compromiso de patrocinio o colaboración debe basarse en una justificación de interés general o económico clara, un presupuesto proporcionado y sin expectativa de trato preferencial a cambio."
        },
        "priority": "standard",
        "teamId": "ethique_compliance",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": []
  },
  {
    "id": "ethics_donation",
    "name": {
      "en": "Donation / grant - Ethics & Compliance",
      "fr": "Don / bourse - E&C",
      "de": "Spende / Stipendium – Ethik & Compliance",
      "es": "Donación / beca - Ética y Cumplimiento"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "don_bourse_appel_a_projets"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "ethique_compliance"
    ],
    "questions": {
      "ethique_compliance": [
        {
          "text": {
            "en": "What is the rationale for this donation? (general interest, scientific, institutional?)",
            "fr": "Quel est le rationnel de ce don ? (intérêt général, scientifique, institutionnel ?)",
            "de": "Was ist die Begründung für diese Spende? (allgemeines Interesse, wissenschaftlich, institutionell?)",
            "es": "¿Cuál es la justificación de esta donación? (¿interés general, científico, institucional?)"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [],
    "teamRoutingRules": []
  },
  {
    "id": "ethics_ai_governance",
    "name": {
      "en": "AI usage - Ethics & Compliance",
      "fr": "Utilisation de l’IA - E&C",
      "de": "KI-Nutzung – Ethik & Compliance",
      "es": "Uso de la IA - Ética y Cumplimiento"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q24",
            "operator": "contains",
            "value": "utiliser_l_ia"
          },
          {
            "type": "question",
            "question": "q11",
            "operator": "contains",
            "value": "contenu_genere_via_l_ia"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "contains",
            "value": "outil_d_ia_ex_bot_ia"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "ethique_compliance"
    ],
    "questions": {
      "ethique_compliance": [
        {
          "text": {
            "en": "What type of AI is used for the project: an online tool, AI installed on our information system, or a custom development?",
            "fr": "Quel type d’IA est utilisé pour le projet : un outil en ligne, une IA installée sur notre système d’information, ou un développement sur mesure ?",
            "de": "Welche Art von KI wird für das Projekt verwendet: ein Online-Tool, eine im Informationssystem installierte KI oder eine Individualentwicklung?",
            "es": "¿Qué tipo de IA se utiliza en el proyecto: una herramienta en línea, una IA instalada en nuestro sistema de información, o un desarrollo a medida?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [
      {
        "description": {
          "en": "Use of artificial intelligence",
          "fr": "Recours à l’intelligence artificielle",
          "de": "Einsatz von künstlicher Intelligenz",
          "es": "Uso de inteligencia artificial"
        },
        "level": "medium",
        "mitigation": {
          "en": "Any use of AI must be assessed for data protection, reliability of the output and disclosure to end users, before it is relied upon or shown externally.",
          "fr": "Tout recours à l’IA doit être évalué au regard de la protection des données, de la fiabilité du résultat produit et de sa mention aux utilisateurs finaux, avant d’être exploité ou diffusé à l’externe.",
          "de": "Jeder Einsatz von KI muss hinsichtlich Datenschutz, Zuverlässigkeit des Ergebnisses und Offenlegung gegenüber Endnutzern geprüft werden, bevor er genutzt oder extern gezeigt wird.",
          "es": "Todo uso de la IA debe evaluarse en cuanto a la protección de datos, la fiabilidad del resultado producido y su indicación a los usuarios finales, antes de utilizarse o difundirse externamente."
        },
        "priority": "standard",
        "teamId": "ethique_compliance",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": []
  },
  {
    "id": "legal_new_tool_contract",
    "name": {
      "en": "New digital tool - Legal / IT",
      "fr": "Nouvel outil numérique - Juridique IT",
      "de": "Neues digitales Tool – Recht/IT",
      "es": "Nueva herramienta digital - Jurídico/TI"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_entreprise_demo"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_entreprise_demo_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q22",
            "operator": "equals",
            "value": "outil_interne_uniquement"
          },
          {
            "type": "question",
            "question": "q22",
            "operator": "equals",
            "value": "outil_ouvert_aux_utilisateurs_externes"
          },
          {
            "type": "question",
            "question": "q22",
            "operator": "equals",
            "value": "outil_de_decision_automatisee"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "juridique_france"
    ],
    "questions": {
      "juridique_france": [
        {
          "text": {
            "en": "Would this tool be hosted on our existing infrastructure, and what rights do we have over it?",
            "fr": "Cet outil serait-il hébergé sur notre infrastructure existante, et quels droits avons-nous sur celui-ci ?",
            "de": "Würde dieses Tool auf unserer bestehenden Infrastruktur gehostet, und welche Rechte haben wir daran?",
            "es": "¿Se alojaría esta herramienta en nuestra infraestructura existente, y qué derechos tenemos sobre ella?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [],
    "teamRoutingRules": []
  },
  {
    "id": "legal_international_deployment",
    "name": {
      "en": "International deployment - Legal",
      "fr": "Déploiement international - Juridique",
      "de": "Internationale Bereitstellung – Recht",
      "es": "Despliegue internacional - Jurídico"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q27",
            "operator": "contains",
            "value": "pays_lies_a_des_filiales_hors_france"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "expert_ou_consultant_independant_hors_france"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "juridique_international"
    ],
    "questions": {
      "juridique_international": [
        {
          "text": {
            "en": "Which countries are concerned, and has the local entity been informed?",
            "fr": "Quels pays sont concernés, et l’entité locale a-t-elle été informée ?",
            "de": "Welche Länder sind betroffen, und wurde die lokale Einheit informiert?",
            "es": "¿Qué países están afectados, y se ha informado a la entidad local?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": [],
    "teamRoutingRules": []
  }
];
