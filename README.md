# Project Navigator

Project Navigator aide les équipes projets et compliance à qualifier rapidement les enjeux
réglementaires d'un projet : questionnaire adaptatif → score de risque en temps réel → synthèse
partageable → back-office compliance → vitrine de présentation du projet. L'interface est en
français ; les identifiants du code sont en anglais.

- **Questionnaire adaptatif** : les questions affichées s'ajustent automatiquement selon les réponses pour ne couvrir que les exigences pertinentes (données personnelles, zone géographique, partenaires, etc.).
- **Évaluation de risque en temps réel** : chaque réponse alimente un scoring global qui met en évidence la criticité du projet et oriente vers les équipes de conformité concernées.
- **Consultation possible dès la conception** : un projet peut demander un avis préliminaire avant d'être finalisé, avec des réponses « je ne sais pas encore » routées vers les bonnes équipes, et rester modifiable après soumission.
- **Vitrine de projet partageable** : une page de présentation éditable directement dans l'application, avec post-its collaboratifs.
- **Back-office compliance** : administration des questions, règles, pondérations de risque et équipes, avec un accès restreint au périmètre propre des contacts d'équipe et membres de comité.

**Sans serveur, sans installation.** L'application est un ensemble de fichiers statiques : elle
s'ouvre soit directement (double-clic sur `index.html`, sans réseau ni `npm`), soit déposée dans
une bibliothèque d'un site SharePoint Online et servie en HTTPS. Les données vivent dans des
listes/bibliothèques SharePoint (mode réel) ou dans des fichiers JSON simulés + le stockage du
navigateur (mode local/développement) ; les notifications passent par Power Automate, jamais par
un envoi direct depuis le code. Détails : [`docs/architecture-sharepoint.md`](docs/architecture-sharepoint.md).

## Documentation

| Document | Public | Contenu |
|---|---|---|
| [`docs/architecture-technique.md`](docs/architecture-technique.md) | Développeurs | Architecture du code, structure des modules, dépendances, build et tests. |
| [`docs/architecture-technique-non-expert.md`](docs/architecture-technique-non-expert.md) | Non-experts | La même architecture technique, en langage courant et avec des analogies. |
| [`docs/guide-non-expert.md`](docs/guide-non-expert.md) | Non-experts (métier, compliance, direction) | Comment utiliser l'outil au quotidien, en langage courant. |
| [`docs/securite-donnees.md`](docs/securite-donnees.md) | Développeurs | Ce que garantit (et ne garantit pas) l'absence de flux de données hors SharePoint/Power Automate/M365. |
| [`docs/securite-donnees-non-expert.md`](docs/securite-donnees-non-expert.md) | Non-experts | La même analyse de sécurité, en langage courant. |
| [`docs/architecture-sharepoint.md`](docs/architecture-sharepoint.md) | Les deux | Listes SharePoint, bibliothèques et flux Power Automate, avec schéma. |
| [`docs/migration-v2/`](docs/migration-v2/README.md) | Développeurs / administrateurs SharePoint | Référentiel opérationnel détaillé : colonnes exactes des listes, configuration pas à pas des flux Power Automate, environnements, procédure de déploiement. |
| [`CLAUDE.md`](CLAUDE.md) | Développeurs (agents IA inclus) | Référence exhaustive des conventions de code, pièges connus et logique métier module par module. |

## Démarrage

Utilisateur final : ouvrez la page de l'application sur le site SharePoint de votre organisation.
L'application est livrée sous forme de **web part SharePoint Framework (SPFx)**, posé sur une page
en mise en page « Application pleine page » ; elle est installée une fois par l'IT via le catalogue
d'applications du tenant (voir [`spfx/README.md`](spfx/README.md)).

## Développement

Le code est écrit en JSX dans `src/` et assemblé par webpack, avec une seule configuration partagée
(`spfx/config/app-webpack-rules.js`) pour deux sorties :

- le **package SPFx** (`spfx/sharepoint/solution/project-navigator.sppkg`), seul livrable ;
- le **harnais de dev** (`index.html` + `harness/dist/`), qui monte la même application hors
  SharePoint avec des données fictives, pour les tests de bout en bout.

> ⚠️ Après toute modification de `src/`, reconstruisez, sinon le navigateur continue d'exécuter
> l'ancien code :
>
> ```bash
> npm install && npm run spfx:install   # une seule fois (Node >=22.14 <23)
> npm run build                         # mocks + CSS + harnais de dev
> npm run spfx:build                    # package SPFx
> ```

Autres commandes utiles :

| Commande | Rôle |
| --- | --- |
| `npm test` | Tests unitaires de la logique métier (questions, règles, risque…). Aucune dépendance. |
| `npm run test:e2e` | Tests de bout en bout Playwright (`e2e/*.spec.js`) sur le harnais de dev (à construire avant avec `npm run build`). Séparé de `npm test`. |
| `npm run lint` | Analyse statique (ESLint) du code. |
| `npm run format` | Mise en forme (Prettier). |
| `npm run build` | Régénère les mocks, le CSS « lite » et le harnais de dev. |
| `npm run spfx:build` | Construit le package SPFx (`.sppkg`). |
| `npm run spfx:start` | Sert le web part pour le workbench hébergé du site DEV. |

### Tests de bout en bout (Playwright)

`npm run test:e2e` lance la suite `e2e/*.spec.js` avec Playwright : elle sert le harnais de dev (construit au préalable par `npm run build`) via un petit serveur statique jetable (`scripts/serve-e2e.js`), puis pilote un vrai navigateur pour vérifier les parcours utilisateurs (questionnaire, synthèse, vitrine, back-office, commentaires compliance…). C'est une suite distincte de `npm test`.

Le bouton cadenas qui ouvre le back-office n'étant visible que pour une personne déjà désignée (administrateur, contact d'équipe ou membre de comité), les tests qui touchent le back-office désignent le compte de test directement dans le stockage local avant le premier rendu plutôt que de saisir le mot de passe partagé — aucune variable d'environnement n'est requise pour ces tests.

```bash
npm run test:e2e
```
