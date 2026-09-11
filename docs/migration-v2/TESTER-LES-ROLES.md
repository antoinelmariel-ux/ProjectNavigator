# Tester les différents rôles depuis un compte administrateur

Sur SharePoint, l'identité vient de la session du navigateur (`/_api/web/currentUser`) : impossible
d'en changer sans se reconnecter. Le rôle, lui, se déduit de données applicatives (liste des
administrateurs, contacts d'équipe, membres de comité, membres de projet, périmètre d'activité).
La fonction « Voir en tant que » rejoue cette déduction avec l'identité de votre choix.

## Comment l'utiliser

1. Ouvrez le back-office, onglet **Administrateurs**.
2. Dans la carte **Voir en tant que**, cherchez la personne à simuler.
3. Cliquez sur **Ouvrir dans un nouvel onglet**.

L'application s'ouvre dans un second onglet avec un bandeau violet permanent et le préfixe
`[Simulation]` dans le titre de l'onglet. Votre onglet d'origine garde votre identité, votre
back-office ouvert et vos saisies en cours. Pour revenir, cliquez sur **Quitter la simulation**
ou fermez simplement l'onglet.

## Ce que vous pouvez vérifier

- Les projets visibles sur l'accueil pour cette personne.
- Les onglets du back-office auxquels elle accède (vue restreinte d'un contact d'équipe ou d'un
  membre de comité de validation).
- Le filtrage des règles et des équipes dans cette vue restreinte.
- L'adaptation du questionnaire à son périmètre d'activité.
- La visibilité des commentaires de conformité et des vitrines de projet.

## Ce que la simulation ne fait pas

- **Aucune écriture.** Rien n'est enregistré, ni dans SharePoint, ni sur votre ordinateur. Les
  actions d'enregistrement échouent volontairement, y compris l'envoi de mails par Power Automate.
  Un écran d'onboarding n'est jamais proposé dans un onglet de simulation.
- **Aucun changement de droits SharePoint.** Les appels partent toujours avec votre session : la
  simulation reproduit la logique de l'application, pas les autorisations du site. Pour vérifier
  aussi les droits d'accès aux listes, utilisez un vrai compte de test sur le site DEV.
- **Aucun accès nouveau.** Le paramètre `?viewAs=` est ignoré si la session réelle n'est pas
  administratrice, et un lien copié ne donne donc rien à quelqu'un d'autre.
