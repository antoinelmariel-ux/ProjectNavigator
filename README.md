# Project Navigator — Principales fonctionnalités

Project Navigator aide les équipes projets et compliance à qualifier rapidement les enjeux réglementaires. Voici les fonctionnalités clés offertes par l'outil :

- **Questionnaire adaptatif** : les questions affichées s'ajustent automatiquement selon les réponses pour ne couvrir que les exigences pertinentes (données personnelles, zone géographique, partenaires, etc.).
- **Évaluation de risque en temps réel** : chaque réponse alimente un scoring global qui met en évidence la criticité du projet et recommande des actions prioritaires.
- **Synthèse projet prête à partager** : un rapport récapitulatif est généré automatiquement avec les risques identifiés, les actions à engager et les équipes concernées.
- **Espace Back-Office Compliance** : les experts peuvent administrer le référentiel (questions, règles, pondérations) et consulter l'historique des projets déposés.
- **Export et suivi des dossiers** : les projets validés sont conservés dans SharePoint (liste `CN_Projects`) pour faciliter le partage, les audits et les analyses ultérieures.

 Pour démarrer, ouvrez `index.html` dans votre navigateur : l'application est entièrement autonome, ne nécessite aucune installation supplémentaire et peut désormais fonctionner en local sans serveur HTTP.

- **Source de vérité mocks SharePoint** : les données `mock-sharepoint-lists/*.json` sont la référence migration; les modules `src/data/mockSharePoint*.js` sont auto-générés pour le runtime local (mode fichier). Utiliser `node scripts/sync-mock-sharepoint-data.js` après modification des JSON.
- **Stockage flexible des inspirations** : comme les projets (`AnswersJson`), les inspirations sont désormais portées par une colonne JSON (`InspirationJson`) afin de limiter le nombre de colonnes SharePoint et de faciliter l’évolution du schéma.

## Développement

Le code est écrit en JSX dans `src/`, mais **le navigateur exécute une version pré-transpilée** (plus de Babel chargé à l'exécution, plus de 2,9 Mo). Cette version pré-transpilée vit dans `src/module-manifest.js`, généré hors-ligne.

> ⚠️ **Après toute modification d'un fichier de `src/`, régénérez le manifest**, sinon le navigateur continuera d'exécuter l'ancien code :
>
> ```bash
> npm install          # une seule fois (outils de développement)
> npm run build        # régénère mocks + CSS + manifest
> # ou, plus ciblé :
> npm run generate:manifest
> ```

Autres commandes utiles :

| Commande | Rôle |
| --- | --- |
| `npm test` | Tests unitaires de la logique métier (questions, règles, risque…). Aucune dépendance. |
| `npm run test:e2e` | Tests de bout en bout Playwright (`e2e/*.spec.js`) : construit l'app, la sert en local, puis parcourt les écrans dans un vrai navigateur. Séparé de `npm test`. |
| `npm run lint` | Analyse statique (ESLint) du code. |
| `npm run format` | Mise en forme (Prettier). |
| `npm run build` | Régénère les mocks, le CSS « lite » et le manifest transpilé. |

L'ouverture de `index.html` reste **zéro-install** pour l'utilisateur final (aucun serveur ni npm requis côté utilisateur) : `npm` ne sert qu'au développement.

### Tests de bout en bout (Playwright)

`npm run test:e2e` lance la suite `e2e/*.spec.js` avec Playwright : elle reconstruit l'application, la sert via un petit serveur statique jetable (`scripts/serve-e2e.js`), puis pilote un vrai navigateur pour vérifier les parcours utilisateurs (questionnaire, synthèse, vitrine, back-office, commentaires compliance…). C'est une suite distincte de `npm test`.

Les tests qui touchent le back-office nécessitent le mot de passe administrateur, jamais committé : ils se désactivent automatiquement en son absence.

```bash
E2E_ADMIN_PASSWORD='...' npm run test:e2e
```
