import React, { Suspense, useEffect, useMemo, useState } from '../react.js';
import { getLocalizedRaw, resolveLocalizedText, setLocalizedText } from '../utils/localizedContent.js';
import { SHOWCASE_SECTION_IDS } from '../utils/showcaseEditor.js';
import {
  SHOWCASE_BUILTIN_LABEL_KEYS,
  SHOWCASE_BUILTIN_OPTIONAL_PARTS,
  SHOWCASE_SLOT_STATES,
  SHOWCASE_TEMPLATE_BLOCK_TYPES,
  SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID,
  SHOWCASE_TEMPLATE_SOURCE_FIELDS,
  buildShowcaseTemplatePreviewAnswers,
  buildSlotPlaceholder,
  convertBuiltInToBlock,
  createShowcaseTemplate,
  createShowcaseTemplateBlock,
  extractSlotPlaceholders,
  getBlockSlotDefinitions,
  getBuiltInBlockPreset,
  hasSectionDisplayCondition,
  hasShowcaseTemplateActivation,
  isQuestionCompatibleWithSourceKind,
  normalizeBlockSlots,
  normalizeShowcaseTemplates
} from '../utils/showcaseTemplates.js';
import { ACTIVITY_SCOPE_QUESTION_ID } from '../utils/questions.js';
import { DICTIONARIES } from '../i18n/dictionaries/index.js';
import { demoProjectAnswersSnapshot } from '../data/demoProject.js';
import { showcaseTemplatePreviewAnswers } from '../data/showcaseTemplates.js';
import { loadShowcaseStyles } from '../styles/loadShowcaseStyles.js';
import { LazyProjectShowcase, LoadingFallback } from '../lazyComponents.jsx';
import { ConditionGroupsEditor } from './ConditionGroupsEditor.jsx';
import { LanguageEditSwitcher } from './LocalizedFieldEditor.jsx';
import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from './icons.js';

const BLOCK_TYPE_LABEL_KEYS = {
  highlight: 'highlight',
  figure: 'figure',
  columns: 'columns',
  'document-viewer': 'documentViewer',
  'media-gallery': 'mediaGallery',
  story: 'story',
  checklist: 'checklist',
  stack: 'stack',
  cover: 'cover',
  steps: 'steps',
  team: 'team',
  quote: 'quote'
};

// Un libellé de l'application dans les 4 langues : un bloc issu d'une section intégrée
// garde ses titres dans toutes les langues, pas seulement dans celle de l'administrateur.
const translateInAllLanguages = (key) => Object.entries(DICTIONARIES).reduce((accumulator, [language, dictionary]) => {
  const value = key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), dictionary);
  if (typeof value === 'string') {
    accumulator[language] = value;
  }
  return accumulator;
}, {});

// Titres par défaut des sections intégrées, montrés en exemple dans les champs de titre : le
// modèle ne les remplace que s'il en saisit un.
const BUILTIN_LABEL_DEFAULT_KEYS = {
  hero: { eyebrow: 'projectShowcase.heroEyebrow' },
  problem: { eyebrow: 'projectShowcase.sectionOptions.problem', headline: 'projectShowcase.problemHeadline' },
  solution: { eyebrow: 'projectShowcase.solutionEyebrow', headline: 'projectShowcase.solutionHeadline' },
  benefits: { eyebrow: 'projectShowcase.solutionBenefitsEyebrow', headline: 'projectShowcase.solutionBenefitsHeadline' },
  objectives: { eyebrow: 'projectShowcase.sectionOptions.objectives', headline: 'projectShowcase.objectivesHeadline' },
  indicators: { eyebrow: 'projectShowcase.valueIndicatorsEyebrow', headline: 'projectShowcase.valueIndicatorsHeadline' },
  team: { eyebrow: 'projectShowcase.sectionOptions.team', headline: 'projectShowcase.teamHeadline' },
  timeline: { eyebrow: 'projectShowcase.sectionOptions.timeline', headline: 'projectShowcase.roadmapHeadline' }
};

// Ce qu'une vitrine d'aperçu ne doit pas recevoir du projet de démonstration : sa propre
// structure (le modèle n'y tiendrait plus lieu de rien) et ses échanges compliance.
const PREVIEW_EXCLUDED_ANSWER_KEYS = [
  'customShowcaseSections',
  'showcaseSectionOrder',
  'showcaseSectionAccents',
  '__compliance_team_comments__'
];

const moveItem = (items, index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= items.length) {
    return items;
  }
  const next = items.slice();
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
};

const fieldLabelClassName = 'block text-xs font-semibold uppercase tracking-wide text-gray-600';
const inputClassName = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';

// Un emplacement d'un bloc : d'où vient son contenu (texte saisi ici, éventuellement composé
// de réponses, ou réponse à une question) et ce que le porteur peut en faire.
const SlotEditor = ({ idPrefix, definition, slot, onChange, slotQuestions, questionLabel, editingLanguage, language, t }) => {
  const isHidden = slot.state === 'hidden';
  const isQuestion = slot.source === 'question';
  const rawText = getLocalizedRaw(slot.text, editingLanguage);
  const isList = definition.kind === 'list';
  const isLongText = isList || definition.id === 'description';
  const isComposed = !isQuestion && extractSlotPlaceholders(resolveLocalizedText(slot.text, language)).length > 0;
  const hintKey = isHidden
    ? 'hidden'
    : isQuestion
      ? (slot.state === 'locked' ? 'lockedQuestion' : 'question')
      : isComposed
        ? 'composed'
        : (slot.state === 'locked' ? 'lockedText' : 'ownerText');
  const stateId = `${idPrefix}-state`;
  const sourceId = `${idPrefix}-source`;
  const textId = `${idPrefix}-text`;
  const insertId = `${idPrefix}-insert`;

  const handleSourceChange = (value) => {
    if (value === '') {
      onChange({ ...slot, source: 'text', questionId: undefined });
      return;
    }
    onChange({ ...slot, source: 'question', questionId: value });
  };

  const handleInsert = (questionId) => {
    if (!questionId) {
      return;
    }
    const separator = rawText === '' || /\s$/.test(rawText) ? '' : ' ';
    onChange({
      ...slot,
      text: setLocalizedText(slot.text, editingLanguage, `${rawText}${separator}${buildSlotPlaceholder(questionId)}`)
    });
  };

  return (
    <div
      className={`rounded-lg border p-3 ${isHidden ? 'border-dashed border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'}`}
      data-testid="showcase-template-slot"
      data-slot-id={definition.id}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <p className="text-sm font-semibold text-gray-800 md:pt-6">
          {t(`backOffice.showcaseTemplates.slotLabels.${definition.labelKey || definition.id}`)}
        </p>
        <div>
          <label htmlFor={stateId} className={fieldLabelClassName}>{t('backOffice.showcaseTemplates.slotStateLabel')}</label>
          <select
            id={stateId}
            value={slot.state}
            onChange={(event) => onChange({ ...slot, state: event.target.value })}
            className={inputClassName}
          >
            {SHOWCASE_SLOT_STATES.map((state) => (
              <option key={state} value={state}>{t(`backOffice.showcaseTemplates.slotStates.${state}`)}</option>
            ))}
          </select>
        </div>
        {!isHidden && (
          <div>
            <label htmlFor={sourceId} className={fieldLabelClassName}>{t('backOffice.showcaseTemplates.slotSourceLabel')}</label>
            <select
              id={sourceId}
              value={isQuestion ? slot.questionId : ''}
              onChange={(event) => handleSourceChange(event.target.value)}
              className={inputClassName}
            >
              <option value="">{t('backOffice.showcaseTemplates.slotSourceText')}</option>
              <optgroup label={t('backOffice.showcaseTemplates.slotQuestionGroup')}>
                {isQuestion && !slotQuestions.some((question) => question.id === slot.questionId) && (
                  <option value={slot.questionId}>{slot.questionId}</option>
                )}
                {slotQuestions.map((question) => (
                  <option key={question.id} value={question.id}>{questionLabel(question)}</option>
                ))}
              </optgroup>
            </select>
          </div>
        )}
      </div>
      {!isHidden && !isQuestion && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label htmlFor={textId} className={fieldLabelClassName}>
              {t(isList ? 'backOffice.showcaseTemplates.slotTextListLabel' : 'backOffice.showcaseTemplates.slotTextLabel')}
            </label>
            {isLongText ? (
              <textarea
                id={textId}
                rows={isList ? 3 : 2}
                value={rawText}
                onChange={(event) => onChange({ ...slot, text: setLocalizedText(slot.text, editingLanguage, event.target.value) })}
                className={inputClassName}
              />
            ) : (
              <input
                id={textId}
                type="text"
                value={rawText}
                onChange={(event) => onChange({ ...slot, text: setLocalizedText(slot.text, editingLanguage, event.target.value) })}
                className={inputClassName}
              />
            )}
          </div>
          <div>
            <label htmlFor={insertId} className={fieldLabelClassName}>{t('backOffice.showcaseTemplates.slotInsertLabel')}</label>
            <select
              id={insertId}
              value=""
              onChange={(event) => handleInsert(event.target.value)}
              className={inputClassName}
            >
              <option value="">{t('backOffice.showcaseTemplates.slotInsertPlaceholder')}</option>
              {slotQuestions.map((question) => (
                <option key={question.id} value={question.id}>{questionLabel(question)}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-500">{t(`backOffice.showcaseTemplates.slotHints.${hintKey}`)}</p>
    </div>
  );
};

// Une section intégrée : les éléments qu'elle affiche et ses titres. Ce qui reste fixe
// (le nom du projet dans le hero, le texte d'une section à un seul champ) n'y figure pas.
const BuiltInOptionsEditor = ({ templateId, entry, onChange, editingLanguage, t }) => {
  const parts = SHOWCASE_BUILTIN_OPTIONAL_PARTS[entry.id] || [];
  const labelKeys = SHOWCASE_BUILTIN_LABEL_KEYS[entry.id] || [];
  const hiddenParts = Array.isArray(entry.hiddenParts) ? entry.hiddenParts : [];
  if (parts.length === 0 && labelKeys.length === 0) {
    return null;
  }

  const togglePart = (part, isShown) => {
    const next = isShown ? hiddenParts.filter((candidate) => candidate !== part) : [...hiddenParts, part];
    onChange({ ...entry, hiddenParts: next });
  };

  const updateLabel = (key, value) => {
    onChange({
      ...entry,
      labels: { ...(entry.labels || {}), [key]: setLocalizedText(entry.labels?.[key], editingLanguage, value) }
    });
  };

  return (
    <div className="mt-3 space-y-3" data-testid="showcase-template-builtin-options">
      {parts.length > 0 && (
        <fieldset className="space-y-2">
          <legend className={fieldLabelClassName}>{t('backOffice.showcaseTemplates.partsTitle')}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {parts.map((part) => {
              const checkboxId = `${templateId}-${entry.id}-part-${part}`;
              return (
                <label key={part} htmlFor={checkboxId} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={!hiddenParts.includes(part)}
                    onChange={(event) => togglePart(part, event.target.checked)}
                  />
                  {t(`backOffice.showcaseTemplates.parts.${part}`)}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">{t('backOffice.showcaseTemplates.partsHint')}</p>
        </fieldset>
      )}
      {labelKeys.length > 0 && (
        <div className="space-y-2">
          <div className="grid gap-3 md:grid-cols-2">
            {labelKeys.map((key) => {
              const inputId = `${templateId}-${entry.id}-label-${key}`;
              const defaultKey = BUILTIN_LABEL_DEFAULT_KEYS[entry.id]?.[key];
              return (
                <div key={key}>
                  <label htmlFor={inputId} className={fieldLabelClassName}>
                    {t(`backOffice.showcaseTemplates.labelKeys.${key}`)}
                  </label>
                  <input
                    id={inputId}
                    type="text"
                    value={getLocalizedRaw(entry.labels?.[key], editingLanguage)}
                    onChange={(event) => updateLabel(key, event.target.value)}
                    placeholder={defaultKey ? t(defaultKey) : ''}
                    className={inputClassName}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">{t('backOffice.showcaseTemplates.labelsHint')}</p>
        </div>
      )}
    </div>
  );
};

// Condition d'affichage d'une section : repliée tant qu'il n'y en a pas, pour que la liste
// des sections reste lisible.
const DisplayConditionEditor = ({ idPrefix, entry, onChange, questions, language, t }) => {
  const groups = entry.displayCondition?.conditionGroups || [];
  const isActive = hasSectionDisplayCondition(entry);
  return (
    <details
      className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
      data-testid="showcase-template-display-condition"
      open={groups.length > 0 || undefined}
    >
      <summary className="cursor-pointer text-sm font-medium text-gray-800">
        {t('backOffice.showcaseTemplates.displayConditionTitle')}
        {' — '}
        <span className={isActive ? 'text-blue-700' : 'text-gray-500'}>
          {t(isActive
            ? 'backOffice.showcaseTemplates.displayConditionActive'
            : 'backOffice.showcaseTemplates.displayConditionNone')}
        </span>
      </summary>
      <div className="mt-2 space-y-2">
        <p className="text-xs text-gray-600">{t('backOffice.showcaseTemplates.displayConditionHint')}</p>
        <ConditionGroupsEditor
          idPrefix={idPrefix}
          groups={groups}
          onChange={(conditionGroups) => onChange({ ...entry, displayCondition: { conditionGroups } })}
          questions={questions}
          language={language}
          excludedQuestionIds={[ACTIVITY_SCOPE_QUESTION_ID]}
          emptyStateText={t('backOffice.showcaseTemplates.displayConditionEmpty')}
        />
        {groups.length > 0 && !isActive && (
          <p className="text-xs text-amber-700">{t('backOffice.showcaseTemplates.displayConditionIncomplete')}</p>
        )}
      </div>
    </details>
  );
};

// La vraie vitrine, sur des réponses fictives : un modèle se juge à ce qu'il produit, pas à
// sa liste de réglages. Le modèle s'applique quelles que soient ses conditions.
const ShowcaseTemplatePreview = ({ template, questions, showcaseThemes, language, onClose, t }) => {
  const answers = useMemo(() => {
    const base = { ...demoProjectAnswersSnapshot };
    PREVIEW_EXCLUDED_ANSWER_KEYS.forEach((key) => {
      delete base[key];
    });
    return buildShowcaseTemplatePreviewAnswers(
      template,
      questions,
      { ...base, ...(showcaseTemplatePreviewAnswers[template.id] || {}) },
      language
    );
  }, [language, questions, template]);
  const templateName = resolveLocalizedText(template.name, language) || t('backOffice.showcaseTemplates.untitled');

  useEffect(() => {
    loadShowcaseStyles().catch((error) => {
      console.error('Feuilles de style de la vitrine indisponibles :', error);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-900/70"
      role="dialog"
      aria-modal="true"
      aria-label={t('backOffice.showcaseTemplates.previewTitle', { name: templateName })}
      data-testid="showcase-template-preview"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 shadow">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {t('backOffice.showcaseTemplates.previewTitle', { name: templateName })}
          </p>
          <p className="text-xs text-gray-500">{t('backOffice.showcaseTemplates.previewHint')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          {t('backOffice.showcaseTemplates.previewClose')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-white">
        <Suspense fallback={<LoadingFallback label={t('backOffice.showcaseTemplates.previewLoading')} />}>
          <LazyProjectShowcase
            projectName={answers.projectName}
            onClose={onClose}
            questions={questions}
            answers={answers}
            relevantTeams={[]}
            showcaseThemes={showcaseThemes}
            forcedShowcaseTemplate={template}
            renderInStandalone
            hideEditBar
            hideNotice
            canConfigureDisplayModes={false}
          />
        </Suspense>
      </div>
    </div>
  );
};

// Éditeur des modèles de vitrine (référentiel showcase-templates.json). Un modèle s'applique
// aux projets qui remplissent ses conditions, saisies avec le même panneau que les règles ;
// le premier modèle de la liste qui convient l'emporte, d'où les flèches de réordonnancement.
export const BackOfficeShowcaseTemplates = ({
  templates,
  setTemplates,
  questions,
  showcaseThemes,
  language,
  publishControl,
  t
}) => {
  const [editingLanguage, setEditingLanguage] = useState(language);
  const [previewTemplateId, setPreviewTemplateId] = useState(null);
  const normalizedTemplates = useMemo(() => normalizeShowcaseTemplates(templates), [templates]);
  const conditionQuestions = Array.isArray(questions) ? questions : [];
  const questionLabel = (question) => {
    const label = resolveLocalizedText(question.question, language);
    const type = t(`backOffice.showcaseTemplates.questionTypes.${question.type || 'text'}`);
    return label ? `${label} (${question.id} · ${type})` : `${question.id} · ${type}`;
  };
  const questionsForKind = (kind) => conditionQuestions.filter(
    (question) => question.id !== ACTIVITY_SCOPE_QUESTION_ID && isQuestionCompatibleWithSourceKind(question, kind)
  );
  const slotQuestions = questionsForKind('slot');
  const previewTemplate = previewTemplateId
    ? normalizedTemplates.find((template) => template.id === previewTemplateId) || null
    : null;

  const updateTemplate = (templateId, updater) => {
    setTemplates((previous) => normalizeShowcaseTemplates(previous).map((template) => (
      template.id === templateId ? updater(template) : template
    )));
  };

  const updateSections = (templateId, updater) => {
    updateTemplate(templateId, (template) => ({ ...template, sections: updater(template.sections) }));
  };

  const updateEntry = (templateId, kind, entryId, updater) => {
    updateSections(templateId, (sections) => sections.map((entry) => (
      entry.kind === kind && entry.id === entryId ? updater(entry) : entry
    )));
  };

  const updateFieldSource = (templateId, sectionId, fieldId, questionId) => {
    updateEntry(templateId, 'builtin', sectionId, (entry) => ({
      ...entry,
      fieldSources: { ...(entry.fieldSources || {}), [fieldId]: questionId }
    }));
  };

  // Changer de gabarit garde les emplacements que les deux partagent (titre, texte…).
  const updateBlockType = (templateId, blockId, type) => {
    updateEntry(templateId, 'block', blockId, (entry) => ({
      ...entry,
      type,
      slots: normalizeBlockSlots(type, entry.slots)
    }));
  };

  const updateSlot = (templateId, blockId, slotId, slot) => {
    updateEntry(templateId, 'block', blockId, (entry) => ({
      ...entry,
      slots: { ...entry.slots, [slotId]: slot }
    }));
  };

  // Une section intégrée devient le bloc équivalent du catalogue, à la même place : ses
  // emplacements se règlent alors un par un.
  const convertToBlock = (templateId, sectionId) => {
    updateSections(templateId, (sections) => {
      const blockIds = sections.filter((entry) => entry.kind === 'block').map((entry) => entry.id);
      return sections.map((entry) => {
        if (entry.kind !== 'builtin' || entry.id !== sectionId) {
          return entry;
        }
        return convertBuiltInToBlock(entry, blockIds, translateInAllLanguages) || entry;
      });
    });
  };

  const handleAddTemplate = () => {
    setTemplates((previous) => {
      const current = normalizeShowcaseTemplates(previous);
      return [...current, createShowcaseTemplate(current)];
    });
  };

  const handleDeleteTemplate = (templateId) => {
    setTemplates((previous) => normalizeShowcaseTemplates(previous).filter((template) => template.id !== templateId));
  };

  const handleMoveTemplate = (index, delta) => {
    setTemplates((previous) => moveItem(normalizeShowcaseTemplates(previous), index, delta));
  };

  return (
    <>
      <div className="space-y-6">
        <article className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">{t('backOffice.showcaseTemplates.title')}</h2>
              <p className="text-sm text-gray-600">{t('backOffice.showcaseTemplates.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={handleAddTemplate}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              {t('backOffice.showcaseTemplates.addButton')}
            </button>
          </div>

          {publishControl}

          <LanguageEditSwitcher
            editingLanguage={editingLanguage}
            onChange={setEditingLanguage}
            label={t('backOffice.showcaseTemplates.editingLanguageLabel')}
            hint={t('backOffice.showcaseTemplates.editingLanguageHint')}
          />

          {normalizedTemplates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
              {t('backOffice.showcaseTemplates.empty')}
            </div>
          ) : (
            <div className="space-y-4">
              {normalizedTemplates.map((template, templateIndex) => {
                const usedBuiltIns = new Set(
                  template.sections.filter((entry) => entry.kind === 'builtin').map((entry) => entry.id)
                );
                const availableBuiltIns = SHOWCASE_SECTION_IDS.filter((id) => !usedBuiltIns.has(id));
                const nameId = `${template.id}-name`;
                const addBuiltInId = `${template.id}-add-builtin`;

                return (
                  <article
                    key={template.id}
                    className="space-y-5 rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm"
                    data-testid="showcase-template-card"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-end">
                      <div className="flex-1">
                        <label htmlFor={nameId} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                          {t('backOffice.showcaseTemplates.nameLabel')}
                        </label>
                        <input
                          id={nameId}
                          type="text"
                          value={getLocalizedRaw(template.name, editingLanguage)}
                          onChange={(event) => updateTemplate(template.id, (current) => ({
                            ...current,
                            name: setLocalizedText(current.name, editingLanguage, event.target.value)
                          }))}
                          placeholder={t('backOffice.showcaseTemplates.namePlaceholder')}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewTemplateId(template.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                        {t('backOffice.showcaseTemplates.previewButton')}
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleMoveTemplate(templateIndex, -1)}
                          disabled={templateIndex === 0}
                          aria-label={t('backOffice.showcaseTemplates.moveTemplateUp')}
                          title={t('backOffice.showcaseTemplates.moveTemplateUp')}
                          className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveTemplate(templateIndex, 1)}
                          disabled={templateIndex === normalizedTemplates.length - 1}
                          aria-label={t('backOffice.showcaseTemplates.moveTemplateDown')}
                          title={t('backOffice.showcaseTemplates.moveTemplateDown')}
                          className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('backOffice.showcaseTemplates.deleteButton')}
                      </button>
                    </div>

                    <fieldset className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
                      <legend className="px-1 text-sm font-semibold text-gray-800">
                        {t('backOffice.showcaseTemplates.activationTitle')}
                      </legend>
                      <p className="text-xs text-gray-600">{t('backOffice.showcaseTemplates.activationHint')}</p>
                      <ConditionGroupsEditor
                        idPrefix={`showcase-template-${template.id}`}
                        groups={template.activation.conditionGroups}
                        onChange={(conditionGroups) => updateTemplate(template.id, (current) => ({
                          ...current,
                          activation: { conditionGroups }
                        }))}
                        questions={conditionQuestions}
                        language={language}
                        excludedQuestionIds={[ACTIVITY_SCOPE_QUESTION_ID]}
                        emptyStateText={t('backOffice.showcaseTemplates.activationEmptyHint')}
                      />
                      {template.activation.conditionGroups.length > 0 && !hasShowcaseTemplateActivation(template) && (
                        <p className="text-xs text-amber-700">{t('backOffice.showcaseTemplates.activationIncompleteHint')}</p>
                      )}
                    </fieldset>

                    <fieldset className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
                      <legend className="px-1 text-sm font-semibold text-gray-800">
                        {t('backOffice.showcaseTemplates.sectionsTitle')}
                      </legend>
                      <p className="text-xs text-gray-600">{t('backOffice.showcaseTemplates.sectionsHint')}</p>
                      <ol className="space-y-2">
                        {template.sections.map((entry, index) => {
                          const isLocked = entry.kind === 'builtin' && entry.id === SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID;
                          const rowKey = `${entry.kind}-${entry.id}`;
                          const blockTitle = entry.kind === 'block'
                            ? resolveLocalizedText(entry.slots?.title?.text, editingLanguage)
                            : '';
                          return (
                            <li
                              key={rowKey}
                              className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                              data-testid="showcase-template-section"
                              data-section-kind={entry.kind}
                              data-section-id={entry.id}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    entry.kind === 'builtin' ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {entry.kind === 'builtin'
                                    ? t('backOffice.showcaseTemplates.builtInBadge')
                                    : t('backOffice.showcaseTemplates.blockBadge')}
                                </span>
                                <span className="flex-1 text-sm font-medium text-gray-800">
                                  {entry.kind === 'builtin'
                                    ? t(`projectShowcase.sectionOptions.${entry.id}`)
                                    : blockTitle || t(`projectShowcase.templates.${BLOCK_TYPE_LABEL_KEYS[entry.type]}.name`)}
                                </span>
                                {isLocked && (
                                  <span className="text-xs text-gray-500">{t('backOffice.showcaseTemplates.noticeLocked')}</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => updateSections(template.id, (sections) => moveItem(sections, index, -1))}
                                  disabled={index === 0}
                                  aria-label={t('backOffice.showcaseTemplates.moveUp')}
                                  title={t('backOffice.showcaseTemplates.moveUp')}
                                  className="rounded-md border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSections(template.id, (sections) => moveItem(sections, index, 1))}
                                  disabled={index === template.sections.length - 1}
                                  aria-label={t('backOffice.showcaseTemplates.moveDown')}
                                  title={t('backOffice.showcaseTemplates.moveDown')}
                                  className="rounded-md border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                {!isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => updateSections(template.id, (sections) => sections.filter((_, position) => position !== index))}
                                    aria-label={t('backOffice.showcaseTemplates.remove')}
                                    title={t('backOffice.showcaseTemplates.remove')}
                                    className="rounded-md border border-red-200 bg-white p-1 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {entry.kind === 'builtin' && getBuiltInBlockPreset(entry.id) && (
                                <div className="mt-3 flex flex-col gap-2 rounded-lg border border-dashed border-blue-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="text-xs text-gray-600">
                                    {t('backOffice.showcaseTemplates.convertHint', {
                                      layout: t(`projectShowcase.templates.${BLOCK_TYPE_LABEL_KEYS[getBuiltInBlockPreset(entry.id).type]}.name`)
                                    })}
                                    {getBuiltInBlockPreset(entry.id).lost.length > 0 && (
                                      <>
                                        {' '}
                                        {t('backOffice.showcaseTemplates.convertLost', {
                                          parts: getBuiltInBlockPreset(entry.id).lost
                                            .map((part) => t(`backOffice.showcaseTemplates.parts.${part}`))
                                            .join(', ')
                                        })}
                                      </>
                                    )}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => convertToBlock(template.id, entry.id)}
                                    className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                  >
                                    {t('backOffice.showcaseTemplates.convertButton')}
                                  </button>
                                </div>
                              )}
                              {entry.kind === 'builtin' && (
                                <BuiltInOptionsEditor
                                  templateId={template.id}
                                  entry={entry}
                                  onChange={(nextEntry) => updateEntry(template.id, 'builtin', entry.id, () => nextEntry)}
                                  editingLanguage={editingLanguage}
                                  t={t}
                                />
                              )}
                              {entry.kind === 'builtin' && SHOWCASE_TEMPLATE_SOURCE_FIELDS[entry.id] && (
                                <div className="mt-3 space-y-2" data-testid="showcase-template-field-sources">
                                  <p className="text-xs text-gray-600">{t('backOffice.showcaseTemplates.fieldSourcesHint')}</p>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    {SHOWCASE_TEMPLATE_SOURCE_FIELDS[entry.id].map((field) => {
                                      const selectId = `${template.id}-${entry.id}-${field.id}-source`;
                                      return (
                                        <div key={field.id}>
                                          <label htmlFor={selectId} className={fieldLabelClassName}>
                                            {t(`projectShowcase.fieldFallbackLabels.${field.id}`)}
                                          </label>
                                          <select
                                            id={selectId}
                                            value={entry.fieldSources?.[field.id] || ''}
                                            onChange={(event) => updateFieldSource(template.id, entry.id, field.id, event.target.value)}
                                            className={inputClassName}
                                          >
                                            <option value="">{t('backOffice.showcaseTemplates.defaultSourceOption')}</option>
                                            {questionsForKind(field.kind)
                                              .filter((question) => question.id !== field.id)
                                              .map((question) => (
                                                <option key={question.id} value={question.id}>{questionLabel(question)}</option>
                                              ))}
                                          </select>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {entry.kind === 'block' && (
                                <div className="mt-3 space-y-3">
                                  <label className="block md:w-1/3">
                                    <span className={fieldLabelClassName}>{t('backOffice.showcaseTemplates.blockTypeLabel')}</span>
                                    <select
                                      value={entry.type}
                                      onChange={(event) => updateBlockType(template.id, entry.id, event.target.value)}
                                      className={inputClassName}
                                    >
                                      {SHOWCASE_TEMPLATE_BLOCK_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                          {t(`projectShowcase.templates.${BLOCK_TYPE_LABEL_KEYS[type]}.name`)}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <p className="text-xs text-gray-600">{t('backOffice.showcaseTemplates.slotsHint')}</p>
                                  <div className="space-y-2">
                                    {getBlockSlotDefinitions(entry.type).map((definition) => (
                                      <SlotEditor
                                        key={definition.id}
                                        idPrefix={`${template.id}-${entry.id}-${definition.id}`}
                                        definition={definition}
                                        slot={entry.slots[definition.id]}
                                        onChange={(slot) => updateSlot(template.id, entry.id, definition.id, slot)}
                                        slotQuestions={slotQuestions}
                                        questionLabel={questionLabel}
                                        editingLanguage={editingLanguage}
                                        language={language}
                                        t={t}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!isLocked && (
                                <DisplayConditionEditor
                                  idPrefix={`showcase-template-${template.id}-${entry.kind}-${entry.id}-display`}
                                  entry={entry}
                                  onChange={(nextEntry) => updateEntry(template.id, entry.kind, entry.id, () => nextEntry)}
                                  questions={conditionQuestions}
                                  language={language}
                                  t={t}
                                />
                              )}
                            </li>
                          );
                        })}
                      </ol>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        {availableBuiltIns.length > 0 && (
                          <div className="flex-1">
                            <label htmlFor={addBuiltInId} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                              {t('backOffice.showcaseTemplates.addBuiltInLabel')}
                            </label>
                            <select
                              id={addBuiltInId}
                              value=""
                              onChange={(event) => {
                                const sectionId = event.target.value;
                                if (sectionId) {
                                  updateSections(template.id, (sections) => [...sections, { kind: 'builtin', id: sectionId }]);
                                }
                              }}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            >
                              <option value="">{t('backOffice.showcaseTemplates.addBuiltInPlaceholder')}</option>
                              {availableBuiltIns.map((id) => (
                                <option key={id} value={id}>{t(`projectShowcase.sectionOptions.${id}`)}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => updateSections(template.id, (sections) => [...sections, createShowcaseTemplateBlock(template)])}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                        >
                          <Plus className="w-4 h-4" />
                          {t('backOffice.showcaseTemplates.addBlockButton')}
                        </button>
                      </div>
                    </fieldset>
                  </article>
                );
              })}
            </div>
          )}

          <p className="text-xs text-gray-500">{t('backOffice.showcaseTemplates.defaultShowcaseNote')}</p>
        </article>
      </div>
      {/* hors du conteneur `space-y-6` : sa marge décalerait la fenêtre fixe */}
      {previewTemplate && (
        <ShowcaseTemplatePreview
          template={previewTemplate}
          questions={conditionQuestions}
          showcaseThemes={showcaseThemes}
          language={language}
          onClose={() => setPreviewTemplateId(null)}
          t={t}
        />
      )}
    </>
  );
};
