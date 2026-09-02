import React, { useEffect, useMemo, useRef, useState } from '../react.js';
import {
  Info,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Plus,
  Trash2
} from './icons.js';
import {
  buildExtraCheckboxQuestionId,
  formatAnswer,
  normalizeOtherOption,
  normalizeQuestionOptions,
  shouldShowOption
} from '../utils/questions.js';
import { normalizeConditionGroups } from '../utils/conditionGroups.js';
import { renderTextWithLinks } from '../utils/linkify.js';
import { RichTextEditor } from './RichTextEditor.jsx';
import { normalizeRankingConfig } from '../utils/ranking.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { resolveLocalizedText } from '../utils/localizedContent.js';

const normalizeMilestoneDrafts = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(item => ({
    date: typeof item?.date === 'string' ? item.date : '',
    description: typeof item?.description === 'string' ? item.description : ''
  }));
};

const isMilestoneDraftEmpty = (entry) => {
  const date = typeof entry?.date === 'string' ? entry.date.trim() : '';
  const description = typeof entry?.description === 'string' ? entry.description.trim() : '';

  return date.length === 0 && description.length === 0;
};

const areMilestoneDraftsEqual = (first, second) => {
  if (!Array.isArray(first) || !Array.isArray(second)) {
    return false;
  }

  if (first.length !== second.length) {
    return false;
  }

  return first.every((entry, index) => {
    const counterpart = second[index];

    if (!counterpart) {
      return false;
    }

    const entryDate = typeof entry?.date === 'string' ? entry.date : '';
    const entryDescription = typeof entry?.description === 'string' ? entry.description : '';
    const counterpartDate = typeof counterpart?.date === 'string' ? counterpart.date : '';
    const counterpartDescription =
      typeof counterpart?.description === 'string' ? counterpart.description : '';

    return entryDate === counterpartDate && entryDescription === counterpartDescription;
  });
};

const sanitizeMilestonesForAnswer = (drafts) => {
  if (!Array.isArray(drafts)) {
    return [];
  }

  return drafts
    .map(item => ({
      date: typeof item?.date === 'string' ? item.date.trim() : '',
      description: typeof item?.description === 'string' ? item.description.trim() : ''
    }))
    .filter(entry => entry.date.length > 0 || entry.description.length > 0);
};

const normalizeChoiceAnswer = (answer) => {
  if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
    return {
      value: typeof answer.value !== 'undefined'
        ? answer.value
        : typeof answer.label !== 'undefined'
          ? answer.label
          : '',
      children: Array.isArray(answer.children) ? answer.children : [],
      otherText: typeof answer.otherText === 'string' ? answer.otherText : '',
      childrenOtherText: typeof answer.childrenOtherText === 'string' ? answer.childrenOtherText : ''
    };
  }

  return {
    value: typeof answer === 'string' ? answer : '',
    children: [],
    otherText: '',
    childrenOtherText: ''
  };
};

const normalizeMultiChoiceAnswer = (answer) => {
  if (Array.isArray(answer)) {
    return { values: answer, children: {}, otherText: '', childrenOtherText: {} };
  }

  if (answer && typeof answer === 'object') {
    const values = Array.isArray(answer.values) ? answer.values : [];
    const children = answer.children && typeof answer.children === 'object' ? answer.children : {};
    const childrenOtherText = answer.childrenOtherText && typeof answer.childrenOtherText === 'object'
      ? answer.childrenOtherText
      : {};
    return {
      values,
      children,
      otherText: typeof answer.otherText === 'string' ? answer.otherText : '',
      childrenOtherText
    };
  }

  return { values: [], children: {}, otherText: '', childrenOtherText: {} };
};

const buildMultiChoiceAnswerPayload = (values, children, otherText, childrenOtherText = {}) => {
  const sanitizedValues = Array.isArray(values) ? values.filter(Boolean) : [];
  const sanitizedChildren = Object.entries(children || {})
    .reduce((acc, [key, childValues]) => {
      const normalized = Array.isArray(childValues)
        ? childValues.filter(Boolean)
        : [];
      if (normalized.length > 0) {
        acc[key] = normalized;
      }
      return acc;
    }, {});

  const sanitizedOtherText = typeof otherText === 'string' ? otherText : '';
  const sanitizedChildrenOtherText = Object.entries(childrenOtherText || {})
    .reduce((acc, [key, value]) => {
      if (!sanitizedChildren[key]) {
        return acc;
      }
      const normalized = typeof value === 'string' ? value.trim() : '';
      if (normalized) {
        acc[key] = normalized;
      }
      return acc;
    }, {});

  if (
    Object.keys(sanitizedChildren).length === 0
    && Object.keys(sanitizedChildrenOtherText).length === 0
    && !sanitizedOtherText
  ) {
    return sanitizedValues;
  }

  return {
    values: sanitizedValues,
    children: sanitizedChildren,
    otherText: sanitizedOtherText,
    childrenOtherText: sanitizedChildrenOtherText
  };
};

const isAnswerProvided = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== null && value !== undefined;
};

// Question sentinelle stable : évite un « return » avant les hooks (règle des Hooks React).
// Utilisée quand aucune question n’est disponible ; le composant rend alors null après les hooks.
const EMPTY_QUESTION = { id: '__cn_empty_question__', type: 'choice', options: [] };

export const QuestionnaireScreen = ({
  questions,
  currentIndex,
  answers,
  onAnswer,
  onNext,
  onBack,
  allQuestions,
  onNavigateToQuestion,
  saveFeedback,
  onDismissSaveFeedback,
  validationError,
  tourContext = null,
  onReturnToSynthesis,
  isReturnToSynthesisRequested = false,
  onFinish
}) => {
  const { t, language } = useTranslation();
  const activeQuestion = questions[currentIndex];
  // Repli sur une sentinelle stable pour que les hooks ci-dessous s’exécutent toujours
  // (le rendu réel est court-circuité plus bas si activeQuestion est absente).
  const currentQuestion = activeQuestion || EMPTY_QUESTION;
  const questionBank = allQuestions || questions;
  const currentQuestionText = resolveLocalizedText(currentQuestion.question, language);
  const currentQuestionPlaceholder = resolveLocalizedText(currentQuestion.placeholder, language).trim();
  const currentQuestionNumberUnit = resolveLocalizedText(currentQuestion.numberUnit, language).trim();

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredQuestionsCount = questions.filter(
    (question) => question?.id && isAnswerProvided(answers[question.id])
  ).length;
  const remainingQuestions = Math.max(questions.length - (currentIndex + 1), 0);
  const remainingLabel = remainingQuestions === 0
    ? t('questionnaire.noRemainingQuestions')
    : t(remainingQuestions > 1 ? 'questionnaire.remainingQuestionsPlural' : 'questionnaire.remainingQuestionsSingular', { count: remainingQuestions });
  const questionType = currentQuestion.type || 'choice';
  const currentAnswer = answers[currentQuestion.id];
  const choiceAnswerState = useMemo(() => normalizeChoiceAnswer(currentAnswer), [currentAnswer]);
  const multiAnswerState = useMemo(() => normalizeMultiChoiceAnswer(currentAnswer), [currentAnswer]);
  const multiSelection = multiAnswerState.values;
  const rawExtraCheckbox = currentQuestion.extraCheckbox || { enabled: false, label: '' };
  const extraCheckbox = { ...rawExtraCheckbox, label: resolveLocalizedText(rawExtraCheckbox.label, language) };
  const extraCheckboxId = buildExtraCheckboxQuestionId(currentQuestion.id);
  const extraCheckboxAnswer = answers[extraCheckboxId];
  const otherOption = useMemo(
    () => normalizeOtherOption(currentQuestion.otherOption, language),
    [currentQuestion.otherOption, language]
  );
  const otherOptionPlaceholder = typeof otherOption.placeholder === 'string'
    ? otherOption.placeholder.trim()
    : '';
  const normalizedOptions = useMemo(
    () => normalizeQuestionOptions(currentQuestion, { language }),
    [currentQuestion, language]
  );
  const visibleOptions = useMemo(
    () => normalizedOptions.filter(option => shouldShowOption(option, answers)),
    [normalizedOptions, answers]
  );
  const visibleOptionValues = useMemo(
    () => visibleOptions.map(option => option.value),
    [visibleOptions]
  );
  const rankingConfig = useMemo(
    () => normalizeRankingConfig(currentQuestion.rankingConfig || {}, language),
    [currentQuestion.rankingConfig, language]
  );
  const rankingAnswer = useMemo(() => {
    const rawPrioritized = Array.isArray(currentAnswer?.prioritized) ? currentAnswer.prioritized : [];
    const rawIgnored = Array.isArray(currentAnswer?.ignored) ? currentAnswer.ignored : [];

    const validCriteria = rankingConfig.criteria.map(item => item.id);
    const prioritized = rawPrioritized.filter(id => validCriteria.includes(id));
    const ignored = rawIgnored.filter(id => validCriteria.includes(id));

    return {
      prioritized,
      ignored
    };
  }, [currentAnswer, rankingConfig]);
  const [showGuidance, setShowGuidance] = useState(false);
  const [milestoneDrafts, setMilestoneDrafts] = useState(() => normalizeMilestoneDrafts(currentAnswer));
  const milestoneQuestionIdRef = useRef(questionType === 'milestone_list' ? currentQuestion.id : null);
  const questionTextId = `question-${currentQuestion.id}`;
  const instructionsId = `instructions-${currentQuestion.id}`;
  const guidancePanelId = `guidance-${currentQuestion.id}`;
  const progressLabelId = `progress-label-${currentQuestion.id}`;
  const hasValidationError = validationError?.questionId === currentQuestion.id;

  useEffect(() => {
    const isEditableTarget = (target) => {
      if (!(target instanceof Element)) {
        return false;
      }

      return Boolean(
        target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')
      );
    };

    const handleArrowNavigation = (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        event.preventDefault();
        onBack?.();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext?.();
      }
    };

    window.addEventListener('keydown', handleArrowNavigation);
    return () => {
      window.removeEventListener('keydown', handleArrowNavigation);
    };
  }, [currentIndex, onBack, onNext]);
  const hasSaveFeedback = Boolean(saveFeedback?.message);
  const isSaveSuccess = saveFeedback?.status === 'success';
  const relatedQuestionEntries = useMemo(() => {
    if (!isReturnToSynthesisRequested) {
      return [];
    }

    const currentQuestionId = currentQuestion.id;

    return questions
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => question?.id && question.id !== currentQuestionId)
      .filter(({ question }) => normalizeConditionGroups(question).some(group =>
        group.conditions.some(condition => condition.question === currentQuestionId)
      ))
      .filter(({ index }) => index > currentIndex);
  }, [currentIndex, currentQuestion.id, isReturnToSynthesisRequested, questions]);
  const hasLinkedQuestions = relatedQuestionEntries.length > 0;
  const nextLinkedQuestion = relatedQuestionEntries[0]?.question || null;
  const shouldShowNextButton = !isReturnToSynthesisRequested || hasLinkedQuestions;
  const shouldShowFinishButton = !isReturnToSynthesisRequested || hasLinkedQuestions;
  const handleLinkedQuestionNext = () => {
    if (nextLinkedQuestion && typeof onNavigateToQuestion === 'function') {
      onNavigateToQuestion(nextLinkedQuestion.id);
      return;
    }

    onNext();
  };

  useEffect(() => {
    setShowGuidance(false);
  }, [currentQuestion.id]);

  useEffect(() => {
    if (questionType === 'choice') {
      if (choiceAnswerState.value && !visibleOptionValues.includes(choiceAnswerState.value)) {
        onAnswer(currentQuestion.id, null);
      }
      return;
    }

    if (questionType === 'multi_choice') {
      const filtered = multiSelection.filter(option => visibleOptionValues.includes(option));
      if (filtered.length !== multiSelection.length) {
        const otherOptionValue = visibleOptions.find((option) => option.isOther)?.value || '';
        const nextOtherText = otherOptionValue && filtered.includes(otherOptionValue)
          ? multiAnswerState.otherText
          : '';
        onAnswer(
          currentQuestion.id,
          buildMultiChoiceAnswerPayload(
            filtered,
            multiAnswerState.children,
            nextOtherText,
            multiAnswerState.childrenOtherText
          )
        );
      }
    }
  }, [
    choiceAnswerState.value,
    currentQuestion.id,
    multiAnswerState.children,
    multiAnswerState.otherText,
    multiSelection,
    onAnswer,
    questionType,
    visibleOptionValues,
    visibleOptions
  ]);

  useEffect(() => {
    if (questionType !== 'milestone_list') {
      milestoneQuestionIdRef.current = null;
      setMilestoneDrafts([]);
      return;
    }

    const normalizedAnswer = normalizeMilestoneDrafts(currentAnswer);
    const previousQuestionId = milestoneQuestionIdRef.current;
    milestoneQuestionIdRef.current = currentQuestion.id;

    setMilestoneDrafts(previousDrafts => {
      if (previousQuestionId !== currentQuestion.id) {
        return normalizedAnswer;
      }

      if (
        normalizedAnswer.length === 0 &&
        Array.isArray(previousDrafts) &&
        previousDrafts.length > 0 &&
        previousDrafts.every(isMilestoneDraftEmpty)
      ) {
        return previousDrafts;
      }

      const normalizedPreviousDrafts = normalizeMilestoneDrafts(previousDrafts);

      if (
        normalizedPreviousDrafts.length > normalizedAnswer.length &&
        areMilestoneDraftsEqual(
          sanitizeMilestonesForAnswer(normalizedPreviousDrafts),
          normalizedAnswer
        )
      ) {
        return previousDrafts;
      }

      if (areMilestoneDraftsEqual(normalizedPreviousDrafts, normalizedAnswer)) {
        return previousDrafts;
      }

      return normalizedAnswer;
    });
  }, [currentAnswer, currentQuestion.id, questionType]);

  useEffect(() => {
    if (!tourContext?.isActive) {
      return;
    }

    if (tourContext.activeStep === 'question-guidance') {
      setShowGuidance(true);
    } else if (tourContext.activeStep !== 'question-guidance' && showGuidance) {
      setShowGuidance(false);
    }
  }, [tourContext, showGuidance]);

  useEffect(() => {
    if (!tourContext?.isActive) {
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    const { activeStep } = tourContext;
    let selector = null;

    if (activeStep === 'question-guidance') {
      selector = '[data-tour-id="question-guidance-toggle"]';
    }

    if (selector) {
      const element = document.querySelector(selector);
      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [tourContext]);

  const guidance = currentQuestion.guidance || {};
  const guidanceObjective = resolveLocalizedText(guidance.objective, language).trim();
  const guidanceDetails = resolveLocalizedText(guidance.details, language).trim();
  const guidanceTips = useMemo(() => (
    Array.isArray(guidance.tips)
      ? guidance.tips.map(tip => resolveLocalizedText(tip, language).trim()).filter(tip => tip !== '')
      : []
  ), [guidance, language]);

  const conditionSummaries = useMemo(() => {
    const conditionGroups = normalizeConditionGroups(currentQuestion);
    return conditionGroups.map((group, groupIdx) => {
      const logic = group.logic === 'any' ? 'any' : 'all';
      const conditions = (group.conditions || []).map(condition => {
        const referenceQuestion = questionBank.find(q => q.id === condition.question);
        const label = resolveLocalizedText(referenceQuestion?.question, language) || `Question ${condition.question}`;
        const formattedAnswer = formatAnswer(referenceQuestion, answers[condition.question], language);

        return {
          label,
          operator: t(`questionnaire.operators.${condition.operator}`),
          value: condition.value,
          answer: formattedAnswer
        };
      });

      return {
        logic,
        conditions,
        groupIdx
      };
    });
  }, [answers, currentQuestion, questionBank, t, language]);

  const hasConditions = useMemo(
    () => conditionSummaries.some(summary => summary.conditions.length > 0),
    [conditionSummaries]
  );

  const hasGuidanceContent = useMemo(() => {
    return guidanceObjective !== '' || guidanceDetails !== '' || guidanceTips.length > 0 || hasConditions;
  }, [guidanceObjective, guidanceDetails, guidanceTips, hasConditions]);

  const rankingPrioritized = useMemo(() => {
    if (questionType !== 'ranking') {
      return [];
    }

    const defaultOrder = rankingConfig.criteria.map(item => item.id);
    return rankingAnswer.prioritized.length > 0 ? rankingAnswer.prioritized : defaultOrder;
  }, [questionType, rankingAnswer.prioritized, rankingConfig.criteria]);

  const rankingIgnoredSet = useMemo(() => new Set(questionType === 'ranking' ? rankingAnswer.ignored : []), [questionType, rankingAnswer.ignored]);

  const handleRankingMove = (criterionId, direction) => {
    const currentOrder = rankingPrioritized;
    const currentIndex = currentOrder.indexOf(criterionId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const nextOrder = [...currentOrder];
    const [moved] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(targetIndex, 0, moved);

    onAnswer(currentQuestion.id, {
      prioritized: nextOrder,
      ignored: rankingAnswer.ignored
    });
  };

  const handleRankingToggleIgnored = (criterionId) => {
    const isIgnored = rankingIgnoredSet.has(criterionId);
    const nextIgnored = isIgnored
      ? rankingAnswer.ignored.filter(id => id !== criterionId)
      : [...rankingAnswer.ignored, criterionId];

    const nextPrioritized = isIgnored
      ? (rankingAnswer.prioritized.length > 0
        ? rankingAnswer.prioritized
        : rankingConfig.criteria.map(item => item.id))
      : rankingPrioritized.filter(id => id !== criterionId);

    if (!isIgnored && nextPrioritized.length === 0) {
      nextPrioritized.push(...rankingConfig.criteria.map(item => item.id).filter(id => id !== criterionId));
    }

    onAnswer(currentQuestion.id, {
      prioritized: nextPrioritized,
      ignored: nextIgnored
    });
  };

  const handleRankingReset = () => {
    const defaultOrder = rankingConfig.criteria.map(item => item.id);
    onAnswer(currentQuestion.id, { prioritized: defaultOrder, ignored: [] });
  };

  const renderQuestionInput = () => {
    switch (questionType) {
      case 'date':
        return (
          <div className="mb-8" data-tour-id="question-main-content">
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3" htmlFor={`${currentQuestion.id}-date`}>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {t('questionnaire.selectDate')}
              </span>
            </label>
            <input
              type="date"
              value={currentAnswer ?? ''}
              onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
              id={`${currentQuestion.id}-date`}
              aria-describedby={currentIndex === 0 ? instructionsId : undefined}
              className="w-full px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-2">{t('questionnaire.dateFormatHint')}</p>
          </div>
        );
      case 'choice':
        return (
          <fieldset className="space-y-3 mb-8" aria-describedby={currentIndex === 0 ? instructionsId : undefined}>
            <legend className="sr-only">{currentQuestionText}</legend>
            {visibleOptions.map((option, idx) => {
              const optionValue = option.value;
              const optionLabel = option.label;
              const isSelected = choiceAnswerState.value === optionValue;
              const optionId = `${currentQuestion.id}-option-${idx}`;
              const subOptions = Array.isArray(option.subOptions) ? option.subOptions : [];
              const hasSubOptions = subOptions.length > 0;
              const subType = option.subType === 'multi_choice' ? 'multi_choice' : 'choice';
              const isOtherOption = option.isOther === true;
              const otherSubOptionValue = subOptions.find(subOption => subOption?.isOther)?.value;

              const handleSelectOption = () => {
                if (isOtherOption) {
                  onAnswer(currentQuestion.id, {
                    value: optionValue,
                    label: optionLabel,
                    otherText: choiceAnswerState.otherText || ''
                  });
                  return;
                }
                if (hasSubOptions) {
                  const preservedChildren = isSelected ? choiceAnswerState.children : [];
                  const preservedChildrenOtherText = isSelected ? choiceAnswerState.childrenOtherText : '';
                  onAnswer(currentQuestion.id, {
                    value: optionValue,
                    label: optionLabel,
                    children: preservedChildren,
                    childrenOtherText: preservedChildrenOtherText
                  });
                  return;
                }
                onAnswer(currentQuestion.id, optionValue);
              };

              const childSelections = isSelected ? choiceAnswerState.children : [];

              return (
                <div
                  key={idx}
                  className={`w-full p-3 sm:p-4 flex flex-col gap-3 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <label htmlFor={optionId} className="flex flex-1 items-center cursor-pointer">
                      <input
                        type="radio"
                        id={optionId}
                        name={currentQuestion.id}
                        value={optionValue}
                        checked={isSelected}
                        onChange={handleSelectOption}
                        className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 font-medium text-sm sm:text-base">{optionLabel}</span>
                    </label>
                    {isSelected && <CheckCircle className="w-5 h-5 shrink-0 text-blue-600" />}
                  </div>
                  {isSelected && isOtherOption && (
                    <div className="w-full sm:pl-8 sm:border-l sm:border-gray-200 space-y-2">
                      <p className="text-xs text-gray-500">{t('questionnaire.specifyChoice')}</p>
                      <input
                        id={`${optionId}-other`}
                        type="text"
                        value={choiceAnswerState.otherText}
                        onChange={(e) => onAnswer(currentQuestion.id, {
                          value: optionValue,
                          label: optionLabel,
                          otherText: e.target.value
                        })}
                        placeholder={otherOptionPlaceholder || t('questionnaire.specifyAnswerPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  {isSelected && hasSubOptions && !isOtherOption && (
                    <div className="w-full sm:pl-8 sm:border-l sm:border-gray-200 space-y-2">
                      <p className="text-xs text-gray-500">{t('questionnaire.specifyChoice')}</p>
                      <div className="space-y-2">
                        {subOptions.map((subOption, subIdx) => {
                          const subValue = subOption.value;
                          const subLabel = subOption.label;
                          const subId = `${optionId}-sub-${subIdx}`;
                          const isSubSelected = childSelections.includes(subValue);
                          const isSubOtherOption = subOption.isOther === true;
                          const toggleSubOption = () => {
                            const nextChildren = subType === 'multi_choice'
                              ? (isSubSelected
                                ? childSelections.filter(item => item !== subValue)
                                : [...childSelections, subValue])
                              : [subValue];
                            const nextChildrenOtherText = otherSubOptionValue
                              && !nextChildren.includes(otherSubOptionValue)
                              ? ''
                              : choiceAnswerState.childrenOtherText;
                            onAnswer(currentQuestion.id, {
                              value: optionValue,
                              label: optionLabel,
                              children: nextChildren,
                              childrenOtherText: nextChildrenOtherText
                            });
                          };

                          return (
                            <div key={subId} className="space-y-1">
                              <label htmlFor={subId} className="flex items-center text-sm text-gray-700">
                                <input
                                  id={subId}
                                  type={subType === 'multi_choice' ? 'checkbox' : 'radio'}
                                  name={subType === 'multi_choice' ? subId : `${optionId}-sub-group`}
                                  checked={isSubSelected}
                                  onChange={toggleSubOption}
                                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="ml-2">{subLabel}</span>
                              </label>
                              {isSubSelected && isSubOtherOption && (
                                <input
                                  type="text"
                                  value={choiceAnswerState.childrenOtherText}
                                  onChange={(event) =>
                                    onAnswer(currentQuestion.id, {
                                      value: optionValue,
                                      label: optionLabel,
                                      children: childSelections,
                                      childrenOtherText: event.target.value
                                    })}
                                  placeholder={t('questionnaire.specifyAnswerPlaceholder')}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {choiceAnswerState.value && (
              <button
                type="button"
                onClick={() => onAnswer(currentQuestion.id, '')}
                className="text-sm font-medium text-gray-500 underline underline-offset-4 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              >
                {t('questionnaire.clearMyAnswer')}
              </button>
            )}
          </fieldset>
        );
      case 'multi_choice':
        return (
          <div className="space-y-3 mb-8">
            {visibleOptions.map((option, idx) => {
              const optionValue = option.value;
              const optionLabel = option.label;
              const isSelected = multiSelection.includes(optionValue);
              const optionId = `${currentQuestion.id}-multi-option-${idx}`;
              const subOptions = Array.isArray(option.subOptions) ? option.subOptions : [];
              const hasSubOptions = subOptions.length > 0;
              const subType = option.subType === 'multi_choice' ? 'multi_choice' : 'choice';
              const childSelections = Array.isArray(multiAnswerState.children[optionValue])
                ? multiAnswerState.children[optionValue]
                : [];
              const otherSubOptionValue = subOptions.find(subOption => subOption?.isOther)?.value;
              const childOtherText = typeof multiAnswerState.childrenOtherText?.[optionValue] === 'string'
                ? multiAnswerState.childrenOtherText[optionValue]
                : '';
              const isOtherOption = option.isOther === true;
              const resolveOtherText = (values) => (
                option.isOther && values.includes(optionValue) ? multiAnswerState.otherText : ''
              );

              const toggleOption = () => {
                const nextChildren = { ...multiAnswerState.children };
                const nextChildrenOtherText = { ...multiAnswerState.childrenOtherText };
                if (isSelected) {
                  delete nextChildren[optionValue];
                  delete nextChildrenOtherText[optionValue];
                  const nextValues = multiSelection.filter(item => item !== optionValue);
                  const nextOtherText = isOtherOption ? '' : resolveOtherText(nextValues);
                  onAnswer(
                    currentQuestion.id,
                    buildMultiChoiceAnswerPayload(
                      nextValues,
                      nextChildren,
                      nextOtherText,
                      nextChildrenOtherText
                    )
                  );
                } else {
                  const nextValues = [...multiSelection, optionValue];
                  onAnswer(
                    currentQuestion.id,
                    buildMultiChoiceAnswerPayload(
                      nextValues,
                      nextChildren,
                      resolveOtherText(nextValues),
                      nextChildrenOtherText
                    )
                  );
                }
              };

              return (
                <div
                  key={idx}
                  className={`w-full p-3 sm:p-4 flex flex-col gap-3 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <label htmlFor={optionId} className="flex flex-1 items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={toggleOption}
                        id={optionId}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 font-medium text-sm sm:text-base">{optionLabel}</span>
                    </label>
                    {isSelected && <CheckCircle className="w-5 h-5 shrink-0 text-blue-600" />}
                  </div>
                  {isSelected && isOtherOption && (
                    <div className="w-full sm:pl-8 sm:border-l sm:border-gray-200 space-y-2">
                      <p className="text-xs text-gray-500">{t('questionnaire.specifyChoice')}</p>
                      <input
                        id={`${optionId}-other`}
                        type="text"
                        value={multiAnswerState.otherText}
                        onChange={(e) => {
                          const nextValues = isSelected
                            ? multiSelection
                            : [...multiSelection, optionValue];
                          onAnswer(
                            currentQuestion.id,
                            buildMultiChoiceAnswerPayload(
                              nextValues,
                              multiAnswerState.children,
                              e.target.value,
                              multiAnswerState.childrenOtherText
                            )
                          );
                        }}
                        placeholder={otherOptionPlaceholder || t('questionnaire.specifyAnswerPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  {isSelected && hasSubOptions && !isOtherOption && (
                    <div className="w-full sm:pl-8 sm:border-l sm:border-gray-200 space-y-2">
                      <p className="text-xs text-gray-500">{t('questionnaire.specifyChoice')}</p>
                      <div className="space-y-2">
                        {subOptions.map((subOption, subIdx) => {
                          const subValue = subOption.value;
                          const subLabel = subOption.label;
                          const subId = `${optionId}-sub-${subIdx}`;
                          const isSubSelected = childSelections.includes(subValue);
                          const isSubOtherOption = subOption.isOther === true;
                          const toggleSubOption = () => {
                            const nextChildren = subType === 'multi_choice'
                              ? (isSubSelected
                                ? childSelections.filter(item => item !== subValue)
                                : [...childSelections, subValue])
                              : [subValue];
                            const nextValues = isSelected
                              ? multiSelection
                              : [...multiSelection, optionValue];
                            const nextChildrenOtherText = { ...multiAnswerState.childrenOtherText };
                            if (otherSubOptionValue && !nextChildren.includes(otherSubOptionValue)) {
                              delete nextChildrenOtherText[optionValue];
                            }
                            onAnswer(
                              currentQuestion.id,
                              buildMultiChoiceAnswerPayload(
                                nextValues,
                                {
                                  ...multiAnswerState.children,
                                  [optionValue]: nextChildren
                                },
                                resolveOtherText(nextValues),
                                nextChildrenOtherText
                              )
                            );
                          };

                          return (
                            <div key={subId} className="space-y-1">
                              <label htmlFor={subId} className="flex items-center text-sm text-gray-700">
                                <input
                                  id={subId}
                                  type={subType === 'multi_choice' ? 'checkbox' : 'radio'}
                                  name={subType === 'multi_choice' ? subId : `${optionId}-sub-group`}
                                  checked={isSubSelected}
                                  onChange={toggleSubOption}
                                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <span className="ml-2">{subLabel}</span>
                              </label>
                              {isSubSelected && isSubOtherOption && (
                                <input
                                  type="text"
                                  value={childOtherText}
                                  onChange={(event) => {
                                    const nextValues = isSelected
                                      ? multiSelection
                                      : [...multiSelection, optionValue];
                                    onAnswer(
                                      currentQuestion.id,
                                      buildMultiChoiceAnswerPayload(
                                        nextValues,
                                        {
                                          ...multiAnswerState.children,
                                          [optionValue]: childSelections
                                        },
                                        resolveOtherText(nextValues),
                                        {
                                          ...multiAnswerState.childrenOtherText,
                                          [optionValue]: event.target.value
                                        }
                                      )
                                    );
                                  }}
                                  placeholder={t('questionnaire.specifyAnswerPlaceholder')}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      case 'ranking': {
        const orderedCriteria = rankingPrioritized
          .map(id => rankingConfig.criteria.find(criterion => criterion.id === id))
          .filter(Boolean);
        const ignoredCriteria = rankingConfig.criteria.filter(criterion => rankingIgnoredSet.has(criterion.id));

        return (
          <div className="space-y-4 mb-8" data-tour-id="question-main-content">
            <p className="text-sm text-gray-600">{t('questionnaire.rankingInstructions')}</p>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-gray-500">{t('questionnaire.rankingArrowsHint')}</span>
              <button
                type="button"
                onClick={handleRankingReset}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                {t('questionnaire.resetOrder')}
              </button>
            </div>

            <div className="space-y-3">
              {orderedCriteria.map((criterion, index) => {
                const isFirst = index === 0;
                const isLast = index === orderedCriteria.length - 1;

                return (
                  <div
                    key={criterion.id}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-200"
                  >
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleRankingMove(criterion.id, 'up')}
                        disabled={isFirst}
                        className="px-2 py-1 text-xs font-semibold border rounded-lg disabled:opacity-40 hover:bg-blue-50"
                        aria-label={t('questionnaire.moveUp', { label: criterion.label })}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRankingMove(criterion.id, 'down')}
                        disabled={isLast}
                        className="px-2 py-1 text-xs font-semibold border rounded-lg disabled:opacity-40 hover:bg-blue-50"
                        aria-label={t('questionnaire.moveDown', { label: criterion.label })}
                      >
                        ↓
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{index + 1}. {criterion.label}</p>
                      {criterion.description && <p className="text-xs text-gray-500">{criterion.description}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRankingToggleIgnored(criterion.id)}
                      className={`text-xs font-medium px-3 py-2 rounded-lg border transition ${
                        rankingIgnoredSet.has(criterion.id)
                          ? 'border-gray-300 text-gray-600 bg-gray-50'
                          : 'border-red-200 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {rankingIgnoredSet.has(criterion.id) ? t('questionnaire.markAsImportant') : t('questionnaire.markAsUnimportant')}
                    </button>
                  </div>
                );
              })}
            </div>

            {ignoredCriteria.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">{t('questionnaire.unimportantCriteriaHeading')}</p>
                <div className="flex flex-wrap gap-2">
                  {ignoredCriteria.map(criterion => (
                    <button
                      key={criterion.id}
                      type="button"
                      onClick={() => handleRankingToggleIgnored(criterion.id)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-full bg-white hover:border-blue-300"
                    >
                      {criterion.label}
                      <span className="text-blue-600">{t('questionnaire.reintegrate')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'milestone_list': {
        const handleMilestoneUpdate = (updater) => {
          setMilestoneDrafts(prev => {
            const nextDrafts = typeof updater === 'function' ? updater(prev) : updater;
            const sanitized = sanitizeMilestonesForAnswer(nextDrafts);
            onAnswer(currentQuestion.id, sanitized);
            return nextDrafts;
          });
        };

        const handleMilestoneFieldChange = (index, field, value) => {
          handleMilestoneUpdate(prev => {
            const nextDrafts = prev.map((entry, entryIndex) => {
              if (entryIndex !== index) {
                return entry;
              }

              return {
                ...entry,
                [field]: value
              };
            });

            return nextDrafts;
          });
        };

        const handleMilestoneRemoval = (index) => {
          handleMilestoneUpdate(prev => prev.filter((_, entryIndex) => entryIndex !== index));
        };

        const handleAddMilestone = () => {
          handleMilestoneUpdate(prev => [...prev, { date: '', description: '' }]);
        };

        const emptyState = milestoneDrafts.length === 0;

        return (
          <div className="mb-8" data-tour-id="question-main-content">
            <fieldset className="space-y-4" aria-describedby={currentIndex === 0 ? instructionsId : undefined}>
              <legend className="sr-only">{currentQuestionText}</legend>
              {emptyState && (
                <p className="text-sm text-gray-600">{t('questionnaire.milestoneEmptyState')}</p>
              )}
              {milestoneDrafts.map((entry, index) => {
                const dateInputId = `${currentQuestion.id}-milestone-${index}-date`;
                const descriptionInputId = `${currentQuestion.id}-milestone-${index}-description`;

                return (
                  <div
                    key={`milestone-${index}`}
                    className="p-4 border-2 border-gray-200 rounded-xl space-y-4 sm:space-y-0 sm:flex sm:items-end sm:gap-4"
                  >
                    <div className="sm:w-40">
                      <label htmlFor={dateInputId} className="block text-sm font-medium text-gray-700 mb-2">
                        {t('questionnaire.milestoneDateLabel')}
                      </label>
                      <input
                        id={dateInputId}
                        type="date"
                        value={entry.date || ''}
                        onChange={(event) => handleMilestoneFieldChange(index, 'date', event.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor={descriptionInputId} className="block text-sm font-medium text-gray-700 mb-2">
                        {t('questionnaire.milestoneDescriptionLabel')}
                      </label>
                      <input
                        id={descriptionInputId}
                        type="text"
                        value={entry.description || ''}
                        onChange={(event) => handleMilestoneFieldChange(index, 'description', event.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMilestoneRemoval(index)}
                      className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('questionnaire.removeMilestone')}
                    </button>
                  </div>
                );
              })}
            </fieldset>
            <button
              type="button"
              onClick={handleAddMilestone}
              className="mt-4 inline-flex items-center px-4 py-2 border-2 border-dashed border-blue-300 rounded-xl text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('questionnaire.addMilestone')}
            </button>
          </div>
        );
      }
      case 'text':
        return (
          <div className="mb-8">
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3" htmlFor={`${currentQuestion.id}-text`}>
              {t('questionnaire.freeTextLabel')}
            </label>
            <RichTextEditor
              id={`${currentQuestion.id}-text`}
              value={currentAnswer ?? ''}
              onChange={(nextValue) => onAnswer(currentQuestion.id, nextValue)}
              placeholder={
                currentQuestionPlaceholder !== ''
                  ? currentQuestionPlaceholder
                  : t('questionnaire.freeTextDefaultPlaceholder')
              }
              compact
              ariaLabel={t('questionnaire.freeTextAriaLabel')}
            />
            <p className="text-xs text-gray-500 mt-2">{t('questionnaire.freeTextHint')}</p>
          </div>
        );
      case 'long_text':
        return (
          <div className="mb-8">
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3" htmlFor={`${currentQuestion.id}-long-text`}>
              {t('questionnaire.longTextLabel')}
            </label>
            <RichTextEditor
              id={`${currentQuestion.id}-long-text`}
              value={currentAnswer ?? ''}
              onChange={(nextValue) => onAnswer(currentQuestion.id, nextValue)}
              placeholder={
                currentQuestionPlaceholder !== ''
                  ? currentQuestionPlaceholder
                  : t('questionnaire.longTextDefaultPlaceholder')
              }
              ariaLabel={t('questionnaire.longTextAriaLabel')}
            />
            <p className="text-xs text-gray-500 mt-2">{t('questionnaire.longTextHint')}</p>
          </div>
        );
      case 'number': {
        const unitLabel = currentQuestionNumberUnit;
        return (
          <div className="mb-8">
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3" htmlFor={`${currentQuestion.id}-number`}>
              {t('questionnaire.numberLabel')}
            </label>
            <div className={`flex items-center gap-3 ${unitLabel ? 'flex-wrap sm:flex-nowrap' : ''}`}>
              <input
                type="number"
                inputMode="decimal"
                value={currentAnswer ?? ''}
                onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
                id={`${currentQuestion.id}-number`}
                className="w-full flex-1 min-w-0 px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {unitLabel && (
                <span className="inline-flex items-center px-4 py-2.5 sm:py-3 border-2 border-blue-100 bg-blue-50 text-sm font-semibold text-blue-700 rounded-xl whitespace-nowrap">
                  {unitLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('questionnaire.numberHint')}</p>
          </div>
        );
      }
      case 'url':
        return (
          <div className="mb-8">
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3" htmlFor={`${currentQuestion.id}-url`}>
              {t('questionnaire.urlLabel')}
            </label>
            <input
              type="url"
              value={currentAnswer ?? ''}
              onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
              placeholder={t('questionnaire.urlPlaceholder')}
              id={`${currentQuestion.id}-url`}
              className="w-full px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-2">{t('questionnaire.urlHint')}</p>
          </div>
        );
      case 'file':
        return (
          <div className="mb-8">
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3" htmlFor={`${currentQuestion.id}-file`}>
              {t('questionnaire.fileLabel')}
            </label>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                  onAnswer(currentQuestion.id, {
                    name: file.name,
                    size: file.size,
                    type: file.type
                  });
                } else {
                  onAnswer(currentQuestion.id, null);
                }
              }}
              id={`${currentQuestion.id}-file`}
              className="w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
            {currentAnswer && (
              <p className="text-xs text-gray-500 mt-2">
                {typeof currentAnswer.size === 'number'
                  ? t('questionnaire.fileSelectedWithSize', {
                      name: currentAnswer.name,
                      size: Math.round(currentAnswer.size / 1024)
                    })
                  : t('questionnaire.fileSelectedNoSize', { name: currentAnswer.name })}
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (!activeQuestion) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-6 sm:px-8 sm:py-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <aside className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-6" aria-label={t('questionnaire.summaryAriaLabel')}>
          <div className="bg-white rounded-2xl shadow-xl p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{t('questionnaire.summaryHeading')}</h2>
            <p className="mt-1 text-xs text-gray-500">
              {t(questions.length > 1 ? 'questionnaire.summaryProgressPlural' : 'questionnaire.summaryProgressSingular', {
                answered: answeredQuestionsCount,
                total: questions.length
              })}
            </p>
            <ol className="mt-3 space-y-1 max-h-96 overflow-y-auto pr-1">
              {questions.map((question, index) => {
                const isAnswered = isAnswerProvided(answers[question.id]);
                const isCurrent = index === currentIndex;
                const isMissingRequired = Boolean(question.required) && !isAnswered;
                const stateLabel = isMissingRequired
                  ? t('questionnaire.stateMissingRequired')
                  : isAnswered
                    ? t('questionnaire.stateAnswered')
                    : t('questionnaire.stateNotAnswered');

                return (
                  <li key={question.id}>
                    <button
                      type="button"
                      onClick={() => onNavigateToQuestion?.(question.id)}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                        isCurrent
                          ? 'bg-blue-50 text-blue-800 font-semibold'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mt-0.5 shrink-0" aria-hidden="true">
                        {isAnswered ? (
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        ) : isMissingRequired ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        ) : (
                          <span className="block w-2 h-2 mt-1 ml-1 rounded-full bg-gray-300" />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        {resolveLocalizedText(question.question, language)}
                        <span className="sr-only"> — {stateLabel}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
        <div className="w-full min-w-0 flex-1">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="mb-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
              <span id={progressLabelId} className="text-sm font-medium text-gray-600" aria-live="polite">
                {t('questionnaire.questionProgress', { current: currentIndex + 1, total: questions.length })}
              </span>
              <span className="text-sm font-medium text-blue-600 sm:text-right" aria-live="polite">
                {remainingLabel}
              </span>
            </div>
            <div
              className="w-full bg-gray-200 rounded-full h-2"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={remainingLabel}
              aria-labelledby={progressLabelId}
            >
              <span
                className="block bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {currentIndex === 0 && (
              <p id={instructionsId} className="text-xs text-gray-500 mt-2 flex items-center">
                <Info className="w-3 h-3 mr-1" />
                {t('questionnaire.visibilityHint')}
              </p>
            )}
            {currentIndex === 0 && (
              <p className="mt-4 text-xs italic text-gray-400">
                {t('questionnaire.privacyNotice')}{' '}
                <a
                  href="./mentions-legales.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-500"
                >
                  {t('questionnaire.privacyLink')}
                </a>
              </p>
            )}
          </div>

          {hasSaveFeedback && (
            <div className="mb-6" role="status" aria-live="polite">
              <div
                className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                  isSaveSuccess
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {isSaveSuccess ? (
                  <CheckCircle className="mt-0.5 h-5 w-5" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{saveFeedback.message}</p>
                </div>
                {typeof onDismissSaveFeedback === 'function' && (
                  <button
                    type="button"
                    onClick={onDismissSaveFeedback}
                    className="text-xs font-semibold uppercase tracking-wide text-current hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-current rounded"
                  >
                    {t('questionnaire.close')}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mb-8" data-tour-id="question-main-content">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <h2 id={questionTextId} className="text-2xl font-bold text-gray-800 sm:text-3xl">
                {currentQuestionText}
              </h2>
              <div className="flex flex-col items-start gap-2 w-full lg:w-auto">
                {hasGuidanceContent && (
                  <button
                    type="button"
                    onClick={() => setShowGuidance(prev => !prev)}
                    className={`inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                      showGuidance
                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                        : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                    }`}
                    aria-expanded={showGuidance}
                    aria-controls={guidancePanelId}
                    data-tour-id="question-guidance-toggle"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    {showGuidance ? t('questionnaire.hideHelp') : t('questionnaire.showHelp')}
                  </button>
                )}
                {!currentQuestion.required && !showGuidance && (
                  <span className="inline-flex items-center px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 rounded-full border border-gray-200 self-start">
                    {t('questionnaire.optionalAnswer')}
                  </span>
                )}
              </div>
            </div>

            {hasGuidanceContent && showGuidance && (
              <div
                id={guidancePanelId}
                className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-gray-700"
                role="region"
                aria-label={t('questionnaire.contextualHelpAriaLabel')}
              >
                <div className="flex items-start">
                  <div className="mr-3 mt-0.5 text-blue-600">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold text-blue-700">{t('questionnaire.contextualGuidance')}</h3>
                      {guidanceObjective && (
                        <p className="mt-1 text-gray-700">{renderTextWithLinks(guidanceObjective)}</p>
                      )}
                    </div>

                    {guidanceDetails && (
                      <p className="text-gray-700 leading-relaxed">{renderTextWithLinks(guidanceDetails)}</p>
                    )}

                    {hasConditions && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('questionnaire.whyThisQuestionAppears')}</h4>
                        {conditionSummaries.length === 1 ? (
                          (() => {
                            const logic = conditionSummaries[0].logic === 'any' ? 'any' : 'all';
                            return (
                              <p className="text-xs text-blue-600 mt-1">
                                {logic === 'any' ? t('questionnaire.showsIfAny') : t('questionnaire.showsIfAll')}
                              </p>
                            );
                          })()
                        ) : (
                          <div className="text-xs text-blue-600 mt-1 space-y-1">
                            <p>
                              {t('questionnaire.multiGroupIntroPrefix')}{' '}
                              <strong className="text-blue-700">{t('questionnaire.multiGroupIntroBold')}</strong>
                              {t('questionnaire.multiGroupIntroSuffix')}
                            </p>
                            <p>{t('questionnaire.multiGroupHint')}</p>
                          </div>
                        )}
                        <div className="mt-3 space-y-3">
                          {conditionSummaries.map((groupSummary, idx) => {
                            const logicLabel = groupSummary.logic === 'any' ? t('questionnaire.logicOr') : t('questionnaire.logicAnd');
                            const connectorLabel = logicLabel;

                            if (groupSummary.conditions.length === 0) {
                              return null;
                            }

                            return (
                              <div key={`condition-group-${idx}`} className="bg-white border border-blue-100 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                    {t('questionnaire.group', { number: idx + 1 })}
                                  </span>
                                  <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                    {t('questionnaire.groupLogicBadge', { logic: logicLabel })}
                                  </span>
                                  {idx > 0 && (
                                    <span className="ml-auto text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                                      {t('questionnaire.andWithPrevious')}
                                    </span>
                                  )}
                                </div>
                                <ul className="space-y-2">
                                  {groupSummary.conditions.map((item, conditionIdx) => (
                                    <li key={`${item.label}-${conditionIdx}`} className="text-sm text-gray-700">
                                      <p className="font-medium text-gray-800">
                                        {conditionIdx > 0 && (
                                          <span className="inline-flex items-center px-2 py-0.5 mr-2 text-[11px] font-semibold uppercase tracking-wide rounded-full bg-blue-100 text-blue-700">
                                            {connectorLabel}
                                          </span>
                                        )}
                                        {item.label} {item.operator} {t('questionnaire.conditionQuote', { value: item.value })}
                                      </p>
                                      {item.answer && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {t('questionnaire.yourAnswer')}{' '}
                                          <span className="font-medium text-gray-700">
                                            {renderTextWithLinks(item.answer)}
                                          </span>
                                        </p>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {guidanceTips.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('questionnaire.practicalTips')}</h4>
                        <ul className="mt-2 space-y-2 list-disc list-inside text-sm text-gray-700">
                          {guidanceTips.map((tip, idx) => (
                            <li key={idx}>{renderTextWithLinks(tip)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {hasValidationError && (
            <div className="mb-6" role="alert" aria-live="assertive">
              <div className="flex items-start space-x-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">{t('questionnaire.missingRequiredAnswer')}</p>
                  <p className="text-sm">{validationError?.message}</p>
                </div>
              </div>
            </div>
          )}

          {isReturnToSynthesisRequested && (
            <div
              className="mb-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"
              role="status"
              aria-live="polite"
            >
              <Info className="mt-0.5 h-5 w-5" />
              <p>{t('questionnaire.returnToSynthesisNotice')}</p>
            </div>
          )}

          {renderQuestionInput()}

          {extraCheckbox?.enabled && extraCheckbox?.label?.trim() && (
            <div className="mb-8 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-4">
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(extraCheckboxAnswer)}
                  onChange={(event) => onAnswer(extraCheckboxId, event.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{extraCheckbox.label.trim()}</span>
              </label>
            </div>
          )}

          <div
            className={`flex flex-col-reverse gap-3 sm:flex-row sm:items-center ${
              currentIndex === 0 ? 'sm:justify-end' : 'sm:justify-between'
            }`}
            data-tour-id="questionnaire-finish"
          >
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center justify-center px-6 py-3 rounded-lg font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto text-sm sm:text-base"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                {t('questionnaire.previous')}
              </button>
            )}

            {onReturnToSynthesis && (
              <button
                type="button"
                onClick={onReturnToSynthesis}
                className="flex items-center justify-center px-6 py-3 rounded-lg font-medium bg-yellow-500 text-white hover:bg-yellow-600 transition-all w-full sm:w-auto text-sm sm:text-base"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {t('questionnaire.validateAndReturn')}
              </button>
            )}

            {shouldShowNextButton && (
              <button
                type="button"
                onClick={isReturnToSynthesisRequested ? handleLinkedQuestionNext : onNext}
                className="flex items-center justify-center px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto text-sm sm:text-base"
                data-tour-id={currentIndex === questions.length - 1 ? 'questionnaire-view-synthesis' : undefined}
              >
                {currentIndex === questions.length - 1 ? t('questionnaire.viewSynthesis') : t('questionnaire.next')}
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            )}

            {currentIndex < questions.length - 1 && onFinish && shouldShowFinishButton && (
              <button
                type="button"
                onClick={onFinish}
                className="flex items-center justify-center px-6 py-3 rounded-lg font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all w-full sm:w-auto text-sm sm:text-base"
                data-tour-id="questionnaire-finish-button"
              >
                {t('questionnaire.finish')}
              </button>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
