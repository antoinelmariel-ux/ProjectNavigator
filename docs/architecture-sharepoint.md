# Architecture SharePoint

> Public : développeurs **et** non-experts. Ce document explique où vivent les données de
> Project Navigator et comment elles circulent entre l'application, SharePoint Online et
> Power Automate. Il complète [`architecture-technique.md`](architecture-technique.md) /
> [`architecture-technique-non-expert.md`](architecture-technique-non-expert.md) (comment le code
> est fait) et [`securite-donnees.md`](securite-donnees.md) /
> [`securite-donnees-non-expert.md`](securite-donnees-non-expert.md) (ce que cette architecture
> garantit en matière de sécurité).
>
> Détail opérationnel complet (colonnes exactes, étapes de configuration, mode opératoire
> Power Automate pas à pas) : dossier [`migration-v2/`](migration-v2/README.md).

## Vue d'ensemble

Project Navigator est un ensemble de fichiers statiques (HTML/JS/CSS, sans serveur applicatif)
déposé dans une bibliothèque du site SharePoint de l'organisation. Le navigateur de la personne
connectée envoie ses requêtes directement à l'API REST native de SharePoint
(`/_api/…`), authentifiées par les cookies de sa session SharePoint — il n'y a ni serveur
intermédiaire, ni jeton applicatif, ni compte de service. Tout ce que l'application ne peut pas
faire elle-même avec ces droits (envoyer un e-mail, ajouter quelqu'un comme membre du site) est
délégué à des flux Power Automate déclenchés par la création d'une ligne dans une liste dédiée.

Un second mode, **local/simulé**, reproduit cette même architecture avec des fichiers JSON et le
stockage du navigateur, pour le développement et l'ouverture directe du fichier `index.html`
(`file://`, sans SharePoint) — voir la légende.

## Diagramme

```mermaid
flowchart TB
    User(["Utilisateur du site SharePoint"])
    App["Project Navigator<br/>fichiers statiques (CN-App/index.aspx)"]

    User -->|"ouvre la page<br/>cookies de session SPO"| App

    subgraph SP["SharePoint Online — site de l'application"]
        direction TB

        subgraph Libs["Bibliothèques de documents"]
            LibApp["CN-App<br/>code de l'application"]
            LibConfig["CN-Config<br/>référentiels JSON (questions,<br/>niveaux de risque, pondération,<br/>thèmes vitrine, réglages)"]
            LibDocs["CN-Documents<br/>pièces jointes utilisateurs"]
        end

        subgraph Lists["Listes de données (CN_*)"]
            direction TB
            LProjects["CN_Projects"]
            LInspirations["CN_Inspirations"]
            LComments["CN_ComplianceComments"]
            LMembers["CN_ProjectMembers"]
            LSticky["CN_ShowcaseStickyNotes"]
            LFiles["CN_FilesIndex"]
            LProfiles["CN_UserProfiles"]
            LRules["CN_Rules"]
            LTeams["CN_Teams"]
            LSamples["CN_SampleProjects"]
            LDiscussions["CN_ProjectDiscussions *"]
            LChanges["CN_BackofficeChanges *"]
            LNotif["CN_NotificationsQueue"]
            LAccess["CN_SiteAccessRequests"]
        end
    end

    App -->|"API REST /_api/web/lists/…<br/>lecture / écriture (CRUD)"| Lists
    App -->|"API REST GetFileByServerRelativeUrl<br/>lecture / publication des référentiels"| LibConfig
    App -->|"API REST Files/add<br/>dépôt de pièces jointes"| LibDocs
    App -.->|"servi tel quel par SharePoint"| LibApp

    subgraph PA["Power Automate"]
        direction TB
        PA1["Flux 1 — Envoi des notifications<br/>(obligatoire)"]
        PA5["Flux 5 — Ajout comme membre du site<br/>(selon décision de l'administrateur)"]
        PA6["Flux 6 — Relance des dossiers pris en charge<br/>(recommandé)"]
        PA2["Flux 2 — Récapitulatif hebdomadaire<br/>(optionnel)"]
        PA3["Flux 3 — Relance des commentaires ouverts<br/>(optionnel)"]
        PA4["Flux 4 — Purge du journal<br/>(optionnel, entretien)"]
    end

    LNotif -->|"déclencheur : élément créé,<br/>Status = Pending"| PA1
    PA1 -->|"Envoyer un e-mail (V2)"| Mail(["Boîte mail du destinataire"])
    PA1 -.->|"variante possible"| TeamsChan(["Canal Microsoft Teams"])
    PA1 -->|"Status = Sent / Error"| LNotif

    LAccess -->|"déclencheur : élément créé,<br/>Status = Pending"| PA5
    PA5 -->|"POST _api/web/sitegroups(id)/users"| SPGroup[("Groupe « Membres »<br/>du site SharePoint")]
    PA5 -->|"Status = Done / Error"| LAccess

    LComments -.->|"lu quotidiennement<br/>(dossiers pris en charge)"| PA6
    LTeams -.->|"seuil ClaimReminderDays"| PA6
    PA6 -->|"crée une ligne Pending"| LNotif
    PA6 -->|"met à jour ClaimJson.reminderSentAt"| LComments

    LProjects -.->|"filtré Status = Submitted<br/>(chaque lundi)"| PA2
    PA2 --> Mail

    LComments -.->|"filtré Resolved = 0<br/>(chaque jour)"| PA3
    PA3 --> Mail

    LNotif -.->|"purge des lignes Sent<br/>de plus de 180 jours"| PA4

    classDef unused stroke-dasharray: 4 3,opacity:0.75;
    classDef optional stroke-dasharray: 4 3;
    class LDiscussions,LChanges unused;
    class PA2,PA3,PA4 optional;
```

## Légende

**Utilisateur → Application.** La page est servie par SharePoint lui-même
(`https://<tenant>.sharepoint.com/sites/<site>/CN-App/index.aspx`) : le navigateur envoie
automatiquement les cookies de session SPO. Il n'y a ni écran de connexion applicatif, ni jeton
géré par le code (`src/utils/spContext.js`, `src/config/sharepointConfig.js`).

**Bibliothèques de documents**
| Bibliothèque | Contenu |
|---|---|
| `CN-App` | Le code de l'application elle-même (HTML/JS/CSS statiques). |
| `CN-Config` | Les référentiels administrables du back-office, sous forme de fichiers JSON (`questions.json`, `risk-level-rules.json`, `risk-weighting.json`, `showcase-themes.json`, `settings.json`). |
| `CN-Documents` | Les pièces jointes déposées par les utilisateurs (annotations, commentaires de conformité), rangées par entité (`{EntityType}/{EntityId}`). |

**Listes de données (`CN_*`)** — 14 listes, décrites colonne par colonne dans
[`migration-v2/PREPARATION-SHAREPOINT-POWERAUTOMATE.md`](migration-v2/PREPARATION-SHAREPOINT-POWERAUTOMATE.md)
et vérifiables via le script de
[`migration-v2/VERIFICATION-CONFIGURATION-SHAREPOINT.md`](migration-v2/VERIFICATION-CONFIGURATION-SHAREPOINT.md).
Deux d'entre elles (marquées `*` et en pointillés sur le diagramme), `CN_ProjectDiscussions` et
`CN_BackofficeChanges`, ont leur schéma de colonnes déclaré et la liste créée côté SharePoint,
mais **aucune fonctionnalité de l'application ne les lit ou n'y écrit à ce jour** — décision
documentée dans `src/utils/listSchemas.js`. Les données volumineuses ou imbriquées (réponses au
questionnaire, règle de conformité entière, etc.) voyagent en colonnes « texte long » contenant du
JSON sérialisé (`AnswersJson`, `PayloadJson`, `AnchorJson`…), pas en colonnes structurées — c'est
la seule vraie divergence entre le mode SharePoint et le mode local/simulé.

**Power Automate** — l'application **n'envoie jamais d'e-mail ni de message Teams elle-même** :
c'est une contrainte du tenant (l'API Microsoft Graph `sendMail` est interdite par la politique de
sécurité, et l'ancienne API SharePoint `SP.Utilities.Utility.SendEmail` a été retirée par
Microsoft). Chaque flux est déclenché par la création d'une ligne dans une liste :

| Flux | Déclencheur | Nécessité |
|---|---|---|
| 1 — Envoi des notifications | Création dans `CN_NotificationsQueue` | **Obligatoire** — sans lui, aucun e-mail ne part. |
| 5 — Ajout comme membre du site | Création dans `CN_SiteAccessRequests` | Selon une décision explicite de l'administrateur du site (« par précaution, ajouter automatiquement comme membre »). |
| 6 — Relance des dossiers pris en charge | Périodicité quotidienne, lecture de `CN_ComplianceComments`/`CN_Teams` | Recommandé — en mode SharePoint, l'application ne calcule plus elle-même cette relance (voir `securite-donnees.md` et `migration-v2/MODE-OPERATOIRE-POWER-AUTOMATE.md`). |
| 2 — Récapitulatif hebdomadaire | Périodicité (lundi 08:00) | Optionnel. |
| 3 — Relance des commentaires non résolus | Périodicité quotidienne | Optionnel. |
| 4 — Purge du journal de notifications | Périodicité mensuelle | Optionnel, entretien. |

Mode opératoire complet de chaque flux (déclencheur, actions, expressions, recette de test) :
[`migration-v2/MODE-OPERATOIRE-POWER-AUTOMATE.md`](migration-v2/MODE-OPERATOIRE-POWER-AUTOMATE.md).

**Mode local/simulé (non représenté sur le diagramme ci-dessus).** Hors origine SharePoint
(ouverture directe de `index.html` en `file://`, développement, tests), l'aiguillage
`isSharePointMode()` (`src/config/sharepointConfig.js`) bascule l'application sur des fournisseurs
de données simulés : fichiers `mock-sharepoint-lists/*.json`/`src/data/mockSharePoint*.js` en
lieu et place des listes, et stockage du navigateur (`localStorage`, clé
`complianceNavigatorState`) en lieu et place de SharePoint. Les notifications qui partiraient vers
`CN_NotificationsQueue` sont alors simplement journalisées dans la console du navigateur
(`console.info`), sans aucun envoi réel.

**Non vérifié dans le code / à valider par l'organisation** : l'activation effective de chacun des
flux Power Automate ci-dessus sur l'environnement de production, l'adresse d'envoi retenue (boîte
personnelle ou boîte partagée) et l'existence d'un environnement de production distinct de
l'environnement de développement — voir [`migration-v2/ENVIRONNEMENTS.md`](migration-v2/ENVIRONNEMENTS.md),
qui indique un site de production « à créer » au moment de la rédaction de ce document.
