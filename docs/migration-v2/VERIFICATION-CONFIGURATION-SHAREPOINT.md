# Vérification de la configuration SharePoint

Ce document sert à **vérifier que le site SharePoint est correctement configuré** (les 3
bibliothèques et les 12 listes attendues par l'application, avec toutes leurs colonnes), et à
**créer automatiquement ce qui manque**, sans avoir à cliquer liste par liste, colonne par colonne.

La configuration de référence ci-dessous est extraite de
[`src/utils/listSchemas.js`](../../src/utils/listSchemas.js), le fichier qui décrit réellement les
colonnes utilisées par le code — c'est la source de vérité. Le document jumeau
[`PREPARATION-SHAREPOINT-POWERAUTOMATE.md`](PREPARATION-SHAREPOINT-POWERAUTOMATE.md) explique
*pourquoi* chaque liste existe et comment créer le flux Power Automate ; celui-ci sert à vérifier
*que tout est bien créé*.

> ⚠️ **Constat du 29/08/2026** : en comparant `listSchemas.js` au tableau de
> `PREPARATION-SHAREPOINT-POWERAUTOMATE.md`, 4 colonnes utilisées par le code manquaient dans ce
> tableau (donc probablement aussi sur le site DEV, créé le 28/08/2026 à partir de cette
> référence) : `Status` et `AttachmentsJson` sur `CN_ComplianceComments`, `RepliesJson` et
> `AttachmentsJson` sur `CN_ShowcaseStickyNotes`. Sans ces colonnes, les pièces jointes des
> commentaires compliance, leur statut, et les réponses aux post-its de la vitrine ne seraient pas
> sauvegardées en mode SharePoint. Lance le script ci-dessous sur DEV pour vérifier et corriger.

## Comment utiliser le script

1. Ouvre une page de ton site SharePoint (par exemple `.../CN-App/index.aspx`, ou simplement la
   page d'accueil du site) — le script a besoin des cookies de session de cette page.
2. Ouvre la console développeur du navigateur (touche **F12**, puis onglet **Console**).
3. Colle l'intégralité du script de la section suivante, puis valide.
4. Lance d'abord un **diagnostic seul** (aucune modification) :
   ```js
   await cnCheckSharePointConfig()
   ```
   Un tableau s'affiche avec, pour chaque bibliothèque / liste / colonne : `OK` ou `MANQUANTE`.
5. Si des éléments manquent et que tu as les droits nécessaires (propriétaire du site ou droits de
   gestion des listes), relance en mode création :
   ```js
   await cnCheckSharePointConfig({ apply: true })
   ```
   Le script ne fait que **créer ce qui manque** — il ne modifie et ne supprime jamais une
   bibliothèque, une liste, une colonne ou une donnée existante. Il est sûr de le relancer
   plusieurs fois (les éléments déjà présents sont simplement ignorés).

**Limites à connaître** :
- Le script vérifie qu'une colonne **existe** (par son nom interne), mais ne vérifie pas si son
  **type** correspond exactement à ce qui est attendu (changer le type d'une colonne existante via
  l'API est risqué et peut faire perdre des données ; ce n'est délibérément pas automatisé). Si un
  type semble incorrect, corrige-le à la main depuis les paramètres de la liste.
- Il ne crée ni ne modifie le flux Power Automate — voir
  [`MODE-OPERATOIRE-POWER-AUTOMATE.md`](MODE-OPERATOIRE-POWER-AUTOMATE.md) pour ça.
- Il faut être **propriétaire du site ou avoir le droit de gérer les listes** pour que la création
  fonctionne ; en simple lecture, seul le diagnostic (sans `apply`) fonctionnera.

## Configuration attendue

### 3 bibliothèques de documents

| Bibliothèque | Rôle |
|---|---|
| `CN-App` | Fichiers de l'application (dont `index.aspx`) |
| `CN-Config` | Fichiers de paramètres JSON (remplie par l'app) |
| `CN-Documents` | Pièces jointes ajoutées par les utilisateurs |

### 12 listes

`Title` existe par défaut sur toute liste et n'est jamais recréée. 📌 = colonne indexée par le
script (nécessaire au-delà de 5 000 éléments).

| Liste | Colonnes (hors Title) |
|---|---|
| `CN_Projects` | ProjectId📌, Status📌 (Choix : Draft/Submitted), OwnerEmail, CurrentEditorEmail, AnswersJson (texte long), AnalysisJson (texte long), ProgressAnswered (nombre), ProgressTotal (nombre), SubmissionDate (date), LastAutosaveAt (date), RowVersion (nombre), CreatedByEmail, UpdatedByEmail |
| `CN_Inspirations` | InspirationId📌, Visibility (Choix : Personal/Shared), InspirationJson (texte long), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_ComplianceComments` | CommentId📌, ProjectId📌, SectionKey, Message (texte long), CommentType, ThreadId, **Status**, **AttachmentsJson (texte long)**, Resolved (oui/non), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_ProjectDiscussions` | MessageId📌, ProjectId📌, ThreadId, SenderEmail, RecipientRole, Message (texte long), AttachmentsJson (texte long), RowVersion (nombre), CreatedAt (date), UpdatedAt (date) |
| `CN_ProjectMembers` | EntryId, ProjectId📌, MemberEmail📌, Role, CanSubmit (oui/non) |
| `CN_BackofficeChanges` | ChangeId, EntityType📌, EntityId, PayloadJson (texte long), ChangeType, RequiresValidation (oui/non), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_ShowcaseStickyNotes` | StickyId, ProjectId📌, ShowcaseSection, AnchorJson (texte long), Content (texte long), Color, **RepliesJson (texte long)**, **AttachmentsJson (texte long)**, Resolved (oui/non), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_FilesIndex` | FileId, EntityType📌, EntityId📌, Path, UploadedBy, UploadedAt (date), Checksum |
| `CN_NotificationsQueue` | NotificationType, ToEmails (texte long), CcEmails (texte long), Body (texte long), ProjectId, Status📌 (Choix : Pending/Sent/Error, défaut Pending), SentAt (date), ErrorMessage (texte long) |
| `CN_UserProfiles` | UserEmail📌, ActivityScopeJson (texte long), PreferredLanguage, HasCompletedOnboarding (oui/non), UpdatedAt (date) |
| `CN_Rules` | RuleId📌, PayloadJson (texte long), SortOrder (nombre), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_Teams` | TeamId📌, ContactsJson (texte long), Expertise (texte long), SortOrder (nombre), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |

(Les colonnes en **gras** sont celles corrigées le 29/08/2026, voir l'encart d'avertissement en
haut de ce document. `CN_Rules`/`CN_Teams` remplacent les fichiers `rules.json`/`teams.json` qui
existaient auparavant dans `CN-Config` — une ligne par règle/équipe plutôt qu'un fichier unique.)

## Le script

```js
(() => {
  const ORIGIN = window.location.origin;

  const deriveWebUrl = () => {
    const path = window.location.pathname;
    const appIdx = path.indexOf('/CN-App/');
    if (appIdx !== -1) return ORIGIN + path.slice(0, appIdx);
    const siteMatch = path.match(/^(\/(?:sites|teams)\/[^/]+)/i);
    return siteMatch ? ORIGIN + siteMatch[1] : ORIGIN;
  };

  const WEB_URL = deriveWebUrl();

  const escapeXml = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const buildFieldXml = (field) => {
    const attrs = [
      'Type="' + field.type + '"',
      'Name="' + escapeXml(field.name) + '"',
      'StaticName="' + escapeXml(field.name) + '"',
      'DisplayName="' + escapeXml(field.name) + '"'
    ];
    if (field.indexed) attrs.push('Indexed="TRUE"');
    if (field.type === 'Note') attrs.push('RichText="FALSE"');
    if (field.type === 'DateTime') attrs.push('Format="DateTime"');

    let inner = '';
    if (field.type === 'Choice' && Array.isArray(field.choices)) {
      const choiceTags = field.choices
        .map(function (c) { return '<CHOICE>' + escapeXml(c) + '</CHOICE>'; })
        .join('');
      inner += '<CHOICES>' + choiceTags + '</CHOICES>';
    }
    if (field.defaultValue !== undefined) {
      inner += '<Default>' + escapeXml(field.defaultValue) + '</Default>';
    }
    return '<Field ' + attrs.join(' ') + '>' + inner + '</Field>';
  };

  const spFetch = (path, init = {}) =>
    fetch(WEB_URL + path, {
      credentials: 'same-origin',
      ...init,
      headers: { Accept: 'application/json;odata=nometadata', ...(init.headers || {}) }
    });

  let digestCache = null;
  const getDigest = async () => {
    if (digestCache) return digestCache;
    const res = await spFetch('/_api/contextinfo', { method: 'POST' });
    if (!res.ok) throw new Error('Impossible d’obtenir le jeton de sécurité (/_api/contextinfo).');
    const data = await res.json();
    digestCache = data.FormDigestValue;
    return digestCache;
  };

  const spWrite = async (path, body) => {
    const digest = await getDigest();
    const res = await spFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': digest },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('HTTP ' + res.status + ' — ' + text.slice(0, 300));
    }
    return res;
  };

  const listExists = async (title) => {
    const res = await spFetch("/_api/web/lists/getbytitle('" + title + "')?$select=Title");
    return res.ok;
  };

  const createList = (title, baseTemplate) =>
    spWrite('/_api/web/lists', {
      __metadata: { type: 'SP.List' },
      Title: title,
      BaseTemplate: baseTemplate,
      ContentTypesEnabled: true,
      AllowContentTypes: true
    });

  const getExistingFieldNames = async (title) => {
    const res = await spFetch(
      "/_api/web/lists/getbytitle('" + title + "')/fields?$select=InternalName&$top=5000"
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.value || []).map((f) => f.InternalName);
  };

  const createField = (listTitle, field) =>
    spWrite("/_api/web/lists/getbytitle('" + listTitle + "')/fields/createfieldasxml", {
      parameters: {
        __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' },
        SchemaXml: buildFieldXml(field)
      }
    });

  const EXPECTED_LIBRARIES = [{ title: 'CN-App' }, { title: 'CN-Config' }, { title: 'CN-Documents' }];

  const EXPECTED_LISTS = [
    {
      title: 'CN_Projects',
      fields: [
        { name: 'ProjectId', type: 'Text', indexed: true },
        { name: 'Status', type: 'Choice', choices: ['Draft', 'Submitted'], indexed: true },
        { name: 'OwnerEmail', type: 'Text' },
        { name: 'CurrentEditorEmail', type: 'Text' },
        { name: 'AnswersJson', type: 'Note' },
        { name: 'AnalysisJson', type: 'Note' },
        { name: 'ProgressAnswered', type: 'Number' },
        { name: 'ProgressTotal', type: 'Number' },
        { name: 'SubmissionDate', type: 'DateTime' },
        { name: 'LastAutosaveAt', type: 'DateTime' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' }
      ]
    },
    {
      title: 'CN_Inspirations',
      fields: [
        { name: 'InspirationId', type: 'Text', indexed: true },
        { name: 'Visibility', type: 'Choice', choices: ['Personal', 'Shared'] },
        { name: 'InspirationJson', type: 'Note' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    },
    {
      title: 'CN_ComplianceComments',
      fields: [
        { name: 'CommentId', type: 'Text', indexed: true },
        { name: 'ProjectId', type: 'Text', indexed: true },
        { name: 'SectionKey', type: 'Text' },
        { name: 'Message', type: 'Note' },
        { name: 'CommentType', type: 'Text' },
        { name: 'ThreadId', type: 'Text' },
        { name: 'Status', type: 'Text' },
        { name: 'AttachmentsJson', type: 'Note' },
        { name: 'Resolved', type: 'Boolean' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    },
    {
      title: 'CN_ProjectDiscussions',
      fields: [
        { name: 'MessageId', type: 'Text', indexed: true },
        { name: 'ProjectId', type: 'Text', indexed: true },
        { name: 'ThreadId', type: 'Text' },
        { name: 'SenderEmail', type: 'Text' },
        { name: 'RecipientRole', type: 'Text' },
        { name: 'Message', type: 'Note' },
        { name: 'AttachmentsJson', type: 'Note' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedAt', type: 'DateTime' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    },
    {
      title: 'CN_ProjectMembers',
      fields: [
        { name: 'EntryId', type: 'Text' },
        { name: 'ProjectId', type: 'Text', indexed: true },
        { name: 'MemberEmail', type: 'Text', indexed: true },
        { name: 'Role', type: 'Text' },
        { name: 'CanSubmit', type: 'Boolean' }
      ]
    },
    {
      title: 'CN_BackofficeChanges',
      fields: [
        { name: 'ChangeId', type: 'Text' },
        { name: 'EntityType', type: 'Text', indexed: true },
        { name: 'EntityId', type: 'Text' },
        { name: 'PayloadJson', type: 'Note' },
        { name: 'ChangeType', type: 'Text' },
        { name: 'RequiresValidation', type: 'Boolean' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    },
    {
      title: 'CN_ShowcaseStickyNotes',
      fields: [
        { name: 'StickyId', type: 'Text' },
        { name: 'ProjectId', type: 'Text', indexed: true },
        { name: 'ShowcaseSection', type: 'Text' },
        { name: 'AnchorJson', type: 'Note' },
        { name: 'Content', type: 'Note' },
        { name: 'Color', type: 'Text' },
        { name: 'RepliesJson', type: 'Note' },
        { name: 'AttachmentsJson', type: 'Note' },
        { name: 'Resolved', type: 'Boolean' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    },
    {
      title: 'CN_FilesIndex',
      fields: [
        { name: 'FileId', type: 'Text' },
        { name: 'EntityType', type: 'Text', indexed: true },
        { name: 'EntityId', type: 'Text', indexed: true },
        { name: 'Path', type: 'Text' },
        { name: 'UploadedBy', type: 'Text' },
        { name: 'UploadedAt', type: 'DateTime' },
        { name: 'Checksum', type: 'Text' }
      ]
    },
    {
      title: 'CN_NotificationsQueue',
      fields: [
        { name: 'NotificationType', type: 'Text' },
        { name: 'ToEmails', type: 'Note' },
        { name: 'CcEmails', type: 'Note' },
        { name: 'Body', type: 'Note' },
        { name: 'ProjectId', type: 'Text' },
        { name: 'Status', type: 'Choice', choices: ['Pending', 'Sent', 'Error'], defaultValue: 'Pending', indexed: true },
        { name: 'SentAt', type: 'DateTime' },
        { name: 'ErrorMessage', type: 'Note' }
      ]
    },
    {
      title: 'CN_UserProfiles',
      fields: [
        { name: 'UserEmail', type: 'Text', indexed: true },
        { name: 'ActivityScopeJson', type: 'Note' },
        { name: 'PreferredLanguage', type: 'Text', defaultValue: 'en' },
        { name: 'HasCompletedOnboarding', type: 'Boolean' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    },
    {
      title: 'CN_Rules',
      fields: [
        { name: 'RuleId', type: 'Text', indexed: true },
        { name: 'PayloadJson', type: 'Note' },
        { name: 'SortOrder', type: 'Number' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    },
    {
      title: 'CN_Teams',
      fields: [
        { name: 'TeamId', type: 'Text', indexed: true },
        { name: 'ContactsJson', type: 'Note' },
        { name: 'Expertise', type: 'Note' },
        { name: 'SortOrder', type: 'Number' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    }
  ];

  window.cnCheckSharePointConfig = async function (options) {
    const apply = !!(options && options.apply);
    const report = [];
    console.log('Vérification de la configuration SharePoint sur ' + WEB_URL);
    console.log(apply ? 'Mode : création des éléments manquants' : 'Mode : diagnostic seul (relancer avec { apply: true } pour créer)');

    for (const lib of EXPECTED_LIBRARIES) {
      const exists = await listExists(lib.title);
      if (exists) {
        report.push({ type: 'bibliothèque', élément: lib.title, statut: 'OK' });
      } else if (apply) {
        try {
          await createList(lib.title, 101);
          report.push({ type: 'bibliothèque', élément: lib.title, statut: 'créée' });
        } catch (e) {
          report.push({ type: 'bibliothèque', élément: lib.title, statut: 'erreur : ' + e.message });
        }
      } else {
        report.push({ type: 'bibliothèque', élément: lib.title, statut: 'MANQUANTE' });
      }
    }

    for (const list of EXPECTED_LISTS) {
      let exists = await listExists(list.title);
      if (!exists) {
        if (apply) {
          try {
            await createList(list.title, 100);
            exists = true;
            report.push({ type: 'liste', élément: list.title, statut: 'créée' });
          } catch (e) {
            report.push({ type: 'liste', élément: list.title, statut: 'erreur : ' + e.message });
            continue;
          }
        } else {
          report.push({ type: 'liste', élément: list.title, statut: 'MANQUANTE (colonnes non vérifiées)' });
          continue;
        }
      } else {
        report.push({ type: 'liste', élément: list.title, statut: 'OK' });
      }

      const existingFieldNames = await getExistingFieldNames(list.title);
      for (const field of list.fields) {
        const present = existingFieldNames.includes(field.name);
        const label = list.title + ' → ' + field.name;
        if (present) {
          report.push({ type: 'colonne', élément: label, statut: 'OK' });
        } else if (apply) {
          try {
            await createField(list.title, field);
            report.push({ type: 'colonne', élément: label, statut: 'créée' });
          } catch (e) {
            report.push({ type: 'colonne', élément: label, statut: 'erreur : ' + e.message });
          }
        } else {
          report.push({ type: 'colonne', élément: label, statut: 'MANQUANTE' });
        }
      }
    }

    console.table(report);
    const problems = report.filter((r) => r.statut !== 'OK' && !r.statut.startsWith('créée'));
    console.log(problems.length ? (problems.length + ' point(s) à traiter.') : 'Tout est conforme ✅');
    return report;
  };

  console.log(
    'Prêt. Lancez : await cnCheckSharePointConfig()  (diagnostic seul)  puis, si besoin :  await cnCheckSharePointConfig({ apply: true })  (crée ce qui manque).'
  );
})();
```
