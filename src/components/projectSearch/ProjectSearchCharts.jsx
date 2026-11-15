import React, { useMemo, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { Edit, Plus, Trash2 } from '../icons.js';
import { buttonClass } from '../../utils/buttonStyles.js';
import {
  BUILTIN_COLUMN_IDS,
  CHART_TYPES,
  DATE_BUCKETS,
  EMPTY_FILTER_VALUE,
  OTHER_GROUP_KEY,
  computeProjectSearchChartData,
  createProjectSearchId,
  formatProjectSearchNumber,
  getColumnKind
} from '../../utils/projectSearch.js';

// Palette catégorielle de référence (ordre fixe, jamais recyclée) : au-delà de huit parts, un
// anneau regroupe le reste dans « Autres ».
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const OTHER_COLOR = '#9ca3af';
const MAX_DONUT_SLICES = SERIES_COLORS.length;

const foldForDonut = (entries, measure) => {
  if (entries.length <= MAX_DONUT_SLICES) {
    return entries;
  }
  const kept = entries.filter((entry) => entry.key !== OTHER_GROUP_KEY).slice(0, MAX_DONUT_SLICES - 1);
  const keptKeys = new Set(kept.map((entry) => entry.key));
  const rest = entries.filter((entry) => !keptKeys.has(entry.key));
  const count = rest.reduce((total, entry) => total + entry.count, 0);
  const value = measure === 'avg'
    ? rest.reduce((total, entry) => total + entry.value * entry.count, 0) / (count || 1)
    : rest.reduce((total, entry) => total + entry.value, 0);
  return [...kept, { key: OTHER_GROUP_KEY, label: '', value, count }];
};

const DonutChart = ({ entries, formatValue, labelOf, title }) => {
  const total = entries.reduce((sum, entry) => sum + Math.max(entry.value, 0), 0);
  const radius = 15.915;
  let offset = 25;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <svg viewBox="0 0 42 42" className="h-36 w-36 shrink-0" role="img" aria-label={title}>
        <circle cx="21" cy="21" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="6" />
        {total > 0 && entries.map((entry, index) => {
          const share = (Math.max(entry.value, 0) / total) * 100;
          if (share <= 0) {
            return null;
          }
          const gap = entries.length > 1 ? Math.min(0.6, share / 2) : 0;
          const segment = (
            <circle
              key={entry.key}
              cx="21"
              cy="21"
              r={radius}
              fill="none"
              stroke={entry.key === OTHER_GROUP_KEY ? OTHER_COLOR : SERIES_COLORS[index % SERIES_COLORS.length]}
              strokeWidth="6"
              strokeDasharray={`${share - gap} ${100 - share + gap}`}
              strokeDashoffset={offset}
            >
              <title>{`${labelOf(entry)} : ${formatValue(entry.value)}`}</title>
            </circle>
          );
          offset -= share;
          return segment;
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1 text-sm">
        {entries.map((entry, index) => (
          <li key={entry.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: entry.key === OTHER_GROUP_KEY ? OTHER_COLOR : SERIES_COLORS[index % SERIES_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-gray-700" title={labelOf(entry)}>{labelOf(entry)}</span>
            <span className="font-semibold text-gray-900">{formatValue(entry.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const BarChart = ({ entries, formatValue, labelOf }) => {
  const max = entries.reduce((highest, entry) => Math.max(highest, entry.value), 0);
  return (
    <ul className="space-y-2 text-sm">
      {entries.map((entry) => {
        const width = max > 0 ? Math.max((entry.value / max) * 100, entry.value > 0 ? 1.5 : 0) : 0;
        return (
          <li key={entry.key} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2" title={`${labelOf(entry)} : ${formatValue(entry.value)}`}>
            <span className="truncate text-gray-700">{labelOf(entry)}</span>
            <span className="h-3 rounded bg-gray-100">
              <span className="block h-3 rounded" style={{ width: `${width}%`, backgroundColor: entry.key === OTHER_GROUP_KEY ? OTHER_COLOR : SERIES_COLORS[0] }} />
            </span>
            <span className="text-right font-semibold text-gray-900">{formatValue(entry.value)}</span>
          </li>
        );
      })}
    </ul>
  );
};

const ChartEditor = ({ chart, columns, numberColumns, getColumnLabel, groupKind, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(chart);
  const update = (patch) => setDraft((previous) => ({ ...previous, ...patch }));
  const groupColumns = [...columns, ...BUILTIN_COLUMN_IDS
    .filter((builtinId) => !columns.some((column) => column.id === `builtin-${builtinId}`))
    .map((builtinId) => ({ id: `builtin-${builtinId}`, kind: 'builtin', builtinId, label: '' }))];
  const canSave = Boolean(draft.groupBy) && (draft.measure === 'count' || Boolean(draft.measureColumnId));
  const idPrefix = `chart-editor-${chart.id}`;
  return (
    <form
      className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) {
          onSave(draft);
        }
      }}
      data-testid="project-search-chart-editor"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1" htmlFor={`${idPrefix}-title`}>
          <span className="block font-medium text-gray-700">{t('projectSearch.charts.titleLabel')}</span>
          <input id={`${idPrefix}-title`} type="text" value={draft.title} onChange={(event) => update({ title: event.target.value })} placeholder={t('projectSearch.charts.titlePlaceholder')} className="w-full rounded-lg border border-gray-300 px-3 py-1.5" />
        </label>
        <label className="space-y-1" htmlFor={`${idPrefix}-type`}>
          <span className="block font-medium text-gray-700">{t('projectSearch.charts.typeLabel')}</span>
          <select id={`${idPrefix}-type`} value={draft.type} onChange={(event) => update({ type: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-1.5">
            {CHART_TYPES.map((type) => <option key={type} value={type}>{t(`projectSearch.charts.type.${type}`)}</option>)}
          </select>
        </label>
        <label className="space-y-1" htmlFor={`${idPrefix}-group`}>
          <span className="block font-medium text-gray-700">{t('projectSearch.charts.groupByLabel')}</span>
          <select id={`${idPrefix}-group`} value={draft.groupBy} onChange={(event) => update({ groupBy: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-1.5">
            <option value="">{t('projectSearch.charts.chooseColumn')}</option>
            {groupColumns.map((column) => <option key={column.id} value={column.id}>{getColumnLabel(column)}</option>)}
          </select>
        </label>
        {groupKind(draft.groupBy) === 'date' && (
          <label className="space-y-1" htmlFor={`${idPrefix}-bucket`}>
            <span className="block font-medium text-gray-700">{t('projectSearch.charts.bucketLabel')}</span>
            <select id={`${idPrefix}-bucket`} value={draft.dateBucket} onChange={(event) => update({ dateBucket: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-1.5">
              {DATE_BUCKETS.map((bucket) => <option key={bucket} value={bucket}>{t(`projectSearch.charts.bucket.${bucket}`)}</option>)}
            </select>
          </label>
        )}
        <label className="space-y-1" htmlFor={`${idPrefix}-measure`}>
          <span className="block font-medium text-gray-700">{t('projectSearch.charts.measureLabel')}</span>
          <select
            id={`${idPrefix}-measure`}
            value={draft.measure}
            onChange={(event) => update({ measure: event.target.value, measureColumnId: event.target.value === 'count' ? '' : (draft.measureColumnId || numberColumns[0]?.id || '') })}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5"
          >
            <option value="count">{t('projectSearch.charts.measure.count')}</option>
            {numberColumns.length > 0 && <option value="sum">{t('projectSearch.charts.measure.sum')}</option>}
            {numberColumns.length > 0 && <option value="avg">{t('projectSearch.charts.measure.avg')}</option>}
          </select>
        </label>
        {draft.measure !== 'count' && (
          <label className="space-y-1" htmlFor={`${idPrefix}-measure-column`}>
            <span className="block font-medium text-gray-700">{t('projectSearch.charts.measureColumnLabel')}</span>
            <select id={`${idPrefix}-measure-column`} value={draft.measureColumnId} onChange={(event) => update({ measureColumnId: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-1.5">
              {numberColumns.map((column) => <option key={column.id} value={column.id}>{getColumnLabel(column)}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={buttonClass('primary', 'sm')} disabled={!canSave}>{t('projectSearch.charts.save')}</button>
        <button type="button" className={buttonClass('secondary', 'sm')} onClick={onCancel}>{t('projectSearch.cancel')}</button>
      </div>
    </form>
  );
};

export const ProjectSearchCharts = ({ rows, config, questions, getColumnLabel, onChangeCharts, scopeLabel }) => {
  const { t, language } = useTranslation();
  const [editingId, setEditingId] = useState(null);
  const [newChart, setNewChart] = useState(null);
  const columns = config.columns;
  const allColumns = useMemo(() => [...columns, ...BUILTIN_COLUMN_IDS
    .filter((builtinId) => !columns.some((column) => column.id === `builtin-${builtinId}`))
    .map((builtinId) => ({ id: `builtin-${builtinId}`, kind: 'builtin', builtinId, label: '' }))], [columns]);
  const numberColumns = useMemo(() => columns.filter((column) => getColumnKind(column, questions) === 'number'), [columns, questions]);
  const groupKind = (columnId) => getColumnKind(allColumns.find((column) => column.id === columnId), questions);
  const charts = config.charts;

  const labelOf = (entry) => {
    if (entry.key === EMPTY_FILTER_VALUE) {
      return t('projectSearch.emptyValue');
    }
    if (entry.key === OTHER_GROUP_KEY) {
      return t('projectSearch.charts.otherGroup');
    }
    return entry.label;
  };

  const describeChart = (chart) => {
    const group = allColumns.find((column) => column.id === chart.groupBy);
    const measureColumn = allColumns.find((column) => column.id === chart.measureColumnId);
    if (chart.measure === 'count') {
      return t('projectSearch.charts.autoTitleCount', { group: group ? getColumnLabel(group) : '' });
    }
    return t(`projectSearch.charts.autoTitle.${chart.measure}`, {
      measure: measureColumn ? getColumnLabel(measureColumn) : '',
      group: group ? getColumnLabel(group) : ''
    });
  };

  const saveChart = (chart) => {
    const exists = charts.some((entry) => entry.id === chart.id);
    onChangeCharts(exists ? charts.map((entry) => (entry.id === chart.id ? chart : entry)) : [...charts, chart]);
    setEditingId(null);
    setNewChart(null);
  };

  return (
    <section className="space-y-4" aria-labelledby="project-search-charts-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="project-search-charts-title" className="text-lg font-semibold text-gray-800">{t('projectSearch.charts.title')}</h3>
          <p className="text-sm text-gray-600">{scopeLabel}</p>
        </div>
        {!newChart && (
          <button
            type="button"
            className={buttonClass('secondary', 'sm')}
            onClick={() => setNewChart({ id: createProjectSearchId('chart'), title: '', type: 'bar', groupBy: 'builtin-status', dateBucket: 'month', measure: 'count', measureColumnId: '' })}
            data-testid="project-search-add-chart"
          >
            <Plus className="h-4 w-4" />
            {t('projectSearch.charts.add')}
          </button>
        )}
      </div>

      {newChart && (
        <ChartEditor
          chart={newChart}
          columns={columns}
          numberColumns={numberColumns}
          getColumnLabel={getColumnLabel}
          groupKind={groupKind}
          onSave={saveChart}
          onCancel={() => setNewChart(null)}
        />
      )}

      {charts.length === 0 && !newChart && (
        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">{t('projectSearch.charts.empty')}</p>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {charts.map((chart) => {
          if (editingId === chart.id) {
            return (
              <ChartEditor
                key={chart.id}
                chart={chart}
                columns={columns}
                numberColumns={numberColumns}
                getColumnLabel={getColumnLabel}
                groupKind={groupKind}
                onSave={saveChart}
                onCancel={() => setEditingId(null)}
              />
            );
          }
          const data = computeProjectSearchChartData(rows, chart, { columns, questions, language });
          const entries = chart.type === 'donut' ? foldForDonut(data, chart.measure) : data;
          const measureColumn = allColumns.find((column) => column.id === chart.measureColumnId);
          const unit = chart.measure === 'count' ? '' : (measureColumn?.unit || '');
          const formatValue = (value) => {
            const formatted = formatProjectSearchNumber(value, language);
            return unit ? `${formatted}\u00a0${unit}` : formatted;
          };
          const title = chart.title || describeChart(chart);
          return (
            <article key={chart.id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm" data-testid="project-search-chart">
              <header className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-gray-800">{title}</h4>
                <div className="flex shrink-0 gap-1">
                  <button type="button" className={buttonClass('ghost', 'sm')} onClick={() => setEditingId(chart.id)} aria-label={t('projectSearch.charts.edit', { title })}>
                    <Edit className="h-4 w-4" />
                  </button>
                  <button type="button" className={buttonClass('ghost', 'sm')} onClick={() => onChangeCharts(charts.filter((entry) => entry.id !== chart.id))} aria-label={t('projectSearch.charts.remove', { title })}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </header>
              {entries.length === 0 ? (
                <p className="text-sm text-gray-500">{t('projectSearch.charts.noData')}</p>
              ) : chart.type === 'donut' ? (
                <DonutChart entries={entries} formatValue={formatValue} labelOf={labelOf} title={title} />
              ) : (
                <BarChart entries={entries} formatValue={formatValue} labelOf={labelOf} />
              )}
              {rows.some((row) => (row.cells[chart.groupBy]?.values?.length || 0) > 1) && (
                <p className="text-xs text-gray-500">{t('projectSearch.charts.multiValueHint')}</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ProjectSearchCharts;
