export const initialRules = [
  {
    "id": "rule5",
    "name": {
      "en": "Data collection - DPO",
      "fr": "Collectes de données - DPO",
      "de": "Datenerhebung – DPO",
      "es": "Recopilación de datos - DPO"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q3",
            "operator": "not_equals",
            "value": "presence_de_champs_libres_dans_ma_solution"
          },
          {
            "type": "question",
            "question": "q3",
            "operator": "not_equals",
            "value": "non"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "enquete_etude_de_marche"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "creation_achat_manipulation_de_base_de_donnees"
          },
          {
            "type": "question",
            "question": "q23",
            "operator": "equals",
            "value": "questionnaire_de_satisfaction"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
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
            "en": "What types of data do you want to collect? And why?",
            "fr": "Quels types de données souhaitez-vous collecter ? et pourquoi ?",
            "de": "Welche Datenarten möchten Sie erheben? Und warum?",
            "es": "¿Qué tipos de datos desea recopilar? ¿Y por qué?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "How will you use the data?",
            "fr": "Comment allez-vous utiliser les données ?",
            "de": "Wie werden Sie die Daten verwenden?",
            "es": "¿Cómo va a utilizar los datos?"
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
            "en": "Where is the data hosted? Outside the European Union?",
            "fr": "Où sont hébergées les données ? hors Union Européenne ?",
            "de": "Wo werden die Daten gehostet? Außerhalb der Europäischen Union?",
            "es": "¿Dónde están alojados los datos? ¿Fuera de la Unión Europea?"
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
    "id": "rule6",
    "name": {
      "en": "Digital project - DPO",
      "fr": "Projet digital - DPO",
      "de": "Digitales Projekt – DPO",
      "es": "Proyecto digital - DPO"
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
            "value": "projet_du_lfb"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "site_internet"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "webconference"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "applications_mobiles"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "Bot IA"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "elearning"
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
            "en": "Does access to the digital interface require a login?",
            "fr": "L’accès à l’interface digitale nécessite-t-il une connexion ?",
            "de": "Erfordert der Zugang zur digitalen Oberfläche eine Anmeldung?",
            "es": "¿El acceso a la interfaz digital requiere iniciar sesión?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": []
  },
  {
    "id": "rule6_copy",
    "name": {
      "en": "Email marketing - DPO",
      "fr": "Emailing - DPO",
      "de": "E-Mail-Versand – DPO",
      "es": "Email marketing - DPO"
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
            "value": "projet_du_lfb"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "campagne_d_emailing"
          },
          {
            "type": "question",
            "question": "q14",
            "operator": "equals",
            "value": "emailing"
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
            "en": "How have you obtained, or will you obtain, the email addresses for the email campaign?",
            "fr": "Comment avez-vous ou allez-vous obtenir les adresses email pour l’emailing ?",
            "de": "Wie haben Sie die E-Mail-Adressen für den E-Mail-Versand erhalten bzw. wie werden Sie sie erhalten?",
            "es": "¿Cómo ha obtenido o va a obtener las direcciones de correo electrónico para el email marketing?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Have you obtained opt-in consent?",
            "fr": "Avez-vous obtenu un opt-in ?",
            "de": "Haben Sie eine Opt-in-Einwilligung eingeholt?",
            "es": "¿Ha obtenido un opt-in (consentimiento expreso)?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": []
  },
  {
    "id": "rule6_copy_copy",
    "name": {
      "en": "Tracking - DPO",
      "fr": "Tracking - DPO",
      "de": "Tracking – DPO",
      "es": "Tracking - DPO"
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
            "value": "projet_du_lfb"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q23",
            "operator": "equals",
            "value": "trackers_digitaux_nombre_d_ouverture_taux_de_lecture"
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
            "en": "Can you describe the tracking KPIs?",
            "fr": "Pouvez-vous décrire les KPIs de suivi ?",
            "de": "Können Sie die Tracking-KPIs beschreiben?",
            "es": "¿Puede describir los KPI de seguimiento?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": []
  },
  {
    "id": "rule6_copy_copy_copy",
    "name": {
      "en": "Clinical case presentation - DPO",
      "fr": "Présentation cas clinique - DPO",
      "de": "Präsentation eines klinischen Falls – DPO",
      "es": "Presentación de caso clínico - DPO"
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
            "value": "projet_du_lfb"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "presentation_de_cas_cliniques"
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
            "en": "What patient data is shared in the clinical case?",
            "fr": "Quelles sont les données sur le patient partagées dans le cas clinique ?",
            "de": "Welche Patientendaten werden im klinischen Fall weitergegeben?",
            "es": "¿Qué datos del paciente se comparten en el caso clínico?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": []
  },
  {
    "id": "rule7",
    "name": {
      "en": "Use of a service provider - DPO",
      "fr": "Recours prestataire - DPO",
      "de": "Einsatz eines Dienstleisters – DPO",
      "es": "Recurso a un proveedor externo - DPO"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "agence"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q23__extra_checkbox",
            "operator": "equals",
            "value": "true"
          },
          {
            "type": "question",
            "question": "q3",
            "operator": "not_equals",
            "value": "non"
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
            "en": "Will the service provider access / use / collect personal data? (including by sending reports, KPIs, etc.). If so, which data?",
            "fr": "Le prestataire va-t-il avoir accès / utiliser / collecter des données personnelles ? (y compris en transmettant des rapports, des KPIs, ...). Si oui, lesquelles ?",
            "de": "Wird der Dienstleister Zugriff auf personenbezogene Daten haben, diese nutzen oder erheben? (auch durch die Übermittlung von Berichten, KPIs usw.) Wenn ja, welche?",
            "es": "¿Va el proveedor externo a tener acceso a datos personales, utilizarlos o recopilarlos? (incluido mediante el envío de informes, KPI, etc.). En caso afirmativo, ¿cuáles?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Where is the service provider located? EU or rest of the world?",
            "fr": "Où est situé le prestataire ? UE ou reste du monde ?",
            "de": "Wo befindet sich der Dienstleister? EU oder Rest der Welt?",
            "es": "¿Dónde está situado el proveedor externo? ¿UE o resto del mundo?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Does the service provider itself use other providers/subcontractors who might have access to the data?",
            "fr": "Le prestataire a-t-il lui-même recours à d’autres prestataires/sous-traitants qui seraient amenés à avoir accès aux données ?",
            "de": "Setzt der Dienstleister selbst weitere Dienstleister/Unterauftragsverarbeiter ein, die Zugriff auf die Daten erhalten könnten?",
            "es": "¿Recurre el propio proveedor externo a otros proveedores/subcontratistas que puedan llegar a tener acceso a los datos?"
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
    "id": "rule8",
    "name": {
      "en": "Health data - DPO",
      "fr": "Données de santé - DPO",
      "de": "Gesundheitsdaten – DPO",
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
            "value": "projet_du_lfb"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
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
          "en": "Projects involving health data require an in-depth analysis of the rules applicable by country, hosting conditions, international transfers, and enhanced security requirements, and may be impossible to implement for legal reasons or may involve significant delays.",
          "fr": "Les projets avec des données de santé nécessitent une analyse approfondie des règles applicables selon les pays, des conditions d’hébergement, des transferts internationaux et des exigences de sécurité renforcées et peuvent être impossibles à mettre en œuvre pour des raisons légales ou avec des délais significatifs.",
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
    "id": "rule8_copy",
    "name": {
      "en": "Sensitive data - DPO",
      "fr": "Données sensibles - DPO",
      "de": "Sensible Daten – DPO",
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
            "value": "projet_du_lfb"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
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
          "en": "Project involving sensitive data",
          "fr": "Projet contenant des données sensibles",
          "de": "Projekt mit sensiblen Daten",
          "es": "Proyecto que contiene datos sensibles"
        },
        "level": "high",
        "mitigation": {
          "en": "Projects involving sensitive data pose a high risk to the rights and freedoms of the individuals concerned and require an in-depth upfront analysis to assess their lawfulness, proportionality, and appropriate security measures, and may be impossible to implement for legal reasons or may involve significant delays.",
          "fr": "Les projets avec des données sensibles présentent un risque élevé pour les droits et libertés des personnes concernées et nécessitent une analyse approfondie en amont afin d’évaluer leur licéité, leur proportionnalité et les mesures de sécurité adaptées, et peuvent être impossibles à mettre en œuvre pour des raisons légales ou avec des délais significatifs.",
          "de": "Projekte mit sensiblen Daten stellen ein hohes Risiko für die Rechte und Freiheiten der betroffenen Personen dar und erfordern im Vorfeld eine eingehende Prüfung ihrer Rechtmäßigkeit, Verhältnismäßigkeit und der geeigneten Sicherheitsmaßnahmen; sie können aus rechtlichen Gründen unmöglich umzusetzen sein oder erhebliche Fristen mit sich bringen.",
          "es": "Los proyectos con datos sensibles presentan un riesgo elevado para los derechos y libertades de las personas afectadas y requieren un análisis exhaustivo previo para evaluar su licitud, su proporcionalidad y las medidas de seguridad adecuadas, y pueden resultar imposibles de llevar a cabo por razones legales o implicar plazos significativos."
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
    "id": "rule9",
    "name": {
      "en": "Intellectual service provision - Purchasing",
      "fr": "Prestation de service intellectuelle - Achat",
      "de": "Geistige Dienstleistung – Einkauf",
      "es": "Prestación de servicios intelectuales - Compras"
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
            "value": "projet_du_lfb"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "agence"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "BUDGET",
            "operator": "gte",
            "value": "5"
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
            "en": "If the planned budget with the agency supporting you exceeds €5K, contact Procurement for support with the selection process. For amounts over €20K, please use&nbsp;<a href=\"https://apps.powerapps.com/play/e/f54022e7-8f36-43e6-9d8e-d7d4a4cde7bf/a/f79d5a77-e547-463d-ab2e-673040672dad?tenantId=ec5406f0-238e-4d3f-b91c-73e26a5831e9&amp;hint=41f32323-9b10-4eba-81db-9e8b3efc1be4&amp;sourcetime=1758035097208&amp;source=portal\" target=\"_blank\" rel=\"noopener noreferrer\">EasyConsult</a>",
            "fr": "Si le budget envisagé avec l’agence qui vous accompagnera dépasse 5K, contactez les achats pour vous faire accompagner dans le processus de sélection. Pour les montants supérieurs à 20K, merci d’utiliser&nbsp;<a href=\"https://apps.powerapps.com/play/e/f54022e7-8f36-43e6-9d8e-d7d4a4cde7bf/a/f79d5a77-e547-463d-ab2e-673040672dad?tenantId=ec5406f0-238e-4d3f-b91c-73e26a5831e9&amp;hint=41f32323-9b10-4eba-81db-9e8b3efc1be4&amp;sourcetime=1758035097208&amp;source=portal\" target=\"_blank\" rel=\"noopener noreferrer\">EasyConsult</a>",
            "de": "Wenn das mit der begleitenden Agentur geplante Budget 5K übersteigt, wenden Sie sich an den Einkauf, um beim Auswahlprozess unterstützt zu werden. Bei Beträgen über 20K nutzen Sie bitte&nbsp;<a href=\"https://apps.powerapps.com/play/e/f54022e7-8f36-43e6-9d8e-d7d4a4cde7bf/a/f79d5a77-e547-463d-ab2e-673040672dad?tenantId=ec5406f0-238e-4d3f-b91c-73e26a5831e9&amp;hint=41f32323-9b10-4eba-81db-9e8b3efc1be4&amp;sourcetime=1758035097208&amp;source=portal\" target=\"_blank\" rel=\"noopener noreferrer\">EasyConsult</a>",
            "es": "Si el presupuesto previsto con la agencia que le acompañará supera los 5K, contacte con el departamento de Compras para que le asista en el proceso de selección. Para importes superiores a 20K, utilice&nbsp;<a href=\"https://apps.powerapps.com/play/e/f54022e7-8f36-43e6-9d8e-d7d4a4cde7bf/a/f79d5a77-e547-463d-ab2e-673040672dad?tenantId=ec5406f0-238e-4d3f-b91c-73e26a5831e9&amp;hint=41f32323-9b10-4eba-81db-9e8b3efc1be4&amp;sourcetime=1758035097208&amp;source=portal\" target=\"_blank\" rel=\"noopener noreferrer\">EasyConsult</a>"
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
    "id": "rule10",
    "name": {
      "en": "Press release - External Communications",
      "fr": "Communiqué de presse - Com Externe",
      "de": "Pressemitteilung – Externe Kommunikation",
      "es": "Comunicado de prensa - Comunicación Externa"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q14",
        "operator": "equals",
        "value": "communique_de_presse"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q14",
            "operator": "equals",
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
            "en": "For press releases, contact the External Communications department, who will help you with the drafting",
            "fr": "Pour les communiqués de presse, rapprochez-vous du service Com Externe qui vous accompagnera dans la rédaction",
            "de": "Wenden Sie sich für Pressemitteilungen an die Abteilung Externe Kommunikation, die Sie bei der Erstellung unterstützt",
            "es": "Para los comunicados de prensa, póngase en contacto con el departamento de Comunicación Externa, que le acompañará en la redacción"
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
    "id": "rule11",
    "name": {
      "en": "Social media - External Communications",
      "fr": "Réseaux sociaux - Com externe",
      "de": "Soziale Medien – Externe Kommunikation",
      "es": "Redes sociales - Comunicación Externa"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "campagne_reseaux_sociaux"
      },
      {
        "type": "question",
        "question": "q14",
        "operator": "equals",
        "value": "reseaux_sociaux_du_lfb"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "campagne_reseaux_sociaux"
          },
          {
            "type": "question",
            "question": "q14",
            "operator": "equals",
            "value": "reseaux_sociaux_du_lfb"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "communication_externe"
    ],
    "questions": {
      "communication_externe": [
        {
          "text": {
            "en": "For the use of LFB's social media, please follow&nbsp;<a href=\"https://lfb1.sharepoint.com/sites/lfb-daily-life/fr-FR/toolbox/LFB%20-%20Documents%20Process/Forms/Ordre%20alpha.aspx?id=%2Fsites%2Flfb%2Ddaily%2Dlife%2Ffr%2DFR%2Ftoolbox%2FLFB%20%2D%20Documents%20Process%2FCommunication%20Aff%5FPubliques%2FCO07%5FFR%20Charte%20utilisation%20reseaux%20sociaux%2Epdf&amp;parent=%2Fsites%2Flfb%2Ddaily%2Dlife%2Ffr%2DFR%2Ftoolbox%2FLFB%20%2D%20Documents%20Process%2FCommunication%20Aff%5FPubliques\" target=\"_blank\" rel=\"noopener noreferrer\">our social media usage policy</a>",
            "fr": "Pour l’utilisation des réseaux sociaux du LFB, merci de suivre&nbsp;<a href=\"https://lfb1.sharepoint.com/sites/lfb-daily-life/fr-FR/toolbox/LFB%20-%20Documents%20Process/Forms/Ordre%20alpha.aspx?id=%2Fsites%2Flfb%2Ddaily%2Dlife%2Ffr%2DFR%2Ftoolbox%2FLFB%20%2D%20Documents%20Process%2FCommunication%20Aff%5FPubliques%2FCO07%5FFR%20Charte%20utilisation%20reseaux%20sociaux%2Epdf&amp;parent=%2Fsites%2Flfb%2Ddaily%2Dlife%2Ffr%2DFR%2Ftoolbox%2FLFB%20%2D%20Documents%20Process%2FCommunication%20Aff%5FPubliques\" target=\"_blank\" rel=\"noopener noreferrer\">notre charte d’utilisation des réseaux sociaux</a>",
            "de": "Für die Nutzung der sozialen Medien des LFB folgen Sie bitte&nbsp;<a href=\"https://lfb1.sharepoint.com/sites/lfb-daily-life/fr-FR/toolbox/LFB%20-%20Documents%20Process/Forms/Ordre%20alpha.aspx?id=%2Fsites%2Flfb%2Ddaily%2Dlife%2Ffr%2DFR%2Ftoolbox%2FLFB%20%2D%20Documents%20Process%2FCommunication%20Aff%5FPubliques%2FCO07%5FFR%20Charte%20utilisation%20reseaux%20sociaux%2Epdf&amp;parent=%2Fsites%2Flfb%2Ddaily%2Dlife%2Ffr%2DFR%2Ftoolbox%2FLFB%20%2D%20Documents%20Process%2FCommunication%20Aff%5FPubliques\" target=\"_blank\" rel=\"noopener noreferrer\">unserer Richtlinie zur Nutzung sozialer Medien</a>",
            "es": "Para el uso de las redes sociales del LFB, siga&nbsp;<a href=\"https://lfb1.sharepoint.com/sites/lfb-daily-life/fr-FR/toolbox/LFB%20-%20Documents%20Process/Forms/Ordre%20alpha.aspx?id=%2Fsites%2Flfb%2Ddaily%2Dlife%2Ffr%2DFR%2Ftoolbox%2FLFB%20%2D%20Documents%20Process%2FCommunication%20Aff%5FPubliques%2FCO07%5FFR%20Charte%20utilisation%20reseaux%20sociaux%2Epdf&amp;parent=%2Fsites%2Flfb%2Ddaily%2Dlife%2Ffr%2DFR%2Ftoolbox%2FLFB%20%2D%20Documents%20Process%2FCommunication%20Aff%5FPubliques\" target=\"_blank\" rel=\"noopener noreferrer\">nuestra carta de uso de las redes sociales</a>"
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
    "id": "rule11_copy2",
    "name": {
      "en": "Corporate website - External Communications",
      "fr": "Site corporate - Com externe",
      "de": "Unternehmenswebsite – Externe Kommunikation",
      "es": "Sitio corporativo - Comunicación Externa"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q14",
        "operator": "equals",
        "value": "site_internet_corporate_du_lfb"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q14",
            "operator": "equals",
            "value": "site_internet_corporate_du_lfb"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "communication_externe"
    ],
    "questions": {
      "communication_externe": [
        {
          "text": {
            "en": "Contact External Communications, who are responsible for publishing on our corporate website",
            "fr": "Rapprochez-vous de la communication externe qui est en charge de la publication sur notre site internet corporate",
            "de": "Wenden Sie sich an die externe Kommunikation, die für die Veröffentlichung auf unserer Unternehmenswebsite zuständig ist",
            "es": "Póngase en contacto con Comunicación Externa, responsable de la publicación en nuestro sitio web corporativo"
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
    "id": "rule11_copy2_copy",
    "name": {
      "en": "Subsidiary website - External Communications",
      "fr": "Site filiale - Com externe",
      "de": "Website der Tochtergesellschaft – Externe Kommunikation",
      "es": "Sitio de filial - Comunicación Externa"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q14",
        "operator": "equals",
        "value": "site_internet_des_filiales_du_lfb"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q14",
            "operator": "equals",
            "value": "site_internet_des_filiales_du_lfb"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "communication_externe"
    ],
    "questions": {
      "communication_externe": [
        {
          "text": {
            "en": "Contact the subsidiaries responsible for publishing on their websites",
            "fr": "Rapprochez-vous des filiales qui ont la responsabilité de la publication sur leurs sites internet",
            "de": "Wenden Sie sich an die Tochtergesellschaften, die für die Veröffentlichung auf ihren Websites verantwortlich sind",
            "es": "Póngase en contacto con las filiales, responsables de la publicación en sus propios sitios web"
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
    "id": "rule11_copy",
    "name": {
      "en": "Media - External Communications",
      "fr": "Média - Com externe",
      "de": "Medien – Externe Kommunikation",
      "es": "Medios - Comunicación Externa"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q11",
        "operator": "equals",
        "value": "images_de_tiers_ou_issues_de_banques_d_images"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q11",
            "operator": "equals",
            "value": "images_de_tiers_ou_issues_de_banques_d_images"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "communication_externe"
    ],
    "questions": {
      "communication_externe": [
        {
          "text": {
            "en": "As a reminder, we have an image library available for free use:&nbsp;<a href=\"https://lfb1.sharepoint.com/sites/lfb-daily-life/fr-FR/toolbox/sitepages/Medias-and-Communication-ressources.aspx#Default=%7B%22r%22%3A%5B%7B%22k%22%3Afalse%2C%22m%22%3Anull%2C%22n%22%3A%22RefinableString104%22%2C%22o%22%3A%22or%22%2C%22t%22%3A%5B%22%C7%82%C7%8250617469656e7473%22%5D%7D%5D%7D\" target=\"_blank\" rel=\"noopener noreferrer\">Media library</a>",
            "fr": "Nous vous rappelons que nous disposons d’une banque d’images pouvant être utilisée librement :&nbsp;<a href=\"https://lfb1.sharepoint.com/sites/lfb-daily-life/fr-FR/toolbox/sitepages/Medias-and-Communication-ressources.aspx#Default=%7B%22r%22%3A%5B%7B%22k%22%3Afalse%2C%22m%22%3Anull%2C%22n%22%3A%22RefinableString104%22%2C%22o%22%3A%22or%22%2C%22t%22%3A%5B%22%C7%82%C7%8250617469656e7473%22%5D%7D%5D%7D\" target=\"_blank\" rel=\"noopener noreferrer\">Médiathèque</a>",
            "de": "Wir erinnern Sie daran, dass wir über eine Bilddatenbank verfügen, die frei genutzt werden kann:&nbsp;<a href=\"https://lfb1.sharepoint.com/sites/lfb-daily-life/fr-FR/toolbox/sitepages/Medias-and-Communication-ressources.aspx#Default=%7B%22r%22%3A%5B%7B%22k%22%3Afalse%2C%22m%22%3Anull%2C%22n%22%3A%22RefinableString104%22%2C%22o%22%3A%22or%22%2C%22t%22%3A%5B%22%C7%82%C7%8250617469656e7473%22%5D%7D%5D%7D\" target=\"_blank\" rel=\"noopener noreferrer\">Mediathek</a>",
            "es": "Le recordamos que disponemos de un banco de imágenes de uso libre:&nbsp;<a href=\"https://lfb1.sharepoint.com/sites/lfb-daily-life/fr-FR/toolbox/sitepages/Medias-and-Communication-ressources.aspx#Default=%7B%22r%22%3A%5B%7B%22k%22%3Afalse%2C%22m%22%3Anull%2C%22n%22%3A%22RefinableString104%22%2C%22o%22%3A%22or%22%2C%22t%22%3A%5B%22%C7%82%C7%8250617469656e7473%22%5D%7D%5D%7D\" target=\"_blank\" rel=\"noopener noreferrer\">Mediateca</a>"
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
    "id": "rule12",
    "name": {
      "en": "Graphic charter - External Communications",
      "fr": "Charte graphique - Com Externe",
      "de": "Grafik-Richtlinie – Externe Kommunikation",
      "es": "Carta gráfica - Comunicación Externa"
    },
    "conditions": [
      {
        "type": "question",
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_du_lfb"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_du_lfb"
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
            "en": "Make sure to follow and share our graphic charter and logos with any external providers. These materials are available here:&nbsp;<a href=\"https://lfb1.sharepoint.com/sites/lfb-daily-life/fr-FR/toolbox/SitePages/Communication-tools.aspx#environnement-graphique%E2%80%8B%E2%80%8B%E2%80%8B%E2%80%8B\" target=\"_blank\" rel=\"noopener noreferrer\">Corporate graphic charter</a>",
            "fr": "Pensez à bien respecter et partager aux éventuels prestataires notre charte graphique et nos logos. Ces éléments sont disponibles ici :&nbsp;<a href=\"https://lfb1.sharepoint.com/sites/lfb-daily-life/fr-FR/toolbox/SitePages/Communication-tools.aspx#environnement-graphique%E2%80%8B%E2%80%8B%E2%80%8B%E2%80%8B\" target=\"_blank\" rel=\"noopener noreferrer\">Charte graphique corporate</a>",
            "de": "Achten Sie darauf, unsere Grafik-Richtlinie und unsere Logos einzuhalten und sie gegebenenfalls an Dienstleister weiterzugeben. Diese Elemente finden Sie hier:&nbsp;<a href=\"https://lfb1.sharepoint.com/sites/lfb-daily-life/fr-FR/toolbox/SitePages/Communication-tools.aspx#environnement-graphique%E2%80%8B%E2%80%8B%E2%80%8B%E2%80%8B\" target=\"_blank\" rel=\"noopener noreferrer\">Unternehmensweite Grafik-Richtlinie</a>",
            "es": "Recuerde respetar y compartir con los posibles proveedores externos nuestra carta gráfica y nuestros logotipos. Estos elementos están disponibles aquí:&nbsp;<a href=\"https://lfb1.sharepoint.com/sites/lfb-daily-life/fr-FR/toolbox/SitePages/Communication-tools.aspx#environnement-graphique%E2%80%8B%E2%80%8B%E2%80%8B%E2%80%8B\" target=\"_blank\" rel=\"noopener noreferrer\">Carta gráfica corporativa</a>"
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
    "id": "rule12_copy",
    "name": {
      "en": "Sensitive topics - External Communications",
      "fr": "Sujets sensibles - Com Externe",
      "de": "Sensible Themen – Externe Kommunikation",
      "es": "Temas sensibles - Comunicación Externa"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q24",
        "operator": "equals",
        "value": "partager_des_informations_liees_a_l_historique_du_lfb_avant_1994"
      },
      {
        "type": "question",
        "question": "q24",
        "operator": "equals",
        "value": "partager_des_informations_sur_des_sujets_sensibles_ex_defaillance_industrielle_tension_d_approvisionnement_augmentation_de_capital"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q24",
            "operator": "equals",
            "value": "partager_des_informations_liees_a_l_historique_du_lfb_avant_1994"
          },
          {
            "type": "question",
            "question": "q24",
            "operator": "equals",
            "value": "partager_des_informations_sur_des_sujets_sensibles_ex_defaillance_industrielle_tension_d_approvisionnement_augmentation_de_capital"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "communication_externe"
    ],
    "questions": {
      "communication_externe": [
        {
          "text": {
            "en": "What is the objective of communicating on sensitive topics concerning LFB?",
            "fr": "Quel est l’objectif de la communication sur des sujets sensibles concernant le LFB ?",
            "de": "Was ist das Ziel der Kommunikation zu sensiblen Themen im Zusammenhang mit dem LFB?",
            "es": "¿Cuál es el objetivo de la comunicación sobre temas sensibles relativos al LFB?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "For these communications, are you starting from institutional communication materials that have already been approved?",
            "fr": "Sur ces communications, partez-vous des éléments de communication institutionnels déjà validés ?",
            "de": "Basieren diese Kommunikationsmaßnahmen auf bereits validierten institutionellen Kommunikationselementen?",
            "es": "Para estas comunicaciones, ¿parte usted de elementos de comunicación institucional ya validados?"
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
          "en": "Sensitivity of the topics",
          "fr": "Sensibilité des sujets",
          "de": "Sensibilität der Themen",
          "es": "Sensibilidad de los temas"
        },
        "level": "medium",
        "mitigation": {
          "en": "Some topics concerning LFB can carry communication risks: a poor choice of wording can lead to misinterpretation. A review for approval by External Communications is therefore required",
          "fr": "Certains sujets concernant le LFB peuvent être à risque en termes de communication : Un mauvais choix de terme peut amener à des interprétations erronées. Une relecture pour validation par la communication externe est donc requise",
          "de": "Bestimmte Themen im Zusammenhang mit dem LFB können kommunikativ risikobehaftet sein: Eine unglückliche Wortwahl kann zu Fehlinterpretationen führen. Eine Prüfung durch die externe Kommunikation zur Validierung ist daher erforderlich",
          "es": "Algunos temas relativos al LFB pueden entrañar riesgo en términos de comunicación: una elección inadecuada de los términos puede dar lugar a interpretaciones erróneas. Por ello, es necesaria una revisión de validación por parte de Comunicación Externa"
        },
        "priority": "elevated",
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
    "id": "rule13",
    "name": {
      "en": "Name / Logo - IP",
      "fr": "Nom / Logo - PI",
      "de": "Name / Logo – Geistiges Eigentum",
      "es": "Nombre / Logotipo - PI"
    },
    "conditions": [
      {
        "type": "question",
        "question": "projectName__extra_checkbox",
        "operator": "equals",
        "value": "true"
      }
    ],
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
            "en": "Contact us to review freedom-to-operate on the proposed name and/or logo. Based on this, we will jointly define the protection strategy (e.g. a possible trademark filing)",
            "fr": "Contactez-nous pour étudier la liberté d’exploitation sur le nom et/ou logo pressenti. Sur cette base, nous définirons ensemble la stratégie de protection (dépôt éventuel de marque par exemple)",
            "de": "Kontaktieren Sie uns, um die Nutzungsfreiheit des vorgesehenen Namens und/oder Logos zu prüfen. Auf dieser Grundlage legen wir gemeinsam die Schutzstrategie fest (z. B. eine mögliche Markenanmeldung)",
            "es": "Contáctenos para estudiar la libertad de explotación sobre el nombre y/o el logotipo previsto. A partir de ahí, definiremos juntos la estrategia de protección (por ejemplo, un eventual registro de marca)"
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
    "id": "rule13_copy",
    "name": {
      "en": "Rights assignment Name / Logo - IP",
      "fr": "Cession de droit Nom / Logo - PI",
      "de": "Rechteübertragung Name / Logo – Geistiges Eigentum",
      "es": "Cesión de derechos Nombre / Logotipo - PI"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q21",
        "operator": "equals",
        "value": "oui"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q21",
            "operator": "equals",
            "value": "oui"
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
            "en": "Make sure to have the agency sign the following agreement once the logo / name is received: XXXXXXX (French version); XXXXX (English version)",
            "fr": "Pensez à bien faire signer à l’agence - une fois le logo / nom reçu - le contrat suivant : XXXXXXX (version française) ; XXXXX (version anglaise)",
            "de": "Denken Sie daran, die Agentur nach Erhalt des Logos/Namens den folgenden Vertrag unterzeichnen zu lassen: XXXXXXX (französische Fassung); XXXXX (englische Fassung)",
            "es": "Recuerde hacer firmar a la agencia, una vez recibidos el logotipo / nombre, el siguiente contrato: XXXXXXX (versión francesa); XXXXX (versión inglesa)"
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
    "id": "rule13_copy_copy",
    "name": {
      "en": "Created visuals - IP",
      "fr": "Visuels créés - PI",
      "de": "Erstellte Bildmaterialien – Geistiges Eigentum",
      "es": "Elementos visuales creados - PI"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q11",
        "operator": "equals",
        "value": "visuels_crees_specifiquement_pour_le_projet"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q11",
            "operator": "equals",
            "value": "visuels_crees_specifiquement_pour_le_projet"
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
            "en": "Contact us to carry out a freedom-to-operate review of the visuals created for the project.&nbsp;<br>If this visual was created by someone outside LFB, they should sign a copyright assignment agreement: XXXXXX (French version); XXXX (English version)",
            "fr": "Contactez-nous pour établir une étude de liberté d’exploitation des visuels créés pour le projet.&nbsp;<br>Si ce visuel a été créé par une personne externe au LFB, il conviendra de lui faire signer un contrat de cession de droit d’auteur : XXXXXX (version française) ; XXXX (version anglaise)",
            "de": "Kontaktieren Sie uns, um eine Prüfung der Nutzungsfreiheit der für das Projekt erstellten Bildmaterialien durchzuführen.&nbsp;<br>Wurde dieses Bildmaterial von einer projektexternen Person außerhalb des LFB erstellt, muss diese einen Urheberrechtsübertragungsvertrag unterzeichnen: XXXXXX (französische Fassung); XXXX (englische Fassung)",
            "es": "Contáctenos para realizar un estudio de libertad de explotación de los elementos visuales creados para el proyecto.&nbsp;<br>Si este elemento visual ha sido creado por una persona externa al LFB, será necesario hacerle firmar un contrato de cesión de derechos de autor: XXXXXX (versión francesa); XXXX (versión inglesa)"
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
    "id": "rule13_copy_copy_copy",
    "name": {
      "en": "Confidential information - IP",
      "fr": "Informations confidentielles - PI",
      "de": "Vertrauliche Informationen – Geistiges Eigentum",
      "es": "Información confidencial - PI"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q24",
        "operator": "equals",
        "value": "partager_des_informations_sur_nos_procedes_de_fabrication_nos_installations_ou_des_elements_techniques"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q24",
            "operator": "equals",
            "value": "partager_des_informations_sur_nos_procedes_de_fabrication_nos_installations_ou_des_elements_techniques"
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
            "en": "When sharing information about our manufacturing processes, facilities, or technical details, follow these recommendations, given the sensitive nature of this information",
            "fr": "Sur le partage d’informations sur nos procédés de fabrication, installations ou éléments techniques, suivez ces recommandations - du fait du caractère sensible de ces éléments",
            "de": "Befolgen Sie beim Teilen von Informationen zu unseren Herstellungsverfahren, Anlagen oder technischen Elementen aufgrund der Sensibilität dieser Angaben die folgenden Empfehlungen",
            "es": "En cuanto a compartir información sobre nuestros procesos de fabricación, instalaciones o elementos técnicos, siga estas recomendaciones, dado el carácter sensible de estos elementos"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "If an intern is working on the project, make sure to maintain the confidentiality of internship/work-study reports if they share information about our manufacturing processes, facilities, or technical details",
            "fr": "Si un stagiaire travaille sur le projet, assurez-vous de maintenir la confidentialité des rapports de stage / d’alternance s’il partage des informations sur nos procédés de fabrication, installations ou éléments techniques",
            "de": "Arbeitet ein Praktikant an dem Projekt, stellen Sie sicher, dass die Vertraulichkeit der Praktikums-/Ausbildungsberichte gewahrt bleibt, wenn darin Informationen zu unseren Herstellungsverfahren, Anlagen oder technischen Elementen weitergegeben werden",
            "es": "Si un becario trabaja en el proyecto, asegúrese de mantener la confidencialidad de los informes de prácticas / de formación dual si comparte información sobre nuestros procesos de fabricación, instalaciones o elementos técnicos"
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
    "id": "rule13_copy_copy_copy_copy2",
    "name": {
      "en": "Publication - IP",
      "fr": "Publication - PI",
      "de": "Publikation – Geistiges Eigentum",
      "es": "Publicación - PI"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "redaction_d_abstract_de_poster_articles_scientifiques"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "redaction_d_abstract_de_poster_articles_scientifiques"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "pi"
    ],
    "questions": {
      "pi": []
    },
    "risks": [
      {
        "description": {
          "en": "CELLCOS",
          "fr": "CELLCOS",
          "de": "CELLCOS",
          "es": "CELLCOS"
        },
        "level": "medium",
        "mitigation": {
          "en": "Projects involving publications must go through CELLCOS review",
          "fr": "Les projets prévoyant des publications nécessitent un passage en CELLCOS",
          "de": "Projekte mit geplanten Publikationen müssen dem CELLCOS-Gremium vorgelegt werden",
          "es": "Los proyectos que prevean publicaciones deben pasar por el CELLCOS"
        },
        "priority": "elevated",
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
    "id": "rule13_copy_copy_copy_copy",
    "name": {
      "en": "Third-party logo - IP",
      "fr": "Logo tiers - PI",
      "de": "Logo Dritter – Geistiges Eigentum",
      "es": "Logotipo de terceros - PI"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q24",
        "operator": "equals",
        "value": "partager_des_informations_sur_nos_procedes_de_fabrication_nos_installations_ou_des_elements_techniques"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q24",
            "operator": "equals",
            "value": "partager_des_informations_sur_nos_procedes_de_fabrication_nos_installations_ou_des_elements_techniques"
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
            "en": "For the use of third-party logos, be sure to obtain their written authorization. Regarding patient associations, here is the list of associations that allow us to communicate about our support for them for the current year: XXXXX",
            "fr": "Pour l’utilisation de logo de tiers, pensez à obtenir leur autorisation écrite. Concernant les associations de patients, voici la liste des associations nous permettant de communiquer sur notre soutien auprès d’elles pour l’année en cours : XXXXX",
            "de": "Holen Sie für die Verwendung von Logos Dritter deren schriftliche Genehmigung ein. Für Patientenverbände finden Sie hier die Liste der Verbände, bei denen wir für das laufende Jahr über unsere Unterstützung kommunizieren dürfen: XXXXX",
            "es": "Para el uso de logotipos de terceros, recuerde obtener su autorización por escrito. En cuanto a las asociaciones de pacientes, esta es la lista de asociaciones que nos permiten comunicar nuestro apoyo hacia ellas durante el año en curso: XXXXX"
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
    "id": "rule13_copy_copy_copy_copy_copy_copy2",
    "name": {
      "en": "Image library - IP",
      "fr": "Banque images - PI",
      "de": "Bilddatenbank – Geistiges Eigentum",
      "es": "Banco de imágenes - PI"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q11",
        "operator": "equals",
        "value": "images_de_tiers_ou_issues_de_banques_d_images"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q11",
            "operator": "equals",
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
            "en": "Check that the images used in the project are royalty-free for the intended use (contract and/or legal notices). You can rely on the IP team for this check",
            "fr": "Vérifiez que les images utilisées dans le cadre du projet sont bien libres de droits pour l’utilisation envisagée (contrat et/ou mentions légales). Vous pouvez vous appuyer sur le pôle PI pour cette vérification",
            "de": "Prüfen Sie, ob die im Rahmen des Projekts verwendeten Bilder für die vorgesehene Nutzung tatsächlich rechtefrei sind (Vertrag und/oder rechtliche Hinweise). Für diese Prüfung können Sie sich an den Bereich Geistiges Eigentum wenden",
            "es": "Compruebe que las imágenes utilizadas en el marco del proyecto están efectivamente libres de derechos para el uso previsto (contrato y/o aviso legal). Puede apoyarse en el departamento de PI para esta verificación"
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
    "id": "rule13_copy_copy_copy_copy_copy_copy",
    "name": {
      "en": "Publication excerpts - IP",
      "fr": "Extraits publications - PI",
      "de": "Auszüge aus Publikationen – Geistiges Eigentum",
      "es": "Extractos de publicaciones - PI"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q11",
        "operator": "equals",
        "value": "extrait_de_publications_ou_utilisation_d_echelles_scientifiques"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q11",
            "operator": "equals",
            "value": "extrait_de_publications_ou_utilisation_d_echelles_scientifiques"
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
            "en": "If the publication excerpts were included as-is without modification or paraphrasing, check whether the publication is covered by the CFC (Centre Français de Copie) / BioMed license and what rights are granted, using&nbsp;<a href=\"https://v1.cfcopies.com/biomed/index.html\" target=\"_blank\" rel=\"noopener noreferrer\">this link</a><br>",
            "fr": "Si les extraits de publications ont été intégrés tels quels sans modification ni paraphrase, vérifiez si la publication est intégrée au périmètre de la licence CFC (Centre Français de Copie) / BioMed et les droits qui sont accordés, en utilisant&nbsp;<a href=\"https://v1.cfcopies.com/biomed/index.html\" target=\"_blank\" rel=\"noopener noreferrer\">ce lien</a><br>",
            "de": "Wurden die Auszüge aus Publikationen unverändert, ohne Änderung oder Paraphrasierung übernommen, prüfen Sie, ob die Publikation vom Geltungsbereich der CFC-Lizenz (Centre Français de Copie) / BioMed erfasst ist und welche Rechte eingeräumt werden. Nutzen Sie dazu&nbsp;<a href=\"https://v1.cfcopies.com/biomed/index.html\" target=\"_blank\" rel=\"noopener noreferrer\">diesen Link</a><br>",
            "es": "Si los extractos de publicaciones se han incluido tal cual, sin modificación ni paráfrasis, compruebe si la publicación está incluida en el ámbito de la licencia CFC (Centre Français de Copie) / BioMed y los derechos que se conceden, utilizando&nbsp;<a href=\"https://v1.cfcopies.com/biomed/index.html\" target=\"_blank\" rel=\"noopener noreferrer\">este enlace</a><br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "If the publication excerpts are included by substantially reworking the text, diagrams, or figures, include the article's reference in your project's output",
            "fr": "Si l’intégration des extraits de publication se fait en retravaillant de manière substantielle les textes, schémas ou figures, intégrez la référence de l’article dans le rendu de votre projet",
            "de": "Werden die Auszüge aus der Publikation durch eine wesentliche Überarbeitung von Texten, Schemata oder Abbildungen eingebunden, geben Sie die Quellenangabe des Artikels in Ihrem Projektergebnis an",
            "es": "Si la incorporación de los extractos de la publicación implica reelaborar de manera sustancial los textos, esquemas o figuras, incluya la referencia del artículo en el resultado final de su proyecto"
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
    "id": "rule13_copy_copy_copy_copy_copy_copy_copy2",
    "name": {
      "en": "Publication distribution - IP",
      "fr": "Diffusion publication - PI",
      "de": "Verbreitung einer Publikation – Geistiges Eigentum",
      "es": "Difusión de publicación - PI"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q24",
        "operator": "equals",
        "value": "joindre_et_ou_diffuser_des_exemplaires_papiers_ou_electroniques_de_publications"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q24",
            "operator": "equals",
            "value": "joindre_et_ou_diffuser_des_exemplaires_papiers_ou_electroniques_de_publications"
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
            "en": "Depending on whether the shared publication is distributed electronically or physically, check whether it is covered by the CFC (Centre Français de Copie) / BioMed license and what rights are granted, using&nbsp;<a href=\"https://v1.cfcopies.com/biomed/index.html\" target=\"_blank\" rel=\"noopener noreferrer\">this link</a><br>",
            "fr": "Vérifiez, en fonction d’une diffusion électronique ou physique de la publication partagée, si elle est intégrée au périmètre de la licence CFC (Centre Français de Copie) / BioMed et les droits qui sont accordés, en utilisant&nbsp;<a href=\"https://v1.cfcopies.com/biomed/index.html\" target=\"_blank\" rel=\"noopener noreferrer\">ce lien</a><br>",
            "de": "Prüfen Sie je nach elektronischer oder physischer Verbreitung der geteilten Publikation, ob sie vom Geltungsbereich der CFC-Lizenz (Centre Français de Copie) / BioMed erfasst ist und welche Rechte eingeräumt werden. Nutzen Sie dazu&nbsp;<a href=\"https://v1.cfcopies.com/biomed/index.html\" target=\"_blank\" rel=\"noopener noreferrer\">diesen Link</a><br>",
            "es": "Compruebe, según se trate de una difusión electrónica o física de la publicación compartida, si esta está incluida en el ámbito de la licencia CFC (Centre Français de Copie) / BioMed y los derechos que se conceden, utilizando&nbsp;<a href=\"https://v1.cfcopies.com/biomed/index.html\" target=\"_blank\" rel=\"noopener noreferrer\">este enlace</a><br>"
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
    "id": "rule13_copy_copy_copy_copy_copy_copy_copy",
    "name": {
      "en": "Website excerpt - IP",
      "fr": "Extrait site - PI",
      "de": "Website-Auszug – Geistiges Eigentum",
      "es": "Extracto de sitio web - PI"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q11",
        "operator": "equals",
        "value": "Extrait de de sites internet"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q11",
            "operator": "equals",
            "value": "Extrait de de sites internet"
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
            "en": "For the website excerpt, check that the site's legal notices authorize reproduction",
            "fr": "Pour l’extrait du site internet, vérifiez que les mentions légales dudit site autorisent la reproduction",
            "de": "Prüfen Sie bei einem Website-Auszug, ob die rechtlichen Hinweise der betreffenden Website eine Reproduktion erlauben",
            "es": "Para el extracto del sitio web, compruebe que el aviso legal de dicho sitio autoriza la reproducción"
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
    "id": "rule13_copy_copy_copy_copy_copy_copy_copy_copy",
    "name": {
      "en": "Website domain name - IP",
      "fr": "Nom de domaine Site - PI",
      "de": "Domainname Website – Geistiges Eigentum",
      "es": "Nombre de dominio del sitio - PI"
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
            "value": "projet_du_lfb"
          },
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_co_construit_entre_le_lfb_et_un_partenaire"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "site_internet"
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
            "en": "Contact the IP team to check domain name availability if this is a new website",
            "fr": "Contactez le pôle PI pour vérifier la disponibilité des noms de domaine s’il s’agit d’un nouveau site internet",
            "de": "Kontaktieren Sie den Bereich Geistiges Eigentum, um bei einer neuen Website die Verfügbarkeit der Domainnamen zu prüfen",
            "es": "Contacte con el departamento de PI para comprobar la disponibilidad de los nombres de dominio si se trata de un nuevo sitio web"
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
    "id": "rule14",
    "name": {
      "en": "General - Advertising control",
      "fr": "Généralité - Contrôle pub",
      "de": "Allgemeines – Werbekontrolle",
      "es": "Generalidades - Control publicitario"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "not_equals",
        "value": "creation_achat_manipulation_de_base_de_donnees"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "not_equals",
            "value": "creation_achat_manipulation_de_base_de_donnees"
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
            "en": "Does the project mention any off-label (outside marketing authorization) elements?",
            "fr": "Est-ce qu’il y a mention dans le projet d’éléments hors AMM ?",
            "de": "Enthält das Projekt Angaben außerhalb der Zulassung (AMM)?",
            "es": "¿Se mencionan en el proyecto elementos fuera de la AMM (autorización de comercialización)?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Have you already considered the other materials that might be associated with the project, for example as part of its launch (brochure, email, etc.)?",
            "fr": "Avez-vous déjà réfléchi aux autres supports qui seraient associés au projet, par exemple dans le cadre de son lancement (brochure, email, ...)",
            "de": "Haben Sie bereits über weitere mit dem Projekt verbundene Medien nachgedacht, z. B. im Rahmen des Launches (Broschüre, E-Mail usw.)",
            "es": "¿Ha pensado ya en otros soportes que podrían asociarse al proyecto, por ejemplo con motivo de su lanzamiento (folleto, email, etc.)?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": []
  },
  {
    "id": "rule14_copy",
    "name": {
      "en": "Event - Advertising control",
      "fr": "Événement - Contrôle pub",
      "de": "Veranstaltung – Werbekontrolle",
      "es": "Evento - Control publicitario"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "evenement"
      },
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "webconference"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "evenement"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "webconference"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "controle_pub"
    ],
    "questions": {
      "controle_pub": [
        {
          "text": {
            "en": "What does the event consist of?",
            "fr": "En quoi consiste l’événement ?",
            "de": "Worin besteht die Veranstaltung?",
            "es": "¿En qué consiste el evento?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is the program?",
            "fr": "Quel est le programme ?",
            "de": "Wie sieht das Programm aus?",
            "es": "¿Cuál es el programa?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Will the event be available as a replay?",
            "fr": "L’événement sera-t-il disponible en replay ?",
            "de": "Wird die Veranstaltung als Aufzeichnung verfügbar sein?",
            "es": "¿Estará disponible el evento en diferido?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Who will be able to attend?",
            "fr": "Qui pourra participer ?",
            "de": "Wer kann teilnehmen?",
            "es": "¿Quién podrá participar?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": []
  },
  {
    "id": "rule14_copy_copy",
    "name": {
      "en": "Third-party event - Advertising control",
      "fr": "Événement tiers - Contrôle pub",
      "de": "Veranstaltung Dritter – Werbekontrolle",
      "es": "Evento de terceros - Control publicitario"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q18_copy",
        "operator": "equals",
        "value": "parrainage_d_evenement"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q18_copy",
            "operator": "equals",
            "value": "parrainage_d_evenement"
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
            "en": "Who is organizing the event?",
            "fr": "Qui est l’organisateur de l’événement ?",
            "de": "Wer ist der Veranstalter?",
            "es": "¿Quién es el organizador del evento?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Does the event have a scientific committee?",
            "fr": "L’événement dispose-t-il d’un comité scientifique ?",
            "de": "Verfügt die Veranstaltung über ein wissenschaftliches Komitee?",
            "es": "¿Cuenta el evento con un comité científico?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is the program?",
            "fr": "Quel est le programme ?",
            "de": "Wie sieht das Programm aus?",
            "es": "¿Cuál es el programa?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Who will be able to attend?",
            "fr": "Qui pourra participer ?",
            "de": "Wer kann teilnehmen?",
            "es": "¿Quién podrá participar?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": []
  },
  {
    "id": "rule14_copy_copy_copy",
    "name": {
      "en": "Website - Advertising control",
      "fr": "Site - Contrôle pub",
      "de": "Website – Werbekontrolle",
      "es": "Sitio web - Control publicitario"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "site_internet"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "site_internet"
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
            "en": "Can you describe the site's structure?",
            "fr": "Pouvez-vous décrire l’arborescence du site ?",
            "de": "Können Sie die Struktur der Website beschreiben?",
            "es": "¿Puede describir la arquitectura (árbol de navegación) del sitio?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": []
  },
  {
    "id": "rule14_copy_copy_copy_copy",
    "name": {
      "en": "Digital promotional access - Advertising control",
      "fr": "Accès digital promo - Contrôle pub",
      "de": "Digitaler Zugang zu Werbematerial – Werbekontrolle",
      "es": "Acceso digital promocional - Control publicitario"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "showcaseTheme",
            "operator": "equals",
            "value": "produit"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "site_internet"
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
            "en": "How do you ensure that only healthcare professionals authorized to prescribe can access the promotional information?",
            "fr": "Comment vous assurez-vous que seuls les professionnels de santé habilités à prescrire puissent accéder aux informations promotionnelles ?",
            "de": "Wie stellen Sie sicher, dass nur verschreibungsberechtigte Angehörige der Gesundheitsberufe Zugang zu den Werbeinformationen haben?",
            "es": "¿Cómo se asegura de que solo los profesionales de la salud habilitados para prescribir puedan acceder a la información promocional?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ]
    },
    "risks": []
  },
  {
    "id": "rule15",
    "name": {
      "en": "HCP contracts - E&C",
      "fr": "Contrats PS - E&C",
      "de": "Verträge mit Angehörigen der Gesundheitsberufe – E&C",
      "es": "Contratos PS - E&C"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q10",
        "operator": "equals",
        "value": "association_de_patients_patients"
      },
      {
        "type": "question",
        "question": "q10",
        "operator": "equals",
        "value": "professionnel_de_sante_hors_france_ou_association_de_pds_societe_savante"
      },
      {
        "type": "question",
        "question": "q10",
        "operator": "equals",
        "value": "professionnel_de_sante_francais_ou_association_de_pds_societe_savante"
      },
      {
        "type": "question",
        "question": "q10",
        "operator": "equals",
        "value": "expert_francais_non_professionnel_de_sante"
      },
      {
        "type": "question",
        "question": "q10",
        "operator": "equals",
        "value": "etablissements_hospitaliers"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "association_de_patients_patients"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "professionnel_de_sante_hors_france_ou_association_de_pds_societe_savante"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "professionnel_de_sante_francais_ou_association_de_pds_societe_savante"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "expert_francais_non_professionnel_de_sante"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "etablissements_hospitaliers"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "ethique_compliance"
    ],
    "questions": {
      "ethique_compliance": [
        {
          "text": {
            "en": "Who will the contract be with? (exact status of the partner)",
            "fr": "Avec qui va-t-on contractualiser ? (statut exact du partenaire)",
            "de": "Mit wem wird ein Vertrag geschlossen? (genauer Status des Partners)",
            "es": "¿Con quién se va a contratar? (estatus exacto del socio)"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Is compensation planned for the partners? How is it allocated? How do you justify the amount / number of hours? To find the appropriate hourly rate, you can use FMV Navigator<br>",
            "fr": "Une rémunération des partenaires est-elle prévue ? Comment se répartit-elle ? Comment justifiez-vous le montant / nombre d’heures ? Pour connaitre le taux horaire adapté, vous pouvez utiliser FMV Navigator<br>",
            "de": "Ist eine Vergütung der Partner vorgesehen? Wie verteilt sie sich? Wie begründen Sie den Betrag/die Stundenanzahl? Zur Ermittlung des angemessenen Stundensatzes können Sie FMV Navigator nutzen<br>",
            "es": "¿Está prevista una remuneración para los socios? ¿Cómo se reparte? ¿Cómo justifica el importe / el número de horas? Para conocer la tarifa horaria adecuada, puede utilizar FMV Navigator<br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What role will the people we are collaborating with play? Are deliverables expected from them?",
            "fr": "Quel sera le rôle des personnes avec qui nous collaborons ? Des livrables sont-ils attendus de leur part ?",
            "de": "Welche Rolle werden die Personen übernehmen, mit denen wir zusammenarbeiten? Werden Leistungen von ihrer Seite erwartet?",
            "es": "¿Cuál será el rol de las personas con las que colaboramos? ¿Se esperan entregables por su parte?"
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
    "id": "rule15_copy",
    "name": {
      "en": "Patient association contracts with HCPs - E&C",
      "fr": "Contrats asso patients avec PS - E&C",
      "de": "Verträge mit Patientenverbänden mit Angehörigen der Gesundheitsberufe – E&C",
      "es": "Contratos de asociaciones de pacientes con PS - E&C"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q10",
        "operator": "equals",
        "value": "association_de_patients_patients"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "association_de_patients_patients"
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
            "en": "Are there healthcare professionals on the association's board?",
            "fr": "Y a-t-il des professionnels de santé dans le board de l’association ?",
            "de": "Sind Angehörige der Gesundheitsberufe im Vorstand des Verbands vertreten?",
            "es": "¿Hay profesionales de la salud en la junta directiva de la asociación?"
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
    "id": "rule15_copy_copy2",
    "name": {
      "en": "App - E&C",
      "fr": "App - E&C",
      "de": "App – E&C",
      "es": "App - E&C"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "applications_mobiles"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "applications_mobiles"
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
            "en": "Is the same type of application already available on the App Store? If so, is it free or paid?",
            "fr": "Est-ce que le même type d’application est déjà disponible sur l’AppStore ? Si oui, est-elle gratuite ou payante ?",
            "de": "Ist eine vergleichbare Anwendung bereits im AppStore verfügbar? Wenn ja, ist sie kostenlos oder kostenpflichtig?",
            "es": "¿Existe ya en el AppStore una aplicación del mismo tipo? En caso afirmativo, ¿es gratuita o de pago?"
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
    "id": "rule15_copy_copy2_copy",
    "name": {
      "en": "LFB event - E&C",
      "fr": "Événement LFB - E&C",
      "de": "LFB-Veranstaltung – E&C",
      "es": "Evento LFB - E&C"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "evenement"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "evenement"
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
            "en": "What is the event program?",
            "fr": "Quel est le programme de l’événement ?",
            "de": "Wie sieht das Programm der Veranstaltung aus?",
            "es": "¿Cuál es el programa del evento?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Where will the event take place?",
            "fr": "Où se déroulera l’événement ?",
            "de": "Wo findet die Veranstaltung statt?",
            "es": "¿Dónde se celebrará el evento?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Is a meal / coffee / etc. planned?",
            "fr": "Un repas / café / ... est-il prévu ?",
            "de": "Ist eine Mahlzeit/ein Kaffee usw. vorgesehen?",
            "es": "¿Está previsto algún tipo de comida / café / etc.?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you plan to cover overnight accommodation? Transport?",
            "fr": "Avez-vous prévu de prendre en charge une nuitée ? le transport ?",
            "de": "Ist eine Übernahme der Übernachtungskosten vorgesehen? der Transportkosten?",
            "es": "¿Ha previsto hacerse cargo de una noche de alojamiento? ¿Del transporte?"
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
    "id": "rule15_copy_copy",
    "name": {
      "en": "Sponsorship / partnership - E&C",
      "fr": "Parrainage / partenariat - E&C",
      "de": "Sponsoring / Partnerschaft – E&C",
      "es": "Patrocinio / colaboración - E&C"
    },
    "conditions": [
      {
        "type": "question",
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_d_un_tiers_soutenu_par_le_lfb"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_d_un_tiers_soutenu_par_le_lfb"
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
            "en": "Who will the sponsorship contract be with? (exact status of the partner) Are there HCPs on the sponsored party's board?",
            "fr": "Avec qui va-t-on contractualiser dans le cadre du parrainage ? (statut exact du partenaire) Présence de PS dans le board du parrainé ?",
            "de": "Mit wem wird im Rahmen des Sponsorings ein Vertrag geschlossen? (genauer Status des Partners) Sind Angehörige der Gesundheitsberufe im Vorstand des Gesponserten vertreten?",
            "es": "¿Con quién se va a contratar en el marco del patrocinio? (estatus exacto del socio) ¿Hay presencia de PS en la junta directiva del patrocinado?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Can you provide the sponsored party's bylaws? You can find&nbsp;<a href=\"https://www.pappers.fr/\" target=\"_blank\" rel=\"noopener noreferrer\">this type of document here</a>",
            "fr": "Pouvez-vous nous fournir les statuts du parrainé ? Vous pouvez trouver&nbsp;<a href=\"https://www.pappers.fr/\" target=\"_blank\" rel=\"noopener noreferrer\">ce type de document ici</a>",
            "de": "Können Sie uns die Satzung des Gesponserten zur Verfügung stellen? Sie finden&nbsp;<a href=\"https://www.pappers.fr/\" target=\"_blank\" rel=\"noopener noreferrer\">diese Art von Dokument hier</a>",
            "es": "¿Puede facilitarnos los estatutos del patrocinado? Puede encontrar&nbsp;<a href=\"https://www.pappers.fr/\" target=\"_blank\" rel=\"noopener noreferrer\">este tipo de documento aquí</a>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is the exact amount of the support? What does it fund?",
            "fr": "Quel est le montant exact du soutien ? Que vient-il financer ?",
            "de": "Wie hoch ist der genaue Betrag der Unterstützung? Was wird damit finanziert?",
            "es": "¿Cuál es el importe exacto del apoyo? ¿Qué financia?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What are the benefits in return for LFB? How is this valuable for LFB?",
            "fr": "Quelles sont les contreparties pour le LFB ? En quoi cela a-t-il de la valeur pour le LFB ?",
            "de": "Welche Gegenleistungen erhält der LFB? Worin besteht der Mehrwert für den LFB?",
            "es": "¿Cuáles son las contrapartidas para el LFB? ¿Qué valor aporta esto al LFB?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Are there other sponsors?<br>",
            "fr": "Y a-t-il d’autres sponsors ?<br>",
            "de": "Gibt es weitere Sponsoren?<br>",
            "es": "¿Hay otros patrocinadores?<br>"
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
    "id": "rule15_copy_copy_copy",
    "name": {
      "en": "Event sponsorship - E&C",
      "fr": "Parrainage événement - E&C",
      "de": "Veranstaltungssponsoring – E&C",
      "es": "Patrocinio de evento - E&C"
    },
    "conditions": [
      {
        "type": "question",
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_d_un_tiers_soutenu_par_le_lfb"
      },
      {
        "type": "question",
        "question": "q18_copy",
        "operator": "equals",
        "value": "parrainage_d_evenement"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_d_un_tiers_soutenu_par_le_lfb"
          },
          {
            "type": "question",
            "question": "q18_copy",
            "operator": "equals",
            "value": "parrainage_d_evenement"
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
            "en": "What is the event program?",
            "fr": "Quel est le programme de l’événement ?",
            "de": "Wie sieht das Programm der Veranstaltung aus?",
            "es": "¿Cuál es el programa del evento?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Who are the participants?",
            "fr": "Qui sont les participants ?",
            "de": "Wer sind die Teilnehmer?",
            "es": "¿Quiénes son los participantes?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Is there a scientific committee associated with the event?",
            "fr": "Y a-t-il un comité scientifique associé à l’événement ?",
            "de": "Gibt es ein wissenschaftliches Komitee für die Veranstaltung?",
            "es": "¿Hay un comité científico asociado al evento?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Where will the event take place?",
            "fr": "Dans quel lieu se déroulera l’événement ?",
            "de": "An welchem Ort findet die Veranstaltung statt?",
            "es": "¿En qué lugar se celebrará el evento?"
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
    "id": "rule15_copy_copy_copy_copy",
    "name": {
      "en": "Donation - E&C",
      "fr": "Don - E&C",
      "de": "Spende – E&C",
      "es": "Donación - E&C"
    },
    "conditions": [
      {
        "type": "question",
        "question": "ProjectType",
        "operator": "equals",
        "value": "don_bourse_appel_a_projets"
      }
    ],
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
            "en": "What is the exact amount of the donation?",
            "fr": "Quel est le montant exact du don ?",
            "de": "Wie hoch ist der genaue Betrag der Spende?",
            "es": "¿Cuál es el importe exacto de la donación?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Who is the beneficiary of the donation? What is their status? Are there HCPs on their board?",
            "fr": "Qui est le bénéficiaire du don ? Quel est son statut ? Y a-t-il des PS dans son board ?",
            "de": "Wer ist der Empfänger der Spende? Welchen Status hat er? Sind Angehörige der Gesundheitsberufe in seinem Vorstand vertreten?",
            "es": "¿Quién es el beneficiario de la donación? ¿Cuál es su estatus? ¿Hay PS en su junta directiva?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is the rationale for the donation for LFB? (general interest, scientific, institutional?)",
            "fr": "Quel est le rationnel du don pour le LFB ? (intérêt général, scientifique, institutionnel ?)",
            "de": "Was ist die Begründung der Spende für den LFB? (allgemeines Interesse, wissenschaftlich, institutionell?)",
            "es": "¿Cuál es la justificación de la donación para el LFB? (¿interés general, científico, institucional?)"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Who initiated contact with the donation requester?",
            "fr": "Qui est à l’origine du contact avec le demandeur du don ?",
            "de": "Von wem ging der Kontakt mit dem Spendenempfänger aus?",
            "es": "¿Quién ha originado el contacto con el solicitante de la donación?"
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
    "id": "rule15_copy_copy_copy_copy_copy",
    "name": {
      "en": "Compensation for French HCPs - E&C",
      "fr": "Rémunération PS France - E&C",
      "de": "Vergütung von Angehörigen der Gesundheitsberufe in Frankreich – E&C",
      "es": "Remuneración PS Francia - E&C"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "BUDGET",
            "operator": "gte",
            "value": "2"
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
            "value": "professionnel_de_sante_francais_ou_association_de_pds_societe_savante"
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
            "en": "What is the HCP's status? Hospital practitioner / University hospital practitioner?",
            "fr": "Quel est le statut des Pds ? PH / PUPH ?",
            "de": "Welchen Status haben die Angehörigen der Gesundheitsberufe? PH / PUPH?",
            "es": "¿Cuál es el estatus de los PdS? ¿PH / PUPH?"
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
          "en": "Authorization request",
          "fr": "Demande d’autorisation",
          "de": "Genehmigungsantrag",
          "es": "Solicitud de autorización"
        },
        "level": "medium",
        "mitigation": {
          "en": "If the contract with French healthcare professionals exceeds €2K, authorization must be obtained from their professional order before the engagement begins",
          "fr": "Si le contrat des professionnels de santé français est supérieur à 2K€, il convient en amont du début de la prestation d’obtenir l’autorisation de l’ordre auquel ils sont rattachés",
          "de": "Übersteigt der Vertrag mit französischen Angehörigen der Gesundheitsberufe 2K€, muss vor Beginn der Leistung die Genehmigung der zuständigen Berufskammer eingeholt werden",
          "es": "Si el contrato de los profesionales de la salud franceses supera los 2K€, es necesario obtener, antes del inicio de la prestación, la autorización del colegio profesional al que pertenecen"
        },
        "priority": "elevated",
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
    "id": "rule15_copy_copy_copy_copy_copy_copy",
    "name": {
      "en": "Compensation for French non-HCP experts - E&C",
      "fr": "Rémunération Expert non PS France - E&C",
      "de": "Vergütung von Experten ohne Gesundheitsberuf in Frankreich – E&C",
      "es": "Remuneración de experto no PS Francia - E&C"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "BUDGET",
            "operator": "gte",
            "value": "1"
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
            "value": "expert_francais_non_professionnel_de_sante"
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
            "en": "<br>",
            "fr": "<br>",
            "de": "<br>",
            "es": "<br>"
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
          "en": "Special compensation arrangements",
          "fr": "Modalités de rémunération particulière",
          "de": "Besondere Vergütungsmodalitäten",
          "es": "Modalidades de remuneración particulares"
        },
        "level": "medium",
        "mitigation": {
          "en": "If the French expert approached (working within a public institution) is neither a researcher nor a healthcare professional, they can only be compensated if they are registered with URSSAF or have their own consulting company. Otherwise, they cannot be compensated. In that case, we will use a pro bono agreement or make a payment to their affiliated institution",
          "fr": "Si l’expert français sollicité (travaillant au sein d’un établissement public) n’est ni chercheur ni PdS, il ne pourra être rémunéré que s’il est inscrit à l’URSSAF ou dispose de sa propre société de conseil. À défaut, il ne pourra pas être rémunéré. Nous passerons alors par un contrat à titre gracieux ou avec un versement à son institution de rattachement",
          "de": "Ist der angefragte französische Experte (der bei einer öffentlichen Einrichtung beschäftigt ist) weder Forscher noch Angehöriger eines Gesundheitsberufs, kann er nur vergütet werden, wenn er bei der URSSAF gemeldet ist oder über eine eigene Beratungsgesellschaft verfügt. Andernfalls kann keine Vergütung erfolgen. In diesem Fall wird ein unentgeltlicher Vertrag geschlossen oder eine Zahlung an seine zugehörige Institution geleistet",
          "es": "Si el experto francés solicitado (que trabaja en un organismo público) no es ni investigador ni PdS, solo podrá ser remunerado si está inscrito en la URSSAF o dispone de su propia empresa de consultoría. En caso contrario, no podrá ser remunerado. En ese caso, se recurrirá a un contrato a título gratuito o a un pago a su institución de adscripción"
        },
        "priority": "elevated",
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
    "id": "rule15_copy_copy_copy_copy_copy_copy_copy",
    "name": {
      "en": "AI - E&C",
      "fr": "IA - E&C",
      "de": "KI – E&C",
      "es": "IA - E&C"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "Bot IA"
      },
      {
        "type": "question",
        "question": "q24",
        "operator": "equals",
        "value": "utiliser_l_ia"
      },
      {
        "type": "question",
        "question": "q11",
        "operator": "equals",
        "value": "contenu_genere_via_l_ia"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "Bot IA"
          },
          {
            "type": "question",
            "question": "q24",
            "operator": "equals",
            "value": "utiliser_l_ia"
          },
          {
            "type": "question",
            "question": "q11",
            "operator": "equals",
            "value": "contenu_genere_via_l_ia"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "ethique_compliance"
    ],
    "questions": {
      "ethique_compliance": [
        {
          "text": {
            "en": "Can you specify exactly how AI is integrated into your project?",
            "fr": "Pouvez-vous préciser comment l’IA est précisément intégrée dans votre projet ?",
            "de": "Können Sie genauer erläutern, wie KI in Ihr Projekt eingebunden ist?",
            "es": "¿Puede precisar cómo se integra exactamente la IA en su proyecto?"
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
    "id": "rule15_copy_copy_copy_copy_copy_copy_copy_copy2",
    "name": {
      "en": "AI - Legal France IT",
      "fr": "IA - Juridique France IT",
      "de": "KI – Juridique France IT",
      "es": "IA - Jurídico Francia IT"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "Bot IA"
      },
      {
        "type": "question",
        "question": "q24",
        "operator": "equals",
        "value": "utiliser_l_ia"
      },
      {
        "type": "question",
        "question": "q11",
        "operator": "equals",
        "value": "contenu_genere_via_l_ia"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "Bot IA"
          },
          {
            "type": "question",
            "question": "q24",
            "operator": "equals",
            "value": "utiliser_l_ia"
          },
          {
            "type": "question",
            "question": "q11",
            "operator": "equals",
            "value": "contenu_genere_via_l_ia"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "juridique_france"
    ],
    "questions": {
      "ethique_compliance": [
        {
          "text": {
            "en": "What type of AI is used for the project: An online tool? AI installed on LFB's information system? Custom development?<br>",
            "fr": "Quel type d’IA est utilisé pour le projet : Outil en ligne ? IA installée sur le système d’information du LFB ? Développement sur mesure ?<br>",
            "de": "Welche Art von KI wird für das Projekt verwendet: Online-Tool? Im Informationssystem des LFB installierte KI? Individualentwicklung?<br>",
            "es": "¿Qué tipo de IA se utiliza en el proyecto: una herramienta en línea? ¿IA instalada en el sistema de información del LFB? ¿Un desarrollo a medida?<br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What content will be processed by the AI?",
            "fr": "Quel contenu sera traité par l’IA ?",
            "de": "Welche Inhalte werden von der KI verarbeitet?",
            "es": "¿Qué contenido será tratado por la IA?"
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
    "id": "rule15_copy_copy_copy_copy_copy_copy_copy_copy",
    "name": {
      "en": "AI content generation - E&C",
      "fr": "Génération contenu IA - E&C",
      "de": "KI-generierte Inhalte – E&C",
      "es": "Generación de contenido con IA - E&C"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q24",
        "operator": "equals",
        "value": "oui_pour_generer_du_contenu_pour_le_projet"
      },
      {
        "type": "question",
        "question": "q11",
        "operator": "equals",
        "value": "contenu_genere_via_l_ia"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q24",
            "operator": "equals",
            "value": "oui_pour_generer_du_contenu_pour_le_projet"
          },
          {
            "type": "question",
            "question": "q11",
            "operator": "equals",
            "value": "contenu_genere_via_l_ia"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "ethique_compliance"
    ],
    "questions": {
      "ethique_compliance": [
        {
          "text": {
            "en": "Content generated by AI must be labeled as having been generated using such tools",
            "fr": "Les contenus générés par IA doivent être indiqués comme ayant été générés via de tels outils",
            "de": "KI-generierte Inhalte müssen als solche gekennzeichnet werden",
            "es": "Los contenidos generados por IA deben indicarse como generados mediante ese tipo de herramientas"
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
    "id": "rule15_copy_copy_copy_copy_copy_copy_copy_copy_copy",
    "name": {
      "en": "AI risk - E&C",
      "fr": "Risque IA - E&C",
      "de": "KI-Risiko – E&C",
      "es": "Riesgo IA - E&C"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "Bot IA"
      },
      {
        "type": "question",
        "question": "q24",
        "operator": "equals",
        "value": "oui_le_projet_permettra_aux_utilisateurs_d_utiliser_l_ia"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "Bot IA"
          },
          {
            "type": "question",
            "question": "q24",
            "operator": "equals",
            "value": "oui_le_projet_permettra_aux_utilisateurs_d_utiliser_l_ia"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "ethique_compliance"
    ],
    "questions": {
      "ethique_compliance": [
        {
          "text": {
            "en": "How does your AI model work? What is it based on? What does it enable?",
            "fr": "Comment fonctionne votre modèle d’IA ? Sur quoi se base-t-il ? Que permet il ?",
            "de": "Wie funktioniert Ihr KI-Modell? Worauf basiert es? Was ermöglicht es?",
            "es": "¿Cómo funciona su modelo de IA? ¿En qué se basa? ¿Qué permite hacer?"
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
          "en": "Tool incorporating AI",
          "fr": "Outil intégrant de l’IA",
          "de": "Tool mit integrierter KI",
          "es": "Herramienta que integra IA"
        },
        "level": "high",
        "mitigation": {
          "en": "The use of AI in a tool requires a detailed analysis to ensure compliance with the requirements of the AI Act",
          "fr": "L’utilisation de l’IA dans un outil doit amener une analyse fine afin de nous assurer de respecter les exigences de l’IA Act",
          "de": "Die Nutzung von KI in einem Tool erfordert eine sorgfältige Analyse, um die Einhaltung der Anforderungen des KI-Gesetzes (AI Act) sicherzustellen",
          "es": "El uso de la IA en una herramienta debe dar lugar a un análisis detallado para garantizar el cumplimiento de los requisitos de la Ley de IA (IA Act)"
        },
        "priority": "critical",
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
    "id": "rule16",
    "name": {
      "en": "Contracting - Legal International",
      "fr": "Contractualisation - Juridique International",
      "de": "Vertragsabschluss – Juridique International",
      "es": "Contratación - Jurídico Internacional"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q27",
            "operator": "equals",
            "value": "grande_bretagne"
          },
          {
            "type": "question",
            "question": "q27",
            "operator": "equals",
            "value": "benelux"
          },
          {
            "type": "question",
            "question": "q27",
            "operator": "equals",
            "value": "allemagne"
          },
          {
            "type": "question",
            "question": "q27",
            "operator": "equals",
            "value": "mexique"
          },
          {
            "type": "question",
            "question": "q27",
            "operator": "equals",
            "value": "other"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q10",
            "operator": "not_equals",
            "value": "aucune_collaboration_prevue_avec_l_externe"
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
            "en": "Who is the contract with? What is its nature (association, private company, etc.)?",
            "fr": "Avec qui contracte-t-on ? Quelle est sa nature (association, société privée, …) ?",
            "de": "Mit wem wird ein Vertrag geschlossen? Um welche Rechtsform handelt es sich (Verein, Privatunternehmen usw.)?",
            "es": "¿Con quién se contrata? ¿Cuál es su naturaleza (asociación, empresa privada, etc.)?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Who is contracting? (HQ or subsidiary)",
            "fr": "Qui contracte ? (HQ ou filiale)",
            "de": "Wer schließt den Vertrag ab? (Hauptsitz oder Tochtergesellschaft)",
            "es": "¿Quién contrata? (HQ o filial)"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is the project roadmap? Desired launch date? Pilot phase? Identified end date?",
            "fr": "Quelle est la roadmap du projet ? Date de lancement souhaitée ? Pilote ? Date de fin identifiée ?",
            "de": "Wie sieht die Roadmap des Projekts aus? Gewünschtes Startdatum? Pilotphase? Festgelegtes Enddatum?",
            "es": "¿Cuál es la hoja de ruta del proyecto? ¿Fecha de lanzamiento deseada? ¿Fase piloto? ¿Fecha de finalización identificada?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is the project's budget? And how is it allocated, including over time?",
            "fr": "Quel est le montant du projet ? et comment se répartit-il ? y compris dans le temps",
            "de": "Wie hoch ist der Projektbetrag? Und wie verteilt er sich, auch zeitlich?",
            "es": "¿Cuál es el importe del proyecto? ¿Y cómo se reparte? incluyendo su distribución en el tiempo"
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
    "id": "rule16_copy2",
    "name": {
      "en": "Sponsorship - Legal France X International",
      "fr": "Parrainage - Juridique France X International",
      "de": "Sponsoring – Juridique France X International",
      "es": "Patrocinio - Jurídico Francia X Internacional"
    },
    "conditions": [
      {
        "type": "question",
        "question": "ProjectType",
        "operator": "equals",
        "value": "projet_d_un_tiers_soutenu_par_le_lfb"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "ProjectType",
            "operator": "equals",
            "value": "projet_d_un_tiers_soutenu_par_le_lfb"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "juridique_france"
    ],
    "questions": {
      "juridique_international": [
        {
          "text": {
            "en": "Who is the contract with? What is its nature (association, private company, etc.)?",
            "fr": "Avec qui contracte-t-on ? Quelle est sa nature (association, société privée, …) ?",
            "de": "Mit wem wird ein Vertrag geschlossen? Um welche Rechtsform handelt es sich (Verein, Privatunternehmen usw.)?",
            "es": "¿Con quién se contrata? ¿Cuál es su naturaleza (asociación, empresa privada, etc.)?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Who is contracting? (HQ or subsidiary)",
            "fr": "Qui contracte ? (HQ ou filiale)",
            "de": "Wer schließt den Vertrag ab? (Hauptsitz oder Tochtergesellschaft)",
            "es": "¿Quién contrata? (HQ o filial)"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "To what extent does LFB contribute to the project?",
            "fr": "À quelle hauteur le LFB contribue au projet ?",
            "de": "In welcher Höhe trägt der LFB zum Projekt bei?",
            "es": "¿En qué medida contribuye el LFB al proyecto?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What benefits in return are planned for LFB?",
            "fr": "Quelles sont les contreparties prévues pour le LFB ?",
            "de": "Welche Gegenleistungen sind für den LFB vorgesehen?",
            "es": "¿Cuáles son las contrapartidas previstas para el LFB?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Are there other partners funding the project?",
            "fr": "Y a-t-il d’autres partenaires qui financent le projet ?",
            "de": "Gibt es weitere Partner, die das Projekt finanzieren?",
            "es": "¿Hay otros socios que financien el proyecto?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ],
      "juridique_france": [
        {
          "text": {
            "en": "Who is the contract with?<br>",
            "fr": "Avec qui contracte-t-on ?<br>",
            "de": "Mit wem wird ein Vertrag geschlossen?<br>",
            "es": "¿Con quién se contrata?<br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is its nature (association, private company, etc.)?",
            "fr": "Quelle est sa nature (association, société privée, …) ?",
            "de": "Um welche Rechtsform handelt es sich (Verein, Privatunternehmen usw.)?",
            "es": "¿Cuál es su naturaleza (asociación, empresa privada, etc.)?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Who is contracting? (HQ or subsidiary)",
            "fr": "Qui contracte ? (HQ ou filiale)",
            "de": "Wer schließt den Vertrag ab? (Hauptsitz oder Tochtergesellschaft)",
            "es": "¿Quién contrata? (HQ o filial)"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "To what extent does LFB contribute to the project?",
            "fr": "À quelle hauteur le LFB contribue au projet ?",
            "de": "In welcher Höhe trägt der LFB zum Projekt bei?",
            "es": "¿En qué medida contribuye el LFB al proyecto?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What benefits in return are planned for LFB?&nbsp;",
            "fr": "Quelles sont les contreparties prévues pour le LFB ?&nbsp;",
            "de": "Welche Gegenleistungen sind für den LFB vorgesehen?&nbsp;",
            "es": "¿Cuáles son las contrapartidas previstas para el LFB?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Are there other partners funding the project?",
            "fr": "Y a-t-il d’autres partenaires qui financent le projet ?",
            "de": "Gibt es weitere Partner, die das Projekt finanzieren?",
            "es": "¿Hay otros socios que financien el proyecto?"
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
    "teamRoutingRules": [
      {
        "id": "route_1771362249252_cg79",
        "targetTeamId": "juridique_international",
        "conditionGroups": [
          {
            "logic": "any",
            "conditions": [
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "pays_lies_a_des_filiales_hors_france"
              },
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "other"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "rule16_copy",
    "name": {
      "en": "Medical device - Legal France IT",
      "fr": "DM - Juridique France IT",
      "de": "Medizinprodukt – Juridique France IT",
      "es": "DM - Jurídico Francia IT"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q22",
        "operator": "equals",
        "value": "une_application_instrument_outil_destine_a_etre_utilise_a_des_fins_medicales_prevention_diagnostic_traitement_suivi_de_la_maladie"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q22",
            "operator": "equals",
            "value": "une_application_instrument_outil_destine_a_etre_utilise_a_des_fins_medicales_prevention_diagnostic_traitement_suivi_de_la_maladie"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "juridique_france"
    ],
    "questions": {
      "juridique_international": [
        {
          "text": {
            "en": "Who is the partner responsible for developing the application/instrument/tool intended for medical use?&nbsp;<br>",
            "fr": "Qui est le partenaire en charge du développement de l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;<br>",
            "de": "Wer ist der Partner, der für die Entwicklung der für medizinische Zwecke bestimmten Anwendung/des Instruments/des Werkzeugs verantwortlich ist?&nbsp;<br>",
            "es": "¿Quién es el socio encargado del desarrollo de la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;<br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is our role in the project? Promotion?&nbsp;",
            "fr": "Quel est notre rôle dans le projet ? promotion ?&nbsp;",
            "de": "Welche Rolle übernehmen wir im Projekt? Bewerbung?&nbsp;",
            "es": "¿Cuál es nuestro rol en el proyecto? ¿Promoción?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to purchase the application/instrument/tool intended for medical use?&nbsp;",
            "fr": "Volonté d’acheter l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;",
            "de": "Besteht die Absicht, die für medizinische Zwecke bestimmte Anwendung/das Instrument/das Werkzeug zu erwerben?&nbsp;",
            "es": "¿Existe la intención de comprar la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to offer this application / instrument / tool intended for medical use as part of tenders?&nbsp;",
            "fr": "Volonté de proposer cette application / cet instrument / cet outil destiné à être utilisé à des fins médicales dans le cadre d’appels d’offres ?&nbsp;",
            "de": "Besteht die Absicht, diese für medizinische Zwecke bestimmte Anwendung/dieses Instrument/dieses Werkzeug im Rahmen von Ausschreibungen anzubieten?&nbsp;",
            "es": "¿Existe la intención de proponer esta aplicación / este instrumento / esta herramienta destinada a utilizarse con fines médicos en el marco de licitaciones?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ],
      "juridique_france": [
        {
          "text": {
            "en": "Who is the partner (manufacturer) responsible for developing the device used for medical purposes?",
            "fr": "Qui est le partenaire (fabricant) en charge du développement du dispositif utilisé à des fins médicales ?",
            "de": "Wer ist der Partner (Hersteller), der für die Entwicklung des für medizinische Zwecke verwendeten Produkts verantwortlich ist?",
            "es": "¿Quién es el socio (fabricante) encargado del desarrollo del dispositivo utilizado con fines médicos?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is our role in the project? Promotion?",
            "fr": "Quel est notre rôle dans le projet ? promotion ?",
            "de": "Welche Rolle übernehmen wir im Projekt? Bewerbung?",
            "es": "¿Cuál es nuestro rol en el proyecto? ¿Promoción?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to own the device used for medical purposes?",
            "fr": "Avez-vous la volonté d’avoir la propriété du dispositif utilisé à des fins médicales ?",
            "de": "Besteht die Absicht, Eigentümer des für medizinische Zwecke verwendeten Produkts zu werden?",
            "es": "¿Tiene intención de ser propietario del dispositivo utilizado con fines médicos?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you want to offer this device as part of tenders?",
            "fr": "Voulez-vous proposer ce dispositif dans le cadre d’appels d’offres ?",
            "de": "Möchten Sie dieses Produkt im Rahmen von Ausschreibungen anbieten?",
            "es": "¿Desea proponer este dispositivo en el marco de licitaciones?"
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
          "en": "Medical Device",
          "fr": "Dispositif Médical",
          "de": "Medizinprodukt",
          "es": "Dispositivo médico"
        },
        "level": "medium",
        "mitigation": {
          "en": "If your application/instrument/tool qualifies as a medical device, numerous obligations will apply. It is therefore essential to determine whether your project falls under the medical device classification",
          "fr": "Si votre application/instrument/outil est qualifié de dispositif médical, de nombreuses obligations s’appliqueront. Il est donc essentiel d’identifier si votre projet tombe dans la qualification de dispositif médical",
          "de": "Wird Ihre Anwendung/Ihr Instrument/Ihr Werkzeug als Medizinprodukt eingestuft, gelten zahlreiche Verpflichtungen. Es ist daher wesentlich zu klären, ob Ihr Projekt unter die Einstufung als Medizinprodukt fällt",
          "es": "Si su aplicación/instrumento/herramienta se califica como dispositivo médico, se aplicarán numerosas obligaciones. Por ello, es esencial identificar si su proyecto entra dentro de la calificación de dispositivo médico"
        },
        "priority": "standard",
        "teamId": "juridique_france",
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
    "id": "rule16_copy_copy3",
    "name": {
      "en": "PSP - Legal France X International",
      "fr": "PSP - Juridique France X International",
      "de": "Patientenunterstützungsprogramm – Juridique France X International",
      "es": "PSP - Jurídico Francia X Internacional"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q22",
        "operator": "equals",
        "value": "un_dispositif_structure_d_accompagnement_du_patient_ou_de_son_entourage_par_ex_aidant_pour_l_accompagner_notamment_dans_la_comprehension_de_sa_pathologie_l_usage_de_son_traitement_initiation_observance_gestion_des_effets_indesirables_comprehension_de_la_maladie_soutien_pratique_ou_financier"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q22",
            "operator": "equals",
            "value": "un_dispositif_structure_d_accompagnement_du_patient_ou_de_son_entourage_par_ex_aidant_pour_l_accompagner_notamment_dans_la_comprehension_de_sa_pathologie_l_usage_de_son_traitement_initiation_observance_gestion_des_effets_indesirables_comprehension_de_la_maladie_soutien_pratique_ou_financier"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "juridique_france"
    ],
    "questions": {
      "juridique_international": [],
      "juridique_france": [
        {
          "text": {
            "en": "Is this project linked to a therapeutic education program?",
            "fr": "Ce projet est-il adossé à un programme d’éducation thérapeutique ?",
            "de": "Ist dieses Projekt an ein Programm zur therapeutischen Schulung angebunden?",
            "es": "¿Está este proyecto vinculado a un programa de educación terapéutica?"
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
          "en": "Patient support program",
          "fr": "Programme d’accompagnement patient",
          "de": "Patientenbegleitprogramm",
          "es": "Programa de apoyo al paciente"
        },
        "level": "high",
        "mitigation": {
          "en": "Patient support activities and therapeutic education programs - if classified as such - are subject to very specific and binding rules. Check with Legal that the project is properly classified",
          "fr": "Les actions d’accompagnement patient et les programmes d’éducation thérapeutique - s’ils sont qualifiés de tels - sont soumis à des règles très précises et contraignantes. Vérifiez avec le juridique la bonne qualification du projet",
          "de": "Maßnahmen zur Patientenbegleitung und Programme zur therapeutischen Schulung – sofern sie als solche eingestuft werden – unterliegen sehr präzisen und verbindlichen Regeln. Prüfen Sie mit der Rechtsabteilung die korrekte Einstufung des Projekts",
          "es": "Las acciones de apoyo al paciente y los programas de educación terapéutica —cuando se califican como tales— están sujetos a normas muy precisas y estrictas. Verifique con el departamento jurídico la correcta calificación del proyecto"
        },
        "priority": "standard",
        "teamId": "juridique_france",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": [
      {
        "id": "route_1771330027633_euae",
        "targetTeamId": "juridique_international",
        "conditionGroups": [
          {
            "logic": "any",
            "conditions": [
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "pays_lies_a_des_filiales_hors_france"
              },
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "other"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "rule16_copy_copy2",
    "name": {
      "en": "App / Website / Bot - Legal France X International",
      "fr": "App / Site / Bot - Juridique France X International",
      "de": "App / Site / Bot – Juridique France X International",
      "es": "App / Sitio / Bot - Jurídico Francia X Internacional"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "applications_mobiles"
      },
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "site_internet"
      },
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "Bot IA"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "applications_mobiles"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "site_internet"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "Bot IA"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "juridique_france"
    ],
    "questions": {
      "juridique_international": [
        {
          "text": {
            "en": "Who is the partner responsible for developing the application/instrument/tool intended for medical use?&nbsp;<br>",
            "fr": "Qui est le partenaire en charge du développement de l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;<br>",
            "de": "Wer ist der Partner, der für die Entwicklung der für medizinische Zwecke bestimmten Anwendung/des Instruments/des Werkzeugs verantwortlich ist?&nbsp;<br>",
            "es": "¿Quién es el socio encargado del desarrollo de la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;<br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is our role in the project? Promotion?&nbsp;",
            "fr": "Quel est notre rôle dans le projet ? promotion ?&nbsp;",
            "de": "Welche Rolle übernehmen wir im Projekt? Bewerbung?&nbsp;",
            "es": "¿Cuál es nuestro rol en el proyecto? ¿Promoción?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to purchase the application/instrument/tool intended for medical use?&nbsp;",
            "fr": "Volonté d’acheter l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;",
            "de": "Besteht die Absicht, die für medizinische Zwecke bestimmte Anwendung/das Instrument/das Werkzeug zu erwerben?&nbsp;",
            "es": "¿Existe la intención de comprar la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to offer this application / instrument / tool intended for medical use as part of tenders?&nbsp;",
            "fr": "Volonté de proposer cette application / cet instrument / cet outil destiné à être utilisé à des fins médicales dans le cadre d’appels d’offres ?&nbsp;",
            "de": "Besteht die Absicht, diese für medizinische Zwecke bestimmte Anwendung/dieses Instrument/dieses Werkzeug im Rahmen von Ausschreibungen anzubieten?&nbsp;",
            "es": "¿Existe la intención de proponer esta aplicación / este instrumento / esta herramienta destinada a utilizarse con fines médicos en el marco de licitaciones?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ],
      "juridique_france": [
        {
          "text": {
            "en": "Who is the partner responsible for developing the website / app? Communications agency or IT services company?<br>",
            "fr": "Quel est le partenaire en charge de développement du site / app ? Agence de communication our SSII ?<br>",
            "de": "Wer ist der Partner, der für die Entwicklung der Website/App verantwortlich ist? Kommunikationsagentur oder IT-Dienstleister?<br>",
            "es": "¿Quién es el socio encargado del desarrollo del sitio / la app? ¿Una agencia de comunicación o una empresa de servicios informáticos (SSII)?<br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Would the website / app be hosted on LFB's existing servers?&nbsp;",
            "fr": "Le site / app serait-il hébergé sur les serveurs existants du LFB ?&nbsp;",
            "de": "Würde die Website/App auf den bestehenden Servern des LFB gehostet?&nbsp;",
            "es": "¿Se alojaría el sitio / la app en los servidores existentes del LFB?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What rights are desired / what autonomy will LFB have over the developed tool?",
            "fr": "Quels droits sont les droits souhaités / autonomie du LFB par rapport à l’outil développé ?",
            "de": "Welche Rechte werden gewünscht / welche Eigenständigkeit soll der LFB gegenüber dem entwickelten Tool haben?",
            "es": "¿Cuáles son los derechos deseados / el grado de autonomía del LFB respecto a la herramienta desarrollada?"
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
    "teamRoutingRules": [
      {
        "id": "route_1771362458226_y1kl",
        "targetTeamId": "juridique_international",
        "conditionGroups": [
          {
            "logic": "any",
            "conditions": [
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "pays_lies_a_des_filiales_hors_france"
              },
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "other"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "rule16_copy_copy",
    "name": {
      "en": "Study - Legal France X International",
      "fr": "Etude - Juridique France X International",
      "de": "Studie – Juridique France X International",
      "es": "Estudio - Jurídico Francia X Internacional"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q18_copy",
        "operator": "equals",
        "value": "pour_une_enquete_etude"
      },
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "liee_aux_pratiques_medicales"
      },
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "liee_a_la_vie_avec_la_maladie"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q18_copy",
            "operator": "equals",
            "value": "pour_une_enquete_etude"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "liee_aux_pratiques_medicales"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "liee_a_la_vie_avec_la_maladie"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "juridique_france"
    ],
    "questions": {
      "juridique_international": [
        {
          "text": {
            "en": "Who is the partner responsible for developing the application/instrument/tool intended for medical use?&nbsp;<br>",
            "fr": "Qui est le partenaire en charge du développement de l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;<br>",
            "de": "Wer ist der Partner, der für die Entwicklung der für medizinische Zwecke bestimmten Anwendung/des Instruments/des Werkzeugs verantwortlich ist?&nbsp;<br>",
            "es": "¿Quién es el socio encargado del desarrollo de la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;<br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is our role in the project? Promotion?&nbsp;",
            "fr": "Quel est notre rôle dans le projet ? promotion ?&nbsp;",
            "de": "Welche Rolle übernehmen wir im Projekt? Bewerbung?&nbsp;",
            "es": "¿Cuál es nuestro rol en el proyecto? ¿Promoción?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to purchase the application/instrument/tool intended for medical use?&nbsp;",
            "fr": "Volonté d’acheter l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;",
            "de": "Besteht die Absicht, die für medizinische Zwecke bestimmte Anwendung/das Instrument/das Werkzeug zu erwerben?&nbsp;",
            "es": "¿Existe la intención de comprar la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to offer this application / instrument / tool intended for medical use as part of tenders?&nbsp;",
            "fr": "Volonté de proposer cette application / cet instrument / cet outil destiné à être utilisé à des fins médicales dans le cadre d’appels d’offres ?&nbsp;",
            "de": "Besteht die Absicht, diese für medizinische Zwecke bestimmte Anwendung/dieses Instrument/dieses Werkzeug im Rahmen von Ausschreibungen anzubieten?&nbsp;",
            "es": "¿Existe la intención de proponer esta aplicación / este instrumento / esta herramienta destinada a utilizarse con fines médicos en el marco de licitaciones?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ],
      "juridique_france": [
        {
          "text": {
            "en": "Can you describe the study's methodology and objectives?",
            "fr": "Pouvez-vous nous décrire les modalités de l’étude et ses finalités ?",
            "de": "Können Sie uns die Modalitäten und Ziele der Studie beschreiben?",
            "es": "¿Puede describirnos las modalidades del estudio y sus finalidades?"
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
          "en": "Clinical studies",
          "fr": "Etudes cliniques",
          "de": "Klinische Studien",
          "es": "Estudios clínicos"
        },
        "level": "medium",
        "mitigation": {
          "en": "Warning: if your study is reclassified as a clinical study, a specific process must be followed",
          "fr": "Attention, si vous étude est requalifiée d’étude clinique un process spécifique doit être suivi",
          "de": "Achtung, wird Ihre Studie als klinische Studie umqualifiziert, muss ein spezifisches Verfahren befolgt werden",
          "es": "Atención: si su estudio se recalifica como estudio clínico, deberá seguirse un proceso específico"
        },
        "priority": "standard",
        "teamId": "juridique_france",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": [
      {
        "id": "route_1771329196642_yxa1",
        "targetTeamId": "juridique_international",
        "conditionGroups": [
          {
            "logic": "all",
            "conditions": [
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "pays_lies_a_des_filiales_hors_france"
              },
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "other"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "rule16_copy_copy_copy2",
    "name": {
      "en": "Study NDA - Legal France X International",
      "fr": "Etude NDA - Juridique France X International",
      "de": "Studie NDA – Juridique France X International",
      "es": "Estudio NDA - Jurídico Francia X Internacional"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "enquete_etude_de_marche"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "enquete_etude_de_marche"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "juridique_france"
    ],
    "questions": {
      "juridique_international": [
        {
          "text": {
            "en": "Who is the partner responsible for developing the application/instrument/tool intended for medical use?&nbsp;<br>",
            "fr": "Qui est le partenaire en charge du développement de l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;<br>",
            "de": "Wer ist der Partner, der für die Entwicklung der für medizinische Zwecke bestimmten Anwendung/des Instruments/des Werkzeugs verantwortlich ist?&nbsp;<br>",
            "es": "¿Quién es el socio encargado del desarrollo de la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;<br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is our role in the project? Promotion?&nbsp;",
            "fr": "Quel est notre rôle dans le projet ? promotion ?&nbsp;",
            "de": "Welche Rolle übernehmen wir im Projekt? Bewerbung?&nbsp;",
            "es": "¿Cuál es nuestro rol en el proyecto? ¿Promoción?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to purchase the application/instrument/tool intended for medical use?&nbsp;",
            "fr": "Volonté d’acheter l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;",
            "de": "Besteht die Absicht, die für medizinische Zwecke bestimmte Anwendung/das Instrument/das Werkzeug zu erwerben?&nbsp;",
            "es": "¿Existe la intención de comprar la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to offer this application / instrument / tool intended for medical use as part of tenders?&nbsp;",
            "fr": "Volonté de proposer cette application / cet instrument / cet outil destiné à être utilisé à des fins médicales dans le cadre d’appels d’offres ?&nbsp;",
            "de": "Besteht die Absicht, diese für medizinische Zwecke bestimmte Anwendung/dieses Instrument/dieses Werkzeug im Rahmen von Ausschreibungen anzubieten?&nbsp;",
            "es": "¿Existe la intención de proponer esta aplicación / este instrumento / esta herramienta destinada a utilizarse con fines médicos en el marco de licitaciones?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ],
      "juridique_france": [
        {
          "text": {
            "en": "If relevant, before sharing sensitive information with a third party in charge of a study, have them sign an NDA (available as self-service on Legisway)",
            "fr": "Si pertinent, avant de partager des informations sensibles avec un tiers en charge d’une de marché, pensez à lui faire signer un NDA (disponible en self service sur Legisway)",
            "de": "Denken Sie gegebenenfalls daran, vor der Weitergabe sensibler Informationen an einen mit einer Ausschreibung beauftragten Dritten eine Vertraulichkeitsvereinbarung (NDA) unterzeichnen zu lassen (im Self-Service auf Legisway verfügbar)",
            "es": "Si procede, antes de compartir información sensible con un tercero encargado de un estudio de mercado, recuerde hacerle firmar un NDA (acuerdo de confidencialidad, disponible en autoservicio en Legisway)"
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
    "teamRoutingRules": [
      {
        "id": "route_1771329196642_yxa1",
        "targetTeamId": "juridique_international",
        "conditionGroups": [
          {
            "logic": "all",
            "conditions": [
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "pays_lies_a_des_filiales_hors_france"
              },
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "other"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "rule16_copy_copy_copy",
    "name": {
      "en": "Donation of products - Legal France X International",
      "fr": "Don de produits - Juridique France X International",
      "de": "Sachspende – Juridique France X International",
      "es": "Donación de productos - Jurídico Francia X Internacional"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q18",
        "operator": "equals",
        "value": "don_de_produits"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q18",
            "operator": "equals",
            "value": "don_de_produits"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "juridique_france"
    ],
    "questions": {
      "juridique_international": [
        {
          "text": {
            "en": "Who is the partner responsible for developing the application/instrument/tool intended for medical use?&nbsp;<br>",
            "fr": "Qui est le partenaire en charge du développement de l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;<br>",
            "de": "Wer ist der Partner, der für die Entwicklung der für medizinische Zwecke bestimmten Anwendung/des Instruments/des Werkzeugs verantwortlich ist?&nbsp;<br>",
            "es": "¿Quién es el socio encargado del desarrollo de la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;<br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is our role in the project? Promotion?&nbsp;",
            "fr": "Quel est notre rôle dans le projet ? promotion ?&nbsp;",
            "de": "Welche Rolle übernehmen wir im Projekt? Bewerbung?&nbsp;",
            "es": "¿Cuál es nuestro rol en el proyecto? ¿Promoción?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to purchase the application/instrument/tool intended for medical use?&nbsp;",
            "fr": "Volonté d’acheter l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;",
            "de": "Besteht die Absicht, die für medizinische Zwecke bestimmte Anwendung/das Instrument/das Werkzeug zu erwerben?&nbsp;",
            "es": "¿Existe la intención de comprar la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to offer this application / instrument / tool intended for medical use as part of tenders?&nbsp;",
            "fr": "Volonté de proposer cette application / cet instrument / cet outil destiné à être utilisé à des fins médicales dans le cadre d’appels d’offres ?&nbsp;",
            "de": "Besteht die Absicht, diese für medizinische Zwecke bestimmte Anwendung/dieses Instrument/dieses Werkzeug im Rahmen von Ausschreibungen anzubieten?&nbsp;",
            "es": "¿Existe la intención de proponer esta aplicación / este instrumento / esta herramienta destinada a utilizarse con fines médicos en el marco de licitaciones?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ],
      "juridique_france": [
        {
          "text": {
            "en": "Who received the request? DAP, Medical, Marketing?<br>",
            "fr": "Qui a réceptionné la demande ? DAP, Médial, Marketing ?<br>",
            "de": "Wer hat die Anfrage entgegengenommen? DAP, Médial, Marketing?<br>",
            "es": "¿Quién ha recibido la solicitud? ¿DAP, Médico, Marketing?<br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Provide the request letter with all details (which product (INN), which dosage, which hospitals / countries, expiry date if requested by the association, which facility will store the products pending release to an HCP authorized to administer the product)?",
            "fr": "Transmettez le courrier de sollicitation avec l’ensemble des éléments (quel produit (DCI), quel dosage, quels hôpitaux / pays, si demandé par l’association quelle péremption, quel établissement pour le stockage des produits en attendant leur mise à disposition à un PdS habilité à administrer le produit) ?",
            "de": "Übermitteln Sie das Anfrageschreiben mit allen Angaben (welches Produkt (DCI), welche Dosierung, welche Krankenhäuser / Länder, bei Anfrage durch den Verband welches Verfallsdatum, welche Einrichtung für die Lagerung der Produkte bis zu deren Bereitstellung an einen zur Verabreichung berechtigten Angehörigen eines Gesundheitsberufs)?",
            "es": "Remita la carta de solicitud con todos los elementos (qué producto (DCI), qué dosificación, qué hospitales / países, si lo solicita la asociación qué fecha de caducidad, qué centro para el almacenamiento de los productos hasta su puesta a disposición de un PdS habilitado para administrar el producto)"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Is the association authorized to request and receive a product donation?",
            "fr": "Est-ce que l’association est habilitée à solliciter et recevoir un don de produit ?",
            "de": "Ist der Verband berechtigt, eine Produktspende anzufordern und zu erhalten?",
            "es": "¿Está la asociación habilitada para solicitar y recibir una donación de producto?"
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
          "en": "Donation of products",
          "fr": "Don de produits",
          "de": "Sachspende",
          "es": "Donación de productos"
        },
        "level": "high",
        "mitigation": {
          "en": "Product donations are strictly regulated: approval from the Product Donation Committee is required",
          "fr": "Le don de produits est particulièrement encadré : une validation du comité Don de Produits est nécessaire",
          "de": "Sachspenden unterliegen einer besonders strengen Regelung: Eine Validierung durch das Komitee für Produktspenden ist erforderlich",
          "es": "La donación de productos está sujeta a una regulación especialmente estricta: es necesaria la validación del comité de Donación de Productos"
        },
        "priority": "elevated",
        "teamId": "juridique_france",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": [
      {
        "id": "route_1771329403892_64oz",
        "targetTeamId": "juridique_international",
        "conditionGroups": [
          {
            "logic": "any",
            "conditions": [
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "pays_lies_a_des_filiales_hors_france"
              },
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "other"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "rule16_copy_copy_copy_copy",
    "name": {
      "en": "ISS - Legal France IT",
      "fr": "ISS - Juridique France IT",
      "de": "ISS – Juridique France IT",
      "es": "ISS - Jurídico Francia IT"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q18_copy",
        "operator": "equals",
        "value": "etude_interventionnelle_iis"
      },
      {
        "type": "question",
        "question": "q18_copy",
        "operator": "equals",
        "value": "etude_non_interventionnelle_nis"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q18_copy",
            "operator": "equals",
            "value": "etude_interventionnelle_iis"
          },
          {
            "type": "question",
            "question": "q18_copy",
            "operator": "equals",
            "value": "etude_non_interventionnelle_nis"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "juridique_france"
    ],
    "questions": {
      "juridique_international": [
        {
          "text": {
            "en": "Who is the partner responsible for developing the application/instrument/tool intended for medical use?&nbsp;<br>",
            "fr": "Qui est le partenaire en charge du développement de l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;<br>",
            "de": "Wer ist der Partner, der für die Entwicklung der für medizinische Zwecke bestimmten Anwendung/des Instruments/des Werkzeugs verantwortlich ist?&nbsp;<br>",
            "es": "¿Quién es el socio encargado del desarrollo de la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;<br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is our role in the project? Promotion?&nbsp;",
            "fr": "Quel est notre rôle dans le projet ? promotion ?&nbsp;",
            "de": "Welche Rolle übernehmen wir im Projekt? Bewerbung?&nbsp;",
            "es": "¿Cuál es nuestro rol en el proyecto? ¿Promoción?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to purchase the application/instrument/tool intended for medical use?&nbsp;",
            "fr": "Volonté d’acheter l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;",
            "de": "Besteht die Absicht, die für medizinische Zwecke bestimmte Anwendung/das Instrument/das Werkzeug zu erwerben?&nbsp;",
            "es": "¿Existe la intención de comprar la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to offer this application / instrument / tool intended for medical use as part of tenders?&nbsp;",
            "fr": "Volonté de proposer cette application / cet instrument / cet outil destiné à être utilisé à des fins médicales dans le cadre d’appels d’offres ?&nbsp;",
            "de": "Besteht die Absicht, diese für medizinische Zwecke bestimmte Anwendung/dieses Instrument/dieses Werkzeug im Rahmen von Ausschreibungen anzubieten?&nbsp;",
            "es": "¿Existe la intención de proponer esta aplicación / este instrumento / esta herramienta destinada a utilizarse con fines médicos en el marco de licitaciones?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ],
      "juridique_france": [
        {
          "text": {
            "en": "What type of study is this? (NI/RNI/In vitro/Registry)?&nbsp;",
            "fr": "De quel type d’étude s’agit-il ? (NI/RNI/In vitro/ Registre) ?&nbsp;",
            "de": "Um welche Art von Studie handelt es sich? (NI/RNI/In vitro/ Registre)?&nbsp;",
            "es": "¿De qué tipo de estudio se trata? (¿NI/RNI/In vitro/Registro?)&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What amount or quantity of products is requested? Over what period?",
            "fr": "Quel montant ou quantité de produits est demandé ? et sur quel durée ?",
            "de": "Welcher Betrag oder welche Produktmenge wird angefragt? Und über welchen Zeitraum?",
            "es": "¿Qué importe o cantidad de productos se solicita? ¿Y durante qué periodo?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What does LFB's support represent compared to other funders? (in %)",
            "fr": "Que représente le soutien du LFB vs les autres financeurs ? (en %)",
            "de": "Wie hoch ist der Anteil der Unterstützung des LFB im Vergleich zu den anderen Geldgebern? (in %)",
            "es": "¿Qué representa el apoyo del LFB frente a los demás financiadores? (en %)"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you want access to the study results?",
            "fr": "Souhaitez vous accéder aux résultats de l’étude ?",
            "de": "Möchten Sie Zugang zu den Studienergebnissen erhalten?",
            "es": "¿Desea tener acceso a los resultados del estudio?"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you want to reuse the data? If so, for what purpose?",
            "fr": "Souhaitez-vous réutiliser les données ? et si oui, pour quoi ?",
            "de": "Möchten Sie die Daten weiterverwenden? Und wenn ja, wofür?",
            "es": "¿Desea reutilizar los datos? En caso afirmativo, ¿con qué fin?"
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
    "id": "rule16_copy_copy_copy_copy_copy",
    "name": {
      "en": "Publication - Legal France IT",
      "fr": "Publication - Juridique France IT",
      "de": "Publikation – Juridique France IT",
      "es": "Publicación - Jurídico Francia IT"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "redaction_d_abstract_de_poster_articles_scientifiques"
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
            "value": "professionnel_de_sante_hors_france_ou_association_de_pds_societe_savante"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "professionnel_de_sante_francais_ou_association_de_pds_societe_savante"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "juridique_france"
    ],
    "questions": {
      "juridique_international": [
        {
          "text": {
            "en": "Who is the partner responsible for developing the application/instrument/tool intended for medical use?&nbsp;<br>",
            "fr": "Qui est le partenaire en charge du développement de l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;<br>",
            "de": "Wer ist der Partner, der für die Entwicklung der für medizinische Zwecke bestimmten Anwendung/des Instruments/des Werkzeugs verantwortlich ist?&nbsp;<br>",
            "es": "¿Quién es el socio encargado del desarrollo de la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;<br>"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "What is our role in the project? Promotion?&nbsp;",
            "fr": "Quel est notre rôle dans le projet ? promotion ?&nbsp;",
            "de": "Welche Rolle übernehmen wir im Projekt? Bewerbung?&nbsp;",
            "es": "¿Cuál es nuestro rol en el proyecto? ¿Promoción?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to purchase the application/instrument/tool intended for medical use?&nbsp;",
            "fr": "Volonté d’acheter l’application/ instrument/outil destiné à être utilisé à des fins médicales ?&nbsp;",
            "de": "Besteht die Absicht, die für medizinische Zwecke bestimmte Anwendung/das Instrument/das Werkzeug zu erwerben?&nbsp;",
            "es": "¿Existe la intención de comprar la aplicación/instrumento/herramienta destinada a utilizarse con fines médicos?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Do you intend to offer this application / instrument / tool intended for medical use as part of tenders?&nbsp;",
            "fr": "Volonté de proposer cette application / cet instrument / cet outil destiné à être utilisé à des fins médicales dans le cadre d’appels d’offres ?&nbsp;",
            "de": "Besteht die Absicht, diese für medizinische Zwecke bestimmte Anwendung/dieses Instrument/dieses Werkzeug im Rahmen von Ausschreibungen anzubieten?&nbsp;",
            "es": "¿Existe la intención de proponer esta aplicación / este instrumento / esta herramienta destinada a utilizarse con fines médicos en el marco de licitaciones?&nbsp;"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        }
      ],
      "juridique_france": [
        {
          "text": {
            "en": "What is the role of the HCP(s) in drafting the article / abstract / poster?",
            "fr": "Quel est le rôle du / des PS dans le cadre de la rédaction de l’article / abstract / poster ?",
            "de": "Welche Rolle spielt/spielen der/die Angehörige(n) des Gesundheitsberufs bei der Erstellung des Artikels / Abstracts / Posters?",
            "es": "¿Cuál es el rol del/de los PS en la redacción del artículo / resumen (abstract) / póster?"
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
          "en": "Independence of the expert",
          "fr": "Indépendance de l’expert",
          "de": "Unabhängigkeit des Experten",
          "es": "Independencia del experto"
        },
        "level": "low",
        "mitigation": {
          "en": "If the article / abstract / poster is written by a medical writer, the review work by the HCP must be done on a pro bono basis",
          "fr": "Si l’article / abstract / poster est rédigé par un Medical Writter, le travail de relecture par le PS devra être réalisé à titre gracieux",
          "de": "Wird der Artikel / das Abstract / das Poster von einem Medical Writer verfasst, muss die Durchsicht durch den Angehörigen des Gesundheitsberufs unentgeltlich erfolgen",
          "es": "Si el artículo / resumen (abstract) / póster es redactado por un Medical Writer, el trabajo de revisión por parte del PS deberá realizarse a título gratuito"
        },
        "priority": "standard",
        "teamId": "juridique_france",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": [
      {
        "id": "route_1771363595274_yype",
        "targetTeamId": "juridique_international",
        "conditionGroups": [
          {
            "logic": "all",
            "conditions": [
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "pays_lies_a_des_filiales_hors_france"
              },
              {
                "type": "question",
                "question": "q27",
                "operator": "equals",
                "value": "other"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "rule17",
    "name": {
      "en": "Survey / Study - PV",
      "fr": "Enquête Etude - PV",
      "de": "Umfrage Studie – PV",
      "es": "Encuesta / Estudio - PV"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "liee_aux_pratiques_medicales"
      },
      {
        "type": "question",
        "question": "q19",
        "operator": "equals",
        "value": "liee_a_la_vie_avec_la_maladie"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "liee_aux_pratiques_medicales"
          },
          {
            "type": "question",
            "question": "q19",
            "operator": "equals",
            "value": "liee_a_la_vie_avec_la_maladie"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "pharmacovigilance"
    ],
    "questions": {
      "pharmacovigilance": [
        {
          "text": {
            "en": "How will the study/survey be conducted? Who will be in charge of running it? Feel free to share supporting material from the agency that might assist you",
            "fr": "Comment se déroule l’étude / l’enquête ? Qui sera en charge de la menée ? N’hésitez pas à partager un support de l’agence qui pourrait vous accompagner",
            "de": "Wie läuft die Studie / die Umfrage ab? Wer wird für die Durchführung verantwortlich sein? Teilen Sie gerne eine Präsentation der Agentur, die Sie unterstützen könnte",
            "es": "¿Cómo se desarrolla el estudio / la encuesta? ¿Quién estará a cargo de llevarlo a cabo? No dude en compartir un soporte de la agencia que pudiera acompañarle"
          },
          "timingConstraint": {
            "enabled": false,
            "startQuestion": "",
            "endQuestion": ""
          }
        },
        {
          "text": {
            "en": "Can you provide the list of questions that will be asked as part of the study/survey?",
            "fr": "Pouvez-vous transmettre la liste des questions qui seront posées dans le cadre de l’étude /enquête ?",
            "de": "Können Sie die Liste der Fragen übermitteln, die im Rahmen der Studie / Umfrage gestellt werden?",
            "es": "¿Puede facilitar la lista de preguntas que se formularán en el marco del estudio / la encuesta?"
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
          "en": "PV training for the potential service provider",
          "fr": "Formation PV du prestataire éventuel",
          "de": "PV-Schulung des möglichen Dienstleisters",
          "es": "Formación en PV del posible proveedor externo"
        },
        "level": "low",
        "mitigation": {
          "en": "If the provider conducting the study has not been trained in pharmacovigilance (PV), or was trained more than a year ago, they must complete training before the study/survey begins. Please provide the provider's name and the email addresses of the people involved. Allow 15 days",
          "fr": "Si le prestataire qui réalise l’étude n’a pas été formé à la PV ou a été formé depuis plus d’un an, il doit réaliser une formation avant le début de l’étude / de l’enquête. Merci de transmettre le nom du prestataire et les mails des personnes concernées. Il faut compter 15 jours",
          "de": "Wurde der die Studie durchführende Dienstleister nicht in PV geschult oder liegt die Schulung mehr als ein Jahr zurück, muss vor Beginn der Studie / Umfrage eine Schulung absolviert werden. Bitte übermitteln Sie den Namen des Dienstleisters und die E-Mail-Adressen der betroffenen Personen. Es ist mit 15 Tagen zu rechnen",
          "es": "Si el proveedor externo que realiza el estudio no ha recibido formación en PV o la recibió hace más de un año, deberá realizar una formación antes del inicio del estudio / de la encuesta. Facilite el nombre del proveedor externo y los correos electrónicos de las personas implicadas. Debe contarse con un plazo de 15 días"
        },
        "priority": "standard",
        "teamId": "pharmacovigilance",
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
    "id": "rule17_copy",
    "name": {
      "en": "PSP - PV",
      "fr": "PSP - PV",
      "de": "PSP – PV",
      "es": "PSP - PV"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q22",
        "operator": "equals",
        "value": "un_dispositif_structure_d_accompagnement_du_patient_ou_de_son_entourage_par_ex_aidant_pour_l_accompagner_notamment_dans_la_comprehension_de_sa_pathologie_l_usage_de_son_traitement_initiation_observance_gestion_des_effets_indesirables_comprehension_de_la_maladie_soutien_pratique_ou_financier"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q22",
            "operator": "equals",
            "value": "un_dispositif_structure_d_accompagnement_du_patient_ou_de_son_entourage_par_ex_aidant_pour_l_accompagner_notamment_dans_la_comprehension_de_sa_pathologie_l_usage_de_son_traitement_initiation_observance_gestion_des_effets_indesirables_comprehension_de_la_maladie_soutien_pratique_ou_financier"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "pharmacovigilance"
    ],
    "questions": {
      "pharmacovigilance": []
    },
    "risks": [
      {
        "description": {
          "en": "PV training for the potential service provider",
          "fr": "Formation PV du prestataire éventuel",
          "de": "PV-Schulung des möglichen Dienstleisters",
          "es": "Formación en PV del posible proveedor externo"
        },
        "level": "medium",
        "mitigation": {
          "en": "If the project is classified as a PSP and the provider in charge of the patient program has not been trained in pharmacovigilance (PV), or was trained more than a year ago, they must complete training before the study/survey begins. Please provide the provider's name and the email addresses of the people involved. Allow 15 days",
          "fr": "Si le projet est qualité de PSP, le prestataire en charge de programme patient n’a pas été formé à la PV ou a été formé depuis plus d’un an, il doit réaliser une formation avant le début de l’étude / de l’enquête. Merci de transmettre le nom du prestataire et les mails des personnes concernées. Il faut compter 15 jours",
          "de": "Wird das Projekt als PSP eingestuft und wurde der für das Patientenprogramm zuständige Dienstleister nicht in PV geschult oder liegt die Schulung mehr als ein Jahr zurück, muss vor Beginn der Studie / Umfrage eine Schulung absolviert werden. Bitte übermitteln Sie den Namen des Dienstleisters und die E-Mail-Adressen der betroffenen Personen. Es ist mit 15 Tagen zu rechnen",
          "es": "Si el proyecto se califica como PSP y el proveedor externo encargado del programa de pacientes no ha recibido formación en PV o la recibió hace más de un año, deberá realizar una formación antes del inicio del estudio / de la encuesta. Facilite el nombre del proveedor externo y los correos electrónicos de las personas implicadas. Debe contarse con un plazo de 15 días"
        },
        "priority": "standard",
        "teamId": "pharmacovigilance",
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
    "id": "rule17_copy_copy",
    "name": {
      "en": "Free-text fields - PV",
      "fr": "Champs libres - PV",
      "de": "Freitextfelder – PV",
      "es": "Campos libres - PV"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q3",
        "operator": "equals",
        "value": "presence_de_champs_libres_dans_ma_solution"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q3",
            "operator": "equals",
            "value": "presence_de_champs_libres_dans_ma_solution"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "pharmacovigilance"
    ],
    "questions": {
      "pharmacovigilance": [
        {
          "text": {
            "en": "Can you specify the free-text fields present in the project? What are their labels?",
            "fr": "Pouvez-vous nous préciser les champs libres présents dans le cadre du projet ? Quels sont les intitulés ?",
            "de": "Können Sie uns die im Rahmen des Projekts vorhandenen Freitextfelder näher erläutern? Wie lauten die Bezeichnungen?",
            "es": "¿Puede precisarnos los campos libres presentes en el marco del proyecto? ¿Cuáles son sus títulos?"
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
    "id": "rule17_copy_copy_copy",
    "name": {
      "en": "ISS with administration - PV",
      "fr": "ISS avec administration - PV",
      "de": "ISS mit Verabreichung – PV",
      "es": "ISS con administración - PV"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q18_copy",
        "operator": "equals",
        "value": "avec_administration_de_produit"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q18_copy",
            "operator": "equals",
            "value": "avec_administration_de_produit"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "pharmacovigilance"
    ],
    "questions": {
      "pharmacovigilance": [
        {
          "text": {
            "en": "Can you provide the study synopsis, the expected number of patients, and the countries involved?",
            "fr": "Pouvez-vous nous transmettre le synopsis de l’étude, le nombre de patients prévus et les pays concernées ?",
            "de": "Können Sie uns das Studiensynopsis, die geplante Patientenzahl und die betroffenen Länder übermitteln?",
            "es": "¿Puede facilitarnos el sinopsis del estudio, el número de pacientes previstos y los países implicados?"
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
    "id": "rule17_copy_copy_copy_copy",
    "name": {
      "en": "NIS - PV",
      "fr": "NIS - PV",
      "de": "NIS – PV",
      "es": "NIS - PV"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q18_copy",
        "operator": "equals",
        "value": "etude_non_interventionnelle_nis"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q18_copy",
            "operator": "equals",
            "value": "etude_non_interventionnelle_nis"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "pharmacovigilance"
    ],
    "questions": {
      "pharmacovigilance": [
        {
          "text": {
            "en": "What type of data is used in the NIS? Retrospective data?",
            "fr": "Quel type de données sont utilisées dans le cadre de la NIS ? Données rétrospectives ?",
            "de": "Welche Art von Daten wird im Rahmen der NIS verwendet? Retrospektive Daten?",
            "es": "¿Qué tipo de datos se utilizan en el marco de la NIS? ¿Datos retrospectivos?"
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
    "id": "rule17_copy_copy_copy_copy_copy",
    "name": {
      "en": "IIS without administration - PV",
      "fr": "IIS sans administration - PV",
      "de": "IIS ohne Verabreichung – PV",
      "es": "IIS sin administración - PV"
    },
    "conditions": [
      {
        "type": "question",
        "question": "q18_copy",
        "operator": "equals",
        "value": "sans_administration_de_produit"
      }
    ],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q18_copy",
            "operator": "equals",
            "value": "sans_administration_de_produit"
          }
        ]
      }
    ],
    "conditionLogic": "any",
    "teams": [
      "pharmacovigilance"
    ],
    "questions": {
      "pharmacovigilance": [
        {
          "text": {
            "en": "Please use this clause in the ISS contract: XXXXX",
            "fr": "Merci d’utiliser cette clause dans le cadre du contrat ISS : XXXXX",
            "de": "Bitte verwenden Sie diese Klausel im Rahmen des ISS-Vertrags: XXXXX",
            "es": "Utilice esta cláusula en el marco del contrato ISS: XXXXX"
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
    "id": "rule19",
    "name": {
      "en": "Patient association - AP",
      "fr": "Association de patients - AP",
      "de": "Patientenverband – AP",
      "es": "Asociación de pacientes - AP"
    },
    "conditions": [],
    "conditionGroups": [
      {
        "logic": "any",
        "conditions": [
          {
            "type": "question",
            "question": "q10",
            "operator": "equals",
            "value": "association_de_patients_patients"
          },
          {
            "type": "question",
            "question": "q10_copy",
            "operator": "equals",
            "value": "association_de_patients"
          }
        ]
      },
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "teamLeadTeam",
            "operator": "not_equals",
            "value": "affaires_publiques"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "affaires_publiques"
    ],
    "questions": {
      "affaires_publiques": [
        {
          "text": {
            "en": "Which association / patients will you collaborate with?",
            "fr": "Avec quelle association / patients allez-vous collaborer ?",
            "de": "Mit welchem Verband/welchen Patienten werden Sie zusammenarbeiten?",
            "es": "¿Con qué asociación / pacientes va a colaborar?"
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
    "id": "rule19_copy",
    "name": {
      "en": "Patient association integration - AP",
      "fr": "Intégration association patients - AP",
      "de": "Einbindung von Patientenverbänden – AP",
      "es": "Integración de asociación de pacientes - AP"
    },
    "conditions": [
      {
        "type": "question",
        "question": "targetAudience",
        "operator": "equals",
        "value": "patients_association_de_patients"
      },
      {
        "type": "question",
        "question": "q10",
        "operator": "not_equals",
        "value": "association_de_patients_patients"
      }
    ],
    "conditionGroups": [
      {
        "logic": "all",
        "conditions": [
          {
            "type": "question",
            "question": "targetAudience",
            "operator": "equals",
            "value": "patients_association_de_patients"
          },
          {
            "type": "question",
            "question": "q10",
            "operator": "not_equals",
            "value": "association_de_patients_patients"
          }
        ]
      }
    ],
    "conditionLogic": "all",
    "teams": [
      "affaires_publiques"
    ],
    "questions": {
      "affaires_publiques": []
    },
    "risks": [
      {
        "description": {
          "en": "Integration of associations",
          "fr": "Intrégration des associations",
          "de": "Einbindung der Verbände",
          "es": "Integración de las asociaciones"
        },
        "level": "low",
        "mitigation": {
          "en": "For any project targeting patients, we strongly encourage you to collaborate with an association to ensure your project meets a real need ",
          "fr": "Pour tout projet à destination de patients, nous vous incitons fortement à collaborer avec une association afin de vous assurer que votre projet correspond à un besoin réel ",
          "de": "Bei jedem Projekt, das sich an Patienten richtet, empfehlen wir dringend die Zusammenarbeit mit einem Verband, um sicherzustellen, dass Ihr Projekt einem tatsächlichen Bedarf entspricht ",
          "es": "Para todo proyecto dirigido a pacientes, le recomendamos encarecidamente colaborar con una asociación para asegurarse de que su proyecto responde a una necesidad real "
        },
        "priority": "standard",
        "teamId": "affaires_publiques",
        "timingConstraint": {
          "enabled": false,
          "startQuestion": "",
          "endQuestion": ""
        }
      }
    ],
    "teamRoutingRules": []
  }
];
