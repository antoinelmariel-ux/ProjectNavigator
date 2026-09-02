import { initialOnboardingTourConfig } from '../data/onboardingTour.js';

const DEFAULT_ACTION_VARIANT = 'ghost';
const ALLOWED_ACTIONS = new Set(['next', 'prev', 'close', 'finish', 'goTo']);
const ALLOWED_HIGHLIGHT_SCOPES = new Set(['target', 'page']);

const sanitizeString = (value, fallback = '') =>
  typeof value === 'string' ? value.trim() : fallback;

const sanitizeText = (value, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim().length > 0 ? value : fallback;
};

const normalizeStepId = (value, index) => {
  const candidate = sanitizeString(value);
  if (candidate) {
    return candidate;
  }
  return `step-${index + 1}`;
};

export const createOnboardingStep = (index = 0) => ({
  id: `step-${index + 1}`,
  target: '#tour-onboarding-anchor',
  title: 'Nouvelle étape',
  content: '',
  placement: 'bottom',
  highlightScope: 'target',
  showDefaultButtons: true,
  actions: []
});

export const createOnboardingAction = () => ({
  id: `action-${Date.now().toString(36)}`,
  label: 'Nouvelle action',
  action: 'next',
  stepId: '',
  variant: 'ghost'
});

export const normalizeOnboardingConfig = (config, fallback = initialOnboardingTourConfig) => {
  const base = config && typeof config === 'object' ? config : fallback;
  const fallbackLabels = fallback?.labels || {};
  const labels = base?.labels || {};

  const steps = Array.isArray(base?.steps) ? base.steps : Array.isArray(fallback?.steps) ? fallback.steps : [];

  return {
    allowClose: typeof base?.allowClose === 'boolean' ? base.allowClose : fallback?.allowClose ?? true,
    showStepDots: typeof base?.showStepDots === 'boolean' ? base.showStepDots : fallback?.showStepDots ?? true,
    labels: {
      next: sanitizeText(labels.next, sanitizeText(fallbackLabels.next, 'Suivant')),
      prev: sanitizeText(labels.prev, sanitizeText(fallbackLabels.prev, 'Précédent')),
      close: sanitizeText(labels.close, sanitizeText(fallbackLabels.close, 'Fermer')),
      finish: sanitizeText(labels.finish, sanitizeText(fallbackLabels.finish, 'Terminer'))
    },
    steps: steps.map((step, index) => {
      const fallbackStep = fallback?.steps?.[index] || {};
      const rawStep = step && typeof step === 'object' ? step : fallbackStep;
      const actions = Array.isArray(rawStep?.actions) ? rawStep.actions : [];

      return {
        id: normalizeStepId(rawStep?.id, index),
        target: sanitizeString(rawStep?.target, sanitizeString(fallbackStep?.target)),
        title: sanitizeText(rawStep?.title, sanitizeText(fallbackStep?.title)),
        content: sanitizeText(rawStep?.content, sanitizeText(fallbackStep?.content)),
        placement: sanitizeString(rawStep?.placement, sanitizeString(fallbackStep?.placement)),
        highlightScope: ALLOWED_HIGHLIGHT_SCOPES.has(rawStep?.highlightScope)
          ? rawStep.highlightScope
          : ALLOWED_HIGHLIGHT_SCOPES.has(fallbackStep?.highlightScope)
            ? fallbackStep.highlightScope
            : 'target',
        highlightPadding: typeof rawStep?.highlightPadding === 'number'
          ? rawStep.highlightPadding
          : fallbackStep?.highlightPadding,
        scrollIntoViewOptions: rawStep?.scrollIntoViewOptions || fallbackStep?.scrollIntoViewOptions,
        scrollDuration: rawStep?.scrollDuration || fallbackStep?.scrollDuration,
        showDefaultButtons: rawStep?.showDefaultButtons !== false,
        actions: actions
          .filter(action => action && typeof action === 'object')
          .map((action) => ({
            id: sanitizeString(action.id) || `action-${index}-${Date.now().toString(36)}`,
            label: sanitizeText(action.label, 'Action'),
            action: ALLOWED_ACTIONS.has(action.action) ? action.action : 'next',
            stepId: sanitizeString(action.stepId),
            variant: sanitizeString(action.variant, DEFAULT_ACTION_VARIANT)
          }))
      };
    })
  };
};
