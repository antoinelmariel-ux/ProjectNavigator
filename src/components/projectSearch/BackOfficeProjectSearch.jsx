import React, { useCallback, useEffect, useMemo, useRef, useState } from '../../react.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { AlertTriangle, ChevronDown, Close, Download, Eye, Search, Settings } from '../icons.js';
import { buttonClass } from '../../utils/buttonStyles.js';
import { requestConfirmation } from '../ConfirmDialog.jsx';
import { resolveLocalizedText } from '../../utils/localizedContent.js';
import { foldSearchText } from '../../utils/adminProjectSearch.js';
import { computeProjectValidationStatus } from '../../utils/projectValidationStatus.js';
import { encodeShowcaseShareToken, SHOWCASE_SHARE_PARAM } from '../../utils/showcaseShareLink.js';
import { isSharePointMode, withWebViewEnv } from '../../config/sharepointConfig.js';
import { projectSearchConfigStore } from '../../utils/projectSearchConfigProvider.js';
import { buildXlsxWorkbook, XLSX_MIME_TYPE } from '../../utils/xlsxWriter.js';
import {
  BUILTIN_COLUMNS,
  EMPTY_FILTER_VALUE,
  buildProjectSearchContext,
  buildProjectSearchExportRows,
  buildProjectSearchRows,
  computeProjectSearchTotals,
  countActiveFilters,
  filterProjectSearchRows,
  formatProjectSearchDate,
  formatProjectSearchNumber,
  getColumnKind,
  listActiveFilterIds,
  listColumnFilterValues,
  normalizeProjectSearchConfig,
  resolveProjectSearchConfig,
  sortProjectSearchRows
} from '../../utils/projectSearch.js';
import { ProjectSearchCharts } from './ProjectSearchCharts.jsx';
import { ProjectSearchConfigEditor } from './ProjectSearchConfigEditor.jsx';

const PAGE_SIZE = 50;
const SAVE_DEBOUNCE_MS = 600;
const MAX_CELL_LENGTH = 160;
// Une colonne de texte libre (description…) trop étroite étire chaque ligne sur vingt lignes.
const COLUMN_MIN_WIDTH = { text: '16rem', enum: '12rem' };
// Au-delà, une liste de valeurs (porteurs, équipes…) se filtre avant de se cocher.
const FILTER_SEARCH_THRESHOLD = 8;
const TEXT_CLAMP_STYLE = { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

const STATUS_CHIP = {
  draft: 'border-gray-200 bg-gray-50 text-gray-700',
  submitted: 'border-blue-200 bg-blue-50 text-blue-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700'
};
const VERDICT_CHIP = {
  validated: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  outdated: 'border-amber-200 bg-amber-50 text-amber-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  preliminary: 'border-blue-200 bg-blue-50 text-blue-700',
  none: 'border-gray-200 bg-gray-50 text-gray-600'
};

const INPUT_CLASS = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm';

// Vitrine complète, en lecture seule, dans un nouvel onglet : c'est un lien de partage (`?sv=`),
// qui ouvre la vitrine sans menu, sans édition ni commentaires, comme pour un destinataire.
export const buildReadOnlyShowcaseUrl = (projectId, href) => {
  const token = encodeShowcaseShareToken({ projectId, displayMode: 'full', commentsEnabled: false, annotationVisibility: 'all' });
  if (!token || typeof href !== 'string' || !href) {
    return '';
  }
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(SHOWCASE_SHARE_PARAM, token);
  return withWebViewEnv(url.toString());
};

const truncate = (text) => (text.length > MAX_CELL_LENGTH ? `${text.slice(0, MAX_CELL_LENGTH - 1)}…` : text);

const ColumnFilter = ({ column, kind, rows, filter, onChange, label }) => {
  const { t, language } = useTranslation();
  const id = `project-search-filter-${column.id}`;
  const safeFilter = filter || {};
  const [optionQuery, setOptionQuery] = useState('');

  if (kind === 'enum') {
    const options = listColumnFilterValues(rows, column.id);
    const selected = Array.isArray(safeFilter.values) ? safeFilter.values : [];
    const needle = foldSearchText(optionQuery).trim();
    const visibleOptions = needle
      ? options.filter((option) => selected.includes(option.value) || foldSearchText(option.value === EMPTY_FILTER_VALUE ? t('projectSearch.emptyValue') : option.value).includes(needle))
      : options;
    const toggle = (value) => {
      const next = selected.includes(value) ? selected.filter((entry) => entry !== value) : [...selected, value];
      onChange({ values: next });
    };
    return (
      <fieldset className="space-y-1" data-testid={`project-search-filter-${column.id}`}>
        <legend className="text-sm font-medium text-gray-700">{label}</legend>
        {options.length > FILTER_SEARCH_THRESHOLD && (
          <input
            type="search"
            value={optionQuery}
            onChange={(event) => setOptionQuery(event.target.value)}
            placeholder={t('projectSearch.filters.searchValues', { count: options.length })}
            aria-label={t('projectSearch.filters.searchValuesAria', { name: label })}
            className={INPUT_CLASS}
          />
        )}
        {options.length === 0 ? (
          <p className="text-xs text-gray-500">{t('projectSearch.filters.noValue')}</p>
        ) : visibleOptions.length === 0 ? (
          <p className="text-xs text-gray-500">{t('projectSearch.filters.noMatchingValue')}</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto pr-1">
            {visibleOptions.map((option) => {
              const optionId = `${id}-${option.value}`;
              return (
                <li key={option.value}>
                  <label htmlFor={optionId} className="flex items-center gap-2 text-sm text-gray-700">
                    <input id={optionId} type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                    <span className="min-w-0 flex-1 truncate">{option.value === EMPTY_FILTER_VALUE ? t('projectSearch.emptyValue') : option.value}</span>
                    <span className="text-xs text-gray-500">{formatProjectSearchNumber(option.count, language)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>
    );
  }

  if (kind === 'date' || kind === 'number') {
    const [fromKey, toKey] = kind === 'date' ? ['from', 'to'] : ['min', 'max'];
    const type = kind === 'date' ? 'date' : 'number';
    return (
      <fieldset className="space-y-1" data-testid={`project-search-filter-${column.id}`}>
        <legend className="text-sm font-medium text-gray-700">{label}</legend>
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor={`${id}-from`} className="space-y-1">
            <span className="block text-xs text-gray-600">{t(kind === 'date' ? 'projectSearch.filters.from' : 'projectSearch.filters.min')}</span>
            <input id={`${id}-from`} type={type} step="any" value={safeFilter[fromKey] || ''} onChange={(event) => onChange({ ...safeFilter, [fromKey]: event.target.value })} className={INPUT_CLASS} />
          </label>
          <label htmlFor={`${id}-to`} className="space-y-1">
            <span className="block text-xs text-gray-600">{t(kind === 'date' ? 'projectSearch.filters.to' : 'projectSearch.filters.max')}</span>
            <input id={`${id}-to`} type={type} step="any" value={safeFilter[toKey] || ''} onChange={(event) => onChange({ ...safeFilter, [toKey]: event.target.value })} className={INPUT_CLASS} />
          </label>
        </div>
      </fieldset>
    );
  }

  return (
    <label htmlFor={id} className="block space-y-1" data-testid={`project-search-filter-${column.id}`}>
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      <input id={id} type="text" value={safeFilter.contains || ''} onChange={(event) => onChange({ contains: event.target.value })} placeholder={t('projectSearch.filters.containsPlaceholder')} className={INPUT_CLASS} />
    </label>
  );
};

export const BackOfficeProjectSearch = ({
  projects = [],
  questions = [],
  teams = [],
  validationCommitteeConfig,
  currencies = [],
  currentUserEmail = '',
  canEditDefaults = false,
  projectSearchDefaults = null,
  setProjectSearchDefaults,
  configQueueRef,
  publishControl = null
}) => {
  const { t, language } = useTranslation();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ columnId: '', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [personal, setPersonal] = useState({ status: 'loading', config: null, storage: 'local', reason: '' });
  const [adminNotice, setAdminNotice] = useState('');
  const configButtonRef = useRef(null);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setPersonal((previous) => ({ ...previous, status: 'loading' }));
    projectSearchConfigStore.load(currentUserEmail).then((result) => {
      if (!cancelled) {
        setPersonal({ status: 'ready', config: result.config, storage: result.storage, reason: result.reason || '' });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentUserEmail]);

  useEffect(() => () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
  }, []);

  const defaultLabels = useMemo(() => ({
    description: t('projectSearch.columns.description'),
    launchDate: t('projectSearch.columns.launchDate'),
    amount: t('projectSearch.columns.amount')
  }), [t]);

  const config = useMemo(() => resolveProjectSearchConfig({
    personal: personal.config,
    adminDefault: projectSearchDefaults,
    questions,
    labels: defaultLabels
  }), [defaultLabels, personal.config, projectSearchDefaults, questions]);

  const persistPersonal = useCallback((nextConfig) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      const payload = { email: currentUserEmail, config: nextConfig };
      if (configQueueRef?.current) {
        configQueueRef.current.enqueue(payload);
      } else {
        projectSearchConfigStore.save(payload.email, payload.config).catch(() => {});
      }
    }, SAVE_DEBOUNCE_MS);
  }, [configQueueRef, currentUserEmail]);

  const handleConfigChange = useCallback((next) => {
    const normalized = normalizeProjectSearchConfig(next);
    if (!normalized) {
      return;
    }
    setPersonal((previous) => ({ ...previous, config: normalized }));
    persistPersonal(normalized);
  }, [persistPersonal]);

  const handleResetConfig = useCallback(() => {
    setPersonal((previous) => ({ ...previous, config: null }));
    persistPersonal(null);
  }, [persistPersonal]);

  const questionById = useMemo(() => new Map((Array.isArray(questions) ? questions : []).map((question) => [String(question.id), question])), [questions]);

  const getDefaultColumnLabel = useCallback((column) => {
    if (!column) {
      return '';
    }
    if (column.kind === 'builtin') {
      return t(`projectSearch.columns.${column.builtinId}`);
    }
    const firstQuestion = column.sources.map((source) => questionById.get(source.questionId)).find(Boolean);
    const questionLabel = firstQuestion ? resolveLocalizedText(firstQuestion.question, language).replace(/<[^>]*>/g, '').trim() : '';
    return questionLabel || t('projectSearch.config.untitledColumn');
  }, [language, questionById, t]);

  const getColumnLabel = useCallback((column) => (column?.label || getDefaultColumnLabel(column)), [getDefaultColumnLabel]);

  const verdictOf = useCallback((project) => computeProjectValidationStatus(project, {
    teams,
    validationCommitteeConfig
  }), [teams, validationCommitteeConfig]);

  const context = useMemo(() => buildProjectSearchContext({
    questions,
    teams,
    language,
    t,
    currencyTable: currencies,
    verdictOf
  }), [currencies, language, questions, t, teams, verdictOf]);

  const rows = useMemo(() => buildProjectSearchRows(projects, config.columns, context), [config.columns, context, projects]);
  const filteredRows = useMemo(
    () => filterProjectSearchRows(rows, { query, filters, columns: config.columns, questions }),
    [config.columns, filters, query, questions, rows]
  );
  const sortedRows = useMemo(() => sortProjectSearchRows(filteredRows, sort), [filteredRows, sort]);
  const selectedVisibleRows = useMemo(() => sortedRows.filter((row) => selectedIds.has(row.id)), [selectedIds, sortedRows]);
  const scopeRows = selectedVisibleRows.length > 0 ? selectedVisibleRows : sortedRows;
  const totals = useMemo(() => computeProjectSearchTotals(scopeRows, config.kpiColumnId), [config.kpiColumnId, scopeRows]);
  const kpiColumn = config.columns.find((column) => column.id === config.kpiColumnId) || null;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, filters, sort]);

  const filterColumns = useMemo(() => {
    const displayed = config.columns;
    const teamsShown = displayed.some((column) => column.kind === 'builtin' && column.builtinId === 'teams');
    return teamsShown ? displayed : [...displayed, { id: 'builtin-teams', kind: 'builtin', builtinId: 'teams', label: '' }];
  }, [config.columns]);
  const activeFilterCount = countActiveFilters(filters);
  const activeFilterChips = useMemo(() => listActiveFilterIds(filters)
    .map((columnId) => {
      const column = filterColumns.find((entry) => entry.id === columnId);
      if (!column) {
        return null;
      }
      const filter = filters[columnId];
      let value = '';
      if (Array.isArray(filter.values) && filter.values.length > 0) {
        value = filter.values.map((entry) => (entry === EMPTY_FILTER_VALUE ? t('projectSearch.emptyValue') : entry)).join(', ');
      } else if (filter.contains) {
        value = `« ${filter.contains} »`;
      } else {
        const low = filter.from ? formatProjectSearchDate(filter.from, language) : filter.min;
        const high = filter.to ? formatProjectSearchDate(filter.to, language) : filter.max;
        value = low && high ? `${low} – ${high}` : low ? `≥ ${low}` : `≤ ${high}`;
      }
      return { columnId, label: getColumnLabel(column), value };
    })
    .filter(Boolean), [filterColumns, filters, getColumnLabel, language, t]);
  const removeFilter = (columnId) => setFilters((previous) => {
    const next = { ...previous };
    delete next[columnId];
    return next;
  });

  const allVisibleSelected = sortedRows.length > 0 && sortedRows.every((row) => selectedIds.has(row.id));
  const someVisibleSelected = sortedRows.some((row) => selectedIds.has(row.id));
  const headerCheckboxRef = useRef(null);
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  const toggleAllVisible = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) {
        sortedRows.forEach((row) => next.delete(row.id));
      } else {
        sortedRows.forEach((row) => next.add(row.id));
      }
      return next;
    });
  };
  const toggleRow = (rowId) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const toggleSort = (columnId) => {
    setSort((previous) => (previous.columnId === columnId
      ? (previous.direction === 'asc' ? { columnId, direction: 'desc' } : { columnId: '', direction: 'asc' })
      : { columnId, direction: 'asc' }));
  };

  const handleOpenShowcase = (projectId) => {
    if (typeof window === 'undefined' || !window.location) {
      return;
    }
    const url = buildReadOnlyShowcaseUrl(projectId, window.location.href);
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  };

  const handleExport = () => {
    if (selectedVisibleRows.length === 0) {
      return;
    }
    const exportRows = buildProjectSearchExportRows(selectedVisibleRows, config.columns, getColumnLabel, questions);
    const bytes = buildXlsxWorkbook(exportRows, { sheetName: t('projectSearch.export.sheetName') });
    const blob = new Blob([bytes], { type: XLSX_MIME_TYPE });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${t('projectSearch.export.fileName')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handlePublishAsDefault = () => {
    if (typeof setProjectSearchDefaults !== 'function') {
      return;
    }
    setProjectSearchDefaults(config);
    setAdminNotice(isSharePointMode() ? t('projectSearch.config.adminPublishedSharePoint') : t('projectSearch.config.adminPublishedLocal'));
  };

  const handleClearDefault = async () => {
    if (typeof setProjectSearchDefaults !== 'function') {
      return;
    }
    const confirmed = await requestConfirmation({
      title: t('projectSearch.config.adminClearConfirmTitle'),
      message: t('projectSearch.config.adminClearConfirmMessage'),
      confirmLabel: t('projectSearch.config.adminClear'),
      cancelLabel: t('projectSearch.cancel'),
      tone: 'warning'
    });
    if (confirmed) {
      setProjectSearchDefaults(null);
      setAdminNotice(t('projectSearch.config.adminCleared'));
    }
  };

  const renderCell = (column, row) => {
    const cell = row.cells[column.id];
    if (!cell) {
      return null;
    }
    if (column.kind === 'builtin' && column.builtinId === 'status' && cell.code) {
      return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_CHIP[cell.code] || STATUS_CHIP.draft}`}>{cell.display}</span>;
    }
    if (column.kind === 'builtin' && column.builtinId === 'verdict' && cell.code) {
      return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${VERDICT_CHIP[cell.code] || VERDICT_CHIP.none}`}>{cell.display}</span>;
    }
    if (cell.unconverted) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-700" title={t('projectSearch.table.unconverted', { unit: column.unit })}>
          <AlertTriangle className="h-4 w-4" />
          <span className="sr-only">{t('projectSearch.table.unconverted', { unit: column.unit })}</span>
        </span>
      );
    }
    if (!cell.display) {
      return <span className="text-gray-400">—</span>;
    }
    if (cell.mixedUnits) {
      return (
        <span className="inline-flex items-center gap-1" title={t('projectSearch.table.mixedUnits')}>
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{cell.display}</span>
          <span className="sr-only">{t('projectSearch.table.mixedUnits')}</span>
        </span>
      );
    }
    const text = truncate(cell.display);
    const isName = column.kind === 'builtin' && column.builtinId === 'projectName';
    const isLongText = column.kind === 'custom' && columnKinds.get(column.id) === 'text';
    return (
      <span className={isName ? 'font-semibold text-gray-900' : ''} style={isLongText ? TEXT_CLAMP_STYLE : undefined} title={cell.title || (isLongText || text !== cell.display ? cell.display : undefined)}>
        {text}
      </span>
    );
  };

  const columnKinds = new Map(config.columns.map((column) => [column.id, getColumnKind(column, questions)]));
  const nameColumn = config.columns.find((column) => column.kind === 'builtin' && column.builtinId === 'projectName');
  const rowName = (row) => row.cells[nameColumn?.id || 'builtin-projectName']?.display || row.id;
  const scopeLabel = selectedVisibleRows.length > 0
    ? t('projectSearch.scope.selection', { count: selectedVisibleRows.length })
    : t('projectSearch.scope.allResults', { count: sortedRows.length });
  const storageNotice = personal.storage === 'profile'
    ? t('projectSearch.config.storageProfile')
    : personal.reason === 'missingColumn'
      ? t('projectSearch.config.storageMissingColumn')
      : isSharePointMode()
        ? t('projectSearch.config.storageLocalSharePoint')
        : t('projectSearch.config.storageLocal');

  return (
    <div className="space-y-6" data-testid="project-search">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">{t('projectSearch.title')}</h2>
        <p className="text-sm text-gray-600">{t('projectSearch.subtitle')}</p>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label htmlFor="project-search-query" className="min-w-0 flex-1 space-y-1">
          <span className="block text-sm font-medium text-gray-700">{t('projectSearch.queryLabel')}</span>
          <span className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              id="project-search-query"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('projectSearch.queryPlaceholder')}
              className="w-full border-0 bg-transparent py-2 text-sm focus:outline-none"
            />
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass(activeFilterCount ? 'subtle' : 'secondary', 'md')}
            aria-expanded={isFiltersOpen}
            aria-controls="project-search-filters"
            onClick={() => setIsFiltersOpen((open) => !open)}
          >
            {activeFilterCount ? t('projectSearch.filters.toggleActive', { count: activeFilterCount }) : t('projectSearch.filters.toggle')}
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            ref={configButtonRef}
            type="button"
            className={buttonClass('secondary', 'md')}
            aria-haspopup="dialog"
            onClick={() => setIsConfigOpen(true)}
          >
            <Settings className="h-4 w-4" />
            {t('projectSearch.config.toggle')}
          </button>
          <button
            type="button"
            className={buttonClass('primary', 'md')}
            disabled={selectedVisibleRows.length === 0}
            onClick={handleExport}
            title={selectedVisibleRows.length === 0 ? t('projectSearch.export.disabledHint') : undefined}
            data-testid="project-search-export"
          >
            <Download className="h-4 w-4" />
            {t('projectSearch.export.button', { count: selectedVisibleRows.length })}
          </button>
        </div>
      </div>

      {isFiltersOpen && (
        <section id="project-search-filters" className="space-y-4 rounded-xl border border-gray-200 bg-white p-4" aria-label={t('projectSearch.filters.title')}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filterColumns.map((column) => (
              <ColumnFilter
                key={column.id}
                column={column}
                kind={column.kind === 'builtin' ? BUILTIN_COLUMNS[column.builtinId].kind : getColumnKind(column, questions)}
                rows={rows}
                filter={filters[column.id]}
                label={getColumnLabel(column)}
                onChange={(next) => setFilters((previous) => ({ ...previous, [column.id]: next }))}
              />
            ))}
          </div>
        </section>
      )}

      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" data-testid="project-search-active-filters">
          <span className="text-sm text-gray-600">{t('projectSearch.filters.activeLabel')}</span>
          {activeFilterChips.map((chip) => (
            <span key={chip.columnId} className="inline-flex max-w-full items-center gap-1 rounded-full border border-blue-200 bg-blue-50 py-0.5 pl-3 pr-1 text-sm text-blue-900">
              <span className="min-w-0 truncate" title={`${chip.label} : ${chip.value}`}>
                <span className="font-medium">{chip.label}</span> : {chip.value}
              </span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-blue-100"
                onClick={() => removeFilter(chip.columnId)}
                aria-label={t('projectSearch.filters.removeFilter', { name: chip.label })}
              >
                <Close className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <button type="button" className={buttonClass('ghost', 'sm')} onClick={() => setFilters({})}>
            {t('projectSearch.filters.clear')}
          </button>
        </div>
      )}

      <ProjectSearchConfigEditor
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        questions={questions}
        currencies={currencies}
        getColumnLabel={getColumnLabel}
        getDefaultColumnLabel={getDefaultColumnLabel}
        onChange={handleConfigChange}
        onReset={handleResetConfig}
        hasPersonalConfig={Boolean(personal.config)}
        storageNotice={storageNotice}
        canEditDefaults={canEditDefaults}
        hasAdminDefault={Boolean(projectSearchDefaults)}
        adminNotice={adminNotice}
        onPublishAsDefault={handlePublishAsDefault}
        onClearDefault={handleClearDefault}
        publishControl={publishControl}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label={t('projectSearch.kpi.title')} data-testid="project-search-kpis">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">{t('projectSearch.kpi.count')}</p>
          <p className="text-3xl font-bold text-gray-900" data-testid="project-search-kpi-count">{formatProjectSearchNumber(totals.count, language)}</p>
          <p className="text-xs text-gray-500">{scopeLabel}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {kpiColumn ? (
            <>
              <p className="text-sm text-gray-600">{t('projectSearch.kpi.sum', { name: getColumnLabel(kpiColumn) })}</p>
              <p className="text-3xl font-bold text-gray-900" data-testid="project-search-kpi-sum">
                {totals.sum === null ? '—' : `${formatProjectSearchNumber(totals.sum, language)}${totals.unit ? `\u00a0${totals.unit}` : ''}`}
              </p>
              {totals.mixedUnits.length > 0 ? (
                <p role="alert" className="mt-1 flex items-start gap-2 text-xs text-amber-800" data-testid="project-search-kpi-mixed-units">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {t('projectSearch.kpi.mixedUnits', { units: totals.mixedUnits.map((entry) => entry || t('projectSearch.noUnit')).join(', ') })}
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  {t('projectSearch.kpi.filled', { count: totals.filledCount, total: totals.count })}
                  {totals.unconvertedCount > 0 && ` · ${t('projectSearch.kpi.unconverted', { count: totals.unconvertedCount })}`}
                  {totals.mixedCount > 0 && ` · ${t('projectSearch.kpi.mixedCells', { count: totals.mixedCount })}`}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">{t('projectSearch.kpi.noSumColumn')}</p>
          )}
        </div>
      </section>

      <ProjectSearchCharts
        rows={scopeRows}
        config={config}
        questions={questions}
        getColumnLabel={getColumnLabel}
        scopeLabel={scopeLabel}
        onChangeCharts={(charts) => handleConfigChange({ ...config, charts })}
      />

      <section className="space-y-3" aria-labelledby="project-search-table-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="project-search-table-title" className="text-lg font-semibold text-gray-800">
            {t('projectSearch.table.title', { count: sortedRows.length })}
          </h3>
          {selectedIds.size > 0 && (
            <button type="button" className={buttonClass('ghost', 'sm')} onClick={() => setSelectedIds(new Set())}>
              {t('projectSearch.table.clearSelection', { count: selectedVisibleRows.length })}
            </button>
          )}
        </div>
        {sortedRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500" data-testid="project-search-empty">
            {rows.length === 0 ? t('projectSearch.table.noProjects') : t('projectSearch.table.noResults')}
          </p>
        ) : (
          <div className="max-h-[75vh] overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm" data-testid="project-search-table-scroll">
            <table className="min-w-full divide-y divide-gray-200 text-sm" data-testid="project-search-table">
              <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                <tr>
                  <th scope="col" className="w-10 px-3 py-2 text-left">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label={t('projectSearch.table.selectAll', { count: sortedRows.length })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                  </th>
                  {config.columns.map((column) => {
                    const isSorted = sort.columnId === column.id;
                    return (
                      <th
                        key={column.id}
                        scope="col"
                        aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        className="px-3 py-2 text-left font-semibold text-gray-700"
                      >
                        <button type="button" onClick={() => toggleSort(column.id)} className="inline-flex items-center gap-1 whitespace-nowrap hover:text-blue-700">
                          {getColumnLabel(column)}
                          <span aria-hidden="true" className="text-xs text-gray-400">{isSorted ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      </th>
                    );
                  })}
                  <th scope="col" className="sticky right-0 z-20 border-l border-gray-100 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700">
                    <span className="sr-only">{t('projectSearch.table.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRows.slice(0, visibleCount).map((row) => {
                  const isSelected = selectedIds.has(row.id);
                  const isCancelled = row.project.status === 'cancelled';
                  return (
                    <tr key={row.id} className={isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'} data-testid="project-search-row" data-project-id={row.id}>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          aria-label={t('projectSearch.table.selectRow', { name: rowName(row) })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                      </td>
                      {config.columns.map((column) => {
                        const kind = columnKinds.get(column.id);
                        return (
                          <td
                            key={column.id}
                            className={`px-3 py-2 align-top text-gray-700 ${kind === 'number' || kind === 'date' ? 'whitespace-nowrap' : ''} ${kind === 'number' ? 'text-right' : ''}`}
                            style={COLUMN_MIN_WIDTH[kind] && column.kind === 'custom' ? { minWidth: COLUMN_MIN_WIDTH[kind] } : undefined}
                          >
                            {renderCell(column, row)}
                          </td>
                        );
                      })}
                      <td className={`sticky right-0 z-10 whitespace-nowrap border-l border-gray-100 px-3 py-2 align-top ${isSelected ? 'bg-blue-50' : 'bg-white'}`}>
                        <button
                          type="button"
                          className={buttonClass('secondary', 'sm', 'whitespace-nowrap')}
                          disabled={isCancelled}
                          title={isCancelled ? t('projectSearch.table.showcaseCancelled') : undefined}
                          onClick={() => handleOpenShowcase(row.id)}
                          aria-label={t('projectSearch.table.openShowcase', { name: rowName(row) })}
                        >
                          <Eye className="h-4 w-4" />
                          {t('projectSearch.table.showcase')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {sortedRows.length > visibleCount && (
          <button type="button" className={buttonClass('secondary', 'sm')} onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            {t('projectSearch.table.showMore', { shown: visibleCount, total: sortedRows.length })}
          </button>
        )}
      </section>
    </div>
  );
};

export default BackOfficeProjectSearch;
