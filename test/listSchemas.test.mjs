import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIST_SCHEMAS,
  recordToFields,
  rowToRecord,
  selectColumns
} from '../src/utils/listSchemas.js';
import { sharepointConfig } from '../src/config/sharepointConfig.js';

const projects = LIST_SCHEMAS.projects;

test('cohérence des schémas : colonnes déclarées, clé présente, listes connues', () => {
  Object.entries(LIST_SCHEMAS).forEach(([key, schema]) => {
    assert.ok(sharepointConfig.lists[key], `${key} doit exister dans sharepointConfig.lists`);
    const columns = new Set(schema.columns);
    assert.equal(columns.size, schema.columns.length, `${key} : colonnes dupliquées`);
    if (schema.keyField) {
      assert.ok(columns.has(schema.keyField), `${key} : clé ${schema.keyField} absente des colonnes`);
    }
    [...Object.keys(schema.json), ...schema.numbers, ...schema.booleans].forEach((column) => {
      assert.ok(columns.has(column), `${key} : ${column} typée mais absente des colonnes`);
    });
  });
});

test('selectColumns : Id toujours en tête', () => {
  const select = selectColumns(projects);
  assert.ok(select.startsWith('Id,'));
  assert.ok(select.includes('AnswersJson'));
});

test('rowToRecord : analyse les colonnes JSON et conserve l’Id SharePoint', () => {
  const record = rowToRecord(projects, {
    Id: 12,
    ProjectId: 'p-1',
    Title: 'Projet',
    Status: 'Draft',
    AnswersJson: '{"q1":"oui"}',
    AnalysisJson: '{"riskScore":4}',
    ProgressAnswered: '3',
    ProgressTotal: 10,
    RowVersion: '2'
  });

  assert.equal(record.spItemId, 12);
  assert.deepEqual(record.AnswersJson, { q1: 'oui' });
  assert.deepEqual(record.AnalysisJson, { riskScore: 4 });
  assert.equal(record.ProgressAnswered, 3);
  assert.equal(record.RowVersion, 2);
  assert.equal(record.OwnerEmail, null);
});

test('rowToRecord : JSON invalide ou vide retombe sur la valeur par défaut', () => {
  const record = rowToRecord(projects, { Id: 1, AnswersJson: 'pas du json', AnalysisJson: '' });
  assert.deepEqual(record.AnswersJson, {});
  assert.deepEqual(record.AnalysisJson, {});

  const discussion = rowToRecord(LIST_SCHEMAS.projectDiscussions, {
    Id: 2,
    AttachmentsJson: '{"pasUnTableau":true}'
  });
  assert.deepEqual(discussion.AttachmentsJson, []);
});

test('rowToRecord : booléens et nombres nuls préservés', () => {
  const record = rowToRecord(LIST_SCHEMAS.complianceComments, {
    Id: 3,
    Resolved: false,
    RowVersion: null
  });
  assert.equal(record.Resolved, false);
  assert.equal(record.RowVersion, null);
});

test('recordToFields : sérialise le JSON et ignore les colonnes absentes', () => {
  const fields = recordToFields(projects, {
    ProjectId: 'p-1',
    AnswersJson: { q1: 'oui' },
    RowVersion: 2,
    spItemId: 12,
    ChampInconnu: 'ignoré'
  });

  assert.equal(fields.AnswersJson, '{"q1":"oui"}');
  assert.equal(fields.ProjectId, 'p-1');
  assert.equal(fields.RowVersion, 2);
  assert.ok(!('spItemId' in fields));
  assert.ok(!('ChampInconnu' in fields));
  assert.ok(!('Title' in fields));
});

test('aller-retour recordToFields → rowToRecord', () => {
  const source = {
    ProjectId: "Projet d'essai",
    Title: 'Projet',
    Status: 'Submitted',
    OwnerEmail: 'a@b.fr',
    CurrentEditorEmail: 'a@b.fr',
    AnswersJson: { q1: ['x', 'y'], q2: 3 },
    AnalysisJson: { riskScore: 7, teams: ['RA'] },
    ProgressAnswered: 5,
    ProgressTotal: 12,
    SubmissionDate: '2026-08-28T10:00:00.000Z',
    LastAutosaveAt: '2026-08-28T10:05:00.000Z',
    RowVersion: 4,
    CreatedByEmail: 'a@b.fr',
    UpdatedByEmail: 'c@d.fr'
  };

  const roundTrip = rowToRecord(projects, { Id: 99, ...recordToFields(projects, source) });
  assert.equal(roundTrip.spItemId, 99);
  Object.entries(source).forEach(([key, value]) => {
    assert.deepEqual(roundTrip[key], value, `divergence sur ${key}`);
  });
});

test('recordToFields : null sur une colonne JSON produit un objet vide sérialisé', () => {
  const fields = recordToFields(projects, { AnswersJson: null });
  assert.equal(fields.AnswersJson, '{}');
});
