// Logique pure du nouvel éditeur de vitrine : superposition du brouillon sur les réponses
// (aperçu vivant), réordonnancement des sections, historique annuler/rétablir et brouillon
// persistant. Volontairement sans React ni DOM : c'est la seule partie de l'éditeur
// couverte par `npm test`.
import { loadPersistedMockMap, savePersistedMockMap } from './mockProviderPersistence.js';

export const SHOWCASE_DRAFT_STORAGE_KEY = 'complianceNavigatorShowcaseDrafts';

// Nombre de pas d'historique conservés. Au-delà, les plus anciens sont oubliés : une
// session d'édition longue ne doit pas faire grossir indéfiniment la mémoire.
export const HISTORY_LIMIT = 60;

/**
 * Réponses telles que la vitrine doit les afficher pendant l'édition : les valeurs du
 * questionnaire, recouvertes par le brouillon en cours de saisie. C'est la brique qui rend
 * l'aperçu vivant — sans elle, les rendus lisent `answers` et ne bougent qu'à la publication.
 */
export const buildPreviewAnswers = (answers, overlay) => {
  const base = answers && typeof answers === 'object' ? answers : {};

  if (!overlay || typeof overlay !== 'object') {
    return base;
  }

  const merged = { ...base };
  const { fieldValues, customSections, sectionOrder } = overlay;

  if (fieldValues && typeof fieldValues === 'object') {
    Object.keys(fieldValues).forEach((fieldId) => {
      merged[fieldId] = fieldValues[fieldId];
    });
  }

  if (Array.isArray(customSections)) {
    merged.customShowcaseSections = customSections;
  }

  if (Array.isArray(sectionOrder)) {
    merged.showcaseSectionOrder = sectionOrder;
  }

  return merged;
};

// Ordre par défaut des sections intégrées de la vitrine, et table de reprise des blocs qui
// ont été scindés depuis. Une vitrine déjà publiée garde l'ancien identifiant dans son ordre
// enregistré : sans cette reprise, les moitiés nouvellement créées seraient renvoyées en fin
// de vitrine au lieu de rester à leur place dans le récit.
export const SHOWCASE_SECTION_IDS = [
  'notice',
  'hero',
  'problem',
  'solution',
  'benefits',
  'objectives',
  'indicators',
  'team',
  'timeline'
];

export const LEGACY_SHOWCASE_SECTION_REPLACEMENTS = {
  solution: ['solution', 'benefits'],
  innovation: ['objectives', 'indicators'],
  'innovation-metrics': ['indicators']
};

export const normalizeSectionOrder = (rawOrder, customSections) => {
  const customIds = Array.isArray(customSections)
    ? customSections.map(section => section?.id).filter(id => typeof id === 'string')
    : [];
  const fallbackOrder = [...SHOWCASE_SECTION_IDS, ...customIds];

  if (!Array.isArray(rawOrder)) {
    return fallbackOrder;
  }

  const knownIds = new Set(fallbackOrder);
  const seen = new Set();
  const normalized = [];

  rawOrder.forEach(entry => {
    if (typeof entry !== 'string') {
      return;
    }
    const expanded = LEGACY_SHOWCASE_SECTION_REPLACEMENTS[entry] || [entry];
    expanded.forEach(sectionId => {
      if (!knownIds.has(sectionId) || seen.has(sectionId)) {
        return;
      }
      normalized.push(sectionId);
      seen.add(sectionId);
    });
  });

  fallbackOrder.forEach(entry => {
    if (!seen.has(entry)) {
      normalized.push(entry);
    }
  });

  return normalized;
};

/**
 * Déplace un élément d'un tableau. `toIndex` est la position d'insertion *avant* retrait
 * (celle affichée à l'utilisateur quand il relâche entre deux sections), ce qui impose de
 * décaler d'un cran lorsqu'on descend un élément.
 */
export const moveArrayItem = (items, fromIndex, toIndex) => {
  if (!Array.isArray(items)) {
    return [];
  }

  const source = Math.trunc(fromIndex);
  const rawTarget = Math.trunc(toIndex);

  if (!Number.isFinite(source) || !Number.isFinite(rawTarget)) {
    return items.slice();
  }

  if (source < 0 || source >= items.length) {
    return items.slice();
  }

  const boundedTarget = Math.max(0, Math.min(items.length, rawTarget));
  const insertionIndex = source < boundedTarget ? boundedTarget - 1 : boundedTarget;

  if (insertionIndex === source) {
    return items.slice();
  }

  const next = items.slice();
  const [moved] = next.splice(source, 1);
  next.splice(Math.max(0, Math.min(next.length, insertionIndex)), 0, moved);
  return next;
};

export const createHistory = (present) => ({ past: [], present, future: [] });

export const pushHistory = (history, present, { limit = HISTORY_LIMIT } = {}) => {
  const safeHistory = history && typeof history === 'object'
    ? history
    : createHistory(present);
  const past = Array.isArray(safeHistory.past) ? safeHistory.past : [];
  const nextPast = [...past, safeHistory.present];

  return {
    past: nextPast.length > limit ? nextPast.slice(nextPast.length - limit) : nextPast,
    present,
    // toute nouvelle action invalide la branche « rétablir » : c'est la sémantique
    // attendue d'un Ctrl+Z classique.
    future: []
  };
};

export const canUndoHistory = (history) => Array.isArray(history?.past) && history.past.length > 0;

export const canRedoHistory = (history) => Array.isArray(history?.future) && history.future.length > 0;

export const undoHistory = (history) => {
  if (!canUndoHistory(history)) {
    return history;
  }

  const past = history.past.slice();
  const present = past.pop();

  return {
    past,
    present,
    future: [history.present, ...(Array.isArray(history.future) ? history.future : [])]
  };
};

export const redoHistory = (history) => {
  if (!canRedoHistory(history)) {
    return history;
  }

  const [present, ...future] = history.future;

  return {
    past: [...(Array.isArray(history.past) ? history.past : []), history.present],
    present,
    future
  };
};

const normalizeDraftKey = (projectId) =>
  typeof projectId === 'string' && projectId.trim().length > 0 ? projectId.trim() : '__no-project__';

/**
 * Brouillon d'édition : ce que l'utilisateur a modifié sans encore publier. Persisté à part
 * de `complianceNavigatorState` — fermer l'onglet en pleine édition ne doit plus tout perdre,
 * mais un brouillon ne doit pas non plus polluer les réponses réellement enregistrées.
 */
export const loadShowcaseDraft = (projectId) => {
  const stored = loadPersistedMockMap(SHOWCASE_DRAFT_STORAGE_KEY).get(normalizeDraftKey(projectId));
  return stored && typeof stored === 'object' ? stored : null;
};

export const saveShowcaseDraft = (projectId, draft) => {
  const drafts = loadPersistedMockMap(SHOWCASE_DRAFT_STORAGE_KEY);
  drafts.set(normalizeDraftKey(projectId), {
    ...draft,
    savedAt: new Date().toISOString()
  });
  savePersistedMockMap(SHOWCASE_DRAFT_STORAGE_KEY, drafts);
};

export const clearShowcaseDraft = (projectId) => {
  const drafts = loadPersistedMockMap(SHOWCASE_DRAFT_STORAGE_KEY);
  if (!drafts.delete(normalizeDraftKey(projectId))) {
    return;
  }
  savePersistedMockMap(SHOWCASE_DRAFT_STORAGE_KEY, drafts);
};
