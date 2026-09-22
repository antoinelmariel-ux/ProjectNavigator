# Architecture technique

> Public : développeurs et mainteneurs. Décrit l'état actuel du code après la bascule vers
> SharePoint. Pour les listes/flux SharePoint en détail : voir
> [`architecture-sharepoint.md`](architecture-sharepoint.md) et le dossier
> [`migration-v2/`](migration-v2/README.md). Pour les conventions de code au quotidien (règles
> de hooks, pièges connus, patrons à respecter module par module), la référence exhaustive reste
> [`/CLAUDE.md`](../CLAUDE.md) — ce document en donne la vue d'ensemble, pas le détail complet.

## 1. Ce que fait l'application

Project Navigator qualifie les enjeux réglementaires d'un projet à travers un questionnaire
adaptatif, calcule un score de risque en temps réel, produit une synthèse partageable (« Enjeux du
projet »), route les demandes d'avis vers des équipes de conformité désignées, et offre un
back-office pour administrer questions/règles/équipes. L'interface est en français ; les
identifiants de code sont en anglais.

## 2. Contrainte fondatrice : zéro installation, zéro serveur

L'application doit pouvoir s'ouvrir en double-cliquant `index.html` (`file://`, sans serveur, sans
`npm`) **ou** être déposée dans une bibliothèque SharePoint et servie en HTTPS
(`.../CN-App/index.aspx`). Cette double contrainte façonne toute l'architecture :

- **Pas de bundler, pas de module ES natif** (bloqués sous `file://`) : un système de modules
  « maison » exécute du code déjà transpilé.
- **Pas de backend applicatif** : les données vivent soit dans des fichiers JSON simulés (mode
  local), soit dans des listes/bibliothèques SharePoint, adressées directement depuis le navigateur.
- **Pas d'envoi d'e-mail depuis le code** : délégué à Power Automate (voir §6).

`npm` n'intervient jamais côté utilisateur final ; il ne sert qu'au développement (tests, lint,
génération du manifeste).

## 3. Le système de modules « manifeste »

Le code source JSX vit dans `src/`, mais **le navigateur n'exécute jamais ce JSX directement**. Un
build Babel hors-ligne (`scripts/generate-module-manifest.js`) transpile chaque module et injecte
le résultat dans deux fichiers générés :

- `src/module-manifest.js` — modules du premier rendu (« core »).
- `src/module-manifest.deferred.js` — composants lourds chargés après le premier affichage
  (`BackOffice.jsx`, `ProjectShowcase.jsx`, `SynthesisReport.jsx` et les modules de
  `src/components/showcase/*.jsx`, soit environ 40 % du code), listés dans `DEFERRED_MODULES`
  (`scripts/generate-module-manifest.js`) et dans les wrappers `React.lazy` de
  `src/lazyComponents.jsx`.

`src/module-loader.js` est un petit chargeur façon CommonJS : il résout le code de chaque module
depuis le manifeste en mémoire et l'exécute via `new Function` — **il ne transpile rien**, Babel
n'est jamais chargé dans le navigateur. `index.html` charge, dans l'ordre : React/ReactDOM
vendorés (globals) → `module-manifest.js` → `module-loader.js` → `module-manifest.deferred.js`
(`defer`) → un bootstrap inline qui appelle `ModuleLoader.import('./src/main.jsx')`.
`src/react.js` réexporte le `window.React` global pour que les modules puissent faire des `import`
React classiques.

**Conséquence pour tout développeur** : après avoir modifié un fichier sous `src/`, il faut
régénérer le manifeste (`npm run generate:manifest`, ou `npm run build` pour la chaîne complète
mocks + CSS + manifeste), sinon le navigateur continue d'exécuter l'ancien code — il n'y a pas de
serveur de développement à rechargement à chaud.

`npm run generate:manifest` produit en réalité **cinq fichiers, pas deux** : les deux manifestes
`.js` ci-dessus, plus `module-manifest.core.txt`, `module-manifest.deferred.txt` et
`module-manifest.version.txt` — le même code transpilé, au format texte/JSON. Ce doublon existe
pour contourner une contrainte SharePoint : quand l'autorisation « scripts personnalisés » d'un
site retombe (Microsoft la remet à sa valeur par défaut au bout de 24 h), les fichiers `.js` ne
sont plus remplaçables dans la bibliothèque, mais les `.txt` le restent. Sous `http(s)`,
`index.html` télécharge les trois `.txt`, vérifie qu'ils annoncent la même version, et ne remplace
`window.__COMPLIANCE_NAVIGATOR_MANIFEST__` qu'à cette condition ; tout écart (fichier manquant,
tronqué, versions incohérentes) fait retomber silencieusement sur les `.js` embarqués. Sous
`file://`, ce mécanisme de téléchargement est entièrement ignoré. Procédure de publication
détaillée : [`migration-v2/DEPLOIEMENT-MISE-A-JOUR-SANS-CUSTOM-SCRIPT.md`](migration-v2/DEPLOIEMENT-MISE-A-JOUR-SANS-CUSTOM-SCRIPT.md).

`src/vendor/babel.min.js` est présent dans le dépôt mais **n'est chargé par aucune balise
`<script>` de `index.html`** : c'est un résidu, sans effet sur le fonctionnement actuel.

## 4. Structure du code (`src/`)

| Dossier/fichier | Rôle |
|---|---|
| `App.jsx` | Composant racine (~8 000 lignes) : possède la quasi-totalité de l'état applicatif et le distribue aux écrans par props (pas de React Context). |
| `main.jsx` | Point d'entrée : résout l'identité (`initSharePointContext`), applique une éventuelle simulation d'identité, monte `<App />` sous un `AppErrorBoundary` qui signale automatiquement tout plantage. |
| `components/` | Écrans et composants d'interface (`HomeScreen.jsx`, `QuestionnaireScreen.jsx`, `SynthesisReport.jsx`, `BackOffice.jsx`, `ProjectShowcase.jsx`…) ; `components/showcase/` porte la chrome de l'éditeur de vitrine. |
| `utils/` | Logique métier pure et accès aux données : moteur de règles/questions, fournisseurs de données (mock et SharePoint), client REST SharePoint, files d'attente, gabarits de notification, etc. — voir §5 et §6. |
| `data/` | Référentiels par défaut (`questions.js`, `rules.js`, `teams.js`, `riskWeights.js`, `riskLevelRules.js`, `showcaseThemes.js`, `demoProject.js`, `onboardingTour.js`, données mock SharePoint générées). |
| `i18n/` | Détection et traduction (4 langues : anglais, français, allemand, espagnol). |
| `config/sharepointConfig.js` | Le seul aiguillage mock/SharePoint de toute l'application (`isSharePointMode()`), noms des listes/bibliothèques, dérivation de l'URL du site. |
| `styles/` | CSS écrit à la main + `tailwind-internal.css`, généré. |
| `vendor/` | React/ReactDOM vendorés, `tourguide.js` (visite guidée). |

## 5. État applicatif et persistance

`App.jsx` est un composant-Dieu : ~57 `useState`, aucun découpage en Context. Tout l'état est
sérialisé dans **une seule** clé `localStorage`, `complianceNavigatorState`
(`src/utils/storage.js`), avec un debounce de 400 ms et un flush synchrone sur `pagehide` pour ne
pas perdre les toutes dernières modifications à la fermeture de l'onglet. Les référentiels
volumineux (questions, règles…) sont persistés **en delta seulement** (rien n'est écrit s'ils sont
identiques aux valeurs par défaut). `storage.js` détecte les dépassements de quota et déclenche une
bannière utilisateur.

En mode local/simulé, d'autres providers (`userProfileProvider.js`, `projectMembersProvider.js`,
`complianceCommentsProvider.js`, `showcaseStickyNotesProvider.js`…) persistent chacun leurs
données via `src/utils/mockProviderPersistence.js` (une clé `localStorage` dédiée par entité), pas
une simple `Map` en mémoire — sans quoi ces données disparaîtraient à chaque rechargement de page.

## 6. Accès aux données : `dataProvider` et le double mode

`src/utils/dataProvider.js` exporte un unique `dataProvider`, choisi selon `isSharePointMode()` :

- **`MockSharePointProvider`** (mode local/dev, par défaut hors origine `*.sharepoint.com`) :
  données en mémoire, initialisées depuis `src/data/mockSharePoint*.js` — eux-mêmes générés à
  partir de `mock-sharepoint-lists/*.json` par `scripts/sync-mock-sharepoint-data.js`.
- **`SharePointRestProvider`** (mode SharePoint) : lit/écrit réellement dans les listes SharePoint
  via `src/utils/listRepository.js` (CRUD générique) et `src/utils/spRestClient.js` (client REST —
  seul module du projet qui appelle `fetch`, toujours vers l'origine SharePoint courante).

Les deux implémentent la même interface (`listProjects()`, `upsertProject(...)`), avec la même
sémantique de concurrence optimiste par `RowVersion` (`ConflictError` en cas d'écriture concurrente
détectée). Le même patron (« provider mock » / « provider SharePoint », choisi par
`isSharePointMode()`) est répété pour les autres entités : inspirations, membres de projet,
commentaires de conformité, post-its de vitrine, profils utilisateurs, règles et équipes. Le détail
des 14 listes SharePoint et de leurs colonnes est dans
[`architecture-sharepoint.md`](architecture-sharepoint.md) et
[`src/utils/listSchemas.js`](../src/utils/listSchemas.js) (source de vérité).

**Écritures réseau flaky** : les entités synchronisées avec SharePoint passent par
`src/utils/retryQueue.js` (file d'attente avec réessais à délai croissant, rejouée au retour de
connexion). Les projets gardent leur propre file plus ancienne, `src/utils/autosaveQueue.js`.

**Identité** : `src/utils/spContext.js#getCurrentUser()` est le point de lecture unique de
l'identité applicative. En mode SharePoint, elle vient de `/_api/web/currentUser` (aucun écran de
connexion : la session SPO est déjà active). En mode local, elle vient d'un JSON de démonstration
(`src/data/graph-current-user.json`). Un administrateur peut aussi consulter l'application « en
tant que » une autre personne dans un second onglet (`src/utils/impersonation.js`) — tous les
chemins d'écriture y sont neutralisés (voir `docs/securite-donnees.md`).

## 7. Notifications : jamais d'envoi direct

Aucune route du code n'envoie de courrier ou de message Teams. `src/utils/notificationQueue.js`
dépose une demande dans la liste SharePoint `CN_NotificationsQueue` (ou journalise en `console.info`
en mode local) ; un flux Power Automate externe au code applicatif lit cette file et envoie
réellement le message (voir [`architecture-sharepoint.md`](architecture-sharepoint.md)). Les
gabarits des 9 types de messages sont dans `src/utils/notificationTemplates.js`, appelés depuis un
point unique (`notify(...)` dans `App.jsx`).

## 8. Le moteur de règles et de questions (le cœur métier)

C'est la partie la plus critique en termes de correctness, couverte par des tests dédiés :

- `src/utils/questions.js` — visibilité adaptative des questions (`shouldShowQuestion`),
  évaluation de conditions (`equals`/`not_equals`/`contains`/`lt`/`lte`/`gt`/`gte`, groupes
  `all`/`any`).
- `src/utils/rules.js` — `analyzeAnswers(answers, rules, riskLevelRules, riskWeighting)` : retourne
  les règles déclenchées, les équipes concernées, les risques identifiés, le score de risque total.
- `src/utils/conditionGroups.js` — normalise l'ancienne forme `conditions`/`conditionLogic` vers
  `conditionGroups` (compatibilité ascendante).
- Données de référence : `src/data/rules.js` (~4 000 lignes), `src/data/questions.js`
  (~3 800 lignes), administrées depuis le back-office.

Toute modification de cette zone doit garder `npm test` vert : les tests fixent le comportement de
scoring sur le projet de démonstration (`src/data/demoProject.js`).

## 9. Tests

| Commande | Ce qu'elle couvre |
|---|---|
| `npm test` | Suite unitaire (`test/*.test.mjs`, 53 fichiers au moment de la rédaction), exécutée par le runner natif de Node (`node --test`), zéro dépendance d'exécution, logique pure importée directement depuis `src/utils/*`. |
| `npm run test:e2e` | Suite Playwright séparée (`e2e/*.spec.js`, 25 specs), qui construit l'application, la sert via un serveur statique jetable (`scripts/serve-e2e.js`) et pilote un vrai navigateur. N'est **pas** incluse dans `npm test`. |
| `npm run lint` | ESLint (config plate, `eslint.config.mjs`), y compris `react-hooks/rules-of-hooks`, décisif sur un composant aussi volumineux qu'`App.jsx`. |

## 10. Build et déploiement

```bash
npm install            # outillage de développement uniquement (jamais côté utilisateur final)
npm run build           # generate:mocks + generate:css + generate:manifest
npm run generate:manifest   # transpile src/ -> les cinq fichiers manifeste
npm run generate:mocks      # mock-sharepoint-lists/*.json -> src/data/mockSharePoint*.js
npm run generate:css        # scanne les classes Tailwind utilisées -> tailwind-internal.css
npm test                    # suite unitaire
npm run test:e2e            # suite Playwright
npm run lint / lint:fix
npm run format               # Prettier (ne pas reformater en masse des fichiers existants sans raison — diffs énormes)
```

`scripts/package.json` fige `"type": "commonjs"` (les scripts de génération sont CommonJS) alors
que le `package.json` racine est `"type": "module"` : garder tout nouveau script de génération en
CommonJS sous peine de le casser.

Déploiement en environnement SharePoint réel : voir
[`migration-v2/DEPLOIEMENT-MISE-A-JOUR-SANS-CUSTOM-SCRIPT.md`](migration-v2/DEPLOIEMENT-MISE-A-JOUR-SANS-CUSTOM-SCRIPT.md)
(procédure liée au verrou « scripts personnalisés » de 24 h de SharePoint) et
[`migration-v2/PREPARATION-SHAREPOINT-POWERAUTOMATE.md`](migration-v2/PREPARATION-SHAREPOINT-POWERAUTOMATE.md)
(ce qu'un administrateur doit créer côté SharePoint/Power Automate avant la première mise en
service).

## 11. Dépendances

Aucune dépendance d'exécution (`package.json` ne déclare aucune section `dependencies`) : React et
ReactDOM sont vendorés en fichiers statiques (`src/vendor/`), pas installés via `npm` côté
utilisateur final. Les seules dépendances sont des `devDependencies` (Babel pour la transpilation
hors-ligne, ESLint, Prettier, Playwright) utilisées uniquement pendant le développement.

## 12. Ce qui n'a pas pu être vérifié dans le code

- L'état d'avancement réel de la recette sur l'environnement SharePoint (phase « Build &
  vérification » de `migration-v2/GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md`, marquée « à faire »
  au moment de la rédaction) — à confirmer auprès de l'équipe projet.
- L'existence d'un environnement SharePoint de production distinct de l'environnement de
  développement : `migration-v2/ENVIRONNEMENTS.md` liste un site de production « à créer ».
- L'activation effective (et non simplement documentée) de chacun des flux Power Automate sur
  l'environnement réel — le code ne peut attester que du mécanisme (dépôt d'une ligne dans une
  liste), pas de la configuration Power Automate elle-même, qui vit hors du dépôt de code.
