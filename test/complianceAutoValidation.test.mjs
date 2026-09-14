import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTeamAutoValidated,
  getAutoValidationMessage,
  resolveEffectiveTeamComplianceEntry,
  AUTO_VALIDATION_STATUS
} from '../src/utils/complianceAutoValidation.js';

test('isTeamAutoValidated : équipe déclenchée mais jamais notifiée', () => {
  const analysis = { teams: ['quality'], notifiedTeams: [] };
  assert.equal(isTeamAutoValidated(analysis, 'quality'), true);
});

test('isTeamAutoValidated : équipe notifiée n’est jamais auto-validée', () => {
  const analysis = { teams: ['quality'], notifiedTeams: ['quality'] };
  assert.equal(isTeamAutoValidated(analysis, 'quality'), false);
});

test('isTeamAutoValidated : notifiedTeams absent (donnée figée/fixture) ne déclenche rien', () => {
  const analysis = { teams: ['quality'] };
  assert.equal(isTeamAutoValidated(analysis, 'quality'), false);
});

test('isTeamAutoValidated : équipe absente de analysis.teams', () => {
  const analysis = { teams: ['legal'], notifiedTeams: [] };
  assert.equal(isTeamAutoValidated(analysis, 'quality'), false);
});

test('getAutoValidationMessage : concatène les questions préparées pour l’équipe', () => {
  const analysis = {
    questions: {
      quality: [{ text: { fr: 'Point 1' } }, { text: { fr: 'Point 2' } }]
    }
  };
  assert.equal(getAutoValidationMessage(analysis, 'quality', 'fr'), 'Point 1\n\nPoint 2');
});

test('getAutoValidationMessage : aucune question renvoie une chaîne vide', () => {
  assert.equal(getAutoValidationMessage({}, 'quality', 'fr'), '');
});

test('resolveEffectiveTeamComplianceEntry : un vrai statut/commentaire existant prime toujours', () => {
  const analysis = { teams: ['quality'], notifiedTeams: [] };
  const rawEntry = { status: 'rejected', comment: 'Non conforme' };
  assert.deepEqual(resolveEffectiveTeamComplianceEntry(rawEntry, analysis, 'quality', 'fr'), rawEntry);
});

test('resolveEffectiveTeamComplianceEntry : équipe non notifiée sans avis devient validée sous conditions', () => {
  const analysis = {
    teams: ['quality'],
    notifiedTeams: [],
    questions: { quality: [{ text: { fr: 'Merci de fournir X' } }] }
  };
  const result = resolveEffectiveTeamComplianceEntry(undefined, analysis, 'quality', 'fr');
  assert.equal(result.status, AUTO_VALIDATION_STATUS);
  assert.equal(result.comment, 'Merci de fournir X');
  assert.equal(result.isAutoValidated, true);
});

test('resolveEffectiveTeamComplianceEntry : équipe notifiée sans avis reste vide', () => {
  const analysis = { teams: ['quality'], notifiedTeams: ['quality'] };
  assert.equal(resolveEffectiveTeamComplianceEntry(undefined, analysis, 'quality', 'fr'), null);
});

test('resolveEffectiveTeamComplianceEntry : préserve les réponses déjà échangées sur le fil', () => {
  const analysis = { teams: ['quality'], notifiedTeams: [] };
  const rawEntry = { replies: [{ id: 'reply-1', message: 'Une question' }] };
  const result = resolveEffectiveTeamComplianceEntry(rawEntry, analysis, 'quality', 'fr');
  assert.equal(result.status, AUTO_VALIDATION_STATUS);
  assert.deepEqual(result.replies, rawEntry.replies);
});
