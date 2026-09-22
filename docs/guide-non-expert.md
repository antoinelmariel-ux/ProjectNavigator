# Guide non-experts

> Public : toute personne qui utilise ou pilote Project Navigator sans être développeuse —
> équipes projet, compliance, direction. Ce document explique la même réalité que
> [`architecture-technique.md`](architecture-technique.md), en langage courant. Pour la question
> spécifique « où vont mes données et est-ce sûr ? », voir
> [`securite-donnees.md`](securite-donnees.md).

## En bref, c'est quoi ?

Project Navigator est un outil qui aide une personne qui porte un projet à comprendre, dès le
départ, les questions réglementaires que ce projet va poser (données personnelles, zone
géographique, partenaires impliqués…), puis à obtenir l'avis des bonnes équipes de conformité sans
avoir à savoir elle-même qui contacter.

Concrètement, il tient en trois idées :

1. **Un questionnaire qui s'adapte à vos réponses.** Vous ne voyez que les questions pertinentes
   pour votre projet — répondre « non » à une question sur les données personnelles fait
   disparaître les questions qui n'en dépendaient que parce qu'elle aurait pu être « oui ».
2. **Un niveau de risque calculé automatiquement**, qui se met à jour à chaque réponse, et qui
   indique les équipes à consulter.
3. **Une vitrine et une synthèse** du projet, que vous pouvez partager, et sur lesquelles les
   équipes concernées déposent leur avis directement.

## Comment ça marche, du point de vue d'un porteur de projet

- Vous créez un projet et répondez au questionnaire. Rien ne se perd : votre brouillon est
  enregistré automatiquement au fil de l'eau.
- Vous pouvez consulter les équipes de conformité **avant même d'avoir fini** de répondre — en
  indiquant que vous n'êtes pas encore certain d'une réponse (« je ne sais pas encore »), ou en
  posant directement une question depuis le questionnaire à l'équipe concernée.
- Une fois le questionnaire terminé, l'outil vous amène d'abord sur la **vitrine** de votre projet
  (une page de présentation, pas le rapport de conformité) : l'idée est de vous faire réfléchir à
  votre projet, pas seulement de vous faire remplir une case. Vous accédez au rapport de synthèse
  (« Enjeux du projet ») depuis un bouton de cette vitrine.
- Vous pouvez soumettre votre projet pour un **avis préliminaire** (léger, adapté au stade où vous
  en êtes) ou pour une **validation complète** — deux façons de solliciter les mêmes équipes,
  adaptées à l'avancement réel de votre projet.
- Votre projet reste modifiable après la soumission. Si vous le mettez à jour, seules les équipes
  réellement concernées par le changement sont re-sollicitées — pas tout le monde à chaque fois.

## Comment ça marche, du point de vue d'une équipe de conformité

- Vous recevez un e-mail quand un projet vous concerne, avec un lien direct vers le rapport de
  synthèse du projet.
- Vous y déposez votre avis (statut, commentaire) directement dans l'outil, dans un fil d'échange
  avec le porteur du projet.
- Si plusieurs personnes de votre équipe peuvent être sollicitées, l'une d'elles peut « prendre en
  charge » un dossier : les autres ne sont alors plus notifiés pour ce projet, et une relance vous
  est envoyée si le dossier reste sans nouvelle action trop longtemps.
- Un back-office vous permet d'administrer les questions, les règles de risque et la liste des
  équipes — avec un accès limité à votre propre périmètre si vous n'êtes pas administrateur.

## Où vivent les données ?

Imaginez un grand classeur partagé, avec un onglet par catégorie d'information (les projets, les
commentaires, les pièces jointes…). Ce classeur, c'est **SharePoint**, l'outil de partage de
documents et de listes de Microsoft 365 que votre organisation utilise déjà pour d'autres besoins.

Project Navigator n'a **pas de serveur informatique séparé** qui stockerait vos données ailleurs :
c'est une page qui s'ouvre dans votre navigateur, hébergée elle-même dans ce même classeur
SharePoint, et qui lit/écrit directement dans les autres onglets de ce classeur. Les pièces
jointes (documents, images) sont rangées dans des dossiers du même site.

Autrement dit : **si vous avez accès au site SharePoint de l'application, vous avez ce qu'il faut
pour l'utiliser ; si vous n'y avez pas accès, l'application ne vous donne rien de plus.** Les
autorisations, ce sont celles, déjà connues, du site SharePoint — pas un système à part à retenir.

Le détail (quels dossiers, quelles listes) est dans
[`architecture-sharepoint.md`](architecture-sharepoint.md), avec un schéma.

## Comment les notifications sont-elles envoyées ?

L'application elle-même **n'envoie jamais d'e-mail** : c'est une contrainte technique du système
d'information de l'organisation (l'envoi direct d'e-mail par une application web sans serveur est
bloqué par la politique de sécurité). À la place, quand une notification doit partir, l'application
dépose une demande dans une liste dédiée — un peu comme déposer une lettre dans une boîte de
courrier sortant — et un automate Microsoft (**Power Automate**) vient la relever, l'envoie, puis
coche la case « envoyé ». Cet automate reste entièrement à l'intérieur des outils Microsoft 365 de
votre organisation.

## Qui peut voir quoi ?

Tout repose sur les autorisations déjà en place sur le site SharePoint de l'application :

- Être **membre** du site suffit pour utiliser l'application avec les droits d'un utilisateur
  standard (créer et suivre ses propres projets).
- Être désigné **administrateur**, **contact d'une équipe de conformité** ou **membre d'un comité
  de validation** donne accès à tout ou partie du back-office, selon le rôle.
- Retirer une personne des membres du site lui retire, dans le même mouvement, l'accès à
  l'application — il n'y a pas de second système de comptes à gérer séparément.

Le document [`securite-donnees.md`](securite-donnees.md) détaille ce que cela garantit
concrètement, et les limites à connaître (une autorisation SharePoint trop large donne un accès
tout aussi large à l'application, par exemple).

## Pour aller plus loin

| Besoin | Document |
|---|---|
| Vue d'ensemble et démarrage | [`/README.md`](../README.md) |
| Comment le code est construit, en langage courant | [`architecture-technique-non-expert.md`](architecture-technique-non-expert.md) |
| Comment le code est construit, version développeurs | [`architecture-technique.md`](architecture-technique.md) |
| Les listes SharePoint et les automates Power Automate, en détail | [`architecture-sharepoint.md`](architecture-sharepoint.md) |
| Ce que garantit (et ne garantit pas) l'absence de flux externes | [`securite-donnees.md`](securite-donnees.md) |
| Mentions légales et données personnelles | [`/mentions-legales.html`](../mentions-legales.html) (ouvert depuis l'application) |
