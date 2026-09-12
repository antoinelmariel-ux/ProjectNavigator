import React from '../../react.js';
import { Eye, EyeOff, GripVertical, Plus } from '../icons.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

/**
 * Plan de la vitrine. L'ancienne liste de réordonnancement vivait en haut d'un formulaire
 * de 17 champs, loin du contenu qu'elle décrivait ; elle devient ici un rail secondaire —
 * le geste principal (glisser une section, insérer entre deux) se fait sur le canvas.
 */
export const ShowcaseOutline = ({
  sections,
  activeSectionId,
  onSelect,
  onToggleVisibility,
  onMove,
  onInsertAt,
  onClose,
  isDragActive,
  dropIndex,
  onDragStart,
  onDragEnd,
  onDropSection
}) => {
  const { t } = useTranslation();

  const renderDropZone = (index) => (
    <li
      key={`outline-drop-${index}`}
      className={`sge-outline__drop${isDragActive ? ' sge-outline__drop--active' : ''}${
        dropIndex === index ? ' sge-outline__drop--target' : ''
      }`}
      onDragOver={(event) => {
        if (!isDragActive) {
          return;
        }
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
      }}
      onDrop={(event) => {
        if (!isDragActive) {
          return;
        }
        event.preventDefault();
        onDropSection(index);
      }}
    >
      <button
        type="button"
        className="sge-outline__insert"
        aria-label={t('projectShowcase.editor.addSectionHere')}
        title={t('projectShowcase.editor.addSectionHere')}
        onClick={() => onInsertAt(index)}
      >
        <Plus className="sge-outline__insert-icon" />
      </button>
    </li>
  );

  return (
    <aside className="sge sge-outline" aria-label={t('projectShowcase.editor.outline')}>
      <div className="sge-outline__header">
        <p className="sge-eyebrow">{t('projectShowcase.editor.outline')}</p>
        <button
          type="button"
          className="sge-btn sge-btn--ghost sge-btn--sm"
          onClick={onClose}
        >
          {t('projectShowcase.closeButton')}
        </button>
      </div>
      <ol className="sge-outline__list">
        {renderDropZone(0)}
        {sections.map((section, index) => {
          // « notice » n'a ni champ ni réglage : le canvas ne lui dédie pas non plus de
          // cadre (voir ProjectShowcase.jsx). L'omettre ici aussi maintient l'invariant
          // « le plan suit le canvas » — sinon les deux listes se désynchronisent d'un cran.
          if (section.id === 'notice') {
            return <React.Fragment key={section.id}>{renderDropZone(index + 1)}</React.Fragment>;
          }

          return (
          <React.Fragment key={section.id}>
            <li
              className={`sge-outline__item${section.id === activeSectionId ? ' sge-outline__item--active' : ''}${
                section.isHiddenInLight ? ' sge-outline__item--hidden' : ''
              }`}
            >
              <span
                className="sge-outline__grip"
                draggable
                role="button"
                tabIndex={-1}
                aria-hidden="true"
                onDragStart={(event) => {
                  if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = 'move';
                    try {
                      event.dataTransfer.setData('text/plain', String(index));
                    } catch (_error) {
                      // ignoré : l'index est aussi conservé dans l'état de glisser-déposer
                    }
                  }
                  onDragStart(index);
                }}
                onDragEnd={onDragEnd}
              >
                <GripVertical className="sge-outline__grip-icon" />
              </span>
              <button
                type="button"
                className="sge-outline__label"
                onClick={() => onSelect(section.id)}
              >
                <span className="sge-outline__index">{String(index + 1).padStart(2, '0')}</span>
                <span className="sge-outline__text">{section.plainTitle}</span>
              </button>
              <span className="sge-outline__actions">
                <button
                  type="button"
                  className="sge-outline__action"
                  aria-pressed={!section.isHiddenInLight}
                  aria-label={
                    section.isHiddenInLight
                      ? t('projectShowcase.editor.showInLight')
                      : t('projectShowcase.editor.hideInLight')
                  }
                  title={
                    section.isHiddenInLight
                      ? t('projectShowcase.editor.showInLight')
                      : t('projectShowcase.editor.hideInLight')
                  }
                  onClick={() => onToggleVisibility(section.id)}
                >
                  {section.isHiddenInLight
                    ? <EyeOff className="sge-outline__action-icon" />
                    : <Eye className="sge-outline__action-icon" />}
                </button>
                <button
                  type="button"
                  className="sge-outline__action"
                  aria-label={t('projectShowcase.editor.sectionMoveUp')}
                  title={t('projectShowcase.editor.sectionMoveUp')}
                  disabled={index === 0}
                  onClick={() => onMove(index, index - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="sge-outline__action"
                  aria-label={t('projectShowcase.editor.sectionMoveDown')}
                  title={t('projectShowcase.editor.sectionMoveDown')}
                  disabled={index >= sections.length - 1}
                  onClick={() => onMove(index, index + 2)}
                >
                  ↓
                </button>
              </span>
            </li>
            {renderDropZone(index + 1)}
          </React.Fragment>
          );
        })}
      </ol>
    </aside>
  );
};

export default ShowcaseOutline;
