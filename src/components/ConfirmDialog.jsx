import React, { useCallback, useEffect, useRef, useState } from '../react.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useModalDialog } from '../hooks/useModalDialog.js';
import { AlertTriangle, Clock, Trash2 } from './icons.js';

// Remplace `window.confirm` / `window.prompt` : sur une page SharePoint, la boîte du
// navigateur affiche le nom du site au lieu de l'app, ne dit pas ce qui va se passer et
// répond « OK ». Ici le titre nomme l'objet, le texte dit la conséquence et le bouton porte
// le verbe exact.
//
//   const answer = await requestConfirmation({ title, message, confirmLabel, cancelLabel, tone, reason });
//   // answer : null si annulé ; true, ou { reason } quand `reason: { label }` demande un motif.
//
// Le focus part sur « Annuler » : une validation par Entrée ne déclenche jamais l'action.

const TONE_STYLES = {
  danger: {
    icon: Trash2,
    iconWrap: 'bg-red-100 text-red-600',
    confirm: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500'
  },
  warning: {
    icon: Clock,
    iconWrap: 'bg-amber-100 text-amber-700',
    confirm: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500'
  },
  primary: {
    icon: AlertTriangle,
    iconWrap: 'bg-blue-100 text-blue-700',
    confirm: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500'
  }
};

let confirmDialogSequence = 0;

const ConfirmDialogView = ({ request, onResolve }) => {
  const { t } = useTranslation();
  const cancelRef = useRef(null);
  const reasonRef = useRef(null);
  const [reason, setReason] = useState('');
  const [showReasonError, setShowReasonError] = useState(false);
  const idRef = useRef(null);
  if (idRef.current === null) {
    confirmDialogSequence += 1;
    idRef.current = `cn-confirm-${confirmDialogSequence}`;
  }
  const baseId = idRef.current;
  const reasonConfig = request.reason || null;
  const dialogRef = useModalDialog({
    onClose: () => onResolve(null),
    initialFocusRef: reasonConfig ? reasonRef : cancelRef
  });
  const tone = TONE_STYLES[request.tone] || TONE_STYLES.primary;
  const Icon = tone.icon;

  const handleConfirm = () => {
    if (reasonConfig) {
      const trimmed = reason.trim();
      if (reasonConfig.required !== false && trimmed === '') {
        setShowReasonError(true);
        reasonRef.current?.focus();
        return;
      }
      onResolve({ reason: trimmed });
      return;
    }
    onResolve(true);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-gray-900/50" aria-hidden="true" onClick={() => onResolve(null)} />
      <div
        ref={dialogRef}
        role={request.tone === 'danger' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        aria-describedby={request.message ? `${baseId}-message` : undefined}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        data-testid="confirm-dialog"
      >
        <div className="flex items-start gap-4">
          {!reasonConfig && (
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone.iconWrap}`} aria-hidden="true">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <h2 id={`${baseId}-title`} className="text-lg font-semibold text-gray-900">{request.title}</h2>
            {request.message && (
              <p id={`${baseId}-message`} className="text-sm text-gray-600">{request.message}</p>
            )}
          </div>
        </div>
        {reasonConfig && (
          <div className="mt-4 space-y-1">
            <label htmlFor={`${baseId}-reason`} className="block text-sm font-medium text-gray-800">
              {reasonConfig.label}
            </label>
            <textarea
              id={`${baseId}-reason`}
              ref={reasonRef}
              rows={3}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (showReasonError) {
                  setShowReasonError(false);
                }
              }}
              placeholder={reasonConfig.placeholder || ''}
              aria-invalid={showReasonError ? 'true' : undefined}
              aria-describedby={showReasonError ? `${baseId}-reason-error` : undefined}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {showReasonError && (
              <p id={`${baseId}-reason-error`} className="text-sm text-red-700" role="alert">
                {t('common.confirmDialog.reasonRequired')}
              </p>
            )}
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            ref={cancelRef}
            onClick={() => onResolve(null)}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {request.cancelLabel || t('common.confirmDialog.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${tone.confirm}`}
          >
            {request.confirmLabel || t('common.confirmDialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Un seul hôte, monté par App : n'importe quel composant demande une confirmation sans avoir
// à rendre lui-même la fenêtre. Sans hôte (tests, page qui ne monte pas App), la demande
// retombe sur la boîte du navigateur plutôt que d'agir sans rien demander.
let activeHost = null;

export const requestConfirmation = (options = {}) => {
  if (activeHost) {
    return activeHost(options);
  }
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (options.reason) {
    const answer = window.prompt([options.title, options.message].filter(Boolean).join('\n\n'));
    return Promise.resolve(answer === null ? null : { reason: String(answer).trim() });
  }
  return Promise.resolve(window.confirm([options.title, options.message].filter(Boolean).join('\n\n')) ? true : null);
};

export const ConfirmDialogHost = () => {
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);

  const open = useCallback((options) => new Promise((resolve) => {
    if (resolverRef.current) {
      resolverRef.current(null);
    }
    resolverRef.current = resolve;
    confirmDialogSequence += 1;
    setRequest({ ...options, requestId: confirmDialogSequence });
  }), []);

  useEffect(() => {
    activeHost = open;
    return () => {
      if (activeHost === open) {
        activeHost = null;
      }
      if (resolverRef.current) {
        resolverRef.current(null);
        resolverRef.current = null;
      }
    };
  }, [open]);

  const handleResolve = useCallback((value) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    if (resolve) {
      resolve(value);
    }
  }, []);

  return request ? <ConfirmDialogView key={request.requestId} request={request} onResolve={handleResolve} /> : null;
};
