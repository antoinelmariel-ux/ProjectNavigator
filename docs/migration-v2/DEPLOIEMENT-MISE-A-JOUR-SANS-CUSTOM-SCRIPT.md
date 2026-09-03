# Mettre à jour Project Navigator sur SharePoint sans réautorisation « custom script »

## Le problème

Pour que l'app tourne sur un site SharePoint, l'IT doit y autoriser les scripts personnalisés
(`DenyAddAndCustomizePages = 0`). Microsoft remet ce réglage à sa valeur par défaut au bout de
24 h. Une fois retombé, les fichiers porteurs de script (`.js`, `.html`) ne sont plus
remplaçables dans la bibliothèque : publier une mise à jour redemande une intervention IT.

Or **tout le code applicatif** de Project Navigator vit dans deux fichiers `.js`
(`src/module-manifest.js` et `src/module-manifest.deferred.js`, ~2,9 Mo à eux deux) : même un
changement de libellé bute sur le verrou.

## Le principe

Le déploiement est coupé en deux couches.

| Couche | Contenu | Fréquence | Extension |
| --- | --- | --- | --- |
| **Figée** | `index.html`, `src/module-loader.js`, React vendoré, feuilles CSS écrites à la main, et les deux manifests `.js` qui servent de repli | une seule fois, pendant la fenêtre de 24 h | `.html`, `.js`, `.css` |
| **Vivante** | les trois payloads `module-manifest.*.txt` | à chaque mise à jour | `.txt` |

`src/module-loader.js` n'exécute pas des fichiers `.js` : il lit une **chaîne de caractères** et
l'évalue via `new Function`. Le code applicatif est donc déjà de la donnée, pas un script au sens
SharePoint. Il suffit de le faire voyager comme tel.

Sous `http(s)`, `index.html` télécharge les trois `.txt` avant de démarrer et remplace le
manifeste embarqué par leur contenu. Sous `file://` (usage local, double-clic) rien ne change :
l'app démarre directement sur les manifests `.js`, comme avant.

## Les trois fichiers de mise à jour

Produits par `npm run build` (ou `npm run generate:manifest`) :

| Fichier | Rôle |
| --- | --- |
| `src/module-manifest.core.txt` | modules du premier rendu **+ la feuille `tailwind-internal.css`** |
| `src/module-manifest.deferred.txt` | back-office, vitrine, synthèse |
| `src/module-manifest.version.txt` | l'empreinte de la publication — le marqueur de validation |

Ce sont des fichiers JSON ; l'extension `.txt` est délibérée, c'est la moins susceptible d'être
interceptée par un filtre de scripts.

## Procédure de mise à jour

1. `npm run build`
2. `npm test` — parmi les contrôles, `test/manifestPayload.test.mjs` échoue si les `.txt` et les
   `.js` ont divergé.
3. Copier dans la bibliothèque SharePoint, **dans cet ordre** :
   1. `src/module-manifest.core.txt`
   2. `src/module-manifest.deferred.txt`
   3. `src/module-manifest.version.txt` ← **en dernier, impérativement**

Le fichier de version est le marqueur de validation : tant qu'il n'est pas remplacé, le
navigateur voit une version que les gros payloads ne portent pas encore, rejette l'ensemble et
démarre sur la version précédente. Copier les trois fichiers dans cet ordre rend la publication
atomique du point de vue de l'utilisateur.

## Les garde-fous

Le payload est appliqué **tout ou rien**. Il est rejeté, et l'app démarre sur les manifests `.js`
embarqués, dans tous ces cas :

- un des trois fichiers est injoignable, en 404, ou tronqué ;
- les trois fichiers n'annoncent pas la même version (déploiement à moitié copié) ;
- le téléchargement dépasse 15 secondes.

Le repli est silencieux côté utilisateur (un `console.warn`, pas d'écran d'erreur) : il voit la
version précédente, jamais un mélange des deux. Le manifest différé `.js` porte de son côté un
garde (`__CN_MANIFEST_FROM_PAYLOAD__`) qui l'empêche de réinjecter ses modules périmés par-dessus
ceux du payload — c'est ce qui aurait cassé le back-office, la vitrine et la synthèse au premier
clic, longtemps après le démarrage.

Ces comportements sont couverts par `e2e/manifest-payload.spec.js`.

## Vérifier ce qui tourne réellement

Dans la console du navigateur, sur la page ouverte :

```js
window.__CN_MANIFEST_FROM_PAYLOAD__   // true = la mise à jour .txt est bien active
window.__CN_MANIFEST_VERSION__        // empreinte servie (doit correspondre au build publié)
window.__CN_MANIFEST_BUNDLED_VERSION__ // empreinte figée dans le .js embarqué
```

`__CN_MANIFEST_FROM_PAYLOAD__` à `false` sous SharePoint signale que le repli a joué : la mise à
jour n'est pas prise. Le `console.warn` qui précède en donne la raison.

## Ce qui oblige encore à repasser par l'IT

À traiter comme des changements de couche figée, donc à regrouper dans une prochaine fenêtre
d'autorisation :

- toute modification de `index.html` ou de `src/module-loader.js` ;
- les cinq feuilles CSS écrites à la main (`fonts.css`, `project-showcase.css`,
  `project-showcase-theme-signature.css`, `showcase-editor.css`, `tourguide.css`) — elles ne
  voyagent pas dans le payload. Seule `tailwind-internal.css`, la seule régénérée à chaque
  changement d'interface, y est incluse ;
- le contenu de `src/vendor/`.

Ces fichiers bougent rarement. Il reste prudent de republier les deux manifests `.js` en même
temps qu'eux, pour que le repli ne soit pas trop distant de la version courante.

## Préalable à valider une seule fois

Ce dispositif repose sur une hypothèse à vérifier sur le tenant concerné : **un `.txt` reste
remplaçable dans la bibliothèque une fois le verrou retombé**. Le test coûte cinq minutes — à
H+24, tenter d'écraser un `.txt` quelconque.

Si ce n'est pas le cas, ou si l'app cesse purement et simplement de s'afficher après 24 h (le
`.html` étant alors téléchargé au lieu d'être rendu), le dispositif ne suffit pas et il faut
traiter le sujet côté IT : exemption du site à la remise à zéro automatique, tâche planifiée qui
réapplique le réglage, ou empaquetage SPFx via le catalogue d'applications.
