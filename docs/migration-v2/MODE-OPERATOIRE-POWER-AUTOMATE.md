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
