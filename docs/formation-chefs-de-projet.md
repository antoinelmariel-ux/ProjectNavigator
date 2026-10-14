# Formation chefs de projet : déroulé de 50 minutes

> **Pour qui ?** Le formateur qui anime une séance de prise en main de Project Navigator.
> **Format :** **on fait tous en même temps.** Le formateur projette son écran et clique ; les participants cliquent au même moment sur leur poste. Pas de phase « je montre, puis vous refaites ».
> **Objectif :** à la fin, chaque chef de projet a lui-même dupliqué, présenté, commenté, soumis et fait évoluer un projet.

**Comment lire ce guide**

- 🖱 **Tout le monde :** les clics à faire ensemble. Les libellés entre « guillemets » sont ceux affichés à l'écran.
- ✅ **Point de contrôle :** ce que chacun doit voir avant de passer à la suite. Demandez une main levée si quelqu'un ne le voit pas.
- 💬 **À dire :** le message clé, en une phrase. Dites-le **pendant** que les participants cliquent, pas avant.
- ⚠️ **À vérifier :** un point que ce guide ne peut pas trancher à votre place. À vérifier avant la séance.

---

## Le minutage

| Heure | Étape | Durée |
|---|---|---|
| 00:00 | [1. Connexion et profil](#1-connexion-et-profil--4-min) | 4 min |
| 00:04 | [2. Découvrir un projet partagé](#2-découvrir-un-projet-partagé--3-min) | 3 min |
| 00:07 | [3. Dupliquer le projet et modifier sa vitrine](#3-dupliquer-le-projet-et-modifier-sa-vitrine--7-min) | 7 min |
| 00:14 | [4. Présenter en masquant certaines parties](#4-présenter-en-masquant-certaines-parties--4-min) | 4 min |
| 00:18 | [5. Obtenir du feedback avec les post-its](#5-obtenir-du-feedback-avec-les-post-its--5-min) | 5 min |
| 00:23 | [6. Créer son propre projet](#6-créer-son-propre-projet--4-min) | 4 min |
| 00:27 | [7. Soumettre son projet](#7-soumettre-son-projet--4-min) | 4 min |
| 00:31 | [8. Répondre à la compliance](#8-répondre-à-la-compliance--4-min) | 4 min |
| 00:35 | [9. Modifier son projet depuis les enjeux](#9-modifier-son-projet-depuis-les-enjeux--3-min) | 3 min |
| 00:38 | [10. Renvoyer après modification des risques](#10-renvoyer-après-modification-des-risques--3-min) | 3 min |
| 00:41 | [11. Ajouter une inspiration et la partager](#11-ajouter-une-inspiration-et-la-partager--4-min) | 4 min |
| 00:45 | [12. Trouver de l'aide : le guide interactif](#12-trouver-de-laide--le-guide-interactif--2-min) | 2 min |
| 00:47 | [Conclusion et questions](#conclusion--3-min) | 3 min |

### Trois choix faits pour tenir en 50 minutes

1. **On soumet la copie du projet modèle, pas un projet créé de zéro.** Remplir un questionnaire complet prend bien plus de 4 minutes. À l'étape 6, on crée un vrai projet pour **découvrir** le questionnaire : quelques questions, puis on le laisse en brouillon. La suite (soumission, échanges, modification) se fait sur la copie de l'étape 3, déjà entièrement remplie. Avantage : vous connaissez ses réponses à l'avance, donc vous savez exactement quelle réponse modifier à l'étape 10.
2. **Pas d'expert en direct.** Pour « Répondre à la compliance », les participants répondent aux **« Points à préparer »** : les questions que les règles font apparaître automatiquement dans la carte de chaque équipe sollicitée. Aucun expert n'a besoin d'écrire pendant la séance.
3. **Les flux Power Automate sont désactivés pendant la démo.** Les soumissions, réponses et mises à jour ne partent donc pas en e-mail aux équipes expertes.

---

## Avant la séance (la veille)

Sans ces préparatifs, la séance ne peut pas être fluide.

| # | À préparer | Pourquoi |
|---|---|---|
| 1 | **Un projet modèle complet, soumis et rendu visible à tous.** Toutes les questions répondues, sans « J'ai un doute ». Vitrine soignée. Après la soumission, cliquez sur « Rendre visible à tous » sur sa carte d'accueil. Ce bouton n'apparaît que pour son porteur, un administrateur ou un membre d'un comité de validation. | Étapes 2 et 3 : il doit apparaître chez tous les participants dans « Projets partagés par d'autres équipes ». Étape 7 : sa copie doit pouvoir être soumise en validation sans rien compléter. |
| 2 | **Des « Points à préparer » dans le projet modèle.** Ouvrez ses « Enjeux du projet », dépliez les cartes des équipes et vérifiez qu'au moins une équipe affiche des « Points à préparer ». Notez laquelle et préparez une réponse d'exemple. | Étape 8 : c'est à ces questions que les participants répondent. Si aucune équipe n'en affiche, ajoutez des questions dans la règle concernée (back-office, onglet « Règles », section « Questions à préparer par équipe »). |
| 3 | **Une réponse du projet modèle qui change les risques.** Dans le back-office, onglet « Revue des règles », chargez le projet modèle et trouvez une réponse dont la modification déclenche une nouvelle règle, et donc une nouvelle équipe. Notez la question et la nouvelle réponse : `______________________` | Étape 10 : montrer qu'une modification ne notifie que les équipes réellement concernées. |
| 4 | **Les flux Power Automate désactivés** juste avant la séance. | Aucune notification inutile ne part vers les équipes expertes. |
| 5 | **Les binômes**, notés à l'avance. | Étape 5 : chacun commente la vitrine de son voisin. |

> ⚠️ **À vérifier : les notifications en attente.** L'application ne désactive rien de son côté : elle continue d'écrire chaque notification dans la liste SharePoint `CN_NotificationsQueue`, et ce sont les flux qui envoient les e-mails. Je ne sais pas si vos flux traiteront ces éléments une fois réactivés. Cela dépend de la configuration de leur déclencheur. Par précaution, après la séance et **avant** de réactiver les flux, consultez cette liste et supprimez les éléments créés pendant la démo.

> 💡 **Parlez-en aussi aux équipes expertes.** Même sans e-mail, les projets soumis pendant la séance apparaîtront dans leur « Projets déclenchés pour vous ». Prévenez-les, ou faites supprimer les projets de formation après la séance (icône corbeille sur la carte, réservée au porteur et aux administrateurs).

> ⚠️ **À vérifier** : l'adresse de la page SharePoint qui héberge Project Navigator. Elle n'est pas indiquée dans le code de l'application : `______________________`. Envoyez-la aux participants avant la séance.

> ⚠️ **À vérifier** : la FAQ (lien « Aide » du guide). Au moment de la rédaction, elle affiche « Cette page est en cours de construction ». Si c'est toujours le cas, ne l'ouvrez pas à l'étape 12.

> ⚠️ **À vérifier** : les noms d'équipes, de règles et de risques dépendent de la configuration de votre organisation. Testez le déroulé complet une fois, la veille, avec un compte de test.

---

## 1. Connexion et profil — 4 min

🖱 **Tout le monde :**
1. Ouvrez la page SharePoint de Project Navigator. Pas de mot de passe : vous êtes reconnu par votre session.
2. Écran « Bienvenue sur Project Navigator » : cochez votre **périmètre d'activité**, puis « Continuer ».
3. Écran « Votre profil est enregistré » : cliquez sur « Non merci, je découvrirai seul(e) ». Le guide sera vu en fin de séance.
4. En haut à droite de l'accueil, cliquez sur l'icône ronde « Mon profil ». Vérifiez votre périmètre et votre « Langue de l'interface », puis « Enregistrer ».

✅ **Point de contrôle :** tout le monde voit l'accueil avec le bouton « Créer un nouveau projet ».

💬 **À dire :** « Votre périmètre d'activité adapte les questions qu'on vous posera : prenez le temps de le renseigner correctement. »

> 💡 Un participant qui s'est déjà connecté ne verra pas l'écran de bienvenue : il passe directement à « Mon profil ».

---

## 2. Découvrir un projet partagé — 3 min

🖱 **Tout le monde :**
1. Faites défiler l'accueil jusqu'à « **Projets partagés par d'autres équipes** ».
2. Sur la carte du projet modèle, survolez le badge de validation (« Validé », « En attente de validation »…) : une info-bulle détaille les avis.
3. Cliquez sur « **Vitrine du projet** » et faites défiler la page jusqu'en bas.
4. Cliquez sur « **Enjeux du projet** » dans la barre du haut : équipes sollicitées, risques, avis des experts.
5. Revenez à l'accueil (logo Project Navigator en haut à gauche).

✅ **Point de contrôle :** tout le monde est revenu sur l'accueil.

💬 **À dire :** « Un projet a deux faces : la vitrine pour embarquer les gens, les enjeux pour sécuriser la compliance. Les deux viennent des mêmes réponses. »

---

## 3. Dupliquer le projet et modifier sa vitrine — 7 min

🖱 **Tout le monde :**
1. Sur la carte du projet modèle, cliquez sur l'**icône de copie** bleue en haut à droite (info-bulle « Dupliquer le projet »).

✅ **Point de contrôle :** le message « Copie créée : [Copie] … Elle est en haut de votre liste, en brouillon. » s'affiche.

2. Sur la carte « [Copie] … » (dans « Vos projets enregistrés »), cliquez sur « **Vitrine du projet** ».
3. Cliquez sur « **Modifier** » en haut de la vitrine.
4. Cliquez dans le **nom du projet** et remplacez « [Copie] … » par un nom à vous. Faites de même avec le **slogan**.
5. Survolez l'espace entre deux sections et cliquez sur « **Ajouter une section ici** ». Survolez les gabarits pour voir leur rendu, choisissez « **Chiffre en avant** » et remplissez-le.
6. Cliquez sur une section, puis choisissez une autre « Couleur de la section » dans le panneau de droite.
7. Appuyez sur la touche **P** (« Aperçu ») pour voir le rendu réel, puis de nouveau sur **P** pour revenir.
8. Cliquez sur « **Publier** ».

✅ **Point de contrôle :** l'indicateur affiche « Tout est publié ».

💬 **À dire** (pendant le point 4) : « On ne remplit pas un formulaire : on modifie directement la vitrine, et chaque texte modifié met à jour la réponse du questionnaire. »
💬 **À dire** (au point 8) : « Sans "Publier", tout reste un brouillon personnel. »

> 💡 Ce qui est copié : toutes les réponses, et vous devenez lead du projet. Ce qui n'est **pas** copié : les avis des experts, les post-its, la visibilité « Visible par tous ».

> 🆘 **Si quelqu'un est en retard :** il saute le point 5. Le nom du projet (point 4) et « Publier » (point 8) suffisent pour la suite.

---

## 4. Présenter en masquant certaines parties — 4 min

🖱 **Tout le monde** (toujours sur la vitrine, hors mode édition) :
1. Dans le bloc « Mode d'utilisation », cliquez sur « **Configurer** ».
2. Décochez « **Coût estimé du projet** » (et une autre section au choix), puis « **Valider** ».
3. Cliquez sur « **Mode Light** » : les sections décochées disparaissent. Cliquez sur « Mode complet » pour comparer, puis revenez en « Mode Light ».
4. Dans la barre du haut, cliquez sur « **Partager** ». Dans « Mode partagé », choisissez « **Mode Light** ». **Ne fermez pas la fenêtre** : on enchaîne.

✅ **Point de contrôle :** la fenêtre « Partager la vitrine du projet » est ouverte, en Mode Light.

💬 **À dire :** « Une seule vitrine, deux publics. Le destinataire d'un lien en mode Light ne peut pas basculer vers la version complète. »

---

## 5. Obtenir du feedback avec les post-its — 5 min

🖱 **Tout le monde** (dans la fenêtre de partage restée ouverte) :
1. Activez « **Commentaires possibles** ». Laissez « Tous les post-its ».
2. Cliquez sur « **Copier le lien** » et envoyez-le à votre binôme (Teams ou mail).
3. Ouvrez le lien reçu de votre binôme. Sa vitrine s'affiche seule, sans le menu de l'application.
4. Cliquez sur le bouton flottant « **Commentaires** ». À partir de là, chaque clic sur la vitrine pose un post-it à cet endroit. Posez **deux post-its** avec une vraie remarque.
5. Revenez sur **votre** application. Sur l'accueil, la carte de votre projet affiche un badge « **2 retours** ».
6. Ouvrez votre vitrine (« Vitrine du projet »), puis cliquez sur « **Commenter** » en haut : les post-its de votre binôme apparaissent.
7. Répondez à l'un (« Répondre ») et clôturez l'autre (« **Clôturer** »).

✅ **Point de contrôle :** chacun a reçu des post-its et en a clôturé un.

💬 **À dire :** « Les post-its permettent de récolter des retours avant même de solliciter un expert. »

> 💡 Pour cliquer normalement sur la vitrine sans poser de post-it, utilisez « Mettre en pause » dans le bandeau « Mode annotation ».

---

## 6. Créer son propre projet — 4 min

🖱 **Tout le monde :**
1. Revenez à l'accueil et cliquez sur « **Créer un nouveau projet** » (ou « Créer un projet »).
2. Répondez aux premières questions. Sur l'une d'elles, cliquez sur « **Comprendre cette question** » : objectif, conseils pratiques, et « Pourquoi cette question apparaît ».
3. Sur une question dont vous n'êtes pas sûr, cliquez sur « **J'ai un doute** » et écrivez pourquoi.
4. Repérez le **Sommaire** à gauche : état de chaque question, et accès direct à n'importe laquelle.
5. Revenez à l'accueil : le projet est enregistré en brouillon, avec sa barre « Avancement ».

✅ **Point de contrôle :** le nouveau projet apparaît en « Brouillon en cours » dans « Vos projets enregistrés ».

💬 **À dire :** « Tout est sauvegardé en continu. Vous reprendrez ce projet tranquillement avec "Continuer l'édition". En fin de questionnaire, "Terminer et voir la vitrine" vous mène à la vitrine : l'outil est d'abord fait pour réfléchir à votre projet. »

> 💡 Un « J'ai un doute » n'empêche pas de demander un avis préliminaire, mais il bloque la validation définitive.

---

## 7. Soumettre son projet — 4 min

On revient sur la **copie du projet modèle** (étape 3), qui est complète.

🖱 **Tout le monde :**
1. Sur l'accueil, carte de votre copie : « **Vitrine du projet** », puis « **Enjeux du projet** » dans la barre du haut.
2. Lisez le panneau de gauche « **Où en est votre projet** » : trois paliers, « Orientation possible », « Avis technique possible », « Validation possible ».
3. Repérez les deux boutons :
   - « **Demander un avis préliminaire** » : projet encore en construction, les experts orientent ;
   - « **Demander la validation** » : projet arrêté, avis formel.
4. Lisez la phrase « À l'envoi, ces équipes seront notifiées : … », puis cliquez sur « **Demander la validation** ».

✅ **Point de contrôle :** de retour sur l'accueil, le message « Projet soumis : … a bien été envoyé pour analyse. » s'affiche.

💬 **À dire :** « Pas besoin d'un projet terminé pour consulter la compliance : c'est à ça que sert l'avis préliminaire. Et soumettre ne fige rien. »

> 💡 À montrer seulement si le temps le permet : « Solliciter cette équipe » (ajouter une équipe oubliée) et « Partage du projet » (ajouter un collègue au projet).

> 🆘 **Si « Demander la validation » est grisé** pour un participant : une question obligatoire n'a pas de réponse ferme. Faites-lui cliquer sur « Demander un avis préliminaire » à la place : la suite fonctionne de la même façon.

---

## 8. Répondre à la compliance — 4 min

🖱 **Tout le monde :**
1. Après la soumission, vous êtes revenu sur l'accueil. Sur la carte de votre copie, cliquez sur « **Consulter les enjeux** ».
2. Faites défiler jusqu'à « **Équipes à solliciter** ». Chaque carte d'équipe est repliée et résume son contenu : « N point(s) à préparer · N échange(s) ».
3. Dépliez la carte de l'équipe repérée la veille (annoncez son nom). Lisez les « **Points à préparer** » : ce sont les questions que cette équipe pose systématiquement quand la règle se déclenche.
4. Juste en dessous, l'encadré « **Échange en cours** » indique qu'aucun avis n'a encore été rendu et qu'on peut déjà poser ses questions.
5. Cliquez sur « **Répondre** » et répondez aux points à préparer dans le texte (une ligne par point, par exemple). Puis cliquez sur « **Envoyer la réponse** ».

✅ **Point de contrôle :** la réponse apparaît dans les « Échanges » de la carte de l'équipe.

💬 **À dire :** « N'attendez pas l'expert : les points à préparer vous disent déjà ce qu'il va vous demander. En y répondant tout de suite, vous gagnez un aller-retour. Et l'échange reste attaché au projet et à l'équipe, pas perdu dans un fil de mails. »

💬 **À dire aussi :** « En temps normal, votre réponse part par e-mail à l'équipe. Aujourd'hui, les envois sont coupés pour ne pas déranger les experts. »

> 💡 Quand l'expert aura rendu son avis, il apparaîtra à la place de l'encadré « Échange en cours », avec son statut (« Validé », « Validé sous conditions », « En attente d'informations »…). On répond de la même façon, avec « Répondre ».

> 💡 Un participant dont la carte n'affiche aucun point à préparer peut quand même cliquer sur « Répondre » pour poser une question à l'équipe.

---

## 9. Modifier son projet depuis les enjeux — 3 min

🖱 **Tout le monde** (toujours sur « Enjeux du projet ») :
1. Dans le « Sommaire » de gauche, cliquez sur « **Rappel de vos réponses** ».
2. Trouvez la question repérée la veille (annoncez-la à voix haute) et cliquez sur l'**icône crayon** à droite.
3. Le questionnaire s'ouvre directement sur cette question. Donnez la nouvelle réponse (annoncez-la).
4. Cliquez sur « **Valider et revenir aux enjeux** ».

✅ **Point de contrôle :** tout le monde est revenu sur « Enjeux du projet », et les équipes ou les risques ont changé.

💬 **À dire :** « Un projet soumis reste modifiable par son porteur. Les risques et les équipes se recalculent immédiatement. »

---

## 10. Renvoyer après modification des risques — 3 min

🖱 **Tout le monde :**
1. En haut du panneau de gauche, lisez « **1 réponse modifiée depuis la v1 envoyée le …** ».
2. Cliquez sur « **Envoyer la mise à jour** ».

✅ **Point de contrôle :** le message « Mise à jour envoyée : seules les équipes réellement concernées par vos modifications ont été notifiées. » s'affiche.

💬 **À dire :** « On fait évoluer son projet sans tout relancer : seules les équipes touchées sont prévenues (en temps normal par e-mail ; aujourd'hui les envois sont coupés). En contrepartie, un "Validé" ne couvre que la version validée. Si le projet change, l'expert concerné doit revoir son avis. »

> 💡 Si le message est « Mise à jour enregistrée : aucune de vos modifications ne change le périmètre d'une équipe… », la réponse choisie ne déclenche aucune nouvelle règle. Ce n'est pas une erreur : profitez-en pour expliquer que les équipes non concernées ne sont jamais dérangées.

> 💡 Les champs de texte libre (descriptions, jalons, fichiers) ne déclenchent jamais de notification.

---

## 11. Ajouter une inspiration et la partager — 4 min

🖱 **Tout le monde :**
1. Revenez à l'accueil et cliquez sur l'onglet « **Inspiration** ».
2. Cliquez sur « **Ajouter un projet inspirant** » (ou « Créer un projet inspirant »).
3. Remplissez au moins le titre et une description : un projet vu ailleurs qui vous a plu.
4. Pour la visibilité, choisissez « **Partagé** » plutôt que « Personnel ».
5. Cliquez sur « **Valider** ».

✅ **Point de contrôle :** l'inspiration apparaît dans « Inspirations partagées ».

💬 **À dire :** « En "Partagé", tout le monde la voit : une bonne idée repérée ailleurs profite à tous. »

> ⚠️ **À vérifier** : les champs du formulaire d'inspiration sont paramétrables dans le back-office. Vérifiez lesquels sont obligatoires chez vous.

---

## 12. Trouver de l'aide : le guide interactif — 2 min

🖱 **Tout le monde :**
1. Revenez à l'accueil et cliquez sur « **Guide interactif** » en haut.
2. Le menu propose cinq parcours : « Tour rapide », « Créer un projet », « Valider son projet », « Présenter son projet », « Trouver l'inspiration ». Lancez « **Tour rapide** » et faites deux ou trois étapes avec « Suivant ».
3. Fermez le guide.

💬 **À dire :** « Le guide tourne sur un projet de démonstration : il ne touche à aucun de vos projets. En cas de doute, relancez le parcours qui correspond à ce que vous voulez faire. Le bouton "Partagez votre avis" sert à faire remonter vos remarques sur l'outil. »

---

## Conclusion — 3 min

Projetez ce résumé et laissez la place aux questions.

```
Créer → Vitrine (réfléchir, présenter, post-its) → Enjeux du projet
     → Avis préliminaire ou Validation → Échanges avec les experts
     → Modifier → Envoyer la mise à jour
```

### Réponses aux questions fréquentes

- **« Je dois enregistrer ? »** Non pour le questionnaire, la sauvegarde est continue. Oui pour la vitrine : « Publier ».
- **« Une fois soumis, c'est figé ? »** Non. On modifie, puis « Envoyer la mise à jour ».
- **« Je ne connais pas encore la réponse. »** « J'ai un doute » : cela suffit pour un avis préliminaire, pas pour une validation.
- **« Pourquoi on me pose cette question ? »** « Comprendre cette question », puis « Pourquoi cette question apparaît ».
- **« Mon collègue ne voit pas mon projet. »** Ajoutez-le dans « Partage du projet » (page « Enjeux du projet »).

### Après la séance

Rappelez aux participants que le projet créé à l'étape 6 les attend en brouillon : « Continuer l'édition » sur sa carte.
