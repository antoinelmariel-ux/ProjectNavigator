import React, { useCallback, useEffect, useRef, useState } from '../../react.js';

const hasFiles = (event) => {
  const types = event?.dataTransfer?.types;
  return Boolean(types) && Array.from(types).includes('Files');
};

// Un fichier survolant la page, où qu'il soit. Pas de compteur dragenter/dragleave au niveau
// du document : un <iframe> est un autre document, le survoler émet un dragleave sans retour.
// Le flux continu de dragover (≈ toutes les 50 ms) sert de battement : son arrêt signale la fin.
const useFileDragOverPage = (enabled) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      setIsActive(false);
      return undefined;
    }

    let timer = null;
    const stop = () => {
      clearTimeout(timer);
      setIsActive(false);
    };
    const handleDragOver = (event) => {
      if (!hasFiles(event)) {
        return;
      }
      setIsActive(true);
      clearTimeout(timer);
      timer = setTimeout(stop, 250);
    };

    document.addEventListener('dragover', handleDragOver, true);
    document.addEventListener('drop', stop, true);
    document.addEventListener('dragend', stop, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('dragover', handleDragOver, true);
      document.removeEventListener('drop', stop, true);
      document.removeEventListener('dragend', stop, true);
    };
  }, [enabled]);

  return isActive;
};

/**
 * Zone de dépôt de fichier pour la visionneuse documentaire, posée autour d'un contenu
 * existant (champ de l'inspecteur, emplacement vide ou document affiché sur le canevas).
 * Elle ne réagit qu'aux fichiers : le glisser d'une poignée de section ne transporte que du
 * texte et doit continuer d'atteindre les interstices de réordonnancement.
 *
 * Pendant le survol d'un fichier, un voile couvre le contenu : sans lui, un <iframe> (PDF,
 * Office) avalerait les événements et le dépôt atterrirait dans le document affiché.
 */
export const DocumentDropZone = ({
  enabled = true,
  isBusy = false,
  label,
  busyLabel,
  onFiles,
  className = '',
  children
}) => {
  const isFileDragging = useFileDragOverPage(enabled && !isBusy);
  const [isOver, setIsOver] = useState(false);
  const depthRef = useRef(0);

  useEffect(() => {
    if (!isFileDragging) {
      depthRef.current = 0;
      setIsOver(false);
    }
  }, [isFileDragging]);

  const handleDragEnter = useCallback((event) => {
    if (!enabled || isBusy || !hasFiles(event)) {
      return;
    }
    event.preventDefault();
    depthRef.current += 1;
    setIsOver(true);
  }, [enabled, isBusy]);

  const handleDragLeave = useCallback((event) => {
    if (!enabled || !hasFiles(event)) {
      return;
    }
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current === 0) {
      setIsOver(false);
    }
  }, [enabled]);

  const handleDragOver = useCallback((event) => {
    if (!enabled || !hasFiles(event)) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isBusy ? 'none' : 'copy';
    }
  }, [enabled, isBusy]);

  const handleDrop = useCallback((event) => {
    if (!enabled || !hasFiles(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    depthRef.current = 0;
    setIsOver(false);
    if (!isBusy && event.dataTransfer?.files?.length) {
      onFiles(event.dataTransfer.files);
    }
  }, [enabled, isBusy, onFiles]);

  if (!enabled) {
    return children;
  }

  const zoneClassName = [
    'sge-dropzone',
    isFileDragging ? 'sge-dropzone--armed' : '',
    isOver ? 'sge-dropzone--over' : '',
    isBusy ? 'sge-dropzone--busy' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={zoneClassName}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-busy={isBusy || undefined}
    >
      {children}
      {(isFileDragging || isBusy) && (
        <div className="sge-dropzone__veil" aria-hidden={!isBusy}>
          <span className="sge-dropzone__label" role={isBusy ? 'status' : undefined}>
            {isBusy ? busyLabel : label}
          </span>
        </div>
      )}
    </div>
  );
};

export default DocumentDropZone;
