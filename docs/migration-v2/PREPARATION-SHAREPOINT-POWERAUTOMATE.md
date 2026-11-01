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
- Comme la page est **servie par SharePoint lui-même** (`https://entreprisedemo1.sharepoint.com/...`), le
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

Tu m'as confirmé que l'app est déjà servie depuis `https://entreprisedemo1.sharepoint.com/...`, donc ce
point est acquis. Pour mémoire, deux conditions doivent rester vraies :

- Le point d'entrée est un fichier **`index.aspx`** (et non `index.html`) : SharePoint exécute les
  pages `.aspx`, alors qu'il propose les `.html` en téléchargement.
- Les **scripts personnalisés** doivent être autorisés sur le site. Si un jour la page se met à se
  télécharger au lieu de s'afficher, c'est ce réglage qui a été désactivé ; la commande à donner à
  l'administrateur SharePoint est :
  `Set-SPOSite -Identity https://entreprisedemo1.sharepoint.com/sites/<nom-du-site> -DenyAddAndCustomizePages $false`

**Aucune autre demande à faire à l'IT.** (C'était le point bloquant de la stratégie précédente,
il n'existe plus.)

---

## Étape 2 — Le site SharePoint

1. Utilise (ou crée) un **site d'équipe** dédié, par exemple
   `https://entreprisedemo1.sharepoint.com/sites/compliance-navigator`.
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
| Status 📌 | Choix : `Draft`, `Submitted`, `Cancelled` |
| OwnerEmail | Une ligne de texte |
| CurrentEditorEmail | Une ligne de texte |
| AnswersJson | Texte long |
| AnalysisJson | Texte long |
| ProgressAnswered | Nombre |
| ProgressTotal | Nombre |
| SubmissionDate | Date et heure |
| CancelledDate | Date et heure |
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
| AssigneeEmail | Une ligne de texte |
| ClaimJson | Texte long |
| RowVersion | Nombre |
| CreatedByEmail | Une ligne de texte |
| UpdatedByEmail | Une ligne de texte |
| UpdatedAt | Date et heure |

`AssigneeEmail` et `ClaimJson` portent la **prise en charge** du périmètre (uniquement sur les
lignes racines, `CommentType = root`) : le membre de l'équipe qui suit ce projet. `AssigneeEmail`
est volontairement une colonne à part, plate, pour rester lisible dans une vue SharePoint native
(« qui suit quoi ») ; `ClaimJson` porte le détail
(`{"claim":{"assigneeEmail":"…","assignedAt":"…","assignedByEmail":"…","reason":"absence","reasonNote":"…","reminderSentAt":"…"},"history":[…]}`)
dont l'historique des reprises. Les deux colonnes vides = personne ne suit ce périmètre, ce qui
est l'état d'avant cette fonctionnalité : aucune reprise de données n'est nécessaire.

`ClaimJson` porte aussi, sous `review`, la **date de l'avis** de l'expert ou du comité
(`{"review":{"statusUpdatedAt":"…","reviewedAt":"…","reviewedVersion":2,"needsReviewSince":2,"confirmation":{…}}}`).
`UpdatedAt` ne convient pas pour cela : il est réécrit à chaque écriture de la ligne racine
(réponse dans le fil, prise en charge, relance). Une ligne écrite avant ce champ retombe sur
`UpdatedAt`, sans reprise de données ; dans un flux, lire la date de l'avis dans
`ClaimJson.review.statusUpdatedAt` quand elle est présente.

### `CN_ProjectMembers` — qui est co-porteur de quel projet
| Colonne | Type |
|---|---|
| EntryId | Une ligne de texte |
| ProjectId 📌 | Une ligne de texte |
| MemberEmail 📌 | Une ligne de texte |
| Role | Une ligne de texte |
| CanSubmit | Oui/Non |

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

Elle sert aussi de canal pour les **rapports d'erreur d'affichage** : dès que l'écran « Affichage
interrompu » s'affiche (plantage React intercepté par l'`AppErrorBoundary` de `src/main.jsx`),
l'app dépose automatiquement une ligne ici — `NotificationType` = « Display error report », message
+ piles d'appels dans `Body` (voir `src/utils/notificationTemplates.js#buildErrorReportEmail`),
adressée aux administrateurs back-office courants (`adminEmails`) — même flux Power Automate que
les autres notifications, aucune configuration supplémentaire à faire. L'utilisateur n'a rien à
cliquer pour que l'équipe technique soit prévenue. Le bouton « Envoyer un rapport à l'équipe
technique » affiché sur cet écran sert seulement à compléter ce rapport avec un commentaire libre
(« Que faisiez-vous avant l'incident ? ») : sans commentaire il se contente de confirmer que le
signalement est déjà pris en compte ; avec un commentaire il dépose une seconde ligne (« Error
report - details added ») pour que l'équipe rattache ce contexte au même incident. En mode local
(`file://`) ce n'est qu'un `console.info`, comme pour toute notification simulée.

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

### `CN_SiteAccessRequests` — demandes d'ajout comme membre du site
Décision assumée : quand quelqu'un est sélectionné via la recherche de personnes (partage de
projet, contacts d'équipe, comités, administrateurs) et n'apparaît pas comme membre du site,
l'app dépose ici une demande **par précaution**. Un flux Power Automate (voir étape 5 bis)
l'ajoute alors réellement comme membre. Même mécanique de file d'attente que
`CN_NotificationsQueue` — journal consultable inclus.

| Colonne | Type |
|---|---|
| Title | (existante — l'e-mail de la personne visée) |
| TargetEmail 📌 | Une ligne de texte |
| DisplayName | Une ligne de texte |
| RequestedByEmail | Une ligne de texte |
| Context | Une ligne de texte (ex. `Partage de projet : Mon projet`) |
| Status 📌 | Choix : `Pending`, `Done`, `Error` — **valeur par défaut : `Pending`** |
| ProcessedAt | Date et heure |
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
| TeamPreferencesJson | Texte long (refus de copie par équipe, ex. `{"controle_pub":{"claimCopy":false}}` ; vide = copie reçue) |
| AbsenceJson | Texte long (absence et suppléant, ex. `{"from":"2026-09-14","to":"2026-09-25","backupEmail":"queres@entreprise-demo.example"}`) |
| UpdatedAt | Date et heure |

`TeamPreferencesJson` est le réglage **par personne** des copies d'annonce de prise en charge :
désactivé par défaut, il n'apparaît que pour les équipes dont la personne est contact. `AbsenceJson`
porte une période d'indisponibilité et un suppléant (qui doit être contact de la même équipe pour
recevoir les sollicitations) ; il est modifiable par un tiers depuis l'onglet **Équipes** du
back-office, puisqu'une absence imprévue n'est jamais déclarée par l'absent.

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
Remplace de la même façon le fichier `teams.json`. Le nom et le domaine d'expertise sont
traduisibles dans les 4 langues de l'app (anglais, français, allemand, espagnol) : `NameJson`
et `Expertise` transportent un objet JSON `{en, fr, de, es}` (une langue peut être absente tant
qu'elle n'a pas été traduite depuis le back-office). `Title` reste une chaîne simple dérivée du
nom (langue par défaut) uniquement pour rester lisible telle quelle dans les vues SharePoint
natives — ce n'est plus la source de vérité de l'app. `AcceptedLanguagesJson` liste les langues
(parmi les 4 ci-dessus) dans lesquelles l'équipe peut échanger avec les porteurs de projet, ex.
`["fr","en"]` ; un tableau vide ou absent signifie que toutes les langues sont acceptées.

`MemberRulesJson` porte le routage par membre d'une équipe à plusieurs contacts : une entrée par
membre *conditionné*, de la forme `{"email":"...","mode":"include|exclude","conditionGroups":[...]}`
(mêmes groupes de conditions que les règles). `include` = ce membre n'est sollicité que si les
critères sont remplis, `exclude` = il l'est sauf si. Un contact sans entrée est toujours sollicité,
donc une colonne vide ou absente reproduit exactement le comportement historique.

`ClaimStaleDays` et `ClaimReminderDays` règlent la péremption d'une prise en charge, **en jours
ouvrés**, et sont indépendants l'un de l'autre : au-delà de `ClaimStaleDays` le projet est signalé
dans la liste et dans la vue charge du back-office, au-delà de `ClaimReminderDays` son référent
reçoit une relance par e-mail — avec les valeurs par défaut (6 et 3), la relance par e-mail arrive
donc avant le signalement visuel. `0` désactive le signal correspondant ; une colonne vide reprend
les valeurs par défaut.

| Colonne | Type |
|---|---|
| Title | (existante — nom de l'équipe, langue par défaut, dérivé automatiquement) |
| TeamId 📌 | Une ligne de texte |
| ContactsJson | Texte long (liste d'emails, ex. `["dpo@entreprise-demo.example"]`) |
| NameJson | Texte long (nom traduit, ex. `{"en":"Legal","fr":"Juridique"}`) |
| Expertise | Texte long (domaine d'expertise traduit, ex. `{"en":"...","fr":"..."}`) |
| AcceptedLanguagesJson | Texte long (langues de réponse acceptées, ex. `["fr","en"]`) |
| MemberRulesJson | Texte long (critères de sollicitation par membre, ex. `[{"email":"queres@entreprise-demo.example","mode":"include","conditionGroups":[...]}]`) |
| ClaimStaleDays | Nombre — **valeur par défaut : 6** |
| ClaimReminderDays | Nombre — **valeur par défaut : 3** |
| SortOrder | Nombre |
| RowVersion | Nombre |
| CreatedByEmail | Une ligne de texte |
| UpdatedByEmail | Une ligne de texte |
| UpdatedAt | Date et heure |

### `CN_SampleProjects` — les projets types du banc d'essai (une ligne par projet type)

Sert au banc d'essai de l'onglet **Revue Compliance** du back-office : un projet type est un jeu
de réponses nommé (« Étude clinique Ph. III », « Outil interne RH »…) que les experts chargent
pour voir ce que les règles produisent, puis dont ils repartent pour créer une nouvelle règle.

Trois points à garder en tête :

- **Ce ne sont jamais de vrais projets.** Rien de ce qui est ici n'est soumis, notifié, scoré ni
  visible des chefs de projet. `AnswersJson` a la même forme que `AnswersJson` de `CN_Projects`
  (c'est ce qui permet d'importer un projet réel comme projet type en un clic), mais la liste vit
  à part, et les experts y écrivent librement.
- **La liste peut légitimement rester vide** : tant qu'aucun expert n'a enregistré de projet type,
  l'application affiche simplement un corpus vide. Contrairement à `CN_Rules`/`CN_Teams`, une
  liste vide ne veut donc pas dire « référentiel jamais publié » et ne déclenche aucun repli.
- **Les droits sont ceux des autres listes de configuration** : lecture pour tous les membres du
  site, écriture pour les personnes qui accèdent au back-office. Un projet type importé depuis un
  projet réel en recopie les réponses — si ton site héberge des projets sensibles, aligne les
  droits de `CN_SampleProjects` sur ceux de `CN_Projects`.

| Colonne | Type |
|---|---|
| Title | (existante — nom du projet type, ex. « Étude clinique Ph. III ») |
| SampleId 📌 | Une ligne de texte |
| AnswersJson | Texte long (les réponses du projet type, même forme que `CN_Projects.AnswersJson`) |
| SortOrder | Nombre |
| RowVersion | Nombre |
| CreatedByEmail | Une ligne de texte |
| UpdatedByEmail | Une ligne de texte |
| UpdatedAt | Date et heure |

Aucun flux Power Automate n'est associé à cette liste : elle ne déclenche ni mail, ni Teams, ni
planification.

### `CN_Faq` — la FAQ de la fenêtre d'aide (une ligne par question)

Éditée par les administrateurs dans l'onglet **FAQ** du back-office (aucune modification de code ni
de déploiement n'est nécessaire pour la mettre à jour). Une ligne par question, le texte est
traduit dans les 4 langues de l'application ; une langue manquante retombe sur le français.

- **Liste vide ou aucune ligne publiée** : l'application affiche la page d'aide par défaut
  embarquée (`src/pages/faq.html`). Ce n'est donc pas une erreur.
- `CategoryJson` regroupe les questions sous un intitulé : deux questions sont dans la même catégorie quand leur libellé est identique (casse ignorée) dans la langue du lecteur. Les groupes suivent l'ordre de première apparition ; sans catégorie, pas d'intitulé.
- `IsPublished` masque une question sans la supprimer. `SortOrder` fixe l'ordre d'affichage.
- `AnswerJson` contient du texte riche limité (gras, italique, souligné, listes, liens), nettoyé
  par l'application à l'affichage.
- **Droits** : lecture pour tous les membres du site, écriture pour les administrateurs.

| Colonne | Type |
|---|---|
| Title | (existante — question en langue par défaut, dérivée automatiquement) |
| FaqId 📌 | Une ligne de texte |
| QuestionJson | Texte long (question traduite, ex. `{"fr":"Comment créer un projet ?","en":"How do I create a project?"}`) |
| AnswerJson | Texte long (réponse traduite en texte riche, ex. `{"fr":"<p>Cliquez sur…</p>"}`) |
| CategoryJson | Texte long (catégorie facultative, traduite, ex. `{"fr":"Le questionnaire","en":"The questionnaire"}`) |
| IsPublished | Oui/Non — **valeur par défaut : Oui** |
| SortOrder | Nombre |
| RowVersion | Nombre |
| CreatedByEmail | Une ligne de texte |
| UpdatedByEmail | Une ligne de texte |
| UpdatedAt | Date et heure |

Aucun flux Power Automate n'est associé à cette liste.

### `CN_CommitteeSessions` — le calendrier des comités (une ligne par séance)

Les séances de chaque comité de validation, et l'ordre du jour de chacune (spécification :
`docs/specs/calendrier-comites.md`). Le président et le co-président d'un comité (choisis dans
l'onglet **Comités de validation** du back-office, puis publiés avec la configuration) planifient
les séances ; les chefs de projet y inscrivent leur projet depuis « Enjeux du projet ».

- **L'ordre du jour entier est dans `AgendaJson`**, sur la ligne de la séance : c'est ce qui
  permet de départager deux inscriptions simultanées sur le temps qui reste réellement. Chaque
  écriture relit la ligne et l'écrit sous contrôle de version ; si quelqu'un a écrit entre-temps,
  l'application rejoue l'action sur la nouvelle version (et refuse l'inscription si la séance est
  devenue pleine).
- **Liste absente ou illisible** : l'application garde les séances locales, sans erreur bloquante.
  Une liste vide est un calendrier vide.
- **Droits** : lecture et écriture pour tous les membres du site (un chef de projet écrit sur la
  ligne de la séance quand il s'inscrit). Les règles « seul le président peut… » sont appliquées
  par l'application, comme toutes les autres règles d'accès.
- `OutlookEventId` est réservée aux futurs flux d'invitations Outlook (étapes 2 et 3 de la
  spécification) ; l'application ne l'écrit pas.

| Colonne | Type |
|---|---|
| Title | (existante — « comité — date », dérivé automatiquement) |
| SessionId 📌 | Une ligne de texte |
| CommitteeId | Une ligne de texte (indexée) |
| StartAt | Une ligne de texte (date ISO, ex. `2026-11-10T13:00:00.000Z`) |
| DurationMinutes | Nombre |
| Location | Texte long (lien Teams ou salle — un lien Teams dépasse souvent les 255 caractères d'une ligne de texte) |
| Status | Une ligne de texte (`draft`, `published`, `cancelled`) |
| AgendaJson | Texte long (passages ordonnés : projet ou sujet hors projet, durée, invités, demande de temps, présences propres au passage, rappels envoyés) |
| AttendanceJson | Texte long (présences de la séance, ex. `{"prenom.nom@lfb.fr":"present"}`) |
| PlanningReminderSentAt | Une ligne de texte |
| OutlookEventId | Une ligne de texte |
| RowVersion | Nombre |
| CreatedByEmail | Une ligne de texte |
| UpdatedByEmail | Une ligne de texte |
| UpdatedAt | Date et heure |

Les mails (inscription, demande de temps, actions du président, séance déplacée ou annulée,
rappels J-7 et J-1, rappel de planification) passent par `CN_NotificationsQueue` et le flux de
notifications existant : **aucun nouveau flux n'est nécessaire** pour ces mails. Les invitations
Outlook des chefs de projet passent par la liste `CN_CommitteeInvitations` et leur propre flux
(étape 5 quater) ; celles des membres restent pour l'instant gérées à la main.

`ClaimJson` de `CN_ComplianceComments` porte aussi, sous `review`, la séance où l'avis d'un comité
a été rendu (`sessionId`) et l'avis tel qu'il était à l'issue de chaque séance (`sessionOutcomes`).

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

## Étape 5 bis — Power Automate : le flux d'ajout comme membre du site

> ℹ️ **Décision assumée par toi (pas un comportement par défaut de l'app) : par précaution,
> toute personne sélectionnée via la recherche de personnes et absente de la liste des membres
> du site est automatiquement ajoutée comme membre.** Comme pour l'envoi d'e-mail, l'app ne peut
> pas faire cet ajout elle-même : la session du navigateur n'a presque jamais le droit « Gérer
> les permissions ». Ce flux tourne donc avec **une connexion qui l'a** (compte propriétaire de
> site, ou admin SharePoint) — c'est tout l'intérêt du contournement.

Marche à suivre condensée — **le détail complet, avec les pièges (format du `LoginName`,
récupération du groupe « Membres » du site), est dans**
[`MODE-OPERATOIRE-POWER-AUTOMATE.md`](MODE-OPERATOIRE-POWER-AUTOMATE.md), section
« Flux — Ajout automatique comme membre du site » :

**Flux « CN – Ajout comme membre du site »**

1. **Déclencheur** : SharePoint → « **Lorsqu'un élément est créé** »
   → Site : ton site · Liste : `CN_SiteAccessRequests`.
2. **Condition** : `Status` est égal à `Pending`.
3. **Action** : SharePoint → « **Envoyer une requête HTTP à SharePoint** » → ajoute la personne
   (`TargetEmail`) au groupe « Membres » du site.
4. **Action** : « Mettre à jour l'élément » → `Status` = `Done`, `ProcessedAt` = `utcNow()`.
5. **Gestion d'erreur** : même principe qu'à l'étape 5 → `Status` = `Error` + `ErrorMessage`.

⚠️ **Le compte propriétaire de ce flux doit avoir le droit « Gérer les permissions » sur le
site** (propriétaire de site ou admin SharePoint) — sans ça, l'action HTTP échoue systématiquement
avec un 403, et toutes les demandes finissent en `Error`.

---

## Étape 5 ter — Power Automate : le flux de relance des dossiers pris en charge (recommandé)

> ⚠️ **Contrairement aux autres flux « optionnels » de ce document, celui-ci remplace un
> comportement qui existait déjà côté application — il ne s'ajoute pas à lui.** Quand un membre
> d'une équipe prend en charge un dossier (voir la fonctionnalité « prise en charge » dans
> `CLAUDE.md`) et qu'il ne s'y passe plus rien pendant le délai configuré (`ClaimReminderDays`,
> 3 jours ouvrés par défaut), le référent reçoit une relance par e-mail. **Sans serveur dédié**,
> cette relance était jusqu'ici calculée et envoyée par la session de n'importe quel contact de
> l'équipe qui ouvrait l'application — ce qui veut dire qu'**aucune relance ne partait si personne
> de l'équipe n'ouvrait l'app**. L'application a été modifiée pour ne plus faire ce calcul du tout
> en mode SharePoint (`isSharePointMode()` désactive la passe dans `src/App.jsx`) : **sans ce
> flux, plus aucune relance de dossier pris en charge ne part une fois basculé sur SharePoint.**
> Elle continue de fonctionner sans ce flux en mode local/mock (`file://`), qui n'a pas
> d'alternative serveur.

**Marche à suivre condensée** — le détail complet (calcul des jours ouvrés, lecture/écriture du
`ClaimJson`, gabarit de l'e-mail) est dans
[`MODE-OPERATOIRE-POWER-AUTOMATE.md`](MODE-OPERATOIRE-POWER-AUTOMATE.md), section
« Flux 6 — Relance des dossiers pris en charge » :

**Flux « CN – Relance des dossiers pris en charge »**

1. **Déclencheur** : Périodicité → une fois par jour (ouvré de préférence).
2. **Action** : SharePoint → « Obtenir les éléments » sur `CN_ComplianceComments`, filtré sur
   `CommentType eq 'root' and AssigneeEmail ne '' and startswith(SectionKey,'team:')` (les
   comités ne sont jamais pris en charge, voir `CLAUDE.md` — inutile de les traiter ici).
3. **Pour chaque élément** : retrouver le seuil `ClaimReminderDays` de l'équipe concernée
   (`CN_Teams`, via l'identifiant après `team:` dans `SectionKey`), calculer les jours ouvrés
   écoulés depuis la dernière activité du périmètre (dernier changement de statut, dernière
   réponse du fil, ou à défaut la date de prise en charge), et comparer au seuil.
4. **Si la relance est due** (seuil dépassé et pas déjà relancé depuis) : déposer une ligne dans
   `CN_NotificationsQueue` (même flux d'envoi que l'étape 5, rien à reconfigurer) adressée au
   référent, puis mettre à jour `ClaimJson` sur la ligne `CN_ComplianceComments` pour y noter la
   date de relance (`claim.reminderSentAt`).

Aucune colonne supplémentaire à créer : tout ce dont ce flux a besoin (`AssigneeEmail`,
`ClaimJson`, `ClaimReminderDays`) existe déjà dans les listes de l'étape 4.

---

## Étape 5 quater — Power Automate : les invitations Outlook des comités (chefs de projet et membres)

Étape 2 de la spécification du calendrier des comités (`docs/specs/calendrier-comites.md`).
Quand un chef de projet (ou le président) inscrit un projet à une séance publiée, le chef de
projet, ses co-porteurs et ses invités reçoivent une invitation Outlook **sur toute la durée de
la séance**, envoyée par la boîte partagée des comités. Les intervenants d'un sujet hors projet
ajouté par le président la reçoivent aussi (même flux, même liste : rien de plus à configurer). Elle est mise à jour si la séance est
déplacée ou prolongée ou si les invités changent, et annulée si le passage est retiré ou la séance
annulée. Changer l'ordre de passage ou la durée d'un passage ne renvoie **rien** : l'invitation
ne mentionne ni l'un ni l'autre.

Étape 3 : le **même flux** envoie aussi l'invitation des **membres du comité** pour chaque séance
publiée (`Kind = members`), avec le lien vers la page « Ordre du jour ». Elle remplace la série
récurrente corrigée à la main : elle suit la séance (déplacée, prolongée, annulée, nouveau membre
du comité) mais **n'est jamais modifiée quand un projet est inscrit ou retiré** — l'ordre du jour
à jour est derrière le lien. Si la séance n'a pas de lieu, le flux crée la réunion Teams avec
cette invitation, et l'application reprend son lien dans les invitations des chefs de projet.

**Sans ce flux**, l'application fonctionne comme avant : les lignes s'accumulent dans
`CN_CommitteeInvitations` avec l'état « en cours d'envoi », et les invitations restent à faire à
la main.

### Comment l'application et le flux se partagent le travail

L'application n'envoie rien. Pour chaque passage, elle tient **une ligne** qui décrit l'invitation
telle qu'elle doit être (destinataires, créneau, objet, texte, active ou annulée) et incrémente
`Revision` à chaque changement réel. Le flux compare Outlook à cette ligne et la réconcilie :

| État de la ligne | Ce que fait le flux |
|---|---|
| `Status = active`, `OutlookEventId` vide | Crée l'événement, note son identifiant dans `OutlookEventId` |
| `Status = active`, `OutlookEventId` rempli | Met l'événement à jour (les participants reçoivent la mise à jour) |
| `Status = cancelled`, `OutlookEventId` rempli | Annule l'événement (les participants reçoivent l'annulation) |
| `Status = cancelled`, `OutlookEventId` vide | Rien à faire |

Dans tous les cas, le flux termine en écrivant `ProcessedRevision = Revision` (la révision qu'il
vient de traiter), `SyncState = done` et `ProcessedAt`. En cas d'échec : `SyncState = error` et
`ErrorMessage`, que le président voit sur la page « Ordre du jour » (badge « Invitation Outlook en
erreur »). Les deux côtés n'écrivent jamais la même colonne.

### La liste `CN_CommitteeInvitations`

**Droits** : lecture et écriture pour tous les membres du site (l'inscription est écrite depuis la
session du chef de projet).

| Colonne | Type | Écrite par |
|---|---|---|
| Title | (existante — objet de l'invitation) | application |
| InvitationId 📌 | Une ligne de texte (`<séance>::<passage>`) | application |
| SessionId | Une ligne de texte | application |
| PassageId | Une ligne de texte | application |
| ProjectId | Une ligne de texte | application |
| CommitteeId | Une ligne de texte | application |
| Kind | Une ligne de texte (`presentation` : chef de projet ou intervenants d'un sujet ; `members` : membres du comité) | application |
| Status | Une ligne de texte (`active` / `cancelled`) | application |
| Subject | Une ligne de texte | application |
| BodyHtml | Texte long (**texte brut**, pas « texte enrichi » : le HTML doit arriver tel quel) | application |
| StartAt | Une ligne de texte (date ISO en UTC, ex. `2026-11-10T13:00:00.000Z`) | application |
| EndAt | Une ligne de texte (idem) | application |
| Location | Texte long (lien Teams ou salle — un lien Teams dépasse souvent les 255 caractères d'une ligne de texte) | application |
| Attendees | Texte long (adresses séparées par `;`) | application |
| Revision | Nombre | application |
| ProcessedRevision | Nombre | flux |
| OutlookEventId | Une ligne de texte | flux |
| OnlineMeetingUrl | Texte long (lien de la réunion Teams créée pour l'invitation des membres) | flux |
| SyncState | Une ligne de texte (`pending` / `done` / `error`) | flux (l'application écrit `pending` à la création) |
| ErrorMessage | Texte long | flux |
| ProcessedAt | Une ligne de texte | flux |
| UpdatedByEmail | Une ligne de texte | application |
| UpdatedAt | Date et heure | application |

### Le lien Teams

Deux façons de faire, au choix du président, séance par séance :

- **Il colle un lien** dans « Lieu ou lien Teams » (back-office, onglet Comités de validation) :
  toutes les invitations de la séance — membres, chefs de projet, intervenants — portent ce lien.
- **Il laisse le champ vide** : en créant l'invitation des membres, le flux crée aussi la réunion
  Teams et note son lien dans `OnlineMeetingUrl`. L'application le reprend ensuite (page
  « Ordre du jour », bloc du comité, invitations des chefs de projet). Les chefs de projet déjà
  inscrits reçoivent alors **une** mise à jour de leur invitation avec le lien, au prochain
  chargement de l'application par n'importe quel utilisateur.

> ⚠️ **À vérifier avant de compter dessus** : je ne sais pas si Microsoft Graph accepte de créer une
> réunion Teams dans le calendrier d'une **boîte partagée** (une boîte partagée n'a en général pas
> de licence Teams). Si l'étape « créer » échoue sur ce point (badge « Invitation Outlook en
> erreur », message dans `ErrorMessage`), restez sur la première façon : un lien collé par le
> président.

### Flux « CN – Invitations des comités »

> ⚠️ **Ce que je n'ai pas pu vérifier** : les noms exacts des actions et la possibilité d'écrire
> dans le calendrier d'une boîte partagée dépendent de votre tenant et de vos droits. Le parcours
> ci-dessous passe par l'action « Envoyer une requête HTTP » du connecteur **Office 365 Outlook**
> (requêtes Microsoft Graph sur le calendrier de la boîte partagée), qui permet les trois
> opérations dont on a besoin, dont l'annulation. Faites d'abord le **test** décrit plus bas
> avec une adresse de test avant de l'ouvrir à tous.

**Prérequis** : une boîte partagée (ex. `comites@…`) ; le compte propriétaire du flux a un accès
complet à cette boîte (droits « Accès total » et « Envoyer en tant que », donnés par un
administrateur Exchange).

1. **Déclencheur** : SharePoint → « Lorsqu'un élément est créé ou modifié », liste
   `CN_CommitteeInvitations`.
   - Paramètres du déclencheur → **Conditions de déclenchement** :
     `@not(equals(triggerOutputs()?['body/Revision'], triggerOutputs()?['body/ProcessedRevision']))`
     — sans elle, l'écriture de la réponse du flux le redéclencherait sans fin.
   - Paramètres → **Contrôle de la concurrence** : activé, degré de parallélisme **1** (deux
     modifications rapprochées d'une même invitation ne doivent pas être traitées en même temps).
2. **Initialiser une variable** `revisionTraitee` (entier) = `Revision` du déclencheur. C'est cette
   valeur qui sera écrite dans `ProcessedRevision`, pas celle relue plus tard : si l'application
   a modifié l'invitation pendant que le flux tournait, le flux repartira tout seul.
3. **Étendue « Traiter »** contenant :
   - **Composer** `participants` :
     `split(triggerOutputs()?['body/Attendees'], ';')`, puis une action **Sélectionner** sur ce
     tableau qui produit pour chaque adresse
     `{"emailAddress": {"address": item()}, "type": "required"}`.
   - **Condition** `Status` est égal à `cancelled` :
     - **Si oui** — si `OutlookEventId` n'est pas vide : « Envoyer une requête HTTP » (Office 365
       Outlook), méthode **POST**, URI
       `https://graph.microsoft.com/v1.0/users/comites@…/events/<OutlookEventId>/cancel`,
       corps `{"comment": "This presentation slot has been cancelled. See Project Navigator for details."}`.
     - **Si non** — Composer `evenement` :
       ```json
       {
         "subject": "<Subject>",
         "body": { "contentType": "HTML", "content": "<BodyHtml>" },
         "start": { "dateTime": "<formatDateTime(StartAt, 'yyyy-MM-ddTHH:mm:ss')>", "timeZone": "UTC" },
         "end": { "dateTime": "<formatDateTime(EndAt, 'yyyy-MM-ddTHH:mm:ss')>", "timeZone": "UTC" },
         "location": { "displayName": "<Location>" },
         "attendees": <sortie de Sélectionner>,
         "allowNewTimeProposals": false
       }
       ```
       puis **Condition** `OutlookEventId` est vide :
       - **Si oui** : « Envoyer une requête HTTP », **POST**
         `https://graph.microsoft.com/v1.0/users/comites@…/events`, corps = `evenement` — et,
         **seulement si** `Kind` est `members` **et** `Location` est vide, le même corps complété
         de `"isOnlineMeeting": true, "onlineMeetingProvider": "teamsForBusiness"` (deux branches
         d'une condition, ou une expression `if(...)` sur le corps) ; puis SharePoint « Mettre à
         jour l'élément » : `OutlookEventId` = `id` de la réponse, et `OnlineMeetingUrl` =
         `onlineMeeting.joinUrl` de la réponse (vide si aucune réunion n'a été créée).
       - **Si non** : « Envoyer une requête HTTP », **PATCH**
         `https://graph.microsoft.com/v1.0/users/comites@…/events/<OutlookEventId>`, corps =
         `evenement`.
   - SharePoint « Mettre à jour l'élément » : `ProcessedRevision` = `revisionTraitee`,
     `SyncState` = `done`, `ProcessedAt` = `utcNow()`, `ErrorMessage` vide.
4. **Étendue « En cas d'erreur »**, configurée pour s'exécuter **après** « Traiter » si elle a
   **échoué** ou **expiré** : SharePoint « Mettre à jour l'élément » : `ProcessedRevision` =
   `revisionTraitee`, `SyncState` = `error`, `ErrorMessage` = `string(result('Traiter'))`
   (tronqué si besoin).

> 💡 Dans « Mettre à jour l'élément », ne renseignez que les colonnes du flux : laisser vides les
> autres champs peut, selon la version de l'action, les effacer. Si c'est le cas chez vous,
> recopiez-y les valeurs du déclencheur.

### Le test (avant ouverture)

1. Dans le back-office, sur un comité de test dont vous êtes président, créez et publiez une
   séance à J+10, avec le lien d'une réunion Teams de test.
2. Depuis un projet de test qui déclenche ce comité, inscrivez-le avec un collègue en invité.
   → Vous et le collègue recevez une invitation de la boîte partagée, sur toute la durée de la
   séance. La page « Ordre du jour » affiche « Invitation Outlook envoyée ».
3. Changez la durée du passage sur l'ordre du jour. → **Aucun** e-mail.
4. Déplacez la séance d'une heure dans le back-office. → Mise à jour reçue.
5. Désinscrivez le projet. → Annulation reçue.
6. Vérifiez au passage que l'invitation de la réunion Teams des membres n'a pas bougé.

Puis pour les membres (étape 3) :

7. Ajoutez un collègue comme membre du comité de test et publiez la configuration ; rechargez
   l'application. → Une invitation « Committee session » part vers les membres pour chaque
   séance publiée à venir, avec le lien « Open the agenda in Project Navigator ».
8. Inscrivez puis désinscrivez un projet. → Les membres ne reçoivent **rien**.
9. Créez une séance **sans lieu** et publiez-la. → L'invitation des membres contient une réunion
   Teams ; la page « Ordre du jour » affiche « Rejoindre la réunion » ; un projet inscrit reçoit
   le même lien. (Si l'étape échoue, voir l'avertissement de la section « Le lien Teams ».)
10. Annulez la séance depuis la page « Ordre du jour ». → Membres et chefs de projet reçoivent
    l'annulation.

**Une fois ces tests passés**, supprimez de vos calendriers les occurrences futures de l'ancienne
série récurrente (depuis l'organisateur actuel) : les invitations des membres viennent désormais
de la boîte partagée, séance par séance.

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
- **Recherche de personnes** (partage de projet, contacts d'équipe, comités, administrateurs) :
  rien à créer de ton côté pour la recherche elle-même. L'app interroge directement l'annuaire du
  site (le même mécanisme que la boîte « Partager » native de SharePoint).
- **Ajout automatique comme membre du site, par précaution** : quand la personne choisie
  n'apparaît pas comme membre du site, l'app dépose une demande dans la nouvelle liste
  `CN_SiteAccessRequests` (étape 4) — **ça, en revanche, nécessite bien un nouveau flux Power
  Automate à créer**, décrit en [étape 5 bis](#5-bis--power-automate--le-flux-dajout-comme-membre-du-site).
  Sans ce flux, les demandes s'accumulent dans la liste sans jamais être traitées. Limite
  connue : une personne qui a accès au site uniquement via un groupe de sécurité reste trouvable
  normalement dans la recherche, mais l'app ne peut pas vérifier si elle a déjà accès au site par
  ce biais — elle demandera donc parfois un ajout redondant (sans risque, juste inutile).
- **Relance des dossiers pris en charge :** en mode SharePoint, l'app ne calcule et n'envoie plus
  elle-même cette relance (voir [étape 5 ter](#étape-5-ter--power-automate--le-flux-de-relance-des-dossiers-pris-en-charge-recommandé))
  — **ce flux Power Automate est le seul mécanisme restant.**

## Étape 7 — Ce que tu me transmets pour lancer la migration

C'est très court maintenant. Copie-colle ceci complété dans la conversation avec Claude :

```
URL du site SharePoint  : https://entreprisedemo1.sharepoint.com/sites/........
URL exacte de la page   : https://entreprisedemo1.sharepoint.com/sites/......../CN-App/index.aspx
Les 12 listes CN_... sont créées avec les noms de colonnes exacts : oui / non
Bibliothèques CN-App / CN-Config / CN-Documents créées          : oui / non
Flux Power Automate de notifications créé et activé              : oui / non
Flux Power Automate d'ajout comme membre du site créé et activé : oui / non
Flux Power Automate de relance des dossiers pris en charge créé et activé : oui / non
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
