import React, { useEffect, useRef } from '../react.js';
import { AlertTriangle, CheckCircle, Close, Sparkles, Target } from './icons.js';
import { CANDIDATE_TIERS } from '../utils/ruleDraftFromAnswers.js';
import { resolveLocalizedText } from '../utils/localizedContent.js';

const TIER_STYLES = {
  [CANDIDATE_TIERS.DISCRIMINANT]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [CANDIDATE_TIERS.SPECIFIC]: 'bg-amber-100 text-amber-800 border-amber-200',
  [CANDIDATE_TIERS.UNIVERSAL]: 'bg-gray-100 text-gray-600 border-gray-200'
};

const TIER_LABEL_KEYS = {
  [CANDIDATE_TIERS.DISCRIMINANT]: 'backOffice.main.benchTierDiscriminant',
  [CANDIDATE_TIERS.SPECIFIC]: 'backOffice.main.benchTierSpecific',
  [CANDIDATE_TIERS.UNIVERSAL]: 'backOffice.main.benchTierUniversal'
};

export const RuleDraftBuilder = ({
  t,
  language,
  sampleLabel,
  groupedCandidates,
  selectedIds,
  onToggleCandidate,
  operators,
  onOperatorChange,
  perQuestionLogic,
  onPerQuestionLogicChange,
  mode,
  onModeChange,
  sort,
  onSortChange,
  selectedCandidates,
  describedGroups,
  sampleMatch,
  projectMatch,
  name,
  onNameChange,
  teams,
  teamIds,
  onToggleTeam,
  onCancel,
  onConfirm
}) => {
  const closeRef = useRef(null);

  useEffect(() => {
    if (closeRef.current) {
      closeRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const hasConditions = selectedCandidates.length > 0;
  const safeTeams = Array.isArray(teams) ? teams : [];

  const renderCoverage = (candidate) => {
    if (!candidate || candidate.total === 0) {
      return null;
    }

    return (
      <span
        className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${TIER_STYLES[candidate.tier] || TIER_STYLES[CANDIDATE_TIERS.UNIVERSAL]}`}
        title={t(TIER_LABEL_KEYS[candidate.tier] || TIER_LABEL_KEYS[CANDIDATE_TIERS.UNIVERSAL])}
      >
        {t('backOffice.main.benchCoverageTemplate', { count: candidate.count, total: candidate.total })}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('backOffice.main.benchBuilderTitle')}
        className="mx-auto w-full max-w-6xl rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex flex-col gap-2 border-b border-gray-200 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              {t('backOffice.main.benchBuilderTitle')}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {sampleLabel
                ? t('backOffice.main.benchBuilderSubtitleTemplate', { name: sampleLabel })
                : t('backOffice.main.benchBuilderSubtitleGeneric')}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onCancel}
            aria-label={t('backOffice.main.benchBuilderCloseLabel')}
            className="self-start rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <Close className="h-5 w-5" />
          </button>
        </header>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
          <section className="space-y-4 p-5 lg:col-span-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1" role="group" aria-label={t('backOffice.main.benchLogicAriaLabel')}>
                <button
                  type="button"
                  onClick={() => onModeChange('all')}
                  aria-pressed={mode === 'all'}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === 'all' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-600'}`}
                >
                  {t('backOffice.main.benchLogicAll')}
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange('any')}
                  aria-pressed={mode === 'any'}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === 'any' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-600'}`}
                >
                  {t('backOffice.main.benchLogicAny')}
                </button>
              </div>

              <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1" role="group" aria-label={t('backOffice.main.benchSortAriaLabel')}>
                <button
                  type="button"
                  onClick={() => onSortChange('relevance')}
                  aria-pressed={sort === 'relevance'}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${sort === 'relevance' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-600'}`}
                >
                  {t('backOffice.main.benchSortRelevance')}
                </button>
                <button
                  type="button"
                  onClick={() => onSortChange('questionnaire')}
                  aria-pressed={sort === 'questionnaire'}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${sort === 'questionnaire' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-600'}`}
                >
                  {t('backOffice.main.benchSortQuestionnaire')}
                </button>
              </div>
            </div>

            {groupedCandidates.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                {t('backOffice.main.benchNoCandidate')}
              </p>
            ) : (
              <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
                {groupedCandidates.map((group) => {
                  const selectedInGroup = group.candidates.filter((candidate) => selectedIds.has(candidate.id));

                  return (
                    <article key={group.questionId} className="rounded-xl border border-gray-200 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-800">{group.questionLabel}</h3>
                        {selectedInGroup.length > 1 && mode === 'all' && (
                          <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 text-[11px]">
                            <button
                              type="button"
                              onClick={() => onPerQuestionLogicChange(group.questionId, 'any')}
                              aria-pressed={(perQuestionLogic[group.questionId] || 'any') === 'any'}
                              className={`rounded px-2 py-1 font-medium ${(perQuestionLogic[group.questionId] || 'any') === 'any' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}
                            >
                              {t('backOffice.main.benchGroupAny')}
                            </button>
                            <button
                              type="button"
                              onClick={() => onPerQuestionLogicChange(group.questionId, 'all')}
                              aria-pressed={perQuestionLogic[group.questionId] === 'all'}
                              className={`rounded px-2 py-1 font-medium ${perQuestionLogic[group.questionId] === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}
                            >
                              {t('backOffice.main.benchGroupAll')}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {group.candidates.map((candidate) => {
                          const isSelected = selectedIds.has(candidate.id);

                          return (
                            <div key={candidate.id} className="space-y-1">
                              <button
                                type="button"
                                onClick={() => onToggleCandidate(candidate.id)}
                                aria-pressed={isSelected}
                                className={`flex w-full items-center rounded-lg border px-3 py-2 text-left text-sm transition ${
                                  isSelected
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
                                }`}
                              >
                                <span
                                  className={`mr-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                                    isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                                  }`}
                                  aria-hidden="true"
                                >
                                  {isSelected && <CheckCircle className="h-3 w-3" />}
                                </span>
                                <span className="flex-1">{candidate.valueLabel}</span>
                                {renderCoverage(candidate)}
                              </button>

                              {isSelected && Array.isArray(candidate.operatorOptions) && candidate.operatorOptions.length > 1 && (
                                <div className="pl-6">
                                  <label className="sr-only" htmlFor={`bench-operator-${candidate.id}`}>
                                    {t('backOffice.main.benchOperatorLabel')}
                                  </label>
                                  <select
                                    id={`bench-operator-${candidate.id}`}
                                    value={operators[candidate.id] || candidate.operator}
                                    onChange={(event) => onOperatorChange(candidate.id, event.target.value)}
                                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                                  >
                                    {candidate.operatorOptions.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4 border-t border-gray-200 bg-gray-50 p-5 lg:col-span-2 lg:border-l lg:border-t-0">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
                <Target className="h-4 w-4 text-indigo-600" />
                {t('backOffice.main.benchScopeHeading')}
              </h3>

              {!hasConditions ? (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>{t('backOffice.main.benchNoConditionWarning')}</p>
                </div>
              ) : (
                <div className="mt-2 space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-sm font-semibold text-gray-800">
                      {t('backOffice.main.benchSampleMatchTemplate', { count: sampleMatch.count, total: sampleMatch.total })}
                    </p>
                    {sampleMatch.total === 0 ? (
                      <p className="mt-1 text-xs text-gray-500">{t('backOffice.main.benchNoSampleCorpus')}</p>
                    ) : (
                      <ul className="mt-2 space-y-1 text-xs text-gray-600">
                        {sampleMatch.matching.map((sample) => (
                          <li key={sample.id} className="flex items-center gap-1.5">
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                            {sample.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-sm font-semibold text-gray-800">
                      {t('backOffice.main.benchProjectMatchTemplate', { count: projectMatch.count, total: projectMatch.total })}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{t('backOffice.main.benchProjectMatchHint')}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">{t('backOffice.main.benchPreviewHeading')}</h3>
              <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
                {!hasConditions ? (
                  <p className="italic text-gray-400">{t('backOffice.main.benchPreviewEmpty')}</p>
                ) : (
                  <div className="space-y-2">
                    <p className="leading-7">
                      <span className="font-semibold text-indigo-700">{t('backOffice.main.benchPreviewIf')}</span>{' '}
                      {describedGroups.map((group, groupIndex) => (
                        <span key={`group-${groupIndex}`}>
                          {groupIndex > 0 && (
                            <span className="font-semibold text-indigo-700">{` ${t('backOffice.main.logicAnd')} `}</span>
                          )}
                          {group.items.length > 1 && <span className="text-gray-400">(</span>}
                          {group.items.map((item, itemIndex) => (
                            <span key={item.id}>
                              {itemIndex > 0 && (
                                <span className="font-semibold text-indigo-700">
                                  {group.logic === 'all'
                                    ? ` ${t('backOffice.main.logicAnd')} `
                                    : ` ${t('backOffice.main.logicOr')} `}
                                </span>
                              )}
                              <span className="rounded bg-indigo-50 px-1.5 py-0.5">{item.valueLabel}</span>
                            </span>
                          ))}
                          {group.items.length > 1 && <span className="text-gray-400">)</span>}
                        </span>
                      ))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('backOffice.main.benchPreviewGroupsTemplate', { count: describedGroups.length })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="bench-rule-name" className="text-sm font-bold uppercase tracking-wide text-gray-700">
                {t('backOffice.main.benchRuleNameLabel')}
              </label>
              <input
                id="bench-rule-name"
                type="text"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder={t('backOffice.main.benchRuleNamePlaceholder')}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">{t('backOffice.main.benchTeamsLabel')}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {safeTeams.map((team) => {
                  const isSelected = teamIds.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => onToggleTeam(team.id)}
                      aria-pressed={isSelected}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
                      }`}
                    >
                      {resolveLocalizedText(team.name, language) || team.id}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={onConfirm}
                disabled={!hasConditions}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('backOffice.main.benchConfirmButton')}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                {t('backOffice.main.benchCancelButton')}
              </button>
              <p className="text-center text-xs text-gray-500">{t('backOffice.main.benchConfirmHint')}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
