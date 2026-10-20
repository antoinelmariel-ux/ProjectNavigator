import React, { useEffect, useMemo, useRef, useState } from '../react.js';
import { Close, Trash2 } from './icons.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { getLocaleTag } from '../i18n/languages.js';
import { isImpersonating } from '../utils/impersonation.js';

const clamp01 = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
};

const escapeAttributeValue = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  return value.replace(/"/g, '\\"');
};

const SOURCE_PALETTE_KEYS = ['palette-0', 'palette-1', 'palette-2', 'palette-3', 'palette-4'];

const getFeedbackPaletteKey = (note, sourcePalette) => {
  if (note?.sourceId && note.sourceId !== 'session') {
    return sourcePalette.get(note.sourceId) || 'palette-0';
  }

  return 'base';
};

const INTRO_DISMISSED_STORAGE_KEY = 'complianceNavigatorAnnotationIntroDismissed';

const isIntroDismissed = () => {
  try {
    return window.localStorage.getItem(INTRO_DISMISSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const rememberIntroDismissed = () => {
  if (isImpersonating()) {
    return;
  }

  try {
    window.localStorage.setItem(INTRO_DISMISSED_STORAGE_KEY, '1');
  } catch {
    // Préférence de confort : sans stockage, l'aide réapparaîtra simplement.
  }
};

export const AnnotationLayer = ({
  isActive = false,
  suppressIntro = false,
  hideToolbar = false,
  isEditing = false,
  projectName = '',
  notes = [],
  canCloseNotes = false,
  canDeleteNote,
  noteVisibilityMode = 'all',
  currentSourceId = '',
  activeContextId = '',
  autoFocusNoteId = null,
  onExit,
  onNoteChange,
  onNoteClose,
  onNoteDelete,
  onNoteReply,
  onAutoFocusComplete
}) => {
  const { t, language } = useTranslation();
  const [, setLayoutVersion] = useState(0);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [dontShowIntroAgain, setDontShowIntroAgain] = useState(false);
  const introStartRef = useRef(null);
  const normalizedCurrentSourceId =
    typeof currentSourceId === 'string' ? currentSourceId.trim().toLowerCase() : '';
  const visibleNotes = useMemo(
    () => notes.filter((note) => {
      if (!note || note.contextId !== activeContextId) {
        return false;
      }

      if (noteVisibilityMode !== 'mine') {
        return true;
      }

      const noteSourceId = typeof note.sourceId === 'string' ? note.sourceId.trim().toLowerCase() : '';
      return normalizedCurrentSourceId.length > 0 && noteSourceId === normalizedCurrentSourceId;
    }),
    [activeContextId, noteVisibilityMode, notes, normalizedCurrentSourceId]
  );
  const sourcePalette = useMemo(() => {
    const palette = new Map();
    let paletteIndex = 0;

    visibleNotes.forEach((note) => {
      if (!note?.sourceId || note.sourceId === 'session' || palette.has(note.sourceId)) {
        return;
      }

      const key = SOURCE_PALETTE_KEYS[paletteIndex % SOURCE_PALETTE_KEYS.length] || 'palette-0';
      palette.set(note.sourceId, key);
      paletteIndex += 1;
    });

    return palette;
  }, [visibleNotes]);

  const textareaRefs = useRef(new Map());

  useEffect(() => {
    if (!isActive || suppressIntro || isIntroDismissed()) {
      setIsIntroOpen(false);
      return;
    }

    setDontShowIntroAgain(false);
    setIsIntroOpen(true);
  }, [isActive, suppressIntro]);

  useEffect(() => {
    if (isIntroOpen && introStartRef.current) {
      introStartRef.current.focus();
    }
  }, [isIntroOpen]);

  const closeIntro = () => {
    if (dontShowIntroAgain) {
      rememberIntroDismissed();
    }

    setIsIntroOpen(false);
  };

  const registerTextareaRef = (noteId) => (node) => {
    if (!noteId) {
      return;
    }

    if (node) {
      textareaRefs.current.set(noteId, node);
    } else {
      textareaRefs.current.delete(noteId);
    }
  };


  useEffect(() => {
    if (!autoFocusNoteId) {
      return;
    }

    const target = textareaRefs.current.get(autoFocusNoteId);
    if (target && typeof target.focus === 'function') {
      target.focus();
      if (typeof target.setSelectionRange === 'function') {
        const length = target.value?.length ?? 0;
        target.setSelectionRange(length, length);
      }
      if (typeof onAutoFocusComplete === 'function') {
        onAutoFocusComplete(autoFocusNoteId);
      }
    }
  }, [autoFocusNoteId, onAutoFocusComplete]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleLayoutRefresh = () => {
      setLayoutVersion(previous => previous + 1);
    };

    window.addEventListener('resize', handleLayoutRefresh);
    window.addEventListener('scroll', handleLayoutRefresh, true);

    return () => {
      window.removeEventListener('resize', handleLayoutRefresh);
      window.removeEventListener('scroll', handleLayoutRefresh, true);
    };
  }, []);

  const getAnnotationAnchor = (note) => {
    if (typeof document === 'undefined' || !note?.sectionId) {
      return null;
    }

    const escapedSectionId = escapeAttributeValue(note.sectionId);

    if (escapedSectionId && isEditing) {
      const editAnchor = document.querySelector(`[data-annotation-target-section="${escapedSectionId}"]`);
      if (editAnchor) {
        return editAnchor;
      }
    }

    if (escapedSectionId) {
      const displayAnchor = document.querySelector(`[data-showcase-section="${escapedSectionId}"]`);
      if (displayAnchor) {
        return displayAnchor;
      }
    }

    return null;
  };

  const computeNotePosition = (note) => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth || 1 : 1;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight || 1 : 1;
    const anchor = getAnnotationAnchor(note);

    if (anchor && typeof anchor.getBoundingClientRect === 'function') {
      const rect = anchor.getBoundingClientRect();
      const relativeX = clamp01(note?.sectionX ?? note?.x ?? 0.5);
      const relativeY = clamp01(note?.sectionY ?? note?.y ?? 0.5);

      return {
        left: rect.left + rect.width * relativeX,
        top: rect.top + rect.height * relativeY
      };
    }

    const fallbackX = clamp01(note?.x ?? 0.5);
    const fallbackY = clamp01(note?.y ?? 0.5);

    return {
      left: fallbackX * viewportWidth,
      top: fallbackY * viewportHeight
    };
  };

  const formatTimestamp = (value) => {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) {
      return '';
    }

    try {
      return date.toLocaleString(getLocaleTag(language), { dateStyle: 'short', timeStyle: 'short' });
    } catch (error) {
      return date.toISOString();
    }
  };

  const handleReplyDraftChange = (noteId, value) => {
    setReplyDrafts(prev => ({
      ...prev,
      [noteId]: value
    }));
  };

  const handleReplySubmit = (noteId) => {
    const draft = replyDrafts[noteId];
    if (!draft || typeof onNoteReply !== 'function') {
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    onNoteReply(noteId, trimmed);
    setReplyDrafts(prev => ({
      ...prev,
      [noteId]: ''
    }));
  };

  const renderAttachment = (attachment) => {
    if (!attachment?.url) {
      return null;
    }

    const label = attachment?.name || attachment.url;
    return (
      <a
        key={attachment.id || attachment.url}
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="feedback-note-attachment"
      >
        {label}
      </a>
    );
  };

  if (!isActive) {
    return null;
  }

  return (
    <React.Fragment>
      {!hideToolbar && (
        <div className="annotation-toolbar fixed top-0 inset-x-0 z-[2147483600]" data-annotation-ui="true">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="mt-2 rounded-b-xl bg-white border border-slate-200 text-slate-900 shadow-2xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
                <span className="font-semibold">{t('annotationLayer.modeLabel')}</span>
                {projectName ? (
                  <span className="text-xs text-slate-600">
                    {t('annotationLayer.projectLabel', { name: projectName })}
                  </span>
                ) : null}
                <span className="text-xs text-slate-600">{t('annotationLayer.doubleClickHint')}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onExit}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:text-slate-900 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  aria-label={t('annotationLayer.exitMode')}
                  title={t('annotationLayer.exitMode')}
                >
                  <Close className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isIntroOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ zIndex: 2147483646, backgroundColor: 'rgba(15, 23, 42, 0.55)' }}
          data-annotation-ui="true"
          data-testid="annotation-intro"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="annotation-intro-title"
            className="w-full max-w-md rounded-xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-900"
          >
            <h2 id="annotation-intro-title" className="text-lg font-semibold">
              {t('annotationLayer.introTitle')}
            </h2>
            <p className="mt-3 text-sm text-slate-700">{t('annotationLayer.introBody')}</p>
            <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>{t('annotationLayer.introStepCreate')}</li>
              <li>{t('annotationLayer.introStepNavigate')}</li>
            </ul>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={dontShowIntroAgain}
                onChange={(event) => setDontShowIntroAgain(event.target.checked)}
              />
              {t('annotationLayer.introDontShowAgain')}
            </label>
            <div className="mt-5 flex justify-end">
              <button
                ref={introStartRef}
                type="button"
                onClick={closeIntro}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {t('annotationLayer.introConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="annotation-sticky-layer" data-annotation-ui="true">
        {visibleNotes.map((note, index) => {
          const position = computeNotePosition(note);
          const label = note.sourceLabel || (note.sourceId && note.sourceId !== 'session' ? note.sourceId : `#${index + 1}`);
          const paletteKey = getFeedbackPaletteKey(note, sourcePalette);
          const isClosed = note?.status === 'closed';
          const replies = Array.isArray(note?.replies) ? note.replies : [];
          const noteAttachments = Array.isArray(note?.attachments) ? note.attachments : [];

          return (
            <div
              key={note.id}
              className={`annotation-sticky feedback-note${isClosed ? ' feedback-note--closed' : ''}`}
              style={{ left: `${position.left}px`, top: `${position.top}px` }}
              data-annotation-ui="true"
              data-feedback-source-color={paletteKey}
              data-tour-id={index === 0 ? 'showcase-annotation-note' : undefined}
            >
              <div className="feedback-note-header">
                <div className="feedback-note-heading">
                  <span className="feedback-note-number">{label}</span>
                  {isClosed ? (
                    <span className="feedback-note-status">{t('annotationLayer.closedStatus')}</span>
                  ) : null}
                </div>
                <div className="feedback-note-actions">
                  {canCloseNotes && !isClosed && typeof onNoteClose === 'function' ? (
                    <button
                      type="button"
                      onClick={() => onNoteClose(note.id)}
                      className="feedback-note-close"
                      aria-label={t('annotationLayer.closeNote')}
                    >
                      <Close className="h-4 w-4" />
                      <span>{t('annotationLayer.closeButton')}</span>
                    </button>
                  ) : null}
                  {typeof onNoteDelete === 'function' && (typeof canDeleteNote === 'function' ? canDeleteNote(note) : canCloseNotes) ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t('annotationLayer.deleteConfirm'))) {
                          onNoteDelete(note.id);
                        }
                      }}
                      className="feedback-note-close feedback-note-delete"
                      aria-label={t('annotationLayer.deleteNote')}
                      title={t('annotationLayer.deleteNote')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
              <textarea
                value={note.text || ''}
                onChange={(event) => onNoteChange && onNoteChange(note.id, event.target.value)}
                ref={registerTextareaRef(note.id)}
                className="feedback-note-text"
                rows={4}
                placeholder={t('annotationLayer.notePlaceholder')}
                readOnly={isClosed}
                data-annotation-ui="true"
              />
              {isClosed ? (
                <p className="feedback-note-closed-meta" data-annotation-ui="true">
                  {note.closedBy
                    ? t('annotationLayer.closedBy', { name: note.closedBy })
                    : t('annotationLayer.closedGeneric')}
                  {note.closedAt ? ` · ${formatTimestamp(note.closedAt)}` : ''}
                </p>
              ) : null}
              {noteAttachments.length > 0 ? (
                <div className="feedback-note-attachments" data-annotation-ui="true">
                  {noteAttachments.map(renderAttachment)}
                </div>
              ) : null}
              {replies.length > 0 ? (
                <div className="feedback-note-replies" data-annotation-ui="true">
                  {replies.map((reply) => {
                    const timestamp = formatTimestamp(reply?.createdAt);
                    const replyAttachments = Array.isArray(reply?.attachments) ? reply.attachments : [];
                    return (
                      <div key={reply?.id || `${note.id}-${reply?.createdAt}`} className="feedback-note-reply">
                        <div className="feedback-note-reply__meta">
                          <span>{reply?.author || t('annotationLayer.replyAuthorFallback')}</span>
                          {timestamp ? <span>· {timestamp}</span> : null}
                        </div>
                        <p className="feedback-note-reply__text">{reply?.text}</p>
                        {replyAttachments.length > 0 ? (
                          <div className="feedback-note-attachments" data-annotation-ui="true">
                            {replyAttachments.map(renderAttachment)}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {!isClosed && typeof onNoteReply === 'function' ? (
                <div className="feedback-note-reply-form" data-annotation-ui="true">
                  <textarea
                    value={replyDrafts[note.id] || ''}
                    onChange={(event) => handleReplyDraftChange(note.id, event.target.value)}
                    className="feedback-note-reply-input"
                    rows={2}
                    placeholder={t('annotationLayer.replyPlaceholder')}
                    data-annotation-ui="true"
                  />
                  <button
                    type="button"
                    onClick={() => handleReplySubmit(note.id)}
                    className="feedback-note-reply-submit"
                    disabled={!replyDrafts[note.id] || replyDrafts[note.id].trim().length === 0}
                    data-annotation-ui="true"
                  >
                    {t('annotationLayer.replySubmit')}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </React.Fragment>
  );
};
