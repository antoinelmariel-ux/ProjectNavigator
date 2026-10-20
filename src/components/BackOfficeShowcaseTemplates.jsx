import React, { useMemo, useState } from '../react.js';
import { getLocalizedRaw, resolveLocalizedText, setLocalizedText } from '../utils/localizedContent.js';
import { SHOWCASE_SECTION_IDS } from '../utils/showcaseEditor.js';
import {
  SHOWCASE_TEMPLATE_BLOCK_TYPES,
  SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID,
  createShowcaseTemplate,
  createShowcaseTemplateBlock,
  hasShowcaseTemplateActivation,
  normalizeShowcaseTemplates
} from '../utils/showcaseTemplates.js';
import { ACTIVITY_SCOPE_QUESTION_ID } from '../utils/questions.js';
import { ConditionGroupsEditor } from './ConditionGroupsEditor.jsx';
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
// aux projets qui remplissent ses conditions, saisies avec le même panneau que les règles ;
// le premier modèle de la liste qui convient l'emporte, d'où les flèches de réordonnancement.
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
  const conditionQuestions = Array.isArray(questions) ? questions : [];

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

  const handleMoveTemplate = (index, delta) => {
    setTemplates((previous) => moveItem(normalizeShowcaseTemplates(previous), index, delta));
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
