# ⛔ OBSOLÈTE — Guide de migration vers Microsoft Graph / SharePoint

> **NE PAS SUIVRE CE DOCUMENT.** Stratégie abandonnée : elle reposait sur Microsoft Graph + MSAL,
> qui exigent un enregistrement d'application Azure AD et un consentement administrateur dont
> l'utilisateur ne dispose pas.
>
> **Document de référence en vigueur :
> [`../GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md`](../GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md)**
> (API REST SharePoint `/_api/…` via les cookies de session, sans authentification à implémenter).
>
> Conservé uniquement à titre d'historique de décision.

---

> **Public de ce document : Claude Code.** Il décrit pas à pas comment brancher l'application
> Project Navigator sur de vraies listes et bibliothèques SharePoint via l'API Microsoft Graph,
> en remplacement des données simulées (mock JSON + localStorage).
> Le document jumeau `PREPARATION-SHAREPOINT-POWERAUTOMATE.md` décrit ce que l'utilisateur
> prépare de son côté (site, listes, flux Power Automate, app registration).
> **Ignorer les anciens documents de migration présents dans `docs/`** (`migration-sharepoint-graph.md`,
> `prompt-chatgpt-codex-migration-sharepoint.md`, etc.) : ce guide les remplace.

---

## 0. Contraintes non négociables

1. **Zéro serveur applicatif.** L'app reste des fichiers statiques déposés dans une bibliothèque
   SharePoint. Le point d'entrée devient `index.aspx` (copie de `index.html` renommée), servi en
   HTTPS par SharePoint — c'est ce qui rend l'authentification possible (une page `file://` n'a pas
   d'origine valide pour OAuth). Aucun backend, aucun npm côté utilisateur.
2. **`sendMail` est interdit** (politique de sécurité du tenant). Aucune requête Graph vers
   `/me/sendMail` ni `/users/{id}/sendMail`, jamais. Les notifications passent par une liste
   SharePoint « file d'attente » (`CN_NotificationsQueue`) qu'un flux Power Automate consomme.
3. **Le mode mock doit continuer à fonctionner.** En `file://` (développement local) ou si la
   config Graph est absente, l'app fonctionne exactement comme aujourd'hui (mocks + localStorage).
   `npm test` doit rester vert : les tests tournent sous Node sans `window`, donc aucun module
   importé par les utilitaires purs ne doit toucher `window`/`fetch` au moment de l'import.
4. **Respecter CLAUDE.md** : après toute modification sous `src/`, `npm run generate:manifest`
   (sinon le navigateur exécute l'ancien code). Ne jamais éditer les fichiers générés à la main.
   API v1.0 de Graph uniquement (pas de beta). Pas de secret dans le code — `clientId` et
   `tenantId` d'une application « public client » ne sont **pas** des secrets, ils peuvent être
   dans un fichier de config versionné.
5. **Uniquement des endpoints Graph stables et documentés** (listés §3). Ne pas inventer
   d'endpoint : en cas de doute, vérifier dans la documentation Microsoft Graph v1.0.

---

## 1. Vue d'ensemble de la cible

```
Navigateur (index.aspx servi par SharePoint, HTTPS)
 ├─ MSAL.js (vendored, comme React) ──► Entra ID (login + jeton délégué)
 ├─ graphClient.js ───────────────────► https://graph.microsoft.com/v1.0
 │    ├─ /me                              (identité, remplace graph-current-user.json)
 │    ├─ /sites/.../lists/.../items       (8 listes de données, cf. §4)
 │    └─ /sites/.../drives/...            (CN-Config : référentiels JSON ; CN-Documents : pièces jointes)
 ├─ localStorage ─────────────────────► cache de démarrage + brouillon hors-ligne (conservé)
 └─ CN_NotificationsQueue (liste) ────► Power Automate ──► e-mails / Teams (jamais sendMail)
```

Correspondance données actuelles → cible :

| Aujourd'hui | Cible SharePoint |
|---|---|
| `mock-sharepoint-lists/projects.json` (via `MockSharePointProvider`) | Liste `CN_Projects` |
| `inspirations.json` | Liste `CN_Inspirations` |
| `compliance-comments.json` | Liste `CN_ComplianceComments` |
| `project-discussions.json` | Liste `CN_ProjectDiscussions` |
| `project-members.json` | Liste `CN_ProjectMembers` |
| `backoffice-changes.json` | Liste `CN_BackofficeChanges` |
| `showcase-sticky-notes.json` | Liste `CN_ShowcaseStickyNotes` |
| `files-index.json` | Liste `CN_FilesIndex` + fichiers réels dans la bibliothèque `CN-Documents` |
| Référentiels modifiés en back-office (questions, rules, riskLevelRules, riskWeighting, adminEmails, config onboarding…) persistés en delta dans localStorage | Fichiers JSON dans la bibliothèque `CN-Config` (un fichier par référentiel) |
| `src/data/graph-current-user.json` | `GET /me` |
| `sendGraphNotificationEmail` (console.info) | Écriture d'un élément dans `CN_NotificationsQueue` |
| localStorage `complianceNavigatorState` | Conservé comme cache local ; la source de vérité devient SharePoint |

---

## 2. Phase 1 — Configuration et détection du mode d'exécution

**Créer `src/config/graphConfig.js`** :

```js
export const graphConfig = {
  clientId: '<REMPLIR: Application (client) ID>',
  tenantId: '<REMPLIR: Directory (tenant) ID>',
  siteUrl: '<REMPLIR: https://<tenant>.sharepoint.com/sites/<nom-du-site>>',
  scopes: ['User.Read', 'Sites.ReadWrite.All'],
  lists: {
    projects: 'CN_Projects',
    inspirations: 'CN_Inspirations',
    complianceComments: 'CN_ComplianceComments',
    projectDiscussions: 'CN_ProjectDiscussions',
    projectMembers: 'CN_ProjectMembers',
    backofficeChanges: 'CN_BackofficeChanges',
    showcaseStickyNotes: 'CN_ShowcaseStickyNotes',
    filesIndex: 'CN_FilesIndex',
    notificationsQueue: 'CN_NotificationsQueue'
  },
  libraries: {
    config: 'CN-Config',
    documents: 'CN-Documents'
  }
};

export const isGraphMode = () =>
  typeof window !== 'undefined' &&
  window.location.protocol === 'https:' &&
  !graphConfig.clientId.startsWith('<REMPLIR');
```

- Les valeurs `<REMPLIR: …>` sont fournies par l'utilisateur (fiche du document de préparation).
- `isGraphMode()` est l'unique aiguillage mock/Graph de toute l'app. Tant que la config n'est pas
  remplie ou qu'on est en `file://`, tout le comportement actuel est inchangé.

**Fait quand** : le fichier existe, `npm test` et `npm run lint` verts, manifest régénéré, l'app
en `file://` se comporte exactement comme avant.

---

## 3. Phase 2 — Authentification (MSAL vendored)

1. **Vendorer msal-browser** : télécharger le bundle UMD de `@azure/msal-browser` (v3.x,
   `msal-browser.min.js`) dans `src/vendor/`, chargé par une balise `<script>` dans
   `index.html` **avant** `module-manifest.js` (même approche que React : il s'expose en global
   `window.msal`). Ne pas le passer par le manifest.
2. **Créer `src/utils/auth.js`** :
   - `initAuth()` : si `!isGraphMode()` → résout immédiatement `{ mode: 'mock', user: <import du JSON actuel> }`.
     Sinon : `new msal.PublicClientApplication({ auth: { clientId, authority:
     'https://login.microsoftonline.com/' + tenantId, redirectUri: window.location.origin +
     window.location.pathname }, cache: { cacheLocation: 'sessionStorage' } })`, puis
     `await instance.initialize()`, `await instance.handleRedirectPromise()`. Si aucun compte
     (`instance.getAllAccounts()` vide) → `instance.loginRedirect({ scopes })`. Sinon
     `instance.setActiveAccount(...)`.
   - `getAccessToken()` : `acquireTokenSilent({ scopes })`, et sur `InteractionRequiredAuthError`
     → `acquireTokenRedirect({ scopes })`.
   - `fetchCurrentUser()` : `GET /me?$select=displayName,mail,userPrincipalName,givenName,surname`
     → même forme que `src/data/graph-current-user.json`.
3. **`src/main.jsx`** : rendre le bootstrap asynchrone — `await initAuth()` avant de monter
   `<App />`, et passer l'utilisateur résolu en prop (ou via un module `src/utils/currentUser.js`
   qui stocke le résultat). **Dans `App.jsx`, remplacer l'import statique
   `import currentUser from './data/graph-current-user.json'`** par cette source. Garder le JSON
   comme valeur du mode mock.
4. `index.aspx` : le script de génération ne change pas ; prévoir dans le README de déploiement
   que `index.aspx` est une copie conforme de `index.html` (même contenu). Optionnel : ajouter une
   étape `copy` dans `npm run build` qui produit `index.aspx` à partir d'`index.html`.

**Pièges** :
- Le `redirectUri` calculé (`origin + pathname`) doit correspondre exactement à l'URI SPA
  déclarée dans l'app registration (voir doc de préparation).
- Ne jamais bloquer le premier rendu du spinner : l'écran de chargement d'`index.html` reste
  affiché pendant la redirection de login.

**Fait quand** : en mode mock rien ne change ; en HTTPS avec config remplie, le premier chargement
redirige vers le login Microsoft puis revient sur l'app avec l'utilisateur réel affiché.

---

## 4. Phase 3 — Client Graph générique

**Créer `src/utils/graphClient.js`** — un seul module qui encapsule TOUS les appels réseau :

- `graphFetch(path, { method, body, headers, raw })` :
  - préfixe `https://graph.microsoft.com/v1.0`, injecte `Authorization: Bearer <token>` via
    `getAccessToken()`, `Content-Type: application/json` si body ;
  - **retry sur 429 et 503** : lire l'en-tête `Retry-After` (secondes), attendre, réessayer
    (max 3 tentatives) ;
  - **401** : un seul retry après renouvellement de jeton ;
  - **412 Precondition Failed** → lever la `ConflictError` existante de `dataProvider.js` ;
  - autres erreurs → `Error` avec `status` + le champ `error.message` du JSON Graph.
- `graphGetAll(path)` : suit `@odata.nextLink` jusqu'au bout et concatène les `value` (pagination).
- `graphBatch(requests)` : `POST /$batch` (max 20 sous-requêtes par lot ; découper au-delà) —
  utilisé pour l'hydratation initiale (charger les 8 listes en 1–2 allers-retours).

**Créer `src/utils/siteResolver.js`** — résolution des identifiants, faite une fois puis mise en
cache `sessionStorage` (clé `cn:graph-ids`) :

- Site : à partir de `graphConfig.siteUrl` (`https://contoso.sharepoint.com/sites/mon-site`) →
  `GET /sites/contoso.sharepoint.com:/sites/mon-site` → `site.id`.
- Listes : `GET /sites/{siteId}/lists?$select=id,name,displayName` → map nom → id pour toutes les
  listes de `graphConfig.lists`.
- Bibliothèques : `GET /sites/{siteId}/drives?$select=id,name` → ids de `CN-Config` et
  `CN-Documents`.
- Si une liste/bibliothèque attendue est absente → erreur explicite listant ce qui manque
  (affichée par la bannière d'erreur de la phase 8) : c'est le diagnostic n°1 des installations.

**Endpoints de référence utilisés dans tout le guide (v1.0)** :

| Opération | Endpoint |
|---|---|
| Lire les éléments d'une liste | `GET /sites/{siteId}/lists/{listId}/items?$expand=fields&$top=200` |
| Filtrer sur une colonne | `...items?$expand=fields&$filter=fields/ProjectId eq '{id}'` (colonne **indexée**, cf. doc de préparation) |
| Créer un élément | `POST /sites/{siteId}/lists/{listId}/items` avec body `{ "fields": { ... } }` |
| Modifier un élément | `PATCH /sites/{siteId}/lists/{listId}/items/{itemId}/fields` avec body `{ ...champs modifiés }` |
| Supprimer un élément | `DELETE /sites/{siteId}/lists/{listId}/items/{itemId}` |
| Lire un fichier | `GET /drives/{driveId}/root:/{chemin}:/content` |
| Écrire un fichier (< 4 Mo) | `PUT /drives/{driveId}/root:/{chemin}:/content` (+ `If-Match: {etag}` pour la concurrence) |
| Métadonnées fichier (etag) | `GET /drives/{driveId}/root:/{chemin}` |
| Fichier > 4 Mo | `POST .../root:/{chemin}:/createUploadSession` puis PUT par tranches |
| Identité | `GET /me?$select=...` |
| Lot | `POST /$batch` (max 20 requêtes) |

**Fait quand** : module testable — écrire des tests unitaires (`test/graphClient.test.mjs`) sur la
logique pure (découpage batch, calcul de retry, parsing nextLink) en injectant un `fetch` factice ;
aucun accès à `window` au moment de l'import du module.

---

## 5. Phase 4 — Dépôt générique de liste + mappers

Les 9 listes partagent la même mécanique. **Créer `src/utils/listRepository.js`** :

```js
createListRepository({ listKey, keyField, toEntry, toFields })
// → { getAll(), findByField(field, value), create(entry), update(itemId, fields), remove(itemId) }
```

- `listKey` pointe vers `graphConfig.lists.*` ; l'id réel vient de `siteResolver`.
- `getAll()` = `graphGetAll` + `toEntry(item.fields, item)` sur chaque élément. Conserver
  `item.id` (id SharePoint) dans chaque entrée sous `spItemId` : il est indispensable pour les
  PATCH/DELETE ultérieurs.
- **Sérialisation JSON** : dans les mocks, `AnswersJson`, `AnalysisJson`, `InspirationJson`,
  `AttachmentsJson`, `AnchorJson`, `PayloadJson` sont des **objets** ; dans SharePoint ce sont des
  colonnes texte multiligne, donc des **chaînes**. Les `toEntry` font `JSON.parse` (avec
  try/catch → valeur par défaut), les `toFields` font `JSON.stringify`. C'est LE point de
  divergence mock/Graph à traiter systématiquement.
- Dates : ISO 8601 (`toISOString()`), les colonnes Date/Heure SharePoint les acceptent telles
  quelles. Booléens : colonnes Oui/Non, `true`/`false` natifs.
- `Title` est la colonne native SharePoint ; toutes les autres colonnes sont adressées par leur
  nom interne, qui est identique au nom d'affichage puisque le doc de préparation impose de créer
  les colonnes avec leur nom définitif sans espace.

**Concurrence optimiste (conserver la sémantique actuelle `RowVersion`)** : dans `upsert`,
relire l'élément (`findByField(keyField, id)`), comparer `RowVersion` avec `expectedRowVersion`
comme le fait `MockSharePointProvider.upsertProject` ([dataProvider.js](../../src/utils/dataProvider.js:76)),
lever `ConflictError` avec l'enregistrement serveur si différent, sinon écrire avec
`RowVersion + 1`. (Ce n'est pas strictement atomique, mais c'est la sémantique déjà testée de
l'app ; les fichiers de config, eux, utilisent l'`If-Match`/412 qui est atomique.)

**Fait quand** : tests unitaires des mappers purs de chaque liste (aller-retour
`toFields(toEntry(x))`) dans `test/listMappers.test.mjs`.

---

## 6. Phase 5 — `GraphDataProvider` (projets) et fournisseurs des autres listes

1. Dans [dataProvider.js](../../src/utils/dataProvider.js), **implémenter réellement
   `GraphDataProvider`** avec la même interface que `MockSharePointProvider` :
   `listProjects()`, `upsertProject(project, { expectedRowVersion, userEmail })` — mêmes formes de
   retour (`toProjectEntry`/`toListItem` existants sont réutilisables : seule la couche
   parse/stringify des colonnes JSON s'ajoute).
   - `upsertProject` : si le projet n'existe pas dans la liste → `create` ; sinon contrôle
     `RowVersion` puis `update` du `spItemId`.
2. **Export** : remplacer `export const dataProvider = new MockSharePointProvider()` par une
   fabrique : `export const dataProvider = isGraphMode() ? new GraphDataProvider() : new MockSharePointProvider()`.
   Attention : `isGraphMode` lit `window` → l'appel doit rester tolérant sous Node (tests).
3. **`listProjectsSync()`** : le mode Graph ne peut pas être synchrone. Recenser tous les
   appelants (`grep listProjectsSync src/`) et les faire basculer sur la version asynchrone +
   état de chargement (voir phase 8). Même travail pour
   `inspirationDataProvider.listInspirationsSync()`.
4. **Étendre `inspirationDataProvider.js`** sur le même modèle (repository `CN_Inspirations`),
   et créer des repositories pour `CN_ComplianceComments`, `CN_ProjectDiscussions`,
   `CN_ProjectMembers`, `CN_BackofficeChanges`, `CN_ShowcaseStickyNotes`, `CN_FilesIndex`.
   **Avant d'écrire du code, tracer dans `App.jsx` où chaque donnée correspondante est aujourd'hui
   lue/écrite dans le state local** (commentaires, discussions, notes, membres…) : chaque mutation
   locale identifiée reçoit son appel repository (création/mise à jour/suppression), avec mise à
   jour optimiste du state et rollback + message en cas d'échec réseau.

**Fait quand** : en mode Graph, créer/sauvegarder/soumettre un projet écrit réellement dans
`CN_Projects` (vérifiable dans SharePoint), et un conflit simulé (modification croisée depuis
deux onglets) déclenche le parcours `ConflictError` existant de l'UI.

---

## 7. Phase 6 — Référentiels (bibliothèque `CN-Config`)

Les référentiels administrés en back-office (aujourd'hui persistés en delta dans
`complianceNavigatorState`) deviennent des fichiers JSON dans la bibliothèque `CN-Config` :

1. **Recenser les tranches** : ouvrir le `useEffect` de persistance dans `App.jsx` (autour de
   [App.jsx:1347](../../src/App.jsx:1347)) et lister toutes les tranches sauvegardées en delta
   (questions, rules, riskLevelRules, riskWeighting, adminEmails, config d'onboarding, réglages
   UI…). Un fichier par tranche : `questions.json`, `rules.json`, `risk-level-rules.json`,
   `risk-weighting.json`, `admin-emails.json`, `settings.json` (regrouper les petites tranches
   dans `settings.json`).
2. **Créer `src/utils/referentialStore.js`** :
   - `loadReferentials()` : lit chaque fichier (`GET .../root:/{nom}.json:/content` + métadonnées
     pour l'etag). Fichier absent (404) → défauts embarqués de `src/data/*` (même logique de
     repli que l'hydratation localStorage actuelle).
   - `saveReferential(name, data, etag)` : `PUT .../content` avec `If-Match: etag` → 412 →
     `ConflictError` (un autre admin a publié entre-temps ; l'UI propose de recharger).
   - Conserver en mémoire l'etag courant de chaque fichier.
3. **Branchement** : au démarrage en mode Graph, `loadReferentials()` alimente les états
   correspondants d'`App.jsx` ; chaque sauvegarde de référentiel du back-office appelle
   `saveReferential` **en plus** de la persistance localStorage actuelle (qui devient un cache).
4. **Amorçage et publication depuis le back-office** (pas de script manuel, pas de
   téléversement à la main) : créer un panneau **« Synchronisation SharePoint »** dans
   `BackOffice.jsx`, visible uniquement pour les admins (`isCurrentUserAdmin`) et uniquement en
   mode Graph. Il expose :
   - **Un diagnostic** : appel à `siteResolver` + `GET` de chaque fichier de `CN-Config` →
     tableau d'état (liste/bibliothèque/fichier : présent ✅ / absent ❌), pour vérifier
     l'installation avant toute écriture.
   - **Un bouton « Publier la configuration vers SharePoint »** : fonction
     `publishAllReferentials()` dans `referentialStore.js` qui écrit **tous** les référentiels
     actuellement en mémoire dans l'app (questions, rules, riskLevelRules, riskWeighting,
     adminEmails, settings…) vers les fichiers de `CN-Config` via `saveReferential`.
     - Premier lancement (fichiers absents → 404 au diagnostic) : création directe — c'est
       l'**initialisation** de l'installation, qui remplace tout export/upload manuel.
     - Fichiers déjà présents : afficher une **confirmation explicite** avant écrasement
       (« Cette action remplace la configuration publiée pour tous les utilisateurs »), et
       respecter les etags (`If-Match`) — un 412 affiche le conflit au lieu d'écraser.
     - Afficher un résultat par fichier (publié / conflit / erreur) dans le panneau.
   - Rappel : `BackOffice.jsx` est un module **différé** (manifest deferred) — aucun changement
     à `DEFERRED_MODULES`, mais bien régénérer le manifest.

**Fait quand** : sur une installation vierge (bibliothèque `CN-Config` vide), un admin clique
« Publier la configuration vers SharePoint » depuis le back-office et tous les fichiers JSON
apparaissent dans `CN-Config` ; modifier une question dans le back-office depuis un poste A est
visible sur un poste B après rechargement ; deux publications concurrentes produisent le message
de conflit et jamais d'écrasement silencieux.

---

## 8. Phase 7 — Notifications via `CN_NotificationsQueue` (PAS de sendMail)

Réécrire `sendGraphNotificationEmail` ([App.jsx:894](../../src/App.jsx:894)) — **en conservant
exactement sa signature** `{ subject, to, cc, body }` pour ne pas toucher aux ~6 sites d'appel :

1. Créer `src/utils/notificationQueue.js` : `queueNotification({ subject, to, cc, body, projectId, actionType })`
   → `create` dans `CN_NotificationsQueue` avec les champs :
   `Title` = subject, `NotificationType` = actionType, `ToEmails` = `to.join(';')`,
   `CcEmails` = `cc.join(';')`, `Body` = body, `ProjectId`, `Status` = `'Pending'`.
2. `sendGraphNotificationEmail` devient : mode mock → `console.info` actuel ; mode Graph →
   `queueNotification` (fire-and-forget avec `catch` : un échec de notification ne doit jamais
   bloquer l'action métier ; logguer et continuer).
3. C'est **Power Automate** (préparé par l'utilisateur) qui lit `Status = Pending`, envoie
   l'e-mail/Teams et repasse l'élément à `Sent`. L'app n'envoie jamais de mail elle-même.

**Fait quand** : soumettre un projet en mode Graph crée un élément `Pending` dans la liste, et
(une fois le flux utilisateur en place) l'e-mail part puis l'élément passe à `Sent`.

---

## 9. Phase 8 — Hydratation asynchrone et statut de synchronisation dans `App.jsx`

C'est la phase la plus délicate (composant-dieu ~5k lignes, ~57 `useState`). Stratégie
**« cache d'abord, serveur ensuite »** pour ne pas casser l'existant :

1. **Ne pas toucher** aux initialisations synchrones actuelles (`useState(() =>
   loadPersistedState()…)`) : elles donnent un premier rendu instantané depuis le cache local.
2. Ajouter UN `useEffect` d'hydratation (monté une fois, uniquement en mode Graph) :
   auth déjà faite (phase 2) → `graphBatch` de chargement des listes + `loadReferentials()` →
   `setState` de réconciliation pour chaque tranche → flag `syncStatus: 'synced'`.
   États possibles : `'local-only'` (mock), `'loading'`, `'synced'`, `'error'`.
3. **Bannière de statut** : réutiliser le mécanisme de bannière quota existant pour afficher
   « Synchronisation… », « Connecté à SharePoint », ou l'erreur retournée par `siteResolver`
   (liste manquante, permissions, etc.). Toujours en français, sans jargon.
4. **Écritures** : chaque action métier écrit d'abord dans le state local (optimiste, comportement
   actuel), puis appelle le repository ; en cas d'échec réseau → rollback ou marquage « non
   synchronisé » + bannière. La persistance localStorage débouncée actuelle reste telle quelle
   (elle devient le cache/brouillon hors-ligne).
5. **Règles de Hooks** (rappel CLAUDE.md) : aucun `return` anticipé avant les hooks ; le nouvel
   effet d'hydratation se place après les hooks existants ; `npm run lint` doit rester vert.

**Fait quand** : rechargement de la page en mode Graph → rendu immédiat depuis le cache puis
remplacement par les données serveur ; coupure réseau simulée → l'app reste utilisable en lecture
avec bannière d'avertissement.

---

## 10. Phase 9 — Documents (bibliothèque `CN-Documents`)

Pour les pièces jointes (inspirations, projets) aujourd'hui indexées par `files-index.json` :

1. Upload : `PUT /drives/{driveIdDocuments}/root:/{EntityType}/{EntityId}/{nomFichier}:/content`
   (< 4 Mo ; au-delà `createUploadSession`). Le chemin range les fichiers par entité.
2. Après upload : créer l'élément correspondant dans `CN_FilesIndex` (`FileId`, `EntityType`,
   `EntityId`, `Path` = chemin dans le drive, `UploadedBy`, `UploadedAt`) — c'est le format que
   l'app consomme déjà.
3. Lecture/téléchargement : `GET .../root:/{Path}` → utiliser `@microsoft.graph.downloadUrl`
   (URL pré-authentifiée, valable ~1 h) comme `href` du lien.
4. Tracer dans l'app les endroits où `documents` sont manipulés (ex. `documents` dans
   `inspirationDataProvider`) et brancher upload + index.

**Fait quand** : joindre un fichier depuis l'app le fait apparaître dans `CN-Documents` au bon
chemin, et il est téléchargeable depuis un autre poste.

---

## 11. Phase 10 — Build, tests, vérification finale

1. `npm run build` (mocks + CSS + manifest) — vérifier que `index.aspx` est bien régénéré/copié.
2. `npm test` : tous les tests existants verts (le moteur de règles ne doit pas avoir bougé) +
   les nouveaux tests (mappers, graphClient, découpage batch).
3. `npm run lint` vert (`react-hooks/rules-of-hooks` en particulier).
4. Test manuel mode mock : ouvrir `index.html` en `file://` → comportement identique à avant.
5. Checklist mode Graph (sur le site SharePoint de l'utilisateur) :
   - [ ] Login Microsoft au premier accès, nom réel affiché.
   - [ ] Back-office → panneau « Synchronisation SharePoint » : diagnostic tout vert, puis
         « Publier la configuration vers SharePoint » crée les fichiers dans `CN-Config`
         (installation vierge, sans aucun téléversement manuel).
   - [ ] Création + sauvegarde projet → visible dans `CN_Projects`.
   - [ ] Soumission → élément `Pending` dans `CN_NotificationsQueue` → e-mail reçu → `Sent`.
   - [ ] Modification back-office → fichier mis à jour dans `CN-Config` → visible depuis un
         second compte.
   - [ ] Conflit de version → message de conflit, pas d'écrasement.
   - [ ] Deux onglets, coupure réseau, 429 éventuel → pas de crash, bannières correctes.

## 12. Pièges connus (résumé)

| Piège | Parade |
|---|---|
| Modifier `src/` sans régénérer le manifest | `npm run generate:manifest` systématique |
| Colonnes JSON : objets en mock, chaînes dans SharePoint | `JSON.parse`/`stringify` dans tous les mappers |
| `$filter` sur colonne non indexée → erreur | Colonnes indexées (doc de préparation) ; sinon charger tout et filtrer côté client |
| Listes > 5000 éléments | Pagination `@odata.nextLink` déjà gérée par `graphGetAll` |
| 429 throttling | Respecter `Retry-After` (graphClient) |
| `listProjectsSync`/`listInspirationsSync` | Basculer les appelants en asynchrone (phase 5) |
| Modules qui touchent `window` à l'import | Interdit — accès paresseux uniquement (tests Node) |
| `sendMail` | Interdit partout — file `CN_NotificationsQueue` uniquement |
| Nom interne ≠ nom d'affichage des colonnes | L'utilisateur crée les colonnes avec le nom définitif sans espace (doc de préparation) |
| Classes Tailwind construites dynamiquement | Non détectées par `generate-tailwind-lite` — garder une occurrence littérale |
