import React, { useCallback, useEffect, useMemo, useRef, useState } from '../react.js';
import { sanitizeRichText } from '../utils/richText.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

const BUTTON_BASE_CLASSES =
  'inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1';
const LIST_BUTTON_CLASSES =
  'inline-flex items-center gap-3 px-3 py-1.5 text-sm font-semibold rounded-full border border-gray-300 text-gray-900 bg-white shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1';

const commandIsAvailable = () => typeof document !== 'undefined' && typeof document.execCommand === 'function';

const normalizeValue = (value) => (typeof value === 'string' ? value : '');

export const RichTextEditor = ({
  id,
  value,
  onChange,
  placeholder,
  compact = false,
  ariaLabel
}) => {
  const { t } = useTranslation();
  const effectivePlaceholder = placeholder || t('richTextEditor.defaultPlaceholder');
  const editorRef = useRef(null);
  const linkTextInputRef = useRef(null);
  const selectionRangeRef = useRef(null);
  const selectedTextRef = useRef('');
  const [htmlValue, setHtmlValue] = useState(() => normalizeValue(value));
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    setHtmlValue(normalizeValue(value));
  }, [value]);

  useEffect(() => {
    const normalized = normalizeValue(value);
    setHtmlValue(normalized);

    if (!editorRef.current) {
      return;
    }

    const isFocused =
      typeof document !== 'undefined' && document.activeElement === editorRef.current;

    if (isFocused) {
      return;
    }

    if (editorRef.current.innerHTML !== normalized) {
      editorRef.current.innerHTML = normalized || '';
    }
  }, [value]);

  useEffect(() => {
    if (isLinkModalOpen && linkTextInputRef.current) {
      linkTextInputRef.current.focus();
    }
  }, [isLinkModalOpen]);

  const emitChange = useCallback(
    (nextValue) => {
      const sanitized = sanitizeRichText(nextValue || '');
      setHtmlValue(sanitized);
      onChange?.(sanitized);
      return sanitized;
    },
    [onChange]
  );

  const syncEditorHtml = useCallback((sanitized) => {
    if (!editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML === sanitized) {
      return;
    }

    editorRef.current.innerHTML = sanitized || '';

    if (typeof document !== 'undefined' && document.activeElement === editorRef.current) {
      const selection = typeof window !== 'undefined' && typeof window.getSelection === 'function'
        ? window.getSelection()
        : null;
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, []);

  const handleInput = useCallback(() => {
    const sanitized = emitChange(editorRef.current?.innerHTML || '');
    syncEditorHtml(sanitized);
  }, [emitChange, syncEditorHtml]);

  const handleBlur = useCallback(() => {
    const sanitized = emitChange(editorRef.current?.innerHTML || '');

    if (editorRef.current && editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized || '';
    }
  }, [emitChange]);

  const handlePaste = useCallback(
    (event) => {
      if (!event?.clipboardData) {
        return;
      }

      const text = event.clipboardData.getData('text/plain');
      if (commandIsAvailable()) {
        event.preventDefault();
        document.execCommand('insertText', false, text);
        handleInput();
      }
    },
    [handleInput]
  );

  const isSelectionInsideListItem = useCallback(() => {
    if (typeof window === 'undefined' || !editorRef.current) {
      return false;
    }

    const selection = typeof window.getSelection === 'function' ? window.getSelection() : null;
    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    let node = selection.getRangeAt(0).startContainer;
    if (node && node.nodeType === 3) {
      node = node.parentNode;
    }

    while (node && node !== editorRef.current) {
      if (node.nodeName === 'LI') {
        return true;
      }
      node = node.parentNode;
    }

    return false;
  }, []);

  // Par défaut, un navigateur répond à Entrée seule en ouvrant un nouveau bloc
  // (une balise <div>), qui ne fait pas partie des balises autorisées par
  // sanitizeRichText : elle est retirée au nettoyage suivant sans rien laisser
  // à sa place, et les deux lignes se retrouvent recollées. On intercepte donc
  // Entrée seule pour insérer directement le même retour à la ligne simple
  // (<br>) que Shift+Entrée, qui lui est déjà accepté. Dans une liste, on
  // laisse au contraire le navigateur gérer Entrée nativement : c'est ce qui
  // crée une nouvelle puce (<li>) et permet d'en sortir en validant une puce
  // vide, un comportement qu'un <br> forcé empêcherait entièrement.
  const handleKeyDown = useCallback(
    (event) => {
      const isPlainEnter =
        event.key === 'Enter'
        && !event.shiftKey
        && !event.altKey
        && !event.ctrlKey
        && !event.metaKey
        && !event.isComposing
        && event.keyCode !== 229; // saisie via IME (clavier chinois/japonais/coréen) en cours

      if (!isPlainEnter || !commandIsAvailable() || isSelectionInsideListItem()) {
        return;
      }

      event.preventDefault();
      document.execCommand('insertLineBreak');
      handleInput();
    },
    [handleInput, isSelectionInsideListItem]
  );

  // Un clic sur un bouton de la barre d'outils lui donne le focus par défaut,
  // ce qui fait perdre la sélection/le curseur dans l'éditeur : les
  // caractères tapés juste après n'atterrissent plus dedans (les touches
  // lettres sont ignorées par un bouton focalisé). preventDefault sur le
  // mousedown empêche ce transfert de focus sans empêcher le clic.
  const preserveEditorFocus = useCallback((event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
  }, []);

  const applyCommand = useCallback(
    (command, argument = null) => {
      if (!commandIsAvailable()) {
        return;
      }

      document.execCommand(command, false, argument);
      handleInput();
    },
    [handleInput]
  );

  const captureSelection = useCallback(() => {
    if (typeof window === 'undefined' || !editorRef.current) {
      return '';
    }

    const selection = typeof window.getSelection === 'function' ? window.getSelection() : null;
    if (!selection || selection.rangeCount === 0) {
      return '';
    }

    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      return '';
    }

    selectionRangeRef.current = range;
    const selectedText = selection.toString() || '';
    selectedTextRef.current = selectedText;
    return selectedText;
  }, []);

  const handleAddLink = useCallback(() => {
    if (typeof window === 'undefined' || !commandIsAvailable()) {
      return;
    }

    const selectedText = captureSelection();
    const normalizedSelectedText = selectedText || selectedTextRef.current || '';
    setLinkText(normalizedSelectedText);
    setLinkUrl('https://');
    setLinkError('');
    setIsLinkModalOpen(true);
  }, [captureSelection]);

  const handleCloseLinkModal = useCallback(() => {
    setIsLinkModalOpen(false);
    setLinkError('');
  }, []);

  const handleConfirmLink = useCallback((event) => {
    event?.preventDefault?.();

    const trimmedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      setLinkError(t('richTextEditor.linkUrlError'));
      return;
    }

    const normalizedDisplayText = linkText.trim() || selectedTextRef.current || trimmedUrl;
    const linkHtml = `<a href="${trimmedUrl}" target="_blank" rel="noopener noreferrer">${normalizedDisplayText}</a>`;

    if (typeof window !== 'undefined' && selectionRangeRef.current && typeof window.getSelection === 'function') {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(selectionRangeRef.current);
      }
    }

    applyCommand('insertHTML', linkHtml);
    setIsLinkModalOpen(false);
    setLinkError('');
  }, [applyCommand, linkText, linkUrl, t]);

  const minHeight = useMemo(() => (compact ? 120 : 180), [compact]);
  const showPlaceholder = !htmlValue;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={BUTTON_BASE_CLASSES}
          onMouseDown={preserveEditorFocus}
          onClick={() => applyCommand('bold')}
        >
          <span className="font-semibold">G</span>
          <span className="sr-only">{t('richTextEditor.bold')}</span>
        </button>
        <button
          type="button"
          className={BUTTON_BASE_CLASSES}
          onMouseDown={preserveEditorFocus}
          onClick={() => applyCommand('italic')}
        >
          <span className="italic">I</span>
          <span className="sr-only">{t('richTextEditor.italic')}</span>
        </button>
        <button
          type="button"
          className={BUTTON_BASE_CLASSES}
          onMouseDown={preserveEditorFocus}
          onClick={() => applyCommand('underline')}
        >
          <span className="underline">U</span>
          <span className="sr-only">{t('richTextEditor.underline')}</span>
        </button>
        <button
          type="button"
          className={BUTTON_BASE_CLASSES}
          onMouseDown={preserveEditorFocus}
          onClick={() => applyCommand('insertUnorderedList')}
        >
          <svg
            aria-hidden="true"
            fill="#000000"
            height="20px"
            width="20px"
            version="1.1"
            id="Icons"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 32 32"
            xmlSpace="preserve"
          >
            <g id="SVGRepo_bgCarrier" strokeWidth="0" />
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
            <g id="SVGRepo_iconCarrier">
              <g>
                <path d="M11,8h18c0.6,0,1-0.4,1-1s-0.4-1-1-1H11c-0.6,0-1,0.4-1,1S10.4,8,11,8z" />
                <path d="M11,17h11c0.6,0,1-0.4,1-1s-0.4-1-1-1H11c-0.6,0-1,0.4-1,1S10.4,17,11,17z" />
                <path d="M29,24H11c-0.6,0-1,0.4-1,1s0.4,1,1,1h18c0.6,0,1-0.4,1-1S29.6,24,29,24z" />
                <path d="M5,4C3.3,4,2,5.3,2,7s1.3,3,3,3s3-1.3,3-3S6.7,4,5,4z" />
                <path d="M5,13c-1.7,0-3,1.3-3,3s1.3,3,3,3s3-1.3,3-3S6.7,13,5,13z" />
                <path d="M5,22c-1.7,0-3,1.3-3,3s1.3,3,3,3s3-1.3,3-3S6.7,22,5,22z" />
              </g>
            </g>
          </svg>
          <span className="sr-only">{t('richTextEditor.bulletList')}</span>
        </button>
        <button
          type="button"
          className={BUTTON_BASE_CLASSES}
          onMouseDown={(event) => {
            if (event.button !== 0) {
              return;
            }
            event.preventDefault();
            captureSelection();
          }}
          onClick={handleAddLink}
        >
          <span aria-hidden="true">🔗</span>
          <span className="sr-only">{t('richTextEditor.insertLink')}</span>
        </button>
        <button
          type="button"
          className={BUTTON_BASE_CLASSES}
          onMouseDown={preserveEditorFocus}
          onClick={() => applyCommand('removeFormat')}
        >
          <span aria-hidden="true">⟲</span>
          <span className="sr-only">{t('richTextEditor.clearFormatting')}</span>
        </button>
      </div>
      <div className="relative">
        {showPlaceholder && (
          <div
            className="pointer-events-none absolute inset-0 px-4 py-3 text-sm text-gray-500 select-none leading-relaxed"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {effectivePlaceholder}
          </div>
        )}
        <div
          id={id}
          ref={editorRef}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px] prose prose-sm max-w-none"
          style={{ minHeight }}
          contentEditable={true}
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onKeyUp={handleInput}
          onCompositionEnd={handleInput}
          tabIndex={0}
          role="textbox"
          aria-label={ariaLabel || effectivePlaceholder}
        />
      </div>
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-gray-900/50" onClick={handleCloseLinkModal} aria-hidden="true" />
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-link-modal-title`}
          >
            <h3 id={`${id}-link-modal-title`} className="text-lg font-semibold text-gray-900">
              {t('richTextEditor.linkModalTitle')}
            </h3>
            <p className="mt-1 text-sm text-gray-500">{t('richTextEditor.linkModalDescription')}</p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor={`${id}-link-text`} className="block text-sm font-medium text-gray-700">
                  {t('richTextEditor.linkTextLabel')}
                </label>
                <input
                  id={`${id}-link-text`}
                  ref={linkTextInputRef}
                  type="text"
                  value={linkText}
                  onChange={(event) => setLinkText(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('richTextEditor.linkTextPlaceholder')}
                />
              </div>
              <div>
                <label htmlFor={`${id}-link-url`} className="block text-sm font-medium text-gray-700">
                  {t('richTextEditor.linkUrlLabel')}
                </label>
                <input
                  id={`${id}-link-url`}
                  type="url"
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('richTextEditor.linkUrlPlaceholder')}
                />
                {linkError && <p className="mt-2 text-sm text-red-600">{linkError}</p>}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseLinkModal}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('richTextEditor.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmLink}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t('richTextEditor.insertLinkButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
