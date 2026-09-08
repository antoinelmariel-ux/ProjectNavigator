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

// Avant l'ajout des traductions, titre/contenu/libellés du tour étaient de simples chaînes
// françaises. Une config déjà persistée (localStorage) avant ce changement les garde telles
// quelles : `resolveLocalizedText` affiche alors ce texte brut quelle que soit la langue
// choisie, ce qui donne l'impression que l'onboarding "ne s'affiche qu'en français". Si la
// chaîne persistée correspond au texte français du step par défaut, on la remplace par
// l'objet {en, fr, de, es} à jour ; sinon (texte réellement personnalisé) on la convertit en
// {fr: ...} pour rester cohérent avec le repli anglais documenté dans l'éditeur back-office.
const upgradeLegacyLocalizedField = (rawValue, fallbackValue) => {
  if (typeof rawValue !== 'string') {
    return rawValue;
  }

  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return rawValue;
  }

  if (fallbackValue && typeof fallbackValue === 'object' && fallbackValue.fr === trimmed) {
    return fallbackValue;
  }

  return { fr: trimmed };
};

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
      next: sanitizeLocalizedText(upgradeLegacyLocalizedField(labels.next, fallbackLabels.next), sanitizeLocalizedText(fallbackLabels.next, DEFAULT_TOUR_LABELS.next)),
      prev: sanitizeLocalizedText(upgradeLegacyLocalizedField(labels.prev, fallbackLabels.prev), sanitizeLocalizedText(fallbackLabels.prev, DEFAULT_TOUR_LABELS.prev)),
      close: sanitizeLocalizedText(upgradeLegacyLocalizedField(labels.close, fallbackLabels.close), sanitizeLocalizedText(fallbackLabels.close, DEFAULT_TOUR_LABELS.close)),
      finish: sanitizeLocalizedText(upgradeLegacyLocalizedField(labels.finish, fallbackLabels.finish), sanitizeLocalizedText(fallbackLabels.finish, DEFAULT_TOUR_LABELS.finish))
    },
    steps: steps.map((step, index) => {
      const rawStep = step && typeof step === 'object' ? step : {};
      const fallbackStep = fallback?.steps?.find((entry) => entry?.id === rawStep?.id) || fallback?.steps?.[index] || {};
      const actions = Array.isArray(rawStep?.actions) ? rawStep.actions : [];

      return {
        id: normalizeStepId(rawStep?.id, index),
        target: sanitizeString(rawStep?.target, sanitizeString(fallbackStep?.target)),
        title: sanitizeLocalizedText(upgradeLegacyLocalizedField(rawStep?.title, fallbackStep?.title), sanitizeLocalizedText(fallbackStep?.title)),
        content: sanitizeLocalizedText(upgradeLegacyLocalizedField(rawStep?.content, fallbackStep?.content), sanitizeLocalizedText(fallbackStep?.content)),
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
          .map((action, actionIndex) => {
            const fallbackAction = fallbackStep?.actions?.find((entry) => entry?.id === action.id)
              || fallbackStep?.actions?.[actionIndex];
            return {
              id: sanitizeString(action.id) || `action-${index}-${Date.now().toString(36)}`,
              label: sanitizeLocalizedText(upgradeLegacyLocalizedField(action.label, fallbackAction?.label), NEW_ACTION_LABEL),
              action: ALLOWED_ACTIONS.has(action.action) ? action.action : 'next',
              stepId: sanitizeString(action.stepId),
              variant: sanitizeString(action.variant, DEFAULT_ACTION_VARIANT)
            };
          })
      };
    })
  };
};
