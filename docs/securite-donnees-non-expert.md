# Sécurité des données — version non-experts

> Public : non-développeurs (métier, compliance, direction) qui veulent comprendre ce que garantit
> l'architecture de Project Navigator en matière de sécurité, sans avoir à lire le code. C'est la
> version accessible de [`securite-donnees.md`](securite-donnees.md) : même raisonnement, même
> plan (Contexte → Constat → Garanties → Limites), en langage courant. Pour « comment ça marche »
> en général, voir [`guide-non-expert.md`](guide-non-expert.md) et
> [`architecture-technique-non-expert.md`](architecture-technique-non-expert.md).

## Contexte

Project Navigator fait remplir aux porteurs de projet un questionnaire qui peut contenir des
informations sensibles (données personnelles concernées par un projet, zone géographique,
partenaires impliqués…), puis route ces informations vers des équipes de conformité pour avis. Les
adresses e-mail des personnes qui utilisent l'outil, les réponses au questionnaire, les commentaires
échangés et les pièces jointes sont donc des données qui méritent d'être protégées.

La question posée dans ce document est simple : **où vont ces données, et sortent-elles de
l'environnement Microsoft 365 de l'organisation ?**

## Constat — ce qu'on observe réellement dans l'application

Project Navigator n'a **pas de serveur informatique à elle** quelque part sur Internet qui
stockerait vos données : c'est une page qui s'exécute entièrement dans votre navigateur, et qui
lit/écrit directement dans SharePoint — l'outil de partage de documents et de listes que votre
organisation utilise déjà. Concrètement, en examinant en détail le fonctionnement de
l'application :

1. **Elle n'installe et ne charge aucun outil venu d'ailleurs pour fonctionner.** Les briques
   logicielles dont elle a besoin sont livrées une fois pour toutes avec l'application elle-même,
   pas récupérées à chaque usage depuis un service extérieur.
2. **Elle ne parle qu'à un seul interlocuteur : le site SharePoint sur lequel elle est ouverte.**
   Il n'existe, dans tout le code, qu'un seul endroit qui communique avec l'extérieur — et il ne
   s'adresse jamais qu'à l'adresse du site SharePoint courant, jamais à un service tiers codé en
   dur.
3. **Elle n'utilise aucun outil de mesure d'audience ou de suivi** (les outils du type « Google
   Analytics » ou équivalents, qui renverraient des informations sur l'usage de l'application vers
   un service extérieur) : rien de ce type n'a été trouvé dans le code.
4. **Elle n'envoie jamais elle-même d'e-mail.** Ce n'est pas un choix, c'est une impossibilité
   technique voulue par la politique de sécurité de votre organisation. Quand une notification doit
   partir, l'application dépose simplement une demande dans une liste SharePoint dédiée — comme une
   lettre déposée dans une boîte de courrier sortant — et c'est un automate Microsoft (Power
   Automate), qui reste entièrement à l'intérieur de votre environnement Microsoft 365, qui vient
   la relever et l'envoyer réellement.
5. **Un seul lien vers l'extérieur existe dans toute l'application**, et c'est un lien vers un
   formulaire de retour d'expérience Microsoft, que l'utilisateur doit cliquer lui-même pour
   l'ouvrir dans un nouvel onglet — ce n'est jamais l'application qui y envoie quoi que ce soit
   automatiquement.
6. **Le texte saisi dans les commentaires est filtré avant d'être réaffiché**, pour empêcher qu'un
   texte malveillant collé dans un champ ne puisse exécuter du code dans le navigateur d'une autre
   personne qui le lirait ensuite.
7. **Il n'existe pas de compte ou de mot de passe propre à l'application.** Elle reconnaît qui vous
   êtes via votre session SharePoint déjà ouverte — il n'y a rien d'autre à retenir, ni de second
   système de comptes à gérer en parallèle.
8. **La fonction qui permet à un administrateur de « voir l'application comme si il était quelqu'un
   d'autre » (pour vérifier les droits d'accès) ne peut rien enregistrer** : toutes les actions
   d'écriture sont désactivées pendant cette simulation.

## Garanties apportées par l'absence de flux de données vers l'extérieur

- **Aucun fournisseur extérieur à surveiller.** Comme l'application ne s'appuie sur aucun service
  tiers (pas de mesure d'audience, pas d'outil externe, pas de serveur propre), il n'existe pas de
  maillon supplémentaire, en dehors de Microsoft 365, dont la compromission exposerait vos données.
- **Vos données restent dans un environnement déjà connu et encadré par votre organisation.** Elles
  ne quittent jamais SharePoint Online : pas de copie vers un autre système dont les garanties
  (sécurité, localisation, conformité) seraient différentes ou moins bien connues.
- **Un seul endroit à administrer pour les droits d'accès : les permissions du site SharePoint.**
  Il n'existe pas de second système de comptes propre à l'application qui pourrait, avec le temps,
  finir par ne plus correspondre à qui a réellement le droit de voir quoi. Retirer quelqu'un du
  site SharePoint lui retire, dans le même mouvement, l'accès à l'application.
- **Pas de mot de passe ni de clé secrète d'application à protéger.** Cette catégorie de risque
  (une clé technique qui « fuite » et donne un accès non autorisé) n'existe simplement pas ici.
- **Un journal de ce qui a été envoyé, sans outil supplémentaire à mettre en place.** Chaque
  notification et chaque écriture porte la trace de qui l'a faite et quand — ce suivi existe déjà,
  sans rien à construire à part.

## Limites de cette garantie

- **Les permissions du site SharePoint pilotent tout — y compris leurs erreurs.** Si le site est
  partagé trop largement (« toute l'organisation », par exemple), l'accès aux données de
  l'application sera tout aussi large. Ce n'est pas un défaut de l'application : c'est une question
  de configuration qui relève entièrement de l'administration du site SharePoint.
- **Les comptes qui font tourner les automates Power Automate ont, pour certains, des droits
  élevés** (par exemple celui qui ajoute automatiquement une personne comme membre du site). Ces
  comptes méritent une attention particulière — s'ils sont mal protégés, ils constituent un point
  sensible, même si cela reste entièrement interne à Microsoft 365.
- **Un e-mail envoyé reste un e-mail.** Une fois qu'une notification a été envoyée à son
  destinataire, celui-ci peut la transférer ou l'imprimer — comme pour n'importe quel e-mail. Ce
  n'est pas propre à Project Navigator.
- **Un lien de partage de la « vitrine » d'un projet reste un lien.** Le lien est conçu pour
  décourager qu'on le modifie afin d'en voir plus que prévu, mais ce n'est pas un coffre-fort :
  toute personne qui obtient ce lien — et qui a par ailleurs les droits nécessaires sur le site
  SharePoint pour ouvrir l'application — peut consulter ce que ce lien donne à voir.
- **La sauvegarde et la conservation dans le temps des données dépendent de réglages SharePoint**
  (activer ou non l'historique des versions, par exemple), pas d'un mécanisme propre à
  l'application — à vérifier auprès de l'administration SharePoint plutôt que supposé ici.
