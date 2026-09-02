export const canDownloadFiles = () =>
  typeof document !== 'undefined' &&
  typeof URL !== 'undefined' &&
  typeof URL.createObjectURL === 'function' &&
  typeof Blob !== 'undefined';

export const downloadTextFile = (
  content,
  fileName,
  { mimeType = 'application/json', logPrefix = 'download' } = {}
) => {
  if (!canDownloadFiles()) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(`[${logPrefix}] Environnement incompatible avec le téléchargement de fichiers.`);
    }
    return false;
  }

  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => {
      if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(url);
      }
    }, 0);
    return true;
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(`[${logPrefix}] Téléchargement impossible :`, error);
    }
    return false;
  }
};
