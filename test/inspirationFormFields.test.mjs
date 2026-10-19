import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUniqueInspirationFormFieldId,
  createDefaultInspirationFiltersConfig,
  finalizeInspirationFormFieldOptions,
  getInspirationFiltersUsingFormField,
  isBuiltInInspirationFormField,
  sanitizeInspirationFormFieldId
} from '../src/utils/inspirationConfig.js';

test('default form fields are built-in, custom ones are not', () => {
  assert.equal(isBuiltInInspirationFormField('title'), true);
  assert.equal(isBuiltInInspirationFormField('visibility'), true);
  assert.equal(isBuiltInInspirationFormField('contexteProjet'), false);
});

test('a field id is derived from its label without accents or spaces', () => {
  assert.equal(sanitizeInspirationFormFieldId('  Résultat obtenu !'), 'Resultat_obtenu');
  assert.equal(sanitizeInspirationFormFieldId(''), '');
  assert.equal(sanitizeInspirationFormFieldId(null), '');
});

test('a unique id never collides with an existing one', () => {
  const ids = new Set(['title', 'title_2']);
  assert.equal(buildUniqueInspirationFormFieldId('title', ids), 'title_3');
  assert.equal(buildUniqueInspirationFormFieldId('budget', ids), 'budget');
  assert.equal(buildUniqueInspirationFormFieldId('', ids), 'field');
});

test('filters are linked to a form field by source id, or by their own id', () => {
  const filters = createDefaultInspirationFiltersConfig();
  assert.deepEqual(getInspirationFiltersUsingFormField(filters, 'country').map((f) => f.id), ['country']);
  assert.deepEqual(getInspirationFiltersUsingFormField(filters, 'description'), []);

  const custom = { fields: [{ id: 'f1', type: 'select', label: 'X', sourceQuestionId: 'budget' }] };
  assert.deepEqual(getInspirationFiltersUsingFormField(custom, 'budget').map((f) => f.id), ['f1']);
});

test('options keep their stored value, new ones derive it from the label, empty rows are dropped', () => {
  const options = finalizeInspirationFormFieldOptions([
    { value: 'PS', label: { fr: 'Professionnel', en: 'HCP' } },
    { value: '', label: { fr: 'Patient' } },
    { value: '', label: { fr: '   ' } },
    { value: '', label: { fr: 'Patient' } }
  ]);

  assert.deepEqual(options, [
    { value: 'PS', label: { fr: 'Professionnel', en: 'HCP' } },
    { value: 'Patient', label: { fr: 'Patient' } },
    { value: 'Patient (2)', label: { fr: 'Patient' } }
  ]);
});
