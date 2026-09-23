import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOnboardingConfig } from '../src/utils/onboarding.js';
import {
  initialOnboardingTourConfig,
  SUPERSEDED_ONBOARDING_STEP_DEFAULTS
} from '../src/data/onboardingTour.js';

const withStepPatch = (stepId, patch) => ({
  ...initialOnboardingTourConfig,
  steps: initialOnboardingTourConfig.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step))
});

const findStep = (config, stepId) => config.steps.find((step) => step.id === stepId);

test('une valeur par défaut remplacée est mise à jour dans une config persistée', () => {
  for (const [stepId, fields] of Object.entries(SUPERSEDED_ONBOARDING_STEP_DEFAULTS)) {
    const defaultStep = findStep(initialOnboardingTourConfig, stepId);
    assert.ok(defaultStep, `${stepId} doit exister dans le tour par défaut`);
    for (const [field, oldValues] of Object.entries(fields)) {
      for (const oldValue of oldValues) {
        assert.notEqual(oldValue, defaultStep[field], `${stepId}.${field} : l'ancienne valeur ne doit plus être le défaut`);
        const normalized = normalizeOnboardingConfig(withStepPatch(stepId, { [field]: oldValue }));
        assert.equal(findStep(normalized, stepId)[field], defaultStep[field]);
      }
    }
  }
});

test('une valeur personnalisée en back-office est conservée', () => {
  const normalized = normalizeOnboardingConfig(
    withStepPatch('showcase-share-settings', { target: '#mon-selecteur', placement: 'left' })
  );
  const step = findStep(normalized, 'showcase-share-settings');
  assert.equal(step.target, '#mon-selecteur');
  assert.equal(step.placement, 'left');
});

test('le reste d une config personnalisée survit à la mise à jour', () => {
  const customTitle = { fr: 'Titre maison' };
  const config = withStepPatch('question-answer-types', {
    target: '[data-tour-id="question-main-content"]',
    title: customTitle
  });
  const step = findStep(normalizeOnboardingConfig(config), 'question-answer-types');
  assert.equal(step.target, '[data-tour-id="question-answer-input"]');
  assert.deepEqual(step.title, customTitle);
});
