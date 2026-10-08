# Déployer Project Navigator (web part SPFx)

L'application est livrée sous forme d'un **package SharePoint Framework** (`.sppkg`) contenant
un web part unique, « Project Navigator », posé sur une page en mise en page **« Application
pleine page »**. Ce mode remplace le dépôt de fichiers dans la bibliothèque `CN-App`
(`index.aspx`) : il ne dépend plus de l'autorisation « custom script » du site.

Rien ne change côté données : l'app lit et écrit les mêmes listes `CN_*` avec l'API REST
SharePoint et les droits de la personne connectée, et les flux Power Automate restent identiques.

## 1. Construire le package (développeur)

Prérequis : Node `>=22.14 <23`.

```bash
npm install && npm run spfx:install   # une seule fois
npm run build                         # mocks + CSS (+ harnais de dev)
npm run spfx:build                    # → spfx/sharepoint/solution/project-navigator.sppkg
```

Avant chaque livraison, **incrémenter `solution.version`** dans
`spfx/config/package-solution.json` (ex. `1.0.0.0` → `1.0.1.0`) : c'est ce numéro que le
catalogue d'applications affiche et compare.

Le code applicatif et les ressources (scripts, styles, logo) sont **embarqués dans le package**
(`includeClientSideAssets: true`) : aucun fichier n'est à déposer ailleurs.

## 2. Publier dans le catalogue d'applications du tenant (administrateur SharePoint / IT)

1. Ouvrir le catalogue d'applications du tenant, bibliothèque « Applications pour SharePoint ».
2. Y déposer `project-navigator.sppkg`.
3. Dans la boîte de dialogue, cocher l'option qui rend la solution **disponible pour tous les
   sites** puis **Déployer**. Le package déclare `skipFeatureDeployment: true` : aucune
   activation site par site n'est nécessaire.
4. Le package ne demande **aucune permission d'API** (pas de Microsoft Graph, pas d'Azure AD) :
   il n'y a rien à approuver dans « Accès à l'API ».

**Mise à jour** : déposer le nouveau `.sppkg` (version incrémentée) au même endroit et le
redéployer. Les pages qui contiennent déjà le web part utilisent la nouvelle version sans autre
action. Une fenêtre de navigateur déjà ouverte garde l'ancienne version jusqu'au rechargement.

## 3. Créer la page de l'application (propriétaire du site)

Sur chaque site (DEV, puis PROD) :

1. Créer une page en mise en page **« Application pleine page »** et y choisir le web part
   **Project Navigator**. Le libellé exact du menu de création peut varier selon la version de
   SharePoint Online ; en PnP PowerShell, la mise en page correspondante est
   `SingleWebPartAppPage`.
2. Publier la page.
3. Noter son URL dans [`ENVIRONNEMENTS.md`](ENVIRONNEMENTS.md) : c'est désormais le point
   d'entrée à communiquer aux utilisateurs.

## 4. Recette après déploiement

- [ ] La page s'ouvre sans fenêtre de connexion, avec votre vrai nom dans l'app.
- [ ] Les projets existants (liste `CN_Projects`) apparaissent ; une modification est bien
      enregistrée (recharger la page pour vérifier).
- [ ] La langue de l'app est celle de votre profil SharePoint (si vous n'en avez pas choisi une
      autre dans l'app).
- [ ] Le bandeau et la navigation du site gardent leur apparence habituelle.
- [ ] Dans une page longue (back-office, enjeux du projet), changer d'écran ramène bien en haut ;
      la visite guidée fait défiler jusqu'aux éléments qu'elle montre.
- [ ] « Mentions légales » (pied de page) et « Aide » (visite guidée) s'ouvrent dans l'app.
- [ ] Naviguer vers une autre page du site puis revenir : l'app redémarre normalement, et une
      session « Voir en tant que » ne persiste pas.

## 5. Après la bascule

- L'ancienne page `…/CN-App/index.aspx` n'est plus mise à jour : la remplacer par un lien vers la
  nouvelle page, puis retirer les fichiers de l'app de la bibliothèque `CN-App`.
- La **bibliothèque** `CN-App` elle-même est encore attendue par le diagnostic d'installation du
  back-office (`sharepointConfig.libraries`) ; la supprimer demande d'abord de retirer cette
  attente du code.

## Pour tester sans déployer

`npm run spfx:start` sert le web part en local ; il se teste dans le **workbench hébergé** du
site DEV (`…/sites/ProjectNavigator_DEV/_layouts/workbench.aspx`, voir
`spfx/config/serve.json`). Le premier lancement demande de faire confiance au certificat de
développement local.
