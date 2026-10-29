import React, { useEffect, useRef, useState } from '../react.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

const DEFAULT_DURATION_MS = 9000;

// `toast` : { id, message, actions?: [{ label, onClick }] }. Il se ferme seul, sauf tant que la
// souris ou le focus est dessus (le temps de lire et de cliquer). L'action ferme aussi la notification.
export const ActionToast = ({ toast, onDismiss, durationMs = DEFAULT_DURATION_MS }) => {
  const { t } = useTranslation();
  const [isPaused, setIsPaused] = useState(false);
  const toastId = toast?.id;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!toastId || isPaused) {
      return undefined;
    }
    const timerId = window.setTimeout(() => onDismissRef.current?.(), durationMs);
    return () => window.clearTimeout(timerId);
  }, [toastId, isPaused, durationMs]);

  if (!toast) {
    return null;
  }

  return (
    <div
      className="cn-toast"
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <p className="cn-toast__message">{toast.message}</p>
      {(toast.actions || []).map((action) => (
        <button
          key={action.label}
          type="button"
          className="cn-toast__action"
          onClick={() => {
            onDismissRef.current?.();
            action.onClick?.();
          }}
        >
          {action.label}
        </button>
      ))}
      <button
        type="button"
        className="cn-toast__close"
        aria-label={t('common.feedback.dismiss')}
        onClick={() => onDismissRef.current?.()}
      >
        ×
      </button>
    </div>
  );
};

export default ActionToast;
