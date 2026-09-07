import React, { useCallback, useEffect, useRef } from '../../react.js';
import { Plus } from '../icons.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

/**
 * Interstice cliquable entre deux sections. Il porte deux rôles :
 *  - ouvrir le choix de gabarit *à cet endroit précis* (au lieu d'une modale qui ajoutait
 *    toujours en fin de vitrine) ;
 *  - servir de cible de dépôt au réordonnancement par glisser-déposer.
 */
export const SectionInserter = ({
  index,
  isOpen,
  onOpen,
  onClose,
  templates,
  renderTemplatePreview,
  getTemplateLabel,
  onInsert,
  onHoverTemplate,
  isDropTarget = false,
  isDragActive = false,
  onDropSection
}) => {
  const { t } = useTranslation();
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    // Le sélecteur s'ouvre sous l'interstice : près du bas de la fenêtre — le cas normal
    // sur mobile, où l'inspecteur occupe déjà le bas de l'écran — il s'ouvrirait hors champ.
    popoverRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleDragOver = useCallback((event) => {
    if (!isDragActive) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }, [isDragActive]);

  const className = [
    'sge-insert',
    isOpen ? 'sge-insert--open' : '',
    isDragActive ? 'sge-insert--drag' : '',
    isDropTarget ? 'sge-insert--drop' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      data-sge-insert-index={index}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDrop={(event) => {
        if (!isDragActive) {
          return;
        }
        event.preventDefault();
        onDropSection(index);
      }}
    >
      <div className="sge-insert__rule" aria-hidden="true" />
      <button
        type="button"
        className="sge-insert__button"
        aria-expanded={isOpen}
        aria-label={t('projectShowcase.editor.addSectionHere')}
        title={t('projectShowcase.editor.addSectionHere')}
        onClick={(event) => {
          event.stopPropagation();
          if (isOpen) {
            onClose();
          } else {
            onOpen(index);
          }
        }}
      >
        <Plus className="sge-insert__icon" />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="sge-picker"
          role="dialog"
          aria-modal="false"
          aria-label={t('projectShowcase.editor.addSectionTitle')}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sge-picker__header">
            <div>
              <p className="sge-eyebrow">{t('projectShowcase.editor.addSectionTitle')}</p>
              <p className="sge-picker__hint">{t('projectShowcase.editor.addSectionHint')}</p>
            </div>
            <button type="button" className="sge-btn sge-btn--ghost sge-btn--sm" onClick={onClose}>
              {t('projectShowcase.closeButton')}
            </button>
          </div>
          <div
            className="sge-picker__grid"
            onMouseLeave={() => onHoverTemplate(null)}
          >
            {templates.map((template) => {
              const meta = getTemplateLabel(template.id);
              return (
                <button
                  key={template.id}
                  type="button"
                  className="sge-picker__card"
                  onMouseEnter={() => onHoverTemplate(template.id)}
                  onFocus={() => onHoverTemplate(template.id)}
                  onBlur={() => onHoverTemplate(null)}
                  onClick={() => onInsert(template.id, index)}
                >
                  {/* aperçu au vrai rendu : c'est le composant de la vitrine, réduit —
                      les anciennes vignettes en fil de fer gris ne montraient ni la
                      typographie, ni la palette réellement appliquées. */}
                  <span className="sge-picker__preview" aria-hidden="true">
                    <span className="sge-picker__preview-inner">
                      {renderTemplatePreview(template.id)}
                    </span>
                  </span>
                  <span className="sge-picker__name">{meta.name}</span>
                  <span className="sge-picker__desc">{meta.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionInserter;
