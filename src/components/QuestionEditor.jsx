import React, { useEffect, useRef, useState } from '../react.js';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Clipboard,
  Compass,
  Target,
  Lightbulb,
  CheckCircle
} from './icons.js';
import { applyConditionGroups, normalizeConditionGroups } from '../utils/conditionGroups.js';
import { ensureOperatorForType, getOperatorOptionsForType } from '../utils/operatorOptions.js';
import {
  buildExtraCheckboxQuestionId,
  getConditionQuestionEntries,
  getQuestionOptionEntries,
  normalizeOtherOptionForEditing,
  normalizeQuestionOptionsForEditing
} from '../utils/questions.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { getLocalizedRaw, setLocalizedText, trimLocalizedValue, isLocalizedValueEmpty, resolveLocalizedText } from '../utils/localizedContent.js';
import { LanguageEditSwitcher } from './LocalizedFieldEditor.jsx';

export const QuestionEditor = ({ question, onSave, onCancel, allQuestions }) => {
  const { t, language } = useTranslation();
  const [editingLanguage, setEditingLanguage] = useState(language);
  const ensureGuidance = (guidance) => {
    if (!guidance || typeof guidance !== 'object') {
      return { objective: '', details: '', tips: [] };
    }

    return {
      objective: guidance.objective ?? '',
      details: guidance.details ?? '',
      tips: Array.isArray(guidance.tips) ? guidance.tips : []
    };
  };

  const ensureExtraCheckbox = (config) => {
    if (!config || typeof config !== 'object') {
      return { enabled: false, label: '' };
    }

    return {
      enabled: Boolean(config.enabled),
      label: typeof config.label === 'string' || (config.label && typeof config.label === 'object') ? config.label : ''
    };
  };

  const ensureOtherOption = (config) => {
    const normalized = normalizeOtherOptionForEditing(config);
    return {
      enabled: Boolean(normalized.enabled),
      label: normalized.label || t('backOffice.questionEditor.otherOptionLabelPlaceholder'),
      placeholder: normalized.placeholder,
      value: normalized.value
    };
  };

  const getDefaultPlaceholder = (type) => {
    if (type === 'text') {
      return t('backOffice.questionEditor.defaultPlaceholderText');
    }
    if (type === 'long_text') {
      return t('backOffice.questionEditor.defaultPlaceholderLongText');
    }
    return '';
  };

  const slugifyOptionValue = (value, fallbackPrefix = 'option') => {
    const normalized = typeof value === 'string' ? value : String(value || '');
    const slug = normalized
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '');
    return slug || `${fallbackPrefix}_${Math.random().toString(36).slice(2, 8)}`;
  };

  const buildDefaultRankingConfig = (previousConfig = null) => {
    if (previousConfig && typeof previousConfig === 'object') {
      return {
        title: previousConfig.title || t('backOffice.questionEditor.defaultDbTitle'),
        criteria: Array.isArray(previousConfig.criteria) && previousConfig.criteria.length > 0
          ? previousConfig.criteria
          : [
              { id: 'critere-1', label: t('backOffice.questionEditor.defaultCriterionLabel', { number: 1 }) },
              { id: 'critere-2', label: t('backOffice.questionEditor.defaultCriterionLabel', { number: 2 }) },
              { id: 'critere-3', label: t('backOffice.questionEditor.defaultCriterionLabel', { number: 3 }) }
            ],
        entries: Array.isArray(previousConfig.entries) ? previousConfig.entries : []
      };
    }

    return {
      title: t('backOffice.questionEditor.defaultDbTitle'),
      criteria: [
        { id: 'critere-1', label: t('backOffice.questionEditor.defaultCriterionLabel', { number: 1 }) },
        { id: 'critere-2', label: t('backOffice.questionEditor.defaultCriterionLabel', { number: 2 }) },
        { id: 'critere-3', label: t('backOffice.questionEditor.defaultCriterionLabel', { number: 3 }) }
      ],
      entries: []
    };
  };

  const sanitizeConditionGroups = (groups) => {
    const conditionQuestions = getConditionQuestionEntries(allQuestions);
    return Array.isArray(groups)
      ? groups.map(group => ({
          ...group,
          conditions: Array.isArray(group.conditions)
            ? group.conditions.map(condition => {
                const question = conditionQuestions.find(q => q.id === condition?.question);
                const questionType = question?.type || 'choice';
                return {
                  ...condition,
                  operator: ensureOperatorForType(questionType, condition?.operator)
                };
              })
            : []
        }))
      : [];
  };

  const buildQuestionState = (source) => {
    const rankingConfig = buildDefaultRankingConfig(source.rankingConfig);

    const base = {
      ...source,
      type: source.type || 'choice',
      options: normalizeQuestionOptionsForEditing(source),
      guidance: ensureGuidance(source.guidance),
      extraCheckbox: ensureExtraCheckbox(source.extraCheckbox),
      otherOption: ensureOtherOption(source.otherOption),
      placeholder: typeof source.placeholder === 'string' ? source.placeholder : '',
      numberUnit: typeof source.numberUnit === 'string' ? source.numberUnit : '',
      rankingConfig
    };

    const groups = sanitizeConditionGroups(normalizeConditionGroups(base));
    return applyConditionGroups(base, groups);
  };

  const [editedQuestion, setEditedQuestion] = useState(() => buildQuestionState(question));
  useEffect(() => {
    setEditedQuestion(buildQuestionState(question));
  }, [question]);

  const [optionConditionModal, setOptionConditionModal] = useState({ index: null, groups: [] });
  const [expandedOptionIndex, setExpandedOptionIndex] = useState(null);
  const [showOptionIds, setShowOptionIds] = useState(false);
  const questionType = editedQuestion.type || 'choice';
  const typeUsesOptions = questionType === 'choice' || questionType === 'multi_choice';
  const normalizedGuidance = ensureGuidance(editedQuestion.guidance);

  const updateGuidanceField = (field, value) => {
    setEditedQuestion(prev => ({
      ...prev,
      guidance: {
        ...ensureGuidance(prev.guidance),
        [field]: value
      }
    }));
  };

  const addGuidanceTip = () => {
    setEditedQuestion(prev => {
      const current = ensureGuidance(prev.guidance);
      return {
        ...prev,
        guidance: {
          ...current,
          tips: [...current.tips, '']
        }
      };
    });
  };

  const updateGuidanceTip = (index, value) => {
    setEditedQuestion(prev => {
      const current = ensureGuidance(prev.guidance);
      const newTips = [...current.tips];
      newTips[index] = value;
      return {
        ...prev,
        guidance: {
          ...current,
          tips: newTips
        }
      };
    });
  };

  const deleteGuidanceTip = (index) => {
    setEditedQuestion(prev => {
      const current = ensureGuidance(prev.guidance);
      return {
        ...prev,
        guidance: {
          ...current,
          tips: current.tips.filter((_, i) => i !== index)
        }
      };
    });
  };

  const handleTypeChange = (newType) => {
    if (newType === 'choice' || newType === 'multi_choice') {
      setEditedQuestion(prev => ({
        ...prev,
        type: newType,
        options:
          prev.options && prev.options.length > 0
              ? prev.options
              : [
                applyConditionGroups({ label: t('backOffice.questionEditor.defaultEntryName', { number: 1 }), value: 'option_1', visibility: 'always' }, []),
                applyConditionGroups({ label: t('backOffice.questionEditor.defaultEntryName', { number: 2 }), value: 'option_2', visibility: 'always' }, [])
              ]
      }));
      return;
    }

    if (newType === 'ranking') {
      setEditedQuestion(prev => ({
        ...prev,
        type: newType,
        rankingConfig: buildDefaultRankingConfig(prev.rankingConfig),
        options: []
      }));
      return;
    }

    setEditedQuestion(prev => ({
      ...prev,
      type: newType,
      options: [],
      placeholder: (newType === 'text' || newType === 'long_text')
        ? (prev.placeholder && prev.placeholder.trim() !== ''
          ? prev.placeholder
          : getDefaultPlaceholder(newType))
        : '',
      numberUnit: newType === 'number'
        ? (typeof prev.numberUnit === 'string' ? prev.numberUnit : '')
        : ''
    }));
  };

  const reorderOptions = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    setEditedQuestion(prev => {
      const newOptions = [...prev.options];
      const [moved] = newOptions.splice(fromIndex, 1);
      newOptions.splice(toIndex, 0, moved);

      return {
        ...prev,
        options: newOptions
      };
    });
  };

  const moveOptionUp = (index) => {
    if (index <= 0) {
      return;
    }
    reorderOptions(index, index - 1);
  };

  const moveOptionDown = (index) => {
    if (index >= editedQuestion.options.length - 1) {
      return;
    }
    reorderOptions(index, index + 1);
  };

  const updateRankingConfig = (updater) => {
    setEditedQuestion(prev => {
      const baseConfig = buildDefaultRankingConfig(prev.rankingConfig);
      const nextConfig = typeof updater === 'function' ? updater(baseConfig) : updater;

      return {
        ...prev,
        rankingConfig: buildDefaultRankingConfig(nextConfig)
      };
    });
  };

  const addRankingCriterion = () => {
    updateRankingConfig(config => {
      const newId = `critere-${config.criteria.length + 1}`;
      return {
        ...config,
        criteria: [...config.criteria, { id: newId, label: t('backOffice.questionEditor.defaultCriterionLabel', { number: config.criteria.length + 1 }) }]
      };
    });
  };

  const updateRankingCriterion = (index, field, value) => {
    updateRankingConfig(config => {
      const updated = [...config.criteria];
      const target = updated[index];
      if (!target) return config;

      const next = {
        ...target,
        [field]: field === 'label' ? setLocalizedText(target.label, editingLanguage, value) : value
      };

      if (field === 'label' && (!next.id || next.id.startsWith('critere-'))) {
        next.id = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/gi, '') || next.id;
      }

      updated[index] = next;

      return {
        ...config,
        criteria: updated
      };
    });
  };

  const deleteRankingCriterion = (index) => {
    updateRankingConfig(config => {
      const updatedCriteria = config.criteria.filter((_, idx) => idx !== index);
      const removed = config.criteria[index];
      if (!removed) {
        return { ...config, criteria: updatedCriteria };
      }

      const cleanedEntries = (config.entries || []).map(entry => {
        const nextScores = { ...entry.scores };
        delete nextScores[removed.id];
        return { ...entry, scores: nextScores };
      });

      return {
        ...config,
        criteria: updatedCriteria,
        entries: cleanedEntries
      };
    });
  };

  const addRankingEntry = () => {
    updateRankingConfig(config => ({
      ...config,
      entries: [
        ...config.entries,
        {
          id: `entree-${config.entries.length + 1}`,
          name: t('backOffice.questionEditor.defaultEntryName', { number: config.entries.length + 1 }),
          contact: '',
          website: '',
          notes: '',
          previousProject: '',
          opinion: '',
          scores: {}
        }
      ]
    }));
  };

  const updateRankingEntry = (index, field, value) => {
    updateRankingConfig(config => {
      const entries = [...config.entries];
      const target = entries[index];
      if (!target) return config;

      entries[index] = {
        ...target,
        [field]: value
      };

      return {
        ...config,
        entries
      };
    });
  };

  const updateRankingScore = (entryIndex, criterionId, value) => {
    const parsedValue = Number(value);
    const sanitized = Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;

    updateRankingConfig(config => {
      const entries = [...config.entries];
      const target = entries[entryIndex];
      if (!target) return config;

      entries[entryIndex] = {
        ...target,
        scores: {
          ...target.scores,
          [criterionId]: sanitized
        }
      };

      return {
        ...config,
        entries
      };
    });
  };

  const deleteRankingEntry = (index) => {
    updateRankingConfig(config => ({
      ...config,
      entries: config.entries.filter((_, idx) => idx !== index)
    }));
  };

  const updateConditionGroupsState = (updater) => {
    setEditedQuestion(prev => {
      const currentGroups = Array.isArray(prev.conditionGroups) ? prev.conditionGroups : [];
      const nextGroups = sanitizeConditionGroups(updater(currentGroups));
      return applyConditionGroups(prev, nextGroups);
    });
  };

  const addConditionGroup = () => {
    updateConditionGroupsState(groups => ([
      ...groups,
      {
        logic: 'all',
        conditions: [{ question: '', operator: 'equals', value: '' }]
      }
    ]));
  };

  const updateConditionGroupLogic = (groupIndex, logic) => {
    updateConditionGroupsState(groups => {
      const updated = [...groups];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      updated[groupIndex] = {
        ...target,
        logic: logic === 'any' ? 'any' : 'all'
      };
      return updated;
    });
  };

  const addConditionToGroup = (groupIndex) => {
    updateConditionGroupsState(groups => {
      const updated = [...groups];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      updated[groupIndex] = {
        ...target,
        conditions: [...target.conditions, { question: '', operator: 'equals', value: '' }]
      };
      return updated;
    });
  };

  const updateConditionInGroup = (groupIndex, conditionIndex, field, value) => {
    updateConditionGroupsState(groups => {
      const updated = [...groups];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      const conditions = [...(target.conditions || [])];
      const condition = { ...conditions[conditionIndex] };

      if (field === 'question') {
        condition.question = value;
      } else if (field === 'operator') {
        condition.operator = value;
      } else {
        condition[field] = value;
      }

      const linkedQuestion = allQuestions.find(q => q.id === condition.question);
      const linkedType = linkedQuestion?.type || 'choice';
      condition.operator = ensureOperatorForType(linkedType, condition.operator);

      conditions[conditionIndex] = condition;
      updated[groupIndex] = { ...target, conditions };
      return updated;
    });
  };

  const deleteConditionFromGroup = (groupIndex, conditionIndex) => {
    updateConditionGroupsState(groups => {
      const updated = [...groups];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      const conditions = (target.conditions || []).filter((_, idx) => idx !== conditionIndex);
      updated[groupIndex] = { ...target, conditions };
      return updated;
    });
  };

  const deleteConditionGroup = (groupIndex) => {
    updateConditionGroupsState(groups => groups.filter((_, idx) => idx !== groupIndex));
  };

  const openOptionConditionModal = (index) => {
    const option = editedQuestion.options[index];
    if (!option) {
      return;
    }

    const sanitizedGroups = sanitizeConditionGroups(normalizeConditionGroups(option));
    setOptionConditionModal({ index, groups: sanitizedGroups });
  };

  const closeOptionConditionModal = () => {
    setOptionConditionModal({ index: null, groups: [] });
  };

  const updateOptionConditionGroups = (updater) => {
    setOptionConditionModal(prev => ({
      ...prev,
      groups: sanitizeConditionGroups(updater(prev.groups || []))
    }));
  };

  const saveOptionConditionGroups = () => {
    const { index, groups } = optionConditionModal;
    if (index === null || index === undefined) {
      return;
    }

    const sanitizedGroups = sanitizeConditionGroups(groups);

    setEditedQuestion(prev => {
      const nextOptions = [...prev.options];
      const current = nextOptions[index];
      if (!current) {
        return prev;
      }

      nextOptions[index] = applyConditionGroups(
        {
          ...(current && typeof current === 'object' ? current : {}),
          visibility: 'conditional'
        },
        sanitizedGroups
      );

      return {
        ...prev,
        options: nextOptions
      };
    });

    closeOptionConditionModal();
  };

  const toggleOptionVisibility = (index) => {
    const option = editedQuestion.options[index];
    if (!option) {
      return;
    }

    const visibility = option.visibility || 'always';

    if (visibility === 'always') {
      openOptionConditionModal(index);
      return;
    }

    if (visibility === 'conditional') {
      setEditedQuestion(prev => {
        const nextOptions = [...prev.options];
        const current = nextOptions[index];
        if (!current) {
          return prev;
        }

        nextOptions[index] = {
          ...(current && typeof current === 'object' ? current : {}),
          visibility: 'disabled'
        };

        return {
          ...prev,
          options: nextOptions
        };
      });
      return;
    }

    setEditedQuestion(prev => {
      const nextOptions = [...prev.options];
      const current = nextOptions[index];
      if (!current) {
        return prev;
      }

      nextOptions[index] = {
        ...(current && typeof current === 'object' ? current : {}),
        visibility: 'always'
      };

      return {
        ...prev,
        options: nextOptions
      };
    });
  };

  const updateOptionConditionGroupLogic = (groupIndex, logic) => {
    updateOptionConditionGroups(groups => {
      const updated = [...groups];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      updated[groupIndex] = {
        ...target,
        logic: logic === 'any' ? 'any' : 'all'
      };
      return updated;
    });
  };

  const addOptionConditionGroup = () => {
    updateOptionConditionGroups(groups => ([
      ...groups,
      {
        logic: 'all',
        conditions: [{ question: '', operator: 'equals', value: '' }]
      }
    ]));
  };

  const addOptionConditionToGroup = (groupIndex) => {
    updateOptionConditionGroups(groups => {
      const updated = [...groups];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      updated[groupIndex] = {
        ...target,
        conditions: [...target.conditions, { question: '', operator: 'equals', value: '' }]
      };
      return updated;
    });
  };

  const updateOptionConditionInGroup = (groupIndex, conditionIndex, field, value) => {
    updateOptionConditionGroups(groups => {
      const updated = [...groups];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      const conditions = [...(target.conditions || [])];
      const condition = { ...conditions[conditionIndex] };

      if (field === 'question') {
        condition.question = value;
      } else if (field === 'operator') {
        condition.operator = value;
      } else {
        condition[field] = value;
      }

      const conditionQuestions = getConditionQuestionEntries(allQuestions);
      const linkedQuestion = conditionQuestions.find(q => q.id === condition.question);
      const linkedType = linkedQuestion?.type || 'choice';
      condition.operator = ensureOperatorForType(linkedType, condition.operator);

      conditions[conditionIndex] = condition;
      updated[groupIndex] = { ...target, conditions };
      return updated;
    });
  };

  const deleteOptionConditionFromGroup = (groupIndex, conditionIndex) => {
    updateOptionConditionGroups(groups => {
      const updated = [...groups];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      const conditions = (target.conditions || []).filter((_, idx) => idx !== conditionIndex);
      updated[groupIndex] = { ...target, conditions };
      return updated;
    });
  };

  const deleteOptionConditionGroup = (groupIndex) => {
    updateOptionConditionGroups(groups => groups.filter((_, idx) => idx !== groupIndex));
  };

  const addOption = () => {
    setEditedQuestion({
      ...editedQuestion,
      options: [
        ...editedQuestion.options,
        applyConditionGroups(
          {
            label: { [editingLanguage]: t('backOffice.questionEditor.newOptionDefaultLabel') },
            value: slugifyOptionValue(`option_${editedQuestion.options.length + 1}`),
            visibility: 'always'
          },
          []
        )
      ]
    });
  };

  const updateOption = (index, value) => {
    const newOptions = [...editedQuestion.options];
    const current = newOptions[index];
    newOptions[index] = {
      ...(current && typeof current === 'object' ? current : {}),
      label: setLocalizedText(current?.label, editingLanguage, value),
      value: current?.value || slugifyOptionValue(value, `option_${index + 1}`)
    };
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const updateOptionSubType = (index, value) => {
    const newOptions = [...editedQuestion.options];
    const current = newOptions[index];
    newOptions[index] = {
      ...(current && typeof current === 'object' ? current : {}),
      subType: value
    };
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const addSubOption = (index) => {
    const newOptions = [...editedQuestion.options];
    const current = newOptions[index];
    const existing = Array.isArray(current?.subOptions) ? current.subOptions : [];
    newOptions[index] = {
      ...(current && typeof current === 'object' ? current : {}),
      subOptions: [
        ...existing,
        {
          label: { [editingLanguage]: t('backOffice.questionEditor.newSubOptionDefaultLabel') },
          value: slugifyOptionValue(`sub_option_${index + 1}_${existing.length + 1}`, 'sub_option')
        }
      ]
    };
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const addOtherSubOption = (index) => {
    const newOptions = [...editedQuestion.options];
    const current = newOptions[index];
    const existing = Array.isArray(current?.subOptions) ? current.subOptions : [];
    const hasOther = existing.some(entry => entry?.isOther);

    if (hasOther) {
      return;
    }

    newOptions[index] = {
      ...(current && typeof current === 'object' ? current : {}),
      subOptions: [
        ...existing,
        {
          label: { [editingLanguage]: t('backOffice.questionEditor.otherOptionLabelPlaceholder') },
          value: slugifyOptionValue(`sub_option_other_${index + 1}`, 'sub_option_other'),
          isOther: true
        }
      ]
    };
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const updateSubOption = (index, subIndex, value) => {
    const newOptions = [...editedQuestion.options];
    const current = newOptions[index];
    const existing = Array.isArray(current?.subOptions) ? current.subOptions : [];
    const nextSubOptions = existing.map((entry, entryIndex) => {
      if (entryIndex !== subIndex) {
        return entry;
      }

      return {
        ...(entry && typeof entry === 'object' ? entry : {}),
        label: setLocalizedText(entry?.label, editingLanguage, value),
        value: entry?.value || slugifyOptionValue(value, `sub_option_${index + 1}_${subIndex + 1}`)
      };
    });

    newOptions[index] = {
      ...(current && typeof current === 'object' ? current : {}),
      subOptions: nextSubOptions
    };
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const deleteSubOption = (index, subIndex) => {
    const newOptions = [...editedQuestion.options];
    const current = newOptions[index];
    const existing = Array.isArray(current?.subOptions) ? current.subOptions : [];
    newOptions[index] = {
      ...(current && typeof current === 'object' ? current : {}),
      subOptions: existing.filter((_, entryIndex) => entryIndex !== subIndex)
    };
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const deleteOption = (index) => {
    if (editedQuestion.options.length > 1) {
      setEditedQuestion({
        ...editedQuestion,
        options: editedQuestion.options.filter((_, i) => i !== index)
      });
    }
  };

  // Filtrer les questions pour ne pas inclure la question en cours d’édition
  const conditionQuestionEntries = getConditionQuestionEntries(allQuestions);
  const extraCheckboxQuestionId = buildExtraCheckboxQuestionId(editedQuestion.id);
  const availableQuestions = conditionQuestionEntries.filter(
    q => q.id !== editedQuestion.id && q.id !== extraCheckboxQuestionId
  );
  const conditionGroups = Array.isArray(editedQuestion.conditionGroups) ? editedQuestion.conditionGroups : [];
  const dialogTitleId = 'question-editor-title';

  const handleSave = () => {
    const sanitizedQuestion = applyConditionGroups(editedQuestion, conditionGroups);
    const unitLabel = trimLocalizedValue(editedQuestion.numberUnit);
    const extraCheckbox = ensureExtraCheckbox(editedQuestion.extraCheckbox);
    const extraLabel = trimLocalizedValue(extraCheckbox.label);
    const normalizedExtraCheckbox = {
      enabled: extraCheckbox.enabled && !isLocalizedValueEmpty(extraLabel),
      label: extraLabel
    };
    const otherOption = ensureOtherOption(editedQuestion.otherOption);
    const otherLabel = trimLocalizedValue(otherOption.label);
    const normalizedOtherOption = {
      enabled: typeUsesOptions && otherOption.enabled && !isLocalizedValueEmpty(otherLabel),
      label: isLocalizedValueEmpty(otherLabel) ? t('backOffice.questionEditor.otherOptionLabelPlaceholder') : otherLabel,
      placeholder: trimLocalizedValue(otherOption.placeholder),
      value: otherOption.value
    };

    onSave({
      ...sanitizedQuestion,
      numberUnit: unitLabel,
      extraCheckbox: normalizedExtraCheckbox,
      otherOption: normalizedOtherOption
    });
  };

  const overlayRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.scrollTo({ top: 0 });
    }

    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  const isOptionConditionOpen = optionConditionModal.index !== null;
  const optionConditionGroups = Array.isArray(optionConditionModal.groups)
    ? optionConditionModal.groups
    : [];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-4 sm:my-8 overflow-y-auto hv-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2
              id={dialogTitleId}
              ref={titleRef}
              tabIndex={-1}
              className="text-3xl font-bold text-gray-800 focus:outline-none"
            >
              {t('backOffice.questionEditor.title')}
            </h2>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-all"
              >
                {t('backOffice.questionEditor.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
              >
                {t('backOffice.questionEditor.save')}
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-8">
          <LanguageEditSwitcher
            editingLanguage={editingLanguage}
            onChange={setEditingLanguage}
            label={t('backOffice.questionEditor.editingLanguageLabel')}
            hint={t('backOffice.questionEditor.editingLanguageHint')}
          />
          {/* Informations de base */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-blue-500" />
              {t('backOffice.questionEditor.basicInfoHeading')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('backOffice.questionEditor.idLabel')}</label>
                <input
                  type="text"
                  value={editedQuestion.id}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">{t('backOffice.questionEditor.idHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('backOffice.questionEditor.questionTextLabel')}</label>
                <textarea
                  value={getLocalizedRaw(editedQuestion.question, editingLanguage)}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, question: setLocalizedText(editedQuestion.question, editingLanguage, e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  placeholder={t('backOffice.questionEditor.questionTextPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('backOffice.questionEditor.typeLabel')}</label>
                <select
                  value={questionType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="choice">{t('backOffice.questionEditor.typeChoice')}</option>
                  <option value="date">{t('backOffice.questionEditor.typeDate')}</option>
                  <option value="multi_choice">{t('backOffice.questionEditor.typeMultiChoice')}</option>
                  <option value="ranking">{t('backOffice.questionEditor.typeRanking')}</option>
                  <option value="number">{t('backOffice.questionEditor.typeNumber')}</option>
                  <option value="url">{t('backOffice.questionEditor.typeUrl')}</option>
                  <option value="file">{t('backOffice.questionEditor.typeFile')}</option>
                  <option value="text">{t('backOffice.questionEditor.typeText')}</option>
                  <option value="long_text">{t('backOffice.questionEditor.typeLongText')}</option>
                  <option value="milestone_list">{t('backOffice.questionEditor.typeMilestoneList')}</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{t('backOffice.questionEditor.typeHint')}</p>
              </div>

              {(questionType === 'text' || questionType === 'long_text') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('backOffice.questionEditor.placeholderLabel')}</label>
                  {questionType === 'long_text' ? (
                    <textarea
                      value={getLocalizedRaw(editedQuestion.placeholder, editingLanguage)}
                      onChange={(e) => setEditedQuestion(prev => ({ ...prev, placeholder: setLocalizedText(prev.placeholder, editingLanguage, e.target.value) }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="2"
                      placeholder={getDefaultPlaceholder(questionType)}
                    />
                  ) : (
                    <input
                      type="text"
                      value={getLocalizedRaw(editedQuestion.placeholder, editingLanguage)}
                      onChange={(e) => setEditedQuestion(prev => ({ ...prev, placeholder: setLocalizedText(prev.placeholder, editingLanguage, e.target.value) }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={getDefaultPlaceholder(questionType)}
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">{t('backOffice.questionEditor.placeholderHint')}</p>
                </div>
              )}

              {questionType === 'number' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('backOffice.questionEditor.numberUnitLabel')}</label>
                  <input
                    type="text"
                    value={getLocalizedRaw(editedQuestion.numberUnit, editingLanguage)}
                    onChange={(e) => setEditedQuestion(prev => ({ ...prev, numberUnit: setLocalizedText(prev.numberUnit, editingLanguage, e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('backOffice.questionEditor.numberUnitPlaceholder')}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('backOffice.questionEditor.numberUnitHint')}</p>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editedQuestion.required}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, required: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  {t('backOffice.questionEditor.requiredLabel')}
                </label>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editedQuestion.extraCheckbox?.enabled}
                    onChange={(e) => setEditedQuestion(prev => ({
                      ...prev,
                      extraCheckbox: {
                        ...ensureExtraCheckbox(prev.extraCheckbox),
                        enabled: e.target.checked
                      }
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    {t('backOffice.questionEditor.extraCheckboxEnableLabel')}
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('backOffice.questionEditor.extraCheckboxTextLabel')}
                  </label>
                  <input
                    type="text"
                    value={getLocalizedRaw(editedQuestion.extraCheckbox?.label, editingLanguage)}
                    onChange={(e) => setEditedQuestion(prev => ({
                      ...prev,
                      extraCheckbox: {
                        ...ensureExtraCheckbox(prev.extraCheckbox),
                        label: setLocalizedText(ensureExtraCheckbox(prev.extraCheckbox).label, editingLanguage, e.target.value)
                      }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('backOffice.questionEditor.extraCheckboxPlaceholder')}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('backOffice.questionEditor.extraCheckboxHint')}</p>
                </div>
              </div>

              {typeUsesOptions && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editedQuestion.otherOption?.enabled}
                      onChange={(e) => setEditedQuestion(prev => ({
                        ...prev,
                        otherOption: {
                          ...ensureOtherOption(prev.otherOption),
                          enabled: e.target.checked
                        }
                      }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700">
                      {t('backOffice.questionEditor.otherOptionEnableLabel')}
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('backOffice.questionEditor.otherOptionLabelLabel')}
                    </label>
                    <input
                      type="text"
                      value={getLocalizedRaw(editedQuestion.otherOption?.label, editingLanguage)}
                      onChange={(e) => setEditedQuestion(prev => ({
                        ...prev,
                        otherOption: {
                          ...ensureOtherOption(prev.otherOption),
                          label: setLocalizedText(ensureOtherOption(prev.otherOption).label, editingLanguage, e.target.value)
                        }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={t('backOffice.questionEditor.otherOptionLabelPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('backOffice.questionEditor.otherOptionPlaceholderLabel')}
                    </label>
                    <input
                      type="text"
                      value={getLocalizedRaw(editedQuestion.otherOption?.placeholder, editingLanguage)}
                      onChange={(e) => setEditedQuestion(prev => ({
                        ...prev,
                        otherOption: {
                          ...ensureOtherOption(prev.otherOption),
                          placeholder: setLocalizedText(ensureOtherOption(prev.otherOption).placeholder, editingLanguage, e.target.value)
                        }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={t('backOffice.questionEditor.otherOptionPlaceholderPlaceholder')}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('backOffice.questionEditor.otherOptionPlaceholderHint')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Options de réponse */}
          <div>
            {typeUsesOptions ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    {questionType === 'multi_choice'
                      ? t('backOffice.questionEditor.multiOptionsHeading')
                      : t('backOffice.questionEditor.optionsHeading')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOptionIds((prev) => !prev)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                        showOptionIds
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                      aria-pressed={showOptionIds}
                      title={showOptionIds ? t('backOffice.questionEditor.hideIdsTitle') : t('backOffice.questionEditor.showIdsTitle')}
                    >
                      <Eye className="h-4 w-4" />
                      {showOptionIds ? t('backOffice.questionEditor.hideIds') : t('backOffice.questionEditor.showIds')}
                    </button>
                    <button
                      onClick={addOption}
                      className="flex items-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-sm font-medium"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t('backOffice.questionEditor.addOption')}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3">
                  {t('backOffice.questionEditor.reorderHint')}
                  {questionType === 'multi_choice' && t('backOffice.questionEditor.multiChoiceHint')}
                </p>

                <div className="space-y-2">
                  {editedQuestion.options.map((option, idx) => {
                    const optionLabel =
                      typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean'
                        ? String(option)
                        : getLocalizedRaw(option?.label, editingLanguage);
                    const optionValue = typeof option?.value === 'string' ? option.value : '';
                    const visibility = option?.visibility || 'always';
                    const statusColor =
                      visibility === 'conditional'
                        ? 'text-orange-500'
                        : visibility === 'disabled'
                          ? 'text-red-500'
                          : 'text-emerald-600';
                    const statusLabel =
                      visibility === 'conditional'
                        ? t('backOffice.questionEditor.statusConditional')
                        : visibility === 'disabled'
                          ? t('backOffice.questionEditor.statusDisabled')
                          : t('backOffice.questionEditor.statusAlwaysVisible');
                    const subOptionCount = Array.isArray(option?.subOptions) ? option.subOptions.length : 0;
                    const isExpanded = expandedOptionIndex === idx;

                    return (
                    <div key={idx} className="space-y-2">
                      <div
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-transparent bg-white p-2 shadow-sm"
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveOptionUp(idx)}
                            disabled={idx === 0}
                            className="rounded border border-gray-200 p-1 text-gray-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={t('backOffice.questionEditor.moveOptionUpAriaLabel', { number: idx + 1 })}
                            title={t('backOffice.questionEditor.moveUp')}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveOptionDown(idx)}
                            disabled={idx === editedQuestion.options.length - 1}
                            className="rounded border border-gray-200 p-1 text-gray-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={t('backOffice.questionEditor.moveOptionDownAriaLabel', { number: idx + 1 })}
                            title={t('backOffice.questionEditor.moveDown')}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-gray-500 font-medium w-6 text-center">{idx + 1}.</span>
                        <input
                          type="text"
                          value={optionLabel}
                          onChange={(e) => updateOption(idx, e.target.value)}
                          className="flex-1 min-w-[220px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={t('backOffice.questionEditor.optionTextPlaceholder')}
                        />
                        {showOptionIds && (
                          <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                            {t('backOffice.questionEditor.idPrefix')} {optionValue || '—'}
                          </code>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedOptionIndex(isExpanded ? null : idx)}
                          className="px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                        >
                          {t('backOffice.questionEditor.subOptionsButton')} {subOptionCount > 0 ? `(${subOptionCount})` : ''}
                        </button>
                        {visibility === 'conditional' && (
                          <button
                            type="button"
                            onClick={() => openOptionConditionModal(idx)}
                            className="px-3 py-2 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100"
                          >
                            {t('backOffice.questionEditor.editConditions')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleOptionVisibility(idx)}
                          className="p-2 rounded-full hover:bg-gray-100"
                          aria-label={t('backOffice.questionEditor.toggleVisibilityAriaLabel', { status: statusLabel })}
                          title={statusLabel}
                        >
                          <CheckCircle className={`w-5 h-5 ${statusColor}`} />
                        </button>
                        <button
                          onClick={() => deleteOption(idx)}
                          disabled={editedQuestion.options.length === 1}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="ml-8 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="text-xs font-semibold text-gray-600">{t('backOffice.questionEditor.subOptionsTypeLabel')}</label>
                            <select
                              value={option?.subType === 'multi_choice' ? 'multi_choice' : 'choice'}
                              onChange={(e) => updateOptionSubType(idx, e.target.value)}
                              className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="choice">{t('backOffice.questionEditor.subTypeSingle')}</option>
                              <option value="multi_choice">{t('backOffice.questionEditor.subTypeMulti')}</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            {(option?.subOptions || []).map((subOption, subIdx) => (
                              <div key={`${idx}-sub-${subIdx}`} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={getLocalizedRaw(subOption?.label, editingLanguage)}
                                  onChange={(e) => updateSubOption(idx, subIdx, e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                  placeholder={t('backOffice.questionEditor.subOptionPlaceholder', { number: subIdx + 1 })}
                                />
                                {showOptionIds && (
                                  <code className="rounded bg-white px-2 py-1 text-xs text-gray-600 border border-gray-200">
                                    {t('backOffice.questionEditor.idPrefix')} {typeof subOption?.value === 'string' ? subOption.value : '—'}
                                  </code>
                                )}
                                <button
                                  type="button"
                                  onClick={() => deleteSubOption(idx, subIdx)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  aria-label={t('backOffice.questionEditor.removeSubOptionAriaLabel', { number: subIdx + 1 })}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => addSubOption(idx)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50"
                              >
                                <Plus className="w-4 h-4" />
                                {t('backOffice.questionEditor.addSubOption')}
                              </button>
                              <button
                                type="button"
                                onClick={() => addOtherSubOption(idx)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-600 bg-white border border-purple-200 rounded-lg hover:bg-purple-50"
                              >
                                <Plus className="w-4 h-4" />
                                {t('backOffice.questionEditor.addOtherSubOption')}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                {t('backOffice.questionEditor.noOptionsNeeded')}
              </div>
            )}
          </div>

          {questionType === 'ranking' && (
            <div className="border-t border-gray-200 pt-6 mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-500" />
                  {t('backOffice.questionEditor.rankingDbHeading')}
                </h3>
                <button
                  type="button"
                  onClick={addRankingEntry}
                  className="flex items-center px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all text-sm font-medium"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('backOffice.questionEditor.addEntry')}
                </button>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('backOffice.questionEditor.reportTitleLabel')}</label>
                  <input
                    type="text"
                    value={getLocalizedRaw(editedQuestion.rankingConfig?.title, editingLanguage)}
                    onChange={(e) => updateRankingConfig(config => ({ ...config, title: setLocalizedText(config.title, editingLanguage, e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={t('backOffice.questionEditor.reportTitlePlaceholder')}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('backOffice.questionEditor.reportTitleHint')}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-500" />
                      {t('backOffice.questionEditor.criteriaHeading')}
                    </h4>
                    <button
                      type="button"
                      onClick={addRankingCriterion}
                      className="flex items-center px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" /> {t('backOffice.questionEditor.add')}
                    </button>
                  </div>
                  {editedQuestion.rankingConfig?.criteria?.length > 0 ? (
                    <div className="space-y-2">
                      {editedQuestion.rankingConfig.criteria.map((criterion, idx) => (
                        <div key={criterion.id || idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-600">{t('backOffice.questionEditor.criterionLabelLabel')}</label>
                            <input
                              type="text"
                              value={getLocalizedRaw(criterion.label, editingLanguage)}
                              onChange={(e) => updateRankingCriterion(idx, 'label', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder={t('backOffice.questionEditor.criterionLabelPlaceholder', { number: idx + 1 })}
                            />
                          </div>
                          <div className="sm:w-48">
                            <label className="block text-xs font-semibold text-gray-600">{t('backOffice.questionEditor.criterionIdLabel')}</label>
                            <input
                              type="text"
                              value={criterion.id || ''}
                              onChange={(e) => updateRankingCriterion(idx, 'id', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder={t('backOffice.questionEditor.criterionIdPlaceholder')}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteRankingCriterion(idx)}
                            className="self-start p-2 text-red-600 hover:bg-red-50 rounded"
                            aria-label={t('backOffice.questionEditor.removeCriterionAriaLabel', { label: resolveLocalizedText(criterion.label, editingLanguage) || idx + 1 })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">{t('backOffice.questionEditor.noCriteriaYet')}</p>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-500" />
                      <h4 className="text-lg font-semibold text-gray-800">{t('backOffice.questionEditor.entriesHeading')}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={addRankingEntry}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                    >
                      <Plus className="w-4 h-4" />
                      {t('backOffice.questionEditor.add')}
                    </button>
                  </div>

                  {editedQuestion.rankingConfig?.entries?.length === 0 ? (
                    <p className="text-sm text-gray-600">{t('backOffice.questionEditor.noEntriesYet')}</p>
                  ) : (
                    <div className="space-y-4">
                      {editedQuestion.rankingConfig.entries.map((entry, entryIdx) => (
                        <div key={entry.id || entryIdx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-600">{t('backOffice.questionEditor.entryNameLabel')}</label>
                              <input
                                type="text"
                                value={entry.name || ''}
                                onChange={(e) => updateRankingEntry(entryIdx, 'name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder={t('backOffice.questionEditor.entryNamePlaceholder')}
                              />
                            </div>
                            <div className="sm:w-48">
                              <label className="block text-xs font-semibold text-gray-600">{t('backOffice.questionEditor.entryContactLabel')}</label>
                              <input
                                type="text"
                                value={entry.contact || ''}
                                onChange={(e) => updateRankingEntry(entryIdx, 'contact', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder={t('backOffice.questionEditor.entryContactPlaceholder')}
                              />
                            </div>
                            <div className="sm:w-48">
                              <label className="block text-xs font-semibold text-gray-600">{t('backOffice.questionEditor.entryWebsiteLabel')}</label>
                              <input
                                type="text"
                                value={entry.website || ''}
                                onChange={(e) => updateRankingEntry(entryIdx, 'website', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="https://..."
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteRankingEntry(entryIdx)}
                              className="self-start p-2 text-red-600 hover:bg-red-50 rounded"
                              aria-label={t('backOffice.questionEditor.removeEntryAriaLabel', { name: entry.name || entryIdx + 1 })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600">{t('backOffice.questionEditor.entryPreviousProjectLabel')}</label>
                              <input
                                type="text"
                                value={entry.previousProject || ''}
                                onChange={(e) => updateRankingEntry(entryIdx, 'previousProject', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder={t('backOffice.questionEditor.entryPreviousProjectPlaceholder')}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600">{t('backOffice.questionEditor.entryOpinionLabel')}</label>
                              <input
                                type="text"
                                value={entry.opinion || ''}
                                onChange={(e) => updateRankingEntry(entryIdx, 'opinion', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder={t('backOffice.questionEditor.entryOpinionPlaceholder')}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">{t('backOffice.questionEditor.scoresLabel')}</label>
                            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                              {(editedQuestion.rankingConfig?.criteria || []).map(criterion => {
                                const inputId = `${entry.id || entryIdx}-${criterion.id}`;
                                return (
                                  <div key={inputId} className="flex flex-col gap-1">
                                    <label htmlFor={inputId} className="text-xs text-gray-600">{resolveLocalizedText(criterion.label, editingLanguage)}</label>
                                    <input
                                      id={inputId}
                                      type="number"
                                      min="0"
                                      max="5"
                                      value={entry?.scores?.[criterion.id] ?? ''}
                                      onChange={(e) => updateRankingScore(entryIdx, criterion.id, e.target.value)}
                                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                      placeholder={t('backOffice.questionEditor.scorePlaceholder')}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600">{t('backOffice.questionEditor.entryNotesLabel')}</label>
                            <textarea
                              value={entry.notes || ''}
                              onChange={(e) => updateRankingEntry(entryIdx, 'notes', e.target.value)}
                              rows="2"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder={t('backOffice.questionEditor.entryNotesPlaceholder')}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Guidage contextuel */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-500" />
              {t('backOffice.questionEditor.guidanceHeading')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">{t('backOffice.questionEditor.guidanceIntro')}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('backOffice.questionEditor.objectiveLabel')}</label>
                <input
                  type="text"
                  value={getLocalizedRaw(normalizedGuidance.objective, editingLanguage)}
                  onChange={(e) => updateGuidanceField('objective', setLocalizedText(normalizedGuidance.objective, editingLanguage, e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('backOffice.questionEditor.objectivePlaceholder')}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('backOffice.questionEditor.detailsLabel')}</label>
                <textarea
                  value={getLocalizedRaw(normalizedGuidance.details, editingLanguage)}
                  onChange={(e) => updateGuidanceField('details', setLocalizedText(normalizedGuidance.details, editingLanguage, e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder={t('backOffice.questionEditor.detailsPlaceholder')}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{t('backOffice.questionEditor.tipsLabel')}</span>
                <button
                  type="button"
                  onClick={addGuidanceTip}
                  className="flex items-center px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {t('backOffice.questionEditor.addTip')}
                </button>
              </div>

              {normalizedGuidance.tips.length === 0 ? (
                <p className="text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4">
                  {t('backOffice.questionEditor.noTipsYet')}
                </p>
              ) : (
                <div className="space-y-2">
                  {normalizedGuidance.tips.map((tip, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm w-6">#{idx + 1}</span>
                      <input
                        type="text"
                        value={getLocalizedRaw(tip, editingLanguage)}
                        onChange={(e) => updateGuidanceTip(idx, setLocalizedText(tip, editingLanguage, e.target.value))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder={t('backOffice.questionEditor.tipPlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() => deleteGuidanceTip(idx)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conditions d’affichage */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  {t('backOffice.questionEditor.conditionsHeading')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{t('backOffice.questionEditor.conditionsIntro')}</p>
              </div>
              <button
                type="button"
                onClick={addConditionGroup}
                className="flex items-center px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('backOffice.questionEditor.addGroup')}
              </button>
            </div>

            {conditionGroups.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-600 mb-2">{t('backOffice.questionEditor.alwaysVisible')}</p>
                <p className="text-sm text-gray-500">{t('backOffice.questionEditor.createGroupHint')}</p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={addConditionGroup}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('backOffice.questionEditor.createGroupButton')}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                  {conditionGroups.length === 1 ? (
                    (() => {
                      const logic = conditionGroups[0].logic === 'any' ? 'any' : 'all';
                      const logicLabel = logic === 'any' ? t('backOffice.questionEditor.orConnector') : t('backOffice.questionEditor.andConnector');
                      const logicDescription = logic === 'any'
                        ? t('backOffice.questionEditor.logicAny')
                        : t('backOffice.questionEditor.logicAll');

                      return (
                        <p className="text-sm text-blue-900">
                          <strong className="inline-flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                            {t('backOffice.questionEditor.logicLabelPrefix')}
                          </strong>{' '}
                          {t('backOffice.questionEditor.singleGroupIntro')}{' '}
                          <strong className="text-blue-700">{logicDescription}</strong>{' '}
                          {t('backOffice.questionEditor.singleGroupSuffixTemplate', { logic: logicLabel })}
                        </p>
                      );
                    })()
                  ) : (
                    <div className="space-y-2 text-sm text-blue-900">
                      <p>
                        <strong className="inline-flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-yellow-500" />
                          {t('backOffice.questionEditor.logicLabelPrefix')}
                        </strong>{' '}
                        {t('backOffice.questionEditor.multiGroupLine1Prefix')}{' '}
                        <strong className="text-blue-700">{t('backOffice.questionEditor.multiGroupLine1Bold')}</strong> {t('backOffice.questionEditor.multiGroupLine1Suffix')}
                      </p>
                      <p>
                        {t('backOffice.questionEditor.multiGroupLine2Prefix')}{' '}
                        <strong className="text-blue-700">{t('backOffice.questionEditor.multiGroupLine2Bold1')}</strong> {t('backOffice.questionEditor.multiGroupLine2Mid')}{' '}
                        <strong className="text-blue-700">{t('backOffice.questionEditor.multiGroupLine2Bold2')}</strong> {t('backOffice.questionEditor.multiGroupLine2Suffix')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {conditionGroups.map((group, groupIdx) => {
                    const logic = group.logic === 'any' ? 'any' : 'all';
                    const conditions = Array.isArray(group.conditions) ? group.conditions : [];
                    const connectorLabel = logic === 'any' ? t('backOffice.questionEditor.orConnector') : t('backOffice.questionEditor.andConnector');

                    return (
                      <div key={groupIdx}>
                        {groupIdx > 0 && (
                          <div className="flex justify-center -mb-3" aria-hidden="true">
                            <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
                              {t('backOffice.questionEditor.andConnector')}
                            </span>
                          </div>
                        )}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="text-sm font-semibold text-gray-700">
                              {t('backOffice.questionEditor.groupLabel', { number: groupIdx + 1 })}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-green-800 uppercase tracking-wide">
                              <span className="font-semibold">{t('backOffice.questionEditor.internalLogicLabel')}</span>
                              <select
                                value={logic}
                                onChange={(e) => updateConditionGroupLogic(groupIdx, e.target.value)}
                                className="px-3 py-1.5 border border-green-200 rounded-lg bg-white text-xs focus:ring-2 focus:ring-green-400"
                              >
                                <option value="all">{t('backOffice.questionEditor.logicAllOption')}</option>
                                <option value="any">{t('backOffice.questionEditor.logicAnyOption')}</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteConditionGroup(groupIdx)}
                              className="ml-auto p-2 text-red-600 hover:bg-red-50 rounded transition-all"
                              aria-label={t('backOffice.questionEditor.removeGroupAriaLabel', { number: groupIdx + 1 })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {conditions.length === 0 ? (
                            <div className="bg-white border border-dashed border-green-200 rounded-lg p-4 text-sm text-green-700">
                              <p>{t('backOffice.questionEditor.addConditionToEmptyGroup')}</p>
                              <button
                                type="button"
                                onClick={() => addConditionToGroup(groupIdx)}
                                className="mt-3 inline-flex items-center px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all text-sm font-medium"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                {t('backOffice.questionEditor.addCondition')}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {conditions.map((condition, idx) => (
                                <div key={idx} className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
                                  <div className="flex items-center space-x-3 mb-3">
                                    {idx > 0 && (
                                      <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                                        {connectorLabel}
                                      </span>
                                    )}
                                    <span className="text-sm font-semibold text-gray-700">
                                      {t('backOffice.questionEditor.conditionLabel', { number: idx + 1 })}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => deleteConditionFromGroup(groupIdx, idx)}
                                      className="ml-auto p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {t('backOffice.questionEditor.ifQuestionLabel')}
                                      </label>
                                      <select
                                        value={condition.question}
                                        onChange={(e) => updateConditionInGroup(groupIdx, idx, 'question', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                      >
                                        <option value="">{t('backOffice.questionEditor.selectPlaceholder')}</option>
                                        {availableQuestions.map(q => (
                                          <option key={q.id} value={q.id}>
                                            {resolveLocalizedText(q.question, editingLanguage) || q.id}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {t('backOffice.questionEditor.operatorLabel')}
                                      </label>
                                      {(() => {
                                        const selectedQuestion = conditionQuestionEntries.find(q => q.id === condition.question);
                                        const selectedType = selectedQuestion?.type || 'choice';
                                        const operatorOptions = getOperatorOptionsForType(selectedType);
                                        const operatorValue = ensureOperatorForType(selectedType, condition.operator);
                                        return (
                                          <select
                                            value={operatorValue}
                                            onChange={(e) => updateConditionInGroup(groupIdx, idx, 'operator', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                          >
                                            {operatorOptions.map(option => (
                                              <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                          </select>
                                        );
                                      })()}
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {t('backOffice.questionEditor.valueLabel')}
                                      </label>
                                      {(() => {
                                        if (!condition.question) {
                                          return (
                                            <input
                                              type="text"
                                              value={condition.value}
                                              onChange={(e) => updateConditionInGroup(groupIdx, idx, 'value', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                              placeholder={t('backOffice.questionEditor.valuePlaceholder')}
                                            />
                                          );
                                        }

                                        const selectedQuestion = conditionQuestionEntries.find(q => q.id === condition.question);
                                        const selectedType = selectedQuestion?.type || 'choice';
                                        const usesOptions = ['choice', 'multi_choice'].includes(selectedType);

                                        if (selectedType === 'boolean') {
                                          return (
                                            <select
                                              value={condition.value}
                                              onChange={(e) => updateConditionInGroup(groupIdx, idx, 'value', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                            >
                                              <option value="">{t('backOffice.questionEditor.selectPlaceholder')}</option>
                                              <option value="true">{t('backOffice.questionEditor.checkedOption')}</option>
                                              <option value="false">{t('backOffice.questionEditor.uncheckedOption')}</option>
                                            </select>
                                          );
                                        }

                                        if (usesOptions) {
                                          const optionEntries = getQuestionOptionEntries(selectedQuestion, { language: editingLanguage });
                                          return (
                                            <select
                                              value={condition.value}
                                              onChange={(e) => updateConditionInGroup(groupIdx, idx, 'value', e.target.value)}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                            >
                                              <option value="">{t('backOffice.questionEditor.selectPlaceholder')}</option>
                                              {optionEntries.map((entry, i) => (
                                                <option key={i} value={entry.value}>{entry.label}</option>
                                              ))}
                                            </select>
                                          );
                                        }

                                        const inputType = selectedType === 'number' ? 'number' : 'text';
                                        const placeholder =
                                          selectedType === 'date'
                                            ? t('backOffice.questionEditor.datePlaceholder')
                                            : selectedType === 'url'
                                              ? t('backOffice.questionEditor.urlPlaceholder')
                                              : t('backOffice.questionEditor.valuePlaceholder');

                                        return (
                                          <input
                                            type={inputType}
                                            value={condition.value}
                                            onChange={(e) => updateConditionInGroup(groupIdx, idx, 'value', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                                            placeholder={placeholder}
                                          />
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              ))}

                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => addConditionToGroup(groupIdx)}
                                  className="inline-flex items-center px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all text-sm font-medium"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  {t('backOffice.questionEditor.addCondition')}
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
            )}
          </div>
        </div>
      </div>
      {isOptionConditionOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-gray-900/50"
            onClick={closeOptionConditionModal}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {t('backOffice.questionEditor.optionConditionsTitle')}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{t('backOffice.questionEditor.optionConditionsDescription')}</p>
              </div>
              <button
                type="button"
                onClick={closeOptionConditionModal}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                {t('backOffice.questionEditor.close')}
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">{t('backOffice.questionEditor.groupsHeading')}</h4>
                <button
                  type="button"
                  onClick={addOptionConditionGroup}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
                >
                  <Plus className="h-4 w-4" />
                  {t('backOffice.questionEditor.addGroup')}
                </button>
              </div>

              {optionConditionGroups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                  <p>{t('backOffice.questionEditor.noConditionsYet')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {optionConditionGroups.map((group, groupIdx) => {
                    const logic = group.logic === 'any' ? 'any' : 'all';
                    const conditions = Array.isArray(group.conditions) ? group.conditions : [];
                    const connectorLabel = logic === 'any' ? t('backOffice.questionEditor.orConnector') : t('backOffice.questionEditor.andConnector');

                    return (
                      <div key={groupIdx} className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm font-semibold text-gray-700">
                            {t('backOffice.questionEditor.groupLabel', { number: groupIdx + 1 })}
                          </span>
                          <select
                            value={logic}
                            onChange={(e) => updateOptionConditionGroupLogic(groupIdx, e.target.value)}
                            className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs text-gray-700"
                          >
                            <option value="all">{t('backOffice.questionEditor.logicAllOption')}</option>
                            <option value="any">{t('backOffice.questionEditor.logicAnyOption')}</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => deleteOptionConditionGroup(groupIdx)}
                            className="ml-auto p-2 text-red-600 hover:bg-red-50 rounded"
                            aria-label={t('backOffice.questionEditor.removeGroupAriaLabel', { number: groupIdx + 1 })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {conditions.length === 0 ? (
                          <div className="mt-3 rounded-lg border border-dashed border-orange-200 bg-white p-3 text-sm text-orange-700">
                            <p>{t('backOffice.questionEditor.addConditionToActivateGroup')}</p>
                            <button
                              type="button"
                              onClick={() => addOptionConditionToGroup(groupIdx)}
                              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
                            >
                              <Plus className="h-4 w-4" />
                              {t('backOffice.questionEditor.addCondition')}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {conditions.map((condition, idx) => {
                              const selectedQuestion = conditionQuestionEntries.find(
                                (entry) => entry.id === condition.question
                              );
                              const selectedType = selectedQuestion?.type || 'choice';
                              const usesOptions = ['choice', 'multi_choice'].includes(selectedType);
                              const operatorOptions = getOperatorOptionsForType(selectedType);
                              const operatorValue = ensureOperatorForType(selectedType, condition.operator);
                              return (
                                <div key={idx} className="rounded-lg border border-orange-200 bg-white p-4">
                                  <div className="flex items-center gap-3 mb-3">
                                    {idx > 0 && (
                                      <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                                        {connectorLabel}
                                      </span>
                                    )}
                                    <span className="text-sm font-semibold text-gray-700">
                                      {t('backOffice.questionEditor.conditionLabel', { number: idx + 1 })}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => deleteOptionConditionFromGroup(groupIdx, idx)}
                                      className="ml-auto p-1 text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {t('backOffice.questionEditor.ifQuestionLabel')}
                                      </label>
                                      <select
                                        value={condition.question}
                                        onChange={(e) =>
                                          updateOptionConditionInGroup(
                                            groupIdx,
                                            idx,
                                            'question',
                                            e.target.value
                                          )}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                      >
                                        <option value="">{t('backOffice.questionEditor.selectPlaceholder')}</option>
                                        {availableQuestions.map((q) => (
                                          <option key={q.id} value={q.id}>
                                            {resolveLocalizedText(q.question, editingLanguage) || q.id}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {t('backOffice.questionEditor.operatorLabel')}
                                      </label>
                                      <select
                                        value={operatorValue}
                                        onChange={(e) =>
                                          updateOptionConditionInGroup(
                                            groupIdx,
                                            idx,
                                            'operator',
                                            e.target.value
                                          )}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                      >
                                        {operatorOptions.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {t('backOffice.questionEditor.valueLabel')}
                                      </label>
                                      {selectedType === 'boolean' ? (
                                        <select
                                          value={condition.value}
                                          onChange={(e) =>
                                            updateOptionConditionInGroup(
                                              groupIdx,
                                              idx,
                                              'value',
                                              e.target.value
                                            )}
                                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        >
                                          <option value="">{t('backOffice.questionEditor.selectPlaceholder')}</option>
                                          <option value="true">{t('backOffice.questionEditor.checkedOption')}</option>
                                          <option value="false">{t('backOffice.questionEditor.uncheckedOption')}</option>
                                        </select>
                                      ) : usesOptions ? (
                                        <select
                                          value={condition.value}
                                          onChange={(e) =>
                                            updateOptionConditionInGroup(
                                              groupIdx,
                                              idx,
                                              'value',
                                              e.target.value
                                            )}
                                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        >
                                          <option value="">{t('backOffice.questionEditor.selectPlaceholder')}</option>
                                          {getQuestionOptionEntries(selectedQuestion, { language: editingLanguage }).map((entry, optIdx) => (
                                            <option key={optIdx} value={entry.value}>
                                              {entry.label}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type={selectedType === 'number' ? 'number' : 'text'}
                                          value={condition.value}
                                          onChange={(e) =>
                                            updateOptionConditionInGroup(
                                              groupIdx,
                                              idx,
                                              'value',
                                              e.target.value
                                            )}
                                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                          placeholder={
                                            selectedType === 'date'
                                              ? t('backOffice.questionEditor.datePlaceholder')
                                              : selectedType === 'url'
                                                ? t('backOffice.questionEditor.urlPlaceholder')
                                                : t('backOffice.questionEditor.valuePlaceholder')
                                          }
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => addOptionConditionToGroup(groupIdx)}
                                className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
                              >
                                <Plus className="h-4 w-4" />
                                {t('backOffice.questionEditor.addCondition')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeOptionConditionModal}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('backOffice.questionEditor.cancel')}
              </button>
              <button
                type="button"
                onClick={saveOptionConditionGroups}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                {t('backOffice.questionEditor.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
