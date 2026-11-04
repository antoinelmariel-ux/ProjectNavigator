import React, { useEffect, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { RichTextEditor } from '../RichTextEditor.jsx';
import { sanitizeRichText } from '../../utils/richText.js';
import { DECISION_STATUSES } from '../../utils/committeeSessions.js';

export const DECISION_STATUS_LABEL_KEYS = {
  validated: 'synthesisReport.statusValidated',
  validated_with_conditions: 'synthesisReport.statusValidatedWithConditions',
  pending_information: 'synthesisReport.statusPendingInformation',
  not_concerned: 'synthesisReport.statusNotConcerned',
  rejected: 'synthesisReport.statusRejected'
};

export const DECISION_STATUS_CLASSES = {
  validated: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  validated_with_conditions: 'border-amber-200 bg-amber-50 text-amber-800',
  pending_information: 'border-blue-200 bg-blue-50 text-blue-800',
  not_concerned: 'border-gray-200 bg-gray-50 text-gray-700',
  rejected: 'border-red-200 bg-red-50 text-red-800'
};

export const DecisionBadge = ({ status }) => {
  const { t } = useTranslation();
  if (!status || !DECISION_STATUS_LABEL_KEYS[status]) {
    return null;
  }
  return (
    <span
      data-testid="committee-agenda-decision-badge"
      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${DECISION_STATUS_CLASSES[status]}`}
    >
      {t(DECISION_STATUS_LABEL_KEYS[status])}
    </span>
  );
};

// Décision du comité sur un point de l'ordre du jour : un statut facultatif et un commentaire.
// Seuls la présidence et les administrateurs la modifient (`canEdit`) ; les membres la lisent.
export const CommitteeAgendaDecision = ({ idPrefix, status, comment, canEdit, hint, onSave }) => {
  const { t } = useTranslation();
  const [draftStatus, setDraftStatus] = useState(status || '');
  const [draftComment, setDraftComment] = useState(comment || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftStatus(status || '');
    setDraftComment(comment || '');
  }, [status, comment]);

  const isDirty = draftStatus !== (status || '') || draftComment !== (comment || '');
  const hasContent = Boolean(status) || Boolean((comment || '').replace(/<[^>]+>/g, '').trim());

  return (
    <section
      className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2"
      aria-labelledby={`${idPrefix}-title`}
      data-testid="committee-agenda-decision"
    >
      <h4 id={`${idPrefix}-title`} className="text-sm font-semibold text-gray-800">{t('committeeSessions.agenda.decisionTitle')}</h4>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {canEdit ? (
        <form
          className="space-y-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSaving(true);
            try {
              await onSave({ status: draftStatus, comment: draftComment });
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <div>
            <label htmlFor={`${idPrefix}-status`} className="block text-xs font-medium text-gray-700">
              {t('committeeSessions.agenda.decisionStatusLabel')}
            </label>
            <select
              id={`${idPrefix}-status`}
              value={draftStatus}
              onChange={(event) => setDraftStatus(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">{t('committeeSessions.agenda.decisionNone')}</option>
              {DECISION_STATUSES.map((value) => (
                <option key={value} value={value}>{t(DECISION_STATUS_LABEL_KEYS[value])}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-comment`} className="block text-xs font-medium text-gray-700">
              {t('committeeSessions.agenda.decisionCommentLabel')}
            </label>
            <RichTextEditor
              id={`${idPrefix}-comment`}
              compact
              placeholder={t('committeeSessions.agenda.decisionPlaceholder')}
              value={draftComment}
              onChange={setDraftComment}
            />
          </div>
          <button
            type="submit"
            disabled={!isDirty || isSaving}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {t('committeeSessions.agenda.decisionSave')}
          </button>
        </form>
      ) : hasContent ? (
        <div className="space-y-1 text-sm text-gray-800">
          <DecisionBadge status={status} />
          {comment && <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(comment) }} />}
        </div>
      ) : (
        <p className="text-xs text-gray-500">{t('committeeSessions.agenda.decisionNoneYet')}</p>
      )}
    </section>
  );
};
