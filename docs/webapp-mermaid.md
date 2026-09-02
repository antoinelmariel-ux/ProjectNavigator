# Graphique Mermaid — architecture actuelle de la webapp

```mermaid
flowchart TD
    U[Utilisateur] --> A[App.jsx\nOrchestrateur principal]

    A --> H[HomeScreen]
    A --> Q[QuestionnaireScreen]
    A --> S[SynthesisReport]
    A --> I[InspirationForm]
    A --> ID[InspirationDetail]
    A --> PSC["ProjectShowcase<br/>(lazy)"]
    A --> BKO["BackOffice<br/>(lazy)"]
    A --> AL[AnnotationLayer]

    H -->|Ouvrir / créer projet| Q
    Q -->|Continuer| S
    S -->|Ouvrir vitrine| PSC
    H -->|Mode inspiration| I
    I --> ID

    A --> DP[dataProvider]
    A --> IDP[inspirationDataProvider]
    A --> ST[storage local\nloadPersistedState]
    A --> AQ[autosaveQueue]

    DP --> MSP[(mock-sharepoint-lists\nprojects / discussions / files...)]
    IDP --> MSI[(mock-sharepoint-lists\ninspirations)]

    A --> RULES[utils/rules.js\nanalyzeAnswers]
    A --> QUESTIONS[utils/questions.js\nshouldShowQuestion]
    A --> RISK[utils/risk.js\nnormalizeRiskWeighting]

    A --> DATAQ[data/questions.js]
    A --> DATAR[data/rules.js]
    A --> DATAT[data/teams.js]
    A --> DATARC[data/riskLevelRules.js\n& riskWeights.js]

    A --> FOOTER[Footer\nVersion + statut sync + mentions légales]

    BKO --> QED[QuestionEditor]
    BKO --> RED[RuleEditor]
    BKO --> BOD[BackOfficeDashboard]

    PSC --> VC[VirtualizedList]
    PSC --> RTE[RichTextEditor]
```

## Notes

- Le point d’entrée est `src/main.jsx` qui monte `App`.
- `App.jsx` pilote la navigation par écran (`home`, `questionnaire`, `synthesis`, `showcase`, `backoffice`) et les droits/états globaux.
- Les données métier proviennent des datasets locaux et des providers simulant SharePoint.
