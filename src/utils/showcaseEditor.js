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
