// Description déclarative des colonnes SharePoint, partagée par tous les dépôts de listes.
// `json` liste les colonnes « texte multiligne » qui transportent du JSON : côté SharePoint ce
// sont des chaînes, côté application des objets — c’est la seule vraie divergence avec les mocks.

const OBJECT = 'object';
const ARRAY = 'array';

export const LIST_SCHEMAS = {
  projects: {
    keyField: 'ProjectId',
    columns: [
      'Title',
      'ProjectId',
      'Status',
      'OwnerEmail',
      'CurrentEditorEmail',
      'AnswersJson',
      'AnalysisJson',
      'ProgressAnswered',
      'ProgressTotal',
      'SubmissionDate',
      'LastAutosaveAt',
      'RowVersion',
      'CreatedByEmail',
      'UpdatedByEmail'
    ],
    json: { AnswersJson: OBJECT, AnalysisJson: OBJECT },
    numbers: ['ProgressAnswered', 'ProgressTotal', 'RowVersion'],
    booleans: []
  },
  inspirations: {
    keyField: 'InspirationId',
    columns: [
      'Title',
      'InspirationId',
      'Visibility',
      'InspirationJson',
      'RowVersion',
      'CreatedByEmail',
      'UpdatedByEmail',
      'UpdatedAt'
    ],
    json: { InspirationJson: OBJECT },
    numbers: ['RowVersion'],
    booleans: []
  },
  complianceComments: {
    keyField: 'CommentId',
    columns: [
      'CommentId',
      'ProjectId',
      'SectionKey',
      'Message',
      'CommentType',
      'ThreadId',
      'Status',
      'AttachmentsJson',
      'Resolved',
      'RowVersion',
      'CreatedByEmail',
      'UpdatedByEmail',
      'UpdatedAt'
    ],
    json: { AttachmentsJson: ARRAY },
    numbers: ['RowVersion'],
    booleans: ['Resolved']
  },
  // Schéma prêt et liste SharePoint créée, mais aucune fonctionnalité ne l'utilise : pas
  // d'écran de messagerie de projet construit à ce jour (décision volontaire, cf. CLAUDE.md).
  projectDiscussions: {
    keyField: 'MessageId',
    columns: [
      'MessageId',
      'ProjectId',
      'ThreadId',
      'SenderEmail',
      'RecipientRole',
      'Message',
      'AttachmentsJson',
      'RowVersion',
      'CreatedAt',
      'UpdatedAt'
    ],
    json: { AttachmentsJson: ARRAY },
    numbers: ['RowVersion'],
    booleans: []
  },
  projectMembers: {
    keyField: 'EntryId',
    columns: ['EntryId', 'ProjectId', 'MemberEmail', 'Role', 'CanSubmit'],
    json: {},
    numbers: [],
    booleans: ['CanSubmit']
  },
  // Même situation que projectDiscussions ci-dessus : pas de journal des modifications
  // back-office construit à ce jour (décision volontaire, cf. CLAUDE.md).
  backofficeChanges: {
    keyField: 'ChangeId',
    columns: [
      'ChangeId',
      'EntityType',
      'EntityId',
      'PayloadJson',
      'ChangeType',
      'RequiresValidation',
      'RowVersion',
      'CreatedByEmail',
      'UpdatedByEmail',
      'UpdatedAt'
    ],
    json: { PayloadJson: OBJECT },
    numbers: ['RowVersion'],
    booleans: ['RequiresValidation']
  },
  showcaseStickyNotes: {
    keyField: 'StickyId',
    columns: [
      'StickyId',
      'ProjectId',
      'ShowcaseSection',
      'AnchorJson',
      'Content',
      'Color',
      'RepliesJson',
      'AttachmentsJson',
      'Resolved',
      'RowVersion',
      'CreatedByEmail',
      'UpdatedByEmail',
      'UpdatedAt'
    ],
    json: { AnchorJson: OBJECT, RepliesJson: ARRAY, AttachmentsJson: ARRAY },
    numbers: ['RowVersion'],
    booleans: ['Resolved']
  },
  filesIndex: {
    keyField: 'FileId',
    columns: [
      'FileId',
      'EntityType',
      'EntityId',
      'Path',
      'UploadedBy',
      'UploadedAt',
      'Checksum'
    ],
    json: {},
    numbers: [],
    booleans: []
  },
  notificationsQueue: {
    keyField: null,
    columns: [
      'Title',
      'NotificationType',
      'ToEmails',
      'CcEmails',
      'Body',
      'ProjectId',
      'Status',
      'SentAt',
      'ErrorMessage'
    ],
    json: {},
    numbers: [],
    booleans: []
  },
  // File d'attente consommée par un flux Power Automate qui ajoute la personne visée comme
  // membre du site (droits que la session de l'utilisateur courant n'a presque jamais) — voir
  // src/utils/siteAccessQueue.js et docs/migration-v2/MODE-OPERATOIRE-POWER-AUTOMATE.md.
  siteAccessRequests: {
    keyField: null,
    columns: [
      'Title',
      'TargetEmail',
      'DisplayName',
      'RequestedByEmail',
      'Context',
      'Status',
      'ProcessedAt',
      'ErrorMessage'
    ],
    json: {},
    numbers: [],
    booleans: []
  },
  userProfiles: {
    keyField: 'UserEmail',
    columns: ['UserEmail', 'ActivityScopeJson', 'PreferredLanguage', 'HasCompletedOnboarding', 'UpdatedAt'],
    json: { ActivityScopeJson: ARRAY },
    numbers: [],
    booleans: ['HasCompletedOnboarding']
  },
  // Une ligne par projet type du banc d'essai (onglet « Revue Compliance ») : un jeu de réponses
  // nommé, partagé par l'équipe conformité, qui sert à tester les règles et à en créer de
  // nouvelles. `AnswersJson` porte les réponses telles que le questionnaire les produit — même
  // forme que `AnswersJson` de CN_Projects, mais ce n'est jamais un projet réel : rien ici n'est
  // soumis, notifié ni scoré en production. `SortOrder` fixe l'ordre d'affichage de la liste
  // déroulante, comme pour CN_Rules/CN_Teams (aucun glisser-déposer côté application).
  sampleProjects: {
    keyField: 'SampleId',
    columns: [
      'Title',
      'SampleId',
      'AnswersJson',
      'SortOrder',
      'RowVersion',
      'CreatedByEmail',
      'UpdatedByEmail',
      'UpdatedAt'
    ],
    json: { AnswersJson: OBJECT },
    numbers: ['SortOrder', 'RowVersion'],
    booleans: []
  },
  // Une ligne par règle : la structure (conditions imbriquées, questions par équipe, risques
  // i18n) est trop profonde pour un mapping colonne par colonne, donc l'objet entier voyage
  // dans PayloadJson — RuleId/Title n'existent que pour l'indexation et la lecture dans SharePoint.
  rules: {
    keyField: 'RuleId',
    columns: [
      'Title',
      'RuleId',
      'PayloadJson',
      'SortOrder',
      'RowVersion',
      'CreatedByEmail',
      'UpdatedByEmail',
      'UpdatedAt'
    ],
    json: { PayloadJson: OBJECT },
    numbers: ['SortOrder', 'RowVersion'],
    booleans: []
  },
  // Une ligne par équipe : forme plate (id/name/contacts/expertise), donc colonnes explicites
  // plutôt qu'un blob JSON. `Title` reste une chaîne simple dérivée (lisible telle quelle dans
  // les vues SharePoint natives) ; `NameJson`/`Expertise` transportent le nom et le domaine
  // d'expertise traduits {en, fr, de, es}.
  teams: {
    keyField: 'TeamId',
    columns: [
      'Title',
      'TeamId',
      'ContactsJson',
      'NameJson',
      'Expertise',
      'SortOrder',
      'RowVersion',
      'CreatedByEmail',
      'UpdatedByEmail',
      'UpdatedAt'
    ],
    json: { ContactsJson: ARRAY, NameJson: OBJECT, Expertise: OBJECT },
    numbers: ['SortOrder', 'RowVersion'],
    booleans: []
  }
};

const emptyValueFor = (kind) => (kind === ARRAY ? [] : {});

const parseJsonColumn = (value, kind) => {
  if (value === null || value === undefined || value === '') {
    return emptyValueFor(kind);
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed === null || typeof parsed !== 'object') {
      return emptyValueFor(kind);
    }
    if (kind === ARRAY && !Array.isArray(parsed)) {
      return emptyValueFor(kind);
    }
    return parsed;
  } catch {
    return emptyValueFor(kind);
  }
};

export const rowToRecord = (schema, row) => {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const record = { spItemId: row.Id ?? null };

  schema.columns.forEach((column) => {
    const value = row[column];
    if (schema.json[column]) {
      record[column] = parseJsonColumn(value, schema.json[column]);
      return;
    }
    if (schema.numbers.includes(column)) {
      record[column] = value === null || value === undefined || value === '' ? null : Number(value);
      return;
    }
    if (schema.booleans.includes(column)) {
      record[column] = value === null || value === undefined ? null : Boolean(value);
      return;
    }
    record[column] = value === undefined ? null : value;
  });

  return record;
};

export const recordToFields = (schema, record) => {
  const fields = {};
  if (!record || typeof record !== 'object') {
    return fields;
  }

  schema.columns.forEach((column) => {
    const value = record[column];
    if (value === undefined) {
      return;
    }
    if (schema.json[column]) {
      fields[column] = JSON.stringify(value ?? emptyValueFor(schema.json[column]));
      return;
    }
    if (schema.booleans.includes(column)) {
      fields[column] = value === null ? null : Boolean(value);
      return;
    }
    fields[column] = value;
  });

  return fields;
};

export const selectColumns = (schema) => ['Id', ...schema.columns].join(',');
