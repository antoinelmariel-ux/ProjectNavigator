# Préparation SharePoint & Power Automate — checklist à faire de ton côté

> Ce document liste tout ce que **toi** (ou ton administrateur SharePoint) dois préparer pour que
> l'application puisse être branchée sur SharePoint.
> Le document jumeau `GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md` contient les instructions
> techniques pour Claude Code.
>
> **Mise à jour importante — plus besoin de l'API Microsoft Graph.** La stratégie retenue utilise
> l'**API REST native de SharePoint**, ce qui supprime toutes les demandes bloquantes qui
> figuraient dans la version précédente de ce document : **plus d'enregistrement d'application
> Azure AD, plus de consentement administrateur, plus de permissions Graph à demander.**
> Il te reste essentiellement à créer des listes et un flux Power Automate.

---

## Comprendre le principe en 30 secondes

- L'application reste **sans serveur** : c'est un dossier de fichiers déposé dans une bibliothèque
  de ton site SharePoint. Les utilisateurs ouvrent simplement une URL.
- Comme la page est **servie par SharePoint lui-même** (`https://lfb1.sharepoint.com/...`), le
  navigateur envoie automatiquement les cookies de connexion SharePoint de l'utilisateur.
  L'application peut donc lire et écrire dans les listes **avec les droits de la personne
  connectée**, sans aucune configuration d'authentification, sans mot de passe, sans clé.
- Conséquence pratique importante : **les permissions du site SharePoint = les permissions de
  l'application**. Si quelqu'un peut écrire dans la liste, il peut écrire depuis l'app ; s'il n'y
  a pas accès, l'app ne lui donnera pas plus de droits. C'est simple, sûr, et c'est ton seul
  levier de contrôle d'accès.
- Les **notifications** sont envoyées par **Power Automate** (jamais par l'application elle-même)
  — conforme à l'interdiction d'envoyer des e-mails depuis l'API.

---

## Étape 1 — Vérifier que la page s'affiche bien (déjà OK chez toi)

Tu m'as confirmé que l'app est déjà servie depuis `https://lfb1.sharepoint.com/...`, donc ce
point est acquis. Pour mémoire, deux conditions doivent rester vraies :

- Le point d'entrée est un fichier **`index.aspx`** (et non `index.html`) : SharePoint exécute les
  pages `.aspx`, alors qu'il propose les `.html` en téléchargement.
- Les **scripts personnalisés** doivent être autorisés sur le site. Si un jour la page se met à se
  télécharger au lieu de s'afficher, c'est ce réglage qui a été désactivé ; la commande à donner à
  l'administrateur SharePoint est :
  `Set-SPOSite -Identity https://lfb1.sharepoint.com/sites/<nom-du-site> -DenyAddAndCustomizePages $false`

**Aucune autre demande à faire à l'IT.** (C'était le point bloquant de la stratégie précédente,
il n'existe plus.)

---

## Étape 2 — Le site SharePoint

1. Utilise (ou crée) un **site d'équipe** dédié, par exemple
   `https://lfb1.sharepoint.com/sites/compliance-navigator`.
2. **Gère les accès avec soin, c'est ton contrôle de sécurité principal** :
   - **Membres** (lecture + écriture) : tous les utilisateurs de l'app — ils doivent pouvoir
     créer et modifier des éléments dans les listes.
   - **Propriétaires** : les administrateurs de l'outil (ce sont eux qui pourront publier la
     configuration depuis le back-office).
   - Évite un partage « toute l'organisation » si les projets contiennent des données sensibles.
3. Note l'URL exacte du site : c'est la seule information dont Claude a besoin (et encore,
   l'application la déduit automatiquement de son adresse).

## Étape 3 — Créer les 3 bibliothèques de documents

Dans le site : **Contenu du site → Nouveau → Bibliothèque de documents**. Noms exacts :

| Nom | Rôle |
|---|---|
| `CN-App` | Les fichiers de l'application (dont `index.aspx`) |
| `CN-Config` | Les fichiers de paramètres JSON (règles et équipes n'en font plus partie, voir `CN_Rules`/`CN_Teams` étape 4) — **créée vide, l'app la remplira toute seule** |
| `CN-Documents` | Les pièces jointes ajoutées par les utilisateurs |

## Étape 4 — Créer les 12 listes

> **Mise à jour du 29/08/2026** : les tableaux `CN_ComplianceComments` et `CN_ShowcaseStickyNotes`
> ci-dessous avaient chacun deux colonnes manquantes (`Status`/`AttachmentsJson` pour le premier,
> `RepliesJson`/`AttachmentsJson` pour le second) par rapport à ce que le code utilise réellement.
> Si tes listes DEV (créées le 28/08/2026) suivaient l'ancienne version de ce document, il te
> manque probablement ces 4 colonnes. Utilise
> [`VERIFICATION-CONFIGURATION-SHAREPOINT.md`](VERIFICATION-CONFIGURATION-SHAREPOINT.md) pour
> vérifier et les créer automatiquement.

⚠️ **Règle d'or : crée chaque colonne avec exactement le nom indiqué, sans espace ni accent.**
SharePoint fige le « nom interne » d'une colonne au moment de sa création, et c'est ce nom que le
code utilise. Tu pourras renommer l'affichage plus tard, mais jamais le nom interne.

Pour chaque liste : **Contenu du site → Nouveau → Liste → Liste vierge**, puis ajoute les colonnes.

Conventions du tableau ci-dessous :
- **Title** existe déjà dans toute liste : rien à créer (rends-la simplement non obligatoire dans
  les paramètres de la colonne si tu ne veux pas être bloqué à la saisie).
- **Texte long** = « Plusieurs lignes de texte », en mode **texte brut** (surtout pas texte
  enrichi : ces colonnes contiennent des données techniques).
- 📌 = colonne à **indexer** : Paramètres de la liste → Colonnes indexées → Créer un index.
  Indispensable pour que les recherches continuent de fonctionner quand la liste dépasse
  5 000 éléments.

### `CN_Projects` — les projets saisis dans l'outil
| Colonne | Type |
|---|---|
| Title | (existante — nom du projet) |
| ProjectId 📌 | Une ligne de texte |
| Status 📌 | Choix : `Draft`, `Submitted` |
| OwnerEmail | Une ligne de texte |
| CurrentEditorEmail | Une ligne de texte |
| AnswersJson | Texte long |
| AnalysisJson | Texte long |
| ProgressAnswered | Nombre |
| ProgressTotal | Nombre |
| SubmissionDate | Date et heure |
| LastAutosaveAt | Date et heure |
| RowVersion | Nombre |
| CreatedByEmail | Une ligne de texte |
| UpdatedByEmail | Une ligne de texte |

### `CN_Inspirations` — la bibliothèque d'inspirations
| Colonne | Type |
|---|---|
| Title | (existante) |
| InspirationId 📌 | Une ligne de texte |
| Visibility | Choix : `Personal`, `Shared` |
| InspirationJson | Texte long |
| RowVersion | Nombre |
| CreatedByEmail | Une ligne de texte |
| UpdatedByEmail | Une ligne de texte |
| UpdatedAt | Date et heure |

### `CN_ComplianceComments` — commentaires compliance sur les synthèses
| Colonne | Type |
|---|---|
| CommentId 📌 | Une ligne de texte |
| ProjectId 📌 | Une ligne de texte |
| SectionKey | Une ligne de texte |
| Message | Texte long |
| CommentType | Une ligne de texte |
| ThreadId | Une ligne de texte |
| Status | Une ligne de texte |
| AttachmentsJson | Texte long |
| Resolved | Oui/Non |
| RowVersion | Nombre |
| CreatedByEmail | Une ligne de texte |
| UpdatedByEmail | Une ligne de texte |
| UpdatedAt | Date et heure |

### `CN_ProjectDiscussions` — fils de discussion des projets
| Colonne | Type |
|---|---|
| MessageId 📌 | Une ligne de texte |
| ProjectId 📌 | Une ligne de texte |
| ThreadId | Une ligne de texte |
| SenderEmail | Une ligne de texte |
| RecipientRole | Une ligne de texte |
| Message | Texte long |
| AttachmentsJson | Texte long |
| RowVersion | Nombre |
| CreatedAt | Date et heure |
| UpdatedAt | Date et heure |

### `CN_ProjectMembers` — qui est co-porteur de quel projet
| Colonne | Type |
|---|---|
| EntryId | Une ligne de texte |
| ProjectId 📌 | Une ligne de texte |
| MemberEmail 📌 | Une ligne de texte |
| Role | Une ligne de texte |
| CanSubmit | Oui/Non |

### `CN_BackofficeChanges` — historique des modifications d'administration
| Colonne | Type |
|---|---|
| ChangeId | Une ligne de texte |
| EntityType 📌 | Une ligne de texte |
| EntityId | Une ligne de texte |
| PayloadJson | Texte long |
| ChangeType | Une ligne de texte |
| RequiresValidation | Oui/Non |
| RowVersion | Nombre |
| CreatedByEmail | Une ligne de texte |
| UpdatedByEmail | Une ligne de texte |
| UpdatedAt | Date et heure |

### `CN_ShowcaseStickyNotes` — post-its de la vitrine projets
| Colonne | Type |
|---|---|
| StickyId | Une ligne de texte |
| ProjectId 📌 | Une ligne de texte |
| ShowcaseSection | Une ligne de texte |
| AnchorJson | Texte long |
| Content | Texte long |
| Color | Une ligne de texte |
| RepliesJson | Texte long |
| AttachmentsJson | Texte long |
| Resolved | Oui/Non |
| RowVersion | Nombre |
| CreatedByEmail | Une ligne de texte |
| UpdatedByEmail | Une ligne de texte |
| UpdatedAt | Date et heure |

### `CN_FilesIndex` — index des pièces jointes
| Colonne | Type |
|---|---|
| FileId | Une ligne de texte |
| EntityType 📌 | Une ligne de texte |
| EntityId 📌 | Une ligne de texte |
| Path | Une ligne de texte |
| UploadedBy | Une ligne de texte |
| UploadedAt | Date et heure |
| Checksum | Une ligne de texte |

### `CN_NotificationsQueue` — file d'attente des notifications
C'est la liste qui remplace l'envoi d'e-mail direct : l'app y dépose une demande, Power Automate
envoie et coche « fait ». Elle te sert aussi de **journal consultable** de tout ce qui est parti.

| Colonne | Type |
|---|---|
| Title | (existante — objet du message) |
| NotificationType | Une ligne de texte |
| ToEmails | Texte long (destinataires séparés par `;`) |
| CcEmails | Texte long |
| Body | Texte long |
| ProjectId | Une ligne de texte |
| Status 📌 | Choix : `Pending`, `Sent`, `Error` — **valeur par défaut : `Pending`** |
| SentAt | Date et heure |
| ErrorMessage | Texte long |

### `CN_UserProfiles` — profil personnel (périmètre d'activité + langue)
Une ligne par personne, retrouvée par son email. Alimentée par l'écran d'onboarding affiché à la
première connexion, et modifiable ensuite depuis la section « Mon profil » de l'application.

| Colonne | Type |
|---|---|
| UserEmail 📌 | Une ligne de texte |
| ActivityScopeJson | Texte long (périmètres choisis, ex. `["france","uk"]`) |
| PreferredLanguage | Une ligne de texte — **valeur par défaut : `en`** |
| HasCompletedOnboarding | Oui/Non |
| UpdatedAt | Date et heure |

### `CN_Rules` — les règles de conformité (une ligne par règle)
Remplace le fichier `rules.json` qu'une version antérieure de ce document proposait de mettre
dans `CN-Config` : chaque règle est maintenant sa propre ligne, pour que deux administrateurs qui
modifient chacun une règle différente ne se marchent plus dessus.

| Colonne | Type |
|---|---|
| Title | (existante — nom de la règle, pour repérer la ligne dans SharePoint) |
| RuleId 📌 | Une ligne de texte |
| PayloadJson | Texte long (la règle entière : conditions, équipes, questions, risques…) |
| SortOrder | Nombre |
| RowVersion | Nombre |
| CreatedByEmail | Une ligne de texte |
| UpdatedByEmail | Une ligne de texte |
| UpdatedAt | Date et heure |

### `CN_Teams` — les équipes de conformité (une ligne par équipe)
Remplace de la même façon le fichier `teams.json`.

| Colonne | Type |
|---|---|
| Title | (existante — nom de l'équipe) |
| TeamId 📌 | Une ligne de texte |
| ContactsJson | Texte long (liste d'emails, ex. `["dpo@lfb.fr"]`) |
| Expertise | Texte long |
| SortOrder | Nombre |
| RowVersion | Nombre |
| CreatedByEmail | Une ligne de texte |
| UpdatedByEmail | Une ligne de texte |
| UpdatedAt | Date et heure |

💡 **Astuce de vérification** : une fois les listes créées, l'application dispose d'un écran de
diagnostic (voir étape 6) qui te dira précisément quelle liste ou quelle colonne manque. Inutile
de tout relire à la main.

---

## Étape 5 — Power Automate : le flux de notifications (indispensable)

> ℹ️ **Ce flux n'est pas optionnel, et il n'y a pas de contournement possible.** L'ancienne API
> d'envoi d'e-mail de SharePoint (`SP.Utilities.Utility.SendEmail`) a été **retirée par
> Microsoft** (testé le 28/08/2026 : l'appel échoue avec « L'API SendEmail a été mise hors
> service »), et l'API Graph `sendMail` est interdite par la politique de sécurité. Power
> Automate est la voie de remplacement recommandée par Microsoft lui-même.

Va sur [make.powerautomate.com](https://make.powerautomate.com) → **Créer → Flux de cloud
automatisé**. Aucun connecteur premium n'est nécessaire.

**Flux « CN – Envoi des notifications »**

1. **Déclencheur** : SharePoint → « **Lorsqu'un élément est créé** »
   → Site : ton site · Liste : `CN_NotificationsQueue`.
2. **Condition** (recommandé) : `Status` est égal à `Pending` → brancher la suite sur « Si oui ».
3. **Action** : Office 365 Outlook → « **Envoyer un e-mail (V2)** »
   - À : contenu dynamique `ToEmails`
   - Cc : contenu dynamique `CcEmails`
   - Objet : contenu dynamique `Title` (tu peux préfixer par `[Project Navigator] `)
   - Corps : contenu dynamique `Body`
   - ⚠️ L'e-mail partira **de la boîte du propriétaire du flux** (toi). **Recommandé** : utiliser
     plutôt « Envoyer un e-mail à partir d'une boîte aux lettres partagée (V2) » avec une boîte
     partagée dédiée (à demander à l'IT — c'est une demande simple, sans enjeu de sécurité).
     Avantage : les messages ne semblent pas venir de toi personnellement, et le flux survit à un
     changement de poste.
4. **Action** : SharePoint → « **Mettre à jour l'élément** » → même site/liste,
   ID = contenu dynamique `ID` du déclencheur, `Status` = `Sent`, `SentAt` = expression `utcNow()`.
5. **Gestion d'erreur** (recommandé) : ajoute une action « Mettre à jour l'élément » configurée
   via « Exécuter après → en cas d'échec » de l'étape 3, qui met `Status` = `Error` et remplit
   `ErrorMessage`. Tu verras ainsi directement dans la liste les notifications qui n'ont pas pu
   partir, sans ouvrir Power Automate.

**Variante Teams** : ajoute une action « Publier un message dans un canal » (connecteur Microsoft
Teams) pour poster également dans le canal de l'équipe compliance.

**Flux optionnels à envisager plus tard** (mêmes briques, aucun changement dans l'application) :
- **Récapitulatif hebdomadaire** : déclencheur « Périodicité » → « Obtenir les éléments » de
  `CN_Projects` filtré sur `Status eq 'Submitted'` → e-mail de synthèse à l'équipe.
- **Alerte à la soumission** : déclencheur « Lorsqu'un élément est créé ou modifié » sur
  `CN_Projects` + condition sur `Status` = `Submitted`.
- **Archivage** : purge mensuelle des notifications `Sent` de plus de 6 mois, pour garder la
  liste légère.

**Bonnes pratiques** : ajoute un **co-propriétaire** au flux (s'il tourne sur ton seul compte, il
s'arrête quand ton compte change) et vérifie les connexions utilisées en haut du flux.

---

## Étape 6 — Ce que fait l'application toute seule (pour info)

- **Aucun fichier de paramètres à téléverser à la main.** L'app disposera dans son back-office
  d'un panneau **« Synchronisation SharePoint »** réservé aux administrateurs, avec :
  - un **diagnostic** : la liste de tout ce qui est attendu (listes, bibliothèques, fichiers de
    configuration) avec ✅ / ❌ — c'est ton outil de vérification de l'étape 4 ;
  - un bouton **« Publier la configuration vers SharePoint »** qui écrit automatiquement les 5
    fichiers de paramètres (questions, niveaux de risque, pondérations, thèmes de vitrine,
    réglages généraux) dans `CN-Config` avec confirmation avant tout écrasement, **et** publie en
    même temps chaque règle et chaque équipe comme une ligne dans `CN_Rules`/`CN_Teams` ;
  - un bouton **« Recharger depuis SharePoint »** en cas de conflit entre deux administrateurs.
- **Aucune connexion demandée aux utilisateurs** : ils sont déjà connectés à SharePoint, l'app
  reconnaît automatiquement qui ils sont.
- Mise à jour de l'app : il suffira de remplacer les fichiers dans `CN-App`. Les données, elles,
  vivent dans les listes — elles ne sont jamais touchées par une mise à jour.

## Étape 7 — Ce que tu me transmets pour lancer la migration

C'est très court maintenant. Copie-colle ceci complété dans la conversation avec Claude :

```
URL du site SharePoint  : https://lfb1.sharepoint.com/sites/........
URL exacte de la page   : https://lfb1.sharepoint.com/sites/......../CN-App/index.aspx
Les 12 listes CN_... sont créées avec les noms de colonnes exacts : oui / non
Bibliothèques CN-App / CN-Config / CN-Documents créées          : oui / non
Flux Power Automate de notifications créé et activé              : oui / non
Boîte d'envoi utilisée par le flux : ma boîte / boîte partagée : ...............
```

## Étape 8 — Test de bout en bout (une fois la migration faite)

1. Ouvre l'URL `.../CN-App/index.aspx` → l'app s'ouvre **directement**, avec ton vrai nom
   affiché, sans écran de connexion.
2. Back-office → panneau « Synchronisation SharePoint » : le diagnostic doit être entièrement
   vert. Clique « Publier la configuration vers SharePoint » → les fichiers apparaissent dans
   `CN-Config`, et une ligne par règle/équipe apparaît dans `CN_Rules`/`CN_Teams`.
3. Crée un projet test, réponds à 2–3 questions, enregistre → une ligne apparaît dans
   `CN_Projects`.
4. Soumets le projet → une ligne `Pending` apparaît dans `CN_NotificationsQueue`, puis passe à
   `Sent`, et l'e-mail est reçu.
5. Demande à un collègue membre du site de refaire les étapes 1 et 3 depuis son poste : il doit
   voir ton projet test.
6. Laisse un onglet ouvert une nuit puis reviens dessus : l'app doit afficher un message
   « session expirée, rechargez la page » et non une page cassée.

---

## Points de vigilance

- **Coûts** : aucun. SharePoint, les listes et Power Automate « standard » sont inclus dans
  Microsoft 365. Pas de serveur à payer ni à maintenir, pas de licence premium.
- **Sécurité et accès** : rappel — **les permissions du site pilotent tout**. Une personne
  retirée du site perd immédiatement l'accès aux données depuis l'app. Inversement, ne donne pas
  l'accès au site « pour voir » à quelqu'un qui ne doit pas lire les projets.
- **Données personnelles** : les listes contiennent des e-mails d'utilisateurs et le contenu des
  projets. Vérifie avec ton référent RGPD si les projets peuvent contenir des données sensibles,
  et pense à définir une durée de conservation (un flux d'archivage peut l'automatiser).
- **Sauvegarde** : SharePoint versionne automatiquement les éléments de listes et les fichiers.
  Vérifie que l'historique des versions est bien activé sur `CN-Config` — c'est ton filet de
  sécurité si une publication de configuration se passe mal.
- **Limite des 5 000 éléments** : au-delà, SharePoint devient exigeant sur les filtres. C'est la
  raison des colonnes indexées (📌). Rien de plus à faire de ton côté.
- **Ce qui reste hors périmètre de l'API REST** : envoi d'e-mails, messages Teams, tâches
  planifiées, actions nécessitant des droits que l'utilisateur n'a pas. Tout cela passe par
  Power Automate, selon le même principe que le flux de notifications (l'app dépose une demande
  dans une liste, un flux l'exécute). Si un nouveau besoin de ce type apparaît, dis-le à Claude :
  la brique existe déjà, il suffit d'ajouter un type de demande.
