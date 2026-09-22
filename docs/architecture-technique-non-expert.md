# Architecture technique — version non-experts

> Public : non-développeurs (métier, compliance, direction) qui veulent comprendre **comment
> l'application est construite**, pas seulement ce qu'elle fait. C'est la version accessible de
> [`architecture-technique.md`](architecture-technique.md) : même contenu de fond, mêmes sections,
> mais en langage courant et avec des analogies. Pour « comment j'utilise l'outil au quotidien »,
> voir plutôt [`guide-non-expert.md`](guide-non-expert.md). Pour « où vont mes données », voir
> [`securite-donnees-non-expert.md`](securite-donnees-non-expert.md).

## 1. Ce que fait l'application

Project Navigator fait remplir un questionnaire à la personne qui porte un projet, calcule un
niveau de risque réglementaire au fil des réponses, produit une page de synthèse partageable, et
permet aux équipes de conformité de donner leur avis directement dans l'outil. Un espace
d'administration (le « back-office ») permet de faire évoluer les questions et les règles sans
toucher au code.

## 2. La contrainte de départ : pas d'installation, pas de serveur à faire tourner

Beaucoup d'applications ont besoin d'un serveur informatique allumé quelque part, avec une équipe
qui le maintient. Ce n'est pas le cas ici : Project Navigator doit pouvoir s'ouvrir de deux façons,
et ne doit avoir besoin d'aucune des deux d'un serveur applicatif dédié :

- en double-cliquant simplement sur un fichier `index.html`, sur votre poste, sans rien installer ;
- ou déposé dans un espace SharePoint de votre organisation, et ouvert comme une page web normale.

Cette contrainte façonne tout le reste : l'application ne peut compter ni sur un serveur qui
préparerait les pages à l'avance, ni sur une connexion Internet vers des services extérieurs pour
fonctionner. Tout se passe dans le navigateur de la personne qui l'utilise.

## 3. Comment le code est « livré » au navigateur

Les personnes qui écrivent le code de Project Navigator le font dans un langage de programmation
moderne (React/JSX), plus lisible et plus facile à faire évoluer pour elles. Mais un navigateur ne
sait pas lire directement ce langage tel quel — il faut le « traduire » d'abord dans une forme plus
basique qu'il comprend.

Habituellement, cette traduction se fait sur un serveur, à la volée, à chaque visite. Ici, comme il
n'y a pas de serveur, la traduction est faite **une fois, à l'avance**, par les développeurs, avant
de livrer l'application — un peu comme un plat préparé à l'avance plutôt que cuisiné sur commande.
Le résultat de cette traduction est stocké dans deux gros fichiers (« le manifeste ») que le
navigateur charge et exécute directement, sans aucune étape de traduction à faire lui-même.

**Ce que ça implique concrètement** : si un développeur modifie le code source mais oublie de
relancer cette étape de « traduction préalable », le navigateur continue d'afficher l'ancienne
version — même si le code source, lui, a bien changé. C'est le piège n°1 pour quiconque touche au
code de ce projet.

**Une subtilité propre à SharePoint** : Microsoft retire automatiquement, au bout de 24 heures,
l'autorisation de remplacer certains types de fichiers (dont ceux qui contiennent du code) dans une
bibliothèque SharePoint, pour des raisons de sécurité. Pour continuer à publier des mises à jour
sans redemander cette autorisation à chaque fois, l'équipe technique fait aussi voyager ce même code
« traduit » sous forme de simples fichiers texte (`.txt`), qui eux restent remplaçables — et
l'application les récupère au démarrage pour se mettre à jour toute seule. C'est une astuce
technique, sans conséquence pour l'utilisation quotidienne de l'outil.

## 4. Les grandes familles de fichiers

Le code est rangé par grandes catégories, un peu comme des tiroirs différents dans un meuble de
classement :

| Catégorie | Ce qu'elle contient, en clair |
|---|---|
| Le « chef d'orchestre » (`App.jsx`) | Un très gros fichier central qui connaît l'état de toute l'application (le projet en cours, qui est connecté, etc.) et distribue l'information à tous les écrans. |
| Les écrans (`components/`) | Chaque page que vous voyez : l'accueil, le questionnaire, la synthèse, le back-office, la vitrine de projet… |
| La logique métier (`utils/`) | Les « règles du jeu » qui ne s'affichent pas à l'écran : comment calculer un risque, comment vérifier une réponse, comment parler à SharePoint. |
| Les données de référence (`data/`) | La liste par défaut des questions, des règles, des équipes, des thèmes visuels — modifiable ensuite depuis le back-office. |
| Les traductions (`i18n/`) | Les textes de l'interface en français, anglais, allemand et espagnol. |
| Les réglages SharePoint (`config/`) | Le seul endroit du code qui décide « suis-je branché sur de vraies données SharePoint, ou sur des données de test ? ». |

## 5. Comment l'application se souvient de ce que vous faites

Chaque modification (une réponse au questionnaire, un commentaire…) est enregistrée automatiquement
au fur et à mesure, un peu comme un traitement de texte qui sauvegarde tout seul votre brouillon —
vous n'avez jamais besoin de cliquer sur un bouton « Enregistrer ». Cette sauvegarde se fait à deux
niveaux :

- **Un brouillon local, dans votre navigateur**, pour que rien ne se perde même en cas de coupure
  réseau, et pour que la page s'affiche instantanément à la réouverture sans attendre une réponse
  du serveur.
- **La vraie donnée, dans SharePoint**, dès que la connexion le permet — c'est elle qui est
  partagée avec les autres utilisateurs.

## 6. Deux sources de données, un seul interrupteur

L'application sait fonctionner avec deux « sources » de données différentes, et elle choisit
automatiquement laquelle utiliser selon l'endroit où elle est ouverte :

- **Sur un site SharePoint réel** (adresse en `https://…sharepoint.com/…`) : elle lit et écrit
  réellement dans les listes et bibliothèques SharePoint de votre organisation.
- **Partout ailleurs** (fichier ouvert directement, poste de développement, tests automatiques) :
  elle utilise des données factices, stockées localement, pour ne dépendre de rien d'extérieur.

Un seul petit morceau de code décide de cet aiguillage ; tout le reste de l'application se comporte
de la même façon dans les deux cas, ce qui évite d'avoir à écrire — et à maintenir — deux versions
différentes de l'outil.

## 7. Les notifications : jamais envoyées directement par l'application

Aucune partie du code de Project Navigator n'envoie elle-même un e-mail. Ce n'est pas un choix de
confort, c'est une impossibilité technique imposée par les règles de sécurité de votre
organisation. Concrètement : l'application dépose une demande dans une liste SharePoint dédiée, un
peu comme déposer une lettre dans une boîte de courrier sortant, et c'est un automate Microsoft
(Power Automate) — extérieur au code de l'application — qui vient la relever et l'envoie réellement.
Détail complet, avec schéma : [`architecture-sharepoint.md`](architecture-sharepoint.md).

## 8. Le cœur du métier : le calcul du niveau de risque

C'est la partie la plus sensible du code, parce qu'une erreur ici change directement le conseil
donné à un porteur de projet. Elle fonctionne comme une grande calculette à conditions : chaque
réponse est comparée à des critères (« ce projet traite-t-il des données personnelles ? »,
« implique-t-il un pays hors Union européenne ? »…), et chaque critère rempli ajoute des équipes à
consulter et des points à un score de risque global. C'est aussi ce qui décide, question par
question, si elle doit s'afficher ou rester masquée selon vos réponses précédentes.

Parce que c'est la partie la plus critique, c'est aussi celle qui est la plus testée
automatiquement (voir §9) avant toute mise en service d'une modification.

## 9. Comment on vérifie que rien n'est cassé

Avant de considérer qu'une modification du code est prête, les développeurs font tourner deux
familles de vérifications automatiques :

- **Des contrôles rapides de la logique métier** (environ 400 vérifications, réparties dans une
  cinquantaine de fichiers) : ils rejouent des cas connus du calcul de risque et des questions, et
  s'assurent que le résultat ne change pas de façon inattendue. Ils s'exécutent en quelques
  secondes, sans avoir besoin d'un navigateur.
- **Des parcours complets dans un vrai navigateur** (25 scénarios) : remplir un questionnaire,
  ouvrir le back-office, poster un commentaire de conformité… Plus longs, mais ils vérifient que
  l'expérience réelle, à l'écran, fonctionne de bout en bout.

## 10. Comment une mise à jour est publiée

Publier une nouvelle version ne consiste jamais à « réinstaller l'application » : il s'agit de
remplacer les quelques fichiers concernés (le code déjà « traduit », voir §3) dans la bibliothèque
SharePoint où l'application est déposée. Les données des projets, elles, vivent ailleurs (dans les
listes SharePoint) et ne sont jamais touchées par une mise à jour de l'application.

## 11. Ce dont l'application dépend

Project Navigator ne télécharge et n'installe **rien** depuis Internet pour fonctionner au
quotidien : les briques logicielles dont elle a besoin (la bibliothèque qui gère l'affichage de
l'interface, notamment) sont livrées avec l'application elle-même, une fois pour toutes, plutôt que
récupérées à chaque usage. Les seuls outils informatiques externes utilisés sont ceux des
développeurs, pendant qu'ils écrivent le code — jamais sur le poste ou dans le navigateur de la
personne qui utilise l'outil au final.

## 12. Ce qui n'a pas pu être vérifié en lisant le code

- L'avancement réel des vérifications finales sur l'environnement SharePoint de test.
- L'existence, à ce jour, d'un site SharePoint de **production** distinct de celui utilisé pour le
  développement (les notes techniques mentionnent un site de production encore « à créer »).
- La mise en route effective, sur l'environnement réel, de chacun des automates de notification
  décrits en [`architecture-sharepoint.md`](architecture-sharepoint.md) — le code ne peut attester
  que du mécanisme utilisé, pas de la configuration réellement activée côté Microsoft 365.

Ces trois points relèvent de l'exploitation de l'outil, pas du code : à faire confirmer auprès de
l'équipe projet plutôt que déduits ici.
