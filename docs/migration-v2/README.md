# Migration vers SharePoint — dossier de référence

Stratégie retenue : **API REST SharePoint (`/_api/…`) + Power Automate**.
L'application étant servie depuis l'origine SharePoint (`https://lfb1.sharepoint.com/…`), le
navigateur transmet automatiquement les cookies de session : aucune authentification à
implémenter, **pas de Microsoft Graph, pas de MSAL, pas d'enregistrement Azure AD, pas de
consentement administrateur**.

| Document | Public | Contenu |
|---|---|---|
| [GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md](GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md) | Claude Code | Plan technique en 10 phases : configuration, digest de formulaire, client REST, dépôts de listes, référentiels, notifications, hydratation, documents, tests |
| [PREPARATION-SHAREPOINT-POWERAUTOMATE.md](PREPARATION-SHAREPOINT-POWERAUTOMATE.md) | Antoine | Ce qu'il faut créer côté SharePoint (bibliothèques, 9 listes et leurs colonnes) et côté Power Automate (flux de notifications) |
| [MODE-OPERATOIRE-POWER-AUTOMATE.md](MODE-OPERATOIRE-POWER-AUTOMATE.md) | Antoine | Mode opératoire complet des flux Power Automate : flux de notifications (obligatoire) + 3 flux optionnels, catalogue des 9 messages, recette, exploitation et dépannage |
| [ENVIRONNEMENTS.md](ENVIRONNEMENTS.md) | Les deux | URL des sites et GUID des listes (DEV créé le 28/08/2026 ; PROD à venir). Les GUID ne doivent jamais entrer dans le code. |
| [VERIFICATION-CONFIGURATION-SHAREPOINT.md](VERIFICATION-CONFIGURATION-SHAREPOINT.md) | Antoine | Script à coller dans la console du navigateur pour vérifier que les listes/colonnes attendues existent, et créer automatiquement ce qui manque. |

## Principes structurants

- **Zéro serveur, zéro installation** pour l'utilisateur final ; l'app reste un dossier de
  fichiers statiques dans la bibliothèque `CN-App`, point d'entrée `index.aspx`.
- **Les permissions du site SharePoint font office de contrôle d'accès** : l'app agit avec les
  droits de la personne connectée, ni plus ni moins.
- **L'application n'envoie jamais d'e-mail.** Elle dépose une demande dans la liste
  `CN_NotificationsQueue` ; un flux Power Automate l'envoie et marque l'élément `Sent`.
  Même principe pour tout besoin hors périmètre REST (Teams, planification, droits élevés).
- **Le mode simulé (mocks + localStorage) reste fonctionnel** en `file://` pour le développement :
  `isSharePointMode()` est l'unique aiguillage entre les deux modes.
- **La configuration se publie depuis le back-office** (panneau « Synchronisation SharePoint ») :
  aucun fichier de paramètres à téléverser à la main.

## Documents obsolètes — à ne pas suivre

- `_obsolete/OBSOLETE-guide-migration-graph-msal.md` — stratégie Microsoft Graph + MSAL,
  abandonnée faute de droits Azure AD.
- Tous les fichiers de migration présents à la racine de `docs/` (antérieurs à ce dossier).
