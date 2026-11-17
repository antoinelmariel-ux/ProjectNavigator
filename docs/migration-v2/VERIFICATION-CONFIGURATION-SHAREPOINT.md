# Vérification de la configuration SharePoint

Ce document sert à **vérifier que le site SharePoint est correctement configuré** (les 3
bibliothèques et les 15 listes attendues par l'application, avec toutes leurs colonnes), et à
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
>
> ⚠️ **Constat du 03/09/2026** : sur `ProjectNavigator_DEV`, les 3 bibliothèques ont bien été
> créées avec un `Title` contenant un tiret (`CN-App`, visible dans l'interface), mais SharePoint a
> généré une URL interne **sans tiret** (`.../ProjectNavigator_DEV/CNApp/index.aspx`). Le code
> qui adresse ces bibliothèques par `getbytitle(...)` (listes, diagnostic) n'est pas affecté, mais
> `documentStore.js` (pièces jointes → `CN-Documents`) et `referentialStore.js` (fichiers JSON →
> `CN-Config`) construisaient jusque-là ce chemin en concaténant le nom **configuré** — ils
> auraient donc 404 dès le premier dépôt de fichier alors même que le diagnostic ci-dessous
> affichait tout en vert (il ne teste que le `Title`, pas l'URL réelle). Corrigé le 03/09/2026 :
> `src/utils/spLibraryUrl.js` résout désormais le `ServerRelativeUrl` réel via l'API
> (`GET .../lists/getbytitle('CN-Config')/rootFolder?$select=ServerRelativeUrl`, mis en cache) au
> lieu de le reconstruire depuis `sharepointConfig.libraries`. Aucune action requise côté
> SharePoint : le nom de dossier réel, avec ou sans tiret, n'a plus d'importance.
>
> ⚠️ **Constat du 14/09/2026** : le script (et le tableau ci-dessous) omettait la colonne
> `CancelledDate` sur `CN_Projects`, et la liste de choix de `Status` n'incluait pas `Cancelled` —
> deux écarts par rapport à `listSchemas.js`/`dataProvider.js`, qui lisent/écrivent bien ce champ
> pour les projets annulés. Sur un site créé avant cette date, l'app échoue au chargement avec
> « Il n'existe pas de champ ni de propriété « CancelledDate ». ». Relance le script en mode
> `apply` pour créer la colonne manquante (le script ne corrige pas rétroactivement la liste de
> choix d'une colonne `Status` déjà créée sans `Cancelled` — ajoute ce choix à la main depuis les
> paramètres de la colonne si besoin).

> Pour recopier les données de PROD vers DEV, voir la section « Copier le contenu des listes de PROD vers DEV » en bas de ce document.

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

### 15 listes

`Title` existe par défaut sur toute liste et n'est jamais recréée. 📌 = colonne indexée par le
script (nécessaire au-delà de 5 000 éléments).

| Liste | Colonnes (hors Title) |
|---|---|
| `CN_Projects` | ProjectId📌, Status📌 (Choix : Draft/Submitted/Cancelled), OwnerEmail, CurrentEditorEmail, AnswersJson (texte long), AnalysisJson (texte long), ProgressAnswered (nombre), ProgressTotal (nombre), SubmissionDate (date), **CancelledDate (date)**, LastAutosaveAt (date), RowVersion (nombre), CreatedByEmail, UpdatedByEmail |
| `CN_Inspirations` | InspirationId📌, Visibility (Choix : Personal/Shared), InspirationJson (texte long), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_ComplianceComments` | CommentId📌, ProjectId📌, SectionKey, Message (texte long), CommentType, ThreadId, **Status**, **AttachmentsJson (texte long)**, Resolved (oui/non), AssigneeEmail, ClaimJson (texte long), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_ProjectMembers` | EntryId, ProjectId📌, MemberEmail📌, Role, CanSubmit (oui/non) |
| `CN_ShowcaseStickyNotes` | StickyId, ProjectId📌, ShowcaseSection, AnchorJson (texte long), Content (texte long), Color, **RepliesJson (texte long)**, **AttachmentsJson (texte long)**, Resolved (oui/non), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_FilesIndex` | FileId, EntityType📌, EntityId📌, Path, UploadedBy, UploadedAt (date), Checksum |
| `CN_NotificationsQueue` | NotificationType, ToEmails (texte long), CcEmails (texte long), Body (texte long), ProjectId, Status📌 (Choix : Pending/Sent/Error, défaut Pending), SentAt (date), ErrorMessage (texte long), GroupKey📌, MessagesJson (texte long) |
| `CN_SiteAccessRequests` | TargetEmail📌, DisplayName, RequestedByEmail, Context, Status📌 (Choix : Pending/Done/Error, défaut Pending), ProcessedAt (date), ErrorMessage (texte long) |
| `CN_UserProfiles` | UserEmail📌, ActivityScopeJson (texte long), PreferredLanguage, HasCompletedOnboarding (oui/non), TeamPreferencesJson (texte long), AbsenceJson (texte long), ProjectSearchConfigJson (texte long, facultative : lue à part, son absence n'empêche rien), UpdatedAt (date) |
| `CN_Rules` | RuleId📌, PayloadJson (texte long), SortOrder (nombre), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_Teams` | TeamId📌, ContactsJson (texte long), NameJson (texte long), Expertise (texte long), AcceptedLanguagesJson (texte long), MemberRulesJson (texte long), ClaimStaleDays (nombre), ClaimReminderDays (nombre), SortOrder (nombre), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_Committees` | CommitteeId📌, PayloadJson (texte long), SortOrder (nombre), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_SampleProjects` | SampleId📌, AnswersJson (texte long), SortOrder (nombre), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_Faq` | FaqId📌, QuestionJson (texte long), AnswerJson (texte long), CategoryJson (texte long), IsPublished (oui/non, défaut oui), SortOrder (nombre), RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_CommitteeSessions` | SessionId📌, CommitteeId📌, StartAt, DurationMinutes (nombre), Location (texte long), Status, AgendaJson (texte long), AttendanceJson (texte long), PlanningReminderSentAt, OutlookEventId, RowVersion (nombre), CreatedByEmail, UpdatedByEmail, UpdatedAt (date) |
| `CN_CommitteeInvitations` | InvitationId📌, SessionId, PassageId, ProjectId, CommitteeId, Kind, Status, Subject, BodyHtml (texte long, texte brut), StartAt, EndAt, Location (texte long), Attendees (texte long), Revision (nombre), ProcessedRevision (nombre), OutlookEventId, OnlineMeetingUrl (texte long), SyncState, ErrorMessage (texte long), ProcessedAt, UpdatedByEmail, UpdatedAt (date) |

(Les colonnes en **gras** sont celles corrigées le 29/08/2026, voir l'encart d'avertissement en
haut de ce document. `AssigneeEmail`/`ClaimJson` sur `CN_ComplianceComments`,
`TeamPreferencesJson`/`AbsenceJson` sur `CN_UserProfiles` et `ClaimStaleDays`/`ClaimReminderDays`
sur `CN_Teams` servent à la prise en charge des projets par un membre d'équipe ; les lignes
`CN_Teams` et `CN_UserProfiles` ci-dessus étaient par ailleurs en retard sur `listSchemas.js`
(`NameJson`, `AcceptedLanguagesJson`, `MemberRulesJson` manquaient) et sont désormais alignées. `CN_Rules`/`CN_Teams` remplacent les fichiers `rules.json`/`teams.json` qui
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
        { name: 'Status', type: 'Choice', choices: ['Draft', 'Submitted', 'Cancelled'], indexed: true },
        { name: 'OwnerEmail', type: 'Text' },
        { name: 'CurrentEditorEmail', type: 'Text' },
        { name: 'AnswersJson', type: 'Note' },
        { name: 'AnalysisJson', type: 'Note' },
        { name: 'ProgressAnswered', type: 'Number' },
        { name: 'ProgressTotal', type: 'Number' },
        { name: 'SubmissionDate', type: 'DateTime' },
        { name: 'CancelledDate', type: 'DateTime' },
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
        { name: 'AssigneeEmail', type: 'Text' },
        { name: 'ClaimJson', type: 'Note' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' },
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
        { name: 'ErrorMessage', type: 'Note' },
        { name: 'GroupKey', type: 'Text', indexed: true },
        { name: 'MessagesJson', type: 'Note' }
      ]
    },
    {
      title: 'CN_SiteAccessRequests',
      fields: [
        { name: 'TargetEmail', type: 'Text', indexed: true },
        { name: 'DisplayName', type: 'Text' },
        { name: 'RequestedByEmail', type: 'Text' },
        { name: 'Context', type: 'Text' },
        { name: 'Status', type: 'Choice', choices: ['Pending', 'Done', 'Error'], defaultValue: 'Pending', indexed: true },
        { name: 'ProcessedAt', type: 'DateTime' },
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
        { name: 'TeamPreferencesJson', type: 'Note' },
        { name: 'AbsenceJson', type: 'Note' },
        { name: 'ProjectSearchConfigJson', type: 'Note' },
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
        { name: 'NameJson', type: 'Note' },
        { name: 'Expertise', type: 'Note' },
        { name: 'AcceptedLanguagesJson', type: 'Note' },
        { name: 'MemberRulesJson', type: 'Note' },
        { name: 'ClaimStaleDays', type: 'Number' },
        { name: 'ClaimReminderDays', type: 'Number' },
        { name: 'SortOrder', type: 'Number' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    },
    {
      title: 'CN_Committees',
      fields: [
        { name: 'CommitteeId', type: 'Text', indexed: true },
        { name: 'PayloadJson', type: 'Note' },
        { name: 'SortOrder', type: 'Number' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    },
    {
      title: 'CN_SampleProjects',
      fields: [
        { name: 'SampleId', type: 'Text', indexed: true },
        { name: 'AnswersJson', type: 'Note' },
        { name: 'SortOrder', type: 'Number' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    },
    {
      title: 'CN_Faq',
      fields: [
        { name: 'FaqId', type: 'Text', indexed: true },
        { name: 'QuestionJson', type: 'Note' },
        { name: 'AnswerJson', type: 'Note' },
        { name: 'CategoryJson', type: 'Note' },
        { name: 'IsPublished', type: 'Boolean' },
        { name: 'SortOrder', type: 'Number' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    },
    {
      title: 'CN_CommitteeSessions',
      fields: [
        { name: 'SessionId', type: 'Text', indexed: true },
        { name: 'CommitteeId', type: 'Text', indexed: true },
        { name: 'StartAt', type: 'Text' },
        { name: 'DurationMinutes', type: 'Number' },
        { name: 'Location', type: 'Note' },
        { name: 'Status', type: 'Text' },
        { name: 'AgendaJson', type: 'Note' },
        { name: 'AttendanceJson', type: 'Note' },
        { name: 'PlanningReminderSentAt', type: 'Text' },
        { name: 'OutlookEventId', type: 'Text' },
        { name: 'RowVersion', type: 'Number' },
        { name: 'CreatedByEmail', type: 'Text' },
        { name: 'UpdatedByEmail', type: 'Text' },
        { name: 'UpdatedAt', type: 'DateTime' }
      ]
    },
    {
      title: 'CN_CommitteeInvitations',
      fields: [
        { name: 'InvitationId', type: 'Text', indexed: true },
        { name: 'SessionId', type: 'Text' },
        { name: 'PassageId', type: 'Text' },
        { name: 'ProjectId', type: 'Text' },
        { name: 'CommitteeId', type: 'Text' },
        { name: 'Kind', type: 'Text' },
        { name: 'Status', type: 'Text' },
        { name: 'Subject', type: 'Text' },
        { name: 'BodyHtml', type: 'Note' },
        { name: 'StartAt', type: 'Text' },
        { name: 'EndAt', type: 'Text' },
        { name: 'Location', type: 'Note' },
        { name: 'Attendees', type: 'Note' },
        { name: 'Revision', type: 'Number' },
        { name: 'ProcessedRevision', type: 'Number' },
        { name: 'OutlookEventId', type: 'Text' },
        { name: 'OnlineMeetingUrl', type: 'Note' },
        { name: 'SyncState', type: 'Text' },
        { name: 'ErrorMessage', type: 'Note' },
        { name: 'ProcessedAt', type: 'Text' },
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

## Copier le contenu des listes de PROD vers DEV

Second script, indépendant du précédent : il **recopie les éléments** des listes `CN_*` **et les fichiers JSON de `CN-Config`** (référentiels,
`settings.json`…) d'un site source (PROD) vers le site sur lequel tu l'exécutes (DEV), pour tester avec des
données réalistes.
Il suppose que la structure existe déjà sur DEV (lance d'abord `cnCheckSharePointConfig({ apply: true })`).

### Garanties et précautions

- **PROD n'est jamais modifié** : la source n'est lue que par des `GET`. Toutes les écritures vont sur
  le site de la page où tu colles le script — **ouvre donc une page du site DEV**. Si source et cible
  sont le même site, le script refuse.
- **C'est toi qui décides, liste par liste.** Le script analyse d'abord les deux sites (rien n'est écrit),
  affiche un tableau, puis ouvre un **panneau** avec une ligne par liste et par action possible : *Ne pas
  copier*, *Copier* / *Ajouter les éléments manquants* (selon que la liste de DEV est vide ou non), ou
  *Écraser*. Les actions proposées d'office (copier les listes vides de DEV, ne rien toucher aux listes
  déjà remplies) ne sont que des suggestions : tu peux les changer librement. *Annuler* ne copie rien.
- **Écraser** met les éléments actuels de DEV **à la corbeille** (récupérables), puis recopie ceux de PROD.
  Une confirmation est demandée avant de lancer si au moins une ligne est en « Écraser ». « Ajouter les
  éléments manquants » ne compare que la clé métier (`ProjectId`, `RuleId`…) : un élément déjà présent
  n'est pas mis à jour.
- **Listes à flux Power Automate** : `CN_NotificationsQueue`, `CN_SiteAccessRequests` et
  `CN_CommitteeInvitations` figurent dans le panneau, marquées ⚠ et sur « Ne pas copier ». Les copier sur DEV
  enverrait de vrais mails, accorderait de vrais accès au site et créerait de vrais événements Outlook, avec
  les adresses de production : ne les choisis que si le flux correspondant est désactivé sur DEV.
- **Fichiers `CN-Config`** : une ligne du panneau (`CN-Config (fichiers)`), mêmes choix. Seuls les fichiers
  à la racine de la bibliothèque sont concernés. `settings.json` contient notamment la liste des
  administrateurs (`adminEmails`) : après copie, les administrateurs de PROD le deviennent sur DEV.
- Les colonnes copiées sont découvertes dynamiquement (texte, texte long, nombre, oui/non, date, choix) et
  limitées à celles présentes **des deux côtés** ; une colonne absente de DEV est signalée dans la console.

### Utilisation

1. Ouvre une page du site **DEV** (par exemple `.../ProjectNavigator_DEV/SitePages/...`), F12, onglet **Console**.
2. Colle le script ci-dessous, puis lance :
   ```js
   await cnCopyListContent({ source: 'https://<tenant>.sharepoint.com/sites/<site-prod>' })
   ```
3. Le tableau d'analyse s'affiche dans la console et le panneau s'ouvre : choisis l'action de chaque ligne,
   puis **Lancer la copie**. Le tableau final indique, par ligne, le nombre d'éléments copiés et les erreurs.

Options : `ui: false` (analyse seule, sans panneau ni écriture), `lists: ['CN_Rules', 'CN_Teams']` pour ne
proposer que certaines listes, `config: false` pour ne pas proposer `CN-Config`. Pour une exécution **sans
panneau** (script automatisé), ajoute `apply: true` : le script applique alors `onExisting`
(`'skip'` par défaut, `'merge'` ou `'replace'`) à toutes les listes, hors listes à flux (à ajouter
explicitement avec `include: [...]`).

**Limites à connaître** :
- Les deux sites doivent être sur **le même tenant** (même domaine `*.sharepoint.com`) : le navigateur
  refuse sinon de lire la source (CORS). Il faut aussi avoir les droits de lecture sur PROD et de
  contribution sur DEV.
- `Created`/`Modified`/`Author`/`Editor` sont gérés par SharePoint : les éléments copiés portent la date et
  l'auteur de la copie. Les dates et e-mails *métier* (`SubmissionDate`, `OwnerEmail`, `UpdatedAt`…) sont,
  eux, conservés tels quels.
- Seuls le **contenu des listes** et les fichiers de `CN-Config` sont copiés, pas `CN-Documents` : les pièces
  jointes référencées par les projets pointent donc vers des fichiers absents de DEV. Les fichiers copiés
  portent la date et l'auteur de la copie ; un `rules.json`/`teams.json` hérité n'a pas d'effet (remplacés par
  `CN_Rules`/`CN_Teams`).
- Les données de PROD contiennent de vraies adresses e-mail : à copier vers un site DEV dont l'accès est
  restreint aux personnes qui peuvent déjà voir PROD.
- Le jeton de sécurité est renouvelé automatiquement ; en cas de limitation (429/503) le script patiente
  et réessaie. Les erreurs ligne à ligne sont affichées dans la console et comptées dans le tableau.

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

  // La cible est toujours le site de la page courante (DEV) ; la source (PROD) n'est que lue.
  const TARGET_URL = deriveWebUrl();

  // Clé métier de chaque liste (sert au mode « merge »). Une liste sans clé ne supporte pas « merge ».
  const LISTS = {
    CN_Projects: 'ProjectId',
    CN_Inspirations: 'InspirationId',
    CN_ComplianceComments: 'CommentId',
    CN_ProjectMembers: 'EntryId',
    CN_ShowcaseStickyNotes: 'StickyId',
    CN_FilesIndex: 'FileId',
    CN_UserProfiles: 'UserEmail',
    CN_Rules: 'RuleId',
    CN_Teams: 'TeamId',
    CN_Committees: 'CommitteeId',
    CN_SampleProjects: 'SampleId',
    CN_Faq: 'FaqId',
    CN_CommitteeSessions: 'SessionId',
    // Listes qui déclenchent un flux Power Automate : exclues par défaut (voir « include »).
    CN_NotificationsQueue: null,
    CN_SiteAccessRequests: 'TargetEmail',
    CN_CommitteeInvitations: 'InvitationId'
  };

  const EXCLUDED_BY_DEFAULT = ['CN_NotificationsQueue', 'CN_SiteAccessRequests', 'CN_CommitteeInvitations'];

  const COPYABLE_TYPES = ['Text', 'Note', 'Number', 'Integer', 'Currency', 'Boolean', 'DateTime', 'Choice'];
  const PAGE_SIZE = 200;
  const WRITE_PARALLELISM = 5;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const listPath = (title) => "/_api/web/lists/getbytitle('" + title.replace(/'/g, "''") + "')";

  const spFetch = async (base, path, init = {}) => {
    for (let attempt = 0; ; attempt += 1) {
      const res = await fetch(base + path, {
        credentials: 'same-origin',
        ...init,
        headers: { Accept: 'application/json;odata=nometadata', ...(init.headers || {}) }
      });
      if ((res.status === 429 || res.status === 503) && attempt < 5) {
        const retryAfter = Number(res.headers.get('Retry-After'));
        await sleep((retryAfter > 0 ? retryAfter : Math.pow(2, attempt)) * 1000);
        continue;
      }
      return res;
    }
  };

  const readJson = async (base, path) => {
    const res = await spFetch(base, path);
    if (!res.ok) {
      const text = await res.text();
      throw new Error('HTTP ' + res.status + ' sur ' + path + ' — ' + text.slice(0, 200));
    }
    return res.json();
  };

  let digestCache = null;
  let digestAt = 0;
  const getDigest = async () => {
    if (digestCache && Date.now() - digestAt < 20 * 60 * 1000) return digestCache;
    const res = await spFetch(TARGET_URL, '/_api/contextinfo', { method: 'POST' });
    if (!res.ok) throw new Error('Impossible d’obtenir le jeton de sécurité (/_api/contextinfo).');
    digestCache = (await res.json()).FormDigestValue;
    digestAt = Date.now();
    return digestCache;
  };

  const writeTarget = async (path, init) => {
    const digest = await getDigest();
    const res = await spFetch(TARGET_URL, path, {
      method: 'POST',
      ...init,
      headers: { 'X-RequestDigest': digest, ...(init.headers || {}) }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('HTTP ' + res.status + ' — ' + text.slice(0, 300));
    }
    return res;
  };

  const getListInfo = async (base, title) => {
    const res = await spFetch(base, listPath(title) + '?$select=Title,ItemCount,ListItemEntityTypeFullName');
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('HTTP ' + res.status + ' en lisant la liste ' + title);
    return res.json();
  };

  const getCopyableFields = async (base, title) => {
    const data = await readJson(
      base,
      listPath(title) + '/fields?$select=InternalName,TypeAsString,ReadOnlyField,Hidden,FromBaseType&$top=500'
    );
    return (data.value || [])
      .filter(
        (f) =>
          !f.Hidden &&
          !f.ReadOnlyField &&
          COPYABLE_TYPES.includes(f.TypeAsString) &&
          (f.InternalName === 'Title' || !f.FromBaseType)
      )
      .map((f) => f.InternalName);
  };

  const readAllItems = async (base, title, fieldNames) => {
    const items = [];
    let lastId = 0;
    for (;;) {
      const query =
        '/items?$select=' + ['Id'].concat(fieldNames).join(',') +
        '&$orderby=Id&$top=' + PAGE_SIZE +
        '&$filter=' + encodeURIComponent('Id gt ' + lastId);
      const data = await readJson(base, listPath(title) + query);
      const page = data.value || [];
      if (!page.length) break;
      items.push(...page);
      lastId = page[page.length - 1].Id;
    }
    return items;
  };

  const inBatches = async (values, size, worker) => {
    for (let i = 0; i < values.length; i += size) {
      await Promise.all(values.slice(i, i + size).map(worker));
    }
  };

  const quote = (value) => String(value).replace(/'/g, "''");
  const CONFIG_LIBRARY = 'CN-Config';

  const getConfigFiles = async (base) => {
    const root = await readJson(base, listPath(CONFIG_LIBRARY) + '/RootFolder?$select=ServerRelativeUrl');
    const files = await readJson(base, listPath(CONFIG_LIBRARY) + '/RootFolder/Files?$select=Name&$top=500');
    return { folder: root.ServerRelativeUrl, names: (files.value || []).map((f) => f.Name) };
  };

  const readFileText = async (base, folder, name) => {
    const res = await spFetch(
      base,
      "/_api/web/GetFileByServerRelativeUrl('" + quote(folder + '/' + name) + "')/$value",
      { headers: { Accept: '*/*' } }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status + ' en lisant ' + name);
    return res.text();
  };

  const CONFIG_ID = '__config__';
  const CONFIG_LABEL = CONFIG_LIBRARY + ' (fichiers)';

  const MODE_LABELS = {
    none: 'Ne pas copier',
    replace: 'Écraser (cible mise à la corbeille, puis copie)'
  };
  const mergeLabel = (row) =>
    row.dst === 0 ? 'Copier' : row.id === CONFIG_ID ? 'Copier les fichiers manquants' : 'Ajouter les éléments manquants';

  // Lit les deux sites (lecture seule) et décrit, pour chaque liste, ce qu'on peut en faire.
  const analyze = async (source, titles, withConfig) => {
    const rows = [];
    for (const title of titles) {
      const row = { id: title, label: title, kind: 'list', keyField: LISTS[title], warn: EXCLUDED_BY_DEFAULT.includes(title) };
      rows.push(row);
      try {
        const [srcInfo, dstInfo] = await Promise.all([getListInfo(source, title), getListInfo(TARGET_URL, title)]);
        if (!srcInfo) { row.problem = 'absente de la source'; continue; }
        if (!dstInfo) { row.problem = 'absente de la cible (lancer cnCheckSharePointConfig({ apply: true }))'; continue; }
        row.src = srcInfo.ItemCount;
        row.dst = dstInfo.ItemCount;
        row.entityType = dstInfo.ListItemEntityTypeFullName;
        row.modes = ['none', 'merge', 'replace'];
        if (row.dst > 0 && !row.keyField) row.modes = ['none', 'replace'];
      } catch (e) {
        row.problem = e.message;
      }
    }
    if (withConfig) {
      const row = { id: CONFIG_ID, label: CONFIG_LABEL, kind: 'config', warn: false };
      rows.push(row);
      try {
        const [src, dst] = await Promise.all([getConfigFiles(source), getConfigFiles(TARGET_URL)]);
        row.srcFiles = src;
        row.dstFiles = dst;
        row.src = src.names.length;
        row.dst = dst.names.length;
        row.modes = ['none', 'merge', 'replace'];
      } catch (e) {
        row.problem = e.message;
      }
    }
    return rows;
  };

  // Choix proposé d'office ; l'utilisateur peut le changer librement dans le panneau.
  const recommendedMode = (row, onExisting) => {
    if (row.problem || row.warn || !row.src) return 'none';
    if (row.dst === 0) return 'merge';
    if (onExisting === 'merge' && row.modes.includes('merge')) return 'merge';
    if (onExisting === 'replace') return 'replace';
    return 'none';
  };

  const describe = (row, mode) => {
    if (row.problem) return 'ignorée : ' + row.problem;
    if (mode === 'none') return 'ne sera pas copiée';
    if (mode === 'replace') return 'ÉCRASE (' + row.dst + ' supprimé(s), ' + row.src + ' copié(s))';
    return row.dst === 0 ? 'COPIE ' + row.src + ' élément(s)' : 'AJOUTE les manquants';
  };

  const showPanel = (rows, source) =>
    new Promise((resolve) => {
      const el = (tag, css, text) => {
        const node = document.createElement(tag);
        if (css) node.style.cssText = css;
        if (text !== undefined) node.textContent = text;
        return node;
      };
      const overlay = el('div', 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font:14px/1.4 Segoe UI,Arial,sans-serif');
      const box = el('div', 'background:#fff;color:#222;border-radius:8px;padding:20px;max-width:900px;width:92vw;max-height:88vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,.4)');
      box.appendChild(el('h2', 'margin:0 0 8px;font-size:18px', 'Que copier de PROD vers DEV ?'));
      box.appendChild(el('div', 'margin-bottom:12px;color:#555', 'Source (lecture seule) : ' + source + '\nCible (écriture) : ' + TARGET_URL));
      box.lastChild.style.whiteSpace = 'pre-line';

      const table = el('table', 'border-collapse:collapse;width:100%');
      const headRow = el('tr');
      ['Liste', 'Source', 'Cible', 'Action'].forEach((h) => headRow.appendChild(el('th', 'text-align:left;padding:6px 8px;border-bottom:2px solid #ccc', h)));
      table.appendChild(headRow);

      const selects = new Map();
      const note = el('div', 'margin-top:10px;min-height:20px;color:#b00020;font-weight:600');
      const refreshNote = () => {
        const overwritten = rows.filter((r) => selects.get(r.id) && selects.get(r.id).value === 'replace');
        note.textContent = overwritten.length
          ? 'Écrasement : le contenu actuel de DEV pour ' + overwritten.map((r) => r.label).join(', ') + ' sera mis à la corbeille.'
          : '';
      };
      rows.forEach((row) => {
        const tr = el('tr');
        const nameCell = el('td', 'padding:6px 8px;border-bottom:1px solid #eee', row.label);
        if (row.warn) nameCell.appendChild(el('div', 'color:#b26a00;font-size:12px', '⚠ déclenche un flux Power Automate (mails, accès, Outlook) si copiée'));
        if (row.problem) nameCell.appendChild(el('div', 'color:#b00020;font-size:12px', row.problem));
        tr.appendChild(nameCell);
        tr.appendChild(el('td', 'padding:6px 8px;border-bottom:1px solid #eee', row.problem ? '—' : String(row.src)));
        tr.appendChild(el('td', 'padding:6px 8px;border-bottom:1px solid #eee', row.problem ? '—' : String(row.dst)));
        const actionCell = el('td', 'padding:6px 8px;border-bottom:1px solid #eee');
        if (!row.problem) {
          const select = el('select', 'padding:4px;max-width:100%');
          row.modes.forEach((mode) => {
            const option = el('option', '', mode === 'merge' ? mergeLabel(row) : MODE_LABELS[mode]);
            option.value = mode;
            select.appendChild(option);
          });
          select.value = row.mode;
          select.addEventListener('change', refreshNote);
          selects.set(row.id, select);
          actionCell.appendChild(select);
        }
        tr.appendChild(actionCell);
        table.appendChild(tr);
      });
      box.appendChild(table);
      box.appendChild(note);

      const buttons = el('div', 'margin-top:14px;display:flex;gap:8px;justify-content:flex-end');
      const cancel = el('button', 'padding:6px 14px', 'Annuler');
      const go = el('button', 'padding:6px 14px;background:#0f6cbd;color:#fff;border:0;border-radius:4px', 'Lancer la copie');
      const close = (value) => { overlay.remove(); resolve(value); };
      cancel.addEventListener('click', () => close(null));
      go.addEventListener('click', () => {
        const plan = {};
        selects.forEach((select, id) => { plan[id] = select.value; });
        if (Object.values(plan).some((m) => m === 'replace') && !window.confirm('Confirmer l’écrasement des données DEV sélectionnées ?')) return;
        close(plan);
      });
      buttons.appendChild(cancel);
      buttons.appendChild(go);
      box.appendChild(buttons);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });

  const copyList = async (row, mode, out) => {
    if (row.dst > 0 && mode === 'merge' && !row.keyField) throw new Error('pas de clé pour fusionner');
    const [srcFields, dstFields] = await Promise.all([getCopyableFields(SOURCE, row.id), getCopyableFields(TARGET_URL, row.id)]);
    const fields = srcFields.filter((f) => dstFields.includes(f));
    const missingInTarget = srcFields.filter((f) => !dstFields.includes(f));
    if (missingInTarget.length) console.warn(row.id + ' : colonne(s) absente(s) de la cible, non copiée(s) → ' + missingInTarget.join(', '));

    const items = await readAllItems(SOURCE, row.id, fields);
    if (mode === 'replace' && row.dst > 0) {
      const existing = await readAllItems(TARGET_URL, row.id, []);
      await inBatches(existing, WRITE_PARALLELISM, (it) => writeTarget(listPath(row.id) + '/items(' + it.Id + ')/recycle()', {}));
      console.log(row.id + ' : ' + existing.length + ' élément(s) de la cible mis à la corbeille.');
    }
    let toCopy = items;
    if (mode === 'merge' && row.dst > 0) {
      const existingKeys = new Set((await readAllItems(TARGET_URL, row.id, [row.keyField])).map((it) => it[row.keyField]));
      toCopy = items.filter((it) => !existingKeys.has(it[row.keyField]));
    }
    let done = 0;
    await inBatches(toCopy, WRITE_PARALLELISM, async (item) => {
      const body = { __metadata: { type: row.entityType } };
      for (const f of fields) if (item[f] !== null && item[f] !== undefined) body[f] = item[f];
      try {
        await writeTarget(listPath(row.id) + '/items', {
          headers: { 'Content-Type': 'application/json;odata=verbose' },
          body: JSON.stringify(body)
        });
        out.copiés += 1;
      } catch (e) {
        out.erreurs += 1;
        console.error(row.id + ' (source Id ' + item.Id + ') : ' + e.message);
      }
      done += 1;
      if (done % 100 === 0) console.log(row.id + ' : ' + done + '/' + toCopy.length);
    });
    return 'copiée' + (toCopy.length < items.length ? ' (' + (items.length - toCopy.length) + ' déjà présents)' : '');
  };

  const copyConfig = async (row, mode, out) => {
    const names = row.srcFiles.names.filter((name) => mode === 'replace' || !row.dstFiles.names.includes(name));
    for (const name of names) {
      try {
        const text = await readFileText(SOURCE, row.srcFiles.folder, name);
        await writeTarget(
          "/_api/web/GetFolderByServerRelativeUrl('" + quote(row.dstFiles.folder) + "')/Files/add(url='" + quote(name) + "',overwrite=true)",
          { headers: { 'Content-Type': 'application/json' }, body: text }
        );
        out.copiés += 1;
      } catch (e) {
        out.erreurs += 1;
        console.error(CONFIG_LIBRARY + ' / ' + name + ' : ' + e.message);
      }
    }
    return 'copiés' + (names.length < row.src ? ' (' + (row.src - names.length) + ' déjà présents, conservés)' : '');
  };

  let SOURCE = '';

  // Sans `apply` : analyse, puis panneau où l'on choisit quoi copier / écraser.
  // Avec `apply: true` : exécution directe, sans panneau (scriptable).
  window.cnCopyListContent = async function (options) {
    const opts = options || {};
    SOURCE = String(opts.source || '').replace(/\/+$/, '');
    if (!SOURCE) {
      throw new Error("Indiquez le site source : await cnCopyListContent({ source: 'https://…/sites/ProjectNavigator' })");
    }
    if (SOURCE.toLowerCase() === TARGET_URL.toLowerCase()) {
      throw new Error('La source et la cible sont le même site (' + TARGET_URL + '). Ouvrez cette page sur le site DEV.');
    }
    const apply = !!opts.apply;
    const onExisting = opts.onExisting || 'skip';
    if (!['skip', 'merge', 'replace'].includes(onExisting)) throw new Error("onExisting doit valoir 'skip', 'merge' ou 'replace'.");
    const withConfig = opts.config !== false;
    const include = Array.isArray(opts.include) ? opts.include : [];
    const explicit = Array.isArray(opts.lists) && opts.lists.length ? opts.lists : null;
    const unknown = (explicit || []).filter((t) => !(t in LISTS));
    if (unknown.length) throw new Error('Liste(s) inconnue(s) : ' + unknown.join(', '));
    const titles = explicit || (apply
      ? Object.keys(LISTS).filter((t) => !EXCLUDED_BY_DEFAULT.includes(t) || include.includes(t))
      : Object.keys(LISTS));

    console.log('Source (lecture seule) : ' + SOURCE);
    console.log('Cible (écriture)       : ' + TARGET_URL);
    console.log('Analyse des deux sites…');
    const rows = await analyze(SOURCE, titles, withConfig);
    rows.forEach((row) => {
      if (apply) row.warn = false;
      row.mode = recommendedMode(row, onExisting);
    });

    let plan;
    if (apply) {
      plan = {};
      rows.forEach((row) => { plan[row.id] = row.mode; });
    } else {
      console.table(rows.map((r) => ({ liste: r.label, source: r.src === undefined ? '—' : r.src, cible: r.dst === undefined ? '—' : r.dst, 'proposition': describe(r, r.mode) })));
      if (opts.ui === false) return rows;
      const choose = typeof opts.choose === 'function' ? opts.choose : showPanel;
      plan = await choose(rows, SOURCE);
      if (!plan) { console.log('Annulé : rien n’a été copié.'); return null; }
    }

    const report = [];
    for (const row of rows) {
      const mode = plan[row.id];
      const out = { liste: row.label, source: row.src === undefined ? '' : row.src, 'cible avant': row.dst === undefined ? '' : row.dst, action: '', copiés: 0, erreurs: 0 };
      report.push(out);
      if (row.problem) { out.action = 'ignorée : ' + row.problem; continue; }
      if (!mode || mode === 'none') { out.action = 'non copiée'; continue; }
      try {
        out.action = row.kind === 'config' ? await copyConfig(row, mode, out) : await copyList(row, mode, out);
      } catch (e) {
        out.action = 'erreur : ' + e.message;
        out.erreurs += 1;
      }
    }
    console.table(report);
    return report;
  };

  console.log(
    "Prêt. Lancez : await cnCopyListContent({ source: 'https://…/sites/ProjectNavigator' })  (analyse, puis un panneau vous laisse choisir quoi copier ou écraser)"
  );
})();
```
