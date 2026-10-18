# Formation experts : déroulé de 20 minutes

> **Pour qui ?** Le formateur qui forme les experts (équipes SME, membres de comité) à donner leur avis sur les projets dans Project Navigator.
> **Format :** **on fait tous en même temps.** Le formateur projette son écran et clique ; les participants cliquent au même moment sur leur poste.
> **Objectif :** à la fin, chaque expert sait trouver les projets qui le concernent, les prendre en charge, rendre un avis, solliciter une autre équipe, faire passer un projet en comité et régler sa propre équipe dans le back-office.

**Comment lire ce guide**

- 🖱 **Tout le monde :** les clics à faire ensemble. Les libellés entre « guillemets » sont ceux affichés à l'écran.
- ✅ **Point de contrôle :** ce que chacun doit voir avant de passer à la suite.
- 💬 **À dire :** le message clé, en une phrase, à dire **pendant** que les participants cliquent.
- 🎬 **Formateur seul :** une démonstration que les participants regardent sans cliquer.
- ⚠️ **À vérifier :** un point que ce guide ne peut pas trancher à votre place.

---

## Le minutage

| Heure | Étape | Durée |
|---|---|---|
| 00:00 | [1. Trouver les projets qui me concernent](#1-trouver-les-projets-qui-me-concernent--2-min) | 2 min |
| 00:02 | [2. Ouvrir un projet et le prendre en charge](#2-ouvrir-un-projet-et-le-prendre-en-charge--3-min) | 3 min |
| 00:05 | [3. Donner son avis : statut et commentaire](#3-donner-son-avis--statut-et-commentaire--4-min) | 4 min |
| 00:09 | [4. Solliciter un autre expert non identifié](#4-solliciter-un-autre-expert-non-identifié--2-min) | 2 min |
| 00:11 | [5. Faire passer un projet en comité](#5-faire-passer-un-projet-en-comité--2-min) | 2 min |
| 00:13 | [6. Back-office : régler son équipe](#6-back-office--régler-son-équipe--4-min) | 4 min |
| 00:17 | [7. Back-office : ses règles et ses questions à préparer](#7-back-office--ses-règles-et-ses-questions-à-préparer--2-min) | 2 min |
| 00:19 | [Conclusion](#conclusion--1-min) | 1 min |

---

## Avant la séance (la veille)

| # | À préparer | Pourquoi |
|---|---|---|
| 1 | **Chaque participant est contact de son équipe experte** (back-office, onglet « Équipes », « Contacts e-mail »). | C'est ce qui fait apparaître les projets dans son accueil et lui ouvre le back-office de son équipe, sans mot de passe. |
| 2 | **Un projet de formation par participant**, soumis, qui déclenche l'équipe de ce participant et affiche des « Points à préparer » dans sa carte. Nommez-les clairement, par exemple « Formation experts – Prénom ». Le plus simple : dupliquez un projet complet, renommez la copie, soumettez-la, et recommencez pour chaque participant. | Un avis est rendu **par équipe et par projet**. Si deux experts de la même équipe travaillent sur le même projet, le premier prend le projet en charge et le second ne peut plus le faire (étape 2) : ils se gêneraient. |
| 3 | **Une réponse du porteur** dans l'« Échange en cours » d'au moins un projet, par exemple une réponse aux points à préparer. | Étape 3 : l'expert voit qu'un échange existe déjà avant même son avis. |
| 4 | **Au moins un participant membre d'un comité de validation** (back-office, onglet « Comités de validation », « Adresses mail »), et un projet de formation sur lequel ce comité n'est **pas** déclenché automatiquement. | Étape 5 : c'est la condition pour que le bouton « Réintégrer en comité » apparaisse. |
| 5 | **Les flux Power Automate désactivés** juste avant la séance. | Aucune notification ne part vers les porteurs ni vers les équipes. |

> ⚠️ **À vérifier : les notifications en attente.** Même flux coupés, l'application écrit chaque notification dans la liste SharePoint `CN_NotificationsQueue`. Je ne sais pas si vos flux traiteront ces éléments une fois réactivés : cela dépend de la configuration de leur déclencheur. Par précaution, après la séance et **avant** de réactiver les flux, supprimez les éléments créés pendant la démo.

> ⚠️ **À vérifier : les réglages faits en séance sont réels.** Contacts, absences, critères et règles modifiés à l'étape 6 et 7 s'appliquent immédiatement à tous les projets de l'équipe : les règles et les équipes sont enregistrées dans SharePoint à chaque modification. Faites remettre les réglages d'origine à la fin, ou travaillez sur une équipe de test.

> ⚠️ **À vérifier :** l'adresse de la page SharePoint de l'application : `______________________`.

---

## 1. Trouver les projets qui me concernent — 2 min

🖱 **Tout le monde :**
1. Ouvrez Project Navigator. Sur l'accueil, repérez la section « **Projets déclenchés pour vous** ».
2. Parcourez les onglets :
   - « **À traiter** » : les projets qui attendent votre avis ;
   - « **Traités** » : ceux où vous vous êtes déjà prononcé ;
   - « **Pris en charge par l'équipe** » : ceux qu'un collègue de votre équipe suit déjà ;
   - « **Hors scope comité** » : visible seulement pour les membres d'un comité (voir étape 5).
3. Sur chaque projet, le badge indique votre rôle (« Expert » ou « Comité »).

✅ **Point de contrôle :** chacun voit son projet « Formation experts – Prénom » dans « À traiter ».

💬 **À dire :** « Vous ne cherchez pas les projets : ce sont les règles de votre équipe qui vous les envoient. Si un projet devrait être chez vous et n'y est pas, c'est une règle à revoir (étape 7). »

---

## 2. Ouvrir un projet et le prendre en charge — 3 min

🖱 **Tout le monde :**
1. Sur la carte de votre projet, sous « Prise en charge par périmètre », lisez « Personne ne suit encore ce périmètre ». Cliquez sur « **Je prends en charge** ».
2. La ligne devient « Vous le suivez depuis le … ».
3. Cliquez sur « **Ouvrir** » : la page « Enjeux du projet » s'affiche.
4. Faites le tour en suivant le « Sommaire » de gauche : « Équipes à solliciter », « Risques identifiés », « Points de vigilance », « Rappel de vos réponses » (les réponses du porteur).

✅ **Point de contrôle :** le projet est indiqué comme suivi par vous.

💬 **À dire :** « Prendre en charge un projet le retire de la liste "À traiter" de vos collègues. Les échanges suivants ne sont notifiés qu'à vous. Pas besoin de cliquer sur ce bouton à chaque fois : publier un avis ou un statut vous désigne automatiquement. »

> 💡 **Un collègue absent ?** Sur un projet qu'il suit, le bouton « **Reprendre** » permet de le récupérer. Il faut indiquer un motif (« Absence », « Surcharge », « Départ », « Autre ») ; l'ancien référent et l'équipe sont prévenus par e-mail, et cette notification ne peut pas être désactivée. Pour rendre un projet à l'équipe : « Libérer » (accueil) ou « Ne plus suivre » (enjeux du projet).

---

## 3. Donner son avis : statut et commentaire — 4 min

🖱 **Tout le monde** (sur « Enjeux du projet ») :
1. Dans « Équipes à solliciter », dépliez la carte de **votre** équipe.
2. Lisez les « **Points à préparer** » : ce sont les questions que votre équipe pose systématiquement pour cette règle. Dans les « Échanges », le porteur y a peut-être déjà répondu.
3. Cliquez sur « **✎ Modifier le commentaire / statut** ».
4. Dans « Statut », choisissez une valeur :
   - « **Validé** »
   - « **Validé sous conditions** »
   - « **En attente d'informations** »
   - « **Non concerné** »
   - « **Refusé** »
5. Dans « Commentaire », rédigez votre avis : recommandations, points d'attention, liens.
6. Cliquez sur « **Enregistrer le commentaire** ». Le message « Commentaire enregistré. » s'affiche.
7. Pour poser une question complémentaire au porteur sans changer votre avis : « **Répondre** », puis « **Envoyer la réponse** ».

✅ **Point de contrôle :** le statut choisi apparaît en badge sur la carte de votre équipe.

💬 **À dire :**
- « Le porteur ne voit votre carte qu'à partir du moment où vous avez écrit quelque chose. Une carte vide se lirait comme un tampon manquant. »
- « "Validé", "Validé sous conditions" et "Non concerné" comptent comme favorables. "En attente d'informations" ne compte pas. Un seul "Refusé" suffit à faire passer le projet en refusé. »

> 💡 **Avis préliminaire ou validation ?** Le porteur peut demander un avis préliminaire sur un projet encore en construction. Un avis favorable sur une demande préliminaire s'affiche « Avis préliminaire », jamais « Validé » : vous orientez, vous ne validez pas.

> 💡 **Le projet change après votre avis ?** Si une mise à jour du porteur touche votre périmètre, votre carte affiche « **À ré-examiner** » avec la liste des modifications. Sur l'accueil du porteur, un projet validé passe alors à « Validé — modifié depuis ». Les changements qui ne touchent pas votre périmètre ne vous dérangent pas.

---

## 4. Solliciter un autre expert non identifié — 2 min

Deux cas différents, à bien distinguer.

### Cas 1 : une **autre équipe** devrait se prononcer

🖱 **Tout le monde :**
1. Sous les cartes d'équipes, repérez « Une équipe n'a pas été identifiée automatiquement ? Ajoutez-la aux enjeux du projet. »
2. Choisissez l'équipe dans « Sélectionner une équipe », puis cliquez sur « **Solliciter cette équipe** ».

✅ **Point de contrôle :** le message « L'équipe … a été ajoutée aux enjeux du projet et notifiée. » s'affiche, et une nouvelle carte d'équipe apparaît.

💬 **À dire :** « Vous êtes souvent le mieux placé pour voir qu'il manque quelqu'un. Si ça se reproduit sur plusieurs projets, c'est qu'une règle manque : signalez-le à l'équipe concernée ou à un administrateur. »

> ⚠️ L'équipe ajoutée reste attachée au projet de formation : supprimez ces projets après la séance.

### Cas 2 : un **collègue de votre équipe** n'est pas encore contact

🎬 **Formateur seul** (cela se fait dans le back-office, montré à l'étape 6) : onglet « Équipes », champ « **Contacts e-mail** », « Rechercher un contact… », puis sélectionnez la personne. Elle recevra désormais les projets de l'équipe et aura accès à son back-office.

---

## 5. Faire passer un projet en comité — 2 min

Un comité se déclenche **automatiquement** quand ses critères sont remplis : des réponses, des règles activées, un score de risque minimal ou un nombre minimal d'équipes. Ces critères se règlent dans le back-office, onglet « Comités de validation ». Mais un membre du comité peut aussi y faire passer un projet que les critères n'ont pas retenu.

🖱 **Participants membres d'un comité :**
1. Sur l'accueil, onglet « **Hors scope comité** » : les projets soumis sur lesquels votre comité n'est pas déclenché.
2. Sur le projet choisi, cliquez sur « **Réintégrer en comité** ». Si vous êtes membre de plusieurs comités, choisissez lequel dans « Choisir le comité de réintégration ».
3. Ouvrez le projet : la section « **Avis Comité** » apparaît dans « Enjeux du projet ».

Le même bouton existe dans la carte d'équipe, sur la page « Enjeux du projet » (« Réintégrer au comité « … » »), pour un expert qui est aussi membre d'un comité.

✅ **Point de contrôle :** la section « Avis Comité » apparaît sur le projet.

💬 **À dire :** « Le comité n'est pas réservé aux projets que la règle a repérés : si vous estimez qu'un projet doit y passer, vous l'y amenez en un clic. Le porteur en est informé. »

> ⚠️ **À vérifier : qui saisit l'avis du comité.** D'après le code actuel, choisir le statut et rédiger le commentaire du comité, sur la page « Enjeux du projet », est réservé aux **administrateurs en mode administrateur**. Les membres du comité peuvent répondre dans le fil du comité (« Répondre », puis « Envoyer la réponse »), mais pas poser le statut. Vérifiez que c'est bien l'organisation voulue chez vous avant de le présenter.

> 💡 **Configurer un comité** (membres d'un comité ou administrateurs) : back-office, onglet « Comités de validation ». On y trouve « Ajouter un comité », « Nom du comité », « Adresses mail » des membres et « Activer la demande de commentaire ». On y règle aussi les critères de déclenchement : groupes de conditions sur les réponses, « Règles ciblées », « Score de risque minimal », « Nombre minimal d'équipes ». En mode SharePoint, ces réglages ne sont visibles des autres qu'après « **Publier vers SharePoint** ».

---

## 6. Back-office : régler son équipe — 4 min

🖱 **Tout le monde :**
1. Revenez à l'accueil et cliquez sur l'**icône cadenas** en haut (« Accéder au Back-office »). Pas de mot de passe : votre adresse est contact d'une équipe.
2. Vous ne voyez que les onglets de votre périmètre : « Tableau de bord », « Équipes », « Règles », « Revue des règles », « Traductions », et « Comités de validation » si vous êtes membre d'un comité.
3. Onglet « **Équipes** » : vous ne voyez que votre (vos) équipe(s). Parcourez la carte :
   - « **Contacts e-mail** » : ajoutez ici un collègue manquant (cas 2 de l'étape 4) ;
   - « **Domaine d'expertise** » ;
   - « **Langues de réponse acceptées** » : les langues dans lesquelles vous acceptez d'échanger avec les porteurs (aucune case cochée = toutes) ;
   - « **Déclenchement par membre** » : bouton « **Critères** » à côté de chaque membre, pour qu'il ne soit sollicité que sur certains projets (« Sollicité si », « Non sollicité si », « Jamais sollicité ») ;
   - « **Prise en charge des projets** » : au bout de combien de jours ouvrés sans action un projet est signalé, puis son référent relancé (0 désactive) ;
   - « **Absences et suppléances** » : bouton « **Absence** » à côté d'un membre, avec les dates et un suppléant. Cela peut se déclarer pour un collègue absent.
4. Testez : déclarez-vous une absence fictive avec un collègue comme « Suppléant », puis cliquez sur « **Supprimer l'absence** ».

✅ **Point de contrôle :** chacun a ouvert le bouton « Absence » de sa propre ligne, puis supprimé l'absence de test.

💬 **À dire :**
- « Les critères par membre réduisent qui reçoit les notifications, jamais qui a accès : un membre non sollicité peut toujours ouvrir les projets de l'équipe. »
- « Si plus personne n'est sollicité sans condition, une alerte s'affiche sur la carte. Elle propose de réattribuer les critères d'un membre à un autre. »

> ⚠️ **Ne vous retirez jamais vous-même des « Contacts e-mail ».** Vous perdriez aussitôt l'accès au back-office de l'équipe, sans aucun moyen de revenir par l'interface. Seul un administrateur pourrait vous rajouter.

> 💡 Retirer un contact qui suit encore des projets ouvre une fenêtre « Ce contact porte encore des projets » : réattribuez-les, ou remettez-les dans « À traiter ».

---

## 7. Back-office : ses règles et ses questions à préparer — 2 min

🖱 **Tout le monde :**
1. Onglet « **Règles** » : vous ne voyez que les règles qui sollicitent votre équipe. Ouvrez-en une (« Afficher la règle … »).
2. Dans l'éditeur, montrez :
   - « **Conditions de déclenchement** » : quand la règle s'active ;
   - « **SME à déclencher** », et la case « Notifier l'équipe concernée lorsque cette règle se déclenche ». Si elle est décochée, personne n'est notifié et le projet est considéré « validé sous conditions » d'office ;
   - « **Questions à préparer par équipe** » : ce sont les « Points à préparer » que les porteurs voient dans votre carte ;
   - « **Risques associés** » : description, criticité, actions de mitigation.
3. Fermez **sans enregistrer** (« Annuler »).

🎬 **Formateur seul**, si le temps le permet : onglet « **Revue des règles** ». Choisissez votre équipe, chargez un projet type, modifiez des réponses et voyez en direct les règles déclenchées, les questions et les risques. Le bouton « Créer une règle à partir de ce projet » est disponible. Rien de ce qui se fait ici ne touche un projet réel.

💬 **À dire :** « Les meilleurs points à préparer sont ceux que vous posez à chaque fois par mail. Écrivez-les une bonne fois dans la règle : les porteurs y répondront avant même de vous solliciter. »

> 💡 En mode SharePoint, les modifications de règles et d'équipes sont enregistrées immédiatement, sans bouton « Publier ». Une erreur se corrige donc aussi immédiatement… mais elle s'applique aussi immédiatement. Un raccourci « Annuler (Ctrl+Z) » permet d'annuler la dernière suppression.

Pour revenir à l'application : « **Mode Chef de Projet** » dans la barre du haut.

---

## Conclusion — 1 min

```
Accueil « À traiter » → Je prends en charge → Enjeux du projet
     → Points à préparer + échanges → Statut + commentaire
     → (Solliciter une autre équipe / Réintégrer en comité)
Back-office : contacts, absences, critères par membre, règles, questions à préparer
```

### Réponses aux questions fréquentes

- **« Je ne reçois pas un projet qui me concerne. »** Il manque une règle, ou vos critères de membre vous excluent. Vérifiez l'onglet « Règles », et votre ligne dans « Déclenchement par membre ».
- **« Mon collègue et moi recevons tous les deux les mêmes mails. »** Le premier qui prend le projet en charge (ou qui publie un avis) en devient le référent : l'autre n'est plus notifié.
- **« Je pars en congés. »** Déclarez votre absence avec un suppléant, dans « Absences et suppléances » ou dans « Mon profil » sur l'accueil.
- **« Le porteur a modifié son projet après mon avis. »** Seules les modifications qui touchent votre périmètre vous le renvoient, marqué « À ré-examiner ».
- **« Le porteur n'écrit pas dans ma langue. »** Cochez vos « Langues de réponse acceptées » : un bandeau le lui indiquera.

### Après la séance

- Supprimez les projets « Formation experts – … ».
- Remettez les réglages d'équipe modifiés pendant la séance.
- Videz `CN_NotificationsQueue` avant de réactiver les flux Power Automate.
