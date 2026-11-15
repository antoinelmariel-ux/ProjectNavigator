import React, { useMemo, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { AlertTriangle, ArrowDown, ArrowUp, Plus, Trash2 } from '../icons.js';
import { buttonClass } from '../../utils/buttonStyles.js';
import { useReorderFeedback } from '../../hooks/useReorderFeedback.js';
import {
  BUILTIN_COLUMN_IDS,
  MAX_COLUMN_SOURCES,
  MAX_PROJECT_SEARCH_COLUMNS,
  MERGE_MODES,
  createProjectSearchId,
  getColumnKind,
  getMissingColumnSources,
  listSearchableQuestions
} from '../../utils/projectSearch.js';

const INPUT_CLASS = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm';

const SourceRow = ({ source, index, total, questionOptions, questionById, columnId, onChange, onRemove, onMove, showFactor }) => {
  const { t } = useTranslation();
  const question = questionById.get(source.questionId);
  const selectId = `${columnId}-source-${index}`;
  return (
    <li className="flex flex-wrap items-end gap-2">
      <label className="min-w-0 flex-1 space-y-1" htmlFor={selectId}>
        <span className="block text-xs font-medium text-gray-600">{t('projectSearch.config.sourceLabel', { index: index + 1 })}</span>
        <select id={selectId} value={source.questionId} onChange={(event) => onChange({ ...source, questionId: event.target.value })} className={INPUT_CLASS}>
          {!question && <option value={source.questionId}>{t('projectSearch.config.missingQuestionOption', { id: source.questionId })}</option>}
          {questionOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </label>
      {showFactor && (
        <label className="w-28 space-y-1" htmlFor={`${selectId}-factor`}>
          <span className="block text-xs font-medium text-gray-600">{t('projectSearch.config.factorLabel')}</span>
          <input
            id={`${selectId}-factor`}
            type="number"
            step="any"
            value={source.factor}
            onChange={(event) => onChange({ ...source, factor: event.target.value === '' ? 1 : Number(event.target.value) })}
            className={INPUT_CLASS}
          />
        </label>
      )}
      <div className="flex gap-1">
        <button type="button" className={buttonClass('ghost', 'sm')} disabled={index === 0} onClick={() => onMove(-1)} aria-label={t('projectSearch.config.moveSourceUp')}>
          <ArrowUp className="h-4 w-4" />
        </button>
        <button type="button" className={buttonClass('ghost', 'sm')} disabled={index === total - 1} onClick={() => onMove(1)} aria-label={t('projectSearch.config.moveSourceDown')}>
          <ArrowDown className="h-4 w-4" />
        </button>
        <button type="button" className={buttonClass('ghost', 'sm')} onClick={onRemove} aria-label={t('projectSearch.config.removeSource')}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
};

const CustomColumnSettings = ({ column, questions, questionOptions, questionById, unitOptions, onChange }) => {
  const { t } = useTranslation();
  const [newSourceId, setNewSourceId] = useState('');
  const kind = getColumnKind(column, questions);
  const missing = getMissingColumnSources(column, questions);
  const usedIds = new Set(column.sources.map((source) => source.questionId));
  const addable = questionOptions.filter((option) => !usedIds.has(option.id));
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
  const addSourceId = `${column.id}-add-source`;

  return (
    <div className="space-y-3">
      {missing.length > 0 && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900" data-testid="project-search-missing-sources">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t('projectSearch.config.missingSources', { ids: missing.join(', ') })}
        </p>
      )}
      <ol className="space-y-2">
        {column.sources.map((source, index) => (
          <SourceRow
            key={`${source.questionId}-${index}`}
            source={source}
            index={index}
            total={column.sources.length}
            columnId={column.id}
            questionOptions={questionOptions.filter((option) => option.id === source.questionId || !usedIds.has(option.id))}
            questionById={questionById}
            showFactor={kind === 'number'}
            onChange={(next) => updateSources(column.sources.map((entry, position) => (position === index ? next : entry)))}
            onRemove={() => updateSources(column.sources.filter((_, position) => position !== index))}
            onMove={(delta) => moveSource(index, delta)}
          />
        ))}
      </ol>
      {column.sources.length < MAX_COLUMN_SOURCES && addable.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 space-y-1" htmlFor={addSourceId}>
            <span className="block text-xs font-medium text-gray-600">{t('projectSearch.config.addSourceLabel')}</span>
            <select id={addSourceId} value={newSourceId} onChange={(event) => setNewSourceId(event.target.value)} className={INPUT_CLASS}>
              <option value="">{t('projectSearch.config.chooseQuestion')}</option>
              {addable.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <button
            type="button"
            className={buttonClass('secondary', 'sm')}
            disabled={!newSourceId}
            onClick={() => {
              updateSources([...column.sources, { questionId: newSourceId, factor: 1 }]);
              setNewSourceId('');
            }}
          >
            <Plus className="h-4 w-4" />
            {t('projectSearch.config.addSource')}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
      <p className="text-xs text-gray-500">
        {kind === 'number'
          ? t('projectSearch.config.numberHint')
          : column.sources.length > 1
            ? t('projectSearch.config.mergeHint')
            : t('projectSearch.config.singleSourceHint')}
      </p>
    </div>
  );
};

export const ProjectSearchConfigEditor = ({
  config,
  questions,
  currencies,
  getColumnLabel,
  getDefaultColumnLabel,
  onChange,
  onReset,
  hasPersonalConfig,
  canEditDefaults,
  hasAdminDefault,
  onPublishAsDefault,
  onClearDefault,
  publishControl
}) => {
  const { t, language } = useTranslation();
  const { containerRef, prepareMove, announcement } = useReorderFeedback('project-search-column');
  const [newBuiltin, setNewBuiltin] = useState('');
  const questionOptions = useMemo(() => listSearchableQuestions(questions, language), [questions, language]);
  const questionById = useMemo(() => new Map((Array.isArray(questions) ? questions : []).map((question) => [String(question.id), question])), [questions]);
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
  const isFull = config.columns.length >= MAX_PROJECT_SEARCH_COLUMNS;

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

  return (
    <section className="space-y-5 rounded-xl border border-gray-200 bg-gray-50 p-4" aria-labelledby="project-search-config-title" data-testid="project-search-config">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 id="project-search-config-title" className="text-lg font-semibold text-gray-800">{t('projectSearch.config.title')}</h3>
          <p className="text-sm text-gray-600">{t('projectSearch.config.subtitle')}</p>
        </div>
        <button type="button" className={buttonClass('secondary', 'sm')} onClick={onReset} disabled={!hasPersonalConfig}>
          {t('projectSearch.config.reset')}
        </button>
      </header>

      <div ref={containerRef} className="space-y-3">
        <span className="sr-only" aria-live="polite">{announcement}</span>
        {config.columns.map((column, index) => {
          const labelId = `${column.id}-label`;
          return (
            <article
              key={column.id}
              data-reorder-project-search-column-key={column.id}
              className="space-y-3 rounded-lg border border-gray-200 bg-white p-3"
              data-testid="project-search-config-column"
            >
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-0 flex-1 space-y-1" htmlFor={labelId}>
                  <span className="block text-xs font-medium text-gray-600">
                    {column.kind === 'builtin' ? t('projectSearch.config.builtinColumnLabel') : t('projectSearch.config.customColumnLabel')}
                  </span>
                  <input
                    id={labelId}
                    type="text"
                    value={column.label}
                    placeholder={getDefaultColumnLabel(column)}
                    onChange={(event) => updateColumn({ ...column, label: event.target.value })}
                    className={INPUT_CLASS}
                    aria-label={t('projectSearch.config.columnNameAria', { name: getColumnLabel(column) })}
                  />
                </label>
                <div className="flex gap-1">
                  <button type="button" data-reorder-project-search-column-action="up" className={buttonClass('ghost', 'sm')} disabled={index === 0} onClick={() => moveColumn(index, -1)} aria-label={t('projectSearch.config.moveUp', { name: getColumnLabel(column) })}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" data-reorder-project-search-column-action="down" className={buttonClass('ghost', 'sm')} disabled={index === config.columns.length - 1} onClick={() => moveColumn(index, 1)} aria-label={t('projectSearch.config.moveDown', { name: getColumnLabel(column) })}>
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" className={buttonClass('ghost', 'sm')} disabled={config.columns.length <= 1} onClick={() => updateColumns(config.columns.filter((entry) => entry.id !== column.id))} aria-label={t('projectSearch.config.removeColumn', { name: getColumnLabel(column) })}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {column.kind === 'custom' && (
                <CustomColumnSettings
                  column={column}
                  questions={questions}
                  questionOptions={questionOptions}
                  questionById={questionById}
                  unitOptions={unitOptions}
                  onChange={updateColumn}
                />
              )}
            </article>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <button
          type="button"
          className={buttonClass('secondary', 'sm')}
          disabled={isFull}
          onClick={() => updateColumns([...config.columns, { id: createProjectSearchId('col'), kind: 'custom', label: '', sources: [], merge: 'first', unit: '' }])}
          data-testid="project-search-add-custom-column"
        >
          <Plus className="h-4 w-4" />
          {t('projectSearch.config.addCustomColumn')}
        </button>
        {missingBuiltins.length > 0 && (
          <>
            <label className="space-y-1" htmlFor="project-search-add-builtin">
              <span className="block text-xs font-medium text-gray-600">{t('projectSearch.config.addBuiltinLabel')}</span>
              <select id="project-search-add-builtin" value={newBuiltin} onChange={(event) => setNewBuiltin(event.target.value)} className={INPUT_CLASS}>
                <option value="">{t('projectSearch.config.chooseBuiltin')}</option>
                {missingBuiltins.map((builtinId) => (
                  <option key={builtinId} value={builtinId}>{t(`projectSearch.columns.${builtinId}`)}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={buttonClass('secondary', 'sm')}
              disabled={!newBuiltin || isFull}
              onClick={() => {
                updateColumns([...config.columns, { id: `builtin-${newBuiltin}`, kind: 'builtin', builtinId: newBuiltin, label: '' }]);
                setNewBuiltin('');
              }}
            >
              <Plus className="h-4 w-4" />
              {t('projectSearch.config.addBuiltin')}
            </button>
          </>
        )}
      </div>

      <label className="block max-w-md space-y-1" htmlFor="project-search-kpi-column">
        <span className="block text-sm font-medium text-gray-700">{t('projectSearch.config.kpiLabel')}</span>
        <select id="project-search-kpi-column" value={config.kpiColumnId} onChange={(event) => onChange({ ...config, kpiColumnId: event.target.value })} className={INPUT_CLASS}>
          <option value="">{t('projectSearch.config.kpiNone')}</option>
          {numberColumns.map((column) => <option key={column.id} value={column.id}>{getColumnLabel(column)}</option>)}
        </select>
      </label>

      {canEditDefaults && (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3" data-testid="project-search-admin-default">
          <h4 className="font-semibold text-blue-900">{t('projectSearch.config.adminTitle')}</h4>
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
          {publishControl}
        </div>
      )}
    </section>
  );
};

export default ProjectSearchConfigEditor;
