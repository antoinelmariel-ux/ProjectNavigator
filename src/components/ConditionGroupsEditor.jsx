import React from '../react.js';
import { Plus, Trash2 } from './icons.js';
import {
  createEmptyQuestionCondition,
  createEmptyTimingCondition,
  normalizeRuleConditionGroups,
  sanitizeRuleCondition
} from '../utils/ruleConditions.js';
import { ensureOperatorForType, getOperatorOptionsForType } from '../utils/operatorOptions.js';
import { getConditionQuestionEntries, getQuestionOptionLabels } from '../utils/questions.js';
import { resolveLocalizedText } from '../utils/localizedContent.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

// Panneau de critères partagé : même grammaire que les règles (groupes ET entre eux, logique
// ET/OU à l'intérieur d'un groupe, conditions « réponse » ou « comparaison de dates »). Le
// libellé de ce qui est déclenché est fourni par l'appelant via `summary`, le reste du panneau
// est identique d'un usage à l'autre.
export const ConditionGroupsEditor = ({
  idPrefix,
  groups,
  onChange,
  questions = [],
  language,
  emptyStateText,
  summary = null,
  addGroupLabel,
  createGroupLabel
}) => {
  const { t } = useTranslation();
  const conditionGroups = Array.isArray(groups) ? groups : [];
  const conditionQuestionEntries = getConditionQuestionEntries(questions, language);
  const dateQuestions = questions.filter((question) => (question.type || 'choice') === 'date');

  const emitGroups = (updater) => {
    const next = updater(conditionGroups);
    onChange(normalizeRuleConditionGroups({ conditionGroups: next }));
  };

  const addGroup = () => {
    emitGroups((current) => [...current, { logic: 'all', conditions: [createEmptyQuestionCondition()] }]);
  };

  const updateGroupLogic = (groupIndex, logic) => {
    emitGroups((current) => {
      const updated = [...current];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      updated[groupIndex] = { ...target, logic: logic === 'any' ? 'any' : 'all' };
      return updated;
    });
  };

  const deleteGroup = (groupIndex) => {
    emitGroups((current) => current.filter((_, index) => index !== groupIndex));
  };

  const addCondition = (groupIndex) => {
    emitGroups((current) => {
      const updated = [...current];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      const conditions = Array.isArray(target.conditions) ? [...target.conditions] : [];
      conditions.push(createEmptyQuestionCondition());
      updated[groupIndex] = { ...target, conditions };
      return updated;
    });
  };

  const deleteCondition = (groupIndex, conditionIndex) => {
    emitGroups((current) => {
      const updated = [...current];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      const conditions = Array.isArray(target.conditions)
        ? target.conditions.filter((_, index) => index !== conditionIndex)
        : [];
      updated[groupIndex] = { ...target, conditions };
      return updated;
    });
  };

  const changeConditionType = (groupIndex, conditionIndex, type) => {
    emitGroups((current) => {
      const updated = [...current];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      const conditions = Array.isArray(target.conditions) ? [...target.conditions] : [];
      conditions[conditionIndex] = type === 'timing'
        ? createEmptyTimingCondition()
        : createEmptyQuestionCondition();
      updated[groupIndex] = { ...target, conditions };
      return updated;
    });
  };

  // L'opérateur est réaligné sur le type de la question choisie, sinon un « contient » hérité
  // d'une question texte resterait collé à une question numérique et ne matcherait jamais.
  const updateConditionField = (groupIndex, conditionIndex, field, value) => {
    emitGroups((current) => {
      const updated = [...current];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      const conditions = Array.isArray(target.conditions) ? [...target.conditions] : [];
      const currentCondition = sanitizeRuleCondition(
        conditions[conditionIndex] || createEmptyQuestionCondition()
      );
      const updatedCondition = sanitizeRuleCondition({ ...currentCondition, [field]: value });
      const question = conditionQuestionEntries.find((entry) => entry.id === updatedCondition.question);
      const questionType = question?.type || 'choice';
      conditions[conditionIndex] = updatedCondition.type === 'timing'
        ? updatedCondition
        : { ...updatedCondition, operator: ensureOperatorForType(questionType, updatedCondition.operator) };
      updated[groupIndex] = { ...target, conditions };
      return updated;
    });
  };

  if (conditionGroups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-blue-200 bg-white p-4 text-center text-sm text-blue-700">
        <p>{emptyStateText}</p>
        <button
          type="button"
          onClick={addGroup}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {createGroupLabel || t('backOffice.main.createConditionGroupButton')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={addGroup}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        >
          <Plus className="h-4 w-4" />
          {addGroupLabel || t('backOffice.main.addGroupButton')}
        </button>
      </div>

      {summary && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{summary}</div>
      )}

      <div className="space-y-6">
        {conditionGroups.map((group, groupIdx) => {
          const logic = group.logic === 'any' ? 'any' : 'all';
          const conditions = Array.isArray(group.conditions) ? group.conditions : [];
          const connectorLabel = logic === 'any' ? t('backOffice.main.logicOr') : t('backOffice.main.logicAnd');

          return (
            <div key={`${idPrefix}-group-${groupIdx}`}>
              {groupIdx > 0 && (
                <div className="flex justify-center -mb-3" aria-hidden="true">
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow">
                    {t('backOffice.main.logicAnd')}
                  </span>
                </div>
              )}

              <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-4">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">
                    {t('backOffice.main.groupNumberTemplate', { number: groupIdx + 1 })}
                  </span>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-blue-800">
                    <span className="font-semibold">{t('backOffice.main.internalLogicLabel')}</span>
                    <select
                      value={logic}
                      onChange={(event) => updateGroupLogic(groupIdx, event.target.value)}
                      className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                      aria-label={t('backOffice.main.internalLogicLabel')}
                    >
                      <option value="all">{t('backOffice.main.allConditionsAndOption')}</option>
                      <option value="any">{t('backOffice.main.atLeastOneConditionOrOption')}</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteGroup(groupIdx)}
                    className="ml-auto rounded p-2 text-red-600 hover:bg-red-50"
                    aria-label={t('backOffice.main.removeGroupAriaLabelTemplate', { number: groupIdx + 1 })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {conditions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-blue-200 bg-white p-4 text-sm text-blue-700">
                    <p>{t('backOffice.main.addConditionToDefineGroup')}</p>
                    <button
                      type="button"
                      onClick={() => addCondition(groupIdx)}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
                    >
                      <Plus className="h-4 w-4" />
                      {t('backOffice.main.addConditionButton')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conditions.map((condition, conditionIdx) => {
                      const conditionType = condition.type === 'timing' ? 'timing' : 'question';
                      const selectedQuestion = conditionQuestionEntries.find(
                        (item) => item.id === condition.question
                      );
                      const selectedQuestionType = selectedQuestion?.type || 'choice';
                      const usesOptions = ['choice', 'multi_choice'].includes(selectedQuestionType);
                      const inputType = selectedQuestionType === 'number'
                        ? 'number'
                        : selectedQuestionType === 'date'
                          ? 'date'
                          : 'text';
                      const placeholder = selectedQuestionType === 'date'
                        ? t('backOffice.ruleEditor.datePlaceholder')
                        : selectedQuestionType === 'url'
                          ? t('backOffice.ruleEditor.urlPlaceholder')
                          : t('backOffice.main.valuePlaceholder');

                      return (
                        <div
                          key={`${idPrefix}-condition-${groupIdx}-${conditionIdx}`}
                          className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm"
                        >
                          <div className="mb-3 flex flex-wrap items-center gap-3">
                            {conditionIdx > 0 && (
                              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                                {connectorLabel}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-gray-700">
                              {t('backOffice.main.conditionNumberTemplate', { number: conditionIdx + 1 })}
                            </span>
                            <select
                              value={conditionType}
                              onChange={(event) => changeConditionType(groupIdx, conditionIdx, event.target.value)}
                              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                              aria-label={t('backOffice.main.conditionNumberTemplate', { number: conditionIdx + 1 })}
                            >
                              <option value="question">{t('backOffice.main.basedOnAnswerOption')}</option>
                              <option value="timing">{t('backOffice.main.dateComparisonOption')}</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => deleteCondition(groupIdx, conditionIdx)}
                              className="ml-auto rounded p-1 text-red-600 hover:bg-red-50"
                              aria-label={t('backOffice.main.removeConditionAriaLabelTemplate', { number: conditionIdx + 1 })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {conditionType === 'timing' ? (
                            <div className="space-y-4">
                              {dateQuestions.length >= 2 ? (
                                <>
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-gray-600">
                                        {t('backOffice.main.startDateLabel')}
                                      </label>
                                      <select
                                        value={condition.startQuestion}
                                        onChange={(event) =>
                                          updateConditionField(groupIdx, conditionIdx, 'startQuestion', event.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="">{t('backOffice.main.selectPlaceholder')}</option>
                                        {dateQuestions.map((question) => (
                                          <option key={question.id} value={question.id}>
                                            {resolveLocalizedText(question.question, language) || question.id}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-gray-600">
                                        {t('backOffice.main.endDateLabel')}
                                      </label>
                                      <select
                                        value={condition.endQuestion}
                                        onChange={(event) =>
                                          updateConditionField(groupIdx, conditionIdx, 'endQuestion', event.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="">{t('backOffice.main.selectPlaceholder')}</option>
                                        {dateQuestions.map((question) => (
                                          <option key={question.id} value={question.id}>
                                            {resolveLocalizedText(question.question, language) || question.id}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-gray-600">
                                        {t('backOffice.main.minDurationWeeksLabel')}
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={condition.minimumWeeks ?? ''}
                                        onChange={(event) =>
                                          updateConditionField(
                                            groupIdx,
                                            conditionIdx,
                                            'minimumWeeks',
                                            event.target.value === '' ? undefined : Number(event.target.value)
                                          )
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder={t('backOffice.main.exampleEightPlaceholder')}
                                      />
                                    </div>

                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-gray-600">
                                        {t('backOffice.main.maxDurationWeeksLabel')}
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={condition.maximumWeeks ?? ''}
                                        onChange={(event) =>
                                          updateConditionField(
                                            groupIdx,
                                            conditionIdx,
                                            'maximumWeeks',
                                            event.target.value === '' ? undefined : Number(event.target.value)
                                          )
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder={t('backOffice.main.leaveEmptyIfNotConcerned')}
                                      />
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="rounded-lg border border-dashed border-blue-200 bg-white p-4 text-sm text-blue-700">
                                  {t('backOffice.main.needTwoDateQuestionsWarning')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                  {t('backOffice.main.questionLabel')}
                                </label>
                                <select
                                  value={condition.question}
                                  onChange={(event) =>
                                    updateConditionField(groupIdx, conditionIdx, 'question', event.target.value)
                                  }
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">{t('backOffice.main.selectPlaceholder')}</option>
                                  {conditionQuestionEntries.map((question) => (
                                    <option key={question.id} value={question.id}>
                                      {resolveLocalizedText(question.question, language) || question.id}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                  {t('backOffice.main.operatorLabel')}
                                </label>
                                <select
                                  value={ensureOperatorForType(selectedQuestionType, condition.operator)}
                                  onChange={(event) =>
                                    updateConditionField(groupIdx, conditionIdx, 'operator', event.target.value)
                                  }
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                  {getOperatorOptionsForType(selectedQuestionType).map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                  {t('backOffice.main.valueLabel')}
                                </label>
                                {!condition.question ? (
                                  <input
                                    type="text"
                                    value={condition.value}
                                    onChange={(event) =>
                                      updateConditionField(groupIdx, conditionIdx, 'value', event.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder={t('backOffice.main.valuePlaceholder')}
                                  />
                                ) : selectedQuestionType === 'boolean' ? (
                                  <select
                                    value={condition.value}
                                    onChange={(event) =>
                                      updateConditionField(groupIdx, conditionIdx, 'value', event.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">{t('backOffice.main.selectPlaceholder')}</option>
                                    <option value="true">{t('backOffice.main.checkedOption')}</option>
                                    <option value="false">{t('backOffice.main.uncheckedOption')}</option>
                                  </select>
                                ) : usesOptions ? (
                                  <select
                                    value={condition.value}
                                    onChange={(event) =>
                                      updateConditionField(groupIdx, conditionIdx, 'value', event.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">{t('backOffice.main.selectPlaceholder')}</option>
                                    {getQuestionOptionLabels(selectedQuestion, { language }).map((option, optionIndex) => (
                                      <option key={optionIndex} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={inputType}
                                    value={condition.value}
                                    onChange={(event) =>
                                      updateConditionField(groupIdx, conditionIdx, 'value', event.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder={placeholder}
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="flex justify-end border-t border-blue-100 pt-3">
                      <button
                        type="button"
                        onClick={() => addCondition(groupIdx)}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
                      >
                        <Plus className="h-4 w-4" />
                        {t('backOffice.main.addConditionButton')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConditionGroupsEditor;
