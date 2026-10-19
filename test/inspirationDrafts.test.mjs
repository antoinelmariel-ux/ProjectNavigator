import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasInspirationContent,
  isEmptyInspirationDraft,
  pruneEmptyInspirationDrafts
} from '../src/utils/inspirationDrafts.js';

const blank = (extra = {}) => ({
  id: 'draft',
  title: '',
  labName: '',
  documents: [],
  createdAt: '2026-10-18T10:00:00.000Z',
  updatedAt: '2026-10-18T10:00:00.000Z',
  ...extra
});

test('une ébauche sans rien de saisi est vide', () => {
  assert.equal(hasInspirationContent(blank()), false);
  assert.equal(isEmptyInspirationDraft(blank()), true);
});

test('des espaces seuls ne comptent pas comme du contenu', () => {
  assert.equal(isEmptyInspirationDraft(blank({ title: '   ' })), true);
});

test('un champ renseigné ou un document suffit à garder l’ébauche', () => {
  assert.equal(isEmptyInspirationDraft(blank({ title: 'Parcours patient' })), false);
  assert.equal(isEmptyInspirationDraft(blank({ documents: [{ name: 'a.pdf' }] })), false);
});

test('une inspiration déjà enregistrée (updatedAt postérieur) n’est jamais balayée', () => {
  assert.equal(isEmptyInspirationDraft(blank({ updatedAt: '2026-10-18T11:00:00.000Z' })), false);
});

test('une entrée sans date de création n’est pas considérée comme une ébauche', () => {
  assert.equal(isEmptyInspirationDraft(blank({ createdAt: '', updatedAt: '' })), false);
});

test('le balayage retire les ébauches vides et garde la même référence quand il n’y a rien à retirer', () => {
  const kept = blank({ id: 'kept', title: 'Idée' });
  const list = [blank(), kept];
  assert.deepEqual(pruneEmptyInspirationDrafts(list).map((p) => p.id), ['kept']);

  const clean = [kept];
  assert.equal(pruneEmptyInspirationDrafts(clean), clean);
  assert.equal(pruneEmptyInspirationDrafts(undefined), undefined);
});
