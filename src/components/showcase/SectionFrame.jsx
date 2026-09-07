import React from '../../react.js';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Settings,
  Trash2
} from '../icons.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

/**
 * Enveloppe d'édition d'une section rendue dans le canvas. Le chrome est en position
 * absolue : il se superpose à la vitrine sans jamais décaler sa mise en page, sinon
 * l'aperçu ne montrerait plus ce qui sera réellement publié.
 */
export const SectionFrame = ({
  sectionId,
  title,
  templateLabel,
  index,
  total,
  isCustom,
  isActive,
  isHiddenInLight,
  isDragging,
  onSelect,
  onMove,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  onDragStart,
  onDragEnd,
  children
}) => {
  const { t } = useTranslation();

  const className = [
    'sge-frame',
    isActive ? 'sge-frame--active' : '',
    isHiddenInLight ? 'sge-frame--hidden' : '',
    isDragging ? 'sge-frame--dragging' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const stop = (handler) => (event) => {
    event.stopPropagation();
    handler();
  };

  return (
    <div
      className={className}
      data-sge-section-id={sectionId}
      data-sge-section-index={index}
      onClick={() => onSelect(sectionId)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(sectionId);
        }
      }}
      role="group"
      tabIndex={0}
      aria-label={title}
      aria-current={isActive ? 'true' : undefined}
    >
      <div className="sge-frame__chrome">
        <span
          className="sge-frame__handle"
          draggable
          role="button"
          tabIndex={0}
          aria-label={t('projectShowcase.editor.sectionDragHandle')}
          title={t('projectShowcase.editor.sectionDragHandle')}
          onDragStart={(event) => {
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = 'move';
              try {
                event.dataTransfer.setData('text/plain', String(index));
              } catch (_error) {
                // Certains navigateurs refusent l'écriture : l'index vit aussi dans l'état.
              }
            }
            onDragStart(index);
          }}
          onDragEnd={onDragEnd}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            // Équivalent clavier du glisser-déposer : sans lui, réordonner serait
            // impossible sans souris.
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              event.stopPropagation();
              onMove(index, index - 1);
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              event.stopPropagation();
              onMove(index, index + 2);
            }
          }}
        >
          <GripVertical className="sge-frame__handle-icon" />
        </span>
        <span className="sge-frame__label">
          <span className="sge-frame__title">{title}</span>
          {templateLabel && <span className="sge-frame__badge">{templateLabel}</span>}
          {isHiddenInLight && (
            <span className="sge-frame__badge sge-frame__badge--muted">
              {t('projectShowcase.editor.hiddenInLight')}
            </span>
          )}
        </span>
        <span className="sge-frame__tools">
          <button
            type="button"
            className="sge-frame__tool"
            disabled={index === 0}
            aria-label={t('projectShowcase.editor.sectionMoveUp')}
            title={t('projectShowcase.editor.sectionMoveUp')}
            onClick={stop(() => onMove(index, index - 1))}
          >
            <ArrowUp className="sge-frame__tool-icon" />
          </button>
          <button
            type="button"
            className="sge-frame__tool"
            disabled={index >= total - 1}
            aria-label={t('projectShowcase.editor.sectionMoveDown')}
            title={t('projectShowcase.editor.sectionMoveDown')}
            onClick={stop(() => onMove(index, index + 2))}
          >
            <ArrowDown className="sge-frame__tool-icon" />
          </button>
          <button
            type="button"
            className="sge-frame__tool"
            aria-pressed={!isHiddenInLight}
            aria-label={
              isHiddenInLight
                ? t('projectShowcase.editor.showInLight')
                : t('projectShowcase.editor.hideInLight')
            }
            title={
              isHiddenInLight
                ? t('projectShowcase.editor.showInLight')
                : t('projectShowcase.editor.hideInLight')
            }
            onClick={stop(() => onToggleVisibility(sectionId))}
          >
            {isHiddenInLight
              ? <EyeOff className="sge-frame__tool-icon" />
              : <Eye className="sge-frame__tool-icon" />}
          </button>
          {isCustom && (
            <button
              type="button"
              className="sge-frame__tool"
              aria-label={t('projectShowcase.editor.sectionDuplicate')}
              title={t('projectShowcase.editor.sectionDuplicate')}
              onClick={stop(() => onDuplicate(sectionId))}
            >
              <Copy className="sge-frame__tool-icon" />
            </button>
          )}
          <button
            type="button"
            className="sge-frame__tool sge-frame__tool--primary"
            aria-label={t('projectShowcase.editor.sectionSettings')}
            title={t('projectShowcase.editor.sectionSettings')}
            onClick={stop(() => onSelect(sectionId))}
          >
            <Settings className="sge-frame__tool-icon" />
          </button>
          {isCustom && (
            <button
              type="button"
              className="sge-frame__tool sge-frame__tool--danger"
              aria-label={t('projectShowcase.editor.sectionDelete')}
              title={t('projectShowcase.editor.sectionDelete')}
              onClick={stop(() => onRemove(sectionId))}
            >
              <Trash2 className="sge-frame__tool-icon" />
            </button>
          )}
        </span>
      </div>
      <div className="sge-frame__body">{children}</div>
    </div>
  );
};

export default SectionFrame;
