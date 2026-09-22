# Sécurité des données

> Public : développeurs. Ce document explique factuellement, à partir de l'architecture réellement
> observée dans le code, pourquoi l'absence de flux de données sortant du périmètre SharePoint /
> Power Automate / Microsoft 365 constitue une garantie de sécurité, et où s'arrête cette garantie.
>
> Toute affirmation ci-dessous est vérifiable dans le code (chemins de fichiers indiqués) ou dans
> les documents cités. Un point qui n'a pas pu être vérifié dans le code est signalé comme tel,
> jamais deviné. Version accessible aux non-développeurs, même raisonnement, même plan :
> [`securite-donnees-non-expert.md`](securite-donnees-non-expert.md).

## Contexte

Project Navigator est un outil interne qui fait qualifier à des porteurs de projet les enjeux
réglementaires (données personnelles, zone géographique, partenaires, etc.) de leurs projets, puis
route l'information vers des équipes de conformité (compliance, DPO, juridique…) pour avis. Les
projets, leurs réponses au questionnaire, les commentaires de conformité et les pièces jointes
associées sont donc potentiellement des données sensibles au sens interne (informations
stratégiques ou réglementaires non publiques) et peuvent contenir des données à caractère
personnel (adresses e-mail des porteurs et des équipes, éventuellement d'autres informations
saisies en texte libre selon le projet).

L'application n'a pas de backend propre : c'est un ensemble de fichiers statiques
(`index.html`, JavaScript, CSS) exécuté entièrement dans le navigateur de l'utilisateur, déposé
dans une bibliothèque d'un site SharePoint Online de l'organisation. Ce document décrit ce que
cette architecture implique pour la sécurité des données.

## Constat — l'architecture réellement observée

Ce qui suit est vérifié directement dans le code du dépôt, pas supposé :

1. **Aucune dépendance d'exécution tierce.** `package.json` ne déclare aucune section
   `dependencies` : uniquement des `devDependencies` (Babel, ESLint, Prettier, Playwright), toutes
   utilisées exclusivement au moment du développement/build, jamais chargées dans le navigateur de
   l'utilisateur final. React et ReactDOM sont *vendorés* (fichiers minifiés commités dans
   `src/vendor/react.production.min.js` et `react-dom.production.min.js`, chargés en globals par
   `index.html`) — aucun CDN, aucun registre de paquets contacté à l'exécution.
2. **Un seul module fait des appels réseau : `src/utils/spRestClient.js`.** Une recherche de
   `fetch(` dans tout `src/` ne fait remonter que ce fichier. Il construit systématiquement ses
   URL à partir de `getWebUrl()` (`src/config/sharepointConfig.js`), c'est-à-dire l'origine
   SharePoint courante déduite de `window.location` — jamais un domaine tiers codé en dur. Les
   requêtes portent `credentials: 'same-origin'` : le navigateur envoie les cookies de session
   SharePoint de l'utilisateur, aucun jeton ni secret applicatif n'est manipulé par le code.
3. **Aucune télémétrie, aucun outil d'analytics.** Une recherche des intégrations usuelles
   (Google Analytics, Sentry, Mixpanel, Segment, Hotjar, Amplitude, Microsoft Clarity, FullStory…)
   dans le code source ne remonte aucun résultat. Les seuls diagnostics sont des
   `console.info`/`console.warn`/`console.error` locaux au navigateur, jamais transmis à un
   service distant.
4. **L'application n'envoie jamais d'e-mail elle-même — techniquement impossible, pas seulement
   évité.** `docs/migration-v2/GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md` documente que l'API
   Microsoft Graph `sendMail` est interdite par la politique de sécurité du tenant et que l'ancienne
   API SharePoint `SP.Utilities.Utility.SendEmail` a été retirée par Microsoft (testée et constatée
   en échec le 28/08/2026). Toute notification passe donc par le dépôt d'une ligne dans la liste
   SharePoint `CN_NotificationsQueue` (`src/utils/notificationQueue.js`), lue et traitée par un flux
   Power Automate qui reste **interne au tenant Microsoft 365** de l'organisation (voir
   `docs/architecture-sharepoint.md`).
5. **Un seul lien externe cliquable par l'utilisateur, jamais un flux de données automatique.**
   Une recherche de toutes les URL `http(s)` présentes dans le code applicatif ne fait remonter
   qu'un lien de formulaire de retour d'expérience (`https://forms.cloud.microsoft/…`, ouvert dans
   un nouvel onglet à l'initiative de l'utilisateur, `src/App.jsx`) — un service Microsoft 365 — et
   des données de référentiel non exécutables (adresses d'exemple dans des libellés de questions,
   liens `https://example.com` dans le jeu de données de démonstration). Aucune de ces occurrences
   ne déclenche un envoi de données par l'application elle-même.
6. **Le contenu HTML saisi par les utilisateurs passe par une liste blanche avant tout rendu.**
   `src/utils/richText.js` limite les balises autorisées (`b`, `strong`, `i`, `em`, `u`, `p`, `br`,
   `ul`, `ol`, `li`, `a`) avant tout `dangerouslySetInnerHTML`, retire les attributs non prévus
   (gestionnaires d'événements inclus) et force `target="_blank"`/`rel="noopener noreferrer"` sur
   les liens conservés — limite l'exécution de code arbitraire injecté via un champ de texte riche
   (commentaire, description de projet…).
7. **L'identification de l'utilisateur est intrinsèquement liée à sa session SharePoint.**
   `src/utils/spContext.js` lit `/_api/web/currentUser` : l'application ne gère ni mot de passe, ni
   compte, ni mécanisme d'authentification propre. Un utilisateur retiré des membres du site perd
   immédiatement l'accès aux données depuis l'application, sans action à faire côté application
   (le contrôle d'accès est entièrement délégué aux permissions du site SharePoint — voir
   `docs/migration-v2/PREPARATION-SHAREPOINT-POWERAUTOMATE.md`).
8. **La fonction « Voir en tant que » (simulation d'identité) neutralise toute écriture.**
   `docs/migration-v2/TESTER-LES-ROLES.md` documente que, pendant une simulation, tous les chemins
   d'écriture sont désactivés (`src/utils/spRestClient.js`, `storage.js`, les files d'attente de
   synchronisation) : la simulation ne peut ni modifier de données réelles ni déclencher un envoi
   de notification.

## Garanties apportées par l'absence de flux de données externes

- **Aucune surface d'attaque tierce.** Sans service SaaS externe intégré (pas d'analytics, pas de
  CDN, pas d'API tierce), il n'existe pas de fournisseur externe susceptible de subir une
  compromission qui exposerait les données de Project Navigator : chaque octet de donnée applicative
  circule exclusivement entre le navigateur de l'utilisateur et le tenant Microsoft 365 de
  l'organisation.
- **Le périmètre de gouvernance des données est celui, déjà connu et audité, de Microsoft 365.**
  Les données ne quittent jamais SharePoint Online (résidence des données, chiffrement au repos et
  en transit, journalisation, conformité) : aucune donnée n'est répliquée vers un environnement
  dont les garanties contractuelles ou géographiques seraient différentes.
- **Le contrôle d'accès n'a qu'un seul point d'entrée à administrer : les permissions du site
  SharePoint.** Il n'existe pas de second système de comptes/rôles propre à l'application qui
  pourrait diverger des permissions SharePoint (un compte oublié dans l'application alors qu'il a
  été retiré du site, par exemple) : retirer quelqu'un du site suffit, à lui seul, à lui retirer
  l'accès aux données de l'application.
- **Pas de secret applicatif à protéger.** L'absence de clé d'API, de jeton ou de mot de passe géré
  par le code élimine la classe de risque « fuite de identifiant applicatif » (pas de `clientId`,
  pas de `tenantId`, pas de secret dans le dépôt — contrainte explicitement posée dans
  `docs/migration-v2/GUIDE-CLAUDE-MIGRATION-SHAREPOINT-REST.md`, §0).
- **Traçabilité native.** Chaque écriture porte `CreatedByEmail`/`UpdatedByEmail` (colonnes des
  listes SharePoint) et les notifications envoyées constituent un journal consultable
  (`CN_NotificationsQueue`, `CN_SiteAccessRequests`) — sans mécanisme applicatif dédié à construire
  ou à sécuriser séparément.

## Limites de cette garantie

- **Les permissions du site SharePoint pilotent tout — y compris leurs erreurs.** Un partage trop
  large du site (« toute l'organisation ») donne un accès tout aussi large aux données de
  l'application ; ce n'est pas un défaut de l'application, mais une configuration dont la
  responsabilité est entièrement côté administration SharePoint (voir la mise en garde explicite de
  `docs/migration-v2/PREPARATION-SHAREPOINT-POWERAUTOMATE.md`, étape 2).
- **Les comptes propriétaires des flux Power Automate portent des privilèges élevés.** Le flux
  d'ajout automatique comme membre du site (Flux 5) doit s'exécuter avec un compte disposant du
  droit « Gérer les permissions » sur le site — un privilège que la session ordinaire d'un
  utilisateur n'a jamais. Ce compte devient donc un point sensible à protéger (accès restreint,
  co-propriétaire de secours) : voir `docs/migration-v2/MODE-OPERATOIRE-POWER-AUTOMATE.md`, §7 bis.9.
- **Le contenu des e-mails de notification transite par Power Automate/Exchange Online**, avec les
  mêmes garanties que tout e-mail interne au tenant — mais un e-mail envoyé peut être transféré ou
  imprimé par son destinataire, hors du contrôle de l'application une fois émis. C'est une limite
  inhérente à tout système de notification par e-mail, pas spécifique à ce projet.
- **Un lien de vitrine de projet partagé (`?sv=…`) reste un lien.** `docs/`/`CLAUDE.md` documente
  qu'un token de partage est obfusqué et scellé par une somme de contrôle (pas de bascule en clair
  vers le mode complet en modifiant l'URL), mais ce mécanisme est une **dissuasion**, pas un
  chiffrement de bout en bout : quiconque obtient un lien valide et le rôle nécessaire côté
  SharePoint pour ouvrir l'application peut consulter ce qu'il donne à voir. Ce n'est pas un
  problème de flux sortant, mais une limite à connaître du modèle de partage.
- **`.backup-avant-signature/` reste présent dans l'historique du dépôt** (fichiers `.jsx`/`.css`
  antérieurs à une réécriture des thèmes de vitrine). Le code applicatif exécuté ne provient jamais
  de ce dossier (il n'est référencé nulle part dans `index.html` ni le manifeste), mais son contenu
  n'a pas fait l'objet d'un audit de sécurité dans le cadre de ce document.
- **Le versionnement et la sauvegarde des données dépendent de la configuration SharePoint**
  (historique des versions activé sur les listes et sur `CN-Config`), pas d'un mécanisme propre à
  l'application. `docs/migration-v2/PREPARATION-SHAREPOINT-POWERAUTOMATE.md` recommande de vérifier
  ce réglage ; ce n'est pas garanti par le code.
- **Non vérifié dans le code — à faire valider par l'organisation** : la durée de conservation
  effective des données (`mentions-legales.html` mentionne 5 ans à compter de la soumission aux
  équipes Compliance pour les données couvertes par cette section, mais ce point relève d'une
  politique de gouvernance des données, pas du code), l'activation réelle du chiffrement au repos
  et en transit sur le tenant (paramètre de configuration Microsoft 365, hors du périmètre du code
  applicatif), et la liste exacte des personnes ayant accès au site SharePoint de production à un
  instant donné (donnée d'exploitation, pas de code).
