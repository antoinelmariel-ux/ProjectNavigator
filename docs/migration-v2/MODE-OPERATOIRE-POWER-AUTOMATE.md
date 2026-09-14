# Mode opératoire — configuration des flux Power Automate

> **Pour qui ?** Pour toi, à réaliser dans [make.powerautomate.com](https://make.powerautomate.com).
> **Prérequis :** les listes SharePoint créées (voir `PREPARATION-SHAREPOINT-POWERAUTOMATE.md`).
> **Licence :** aucun connecteur payant. Tout est inclus dans Microsoft 365.

---

## Sommaire et ordre de réalisation

| # | Flux | Nécessaire ? | Durée | Section |
|---|---|---|---|---|
| 1 | **Envoi des notifications** | ✅ **Obligatoire** — sans lui, aucun e-mail ne part | 20 min | [§3](#3-flux-1--envoi-des-notifications-obligatoire) |
| 2 | Récapitulatif hebdomadaire des projets soumis | Optionnel | 15 min | [§5](#5-flux-2--récapitulatif-hebdomadaire-optionnel) |
| 3 | Relance des commentaires non résolus | Optionnel | 10 min | [§6](#6-flux-3--relance-des-commentaires-non-résolus-optionnel) |
| 4 | Purge du journal des notifications | Optionnel (entretien) | 10 min | [§7](#7-flux-4--purge-du-journal-optionnel) |
| 5 | Ajout automatique comme membre du site | Selon ta décision — voir [§7 bis](#7-bis-flux-5--ajout-automatique-comme-membre-du-site-selon-ta-décision) | 20 min | [§7 bis](#7-bis-flux-5--ajout-automatique-comme-membre-du-site-selon-ta-décision) |
| 6 | Relance des dossiers pris en charge | ⚠️ **Recommandé** — sans lui, plus aucune relance ne part une fois basculé en mode SharePoint | 25 min | [§7 ter](#7-ter-flux-6--relance-des-dossiers-pris-en-charge-recommandé) |

**Commence par le flux 1 et teste-le** ([§4](#4-recette-du-flux-1--5-minutes)) avant d'aborder les autres.

---

## 1. Le principe en une image

L'application **n'envoie jamais d'e-mail elle-même** : l'API Graph `sendMail` est interdite par la
politique de sécurité, et l'ancienne API SharePoint `SendEmail` a été retirée par Microsoft. Le
mécanisme retenu est celui que Microsoft recommande :

```
L'utilisateur agit dans l'app
          ↓
L'app crée une ligne « Pending » dans la liste CN_NotificationsQueue
          ↓
Power Automate détecte la nouvelle ligne  ← c'est le flux 1
          ↓
Il envoie l'e-mail, puis passe la ligne à « Sent »
```

Bénéfice secondaire pour un outil de conformité : la liste devient un **journal auditable** de
toutes les notifications, avec leur statut.

### Ce que l'application dépose dans la liste

| Colonne | Contenu |
|---|---|
| `Title` | L'objet de l'e-mail, déjà formaté |
| `ToEmails` | Destinataires principaux, **séparés par des points-virgules** |
| `CcEmails` | Destinataires en copie (souvent vide) |
| `Body` | Le corps complet de l'e-mail, **au format HTML** |
| `NotificationType` | Le type d'action (pour filtrer ou faire des statistiques) |
| `ProjectId` | L'identifiant du projet concerné |
| `Status` | `Pending` — c'est le flux qui le passera à `Sent` |

⚠️ **Le point le plus important de tout ce document : `Body` contient du HTML.** Si tu ne
configures pas le champ Corps en mode HTML ([§3.4](#34-envoyer-le-mail--létape-à-ne-pas-rater)),
tes destinataires recevront du code brut du type `<p>Bonjour,</p>`.

---

## 2. Vocabulaire Power Automate (si tu débutes)

| Terme | Ce que ça veut dire |
|---|---|
| **Flux** | Une automatisation : un déclencheur, puis une suite d'actions |
| **Déclencheur** | L'événement qui démarre le flux (une ligne créée, une heure donnée…) |
| **Action** | Une étape (envoyer un e-mail, mettre à jour un élément…) |
| **Contenu dynamique** | Une pastille violette représentant une donnée venue d'une étape précédente |
| **Expression** | Une petite formule, par exemple `utcNow()` pour la date du jour |
| **Connexion** | Le compte utilisé pour agir (ton compte Microsoft, par défaut) |

Deux réflexes utiles :

- **Enregistre souvent.** Power Automate ne sauvegarde pas tout seul.
- **L'historique des exécutions** (sur la fiche du flux) montre, étape par étape, ce qui est entré
  et sorti. C'est l'outil de diagnostic le plus efficace.

---

## 3. Flux 1 — Envoi des notifications (obligatoire)

### 3.1 Créer le flux

1. Va sur [make.powerautomate.com](https://make.powerautomate.com).
2. Vérifie en haut à droite que tu es dans le **bon environnement** (celui de ton organisation).
3. Menu de gauche → **Créer** → **Flux de cloud automatisé**.
4. Nom : `CN - Envoi des notifications`.
5. Dans la recherche de déclencheur, tape `SharePoint` et choisis
   **« Lorsqu'un élément est créé »**. Clique sur **Créer**.

### 3.2 Configurer le déclencheur

| Champ | Valeur |
|---|---|
| Adresse du site | `https://lfb1.sharepoint.com/sites/ProjectNavigator_DEV` |
| Nom de la liste | `CN_NotificationsQueue` |

### 3.3 Ajouter un filtre de sécurité (recommandé)

1. **Nouvelle étape** → cherche **Condition** (catégorie « Contrôle »).
2. Configure : à gauche le contenu dynamique **`Status Value`** · opérateur **est égal à** ·
   à droite le texte `Pending`.

> 💡 Si tu vois deux entrées `Status`, choisis **`Status Value`** : dans une colonne de type
> « Choix », c'est celle qui contient le texte lisible.

Toute la suite se place dans la branche **« Si oui »**.

### 3.4 Envoyer l'e-mail — l'étape à ne pas rater

Dans **« Si oui »** → **Ajouter une action** → cherche `Outlook` →
**« Envoyer un e-mail (V2) »**.

| Champ | Contenu dynamique à insérer |
|---|---|
| À | `ToEmails` |
| Objet | `Title` |
| Corps | `Body` |

Pour le champ **Cc** : clique sur **Paramètres avancés** (ou « Afficher tout ») et insère
`CcEmails`.

**➡️ Basculer le champ Corps en mode HTML — obligatoire :**

1. Clique dans le champ **Corps**.
2. Dans la barre d'outils qui apparaît au-dessus, clique sur l'icône **`</>`**
   (« Affichage du code »). Le champ devient un simple champ texte.
3. **Efface tout** ce qu'il contient, puis insère le contenu dynamique **`Body`**, et rien d'autre.

Si tu ne trouves pas l'icône `</>` : ouvre les **Paramètres avancés** de l'action et vérifie
qu'une option **« Is HTML »** est bien sur **Oui**.

**Vérification :** le champ Corps ne doit contenir que la pastille violette `Body`, sans aucun
texte autour.

### 3.5 Marquer la notification comme envoyée

Toujours dans « Si oui », après l'envoi → **Ajouter une action** → SharePoint →
**« Mettre à jour l'élément »**.

| Champ | Valeur |
|---|---|
| Adresse du site | la même que le déclencheur |
| Nom de la liste | `CN_NotificationsQueue` |
| Id | contenu dynamique **`ID`** (celui du déclencheur) |
| Titre | contenu dynamique **`Title`** (à recopier : ce champ est obligatoire) |
| Status Value | `Sent` |
| SentAt | expression `utcNow()` |

> Pour saisir une expression : dans le champ, onglet **Expression**, tape `utcNow()`, puis **OK**.

### 3.6 Tracer les échecs (fortement recommandé)

Sans cette étape, une notification qui échoue disparaît silencieusement.

1. Ajoute une **deuxième** action « Mettre à jour l'élément » (même liste, même `Id`, même
   `Titre`), avec **Status Value** = `Error` et **ErrorMessage** = un texte explicite, par exemple
   `Échec de l'envoi Outlook`.
2. Sur cette nouvelle action : **⋯** → **Configurer l'exécution après** → décoche « a réussi »,
   coche **« a échoué »** et **« a expiré »**.

Tu repères ensuite les problèmes d'un coup d'œil en filtrant la liste sur `Status = Error`.

### 3.7 Enregistrer et sécuriser

1. Clique sur **Enregistrer**.
2. Sur la fiche du flux → **Modifier** à côté de « Propriétaires » → **ajoute un co-propriétaire**.
   Sans cela, le flux s'arrête si ton compte est désactivé ou modifié.

### 3.8 De quelle adresse partiront les e-mails ?

Par défaut, **de ta boîte personnelle** (propriétaire du flux). Les destinataires verront ton nom.

**Recommandation : une boîte aux lettres partagée.** Plus neutre, et le flux survit à ton départ.

1. Demande à l'IT une boîte partagée, par exemple `project-navigator@lfb.fr`, avec le droit
   **« Envoyer en tant que »** pour toi.
2. Remplace l'action par **« Envoyer un e-mail à partir d'une boîte aux lettres partagée (V2) »**
   et renseigne l'adresse dans **Boîte aux lettres d'origine**. Les autres champs sont identiques
   — **y compris le passage du Corps en HTML**.

### 3.9 Variante : publier aussi dans Teams

Après l'envoi d'e-mail, ajoute **Microsoft Teams → « Publier un message dans un canal »** :

| Champ | Valeur |
|---|---|
| Publier en tant que | `Flow bot` |
| Publier dans | `Canal` |
| Équipe / Canal | ceux de l'équipe compliance |
| Message | contenu dynamique `Title` |

---

## 4. Recette du flux 1 — 5 minutes

Ce test ne nécessite pas l'application.

1. Ouvre la liste `CN_NotificationsQueue` dans SharePoint → **Nouveau**.
2. Remplis :
   - **Titre** : `[Project Navigator] Projet test - Essai`
   - **ToEmails** : ta propre adresse
   - **Body** : `<p>Ceci est un <strong>test</strong>.</p>`
   - **Status** : `Pending`
3. Enregistre, puis patiente une à deux minutes.
4. Contrôle :
   - [ ] Tu reçois l'e-mail (**vérifie aussi les indésirables**)
   - [ ] Le mot « test » est **en gras**, et non entouré de `<strong>` → le mode HTML est bon
   - [ ] Dans la liste, la ligne est passée à **`Sent`** avec une date dans `SentAt`

Si le mot apparaît entouré de balises, reprends l'étape [§3.4](#34-envoyer-le-mail--létape-à-ne-pas-rater).

---

## 5. Flux 2 — Récapitulatif hebdomadaire (optionnel)

Un e-mail chaque lundi matin listant les projets soumis, à destination de l'équipe compliance.

1. **Créer** → **Flux de cloud planifié**. Nom : `CN - Récapitulatif hebdomadaire`.
   Répéter tous les **1 Semaine**, le **lundi**, à **08:00**.
2. Ouvre le déclencheur **Périodicité** et règle **Fuseau horaire** sur
   `(UTC+01:00) Bruxelles, Copenhague, Madrid, Paris`.
3. **Nouvelle étape** → SharePoint → **« Obtenir les éléments »** :

   | Champ | Valeur |
   |---|---|
   | Adresse du site | ton site |
   | Nom de la liste | `CN_Projects` |
   | Requête de filtre (Paramètres avancés) | `Status eq 'Submitted'` |
   | Nombre max d'éléments | `500` |

4. **Nouvelle étape** → **Condition** : à gauche l'expression
   `length(outputs('Obtenir_les_éléments')?['body/value'])` · **est supérieur à** · `0`.
   *(Sans ce garde-fou, tu recevrais un e-mail vide chaque lundi.)*
5. Dans **« Si oui »** → **« Sélectionner »** (catégorie « Opérations de données ») :
   - **À partir de** : contenu dynamique `value`
   - Mappage (mode tableau) :

     | Clé | Valeur |
     |---|---|
     | `Projet` | `Title` |
     | `Porteur` | `OwnerEmail` |
     | `Soumis le` | `SubmissionDate` |

6. **Nouvelle étape** → **« Créer un tableau HTML »** :
   **À partir de** = la sortie de l'étape « Sélectionner ».
7. **Nouvelle étape** → **« Envoyer un e-mail (V2) »** :
   - **À** : l'adresse de l'équipe compliance
   - **Objet** : `[Project Navigator] Projets soumis - récapitulatif hebdomadaire`
   - **Corps** : passe en mode `</>` puis insère la sortie de **« Créer un tableau HTML »**
8. **Enregistrer**, puis **Tester** → *Manuellement* pour valider immédiatement.

---

## 6. Flux 3 — Relance des commentaires non résolus (optionnel)

Un rappel quotidien à l'équipe compliance des commentaires restés ouverts.

1. **Créer** → **Flux de cloud planifié**. Nom : `CN - Relance commentaires ouverts`.
   Tous les **1 Jour** à **09:00**, fuseau Paris.
2. SharePoint → **« Obtenir les éléments »** :

   | Champ | Valeur |
   |---|---|
   | Nom de la liste | `CN_ComplianceComments` |
   | Requête de filtre | `Resolved eq 0` |
   | Nombre max d'éléments | `500` |

   > Dans une requête SharePoint, une colonne Oui/Non se compare à `0` (non) ou `1` (oui).

3. **Condition** : `length(outputs('Obtenir_les_éléments')?['body/value'])` **est supérieur à** `0`.
4. Dans **« Si oui »** → **« Sélectionner »** avec le mappage :

   | Clé | Valeur |
   |---|---|
   | `Projet` | `ProjectId` |
   | `Section` | `SectionKey` |
   | `Commentaire` | `Message` |
   | `Déposé par` | `CreatedByEmail` |

5. **« Créer un tableau HTML »**, puis **« Envoyer un e-mail (V2) »** (Corps en mode `</>`).

> **Évolution possible :** relancer chaque porteur de projet plutôt que l'équipe compliance.
> Cela demande, pour chaque commentaire, une action « Obtenir les éléments » sur `CN_Projects`
> filtrée par `ProjectId` afin de retrouver `OwnerEmail`. C'est faisable, mais nettement plus
> long à construire : commence par la version ci-dessus.

---

## 7. Flux 4 — Purge du journal (optionnel)

Garde la liste des notifications légère en supprimant les envois anciens.

1. **Créer** → **Flux de cloud planifié**. Nom : `CN - Purge des notifications envoyées`.
   Tous les **1 Mois**, à **02:00**.
2. SharePoint → **« Obtenir les éléments »** :

   | Champ | Valeur |
   |---|---|
   | Nom de la liste | `CN_NotificationsQueue` |
   | Requête de filtre | `Status eq 'Sent' and SentAt lt '@{addDays(utcNow(),-180,'yyyy-MM-dd')}'` |
   | Nombre max d'éléments | `2000` |

3. **Nouvelle étape** → SharePoint → **« Supprimer l'élément »** :
   Id = contenu dynamique `ID`. Power Automate ajoute automatiquement une boucle
   **« Appliquer à chacun »**.

⚠️ **Ce flux supprime définitivement des données.** Avant de l'activer, exécute d'abord
uniquement l'étape « Obtenir les éléments » (supprime temporairement l'action de suppression) et
vérifie dans l'historique que la liste retournée correspond bien à ce que tu veux purger.
Vérifie aussi que l'historique des versions est activé sur la liste.

---

## 7 bis. Flux 5 — Ajout automatique comme membre du site (selon ta décision)

> ℹ️ **Ce flux n'est ni obligatoire ni construit par défaut.** Il correspond à une décision de
> sécurité que tu as prise explicitement : quand quelqu'un est sélectionné dans l'app (partage de
> projet, contact d'équipe, comité, administrateur) et n'apparaît pas comme membre du site, l'app
> dépose une demande dans `CN_SiteAccessRequests` **par précaution**. Sans ce flux, ces demandes
> s'accumulent sans jamais être traitées — l'app fonctionne normalement quand même, ce n'est donc
> pas bloquant si tu préfères ne pas l'activer. Vois `GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md`
> §13 pour les limites de ce mécanisme (notamment : une personne qui a accès uniquement via un
> groupe de sécurité peut déclencher une demande alors qu'elle a déjà accès).

### 7 bis.1 Pourquoi ce n'est pas un simple appel REST direct

L'app ne peut pas ajouter quelqu'un comme membre du site depuis le navigateur : ça demande le
droit **« Gérer les permissions »**, que la session de l'utilisateur courant n'a presque jamais
(c'est le même problème que l'envoi d'e-mail — voir §1). Le flux, lui, tourne avec **la connexion
de son propriétaire** : si ce compte a ce droit, l'action réussit là où l'app échouerait.

### 7 bis.2 Trouver l'identifiant du groupe « Membres » du site (une fois)

Le flux doit ajouter la personne à un groupe SharePoint précis. Plutôt que de deviner son nom
(il varie d'un site à l'autre, ex. « Project Navigator DEV Membres »), récupère-le une bonne fois
par une requête de navigateur (pendant que tu es connecté au site) :

```
https://lfb1.sharepoint.com/sites/ProjectNavigator_DEV/_api/web/associatedmembergroup?$select=Id,Title
```

Note l'`Id` retourné (un nombre) — c'est celui du groupe « Membres » par défaut du site, quel que
soit son nom affiché. Tu le réutiliseras tel quel dans l'action HTTP ci-dessous (pas besoin de le
relire à chaque exécution du flux).

### 7 bis.3 Créer le flux

1. **Créer** → **Flux de cloud automatisé**. Nom : `CN - Ajout comme membre du site`.
2. Déclencheur SharePoint **« Lorsqu'un élément est créé »** :

   | Champ | Valeur |
   |---|---|
   | Adresse du site | `https://lfb1.sharepoint.com/sites/ProjectNavigator_DEV` |
   | Nom de la liste | `CN_SiteAccessRequests` |

3. **Condition** : contenu dynamique **`Status Value`** est égal à `Pending` → suite dans
   « Si oui » (même remarque qu'au §3.3 : si tu vois deux `Status`, prends `Status Value`).

### 7 bis.4 Construire le `LoginName` — l'étape à ne pas rater

`SP.User.LoginName` n'est pas une adresse e-mail brute : sur ce tenant, c'est
`i:0#.f|membership|` suivi de l'adresse (c'est la même convention que le code applicatif utilise
déjà pour lire l'utilisateur courant, voir `src/utils/spContext.js`).

Dans « Si oui » → **Ajouter une action** → cherche **Compose** (« Contrôle de données ») :

| Champ | Valeur |
|---|---|
| Entrée | Expression : `concat('i:0#.f|membership|', triggerBody()?['TargetEmail'])` |

### 7 bis.5 Ajouter la personne au groupe — l'action HTTP

**Ajouter une action** → SharePoint → **« Envoyer une requête HTTP à SharePoint »**.

| Champ | Valeur |
|---|---|
| Adresse du site | la même que le déclencheur |
| Méthode | `POST` |
| Uri | `_api/web/sitegroups(<Id trouvé au §7 bis.2>)/users` |
| En-têtes | `Accept` = `application/json;odata=verbose` · `Content-Type` = `application/json;odata=verbose` |
| Corps | `{"__metadata":{"type":"SP.User"},"LoginName":"@{outputs('Compose')}"}` |

⚠️ **`odata=verbose` est ici une exception volontaire** à la convention `nometadata` utilisée
partout ailleurs dans ce projet (voir le tableau des pièges du GUIDE) : cet endpoint exige
l'enveloppe `__metadata` typée, exactement comme le people picker (§13 du GUIDE).

### 7 bis.6 Marquer la demande comme traitée

**Ajouter une action** → SharePoint → **« Mettre à jour l'élément »** :

| Champ | Valeur |
|---|---|
| Adresse du site / Nom de la liste | les mêmes que le déclencheur |
| Id | contenu dynamique `ID` du déclencheur |
| Titre | contenu dynamique `Title` (à recopier, champ obligatoire) |
| Status Value | `Done` |
| ProcessedAt | expression `utcNow()` |

### 7 bis.7 Tracer les échecs (fortement recommandé)

Une adresse qui ne correspond à aucun compte du tenant (faute de frappe passée à travers la
saisie libre, adresse externe...) fait échouer l'action HTTP avec une erreur SharePoint explicite.
Sans étape dédiée, cet échec disparaît silencieusement — même patron qu'au §3.6 :

1. Ajoute une **deuxième** action « Mettre à jour l'élément » (même liste, même `Id`, même
   `Titre`), avec **Status Value** = `Error` et **ErrorMessage** = le contenu dynamique du corps
   de la réponse de l'action HTTP (ou un texte fixe si tu préfères rester simple).
2. Sur cette action : **⋯** → **Configurer l'exécution après** → décoche « a réussi »,
   coche **« a échoué »** et **« a expiré »**.

### 7 bis.8 Recette — 5 minutes

1. Ouvre la liste `CN_SiteAccessRequests` dans SharePoint → **Nouveau**.
2. Remplis **TargetEmail** avec une adresse valide du tenant qui n'est **pas déjà** membre du
   site (sinon l'action HTTP réussit quand même — SharePoint ignore un ajout redondant — mais ce
   n'est pas ce que tu veux vérifier), **Status** = `Pending`.
3. Enregistre, patiente une à deux minutes.
4. Contrôle :
   - [ ] La ligne passe à **`Done`**, avec une date dans `ProcessedAt`.
   - [ ] La personne apparaît désormais dans **Paramètres du site → Permissions du site** (ou
     dans le groupe « Membres »).
5. Refais le test avec une adresse invalide (ex. `personne-inexistante@lfb.fr`) : la ligne doit
   passer à `Error` avec un message explicite, pas rester bloquée en `Pending`.

### 7 bis.9 Sécurité et gouvernance — à lire avant d'activer

- **Le compte propriétaire du flux doit avoir « Gérer les permissions »** sur le site. C'est la
  condition sine qua non : sans ce droit, chaque exécution échoue en 403.
- **Ajoute un co-propriétaire**, comme pour le flux 1 (§3.7) : si le compte propriétaire est
  désactivé, le flux s'arrête silencieusement.
- Ce flux ajoute la personne au groupe **« Membres »** par défaut du site (accès en lecture/
  écriture standard sur tout le contenu du site, pas seulement Project Navigator) — c'est
  volontairement large, en cohérence avec la décision « par précaution ». Si tu préfères un accès
  plus restreint (ex. un groupe dédié avec des droits limités à la bibliothèque `CN-App`), change
  simplement l'`Id` de groupe utilisé au §7 bis.2/7 bis.5 pour celui de ce groupe dédié — le reste
  du flux ne change pas.
- `CN_SiteAccessRequests` reste un **journal auditable** : filtre-le régulièrement sur
  `Status = Error` pour repérer les demandes qui n'ont pas abouti.

---

## 7 ter. Flux 6 — Relance des dossiers pris en charge (recommandé)

> ⚠️ **Ce flux n'est pas un flux « en plus » : il remplace un mécanisme qui existait déjà côté
> application.** Quand un contact d'une équipe prend en charge un dossier et n'y touche plus
> pendant `ClaimReminderDays` jours ouvrés (3 par défaut), le référent reçoit une relance. Sans
> serveur, ce calcul tournait jusqu'ici dans la session de **n'importe quel** contact de l'équipe
> qui ouvrait l'app — ce qui ne se produisait pas si personne ne l'ouvrait. Le code applicatif
> (`src/App.jsx`) a été modifié pour ne plus faire ce calcul du tout dès que l'app tourne en mode
> SharePoint : **sans ce flux, cette relance ne part plus jamais** une fois basculé sur
> SharePoint. (Elle continue de fonctionner sans lui en mode local/mock `file://`, qui n'a pas
> d'autre option.)

### 7 ter.1 Où vit la donnée

Tout ce dont ce flux a besoin est déjà dans les listes de la préparation, en colonnes plates ou en
JSON simple à parser — pas besoin de fouiller dans le gros `AnswersJson` de `CN_Projects` :

| Donnée | Liste | Colonne |
|---|---|---|
| Qui a pris en charge le dossier | `CN_ComplianceComments` (ligne `CommentType = root`) | `AssigneeEmail` |
| Détail de la prise en charge (date, relance déjà envoyée) | `CN_ComplianceComments` | `ClaimJson` → `{"claim":{"assignedAt":"...","reminderSentAt":"..."},"history":[...]}` |
| Périmètre concerné | `CN_ComplianceComments` | `SectionKey` (`team:<id>` ou `committee:<id>` — **seuls les `team:` sont pris en charge**, un comité ne se prend jamais en charge) |
| Dernier changement de statut | `CN_ComplianceComments` (ligne racine) | `UpdatedAt` |
| Dernière réponse dans le fil | `CN_ComplianceComments` (lignes `CommentType = reply`, même `ThreadId` que la racine) | `UpdatedAt` |
| Seuil de relance de l'équipe | `CN_Teams` | `ClaimReminderDays` (vide = valeur par défaut 3 ; `0` = relance désactivée pour cette équipe) |

### 7 ter.2 Créer le flux et son déclencheur

1. **Créer** → **Flux de cloud planifié**. Nom : `CN - Relance des dossiers pris en charge`.
   Tous les **1 Jour**, à l'heure de ton choix (ex. **08:00**), fuseau Paris.
2. SharePoint → **« Obtenir les éléments »** :

   | Champ | Valeur |
   |---|---|
   | Adresse du site | ton site |
   | Nom de la liste | `CN_ComplianceComments` |
   | Requête de filtre (Paramètres avancés) | `CommentType eq 'root' and AssigneeEmail ne '' and startswith(SectionKey,'team:')` |
   | Nombre max d'éléments | `2000` |

3. Power Automate ajoute automatiquement une boucle **« Appliquer à chacun »** dès que tu utilises
   une action référençant `value` de cette étape. Tout ce qui suit se construit **à l'intérieur**
   de cette boucle.

### 7 ter.3 Retrouver le seuil de l'équipe

1. Dans la boucle → **Compose** : `substring(items('Appliquer_à_chacun')?['SectionKey'], 5)`
   (retire le préfixe `team:`, qui fait 5 caractères) → c'est le `TeamId`.
2. SharePoint → **« Obtenir les éléments »** sur `CN_Teams`, filtre
   `TeamId eq '@{outputs('Compose')}'`, nombre max `1`.
3. **Compose** (seuil effectif) : expression
   `coalesce(first(outputs('Obtenir_les_éléments_2')?['body/value'])?['ClaimReminderDays'], 3)`.
   *(reproduit exactement la valeur par défaut de `DEFAULT_CLAIM_REMINDER_DAYS` dans
   `src/utils/projectClaims.js`.)*

### 7 ter.4 Calculer les jours ouvrés depuis la dernière activité

Pas de calendrier de jours fériés ici (l'app n'en a pas non plus, voir
`src/utils/businessDays.js`) : uniquement lundi-vendredi.

1. **Parse JSON** sur `ClaimJson` de l'élément courant (`items('Appliquer_à_chacun')?['ClaimJson']`)
   — schéma libre, ou coche « Générer à partir d'un exemple » avec
   `{"claim":{"assignedAt":"2026-01-01T00:00:00Z","reminderSentAt":""},"history":[]}`.
2. SharePoint → **« Obtenir les éléments »** (réponses du fil) sur `CN_ComplianceComments`,
   filtre `ThreadId eq '@{items('Appliquer_à_chacun')?['CommentId']}' and CommentType eq 'reply'`,
   **Trier par** `UpdatedAt` **décroissant**, nombre max `1`.
3. **Compose** (dernière activité) — trois candidats, on garde le plus récent (comparaison de
   texte ISO 8601, valide tant que toutes les dates sont en UTC comme le fait l'app) :
   ```
   if(
     greater(items('Appliquer_à_chacun')?['UpdatedAt'], coalesce(first(outputs('Obtenir_les_éléments_3')?['body/value'])?['UpdatedAt'], '')),
     items('Appliquer_à_chacun')?['UpdatedAt'],
     coalesce(first(outputs('Obtenir_les_éléments_3')?['body/value'])?['UpdatedAt'], body('Parse_JSON')?['claim']?['assignedAt'])
   )
   ```
4. **Initialiser une variable** `varCursor` (type Chaîne) = la sortie de l'étape précédente,
   tronquée à la date : expression `formatDateTime(outputs('Compose_dernière_activité'), 'yyyy-MM-dd')`.
   **Initialiser une variable** `varBusinessDays` (type Entier) = `0`.
5. **Do until** `varCursor` est supérieur ou égal à `formatDateTime(utcNow(), 'yyyy-MM-dd')` :
   - **Ajouter du temps** : `varCursor` + 1 jour → réaffecter `varCursor` (expression
     `formatDateTime(addDays(varCursor, 1), 'yyyy-MM-dd')`).
   - **Condition** : `dayOfWeek(varCursor)` n'est ni `0` (dimanche) ni `6` (samedi) →
     si oui, **Incrémenter la variable** `varBusinessDays` de `1`.
   - ⚠️ **Modifie les limites de la boucle** (**⋯** sur l'action Do until → **Paramètres** →
     **Nombre de tentatives**/« Count ») : la valeur par défaut de **60** suffit à peine à deux
     mois de retard. Monte-la à **3660** (10 ans, large marge) — un dossier oublié depuis très
     longtemps ne doit pas faire échouer le flux.

   *(Ce calcul reproduit volontairement `countBusinessDaysBetween` jour par jour plutôt qu'avec une
   formule fermée, pour rester lisible et auditable dans l'éditeur Power Automate — exactement ce
   que fait la boucle JS d'origine.)*

### 7 ter.5 Décider si la relance est due

**Condition** — toutes ces conditions réunies (groupe « ET ») :

| Membre gauche | Opérateur | Membre droit |
|---|---|---|
| Seuil effectif (§7 ter.3) | est supérieur à | `0` |
| `varBusinessDays` | est supérieur ou égal à | Seuil effectif |
| `body('Parse_JSON')?['claim']?['reminderSentAt']` | est vide **OU** est inférieur à la dernière activité (§7 ter.4) | — |

*(Reproduit `isReminderDue` de `getClaimStaleness` dans `projectClaims.js` : seuil désactivé si
`0`, et une relance déjà envoyée depuis la dernière activité ne se rejoue pas.)*

### 7 ter.6 Envoyer la relance et marquer `reminderSentAt`

Dans la branche **« Si oui »** :

1. SharePoint → **« Obtenir un élément »** sur `CN_Projects`, filtré sur
   `ProjectId eq '@{items('Appliquer_à_chacun')?['ProjectId']}'` (nombre max `1`), pour récupérer
   le nom du projet (`Title`) — `CN_ComplianceComments` ne le porte pas.
2. SharePoint → **« Créer un élément »** sur `CN_NotificationsQueue` :

   | Colonne | Valeur |
   |---|---|
   | `Title` | `concat('[Project Navigator] Reminder: project waiting for your review - ', first(outputs('Obtenir_un_élément')?['body/value'])?['Title'])` |
   | `ToEmails` | `items('Appliquer_à_chacun')?['AssigneeEmail']` |
   | `Body` (mode `</>`, comme au §3.4) | `concat('<p>You are handling the project "', first(outputs('Obtenir_un_élément')?['body/value'])?['Title'], '" and no action has been recorded on it for ', string(variables('varBusinessDays')), ' business days.</p><p>Open the synthesis report and post your review, or update the compliance status. Release the project so that another member of your team can pick it up if you cannot handle it.</p>')` |
   | `NotificationType` | `Reminder: project waiting for your review` |
   | `ProjectId` | `items('Appliquer_à_chacun')?['ProjectId']` |
   | `Status` | `Pending` |

   *(Le flux 1 se charge de l'envoi — aucune action Outlook à ajouter ici. Le texte anglais
   reprend volontairement le gabarit `PERIMETER_STALE_REMINDER` de
   `src/utils/notificationTemplates.js`, pour que cette relance ressemble aux autres.)*

3. SharePoint → **« Mettre à jour l'élément »** sur `CN_ComplianceComments`, `Id` =
   `items('Appliquer_à_chacun')?['ID']` :

   | Colonne | Valeur |
   |---|---|
   | `ClaimJson` | `string(setProperty(body('Parse_JSON'), 'claim', setProperty(body('Parse_JSON')?['claim'], 'reminderSentAt', utcNow())))` |

   ⚠️ **Ne touche pas à `UpdatedAt` sur cette mise à jour.** L'app considère `UpdatedAt` comme un
   signe d'activité sur le dossier (`getPerimeterLastActivityAt`) ; si ce flux le modifiait en même
   temps que `reminderSentAt`, la prochaine exécution verrait une « nouvelle activité » fictive et
   ne renverrait donc jamais de seconde relance même en cas de silence prolongé. En laissant
   `UpdatedAt` inchangé, `reminderSentAt` reste bien ≥ à la dernière vraie activité tant que rien
   ne bouge, ce qui est exactement le comportement voulu par `isReminderDue`.

4. **Gestion d'erreur** : même principe qu'au §3.6 (branche « Configurer l'exécution après » sur
   l'action de création dans `CN_NotificationsQueue`, `Status` = `Error`).

### 7 ter.7 Recette — 10 minutes

1. Choisis un dossier de test déjà pris en charge (ou prends-en un en charge depuis l'app), puis
   recule sa dernière activité à la main : ouvre la ligne racine correspondante dans
   `CN_ComplianceComments` et avance `UpdatedAt` de plusieurs jours dans le passé (au-delà du
   `ClaimReminderDays` de son équipe, en jours ouvrés).
2. **Tester** le flux → *Manuellement*.
3. Contrôle :
   - [ ] Une nouvelle ligne `Pending` apparaît dans `CN_NotificationsQueue`, adressée au référent.
   - [ ] Cette ligne passe ensuite à `Sent` (flux 1) et l'e-mail arrive.
   - [ ] `ClaimJson` de la ligne racine porte désormais un `reminderSentAt` récent.
4. **Relance-toi le flux immédiatement** (toujours *Manuellement*, sans rien changer) : aucune
   nouvelle ligne ne doit apparaître dans `CN_NotificationsQueue` — c'est le test de
   l'idempotence (§7 ter.5).

### 7 ter.8 Sécurité et gouvernance

- **Ajoute un co-propriétaire**, comme pour les autres flux (§3.7).
- Ce flux ne lit et n'écrit que dans `CN_ComplianceComments`, `CN_Teams`, `CN_Projects` (lecture
  seule) et `CN_NotificationsQueue` — les mêmes permissions que celles déjà accordées à l'app pour
  ces listes suffisent, pas besoin d'un compte avec des droits élevés (contrairement au flux 5).
- Si tu fais évoluer un jour la règle de relance dans le code (seuil, calendrier de jours fériés,
  etc.), pense à reporter le même changement dans ce flux — c'est la seule partie de cette logique
  qui vit à deux endroits. Voir la note de synchronisation en [§10](#10-références-techniques-pour-claude).

---

## 8. Catalogue des notifications envoyées par l'application

Le flux 1 traite **tous** ces messages : aucune configuration supplémentaire n'est nécessaire.

| # | Déclencheur dans l'app | `NotificationType` | Destinataires | Ce que le message demande de faire |
|---|---|---|---|---|
| 1 | Un projet est **soumis** | `Projet soumis pour analyse` | Contacts des équipes compliance identifiées par le questionnaire | Analyser le projet et déposer leurs remarques dans le rapport de synthèse |
| 2 | Un projet est **soumis** | `Confirmation de soumission` | Le porteur **et** ses co-porteurs | Rien à faire : confirme l'envoi et annonce la suite |
| 3 | Un **co-porteur est ajouté** | `Ajout comme co-porteur` | La personne ajoutée | Ouvrir le projet, prendre connaissance, compléter |
| 4 | Commentaire sur la **vitrine** | `Commentaire sur la vitrine` | Porteur + co-porteurs | Lire le commentaire et y répondre |
| 5 | Réponse dans un fil de la **vitrine** | `Réponse à votre commentaire` | Auteur du message précédent | Prendre connaissance, poursuivre si besoin |
| 6 | Commentaire compliance sur le **rapport de synthèse** | `Commentaire compliance sur votre rapport` | Porteur + co-porteurs | Apporter les précisions, répondre dans le fil |
| 7 | Réponse du porteur sur le **rapport** | `Réponse du porteur de projet` | Équipes / comités ayant commenté | Confirmer que le point est levé, ou poursuivre |
| 8 | Réponse dans un fil du **rapport** | `Réponse à votre commentaire` | Auteur du message précédent | Prendre connaissance de la réponse |
| 9 | **Réintégration en comité** | `Réintégration en comité de validation` | Porteur + co-porteurs | Vérifier le dossier, préparer le passage |

> ℹ️ **La relance des dossiers pris en charge (« Reminder: project waiting for your review ») n'est
> volontairement pas dans ce tableau.** En mode SharePoint, l'application ne la déclenche plus du
> tout — c'est le flux 6 ([§7 ter](#7-ter-flux-6--relance-des-dossiers-pris-en-charge-recommandé))
> qui dépose lui-même la ligne dans `CN_NotificationsQueue`. Le flux 1 l'envoie ensuite exactement
> comme les neuf autres, sans rien à ajouter de ce côté.

**Deux règles appliquées automatiquement par l'application :**

- **On ne se notifie jamais soi-même.** L'auteur d'une action est retiré des destinataires — sauf
  pour la confirmation de soumission (ligne 2), volontairement envoyée au porteur.
- **Le réglage « notifier l'équipe » du back-office est respecté.** Une règle peut mobiliser une
  équipe sans cocher la notification : cette équipe apparaît alors dans l'analyse mais **ne
  reçoit pas** d'e-mail.

> ❗ **Ne crée pas de flux supplémentaire « alerter la compliance à la soumission ».**
> L'application le fait déjà (ligne 1). Un tel flux enverrait des e-mails en double.

### Structure des e-mails

Chaque message suit la même trame, pour qu'aucun destinataire ne se demande pourquoi il l'a reçu :

1. **Ce qui s'est passé** — une phrase : qui a fait quoi, sur quel projet
2. **Un tableau récapitulatif** — projet, porteur, auteur de l'action, équipes concernées, date
3. **« Ce qui est attendu de vous »** — la liste concrète des actions à mener
4. **Le contenu du commentaire**, lorsqu'il y en a un
5. **Un lien direct** vers le projet dans l'application
6. **« Pourquoi recevez-vous ce message ? »** — la raison précise
7. La mention de **ne pas répondre** à l'e-mail, mais d'utiliser les fils de discussion

---

## 9. Exploitation courante

### Surveillance hebdomadaire (2 minutes)

1. Ouvre la liste `CN_NotificationsQueue`, filtre sur `Status = Error` → aucune ligne attendue.
2. Vérifie qu'aucune ligne n'est restée en `Pending` depuis plus de quelques minutes.

Astuce : crée une vue SharePoint « Anomalies » filtrée sur `Status` différent de `Sent`.

### Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Le message affiche du code `<p>`, `<strong>` | Le champ Corps n'est pas en mode HTML | Refaire [§3.4](#34-envoyer-le-mail--létape-à-ne-pas-rater) |
| Aucun e-mail, ligne restée en `Pending` | Flux désactivé, ou condition qui ne passe pas | Vérifier que le flux est **Activé** ; ouvrir l'historique des exécutions |
| Ligne passée en `Error` | L'envoi Outlook a échoué | Lire `ErrorMessage` ; souvent une adresse invalide |
| Le flux ne se déclenche pas du tout | Mauvais site ou mauvaise liste dans le déclencheur | Revérifier l'adresse du site et le nom exact `CN_NotificationsQueue` |
| E-mails classés en indésirables | Expéditeur inhabituel | Passer à une boîte partagée ([§3.8](#38-de-quelle-adresse-partiront-les-e-mails-)) et demander une mise en liste sûre |
| Le flux s'est arrêté seul | Aucune exécution pendant 90 jours, ou connexion expirée | Le réactiver et vérifier les connexions en haut du flux |
| Erreur « The expression is invalid » | Nom d'action différent dans une expression | Les noms d'actions dans les expressions utilisent des `_` : adapte-les à tes intitulés réels |

### Relancer une notification manuellement

Ouvre la ligne concernée dans `CN_NotificationsQueue`, repasse `Status` à `Pending` puis
enregistre… **cela ne suffit pas** : le flux 1 se déclenche à la *création*, pas à la
modification. Pour rejouer un envoi, crée une **nouvelle ligne** en recopiant `Title`, `ToEmails`
et `Body`.

### Checklist de mise en service

- [ ] Flux 1 créé, testé ([§4](#4-recette-du-flux-1--5-minutes)) et **Activé**
- [ ] Branche d'erreur configurée ([§3.6](#36-tracer-les-échecs-fortement-recommandé))
- [ ] Co-propriétaire ajouté sur chaque flux
- [ ] Boîte d'envoi décidée (personnelle ou partagée)
- [ ] Vue « Anomalies » créée sur `CN_NotificationsQueue`
- [ ] Flux 6 (relance des dossiers pris en charge) créé, testé ([§7 ter.7](#7-ter7-recette--10-minutes))
  et **Activé** — sans lui, cette relance ne part plus du tout
- [ ] Flux optionnels créés si souhaité

---

## 10. Références techniques (pour Claude)

- Mise en file : [`src/utils/notificationQueue.js`](../../src/utils/notificationQueue.js)
- Gabarits des messages : [`src/utils/notificationTemplates.js`](../../src/utils/notificationTemplates.js)
- Point d'appel unique : fonction `notify` de [`src/App.jsx`](../../src/App.jsx)
- Tests : `test/notificationTemplates.test.mjs`, `test/notificationQueue.test.mjs`

Pour ajouter un type de notification : déclarer le type dans `NOTIFICATION_TYPES`, écrire son
gabarit dans `NOTIFICATION_CATALOG` (`intro`, `expected`, `reason`), appeler `notify({ type, … })`
au bon endroit, puis compléter le tableau de la [§8](#8-catalogue-des-notifications-envoyées-par-lapplication).
**Aucune modification des flux Power Automate n'est nécessaire.**

### Flux 5 — Ajout comme membre du site

- Mise en file : [`src/utils/siteAccessQueue.js`](../../src/utils/siteAccessQueue.js)
- Contrôle « déjà membre ? » : `isKnownSiteUser` dans
  [`src/utils/peopleSearch.js`](../../src/utils/peopleSearch.js) (`_api/web/siteusers`)
- Point d'appel : `requestAccessIfNeeded` dans
  [`src/components/PeoplePicker.jsx`](../../src/components/PeoplePicker.jsx), après chaque ajout
  réussi (partage de projet, contacts d'équipe, comités, administrateurs)
- Tests : `test/siteAccessQueue.test.mjs`, `test/peopleSearch.test.mjs`
- **Contrairement au flux 1, ce flux n'est pas construit par défaut** : il correspond à une
  décision explicite prise par l'utilisateur (« par précaution, ajouter automatiquement comme
  membre du site »), pas à un comportement que l'app impose. S'il n'est jamais créé, les demandes
  s'accumulent simplement dans `CN_SiteAccessRequests` sans être traitées — l'app continue de
  fonctionner normalement, rien ne casse.

### Flux 6 — Relance des dossiers pris en charge

- Logique de seuil/idempotence dupliquée par ce flux :
  `getClaimStaleness`/`resolveTeamClaimSettings` dans
  [`src/utils/projectClaims.js`](../../src/utils/projectClaims.js), et le calcul des jours ouvrés
  dans [`src/utils/businessDays.js`](../../src/utils/businessDays.js) (`countBusinessDaysBetween`,
  aucun calendrier de jours fériés).
- Gabarit de l'e-mail repris à la main dans le flux : `PERIMETER_STALE_REMINDER` dans
  [`src/utils/notificationTemplates.js`](../../src/utils/notificationTemplates.js).
- Ancien point d'appel côté app (toujours actif en mode local/mock, désactivé en mode SharePoint
  via `isSharePointMode()`) : l'effet juste avant `handleUpdateComplianceComments` dans
  [`src/App.jsx`](../../src/App.jsx) (commentaire « Relance du référent d'un projet pris en
  charge… »).
- Stockage de la prise en charge : `toClaimColumns`/`fromClaimColumns` dans
  [`src/utils/complianceCommentsProvider.js`](../../src/utils/complianceCommentsProvider.js)
  (`AssigneeEmail` + `ClaimJson` sur la ligne racine `CN_ComplianceComments`).
- Tests : `test/projectClaims.test.mjs`, `test/businessDays.test.mjs` (si présent).
- **⚠️ Point de synchronisation manuelle** : c'est la seule notification de ce document dont la
  règle de déclenchement vit dans **deux** endroits (le JS et ce flux) plutôt qu'un seul. Si le
  seuil, le calendrier de jours ouvrés ou la définition de « dernière activité » changent un jour
  côté code, il faut reporter le même changement dans le flux — sinon l'app et Power Automate
  finiront par ne plus être d'accord sur la date à laquelle une relance est due.
