import { canDownloadFiles, downloadTextFile } from './download.js';

const INSPIRATION_INDEX_STORAGE_KEY = 'complianceNavigatorInspirationExportIndex';

const getStoredInspirationIndex = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(INSPIRATION_INDEX_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch (error) {
    return null;
  }
};

const storeNextInspirationIndex = (value) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(INSPIRATION_INDEX_STORAGE_KEY, String(value));
  } catch (error) {
    // Ignore storage failures.
  }
};

export const getNextInspirationExportIndex = () => {
  const stored = getStoredInspirationIndex();
  return stored || 1;
};

export const buildInspirationExport = (project) => {
  const payload = project && typeof project === 'object' ? project : {};
  const { externalSourceId, externalSourceChecksum, ...cleaned } = payload;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    inspiration: cleaned
  };
};

export const downloadInspirationJson = (project, { index } = {}) => {
  if (!project) {
    return false;
  }

  const exportPayload = buildInspirationExport(project);
  let jsonString = '';

  try {
    jsonString = JSON.stringify(exportPayload, null, 2);
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[inspirationExport] Impossible de sérialiser l’inspiration :', error);
    }
    return false;
  }

  if (!canDownloadFiles()) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[inspirationExport] Environnement incompatible avec le téléchargement de fichiers.');
    }
    return false;
  }

  const safeIndex = Number.isFinite(index) && index > 0 ? index : getNextInspirationExportIndex();
  const fileName = `inspiration${safeIndex}.json`;

  const downloaded = downloadTextFile(jsonString, fileName, { logPrefix: 'inspirationExport' });
  if (downloaded) {
    storeNextInspirationIndex(safeIndex + 1);
  }
  return downloaded;
};

export const exportInspirationToFile = (project) => downloadInspirationJson(project);
