import React from '../../react.js';
import { CheckCircle, Close, Eye, LayoutList, Redo, Settings, Undo } from '../icons.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

/**
 * Barre d'édition collante : elle remplace l'ancien en-tête du formulaire et concentre tout
 * ce qui n'appartient à aucune section en particulier — sortie, historique, vue simulée,
 * aperçu sans chrome, état de publication.
 */
export const ShowcaseEditorBar = ({
  projectName,
  isDirty,
  hasRestoredDraft,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isPreviewing,
  onTogglePreview,
  isOutlineOpen,
  onToggleOutline,
  displayMode,
  onDisplayModeChange,
  canConfigureDisplayModes,
  isLightConfigOpen,
  onOpenLightConfig,
  isExitConfirmOpen,
  onRequestExit,
  onCancelExit,
  onDiscard,
  onPublish
}) => {
  const { t } = useTranslation();

  const statusLabel = hasRestoredDraft && !isDirty
    ? t('projectShowcase.editor.draftRestored')
    : isDirty
      ? t('projectShowcase.editor.unpublishedChanges')
      : t('projectShowcase.editor.allPublished');

  return (
    <div className="sge sge-topbar" data-tour-id="showcase-edit-topbar">
      <div className="sge-topbar__inner">
        <div className="sge-topbar__identity">
          <p className="sge-eyebrow">{t('projectShowcase.editModeActiveLabel')}</p>
          <p className="sge-topbar__name" title={projectName}>{projectName}</p>
        </div>

        <div className="sge-topbar__group">
          <button
            type="button"
            className={`sge-icon-btn${isOutlineOpen ? ' sge-icon-btn--active' : ''}`}
            aria-pressed={isOutlineOpen}
            aria-label={t('projectShowcase.editor.outline')}
            title={t('projectShowcase.editor.outline')}
            onClick={onToggleOutline}
          >
            <LayoutList className="sge-icon-btn__icon" />
          </button>
          <button
            type="button"
            className="sge-icon-btn"
            disabled={!canUndo}
            aria-label={t('projectShowcase.editor.undo')}
            title={`${t('projectShowcase.editor.undo')} (Ctrl+Z)`}
            onClick={onUndo}
          >
            <Undo className="sge-icon-btn__icon" />
          </button>
          <button
            type="button"
            className="sge-icon-btn"
            disabled={!canRedo}
            aria-label={t('projectShowcase.editor.redo')}
            title={`${t('projectShowcase.editor.redo')} (Ctrl+Maj+Z)`}
            onClick={onRedo}
          >
            <Redo className="sge-icon-btn__icon" />
          </button>
        </div>

        {canConfigureDisplayModes && (
          <div className="sge-topbar__group" data-tour-id="showcase-display-mode-buttons">
            <span className="sge-topbar__legend">{t('projectShowcase.editor.viewLabel')}</span>
            <div className="sge-segment">
              <button
                type="button"
                className="sge-segment__item"
                aria-pressed={displayMode === 'light'}
                onClick={() => onDisplayModeChange('light')}
              >
                {t('projectShowcase.lightModeButton')}
              </button>
              <button
                type="button"
                className="sge-segment__item"
                aria-pressed={displayMode !== 'light'}
                onClick={() => onDisplayModeChange('full')}
              >
                {t('projectShowcase.fullModeButton')}
              </button>
            </div>
            <button
              type="button"
              className={`sge-icon-btn${isLightConfigOpen ? ' sge-icon-btn--active' : ''}`}
              aria-pressed={isLightConfigOpen}
              aria-label={t('projectShowcase.configureButton')}
              title={t('projectShowcase.configureButton')}
              onClick={onOpenLightConfig}
              data-tour-id="showcase-light-config-trigger"
            >
              <Settings className="sge-icon-btn__icon" />
            </button>
          </div>
        )}

        <button
          type="button"
          className={`sge-btn sge-btn--outline sge-btn--sm${isPreviewing ? ' sge-btn--on' : ''}`}
          aria-pressed={isPreviewing}
          title={t('projectShowcase.editor.previewHint')}
          onClick={onTogglePreview}
        >
          <Eye className="sge-btn__icon" />
          {isPreviewing ? t('projectShowcase.editor.previewExit') : t('projectShowcase.editor.preview')}
        </button>

        <div className="sge-topbar__spacer" />

        <p
          className={`sge-topbar__status${isDirty ? ' sge-topbar__status--dirty' : ''}`}
          role="status"
          aria-live="polite"
        >
          {statusLabel}
        </p>

        {isExitConfirmOpen ? (
          <div className="sge-topbar__confirm">
            <span className="sge-topbar__confirm-text">{t('projectShowcase.editor.exitConfirmQuestion')}</span>
            <button type="button" className="sge-btn sge-btn--ghost sge-btn--sm" onClick={onCancelExit}>
              {t('projectShowcase.editor.exitConfirmStay')}
            </button>
            <button type="button" className="sge-btn sge-btn--danger sge-btn--sm" onClick={onDiscard}>
              {t('projectShowcase.editor.exitConfirmDiscard')}
            </button>
          </div>
        ) : (
          <button type="button" className="sge-btn sge-btn--ghost sge-btn--sm" onClick={onRequestExit}>
            <Close className="sge-btn__icon" />
            {t('projectShowcase.editor.exit')}
          </button>
        )}

        <button
          type="button"
          className="sge-btn sge-btn--primary sge-btn--sm"
          data-tour-id="showcase-save-edits"
          onClick={onPublish}
        >
          <CheckCircle className="sge-btn__icon" />
          {t('projectShowcase.editor.publish')}
        </button>
      </div>
    </div>
  );
};

export default ShowcaseEditorBar;
