import { initialOnboardingTourConfig } from '../data/onboardingTour.js';
import { trimLocalizedValue, isLocalizedValueEmpty } from './localizedContent.js';

const DEFAULT_ACTION_VARIANT = 'ghost';
const ALLOWED_ACTIONS = new Set(['next', 'prev', 'close', 'finish', 'goTo']);
const ALLOWED_HIGHLIGHT_SCOPES = new Set(['target', 'page']);

const NEW_STEP_TITLE = { en: 'New step', fr: 'Nouvelle étape', de: 'Neuer Schritt', es: 'Nuevo paso' };
const NEW_ACTION_LABEL = { en: 'New action', fr: 'Nouvelle action', de: 'Neue Aktion', es: 'Nueva acción' };
const DEFAULT_TOUR_LABELS = {
  next: { en: 'Next', fr: 'Suivant', de: 'Weiter', es: 'Siguiente' },
  prev: { en: 'Previous', fr: 'Précédent', de: 'Zurück', es: 'Anterior' },
  close: { en: 'Close', fr: 'Fermer', de: 'Schließen', es: 'Cerrar' },
  finish: { en: 'Finish', fr: 'Terminer', de: 'Fertigstellen', es: 'Finalizar' }
};

const sanitizeString = (value, fallback = '') =>
  typeof value === 'string' ? value.trim() : fallback;

// Comme sanitizeString, mais pour les champs traduisibles (titre/contenu d'étape, libellés
// de boutons) : accepte soit une chaîne simple (contenu historique avant traduction), soit
// un objet {en, fr, de, es}.
const sanitizeLocalizedText = (value, fallback = {}) => {
  if (typeof value === 'string') {
    return value.trim().length > 0 ? value : fallback;
  }

  if (value && typeof value === 'object') {
    const trimmed = trimLocalizedValue(value);
    return isLocalizedValueEmpty(trimmed) ? fallback : trimmed;
  }

  return fallback;
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
  title: NEW_STEP_TITLE,
  content: '',
  placement: 'bottom',
  highlightScope: 'target',
  showDefaultButtons: true,
  actions: []
});

export const createOnboardingAction = () => ({
  id: `action-${Date.now().toString(36)}`,
  label: NEW_ACTION_LABEL,
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
      next: sanitizeLocalizedText(labels.next, sanitizeLocalizedText(fallbackLabels.next, DEFAULT_TOUR_LABELS.next)),
      prev: sanitizeLocalizedText(labels.prev, sanitizeLocalizedText(fallbackLabels.prev, DEFAULT_TOUR_LABELS.prev)),
      close: sanitizeLocalizedText(labels.close, sanitizeLocalizedText(fallbackLabels.close, DEFAULT_TOUR_LABELS.close)),
      finish: sanitizeLocalizedText(labels.finish, sanitizeLocalizedText(fallbackLabels.finish, DEFAULT_TOUR_LABELS.finish))
    },
    steps: steps.map((step, index) => {
      const fallbackStep = fallback?.steps?.[index] || {};
      const rawStep = step && typeof step === 'object' ? step : fallbackStep;
      const actions = Array.isArray(rawStep?.actions) ? rawStep.actions : [];

      return {
        id: normalizeStepId(rawStep?.id, index),
        target: sanitizeString(rawStep?.target, sanitizeString(fallbackStep?.target)),
        title: sanitizeLocalizedText(rawStep?.title, sanitizeLocalizedText(fallbackStep?.title)),
        content: sanitizeLocalizedText(rawStep?.content, sanitizeLocalizedText(fallbackStep?.content)),
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
            label: sanitizeLocalizedText(action.label, NEW_ACTION_LABEL),
            action: ALLOWED_ACTIONS.has(action.action) ? action.action : 'next',
            stepId: sanitizeString(action.stepId),
            variant: sanitizeString(action.variant, DEFAULT_ACTION_VARIANT)
          }))
      };
    })
  };
};
