# Project Navigator — solution SPFx

Solution SharePoint Framework (SPFx 1.23.2, React 17, chaîne de build Heft) qui hébergera
Project Navigator dans un web part unique, posé sur une page moderne en mise en page
« Application pleine page ». Elle remplace à terme le dépôt de `index.html` dans la
bibliothèque `CN-App`, qui dépend de l'autorisation « custom script » du site.

**État : phase 3.** Le web part monte l'application complète (`../src/main.jsx`, via l'alias
webpack `project-navigator-app`) et lui transmet son `pageContext` : URL du site (base des appels
`/_api`), utilisateur (repli si `/_api/web/currentUser` échoue) et culture (langue par défaut tant
que l'utilisateur n'en a pas choisi une dans l'app).

## Comment `../src` est compilé

`config/app-webpack-rules.js` décrit la transformation du code applicatif (Babel JSX, CSS importés
en texte, images en assets). Elle est appliquée au bundle SPFx par `config/spfx-customize-webpack.js`
et au harnais de dev par `scripts/build-harness.js` (`npm run build:harness`, sortie
`../harness/dist/`, servi par `../index.html`), pour que les tests e2e exercent le même code que le
`.sppkg`.

## Pourquoi un sous-dossier

La racine du dépôt est en `"type": "module"` (tests `node --test`, scripts de dev) alors que
la chaîne SPFx attend du CommonJS. La solution a donc son propre `package.json` et ses
propres `node_modules` ; elle importera le code applicatif depuis `../src`.

## Commandes

Node `>=22.14 <23` requis.

```bash
npm run spfx:install   # depuis la racine : npm install dans spfx/
npm run spfx:build     # build de production + spfx/sharepoint/solution/project-navigator.sppkg
npm run spfx:start     # sert le bundle en local pour le workbench hébergé
```

Le workbench hébergé est configuré sur le site DEV
(`https://entreprisedemo1.sharepoint.com/sites/ProjectNavigator_DEV/_layouts/workbench.aspx`,
voir `config/serve.json`).

## Déploiement (résumé)

1. `npm run spfx:build`
2. Déposer `spfx/sharepoint/solution/project-navigator.sppkg` dans le catalogue
   d'applications du tenant et le déployer (`skipFeatureDeployment: true` : disponible sur
   tous les sites sans activation par site).
3. Sur le site, créer une page en mise en page « Application pleine page » et choisir le web
   part « Project Navigator ».

Chaque livraison doit incrémenter `solution.version` dans `config/package-solution.json`.
