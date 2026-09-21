import React, { useState } from '../react.js';
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
// Il vit dans le rail latéral de la synthèse (colonne étroite, collante au défilement) : tout
// y est donc en une colonne, et une seule action est mise en avant — les explications de fond
// passent derrière un « Voir plus » plutôt que de former un mur de paragraphes.
export const ProjectReadinessPanel = ({
  readiness,
  openQuestionDoubts = [],
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
  // Déclaré avant toute sortie anticipée : un `return` placé au-dessus d'un hook casserait les
  // règles des hooks (cf. CLAUDE.md, le même piège a déjà été corrigé dans QuestionnaireScreen).
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  if (!readiness) {
    return null;
  }

  const levelById = new Map(readiness.levels.map((entry) => [entry.id, entry]));
  const canRequestPreliminary = levelById.get(READINESS_ORIENTATION)?.reached === true;
  const canRequestValidation = levelById.get(READINESS_VALIDATION)?.reached === true;
  const nextEntry = LEVEL_ORDER.map((levelId) => levelById.get(levelId)).find((entry) => entry && !entry.reached) || null;
  const isPreliminaryPending = isSubmitted && submissionKind === SUBMISSION_KIND_PRELIMINARY;
  const hasChangesToSend = pendingChanges.length > 0;
  // Une seule porte est mise en avant : la plus engageante de celles qui sont réellement
  // ouvertes. Deux boutons de poids égal obligeaient à arbitrer avant même d'avoir lu.
  const isValidationPrimary = canRequestValidation;
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

  // Ces intitulés de questions passent souvent sur deux lignes dans une colonne de 288 px, et
  // trois choses s'y liguaient contre la lisibilité : `text-xs` impose une interligne de 16 px
  // pour 12 px de texte, si bien que le soulignement d'une ligne — encore poussé vers le bas
  // par `underline-offset-2` — venait barrer la ligne suivante ; les puces natives du
  // navigateur ajoutaient un retrait de 40 px dans une boîte qui en fait 232 ; et un <button>
  // inline-block ne se replie pas comme un bloc. D'où `leading-loose` sans décalage de
  // soulignement, la puce explicite, et le bouton en élément de flex.
  // La couleur de la puce passe par un style en ligne, pas par une classe dans une ternaire :
  // le générateur CSS ne lit que les fragments statiques des template literals, donc une
  // classe qui n'existe que dans une branche de ternaire ne produit aucune règle et disparaît
  // sans que les deux garde-fous du build ne s'en aperçoivent.
  const renderQuestionLink = (id, label, onClick, dotColor = '#60a5fa') => (
    <li key={id} className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className="mt-2 h-1 w-1 flex-shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <button
        type="button"
        onClick={onClick}
        className="flex-1 text-left text-xs leading-loose text-blue-700 underline hover:text-blue-900"
      >
        {label}
      </button>
    </li>
  );

  const renderMissing = (missing) => (
    <ul className="mt-2 list-none space-y-1.5 p-0">
      {missing.slice(0, 4).map((question) => renderQuestionLink(
        question.id,
        resolveLocalizedText(question.question, language) || question.id,
        () => onNavigateToQuestion?.(question.id)
      ))}
      {missing.length > 4 && (
        <li className="text-xs leading-loose text-gray-500">
          {t('synthesisReport.readiness.moreMissing', { count: missing.length - 4 })}
        </li>
      )}
    </ul>
  );

  return (
    <div
      className="p-4"
      role="region"
      aria-label={t('synthesisReport.readiness.ariaLabel')}
      data-tour-id="synthesis-readiness"
    >
      {isSubmitted && typeof onSendUpdate === 'function' && (hasChangesToSend || !hasSentSnapshot) && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3" role="status">
          <p className="text-xs font-semibold text-amber-900">
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
            <ul className="mt-2 list-none space-y-1.5 p-0">
              {pendingChanges.slice(0, 3).map((change) => renderQuestionLink(
                change.questionId,
                resolveLocalizedText(change.question?.question, language) || change.questionId,
                () => onNavigateToQuestion?.(change.questionId),
                '#f59e0b'
              ))}
              {pendingChanges.length > 3 && (
                <li className="text-xs leading-loose text-amber-800">
                  {t('synthesisReport.readiness.moreChanges', { count: pendingChanges.length - 3 })}
                </li>
              )}
            </ul>
          )}
          <button
            type="button"
            onClick={onSendUpdate}
            className="mt-3 w-full px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center bg-amber-600 text-white hover:bg-amber-700 shadow-md"
          >
            <Send className="w-4 h-4 mr-2" />
            {t('synthesisReport.readiness.sendUpdateAction')}
          </button>
        </div>
      )}

      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-600">
        {t('synthesisReport.readiness.heading')}
      </h2>

      {/* Une échelle, pas trois cartes côte à côte : chacune portait sa propre liste « il
          manque », ce qui laissait croire que l'avis technique et la validation reposaient sur
          des réponses différentes. Ils demandent le même dossier — seule la fermeté des
          réponses les sépare — donc une seule liste, celle du prochain palier. */}
      <ol className="mt-3 flex flex-col" aria-label={t('synthesisReport.readiness.stepperAriaLabel')}>
        {LEVEL_ORDER.map((levelId, index) => {
          const entry = levelById.get(levelId);
          const reached = entry?.reached === true;
          const isNext = nextEntry?.id === levelId;

          return (
            <li key={levelId} className="flex gap-3">
              <div className="flex flex-col items-center">
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
                    className={`mt-1 w-0.5 flex-1 rounded-full ${reached ? 'bg-emerald-500' : 'bg-gray-200'}`}
                  />
                )}
              </div>
              <div className="pb-3">
                <p className={`text-sm font-semibold ${reached ? 'text-emerald-800' : isNext ? 'text-blue-800' : 'text-gray-500'}`}>
                  {t(`synthesisReport.readiness.level.${levelId}`)}
                </p>
                {isNext && (
                  <p className="mt-0.5 text-xs text-gray-600">
                    {t(`synthesisReport.readiness.levelRequirement.${levelId}`)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {nextEntry ? (
        nextEntry.missing.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-900">
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
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {t('synthesisReport.readiness.allLevelsReached')}
        </p>
      )}

      {openQuestionDoubts.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3" role="alert">
          <p className="flex items-start gap-2 text-xs font-semibold text-amber-800">
            <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0 text-amber-600" />
            {t('synthesisReport.readiness.uncertainHeading')}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {t('synthesisReport.readiness.uncertainHint')}
          </p>
          <ul className="mt-2 list-none space-y-1.5 p-0">
            {openQuestionDoubts.slice(0, 3).map((entry) => renderQuestionLink(
              entry.questionId,
              resolveLocalizedText(entry.question?.question, language) || entry.questionId,
              () => onNavigateToQuestion?.(entry.questionId),
              '#f59e0b'
            ))}
            {openQuestionDoubts.length > 3 && (
              <li className="text-xs leading-loose text-amber-800">
                {t('synthesisReport.readiness.moreMissing', { count: openQuestionDoubts.length - 3 })}
              </li>
            )}
          </ul>
        </div>
      )}

      {!isSubmitted && (
        <div className="mt-4">
          {isValidationPrimary ? (
            <React.Fragment>
              <button
                type="button"
                onClick={onSubmitFinal}
                className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                data-tour-id="synthesis-submit"
              >
                <Send className="w-4 h-4 mr-2" />
                {t('synthesisReport.readiness.validationAction')}
              </button>
              <p className="mt-2 text-xs text-gray-600">{t('synthesisReport.readiness.validationHint')}</p>
              <button
                type="button"
                onClick={onSubmitPreliminary}
                className="mt-2 text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
              >
                {t('synthesisReport.readiness.preliminaryAction')}
              </button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <button
                type="button"
                onClick={onSubmitPreliminary}
                disabled={!canRequestPreliminary}
                className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                data-tour-id="synthesis-submit"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('synthesisReport.readiness.preliminaryAction')}
              </button>
              <p className="mt-2 text-xs text-gray-600">
                {canRequestPreliminary
                  ? t('synthesisReport.readiness.preliminaryHint')
                  : t('synthesisReport.readiness.preliminaryBlocked')}
              </p>
              {/* La seconde porte reste visible même hors d'atteinte : la masquer ferait
                  disparaître la possibilité elle-même, pas seulement le bouton. Elle passe
                  simplement au second plan, avec ce qui la bloque juste en dessous. */}
              <button
                type="button"
                onClick={onSubmitFinal}
                disabled
                className="mt-3 w-full px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('synthesisReport.readiness.validationAction')}
              </button>
              <p className="mt-2 text-xs text-gray-500">{t('synthesisReport.readiness.validationBlocked')}</p>
            </React.Fragment>
          )}
        </div>
      )}

      {/* Interroger la compliance n'est pas la seule façon d'avancer : la vitrine sert d'abord
          à se confronter à son propre projet et à récolter des retours, avant même qu'un
          expert soit sollicité. */}
      {typeof onOpenShowcase === 'function' && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-semibold text-blue-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            {t('synthesisReport.readiness.thinkHeading')}
          </p>
          {showcaseFeedbackCount > 0 && (
            <p className="mt-1 text-xs font-semibold text-blue-900 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {t(
                showcaseFeedbackCount > 1
                  ? 'synthesisReport.readiness.feedbackCountPlural'
                  : 'synthesisReport.readiness.feedbackCountSingular',
                { count: showcaseFeedbackCount }
              )}
            </p>
          )}
          <button
            type="button"
            onClick={onOpenShowcase}
            className="mt-2 w-full px-3 py-2 bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-all flex items-center justify-center text-xs"
          >
            {t('synthesisReport.readiness.thinkAction')}
          </button>
        </div>
      )}

      {/* Le fond de l'affaire — pourquoi avis et validation demandent le même dossier, et ce
          que l'envoi engage — reste disponible, mais ne s'impose plus à chaque ouverture. */}
      <div className="mt-4 border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={() => setIsDetailOpen((previous) => !previous)}
          aria-expanded={isDetailOpen}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800"
        >
          <Info className="w-3 h-3 shrink-0" />
          {isDetailOpen ? t('synthesisReport.closeButton') : t('synthesisReport.seeMore')}
        </button>
        {isDetailOpen && (
          <div className="mt-2 space-y-2">
            <p className="text-xs leading-relaxed text-gray-600">{t('synthesisReport.readiness.intro')}</p>
            <p className="text-xs leading-relaxed text-gray-600">{t('synthesisReport.readiness.sameBaseNote')}</p>
            {!isSubmitted && (
              <p className="text-xs leading-relaxed text-gray-600">
                {notifiedTeamNames.length > 0
                  ? t('synthesisReport.readiness.engagementWithTeams', { teams: notifiedTeamNames.join(', ') })
                  : t('synthesisReport.readiness.engagementNoTeam')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Dernier tour avant lancement. Rien ne peut le rendre obligatoire — il n'existe pas de
          jalon opposable — donc sa force est d'être visible et de ne coûter qu'un clic à
          l'expert dans le cas nominal. */}
      {isSubmitted && !isPreliminaryPending && resolvedLaunchSignal && resolvedLaunchSignal !== 'none' && (
        <div
          className={`mt-4 rounded-xl border p-3 ${
            resolvedLaunchSignal === LAUNCH_CONFIRMATION_LAUNCHED_WITHOUT
              ? 'border-red-200 bg-red-50'
              : resolvedLaunchSignal === LAUNCH_CONFIRMATION_CONFIRMED
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
          }`}
          role={resolvedLaunchSignal === LAUNCH_CONFIRMATION_LAUNCHED_WITHOUT ? 'alert' : 'status'}
        >
          <p className={`text-xs font-semibold ${
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
          <div className="mt-3 flex flex-col gap-2">
            {resolvedLaunchSignal !== LAUNCH_CONFIRMATION_CONFIRMED
              && resolvedLaunchSignal !== LAUNCH_CONFIRMATION_AWAITING
              && resolvedLaunchSignal !== LAUNCH_CONFIRMATION_LATE
              && typeof onRequestFinalValidation === 'function' && (
              <button
                type="button"
                onClick={onRequestFinalValidation}
                className="w-full px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 shadow-md"
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
                className="w-full px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center border border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
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
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3" role="status">
          <p className="text-xs font-semibold text-blue-900">
            {t('synthesisReport.readiness.preliminaryPendingTitle')}
          </p>
          <p className="mt-1 text-xs text-blue-800">
            {t('synthesisReport.readiness.preliminaryPendingHint')}
          </p>
          {canRequestValidation && typeof onSubmitFinal === 'function' && (
            <button
              type="button"
              onClick={onSubmitFinal}
              className="mt-3 w-full px-3 py-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 shadow-md"
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
