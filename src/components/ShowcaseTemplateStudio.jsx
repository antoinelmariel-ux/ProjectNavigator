import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from '../react.js';
import { useReorderFeedback } from '../hooks/useReorderFeedback.js';
import { resolveLocalizedText } from '../utils/localizedContent.js';
import { SHOWCASE_SECTION_IDS } from '../utils/showcaseEditor.js';
import {
  SHOWCASE_TEMPLATE_BLOCK_TYPES,
  SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID,
  addTemplateSection,
  buildTemplateSectionKey,
  convertTemplateSectionToBlock,
  findTemplateSection,
  moveTemplateSection,
  removeTemplateSection,
  updateTemplateSection
} from '../utils/showcaseTemplates.js';
import { SUPPORTED_LANGUAGES } from '../i18n/languages.js';
import { loadShowcaseStyles } from '../styles/loadShowcaseStyles.js';
import { LazyProjectShowcase, LoadingFallback } from '../lazyComponents.jsx';
import {
  BLOCK_TYPE_LABEL_KEYS,
  TemplateSectionSettings,
  buildFictiveShowcaseAnswers,
  getTemplateSectionLabel,
  translateInAllLanguages
} from './showcaseTemplateEditors.jsx';
import { ArrowDown, ArrowUp, Trash2 } from './icons.js';

const DATA_FICTIVE = 'fictive';
const DATA_EMPTY = 'empty';
const SAMPLE_PREFIX = 'sample:';

// Un projet du banc d'essai peut porter sa propre structure de vitrine : le modèle n'y
// tiendrait plus lieu de rien, l'atelier ne montrerait pas ce qu'on règle.
const STRUCTURE_ANSWER_KEYS = ['customShowcaseSections', 'showcaseSectionOrder', 'showcaseSectionAccents'];

const isTypingTarget = (target) => {
  if (!target || typeof target !== 'object') {
    return false;
  }
  const tagName = (target.tagName || '').toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || Boolean(target.isContentEditable);
};

const studioButtonClassName = 'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100';
const pressedButtonClassName = 'rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white';

/**
 * Atelier d'un modèle de vitrine : le modèle se règle sur la vraie vitrine. Au centre, le
 * rendu réel (ProjectShowcase en mode `authoring`), chaque section dans un cadre cliquable ;
 * à gauche, le plan (ordre, ajout, retrait) ; à droite, les réglages de la section choisie —
 * les mêmes éditeurs que le formulaire. Chaque changement est appliqué au modèle aussitôt,
 * comme dans le formulaire ; rien n'est écrit dans un projet.
 */
export const ShowcaseTemplateStudio = ({
  template,
  onChangeTemplate,
  questions,
  helpers,
  showcaseThemes,
  sampleProjects = [],
  language,
  editingLanguage,
  onEditingLanguageChange,
  onClose,
  t
}) => {
  const [selectedKey, setSelectedKey] = useState(() => {
    const first = template.sections.find((entry) => !(entry.kind === 'builtin' && entry.id === SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID));
    return first ? buildTemplateSectionKey(first) : null;
  });
  const [dataMode, setDataMode] = useState('example');
  const [exampleSource, setExampleSource] = useState(DATA_FICTIVE);
  const [showChrome, setShowChrome] = useState(true);
  const canvasRef = useRef(null);
  const pendingScrollKeyRef = useRef(null);

  const samples = useMemo(
    () => (Array.isArray(sampleProjects) ? sampleProjects.filter((sample) => sample && sample.id) : []),
    [sampleProjects]
  );

  const answers = useMemo(() => {
    if (dataMode === DATA_EMPTY) {
      return {};
    }
    if (exampleSource.startsWith(SAMPLE_PREFIX)) {
      const sample = samples.find((candidate) => `${SAMPLE_PREFIX}${candidate.id}` === exampleSource);
      const sampleAnswers = { ...(sample?.answers && typeof sample.answers === 'object' ? sample.answers : {}) };
      STRUCTURE_ANSWER_KEYS.forEach((key) => {
        delete sampleAnswers[key];
      });
      return sampleAnswers;
    }
    return buildFictiveShowcaseAnswers(template, questions, language);
  }, [dataMode, exampleSource, language, questions, samples, template]);

  const labels = useMemo(
    () => template.sections.reduce((accumulator, entry) => {
      accumulator[buildTemplateSectionKey(entry)] = getTemplateSectionLabel(entry, t, editingLanguage);
      return accumulator;
    }, {}),
    [editingLanguage, t, template]
  );

  const selectedEntry = selectedKey ? findTemplateSection(template, selectedKey) : null;
  const templateName = resolveLocalizedText(template.name, language) || t('backOffice.showcaseTemplates.untitled');
  const usedBuiltIns = new Set(template.sections.filter((entry) => entry.kind === 'builtin').map((entry) => entry.id));
  const availableBuiltIns = SHOWCASE_SECTION_IDS.filter((id) => !usedBuiltIns.has(id));

  // Choisir dans le plan amène la section sous les yeux ; un clic sur la vitrine, non : la
  // section y est déjà.
  const selectFromOutline = useCallback((key) => {
    pendingScrollKeyRef.current = key;
    setSelectedKey(key);
  }, []);
  const selectFromCanvas = useCallback((key) => {
    pendingScrollKeyRef.current = null;
    setSelectedKey(key);
  }, []);

  useEffect(() => {
    const key = pendingScrollKeyRef.current;
    if (!key || !canvasRef.current) {
      return;
    }
    pendingScrollKeyRef.current = null;
    const frame = canvasRef.current.querySelector(`[data-authoring-key="${key}"]`);
    if (frame && typeof frame.scrollIntoView === 'function') {
      frame.scrollIntoView({ block: 'start' });
    }
  }, [selectedKey, template]);

  useEffect(() => {
    loadShowcaseStyles().catch((error) => {
      console.error('Feuilles de style de la vitrine indisponibles :', error);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isTypingTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        setShowChrome((previous) => !previous);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const authoring = useMemo(
    () => ({ selectedKey, onSelect: selectFromCanvas, showChrome, labels }),
    [labels, selectFromCanvas, selectedKey, showChrome]
  );

  const handleAdd = (spec) => {
    const result = addTemplateSection(template, spec, selectedKey);
    if (!result.key) {
      return;
    }
    onChangeTemplate(() => result.template);
    selectFromOutline(result.key);
  };

  const handleConvert = (key) => {
    const result = convertTemplateSectionToBlock(template, key, translateInAllLanguages);
    onChangeTemplate(() => result.template);
    setSelectedKey(result.key);
  };

  const { containerRef: outlineRef, prepareMove, announcement } = useReorderFeedback();

  const handleMoveSection = (key, delta) => {
    const position = template.sections.findIndex((entry) => buildTemplateSectionKey(entry) === key);
    const target = position + delta;
    if (position >= 0 && target >= 0 && target < template.sections.length) {
      prepareMove(key, {
        announce: t('common.feedback.movedPosition', { position: target + 1, total: template.sections.length })
      });
    }
    onChangeTemplate((current) => moveTemplateSection(current, key, delta));
  };

  const handleRemove = (key) => {
    onChangeTemplate((current) => removeTemplateSection(current, key));
    if (selectedKey === key) {
      setSelectedKey(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-100"
      role="dialog"
      aria-modal="true"
      aria-label={t('backOffice.showcaseTemplates.studio.title', { name: templateName })}
      data-testid="showcase-template-studio"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mr-auto min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800">
            {t('backOffice.showcaseTemplates.studio.title', { name: templateName })}
          </p>
          <p className="text-xs text-gray-500">{t('backOffice.showcaseTemplates.studio.hint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('backOffice.showcaseTemplates.studio.dataLabel')}>
          <button
            type="button"
            aria-pressed={dataMode === 'example'}
            onClick={() => setDataMode('example')}
            className={dataMode === 'example' ? pressedButtonClassName : studioButtonClassName}
          >
            {t('backOffice.showcaseTemplates.studio.dataExample')}
          </button>
          <button
            type="button"
            aria-pressed={dataMode === DATA_EMPTY}
            onClick={() => setDataMode(DATA_EMPTY)}
            className={dataMode === DATA_EMPTY ? pressedButtonClassName : studioButtonClassName}
          >
            {t('backOffice.showcaseTemplates.studio.dataEmpty')}
          </button>
          {dataMode === 'example' && (
            <select
              value={exampleSource}
              onChange={(event) => setExampleSource(event.target.value)}
              aria-label={t('backOffice.showcaseTemplates.studio.exampleSourceLabel')}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
            >
              <option value={DATA_FICTIVE}>{t('backOffice.showcaseTemplates.studio.exampleFictive')}</option>
              {samples.length > 0 && (
                <optgroup label={t('backOffice.showcaseTemplates.studio.exampleSampleGroup')}>
                  {samples.map((sample) => (
                    <option key={sample.id} value={`${SAMPLE_PREFIX}${sample.id}`}>{sample.name || sample.id}</option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
        </div>
        <select
          value={editingLanguage}
          onChange={(event) => onEditingLanguageChange(event.target.value)}
          aria-label={t('backOffice.showcaseTemplates.studio.languageLabel')}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm uppercase"
        >
          {SUPPORTED_LANGUAGES.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={!showChrome}
          onClick={() => setShowChrome((previous) => !previous)}
          className={showChrome ? studioButtonClassName : pressedButtonClassName}
        >
          {t('backOffice.showcaseTemplates.studio.readerView')}
        </button>
        <button type="button" onClick={onClose} className={studioButtonClassName}>
          {t('backOffice.showcaseTemplates.studio.close')}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav
          className="max-h-48 shrink-0 overflow-y-auto border-b border-gray-200 bg-white p-3 lg:max-h-none lg:w-64 lg:border-r"
          aria-label={t('backOffice.showcaseTemplates.studio.outlineTitle')}
          data-testid="showcase-template-studio-outline"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('backOffice.showcaseTemplates.studio.outlineTitle')}
          </p>
          <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
          <ol className="space-y-1" ref={outlineRef}>
            {template.sections.map((entry, index) => {
              const key = buildTemplateSectionKey(entry);
              const isNotice = entry.kind === 'builtin' && entry.id === SHOWCASE_TEMPLATE_MANDATORY_SECTION_ID;
              if (isNotice) {
                return null;
              }
              const isSelected = key === selectedKey;
              return (
                <li key={key} data-reorder-key={key} className={`flex items-center gap-1 rounded-lg ${isSelected ? 'bg-blue-50' : ''}`}>
                  <button
                    type="button"
                    data-outline-key={key}
                    onClick={() => selectFromOutline(key)}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-sm ${
                      isSelected ? 'font-semibold text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {labels[key]}
                  </button>
                  <button
                    type="button"
                    data-reorder-action="up"
                    onClick={() => handleMoveSection(key, -1)}
                    disabled={index <= 1}
                    aria-label={t('backOffice.showcaseTemplates.moveUp')}
                    title={t('backOffice.showcaseTemplates.moveUp')}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    data-reorder-action="down"
                    onClick={() => handleMoveSection(key, 1)}
                    disabled={index === template.sections.length - 1}
                    aria-label={t('backOffice.showcaseTemplates.moveDown')}
                    title={t('backOffice.showcaseTemplates.moveDown')}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(key)}
                    aria-label={t('backOffice.showcaseTemplates.remove')}
                    title={t('backOffice.showcaseTemplates.remove')}
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
            <select
              value=""
              onChange={(event) => event.target.value && handleAdd({ kind: 'block', type: event.target.value })}
              aria-label={t('backOffice.showcaseTemplates.studio.addBlock')}
              className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm text-blue-700"
            >
              <option value="">{t('backOffice.showcaseTemplates.studio.addBlock')}</option>
              {SHOWCASE_TEMPLATE_BLOCK_TYPES.map((type) => (
                <option key={type} value={type}>{t(`projectShowcase.templates.${BLOCK_TYPE_LABEL_KEYS[type]}.name`)}</option>
              ))}
            </select>
            {availableBuiltIns.length > 0 && (
              <select
                value=""
                onChange={(event) => event.target.value && handleAdd({ kind: 'builtin', id: event.target.value })}
                aria-label={t('backOffice.showcaseTemplates.studio.addBuiltIn')}
                className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700"
              >
                <option value="">{t('backOffice.showcaseTemplates.studio.addBuiltIn')}</option>
                {availableBuiltIns.map((id) => (
                  <option key={id} value={id}>{t(`projectShowcase.sectionOptions.${id}`)}</option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500">{t('backOffice.showcaseTemplates.studio.addHint')}</p>
          </div>
        </nav>

        <div ref={canvasRef} className="min-h-0 flex-1 overflow-y-auto bg-white" data-testid="showcase-template-studio-canvas">
          {dataMode === DATA_EMPTY && (
            <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              {t('backOffice.showcaseTemplates.studio.emptyModeHint')}
            </p>
          )}
          <Suspense fallback={<LoadingFallback label={t('backOffice.showcaseTemplates.previewLoading')} />}>
            <LazyProjectShowcase
              projectName={typeof answers.projectName === 'string' ? answers.projectName : ''}
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
              authoring={authoring}
            />
          </Suspense>
        </div>

        <aside
          className="max-h-96 shrink-0 overflow-y-auto border-t border-gray-200 bg-white p-4 lg:max-h-none lg:w-96 lg:border-l lg:border-t-0"
          aria-label={t('backOffice.showcaseTemplates.studio.inspectorTitle')}
          data-testid="showcase-template-studio-inspector"
        >
          {selectedEntry ? (
            <div
              data-testid="showcase-template-section"
              data-section-kind={selectedEntry.kind}
              data-section-id={selectedEntry.id}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {selectedEntry.kind === 'builtin'
                  ? t('backOffice.showcaseTemplates.builtInBadge')
                  : t('backOffice.showcaseTemplates.blockBadge')}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-gray-800">{labels[selectedKey]}</h3>
              <TemplateSectionSettings
                template={template}
                entry={selectedEntry}
                onChange={(nextEntry) => onChangeTemplate((current) => updateTemplateSection(current, selectedKey, () => nextEntry))}
                onConvert={() => handleConvert(selectedKey)}
                helpers={helpers}
                editingLanguage={editingLanguage}
                language={language}
                t={t}
                compact
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t('backOffice.showcaseTemplates.studio.inspectorEmpty')}</p>
          )}
        </aside>
      </div>
    </div>
  );
};
