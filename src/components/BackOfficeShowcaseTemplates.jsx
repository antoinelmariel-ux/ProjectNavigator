import React, { useMemo, useState } from '../react.js';
import { getLocalizedRaw, resolveLocalizedText, setLocalizedText } from '../utils/localizedContent.js';
import { SHOWCASE_SECTION_IDS } from '../utils/showcaseEditor.js';
import {
  SHOWCASE_TEMPLATE_BLOCK_TYPES,
  SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID,
  createShowcaseTemplate,
  createShowcaseTemplateBlock,
  getShowcaseTemplateActivationConflicts,
  normalizeShowcaseTemplates
} from '../utils/showcaseTemplates.js';
import { LanguageEditSwitcher } from './LocalizedFieldEditor.jsx';
import { ArrowDown, ArrowUp, Plus, Trash2 } from './icons.js';

const BLOCK_TYPE_LABEL_KEYS = {
  highlight: 'highlight',
  figure: 'figure',
  columns: 'columns',
  'document-viewer': 'documentViewer',
  story: 'story',
  checklist: 'checklist',
  stack: 'stack'
};

const CHOICE_QUESTION_TYPES = new Set(['choice', 'multi_choice']);

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

// Éditeur des modèles de vitrine (référentiel showcase-templates.json). Un modèle s'applique
// aux projets dont la réponse à la question choisie figure parmi les options cochées.
export const BackOfficeShowcaseTemplates = ({
  templates,
  setTemplates,
  questions,
  language,
  publishControl,
  t
}) => {
  const [editingLanguage, setEditingLanguage] = useState(language);
  const normalizedTemplates = useMemo(() => normalizeShowcaseTemplates(templates), [templates]);
  const conflicts = useMemo(() => getShowcaseTemplateActivationConflicts(normalizedTemplates), [normalizedTemplates]);

  const choiceQuestions = useMemo(
    () => (Array.isArray(questions) ? questions : []).filter(
      (question) => question && CHOICE_QUESTION_TYPES.has(question.type) && Array.isArray(question.options)
    ),
    [questions]
  );

  const templateNameById = useMemo(() => {
    const map = new Map();
    normalizedTemplates.forEach((template) => {
      map.set(template.id, resolveLocalizedText(template.name, language) || t('backOffice.showcaseTemplates.untitled'));
    });
    return map;
  }, [language, normalizedTemplates, t]);

  const findOptionLabel = (questionId, value) => {
    const question = choiceQuestions.find((entry) => entry.id === questionId);
    const option = question?.options.find((entry) => entry?.value === value);
    return option ? resolveLocalizedText(option.label, language) || value : value;
  };

  const updateTemplate = (templateId, updater) => {
    setTemplates((previous) => normalizeShowcaseTemplates(previous).map((template) => (
      template.id === templateId ? updater(template) : template
    )));
  };

  const updateSections = (templateId, updater) => {
    updateTemplate(templateId, (template) => ({ ...template, sections: updater(template.sections) }));
  };

  const updateBlock = (templateId, blockId, patch) => {
    updateSections(templateId, (sections) => sections.map((entry) => (
      entry.kind === 'block' && entry.id === blockId ? { ...entry, ...patch } : entry
    )));
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

  const handleToggleValue = (templateId, value) => {
    updateTemplate(templateId, (template) => {
      const values = template.activation.values.includes(value)
        ? template.activation.values.filter((entry) => entry !== value)
        : [...template.activation.values, value];
      return { ...template, activation: { ...template.activation, values } };
    });
  };

  const handleQuestionChange = (templateId, questionId) => {
    updateTemplate(templateId, (template) => ({ ...template, activation: { questionId, values: [] } }));
  };

  return (
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

        {conflicts.length > 0 && (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">{t('backOffice.showcaseTemplates.conflictsTitle')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {conflicts.map((conflict) => (
                <li key={`${conflict.questionId}-${conflict.value}`}>
                  {t('backOffice.showcaseTemplates.conflictItem', {
                    option: findOptionLabel(conflict.questionId, conflict.value),
                    templates: conflict.templateIds.map((id) => templateNameById.get(id) || id).join(', ')
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {normalizedTemplates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
            {t('backOffice.showcaseTemplates.empty')}
          </div>
        ) : (
          <div className="space-y-4">
            {normalizedTemplates.map((template) => {
              const activationQuestion = choiceQuestions.find((question) => question.id === template.activation.questionId);
              const usedBuiltIns = new Set(
                template.sections.filter((entry) => entry.kind === 'builtin').map((entry) => entry.id)
              );
              const availableBuiltIns = SHOWCASE_SECTION_IDS.filter((id) => !usedBuiltIns.has(id));
              const nameId = `${template.id}-name`;
              const questionSelectId = `${template.id}-question`;
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
                    <div>
                      <label htmlFor={questionSelectId} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                        {t('backOffice.showcaseTemplates.activationQuestionLabel')}
                      </label>
                      <select
                        id={questionSelectId}
                        value={template.activation.questionId}
                        onChange={(event) => handleQuestionChange(template.id, event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {!activationQuestion && (
                          <option value={template.activation.questionId}>{template.activation.questionId}</option>
                        )}
                        {choiceQuestions.map((question) => (
                          <option key={question.id} value={question.id}>
                            {resolveLocalizedText(question.question, language) || question.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        {t('backOffice.showcaseTemplates.activationValuesLabel')}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(activationQuestion?.options || []).filter((option) => option?.value).map((option) => {
                          const checkboxId = `${template.id}-value-${option.value}`;
                          return (
                            <label
                              key={option.value}
                              htmlFor={checkboxId}
                              className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 hover:border-blue-200"
                            >
                              <input
                                id={checkboxId}
                                type="checkbox"
                                checked={template.activation.values.includes(option.value)}
                                onChange={() => handleToggleValue(template.id, option.value)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                              />
                              <span>{resolveLocalizedText(option.label, language) || option.value}</span>
                            </label>
                          );
                        })}
                      </div>
                      {template.activation.values.length === 0 && (
                        <p className="mt-2 text-xs text-amber-700">{t('backOffice.showcaseTemplates.activationEmptyHint')}</p>
                      )}
                    </div>
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
                        return (
                          <li key={rowKey} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
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
                                  : resolveLocalizedText(entry.title, editingLanguage) || t('backOffice.showcaseTemplates.untitledBlock')}
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
                            {entry.kind === 'block' && (
                              <div className="mt-3 grid gap-3 md:grid-cols-3">
                                <label className="block">
                                  <span className="block text-xs font-semibold uppercase tracking-wide text-gray-600">{t('backOffice.showcaseTemplates.blockTypeLabel')}</span>
                                  <select
                                    value={entry.type}
                                    onChange={(event) => updateBlock(template.id, entry.id, { type: event.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  >
                                    {SHOWCASE_TEMPLATE_BLOCK_TYPES.map((type) => (
                                      <option key={type} value={type}>
                                        {t(`projectShowcase.templates.${BLOCK_TYPE_LABEL_KEYS[type]}.name`)}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="block md:col-span-2">
                                  <span className="block text-xs font-semibold uppercase tracking-wide text-gray-600">{t('backOffice.showcaseTemplates.blockTitleLabel')}</span>
                                  <input
                                    type="text"
                                    value={getLocalizedRaw(entry.title, editingLanguage)}
                                    onChange={(event) => updateBlock(template.id, entry.id, {
                                      title: setLocalizedText(entry.title, editingLanguage, event.target.value)
                                    })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                </label>
                                <label className="block md:col-span-3">
                                  <span className="block text-xs font-semibold uppercase tracking-wide text-gray-600">{t('backOffice.showcaseTemplates.blockDescriptionLabel')}</span>
                                  <textarea
                                    rows={2}
                                    value={getLocalizedRaw(entry.description, editingLanguage)}
                                    onChange={(event) => updateBlock(template.id, entry.id, {
                                      description: setLocalizedText(entry.description, editingLanguage, event.target.value)
                                    })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                  <span className="mt-1 block text-xs text-gray-500">
                                    {t('backOffice.showcaseTemplates.blockDescriptionHint')}
                                  </span>
                                </label>
                              </div>
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
  );
};
