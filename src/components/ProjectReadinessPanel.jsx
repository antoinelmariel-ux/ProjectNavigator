import React from '../react.js';
import { AlertTriangle, CheckCircle, Info, MessageSquare, Send, Sparkles } from './icons.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { getLocaleTag } from '../i18n/languages.js';
import { resolveLocalizedText } from '../utils/localizedContent.js';
import {
  READINESS_ADVICE,
  READINESS_ORIENTATION,
  READINESS_VALIDATION
} from '../utils/projectReadiness.js';
import { SUBMISSION_KIND_FINAL, SUBMISSION_KIND_PRELIMINARY } from '../utils/submissionKind.js';
import {
  LAUNCH_CONFIRMATION_AWAITING,
  LAUNCH_CONFIRMATION_CONFIRMED,
  LAUNCH_CONFIRMATION_DUE,
  LAUNCH_CONFIRMATION_LAUNCHED_WITHOUT
} from '../utils/launchConfirmation.js';

const LEVEL_ORDER = [READINESS_ORIENTATION, READINESS_ADVICE, READINESS_VALIDATION];

// Ce panneau remplace le compteur « 14/21 » par la seule question qui intéresse le porteur :
// avec ce que j'ai déjà saisi, qu'est-ce que la compliance peut faire pour moi maintenant ?
export const ProjectReadinessPanel = ({
  readiness,
  uncertainCoverage = [],
  isSubmitted = false,
  submissionKind = SUBMISSION_KIND_FINAL,
  notifiedTeamNames = [],
  onSubmitPreliminary,
  onSubmitFinal,
  onNavigateToQuestion,
  onOpenShowcase,
  showcaseFeedbackCount = 0,
  pendingChanges = [],
  hasSentSnapshot = false,
  submissionVersion = 0,
  lastSentAt = '',
  onSendUpdate,
  launchSignal = '',
  roundStatus = null,
  onRequestFinalValidation
}) => {
  const { t, language } = useTranslation();

  if (!readiness) {
    return null;
  }

  const levelById = new Map(readiness.levels.map((entry) => [entry.id, entry]));
  const canRequestPreliminary = levelById.get(READINESS_ORIENTATION)?.reached === true;
  const canRequestValidation = levelById.get(READINESS_VALIDATION)?.reached === true;
  const isPreliminaryPending = isSubmitted && submissionKind === SUBMISSION_KIND_PRELIMINARY;
  const hasChangesToSend = pendingChanges.length > 0;
  // Sans date de lancement déclarée, le signal reste « none » : on propose quand même le tour
  // final dès que la validation est possible, plutôt que d'attendre une date que le porteur
  // n'est pas obligé de renseigner.
  const resolvedLaunchSignal = launchSignal === 'none' && canRequestValidation && !roundStatus?.isRequested
    ? LAUNCH_CONFIRMATION_DUE
    : launchSignal;
  const formattedLastSentAt = lastSentAt
    ? new Intl.DateTimeFormat(getLocaleTag(language), { day: '2-digit', month: '2-digit', year: 'numeric' })
      .format(new Date(lastSentAt))
    : '';

  const renderMissing = (missing) => (
    <ul className="mt-2 space-y-1">
      {missing.slice(0, 5).map((question) => (
        <li key={question.id}>
          <button
            type="button"
            onClick={() => onNavigateToQuestion?.(question.id)}
            className="text-left text-xs text-blue-700 underline underline-offset-2 hover:text-blue-900"
          >
            {resolveLocalizedText(question.question, language) || question.id}
          </button>
        </li>
      ))}
      {missing.length > 5 && (
        <li className="text-xs text-gray-500">
          {t('synthesisReport.readiness.moreMissing', { count: missing.length - 5 })}
        </li>
      )}
    </ul>
  );

  return (
    <div
      className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-6"
      role="region"
      aria-label={t('synthesisReport.readiness.ariaLabel')}
      data-tour-id="synthesis-readiness"
    >
      {isSubmitted && typeof onSendUpdate === 'function' && (hasChangesToSend || !hasSentSnapshot) && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
          <p className="text-sm font-semibold text-amber-900">
            {hasChangesToSend
              ? t(
                pendingChanges.length > 1
                  ? 'synthesisReport.readiness.pendingChangesHeadingPlural'
                  : 'synthesisReport.readiness.pendingChangesHeadingSingular',
                { count: pendingChanges.length, version: submissionVersion, date: formattedLastSentAt }
              )
              : t('synthesisReport.readiness.updateWithoutReferenceHeading')}
          </p>
          <p className="mt-1 text-xs text-amber-800">
            {hasChangesToSend
              ? t('synthesisReport.readiness.pendingChangesHint')
              : t('synthesisReport.readiness.updateWithoutReferenceHint')}
          </p>
          {hasChangesToSend && (
            <ul className="mt-2 space-y-1">
              {pendingChanges.slice(0, 5).map((change) => (
                <li key={change.questionId} className="text-xs text-amber-900">
                  <button
                    type="button"
                    onClick={() => onNavigateToQuestion?.(change.questionId)}
                    className="text-left underline underline-offset-2 hover:text-amber-700"
                  >
                    {resolveLocalizedText(change.question?.question, language) || change.questionId}
                  </button>
                  <span className="text-amber-800">
                    {' '}: {change.previousLabel || '—'} → {change.currentLabel || '—'}
                  </span>
                </li>
              ))}
              {pendingChanges.length > 5 && (
                <li className="text-xs text-amber-800">
                  {t('synthesisReport.readiness.moreChanges', { count: pendingChanges.length - 5 })}
                </li>
              )}
            </ul>
          )}
          <button
            type="button"
            onClick={onSendUpdate}
            className="mt-3 px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center bg-amber-600 text-white hover:bg-amber-700 shadow-md"
          >
            <Send className="w-4 h-4 mr-2" />
            {t('synthesisReport.readiness.sendUpdateAction')}
          </button>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900">{t('synthesisReport.readiness.heading')}</h2>
      <p className="mt-1 text-sm text-gray-500">{t('synthesisReport.readiness.intro')}</p>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {LEVEL_ORDER.map((levelId) => {
          const entry = levelById.get(levelId);
          const reached = entry?.reached === true;

          return (
            <li
              key={levelId}
              className={`rounded-xl border p-4 ${
                reached ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {reached ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="block w-2 h-2 rounded-full bg-gray-300" aria-hidden="true" />
                )}
                <span className={`text-sm font-semibold ${reached ? 'text-emerald-800' : 'text-gray-700'}`}>
                  {t(`synthesisReport.readiness.level.${levelId}`)}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                {t(`synthesisReport.readiness.levelHint.${levelId}`)}
              </p>
              {!reached && entry?.missing?.length > 0 && (
                <>
                  <p className="mt-2 text-xs font-semibold text-gray-700">
                    {t('synthesisReport.readiness.missingHeading')}
                  </p>
                  {renderMissing(entry.missing)}
                </>
              )}
            </li>
          );
        })}
      </ol>

      {uncertainCoverage.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 w-4 h-4 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {t('synthesisReport.readiness.uncertainHeading')}
              </p>
              <p className="mt-1 text-xs text-amber-700">
                {t('synthesisReport.readiness.uncertainHint')}
              </p>
              <ul className="mt-2 space-y-1">
                {uncertainCoverage.map((entry) => (
                  <li key={entry.questionId}>
                    <button
                      type="button"
                      onClick={() => onNavigateToQuestion?.(entry.questionId)}
                      className="text-left text-xs text-amber-800 underline underline-offset-2 hover:text-amber-900"
                    >
                      {resolveLocalizedText(entry.question?.question, language) || entry.questionId}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Interroger la compliance n'est pas la seule façon d'avancer : la vitrine sert d'abord
          à se confronter à son propre projet et à récolter des retours, avant même qu'un
          expert soit sollicité. */}
      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t('synthesisReport.readiness.thinkHeading')}
            </p>
            <p className="mt-1 text-xs text-blue-800">{t('synthesisReport.readiness.thinkHint')}</p>
            {showcaseFeedbackCount > 0 && (
              <p className="mt-2 text-xs font-semibold text-blue-900 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {t(
                  showcaseFeedbackCount > 1
                    ? 'synthesisReport.readiness.feedbackCountPlural'
                    : 'synthesisReport.readiness.feedbackCountSingular',
                  { count: showcaseFeedbackCount }
                )}
              </p>
            )}
          </div>
          {typeof onOpenShowcase === 'function' && (
            <button
              type="button"
              onClick={onOpenShowcase}
              className="px-4 py-2 bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-all flex items-center justify-center text-sm w-full sm:w-auto"
            >
              {t('synthesisReport.readiness.thinkAction')}
            </button>
          )}
        </div>
      </div>

      {!isSubmitted && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-4 flex flex-col">
            <p className="text-sm font-semibold text-gray-900">
              {t('synthesisReport.readiness.preliminaryTitle')}
            </p>
            <p className="mt-1 text-xs text-gray-600 flex-1">
              {t('synthesisReport.readiness.preliminaryHint')}
            </p>
            <button
              type="button"
              onClick={onSubmitPreliminary}
              disabled={!canRequestPreliminary}
              className="mt-3 px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {t('synthesisReport.readiness.preliminaryAction')}
            </button>
            {!canRequestPreliminary && (
              <p className="mt-2 text-xs text-gray-500">
                {t('synthesisReport.readiness.preliminaryBlocked')}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 p-4 flex flex-col">
            <p className="text-sm font-semibold text-gray-900">
              {t('synthesisReport.readiness.validationTitle')}
            </p>
            <p className="mt-1 text-xs text-gray-600 flex-1">
              {t('synthesisReport.readiness.validationHint')}
            </p>
            <button
              type="button"
              onClick={onSubmitFinal}
              disabled={!canRequestValidation}
              className="mt-3 px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              data-tour-id="synthesis-submit"
            >
              <Send className="w-4 h-4 mr-2" />
              {t('synthesisReport.readiness.validationAction')}
            </button>
            {!canRequestValidation && (
              <p className="mt-2 text-xs text-gray-500">
                {t('synthesisReport.readiness.validationBlocked')}
              </p>
            )}
          </div>
        </div>
      )}

      {!isSubmitted && (
        <p className="mt-4 text-xs text-gray-500 flex items-start gap-2">
          <Info className="mt-0.5 w-3 h-3 shrink-0" />
          <span>
            {notifiedTeamNames.length > 0
              ? t('synthesisReport.readiness.engagementWithTeams', { teams: notifiedTeamNames.join(', ') })
              : t('synthesisReport.readiness.engagementNoTeam')}
          </span>
        </p>
      )}

      {/* Dernier tour avant lancement. Rien ne peut le rendre obligatoire — il n'existe pas de
          jalon opposable — donc sa force est d'être visible et de ne coûter qu'un clic à
          l'expert dans le cas nominal. */}
      {isSubmitted && !isPreliminaryPending && resolvedLaunchSignal && resolvedLaunchSignal !== 'none' && (
        <div
          className={`mt-4 rounded-xl border p-4 ${
            resolvedLaunchSignal === LAUNCH_CONFIRMATION_LAUNCHED_WITHOUT
              ? 'border-red-200 bg-red-50'
              : resolvedLaunchSignal === LAUNCH_CONFIRMATION_CONFIRMED
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
          }`}
          role={resolvedLaunchSignal === LAUNCH_CONFIRMATION_LAUNCHED_WITHOUT ? 'alert' : 'status'}
        >
          <p className={`text-sm font-semibold ${
            resolvedLaunchSignal === LAUNCH_CONFIRMATION_LAUNCHED_WITHOUT
              ? 'text-red-800'
              : resolvedLaunchSignal === LAUNCH_CONFIRMATION_CONFIRMED
                ? 'text-emerald-800'
                : 'text-amber-900'
          }`}
          >
            {t(`synthesisReport.readiness.launch.${resolvedLaunchSignal}Title`)}
          </p>
          <p className="mt-1 text-xs text-gray-700">
            {resolvedLaunchSignal === LAUNCH_CONFIRMATION_AWAITING && roundStatus
              ? t('synthesisReport.readiness.launch.awaitingHint', {
                confirmed: roundStatus.confirmed.length,
                total: roundStatus.confirmed.length + roundStatus.pending.length + roundStatus.reexamining.length
              })
              : t(`synthesisReport.readiness.launch.${resolvedLaunchSignal}Hint`)}
          </p>
          {resolvedLaunchSignal !== LAUNCH_CONFIRMATION_CONFIRMED
            && resolvedLaunchSignal !== LAUNCH_CONFIRMATION_AWAITING
            && typeof onRequestFinalValidation === 'function' && (
            <button
              type="button"
              onClick={onRequestFinalValidation}
              className="mt-3 px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 shadow-md"
            >
              <Send className="w-4 h-4 mr-2" />
              {t('synthesisReport.readiness.launch.requestAction')}
            </button>
          )}
        </div>
      )}

      {isPreliminaryPending && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4" role="status">
          <p className="text-sm font-semibold text-blue-900">
            {t('synthesisReport.readiness.preliminaryPendingTitle')}
          </p>
          <p className="mt-1 text-xs text-blue-800">
            {t('synthesisReport.readiness.preliminaryPendingHint')}
          </p>
          {canRequestValidation && typeof onSubmitFinal === 'function' && (
            <button
              type="button"
              onClick={onSubmitFinal}
              className="mt-3 px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 shadow-md"
            >
              <Send className="w-4 h-4 mr-2" />
              {t('synthesisReport.readiness.validationAction')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectReadinessPanel;
