> **⛔ OBSOLÈTE — NE PAS SUIVRE CE DOCUMENT.** Stratégie Microsoft Graph + MSAL, abandonnée faute
> d'enregistrement d'application Azure AD et de consentement administrateur disponibles.
> Document de référence en vigueur :
> [`migration-v2/GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md`](migration-v2/GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md)
> (API REST SharePoint, sans MSAL).

# Plan détaillé de migration vers SharePoint + Microsoft Graph

## 1) Objectif cible

Migrer la webapp pour :
- authentifier et identifier le **current user** via Microsoft Graph,
- stocker les données collaboratives dans des **listes SharePoint**,
- enregistrer les modifications **au fil de l’eau** (autosave),
- gérer les **modifications simultanées** (co-édition) côté webapp et backoffice,
- conserver le bouton **Soumettre** (chef de projet) qui déclenche l’envoi automatique d’un e-mail via Graph,
- centraliser les pièces jointes/fichiers dans SharePoint.

> Conséquence produit : suppression des boutons “Enregistrer” et “Charger”, remplacés par synchronisation continue, indicateurs d’état (“sauvegardé”, “sync en cours”, “conflit détecté”), et mécanismes de reprise.

---

## 2) Architecture cible (vue d’ensemble)

### 2.1 Composants
- **Frontend webapp** (existant) :
  - couche d’accès données abstraite (`DataProvider`) ;
  - mode actuel local/mock + futur mode Graph ;
  - gestion d’état optimiste + synchronisation asynchrone.
- **SharePoint Online** :
  - listes métier (projets, inspirations, commentaires, sticky notes, etc.) ;
  - bibliothèques de documents pour les fichiers.
- **Microsoft Graph API** :
  - `/me` pour current user ;
  - endpoints SharePoint Lists / DriveItem ;
  - envoi d’e-mail lors de la soumission (`/users/{id}/sendMail` ou `/me/sendMail` selon modèle d’autorisation).
- **Backoffice** :
  - même couche d’autosave + gestion de conflits ;
  - mêmes règles de concurrence, journalisation et audit.

### 2.2 Principes de concurrence
- **Autosave incrémental** : envoi différé (debounce 500–1200ms) + flush immédiat sur blur/changement de section.
- **Versionning** : utiliser eTag/`lastModifiedDateTime` + colonne `rowVersion` pour détecter les conflits.
- **Conflits** :
  - tentative de fusion champ par champ si possible,
  - sinon créer un état “conflit” avec proposition de résolution.
- **Traçabilité** : journal d’édition (qui, quand, quoi) pour audit compliance.

### 2.3 Diagramme Mermaid — structure du projet après migration SharePoint

```mermaid
flowchart TB
    U[Utilisateur] --> FE[Frontend Compliance Navigator\nReact + autosave + gestion des conflits]
    BO[Équipe Backoffice] --> FE

    FE -->|Authentification MSAL PKCE| GAuth[Microsoft Graph\n/me]
    FE -->|CRUD listes| GLists[Microsoft Graph\n/sites/:siteId/lists]
    FE -->|Fichiers| GFiles[Microsoft Graph\n/drives/ProjectFiles]
    FE -->|Soumission projet| GMail[Microsoft Graph\n/sendMail]

    GLists --> SPLists[(SharePoint Lists)]
    GFiles --> SPDocs[(SharePoint Library\nProjectFiles)]

    subgraph SPListsDetail[Référentiel listes SharePoint]
        L1[Projects]
        L2[Inspirations]
        L3[ShowcaseStickyNotes]
        L4[ComplianceComments]
        L5[ProjectDiscussions]
        L6[ProjectMembers]
        L7[BackofficeChanges]
    end

    SPLists --> SPListsDetail

    FE --> Q[(Queue offline + retry)]
    Q --> FE
    FE --> C[(Résolution de conflits\nrowVersion/eTag)]
```

---

## 3) Phase de pré-lancement (sans clé API)

Objectif : tout préparer pour brancher l’API en quelques heures dès que vous avez les accès.

### 3.1 Préparer le code (sans dépendre de Graph)
1. **Créer une couche d’abstraction unique** pour les accès données :
   - `GraphDataProvider` (futur réel),
   - `MockSharePointProvider` (immédiat, local JSON).
2. **Remplacer les points de persistance directe** (local storage/export manuel) par ce provider.
3. **Activer l’autosave global** :
   - suppression logique des actions “save/load” dans les flows,
   - sauvegarde automatique sur toute modification de projet/inspiration/showcase/commentaires/backoffice.
4. **Ajouter un gestionnaire de file d’attente offline** :
   - queue des patchs non envoyés,
   - retry exponentiel,
   - indicateur de synchronisation.
5. **Ajouter la gestion de concurrence** :
   - conserver `etag` / `rowVersion` côté client,
   - refuser mise à jour si version obsolète,
   - récupération + comparaison + UI de résolution.

### 3.2 Préparer les mocks “façon SharePoint”
Utiliser des fichiers JSON structurés comme des listes SharePoint pour simuler les opérations CRUD et les collisions.

Fichiers mock recommandés (et fournis dans ce repo) :
- `mock-sharepoint-lists/projects.json`
- `mock-sharepoint-lists/inspirations.json`
- `mock-sharepoint-lists/showcase-sticky-notes.json`
- `mock-sharepoint-lists/compliance-comments.json`
- `mock-sharepoint-lists/project-discussions.json`
- `mock-sharepoint-lists/backoffice-changes.json`
- `mock-sharepoint-lists/project-members.json`
- `mock-sharepoint-lists/files-index.json`

### 3.3 Préparer les règles UX collaboration
- Afficher en permanence un statut : “Synchronisé”, “Synchronisation…”, “Hors ligne”, “Conflit”.
- Afficher “Dernière modification par X à HH:mm”.
- Avertir avant soumission si des changements sont encore en queue.
- Sur showcase/sticky notes : synchronisation quasi temps réel (polling court ou subscriptions plus tard).

### 3.4 Gouvernance et sécurité (à anticiper)
- Définir rôles : chef de projet, équipe compliance, administrateur/backoffice.
- Cartographier droits SharePoint par liste et colonne sensible.
- Préparer stratégie RGPD : rétention, archivage, suppression, export.
- Définir modèle d’audit minimal : `createdBy`, `updatedBy`, `updatedAt`, `changeReason`.

---

## 4) Phase de pré-développement (design SharePoint détaillé)

## 4.1 Listes SharePoint à créer

### A. `Projects`
- `ProjectId` (**Single line of text**, valeur unique)
- `Title` (**Single line of text**)
- `Status` (**Choice** : Draft / Submitted / InReview / Approved / Rejected)
- `OwnerEmail` (**Single line of text**)
- `CurrentEditorEmail` (**Single line of text**)
- `AnswersJson` (**Multiple lines of text** en texte rich JSON)
- `AnalysisJson` (**Multiple lines of text** en texte rich JSON)
- `ProgressAnswered` (**Number** entier)
- `ProgressTotal` (**Number** entier)
- `SubmissionDate` (**Date and Time**)
- `LastAutosaveAt` (**Date and Time**)
- `RowVersion` (**Number** entier)
- `CreatedByEmail` (**Single line of text**), `UpdatedByEmail` (**Single line of text**)

### B. `Inspirations`
- `InspirationId` (**Single line of text**, valeur unique)
- `Title` (**Single line of text**)
- `Visibility` (**Choice** : Personal / Shared)
- `InspirationJson` (**Multiple lines of text** en texte rich JSON : labName, target, typology, therapeuticArea, country, description, link, review, documents, etc.)
- `RowVersion` (**Number** entier)
- `CreatedByEmail` (**Single line of text**), `UpdatedByEmail` (**Single line of text**), `UpdatedAt` (**Date and Time**)

### C. `ShowcaseStickyNotes`
- `StickyId` (**Single line of text**, valeur unique)
- `ProjectId` (**Single line of text**)
- `ShowcaseSection` (**Single line of text**)
- `AnchorJson` (**Multiple lines of text** en texte rich JSON position/zone)
- `Content` (**Multiple lines of text**)
- `Color` (**Single line of text**)
- `Resolved` (**Yes/No**)
- `RowVersion` (**Number** entier)
- `CreatedByEmail` (**Single line of text**), `UpdatedByEmail` (**Single line of text**), `UpdatedAt` (**Date and Time**)

### D. `ComplianceComments`
- `CommentId` (**Single line of text**, valeur unique)
- `ProjectId` (**Single line of text**)
- `SectionKey` (**Single line of text**)
- `Message` (**Multiple lines of text**)
- `CommentType` (**Choice** : Question / Recommendation / Blocking)
- `ThreadId` (**Single line of text**)
- `Resolved` (**Yes/No**)
- `RowVersion` (**Number** entier)
- `CreatedByEmail` (**Single line of text**), `UpdatedByEmail` (**Single line of text**), `UpdatedAt` (**Date and Time**)

### E. `ProjectDiscussions`
- `MessageId` (**Single line of text**, valeur unique)
- `ProjectId` (**Single line of text**)
- `ThreadId` (**Single line of text**)
- `SenderEmail` (**Single line of text**)
- `RecipientRole` (**Single line of text**)
- `Message` (**Multiple lines of text**)
- `AttachmentsJson` (**Multiple lines of text** en texte rich JSON)
- `RowVersion` (**Number** entier)
- `CreatedAt` (**Date and Time**), `UpdatedAt` (**Date and Time**)

### F. `ProjectMembers`
- `EntryId` (**Single line of text**, valeur unique)
- `ProjectId` (**Single line of text**)
- `MemberEmail` (**Single line of text**)
- `Role` (**Choice** : Owner / Contributor / Compliance / Viewer)
- `CanSubmit` (**Yes/No**)

### G. `BackofficeChanges`
- `ChangeId` (**Single line of text**, valeur unique)
- `EntityType` (**Choice** : Rule, Question, Team, Config…)
- `EntityId` (**Single line of text**)
- `PayloadJson` (**Multiple lines of text** en texte rich JSON)
- `ChangeType` (**Choice** : Create / Update / Delete)
- `RequiresValidation` (**Yes/No**)
- `RowVersion` (**Number** entier)
- `CreatedByEmail` (**Single line of text**), `UpdatedByEmail` (**Single line of text**), `UpdatedAt` (**Date and Time**)

### H. Bibliothèque `ProjectFiles`
- Arborescence par `ProjectId` / `InspirationId`
- Métadonnées : `EntityType` (**Choice**), `EntityId` (**Single line of text**), `UploadedBy` (**Single line of text**), `UploadedAt` (**Date and Time**), `Checksum` (**Single line of text**)

Les GUID des listes et des colonnes sont précisés dans le fichier SharePoint_Referentiel_Listes_GUID.md

## 4.2 Informations à partager à ChatGPT Codex quand vous recevez la clé API

Préparer ce “pack d’onboarding” :
1. `tenantId`, `clientId`
2. Type d’app : SPA pure
3. URL site SharePoint + `siteId` + nom/ID des listes créées.
4. Permissions Graph validées (delegated/app permissions) + consentement admin.
5. Règles de sécurité : qui peut lire/écrire/soumettre/envoyer les mails.

Voici les informations 
- tenantId : 72f988bf-86f1-41af-91ab-2d7cd011db47
- tenant name : lfb1
- clientId : a3f6c2d1-9b7e-4e5a-8c21-5f9b3d4e6a12
- Méthode d’auth finale : MSAL PKCE
- Pas de clientSecret
- ID du site : d0694d91-5626-4dc4-b738-0c61730474d4
- URL complete du sharepint : https://lfb1.sharepoint.com/sites/ProjectNavigator_DEV/
- URL vers le fichier index.aspx :  https://lfb1.sharepoint.com/sites/ProjectNavigator_DEV/Documents%20partages/app/index.aspx
- URL de la bibliothèque des projets / inspirations : https://lfb1.sharepoint.com/sites/ProjectNavigator_DEV/ProjectFiles/
- Méthode d’auth finale : MSAL PKCE
- Liste finale des permissions accordées : Delegated
- Admin consent pour : User.Read / Sites.ReadWrite.All / Mail.Send / Files.ReadWrite.All

## 4.3 Configuration de la clé / App Microsoft Graph

### Étapes Azure App Registration
1. Créer l’app dans Entra ID.
2. Définir redirect URIs (dev/staging/prod).
3. Activer tokens nécessaires (ID + access token selon flux).
4. Ajouter permissions Graph minimales :
   - `User.Read`
   - `Sites.ReadWrite.All` (ou scopes plus fins si possible)
   - `Mail.Send` (pour soumission)
   - éventuellement `Files.ReadWrite.All`
5. Appliquer **admin consent**.
6. Mettre en place stockage sécurisé des secrets (si backend).

### Configuration applicative
- Variables d’environnement (exemples) :
  - `GRAPH_TENANT_ID`
  - `GRAPH_CLIENT_ID`
  - `GRAPH_REDIRECT_URI`
  - `GRAPH_SCOPES=User.Read Sites.ReadWrite.All Mail.Send`
  - `SHAREPOINT_SITE_ID`
- Initialiser MSAL + token cache.
- Brancher `GraphDataProvider` à la place du mock.

---

## 5) Soumission projet (bouton conservé)

Le bouton “Soumettre le projet” reste visible pour le chef de projet.

Nouveau comportement :
1. Vérifier que la queue d’autosave est vide.
2. Passer `Status=Submitted` dans `Projects`.
3. Écrire un enregistrement d’audit (qui a soumis, quand).
4. Envoyer automatiquement un e-mail via Graph :
   - sujet standardisé,
   - résumé projet,
   - lien SharePoint / webapp.
5. Notifier l’UI en succès/échec avec retry si échec mail.

---

## 6) Plan de tests recommandé

- **Tests de concurrence** : 2–3 navigateurs modifiant le même projet simultanément.
- **Tests offline/online** : coupure réseau pendant édition, puis resynchronisation.
- **Tests de charge légère** : rafales d’édition sticky notes/commentaires.
- **Tests d’autorisations** : utilisateur non autorisé tente une soumission ou un edit backoffice.
- **Tests e-mail** : soumission déclenche un unique e-mail, non dupliqué en retry.

---

## 7) Risques fréquents et parades

- **Conflits fréquents** → fusion granulaire + verrouillage doux par section active.
- **Surcharge listes SharePoint** → indexer colonnes (`ProjectId`, `UpdatedAt`, `Status`) + pagination.
- **Dérive des schémas** → versionner les schémas JSON (`schemaVersion`).
- **Latence Graph** → UI optimiste + queue + retries.
- **Permissions trop larges** → principe du moindre privilège.

---

## 8) Checklist exécutable (ordre conseillé)

1. Introduire `DataProvider` + `MockSharePointProvider`.
2. Brancher autosave partout (webapp + backoffice).
3. Ajouter gestion des conflits et indicateurs UI.
4. Créer les listes SharePoint (ou mocks définitifs).
5. Implémenter soumission + workflow e-mail (mock puis réel).
6. Basculer du mock vers Graph le jour de la clé API.
7. Exécuter la campagne de tests de co-édition.
8. Go-live progressif (pilot puis généralisation).

---

## 9) Livrables préparés dans ce repo

- Ce document de migration : `docs/migration-sharepoint-graph.md`
- Mocks de listes SharePoint dans : `mock-sharepoint-lists/`
