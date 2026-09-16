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
  LAUNCH_CONFIRMATION_LATE,
  LAUNCH_CONFIRMATION_LAUNCHED_WITHOUT
} from '../utils/launchConfirmation.js';

const LEVEL_ORDER = [READINESS_ORIENTATION, READINESS_ADVICE, READINESS_VALIDATION];

// Ce panneau remplace le compteur « 14/21 » par la seule question qui intéresse le porteur :
// avec ce que j'ai déjà saisi, qu'est-ce que la compliance peut faire pour moi maintenant ?
export const ProjectReadinessPanel = ({
  readiness,
  uncertainCoverage = [],
  teams = [],
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
  onRequestFinalValidation,
  isLaunched = false,
  canDeclareLaunch = false,
  onDeclareLaunch
}) => {
  const { t, language } = useTranslation();

  if (!readiness) {
    return null;
  }

  const levelById = new Map(readiness.levels.map((entry) => [entry.id, entry]));
  const canRequestPreliminary = levelById.get(READINESS_ORIENTATION)?.reached === true;
  const canRequestValidation = levelById.get(READINESS_VALIDATION)?.reached === true;
  const nextEntry = LEVEL_ORDER.map((levelId) => levelById.get(levelId)).find((entry) => entry && !entry.reached) || null;
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

      {/* Une échelle, pas trois cartes côte à côte : chacune portait sa propre liste « il
          manque », ce qui laissait croire que l'avis technique et la validation reposaient sur
          des réponses différentes. Ils demandent le même dossier — seule la fermeté des
          réponses les sépare — donc une seule liste, celle du prochain palier. */}
      <ol className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-2" aria-label={t('synthesisReport.readiness.stepperAriaLabel')}>
        {LEVEL_ORDER.map((levelId, index) => {
          const entry = levelById.get(levelId);
          const reached = entry?.reached === true;
          const isNext = nextEntry?.id === levelId;

          return (
            <li key={levelId} className="flex flex-1 gap-3 sm:flex-col sm:gap-2">
              <div className="flex flex-col items-center sm:flex-row sm:w-full">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    reached
                      ? 'bg-emerald-600 text-white'
                      : isNext
                        ? 'bg-white text-blue-700 ring-2 ring-blue-500'
                        : 'bg-white text-gray-400 ring-1 ring-gray-300'
                  }`}
                >
                  {reached ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </span>
                {index < LEVEL_ORDER.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`mt-1 w-0.5 flex-1 rounded-full sm:mt-0 sm:ml-2 sm:h-0.5 sm:w-auto ${
                      reached ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
              <div className="pb-1 sm:pr-3">
                <p className={`text-sm font-semibold ${reached ? 'text-emerald-800' : isNext ? 'text-blue-800' : 'text-gray-500'}`}>
                  {t(`synthesisReport.readiness.level.${levelId}`)}
                </p>
                <p className="mt-0.5 text-xs text-gray-600">
                  {t(`synthesisReport.readiness.levelRequirement.${levelId}`)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 flex items-start gap-2 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-600">
        <Info className="mt-0.5 w-3 h-3 shrink-0" />
        <span>{t('synthesisReport.readiness.sameBaseNote')}</span>
      </p>

      {nextEntry ? (
        nextEntry.missing.length > 0 && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">
              {t('synthesisReport.readiness.nextLevelHeading', {
                level: t(`synthesisReport.readiness.level.${nextEntry.id}`)
              })}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {t(`synthesisReport.readiness.missingIntro.${nextEntry.id}`, { count: nextEntry.missing.length })}
            </p>
            {renderMissing(nextEntry.missing)}
          </div>
        )
      ) : (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          <CheckCircle className="w-4 h-4" />
          {t('synthesisReport.readiness.allLevelsReached')}
        </p>
      )}

      {uncertainCoverage.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 w-4 h-4 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {t('synthesisReport.readiness.uncertainHeading')}
              </p>
              <p className="mt-1 text-xs text-amber-700">
                {t('synthesisReport.readiness.uncertainHint')}
              </p>
              {/* Un doute qui n'est adressé à personne n'a aucune chance d'être levé : on dit
                  à qui il a été transmis, et on propose de le faire quand ce n'est pas le cas. */}
              <ul className="mt-2 space-y-2">
                {uncertainCoverage.map((entry) => {
                  const askedTeamNames = (entry.askedTeamIds || [])
                    .map((teamId) => {
                      const team = teams.find((item) => item?.id === teamId);
                      return resolveLocalizedText(team?.name, language) || teamId;
                    })
                    .filter(Boolean);

                  return (
                    <li key={entry.questionId}>
                      <button
                        type="button"
                        onClick={() => onNavigateToQuestion?.(entry.questionId)}
                        className="text-left text-xs font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700"
                      >
                        {resolveLocalizedText(entry.question?.question, language) || entry.questionId}
                      </button>
                      {askedTeamNames.length > 0 ? (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-800">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          {t('synthesisReport.readiness.uncertainRoutedTo', { teams: askedTeamNames.join(', ') })}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-amber-800">
                          {t('synthesisReport.readiness.uncertainUnrouted')}{' '}
                          <button
                            type="button"
                            onClick={() => onNavigateToQuestion?.(entry.questionId)}
                            className="font-semibold underline underline-offset-2 hover:text-amber-700"
                          >
                            {t('synthesisReport.readiness.uncertainRouteAction')}
                          </button>
                        </p>
                      )}
                    </li>
                  );
                })}
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
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {resolvedLaunchSignal !== LAUNCH_CONFIRMATION_CONFIRMED
              && resolvedLaunchSignal !== LAUNCH_CONFIRMATION_AWAITING
              && resolvedLaunchSignal !== LAUNCH_CONFIRMATION_LATE
              && typeof onRequestFinalValidation === 'function' && (
              <button
                type="button"
                onClick={onRequestFinalValidation}
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 shadow-md"
              >
                <Send className="w-4 h-4 mr-2" />
                {t('synthesisReport.readiness.launch.requestAction')}
              </button>
            )}
            {/* Le lancement est un constat, pas une déduction : il faut que quelqu'un le pose. */}
            {canDeclareLaunch && typeof onDeclareLaunch === 'function' && (
              <button
                type="button"
                onClick={() => onDeclareLaunch(!isLaunched)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center border ${
                  isLaunched
                    ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100'
                }`}
              >
                {isLaunched
                  ? t('synthesisReport.readiness.launch.revertLaunchAction')
                  : t('synthesisReport.readiness.launch.declareLaunchAction')}
              </button>
            )}
          </div>
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
