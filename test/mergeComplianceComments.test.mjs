import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeComplianceComments } from '../src/utils/mergeComplianceComments.js';

test('pas de ligne serveur (projet jamais republié) : la valeur locale est conservée telle quelle', () => {
  const local = { teams: { legal: { comment: 'ancien' } }, forcedCommitteeIds: ['c1'], legacy: 'old' };
  assert.deepEqual(mergeComplianceComments(local, null), local);
  assert.deepEqual(mergeComplianceComments(local, undefined), local);
});

test('serveur présent mais sans committees : ne supprime pas les commentaires d’équipe locaux', () => {
  const local = { teams: { legal: { comment: 'ancien' } }, forcedCommitteeIds: ['c1'], legacy: 'old' };
  const merged = mergeComplianceComments(local, {});
  assert.equal(merged.teams.legal.comment, 'ancien');
  assert.deepEqual(merged.forcedCommitteeIds, ['c1']);
});

test('serveur partiel : fusion clé par clé, le serveur l’emporte quand il a une ligne', () => {
  const local = {
    teams: { legal: { comment: 'ancien, jamais republié' }, medical: { comment: 'ancien aussi' } },
    committees: { 'committee-default': { comment: 'ancien comité' } },
    forcedCommitteeIds: ['committee-default'],
    legacy: 'texte legacy'
  };
  const server = {
    teams: { legal: { comment: 'à jour depuis SharePoint' } },
    committees: {}
  };

  const merged = mergeComplianceComments(local, server);

  assert.equal(merged.teams.legal.comment, 'à jour depuis SharePoint');
  assert.equal(merged.teams.medical.comment, 'ancien aussi');
  assert.equal(merged.committees['committee-default'].comment, 'ancien comité');
  // forcedCommitteeIds/legacy ne viennent jamais du serveur.
  assert.deepEqual(merged.forcedCommitteeIds, ['committee-default']);
  assert.equal(merged.legacy, 'texte legacy');
});

test('local vide, serveur rempli : les commentaires serveur apparaissent', () => {
  const merged = mergeComplianceComments(undefined, { teams: { legal: { comment: 'nouveau' } } });
  assert.equal(merged.teams.legal.comment, 'nouveau');
});

test('les deux vides : objet cohérent, sans planter', () => {
  assert.deepEqual(mergeComplianceComments(undefined, undefined), {});
  assert.deepEqual(mergeComplianceComments(null, {}), { teams: {}, committees: {} });
});
