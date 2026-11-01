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

test('même avis : la date où il a été rendu et sa version survivent au rechargement depuis SharePoint', () => {
  const local = {
    teams: {
      legal: {
        status: 'validated',
        comment: 'RAS',
        statusUpdatedAt: '2026-03-02T10:00:00.000Z',
        reviewedAt: '2026-03-02T10:00:00.000Z',
        reviewedVersion: 2,
        needsReviewSince: 3
      }
    }
  };
  // Ligne écrite avant que la date voyage dans ClaimJson : seule UpdatedAt, avancée par une réponse.
  const server = { teams: { legal: { status: 'validated', comment: 'RAS', statusUpdatedAt: '2026-03-09T08:00:00.000Z' } } };

  const merged = mergeComplianceComments(local, server).teams.legal;

  assert.equal(merged.statusUpdatedAt, '2026-03-02T10:00:00.000Z');
  assert.equal(merged.reviewedAt, '2026-03-02T10:00:00.000Z');
  assert.equal(merged.reviewedVersion, 2);
  assert.equal(merged.needsReviewSince, 3);
});

test('avis différent côté serveur : sa date fait foi, la version locale ne lui est pas prêtée', () => {
  const local = {
    committees: {
      'committee-default': { status: 'pending_information', comment: 'À préciser', statusUpdatedAt: '2026-03-02T10:00:00.000Z', reviewedVersion: 1 }
    }
  };
  const server = {
    committees: {
      'committee-default': { status: 'validated', comment: 'OK en séance', statusUpdatedAt: '2026-03-12T15:00:00.000Z' }
    }
  };

  const merged = mergeComplianceComments(local, server).committees['committee-default'];

  assert.equal(merged.statusUpdatedAt, '2026-03-12T15:00:00.000Z');
  assert.equal(merged.reviewedVersion, undefined);
});
