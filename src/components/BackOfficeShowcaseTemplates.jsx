import React, { Suspense, useCallback, useEffect, useMemo, useState } from '../react.js';
import { getLocalizedRaw, resolveLocalizedText, setLocalizedText } from '../utils/localizedContent.js';
import { SHOWCASE_SECTION_IDS } from '../utils/showcaseEditor.js';
import {
  SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID,
  buildTemplateSectionKey,
  convertTemplateSectionToBlock,
  createShowcaseTemplate,
  createShowcaseTemplateBlock,
  hasShowcaseTemplateActivation,
  normalizeShowcaseTemplates,
  updateTemplateSection
} from '../utils/showcaseTemplates.js';
import { ACTIVITY_SCOPE_QUESTION_ID } from '../utils/questions.js';
import { loadShowcaseStyles } from '../styles/loadShowcaseStyles.js';
import { LazyProjectShowcase, LoadingFallback } from '../lazyComponents.jsx';
import { ConditionGroupsEditor } from './ConditionGroupsEditor.jsx';
import { LanguageEditSwitcher } from './LocalizedFieldEditor.jsx';
import { ShowcaseTemplateStudio } from './ShowcaseTemplateStudio.jsx';
import { useReorderFeedback } from '../hooks/useReorderFeedback.js';
import {
  TemplateSectionSettings,
  buildFictiveShowcaseAnswers,
  buildTemplateQuestionHelpers,
  getTemplateSectionLabel,
  moveItem,
  translateInAllLanguages
} from './showcaseTemplateEditors.jsx';
import { ArrowDown, ArrowUp, Edit, Eye, Plus, Trash2 } from './icons.js';

// La vraie vitrine, sur des réponses fictives : un modèle se juge à ce qu'il produit, pas à
// sa liste de réglages. Le modèle s'applique quelles que soient ses conditions.
const ShowcaseTemplatePreview = ({ template, questions, showcaseThemes, language, onClose, t }) => {
  const answers = useMemo(
    () => buildFictiveShowcaseAnswers(template, questions, language),
    [language, questions, template]
  );
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
  sampleProjects = [],
  language,
  publishControl,
  t
}) => {
  const [editingLanguage, setEditingLanguage] = useState(language);
  const [previewTemplateId, setPreviewTemplateId] = useState(null);
  const [studioTemplateId, setStudioTemplateId] = useState(null);
  const normalizedTemplates = useMemo(() => normalizeShowcaseTemplates(templates), [templates]);
  const templateReorder = useReorderFeedback('template');
  const sectionReorder = useReorderFeedback('section');
  const templateContainerRef = templateReorder.containerRef;
  const sectionContainerRef = sectionReorder.containerRef;
  const setReorderContainer = useCallback((element) => {
    templateContainerRef.current = element;
    sectionContainerRef.current = element;
  }, [templateContainerRef, sectionContainerRef]);
  const helpers = buildTemplateQuestionHelpers(questions, language, t);
  const { conditionQuestions } = helpers;
  const previewTemplate = previewTemplateId
    ? normalizedTemplates.find((template) => template.id === previewTemplateId) || null
    : null;
  const studioTemplate = studioTemplateId
    ? normalizedTemplates.find((template) => template.id === studioTemplateId) || null
    : null;

  const updateTemplate = (templateId, updater) => {
    setTemplates((previous) => normalizeShowcaseTemplates(previous).map((template) => (
      template.id === templateId ? updater(template) : template
    )));
  };

  const updateSections = (templateId, updater) => {
    updateTemplate(templateId, (template) => ({ ...template, sections: updater(template.sections) }));
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
    const list = normalizedTemplates;
    const moved = list[index];
    const target = index + delta;
    if (moved && target >= 0 && target < list.length) {
      templateReorder.prepareMove(moved.id, {
        announce: t('common.feedback.movedPosition', { position: target + 1, total: list.length })
      });
    }
    setTemplates((previous) => moveItem(normalizeShowcaseTemplates(previous), index, delta));
  };

  const handleMoveSection = (template, index, delta) => {
    const moved = template.sections[index];
    const target = index + delta;
    if (moved && target >= 0 && target < template.sections.length) {
      sectionReorder.prepareMove(`${template.id}:${moved.kind}-${moved.id}`, {
        announce: t('common.feedback.movedPosition', { position: target + 1, total: template.sections.length })
      });
    }
    updateSections(template.id, (sections) => moveItem(sections, index, delta));
  };

  // L'atelier remplace la liste plutôt que de la recouvrir : les deux rendraient les mêmes
  // éditeurs, donc les mêmes identifiants de champ, et chaque libellé viserait le mauvais.
  if (studioTemplate) {
    return (
      <ShowcaseTemplateStudio
        template={studioTemplate}
        onChangeTemplate={(updater) => updateTemplate(studioTemplate.id, updater)}
        questions={conditionQuestions}
        helpers={helpers}
        showcaseThemes={showcaseThemes}
        sampleProjects={sampleProjects}
        language={language}
        editingLanguage={editingLanguage}
        onEditingLanguageChange={setEditingLanguage}
        onClose={() => setStudioTemplateId(null)}
        t={t}
      />
    );
  }

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
            <div className="space-y-4" ref={setReorderContainer}>
              <span className="sr-only" role="status" aria-live="polite">
                {templateReorder.announcement || sectionReorder.announcement}
              </span>
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
                    data-reorder-template-key={template.id}
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
                      <button
                        type="button"
                        onClick={() => setStudioTemplateId(template.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                      >
                        <Edit className="w-4 h-4" />
                        {t('backOffice.showcaseTemplates.studio.openButton')}
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          data-reorder-template-action="up"
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
                          data-reorder-template-action="down"
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
                            <li
                              key={rowKey}
                              className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                              data-testid="showcase-template-section"
                              data-section-kind={entry.kind}
                              data-section-id={entry.id}
                              data-reorder-section-key={`${template.id}:${rowKey}`}
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
                                  {getTemplateSectionLabel(entry, t, editingLanguage)}
                                </span>
                                {isLocked && (
                                  <span className="text-xs text-gray-500">{t('backOffice.showcaseTemplates.noticeLocked')}</span>
                                )}
                                <button
                                  type="button"
                                  data-reorder-section-action="up"
                                  onClick={() => handleMoveSection(template, index, -1)}
                                  disabled={index === 0}
                                  aria-label={t('backOffice.showcaseTemplates.moveUp')}
                                  title={t('backOffice.showcaseTemplates.moveUp')}
                                  className="rounded-md border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  data-reorder-section-action="down"
                                  onClick={() => handleMoveSection(template, index, 1)}
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
                              <TemplateSectionSettings
                                template={template}
                                entry={entry}
                                onChange={(nextEntry) => updateTemplate(template.id, (current) => (
                                  updateTemplateSection(current, buildTemplateSectionKey(entry), () => nextEntry)
                                ))}
                                onConvert={() => updateTemplate(template.id, (current) => (
                                  convertTemplateSectionToBlock(current, buildTemplateSectionKey(entry), translateInAllLanguages).template
                                ))}
                                helpers={helpers}
                                editingLanguage={editingLanguage}
                                language={language}
                                t={t}
                              />
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
