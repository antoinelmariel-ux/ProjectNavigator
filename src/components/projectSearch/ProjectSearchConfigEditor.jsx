import React, { useEffect, useMemo, useRef, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { AlertTriangle, ArrowDown, ArrowUp, Close, Edit, Plus, Search, Trash2 } from '../icons.js';
import { buttonClass } from '../../utils/buttonStyles.js';
import { useReorderFeedback } from '../../hooks/useReorderFeedback.js';
import { useModalDialog } from '../../hooks/useModalDialog.js';
import {
  BUILTIN_COLUMN_IDS,
  MAX_COLUMN_SOURCES,
  MAX_PROJECT_SEARCH_COLUMNS,
  MERGE_MODES,
  addColumnSource,
  buildQuestionColumn,
  createProjectSearchId,
  getColumnKind,
  getMissingColumnSources,
  listSearchableQuestions,
  searchQuestionOptions
} from '../../utils/projectSearch.js';

const INPUT_CLASS = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm';
const PICKER_RESULT_LIMIT = 8;

// Recherche dans le référentiel plutôt qu'une liste déroulante : avec des centaines de questions,
// une liste ne se parcourt plus. Un clic sur un résultat l'ajoute.
const QuestionPicker = ({ id, label, options, excludeIds, onPick, testId }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { results, total } = useMemo(
    () => searchQuestionOptions(options, query, { excludeIds, limit: PICKER_RESULT_LIMIT }),
    [excludeIds, options, query]
  );
  const hiddenCount = total - results.length;
  return (
    <div className="space-y-2" data-testid={testId}>
      <label htmlFor={id} className="block space-y-1">
        <span className="block text-xs font-medium text-gray-600">{label}</span>
        <span className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            id={id}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('projectSearch.config.questionSearchPlaceholder')}
            className="w-full border-0 bg-transparent py-1.5 text-sm focus:outline-none"
            autoComplete="off"
          />
        </span>
      </label>
      {total === 0 ? (
        <p className="text-xs text-gray-500">{t('projectSearch.config.questionSearchEmpty')}</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white" aria-label={t('projectSearch.config.questionResults', { count: total })}>
          {results.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                onClick={() => {
                  onPick(option.id);
                  setQuery('');
                }}
                aria-label={t('projectSearch.config.pickQuestion', { label: option.label })}
              >
                <Plus className="h-4 w-4 shrink-0 text-blue-600" />
                <span className="min-w-0 flex-1 truncate text-gray-800" title={option.label}>{option.label}</span>
                <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                  {t(`projectSearch.config.questionTypes.${option.type}`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {hiddenCount > 0 && (
        <p className="text-xs text-gray-500">{t('projectSearch.config.questionSearchMore', { count: hiddenCount })}</p>
      )}
    </div>
  );
};

const SourceRow = ({ source, index, total, question, label, columnId, showFactor, onChange, onRemove, onMove }) => {
  const { t } = useTranslation();
  const factorId = `${columnId}-source-${index}-factor`;
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="w-5 shrink-0 text-xs font-semibold text-gray-500">{index + 1}.</span>
      <span className={`min-w-0 flex-1 text-sm ${question ? 'text-gray-800' : 'text-amber-800'}`} title={label}>
        {question ? label : t('projectSearch.config.missingQuestionOption', { id: source.questionId })}
      </span>
      {showFactor && (
        <label className="flex items-center gap-1 text-xs text-gray-600" htmlFor={factorId}>
          {t('projectSearch.config.factorLabel')}
          <input
            id={factorId}
            type="number"
            step="any"
            value={source.factor}
            onChange={(event) => onChange({ ...source, factor: event.target.value === '' ? 1 : Number(event.target.value) })}
            className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      )}
      <div className="flex gap-1">
        {total > 1 && (
          <>
            <button type="button" className={buttonClass('ghost', 'sm')} disabled={index === 0} onClick={() => onMove(-1)} aria-label={t('projectSearch.config.moveSourceUp')}>
              <ArrowUp className="h-4 w-4" />
            </button>
            <button type="button" className={buttonClass('ghost', 'sm')} disabled={index === total - 1} onClick={() => onMove(1)} aria-label={t('projectSearch.config.moveSourceDown')}>
              <ArrowDown className="h-4 w-4" />
            </button>
          </>
        )}
        <button type="button" className={buttonClass('ghost', 'sm')} onClick={onRemove} aria-label={t('projectSearch.config.removeSource')}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
};

const CustomColumnSettings = ({ column, questions, questionOptions, questionById, labelOfQuestion, unitOptions, onChange }) => {
  const { t } = useTranslation();
  const [isAddingSource, setIsAddingSource] = useState(column.sources.length === 0);
  const kind = getColumnKind(column, questions);
  const usedIds = useMemo(() => column.sources.map((source) => source.questionId), [column.sources]);
  const updateSources = (sources) => onChange({ ...column, sources });
  const moveSource = (index, delta) => {
    const next = [...column.sources];
    const target = index + delta;
    if (target < 0 || target >= next.length) {
      return;
    }
    [next[index], next[target]] = [next[target], next[index]];
    updateSources(next);
  };
  const canAddSource = column.sources.length < MAX_COLUMN_SOURCES;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600">
          {t('projectSearch.config.sourcesTitle', { count: column.sources.length })}
        </p>
        {column.sources.length > 0 && (
          <ol className="space-y-2">
            {column.sources.map((source, index) => (
              <SourceRow
                key={`${source.questionId}-${index}`}
                source={source}
                index={index}
                total={column.sources.length}
                question={questionById.get(source.questionId)}
                label={labelOfQuestion(source.questionId)}
                columnId={column.id}
                showFactor={kind === 'number'}
                onChange={(next) => updateSources(column.sources.map((entry, position) => (position === index ? next : entry)))}
                onRemove={() => updateSources(column.sources.filter((_, position) => position !== index))}
                onMove={(delta) => moveSource(index, delta)}
              />
            ))}
          </ol>
        )}
        {canAddSource && (isAddingSource ? (
          <QuestionPicker
            id={`${column.id}-add-source`}
            label={column.sources.length === 0 ? t('projectSearch.config.firstSourceLabel') : t('projectSearch.config.addSourceLabel')}
            options={questionOptions}
            excludeIds={usedIds}
            testId="project-search-source-picker"
            onPick={(questionId) => {
              onChange(addColumnSource(column, questionById.get(questionId)));
              setIsAddingSource(false);
            }}
          />
        ) : (
          <button type="button" className={buttonClass('ghost', 'sm')} onClick={() => setIsAddingSource(true)}>
            <Plus className="h-4 w-4" />
            {t('projectSearch.config.addSource')}
          </button>
        ))}
      </div>
      {(column.sources.length > 1 || kind === 'number') && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {column.sources.length > 1 && (
            <label className="space-y-1" htmlFor={`${column.id}-merge`}>
              <span className="block text-xs font-medium text-gray-600">{t('projectSearch.config.mergeLabel')}</span>
              <select id={`${column.id}-merge`} value={column.merge} onChange={(event) => onChange({ ...column, merge: event.target.value })} className={INPUT_CLASS}>
                {MERGE_MODES.map((mode) => <option key={mode} value={mode}>{t(`projectSearch.config.merge.${mode}`)}</option>)}
              </select>
            </label>
          )}
          {kind === 'number' && (
            <label className="space-y-1" htmlFor={`${column.id}-unit`}>
              <span className="block text-xs font-medium text-gray-600">{t('projectSearch.config.unitLabel')}</span>
              <select id={`${column.id}-unit`} value={column.unit} onChange={(event) => onChange({ ...column, unit: event.target.value })} className={INPUT_CLASS}>
                <option value="">{t('projectSearch.config.noUnit')}</option>
                {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      {kind === 'number' && !column.unit && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900" data-testid="project-search-no-unit-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t('projectSearch.config.noUnitWarning')}
        </p>
      )}
      {(kind === 'number' || column.sources.length > 1) && (
        <p className="text-xs text-gray-500">
          {kind === 'number' ? t('projectSearch.config.numberHint') : t('projectSearch.config.mergeHint')}
        </p>
      )}
    </div>
  );
};

export const ProjectSearchConfigEditor = ({
  isOpen,
  onClose,
  config,
  questions,
  currencies,
  getColumnLabel,
  getDefaultColumnLabel,
  onChange,
  onReset,
  hasPersonalConfig,
  storageNotice,
  canEditDefaults,
  hasAdminDefault,
  adminNotice,
  onPublishAsDefault,
  onClearDefault,
  publishControl
}) => {
  const { t, language } = useTranslation();
  const dialogRef = useModalDialog({ isOpen, onClose });
  const { containerRef, prepareMove, announcement } = useReorderFeedback('project-search-column');
  const [expandedId, setExpandedId] = useState('');
  const [revealId, setRevealId] = useState('');
  const rowRefs = useRef(new Map());
  const questionOptions = useMemo(() => listSearchableQuestions(questions, language), [questions, language]);
  const questionById = useMemo(() => new Map((Array.isArray(questions) ? questions : []).map((question) => [String(question.id), question])), [questions]);
  const optionLabelById = useMemo(() => new Map(questionOptions.map((option) => [option.id, option.label])), [questionOptions]);
  const labelOfQuestion = (questionId) => optionLabelById.get(questionId) || questionId;
  const unitOptions = useMemo(() => {
    const units = new Set((Array.isArray(currencies) ? currencies : []).map((entry) => entry?.unit).filter(Boolean));
    config.columns.forEach((column) => {
      if (column.unit) {
        units.add(column.unit);
      }
    });
    return Array.from(units);
  }, [config.columns, currencies]);
  const numberColumns = config.columns.filter((column) => getColumnKind(column, questions) === 'number');
  const missingBuiltins = BUILTIN_COLUMN_IDS.filter((builtinId) => !config.columns.some((column) => column.kind === 'builtin' && column.builtinId === builtinId));
  const singleSourceIds = useMemo(() => config.columns
    .filter((column) => column.kind === 'custom' && column.sources.length === 1)
    .map((column) => column.sources[0].questionId), [config.columns]);
  const isFull = config.columns.length >= MAX_PROJECT_SEARCH_COLUMNS;

  useEffect(() => {
    if (!revealId) {
      return;
    }
    const node = rowRefs.current.get(revealId);
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    setRevealId('');
  }, [revealId]);

  if (!isOpen) {
    return null;
  }

  const updateColumns = (columns) => {
    const ids = new Set(columns.map((column) => column.id));
    onChange({
      ...config,
      columns,
      kpiColumnId: ids.has(config.kpiColumnId) ? config.kpiColumnId : '',
      charts: config.charts.filter((chart) => ids.has(chart.groupBy) || chart.groupBy.startsWith('builtin-'))
        .map((chart) => (chart.measure !== 'count' && !ids.has(chart.measureColumnId) ? { ...chart, measure: 'count', measureColumnId: '' } : chart))
    });
  };
  const updateColumn = (next) => updateColumns(config.columns.map((column) => (column.id === next.id ? next : column)));
  const moveColumn = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= config.columns.length) {
      return;
    }
    const next = [...config.columns];
    [next[index], next[target]] = [next[target], next[index]];
    prepareMove(next[target].id, { announce: t('common.feedback.movedPosition', { position: target + 1, total: next.length }) });
    updateColumns(next);
  };
  const appendColumn = (column, { expand = false } = {}) => {
    if (!column || isFull) {
      return;
    }
    updateColumns([...config.columns, column]);
    setExpandedId(expand ? column.id : '');
    setRevealId(column.id);
  };

  const describeColumn = (column) => {
    if (column.kind === 'builtin') {
      return t('projectSearch.config.builtinSummary');
    }
    const kindLabel = t(`projectSearch.config.kinds.${getColumnKind(column, questions)}`);
    if (column.sources.length === 0) {
      return t('projectSearch.config.noSourceSummary');
    }
    if (column.sources.length === 1) {
      const questionLabel = labelOfQuestion(column.sources[0].questionId);
      return column.label ? `${kindLabel} · ${questionLabel}` : kindLabel;
    }
    return `${kindLabel} · ${t('projectSearch.config.mergedSummary', { count: column.sources.length, mode: t(`projectSearch.config.mergeShort.${column.merge}`) })}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      style={{ marginTop: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-search-config-title"
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-xl"
        data-testid="project-search-config"
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div className="space-y-1">
            <h3 id="project-search-config-title" className="text-lg font-semibold text-gray-800">{t('projectSearch.config.title')}</h3>
            <p className="text-sm text-gray-600">{t('projectSearch.config.subtitle')}</p>
          </div>
          <button type="button" className={buttonClass('ghost', 'sm')} onClick={onClose} aria-label={t('projectSearch.config.close')}>
            <Close className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
          <section className="space-y-2" aria-labelledby="project-search-config-columns-title">
            <div className="flex items-baseline justify-between gap-2">
              <h4 id="project-search-config-columns-title" className="font-semibold text-gray-800">
                {t('projectSearch.config.columnsTitle', { count: config.columns.length })}
              </h4>
              <span className="text-xs text-gray-500">{t('projectSearch.config.columnsHint')}</span>
            </div>
            <span className="sr-only" aria-live="polite">{announcement}</span>
            <ol ref={containerRef} className="space-y-2">
              {config.columns.map((column, index) => {
                const name = getColumnLabel(column);
                const isExpanded = expandedId === column.id;
                const hasMissing = getMissingColumnSources(column, questions).length > 0 || (column.kind === 'custom' && column.sources.length === 0);
                const panelId = `${column.id}-settings`;
                return (
                  <li
                    key={column.id}
                    ref={(node) => {
                      if (node) {
                        rowRefs.current.set(column.id, node);
                      } else {
                        rowRefs.current.delete(column.id);
                      }
                    }}
                    data-reorder-project-search-column-key={column.id}
                    className={`rounded-lg border bg-white ${isExpanded ? 'border-blue-300 shadow-sm' : 'border-gray-200'}`}
                    data-testid="project-search-config-column"
                  >
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="w-6 shrink-0 text-right text-xs font-semibold text-gray-400" aria-hidden="true">{index + 1}</span>
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        aria-expanded={isExpanded}
                        aria-controls={panelId}
                        onClick={() => setExpandedId(isExpanded ? '' : column.id)}
                      >
                        <span className="block truncate text-sm font-medium text-gray-800">{name}</span>
                        <span className="block truncate text-xs text-gray-500">{describeColumn(column)}</span>
                      </button>
                      {hasMissing && (
                        <span className="shrink-0 text-amber-600" title={t('projectSearch.config.columnNeedsAttention')}>
                          <AlertTriangle className="h-4 w-4" />
                          <span className="sr-only">{t('projectSearch.config.columnNeedsAttention')}</span>
                        </span>
                      )}
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className={buttonClass(isExpanded ? 'subtle' : 'ghost', 'sm')}
                          aria-expanded={isExpanded}
                          aria-controls={panelId}
                          onClick={() => setExpandedId(isExpanded ? '' : column.id)}
                          aria-label={t('projectSearch.config.editColumn', { name })}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button type="button" data-reorder-project-search-column-action="up" className={buttonClass('ghost', 'sm')} disabled={index === 0} onClick={() => moveColumn(index, -1)} aria-label={t('projectSearch.config.moveUp', { name })}>
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button type="button" data-reorder-project-search-column-action="down" className={buttonClass('ghost', 'sm')} disabled={index === config.columns.length - 1} onClick={() => moveColumn(index, 1)} aria-label={t('projectSearch.config.moveDown', { name })}>
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button type="button" className={buttonClass('ghost', 'sm')} disabled={config.columns.length <= 1} onClick={() => updateColumns(config.columns.filter((entry) => entry.id !== column.id))} aria-label={t('projectSearch.config.removeColumn', { name })}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div id={panelId} className="space-y-3 border-t border-gray-100 px-3 py-3">
                        {getMissingColumnSources(column, questions).length > 0 && (
                          <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900" data-testid="project-search-missing-sources">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            {t('projectSearch.config.missingSources', { ids: getMissingColumnSources(column, questions).join(', ') })}
                          </p>
                        )}
                        <label className="block space-y-1" htmlFor={`${column.id}-label`}>
                          <span className="block text-xs font-medium text-gray-600">{t('projectSearch.config.columnNameLabel')}</span>
                          <input
                            id={`${column.id}-label`}
                            type="text"
                            value={column.label}
                            placeholder={getDefaultColumnLabel(column)}
                            onChange={(event) => updateColumn({ ...column, label: event.target.value })}
                            className={INPUT_CLASS}
                            aria-label={t('projectSearch.config.columnNameAria', { name })}
                          />
                          <span className="block text-xs text-gray-500">{t('projectSearch.config.columnNameHint')}</span>
                        </label>
                        {column.kind === 'custom' && (
                          <CustomColumnSettings
                            column={column}
                            questions={questions}
                            questionOptions={questionOptions}
                            questionById={questionById}
                            labelOfQuestion={labelOfQuestion}
                            unitOptions={unitOptions}
                            onChange={updateColumn}
                          />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4" aria-labelledby="project-search-config-add-title">
            <div className="space-y-1">
              <h4 id="project-search-config-add-title" className="font-semibold text-gray-800">{t('projectSearch.config.addTitle')}</h4>
              {isFull && <p className="text-xs text-amber-800">{t('projectSearch.config.fullHint', { count: MAX_PROJECT_SEARCH_COLUMNS })}</p>}
            </div>
            {!isFull && (
              <>
                <QuestionPicker
                  id="project-search-add-question"
                  label={t('projectSearch.config.addQuestionLabel')}
                  options={questionOptions}
                  excludeIds={singleSourceIds}
                  testId="project-search-question-picker"
                  onPick={(questionId) => appendColumn(buildQuestionColumn(questionById.get(questionId)))}
                />
                {missingBuiltins.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-600">{t('projectSearch.config.addBuiltinLabel')}</p>
                    <div className="flex flex-wrap gap-2">
                      {missingBuiltins.map((builtinId) => (
                        <button
                          key={builtinId}
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                          onClick={() => appendColumn({ id: `builtin-${builtinId}`, kind: 'builtin', builtinId, label: '' })}
                          aria-label={t('projectSearch.config.addBuiltinAria', { name: t(`projectSearch.columns.${builtinId}`) })}
                        >
                          <Plus className="h-4 w-4" />
                          {t(`projectSearch.columns.${builtinId}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <button
                    type="button"
                    className={buttonClass('ghost', 'sm')}
                    onClick={() => appendColumn({ id: createProjectSearchId('col'), kind: 'custom', label: '', sources: [], merge: 'first', unit: '' }, { expand: true })}
                    data-testid="project-search-add-custom-column"
                  >
                    <Plus className="h-4 w-4" />
                    {t('projectSearch.config.addCustomColumn')}
                  </button>
                  <p className="text-xs text-gray-500">{t('projectSearch.config.addCustomColumnHint')}</p>
                </div>
              </>
            )}
          </section>

          <section className="space-y-2" aria-labelledby="project-search-config-kpi-title">
            <h4 id="project-search-config-kpi-title" className="font-semibold text-gray-800">{t('projectSearch.config.kpiTitle')}</h4>
            <label className="block max-w-md space-y-1" htmlFor="project-search-kpi-column">
              <span className="block text-xs font-medium text-gray-600">{t('projectSearch.config.kpiLabel')}</span>
              <select id="project-search-kpi-column" value={config.kpiColumnId} onChange={(event) => onChange({ ...config, kpiColumnId: event.target.value })} className={INPUT_CLASS}>
                <option value="">{t('projectSearch.config.kpiNone')}</option>
                {numberColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.unit ? `${getColumnLabel(column)} (${column.unit})` : t('projectSearch.config.kpiNoUnitOption', { name: getColumnLabel(column) })}
                  </option>
                ))}
              </select>
            </label>
            {numberColumns.length === 0 && <p className="text-xs text-gray-500">{t('projectSearch.config.kpiNoNumberColumn')}</p>}
          </section>

          {canEditDefaults && (
            <section className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4" data-testid="project-search-admin-default" aria-labelledby="project-search-config-admin-title">
              <h4 id="project-search-config-admin-title" className="font-semibold text-blue-900">{t('projectSearch.config.adminTitle')}</h4>
              <p className="text-sm text-blue-900">
                {hasAdminDefault ? t('projectSearch.config.adminHasDefault') : t('projectSearch.config.adminNoDefault')}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={buttonClass('primary', 'sm')} onClick={onPublishAsDefault} data-testid="project-search-publish-default">
                  {t('projectSearch.config.adminPublish')}
                </button>
                {hasAdminDefault && (
                  <button type="button" className={buttonClass('secondary', 'sm')} onClick={onClearDefault}>
                    {t('projectSearch.config.adminClear')}
                  </button>
                )}
              </div>
              {adminNotice && <p className="rounded-lg border border-emerald-200 bg-white p-2 text-sm text-emerald-800" role="status">{adminNotice}</p>}
              {publishControl}
            </section>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="min-w-0 text-xs text-gray-600 sm:flex-1" data-testid="project-search-storage-notice">{storageNotice}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={buttonClass('secondary', 'sm')} onClick={onReset} disabled={!hasPersonalConfig}>
              {t('projectSearch.config.reset')}
            </button>
            <button type="button" className={buttonClass('primary', 'sm')} onClick={onClose}>
              {t('projectSearch.config.done')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ProjectSearchConfigEditor;
