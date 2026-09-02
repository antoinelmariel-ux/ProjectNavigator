import React, { useEffect, useRef, useState } from '../react.js';
import {
  Plus,
  Trash2,
  CheckCircle,
  Clipboard,
  Target,
  Lightbulb,
  Users,
  FileText,
  AlertTriangle
} from './icons.js';
import {
  applyRuleConditionGroups,
  normalizeRuleConditionGroups,
  sanitizeRuleCondition,
  createEmptyQuestionCondition,
  createEmptyTimingCondition
} from '../utils/ruleConditions.js';
import { ensureOperatorForType, getOperatorOptionsForType } from '../utils/operatorOptions.js';
import { getConditionQuestionEntries, getQuestionOptionEntries } from '../utils/questions.js';
import {
  sanitizeRiskTimingConstraint,
  sanitizeTeamQuestionEntry,
  sanitizeTeamQuestionsByTeam
} from '../utils/rules.js';
import { RichTextEditor } from './RichTextEditor.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { resolveLocalizedText, getLocalizedRaw, setLocalizedText } from '../utils/localizedContent.js';
import { LanguageEditSwitcher } from './LocalizedFieldEditor.jsx';

const RISK_PRIORITY_OPTIONS = [
  'standard',
  'elevated',
  'critical'
];

const RISK_PRIORITY_LABEL_KEYS = {
  standard: 'riskPriorityToDo',
  elevated: 'riskPriorityToAnticipate',
  critical: 'riskPriorityToAnticipateUrgently'
};

const normalizeRiskEntry = (risk, availableTeams = []) => {
  const safeTeams = Array.isArray(availableTeams) ? availableTeams : [];
  const fallbackTeam = safeTeams[0] || '';

  const normalized = {
    description: '',
    level: 'medium',
    mitigation: '',
    priority: 'standard',
    teamId: fallbackTeam,
    ...risk
  };

  if (!RISK_PRIORITY_OPTIONS.includes(normalized.priority)) {
    normalized.priority = 'standard';
  }

  if (normalized.level !== 'low' && normalized.level !== 'medium' && normalized.level !== 'high') {
    normalized.level = 'medium';
  }

  if (!safeTeams.includes(normalized.teamId)) {
    normalized.teamId = fallbackTeam || '';
  }

  return {
    ...normalized,
    timingConstraint: sanitizeRiskTimingConstraint(normalized?.timingConstraint)
  };
};

const normalizeRiskList = (risks, availableTeams = []) => {
  if (!Array.isArray(risks)) {
    return [];
  }

  return risks.map((risk) => normalizeRiskEntry(risk, availableTeams));
};

const normalizeRoutingRuleEntry = (entry) => {
  const source = entry && typeof entry === 'object' ? entry : {};

  return {
    id: source.id || `route_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    targetTeamId: typeof source.targetTeamId === 'string' ? source.targetTeamId : '',
    conditionGroups: Array.isArray(source.conditionGroups) ? source.conditionGroups : []
  };
};

const normalizeRoutingRules = (routingRules) => {
  if (!Array.isArray(routingRules)) {
    return [];
  }

  return routingRules.map(normalizeRoutingRuleEntry);
};

export const RuleEditor = ({ rule, onSave, onCancel, questions, teams }) => {
  const { t, language } = useTranslation();
  const [editingLanguage, setEditingLanguage] = useState(language);
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

  const sanitizeConditionGroups = (groups) => {
    const conditionQuestions = getConditionQuestionEntries(questions);
    return Array.isArray(groups)
      ? groups.map(group => ({
          ...group,
          conditions: Array.isArray(group.conditions)
            ? group.conditions.map(condition => {
                if (condition?.type === 'timing') {
                  const { complianceProfiles: _discardedComplianceProfiles, ...restTiming } = condition || {};
                  return restTiming;
                }

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

  const buildRuleState = (source) => {
    const sanitizedSource = source || {};
    const { priority: _discardedPriority, ...rest } = sanitizedSource;
    const teamsList = Array.isArray(rest.teams)
      ? Array.from(new Set(rest.teams.filter(teamId => typeof teamId === 'string' && teamId.trim() !== '')))
      : [];

    const base = {
      ...rest,
      notifyTeam: rest.notifyTeam !== false,
      conditionLogic: rest.conditionLogic === 'any' ? 'any' : 'all',
      conditions: Array.isArray(rest.conditions)
        ? rest.conditions.map(sanitizeRuleCondition)
        : [],
      conditionGroups: Array.isArray(rest.conditionGroups) ? rest.conditionGroups : [],
      teams: teamsList,
      teamRoutingRules: normalizeRoutingRules(rest.teamRoutingRules),
      questions: sanitizeTeamQuestionsByTeam(rest.questions || {}),
      risks: normalizeRiskList(rest.risks, teamsList)
    };

    const groups = sanitizeConditionGroups(normalizeRuleConditionGroups(base));
    return applyRuleConditionGroups(base, groups);
  };

  const [editedRule, setEditedRule] = useState(() => buildRuleState(rule));
  const [routingModal, setRoutingModal] = useState({ index: null, groups: [] });

  useEffect(() => {
    setEditedRule(buildRuleState(rule));
  }, [rule]);

  const conditionGroups = Array.isArray(editedRule.conditionGroups)
    ? editedRule.conditionGroups
    : [];

  const updateConditionGroupsState = (updater) => {
    setEditedRule(prev => {
      const currentGroups = Array.isArray(prev.conditionGroups) ? prev.conditionGroups : [];
      const nextGroups = sanitizeConditionGroups(updater(currentGroups));
      return applyRuleConditionGroups(prev, nextGroups);
    });
  };

  const addConditionGroup = () => {
    updateConditionGroupsState(groups => ([
      ...groups,
      { logic: 'all', conditions: [createEmptyQuestionCondition()] }
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

  const deleteConditionGroup = (groupIndex) => {
    updateConditionGroupsState(groups => groups.filter((_, idx) => idx !== groupIndex));
  };

  const withUpdatedCondition = (groups, groupIndex, conditionIndex, updater) => {
    const updated = [...groups];
    const target = updated[groupIndex] || { logic: 'all', conditions: [] };
    const conditions = Array.isArray(target.conditions) ? [...target.conditions] : [];
    const currentCondition = sanitizeRuleCondition(
      conditions[conditionIndex] || createEmptyQuestionCondition()
    );
    const updatedCondition = sanitizeRuleCondition(
      updater ? updater(currentCondition) || currentCondition : currentCondition
    );
    const question = conditionQuestionEntries.find(q => q.id === updatedCondition.question);
    const questionType = question?.type || 'choice';
    const nextCondition = updatedCondition.type === 'timing'
      ? updatedCondition
      : { ...updatedCondition, operator: ensureOperatorForType(questionType, updatedCondition.operator) };
    conditions[conditionIndex] = nextCondition;
    updated[groupIndex] = { ...target, conditions };
    return updated;
  };

  const addConditionToGroup = (groupIndex) => {
    updateConditionGroupsState(groups => {
      const updated = [...groups];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      const conditions = Array.isArray(target.conditions) ? [...target.conditions] : [];
      conditions.push(createEmptyQuestionCondition());
      updated[groupIndex] = { ...target, conditions };
      return updated;
    });
  };

  const updateConditionField = (groupIndex, conditionIndex, field, value) => {
    updateConditionGroupsState(groups =>
      withUpdatedCondition(groups, groupIndex, conditionIndex, condition => ({
        ...condition,
        [field]: value
      }))
    );
  };

  const deleteConditionFromGroup = (groupIndex, conditionIndex) => {
    updateConditionGroupsState(groups => {
      const updated = [...groups];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      const conditions = Array.isArray(target.conditions)
        ? target.conditions.filter((_, idx) => idx !== conditionIndex)
        : [];
      updated[groupIndex] = { ...target, conditions };
      return updated;
    });
  };

  const handleConditionTypeChange = (groupIndex, conditionIndex, type) => {
    updateConditionGroupsState(groups => {
      const updated = [...groups];
      const target = updated[groupIndex] || { logic: 'all', conditions: [] };
      const conditions = Array.isArray(target.conditions) ? [...target.conditions] : [];
      const normalizedType = type === 'timing' ? 'timing' : 'question';
      conditions[conditionIndex] = normalizedType === 'timing'
        ? createEmptyTimingCondition()
        : createEmptyQuestionCondition();
      updated[groupIndex] = { ...target, conditions };
      return updated;
    });
  };

  const toggleTeamSelection = (teamId) => {
    setEditedRule(prev => {
      const currentTeams = Array.isArray(prev.teams) ? prev.teams : [];
      const alreadySelected = currentTeams.includes(teamId);
      const nextTeams = alreadySelected
        ? currentTeams.filter((id) => id !== teamId)
        : [...currentTeams, teamId];
      const normalizedRisks = normalizeRiskList(prev.risks, nextTeams);
      const primaryTeam = nextTeams[0] || '';

      return {
        ...prev,
        teams: nextTeams,
        risks: normalizedRisks,
        teamRoutingRules: normalizeRoutingRules(prev.teamRoutingRules).filter((route) => route.targetTeamId !== primaryTeam)
      };
    });
  };

  const primaryTeamId = Array.isArray(editedRule.teams) ? (editedRule.teams[0] || '') : '';
  const primaryTeamLabel = teams.find((team) => team.id === primaryTeamId)?.name || primaryTeamId;

  const openRoutingModal = (index) => {
    const route = normalizeRoutingRuleEntry((editedRule.teamRoutingRules || [])[index]);
    const sanitizedGroups = sanitizeConditionGroups(normalizeRuleConditionGroups({
      conditionGroups: route.conditionGroups
    }));
    setRoutingModal({ index, groups: sanitizedGroups });
  };

  const closeRoutingModal = () => {
    setRoutingModal({ index: null, groups: [] });
  };

  const updateRoutingModalGroups = (updater) => {
    setRoutingModal(prev => {
      const currentGroups = Array.isArray(prev.groups) ? prev.groups : [];
      const nextGroups = sanitizeConditionGroups(updater(currentGroups));
      return { ...prev, groups: nextGroups };
    });
  };

  const saveRoutingModal = () => {
    const { index, groups } = routingModal;

    if (index === null || index === undefined) {
      return;
    }

    setEditedRule(prev => {
      const routes = normalizeRoutingRules(prev.teamRoutingRules);
      const current = normalizeRoutingRuleEntry(routes[index]);
      routes[index] = {
        ...current,
        conditionGroups: sanitizeConditionGroups(groups)
      };
      return { ...prev, teamRoutingRules: routes };
    });

    closeRoutingModal();
  };

  const addRoutingRule = () => {
    setEditedRule(prev => ({
      ...prev,
      teamRoutingRules: [
        ...normalizeRoutingRules(prev.teamRoutingRules),
        normalizeRoutingRuleEntry({ targetTeamId: '' })
      ]
    }));
  };

  const updateRoutingRule = (index, field, value) => {
    setEditedRule(prev => {
      const routes = normalizeRoutingRules(prev.teamRoutingRules);
      const current = normalizeRoutingRuleEntry(routes[index]);
      routes[index] = { ...current, [field]: value };
      return { ...prev, teamRoutingRules: routes };
    });
  };

  const deleteRoutingRule = (index) => {
    setEditedRule(prev => ({
      ...prev,
      teamRoutingRules: normalizeRoutingRules(prev.teamRoutingRules).filter((_, idx) => idx !== index)
    }));
  };

  const addQuestionForTeam = (teamId) => {
    setEditedRule(prev => {
      const currentQuestions = typeof prev.questions === 'object' && prev.questions !== null
        ? { ...prev.questions }
        : {};
      const existing = Array.isArray(currentQuestions[teamId])
        ? [...currentQuestions[teamId]]
        : [];
      existing.push(sanitizeTeamQuestionEntry({ text: '' }));
      currentQuestions[teamId] = existing;
      return { ...prev, questions: currentQuestions };
    });
  };

  const updateTeamQuestion = (teamId, index, value) => {
    setEditedRule(prev => {
      const currentQuestions = typeof prev.questions === 'object' && prev.questions !== null
        ? { ...prev.questions }
        : {};
      const existing = Array.isArray(currentQuestions[teamId])
        ? [...currentQuestions[teamId]]
        : [];
      const currentEntry = sanitizeTeamQuestionEntry(existing[index] || {});
      existing[index] = { ...currentEntry, text: setLocalizedText(currentEntry.text, editingLanguage, value) };
      currentQuestions[teamId] = existing;
      return { ...prev, questions: currentQuestions };
    });
  };

  const deleteTeamQuestion = (teamId, index) => {
    setEditedRule(prev => {
      const currentQuestions = typeof prev.questions === 'object' && prev.questions !== null
        ? { ...prev.questions }
        : {};
      const existing = Array.isArray(currentQuestions[teamId])
        ? currentQuestions[teamId].filter((_, i) => i !== index)
        : [];
      currentQuestions[teamId] = existing;
      return { ...prev, questions: currentQuestions };
    });
  };

  const updateTeamQuestionTiming = (teamId, index, updates) => {
    setEditedRule(prev => {
      const currentQuestions = typeof prev.questions === 'object' && prev.questions !== null
        ? { ...prev.questions }
        : {};
      const existing = Array.isArray(currentQuestions[teamId])
        ? [...currentQuestions[teamId]]
        : [];
      const currentEntry = sanitizeTeamQuestionEntry(existing[index] || {});
      const mergedConstraint = {
        ...currentEntry.timingConstraint,
        ...(typeof updates === 'function'
          ? updates(currentEntry.timingConstraint)
          : updates)
      };
      existing[index] = {
        ...currentEntry,
        timingConstraint: sanitizeRiskTimingConstraint(mergedConstraint)
      };
      currentQuestions[teamId] = existing;
      return { ...prev, questions: currentQuestions };
    });
  };

  const addRisk = () => {
    const teamsForRisk = Array.isArray(editedRule.teams) ? editedRule.teams : [];
    const fallbackTeam = teamsForRisk[0] || '';
    const newRisk = normalizeRiskEntry({
      description: '',
      level: 'medium',
      mitigation: '',
      priority: 'standard',
      teamId: fallbackTeam,
      timingConstraint: sanitizeRiskTimingConstraint()
    }, teamsForRisk);

    const existingRisks = Array.isArray(editedRule.risks) ? editedRule.risks : [];
    setEditedRule({
      ...editedRule,
      risks: [...existingRisks, newRisk]
    });
  };

  const updateRisk = (index, field, value) => {
    const currentRisks = Array.isArray(editedRule.risks) ? [...editedRule.risks] : [];
    const baseRisk = normalizeRiskEntry(currentRisks[index] || {}, editedRule.teams);
    const nextValue = (field === 'description' || field === 'mitigation')
      ? setLocalizedText(baseRisk[field], editingLanguage, value)
      : value;
    currentRisks[index] = { ...baseRisk, [field]: nextValue };
    const normalizedRisks = normalizeRiskList(currentRisks, editedRule.teams);
    setEditedRule({ ...editedRule, risks: normalizedRisks });
  };

  const deleteRisk = (index) => {
    setEditedRule({
      ...editedRule,
      risks: editedRule.risks.filter((_, i) => i !== index)
    });
  };

  const updateRiskTimingConstraint = (index, updates) => {
    setEditedRule(prev => {
      const currentRisks = Array.isArray(prev.risks) ? [...prev.risks] : [];
      const baseRisk = normalizeRiskEntry(currentRisks[index] || {}, prev.teams);
      const mergedConstraint = {
        ...baseRisk.timingConstraint,
        ...(typeof updates === 'function' ? updates(baseRisk.timingConstraint) : updates)
      };
      baseRisk.timingConstraint = sanitizeRiskTimingConstraint(mergedConstraint);
      currentRisks[index] = baseRisk;
      const normalizedRisks = normalizeRiskList(currentRisks, prev.teams);
      return { ...prev, risks: normalizedRisks };
    });
  };

  const conditionQuestionEntries = getConditionQuestionEntries(questions, editingLanguage);
  const dateQuestions = questions.filter(q => (q.type || 'choice') === 'date');
  const dialogTitleId = 'rule-editor-title';
  const routingConditionGroups = Array.isArray(routingModal.groups) ? routingModal.groups : [];
  const isRoutingModalOpen = routingModal.index !== null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-4 sm:my-8 overflow-y-auto hv-modal-panel"
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
              {t('backOffice.ruleEditor.title')}
            </h2>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-all"
              >
                {t('backOffice.ruleEditor.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const normalizedRisks = normalizeRiskList(editedRule.risks, editedRule.teams);
                  onSave(
                    applyRuleConditionGroups(
                      {
                        ...editedRule,
                        questions: sanitizeTeamQuestionsByTeam(editedRule.questions),
                        risks: normalizedRisks
                      },
                      conditionGroups
                    )
                  );
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
              >
                {t('backOffice.ruleEditor.save')}
              </button>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-8">
          <LanguageEditSwitcher
            editingLanguage={editingLanguage}
            onChange={setEditingLanguage}
            label={t('backOffice.ruleEditor.editingLanguageLabel')}
            hint={t('backOffice.ruleEditor.editingLanguageHint')}
          />
          {/* Informations générales */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-blue-500" />
              {t('backOffice.ruleEditor.generalInfoHeading')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('backOffice.ruleEditor.nameLabel')}</label>
                <input
                  type="text"
                  value={getLocalizedRaw(editedRule.name, editingLanguage)}
                  onChange={(e) => setEditedRule({ ...editedRule, name: setLocalizedText(editedRule.name, editingLanguage, e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('backOffice.ruleEditor.namePlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  {t('backOffice.ruleEditor.conditionsHeading')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{t('backOffice.ruleEditor.conditionsIntro')}</p>
              </div>
              <button
                type="button"
                onClick={addConditionGroup}
                className="flex items-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('backOffice.ruleEditor.addGroup')}
              </button>
            </div>

            {conditionGroups.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-600 mb-2">{t('backOffice.ruleEditor.alwaysTriggered')}</p>
                <p className="text-sm text-gray-500">{t('backOffice.ruleEditor.createGroupHint')}</p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={addConditionGroup}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('backOffice.ruleEditor.createGroupButton')}
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
                            {t('backOffice.ruleEditor.logicLabelPrefix')}
                          </strong>{' '}
                          {t('backOffice.ruleEditor.singleGroupIntro')}{' '}
                          <strong className="text-blue-700">{logicDescription}</strong>{' '}
                          {t('backOffice.ruleEditor.singleGroupSuffixTemplate', { logic: logicLabel })}
                        </p>
                      );
                    })()
                  ) : (
                    <div className="space-y-2 text-sm text-blue-900">
                      <p>
                        <strong className="inline-flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-yellow-500" />
                          {t('backOffice.ruleEditor.logicLabelPrefix')}
                        </strong>{' '}
                        {t('backOffice.ruleEditor.multiGroupLine1Prefix')}{' '}
                        <strong className="text-blue-700">{t('backOffice.ruleEditor.multiGroupLine1Bold')}</strong> {t('backOffice.ruleEditor.multiGroupLine1Suffix')}
                      </p>
                      <p>
                        {t('backOffice.ruleEditor.multiGroupLine2Prefix')}{' '}
                        <strong className="text-blue-700">{t('backOffice.ruleEditor.multiGroupLine2Bold1')}</strong> {t('backOffice.ruleEditor.multiGroupLine2Mid')}{' '}
                        <strong className="text-blue-700">{t('backOffice.ruleEditor.multiGroupLine2Bold2')}</strong> {t('backOffice.ruleEditor.multiGroupLine2Suffix')}
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
                            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
                              {t('backOffice.questionEditor.andConnector')}
                            </span>
                          </div>
                        )}

                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="text-sm font-semibold text-gray-700">
                              {t('backOffice.ruleEditor.groupLabel', { number: groupIdx + 1 })}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-blue-800 uppercase tracking-wide">
                              <span className="font-semibold">{t('backOffice.ruleEditor.internalLogicLabel')}</span>
                              <select
                                value={logic}
                                onChange={(e) => updateConditionGroupLogic(groupIdx, e.target.value)}
                                className="px-3 py-1.5 border border-blue-200 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="all">{t('backOffice.ruleEditor.logicAllOption')}</option>
                                <option value="any">{t('backOffice.ruleEditor.logicAnyOption')}</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteConditionGroup(groupIdx)}
                              className="ml-auto p-2 text-red-600 hover:bg-red-50 rounded transition-all"
                              aria-label={t('backOffice.ruleEditor.removeGroupAriaLabel', { number: groupIdx + 1 })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {conditions.length === 0 ? (
                            <div className="bg-white border border-dashed border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                              <p>{t('backOffice.ruleEditor.addConditionToEmptyGroup')}</p>
                              <button
                                type="button"
                                onClick={() => addConditionToGroup(groupIdx)}
                                className="mt-3 inline-flex items-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-sm font-medium"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                {t('backOffice.ruleEditor.addCondition')}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {conditions.map((condition, conditionIdx) => {
                                const conditionType = condition.type === 'timing' ? 'timing' : 'question';
                                const selectedQuestion = conditionQuestionEntries.find(q => q.id === condition.question);
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
                                    : t('backOffice.ruleEditor.valuePlaceholderGeneric');

                                return (
                                  <div key={conditionIdx} className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                      {conditionIdx > 0 && (
                                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                                          {connectorLabel}
                                        </span>
                                      )}
                                      <span className="text-sm font-semibold text-gray-700">
                                        {t('backOffice.ruleEditor.conditionLabel', { number: conditionIdx + 1 })}
                                      </span>
                                      <select
                                        value={conditionType}
                                        onChange={(e) => handleConditionTypeChange(groupIdx, conditionIdx, e.target.value)}
                                        className="px-3 py-2 border border-blue-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="question">{t('backOffice.ruleEditor.conditionTypeQuestion')}</option>
                                        <option value="timing">{t('backOffice.ruleEditor.conditionTypeTiming')}</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => deleteConditionFromGroup(groupIdx, conditionIdx)}
                                        className="ml-auto p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>

                                    {conditionType === 'timing' ? (
                                      <div className="space-y-4">
                                        {dateQuestions.length >= 2 ? (
                                          <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.startDateLabel')}</label>
                                                <select
                                                  value={condition.startQuestion}
                                                  onChange={(e) => updateConditionField(groupIdx, conditionIdx, 'startQuestion', e.target.value)}
                                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                >
                                                  <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                                                  {dateQuestions.map(q => (
                                                    <option key={q.id} value={q.id}>{resolveLocalizedText(q.question, editingLanguage) || q.id}</option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.timingEndDateLabel')}</label>
                                                <select
                                                  value={condition.endQuestion}
                                                  onChange={(e) => updateConditionField(groupIdx, conditionIdx, 'endQuestion', e.target.value)}
                                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                >
                                                  <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                                                  {dateQuestions.map(q => (
                                                    <option key={q.id} value={q.id}>{resolveLocalizedText(q.question, editingLanguage) || q.id}</option>
                                                  ))}
                                                </select>
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.minWeeksLabel')}</label>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={condition.minimumWeeks ?? ''}
                                                  onChange={(e) => updateConditionField(groupIdx, conditionIdx, 'minimumWeeks', e.target.value === '' ? undefined : Number(e.target.value))}
                                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                  placeholder={t('backOffice.ruleEditor.minWeeksPlaceholder')}
                                                />
                                              </div>

                                              <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.maxWeeksLabel')}</label>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={condition.maximumWeeks ?? ''}
                                                  onChange={(e) => updateConditionField(groupIdx, conditionIdx, 'maximumWeeks', e.target.value === '' ? undefined : Number(e.target.value))}
                                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                  placeholder={t('backOffice.ruleEditor.maxWeeksPlaceholder')}
                                                />
                                              </div>
                                            </div>

                                            <p className="text-xs text-gray-500">{t('backOffice.ruleEditor.timingHint')}</p>

                                          </>
                                        ) : (
                                          <div className="bg-white border border-dashed border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                                            {t('backOffice.ruleEditor.needTwoDateQuestions')}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.questionLabel')}</label>
                                          <select
                                            value={condition.question}
                                            onChange={(e) => updateConditionField(groupIdx, conditionIdx, 'question', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                          >
                                            <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                                            {conditionQuestionEntries.map(q => (
                                              <option key={q.id} value={q.id}>{resolveLocalizedText(q.question, editingLanguage) || q.id}</option>
                                            ))}
                                          </select>
                                        </div>

                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.operatorLabel')}</label>
                                          {(() => {
                                            const operatorOptions = getOperatorOptionsForType(selectedQuestionType);
                                            const operatorValue = ensureOperatorForType(selectedQuestionType, condition.operator);
                                            return (
                                              <select
                                                value={operatorValue}
                                                onChange={(e) => updateConditionField(groupIdx, conditionIdx, 'operator', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                              >
                                                {operatorOptions.map(option => (
                                                  <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                              </select>
                                            );
                                          })()}
                                        </div>

                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.valueLabel')}</label>
                                          {(() => {
                                            if (!condition.question) {
                                              return (
                                                <input
                                                  type="text"
                                                  value={condition.value}
                                                  onChange={(e) => updateConditionField(groupIdx, conditionIdx, 'value', e.target.value)}
                                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                  placeholder={t('backOffice.ruleEditor.valuePlaceholderGeneric')}
                                                />
                                              );
                                            }

                                            if (selectedQuestionType === 'boolean') {
                                              return (
                                                <select
                                                  value={condition.value}
                                                  onChange={(e) => updateConditionField(groupIdx, conditionIdx, 'value', e.target.value)}
                                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                >
                                                  <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                                                  <option value="true">{t('backOffice.ruleEditor.checkedOption')}</option>
                                                  <option value="false">{t('backOffice.ruleEditor.uncheckedOption')}</option>
                                                </select>
                                              );
                                            }

                                            if (usesOptions) {
                                              const optionEntries = getQuestionOptionEntries(selectedQuestion, { language: editingLanguage });
                                              return (
                                                <select
                                                  value={condition.value}
                                                  onChange={(e) => updateConditionField(groupIdx, conditionIdx, 'value', e.target.value)}
                                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                >
                                                  <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                                                  {optionEntries.map((entry, i) => (
                                                    <option key={i} value={entry.value}>{entry.label}</option>
                                                  ))}
                                                </select>
                                              );
                                            }

                                            return (
                                              <input
                                                type={inputType}
                                                value={condition.value}
                                                onChange={(e) => updateConditionField(groupIdx, conditionIdx, 'value', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                placeholder={placeholder}
                                              />
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              <div className="pt-3 border-t border-blue-100 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => addConditionToGroup(groupIdx)}
                                  className="flex items-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-sm font-medium"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  {t('backOffice.ruleEditor.addCondition')}
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
          {/* Équipes à déclencher */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              {t('backOffice.ruleEditor.teamsHeading')}
            </h3>
            <label className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editedRule.notifyTeam !== false}
                onChange={(event) =>
                  setEditedRule((prev) => ({
                    ...prev,
                    notifyTeam: event.target.checked
                  }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {t('backOffice.ruleEditor.notifyTeamLabel')}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teams.map(team => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => toggleTeamSelection(team.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    editedRule.teams?.includes(team.id)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                      editedRule.teams?.includes(team.id)
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300'
                    }`}>
                      {editedRule.teams?.includes(team.id) && (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{team.name}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" />
                  {t('backOffice.ruleEditor.routingHeading')}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{t('backOffice.ruleEditor.routingIntro')}</p>
              </div>
              <button
                type="button"
                onClick={addRoutingRule}
                disabled={!primaryTeamId}
                className="flex items-center px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('backOffice.ruleEditor.addRouting')}
              </button>
            </div>
            {!primaryTeamId ? (
              <div className="text-sm text-gray-500 italic">{t('backOffice.ruleEditor.selectPrimaryTeamFirst')}</div>
            ) : (editedRule.teamRoutingRules || []).length === 0 ? (
              <div className="text-sm text-gray-500 italic">{t('backOffice.ruleEditor.noRoutingConfigured')}</div>
            ) : (
              <div className="space-y-3">
                {(editedRule.teamRoutingRules || []).map((route, idx) => {
                  const normalizedRoute = normalizeRoutingRuleEntry(route);
                  return (
                    <div key={normalizedRoute.id} className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-indigo-900">{t('backOffice.ruleEditor.routingLabel', { number: idx + 1 })}</p>
                        <button
                          type="button"
                          onClick={() => deleteRoutingRule(idx)}
                          className="p-1 text-indigo-700 hover:bg-indigo-100 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('backOffice.ruleEditor.targetTeamLabel')}</label>
                        <select
                          value={normalizedRoute.targetTeamId}
                          onChange={(e) => updateRoutingRule(idx, 'targetTeamId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                          {teams
                            .filter((team) => team.id !== primaryTeamId)
                            .map((team) => (
                              <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => openRoutingModal(idx)}
                        className="inline-flex items-center px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-all text-sm"
                      >
                        {t('backOffice.ruleEditor.manageConditions')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Questions par équipe */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              {t('backOffice.ruleEditor.teamQuestionsHeading')}
            </h3>
            {!primaryTeamId ? (
              <div className="text-sm text-gray-500 italic">{t('backOffice.ruleEditor.selectTeamForQuestions')}</div>
            ) : (
              <div className="space-y-4">
                  <div key={primaryTeamId} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">
                        {primaryTeamLabel}
                      </h4>
                      <button
                        onClick={() => addQuestionForTeam(primaryTeamId)}
                        className="flex items-center px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {t('backOffice.ruleEditor.addQuestion')}
                      </button>
                    </div>
                    {(editedRule.questions[primaryTeamId] || []).length > 0 ? (
                      <div className="space-y-2">
                        {(editedRule.questions[primaryTeamId] || []).map((questionEntry, idx) => {
                          const sanitizedEntry = sanitizeTeamQuestionEntry(questionEntry);
                          const timingConstraint = sanitizeRiskTimingConstraint(
                            sanitizedEntry.timingConstraint
                          );
                          const hasDateQuestions = dateQuestions.length >= 2;
                          const toggleDisabled = !hasDateQuestions && !timingConstraint.enabled;
                          const isToggleChecked = Boolean(timingConstraint.enabled);

                          return (
                            <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-white space-y-3">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 min-w-0">
                                  <RichTextEditor
                                    id={`team-question-${primaryTeamId}-${idx}`}
                                    value={getLocalizedRaw(sanitizedEntry.text, editingLanguage)}
                                    onChange={(nextValue) => updateTeamQuestion(primaryTeamId, idx, nextValue)}
                                    placeholder={t('backOffice.ruleEditor.questionForTeamPlaceholder')}
                                    compact
                                    ariaLabel={t('backOffice.ruleEditor.questionForTeamAriaLabel')}
                                  />
                                </div>
                                <button
                                  onClick={() => deleteTeamQuestion(primaryTeamId, idx)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-all"
                                  aria-label={t('backOffice.ruleEditor.removeQuestion')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="border-t border-gray-100 pt-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-medium text-gray-600">{t('backOffice.ruleEditor.linkToMinDelay')}</p>
                                    <p className="text-xs text-gray-500 leading-snug">{t('backOffice.ruleEditor.linkToMinDelayHint')}</p>
                                  </div>
                                  <label
                                    className={`inline-flex items-center gap-2 text-xs font-medium ${
                                      toggleDisabled ? 'text-gray-400' : 'text-gray-700'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={isToggleChecked}
                                      onChange={(event) =>
                                        updateTeamQuestionTiming(primaryTeamId, idx, { enabled: event.target.checked })
                                      }
                                      disabled={toggleDisabled}
                                    />
                                    <span>{isToggleChecked ? t('backOffice.ruleEditor.enabledLabel') : t('backOffice.ruleEditor.disabledLabel')}</span>
                                  </label>
                                </div>

                                {!hasDateQuestions ? (
                                  <p className="mt-2 text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                                    {t('backOffice.ruleEditor.needTwoDateQuestionsForDelay')}
                                  </p>
                                ) : isToggleChecked ? (
                                  <div className="mt-3 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.startDateLabel')}</label>
                                        <select
                                          value={timingConstraint.startQuestion}
                                          onChange={(e) =>
                                            updateTeamQuestionTiming(primaryTeamId, idx, { startQuestion: e.target.value })
                                          }
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        >
                                          <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                                          {dateQuestions.map(question => (
                                            <option key={question.id} value={question.id}>
                                              {resolveLocalizedText(question.question, editingLanguage) || question.id}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.constraintEndDateLabel')}</label>
                                        <select
                                          value={timingConstraint.endQuestion}
                                          onChange={(e) =>
                                            updateTeamQuestionTiming(primaryTeamId, idx, { endQuestion: e.target.value })
                                          }
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        >
                                          <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                                          {dateQuestions.map(question => (
                                            <option key={question.id} value={question.id}>
                                              {resolveLocalizedText(question.question, editingLanguage) || question.id}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.minWeeksShortLabel')}</label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          value={timingConstraint.minimumWeeks ?? ''}
                                          onChange={(e) => {
                                            const rawValue = e.target.value;
                                            updateTeamQuestionTiming(primaryTeamId, idx, {
                                              minimumWeeks: rawValue === '' ? undefined : Number(rawValue)
                                            });
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                          placeholder={t('backOffice.ruleEditor.minWeeksShortPlaceholder')}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.minDaysLabel')}</label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={timingConstraint.minimumDays ?? ''}
                                          onChange={(e) => {
                                            const rawValue = e.target.value;
                                            updateTeamQuestionTiming(primaryTeamId, idx, {
                                              minimumDays: rawValue === '' ? undefined : Number(rawValue)
                                            });
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                          placeholder={t('backOffice.ruleEditor.minDaysPlaceholder')}
                                        />
                                      </div>
                                    </div>

                                    <p className="text-[11px] text-gray-500">{t('backOffice.ruleEditor.questionDelayHint')}</p>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">{t('backOffice.ruleEditor.noQuestionsDefined')}</p>
                    )}
                  </div>
              </div>
            )}
          </div>

          {/* Risques */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                {t('backOffice.ruleEditor.risksHeading')}
              </h3>
              <button
                onClick={addRisk}
                className="flex items-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('backOffice.ruleEditor.addRisk')}
              </button>
            </div>

            {editedRule.risks.length === 0 ? (
              <div className="text-sm text-gray-500 italic">{t('backOffice.ruleEditor.noRisksDefined')}</div>
            ) : (
              <div className="space-y-3">
                {editedRule.risks.map((risk, idx) => {
                  const timingConstraint = sanitizeRiskTimingConstraint(risk.timingConstraint);
                  const hasDateQuestions = dateQuestions.length >= 2;
                  const toggleDisabled = !hasDateQuestions && !timingConstraint.enabled;
                  const isToggleChecked = Boolean(timingConstraint.enabled);

                  return (
                    <div key={idx} className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center mb-3">
                        <span className="text-sm font-semibold text-gray-700">{t('backOffice.ruleEditor.riskLabel', { number: idx + 1 })}</span>
                        <button
                          onClick={() => deleteRisk(idx)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-all ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.riskDescriptionLabel')}</label>
                          <input
                            type="text"
                            value={getLocalizedRaw(risk.description, editingLanguage)}
                            onChange={(e) => updateRisk(idx, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder={t('backOffice.ruleEditor.riskDescriptionPlaceholder')}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.referentTeamLabel')}</label>
                          <input
                            type="text"
                            value={primaryTeamLabel || t('backOffice.ruleEditor.noTeamSelected')}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-600"
                            readOnly
                          />
                          {!primaryTeamId && (
                            <p className="text-xs text-gray-500 mt-1 italic">{t('backOffice.ruleEditor.selectTeamHint')}</p>
                          )}
                        </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.riskLevelLabel')}</label>
                        <select
                          value={risk.level}
                          onChange={(e) => updateRisk(idx, 'level', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="low">{t('backOffice.ruleEditor.riskLevelLow')}</option>
                          <option value="medium">{t('backOffice.ruleEditor.riskLevelMedium')}</option>
                          <option value="high">{t('backOffice.ruleEditor.riskLevelHigh')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.riskPriorityLabel')}</label>
                        <select
                          value={risk.priority}
                          onChange={(e) => updateRisk(idx, 'priority', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          {RISK_PRIORITY_OPTIONS.map(option => (
                            <option key={option} value={option}>
                              {t(`backOffice.ruleEditor.${RISK_PRIORITY_LABEL_KEYS[option]}`)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.mitigationLabel')}</label>
                        <textarea
                          value={getLocalizedRaw(risk.mitigation, editingLanguage)}
                          onChange={(e) => updateRisk(idx, 'mitigation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          rows="2"
                          placeholder={t('backOffice.ruleEditor.mitigationPlaceholder')}
                        />
                      </div>

                      <div className="border-t border-red-100 pt-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium text-gray-600">{t('backOffice.ruleEditor.linkToMinDelay')}</p>
                            <p className="text-xs text-gray-500 leading-snug">{t('backOffice.ruleEditor.linkToMinDelayHint')}</p>
                          </div>
                          <label className={`inline-flex items-center gap-2 text-xs font-medium ${toggleDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-red-500 focus:ring-red-400"
                              checked={isToggleChecked}
                              onChange={(event) => updateRiskTimingConstraint(idx, { enabled: event.target.checked })}
                              disabled={toggleDisabled}
                            />
                            <span>{isToggleChecked ? t('backOffice.ruleEditor.enabledLabel') : t('backOffice.ruleEditor.disabledLabel')}</span>
                          </label>
                        </div>

                        {!hasDateQuestions ? (
                          <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {t('backOffice.ruleEditor.needTwoDateQuestionsForDelay')}
                          </p>
                        ) : isToggleChecked ? (
                          <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.startDateLabel')}</label>
                                <select
                                  value={timingConstraint.startQuestion}
                                  onChange={(e) => updateRiskTimingConstraint(idx, { startQuestion: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                                  {dateQuestions.map(question => (
                                    <option key={question.id} value={question.id}>
                                      {resolveLocalizedText(question.question, editingLanguage) || question.id}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.constraintEndDateLabel')}</label>
                                <select
                                  value={timingConstraint.endQuestion}
                                  onChange={(e) => updateRiskTimingConstraint(idx, { endQuestion: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                                  {dateQuestions.map(question => (
                                    <option key={question.id} value={question.id}>
                                      {resolveLocalizedText(question.question, editingLanguage) || question.id}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.minWeeksShortLabel')}</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={timingConstraint.minimumWeeks ?? ''}
                                  onChange={(e) => {
                                    const rawValue = e.target.value;
                                    updateRiskTimingConstraint(idx, { minimumWeeks: rawValue === '' ? undefined : Number(rawValue) });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                  placeholder={t('backOffice.ruleEditor.minWeeksShortPlaceholder')}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.minDaysLabel')}</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={timingConstraint.minimumDays ?? ''}
                                  onChange={(e) => {
                                    const rawValue = e.target.value;
                                    updateRiskTimingConstraint(idx, { minimumDays: rawValue === '' ? undefined : Number(rawValue) });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                  placeholder={t('backOffice.ruleEditor.minDaysPlaceholder')}
                                />
                              </div>
                            </div>

                            <p className="text-[11px] text-gray-500">{t('backOffice.ruleEditor.riskDelayHint')}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {isRoutingModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-gray-900/50" onClick={closeRoutingModal} aria-hidden="true" />
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{t('backOffice.ruleEditor.routingModalTitle')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('backOffice.ruleEditor.routingModalDescription', {
                    team: primaryTeamLabel ? `"${primaryTeamLabel}"` : t('backOffice.ruleEditor.primaryTeamFallback')
                  })}
                </p>
              </div>
              <button type="button" onClick={closeRoutingModal} className="text-sm font-semibold text-gray-500 hover:text-gray-700">{t('backOffice.ruleEditor.close')}</button>
            </div>

            <div className="mt-6 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">{t('backOffice.ruleEditor.groupsHeading')}</h4>
                <button
                  type="button"
                  onClick={() => updateRoutingModalGroups(groups => ([...groups, { logic: 'all', conditions: [createEmptyQuestionCondition()] }]))}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  <Plus className="h-4 w-4" />
                  {t('backOffice.ruleEditor.addGroup')}
                </button>
              </div>

              {routingConditionGroups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                  {t('backOffice.ruleEditor.noGroupsDefined')}
                </div>
              ) : (
                routingConditionGroups.map((group, groupIdx) => (
                  <div key={`routing-group-${groupIdx}`} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">{t('backOffice.ruleEditor.groupLabel', { number: groupIdx + 1 })}</div>
                      <div className="flex items-center gap-2">
                        <select
                          value={group.logic === 'any' ? 'any' : 'all'}
                          onChange={(e) => updateRoutingModalGroups(groups => {
                            const updated = [...groups];
                            const target = updated[groupIdx] || { logic: 'all', conditions: [] };
                            updated[groupIdx] = { ...target, logic: e.target.value === 'any' ? 'any' : 'all' };
                            return updated;
                          })}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                        >
                          <option value="all">{t('backOffice.ruleEditor.logicAllOption')}</option>
                          <option value="any">{t('backOffice.ruleEditor.logicAnyOption')}</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => updateRoutingModalGroups(groups => groups.filter((_, idx) => idx !== groupIdx))}
                          className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          {t('backOffice.ruleEditor.remove')}
                        </button>
                      </div>
                    </div>

                    {(Array.isArray(group.conditions) ? group.conditions : []).map((condition, idx) => {
                      const selectedQuestion = conditionQuestionEntries.find((q) => q.id === condition.question);
                      const selectedType = selectedQuestion?.type || 'choice';
                      const usesOptions = selectedType === 'choice' || selectedType === 'multi_choice';
                      const operatorOptions = getOperatorOptionsForType(selectedType);

                      return (
                        <div key={`routing-condition-${groupIdx}-${idx}`} className="rounded-lg border border-indigo-100 bg-white p-3 space-y-2">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => updateRoutingModalGroups(groups => {
                                const updated = [...groups];
                                const target = updated[groupIdx] || { logic: 'all', conditions: [] };
                                const conditions = Array.isArray(target.conditions)
                                  ? target.conditions.filter((_, cIdx) => cIdx !== idx)
                                  : [];
                                updated[groupIdx] = { ...target, conditions };
                                return updated;
                              })}
                              className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {t('backOffice.ruleEditor.removeCondition')}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.questionLabel')}</label>
                              <select
                                value={condition.question}
                                onChange={(e) => updateRoutingModalGroups(groups => withUpdatedCondition(groups, groupIdx, idx, c => ({ ...c, question: e.target.value })))}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              >
                                <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                                {conditionQuestionEntries.map((q) => (<option key={q.id} value={q.id}>{resolveLocalizedText(q.question, editingLanguage) || q.id}</option>))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.operatorLabel')}</label>
                              <select
                                value={ensureOperatorForType(selectedType, condition.operator)}
                                onChange={(e) => updateRoutingModalGroups(groups => withUpdatedCondition(groups, groupIdx, idx, c => ({ ...c, operator: e.target.value })))}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              >
                                {operatorOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{t('backOffice.ruleEditor.valueLabel')}</label>
                              {selectedType === 'boolean' ? (
                                <select
                                  value={condition.value}
                                  onChange={(e) => updateRoutingModalGroups(groups => withUpdatedCondition(groups, groupIdx, idx, c => ({ ...c, value: e.target.value })))}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                >
                                  <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                                  <option value="true">{t('backOffice.ruleEditor.checkedOption')}</option><option value="false">{t('backOffice.ruleEditor.uncheckedOption')}</option>
                                </select>
                              ) : usesOptions ? (
                                <select
                                  value={condition.value}
                                  onChange={(e) => updateRoutingModalGroups(groups => withUpdatedCondition(groups, groupIdx, idx, c => ({ ...c, value: e.target.value })))}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                >
                                  <option value="">{t('backOffice.ruleEditor.selectPlaceholder')}</option>
                                  {getQuestionOptionEntries(selectedQuestion, { language: editingLanguage }).map((entry, optIdx) => (
                                    <option key={optIdx} value={entry.value}>{entry.label}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={selectedType === 'number' ? 'number' : 'text'}
                                  value={condition.value}
                                  onChange={(e) => updateRoutingModalGroups(groups => withUpdatedCondition(groups, groupIdx, idx, c => ({ ...c, value: e.target.value })))}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  placeholder={selectedType === 'date' ? t('backOffice.ruleEditor.datePlaceholder') : t('backOffice.ruleEditor.valuePlaceholderGeneric')}
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
                        onClick={() => updateRoutingModalGroups(groups => {
                          const updated = [...groups];
                          const target = updated[groupIdx] || { logic: 'all', conditions: [] };
                          const conditions = Array.isArray(target.conditions) ? [...target.conditions] : [];
                          conditions.push(createEmptyQuestionCondition());
                          updated[groupIdx] = { ...target, conditions };
                          return updated;
                        })}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        <Plus className="h-4 w-4" />
                        {t('backOffice.ruleEditor.addCondition')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeRoutingModal} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t('backOffice.ruleEditor.cancel')}</button>
              <button type="button" onClick={saveRoutingModal} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">{t('backOffice.ruleEditor.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
