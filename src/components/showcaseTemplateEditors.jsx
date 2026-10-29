import React from '../react.js';
import { getLocalizedRaw, resolveLocalizedText, setLocalizedText } from '../utils/localizedContent.js';
import {
  SHOWCASE_BUILTIN_LABEL_KEYS,
  SHOWCASE_BUILTIN_OPTIONAL_PARTS,
  SHOWCASE_SLOT_STATES,
  SHOWCASE_TEMPLATE_BLOCK_TYPES,
  SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID,
  SHOWCASE_TEMPLATE_SOURCE_FIELDS,
  buildShowcaseTemplatePreviewAnswers,
  buildSlotPlaceholder,
  extractSlotPlaceholders,
  getBlockSlotDefinitions,
  getBuiltInBlockPreset,
  hasSectionDisplayCondition,
  isQuestionCompatibleWithSourceKind,
  normalizeBlockSlots
} from '../utils/showcaseTemplates.js';
import { ACTIVITY_SCOPE_QUESTION_ID } from '../utils/questions.js';
import { DICTIONARIES } from '../i18n/dictionaries/index.js';
import { demoProjectAnswersSnapshot } from '../data/demoProject.js';
import { showcaseTemplatePreviewAnswers } from '../data/showcaseTemplates.js';
import { ConditionGroupsEditor } from './ConditionGroupsEditor.jsx';

// Éditeurs d'une section de modèle de vitrine, partagés par le formulaire du back-office et
// par l'atelier (ShowcaseTemplateStudio) : les deux règlent exactement les mêmes choses, par
// les mêmes contrôles.

export const BLOCK_TYPE_LABEL_KEYS = {
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
export const translateInAllLanguages = (key) => Object.entries(DICTIONARIES).reduce((accumulator, [language, dictionary]) => {
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

export const moveItem = (items, index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= items.length) {
    return items;
  }
  const next = items.slice();
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
};

export const fieldLabelClassName = 'block text-xs font-semibold uppercase tracking-wide text-gray-600';
export const inputClassName = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';

// Un emplacement d'un bloc : d'où vient son contenu (texte saisi ici, éventuellement composé
// de réponses, ou réponse à une question) et ce que le porteur peut en faire.
export const SlotEditor = ({ idPrefix, definition, slot, onChange, slotQuestions, questionLabel, editingLanguage, language, t, compact = false }) => {
  // `compact` : une seule colonne, pour la colonne étroite de l'inspecteur de l'atelier.
  const gridClassName = compact ? 'grid gap-3' : 'grid gap-3 md:grid-cols-3';
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
      <div className={gridClassName}>
        <p className={`text-sm font-semibold text-gray-800${compact ? '' : ' md:pt-6'}`}>
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
        <div className={`mt-3 ${gridClassName}`}>
          <div className={compact ? '' : 'md:col-span-2'}>
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
export const BuiltInOptionsEditor = ({ templateId, entry, onChange, editingLanguage, t, compact = false }) => {
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
          <div className={compact ? 'grid gap-3' : 'grid gap-3 md:grid-cols-2'}>
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
export const DisplayConditionEditor = ({ idPrefix, entry, onChange, questions, language, t }) => {
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

// Ce qu'une vitrine d'exemple ne doit pas recevoir du projet de démonstration : sa propre
// structure (le modèle n'y tiendrait plus lieu de rien) et ses échanges compliance.
const PREVIEW_EXCLUDED_ANSWER_KEYS = [
  'customShowcaseSections',
  'showcaseSectionOrder',
  'showcaseSectionAccents',
  '__compliance_team_comments__'
];

// Réponses fictives d'un modèle : le projet de démonstration, les réponses d'exemple propres
// au modèle, puis une réponse inventée pour chaque question qu'il lit encore sans réponse.
export const buildFictiveShowcaseAnswers = (template, questions, language) => {
  const base = { ...demoProjectAnswersSnapshot };
  PREVIEW_EXCLUDED_ANSWER_KEYS.forEach((key) => {
    delete base[key];
  });
  return buildShowcaseTemplatePreviewAnswers(
    template,
    questions,
    { ...base, ...(showcaseTemplatePreviewAnswers[template?.id] || {}) },
    language
  );
};

// Questions proposées par les éditeurs : libellé « question (id · type) », filtrées par ce
// qu'un champ ou un emplacement sait afficher.
export const buildTemplateQuestionHelpers = (questions, language, t) => {
  const conditionQuestions = Array.isArray(questions) ? questions : [];
  const questionLabel = (question) => {
    const label = resolveLocalizedText(question.question, language);
    const type = t(`backOffice.showcaseTemplates.questionTypes.${question.type || 'text'}`);
    return label ? `${label} (${question.id} · ${type})` : `${question.id} · ${type}`;
  };
  const questionsForKind = (kind) => conditionQuestions.filter(
    (question) => question.id !== ACTIVITY_SCOPE_QUESTION_ID && isQuestionCompatibleWithSourceKind(question, kind)
  );
  return { conditionQuestions, questionLabel, questionsForKind, slotQuestions: questionsForKind('slot') };
};

export const getTemplateSectionLabel = (entry, t, language) => {
  if (!entry) {
    return '';
  }
  if (entry.kind === 'builtin') {
    return t(`projectShowcase.sectionOptions.${entry.id}`);
  }
  const title = resolveLocalizedText(entry.slots?.title?.text, language).replace(/\{\{\s*[^{}\s]+\s*\}\}/g, '…').trim();
  return title || t(`projectShowcase.templates.${BLOCK_TYPE_LABEL_KEYS[entry.type]}.name`);
};

// Réglages d'une section du modèle : remplacement par un bloc (section intégrée), éléments et
// titres, questions des champs, gabarit et emplacements (bloc), condition d'affichage.
export const TemplateSectionSettings = ({
  template,
  entry,
  onChange,
  onConvert,
  helpers,
  editingLanguage,
  language,
  t,
  compact = false
}) => {
  const { conditionQuestions, questionLabel, questionsForKind, slotQuestions } = helpers;
  const isNotice = entry.kind === 'builtin' && entry.id === SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID;
  const preset = entry.kind === 'builtin' ? getBuiltInBlockPreset(entry.id) : null;
  const updateFieldSource = (fieldId, questionId) => onChange({
    ...entry,
    fieldSources: { ...(entry.fieldSources || {}), [fieldId]: questionId }
  });

  return (
    <>
      {preset && (
        <div
          className={`mt-3 flex flex-col gap-2 rounded-lg border border-dashed border-blue-200 bg-white p-3${
            compact ? '' : ' sm:flex-row sm:items-center sm:justify-between'
          }`}
        >
          <p className="text-xs text-gray-600">
            {t('backOffice.showcaseTemplates.convertHint', {
              layout: t(`projectShowcase.templates.${BLOCK_TYPE_LABEL_KEYS[preset.type]}.name`)
            })}
            {preset.lost.length > 0 && (
              <>
                {' '}
                {t('backOffice.showcaseTemplates.convertLost', {
                  parts: preset.lost.map((part) => t(`backOffice.showcaseTemplates.parts.${part}`)).join(', ')
                })}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={onConvert}
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
          onChange={onChange}
          editingLanguage={editingLanguage}
          t={t}
          compact={compact}
        />
      )}
      {entry.kind === 'builtin' && SHOWCASE_TEMPLATE_SOURCE_FIELDS[entry.id] && (
        <div className="mt-3 space-y-2" data-testid="showcase-template-field-sources">
          <p className="text-xs text-gray-600">{t('backOffice.showcaseTemplates.fieldSourcesHint')}</p>
          <div className={compact ? 'grid gap-3' : 'grid gap-3 md:grid-cols-2'}>
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
                    onChange={(event) => updateFieldSource(field.id, event.target.value)}
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
          <label className={compact ? 'block' : 'block md:w-1/3'}>
            <span className={fieldLabelClassName}>{t('backOffice.showcaseTemplates.blockTypeLabel')}</span>
            <select
              value={entry.type}
              onChange={(event) => onChange({
                ...entry,
                type: event.target.value,
                // changer de gabarit garde les emplacements que les deux partagent (titre, texte…)
                slots: normalizeBlockSlots(event.target.value, entry.slots)
              })}
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
                onChange={(slot) => onChange({ ...entry, slots: { ...entry.slots, [definition.id]: slot } })}
                slotQuestions={slotQuestions}
                questionLabel={questionLabel}
                editingLanguage={editingLanguage}
                language={language}
                t={t}
                compact={compact}
              />
            ))}
          </div>
        </div>
      )}
      {!isNotice && (
        <DisplayConditionEditor
          idPrefix={`showcase-template-${template.id}-${entry.kind}-${entry.id}-display`}
          entry={entry}
          onChange={onChange}
          questions={conditionQuestions}
          language={language}
          t={t}
        />
      )}
    </>
  );
};
