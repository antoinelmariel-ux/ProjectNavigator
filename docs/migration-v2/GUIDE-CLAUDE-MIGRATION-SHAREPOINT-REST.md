# Guide de migration vers l'API REST SharePoint (+ Power Automate) — instructions pour Claude Code

> **Public de ce document : Claude Code.** Il décrit pas à pas comment brancher l'application
> Project Navigator sur de vraies listes et bibliothèques SharePoint via l'**API REST SharePoint
> (`/_api/…`)**, en remplacement des données simulées (mock JSON + localStorage).
>
> **Stratégie retenue (mise à jour) : PAS de Microsoft Graph, PAS de MSAL, PAS d'app
> registration Azure AD, PAS de consentement admin.** L'application est servie depuis l'origine
> SharePoint (`https://lfb1.sharepoint.com/sites/…`) : le navigateur envoie donc automatiquement
> les cookies de session SharePoint Online, et les appels same-origin vers `/_api/…` sont
> authentifiés sans aucune brique d'authentification côté application.
>
> **Documents à ignorer** : tout le contenu de `docs/` antérieur (`migration-sharepoint-graph.md`,
> `prompt-chatgpt-codex-migration-sharepoint.md`, …) **et** `_obsolete/OBSOLETE-guide-migration-graph-msal.md`
> (précédente stratégie Graph/MSAL, abandonnée faute de droits). Ce guide est la seule référence.
>
> Document jumeau : `PREPARATION-SHAREPOINT-POWERAUTOMATE.md` (ce que l'utilisateur prépare
> côté SharePoint et Power Automate).

---

## État d'avancement

| Phase | État | Livrables |
|---|---|---|
| 1 — Configuration | ✅ Fait | `src/config/sharepointConfig.js`, `src/utils/errors.js` |
| 2 — Contexte SharePoint | ✅ Fait | `src/utils/spContext.js` ; `main.jsx` résout l'identité avant le premier rendu ; `App.jsx` lit `getCurrentUser()` |
| 3 — Client REST | ✅ Fait | `src/utils/spRestClient.js` (digest, réessais 429/503, 403→renouvellement, HTML→`SessionExpiredError`, 412→`ConflictError`, pagination) |
| 4 — Dépôts de listes | ✅ Fait | `src/utils/listSchemas.js` (12 listes déclaratives), `src/utils/listRepository.js` (CRUD + `upsertByKey` RowVersion + IF-MATCH) |
| 5 — Fournisseurs de données | ✅ Fait | `SharePointRestProvider` (projets) et `SharePointInspirationProvider` ; aiguillage `isSharePointMode()` à l'export ; appels synchrones neutralisés par garde. Complété depuis par cinq fournisseurs supplémentaires, même patron : `src/utils/projectMembersProvider.js` (partage de projet), `src/utils/showcaseStickyNotesProvider.js` (post-its, avec réponses et pièces jointes), `src/utils/complianceCommentsProvider.js` (commentaires de conformité, une ligne par commentaire/réponse), `src/utils/rulesProvider.js`/`teamsProvider.js` (règles/équipes, une ligne par élément — voir §6 bis) |
| 6 — Référentiels `CN-Config` | ✅ Fait | `src/utils/referentialStore.js` (5 fichiers — `rules`/`teams` en sont sortis, migrés vers `CN_Rules`/`CN_Teams` en §6 bis) ; `sharePointSetup.js` recâblé (Graph supprimé) ; diagnostic + confirmation avant écrasement dans le handler `App.jsx` |
| 7 — Notifications | ✅ Fait | `src/utils/notificationQueue.js`, `src/utils/notificationTemplates.js` (9 types) ; `notify()` unique dans `App.jsx` ; 2 notifications manquantes ajoutées (soumission, ajout de co-porteur). Configuration du flux : [`MODE-OPERATOIRE-POWER-AUTOMATE.md`](MODE-OPERATOIRE-POWER-AUTOMATE.md) |
| 8 — Hydratation `App.jsx` | ✅ Fait | Effet unique « cache d'abord, serveur ensuite » ; `src/utils/syncMerge.js` ; bannières de statut (`loading` / `partial` / `error` / `session-expired`) ; inspirations chargées depuis la liste. Complété par le chargement en bloc des commentaires de conformité (`complianceCommentsProvider.listAllComments()`, une seule requête pour tous les projets) puis fusion avec le JSON local via `src/utils/mergeComplianceComments.js` (SharePoint prioritaire par équipe/comité, repli local sinon) — protégé par son propre `.catch()` pour ne jamais bloquer le chargement des projets |
| 9 — Documents | ✅ Fait | `src/utils/documentStore.js` (validation, dossiers, `Files/add`, index `CN_FilesIndex`) ; les pièces jointes des annotations (`App.jsx`) et des commentaires compliance (`SynthesisReport.jsx`) ne sont plus stockées en base64 |
| 10 — Build & vérification | ⬜ À faire | Reste la recette sur le site DEV (voir `PREPARATION-SHAREPOINT-POWERAUTOMATE.md` étape 8) |
| 11 — Résilience réseau | ✅ Fait | `src/utils/retryQueue.js` : file d'attente générique avec réessais à délai croissant, réutilisée pour les membres/post-its/commentaires (`autosaveQueue.js`, spécifique aux projets, reste inchangé). Un écouteur `online`/`offline` unique dans `App.jsx` relance les files au retour de connexion et pilote un bandeau « hors ligne » — rejoue toujours uniquement les éléments en attente, jamais un renvoi complet de l'état local |
| 12 — Profil utilisateur & onboarding | ✅ Fait | Nouvelle liste `CN_UserProfiles` (une ligne par personne, clé `UserEmail`) et `src/utils/userProfileProvider.js`, même patron que les autres fournisseurs. Écran `OnboardingScreen.jsx` affiché à la première connexion (tant que `HasCompletedOnboarding` n'est pas vrai) pour choisir le périmètre d'activité, puis proposition de la visite guidée existante (`handleStartOnboarding`, inchangée) ; section « Mon profil » (modale dans `App.jsx`) pour modifier ensuite périmètre et langue. Le périmètre d'activité est exposé comme pseudo-question (`getConditionQuestionEntries` dans `src/utils/questions.js`) et devient ainsi sélectionnable comme condition dans l'éditeur de règles/questions du back-office, sans changement du moteur d'évaluation lui-même |

Deux mécanismes JSON locaux devenus obsolètes ont été supprimés (ne pas les réintroduire) :
le dossier `submitted-projects/`/`submitted-inspirations/` (import automatique de fichiers
déposés — déjà du code mort avant sa suppression) et le bouton manuel « Sauvegarder/Charger »
des post-its avec son filet de secours JSON au moment de quitter la vitrine (obsolète depuis que
les post-its sont synchronisés en direct).

Tests associés : `test/sharepointConfig.test.mjs`, `test/spRestClient.test.mjs`,
`test/listSchemas.test.mjs`, `test/listRepository.test.mjs`, `test/referentialStore.test.mjs`,
`test/dataProviderSharePoint.test.mjs`, `test/syncMerge.test.mjs`,
`test/notificationTemplates.test.mjs`, `test/notificationQueue.test.mjs`,
`test/documentStore.test.mjs`, `test/projectMembersProvider.test.mjs`,
`test/showcaseStickyNotesProvider.test.mjs`, `test/complianceCommentsProvider.test.mjs`,
`test/mergeComplianceComments.test.mjs`, `test/retryQueue.test.mjs`,
`test/userProfileProvider.test.mjs`, `test/rulesProvider.test.mjs`, `test/teamsProvider.test.mjs`
(175 tests verts au total).

⚠️ **Piège CSS confirmé en phase 8** : `scripts/generate-tailwind-lite.js` ne détecte que les
`className="…"` **littéraux et entre guillemets doubles** (regex `class(?:Name)?\s*=\s*"…"`).
Une classe passée via `className={…}` n'est jamais générée. Avant d'utiliser une classe dans une
nouvelle UI, vérifier qu'elle existe : `grep -E "^\.ma-classe *[,{]" src/styles/tailwind-internal.css`.
`.claude/launch.json` sert uniquement à vérifier l'app dans un navigateur en développement
(serveur statique) ; il ne change rien au fonctionnement en `file://` ni sur SharePoint.

---

## 0. Contraintes non négociables

1. **Zéro serveur, zéro dépendance d'authentification.** L'app reste un ensemble de fichiers
   statiques déposés dans une bibliothèque SharePoint, avec `index.aspx` comme point d'entrée
   (une page `.aspx` est exécutée par SharePoint, un `.html` est téléchargé). L'authentification
   est **implicite** : cookies de session SPO, requêtes same-origin. Ne jamais ajouter MSAL,
   ni un `clientId`, ni un `tenantId`, ni un secret.
2. **Aucun envoi d'e-mail depuis l'application — et aucune alternative technique n'existe.**
   - Graph `sendMail` : **interdit** par la politique de sécurité du tenant.
   - `/_api/SP.Utilities.Utility.SendEmail` : **retirée par Microsoft**, l'endpoint ne fonctionne
     plus. Testé le 2026-08-28 sur `lfb1.sharepoint.com` → `HTTP 400`,
     `System.InvalidOperationException` : « L'API SendEmail a été mise hors service ».
     Ne pas la réessayer, ne pas la proposer.

   Toutes les notifications passent donc par la liste « file d'attente »
   `CN_NotificationsQueue`, consommée par un flux Power Automate — qui est par ailleurs la voie
   de remplacement recommandée par Microsoft.
3. **Le mode mock doit continuer à fonctionner à l'identique.** En `file://` (développement
   local) ou hors origine SharePoint, l'app se comporte exactement comme aujourd'hui (mocks +
   localStorage). `npm test` doit rester vert : les tests tournent sous Node sans `window`, donc
   **aucun module importé par les utilitaires purs ne doit toucher `window`/`fetch` au moment de
   l'import** (accès paresseux uniquement, à l'intérieur des fonctions).
4. **Respecter CLAUDE.md** : après toute modification sous `src/`, lancer
   `npm run generate:manifest` (sinon le navigateur continue d'exécuter l'ancien code). Ne jamais
   éditer à la main les fichiers générés. Pas de commentaires sauf « pourquoi » non évident.
   Règles des Hooks : aucun `return` anticipé avant les hooks.
5. **Quand REST ne suffit pas → Power Automate.** Tout ce que l'utilisateur courant n'a pas le
   droit de faire, ou qui sort de SharePoint (e-mail, Teams, planification, écriture privilégiée),
   se délègue à un flux déclenché par la création d'un élément dans une liste. L'app **écrit une
   demande dans une liste**, le flux fait le travail. C'est le seul motif d'intégration
   Power Automate autorisé (voir §8 pour les raisons d'écarter le déclencheur HTTP).

---

## 1. Vue d'ensemble de la cible

```
Navigateur — page https://lfb1.sharepoint.com/sites/<site>/CN-App/index.aspx
 │  (cookies de session SPO envoyés automatiquement — same-origin, aucun jeton à gérer)
 ├─ spRestClient.js ─────► https://lfb1.sharepoint.com/sites/<site>/_api/…
 │    ├─ /web/currentUser                       (identité — remplace graph-current-user.json)
 │    ├─ /web/lists/getbytitle('CN_…')/items    (12 listes de données, cf. §5)
 │    ├─ /web/GetFileByServerRelativeUrl(…)     (CN-Config : référentiels JSON)
 │    └─ /web/GetFolderByServerRelativeUrl(…)   (CN-Documents : pièces jointes)
 ├─ localStorage ────────► cache de démarrage + brouillon hors-ligne (conservé tel quel)
 └─ CN_NotificationsQueue ──► Power Automate ──► e-mail / Teams (jamais depuis l'app)
```

Correspondance données actuelles → cible :

| Aujourd'hui | Cible SharePoint |
|---|---|
| `mock-sharepoint-lists/projects.json` (`MockSharePointProvider`) | Liste `CN_Projects` |
| `inspirations.json` | Liste `CN_Inspirations` |
| `compliance-comments.json` | Liste `CN_ComplianceComments` |
| `project-discussions.json` | Liste `CN_ProjectDiscussions` |
| `project-members.json` | Liste `CN_ProjectMembers` |
| `backoffice-changes.json` | Liste `CN_BackofficeChanges` |
| `showcase-sticky-notes.json` | Liste `CN_ShowcaseStickyNotes` |
| `files-index.json` | Liste `CN_FilesIndex` + fichiers réels dans `CN-Documents` |
| `rules`/`teams` (persistés en delta dans localStorage) | Listes `CN_Rules`/`CN_Teams`, une ligne par élément (§6 bis) |
| Autres référentiels du back-office persistés en delta dans localStorage | Fichiers JSON dans `CN-Config` (§7) |
| `src/data/graph-current-user.json` | `GET /_api/web/currentUser` |
| `sendGraphNotificationEmail` (console.info) | Élément dans `CN_NotificationsQueue` (§8) |
| localStorage `complianceNavigatorState` | Conservé comme **cache** ; la source de vérité devient SharePoint |

**Ce qui reste volontairement en localStorage** (état d'interface propre à chaque utilisateur,
inutile à partager) : `activeProjectId`, `activeInspirationId`, `homeView`, `projectFilters`,
`inspirationFilters`.

---

## 2. Phase 1 — Configuration et détection du mode d'exécution

**Créer `src/config/sharepointConfig.js`** :

```js
const KNOWN_APP_FOLDER = '/CN-App/';

// Le point d'entrée est /sites/<site>/CN-App/index.aspx : l'URL du "web" SharePoint
// est tout ce qui précède le dossier de l'app. `_api` n'existe qu'au niveau du web
// (/sites/<site>/_api), jamais au niveau d'un sous-dossier de bibliothèque.
const deriveWebUrl = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  const { origin, pathname } = window.location;
  const index = pathname.indexOf(KNOWN_APP_FOLDER);
  if (index === -1) {
    return origin;
  }
  return origin + pathname.slice(0, index);
};

export const sharepointConfig = {
  webUrl: deriveWebUrl(),
  lists: {
    projects: 'CN_Projects',
    inspirations: 'CN_Inspirations',
    complianceComments: 'CN_ComplianceComments',
    projectDiscussions: 'CN_ProjectDiscussions',
    projectMembers: 'CN_ProjectMembers',
    backofficeChanges: 'CN_BackofficeChanges',
    showcaseStickyNotes: 'CN_ShowcaseStickyNotes',
    filesIndex: 'CN_FilesIndex',
    notificationsQueue: 'CN_NotificationsQueue',
    userProfiles: 'CN_UserProfiles'
  },
  libraries: {
    config: 'CN-Config',
    documents: 'CN-Documents'
  }
};

export const isSharePointMode = () =>
  typeof window !== 'undefined' &&
  window.location.protocol === 'https:' &&
  /\.sharepoint\.com$/i.test(window.location.hostname);
```

- `isSharePointMode()` est **l'unique aiguillage mock/SharePoint** de toute l'app.
- `webUrl` est dérivée automatiquement de l'URL de la page : aucun identifiant à saisir, aucun
  fichier de configuration à remplir par l'utilisateur, l'app est portable d'un site à l'autre.
  Prévoir malgré tout une surcharge optionnelle (`window.__CN_WEB_URL__` lue si définie) pour les
  cas où l'app serait déposée dans un dossier différent de `CN-App`.
- **Aucun secret ici** : ce fichier ne contient que des noms de listes et une URL publique.

**Fait quand** : le fichier existe, `npm test` et `npm run lint` verts, manifest régénéré,
comportement en `file://` strictement inchangé.

---

## 3. Phase 2 — Contexte SharePoint : digest de formulaire et utilisateur courant

Il n'y a pas d'authentification à écrire, mais **toute écriture REST exige un jeton anti-CSRF**
appelé *form digest*.

**Créer `src/utils/spContext.js`** :

1. `getRequestDigest()` :
   - `POST {webUrl}/_api/contextinfo` avec `Accept: application/json;odata=nometadata` (aucun
     corps, aucun autre en-tête) → réponse `{ FormDigestValue, FormDigestTimeoutSeconds }`.
   - Mettre la valeur en cache mémoire avec sa date d'expiration ; la renouveler à **80 % du
     `FormDigestTimeoutSeconds`** (typiquement 1800 s → renouvellement à 1440 s).
   - Exposer `invalidateDigest()` pour forcer un renouvellement (utilisé par le client REST sur
     403, cf. §4).
   - Le digest n'est **jamais** requis pour les `GET`.
2. `fetchCurrentUser()` :
   - `GET {webUrl}/_api/web/currentUser?$select=Id,Title,Email,LoginName,IsSiteAdmin`
   - **Adapter la forme** pour ne rien changer dans `App.jsx`, qui lit aujourd'hui
     `mail`, `userPrincipalName`, `displayName`, `givenName`, `surname` :

     ```js
     // SP.User ne fournit ni givenName ni surname : `displayName` suffit,
     // App.jsx retombe déjà dessus quand le prénom/nom sont absents.
     const toAppUser = (spUser) => ({
       displayName: spUser.Title || '',
       mail: spUser.Email || emailFromLoginName(spUser.LoginName),
       userPrincipalName: spUser.Email || emailFromLoginName(spUser.LoginName),
       id: String(spUser.Id ?? '')
     });
     ```
   - `emailFromLoginName` : `Email` est parfois vide selon la configuration du tenant ; le
     `LoginName` a la forme `i:0#.f|membership|prenom.nom@lfb.fr` → extraire la partie après le
     dernier `|`. **Ne pas sauter ce repli** : sans e-mail, la détection admin
     (`normalizedAdminEmails.includes(currentUserEmail)`) et les notifications tombent en panne.
3. `initSharePointContext()` : en mode mock → renvoie l'objet importé de
   `src/data/graph-current-user.json` ; en mode SharePoint → `fetchCurrentUser()`.
4. **`src/main.jsx`** : rendre le bootstrap asynchrone (`await initSharePointContext()`) avant de
   monter `<App />`, puis passer l'utilisateur résolu. **Dans `App.jsx`, remplacer l'import
   statique de la ligne 48** (`import currentUser from './data/graph-current-user.json'`) par
   cette source (prop ou petit module `src/utils/currentUser.js` qui mémorise le résultat).
   Conserver le JSON comme valeur du mode mock. ⚠️ `currentUserEmail` est un `useMemo` avec un
   **tableau de dépendances vide** ([App.jsx:817](../../src/App.jsx:817)) : le corriger pour
   qu'il dépende bien de la source d'utilisateur, sinon la valeur réelle ne sera jamais prise en
   compte.
5. Le spinner d'`index.html` reste affiché pendant cette résolution (quelques centaines de ms) —
   ne pas ajouter d'écran de chargement supplémentaire.

**Fait quand** : en mode SharePoint, le nom réel de l'utilisateur connecté s'affiche sans aucune
fenêtre de connexion (la session SPO est déjà active puisque la page vient de SharePoint).

---

## 4. Phase 3 — Client REST générique

**Créer `src/utils/spRestClient.js`** — le seul module qui fait des appels réseau :

```js
spGet(relativeApiPath, { select, filter, top, orderby, expand })
spPost(relativeApiPath, body, { method, etag, rawBody })   // method: 'POST' | 'MERGE' | 'DELETE' | 'PUT'
spGetAll(relativeApiPath, options)                          // suit odata.nextLink
```

**En-têtes standards**

| Requête | En-têtes |
|---|---|
| Lecture | `Accept: application/json;odata=nometadata` |
| Écriture | `Accept: application/json;odata=nometadata`, `Content-Type: application/json;odata=nometadata`, `X-RequestDigest: <digest>` |
| Mise à jour | + `X-HTTP-Method: MERGE`, `IF-MATCH: <etag>` (ou `*`) |
| Suppression | + `X-HTTP-Method: DELETE`, `IF-MATCH: <etag>` (ou `*`) |

> **Pourquoi `odata=nometadata`** : la réponse est du JSON simple (`{ "value": [ … ] }`) et surtout
> **les créations n'exigent pas le bloc `__metadata` / `SP.Data.…ListItem`** que réclame
> `odata=verbose`. Beaucoup moins de code et pas de nom de type interne à deviner.
> Corollaire : l'etag n'est pas dans le corps → le lire dans l'en-tête de réponse `ETag`, ou
> refaire la lecture ciblée en `odata=minimalmetadata` (champ `odata.etag`) quand on en a besoin.

**Comportements obligatoires du client**

- `credentials: 'same-origin'` (valeur par défaut de `fetch`, mais l'écrire explicitement).
- **Session expirée** : si la réponse n'est pas du JSON (`content-type` en `text/html`), c'est une
  redirection vers la page de connexion suivie automatiquement par `fetch`. Ne pas tenter de
  parser : lever une erreur typée `SessionExpiredError` que l'UI traduit par une bannière
  « Votre session SharePoint a expiré, rechargez la page » avec un bouton de rechargement.
  **C'est le cas d'erreur n°1 en production** (onglet resté ouvert la nuit).
- **403 avec digest invalide** : message SharePoint « The security validation for this page is
  invalid » → `invalidateDigest()` puis **un seul** réessai.
- **429 / 503** : lire `Retry-After` (secondes), attendre, réessayer — 3 tentatives maximum, avec
  repli exponentiel si l'en-tête est absent. Ne pas tenter de définir un en-tête `User-Agent`
  (interdit au navigateur).
- **412 Precondition Failed** → lever la `ConflictError` déjà définie dans
  [dataProvider.js](../../src/utils/dataProvider.js:11) (ne pas en créer une seconde).
- Autres erreurs → `Error` portant `status` et le message SharePoint (`error.message.value` en
  verbose, `error.message` en nometadata — gérer les deux formes).
- `spGetAll` suit `odata.nextLink` jusqu'à épuisement et concatène les `value`.
- **Encodage OData** : les URL sont construites avec des littéraux entre apostrophes
  (`getbytitle('CN_Projects')`). Prévoir un utilitaire `odataQuote(value)` qui **double les
  apostrophes** (`d'essai` → `d''essai`) puis `encodeURIComponent`. Indispensable pour les
  chemins de fichiers et les valeurs de filtre saisies par les utilisateurs.

**Pas de `$batch`.** SharePoint expose `/_api/$batch` mais en `multipart/mixed`, nettement plus
lourd que le batch JSON de Graph. Pour l'hydratation initiale, lancer simplement les 9 lectures
en parallèle (`Promise.all`) : le navigateur gère jusqu'à 6 connexions simultanées par origine,
c'est largement suffisant et bien plus simple à maintenir.

**Fait quand** : `test/spRestClient.test.mjs` couvre la logique pure en injectant un `fetch`
factice — construction d'URL et échappement OData, calcul du délai de réessai, détection HTML/
session expirée, mapping 412 → `ConflictError`, suivi de `odata.nextLink`. Aucun accès à `window`
à l'import du module.

---

## 5. Phase 4 — Dépôt générique de liste et mappers

Les 12 listes partagent la même mécanique. **Créer `src/utils/listRepository.js`** :

```js
createListRepository({ listKey, keyField, toEntry, toFields })
// → { getAll(), findByField(field, value), create(entry), update(spItemId, fields, etag), remove(spItemId, etag) }
```

**Endpoints de référence** (`{web}` = `sharepointConfig.webUrl`, `{list}` = nom de la liste) :

| Opération | Appel |
|---|---|
| Lire tous les éléments | `GET {web}/_api/web/lists/getbytitle('{list}')/items?$select=Id,…&$top=5000` |
| Filtrer | `…/items?$select=…&$filter=ProjectId eq 'abc'` (colonne **indexée**) |
| Lire un élément | `GET …/items({Id})` |
| Créer | `POST …/items` — corps `{ "Title": "…", "ProjectId": "…" }` |
| Modifier | `POST …/items({Id})` + `X-HTTP-Method: MERGE` + `IF-MATCH` |
| Supprimer | `POST …/items({Id})` + `X-HTTP-Method: DELETE` + `IF-MATCH` |
| Utilisateur courant | `GET {web}/_api/web/currentUser?$select=Id,Title,Email,LoginName` |
| Digest (écritures) | `POST {web}/_api/contextinfo` |

Points de vigilance propres aux mappers :

- **`$select` explicite et obligatoire.** Sans lui, SharePoint renvoie des dizaines de colonnes
  système inutiles. Lister nommément les colonnes de chaque liste, en incluant toujours `Id`.
- **`Id` SharePoint ≠ identifiant métier.** Conserver `item.Id` dans chaque entrée sous
  `spItemId` : c'est la clé technique des `MERGE`/`DELETE`. Les identifiants métier
  (`ProjectId`, `InspirationId`, …) restent ceux de l'application.
- **Colonnes JSON : objets côté mock, chaînes côté SharePoint.** `AnswersJson`, `AnalysisJson`,
  `InspirationJson`, `AttachmentsJson`, `AnchorJson`, `PayloadJson` sont des colonnes « texte
  multiligne » : `toEntry` fait `JSON.parse` (try/catch → valeur par défaut) et `toFields` fait
  `JSON.stringify`. **C'est LA divergence mock/SharePoint à traiter systématiquement** ;
  l'oublier produit des `[object Object]` en base.
- **Dates** : ISO 8601 (`toISOString()`), accepté tel quel par les colonnes Date/Heure.
  Attention en lecture : SharePoint renvoie de l'UTC, laisser le formatage à l'affichage
  existant.
- **Booléens** : colonnes Oui/Non → `true`/`false` natifs.
- **Colonnes de choix** (`Status`, `Visibility`) : envoyer exactement la chaîne définie dans la
  liste (`Draft`/`Submitted`, `Personal`/`Shared`) — la normalisation existe déjà côté app
  (`normalizeStatus`).
- Les noms internes de colonnes sont identiques aux noms d'affichage (le document de préparation
  impose de les créer sans espace ni accent). `Title` est la colonne native.

**Concurrence optimiste** — conserver la sémantique `RowVersion` déjà testée
([dataProvider.js:76](../../src/utils/dataProvider.js:76)), en la renforçant :

1. Relire l'élément ciblé en `odata=minimalmetadata` → on obtient `RowVersion` **et** `odata.etag`.
2. Comparer `RowVersion` à `expectedRowVersion` → différent = `ConflictError` avec
   l'enregistrement serveur (parcours UI déjà en place).
3. Écrire avec `IF-MATCH: <etag>` et `RowVersion + 1` → si quelqu'un a écrit entre-temps,
   SharePoint répond **412** et le client lève `ConflictError`. Cette double barrière ferme la
   fenêtre de course que la seule comparaison `RowVersion` laissait ouverte.

**Fait quand** : `test/listMappers.test.mjs` valide l'aller-retour `toEntry`/`toFields` de chaque
liste, en particulier la sérialisation des colonnes JSON et le cas « chaîne JSON invalide ».

---

## 6. Phase 5 — Fournisseurs de données (projets, inspirations, autres listes)

1. Dans [dataProvider.js](../../src/utils/dataProvider.js), **remplacer la classe stub
   `GraphDataProvider` par `SharePointRestProvider`**, avec exactement la même interface que
   `MockSharePointProvider` : `listProjects()` et
   `upsertProject(project, { expectedRowVersion, userEmail })`, mêmes formes de retour. Les
   fonctions `toProjectEntry`/`toListItem` existantes sont réutilisables telles quelles : seule
   s'ajoute la couche `JSON.parse`/`stringify` des colonnes JSON.
   - `upsertProject` : élément absent → `create` ; présent → contrôle `RowVersion` + `MERGE`.
2. **Export** : `export const dataProvider = isSharePointMode() ? new SharePointRestProvider() : new MockSharePointProvider();`
   `isSharePointMode()` teste `typeof window === 'undefined'` en premier → sûr sous Node.
3. **`listProjectsSync()` doit disparaître** : impossible en mode réseau. Recenser les appelants
   (`grep -n "listProjectsSync\|listInspirationsSync" src/`) et les basculer sur la version
   asynchrone avec état de chargement (phase 7). Même traitement pour
   `inspirationDataProvider.listInspirationsSync()`.
4. **Étendre `inspirationDataProvider.js`** sur le même modèle (`CN_Inspirations`), puis créer les
   repositories de `CN_ComplianceComments`, `CN_ProjectMembers`, `CN_ShowcaseStickyNotes`,
   `CN_FilesIndex`.
   **Avant d'écrire une ligne, tracer dans `App.jsx` où chaque donnée est aujourd'hui lue et
   mutée dans le state local** (commentaires, post-its, membres…). Chaque mutation
   identifiée reçoit son appel repository : mise à jour optimiste du state, puis écriture, puis
   rollback + message en cas d'échec réseau.
   `CN_ProjectDiscussions` et `CN_BackofficeChanges` sont hors périmètre : leur schéma de colonnes
   existe et la liste SharePoint est créée, mais aucune fonctionnalité de l'application ne les
   utilise (pas d'état local à migrer). Décision volontaire au 29/08/2026 — ne pas créer ces deux
   repositories tant que ces fonctionnalités ne sont pas explicitement demandées.

**Fait quand** : en mode SharePoint, créer / sauvegarder / soumettre un projet écrit réellement
dans `CN_Projects` (vérifiable dans l'interface SharePoint), et une modification croisée depuis
deux onglets déclenche le parcours `ConflictError` existant.

### 6 bis. `rules`/`teams` en listes par-item (`CN_Rules`, `CN_Teams`)

Contrairement aux autres référentiels du back-office (§7), `rules` et `teams` ne sont **pas**
des fichiers JSON de `CN-Config` : une ligne par règle / par équipe, comme `CN_Projects`, pour que
deux admins qui modifient chacun une règle différente n'entrent jamais en conflit sur le même
ETag de fichier.

- `LIST_SCHEMAS.rules` (`RuleId` clé, `PayloadJson` = l'objet règle entier sérialisé — imbrication
  trop profonde pour un mapping colonne par colonne) et `LIST_SCHEMAS.teams` (`TeamId` clé,
  colonnes plates `ContactsJson`/`Expertise` — forme déjà plate côté app) dans
  [listSchemas.js](../../src/utils/listSchemas.js). Les deux portent une colonne `SortOrder` :
  il n'y a pas de glisser-déposer sur rules/teams, l'ordre affiché est l'ordre d'insertion du
  tableau, et `SortOrder` est ce qui permet de reconstituer cet ordre depuis des lignes
  indépendantes.
- `src/utils/rulesProvider.js` / `teamsProvider.js` : même patron que
  `projectMembersProvider.js` (`getRepository(...)`, `upsertByKey` pour la concurrence RowVersion
  + ETag), avec `listAllRules()`/`listAllTeams()` (un seul `getAll()` non filtré, comme
  `complianceCommentsProvider.listAllComments()`) plutôt qu'un chargement par projet.
- `App.jsx` charge les deux listes dans le même `Promise.all` que `dataProvider.listProjects()`/
  `loadReferentials()` et garde les métadonnées serveur (`spItemId`/`rowVersion`/`sortOrder`) dans
  des `useRef` séparés (`ruleServerMetaRef`/`teamServerMetaRef`) — jamais fusionnées dans l'objet
  règle/équipe que consomme `analyzeAnswers` (`src/utils/rules.js`). Liste vide au premier chargement
  = pas encore publiée (pas un référentiel volontairement vidé) : on garde alors les règles/équipes
  locales plutôt que d'écraser avec un tableau vide.
- Écriture : `rulesQueueRef`/`teamsQueueRef` (deux `createRetryQueue(...)` de plus dans `App.jsx`),
  alimentées depuis `BackOffice.jsx` à chaque mutation existante (`addRule`, `deleteRule`,
  `duplicateRule`, `saveRule`, `addTeam`, `updateTeamField`, `deleteTeam`, et la pile d'annulation)
  — le `setRules`/`setTeams` optimiste local ne change pas, seul un `enqueue(...)`
  supplémentaire s'ajoute, gardé derrière `isSharePointMode()`.
- En mode mock/local, rien ne change : `rules`/`teams` restent des `useState` initialisés depuis
  `src/data/rules.js`/`teams.js` et persistés en delta dans `complianceNavigatorState`.

---

## 7. Phase 6 — Référentiels dans la bibliothèque `CN-Config`

Les référentiels administrés en back-office (aujourd'hui persistés en delta dans
`complianceNavigatorState`) deviennent des fichiers JSON. Le `useEffect` de persistance
([App.jsx:1309](../../src/App.jsx:1309)) donne la liste exacte des tranches :

| Fichier dans `CN-Config` | Contenu (état d'`App.jsx`) |
|---|---|
| `questions.json` | `questions` |
| `risk-level-rules.json` | `riskLevelRules` |
| `risk-weighting.json` | `riskWeights` |
| `showcase-themes.json` | `showcaseThemes` |
| `settings.json` | `adminEmails`, `onboardingTourConfig`, `validationCommitteeConfig`, `inspirationFormFields` |

> `rules` et `teams` ne sont **pas** dans ce tableau : ils ont été migrés vers des listes
> par-item (`CN_Rules`/`CN_Teams`, une ligne par règle/équipe) plutôt que des fichiers, pour une
> concurrence optimiste par règle plutôt que sur tout le fichier — voir §6 bis ci-dessus
> (`src/utils/rulesProvider.js`/`teamsProvider.js`).

**Créer `src/utils/referentialStore.js`** :

| Opération | Appel REST |
|---|---|
| Lire le contenu | `GET {web}/_api/web/GetFileByServerRelativeUrl('{serverRelativePath}')/$value` |
| Lire l'etag | `GET {web}/_api/web/GetFileByServerRelativeUrl('{path}')` en `odata=minimalmetadata` → `odata.etag` |
| Mettre à jour | `POST {web}/_api/web/GetFileByServerRelativeUrl('{path}')/$value` + `X-HTTP-Method: PUT` + `IF-MATCH: <etag>` + `X-RequestDigest`, corps = **chaîne JSON brute** |
| Créer | `POST {web}/_api/web/GetFolderByServerRelativeUrl('{dossier}')/Files/add(url='questions.json',overwrite=true)` + `X-RequestDigest`, corps = chaîne JSON brute |

- `serverRelativePath` = `{cheminDuSite}/CN-Config/questions.json` (ex.
  `/sites/compliance-navigator/CN-Config/questions.json`), à passer par `odataQuote`.
- Le corps est du **texte brut**, pas un objet sérialisé par le client : prévoir l'option
  `rawBody` de `spPost` (ne pas forcer `Content-Type: application/json;odata=nometadata` ici).
- `loadReferentials()` : lit chaque fichier ; **404 → défauts embarqués de `src/data/*`**, exactement
  la même logique de repli que l'hydratation localStorage actuelle. Mémorise l'etag courant.
- `saveReferential(name, data)` : `PUT` avec `IF-MATCH` → 412 = `ConflictError` (un autre admin a
  publié entre-temps) → l'UI propose de recharger, jamais d'écraser.

### 7 bis. Panneau « Synchronisation SharePoint » dans le back-office

> ⚠️ **Une fonctionnalité équivalente existe déjà et doit être RECÂBLÉE, pas dupliquée.**
> [`src/utils/sharePointSetup.js`](../../src/utils/sharePointSetup.js) (245 lignes) implémente
> `reinitializeSharePointConfiguration`, appelée par `handleSharePointReinitialization`
> ([App.jsx:4422](../../src/App.jsx:4422)) avec l'état `sharePointReinitState` et son bouton dans
> le back-office. Elle date de la stratégie Graph abandonnée : URL `graph.microsoft.com`, jeton
> saisi à la main, et surtout des listes `PN-Questions` / `PN-Regles` **qui n'existent pas** (les
> listes réelles sont `CN_*`, et les référentiels vont dans des fichiers de `CN-Config`).
> Travail attendu en phase 6 : réécrire l'intérieur de `sharePointSetup.js` pour utiliser
> `referentialStore.js`, supprimer `GRAPH_BASE_URL` / `DEFAULT_GRAPH_CONFIG` / la saisie de jeton,
> et conserver la signature + l'UI existantes (état, messages, bouton) pour un diff minimal.

Créer un panneau dédié dans `BackOffice.jsx`, visible **uniquement** si `isCurrentUserAdmin` et
`isSharePointMode()`. Il remplace tout script d'export et tout téléversement manuel :

- **Diagnostic d'installation** : `GET {web}/_api/web/lists?$select=Title` et
  `GET {web}/_api/web/GetFolderByServerRelativeUrl('…/CN-Config')/Files?$select=Name` → tableau
  d'état listant, pour chaque liste / bibliothèque / fichier attendu : présent ✅ ou absent ❌,
  avec le nom exact manquant. C'est le premier outil de dépannage d'une installation.
- **Bouton « Publier la configuration vers SharePoint »** → `publishAllReferentials()` : écrit
  **tous** les référentiels actuellement en mémoire vers `CN-Config`.
  - Fichiers absents → création (`Files/add`) : c'est l'**initialisation** d'une installation
    vierge, en un clic.
  - Fichiers présents → **confirmation explicite obligatoire** avant écrasement (« Cette action
    remplace la configuration publiée pour tous les utilisateurs »), puis `PUT` avec `IF-MATCH`.
  - Résultat détaillé par fichier : publié / conflit / erreur.
- **Bouton « Recharger depuis SharePoint »** : rejoue `loadReferentials()` et réinjecte dans les
  états d'`App.jsx` (sortie de secours après un conflit).
- `BackOffice.jsx` fait partie du manifest **différé** : aucun changement à `DEFERRED_MODULES`,
  mais bien régénérer le manifest.

**Fait quand** : sur une bibliothèque `CN-Config` vide, un admin clique « Publier » et les 5
fichiers apparaissent (plus les lignes `CN_Rules`/`CN_Teams`, publiées par le même bouton — voir
§6 bis) ; une modification de question depuis un poste A est visible sur un poste B après
rechargement ; deux publications concurrentes produisent un conflit, jamais un écrasement
silencieux.

---

## 8. Phase 7 — Notifications via `CN_NotificationsQueue` (aucun envoi depuis l'app)

Réécrire `sendGraphNotificationEmail` ([App.jsx:894](../../src/App.jsx:894)) **en conservant
exactement sa signature** `{ subject, to, cc, body }`, pour ne toucher à aucun de ses sites
d'appel (`notifyOwnerAndCoOwners`, `notifyThreadLastAuthor`, et les appels directs des lignes
~3195 et ~3250). Le renommer en `queueNotification` et propager le nom.

1. **Créer `src/utils/notificationQueue.js`** : `queueNotification({ subject, to, cc, body, projectId, actionType })`
   → `create` dans `CN_NotificationsQueue` :
   `Title` = subject, `NotificationType` = actionType, `ToEmails` = `to.join(';')`,
   `CcEmails` = `cc.join(';')`, `Body` = body, `ProjectId`, `Status` = `'Pending'`.
2. Mode mock → le `console.info` actuel, inchangé. Mode SharePoint → écriture dans la liste,
   **en « fire-and-forget » avec `catch`** : l'échec d'une notification ne doit jamais bloquer
   ni annuler l'action métier de l'utilisateur (journaliser et continuer).
3. Le flux Power Automate (préparé par l'utilisateur) lit `Status = Pending`, envoie l'e-mail ou
   le message Teams, puis repasse l'élément à `Sent`. **L'application n'envoie jamais de message
   elle-même.**

**Il n'existe aucune alternative à Power Automate pour l'envoi.** Les deux seules API d'envoi
depuis le navigateur sont hors jeu : Graph `sendMail` (interdit par la politique de sécurité) et
`SP.Utilities.Utility.SendEmail` (retirée par Microsoft — vérifié, cf. §0). Le sujet est clos.

**Pourquoi la file de liste et pas un déclencheur HTTP Power Automate** — trois raisons, à ne pas
remettre en cause :
- l'URL d'un déclencheur « Lorsqu'une requête HTTP est reçue » contient une **signature secrète**
  (`sig=`) qui serait exposée dans le code client, donc déclenchable par n'importe qui ;
- ce déclencheur relève des connecteurs **premium** (licence supplémentaire) ;
- il ne gère pas de façon fiable le **contrôle d'origine CORS** depuis un navigateur.
La file de liste n'a aucun de ces défauts, ne coûte rien, et fournit en prime un **journal
consultable** de toutes les notifications émises.

**Fait quand** : soumettre un projet crée un élément `Pending` dans la liste, que le flux fait
passer à `Sent` après envoi.

---

## 9. Phase 8 — Hydratation asynchrone et statut de synchronisation dans `App.jsx`

Phase la plus délicate (composant-dieu ~5 000 lignes, ~57 `useState`). Stratégie **« cache
d'abord, serveur ensuite »**, pour ne jamais dégrader le démarrage :

1. **Ne pas toucher** aux initialisations synchrones actuelles (`useState(() => loadPersistedState()…)`)
   : elles assurent un premier rendu instantané depuis le cache local.
2. Ajouter **un seul** `useEffect` d'hydratation, monté une fois, actif uniquement en mode
   SharePoint : `Promise.all` des lectures de listes + `loadReferentials()` → `setState` de
   réconciliation par tranche → `syncStatus = 'synced'`.
   États : `'local-only'` (mock), `'loading'`, `'synced'`, `'error'`, `'session-expired'`.
3. **Bannière de statut** : réutiliser le mécanisme de bannière quota existant
   (`persistenceError`) pour afficher « Synchronisation en cours… », « Connecté à SharePoint »,
   l'erreur de diagnostic (liste manquante, droits insuffisants), ou l'invitation à recharger en
   cas de session expirée. Toujours en français, sans jargon.
4. **Écritures** : chaque action métier met à jour le state local (optimiste, comportement
   actuel), puis appelle le repository ; en cas d'échec réseau → rollback ou marquage « non
   synchronisé » + bannière. La persistance localStorage débouncée reste en place : elle devient
   le cache et le brouillon hors-ligne.
5. **Règles des Hooks** (rappel CLAUDE.md) : le nouvel effet se place **après** les hooks
   existants, aucun `return` anticipé ; `npm run lint` doit rester vert.

**Fait quand** : au rechargement, rendu immédiat depuis le cache puis remplacement par les
données serveur ; réseau coupé → l'app reste utilisable en lecture avec bannière d'avertissement.

---

## 10. Phase 9 — Documents dans `CN-Documents`

1. **Téléversement** :
   `POST {web}/_api/web/GetFolderByServerRelativeUrl('{site}/CN-Documents/{EntityType}/{EntityId}')/Files/add(url='{nom}',overwrite=true)`
   + `X-RequestDigest`, corps = `ArrayBuffer` du fichier. Le chemin range les pièces jointes par
   entité. Créer le sous-dossier au besoin :
   `POST {web}/_api/web/folders` avec `{ "ServerRelativeUrl": "…" }`.
2. **Fichiers volumineux** : `Files/add` convient jusqu'à quelques dizaines de Mo. Au-delà,
   utiliser le découpage `StartUpload` / `ContinueUpload` / `FinishUpload`. Prévoir une limite
   applicative claire et un message explicite plutôt qu'un échec silencieux.
3. **Indexation** : après téléversement, créer l'élément correspondant dans `CN_FilesIndex`
   (`FileId`, `EntityType`, `EntityId`, `Path`, `UploadedBy`, `UploadedAt`) — format déjà
   consommé par l'app.
4. **Téléchargement** : lien direct vers
   `{web}/_api/web/GetFileByServerRelativeUrl('{Path}')/$value` (les cookies de session
   authentifient la requête) ou vers l'URL SharePoint du fichier. Pas d'URL pré-signée à gérer.
5. **Sécurité** : valider l'extension et la taille côté application avant envoi ; ne jamais
   injecter un nom de fichier dans du HTML sans passer par
   [richText.js](../../src/utils/richText.js).

**Fait quand** : joindre un fichier depuis l'app le fait apparaître dans `CN-Documents` au bon
chemin, et il est téléchargeable depuis un autre poste.

---

## 11. Phase 10 — Build, tests, vérification finale

1. `npm run build` (mocks + CSS + manifest). Vérifier la génération de `index.aspx` — si elle
   n'existe pas encore, ajouter au pipeline une étape de copie `index.html` → `index.aspx`
   (script **CommonJS** dans `scripts/`, cf. `scripts/package.json`).
2. `npm test` : tous les tests existants verts (le moteur de règles ne doit pas avoir bougé) +
   les nouveaux (`spRestClient`, mappers de listes).
3. `npm run lint` vert (`react-hooks/rules-of-hooks` en particulier).
4. **Test du mode mock** : ouvrir `index.html` en `file://` → comportement identique à avant la
   migration. Non négociable.
5. **Checklist du mode SharePoint** (sur le site réel) :
   - [ ] Ouverture de `.../CN-App/index.aspx` : aucune fenêtre de connexion, nom réel affiché.
   - [ ] Back-office → « Synchronisation SharePoint » : diagnostic tout vert, puis publication de
         la configuration → 5 fichiers créés dans `CN-Config`, et une ligne par règle/équipe dans
         `CN_Rules`/`CN_Teams`.
   - [ ] Création + sauvegarde d'un projet → ligne visible dans `CN_Projects`.
   - [ ] Soumission → élément `Pending` dans `CN_NotificationsQueue` → e-mail reçu → `Sent`.
   - [ ] Modification back-office → fichier mis à jour dans `CN-Config`, visible d'un second compte.
   - [ ] Conflit de version (deux onglets) → message de conflit, aucun écrasement.
   - [ ] Onglet laissé ouvert plusieurs heures → bannière « session expirée », pas de page blanche.

---

## 12. Pièges connus (résumé)

| Piège | Parade |
|---|---|
| Modifier `src/` sans régénérer le manifest | `npm run generate:manifest` systématique |
| `_api` appelé en relatif depuis `/CN-App/` | `_api` n'existe qu'au niveau du web → toujours construire l'URL depuis `sharepointConfig.webUrl` |
| Écriture sans `X-RequestDigest` → 403 | Digest via `POST /_api/contextinfo`, mis en cache et renouvelé à 80 % du délai |
| Digest expiré en cours de session | 403 « security validation » → `invalidateDigest()` + un réessai |
| Session SPO expirée → réponse HTML au lieu de JSON | Contrôler le `content-type` → `SessionExpiredError` → bannière « rechargez la page » |
| `odata=verbose` impose `__metadata` | Utiliser `odata=nometadata` partout (et `minimalmetadata` quand l'etag est nécessaire) |
| Colonnes JSON : objets en mock, chaînes dans SharePoint | `JSON.parse`/`JSON.stringify` dans tous les mappers |
| Apostrophe dans un filtre ou un chemin | `odataQuote` : doubler les apostrophes puis encoder |
| `$filter` sur colonne non indexée au-delà de 5 000 éléments | Colonnes indexées (document de préparation) ; sinon tout charger et filtrer côté client |
| Pagination | `$top=5000` + suivi de `odata.nextLink` par `spGetAll` |
| 429 / 503 | Respecter `Retry-After` ; l'en-tête `User-Agent` est impossible à définir en navigateur |
| `Email` vide sur `currentUser` | Repli sur l'extraction depuis `LoginName` |
| `listProjectsSync` / `listInspirationsSync` | Basculer les appelants en asynchrone (phase 5) |
| `useMemo` de `currentUserEmail` avec dépendances vides | Corriger les dépendances (phase 2) |
| Modules touchant `window` à l'import | Interdit — accès paresseux uniquement (tests Node) |
| Envoi d'e-mail depuis l'app | Interdit — `CN_NotificationsQueue` + Power Automate uniquement |
| Classes Tailwind construites dynamiquement | Non détectées par `generate-tailwind-lite` → garder une occurrence littérale |
